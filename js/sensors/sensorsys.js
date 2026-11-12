/* =====================================================================================================================
   v268 — sensor registry sections 13, 15, 16 and 18 (display, IFF / NCTR / datalink, fire-control link, AI radar behaviour).
   Display levels are two-way with the FCR scope settings; IFF, NCTR and the datalink read and drive their own modules; the fire-control
   values come from the game's own launch envelope (dlz) and missile table. Loads after sensorpulse.js.
   ===================================================================================================================== */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'){console.warn('[sensorsys] fuse missing');return;}
const Q=F.Q,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),D=Math.PI/180,R=180/Math.PI,NM=1852;
const _v=new THREE.Vector3(),_w=new THREE.Vector3();

F.onSeed.push(function(r,j){const pulse=!!j.ac.pulse;
  Object.assign(r,{displayType:pulse?'B_Scope':'B_Scope',displayResolutionPx:[512,512,0],displayRefreshRateHz:60,displayPersistenceS:pulse?2.5:1,displayBlipFadeCurve:[[0,1],[1,.6],[4,.1]],displayBlipSizePx:7,displayBlipSizeByQuality:[[0,4],[.5,7],[1,9]],
    displayBlipShapeByIdentity:'Diamond',displayBlipColorFriend:'#5be1ff',displayBlipColorFoe:'#ff5a4a',displayBlipColorUnknown:'#ffd24a',displayBlipColorLocked:'#ffffff',displayBlipColorMemory:'#8a8a8a',displayBlipColorGhost:'#ff4fd8',
    displayBlipFlashRateHz:3,displayVelocityVectorLength:.25,displayVelocityVectorEnabled:true,displayAltitudeLabelEnabled:true,displayAltitudeUnits:j.ac.cockpit==='fulcrum'?'Meters':'Hundreds_Of_Feet',displayHeadingLabelEnabled:true,
    displayRangeRingsEnabled:true,displayAzimuthTicksEnabled:true,displayScanSweepLineEnabled:true,displayScanSweepTrailLength:.5,displayBarIndicatorEnabled:true,displayElevationCaretEnabled:true,displayNoiseVisualEnabled:true,displayNoiseIntensity:.15,
    displayClutterVisualEnabled:true,displayClutterIntensity:.3,displayJamStrobeEnabled:true,displayJamStrobeColor:'#ff4fd8',displayGhostTargetsVisible:true,displayAcmReticleEnabled:true,displayMemoryBlipStyle:'Hollow',displayHookedTrackInfoBox:true,
    displayDataBoxFields:['range','closure','altitude','heading','ID'],displayLaunchEnvelopeEnabled:true,displayRangeCaretEnabled:true,displayAspectCaretEnabled:true,displayCrtGlowEnabled:true,displayScanlinesEnabled:false,displayFontName:'B612 Mono',displayFontSizePx:12,displayFreezeFlag:false,
    ctrlRadarPowerKey:'',ctrlModeCycleKey:'5',ctrlRangeUpKey:']',ctrlRangeDownKey:'[',ctrlAzimuthScaleKey:'Z',ctrlBarScaleKey:'N',ctrlAntennaElevUpKey:'=',ctrlAntennaElevDownKey:'-',ctrlAntennaElevStepDeg:1,ctrlCursorSlewAxisX:'J/L',ctrlCursorSlewAxisY:'I/K',ctrlCursorSlewSensitivity:1,
    ctrlLockKey:'Enter',ctrlUnlockKey:'U',ctrlNextTargetKey:'Tab',ctrlPrevTargetKey:'Shift+Tab',ctrlTwsToggleKey:'5',ctrlSamToggleKey:'',ctrlAcmModeKey:'T',ctrlEcmToggleKey:'7',ctrlEmconToggleKey:'',ctrlIffInterrogateKey:'',ctrlFreezeKey:'',ctrlDeclutterKey:'',ctrlGamepadMapping:[],
    ctrlMobileTouchEnabled:true,ctrlMobileCursorDragEnabled:true,ctrlMouseCursorEnabled:true,ctrlHotasThrottleSlew:true,ctrlInputLatencyMs:0,
    iffEnabled:true,iffInterrogateRangeM:110000,iffResponseTimeS:1.5,iffReplyProbability:.9,iffSpoofChance:.04,iffTransponderOn:true,iffTransponderEmconOff:false,iffInterrogationLpiPenalty:.3,
    nctrEnabled:false,nctrRangeM:60000,nctrTimeToIdS:6,nctrAccuracy:.85,nctrAspectRequirement:'Head_On',visualIdRangeM:6000,datalinkEnabled:false,datalinkRangeM:200000,datalinkUpdateRateHz:2,datalinkLatencyS:.5,datalinkPacketLossRate:.03,datalinkTrackSharingMax:20,
    datalinkJamSusceptibility:.3,datalinkSilentRadarUseOk:true,awacsSupportEnabled:false,awacsPictureUpdateIntervalS:12,awacsCoverageRangeM:400000,awacsBraaCallEnabled:true,
    fcsEnabled:true,fcsLaunchDelayS:.2,fcsMissileUplinkRateHz:2,fcsMissileUplinkRangeM:90000,fcsLaunchWarningToRwr:true,fcsGunSolutionEnabled:true,fcsAutoLaunchEnabled:false,fcsGunRadarRangingOnly:false,
    aiRadarDoctrine:'Always_On',aiRadarSkillLevel:.6,aiRadarNotchResponseSkill:.5,aiRadarJamResponseSkill:.5,aiRadarSpikeReactionDelayS:2,aiRadarLockHoldPersistence:.6,aiRadarSearchSectorCenterDeg:0,aiRadarSearchSectorWidthDeg:120,aiRadarSearchElevationBias:0,
    aiRadarBogeyDeclareRangeM:40000,aiRadarCommitRangeM:30000,aiRadarShootRangeFraction:.7,aiRadarFuseWithIRST:true,aiRadarPlayerSpikeAwareness:true,aiRadarEmconResumeDelayS:20,aiRadarPrefersTws:true,aiRadarLaunchOnTrackOnly:true,aiRadarGroupSharesTracks:true});
  F.ai0=.6;});

/* ---------- 13 display (levels two-way with the FCR settings) ---------- */
F.binds.push(['displayBrightnessLevel',()=>sys.fcr.int,v=>{sys.fcr.int=cl(+v,0,1);}],['displayContrastLevel',()=>sys.fcr.con,v=>{sys.fcr.con=cl(+v,0,1);}],['displayGainLevel',()=>sys.fcr.gain,v=>{sys.fcr.gain=cl(+v,0,1);}],
  ['nctrEnabled',()=>!!NCTR.on,v=>{NCTR.on=v?1:0;}]);
F.mod('s13',5,(r,c)=>{r.displayRangeRingSpacing=radar.ranges[radar.ri]*radar.unit/4;r.displayAltitudeUnits=c.P.ac.cockpit==='fulcrum'?'Meters':'Hundreds_Of_Feet';r.displayRefreshRateHz=60;
  r.displayFreezeFlag=r.radarFailureMode==='Intermittent'&&F._arc>0;r.displayNoiseIntensity=cl(.1+(radar.hoj?.5:0)+(radar.on()?0:.4),0,1)*(.5+(1-r.displayGainLevel)*0);
  r.displayClutterIntensity=cl(r.groundClutterLevelDb>-25?.6:.2,0,1);r.displayScanSweepTrailLength=r.displayPersistenceS*.2;r.displayVelocityVectorEnabled=radar.mode!=='ACM';});

/* ---------- 15 IFF, NCTR, datalink ---------- */
F.mod('s15',5,(r,c)=>{const st=typeof IFF!=='undefined'?IFF.st:null;if(st){r.iffEnabled=st.pwr!=='OFF';r.iffTransponderOn=st.pwr==='NORM'||st.pwr==='EMER';r.iffModeCodeCurrent=parseInt(st.c3,10)||0;r.iffModeCodeFriendly=parseInt(IFF.DAY.m3,10)||0;}
  r.nctrTimeToIdS=NCTR.p>0&&NCTR.p<1?NCTR.p:r.nctrTimeToIdS;r.datalinkEnabled=typeof DL!=='undefined'&&(DL.base||DL.on).call(DL);
  if(r.datalinkEnabled){const m=DL.mates();r.datalinkSourceAircraftID=m.length?m[0].id||0:0;}
  r.awacsSupportEnabled=typeof game!=='undefined'&&game.scen==='CAMP';});
// the module switches follow the registry
F.mod('fx-iff',5,(r,c)=>{if(typeof IFF==='undefined')return;const st=IFF.st;
  if(Q.iffTransponderEmconOff&&Q.emconState==='Silent'){if(!F._xp){F._xp=st.pwr;}st.pwr='STBY';}else if(F._xp){st.pwr=F._xp;F._xp=null;}});
{const _o=DL.on;DL.base=_o;DL.on=function(){const o=_o.call(this);if(!F.on||!F.reg)return o;return o&&(Q.datalinkEnabled!==false);};}

/* ---------- 16 fire-control link (the game's own launch envelope) ---------- */
const NAME={GUN:'Guns'};const typeOf=w=>{if(w==='GUN'||!w)return 'Guns';if(/AIM-?9|Magic|Sidewinder|AIM-?9/i.test(w))return 'AIM9';if(/AIM-?120|AIM-?54|AIM-?7|Sparrow|Phoenix/i.test(w))return 'AIM120';if(/R-?73|R-?60|AA-?2|R-?3/i.test(w))return 'R73';if(/R-?27|R-?40|R-?33|R-?77|R-?24/i.test(w))return 'R27';return null;};
F.mod('s16',5,(r,c)=>{const P=c.P,w=game.wsel,d=MSL[w],T=c.L||(radar.bugOK&&radar.bugOK()?radar.bug:null)||c.pt,t=typeOf(w);if(t&&SENSOR_REG.enumOptions('fcsMissileSelectedType').indexOf(t)>=0)r.fcsMissileSelectedType=t;
  r.fcsMissileCountReady=P.count?P.count(w):0;r.fcsMissileSeekerCooledState=true;r.fcsMissileSemiActiveRequired=!!(d&&d.seek==='SARH');r.fcsMissileUplinkEnabled=!!(d&&(d.seek==='ARH'||d.seek==='SARH'));
  r.fcsMissileIlluminationPower=r.fcsMissileSemiActiveRequired?1:0;r.fcsMissileActiveGoRange=d&&d.pit?d.pit:0;r.fcsMissileSupportRequiredS=d&&d.seek==='SARH'?30:d&&d.seek==='ARH'?8:0;
  let lost=false;if(typeof missiles!=='undefined')for(const m of missiles)if(m.alive&&m.sh===P&&!m.active&&m.def&&m.def.seek==='SARH'&&!c.L)lost=true;r.fcsMissileSupportLostFlag=lost;
  r.fcsSolutionValid=false;r.fcsLaunchAuthorized=false;r.fcsReleaseCueActive=false;
  if(T&&T.alive){const a=radar.ang(T.pos);_v.copy(T.pos).sub(P.pos).normalize();
    if(d&&typeof dlz==='function'){let e=null;try{e=dlz(w,T);}catch(x){}if(e){r.fcsMissileMaxRangeM=e.rmax;r.fcsMissileNoEscapeRangeM=e.rne;r.fcsMissileMinRangeM=e.rmin;r.fcsMissileRangeCurve=[[0,e.rmax],[90,e.rmax*.6],[180,e.rmax*.35]];
      r.fcsSolutionValid=a.d>e.rmin&&a.d<e.rmax;let tt=0;if(e.prof)for(const q of e.prof){if(q[1]>=a.d){tt=q[0];break;}}r.fcsTimeToImpactEstimateS=tt;
      r.fcsLaunchAuthorized=r.fcsSolutionValid&&r.fcsMissileCountReady>0&&(typeof IFF==='undefined'||!IFF.known(T))&&(radar.mode==='STT'||radar.mode==='TWS'&&radar.bugOK()||d.seek==='IR');r.fcsReleaseCueActive=r.fcsLaunchAuthorized;
      r.fcsLaunchEnvelopeAltitudeAdj=e.rmax/Math.max(1,F.fcs0||e.rmax);F.fcs0=F.fcs0||e.rmax;r.fcsLaunchEnvelopeMachAdj=1+.35*Math.min(c.mach,2);_w.copy(T.fwd(new THREE.Vector3()));r.fcsTargetAspectAdj=.5+.5*Math.max(0,_v.dot(_w)*-1);}}
    if(w==='GUN'){const v=1050,rel=T.vel.clone().sub(P.vel),perp=rel.clone().sub(_v.clone().multiplyScalar(rel.dot(_v))).length();r.fcsGunRangeM=a.d;r.fcsGunLeadAngleDeg=Math.atan(perp*(a.d/v)/Math.max(a.d,1))*R;r.fcsSolutionValid=a.d<2500;r.fcsReleaseCueActive=r.fcsSolutionValid&&radar.mode==='STT';}}
  else{r.fcsGunRangeM=0;r.fcsGunLeadAngleDeg=0;r.fcsTimeToImpactEstimateS=0;}});

/* ---------- 18 AI radar behaviour: skill sets how fast the AI shoots and counters (0.6 = the game's own pace) ---------- */
F.mod('fx-ai',2,(r,c)=>{const s=cl(Q.aiRadarSkillLevel,0,1),fm=cl(1+(F.ai0-s),.4,2.2),cm=cl(1+(F.ai0-Q.aiRadarJamResponseSkill)*.8,.4,2.2);
  for(const j of jets){if(j===c.P||!j.ai||j.remote)continue;if(j.ai._fm0==null){j.ai._fm0=j.ai.fm;j.ai._cm0=j.ai.cm;}j.ai.fm=j.ai._fm0*fm;j.ai.cm=j.ai._cm0*cm;}});
console.info('[sensorsys] sections 13-16, 18 wired');
})();
