import { keyToMidi, midiToKey, isSharp, SharpRatio, KeyMap, NoteColors, trackColorIdx, getNoteX, computeKeyboardLayout } from './piano-constants.js';
import { WinW, WinH, KeyX, KeyWidth, KeyPress, KeyColor, m_iStartNote, m_iEndNote, m_fWhiteCX, m_fNotesX } from './webgl.js';
import { playKey, stopKey, resumeAudioSilently } from './audio-engine.js';
import { midiOutNoteOn, midiOutNoteOff } from './midi-out.js';

function triggerKey(k, velocity=127, color = null){
    if(k < 0 || k >= 256) return;
    const j = KeyMap[k];
    KeyPress[j] = true;
    KeyColor[j] = (color != null ? color : NoteColors[trackColorIdx.value % NoteColors.length]);
    if (typeof resumeAudioSilently === 'function') resumeAudioSilently();
    playKey(k, velocity);
    midiOutNoteOn(0, keyToMidi(k), velocity);
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

function releaseKey(k){
    if(k < 0 || k >= 256) return;
    const j = KeyMap[k];
    KeyPress[j] = false;
    KeyColor[j] = 0xFFFFFFFF;
    stopKey(k);
    midiOutNoteOff(0, keyToMidi(k));
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
