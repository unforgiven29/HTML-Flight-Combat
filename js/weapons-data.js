/* ============ v266: full missile parameter model (MSPEC) + per-gun ballistics (GUNDB) ============
   Every missile gets d.spec with the full parameter set, grouped 01-09. Values come from the published data already in the table
   (mass, motors, seeker, gimbal, fuze, life) plus real warhead / fuze / seeker / cooling data; anything never published (IF frequencies,
   noise floors, actuator torques) is a nominal engineering default and marked "nominal" below.
   Live per-missile state (mass, CG, Mach, q, skin temp, battery, coolant, time-to-go...) is in m.st and updates every step.
   What drives the simulation: ejection / rail push, ejection delay, hang-fire, nozzle erosion, safe-separation (no turning before it),
   arm delay, wind on the airframe, transonic buffet, dome heating noise, coolant run-out, battery brown-out, target memory hold,
   terrain-masking time, proximity-fuze radius / closure gate / misfire / impact backup, warhead mass and type (blast-frag vs rod).
   Guns: calibre, case, projectile mass, HE fill, muzzle velocity, drag, belt mix, rpm, barrels, spin-up, barrel heat, recoil, burst limits.
   F9 opens the WEAPON DATA page for the selected weapon. */
try{
const R2D=180/Math.PI;
// [length m, warhead kg, HE kg, warhead type, fuze, cooling, seeker head, nozzle/TVC, fins]   warhead type: BF blast-frag, CR continuous rod, ER expanding rod, AF annular frag
const MREALX={
 'AIM-9B':[2.83,4.5,1.7,'BF','IR_Influence','none','IR_Conical'],'AIM-9D':[2.87,10.2,4.5,'CR','IR_Influence','N2_launcher','IR_Conical'],
 'AIM-9E':[3.0,4.5,1.7,'BF','IR_Influence','thermoelectric','IR_Conical'],'AIM-9G':[2.87,10.2,4.5,'CR','IR_Influence','N2_launcher','IR_Conical'],
 'AIM-9J':[3.07,4.5,1.7,'BF','IR_Influence','thermoelectric','IR_Conical'],'AIM-9P':[3.07,4.5,1.7,'BF','Active_Optical','thermoelectric','IR_Conical'],
 'AIM-9L':[2.87,9.4,3.6,'AF','Active_Laser','Ar_launcher','IR_Conical'],'AIM-9M':[2.87,9.4,3.6,'AF','Active_Laser','Ar_launcher','IR_Conical'],
 'AIM-9X':[3.02,9.4,3.6,'AF','Active_Laser','IDCA_internal','IR_Imaging'],
 'AIM-7E':[3.66,30,13,'CR','RF_Proximity','none','SARH'],'AIM-7E-2':[3.66,30,13,'CR','RF_Proximity','none','SARH'],'AIM-7F':[3.66,39,17,'CR','RF_Proximity','none','SARH'],
 'AIM-7M':[3.66,40,18,'BF','RF_Proximity','none','SARH'],'AIM-7P':[3.66,40,18,'BF','RF_Proximity','none','SARH'],
 'AIM-120A':[3.66,22.7,7,'BF','Active_RF','none','ARH'],'AIM-120B':[3.66,22.7,7,'BF','Active_RF','none','ARH'],'AIM-120C':[3.66,18,6.4,'BF','Active_RF','none','ARH'],'AIM-120D':[3.66,18,6.4,'BF','Active_RF','none','ARH'],
 'AIM-54A':[3.96,61,25,'CR','RF_Proximity','none','ARH'],'AIM-54C':[3.96,61,25,'BF','RF_Proximity','none','ARH'],
 'R-3S':[2.84,11.3,5.3,'BF','IR_Influence','none','IR_Conical'],'R-13M':[2.87,11.3,5.3,'BF','IR_Influence','N2_launcher','IR_Conical'],
 'R-60M':[2.14,3.5,1.1,'ER','Active_Optical','N2_launcher','IR_Conical'],
 'R-73':[2.9,7.4,3.2,'CR','Active_Laser','N2_launcher','IR_Conical'],'R-74M':[2.9,7.4,3.2,'CR','Active_Laser','N2_launcher','IR_Conical'],'R-74M2':[2.9,7.4,3.2,'CR','Active_Laser','N2_launcher','IR_Imaging'],
 'R-27R':[4.08,39,16,'ER','RF_Proximity','none','SARH'],'R-27T':[3.8,39,16,'ER','RF_Proximity','N2_launcher','IR_Conical'],
 'R-27ER':[4.78,39,16,'ER','RF_Proximity','none','SARH'],'R-27ET':[4.5,39,16,'ER','RF_Proximity','N2_launcher','IR_Conical'],
 'R-77':[3.6,22.5,8,'CR','Active_Laser','none','ARH'],'R-77-1':[3.71,22.5,8,'CR','Active_Laser','none','ARH'],'R-77M':[3.71,22.5,8,'CR','Active_Laser','none','ARH'],
 'R-24R':[4.46,35,15,'CR','RF_Proximity','none','SARH'],'R-24T':[4.16,35,15,'CR','RF_Proximity','N2_launcher','IR_Conical'],
 'R-40RD':[6.22,38,16,'BF','RF_Proximity','none','SARH'],'R-40TD':[5.8,38,16,'BF','RF_Proximity','N2_launcher','IR_Conical'],
 'R-37M':[4.2,60,25,'BF','RF_Proximity','none','ARH'],'3M9':[5.8,57,24,'BF','RF_Proximity','none','SARH'],'9M331':[2.9,15,6,'BF','RF_Proximity','none','SARH']};
// rail-launched (LAU-7 / P-72 / APU) rounds push forward, ejected rounds (LAU-92, AKU-58, AKU-470) are kicked down by gas pistons

// ---- SARH angle-tracking architecture. Conical scan (CW illumination, seeker nutates its beam and reads the amplitude modulation): AIM-7E / E-2 / F.
// Inverse monopulse (4-channel simultaneous lobing, needs a monopulse-encoded pulse-Doppler illuminator, no scan modulation to exploit): AIM-7M / P (and the
// Skyflash / Aspide family), R-40RD, R-23R / R-24R, R-27R / ER. Monopulse reads the angle off a single return: far smaller miss, tighter gates, AM / inverse-gain
// deception and chaff lose most of their pull, and the head can follow a jammer's angle alone; the price is that the launch radar must radiate monopulse-coherent
// illumination. Values are engineering estimates scaled to the published difference (conical-scan Sparrows missing by 20-30 m, monopulse ones mostly hitting).
const SARH_ARCH={
 mono:{type:'SARH_Monopulse',scan:'Monopulse',noise:.45,decm:.55,bt:.82,lr:1.15,ccm:.15,cross:.5,am:.1,gate:.8,glint:.8,update:2000},
 con:{type:'SARH_ConScan',scan:'Conical_Scan',noise:1.6,decm:1.7,bt:1.1,lr:.85,ccm:0,cross:.12,am:.9,gate:1.15,glint:.35,update:30}};
const SARH_MONO=new Set(['AIM-7M','AIM-7P','R-40RD','R-24R','R-27R','R-27ER']);
function sarhArch(k,d){if(d.seek!=='SARH')return null;return SARH_MONO.has(k)?SARH_ARCH.mono:SARH_ARCH.con;}
const SPEC=(k,d)=>{const sa=sarhArch(k,d);const x=MREALX[k]||[ (d.ph&&d.ph.dia?d.ph.dia*22:3), (d.mass||100)*.12,(d.mass||100)*.05,'BF',d.seek==='IR'?'IR_Influence':'RF_Proximity',d.seek==='IR'?'N2_launcher':'none',d.seek==='IR'?'IR_Conical':d.seek];
  const ph=d.ph||{},L=x[0],m0=ph.m0||d.mass||100,mbo=ph.mbo||m0*.6,mp=ph.mp||m0-mbo,dia=ph.dia||.15,ej=(d.ign||0)>0,ir=d.seek==='IR',arh=d.seek==='ARH',big=m0>300;
  const tb=ph.tb||d.burn||4,ts=ph.ts||0,isp=ph.Tb&&ph.mdB?ph.Tb/ph.mdB/G:240,Ix=(mm,LL)=>mm*LL*LL/12,cool=x[5],old=/AIM-9[BDE]|AIM-7E|R-3S|R-13/.test(k);
  const life=d.life||40,fuse=d.fuse||9,whK=x[1],exK=x[2],wt=x[3];
  return {
  // 01 hardware / pre-launch
  parentVelocityVector:null,parentAngularVelocityVector:null,
  railEjectionForce:ej?m0*7/.06:m0*6/.1,railEjectionVector:ej?'down (-aircraft up)':'forward (aircraft nose)',gasPistonStrokeLength:ej?.2:0,
  latchReleaseForceThreshold:ej?m0*G*4:m0*G*2.2,ejectionDelayTime:d.ign||0,armDelayTime:Math.max(.6,(d.rmin||600)/1400),
  totalMassCurrent:m0,dryMass:mbo,centerOfMassInitial:L*.47,centerOfMassCurrent:L*.47,
  momentOfInertiaPitch:Ix(m0,L),momentOfInertiaYaw:Ix(m0,L),momentOfInertiaRoll:.5*m0*(dia/2)**2,
  canisterReleasePressure:0,umbrellaDeployDelay:/R-77|AIM-54|R-37/.test(k)?.05:0,hardpointUmbilicalState:true,missileID:0,launchStationIndex:-1,
  preLaunchAlignmentAccuracy:arh?.5:ir?0:1.5,umbilicalDataTransferRate:arh?1000:ir?9.6:56,hangfireTimer:.5,
  hangfireProbability:old?.04:/AIM-7F|AIM-9[GJ]|R-24|R-40/.test(k)?.015:.004,safeSeparationDistance:ir?6:big?60:arh?35:25,
  // 02 propulsion
  boosterThrustForce:ph.Tb||0,boosterBurnDuration:tb,sustainerThrustForce:ph.Ts||0,sustainerBurnDuration:ts,
  boosterFuelMass:(ph.mdB||0)*tb,sustainerFuelMass:(ph.mdS||0)*ts,motorSpecificImpulseVacuum:isp*1.09,motorSpecificImpulseSeaLevel:isp,
  nozzleExitArea:Math.PI*(dia*.38)**2,motorTemperatureCurrent:15,thermalDissipationRate:.035,
  thrustVectorXLimit:d.tvc?20:0,thrustVectorYLimit:d.tvc?20:0,thrustVectorSlewRate:d.tvc?600:0,gasGeneratorPressure:arh||d.tvc?6.9e6:0,
  smokeTrailDensityMultiplier:d.smoke||.5,interstageSeparationForce:0,ramjetIntakeArea:0,ramjetMinMachThreshold:0,
  fuelGrainGeometricProfile:ts?'Progressive':'Star_Grain',throttleSettingCurrent:1,exhaustVelocityMuzzle:isp*G,combustionChamberPressure:ts?1.0e7:1.3e7,nozzleErosionRate:old?.006:.002,
  // 03 aerodynamics
  referenceArea:ph.S||Math.PI*dia*dia/4,zeroLiftDragCoefficient:ph.cd0||.3,inducedDragCoefficientScalar:.75,liftCurveSlope:ph.cna||8,
  canardLiftSlope:/AIM-9[^X]|R-60|R-73|R-3|R-13|R-74|AIM-7|R-24|R-40/.test(k)?2.4:0,tailFinLiftSlope:/AIM-120|R-77|R-27|AIM-54|AIM-9X|R-37/.test(k)?2.8:1.2,
  maxAngleOfAttack:(.5*R2D),maxSideslipAngle:(.5*R2D),structuralGForceLimit:d.maxG||25,finDeflectionLimitMax:old?20:30,
  finActuatorTorqueLimit:old?60:140,finActuatorSlewRate:old?150:arh?400:350,rollStabilizationGain:/AIM-9[^X]|R-3S|R-13/.test(k)?0:.8,
  parasiticDragFins:.0012,waveDragMachCurve:[.8,1,.9,1.25,1,1.9,1.2,1.75,1.4,1.62],bodyReynoldsNumber:0,skinTemperatureKinetic:15,chordLengthReference:dia*1.8,
  staticMargin:.08*L,pitchDampingDerivative:-(ph.cna||8)*1.6,yawDampingDerivative:-(ph.cna||8)*1.6,rollDampingDerivative:-.4,
  transonicBuffetingMultiplier:old?1.6:1,finAsymmetryImbalance:old?.012:.003,
  // 04 environment (live values go to m.st)
  ambientAirDensity:1.225,localSpeedOfSound:340,currentMachNumber:0,ambientAirTemperature:15,dynamicPressure:0,windVectorForce:null,downdraftThermalMultiplier:0,
  barometricPressurePressure:101325,cloudWaterContentDensity:0,humidityAttenuationFactor:ir?.12:.02,groundMultipathReflectance:arh||d.seek==='SARH'?.6:0,
  solarBlindingAzimuth:null,ionosphericScintillation:0,terrainElevationAtFootprint:0,
  // 05 seeker
  seekerType:sa?sa.type:x[6],seekerAngleTracking:sa?sa.scan:ir?'Conical_Scan':'Active_Monopulse',seekerAngleNoiseMult:sa?sa.noise:1,seekerAmDeceptionSusceptibility:sa?sa.am:0,seekerTrackRateMult:sa?sa.lr:1,seekerAngleUpdateHz:sa?sa.update:0,seekerRequiresMonopulseIlluminator:!!(sa&&sa===SARH_ARCH.mono),decmSusceptibility:sa?sa.decm:1,burnThroughMult:sa?sa.bt:1,seekerFieldOfView:(d.search||2.5*D2R)*R2D,seekerInstantaneousFOV:ir?(/9X|M2/.test(k)?.02:1.2):3.5,gimbalLimitMax:(d.gimbal||.7)*R2D,
  gimbalSlewRateMax:(d.trk||.6)*R2D,instantaneousBoresightAngle:0,seekerCooledStatus:ir&&cool!=='none',
  coolantType:cool,coolantGasQuantityRemaining:cool==='none'?0:/launcher/.test(cool)?(/R-|AIM-9[DG]/.test(k)?60:150):Infinity,
  minimumRadarCrossSection:arh?.5:d.seek==='SARH'?1:0,receiverNoiseFloor:arh?-110:d.seek==='SARH'?-104:0,antennaGainPattern:arh||sa?[1,.97,.88,.74,.56,.37,.2,.08,.02]:null,
  opticalContrastThreshold:ir?(old?.35:.12):0,lensFoggingFactor:0,rangeGateMin:ir?150:300,rangeGateMax:ir?(d.irR||12000):arh?(d.pit||20000)*1.4:(d.aiR||25000)*1.5,
  seekerScanPatternType:sa?sa.scan:x[6]==='IR_Imaging'?'Focal_Plane_Array':ir?'Conical_Scan':arh?'Raster':'Conical_Scan',transmitterOutputPower:arh?(big?1000:500):0,
  receiverIntermediateFreq:d.seek==='IR'?0:30e6,opticalMagnificationFactor:0,domeRefractionIndex:ir?1.74:1.0012,uncooledThermalNoiseScalar:ir?3:1,activeLaserPulseRepetitionID:0,
  // 06 signal processing / ECCM
  flareRejectionThreshold:ir?d.res||.6:0,chaffRejectionFactor:ir?0:d.res||.6,dopplerFilterWidth:ir?0:55*(1-.45*(d.ccm||0)),sideLobeAttenuatorLevel:ir?0:-20-15*(d.ecc||0),
  burnThroughRangeThreshold:ir?0:(arh?7000:9000)*(.6+(d.ecc||0)),homeOnJamCapable:!!d.hoj,frequencyHoppingRate:arh?(d.ecc||0)*2000:0,
  targetMemoryHoldTime:arh?3:d.seek==='SARH'?1:.4,clutterRejectionCoeff:old?.3:.75,glintSuppressionGain:sa?sa.glint:arh?.6:.3,jammingSignalToNoiseRatio:0,
  crossEyeJammingVulnerability:sa?sa.cross:old?.6:.25,twoColorIRRatioTolerance:/9X|9M|R-73|R-74|R-27T|R-27ET/.test(k)?.18:0,velocityGateSize:55*(1-.45*(d.ccm||0))*(sa?sa.gate:1),
  leadingEdgeTrackerBias:arh?.4:0,terrainMaskingSensitivity:.5,
  // 07 guidance
  guidanceLawProfile:d.apn?'Augmented_Prop_Nav':'Proportional_Nav',proportionalNavConstant:d.N||4,loftAngleInitial:(d.loft||0)*R2D,loftTerminalDropRange:.35,
  midcourseUpdateFrequency:arh?1:d.seek==='SARH'?0:0,datalinkChannelID:0,activeRadarActivationRange:arh?d.pit||15000:0,terminalGuidanceDelay:arh?.25:0,
  leadBiasScalar:ir?.08:0,insDriftRatePerHour:arh?(big?3:1):0,gpsSignalLockState:false,kalmanFilterStateCovariance:null,targetAccelerationEstimation:0,
  timeToGoCalculated:0,optimalInterceptPointVector:null,waypointIndexCurrent:0,
  // 08 fuzing / warhead
  proximityFuzeRadius:fuse,proximityLaserBeamCount:/Laser|Optical/.test(x[4])?(/R-/.test(k)?8:4):0,proximityConeAngle:/Laser|Optical/.test(x[4])?75:60,fuzeType:x[4],
  fuzeDynamicDelayTime:0,backupImpactFuzeSensitivity:2.5e4,explosiveMassTNTequiv:exK*1.35,warheadMass:whK,warheadType:wt,
  blastOverpressureRadiusInner:1.1*Math.cbrt(exK*1.35)*1.4,blastOverpressureRadiusOuter:3.2*Math.cbrt(exK*1.35)*1.4,
  fragmentationCount:wt==='CR'||wt==='ER'?0:Math.round(whK*230),fragmentationVelocityInitial:wt==='CR'?1250:1800,fragmentationMassAverage:wt==='CR'?0:(whK-exK)*1000/Math.max(1,whK*230),
  continuousRodExpansionMax:wt==='CR'||wt==='ER'?Math.min(fuse*1.05,Math.PI*dia*12/Math.PI):0,focusedBlastAngleBias:0,closureSpeedThresholdFuze:15,
  directionalWarheadSlewAngle:0,armorPenetrationDepthRHA:0,fuzeMisfireProbability:old?.07:.01,incendiaryPayloadPercentage:wt==='BF'?.05:0,
  // 09 power / limits
  thermalBatteryLifeMax:life,thermalBatteryCurrentLife:life,onboardComputerCycleRate:old?0:arh?400:100,structuralIntegrityHealth:1,flightDurationTimer:0,
  maximumFlightDurationLimit:life,minimumVelocityDestructLimit:(d.stop||260)-60,selfDestructCommandReceived:false,wireSpoolLengthRemaining:0,
  hydraulicFluidVolume:/AIM-7|AIM-54|R-27|R-40|R-24/.test(k)?1:0,voltageDropTolerance:.15,squibActivationState:false,altimeterFailSafeOverride:true};};
function mspecAll(){for(const[k,d]of Object.entries(MSL))if(d&&!d.spec){const sa=sarhArch(k,d);if(sa&&sa.ccm&&!d._monoCcm){d.ccm=Math.min(.9,(d.ccm||0)+sa.ccm);d._monoCcm=1;}d.spec=SPEC(k,d);}}
mspecAll();window.MSPEC=MSL;


// jamming: deception works on the angle channel, so it pulls conical-scan heads much harder than monopulse; burn-through shrinks for monopulse (it keeps the echo through noise longer)
{const _j=jamOfMsl;jamOfMsl=function(tg,d,pos){const o=_j(tg,d,pos);if(!o||!d.spec||d.seek!=='SARH')return o;const sp=d.spec;
  o.pk*=sp.decmSusceptibility;o.bt*=sp.burnThroughMult;const r=pos.distanceTo(tg.pos);o.far=r>o.bt;o.farD=r>o.bt*.5;return o;};}
// ---- per-missile live state + flight effects ----
const _w=new V3(),_lat=new V3(),_v0=new V3();let _curM=null;
{const _mm=mslMotor;mslMotor=function(d,tb,r){const o=_mm(d,tb,r);const m=_curM;if(m&&m.def===d){if(m.hang)return[0,d.ph.m0];if(d.spec&&o[0]>0)o[0]*=1-d.spec.nozzleErosionRate*tb;}return o;};}
const _ctor=Missile.prototype.update;
Missile.prototype.update=function(dt){const d=this.def;if(!d.spec)d.spec=SPEC(this.type,d);const s=d.spec;
  if(!this.st){const sh=this.sh;this.st={missileID:this.id,launchStationIndex:sh&&sh.load?Object.keys(sh.load).length:-1,parentVelocityVector:sh.vel.clone(),
      thermalBatteryCurrentLife:s.thermalBatteryLifeMax,coolantGasQuantityRemaining:s.coolantGasQuantityRemaining,structuralIntegrityHealth:1,kalman:new Float32Array(36)};
    for(let i=0;i<6;i++)this.st.kalman[i*7]=i<3?400:900;
    this.hang=Math.random()<s.hangfireProbability;}
  const st=this.st;_v0.copy(this.vel);
  // a hang-fire: the motor never lights, the round falls away dead and the timer declares it dud
  _curM=this;try{_ctor.call(this,dt);}finally{_curM=null;}
  if(!this.alive)return;
  const V=Math.max(this.vel.length(),1),y=this.pos.y,r=rho(y),a=sos(y),M=V/a,q=.5*r*V*V,Tk=Math.max(216.65,288.15-.0065*Math.min(y,11000));
  // safe separation: the autopilot holds the launch line until clear of the launcher
  const sep=this.pos.distanceTo(this.sh.pos);if(sep<s.safeSeparationDistance&&this.t<2){_lat.copy(this.vel).sub(_v0);const vd=_w.copy(_v0).normalize();
    const ax=_lat.dot(vd);_lat.addScaledVector(vd,-ax);_lat.y+=G*dt;_lat.addScaledVector(vd,-_lat.dot(vd));this.vel.sub(_lat);this.aL.multiplyScalar(.2);}
  // wind: drag acts on the air-relative velocity, so the airmass carries the missile with it
  if(typeof ENV!=='undefined'&&ENV.windOn){ENV.windAt(y,_w);const k=q*(d.ph?d.ph.S*mslCd0(d.ph,M,this.burning):0)/Math.max(this.mass,1)/V;this.vel.addScaledVector(_w,k*dt);st.windVectorForce=_w.clone();}
  // transonic buffet and aerodynamic-heated dome noise disturb the autopilot
  const buf=M>.92&&M<1.12?s.transonicBuffetingMultiplier*.35:0,skin=Tk*(1+.2*.88*M*M)-273.15,fog=d.seek==='IR'?clamp((skin-180)/400,0,1):0;
  if(buf||fog){_w.set(rnd(-1,1),rnd(-1,1),rnd(-1,1)).multiplyScalar((buf+fog*.6)*G);this.vel.addScaledVector(_w,dt);}
  // IR coolant: the head warms up and loses lock once the gas runs out (launcher bottle rounds carry a short in-flight supply)
  if(d.seek==='IR'&&isFinite(st.coolantGasQuantityRemaining)&&s.seekerCooledStatus){st.coolantGasQuantityRemaining=Math.max(0,st.coolantGasQuantityRemaining-dt);
    if(st.coolantGasQuantityRemaining<=0&&this.track&&Math.random()<dt*.6*s.uncooledThermalNoiseScalar/3)this.track=null;}
  // thermal battery: brown-out in the last 3 % of its life degrades guidance, then the round self-destructs (handled by life)
  st.thermalBatteryCurrentLife=Math.max(0,s.thermalBatteryLifeMax-this.t);if(st.thermalBatteryCurrentLife<s.thermalBatteryLifeMax*.03)this.aL.multiplyScalar(.6);
  // live state, all groups
  const ph=d.ph||{},burnt=ph.m0?clamp((ph.m0-this.mass)/Math.max(ph.mp,1),0,1):0,L=MREALX[this.type]?MREALX[this.type][0]:3;
  Object.assign(st,{flightDurationTimer:this.t,totalMassCurrent:this.mass,centerOfMassCurrent:L*(.47-.06*burnt),momentOfInertiaPitch:this.mass*L*L/12,momentOfInertiaYaw:this.mass*L*L/12,
    staticMargin:s.staticMargin*(1-.5*burnt),ambientAirDensity:r,localSpeedOfSound:a,currentMachNumber:M,dynamicPressure:q,ambientAirTemperature:Tk-273.15,
    barometricPressurePressure:r*287.05*Tk,skinTemperatureKinetic:skin,lensFoggingFactor:fog,bodyReynoldsNumber:r*V*L/1.79e-5,
    motorTemperatureCurrent:this.burning?2800:Math.max(skin,(st.motorTemperatureCurrent||15)*(1-s.thermalDissipationRate*dt)),
    throttleSettingCurrent:this.burning?1:0,hangfire:!!this.hang,terrainElevationAtFootprint:groundAt(this.pos.x,this.pos.z),
    instantaneousBoresightAngle:this.track?this.vel.angleTo(_w.copy(this.track.pos).sub(this.pos))*R2D:0,timeToGoCalculated:this.tti,
    optimalInterceptPointVector:this.lastP,targetAccelerationEstimation:this.track&&this.track.accV?this.track.accV.length()/G:0,
    jammingSignalToNoiseRatio:this.hoj?20:0,squibActivationState:true});
  for(let i=0;i<6;i++)st.kalman[i*7]=st.kalman[i*7]*(1-dt*(this.track?1.5:-.3))+dt*(i<3?5:20);};
// fuze + warhead: closure gate, misfire with impact backup, rods cut out sharply past their expansion radius, fragments thin with distance
window.mslFuze=function(m,j,dd){const d=m.def,s=d.spec,rel=_w.copy(j.vel).sub(m.vel),los=_lat.copy(j.pos).sub(m.pos),cl=-rel.dot(los)/Math.max(los.length(),1);
  const impact=dd<3;if(!impact&&cl<s.closureSpeedThresholdFuze)return false;
  if(Math.random()<s.fuzeMisfireProbability*(impact?.15:1)){if(!m._mis){m._mis=1;if(m.sh===player&&SET.calls==='ON')radio(SN[m.type]+' · FUZE FAIL');}return false;}
  m.st&&(m.st.fuzeDynamicDelayTime=clamp(1.5/Math.max(cl,1),0,.02)*1000);
  const W=Math.cbrt(s.warheadMass/9.4);let f;
  if(dd<s.blastOverpressureRadiusInner||impact)f=1;
  else if(s.warheadType==='CR'||s.warheadType==='ER')f=dd<s.continuousRodExpansionMax?.95:.35*Math.exp(-(dd-s.continuousRodExpansionMax)/2);
  else f=clamp(1-.55*(dd-s.blastOverpressureRadiusInner)/Math.max(d.fuse-s.blastOverpressureRadiusInner,1),.2,1);
  m.remove(true,j);j.hitFrom=m.pos.clone();applyHit(j,340*W*f*rnd(.9,1.1),m.sh,m.type);return true;};

/* ---- guns: real calibres, projectiles, belts, rates, spin-up and barrel heat ---- */
// round: [name, mass kg, HE g, muzzle m/s];  Cd vs Mach is a G7-like projectile curve scaled by form factor i
window.GUNDB={
 'M61A1':{cal:20,cs:102,barrels:6,rpm:6000,rpmLo:4000,spin:.30,dn:.5,mass:112,drive:'hydraulic',feed:'linkless',i:1,belt:[['PGU-28/B SAPHEI',.102,4.6,1050],['M56A3 HEI',.1,10,1036],['M53 API',.098,0,1036]],heatPer:.0009,cool:.08,burst:0},
 'M61A2':{cal:20,cs:102,barrels:6,rpm:6600,rpmLo:4000,spin:.25,dn:.45,mass:92,drive:'hydraulic',feed:'linkless',i:1,belt:[['PGU-28/B SAPHEI',.102,4.6,1050],['M56A3 HEI',.1,10,1036]],heatPer:.0009,cool:.08,burst:0},
 'GSh-30-1':{cal:30,cs:165,barrels:1,rpm:1650,spin:.02,dn:.05,mass:46,drive:'recoil / gas (Gast-free)',feed:'link',i:1.05,belt:[['OFZ-30 HEI',.39,48.5,860],['OFZ-30 HEI',.39,48.5,860],['BR-30 AP-T',.4,0,860]],heatPer:.006,cool:.05,burst:150,water:1},
 'GSh-23L':{cal:23,cs:115,barrels:2,rpm:3400,spin:.04,dn:.08,mass:50.5,drive:'Gast (twin barrel)',feed:'link',i:1.1,belt:[['OFZ-23 HEI',.175,13.5,715],['BZ-23 API',.199,0,700]],heatPer:.0018,cool:.07,burst:0},
 'GSh-6-23':{cal:23,cs:115,barrels:6,rpm:9000,spin:.3,dn:.5,mass:73,drive:'gas (self-powered)',feed:'link',i:1.1,belt:[['OFZ-23 HEI',.175,13.5,715],['BZ-23 API',.199,0,700]],heatPer:.0011,cool:.08,burst:0},
 'M39A3':{cal:20,cs:102,barrels:1,rpm:1600,spin:.03,dn:.05,mass:81,drive:'gas revolver',feed:'link',i:1,belt:[['M56A3 HEI',.1,10,1030],['M53 API',.098,0,1030]],heatPer:.003,cool:.06,burst:0},
 'Mk 12':{cal:20,cs:110,barrels:1,rpm:1050,spin:.03,dn:.05,mass:46,drive:'gas/blowback',feed:'link',i:1.05,belt:[['Mk 11 HEI',.11,7,1010]],heatPer:.003,cool:.06,burst:0},
 'DEFA 552':{cal:30,cs:113,barrels:1,rpm:1250,spin:.03,dn:.05,mass:85,drive:'gas revolver',feed:'link',i:1.2,belt:[['OPIT HEI',.244,40,815]],heatPer:.004,cool:.06,burst:0},
 'ADEN':{cal:30,cs:113,barrels:1,rpm:1300,spin:.03,dn:.05,mass:87,drive:'gas revolver',feed:'link',i:1.2,belt:[['HE',.244,40,790]],heatPer:.004,cool:.06,burst:0},
 'NR-30':{cal:30,cs:155,barrels:1,rpm:850,spin:.02,dn:.05,mass:66,drive:'recoil',feed:'link',i:1.05,belt:[['OFZ-30 HEI',.41,40,780]],heatPer:.006,cool:.05,burst:0},
 'NR-23':{cal:23,cs:115,barrels:1,rpm:850,spin:.02,dn:.05,mass:39,drive:'recoil',feed:'link',i:1.1,belt:[['OFZ-23 HEI',.2,13.5,690]],heatPer:.004,cool:.06,burst:0},
 'GAU-12/U':{cal:25,cs:137,barrels:5,rpm:3600,spin:.4,dn:.5,mass:122,drive:'pneumatic (AV-8B)',feed:'linkless',i:1,belt:[['PGU-25 HEI',.185,30,1040],['PGU-20 API',.15,0,1100]],heatPer:.0012,cool:.08,burst:0},
 'GSh-30-2':{cal:30,cs:165,barrels:2,rpm:3000,spin:.04,dn:.08,mass:105,drive:'Gast (twin barrel)',feed:'link',i:1.05,belt:[['OFZ-30 HEI',.39,48.5,870],['BR-30 AP-T',.4,0,870]],heatPer:.003,cool:.06,burst:0},
 'GSh-6-30':{cal:30,cs:165,barrels:6,rpm:5000,spin:.3,dn:.5,mass:160,drive:'gas (self-powered)',feed:'link',i:1.05,belt:[['OFZ-30 HEI',.39,48.5,860],['BR-30 AP-T',.4,0,860]],heatPer:.0012,cool:.07,burst:0},
 'DEFA 553':{cal:30,cs:113,barrels:1,rpm:1300,spin:.03,dn:.05,mass:85,drive:'gas revolver',feed:'link',i:1.2,belt:[['OPIT HEI',.244,40,815]],heatPer:.004,cool:.06,burst:0},
 'DEFA 554':{cal:30,cs:113,barrels:1,rpm:1800,spin:.03,dn:.05,mass:85,drive:'gas revolver (dual rate)',feed:'link',i:1.2,belt:[['OPIT HEI',.244,40,815]],heatPer:.004,cool:.06,burst:0},
 'Mauser BK-27':{cal:27,cs:145,barrels:1,rpm:1700,spin:.03,dn:.05,mass:100,drive:'gas revolver',feed:'link',i:1,belt:[['DM18 HEI',.26,30,1025],['DM33 APDS-T',.26,0,1025]],heatPer:.003,cool:.06,burst:0},
 'M3 .50':{cal:12.7,cs:99,barrels:1,rpm:1200,spin:.02,dn:.05,mass:29,drive:'recoil',feed:'link',i:.95,belt:[['M8 API',.0428,0,870],['M20 API-T',.04,0,870]],heatPer:.003,cool:.06,burst:0},
 'Type 23-III':{cal:23,cs:115,barrels:2,rpm:3400,spin:.04,dn:.08,mass:50.5,drive:'Gast (twin barrel)',feed:'link',i:1.1,belt:[['HEI',.175,13.5,715],['API',.199,0,700]],heatPer:.0018,cool:.07,burst:0},
 'N-37':{cal:37,cs:155,barrels:1,rpm:400,spin:.02,dn:.05,mass:103,drive:'recoil',feed:'link',i:1.1,belt:[['OZ-37 HE',.735,40,690]],heatPer:.009,cool:.05,burst:0}};
const ALIAS={'GSh-301':'GSh-30-1','GSh-6-23M':'GSh-6-23','ADEN M/55':'ADEN','ADEN 30 mm':'ADEN','DEFA 553 pod':'DEFA 553','M39A2':'M39A3','M39':'M39A3','N-37D':'N-37'};
const gunDef=g=>{let n=(g.name||'').replace(/\s+/g,' ').replace(/^\d×\s*/,'').replace(/\s*\(.*\)$/,'').split(' + ')[0];n=ALIAS[n]||n;return GUNDB[n]||GUNDB[Object.keys(GUNDB).find(k=>n.startsWith(k))]||null;};
// G7-like drag: Cd vs Mach, times the round's form factor
const gCd=M=>M<.85?.12:M<1.05?.12+.27*(M-.85)/.2:M<1.2?.39-.05*(M-1.05)/.15:.34*Math.pow(1.2/M,.45);
// per-round damage: impact kinetic energy plus HE fill (calibrated so a 20 mm HEI at the muzzle ~9, a 30 mm OFZ ~26)
const rDmg=(m,he,v)=>.143*(.5*m*v*v/1000)+.112*he;
function gunInit(g){if(g._gd!==undefined)return g._gd;const D=g._gd=gunDef(g);if(!D)return null;
  g.cal=D.cal;g.guns=+((g.name||'').match(/^(\d)×/)||[0,1])[1];g.caseLen=D.cs;g.barrels=D.barrels;g.rpm=Math.round(g.rate*60);g.spinUp=D.spin;g.bullets=D.belt.map(b=>({name:b[0],mass:b[1],he:b[2],v:b[3],A:Math.PI*(D.cal/2000)**2}));
  g.heat=0;g.beltI=0;g.burst=0;g.gunMass=D.mass;g.drive=D.drive;g.feed=D.feed;g.v=D.belt[0][3];return D;}
const _gf=new V3(),_gd=new V3(),_gm=new V3();
updateGun=function(j,dt){if(j.remote)return;const g=j.gun,D=gunInit(g);
  if(!D){return _ug0(j,dt);}
  const on=j.alive&&j.trigger&&g.ammo>0&&!(D.burst&&g.burst>=D.burst&&g.heat>.6);
  g.spin=clamp(g.spin+(on?dt/D.spin:-dt/D.dn),0,1);g.heat=Math.max(0,g.heat-dt*D.cool*(D.water?1.6:1));
  if(!j.trigger)g.burst=0;
  if(!on){g.acc=0;if(j===player)sfx.gun(false);return;}
  const rps=g.rate*g.spin;g.acc+=dt*rps;const f=j.fwd(_gf),spr=g.spread*(1+2.5*g.heat);
  while(g.acc>=1&&g.ammo>0){g.acc-=1;g.ammo--;g.burst++;g.heat=Math.min(1,g.heat+D.heatPer);
    const R=g.bullets[g.beltI++%g.bullets.length],dir=_gd.set(rnd(-1,1),rnd(-1,1),rnd(-1,1)).multiplyScalar(spr).add(f).normalize(),b=bulletNew(j,rDmg(R.mass,R.he,R.v));
    b.k=R.A/(2*R.mass)*D.i;b.m=R.mass;b.he=R.he;b.cal=D.cal;b.p.copy(j.pos).addScaledVector(f,7);b.v.copy(j.vel).addScaledVector(dir,R.v*(1-.004*g.heat));}
  // recoil: momentum of the rounds plus ~30 % from the powder gas
  {const R=g.bullets[0],F=rps*R.mass*R.v*1.3,m=j.mass||10000;j.vel.addScaledVector(f,-F/m*dt);g.recoil=F;}
  if(g.spin>.5)glow.emit(_gm.copy(j.pos).addScaledVector(f,8),j.vel,.04*Math.sqrt(D.cal/20),2.5,1,1,.8,.4,.9);
  if(j===player)sfx.gun(true);};
const _ug0=function(j,dt){const g=j.gun,on=j.alive&&j.trigger&&g.ammo>0;g.spin=clamp(g.spin+(on?dt/(g.rate>50?.35:.08):-dt/.5),0,1);if(!on){g.acc=0;if(j===player)sfx.gun(false);return;}
  g.acc+=dt*g.rate*g.spin;const f=j.fwd(_gf);while(g.acc>=1&&g.ammo>0){g.acc-=1;g.ammo--;const dir=_gd.set(rnd(-1,1),rnd(-1,1),rnd(-1,1)).multiplyScalar(g.spread).add(f).normalize(),b=bulletNew(j,g.dmg);
    b.p.copy(j.pos).addScaledVector(f,7);b.v.copy(j.vel).addScaledVector(dir,g.v);}if(j===player)sfx.gun(true);};
{const _bn=bulletNew;bulletNew=function(o,dmg,gnd){const b=_bn(o,dmg,gnd);b.k=null;b.m=0;b.he=0;b.cal=0;return b;};}
const _rv=new V3();
updateBullets=function(dt){
  for(let i=bullets.length-1;i>=0;i--){const b=bullets[i],prev=b.q.copy(b.p);b.v.y-=G*dt;
    if(b.k){const V=b.v.length(),r=rho(b.p.y);b.v.multiplyScalar(Math.max(0,1-b.k*gCd(V/sos(b.p.y))*r*V*dt));}
    else b.v.multiplyScalar(1-rho(b.p.y)*.06*dt);
    b.p.addScaledVector(b.v,dt);b.t+=dt;let hit=false;
    for(const j of jets){if(!j.alive||j===b.o||isFr(j,b.o)||prev.distanceToSquared(j.pos)>4e6)continue;
      if(segDist(prev,b.p,j.pos,j.vel,dt)<6.5){if(b.o===player||!b.o.remote)j.hitFrom=b.o.pos;
        const dmg=b.k?rDmg(b.m,b.he,_rv.copy(b.v).sub(j.vel).length()):b.dmg;
        applyHit(j,dmg,b.o,'GUN');hit=true;glow.emit(b.p,null,.25*(b.he>20?1.6:1),4,9,1,.8,.4,1);smoke.emit(b.p,null,1.5,2,6,.2,.2,.2,.6);break;}}
    if(!hit&&b.o===player&&GND.units.length)hit=GND.bullet(prev,b.p,b);
    if(hit||b.t>(b.k?5:3)||b.p.y<groundAt(b.p.x,b.p.z)){bulletFree(i);continue;}
    glow.emit(b.p,null,.017*(b.cal?Math.sqrt(b.cal/20):1),1.7,1.7,1,.85,.45,1);}};
// gunsight: fly the lead round of the belt exactly as updateBullets does, so pipper / funnel stay true for every gun
gunTraj=function(P){if(_gtr&&_gtF===FR&&_gtP===P)return _gtr;const g=P.gun,D=gunInit(g),R=D&&g.bullets[0],k=R?R.A/(2*R.mass)*D.i:0;
  const f=P.fwd(new V3()),v=P.vel.clone().addScaledVector(f,R?R.v:g.v),p=P.pos.clone().addScaledVector(f,7),dt=.02,n=R?220:150,out=new Array(n+1);
  out[0]=p.clone();for(let i=1;i<=n;i++){v.y-=G*dt;if(k){const V=v.length();v.multiplyScalar(Math.max(0,1-k*gCd(V/sos(p.y))*rho(p.y)*V*dt));}else v.multiplyScalar(1-rho(p.y)*.06*dt);p.addScaledVector(v,dt);out[i]=p.clone();}
  _gtr=out;_gtF=FR;_gtP=P;return out;};

/* ---- F9: WEAPON DATA page ---- */
const wdp=document.createElement('div');wdp.id='wpnData';wdp.hidden=true;
wdp.style.cssText='position:fixed;top:4vh;right:2vw;width:min(560px,92vw);max-height:88vh;overflow:auto;background:#0b100dEE;border:1px solid #2b3530;border-radius:8px;padding:10px 14px;font:11px var(--f-mono);color:#cfe8da;z-index:60;pointer-events:auto';
document.body.appendChild(wdp);
const GRP=[['01 HARDWARE / PRE-LAUNCH',/^(parent|rail|ejection|arm|total|dry|centerOf|momentOf|canister|umbrella|hardpoint|missileID|launchStation|preLaunch|umbilical|hangfire|gasPiston|latch|safeSep)/],
 ['02 PROPULSION',/^(booster|sustainer|motor|nozzle|thermalDiss|thrustVector|gasGen|smoke|interstage|ramjet|fuelGrain|throttle|exhaust|combustion)/],
 ['03 AERODYNAMICS',/^(reference|zeroLift|induced|liftCurve|canard|tailFin|maxAngle|maxSide|structural|finDef|finAct|rollStab|parasitic|waveDrag|bodyRey|skinTemp|chord|staticMargin|pitchDamp|yawDamp|rollDamp|transonic|finAsym)/],
 ['04 ENVIRONMENT',/^(ambient|localSpeed|currentMach|dynamicP|windVec|downdraft|barometric|cloudWater|humidity|groundMulti|solarBl|ionospheric|terrainElev)/],
 ['05 SEEKER',/^(seeker|gimbal|instantaneous|coolant|minimumRadar|receiverNoise|antennaGain|optical|lensFog|rangeGate|transmitter|receiverInter|domeRef|uncooled|activeLaser|decmSus)/],
 ['06 SIGNAL PROC / ECCM',/^(flare|chaff|doppler|sideLobe|burnThrough|homeOnJam|frequencyHop|targetMemory|burnThroughMult|clutter|glint|jammingSig|crossEye|twoColor|velocityGate|leadingEdge|terrainMask)/],
 ['07 GUIDANCE / NAV',/^(guidanceLaw|proportionalNav|loft|midcourse|datalink|activeRadar|terminalGuid|leadBias|insDrift|gpsSig|kalman|targetAccel|timeToGo|optimalInt|waypoint)/],
 ['08 FUZE / WARHEAD',/^(proximity|fuze|backupImpact|explosive|warhead|blast|fragmentation|continuousRod|focused|closureSpeed|directionalW|armorPen|incendiary)/],
 ['09 POWER / LIMITS',/^(thermalBattery|onboard|structuralInt|flightDur|maximumFlight|minimumVel|selfDestruct|wireSpool|hydraulic|voltage|squib|altimeter)/]];
const fmt=v=>v==null?'—':typeof v==='number'?(!isFinite(v)?'∞':Math.abs(v)>=1e4||(Math.abs(v)<.01&&v)?v.toExponential(2):+v.toFixed(3)):Array.isArray(v)?'['+v.map(x=>+(+x).toFixed(2)).join(' ')+']':v&&v.isVector3?`(${v.x.toFixed(0)}, ${v.y.toFixed(0)}, ${v.z.toFixed(0)})`:String(v);
function wdpDraw(){if(wdp.hidden||!player)return;const w=game.wsel;let h='<b style="color:#59ff9f">WEAPON DATA</b> · F9 closes<br>';
  if(w==='GUN'){const g=player.gun,D=gunInit(g);h+=`<h3 style="margin:8px 0 4px;color:#ffbf47">${g.name}</h3>`;
    if(!D)h+='No gun fitted.';else{const R=g.bullets;h+=`calibre ${D.cal}×${D.cs} mm · ${g.guns>1?g.guns+' guns × ':''}${D.barrels} barrel${D.barrels>1?'s':''} · ${g.rpm} rds/min · drive ${D.drive} · feed ${D.feed} · gun ${D.mass} kg<br>
      spin-up ${D.spin}s · ammo ${g.ammo} · spin ${(g.spin*100|0)}% · barrel heat ${(g.heat*100|0)}% · burst ${g.burst}${D.burst?' / '+D.burst+' limit':''} · recoil ${((g.recoil||0)/1000).toFixed(1)} kN<br><br>BELT:<br>`+
      R.map(r=>`${r.name}: ${(r.mass*1000).toFixed(0)} g · HE ${r.he} g · MV ${r.v} m/s · E₀ ${(.5*r.mass*r.v*r.v/1000).toFixed(0)} kJ · TOF 1 km ≈ ${tof(r,D).toFixed(2)} s`).join('<br>');}}
  else{const d=MSL[w];if(!d){wdp.innerHTML=h+'No A/A missile selected.';return;}if(!d.spec)d.spec=SPEC(w,d);const s=d.spec,live=missiles.filter(m=>!m.remote&&m.alive&&m.sh===player&&m.type===w).pop(),src=Object.assign({},s,live&&live.st||{});
    h+=`<h3 style="margin:8px 0 4px;color:#ffbf47">${w}${live?' · LIVE ROUND #'+live.id:''}</h3>`;
    for(const[gn,re]of GRP){h+=`<div style="color:#59ff9f;margin-top:6px">${gn}</div>`;for(const k of Object.keys(s))if(re.test(k))h+=`<div style="display:flex;justify-content:space-between;gap:10px"><span style="color:#86948c">${k}</span><span>${fmt(src[k])}</span></div>`;}}
  wdp.innerHTML=h;}
function tof(r,D){let v=r.v,x=0,t=0;const k=r.A/(2*r.mass)*D.i;while(x<1000&&t<5){v-=k*gCd(v/340)*1.225*v*v*.005;x+=v*.005;t+=.005;}return t;}
addEventListener('keydown',e=>{if(e.code==='F9'){e.preventDefault();wdp.hidden=!wdp.hidden;wdpDraw();}});
setInterval(wdpDraw,250);
}catch(e){console.warn('v215 weapons',e);}
