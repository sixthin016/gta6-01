// Neon Bay — all sound is synthesized WebAudio: 4 procedural radio
// stations, per-weapon gunshots, explosions, NOS, heli rotor. Zero assets.
import { S } from './state.js';

const STATIONS = [
  { name: 'NEON FM', bpm: 112, scale: [0, 3, 5, 7, 10], wave: 'sawtooth', bass: 55 },
  { name: 'BAY 98.5', bpm: 92, scale: [0, 2, 4, 7, 9], wave: 'triangle', bass: 49 },
  { name: 'PALM TALK', bpm: 76, scale: [0, 5, 7, 12], wave: 'square', bass: 41 },
  { name: 'SURGE FM', bpm: 128, scale: [0, 2, 3, 7, 8], wave: 'sawtooth', bass: 62 },
];

let ctx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let radioTimer = null;
let step = 0;
let rotorNodes = null;

export function stationName() { return STATIONS[S.radio].name; }

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
  } catch (e) { ctx = null; }
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setMuted(m) {
  S.muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}

function blip(freq, dur, type, vol, slideTo) {
  if (!ctx || S.muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(sfxGain);
  o.start(t); o.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol, filterFreq, type = 'lowpass') {
  if (!ctx || S.muted) return;
  const t = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(t);
}

export function sfx(name, arg) {
  if (!ctx) return;
  switch (name) {
    case 'shoot-pistol': noiseBurst(0.09, 0.5, 2800, 'highpass'); blip(180, 0.08, 'square', 0.25, 60); break;
    case 'shoot-smg': noiseBurst(0.06, 0.35, 3200, 'highpass'); blip(220, 0.05, 'square', 0.18, 90); break;
    case 'shoot-shotgun': noiseBurst(0.22, 0.7, 1200); blip(110, 0.16, 'square', 0.35, 40); break;
    case 'shoot-sniper': noiseBurst(0.3, 0.65, 900); blip(320, 0.25, 'sawtooth', 0.3, 50); break;
    case 'explosion': noiseBurst(1.1, 0.9, 500); blip(90, 0.9, 'sine', 0.6, 28); break;
    case 'nos': noiseBurst(0.7, 0.4, 2400, 'bandpass'); blip(300, 0.6, 'sawtooth', 0.12, 1400); break;
    case 'hit': blip(660, 0.07, 'sine', 0.3); break;
    case 'pickup': blip(520, 0.09, 'sine', 0.3); blip(780, 0.12, 'sine', 0.3); break;
    case 'mission': [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.35), i * 110)); break;
    case 'fail': blip(220, 0.4, 'sawtooth', 0.3, 110); break;
    case 'siren': blip(700, 0.5, 'sine', 0.08, 950); break;
    case 'cash': blip(880, 0.08, 'sine', 0.3); setTimeout(() => blip(1174, 0.14, 'sine', 0.3), 80); break;
    case 'reload': blip(300, 0.05, 'square', 0.2); setTimeout(() => blip(420, 0.05, 'square', 0.2), 120); break;
    case 'door': noiseBurst(0.15, 0.25, 800); break;
    case 'busted': [440, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.25, 'sawtooth', 0.3), i * 160)); break;
    default: break;
  }
}

function radioStep() {
  if (!ctx || S.muted) return;
  const st = STATIONS[S.radio];
  const beat = 60 / st.bpm / 2; // eighth notes
  const t = ctx.currentTime;
  const deg = st.scale[step % st.scale.length];
  const octave = step % 16 < 8 ? 0 : 1;
  // bass on beats 0 and 4 of each 8-step bar
  if (step % 4 === 0) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = st.bass * 2;
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + beat * 2);
    o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + beat * 2);
  }
  // lead pluck on off-beats, pattern varies per station
  if (step % 2 === 1 && ((step * 7 + S.radio * 3) % 5 !== 0)) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = st.wave;
    o.frequency.value = 220 * Math.pow(2, (deg + 12 * octave) / 12);
    g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + beat * 1.4);
    o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + beat * 1.5);
  }
  // hat tick
  if (step % 2 === 0) {
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
    const g = ctx.createGain(); g.gain.value = 0.12;
    src.connect(f); f.connect(g); g.connect(musicGain); src.start(t);
  }
  step = (step + 1) % 64;
}

export function startRadio() {
  if (!ctx || radioTimer) return;
  const st = STATIONS[S.radio];
  radioTimer = setInterval(radioStep, (60 / st.bpm / 2) * 1000);
}

export function cycleRadio() {
  S.radio = (S.radio + 1) % STATIONS.length;
  if (radioTimer) { clearInterval(radioTimer); radioTimer = null; }
  startRadio();
  return stationName();
}

export function startRotor() {
  if (!ctx || rotorNodes) return;
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 13;
  const g = ctx.createGain(); g.gain.value = 0.0;
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 13;
  const lg = ctx.createGain(); lg.gain.value = 0.05;
  lfo.connect(lg); lg.connect(g.gain);
  g.gain.setTargetAtTime(0.12, ctx.currentTime, 0.5);
  o.connect(g); g.connect(sfxGain);
  o.start(); lfo.start();
  rotorNodes = { o, lfo, g };
}

export function stopRotor() {
  if (!rotorNodes) return;
  try {
    rotorNodes.g.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    const n = rotorNodes; rotorNodes = null;
    setTimeout(() => { try { n.o.stop(); n.lfo.stop(); } catch (e) {} }, 800);
  } catch (e) { rotorNodes = null; }
}
