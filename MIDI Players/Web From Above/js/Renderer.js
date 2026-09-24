// Renderer.js — piano keyboard renderer.
// Exact port of MainScreen::RenderKeys from GameState.cpp
// (plus the RenderGlobals screen-Y math it depends on).
import { settings } from './settings.js';
import { SharpRatio, Note, C4, A0, C8, isSharp, whiteCount, sharpNudge,
         initKeyboardColors, makeTrackColor, computeKeyboardLayout } from './piano-constants.js';
import { WGL, WinW, WinH, KeyPress, KeyColor,
         m_iStartNote, m_iEndNote, m_iNotesAlpha, getBackgroundColor } from './webgl.js';

const KB = initKeyboardColors();

// Layout inputs only change on resize (or range change), but this is queried
// several times per frame, so memoize on the inputs.
let layoutCache = null;
let layoutKey = '';
function getKeyboardLayout() {
    const key = WinW + 'x' + WinH + ':' + m_iStartNote + '-' + m_iEndNote;
    if (layoutCache === null || layoutKey !== key) {
        layoutCache = computeKeyboardLayout(WinW, WinH, m_iStartNote, m_iEndNote);
        layoutKey = key;
    }
    return layoutCache;
}
function getNotesCY() {
    return getKeyboardLayout().notesCY;
}
function getKeysY() {
    return getKeyboardLayout().keysY;
}

// Web port pressed-state lookup. C++ uses m_pNoteState / m_pInputState event
// indices plus track/channel colors, missed-note and Learn-mode handling.
// The web port tracks a boolean + RGB color per key, so a pressed key maps to
// the "has event" branch with its track color; missed/learn states don't exist
// here (kept as false with the original branch structure intact).
function pressedColor(midi) {
    return makeTrackColor(KeyColor[midi] >>> 0);
}

function drawKeyboard() {
    const L = getKeyboardLayout();
    const fKeysY = L.keysY, fKeysCY = L.keysCY;
    const fTransitionCY = L.fTransitionCY, fRedCY = L.fRedCY, fSpacerCY = L.fSpacerCY;
    const fTopCY = L.fTopCY, fNearCY = L.fNearCY;
    const m_fWhiteCX = L.whiteCX, m_fNotesX = L.notesX, m_fNotesCX = L.notesCX;

    const bgPrimary = getBackgroundColor(); // settings note-area color (C++: m_csBackground.iPrimaryRGB)
    const m_csKBBackground = KB.kbBackground;
    const m_csKBRed = KB.kbRed;
    const m_csKBWhite = KB.kbWhite;
    const m_csKBSharp = KB.kbSharp;
    const m_csKBBadNote = KB.kbBadNote;

    // Draw the background
    WGL.drawRect(m_fNotesX, fKeysY, m_fNotesCX, fKeysCY, m_csKBBackground.veryDark, m_csKBBackground.veryDark, m_csKBBackground.veryDark, m_csKBBackground.veryDark);
    WGL.drawRect(m_fNotesX, fKeysY, m_fNotesCX, fTransitionCY,
        bgPrimary, bgPrimary, m_csKBBackground.veryDark, m_csKBBackground.veryDark);
    WGL.drawRect(m_fNotesX, fKeysY + fTransitionCY, m_fNotesCX, fRedCY,
        m_csKBRed.dark, m_csKBRed.dark, m_csKBRed.primary, m_csKBRed.primary);
    WGL.drawRect(m_fNotesX, fKeysY + fTransitionCY + fRedCY, m_fNotesCX, fSpacerCY,
        m_csKBBackground.dark, m_csKBBackground.dark, m_csKBBackground.dark, m_csKBBackground.dark);

    // Keys info
    const fKeyGap = Math.max(1.0, Math.floor(m_fWhiteCX * 0.05 + 0.5));
    const fKeyGap1 = fKeyGap - Math.floor(fKeyGap / 2.0 + 0.5);

    let iStartRender = (isSharp(m_iStartNote) ? m_iStartNote - 1 : m_iStartNote);
    let iEndRender = (isSharp(m_iEndNote) ? m_iEndNote + 1 : m_iEndNote);
    const fStartX = (isSharp(m_iStartNote) ? m_fWhiteCX * (SharpRatio / 2.0 - 1.0) : 0.0);
    const fSharpCY = fTopCY * 0.67;

    // Draw the white keys
    let fCurX = m_fNotesX + fStartX;
    const fCurY = fKeysY + fTransitionCY + fRedCY + fSpacerCY;
    for (let i = iStartRender; i <= iEndRender; i++) {
        if (isSharp(i)) continue;
        const pressed = !!KeyPress[i];
        if (!pressed) {
            WGL.drawRect(fCurX + fKeyGap1, fCurY, m_fWhiteCX - fKeyGap, fTopCY + fNearCY,
                m_csKBWhite.dark, m_csKBWhite.dark, m_csKBWhite.primary, m_csKBWhite.primary);
            WGL.drawRect(fCurX + fKeyGap1, fCurY + fTopCY, m_fWhiteCX - fKeyGap, fNearCY,
                m_csKBWhite.dark, m_csKBWhite.dark, m_csKBWhite.veryDark, m_csKBWhite.veryDark);
            WGL.drawRect(fCurX + fKeyGap1, fCurY + fTopCY, m_fWhiteCX - fKeyGap, 2.0,
                m_csKBBackground.dark, m_csKBBackground.dark, m_csKBWhite.veryDark, m_csKBWhite.veryDark);

            if (i === C4) {
                const fMXGap = Math.floor(m_fWhiteCX * 0.25 + 0.5);
                const fMCX = m_fWhiteCX - fMXGap * 2.0 - fKeyGap;
                const fMY = Math.max(fCurY + fTopCY - fMCX - 5.0, fCurY + fSharpCY + 5.0);
                WGL.drawRect(fCurX + fKeyGap1 + fMXGap, fMY, fMCX, fCurY + fTopCY - 5.0 - fMY, m_csKBWhite.dark, m_csKBWhite.dark, m_csKBWhite.dark, m_csKBWhite.dark);
            }
        } else {
            const csTrack = pressedColor(i);
            const iAlpha = (m_iNotesAlpha << 24) >>> 0;
            if (iAlpha) {
                WGL.drawRect(fCurX + fKeyGap1, fCurY, m_fWhiteCX - fKeyGap, fTopCY + fNearCY - 2.0,
                    m_csKBWhite.dark, m_csKBWhite.dark, m_csKBWhite.primary, m_csKBWhite.primary);
                WGL.drawRect(fCurX + fKeyGap1, fCurY + fTopCY + fNearCY - 2.0, m_fWhiteCX - fKeyGap, 2.0, m_csKBWhite.dark, m_csKBWhite.dark, m_csKBWhite.dark, m_csKBWhite.dark);
            }

            // Web port: no missed/learn states, so the track color always wins
            // (C++ picks m_csKBBadNote here for missed/bad-learn notes).
            const csKBWhite = csTrack;
            WGL.drawRect(fCurX + fKeyGap1, fCurY, m_fWhiteCX - fKeyGap, fTopCY + fNearCY - 2.0,
                csKBWhite.dark | iAlpha, csKBWhite.dark | iAlpha, csKBWhite.primary | iAlpha, csKBWhite.primary | iAlpha);
            WGL.drawRect(fCurX + fKeyGap1, fCurY + fTopCY + fNearCY - 2.0, m_fWhiteCX - fKeyGap, 2.0, csKBWhite.dark | iAlpha, csKBWhite.dark | iAlpha, csKBWhite.dark | iAlpha, csKBWhite.dark | iAlpha);

            if (i === C4) {
                const fMXGap = Math.floor(m_fWhiteCX * 0.25 + 0.5);
                const fMCX = m_fWhiteCX - fMXGap * 2.0 - fKeyGap;
                const fMY = Math.max(fCurY + fTopCY + fNearCY - fMCX - 7.0, fCurY + fSharpCY + 5.0);
                if (iAlpha)
                    WGL.drawRect(fCurX + fKeyGap1 + fMXGap, fMY, fMCX, fCurY + fTopCY + fNearCY - 7.0 - fMY, m_csKBWhite.dark, m_csKBWhite.dark, m_csKBWhite.dark, m_csKBWhite.dark);
                WGL.drawRect(fCurX + fKeyGap1 + fMXGap, fMY, fMCX, fCurY + fTopCY + fNearCY - 7.0 - fMY, csKBWhite.dark | iAlpha, csKBWhite.dark | iAlpha, csKBWhite.dark | iAlpha, csKBWhite.dark | iAlpha);
            }
        }
        WGL.drawRect(Math.floor(fCurX + fKeyGap1 + m_fWhiteCX - fKeyGap + 0.5), fCurY, fKeyGap, fTopCY + fNearCY,
            m_csKBBackground.veryDark, m_csKBBackground.primary, m_csKBBackground.primary, m_csKBBackground.veryDark);

        fCurX += m_fWhiteCX;
    }

    // Draw the sharps
    iStartRender = (m_iStartNote !== A0 && !isSharp(m_iStartNote) && m_iStartNote > 0 && isSharp(m_iStartNote - 1) ? m_iStartNote - 1 : m_iStartNote);
    iEndRender = (m_iEndNote !== C8 && !isSharp(m_iEndNote) && m_iEndNote < 255 && isSharp(m_iEndNote + 1) ? m_iEndNote + 1 : m_iEndNote);
    const fSharpStartX = (isSharp(m_iStartNote) ? m_fWhiteCX * SharpRatio / 2.0 : 0.0);

    const fSharpTop = SharpRatio * 0.7;
    fCurX = m_fNotesX + fSharpStartX;
    for (let i = iStartRender; i <= iEndRender; i++) {
        if (!isSharp(i)) {
            fCurX += m_fWhiteCX;
            continue;
        }
        const fNudgeX = sharpNudge(i);

        const cx = m_fWhiteCX * SharpRatio;
        const x = fCurX - m_fWhiteCX * (SharpRatio / 2.0 - fNudgeX);
        const fSharpTopX1 = x + m_fWhiteCX * (SharpRatio - fSharpTop) / 2.0;
        const fSharpTopX2 = fSharpTopX1 + m_fWhiteCX * fSharpTop;

        const pressed = !!KeyPress[i];
        if (!pressed) {
            WGL.drawSkew(fSharpTopX1, fCurY + fSharpCY - fNearCY,
                         fSharpTopX2, fCurY + fSharpCY - fNearCY,
                         x + cx, fCurY + fSharpCY, x, fCurY + fSharpCY,
                         m_csKBSharp.primary, m_csKBSharp.primary, m_csKBSharp.veryDark, m_csKBSharp.veryDark);
            WGL.drawSkew(fSharpTopX1, fCurY - fNearCY,
                         fSharpTopX1, fCurY + fSharpCY - fNearCY,
                         x, fCurY + fSharpCY, x, fCurY,
                         m_csKBSharp.primary, m_csKBSharp.primary, m_csKBSharp.veryDark, m_csKBSharp.veryDark);
            WGL.drawSkew(fSharpTopX2, fCurY + fSharpCY - fNearCY,
                         fSharpTopX2, fCurY - fNearCY,
                         x + cx, fCurY, x + cx, fCurY + fSharpCY,
                         m_csKBSharp.primary, m_csKBSharp.primary, m_csKBSharp.veryDark, m_csKBSharp.veryDark);
            WGL.drawRect(fSharpTopX1, fCurY - fNearCY, fSharpTopX2 - fSharpTopX1, fSharpCY, m_csKBSharp.veryDark, m_csKBSharp.veryDark, m_csKBSharp.veryDark, m_csKBSharp.veryDark);
            WGL.drawSkew(fSharpTopX1, fCurY - fNearCY,
                         fSharpTopX2, fCurY - fNearCY,
                         fSharpTopX2, fCurY - fNearCY + fSharpCY * 0.45,
                         fSharpTopX1, fCurY - fNearCY + fSharpCY * 0.35,
                         m_csKBSharp.dark, m_csKBSharp.dark, m_csKBSharp.primary, m_csKBSharp.primary);
            WGL.drawSkew(fSharpTopX1, fCurY - fNearCY + fSharpCY * 0.35,
                         fSharpTopX2, fCurY - fNearCY + fSharpCY * 0.45,
                         fSharpTopX2, fCurY - fNearCY + fSharpCY * 0.65,
                         fSharpTopX1, fCurY - fNearCY + fSharpCY * 0.55,
                         m_csKBSharp.primary, m_csKBSharp.primary, m_csKBSharp.veryDark, m_csKBSharp.veryDark);
        } else {
            const csTrack = pressedColor(i);
            const fNewNear = fNearCY * 0.25;

            const iAlpha = (m_iNotesAlpha << 24) >>> 0;
            if (iAlpha) {
                WGL.drawSkew(fSharpTopX1, fCurY + fSharpCY - fNewNear,
                             fSharpTopX2, fCurY + fSharpCY - fNewNear,
                             x + cx, fCurY + fSharpCY, x, fCurY + fSharpCY,
                             m_csKBSharp.primary, m_csKBSharp.primary, m_csKBSharp.veryDark, m_csKBSharp.veryDark);
                WGL.drawSkew(fSharpTopX1, fCurY - fNewNear,
                             fSharpTopX1, fCurY + fSharpCY - fNewNear,
                             x, fCurY + fSharpCY, x, fCurY,
                             m_csKBSharp.primary, m_csKBSharp.primary, m_csKBSharp.veryDark, m_csKBSharp.veryDark);
                WGL.drawSkew(fSharpTopX2, fCurY + fSharpCY - fNewNear,
                             fSharpTopX2, fCurY - fNewNear,
                             x + cx, fCurY, x + cx, fCurY + fSharpCY,
                             m_csKBSharp.primary, m_csKBSharp.primary, m_csKBSharp.veryDark, m_csKBSharp.veryDark);
                WGL.drawRect(fSharpTopX1, fCurY - fNewNear, fSharpTopX2 - fSharpTopX1, fSharpCY, m_csKBSharp.veryDark, m_csKBSharp.veryDark, m_csKBSharp.veryDark, m_csKBSharp.veryDark);
                WGL.drawSkew(fSharpTopX1, fCurY - fNewNear,
                             fSharpTopX2, fCurY - fNewNear,
                             fSharpTopX2, fCurY - fNewNear + fSharpCY * 0.35,
                             fSharpTopX1, fCurY - fNewNear + fSharpCY * 0.25,
                             m_csKBSharp.dark, m_csKBSharp.dark, m_csKBSharp.primary, m_csKBSharp.primary);
                WGL.drawSkew(fSharpTopX1, fCurY - fNewNear + fSharpCY * 0.25,
                             fSharpTopX2, fCurY - fNewNear + fSharpCY * 0.35,
                             fSharpTopX2, fCurY - fNewNear + fSharpCY * 0.75,
                             fSharpTopX1, fCurY - fNewNear + fSharpCY * 0.65,
                             m_csKBSharp.primary, m_csKBSharp.primary, m_csKBSharp.veryDark, m_csKBSharp.veryDark);
            }

            // Web port: no missed/learn states, so the track color always wins
            // (C++ picks m_csKBBadNote here for missed/bad-learn notes).
            const csKBSharp = csTrack;
            WGL.drawSkew(fSharpTopX1, fCurY + fSharpCY - fNewNear,
                         fSharpTopX2, fCurY + fSharpCY - fNewNear,
                         x + cx, fCurY + fSharpCY, x, fCurY + fSharpCY,
                         csKBSharp.primary | iAlpha, csKBSharp.primary | iAlpha, csKBSharp.dark | iAlpha, csKBSharp.dark | iAlpha);
            WGL.drawSkew(fSharpTopX1, fCurY - fNewNear,
                         fSharpTopX1, fCurY + fSharpCY - fNewNear,
                         x, fCurY + fSharpCY, x, fCurY,
                         csKBSharp.primary | iAlpha, csKBSharp.primary | iAlpha, csKBSharp.dark | iAlpha, csKBSharp.dark | iAlpha);
            WGL.drawSkew(fSharpTopX2, fCurY + fSharpCY - fNewNear,
                         fSharpTopX2, fCurY - fNewNear,
                         x + cx, fCurY, x + cx, fCurY + fSharpCY,
                         csKBSharp.primary | iAlpha, csKBSharp.primary | iAlpha, csKBSharp.dark | iAlpha, csKBSharp.dark | iAlpha);
            WGL.drawRect(fSharpTopX1, fCurY - fNewNear, fSharpTopX2 - fSharpTopX1, fSharpCY, csKBSharp.dark | iAlpha, csKBSharp.dark | iAlpha, csKBSharp.dark | iAlpha, csKBSharp.dark | iAlpha);
            WGL.drawSkew(fSharpTopX1, fCurY - fNewNear,
                         fSharpTopX2, fCurY - fNewNear,
                         fSharpTopX2, fCurY - fNewNear + fSharpCY * 0.35,
                         fSharpTopX1, fCurY - fNewNear + fSharpCY * 0.25,
                         csKBSharp.primary | iAlpha, csKBSharp.primary | iAlpha, csKBSharp.primary | iAlpha, csKBSharp.primary | iAlpha);
            WGL.drawSkew(fSharpTopX1, fCurY - fNewNear + fSharpCY * 0.25,
                         fSharpTopX2, fCurY - fNewNear + fSharpCY * 0.35,
                         fSharpTopX2, fCurY - fNewNear + fSharpCY * 0.75,
                         fSharpTopX1, fCurY - fNewNear + fSharpCY * 0.65,
                         csKBSharp.primary | iAlpha, csKBSharp.primary | iAlpha, csKBSharp.dark | iAlpha, csKBSharp.dark | iAlpha);
        }
    }
    WGL.flushRects();
}

export { drawKeyboard, getKeyboardLayout, getNotesCY, getKeysY, KB, pressedColor,
         Note, C4, A0, C8, isSharp, whiteCount };
