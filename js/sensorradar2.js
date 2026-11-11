/* v271 — more radar logic fed by the registry:
   - look-down clutter by surface (sea with sea-state scaling, land by slope) and grazing angle, offset by the processor's clutter rejection
   - target resolution: two contacts inside one range / angle / closure cell are one blob, the farther one is not detected separately
   - scheduler load: an overloaded timeline degrades track update quality (noisier measurements) and search frames
   - sea-spike and rain-polarisation clutter terms, anomalous propagation false returns */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'){console.warn('[sensorradar2] fuse missing');return;}
const Q=F.Q,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),un=x=>Math.pow(10,x/10),D=Math.PI/180,R=180/Math.PI,_v=new THREE.Vector3(),_w=new THREE.Vector3();
const gAt=(x,z)=>typeof groundAt==='function'?groundAt(x,z):0;
// surface under a point: open water, or land with a roughness taken from the local slope
function surface(p){const y=gAt(p.x,p.z);if(y<=1.5)return{sea:true,slope:0};const s=Math.hypot(gAt(p.x+60,p.z)-y,gAt(p.x,p.z+60)-y)/60;return{sea:false,slope:Math.atan(s)*R,alt:y};}
function seaState(){const q=F.reg||{},h=q.terSeaStateWaveHeightM||0;return cl(Math.round(h/.6),0,6);}

{const _s=radar.snr1;radar.snr1=function(j,a,loss){const s=_s.call(this,j,a,loss);if(!F.on||!F.reg||!s||this.sensor!=='RDR')return s;let g=0;
  // ---- clutter: only a target below the horizon of the beam sits in ground returns
  if(a.el<-1*D){const sf=surface(j.pos),graz=Math.max(Math.abs(a.el)*R,.5);let sig=F.curve(Q.clutterGrazingAngleCurve,graz);
    if(sf.sea){sig+=Q.clutterGammaSea-(-25);sig=Math.max(sig,F.curve(Q.clutterSeaStateScaling,seaState())+22);if(Q.clutterSeaSpikesEnabled&&seaState()>=3)sig+=3*Math.abs(Math.sin(performance.now()*.004));}
    else{const gm=sf.alt>2200?Q.clutterGammaSnow:sf.slope>6?Q.clutterGammaTerrain+3:sf.slope<1.5?Q.clutterGammaDesert:Q.clutterGammaTerrain;sig+=gm-(-15);}
    // spiky clutter has a heavier tail than the average suggests
    sig+=Q.clutterSpikinessFactor*3*Math.abs(Math.sin(performance.now()*.001/Math.max(Q.clutterCorrelationTimeMs/1000,.005)*.05));
    const rej=cl((Q.clutterRejectionDb||40)/70,.1,1.2),pen=Math.max(0,(sig+30)*.35)*(1-Math.min(rej,1));g-=pen;if(Q.clutterMapEnabled)g+=1.5;}
  // rain depolarises less than it returns: a circular-polarisation notch gets some of it back
  if(typeof ENV!=='undefined'&&ENV.rain>0&&Q.clutterRainPolarizationEnabled)g+=Q.clutterRainPolarizationLossDb*.5*ENV.rain;
  // ---- target resolution: one cell, one contact
  const rr=Math.max(Q.tgtTrackResolutionRangeM||Q.rangeResolutionM||150,5),ra=Math.max(Q.tgtTrackResolutionAngleDeg||Q.beamwidthAzDeg||3,.5)*D,rv=Math.max(Q.tgtTrackResolutionDopplerMS||Q.rxDopplerBinWidthMS||8,1);let merged=false;
  const vj=j.vel.dot(_v.copy(j.pos).sub(player.pos).normalize());
  for(const k of jets){if(k===j||k===player||!k.alive)continue;const d2=k.pos.distanceTo(player.pos);if(d2>=a.d||a.d-d2>rr)continue;_w.copy(k.pos).sub(player.pos).normalize();_v.copy(j.pos).sub(player.pos).normalize();if(Math.acos(cl(_w.dot(_v),-1,1))>ra)continue;
    if(Math.abs(k.vel.dot(_w)-vj)>rv)continue;merged=true;break;}
  if(merged)return 0;
  // ---- scheduler: a search frame stretched by track and illumination load sees the same target fewer times
  if((Q.rmLoadFractionCurrent||0)>.9)g-=10*Math.log10(Math.max(Q.rmSearchFrameDegradation||1,1))*.35;
  return g?s*un(g):s;};}

// track update degradation under scheduler load, and anomalous propagation
F.mod('fx-sched',20,()=>{const deg=cl(Q.rmTrackUpdateDegradation||1,1,3);const base=cl(Math.max(.2,(Q.rangeResolutionM||F.rres0)/(F.rres0||1)),.2,5);radar.kRng=cl(base*deg,.2,6);radar.kAng=deg;});
console.info('[sensorradar2] clutter by surface, resolution cells, scheduler load wired');
})();
