import { settings } from './settings.js';
import { midiToKey, NoteColors, keyToMidi } from './piano-constants.js';
import { triggerKey, releaseKey } from './keyboard.js';
import { spawnLiveNote, releaseFreeNote } from './note-simulation.js';
import { midiPlayer } from './midi-player.js';
import { midiOutAttach, midiOutScan, midiOutNoteOn, midiOutNoteOff, midiOutControl } from './midi-out.js';
import { t } from './i18n.js';

class MIDIManager {
    constructor() {
        this.midiAccess = null;
        this.selectedInput = null;
        this.inputs = [];
        this.isSupported = navigator.requestMIDIAccess !== undefined;
        this.liveSustainOn = new Array(16).fill(false);
        this.livePedalHeldNotes = new Set();
        this.livePedalGraceUntil = 0;
        this.init();
    }
    async init() {
        if(!this.isSupported) { updateMIDIStatus(false, 'MIDI not supported'); return; }
        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.scanInputs();
            midiOutAttach(this.midiAccess);
            this.midiAccess.addEventListener('statechange', () => { this.scanInputs(); midiOutScan(); });
            updateMIDIStatus(true, 'MIDI ready');
        } catch(e) {
            console.warn('MIDI access denied:', e);
            updateMIDIStatus(false, 'MIDI access denied');
        }
    }
    scanInputs() {
        if(!this.midiAccess) return;
        this.inputs = Array.from(this.midiAccess.inputs.values());
        const deviceSelect = document.getElementById('midiDeviceSelect');
        let placeholder = '-- no midi device --';
        try {
            const v = t('noMidiDevice');
            if (v && v !== 'noMidiDevice') placeholder = v;
        } catch (e) {}
        deviceSelect.innerHTML = '';
        const defOpt = document.createElement('option');
        defOpt.value = '';
        defOpt.textContent = placeholder;
        defOpt.setAttribute('data-i18n', 'noMidiDevice');
        deviceSelect.appendChild(defOpt);
        this.inputs.forEach((input, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            option.textContent = `${input.name || 'Unknown'} (${input.manufacturer || 'Unknown'})`;
            deviceSelect.appendChild(option);
        });
        const savedId = settings.get('selectedMidiDevice');
        if(savedId && this.inputs[savedId]) { deviceSelect.value = savedId; this.selectInput(savedId); }
        updateMIDIDeviceList();
    }
    selectInput(indexOrId) {
        if(!this.inputs[indexOrId]) { this.selectedInput = null; return; }
        this.selectedInput = this.inputs[indexOrId];
        settings.set('selectedMidiDevice', indexOrId);
        this.liveSustainOn.fill(false);
        this.livePedalHeldNotes.clear();
        this.livePedalGraceUntil = 0;
        if(this.selectedInput) { this.selectedInput.onmidimessage = (msg) => this.handleMessage(msg); }
        updateMIDIDeviceList();
    }
    handleMessage(msg) {
        const data = msg.data;
        const cmd = data[0];
        const ch = cmd & 0x0F;
        const status = cmd & 0xF0;
        const note = data[1];
        const velocity = data[2] || 0;

        // Thru to MIDI out, preserving channel.
        try {
            if (status === 0x90 || status === 0x80) {
                if (status === 0x90 && velocity > 0) midiOutNoteOn(ch, note, velocity);
                else midiOutNoteOff(ch, note);
            } else if (status === 0xB0) {
                midiOutControl(ch, data[1], data[2] || 0);
            }
        } catch (e) {}

        if (status === 0xB0) {
            const controller = data[1];
            const value = data[2] || 0;
            if (controller === 64) {
                const on = value >= 64;
                const wasOn = this.liveSustainOn[ch];
                this.liveSustainOn[ch] = on;

                if (wasOn && !on) {
                    const heldCopy = Array.from(this.livePedalHeldNotes);
                    this.livePedalHeldNotes.clear();
                    this.livePedalGraceUntil = performance.now() + 30;
                    const releaseFn = () => {
                        for (const midiNote of heldCopy) {
                            const k = midiToKey(midiNote);
                            if (k >= 0 && k < 128) {
                                if (typeof releaseKey === 'function') releaseKey(k);
                                releaseFreeNote(k);
                            }
                        }
                    };
                    releaseFn();
                    setTimeout(releaseFn, 25);
                }
                return;
            }
        }

        const noteOn  = (status === 0x90 && velocity > 0);
        const noteOff = (status === 0x80 || (status === 0x90 && velocity === 0));

        if (noteOn) {
            const k = midiToKey(note);
            if (k >= 0 && k < 128) {
                triggerKey(k, velocity, NoteColors[ch % NoteColors.length]);
                const now = (midiPlayer && midiPlayer.currentTime) || 0;
                spawnLiveNote(k, velocity, now, now, 150, ch,
                    { visualOnly: true, freeplay: true, layerType: 'freeplay', opacity: 0.9 }, midiPlayer);
            }
        }

            if (noteOff) {
                const k = midiToKey(note);
                if (k >= 0 && k < 128) {
                    const now = performance.now();
                    if (this.liveSustainOn[ch] || now < this.livePedalGraceUntil) {
                        this.livePedalHeldNotes.add(note);
                    } else {
                        if (typeof releaseKey === 'function') releaseKey(k);
                        releaseFreeNote(k);
                        this.livePedalHeldNotes.delete(note);
                    }
                }
            }
    }
}

const midiManager = new MIDIManager();

function updateMIDIStatus(active, text) {
    const indicator = document.getElementById('midiStatus');
    if(!indicator) return;
    if(active) indicator.classList.remove('inactive');
    else indicator.classList.add('inactive');
}

function shortenText(text, maxLength = 28) {
    if (!text || text.length <= maxLength) return text;
    const half = Math.floor((maxLength - 3) / 2);
    return text.slice(0, half) + '...' + text.slice(-half);
}

function updateMIDIDeviceList() {
    const list = document.getElementById('midiDeviceList');
    const selectedInput = midiManager.selectedInput;
    list.innerHTML = midiManager.inputs.map((input, idx) => {
        const isSelected = selectedInput && selectedInput.id === input.id;
        const shortPort = shortenText(input.id, 28);
        return `<div class="midi-device-item ${isSelected ? 'selected' : ''}" title="${input.name} | ${input.manufacturer} | Port: ${input.id}"><strong>${input.name}</strong><br>${input.manufacturer} | Port: ${shortPort}</div>`;
    }).join('');
    if(midiManager.inputs.length === 0) list.innerHTML = '<div class="info-text">no midi devices found</div>';
}

export { MIDIManager, midiManager, updateMIDIStatus, shortenText, updateMIDIDeviceList };
