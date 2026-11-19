# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sixthin016/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sixthin016/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Bay** — a real 3D/WebGL open-world crime game in a sunny island city. You walk and drive around a low-poly city with a beach and open water to the east, steal cars, outrun the police as your wanted stars climb, and run **10 story missions** for Rook and the Bay crew: Joyride, The Red Coupe, Lay Low, Package Run, Corner Store Job, Crew Pickup, Getaway, Beach Dash, Night Drop, and the Big Score. Traffic fills the roads, pedestrians stroll the sidewalks, a crew member (Maya) joins you, stolen cars go to your garage, and progress (cash, missions, position, crew) saves to localStorage. No network, no assets — just three.js (vendored), seeded RNG, and procedural WebAudio.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — WASD / arrows to walk or drive, E to enter or exit a car (hold E to rob), F to punch, mouse click to shoot, drag to orbit the chase camera, Esc or P to pause, M to mute. `?seed=N` fixes the city and traffic; `?shot=start|drive|chase|mission&seed=1` stages a scene for screenshots.

## How it is built

Plain static files under `game/` — one HTML page, ES modules, three.js vendored as `game/vendor/three.module.min.js`, procedural WebAudio sound, zero assets, zero network requests. The source is split by job: `config.js` (tuning + named places), `random.js` (seeded RNG), `city.js` (streets, blocks, beach), `world.js` (three.js scene + the simulation: driving, traffic, police, wanted level, missions), `entities.js` (player, pedestrians, cars, police), `missions.js` (the 10-story jobs), `render.js` (chase camera, DOM HUD, minimap), `audio.js` (synthesized sound), `input.js` (keyboard + mouse), `shots.js` (deterministic screenshot staging), `main.js` (boot and the game loop). `main.ts` hands the game in by copying `game/` and `screenshots/` to `/output` and writing `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wffmhs5a&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
