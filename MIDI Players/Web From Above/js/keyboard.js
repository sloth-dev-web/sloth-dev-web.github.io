import { keyToMidi, midiToKey, isSharp, SharpRatio, KeyMap, NoteColors, trackColorIdx, getNoteX, computeKeyboardLayout } from './piano-constants.js';
import { WinW, WinH, KeyX, KeyWidth, KeyPress, KeyColor, m_iStartNote, m_iEndNote, m_fWhiteCX, m_fNotesX } from './webgl.js';
import { playKey, stopKey, resumeAudioSilently } from './audio-engine.js';
import { midiOutNoteOn, midiOutNoteOff, midiOutIsActive } from './midi-out.js';
import { settings } from './settings.js';

// Same rule as song playback: with a MIDI output selected (and the default
// mute-internal toggle on), free-play must not also fire the SoundFont —
// dual output sounds like a delayed echo and leaks stacked voices after a
// bad custom SF session.
function internalSynthAudible() {
    return !settings.get('muteInternalSynth') || !midiOutIsActive();
}

function triggerKey(k, velocity=127, color = null, midiCh = 0, skipMidiOut = false){
    if(k < 0 || k >= 256) return;
    const j = KeyMap[k];
    KeyPress[j] = true;
    KeyColor[j] = (color != null ? color : NoteColors[trackColorIdx.value % NoteColors.length]);
    if (typeof resumeAudioSilently === 'function') resumeAudioSilently();
    if (internalSynthAudible()) playKey(k, velocity);
    // skipMidiOut: live MIDI input already forwarded the raw note bytes.
    if (!skipMidiOut) midiOutNoteOn(midiCh & 0x0F, keyToMidi(k), velocity);
}

function pressKeyVisual(k, color = null) {
    if (k < 0) return;
    const j = KeyMap[k];
    KeyPress[j] = true;
    KeyColor[j] = (color != null ? color : NoteColors[trackColorIdx.value % NoteColors.length]);
}

function releaseKeyVisual(k){
    if(k < 0) return;
    const j = KeyMap[k];
    KeyPress[j] = false;
    KeyColor[j] = 0xFFFFFFFF;
}

function releaseKey(k, midiCh = 0, skipMidiOut = false){
    if(k < 0 || k >= 256) return;
    const j = KeyMap[k];
    KeyPress[j] = false;
    KeyColor[j] = 0xFFFFFFFF;
    // Always drain internal voices (even when muted for MIDI out) so a
    // crashed/custom SF can't leave ringing leftovers under the device.
    stopKey(k);
    if (!skipMidiOut) midiOutNoteOff(midiCh & 0x0F, keyToMidi(k));
}

function hitKey(cx, cy){
    // Same layout math as Renderer.js (exact port of RenderKeys header).
    const L = computeKeyboardLayout(WinW, WinH, m_iStartNote, m_iEndNote);
    const kbTop = L.keysY;
    if(cy < kbTop) return -1;
    const fSharpCY = L.fTopCY * 0.67;
    const fCurY = L.fTransitionCY + L.fRedCY + L.fSpacerCY;
    const whiteCX = L.whiteCX;
    const relY = cy - kbTop - fCurY;
    // Sharps sit on top: test them first with the exact GetNoteX position
    // (per-note nudge included, matching RenderKeys).
    if(relY < fSharpCY){
        for(let m = m_iStartNote; m <= m_iEndNote; m++){
            if(!isSharp(m)) continue;
            const x = getNoteX(m, m_iStartNote, whiteCX, L.notesX);
            if(cx >= x && cx <= x + whiteCX * SharpRatio) return midiToKey(m);
        }
    }
    // White keys accumulate exactly like the RenderKeys white pass.
    let fX = L.notesX + (isSharp(m_iStartNote) ? whiteCX * (SharpRatio / 2.0 - 1.0) : 0.0);
    for(let m = m_iStartNote; m <= m_iEndNote; m++){
        if(isSharp(m)) continue;
        if(cx >= fX && cx < fX + whiteCX) return midiToKey(m);
        fX += whiteCX;
    }
    return -1;
}

export { triggerKey, pressKeyVisual, releaseKeyVisual, releaseKey, hitKey };
