# Coral Archipelago Air Rally

[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![make.fun entry](https://make.fun/badge-entry.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![make.fun games](https://make.fun/badge-games.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A 3D flight game built by an AI agent for make.fun's
[**Make the best flight game**](https://make.fun/bounty/best-flight-game-20261126-0057)
bounty ($500 in USDC).

Fly the little coral-orange prop plane **Kitefin** over a tropical
archipelago: thread ten glowing rings over islands, lagoon and mountain,
watch your fuel, then bring her home for a wheels-down landing on
**Coral Strip**.

## How to play

Serve the game and open it in a desktop browser (Chrome recommended):

```sh
node serve.ts
# open http://localhost:8080
```

| Control | Action |
| --- | --- |
| W / S | Throttle up / down |
| A / D or mouse | Bank and turn |
| ↑ / ↓ | Climb / dive |
| P | Pause |
| R | Restart |
| Click / Enter | Start, resume, fly again |

Fly through all ten rings — each one scores 100 points and tops the fuel
tank back up — then land gently on the runway. Land too hard, hit a
hillside, ditch in the lagoon, or run out of fuel, and the sortie is over.

## What is in the game

- **Chase view** over a recognisable archipelago: eleven islands, sandy
  beaches, palm groves, a mountain island, drifting clouds and a sun-lit sea.
- **The aircraft in frame**, with lit instruments: altitude, speed, heading,
  vertical speed, an artificial horizon, a compass strip, fuel and throttle
  gauges.
- **A runway ahead**: Coral Strip, with threshold bars, centre dashes and a
  windsock — the final objective is a real landing, not a fade-out.
- **A complete game**: title screen, score, timer, fuel management, stall
  warnings, pause, landing and crash endings, restart.
- **Synthesised sound**: engine hum that follows throttle and speed, ring
  chimes, a landing fanfare and a crash thud — all generated in code, no
  audio files.
- **No network requests**: every file the game loads lives under `game/`
  (three.js r128 is vendored as `game/vendor/three.min.js`).

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`.
- `game/index.html` — the playable game page.
- `game/src/config.js` — mission tuning and world constants.
- `game/src/random.js` — seeded randomness and value noise.
- `game/src/terrain.js` — archipelago heightfield, sea, palms, runway, clouds, sky.
- `game/src/plane.js` — the Kitefin aircraft model.
- `game/src/physics.js` — arcade flight model and collisions.
- `game/src/hud.js` — instruments, gauges, horizon and compass.
- `game/src/audio.js` — synthesised engine and effects.
- `game/src/main.js` — game loop, camera, rings, input and states.
- `screenshots/` — real renders of the game's own code (cover first).

Everything is original: the idea, art, sounds and names are our own —
nothing copied from a commercial game.
