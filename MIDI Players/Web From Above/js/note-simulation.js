import { settings } from './settings.js';
import { keyToMidi, isSharp, channelColors, KeyMap } from './piano-constants.js';
import { WinW, WinH, KeyX, KeyWidth, m_fWhiteCX } from './webgl.js';
import { renderNotes } from './Render.js';
import { getNotesCY } from './Renderer.js';
import { triggerKey, pressKeyVisual, releaseKeyVisual, releaseKey } from './keyboard.js';

let liveNotesPool = [];
let activeLiveNotes = 0;
let activeNotes = [];
let keyHoldCounts = new Array(256).fill(0);

const MAX_LIVE_NOTES = 28000;

// Free-list of inactive pooled notes: O(1) spawn instead of scanning the pool.
// Retire paths push here; spawn pops. Invariant: every inactive pooled note
// is on this stack exactly once.
let freeNotes = [];
let stealCursor = 0;

// Live-held free-play notes per key index, for hold-to-sustain: the note
// grows while the key is down and detaches when released.
const freeHeldByKey = new Map();

function releaseFreeNote(k, now = performance.now()) {
    const arr = freeHeldByKey.get(k);
    if (!arr) return;
    for (const n of arr) {
        if (n.active && n.freeplay && n.freeHeld) {
            n.freeHeld = false;
            // Floor so ultra-fast taps still leave a visible blip instead of a
            // sliver (or NaN when press+release land between two frames).
            const h = n.yb - n.ye;
            n.freeH = Math.max(80, (isFinite(h) ? h : 0));
            n.freeReleasedAt = now;
        }
    }
    freeHeldByKey.delete(k);
}

// Drop song notes that have not hit yet so a pause/seek can rewind the
// event cursors and re-spawn the look-ahead window without duplicates.
function retireFutureSongNotes(cutTime) {
    for (let i = activeNotes.length - 1; i >= 0; i--) {
        const n = activeNotes[i];
        if (!n || !n.active) {
            activeNotes[i] = activeNotes[activeNotes.length - 1];
            activeNotes.pop();
            continue;
        }
        if (n.freeplay) continue;
        if (n.eventTime != null && n.eventTime > cutTime) {
            if (n.keyPressed) {
                keyHoldCounts[n.k] = Math.max(0, (keyHoldCounts[n.k] || 0) - 1);
                if (keyHoldCounts[n.k] === 0) releaseKey(n.k);
                n.keyPressed = false;
            }
            n.active = false;
            activeLiveNotes--;
            activeNotes[i] = activeNotes[activeNotes.length - 1];
            activeNotes.pop();
            freeNotes.push(n);
        }
    }
}

function spawnLiveNote(midiK, velocity=127, eventTime=null, currentTime=null, durationMs=0, colorIdx = 0, layerInfo = null, midiPlayer = null){
    const c = channelColors[ colorIdx % channelColors.length ];
    addLiveNote(midiK, c, velocity, eventTime, currentTime, durationMs, colorIdx, layerInfo, midiPlayer);
}

function addLiveNote(k, color, velocity=127, eventTime=null, currentTime=null, durationMs=0, channel = 0, layerInfo = null, midiPlayer = null){
    const kbTop  = getNotesCY();
    const pxPerMs = settings.get('noteSpeed') / 8;
    const hitTime = eventTime;
    let ybNow;
    let songTime = 0;
    if (midiPlayer && midiPlayer.isPlaying && midiPlayer.startTimestamp) {
        songTime = performance.now() - midiPlayer.startTimestamp;
    }
    if (hitTime != null && songTime > 0) {
        const msUntilHit = hitTime - songTime;
        ybNow = kbTop - msUntilHit * pxPerMs;
    } else {
        const msUntilHit = (eventTime !== null && currentTime !== null) ? (eventTime - currentTime) : -9999;
        ybNow = kbTop - msUntilHit * pxPerMs;
    }
    const noteLenPx = (durationMs > 0) ? (durationMs * pxPerMs) : 20;
    const makeNote = (n) => {
        n.k = k; n.color = color; n.channel = channel; n.velocity = velocity;
        n.yb = ybNow; n.ye = ybNow - noteLenPx; n.active = true;
        n.spawnTime = performance.now(); n.ybAtSpawn = ybNow;
        n.keyPressed = false; n.hitTime = hitTime; n.eventTime = eventTime;
        n.durationMs = durationMs || 0;
        if (layerInfo) {
            n.originalNoteId = layerInfo.originalNoteId || null; n.layerType = layerInfo.layerType || null;
            n.visualOnly = !!layerInfo.visualOnly; n.renderColor = layerInfo.renderColor || null;
            n.opacity = (typeof layerInfo.opacity === 'number') ? layerInfo.opacity : 1.0;
            n.laneOffset = (typeof layerInfo.laneOffset === 'number') ? layerInfo.laneOffset : 0;
            n.freeplay = !!layerInfo.freeplay;
            if (n.freeplay) {
                n.freeHeld = true;
                n.freeReleasedAt = 0;
                let arr = freeHeldByKey.get(k);
                if (!arr) { arr = []; freeHeldByKey.set(k, arr); }
                arr.push(n);
            } else {
                n.freeHeld = false;
            }
        } else {
            n.originalNoteId = null; n.layerType = null; n.visualOnly = false;
            n.renderColor = null; n.opacity = 1.0; n.laneOffset = 0; n.freeplay = false;
        }
    };
    if(activeLiveNotes >= MAX_LIVE_NOTES){
        // Round-robin victim instead of a full-pool lowest-note scan: O(1)
        // amortized per spawn, which matters when saturation coincides with
        // dense bursts (thousands of spawns per frame).
        const poolLen = liveNotesPool.length;
        for (let t = 0; t < poolLen; t++) {
            stealCursor = (stealCursor + 1) % poolLen;
            const n = liveNotesPool[stealCursor];
            if (n && n.active) { makeNote(n); break; }
        }
        return;
    }
    let note = freeNotes.pop();
    if(!note){ note = {}; liveNotesPool.push(note); }
    makeNote(note);
    activeNotes.push(note);
    activeLiveNotes++;
}

function updateLiveNotes(midiPlayer = null, now = performance.now(), mouse = null){
    const kbTop = getNotesCY();
    // C++ hover highlight only applies while paused with the mouse on screen.
    const paused = !midiPlayer || !midiPlayer.isPlaying;
    const hover = paused && mouse && mouse.inside ? mouse : null;
    const pxPerMs = settings.get('noteSpeed') / 8;

    const isPaused = midiPlayer && !midiPlayer.isPlaying;

    let playbackTime = 0;
    if (midiPlayer && midiPlayer.isPlaying && midiPlayer.startTimestamp) {
        playbackTime = performance.now() - midiPlayer.startTimestamp;
    }

    const retireMarginLong  = 400;
    const retireMarginShort = 260;
    const glowStrength = (typeof settings !== 'undefined' && settings.get) ? (settings.get('glowStrength') || 0) : 0.5;

    for (let i = activeNotes.length - 1; i >= 0; i--) {
        const n = activeNotes[i];
        if (!n || !n.active) {
            activeNotes[i] = activeNotes[activeNotes.length - 1];
            activeNotes.pop();
            continue;
        }

        // Free-play notes float upward from the key at a fixed pixel height
        // instead of falling like song notes. They keep moving and retiring
        // even while paused/idle, otherwise a tap with no song playing would
        // stick on screen forever.
        if (!isPaused || n.freeplay) {
            if (n.freeplay) {
                if (n.freeHeld) {
                    n.yb = kbTop;
                    n.ye = n.yb - Math.max(1, (now - n.spawnTime) * pxPerMs);
                } else {
                    n.yb = kbTop - (now - (n.freeReleasedAt || now)) * pxPerMs;
                    n.ye = n.yb - (n.freeH || 0);
                }
            } else {
                if (n.hitTime != null && playbackTime > 0) {
                    const timeToHit = n.hitTime - playbackTime;
                    n.yb = kbTop - timeToHit * pxPerMs;
                } else {
                    const elapsed = now - n.spawnTime;
                    n.yb = n.ybAtSpawn + elapsed * pxPerMs;
                }
                if (n.durationMs > 0) {
                    n.ye = n.yb - n.durationMs * pxPerMs;
                } else {
                    n.ye = n.yb - 20;
                }
            }

            if (!n.visualOnly) {
                if (n.durationMs > 0) {
                    if (!n.keyPressed && n.yb >= kbTop) {
                        n.keyPressed = true;
                        keyHoldCounts[n.k] = (keyHoldCounts[n.k] || 0) + 1;
                        if (keyHoldCounts[n.k] === 1) {
                            const noteColor = (n.channel != null) ? channelColors[n.channel % channelColors.length] : n.color;
                            if (midiPlayer && midiPlayer.isPlaying) {
                                pressKeyVisual(n.k, noteColor);
                            } else {
                                triggerKey(n.k, n.velocity, noteColor);
                            }
                        }
                    }
                    if (n.keyPressed && n.ye >= kbTop) {
                        keyHoldCounts[n.k] = Math.max(0, (keyHoldCounts[n.k] || 0) - 1);
                        n.keyPressed = false;
                        if (keyHoldCounts[n.k] === 0) {
                            if (midiPlayer && midiPlayer.isPlaying) {
                                releaseKeyVisual(n.k);
                            } else {
                                releaseKey(n.k);
                            }
                        }
                    }
                } else {
                    if (!n.keyPressed && n.yb >= kbTop) {
                        n.keyPressed = true;
                        if (midiPlayer && midiPlayer.isPlaying) {
                            pressKeyVisual(n.k, n.color);
                        } else {
                            triggerKey(n.k, n.velocity, n.color);
                        }
                    }
                }
            }

            const retireMargin = (n.durationMs > 0 ? retireMarginLong : retireMarginShort);
            const roseOut = n.freeplay && n.yb < -retireMargin;
            if (n.ye >= kbTop + retireMargin || roseOut) {
                if (n.keyPressed) {
                    keyHoldCounts[n.k] = Math.max(0, (keyHoldCounts[n.k] || 0) - 1);
                    if (keyHoldCounts[n.k] === 0) {
                        if (midiPlayer && midiPlayer.isPlaying) {
                            releaseKeyVisual(n.k);
                        } else {
                            releaseKey(n.k);
                        }
                    }
                    n.keyPressed = false;
                }
                n.active = false;
                activeLiveNotes--;
                activeNotes[i] = activeNotes[activeNotes.length - 1];
                activeNotes.pop();
                freeNotes.push(n);
                continue;
            }
            if (n.yb < -12000 && !n.keyPressed) {
                n.active = false;
                activeLiveNotes--;
                activeNotes[i] = activeNotes[activeNotes.length - 1];
                activeNotes.pop();
                freeNotes.push(n);
                continue;
            }
        }

    }

    const notesCY = kbTop;
    // Flat full alpha like C++ (m_iNotesAlpha stays 255 outside transitions).
    // The old song-start fade drained every note to transparent 1.5s into
    // playback and never restored it.
    const fadeAlpha = 255;

    // View state for the exact RenderNotes port. Geometry comes from event
    // times there (C++ llNoteStart/llNoteEnd); yb/ye above stay for key
    // triggering and retire logic only.
    const timeSpanMs = Math.max(1, notesCY / pxPerMs);
    const startTimeMs = (midiPlayer && midiPlayer.isPlaying)
        ? playbackTime
        : ((midiPlayer && midiPlayer.currentTime) || 0);
    renderNotes(activeNotes, {
        startTimeMs, timeSpanMs,
        notesY: 0, notesCY, whiteCX: m_fWhiteCX,
        alpha: fadeAlpha, paused,
        minTimeMs: 0, glowStrength
    }, hover);
}

export { liveNotesPool, activeNotes, activeLiveNotes, keyHoldCounts, MAX_LIVE_NOTES,
         addLiveNote, spawnLiveNote, updateLiveNotes, releaseFreeNote, retireFutureSongNotes };
