// Procedural sound — WebAudio only, no audio files: engine hum, sirens, gunshots,
// radio station beds (4 stations, synth loops), UI blips. Silent until first gesture.
export const RADIO_STATIONS = [
  { name: 'NEON FM 101.3', desc: 'synthwave', root: 110, scale: [0, 3, 5, 7, 10] },
  { name: 'BAY 98.7 REGGAE', desc: 'island groove', root: 98, scale: [0, 2, 4, 7, 9] },
  { name: 'CORAL TALK 760', desc: 'talk radio', root: 0, scale: [] },
  { name: 'STATIC 88.1', desc: 'lo-fi beats', root: 130.8, scale: [0, 3, 5, 8, 10] },
];

export function createSound() {
  let ctx = null, master = null, engineOsc = null, engineGain = null, radioTimer = null;
  let station = 0, muted = false;
  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 320;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(filt); filt.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      return true;
    } catch (e) { return false; }
  }
  function blip(freq, dur, type, vol) {
    if (!ensure() || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noiseBurst(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass || 1800;
    const g = ctx.createGain(); g.gain.value = vol || 0.4;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  function radioTick() {
    const st = RADIO_STATIONS[station];
    if (!st || !st.scale.length || muted || !ctx) return;
    const deg = st.scale[Math.floor(Math.random() * st.scale.length)];
    const f = st.root * Math.pow(2, deg / 12) * (Math.random() < 0.25 ? 2 : 1);
    blip(f, 0.34, 'triangle', 0.07);
    if (Math.random() < 0.4) blip(f / 2, 0.5, 'sine', 0.09);
  }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setEngine(speed01, boosting) {
      if (!ctx || !engineOsc) return;
      engineOsc.frequency.value = 42 + speed01 * 130 + (boosting ? 40 : 0);
      engineGain.gain.value = 0.03 + speed01 * 0.05;
    },
    gunshot() { noiseBurst(0.14, 0.5, 2600); blip(160, 0.09, 'square', 0.2); },
    explosion() { noiseBurst(0.9, 0.8, 500); blip(48, 0.7, 'sine', 0.5); },
    siren() { blip(720, 0.28, 'sine', 0.06); setTimeout(() => blip(540, 0.28, 'sine', 0.06), 300); },
    pickup() { blip(880, 0.1, 'sine', 0.15); setTimeout(() => blip(1320, 0.14, 'sine', 0.15), 90); },
    mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.18), i * 110)); },
    setStation(i) {
      station = ((i % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
      if (radioTimer) clearInterval(radioTimer);
      radioTimer = setInterval(radioTick, 420);
      return RADIO_STATIONS[station];
    },
    station() { return RADIO_STATIONS[station]; },
    toggleMute() { muted = !muted; return muted; },
  };
}
