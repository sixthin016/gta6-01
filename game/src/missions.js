// missions.js — the story of Neon Bay. Rae Vega, ex-wheelwoman, is back
// in town the week Hurricane Solana is due to hit. Sixteen jobs across
// the crew — Milo, Tess and Big Dario — against Commissioner Kross and
// the Tide syndicate, ending in a storm-night heist at the docks.
// Each mission is one objective kind the engine already knows: goto,
// drive, collect, eliminate, race, deliver, escape, heist.
import * as THREE from 'three';

export const STORY_INTRO = 'Neon Bay. Hurricane Solana makes landfall in 7 days. Rae Vega is back — broke, wanted, and owed one last job by the people who burned her.';

export const MISSIONS = [
  { id: 'm01', title: 'Homecoming', giver: 'Milo Reyes', kind: 'goto', x: -140, z: 175, reward: 400, text: 'Milo is waiting on the boardwalk. Walk to the marker and hear him out.' },
  { id: 'm02', title: 'Hot Wheels', giver: 'Milo Reyes', kind: 'drive', x: 140, z: 0, reward: 600, text: 'Steal a car — any car — and drive it to the garage on Calle Verde. E to enter.' },
  { id: 'm03', title: 'Market Run', giver: 'Tess Marlowe', kind: 'collect', x: 175, z: -70, count: 4, reward: 800, text: 'Four supply crates are stashed around the night market. Grab them all.' },
  { id: 'm04', title: 'First Blood', giver: 'Tess Marlowe', kind: 'eliminate', x: 155, z: 0, count: 3, reward: 1000, text: 'Tide lookouts hold the market road off Calle Verde. Clear them out. F to shoot.' },
  { id: 'm05', title: 'Bayfront Sprint', giver: 'Milo Reyes', kind: 'race', x: -210, z: 210, reward: 1200, text: 'Race the beach road checkpoints before the timer runs out. Stay in a car.' },
  { id: 'm06', title: 'The Informant', giver: 'Big Dario', kind: 'goto', x: -175, z: -105, reward: 900, text: 'A dockworker at the Old Marina knows where Kross keeps the ledgers. Meet him.' },
  { id: 'm07', title: 'Ledger Lift', giver: 'Big Dario', kind: 'collect', x: -35, z: -210, count: 5, reward: 1400, text: 'Five ledger pages hidden among the dock containers. The Tide patrols the yard.' },
  { id: 'm08', title: 'Downtown Drop', giver: 'Tess Marlowe', kind: 'deliver', x: 0, z: 35, px: 140, pz: 140, reward: 1600, text: 'Pick up the package at the plaza fountain, deliver it to the tower on 70th. Timed.' },
  { id: 'm09', title: 'Heat Wave', giver: 'Milo Reyes', kind: 'escape', x: -70, z: 210, reward: 1800, text: 'Kross put two stars on you. Lose the heat, then reach the beach safehouse.' },
  { id: 'm10', title: 'Air One', giver: 'Tess Marlowe', kind: 'eliminate', x: 70, z: 70, count: 4, reward: 2200, text: 'Tide enforcers guard the downtown rooftop lot. Four of them. The heli is watching.' },
  { id: 'm11', title: 'The Getaway', giver: 'Milo Reyes', kind: 'race', x: 210, z: -210, reward: 2400, text: 'Night race across the causeway. Checkpoints over the bridge, timer is tight.' },
  { id: 'm12', title: 'Safehouse Siege', giver: 'Big Dario', kind: 'eliminate', x: -210, z: -210, count: 5, reward: 2600, text: 'They found the marina safehouse. Hold the block — five attackers, no backup.' },
  { id: 'm13', title: 'Storm Warning', giver: 'Tess Marlowe', kind: 'collect', x: 0, z: -70, count: 6, reward: 2800, text: 'Storm supplies for the crew, six crates across Downtown Neon. Rain is coming in.' },
  { id: 'm14', title: 'Kross Files', giver: 'Milo Reyes', kind: 'deliver', x: -140, z: -140, px: 210, pz: 70, reward: 3200, text: 'Steal the files from the NBPD annex, deliver them to the reporter on the east bridge.' },
  { id: 'm15', title: 'The Crew Rides', giver: 'Big Dario', kind: 'drive', x: 0, z: -245, reward: 3600, text: 'Drive the whole crew to the docks staging point. Milo, Tess and Dario ride with you.' },
  { id: 'm16', title: 'Solana Heist', giver: 'Rae Vega', kind: 'heist', x: 35, z: -245, count: 6, reward: 10000, text: 'Hurricane night. Crack the Tide vault at the docks, grab six gold bars, and vanish into the storm.' },
];

export class MissionManager {
  constructor(scene, fx, audio) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.index = 0; // next mission to play
    this.active = null; // runtime state of the running mission
    this.completed = 0;
    this.marker = null;
    this.timer = 0;
    this.onUpdate = null; // (text) => HUD
    this.onComplete = null; // (mission, reward) => HUD + save
    this.onFail = null;
    this._pickupMeshes = [];
    this._enemyCount = 0;
    this._checkpoint = 0;
    this._checkpoints = [];
    this._phase = 'go'; // deliver: go pickup -> go dropoff
  }

  get current() { return MISSIONS[this.index] || null; }
  get done() { return this.index >= MISSIONS.length; }

  // One-line briefing for the HUD / pause screen: next job and progress.
  briefing() {
    const m = this.current;
    if (!m) return 'Story complete — free roam. The city is yours.';
    return `Job ${this.index + 1}/16 — ${m.title} (${m.giver}): ${m.text}`;
  }

  // Seconds left on a timed mission, or 0 when untimed / idle.
  timeLeft() { return this.active && this.timer > 0 ? Math.max(0, Math.ceil(this.timer)) : 0; }

  start() {
    const m = this.current;
    if (!m || this.active) return false;
    this.active = { ...m, progress: 0, startedAt: performance.now() };
    this._phase = 'go';
    this._checkpoint = 0;
    this.timer = m.kind === 'race' ? 75 : m.kind === 'deliver' ? 90 : 0;
    this._clearProps();
    if (m.kind === 'collect' || m.kind === 'heist') this._spawnPickups(m);
    if (m.kind === 'eliminate') this._spawnEnemies(m);
    if (m.kind === 'race') this._spawnCheckpoints(m);
    if (m.kind === 'escape') this._armEscape();
    if (m.kind === 'drive' && m.id === 'm15') this._crewRide();
    this._placeMarker(this._targetPos());
    this._say(`${m.title} — ${m.giver}: ${m.text}`);
    return true;
  }

  _targetPos() {
    const m = this.active;
    if (!m) return { x: 0, z: 0 };
    if (m.kind === 'deliver' && this._phase === 'go') return { x: m.px, z: m.pz };
    return { x: m.x, z: m.z };
  }

  _placeMarker(p) {
    this._removeMarker();
    const group = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 42, 14, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.y = 21;
    group.add(beam);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.35, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4;
    group.add(ring);
    group.position.set(p.x, 0, p.z);
    this.scene.add(group);
    this.marker = group;
  }

  _removeMarker() {
    if (this.marker) { this.scene.remove(this.marker); this.marker = null; }
  }

  _clearProps() {
    for (const p of this._pickupMeshes) this.scene.remove(p);
    this._pickupMeshes = [];
    for (const c of this._checkpoints) this.scene.remove(c);
    this._checkpoints = [];
  }

  _spawnPickups(m) {
    const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    for (let i = 0; i < m.count; i++) {
      const mat = new THREE.MeshLambertMaterial({ color: m.kind === 'heist' ? 0xffd700 : 0x2ecc71, emissive: m.kind === 'heist' ? 0xaa8800 : 0x1e8449, emissiveIntensity: 0.9 });
      const box = new THREE.Mesh(geo, mat);
      const a = (i / m.count) * Math.PI * 2;
      box.position.set(m.x + Math.cos(a) * (10 + i * 4), 0.9, m.z + Math.sin(a) * (10 + i * 4));
      this.scene.add(box);
      this._pickupMeshes.push(box);
    }
  }

  _spawnEnemies(m) {
    this._enemyCount = m.count;
    if (this._spawnEnemyFn) this._spawnEnemyFn(m.x, m.z, m.count);
  }

  _spawnCheckpoints(m) {
    const spots = [
      { x: m.x, z: m.z },
      { x: 0, z: 210 }, { x: 140, z: 210 }, { x: 210, z: 140 },
      { x: 210, z: 0 }, { x: 210, z: -140 }, { x: m.x + 60, z: m.z },
    ];
    for (const s of spots.slice(0, 5)) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4.5, 0.5, 8, 28),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff })
      );
      ring.position.set(s.x, 2.2, s.z);
      this.scene.add(ring);
      this._checkpoints.push(ring);
    }
  }

  _armEscape() {
    if (this._wantedFn) this._wantedFn(2);
  }

  _crewRide() {
    if (this._crewFn) this._crewFn(true);
  }

  // Hooks wired by main.js (keeps missions free of the player object).
  bind({ spawnEnemyFn, wantedFn, crewFn }) {
    this._spawnEnemyFn = spawnEnemyFn;
    this._wantedFn = wantedFn;
    this._crewFn = crewFn;
  }

  _say(text) { if (this.onUpdate) this.onUpdate(text); }

  abort(reason) {
    if (!this.active) return;
    this._clearProps();
    this._removeMarker();
    this.active = null;
    if (this.onFail) this.onFail(reason || 'Mission failed.');
  }

  complete() {
    const m = this.active;
    this._clearProps();
    this._removeMarker();
    this.active = null;
    this.index++;
    this.completed++;
    this.audio.blip(880);
    this.fx.burst(new THREE.Vector3(0, 4, 0), 0xffd166, 1, 1); // tiny celebratory spark, replaced by HUD
    if (this.onComplete) this.onComplete(m, m.reward);
  }

  // Called every frame with the live game state.
  update(dt, state) {
    if (!this.active) return;
    const m = this.active;
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) { this.abort('Out of time.'); return; }
    }
    const t = this._targetPos();
    const d = Math.hypot(state.px - t.x, state.pz - t.z);
    if (this.marker) {
      this.marker.rotation.y += dt * 1.2;
      this.marker.children[1].position.y = 0.4 + Math.sin(performance.now() / 300) * 0.25;
    }
    for (const c of this._checkpoints) c.rotation.y += dt;
    // Pickups: walk or drive over them.
    for (let i = this._pickupMeshes.length - 1; i >= 0; i--) {
      const p = this._pickupMeshes[i];
      p.rotation.y += dt * 2;
      p.position.y = 0.9 + Math.sin(performance.now() / 280 + i) * 0.18;
      if (Math.hypot(state.px - p.position.x, state.pz - p.position.z) < 3.2) {
        this.scene.remove(p);
        this._pickupMeshes.splice(i, 1);
        m.progress++;
        this.audio.blip(720 + m.progress * 90);
        this._say(`${m.title}: ${m.progress}/${m.count} collected.`);
        if (m.progress >= m.count) { this.complete(); return; }
      }
    }
    // Race checkpoints in order.
    if (m.kind === 'race' && this._checkpoints.length) {
      const cp = this._checkpoints[this._checkpoint];
      if (cp && Math.hypot(state.px - cp.position.x, state.pz - cp.position.z) < 6) {
        cp.material.color.setHex(0x2ecc71);
        this._checkpoint++;
        this.audio.blip(990);
        this._say(`${m.title}: checkpoint ${this._checkpoint}/${this._checkpoints.length}.`);
        if (this._checkpoint >= this._checkpoints.length) { this.complete(); return; }
      }
    }
    if (m.kind === 'goto' && d < 5) { this.complete(); return; }
    if (m.kind === 'drive' && state.driving && d < 6) { this.complete(); return; }
    if (m.kind === 'eliminate' && state.enemiesLeft === 0 && this._enemyCount > 0) { this.complete(); return; }
    if (m.kind === 'deliver') {
      if (this._phase === 'go' && d < 5) {
        this._phase = 'drop';
        this._placeMarker({ x: m.x, z: m.z });
        this._say(`${m.title}: package picked up — deliver it now, timer running.`);
      } else if (this._phase === 'drop' && d < 5) { this.complete(); return; }
    }
    if (m.kind === 'escape' && state.wanted === 0 && d < 6) { this.complete(); return; }
    if (m.kind === 'heist') {
      // Heist completes when all gold is collected (handled by pickups).
      if (state.wanted >= 3 && this._phase === 'go') {
        this._phase = 'hot';
        this._say(`${m.title}: vault open — NBPD is coming. Grab the gold and run!`);
      }
    }
  }

  // Called by combat when an enemy dies during an eliminate mission.
  onEnemyKilled() {
    if (!this.active || this.active.kind !== 'eliminate') return;
    this._enemyCount--;
    this._say(`${this.active.title}: ${this._enemyCount} hostiles left.`);
  }
}
