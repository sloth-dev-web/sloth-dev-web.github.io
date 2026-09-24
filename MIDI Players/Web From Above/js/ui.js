import { settings, SCHEMA } from './settings.js';
import { sfxManager } from './sound-effects.js';
import { t, loadLanguage, updateLangButton, toggleLangDropdown, langDropdownVisible } from './i18n.js';
import { midiManager, updateMIDIStatus, updateMIDIDeviceList } from './midi-manager.js';
import { midiOutSelect, midiOutScan, midiOutRefreshSoundFontState } from './midi-out.js';
import { setNoteRange } from './webgl.js';
import { midiPlayer } from './midi-player.js';
import { ensureAudio, resumeAudioSilently, applyAudioLimiterSettings, updateAudioGain, audioContext } from './audio-engine.js';
import { showErrorPopup } from './sound-effects.js';

// Builds the whole settings panel from the settings schema: one nav entry
// and one page per section, one control row per schema setting. Custom
// sections (midi/files/system) get hand-built cards with stable element ids.
function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
}

// Translated text with English fallback; sets data-i18n so switching language
// later re-translates the element via applyTranslations().
function tx(parent, key, fallback) {
    const s = el('span', '');
    let text = fallback;
    try {
        const v = t(key);
        if (v && v !== key) text = v;
    } catch (e) {}
    s.textContent = text;
    s.setAttribute('data-i18n', key);
    parent.appendChild(s);
    return s;
}

function buildControl(def) {
    const row = el('div', 'setting-row');
    const top = el('div', 'setting-row-top');
    const label = el('span', 'setting-label');
    if (def.i18n) {
        let text = def.label;
        try {
            const v = t(def.i18n);
            if (v && v !== def.i18n) text = v;
        } catch (e) {}
        label.textContent = text;
        label.setAttribute('data-i18n', def.i18n);
    } else {
        label.textContent = def.label;
    }
    top.appendChild(label);

    if (def.type === 'range') {
        const badge = el('span', 'setting-badge', def.format(settings.get(def.key)));
        top.appendChild(badge);
        row.appendChild(top);
        const input = document.createElement('input');
        input.type = 'range';
        input.min = def.min; input.max = def.max; input.step = def.step;
        input.value = settings.get(def.key);
        input.setAttribute('aria-label', def.label);
        input.addEventListener('input', () => {
            settings.set(def.key, parseFloat(input.value));
            badge.textContent = def.format(settings.get(def.key));
        });
        settings.on(def.key, (v) => {
            input.value = v;
            badge.textContent = def.format(v);
        });
        row.appendChild(input);
    } else if (def.type === 'toggle') {
        const sw = el('label', 'switch');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!settings.get(def.key);
        input.setAttribute('aria-label', def.label);
        const track = el('span', 'track');
        sw.appendChild(input);
        sw.appendChild(track);
        top.appendChild(sw);
        row.appendChild(top);
        input.addEventListener('change', () => settings.set(def.key, input.checked));
        settings.on(def.key, (v) => { input.checked = !!v; });
    } else if (def.type === 'color') {
        row.appendChild(top);
        const wrap = el('div', 'color-row');
        const picker = document.createElement('input');
        picker.type = 'color';
        picker.value = settings.get(def.key);
        picker.setAttribute('aria-label', def.label);
        const text = document.createElement('input');
        text.type = 'text';
        text.value = settings.get(def.key);
        text.maxLength = 7;
        text.spellcheck = false;
        picker.addEventListener('input', () => {
            text.value = picker.value;
            settings.set(def.key, picker.value);
        });
        text.addEventListener('input', () => {
            if (/^#[0-9A-F]{6}$/i.test(text.value)) {
                picker.value = text.value;
                settings.set(def.key, text.value);
            }
        });
        settings.on(def.key, (v) => { picker.value = v; text.value = v; });
        wrap.appendChild(picker);
        wrap.appendChild(text);
        row.appendChild(wrap);
    } else if (def.type === 'select') {
        row.appendChild(top);
        const sel = document.createElement('select');
        (def.options || []).forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = opt.label;
            sel.appendChild(o);
        });
        sel.value = settings.get(def.key);
        sel.addEventListener('change', () => settings.set(def.key, sel.value));
        settings.on(def.key, (v) => { sel.value = v; });
        row.appendChild(sel);
    }

    if (def.hint || def.i18nHint) {
        const hint = el('div', 'settings-hint');
        if (def.i18nHint) {
            let text = def.hint;
            try {
                const v = t(def.i18nHint);
                if (v && v !== def.i18nHint) text = v;
            } catch (e) {}
            hint.textContent = text;
            hint.setAttribute('data-i18n', def.i18nHint);
        } else {
            hint.textContent = def.hint;
        }
        row.appendChild(hint);
    }
    return row;
}

function buildSchemaPage(section) {
    const page = el('div', 'settings-page');
    page.id = 'page-' + section.id;
    const card = el('div', 'settings-card');
    card.appendChild(el('div', 'settings-card-title', `<i class="${section.icon}"></i> ${section.title}`));
    const body = el('div', 'settings-card-body');
    for (const def of (section.settings || [])) body.appendChild(buildControl(def));
    card.appendChild(body);
    page.appendChild(card);
    return page;
}

function buildMidiPage() {
    const page = el('div', 'settings-page');
    page.id = 'page-midi';
    const card = el('div', 'settings-card');
    const midiTitle = el('div', 'settings-card-title', '<span class="status-indicator" id="midiStatus"></span> ');
    tx(midiTitle, 'midiInputDevices', 'midi input devices');
    card.appendChild(midiTitle);
    const body = el('div', 'settings-card-body');
    const sel = document.createElement('select');
    sel.id = 'midiDeviceSelect';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '-- no midi device --';
    sel.appendChild(opt);
    body.appendChild(sel);
    const list = el('div', '');
    list.id = 'midiDeviceList';
    body.appendChild(list);
    body.appendChild(el('div', 'settings-hint', 'playback and live input are mirrored to the output below.'));
    const outSel = document.createElement('select');
    outSel.id = 'midiOutputSelect';
    const outOpt = document.createElement('option');
    outOpt.value = '';
    outOpt.textContent = '-- no midi output --';
    outSel.appendChild(outOpt);
    outSel.style.marginTop = '8px';
    body.appendChild(outSel);
    const outList = el('div', '');
    outList.id = 'midiOutputList';
    body.appendChild(outList);
    const row = el('div', 'btn-row');
    const refresh = el('button', 'btn');
    refresh.id = 'refreshMidiBtn';
    tx(refresh, 'refreshDevices', 'refresh devices');
    row.appendChild(refresh);
    body.appendChild(row);
    const midiHint = el('div', 'settings-hint');
    tx(midiHint, 'midiInfo', 'click refresh to scan for midi devices.');
    body.appendChild(midiHint);
    card.appendChild(body);
    page.appendChild(card);
    return page;
}

function buildFilesPage() {
    const page = el('div', 'settings-page');
    page.id = 'page-files';

    const sf = el('div', 'settings-card');
    const sfTitle = el('div', 'settings-card-title', '<i class="fa-solid fa-file-audio"></i> ');
    tx(sfTitle, 'loadSoundFont', 'soundfont');
    sf.appendChild(sfTitle);
    const sfBody = el('div', 'settings-card-body');
    const sfBtn = el('button', 'btn btn-full');
    sfBtn.id = 'insertSoundFontBtn';
    tx(sfBtn, 'insertSoundFont', 'insert soundfont');
    sfBody.appendChild(sfBtn);
    const sfInput = document.createElement('input');
    sfInput.type = 'file';
    sfInput.id = 'soundFontFileInput';
    sfInput.accept = '.sf2,.sf3';
    sfInput.style.display = 'none';
    sfBody.appendChild(sfInput);
    const sfInfo = el('div', 'settings-hint');
    sfInfo.id = 'insertedSoundFontInfo';
    tx(sfInfo, 'soundFontInfo', 'using built-in soundfont (load .sf2/.sf3 to override)');
    sfBody.appendChild(sfInfo);
    sf.appendChild(sfBody);
    page.appendChild(sf);

    const mp = el('div', 'settings-card');
    const mpTitle = el('div', 'settings-card-title', '<i class="fa-solid fa-music"></i> ');
    tx(mpTitle, 'midiFilePlayer', 'midi file player');
    mp.appendChild(mpTitle);
    const mpBody = el('div', 'settings-card-body');
    const loadBtn = el('button', 'btn btn-full');
    loadBtn.id = 'loadMidiBtn';
    tx(loadBtn, 'loadMidiFile', 'load midi file');
    mpBody.appendChild(loadBtn);
    const midiInput = document.createElement('input');
    midiInput.type = 'file';
    midiInput.id = 'midiFileInput';
    midiInput.accept = '.mid,.midi,.smf,.MID,.MIDI,.SMF';
    midiInput.style.display = 'none';
    mpBody.appendChild(midiInput);
    const info = el('div', 'settings-hint');
    info.id = 'midiPlayerInfo';
    tx(info, 'noFileLoaded', 'no file loaded');
    mpBody.appendChild(info);
    const btnRow = el('div', 'midi-player-row');
    const playBtn = el('button', 'btn'); playBtn.id = 'midiPlayBtn';
    tx(playBtn, 'play', 'play');
    const pauseBtn = el('button', 'btn'); pauseBtn.id = 'midiPauseBtn';
    tx(pauseBtn, 'pause', 'pause');
    const stopBtn = el('button', 'btn'); stopBtn.id = 'midiStopBtn';
    tx(stopBtn, 'stop', 'stop');
    btnRow.appendChild(playBtn); btnRow.appendChild(pauseBtn); btnRow.appendChild(stopBtn);
    mpBody.appendChild(btnRow);
    const prog = el('div', 'midi-progress-box');
    const progRow = el('div', 'midi-progress-row');
    const cur = el('span', '', '0:00'); cur.id = 'midiCurrentTime';
    const dur = el('span', '', '0:00'); dur.id = 'midiDuration';
    progRow.appendChild(cur); progRow.appendChild(dur);
    prog.appendChild(progRow);
    const bar = document.createElement('input');
    bar.type = 'range'; bar.id = 'midiProgressBar';
    bar.min = '0'; bar.max = '100'; bar.value = '0';
    prog.appendChild(bar);
    mpBody.appendChild(prog);
    const midHint = el('div', 'settings-hint');
    tx(midHint, 'midInfo', 'supports standard midi/smf files (.mid, .midi, .smf).');
    mpBody.appendChild(midHint);
    mp.appendChild(mpBody);
    page.appendChild(mp);
    return page;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiNoteName(m) {
    return NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}

function fileNoteRange() {
    const evs = midiPlayer.allEvents;
    if (!evs || evs.length === 0) return null;
    let lo = 255, hi = 0, found = false;
    for (const ev of evs) {
        if (ev.type === 'noteOn' && ev.velocity > 0) {
            found = true;
            if (ev.note < lo) lo = ev.note;
            if (ev.note > hi) hi = ev.note;
        }
    }
    return found ? [lo, hi] : null;
}

function applyKeyRange() {
    const mode = settings.get('keyRangeMode');
    let lo, hi;
    if (mode === '88') { lo = 21; hi = 108; }
    else if (mode === '128') { lo = 0; hi = 127; }
    else if (mode === '256') { lo = 0; hi = 255; }
    else if (mode === 'midi') {
        const r = fileNoteRange();
        if (r) { lo = r[0]; hi = r[1]; }
        else { lo = 0; hi = 127; }
    } else {
        lo = settings.get('firstKey');
        hi = settings.get('lastKey');
    }
    if (mode === '88' || mode === '128' || mode === '256') {
        if (settings.get('firstKey') !== lo || settings.get('lastKey') !== hi) {
            settings.set('firstKey', lo, true);
            settings.set('lastKey', hi, true);
        }
    }
    setNoteRange(lo, hi);
    return [lo, hi];
}

function buildKeyboardPage() {
    const page = el('div', 'settings-page');
    page.id = 'page-keyboard';

    const range = el('div', 'settings-card');
    range.appendChild(el('div', 'settings-card-title', '<i class="fa-solid fa-left-right"></i> keyboard range'));
    const rangeBody = el('div', 'settings-card-body');

    const btnRow = el('div', 'btn-row');
    const modeBtns = {};
    const mkMode = (mode, label) => {
        const b = el('button', 'btn', label);
        b.addEventListener('click', () => {
            settings.set('keyRangeMode', mode);
            applyKeyRange();
            syncModeUI();
        });
        modeBtns[mode] = b;
        btnRow.appendChild(b);
    };
    mkMode('88', '88 keys');
    mkMode('128', '128 keys');
    mkMode('256', '256 keys');
    mkMode('midi', 'midi based');
    mkMode('custom', 'custom');
    rangeBody.appendChild(btnRow);

    const customBox = el('div', 'settings-custom-range');
    customBox.style.display = 'none';
    const mkRow = (labelText, key) => {
        const row = el('div', 'setting-row');
        const top = el('div', 'setting-row-top');
        top.appendChild(el('span', 'setting-label', labelText));
        row.appendChild(top);
        const sel = document.createElement('select');
        for (let m = 0; m < 256; m++) {
            const o = document.createElement('option');
            o.value = m;
            o.textContent = `${m}: ${midiNoteName(m)}`;
            sel.appendChild(o);
        }
        sel.value = settings.get(key);
        sel.addEventListener('change', () => {
            settings.set(key, parseInt(sel.value, 10));
            if (settings.get('keyRangeMode') === 'custom') applyKeyRange();
        });
        settings.on(key, (v) => { sel.value = v; });
        row.appendChild(sel);
        return row;
    };
    customBox.appendChild(mkRow('first key (left)', 'firstKey'));
    customBox.appendChild(mkRow('last key (right)', 'lastKey'));
    rangeBody.appendChild(customBox);

    rangeBody.appendChild(el('div', 'settings-hint', '88 is a real piano (a0–c8). midi based uses the notes in the loaded file. custom lets you pick first/last yourself. standard midi files only use 0–127; the extended slots show out-of-range notes instead of dropping them.'));
    range.appendChild(rangeBody);
    page.appendChild(range);

    function syncModeUI() {
        const mode = settings.get('keyRangeMode');
        for (const m of Object.keys(modeBtns)) {
            modeBtns[m].classList.toggle('active', m === mode);
        }
        customBox.style.display = mode === 'custom' ? '' : 'none';
    }
    settings.on('keyRangeMode', syncModeUI);
    syncModeUI();
    return page;
}

function buildSystemPage() {
    const page = el('div', 'settings-page');
    page.id = 'page-system';

    const lang = el('div', 'settings-card');
    lang.appendChild(el('div', 'settings-card-title', '<i class="fa-solid fa-globe"></i> language'));
    const langBody = el('div', 'settings-card-body');
    const langBtn = el('button', 'btn btn-full', 'change language (header button)');
    langBtn.addEventListener('click', () => {
        const hb = document.getElementById('langBtn');
        if (hb) hb.click();
    });
    langBody.appendChild(langBtn);
    lang.appendChild(langBody);
    page.appendChild(lang);

    const about = el('div', 'settings-card');
    const aboutTitle = el('div', 'settings-card-title', '<i class="fa-solid fa-circle-info"></i> ');
    tx(aboutTitle, 'information', 'about');
    about.appendChild(aboutTitle);
    const aboutBody = el('div', 'settings-card-body');
    const aboutText = el('div', 'settings-hint');
    aboutText.style.whiteSpace = 'pre-line';
    tx(aboutText, 'appInfo', 'web from above — piano from above, website version. a visual piano playing experience.');
    aboutBody.appendChild(aboutText);
    about.appendChild(aboutBody);
    page.appendChild(about);
    return page;
}

function buildPanel() {
    const panel = document.getElementById('settingsPanel');
    panel.innerHTML = '';

    const header = el('div', 'settings-header');
    const left = el('div', 'header-left');
    left.appendChild(el('span', '', '<i class="fa-solid fa-gear"></i>'));
    const title = el('h2', '', 'Settings');
    title.id = 'settingsTitle';
    left.appendChild(title);
    const langBtn = el('button', 'lang-btn', 'EN');
    langBtn.id = 'langBtn';
    langBtn.title = 'Change language';
    left.appendChild(langBtn);
    header.appendChild(left);
    const close = el('button', 'settings-close', '✕');
    close.id = 'settingsClose';
    header.appendChild(close);
    panel.appendChild(header);

    const dd = el('div', 'lang-dropdown');
    dd.id = 'langDropdown';
    panel.appendChild(dd);

    const body = el('div', 'settings-body');
    const nav = el('nav', 'settings-nav');
    const content = el('div', 'settings-content');

    SCHEMA.forEach((section, idx) => {
        const btn = el('button', 'settings-nav-btn' + (idx === 0 ? ' active' : ''));
        btn.innerHTML = `<i class="nav-icon ${section.icon}"></i><span class="nav-text">${section.title}</span>`;
        btn.addEventListener('click', () => {
            panel.querySelectorAll('.settings-nav-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            content.querySelectorAll('.settings-page').forEach((p) => p.classList.remove('active'));
            const pg = document.getElementById('page-' + section.id);
            if (pg) pg.classList.add('active');
        });
        nav.appendChild(btn);

        let page;
        if (section.id === 'midi') page = buildMidiPage();
        else if (section.id === 'files') page = buildFilesPage();
        else if (section.id === 'system') page = buildSystemPage();
        else if (section.id === 'keyboard') page = buildKeyboardPage();
        else page = buildSchemaPage(section);
        if (idx === 0) page.classList.add('active');
        content.appendChild(page);
    });

    body.appendChild(nav);
    body.appendChild(content);
    panel.appendChild(body);

    const footer = el('div', 'settings-footer');
    const resetBtn = el('button', 'btn'); resetBtn.id = 'resetSettingsBtn';
    tx(resetBtn, 'resetToDefaults', 'reset to defaults');
    const exportBtn = el('button', 'btn'); exportBtn.id = 'exportSettingsBtn';
    tx(exportBtn, 'export', 'export');
    const importBtn = el('button', 'btn'); importBtn.id = 'importSettingsBtn';
    tx(importBtn, 'import', 'import');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'settingsFileInput';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    footer.appendChild(resetBtn);
    footer.appendChild(exportBtn);
    footer.appendChild(importBtn);
    footer.appendChild(fileInput);
    panel.appendChild(footer);

    const grip = el('div', 'settings-resize-handle');
    panel.appendChild(grip);
}

function setupSettingsUI() {
    buildPanel();
    midiOutRefreshSoundFontState();
    applyKeyRange();

    const toggle  = document.getElementById('settingsToggle');
    const close   = document.getElementById('settingsClose');
    const panel   = document.getElementById('settingsPanel');
    const overlay = document.getElementById('settingsOverlay');
    if(!toggle || !close || !panel || !overlay) {
        console.warn('Settings UI elements not found');
        return;
    }

    const hidePanel = () => {
        if (panel.classList.contains('active') && typeof sfxManager !== 'undefined') sfxManager.playUIClose();
        panel.classList.remove('active');
        overlay.classList.remove('active');
        // Recenter next time it opens.
        panel.style.left = '';
        panel.style.top = '';
        panel.style.transform = '';
    };

    toggle.addEventListener('click', () => {
        const wasOpen = panel.classList.contains('active');
        if (wasOpen) {
            hidePanel();
        } else {
            panel.classList.add('active');
            overlay.classList.add('active');
            if (typeof sfxManager !== 'undefined') sfxManager.playUIOpen();
        }
    });

    if (close) {
        close.addEventListener('click', hidePanel);
    }

    if (overlay) {
        overlay.addEventListener('click', hidePanel);
    }

    // Drag the panel by its title bar.
    const header = panel.querySelector('.settings-header');
    let drag = null;
    if (header) {
        header.addEventListener('pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            if (e.target.closest('button')) return;
            const r = panel.getBoundingClientRect();
            panel.style.transform = 'none';
            panel.style.left = r.left + 'px';
            panel.style.top = r.top + 'px';
            drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
            try { header.setPointerCapture(e.pointerId); } catch (err) {}
            e.preventDefault();
        });
        header.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const w = panel.offsetWidth;
            const x = Math.max(-(w - 80), Math.min(window.innerWidth - 80, e.clientX - drag.dx));
            const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - drag.dy));
            panel.style.left = x + 'px';
            panel.style.top = y + 'px';
        });
        const endDrag = () => { drag = null; };
        header.addEventListener('pointerup', endDrag);
        header.addEventListener('pointercancel', endDrag);
    }

    // Resize the panel by its bottom-right grip.
    const grip = panel.querySelector('.settings-resize-handle');
    let sizing = null;
    if (grip) {
        grip.addEventListener('pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            const r = panel.getBoundingClientRect();
            sizing = { startX: e.clientX, startY: e.clientY, startW: r.width, startH: r.height };
            // Pin current size so flex content stops driving the height mid-drag.
            panel.style.width = r.width + 'px';
            panel.style.height = r.height + 'px';
            try { grip.setPointerCapture(e.pointerId); } catch (err) {}
            e.preventDefault();
            e.stopPropagation();
        });
        grip.addEventListener('pointermove', (e) => {
            if (!sizing) return;
            const w = Math.max(320, Math.min(window.innerWidth * 0.94, sizing.startW + e.clientX - sizing.startX));
            const h = Math.max(220, Math.min(window.innerHeight * 0.88, sizing.startH + e.clientY - sizing.startY));
            panel.style.width = w + 'px';
            panel.style.height = h + 'px';
        });
        const endSize = () => { sizing = null; };
        grip.addEventListener('pointerup', endSize);
        grip.addEventListener('pointercancel', endSize);
    }

    const langBtnEl = document.getElementById('langBtn');
    const langDdEl  = document.getElementById('langDropdown');
    if (langBtnEl) langBtnEl.addEventListener('click', (e) => { e.stopPropagation(); toggleLangDropdown(); });
    document.addEventListener('click', (e) => {
        if (langDdEl && !langDdEl.contains(e.target) && e.target !== langBtnEl) {
            langDdEl.classList.remove('visible'); langDropdownVisible.value = false;
        }
    });
    const savedLang = settings.get('language') || 'en';
    updateLangButton(savedLang);
    loadLanguage(savedLang);

    if (typeof applyAudioLimiterSettings === 'function') applyAudioLimiterSettings();

    const insertSoundFontBtn  = document.getElementById('insertSoundFontBtn');
    const soundFontFileInput  = document.getElementById('soundFontFileInput');
    const soundFontInfoEl     = document.getElementById('insertedSoundFontInfo');

    insertSoundFontBtn.addEventListener('click', () => soundFontFileInput.click());

    soundFontFileInput.addEventListener('change', async () => {
        const file = soundFontFileInput.files[0];
        if (!file) { soundFontFileInput.value = ''; return; }

        if (soundFontInfoEl) { soundFontInfoEl.textContent = 'loading soundfont...'; }

        try {
            await ensureAudio();
            const arrayBuffer = await file.arrayBuffer();

            const sf2 = await loadSF2(arrayBuffer, audioContext);

            window.loadedSoundFont = {
                name: file.name,
                sf2,
                getZones: sf2.getZones,
                getSampleBuffer: sf2.getSampleBuffer,
                ensureSampleBuffers: sf2.ensureSampleBuffers,
            };

            if (audioContext && typeof sf2.ensureSampleBuffers === 'function') {
                sf2.ensureSampleBuffers().catch(() => {});
            }

            if (soundFontInfoEl) {
                soundFontInfoEl.textContent = `using soundfont: ${file.name}`;
            }

        } catch (err) {
            console.warn('Failed to load SoundFont:', err);
            if (soundFontInfoEl) {
                soundFontInfoEl.textContent = 'failed: ' + (err.message || err);
            }
        }

        soundFontFileInput.value = '';
    });

    const midiFileInput   = document.getElementById('midiFileInput');
    const loadMidiBtn     = document.getElementById('loadMidiBtn');
    const midiPlayerInfo  = document.getElementById('midiPlayerInfo');
    const midiPlayBtn     = document.getElementById('midiPlayBtn');
    const midiPauseBtn    = document.getElementById('midiPauseBtn');
    const midiStopBtn     = document.getElementById('midiStopBtn');
    const midiProgressBar = document.getElementById('midiProgressBar');
    const midiDuration    = document.getElementById('midiDuration');

    loadMidiBtn.addEventListener('click', () => midiFileInput.click());
    midiFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(file) {
            const success = await midiPlayer.loadFile(file);
            if(success) {
                midiPlayer.computeAndStoreMidiInfo();
                if (settings.get('keyRangeMode') === 'midi') applyKeyRange();
                const info = midiPlayer.midiInfo || {};
                let stats = `loaded: ${file.name}`;
                if (info.trackCount) stats += `  |  tracks: ${info.trackCount}`;
                if (info.ppq)        stats += `  |  PPQ: ${info.ppq}`;
                if (info.firstBPM)   stats += `  |  bpm: ${info.firstBPM.toFixed ? info.firstBPM.toFixed(1) : info.firstBPM}`;
                if (info.totalNoteOns)  stats += `  |  notes: ${info.totalNoteOns}`;
                if (info.peakPolyphony) stats += `  |  peak poly: ${info.peakPolyphony}`;
                midiPlayerInfo.textContent = stats;
                midiDuration.textContent   = midiPlayer.getTimeString(midiPlayer.duration);
                midiPlayer.stop();
                updateMIDIPlayerUI();
            } else {
                midiPlayerInfo.textContent = 'error loading midi file';
                showErrorPopup('failed to load midi file: unsupported or corrupted');
            }
            midiFileInput.value = '';
        }
    });
    midiPlayBtn.addEventListener('click', async () => { await ensureAudio(); midiPlayer.play(); updateMIDIPlayerUI(); });
    midiPauseBtn.addEventListener('click', () => { midiPlayer.pause(); updateMIDIPlayerUI(); });
    midiStopBtn.addEventListener('click',  () => { midiPlayer.stop();  updateMIDIPlayerUI(); });
    midiProgressBar.addEventListener('input', (e) => { midiPlayer.seek(e.target.value / 100); updateMIDIPlayerUI(); });

    let lastUiUpdate = 0;
    const uiUpdateInterval = 50;
    setInterval(() => {
        const now = performance.now();
        if (now - lastUiUpdate >= uiUpdateInterval && midiPlayer.isPlaying) { updateMIDIPlayerUI(); lastUiUpdate = now; }
    }, uiUpdateInterval);

    const midiDeviceSelect = document.getElementById('midiDeviceSelect');
    midiDeviceSelect.addEventListener('change', (e) => {
        const idx = e.target.value;
        if(idx) midiManager.selectInput(parseInt(idx));
        else { midiManager.selectedInput = null; settings.set('selectedMidiDevice', ''); }
    });

    const midiOutputSelect = document.getElementById('midiOutputSelect');
    midiOutputSelect.addEventListener('change', (e) => {
        if (e.target.value !== '') midiOutSelect(parseInt(e.target.value));
        else midiOutSelect(-1);
    });

    document.getElementById('refreshMidiBtn').addEventListener('click', () => {
        midiManager.scanInputs();
        midiOutScan();
        updateMIDIStatus(midiManager.isSupported, midiManager.isSupported ? 'Refreshed' : 'MIDI not supported');
    });

    document.getElementById('resetSettingsBtn').addEventListener('click', () => {
        if(confirm(t('resetConfirm'))) { settings.reset(); location.reload(); }
    });

    document.getElementById('exportSettingsBtn').addEventListener('click', () => {
        const blob = new Blob([settings.export()], {type:'application/json'});
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `piano-settings-${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
    });

    const importSettingsBtn  = document.getElementById('importSettingsBtn');
    const settingsFileInput  = document.getElementById('settingsFileInput');
    importSettingsBtn.addEventListener('click', () => settingsFileInput.click());
    settingsFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if(settings.import(event.target.result)) { alert(t('settingsImported')); location.reload(); }
                else alert(t('settingsImportFailed'));
            };
            reader.readAsText(file);
        }
    });
}

function updateMIDIPlayerUI() {
    const midiProgressBar = document.getElementById('midiProgressBar');
    const midiCurrentTime = document.getElementById('midiCurrentTime');
    if(midiProgressBar) {
        midiProgressBar.value = midiPlayer.getProgress() * 100;
        midiCurrentTime.textContent = midiPlayer.getTimeString(midiPlayer.currentTime);
    }
}

function openSettingsPanel() {
    const panel = document.getElementById('settingsPanel');
    const overlay = document.getElementById('settingsOverlay');

    if (!panel.classList.contains('active')) {
        panel.classList.add('active');
        overlay.classList.add('active');

        try {
            sfxManager.playUIOpen();
        } catch(e) {}
    }
}

export { setupSettingsUI, updateMIDIPlayerUI, openSettingsPanel };
