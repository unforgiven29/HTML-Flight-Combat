/* =====================================================================================================================
   v268 — sensor registry sections 44-56: receiver / ADC chain, own-ship INS and frames, target kinematics, jammer-side EA, ESM,
   IFF physics, IRST radiometry, atmosphere / terrain / sea, resource scheduling, ground-map / GMTI, datalink, human factors, reliability.
   Live values come from the formulas (ISA atmosphere, Planck, GPS/INS error growth, Friis link budget, ...) fed by the flight state.
   Effects (read through Q): receiver chain losses, INS-driven measurement bias, scheduler overload, thermal derating, IR extinction, power sag.
   ===================================================================================================================== */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'){console.warn('[sensorphys2] fuse missing');return;}
const Q=F.Q,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),un=x=>Math.pow(10,x/10),D=Math.PI/180,R=180/Math.PI,C=299792458,G0=9.80665;
const E=()=>typeof ENV!=='undefined'?ENV:{rain:0,wx:'CLEAR',P:{}};

F.onSeed.push(function(r,j){const esa=r.antennaType!=='Mechanical_Slotted_Planar',lam=C/(r.carrierFrequencyGHz*1e9);
  Object.assign(r,{rxAdcBits:14,rxAdcSampleRateMsps:200,rxAdcClipLevel:1,rxIqGainImbalanceDb:.2,rxIqPhaseImbalanceDeg:1,rxFilterMismatchLossDb:.4,rxStcMinRangeM:2000,rxStcSlopeDbPerOctave:12,rxLimiterThresholdDbm:10,rxLnaGainDb:25,rxLnaCompressionDbm:5,
    rxFftLength:256,rxFftWindowType:'Hamming',rxFftScallopingLossDb:1.2,rxFftWindowLossDb:1.3,rxProcessingThroughputGops:200,rxStapDofCount:esa?3:0,rxSpaceTimeAdaptiveEnabled:esa&&r.antennaType==='AESA',rxMatchedFilterLossDb:.5,rxClutterCompensationError:.05,
    ownInsDriftNmPerHour:.8,ownInsGyroBiasDegPerHour:.01,ownGpsAidingEnabled:true,ownGpsPositionErrorM:5,ownGpsUpdateRateHz:1,ownAttitudeRateHz:200,ownAttitudeLatencyMs:5,ownAttitudeToRadarDelayMs:8,ownSensorTimeSyncErrorMs:1,ownBoresightHarmonizationErr:.2,ownFlexureVsGLoad:.03,ownMotionCompResidualDeg:.05,
    ownStabilizationMaxRateDegS:90,ownStabilizationRecoverTimeS:.8,ownDopplerCorrectionErrorMS:1,tgtProcessNoiseCvSigma:3,tgtProcessNoiseCaSigma:12,tgtTrackInitiationMofN:'2/3',tgtTrackDeletionMofN:'5/8',tgtMaxTurnRateDegS:20,
    rmTimelineFrameMs:100,rmMaxSimultaneousTracks:r.trackCapacity||20,rmOverloadResponse:'Degrade_Search',rmSwitchOverheadMs:.5,rmBeamSteerSettleUs:esa?5:500,rmThermalBudgetFraction:1,rmDutyCycleLimit:r.dutyCycleFraction||.1,
    relBusVoltageNominalV:28,relBusVoltageSagV:0,relThermalShutdownTempC:95,relPowerConverterEfficiency:.88,relBitCoverage:.95,relGracefulDegradationMode:true,relThermalDeratingCurve:[[60,1],[75,.95],[90,.7],[95,0]],relFanFailure:false,
    detNetdMk:25,optWindowTransmission:.85,optSunKeepoutAngleDeg:25,atmDeltaIsaK:0,hfPilotReactionTimeMs:250,hfGLocThresholdG:9,hfGToleranceTimeS:12,commTransmitPowerWatts:10,commAntennaGainDb:3,commNoiseFigureDb:6,commReceiverSensitivityDbm:-100,commCarrierFreqMHz:1030,commDataRateKbps:238,commBandwidthKHz:3000,commMaxLineOfSightM:300000,
    iffInterrogatorFreqMHz:1030,iffTransponderFreqMHz:1090,iffInterrogatorPowerWatts:1000,iffTransponderReplyPowerW:200,iffMissedReplyProbability:.01,iffFalseReplyProbability:.001,esmSensitivityDbm:-65,esmDfAccuracyRmsDeg:5,esmEmitterMatchTimeS:2,esmLockOnDetect:true,
    jamTransmitterPowerWatts:0,jamAntennaGainDb:0,gmMotionCompensationError:.05,gmBlindZoneAroundNoseDeg:5,gmGmtiMinDetectableVelMS:10,gmTerrainAvoidanceEnabled:false});
  F.rx0=r.rxFilterMismatchLossDb+r.rxMatchedFilterLossDb+r.rxFftScallopingLossDb+r.rxFftWindowLossDb;F.t0=performance.now()/1000;void lam;});

/* ---------- 44 receiver and signal-processing chain ---------- */
F.mod('s44',10,(r,c)=>{const bw=r.rxFilterBandwidthMhz||(1/Math.max(r.pulseWidthMicroseconds||1,.05)),fs=r.rxAdcSampleRateMsps,N=r.rxAdcBits;
  r.rxAdcEffectiveBits=N-.7-Math.log2(1+Math.pow((r.rxAdcApertureJitterPs||.2)*1e-12*(r.carrierFrequencyGHz*1e9)*2*Math.PI,2)*1e6)*.5;
  r.rxAdcQuantNoiseDb=-(6.02*r.rxAdcEffectiveBits+1.76);r.rxAdcSfdrDb=6.02*N-4;r.rxImageRejectionDb=-10*Math.log10(Math.pow(1-un(-r.rxIqGainImbalanceDb/2),2)/4+Math.pow(r.rxIqPhaseImbalanceDeg*D/2,2)/4+1e-12);
  r.rxLnaNoiseFigureDb=r.receiverNoiseFigureDb;r.rxLnaIp3Dbm=r.rxLnaCompressionDbm+10;r.rxLimiterRecoveryUs=.3+Math.max(0,r.peakPowerWatts/1e5)*.2;r.rxLimiterDamageThresholdDbm=r.rxLimiterThresholdDbm+30;
  r.rxFftScallopingLossDb=r.rxFftWindowType==='Rectangular'?3.9:r.rxFftWindowType==='Hanning'?1.4:r.rxFftWindowType==='Hamming'?1.7:1.2;r.rxFftWindowLossDb=r.rxFftWindowType==='Rectangular'?0:r.rxFftWindowType==='Hanning'?1.8:r.rxFftWindowType==='Hamming'?1.35:1.2;
  r.rxFftSpectralLeakageDb=r.rxFftWindowType==='Rectangular'?-13:r.rxFftWindowType==='Hanning'?-31:r.rxFftWindowType==='Hamming'?-43:-35;r.rxFftRoundingNoiseDb=-6.02*(r.rxFftFixedPointBits||24)-10*Math.log10(Math.max(r.rxFftLength,2))*0;
  const nT=radar.tracks?radar.tracks.size:0,load=cl((nT/Math.max(Q.rmMaxSimultaneousTracks||20,1))*.5+r.rxFftLength*r.rxDopplerBinCount/1e6*0+.15,0,1.5);r.rxProcessingLoadFraction=load;r.rxProcessingLatencyMs=(r.rxFftLength*Math.log2(r.rxFftLength)*r.prfProcessingGops)/Math.max(r.rxProcessingThroughputGops*1e6,1)*1e3||5+load*10;
  r.rxDopplerBinCount=r.rxFftLength;r.rxDopplerBinWidthHz=r.pulseRepetitionFrequencyHz/Math.max(r.rxFftLength,1);const lam=C/(r.carrierFrequencyGHz*1e9);r.rxDopplerBinWidthMS=r.rxDopplerBinWidthHz*lam/2;r.rxDopplerAmbiguousVelMS=r.pulseRepetitionFrequencyHz*lam/2;
  r.rxStapImprovementFactorDb=r.rxSpaceTimeAdaptiveEnabled?Math.min(25,3*r.rxStapDofCount+4):0;r.rxStapTrainingCells=r.rxStapDofCount*2*5;r.rxStapHeterogeneityLoss=r.rxSpaceTimeAdaptiveEnabled?2:0;r.rxRangeDopplerCouplingM=r.pulseCompressionRatio>1?r.chirpBandwidthMhz?0:0:0;
  r.rxMatchedFilterLossDb=Math.max(.2,.5+r.rxFilterMismatchLossDb*.3);r.rxAmbiguityFunctionSidelobes=r.pcWeightingLossDb?-30:-13;r.rxCrossModulationEnabled=false;void bw;void fs;});

/* ---------- 45 own-ship motion, INS, frames ---------- */
F.mod('s45',10,(r,c)=>{const P=c.P,t=Math.max(performance.now()/1000-(F.t0||0),0),h=t/3600,jam=typeof sys!=='undefined'&&sys.gpsJam;r.ownGpsJammedFlag=!!jam;
  r.ownInsPositionErrorM=r.ownGpsAidingEnabled&&!jam?r.ownGpsPositionErrorM:r.ownInsDriftNmPerHour*1852*h+r.ownGpsPositionErrorM;r.ownInsVelocityErrorMS=r.ownInsPositionErrorM*.002;r.ownInsAttitudeErrorMrad=(r.ownInsGyroBiasDegPerHour*D*h*1e3)+.3;
  r.ownInsAlignmentState=t<(r.ownInsAlignmentTimeS||0)?'Aligning':'Aligned';r.ownGpsVelocityErrorMS=.1;r.ownGpsDilutionPrecision=jam?20:1.2;r.ownFilterType='Kalman_15State';
  const sp=P.vel?P.vel.length():0;r.ownAirspeedMS=sp;r.ownGroundSpeedMS=sp;r.ownVerticalSpeedMS=P.vel?P.vel.y:0;r.ownManeuverGLoad=P.gLoad||P.g||1;r.ownManeuverAoaDeg=(P.aoa||0)*(Math.abs(P.aoa||0)<3.2?R:1);r.ownSideslipDeg=(P.beta||0)*(Math.abs(P.beta||0)<3.2?R:1);
  r.ownAirframeFlexureDeg=r.ownFlexureVsGLoad*Math.max(r.ownManeuverGLoad-1,0);r.ownAntennaVelocityFromRotate=0;r.ownMotionCompResidualDeg=Math.max(.02,Math.abs(P.rollRate||0)*R*r.ownAttitudeToRadarDelayMs/1000*.02);
  r.ownDopplerCorrectionErrorMS=r.ownInsVelocityErrorMS+Math.abs(r.ownManeuverGLoad-1)*.05;r.ownEarthCurvatureCorrection=true;r.ownGeodeticLatLonAlt=[0,0,P.pos?P.pos.y:0];r.ownGeoidHeightOffsetM=0;
  r.ownFrameEcefToNedMatrix=[1,0,0,0,1,0,0,0,1];r.ownFrameNedToBodyMatrix=[1,0,0,0,1,0,0,0,1];r.ownFrameBodyToAntennaMatrix=[1,0,0,0,1,0,0,0,1];r.ownFrameAntennaToBeamMatrix=[1,0,0,0,1,0,0,0,1];});

/* ---------- 46 target kinematics for the primary track ---------- */
F.mod('s46',10,(r,c)=>{const T=c.L||c.pt;if(!T||!T.alive)return;const ac=T.ac||{},sp=T.vel?T.vel.length():0;r.tgtMaxSpeedMS=ac.vmax||ac.maxSpd||400;r.tgtMaxGLoad=ac.gmax||9;r.tgtMaxTurnRateDegS=ac.turn||20;r.tgtMaxClimbRateMS=ac.climb||250;r.tgtAltitudeCeilingM=ac.ceil||18000;r.tgtMinSpeedMS=ac.vmin||70;
  r.tgtEnergyBleedPerG=.9;r.tgtSingerAccelVarianceG=Math.pow(r.tgtMaxGLoad/3,2);r.tgtSingerTimeConstantS=4;const tk=radar.tracks&&radar.tracks.get?radar.tracks.get(T.id!=null?T.id:T):null;
  const d=radar.ang(T.pos).d,lag=r.tgtProcessNoiseCaSigma*Math.pow(Math.max(radar.upd||1,1e-3),2)*.5;r.tgtTrackLagErrorM=lag;r.tgtTrackVelocityErrorMS=r.measurementNoiseRangeM?r.measurementNoiseRangeM*.3:2;
  r.tgtTrackHeadingErrorDeg=Math.atan2(r.tgtTrackVelocityErrorMS,Math.max(sp,50))*R;r.tgtTrackAltitudeErrorM=d*(r.measurementNoiseAngleDeg||.5)*D*.5;r.tgtTrackResolutionRangeM=r.rangeResolutionM||150;r.tgtTrackResolutionAngleDeg=r.beamwidthAzDeg||3;r.tgtTrackResolutionDopplerMS=r.rxDopplerBinWidthMS||5;
  r.tgtTrackInnovationNis=1+Math.sin(c.now)*.1;r.tgtTrackFilterNees=1;r.tgtTrackInnovationGateChi2=9.21;r.tgtTrackJpdaDetectionProb=cl(radar.snr?radar.snr(T,radar.ang(T.pos))/(radar.snr(T,radar.ang(T.pos))+3):0,0,1);
  r.tgtRaidSizeEstimate=radar.tracks?radar.tracks.size:0;r.tgtRaidCountingUncertainty=r.tgtTrackResolutionRangeM*0+Math.round(r.tgtRaidSizeEstimate*.1);r.tgtRaidSpacingEstimateM=d*r.tgtTrackResolutionAngleDeg*D;void tk;});

/* ---------- 47 jammer-side EA ---------- */
F.mod('s47',10,(r,c)=>{const P=c.P,on=!!(P&&(P.ecm||P.jam||(typeof sys!=='undefined'&&sys.ecm)));r.jamErpWatts=r.jamTransmitterPowerWatts*Math.pow(10,r.jamAntennaGainDb/10);r.jamAntennaBeamwidthDeg=r.jamAntennaGainDb>0?Math.sqrt(41253/Math.pow(10,r.jamAntennaGainDb/10)):360;
  r.jamPowerSpectralDensity=r.jamErpWatts/Math.max(r.jamInstantBandwidthMHz||1,1);r.jamPolarizationLossDb=r.jamPolarizationMatch?0:3;r.jamPowerAvailableWatts=on?r.jamTransmitterPowerWatts:0;
  r.jamChaffDipoleLengthMm=150/Math.max(r.carrierFrequencyGHz,1)*.5*1;r.jamChaffBloomRadiusM=Math.min(60,5+((c.now-(F.chaffT||c.now))*8));r.jamChaffFallSpeedMS=.6;r.jamChaffWindDriftMS=(typeof ENV!=='undefined'&&typeof ENV.wind==='number')?ENV.wind:0;
  r.jamChaffCartridgeRcs=Math.max(r.jamChaffDipolePacks||1,1)*.4*Math.pow(r.carrierFrequencyGHz/10,.0);r.jamTowedDecoyCouplingDb=-40;r.jamReactionTimeMs=r.jamReactionTimeMs||50;r.jamDrfmLatencyNs=r.jamDrfmLatencyNs||100;});

/* ---------- 48 ESM / RWR physics ---------- */
F.mod('s48',10,(r,c)=>{const em=typeof rwrEmitters!=='undefined'?rwrEmitters:null,n=em?(em.size!==undefined?em.size:em.length||0):0;r.esmPdwRatePerSecondMax=r.esmPdwRatePerSecondMax||1e6;r.esmAmbientEmitterDensity=n;r.esmPdwOverloadDropRate=n*5e4>r.esmPdwRatePerSecondMax?1-r.esmPdwRatePerSecondMax/(n*5e4):0;
  r.esmDeinterleaveTimeS=.3+.1*n;r.esmDeinterleaveErrorRate=cl(.01*n,0,.4);r.esmEmitterMisidProbability=cl(.02+.02*n+r.esmPdwOverloadDropRate,0,.6);r.esmEmitterMatchTimeS=Math.max(.5,r.esmDeinterleaveTimeS+1);r.esmRangeEstimateMethod='Signal_Strength';r.esmRangeEstimateErrorFrac=.35;
  r.esmDfAccuracyRmsDeg=Math.max(2,r.esmDfAccuracyRmsDeg||5);r.esmSelfInterferenceBlanking=r.radiating!==false&&radar.on&&radar.on();r.esmBlankingDutyLoss=r.esmSelfInterferenceBlanking?(r.dutyCycleFraction||.05):0;r.esmFalseAlarmRatePerHour=cl(n*.05,0,5);});

/* ---------- 49 IFF physics ---------- */
F.mod('s49',10,(r,c)=>{const T=c.L||c.pt;r.iffInterrogationBeamwidthDeg=r.beamwidthAzDeg||3;r.iffInterrogationRepeatRateHz=300;r.iffInterrogationPulseSpacingUs=8;r.iffTransponderDeadTimeUs=60;r.iffTransponderMaxReplyRate=1500;r.iffCodeLengthBits=r.iffCodeLengthBits||12;
  r.iffRangeAccuracyM=r.rangeResolutionM||50;r.iffAzimuthAccuracyDeg=r.iffInterrogationBeamwidthDeg/5;r.iffAltitudeEncoderResolutionM=30.5;r.iffAdsbOutEnabled=false;r.iffAdsbPositionErrorM=r.ownInsPositionErrorM||5;r.iffReplyGarbleProbability=cl((radar.tracks?radar.tracks.size:0)*.01,0,.5);
  r.iffFruitRate=(radar.tracks?radar.tracks.size:0)*50;if(T&&T.alive){const d=radar.ang(T.pos).d,lam=C/(r.iffInterrogatorFreqMHz*1e6),gt=un(20),Pt=r.iffInterrogatorPowerWatts,pr=Pt*gt*lam*lam/(Math.pow(4*Math.PI*d,2));r.iffInterrogationPowerAtTarget=pr;r.iffTransponderLinkOk=10*Math.log10(pr*1e3)>r.iffTransponderSensitivityDbm;}
  r.iffEmitsDetectableFlag=true;r.iffSpoofingPossible=false;});

/* ---------- 50 IRST radiometry (Planck, adiabatic skin, atmosphere) ---------- */
F.mod('s50',10,(r,c)=>{const T=c.L||c.pt,thr=T&&T.thr!=null?T.thr:.85,spd=T&&T.vel?T.vel.length():250,h=T?T.pos.y:c.alt,Ta=288.15-.0065*Math.min(h,11000),M=spd/(331.3*Math.sqrt(Ta/273.15)),rec=.9;
  r.radSkinTempRecoveryFactor=rec;r.radSkinTempAdiabaticK=Ta*(1+rec*.2*M*M);r.radLeadingEdgeStagnationTempK=Ta*(1+.2*M*M);r.radNozzleHotMetalTempK=900+500*thr;r.radTargetTempK=r.radSkinTempAdiabaticK;r.radPlanckPeakWavelengthUm=2897.8/r.radNozzleHotMetalTempK;
  r.radPlumeLengthByThrottle=2+10*thr;r.radPlumeTempProfile=[[0,1100+500*thr],[1,800+300*thr],[3,500+150*thr]];r.radBackgroundTempK=Ta;
  const pl=(l,Tk)=>3.7418e8/(Math.pow(l,5)*(Math.exp(1.4388e4/(l*Tk))-1)),band=(a,b,Tk)=>{let s=0;for(let l=a;l<b;l+=(b-a)/20)s+=pl(l,Tk);return s*(b-a)/20*1e-6*Math.PI*0+s*(b-a)/20*1e-6;};
  r.radBandRadianceMwir=band(3,5,r.radNozzleHotMetalTempK);r.radBandRadianceLwir=band(8,12,r.radSkinTempAdiabaticK);r.radBandRadianceSwir=band(1,2.5,r.radNozzleHotMetalTempK);
  const vis=(typeof ENV!=='undefined'&&ENV.P&&ENV.P.fog)||0,ext=.2+vis*2e4+E().rain*1.5,rel=Math.exp(-h/2500);r.radAtmExtinctionCoeffPerKm=ext*(.4+.6*rel);r.radAtmAbsorptionCoeffPerKm=r.radAtmExtinctionCoeffPerKm*.6;r.radAtmScatteringCoeffPerKm=r.radAtmExtinctionCoeffPerKm*.4;
  r.radAtmTurbulenceCn2=1e-15+1e-13*Math.exp(-c.alt/1500);r.radAtmTurbulenceBlurMrad=.01*Math.pow(r.radAtmTurbulenceCn2*1e15,.3);r.detCutoffWavelengthUm=r.detCutoffWavelengthUm||5;
  r.optDiffractionBlurMrad=r.optDiffractionBlurMrad||(2.44*4/Math.max(r.irstApertureMm||100,10));r.optJitterBlurMrad=(c.P.gLoad||1)*.01;});

/* ---------- 51 atmosphere, terrain, sea ---------- */
F.mod('s51',10,(r,c)=>{const h=c.alt,dI=r.atmDeltaIsaK||0,tr=11000,T=h<tr?288.15-.0065*h+dI:216.65+dI,p=h<tr?101325*Math.pow(1-.0065*h/288.15,5.2559):22632*Math.exp(-(h-tr)/6341.6);r.atmTemperatureLapseRate=.0065;r.atmSeaLevelPressurePa=101325;r.atmSeaLevelTempK=288.15+dI;r.atmTropopauseAltitudeM=tr;
  r.atmSpeedOfSoundMS=Math.sqrt(1.4*287.05*T);r.atmDensityAltitudeM=(288.15/.0065)*(1-Math.pow((p/(287.05*T))/1.225,1/4.2559));r.atmWaterVaporPressure=6.11*Math.pow(10,7.5*(T-273.15)/(237.3+T-273.15))*(E().wx==='CLEAR'?.4:.8)*100;
  const e=E(),ws=(typeof e.wind==='number'&&isFinite(e.wind))?e.wind:(e.wind&&typeof e.wind.x==='number'?Math.hypot(e.wind.x,e.wind.z||0):5);r.atmTurbulenceIntensityMS=h<1500?1.5+ws*.1:.8;r.atmTurbulenceCategory=r.atmTurbulenceIntensityMS>3?'Moderate':'Light';r.atmIcingCondition=T<273.15&&(e.wx==='OVERCAST'||e.wx==='STORM')&&T>248;r.atmIcingRadomeEffect=r.atmIcingCondition?.5:0;
  r.atmCloudBaseM=e.P&&e.P.cloudBase||2500;r.atmSolarElevationDeg=typeof SUNDIR!=='undefined'?Math.asin(cl(SUNDIR.y,-1,1))*R:30;r.atmSolarAzimuthDeg=typeof SUNDIR!=='undefined'?(Math.atan2(SUNDIR.x,-SUNDIR.z)*R+360)%360:0;r.atmSolarFluxWm2=r.atmSolarElevationDeg>0?1361*Math.sin(r.atmSolarElevationDeg*D)*.75:0;
  r.atmGalacticNoiseTempK=Math.max(5,50*Math.pow(r.carrierFrequencyGHz/.4,-2.5));r.atmSolarRadioNoiseTempK=r.atmSolarElevationDeg>0?100:0;r.atmCosmicBackgroundK=2.7;r.atmManMadeNoiseLevel=0;
  const gy=typeof groundAt==='function'?groundAt(c.P.pos.x,c.P.pos.z):0,gx=typeof groundAt==='function'?groundAt(c.P.pos.x+50,c.P.pos.z):0,gz=typeof groundAt==='function'?groundAt(c.P.pos.x,c.P.pos.z+50):0;
  r.terSlopeAtPoint=Math.atan(Math.hypot(gx-gy,gz-gy)/50)*R;r.terAspectAtPoint=(Math.atan2(gz-gy,gx-gy)*R+360)%360;r.terRoughnessSigmaM=Math.max(.5,r.terSlopeAtPoint*.3);r.terSoilMoisture=.1+e.rain*.4;r.terDielectricConstantReal=4+r.terSoilMoisture*20;r.terDielectricConstantImag=.3+r.terSoilMoisture*3;
  const ws2=Math.max(ws,0);r.terSeaWindSpeedMS=ws2;r.terSeaStateWaveHeightM=.0213*ws2*ws2*.5;r.terSeaWavePeriodS=.73*ws2||1;r.terSeaWhitecapCoverage=ws2>3?3.84e-6*Math.pow(ws2,3.41):0;r.terSeaDielectricConstant=70;r.terSeaDopplerMeanMS=.25*ws2*.3;r.terSeaDopplerSpreadMS=.15*ws2*.3;r.terSeaBraggResonance=C/(r.carrierFrequencyGHz*1e9)/2;r.terSeaTempC=15;r.terSeaSalinity=35;});

/* ---------- 52 scheduler load ---------- */
F.mod('s52',10,(r,c)=>{const nT=radar.tracks?radar.tracks.size:0,cap=Math.max(Q.rmMaxSimultaneousTracks||20,1),st=radar.mode==='STT'||radar.stt&&radar.sttOn;const frame=Math.max(Q.rmTimelineFrameMs,10);
  r.rmTrackTimeFraction=cl(nT*(r.rmDwellMs||4)/frame*.5,0,1);r.rmIlluminationTimeFraction=st?.6:(typeof missiles!=='undefined'&&missiles.some&&missiles.some(m=>m.owner===c.P&&m.alive&&m.sarh)?.3:0);r.rmUplinkTimeFraction=r.rmIlluminationTimeFraction?.05:0;r.rmSearchTimeFraction=cl(1-r.rmTrackTimeFraction-r.rmIlluminationTimeFraction-r.rmUplinkTimeFraction,0,1);
  r.rmLoadFractionCurrent=cl(nT/cap*.7+r.rmIlluminationTimeFraction*.5,0,1.5);r.rmTaskQueueLength=Math.round(r.rmLoadFractionCurrent*(r.rmTaskQueueMax||32));r.rmSearchFrameDegradation=cl(1/Math.max(r.rmSearchTimeFraction,.2),1,5);r.rmTrackUpdateDegradation=cl(r.rmLoadFractionCurrent>1?r.rmLoadFractionCurrent:1,1,3);
  r.rmEnergyBudgetPerFrameJ=r.peakPowerWatts*(r.dutyCycleFraction||.05)*frame/1000*(r.powerLevelCurrent||1);r.rmMissileUplinkIntervalMs=r.rmMissileUplinkIntervalMs||200;});

/* ---------- 53 ground mapping / GMTI ---------- */
F.mod('s53',10,(r,c)=>{const lam=C/(r.carrierFrequencyGHz*1e9),sp=c.P.vel?c.P.vel.length():200,agl=Math.max(c.agl,10);r.gmRangeResolutionM=r.rangeResolutionM||C/(2*(r.chirpBandwidthMhz||5)*1e6);r.gmGrazingAngleDeg=Math.max(.5,Math.atan(agl/Math.max(20000,agl*3))*R);
  r.gmSyntheticApertureLengthM=sp*(r.gmIntegrationTimeS||1.5);r.gmCrossRangeResolutionM=lam*20000/(2*Math.max(r.gmSyntheticApertureLengthM,1));r.gmImageUpdateTimeS=(r.gmIntegrationTimeS||1.5)+.5;r.gmDopplerSharpeningRatio=r.gmSyntheticApertureLengthM/Math.max(r.antennaDiameterMeters,.1);r.gmGmtiClutterNotchHz=2*sp*Math.cos(Math.max(radar.antAz,0))/lam*0+2*sp*Math.abs(Math.sin(radar.antAz))/lam;r.gmGmtiMinDetectableVelMS=Math.max(3,r.gmGmtiClutterNotchHz*lam/2);r.gmCursorGeoLocationError=r.ownInsPositionErrorM*1+r.gmCrossRangeResolutionM*.2;});

/* ---------- 54 datalink physics ---------- */
F.mod('s54',10,(r,c)=>{const dl=typeof DL!=='undefined'&&DL.on,T=c.L||c.pt,d=T?radar.ang(T.pos).d:50000,f=r.commCarrierFreqMHz*1e6,lam=C/f;r.commMaxLineOfSightM=4120*Math.sqrt(Math.max(c.alt,1))*2;
  const fspl=20*Math.log10(4*Math.PI*Math.min(d,r.commMaxLineOfSightM)/lam),eirp=10*Math.log10(r.commTransmitPowerWatts*1e3)+r.commAntennaGainDb,rx=eirp+r.commAntennaGainDb-fspl;r.commLinkMarginDb=rx-r.commReceiverSensitivityDbm;r.commFadeMarginDb=10;r.commDopplerShiftHz=f*(c.P.vel?c.P.vel.length():0)/C*.5;
  const snr=rx-(-174+10*Math.log10(r.commBandwidthKHz*1e3)+r.commNoiseFigureDb);r.commBitErrorRate=.5*Math.exp(-Math.pow(10,snr/10)/2)||0;r.commPacketErrorRate=1-Math.pow(1-cl(r.commBitErrorRate,0,1),256);r.commSyncLostFlag=!dl||r.commLinkMarginDb<0;r.commTrackReportRateHz=dl?1/Math.max(r.rmMissileUplinkIntervalMs/1000,.2):0;});

/* ---------- 55 human factors ---------- */
F.mod('s55',10,(r,c)=>{const g=Math.max(c.P.gLoad||c.P.g||1,1),t=F._gT||0;F._gT=g>r.hfGLocThresholdG*.6?t+1/60:Math.max(0,t-1/90);r.hfPilotWorkloadLevel=cl((radar.tracks?radar.tracks.size:0)*.1+(c.P.mode==='combat'?.3:.1),0,1);r.hfTunnelVisionOnG=cl((g-5)/(r.hfGLocThresholdG-5),0,1);r.hfGToleranceTimeS=r.hfGToleranceTimeS;
  r.hfVisualDetectRangeM=Math.min(20000,r.hfVisualAcuityArcmin?(10/Math.max(r.hfVisualAcuityArcmin,.5))*5000:5000);r.hfDisplayAmbientWashout=cl((typeof SUNDIR!=='undefined'?SUNDIR.y:0)*.6,0,.6);r.hfDisplayGlareFromSun=r.hfDisplayAmbientWashout>.4;r.hfAlertHabituation=0;});

/* ---------- 56 reliability, thermal, power ---------- */
F.mod('s56',10,(r,c)=>{const t=(performance.now()/1000-(F.t0||0))/3600,k=r.relWeibullShape||1.5,sc=r.relWeibullScaleHours||(r.relMtbfHours||500);r.relOperatingHoursTotal=t;r.relFailureHazardPerHour=k/sc*Math.pow(t/sc+1e-9,k-1);r.relHeatLoadWatts=radar.on&&radar.on()?r.peakPowerWatts*(r.dutyCycleFraction||.05)*(1/Math.max(r.relPowerConverterEfficiency,.3)-1)*(r.powerLevelCurrent||1)*.3:0;
  r.relThermalTimeConstantS=r.relThermalMassJPerK?r.relThermalMassJPerK/Math.max((r.relCoolantFlowLpm||10)*70,1):60;r.relCoolantTempInC=15+Math.max(0,22-c.alt/700);r.relCoolantTempOutC=r.relCoolantTempInC+r.relHeatLoadWatts/Math.max((r.relCoolantFlowLpm||10)*70,1);r.relEcsAirTempC=r.relCoolantTempInC;
  r.relBusFrequencyHz=400;r.relBusVoltageSagV=(radar.on&&radar.on()?r.peakPowerWatts*(r.dutyCycleFraction||.05)/Math.max(r.relBusVoltageNominalV*r.relPowerConverterEfficiency,1)*.004:0)*(1+(c.P.gLoad||1)*0);r.relPowerHoldUpTimeMs=50;r.relPowerBrownoutThresholdV=r.relBusVoltageNominalV*.8;
  r.relLruCount=r.relLruCount||6;r.relLruHealthArray=Array.from({length:r.relLruCount},()=>1);r.relFalseBitAlarmRate=.001;});

/* ======================= effects ======================= */
// receiver chain losses (relative to seed), STAP, thermal derating, bus sag, scheduler overload, GPS-jam bias
{const _s=radar.snr1;radar.snr1=function(j,a,loss){const s=_s.call(this,j,a,loss);if(!F.on||!F.reg||!s||this.sensor!=='RDR')return s;
  let g=-((Q.rxFilterMismatchLossDb+Q.rxMatchedFilterLossDb+Q.rxFftScallopingLossDb+Q.rxFftWindowLossDb)-(F.rx0||0));
  g-=Math.max(0,(Q.rxLimiterThresholdDbm||10)-(Q.rxLnaCompressionDbm||5)>10?1:0)*0;
  const th=(F.reg.radarTempC!=null?F.reg.radarTempC:null),dr=Q.relThermalDeratingCurve&&Q.relCoolantTempOutC!=null?F.curve(Q.relThermalDeratingCurve,Q.relCoolantTempOutC+((Q.relFanFailure)?25:0)):1;if(dr<1)g+=10*Math.log10(Math.max(dr,.01));
  g+=20*Math.log10(Math.max(1-(Q.relBusVoltageSagV||0)/Math.max(Q.relBusVoltageNominalV,1),.2))*.5;
  if((Q.rmLoadFractionCurrent||0)>1&&Q.rmOverloadResponse==='Degrade_Search')g-=10*Math.log10(Q.rmSearchFrameDegradation||1)*.5;
  g-=Q.atmIcingRadomeEffect||0;void th;return s*un(g);};}
// the INS / motion-compensation residual becomes extra angular measurement error
{const _m=radar.meas;if(_m)radar.meas=function(){const o=_m.apply(this,arguments);if(!F.on||!F.reg||!o||typeof o!=='object'||o.az===undefined)return o;const b=(Q.ownMotionCompResidualDeg+Q.ownBoresightHarmonizationErr*.1+(Q.ownAirframeFlexureDeg||0))*D*.2,k=(Math.random()-.5)*2*b;o.az+=k;if(o.el!==undefined)o.el+=(Math.random()-.5)*2*b;return o;};}
// IR extinction from the radiometry model, and optics / detector loss relative to defaults
{const _i=radar.irRange;if(_i)radar.irRange=function(){const R0=_i.apply(this,arguments);if(!F.on||!F.reg||!R0||!isFinite(R0))return R0;const k=Math.exp(-((Q.radAtmExtinctionCoeffPerKm||.2)-.35)*R0/2000*.3);return R0*cl(k,.2,1.3)*Math.pow(Math.max(Q.optWindowTransmission,.1)/.85,.5)*Math.pow(25/Math.max(Q.detNetdMk,1),.25);};}
console.info('[sensorphys2] sections 44-56 wired');
})();
