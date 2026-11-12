/* v275 — infrared seeker architectures and IRCCM
   Each IR missile gets a seeker architecture instead of one 'ccm' number:
     SPIN  spin-scan reticle (AIM-9B, R-3S, R-40TD): AM-modulated, one band, no flare discrimination, blinded by sun and cloud edges, aims at the plume
     COOL  cooled single-element conical scan (AIM-9D/E/G/J, R-24T, R-13M): better sensitivity, still easy to seduce
     CON   improved conical scan with intensity-rate logic (AIM-9L/P, R-60M): rejects a flare that is brightening or fading too fast
     CON2  conical/rosette with spectral + kinematic IRCCM (AIM-9M, R-73, R-27T/ET): two-band ratio, flare-separation velocity gate
     IIR   imaging infrared focal-plane array (AIM-9X, AGM-65G): resolves the aircraft silhouette inside its range, holds a target template taken
           before launch, rejects point-source flares by shape, aims at the airframe centroid instead of the hot plume, but can bloom on a big flare
   IRCCM mechanisms modelled (per second hazard rates, applied while the head is tracking a flare):
     spectral (two-band colour ratio, reduced when the flare is spectrally matched — modern-era flares),
     kinematic (flare slows and falls away from the airframe: relative-velocity gate),
     intensity (flare burns out / rises too fast),
     spatial (imaging: resolved silhouette inside Rimg, flare is a point source offset from it),
     and template rejection at the moment of release for imaging heads.
   Other seeker physics: sun/cloud-edge/ground clutter hazard by architecture, weather scaling of the lock range (the 3-5 micron band, less for two-band heads),
   flare bloom on imaging arrays, plume aim-point bias for non-imaging heads (miss distance), per-missile state in m.irx (shown in the F4 overlay). */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(typeof Missile==='undefined'||typeof MSL==='undefined'){console.warn('[sensorir] game missing');return;}
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),D=Math.PI/180;
const I=window.SENSOR_IR={log:[],active:[],stats:{rej:0,seduced:0,bloom:0,sun:0,clutter:0}};
// spec: spectral discrimination, kin: kinematic, int: intensity-rate, spat: spatial, bands, Rimg: range inside which the silhouette resolves (m),
// sun/cloud/ground: susceptibility 0-1, bloom: array saturation susceptibility, plume: aim-point bias along the airframe (fraction of length), ifov: pixel size (deg)
const ARCH={
 SPIN:{n:'spin-scan reticle',spec:0,kin:.02,int:0,spat:0,bands:1,Rimg:0,sun:1,cloud:1,ground:1,bloom:0,plume:.38,ifov:1.2},
 COOL:{n:'cooled conical scan',spec:.05,kin:.08,int:.1,spat:0,bands:1,Rimg:0,sun:.85,cloud:.8,ground:.8,bloom:0,plume:.34,ifov:.9},
 CON:{n:'conical scan + rate logic',spec:.12,kin:.3,int:.5,spat:0,bands:1,Rimg:0,sun:.6,cloud:.55,ground:.55,bloom:0,plume:.28,ifov:.7},
 CON2:{n:'conical/rosette two-band',spec:.55,kin:.55,int:.6,spat:0,bands:2,Rimg:0,sun:.35,cloud:.35,ground:.35,bloom:0,plume:.18,ifov:.5},
 IIR:{n:'imaging IR focal-plane array',spec:.7,kin:.8,int:.8,spat:1,bands:2,Rimg:7000,sun:.12,cloud:.2,ground:.12,bloom:.55,plume:0,ifov:.08}};
const MAP={'AIM-9B':'SPIN','R-3S':'SPIN','R-40TD':'SPIN','AIM-9D':'COOL','AIM-9E':'COOL','AIM-9G':'COOL','AIM-9J':'COOL','R-24T':'COOL','R-13M':'COOL',
 'AIM-9P':'CON','AIM-9L':'CON','R-60M':'CON','AIM-9M':'CON2','R-73':'CON2','R-27T':'CON2','R-27ET':'CON2','AIM-9X':'IIR','AGM-65G':'IIR'};
I.ARCH=ARCH;I.MAP=MAP;
const archOf=m=>ARCH[MAP[m.type]||(m.def.ccm>.6?'IIR':m.def.ccm>.3?'CON2':m.def.ccm>.05?'CON':'COOL')];
const _a=new THREE.Vector3(),_b=new THREE.Vector3(),_c=new THREE.Vector3(),_d=new THREE.Vector3();
const rain=()=>typeof ENV!=='undefined'?+ENV.rain||0:0;

// weather: the mid-wave band loses range in rain, cloud and haze; two-band and imaging heads cope better
if(typeof irLockRange==='function'){const _ir=irLockRange;window.irLockRange=irLockRange=function(d,tg,from){let r=_ir(d,tg,from);if(!r)return r;const A=ARCH[MAP[d.__type]||'CON']||ARCH.CON,k=A.bands>1?.7:1;
  const w=1-cl(rain()*.55+(typeof ENV!=='undefined'&&ENV.wx&&/OVC|CLOUD|FOG|STORM/i.test(ENV.wx)?.18:0),0,.8)*k;return r*w;};}
for(const k in MSL)if(MSL[k]&&MSL[k].seek==='IR')MSL[k].__type=MSL[k].__type||k;

const _u=Missile.prototype.update;
Missile.prototype.update=function(dt){const d=this.def;
  if(!d||d.seek!=='IR'||!this.alive||this.remote)return _u.call(this,dt);
  const A=archOf(this),x=this.irx||(this.irx={arch:MAP[this.type]||'?',n:A.n,why:'',rej:0,lock:0,seducedAt:-1,tmpl:null});
  const tg0=this.track,tgt=this.target&&this.target.alive?this.target:null,hz=[];
  // template lock: an imaging head remembers the aircraft it was locked on to before the flares were dropped
  if(tg0&&!tg0.isDecoy){x.tmpl=tg0;x.lock+=dt;}
  if(this.active&&tg0&&tg0.isDecoy&&tg0.src&&tg0.src.alive){
    const fl=tg0,ac=fl.src,dm=_a.copy(fl.pos).sub(this.pos).length(),da=_b.copy(ac.pos).sub(this.pos).length(),sepAng=_c.copy(fl.pos).sub(this.pos).angleTo(_d.copy(ac.pos).sub(this.pos));
    const matched=(ac.era==='modern'?.55:.15),u=fl.vel.distanceTo(ac.vel),age=fl.t||0,life=fl.life||4.5;
    const spec=A.spec*(1-matched)*(A.bands>1?2.2:1.2);
    const kin=A.kin*cl((u-30)/110,0,1)*2.6;
    const inten=A.int*cl((age-1.2)/2.4,0,1)*2.2+A.int*(age<.4?1.2:0);
    let spat=0;
    if(A.Rimg){const res=sepAng>3*A.ifov*D;spat=res?A.spat*(da<A.Rimg?4.5:.5):0;}
    const lam=spec+kin+inten+spat,P=1-Math.exp(-lam*dt);
    const why=spat>=Math.max(spec,kin,inten)?'spatial':kin>=Math.max(spec,inten)?'kinematic':spec>=inten?'spectral':'intensity';
    x.lam=lam;x.why='flare: '+why;
    if(Math.random()<P){this.track=ac;this.ccmT=0;x.rej++;x.seducedAt=-1;I.stats.rej++;I.log.push(this.type+' rejected flare ('+why+')');if(I.log.length>12)I.log.shift();}
  }
  // imaging template rejection at the moment of release: if the head was already locked on the aircraft and the new decoy is inside the silhouette range, it stays on the template
  if(A.Rimg&&this.active&&x.tmpl&&x.tmpl.alive&&this.track&&this.track.isDecoy&&x.prev&&!x.prev.isDecoy&&x.lock>.6){
    const da=_a.copy(x.tmpl.pos).sub(this.pos).length();if(da<A.Rimg*1.2&&Math.random()<.9){this.track=x.tmpl;x.rej++;x.why='template lock held';I.stats.rej++;}}
  if(this.track&&this.track.isDecoy&&!(x.prev&&x.prev.isDecoy)){x.seducedAt=this.t;I.stats.seduced++;}
  // flare bloom on an imaging array: a big flare close to the line of sight saturates pixels around it
  if(A.bloom&&this.active&&this.track&&!this.track.isDecoy){for(const dc of decoys){if(!dc.alive||dc.type!=='flare'||dc.src!==this.track||dc.t>2.2)continue;
      const dm=_a.copy(dc.pos).sub(this.pos).length(),ang=_b.copy(dc.pos).sub(this.pos).angleTo(_c.copy(this.track.pos).sub(this.pos));
      if(dm<1300&&ang<2*D&&Math.random()<A.bloom*.5*dt*(1-dm/1300)*6){this.track=null;x.why='array bloom';I.stats.bloom++;break;}}}
  // sun, cloud edges and ground hot spots (non-imaging heads transfer to them)
  if(this.active&&this.track&&!this.track.isDecoy){const los=_a.copy(this.track.pos).sub(this.pos),dd=los.length();los.divideScalar(dd||1);
    if(typeof SUNDIR!=='undefined'&&SUNDIR.y>.03){const ang=Math.acos(cl(los.dot(SUNDIR),-1,1)),lim=(d.search||2.5*D)*(A.sun>.5?4:1.5)+6*D*A.sun;if(ang<lim){const lam=2.4*A.sun*(1-ang/lim);if(Math.random()<1-Math.exp(-lam*dt)){this.track=null;x.why='sun';I.stats.sun++;}}}
    const agl=this.track.pos.y-(typeof groundAt==='function'?groundAt(this.track.pos.x,this.track.pos.z):0),R=typeof irLockRange==='function'?irLockRange(d,this.track,this.pos):1e9;
    if(this.track&&agl<250&&this.pos.y>this.track.pos.y+20&&R>0){const ratio=cl(dd/R-.55,0,.6),lam=A.ground*ratio*1.8*(agl<120?1.5:1);if(lam>0&&Math.random()<1-Math.exp(-lam*dt)){this.track=null;x.why='ground clutter';I.stats.clutter++;}}}
  x.prev=this.track;
  // plume aim-point bias: a head that steers on the hottest pixel aims at the exhaust, behind the airframe's centre, at tail aspect and close in
  let tgtJ=null,off=0;
  if(this.track&&!this.track.isDecoy&&this.active&&this.track.fwd&&A.plume>0){const dd=this.pos.distanceTo(this.track.pos);
    if(dd<1500){tgtJ=this.track;const fw=tgtJ.fwd(_d);const aspect=cl(fw.dot(_b.copy(tgtJ.pos).sub(this.pos).normalize()),0,1);   // 1 = tail-on
      off=A.plume*(tgtJ.ac&&tgtJ.ac.len||16)*.5*aspect*(tgtJ.ab>.3?1.3:1);x.aim=off;tgtJ.pos.addScaledVector(fw,-off);}}
  try{return _u.call(this,dt);}finally{if(tgtJ){tgtJ.pos.addScaledVector(tgtJ.fwd(_d),off);}}
};

// F4 overlay: IR missiles in flight
const RD=window.RADARDBG;
if(RD){const _r=RD.extraRows;RD.extraRows=()=>{const L=_r?_r():[];const ms=missiles.filter(m=>m.alive&&m.def&&m.def.seek==='IR'&&m.irx);
  if(ms.length){L.push('','IR SEEKERS  rejected '+I.stats.rej+'  seduced '+I.stats.seduced+'  bloom '+I.stats.bloom+'  sun '+I.stats.sun+'  clutter '+I.stats.clutter);
    for(const m of ms.slice(0,4)){const x=m.irx;L.push(`  ${m.type} ${x.arch} t${m.t.toFixed(1)} trk ${m.track?(m.track.isDecoy?'FLARE':(m.track.type||'?')):'none'} ${x.why||''}${x.lam?' λ'+x.lam.toFixed(1):''}${x.aim?' aim-'+x.aim.toFixed(1)+'m':''}`);}
    if(I.log.length)L.push('  last: '+I.log.slice(-2).join(' | '));}return L;};}
console.log('[sensorir] loaded');
})();
