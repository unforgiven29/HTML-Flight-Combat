/* v272 — radar modes, deception jamming, seeker logic, weather/terrain on every radar, AI radars on the registry model
   1. radar.xm: AA (normal), VS velocity search, GMTI, SEA, GMAP — U cycles them. GMTI/SEA/GMAP paint ground units as radar contacts (registry gm* values).
   2. Jamming on the player's radar: RGPO (range gate pull-off), VGPO (velocity), DRFM false targets, cross-eye angle error, chaff Doppler spread.
   3. Seekers: illumination memory time, CW-seeker low-altitude notch, rain on active heads, DRFM/cross-eye on the seeker, ECCM from ccm.
   4. Weather and terrain for ground radars and AI radars: rain two-way loss by band, radar horizon, bloom/duct left to sensorphys1.
   5. AI radars (fighters) get: horizon, rain, track delay, notch by radar generation, and the registry's AI doctrine values. */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'){console.warn('[sensorwar] fuse missing');return;}
const Q=F.Q,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),un=x=>Math.pow(10,x/10),D=Math.PI/180,C=299792458;
const W=window.SENSOR_WAR={xm:'AA',log:[],rgpo:new Map(),state:{}};
const MODES=['AA','VS','GMTI','SEA','GMAP'];
radar.xm='AA';
const rain=()=>typeof ENV!=='undefined'&&ENV.rain>0?ENV.rain:0;
const gAt=(x,z)=>typeof groundAt==='function'?groundAt(x,z):0;
// ---------- shared propagation: two-way rain loss in dB over a path (ITU-style k·R^alpha, band by carrier frequency), radar horizon in metres
W.rainDb=(rangeM,fGHz)=>{const r=rain();if(!r)return 0;const rr=25*r,k=.0101*Math.pow(Math.max(fGHz,1)/10,1.276),a=1.2;return 2*k*Math.pow(rr,a)*Math.min(rangeM,15000)/1000*cl(1.3-r*.2,.6,1);};
W.horizon=(h1,h2)=>4120*(Math.sqrt(Math.max(h1,0))+Math.sqrt(Math.max(h2,0)));
W.rangeScale=(rangeM,fGHz)=>Math.pow(10,-W.rainDb(rangeM,fGHz)/40);   // R^4 radar equation: x dB of excess loss shrinks the range by 10^(-x/40)

// ---------- 1. radar modes
function flashM(t){try{flash(t,900);}catch(e){}}
W.setMode=m=>{if(!MODES.includes(m))return;radar.xm=W.xm=m;if(m!=='AA')for(const j of [...radar.tracks.keys()])if(!j.isGhost)radar.tracks.delete(j);flashM('RDR '+({AA:'AIR',VS:'VEL SRCH',GMTI:'GMTI',SEA:'SEA SRCH',GMAP:'GND MAP'})[m]);};
addEventListener('keydown',e=>{if(e.code!=='KeyU'||e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;
  if(!player||!player.alive||radar.sensor!=='RDR'||!radar.on())return;W.setMode(MODES[(MODES.indexOf(radar.xm)+1)%MODES.length]);});
const echoes=new Map();
function echoFor(u){let g=echoes.get(u);if(!g){g=new GroundEcho(u.pos.clone());g.cu=u;echoes.set(u,g);}g.pos.copy(u.pos);g.vel.copy(u.vel);g.ac.rcs=Math.max(1,u.ac.rcs||10);g.ac.name=u.nv!=null?'SHIP':'GMT';g.type=u.nv!=null?'SHIP':'GMT';g.callsign=u.callsign||'';g.gnd=true;return g;}
F.mod('war-gm',5,(r,c)=>{if(radar.xm==='AA'||radar.xm==='VS'||!player||!player.alive||radar.sensor!=='RDR'||!radar.on()||typeof GND==='undefined')return;
  const now=performance.now()/1000,lam=C/((r.carrierFrequencyGHz||9.6)*1e9),R0=((player.ac.radar&&player.ac.radar.R0)||90000)*.55,L=GROUND.list;let n=0;
  const mv=r.gmGmtiMinDetectableVelMS||4,notch=(r.gmGmtiClutterNotchHz||300)*lam/2*.3,res=Math.max(r.gmRangeResolutionM||30,3),sea=cl((r.gmSeaClutterSuppression||20)/40,.2,1.2);
  for(const u of GND.units){if(!u.alive||u.side===player.side||u.dead)continue;const isShip=u.nv!=null;
    if(radar.xm==='SEA'&&!isShip)continue;if(radar.xm==='GMTI'&&isShip&&!r.gmSeaTargetWakeEnabled)continue;
    const a=radar.ang(u.pos);if(a.d>radar.rngM||a.off>radar.gimbal()||!terrLOS(player.pos,u.pos))continue;
    const sp=Math.hypot(u.vel.x,u.vel.z);let los=_gl.copy(u.pos).sub(player.pos).normalize();const vr=Math.abs(u.vel.dot(los));
    let k=1;
    if(radar.xm==='GMTI'){if(sp<mv||vr<Math.max(notch,mv*.5))continue;k=cl(vr/(notch+mv),.3,2.5);}
    else if(radar.xm==='SEA'){k=(isShip?1.6:.15)*(1+(r.gmSeaTargetRcsFluctuation?0.35*(Math.random()-.5):0))*(1/sea);}
    else{// GMAP: stationary strong scatterers (buildings, sites) resolved in range and cross range
      const bright=/BLDG|SURN|TEL|RADAR|DEPOT/.test(u.kind||'')?1.4:.7;k=bright*cl(40/res,.4,1.8);if(sp>mv)continue;}
    const R=R0*Math.pow(u.ac.rcs/5,.25)*Math.sqrt(k)*W.rangeScale(a.d,r.carrierFrequencyGHz||9.6);
    const snr=SNR50*Math.pow(R/Math.max(a.d,1),4)*(radar.xm==='GMAP'?1.5:1);
    if(snr<(r.gmImageNoiseSpeckle?0.85:1)*SNR50*.18)continue;
    if(Math.random()>(1-Math.exp(-snr/SNR50))*1.2)continue;
    const g=echoFor(u);if(!L.includes(g)){if(L.length>=12)continue;L.push(g);}g.seen=now;g.alive=true;radar.hit(g,a,snr,now);n++;}
  W.state.gmHits=n;});
const _gl=new THREE.Vector3();
// air targets are not displayed in ground modes; velocity search trades range for closure-rate detection
{const _s=radar.snr1;radar.snr1=function(j,a,loss){let s=_s.call(this,j,a,loss);if(!F.on||this.sensor!=='RDR'||j.isGhost||!s)return s;const xm=this.xm;
  if(xm==='GMTI'||xm==='SEA'||xm==='GMAP')return j.gnd?s:0;
  if(xm==='VS'&&j.vel){const los=_gl.copy(j.pos).sub(player.pos).normalize(),cls=-(j.vel.clone().sub(player.vel).dot(los));
    return cls>120?s*un(6+cl((cls-120)/60,0,8)):cls>0?s*un(-8):s*un(-18);}   // high-PRF: closing targets in the clear get 6–14 dB, beaming and receding ones almost vanish
  return s;};}
// the ground echoes are not aircraft: keep the lock-on logic from treating the pulse-radar ghost rules as applying to them
{const _n=radar.notch;radar.notch=function(j,a){if(j&&j.gnd)return false;return _n.call(this,j,a);};}

// ---------- 2. jamming on the player's radar: RGPO / VGPO / false targets / cross-eye
const jstate=new WeakMap();   // per jammer: pull-off clock
function js(j){let s=jstate.get(j);if(!s){s={t:0,ph:0,dwell:0,rg:0,vg:0};jstate.set(j,s);}return s;}
F.mod('war-jam',20,(r,c,dt)=>{if(!player)return;for(const j of jets){if(j===player||!j.alive||!j.ecm||!j.ecm.on||j.ecm.tech!=='DECM'||j.side===player.side)continue;
  const s=js(j),rate=Math.max(r.jamRgpoRateMS||150,10),dur=Math.max(r.jamRgpoDurationS||4,.5),dw=r.jamRgpoDwellS||1.2,maxR=Math.max((r.jamDrfmRangeDelayRangeUs||40)*150,300);
  const a=radar.ang(j.pos),eff=jamEff(j,a.d);
  if(s.ph===0){s.t+=dt;s.rg=Math.min(maxR,s.rg+rate*dt);s.vg=Math.min(r.jamDrfmDopplerShiftRangeHz?r.jamDrfmDopplerShiftRangeHz*.015*(s.t/dur):60,60);if(s.t>=dur){s.ph=1;s.t=0;}}
  else{s.t+=dt;if(s.t>=dw){s.ph=0;s.t=0;s.rg=0;s.vg=0;}}      // gate walked off, the jammer switches off, the radar recovers, then it starts over
  s.eff=eff;}});
function jamEff(j,d){const e=j.ecm;if(!e||!e.on)return 0;const f=e.fit,bt=(typeof jamOf==='function'&&jamOf(j,radar))?jamOf(j,radar).btD:0;
  const coh=cl(Q.jamDrfmCoherenceLevel==null?.7:Q.jamDrfmCoherenceLevel,.1,1),bits=cl((Q.jamDrfmBits||8)/10,.3,1.2),ecc=radar.ecc||0;return d>bt?cl(coh*bits*(1-ecc)*(f.dec||.5),0,1):0;}
{const _m=radar.meas;radar.meas=function(j,a,snr,out){const o=_m.apply(this,arguments);if(!F.on||!F.reg||this.sensor!=='RDR'||!j||!j.ecm||!j.ecm.on||j.ecm.tech!=='DECM'||!o||typeof o.addScaledVector!=='function')return o;
  const s=js(j);if(!s.eff)return o;const los=_gl.copy(j.pos).sub(player.pos).normalize();
  // RGPO: the range gate follows the stronger false echo away from the aircraft (behind it, since the DRFM can only delay)
  o.addScaledVector(los,s.rg*s.eff);
  // cross-eye: two repeater antennas with a gain/phase mismatch tilt the wavefront; the error grows as the baseline over range, shrinks with mismatch
  const B=Q.jamCrossEyeBaselineM||10,gb=Math.abs(Q.jamCrossEyeGainBalanceDb||1),pb=Math.abs(Q.jamCrossEyePhaseBalanceDeg||5),sens=Q.jamCrossEyeSensitivity||1;
  if(Q.jamAngleDeceptionType==='Cross_Eye'||Q.jamAngleDeceptionType==='CROSS_EYE'||/cross/i.test(String(Q.jamAngleDeceptionType||''))){
    const bal=Math.exp(-Math.pow(gb/2,2))*Math.exp(-Math.pow(pb/25,2)),err=(B/Math.max(2*a.d,1))*sens*bal*s.eff*8;_gl.set(-los.z,0,los.x).normalize();o.addScaledVector(_gl,err*a.d);}
  return o;};}
// DRFM false targets: extra contacts at false ranges around a jammed target (they appear as plot returns, a lock on one fails when the gate is stolen back)
F.mod('war-ft',2,(r)=>{if(!player||!player.alive||radar.sensor!=='RDR'||!radar.on()||radar.xm!=='AA')return;const nmax=Math.round(r.jamDrfmFalseTargetMax||0);if(!nmax)return;const now=performance.now()/1000,L=GROUND.list;
  for(const j of jets){if(j===player||!j.alive||!j.ecm||!j.ecm.on||j.ecm.tech!=='DECM'||j.side===player.side)continue;const a=radar.ang(j.pos);if(a.off>radar.gimbal())continue;
    const s=js(j);if(!s.eff||s.eff<.35)continue;const n=Math.min(nmax,1+Math.floor(s.eff*3));
    for(let i=0;i<n;i++){const key='ft'+jets.indexOf(j)+'_'+i;let g=echoes.get(key);if(!g){g=new GroundEcho(j.pos.clone());g.ft=true;echoes.set(key,g);}
      const los=_gl.copy(j.pos).sub(player.pos).normalize(),off=(i%2?1:-1)*(800+i*1300+(Math.sin(now*.7+i)*500));g.pos.copy(j.pos).addScaledVector(los,off);g.vel.copy(j.vel).multiplyScalar(.9+.1*i);
      g.type='FT';g.ac.name='UNK';g.seen=now;g.alive=true;if(!L.includes(g)&&L.length<14)L.push(g);const a2=radar.ang(g.pos);if(a2.off<radar.gimbal()&&a2.d<radar.rngM&&Math.random()<s.eff*.6)radar.hit(g,a2,SNR50*1.8,now);}}});
// chaff blooming: the game's cloud decays quickly; here a bloom of Doppler-spread clutter adds range-cell noise to the radar while the cloud is alive
{const _s=radar.snr1;radar.snr1=function(j,a,loss){let s=_s.call(this,j,a,loss);if(!F.on||this.sensor!=='RDR'||!s||typeof decoys==='undefined'||j.isGhost)return s;
  for(const d of decoys){if(!d.alive||d.type!=='chaff'||d.src!==j)continue;const dr=Math.abs(d.pos.distanceTo(player.pos)-a.d);if(dr<(Q.jamChaffBloomRadiusM||60)*cl(d.t/(Q.jamChaffBloomTimeS||1),.2,1.5)*3){s*=un(-cl(3+(Q.jamChaffBroadbandFactor||.6)*4,0,8)*Math.exp(-d.t/(Q.jamChaffDecayHalfLifeS||3)*.69)*(1-(radar.ecc||0)*.5));break;}}
  return s;};}

// ---------- 3. seekers: wrap Missile.update
function seekerBand(d){return d.seek==='ARH'?15:d.seek==='SARH'?9.6:10;}
{const _u=Missile.prototype.update;Missile.prototype.update=function(dt){
  const d=this.def;
  if(F.on&&d&&d.seek!=='IR'&&this.alive){
    const tg=this.track||this.target,band=seekerBand(d),ccm=d.ccm||0;
    // illumination memory: a CW-illuminated seeker coasts on the last estimate for a short, ECCM-dependent time, then gives up
    if(d.seek==='SARH'&&!this.dl&&!this.hoj&&!this.seekLost&&this.t>3){this.illLost=(this.illLost||0)+dt;if(this.illLost>1.2+2.5*ccm+(d.hoj?.5:0)){this.seekLost=true;this.track=null;W.log.push('SARH lost illumination');}}
    else if(this.dl||this.hoj)this.illLost=0;
    if(tg&&tg.alive&&!tg.isDecoy){
      const rel=_gl.copy(tg.pos).sub(this.pos),dd=rel.length();rel.divideScalar(dd||1);
      // CW seeker (no pulse-Doppler): a beaming target well below the missile disappears into the main-lobe clutter
      if(d.seek==='SARH'&&this.track&&Math.abs(tg.vel.dot(rel))<35&&tg.pos.y<this.pos.y-250&&Math.random()<dt*.3*(1-ccm))this.track=null;
      // rain on the seeker band (active heads are K/Ku): shorter range, more dropouts at long range
      if(this.active&&d.seek==='ARH'&&this.track){const L=W.rainDb(dd,band);if(L>1&&Math.random()<dt*cl((L-1)*.05,0,.6)*(1-ccm*.7)){this.track=null;this.noReacq=this.t+1;}}
      // DRFM / cross-eye on the seeker: gate stolen by a pull-off that outruns the head's velocity-gate; better ECCM resists
      const e=tg.ecm;if(e&&e.on&&e.tech==='DECM'&&this.track&&(this.active||d.seek==='SARH')){const s=js(tg);
        const lock=cl((s.eff||0)*(1-ccm*.8)*(d.seek==='SARH'?1.15:1)*(s.rg>600?1.2:.7),0,1);
        if(dd>(e.fit.jp?1400+160*Math.sqrt(e.fit.jp):1800)&&Math.random()<dt*lock*.14){this.track=null;this.noReacq=this.t+1.5;if(d.seek==='SARH')this.seekLost=true;W.log.push('seeker gate stolen');}}}}
  return _u.call(this,dt);};}

// ---------- 4/5. ground radars and AI fighters: weather, horizon, track delay, notch by radar generation
if(typeof GND!=='undefined'&&GND.canSee){const _c=GND.canSee;GND.canSee=function(u,P,R0,floor){const d=u.pos.distanceTo(P.pos);R0=R0*W.rangeScale(d,u.T&&u.T.band||(u.T&&u.T.R0>40000?3:10));
  // radar horizon: a target low over the terrain at long range is below the beam
  const hr=W.horizon(u.pos.y-gAt(u.pos.x,u.pos.z)+8,P.pos.y-gAt(P.pos.x,P.pos.z));if(d>hr*1.05&&P.pos.y-gAt(P.pos.x,P.pos.z)<3000)return false;return _c.call(this,u,P,R0,floor);};}
if(typeof AI!=='undefined'){
  const _tg=AI.prototype.tgt;if(_tg)AI.prototype.tgt=function(dt){const r=_tg.apply(this,arguments);this.curTgt=r;return r;};
  const _au=AI.prototype.update;AI.prototype.update=function(dt){
    const j=this.j;if(F.on&&j&&j.alive&&this.rawLock!=null)this.radarLock=this.rawLock;
    _au.call(this,dt);if(!F.on||!j||!j.alive)return;
    let raw=this.radarLock;const P=this.curTgt&&this.curTgt.alive?this.curTgt:null;
    if(raw&&P){const d=_gl.copy(P.pos).sub(j.pos).length(),R0=(j.ac.radar&&j.ac.radar.R0)||60000,pulse=!!j.ac.pulse,fG=pulse?9.4:9.8,scale=W.rangeScale(d,fG);
      const agl=P.pos.y-gAt(P.pos.x,P.pos.z),hr=W.horizon(j.pos.y-gAt(j.pos.x,j.pos.z),agl);let lose=false;
      if(d>R0*scale*Math.pow((P.ac.rcs||5)/5,.25)*1.35)lose=true;            // weather-reduced detection range
      else if(d>hr*1.02&&agl<2500)lose=true;                                // below the radar horizon
      else if(pulse&&P.pos.y<j.pos.y-200&&agl<600&&Math.random()<dt*.35)lose=true;   // pulse radar, low target in ground clutter
      this.lkT=(this.lkT||0)+dt;const need=cl((Q.aiRadarTrackDelayS||1.2)*[1.5,1,.7][this.sk==null?1:this.sk],.2,6);if(this.lkT<need)lose=true;   // a track takes time to build
      if(lose)raw=false;}
    else this.lkT=Math.max(0,(this.lkT||0)-dt*2);
    this.rawLock=this.radarLock;this.radarLock=!!raw&&this.radarLock;};}
W.report=()=>({xm:radar.xm,gm:W.state.gmHits||0,log:W.log.slice(-6)});
console.log('[sensorwar] loaded');
})();
