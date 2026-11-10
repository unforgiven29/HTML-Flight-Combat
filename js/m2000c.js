/* =====================================================================================================================
   v234 — Mirage 2000C systems, after the RAZBAM DCS M-2000C flight manual (FM) and Chuck's DCS Mirage 2000C guide (CG).
   Needs game.js, coldwar.js, coldwar-jets.js.
   * RDI radar: mechanical antenna, 3° beam, ±60° az / ±55° el gimbal, 60/30/15° scans at 100°/s (60) or 50°/s (30, 15).
     PRF (FM p.114):  HFR  search 65 NM / lock 50 NM, TWS + STT, full Doppler filter (weak on tail-aspect, low-closure targets)
                      ENT  search 45 NM / lock 20 NM (interleaved)
                      BFR  search 25 NM, no lock, no Doppler filter: look-down is lost in clutter
     The PRF key cycles AUTO → A → B. On the Mirage that is ENT → HFR → BFR. Close-combat (ACM) auto-acquisition is always HFR.
   * Super 530D: 45 s preparation, trigger delay 0.8 s (STT) / 1.0 s (TWS; the radar goes to STT first). Needs STT for the whole flight
     (SARH, already modelled by the missile).
   * Magic II: 30 s seeker cool-down, 90 min of nitrogen, 0.5 s trigger delay.
   * Air spawns come up with both missiles prepared (the PPA prep runs on the ground before take-off).
   * Loadout (CG §1.2): no Super 530D with air-to-ground stores, and no mixing of different air-to-ground stores.
   ===================================================================================================================== */
(function(){
'use strict';
const ID='Mirage 2000';
if(typeof AC==='undefined'||!AC[ID]){console.warn('[m2000c] Mirage 2000C not registered');return;}
const isM=()=>!!player&&player.type===ID;
const NMm=1852;

/* ---------------- Serval RWR: wingtip + fin antennas, 360° coverage. Receiver model borrowed from the ALR-69 entry ---------------- */
if(typeof RWRF!=='undefined'&&!RWRF['Serval']&&RWRF['ALR-69'])RWRF['Serval']=Object.assign({},RWRF['ALR-69']);

/* ---------------- RDI antenna ---------------- */
RGIM['RDI']=[60,55,55,1];
const AZ_DEF=radar.azs.slice();
{const _r=radar.reset;radar.reset=function(ac){const o=_r.apply(this,arguments);
  const m=ac&&ac.radar&&ac.radar.name==='RDI';this.azs=m?[60,30,15]:AZ_DEF.slice();if(this.ai>=this.azs.length)this.ai=0;
  if(m){this.rate=100*D2R;if(this.prf==='AUTO'||this.prf==null)this.prf='A';}return o;};}
// scan speed follows the azimuth selection: 100°/s for ±60, 50°/s for ±30 and ±15
{const _st=Jet.prototype.step;Jet.prototype.step=function(dt){const r=_st.call(this,dt);
  if(this===player&&isM()&&radar.sensor==='RDR')radar.rate=(radar.azs[radar.ai]>=60?100:50)*D2R;return r;};}

/* ---------------- RDI PRF ---------------- */
const PRFN={A:'HFR',AUTO:'ENT',B:'BFR'};
{const _d=radar.rdet;radar.rdet=function(j,a){
  if(!isM()||this.sensor!=='RDR')return _d.call(this,j,a);
  const toMe=player.pos.clone().sub(j.pos).normalize(),c=j.fwd(new V3()).dot(toMe),dn=a.el<-2*D2R;
  const p=this.mode==='ACM'?'A':this.prf;
  let R=this.R0*Math.pow(j.ac.rcs/5,.25)*(.62+.38*Math.max(0,c));
  if(p==='A'){// HFR: closing-velocity filter. Tail-aspect targets with little closure fall into the clutter notch.
    if(c<-.3)R*=.55;if(this.lock===j)R=Math.min(R,50*NMm);}
  else if(p==='B'){// BFR: raw video. No Doppler filter, so it is short-ranged and blind below the horizon. It cannot lock.
    R*=25/65;if(dn)R*=.15;if(this.lock===j)return 0;}
  else{// ENT: interleaved. Half-strength Doppler filtering, so look-down suffers less than in BFR.
    R*=45/65;if(dn)R*=.8;if(this.lock===j)R=Math.min(R,20*NMm);}
  return R*(.85+.3*sys.fcr.gain);};}
// show the Mirage PRF names when the PRF key is pressed
{const _f=flash;let last=null;
  const _st=Jet.prototype.step;Jet.prototype.step=function(dt){const r=_st.call(this,dt);
    if(this===player&&isM()){if(last!==null&&last!==radar.prf)try{_f('RDI · '+PRFN[radar.prf],900);}catch(_){}last=radar.prf;}else if(this===player)last=null;return r;};}

/* ---------------- PPA: missile preparation ---------------- */
const PPA={mag:0,s530:0,cool:0};window.M2K_PPA=PPA;
{const _sp=Jet.prototype.spawn;if(_sp)Jet.prototype.spawn=function(){const r=_sp.apply(this,arguments);
  if(this===player&&isM()){const gnd=(this.speed!=null?this.speed:this.vel?this.vel.length():999)<30;
    PPA.mag=gnd?30:0;PPA.s530=gnd?45:0;PPA.cool=90*60;}return r;};}
{const _st=Jet.prototype.step;Jet.prototype.step=function(dt){const r=_st.call(this,dt);
  if(this===player&&isM()&&!game.paused){PPA.mag=Math.max(0,PPA.mag-dt);PPA.s530=Math.max(0,PPA.s530-dt);PPA.cool=Math.max(0,PPA.cool-dt);}return r;};}

/* ---------------- trigger delays + preparation gates ---------------- */
let pend=null;
{const _p=pickle;pickle=function(force){
  if(!isM()||!player.alive||game.paused)return _p.apply(this,arguments);
  const w=game.wsel,d=MSL[w];if(!d)return _p.apply(this,arguments);
  if(pend)return;
  const mag=/^Magic/.test(w),s530=/^Super 530/.test(w);
  if(mag){if(PPA.cool<=0){flash('MAGIC · SEEKER WARM (N₂ EXHAUSTED)',1500);return;}if(PPA.mag>0){flash('MAG PREP · '+Math.ceil(PPA.mag)+' s',1000);return;}}
  if(s530&&PPA.s530>0){flash('530 PREP · '+Math.ceil(PPA.s530)+' s',1000);return;}
  if(!game.arm||player.count(w)<=0)return _p.apply(this,arguments);
  let dl=mag?.5:s530?(radar.mode==='STT'?.8:1.0):0;
  if(s530&&radar.mode==='TWS'&&radar.bugOK&&radar.bugOK()&&radar.sensor==='RDR')radar.bugSTT();
  if(!dl)return _p.apply(this,arguments);
  const args=arguments;pend=setTimeout(()=>{pend=null;if(player&&player.alive&&isM()&&!game.paused&&game.wsel===w)_p.apply(null,args);},dl*1000);};}

/* ---------------- loadout rules (CG §1.2) ---------------- */
{const _v=validLoad;validLoad=function(ac,era,o){const out=_v.apply(this,arguments);if(ac!==ID)return out;
  const ks=Object.keys(out),ag=ks.filter(k=>AGW[out[k]]&&out[k]!=='TK'&&out[k]!=='PTB');
  if(ag.length){const first=out[ag[0]];for(const k of ag)if(out[k]!==first)delete out[k];
    for(const k of ks)if(out[k]==='Super 530D')delete out[k];}
  return out;};}

console.info('[m2000c] Mirage 2000C RDI / PPA / loadout rules active');
})();
