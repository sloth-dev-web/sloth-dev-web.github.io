import { settings } from './settings.js';
import { sfxManager } from './sound-effects.js';
import { ensureAudio, resumeAudioSilently, audioContext } from './audio-engine.js';
import { WGL, resize, getBackgroundColor, WinW, WinH, canvas } from './webgl.js';
import { drawKeyboard, getNotesCY } from './Renderer.js';
import { drawGrid, drawMeasureGrid } from './Render.js';
import { triggerKey, releaseKey, hitKey } from './keyboard.js';
import { midiToKey } from './piano-constants.js';
import { midiPlayer } from './midi-player.js';
import { updateLiveNotes, spawnLiveNote, releaseFreeNote } from './note-simulation.js';
import { setupSettingsUI, updateMIDIPlayerUI, openSettingsPanel } from './ui.js';

// Render state
let frameCount = 0, lastFpsTime = 0, currentFps = 0, lastFrameTime = 0;
let bZoomMove = false, bInstructions = false, iShowTop10 = -1;
let eGameMode = 'practice';

// Keyboard/mouse input
const pianoInputEnabled = true;
let held = new Set();

// Computer-keyboard piano: 46 chromatic keys from the digit row down to , . /
// (plus - = [ ] ; ' and backslash). Uses e.code so physical key positions
// work on any layout. Base MIDI note C2; top key lands on A5.
const PIANO_KEY_BASE = 36;
const PIANO_KEY_CODES = [
    'Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Minus','Equal',
    'KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP','BracketLeft','BracketRight',
    'KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon','Quote',
    'KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash',
    'Backslash',
];
const keyHeldByCode = new Map();

function pianoKeyIndex(code, sharp = false) {
    const i = PIANO_KEY_CODES.indexOf(code);
    if (i < 0) return -1;
    return midiToKey(PIANO_KEY_BASE + i + (sharp ? 1 : 0));
}

function isTypingTarget(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

// C++ m_ptLastPos / m_bHaveMouse: last mouse position over the canvas for the
// RenderNote hot-note test (hover highlight while paused).
const mouseState = { x: 0, y: 0, inside: false };

// Free-play notes: live key presses also spawn a falling visual note so free
// playing shows notes even with no song loaded. Visual-only: never triggers
// keys or sound by itself.
function spawnFreeNote(k, velocity, channel = 0) {
    if (k < 0 || k >= 256) return;
    const now = (midiPlayer && midiPlayer.currentTime) || 0;
    spawnLiveNote(k, velocity, now, now, 150, channel,
        { visualOnly: true, freeplay: true, layerType: 'freeplay', opacity: 0.9 }, midiPlayer);
}

// ============ TEXT OVERLAYS ============
// Exact port of MainScreen::RenderText / RenderStatus / RenderMessage /
// RenderTop10 from GameState.cpp, mapped onto DOM overlays:
// - status box: top-right, 156px wide, 0x80000000 background, 16px row rhythm,
//   white text with the 0xFF404040 shadow drawn first at offset (+2,+1)
//   (here as text-shadow:2px 1px 0 #404040).
// - message box: 200px tall, centered in the note area, 0x40000000 background,
//   shadow at (+2,+2). Practice instructions intentionally show nothing,
//   matching C++ (no branch handles Practice).
// - top10 table: exact column widths, divider and highlight rows; only shown
//   when iShowTop10 >= 0, which never happens (score system disabled).
function fmtClock(ms) {
    const neg = ms < 0;
    ms = Math.abs(ms);
    return (neg ? '-' : '') + Math.floor(ms / 60000) + ':' + ((ms % 60000) / 1000).toFixed(1).padStart(4, '0');
}

function renderTop10HTML(rows, highlight) {
    const colWidths = [35, 80, 50, 55, 55, 55, 55, 80];
    const headers = ['Rank', 'Score', 'Pct', 'Streak', 'Great', 'Good', 'OK', 'Date'];
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    let msg = "You didn't make it. Practice!";
    if (highlight < 1 && rows.length > 1) msg = 'First place! Awesome!';
    else if (highlight < 3 && rows.length > 3) msg = 'You made the top 3! Congratulations!';
    else if (highlight < 10 && (rows.length > highlight + 1 || highlight === 9 || highlight === 0)) msg = 'You made the top 10!';
    else if (highlight < 10) msg = 'Last place...';
    let html = '<div style="text-align:center;font-size:22px;color:#fff;text-shadow:2px 2px 0 #404040;">Top 10</div>';
    html += '<div style="text-align:center;font-size:11px;color:#FF73FF;text-shadow:1px 1px 0 #000;margin:19px 0 0;">' + msg + '</div>';
    html += '<div style="display:flex;width:' + totalW + 'px;margin:20px auto 0;">';
    headers.forEach((h, i) => {
        html += '<div style="width:' + colWidths[i] + 'px;text-align:center;color:#fff;text-shadow:1px 1px 0 #404040;">' + h + '</div>';
    });
    html += '</div>';
    rows.forEach((r, ri) => {
        const sel = ri === highlight;
        const fg = sel ? '#000' : '#fff';
        const sh = sel ? '#fff' : '#404040';
        html += '<div style="display:flex;width:' + totalW + 'px;margin:0 auto;' + (sel ? 'background:rgba(0,102,255,0.4);' : '') + '">';
        r.forEach((cell, ci) => {
            html += '<div style="width:' + colWidths[ci] + 'px;text-align:center;color:' + fg + ';text-shadow:1px 1px 0 ' + sh + ';line-height:16px;">' + cell + '</div>';
        });
        html += '</div>';
    });
    return html;
}

function updateTextOverlays(now) {
    const statusEl = document.getElementById('statusOverlay');
    const msgEl = document.getElementById('messageOverlay');
    const top10El = document.getElementById('top10Overlay');
    if (!statusEl) return;

    const rowStyle = 'display:flex;justify-content:space-between;line-height:16px;color:#fff;text-shadow:2px 1px 0 #404040;white-space:nowrap;';
    let html = '';

    let timeStr = '--:-- / --:--';
    if (midiPlayer && midiPlayer.isLoaded) {
        timeStr = fmtClock(midiPlayer.currentTime || 0) + ' / ' + fmtClock(midiPlayer.duration || 0);
    }
    html += '<div style="' + rowStyle + '"><span>Time:</span><span>' + timeStr + '</span></div>';
    html += '<div style="' + rowStyle + '"><span>FPS:</span><span>' + currentFps.toFixed(1) + '</span></div>';

    if (eGameMode === 'learn') {
        html += '<div style="' + rowStyle + '"><span>Learning:</span><span>All Tracks</span></div>';
        html += '<div style="' + rowStyle + '"><span></span><span>Waiting</span></div>';
    } else {
        // Web port has no MIDI scoring device open, so Score is always N/A and
        // the multiplier line never appears (exact C++ behavior for that state).
        html += '<div style="' + rowStyle + '"><span>Score:</span><span>N/A</span></div>';
    }

    // DOM writes every frame force style/layout recalc; only touch the DOM
    // when something actually changed (time ticks at 10Hz while playing,
    // otherwise the overlay is static).
    if (html !== lastStatusHTML) {
        statusEl.innerHTML = html;
        lastStatusHTML = html;
    }
    if (statusEl.style.display !== 'block') statusEl.style.display = 'block';

    let msgText = '';
    if (bZoomMove) {
        msgText = '- Left-click and drag to move the screen\n- Right-click and drag to zoom horizontally\n- Press Escape to abort changes\n- Press Ctrl+V to save changes';
    } else if (bInstructions && eGameMode === 'play') {
        msgText = 'You will be scored. Good luck.\n\nPlay any note when ready.';
    } else if (bInstructions && eGameMode === 'learn') {
        msgText = 'This mode will teach you a song, one track at a time.\nIn Adaptive mode, poorly played sections repeat at a slower rate.\nIn Waiting mode, notes will pause and wait to be played.\n\nPlay any note when ready.';
    }

    if (msgText) {
        // C++ rcMsg: 200px tall centered in the note area, 0x40000000 background.
        const msgTop = (getNotesCY() / 2) + 'px';
        if (msgEl.style.top !== msgTop) msgEl.style.top = msgTop;
        if (msgText !== lastMsgText) {
            msgEl.textContent = msgText;
            lastMsgText = msgText;
        }
        if (msgEl.style.display !== 'block') msgEl.style.display = 'block';
    } else {
        if (lastMsgText !== '') lastMsgText = '';
        if (msgEl.style.display !== 'none') msgEl.style.display = 'none';
    }

    if (iShowTop10 >= 0) {
        if (lastTop10Key !== iShowTop10) {
            top10El.innerHTML = renderTop10HTML([], iShowTop10);
            lastTop10Key = iShowTop10;
        }
        if (top10El.style.display !== 'block') top10El.style.display = 'block';
    } else {
        if (lastTop10Key !== -1) lastTop10Key = -1;
        if (top10El.style.display !== 'none') top10El.style.display = 'none';
    }
}

let lastStatusHTML = null;
let lastMsgText = null;
let lastTop10Key = -2;

// ============ RENDER LOOP ============
function render(now = performance.now()){
    lastFrameTime = now;

    if (midiPlayer && typeof midiPlayer.update === 'function' && midiPlayer.isPlaying) midiPlayer.update(now);
    if(WGL.enabled){
        WGL.clear(0, 0, 0);
        const bg = getBackgroundColor();
        WGL.drawRect(0, 0, WinW, getNotesCY(), bg, bg, bg, bg);
        if (settings.get('showGrid')) {
            drawGrid();
            if (midiPlayer && midiPlayer.allEvents && midiPlayer.allEvents.length > 0) {
                drawMeasureGrid(midiPlayer);
            }
        }
        WGL.flushRects();
        updateLiveNotes(midiPlayer, now, mouseState);
        drawKeyboard();
        WGL.flushRects();
    }
    frameCount++;
    if (now - lastFpsTime >= 500) {
        currentFps = frameCount / ((now - lastFpsTime) / 1000);
        frameCount = 0;
        lastFpsTime = now;
    }

    updateTextOverlays(now);

    requestAnimationFrame(render);
}

// ============ INIT ============
WGL.init();

// User gesture → audio
['pointerdown', 'keydown', 'touchstart'].forEach(type => {
    document.addEventListener(type, () => {
        if (!audioContext) ensureAudio().catch(() => {});
        else if (audioContext.state === 'suspended') resumeAudioSilently();
    }, { passive: true });
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && audioContext) {
        if (audioContext.state === 'suspended') resumeAudioSilently();
        if (!audioContext) ensureAudio().catch(() => {});
    }
});

window.addEventListener('resize', resize);

// Mouse events
canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouseState.x = e.clientX - r.left;
    mouseState.y = e.clientY - r.top;
    mouseState.inside = true;
});
canvas.addEventListener('mouseleave', () => { mouseState.inside = false; });
canvas.addEventListener('mousedown', async e => {
    await ensureAudio();
    if(!pianoInputEnabled) return;
    const r = canvas.getBoundingClientRect();
    const k = hitKey(e.clientX - r.left, e.clientY - r.top);
    if(k >= 0 && k < 256) { held.clear(); held.add(k); triggerKey(k, 127); spawnFreeNote(k, 127); }
});
window.addEventListener('mouseup', e => { for(const k of held) { releaseKey(k); releaseFreeNote(k); } held.clear(); });
canvas.addEventListener('mousemove', e => {
    if(!pianoInputEnabled) return;
    if(!e.buttons) return;
    const r = canvas.getBoundingClientRect();
    const k = hitKey(e.clientX - r.left, e.clientY - r.top);
    if(k >= 0 && k < 256) {
        if(!held.has(k)) { for(const h of held) { releaseKey(h); releaseFreeNote(h); } held.clear(); held.add(k); triggerKey(k, 127); spawnFreeNote(k, 127); }
    } else { for(const h of held) releaseKey(h); held.clear(); }
});

// Touch events
canvas.addEventListener('touchstart', async e => {
    await ensureAudio();
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    Array.from(e.changedTouches).forEach(t => {
        const k = hitKey(t.clientX - r.left, t.clientY - r.top);
        if(k >= 0 && k < 256) { if(!held.has(k)) { held.clear(); held.add(k); triggerKey(k, 127); spawnFreeNote(k, 127); } }
    });
}, {passive:false});
canvas.addEventListener('touchend', e => { for(const k of held) { releaseKey(k); releaseFreeNote(k); } held.clear(); });
canvas.addEventListener('touchcancel', e => { for(const k of held) { releaseKey(k); releaseFreeNote(k); } held.clear(); });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    for(const t of e.touches) {
        const k = hitKey(t.clientX - r.left, t.clientY - r.top);
        if(k >= 0 && k < 256) {
            if(!held.has(k)) { for(const h of held) { releaseKey(h); releaseFreeNote(h); } held.clear(); held.add(k); triggerKey(k, 127); spawnFreeNote(k, 127); }
        }
    }
}, {passive:false});

// Keyboard events
document.addEventListener('keydown', async e => {
    // Space before ensureAudio(): pause must be instant; only resume waits
    // for the context so held-note re-fire has a running clock.
    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (midiPlayer && typeof midiPlayer.isPlaying !== 'undefined') {
            if (midiPlayer.isPlaying) {
                midiPlayer.pause();
            } else if (midiPlayer.isLoaded) {
                await ensureAudio();
                midiPlayer.play();
            }
        }
        return;
    }

    await ensureAudio();

    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const panel   = document.getElementById('settingsPanel');
        const overlay = document.getElementById('settingsOverlay');
        if (panel && overlay) {
            const isOpen = panel.classList.contains('active');
            if (isOpen) {
                panel.classList.remove('active');
                overlay.classList.remove('active');
                if (typeof sfxManager !== 'undefined') sfxManager.playUIClose();
            } else {
                panel.classList.add('active');
                overlay.classList.add('active');
                if (typeof sfxManager !== 'undefined') sfxManager.playUIOpen();
            }
        }
    }

    if (!e.repeat && !e.ctrlKey && !e.metaKey && !isTypingTarget(e.target) && pianoInputEnabled) {
        const pk = pianoKeyIndex(e.code, e.shiftKey);
        if (pk >= 0 && pk < 256 && !keyHeldByCode.has(e.code)) {
            e.preventDefault();
            keyHeldByCode.set(e.code, pk);
            triggerKey(pk, 127);
            spawnFreeNote(pk, 127);
        }
    }

    if (midiPlayer && midiPlayer.isLoaded && (midiPlayer.duration || 0) > 0) {
        let delta = 0;
        if (e.key === 'ArrowLeft') {
            delta = e.ctrlKey ? -5000 : -3000;
        } else if (e.key === 'ArrowRight') {
            delta = e.ctrlKey ? 10000 : 5000;
        }
        if (delta !== 0) {
            e.preventDefault();
            const dur = midiPlayer.duration;
            let newTime = (midiPlayer.currentTime || 0) + delta;
            newTime = Math.max(0, Math.min(dur, newTime));
            const fraction = newTime / dur;
            midiPlayer.seek(fraction);
            if (typeof updateMIDIPlayerUI === 'function') updateMIDIPlayerUI();
        }
    }

    if (e.key.toLowerCase() === 'i') {
        bInstructions = !bInstructions;
    }
    if (e.key === 'Escape') {
        bZoomMove = false;
        bInstructions = false;
        iShowTop10 = -1;
    }

    if (e.altKey && e.key === 'Enter') {
        e.preventDefault();
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (err) {}
    }
});
document.addEventListener('keyup', e => {
    const pk = keyHeldByCode.get(e.code);
    if (pk !== undefined) {
        keyHeldByCode.delete(e.code);
        releaseKey(pk);
        releaseFreeNote(pk);
    }
});

// Two-finger gesture handlers
let twoFingerGesture = {
    active: false,
    startX: 0,
    startY: 0,
    triggered: false
};
const TWO_FINGER_MIN_DISTANCE = 60;
const TWO_FINGER_MAX_VERTICAL = 120;

document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 2) return;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const avgX = (t1.clientX + t2.clientX) / 2;
    const avgY = (t1.clientY + t2.clientY) / 2;
    if (avgX > window.innerWidth * 0.55) {
        twoFingerGesture.active = true;
        twoFingerGesture.startX = avgX;
        twoFingerGesture.startY = avgY;
        twoFingerGesture.triggered = false;
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!twoFingerGesture.active) return;
    if (twoFingerGesture.triggered) return;
    if (e.touches.length !== 2) return;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const avgX = (t1.clientX + t2.clientX) / 2;
    const avgY = (t1.clientY + t2.clientY) / 2;
    const deltaX = avgX - twoFingerGesture.startX;
    const deltaY = Math.abs(avgY - twoFingerGesture.startY);
    if (deltaX < -TWO_FINGER_MIN_DISTANCE && deltaY < TWO_FINGER_MAX_VERTICAL) {
        e.preventDefault();
        twoFingerGesture.triggered = true;
        openSettingsPanel();
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        twoFingerGesture.active = false;
    }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    const panel = document.getElementById('settingsPanel');
    if (!panel.classList.contains('active')) return;
    if (!twoFingerGesture.active) return;
    if (twoFingerGesture.triggered) return;
    if (e.touches.length !== 2) return;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const avgX = (t1.clientX + t2.clientX) / 2;
    const avgY = (t1.clientY + t2.clientY) / 2;
    const deltaX = avgX - twoFingerGesture.startX;
    const deltaY = Math.abs(avgY - twoFingerGesture.startY);
    if (deltaX > TWO_FINGER_MIN_DISTANCE && deltaY < TWO_FINGER_MAX_VERTICAL) {
        e.preventDefault();
        twoFingerGesture.triggered = true;
        panel.classList.remove('active');
        document.getElementById('settingsOverlay').classList.remove('active');
        try { sfxManager.playUIClose(); } catch(e) {}
    }
}, { passive: false });

// Start
resize();
setupSettingsUI();
render();
