// Neon Bay — audio.js
// All sound is synthesised with WebAudio: engine hum, sirens, helicopter
// rotor, gunshots per weapon, NOS whoosh, and four procedural radio
// stations (different waveforms and tempos). No audio file is loaded.
// Everything is guarded so a browser without audio (or a headless shot
// run) simply stays silent instead of throwing.

import { RADIO } from './config.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let rotorOsc = null;
  let rotorGain = null;
  let muted = false;
  let musicTimer = 0;
  let musicStep = 0;
  let station = 0;
  const BASS = [130.81, 0, 164.81, 0, 196.0, 0, 164.81, 146.83, 130.81, 0, 196.0, 0, 220.0, 196.0, 164.81, 0];
  const KEYS = [523.25, 0, 587.33, 659.25, 0, 587.33, 523.25, 0, 440.0, 0, 523.25, 0, 659.25, 0, 587.33, 0];

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.35;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 750;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      rotorOsc = ctx.createOscillator();
      rotorOsc.type = 'square';
      rotorOsc.frequency.value = 28;
      rotorGain = ctx.createGain();
      rotorGain.gain.value = 0;
      const rotorFilter = ctx.createBiquadFilter();
      rotorFilter.type = 'lowpass';
      rotorFilter.frequency.value = 220;
      rotorOsc.connect(rotorFilter);
      rotorFilter.connect(rotorGain);
      rotorGain.connect(master);
      rotorOsc.start();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch { /* silent */ }
  }

  function noiseBurst(dur, vol, freq) {
    if (!ctx || muted) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq || 1800;
      const gain = ctx.createGain();
      gain.gain.value = vol || 0.4;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
    } catch { /* silent */ }
  }

  return {
    ensure,
    get muted() { return muted; },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.35;
    },
    get station() { return station; },
    setStation(i) { station = ((i % RADIO.length) + RADIO.length) % RADIO.length; musicStep = 0; },
    engine(speed01) {
      if (!ctx || muted) return;
      try {
        engineGain.gain.setTargetAtTime(speed01 * 0.12, ctx.currentTime, 0.08);
        engineOsc.frequency.setTargetAtTime(50 + speed01 * 130, ctx.currentTime, 0.08);
      } catch { /* silent */ }
    },
    siren(on, time) {
      if (!ctx || muted) return;
      try {
        if (!on) { sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1); return; }
        sirenGain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.1);
        sirenOsc.frequency.value = 700 + 260 * Math.sin(time * 5);
      } catch { /* silent */ }
    },
    heli(on, time) {
      if (!ctx || muted) return;
      try {
        if (!on) { rotorGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1); return; }
        rotorGain.gain.setTargetAtTime(0.07, ctx.currentTime, 0.1);
        rotorOsc.frequency.value = 26 + 4 * Math.sin(time * 11);
      } catch { /* silent */ }
    },
    shot(weapon) {
      if (weapon === 'shotgun') noiseBurst(0.22, 0.6, 1200);
      else if (weapon === 'sniper') noiseBurst(0.3, 0.55, 3200);
      else if (weapon === 'smg') noiseBurst(0.07, 0.35, 2600);
      else noiseBurst(0.12, 0.5, 2600);
    },
    nos() { noiseBurst(0.5, 0.3, 4000); },
    punch() { noiseBurst(0.08, 0.3, 700); },
    crash() { noiseBurst(0.25, 0.5, 500); },
    horn() { blip(370, 0.18, 'square', 0.22); setTimeout(() => blip(466, 0.22, 'square', 0.22), 140); },
    cash() { blip(988, 0.08, 'sine', 0.25); setTimeout(() => blip(1319, 0.14, 'sine', 0.25), 90); },
    pickup() { blip(660, 0.09, 'sine', 0.25); blip(990, 0.12, 'sine', 0.2); },
    missionDone() {
      blip(523.25, 0.12, 'triangle', 0.25);
      setTimeout(() => blip(659.25, 0.12, 'triangle', 0.25), 110);
      setTimeout(() => blip(783.99, 0.2, 'triangle', 0.25), 220);
    },
    busted() { blip(220, 0.5, 'sawtooth', 0.25, 110); },
    wantedUp() { blip(880, 0.08, 'square', 0.18); blip(880, 0.08, 'square', 0.18); },
    update(dt, playing) {
      if (!ctx || muted || !playing) return;
      musicTimer -= dt;
      if (musicTimer > 0) return;
      const st = RADIO[station];
      musicTimer = 60 / st.bpm / 2;
      const bass = BASS[musicStep % BASS.length];
      const key = KEYS[musicStep % KEYS.length];
      const scale = st.base / 110;
      if (bass) blip(bass * scale, 0.2, st.wave, 0.10);
      if (key) blip(key * scale, 0.16, 'sine', 0.05);
      musicStep += 1;
    },
  };
}
