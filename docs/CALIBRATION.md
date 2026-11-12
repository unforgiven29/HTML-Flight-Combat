# Calibration log

Each entry: parameter, old → new, measured result in the sim, source. Radar range is head-on detection vs a 5 m² target at receiver gain mid (`radar.rdet`, measured headless).

## Radar — batch 1 (core jets)

| Set | Old | New | Measured | Source figure |
|---|---|---|---|---|
| AWG-9 (F-14A/B) RWS/TWS | R0 62 NM | R0 90 NM | 93 NM | 90 NM vs 5 m² (Heatblur F-14 manual, General Radar Operation table) |
| AWG-9 PD SRCH | ×1.06 | ×110/90 | 113 NM | 110 NM vs 5 m² (same table) |
| AWG-9 PULSE SRCH | ×0.9 | ×60/90 | 62 NM | 60 NM (same table); P STT 49 NM |
| APG-71 (F-14D) | R0 70 NM | R0 100 NM | — | kept above AWG-9; no public figure, estimate |
| N001 (Su-27) | R0 46 NM | R0 48 NM | 57 NM | 80–100 km vs 3 m² head-on, track 65 km |
| N019 (MiG-29) | R0 38 NM | R0 32 NM | 39 NM | 50–70 km vs 3 m² head-on, track 40–60 km (N019EB export manual as quoted) |
| APG-68(V)5 (F-16C) | unchanged | — | 48 NM | public figures conflict (39–57 NM); left as is |

Soviet sets read ×1.15 high in HPRF against closing targets, so their R0 is set below the target figure.

## Radar — batch 2 (Cold War jets)

| Set | Old | New | Measured | Source figure |
|---|---|---|---|---|
| Sapfir-23ML (MiG-23ML) look-up | R0 33 NM | unchanged | 36 NM | 65 km vs fighter at altitude |
| Sapfir-23ML look-down | x0.75 | x0.25, x0.38 with MTI | 10 NM (MTI ~13) | 20-25 km look-down |
| RP-22SM (MiG-21bis, MiG-23MS) | 20 km | 18 km | 11 NM | 9.8 NM detection, 6 NM track (Cooper) |
| MA-1 (F-106A) | 35 NM | 25 NM | 29 NM | 40-50 NM vs B-52 beam-on; lock fixed 31.5 NM |
| Cyrano IV (Mirage F1) | 32 NM | 27 NM | 29 NM | ~80 % more than Cyrano II (15 NM) |
| RDI (Mirage 2000) | 65 NM | unchanged | - | ~66 NM clear air vs 5 m2 (Thomson-CSF claim) |
| AI.24 Foxhunter, MG-13, MG-10 | unchanged | - | - | figures consistent with bomber-target ranges quoted |

## Radar — batch 3 (modern jets)

Measured head-on vs 5 m² after the Soviet / Chinese HPRF ×1.15 gain.

| Set | Old R0 | Measured now | Source figure |
|---|---|---|---|
| APG-77(V)1 (F-22) | 105 | 191 NM | 240 km vs 1 m² at 86 % Pd |
| APG-81 (F-35A) | 85 | 130 NM | ~240 km vs 5 m² (open-source estimate, weak) |
| Irbis-E (Su-35S) | 110 | 120 NM | 200 km vs 3 m² wide search; 350-400 km in a 100 sq-deg sector |
| N011M (Su-30SM/MKI/MKM) | 66 | 86 NM | 140 km head-on vs MiG-29-size, 60 km pursuit |
| N036 (Su-57) | 115 | 150 NM | 180-200 km vs 1 m² |
| KLJ-7A (J-10C, JF-17) | 75 / 65 | 92 NM | 170 km vs fighter (NRIET) |
| Zhuk-AE (MiG-35) | 70 | 70 NM | 130 km vs 5 m² look-up, 60 km tail |
| Zhuk-ME (MiG-29SMT) | 65 | 66 NM | 120 km vs 5 m² (export) |

## Flight — top speed (all supersonic jets)

Level top speed at 11 km, clean, full afterburner, measured in the full sim (zero-acceleration Mach). `js/flight/perfcal.js` scales the drag rise above the
transonic region and / or adds an afterburner ram-recovery term above M1.2 per jet. Targets are published maximum Mach at altitude.
Measured after: every jet within ±0.05 M of target except the ones noted.

| Jet | Before | Target |
|---|---|---|
| F-16 | 1.49 | 2.00 |
| F-16C | 1.73 | 2.05 |
| F-16V | 1.84 | 2.00 |
| F-16E | 1.85 | 2.00 |
| F-16I | 1.87 | 2.00 |
| F-15C | 1.86 | 2.50 |
| F-15E | 1.88 | 2.50 |
| F-15EX | 2.42 | 2.50 |
| F-15I | 2.36 | 2.50 |
| F-18C | 1.61 | 1.80 |
| F-18E | 1.42 | 1.60 |
| F-18F | 1.51 | 1.60 |
| EA-18G | 1.36 | 1.60 |
| F-4E | 1.27 | 2.23 |
| F-4J | 1.26 | 2.20 |
| F-4B | 1.24 | 2.20 |
| MiG-29 | 1.88 | 2.25 |
| MiG-29S | 1.88 | 2.25 |
| MiG-29SMT | 1.88 | 2.25 |
| MiG-29K | 2.07 | 2.00 |
| MiG-35 | 2.14 | 2.25 |
| Su-27 | 1.97 | 2.35 |
| Su-27SM | 1.97 | 2.35 |
| J-11 | 1.97 | 2.35 |
| J-11B | 2.11 | 2.35 |
| Su-33 | 1.78 | 2.17 |
| Su-30SM | 1.88 | 2.00 |
| Su-30MK2 | 1.97 | 2.00 |
| Su-30MKI | 1.86 | 2.00 |
| Su-30MKM | 1.86 | 2.00 |
| Su-35S | 2.16 | 2.25 |
| Su-34 | 1.80 | 1.80 |
| Su-57 | 2.01 | 2.00 |
| MiG-21 | 1.48 | 2.05 |
| MiG-21MF | 1.36 | 2.05 |
| F-14A | 1.74 | 2.34 |
| F-14B | 1.88 | 2.34 |
| F-14D | 1.88 | 2.34 |
| MiG-23 | 1.97 | 2.35 |
| F-22 | 2.27 | 2.25 |
| F-35A | 1.62 | 1.60 |
| EF-2000 | 1.97 | 2.00 |
| Rafale | 1.81 | 1.80 |
| Mirage 2000-5 | 1.62 | 2.20 |
| Mirage 2000 | 1.51 | 2.20 |
| Mirage 2000D | 1.51 | 2.20 |
| JAS-39C | 1.93 | 2.00 |
| JAS-39E | 1.79 | 2.00 |
| KF-21 | 1.72 | 1.81 |
| F-2A | 1.84 | 2.00 |
| J-10C | 1.90 | 1.80 |
| J-16 | 2.02 | 2.00 |
| J-20 | 2.02 | 2.00 |
| J-35 | 1.83 | 1.80 |
| JF-17 | 1.62 | 1.60 |
| Tejas Mk1A | 1.61 | 1.60 |
| FA-50 | 1.52 | 1.50 |
| F-CK-1 | 1.75 | 1.80 |
| Kfir C2 | 1.23 | 2.30 |
| Kfir Block 60 | 2.18 | 2.30 |
| Yak-141 | 1.85 | 1.70 |
| J-8F | 1.53 | 2.20 |
| JH-7 | 1.27 | 1.75 |
| JH-7A | 1.55 | 1.75 |
| J-7G | 1.43 | 2.00 |
| F-20 | 1.81 | 2.00 |
| F-5E | 1.21 | 1.60 |
| F-5A | 1.17 | 1.40 |
| F-104S | 2.39 | 2.20 |
| F-104G | 1.47 | 2.00 |
| F-106A | 1.06 | 2.30 |
| F-102A | 1.02 | 1.25 |
| F-101B | 1.52 | 1.72 |
| F-105D | 1.29 | 2.08 |
| F-100A | 1.02 | 1.30 |
| F-8E | 1.16 | 1.86 |
| J 35F | 1.02 | 2.00 |
| AJS-37 | 1.19 | 2.00 |
| JA 37 | 1.25 | 2.00 |
| Lightning F.6 | 2.09 | 2.00 |
| Mirage III | 1.05 | 2.20 |
| Mirage 5 | 2.08 | 2.20 |
| Mirage F1 | 1.23 | 2.20 |
| Jaguar | 1.10 | 1.60 |
| Tornado GR.4 | 2.51 | 2.20 |
| Tornado ECR | 1.92 | 2.20 |
| Tornado F.3 | 1.69 | 2.20 |
| F-111F | 2.60 | 2.50 |
| Su-24M | 1.66 | 1.56 |
| Su-22M4 | 1.29 | 1.70 |
| Su-7BMK | 1.15 | 1.74 |
| MiG-27K | 1.55 | 1.70 |
| Su-15TM | 1.83 | 2.50 |
| Tu-128 | 1.31 | 1.60 |
| Yak-28P | 1.73 | 1.85 |
| MiG-19 | 1.40 | 1.35 |
| J-6 | 1.46 | 1.35 |

Not yet calibrated: sea-level / q-limited speeds, sustained and instantaneous turn rates, roll rates, climb, ceiling, acceleration times; subsonic jets.
Caveat: several jets were thrust-limited supersonic in the base engine model; the fix is a per-jet thrust term, not a better engine model.

## Still to do (batch 1)
- Flight envelopes (Mach / ceiling / sustained turn / roll) for the core 10 against NASA and NATOPS performance charts.
- APG-63, APG-73, APQ-120, RP-22, Sapfir-23ML, Sapfir-25 ranges.

## Flight-model depth layer (`js/flight/aerodepth.js`)

| Effect | Rule | Probe result (in-sim, clean, half fuel) |
|---|---|---|
| Transonic pitch authority (Mach tuck) | Available G × (1 − 18 %·bump(M)) for non-FBW supersonic jets, 4 % for FBW; bump peaks M1.02, ±0.12 wide | F-4E 5.5 → 4.5 G at M1.02; F-15C 6.0 → 4.9; F-16C 7.0 → 6.7; Su-27 9.0 → 8.6; A-10C unchanged |
| Aeroelastic roll loss | Roll × (1 − 38 %·s) non-FBW, 12 % FBW, s = smoothstep((q−28 kPa)/110 kPa) | F-4E 3.9 → 2.9 → 2.3 rad/s at 250/400/600 m/s SL; F-16C 5.2 → 4.7 |
| Energy state | `j.ps` (m/s), `j.eh` (m), `AERO.ps(j)` in ft/s, 2 s filter | **Not verified in-sim**: the headless harness spawns the jet frozen, so Ps read 0. Fields populate, no errors. |

Supersonic capability is solved from the same thrust/drag code (max Mach at 11 km), not hard-coded per jet.
The 18 % / 38 % magnitudes are my engineering estimates, not sourced from flight-test data. Tune `AERO.tuck`, `AERO.rollLoss`, `AERO.q0`, `AERO.dq`.
