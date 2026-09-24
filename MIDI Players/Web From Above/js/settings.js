// Settings engine: schema-driven store with validation, persistence and
// change subscriptions. The panel UI is generated from SECTIONS below,
// so adding an option is a one-line schema entry (engine + UI stay in sync).
//
// Storage key and value semantics are unchanged from the old engine, so
// existing saved settings and all settings.get()/set() callers keep working.

const SCHEMA = [
    {
        id: 'playback',
        title: 'playback',
        icon: 'fa-solid fa-play',
        settings: [
            { key: 'noteSpeed', type: 'range', label: 'note speed', hint: 'how fast notes fall down the screen.', i18n: 'noteSpeed', i18nHint: 'noteSpeedDesc', min: 1, max: 200, step: 0.1, def: 80, format: (v) => v.toFixed(1) + 'x' },
        ]
    },
    {
        id: 'visual',
        title: 'visual',
        icon: 'fa-solid fa-palette',
        settings: [
            { key: 'backgroundColor', type: 'color', label: 'background color', hint: '', i18n: 'backgroundColor', def: '#464646' },
            { key: 'brightness', type: 'range', label: 'brightness', hint: 'adjust brightness while keeping the color hue.', i18n: 'backgroundBrightness', i18nHint: 'brightnessDesc', min: 0, max: 100, step: 5, def: 50, format: (v) => v + '%' },
            { key: 'showGrid', type: 'toggle', label: 'grid lines', hint: 'show vertical key guides and measure lines.', i18n: 'showGridLines', def: true },
            { key: 'glowStrength', type: 'range', label: 'note glow', hint: 'glow around dense decorative note layers.', min: 0, max: 1, step: 0.05, def: 0.5, format: (v) => Math.round(v * 100) + '%' },
        ]
    },
    {
        id: 'audio',
        title: 'audio',
        icon: 'fa-solid fa-volume-high',
        settings: [
            { key: 'masterVolume', type: 'range', label: 'master volume', hint: '', i18n: 'masterVolume', min: 0, max: 100, step: 1, def: 100, format: (v) => v + '%', onChange: () => { import('./audio-engine.js').then((m) => m.updateAudioGain && m.updateAudioGain()).catch(() => {}); } },
            { key: 'audioLimiter', type: 'toggle', label: 'audio limiter', hint: 'prevents distortion on dense black midi.', i18n: 'audioLimiter', i18nHint: 'audioLimiterDesc', def: true, onChange: () => { import('./audio-engine.js').then((m) => m.applyAudioLimiterSettings && m.applyAudioLimiterSettings()).catch(() => {}); } },
            { key: 'muteInternalSynth', type: 'toggle', label: 'mute internal synth with midi out', hint: 'silence the built-in soundfont while a midi output is selected (biggest dense-song speedup).', def: true, onChange: (v) => { if (v) { import('./midi-out.js').then((mo) => { if (mo.midiOutIsActive && mo.midiOutIsActive()) { import('./audio-engine.js').then((m) => m.stopAllVoices && m.stopAllVoices(true)).catch(() => {}); } }).catch(() => {}); } } },
        ]
    },
    {
        id: 'keyboard',
        title: 'keyboard',
        icon: 'fa-solid fa-keyboard',
        custom: true
    },
    {
        id: 'midi',
        title: 'midi',
        icon: 'fa-solid fa-music',
        custom: true
    },
    {
        id: 'files',
        title: 'files',
        icon: 'fa-solid fa-folder-open',
        custom: true
    },
    {
        id: 'system',
        title: 'system',
        icon: 'fa-solid fa-gear',
        custom: true
    },
];

const STORAGE_KEY = 'pianoSettings';

class Settings {
    constructor() {
        this.listeners = new Map();
        this.current = {};
        for (const section of SCHEMA) {
            for (const def of (section.settings || [])) {
                this.current[def.key] = def.def;
            }
        }
        // Keys stored but rendered with custom UI.
        if (this.current.selectedMidiDevice === undefined) this.current.selectedMidiDevice = '';
        if (this.current.selectedMidiOutput === undefined) this.current.selectedMidiOutput = '';
        if (this.current.firstKey === undefined) this.current.firstKey = 0;
        if (this.current.lastKey === undefined) this.current.lastKey = 127;
        if (this.current.keyRangeMode === undefined) this.current.keyRangeMode = '128';
        if (this.current.language === undefined) this.current.language = 'en';
        this.load();
    }
    load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                for (const k of Object.keys(parsed)) {
                    this.current[k] = this.coerce(k, parsed[k]);
                }
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
    }
    save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current)); }
        catch (e) { console.warn('Failed to save settings:', e); }
    }
    schemaFor(key) {
        for (const section of SCHEMA) {
            for (const def of (section.settings || [])) {
                if (def.key === key) return def;
            }
        }
        return null;
    }
    coerce(key, value) {
        const def = this.schemaFor(key);
        if (!def) return value;
        if (def.type === 'range') {
            let v = Number(value);
            if (!isFinite(v)) v = def.def;
            return Math.max(def.min, Math.min(def.max, v));
        }
        if (def.type === 'toggle') return value !== false && value !== 'false' && value !== 0;
        if (def.type === 'color') {
            return (typeof value === 'string' && /^#[0-9A-F]{6}$/i.test(value)) ? value : def.def;
        }
        if (def.type === 'select' && def.options && def.options.length > 0 && def.options.every((o) => typeof o.value === 'number')) {
            const v = Number(value);
            if (!isFinite(v)) return def.def;
            return def.options.some((o) => o.value === v) ? v : def.def;
        }
        return value;
    }
    get(key) {
        const v = this.current[key];
        if (v !== undefined) return v;
        const def = this.schemaFor(key);
        return def ? def.def : undefined;
    }
    set(key, value, silent) {
        this.current[key] = this.coerce(key, value);
        this.save();
        if (!silent) this.emit(key);
        const def = this.schemaFor(key);
        if (def && typeof def.onChange === 'function' && !silent) {
            try { def.onChange(this.current[key]); } catch (e) {}
        }
    }
    on(key, fn) {
        if (!this.listeners.has(key)) this.listeners.set(key, new Set());
        this.listeners.get(key).add(fn);
        return () => this.listeners.get(key).delete(fn);
    }
    emit(key) {
        const set = this.listeners.get(key);
        if (set) {
            for (const fn of set) {
                try { fn(this.current[key]); } catch (e) {}
            }
        }
    }
    reset() {
        for (const section of SCHEMA) {
            for (const def of (section.settings || [])) {
                this.current[def.key] = def.def;
            }
        }
        this.current.selectedMidiDevice = '';
        this.current.selectedMidiOutput = '';
        this.current.firstKey = 0;
        this.current.lastKey = 127;
        this.current.keyRangeMode = '128';
        this.current.language = 'en';
        this.save();
        for (const key of this.listeners.keys()) this.emit(key);
    }
    export() { return JSON.stringify(this.current, null, 2); }
    import(json) {
        try {
            const imported = JSON.parse(json);
            for (const k of Object.keys(imported)) {
                this.current[k] = this.coerce(k, imported[k]);
            }
            this.save();
            for (const key of this.listeners.keys()) this.emit(key);
            return true;
        } catch (e) {
            console.warn('Failed to import settings:', e);
            return false;
        }
    }
}

const settings = new Settings();

export { Settings, settings, SCHEMA };
