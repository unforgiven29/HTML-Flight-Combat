"use strict";
/* =====================================================================================================================
   v278 — jamming: escort / stand-off noise, radar sidelobes, jammer aspect, spot vs barrage, band coverage, several jammers at once.

   Before this file a jammer only ever hid its own aircraft (self-screening), with one fixed burn-through range per jammer.
   This file puts the burn-through on the radar equation with the jammer's real geometry:

     A target T is hidden while  R_T^4 * ( E_T/R_T^2 + sum_J E_J * g(theta_J) / R_J^2 )  >  sigma_T * K
       E_T      T's own noise jammer (0 if it is not jamming), E_J every other noise jammer on T's side,
       R_J      range from the radar to jammer J,   theta_J  angle at the radar between T and J,
       g(theta) the radar's receive pattern toward J relative to its peak: Gaussian main lobe plus the sidelobe floor,
       K        the existing calibration (BT0, BT_REF, radar R0), so one jammer alone gives the old burn-through range
                (times the aspect and spot / barrage factors below).
   Solving for R_T gives the burn-through range the rest of the game already compares against (J.bt, J.btD, J.noise), so the
   player's radar, AI radars, GCI / AWACS, the DL wingman picture and SAM radars pick it up through jamOf() / jamOfMsl().

   What it adds
   * ESCORT / STAND-OFF: a jamming wingman inside the radar beam (main lobe) hides the formation behind one noise strobe; a
     strong jammer close to the radar masks targets far off the beam through the sidelobes (-18 .. -42 dB depending on the set).
     Sidelobe blanking / cancelling (SLB / SLC) takes 0 .. 22 dB off that. Several jammers add in power.
   * ASPECT: a pod or antenna set radiates best nose-on and tail-on (-3 dB abeam); a belly pod or ventral antennas are
     shadowed by the airframe when the radar is above (up to -4 dB); wingtip pods are not.
   * SPOT vs BARRAGE: the jammer concentrates its power on a fixed-frequency radar (up to +2 dB) and has to spread it against
     a frequency-agile one (down to -2 dB). Agility follows the radar table below.
   * BAND: pods cover roughly 2-18 GHz. VHF / UHF early-warning radars (P-18, 55Zh6) cannot be jammed from a fighter at all.
   * DECEPTION is one-on-one: it follows the aspect and band rules but does not hide anybody else.
   * LINE OF SIGHT: a jammer behind a ridge from the radar adds no noise (cached for half a second).
   * AI DOCTRINE: an AI jammer on STANDBY / AUTO goes to NOISE while a wingman within 45 km is being searched or tracked.
   * Strobes: a target hidden by someone else's noise is not drawn as a strobe at its own bearing (the strobe is the jammer's);
     the strobe of a strong jammer widens on the raw-video scope.

   Radar sidelobe, SLB and agility figures are gameplay estimates, not published data (as in the rest of the sensor suite).
   Console: JAMMING.on = false returns to the old self-screening model; JAMMING.msl = false leaves the missile seekers alone;
   JAMMING.doctrine = false stops the AI escort behaviour; JAMMING.report() lists the active jammers.
   ===================================================================================================================== */
(function(){
if(typeof jamOf!=='function'||typeof jamOfMsl!=='function'||typeof jets==='undefined'||typeof radar==='undefined'||typeof terrLOS!=='function'){console.warn('[jamming] core missing');return;}
const D=Math.PI/180,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),dB=x=>Math.pow(10,x/10);
const JAM=window.JAMMING={on:true,msl:true,doctrine:true,act:[],t:0,n:0,last:null};

// ---------- radar traits: sl = average far-sidelobe level below the peak (dB), slb = sidelobe blanker / canceller improvement (dB),
// ag = frequency / PRF agility (0 fixed .. 1 fully agile). Sets that are not listed are derived from their ECCM figure.
const RT={
  'APG-63':{sl:-32,slb:14,ag:.55},'APG-66(V)1':{sl:-28,slb:10,ag:.6},'APG-68':{sl:-31,slb:12,ag:.65},'APG-68(V)5':{sl:-31,slb:12,ag:.65},
  'APG-73':{sl:-34,slb:14,ag:.7},'APG-79':{sl:-42,slb:22,ag:.95},'AWG-9':{sl:-34,slb:16,ag:.45},'APQ-120':{sl:-24,slb:4,ag:.1},
  'N019':{sl:-27,slb:8,ag:.45},'N019M':{sl:-29,slb:10,ag:.55},'Zhuk-ME':{sl:-33,slb:14,ag:.7},'N001':{sl:-28,slb:9,ag:.5},
  'Sapfir-23ML':{sl:-24,slb:6,ag:.2},'Sapfir-25':{sl:-22,slb:4,ag:.1},'Zaslon':{sl:-34,slb:14,ag:.5},'RP-22SM':{sl:-18,slb:0,ag:.05},
  // ground / airborne early-warning sets (the GCI scan passes the type name): carrier GHz, sidelobes
  'A-50':{f:3.0,sl:-36,slb:14,ag:.5},'E-3A':{f:3.1,sl:-42,slb:20,ag:.7},'P-18':{f:.17,sl:-26,slb:0,ag:.1},'P-37':{f:3.0,sl:-32,slb:8,ag:.3},
  '55Zh6':{f:.43,sl:-30,slb:6,ag:.2}};
const BAND=[2,18];   // fighter pods and internal sets, GHz (ALQ-119 / 131 / 135 / 184, L-005S ...)
const inBand=(fit,GHz)=>{const b=fit&&fit.band||BAND;return GHz>=b[0]&&GHz<=b[1];};
function traits(rd){
  const P=typeof player!=='undefined'?player:null,nm=rd===radar?(P&&P.ac&&P.ac.radar?P.ac.radar.name:''):rd.name;
  const e=rd.ecc!=null?rd.ecc:.5,t=RT[nm]||{sl:-22-14*e,slb:8+14*e,ag:e};
  let f=t.f||rd.fGHz||9.5;
  if(rd===radar&&window.SENSOR_FUSE&&SENSOR_FUSE.reg&&SENSOR_FUSE.reg.carrierFrequencyGHz>0)f=SENSOR_FUSE.reg.carrierFrequencyGHz;
  return{sl:t.sl,slb:t.slb,ag:t.ag,f,bw:rd===radar?radar.beam:rd.beam||3.3*D};}

// ---------- radar receive pattern toward angle th (rad off the beam axis): Gaussian main lobe (-3 dB at bw/2) plus the sidelobe floor,
// the first sidelobes ~12 dB above the average, settling to it by ~12 beamwidths; SLB / SLC only act on the sidelobe path
function pattern(th,bw,sl,slb){const u=th/bw,m=Math.exp(-2.7726*u*u);if(m>.5)return m;
  return m+dB(sl+12*Math.exp(-Math.max(u-1.5,0)/4)-slb);}

// ---------- jammer: aspect (direction to the radar in the jammer's body frame) and technique against radar agility
const _q=new THREE.Quaternion(),_v=new THREE.Vector3(),_w=new THREE.Vector3();
function aspect(J,pos){const f=J.ecm.fit;_v.copy(pos).sub(J.pos);if(_v.lengthSq()<1)return 1;
  _v.applyQuaternion(_q.copy(J.q).invert());const baz=Math.atan2(_v.x,-_v.z),bel=Math.atan2(_v.y,Math.hypot(_v.x,_v.z)),cz=Math.cos(baz);
  let c=.5+.5*cz*cz;                                                // nose / tail best, abeam -3 dB
  if(!f.tips&&bel>25*D)c*=1-.6*Math.min((bel-25*D)/(40*D),1);      // radar above a belly pod / ventral antennas: the airframe shadows them
  return Math.max(c,.12);}
const tech=ag=>1.6-ag;   // spot noise on a fixed set (x1.6) .. barrage spread over an agile one (x0.6); neutral at ag .6

// ---------- active noise jammers, refreshed every 40 ms
function refresh(){const now=performance.now();if(now-JAM.t<40)return;JAM.t=now;const a=JAM.act;a.length=0;
  for(const j of jets){const e=j.ecm;if(j.alive&&e&&e.on&&e.tech==='NOISE'&&e.fit)a.push(j);}
  JAM.n=a.length;}
// line of sight jammer -> radar, cached for 0.5 s per pair
const losC=new WeakMap();
function los(J,rx){let m=losC.get(J);if(!m){m=new WeakMap();losC.set(J,m);}const c=m.get(rx.key),now=performance.now();
  if(c&&now-c.t<500)return c.v;const v=terrLOS(J.pos,rx.pos);m.set(rx.key,{t:now,v});return v;}

// burn-through range of a target with q = sigma*K against its own jammer Et and escort noise No (the positive root of No*y^2 + Et*y = q, y = R^2)
const burn=(q,Et,No)=>(Et<=0&&No<=0)?Infinity:Math.sqrt(2*q/(Et+Math.sqrt(Et*Et+4*No*q)));

// the radar's carrier for the call: an object with .pos (and .side); the player's radar object means the player's jet
function rxOf(rd,rx){const P=typeof player!=='undefined'?player:null;
  if(rx&&rx.pos)return{pos:rx.pos,side:rx.side,key:rx.key||rx};
  if(rd===radar&&P)return{pos:P.pos,side:P.side,key:P};
  return null;}

const _jamOf=window.jamOf;
window.jamOf=function(tg,rd,rx0){
  const base=_jamOf(tg,rd);
  if(!JAM.on||!rd||!tg||!tg.ac)return base;
  refresh();
  if(!base&&JAM.n===0)return base;                                        // nobody jams and the target is quiet: the common case, no work
  const tr=traits(rd);
  // band: a set outside the jammer's coverage cannot be jammed
  const self=base&&base.bt>1&&inBand(tg.ecm&&tg.ecm.fit,tr.f)?base:null;
  const rx=rxOf(rd,rx0);
  if(!rx||(!self&&JAM.n===0))return self;
  const sig=tg.ac.rcs,K4=BT0*BT0*Math.pow(rd.R0/BT_REF,4)/5,q=sig*K4;
  // the target's own jammer, re-derived from the old burn-through so every registry / hardware modifier upstream is kept
  let Et=0,Ed=0,cT=1;
  if(self){const E0=q/(self.bt*self.bt);cT=aspect(tg,rx.pos);if(self.noise)Et=E0*cT*tech(tr.ag);else Ed=E0*cT;}
  // escorts: noise jammers on the target's side (never the radar's own side), weighted by the radar's pattern toward them
  let No=0;
  if(JAM.n>0&&!(rx.side!=null&&tg.side===rx.side)){
    const tx=tg.pos.x-rx.pos.x,ty=tg.pos.y-rx.pos.y,tz=tg.pos.z-rx.pos.z,td=Math.sqrt(tx*tx+ty*ty+tz*tz)||1;
    for(const J of JAM.act){if(J===tg||J.side!==tg.side||!J.alive||!inBand(J.ecm.fit,tr.f))continue;
      const jb=_jamOf(J,rd);if(!jb||!jb.noise||!(jb.bt>1))continue;                    // off (look-through) or deceiving
      const jx=J.pos.x-rx.pos.x,jy=J.pos.y-rx.pos.y,jz=J.pos.z-rx.pos.z,R2=Math.max(jx*jx+jy*jy+jz*jz,1e6);
      const th=Math.acos(cl((tx*jx+ty*jy+tz*jz)/(td*Math.sqrt(R2)),-1,1)),g=pattern(th,tr.bw,tr.sl,tr.slb);
      if(g<1e-8||!los(J,rx))continue;
      No+=(J.ac.rcs*K4/(jb.bt*jb.bt))*aspect(J,rx.pos)*tech(tr.ag)*g/R2;}}   // J's ERP: jp through every upstream modifier
  if(!(No>0)&&!self)return null;
  const noise=Et>0||No>0,bt=noise?burn(q,Et,No):burn(q,Ed,0),dec=!!(self&&self.dec);
  JAM.last={tg:tg.type,rd:rd.name||'radar',bt,Et,No,cT};
  return{noise,dec,bt,btD:dec?self.btD/Math.sqrt(Math.max(cT,.1)):bt*.45,rate:self?self.rate:0,esc:!(Et>0)};};

// ---------- missile seekers: aspect on the self term, escorts through the seeker's own (wide) beam, sidelobes -20 dB
const _jamOfMsl=window.jamOfMsl;
window.jamOfMsl=function(tg,d,pos){
  const base=_jamOfMsl(tg,d,pos);
  if(!JAM.on||!JAM.msl||!tg||!tg.ac||!pos)return base;
  refresh();
  if(!base&&JAM.n===0)return base;
  const sarh=d&&d.seek==='SARH',sig=tg.ac.rcs,q=sig*BTM0*BTM0*(sarh?.7225:1)/5,ecc=d&&d.ecc!=null?d.ecc:.4;
  let Et=0,Ed=0;
  if(base&&base.bt>1){const E0=q/(base.bt*base.bt),c=aspect(tg,pos);if(base.noise)Et=E0*c;else Ed=E0*c;}
  let No=0;
  if(JAM.n>0){const bw=(sarh?8:6)*D,tx=tg.pos.x-pos.x,ty=tg.pos.y-pos.y,tz=tg.pos.z-pos.z,td=Math.sqrt(tx*tx+ty*ty+tz*tz)||1;
    for(const J of JAM.act){if(J===tg||J.side!==tg.side||!J.alive)continue;
      const jx=J.pos.x-pos.x,jy=J.pos.y-pos.y,jz=J.pos.z-pos.z,R2=Math.max(jx*jx+jy*jy+jz*jz,1e4);
      const th=Math.acos(cl((tx*jx+ty*jy+tz*jz)/(td*Math.sqrt(R2)),-1,1)),g=pattern(th,bw,-20,10*ecc);if(g<1e-7)continue;
      No+=J.ecm.fit.jp*aspect(J,pos)*g/R2;}}
  if(!(No>0)&&!base)return base;
  const noise=Et>0||No>0,bt=cl(noise?burn(q,Et,No):burn(q,Ed,0),1200,6500),r=pos.distanceTo(tg.pos);
  return{noise,dec:!!(base&&base.dec),bt,far:r>bt,farD:r>bt*.5,pk:base?base.pk:0,esc:!(Et>0)};};

// ---------- AI doctrine: a jammer on standby / auto goes to NOISE for a wingman that is being searched or tracked
function threatened(j){const P=typeof player!=='undefined'?player:null;if(!P)return false;
  for(const A of jets){if(!A.alive||A===j||A.side!==j.side||A.remote)continue;
    const dx=A.pos.x-j.pos.x,dz=A.pos.z-j.pos.z;if(dx*dx+dz*dz>45e3*45e3)continue;
    if(j.side!==P.side){if(radar.sensor==='RDR'&&radar.on()){const a=radar.ang(A.pos);if(a.off<radar.gimbal()&&a.d<radar.R0*1.3)return true;}}
    else for(const o of jets)if(o.alive&&o.ai&&o.side!==j.side&&o.ai.radarLock&&o.ai.t===A)return true;}
  return false;}
const _ecmUpdate=window.ecmUpdate;
window.ecmUpdate=function(j,dt){
  const e=j.ecm;
  if(JAM.on&&JAM.doctrine&&e&&j.ai&&j!==player&&!j.remote&&j.alive&&(e.mode===1||e.mode===2)&&threatened(j))e.mode=3;
  _ecmUpdate(j,dt);};

// ---------- strobe width on the raw-video scope: stronger jammer -> wider hash column
if(window.SENSOR_FUSE&&SENSOR_FUSE.mod)SENSOR_FUSE.mod('jam-strobe',10,()=>{
  for(const [j,s] of radar.strobes){const e=j.ecm;if(!e||!e.fit||!e.on){s.ws=1;continue;}
    const R=Math.max(s.d||radar.R0,5e3);s.ws=cl(1+1.1*Math.log10(Math.max(e.fit.jp*(40e3*40e3)/(R*R),1)),1,3.5);}});

// ---------- F4 radar debug panel: the active jammers and the last composed burn-through
if(window.RADARDBG){const _r=RADARDBG.extraRows;RADARDBG.extraRows=()=>{const L=_r?_r():[];refresh();const P=player;if(!JAM.on){L.push('','JAMMING layer OFF');return L;}
  L.push('',`JAMMERS ${JAM.n} radiating noise`);
  for(const J of JAM.act.slice(0,5)){L.push(`  ${String(J.type).padEnd(8).slice(0,8)} side ${J.side}  ${(J.pos.distanceTo(P.pos)/1000).toFixed(1).padStart(5)} km  asp ${aspect(J,P.pos).toFixed(2)}  jp ${J.ecm.fit.jp}`);}
  const l=JAM.last;if(l)L.push(`  last  ${l.tg} vs ${l.rd}: burn-through ${(l.bt/1852).toFixed(1)} NM  self ${l.Et>0?'yes':'no'}  escort ${l.No>0?'yes':'no'}`);
  return L;};}

// ---------- console
JAM.report=function(){refresh();const P=typeof player!=='undefined'?player:null;
  const rows=JAM.act.map(J=>({jet:J.type,side:J.side,pod:J.ecm.fit.n,jp:J.ecm.fit.jp,range_km:P?+(J.pos.distanceTo(P.pos)/1000).toFixed(1):null,aspect:P?+aspect(J,P.pos).toFixed(2):null}));
  console.table(rows);console.log('last composed:',JAM.last);return rows;};
console.info('[jamming] escort / sidelobe / aspect / spot-barrage / band layer loaded');
})();
