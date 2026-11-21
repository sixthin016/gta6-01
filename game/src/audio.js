// audio.js — all sound is synthesized with WebAudio; the game ships no
// audio files. Engine hum, sirens, gunfire, explosions, radio stations
// (short melodic loops) and UI blips. Silent until the first user gesture.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.radioOn = true;
    this.stationIndex = 0;
    this.stations = [
      { name: 'NEON 97.5', mood: 'synth' },
      { name: 'BAY FM 88.1', mood: 'chill' },
      { name: 'VICE ROCK 104', mood: 'rock' },
      { name: 'TROPICANA 91', mood: 'latin' },
    ];
    this.engineOsc = null;
    this.engineGain = null;
    this.radioTimer = null;
    this.radioStep = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    this.startEngineLoop();
    this.startRadio();
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  tone(freq, dur, type, vol, when, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.now() + (when || 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur, vol, filterFreq, when) {
    if (!this.ctx || this.muted) return;
    const t0 = this.now() + (when || 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  startEngineLoop() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    gain.gain.value = 0.0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start();
    this.engineOsc = osc;
    this.engineGain = gain;
  }

  setEngine(rpm01, boosting) {
    if (!this.engineOsc) return;
    this.engineOsc.frequency.setTargetAtTime(48 + rpm01 * 130 + (boosting ? 40 : 0), this.now(), 0.08);
    this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.02 + rpm01 * 0.05, this.now(), 0.1);
  }

  shot(kind) {
    if (kind === 'shotgun') {
      this.noise(0.28, 0.5, 900);
      this.tone(140, 0.12, 'square', 0.25, 0, 60);
    } else if (kind === 'smg') {
      this.noise(0.09, 0.35, 2200);
    } else if (kind === 'rifle') {
      this.noise(0.16, 0.42, 1600);
      this.tone(220, 0.08, 'square', 0.18, 0, 90);
    } else {
      this.noise(0.12, 0.4, 1800);
    }
  }

  explosion() {
    this.noise(0.9, 0.7, 420);
    this.tone(90, 0.7, 'sine', 0.5, 0, 32);
  }

  sirenBlip() {
    this.tone(720, 0.22, 'sine', 0.12, 0, 980);
    this.tone(980, 0.22, 'sine', 0.12, 0.24, 720);
  }

  crash() {
    this.noise(0.25, 0.45, 700);
    this.tone(120, 0.2, 'triangle', 0.3, 0, 50);
  }

  uiClick() {
    this.tone(660, 0.06, 'sine', 0.15);
  }

  cash() {
    this.tone(880, 0.09, 'sine', 0.18);
    this.tone(1318, 0.14, 'sine', 0.18, 0.09);
  }

  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.2, i * 0.11));
  }

  wantedUp() {
    this.tone(440, 0.16, 'square', 0.14, 0, 330);
    this.tone(330, 0.24, 'square', 0.14, 0.16, 220);
  }

  nextStation() {
    this.stationIndex = (this.stationIndex + 1) % this.stations.length;
    this.radioStep = 0;
    return this.stations[this.stationIndex];
  }

  station() {
    return this.stations[this.stationIndex];
  }

  startRadio() {
    if (this.radioTimer) return;
    const scales = {
      synth: [0, 3, 5, 7, 10],
      chill: [0, 2, 4, 7, 9],
      rock: [0, 3, 5, 6, 10],
      latin: [0, 2, 3, 7, 8],
    };
    const roots = { synth: 220, chill: 196, rock: 165, latin: 247 };
    this.radioTimer = setInterval(() => {
      if (!this.ctx || this.muted || !this.radioOn) return;
      const st = this.stations[this.stationIndex];
      const scale = scales[st.mood];
      const root = roots[st.mood];
      const step = this.radioStep++;
      const deg = scale[step % scale.length] + 12 * Math.floor(step / scale.length) % 2;
      const f = root * Math.pow(2, deg / 12);
      this.tone(f, 0.34, st.mood === 'rock' ? 'square' : 'triangle', 0.05);
      if (step % 4 === 0) this.tone(root / 2, 0.5, 'sine', 0.09);
      if (step % 8 === 6) this.noise(0.05, 0.05, 4000);
    }, 210);
  }
}
