// Neon Bay — missions.js: 16 story missions and the engine that runs them.
// Rae Vega builds a crew and chases one last score before Hurricane
// Solana makes landfall. Each mission is a list of small steps the engine
// checks every frame: reach a place, steal a car, survive a chase, or
// take down a target.
import * as THREE from 'three';

export const MISSIONS = [
  { id: 1, title: 'First Light', brief: 'Meet Dune at the Mercado plaza. He has a job and a fast car.', payout: 250, recruit: 'dune', steps: [{ type: 'goto', x: -90, z: -60, text: 'Meet Dune at the Mercado plaza' }] },
  { id: 2, title: 'Borrowed Wheels', brief: 'The job needs wheels. Take any car on the street — the NBPD will notice.', payout: 400, steps: [{ type: 'steal', text: 'Steal a car (walk up to one and press E)' }, { type: 'goto', x: 0, z: 0, text: 'Drive to Neon Row' }] },
  { id: 3, title: 'Hot Cargo', brief: 'Pick up the crate at the Harbor and bring it to Palm Heights. Do not stop for the cops.', payout: 600, steps: [{ type: 'goto', x: 215, z: 30, text: 'Pick up the cargo at the Harbor' }, { type: 'deliver', x: 90, z: 90, text: 'Deliver the cargo to Palm Heights' }] },
  { id: 4, title: 'The Hacker', brief: 'Mara can scrub your plate from the NBPD system — if you get her out of the Mercado first.', payout: 500, recruit: 'mara', steps: [{ type: 'goto', x: -110, z: -72, text: 'Find Mara in the Mercado stalls' }, { type: 'kill', count: 3, text: 'Clear the rival lookouts (3)' }, { type: 'goto', x: -90, z: -60, text: 'Bring Mara back to the plaza' }] },
  { id: 5, title: 'Beach Run', brief: 'A rival crew is moving product down Coral Beach. Chase them off the sand.', payout: 700, steps: [{ type: 'goto', x: 0, z: -200, text: 'Reach Coral Beach' }, { type: 'kill', count: 4, text: 'Run off the beach crew (4)' }] },
  { id: 6, title: 'Muscle', brief: 'Kip owes the docks money. Settle it his way — then he owes you.', payout: 550, recruit: 'kip', steps: [{ type: 'goto', x: 215, z: 30, text: 'Meet Kip at the Harbor containers' }, { type: 'kill', count: 4, text: 'Handle the dock enforcers (4)' }] },
  { id: 7, title: 'Neon Nights', brief: 'Race the loop: Neon Row to the Highway Loop and back before the light turns.', payout: 800, steps: [{ type: 'goto', x: 0, z: 0, text: 'Start at Neon Row' }, { type: 'goto', x: -190, z: 150, text: 'Reach the Highway Loop' }, { type: 'goto', x: 0, z: 0, text: 'Return to Neon Row' }] },
  { id: 8, title: 'The Tip', brief: 'A vault truck rolls through the Mercado at dusk. Lift it — quietly, then not quietly.', payout: 1200, steps: [{ type: 'goto', x: -60, z: -60, text: 'Intercept the vault truck route' }, { type: 'steal', text: 'Take the truck (any heavy car will do)' }, { type: 'deliver', x: 215, z: 30, text: 'Drive it to the Harbor hideout' }] },
  { id: 9, title: 'Storm Warning', brief: 'Hurricane Solana is 24 hours out. Stock the hideout: grab supplies from three drops.', payout: 900, steps: [{ type: 'goto', x: -180, z: -120, text: 'Supply drop 1: west side' }, { type: 'goto', x: 120, z: -120, text: 'Supply drop 2: east side' }, { type: 'goto', x: 90, z: 90, text: 'Supply drop 3: Palm Heights' }] },
  { id: 10, title: 'Five Stars', brief: 'The NBPD has your face on every screen. Survive a full 5-star hunt for 60 seconds.', payout: 1500, steps: [{ type: 'survive', seconds: 60, text: 'Survive the 5-star hunt for 60 seconds' }] },
  { id: 11, title: 'Harbor Lights', brief: 'Rival boats are landing at the pier. Clear the pier, then take their boat money.', payout: 1100, steps: [{ type: 'goto', x: -40, z: -260, text: 'Reach the pier' }, { type: 'kill', count: 5, text: 'Clear the pier crew (5)' }] },
  { id: 12, title: 'Getaway Pro', brief: 'Dune wants a clean run: cross the city with 3 stars and lose the tail without a scratch.', payout: 1300, steps: [{ type: 'goto', x: 180, z: 180, text: 'Reach the far corner at 3 stars' }, { type: 'survive', seconds: 30, text: 'Lose the tail for 30 seconds' }] },
  { id: 13, title: 'The Informant', brief: 'An NBPD dispatcher sells shift plans. Meet them at the beach — and watch for a setup.', payout: 1000, steps: [{ type: 'goto', x: 40, z: -200, text: 'Meet the informant on Coral Beach' }, { type: 'kill', count: 3, text: 'It was a setup — fight your way out (3)' }] },
  { id: 14, title: 'Downtown Siege', brief: 'The crew hits Neon Row in daylight. Hold the block against the NBPD response.', payout: 1800, steps: [{ type: 'goto', x: 0, z: 0, text: 'Take the Neon Row block' }, { type: 'survive', seconds: 45, text: 'Hold the block for 45 seconds' }] },
  { id: 15, title: 'Eye of the Storm', brief: 'The hurricane is on the bay. One last supply run through the rain — the city is emptying fast.', payout: 2000, steps: [{ type: 'goto', x: -190, z: 150, text: 'Run the Highway Loop in the storm' }, { type: 'goto', x: 215, z: 30, text: 'Bring the supplies to the Harbor' }] },
  { id: 16, title: 'The Solana Score', brief: 'The vault opens as the storm hits. Take it all, outrun the 5-star response, and vanish into the rain.', payout: 5000, steps: [{ type: 'goto', x: 0, z: 0, text: 'Reach the Neon Row vault' }, { type: 'kill', count: 6, text: 'Break the vault guard (6)' }, { type: 'deliver', x: -40, z: -260, text: 'Escape to the pier — the boat is waiting' }] },
];

export function createMissionState() {
  return {
    index: 0,
    step: 0,
    kills: 0,
    surviveLeft: 0,
    active: false,
    done: false,
    marker: null,
    beacon: null,
  };
}

export function currentMission(state) {
  return MISSIONS[Math.min(state.index, MISSIONS.length - 1)];
}

export function currentStep(state) {
  const m = currentMission(state);
  return m.steps[Math.min(state.step, m.steps.length - 1)];
}

export function startMission(scene, state) {
  state.active = true;
  state.step = 0;
  state.kills = 0;
  state.surviveLeft = 0;
  const step = currentStep(state);
  if (step.type === 'survive') state.surviveLeft = step.seconds;
  placeMarker(scene, state);
  return currentMission(state);
}

export function placeMarker(scene, state) {
  if (state.marker) {
    scene.remove(state.marker);
    state.marker = null;
  }
  const step = currentStep(state);
  if (step.x === undefined || step.z === undefined) return;
  const geo = new THREE.CylinderGeometry(1.6, 1.6, 0.25, 24);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85 });
  const marker = new THREE.Mesh(geo, mat);
  marker.position.set(step.x, 0.15, step.z);
  scene.add(marker);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
  );
  beam.position.set(step.x, 20, step.z);
  scene.add(beam);
  marker.userData.beam = beam;
  state.marker = marker;
}

export function clearMarker(scene, state) {
  if (!state.marker) return;
  if (state.marker.userData.beam) scene.remove(state.marker.userData.beam);
  scene.remove(state.marker);
  state.marker = null;
}

// Returns an event string when something notable happens, else ''.
export function updateMission(scene, state, ctx, dt) {
  if (!state.active || state.done) return '';
  const mission = currentMission(state);
  const step = currentStep(state);
  const px = ctx.playerPos.x;
  const pz = ctx.playerPos.z;
  if (step.type === 'goto' || step.type === 'deliver') {
    if (Math.hypot(step.x - px, step.z - pz) < 6) return advanceStep(scene, state, ctx);
  } else if (step.type === 'steal') {
    if (ctx.inCar) return advanceStep(scene, state, ctx);
  } else if (step.type === 'kill') {
    if (state.kills >= step.count) return advanceStep(scene, state, ctx);
  } else if (step.type === 'survive') {
    state.surviveLeft -= dt;
    if (state.surviveLeft <= 0) return advanceStep(scene, state, ctx);
  }
  if (state.marker) {
    state.marker.rotation.y += dt;
    state.marker.position.y = 0.15 + Math.sin(performance.now() * 0.003) * 0.12;
  }
  return '';
}

function advanceStep(scene, state, ctx) {
  state.step++;
  state.kills = 0;
  const mission = currentMission(state);
  if (state.step >= mission.steps.length) {
    state.active = false;
    state.done = true;
    clearMarker(scene, state);
    if (mission.recruit) ctx.recruit(mission.recruit);
    ctx.onMissionComplete(mission);
    return `Mission complete: ${mission.title} — $${mission.payout}`;
  }
  const step = currentStep(state);
  if (step.type === 'survive') state.surviveLeft = step.seconds;
  placeMarker(scene, state);
  return `Objective: ${step.text}`;
}

export function nextMission(state) {
  if (state.index < MISSIONS.length - 1) {
    state.index++;
    state.done = false;
  }
  return currentMission(state);
}
