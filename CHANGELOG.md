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

## v220 — electronically scanned radars, Zaslon TWS, 8TK
- **PESA / AESA behave as arrays, not fast dishes**: no sweep. The beam steps through a raster of beam positions (PESA ~8.5 ms dwell, AESA ~4.5 ms), so frame time = positions × dwell. The timeline is shared with track dwells: in TWS each file gets its own dwell at its predicted position (PESA every 0.4 s, AESA every 0.2 s; AESA also in search), and a target that jinks out of the predicted beam misses its update. In STT the set keeps a search raster running around the cursor, so the picture is not lost on lock. Applies to Zaslon, N011M, Irbis-E, APG-79 and any set flagged `pesa`/`aesa`. Mechanical sets unchanged.
- **MiG-31 Zaslon TWS**: the navigator now runs track-while-scan (СНП), 10 files, up to 4 targets engaged at once — R-33s guide on their own track files, not just the bugged one. Pilot's radar keys (TWS / lock / next / drop) are passed to the navigator as requests.
- **8TK** (was mislabelled 8TP): works jointly with the Zaslon (lock hand-over both ways, radar ranges the IR track) and runs its own passive search; its bearings show on the tactical displays.
- **MiG-31 pilot's ИПВ**: larger, full tactical picture — scan sector and the stepping beam, track files with velocity vectors and altitude, bug / lock symbols, engaged-target numbers 1–4, jamming strobes, 8TK bearings, track count.

## v221
- **MiG-31**: the pilot's radar scope (ИПВ) is removed from the front-seat board; the pilot never had one. The panel is blank where it was. The navigator still runs the radar and the pilot's HUD / lamp block are unchanged.

## v222 — array radars detect again
- v220's beam-stepping gave each beam position a single look at coarse spacing (0.85 beam), so targets between positions lost 5 dB and marginal / look-down targets were often missed. Beam positions now overlap at 0.6 beam, and each dwell integrates several pulse-burst looks (AESA 4, PESA 3) with shorter dwells (AESA 3 ms, PESA 6 ms). Measured against v219 on F/A-18E, MiG-31 and Su-35S at 50-95 % of detection range, level and ±3 km: equal or faster than v219 in RWS and TWS.

## v223 — F-14D pilot cockpit rebuilt after NAVAIR 01-F14AAD-1 (2004)
- **Main panel (FO-3):** two MFDs side by side (MFD 1 left, MFD 2 right) replacing the stacked VDI/HSD positions and the invented third display. Each has 20 bezel push-buttons (PB1 lower left, clockwise), NIGHT/OFF/AUTO/DAY power knob, BRT and CONT knobs.
- Left of MFD 1: LANDING checklist plate, VVI and airspeed over the baro and radar altimeters, standby attitude over the BDHI, AOA indicator outboard, left fuel shutoff handle. Right of MFD 2: radio frequency indicator (VHF/UHF-1, VHF/UHF-2, JTIDS-2), wing-sweep indicator, right fuel shutoff handle. The A/B left/right instrument panels are hidden in the D.
- Centre panel: multistatus indicator (1A 1B 3 4 5 6 8B 8A with store type and status flag), clock, HDG/CRS knobs, brake pressure.
- **MFD formats (2.33):** MENU1 legends as in the manual (DATA NAV TSD VDI / CTVS OBC CHKLST / HUD PTID DD TCS IRST / HSD ECM MENU SMS). Live: VDI, HSD, PTID (TID repeat), ECM, SMS, TCS, DATA. SMS–MENU–ECM stay on the bottom row of every format; PTID is a repeat with no legends (any push returns MENU1). Unmodelled formats get the dashed "not acknowledged" box, then drop. HSD / PTID / ECM can only be on one MFD at a time.
- **HUD (figs 2-95, 2-100):** the D's own TLN / A/A format instead of the borrowed Hornet layout — heading scale with fixed pointer (10° TLN / 20° A/A), dot-dial airspeed and altitude, VVI, radar altitude with R/B flags, α/M/G/peak-G with the manual's display thresholds, flight-path ladder bent by half the FPA, FPM with AOA bracket and PFPM, bottom bank scale (0/10/20/30/45, pegs and flashes past 45°), warnings, ZTOD/WPT, weapon legend (PH#/SP#/SW#/G#) with safe cross, TD box, RNG/Vc/altitude/ID, SHOOT cue. A/G with MASTER ARM on still uses the strike symbology.
- Not built: TSD, DD/HUD repeats, CTVS, OBC, checklists; DISPLAYS panel HUD MODE buttons (mode follows MASTER ARM / lock); HUD/VDI ALT switch (BARO assumed).

## v224 — МФИ page engine: Su-35S, Su-30MK2, Su-30SM
- **Legends line up with their keys.** One geometry function now places both the push-button and its legend, so every label sits next to the key it belongs to. Before, the Su-35S drew a square Su-27SM page, with that page's legends, inside a wide screen whose keys were spread across the whole bezel.
- **Su-35S МФИ-35** (from the MAK-35S description): 40 keys per display (12 top, 12 bottom, 8 per side), and the **screen splits into two halves**. Top row: ПИЛ ТО ОПС РЭП РТР ПУМ ТВП КИС ИЛС РЭБ, then ИЗЛ (radar emit / standby) and 1/2 (full screen → split with left half active → right half active → full screen). Page keys load the active half. When split, bottom keys 1-6 and the left column work the left half, and keys 7-12 and the right column work the right half.
- **Su-30MK2**: the two square screens are replaced by two 40-key МФИ-10-5 on the same engine, either side of the analogue centre column.
- **New frames:** ПИЛ (МФИ standby-instrument frame: ADI dome with bank scale, Ny scale, α arc, Vy arc, IAS / Mach dial, altimeter, HSI rose, n₂ and fuel boxes); РТР (ПОПУТНАЯ РТР emitter table with up to 10 signals: frequency, pulse width, period, bearing, range and error; the frequency / pulse values are made up for each type but stay the same every time); РЭБ (jammer mode, status, decoys, threat count); ИЛС (HUD repeat); КИС (engines / fuel / systems sub-pages). ОПС, ТО, РЭП, ПУМ and ТВП reuse the Su-27SM frames together with all of their controls.
- **Su-30SM**: the bottom row of every non-MFWS page now selects PFD / NAV / ESM / ECM / HUD (the frames above).

## v225 — OLS-35 camera picture (Su-35S)
- On the Su-35S the **ТВП** page now shows the OLS-35 TV channel: a live greyscale picture in an octagonal window, corner brackets with a gapped cross, ТВВ legend, zoom figure, <ПЗ ПЗ>, azimuth / elevation, СОПР (track) / ПОИСК (search), laser range Д (≤20 km, ЛД shown while lasing), ОГР УГЛА past the gimbal limits (±90° az, −15…+60° el, after the OLS-35 brochure). 10 × 7.5° wide field, zoom ×1 / 2 / 5 / 10.
- The camera follows the locked target (radar or IRST); with nothing locked it looks along the boresight.
- Bottom keys: ГСН (switch to the weapon seeker video), ЧБ / БЧ (black-hot / white-hot), УВ+ / УВ− (zoom), ЛД (laser). Right keys: ЗАХВ (IRST lock), СБР (drop).

## v226 — Su-35S instrument board after S3-A-31-11 (Рис. 1 Приборная доска)
- Two **МФИ-35** (40 keys each) almost edge to edge, filling the lower board as on the diagram and photos.
- **Щиток левый верхний:** СМОТРИ ОТКАЗ lamp (lit on a fault), РЛС ИЗЛ toggle (follows radar emission), ФАРЫ ПОСАДКА toggle, the guarded striped ГЛАВН ВКЛ, red ПК+ОГНЕТУШ ЛЕВ ДВИГ.
- **Щиток правый верхний:** standby display, lamp column (ПОЖАР, ГИДРО, ОТКАЗ, ВЫХОД, ОПАСН ВЫСОТА, each lit by the real condition), ПК+ОГНЕТУШ ПРАВ ДВИГ.
- Bottom left: gear handle (УБРАНО / ВЫПУЩЕНО) and the green ШАССИ ВЫПУЩ lamp. **Щиток нижний** (ТРИММЕР РН, ДОЗАПРАВКА: ШТАНГА / ФАРЫ / КРАНЫ / ШТАНГА АВАР) under the screens. The Su-27 standby gauge cluster that sat under the screens is removed in this jet.
- **ПУИ-35** keypad laid out as on the real unit: НАВ Р/С ГО В-В В-П on top, ПЗК 1 · ОПЦ 2 · БРЖ 3 · ВСТ 4 · РМ 5 / ППМ 6 · АЭР 7 · ПОС 8 · ПЗ 9 · КОР 0, Ф ТВ СБР СТК ИРК ОЧС along the bottom, four keys each side (ВВД).
- **МФПИ-35М** (MAK-35S: portrait display, 22 keys = 6 top, 4 bottom, 6 per side) on the forward left console, on the same page engine: КИС, ПИЛ, ТО, РЭП, РЭБ, РТР.
- Not changed: side consoles (still the shared Flanker consoles), КАИ-35 HUD.

## v227 — spec pass
- **F-16A ADF radar** is now the **AN/APG-66(V)1** it really carried (the ADF conversion kept the APG-66 and added AIM-7 CW illumination). It was wrongly labelled APG-68 and given the APG-68's range. Detection drops from 42 to 38 NM against a 5 m² target, with lower ECCM. The F-16C keeps its APG-68(V)5. Both now have their own gimbal entries.
- **Su-35S thrust vectoring**: the AL-41F1S (117S) all-aspect nozzles (±15°) are now modelled. Shift+Y toggles TVC exactly as on the Su-30SM, and it now gives pitch and yaw authority. The Su-30SM's AL-31FP keeps the smaller yaw authority of its canted nozzles. TVC is driven by `ac.tvc` (pitch / yaw degrees), so any later TVC jet only needs that field.


## v228 — Su-35S / Su-30SM HUD after the IKSh-1M
Both jets now draw an IKSh-1M (ИКШ-1М) style HUD built from cockpit photos and the ВЗЛЕТ mnemonic frame, replacing the Su-27 sight (Su-35S) and the export-style English symbology (Su-30SM).
- **Top:** IAS (km/h) over Mach, G circle with a max-G arc, heading scale with own-heading caret and the target-heading tick, baro altitude over radar altitude (Р), boxed target speed and altitude when a target is held.
- **Centre:** W boresight, flight-path marker, horizon bar with sink ticks riding a fixed 30/20/10/0/10/20/30 pitch scale and rolling with bank, bank ticks below, pitch caret at the right.
- **Combat:** vertical range bar with zone flags and the ⇦ target caret, mode column (РЛП / ТП, ППС / ЗПС, СНП, ИЗЛ, А), antenna azimuth scale ±70 with a triangle, target circle with the numbered steering diamond, TWS track marks, ПР / БЕЗ ЗАХВ, boxed missile time to impact, РКЦ range bottom left, ПЦ / ДВБ (БВБ in close combat) and the selected round (e.g. 77-1) bottom right, УВОД ОТКЛ when GCAS is off.
- **Navigation:** bearing / distance to the waypoint (277/ 38.9КМ), waypoint name, AoA arc, waypoint diamond on the heading scale.
- English labels follow the HUD-language setting. The Su-30MK2 and Su-27SM keep their own HUDs.

## v229 — the Cold War hangar (33 new jets)
Every type in `Viper Sortie Docs/planes/Cold War` that the game did not have. New files: `js/coldwar.js` (airframe builder, menu icons, new stores) and `js/coldwar-jets.js` (the aircraft).

**BLUFOR:** A-4E Skyhawk, A-7D Corsair II, AV-8B Harrier II (NA), Alpha Jet E, Super Étendard, F-100A, F-104S, F-106A, F-111F, F-20A, F-5E, F-86F, F-8E, J 35F Draken, AJS 37 Viggen, AMX, Lightning F.6, Mirage IIIE, Mirage F1C, Mirage 2000C, Jaguar A, Tornado GR.4.
**REDFOR:** Su-25, Su-24M, Su-22M4, MiG-27K, MiG-15bis, MiG-19P, Yak-38, Yak-141, J-11, J-8F, JH-7.

Each has its own flight data (thrust, weights, fuel, wing, limits), radar or ranging set, gun, stations and period loadouts (cold / modern / strike), RWR, chaff / flares, NATO call sign, side, campaign roles and a procedural 3D model + menu icon.
- **New missiles:** AIM-4F/G, Rb 24 / 24J / 27 / 28 / 74, Firestreak, Red Top, R530, Super 530F / 530D, Magic 1 / 2, Aspide, PL-5E, PL-8, PL-11, PL-12.
- **New A/G stores:** AS-37 Martel, AS-30L, AM39 Exocet, Rb 75 / 04E / 15F, m/71, BL755, Belouga, SAMP 250 / 400, Matra F1, ARAK, UB-16 / UB-32 / ORO-57K, S-24B, Kh-25ML, Kh-58U, YJ-82, KD-88, LS-500J.
- **No-afterburner jets** (A-4, A-7, AV-8B, Alpha Jet, SEM, F-86, AMX, Su-25, MiG-15, Yak-38): throttle stops at MIL.
- **Swing wings** (F-111F 16/45/72, Tornado 25/45/67, Su-24M 16/45/69, Su-22M4 30/45/63, MiG-27K 16/45/72): `,` / `.` step through each jet's own sweep stops.
- **V/STOL** (AV-8B, Yak-38, Yak-141): `,` / `.` set the nozzle angle; vectored thrust (plus lift jets on the Yaks) gives jet-borne lift for slow flight, short take-off, VIFF. No true hover — the flight model flies the velocity vector.
- **Two-seaters with AI back-seater:** F-111F, Tornado GR.4, Su-24M, JH-7 (WSO).
- **Cockpits are borrowed** (not built yet): Phantom pit for most older Western jets, F-16A pit for F-20 / AMX / Mirage 2000, Hornet pit for AV-8B, MiG-21 pit for Su-25 / MiG-15 / MiG-19 / Yak-38, MiG-23 pit for Su-24M / Su-22M4 / MiG-27K / J-8F / JH-7, MiG-29 pit for Yak-141, Su-27 pit for J-11. MiG-21/23-pit jets show the SPO-10 in the player cockpit.
- Fix: `flPaint` (MiG-23 scope / HUD clutter) crashed when a clutter level came out NaN.
- Docs note: `Lightning F.6/manuals` contains the F-111F flight manual, not a Lightning one.
