# Radar waveform data used by js/sensorsig.js

Public figures are marked **[pub]**; everything else is **[est]** (typical value for the radar's class, not a manual number).

| Radar | Fact | Status | Source |
|---|---|---|---|
| AN/APG-66 / 68 | Medium PRF is the all-aspect look-down waveform; RWS/TWS use MPRF only, VS interleaves HPRF/MPRF; pilot cannot set PRF | pub | APG-66 MPRF paper (IEEE, via Scribd); DCS forum thread "where's the PRF setting" |
| AN/APG-68 | X-band, ~9.86 GHz start frequency, azimuth ±10/30/60 deg | pub | Wikipedia AN/APG-68 |
| AN/APG-66 | Peak power 21.5 kW | pub (forum) | DCS forum |
| MPRF radars | Range and Doppler ambiguity; several PRFs and M-of-N resolve them; blind speeds at multiples of lambda*PRF/2 | pub | NPS thesis ADA551923; MIT LL pulse-Doppler notes |
| AN/AWG-9 | MLC filter +-133 kt, zero-Doppler filter +-100 kt; pulse and pulse-Doppler modes | pub | Heatblur F-14 manual; DCS forum |
| AN/APG-59 | MLC +-110 kt, ZDF +-50 kt | pub | DCS forum |
| N019 Rubin | HPRF closing targets 230-2500 km/h, 30-23000 m; MPRF for tail aspect; automatic mode alternates H/M per scan line; scan +-65 az, +56/-36 el; detection 85 km, track 55-60 km | pub | secretprojects.co.uk N019 page; Microwave Journal |
| N001 | Average power 1 kW, HPRF peak 8 kW, 1.075 m antenna; 3 m2 target 80-100 km head-on | pub | secretprojects.co.uk N001 thread |
| PRF values, pulse widths, duty, sidelobe levels, pulses per CPI, CFAR loss | all radars | est | typical for class (Skolnik / Richards texts) |

Not public: real PRF tables, stagger sets, exact filter-bank sizes, ECCM logic. Treat the numbers as plausible, not authoritative.
