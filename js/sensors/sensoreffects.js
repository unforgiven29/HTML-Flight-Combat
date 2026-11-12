/* v268 — second round of registry -> gameplay feedback: own jammer (power, polarization, technique gating, look-through window, cooling limit),
   G tolerance (G-LOC threshold, anti-G suit, time to LOC), and mutual radar interference. Neutral at the seeded defaults. */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'){console.warn('[sensoreffects] fuse missing');return;}
const Q=F.Q,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),un=x=>Math.pow(10,x/10);

// baselines come from the airframe's real jammer fit: ERP scales with fit.jp, so burn-through range follows 1/sqrt(ERP)
F.onSeed.push(function(r,j){const f=j.ecm&&j.ecm.fit;F.jp0=f?f.jp:0;
  if(f){r.jamTransmitterPowerWatts=1000*f.jp;r.jamAntennaGainDb=15;r.jamPolarizationMatch=true;r.jamNoiseType='Barrage';r.jamSpotJammingEnabled=true;r.jamBarrageJammingEnabled=true;r.jamSweepJammingEnabled=true;
    r.jamLookThroughEnabled=true;r.jamLookThroughIntervalMs=9000;r.jamLookThroughDurationMs=700;r.jamCoolingLimitS=0;r.jamRgpiEnabled=true;r.jamAntennaPointingErrorDeg=0;r.jamDrfmCoherenceLevel=1;r.jamDrfmFalseTargetMax=4;}
  F.erp0=r.jamTransmitterPowerWatts*Math.pow(10,r.jamAntennaGainDb/10)||1;});
const pw=()=>{const e=Q.jamTransmitterPowerWatts*Math.pow(10,Q.jamAntennaGainDb/10)*un(-(Q.jamPolarizationMatch?0:(Q.jamPolarizationLossDb||3)))*un(-Math.pow(Q.jamAntennaPointingErrorDeg/Math.max(Q.jamAntennaBeamwidthDeg||360,5)*2,2)*3);return cl(e/(F.erp0||1),0,50);};
const gate=(o)=>{if(!o)return o;const nz=o.noise&&!(Q.jamSpotJammingEnabled||Q.jamBarrageJammingEnabled||Q.jamSweepJammingEnabled),dc=o.dec&&Q.jamRgpiEnabled===false&&Q.jamDrfmFalseTargetMax<1;
  if(nz||dc)return null;return o;};
if(typeof jamOf==='function'){const _j=jamOf;window.jamOf=function(tg,rd){const o=_j(tg,rd);if(!F.on||!F.reg||tg!==player||!o)return o;const k=Math.max(pw(),1e-3);o.bt/=Math.sqrt(k);o.btD/=Math.sqrt(k);o.rate*=cl(Q.jamDrfmCoherenceLevel==null?1:Q.jamDrfmCoherenceLevel,0,2);return gate(o);};}
if(typeof jamOfMsl==='function'){const _m=jamOfMsl;window.jamOfMsl=function(tg,d,pos){const o=_m(tg,d,pos);if(!F.on||!F.reg||tg!==player||!o)return o;const k=Math.max(pw(),1e-3);o.bt/=Math.sqrt(k);o.far=pos.distanceTo(tg.pos)>o.bt;o.farD=pos.distanceTo(tg.pos)>o.bt*.5;return gate(o);};}
if(typeof ecmUpdate==='function'){const _e=ecmUpdate;let on0=0;window.ecmUpdate=function(j,dt){_e(j,dt);const e=j.ecm;if(!F.on||!F.reg||j!==player||!e)return;
  if(e.mode===3&&e.warm<=0&&j.hp>20&&ecmFitted(j)){// own look-through window replaces the stock 9 s / 0.7 s one
    const iv=Math.max(Q.jamLookThroughIntervalMs,200)/1e3,du=Q.jamLookThroughEnabled?Q.jamLookThroughDurationMs/1e3:0;e.tech='NOISE';e.on=!(e.t%iv<du);}
  const cl_=Q.jamCoolingLimitS;if(cl_>0){on0=e.on?on0+dt:Math.max(0,on0-dt*.5);if(on0>cl_){e.on=false;if(on0>cl_*1.5)on0=cl_*.3;}}};}

// G tolerance: the registry's G-LOC threshold / suit / time-to-LOC replace the fixed ones (defaults 9 G, no extra suit, 12 s -> stock behaviour)
if(typeof Jet!=='undefined'&&Jet.prototype.gEffects){const _g=Jet.prototype.gEffects;let t=0;Jet.prototype.gEffects=function(dt){if(!F.on||!F.reg||this!==player)return _g.call(this,dt);
  const thr=Q.hfGLocThresholdG+(Q.hfGStrainSuitEnabled?1.2:0),sc=8/Math.max(thr-1,2),nz=this.nz;this.nz=1+(nz-1)*sc;_g.call(this,dt);this.nz=nz;
  if(this.gloc>0){t=0;}else{if(this.blk>.98){t+=dt;if(t>Q.hfGToleranceTimeS/6){this.gloc=6;t=0;}}else t=0;this.glocT=0;}};}

// mutual interference: hostile radars close by raise the noise floor unless pulse blanking / separate channels cancel it
{const _s=radar.snr1;radar.snr1=function(j,a,loss){const s=_s.call(this,j,a,loss);if(!F.on||!F.reg||!s||this.sensor!=='RDR'||!Q.interferenceMutualEnabled)return s;
  let n=0;const R=Q.interferenceMutualRangeM||15000;for(const o of jets){if(o===player||!o.alive||!o.ai||o.ai.friend)continue;if(o.pos.distanceTo(player.pos)<R)n++;}
  if(!n)return s;let l=Math.min(6,n*1.2);if(Q.interferenceSyncPulseBlanking)l*=.25;l/=Math.max(Q.interferenceChannelCount||1,1);l+=Q.interferenceFruitEnabled?Math.min(1,(Q.interferenceFruitRate||0)/5e3):0;return s*un(-l);};}
console.info('[sensoreffects] jammer, G tolerance, interference wired');
})();
