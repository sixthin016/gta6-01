// The world: one city, five districts, sixteen missions, a five-star police
// response, a crew of three, a hurricane countdown, and traffic and pedestrians
// that only ever spawn in saturated colours. The same state object drives the
// playable game and the four staged screenshots.
import { CAR_PAINTS, CREW, DISTRICTS, HURRICANE_MINUTES, MISSIONS, PED_SHIRTS, POLICE_UNITS, RADIO, WEAPONS, WANTED_MAX } from './config.js';

export const EVENT_OVER = 1;
export const EVENT_BOOM = 2;
export const EVENT_MISSION = 4;

export function createWorld(random) {
  const state = freshState(random);
  return { state, reset, step, startMission, addMoney, raiseWanted, lowerWanted, save, load };

  function freshState(rng) {
    return {
      rng,
      time: 0,
      clockMinutes: 17 * 60 + 42,
      money: 5240,
      respect: 61,
      wanted: 4,
      missionIndex: 4,
      missionStep: 5,
      missionTotal: 6,
      missionDone: 4,
      onFoot: false,
      speedKmh: 128,
      nos: 0.65,
      hp: 100,
      weaponIndex: 1,
      radioIndex: 0,
      hurricaneSeconds: HURRICANE_MINUTES * 60,
      district: DISTRICTS[0].name,
      crew: CREW.map((c) => ({ ...c })),
      weapons: WEAPONS,
      policeUnits: POLICE_UNITS.slice(0, 4),
      traffic: [],
      peds: [],
      heli: { x: 0.72, y: 0.16, rotor: 0, search: true },
      player: { x: 0.5, y: 0.78, angle: -0.26, steering: 0 },
      score: 0,
      best: 0,
      gameOver: false,
    };
  }

  function reset() {
    const rng = state.rng;
    const kept = freshState(rng);
    for (const key of Object.keys(kept)) state[key] = kept[key];
    spawnStreet(state, 12, 9);
  }

  // Spawn a street full of coloured traffic and varied pedestrians in the
  // camera's front cone only: anything behind the camera is never drawn, so
  // it is never spawned.
  function spawnStreet(s, cars, peds) {
    s.traffic = [];
    s.peds = [];
    for (let i = 0; i < cars; i += 1) {
      s.traffic.push({
        lane: s.rng.range(-1, 1),
        depth: s.rng.range(0.08, 1),
        paint: s.rng.pick(CAR_PAINTS),
        police: false,
        speed: s.rng.range(38, 92),
        brake: s.rng.chance(0.3),
      });
    }
    for (let i = 0; i < peds; i += 1) {
      s.peds.push({
        side: s.rng.chance(0.5) ? -1 : 1,
        depth: s.rng.range(0.05, 0.9),
        shirt: s.rng.pick(PED_SHIRTS),
        walk: s.rng.range(0, Math.PI * 2),
      });
    }
  }

  function startMission(index) {
    state.missionIndex = index;
    state.missionStep = 1;
    state.missionTotal = 6;
    state.district = MISSIONS[index].district;
    return MISSIONS[index];
  }

  function addMoney(amount) { state.money += amount; state.score += amount; }

  function raiseWanted() { state.wanted = Math.min(WANTED_MAX, state.wanted + 1); }
  function lowerWanted() { state.wanted = Math.max(0, state.wanted - 1); }

  function step(dt, steer, autopilot) {
    state.time += dt;
    state.clockMinutes += dt / 60;
    state.hurricaneSeconds = Math.max(0, state.hurricaneSeconds - dt);
    state.heli.rotor += dt * 22;
    state.player.steering = steer;

    if (!state.onFoot) {
      const target = autopilot ? 118 : 96 + steer * 0;
      const cruise = state.nos > 0 && autopilot ? 128 : target;
      state.speedKmh += (cruise - state.speedKmh) * dt * 0.8;
      state.player.angle = -0.26 + steer * 0.16;
      if (state.speedKmh > 110) state.nos = Math.max(0, state.nos - dt * 0.05);
    } else {
      state.speedKmh = Math.max(0, state.speedKmh - dt * 60);
    }

    for (const car of state.traffic) {
      car.depth -= dt * (state.speedKmh / 140) * 0.25;
      if (car.depth < 0.02) { car.depth = 1; car.paint = state.rng.pick(CAR_PAINTS); }
    }
    for (const ped of state.peds) ped.walk += dt * 2;

    // Police close in as the wanted level climbs; at five stars SWAT joins.
    if (state.wanted >= 5 && state.policeUnits.length < 5) state.policeUnits = POLICE_UNITS.slice(0, 5);
    if (state.wanted >= 4 && state.traffic.filter((c) => c.police).length < 3) {
      state.traffic.push({ lane: 0, depth: 0.55, paint: '#101018', police: true, speed: 120, brake: false });
    }
    if (state.hurricaneSeconds === 0) state.gameOver = true;
    return state.gameOver ? EVENT_OVER : 0;
  }

  function save() {
    try {
      window.localStorage.setItem('neonbay-afterglow-save', JSON.stringify({
        money: state.money, missionIndex: state.missionIndex, wanted: state.wanted,
        respect: state.respect, best: state.best, district: state.district,
      }));
    } catch { /* storage off: the save lasts this visit only */ }
  }

  function load() {
    try {
      const raw = window.localStorage.getItem('neonbay-afterglow-save');
      if (!raw) return false;
      const data = JSON.parse(raw);
      state.money = data.money; state.missionIndex = data.missionIndex;
      state.wanted = data.wanted; state.respect = data.respect; state.best = data.best;
      return true;
    } catch { return false; }
  }
}

export { RADIO };
