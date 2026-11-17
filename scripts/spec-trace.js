#!/usr/bin/env node
/* Builds the requirement traceability matrix for the campaign spec (docs/campaign/spec-v49.md), as the spec's chapter 01 asks:
   one row per requirement block (every "####" heading and every bold-only heading line), with its chapter, the system that owns it
   in this repository today, the roadmap phase (chapter 19), a status and the tests that cover it.
   Output: docs/campaign/traceability.json (machine-readable) and docs/campaign/TRACEABILITY.md (summary + every row).
   Edit OVERRIDES below when a requirement is implemented or decided, then rerun:  node scripts/spec-trace.js */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),SPEC=path.join(root,'docs/campaign/spec-v49.md');
const lines=fs.readFileSync(SPEC,'utf8').split('\n');

// chapter -> [owner in this repository today, roadmap phase from chapter 19, default status, default reason]
const CH={
 '01':['docs/campaign/OWNERSHIP.md (governance)',0,'implement','Phase 0 artifacts: ownership registry and this matrix'],
 '02':['js/campaign/world.js — WORLD event ledger and identities',1,'extend','Phase 1 foundation; slice covers the player side air arm'],
 '03':['js/world/geo.js, worldflight.js, worldmap.js (the Earth); js/core/game.js cmpRaw / cmpH (the 300 km campaign theatre)',4,'defer','Phase 4: rest of global geography (regions, routing, ecology) not started'],
 '04':['js/core/game.js — CAMP.st.t clock, CAMP.tick, CAMP.save; world.js schema v1 + migration',10,'defer','Phase 10: performance tiers, streaming, multi-decade evolution not started'],
 '05':['none (front and escalation only: game.js CAMP, strategic.js)',8,'defer','Phase 8: countries, diplomacy, law and peace processes not started'],
 '06':['js/core/game.js — CAMP ground units, air ops; world.js airframes / aircrew / readiness',3,'defer','Phase 3: the military enterprise beyond the player side air arm'],
 '07':['js/sensors/* (sensor registry, radar, IRST, jamming, NCTR), js/rwr/*',3,'defer','Phase 3+: campaign intelligence, cyber, space, information integrity not started'],
 '08':['none (world.js keeps aggregate casualty estimates only)',6,'defer','Phase 6: population and individuals not started'],
 '09':['none',6,'defer','Phase 6: civil institutions not started'],
 '10':['js/campaign/world.js — depot, production, convoys (supply only)',5,'defer','Phase 5: economy not started beyond the military supply slice'],
 '11':['js/core/game.js — CBASE airfields; campplus.js towns, FARPs',4,'defer','Phase 4: infrastructure networks not started'],
 '12':['js/core/game.js — CAMP.wxStep, seasons, ENV weather',7,'defer','Phase 7: climate, hazards, emergencies not started (weather and seasons exist)'],
 '13':['js/core/game.js — CAMP / CMPUI, js/campaign/campmp.js, strategic.js, campplus.js; world.js sortie + mission records',9,'defer','Phase 9: not started'],
 '14':['js/campaign/world.js losses + js/campaign/warrecord.js LOSSES tab',9,'defer','Phase 9: anti-war presentation, awards, epilogue; loss ledger started'],
 '15':['js/core/game.js — CAMP.airOps, pickHot (scripted AI)',8,'defer','Phase 8: institutional AI not started'],
 '16':['js/core/game.js — CAMP.publish / applyWorld, campmp.js; world.js host-only ledger writes',9,'defer','Phase 9: cooperative command and shared campaigns beyond the existing co-op'],
 '17':['js/core/game.js — CMPUI; js/campaign/warrecord.js',9,'defer','Phase 9: not started'],
 '18':['tests/run.js (cw_* tests)',2,'implement','Integration scenarios: first slice scenarios tested'],
 '19':['docs/campaign/IMPLEMENTATION.md',0,'existing','Followed'],
 '20':['tests/run.js',2,'extend','Gates partly automated (cw_* tests, existing regression suite)'],
};
const SLICE='js/campaign/world.js, js/campaign/warrecord.js';
// [chapter or '*', title regex, status, progress, note, tests]
const OVERRIDES=[
 ['03',/^global geography, map data|one earth-scale geographic|complete earth-scale campaign map|whole-earth terrain, cities|global strategic view|local tactical view/i,'implement','partial','Stage 1 (v326): real Earth in js/world/ — lat/lon frame, streamed 150 m elevation with a bundled global fallback, oceans, airports and runways at real positions, cities and towns from GeoNames / Natural Earth, world map. Not yet: campaign on the Earth, regional view, tile LOD beyond the 170 km mesh',['wg_frame','wg_data','wg_flight']],
 ['03',/persistent entity migration across geographic streaming/i,'implement','partial','Floating-origin rebase shifts every live entity with the frame; no entity is created or dropped by streaming. Campaign entities are not on the Earth yet',['wg_rebase']],
 ['03',/geographic data pipeline, coordinate systems/i,'implement','partial','scripts/build-world-data.js; provenance and licence register in assets/world/SOURCES.md',['wg_data']],
 ['11',/^cities, urban development, buildings|^cities, housing, property/i,'implement','partial','Generated buildings inside real urban footprints and at every town of 1,000+ (GeoNames), sized by population; no housing / property simulation',['wg_flight']],
 ['11',/^civil aviation, airports, and airspace services/i,'implement','partial','7,480 airports with real runways (OurAirports), flyable from the world map; no airport operations or air traffic',['wg_data','wg_flight']],
 ['05',/country, government, and world-order|global world war framework|expanded global country registry/i,'implement','partial','Step 1 (v327, js/war/worldwar.js): every country an actor with profile and alignment history; spec default scenario; REDFOR / BLUEFOR as labels only. Not yet: governments, coalition politics, alignment changes, diplomacy',['ww_registry','ww_fronts']],
 ['05',/a persistent war that keeps moving/i,'implement','partial','Fronts on real borders in 50 km sectors moving gradually (power, air, defence, supply), cities change hands, war diary. Not yet: regions of strategic value, breakthroughs, encirclement, endings',['ww_run']],
 ['13',/^player campaign, missions, career|^mission generation, tasking|dynamic mission generation, campaign tasking/i,'implement','partial','World war step 2 (v328, js/war/warsortie.js): fly for any belligerent from its real military airfields; front, enemy flights and tasking generated from the world-war state; results feed back. Not yet: persistent-need missions, career',['ws_sortie']],
 ['05',/neutral countries, diplomatic pressure|negotiations and diplomacy that can actually end|war termination, ceasefires|peace, capitulation, surrender|ceasefire enforcement, armistices/i,'implement','partial','Step 3 (v330, js/war/diplomacy.js): neutrals debate / support / join from documented partnerships or border incidents, allies leave by separate settlement, local and general ceasefires with violations, armistice / capitulation / frozen endings. Not yet: negotiated treaties with terms, observers as entities, prisoners as records',['wdip_rules','wdip_long']],
 ['14',/end-of-war outcomes and campaign scoring/i,'implement','partial','End-of-war report (cost, lines, cities, alignment changes) and postwar continuation on the war panel. Not yet: awards, memorials, epilogue chapters',['wdip_long']],
 ['14',/^end-of-war outcomes|war conclusion and postwar continuation/i,'implement','partial','v331 (js/war/nations.js): all ten endings the spec lists, each from its own conditions, report with civilian estimates, postwar continuation. Not yet: awards, memorials, epilogue chapters, accountability reviews',['wend_all','wend_home']],
 ['05',/political crises, government continuity|unified national leadership/i,'implement','partial','Public support, stability, regime change with a new government seeking peace (aggregate). Not yet: elections, parties, leaders as people',['wend_all']],
 ['05',/coalition command, interoperability/i,'implement','partial','Coalition cohesion per side (departures, unequal exhaustion, a principal power losing its public). Not yet: caveats, basing rights, interoperability',['wend_home']],
 ['08',/^population, demographics, migration|unified population registry|^families, households, relationships|^labor markets, employment/i,'implement','partial','v332 (js/war/society.js): aggregate cohorts, households, mobilised, unemployment, hospital load, displaced (estimates). Not yet: individuals, families, migration flows as records, education, health system',['s5_society']],
 ['09',/^media, journalism, public information|^information, news, and public reaction|^media ecosystems, journalism|world-war news, public information|media ecosystem structure|continuous newsrooms/i,'implement','partial','v332: three kinds of outlet with framing, claims and corrections; international investigations with findings. Not yet: outlets and journalists as entities, courts and law as institutions',['s5_society']],
 ['10',/^global economy, finance, shocks|^energy shortage chain|^integrated fuel and energy system|^national economies, trade, sanctions|energy security, rationing|^national energy grids/i,'implement','partial','v332 (js/war/economy.js): national energy, fuel, defence industry, transport, food, sanctions cutting trade between sides; effects on front supply, production and support. Not yet: markets, finance, firms, labour',['s5_econ']],
 ['11',/^built environment, utilities, energy|^critical infrastructure networks, lifecycle|^food-water-energy-land|^transport, freight, rail|^multimodal transport/i,'implement','partial','v332: national infrastructure condition, power, transport, food indices damaged and repaired. Not yet: networks, facilities as entities',['s5_econ']],
 ['12',/^weather and atmospheric simulation|^advanced weather, climate interaction/i,'implement','partial','v332 (js/war/seasons.js): seasons by hemisphere, daily theatre weather, mud and snow, flying weather; world flight local time and weather. Not yet: climate change, hazards, emergencies',['s5_seasons']],
 ['15',/^ai decision-making and campaign integration|^national and institutional decision-making|^ai information quality|^unified autonomous ai, institutional|^fuel-aware ai and campaign/i,'implement','partial','v332 (js/war/strategy.js): every country at war decides daily on estimates (fog of war), posture, concentration, mobilisation, calls for help. Not yet: learning, long-term planning, institutions',['s5_strategy']],
 ['05',/law, rules of engagement, and accountability|military and international investigations, evidence|offense-specific classification/i,'implement','partial','v333 (js/war/justice.js): case stages, legal elements, safeguards, allegations, tribunals. Not yet: courts as institutions, witnesses, defence rights, appeals, reparations as records',['s6_justice']],
 ['05',/unified national leadership, government decision-making/i,'implement','partial','v333 (js/war/leaders.js): fictional cabinets with personalities that shape decisions, succession, assassination attempts as abstract events. Not yet: elections, parties, legislatures',['s6_leaders']],
 ['05',/enemy-driven civilian intimidation/i,'implement','partial','v333: abstract intimidation policy under scenario conditions, consequences, protective tasking',['s6_justice']],
 ['06',/military personnel records, crew rosters|^military command, personnel, careers/i,'implement','partial','v333: ranks by national tradition, front commanders relieved / promoted / killed, player service record',['s6_leaders']],
 ['03',/^persistent and varied global campaign map/i,'implement','partial','v333 (js/world/wtrees.js): forests with collision proxies. Not yet: roads, rivers, land cover data',['s6_world']],
 ['06',/^armed forces, command, personnel, equipment|^equipment readiness, maintenance, ground-force organization|^persistent military bases, airbases, squadrons/i,'implement','partial','v334 (js/war/orbat.js, gfight.js): squadrons at real airfields, brigades and battalions on fronts as the allocation of national totals; ground combat on sorties. Not yet: naval forces, maintenance and logistics per unit, training pipeline',['s7_orbat','s7_ground']],
 ['06',/naval task force, fleet readiness|global maritime war/i,'implement','partial','v335 (js/war/naval.js): fleets, maritime theatres, sea control, blockades, ships on sorties. Not yet: ships as named entities, ports, convoys, submarine warfare detail',['s8_naval']],
 ['11',/^ports, shipping, maritime operations|^maritime transport, ports, merchant shipping/i,'implement','partial','v335: blockades cut seaborne imports. Not yet: ports and merchant shipping as entities',['s8_naval']],
 ['13',/^player pilot recovery, capture, and return/i,'implement','partial','v335 (js/war/csar.js): ejection judged against the front, CSAR missions, evasion, capture, prisoner status, exchanges. Not yet: flying the CSAR yourself, downed-pilot gameplay',['s8_csar']],
 ['12',/natural hazards|emergenc|humanitarian response|disaster/i,'implement','partial','v336 (js/war/hazards.js): hazards by region and season, emergency response, aid, humanitarian pauses, recovery (estimates). Not yet: emergency services as entities, shelters, evacuation logistics',['s9_hazards']],
 ['11',/^transport, freight, rail|^railways and strategic rail/i,'implement','partial','v336 (js/world/wnet.js, js/war/supply.js): roads, rivers, bridges as targets cutting front supply. Not yet: rail network, freight flows',['s9_net','s9_supply']],
 ['06',/^equipment condition, maintenance, and lifecycle|spare parts, component health/i,'implement','partial','v336: unit readiness from operations, rest, spares and supply. Not yet: individual equipment condition',['s9_supply']],
 ['01',/./,'implement','done','Ownership registry docs/campaign/OWNERSHIP.md; this matrix',[]],
 ['02',/canonical entities, identities|single authoritative campaign data model|one coherent world simulation/i,'extend','partial','Stable ids for airframes, aircrew, squadrons, missions, sorties, shipments, events ('+SLICE+'). Countries, settlements, organisations: later phases',['cw_ledger','cw_save']],
 ['02',/shared events, causality/i,'implement','partial','Event contract (id, schema v, type, domain, time, actor, entities, causes, confidence, idempotency key); cause chains in HISTORY "why"; no dependency graph yet',['cw_idempotent','cw_ledger']],
 ['02',/shared infrastructure, shipment, personnel, event, mission/i,'implement','partial','Shipment, personnel, event and mission entities implemented for the slice; infrastructure and network entities deferred',['cw_supply','cw_air']],
 ['02',/world-state consistency, accounting|accounting, counters|global force accounting|casualty, loss, damage|personnel strength/i,'implement','partial','Supply ledger reconciles (init + produced = held + transit + on board + used + lost + captured); audit every 10 campaign minutes; airframe and crew counts',['cw_ledger','cw_supply','cw_base_fall']],
 ['02',/permanent world history|live campaign event feed|after-action|campaign chronology|campaign events and strategic/i,'extend','partial','Bounded event ledger with folded counts; sortie debriefs; HISTORY tab with filters',['cw_ui']],
 ['04',/authoritative world clock/i,'existing','done','CAMP.st.t is the one clock; world.js only reads it and processes scheduled items at their own times during time skips',['cw_supply']],
 ['04',/count integrity, data ownership/i,'implement','partial','Field counts are a projection of the airframe ledger; the ledger audit checks them',['cw_ledger']],
 ['04',/campaign persistence|versioned save|crash safety|deterministic event replay/i,'extend','partial','st.wld schema v1, migration from older saves without invented history, in-flight aircraft resolved after a crash; replay not implemented',['cw_save']],
 ['06',/airbases|sortie lifecycle|squadron continuity|^equipment condition, maintenance|^equipment readiness, maintenance|military personnel records, crew rosters|personnel recruitment, replacement|pilot down, search and rescue|spare parts, component health/i,'extend','partial','Airframes with tail numbers, maintenance turnaround, crew rest, pilot fate states (killed / missing / captured / wounded / medically withdrawn)',['cw_air','cw_player_loss']],
 ['10',/logistic|supply|convoy|shipment|inventor/i,'implement','partial','Depot, production rates, convoys with risk near the front, delivery only on arrival',['cw_supply']],
 ['07',/^radar, sensors|unified sensor, radar|radar, iads|radio communications, electronic warfare/i,'existing','partial','Aircraft and ground radar, SAM, AWACS, jamming, IRST, RWR exist (js/sensors, js/rwr); campaign-level picture not linked to the ledger yet',[]],
 ['13',/mission generation, tasking|missions and player interaction|briefings, debriefings/i,'existing','partial','Existing tasking (CAS / SEAD / STRIKE / CAP / INTERCEPT / ESCORT) and debrief grading; mission and sortie records now persist in the ledger',['cw_air','cw_player_loss']],
 ['13',/player pilot recovery, capture|player pilot career, service record/i,'extend','partial','Player pilot is a person record with a service history; ejection over enemy territory leads to missing / rescued / captured; succession when your pilot is lost. No downed-pilot gameplay or CSAR missions yet',['cw_player_loss']],
 ['14',/death records|cemetery|memorial/i,'implement','partial','LOSSES tab: both sides, estimates labelled, the fallen listed by (fictional) name; no cemetery or epilogue yet',['cw_ui']],
 ['16',/authority, synchronization|multiplayer authority, cooperative play/i,'extend','partial','Co-op host is the only ledger writer; clients render the read model the host sends. Peers\' own sorties are not tracked by airframe yet',[]],
 ['17',/squadron readiness board|unit, personnel, platform, and facility information cards|integration with the existing campaign interface/i,'extend','partial','WAR RECORD panel on the CAMPAIGN tab: fields (stock, convoys), roster, sorties, history, losses, audit',['cw_ui']],
 ['17',/developer diagnostics|campaign\/entity\/event inspection|simulation observability and explainability/i,'extend','partial','Ledger audit, "why" cause chains on events, WORLD.explain(id) in the console',['cw_ui','cw_ledger']],
];
const rows=[];let ch='00',chTitle='',sec='';
for(let i=0;i<lines.length;i++){const L=lines[i];let m;
  if((m=/^## (\d\d)\. (.+)$/.exec(L))){ch=m[1];chTitle=m[2];continue;}
  if((m=/^### (.+)$/.exec(L))){sec=m[1];continue;}
  let title=null,kind=null;
  if((m=/^#### (.+)$/.exec(L))){title=m[1];kind='group';}
  else if((m=/^\*\*([^*]+)\*\*$/.exec(L.trim()))){title=m[1].replace(/[:.]$/,'');kind='block';}
  if(!title||ch==='00')continue;
  const d=CH[ch];let status=d[2],progress=status==='existing'?'partial':'none',note=d[3],tests=[];
  for(const [c,re,s,pg,n,t] of OVERRIDES)if((c===ch||c==='*')&&re.test(title)){status=s;progress=pg;note=n;tests=t;break;}
  rows.push({id:'R'+ch+'-'+String(rows.filter(r=>r.chapter===ch).length+1).padStart(3,'0'),chapter:ch,chapterTitle:chTitle,section:sec,title,kind,line:i+1,
    owner:d[0],phase:d[1],status,progress,note,tests});}
fs.writeFileSync(path.join(root,'docs/campaign/traceability.json'),JSON.stringify({spec:'docs/campaign/spec-v49.md',generated:'scripts/spec-trace.js',statuses:['existing','extend','implement','defer','unsupported','conflict'],rows},null,1));
const by={};for(const r of rows){const k=r.chapter;by[k]=by[k]||{t:r.chapterTitle,n:0,s:{},p:{}};by[k].n++;by[k].s[r.status]=(by[k].s[r.status]||0)+1;by[k].p[r.progress]=(by[k].p[r.progress]||0)+1;}
let md='# Requirement traceability — campaign spec v49\n\nGenerated by `node scripts/spec-trace.js` from `docs/campaign/spec-v49.md`. Do not edit by hand: change the OVERRIDES table in the script.\n\n'+
 'One row per requirement block of the spec. **status** is the decision (existing / extend / implement / defer / unsupported / conflict); **progress** is what is actually in the code (none / partial / done). A row marked *partial* is not complete: read its note.\n\n'+
 '## Summary by chapter\n\n| Ch | Chapter | Blocks | Status | Progress |\n|---|---|---|---|---|\n';
for(const k of Object.keys(by).sort()){const b=by[k],f=o=>Object.entries(o).map(([a,n])=>a+' '+n).join(', ');md+='| '+k+' | '+b.t+' | '+b.n+' | '+f(b.s)+' | '+f(b.p)+' |\n';}
md+='\nTotal: '+rows.length+' blocks; '+rows.filter(r=>r.progress!=='none').length+' with code behind them (partial or done), '+rows.filter(r=>r.status==='defer').length+' deferred with a phase and reason.\n\n## Explicit scope exclusions (unchanged)\n\nILS, VOR, TACAN, NDB, DME, RNAV procedures and instrument approaches are not added. No user-facing world / scenario editor. The radar and sensor architecture is extended, never replaced.\n\n## All rows\n\n| Id | Line | Requirement | Owner today | Phase | Status | Progress | Note | Tests |\n|---|---|---|---|---|---|---|---|---|\n';
const cell=s=>String(s).replace(/\|/g,'\\|');
for(const r of rows)md+='| '+r.id+' | '+r.line+' | '+cell(r.title)+' | '+cell(r.owner)+' | '+r.phase+' | '+r.status+' | '+r.progress+' | '+cell(r.note)+' | '+r.tests.join(' ')+' |\n';
fs.writeFileSync(path.join(root,'docs/campaign/TRACEABILITY.md'),md);
console.log(rows.length+' rows · '+rows.filter(r=>r.progress!=='none').length+' with code · '+rows.filter(r=>r.status==='defer').length+' deferred');
