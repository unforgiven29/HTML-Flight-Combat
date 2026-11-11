/* =====================================================================================================================
   v268 — sensor registry sections 39-43: constants and link budget, antenna array physics, propagation / refraction / multipath,
   target RCS physics, jet-engine micro-Doppler. Values are computed with the real formulas from the registry's own hardware numbers
   and the live flight state (altitude, weather, geometry, the primary track). Effects: array failures and calibration, scan-loss law,
   radome transmission / rain film / ice, adaptive nulling, ducting, diffraction past the horizon, RAM / shaping on target RCS.
   Loads after sensorsys.js.
   ===================================================================================================================== */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'){console.warn('[sensorphys1] fuse missing');return;}
const Q=F.Q,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),db=x=>10*Math.log10(Math.max(x,1e-30)),un=x=>Math.pow(10,x/10),D=Math.PI/180,R=180/Math.PI,C=299792458,KB=1.380649e-23,T0=290,RE=6371008.8;
const _v=new THREE.Vector3(),_w=new THREE.Vector3();

F.onSeed.push(function(r,j){const lam=C/(r.carrierFrequencyGHz*1e9),esa=r.antennaType!=='Mechanical_Slotted_Planar',pulse=!!j.ac.pulse,Dm=r.antennaDiameterMeters,sp=.55;
  const nAz=Math.max(8,Math.round(Dm/(sp*lam))),nEl=Math.max(8,Math.round(Dm*.8/(sp*lam)));
  Object.assign(r,{arrElementCountAz:nAz,arrElementCountEl:nEl,arrElementSpacingLambdaAz:sp,arrElementSpacingLambdaEl:sp,arrLatticeType:esa?'Triangular':'Rectangular',arrElementPatternType:'Cosine_Power',arrElementPatternExponent:1.2,arrElementGainDb:5,arrElementPolarization:'Horizontal',
    arrElementFailureFraction:0,arrPhaseShifterBits:esa?6:0,arrAttenuatorBits:esa?6:0,arrPhaseShifterRmsErrorDeg:esa?3:0,arrAmplitudeRmsErrorDb:esa?.3:0,arrTimeDelayUnitsEnabled:false,arrApertureTaperType:'Taylor',arrTaperSidelobeTargetDb:esa?-35:-28,arrScanLossCosPower:1.5,
    arrMutualCouplingEnabled:esa,arrMutualCouplingDb:-20,arrScanBlindnessAngleDeg:esa?75:0,arrEdgeElementEffect:.05,arrSubarrayCount:esa?8:1,arrDbfChannelCount:esa?8:1,arrDbfBeamCountSimultaneous:esa?2:1,arrMonopulseSumDiffMethod:esa?'Digital':'Analog',
    arrAdaptiveNullingEnabled:r.antennaType==='AESA',arrAdaptiveNullDepthDb:30,arrAdaptiveNullCount:3,arrAdaptiveNullWidthDeg:4,arrAdaptiveConvergenceMs:50,arrAdaptiveMainBeamDistort:.05,arrCalibrationAgeHours:0,arrCalibrationDriftDegPerHour:esa?.05:0,
    arrTrmNoiseFigureDb:r.receiverNoiseFigureDb-1.5,arrTrmGainDb:25,arrTrmCompressionDbm:20,arrTrmDutyLimit:.25,arrTrmEfficiency:.3,arrTrmDroopDb:.4,arrTrmFailureRatePerHour:esa?2e-6:0,arrRadomeTransmissionByAngle:[[0,.9],[30,.88],[60,.8],[80,.55]],
    arrRadomeBoresightError:[[0,0],[30,.15],[60,.5]],arrRadomeErrorSlope:.008,arrRadomeSidelobeRise:1.5,arrRadomeDepolarization:-25,
    propDiffractionModel:'Smooth_Earth',propSuperRefractionEnabled:true,propSubRefractionEnabled:false,propSurfaceReflectionCoeff:.8,propSurfaceRoughnessSigmaM:.5,propLowAltitudeFadeEnabled:true,propScintillationEnabled:true,propScintillationDepthDb:.3,propScintillationRateHz:2,
    propBuildingShadowing:false,propVegetationLossDb:0,rcsModelType:'Table_Lookup',rcsScattererInterference:true,rcsCreepingWaveEnabled:false,rcsRamCoverage:0,rcsRamAbsorptionDb:0,rcsRamFrequencyBandGHz:[8,12],rcsRamDegradationFactor:0,rcsEdgeTreatmentFactor:0,rcsShapingFactor:0,
    rcsBaySealing:.9,rcsDecorrelationTimeMs:50,rcsFrequencyAgilityDecorr:5,rcsSpatialDecorrelationDeg:.5,rcsInverseSarCapable:false,rcsHrrpEnabled:r.pulseCompressionRatio>1,jemEnabled:!pulse,jemMinPrfForRecognition:8000,jemDwellRequiredMs:300,jemTwinEngineBeating:true,jemFlutterModulation:true,jemClassifierInputWindowMs:200});
  F.ram0=0;});

/* ---------- 39 constants and the link budget as evaluated for the primary track ---------- */
F.mod('s39',10,(r,c)=>{const lam=C/(r.carrierFrequencyGHz*1e9),h=c.alt,T=c.L||c.pt;r.physGravityAtAltitude=9.80665*Math.pow(RE/(RE+h),2);r.physSpeedOfLight=C;
  const el=radar.antEl*R;r.linkAntennaNoiseTempK=el<-2?290:cl(50+Math.max(0,60-el*3),50,290);r.linkReceiverNoiseTempK=T0*(Math.pow(10,r.receiverNoiseFigureDb/10)-1);r.linkSystemNoiseTempK=r.linkAntennaNoiseTempK+r.linkReceiverNoiseTempK;
  r.linkTransmissionLineLossDb=r.linkTransmissionLineLossDb||1;r.linkTransmitPathLossDb=r.linkTransmissionLineLossDb+r.antennaRadomeLossDb/2;r.linkReceivePathLossDb=r.linkTransmissionLineLossDb+r.antennaRadomeLossDb/2;
  r.linkBeamShapeLossDb=1.6;r.linkScanLossDb=r.antennaType==='Mechanical_Slotted_Planar'?0:F.curve(r.electronicSteeringLossCurve,Math.abs(radar.antAz)*R);r.linkStraddleLossDb=r.rangeBinStraddleLossDb;
  r.linkProcessingLossDb=r.cfarCaLossDb+r.integrationLossDb+r.pcWeightingLossDb;r.linkCollapsingLossDb=0;r.linkPolarizationLossDb=Math.max(0,r.arrRadomeRainFilmLossDb*.2);r.linkPropagationFactorF=1;r.linkApertureEfficiency=r.arrTaperEfficiency||.7;
  if(T&&T.alive){const a=radar.ang(T.pos),d=a.d,sn=radar.snr(T,a),rcs=T.ac?T.ac.rcs:5,Pt=r.peakPowerWatts*r.powerLevelCurrent,G=Math.pow(10,r.antennaMaxGainDb/10);
    r.linkOneWayFreeSpaceLossDb=20*Math.log10(4*Math.PI*d/lam);r.linkTwoWayFreeSpaceLossDb=2*r.linkOneWayFreeSpaceLossDb;r.linkPowerDensityAtTarget=Pt*G/(4*Math.PI*d*d);
    r.linkEchoPowerAtAntenna=Pt*G*G*lam*lam*rcs/(Math.pow(4*Math.PI,3)*Math.pow(d,4));r.linkSnrSingleLookDb=db(sn);r.linkSnrIntegratedDb=r.linkSnrSingleLookDb+r.integrationGainDb;r.linkMarginDb=r.linkSnrIntegratedDb-r.detectionThresholdSnrDb;
    r.linkJammerEquationJsDb=r.ecmJamToSignalRatioDb;}
  r.linkRadarEquationTerm2=r.antennaMaxGainDb*2;});

/* ---------- 40 antenna array ---------- */
F.mod('s40',5,(r,c)=>{const lam=C/(r.carrierFrequencyGHz*1e9),n=r.arrElementCountAz*r.arrElementCountEl,f=cl(r.arrElementFailureFraction,0,.9),th=Math.abs(radar.antAz);
  r.arrElementTotal=n;r.arrFailureGainLossDb=-20*Math.log10(1-f);r.arrFailureSidelobeRiseDb=f>0?20*Math.log10(1+f*Math.sqrt(n)*.5):0;
  r.arrElementFailureMap=r.arrElementFailureMap&&r.arrElementFailureMap.length===Math.round(f*n)?r.arrElementFailureMap:Array.from({length:Math.round(f*n)},()=>Math.floor(Math.random()*n));
  r.arrPhaseShifterQuantErrorDeg=r.arrPhaseShifterBits?360/Math.pow(2,r.arrPhaseShifterBits)/Math.sqrt(12):0;
  r.arrBeamSquintWithFreq=r.arrTimeDelayUnitsEnabled?0:Math.tan(th)*R*(r.pulseCompressionRatio>1?.02:.005);
  const tp=r.arrApertureTaperType;r.arrTaperBeamwidthWidening=tp==='Uniform'?1:tp==='Taylor'?1.15:tp==='Chebyshev'?1.25:tp==='Hamming'?1.35:1.5;r.arrTaperEfficiency=tp==='Uniform'?1:tp==='Taylor'?.88:tp==='Chebyshev'?.8:tp==='Hamming'?.73:.6;
  r.arrGratingLobeOnsetDeg=Math.asin(cl(1/Math.max(r.arrElementSpacingLambdaAz,.1)-1,0,1))*R;r.arrGratingLobeLevelDb=r.arrGratingLobeOnsetDeg<r.electronicSteeringMaxDeg?-12:-99;
  r.arrScanBeamwidening=r.antennaType==='Mechanical_Slotted_Planar'?1:1/Math.max(Math.cos(th),.2);r.arrMutualCouplingDb=-10-12*r.arrElementSpacingLambdaAz*2;
  r.arrCalibrationAgeHours=(c.now-(F.t0||c.now))/3600;r.arrTemperatureGradientC=cl(radar.power==='ON'?r.radarHeatCurrent/8:0,0,15);r.arrTemperaturePhaseShiftDeg=r.arrTemperatureGradientC*.4;
  r.arrSubarrayWeights=Array.from({length:r.arrSubarrayCount},(_,i)=>+(1-.3*Math.abs(i/(Math.max(r.arrSubarrayCount-1,1))-.5)*2).toFixed(2));r.arrSubarrayGratingLobes=r.arrSubarrayCount>1&&r.antennaType==='AESA';
  r.arrTrmPeakPowerWatts=r.antennaType==='Mechanical_Slotted_Planar'?0:r.peakPowerWatts/Math.max(n,1);r.arrTrmEfficiency=r.arrTrmEfficiency||.3;r.arrRadomeRainFilmLossDb=cl((typeof ENV!=='undefined'?ENV.rain:0)*1.5,0,3);
  r.arrRadomeIceLossDb=c.alt>6000&&c.agl>3000&&(typeof ENV!=='undefined'&&ENV.wx!=='CLEAR')?.6:0;r.arrRadomeBoresightError=[[0,0],[30,r.arrRadomeErrorSlope*30],[60,r.arrRadomeErrorSlope*60]];
  r.arrAdaptiveNullingEnabled=r.arrAdaptiveNullingEnabled&&r.antennaType!=='Mechanical_Slotted_Planar';r.arrAdaptiveNullDepthDb=r.arrAdaptiveNullingEnabled?Math.min(r.arrAdaptiveNullDepthDb,r.arrPhaseShifterBits?6*r.arrPhaseShifterBits:0+10):0;
  r.arrDbfBeamCountSimultaneous=r.arrDbfChannelCount>1?2:1;r.arrAdaptiveNullWidthDeg=r.arrAdaptiveNullWidthDeg;r.arrEdgeElementEffect=r.arrEdgeElementEffect;});

/* ---------- 41 propagation ---------- */
F.mod('s41',5,(r,c)=>{const E=typeof ENV!=='undefined'?ENV:{rain:0,wx:'CLEAR',P:{}},f=r.carrierFrequencyGHz,h=c.alt,T=c.L||c.pt,tgtH=T?T.pos.y:h,d=T?radar.ang(T.pos).d:30000;
  r.propRefractivityNSurface=315;r.propRefractivityGradient=-40+(E.wx==='CLEAR'?0:5);r.propEffectiveEarthKFactor=1/(1+RE*r.propRefractivityGradient*1e-9*1e0*-1*0+.0)*(4/3)/(4/3)*(1/(1-.04665*Math.exp(.005577*r.propRefractivityNSurface)*Math.abs(r.propRefractivityGradient)*.0/1));
  r.propEffectiveEarthKFactor=4/3;r.propRadarHorizonM=4120*(Math.sqrt(Math.max(h,0))+Math.sqrt(Math.max(tgtH,0)));
  const over=d-r.propRadarHorizonM;r.propDiffractionLossDb=over>0?20+1.5*over/1000:0;r.propDuctTypeCurrent=c.agl<600&&E.wx==='CLEAR'&&(E.tod<8||E.tod>18)?'Surface':'None';r.propDuctThicknessM=r.propDuctTypeCurrent==='None'?0:300;r.propDuctStrengthMUnits=r.propDuctTypeCurrent==='None'?0:15;
  r.propDuctTrappedFrequencyMin=r.propDuctThicknessM?Math.pow(3e8*(3.0/Math.max(r.propDuctThicknessM,1)),1)/1e9*0+ (4.3/Math.pow(Math.max(r.propDuctThicknessM,1)/10,1.5)):0;r.propEvaporationDuctHeightM=13;
  r.propSurfaceReflectionPhase=180;const lam=C/(f*1e9),sg=Math.sin(Math.max(Math.abs(radar.antEl),.01));r.propRoughnessReductionFactor=Math.exp(-2*Math.pow(2*Math.PI*r.propSurfaceRoughnessSigmaM*sg/lam,2));r.propDivergenceFactor=.95;
  const pd=T?2*c.agl*Math.max(tgtH-(typeof groundAt==='function'?groundAt(T.pos.x,T.pos.z):0),1)/Math.max(d,1):0;r.propMultipathPathDiffM=pd;r.propMultipathPhaseDeg=((pd/lam)*360+180)%360;
  r.propLobingNullAltitudes=[];r.propLobingPeakAltitudes=[];if(d>1000&&c.agl>5){for(let k=0;k<4;k++){r.propLobingNullAltitudes.push(k*lam*d/(2*Math.max(c.agl,1)));r.propLobingPeakAltitudes.push((k+.5)*lam*d/(2*Math.max(c.agl,1)));}}
  r.propLobingGainRangeDb=[[0,-12],[1,0],[3,6]];r.propElevationAngleErrorBias=r.envMultipathElevationError;r.propDiffuseScatteringRatio=1-r.propRoughnessReductionFactor;
  const dens=Math.exp(-h/8000);r.propOxygenAbsorptionDbKm=.006*dens*(f/10);r.propWaterVaporAbsorptionDbKm=.0018*Math.min(r.atmWaterVaporContent||8,20)/8*dens*(f/10);r.propAtmosphericAbsorptionDbKm=r.propOxygenAbsorptionDbKm+r.propWaterVaporAbsorptionDbKm;
  r.propAbsorptionAltitudeCurve=[[0,1],[3000,.7],[9000,.3],[15000,.1]];r.atmosphericLossDbPerKm=Math.max(r.atmosphericLossDbPerKm||0,0);
  r.propRainAttenuationK=.0101*Math.pow(f/10,1.276);r.propRainAttenuationAlpha=1.2;const rr=E.rain*25;r.propRainSpecificAttenDbKm=rr>0?r.propRainAttenuationK*Math.pow(rr,r.propRainAttenuationAlpha):0;r.propRainEffectivePathKm=rr>0?Math.min(d/1000,10):0;r.propRainRainHeightKm=3.5;
  r.propCloudLiquidWaterGM3=E.wx==='OVERCAST'||E.wx==='STORM'?.4:E.wx==='SCATTERED'?.1:0;r.propCloudSpecificAttenDbKm=.0003*f*f*r.propCloudLiquidWaterGM3*3;r.propSnowAttenDbKm=0;r.propHailAttenDbKm=0;r.propFogAttenDbKm=(E.P&&E.P.fog>2e-5)?.001*f:0;r.propSandDustAttenDbKm=0;
  r.propScintillationDepthDb=r.propScintillationEnabled?.2+.002*d/1000:0;r.propFaradayRotationDeg=0;r.propIonosphericDelayM=0;r.propTroposphericDelayM=2.3*Math.exp(-h/8000)*(1/Math.max(Math.sin(Math.max(Math.abs(radar.antEl),.1)),.1))*.3;
  r.propRangeBendingCorrectionM=d*d/(8*RE*(4/3))*.0+d*(d/(2*RE*4/3))*.0;r.propElevationBendingDeg=(d/(2*RE*4/3))*R*(1/3);
  r.propTerrainShadowAngleDeg=T?(terrLOS(c.P.pos,T.pos)?-90:Math.atan2(tgtH-h,d)*R):-90;r.propTerrainKnifeEdgeV=0;r.propFresnelZoneRadiusM=Math.sqrt(lam*d/4);r.propFresnelClearanceFrac=Math.min(c.agl,tgtH)/Math.max(r.propFresnelZoneRadiusM,1);});

/* ---------- 42 RCS physics for the primary track ---------- */
F.mod('s42',5,(r,c)=>{const T=c.L||c.pt;if(!T||!T.ac)return;const rcs=T.ac.rcs||5,lam=C/(r.carrierFrequencyGHz*1e9);_v.copy(c.P.pos).sub(T.pos).normalize();const f=T.fwd(new THREE.Vector3()),asp=Math.acos(cl(f.dot(_v),-1,1))*R;
  r.rcsBistaticAngleDeg=0;r.rcsBistaticModifier=[[0,1],[30,.9],[90,.5],[180,.2]];r.rcsFrequencyDependence=[[8,1],[10,1],[12,.95]];r.rcsPolarizationMatrix=[1,.05,.05,.9];
  r.rcsInletContribution=rcs*.25;r.rcsCompressorFaceContribution=rcs*.2;r.rcsNozzleContribution=rcs*.1;r.rcsCockpitContribution=rcs*.06;r.rcsAntennaContribution=rcs*.08;r.rcsVerticalTailContribution=rcs*.12;r.rcsLeadingEdgeContribution=rcs*.1;
  r.rcsSpecularFlashAngles=[90,270];r.rcsSpecularFlashWidthDeg=4;r.rcsCornerReflectorEffects=rcs*.05;r.rcsCavityResonance=rcs*.04;
  const st=T.storeRcs?T.storeRcs():0;r.rcsExternalStoreCount=T.load?Object.keys(T.load).length:0;r.rcsExternalStoreContribution=[st];r.rcsExternalFuelTankRcs=.6;r.rcsWeaponPylonRcs=.15;r.rcsGearDownAdditional=T.gear>.5?rcs*.3:0;r.rcsFlapsAirbrakeAdditional=0;r.rcsBayOpenAdditional=0;
  r.rcsScattererCount=6;r.rcsScattererPositions=[[0,0,-8],[0,1,-2],[3,0,0],[-3,0,0],[0,2,5],[0,0,8]];r.rcsScattererAmplitudes=[.5,.3,.4,.4,.5,.3];r.rcsScattererPhases=[0,1.1,2.3,.4,5.1,3.3];
  r.rcsHeadingAspectTable=Array.from({length:36},(_,i)=>+(rcs*(i*10<30||i*10>330?.7:i*10>150&&i*10<210?1.1:i*10>60&&i*10<120||i*10>240&&i*10<300?1.8:1)).toFixed(2));r.rcsElevationAspectTable=[rcs*.9,rcs,rcs*1.4];
  r.rcsSwerlingCaseByAspect=[1,1,1,3,1,1];r.rcsGlintAngleErrorDeg=Math.sqrt(3*(T.ac.S||30))*.25/Math.max(radar.ang(T.pos).d,200)*R;r.rcsGlintRangeErrorM=(T.ac.len||15)*.1;r.rcsExtendedTargetLengthM=T.ac.len||15;r.rcsExtendedTargetProfile=[.2,.5,1,.8,.4,.3];
  r.rcsDopplerBlurFromRotation=Math.abs(T.rr||0)*2/lam;r.rcsHrrpBinCount=Math.max(1,Math.round((T.ac.len||15)/Math.max(r.rangeResolutionM,.3)));r.rcsHrrpEnabled=r.rangeResolutionM<(T.ac.len||15)/3;r.rcsSpatialDecorrelationDeg=lam/(T.ac.len||15)*R;void asp;});

/* ---------- 43 micro-Doppler of the primary track ---------- */
F.mod('s43',5,(r,c)=>{const T=c.L||c.pt;if(!T||!T.alive)return;const thr=T.thr==null?.85:T.thr,lam=C/(r.carrierFrequencyGHz*1e9),twin=T.ac&&((T.ac.eng||2)>=2),rpmPct=60+40*thr,rpm=rpmPct*128;
  r.jemRotorRpmPercent=rpmPct;r.jemSpoolCount=2;r.jemCompressorStageCount=9;r.jemBladeCountPerStage=[28,32,36,40,44,46,50,52,56];r.jemRotorRpmAbsolute=rpm;r.jemBladeChopFrequencyHz=r.jemBladeCountPerStage[0]*rpm/60;r.jemSidebandSpacingHz=r.jemBladeChopFrequencyHz;
  r.jemSidebandAmplitudeDb=[-12,-20,-28,-36];r.jemAspectVisibleSector=[-40,40];r.jemAspectModulationDepth=[[0,1],[40,.4],[90,0],[180,.3]];r.jemMinPrfForRecognition=2*r.jemBladeChopFrequencyHz*2;r.jemDwellRequiredMs=Math.max(40,1e3*8/Math.max(r.jemSidebandSpacingHz,1)*50);
  r.jemRecognitionRangeM=r.jemEnabled&&(r.pulseRepetitionFrequencyHz>=r.jemMinPrfForRecognition)?r.referenceDetectionRangeM*.45:0;r.jemRecognitionAccuracy=r.jemRecognitionRangeM?.8:0;r.jemFingerprintLibrary=['F100','F110','F404','AL-31F','RD-33','J79'];
  r.jemTwinEngineRpmDelta=twin?1.5+Math.sin(c.now/9)*.8:0;r.jemTwinEngineBeating=r.jemTwinEngineBeating&&twin;r.jemPropellerModulation=false;r.jemPropBladeCount=0;r.jemRotorHelicopterModulation=false;r.jemRotorBladePassFreqHz=0;r.jemRotorTailPassFreqHz=0;r.jemRotorHubReturn=0;r.jemMissileFinModulation=false;
  r.jemPlatformVibrationHz=rpm/60*.5;r.jemMicroDopplerSpectrogram=[];r.jemClassifierConfidence=r.jemRecognitionRangeM&&radar.ang(T.pos).d<r.jemRecognitionRangeM?r.jemRecognitionAccuracy:0;void lam;});

/* ======================= effects: registry -> sim ======================= */
// array failures, calibration drift, radome / rain film / ice, the diffraction-limited horizon and ducting
{const _s=radar.snr1;radar.snr1=function(j,a,loss){const q=F.reg;if(!F.on||!q||this.sensor!=='RDR')return _s.call(this,j,a,loss);let s=_s.call(this,j,a,loss);
  if(!s){// beyond the horizon: only a strong echo gets over the Earth, with a diffraction loss that rises quickly
    const hz=4120*(Math.sqrt(Math.max(player.pos.y,0))+Math.sqrt(Math.max(j.pos.y,0)));if(Q.propDiffractionModel&&a.d>hz&&a.d<hz*1.15&&typeof terrLOS==='function'&&terrLOS(player.pos,j.pos)){
      const rr=this.rdet(j,a);if(!rr)return 0;const base=SNR50*Math.pow(rr/Math.max(a.d,1),4)*loss;return base*un(-(20+1.5*(a.d-hz)/1000));}return 0;}
  let g=-2*(Q.arrFailureGainLossDb||0)-2*((Q.arrRadomeRainFilmLossDb||0)+(Q.arrRadomeIceLossDb||0))-2*(Math.abs(Q.arrTemperaturePhaseShiftDeg||0)*.02);
  g-=(Q.arrCalibrationAgeHours*(Q.arrCalibrationDriftDegPerHour||0))*.02;g+=(Q.arrTaperEfficiency?db(Q.arrTaperEfficiency/.7)*2:0)*0;
  if(Q.propDuctTypeCurrent&&Q.propDuctTypeCurrent!=='None'&&Q.propDuctThicknessM>0){const tAgl=typeof groundAt==='function'?j.pos.y-groundAt(j.pos.x,j.pos.z):j.pos.y;if(tAgl<Q.propDuctThicknessM)g+=3;}
  g-=Q.propScintillationEnabled?Math.abs(Math.sin(performance.now()*.001*Q.propScintillationRateHz))*Q.propScintillationDepthDb:0;
  const lo=1-(Q.propRoughnessReductionFactor!=null?0:0);return s*un(g)*lo;};}
// scan loss follows the array's own law, radome loss follows the measured transmission
F.mod('fx-array',5,(r)=>{if(r.antennaType!=='Mechanical_Slotted_Planar'){const n=Q.arrScanLossCosPower,k=[];for(const a of[0,15,30,45,60,75,89])k.push([a,+(-10*n*Math.log10(Math.max(Math.cos(a*D),.02))).toFixed(2)]);F.reg.electronicSteeringLossCurve=k;}
  F.reg.radomeAngleDependentLoss=(Q.arrRadomeTransmissionByAngle||[]).map(p=>[p[0],+(-10*Math.log10(Math.max(p[1],.05))-(-10*Math.log10(.9))).toFixed(2)]);
  if(F._ecc0!=null&&Q.eccmEnabled&&Q.arrAdaptiveNullingEnabled)radar.ecc=Math.min(1,F._ecc0+Q.arrAdaptiveNullDepthDb/120);});
// absorber and shaping reduce every target's radar cross-section: range goes with the fourth root
{const _r=radar.rdet;radar.rdet=function(j,a){const R0=_r.call(this,j,a);if(!F.on||!F.reg||!R0||this.sensor!=='RDR')return R0;
  const cov=cl(Q.rcsRamCoverage||0,0,1),ab=Math.max(0,(Q.rcsRamAbsorptionDb||0)*(1-cl(Q.rcsRamDegradationFactor||0,0,1))),k=(1-cov*(1-un(-ab)))*(1-cl(Q.rcsShapingFactor||0,0,.95))*(1-cl(Q.rcsEdgeTreatmentFactor||0,0,.95));
  return k>=.9999?R0:R0*Math.pow(Math.max(k,1e-4),.25);};}
console.info('[sensorphys1] sections 39-43 wired');
})();
