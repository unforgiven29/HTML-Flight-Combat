/* =====================================================================================================================
   v282 — Modern hangar: the 4th / 4.5 / 5th-generation jets that were still missing.
   Each jet is cloned from the closest existing airframe (so it inherits that family's cockpit, HUD, MFD pages and 3D model
   for now) and then gets its own flight model numbers, radar (mechanical / PESA / AESA), IRST, gun, ECM, stations and loadouts.
   Cockpits and 3D models are placeholders from the parent family until each jet gets its own pass.
   Needs game.js, coldwar-jets.js and pods-maws.js. Figures are from public data; anything never published is an estimate.
   ===================================================================================================================== */
(function(){
'use strict';
const D=D2R,KM=1000;
const ok=w=>!!(MSL[w]||AGW[w]||w==='TK'||w==='PTB');
const uniq=a=>[...new Set(a)].filter(ok);

/* ---------------- 1. new air-to-air missiles (same cloning rule as coldwar.js: motor from mass / burn / acceleration) ---------------- */
function aam(k,base,over,shape,dia,sn,name,ru){if(MSL[k]||!MSL[base])return;const d=Object.assign({},MSL[base],over);delete d.ph;delete d.apn;delete d.spec;
  if(over.apn!==0)d.apn=1;
  const S=Math.PI*dia*dia/4,dv=d.acc*d.burn,mbo=d.mass*Math.exp(-dv/2350),mp=d.mass-mbo,I=mp*2350,tb=d.burn;
  d.ph={S,dia,m0:d.mass,mp,mbo,tb,ts:0,gap:0,Tb:I/tb,Ts:0,mdB:mp/tb,mdS:0,cd0:2.38*d.cd*mbo/S,cnMax:.004*mbo/S*(d.cnK||1)};d.ph.cna=d.ph.cnMax/.38;d.burnT=tb;
  d.rcs=+Math.max(.02,Math.min(.25,.015+d.mass/3500)).toFixed(3);d.irsB=+Math.max(.4,Math.min(2.4,.4+d.mass/400)).toFixed(2);d.irsC=.03;
  MSL[k]=d;SHAPE[k]=shape||SHAPE[base];MDIA[k]=dia;if(!MSL_KEYS.includes(k))MSL_KEYS.push(k);SN[k]=sn;WNAME[k]=name;if(ru)try{RU_WPN[k]=ru;}catch(e){}
  MODERN_ONLY.add(k);}
// a ramjet / dual-pulse round: a short boost, then a long low-thrust sustain (keeps energy at range, which is the whole point of Meteor / PL-15)
function sustain(k,boost,tb,ts,f){const d=MSL[k];if(!d||!d.ph)return;const p=d.ph,I=p.mp*2350;p.tb=tb;p.ts=ts;p.Tb=f*I/tb;p.Ts=(1-f)*I/ts;p.mdB=f*p.mp/tb;p.mdS=(1-f)*p.mp/ts;d.burnT=tb+ts;d.burn=tb+ts;}
const SH=(L,R,f)=>({L,R,f});
function addAAMs(){
  // MBDA Meteor: 190 kg, 178 mm, throttleable ducted rocket (TDR), two-way datalink, no-escape zone ~3x AMRAAM
  aam('Meteor','AIM-120D',{mass:190,acc:42,burn:40,cd:3.1e-5,maxG:40,trk:.95,ccm:.85,hoj:1,loft:.55,life:150,aiR:60000,res:.86,ecc:.8},
    SH(3.65,.089,[[.35,.32,.18],[2.6,.3,.22]]),.178,'MTR','Meteor · ramjet, 2-way link');
  sustain('Meteor',1,3.5,40,.22);
  MSL.Meteor.ramjet={mach:4.0,min:1.8};   // throttled ducted rocket: holds ~M4, flames out below ~M1.8
  // MBDA MICA: 112 kg, 160 mm, TVC (jet vanes), EM = active radar seeker, IR = imaging IR seeker
  aam('MICA EM','AIM-120C',{mass:112,acc:150,burn:4.5,cd:4.4e-5,maxG:50,gimbal:60*D,aiR:24000,life:60,fuse:10,trk:.88,ccm:.7},
    SH(3.1,.08,[[.25,.32,.14],[2.55,.36,.2]]),.16,'MICA','MICA EM · active radar, TVC');
  aam('MICA IR','AIM-9X',{mass:112,acc:150,burn:4.5,cd:4.4e-5,maxG:50,gimbal:60*D,irR:22000,front:.65,aiR:20000,life:60,trk:1.5,ccm:.85},
    SH(3.1,.08,[[.25,.32,.14],[2.55,.36,.2]]),.16,'MICI','MICA IR · imaging IR, TVC');
  // Diehl IRIS-T: 87.4 kg, 127 mm, TVC, ±90° gimbal, can engage behind the 3-9 line
  aam('IRIS-T','AIM-9X',{mass:87.4,acc:190,burn:4.8,maxG:60,gimbal:90*D,irR:20000,front:.65,aiR:15000,trk:1.7,ccm:.9},SH(2.94,.064,[[.2,.36,.14],[2.4,.3,.18]]),.127,'IRIS','IRIS-T · imaging IR, TVC');
  // MBDA ASRAAM: 88 kg, 166 mm motor, very fast (M3+), lock-on after launch
  aam('ASRAAM','AIM-9X',{mass:88,acc:290,burn:3.4,cd:5.6e-5,maxG:50,gimbal:90*D,irR:22000,front:.6,aiR:18000,trk:1.5,ccm:.85},SH(2.9,.083,[[2.5,.18,.12]]),.166,'ASRM','ASRAAM · imaging IR, M3+');
  // Mitsubishi AAM-4B (Type 99 kai): 222 kg, 203 mm, first AAM with an AESA seeker; AAM-5 (Type 04): 95 kg, TVC
  aam('AAM-4B','AIM-120C',{mass:222,acc:120,burn:9,cd:3.8e-5,aiR:45000,life:110,trk:.93,ccm:.8,res:.82},SH(3.67,.1,[[.15,.62,.3],[2.0,.42,.36]]),.203,'AAM4','AAM-4B · AESA seeker');
  aam('AAM-5','AIM-9X',{mass:95,acc:175,burn:5,maxG:55,gimbal:90*D,irR:18000,front:.6,aiR:14000},SH(3.1,.064,[[1.0,.3,.25],[2.6,.3,.15]]),.127,'AAM5','AAM-5 · imaging IR, TVC');
  // PL-15: ~210 kg, 203 mm, dual-pulse motor, AESA seeker, two-way link; PL-10: 89 kg, imaging IR, TVC, ±90°
  aam('PL-15','AIM-120D',{mass:210,acc:95,burn:16,cd:3.2e-5,maxG:40,aiR:58000,life:140,trk:.93,ccm:.8,loft:.55,res:.82},SH(4.0,.1,[[.3,.3,.18],[3.4,.36,.2]]),.203,'PL15','PL-15 · dual-pulse, AESA seeker');
  sustain('PL-15',1,6,10,.6);
  aam('PL-10','AIM-9X',{mass:89,acc:180,burn:5,maxG:60,gimbal:90*D,irR:20000,front:.65,aiR:14000},SH(3.0,.08,[[2.55,.3,.14]]),.16,'PL10','PL-10 · imaging IR, TVC');
  // DRDO Astra Mk 1: 154 kg, 178 mm, active radar, ~80-110 km
  aam('Astra','R-77',{mass:154,cd:3.9e-5,aiR:36000,life:100},SH(3.84,.089,[[.3,.36,.14],[3.1,.3,.2]]),.178,'ASTR','Astra Mk 1 · active radar');
}

/* ---------------- 2. new air-to-ground stores ---------------- */
function ag(k,base,over,sn,name){if(AGW[k]||!AGW[base])return;AGW[k]=Object.assign({},AGW[base],over||{});SN[k]=sn;STORE_NAME[k]=name;}
function addAGs(){
  ag('SCALP-EG','Kh-59MK2',{mass:1300,L:5.1,R:.32,range:250000,dv:250,burn:600,dmg:600,soft:48,hard:30},'SCLP','SCALP-EG / Storm Shadow · cruise missile');
  ag('Taurus','Kh-59MK2',{mass:1400,L:5.1,R:.33,range:300000,dv:250,burn:700,dmg:650,soft:48,hard:34},'TAUR','Taurus KEPD 350 · cruise missile');
  ag('AASM-250','GBU-38',{mass:340,L:3.1,R:.16,dmg:200},'AASM','AASM Hammer 250 · GPS / INS, rocket-boosted');
  ag('AGM-88E','AGM-88C',{mass:361,mem:1,memErr:4,posAct:30000},'88E','AGM-88E AARGM · ARH + GPS / MMW');
  ag('ASM-2','Kh-35U',{mass:530,L:4.0,R:.175,range:150000,seek:'IR'},'ASM2','ASM-2 (Type 93) · anti-ship, IIR');
  ag('BrahMos-A','P-800',{mass:2550,L:8.4,R:.335,range:290000},'BRMS','BrahMos-A · supersonic anti-ship');
  ag('YJ-83K','Kh-35U',{mass:715,L:6.4,R:.18,range:180000},'YJ83','YJ-83K (C-802AK) · anti-ship');
  ag('YJ-91','Kh-31P',{mass:600,L:4.7,R:.18},'YJ91','YJ-91 · anti-radiation');
  ag('CM-400AKG','Kh-31A',{mass:910,L:6.0,R:.2,range:240000},'CM400','CM-400AKG · supersonic strike');
  ag('LS-6','GBU-38',{mass:500,L:3.3,R:.2,dmg:240},'LS6','LS-6 · glide, satellite-guided');
  if(AGW['ALQ-131']&&!AGW['ALQ-99']){AGW['ALQ-99']=Object.assign({},AGW['ALQ-131'],{mass:430,L:4.7,R:.3});SN['ALQ-99']='Q99';STORE_NAME['ALQ-99']='AN/ALQ-99 tactical jamming pod';}
}
try{addAAMs();}catch(e){console.warn('[modern] AAMs',e);}
try{addAGs();}catch(e){console.warn('[modern] AG',e);}

/* ---------------- 3. store groups ---------------- */
const US_AAM=['AIM-9X','AIM-9M','AIM-120C','AIM-120D'];
const US_AG=['Mk-82','Mk-82AIR','Mk-83','Mk-84','GBU-12','GBU-10','GBU-24','GBU-31','GBU-32','GBU-38','GBU-54','CBU-87','CBU-97','CBU-103','CBU-105','AGM-65D','AGM-65G','AGM-65H','AGM-154A','AGM-88C','AGM-88E'];
const EU_IR=['IRIS-T','ASRAAM','AIM-9L','AIM-9M'],EU_BVR=['AIM-120C','AIM-120D','Meteor'];
const EU_AG=['GBU-12','GBU-10','GBU-16','GBU-24','GBU-38','Mk-82','Mk-83','Mk-84','Taurus','SCALP-EG'];
const FR_AAM=['MICA EM','MICA IR','Meteor'],FR_AG=['AASM-250','GBU-12','GBU-16','GBU-24','SCALP-EG','AM39 Exocet','Mk-82','SAMP 250'];
const CN_IR=['PL-10','PL-8','PL-5E'],CN_BVR=['PL-15','PL-12'],CN_AG=['LS-6','LS-500J','KD-88','YJ-83K','YJ-91','FAB-250','FAB-500','B-8M1'];
const RU_AG=['Kh-29L','Kh-29T','Kh-31A','Kh-31P','Kh-38MT','Kh-59MK2','KAB-500Kr','KAB-500L','FAB-250','FAB-500','OFAB-250','B-8M1','B-13L'];
// Flanker / Fulcrum station lists translated to the Chinese weapon family
function toCN(list){const o=[];for(const w of list){
  if(/^R-7[34]/.test(w))o.push('PL-10','PL-8');else if(/^R-(27|77|37)/.test(w))o.push('PL-15','PL-12');
  else if(/^Kh-31P/.test(w))o.push('YJ-91');else if(/^(Kh-31A|Kh-35|P-800)/.test(w))o.push('YJ-83K');
  else if(/^(Kh-29|Kh-38|Kh-59)/.test(w))o.push('KD-88');else if(/^(KAB|UPAB|Grom)/.test(w))o.push('LS-500J','LS-6');
  else o.push(w);}return uniq(o);}

/* ---------------- 4. registration ---------------- */
const NEW=[],R=(name,R0,ranges,unit,ecc,extra)=>Object.assign({name,R0,ranges,unit:unit==='NM'?NM:KM,ul:unit,ecc},extra||{});
const G_=(name,rate,v,dmg,ammo,spread=.0024)=>({name,rate,v,dmg,ammo,spread});
const NOGUN=G_('none',1,800,0,0);
const tryS=n=>{try{return eval(n);}catch(e){return null;}};
function addM(s){try{
  const src=s.src,id=s.id;if(!AC[src]){console.warn('[modern] no source',src,'for',id);return;}
  const over=Object.assign({},s.ac);
  const P=AC[src];over.rel=P.rel?P.rel.slice():undefined;over.migRel=P.migRel?P.migRel.slice():undefined;
  cloneType(src,id,over);const A=AC[id];
  for(const k of s.del||[])delete A[k];
  if(s.crew){A.rio=true;A.wso=true;A.crew=2;A.crewName=s.crew;CREW[id]=s.crew;}
  else if(s.crew===null){A.rio=false;A.wso=false;delete A.crew;delete A.crewName;delete CREW[id];}
  // stations: start from the parent's list, then replace / extend / prune
  const S=STN[id]||(STN[id]={});
  if(s.map)for(const k of Object.keys(S))S[k]=s.map(S[k]);
  if(s.stn)for(const k of Object.keys(s.stn))if(A.st[k])S[k]=uniq(s.stn[k]);
  if(s.add)for(const k of Object.keys(s.add))if(A.st[k])S[k]=uniq([...(S[k]||[]),...s.add[k]]);
  if(s.drop)for(const k of Object.keys(S))S[k]=S[k].filter(w=>!s.drop.includes(w));
  for(const k of Object.keys(A.st))if(!S[k])S[k]=[];
  // loadouts (validated against the station lists)
  const L=s.load||{};
  for(const era of['cold','modern'])LOAD[era][id]=validLoad(id,era,Object.assign({},L[era]||L.modern||L.cold||{}));
  LOAD.guns[id]=L.guns||{};STRIKE_LOAD[id]=Object.assign({},L.strike||L.modern||{});
  if(s.cms)for(const era of Object.keys(CMS))CMS[era][id]=s.cms.slice();
  ENGN[id]=s.eng;if(s.irstn)IRSTN[id]=s.irstn;else delete IRSTN[id];
  CALLS[id]=s.call;NCTR_ID[id]=s.nctr||id;FOE[id]=s.foe;ACROLE[id]=s.role;
  if(s.ecm)ECM_FIT[id]=s.ecm;
  if(s.stall!==undefined){if(s.stall)STALL[id]=s.stall;else delete STALL[id];}
  if(s.side==='RED')RUS.add(id);else RUS.delete(id);
  if(s.ccip)NO_CCIP.delete(id);
  if(s.dl!==false)DL_FIT.add(id);else DL_FIT.delete(id);
  if(s.hms){for(const n of['HMS_ALWAYS','HMS_MODERN']){const H=tryS(n);if(H){if(s.hms===n)H.add(id);else H.delete(id);}}}
  if(s.cv===false)try{CV_AC.delete(id);}catch(e){}
  if(s.cv===true)try{CV_AC.add(id);APP_KT[id]=s.app||140;}catch(e){}
  if(s.noRdr===false)delete A.noRdr;
  if(A.radar&&A.radar.name&&!RGIM[A.radar.name])RGIM[A.radar.name]=s.gim||RGIM[P.radar&&P.radar.name]||[60,60,60,1];
  if(s.noAB)A.noAB=true;
  ENG_SUP[A.name]=s.engSup!=null?s.engSup:(ENG_SUP[P.name]!=null?ENG_SUP[P.name]:.05);
  A.mdSrc=src;A.cwPit='Placeholder cockpit from the '+P.name+' until this jet gets its own pass.';
  NEW.push(s);
}catch(e){console.warn('[modern] '+s.id,e);}}

/* ======================================================================================================================
   BLUE
   ====================================================================================================================== */

// ---- F-15EX Eagle II: F110-GE-129 (76.3 / 131.6 kN), DCS digital FBW, APG-82(V)1 AESA, EPAWSS, ADCP II; 29,500 lb payload ----
addM({id:'F-15EX',src:'F-15E',side:'BLUE',call:'EAGLE II',nctr:'F-15',foe:'Su-35S',eng:'2× F110-GE-129',crew:'WSO',ccip:true,hms:'HMS_MODERN',
  role:'USAF · AIR SUPERIORITY / STRIKE · APG-82(V)1 AESA · EPAWSS · FBW · 12 AAM',
  ac:{name:'F-15EX Eagle II',empty:14800,mil:152600,ab:263200,fbw:true,gLim:9,aoaLim:30,rcs:14,
    radar:R('APG-82(V)1',98*NM,[10,20,40,80,160],'NM',.92,{aesa:1,beam:2.6*D}),twsN:8,trkN:20},
  add:{'2A':['AIM-120D'],'8A':['AIM-120D'],'2':['AIM-120D','AIM-9X'],'8':['AIM-120D','AIM-9X']},
  ecm:{cold:{n:'ALQ-250 EPAWSS',jp:2,dec:.88,kg:0,cd:0,warm:10},modern:{n:'ALQ-250 EPAWSS',jp:2.2,dec:.9,kg:0,cd:0,warm:10}},
  load:{modern:{'2A':'AIM-9X','8A':'AIM-9X','2B':'AIM-120D','8B':'AIM-120D','3C':'AIM-120D','4C':'AIM-120D','6C':'AIM-120D','7C':'AIM-120D',5:'TK'},
        strike:{'2A':'AIM-9X','8A':'AIM-9X','2B':'AIM-120D','8B':'AIM-120D',2:'GBU-31',8:'GBU-31',LC1:'GBU-38',LC2:'GBU-38',RC1:'GBU-38',RC2:'GBU-38',TP:'SNIPER',5:'TK'}},
  cms:[120,120]});

// ---- F/A-18F Super Hornet: two-seat E, same F414-GE-400s, ~3% less internal fuel ----
addM({id:'F-18F',src:'F-18E',side:'BLUE',call:'RHINO',nctr:'F-18',foe:'Su-35S',eng:'2× F414-GE-400',crew:'WSO',ccip:true,
  role:'USN · TWO-SEAT STRIKE FIGHTER · APG-79 AESA · PILOT + WSO',
  ac:{name:'F/A-18F Super Hornet',empty:14750,fuel:6530},
  load:{modern:Object.assign({},LOAD.modern['F-18E']),strike:Object.assign({},STRIKE_LOAD['F-18E']||LOAD.modern['F-18E'])}});

// ---- EA-18G Growler: F airframe, gun deleted, ALQ-218 wingtip receivers, ALQ-99 / ALQ-249 NGJ jamming, AGM-88 and AMRAAM for self-defence ----
addM({id:'EA-18G',src:'F-18E',side:'BLUE',call:'GROWLER',nctr:'F-18',foe:'Su-35S',eng:'2× F414-GE-400',crew:'EWO',ccip:false,
  role:'USN · AIRBORNE ELECTRONIC ATTACK · ALQ-99 / NGJ · ALQ-218 · AGM-88E · PILOT + EWO',
  ac:{name:'EA-18G Growler',empty:15011,fuel:6530,gun:NOGUN,gLim:7.5,rcs:3},
  stn:{1:[],11:[],2:['AGM-88B','AGM-88C','AGM-88E','ALQ-99'],10:['AGM-88B','AGM-88C','AGM-88E','ALQ-99'],3:['TK','ALQ-99','AGM-88C','AGM-88E'],9:['TK','ALQ-99','AGM-88C','AGM-88E'],
       4:['TK','AGM-88C','AGM-88E','AIM-120C','AIM-120D'],8:['TK','AGM-88C','AGM-88E','AIM-120C','AIM-120D'],5:['AIM-120C','AIM-120D'],7:['AIM-120C','AIM-120D'],6:['ALQ-99','TK'],
       '3b':[],'4b':[],'8b':[],'9b':[]},
  ecm:{cold:{n:'ALQ-99 TJS + ALQ-218',jp:4,dec:.9,kg:0,cd:0,warm:8},modern:{n:'ALQ-249 NGJ-MB + ALQ-218',jp:5,dec:.92,kg:0,cd:0,warm:6}},
  load:{modern:{2:'AGM-88E',10:'AGM-88E',3:'ALQ-99',9:'ALQ-99',4:'TK',8:'TK',6:'ALQ-99',5:'AIM-120D',7:'AIM-120D'}},cms:[60,60]});

// ---- F-22A Raptor: 2× F119-PW-100 (116 / 156 kN), 2D pitch TVC, supercruise ~M1.6, APG-77(V)1 AESA, ALR-94; internal: 6 AIM-120 + 2 AIM-9 ----
addM({id:'F-22',src:'F-16C',side:'BLUE',call:'RAPTOR',nctr:'F-22',foe:'Su-57',eng:'2× F119-PW-100',crew:null,ccip:true,hms:'HMS_MODERN',
  role:'USAF · AIR DOMINANCE · STEALTH · SUPERCRUISE · APG-77(V)1 AESA · PITCH TVC · INTERNAL BAYS',stall:{s:.02,twin:1},
  ac:{name:'F-22A Raptor',empty:19700,fuel:8200,S:78.04,CLa:4.4,cd0:.0168,k:.12,mil:232000,ab:312000,spool:1.4,gLim:9,aoaLim:60,roll:5,fbw:true,
    rcs:.0001,irs:.75,dW:29400,ff:[.3,2.8,13],tvc:{pitch:20,yaw:0},
    radar:R('APG-77(V)1',105*NM,[10,20,40,80,160],'NM',.94,{aesa:1,beam:2.2*D}),irst:false,twsN:8,trkN:24,
    gun:G_('M61A2',100,1050,9,480,.0022),tank:0},
  stn:{1:['AIM-9X','AIM-9M'],9:['AIM-9X','AIM-9M'],2:['AIM-120C','AIM-120D'],8:['AIM-120C','AIM-120D'],3:['AIM-120C','AIM-120D','GBU-32','GBU-39'],7:['AIM-120C','AIM-120D','GBU-32','GBU-39'],
       4:['AIM-120C','AIM-120D','GBU-39'],6:['AIM-120C','AIM-120D','GBU-39'],5:[],'5R':[],'5L':[],'3b':[],'3c':[],'4b':[],'4c':[],'6b':[],'6c':[],'7b':[],'7c':[]},
  ecm:{cold:{n:'ALR-94 / LPI EMCON',jp:.6,dec:.7,kg:0,cd:0,warm:10},modern:{n:'ALR-94 / LPI EMCON',jp:.6,dec:.75,kg:0,cd:0,warm:10}},
  load:{modern:{1:'AIM-9X',9:'AIM-9X',2:'AIM-120D',3:'AIM-120D',4:'AIM-120D',6:'AIM-120D',7:'AIM-120D',8:'AIM-120D'},
        strike:{1:'AIM-9X',9:'AIM-9X',3:'GBU-32',7:'GBU-32',2:'AIM-120D',8:'AIM-120D'}},cms:[60,60],gim:[60,60,60,1]});

// ---- F-35A Lightning II: F135-PW-100 (128 / 191 kN), APG-81 AESA, AAQ-40 EOTS + AAQ-37 DAS, GAU-22/A 25 mm, 4 internal + 6 external stations ----
addM({id:'F-35A',src:'F-16C',side:'BLUE',call:'LIGHTNING',nctr:'F-35',foe:'Su-57',eng:'F135-PW-100',crew:null,ccip:true,hms:'HMS_ALWAYS',irstn:'AAQ-40 EOTS / AAQ-37 DAS',
  role:'USAF · MULTIROLE · STEALTH · APG-81 AESA · EOTS / DAS · GAU-22/A',stall:{s:.02,twin:0},
  ac:{name:'F-35A Lightning II',empty:13290,fuel:8278,S:42.7,CLa:4.2,cd0:.021,k:.13,mil:128000,ab:191000,spool:1.5,gLim:9,aoaLim:50,roll:4.5,fbw:true,
    rcs:.005,irs:1.2,dW:31800,ff:[.3,2.6,12],
    radar:R('APG-81',85*NM,[10,20,40,80,160],'NM',.94,{aesa:1,beam:2.6*D}),irst:true,ols:{tail:70000,head:28000,lrf:20000},twsN:8,trkN:24,
    gun:G_('GAU-22/A',55,1040,16,180,.0022),tank:2300},
  stn:{1:['AIM-9X'],9:['AIM-9X'],2:['AIM-120C','AIM-120D','GBU-12','GBU-38','GBU-31','AGM-154A','AGM-88E'],8:['AIM-120C','AIM-120D','GBU-12','GBU-38','GBU-31','AGM-154A','AGM-88E'],
       3:['AIM-120C','AIM-120D','GBU-31','GBU-32','GBU-12','GBU-38','GBU-39','GBU-54','AGM-154A','CBU-103','CBU-105'],7:['AIM-120C','AIM-120D','GBU-31','GBU-32','GBU-12','GBU-38','GBU-39','GBU-54','AGM-154A','CBU-103','CBU-105'],
       4:['AIM-120C','AIM-120D'],6:['AIM-120C','AIM-120D'],5:[],'5R':[],'5L':[],'3b':[],'3c':[],'4b':[],'4c':[],'6b':[],'6c':[],'7b':[],'7c':[]},
  ecm:{cold:{n:'ASQ-239 Barracuda',jp:1.2,dec:.85,kg:0,cd:0,warm:10},modern:{n:'ASQ-239 Barracuda',jp:1.4,dec:.88,kg:0,cd:0,warm:10}},
  load:{modern:{3:'AIM-120D',4:'AIM-120D',6:'AIM-120D',7:'AIM-120D'},strike:{3:'GBU-31',7:'GBU-31',4:'AIM-120D',6:'AIM-120D'}},cms:[30,30]});

// ---- A-10C Thunderbolt II: 2× TF34-GE-100A (40.3 kN), no afterburner, no radar, GAU-8/A 30 mm (1,150 rds, 3,900 rpm), 11 stations, LITENING / SNIPER ----
addM({id:'A-10C',src:'F-16C',side:'BLUE',call:'HOG',nctr:'A-10',foe:'MiG-29S',eng:'2× TF34-GE-100A',crew:null,ccip:true,hms:'HMS_MODERN',noAB:true,
  role:'USAF · CLOSE AIR SUPPORT · GAU-8/A · TGP · NO RADAR · NO AFTERBURNER',stall:{s:.04,twin:1},
  ac:{name:'A-10C Thunderbolt II',empty:11321,fuel:4990,S:47.01,CLa:5.0,cd0:.032,k:.065,mil:80600,ab:80600,spool:4.5,abLight:99,gLim:7.33,aoaLim:20,roll:2.6,fbw:false,noLimiter:true,
    rcs:25,irs:.7,dW:23000,ff:[.18,1.25,1.25],vne:833,
    radar:R('none (TGP ranging)',3000,[1,2],'NM',.02),noRdr:true,pulse:true,irst:false,
    gun:G_('GAU-8/A',65,1010,30,1150,.0028),tank:1800},
  stn:{1:['ALQ-131','ALQ-184','AIM-9M'],9:['AIM-9M','ALQ-131','ALQ-184'],
       2:['Mk-82','Mk-82AIR','GBU-12','GBU-38','CBU-87','CBU-97','CBU-103','CBU-105','LAU-10'],8:['Mk-82','Mk-82AIR','GBU-12','GBU-38','CBU-87','CBU-97','CBU-103','CBU-105','LAU-10'],
       3:['AGM-65D','AGM-65G','AGM-65H','AGM-65E','Mk-82','Mk-84','GBU-12','GBU-10','GBU-31','GBU-38','GBU-54','CBU-87','CBU-97','CBU-103','CBU-105','LAU-10'],
       7:['AGM-65D','AGM-65G','AGM-65H','AGM-65E','Mk-82','Mk-84','GBU-12','GBU-10','GBU-31','GBU-38','GBU-54','CBU-87','CBU-97','CBU-103','CBU-105','LAU-10'],
       4:['TK','Mk-82','Mk-84','GBU-12','GBU-10','GBU-31','GBU-38','CBU-87','CBU-97','CBU-103','CBU-105'],6:['TK','Mk-82','Mk-84','GBU-12','GBU-10','GBU-31','GBU-38','CBU-87','CBU-97','CBU-103','CBU-105'],
       5:['Mk-82','Mk-84','GBU-12','GBU-38'],'5L':[]},
  load:{modern:{1:'ALQ-184',9:'AIM-9M',2:'GBU-12',8:'GBU-12',3:'AGM-65D',7:'AGM-65H',4:'GBU-38',6:'GBU-38','5R':'SNIPER'},
        strike:{1:'ALQ-184',9:'AIM-9M',2:'CBU-97',8:'CBU-97',3:'AGM-65D',7:'AGM-65D',4:'GBU-12',6:'GBU-12','5R':'SNIPER'}},cms:[480,96]});

// ---- Mitsubishi F-2A: F110-GE-129, J/APG-1 (first fighter AESA in service), AAM-4B / AAM-5, ASM-2 ----
addM({id:'F-2A',src:'F-16C',side:'BLUE',call:'VIPER ZERO',nctr:'F-16',foe:'J-16',eng:'F110-IHI-129',crew:null,ccip:true,hms:'HMS_MODERN',
  role:'JASDF · SUPPORT FIGHTER / ANTI-SHIP · J/APG-1 AESA · AAM-4B · ASM-2',
  ac:{name:'F-2A',empty:9527,fuel:4637,S:34.84,CLa:4.5,cd0:.0185,k:.112,mil:76300,ab:131600,gLim:9,aoaLim:26,roll:4.8,rcs:2,dW:22100,
    radar:R('J/APG-1',60*NM,[10,20,40,80,160],'NM',.85,{aesa:1,beam:3*D}),twsN:6,trkN:10},
  stn:{1:['AAM-5','AIM-9L','AIM-9M'],9:['AAM-5','AIM-9L','AIM-9M'],2:['AAM-5','AAM-4B','AIM-7M','AIM-120C'],8:['AAM-5','AAM-4B','AIM-7M','AIM-120C'],
       3:['AAM-4B','AIM-7M','AIM-120C','ASM-2','GBU-12','GBU-38','Mk-82','Mk-82AIR'],7:['AAM-4B','AIM-7M','AIM-120C','ASM-2','GBU-12','GBU-38','Mk-82','Mk-82AIR'],
       4:['TK','ASM-2','GBU-12','GBU-38','Mk-82'],6:['TK','ASM-2','GBU-12','GBU-38','Mk-82'],5:['PTB','TK']},
  load:{modern:{1:'AAM-5',9:'AAM-5',2:'AAM-4B',8:'AAM-4B',3:'AAM-4B',7:'AAM-4B',4:'TK',6:'TK'},strike:{1:'AAM-5',9:'AAM-5',2:'AAM-4B',8:'AAM-4B',4:'ASM-2',6:'ASM-2',3:'ASM-2',7:'ASM-2'}},cms:[60,60]});

// ---- Eurofighter Typhoon (EF-2000, Tranche 3A): 2× EJ200 (60 / 90 kN), CAPTOR-M, PIRATE IRST, DASS, BK-27 ----
addM({id:'EF-2000',src:'F-16C',side:'BLUE',call:'TYPHOON',nctr:'EF2000',foe:'Su-35S',eng:'2× EJ200',crew:null,ccip:true,hms:'HMS_ALWAYS',irstn:'PIRATE',
  role:'NATO · SWING-ROLE · CAPTOR-M · PIRATE IRST · DASS · METEOR / ASRAAM / IRIS-T',stall:{s:.02,twin:1},
  ac:{name:'Eurofighter Typhoon',empty:11000,fuel:4996,S:51.2,CLa:3.9,cd0:.0172,k:.14,mil:120000,ab:180000,spool:1.4,gLim:9,aoaLim:27,roll:5.2,fbw:true,
    rcs:.5,irs:1.0,dW:23500,ff:[.25,2.2,10],
    radar:R('CAPTOR-M',85*NM,[10,20,40,80,160],'NM',.82,{beam:2.6*D}),irst:true,ols:{tail:80000,head:30000,lrf:0},twsN:4,trkN:20,
    gun:G_('BK-27',28,1025,26,150,.0026),tank:1200},
  stn:{1:EU_IR,9:EU_IR,2:[...EU_IR,...EU_BVR],8:[...EU_IR,...EU_BVR],3:['TK',...EU_BVR,...EU_AG],7:['TK',...EU_BVR,...EU_AG],4:['GBU-12','GBU-16','Mk-82'],6:['GBU-12','GBU-16','Mk-82'],5:['PTB','TK'],
       '4b':EU_BVR,'4c':EU_BVR,'6b':EU_BVR,'6c':EU_BVR,'5R':['TGP'],'5L':[],'3b':[],'3c':[],'7b':[],'7c':[]},
  ecm:{cold:{n:'EuroDASS Praetorian',jp:1.8,dec:.85,kg:0,cd:0,warm:12},modern:{n:'EuroDASS Praetorian',jp:2,dec:.86,kg:0,cd:0,warm:12}},
  load:{cold:{1:'AIM-9L',9:'AIM-9L','4b':'AIM-120C','4c':'AIM-120C','6b':'AIM-120C','6c':'AIM-120C',5:'PTB'},
        modern:{1:'ASRAAM',9:'ASRAAM',2:'IRIS-T',8:'IRIS-T','4b':'Meteor','4c':'Meteor','6b':'Meteor','6c':'Meteor',3:'TK',7:'TK'},
        strike:{1:'ASRAAM',9:'ASRAAM','4b':'Meteor','6b':'Meteor',3:'Taurus',7:'Taurus',4:'GBU-16',6:'GBU-16','5R':'TGP'}},cms:[32,32]});

// ---- Dassault Rafale C (F3R): 2× M88-2 (50 / 75 kN), RBE2-AA AESA, OSF front sector optronics, SPECTRA, 30M791 ----
addM({id:'Rafale',src:'F-16C',side:'BLUE',call:'RAFALE',nctr:'RAFALE',foe:'Su-35S',eng:'2× Snecma M88-2',crew:null,ccip:true,hms:'HMS_MODERN',irstn:'OSF',
  role:'FRANCE · OMNIROLE · RBE2-AA AESA · OSF · SPECTRA · METEOR / MICA / SCALP',stall:{s:.02,twin:1},
  ac:{name:'Rafale C',empty:10300,fuel:4700,S:45.7,CLa:4.0,cd0:.0172,k:.13,mil:100000,ab:150000,spool:1.5,gLim:9,aoaLim:32,roll:5,fbw:true,
    rcs:.8,irs:1.0,dW:24500,ff:[.22,2.0,9],units:'imp',
    radar:R('RBE2-AA',75*NM,[10,20,40,80,160],'NM',.9,{aesa:1,beam:2.8*D}),irst:true,ols:{tail:80000,head:40000,lrf:20000},twsN:8,trkN:40,
    gun:G_('GIAT 30M791',41,1025,26,125,.0026),tank:1700},
  stn:{1:['MICA IR','MICA EM','Magic 2'],9:['MICA IR','MICA EM','Magic 2'],2:FR_AAM,8:FR_AAM,3:['TK',...FR_AAM,...FR_AG],7:['TK',...FR_AAM,...FR_AG],
       4:['MICA EM','MICA IR','Meteor','AASM-250','GBU-12'],6:['MICA EM','MICA IR','Meteor','AASM-250','GBU-12'],5:['PTB','TK','SCALP-EG','AM39 Exocet'],'5R':['TGP'],'5L':[],'3b':['AASM-250'],'7b':['AASM-250'],'3c':[],'7c':[],'4b':[],'4c':[],'6b':[],'6c':[]},
  ecm:{cold:{n:'SPECTRA',jp:2,dec:.9,kg:0,cd:0,warm:10},modern:{n:'SPECTRA',jp:2.2,dec:.9,kg:0,cd:0,warm:10}},
  load:{cold:{1:'MICA IR',9:'MICA IR',2:'MICA EM',8:'MICA EM',4:'MICA EM',6:'MICA EM',5:'PTB'},
        modern:{1:'MICA IR',9:'MICA IR',2:'MICA EM',8:'MICA EM',4:'Meteor',6:'Meteor',3:'TK',7:'TK'},
        strike:{1:'MICA IR',9:'MICA IR',2:'MICA EM',8:'MICA EM',5:'SCALP-EG',3:'TK',7:'TK',4:'AASM-250',6:'AASM-250'}},cms:[112,112]});

// ---- Mirage 2000-5: M53-P2, RDY (multi-target TWS, look-down), 4 MICA EM under the fuselage + 2 MICA IR / Magic 2 ----
addM({id:'Mirage 2000-5',src:'Mirage 2000',side:'BLUE',call:'MIRAGE',nctr:'M2000',foe:'MiG-29S',eng:'SNECMA M53-P2',crew:null,ccip:true,
  role:'FRANCE · AIR DEFENCE · RDY · MICA EM / IR · ICMS 2',
  ac:{name:'Mirage 2000-5',empty:7600,radar:R('RDY',64*NM,[10,20,40,80,160],'NM',.75,{beam:3*D}),twsN:4,trkN:24},
  add:{1:['MICA IR'],9:['MICA IR'],2:['MICA EM','MICA IR'],8:['MICA EM','MICA IR'],3:['MICA EM'],4:['MICA EM'],6:['MICA EM'],7:['MICA EM']},
  load:{cold:{1:'Magic 2',9:'Magic 2',2:'Super 530D',8:'Super 530D',C:'PTB'},modern:{1:'MICA IR',9:'MICA IR',3:'MICA EM',4:'MICA EM',6:'MICA EM',7:'MICA EM',C:'PTB'},
        strike:{1:'MICA IR',9:'MICA IR',2:'GBU-12',8:'GBU-12',3:'MICA EM',7:'MICA EM',C:'PTB'}}});

// ---- Saab JAS 39C Gripen: RM12 (54 / 80.5 kN), PS-05/A, 8 stations, IRIS-T / AIM-120 / Meteor, RBS 15F ----
addM({id:'JAS-39C',src:'F-16C',side:'BLUE',call:'GRIPEN',nctr:'JAS39',foe:'MiG-29S',eng:'Volvo RM12',crew:null,ccip:true,hms:'HMS_MODERN',
  role:'SWEDEN · LIGHT MULTIROLE · PS-05/A · IRIS-T / AMRAAM / METEOR · RBS 15F',
  ac:{name:'JAS 39C Gripen',empty:6800,fuel:2268,S:25.54,CLa:4.2,cd0:.017,k:.135,mil:54000,ab:80500,spool:1.5,gLim:9,aoaLim:26,roll:5,fbw:true,
    rcs:1.2,irs:.9,dW:14000,ff:[.12,1.1,5.5],
    radar:R('PS-05/A',60*NM,[10,20,40,80,160],'NM',.78,{beam:3*D}),irst:false,twsN:4,trkN:14,
    gun:G_('BK-27',28,1025,26,120,.0026),tank:880},
  stn:{1:['IRIS-T','Rb 74','AIM-9L'],9:['IRIS-T','Rb 74','AIM-9L'],2:['IRIS-T','Rb 74','AIM-120C','Meteor'],8:['IRIS-T','Rb 74','AIM-120C','Meteor'],
       3:['TK','AIM-120C','Meteor','Rb 15F','GBU-12','GBU-16','Mk-82','Taurus'],7:['TK','AIM-120C','Meteor','Rb 15F','GBU-12','GBU-16','Mk-82','Taurus'],
       4:[],6:[],5:['PTB','TK','GBU-12','Mk-82'],'5R':['TGP'],'5L':[],'3b':[],'3c':[],'4b':[],'4c':[],'6b':[],'6c':[],'7b':[],'7c':[]},
  load:{cold:{1:'Rb 74',9:'Rb 74',2:'AIM-120C',8:'AIM-120C',3:'AIM-120C',7:'AIM-120C',5:'PTB'},modern:{1:'IRIS-T',9:'IRIS-T',2:'Meteor',8:'Meteor',3:'AIM-120C',7:'AIM-120C',5:'PTB'},
        strike:{1:'IRIS-T',9:'IRIS-T',2:'AIM-120C',8:'AIM-120C',3:'Rb 15F',7:'Rb 15F',5:'PTB'}},cms:[80,40]});

// ---- Saab JAS 39E Gripen: F414-GE-39E (62 / 98 kN), ES-05 Raven AESA on a swashplate (±100°), Skyward-G IRST, 10 stations ----
addM({id:'JAS-39E',src:'F-16C',side:'BLUE',call:'GRIPEN',nctr:'JAS39',foe:'Su-35S',eng:'F414-GE-39E',crew:null,ccip:true,hms:'HMS_ALWAYS',irstn:'Skyward-G',
  role:'SWEDEN · MULTIROLE · ES-05 RAVEN AESA (REPOSITIONER) · SKYWARD-G IRST · METEOR',
  ac:{name:'JAS 39E Gripen',empty:8000,fuel:3400,S:30,CLa:4.2,cd0:.0172,k:.13,mil:62000,ab:98000,spool:1.4,gLim:9,aoaLim:26,roll:5,fbw:true,
    rcs:1.0,irs:.95,dW:16500,ff:[.14,1.3,6.5],
    radar:R('ES-05 Raven',80*NM,[10,20,40,80,160],'NM',.9,{aesa:1,beam:2.8*D}),irst:true,ols:{tail:70000,head:30000,lrf:0},twsN:8,trkN:24,
    gun:G_('BK-27',28,1025,26,120,.0026),tank:1500},
  stn:{1:['IRIS-T','AIM-9L'],9:['IRIS-T','AIM-9L'],2:['IRIS-T','AIM-120C','AIM-120D','Meteor'],8:['IRIS-T','AIM-120C','AIM-120D','Meteor'],
       3:['TK','AIM-120C','AIM-120D','Meteor','Rb 15F','GBU-12','GBU-16','GBU-39','Mk-82','Taurus'],7:['TK','AIM-120C','AIM-120D','Meteor','Rb 15F','GBU-12','GBU-16','GBU-39','Mk-82','Taurus'],
       4:['Meteor','AIM-120C','GBU-39'],6:['Meteor','AIM-120C','GBU-39'],5:['PTB','TK','GBU-12'],'5R':['TGP'],'5L':[],'3b':[],'3c':[],'4b':[],'4c':[],'6b':[],'6c':[],'7b':[],'7c':[]},
  ecm:{cold:{n:'Arexis EW suite',jp:2,dec:.88,kg:0,cd:0,warm:10},modern:{n:'Arexis EW suite',jp:2.2,dec:.9,kg:0,cd:0,warm:10}},
  load:{modern:{1:'IRIS-T',9:'IRIS-T',2:'Meteor',8:'Meteor',4:'Meteor',6:'Meteor',3:'TK',7:'TK'},strike:{1:'IRIS-T',9:'IRIS-T',2:'Meteor',8:'Meteor',3:'Rb 15F',7:'Rb 15F',5:'PTB'}},
  cms:[80,40],gim:[100,60,60,1]});

// ---- KAI KF-21 Boramae Block I: 2× F414-GE-400K (57.8 / 97.9 kN), Hanwha AESA, IRST, 4 semi-recessed Meteor ----
addM({id:'KF-21',src:'F-16C',side:'BLUE',call:'BORAMAE',nctr:'KF-21',foe:'J-16',eng:'2× F414-GE-400K',crew:null,ccip:true,hms:'HMS_ALWAYS',irstn:'KF-21 IRST',
  role:'KOREA · 4.5-GEN MULTIROLE · AESA · IRST · METEOR / IRIS-T',stall:{s:.02,twin:1},
  ac:{name:'KF-21 Boramae',empty:11800,fuel:6000,S:46.5,CLa:4.3,cd0:.0182,k:.12,mil:115600,ab:195800,spool:1.4,gLim:9,aoaLim:30,roll:4.8,fbw:true,
    rcs:.5,irs:1.15,dW:25600,ff:[.28,2.3,10],
    radar:R('KF-21 AESA',85*NM,[10,20,40,80,160],'NM',.9,{aesa:1,beam:2.8*D}),irst:true,ols:{tail:70000,head:30000,lrf:0},twsN:8,trkN:20,
    gun:G_('M61A2',100,1050,9,500,.0022),tank:1800},
  stn:{1:['IRIS-T','AIM-9X'],9:['IRIS-T','AIM-9X'],2:['IRIS-T','AIM-9X','AIM-120C','Meteor'],8:['IRIS-T','AIM-9X','AIM-120C','Meteor'],
       3:['TK','AIM-120C','Meteor','GBU-12','GBU-31','GBU-38','Mk-82','Taurus'],7:['TK','AIM-120C','Meteor','GBU-12','GBU-31','GBU-38','Mk-82','Taurus'],
       4:['Meteor','AIM-120C'],6:['Meteor','AIM-120C'],'4b':['Meteor','AIM-120C'],'6b':['Meteor','AIM-120C'],5:['PTB','TK'],'5R':['TGP'],'5L':[],'3b':[],'3c':[],'4c':[],'6c':[],'7b':[],'7c':[]},
  load:{modern:{1:'IRIS-T',9:'IRIS-T',4:'Meteor',6:'Meteor','4b':'Meteor','6b':'Meteor',3:'TK',7:'TK'},strike:{1:'IRIS-T',9:'IRIS-T',4:'Meteor',6:'Meteor',3:'GBU-31',7:'GBU-31',5:'PTB'}},cms:[60,60]});

/* ======================================================================================================================
   RED
   ====================================================================================================================== */

// ---- MiG-35S: 2× RD-33MK (53 / 88.3 kN, smokeless), Zhuk-AE AESA, OLS-UEM, R-77-1 / R-74M, Kh-29 / Kh-31 / KAB ----
addM({id:'MiG-35',src:'MiG-29SMT',side:'RED',call:'FULCRUM-F',nctr:'MIG-29',foe:'F-16C',eng:'2× RD-33MK',hms:'HMS_ALWAYS',irstn:'OLS-UEM',ccip:true,
  role:'RUSSIA · MULTIROLE · ZHUK-AE AESA · OLS-UEM · R-77-1 / R-74M',
  ac:{name:'MiG-35S',empty:11000,fuel:4800,mil:106000,ab:176600,fbw:true,gLim:9,aoaLim:28,rcs:4,
    radar:R('Zhuk-AE',70*NM,[10,25,50,100,200],'KM',.88,{aesa:1,beam:3*D}),irst:true,ols:{tail:55000,head:15000,lrf:20000},twsN:4,trkN:30},
  add:{1:['R-74M'],6:['R-74M'],2:['R-74M','R-77-1','Kh-29T','Kh-29L','Kh-31A','Kh-31P','KAB-500Kr'],5:['R-74M','R-77-1','Kh-29T','Kh-29L','Kh-31A','Kh-31P','KAB-500Kr'],
       3:['R-77-1','Kh-29T','Kh-29L','Kh-31A','Kh-31P','KAB-500Kr','FAB-500'],4:['R-77-1','Kh-29T','Kh-29L','Kh-31A','Kh-31P','KAB-500Kr','FAB-500']},
  load:{modern:{1:'R-74M',6:'R-74M',2:'R-77-1',5:'R-77-1',3:'R-77-1',4:'R-77-1',C:'PTB'},strike:{1:'R-74M',6:'R-74M',2:'R-77-1',5:'R-77-1',3:'Kh-31P',4:'Kh-29T',C:'PTB'}},cms:[60,60]});

// ---- Su-30MKI: Su-30SM's ancestor (canards, AL-31FP TVC, N011M Bars, OLS-30) with Indian / Israeli / French kit: Astra, BrahMos-A, R-77, R-73 ----
addM({id:'Su-30MKI',src:'Su-30SM',side:'RED',call:'FLANKER-H',nctr:'SU-30',foe:'F-16C',eng:'2× AL-31FP',crew:'WSO',hms:'HMS_ALWAYS',irstn:'OLS-30',ccip:true,
  role:'INDIA · TWO-SEAT AIR SUPERIORITY / STRIKE · N011M BARS PESA · TVC · ASTRA / BRAHMOS-A',
  ac:{name:'Su-30MKI',empty:18400,fuel:9640},
  drop:['R-77-1','R-77M','R-37M','R-74M','R-74M2','Kh-38MT','Kh-59MK2','Kh-31PD','Kh-31AD','Kh-35D','P-800','UPAB-500B','UPAB-1500B','Grom-2','T220'],
  add:{3:['Astra'],4:['Astra'],5:['Astra','BrahMos-A'],6:['Astra'],7:['Astra'],8:['Astra'],11:['Astra'],12:['Astra']},
  load:{modern:{1:'R-73',10:'R-73',2:'R-73',9:'R-73',3:'Astra',8:'Astra',4:'R-27ER',7:'R-27ER',11:'R-77',12:'R-77',5:'R-77',6:'R-77'},
        strike:{1:'R-73',10:'R-73',3:'Astra',8:'Astra',5:'BrahMos-A',4:'KAB-500L',7:'KAB-500L'}},cms:[96,96]});

// ---- Su-30MKM: Malaysian Su-30MKI derivative (N011M, OLS-30, MAWS-300 / L-150, Damocles) ----
addM({id:'Su-30MKM',src:'Su-30SM',side:'RED',call:'FLANKER-H',nctr:'SU-30',foe:'F-18C',eng:'2× AL-31FP',crew:'WSO',hms:'HMS_ALWAYS',irstn:'OLS-30',ccip:true,
  role:'MALAYSIA · TWO-SEAT MULTIROLE · N011M BARS PESA · TVC · R-77 / Kh-31 / KAB',
  ac:{name:'Su-30MKM',empty:18400,fuel:9640},
  drop:['R-77-1','R-77M','R-37M','R-74M','R-74M2','Kh-38MT','Kh-59MK2','Kh-31PD','Kh-31AD','Kh-35D','P-800','UPAB-500B','UPAB-1500B','Grom-2'],
  load:{modern:{1:'R-73',10:'R-73',2:'R-73',9:'R-73',3:'R-77',8:'R-77',4:'R-27ER',7:'R-27ER',11:'R-77',12:'R-77'},
        strike:{1:'R-73',10:'R-73',3:'R-77',8:'R-77',4:'Kh-31A',7:'Kh-31P',11:'KAB-500Kr',12:'KAB-500Kr'}},cms:[96,96]});

// ---- Su-34 'Fullback': side-by-side two-seat strike, 2× AL-31F-M1 (75 / 132 kN), Sh141 (V004) PESA, Khibiny L-175V, 12 stations, 8,000 kg ----
addM({id:'Su-34',src:'Su-30SM',side:'RED',call:'FULLBACK',nctr:'SU-34',foe:'F-16C',eng:'2× AL-31F-M1',crew:'WSO',hms:'HMS_ALWAYS',ccip:true,
  role:'RUSSIA · FIGHTER-BOMBER · Sh141 PESA · KHIBINY · PILOT + NAVIGATOR SIDE BY SIDE',stall:{s:.1,twin:1},
  ac:{name:'Su-34',empty:22500,fuel:12100,mil:150000,ab:264800,S:62.04,CLa:4.4,cd0:.0215,k:.125,gLim:7,aoaLim:24,roll:3,rcs:15,irs:1.5,dW:45100,ff:[.4,3.2,14],
    radar:R('Sh141',48*NM,[10,25,50,100,200],'KM',.7,{pesa:1,beam:3.2*D}),irst:false,ols:undefined,twsN:4,trkN:10,gun:G_('GSh-30-1',25,860,26,180,.003)},
  del:['tvc','ols'],
  drop:['R-27R','R-27T','R-27ER','R-27ET','R-37M','R-77M'],
  ecm:{cold:{n:'L-175V Khibiny',jp:2.2,dec:.85,kg:0,cd:0,warm:12},modern:{n:'L-175V Khibiny',jp:2.4,dec:.88,kg:0,cd:0,warm:12}},
  load:{modern:{1:'R-73',10:'R-73',3:'R-77-1',8:'R-77-1',4:'Kh-59MK2',7:'Kh-59MK2',11:'KAB-500L',12:'KAB-500L'},
        strike:{1:'R-73',10:'R-73',3:'R-77-1',8:'R-77-1',4:'KAB-1500L',7:'KAB-1500L',11:'Kh-29L',12:'Kh-29L',5:'Kh-38MT'}},cms:[96,96]});

// ---- Su-57: 2× AL-41F1 (izd. 117: 88.3 / 147.1 kN), 3D TVC, N036 Byelka AESA (nose + cheek arrays), 101KS-V IRST; bays: 4 R-77M + 2 R-74M2 ----
addM({id:'Su-57',src:'Su-35S',side:'RED',call:'FELON',nctr:'SU-57',foe:'F-22',eng:'2× AL-41F1 (117)',hms:'HMS_ALWAYS',irstn:'101KS-V',ccip:true,
  role:'RUSSIA · 5TH-GEN AIR SUPERIORITY · N036 BYELKA AESA · 101KS-V · 3D TVC · INTERNAL BAYS',
  ac:{name:'Su-57',empty:18000,fuel:10300,S:78.8,CLa:4.6,cd0:.0175,k:.115,mil:176600,ab:294200,gLim:9,aoaLim:40,rcs:.3,irs:1.3,dW:35000,tvc:{pitch:15,yaw:15},
    radar:R('N036 Byelka',115*NM,[10,25,50,100,200,400],'KM',.9,{aesa:1,beam:2.4*D}),irst:true,ols:{tail:90000,head:35000,lrf:20000},twsN:8,trkN:60},
  stn:{1:['R-74M2','R-74M'],10:['R-74M2','R-74M'],5:['R-77M','R-77-1','Kh-38MT','KAB-500Kr','KAB-500L','Grom-2'],6:['R-77M','R-77-1','Kh-38MT','KAB-500Kr','KAB-500L','Grom-2'],
       '5B':['R-77M','R-77-1'],'6B':['R-77M','R-77-1'],2:['R-74M2','R-77-1'],9:['R-74M2','R-77-1'],
       3:['R-77-1','R-37M','Kh-59MK2','Kh-31P','Kh-31A','Kh-35U','KAB-1500L'],8:['R-77-1','R-37M','Kh-59MK2','Kh-31P','Kh-31A','Kh-35U','KAB-1500L'],
       4:['R-77-1','Kh-59MK2','KAB-500L'],7:['R-77-1','Kh-59MK2','KAB-500L'],11:[],12:[]},
  ecm:{cold:{n:'Himalayas (L402)',jp:2.2,dec:.9,kg:0,cd:0,warm:10},modern:{n:'Himalayas (L402)',jp:2.4,dec:.9,kg:0,cd:0,warm:10}},
  load:{modern:{1:'R-74M2',10:'R-74M2',5:'R-77M',6:'R-77M','5B':'R-77M','6B':'R-77M'},strike:{1:'R-74M2',10:'R-74M2',5:'Kh-38MT',6:'Kh-38MT','5B':'R-77M','6B':'R-77M'}},cms:[96,96],gim:[60,60,60,1]});

// ---- J-10C: WS-10B (≈79 / 132 kN), KLJ-7A AESA, IRST ahead of the canopy, PL-15 / PL-10, 11 hardpoints ----
addM({id:'J-10C',src:'MiG-29SMT',side:'RED',call:'FIREBIRD',nctr:'J-10',foe:'F-16C',eng:'WS-10B',hms:'HMS_ALWAYS',irstn:'J-10C IRST',ccip:true,
  role:'CHINA · MULTIROLE · KLJ-7A AESA · IRST · PL-15 / PL-10',stall:{s:.04,twin:0},
  ac:{name:'J-10C',empty:9750,fuel:4950,S:39,CLa:4.4,cd0:.0175,k:.12,mil:79000,ab:132000,spool:1.6,gLim:9,aoaLim:30,roll:5,fbw:true,rcs:1.5,irs:1.1,dW:19300,ff:[.22,2.0,9.5],
    radar:R('KLJ-7A',75*NM,[10,25,50,100,200],'KM',.88,{aesa:1,beam:3*D}),irst:true,ols:{tail:50000,head:20000,lrf:12000},twsN:4,trkN:15,
    gun:G_('GSh-23 (Type 23-3)',57,715,12,200,.0032)},
  stn:{1:CN_IR,6:CN_IR,2:[...CN_IR,...CN_BVR,'LS-6','LS-500J'],5:[...CN_IR,...CN_BVR,'LS-6','LS-500J'],3:['PTB',...CN_BVR,...CN_AG],4:['PTB',...CN_BVR,...CN_AG],C:['PTB','LS-500J','FAB-500']},
  load:{modern:{1:'PL-10',6:'PL-10',2:'PL-15',5:'PL-15',3:'PL-15',4:'PL-15',C:'PTB'},strike:{1:'PL-10',6:'PL-10',2:'PL-15',5:'PL-15',3:'LS-6',4:'LS-6',C:'PTB'}},cms:[60,60]});

// ---- J-16: Chinese Su-30MKK derivative, 2× WS-10A, AESA, IRST, no TVC / canards, 12 stations ----
addM({id:'J-16',src:'Su-30SM',side:'RED',call:'FLANKER-N',nctr:'SU-30',foe:'F-15E',eng:'2× WS-10A',crew:'WSO',hms:'HMS_ALWAYS',irstn:'J-16 IRST',ccip:true,
  role:'CHINA · TWO-SEAT STRIKE FIGHTER · AESA · PL-15 / PL-10 · YJ-83K / KD-88',
  ac:{name:'J-16',empty:17700,fuel:9400,mil:152000,ab:264000,gLim:8.5,aoaLim:26,rcs:12,
    radar:R('J-16 AESA',100*NM,[10,25,50,100,200],'KM',.9,{aesa:1,beam:2.6*D}),irst:true,ols:{tail:60000,head:25000,lrf:15000},twsN:6,trkN:20},
  del:['tvc'],map:toCN,drop:['T220'],
  load:{modern:{1:'PL-10',10:'PL-10',2:'PL-10',9:'PL-10',3:'PL-15',8:'PL-15',4:'PL-15',7:'PL-15',11:'PL-15',12:'PL-15',5:'PL-15',6:'PL-15'},
        strike:{1:'PL-10',10:'PL-10',3:'PL-15',8:'PL-15',4:'YJ-83K',7:'YJ-83K',11:'LS-500J',12:'LS-500J'}},cms:[96,96],gim:[60,60,60,1]});

// ---- J-15T: CATOBAR J-15 (Su-33 airframe) with AESA, WS-10H, PL-15 / PL-10 ----
addM({id:'J-15T',src:'Su-33',side:'RED',call:'FLYING SHARK',nctr:'SU-33',foe:'F-18E',eng:'2× WS-10H',hms:'HMS_ALWAYS',irstn:'OLS-27',ccip:true,
  role:'CHINA · CARRIER FIGHTER (CATOBAR) · AESA · PL-15 / PL-10 · YJ-83K',
  ac:{name:'J-15T',empty:17500,fuel:9500,mil:152000,ab:264000,rcs:12,
    radar:R('J-15 AESA',90*NM,[10,25,50,100,200],'KM',.88,{aesa:1,beam:2.8*D}),irst:true,ols:{tail:40000,head:18000,lrf:12000},twsN:6,trkN:20},
  map:toCN,add:{3:['YJ-83K','KD-88','LS-500J'],8:['YJ-83K','KD-88','LS-500J'],4:['YJ-83K','LS-500J'],7:['YJ-83K','LS-500J']},
  load:{modern:{1:'PL-10',10:'PL-10',2:'PL-10',9:'PL-10',3:'PL-15',8:'PL-15',4:'PL-15',7:'PL-15',5:'PL-15',6:'PL-15',11:'PL-15',12:'PL-15'},
        strike:{1:'PL-10',10:'PL-10',2:'PL-10',9:'PL-10',3:'YJ-83K',8:'YJ-83K',5:'PL-15',6:'PL-15'}},cms:[60,60],gim:[60,60,60,1]});

// ---- J-20A: 2× WS-10C, Type 1475 AESA, EODAS + EOTS, internal: 4 PL-15 (main bay) + 2 PL-10 (side bays), no gun ----
addM({id:'J-20',src:'Su-35S',side:'RED',call:'MIGHTY DRAGON',nctr:'J-20',foe:'F-22',eng:'2× WS-10C',hms:'HMS_ALWAYS',irstn:'EODAS / EOTS',ccip:true,
  role:'CHINA · 5TH-GEN AIR SUPERIORITY · TYPE 1475 AESA · EODAS · INTERNAL BAYS · NO GUN',
  ac:{name:'J-20A',empty:19400,fuel:12000,S:73,CLa:4.4,cd0:.017,k:.12,mil:170000,ab:284000,gLim:9,aoaLim:30,rcs:.05,irs:1.3,dW:37000,
    radar:R('Type 1475',110*NM,[10,25,50,100,200,400],'KM',.9,{aesa:1,beam:2.4*D}),irst:true,ols:{tail:80000,head:30000,lrf:20000},twsN:8,trkN:30,gun:NOGUN},
  del:['tvc'],
  stn:{1:['PL-10','PL-8'],10:['PL-10','PL-8'],5:['PL-15','PL-12','LS-6'],6:['PL-15','PL-12','LS-6'],'5B':['PL-15','PL-12'],'6B':['PL-15','PL-12'],
       3:['PL-15'],8:['PL-15'],2:[],9:[],4:[],7:[],11:[],12:[]},
  ecm:{cold:{n:'J-20 integrated EW',jp:2,dec:.88,kg:0,cd:0,warm:10},modern:{n:'J-20 integrated EW',jp:2.2,dec:.9,kg:0,cd:0,warm:10}},
  load:{modern:{1:'PL-10',10:'PL-10',5:'PL-15',6:'PL-15','5B':'PL-15','6B':'PL-15'},strike:{1:'PL-10',10:'PL-10',5:'LS-6',6:'LS-6','5B':'PL-15','6B':'PL-15'}},cms:[96,96],gim:[60,60,60,1]});

// ---- JF-17 Block III: RD-93 (49.4 / 84.4 kN), KLJ-7A AESA, HMD, PL-15 / PL-10, CM-400AKG, C-802AK ----
addM({id:'JF-17',src:'MiG-29SMT',side:'RED',call:'THUNDER',nctr:'JF-17',foe:'F-16C',eng:'Klimov RD-93',hms:'HMS_ALWAYS',ccip:true,
  role:'PAKISTAN / CHINA · LIGHT MULTIROLE · BLOCK III · KLJ-7A AESA · PL-15 / PL-10 · CM-400AKG',stall:{s:.1,twin:0},
  ac:{name:'JF-17 Thunder Block III',empty:6586,fuel:2330,S:24.43,CLa:4.2,cd0:.0185,k:.13,mil:49400,ab:84400,spool:2,gLim:8.5,aoaLim:26,roll:4.5,fbw:true,rcs:2,irs:1.0,dW:12700,ff:[.14,1.2,5.6],
    radar:R('KLJ-7A',65*NM,[10,25,50,100,200],'KM',.85,{aesa:1,beam:3*D}),irst:false,ols:undefined,twsN:4,trkN:15,
    gun:G_('GSh-23-2',57,715,12,200,.0032)},
  del:['ols'],
  stn:{1:['PL-10','PL-5E','PL-8'],6:['PL-10','PL-5E','PL-8'],2:['PL-15','PL-12','PL-10','PL-5E','LS-6','GBU-12','Mk-82','Mk-84'],5:['PL-15','PL-12','PL-10','PL-5E','LS-6','GBU-12','Mk-82','Mk-84'],
       3:['PTB','PL-15','PL-12','CM-400AKG','YJ-83K','LS-6','LS-500J','Mk-84'],4:['PTB','PL-15','PL-12','CM-400AKG','YJ-83K','LS-6','LS-500J','Mk-84'],C:['PTB','Mk-84']},
  load:{modern:{1:'PL-10',6:'PL-10',2:'PL-15',5:'PL-15',3:'PTB',4:'PTB'},strike:{1:'PL-10',6:'PL-10',2:'PL-15',5:'PL-15',3:'CM-400AKG',4:'CM-400AKG',C:'PTB'}},cms:[60,60]});

// ---- Yak-130: 2× AI-222-25 (24.5 kN), no afterburner, digital FBW to ~35-40° AoA, no radar, 9 stations ----
addM({id:'Yak-130',src:'MiG-29SMT',side:'RED',call:'MITTEN',nctr:'YAK-130',foe:'F-5E',eng:'2× AI-222-25',hms:'HMS_ALWAYS',ccip:true,noAB:true,dl:false,
  role:'RUSSIA · ADVANCED TRAINER / LIGHT ATTACK · FBW · NO RADAR · NO AFTERBURNER',stall:{s:.05,twin:1},
  ac:{name:'Yak-130',empty:4600,fuel:1700,S:23.5,CLa:4.6,cd0:.024,k:.11,mil:49000,ab:49000,abLight:99,spool:2.2,gLim:8,aoaLim:35,roll:4.5,fbw:true,rcs:2,irs:.8,dW:10290,ff:[.1,.75,.75],vne:1050,
    radar:R('none',2000,[1,2],'KM',.02),noRdr:true,pulse:true,irst:false,ols:undefined,gun:NOGUN},
  del:['ols'],
  stn:{1:['R-73','R-60M'],6:['R-73','R-60M'],2:['FAB-250','OFAB-250','B-8M1','KAB-500Kr'],5:['FAB-250','OFAB-250','B-8M1','KAB-500Kr'],3:['PTB','FAB-500','FAB-250','B-8M1','KAB-500Kr'],4:['PTB','FAB-500','FAB-250','B-8M1','KAB-500Kr'],C:[]},
  load:{modern:{1:'R-73',6:'R-73',3:'PTB',4:'PTB'},strike:{1:'R-73',6:'R-73',2:'OFAB-250',5:'OFAB-250',3:'B-8M1',4:'B-8M1'}},cms:[0,0]});

/* ---------------- 5. family hooks: Flanker glass-cockpit family, campaign pools, menu order ---------------- */
try{if(typeof SMX==='function'){const _smx=SMX,FAM=new Set(['Su-30MKI','Su-30MKM','Su-34','Su-57','J-16','J-20']);SMX=function(t){return FAM.has(t)||_smx(t);};}}catch(e){console.warn('[modern] SMX',e);}
for(const s of NEW)if(!AC[FOE[s.id]])FOE[s.id]=s.side==='RED'?'F-16C':'Su-27';
try{const pool={'F-15EX':['CAP','INT','ESC','STK'],'F-18F':['CAP','STK'],'EA-18G':['STK'],'F-22':['CAP','ESC','INT'],'F-35A':['CAP','STK'],'A-10C':['STK'],'F-2A':['STK','CAP'],
  'EF-2000':['CAP','ESC','INT'],'Rafale':['CAP','STK','ESC'],'Mirage 2000-5':['CAP','INT'],'JAS-39C':['CAP'],'JAS-39E':['CAP','ESC'],'KF-21':['CAP','ESC'],
  'MiG-35':['CAP','STK'],'Su-30MKI':['CAP','ESC'],'Su-30MKM':['CAP'],'Su-34':['STK'],'Su-57':['CAP','ESC','INT'],'J-10C':['CAP','ESC'],'J-16':['CAP','STK'],'J-15T':['CAP'],'J-20':['CAP','INT'],'JF-17':['CAP','STK'],'Yak-130':['STK']};
  for(const s of NEW){const side=s.side==='RED'?1:0,T=CTYPES.modern&&CTYPES.modern[side];if(!T)continue;for(const r of pool[s.id]||[])if(T[r]&&!T[r].includes(s.id))T[r].push(s.id);}}catch(e){console.warn('[modern] campaign',e);}
// the twin / single-engine set and start-up family follow the parent unless the parent is a different engine count
window.MODERN_NEW=NEW.map(s=>s.id);
window.MJ={addM,aam,ag,uniq,toCN,R,G_,NOGUN,SH,sustain,US_AAM,US_AG,EU_IR,EU_BVR,EU_AG,FR_AAM,FR_AG,CN_IR,CN_BVR,CN_AG,RU_AG,NEW};
console.info('[modern] added '+NEW.length+' jets: '+window.MODERN_NEW.join(', '));
})();
