# js/war — the world war

Classic scripts (no modules); `index.html` loads them in order. Each file is an IIFE that hangs its API on `window.WWAR`
(`W.*`) or a global (`INFANTRY`, `WARMAP`, ...).

| folder | what lives there |
|---|---|
| `core/` | the war engine and its plumbing: `worldwar.js` (state, step, events, save), `store.js` (IndexedDB), country data (`nations`, `natdata`), performance, integrity checks, learning and AI helpers |
| `military/` | forces and fighting at war scale: strategy, operations, order of battle, supply, land / sea / air campaigns, armour, targets, the player's service and CSAR |
| `world/` | the physical world around the war: cities, infrastructure, seasons, hazards, environment |
| `society/` | politics and people: polity, economy, diplomacy, media and information war, leaders, justice, civilians, the death ledger, the chronicle, post-war |
| `ground/` | the playable ground war: infantry and tank battles (`infantry.js`), their multiplayer (`infnet.js`), your squad, battle → campaign links, map markers |
| `ui/` | panels and screens: the country panel, diplomacy, the desk, the war map, layers, sortie setup and multiplayer rooms |

`node scripts/deps.js` regenerates `docs/campaign/DEPENDENCIES.md` (who owns and reads which state key).
