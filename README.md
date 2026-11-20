# Neon Bay — 16 missions, 5-star BCPD, hurricane countdown

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sixthin016/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sixthin016/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, set on Coral Isle at golden hour: drive, steal, shoot and outrun the Bay City Police Department with your crew as a hurricane closes in. Runs offline in a desktop browser from static files (`game/index.html`), three.js vendored under `game/vendor/`. No Rockstar names, art or assets — everything is original.

## Features

- 16 story missions across 5 districts (Beachfront, Downtown, Old Market, Marina, Hills), with a hurricane landfall countdown.
- 5-star BCPD wanted system: patrol cruisers, roadblocks with spike strips, Air One helicopter with searchlight, SWAT rappel teams, Rhino tank.
- Crew with perks: Mara the hacker, Jax the driver (NOS +40%), Reyes the gunner — portraits + health on the HUD.
- Garage + NOS boost, weapon wheel with 4 guns (pistol, SMG, shotgun, rifle), 4 radio stations, shops + safehouses, respect progression.
- Living city: traffic, pedestrians, palms, markets, neon signs, wet-reflection roads, exploding cars, localStorage save.

## Screenshot proof (what each shot shows)

1. Beach chase — 5-star PIT pursuit: 3 BCPD cruisers overlapping the hero car's rear quarter, tire smoke, 12+ debris, Air One heli with rotor blur + searchlight cone; HUD 128 km/h, "5/6 DELIVER", $5.240, ★★★★☆, GPS phone in the driver's hand.
2. Market battle — on-foot combat in 3 depth planes: barrier with 7 bullet holes + blood, muzzle flashes + 6 shells in the air, 5 police bounding overwatch + 2 SWAT descending rappel ropes under the heli; HUD "5/6 DEFEND", $5.890, ★★★★★, crew health MARA 78 / JAX 92 / REYES 100.
3. Heist interior — server farm: PROTOTYPE drive with red LED, laptop hacking minigame 3/4 nodes timer 0:47, 8-beam laser grid, hacker at the laptop, gunner at the door, getaway car + driver through the garage door; HUD "6/6 EXTRACT", $9.600, ★★★★★.
4. Stacked highway escape — Bell 412 gunner heli mid-frame, hero car on the lower deck with 6 swerving cars, upper-deck blockade with spike strip + 4 cruisers + Rhino tank, 12-tower lit skyline + crane; HUD "6/6 ESCAPE", $12.450, ★★★★★, cockpit HUD "ESCAPE 2.3km" through the heli door.

## Run it

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

Play: WASD drive/walk, E enter/exit car, SHIFT NOS, SPACE brake, 1–4 weapons, Q radio, mouse click to shoot on foot. Screenshots: open `?shot=1` … `?shot=4` (see `shots.json`).

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` + `screenshots/` to the output dir and writes `dossier.json` with the vendored make.fun library.
