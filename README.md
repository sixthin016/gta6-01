# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sixthin016/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sixthin016/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Bay** — an open-world crime game in a sunny seaside city. You walk and drive around a 3200×2400 street grid, steal cars, outrun the police as your wanted stars climb, and run five missions for Rook: Joyride, The Red Coupe, Lay Low, Package Run, and the Corner Store Job. Traffic fills the roads, the beach ends in open water to the east, and progress (cash, missions, position) saves to localStorage. No network, no assets — just canvas, seeded RNG, and procedural WebAudio.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — WASD / arrows to walk or drive, E to enter or exit a car, F to punch, Space / Enter to confirm, Esc or P to pause, M to mute. `?seed=N` fixes the city and traffic; `?shot=start|drive|chase|mission&seed=1` stages a scene for screenshots.

## How it is built

Plain static files under `game/` — one HTML page, ES modules, canvas 2D, procedural WebAudio sound, zero assets, zero network requests. The source is split by job: `config.js` (tuning), `random.js` (seeded RNG), `city.js` (streets and beach), `world.js` (player, cars, traffic, police, wanted level), `entities.js`, `missions.js` (the five-story jobs), `render.js` (city, entities, HUD, screens), `audio.js` (synthesized sound), `input.js` (keyboard), `shots.js` (deterministic screenshot staging), `main.js` (boot and the game loop). `main.ts` hands the game in by copying `game/` and `screenshots/` to `/output` and writing `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wffmhs5a&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
