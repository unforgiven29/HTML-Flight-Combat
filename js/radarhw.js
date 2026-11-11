/* =====================================================================================================================
   v284 — Every radar gets its own transmitter: carrier frequency, antenna size, peak power, waveform and duty cycle.
   Before this only 14 sets had hardware figures; everything else ran on one generic 9.7 GHz / 5 kW / 0.7 m entry.

   Where the numbers act:
   * Player's radar registry (sensorfuse.js): beamwidth (70·λ/D), link budget, rain loss, chaff dipole length, Doppler
     blind speeds, the F4 debug page — all from that set's own frequency / aperture / power.
   * RWR: the range at which a warner hears a radar follows its one-way EIRP (log-scaled against an APG-68, ESA waveforms discounted), so a 600 kW
     Sapfir-25 is heard far beyond its own detection range and a low-power AESA much later. Laser rangers, TV seekers and
     optical sights don't transmit RF and are no longer heard at all.
   * Jamming: each set's carrier frequency decides whether a pod's band covers it, and the burn-through range against a
     self-screening jammer scales with the radar's average radiated power × gain (√ law).
   Figures are open-source / unclassified; where only a range is published the middle is used. Pulse sets carry their real
   (high) peak power with a low duty cycle; pulse-Doppler and ESA sets lower peak, higher duty.
   ===================================================================================================================== */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||!F.spec){console.warn('[radarhw] sensorfuse missing');return;}
const C=299792458;
// k: 'p' pulse, 'pd' pulse-Doppler, 'P' PESA, 'A' AESA, 'x' no RF emission (laser / TV / optical)
// [kind, GHz, aperture m, peak W, gimbal az°]
const R={
  // ---- US ----
  'APG-68(V)5':['pd',9.7,.74,5000,60],'APG-68(V)9':['pd',9.7,.74,6000,60],'APG-70':['pd',9.5,.91,14000,60],'APG-70I':['pd',9.5,.91,14000,60],
  'APG-71':['pd',9.7,.91,12000,65],'APG-82(V)1':['A',9.8,.91,25000,60],'APG-77(V)1':['A',9.9,.81,20000,60],'APG-81':['A',9.9,.70,15000,60],
  'APG-83 SABR':['A',9.8,.74,9000,60],'APG-80':['A',9.8,.74,10000,60],'AWG-10':['pd',9.4,.81,40000,60],'APQ-72':['p',9.4,.81,165000,60],
  'APQ-159':['p',9.3,.41,85000,45],'APQ-126':['p',15.0,.60,50000,45],'APG-53A':['p',16.0,.45,30000,30],'APQ-144 / Pave Tack':['p',15.5,.90,100000,45],
  'APQ-156':['p',15.5,.90,120000,45],'APQ-94':['p',9.3,.60,120000,60],'MA-1':['p',9.4,.89,250000,60],'MG-13':['p',9.2,.76,250000,60],
  'MG-10':['p',9.2,.66,250000,60],'R-14A':['p',9.3,.60,200000,45],'NASARR F15A-41B':['p',9.2,.60,150000,45],'R21G/M1':['p',9.2,.60,150000,45],
  'APG-67(V)':['pd',9.6,.50,4000,60],'AN/APG-30 ranging (ACM)':['p',9.4,.15,50000,10],'AN/ASG-17 ranging (ACM)':['p',9.4,.15,50000,10],
  'APQ-120':['p',9.0,.73,165000,60],
  // ---- UK / Europe / Israel / Asia ----
  'AI.23B Airpass':['p',9.4,.70,220000,60],'Blue Fox':['p',9.4,.40,85000,45],'Blue Vixen':['pd',9.6,.60,8000,60],'Blue Parrot':['p',9.3,.90,150000,45],
  'AI.24 Foxhunter':['pd',9.6,.85,15000,60],'GMR / TFR':['p',13.5,.70,50000,45],
  'PS-01/A':['p',9.4,.50,150000,45],'PS-37/A':['p',9.4,.60,200000,45],'PS-46/A':['pd',9.6,.70,15000,60],'PS-05/A':['pd',9.7,.60,7000,60],'ES-05 Raven':['A',9.8,.62,12000,100],
  'Cyrano II':['p',9.3,.55,200000,45],'Cyrano IV':['p',9.3,.55,200000,60],'RDI':['pd',9.5,.65,15000,60],'RDY':['pd',9.6,.65,12000,60],'RBE2-AA':['A',9.8,.60,12000,60],
  'Antilope 5':['p',15.0,.55,50000,45],'Agave':['p',9.3,.50,80000,45],'CAPTOR-M':['pd',9.8,.70,10000,60],
  'GD-53 Golden Dragon':['pd',9.6,.50,4000,60],'Grifo-M346':['pd',9.5,.50,3000,60],'EL/M-2032':['pd',9.6,.65,6000,60],'EL/M-2052':['A',9.8,.60,10000,60],
  'EL/M-2001B':['p',9.4,.20,20000,20],'EL/M-2001B (ranging)':['p',9.4,.20,20000,20],'J/APG-1':['A',9.8,.65,8000,60],'KF-21 AESA':['A',9.8,.70,12000,60],
  // ---- USSR / Russia ----
  'N001V':['pd',10,1.075,9000,60],'N001VEP':['pd',10,1.075,9000,60],'N011M':['P',9.6,1.0,5000,90],'Irbis-E':['P',9.6,.90,20000,120],
  'Zhuk-AE':['A',9.7,.58,5000,60],'N036 Byelka':['A',9.8,.90,15000,60],'Sh141':['P',9.5,1.0,5000,60],'Zhuk':['pd',9.8,.68,8000,60],
  'Zaslon-M':['P',9.2,1.40,30000,70],'RP-22':['p',12.9,.50,100000,30],'RP-5 Izumrud':['p',9.3,.40,120000,30],'SRD-1M ranging (ACM)':['p',9.3,.15,5000,10],
  'Taifun-M':['p',8.9,.80,400000,60],'RP-S Smerch':['p',9.0,1.0,600000,60],'Oryol-D':['p',9.0,.80,500000,60],'Orion-A / Relief':['p',14.0,.60,50000,45],
  // ---- China ----
  'Type 1492':['pd',9.6,.70,7000,60],'Type 232H':['p',9.3,.70,100000,45],'JL-10A':['pd',9.6,.60,6000,60],'KLJ-6E':['pd',9.6,.50,4000,60],
  'KLJ-7A':['A',9.8,.60,8000,60],'J-16 AESA':['A',9.8,.90,15000,60],'J-15 AESA':['A',9.8,.90,12000,60],'Type 1475':['A',9.8,.80,15000,60],
  'J-35 AESA':['A',9.8,.75,12000,60],'Type 1474':['pd',9.6,.90,9000,60],
  // ---- no RF transmitter ----
  'ARBS / angle-rate':['x'],'ranging only':['x'],'LRMTS / ranging':['x'],'Klen-PS laser ranger':['x'],'Fon-1400 laser ranger':['x'],'Kaira-23 laser / TV':['x'],
  'no radar (ASP-PFD)':['x'],'none (TGP ranging)':['x'],'none':['x'],'none (optical sight)':['x'],'none (ASP-5N sight)':['x']};
// existing entries: the RP-22SM (Sapfir-21M) is a J-band set, not 9.2 GHz
if(F.spec['RP-22SM'])F.spec['RP-22SM'][1]=12.9;
const NOEM=new Set(Object.keys(R).filter(k=>R[k][0]==='x'));
for(const [n,v] of Object.entries(R)){if(F.spec[n]||v[0]==='x')continue;const [k,ghz,D,Pt,gaz]=v;
  const ant=k==='A'?'AESA':k==='P'?'PESA':'Mechanical_Slotted_Planar';
  const prf=k==='p'?[1000,0,0]:k==='pd'?[1500,13000,180000]:[1500,15000,200000];
  const nf=k==='p'?(ghz>12?6:7):k==='pd'?3.6:k==='P'?3.2:2.6,bw=k==='p'?2.5:k==='A'?2:1.8,loss=k==='p'?9.5:k==='A'?7:8,
    bus=Math.round(k==='p'?1500+Pt*.004:k==='A'?Pt*.35:2000+Pt*.12),warm=k==='A'?30:k==='P'?120:k==='p'?180:180;
  F.spec[n]=[ant,ghz,D,Pt,...prf,nf,bw,loss,bus,warm,gaz,60];}
// duty cycle (fraction of time transmitting): pulse ~0.1 %, MPRF/HPRF pulse-Doppler several %, ESA higher
const duty=s=>{const ph=s[6],pul=!s[5]&&!ph;return pul?.001:s[0]==='AESA'?.2:s[0]==='PESA'?.12:ph?.08:.05;};
const gain=s=>{const lam=C/(s[1]*1e9),A=Math.PI*Math.pow(s[2]/2,2),eta=s[0]==='Mechanical_Slotted_Planar'?.6:.7;return eta*4*Math.PI*A/(lam*lam);};
const REF=F.spec['APG-68(V)5']||F.spec['APG-68']||F.spec['APG-66(V)1'],EIRP0=REF[3]*gain(REF),PAVG0=REF[3]*duty(REF)*gain(REF);
const HWX={eirp(n){if(NOEM.has(n))return 0;const s=F.spec[n];return s?s[3]*gain(s):EIRP0;},
  pavg(n){if(NOEM.has(n))return 0;const s=F.spec[n];return s?s[3]*duty(s)*gain(s):PAVG0;},
  ghz(n){const s=F.spec[n];return s?s[1]:9.7;},noEmit:n=>NOEM.has(n),
  // RWR intercept range multiplier: one-way, so √EIRP; clamped so the old balance can't break
  // spread-spectrum / low-peak waveforms hand the warner less energy per look: AESA x0.1, PESA x0.4 (on top of the warner's own LPI factor)
  rwrK(n){if(NOEM.has(n))return 0;const s=F.spec[n],w=s&&s[0]==='AESA'?.1:s&&s[0]==='PESA'?.4:1;
    return Math.max(.4,Math.min(2.2,1+.35*Math.log2(Math.max(this.eirp(n)*w/EIRP0,1e-3))));},
  // burn-through power factor (applied to q, so range goes as its square root)
  btK(n){if(NOEM.has(n))return 1;return Math.max(.35,Math.min(3,this.pavg(n)/PAVG0));}};
window.RADAR_HW=HWX;F.hw=HWX;
// stamp the carrier frequency on every airframe's radar so jamming / propagation code reading rd.fGHz sees the real band
for(const t of Object.keys(AC)){const r=AC[t].radar;if(r&&r.name)r.fGHz=HWX.ghz(r.name);}

// ---- RWR: the warner hears each emitter by its own EIRP, and nothing from non-RF sets ----
try{const _re=rwrEmit;rwrEmit=function(j){if(j._rw)return j._rw;const e=_re(j);if(e&&!e.g&&j.ac&&j.ac.radar){const n=j.ac.radar.name,k=HWX.rwrK(n);
    e.ghz=HWX.ghz(n);e.eirpK=k;if(k===0){e.R0=0;e.lethal=0;}else e.R0*=k;}return e;};}catch(e){console.warn('[radarhw] rwr',e);}
console.info('[radarhw] '+Object.keys(F.spec).length+' radar transmitters defined');
})();
