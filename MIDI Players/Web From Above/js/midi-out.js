// MIDI out: sends playback + live notes to an external MIDI device
// (synth, DAW, keyboard) via Web MIDI. Imports only settings, so it can be
// used from midi-manager, midi-player and keyboard without import cycles.
import { settings } from './settings.js';

let midiAccess = null;
let outputs = [];
let selectedOutput = null;

function attach(access) {
    midiAccess = access;
    scanOutputs();
}

function scanOutputs() {
    if (!midiAccess) return;
    const prevId = selectedOutput ? selectedOutput.id : settings.get('selectedMidiOutput');
    outputs = Array.from(midiAccess.outputs.values());
    const sel = document.getElementById('midiOutputSelect');
    if (sel) {
        sel.innerHTML = '<option value="">-- no midi output --</option>';
        outputs.forEach((out, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            option.textContent = out.name || 'Unknown';
            sel.appendChild(option);
        });
        const savedIdx = outputs.findIndex((o) => o.id === prevId);
        if (savedIdx >= 0) {
            sel.value = savedIdx;
            selectOutput(savedIdx);
        } else {
            selectedOutput = null;
        }
    }
    renderOutputList();
    updateSoundFontState();
}

function selectOutput(idx) {
    const out = outputs[idx];
    if (!out) { selectedOutput = null; renderOutputList(); updateSoundFontState(); return; }
    selectedOutput = out;
    try { settings.set('selectedMidiOutput', out.id); } catch (e) {}
    renderOutputList();
    updateSoundFontState();
}

const SF_DEFAULT_INFO = 'using built-in soundfont (load .sf2/.sf3 to override)';

function updateSoundFontState() {
    const btn = document.getElementById('insertSoundFontBtn');
    if (btn) btn.disabled = !!selectedOutput;
    const info = document.getElementById('insertedSoundFontInfo');
    if (!info) return;
    if (selectedOutput) {
        info.textContent = "you're using midi output, so you need to disable it before inserting a custom sf.";
    } else if (window.loadedSoundFont) {
        info.textContent = `using soundfont: ${window.loadedSoundFont.name}`;
    } else {
        info.textContent = SF_DEFAULT_INFO;
    }
}

function renderOutputList() {
    const list = document.getElementById('midiOutputList');
    if (!list) return;
    if (outputs.length === 0) {
        list.innerHTML = '<div class="info-text">no midi outputs found</div>';
        return;
    }
    list.innerHTML = outputs.map((out) => {
        const isSelected = selectedOutput && selectedOutput.id === out.id;
        return `<div class="midi-device-item ${isSelected ? 'selected' : ''}" title="${out.name}"><strong>${out.name}</strong></div>`;
    }).join('');
}

// Song events are processed up to leadMs early for visuals; schedule them on
// the device clock so they sound on time. `atMs` is a performance.now()
// timestamp; past timestamps play immediately.
function send(bytes, atMs) {
    if (!selectedOutput) return;
    try {
        if (atMs != null && isFinite(atMs) && atMs > performance.now()) {
            selectedOutput.send(bytes, atMs);
        } else {
            selectedOutput.send(bytes);
        }
    } catch (e) {}
}

function noteOn(ch, note, vel, atMs) {
    send([0x90 | (ch & 0x0F), note & 0x7F, Math.max(1, vel | 0)], atMs);
}

function noteOff(ch, note, atMs) {
    send([0x80 | (ch & 0x0F), note & 0x7F, 0], atMs);
}

function control(ch, cc, value, atMs) {
    send([0xB0 | (ch & 0x0F), cc & 0x7F, value & 0x7F], atMs);
}

function allNotesOff() {
    if (!selectedOutput) return;
    for (let ch = 0; ch < 16; ch++) {
        try { selectedOutput.send([0xB0 | ch, 123, 0]); } catch (e) {}
    }
}

function isActive() {
    return !!selectedOutput;
}

export { attach as midiOutAttach, scanOutputs as midiOutScan, selectOutput as midiOutSelect,
         send as midiOutSend, noteOn as midiOutNoteOn, noteOff as midiOutNoteOff,
         control as midiOutControl, allNotesOff as midiOutAllNotesOff,
         updateSoundFontState as midiOutRefreshSoundFontState,
         isActive as midiOutIsActive };
