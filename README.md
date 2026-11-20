# Neon Bay — 16 missions, 5-star BCPD, hurricane countdown

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sixthin016/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sixthin016/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game set in Neon Bay, a sun-soaked island city with a
hurricane twenty minutes from landfall. Drive, walk, shoot, and outrun the
BCPD across five districts — all in the browser, from static files, with no
network requests at all.

## What is in the game

- 16 named story missions across 5 districts (Vice Beach, Downtown Neon, Little Havana, Portside Docks, Starfish Island), with respect, cash and crew progress that saves between sessions.
- A 5-star BCPD wanted system: PIT-formation cruisers, roadblocks, the Air-1 helicopter with a searchlight, and SWAT fast-roping from the sky.
- A 3-person crew with real perks: Jax tunes the NOS, Mara breaches twice as fast, Reyes holds a steady aim.
- A 20-minute hurricane countdown pushing the story toward landfall.
- A garage hero car with nitrous flames, brake glow and wet-road reflections.
- A weapon wheel (pistol, SMG, shotgun, rifle) with ammo, muzzle flashes and flying shell casings.
- Shops, safehouses, exploding cars, 4 radio stations, pedestrians and colourful traffic.

## How to play

```
node serve.ts            # serves game/ at http://localhost:8080
```

Drive with WASD, hold SHIFT for NOS, press E to get out and walk, Q for the
weapon wheel, 1–4 to pick a weapon, click to shoot, R to reload, C to change
radio station, P to pause. Progress saves in the browser.

## The four screenshots

1. **Beach chase** — the hero car counter-steers through a PIT formation on
   the Vice Beach boardwalk at golden hour, tyre smoke curling behind it while
   Air-1's searchlight sweeps the road and the driver's phone shows the GPS
   route, 5 of 6 drops done.
2. **Market battle** — a night-market shootout in Little Havana: the crew
   fires over a bullet-pocked barrier as BCPD officers advance in bounding
   overwatch and SWAT ropes down from the helicopter above.
3. **Interior heist** — inside the Glass Tower server room, Mara breaches the
   prototype drive (3 of 4 nodes, 0:47 on the clock) behind a laser grid while
   the getaway car waits in the open garage door.
4. **Highway escape** — the causeway at dusk: the hero car threads swerving
   traffic on the lower deck while the Bell 412 hangs overhead and a Rhino
   tank blocks the upper deck.

## Layout

- `game/index.html` + `game/src/` — the game (canvas 2D, no libraries).
  `config.js` holds the world data, `world.js` builds the dressed streets,
  `draw.js` draws every visible thing, `hud.js` draws the HUD, `shots.js`
  stages the four screenshots, `game.js` is the playable loop, `main.js`
  boots either a staged shot (`?shot=1..4`) or the game.
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with `buildDossier`.
- `tools/capture.mjs` — takes the four screenshots with headless Chromium.
