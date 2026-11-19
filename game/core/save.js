// Neon Bay — localStorage save. Cash, missions, respect, upgrades,
// crew, hurricane clock. Versioned key so old rounds never load.
import { S } from './state.js';

const KEY = 'neonbay-save-v5';

export function saveGame() {
  try {
    const data = {
      cash: S.cash,
      respect: S.respect,
      missionIdx: S.missionIdx,
      missionDone: S.missionDone,
      crew: S.crew,
      upgrades: S.upgrades,
      time: S.time,
      hp: S.player.hp,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.cash !== 'number' || !Array.isArray(d.missionDone)) return null;
    S.cash = d.cash;
    S.respect = d.respect || 0;
    S.missionIdx = Math.min(15, d.missionIdx || 0);
    S.missionDone = d.missionDone.slice(0, 16);
    while (S.missionDone.length < 16) S.missionDone.push(false);
    S.crew = { jax: !!d.crew?.jax, mara: !!d.crew?.mara, reyes: !!d.crew?.reyes };
    S.upgrades = { engine: 0, tires: 0, nos: 0, armor: 0, ...(d.upgrades || {}) };
    S.time = d.time || 0;
    S.player.hp = d.hp || 100;
    return d;
  } catch (e) { return null; }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}
