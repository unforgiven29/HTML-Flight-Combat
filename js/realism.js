/* =====================================================================================================================
   v235 — realism layer for every aircraft. Loads after game.js / coldwar*.js / m2000c.js and wraps the existing models,
   so per-jet data (AC tables, radar names, fits) is unchanged.

   FLIGHT
   * Inertia & control: stick inputs pass through a second-order actuator/airframe model per jet. FBW jets are fast and
     well damped. Hydraulic jets are slower, and the lightly damped ones overshoot. Heavy jets and low dynamic pressure
     respond more slowly. G onset is no longer instant.
   * Mach-dependent lift: lift-curve slope and CLmax rise a little toward M0.9 and fall away supersonic (≈1/√(M²−1)).
     Supersonic turns need more AoA, so they bleed energy, as in the real jets.
   * Store drag: each store adds drag by its own mass/size, referenced to the jet's wing area, with transonic drag rise.
   * Asymmetric stores roll the jet toward the heavy wing, more so under G.
   * High-AoA: buffet onset ahead of the departure AoA, transonic buffet at high G, and loss of aileron effectiveness
     at high AoA on non-FBW jets.
   * Ground effect: a cushion and lower induced drag inside one wingspan of the ground.
   RADAR (player radar; AI locks get the chaff logic)
   * Aspect-dependent RCS: nose lowest, beam and planform highest, tail (nozzle) in between. Range goes with σ^¼.
   * Clutter: multipath lobing on low-flying targets, the altitude-line / sidelobe clutter band of pulse-Doppler sets,
     extra sidelobe clutter in medium-PRF look-down at low altitude, and rain attenuation.
   * Track quality: angle glint from the target's size at short range. Track files that miss several scans coast and
     then drop.
   * Chaff vs Doppler: a non-Doppler (pulse) radar is broken by chaff easily. A pulse-Doppler set is only broken when the
     target puts the chaff in the notch (beaming), because the chaff slows down at once and is filtered out otherwise.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof Jet==='undefined'||typeof radar==='undefined'){console.warn('[realism] game core missing');return;}
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),sm=t=>{t=cl(t,0,1);return t*t*(3-2*t);};
const RZ=window.REALISM={on:true,ctl:true,mach:true,drag:true,asym:true,buffet:true,gfx:true,rcs:true,clutter:true,track:true,chaff:true};

/* ===================================== FLIGHT ===================================== */
// frame dt for the control filter (ctlE has no dt argument)
{const _st=Jet.prototype.step;Jet.prototype.step=function(dt){this._rzDt=dt;const r=_st.call(this,dt);if(RZ.on&&this.alive&&!this.remote)try{rzPost(this,dt);}catch(e){}return r;};}

// ---- inertia & control: second-order filter on pitch, first-order on roll and yaw
function ctlPar(j){const ac=j.acx||j.ac,m=j.mass||12000,q=.5*1.225*Math.pow((j.cas||250)*.5144,2);
  const qk=cl(Math.sqrt(q/14000),.35,1.15),mk=cl(Math.sqrt(13000/m),.55,1.25),fbw=!!ac.fbw;
  return{wn:(fbw?9:4.8)*qk*mk,z:fbw?.9:(ac.noLimiter?.5:.62),tr:(fbw?.05:.11)/cl(qk,.5,1)/mk,ty:fbw?.08:.16};}
{const _c=Jet.prototype.ctlE;Jet.prototype.ctlE=function(){const c=_c.call(this);if(!RZ.on||!RZ.ctl||this.remote)return c;
  const dt=cl(this._rzDt||.016,.001,.05),f=this._rzC||(this._rzC={p:c.p,pv:0,r:c.r,y:c.y}),P=ctlPar(this);
  // pitch: x'' = wn²(u−x) − 2ζ·wn·x' (semi-implicit Euler, sub-stepped for stability)
  const n=Math.ceil(dt/.008),h=dt/n;for(let i=0;i<n;i++){f.pv+=(P.wn*P.wn*(c.p-f.p)-2*P.z*P.wn*f.pv)*h;f.p+=f.pv*h;}
  f.p=cl(f.p,-1.15,1.15);
  f.r+=(c.r-f.r)*(1-Math.exp(-dt/P.tr));f.y+=(c.y-f.y)*(1-Math.exp(-dt/P.ty));
  return{p:f.p,r:f.r,y:f.y};};}
{const _sp=Jet.prototype.spawn;Jet.prototype.spawn=function(){const r=_sp.apply(this,arguments);this._rzC=null;return r;};}

// ---- Mach-dependent lift (on top of the base model's −0.4·(M−0.9) trim, capped at 20 %)
const baseMk=M=>M>.9?1-Math.min(.2,(M-.9)*.4):1;
function wantMk(M){if(M<=.9)return 1+.12*sm((M-.4)/.5);if(M<=1.15)return 1.12-.27*sm((M-.9)/.25);return Math.max(.42,.85*Math.sqrt(.69)/Math.sqrt(M*M-1));}
{const _f=Jet.prototype.fx0;Jet.prototype.fx0=function(base){const o=_f.call(this,base);if(!RZ.on||!RZ.mach||!o||!o.clt)return o;
  const M=this.mach||0,b=Math.round(M*20);if(b<=10)return o;// below M0.5 the effect is negligible
  const k=wantMk(b/20)/baseMk(b/20);if(Math.abs(k-1)<.01)return o;
  const C=this._rzM||(this._rzM={});const key=b;if(C.o===o&&C.k===key)return C.v;
  const v=Object.create(o);v.clt=o.clt.map(([a,c])=>[a,c*k]);C.o=o;C.k=key;C.v=v;return v;};}

// ---- store drag by type, size, wing area and Mach
const storeCD=s=>{if(s==='TK'||s==='PTB')return .0019;const w=AGW[s],m=MSL[s];
  if(w){if(w.k==='pod')return .0016;if(w.k==='tgp')return .0012;return .0006+(w.mass||200)/260000;}
  if(m)return .00035+(m.mass||100)/420000;return .0007;};
{const d=Object.getOwnPropertyDescriptor(Jet.prototype,'storeDrag');if(d&&d.get){const _g=d.get;
  Object.defineProperty(Jet.prototype,'storeDrag',{configurable:true,get(){if(!RZ.on||!RZ.drag)return _g.call(this);
    let c=this.ecm&&typeof ecmFitted==='function'&&ecmFitted(this)?this.ecm.fit.cd:0,s=0;for(const k of Object.keys(this.load||{}))s+=storeCD(this.load[k]);
    const M=this.mach||0,mk=1+1.3*sm((M-.82)/.28)-.35*sm((M-1.3)/.9),S=(this.acx||this.ac).S||30;
    return c+s*mk*cl(30/S,.5,1.6);}});}}

// ---- asymmetric stores (roll toward the heavy side) and high-AoA aileron fade on non-FBW jets
{const _rb=Jet.prototype.rBias;Jet.prototype.rBias=function(){let b=_rb.call(this);if(!RZ.on)return b;const ac=this.acx||this.ac;
  if(RZ.asym&&this.load&&ac.st){let mx=0;for(const k of Object.keys(this.load)){const p=ac.st[k];if(!p)continue;const s=this.load[k];
      const w=(s==='TK'||s==='PTB')?160+(this.tankFuel||0)/Math.max(1,Object.values(this.load).filter(x=>x==='TK'||x==='PTB').length):MSL[s]?MSL[s].mass:AGW[s]?AGW[s].mass:0;mx+=w*p[0];}
    b+=.12*mx/Math.max(this.mass,1)*cl(this.nz||1,.5,9)*(ac.fbw?.35:1);}// FBW trims most of it out
  if(!ac.fbw&&ac.dep){const ad=(this.alpha||0)*180/Math.PI,fr=sm((ad-ac.dep.a*.6)/(ac.dep.a*.4));if(fr>0)b-=(this._rzC?this._rzC.r:this.ctl.r)*ac.roll*.45*fr*cl((this.cas||0)/260,.2,1);}
  return b;};}

// ---- per-frame effects after the base step: buffet, ground effect, track ageing, chaff
function rzPost(j,dt){const ac=j.acx||j.ac;
  if(RZ.buffet&&ac.dep&&!j.onGnd){const ad=Math.abs(j.alpha||0)*180/Math.PI,fr=cl((ad-ac.dep.a*.7)/(ac.dep.a*.3),0,1.3),M=j.mach||0,
      tb=M>.85&&M<1.05&&(j.nz||1)>4?.35*sm(((j.nz||1)-4)/4):0,bf=Math.max(fr*.9,tb);
    if(bf>0){j.shake=Math.max(j.shake||0,bf);if(j===player&&fr>.15&&Math.random()<dt*(j.ac.fbw?0:1.2)&&typeof flash==='function')flash('BUFFET',500);}}
  if(RZ.gfx&&!j.onGnd&&typeof groundAt==='function'){const b=Math.sqrt(3*(ac.S||30)),agl=j.pos.y-groundAt(j.pos.x,j.pos.z)-(typeof GH==='number'?GH:2);
    if(agl<b&&agl>0){const x=16*agl/b,phi=x*x/(1+x*x),k=1-phi,V=j.vel.length();
      if(V>30){const vd=j.vel.clone().divideScalar(V);j.vel.y+=dt*G*.06*k*cl(j.nz||1,0,1.5);j.vel.addScaledVector(vd,dt*G*.03*k);}}}
  if(j===player)playerRadarPost(dt);
  if(RZ.chaff&&j.ai)aiChaff(j,dt);}

/* ===================================== RADAR ===================================== */
const NOSE_RCS=(c,s)=>{// c = cos(aspect off the target nose), s = |sin| of the view elevation in the target's frame
  const th=Math.acos(cl(c,-1,1))*180/Math.PI;let k;
  if(th<20)k=1;else if(th<60)k=1+.5*sm((th-20)/40);else if(th<80)k=1.5+2.5*sm((th-60)/20);else if(th<100)k=4+Math.cos((th-90)/10*Math.PI/2)*1.5;
  else if(th<160)k=2.2-.4*sm((th-100)/60);else k=1.8+.9*sm((th-160)/20);// nozzle / exhaust cavity
  return k*(1+5*s);};// planform from above / below
const _v1=new V3(),_v2=new V3();
{const _d=radar.rdet;radar.rdet=function(j,a){const R=_d.call(this,j,a);if(!RZ.on||!RZ.rcs||!R||this.sensor!=='RDR'||!j.fwd||!j.up)return R;
  const toMe=_v1.copy(player.pos).sub(j.pos).normalize(),c=j.fwd(_v2).dot(toMe),old=.62+.38*Math.max(0,c);
  const s=Math.abs(j.up(_v2).dot(toMe)),k=Math.pow(NOSE_RCS(c,s),.25)*(.85+.15*Math.max(0,c));
  return R/old*k;};}
{const _s=radar.snr1;radar.snr1=function(j,a,loss){let s=_s.call(this,j,a,loss);if(!RZ.on||!RZ.clutter||!s||this.sensor!=='RDR')return s;
  const gH=typeof groundAt==='function',myAgl=gH?player.pos.y-groundAt(player.pos.x,player.pos.z):player.pos.y,tAgl=gH&&j.pos?j.pos.y-groundAt(j.pos.x,j.pos.z):9e9;
  // multipath: a low target near the radar horizon fades in and out as the direct and sea/ground-reflected paths interfere
  if(tAgl<300&&Math.abs(a.el)<3*D2R){const ph=2*Math.PI*Math.max(myAgl,1)*Math.max(tAgl,1)/(.03*Math.max(a.d,500))+performance.now()*.0002,
      dpth=1-sm(tAgl/300);s*=1-dpth*.85*(1-Math.pow(Math.sin(ph),2));}
  if(!player.ac.pulse){
    // altitude line: sidelobe returns from directly below arrive at a range equal to own height with ~zero Doppler
    const vr=j.vel?Math.abs(j.vel.dot(_v1.copy(j.pos).sub(player.pos).normalize())-player.vel.dot(_v1)):999;
    if(Math.abs(a.d-myAgl)<700&&vr<60)s*=.2;
    // medium-PRF look-down at low altitude: sidelobe clutter fills the range cells
    if(a.el<-1*D2R&&this.prf!=='A'&&myAgl<3000)s*=.6+.4*sm(myAgl/3000);}
  if(typeof ENV!=='undefined'&&ENV.rain)s*=Math.exp(-ENV.rain*a.d/45000);// X-band two-way rain loss
  return s;};}
// angle glint: the apparent centre of reflection wanders across the target's span, which matters inside a few km
{const _m=radar.meas;radar.meas=function(j,a,snr,out){const r=_m.call(this,j,a,snr,out);if(!RZ.on||!RZ.track||this.sensor!=='RDR'||!j.ac)return r;
  const span=Math.sqrt(3*(j.ac.S||30)),g=span*.25/Math.max(a.d,200);if(g>2e-4&&typeof gauss==='function'){const los=_v1.copy(j.pos).sub(player.pos).normalize();
    _v2.set(-los.z,0,los.x);if(_v2.lengthSq()<1e-6)_v2.set(1,0,0);_v2.normalize();r.addScaledVector(_v2,gauss()*g*a.d);r.y+=gauss()*g*a.d*.6;}
  return r;};}

// track coasting / ageing: a file that has missed ~3 scan frames coasts with growing uncertainty, then drops
let frameT=4,lastAz=0,sweepAcc=0,sweepT=0,lastFrame=performance.now()/1000;
function playerRadarPost(dt){if(!RZ.track||radar.sensor!=='RDR')return;
  const now=performance.now()/1000;sweepT+=dt;
  if(radar.antAz!=null){if(Math.sign(radar.antAz-lastAz)!==Math.sign(sweepAcc)&&Math.abs(sweepAcc)>2*D2R){if(radar.bar===0&&sweepT>.3){frameT=cl(now-lastFrame,1,14);lastFrame=now;}sweepAcc=0;}
    sweepAcc+=radar.antAz-lastAz;lastAz=radar.antAz;}
  const lim=Math.max(4,frameT*3.2);
  if(radar.mode==='RWS'||radar.mode==='TWS')for(const [j,tk] of radar.tracks){if(j===radar.lock||j===radar.bug||tk.hoj)continue;if(tk.t!=null&&now-tk.t>lim)radar.tracks.delete(j);}
  if(RZ.chaff&&radar.mode==='STT'&&radar.lock&&radar.lock.alive)sttChaff(radar.lock,dt);}

/* ---- chaff vs the player's single-target track ---- */
function chaffP(tg,from,ac,pulse){let p=0;const los=_v1.copy(tg.pos).sub(from).normalize(),vr=Math.abs(tg.vel.dot(los));
  for(const d of decoys){if(!d.alive||d.type!=='chaff'||d.src!==tg||d.t>2.2)continue;
    if(pulse)p+=1.1;// range-gated pulse radar: the cloud is a bigger echo in the same gate
    else p+=vr<45?.9*(1-vr/45)+.15:.025;}// PD: the cloud is near zero Doppler, competitive only when the target is in the notch too
  return p*(1-.5*((ac.radar&&ac.radar.ecc)!=null?ac.radar.ecc:.5));}
function sttChaff(L,dt){const p=chaffP(L,player.pos,player.ac,!!player.ac.pulse);
  if(p>0&&Math.random()<p*dt){radar.drop('CHAFF');if(typeof flash==='function')flash('LOCK BROKEN · CHAFF',1200);}}
function aiChaff(j,dt){const ai=j.ai;if(!ai||!ai.radarLock)return;const tg=ai.t;
  if(!tg||!tg.alive)return;const p=chaffP(tg,j.pos,j.ac,!!j.ac.pulse);if(p>0&&Math.random()<p*dt){ai.radarLock=false;ai.jamT=Math.max(ai.jamT||0,1.5);}}

/* ---- per-jet store RCS for the AI too (the player already gets it in game.js) ---- */
{const _b=Jet.prototype.buildStores;Jet.prototype.buildStores=function(){const r=_b.apply(this,arguments);
  if(this.ac&&!Object.getOwnPropertyDescriptor(this.ac,'rcs')&&AC[this.type]===this.ac&&this.storeRcs){const base=this.ac,me=this;
    this.ac=Object.create(base);Object.defineProperty(this.ac,'rcs',{get(){return base.rcs+me.storeRcs();},configurable:true});}
  return r;};}

console.info('[realism] v235 flight + radar realism active (window.REALISM toggles)');
})();
