/* =====================================================================================================================
   v269 — RWR realism layer. Registry (rwrreg.js, 613 variables from docs/rwr_registry.txt) + the model that makes it count.
   rwrUpdate() in game.js calls RWRX at six points; with the seeded defaults a warner behaves like before, and each value you change moves it:
     tick()     power state / warmup, own-emitter blanking, pulse density and processor load, faults, live mirrors of every section
     rangeMul() received-power budget -> detection range: sensitivity, antenna gain by azimuth/elevation, airframe + bank + stores blockage,
                polarization, radome / cable / installation, atmosphere + rain, multipath fading, ducting, thermal + warmup drift
     pHit()     probability of intercepting a scanning emitter: blanking, overload, agility blur, intercept probability per scan
     gate()     deinterleave + confirm time before a new emitter is shown, lock-on needs continuous illumination, uplink miss chance
     post()     bearing quantisation / bias / jitter / multipath / sidelobe false bearing, range-from-power error, ID time and misID,
                display + tracker capacity, faults (lost quadrant, degraded, wrong bearing), operator mode filter
     autoCM()   RWR-triggered chaff / flare programs with altitude, ground and cooldown inhibits
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof RWR_REG==='undefined'||typeof rwrUpdate!=='function'){console.warn('[rwr] registry or rwrUpdate missing');return;}
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),un=x=>Math.pow(10,x/10),D=Math.PI/180,R2=180/Math.PI,C=299792458;
const curve=(t,x)=>{if(!t||!t.length)return 0;if(x<=t[0][0])return t[0][1];for(let i=1;i<t.length;i++)if(x<=t[i][0]){const a=t[i-1],b=t[i],f=(x-a[0])/Math.max(b[0]-a[0],1e-9);return a[1]+f*(b[1]-a[1]);}return t[t.length-1][1];};
const gn=()=>(Math.random()+Math.random()+Math.random()+Math.random()-2)*1.73;
// per-warner hardware: [arch, DF, TSS dBm, id s, track s, lock ms, displayed, bearing quant deg, warmup s, antennas, band split]
const HW={'ALR-67(V)3':['Digital','Phase_Interferometer',-68,.6,.4,400,16,1,5,4],'ALR-67(V)2':['Superheterodyne','Amplitude_Comparison',-65,.9,.6,600,12,2,6,4],'ALR-67(V)1':['Superheterodyne','Amplitude_Comparison',-63,1.2,.8,700,12,3,6,4],
  'ALR-56M':['Superheterodyne','Phase_Interferometer',-66,.8,.5,500,16,2,5,4],'ALR-56C':['Superheterodyne','Amplitude_Comparison',-63,1.1,.7,700,12,3,6,4],'ALR-69':['Crystal_Video','Amplitude_Comparison',-58,1.8,1,900,8,5,8,4],
  'ALR-46':['Crystal_Video','Amplitude_Comparison',-55,2.5,1.4,1200,8,5,10,4],'ALR-45/50':['Crystal_Video','Amplitude_Comparison',-52,4,2,1500,6,10,10,4],'SPO-15LM':['Crystal_Video','Amplitude_Comparison',-52,2,.8,1000,8,10,10,4],'SPO-10':['Crystal_Video','Amplitude_Comparison',-48,0,.5,1500,4,90,15,4]};
const X=window.RWRX={r:RWR_REG.create(),on:true,nm:'',t0:-99,pwrT:-99,pwrWas:null,load:0,blank:0,flt:null,fltT:0,hp0:100,lastCM:-99,cmQ:[],dump(){return this.r;},
  set(n,v){if(!RWR_REG.validate(n,v)){console.warn('[rwr] rejected',n,v);return false;}this.r[n]=v;return true;},get:n=>X.r[n]};
const Q=new Proxy({},{get:(_,n)=>X.r[n]}),r=X.r;

X.seed=function(sy,nm,P){const h=HW[nm]||HW['ALR-56C'],o=RWR_REG.create();Object.assign(o,{
  rwrID:(P.type||'AC').replace(/[^A-Za-z0-9]/g,'')+'_RWR',rwrModelName:nm,rwrPowerState:'Operate',rwrWarmupTimeS:h[8],rwrSelfTestDurationS:3,rwrInstalledBandsList:['C','D','E/F','G/H','I/J'],rwrReceiverCount:4,rwrAntennaCount:h[9],rwrAntennaLocations:['nose','wingtip L','wingtip R','tail'],
  rwrInstallationInterferenceDb:1,rwrRadomeLossDb:.5,rwrCoolingRequired:false,
  rwrAntTypeFront:'Cavity_Backed_Spiral',rwrAntBandSplit:h[0]==='Digital',rwrAntBeamwidthAzDeg:100,rwrAntBeamwidthElDeg:90,rwrAntGainPeakDbi:0,rwrAntPolarization:'Circular_RH',rwrAntPolarizationMismatchDb:3,rwrAntCableLossDb:1.5,
  rwrAntCoverageAzCenterDeg:[0,90,180,270],rwrAntCoverageElCenterDeg:[0,0,0,0],rwrAntOverlapRegionDeg:10,rwrAntBlockageLossDb:[[0,0],[60,.5],[120,2],[150,3.5],[180,5]],rwrAntBlockageByWeaponsLoad:[0,.4,.8,1.2],rwrAntBlockageByGearOrBrakes:1.5,
  rwrAntBlockageByBankAngle:[[0,0],[45,.4],[90,1.2],[135,2.5],[180,4]],rwrAntIcingLoss:0,rwrAntDamageFactor:0,rwrAntNearFieldRadarCoupling:-70,
  rwrRxArchitecture:h[0],rwrRxFrequencyMinGhz:1,rwrRxFrequencyMaxGhz:20,rwrRxSensitivityTssDbm:h[2],rwrRxNoiseFigureDb:10,rwrRxDynamicRangeDb:h[0]==='Crystal_Video'?45:60,rwrRxSaturationDbm:-15,rwrRxSaturationRecoveryUs:2,rwrRxMinPulseWidthNs:h[0]==='Digital'?30:80,
  rwrRxSimultaneousSignalLimit:h[0]==='Crystal_Video'?1:4,rwrRxSimultaneousSignalLoss:h[0]==='Crystal_Video'?.25:.05,rwrRxCwDetectEnabled:true,rwrRxTemperatureDriftDbPerC:.04,rwrRxWarmupDriftDb:3,rwrRxGainCalibrationErrorDb:.5,rwrRxDesensitizationDb:3,rwrRxLimiterEnabled:true,
  pdwBufferLength:2048,pdwMaxRatePerSecond:h[0]==='Digital'?1e6:h[0]==='Crystal_Video'?1.5e5:4e5,pdwBufferOverflowPolicy:'Drop_Weakest',pdwInterceptProbabilityPerScan:cl(sy.pd==null?.95:.7+.3*sy.pd,.5,.99),pdwFreqAgilityBlurLoss:h[0]==='Crystal_Video'?.2:.05,pdwSideLobeDetectEnabled:true,pdwSideLobeFalseBearing:true,pdwSideLobeLevelDb:-20,
  pdwProcessingLatencyMs:h[0]==='Digital'?40:120,pdwAoaErrorDeg:sy.sd,pdwAoaResDeg:h[7],
  dfMethod:h[1],dfAccuracyRmsDeg:sy.sd,dfSystematicBiasDeg:.5,dfBearingQuantizationDeg:h[7],dfBearingJitterDeg:sy.sd*.15,dfMultipathErrorLowAlt:sy.sd*.5,dfAirframeReflectionError:sy.sd*.3,dfBearingFlipAtBoundary:h[1]==='Amplitude_Comparison',dfElevationCapability:false,dfResolutionDeg:h[1]==='Phase_Interferometer'?6:15,dfBearingFilterTimeConstantS:.3,
  deintPrimaryMethod:h[0]==='Digital'?'Hybrid':'Frequency_AOA_Sort',deintMinTimeToTrackS:h[4],deintMaxEmittersTracked:h[6]*2,deintMaxEmittersDisplayed:h[6],deintMergeAngleDeg:h[1]==='Phase_Interferometer'?6:15,deintErrorRate:h[0]==='Crystal_Video'?.06:.01,deintEmitterTrackCoastS:sy.mem,deintEmitterDropTimeoutS:sy.mem*3,deintEmitterNewConfirmHits:h[0]==='Crystal_Video'?2:1,deintGhostEmitterEnabled:h[0]==='Crystal_Video',deintGhostEmitterRate:.5,
  libEntryCount:h[0]==='Digital'?400:h[0]==='Crystal_Video'?40:150,idMatchMinScore:.7,idMatchTimeRequiredS:h[3],idMisidentifyProbability:cl(1-(sy.id==null?1:sy.id),0,1),idUnknownEmitterHandling:'Show_Unknown',idModeChangeReidentify:true,
  thrLockContinuousIllumMs:h[5],thrLockPrfChangeRatio:1.5,thrStateTransitionDelayS:.3,thrTwsFalseLockWarn:true,thrTwsDetectAmbiguity:.15,thrMissileGuidanceUplink:sy.sarh>0||sy.sam>0,thrMissileGuidanceMissProb:cl(1-(sy.sarh||0),0,1)*.5,thrMissileActiveSeeker:sy.arh>0,thrMissileActiveDetectRange:sy.arh,thrMissileActivationAlert:sy.arh>0,
  thrMissileLaunchInferred:sy.arh>0,thrMissileLaunchFalseAlarm:.1,thrLostLockHoldS:2.5,thrSpikeAlert:true,thrLpiRadarDetect:true,thrLpiDetectRangeScalar:sy.lpi==null?.6:sy.lpi,thrLpiMissProbability:cl(1-(sy.lpi==null?.6:sy.lpi),0,.9)*.5,thrIntermittentEmitterMemoryS:sy.mem,thrBearingRateAlert:false,
  rngMethod:h[1]==='Amplitude_Comparison'?'Signal_Strength':'Triangulation',rngFromAmplitudeEnabled:true,rngMainbeamSidelobeAmbiguity:true,rngMainbeamAssumed:true,rngErrorFraction:.28,rngBinsDisplayed:['near','mid','far'],
  mawsSensorType:'Pulse_Doppler_Radar',mawsDetectRangeM:sy.arh,mawsAlertLatencyMs:300,mawsAlertPersistenceS:3,mawsAlertPriorityOverRwr:true,mawsAngularAccuracyDeg:sy.sd*1.5,
  dispType:sy.fam==='W'?'Scope_Circular':'Strip_Lights',dispRadiusPx:120,dispMaxSymbolsVisible:h[6],dispPriorityDiamondEnabled:sy.fam==='W',dispSymbolDecayS:sy.mem,dispSymbolHoldTrack:2.5,dispLatencyMs:100,dispRefreshRateHz:30,dispRingToSignalMapping:sy.ring==='power'?'Estimated_Range':sy.ring==='state'?'Threat_Level':'Estimated_Range',dispLethalRingEnabled:sy.ring==='lethal',
  audTonesEnabled:true,audSearchToneRepeatHz:0,audTrackToneRepeatHz:1/3.4,audLaunchToneRepeatHz:1/(sy.tone==='N'?1.7:1.6),audVolumeLevel:1,audNewEmitterThrottleS:.5,audTonesSuppressedByEmcon:true,
  cmAutoDispenseEnabled:true,cmAutoTriggerLaunch:true,cmAutoTriggerLock:false,cmAutoTriggerActive:true,cmAutoProgramChaffBurst:1,cmAutoProgramFlareBurst:1,cmAutoProgramIntervalMs:400,cmAutoProgramRepeatCount:1,cmAutoMinInterval:2,cmAutoInhibitBelowAltitudeM:20,cmAutoInhibitOnGround:true,cmManualOverride:true,cmEmconAutoRadarSilent:false,cmEmconAutoReleaseS:30,
  cmJammerBlankingRwrEnabled:true,cmJammerBlankingDutyLoss:.15,cmJammerLookThroughSync:true,
  envMultipathFadeDepthDb:6,envDuctingEnhanceDb:6,envJammingFromEnemy:true,
  procThroughputPulsesPerSec:h[0]==='Digital'?1e6:h[0]==='Crystal_Video'?1.5e5:4e5,procOverloadResponse:'Drop_Weakest',procOverloadFalseAlarmRise:.2,procOverloadMissRise:.35,procOverloadRecoveryS:2,procEmitterTableFullPolicy:'Drop_Weakest',
  selfBlankingFromRadar:true,selfBlankingFromJammer:true,selfBlankingFromIff:true,selfBlankingSyncLeadUs:2,selfBlankingSyncLagUs:2,selfRadarSymbolSuppress:true,selfEmiFromHighGManeuvers:0,
  opModeCurrent:'Open',opSensitivityLevel:'Normal',opSensitivityAdjustDb:0,opSearchHideAfterS:sy.mem,opPowerSavingMode:false,
  faultBitStartupCoverage:.9,faultBitContinuousCoverage:.8,faultPartialFailureMode:'Degraded_Sensitivity',faultThermalDriftSensitivity:.03,faultDamageFromHitsFactor:.15,faultMtbfHours:h[0]==='Crystal_Video'?400:1000,faultFirmwareBugsEnabled:false,faultFirmwareBugList:[],faultPowerTransientReset:false,faultIntermittentContact:0,faultIntermittentUnderG:0.0,faultAntennaFailureProb:2e-4,faultReceiverFailureProb:1e-4,faultProcessorFailureProb:5e-5,faultDisplayFailureProb:5e-5,
  coopShareEmittersViaLink:false,coopFuseWithRadarTracks:true,coopFuseBearingGateDeg:10,coopFusedIdFromEmitter:true,coopFusedIdConfidenceBoost:.2});
  // the live object is replaced in place so the exported references (r, Q) stay valid
  for(const k in o)r[k]=o[k];X.nm=nm;X.sy=sy;X.sens0=h[2];X.t0=RW.clk;X.flt=null;X.hp0=P.hp==null?100:P.hp;r.opModeCurrent='Open';};

const E=()=>typeof ENV!=='undefined'?ENV:{rain:0,wx:'CLEAR'};
// ------------------------------------------------------------------ per-frame state
X.tick=function(dt,P,sy,nm){if(RW.nm!==X.nm||X.sy!==sy)X.seed(sy,nm||RW.nm,P);
  const pwr=!!(sys.rwr&&sys.rwr.pwr),clk=RW.clk;if(pwr&&X.pwrWas===null)X.pwrT=-999;else if(pwr&&!X.pwrWas)X.pwrT=clk;X.pwrWas=pwr;const since=clk-X.pwrT;
  r.rwrPowerState=!pwr?'Off':X.flt&&X.flt.mode==='Failed'?'Failed':since<r.rwrWarmupTimeS?'Warmup':X.flt?'Degraded':'Operate';
  const radOn=typeof radar!=='undefined'&&radar.on&&radar.on(),jam=!!(P.ecm&&P.ecm.on),iffTx=!!(typeof IFF!=='undefined'&&IFF.st&&IFF.st.interrogating);
  // own transmitters blank the warner for the duration of every pulse (plus lead and lag): lost listening time
  const duty=(radOn?(typeof SENSOR_FUSE!=='undefined'&&SENSOR_FUSE.reg?SENSOR_FUSE.reg.dutyCycleFraction:.05):0)||0;
  let bl=0;if(r.selfBlankingFromRadar&&radOn){bl+=duty+(r.selfBlankingSyncLeadUs+r.selfBlankingSyncLagUs)*1e-6*(typeof SENSOR_FUSE!=='undefined'&&SENSOR_FUSE.reg?SENSOR_FUSE.reg.pulseRepetitionFrequencyHz:3000);}
  if(r.selfBlankingFromJammer&&jam&&r.cmJammerBlankingRwrEnabled)bl+=r.cmJammerLookThroughSync?r.cmJammerBlankingDutyLoss*.4:r.cmJammerBlankingDutyLoss;
  if(r.selfBlankingFromIff&&iffTx)bl+=.01;r.selfBlankingTotalLoss=X.blank=cl(bl,0,.9);
  r.selfRadarPowerLeakageDbm=radOn?r.rwrAntNearFieldRadarCoupling+60:-120;r.selfJamLeakageDbm=jam?-30:-120;r.selfEmiFromHighGManeuvers=Math.max(0,(P.nz||1)-5)*.01;
  // pulse density and processor load: every emitter whose pulses reach the antenna adds its PRF
  let pps=0,nEm=0;for(const x of RW.recs.values()){if(RW.clk-x.seen<4){nEm++;pps+=x.e.g?(x.e.R0>60000?800:2500):(x.e.pd?25000:2500);}}
  r.envAmbientEmitterDensity=nEm;r.envAmbientPulseDensityPps=pps;X.load=r.procLoadFraction=cl(pps/Math.max(r.procThroughputPulsesPerSec,1),0,3);
  r.pdwBufferOverflowLossFrac=X.load>1?1-1/X.load:0;r.pdwMaxRatePerSecond=r.procThroughputPulsesPerSec;
  // faults: random and combat damage (hits knock out a quadrant, degrade the receiver or corrupt bearings)
  const h=P.hp==null?100:P.hp;if(h<X.hp0-8&&pwr){if(Math.random()<r.faultDamageFromHitsFactor)X.fault(P);X.hp0=h;}else if(h>X.hp0)X.hp0=h;
  if(pwr&&!X.flt&&Math.random()<dt/3600*(r.faultAntennaFailureProb+r.faultReceiverFailureProb+r.faultProcessorFailureProb+r.faultDisplayFailureProb)*100)X.fault(P);
  X.mirror(P,sy,since);};
X.fault=function(P){const m=['Lost_Quadrant','Degraded_Sensitivity','Wrong_Bearing','Lost_Band'];const mode=r.faultPartialFailureMode&&Math.random()<.5?r.faultPartialFailureMode:m[Math.floor(Math.random()*m.length)];
  X.flt={mode,q:Math.floor(Math.random()*4),b:Math.floor(Math.random()*5),off:(Math.random()<.5?-1:1)*(30+Math.random()*60)};r.faultLostQuadrantIndex=X.flt.q;r.faultLostBandIndex=X.flt.b;if(typeof flash==='function')flash('RWR FAULT · '+mode.replace('_',' '),2400);};

// ------------------------------------------------------------------ received-power budget -> detection range multiplier
X.rangeMul=function(j,e,d,a,lk,P){const dy=j.pos.y-P.pos.y,el=Math.atan2(dy,Math.max(Math.hypot(j.pos.x-P.pos.x,j.pos.z-P.pos.z),1))*R2,az=Math.abs(a)*R2;let L=0;
  L+=r.opSensitivityAdjustDb*-1+(r.opSensitivityLevel==='Low'?3:r.opSensitivityLevel==='High'?-2:0);
  L+=r.rwrInstallationInterferenceDb+r.rwrRadomeLossDb+r.rwrAntCableLossDb+r.rwrAntIcingLoss+(r.rwrAntAgingDriftDb||0)+r.rwrRxGainCalibrationErrorDb*.5-r.rwrAntGainPeakDbi-4.8;
  // nearest of the four spirals: gain falls off the antenna axis; the overlap region keeps the crossover loss small
  const cs=r.rwrAntCoverageAzCenterDeg,bw=Math.max(r.rwrAntBeamwidthAzDeg,20);let off=180;for(const c of cs){let o=Math.abs(((az*Math.sign(a||1)-c+540)%360)-180);off=Math.min(off,o);}
  const ov=r.rwrAntOverlapRegionDeg;L+=3*Math.pow(Math.max(off-ov*.5,0)/(bw/2),2)+(Math.abs(el)>(r.rwrAntBeamwidthElDeg/2)?3*Math.pow((Math.abs(el)-r.rwrAntBeamwidthElDeg/2)/(r.rwrAntBeamwidthElDeg/2),2):0);
  L+=r.rwrAntPolarization==='Dual'?0:r.rwrAntPolarizationMismatchDb*.5;
  // airframe shadow (fin and fuselage behind, belly stores below), gear / airbrake, bank angle
  const roll=Math.abs(Math.atan2(P.right?P.right(new THREE.Vector3()).y:0,P.up?P.up(new THREE.Vector3()).y:1))*R2;let blk=curve(r.rwrAntBlockageLossDb,az);
  if(el<-15){const st=Object.keys(P.load||{}).length;blk+=r.rwrAntBlockageByWeaponsLoad[Math.min(3,Math.floor(st/3))]||0;}
  if(P.gear>.5||P.brake>.5)blk+=r.rwrAntBlockageByGearOrBrakes;blk+=curve(r.rwrAntBlockageByBankAngle,roll)*(el>10?.5:.25);L+=blk;
  // atmosphere + rain along a one-way path (emitters near 9 GHz), multipath fading against low-altitude geometry, ducting
  const f=9,dens=Math.exp(-P.pos.y/8000),km=d/1000;r.envAtmosphericLossDbKm=.0078*dens*(f/10)*3;const rr=E().rain*25;r.envRainLossDbKm=rr>0?.0101*Math.pow(f/10,1.276)*Math.pow(rr,1.2):0;L+=(r.envAtmosphericLossDbKm+r.envRainLossDbKm)*Math.min(km,200);
  const agl=P.pos.y-(typeof groundAt==='function'?groundAt(P.pos.x,P.pos.z):0);if(agl<600&&Math.abs(el)<3&&!j.gnd)L+=Math.abs(Math.sin(RW.clk*2.1+d*.0006))*r.envMultipathFadeDepthDb*.5;
  const duct=typeof SENSOR_FUSE!=='undefined'&&SENSOR_FUSE.reg&&SENSOR_FUSE.reg.propDuctTypeCurrent&&SENSOR_FUSE.reg.propDuctTypeCurrent!=='None';if(duct&&agl<400)L-=r.envDuctingEnhanceDb;
  // thermal and warmup drift of the receiver
  const warm=RW.clk-X.pwrT;L+=warm<r.rwrWarmupTimeS*3?r.rwrRxWarmupDriftDb*(1-warm/(r.rwrWarmupTimeS*3)):0;
  if(X.flt&&X.flt.mode==='Degraded_Sensitivity')L+=8;
  if(X.flt&&X.flt.mode==='Lost_Quadrant'){const q=Math.floor(((Math.atan2(Math.sin(a),Math.cos(a))*R2+405)%360)/90);if(q===X.flt.q)L+=40;}
  if(r.rwrRxArchitecture==='Crystal_Video'&&X.load>.6)L+=(X.load-.6)*r.rwrRxDesensitizationDb*2;       // a crystal-video set is blinded by strong or dense signals
  // the registry sensitivity relative to the family default is what makes (V)3 reach farther than ALR-46
  L+=(r.rwrRxSensitivityTssDbm-X.sens0);
  X.lastL=L;return cl(Math.pow(10,-L/20),.02,6);};
X.sens0=-63;

// probability that a scanning emitter is intercepted during one dwell
X.pHit=function(rc,sy){let p=r.pdwInterceptProbabilityPerScan;p*=1-X.blank;if(X.load>1)p*=1-cl(r.procOverloadMissRise*(X.load-1),0,.9);
  if(rc.e&&!rc.e.g&&rc.e.aesa)p*=1-r.thrLpiMissProbability*.6;if(r.rwrRxArchitecture==='Crystal_Video'&&r.rwrRxSimultaneousSignalLoss>0&&X.load>.3)p*=1-r.rwrRxSimultaneousSignalLoss*X.load;
  p*=1-r.pdwFreqAgilityBlurLoss*(rc.e&&rc.e.pd?1:.3);if(X.flt&&X.flt.mode==='Lost_Band'&&rc.cap*5>>0===X.flt.b)p=0;if(r.rwrPowerState==='Warmup'||r.rwrPowerState==='Failed')p=0;return cl(p,0,1);};

// confirmation, lock and uplink logic. Returns the mode to show (or null to keep the contact off the scope)
X.gate=function(rc,mode,clk,dt,d,e,sy,lk){if(r.rwrPowerState==='Warmup'||r.rwrPowerState==='Failed'||r.rwrPowerState==='Off')return null;
  rc.hits=(rc.hits||0)+(rc.seen===clk?1:0);if(rc.f0===undefined)rc.f0=clk;
  if(!rc.shown&&(clk-rc.f0<r.deintMinTimeToTrackS||rc.hits<r.deintEmitterNewConfirmHits))return null;
  if(mode==='T'||mode==='L'){if(lk){if(rc.lk0===undefined)rc.lk0=clk;}else rc.lk0=undefined;
    const need=r.thrLockContinuousIllumMs/1000;if(mode==='T'&&(rc.lk0===undefined||clk-rc.lk0<need))mode='S';           // a track radar must paint you for a while before it counts as a lock
    if(mode==='L'&&rc.upMiss===undefined)rc.upMiss=Math.random()<r.thrMissileGuidanceMissProb;if(mode==='L'&&rc.upMiss)mode='T';}
  else rc.lk0=undefined;
  // ID needs observation time; mode changes force a partial re-identification
  if(rc.pm&&rc.pm!==mode&&r.idModeChangeReidentify)rc.idT=(rc.idT||0)*.4;rc.idT=(rc.idT||0)+(clk-rc.seen<1.5?dt:0);return mode;};

// after the contact list is built: bearings, IDs, ranges, capacity, mode filter
X.post=function(list,sy,P){if(r.rwrPowerState==='Warmup'||r.rwrPowerState==='Failed'||r.rwrPowerState==='Off'){list.length=0;RW.msl.length=0;return;}
  const q=r.dfBearingQuantizationDeg,agl=P.pos.y-(typeof groundAt==='function'?groundAt(P.pos.x,P.pos.z):0);
  for(const t of list){const rc=RW.recs.get(t.j);if(!rc)continue;let a=t.a;
    a+=(r.dfSystematicBiasDeg+gn()*r.dfBearingJitterDeg)*D;if(agl<400)a+=gn()*r.dfMultipathErrorLowAlt*D*.5;a+=gn()*r.dfAirframeReflectionError*D*.3;
    if(rc.sl&&r.pdwSideLobeFalseBearing){if(rc.slOff===undefined)rc.slOff=(Math.random()<.5?-1:1)*(15+Math.random()*40)*D;a+=rc.slOff;}
    if(X.flt&&X.flt.mode==='Wrong_Bearing')a+=X.flt.off*D;
    if(r.dfBearingFlipAtBoundary){const aa=((a*R2%90)+90)%90;if(Math.abs(aa-45)<3&&Math.random()<.02)a+=Math.PI/2*Math.sign(Math.random()-.5);}      // amplitude-comparison sets jump between adjacent spirals
    if(q>0)a=Math.round(a*R2/q)*q*D;t.a=a;
    // range from received power with the library's ERP; sidelobe hits are assumed mainbeam, so they read too far
    let k=Math.pow(rc.dErr||1,r.rngErrorFraction/.28);if(rc.sl&&r.rngMainbeamAssumed)k*=1/Math.max(.12,.4);t.dEst=t.d*k;if(r.rngMethod==='None')t.dEst=t.e.R0*sy.k*.5;
    // identification: needs time, a coarse set can only name a class, and a similar emitter can be mistaken for another
    const need=r.idMatchTimeRequiredS,known=rc.idDone||need<=0?1:cl((rc.idT||0)/need,0,1);if(known>=1)rc.idDone=true;if(sy.id===0||known<1){t.idOk=false;t.sym=known<.5||r.idUnknownEmitterHandling==='Show_Unknown'?'U':t.sym;t.spoI=sy.id===0?t.spoI:-1;}
    else if(rc.idOk===false||Math.random()<0){t.sym=t.sym;}
    t.idConf=r.idMatchMinScore*known;}
  // tracker capacity, scope capacity, priority mode filter
  if(r.opModeCurrent==='Launch_Only')for(let i=list.length-1;i>=0;i--)if(list[i].mode!=='L')list.splice(i,1);
  else if(r.opModeCurrent==='Unknown_Only')for(let i=list.length-1;i>=0;i--)if(list[i].sym!=='U')list.splice(i,1);
  const cap=Math.min(r.deintMaxEmittersDisplayed,r.dispMaxSymbolsVisible||99);if(list.length>cap)list.length=cap;
  if(X.load>1&&r.procOverloadResponse==='Reduce_Display')list.length=Math.min(list.length,Math.ceil(cap/2));
  // overload produces ghost emitters on the scope
  if(X.load>1&&r.deintGhostEmitterEnabled&&Math.random()<r.procOverloadFalseAlarmRise*(X.load-1)*.01&&list.length<cap){const s=list[0];if(s)list.push(Object.assign({},s,{a:Math.random()*6.28-3.14,mode:'S',lk:false,ghost:true,dEst:s.dEst*(.8+Math.random()),score:0}));}
  // lost-quadrant fault: nothing from that sector
  if(X.flt&&X.flt.mode==='Lost_Quadrant')for(let i=list.length-1;i>=0;i--){const qq=Math.floor(((list[i].a*R2%360+405)%360)/90);if(qq===X.flt.q)list.splice(i,1);}
  X.top=list[0]||null;};

// RWR-driven dispenser: chaff for radar threats, flares when the missile seeker goes IR/active, with inhibits and a cooldown
X.autoCM=function(kind,P){if(!r.cmAutoDispenseEnabled)return false;if(kind==='launch'&&!r.cmAutoTriggerLaunch)return false;if(kind==='active'&&!r.cmAutoTriggerActive)return false;if(kind==='lock'&&!r.cmAutoTriggerLock)return false;
  const agl=P.pos.y-(typeof groundAt==='function'?groundAt(P.pos.x,P.pos.z):0);if(agl<r.cmAutoInhibitBelowAltitudeM)return false;if(r.cmAutoInhibitOnGround&&(P.onGround||P.gnd))return false;
  if(RW.clk-X.lastCM<r.cmAutoMinInterval)return false;X.lastCM=RW.clk;const n=Math.max(1,r.cmAutoProgramRepeatCount|0);
  for(let i=0;i<n;i++)setTimeout(()=>{try{for(let b=0;b<Math.max(1,r.cmAutoProgramChaffBurst|0);b++)cmdsRun('chaff');if(r.cmAutoProgramFlareBurst>0&&kind==='active')cmdsRun('flare');}catch(e){}},i*r.cmAutoProgramIntervalMs);return true;};
X.tone=(kind,dflt)=>{const f=kind==='launch'?r.audLaunchToneRepeatHz:r.audTrackToneRepeatHz;return r.audTonesEnabled&&f>0?1/f:dflt;};
X.uplinkRange=sy=>Math.max(sy.arh,r.thrMissileActiveDetectRange||0)*(r.thrMissileActivationAlert?1:0);

// ------------------------------------------------------------------ live mirror of the remaining sections
X.mirror=function(P,sy,since){const t=X.top,clk=RW.clk;
  r.rwrOwnerEntityID=P.id||0;r.rwrPowerDrawWatts=r.rwrReceiverCount*35;r.rwrThreatFileAgeDays=r.rwrThreatFileAgeDays||60;
  r.pdwProcessingLatencyMs=Math.max(r.pdwProcessingLatencyMs,5);r.pdwDwellCoverageFraction=cl(1-X.blank-(X.load>1?.2:0),0,1);
  r.rwrRxThresholdLevelDbm=r.rwrRxSensitivityTssDbm+(X.load>.6?3:0);r.rwrRxFalsePulseRate=Math.pow(10,(-r.rwrRxSensitivityTssDbm-40)/10)*10;
  r.thrStateCurrent=!t?'Unknown':t.mode==='L'?'Missile_Guidance':t.mode==='T'?'Lock':'Search';r.thrSearchDetect=!!RW.list.some(x=>x.mode==='S');r.thrTrackDetect=!!RW.list.some(x=>x.mode==='T');r.thrLockDetect=!!RW.list.some(x=>x.mode==='T'||x.mode==='L');
  r.thrMissileLaunchInferred=RW.msl.length>0||RW.list.some(x=>x.mode==='L');r.thrMissileLaunchConfidence=r.thrMissileLaunchInferred?cl(.6+.4*(sy.fam==='W'?1:.3),0,1):0;r.thrSpikeAlert=RW.list.some(x=>x.mode!=='S');
  r.opRecordEvents=true;r.dispBrightnessLevel=sys.rwr?sys.rwr.brt:1;r.audVolumeLevel=1;r.opFreezeDisplay=false;
  r.procEmitterTableFullPolicy=r.procEmitterTableFullPolicy;r.procOverloadDetectTimeMs=r.procOverloadDetectTimeMs||200;
  r.envHorizonRangeM=4120*(Math.sqrt(Math.max(P.pos.y,1))+Math.sqrt(8));r.envTerrainMaskedFlag=!!(t&&t.j&&t.j._rwL===false);
  if(t&&t.j){const j=t.j,e=t.e,d=t.d,lam=C/9.4e9,erp=10*Math.log10((e.g?4e5:1.2e5))+0,gr=r.rwrAntGainPeakDbi;
    r.emtrRangeToOwnM=d;r.emtrType=e.g?(e.R0>60000?'SAM_Search':'SAM_Track'):'Fighter_Radar';r.emtrModeCurrent=t.mode==='L'?'Guide':t.mode==='T'?'Track':'Search';r.emtrTargetBearingFromOwn=t.a*R2;r.emtrIlluminatingOwn=t.lk;r.emtrTrackingOwn=t.mode!=='S';r.emtrMissileInFlight=t.mode==='L';
    r.emtrReceivedPowerDbm=erp-30+gr+20*Math.log10(lam/(4*Math.PI*Math.max(d,1)))-r.rwrAntCableLossDb-r.rwrRadomeLossDb;r.emtrReceivedPowerEquation='Pt*Gt*Gr*lambda^2 / ((4 pi R)^2 * L)';r.emtrEmconSchedule=[];
    r.rngIsInsideLethalFlag=t.dEst<e.lethal;r.rngLethalEnvelopeMarginM=e.lethal*.1;r.envOneWayFreeSpaceLoss=20*Math.log10(4*Math.PI*Math.max(d,1)/lam);
    r.libEntryName=(e.g?(e.R0>60000?'SAM SEARCH':'SAM TRACK'):'AI RADAR');r.libEntryDisplayCode=t.sym;r.libEntryLethalRangeKm=e.lethal/1000;r.libEntryIsFriendly=false;r.idMatchScore=t.idConf==null?0:t.idConf+.3*(1-r.idMisidentifyProbability);r.idEmitterConfidence=t.idConf||0;
    r.scanTypeClassifier=t.mode==='L'||t.mode==='T'?'Lock_On':e.cone>=Math.PI?'Circular':'Sector';r.scanPeriodMeasuredS=e.scan;r.scanLockOnDetect=t.mode!=='S';r.prfClassMeasured=e.pd?'High':e.g?'Medium':'Low';
    r.thrScoreMode=t.mode==='L'?1:t.mode==='T'?.66:.2;r.thrScoreRange=cl(1-t.dEst/Math.max(e.R0,1),0,1);r.thrScoreTotal=(r.thrScoreMode+r.thrScoreRange)/2;}
  r.coopShareEmittersViaLink=r.coopShareEmittersViaLink;r.faultOperatingHoursTotal=(clk)/3600;r.faultCalibrationAgeHours=r.faultCalibrationAgeHours;};

// shared mirror to the radar-sensor registry's ESM section (this registry supersedes it for detail)
if(typeof SENSOR_FUSE!=='undefined'&&SENSOR_FUSE.mod)SENSOR_FUSE.mod('rwr-bridge',20,rr=>{rr.esmSensitivityDbm=r.rwrRxSensitivityTssDbm;rr.esmDfAccuracyRmsDeg=r.dfAccuracyRmsDeg;rr.esmEmitterMatchTimeS=r.idMatchTimeRequiredS;rr.esmDeinterleaveTimeS=r.deintMinTimeToTrackS;rr.esmPdwOverloadDropRate=r.pdwBufferOverflowLossFrac;rr.esmEmitterMisidProbability=r.idMisidentifyProbability;rr.esmLockOnDetect=true;rr.esmFalseAlarmRatePerHour=r.thrMissileLaunchFalseAlarm;});
console.info('[rwr] registry '+RWR_REG.names().length+' variables wired');
})();
