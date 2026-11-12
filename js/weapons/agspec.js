"use strict";
/* =====================================================================================================================
   v295 - full parameter model (spec) for the air-to-ground missiles: the same nine groups the A/A rounds got in weapons-data.js
   (01 hardware / pre-launch, 02 propulsion, 03 aerodynamics, 04 environment, 05 seeker, 06 signal processing / ECCM, 07 guidance /
   navigation, 08 fuze / warhead, 09 power / limits), for every AGW entry of class agm (stand-off and tactical missiles) and arm
   (anti-radiation). Bombs, rocket pods and pods are not missiles and are left alone.
   Warhead mass, explosive fill, warhead type, fuze, motor type, seeker head, navigation and datalink are published figures (table X);
   everything never published (IF frequencies, noise floors, actuator torques, drift rates) is a nominal engineering value, as in the A/A set.
   What drives the simulation (GND.flyMavs wrapper): hang-fire (motor never lights, the round falls away), safe separation (holds the launch
   line until clear), motor nozzle erosion, thermal-battery brown-out in the last 3 % of life, fuze dud (misfire probability, decided at
   launch), ramjet intake flame-out below the minimum Mach, and the live state (mass, Mach, q, skin temperature, battery, boresight, time to go).
   F9 shows the spec of the selected A/G missile and, while one is flying, its live values.
   ===================================================================================================================== */
(function(){
if(typeof AGW==='undefined'||typeof GND==='undefined'){console.warn('[agspec] core missing');return;}
const R2D=180/Math.PI;
/* [warhead kg, HE fill kg, warhead type, fuze, motor, seeker head, navigation, datalink]
   warhead types: SC shaped charge, PEN penetrator, SAP semi-armour-piercing, HE_Frag blast-frag, Frag_Preformed (ARM), Tandem_HEAT
   motors: Solid, Solid_Dual (boost + sustain), Rocket_Ramjet (integral booster), Solid_Booster_Ramjet, Solid_Booster_Turbojet / Turbofan, Turbojet, None_Glide */
const X={
 'AGM-65A':[59,25,'SC','Impact_Delay','Solid_Dual','TV_Contrast','none','none'],'AGM-65B':[59,25,'SC','Impact_Delay','Solid_Dual','TV_Contrast_Scene_Mag','none','none'],
 'AGM-65D':[59,25,'SC','Impact_Delay','Solid_Dual','IIR_Imaging','none','none'],'AGM-65E':[136,40,'PEN','Impact_Delay','Solid_Dual','SAL','none','none'],
 'AGM-65F':[136,40,'PEN','Impact_Delay','Solid_Dual','IIR_Imaging','none','none'],'AGM-65G':[136,40,'PEN','Impact_Delay','Solid_Dual','IIR_Imaging','none','none'],
 'AGM-65H':[59,25,'SC','Impact_Delay','Solid_Dual','TV_CCD','none','none'],'Rb 75':[59,25,'SC','Impact_Delay','Solid_Dual','IIR_Imaging','none','none'],
 'AS-30L':[240,100,'SAP','Impact_Delay','Solid_Dual','SAL','none','none'],'Kh-25ML':[90,40,'HE_Frag','Impact_Delay','Solid','SAL','none','none'],
 'Kh-29L':[320,116,'PEN','Impact_Delay','Solid','SAL','none','none'],'Kh-29T':[320,116,'PEN','Impact_Delay','Solid','TV_Contrast','none','none'],
 'Kh-29TD':[320,116,'PEN','Impact_Delay','Solid','IIR_Imaging','none','none'],'Kh-38MT':[250,100,'PEN','Impact_Delay','Solid_Dual','IIR_Imaging','INS','none'],
 'Kh-59MK':[320,130,'HE_Frag','Impact','Solid_Booster_Turbojet','TV_Contrast','INS','TV_Command_Link'],
 'Kh-59MK2':[315,130,'PEN','Impact_Delay','Solid_Booster_Turbofan','IIR_Imaging','INS_GLONASS','TV_Command_Link'],
 'Kh-31A':[94,40,'SAP','Impact_Delay','Rocket_Ramjet','ARH_Ku','INS','none'],'Kh-31AD':[94,40,'SAP','Impact_Delay','Rocket_Ramjet','ARH_Ku','INS','none'],
 'Kh-35U':[145,60,'SAP','Impact_Delay','Solid_Booster_Turbojet','ARH_Ku','INS','none'],'Kh-35D':[145,60,'SAP','Impact_Delay','Solid_Booster_Turbojet','ARH_Ku','INS','none'],
 'P-800':[250,110,'SAP','Impact_Delay','Solid_Booster_Ramjet','ARH_Ku','INS','none'],'BrahMos-A':[300,130,'SAP','Impact_Delay','Solid_Booster_Ramjet','ARH_Ku','INS_GPS','none'],
 'KAB-500Kr':[195,195,'HE_Blast','Impact_Delay','None_Glide','TV_Contrast','none','none'],'KAB-1500Kr':[1100,660,'PEN','Impact_Delay','None_Glide','TV_Contrast','none','none'],
 'AM39 Exocet':[165,70,'SAP','Impact_Delay','Solid_Dual','ARH_J','INS','none'],'Rb 04E':[300,100,'SAP','Impact_Delay','Solid_Dual','ARH_Ku','INS','none'],
 'Rb 15F':[200,80,'SAP','Impact_Delay','Solid_Booster_Turbojet','ARH_Ku','INS','none'],'YJ-82':[165,70,'SAP','Impact_Delay','Solid_Booster_Turbojet','ARH_Ku','INS','none'],
 'YJ-83K':[165,70,'SAP','Impact_Delay','Solid_Booster_Turbojet','ARH_Ku','INS','none'],'KD-88':[205,90,'HE_Frag','Impact','Solid_Booster_Turbojet','TV_IIR','INS_GPS','none'],
 'CM-400AKG':[240,100,'SAP','Impact_Delay','Solid_Dual','ARH_Ku','INS_BeiDou','Datalink_2way'],
 'SCALP-EG':[450,200,'PEN_Tandem','Impact_Delay_Void_Sensing','Solid_Booster_Turbofan','IIR_Imaging','INS_GPS_TERCOM','none'],
 'Taurus':[480,200,'PEN_Tandem','Impact_Delay_Void_Sensing','Solid_Booster_Turbofan','IIR_Imaging','INS_GPS_TERCOM','none'],
 'ASM-2':[150,60,'SAP','Impact_Delay','Solid_Booster_Turbojet','IIR_Imaging','INS','none'],'Sea Eagle':[230,100,'SAP','Impact_Delay','Turbojet','ARH_Ku','INS','none'],
 'Brimstone':[6.2,2,'Tandem_HEAT','Impact','Solid','ARH_MMW','none','none'],'Vikhr':[8,3,'Tandem_HEAT','Impact','Solid','Laser_Beam_Riding','none','none'],
 'AGM-84D':[221,100,'PEN','Impact_Delay','Turbojet','ARH_Ku','INS','none'],
 'AGM-45A':[66,25,'Frag_Preformed','Proximity_Radio','Solid','PRH','none','none'],'AGM-88B':[66,25,'Frag_Preformed','Proximity_Laser','Solid_Dual','PRH','INS','none'],
 'AGM-88C':[66,25,'Frag_Preformed','Proximity_Laser','Solid_Dual','PRH','INS','none'],'AGM-88E':[66,25,'Frag_Preformed','Proximity_Laser','Solid_Dual','PRH_MMW_GPS','INS_GPS','Datalink_Rx'],
 'AS-37 Martel':[150,60,'Frag_Preformed','Proximity_Radio','Solid','PRH','none','none'],'Kh-58U':[149,60,'Frag_Preformed','Proximity_Radio','Solid','PRH','INS','none'],
 'Kh-31P':[87,35,'Frag_Preformed','Proximity_Radio','Rocket_Ramjet','PRH','INS','none'],'Kh-31PD':[87,35,'Frag_Preformed','Proximity_Radio','Rocket_Ramjet','PRH','INS','none'],
 'YJ-91':[90,35,'Frag_Preformed','Proximity_Radio','Rocket_Ramjet','PRH','INS','none'],'ALARM':[45,18,'Frag_Preformed','Proximity_Radio','Solid','PRH','INS','none']};
const isMissile=a=>a&&(a.k==='agm'||a.k==='arm');
function SPECAG(k,a){
  const x=X[k]||[a.mass*.3,a.mass*.12,'HE_Frag',a.k==='arm'?'Proximity_Radio':'Impact_Delay',a.dv?'Solid':'None_Glide',a.k==='arm'?'PRH':a.seek==='IR'?'IIR_Imaging':a.seek==='ARH'?'ARH_Ku':a.seek==='TV'?'TV_Contrast':'none','none','none'];
  const [whK,exK,wt,fz,mot,sk,nv,dl]=x,m0=a.mass,L=a.L||3,dia=(a.R||.1)*2,S=Math.PI*a.R*a.R,tb=Math.max(.5,a.burn||4),dv=a.dv||0;
  const ram=/Ramjet/.test(mot),jet=/Turbo/.test(mot),glide=mot==='None_Glide',isp=ram?900:jet?2500:240;
  const mp=glide?0:jet?m0*.2:Math.min(m0*.45,m0*(1-Math.exp(-dv/(isp*G)))),mbo=m0-mp,Tb=glide?0:jet?m0*3.2:m0*dv/tb,arm=a.k==='arm',asm=!!a.as,ir=/IIR|TV_IIR/.test(sk),tv=/^TV/.test(sk),sal=sk==='SAL',arh=/^ARH/.test(sk),prh=/^PRH/.test(sk),
        gps=/GPS|GLONASS|BeiDou/.test(nv),ins=/INS/.test(nv),terc=/TERCOM/.test(nv),big=m0>600,heavyWh=/PEN/.test(wt),prox=/Proximity/.test(fz);
  const life=a.life||Math.max(30,((a.range||20000)/Math.max(250,(a.mach?a.mach*300:dv+200)))*1.4);
  return {
  // 01 hardware / pre-launch
  parentVelocityVector:null,parentAngularVelocityVector:null,
  railEjectionForce:big?m0*3/.15:m0*6/.1,railEjectionVector:big?'down (-aircraft up)':'forward (aircraft nose)',gasPistonStrokeLength:big?.25:0,
  latchReleaseForceThreshold:m0*G*2.5,ejectionDelayTime:big?.12:.04,armDelayTime:arm?1.2:asm?2.5:Math.max(.6,Math.min(2,whK/200+.8)),
  totalMassCurrent:m0,dryMass:mbo,centerOfMassInitial:L*.48,centerOfMassCurrent:L*.48,
  momentOfInertiaPitch:m0*L*L/12,momentOfInertiaYaw:m0*L*L/12,momentOfInertiaRoll:.5*m0*(dia/2)**2,
  canisterReleasePressure:0,umbrellaDeployDelay:0,hardpointUmbilicalState:true,missileID:0,launchStationIndex:-1,
  preLaunchAlignmentAccuracy:ins?(gps?.4:1.2):2,umbilicalDataTransferRate:gps||ins?1000:56,hangfireTimer:.5,
  hangfireProbability:arm?.006:.004,safeSeparationDistance:big?70:40,
  // 02 propulsion
  boosterThrustForce:Tb,boosterBurnDuration:tb,sustainerThrustForce:0,sustainerBurnDuration:a.sus||0,
  boosterFuelMass:mp,sustainerFuelMass:0,motorSpecificImpulseVacuum:isp*1.09,motorSpecificImpulseSeaLevel:isp,motorType:mot,
  nozzleExitArea:Math.PI*(dia*.36)**2,motorTemperatureCurrent:15,thermalDissipationRate:.03,
  thrustVectorXLimit:0,thrustVectorYLimit:0,thrustVectorSlewRate:0,gasGeneratorPressure:ram?3e6:0,
  smokeTrailDensityMultiplier:jet||ram?.25:.6,interstageSeparationForce:/Booster/.test(mot)||ram?m0*4:0,
  ramjetIntakeArea:ram?Math.PI*(dia*.28)**2:0,ramjetMinMachThreshold:ram?(/Booster/.test(mot)?1.6:1.8):0,
  fuelGrainGeometricProfile:/Dual/.test(mot)?'Progressive':'Star_Grain',throttleSettingCurrent:1,exhaustVelocityMuzzle:isp*G,combustionChamberPressure:jet?1.1e6:1.0e7,nozzleErosionRate:.0015,
  // 03 aerodynamics
  referenceArea:S,zeroLiftDragCoefficient:+(.2+.012*L/dia).toFixed(3),inducedDragCoefficientScalar:.8,liftCurveSlope:6,
  canardLiftSlope:/AGM-65|Kh-25|Kh-29|AS-30/.test(k)?2.2:0,tailFinLiftSlope:2.4,
  maxAngleOfAttack:.5*R2D,maxSideslipAngle:.5*R2D,structuralGForceLimit:a.maxG||10,finDeflectionLimitMax:25,finActuatorTorqueLimit:big?260:110,finActuatorSlewRate:250,
  rollStabilizationGain:.6,parasiticDragFins:.0014,waveDragMachCurve:[.8,1,.9,1.25,1,1.9,1.2,1.75,1.4,1.62],bodyReynoldsNumber:0,skinTemperatureKinetic:15,chordLengthReference:dia*2,
  staticMargin:.07*L,pitchDampingDerivative:-9,yawDampingDerivative:-9,rollDampingDerivative:-.4,transonicBuffetingMultiplier:1.1,finAsymmetryImbalance:.004,
  // 04 environment (live values go to k.st)
  ambientAirDensity:1.225,localSpeedOfSound:340,currentMachNumber:0,ambientAirTemperature:15,dynamicPressure:0,windVectorForce:null,downdraftThermalMultiplier:0,
  barometricPressurePressure:101325,cloudWaterContentDensity:0,humidityAttenuationFactor:ir?.14:tv?.1:arh||prh?.03:.02,
  groundMultipathReflectance:arh?.5:0,solarBlindingAzimuth:null,ionosphericScintillation:gps?.02:0,terrainElevationAtFootprint:0,
  // 05 seeker
  seekerType:sk,seekerAngleTracking:arh||prh?'Monopulse':ir?'Focal_Plane_Array':tv?'Correlation_Tracker':sal?'Quadrant_Detector':'Beam_Rider',
  seekerFieldOfViewDeg:a.fov?a.fov[0]:a.cone?a.cone*2:0,seekerLockRange:a.lockR||0,seekerLockOnAfterLaunch:!!(a.lockR&&!ins),
  gimbalSlewRateMax:(arm?40:25),instantaneousBoresightAngle:0,seekerCooledStatus:ir,
  coolantType:ir?'N2_bottle':'none',coolantGasQuantityRemaining:ir?life:Infinity,
  minimumRadarCrossSection:arh?(asm?500:10):prh?0:0,receiverNoiseFloor:arh?-108:prh?-90:0,antennaGainPattern:arh||prh?[1,.97,.88,.74,.56,.37,.2,.08,.02]:null,
  opticalContrastThreshold:tv?.18:ir?.1:0,lensFoggingFactor:0,rangeGateMin:arh?400:100,rangeGateMax:a.lockR||a.range||20000,
  seekerScanPatternType:arh?'Raster':ir?'Focal_Plane_Array':tv?'Gated_Video':prh?'Interferometer':'Conical_Scan',transmitterOutputPower:arh?(asm?1200:300):0,
  receiverIntermediateFreq:arh||prh?60e6:0,opticalMagnificationFactor:tv||ir?(/E$|F$|G$/.test(k)?6:4):0,domeRefractionIndex:ir?1.74:1.0012,uncooledThermalNoiseScalar:ir?3:1,activeLaserPulseRepetitionID:sal?1688:0,
  seekerBandCoverageGHz:prh?(arm?[0.8,20]:[1,18]):arh?[8,18]:null,seekerBearingAccuracyDeg:prh?(k==='AGM-88E'?.4:1.5):.3,
  // 06 signal processing / ECCM
  flareRejectionThreshold:ir?.6:0,chaffRejectionFactor:arh?(asm?.8:.6):0,dopplerFilterWidth:arh?40:0,sideLobeAttenuatorLevel:arh||prh?-24:0,
  burnThroughRangeThreshold:arh?9000:0,homeOnJamCapable:prh||sk==='ARH_J',frequencyHoppingRate:arh?600:0,
  targetMemoryHoldTime:arm?(a.mem?600:0):ir||tv?4:0,clutterRejectionCoeff:arh?.75:.4,glintSuppressionGain:arh?.5:.2,jammingSignalToNoiseRatio:0,
  crossEyeJammingVulnerability:prh?.5:.2,twoColorIRRatioTolerance:ir?.1:0,velocityGateSize:arh?40:0,leadingEdgeTrackerBias:arh&&asm?.4:0,terrainMaskingSensitivity:.6,
  gpsJamResistanceDb:gps?(/E$/.test(k)?42:32):0,gpsSignalJamMargin:gps?(/E$/.test(k)?42:32):0,
  // 07 guidance
  guidanceLawProfile:terc?'TERCOM_Then_Terminal_Image_Match':a.loft?'Lofted_Prop_Nav':'Proportional_Nav',proportionalNavConstant:a.nav||3.5,loftAngleInitial:(a.loft||0)*R2D,loftTerminalDropRange:a.lmax||0,
  midcourseUpdateFrequency:dl!=='none'?1:0,datalinkChannelID:0,datalinkType:dl,activeRadarActivationRange:arh?(a.lockR||15000):0,terminalGuidanceDelay:arh?.4:0,
  leadBiasScalar:asm?.05:0,insDriftRatePerHour:ins?(gps?5:1850):0,gpsSignalLockState:false,kalmanFilterStateCovariance:null,targetAccelerationEstimation:0,
  timeToGoCalculated:0,optimalInterceptPointVector:null,waypointIndexCurrent:0,navigationSource:nv,
  // 08 fuzing / warhead
  proximityFuzeRadius:prox?(a.fuze||12):0,proximityLaserBeamCount:/Laser/.test(fz)?4:0,proximityConeAngle:prox?70:0,fuzeType:fz,
  fuzeDynamicDelayTime:0,fuzeDelayTime:/Delay/.test(fz)?(heavyWh?.012:.006):0,backupImpactFuzeSensitivity:3e4,
  explosiveMassTNTequiv:exK*1.35,warheadMass:whK,warheadType:wt,
  blastOverpressureRadiusInner:1.1*Math.cbrt(exK*1.35)*1.4,blastOverpressureRadiusOuter:3.2*Math.cbrt(exK*1.35)*1.4,
  fragmentationCount:wt==='Frag_Preformed'?Math.round(whK*350):wt==='HE_Frag'?Math.round(whK*180):0,fragmentationVelocityInitial:1900,
  fragmentationMassAverage:wt==='Frag_Preformed'?(whK-exK)*1000/Math.max(1,whK*350):wt==='HE_Frag'?(whK-exK)*1000/Math.max(1,whK*180):0,
  continuousRodExpansionMax:0,focusedBlastAngleBias:wt==='Frag_Preformed'?.35:0,closureSpeedThresholdFuze:0,directionalWarheadSlewAngle:0,
  armorPenetrationDepthRHA:/PEN/.test(wt)?.45:wt==='SC'||wt==='Tandem_HEAT'?.6:wt==='SAP'?.12:0,
  fuzeMisfireProbability:.01,incendiaryPayloadPercentage:/SAP|HE_Blast/.test(wt)?.08:0,
  // 09 power / limits
  thermalBatteryLifeMax:life,thermalBatteryCurrentLife:life,onboardComputerCycleRate:ins||ir||tv||arh?100:20,structuralIntegrityHealth:1,flightDurationTimer:0,
  maximumFlightDurationLimit:life,minimumVelocityDestructLimit:Math.max(60,(a.v||0)*.3),selfDestructCommandReceived:false,wireSpoolLengthRemaining:0,
  hydraulicFluidVolume:big?1:0,voltageDropTolerance:.15,squibActivationState:false,altimeterFailSafeOverride:true};}
for(const [k,a] of Object.entries(AGW))if(isMissile(a)&&!a.spec){try{a.spec=SPECAG(k,a);}catch(e){console.warn('[agspec]',k,e);}}
window.AGSPEC={SPECAG,X,def(w){const a=AGW[w];if(!isMissile(a))return null;if(!a.spec)a.spec=SPECAG(w,a);return a;},
  live(w){const P=typeof player!=='undefined'?player:null;if(!P||!GND.mavs)return null;for(let i=GND.mavs.length-1;i>=0;i--){const k=GND.mavs[i];if(k.w===w&&k.src===P)return k;}return null;}};

/* ---- flight effects: wrap the A/G missile step ---- */
const _v0=new V3(),_w=new V3();
{const _f=GND.flyMavs;
GND.flyMavs=function(dt){
  const L=this.mavs;if(!L.length)return _f.call(this,dt);
  const pre=[];
  for(const k of L){const a=k.a;if(!isMissile(a)){continue;}
    const s=a.spec||(a.spec=SPECAG(k.w,a));
    if(!k.st){k.st={missileID:k.id||0,thermalBatteryCurrentLife:s.thermalBatteryLifeMax,coolantGasQuantityRemaining:s.coolantGasQuantityRemaining,structuralIntegrityHealth:1,
      parentVelocityVector:k.v.clone(),kalman:null,p0:k.p.clone()};
      k.hang=Math.random()<s.hangfireProbability;
      // a fuze dud is decided at launch: the warhead never goes off (damage zero) but the round still crashes
      if(Math.random()<s.fuzeMisfireProbability){k.dud=true;k.a=Object.assign({},a,{dmg:0,soft:0,hard:0});}}
    pre.push([k,k.v.length(),_v0.copy(k.v).clone()]);}
  _f.call(this,dt);
  for(const [k,V0,v0] of pre){
    if(!this.mavs.includes(k))continue;
    const a=k.w&&AGW[k.w]||k.a,s=a.spec,st=k.st;
    // hang-fire: the motor never lights, the round drops away on its ballistic path
    if(k.hang){k.v.copy(v0);k.v.y-=G*dt;if(k.t>8){k.a=Object.assign({},k.a,{dmg:0,soft:0,hard:0});}}
    const V=Math.max(k.v.length(),1),y=k.p.y,r=rho(y),sc=sos(y),M=V/sc,q=.5*r*V*V,Tk=Math.max(216.65,288.15-.0065*Math.min(y,11000));
    // safe separation: hold the launch line until clear of the launcher
    if(k.src&&k.src.pos&&k.p.distanceTo(k.src.pos)<s.safeSeparationDistance&&k.t<1.5&&!k.hang){_w.copy(v0).normalize();const dv=k.v.clone().sub(v0);const ax=dv.dot(_w);dv.addScaledVector(_w,-ax);k.v.sub(dv.multiplyScalar(.85));}
    // nozzle erosion trims the thrust gained this step
    if(k.t>.25&&k.t<.25+(a.burn||0)&&!k.hang){const gain=V-V0;if(gain>0)k.v.addScaledVector(_w.copy(k.v).normalize(),-gain*s.nozzleErosionRate*(k.t));}
    // ramjet intake flame-out: below the minimum Mach the sustainer thrust is lost (the ramjet code adds back drag + a little, so remove it)
    if(a.ramjet&&s.ramjetMinMachThreshold&&k.t>=.15+(a.burn||0)&&k.t<.25+(a.burn||0)+(a.sus||0)&&M<s.ramjetMinMachThreshold){
      const vd=_w.copy(k.v).normalize(),drag=(a.kd||1.8e-5)*r/1.225*V*V;k.v.addScaledVector(vd,-drag*dt*1.2);st.ramjetFlameout=true;}
    else st.ramjetFlameout=false;
    // thermal battery: brown-out in the last 3 % of its life ends seeker tracking, then the round self-destructs when it expires
    st.thermalBatteryCurrentLife=Math.max(0,s.thermalBatteryLifeMax-k.t);
    if(st.thermalBatteryCurrentLife<s.thermalBatteryLifeMax*.03&&k.tgt&&!k.brown){k.brown=true;k.tgt=null;}
    if(isFinite(st.coolantGasQuantityRemaining)){st.coolantGasQuantityRemaining=Math.max(0,st.coolantGasQuantityRemaining-dt);if(st.coolantGasQuantityRemaining<=0&&k.tgt&&Math.random()<dt*.5)k.tgt=null;}
    const burnt=(a.burn?clamp(k.t/Math.max(a.burn,.5),0,1):1),Lm=a.L||3,m=a.mass-(s.boosterFuelMass+s.sustainerFuelMass)*burnt*(a.burn<200?1:clamp(k.t/a.burn,0,1));
    Object.assign(st,{flightDurationTimer:k.t,totalMassCurrent:m,centerOfMassCurrent:Lm*(.48-.05*burnt),momentOfInertiaPitch:m*Lm*Lm/12,momentOfInertiaYaw:m*Lm*Lm/12,
      staticMargin:s.staticMargin*(1-.4*burnt),ambientAirDensity:r,localSpeedOfSound:sc,currentMachNumber:M,dynamicPressure:q,ambientAirTemperature:Tk-273.15,
      barometricPressurePressure:r*287.05*Tk,skinTemperatureKinetic:Tk*(1+.2*.88*M*M)-273.15,bodyReynoldsNumber:r*V*Lm/1.79e-5,
      motorTemperatureCurrent:k.t<.25+(a.burn||0)?2400:Math.max(15,(st.motorTemperatureCurrent||15)*(1-s.thermalDissipationRate*dt)),
      throttleSettingCurrent:k.t<.25+(a.burn||0)+(a.sus||0)?1:0,hangfire:!!k.hang,terrainElevationAtFootprint:groundAt(k.p.x,k.p.z),
      instantaneousBoresightAngle:k.tgt?k.v.angleTo(_w.copy(k.tgt.pos).sub(k.p))*R2D:0,
      timeToGoCalculated:k.tgt?k.p.distanceTo(k.tgt.pos)/V:0,optimalInterceptPointVector:k.tgt?k.tgt.pos:k.aim||null,jammingSignalToNoiseRatio:0,squibActivationState:true,
      insDriftNowM:s.insDriftRatePerHour*k.t/3600,gpsSignalLockState:/GPS|GLONASS|BeiDou/.test(s.navigationSource)});}
};}
}());
