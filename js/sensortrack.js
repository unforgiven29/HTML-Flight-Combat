/* v276 — Kalman track filter with data association for the player's radar
   Replaces the alpha-beta position/velocity update with a constant-velocity Kalman filter per track (covariance carried on tk.kf):
     * measurement noise from the real measurement model (range error + beamwidth/sqrt(2·SNR) cross-range), isotropic per-axis variance;
     * process noise from an adaptive manoeuvre model: normalised innovation squared above the 95% gate raises q for a few updates, a quiet track lowers it;
     * gating: a detection is tested against every live track by Mahalanobis distance; if another track's gate fits it clearly better than the
       target's own, the plot is associated with THAT track (a track swap): the other track absorbs the measurement, the target's own track coasts (or, if
       it had none yet, the plot is lost). Two targets inside each other's gate therefore swap, coalesce or drop exactly as a nearest-neighbour tracker does;
     * quality: tk.qual from the position variance against range, tk.conf after 3 hits, tk.kf.q the current manoeuvre level, shown in the F4 overlay.
   Track files stay keyed by the aircraft object so locking and missile guidance still work, but their position and velocity are the filter's, not the truth. */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'){console.warn('[sensortrack] fuse missing');return;}
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const T=window.SENSOR_TRACK={swaps:0,lost:0,inits:0,updates:0,nisHigh:0,last:null,gate:11.34,on:true};
const _m=radar.meas;
radar.meas=function(j,a,snr,out){const o=_m.apply(this,arguments);if(this._inHit&&o&&typeof o.clone==='function'){this._pmK=o.clone();
  const sa=(this.beam/(1.6*Math.sqrt(2*Math.max(snr,1)))+.0006)*(this.kAng||1),sr=(player.ac.pulse?120+.004*a.d:25+.0025*a.d)*(this.kRng||1);
  this._pmR=(sr*sr+2*Math.pow(sa*a.d,2))/3;this._pmD=a.d;}return o;};
const _h=radar.hit;
radar.hit=function(j,a,snr,now){
  if(!T.on||!F.on||this.sensor!=='RDR'||!j||j.isGhost&&j.gnd===undefined&&false)return _h.call(this,j,a,snr,now);
  const own=this.tracks.get(j),snap=own&&own.p&&!own.hoj?{p:own.p.clone(),v:own.v.clone(),t:own.t,n:own.n||1,kf:own.kf?Object.assign({},own.kf):null,al:{az:own.az,el:own.el,d:own.d}}:null;
  this._inHit=true;this._pmK=null;try{_h.call(this,j,a,snr,now);}finally{this._inHit=false;}
  const pm=this._pmK;if(!pm)return;const tk=this.tracks.get(j);if(!tk||tk.hoj)return;
  const R=this._pmR,d=this._pmD;
  const pred=(s,dt)=>{const kf=s.kf||{P00:R,P01:0,P11:Math.pow(150,2),q:64},q=kf.q;
    const P00=kf.P00+dt*(2*kf.P01+dt*kf.P11)+q*dt*dt*dt*dt/4,P01=kf.P01+dt*kf.P11+q*dt*dt*dt/2,P11=kf.P11+q*dt*dt;return{P00,P01,P11,q};};
  const d2of=(s,dt)=>{const P=pred(s,dt),S=P.P00+R,x=s.p.clone().addScaledVector(s.v,dt),dx=pm.x-x.x,dy=pm.y-x.y,dz=pm.z-x.z;return{d2:(dx*dx+dy*dy+dz*dz)/S,P,S,x,dx,dy,dz};};
  const dtOwn=snap?cl(now-snap.t,.05,10):0,ev=snap?d2of(snap,dtOwn):null;
  // association: does another track's gate fit this plot clearly better?
  let best=null;
  for(const [k,tk2] of this.tracks){if(k===j||!k.alive||!tk2.p||tk2.hoj||now-tk2.t>8||!tk2.kf)continue;const dt=cl(now-(tk2.kt||tk2.t),.05,10),e=d2of({p:tk2.kp0||tk2.p,v:tk2.v,kf:tk2.kf},dt);
    if(e.d2<T.gate&&(!best||e.d2<best.e.d2))best={k,tk2,e,dt};}
  const swap=best&&(!ev||best.e.d2<ev.d2*.5||ev.d2>T.gate*2);
  if(swap){
    // the other track absorbs the plot; the target's own track coasts (or never forms)
    const s=best.tk2,kf=s.kf,e=best.e,K0=e.P.P00/e.S,K1=e.P.P01/e.S;
    s.p.copy(e.x).add(_b.set(e.dx*K0,e.dy*K0,e.dz*K0));s.v.add(_b.set(e.dx*K1,e.dy*K1,e.dz*K1));if(s.v.length()>950)s.v.setLength(950);
    kf.P00=(1-K0)*e.P.P00;kf.P01=(1-K0)*e.P.P01;kf.P11=e.P.P11-K1*e.P.P01;kf.q=e.P.q;s.kt=now;s.t=now;const q=this.ang(s.p);s.az=q.az;s.el=q.el;s.d=q.d;s.alt=s.p.y;
    if(snap){own.p.copy(snap.p).addScaledVector(snap.v,dtOwn);own.v.copy(snap.v);own.n=snap.n;own.t=snap.t;if(snap.kf)own.kf=snap.kf;own.az=snap.al.az;own.el=snap.al.el;own.d=snap.al.d;}else this.tracks.delete(j);
    T.swaps++;T.last='swap: plot of '+(j.type||'?')+' taken by track on '+(best.k.type||'?');return;}
  // Kalman update of the target's own track
  if(!snap||!ev){tk.kf={P00:R,P01:0,P11:Math.pow(150,2),q:64};tk.kt=now;tk.kp0=null;T.inits++;tk.qual=cl(1-Math.sqrt(R)/(.02*d+300),0,1);tk.conf=false;return;}
  const e=ev,K0=e.P.P00/e.S,K1=e.P.P01/e.S,nis=e.d2;let q=e.P.q;
  if(nis>7.8){q=Math.min(q*3,900);T.nisHigh++;}else q=Math.max(q*.85,36);
  const px=e.x.x+e.dx*K0,py=e.x.y+e.dy*K0,pz=e.x.z+e.dz*K0;
  tk.p.set(px,py,pz);tk.v.set(snap.v.x+e.dx*K1,snap.v.y+e.dy*K1,snap.v.z+e.dz*K1);if(tk.v.length()>950)tk.v.setLength(950);
  tk.kf={P00:(1-K0)*e.P.P00,P01:(1-K0)*e.P.P01,P11:e.P.P11-K1*e.P.P01,q};tk.kt=now;
  tk.qual=cl(1-Math.sqrt(tk.kf.P00)/(.02*d+300),0,1);tk.conf=(tk.n||1)>=3;const qa=this.ang(tk.p);tk.az=qa.az;tk.el=qa.el;tk.d=qa.d;tk.alt=tk.p.y;
  T.updates++;};
const _a=new THREE.Vector3(),_b=new THREE.Vector3();
const RD=window.RADARDBG;
if(RD){const _r=RD.extraRows;RD.extraRows=()=>{const L=_r?_r():[];L.push('','TRACKER (Kalman)  updates '+T.updates+'  inits '+T.inits+'  swaps '+T.swaps+'  manoeuvre alarms '+T.nisHigh);
  let n=0;for(const [j,tk] of radar.tracks){if(!tk.kf||n>=5)continue;n++;L.push(`  ${j.type||'?'}  σpos ${Math.sqrt(tk.kf.P00).toFixed(0)}m  σvel ${Math.sqrt(tk.kf.P11).toFixed(0)}m/s  q ${tk.kf.q.toFixed(0)}  quality ${(tk.qual||0).toFixed(2)} ${tk.conf?'CONF':'TENT'}`);}
  if(T.last)L.push('  last: '+T.last);return L;};}
console.log('[sensortrack] loaded');
})();
