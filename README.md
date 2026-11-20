# Neon Bay — 16 missions, 5-star BCPD, hurricane countdown

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sixthin016/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sixthin016/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game set in Neon Bay, an island city at golden hour with a
hurricane 20 minutes from landfall. Drive, fight, hack and escape — all from
static files, no network requests.

- 16 named story missions across 5 districts, with money, respect and crew progression
- 5-star BCPD wanted system: PIT-formation chases, roadblocks, the Air-1 helicopter and SWAT rappelling from the sky
- A 3-person crew with real perks: Jax tunes the NOS, Mara breaches faster, Reyes steadies your aim
- A 20-minute hurricane countdown pushing the whole story toward landfall
- A garage hero car with NOS flames, brake glow and wet-road reflections, plus a 4-weapon wheel
- 4 radio stations, shops and safehouses, exploding cars, pedestrians and colorful traffic

## The four shots

1. **Beach chase** — the Coral GT counter-steers through a PIT formation on Shore Drive while Air-1's searchlight cuts the haze; the driver's phone shows the GPS route, 5 of 6 drops done.
2. **Market battle** — a night-market shootout behind a bullet-pocked barricade: the crew fires over cover as BCPD officers advance and SWAT drops in on ropes.
3. **Interior heist** — inside the server room, Mara's laptop runs the breach (3 of 4 nodes, 0:47 left) under a laser grid while the getaway car waits in the open garage.
4. **Highway escape** — the final run up the stacked tollway: a Rhino tank and four cruisers block the upper deck, Air-1 hangs overhead, and the crew races the storm to landfall.

## Play it

```sh
node serve.ts   # http://localhost:8080
```

W/↑ accelerate, S/↓ brake, A/D steer, SHIFT NOS, SPACE handbrake, E get in/out
of the car, click to fire on foot, F cycle weapon, Q weapon wheel, M radio.
Progress saves in your browser. The entry program is `main.ts`:
`mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.
