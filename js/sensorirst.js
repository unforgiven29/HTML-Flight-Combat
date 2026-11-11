/* =====================================================================================================================
   v268 — sensor registry sections 20-29 (IRST, passive ranging, radar + IRST fusion) wired to the IRST in radar.* (loads after
   sensorradar.js). `r.name =` inside F.mod = live value; `Q.name` in a hook = changes the sim.
   Optics are physical: pixel IFOV = pitch / focal length, FOV = pixels x IFOV, f-number = f / D, NEI from detector D* and area.
   ===================================================================================================================== */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'){console.warn('[sensorirst] fuse missing');return;}
const Q=F.Q,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),db=x=>10*Math.log10(Math.max(x,1e-30)),D=Math.PI/180,R=180/Math.PI;
const _v=new THREE.Vector3();
const hasIr=j=>!!(j.ac&&(j.ac.ols||j.ac.irst));

F.onSeed.push(function(r,j){const o=j.ac.ols||{},irst=!!(j.ac.ols||j.ac.irst),spin=!!o.spin,rot=!!o.rot;
  if(!irst){r.irstPowerState='Off';return;}
  Object.assign(r,{irstMountType:j.ac.cockpit==='fulcrum'||j.ac.cockpit==='flanker'?'Nose_Ball':j.type==='F-18E'?'Chin_Pod':'Nose_Ball',irstPowerState:'Operate',irstCooldownDurationS:rot?30:60,irstCooledDetector:true,irstCoolantRemainingS:3*3600,
    irstUncooledNoisePenalty:.6,irstHealth:1,irstFailureMode:'None',irstFailureChancePerSecond:1/(200*3600),irstElectricalPowerDrawWatts:800,irstWindowCleanliness:1,irstWindowHeatingFactor:1,
    irstSpectralBand:'MWIR',irstBandCenterMicrons:4,irstBandWidthMicrons:1.5,irstApertureDiameterMm:spin?120:rot?70:100,irstFocalLengthMm:spin?240:rot?105:200,irstOpticalTransmission:.78,
    irstDetectorResolutionX:spin?640:rot?256:512,irstDetectorResolutionY:spin?512:rot?256:512,irstFrameRateHz:50,irstIntegrationTimeMs:6,irstZoomLevelCurrent:0,irstZoomFovTable:[3.6,1.2,.4],
    irstGimbalAzLimitDeg:30,irstGimbalElLimitDeg:45,irstGimbalSlewRateDegS:60,irstGimbalAccelerationDegS2:400,irstGimbalStabilized:true,irstBoresightErrorDeg:.1,irstScanPatternType:'Raster',
    irstScanAnchoredToWorld:false,irstCoverageSectorList:[[0,0,60,20],[0,25,60,20]],irstFrameIntegrationCount:4,irstDeadPixelFraction:.002,irstFixedPatternNoise:.01,
    irstDetectionThresholdDb:12,irstFalseAlarmProbability:1e-7,irstDetectionRangeMaxM:o.tail?o.tail*2:30000,irstTrackConfirmHits:2,irstTrackConfirmWindow:3,irstTrackCoastTimeMaxS:6,irstTrackFilterType:'Alpha_Beta',
    irstTrackMaxCount:spin?24:rot?4:10,irstRangingMode:o.lrf?'None':'Maneuver_Based',irstRangeLaserEnabled:!!o.lrf,irstRangeLaserMaxM:o.lrf||0,irstRangeLaserAccuracyM:5,irstRangeLaserPulseDelayS:.3,
    irstRangeFromRadarCue:true,irstPassiveFireMinQuality:.6,irstModeSwitchDelayS:.5,irstTwsEnabled:spin,irstTwsMaxTracks:spin?24:0,irstSttEnabled:true,irstSttLockRangeM:o.tail||12000,irstSttLockTimeS:1.2,
    irstSttMemoryTimeS:3,irstSttReacquireRadiusDeg:3,irstSeekerCueToMissileOk:true,irstMissileCueAccuracyDeg:.5,irstMissileCueLatencyMs:80,irstLaunchPermissionPassive:true,irstGunCueEnabled:false,
    irstAutoAcquireEnabled:true,irstAutoAcquireFovDeg:3,irstPrioritySelection:'Closest',irstHelmetSlaveEnabled:j.ac.cockpit==='fulcrum',irstHelmetSlaveLatencyMs:50,irstHelmetSlaveSlewLimit:120,
    irstFlickerFilterEnabled:true,irstKinematicFlareFilter:true,irstRiseTimeFilterMs:40,irstFlareRejectionSkill:.6,irstFogRainRangeScalar:1,irstSignatureReductionAware:false,
    irstCloudGapDetectEnabled:false,irstDisplayMode:'Combined',irstVideoPolarity:'White_Hot',irstVideoGainLevel:.5,irstVideoContrastLevel:.5,irstVideoNoiseIntensity:.2,irstToneLockEnabled:true,irstToneSearchEnabled:true,irstToneVolume:.7,
    atmTransmissionClearPerKm:.97,atmTransmissionHumidPerKm:.93,atmTransmissionRainPerKm:.8,atmTransmissionFogPerKm:.5,atmCloudBlockingEnabled:true,atmCloudAttenuationDb:20,atmSunGlintEnabled:true,
    bgSunExclusionAngleDeg:25,bgSunBlindingStrength:.7,fusionEnabled:true,fusionArchitecture:'Track_Level',fusionUpdateRateHz:20,fusionCorrelationMethod:'Bearing_Match',fusionBearingGateDeg:2,fusionRangeGateM:2000,
    fusionVelocityGateMS:80,fusionMemoryTimeS:5,fusionTrackHandoffOnLoss:true,fusionTrackHandoffDelayS:.5,fusionRadarCueFromIrst:true,fusionRadarCueDwellTimeS:2,fusionIrstCueFromRadar:true,
    fusionIrstCueAccuracyDeg:.5,fusionIrstCueLatencyMs:100,fusionLaunchSolutionSource:'Fused',fusionLaunchOnPassiveOk:true,fusionStealthShotWindowM:o.tail?o.tail*.7:8000,fusionEmconStateAware:true,
    fusionJammedRadarFallback:true,fusionJammedRadarFallbackRange:'Passive_Estimate',fusionDisplayMergedSymbols:true,fusionDisplaySourceTags:true,fusionDisplayConfidenceRing:false,
    fusionQualityBonusMultiSensor:.25,fusionQualityPenaltySingle:.1,fusionAccuracyImprovementIrst:3,fusionDecoyRejectionBonus:.3,fusionEcmResilienceBonus:.3,fusionDecorrelationTimeS:3,
    aiIrstEnabled:true,aiIrstDoctrine:'Backup_To_Radar',aiIrstSkillLevel:.6,aiIrstTrackDelayS:1.5,aiIrstFlareResponseSkill:.5,aiIrstPerceptionUpdateS:.3,simIrstUpdateRateHz:30});
  F.ifov0=r.irstApertureDiameterMm;});

/* ---------- 20 identity, power, cooldown, failures ---------- */
let cool=0;
F.mod('s20',5,(r,c,dt)=>{if(!hasIr(c.P))return;const o=c.P.ac.ols||{};r.irstID=(o.name||'IRST');r.irstModelName=o.name||c.P.type+' IRST';r.irstOwnerEntityID=c.P.id||0;
  r.irstMountOffsetVec3=[0,.1,-(c.P.ac.len||15)/2+1];r.irstMountRotationOffsetDeg=[0,0,0];r.irstEmitsNothing=!(r.irstRangeLaserEnabled&&radar.sensor==='IRST'&&radar.mode==='STT');
  if(r.irstPowerState==='Cooldown'){r.irstCooldownRemainingS=Math.max(0,(r.irstCooldownRemainingS||r.irstCooldownDurationS)-dt);if(r.irstCooldownRemainingS<=0)r.irstPowerState='Operate';}
  else r.irstCooldownRemainingS=0;
  if(r.irstPowerState==='Operate'&&r.irstCooledDetector){r.irstCoolantRemainingS=Math.max(0,r.irstCoolantRemainingS-dt);}
  r.irstHealth=c.P.dm&&c.P.dm.irst!=null?cl(c.P.dm.irst/100,0,1):r.irstHealth;
  r.irstWindowHeatingFactor=cl(1.4-.35*Math.max(0,c.mach-.8),.4,1);
  if(r.irstPowerState==='Operate'&&r.irstFailureMode==='None'&&Math.random()<r.irstFailureChancePerSecond*dt){const x=Math.random();r.irstFailureMode=x<.4?'Degraded_Range':x<.7?'Intermittent':x<.9?'Stuck_Gimbal':'Dead';}
  if(r.irstFailureMode==='Dead')r.irstPowerState='Failed';});

/* ---------- 21 optics, field of view, gimbal, scan ---------- */
let barPrev=0;
F.mod('s21',10,(r,c)=>{if(!hasIr(c.P))return;const pitch=15e-3,f=r.irstFocalLengthMm,ap=r.irstApertureDiameterMm;
  r.irstFNumber=f/Math.max(ap,1);r.irstPixelIfovMrad=pitch/f*1000;r.irstInstantFovDeg=r.irstDetectorResolutionX*r.irstPixelIfovMrad/1000*R;
  r.irstAngularResolutionMrad=r.irstPixelIfovMrad*2;r.irstGimbalAzLimitDeg=radar.glimOf('IRST')*R;r.irstGimbalElLimitDeg=IRG.eu;
  r.irstGimbalCurrentAzDeg=radar.sensor==='IRST'?radar.antAz*R:r.irstGimbalCurrentAzDeg;r.irstGimbalCurrentElDeg=radar.sensor==='IRST'?radar.antEl*R:r.irstGimbalCurrentElDeg;
  r.irstGimbalCommandAzDeg=radar.sensor==='IRST'?radar.scanC*R:0;r.irstGimbalCommandElDeg=radar.sensor==='IRST'?radar.elCmd*R:0;
  r.irstGimbalAtLimitFlag=radar.sensor==='IRST'&&Math.abs(radar.antAz)>=radar.gimbal()-.01;r.irstStabilizationErrorDeg=.03+.02*Math.abs((+c.P.g||1)-1);
  r.irstGimbalSlewRateDegS=radar.rate*R*(radar.spin()?1.1:radar.rotor()?1.7:2.1);
  const n=radar.sensor==='IRST'?radar.nb():6,sp=radar.sensor==='IRST'?radar.bsp()*R:7.5;r.irstScanAzWidthDeg=radar.azs[radar.ai]*2;r.irstScanElHeightDeg=n*sp;r.irstScanCenterAzDeg=radar.scanC*R;r.irstScanCenterElDeg=radar.elCmd*R;
  r.irstScanRateDegS=r.irstGimbalSlewRateDegS;r.irstScanFrameTimeS=n*2*Math.min(radar.azs[radar.ai]*D,radar.gimbal())/Math.max(r.irstScanRateDegS*D,.01);
  r.irstScanDwellPerPositionMs=r.irstInstantFovDeg/Math.max(r.irstScanRateDegS,.01)*1000;r.irstIntegrationTimeMs=r.irstScanDwellPerPositionMs/Math.max(r.irstFrameIntegrationCount,1);
  if(radar.bar<barPrev)r.irstScanFrameCounter=(r.irstScanFrameCounter||0)+1;barPrev=radar.bar;
  r.irstScanPatternType=radar.sensor==='IRST'?(radar.mode==='STT'?'Fixed_Stare':radar.rotor()?'Sector':'Raster'):r.irstScanPatternType;
  r.irstBandWidthMicrons=r.irstSpectralBand==='MWIR'?1.5:r.irstSpectralBand==='LWIR'?4:r.irstSpectralBand==='SWIR'?.8:2.5;
  r.irstBandCenterMicrons=r.irstSpectralBand==='MWIR'?4:r.irstSpectralBand==='LWIR'?10:r.irstSpectralBand==='SWIR'?1.6:7;});

/* ---------- 22 target signature + atmosphere (the sim's own irRange model, expressed as registry values) ---------- */
F.mod('s22',5,(r,c)=>{const o=c.P.ac.ols||{tail:12000,head:5000},T=c.pt||c.L,tj=T;if(!hasIr(c.P))return;
  r.tgtIrIntensityRearW_sr=(o.tail||12000)*(o.tail||12000)/1e3*.01;r.tgtIrIntensityFrontW_sr=(o.head||5000)*(o.head||5000)/1e3*.01;r.tgtIrIntensitySideW_sr=Math.sqrt(r.tgtIrIntensityRearW_sr*r.tgtIrIntensityFrontW_sr);
  r.tgtIrAspectCurve=[[0,o.head/o.tail],[90,.55],[180,1]];r.tgtIrThrottleCurve=[[0,.55],[.85,.9],[1,1]];r.tgtIrAfterburnerMultiplier=1.9;r.tgtIrAltitudeCurve=[[0,.7],[9000,1],[15000,1.1]];
  r.tgtIrSkinTempRiseCoeff=0.2*288;r.tgtIrSkinEmissivity=.85;r.tgtIrSkinAreaFrontM2=6;r.tgtIrSkinContributionCurve=[[0,0],[1,.1],[2,.4],[3,1]];r.tgtIrPlumeLengthM=5;r.tgtIrPlumeTempC=650;
  r.tgtIrSuppressorFactor=tj&&tj.ac?(tj.ac.irs&&tj.ac.irs<1?1-tj.ac.irs:0):0;r.tgtIrDecoyActive=typeof decoys!=='undefined'&&decoys.some(d=>d.alive&&d.type==='flare');
  const E=typeof ENV!=='undefined'?ENV:{rain:0,wx:'CLEAR'},fog=E.P&&E.P.fog?E.P.fog:1.2e-5;
  r.atmWaterVaporContent=Math.max(1,12*Math.exp(-c.alt/2500));r.atmHazeDensity=cl(fog*8e4,0,1);r.atmTransmissionByBand=[[1.6,.9],[4,.95],[10,.85]];
  r.atmAltitudeDensityCurve=[[0,1],[5000,1.08],[10000,1.15]];r.atmPathRadianceW_sr_m2=r.irstSpectralBand==='LWIR'?30:3;r.atmCloudEdgeClutterEnabled=true;
  r.bgSkyRadianceCurve=[[-10,3],[0,2],[30,.8],[90,.4]];r.bgGroundRadianceCurve=[[0,.8],[6,1],[13,2.6],[18,1.8],[24,.8]];r.bgSeaRadiance=1.2;r.bgThermalCrossoverTimeHours=7.5;r.bgCloudClutterLevel=E.wx==='CLEAR'?.05:.4;
  r.atmTransmissionClearPerKm=.97;});

/* ---------- 23 detection / tracking (IRST) ---------- */
const eqSnr=(R0,d)=>40*Math.log10(Math.max(R0,1)/Math.max(d,1));
F.mod('s23',10,(r,c)=>{if(!hasIr(c.P))return;const o=c.P.ac.ols||{tail:12000,head:5000},g=radar.irGain?radar.irGain():1;
  r.irstDetectionRangeRearM=(o.tail||0)*g*r.irstHealth;r.irstDetectionRangeFrontM=(o.head||0)*g*r.irstHealth;r.irstDetectionRangeRefM=r.irstDetectionRangeRearM;
  r.irstIntegrationGainDb=db(Math.max(1,r.irstFrameIntegrationCount))*.8;r.irstNoiseEquivalentIrradiance=1e-13/Math.sqrt(Math.max(1,r.irstFrameIntegrationCount));
  r.irstAngularAccuracyRmsDeg=r.irstPixelIfovMrad*R/1000*.3;r.irstAngularAccuracySttDeg=r.irstAngularAccuracyRmsDeg*.4;
  const T=radar.sensor==='IRST'?(c.L||c.pt):null;
  if(T&&T.alive){const a=radar.ang(T.pos),Rr=radar.rdet(T,a),sn=radar.snr(T,a);r.irstSnrCurrentDb=db(sn);r.irstDetectionProbability=typeof pdOf==='function'?pdOf(sn):0;
    r.irstTrackFileID=T.id||0;_v.copy(T.pos).sub(c.P.pos).normalize();r.irstTrackBearingEstimate=[_v.x,_v.y,_v.z];
    const tk=radar.tracks.get(T);if(tk){const age=c.now-tk.t;r.irstTrackState=!T.alive?'Dropped':age>r.irstTrackCoastTimeMaxS?'Lost':age>2*Math.max(r.irstScanFrameTimeS,1)?'Coasting':(tk.n||1)>=r.irstTrackConfirmHits?'Confirmed':'Tentative';
      r.irstTrackQuality=cl((tk.n||1)/8*(1-age/Math.max(r.irstTrackCoastTimeMaxS,1)),0,1);r.irstTrackAfterburnerFlag=(T.ab||0)>.5;r.irstTrackIntensityEstimate=(T.thr==null?.85:T.thr)*(1+.9*(T.ab||0))*(T.ac.irs||1);
      r.irstTrackIntensityHistory=(r.irstTrackIntensityHistory||[]).concat(r.irstTrackIntensityEstimate).slice(-20);r.irstTrackGateSizeDeg=3*r.irstAngularAccuracyRmsDeg;
      const h=T._irH;if(h&&c.now>h.t){const dt=c.now-h.t;r.irstTrackBearingRate=[(_v.x-h.x)/dt,(_v.y-h.y)/dt,(_v.z-h.z)/dt];}T._irH={x:_v.x,y:_v.y,z:_v.z,t:c.now};}
    r.irstTrackBearingCovariance=[r.irstAngularAccuracyRmsDeg*D,0,0,r.irstAngularAccuracyRmsDeg*D];r.irstTrackFlareFlag=!!T.isFlare;}
  r.irstFalseAlarmSourceList=['sun_glint','cloud_edge','flare','hot_ground'];r.irstSpectralRatioTarget=.6;r.irstSpectralRatioFlare=1.4;r.irstSpectralRatioCurrent=r.irstSpectralBand==='Dual_Band'?.6:0;
  r.irstSttLockRangeM=Math.min(r.irstDetectionRangeRearM,o.tail||1e9);r.irstSttLockSnrRequiredDb=r.irstDetectionThresholdDb;r.irstSttMaintainSnrDb=r.irstDetectionThresholdDb-6;});

/* ---------- 24 passive ranging ---------- */
F.mod('s24',5,(r,c)=>{if(!hasIr(c.P))return;const T=c.L||c.pt,tk=T?radar.tracks.get(T):null;if(!T||!tk){r.irstRangeEstimateM=0;return;}
  const est=radar.trkR(T,tk),err=T._irE!=null?Math.abs(T._irE)*cl(tk.d/20000,.3,1):0;r.irstRangeEstimateM=est;r.irstRangeEstimateErrorFrac=err;r.irstRangeEstimateConfidence=cl(1-err*2,0,1);
  r.irstRangeEstimateAgeS=c.now-tk.t;r.irstRangeConvergenceTimeS=tk.d>(r.irstRangeLaserMaxM||1e9)?8:0;r.irstRangeConvergenceMinManeuverDeg=15;r.irstRangeIntensityAssumedRcs=T.ac?T.ac.rcs:5;
  r.irstRangeIntensityErrorFrac=.35;r.irstRangeLaserEmitsDetectable=true;r.irstClosureEstimateMS=tk.v&&tk.p?c.P.vel.dot(_v.copy(tk.p).sub(c.P.pos).normalize())-tk.v.dot(_v):0;r.irstClosureEstimateAccuracy=.15;
  r.irstPassiveSolutionQuality=cl(.4+.6*r.irstRangeEstimateConfidence,0,1);r.irstPassiveSolutionCovariance=[(r.irstRangeEstimateErrorFrac*est)**2,0,0];
  r.irstPassiveFireSolutionOk=r.irstPassiveSolutionQuality>=r.irstPassiveFireMinQuality&&r.irstLaunchPermissionPassive;
  _v.copy(T.pos).sub(c.P.pos).normalize();const f=T.fwd(new THREE.Vector3());r.irstTargetAspectEstimateDeg=R*Math.acos(cl(-_v.dot(f),-1,1));
  r.irstTargetTypeEstimate=T.ac&&T.ac.rcs>25?'Bomber':'Fighter';r.irstTargetTypeConfidence=.5;r.irstRangeLaserAccuracyM=5;r.irstRangeLaserMaxM=r.irstRangeLaserEnabled?radar.lrf:0;});

/* ---------- 25 IRST modes and fire control ---------- */
F.mod('s25',10,(r,c)=>{if(!hasIr(c.P))return;const S=radar.sensor==='IRST',L=S?c.L:null;
  r.irstModeCurrent=!S?'Search':radar.mode==='STT'?'Single_Target_Track':radar.mode==='TWS'?'Track_While_Scan':radar.mode==='ACM'?'Boresight':'Search';r.irstModeRequested=r.irstModeCurrent;
  r.irstTwsRevisitTimeS=r.irstScanFrameTimeS;r.irstLockedTargetEntityID=L?L.id||0:0;if(L){const a=radar.ang(L.pos);r.irstLockedBearingAzDeg=a.az*R;r.irstLockedBearingElDeg=a.el*R;}
  r.irstSttBreakReason=S&&radar.lostWhy?({GIMBAL:'Gimbal',LOST:'Range',NOTCH:'Occlusion',JAM:'DIRCM'}[radar.lostWhy]||'None'):'None';r.irstLaunchEnvelopeUsesPassive=true;r.irstGunCueRangeM=1500;
  r.irstNextTargetCommand=false;r.irstUnlockCommand=false;r.irstHelmetSlaveEnabled=r.irstHelmetSlaveEnabled;});

/* ---------- 26 hazards ---------- */
F.mod('s26',5,(r,c)=>{if(!hasIr(c.P))return;const E=typeof ENV!=='undefined'?ENV:{rain:0,P:{}},fog=E.P&&E.P.fog?E.P.fog:1.2e-5;
  const fl=typeof decoys!=='undefined'?decoys.filter(d=>d.alive&&d.type==='flare'):[];r.irstFlareCountVisible=fl.length;r.irstFlareIntensityW_sr=fl.length?5e3:0;r.irstFlareRiseTimeMs=120;r.irstFlareSeparationVelocityMS=15;
  r.irstFlareConfusionProb=fl.length?cl(.6*(1-r.irstFlareRejectionSkill*(r.irstKinematicFlareFilter?1:.6)),0,1):0;r.irstDircmActive=false;r.irstDircmDazzleStrength=0;r.irstDircmRecoveryTimeS=0;r.irstLaserDazzleVulnerability=.5;
  const los=_v.set(0,0,-1).applyQuaternion(c.P.q),sa=Math.acos(cl(los.dot(SUNDIR),-1,1))*R;r.irstSunInFovFlag=SUNDIR.y>.03&&sa<r.bgSunExclusionAngleDeg;r.irstSunBlindedTimeRemainingS=r.irstSunInFovFlag?Math.max(r.irstSunBlindedTimeRemainingS||0,5):Math.max(0,(r.irstSunBlindedTimeRemainingS||0)-.2);
  const T=c.L||c.pt;r.irstTerrainOccludedFlag=!!(T&&!terrLOS(c.P.pos,T.pos));r.irstCloudOccludedFlag=false;r.irstFogRainRangeScalar=cl(Math.exp(-(E.rain||0)*1.2-Math.max(0,fog-1.5e-5)*3e4),.15,1);
  r.irstHotGroundClutterLevel=cl(.3*Math.max(0,Math.sin((E.tod-6)/12*Math.PI)),0,1);r.irstExplosionFlashSaturation=0;r.irstEnemyIrSuppressionFactor=T&&T.ac&&T.ac.irs&&T.ac.irs<1?1-T.ac.irs:0;r.irstEnemyAfterburnerDisciplineAware=true;});

/* ---------- 27 display, 28 fusion, 29 controls / AI / sim ---------- */
F.mod('s27',5,(r,c)=>{if(!hasIr(c.P))return;const S=radar.sensor==='IRST',L=c.L;r.irstVideoZoomFactor=1;r.irstVideoBlurAmount=cl((L?radar.ang(L.pos).d:0)/(r.irstDetectionRangeRearM||1e5),0,1)*.5;
  r.irstStatusTextToHud=!S?'':r.irstSunInFovFlag?'SUN':radar.mode==='STT'?'LOCK':radar.mode==='ACM'?'ACM':'SRCH';r.irstFailureTextToHud=r.irstPowerState==='Cooldown'?'COOL':r.irstPowerState==='Failed'?'IRST FAIL':r.irstFailureMode!=='None'?'IRST '+r.irstFailureMode.toUpperCase():'';
  r.irstReticleType='Circle';r.irstReticleSizePx=48;r.irstBlipSymbolType='Diamond';r.irstBlipColorUnconfirmed='#ffd24a';r.irstBlipColorConfirmed='#6dff8a';r.irstBlipColorLocked='#ffffff';r.irstBlipColorFlare='#ff8a3d';r.irstBlipColorFused='#7fd4ff';
  r.irstVideoPageEnabled=true;r.irstBlipFlashOnLockEnabled=true;r.irstBearingOnlyIndicator='Line';r.irstRangeUnknownSymbol='?';r.irstRangeEstimateSymbolStyle='Dashed';r.irstFovBoxDrawEnabled=true;r.irstScanSectorDrawEnabled=true;
  r.irstDataBoxFields=['bearing','range_est','closure','aspect'];r.irstHudAzElCaretEnabled=true;r.irstOffscreenArrowEnabled=true;});
F.mod('s28',10,(r,c)=>{if(!hasIr(c.P))return;const L=c.L||c.pt,mask=(c.rdr||radar.coop()?1:0)|(radar.sensor==='IRST'||radar.coop()?2:0)|((typeof rwrEmitters==='function')?4:0)|(typeof DL!=='undefined'&&DL.on()?8:0);
  r.fusionSourceMask=mask;r.fusionSourceRadarActive=!!(mask&1)&&radar.on()&&F.radiating;r.fusionSourceIrstActive=!!(mask&2);r.fusionSourceRwrActive=!!(mask&4);r.fusionSourceDatalinkActive=!!(mask&8);
  r.fusionSourcePriorityOrder=['Radar','Datalink','IRST','RWR'];r.fusionTrackID=L?L.id||0:0;r.fusionRadarSilentMode=!F.radiating&&r.irstPowerState==='Operate';
  if(L){const tk=radar.tracks.get(L);if(tk&&tk.p){r.fusionPositionEstimate=[tk.p.x,tk.p.y,tk.p.z];r.fusionVelocityEstimate=tk.v?[tk.v.x,tk.v.y,tk.v.z]:[0,0,0];}
    const both=r.fusionSourceRadarActive&&r.fusionSourceIrstActive;r.fusionCorrelationConfidence=both?.9:.6;r.fusionAmbiguityFlag=r.trackAmbiguityFlag;r.fusionPositionCovariance=r.trackPositionCovariance;
    r.fusionRangeSourceCurrent=radar.noRng?'IRST_Passive':radar.sensor==='IRST'&&radar.lrf>0?'IRST_Laser':'Radar';r.fusionAngleSourceCurrent=both?'IRST':r.fusionSourceRadarActive?'Radar':'IRST';
    r.fusionIdentityFromSource=r.trackIdentity!=='Unknown'?'Radar_IFF':'Visual';r.fusionIdentityConfidence=r.trackIdentityConfidence;}
  r.fusionRadarCueEmissionPenalty=1.5;r.fusionDebugShowRawSensorTracks=false;});
F.mod('s29',5,(r,c)=>{if(!hasIr(c.P))return;r.ctrlIrstPowerKey='';r.ctrlIrstModeKey='\\';r.ctrlIrstFovKey='';r.ctrlIrstSlewAxisX='J/L';r.ctrlIrstSlewAxisY='I/K';r.ctrlIrstSlewSensitivity=1;r.ctrlIrstLockKey='Enter';r.ctrlIrstUnlockKey='U';
  r.ctrlIrstNextTargetKey='Tab';r.ctrlIrstSlaveToRadarKey='';r.ctrlIrstSlaveToHelmetKey='';r.ctrlIrstPolarityKey='';r.ctrlIrstGainUpKey='';r.ctrlIrstGainDownKey='';r.ctrlFusionToggleKey='';r.ctrlRadarSilentIrstOnlyKey='';
  r.ctrlMobileIrstTouchSlew=false;r.aiIrstUsesFusion=true;r.aiIrstSunTacticEnabled=false;r.aiIrstSilentApproachEnabled=false;r.aiIrstSilentApproachRangeM=15000;r.aiIrstAwarenessOfPlayerAb=true;
  r.simIrstUpdateBudgetMs=F._ms||0;r.simIrstMaxTargetsPerFrame=jets.length;r.simIrstRandomSeed=0;r.simIrstUseWebWorker=false;});

/* ======================= effects: registry -> sim ======================= */
// IRST on line: powered, cooled, not dead, not blinded; a failed unit gives nothing
{const _o=radar.on;radar.on=function(){const o=_o.call(this);if(!F.on||!F.reg||this.sensor!=='IRST')return o;
  const ps=Q.irstPowerState;if(ps==='Off'||ps==='Failed'||ps==='Cooldown'||ps==='Standby')return false;
  if(Q.irstFailureMode==='Intermittent'&&((performance.now()/700|0)%3===0))return false;return o;};}
// range of the IRST: health, window, heating, failure, coolant, weather, enemy suppression, and the band
{const _r=radar.irRange;radar.irRange=function(j,a,c){let R=_r.call(this,j,a,c);if(!F.on||!F.reg||!R)return R;
  let k=cl(Q.irstHealth,0,1)*cl(Q.irstWindowCleanliness,0,1)*cl(Q.irstWindowHeatingFactor,.2,1)*cl(Q.irstFogRainRangeScalar,.1,1)*(1-cl(Q.irstEnemyIrSuppressionFactor,0,.9));
  if(Q.irstFailureMode==='Degraded_Range')k*=.5;if(Q.irstCooledDetector&&Q.irstCoolantRemainingS<=0)k*=1-cl(Q.irstUncooledNoisePenalty,0,.95);
  k*=Math.pow(Math.max(.3,Q.irstOpticalTransmission/.78),.5)*Math.pow(Math.max(.4,Q.irstApertureDiameterMm/(F.ifov0||100)),1);
  if(Q.irstDetectionThresholdDb!=null)k*=Math.pow(10,(12-Q.irstDetectionThresholdDb)/40);
  if(Q.irstSunBlindedTimeRemainingS>0)k*=.4;return R*k;};}
// laser rangefinder fitted and its reach
{const d=Object.getOwnPropertyDescriptor(radar,'lrf');if(d&&d.get){const g=d.get;Object.defineProperty(radar,'lrf',{configurable:true,get(){const o=g.call(this);if(!F.on||!F.reg)return o;if(!Q.irstRangeLaserEnabled)return 0;return Q.irstRangeLaserMaxM||o;}});}}
// radar + IRST fusion off: the two sensors stop working as one
{const _c=radar.coop;radar.coop=function(){const o=_c.call(this);if(!F.on||!F.reg)return o;return o&&!!Q.fusionEnabled;};}
// commands
F.mod('fx-irst-cmd',10,(r)=>{if(!Q.irstNextTargetCommand&&!Q.irstUnlockCommand)return;if(Q.irstNextTargetCommand)try{radar.next();}catch(e){}if(Q.irstUnlockCommand)try{radar.drop();}catch(e){}
  F.reg.irstNextTargetCommand=false;F.reg.irstUnlockCommand=false;});
F.mod('fx-radar-cmd',10,(r)=>{const q=F.reg;if(q.nextTargetCommand){try{radar.next();}catch(e){}q.nextTargetCommand=false;}if(q.undesignateCommand){try{radar.drop();}catch(e){}q.undesignateCommand=false;}});
console.info('[sensorirst] sections 20-29 wired');
})();
