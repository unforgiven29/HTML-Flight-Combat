<p align="center"><img src="assets/logo.svg" width="128" alt="Viper Sortie logo"></p>

# Viper Sortie — combined-arms combat in the browser

Play: https://unforgiven29.github.io/HTML-Flight-Combat/

What began as a flight combat game is now a full combined-arms combat game:

- **Air** — over 240 aircraft and helicopters with detailed flight models, cockpits, radars, missiles and
  electronic warfare; dogfights, strike, close air support, carrier operations.
- **Land** — playable infantry in first person: roles and kits, iron sights and scopes, launchers, insertion by
  APC, IFV, helicopter or parachute; towns with buildings you can enter and destroy; trenches, bunkers, dugouts
  and command posts; tanks and IFVs with a hit-by-hit armour model; FPV drones, artillery, medevac.
- **Sea** — warships, carriers, submarines and anti-ship strikes.
- **The war around you** — a campaign on its own map, and a world war on the real Earth (real terrain, airports,
  towns and countries) whose fronts, economies, politics and losses keep moving while you fly or fight on foot
  in the same world.

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## Layout
```
index.html               page shell + UI markup; the <script> list is grouped and commented by category
css/game.css             all game styles
js/core/                 game.js (the sim: flight model, avionics, AI, campaign, MP, cockpit scene), IFF, binds, assets, start-up, realism, crash guard
js/planes/               plane registry + one file per original jet family (f16, f15, f18, f14, f4, mig29, su27, mig21, mig23, mig25)
js/hangar/               Cold War / modern / extra jets: data, models, stealth
js/cockpits/             dedicated 3D cockpits and HUD combiners
js/aircraft/             jet-specific systems (radars, scopes, warners, avionics)
js/flight/               V/STOL, engines and stall, structure
js/rotorcraft/           helicopter flight model, systems, Apache, Vikhr, strike mission
js/weapons/              missile / gun data, stores and pods, AIM-9X Block II + LOAL, seeker cameras, anti-ship
js/rwr/                  warner registry and models
js/sensors/              sensor registry, radar, IRST, signal processing, jamming, NCTR, pulse-radar set control
js/world/                the Earth: geographic frame, streamed terrain, airports, cities, world map
js/campaign/             campaign / multiplayer, strategic air war, dynamic campaign, campaign ledger + war record
js/war/                  the world war: countries, fronts, forces, politics, economy, ground war, sea, strategic weapons,
                         sorties on the Earth, playable infantry (infantry.js), the war record and the end of the war
assets/assets.config.js  ← edit this to add your own models and sounds
assets/models/           .glb / .gltf files
assets/world/            world data (elevation grid, airports, places, countries, town tiles) + SOURCES.md
assets/audio/            .ogg / .mp3 / .wav files
vendor/                  three.js r128, GLTFLoader, PeerJS
docs/ARCHITECTURE.md     what each folder is, load-order rules, patterns
docs/campaign/           campaign spec v49, ownership registry, traceability, implementation report
```

## Custom 3D models
1. Export a `.glb` (metres, +Y up, nose pointing **-Z**).
2. Put it in `assets/models/`.
3. In `assets/assets.config.js` set e.g.
   `'F-16': { src: 'assets/models/f16.glb', scale: 1, rot: [0, 180, 0], offset: [0, 0, 0] }`
   (`rot` in degrees fixes models that face +Z or +X.)

The procedural airframe is hidden; afterburner plumes, gear, rails and weapons stay. Use `keepParts: ['wings']` on swing-wing jets if you want the built-in moving wings kept.

## Custom audio
Put files in `assets/audio/` and set `src` for any of: `engine`, `afterburner`, `gun`, `irGrowl`, `irLock`, `rwrNew`, `rwrLock`, `rwrLaunch`, `missileLaunch`, `explosion`, `click`, `thunder`. Unset sounds keep the built-in synth. Loops should be seamless.

## Running locally
Browsers block `fetch` from `file://`, so serve the folder: `python -m http.server` then open http://localhost:8000.
