# Campaign ownership registry

Spec v49, chapter 01: every persistent concept has exactly one authority. A module may read or project another module's
data, but it does not write it. This table is the registry; update it in the same commit as any change of ownership.

"Projection" means a value derived from the authority and safe to rebuild. "Aggregate" means a count is kept instead of
individual records (the spec allows this where individual detail is not needed).

| Concept | Authority (the only writer) | Where it lives | Read / projected by |
|---|---|---|---|
| World clock (campaign hours) | `CAMP.tick`, `CAMP.advance` | `js/core/game.js` → `CAMP.st.t` | world.js (reads only; processes scheduled items at their own timestamps during time skips), CMPUI, seasons, weather |
| Theatre terrain, map coordinates | `cmpRaw` / `cmpH` | `js/core/game.js` | everything spatial |
| Front line, sectors, ground units | `CAMP.groundStep`, `CAMP.addUnit`, `CAMP.dmgUnit` | `js/core/game.js` → `st.front`, `st.units` | world.js (ground-loss estimates), CMPUI |
| Airfield ownership and damage | `CAMP.groundStep` (fall / capture, with hysteresis since v325), `CAMP.adKilled`, raid code | `js/core/game.js` → `st.bases[].side / .dmg` | world.js (`baseFell` reacts to a change of side) |
| **Airfield aircraft count `st.bases[].pool`, player side** | **projection** of the airframe ledger | world.js `syncPools` | legacy AI launch code, CMPUI, campmp theatre panel |
| Airfield aircraft count, opposing side | `CAMP.launch` / `CAMP.land` / legacy regen, **gated by** world.js `redPoolGate` | `st.bases[].pool` | — (aggregate; regen draws from `st.wld.red.af`) |
| Airframe identity, state, location (player side) | world.js | `st.wld.af` | warrecord.js |
| Aircrew identity and status (player side), the player's pilot | world.js | `st.wld.pp`, `st.wld.player` | warrecord.js |
| Squadrons | world.js | `st.wld.sq` | warrecord.js |
| Fuel, AAM, A/G stores, spares at fields and the depot | world.js | `st.wld.inv`, `st.wld.depot` | warrecord.js |
| Stores on board a flying aircraft | world.js (`issue` at launch, `settle` at landing or loss) | `st.wld.onb` | audit |
| Shipments (convoys) | world.js | `st.wld.sh` | warrecord.js |
| Supply ledger (produced / used / lost / captured) | world.js | `st.wld.lg` | `WORLD.audit()` |
| Opposing side airframe reserve, aircrew losses | world.js (aggregate) | `st.wld.red` | warrecord.js |
| Ground personnel casualties | world.js (**estimate** from vehicle crew sizes) | `st.wld.gl` | warrecord.js (labelled as estimate) |
| Events, causes, idempotency keys | world.js `emit` | `st.wld.ev` (bounded), `st.wld.fold` (counts of folded events) | warrecord.js HISTORY, `WORLD.explain(id)` |
| Missions and sortie records | world.js | `st.wld.ms`, `st.wld.so`, `st.wld.soL` | warrecord.js SORTIES |
| Mission grade (did the task succeed) | campmp.js `grade()` (exposed as `CAMP._lastGrade`) | — | world.js mission record |
| Text war log (radio messages, 40 lines) | `CAMP.log` | `st.log` | CMPUI (unchanged; it is a presentation feed, not the history) |
| Weather, season | `CAMP.wxStep`, `CAMP.applySeason` | `st.wx`, `CAMP.clock()` | ENV |
| Escalation (DEFCON, nuclear) | strategic.js | `st.esc` | — |
| Sensors, radar, RWR, jamming, IRST | `js/sensors/*`, `js/rwr/*` | sensor registry | not yet linked to the ledger |
| The Earth: geographic frame, elevation, places, airports, countries, borders | `WGEO` (`js/world/geo.js`) | `assets/world/*` + streamed tiles | worldflight.js, worldmap.js, worldwar.js |
| World-war state: country registry, alignments and their history, national profiles (estimates), fronts and sector offsets, air theatres, city control, war events | `WWAR` (`js/war/core/worldwar.js`) | `localStorage viper.ww` (schema v1) | warmap.js (map layer, panel) |
| World-war seasons and theatre weather | `js/war/world/seasons.js` | `st.th[].wx / .season` | WWAR (air attrition, front mobility), world flight (time of day, weather, snow) |
| National economy and infrastructure (energy, fuel, industry, transport, food, infrastructure) | `js/war/society/economy.js` | `st.c[].ecn` | WWAR.mod (front supply), production, support |
| Government, mobilisation, strategic decisions (posture, concentration, estimates, calls for help) | `js/war/military/strategy.js` | `st.c[].govt`, `st.fronts[].post / .w / .est` | WWAR.mod, panel |
| Population, households, media reports, investigations | `js/war/society/society.js` | `st.c[].soc`, `st.soc` | panel (reports never change events) |
| Leaders, commanders, ranks, abstract incidents, your service record | `js/war/society/leaders.js` | `st.lead`, `st.c[].ldr`, `st.fronts[].cmd` | strategy (caution / resolve), diplomacy (pragmatism), panel |
| Legal cases, allegations, intimidation policy, tribunals | `js/war/society/justice.js` | `st.law` | panel |
| Infrastructure targets, civilian harm records | `js/war/military/targets.js` | `st.tg`; ground objects in GND | economy (damage), justice (cases), leaders (inquiries) |
| Forests and tree collisions | `js/world/wtrees.js` | generated per geographic cell (not saved) | world flight |
| Order of battle (squadrons, brigades, battalions): the detailed allocation of `p.air` / `p.gnd`, never a second total | `js/war/military/orbat.js` | `st.ob` | warsortie (flights from squadrons), gfight (companies from brigades), panel |
| Ground combat on sorties | `js/war/military/gfight.js` | GND units (not saved) | brigades (losses) |
| Fleets, sea control, blockades, ships on sorties | `js/war/military/naval.js` | `st.c[].nav`, `st.navy` | economy (imports), fronts (amphibious threat), panel |
| Downed pilots, CSAR, prisoners, exchanges | `js/war/military/csar.js` | `st.csar` | service record (leaders.js) |
| Roads, rivers, bridges (map) | `js/world/wnet.js` | regional tiles | supply.js (bridges as targets) |
| Bridge cuts, unit readiness and supply | `js/war/military/supply.js` | `st.br`, unit `ready` | WWAR.mod, squadronFor |
| Natural hazards, emergency response, aid, recovery | `js/war/world/hazards.js` | `st.hz` | economy, population, support |
| World-war clock | `WWAR.step` (`st.t`, hours since the scenario start) | `viper.ww` | warmap.js. **Separate from `CAMP.st.t` until step 2 joins the theatre campaign to the world war** |
| Co-op campaign state | the host (`CAMP.publish`) | — | clients apply it; the ledger read model goes out as `wrv` every 40 publishes; clients never write the ledger |

## Rules that keep this true

- Commodity totals reconcile: `init + produced = depot + fields + in transit + on board + used + lost + captured`, per commodity. `WORLD.audit()` checks it every 10 campaign minutes; the WAR RECORD → AUDIT tab shows the result.
- A legacy writer that lowers our `pool` (time-skip raids, bombs near the hangars, Shahed hits, the nuclear strike) is measured against the value the projection last wrote. Fractions accumulate per field; every whole 1.0 becomes one recorded airframe loss. Heavy bombers (B-52 / Tu-95, strategic.js) are exempt: they are not squadron airframes.
- Persistent records are never deleted on loss: airframes become `LOST` / `CAPTURED`, people become `KIA` / `MISSING` / `CAPTURED` / `WOUNDED` / `MEDWD`. Finished shipments are removed 24 h after arrival; their events stay in the ledger.
- History is not rewritten. A save from before v325 gets a `MIGRATION` event saying that nothing before it was recorded.
