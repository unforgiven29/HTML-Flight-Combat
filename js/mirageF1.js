/* =====================================================================================================================
   v236 — Mirage F1C systems, after the Mirage F1AZ flight manual (1F-F1K50AZ-1-1, change 13, 1990) and Chuck's DCS Mirage F1 guide (CG).
   Needs game.js, coldwar.js, coldwar-jets.js.
   * Cyrano IV (CG part 11): mechanical monopulse PULSE radar, no Doppler filter.
       - Range scales 7 / 15 / 35 / 60 NM. Search out to the 60 NM scale, lock-on only inside 35 NM.
       - Azimuth scan ±60° or ±30°, 4-bar or 1-bar, antenna roll-stabilised (up to ±80° bank).
       - HA (Haute Altitude, long pulse): full range. IC (Impulsions Courtes, short pulse): slightly shorter range, finer angle.
         The PRF key toggles HA ↔ IC.
       - No look-down: below the horizon the return sits in ground clutter, worst at low altitude.
       - TL / BZ close-combat auto-lock (the ACM mode here): only targets between 400 m and 7 km, 7 NM scale.
       - APS (≈ TWS) follows a target from the sweep but cannot guide a missile; R530 / Super 530F need APC (≈ STT).
   * BF radar detector: wingtip / fin antennas, quadrant lights only, no emitter library.
   * Weights, thrust, g limits, fuel, gun load and tanks are set in coldwar-jets.js.
   ===================================================================================================================== */
(function(){
'use strict';
const ID='Mirage F1';
if(typeof AC==='undefined'||!AC[ID]){console.warn('[mirageF1] Mirage F1 not registered');return;}
const isF=()=>!!player&&player.type===ID;
const NMm=1852,CY='Cyrano IV';

/* ---------------- BF radar detector: coarse bearing (quadrants), poor identification, no missile-launch cue ---------------- */
if(typeof RWRF!=='undefined'&&!RWRF['BF']&&RWRF['ALR-46'])RWRF['BF']=Object.assign({},RWRF['ALR-46'],{sd:30,id:.35,pd:.65,lim:[4,8]});

/* ---------------- Cyrano IV antenna ---------------- */
RGIM[CY]=[60,30,30,1];
const AZ_DEF=radar.azs.slice(),BAR_DEF=radar.barsL?radar.barsL.slice():null;
{const _r=radar.reset;radar.reset=function(ac){const o=_r.apply(this,arguments);
  const m=ac&&ac.radar&&ac.radar.name===CY;
  this.azs=m?[60,30]:AZ_DEF.slice();if(this.ai>=this.azs.length)this.ai=0;
  if(BAR_DEF){this.barsL=m?[4,1]:BAR_DEF.slice();if(this.bi>=this.barsL.length)this.bi=0;}
  if(m&&(this.prf==null||this.prf==='AUTO'))this.prf='A';return o;};}

/* ---------------- Cyrano IV detection ---------------- */
const PN={A:'HA · LONG PULSE',AUTO:'HA · LONG PULSE',B:'IC · SHORT PULSE'};
{const _d=radar.rdet;radar.rdet=function(j,a){
  if(!isF()||this.sensor!=='RDR')return _d.call(this,j,a);
  const toMe=player.pos.clone().sub(j.pos).normalize(),c=j.fwd(new V3()).dot(toMe);
  // pulse set: no closure filter, so aspect only matters through the target's RCS
  let R=this.R0*Math.pow(j.ac.rcs/5,.25)*(.8+.2*Math.max(0,c));
  if(this.prf==='B')R*=.9;                                   // IC: shorter pulse, less energy on target
  if(a.el<-2*D2R){                                           // look-down into ground clutter
    const h=player.pos.y,lo=clamp((h-600)/6000,0,1);R*=lerp(.15,.4,lo);}
  const d=a.d!=null?a.d:j.pos.distanceTo(player.pos);
  if(this.mode==='ACM'){if(d>7000||d<400)return 0;}          // TL / BZ auto-lock window
  if(this.lock===j&&this.mode==='STT')R=Math.min(R,35*NMm);   // APC lock limit
  return R*(.85+.3*(sys.fcr?sys.fcr.gain:.5));};}

// show HA / IC when the PRF key is pressed
{let last=null;const _st=Jet.prototype.step;Jet.prototype.step=function(dt){const r=_st.call(this,dt);
  if(this===player){if(isF()){if(last!==null&&last!==radar.prf)try{flash('CYRANO IV · '+(PN[radar.prf]||'HA'),900);}catch(_){}last=radar.prf;}else last=null;}
  return r;};}

/* ---------------- R530 / Super 530F need APC (continuous track) ---------------- */
{const _p=pickle;pickle=function(){
  if(isF()&&player.alive&&!game.paused){const w=game.wsel;
    if(/^(R530|Super 530)/.test(w)&&radar.sensor==='RDR'&&radar.mode!=='STT'){flash('530 · APC REQUIRED (LOCK THE TARGET)',1300);return;}}
  return _p.apply(this,arguments);};}

console.info('[mirageF1] Cyrano IV / BF / 530 APC rules active');
})();
