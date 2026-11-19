# Neon Bay — 16 story missions, 3D open-world island city, 5-star police + heli + SWAT, weapon wheel, garage + NOS, shops + safehouses, exploding cars, crew perks, hurricane countdown

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sixthin016/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sixthin016/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Bay** — a real 3D/WebGL open-world crime game in a sunny island city, racing a Category 5 hurricane. You walk and drive around a low-poly city with a beach and open water to the east, steal cars, outrun a 5-star police response — patrol cars, roadblocks, the Air One helicopter with its spotlight, and SWAT at five stars — and run **16 story missions** in four acts for Rook, Mara, Jax and Reyes: Neon Tide, First Light, Paper Trail, Dockwork, Street Cred (an 8-checkpoint street race), Silver Tongue, Blackout, Eye Wall, Levee Breach, Turncoat, Radio Free Bay, High Stakes, Category 5, Corner Store Caper (rob a shop, escape the police), Last Stand (hold the safehouse against a SWAT wave), and Neon Dawn. Traffic fills the roads, pedestrians stroll the sidewalks, three crew members join you — each with a live perk while they follow (Jax refills NOS twice as fast, Mara lays down cover fire on nearby cops, Reyes slowly repairs your car) — stolen cars go to your garage (engine, tires, NOS and armor upgrades), and a weapon wheel holds four guns — pistol, SMG, shotgun, sniper — with cover, tracers and reloads. Two shops sell ammo, armor and snacks from real lit interiors (walk in with B), two safehouses save your game and clear your wanted stars for $100 (walk in with H), and cars that take enough damage smoke, then explode — fireball, damage radius, and a police response. Five named districts show on the minimap and HUD, respect grows with every job, four procedural radio stations play, and the hurricane countdown darkens the sky, brings the rain and bends the palms as it runs out — once the rain starts the streets turn wet, with reflective puddle planes and stronger neon reflections. Progress (cash, missions, respect, upgrades, crew, hurricane clock) saves to localStorage. No network, no assets — just three.js (vendored), seeded RNG, and procedural WebAudio.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — WASD / arrows to walk or drive, SHIFT run, SPACE NOS boost, E to enter or exit a car (hold E to rob or hack), F to punch, mouse click to shoot, 1–4 or Q for the weapon wheel, C to take cover, G for garage upgrades near Rook's Garage, B to enter a shop, H to enter a safehouse, R to change radio, drag to orbit the chase camera, Esc or P to pause, M to mute. `?seed=N` fixes the city and traffic; `?shot=start|drive|chase|mission&seed=1` stages a scene for screenshots.

## How it is built

Plain static files under `game/` — one HTML page, ES modules, three.js vendored as `game/vendor/three.module.min.js`, procedural WebAudio sound, zero assets, zero network requests. The source is split by job: `config.js` (tuning, districts, weapons, garage, radio, police tiers, shops, safehouses, explosions, crew perks), `random.js` (seeded RNG), `city.js` (streets, blocks, beach, race ring, named places, shop/safehouse interiors), `world.js` (three.js scene with golden-hour sky shader + wet streets + the simulation: driving, NOS, traffic, police escalation with helicopter/roadblocks/SWAT, wanted level, weapons, missions, respect, hurricane, shops, safehouses, exploding cars, crew abilities), `entities.js` (player, pedestrians, cars, police, helicopter, crew, targets, explosions), `missions.js` (the 16-story arc), `render.js` (chase camera, DOM HUD, district minimap, weapon wheel, garage and shop panels, wet-street fade-in), `audio.js` (synthesized sound + 4 radio stations + explosion and till sounds), `input.js` (keyboard + mouse), `shots.js` (deterministic screenshot staging), `main.js` (boot and the game loop). `main.ts` hands the game in by copying `game/` and `screenshots/` to `/output` and writing `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wffmhs5a&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
