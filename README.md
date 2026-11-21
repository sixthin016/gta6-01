# Neon Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sixthin016/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sixthin016/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Bay — 16-mission open-world crime game: 5-star NBPD chases, roadblocks &
helicopter, car theft, crew, garage, Hurricane Solana countdown.**

An original open-world crime game in the spirit of GTA 6, built for the
[make.fun](https://make.fun/bounty/gta6-01) "Make GTA 6" bounty (gta6-01).
Everything in it is original: the city of Neon Bay, its people, vehicles,
story, art and sounds. Nothing is taken from Rockstar Games or any other
commercial game — no names, logos, characters, maps or assets.

You play **Rae Vega**, a driver fresh out of the Neon Bay docks, trying to
build a crew and pull one last score before **Hurricane Solana** makes
landfall on the city. Explore five districts on foot and by car, steal
whatever has four wheels, outrun the Neon Bay Police Department through five
wanted stars, and work through 16 story missions with your crew — Dune the
driver, Mara the hacker and Kip the muscle.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request, no install. The game is static files
under `game/`; `game/index.html` opens in desktop Chrome and plays offline.
Three.js is vendored at `game/vendor/three.module.min.js`.

## What is in the game

- **A city to explore** — Coral Beach, the Mercado District, Neon Row
  downtown, the Harbor and the Highway Loop, with traffic, pedestrians,
  palms, neon signs, a pier and a beach.
- **Driving and car theft** — walk up to any parked or traffic car, press
  `E` to take it. Arcade handling, collisions, traffic that follows the
  road grid, and a garage that keeps the cars you own.
- **5-star wanted system (NBPD)** — steal a car or start a fight and the
  stars climb. Police cruisers chase and ram, roadblocks appear at 3 stars,
  and the NBPD helicopter joins the hunt at 4. Lose the cops to cool down.
- **16 story missions** — from a first getaway to the hurricane-night
  vault heist, with go-to, steal, chase, survive and takedown objectives,
  on-screen guidance, minimap blips and cash payouts.
- **Combat** — aim with the mouse, click to fire, take cover behind cars
  and walls; rival crews and NBPD officers fight back.
- **Crew and garage** — recruit Dune, Mara and Kip; crew bonuses change how
  missions play. Cars you park in the garage stay yours between sessions.
- **HUD and minimap** — wanted stars, health, cash, speed, mission
  objective and a live minimap with traffic, police and objective blips.
- **Hurricane Solana countdown** — a live storm timer in the HUD. As the
  storm closes in, the sky darkens, the wind picks up and rain rolls in
  across the bay.
- **Start screen and save** — start screen with story intro, autosave to
  local storage, continue where you left off.

## Controls

| Key | Action |
| --- | --- |
| `W A S D` | Move / drive |
| Mouse drag | Orbit camera |
| `Shift` | Sprint / boost |
| `E` | Enter / steal car, exit car |
| `Space` | Jump (on foot) / handbrake (driving) |
| Click | Shoot (on foot) |
| `R` | Reload |
| `M` | Toggle mission list |
| `P` | Pause |
| `H` | Toggle help |
| `Esc` | Release mouse |

## Project layout

```
main.ts            entrypoint: copies game/ + screenshots/ to /output, writes dossier.json
serve.ts           static server for local play (http://localhost:8080)
game/index.html    the game page (import map -> vendored three.js)
game/src/          game source, one job per module
  main.js          bootstrap, loop, input, player, save/load
  city.js          districts, roads, buildings, beach, props
  vehicles.js      car models, traffic AI, driving physics
  people.js        pedestrians and crew
  police.js        wanted stars, cruisers, roadblocks, helicopter
  missions.js      the 16 story missions and their engine
  combat.js        shooting, enemies, health
  hud.js           HUD, minimap, menus
  fx.js            particles, explosions, rain, muzzle flashes
  audio.js         procedural WebAudio sound and music
  rng.js           seeded random helpers
  shots.js         staged camera poses for screenshots (?shot=1..4)
game/vendor/       three.js (vendored, minified)
tools/capture.mjs  headless screenshot capture (node tools/capture.mjs)
shots.json         the four screenshot stagings
screenshots/       4 gameplay screenshots, 1280x720
```

## Screenshots

1. `1-beach-chase.jpg` — beach chase, 3-star wanted, helicopter overhead
2. `2-market-battle.jpg` — shootout in the Mercado District
3. `3-heist.jpg` — the Harbor vault heist, crew in position
4. `4-highway-escape.jpg` — highway escape at 5 stars, roadblock ahead

## License

MIT — see [LICENSE](LICENSE).
