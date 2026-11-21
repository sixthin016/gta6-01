// audio.js — all sound and music is synthesised with WebAudio. No audio
// files are loaded, so the game stays fully offline and silent until the
// player presses Start (the browser requires a user gesture first).
import { clamp } from './rng.js';

const MUSIC_NOTES = [55, 0, 65.41, 0, 49, 0, 58.27, 0, 55, 0, 65.41, 0, 73.42, 82.41, 65.41, 0];
const BASS_LINE = [110, 110, 130.81, 98, 110, 110, 146.83, 123.47];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicTimer = null;
    this.musicOn = false;
    this.musicStep = 0;
    this.muted = false;
  }

  // Called from the Start button / first keypress. Safe to call twice.
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // Engine drone: two detuned saws through a lowpass, gain follows speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 52;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Police siren: triangle that wails between two tones.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 660;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0.0;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.55;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    lfo.start();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  // Continuous engine note: speedNorm 0..1, onFoot silences it.
  engine(speedNorm, driving) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + speedNorm * 0.09 : 0.0, t, 0.08);
    this.engineOsc.frequency.setTargetAtTime(48 + speedNorm * 130, t, 0.1);
  }

  siren(on) {
    if (!this.ctx) return;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0.0, this.ctx.currentTime, 0.2);
  }

  // Short noise burst through a bandpass: the gunshot / punch sound.
  shot() {
    if (!this.ctx) return;
    const dur = 0.14;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start();
  }

  explosion() {
    if (!this.ctx) return;
    const dur = 0.9;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.9;
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start();
  }

  // Two-note pickup chime.
  blip(freq = 660) {
    if (!this.ctx) return;
    for (const [i, f] of [freq, freq * 1.5].entries()) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = 0.18;
      const t0 = this.ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.18, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + 0.25);
    }
  }

  // Tyre screech on hard braking / handbrake turns: filtered noise sweep.
  screech(intensity = 0.5) {
    if (!this.ctx) return;
    const dur = 0.35;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + dur);
    const gain = this.ctx.createGain();
    gain.gain.value = 0.22 * intensity;
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start();
  }

  // Two-tone car horn.
  honk() {
    if (!this.ctx) return;
    for (const f of [370, 466]) {
      const o = this.ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.09, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      o.connect(g); g.connect(this.master);
      o.start(); o.stop(this.ctx.currentTime + 0.42);
    }
  }

  thud() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.16);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(this.ctx.currentTime + 0.2);
  }

  // Looping synthwave bass + pluck sequencer, one 8th-note step at a time.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.musicOn = true;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (!this.musicOn || !this.ctx || this.muted) return;
      const step = this.musicStep % 16;
      const bass = BASS_LINE[Math.floor(step / 2) % BASS_LINE.length];
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = bass;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.16, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
      o.connect(g); g.connect(this.master);
      o.start(); o.stop(this.ctx.currentTime + 0.24);
      const note = MUSIC_NOTES[step];
      if (note) {
        const p = this.ctx.createOscillator();
        p.type = 'square';
        p.frequency.value = note * 4;
        const pg = this.ctx.createGain();
        pg.gain.setValueAtTime(0.035, this.ctx.currentTime);
        pg.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        p.connect(pg); pg.connect(this.master);
        p.start(); p.stop(this.ctx.currentTime + 0.32);
      }
      this.musicStep++;
    }, 210);
  }

  stopMusic() {
    this.musicOn = false;
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}

export const audio = new AudioEngine();
