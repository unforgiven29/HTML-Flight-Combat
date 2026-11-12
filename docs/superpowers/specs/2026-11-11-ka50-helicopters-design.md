# Helicopters and the Ka-50 — design

Status: approved in chat 2026-11-11 (staged plan, `Heli` flight model hooked into `Jet`).
All numbers are gameplay-level estimates after the DCS Ka-50 Black Shark 3 flight manual and the DCS Ka-50 guide, not published data.

## Goal
Add rotorcraft to Viper Sortie, starting with the Ka-50 "Black Shark": a single-seat coaxial attack helicopter with a 1:1 cockpit,
a real rotor model, and the Ka-50 weapons and sensors, flyable in the same scenarios as the jets.

## Constraints
- Project rule: cockpits 1:1, everything realistic and accurate, nothing faked.
- Reuse `Jet` (stores, HP, countermeasures, sensors, netcode). Do not fork the aircraft pipeline.
- No commit/push unless asked. Work lives on branch `ka50`.

## Architecture
- `js/heli.js` — `HELI` module. `Jet.prototype.step` is wrapped: aircraft with `ac.heli` run `HELI.step` instead of the fixed-wing model.
  Also registers the Ka-50 (clone of the Su-25 tables, then overridden), builds the procedural model, binds the engine start key.
- Rotor model (per step): blade-element thrust coefficient `CT = k(2θ/3 − λ)` with saturating blade stall, Glauert induced velocity
  with ground effect, Johnson vortex-ring and windmill-brake branches, power from `T(vi+Vc)` + profile + parasite, engine governor and
  rotor-speed energy equation `IΩ dΩ/dt = Pe − Pr`. This gives hover ceiling, translational lift, power droop, vortex ring and autorotation
  without scripting any of them.
- Attitude: body-rate dynamics with SAS attitude hold (cyclic centred holds attitude); pedals command yaw rate with heading hold at low speed,
  fin weathercock at speed. Rotor thrust acts along the rotor axis, so translation comes from tilt, as in the real aircraft.
- Ground: contact on the wheels, rolling friction, brakes, nose-wheel steering, hard-landing and rollover damage.
- `js/ka50pit.js` — Ka-50 cockpit (`ck.ka50`), built from the manual's instrument-panel figures; `selectCockpit` toggles every cockpit root.

## Stages (one version each)
1. Flight model, controls, ground handling, procedural model with coaxial rotors, cockpit shell with the flight instruments.  ← this commit series
2. Full cockpit systems, start-up procedure, autopilot channels (ABRIS, PVI-800, hover hold, route, descent).
3. Weapons: 2A42 on its movable mount (AP/HE, high/low rate), Vikhr, S-8, S-13; Shkval-V; SPO-15, L-140, UV-26.
4. Hangar and loadout screen, AI Ka-50, campaign, multiplayer, K-37 ejection with blade jettison.

## Stage 1 acceptance
- Ka-50 appears in the hangar, spawns on the apron, engines running, rotors turning.
- Collective (R/F), cyclic (W/S/A/D), pedals (Q/E): hover, translational lift, forward flight to ~350 km/h, climb to the 5,500 m ceiling at light weight.
- Engine-out autorotation is survivable; rapid collective pull droops rotor RPM; steep slow descent enters vortex ring.
- Hard landing / rollover damages or kills; normal landing on the wheels works.
- Test suite passes; hover, forward flight and autorotation have regression tests.
