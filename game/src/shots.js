// shots.js — deterministic staged scenes for the four screenshots.
// Each shot sets the clock, weather, wanted level, mission, player pose
// and camera so the capture script can reproduce the exact frame. The
// cameras sit close and low, just behind the action, so the player, the
// police and the mission marker all read at contact-sheet size. The game
// itself never calls these during normal play; ?shot=N (or the capture
// script) calls stageShot after the world is built.
import * as THREE from 'three';

export const SHOTS = [
  { n: 1, name: 'beach-chase', title: 'Beachfront pursuit', desc: 'Golden hour on the Palmaro beach road — Rae in the Cometa GT, three stars, Air One overhead, NBPD closing in.' },
  { n: 2, name: 'market-battle', title: 'Calle Verde shootout', desc: 'Dusk in the night market — on-foot gunfight with Tide enforcers, peds scattering, two stars.' },
  { n: 3, name: 'heist', title: 'Solana Heist', desc: 'Hurricane night at the North Docks — rain, neon, the vault crew and a four-star roadblock.' },
  { n: 4, name: 'highway-escape', title: 'Causeway escape', desc: 'Storm on the east causeway — five stars, full NBPD lockdown, the whole city behind her.' },
];

// Place the player in a FRESH car of the requested kind/colour at a spot.
// (The starter car is removed first so the staged car is the one seen.)
// y lifts the car onto a raised deck (the causeway) when needed.
function placeInCar(G, x, z, heading, kindId, color, speed = 0, y = 0) {
  if (G.playerCar) { G.scene.remove(G.playerCar.mesh); G.playerCar = null; }
  const car = G.spawnPlayerCar(kindId, color, x, z, heading);
  car.mesh.position.y = y;
  car.speed = speed;
  G.enterCar(car, true);
  return car;
}

// Air One never spawns by itself in a frozen frame (the wanted update is
// skipped), so staged shots place the helicopter by hand, in frame.
function placeHeli(G, x, y, z) {
  G.wanted.spawnHeli();
  G.wanted.heli.position.set(x, y, z);
  G.wanted.heli.rotation.y = 0.6;
}

function placeOnFoot(G, x, z, heading) {
  G.exitCar(true);
  G.player.x = x;
  G.player.z = z;
  G.player.heading = heading;
  G.player.mesh.position.set(x, 0, z);
  G.player.mesh.rotation.y = heading;
}

function frame(G, pos, look) {
  G.camera.position.set(pos[0], pos[1], pos[2]);
  G.camera.lookAt(new THREE.Vector3(look[0], look[1], look[2]));
  G.stageCamera = { pos, look };
}

export function stageShot(G, n) {
  const fx = G.fx, wanted = G.wanted, combat = G.combat;
  // Clear any live mission/enemies first so the frame is clean.
  G.missions.abort('staging');
  combat.clearEnemies();
  wanted.clear();
  G.peds.scare(9999, 9999, 0);
  G.time.hour = 17.6;
  G.time.day = 6;
  fx.setWeather('clear');
  G.cameraMode = 'chase';

  if (n === 1) {
    // Cover: golden-hour beach chase, camera low behind the red GT.
    G.time.hour = 17.9;
    G.districtName = 'Palmaro Beach';
    const car = placeInCar(G, -40, 210, Math.PI / 2, 'sport', 0xd63031, 30);
    G.playerCar = car;
    G.missions.index = 8; // Heat Wave
    G.missions.start();
    wanted.setLevel(3); // after start: the escape mission arms 2 stars, we stage 3
    wanted.heat = 40;
    G.hud.setMission('HEAT WAVE — lose the heat', 'NBPD is on you. Break line of sight, then reach the beach safehouse.');
    G.hud.feed('NBPD: units converge on the beach road.');
    G.hud.feed('Milo: "Keep it pinned, Rae — Air One is up!"');
    // Police cruisers tight behind on the same road, traffic ahead.
    wanted.spawnCruiser(-78, 210);
    wanted.spawnCruiser(-104, 204);
    placeHeli(G, -6, 20, 226);
    G.traffic.cars[0].mesh.position.set(28, 0, 210);
    G.traffic.cars[1].mesh.position.set(82, 0, 210);
    frame(G, [-62, 4.5, 196], [-28, 2, 212]);
  } else if (n === 2) {
    // Market shootout at dusk, on the open market road — stalls behind
    // the action, enemies in the open, camera low down the road.
    G.time.hour = 18.6;
    G.districtName = 'Calle Verde';
    placeOnFoot(G, 138, 0, Math.PI * 0.5);
    wanted.setLevel(2);
    wanted.heat = 55;
    combat.spawnEnemy(158, 2, 60);
    combat.spawnEnemy(150, -5, 60);
    combat.spawnEnemy(168, 4, 60);
    G.peds.scare(155, 0, 30);
    G.missions.index = 3; // First Blood
    G.missions.start();
    G.hud.setMission('FIRST BLOOD — clear the alley', 'Tide lookouts hold the market road. 3 hostiles. F to shoot.');
    G.hud.feed('Tess: "Roof access, thirty seconds. Go."');
    fx.burst(new THREE.Vector3(158, 1.5, 0), 0xffe27a, 10, 4);
    // Hide the tall marker beam for this shot: the gold ring on the
    // ground still marks the objective, and the beam would hide the fight.
    if (G.missions.marker) G.missions.marker.children[0].visible = false;
    frame(G, [132, 4.5, -16], [155, 1.5, 1]);
  } else if (n === 3) {
    // Heist night: rain, neon, docks, roadblock. Camera low across the yard.
    G.time.hour = 21.5;
    G.districtName = 'North Docks';
    fx.setWeather('rain');
    placeOnFoot(G, 20, -228, Math.PI);
    wanted.setLevel(4);
    wanted.heat = 70;
    combat.spawnEnemy(48, -240, 60);
    combat.spawnEnemy(12, -252, 60);
    G.missions.index = 15; // Solana Heist
    G.missions.start();
    G.missions.active.progress = 2;
    G.hud.setMission('SOLANA HEIST — grab the gold', 'Hurricane night. 2/6 gold bars. NBPD roadblock ahead.');
    G.hud.feed('Dario: "Vault is open. Move, move!"');
    G.hud.feed('NBPD: roadblock on the dock road. Air One inbound.');
    wanted.spawnRoadblock(35, -210, Math.PI);
    placeHeli(G, 26, 34, -236);
    G.crew.setFollowing('milo', true);
    G.crew.setFollowing('tess', true);
    // Crew poses beside Rae (frozen frame never runs their follow logic).
    const [milo, tess] = G.crew.members;
    milo.x = 15; milo.z = -222; milo.mesh.position.set(15, 0, -222); milo.mesh.rotation.y = Math.PI;
    tess.x = 25; tess.z = -222; tess.mesh.position.set(25, 0, -222); tess.mesh.rotation.y = Math.PI;
    frame(G, [14, 5, -214], [32, 2, -242]);
  } else {
    // Highway escape: five stars, storm, causeway. The GT sits ON the
    // raised deck (y 3.1) — a car at y 0 would hide under the bridge.
    G.time.hour = 19.8;
    G.districtName = 'East Causeway';
    fx.setWeather('storm');
    const car = placeInCar(G, 295, 2, Math.PI / 2, 'sport', 0xd63031, 38, 3.1);
    G.playerCar = car;
    wanted.setLevel(5);
    wanted.heat = 90;
    G.missions.index = 10; // The Getaway
    G.missions.start();
    G.hud.setMission('THE GETAWAY — cross the causeway', 'Five stars. City lockdown. Lose them on the bridge or not at all.');
    G.hud.feed('Milo: "Whole city behind you. Do NOT stop."');
    wanted.spawnCruiser(278, 6);
    wanted.spawnCruiser(268, -4);
    wanted.spawnRoadblock(295, 0, Math.PI / 2); // lands 45 ahead: x 340, on the deck
    // Lift the roadblock and its cruiser onto the deck too.
    const rb = wanted.roadblocks[wanted.roadblocks.length - 1];
    if (rb) rb.group.position.y = 3.1;
    const rbCop = wanted.policeCars[wanted.policeCars.length - 1];
    if (rbCop) rbCop.mesh.position.y = 3.1;
    placeHeli(G, 312, 36, 14);
    frame(G, [282, 12, -22], [312, 2, 4]);
  }
  // Refresh the HUD from the staged state, then freeze the clock so the
  // captured frame is identical on every run. The minimap is drawn here
  // because the frozen frame skips the normal HUD refresh loop.
  G.hud.setWanted(wanted.level);
  G.hud.setCash(G.cash);
  G.hud.setHealth(combat.health, combat.maxHealth);
  G.hud.setDistrict(G.districtName);
  G.hud.setStorm(G.stormHoursLeft());
  G.hud.setClock(Math.floor(G.time.hour), Math.floor((G.time.hour % 1) * 60), G.time.day);
  G.hud.drawMinimap({
    px: G.player.x, pz: G.player.z, heading: G.player.heading,
    marker: G.missions.active ? G.missions._targetPos() : null,
    police: wanted.policeCars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
    crew: G.crew.members.filter((m) => m.following).map((m) => ({ x: m.x, z: m.z })),
    traffic: G.traffic.cars.slice(0, 10).map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
  });
  G.freezeFrame = true;
  G.shotStaged = n;
  return SHOTS[n - 1];
}
