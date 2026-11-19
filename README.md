# Neon Bay — 16 story missions, 3D open-world island city, 5-star police with heli + SWAT, weapon wheel, garage + NOS, shops + safehouses, exploding cars, crew perks, hurricane countdown

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sixthin016/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sixthin016/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original 3D open-world crime game that plays offline in a desktop browser
from static files. No Rockstar names, maps, or assets — Neon Bay is its own
sunny island city with a beach and open water to the east, five named
districts, and a hurricane bearing down on it.

## The game

You are a newcomer trying to make a name in Neon Bay before the storm hits.
Rook runs a garage on the edge of The Strip; Mara, Jax, and Reyes join your
crew as the story unfolds across four acts and sixteen missions — an intro
job, car thefts, a street race, lookout hits, blackouts, levee runs, a shop
robbery, a 45-second last stand against SWAT, and a finale at the radio tower.

The Bay City PD (BCPD) answers in five escalating stars: patrol cars chase,
roadblocks cut the streets, Air One circles overhead with a spotlight that
keeps the heat on, and at five stars a SWAT van rolls in with two armed cops.
Lay low and the stars decay — unless the helicopter is still up.

## Systems

- **World** — low-poly island city, five districts, traffic on a street grid,
  pedestrians, palms, neon signs, a golden-hour sky shader, seeded city
  generation (`?seed=N` fixes the city and traffic).
- **Missions** — 16 story missions: go-to, 8-checkpoint street race, shoot
  targets, survive, defend, rob a shop and lose the cops, steal and deliver.
  Respect rises with each job; getting busted or wasted costs respect and cash.
- **Police** — 5-star escalation with patrol cars, roadblocks, helicopter,
  and SWAT; wanted decays when hidden.
- **Combat** — weapon wheel (Q, or keys 1–4) with pistol, SMG, shotgun, and
  sniper; tracers, reloads, and cover (C) that makes cops shoot worse.
- **Cars** — steal any car (E), arcade driving, garage upgrades (engine,
  tires, NOS, armor) bought with cash, NOS boost on SPACE with a flame cone
  and a meter that drains and refills. Shot or rammed cars smoke, then
  explode — fireball, damage radius, wrecks stay blackened and undrivable.
- **Crew** — Jax (NOS refills twice as fast), Mara (cover fire on nearby
  cops), Reyes (slowly repairs your car). They follow you on foot and show
  on the HUD and minimap.
- **Places** — two shops (ammo, armor, snacks) and two safehouses (pay $100
  to save and clear wanted), all marked on the minimap.
- **Hurricane** — a 20-minute countdown: the sky darkens, rain arrives,
  palms bend, and the streets turn wet with puddle reflections.
- **Sound** — four procedural radio stations (R to cycle), heli rotor,
  per-weapon gunshots, NOS whoosh, explosions. All synthesized WebAudio,
  zero audio files.
- **HUD + minimap** — district-tinted minimap with checkpoints, roadblocks,
  heli, crew, and place markers; wanted stars, cash, respect, objective,
  weapon and NOS meter. Saves to localStorage.

## Controls

WASD move / drive · SHIFT run · E enter or exit a car · SPACE NOS boost ·
mouse drag orbits the camera, click shoots · Q weapon wheel, 1–4 pick a gun ·
C take cover · X reload · R radio · M mute · G garage, B shop, H safehouse ·
ESC pause · ENTER retry a failed mission.

## How it is built

Plain static files under `game/`, one HTML page, ES modules, three.js
vendored under `game/vendor/`, procedural WebAudio, zero assets, zero
network requests. The source is split by job: `core/` (seeded RNG, shared
state, input, sound, save), `city/` (island builder, districts), `sim/`
(cars, people, police, weapons, economy), `story/` (missions), `fx/`
(particles), `ui/` (HUD and minimap), with `boot.js` wiring the loop.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

`main.ts` hands the game in for make.fun: it copies `game/` and
`screenshots/` to the output directory and writes `dossier.json`.
Screenshots are staged with `?shot=start|drive|mission|title&seed=1`.

## License

MIT — see LICENSE.
