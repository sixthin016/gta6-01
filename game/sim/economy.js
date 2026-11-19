// Neon Bay — money sinks: Rook's Garage upgrades + NOS, two shops
// (ammo / armor / snacks from a lit interior), two safehouses (pay
// $100 to save and clear wanted). Proximity prompts feed the HUD.
import { S, addCash } from '../core/state.js';
import { PLACES } from '../city/districts.js';
import { sfx } from '../core/sound.js';
import { saveGame } from '../core/save.js';
import { buyAmmo } from './weapons.js';
import { setWanted } from '../core/state.js';

export const GARAGE_ITEMS = [
  { key: 'engine', name: 'Engine', desc: '+top speed, +accel', costs: [400, 800, 1400] },
  { key: 'tires', name: 'Tires', desc: '+grip, +steering', costs: [300, 600, 1000] },
  { key: 'nos', name: 'NOS', desc: 'SPACE boost + flame', costs: [500, 900, 1500] },
  { key: 'armor', name: 'Armor', desc: '+50 armor per level', costs: [350, 700, 1200] },
];

export const SHOP_ITEMS = [
  { key: 'ammo', name: 'Ammo pack', desc: `+${'3 mags'} for current gun`, cost: 40 },
  { key: 'armor', name: 'Body armor', desc: '+50 armor', cost: 100 },
  { key: 'snack', name: 'Snack', desc: '+25 HP', cost: 20 },
];

function distTo(x, z) {
  return Math.hypot(S.player.pos.x - x, S.player.pos.z - z);
}

export function nearbyPlace() {
  if (distTo(PLACES.garage.x, PLACES.garage.z) < 9) return { type: 'garage', place: PLACES.garage };
  for (const s of PLACES.shops) if (distTo(s.x, s.z) < 8) return { type: 'shop', place: s };
  for (const s of PLACES.safehouses) if (distTo(s.x, s.z) < 8) return { type: 'safehouse', place: s };
  return null;
}

export function updateEconomy() {
  const near = nearbyPlace();
  if (!near) { S.prompt = ''; S.promptKey = ''; return; }
  if (near.type === 'garage') { S.prompt = `${near.place.name} — press G for upgrades`; S.promptKey = 'KeyG'; }
  if (near.type === 'shop') { S.prompt = `${near.place.name} — press B to shop`; S.promptKey = 'KeyB'; }
  if (near.type === 'safehouse') { S.prompt = `${near.place.name} — press H: save + clear wanted ($100)`; S.promptKey = 'KeyH'; }
}

export function buyUpgrade(slot) {
  const item = GARAGE_ITEMS[slot];
  if (!item) return 'no such upgrade';
  const lvl = S.upgrades[item.key];
  if (lvl >= 3) return `${item.name} already maxed`;
  const cost = item.costs[lvl];
  if (S.cash < cost) return `need $${cost} for ${item.name} ${lvl + 1}`;
  addCash(-cost);
  S.upgrades[item.key] = lvl + 1;
  if (item.key === 'armor') S.armor = Math.min(100, S.armor + 50);
  sfx('cash');
  return `${item.name} → level ${lvl + 1}`;
}

export function buyShopItem(slot) {
  const item = SHOP_ITEMS[slot];
  if (!item) return 'no such item';
  if (item.key === 'ammo') return buyAmmo() ? 'Ammo stocked' : 'Need $40';
  if (S.cash < item.cost) return `need $${item.cost}`;
  addCash(-item.cost);
  if (item.key === 'armor') S.armor = Math.min(100, S.armor + 50);
  if (item.key === 'snack') S.player.hp = Math.min(100, S.player.hp + 25);
  sfx('cash');
  return `${item.name} bought`;
}

export function useSafehouse() {
  if (S.cash < 100) return 'Need $100 to lay low';
  addCash(-100);
  setWanted(0);
  S.player.hp = Math.min(100, S.player.hp + 25);
  saveGame();
  sfx('mission');
  return 'Saved. Wanted cleared. +25 HP';
}
