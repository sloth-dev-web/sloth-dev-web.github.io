// Render.js — notes and everything else (note quads, background grid,
// measure lines). Relocated from webgl.js; piano keyboard lives in Renderer.js.
import { settings } from './settings.js';
import { SharpRatio, KeyMap, keyToMidi, isSharp, whiteCount, getNoteX, makeTrackColor, channelColors } from './piano-constants.js';
import { WGL, WinW, WinH, KeyX, KeyWidth,
         m_iStartNote, m_iEndNote, m_fWhiteCX,
         getBackgroundColor, getBackgroundDarkColor, getBackgroundVeryDarkColor } from './webgl.js';
import { getNotesCY, KB } from './Renderer.js';

// Track colors repeat constantly (16 channel colors + layer tints), so cache
// the HSV round-trip instead of recomputing it per note per frame.
const trackColorCache = new Map();
function cachedTrackColor(rgb) {
    const key = rgb & 0xFFFFFF;
    let cs = trackColorCache.get(key);
    if (!cs) {
        cs = makeTrackColor(key);
        if (trackColorCache.size > 1024) trackColorCache.clear();
        trackColorCache.set(key, cs);
    }
    return cs;
}

// Measure-grid tempo scan cursor. Song time moves forward monotonically, so
// resume from the last position instead of scanning from event 0 every frame.
// Resets on seek-backwards or when a different song is loaded.
let gridCursor = 0;
let gridCursorTime = -1;
let gridCursorEvents = null;
let gridTempoState = null;

// Exact port of MainScreen::RenderNotes + RenderNote from GameState.cpp.
//
// renderNotes(notes, view, mouse):
//   view = { startTimeMs, timeSpanMs, notesY, notesCY, whiteCX, alpha,
//            paused, minTimeMs, glowStrength }.
//   Positions come straight from event times like C++ (y from llNoteStart,
//   cy from duration) instead of the caller integrating pixels per frame.
//   Whites render before sharps, currently-sounding (keyPressed) notes before
//   the rest within each pass, exactly like the m_vState / window split.
// renderNote(n, v, mouse):
//   single flat alpha, deflate from the WHITE key width clamped to [1,3],
//   floor rounding, +/-5 clipping, hover highlight, pre-min-time outline,
//   missed/input-quality grey. Hidden channels return early (no producer sets
//   n.hidden in the web port; the branch is kept for structure).
// Web extensions kept: glow underlay for procedural layers, per-note input
// color preparation (opacity tint for ghost layers), fadeAlpha carried as the
// flat alpha (same mechanism as m_iNotesAlpha).
let hotNote = null;

function baseNoteColor(n) {
    let c = n.renderColor != null ? n.renderColor : (n.channel != null ? channelColors[n.channel % channelColors.length] : n.color);
    if (n.opacity != null && n.opacity < 1) {
        // Stays in RGB order: this feeds makeTrackColor below, which reads
        // red from the high byte. (Building ABGR here instead is what used
        // to flip tinted notes red<->blue versus their keys.)
        const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
        const op = Math.max(0.15, Math.min(1, n.opacity));
        c = 0xFF000000 | (((r * op) | 0) << 16) | (((g * op) | 0) << 8) | ((b * op) | 0);
    }
    return c;
}

function renderNote(n, v, mouse) {
    const j = KeyMap[n.k];
    const midi = keyToMidi(n.k);
    const sharp = isSharp(midi);
    const startMs = (n.eventTime != null ? n.eventTime : n.hitTime);
    if (startMs == null) return;
    const endMs = startMs + (n.durationMs || 0);

    if (n.hidden) return;
    const badLearn = false;
    const missed = n.quality === 'missed';

    // Compute true positions.
    const x = KeyX[j] + (n.laneOffset || 0);
    const cx = KeyWidth[j];
    let y, cy0;
    if (n.freeplay) {
        y = n.yb;
        cy0 = n.yb - n.ye;
    } else {
        y = v.notesY + v.notesCY * (1.0 - (startMs - v.rndStart) / v.span);
        cy0 = v.notesCY * ((endMs - startMs) / v.span);
    }
    const fDeflate0 = v.whiteCX * 0.15 / 2.0;

    // Rounding to make everything consistent (constant cy across rendering).
    let cy = Math.floor(cy0 + 0.5);
    let yy = Math.floor(y + 0.5);
    let fDeflate = Math.floor(fDeflate0 + 0.5);
    fDeflate = Math.max(1, Math.min(3, fDeflate));

    // Clipping :/
    const fMinY = v.notesY - 5.0;
    const fMaxY = v.notesY + v.notesCY + 5.0;
    if (yy > fMaxY) {
        cy -= (yy - fMaxY);
        yy = fMaxY;
    }
    if (yy - cy < fMinY) {
        cy -= (fMinY - (yy - cy));
        yy = fMinY + cy;
    }
    if (cy <= 0) return;
    const yTop = yy - cy;

    if (mouse && mouse.x >= x && mouse.x <= x + cx &&
        mouse.y <= yy && mouse.y >= yTop)
        nextHotNote = n;

    // Colors after culling: fully-clipped notes above/below return before any
    // HSV work. Track color via the exact ChannelSettings::SetColor factors.
    const csTrack = cachedTrackColor(baseNoteColor(n));
    const cs = (missed || badLearn)
        ? { primary: KB.kbBadNote.primary, dark: KB.kbBadNote.dark, veryDark: KB.kbBadNote.veryDark }
        : csTrack;

    // C++ notes carry a single flat alpha; stored channel colors have zero
    // alpha so it is OR-ed in. Mask here for the same reason.
    const iA = ((Math.max(0, Math.min(255, Math.round(v.alpha))) << 24) >>> 0);
    const withA = (col) => (((col & 0x00FFFFFF) | iA) >>> 0);

    // Web-extension glow, drawn from the same rounded geometry.
    const gs = v.glowStrength;
    const layerType = n.layerType;
    const hasGlow = (layerType && (layerType.indexOf('gliss') >= 0 || layerType.indexOf('lane') >= 0 || layerType.indexOf('decor') >= 0 || layerType.indexOf('density') >= 0)) || (gs > 0.2 && layerType);
    if (hasGlow) {
        const c = baseNoteColor(n);
        const gr = ((c >> 16) & 0xFF) * 0.3 | 0;
        const gg = ((c >> 8) & 0xFF) * 0.3 | 0;
        const gb = (c & 0xFF) * 0.3 | 0;
        const glowC = 0xFF000000 | (gb << 16) | (gg << 8) | gr;
        const gw = cx * 1.25, gx = x - (gw - cx) * 0.5;
        WGL.drawRect(gx, yTop - 1, gw, cy + 2, glowC, glowC, glowC, glowC);
    }

    const hot = v.paused && mouse && n === hotNote;
    if (hot) {
        WGL.drawRect(x, yTop, cx, cy, withA(cs.primary), withA(cs.primary), withA(cs.primary), withA(cs.primary));
        if (cy - fDeflate * 2 > 0 && cx - fDeflate * 2 > 0)
            WGL.drawRect(x + fDeflate, yTop + fDeflate, cx - fDeflate * 2, cy - fDeflate * 2,
                withA(cs.veryDark), withA(cs.dark), withA(cs.dark), withA(cs.veryDark));
    } else if (startMs < v.minTimeMs && !badLearn) {
        WGL.drawRect(x, yTop, fDeflate, cy, withA(cs.veryDark), withA(cs.veryDark), withA(cs.veryDark), withA(cs.veryDark));
        WGL.drawRect(x, yTop, cx, fDeflate, withA(cs.veryDark), withA(cs.veryDark), withA(cs.veryDark), withA(cs.veryDark));
        WGL.drawRect(x + cx - fDeflate, yTop, fDeflate, cy, withA(cs.veryDark), withA(cs.veryDark), withA(cs.veryDark), withA(cs.veryDark));
        WGL.drawRect(x, yy - fDeflate, cx, fDeflate, withA(cs.veryDark), withA(cs.veryDark), withA(cs.veryDark), withA(cs.veryDark));
    } else {
        WGL.drawRect(x, yTop, cx, cy, withA(cs.veryDark), withA(cs.veryDark), withA(cs.veryDark), withA(cs.veryDark));
        if (cy - fDeflate * 2 > 0 && cx - fDeflate * 2 > 0)
            WGL.drawRect(x + fDeflate, yTop + fDeflate, cx - fDeflate * 2, cy - fDeflate * 2,
                withA(cs.primary), withA(cs.dark), withA(cs.dark), withA(cs.primary));
    }
}

let nextHotNote = null;

function renderNotes(notes, view, mouse) {
    const span = Math.max(1e-6, view.timeSpanMs);
    // Round down start time (rendering purposes only), truncating like C++.
    const msPP = span / view.notesCY;
    let rndStart = view.startTimeMs - (view.startTimeMs < 0 ? msPP : 0);
    rndStart = Math.trunc(rndStart / msPP) * msPP;
    const v = {
        span, rndStart,
        notesY: view.notesY, notesCY: view.notesCY, whiteCX: view.whiteCX,
        alpha: view.alpha, paused: !!view.paused,
        minTimeMs: (view.minTimeMs != null ? view.minTimeMs : 0),
        glowStrength: view.glowStrength
    };
    const haveMouse = !!(mouse && mouse.inside);
    const m = haveMouse ? mouse : null;

    const sounding = [];
    const upcoming = [];
    for (const n of notes) {
        if (!n || !n.active) continue;
        (n.keyPressed ? sounding : upcoming).push(n);
    }

    let hasSharp = false;
    const drawWhite = (n) => {
        if (isSharp(keyToMidi(n.k))) { hasSharp = true; return; }
        renderNote(n, v, m);
    };
    for (const n of sounding) drawWhite(n);
    for (const n of upcoming) drawWhite(n);

    if (hasSharp) {
        const drawSharp = (n) => {
            if (isSharp(keyToMidi(n.k))) renderNote(n, v, m);
        };
        for (const n of sounding) drawSharp(n);
        for (const n of upcoming) drawSharp(n);
    }

    hotNote = nextHotNote;
    nextHotNote = null;
}

function drawGrid() {
    const notesCY = getNotesCY();
    const notesY = 0;
    const primary = getBackgroundColor();
    WGL.drawRect(0, notesY, WinW, notesCY, primary, primary, primary, primary);
    if (!settings.get('showGrid')) return;
    const dark  = getBackgroundDarkColor();
    const vdark = getBackgroundVeryDarkColor();
    // Fixed thickness: normal 3px on PC/laptop, small on phones.
    const isPhone = /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent || '') ||
        (('ontouchstart' in window || navigator.maxTouchPoints > 0) && Math.min(window.innerWidth, window.innerHeight) < 600);
    const fLineCX = isPhone ? 2 : 3;
    for (let i = m_iStartNote + 1; i <= m_iEndNote; i++) {
        if (!isSharp(i - 1) && !isSharp(i)) {
            // Exact port of RenderLines: x comes from GetNoteX, rounded for the gradient.
            let x = getNoteX(i, m_iStartNote, m_fWhiteCX, 0);
            x = Math.floor(x + 0.5);
            WGL.drawRect(x - 1.0, notesY, fLineCX, notesCY, dark, vdark, vdark, dark);
        }
    }
}

function drawMeasureGrid(midiPlayer) {
    if (!midiPlayer || !midiPlayer.allEvents || midiPlayer.allEvents.length === 0) return;
    const notesCY = getNotesCY();
    const notesY = 0;
    const division = midiPlayer.division || 480;
    if (division & 0x8000) return;
    const currentTimeMs = midiPlayer.isPlaying
        ? (performance.now() - midiPlayer.startTimestamp)
        : midiPlayer.currentTime;
    const pxPerMs = settings.get('noteSpeed') / 8;
    const visibleMs = Math.max(1, notesCY / pxPerMs);
    const bottomTimeMs = currentTimeMs, topTimeMs = currentTimeMs + visibleMs;

    const events = midiPlayer.allEvents;
    if (events !== gridCursorEvents || bottomTimeMs < gridCursorTime) {
        gridCursor = 0;
        gridCursorEvents = events;
        gridTempoState = null;
    }
    gridCursorTime = bottomTimeMs;
    let iMicroSecsPerBeat = 500000;
    let iBeatsPerMeasure = 4;
    let iBeatType = 4;
    let iLastTempoTick = 0;
    let llLastTempoTime = 0;
    let iLastSignatureTick = 0;
    if (gridTempoState) {
        iMicroSecsPerBeat = gridTempoState.iMicroSecsPerBeat;
        iBeatsPerMeasure = gridTempoState.iBeatsPerMeasure;
        iBeatType = gridTempoState.iBeatType;
        iLastTempoTick = gridTempoState.iLastTempoTick;
        llLastTempoTime = gridTempoState.llLastTempoTime;
        iLastSignatureTick = gridTempoState.iLastSignatureTick;
    }
    for (let i = gridCursor; i < events.length; i++) {
        const ev = events[i];
        const evMs = ev.absMs != null ? ev.absMs : midiPlayer.getTimeForTick(ev.time);
        if (evMs > bottomTimeMs) break;
        gridCursor = i + 1;
        if (ev.type === 'tempo') {
            iMicroSecsPerBeat = ev.tempo || iMicroSecsPerBeat;
            iLastTempoTick = ev.time;
            llLastTempoTime = evMs;
        } else if (ev.type === 'timeSignature') {
            iBeatsPerMeasure = ev.numerator || 4;
            iBeatType = ev.denominator || 4;
            iLastSignatureTick = ev.time;
        }
    }
    gridTempoState = { iMicroSecsPerBeat, iBeatsPerMeasure, iBeatType, iLastTempoTick, llLastTempoTime, iLastSignatureTick };
    if (iBeatType <= 0) iBeatType = 4;

    const lineDark  = getBackgroundDarkColor();
    const lineVDark = getBackgroundVeryDarkColor();

    const ticksPerMs = division / (iMicroSecsPerBeat / 1000.0);
    const ticksPerMeasure = iBeatsPerMeasure * (division * 4 / iBeatType);

    let measureTick = Math.max(0, Math.floor(bottomTimeMs * ticksPerMs) - ticksPerMeasure);
    measureTick = Math.floor(measureTick / ticksPerMeasure) * ticksPerMeasure;

    let safety = 0;
    while (safety < 4096) {
        const measureTimeMs = getTickTime(measureTick, iLastTempoTick, llLastTempoTime, iMicroSecsPerBeat, division);
        if (measureTimeMs > topTimeMs) break;

        if (measureTimeMs >= bottomTimeMs - 50) {
            const y = notesCY * (1.0 - (measureTimeMs - bottomTimeMs) / visibleMs);
            if (y + 1 > notesY) {
                const yR = Math.floor(y + 0.5);
                WGL.drawRect(0, yR - 1, WinW, 3, lineDark, lineDark, lineVDark, lineVDark);
            }
        }

        measureTick += ticksPerMeasure;
        safety++;
    }
}

function getTickTime(iTick, iLastTempoTick, llLastTempoTime, iMicroSecsPerBeat, iDivision) {
    if (iDivision & 0x8000) return -1;
    // µs → ms so the result matches absMs / player time (was 1000× off).
    return llLastTempoTime + (iMicroSecsPerBeat * (iTick - iLastTempoTick)) / iDivision / 1000;
}

export { renderNotes, renderNote, drawGrid, drawMeasureGrid, getTickTime };
