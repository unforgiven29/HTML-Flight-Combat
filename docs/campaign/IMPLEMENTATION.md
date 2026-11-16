# Campaign spec v49 — implementation report

The spec (`docs/campaign/spec-v49.md`) is a specification, not evidence of code. This file records what is actually built,
following the spec's chapter 19 order: audit first, foundations second, one vertical slice third. Never everything at once.
Requirement-by-requirement status: `docs/campaign/TRACEABILITY.md` (generated). Who owns what: `docs/campaign/OWNERSHIP.md`.

## Phase 0 — repository audit (v324 baseline)

What the campaign already had, all in `js/core/game.js` (`CAMP`, `CMPUI`) plus wrappers in `js/campaign/`:

- one 300 km fictional theatre (`cmpRaw` / `cmpH`), 6 airfields (`CBASE`, 8 with campplus.js), a 12-point front (`CFX`), seasons that turn ten days per campaign day, weather that follows the season;
- ground war: tanks / IFVs / APCs / infantry / artillery per sector, hot sectors, reserves, front movement;
- air war: AI CAP, intercepts, strikes, escorts, AWACS (campaign layers), strategic bombers and a rare nuclear escalation (strategic.js), Shahed / FPV drones (campplus.js);
- tasking (CAS / SEAD / STRIKE / CAP / INTERCEPT / ESCORT) with a debrief grade (campmp.js), time skips, co-op where the host runs the war;
- save: one JSON per team in localStorage (`viper.camp` / `viper.camp.red`), schema `v:3/4`, export / import.

Gaps against the spec's foundations:

- aircraft were a number per field (`pool`) that **regenerated for free** (+1.1 an hour per field, both sides): unlimited resource creation;
- no individual aircraft or aircrew, no fuel or munitions accounting, no supply;
- history was a 40-line text log with no ids, causes or confidence;
- AI aircraft still flying when a sortie ended were deleted with the scene, and their airframes never came back (a leak);
- a legacy bug: a field flipped owner every half second while the front sat within 2.5 km of it (both tests true at once).

Baseline regression run before any change: **127 / 132 checks pass**. The five failures are pre-existing: F-22 head-on ACM lock (2), Ka-50 gentle landing, Ka-50 DIRCM, TGP manual slew.

## Phase 1 — foundations (v325)

`js/campaign/world.js`, loaded **last** (after `addons-v324.js`) so it is the outermost wrapper of `CAMP` and `Jet.prototype.kill`.

- **Event contract**: `{id, v (schema), ty (type), dm (domain), t (campaign h), a (actor), e (entity ids), c (cause ids), cf (CONFIRMED / ESTIMATED / REPORTED), txt, d, loc, k (idempotency key)}`. A keyed event is applied once (`cw_idempotent`). The newest 700 events are kept in full; older ones are folded into per-type counts and the number folded is shown.
- **Identities**: airframes (tail numbers), aircrew (clearly fictional generated names), squadrons, missions, sortie records, shipments. Ids never change when location or status changes.
- **Ledgers**: fuel (kg), air-to-air missiles, air-to-ground stores, spares. Per commodity: `init + produced = depot + fields + in transit + on board + used + lost + captured`.
- **Audit** (`WORLD.audit()`, every 10 campaign minutes, and the AUDIT tab): ledger balance, negative stock, duplicate tails or event ids, airframes at fields we do not hold, stores on board grounded aircraft, impossible crew states, stale field counts, orphan references.
- **Save**: `st.wld` with schema version 1 inside the existing save (no change to `v:3/4`, so old loaders and export / import keep working). A save from before v325 is migrated by counting what it holds, plus one `MIGRATION` event saying nothing before it was recorded. Aircraft "in the air" in a save taken mid-sortie are resolved on the averages at load.
- **Co-op**: only the host writes the ledger. Clients get the read model (`wrv` message every 40 world publishes) and render it.

## Phase 2 — vertical slice (v325)

One airbase-to-mission-to-history loop on the player's side, using the existing gameplay:

- **Airframes**: each of our fields starts with its old `pool` as real airframes (about 55 % fighter, 45 % strike types from the era's order of battle). `pool` is now the number of READY airframes there. AI flights take real airframes and named crews; the player's sortie takes an airframe of the type picked in the hangar, or a ferry from the depot if the field has none of that type (instant: an abstraction for player choice). With none at the field and none at the depot, the sortie is refused.
- **Maintenance**: 2-4 h after every flight; battle damage adds up to about 30 h and uses spares. Crews rest 1.5 h after a sortie.
- **Finite stock**: a sortie draws fuel and stores from its field. A field short of missiles or bombs strips them from the load (A/G first, then AAM). With under 2.5 t of fuel the field cannot launch the player; AI flights need 3 t per aircraft. What comes back is returned to the field it lands at; what was fired or burnt is "used"; what goes down with an aircraft is "lost".
- **Supply**: a rear depot (south edge of the map) gains stock each campaign hour (abstract national production and training). Every 3 h a convoy leaves for each field below its target stock, at 45 km/h. Near the front it can be hit from the air (partial or total loss). Stock exists at the field only when the convoy arrives. A field that falls loses its stock; convoys bound for it divert.
- **Replacements**: a field holding fewer than 6 airframes gets a ferried replacement (1 h), and a field short of crews gets a new pilot from the training pipeline, as long as the depot has them.
- **Crew fate** (gameplay rules): no ejection = killed. Ejection over our side = recovered (30 % wounded, of whom 20 % are medically withdrawn from flying). Ejection over their side = missing, resolved 6-36 h later: rescued (55 % within 6 km of the line, else 25 %) or captured. Ejections come from the existing seat model (addons-v324: 95 % for the player, 40-60 % for AI).
- **Player pilot**: a person record with a service history. If your pilot is resting, wounded or missing, a squadron pilot flies in your place (you are told). If your pilot is killed, captured or medically withdrawn, a squadron pilot takes over as you, and the record says so.
- **Mission and sortie record**: mission (from the tasking, or FREE), pilot, tail, field out and in, times, kills, stores issued and used, outcome, pilot fate, mission result from the existing debrief grade, and the ledger event ids.
- **Opposing side**: aggregate. Its free regeneration now draws on a finite airframe reserve (50, plus 1 every 3 h). Its aircrew losses are counted from the simulated ejections (killed / captured by us / back over their lines).
- **Ground casualties**: an **estimate** from vehicle crew sizes (about 40 % killed, 45 % wounded), summarised once per campaign hour, labelled ESTIMATED everywhere.
- **WAR RECORD panel** (CAMPAIGN tab, collapsible): FIELDS, ROSTER, SORTIES, HISTORY (filters, click an entry for its cause chain), LOSSES (both sides; estimates and the simulation's own enemy figures are labelled; the fallen by name), AUDIT.
- **Legacy fixes**: AI aircraft airborne at sortie end are recovered off-screen instead of deleted. Field ownership has 5 km hysteresis (no more flipping every step).

All constants are in `WORLD.CFG` (`js/campaign/world.js`). They are gameplay-level estimates, not published data.

## Tests

`node tests/run.js cw_` runs the campaign-world checks (9 tests, 33 checks):
`cw_ledger`, `cw_idempotent`, `cw_air`, `cw_player_loss`, `cw_finite`, `cw_supply`, `cw_base_fall`, `cw_save`, `cw_ui`.

## Known limitations (not done in this slice)

- The opposing side has no airframe or crew identities (aggregate only); its stock of fuel and munitions is not modelled.
- Strategic bombers on our side are not tracked by tail (strategic.js draws them from `pool` and returns them).
- Field damage (`dmg`) still repairs itself without spares or engineers.
- Co-op: peers' own aircraft are not tied to airframes; only the host's sortie and the AI are.
- Pilot rescue is resolved on the averages; no downed-pilot gameplay or CSAR mission yet (spec chapter 06 / 13).
- Mission records come from the existing tasking; no persistent-need mission generation yet.
- No replay, no dependency graph, no per-faction knowledge (the HISTORY tab shows the simulation record).
- Everything in phases 3-10 (military enterprise beyond the air arm, global geography, economy, people, institutions, environment, institutional AI, the anti-war epilogue, performance tiers): see TRACEABILITY.md.

## Suggested next slices (chapter 19 order)

1. Phase 2 completion: tie co-op peers to airframes; make field repair use spares; the opposing side's fuel and munitions as aggregates.
2. Phase 3: SAM batteries as component records (radar / launchers / missiles with reloads), ground-unit supply (fuel and ammunition drawn from the same depot), CSAR missions generated from MISSING aircrew.
3. Phase 9 early pieces that need little new simulation: awards and service record from the sortie ledger, campaign-end report built from the loss ledger (chapter 14).
