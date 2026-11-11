/* =====================================================================================================================
   v268 — sensor registry fused with the radar simulation (js/sensorreg.js <-> radar in game.js / realism.js).
   Loads after realism.js and sensorreg.js.

   SENSOR_FUSE.reg is the live registry state for the player's radar (sections 01-12, 17, 20-25, 30, 39, 52).
   It is updated every frame from the simulation, and a value you change in it is written back into the simulation
   on the next frame (two-way bindings), e.g. SENSOR_FUSE.set('gimbalAzLimitDeg',30) or SENSOR_FUSE.reg.emconState='Silent'.

   WHAT THE REGISTRY NOW DRIVES
   * Link budget. Each radar has a nominal hardware set (frequency, aperture, peak power, noise figure, losses). The radar range
     equation R⁴ ∝ Pt·G²·λ²·σ / (k·T0·B·F·L) is evaluated from the registry each frame and divided by the value at spawn, so
     with nothing changed the published detection ranges are exactly as before. Change power, aperture, frequency, noise
     figure or losses (or let heat cut the power) and the detection range follows the fourth-root law.
   * Beamwidth θ ≈ 70·λ/D sets the sim's beam (angle accuracy, cell size) the same way, relative to its tuned value.
   * Thermal: average power heats the transmitter, ram/ECS air cools it (less cooling at low IAS, none with the engines
     stopped). Over the threshold the transmitter is cut back to half power; ECCM power boost adds heat.
   * Electrical bus: no generator (engines below idle, no ground power) and the radar drops off line.
   * Failures: random failures at a realistic MTBF (several hundred hours), raised by overheating: Reduced_Power,
     Intermittent, Stuck_Antenna (mechanical sets), Dead. Battle damage still comes from the existing damage model.
   * EMCON: Radiating / Silent / Burst_Only (radiates 2 s every emconBurstIntervalSeconds).
   * Propagation: clear-air two-way attenuation (dB/km, falling off with air density) and the 4/3-Earth radar horizon
     4.12·(√h1+√h2) km, beyond which a target cannot be seen at all.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof SENSOR_REG==='undefined'||typeof radar==='undefined'||typeof Jet==='undefined'){console.warn('[sensorfuse] registry or radar missing');return;}
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),db=x=>10*Math.log10(Math.max(x,1e-30)),un=x=>Math.pow(10,x/10);
const C=299792458,KB=1.380649e-23,T0=290,DEG=180/Math.PI;

/* ---- nominal hardware per radar: [antenna, GHz, aperture m, peak W, PRF low/med/high Hz, NF dB, Rx BW MHz, losses dB, bus W, warm-up s, gimbal az, el]
   Unclassified / open-source figures; where only a range is published the middle is used. The sim balance is set by
   R0 in the plane files, so these numbers only matter relative to themselves (see the link budget above). */
const HW={
 'APG-66(V)1':['Mechanical_Slotted_Planar',9.7,.74,3600,1500,13000,0,3.5,1.8,8,1350,180,60,60],
 'APG-63':['Mechanical_Slotted_Planar',9.5,.91,13000,1200,13000,200000,3.5,1.6,8,2900,180,60,60],
 'APG-73':['Mechanical_Slotted_Planar',9.8,.71,7000,1500,14000,180000,3.2,1.8,8,2200,180,70,60],
 'APG-79':['AESA',9.8,.70,20000,1500,15000,200000,2.5,2,7,3500,30,70,60],
 'AWG-9':['Mechanical_Slotted_Planar',9.7,.91,10200,1000,0,300000,4,1.5,9,5000,240,65,60],
 'APQ-120':['Mechanical_Slotted_Planar',9.0,.73,165000,1000,0,0,6,3,10,2600,180,60,60],
 'N019':['Mechanical_Slotted_Planar',10,.70,6000,1200,12000,180000,4,1.8,9,3000,180,67,60],
 'N019M':['Mechanical_Slotted_Planar',10,.70,7000,1200,12000,180000,3.6,1.8,8.5,3200,180,67,60],
 'Zhuk-ME':['Mechanical_Slotted_Planar',10,.68,8000,1200,14000,200000,3.2,2,8,3500,150,85,60],
 'N001':['Mechanical_Slotted_Planar',10,1.075,8000,1200,12000,180000,4,1.8,9,4500,180,60,60],
 'Sapfir-23ML':['Mechanical_Slotted_Planar',9.2,.80,100000,1000,0,0,7,2.5,10,3000,240,60,60],
 'RP-22SM':['Mechanical_Slotted_Planar',9.2,.50,100000,1000,0,0,8,3,10,1500,180,30,20],
 'Sapfir-25':['Mechanical_Slotted_Planar',9.0,.85,600000,1000,0,0,7,3,10,6000,240,60,60],
 'Zaslon':['PESA',9.2,1.10,15000,1200,10000,150000,4,2,9,9000,300,70,60]};
const GEN=['Mechanical_Slotted_Planar',9.7,.7,5000,1200,12000,0,4,2,9,2500,180,60,60];
const hwOf=n=>HW[n]||GEN;

/* ---- link budget from the registry: the SNR of a 1 m² target at 1 m, with everything that does not change per target */
function linkTerm(r){const lam=C/(r.carrierFrequencyGHz*1e9),A=Math.PI*Math.pow(r.antennaDiameterMeters/2,2),eta=r.antennaType==='Mechanical_Slotted_Planar'?.6:.7;
  const G=eta*4*Math.PI*A/(lam*lam),Pt=r.peakPowerWatts*cl(r.powerLevelCurrent,0,2)*(r.eccmPowerBoostEnabled?Math.max(1,r.eccmPowerBoostFactor||1):1);
  const N=KB*T0*r.receiverBandwidthMHz*1e6*un(r.receiverNoiseFigureDb),L=un(r.systemLossesDb+r.antennaRadomeLossDb);
  return{lam,G,Pt,N,L,A,eta,s1:Pt*G*G*lam*lam/(Math.pow(4*Math.PI,3)*N*L)};}

/* ---- the player's registry state ---- */
const F=window.SENSOR_FUSE={on:true,reg:null,base:null,kLB:1,kBeam:1,spec:HW,binds:[]};
const SECTIONS=[1,2,3,4,5,7,8,9,10,11,12,17,20,21,23,25,30,39,52];

function seed(j){const a=j.ac,rd=a.radar||{},h=hwOf(rd.name),r=SENSOR_REG.create(SECTIONS);
  const [ant,ghz,D,Pt,pl,pm,ph,nf,bw,loss,watts,warm,gaz,gel]=h,pulse=!!a.pulse,esa=rd.aesa?'AESA':rd.pesa?'PESA':ant;
  Object.assign(r,{radarID:(rd.name||'RADAR').replace(/[^A-Za-z0-9]/g,'_'),radarModelName:rd.name||'',ownerEntityID:j.id||0,radarFaction:j.side==='red'||j.team===1?'Red':'Blue',
    radarPowerState:'Operate',warmupDuration:warm,radarHealth:1,radarFailureMode:'None',radarFailureChancePerSecond:1/(esa==='AESA'?1500:pulse?150:350)/3600,
    radarCoolingLevel:1,radarHeatCurrent:0,radarOverheatThreshold:100,electricalPowerDrawWatts:watts,electricalBusAvailable:true,mountOffsetVec3:[0,0,-(a.len||15)/2+.6],
    antennaType:esa,antennaDiameterMeters:D,sideLobeLevelDb:esa==='AESA'?-40:esa==='PESA'?-32:-28,backLobeLeakageDb:-45,gimbalAzLimitDeg:gaz,gimbalElLimitDeg:gel,
    gimbalAzSlewRate:esa==='Mechanical_Slotted_Planar'?140:0,gimbalStabilizationEnabled:true,electronicSteeringMaxDeg:esa==='Mechanical_Slotted_Planar'?0:60,
    beamSwitchingTime:esa==='AESA'?.02:esa==='PESA'?.2:0,antennaRadomeLossDb:1.2,scanPatternType:'Raster_Bar',scanAzimuthAnchored:false,scanElevationAnchored:true,
    carrierFrequencyGHz:ghz,peakPowerWatts:Pt,powerLevelCurrent:1,prfLowHz:pl,prfMediumHz:pm,prfHighHz:ph,pulseWidthMicroseconds:pulse?1.2:ph?.6:1,
    frequencyAgilityEnabled:!pulse&&(rd.ecc||0)>=.6,frequencyHopSetSize:!pulse&&(rd.ecc||0)>=.6?16:1,pulseCompressionEnabled:!pulse&&(rd.ecc||0)>=.6,
    pulseCompressionRatio:!pulse&&(rd.ecc||0)>=.6?13:1,waveformType:pulse?'Pulse':'Pulse_Doppler',transmitDutyLimitEnabled:true,emconState:'Radiating',emconBurstIntervalSeconds:10,
    receiverBandwidthMHz:bw,receiverNoiseFigureDb:nf,receiverGainControlMode:pulse?'STC':'Adaptive',systemLossesDb:loss,atmosphericLossDbPerKm:.02,rainLossDbPerKm:0,
    detectionProbabilityTarget:.5,falseAlarmProbability:1e-6,detectionThresholdAdaptive:!pulse,cfarType:'CA',cfarGuardCells:2,cfarReferenceCells:16,
    referenceTargetRcsM2:5,referenceDetectionRangeM:rd.R0||0,rcsFluctuationModel:'Swerling_1',rangeDetectionMax:(rd.ranges?rd.ranges[rd.ranges.length-1]*(rd.unit||1852):150000),
    rangeDetectionMin:pulse?300:150,eccmEnabled:(rd.ecc||0)>0,eccmHomeOnJamEnabled:true,eccmHomeOnJamAngleOnly:true,eccmPowerBoostFactor:1.5,eccmPowerBoostHeatCost:2,
    rwsEnabled:true,twsEnabled:!pulse,sttEnabled:true,acmEnabled:!pulse,lockLostGraceTimeS:1.2,
    physSpeedOfLight:C,physBoltzmannConstant:KB,physStandardNoiseTempK:T0,physPlanckConstant:6.62607015e-34,physStefanBoltzmann:5.670374419e-8,physWienDisplacement:2.897771955e-3,
    physEarthRadiusMeanM:6371008.8,physEarthRadiusEquatorM:6378137,physEarthFlattening:1/298.257223563,physGravityStandard:9.80665,physEarthRotationRate:7.2921159e-5,
    physDielectricVacuum:8.8541878128e-12,physImpedanceFreeSpace:376.730313668,linkApertureEfficiency:esa==='Mechanical_Slotted_Planar'?.6:.7,
    pulseRadarEnabled:pulse,rmInterleaveEnabled:esa!=='Mechanical_Slotted_Planar',rmTimelineFrameMs:esa==='AESA'?200:esa==='PESA'?400:0});
  if(a.ols||a.irst){const o=a.ols||{};Object.assign(r,{irstID:(o.name||'IRST'),irstModelName:o.name||'IRST',irstOwnerEntityID:j.id||0,irstPowerState:'Operate',irstCooledDetector:true,
    irstEmitsNothing:true,irstHealth:1,irstSpectralBand:'MWIR',irstBandCenterMicrons:4,irstDetectionRangeRearM:o.tail||0,irstDetectionRangeFrontM:o.head||0,irstLrfRangeM:o.lrf||0});}
  return r;}

/* ---- two-way bindings: [registry name, read from sim, write to sim] — a registry value that differs from what was last
   read was changed by someone, so it is written into the sim first; then the sim value is read back ---- */
const D2=Math.PI/180,PRFK=()=>player&&player.ac.cockpit==='fulcrum'?{A:'High',B:'Medium',AUTO:'Interleaved'}:{A:'Low',B:'Medium',AUTO:'Interleaved'};
const B=F.binds=[
 ['radarPowerState',()=>radar.power==='OFF'?'Off':radar.warm>0?'Warmup':radar.power==='STBY'?'Standby':'Operate',v=>{if(v==='Off')radar.setPower?radar.setPower('OFF'):radar.power='OFF';else if(v==='Standby')radar.power='STBY';else if(v==='Operate'&&radar.power!=='ON'){radar.setPower?radar.setPower('ON'):radar.power='ON';}}],
 ['warmupTimeRemaining',()=>Math.max(0,radar.warm||0),v=>{radar.warm=Math.max(0,+v||0);}],
 ['gimbalAzLimitDeg',()=>radar.gl.az,v=>{radar.gl.az=cl(+v,1,90);}],
 ['gimbalElLimitDeg',()=>radar.gl.eu,v=>{radar.gl.eu=radar.gl.ed=cl(+v,1,90);}],
 ['gimbalCurrentAzDeg',()=>(radar.antAz||0)*DEG,null],['gimbalCurrentElDeg',()=>(radar.antEl||0)*DEG,null],
 ['gimbalCommandAzDeg',()=>(radar.scanC||0)*DEG,null],['gimbalCommandElDeg',()=>(radar.elCmd||0)*DEG,null],
 ['gimbalAtLimitFlag',()=>Math.abs(radar.antAz||0)>=radar.gimbal()-.01,null],
 ['scanAzWidthDeg',()=>radar.azs[radar.ai]*2,v=>{radar.azs[radar.ai]=cl(+v/2,1,90);}],
 ['scanBarCount',()=>radar.nb(),v=>{radar.barsL[radar.bi]=cl(Math.round(+v),1,8);}],
 ['scanBarSpacingDeg',()=>radar.bsp()*DEG,null],['scanCurrentBarIndex',()=>radar.bar,null],
 ['scanDirection',()=>radar.dir>0?'Left_To_Right':'Right_To_Left',null],['scanCenterOffsetAzDeg',()=>(radar.scanC||0)*DEG,null],
 ['scanRatePerSecond',()=>radar.rate*DEG,v=>{if(F._stuck==null)radar.rate=cl(+v,1,400)*D2;}],
 ['antennaBeamwidthAzDeg',()=>radar.beam*DEG,v=>{F.beam0=cl(+v,.3,20)*D2/F.kBeam;}],
 ['referenceDetectionRangeM',()=>player.ac.radar.R0,v=>{player.ac.radar.R0=Math.max(500,+v);}],
 ['eccmAngleDeceptionFilter',()=>radar.ecc,v=>{radar.ecc=cl(+v,0,1);}],
 ['prfMode',()=>PRFK()[radar.prf]||'Interleaved',v=>{const m=PRFK();for(const k in m)if(m[k]===v)radar.prf=k;}],
 ['radarModeCurrent',()=>radar.mode==='ACM'?({VERT:'ACM_Vertical',BORE:'ACM_Boresight',HMD:'ACM_HMD'}[radar.acm]||'ACM_Slew'):radar.power!=='ON'?'Standby':radar.mode,null],
 ['radarMasterMode',()=>'AA',null],['aaSubmodeIRST',()=>radar.sensor==='IRST',null],
 ['rangeScaleMeters',()=>radar.ranges[radar.ri]*radar.unit,null],['rangeScaleSelected',()=>String(radar.ranges[radar.ri]),null],
 ['azimuthScaleSelected',()=>String(radar.azs[radar.ai]*2),null],['barScaleSelected',()=>String(radar.barsL[radar.bi]),null],
 ['elevationCenterPilotDeg',()=>(radar.elCmd||0)*DEG,null],
 ['targetDesignatorAzDeg',()=>(radar.cur.az||0)*DEG,null],['targetDesignatorRangeM',()=>(radar.cur.r||0)*radar.rngM,null],
];
const last={};
function syncIn(r){for(const b of B){const k=b[0];if(b[2]&&k in last&&r[k]!==last[k]){try{b[2](r[k]);}catch(e){}}}}
function syncOut(r){for(const b of B){let v;try{v=b[1]();}catch(e){continue;}r[b[0]]=v;last[b[0]]=v;}}

/* ---- physics derived from the registry each frame ---- */
function derive(r,lb){const lam=lb.lam,prf=r.pulseRepetitionFrequencyHz||1;r.dutyCycle=cl(r.pulseWidthMicroseconds*1e-6*prf,0,1);
  r.wavelengthMeters=lam;r.antennaMaxGainDb=db(lb.G);r.linkEffectiveApertureM2=lb.eta*lb.A;r.linkDirectivityDb=db(lb.G/lb.eta);
  r.antennaBeamwidthElDeg=70*lam/r.antennaDiameterMeters;r.averagePowerWatts=lb.Pt*r.dutyCycle;r.linkEirpDbw=db(lb.Pt*lb.G);
  r.maxUnambiguousRangeM=C/(2*prf);r.maxUnambiguousVelocityMS=lam*prf/4;r.dutyCycle=cl(r.pulseWidthMicroseconds*1e-6*prf,0,1);
  r.receiverNoiseFloorDbm=-174+db(r.receiverBandwidthMHz*1e6)+r.receiverNoiseFigureDb;
  r.receiverSensitivityDbm=r.receiverNoiseFloorDbm+(r.detectionThresholdSnrDb||13);
  r.linkSystemNoiseTempK=T0*un(r.receiverNoiseFigureDb);r.linkMinDetectableSignalW=lb.N*un(r.detectionThresholdSnrDb||13);
  r.linkRadarEquationTerm1=lb.s1;r.rangeResolutionM=C*r.pulseWidthMicroseconds*1e-6/2/Math.max(1,r.pulseCompressionRatio);
  r.rangeGateWidthM=r.rangeResolutionM;r.azimuthResolutionDeg=radar.beam*DEG;r.elevationResolutionDeg=radar.bmV()*DEG;
  r.electricalPowerDrawWatts=r.radarPowerState==='Off'?0:r.radarPowerState==='Operate'?hwOf(r.radarModelName)[10]:hwOf(r.radarModelName)[10]*.4;
  r.emissionsDetectableFlag=r.radarPowerState==='Operate'&&radar.sensor==='RDR'&&F.radiating;r.emissionSignatureStrength=r.emissionsDetectableFlag?lb.Pt*lb.G:0;}

/* ---- per-frame update ---- */
let rTime=0,burst=0,intermit=1,iT=0;
function tick(dt){const P=player;if(!F.on||!P||!P.alive)return;
  if(!F.reg||F.owner!==P||F.type!==P.type){F.reg=seed(P);F.owner=P;F.type=P.type;F.base=linkTerm(F.reg).s1;F.bw0=70*(C/(F.reg.carrierFrequencyGHz*1e9))/F.reg.antennaDiameterMeters;
    F.beam0=radar.beam;F._stuck=null;for(const k in last)delete last[k];syncOut(F.reg);}
  const r=F.reg;syncIn(r);
  // power, prf of the current mode
  r.prfMode=r.prfMode||'Medium';r.pulseRepetitionFrequencyHz=P.ac.pulse?r.prfLowHz:({Low:r.prfLowHz,Medium:r.prfMediumHz,High:r.prfHighHz}[r.prfMode]||r.prfMediumHz||r.prfHighHz||r.prfLowHz)||r.prfLowHz;
  // electrical bus: generators come on line around idle; external power on the ground keeps it up
  const onGnd=!!(P.onGround||P.gear&&P.pos&&typeof groundAt==='function'&&P.pos.y-groundAt(P.pos.x,P.pos.z)<4&&P.vel&&P.vel.length()<3);
  r.electricalBusAvailable=(P.n==null||P.n>.45||onGnd)&&!(P.dm&&P.dm.elec===0);
  // health from the existing damage model
  r.radarHealth=P.dm&&P.dm.rdr!=null?cl(P.dm.rdr/100,0,1):1;
  // thermal: average power heats it, ram / ECS air cools it
  const ias=(P.cas||P.ias||200)*.5144,airK=cl(.25+ias/180,0,1)*((P.n==null||P.n>.4)?1:.15);r.radarCoolingLevel=airK;
  const lb=linkTerm(r),radiating=F.radiating&&radar.sensor==='RDR'||radar.coop()&&F.radiating;
  const heatIn=radiating?cl(r.powerLevelCurrent,0,2)*(r.eccmPowerBoostEnabled?r.eccmPowerBoostHeatCost:1):0;// equilibrium ≈ 25·P/cooling: fine in flight, over the limit when parked for long or boosted at low speed
  r.radarHeatCurrent=Math.max(0,r.radarHeatCurrent+dt*(heatIn*1.4-airK*2.2*r.radarHeatCurrent/40));
  const hot=r.radarHeatCurrent>r.radarOverheatThreshold;
  if(r.transmitDutyLimitEnabled){const want=hot?.5:r.radarFailureMode==='Reduced_Power'?.5:1;if(r._autoPwr!==want){r.powerLevelCurrent=want;r._autoPwr=want;}}
  // random failures (rate scales up when hot or damaged)
  if(radiating&&r.radarFailureMode==='None'&&Math.random()<r.radarFailureChancePerSecond*(hot?40:1)*(2-r.radarHealth)*dt){
    const roll=Math.random(),mech=r.antennaType==='Mechanical_Slotted_Planar';r.radarFailureMode=roll<.4?'Reduced_Power':roll<.7?'Intermittent':roll<.9&&mech?'Stuck_Antenna':'Dead';
    if(typeof flash==='function')flash('RADAR FAIL · '+r.radarFailureMode.replace('_',' ').toUpperCase(),1600);}
  // stuck antenna: the drive is frozen where it is
  if(r.radarFailureMode==='Stuck_Antenna'){if(F._stuck==null){F._stuck=radar.rate;}radar.rate=0;}else if(F._stuck!=null){radar.rate=F._stuck;F._stuck=null;}
  // intermittent: drops out for random spells
  iT-=dt;if(iT<=0){iT=.5+Math.random()*1.5;intermit=r.radarFailureMode==='Intermittent'?Math.random()>.35:1;}
  // EMCON
  rTime+=dt;if(r.emconState==='Burst_Only'){burst=(rTime%Math.max(2.5,r.emconBurstIntervalSeconds))<2;}else burst=r.emconState!=='Silent';
  F.radiating=burst&&intermit&&r.radarFailureMode!=='Dead'&&r.electricalBusAvailable&&radar.power==='ON'&&radar.warm<=0;
  // link-budget scale and beamwidth relative to the spawn values (no change = published ranges)
  F.kLB=Math.pow(lb.s1/F.base,.25);F.kBeam=(70*lb.lam/r.antennaDiameterMeters)/F.bw0;radar.beam=F.beam0*F.kBeam;
  derive(r,lb);syncOut(r);
  if(!r.electricalBusAvailable||r.radarFailureMode==='Dead')r.radarPowerState=last.radarPowerState='Emergency';
  // mirrors from the track / lock state
  const L=radar.lock,now=performance.now()/1000;r.lockedTargetEntityID=L?L.id||0:0;
  r.lockAttemptState=radar.mode==='STT'&&L?(radar.lostT>0?'Breaking':'Locked'):radar.notched>0?'Broken':radar.mode==='ACM'&&radar.acmBest?'Acquiring':'Idle';
  r.lockBreakReasonLast=({NOTCH:'Notch',GIMBAL:'Gimbal',JAM:'Jam',CHAFF:'Chaff',LOST:'Range'}[radar.lostWhy])||'None';
  r.lockBreakConditionNotch=radar.lostWhy==='NOTCH';r.lockBreakConditionGimbal=radar.lostWhy==='GIMBAL';r.lockBreakConditionJam=radar.lostWhy==='JAM';r.lockBreakConditionChaff=radar.lostWhy==='CHAFF';
  r.lockMemoryActive=radar.mode==='STT'&&radar.lostT>0;r.eccmHomeOnJamEnabled=true;
  if(L&&L.alive){const a=radar.ang(L.pos),sn=radar.snr(L,a),los=L.pos.clone().sub(P.pos).normalize();
    r.lockedTargetRangeM=a.d;r.lockedTargetClosureMS=P.vel.dot(los)-L.vel.dot(los);r.snrCurrentDb=db(sn);r.snrMarginDb=r.snrCurrentDb-db(typeof SNR50!=='undefined'?SNR50:20);
    r.detectionProbabilityCurrent=typeof pdOf==='function'?pdOf(sn):0;r.detectionRangeCurrentM=radar.rdet(L,a);
    const J=radar.jam(L);r.ecmNoiseJammerActive=!!(J&&J.noise);r.ecmBurnThroughRangeM=J?J.bt||0:0;r.ecmDeceptionType=J&&J.dec?'RGPO':'None';
    r.ecmJamToSignalRatioDb=J&&J.noise&&J.bt?40*Math.log10(Math.max(a.d,1)/J.bt):-99;}
  else{r.lockedTargetRangeM=0;r.lockedTargetClosureMS=0;r.ecmNoiseJammerActive=false;r.ecmDeceptionType='None';}
  r.eccmAlertState=radar.hoj?'Jamming_Detected':radar.pull>.1?'Deception_Detected':radar.lostWhy==='CHAFF'&&radar.notched>0?'Chaff_Detected':'None';
  r.eccmAlertTextToHud={Jamming_Detected:'JAM',Deception_Detected:'DECEPT',Chaff_Detected:'CHAFF'}[r.eccmAlertState]||'';
  let n=0;for(const [,tk] of radar.tracks)if(now-tk.t<6)n++;r.trackMaxCount=Math.max(r.trackMaxCount||0,radar.tracks.size);r.rwsMaxTargets=n;
  r.ecmChaffCloudCount=typeof decoys!=='undefined'?decoys.filter(d=>d.alive&&d.type==='chaff').length:0;
  // environment
  r.envAltitude=P.pos.y;r.envRainRateMmHr=typeof ENV!=='undefined'&&ENV.rain?ENV.rain*25:0;r.rainLossDbPerKm=.0074*Math.pow(r.envRainRateMmHr,1.31)*2;
  r.envEarthRadiusEffective=r.physEarthRadiusMeanM*4/3;
  // IRST mirrors
  if(r.irstID){r.irstPowerState=radar.sensor==='IRST'||radar.coop()?'Operate':'Standby';r.irstModeCurrent=radar.sensor==='IRST'?radar.mode:'Standby';
    r.irstLockedTargetEntityID=radar.sensor==='IRST'&&L?L.id||0:0;if(radar.sensor==='IRST'){r.irstGimbalCurrentAzDeg=radar.antAz*DEG;r.irstGimbalCurrentElDeg=radar.antEl*DEG;}}
}

/* ---- simulation hooks ---- */
// radar on line only with bus power, not failed dead, inside an intermittent window and not silenced by EMCON
{const _on=radar.on;radar.on=function(){const o=_on.call(this);if(!F.on||!F.reg||this.sensor!=='RDR')return o;return o&&F.radiating;};}
// link budget into the range the existing damage model writes every frame
{const _d=Jet.prototype.dmgPlayerFx;Jet.prototype.dmgPlayerFx=function(dt){const r=_d.apply(this,arguments);if(F.on&&this===player&&F.reg)radar.R0*=F.kLB;return r;};}
// propagation: clear-air attenuation (falls with density) and the radar horizon
const horizon=(h1,h2)=>4120*(Math.sqrt(Math.max(h1,0))+Math.sqrt(Math.max(h2,0)));
{const _s=radar.snr1;radar.snr1=function(j,a,loss){let s=_s.call(this,j,a,loss);if(!F.on||!F.reg||!s||this.sensor!=='RDR')return s;const r=F.reg;
  const hz=horizon(player.pos.y,j.pos.y);r.radarHorizonRangeM=hz;if(a.d>hz)return 0;
  const hm=(player.pos.y+j.pos.y)/2,dens=Math.exp(-hm/8000);s*=Math.pow(10,-(r.atmosphericLossDbPerKm*dens)*a.d/1000/10);return s;};}
F.horizon=horizon;

/* ---- public helpers ---- */
F.get=k=>F.reg?F.reg[k]:undefined;
F.set=(k,v)=>{if(!F.reg)return false;if(!SENSOR_REG.lookup(k).length)console.warn('[sensorfuse] not a registry parameter:',k);F.reg[k]=v;return true;};
F.repair=()=>{if(F.reg){F.reg.radarFailureMode='None';F.reg.radarHeatCurrent=0;}};
F.dump=()=>{if(!F.reg)return null;const o={};for(const k of Object.keys(F.reg))if(F.reg[k]!==null&&!(Array.isArray(F.reg[k])&&!F.reg[k].length)&&F.reg[k]!==0&&F.reg[k]!==''&&F.reg[k]!==false)o[k]=F.reg[k];return o;};
{const _u=radar.update;radar.update=function(dt){try{tick(dt);}catch(e){console.warn('[sensorfuse]',e);}return _u.call(this,dt);};}
// a respawn or aircraft change reseeds the registry
{const _sp=Jet.prototype.spawn;Jet.prototype.spawn=function(){const r=_sp.apply(this,arguments);if(this===player)F.reg=null;return r;};}

console.info('[sensorfuse] v268 registry fused with the radar ('+SENSOR_REG.count+' parameters, '+B.length+' two-way bindings)');
})();
