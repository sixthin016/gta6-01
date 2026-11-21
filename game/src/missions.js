// missions.js — sixteen story missions for Neon Bay. Each mission is a
// short chain of steps (drive, collect, hack, defend, race, escape) with a
// beacon in the world, an objective line on the HUD and a cash + respect
// reward at the end. The chain is the game's spine; the screenshots show
// missions mid-progress, never at the start.
import * as THREE from 'three';
import { makeRng } from './rng.js';

const V = (x, z, y) => new THREE.Vector3(x, y || 0, z);

export const MISSIONS = [
  { id: 0, name: 'Neon Tide', giver: 'ROOK', brief: 'Meet Rook on the pier. He has a job and a warning about the storm.', reward: { money: 400, respect: 5 }, steps: [
    { type: 'drive', text: 'Meet Rook at the pier', target: V(-300, -120) },
    { type: 'drive', text: 'Drive Rook to the marina', target: V(-320, 120) },
  ]},
  { id: 1, name: 'First Light', giver: 'ROOK', brief: 'A package is waiting at the market. Pick it up, keep it quiet.', reward: { money: 650, respect: 6 }, steps: [
    { type: 'collect', text: 'Pick up the package at the market', target: V(345, 20), count: 1 },
    { type: 'drive', text: 'Deliver the package downtown', target: V(-60, 0) },
  ]},
  { id: 2, name: 'Paper Trail', giver: 'MARA', brief: 'Three ledgers in Old Town prove the docks are dirty. Grab them all.', reward: { money: 900, respect: 8 }, steps: [
    { type: 'collect', text: 'Collect the ledgers in Old Town', target: V(300, 120), count: 3 },
    { type: 'drive', text: 'Bring the ledgers to Mara', target: V(-120, 60) },
  ]},
  { id: 3, name: 'Dockwork', giver: 'REYES', brief: 'A crate at the harbour holds parts Reyes needs. Lift it and go.', reward: { money: 1100, respect: 9 }, steps: [
    { type: 'collect', text: 'Lift the crate at the harbour', target: V(0, 400), count: 1 },
    { type: 'drive', text: 'Drop the crate at the garage', target: V(120, 180) },
  ]},
  { id: 4, name: 'Street Cred', giver: 'JAX', brief: 'Eight checkpoints, one downtown loop. Beat the clock and the street talks.', reward: { money: 1500, respect: 12 }, steps: [
    { type: 'race', text: 'Race the downtown loop', target: V(-240, -180), checkpoints: [V(-240, -180), V(120, -180), V(120, 180), V(-240, 180), V(-240, -60), V(120, -60), V(120, 60), V(-240, 60)] },
  ]},
  { id: 5, name: 'Silver Tongue', giver: 'ROOK', brief: 'Drive the contact to the hotel. No scratches, no sirens, no questions.', reward: { money: 1300, respect: 10 }, steps: [
    { type: 'drive', text: 'Pick up the contact at the plaza', target: V(345, 20) },
    { type: 'drive', text: 'Drop the contact at the hotel', target: V(-60, -120) },
  ]},
  { id: 6, name: 'Blackout', giver: 'REYES', brief: 'Two power boxes keep the port lit. Kill them both so Reyes can work.', reward: { money: 1600, respect: 12 }, steps: [
    { type: 'hack', text: 'Cut power at the harbour boxes', target: V(-60, 360), count: 2, duration: 6 },
  ]},
  { id: 7, name: 'Eye Wall', giver: 'MARA', brief: 'The hurricane is coming. Four supply drops before the eye wall hits.', reward: { money: 1800, respect: 13 }, steps: [
    { type: 'collect', text: 'Grab the supply drops', target: V(-200, -200), count: 4 },
    { type: 'drive', text: 'Get the supplies to the shelter', target: V(0, -380) },
  ]},
  { id: 8, name: 'Levee Breach', giver: 'JAX', brief: 'Hold the levee while the crew seals it. They will come for you.', reward: { money: 2200, respect: 15 }, steps: [
    { type: 'defend', text: 'Hold the levee', target: V(180, 300), duration: 45 },
  ]},
  { id: 9, name: 'Turncoat', giver: 'ROOK', brief: 'A rat is running for the highway. Run him down before he talks.', reward: { money: 2400, respect: 16 }, steps: [
    { type: 'chase', text: 'Run down the rat on the highway', target: V(180, -300) },
  ]},
  { id: 10, name: 'Radio Free Bay', giver: 'REYES', brief: 'The tower has to stay up. Hold the roof while Reyes broadcasts.', reward: { money: 2600, respect: 17 }, steps: [
    { type: 'defend', text: 'Defend the radio tower', target: V(-120, -120), duration: 50 },
  ]},
  { id: 11, name: 'High Stakes', giver: 'ROOK', brief: 'The casino vault prototype is ours tonight. Hack it, then run.', reward: { money: 3400, respect: 20 }, steps: [
    { type: 'hack', text: 'Hack the vault terminal', target: V(60, 400), count: 1, duration: 10 },
    { type: 'escape', text: 'Escape with the prototype', target: V(-300, -120), needWanted: 3 },
  ]},
  { id: 12, name: 'Category 5', giver: 'MARA', brief: 'The surge is here. Get to the hills safehouse with the whole city chasing you.', reward: { money: 3000, respect: 18 }, steps: [
    { type: 'escape', text: 'Reach the hills safehouse', target: V(0, -380), needWanted: 3 },
  ]},
  { id: 13, name: 'Corner Store Caper', giver: 'JAX', brief: 'Two stores, fast hands, faster wheels. The NBPD will notice.', reward: { money: 2800, respect: 17 }, steps: [
    { type: 'collect', text: 'Hit the corner stores', target: V(240, 60), count: 2 },
    { type: 'escape', text: 'Lose the heat at the pier', target: V(-300, 200), needWanted: 2 },
  ]},
  { id: 14, name: 'Last Stand', giver: 'ROOK', brief: 'The market square, tonight, everyone. Hold it until dawn breaks the siege.', reward: { money: 4200, respect: 24 }, steps: [
    { type: 'defend', text: 'Hold the market square', target: V(345, 20), duration: 60 },
  ]},
  { id: 15, name: 'Neon Dawn', giver: 'ROOK', brief: 'One last delivery: the prototype to the pier, five stars on your tail, sunrise on the bay.', reward: { money: 6000, respect: 30 }, steps: [
    { type: 'drive', text: 'Take the prototype to the pier', target: V(-300, -120) },
    { type: 'escape', text: 'Escape the five-star manhunt', target: V(180, 420), needWanted: 5 },
  ]},
];

export class MissionSystem {
  constructor(scene, fx, audio) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.rng = makeRng(20240);
    this.index = 0;
    this.stepIndex = 0;
    this.done = false;
    this.stepTimer = 0;
    this.stepProgress = 0;
    this.collected = 0;
    this.raceCp = 0;
    this.items = [];
    this.chaseCar = null;
    this.beacon = this.makeBeacon();
    this.onMissionComplete = null;
    this.onStepComplete = null;
  }

  makeBeacon() {
    const g = new THREE.Group();
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
    );
    pillar.position.y = 30;
    g.add(pillar);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 3.6, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.3;
    g.add(ring);
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.4),
      new THREE.MeshBasicMaterial({ color: 0xffd23e })
    );
    diamond.position.y = 12;
    g.add(diamond);
    g.visible = false;
    this.scene.add(g);
    this.beaconDiamond = diamond;
    return g;
  }

  get mission() {
    return MISSIONS[this.index];
  }

  get step() {
    const m = this.mission;
    return m ? m.steps[this.stepIndex] : null;
  }

  get objectiveText() {
    const m = this.mission;
    if (!m || this.done) return 'All missions complete — Neon Bay is yours';
    const s = this.step;
    let suffix = '';
    if (s.type === 'collect') suffix = ` ${this.collected}/${s.count}`;
    if (s.type === 'race') suffix = ` ${this.raceCp}/${s.checkpoints.length}`;
    if (s.type === 'hack' || s.type === 'defend') suffix = ` ${Math.ceil(this.stepTimer)}s`;
    return `${this.stepIndex + 1}/${m.steps.length} ${s.text}${suffix}`;
  }

  start(index) {
    this.index = index;
    this.stepIndex = 0;
    this.done = false;
    this.beginStep();
  }

  beginStep() {
    const s = this.step;
    this.stepTimer = s.duration || 0;
    this.stepProgress = 0;
    this.collected = 0;
    this.raceCp = 0;
    this.clearItems();
    if (s.type === 'collect') this.spawnItems(s);
    if (s.type === 'race') this.spawnItems(s);
    this.beacon.visible = true;
    this.beacon.position.set(s.target.x, 0, s.target.z);
  }

  clearItems() {
    for (const it of this.items) this.scene.remove(it);
    this.items = [];
  }

  spawnItems(s) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd23e });
    const geo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const spots = [];
    if (s.type === 'race') {
      for (const cp of s.checkpoints) spots.push(cp);
    } else {
      for (let i = 0; i < s.count; i++) {
        const a = (i / s.count) * Math.PI * 2;
        spots.push(new THREE.Vector3(s.target.x + Math.cos(a) * 16, 0, s.target.z + Math.sin(a) * 16));
      }
    }
    for (const p of spots) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(p.x, 1.4, p.z);
      this.scene.add(m);
      this.items.push(m);
    }
  }

  completeStep(game) {
    const m = this.mission;
    if (this.audio) this.audio.cash();
    if (this.onStepComplete) this.onStepComplete(m, this.stepIndex);
    this.stepIndex += 1;
    if (this.stepIndex >= m.steps.length) {
      game.state.money += m.reward.money;
      game.state.respect += m.reward.respect;
      if (this.audio) this.audio.missionDone();
      if (this.onMissionComplete) this.onMissionComplete(m);
      this.index += 1;
      this.stepIndex = 0;
      if (this.index >= MISSIONS.length) {
        this.done = true;
        this.beacon.visible = false;
        this.clearItems();
        return;
      }
    }
    this.beginStep();
  }

  update(dt, game, t) {
    if (this.done || !this.mission) return;
    const s = this.step;
    const p = game.playerPos();
    const dist = Math.hypot(p.x - s.target.x, p.z - s.target.z);
    this.beaconDiamond.rotation.y += dt * 2;
    this.beaconDiamond.position.y = 12 + Math.sin(t * 2) * 1.2;
    if (s.type === 'drive' || s.type === 'escape') {
      const okWanted = s.type === 'escape' ? game.police.wanted >= (s.needWanted || 1) : true;
      if (dist < 10 && okWanted) this.completeStep(game);
    } else if (s.type === 'collect') {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        it.rotation.y += dt * 2;
        if (Math.hypot(p.x - it.position.x, p.z - it.position.z) < 3.2) {
          this.scene.remove(it);
          this.items.splice(i, 1);
          this.collected += 1;
          this.fx.burst('spark', it.position.clone(), 6, 3);
          if (this.audio) this.audio.cash();
        }
      }
      if (this.collected >= s.count) this.completeStep(game);
    } else if (s.type === 'hack') {
      if (dist < 9) {
        this.stepProgress += dt * (game.state.crew[2].recruited ? 2 : 1);
        this.stepTimer = Math.max(0, (s.duration || 6) - this.stepProgress);
        if (this.stepProgress >= (s.duration || 6)) this.completeStep(game);
      }
    } else if (s.type === 'defend') {
      if (dist < 26) {
        this.stepTimer -= dt;
        if (Math.random() < dt * 0.35 && game.police.wanted < 5) game.police.addWanted(1);
        if (this.stepTimer <= 0) this.completeStep(game);
      }
    } else if (s.type === 'race') {
      const cp = s.checkpoints[this.raceCp];
      if (cp && Math.hypot(p.x - cp.x, p.z - cp.z) < 11) {
        this.fx.burst('spark', new THREE.Vector3(cp.x, 1, cp.z), 8, 4);
        this.raceCp += 1;
        if (this.raceCp >= s.checkpoints.length) this.completeStep(game);
        else {
          const next = s.checkpoints[this.raceCp];
          this.beacon.position.set(next.x, 0, next.z);
        }
      }
    } else if (s.type === 'chase') {
      if (dist < 8) this.completeStep(game);
    }
  }
}
