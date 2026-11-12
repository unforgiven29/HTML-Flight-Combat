/* =====================================================================================================================
   v268 — sensor registry sections 01-12 and 17-19 wired to the radar (loads after sensorfuse.js).
   Convention (scripts/sensor-coverage.js reads it): `r.name = ...` inside a F.mod() is a LIVE value the sim writes into the registry
   every frame; `Q.name` inside a hook is a registry value that CHANGES the sim. Seed-only values are listed as "stored".
   ===================================================================================================================== */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'){console.warn('[sensorradar] fuse missing');return;}
const Q=F.Q,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),db=x=>10*Math.log10(Math.max(x,1e-30)),un=x=>Math.pow(10,x/10),D=Math.PI/180,R=180/Math.PI,NM=1852,C=299792458;
const albersheim=(pd,pfa,n)=>{n=Math.max(1,n||1);const A=Math.log(.62/pfa),B=Math.log(pd/(1-pd));return -5*Math.log10(n)+(6.2+4.54/Math.sqrt(n+.44))*Math.log10(A+.12*A*B+1.7*B);};
F.albersheim=albersheim;
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(6.283185*v);};
const _v=new THREE.Vector3(),_w=new THREE.Vector3();

/* ---------- seeds that depend on the radar's own hardware (run when a registry is created) ---------- */
F.onSeed=F.onSeed||[];
F.onSeed.push(function(r,j){const pulse=!!j.ac.pulse,rd=j.ac.radar||{},esa=r.antennaType!=='Mechanical_Slotted_Planar';
  r.scanBarSpacingDeg=2.2;r.scanBarCount=radar.barsL[radar.bi];r.scanRatePerSecond=radar.rate*R;r.gimbalAzSlewRate=radar.rate*R;r.gimbalElSlewRate=radar.rate*R*.6;r.gimbalAcceleration=esa?0:600;
  r.noseAlignmentErrorDeg=.12;r.antennaRadomeLossDb=1.2;r.radomeAngleDependentLoss=[[0,0],[20,.1],[40,.4],[60,1.2],[90,3]];
  r.electronicSteeringLossCurve=esa?[[0,0],[15,.4],[30,1.3],[45,2.6],[60,4.5],[90,9]]:[];
  r.detectionProbabilityTarget=.5;r.falseAlarmProbability=1e-6;r.coherentIntegrationPulses=pulse?8:16;r.noncoherentIntegrationPulses=pulse?2:4;
  r.detectionThresholdSnrDb=albersheim(.5,1e-6,1);r.integrationGainDb=db(r.coherentIntegrationPulses)+.8*db(r.noncoherentIntegrationPulses);
  F.thr0=r.detectionThresholdSnrDb;F.int0=r.integrationGainDb;F.rres0=C*(r.pulseWidthMicroseconds*1e-6)/2/Math.max(1,r.pulseCompressionRatio);
  r.dopplerNotchEnabled=!pulse;r.dopplerNotchMinClosureMS=28;r.dopplerNotchWidthMS=28;r.lookDownShootDownEnabled=true;r.terrainMaskingEnabled=true;r.radarHorizonEnabled=true;
  r.dopplerProcessingEnabled=!pulse;r.mtiEnabled=pulse;r.altitudeLineClutterEnabled=true;r.dopplerFoldingEnabled=!pulse;r.dopplerFilterCount=!pulse?256:0;
  r.trackFilterType='Alpha_Beta';r.trackFilterAlpha=.45;r.trackFilterBeta=.12;r.trackCoastTimeMax=10;r.trackDropQualityThreshold=.1;
  r.trackConfirmationHits=2;r.trackConfirmationWindow=3;r.trackMaxCount=pulse?8:24;r.twsMaxTracks=pulse?0:10;r.rwsMaxTargets=pulse?8:24;
  r.trackAssociationMethod='Nearest_Neighbor';r.trackMergeDistanceM=250;r.trackSplitDistanceM=600;r.trackFormationDetectEnabled=true;
  r.lockLostGraceTimeS=1.2;r.lockMemoryTimeS=5;r.reLockAutoEnabled=false;r.lockVerificationScans=1;r.multiTargetTrackLimit=esa?r.twsMaxTracks:0;
  r.ecmNoiseJammerActive=false;r.eccmEnabled=(rd.ecc||0)>0;r.eccmFrequencyAgilityBonus=r.frequencyAgilityEnabled?.15:0;r.eccmSideLobeBlankingEnabled=!pulse;
  r.eccmSideLobeCancelerEnabled=(rd.ecc||0)>=.6;r.eccmSideLobeCancelerGainDb=r.eccmSideLobeCancelerEnabled?20:0;r.eccmChaffRejectionEnabled=!pulse;
  r.eccmChaffRejectionDopplerMS=40;r.eccmChaffRejectionDecelMS2=30;r.eccmLeadingEdgeTracking=(rd.ecc||0)>=.5;r.eccmTrackHistoryCheck=true;
  r.eccmMaxPlausibleAccelG=18;r.eccmMaxPlausibleSpeedMS=1100;r.eccmJamMemoryTimeS=3;r.eccmPowerBoostEnabled=false;r.eccmAutoModeSwitchEnabled=true;
  r.rwrEnabled=true;r.rwrBearingAccuracyDeg=8;r.rwrBearingResolutionDeg=15;r.rwrMaxEmitterCount=16;r.rwrPriorityScheme='Most_Lethal';r.rwrLaunchDetectEnabled=true;
  r.rwrDetectionSensitivityDbm=-60;r.rwrEmitterIdTimeS=3;r.rwrRangeEstimateAccuracy=.4;r.rwrSpikeThreshold=.5;r.rwrToneRepeatRateHz=4;
  r.envMultipathEnabled=true;r.envDuctingEnabled=true;r.envSolarInterferenceEnabled=false;
  r.aiRadarDoctrine='Always_On';r.aiRadarSkillLevel=.6;r.aiRadarTrackDelayS=1.5;r.aiRadarPerceptionUpdateS=.25;
  r.simRadarUpdateRateHz=60;r.simRadarTimeScale=1;r.simRadarLodDistanceFar=r.rangeDetectionMax*1.6;r.simRadarLodDistanceNear=20000;});

/* ---------- 01 identity / platform ---------- */
F.mod('s01',10,(r,c)=>{const P=c.P;
  _v.set(Math.sin(radar.antAz)*Math.cos(radar.antEl),Math.sin(radar.antEl),-Math.cos(radar.antAz)*Math.cos(radar.antEl)).applyQuaternion(P.q);
  r.boresightDirectionVec3=[_v.x,_v.y,_v.z];
  r.radarHealth=P.dm&&P.dm.rdr!=null?cl(P.dm.rdr/100,0,1):1;
  r.electricalPowerDrawWatts=r.radarPowerState==='Off'?0:r.radarPowerState==='Operate'?r.electricalPowerDrawWatts||3000:(r.electricalPowerDrawWatts||3000)*.4;});

/* ---------- 02 antenna and scan ---------- */
let barPrev=0;
F.mod('s02',10,(r,c)=>{const bw=radar.beam*R,k=[];for(let i=0;i<=12;i++){const x=i*bw*.5;k.push([+x.toFixed(2),+(-12*Math.pow(x/bw,2)).toFixed(2)]);}
  r.antennaGainPatternCurve=k;r.sideLobeAngularSpreadDeg=bw*1.5;r.antennaBeamwidthAzDeg=bw;
  r.gimbalStabilizationErrorDeg=.05+.03*Math.abs((+c.P.g||1)-1)
  r.scanPatternType=radar.mode==='STT'?'Lock_Hold':radar.mode==='ACM'?'Custom':'Raster_Bar';
  r.scanAzWidthDeg=radar.azs[radar.ai]*2;r.scanBarCount=radar.nb();r.scanElCenterDeg=radar.elCmd*R;
  r.scanDwellTimePerBeamMs=radar.beam/Math.max(radar.rate,.01)*1000;
  r.scanFrameTimeSeconds=radar.nb()*(2*Math.min(radar.azs[radar.ai]*D,radar.gimbal())/Math.max(radar.rate*(r.antennaType==='Mechanical_Slotted_Planar'?1:3),.01));
  if(radar.bar<barPrev)r.scanFrameCounter=(r.scanFrameCounter||0)+1;barPrev=radar.bar;
  r.scanElevationAnchored=radar.gl.stab>0;r.gimbalStabilizationEnabled=radar.gl.stab>0;});

/* ---------- 03 transmitter / waveform ---------- */
F.mod('s03',10,(r,c)=>{const prf=r.pulseRepetitionFrequencyHz||1,lam=C/(r.carrierFrequencyGHz*1e9);
  r.powerReductionLowProbIntercept=r.emconState==='Burst_Only'?.3:1;
  r.maxUnambiguousRangeM=C/(2*prf);r.maxUnambiguousVelocityMS=lam*prf/4;r.averagePowerWatts=r.peakPowerWatts*r.powerLevelCurrent*r.dutyCycle;
  r.prfJitterEnabled=r.eccmEnabled&&r.frequencyAgilityEnabled;r.prfJitterPercent=r.prfJitterEnabled?3:0;
  r.frequencyHopRateHz=r.frequencyAgilityEnabled?prf/4:0;});

/* ---------- 04 receiver ---------- */
F.mod('s04',10,(r,c)=>{r.detectionThresholdSnrDb=albersheim(cl(r.detectionProbabilityTarget,.05,.99),cl(r.falseAlarmProbability,1e-12,.1),1);
  r.integrationGainDb=db(Math.max(1,r.coherentIntegrationPulses))+.8*db(Math.max(1,r.noncoherentIntegrationPulses));
  r.receiverDynamicRangeDb=cl(6.02*(r.adcBits||12)-10,40,110);r.receiverSaturationLevel=r.receiverNoiseFloorDbm+r.receiverDynamicRangeDb;
  r.receiverRecoveryTimeUs=cl(r.pulseWidthMicroseconds*2,1,40);r.agcTimeConstant=r.receiverGainControlMode==='AGC'?.05:r.receiverGainControlMode==='Fixed'?0:.01;
  r.stcCurve=[[0,-40],[1000,-30],[5000,-12],[15000,-3],[30000,0]];r.cfarGuardCells=r.cfarGuardCells||2;});

/* ---------- 05 range equation / detection ---------- */
F.mod('s05',10,(r,c)=>{const P=c.P,L=c.L;r.rangeGateCount=Math.round(r.rangeDetectionMax/Math.max(r.rangeGateWidthM,1));
  r.rangeAccuracyRmsM=(P.ac.pulse?120:25)+(P.ac.pulse?.004:.0025)*(L?radar.ang(L.pos).d:20000);
  r.angleAccuracyRmsDeg=radar.beam*R/(1.6*Math.sqrt(2*Math.max(10,1)))*Math.max(.6,1);
  r.velocityResolutionMS=C/(r.carrierFrequencyGHz*1e9)*((r.pulseRepetitionFrequencyHz||1000)/Math.max(r.dopplerFilterCount,64))/2;r.velocityAccuracyRmsMS=r.velocityResolutionMS*.3;
  r.rcsFluctuationRateHz=.5;r.rcsWeaponsLoadMultiplier=1+.5*(L&&L.storeRcs?L.storeRcs()/Math.max(L.ac.rcs,.1):0);
  r.rcsLandingGearMultiplier=L&&L.gear>.5?1.4:1;r.rcsBayOpenMultiplier=1;r.rcsChaffCorridorMultiplier=r.ecmChaffCloudCount>0?3:1;
  r.rcsAspectCurveFront=[[0,.7],[30,.8],[60,1.1]];r.rcsAspectCurveSide=[[60,1.1],[90,1.6],[120,1.2]];r.rcsAspectCurveRear=[[120,1.1],[150,1.0],[180,1.2]];
  r.detectionLookDownPenaltyDb=r.detectionLookDownPenaltyDb||0;r.detectionLookUpBonusDb=r.detectionLookUpBonusDb||0;});

/* ---------- 06 doppler / clutter ---------- */
F.mod('s06',5,(r,c)=>{const lam=C/(r.carrierFrequencyGHz*1e9),prf=r.pulseRepetitionFrequencyHz||1000;
  r.dopplerFilterWidthHz=prf/Math.max(r.dopplerFilterCount,1);r.dopplerNotchWidthMS=r.dopplerNotchMinClosureMS;
  r.dopplerMainLobeClutterWidth=2*c.spd*radar.beam/lam;r.mtiBlindSpeedMS=lam*prf/2;r.mtiFilterOrder=r.mtiEnabled?2:0;
  r.dopplerBlindSpeedsList=[1,2,3,4].map(n=>n*lam*prf/2).filter(v=>v<1500);
  r.dopplerBlindZoneBeamAspect=90;r.dopplerBlindZoneDeg=r.dopplerNotchMinClosureMS/Math.max(c.spd,50)*R*1.1;
  r.groundClutterLevelDb=c.agl<3000?-20+8*(1-c.agl/3000):-30;r.altitudeLineVelocityMS=0;r.mainBeamClutterRangeM=radar.antEl<0?c.agl/Math.max(Math.sin(-radar.antEl),.02):0;
  r.sidelobeClutterLevelDb=r.sideLobeLevelDb+db(Math.max(1,c.spd))*.3;r.weatherClutterLevelDb=-30+(typeof ENV!=='undefined'?ENV.rain*40:0);
  r.clutterRejectionDb=r.dopplerNotchEnabled?60:r.mtiEnabled?35:20;r.lookDownMinVelocityMS=r.dopplerNotchMinClosureMS;r.dopplerFalseTargetRate=r.dopplerFoldingEnabled?.2:0;
  r.seaClutterLevelDb=-35;r.groundClutterByTerrainType=[[0,-45],[1,-25],[2,-18]];r.groundClutterByGrazingAngle=[[0,-45],[10,-35],[45,-22],[90,-12]];
  r.seaClutterBySeaState=[[0,-50],[3,-38],[6,-30]];r.lineOfSightCheckRays=1;r.lineOfSightCheckIntervalMs=1000/60;
  r.radarHorizonRangeM=F.horizon(c.P.pos.y,0);});

/* ---------- 07 modes ---------- */
F.mod('s07',10,(r,c)=>{const aw=radar.awg;r.twsTrackUpdateIntervalS=r.scanFrameTimeSeconds*(r.antennaType==='Mechanical_Slotted_Planar'?1:.4);
  r.twsTrackQualityPenalty=.25;r.modeSwitchDelaySeconds=.5;r.modeSwitchInProgress=false;r.samBumpExtendedSeconds=8;r.sttDwellFraction=radar.mode==='STT'?1-(radar.esaOn()?.45:0):0;
  r.sttRangeAccuracyBonus=3;r.sttBreakLockSnrDb=-3;const b=radar.acmBox();r.acmBoresightFovDeg=radar.beam*R;r.acmVerticalScanHeightDeg=30;r.acmBoresightMaxRangeM=10*NM;
  r.acmLockRangeMaxM=c.P.ac.cockpit==='fulcrum'?10000:radar.awg?15*NM:5*NM;r.acmSlewRateDegS=radar.rate*R;r.acmAutoLockEnabled=true;
  r.rangeScaleMeters=radar.ranges[radar.ri]*radar.unit;r.elevationCenterPilotDeg=radar.elCmd*R;r.radarMasterMode='AA';r.aaSubmodeIRST=radar.sensor==='IRST';
  r.radarModeRequested=r.radarModeCurrent;void b;void aw;});

/* ---------- 08 track file of the primary track (lock, bug, else nearest) ---------- */
const hist=new Map();
F.mod('s08',10,(r,c)=>{const tk=c.tk,j=c.pt;r.trackIsLocked=!!c.L;
  if(!tk||!j){r.trackFileID=0;r.trackTargetEntityID=0;r.trackState='Dropped';r.trackQuality=0;return;}
  const age=c.now-tk.t,n=tk.n||1,d=tk.d||1,sa=radar.beam/(1.6*Math.sqrt(2*Math.max(tk.snr||10,1)));
  r.trackFileID=j.id||0;r.trackTargetEntityID=j.id||0;r.trackLastDetectionTime=tk.t;
  if(!tk._b)tk._b=c.now;r.trackAgeSeconds=c.now-tk._b;
  r.trackQuality=cl(n/8*(1-age/Math.max(r.trackCoastTimeMax,1)),0,1);
  r.trackState=!SEEN(j)?'Dropped':age>r.trackCoastTimeMax?'Lost':age>2*Math.max(r.scanFrameTimeSeconds,1)?'Coasting':n>=r.trackConfirmationHits?'Confirmed':n>1?'Tentative':'Candidate';
  r.trackQualityGrowthRate=1/8/Math.max(r.scanFrameTimeSeconds,.5);r.trackQualityDecayRate=1/Math.max(r.trackCoastTimeMax,1);
  if(tk.p){r.trackPositionEstimate=[tk.p.x,tk.p.y,tk.p.z];r.trackAltitudeM=tk.p.y;}
  if(tk.v){r.trackVelocityEstimate=[tk.v.x,tk.v.y,tk.v.z];r.trackHeadingDeg=(Math.atan2(tk.v.x,-tk.v.z)*R+360)%360;
    const h=hist.get(j);if(h&&c.now>h.t){const dt=c.now-h.t;r.trackAccelerationEstimate=[(tk.v.x-h.v.x)/dt,(tk.v.y-h.v.y)/dt,(tk.v.z-h.v.z)/dt];}hist.set(j,{v:tk.v.clone(),t:c.now});
    _v.copy(tk.p||j.pos).sub(c.P.pos);const dist=_v.length();r.trackClosureRateMS=c.P.vel.dot(_v.divideScalar(Math.max(dist,1)))-tk.v.dot(_v);
    r.trackAspectAngleDeg=R*Math.acos(cl(-_v.dot(_w.copy(tk.v).normalize()),-1,1));}
  const sr=(c.pulse?120+.004*d:25+.0025*d),sp=sa*d;r.trackPositionCovariance=[sr*sr,sp*sp,sp*sp];r.trackVelocityCovariance=[sr*sr/4,sp*sp/4,sp*sp/4];
  r.trackFilterType='Alpha_Beta';const al=Math.min(1,Math.max(.45,2*(2*n-1)/(n*(n+1)))*radar.kA),be=Math.min(1,Math.max(.12,6/(n*(n+1)))*radar.kB);
  r.trackFilterGamma=0;r.trackProcessNoise=al*sp;r.trackMeasurementNoise=sp;
  r.trackManeuverDetectThreshold=3*sr;r.trackGateRangeM=3*sr;r.trackGateAngleDeg=3*sa*R;r.trackGateVelocityMS=3*r.velocityAccuracyRmsMS;
  r.trackGateExpansionOnCoast=age>1?.5:0;let close=0;for(const [k,t2] of radar.tracks)if(k!==j&&k.alive&&k.pos.distanceTo(j.pos)<r.trackMergeDistanceM)close++;
  r.trackAmbiguityFlag=close>0;r.trackFormationSizeEstimate=1+close;
  r.trackIdentity=typeof IFF!=='undefined'?({FRIEND:'Friend',POSS:'Friend',NOREPLY:'Hostile',UNK:'Unknown'}[IFF.status(j)]||'Unknown'):'Unknown';
  r.trackIdentityConfidence=typeof IFF!=='undefined'&&IFF.status(j)!=='UNK'?.9:.3;
  const sp2=tk.v?tk.v.length():0;r.trackTypeEstimate=sp2>1500?'Missile':sp2<80?'Helicopter':(j.ac&&j.ac.rcs>25)?'Bomber':'Fighter';
  r.trackIsHighestThreat=!!(tk&&j===[...radar.tracks.keys()].reduce((b,k)=>radar.threat(k,radar.tracks.get(k),c.now)<(b?radar.threat(b,radar.tracks.get(b),c.now):1e18)?k:b,null));
  r.trackThreatScore=1/Math.max(1,radar.threat(j,tk,c.now));r.trackIsLatched=j===radar.bug;r.trackIsSupportedByDatalink=!!(typeof DL!=='undefined'&&DL.seen&&DL.seen.has(j));
  r.trackSourceType=radar.sensor==='IRST'?'IRST':'Own_Radar';});

/* ---------- 09 lock ---------- */
F.mod('s09',10,(r,c)=>{r.lockAcquisitionRangeM=radar.rdet?c.L?radar.rdet(c.L,radar.ang(c.L.pos)):r.referenceDetectionRangeM:0;
  r.lockAcquisitionSnrRequiredDb=r.detectionThresholdSnrDb;r.lockMaintainSnrRequiredDb=r.detectionThresholdSnrDb-9;r.lockAcquisitionTimeS=r.lockVerificationScans*Math.max(r.scanFrameTimeSeconds,.5)*.5;
  r.lockAcquisitionRandomFactor=.2;r.lockLostGraceTimeS=radar.lostG;r.lockBreakConditionTerrain=radar.lostWhy==='TERRAIN';r.lockBreakConditionRange=radar.lostWhy==='LOST';
  r.lockWarningToneEnabled=true;r.lockToneState=radar.mode==='STT'?'Track':radar.on()?'Search':'Silent';r.reLockSearchRadiusDeg=5;r.reLockSearchTimeS=3;
  r.targetDesignatorElDeg=radar.cur.el*R;r.targetDesignatorSnapRadius=.09;r.targetDesignatorSlewRate=45;r.dataLinkTargetShareEnabled=typeof DL!=='undefined'&&DL.on();
  r.spikeCueEnabled=true;r.lockMemoryTimeS=r.lockMemoryTimeS||5;});

/* ---------- 10 ECM against this radar ---------- */
F.mod('s10',10,(r,c)=>{const L=c.L,e=L&&L.ecm,J=L?radar.jam(L):null,ghosts=[...radar.tracks.keys()].filter(j=>j.isGhost).length;
  if(e&&e.fit){r.ecmNoiseJammerPowerWatts=(e.fit.jp||0)*1000;r.ecmNoiseJammerBandwidthMHz=e.fit.bw||500;r.ecmJammerPodHealth=e.on?1:0;}
  r.ecmNoiseJammerBearingDeg=L?radar.ang(L.pos).az*R:0;r.ecmSelfScreeningEnabled=!!J;r.ecmStandoffJammerEnabled=false;
  r.ecmFalseTargetCount=ghosts;r.ecmFalseTargetSpread=1500;r.ecmFalseTargetLifetimeS=5;r.ecmRangeGatePullRateMS=J&&J.dec?J.rate*300:0;r.ecmVelocityGatePullRateMS2=J&&J.dec?J.rate*30:0;
  r.ecmDrfmDelayUs=J&&J.dec?5:0;r.ecmDrfmFidelity=J&&J.dec?.7:0;r.ecmBlinkJammingEnabled=false;r.ecmBlinkFrequencyHz=0;r.ecmAngleErrorInducedDeg=radar.rngErr?radar.pull:0;
  r.ecmChaffRcsM2=25;r.ecmChaffBloomTimeS=.4;r.ecmChaffLifetimeS=2.2;r.ecmChaffDopplerShiftMS=0;r.ecmChaffDecelerationS=1.5;r.ecmChaffCorridorLengthM=0;
  r.ecmDecoyActive=false;r.ecmDecoyRcsM2=0;r.ecmDecoySeparationM=0;r.ecmJamStrengthByRangeCurve=[[0,0],[20000,.3],[60000,1]];r.ecmJamStrengthByAspectCurve=[[0,1],[30,.6],[90,.2]];
  r.ecmJammerEnergyBudgetS=e&&e.fit?e.fit.dur||1e4:0;});

/* ---------- 11 ECCM ---------- */
F.mod('s11',10,(r,c)=>{r.eccmGatePullDetectThreshold=200;r.eccmDrfmDetectProbability=r.eccmEnabled?cl(radar.ecc,0,1):0;r.eccmOperatorOverrideEnabled=true;
  r.eccmHomeOnJamAngleOnly=true;r.eccmRangeGateGuardEnabled=radar.ecc>=.5;r.eccmVelocityGateGuardEnabled=radar.ecc>=.5;r.eccmPulseCompressionBonusDb=r.pulseCompressionEnabled?db(r.pulseCompressionRatio)*.5:0;
  r.eccmFrequencyAgilityBonus=r.frequencyAgilityEnabled?.1+.05*Math.log2(Math.max(r.frequencyHopSetSize,1)):0;r.eccmPowerBoostFactor=r.eccmPowerBoostFactor||1.5;});

/* ---------- 12 RWR installed on this aircraft ---------- */
F.mod('s12',5,(r,c)=>{let em=0,srch=0,trk=0,lnch=0;try{const l=typeof rwrEmitters==='function'?rwrEmitters(c.P):[];em=l.length;
    for(const j of l){const ai=j.ai;if(ai&&ai.radarLock&&ai.t===c.P)trk++;else if(j.alive)srch++;}}catch(e){}
  if(typeof missiles!=='undefined')for(const m of missiles)if(m.alive&&m.tgt===c.P)lnch++;
  r.rwrIsLockedWarning=trk>0;r.rwrIsTrackedWarning=trk>0;r.rwrIsSearchedWarning=srch>0;r.rwrDisplaySymbolType=lnch?'Missile_Active':trk?'Track':'Search';
  r.rwrEmitterLibraryID=1;r.rwrEmitterIdConfidence=cl(1-r.rwrRangeEstimateAccuracy,0,1);r.rwrLaunchDetectRange=60000;r.rwrDisplayRingRadius=1;
  r.rwrAudioSearchTone='rwr_search';r.rwrAudioTrackTone='rwr_track';r.rwrAudioLaunchTone='rwr_launch';r.rwrLpiRadarDetectChance=r.eccmEnabled?.4:.9;
  r.rwrMaxEmitterCount=Math.max(r.rwrMaxEmitterCount,em);});

/* ---------- 17 environment ---------- */
F.mod('s17',2,(r,c)=>{const E=typeof ENV!=='undefined'?ENV:null;if(!E)return;
  r.envWeatherType=E.wx;r.envRainRateMmHr=(E.rain||0)*25;r.envRainRadarAttenuationDb=r.rainLossDbPerKm*(c.L?radar.ang(c.L.pos).d/1000:20);r.envCloudDensity=E.P&&E.P.strat!=null?cl((E.P.cu||0)/150+(E.P.strat||0),0,1):0;
  r.envTimeOfDay=E.tod;r.envTerrainRoughness=.3;r.envTerrainFoliageClutter=.3;r.envUrbanClutterLevel=0;r.envWaterSurfaceState=3;r.envRfInterferenceLevel=0;
  r.envMultipathElevationError=r.envMultipathEnabled?Math.max(0,.3*R*c.P.pos.y/Math.max(1,c.L?radar.ang(c.L.pos).d:30000)):0;
  r.envDuctingRangeBonusM=r.envDuctingEnabled&&c.agl<800?4000*(1-c.agl/800):0;r.envStormCellPositions=[];r.envStormCellRcs=0;r.envStormCellRadius=0;});

/* ---------- 19 simulation performance ---------- */
let upd=0,ut=0;
F.mod('s19',1,(r,c,dt)=>{r.simRadarUpdateBudgetMs=F._ms||0;r.simRadarMaxTargetsPerScan=jets.length;r.simRadarLodSkipFrames=0;r.simRadarSpatialPartitioning=false;
  r.simRadarUseWebWorker=false;r.simRadarFixedTimestepS=0;r.simRadarDeterministicMode=false;r.simRadarRandomSeed=0;r.simRadarObjectPoolSize=r.trackMaxCount*2;
  });
{const _u=radar.update;radar.update=function(dt){const t=performance.now();const o=_u.call(this,dt);F._ms=F._ms*.9+.1*(performance.now()-t);return o;};F._ms=0;}

/* ======================= effects: registry -> sim ======================= */
// sync of tunables onto the sim object
F.mod('fx-track',20,(r)=>{radar.lostG=cl(Q.lockLostGraceTimeS||1.2,.1,10);radar.kA=cl((Q.trackFilterAlpha||.45)/.45,.2,2.2);radar.kB=cl((Q.trackFilterBeta||.12)/.12,.2,4);
  radar.kRng=cl(Math.max(.2,(Q.rangeResolutionM||F.rres0)/(F.rres0||1)),.2,5);});
// SNR modifiers: threshold, integration, radome and scan loss, min / max range, look-down, terrain masking
{const _s=radar.snr1;radar.snr1=function(j,a,loss){const q=F.reg;if(!F.on||!q||this.sensor!=='RDR')return _s.call(this,j,a,loss);
  const tm=window.terrLOS;let swap=false;if(q.terrainMaskingEnabled===false&&typeof tm==='function'){window.terrLOS=()=>true;swap=true;}
  let s;try{s=_s.call(this,j,a,loss);}finally{if(swap)window.terrLOS=tm;}
  if(!s)return s;if(a.d<Q.rangeDetectionMin||a.d>Q.rangeDetectionMax)return 0;
  if(!Q.lookDownShootDownEnabled&&a.el<-D)return 0;
  s*=un((F.thr0||13)-Q.detectionThresholdSnrDb)*un(Q.integrationGainDb-(F.int0||0));
  if(a.el<-D)s*=un(-(Q.detectionLookDownPenaltyDb||0));else s*=un(Q.detectionLookUpBonusDb||0);
  const oa=Math.abs(a.baz)*R;s*=un(-F.curve(Q.radomeAngleDependentLoss,oa));
  if(q.antennaType!=='Mechanical_Slotted_Planar')s*=un(-F.curve(Q.electronicSteeringLossCurve,oa));
  if(Q.rcsLandingGearMultiplier>1)s*=1;return s;};}
F.curve=(t,x)=>SENSOR_REG.curve(t,x);
// Doppler notch width from the registry
{const _n=radar.notch;radar.notch=function(j,a){const o=_n.call(this,j,a);const q=F.reg;if(!F.on||!q||this.sensor!=='RDR'||player.ac.pulse||a.el>-D)return o;
  if(!Q.dopplerNotchEnabled)return false;const vr=Math.abs(j.vel.dot(_v.copy(j.pos).sub(player.pos).normalize()));return vr<Q.dopplerNotchMinClosureMS;};}
// modes that are not fitted
{const _t=radar.setTWS;radar.setTWS=function(on){if(on&&F.reg&&!Q.twsEnabled){if(typeof flash==='function')flash('NO TWS',700);return;}return _t.apply(this,arguments);};
 const _st=radar.stt;radar.stt=function(j){if(F.reg&&!Q.sttEnabled){if(typeof flash==='function')flash('NO STT',700);return;}return _st.apply(this,arguments);};
 if(radar.setACM){const _a=radar.setACM;radar.setACM=function(){if(F.reg&&!Q.acmEnabled){if(typeof flash==='function')flash('NO ACM',700);return;}return _a.apply(this,arguments);};}}
// bar spacing, track capacity, systematic boresight error
{const _b=radar.bsp;radar.bsp=function(){if(this.sensor==='RDR'&&F.reg&&Q.scanBarSpacingDeg>0)return Q.scanBarSpacingDeg*D;return _b.call(this);};
 const _m=radar.meas;radar.meas=function(j,a,snr,out){const r=_m.call(this,j,a,snr,out);if(!F.on||!F.reg||this.sensor!=='RDR')return r;
  const e=(Q.noseAlignmentErrorDeg||0)*D;if(e){_w.copy(j.pos).sub(player.pos).normalize();_v.set(-_w.z,0,_w.x);if(_v.lengthSq()>1e-6)r.addScaledVector(_v.normalize(),e*a.d);}return r;};}
F.mod('fx-cap',5,(r,c)=>{const cap=radar.mode==='TWS'?Q.twsMaxTracks:Q.rwsMaxTargets,tm=Q.trackCoastTimeMax;
  for(const [j,tk] of radar.tracks){if(j===radar.lock||j===radar.bug||tk.hoj)continue;if(tm>0&&c.now-tk.t>tm)radar.tracks.delete(j);}
  if(cap>0&&radar.tracks.size>cap){const a=[...radar.tracks].filter(([j])=>j!==radar.lock&&j!==radar.bug).sort((p,q)=>(q[1].d||0)-(p[1].d||0));for(let i=0;i<radar.tracks.size-cap&&i<a.length;i++)radar.tracks.delete(a[i][0]);}});
// ECCM master switch: without ECCM the radar has no counter-deception
F.mod('fx-eccm',5,(r)=>{if(F._ecc0==null)F._ecc0=radar.ecc;if(!Q.eccmEnabled)radar.ecc=0;else if(radar.ecc===0)radar.ecc=F._ecc0;if(Q.eccmPowerBoostEnabled&&radar.hoj)F.reg.powerLevelCurrent=cl(Q.eccmPowerBoostFactor,1,3);});
console.info('[sensorradar] sections 01-12, 17, 19 wired');
})();
