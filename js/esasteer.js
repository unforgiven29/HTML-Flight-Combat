/* =====================================================================================================================
   v306 — Electronic beam steering that behaves like an array (js/esasteer.js, window.ESAS)

   Until now an electronically scanned set differed from a dish only by "beam widens 1/cos and gain falls as cos^1.5". The registry already
   carried the array numbers (element spacing, phase-shifter bits, time-delay units, agility, steering limit, blind angle) but nothing read them.
   Now, for PESA / AESA sets only (mechanical sets are untouched):
   * Beam squint: a phase-shifter array steers by phase, not by time delay, so the beam points at sin(theta) proportional to f0 / f. A frequency-
     agile or wide-band waveform therefore moves the beam by tan(theta) * df/f from dwell to dwell (agile PESA about 3.5 % wide, AESA 1.5 %,
     0.6 % when not agile, one tenth of that with time-delay units). A target at the edge of the field of regard sits off the true beam centre.
   * Grating lobes: with element spacing d (wavelengths) a second full beam appears at sin(a_g) = sin(a_0) - 1/d once sin(a_0) >= 1/d - 1
     (about 55 deg at 0.55 lambda). It is weighted by the element pattern cos^p(a_g) / cos^p(a_0), so it is faint at first and grows as you scan on.
     Echoes from that direction are seen as if they were in the main beam: a ghost.
   * Phase-shifter quantisation: the beam position is rounded to a step of bwA / 2^bits.
   * Scan loss exponent from the registry (arrScanLossCosPower), a loss dip at the blind angle (arrScanBlindnessAngleDeg) and a roll-off beyond the
     steering limit (electronicSteeringMaxDeg).
   Gameplay-level estimates, not published data. Switches: ESAS.on .sq .gl .blind.
   ===================================================================================================================== */
(function(){'use strict';
const S=window.SENSOR_SIG,F=window.SENSOR_FUSE;
if(!S||!F||typeof radar==='undefined'||!S.pattern||!S.scan){console.warn('[esasteer] core missing');return;}
const D=Math.PI/180,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const E=window.ESAS={on:true,sq:true,gl:true,blind:true,cur:null,st:{lobes:0}};
const isE=r=>!!r&&!!r.antennaType&&r.antennaType!=='Mechanical_Slotted_Planar';
const hs=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
E.state=function(force){const r=F.reg;if(!E.on||!isE(r))return null;const b=Math.floor(performance.now()/50);if(!force&&E.cur&&E.cur.b===b)return E.cur;
  const az=radar.antAz||0,el=radar.antEl||0,pe=r.antennaType==='PESA',agile=!!r.frequencyAgilityEnabled,ttd=!!r.arrTimeDelayUnitsEnabled,d=r.arrElementSpacingLambdaAz||.55,bits=r.arrPhaseShifterBits||0;
  const frac=(agile?(pe?.035:.015):.006)*(ttd?.1:1),df=(hs(b)*2-1)*frac;
  const bw=(radar.beam||3.5*D);
  const q=bits>0?(hs(b+.5)*2-1)*bw/Math.pow(2,bits):0;                                   // phase-shifter rounding of the beam position
  const o={b:b,az:az,el:el,sqA:E.sq?-Math.tan(az)*df+q:0,sqE:E.sq?-Math.tan(el)*df:0,gl:0,glD:0,w:1};
  const s0=Math.sin(az)*Math.cos(el);
  if(E.gl&&d>.5){const sg=s0>0?s0-1/d:s0+1/d;if(Math.abs(sg)<1&&Math.abs(s0)>=1/d-1){const ag=Math.asin(sg),p=r.arrElementPatternExponent||r.arrScanLossCosPower||1.5;
      o.gl=Math.pow(Math.cos(ag)/Math.max(Math.cos(az),.2),p);o.glD=ag-az;o.w=Math.cos(az)/Math.max(Math.cos(ag),.2);E.st.lobes++;}}
  E.cur=o;return o;};
const _p=S.pattern;
S.pattern=function(dAz,dEl,bwA,bwE,sll){const st=E.state();if(!st)return _p(dAz,dEl,bwA,bwE,sll);
  let v=_p(dAz-st.sqA,dEl-st.sqE,bwA,bwE,sll);
  if(st.gl>0){const g=st.gl*_p(dAz-st.sqA-st.glD,dEl-st.sqE,bwA*Math.min(st.w,4),bwE,sll);if(g>v)v=g;}
  return v;};
const _s=S.scan;
S.scan=function(scanRad){const r=F.reg;if(!E.on||!isE(r))return _s.apply(this,arguments);
  const th=Math.abs(scanRad),c=Math.max(Math.cos(Math.min(th,1.4)),.17),p=r.arrScanLossCosPower||1.5;let g=Math.pow(c,p);
  const mx=(r.electronicSteeringMaxDeg||0)*D,bl=(r.arrScanBlindnessAngleDeg||0)*D;
  if(mx>0&&th>mx)g*=Math.exp(-Math.pow((th-mx)/(6*D),2));
  if(E.blind&&bl>0)g*=1-.85*Math.exp(-Math.pow((th-bl)/(4*D),2));
  return{w:1/c,g:g};};
console.info('[esasteer] v306 beam squint, grating lobes, quantisation, blind angle');
})();
