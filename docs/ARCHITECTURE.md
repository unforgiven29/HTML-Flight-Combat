# Architecture

The game is plain browser JavaScript: **classic `<script>` tags that share one global scope** (`game`, `player`, `jets`, `radar`, `MSL`, `AC` ...). There is no bundler and no ES-module graph, so **load order in `index.html` is the dependency graph**. Files are grouped by what they are, and the order of the groups in `index.html` is the order they must load in. Every group has a header comment there.

## Folders (`js/`)

| Folder | What lives here | Notes |
|---|---|---|
| `core/` | `game.js` (flight model, avionics, AI, campaign, MP, shared cockpit scene), `iff.js`, `binds.js`, `assets.js`, `startup.js`, `realism.js`, `hangar.js`, `crewvoice.js`, `fmcal.js`, `jetfixes.js`, `crashguard.js`, `perfhud.js` | `game.js` is ~1.5 MB; everything else wraps or extends it |
| `planes/` | one file per original jet family (`registry.js` first), flight data, loadouts, model builder, jet-specific cockpit / MFD | `f18.js`, `su27.js`, `mig25.js` are rebuilt by editing function source text, so the build copies them unminified |
| `hangar/` | Cold War / modern / extra jets: data tables, models, stealth | `coldwar.js` -> `coldwar-jets.js`, `modern-jets.js` (exposes `window.MJ`) -> `more-jets.js` -> `jet-models.js` |
| `cockpits/` | dedicated 3D cockpits and HUD combiners (A-4, A-7, AV-8B, F-8, F-35, F-100, F-106, AJS 37, M2000, Ka-50, AH-64, Cold War generic) | |
| `aircraft/` | jet-specific systems: M2000 / Mirage F1 radar and warner, Kaira TV, interceptor systems, F-8 / A-7 scopes, ACM radars, strike radars, Su-25 laser, Shkval | |
| `flight/` | V/STOL, engine systems and compressor stall, structure / G-overstress, ramjet | |
| `rotorcraft/` | helicopter flight model, systems, AH-64A, Vikhr, helicopter strike mission | |
| `weapons/` | missile and gun data (`weapons-data.js`), air-to-ground specs, pods and MAWS, AIM-9X Block II + LOAL, beam riders, missile camera seekers, weapon scope switch, anti-ship | |
| `rwr/` | warner registry (`rwrreg.js`, generated), the RWR model, SPO-15, western warner logic | regenerate with `node scripts/gen-rwr-registry.js` |
| `sensors/` | sensor registry (`sensorreg.js`) and everything wired to it: radar, IRST, signal processing, jamming, NCTR, raw video, modern suite (`MSS`), pulse-radar set control (`PRC`), AWG-9 set control (`AWG`, F-14A), IRST fit audit | see the order notes below |
| `campaign/` | campaign / multiplayer upgrade, strategic air war, dynamic campaign | loads after `game.js`, wraps `CAMP` / `CMPUI` |

## Load order rules

1. `planes/registry.js` before any `planes/<jet>.js`; all planes before `core/game.js`.
2. `core/game.js` before everything else (it defines the globals everything wraps).
3. `hangar/` in file order (each part needs the one before it); cockpits after the hangar jets they draw.
4. `sensors/`: `sensorreg.js` -> `sensorfuse.js` -> the per-section wiring files -> `sensorsuite.js` -> `pulsectl.js` -> `awg9ctl.js` -> `irstfit.js`. Later files wrap functions defined by earlier ones (`radar.rdet`, `radar.stt`, `rio.update`, `DL.tick` ...), so moving one earlier silently drops its wrapper.
5. `weapons/weapons-data.js` and `weapons/aim9x2.js` run after every jet / missile definition so they can patch `MSL`, `STN`, `AGW`.
6. If you add a file, put it in the folder that matches what it is, and insert its `<script>` in the right place in that group; do not rely on alphabetical order.

## Patterns you will see

- **Wrapping**: `{const _o=obj.fn;obj.fn=function(){...;return _o.apply(this,arguments);};}` is how later layers extend `game.js`. The outermost wrapper is the last one loaded.
- **Generated files**: `sensors/sensorreg.js` (from `docs/sensor_suite_v3.txt`) and `rwr/rwrreg.js` (from `docs/rwr_registry.txt`). Edit the source text and regenerate, not the output.
- **Version tags**: each `<script>` carries `?v=N` for cache busting. Bump it when you change the file.

## Tooling

- `scripts/build.sh` — minified deployable site in `dist/` (walks every folder under `js/`).
- `scripts/sensor-coverage.js`, `scripts/gen-rwr-registry.js` — registry tools.
- `tests/run.js` — headless-Chrome regression tests for the radar / sensor stack.

## Where the weight is

`core/game.js` is about 38 % of all JavaScript. Splitting it needs the load-order graph above to stay intact, so do it one subsystem at a time (HUD, radar object, missile class, campaign) with a boot check after each cut, not in one pass.
