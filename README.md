# Neon Bay — Afterglow: 16 missions, 5-star police, hurricane countdown

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/sixthin016/gta6-01/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/sixthin016/gta6-01/reward.svg)](https://make.fun/c/gta6-01)

An open-world crime game in the spirit of GTA 6, playable in a desktop browser from static files. Drive the golden-hour city of Neon Bay, outrun a five-star police response, and run sixteen story missions with your crew while a hurricane closes in.

## What the four screenshots prove

| Shot | System shown | Visual proof in the frame | HUD state |
|---|---|---|---|
| 1 — Beach chase | 5-star police chase + heli | 3 police in PIT formation + Bell 412 heli with searchlight + tire smoke + debris streaks | 128 km/h, 5/6 DELIVER, $5,240, ★★★★☆ |
| 2 — Market shootout | On-foot combat + SWAT | Bullet-holed barrier + 2 crew firing with muzzle flashes + 5 police in bounding overwatch + 2 SWAT on rappel ropes | 5/6 DEFEND, $5,890, ★★★★★ |
| 3 — Vault heist | Hacking minigame + laser grid | PROTOTYPE server drive with red LED + hacking laptop at 3/4 nodes, 0:47 + 8-beam laser grid | 6/6 EXTRACT, $9,600, ★★★★★ |
| 4 — Toll escape | Roadblock escape + fireball | Bell 412 with gunner + spike strip, 4 cruisers and a Rhino tank on the upper deck + burning cruiser fireball | 141 km/h, 6/6 ESCAPE, $12,450, ★★★★★ |

## The game

- 16 story missions across 5 districts (Solano Beach, Downtown Neon, Mercado Viejo, Port Solano, Bay Bridge)
- 5-star police with heli + roadblocks + SWAT, wanted level that climbs with every crime
- Crew of 3 with perks (Macer hacks doors faster, Kayla doubles NOS, Rico never runs dry in cars)
- Hurricane countdown (20 minutes) over the whole city
- Garage + NOS, weapon wheel with 4 weapons, 4 radio stations, shops + safehouses, save

## Play

```sh
node serve.ts
# open http://localhost:8080
```

WASD / arrows drive and walk, Shift NOS, Space handbrake, F get in/out of a car, Q weapon wheel, R radio, P pause, Enter start. Click to shoot on foot. Progress saves to localStorage.

## Screenshots

The four staged shots are real renders of the game's own code (`game/src/shots.js` stages them deterministically from `shots.json`):

```sh
node tools/capture.mjs   # writes screenshots/1-beach-chase.jpg … 4-toll-escape.jpg
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.
