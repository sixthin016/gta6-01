// Neon Bay — 16 story missions, 4-act hurricane arc, for the crew
// Rook, Mara, Jax, Reyes. Types: go-to, race, shoot, survive, defend,
// rob, steal, lose-the-cops. Each mission sets S.objective and a world
// marker; completing one pays cash, +4 respect, and may recruit crew.
import * as THREE from 'three';
import { S, addCash, addRespect, setWanted } from '../core/state.js';
import { PLACES } from '../city/districts.js';
import { spawnTarget, clearTargets } from '../sim/people.js';
import { makeCar } from '../sim/cars.js';
import { spawnFootCop } from '../sim/police.js';
import { recruitCrew } from '../sim/people.js';
import { sfx } from '../core/sound.js';
import { saveGame } from '../core/save.js';
import { pressed } from '../core/input.js';

export const MISSIONS = [
  { name: 'Neon Tide', act: 1, type: 'goto', desc: 'Meet Rook at the garage', steps: [[PLACES.garage.x, PLACES.garage.z]], reward: 150 },
  { name: 'First Light', act: 1, type: 'steal', desc: 'Steal the gold coupe, bring it to Rook', carAt: [40, -40], deliver: [PLACES.garage.x, PLACES.garage.z], reward: 200 },
  { name: 'Paper Trail', act: 1, type: 'goto', desc: 'Pick up the package at the docks, deliver to Palm Villa', steps: [[-160, 80], [88, -136]], reward: 200 },
  { name: 'Dockwork', act: 1, type: 'survive', desc: 'Hold the docks for 15 seconds', goto: [-160, 80], seconds: 15, stars: 2, reward: 250 },
  { name: 'Street Cred', act: 2, type: 'race', desc: 'Street race: 8 checkpoints', checkpoints: [[-120, -120], [0, -120], [120, -120], [120, 0], [120, 120], [0, 120], [-120, 120], [-120, 0]], reward: 400, crew: 'jax' },
  { name: 'Silver Tongue', act: 2, type: 'shoot', desc: 'Take out 4 lookouts on The Strip', goto: [40, 40], count: 4, radius: 26, reward: 350 },
  { name: 'Blackout', act: 2, type: 'survive', desc: 'Cut the power, then survive 20 seconds', goto: [-160, -160], seconds: 20, stars: 2, reward: 350 },
  { name: 'Eye Wall', act: 2, type: 'survive', desc: 'Survive the storm surge: 30 seconds', goto: [170, 40], seconds: 30, stars: 3, reward: 400 },
  { name: 'Levee Breach', act: 3, type: 'shoot', desc: 'Clear 3 guards at the levee gate', goto: [170, 40], count: 3, radius: 22, reward: 400 },
  { name: 'Turncoat', act: 3, type: 'shoot', desc: 'Silence 4 turncoats at Old Port', goto: [-120, 40], count: 4, radius: 26, reward: 450, crew: 'mara' },
  { name: 'Radio Free Bay', act: 3, type: 'defend', desc: 'Defend the radio tower for 20 seconds', goto: [150, -150], seconds: 20, reward: 450 },
  { name: 'High Stakes', act: 3, type: 'steal', desc: 'Steal the armored van, deliver to Rook', carAt: [-80, -80], deliver: [PLACES.garage.x, PLACES.garage.z], reward: 500, crew: 'reyes' },
  { name: 'Category 5', act: 4, type: 'shoot', desc: 'Take down 5 enforcers on The Strip', goto: [0, 40], count: 5, radius: 30, reward: 550 },
  { name: 'Corner Store Caper', act: 4, type: 'rob', desc: 'Rob Sunset Corner Store, then lose the cops', shop: 0, reward: 600 },
  { name: 'Last Stand', act: 4, type: 'defend', desc: 'Hold the Hideout 45 seconds against SWAT', goto: [-136, -104], seconds: 45, stars: 5, reward: 700 },
  { name: 'Neon Dawn', act: 4, type: 'shoot', desc: 'Finale: clear 3 enforcers at the radio tower', goto: [150, -150], count: 3, radius: 24, reward: 1000 },
];

let marker = null;

export function initMissionMarker(scene) {
  marker = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 13;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.22, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd23d }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  marker.add(beam); marker.add(ring);
  marker.visible = false;
  scene.add(marker);
}

function setMarker(x, z) {
  if (!marker) return;
  marker.visible = true;
  marker.position.set(x, 0, z);
  S.missionMarker = { x, z };
}

function hideMarker() {
  if (marker) marker.visible = false;
  S.missionMarker = null;
}

export function startMission(i) {
  if (i < 0 || i >= MISSIONS.length) return;
  clearTargets();
  const def = MISSIONS[i];
  S.missionIdx = i;
  S.mission = {
    def, id: i,
    stage: def.goto || def.type === 'goto' ? 'goto' : 'main',
    step: 0,
    timer: def.seconds || 0,
    checkpointIdx: 0,
    kills: 0,
    spawned: false,
    robbed: false,
    stolen: false,
    car: null,
    waveT: 0,
    failed: null,
    done: false,
  };
  if (def.type === 'steal') {
    const car = makeCar(0xe8c33d, def.carAt[0], def.carAt[1], 0.6);
    car.cruise = 0;
    S.mission.car = car;
  }
  S.objective = `${def.name} — ${def.desc}`;
  if (S.mission.stage === 'goto') {
    const t = def.goto || def.steps[0];
    setMarker(t[0], t[1]);
  } else {
    beginMainStage();
  }
  sfx('pickup');
}

function beginMainStage() {
  const m = S.mission;
  const def = m.def;
  m.stage = 'main';
  if (def.type === 'race') {
    const c = def.checkpoints[0];
    setMarker(c[0], c[1]);
    S.objective = `${def.name} — checkpoint 1/${def.checkpoints.length}`;
  } else if (def.type === 'shoot') {
    const [cx, cz] = def.goto;
    for (let k = 0; k < def.count; k++) {
      const a = (k / def.count) * Math.PI * 2 + 0.4;
      spawnTarget(cx + Math.cos(a) * def.radius * 0.6, cz + Math.sin(a) * def.radius * 0.6);
    }
    m.spawned = true;
    setMarker(cx, cz);
    S.objective = `${def.name} — take out ${def.count} targets (0/${def.count})`;
  } else if (def.type === 'survive' || def.type === 'defend') {
    const [cx, cz] = def.goto;
    setMarker(cx, cz);
    if (def.stars) setWanted(Math.max(S.wanted, def.stars));
    S.objective = `${def.name} — hold on: ${Math.ceil(m.timer)}s`;
  } else if (def.type === 'rob') {
    const shop = PLACES.shops[def.shop];
    setMarker(shop.x, shop.z);
    S.objective = `${def.name} — get inside ${shop.name} and press E`;
  } else if (def.type === 'steal') {
    setMarker(def.carAt[0], def.carAt[1]);
    S.objective = `${def.name} — steal the gold car`;
  }
}

export function completeMission() {
  const m = S.mission;
  if (!m || m.done) return;
  m.done = true;
  const def = m.def;
  S.missionDone[m.id] = true;
  addCash(def.reward);
  addRespect(4);
  clearTargets();
  hideMarker();
  sfx('mission');
  if (def.crew) recruitCrew(def.crew);
  S.objective = `${def.name} complete! +$${def.reward}  +4 respect`;
  saveGame();
  const next = m.id + 1;
  if (next < MISSIONS.length) {
    // next mission starts after a short beat, only if nothing replaced this one
    setTimeout(() => { if (S.started && S.mission === m) startMission(next); }, 2600);
  } else {
    S.objective = 'Neon Dawn complete — Neon Bay is yours. Free roam!';
    S.mission = null;
  }
}

function failCheck() {
  const m = S.mission;
  if (m && m.failed) {
    S.objective = `Mission failed (${m.failed}) — press Enter to retry`;
    return true;
  }
  return false;
}

export function retryMission() {
  const m = S.mission;
  if (m && m.failed) {
    const id = m.id;
    startMission(id);
  }
}

export function updateMission(dt) {
  const m = S.mission;
  if (!m) return;
  if (failCheck()) return;
  const def = m.def;
  const p = S.player.pos;
  if (m.stage === 'goto') {
    const t = def.goto || def.steps[m.step];
    const d = Math.hypot(p.x - t[0], p.z - t[1]);
    if (d < 7) {
      if (def.type === 'goto' && m.step < def.steps.length - 1) {
        m.step++;
        const nt = def.steps[m.step];
        setMarker(nt[0], nt[1]);
        S.objective = `${def.name} — next stop (${m.step + 1}/${def.steps.length})`;
        sfx('pickup');
      } else if (def.type === 'goto') {
        completeMission();
      } else {
        beginMainStage();
      }
    }
    return;
  }
  switch (def.type) {
    case 'race': {
      const c = def.checkpoints[m.checkpointIdx];
      const d = Math.hypot(p.x - c[0], p.z - c[1]);
      if (d < 11) {
        m.checkpointIdx++;
        sfx('pickup');
        if (m.checkpointIdx >= def.checkpoints.length) { completeMission(); return; }
        const nc = def.checkpoints[m.checkpointIdx];
        setMarker(nc[0], nc[1]);
      }
      S.objective = `${def.name} — checkpoint ${m.checkpointIdx + 1}/${def.checkpoints.length}`;
      break;
    }
    case 'shoot': {
      const dead = S.targets.filter((t) => t.hp <= 0).length;
      m.kills = dead;
      S.objective = `${def.name} — take out ${def.count} targets (${dead}/${def.count})`;
      if (dead >= def.count) completeMission();
      break;
    }
    case 'survive':
    case 'defend': {
      m.timer -= dt;
      if (def.type === 'defend') {
        m.waveT -= dt;
        if (m.waveT <= 0) {
          m.waveT = 4;
          const [cx, cz] = def.goto;
          spawnFootCop(cx + (Math.random() * 30 - 15), cz + (Math.random() * 30 - 15), m.id === 14);
        }
      }
      S.objective = `${def.name} — hold on: ${Math.ceil(Math.max(0, m.timer))}s`;
      if (m.timer <= 0) completeMission();
      break;
    }
    case 'rob': {
      if (!m.robbed) {
        const shop = PLACES.shops[def.shop];
        const d = Math.hypot(p.x - shop.x, p.z - shop.z);
        if (d < 8 && pressed.KeyE) {
          m.robbed = true;
          S.stats.robbed++;
          addCash(300);
          setWanted(Math.max(S.wanted, 2));
          sfx('cash');
          hideMarker();
          S.objective = `${def.name} — lose the cops!`;
        }
      } else if (S.wanted <= 0.05) {
        completeMission();
      }
      break;
    }
    case 'steal': {
      if (!m.stolen) {
        if (S.player.car === m.car) {
          m.stolen = true;
          setMarker(def.deliver[0], def.deliver[1]);
          S.objective = `${def.name} — deliver it to Rook's Garage`;
          sfx('pickup');
        }
      } else {
        const d = Math.hypot(p.x - def.deliver[0], p.z - def.deliver[1]);
        if (d < 8) completeMission();
      }
      break;
    }
    default: break;
  }
  if (marker && marker.visible) marker.rotation.y += dt * 1.2;
}
