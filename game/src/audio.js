// Neon Bay — audio.js: all sound is synthesized live with WebAudio.
// No audio files, no network. Everything is guarded so a missing or
// blocked AudioContext never breaks the game.
export function createAudio() {
  const state = {
    ctx: null,
    master: null,
    musicGain: null,
    engineOsc: null,
    engineGain: null,
    musicTimer: null,
    step: 0,
    enabled: true,
  };

  function ensure() {
    if (state.ctx) return state.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      state.ctx = new AC();
      state.master = state.ctx.createGain();
      state.master.gain.value = 0.35;
      state.master.connect(state.ctx.destination);
      state.musicGain = state.ctx.createGain();
      state.musicGain.gain.value = 0.12;
      state.musicGain.connect(state.master);
    } catch (err) {
      state.ctx = null;
    }
    return state.ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = 0) {
    const ctx = ensure();
    if (!ctx || !state.enabled) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(state.master);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch (err) { /* sound is optional */ }
  }

  function noise(dur, vol = 0.25, filterFreq = 1200) {
    const ctx = ensure();
    if (!ctx || !state.enabled) return;
    try {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(state.master);
      src.start();
    } catch (err) { /* sound is optional */ }
  }

  // A slow synthwave bassline: A minor walk, one note per beat.
  const bassline = [55, 55, 65.4, 49, 55, 55, 82.4, 73.4];
  function musicTick() {
    const ctx = ensure();
    if (!ctx || !state.enabled) return;
    const note = bassline[state.step % bassline.length];
    tone(note, 0.42, 'sawtooth', 0.05);
    tone(note * 2, 0.2, 'square', 0.02);
    if (state.step % 4 === 0) tone(220, 0.1, 'triangle', 0.03);
    state.step++;
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    startMusic() {
      ensure();
      if (state.musicTimer) return;
      state.musicTimer = setInterval(musicTick, 420);
    },
    stopMusic() {
      if (state.musicTimer) clearInterval(state.musicTimer);
      state.musicTimer = null;
    },
    setEngine(speed01) {
      const ctx = ensure();
      if (!ctx || !state.enabled) return;
      try {
        if (!state.engineOsc) {
          state.engineOsc = ctx.createOscillator();
          state.engineGain = ctx.createGain();
          state.engineOsc.type = 'sawtooth';
          state.engineGain.gain.value = 0;
          state.engineOsc.connect(state.engineGain);
          state.engineGain.connect(state.master);
          state.engineOsc.start();
        }
        state.engineOsc.frequency.value = 50 + speed01 * 160;
        state.engineGain.gain.value = 0.02 + speed01 * 0.05;
      } catch (err) { /* sound is optional */ }
    },
    gunshot() { noise(0.12, 0.4, 3000); tone(180, 0.08, 'square', 0.15, 60); },
    siren() { tone(700, 0.5, 'sine', 0.06, 950); tone(950, 0.5, 'sine', 0.06, 700); },
    pickup() { tone(660, 0.09, 'triangle', 0.15); setTimeout(() => tone(990, 0.14, 'triangle', 0.15), 90); },
    crash() { noise(0.35, 0.4, 800); tone(90, 0.3, 'sine', 0.25, 40); },
    explosion() { noise(0.8, 0.5, 500); tone(60, 0.7, 'sine', 0.3, 30); },
    missionDone() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.18), i * 110)); },
    click() { tone(440, 0.05, 'square', 0.08); },
    toggle() { state.enabled = !state.enabled; return state.enabled; },
  };
}
