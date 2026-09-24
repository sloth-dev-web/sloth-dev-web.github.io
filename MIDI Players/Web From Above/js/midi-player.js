import { settings } from './settings.js';
import { midiToKey, keyToMidi, channelColors, trackColorIdx } from './piano-constants.js';
import { parseMIDI } from '../parser/midi-parser.js';
import { playSoundFontNote, stopSoundFontNote, stopAllVoices, stopKey, sf2Voices, audioContext, freezeAudio, unfreezeAudio, isAudioFrozen } from './audio-engine.js';
import { spawnLiveNote, addLiveNote, liveNotesPool, keyHoldCounts, retireFutureSongNotes } from './note-simulation.js';
import { releaseKey } from './keyboard.js';
import { WinW, WinH } from './webgl.js';
import { getNotesCY } from './Renderer.js';
import { midiOutNoteOn, midiOutNoteOff, midiOutControl, midiOutAllNotesOff, midiOutIsActive } from './midi-out.js';

function mul64to128(a, b) {
    if (typeof BigInt === 'function') {
        const A = BigInt(a >>> 0), B = BigInt(b >>> 0);
        const prod = A * B;
        const hi = Number((prod >> 64n) & 0xFFFFFFFFFFFFFFFFn);
        const lo = Number(prod & 0xFFFFFFFFFFFFFFFFn);
        return { lo: lo >>> 0, hi: hi >>> 0 };
    }
    const lo_lo = (a & 0xFFFFFFFF) * (b & 0xFFFFFFFF);
    const hi_lo = (a >>> 32) * (b & 0xFFFFFFFF);
    const lo_hi = (a & 0xFFFFFFFF) * (b >>> 32);
    const hi_hi = (a >>> 32) * (b >>> 32);
    const cross = (lo_lo >>> 32) + (hi_lo & 0xFFFFFFFF) + lo_hi;
    const hi = hi_hi + (cross >>> 32) + (hi_lo >>> 32) + (lo_hi >>> 32);
    const lo = ((cross & 0xFFFFFFFF) << 32) | (lo_lo & 0xFFFFFFFF);
    return { lo: lo >>> 0, hi: hi >>> 0 };
}

function collectSingleMidiInfo(data) {
    const out = { ppq: 480, firstTempo: 500000, firstBPM: 120, trackCount: 0,
                  totalNoteOns: 0, totalNoteOffs: 0, peakPolyphony: 0, durationTicks: 0 };
    if (!data || data.length < 14) return out;
    try {
        let off = 0;
        if (data[off] !== 0x4D || data[off+1] !== 0x54 || data[off+2] !== 0x68 || data[off+3] !== 0x64) return out;
        off += 4 + 4 + 2;
        const ntrks = (data[off] << 8) | data[off+1]; off += 2;
        out.ppq = (data[off] << 8) | data[off+1]; off += 2;
        out.trackCount = ntrks;
        let currentPoly = 0, maxPoly = 0;
        const noteStack = new Map();
        for (let t = 0; t < ntrks && off < data.length; t++) {
            if (off + 8 > data.length || data[off] !== 0x4D || data[off+1] !== 0x54 || data[off+2] !== 0x72 || data[off+3] !== 0x6B) { off++; continue; }
            off += 4;
            const trkLen = (data[off] << 24) | (data[off+1] << 16) | (data[off+2] << 8) | data[off+3]; off += 4;
            const trackEnd = Math.min(data.length, off + trkLen);
            let tick = 0, running = 0;
            while (off < trackEnd) {
                let delta = 0, b, cnt = 0;
                do { if (off >= data.length) break; b = data[off++]; delta = (delta << 7) | (b & 0x7F); cnt++; } while ((b & 0x80) && cnt < 4);
                tick += delta;
                if (off >= trackEnd) break;
                let status = data[off++];
                if (status < 0x80) { off--; status = running; } else if (status < 0xF0) running = status;
                if (status >= 0x80 && status < 0xF0) {
                    const cmd = status & 0xF0;
                    let p1 = 0, p2 = 0;
                    if (cmd === 0xC0 || cmd === 0xD0) { if (off < trackEnd) p1 = data[off++]; }
                    else { if (off < trackEnd) p1 = data[off++]; if (off < trackEnd) p2 = data[off++]; }
                    if (cmd === 0x90) {
                        if (p2 > 0) {
                            out.totalNoteOns++; currentPoly++;
                            if (currentPoly > maxPoly) maxPoly = currentPoly;
                            const key = p1; noteStack.set(key, (noteStack.get(key) || 0) + 1);
                        } else {
                            out.totalNoteOffs++; currentPoly = Math.max(0, currentPoly - 1);
                            const key = p1; const c = noteStack.get(key) || 0;
                            if (c <= 1) noteStack.delete(key); else noteStack.set(key, c - 1);
                        }
                    } else if (cmd === 0x80) {
                        out.totalNoteOffs++; currentPoly = Math.max(0, currentPoly - 1);
                        const key = p1; const c = noteStack.get(key) || 0;
                        if (c <= 1) noteStack.delete(key); else noteStack.set(key, c - 1);
                    }
                } else if (status === 0xFF) {
                    const metaType = data[off++];
                    let len = 0, c2 = 0;
                    do { if (off >= data.length) break; b = data[off++]; len = (len << 7) | (b & 0x7F); c2++; } while ((b & 0x80) && c2 < 4);
                    const ds = off; off += len;
                    if (metaType === 0x51 && len >= 3) {
                        if (out.firstTempo === 500000) { out.firstTempo = (data[ds] << 16) | (data[ds+1] << 8) | data[ds+2]; out.firstBPM = 60000000 / out.firstTempo; }
                    }
                } else if (status === 0xF0 || status === 0xF7) {
                    let len = 0, c = 0;
                    do { if (off >= data.length) break; b = data[off++]; len = (len << 7) | (b & 0x7F); c++; } while ((b & 0x80) && c < 4);
                    off += len;
                }
            }
            out.durationTicks = Math.max(out.durationTicks, tick);
            off = trackEnd;
        }
        out.peakPolyphony = maxPoly;
    } catch (e) {}
    return out;
}

class MIDIPlayer {
    constructor() {
        this.isPlaying      = false;
        this.isPaused       = false;
        this.currentFile    = null;
        this.isLoaded       = false;
        this.currentTime    = 0;
        this.duration       = 0;
        this.activeNotes    = new Map(); // midiK -> { v, c } for resume re-fire
        this.sustainOn      = new Array(16).fill(false);
        // Per-channel: notes held only by that channel's sustain pedal.
        this.pedalHeldNotes = Array.from({ length: 16 }, () => new Set());
        this.isParsedWithWasm = false;
        this.allEvents      = null;
        this.division       = 480;
        this.currentTempo   = 500000;
        this.eventIndex     = 0;
        this.visualIndex    = 0;
        this.currentTimer   = null;
        this.currentRafId   = null;
        this.startTimestamp = 0;
        this.currentTime = 0;
        this.eventIndex = 0;
        this.visualIndex = 0;
        this.midiOutIndex = 0;
        this.audioBaseTime = 0;
        this._sfVoicesLive = false;
        this._frozenPause = false;
        this._midiResumeNotes = null;
        this.activeNotes.clear();
        this.sustainOn.fill(false);
        this._clearAllPedalHeld();
        if (typeof stopAllVoices === 'function') stopAllVoices(true);
    }

    _clearAllPedalHeld() {
        for (let c = 0; c < 16; c++) this.pedalHeldNotes[c].clear();
    }

    // A re-struck note is key-held again on every channel that shares the key.
    _removePedalHeldEverywhere(midiK) {
        for (let c = 0; c < 16; c++) this.pedalHeldNotes[c].delete(midiK);
    }

    // First event index with time > timeMs (absMs is non-decreasing).
    _indexAfterTime(timeMs) {
        if (!this.allEvents) return 0;
        let lo = 0, hi = this.allEvents.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            const ev = this.allEvents[mid];
            const ems = ev.absMs != null ? ev.absMs : this.getTimeForTick(ev.time);
            if (ems > timeMs) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    // Rebuild sounding-note + sustain state as of timeMs (used after rewind).
    _rebuildStateAt(timeMs) {
        this.activeNotes.clear();
        this.sustainOn.fill(false);
        this._clearAllPedalHeld();
        if (!this.allEvents) return;
        for (let i = 0; i < this.allEvents.length; i++) {
            const ev = this.allEvents[i];
            const ems = ev.absMs != null ? ev.absMs : this.getTimeForTick(ev.time);
            if (ems > timeMs) break;
            if (ev.visualOnly) continue;
            if (ev.type === 'noteOn' && ev.velocity > 0) {
                this.activeNotes.set(ev.note, { v: ev.velocity, c: ev.channel || 0 });
                this._removePedalHeldEverywhere(ev.note);
            } else if (ev.type === 'noteOff' || (ev.type === 'noteOn' && (ev.velocity || 0) === 0)) {
                const ch = ev.channel || 0;
                if (this.sustainOn[ch]) this.pedalHeldNotes[ch].add(ev.note);
                else {
                    this.activeNotes.delete(ev.note);
                    this._removePedalHeldEverywhere(ev.note);
                }
            } else if ((ev.type === 'control' || ev.type === 'controlChange') && ev.controller === 64) {
                const ch = ev.channel || 0;
                const on = (ev.value || 0) >= 64;
                const wasOn = this.sustainOn[ch];
                this.sustainOn[ch] = on;
                if (wasOn && !on) {
                    for (const m of this.pedalHeldNotes[ch]) this.activeNotes.delete(m);
                    this.pedalHeldNotes[ch].clear();
                }
            }
        }
    }

    // Snapshot held notes at timeMs without touching live activeNotes/sustain
    // state (freeze-pause keeps those aligned with the look-ahead eventIndex).
    _heldNotesAt(timeMs) {
        const held = new Map();
        if (!this.allEvents) return held;
        const sustainOn = new Array(16).fill(false);
        const pedalHeld = Array.from({ length: 16 }, () => new Set());
        const clearPedalEverywhere = (m) => {
            for (let c = 0; c < 16; c++) pedalHeld[c].delete(m);
        };
        for (let i = 0; i < this.allEvents.length; i++) {
            const ev = this.allEvents[i];
            const ems = ev.absMs != null ? ev.absMs : this.getTimeForTick(ev.time);
            if (ems > timeMs) break;
            if (ev.visualOnly) continue;
            if (ev.type === 'noteOn' && ev.velocity > 0) {
                held.set(ev.note, { v: ev.velocity, c: ev.channel || 0 });
                clearPedalEverywhere(ev.note);
            } else if (ev.type === 'noteOff' || (ev.type === 'noteOn' && (ev.velocity || 0) === 0)) {
                const ch = ev.channel || 0;
                if (sustainOn[ch]) pedalHeld[ch].add(ev.note);
                else {
                    held.delete(ev.note);
                    clearPedalEverywhere(ev.note);
                }
            } else if ((ev.type === 'control' || ev.type === 'controlChange') && ev.controller === 64) {
                const ch = ev.channel || 0;
                const on = (ev.value || 0) >= 64;
                const wasOn = sustainOn[ch];
                sustainOn[ch] = on;
                if (wasOn && !on) {
                    for (const m of pedalHeld[ch]) held.delete(m);
                    pedalHeld[ch].clear();
                }
            }
        }
        return held;
    }

    // Re-trigger held notes after resume when SF voices were killed (seek).
    // Pause uses freezeAudio instead, so live voices are left alone.
    _resumeActiveNotes() {
        if (!this.activeNotes || this.activeNotes.size === 0) return;
        const synthAudible = !settings.get('muteInternalSynth') || !midiOutIsActive();
        for (const [midiK, info] of this.activeNotes) {
            const vel = (info && info.v != null) ? info.v : 80;
            const ch = (info && info.c != null) ? info.c : 0;
            if (synthAudible && typeof playSoundFontNote === 'function') {
                const k = midiToKey(midiK);
                if (k >= 0 && k < 256) playSoundFontNote(k, vel, null, false);
            }
            if (midiOutIsActive()) midiOutNoteOn(ch, midiK, vel);
        }
    }

    // MIDI out got all-notes-off on pause; the device needs noteOns again.
    // SoundFont voices stay frozen with the context — do not re-fire them.
    // Uses the pause-time snapshot so look-ahead activeNotes stays untouched.
    _resumeMidiOutNotes() {
        if (!midiOutIsActive()) return;
        const held = this._midiResumeNotes || this.activeNotes;
        if (!held) return;
        for (const [midiK, info] of held) {
            const vel = (info && info.v != null) ? info.v : 80;
            const ch = (info && info.c != null) ? info.c : 0;
            midiOutNoteOn(ch, midiK, vel);
        }
        this._midiResumeNotes = null;
    }

    play() {
        if (!this.isLoaded || !this.allEvents || this.allEvents.length === 0) return;
        // Already running: a second play() must not reset to 0 / re-fire notes.
        if (this.isPlaying) return;
        this.clearTimer();
        const resuming = this.isPaused && this.currentTime > 0;
        if (!resuming) {
            this.currentTime = 0;
            this.eventIndex = 0;
            this.visualIndex = 0;
            this.midiOutIndex = 0;
            this.activeNotes.clear();
            this.sustainOn.fill(false);
            this._clearAllPedalHeld();
            this._midiResumeNotes = null;
            this._frozenPause = false;
            // Fresh start: drop any song notes left frozen from a prior stop.
            retireFutureSongNotes(-1);
        }
        this.startTimestamp = performance.now() - this.currentTime;
        this.isPlaying = true;
        this.isPaused = false;

        if (audioContext) {
            this.audioBaseTime = audioContext.currentTime - (this.currentTime / 1000);
        } else {
            this.audioBaseTime = 0;
        }
        if (typeof unfreezeAudio === 'function') unfreezeAudio();
        if (resuming && this._frozenPause) {
            // Freeze-resume: voices and eventIndex were left untouched.
            // Only MIDI out needs noteOns again (pause sent all-notes-off).
            // Never call _resumeActiveNotes — that re-attacks held notes.
            this._resumeMidiOutNotes();
            this._frozenPause = false;
        } else if (resuming) {
            // Seek/stop killed voices; rebuild sounding state once.
            this._resumeActiveNotes();
            this._sfVoicesLive = true;
        } else {
            this._sfVoicesLive = true;
        }
    }

    pause() {
        if (!this.isPlaying) return;
        this.currentTime = performance.now() - this.startTimestamp;
        this.isPlaying = false;
        this.isPaused = true;
        this.clearTimer();
        // Freeze the audio clock in place: held and look-ahead notes keep
        // their schedule and continue seamlessly on resume. Do NOT kill
        // voices, rewind eventIndex, or rebuild activeNotes/sustain — those
        // must stay aligned with the look-ahead eventIndex or scheduled
        // noteOffs lose their targets. MIDI out does not freeze with the
        // AudioContext, so snapshot held notes, all-notes-off, rewind that
        // cursor only. Do NOT rewind visualIndex or retire falling notes.
        if (typeof freezeAudio === 'function') {
            freezeAudio();
            this._sfVoicesLive = true;
            this._frozenPause = true;
            this._midiResumeNotes = this._heldNotesAt(this.currentTime);
        } else {
            if (typeof stopAllVoices === 'function') stopAllVoices(true);
            this._sfVoicesLive = false;
            this._frozenPause = false;
            this.eventIndex = this._indexAfterTime(this.currentTime);
            this._rebuildStateAt(this.currentTime);
            this._midiResumeNotes = null;
        }
        this.midiOutIndex = this._indexAfterTime(this.currentTime);
        midiOutAllNotesOff();
    }

    stop() {
        this.clearTimer();
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.eventIndex = 0;
        this.visualIndex = 0;
        this.midiOutIndex = 0;
        this.startTimestamp = 0;
        this.activeNotes.clear();
        this.sustainOn.fill(false);
        this._clearAllPedalHeld();
        this._midiResumeNotes = null;
        this._frozenPause = false;
        // Kill while still frozen so look-ahead sources can't blip on resume;
        // then unfreeze so free-play/UI audio work again after a full stop.
        if (typeof stopAllVoices === 'function') stopAllVoices(true);
        this._sfVoicesLive = false;
        if (typeof unfreezeAudio === 'function') unfreezeAudio();
        midiOutAllNotesOff();
        retireFutureSongNotes(-1);

        for (let i = 0; i < liveNotesPool.length; i++) {
            const n = liveNotesPool[i];
            if (n && n.active && n.keyPressed) {
                const kk = n.k;
                if (typeof releaseKey === 'function') releaseKey(kk);
                n.keyPressed = false;
                keyHoldCounts[kk] = Math.max(0, (keyHoldCounts[kk] || 0) - 1);
            }
        }
        keyHoldCounts.fill(0);
    }

    seek(fraction) {
        if (!this.allEvents || this.allEvents.length === 0) return;
        const target = Math.max(0, Math.min(1, fraction)) * (this.duration || 0);
        const wasPlaying = this.isPlaying;
        this.isPlaying = false;
        this.isPaused = true;
        this.currentTime = target;
        const idx = this._indexAfterTime(target);
        this.eventIndex = idx;
        this.visualIndex = idx;
        this.midiOutIndex = idx;
        this._rebuildStateAt(target);
        this._midiResumeNotes = null;
        this._frozenPause = false;
        // Kill while still frozen (seek-while-paused must not blip look-ahead);
        // stay frozen when not resuming — play() unfreezes on resume.
        if (typeof stopAllVoices === 'function') stopAllVoices(true);
        this._sfVoicesLive = false;
        midiOutAllNotesOff();
        retireFutureSongNotes(target);
        if (wasPlaying) this.play();
    }

    getProgress() {
        return this.duration > 0 ? Math.max(0, Math.min(1, this.currentTime / this.duration)) : 0;
    }

    update(now = performance.now()) {
        if (!this.isPlaying || !this.allEvents || this.allEvents.length === 0) return;
        const songTime = now - this.startTimestamp;
        this.currentTime = songTime;
        let leadMs = 2000;
        try {
            if (typeof WinH !== 'undefined' && typeof WinW !== 'undefined' && typeof settings !== 'undefined') {
                const kbTop = getNotesCY();
                const pxPerMs = settings.get('noteSpeed') / 8;
                if (pxPerMs > 0.1) leadMs = Math.max(300, (kbTop + 20) / pxPerMs);
            }
        } catch (e) {}
        // Skipping the built-in synth's per-note voice storm (zone search +
        // sort + node alloc per note) while a MIDI output is selected. The
        // external device carries the sound instead.
        const synthAudible = !settings.get('muteInternalSynth') || !midiOutIsActive();
        // Visual lead can be large (notes must spawn at the top). Audio and
        // MIDI-out only need a short window — a long one means up to leadMs
        // of sound still fires after pause even with stopAllVoices.
        const audioLeadMs = Math.min(leadMs, 50);
        // MIDI-out pass first, on its own cursor: sending is microseconds per
        // event, so device scheduling stays on the wall clock even when the
        // visual/audio work below falls behind in dense sections.
        const frameNow = performance.now();
        while (this.midiOutIndex < this.allEvents.length) {
            const ev = this.allEvents[this.midiOutIndex];
            const evMs = ev.absMs != null ? ev.absMs : this.getTimeForTick(ev.time);
            if (evMs > songTime + audioLeadMs) break;
            if (!ev.visualOnly) {
                // Device-clock timestamp so out plays on time despite the lead.
                const outAt = frameNow + Math.max(0, evMs - songTime);
                if (ev.type === 'noteOn') {
                    midiOutNoteOn(ev.channel || 0, ev.note, (ev.velocity != null ? ev.velocity : 80), outAt);
                } else if (ev.type === 'noteOff') {
                    midiOutNoteOff(ev.channel || 0, ev.note, outAt);
                } else if ((ev.type === 'control' || ev.type === 'controlChange') && ev.controller === 64) {
                    midiOutControl(ev.channel || 0, 64, ev.value || 0, outAt);
                }
            }
            this.midiOutIndex++;
        }
        // Visual spawn on its own cursor: pause leaves it ahead so falling
        // notes stay on screen; resume only spawns new ones entering the lead.
        while (this.visualIndex < this.allEvents.length) {
            const ev = this.allEvents[this.visualIndex];
            const evMs = ev.absMs != null ? ev.absMs : this.getTimeForTick(ev.time);
            if (evMs > songTime + leadMs) break;
            if (ev.type === 'noteOn' && (ev.velocity != null ? ev.velocity : 80) > 0) {
                const k = midiToKey(ev.note);
                if (k >= 0 && k < 256) {
                    trackColorIdx.value = (trackColorIdx.value + 1) % 16;
                    const noteDuration = ev.durationMs || 0;
                    const colorIdx = ((ev.track || 0) + (ev.channel || 0)) % channelColors.length;
                    spawnLiveNote(k, ev.velocity != null ? ev.velocity : 80, evMs, songTime, noteDuration, colorIdx, ev, this);
                }
            }
            this.visualIndex++;
        }
        // Audio on eventIndex: freeze-pause leaves this cursor in the
        // look-ahead (scheduled sources stay valid on the frozen clock);
        // seek/stop rewind it so resume re-schedules from the new point.
        // While frozen, do not advance eventIndex — playSoundFontNote is
        // blocked and incrementing would permanently drop those notes.
        if (typeof isAudioFrozen === 'function' && isAudioFrozen()) {
            // fall through to end of update; cursors stay put until unfreeze
        } else {
        while (this.eventIndex < this.allEvents.length) {
            const ev = this.allEvents[this.eventIndex];
            const evMs = ev.absMs != null ? ev.absMs : this.getTimeForTick(ev.time);
            if (evMs > songTime + audioLeadMs) break;
            if (ev.type === 'noteOn') {
                const midiK = ev.note;
                const vel = (ev.velocity != null ? ev.velocity : 80);
                const k = midiToKey(midiK);
                if (k >= 0 && k < 256) {
                    const isVisualLayer = !!(ev && ev.visualOnly);
                    if (!isVisualLayer) {
                        this.activeNotes.set(midiK, { v: vel, c: ev.channel || 0 });
                        // Re-struck: key is down again — not pedal-held anywhere.
                        this._removePedalHeldEverywhere(midiK);
                    }

                    if (synthAudible && typeof playSoundFontNote === 'function' && audioContext) {
                        const when = audioContext.currentTime + Math.max(0, (evMs - songTime) / 1000);
                        playSoundFontNote(k, vel, when, false);
                    }
                }
            } else if (ev.type === 'noteOff') {
                const midiK = ev.note;
                const ch = ev.channel || 0;
                const k = midiToKey(midiK);
                if (this.sustainOn[ch]) {
                    this.pedalHeldNotes[ch].add(midiK);
                } else if (this.activeNotes.has(midiK) && k >= 0) {
                    this.activeNotes.delete(midiK);
                    this._removePedalHeldEverywhere(midiK);
                    if (synthAudible && typeof stopSoundFontNote === 'function' && audioContext) {
                        const when = audioContext.currentTime + Math.max(0.001, (evMs - songTime) / 1000);
                        stopSoundFontNote(k, false, when);
                    } else if (typeof stopKey === 'function') {
                        stopKey(k);
                    }
                }
            } else if ((ev.type === 'control' || ev.type === 'controlChange') && ev.controller === 64) {
                const ch = ev.channel || 0;
                const on = (ev.value || 0) >= 64;
                const wasOn = this.sustainOn[ch];
                this.sustainOn[ch] = on;
                if (wasOn && !on) {
                    // Only this channel's pedal-held notes. Still-key-held
                    // re-strikes are not in the set and must keep sounding.
                    const when = (synthAudible && audioContext)
                        ? audioContext.currentTime + Math.max(0.001, (evMs - songTime) / 1000)
                        : null;
                    for (const m of Array.from(this.pedalHeldNotes[ch])) {
                        const kk = midiToKey(m);
                        if (kk >= 0) {
                            if (synthAudible && typeof stopSoundFontNote === 'function' && audioContext) {
                                const arr = sf2Voices.get(kk);
                                const n = arr ? arr.length : 0;
                                for (let vi = 0; vi < n; vi++) stopSoundFontNote(kk, false, when);
                            } else if (typeof stopKey === 'function') {
                                stopKey(kk);
                            }
                        }
                        this.activeNotes.delete(m);
                    }
                    this.pedalHeldNotes[ch].clear();
                }
            }
            this.eventIndex++;
        }
        } // end !isAudioFrozen
        if (this.eventIndex >= this.allEvents.length && songTime > (this.duration + 500)) this.stop();
    }

    getTimeForTick(targetTick) {
        if (!this.allEvents || this.allEvents.length === 0) return 0;
        const evs = this.allEvents;
        let lo = 0, hi = evs.length - 1, baseIdx = -1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (evs[mid].time <= targetTick) { baseIdx = mid; lo = mid + 1; }
            else { hi = mid - 1; }
        }
        if (baseIdx < 0) return 0;
        const baseEv = evs[baseIdx];
        const baseTick = baseEv.time;
        const baseMs = baseEv.absMs || 0;
        let uSpb = 500000;
        for (let j = baseIdx; j >= 0; j--) {
            if (evs[j].type === 'tempo' && evs[j].tempo > 0) { uSpb = evs[j].tempo; break; }
        }
        const delta = targetTick - baseTick;
        return baseMs + delta * (uSpb / this.division / 1000.0);
    }

    computeDurationFromEvents() {
        if (this.allEvents && this.allEvents.length > 0) {
            const last = this.allEvents[this.allEvents.length - 1];
            this.duration = (last && last.absMs != null) ? last.absMs : this.getTimeForTick(last ? last.time : 0);
        }
    }

    clearTimer() {
        if (this.currentTimer)  { clearTimeout(this.currentTimer);        this.currentTimer  = null; }
        if (this.currentRafId)  { cancelAnimationFrame(this.currentRafId); this.currentRafId  = null; }
    }

    getTimeString(time) {
        const minutes = Math.floor(time / 60000);
        const seconds = Math.floor((time % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

MIDIPlayer.prototype.computeAndStoreMidiInfo = function() {
    // Derived from the already-parsed events instead of re-scanning the raw
    // bytes a second time.
    const info = { ppq: this.division, firstTempo: 500000, firstBPM: 120, trackCount: 0,
                   totalNoteOns: 0, totalNoteOffs: 0, peakPolyphony: 0, durationTicks: 0 };
    if (this.tempoMap && this.tempoMap.length > 1) {
        info.firstTempo = this.tempoMap[1].microsecondsPerBeat;
        info.firstBPM = 60000000 / info.firstTempo;
    }
    const tracks = new Set();
    let poly = 0, maxPoly = 0;
    const evs = this.allEvents || [];
    for (const ev of evs) {
        if (ev.track != null) tracks.add(ev.track);
        if (ev.type === 'noteOn' && ev.velocity > 0) {
            info.totalNoteOns++;
            if (++poly > maxPoly) maxPoly = poly;
        } else if (ev.type === 'noteOff' || ev.type === 'noteOn') {
            info.totalNoteOffs++;
            if (poly > 0) poly--;
        }
    }
    info.trackCount = tracks.size;
    info.peakPolyphony = maxPoly;
    if (evs.length && evs[evs.length - 1].time != null) info.durationTicks = evs[evs.length - 1].time;
    this.midiInfo = info;
    return info;
};

MIDIPlayer.prototype.loadFile = async function(file) {
    if (!file) return false;
    try {
        this.currentFile = file;
        const arrayBuffer = await file.arrayBuffer();
        this.rawData = new Uint8Array(arrayBuffer);
        this.isLoaded = false;
        this.allEvents = [];
        this.duration = 0;
        this.eventIndex = 0;
        this.visualIndex = 0;
        this.midiOutIndex = 0;
        this.activeNotes.clear();
        this.sustainOn.fill(false);
        this._clearAllPedalHeld();

        const parsed = parseMIDI(arrayBuffer);
        this.division = parsed.timeDivision;
        this.duration = parsed.durationSeconds * 1000;
        this.tempoMap = parsed.tempoMap;

        const baseTick = 0;
        
        const pendingNotes = new Map();
        
        parsed.allEvents.forEach((ev, idx) => {
            let evType = ev.type;
            if (evType === 'controlChange') evType = 'control';
            const playerEv = {
                time: ev.tick,
                absMs: Math.round(ev.timeSeconds * 1000),
                type: evType,
                channel: ev.channel != null ? ev.channel : 0,
                track: ev.track,
                note: ev.note,
                velocity: ev.velocity,
                controller: ev.controller,
                value: ev.value,
                tempo: ev.microsecondsPerBeat,
                numerator: ev.numerator,
                denominator: ev.denominator,
                durationMs: 0
            };
            
            if (ev.type === 'noteOn' && ev.velocity > 0) {
                const key = playerEv.channel * 256 + ev.note;
                this.allEvents.push(playerEv);
                let stack = pendingNotes.get(key);
                if (!stack) { stack = { arr: [], head: 0 }; pendingNotes.set(key, stack); }
                stack.arr.push(playerEv);
            } else if (ev.type === 'noteOff' || (ev.type === 'noteOn' && ev.velocity === 0)) {
                const key = playerEv.channel * 256 + ev.note;
                const stack = pendingNotes.get(key);
                if (stack && stack.head < stack.arr.length) {
                    const startEv = stack.arr[stack.head++];
                    startEv.durationMs = playerEv.absMs - startEv.absMs;
                    if (stack.head >= stack.arr.length) pendingNotes.delete(key);
                }
                this.allEvents.push(playerEv);
            } else {
                this.allEvents.push(playerEv);
            }
        });

        for (const stack of pendingNotes.values()) {
            for (let si = stack.head; si < stack.arr.length; si++) {
                const startEv = stack.arr[si];
                if (startEv.durationMs <= 0) {
                    startEv.durationMs = Math.max(500, this.duration - startEv.absMs);
                }
            }
        }

        // parsed.allEvents is tick-ordered and absMs is non-decreasing in tick
        // order, so one stable merge pass produces exactly what the old
        // O(n log n) sort did (notes before non-notes on ties).
        const noteEvs = [], otherEvs = [];
        for (const ev of this.allEvents) {
            if (ev.type === 'noteOn' || ev.type === 'noteOff') noteEvs.push(ev);
            else otherEvs.push(ev);
        }
        const merged = new Array(this.allEvents.length);
        let a = 0, b = 0, m = 0;
        while (a < noteEvs.length && b < otherEvs.length) {
            if (otherEvs[b].absMs < noteEvs[a].absMs) merged[m++] = otherEvs[b++];
            else merged[m++] = noteEvs[a++];
        }
        while (a < noteEvs.length) merged[m++] = noteEvs[a++];
        while (b < otherEvs.length) merged[m++] = otherEvs[b++];
        this.allEvents = merged;

        this.isLoaded = true;
        return true;
    } catch (e) {
        console.error('MIDI load failed:', e);
        this.isLoaded = false;
        return false;
    }
};

const midiPlayer = new MIDIPlayer();

export { MIDIPlayer, midiPlayer, mul64to128, collectSingleMidiInfo };
