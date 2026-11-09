# Changelog

## v215 — bug-report pass (11/08) and five new jets

### Bug reports (`bug reports/bugs.txt`)
1. **Tab in STT** — Tab no longer steps to another target while a single-target track is held (pilot radar and the AI back-seater). Break lock first.
2. **COOP + IRST (Russian jets)** — with the IRST selected, COOP no longer feeds radar-only contacts into the IRST picture, so nothing can be locked that the IRST itself does not show. COOP still hands a held lock between the sensors and ranges it.
3. **Helmet sights** — only where the real jet has one: MiG-29 / 29S / 29SMT, Su-27 / 27SM / 33 / 30SM / 30MK2 / 35S (Shchel-3UM / Sura), and JHMCS on the modern-era F-16C, F-15C, F-15E, F/A-18C, F/A-18E. Removed from the F-4E, F-14A/B/D, F-16A ADF, MiG-21bis, MiG-23ML, MiG-25PD, MiG-31.
4. **Multiplayer** — joining is retried (stale room ids no longer kill the first attempt), STUN/TURN servers added for strict routers, heartbeats detect dead links in ~10 s, the broker connection re-signs itself, clients reconnect on their own when the host drops (free-for-all rooms hand the host role over; co-op wars wait for their host), and state packets are dropped instead of queued when a link is backed up. **Not tested over a real network from the build environment — needs a check with two machines.**
5. **Own tracers** — rounds are visible from the cockpit (they used to live for 17 ms and be sub-pixel).
6. **REDFOR campaign map** — the warships follow the sea when the theatre is rotated (existing saves are corrected on load).
7. **CCIP** — none on the F-4E and MiG-21bis: fixed manually depressed pipper instead (bombs 140 mil, rockets 35 mil).
8. **F-14** — HUD glass tint shrunk to the round ~15° field, TCS picture is green, the HUD shows STT targets only (TWS hooks stay on the TID).
9. **MiG-21bis RP-22** — the strobe moves in range only; lock takes the return inside the gate.

### New aircraft
| Jet | Built from | What is its own | What is still borrowed |
|---|---|---|---|
| MiG-31 | MiG-25PD | D-30F6, weights, Zaslon PESA (10 tracks / 4 engaged), 8TP IRST, R-33, GSh-6-23, belly stations, navigator | MiG-25 outer shape and front cockpit, SPO-10 display |
| F-14D | F-14B | APG-71, AAS-42 IRST alongside the TCS, weights, AIM-54C/7M/9M | AVG-12 HUD and analogue cockpit of the A/B (the D's digital HUD and MFDs are not built) |
| Su-35S | Su-27SM | AL-41F1S, weights, Irbis-E, OLS-35, Su-30SM weapons list | Su-27SM glass cockpit (three MFIs instead of two MFI-35), no thrust vectoring yet |
| Su-30MK2 | Su-27SM | weights, N001VEP, operator in the back seat | single-seat outer shape |
| MiG-29SMT | MiG-29S | fuel, Zhuk-ME (4-target TWS), R-27ER/ET | analogue 9.13 cockpit (no MFDs), no guided A/G stores |

### Crews
`CREW` table: F-4E, F-14A/B/D, F-15E, Su-30SM, Su-30MK2, MiG-31 all fly with an AI back-seater; `[6]` takes the sensors. A second *human* in the back seat is not implemented.

## v216 — cockpits for the new jets
- **Su-35S**: two landscape МФИ-35 filling the board (main page + data column on each), ПУИ-35 keyboard/display under the HUD, small standby display top right, warning-lamp blocks; round gauges removed. After the Su-35 board diagram (S3-A-31-11).
- **Su-30MK2** front seat: two МФИ-10-5 with the analogue centre column between them (airspeed, altimeter, AoA/G; attitude indicator over the course indicator), ДОЗАПРАВКА panel, clock and variometer bottom left, two temperature gauges and the twin tachometer bottom right, 23-02-01 lamp block. After РЛЭ Су-30МК2 Приложение 1. Back-seat board not built.
- **F-14D**: digital HUD on a framed wide combiner; three MFDs (VDI and HSD positions plus a third on the right), each switchable VDI / HSD / SMS / ENG from its bottom keys. The HUD currently uses the Hornet's symbology layout.

## v217 — Su-27SM board after the real cockpit
Two wide (4:3) МФИ-10-5 and the narrower centre МФИ packed edge to edge across the board, round push-buttons, warning-lamp block top right. The square pages sit in the middle of the wide screens with flight / target data (left) and fuel / expendables / gun (right) in the side strips.

## v218 — MiG-31 crew split and pilot cockpit
- The navigator owns the Zaslon. Front-seat radar keys become requests (Enter lock, Tab next, U drop, 4 TWS); range, cursor, sensor and mode keys are his only. `[6]` no longer hands the radar over.
- Pilot board after the MiG-31 cockpit photos: turquoise, analogue flight group (airspeed/Mach, altimeter, variometer, AoA-g column; attitude indicator over the ПНП), ИПВ tactical indicator showing the navigator picture (tracks, priority target, lock, ПР launch-permitted cue), lamp block, tachometer, temperatures, fuel, clock, HUD control box with digital strip.
- Not changed: HUD (still the MiG-25 sight), side consoles; the navigator cockpit is not a flyable view.

## v219 — MiG-31 SPO-15LM and HUD
- MiG-31 uses the SPO-15LM (lamp unit top right of the pilot board); the MiG-25 / MiG-23 keep the SPO-10.
- New MiG-31 HUD after the HUD photo: mode legend (НАВЕД / ОБЗОР / ЗАХВ), heading arc with pointer, speed scale left, altitude scale right (km), aircraft symbol with bank-turning horizon bars, centre pitch marks, 0-100 launch-range scale with caret and ПР cue, lock square, weapon legend. Drawn on the existing (MiG-25-size) combiner.
