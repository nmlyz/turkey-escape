# Turkey Escape — Thanksgiving Getaway

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/nmlyz/turkey-escape/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/nmlyz/turkey-escape/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

A turkey escape game that runs offline in a desktop browser. The farmer is coming
for Thanksgiving dinner, and you are the dinner. Run the farmyard, slip through
the barn, dodge the oven and the carving knives, and reach the woods before he
catches you.

## How to play

Open `game/index.html` in a desktop browser, or serve the `game/` folder with any
static server (`node serve.ts`, then http://localhost:8080).

- **← → / A D** — run
- **SPACE** — jump (clears a thrown knife)
- **SHIFT** — sprint, drains stamina; walk or stand still to recover it
- **H** — hide in a hay bale, crate or kitchen counter; the farmer loses sight of
  you and comes to search the spot
- **C** — drop a corn decoy; the farmer walks over and pecks it while you slip away
- **P** — pause, **M** — mute, **R** — restart after the end screen

## The run

Three zones stand between the turkey and freedom: the **farmyard**, the **barn**,
and the **kitchen**. The farmer patrols, chases when he spots you, searches where
he last saw you, and throws carving knives when you are in range. In the kitchen,
knives rain from the ceiling racks and the ovens burn anyone who lingers in their
heat. Corn is worth 10 points, golden feathers 50 points and an extra decoy, and
every metre toward the woods adds to the score. Three lives; reaching the woods
is the escape.

## Sound

All sound effects are synthesised with WebAudio at play time; the game ships no
audio files and makes no network requests.

## Layout

- `main.ts` — the program that hands the game in (Node 22, standard library only)
- `game/index.html` — the game page
- `game/src/config.js` — tuning numbers, colours, zones
- `game/src/random.js` — seeded random number generator
- `game/src/audio.js` — synthesised sound effects
- `game/src/input.js` — keyboard and mouse input
- `game/src/world.js` — the simulation: turkey, hazards, pickups, score
- `game/src/farmer.js` — the farmer's AI: patrol, chase, search, tricked
- `game/src/render.js` — all canvas drawing, HUD and screens
- `game/src/shots.js` — the staged screenshot scenes and their autopilot
- `game/src/main.js` — boot and the game loop
- `screenshots/` — renders of the game itself
- `vendor/makefun-game.ts` — the dossier library, as supplied

## License

MIT — see `LICENSE`.
