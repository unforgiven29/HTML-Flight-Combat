/* =====================================================================================================================
   v268 — sensor registry sections 30-38 (pulse radar timing, compression, integration / CFAR, MTI, range and angle tracking, clutter,
   scope, hardware faults, interference). Everything is derived from the radar's own PRF, pulse width, aperture and the live flight
   state, so it is right for any radar (the Russian pulse sets use it directly; Doppler sets get the same timing physics).
   Effects: min range from blanking, compression / CFAR / integration / weighting losses, MTI minimum velocity, tube arcing, high-G
   dropouts, receiver gain drift, calibration offsets, mutual interference. Loads after sensorirst.js.
   ===================================================================================================================== */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'){console.warn('[sensorpulse] fuse missing');return;}
const Q=F.Q,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),db=x=>10*Math.log10(Math.max(x,1e-30)),un=x=>Math.pow(10,x/10),D=Math.PI/180,R=180/Math.PI,C=299792458;
const _v=new THREE.Vector3(),_w=new THREE.Vector3();

F.onSeed.push(function(r,j){const pulse=!!j.ac.pulse,pki=!!j.ac.pki,esa=r.antennaType!=='Mechanical_Slotted_Planar',old=pulse||/APQ|RP-22|Sapfir-23|Sapfir-25/.test(r.radarModelName);
  const pcr=Math.max(1,r.pulseCompressionRatio);
  Object.assign(r,{pulseRadarMode:pulse?'Low_PRF_Search':'Medium_PRF',pulseIntervalStaggerEnabled:pulse,pulseIntervalStaggerRatio:1.12,pulseWidthAutoSelect:pulse,pulseRiseTimeNs:60,pulseFallTimeNs:80,pulseShapeType:pcr>1?'Chirped':'Rectangular',
    pulseSecondTimeAroundEnabled:pulse,pulseSecondTimeAroundLevel:.2,pulseRangeUnfoldMethod:pulse?'None':'Multi_PRF',pulseMultiPrfCount:pulse?1:3,pulseMultiPrfDwellEach:5,pulseEclipsingEnabled:!pulse,pulseBurstEnabled:false,pulseBurstLength:8,pulseBurstIntervalMs:200,
    pcEnabled:pcr>1,pcType:esa?'Nonlinear_FM':'Linear_FM_Chirp',pcSidelobeWeighting:pcr>1?'Taylor':'None',pcCodeLength:pcr>1?13:0,pcCodeSwitchEnabled:false,pcDopplerToleranceMS:600,pcSidelobeLevelDb:pcr>1?-35:0,
    rangeInterpolationEnabled:!old,rangeWalkEnabled:true,rangeWalkCorrectionEnabled:!old,rangeSidelobeFalseTargets:old,
    integrationType:pulse?'Noncoherent':'Coherent',binaryIntegratorM:2,binaryIntegratorN:3,scanToScanIntegrationEnabled:false,scanToScanFrames:1,cfarMode:'CA',cfarWindowSize:16,cfarMaskingByStrongTarget:true,cfarClutterEdgeFalseAlarms:true,
    fixedThresholdLevel:0,detectionLogicOutput:pulse?'Video_Only':'Track_Initiation',plotExtractionEnabled:true,plotMergeRangeCells:2,plotMergeAngleCells:2,plotCentroidMethod:old?'Peak':'Monopulse',plotRatePerScanMax:60,plotOverloadDropMethod:'Weakest',
    pulseMtiEnabled:pulse,pulseMtiCancellerType:pulse?'Double':'Single',pulseMtiStaggerFlattening:.7,pulseMtiClutterLockEnabled:false,pulseMtiCoherentOscillator:!pulse,pulseMtiPhaseNoiseLimit:50,pulseMtiTangentialBlindZone:true,pulseMtiTrackerCoastOnBlind:true,pulseMtiTrackerCoastMaxS:2,pulseMtiToggleByPilot:pulse,pulseMtiAutoOffOverWater:false,pulseNonMtiClutterBlip:pulse,
    rangeGateTrackerEnabled:true,rangeGateLoopGain:.8,rangeGateLoopBandwidthHz:old?3:6,rangeGateVelocityAidEnabled:!old,rangeGateAccelerationAid:!old,rangeGateJumpLimitM:400,rangeGateStealThreshold:300,rangeGateMemoryEnabled:true,rangeGateMemoryTimeS:3,rangeGateAutoReacquire:true,rangeGateReacquireSpanM:3000,rangeGateBreakawayDetect:(j.ac.radar.ecc||0)>=.4,
    angleTrackMethod:old?'Conical_Scan':'Lobe_Switching',conicalScanRateHz:30,conicalScanSquintDeg:.8,conicalScanVulnerability:old?.8:.1,lobeSwitchRateHz:100,monopulseNullDepthDb:old?0:40,monopulseChannelImbalanceDb:.3,monopulsePhaseImbalanceDeg:2,
    angleTrackLoopBandwidthHz:old?2:5,angleTrackLoopGainAz:.8,angleTrackLoopGainEl:.8,angleTrackBreakLockRateDegS:old?25:45,angleTrackMaxRateDegS:old?20:40,angleTrackAntennaServoLagMs:old?120:60,angleTrackIntegratorEnabled:true,angleTrackAutoGainControl:true,angleTrackAgcTimeConstantS:.05,
    clutterModelType:'Constant_Gamma',clutterGammaTerrain:-15,clutterGammaSea:-25,clutterGammaCity:-8,clutterGammaForest:-17,clutterGammaDesert:-24,clutterGammaSnow:-20,clutterGrazingAngleCurve:[[0,-45],[10,-35],[30,-25],[60,-17],[90,-10]],
    clutterSpikinessFactor:.3,clutterCorrelationTimeMs:15,clutterMapEnabled:false,clutterMapCellSizeM:500,clutterMapUpdateRate:10,clutterSeaStateScaling:[[0,-50],[3,-38],[6,-30]],clutterSeaSpikesEnabled:false,clutterRainPolarizationEnabled:false,clutterRainPolarizationLossDb:3,clutterAngelsEnabled:false,clutterAnomalousPropEnabled:true,
    aScopeEnabled:pulse,aScopeSweepRateHz:50,aScopeVerticalGain:1,aScopeGateCursorEnabled:true,aScopeGateCursorColor:'#ffd24a',aScopeBeatingEnabled:true,aScopeFalseTargetPipsEnabled:true,bScopeRangeAxisOrientation:'Vertical_Up',bScopeTimeSmearEnabled:true,
    ppiPersistenceS:3,ppiRangeRingCount:4,ppiBearingMarksEnabled:true,ppiNorthUpMode:'Heading_Up',ppiSaturationBloomEnabled:true,ppiSideLobeSpokeEnabled:old,ppiSideLobeSpokeAngleDeg:12,ppiRingAroundEnabled:false,ppiAfterglowTailLength:.5,
    magnetronEnabled:old,twtEnabled:!old,magnetronLifeRemainingHours:800,twtLifeRemainingHours:2000,magnetronArcingChance:old?1/(60*3600):0,magnetronWarmupMs:old?90e3:0,waveguidePressurized:true,waveguideArcProbability:1/(400*3600),duplexerRecoveryUs:2.5,duplexerLeakageDb:-60,
    receiverAfcEnabled:old,receiverAfcLockRangeMHz:20,receiverAfcLockState:true,receiverGainDriftDbPerHour:old?.05:.01,receiverTemperatureCoeffDb:.02,calibrationOffsetRangeM:0,calibrationOffsetAzDeg:0,calibrationOffsetElDeg:0,calibrationLastTimeHours:0,calibrationDriftRatePerHour:old?.02:.005,
    selfTestEnabled:true,selfTestDurationS:old?30:15,selfTestResult:'Pass',maintenanceLevelFactor:.85,vibrationSensitivityFactor:old?.5:.2,gForceDegradeThresholdG:old?7:9,gForceDegradeProbability:old?.5:.1,emiBetweenSystemsEnabled:true,emiPulseBlankingEnabled:true,emiBlankingDutyLoss:.1,
    modulatorEnergyStorageJ:old?20:0,modulatorRechargeTimeMs:old?.5:0,highVoltageSupplyKv:old?18:12,highVoltageDropFactor:.02,
    interferenceMutualEnabled:true,interferenceMutualRangeM:20000,interferenceFruitEnabled:true,interferenceFruitRate:3,interferenceFrequencyAssign:old?'Fixed':'Automatic_Deconflict',interferenceChannelCount:old?1:8,interferenceChannelCurrent:0,interferenceChannelSpacingMHz:40,interferenceChannelBestSelect:!old,
    interferenceSidelobeCoupling:-60,interferenceNearFieldRadius:300,interferenceRandomPrfOffset:.02,interferenceCommsBandOverlap:false,interferenceVisualStrobe:true,interferenceVisualStrobeAngle:0,pulseDetectedByEnemyRwr:true,pulseSignatureUnique:!r.prfJitterEnabled,
    pulseSignatureJitterHide:.4,pulseSignatureAgilityHide:.5,pulseLpiBurstModeEnabled:false,pulseLpiPowerManagement:esa,pulseLpiDetectRangeScalar:1});
  const ratio=Math.max(1,r.pulseCompressionRatio);F.pc0=db(ratio);F.pw0=r.pcSidelobeWeighting==='None'?0:1.2;F.cfar0=1.5;F.il0=.8;F.t0=performance.now()/1000;});

/* ---------- 30 timing ---------- */
F.mod('s30',10,(r,c)=>{const prf=Math.max(r.pulseRepetitionFrequencyHz,1),pri=1e6/prf,pw=r.pulseWidthMicroseconds;
  r.pulseIntervalUs=pri;r.pulseTimerCurrentUs=(performance.now()*1000)%pri;r.pulseIntervalStaggerSet=[pri,pri*r.pulseIntervalStaggerRatio,pri/r.pulseIntervalStaggerRatio];r.pulseIntervalStaggerIndex=(performance.now()/10|0)%3;
  r.pulseWidthShortUs=pw*.4;r.pulseWidthLongUs=pw*2;r.pulseWidthSelectedUs=r.pulseWidthAutoSelect?(radar.ranges[radar.ri]*radar.unit<(r.referenceDetectionRangeM||5e4)*.35?r.pulseWidthShortUs:r.pulseWidthLongUs):pw;
  r.pulseEnergyJoules=r.peakPowerWatts*r.powerLevelCurrent*r.pulseWidthSelectedUs*1e-6;r.pulseTrainDwellMs=radar.beam/Math.max(radar.rate,.01)*1000;r.pulseTrainLength=Math.round(prf*r.pulseTrainDwellMs/1000);
  r.pulseHitsPerScan=Math.round(radar.beam*prf/Math.max(radar.rate,.01));r.pulseHitsPerScanFormula='beamwidth * PRF / scan rate';
  r.pulseTransmitBlankingUs=r.pulseWidthSelectedUs;r.pulseRecoveryDeadTimeUs=Math.max(r.duplexerRecoveryUs,r.receiverRecoveryTimeUs);
  r.pulseMinRangeFromWidthM=C*r.pulseWidthSelectedUs*1e-6/2;r.pulseMinRangeFromBlankingM=C*(r.pulseTransmitBlankingUs+r.pulseRecoveryDeadTimeUs)*1e-6/2;
  r.pulseMaxUnambiguousRangeM=C*pri*1e-6/2;const L=c.L||c.pt,d=L?radar.ang(L.pos).d:0;
  r.pulseRangeFoldingList=d?[0,1,2,3].map(k=>d+k*r.pulseMaxUnambiguousRangeM):[];r.pulseSecondTimeAroundLevel=r.pulseSecondTimeAroundEnabled?Math.min(.5,d?(d/r.pulseMaxUnambiguousRangeM>1?.3:.05):0):0;
  const ru=r.pulseMaxUnambiguousRangeM,gate=C*pw*1e-6/2;r.pulseEclipsedRangeBands=r.pulseEclipsingEnabled?[1,2,3,4].map(k=>[k*ru-gate,k*ru+gate*2]):[];r.pulseEclipseLossFraction=cl(pw*1e-6*prf,0,1);
  r.pulseBurstEnabled=r.emconState==='Burst_Only';
  r.pulseRadarMode=radar.mode==='STT'?'Pulse_Track':c.pulse?'Low_PRF_Search':r.prfMode==='High'?'Pulse_Doppler':r.prfMode==='Low'?'Low_PRF_Search':'Medium_PRF';});

/* ---------- 31 compression, range processing ---------- */
F.mod('s31',10,(r,c)=>{const pcr=Math.max(1,r.pulseCompressionRatio),pw=r.pulseWidthMicroseconds;r.pcEnabled=pcr>1;r.pcTimeBandwidthProduct=pcr;r.pcBandwidthMHz=pcr/Math.max(pw,.01);r.pcCompressionGainDb=db(pcr)*(r.pcEnabled?1:0);
  r.pcRangeResolutionM=C/(2*Math.max(r.pcBandwidthMHz,1/Math.max(pw,.01))*1e6);r.pcWeightingLossDb=r.pcSidelobeWeighting==='None'?0:r.pcSidelobeWeighting==='Taylor'?1.0:r.pcSidelobeWeighting==='Hamming'?1.35:1.7;
  r.pcSidelobeLevelDb=!r.pcEnabled?0:r.pcSidelobeWeighting==='None'?-13:r.pcSidelobeWeighting==='Taylor'?-35:r.pcSidelobeWeighting==='Hamming'?-43:-58;
  r.pcDopplerMismatchLossDb=r.pcEnabled?cl(Math.pow(c.spd*2/Math.max(r.pcDopplerToleranceMS,1),2)*3,0,9):0;r.pcChipDurationNs=r.pcCodeLength?pw*1000/r.pcCodeLength:0;r.pcCodeSet=r.pcCodeLength?['B13','B11','B7']:[];r.pcCodeSwitchRateHz=r.pcCodeSwitchEnabled?r.pulseRepetitionFrequencyHz:0;
  r.pcCodeKnownToJammer=false;r.pcCodeMismatchRejectDb=r.pcEnabled?db(r.pcCodeLength||pcr):0;r.pcType=r.pcType;
  r.rangeBinSizeM=Math.max(r.pcRangeResolutionM,r.rangeResolutionM||0)/1.2;r.rangeBinCount=Math.round(Math.min(r.maxUnambiguousRangeM,r.rangeDetectionMax)/Math.max(r.rangeBinSizeM,1));r.rangeBinSampleRateMHz=C/(2*Math.max(r.rangeBinSizeM,.1))/1e6;
  r.rangeBinStraddleLossDb=r.rangeInterpolationEnabled?.9:2.1;r.rangeInterpolationError=r.rangeInterpolationEnabled?r.rangeBinSizeM*.08:r.rangeBinSizeM*.29;r.rangeSidelobeGhostSpacingM=r.rangeBinSizeM*1.5;});

/* ---------- 32 integration / CFAR / plots ---------- */
F.mod('s32',10,(r,c)=>{const n=Math.max(1,r.coherentIntegrationPulses)*Math.max(1,r.noncoherentIntegrationPulses),ideal=db(n);r.integrationPulseCount=n;r.integrationEfficiency=cl(r.integrationGainDb/Math.max(ideal,.1),0,1);
  r.integrationLossDb=Math.max(0,ideal-r.integrationGainDb);r.integrationFluctuationLoss=r.rcsFluctuationModel==='Steady'?0:r.rcsFluctuationModel==='Swerling_1'?2.5:1.2;r.cfarMode=r.cfarType;r.cfarGuardCellCount=r.cfarGuardCells;
  r.cfarThresholdScalar=r.cfarReferenceCells*(Math.pow(r.falseAlarmProbability,-1/Math.max(r.cfarReferenceCells,1))-1);r.cfarCaLossDb=r.detectionThresholdAdaptive?(r.cfarType==='CA'?1.5:r.cfarType==='OS'?1.8:1.3):0;r.cfarWindowSize=r.cfarReferenceCells/2;
  r.fixedThresholdLevel=r.detectionThresholdAdaptive?0:r.detectionThresholdSnrDb;const L=c.L||c.pt;
  if(L){const a=radar.ang(L.pos),sn=radar.snr(L,a);r.plotSnrValue=db(sn);r.plotRangeValueM=a.d;r.plotAzValueDeg=a.az*R;r.plotElValueDeg=a.el*R;r.plotTimestamp=c.now;r.plotAmplitudeValue=Math.sqrt(Math.max(sn,0));}
  r.plotOverloadFlag=radar.tracks.size>r.plotRatePerScanMax;r.scanToScanAssociationGateM=r.trackGateRangeM||600;});

/* ---------- 33 MTI / blind speeds ---------- */
F.mod('s33',10,(r,c)=>{const lam=C/(r.carrierFrequencyGHz*1e9),prf=r.pulseRepetitionFrequencyHz||1000,v1=lam*prf/2,nOrd=r.pulseMtiCancellerType==='Single'?1:r.pulseMtiCancellerType==='Double'?2:3;
  r.pulseMtiEnabled=r.mtiEnabled;r.pulseMtiFirstBlindSpeedMS=v1;r.pulseMtiBlindSpeedList=[1,2,3,4,5].map(k=>k*v1).filter(v=>v<2000);r.pulseMtiBlindSpeedLossDb=40;r.pulseMtiImprovementFactorDb=Math.min(60,20*nOrd+(r.pulseMtiCoherentOscillator?10:0))-(r.pulseMtiPhaseNoiseLimit<45?3:0);
  r.pulseMtiResponseCurve=[0,.25,.5,.75,1].map(f=>[+(f*v1).toFixed(1),+(Math.pow(Math.sin(Math.PI*f*2/2),2*nOrd)).toFixed(3)]);r.pulseMtiMovingClutterLevel=-30+(typeof ENV!=='undefined'?ENV.rain*30:0);
  r.pulseMtiMinDetectableVelMS=r.pulseMtiEnabled?(player.ac.pulse?45:r.dopplerNotchMinClosureMS):0;r.pulseMtiTangentialBlindDeg=r.pulseMtiMinDetectableVelMS/Math.max(c.spd+250,100)*R;r.pulseMtiDisplayFade=true;r.pulseNonMtiClutterBlip=!r.pulseMtiEnabled;});

/* ---------- 34 range gate and angle tracking ---------- */
F.mod('s34',10,(r,c)=>{const L=c.L;r.rangeGateWidthUs=r.pulseWidthSelectedUs*1.5;r.rangeGateWidthM=C*r.rangeGateWidthUs*1e-6/2;r.rangeGateCaptureWindowM=r.rangeGateWidthM*3;
  if(L&&radar.mode==='STT'){const a=radar.ang(L.pos),sn=radar.snr(L,a);r.rangeGateCenterM=a.d+radar.rngErr;const e=Math.max(0,sn)**.5;r.rangeGateEarlyAmplitude=e*(.5+radar.pull*.3);r.rangeGateLateAmplitude=e*(.5-radar.pull*.3);r.rangeGateErrorSignal=r.rangeGateEarlyAmplitude-r.rangeGateLateAmplitude;
    const cl2=Math.abs(c.P.vel.dot(_v.copy(L.pos).sub(c.P.pos).normalize())-L.vel.dot(_v));r.rangeGateLagErrorM=r.rangeGateAccelerationAid?0:cl2*.02/Math.max(r.rangeGateLoopGain,.1)/Math.max(r.rangeGateLoopBandwidthHz,.5)*.1;
    const ang=Math.abs(L.vel.clone().sub(c.P.vel).cross(_v.copy(L.pos).sub(c.P.pos).normalize()).length()/Math.max(a.d,1))*R;r.angleTrackLagErrorDeg=ang/Math.max(r.angleTrackLoopBandwidthHz*6.28,1);r.angleTrackJamErrorDeg=radar.pull*2;
    r.monopulseGlintErrorDeg=Math.sqrt(3*(L.ac.S||30))*.25/Math.max(a.d,200)*R;r.monopulseMultipathErrorDeg=r.envMultipathElevationError;}
  r.conicalScanModulationDepth=r.conicalScanSquintDeg/Math.max(radar.beam*R,.1)*1.2;r.monopulseSumGain=1;r.monopulseDifferenceGainAz=.9;r.monopulseDifferenceGainEl=.9;r.monopulseSlopeDegPerUnit=radar.beam*R/1.6;
  r.angleTrackSingleChannelNoise=radar.beam*R/(1.6*Math.sqrt(2*Math.max(10,1)));});

/* ---------- 35 clutter ---------- */
F.mod('s35',5,(r,c)=>{const E=typeof ENV!=='undefined'?ENV:{rain:0},pw=r.pulseWidthSelectedUs,rr=c.agl/Math.max(Math.sin(Math.max(-radar.antEl,.02)),.02);
  r.clutterPulseLimitedAreaM2=rr*radar.beam*(C*pw*1e-6/2);r.clutterBeamLimitedAreaM2=Math.pow(rr*radar.beam,2);r.clutterCellAreaM2=Math.min(r.clutterPulseLimitedAreaM2,r.clutterBeamLimitedAreaM2);
  const sig=un(r.clutterGammaTerrain)*Math.sin(Math.max(-radar.antEl,.05)),Pc=sig*r.clutterCellAreaM2/(4*Math.PI*rr*rr||1);r.clutterToNoiseDb=db(Pc*1e9+1e-9)-(r.receiverNoiseFloorDbm||-100)*0;r.clutterRangeExtentM=c.agl*8;
  r.clutterRainBackscatterDbz=E.rain?20+E.rain*30:-99;r.clutterRainDopplerSpreadMS=E.rain?3:0;r.clutterRainCellList=[];r.clutterAngelsDensity=r.clutterAngelsEnabled?4:0;r.clutterAnomalousPropRangeM=r.envDuctingEnabled?r.envDuctingRangeBonusM*10:0;
  r.clutterMapFalseSuppression=r.clutterMapEnabled?.05:0;r.clutterSeaSpikeRate=0;r.clutterDisplayTextureSeed=Math.floor(c.now/20);});

/* ---------- 36 scope ---------- */
F.mod('s36',10,(r,c)=>{r.ppiSweepAngleDeg=((radar.antAz*R)+360)%360;r.ppiSweepRateRpm=radar.rate*R/6;r.ppiRangeRingSpacingM=radar.ranges[radar.ri]*radar.unit/Math.max(r.ppiRangeRingCount,1);
  r.aScopeNoiseVisualLevel=.25+(radar.hoj?.5:0);r.aScopeJammingGrassLevel=radar.hoj?.9:r.ecmNoiseJammerActive?.7:0;r.aScopeChaffPipWidth=r.ecmChaffCloudCount?3:0;r.aScopeTargetPipHeight=c.L?cl(Math.sqrt(Math.max(radar.snr(c.L,radar.ang(c.L.pos)),0))/6,0,1):0;
  r.aScopeGroundReturnShape=[[0,1],[c.agl,.8],[c.agl*3,.3]];r.ppiPersistenceCurve=[[0,1],[1,.5],[3,.05]];r.ppiEchoBrightnessFromAmp=[[0,0],[.5,.5],[1,1]];r.ppiGainKnobCurve=[[0,-12],[.5,0],[1,12]];
  r.ppiSensitivityTimeControl=.5;r.ppiFastTimeConstantFtc=0;r.ppiAfcLockLostFlag=!r.receiverAfcLockState;r.ppiTuneKnobError=r.receiverAfcEnabled?0:.05;r.ppiTuneDriftRate=r.receiverAfcEnabled?0:.001;r.ppiSecondTraceEchoEnabled=r.pulseSecondTimeAroundEnabled;});

/* ---------- 37 hardware faults ---------- */
F._arc=0;
F.mod('s37',10,(r,c,dt)=>{const hrs=(c.now-(F.t0||c.now))/3600,tx=r.radarPowerState==='Operate'&&F.radiating;
  r.calibrationLastTimeHours=hrs;if(tx){r.magnetronLifeRemainingHours=Math.max(0,r.magnetronLifeRemainingHours-dt/3600);r.twtLifeRemainingHours=Math.max(0,r.twtLifeRemainingHours-dt/3600);}
  const wear=cl(1-(r.magnetronEnabled?r.magnetronLifeRemainingHours/800:r.twtLifeRemainingHours/2000),0,1);r.magnetronFrequencyDriftMHz=r.magnetronEnabled?wear*8+Math.sin(c.now/40)*2:0;r.twtGainDriftDb=r.twtEnabled?-wear*1.5:0;
  r.receiverLocalOscDriftHz=r.receiverAfcEnabled?Math.sin(c.now/30)*2e4:Math.sin(c.now/30)*2e5;r.receiverAfcLockState=!r.receiverAfcEnabled||Math.abs(r.magnetronFrequencyDriftMHz)<r.receiverAfcLockRangeMHz;r.highVoltageDropFactor=tx?Math.min(.1,r.dutyCycle*3):0;
  r.rotaryJointNoiseLevel=.02;r.waveguideLeakRate=r.waveguidePressurized?.0001:.01;r.calibrationOffsetRangeM=r.calibrationDriftRatePerHour*hrs*60;r.calibrationOffsetAzDeg=r.calibrationDriftRatePerHour*hrs*.4;r.calibrationOffsetElDeg=r.calibrationDriftRatePerHour*hrs*.3;
  r.receiverGainDriftDbPerHour=r.receiverGainDriftDbPerHour;r.selfTestResult=r.radarFailureMode==='None'&&r.radarHealth>.8?'Pass':r.radarHealth>.4?'Degraded':'Fail';r.selfTestFailCodes=r.selfTestResult==='Pass'?[]:['RDR-'+(r.radarFailureMode||'DMG').slice(0,3).toUpperCase()];
  r.emiBlankingDutyLoss=r.emiPulseBlankingEnabled?.08:0;
  // arcing: a magnetron at high duty or a waveguide arc drops the transmitter for a moment
  F._arc=Math.max(0,F._arc-dt);
  if(tx&&F._arc<=0){const p=(r.magnetronArcingChance*(1+3*wear)+r.waveguideArcProbability*(r.waveguidePressurized?1:100))*dt;if(Math.random()<p){F._arc=1+Math.random()*2;if(typeof flash==='function')flash('RADAR ARC',900);}
    const g=Math.abs(+c.P.g||1);if(g>r.gForceDegradeThresholdG&&Math.random()<r.gForceDegradeProbability*r.vibrationSensitivityFactor*dt*10)F._arc=.5+Math.random();}});

/* ---------- 38 interference ---------- */
F.mod('s38',5,(r,c)=>{let n=0;for(const j of jets){if(j===c.P||!j.alive||j.side!==c.P.side||!j.ac||!j.ac.radar)continue;if(j.pos.distanceTo(c.P.pos)<r.interferenceMutualRangeM)n++;}
  r.interferenceDetectionLoss=r.interferenceMutualEnabled?n*(r.interferenceFrequencyAssign==='Fixed'?.6:.15)+r.emiBlankingDutyLoss*3:0;r.interferenceVisualStrobeAngle=n?(c.now*37)%360:0;
  r.pulseRwrIntercept=r.emconState==='Silent'?0:r.pulseLpiBurstModeEnabled?.3:.9;r.pulseSignatureIdTimeS=r.pulseSignatureUnique?3:12*(1+r.pulseSignatureJitterHide+r.pulseSignatureAgilityHide);r.pulseDetectedByEnemyRwr=r.emconState!=='Silent'&&F.radiating;
  r.pulseLpiDetectRangeScalar=r.pulseLpiBurstModeEnabled?.6:r.pulseLpiPowerManagement?.75:1;});

/* ======================= effects: registry -> sim ======================= */
// receiver chain losses and gains relative to what each radar started with, minimum range, drift, interference
{const _s=radar.snr1;radar.snr1=function(j,a,loss){const s=_s.call(this,j,a,loss);if(!F.on||!F.reg||!s||this.sensor!=='RDR')return s;
  if(a.d<Math.max(Q.pulseMinRangeFromBlankingM||0,Q.pulseMinRangeFromWidthM||0))return 0;
  let g=Q.pcCompressionGainDb-(F.pc0||0)-(Q.pcWeightingLossDb-(F.pw0||0));
  g-=(Q.cfarCaLossDb-(F.cfar0||0));g-=Math.max(0,(Q.integrationLossDb||0)-(F.il0||0));g+=Q.twtGainDriftDb||0;g-=(Q.receiverGainDriftDbPerHour||0)*(Q.calibrationLastTimeHours||0);
  g-=Q.interferenceDetectionLoss||0;g-=Q.rangeBinStraddleLossDb*.3-.3;
  if(Q.pulseSecondTimeAroundLevel>.25)g-=1;return s*un(g);};}
// MTI: the slowest target that gets through (pulse sets)
{const _n=radar.notch;radar.notch=function(j,a){const o=_n.call(this,j,a);if(!F.on||!F.reg||this.sensor!=='RDR'||!player.ac.pulse||a.el>-D||!Q.pulseMtiEnabled)return o;
  const vr=Math.abs(j.vel.dot(_v.copy(j.pos).sub(player.pos).normalize()));return o||vr<Q.pulseMtiMinDetectableVelMS*.4;};}
// systematic calibration errors on the measurement
{const _m=radar.meas;radar.meas=function(j,a,snr,out){const r=_m.call(this,j,a,snr,out);if(!F.on||!F.reg||this.sensor!=='RDR')return r;
  const dr=Q.calibrationOffsetRangeM||0,da=(Q.calibrationOffsetAzDeg||0)*D,de=(Q.calibrationOffsetElDeg||0)*D;if(!dr&&!da&&!de)return r;
  _w.copy(j.pos).sub(player.pos);const d=_w.length();_w.divideScalar(Math.max(d,1));r.addScaledVector(_w,dr);_v.set(-_w.z,0,_w.x).normalize();r.addScaledVector(_v,da*d);r.y+=de*d;return r;};}
console.info('[sensorpulse] sections 30-38 wired');
})();
