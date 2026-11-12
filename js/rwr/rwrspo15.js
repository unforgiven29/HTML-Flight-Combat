/* =====================================================================================================================
   v270 — SPO-15LM "Beryoza" RHAW model (MiG-29), built from the DCS Fulcrum manual text: an analogue, channel-per-sector warner.
   - six hardwired type lamps (Pi 3 X H F C) decided from pulse width / PRF; emitters outside the stock program light no type lamp
   - search vs track from the length of the detection (125-250 ms); track state belongs to the whole azimuth channel for 2-4 s
   - channels are visited one at a time; two pulse radars in one sector are only separated if they differ by 6 dB (3 levels)
   - power scale in 2 dB steps; B / H elevation channels only at high power; flashing lamp at the engagement-zone power of the type
   - CW circuit: HPRF fighters first appear as a (flashing) X 6-14 dB early; once one is positively identified the CW circuit shuts down
   - own FCR radiating => the whole forward hemisphere is disabled
   - priority: Nike launch (N/I) > track > inside the priority sector > type row (Pi 3 X H F C) > PRF over 781 Hz > strongest
   ===================================================================================================================== */
(function(){
'use strict';
const X=window.RWRX;if(!X||typeof RWR_REG==='undefined'){console.warn('[spo15] RWRX missing');return;}
const r=X.r,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),D=Math.PI/180,R2=180/Math.PI,curve=(t,x)=>{if(!t||!t.length)return 0;if(x<=t[0][0])return t[0][1];for(let i=1;i<t.length;i++)if(x<=t[i][0]){const a=t[i-1],b=t[i],f=(x-a[0])/Math.max(b[0]-a[0],1e-9);return a[1]+f*(b[1]-a[1]);}return t[t.length-1][1];};
const TYPES=['P','3','X','H','F','C'];

X.seedSpo=function(sy,P){if(sy.fam!=='S15')return;Object.assign(r,{
  spoTypeLetters:['P','3','X','H','F','C'],spoTypePriorityOrder:['P','3','X','H','F','C'],spoTypeProgramName:'STOCK',
  spoTypeProgramEntries:[['F-4 (LPRF + CW illuminator)','F-104','Talos','Terrier','Tartar','SM-1','Aegis ships'],['Vulcan','Sea Wolf','Mk 35','AN/SPG-48','AN/SPG-53','short/medium SAM FCR'],['Hawk CWAR/HPIR'],['Nike-Hercules TTR/MTR'],['F-14','F-15','F-16','F/A-18','M-2000'],['F-4','F-5','F-104','Mirage F1','Jaguar','Talos','Terrier','SM-1','surveillance radars']],
  spoTypeRecognizeByPwPrf:true,spoTypePwMinNs:[300,200,0,500,500,500],spoTypePwMaxNs:[3000,2000,0,2500,3000,3500],spoTypePrfMinHz:[250,1500,0,300,10000,250],spoTypePrfMaxHz:[1200,6000,0,1000,300000,1800],
  spoTypeUnknownShowsNoLamp:true,spoFriendlyInProgram:false,spoFriendlyMisidProbability:.03,spoParamOverlapMisidEnabled:true,spoParamOverlapMisidProbability:.4,spoParamOverlapPriorityRule:'higher priority type wins',
  spoPrfJitterBreaksRecognition:true,spoPrfJitterEmitterFraction:.12,spoPrfJitterRecognitionLoss:.6,spoPrfMeasurementNeedsSeparation:true,spoPrfSeparationRequiredDb:6,
  spoSameAzimuthTwoPulseRule:'both recognised only if separated by the required power',spoSameAzimuthMultiPulseRule:'only the strongest, if clear of the rest',
  spoTypeXAmbiguousFlash:true,spoTypeXAmbiguousMaxLevel:0,spoTypePiMeaning:'pulsed FCR with CW illuminator in SA guidance: treat as launch',spoTypePiForCwiGuidance:true,spoTypePiMisidCwSameAzimuth:true,spoTypePiInhibitsXC:true,
  spoTypeCMeaning:'LPRF FCR with CWI disabled, surveillance and other known radars',spoTypeFMeaning:'4th generation HPRF fighter radar',spoTypeHMeaning:'strategic SAM search and fire control',spoTypeXMeaning:'CW and low-power HPRF',spoType3Meaning:'AAA and short/medium SAM FCR',spoRecognitionLatencyMs:80,spoLowPriorityHidesBehindHigh:true,spoThreatFileLoaded:'KNEEBOARD',
  spoAzChannelCountPerSide:4,spoAzChannelLabelsDeg:[10,30,50,90],spoAzChannelEdgesDeg:[20,40,70,110],spoAzRearChannelCount:1,spoAzRearChannelStartDeg:110,spoAzProcessingOrder:'Clockwise_Sequential',spoAzSweepPeriodMs:250,spoAzResolutionLimitedByAntennaCount:true,
  spoAzDirectivityVsFrequency:[[2,-4],[6,-1],[10,0],[14,-1]],spoAzLowFreqMultiSectorEnabled:true,spoAzLowFreqMultiSectorLevel:9,spoAzBlindingLevel:14,spoAzSidelobeFalseTrackEnabled:true,spoAzSidelobeFalseTrackLevel:9,spoAzSidelobeFalseTrackProb:.18,
  spoTrackDetectMinMs:125,spoTrackDetectMaxMs:250,spoTrackPerChannelLatch:true,spoTrackLatchMinS:2,spoTrackLatchMaxS:4,spoTrackLatchOverwrite:true,spoMainThreatMemorySearchMinS:8,spoMainThreatMemorySearchMaxS:12,spoMainThreatMemoryTrackMinS:2,spoMainThreatMemoryTrackMaxS:4,
  spoSearchSwitchPosition:'On',spoSearchSwitchFiltersSearch:true,spoPriorityRules:['Nike launch','Track mode','In priority sector, closest to type row front','Outside priority sector','PRF above 781 Hz','Highest power'],spoPriorityPrfThresholdHz:781,spoPriorityAzRangeDeg:60,spoPriorityElRangeDeg:30,spoPriorityHandoffDelayS:.5,spoMainThreatYellowLights:true,
  spoNikeLaunchDetectEnabled:false,spoNikeLaunchLightHz:2,spoNikeLaunchToneHz:2,
  spoPowerLevelCount:16,spoPowerStepDb:2,spoPowerThresholdDbm:-60,spoPowerPulsedMinLevel:1,spoPowerCwMinLevel:0,spoPowerAzSensitivityDbm:-70,spoPowerSumChannelSensitivityDbm:-55,spoPowerAzOverSumDb:15,spoPowerEngagementByType:[8,6,9,10,10,8],spoPowerEngagementFlashHz:2,spoPowerEngagementConservative:true,spoPowerEngagementErrorLevels:3,
  spoElevationChannelCount:2,spoElevationMutuallyExclusive:true,spoElevationAntennaEfficiencyDb:12,spoElevationMinLevel:9,spoElevationBorderDeg:[[8,12],[11,8],[14,5],[16,3]],spoElevationHysteresisDeg:1.5,spoElevationUpperLabel:'B',spoElevationLowerLabel:'H',
  spoCwChannelEnabled:true,spoCwAdvantageMinDb:6,spoCwAdvantageMaxDb:14,spoCwAlwaysTypeX:true,spoCwHprfDetectedAsX:true,spoCwXAmbiguousFlashHz:3,spoCwShutdownAfterHprfId:true,spoCwShutdownHoldS:6,spoCwDetectsAtLevelZero:true,
  spoOwnRadarInterlockEnabled:true,spoOwnRadarDisabledHalfAngleDeg:90,spoOwnRadarDisabledChannels:['10L','30L','50L','90L','10R','30R','50R','90R'],spoOwnRadarRearActive:true,spoOwnRadarInterlockLatencyMs:150,spoHprfPositiveIdLevel:1,
  spoPanelReadyLamp:true,spoPanelReadyDelayS:5,spoLampAzMainCount:8,spoLampAzThreatCount:8,spoLampRearIndicatorCount:4,spoLampTypeCount:6,spoLampTrackFlashHz:4,spoLampPowerSegments:16,spoLampSilhouette:true,spoLampMainPositionNI:false,spoLampBrightness:.85,spoLampBrightnessMinFrac:.25,spoLampTestAllOn:true,
  spoAudioTrackToneContinuous:true,spoAudioTrackToneHz:1100,spoAudioSearchToneEnabled:false,spoAudioSoundOff:false,spoAudioNikeTone:false,spoBitSwitchPosition:'Neutral',spoBitDurationS:3,spoBitAutoPeriodS:0,spoBitFaultsReported:true,spoBitLastResult:'Not_Run'});
  X.spoS=null;};

// ---- what an emitter is to this warner: type lamp, CW / HPRF behaviour, PRF
const CLS=[[/hawk|cwar|hpir/i,{t:'X',cw:true,prf:0,low:true}],[/nike|hercules/i,{t:'H',prf:700}],
 [/zsu|shilka|tunguska|vulcan|gepard|sea ?wolf|mk ?35|spg-?4|spg-?53|flak|pantsir|phalanx|2k22|tor\b|9k331|osa|kub|surn|1s91|strela|roland/i,{t:'3',prf:2400}],
 [/aegis|ddg|burke|perry|ffg|tartar|terrier|talos|sm-?1|ticonderoga|cg-?4/i,{t:'P',prf:800,cwi:true}],
 [/patriot|mpq-?53/i,{t:null,mis:'F',prf:3000,hprf:true}],[/s-?300|30n6|sa-?10|sa-?20|buk|sa-?11/i,{t:null,mis:'H',prf:2200,hprf:true}],
 [/slava|cruiser|molniya|boat|corvette|frigate|ship/i,{t:'C',prf:1000}]];
function classify(t){const j=t.j,e=t.e,nm=(j.T&&j.T.n)||(j.ac&&(j.ac.name||j.ac.n))||j.type||'';
  if(!e.g){const pd=e.pd;let c;if(pd)c={t:'F',prf:30000,hprf:true,fighter:true};else{const sg=typeof missiles!=='undefined'&&missiles.some(m=>m.alive&&m.sh===t.j&&m.track===player&&m.def&&m.def.seek==='SARH');c={t:sg?'P':'C',prf:1200,fighter:true,cwi:sg};}return c;}
  for(const [re,c] of CLS)if(re.test(nm))return c;return{t:null,prf:1500};}

function fresh(){return{ch:[[...Array(5)].map(()=>({lat:0,view:null,on:0,trk:0,main:0,lvl:0,cnt:0})),[...Array(5)].map(()=>({lat:0,view:null,on:0,trk:0,main:0,lvl:0,cnt:0}))],ptr:0,ptrT:0,main:null,mainT:0,mainTrk:false,cwOff:0,types:[0,0,0,0,0,0],mainType:-1,track:false,lvl:0,eng:-1,elev:'',pi:false,ready:false,rt:0,last:-9,bit:0,out:null};}
const secOf=a=>{const A=Math.abs(a)*R2;return[a<0?0:1,A<20?0:A<40?1:A<70?2:A<110?3:4];};
const rnd=(a,b)=>a+Math.random()*(b-a);

// detection range gain of the CW channel for HPRF emitters (6-14 dB, fixed per emitter), applied through rangeMul
X.cwBoost=function(j,e){if(!r.spoCwChannelEnabled)return 1;const hp=e.pd&&!e.g||(j._spoHp===true);if(!hp)return 1;if(j._spoAdv===undefined)j._spoAdv=rnd(r.spoCwAdvantageMinDb,r.spoCwAdvantageMaxDb);return Math.pow(10,j._spoAdv/20);};

X.spo15=function(list,P,dt){const S=X.spoS||(X.spoS=fresh()),clk=RW.clk;if(!(dt>0))dt=.033;
  // ready lamp and BIT
  S.ready=(clk-(X.pwrT<0?-99:X.pwrT))>=r.spoPanelReadyDelayS;
  const test=typeof sys!=='undefined'&&sys.rwr&&(performance.now()/1000<sys.rwr.testT);if(test&&S.bit===0){S.bit=1;r.spoBitLastResult=X.flt?'Fail':'Pass';}if(!test)S.bit=0;
  // own FCR radiating: the forward hemisphere is switched off (HPRF signals of the MiG-29's own radar would saturate it)
  const rad=typeof radar!=='undefined'&&radar.on&&radar.on()&&radar.sensor==='RDR',half=r.spoOwnRadarDisabledHalfAngleDeg*D;
  if(rad&&!S.radOn)S.radT=clk;S.radOn=rad;const act=r.spoOwnRadarInterlockEnabled&&rad&&clk-(S.radT||0)>=r.spoOwnRadarInterlockLatencyMs/1000;r.spoOwnRadarInterlockActive=!!act;
  const con=[];
  for(const t of list){const rc=RW.recs.get(t.j);if(!rc||t.ghost)continue;if(act&&Math.abs(t.a)<half)continue;
    const cls=classify(t),cw=!!cls.cw,adv=t.j._spoAdv||0,hpr=!!(cls.hprf),dB=20*Math.log10(Math.max(rc.R,1)/Math.max(t.d,1)),dBp=hpr&&!cw?dB-(t.j._spoAdv||0):dB;
    const c={t,rc,cls,cw,hpr,dB,dBp,lvl:cl(Math.floor((hpr?dBp:dB)/r.spoPowerStepDb),0,15),sec:secOf(t.a),az:Math.abs(t.a)*R2,trk:t.mode!=='S'||!!cls.cwi};
    // an emitter with an unstable PRF defeats the PRF measurement; out-of-program emitters may overlap with a higher priority one
    if(rc.spoJ===undefined){rc.spoJ=Math.random()<r.spoPrfJitterEmitterFraction;rc.spoM=Math.random()<r.spoParamOverlapMisidProbability;rc.spoL=Math.random()<r.spoPrfJitterRecognitionLoss;}
    let type=cls.t;if(type===null&&cls.mis&&r.spoParamOverlapMisidEnabled&&rc.spoM)type=cls.mis;if(r.spoPrfJitterBreaksRecognition&&rc.spoJ&&rc.spoL&&!cw)type=null;
    // sidelobes of a strong search radar look like a long illumination: false track
    if(!c.trk&&r.spoAzSidelobeFalseTrackEnabled&&c.lvl>=r.spoAzSidelobeFalseTrackLevel){if((rc.spoFtT||0)<clk&&Math.random()<r.spoAzSidelobeFalseTrackProb*dt*2){rc.spoFt=clk+rnd(.6,1.4);rc.spoFtT=clk+t.e.scan;}if((rc.spoFt||0)>clk)c.trk=true;}
    c.type=type;con.push(c);}
  // CW circuit: an HPRF emitter first shows as X (flashing while ambiguous); once it is identified as a pulsed radar the CW circuit shuts down
  let hprfId=false;for(const c of con){if(c.hpr&&!c.cw){if(c.lvl>=r.spoHprfPositiveIdLevel&&c.dBp>=r.spoPowerPulsedMinLevel*r.spoPowerStepDb){c.xAmb=false;hprfId=true;}else{c.type='X';c.xAmb=true;c.lvl=cl(Math.floor((c.dB+0)/r.spoPowerStepDb),0,r.spoTypeXAmbiguousMaxLevel+1);}}}
  if(hprfId&&r.spoCwShutdownAfterHprfId)S.cwOff=clk+r.spoCwShutdownHoldS;r.spoCwShutdownActive=clk<S.cwOff;
  for(let i=con.length-1;i>=0;i--){const c=con[i];if(c.cw&&(clk<S.cwOff||!r.spoCwChannelEnabled))con.splice(i,1);else if(c.cw){c.type='X';c.xAmb=false;}}
  // channels: multi-signal rule on pulse emitters, per-channel track latch, search switch
  const byCh={};for(const c of con){const k=c.sec[0]*5+c.sec[1];(byCh[k]=byCh[k]||[]).push(c);}
  for(const k in byCh){const g=byCh[k],pul=g.filter(c=>!c.cw&&!c.xAmb).sort((a,b)=>b.dB-a.dB);
    if(pul.length===2){if(pul[0].dB-pul[1].dB<r.spoPrfSeparationRequiredDb){pul[0].type=null;pul[1].type=null;}}
    else if(pul.length>2){if(pul[0].dB-pul[1].dB<r.spoPrfSeparationRequiredDb)for(const c of pul)c.type=null;else for(let i=1;i<pul.length;i++)pul[i].type=null;}}
  for(const c of con){const ch=S.ch[c.sec[0]][c.sec[1]];if(c.trk&&r.spoTrackPerChannelLatch)ch.lat=Math.max(ch.lat,clk+rnd(r.spoTrackLatchMinS,r.spoTrackLatchMaxS));}
  for(const c of con)if(r.spoTrackLatchOverwrite&&S.ch[c.sec[0]][c.sec[1]].lat>clk)c.trk=true;
  if(!sys.rwr.srch&&r.spoSearchSwitchFiltersSearch)for(let i=con.length-1;i>=0;i--)if(!con[i].trk)con.splice(i,1);
  r.spoSearchSwitchPosition=sys.rwr.srch?'On':'Off';
  // Pi in the priority position stops X and C from being displayed
  const hasPi=con.some(c=>c.type==='P');if(hasPi&&r.spoTypePiInhibitsXC)for(const c of con)if(c.type==='X'||c.type==='C')c.type=null;
  // priority: track, inside the priority sector, type row, PRF, power
  const rank=c=>[c.trk?0:1,(c.az<=r.spoPriorityAzRangeDeg&&Math.abs(c.t.j.pos.y-P.pos.y)<Math.tan(r.spoPriorityElRangeDeg*D)*c.t.d)?0:1,c.type?r.spoTypePriorityOrder.indexOf(c.type===('P')?'P':c.type):9,c.cls.prf>r.spoPriorityPrfThresholdHz?0:1,-c.dB];
  const cmp=(a,b)=>{const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++){if(x[i]!==y[i])return x[i]-y[i];}return 0;};
  con.sort(cmp);let best=con[0];
  // main threat is remembered: 8-12 s in search, 2-4 s in track
  if(best){S.main=best;S.mainT=clk+(best.trk?rnd(r.spoMainThreatMemoryTrackMinS,r.spoMainThreatMemoryTrackMaxS):rnd(r.spoMainThreatMemorySearchMinS,r.spoMainThreatMemorySearchMaxS));S.mainTrk=best.trk;}
  else if(S.main&&clk>S.mainT)S.main=null;
  const mn=best||(S.main&&clk<=S.mainT?S.main:null);
  // channel lamps: each channel is visited in turn, so a lamp only changes when the sweep reaches it
  const view=[[...Array(5)].map(()=>({on:0,trk:0,main:0})),[...Array(5)].map(()=>({on:0,trk:0,main:0}))];
  for(const c of con){const v=view[c.sec[0]][c.sec[1]];v.on=1;if(c.trk)v.trk=1;
    // low-frequency and very strong emitters light neighbouring channels, the strongest of all of that side
    if(r.spoAzLowFreqMultiSectorEnabled&&c.lvl>=r.spoAzLowFreqMultiSectorLevel&&(c.t.e.g&&c.t.e.R0>40000)){for(const dn of[-1,1]){const k=c.sec[1]+dn;if(k>=0&&k<5)view[c.sec[0]][k].on=1;}}
    if(r.spoAzLowFreqMultiSectorEnabled&&c.lvl>=r.spoAzBlindingLevel&&c.t.e.g&&c.t.e.R0>40000)for(let k=0;k<5;k++)view[c.sec[0]][k].on=1;}
  if(mn){const m=mn.t?secOf(mn.t.a):mn.sec;if(m)view[m[0]][m[1]].main=1;}
  S.ptrT+=dt;const stepT=r.spoAzSweepPeriodMs/1000/10;while(S.ptrT>=stepT){S.ptrT-=stepT;const i=S.ptr%10,sd=i<5?0:1,k=i%5;S.ch[sd][k].view=view[sd][k];S.ptr++;}
  for(let sd=0;sd<2;sd++)for(let k=0;k<5;k++)if(!S.ch[sd][k].view)S.ch[sd][k].view=view[sd][k];
  r.spoChannelContactCount=[].concat(...view.map(a=>a.map(v=>v.on)));r.spoChannelTrackLatchTimer=[].concat(...S.ch.map(a=>a.map(c=>Math.max(0,+(c.lat-clk).toFixed(2)))));
  // type lamps
  S.types=[0,0,0,0,0,0];for(const c of con)if(c.type){const i=TYPES.indexOf(c.type);if(i>=0)S.types[i]=Math.max(S.types[i],c.xAmb?2:1);}
  S.mainType=mn&&mn.type?TYPES.indexOf(mn.type):-1;S.track=con.some(c=>c.trk);S.pi=hasPi;
  // power, elevation, engagement lamp for the main threat
  S.lvl=mn?cl(Math.floor(mn.dB/r.spoPowerStepDb)+1,0,16):0;r.spoPowerLevelMain=S.lvl;
  S.eng=-1;if(mn&&mn.type){const ti=TYPES.indexOf(mn.type),lethal=mn.t.e.lethal||mn.t.e.R0*.9,dl=20*Math.log10(Math.max(mn.rc.R/(mn.hpr&&!mn.cw?(mn.t.j._spoAdv?Math.pow(10,mn.t.j._spoAdv/20):1):1),1)/Math.max(lethal,1));S.eng=cl(Math.floor(dl/r.spoPowerStepDb)+1,0,16);r.spoPowerEngagementLevel=S.eng;r.spoPowerInsideEngagement=S.lvl>=S.eng;if(ti>=0)r.spoPowerEngagementByType[ti]=S.eng;}
  S.elev='';if(mn&&mn.lvl>=r.spoElevationMinLevel&&!mn.cw){const el=Math.atan2(mn.t.j.pos.y-P.pos.y,Math.max(Math.hypot(mn.t.j.pos.x-P.pos.x,mn.t.j.pos.z-P.pos.z),1))*R2,bd=curve(r.spoElevationBorderDeg,mn.lvl)+(S.elevPrev==='B'?-1:S.elevPrev==='H'?1:0)*r.spoElevationHysteresisDeg;r.spoElevationMainDeg=el;
    if(el>bd)S.elev='B';else if(el<-bd)S.elev='H';S.elevPrev=S.elev;}
  r.spoElevationState=S.elev||'None';r.spoLampTrackRed=S.track;r.spoPanelReadyLamp=S.ready;r.spoLampBrightness=sys.rwr.brt;r.spoLampTypeState=S.types.map(v=>v===2?'Flash':v?'On':'Off');r.spoLampTypeMainState=S.types.map((_,i)=>i===S.mainType?'On':'Off');
  S.mn=mn;S.n=con.length;
  // keep only what the warner can show: a list entry per channel (the other code paths read RW.list)
  list.length=0;for(const c of con){c.t.sym=c.type||'U';c.t.lk=c.trk;c.t.mode=c.trk?(c.t.mode==='L'?'L':'T'):'S';list.push(c.t);}
  S.out=S;return S;};

// ---------------- panel (manual fig. 30): Pi 3 X H F C, B/H, power ring, red track light, rear channels, ready light
X.drawSPO15=function(c,S,P,NOW,bl2,fl){const st=X.spoS,pw=sys.rwr.pwr;c.fillStyle='#1b1a17';c.fillRect(0,0,S,S);if(!st)return;
  const test=NOW<sys.rwr.testT||NOW<sys.mig.lamp,A=.3+.7*sys.rwr.brt;c.globalAlpha=A;c.textAlign='center';c.textBaseline='middle';
  const BIG=[[[101,30],[68,44],[44,72],[36,106]],[[139,30],[172,44],[196,72],[204,106]]],SM=[[[108,50],[88,60],[70,82],[62,108]],[[132,50],[152,60],[170,82],[178,108]]];
  c.fillStyle=pw&&st.ready?'#ffcf3a':'#3a3420';c.beginPath();c.moveTo(120,14);c.lineTo(114,30);c.lineTo(126,30);c.closePath();c.fill();             // device ready
  for(let sd=0;sd<2;sd++)for(let i=0;i<4;i++){const[x,y]=BIG[sd][i],v=st.ch[sd][i].view||{},on=test||v.main;c.fillStyle=on?'#ffc230':'#4a3d1c';c.beginPath();c.arc(x,y,11,0,7);c.fill();
    c.fillStyle=on?'#2a1a00':'#7a6a40';c.font='700 11px "B612",sans-serif';c.fillText(['10','30','50','90'][i],x,y+1);
    const[sx,sy]=SM[sd][i];c.fillStyle=test||v.on?'#4dff70':'#1c3322';c.beginPath();c.arc(sx,sy,4,0,7);c.fill();}
  const trk=test||st.track;c.fillStyle=trk?'#ff3424':'#4a1a16';c.beginPath();c.arc(120,104,27,0,7);c.fill();
  c.strokeStyle='#e8e4d8';c.lineWidth=2.5;c.beginPath();c.moveTo(120,78);c.lineTo(120,132);c.moveTo(100,108);c.lineTo(120,98);c.lineTo(140,108);c.moveTo(110,128);c.lineTo(130,128);c.stroke();
  [[96,'B',test||st.elev==='B'],[112,'H',test||st.elev==='H']].forEach(([y,l,on])=>{c.fillStyle=on?'#ffc230':'#5a4a22';c.font='700 12px "B612",sans-serif';c.fillText(l,120,y);});
  const seg=test?16:st.lvl;for(let i=0;i<16;i++){const a=Math.PI*.75+i/15*Math.PI*1.5,eng=st.eng===i+1;c.strokeStyle=eng?(fl?'#ff8a2a':'#6a3a10'):i<seg?'#ffc230':'#4a3d1c';c.lineWidth=3;c.beginPath();c.arc(120,104,42,a-.06,a+.06);c.stroke();}
  [[0,64],[1,176]].forEach(([sd,x])=>{const v=st.ch[sd][4].view||{};c.fillStyle=test||v.on?'#4dff70':'#1c3322';c.beginPath();c.arc(x,136,4,0,7);c.fill();c.fillStyle=test||v.main?'#ffc230':'#4a3d1c';
    c.beginPath();if(sd){c.moveTo(x+9,152);c.lineTo(x-7,143);c.lineTo(x-7,161);}else{c.moveTo(x-9,152);c.lineTo(x+7,143);c.lineTo(x+7,161);}c.closePath();c.fill();});
  const TYP=['Π','3','X','H','F','C'];TYP.forEach((l,i)=>{const x=50+i*28,mn=st.mainType===i,lit=st.types[i];c.fillStyle=test||mn?'#ffc230':'#4a3d1c';c.beginPath();c.ellipse(x,176,10,6,0,0,7);c.fill();
    const on=test||lit===1||(lit===2&&bl2);c.fillStyle=on?'#4dff70':'#2c4a32';c.font='700 13px "B612",sans-serif';c.fillText(l,x,194);});
  c.globalAlpha=1;c.fillStyle='#d8d2c0';c.font='700 10px "B612",sans-serif';c.fillText('TEST',100,206);c.fillText('MAN',78,224);c.fillText('AUTO',124,224);c.fillText('BRIGHT',178,206);
  if(r.spoAudioSoundOff){c.fillStyle='#c8a050';c.fillText('SOUND OFF',44,206);}
  c.fillStyle='#0c0c0b';c.beginPath();c.arc(100,224,8,0,7);c.fill();c.beginPath();c.arc(178,226,11,0,7);c.fill();};
X.spoTone=()=>!!(X.spoS&&X.spoS.track&&r.spoAudioTrackToneContinuous&&!r.spoAudioSoundOff&&r.rwrPowerState==='Operate');
console.info('[spo15] SPO-15LM model wired');
})();
