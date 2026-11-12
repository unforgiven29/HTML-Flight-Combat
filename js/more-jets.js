/* =====================================================================================================================
   v283 — Hangar expansion: more Cold War and modern jets (US, UK, Sweden, France, Israel, Taiwan, Korea, Italy, India,
   USSR / Russia, China). Uses the helpers exported by modern-jets.js (window.MJ): every jet is a clone of the closest
   existing airframe (cockpit, HUD and 3D model are the parent's for now) with its own flight model numbers, radar, IRST,
   gun, ECM, stations and loadouts. Figures are from public data; anything never published is an estimate.
   ===================================================================================================================== */
(function(){
'use strict';
const M=window.MJ;if(!M){console.warn('[more] modern-jets.js helpers missing');return;}
const {addM,aam,ag,toCN,R,G_,NOGUN,CN_IR,CN_BVR,CN_AG}=M;
const D=D2R,n0=M.NEW.length;

/* ---------------- missiles ---------------- */
try{
  aam('AIM-4A','AIM-4F',{mass:54,acc:140,burn:1.9,aiR:7000,life:25},null,.163,'4A','Falcon AIM-4A · SARH');
  aam('AIM-4D','AIM-4G',{mass:61,irR:9000,gimbal:35*D,maxG:10,aiR:8000},null,.163,'4D','Falcon AIM-4D · IR');
  aam('Shafrir 2','AIM-9D',{mass:93,irR:6000,front:.05,aiR:5000},null,.16,'SHF2','Shafrir 2 · rear-aspect IR');
  aam('Python 3','PL-8',{},null,.16,'PY3','Python 3 · all-aspect IR');
  aam('Python 5','AIM-9X',{mass:105,gimbal:100*D,irR:20000,aiR:16000,trk:1.7},null,.16,'PY5','Python 5 · imaging IR, LOAL');
  aam('Derby','AIM-120C',{mass:118,aiR:25000,life:60,maxG:45},null,.16,'DRBY','Derby · active radar');
  aam('I-Derby ER','AIM-120D',{mass:125,aiR:45000,life:110},null,.16,'IDER','I-Derby ER · dual-pulse active radar');
  aam('Sky Flash','AIM-7E-2',{mass:193,ecc:.35,res:.66,aiR:20000,acc:130},null,.203,'SKYF','Sky Flash · monopulse SARH');
  aam('Rb 71','Sky Flash',{},null,.203,'R71','Rb 71 (Sky Flash) · SARH');
  aam('Rb 99','AIM-120B',{},null,.178,'R99','Rb 99 (AIM-120B) · active radar');
  aam('R-98R','R-40RD',{mass:292,acc:110,burn:5,aiR:16000,maxG:12,life:40},null,.275,'R98R','R-98R (AA-3 Anab) · SARH','98Р');
  aam('R-98T','R-40TD',{mass:292,irR:7000,front:.05,aiR:12000,maxG:12},null,.275,'R98T','R-98T (AA-3 Anab) · IR','98Т');
  aam('R-4R','R-40RD',{mass:483,acc:90,burn:6,aiR:20000,maxG:8,life:50},null,.31,'R4R','R-4R (AA-5 Ash) · SARH','4Р');
  aam('R-4T','R-40TD',{mass:483,irR:8000,front:.05,aiR:15000,maxG:8},null,.31,'R4T','R-4T (AA-5 Ash) · IR','4Т');
  aam('PL-2','R-3S',{},null,.127,'PL2','PL-2 · IR (K-13 copy)');
  aam('Tien Chien I','AIM-9P',{mass:90,irR:11000,front:.4,aiR:9000},null,.127,'TC1','Tien Chien I · all-aspect IR');
  aam('Tien Chien II','AIM-120B',{mass:190,aiR:28000},null,.203,'TC2','Tien Chien II · active radar');
  // these Cold War rounds are not modern-only
  for(const k of['AIM-4A','AIM-4D','Shafrir 2','Python 3','Sky Flash','Rb 71','R-98R','R-98T','R-4R','R-4T','PL-2','Tien Chien I'])MODERN_ONLY.delete(k);
}catch(e){console.warn('[more] AAMs',e);}
try{
  ag('Sea Eagle','Kh-35U',{mass:600,L:4.14,R:.2,range:110000},'SEAG','Sea Eagle · anti-ship');
  ag('ALARM','AGM-88B',{mass:268,L:4.24,R:.11},'ALRM','ALARM · anti-radiation');
  ag('Brimstone','AGM-65E',{mass:50,L:1.8,R:.09,dmg:90,soft:12,hard:5,range:20000,lockR:12000},'BRIM','Brimstone · MMW / laser');
  ag('Spice-1000','GBU-31',{mass:450,dmg:280},'SPICE','SPICE 1000 · EO / GPS glide');
  ag('Vikhr','Kh-25ML',{mass:45,L:2.8,R:.065,dmg:60,soft:8,hard:6,range:10000,lockR:10000},'VIKR','9K121 Vikhr · laser beam-rider');
}catch(e){console.warn('[more] AG',e);}

const SW_OLD=['AIM-9B','AIM-9D','AIM-9G'],SP_OLD=['AIM-7E','AIM-7E-2','AIM-7F'];
const IMP={units:'imp'},MET={units:'met'};

/* ======================================================================================================================
   COLD WAR — BLUE
   ====================================================================================================================== */
// F-4J: USN Phantom, 2× J79-GE-10 (52.8 / 79.6 kN), AWG-10 pulse-doppler, no gun, carrier
addM({id:'F-4J',src:'F-4E',side:'BLUE',call:'PHANTOM',nctr:'F-4',foe:'MiG-21',eng:'2× J79-GE-10',crew:'RIO',cv:true,app:137,
  role:'USN / USMC · FLEET DEFENCE · AWG-10 PULSE-DOPPLER · NO GUN',
  ac:{name:'F-4J Phantom II',empty:13760,mil:105600,ab:159200,radar:R('AWG-10',48*NM,[10,25,50,100,200],'NM',.45),pulse:false,gun:NOGUN},
  drop:['AIM-9E','AIM-9J','AIM-9P','AIM-7P','ALQ-131','AGM-65D','AGM-65G','AGM-65H'],
  load:{cold:{2:'AIM-9G',8:'AIM-9G','2b':'AIM-9G','8b':'AIM-9G',3:'AIM-7F',4:'AIM-7F',6:'AIM-7F',7:'AIM-7F',C:'PTB'},modern:{2:'AIM-9L',8:'AIM-9L','2b':'AIM-9L','8b':'AIM-9L',3:'AIM-7F',4:'AIM-7F',6:'AIM-7F',7:'AIM-7F',C:'PTB'},
        strike:{2:'AIM-9G',8:'AIM-9G',1:'Mk-82',9:'Mk-82',3:'AIM-7F',4:'AIM-7F',C:'PTB'}}});

// F-4B: early USN Phantom, 2× J79-GE-8 (48.5 / 75.6 kN), APQ-72 pulse radar, no gun
addM({id:'F-4B',src:'F-4E',side:'BLUE',call:'PHANTOM',nctr:'F-4',foe:'MiG-17F',eng:'2× J79-GE-8',crew:'RIO',cv:true,app:137,
  role:'USN · FLEET DEFENCE (VIETNAM) · APQ-72 PULSE RADAR · NO GUN',
  ac:{name:'F-4B Phantom II',empty:12700,mil:97000,ab:151200,radar:R('APQ-72',25*NM,[5,10,25,50],'NM',.05),pulse:true,gun:NOGUN},
  drop:['AIM-9E','AIM-9J','AIM-9P','AIM-9L','AIM-9M','AIM-7F','AIM-7M','AIM-7P','ALQ-131','AGM-65A','AGM-65B','AGM-65D','AGM-65G','AGM-65H','GBU-10','GBU-12','GBU-24','CBU-87'],
  load:{cold:{2:'AIM-9D',8:'AIM-9D','2b':'AIM-9D','8b':'AIM-9D',3:'AIM-7E',4:'AIM-7E',6:'AIM-7E',7:'AIM-7E',C:'PTB'},strike:{2:'AIM-9D',8:'AIM-9D',1:'Mk-82',9:'Mk-82',3:'AIM-7E',4:'AIM-7E',C:'PTB'}}});

// F-101B Voodoo: 2× J57-P-55 (52 / 75.2 kN), MG-13 FCS, AIR-2A Genie + AIM-4D, crew of two
addM({id:'F-101B',src:'F-106A',side:'BLUE',call:'VOODOO',nctr:'F-101',foe:'Tu-128',eng:'2× J57-P-55',crew:'RIO',
  role:'ADC · INTERCEPTOR · MG-13 · AIR-2A GENIE / AIM-4 FALCON · PILOT + RO',stall:{s:.25,twin:1},
  ac:{name:'F-101B Voodoo',empty:12925,fuel:6300,S:34.2,CLa:3.6,cd0:.0205,k:.16,mil:104000,ab:150400,spool:3,gLim:6.33,aoaLim:16,roll:3.0,fbw:false,noLimiter:true,
    rcs:12,irs:1.4,radar:R('MG-13',25*NM,[5,10,25,50],'NM',.05),pulse:true,gun:NOGUN,dep:{a:17,rock:1.2,spin:2.6}},
  stn:{1:['AIM-4A','AIM-4D','AIM-4F','AIM-4G'],2:['AIM-4A','AIM-4D','AIM-4F','AIM-4G'],3:[],4:[],G:['AIR-2A']},
  load:{cold:{1:'AIM-4D',2:'AIM-4D',G:'AIR-2A',5:'TK',6:'TK'}}});

// F-102A Delta Dagger: J57-P-23 (52 / 71.2 kN), MG-10, AIM-4A / AIM-4C (here AIM-4D), no gun, no Genie
addM({id:'F-102A',src:'F-106A',side:'BLUE',call:'DEUCE',nctr:'F-102',foe:'MiG-17F',eng:'J57-P-23',
  role:'ADC · INTERCEPTOR · MG-10 · AIM-4 FALCON · DELTA WING',
  ac:{name:'F-102A Delta Dagger',empty:8777,fuel:3300,S:61.5,mil:52000,ab:71200,gLim:6.5,roll:3.5,rcs:8,irs:1.1,
    radar:R('MG-10',18*NM,[5,10,25],'NM',.05),pulse:true,gun:NOGUN},
  stn:{1:['AIM-4A','AIM-4D'],2:['AIM-4A','AIM-4D'],3:['AIM-4A','AIM-4D'],4:['AIM-4A','AIM-4D'],G:[]},
  load:{cold:{1:'AIM-4A',2:'AIM-4A',3:'AIM-4D',4:'AIM-4D',5:'TK',6:'TK'}}});

// F-105D Thunderchief: J75-P-19W (73.4 / 117.9 kN), R-14A / NASARR, M61, bomb bay + 5 stations
addM({id:'F-105D',src:'F-104S',side:'BLUE',call:'THUD',nctr:'F-105',foe:'MiG-21',eng:'J75-P-19W',ccip:true,
  role:'USAF · NUCLEAR / CONVENTIONAL STRIKE (VIETNAM) · R-14A · M61',stall:{s:.12,twin:0},
  ac:{name:'F-105D Thunderchief',empty:12470,fuel:3500,S:35.8,CLa:3.4,cd0:.019,k:.17,mil:73400,ab:117900,spool:2.8,gLim:8.67,aoaLim:20,roll:3.6,
    rcs:9,irs:1.5,dW:23800,radar:R('R-14A',15*NM,[5,10,25],'NM',.03),pulse:true,noHudRdr:true,gun:G_('M61A1',100,1030,9,1028,.0026)},
  stn:{1:['AIM-9B','AIM-9E','AGM-45A','LAU-10'],9:['AIM-9B','AIM-9E','AGM-45A','LAU-10'],2:['TK','Mk-82','Mk-83','Mk-84','AGM-45A','LAU-10','CBU-87'],8:['TK','Mk-82','Mk-83','Mk-84','AGM-45A','LAU-10','CBU-87'],
       3:['Mk-82','Mk-83','LAU-10'],7:['Mk-82','Mk-83','LAU-10'],4:[],6:[],C:['PTB','Mk-82','Mk-83','Mk-84']},
  load:{cold:{2:'TK',8:'TK',C:'Mk-84'},strike:{2:'TK',8:'TK',C:'Mk-84',3:'Mk-82',7:'Mk-82'}},cms:[0,0]});

// F-104G Starfighter: J79-GE-11A (44.5 / 69.8 kN), NASARR F15A-41B, AIM-9B / J, strike role
addM({id:'F-104G',src:'F-104S',side:'BLUE',call:'STARFIGHTER',nctr:'F-104',foe:'MiG-21',eng:'J79-GE-11A',ccip:true,
  role:'NATO · STRIKE FIGHTER · NASARR F15A · AIM-9B / J · M61',
  ac:{name:'F-104G Starfighter',empty:6350,mil:44500,ab:69800,radar:R('NASARR F15A-41B',15*NM,[5,10,25],'NM',.04),pulse:true},
  drop:['Aspide','AIM-7E','AIM-7E-2','AIM-7F','AIM-9L','AIM-9M','AIM-9P'],
  load:{cold:{1:'AIM-9B',9:'AIM-9B',C:'PTB'},modern:{1:'AIM-9J',9:'AIM-9J',C:'PTB'},strike:{1:'AIM-9B',9:'AIM-9B',2:'Mk-82',8:'Mk-82',C:'Mk-83'}}});

// F-5A Freedom Fighter: 2× J85-GE-13 (12.1 / 18.2 kN), no radar, 2× M39
addM({id:'F-5A',src:'F-5E',side:'BLUE',call:'FREEDOM',nctr:'F-5',foe:'MiG-21',eng:'2× J85-GE-13',ccip:true,
  role:'US MAP · LIGHT FIGHTER · NO RADAR · 2× M39 · AIM-9B',
  ac:{name:'F-5A Freedom Fighter',empty:3667,fuel:1770,S:15.79,mil:24200,ab:36400,gLim:7.33,roll:4.2,
    radar:R('none (optical sight)',2000,[1,2],'NM',.02),noRdr:true,pulse:true},
  drop:['AIM-9L','AIM-9M','AIM-9P','AGM-65A','AGM-65B'],
  load:{cold:{1:'AIM-9B',7:'AIM-9B',C:'PTB'},modern:{1:'AIM-9J',7:'AIM-9J',C:'PTB'},strike:{1:'AIM-9B',7:'AIM-9B',2:'Mk-82',6:'Mk-82',3:'Mk-82',5:'Mk-82'}}});

// A-6E Intruder: 2× J52-P-8B (41.4 kN, no afterburner), APQ-156 multimode + TRAM turret, crew of two, carrier
addM({id:'A-6E',src:'F-111F',side:'BLUE',call:'INTRUDER',nctr:'A-6',foe:'MiG-23',eng:'2× J52-P-8B',crew:'B/N',cv:true,app:125,noAB:true,ccip:true,
  role:'USN / USMC · ALL-WEATHER ATTACK · APQ-156 · TRAM · PILOT + B/N · NO GUN',
  ac:{name:'A-6E Intruder',empty:12525,fuel:7230,S:49.1,CLa:4.5,cd0:.026,k:.1,mil:82800,ab:82800,abLight:99,spool:3.2,gLim:6.5,aoaLim:20,roll:2.6,fbw:false,noLimiter:true,
    rcs:12,irs:1.2,dW:27400,ff:[.3,2.2,2.2],radar:R('APQ-156',20*NM,[5,10,20,40],'NM',.05),pulse:true,noHudRdr:true,gun:NOGUN},
  del:['swing'],
  add:{2:['AGM-65E','AGM-84'],8:['AGM-65E'],3:['AGM-65E'],7:['AGM-65E']},
  load:{cold:{2:'TK',8:'TK',4:'Mk-82',6:'Mk-82',3:'Mk-82',7:'Mk-82',C:'TGP'},strike:{2:'TK',8:'TK',4:'GBU-10',6:'GBU-10',3:'Mk-82',7:'Mk-82',C:'TGP'}},cms:[60,60]});

// A-37B Dragonfly: 2× J85-GE-17A (12.7 kN), GAU-2B/A minigun, 8 stations
addM({id:'A-37B',src:'A-4E',side:'BLUE',call:'DRAGONFLY',nctr:'A-37',foe:'MiG-17F',eng:'2× J85-GE-17A',ccip:true,noAB:true,
  role:'USAF · LIGHT ATTACK / COIN · GAU-2B/A · NO RADAR',stall:{s:.05,twin:1},
  ac:{name:'A-37B Dragonfly',empty:2817,fuel:1500,S:17.1,CLa:4.6,cd0:.026,k:.09,mil:25400,ab:25400,abLight:99,spool:2.5,gLim:6,aoaLim:20,roll:3.6,
    rcs:3,irs:.6,dW:6350,ff:[.08,.6,.6],radar:R('none (optical sight)',2000,[1,2],'NM',.02),noRdr:true,gun:G_('GAU-2B/A 7.62 mm',100,850,2,1500,.004),vne:880},
  drop:['AIM-9D','AIM-9E','AIM-9G','AIM-9J','AIM-9P','AGM-45A','AGM-65A','Mk-84'],
  load:{cold:{1:'Mk-82',5:'Mk-82',2:'TK',4:'TK'},strike:{1:'LAU-10',5:'LAU-10',2:'Mk-82',4:'Mk-82',C:'Mk-82'}}});

// Hawker Hunter F.6: Avon 207 (44.5 kN), 4× ADEN 30 mm, ranging radar
addM({id:'Hunter F.6',src:'F-86F',side:'BLUE',call:'HUNTER',nctr:'HUNTER',foe:'MiG-17F',eng:'RR Avon 207',ccip:true,noAB:true,
  role:'RAF · DAY FIGHTER / GROUND ATTACK · 4× ADEN 30 MM',
  ac:{name:'Hunter F.6',empty:6405,fuel:1780,S:32.4,CLa:4.0,cd0:.019,k:.11,mil:44500,ab:44500,gLim:7.5,aoaLim:20,roll:4.2,rcs:4,irs:.8,
    gun:G_('4× ADEN 30 mm',80,790,26,600,.0035),vne:1150},
  add:{1:['AIM-9B','LAU-10','Matra F1'],4:['AIM-9B','LAU-10','Matra F1'],2:['Matra F1'],3:['Matra F1']},
  load:{cold:{2:'TK',3:'TK'},strike:{2:'TK',3:'TK',1:'Matra F1',4:'Matra F1'}}});

// Harrier GR.3: Pegasus 103 (95.6 kN), LRMTS laser ranger, 2× ADEN 30 mm pods, SNEB, BL755
addM({id:'Harrier GR.3',src:'AV-8B',side:'BLUE',call:'HARRIER',nctr:'HARRIER',foe:'MiG-23',eng:'Pegasus Mk 103',ccip:true,
  role:'RAF · V/STOL CLOSE SUPPORT · LRMTS · 2× ADEN · SNEB / BL755',
  ac:{name:'Harrier GR.3',empty:5580,fuel:2295,S:18.68,mil:95600,ab:95600,gLim:7,roll:4,gun:G_('2× ADEN 30 mm (pods)',40,790,26,200,.0035)},
  add:{2:['BL755','Matra F1'],6:['BL755','Matra F1'],3:['BL755','Matra F1'],5:['BL755','Matra F1']},drop:['AIM-9M','GBU-12','AGM-65E','AGM-65F','CBU-87','Mk-82AIR'],
  load:{cold:{1:'AIM-9L',7:'AIM-9L',3:'TK',5:'TK'},strike:{1:'AIM-9L',7:'AIM-9L',2:'BL755',6:'BL755',3:'Matra F1',5:'Matra F1'}}});

// Sea Harrier FRS.1: Pegasus 104, Blue Fox pulse radar, AIM-9L, 2× ADEN, carrier
addM({id:'Sea Harrier FRS.1',src:'AV-8B',side:'BLUE',call:'SHAR',nctr:'HARRIER',foe:'Mirage III',eng:'Pegasus Mk 104',cv:true,app:110,noRdr:false,
  role:'RN · FLEET AIR DEFENCE (FALKLANDS) · BLUE FOX · AIM-9L · 2× ADEN',
  ac:{name:'Sea Harrier FRS.1',empty:5900,fuel:2295,S:18.68,mil:95600,ab:95600,gLim:7.8,roll:4,radar:R('Blue Fox',15*NM,[5,10,20,40],'NM',.05),pulse:true,
    gun:G_('2× ADEN 30 mm (pods)',40,790,26,200,.0035)},
  load:{cold:{1:'AIM-9L',7:'AIM-9L',3:'TK',5:'TK'},strike:{1:'AIM-9L',7:'AIM-9L',2:'Mk-82',6:'Mk-82',3:'TK',5:'TK'}}});

// Blackburn Buccaneer S.2B: 2× Spey 101 (49.4 kN), Blue Parrot radar, Sea Eagle / Martel / Paveway, crew of two
addM({id:'Buccaneer S.2B',src:'F-111F',side:'BLUE',call:'BUCCANEER',nctr:'BUCC',foe:'MiG-23',eng:'2× RR Spey 101',crew:'Observer',noAB:true,ccip:true,
  role:'RAF · LOW-LEVEL MARITIME STRIKE · BLUE PARROT · SEA EAGLE / MARTEL · NO GUN',
  ac:{name:'Buccaneer S.2B',empty:13600,fuel:7000,S:47.8,CLa:4.2,cd0:.024,k:.11,mil:98800,ab:98800,abLight:99,spool:3,gLim:5.5,aoaLim:18,roll:2.6,fbw:false,noLimiter:true,
    rcs:14,irs:1.2,dW:28000,ff:[.3,2.4,2.4],radar:R('Blue Parrot',25*NM,[10,20,40],'NM',.05),pulse:true,noHudRdr:true,gun:NOGUN},
  del:['swing'],
  add:{2:['Sea Eagle','AS-37 Martel','AIM-9L'],8:['Sea Eagle','AS-37 Martel','AIM-9L'],3:['Sea Eagle','AS-37 Martel','BL755'],7:['Sea Eagle','AS-37 Martel','BL755']},
  load:{cold:{2:'Sea Eagle',8:'Sea Eagle',3:'Sea Eagle',7:'Sea Eagle'},strike:{2:'AIM-9L',8:'AIM-9L',4:'GBU-12',6:'GBU-12',3:'TK',7:'TK',C:'TGP'}}});

// Tornado F.3: AI.24 Foxhunter pulse-doppler, 4 Sky Flash under the belly, 4 AIM-9L, 1 BK-27
addM({id:'Tornado F.3',src:'Tornado GR.4',side:'BLUE',call:'TORNADO',nctr:'TORNADO',foe:'Su-24M',eng:'2× RB199 Mk 104',crew:'Navigator',
  role:'RAF · LONG-RANGE INTERCEPTOR · AI.24 FOXHUNTER · SKY FLASH / AMRAAM',
  ac:{name:'Tornado F.3',empty:14500,fuel:5800,mil:81000,ab:147000,gLim:7.5,radar:R('AI.24 Foxhunter',54*NM,[10,25,50,100],'NM',.5),pulse:false,noHudRdr:false,
    gun:G_('Mauser BK-27',28,1025,26,180,.0026)},
  stn:{3:['Sky Flash','AIM-120B','AIM-120C'],4:['Sky Flash','AIM-120B','AIM-120C'],6:['Sky Flash','AIM-120B','AIM-120C'],7:['Sky Flash','AIM-120B','AIM-120C'],
       2:['TK','AIM-9L','AIM-9M','ASRAAM'],8:['TK','AIM-9L','AIM-9M','ASRAAM'],'2a':['AIM-9L','AIM-9M','ASRAAM'],'8a':['AIM-9L','AIM-9M','ASRAAM'],C:[]},
  load:{cold:{3:'Sky Flash',4:'Sky Flash',6:'Sky Flash',7:'Sky Flash','2a':'AIM-9L','8a':'AIM-9L',2:'TK',8:'TK'},
        modern:{3:'AIM-120C',4:'AIM-120C',6:'AIM-120C',7:'AIM-120C','2a':'ASRAAM','8a':'ASRAAM',2:'TK',8:'TK'}}});

// JA 37 Viggen: RM8B (72.1 / 125 kN), PS-46/A pulse-doppler, Oerlikon KCA 30 mm, Rb 71 / Rb 74 / Rb 99
addM({id:'JA 37',src:'AJS-37',side:'BLUE',call:'VIGGEN',nctr:'VIGGEN',foe:'MiG-23',eng:'Volvo RM8B',
  role:'SWEDEN · INTERCEPTOR · PS-46/A PULSE-DOPPLER · Rb 71 / Rb 74 · KCA 30 MM',
  ac:{name:'JA 37 Viggen',empty:12200,mil:72100,ab:125000,gLim:7,radar:R('PS-46/A',27*NM,[10,25,50],'KM',.45),pulse:false,noHudRdr:false,
    gun:G_('Oerlikon KCA 30 mm',22,1030,30,150,.0025)},
  stn:{1:['Rb 74','Rb 24J'],7:['Rb 74','Rb 24J'],2:['Rb 71','Rb 99','Rb 74','Rb 24J'],6:['Rb 71','Rb 99','Rb 74','Rb 24J'],3:['Rb 71','Rb 99'],5:['Rb 71','Rb 99'],C:['PTB']},
  load:{cold:{1:'Rb 24J',7:'Rb 24J',2:'Rb 71',6:'Rb 71',3:'Rb 71',5:'Rb 71',C:'PTB'},modern:{1:'Rb 74',7:'Rb 74',2:'Rb 99',6:'Rb 99',3:'Rb 99',5:'Rb 99',C:'PTB'}},cms:[36,36]});

// Mirage 5: Atar 9C, no radar (avionics in the nose bay), more fuel and stores
addM({id:'Mirage 5',src:'Mirage III',side:'BLUE',call:'MIRAGE',nctr:'MIRAGE',foe:'MiG-21',eng:'SNECMA Atar 9C',ccip:true,
  role:'FRANCE / EXPORT · CLEAR-WEATHER ATTACK / DAY FIGHTER · NO RADAR · 2× DEFA',
  ac:{name:'Mirage 5',empty:6600,fuel:3100,radar:R('none (optical sight)',2000,[1,2],'NM',.02),noRdr:true,pulse:true},
  drop:['R530'],load:{cold:{1:'Magic 1',5:'Magic 1',2:'TK',4:'TK',C:'SAMP 400'},strike:{2:'TK',4:'TK',1:'SAMP 250',5:'SAMP 250',C:'SAMP 400'}}});

// IAI Kfir C2: J79-J1E (52.9 / 79.4 kN), canards, EL/M-2001B ranging radar, Shafrir 2 / Python 3
addM({id:'Kfir C2',src:'Mirage III',side:'BLUE',call:'KFIR',nctr:'KFIR',foe:'MiG-21',eng:'IAI Bedek J79-J1E',ccip:true,
  role:'ISRAEL · MULTIROLE · CANARDS · EL/M-2001B · SHAFRIR 2 / PYTHON 3',
  ac:{name:'Kfir C2',empty:7285,fuel:2570,mil:52900,ab:79400,gLim:7.5,aoaLim:28,roll:4.6,radar:R('EL/M-2001B (ranging)',6000,[1,2,5],'NM',.03),noRdr:true,pulse:true},
  stn:{1:['Shafrir 2','Python 3','Mk-82'],5:['Shafrir 2','Python 3','Mk-82'],2:['TK','Mk-82','Mk-83','Mk-20'],4:['TK','Mk-82','Mk-83','Mk-20'],C:['PTB','Mk-82','Mk-83','Mk-84']},
  load:{cold:{1:'Shafrir 2',5:'Shafrir 2',2:'TK',4:'TK'},modern:{1:'Python 3',5:'Python 3',2:'TK',4:'TK'},strike:{1:'Shafrir 2',5:'Shafrir 2',2:'TK',4:'TK',C:'Mk-84'}}});

/* ======================================================================================================================
   COLD WAR — RED
   ====================================================================================================================== */
// MiG-17F: VK-1F (26.5 / 33.8 kN with reheat), N-37D + 2× NR-23
addM({id:'MiG-17F',src:'MiG-15',side:'RED',call:'FRESCO',nctr:'MIG-17',foe:'F-4B',eng:'Klimov VK-1F',
  role:'USSR · DAY FIGHTER · N-37D + 2× NR-23 · AFTERBURNER',
  ac:{name:'MiG-17F',empty:3930,fuel:1170,S:22.6,mil:26500,ab:33800,abLight:.8,gLim:8,roll:4.3},
  load:{cold:{1:'TK',2:'TK'},strike:{1:'FAB-250',2:'FAB-250'}}});

// MiG-21MF: R-13-300 (40.2 / 63.7 kN), RP-22 Sapfir-21, GSh-23L, 4 pylons
addM({id:'MiG-21MF',src:'MiG-21',side:'RED',call:'FISHBED-J',nctr:'MIG-21',foe:'F-4E',eng:'Tumansky R-13-300',
  role:'USSR · FRONTLINE FIGHTER · RP-22 · R-3S / R-13M · GSh-23L',
  ac:{name:'MiG-21MF',empty:5350,fuel:2600,mil:40200,ab:63700,radar:R('RP-22',18000,[5,10,20],'KM',.05),pulse:true},
  drop:['R-60M'],load:{cold:{1:'R-3S',2:'R-3S',3:'R-3S',4:'R-3S',C:'PTB'},modern:{1:'R-13M',2:'R-13M',3:'R-13M',4:'R-13M',C:'PTB'}}});

// Su-7BMK: AL-7F-1 (68.6 / 94.1 kN), fixed swept wing, 2× NR-30, bombs and rockets
addM({id:'Su-7BMK',src:'Su-22M4',side:'RED',call:'FITTER-A',nctr:'SU-7',foe:'F-4E',eng:'Lyulka AL-7F-1',ccip:true,
  role:'USSR · FIGHTER-BOMBER · FIXED WING · 2× NR-30 · NO MISSILE AVIONICS',
  ac:{name:'Su-7BMK',empty:8620,fuel:2940,S:34,CLa:3.3,cd0:.021,k:.15,mil:68600,ab:94100,gLim:7,aoaLim:18,roll:3.6,rcs:8,irs:1.4},
  del:['swing'],drop:['Kh-25ML','Kh-29L','Kh-29TD','Kh-58U','KAB-500Kr','L-080','R-60M','R-13M'],
  load:{cold:{2:'TK',7:'TK',3:'FAB-250',6:'FAB-250'},strike:{2:'TK',7:'TK',3:'FAB-500',6:'FAB-500',4:'UB-16',5:'UB-16'}}});

// Su-15TM: 2× R-13F2-300 (41.6 / 70 kN), Taifun-M, R-98R / T + R-60M, no internal gun
addM({id:'Su-15TM',src:'MiG-25',side:'RED',call:'FLAGON',nctr:'SU-15',foe:'F-4E',eng:'2× R-13F2-300',
  role:'PVO · INTERCEPTOR · TAIFUN-M · R-98 · GCI',stall:{s:.2,twin:1},
  ac:{name:'Su-15TM',empty:10870,fuel:5550,S:36.6,CLa:3.2,cd0:.019,k:.17,mil:83200,ab:140000,spool:2.5,gLim:6.5,aoaLim:20,roll:3.4,rcs:8,irs:1.4,
    radar:R('Taifun-M',45000,[10,25,50],'KM',.05),pulse:true,vne:undefined,gun:NOGUN},
  stn:{1:['R-98R','R-98T'],4:['R-98R','R-98T'],'1B':['R-60M'],'4B':['R-60M'],2:[],3:[],C:['PTB']},
  load:{cold:{1:'R-98R',4:'R-98T','1B':'R-60M','4B':'R-60M',C:'PTB'}},cms:[0,0]});

// Tu-128 'Fiddler': 2× AL-7F-2, RP-S Smerch, 4× R-4, crew of two, enormous range
addM({id:'Tu-128',src:'MiG-25',side:'RED',call:'FIDDLER',nctr:'TU-128',foe:'F-4E',eng:'2× AL-7F-2',crew:'Navigator',
  role:'PVO · LONG-RANGE INTERCEPTOR · RP-S SMERCH · 4× R-4 · PILOT + NAVIGATOR',stall:{s:.2,twin:1},
  ac:{name:'Tu-128',empty:25960,fuel:13600,S:96.94,CLa:3.6,cd0:.021,k:.15,mil:145000,ab:198000,spool:3.5,gLim:2.5,aoaLim:14,roll:1.6,rcs:30,irs:1.7,dW:43700,
    radar:R('RP-S Smerch',50000,[10,25,50,100],'KM',.05),pulse:true,gun:NOGUN},
  stn:{1:['R-4R','R-4T'],2:['R-4R','R-4T'],3:['R-4R','R-4T'],4:['R-4R','R-4T'],'1B':[],'4B':[],C:[]},
  load:{cold:{1:'R-4T',2:'R-4R',3:'R-4R',4:'R-4T'}},cms:[0,0]});

// Yak-28P 'Firebar': 2× R-11AF2-300, Oryol-D, 2× R-98 + 2× R-60M, crew of two
addM({id:'Yak-28P',src:'MiG-25',side:'RED',call:'FIREBAR',nctr:'YAK-28',foe:'F-4E',eng:'2× R-11AF2-300',crew:'Navigator',
  role:'PVO · INTERCEPTOR · ORYOL-D · R-98 · PILOT + NAVIGATOR',stall:{s:.3,twin:1},
  ac:{name:'Yak-28P',empty:9970,fuel:7000,S:37.6,CLa:3.4,cd0:.022,k:.15,mil:76000,ab:122000,spool:3,gLim:5,aoaLim:16,roll:2.4,rcs:12,irs:1.4,
    radar:R('Oryol-D',30000,[10,25,50],'KM',.05),pulse:true,gun:NOGUN},
  stn:{1:['R-98R','R-98T'],4:['R-98R','R-98T'],'1B':['R-60M'],'4B':['R-60M'],2:[],3:[],C:[]},
  load:{cold:{1:'R-98R',4:'R-98T','1B':'R-60M','4B':'R-60M'}},cms:[0,0]});

// Shenyang J-6 (MiG-19S): 2× WP-6, 3× NR-30 (here the parent's 2), PL-2
addM({id:'J-6',src:'MiG-19',side:'RED',call:'FARMER',nctr:'MIG-19',foe:'F-5E',eng:'2× WP-6',
  role:'CHINA · DAY FIGHTER · LICENCE MiG-19S · PL-2 · NR-30',
  ac:{name:'J-6',radar:R('none (ASP-5N sight)',2000,[1,2],'KM',.02),noRdr:true,gun:G_('3× NR-30',45,780,26,200,.0034)},
  add:{1:['PL-2'],4:['PL-2']},load:{cold:{1:'PL-2',4:'PL-2',2:'TK',3:'TK'},strike:{1:'OFAB-100',4:'OFAB-100',2:'TK',3:'TK'}}});

// Nanchang Q-5: attack derivative of the J-6, internal bay, 2× Type 23-2K
addM({id:'Q-5',src:'MiG-19',side:'RED',call:'FANTAN',nctr:'Q-5',foe:'F-5E',eng:'2× WP-6',ccip:true,
  role:'CHINA · GROUND ATTACK · NO RADAR · BOMBS / ROCKETS',
  ac:{name:'Q-5',empty:6375,fuel:3000,S:27.95,mil:51000,ab:63800,gLim:7.5,roll:3.6,rcs:6,radar:R('none (optical sight)',2000,[1,2],'KM',.02),noRdr:true,
    gun:G_('2× Type 23-2K',34,715,12,200,.0034)},
  stn:{1:['PL-2','PL-5E','OFAB-100','UB-16'],4:['PL-2','PL-5E','OFAB-100','UB-16'],2:['TK','FAB-250','FAB-500','OFAB-250','UB-16','B-8M1'],3:['TK','FAB-250','FAB-500','OFAB-250','UB-16','B-8M1']},
  load:{cold:{1:'PL-2',4:'PL-2',2:'FAB-250',3:'FAB-250'},modern:{1:'PL-5E',4:'PL-5E',2:'FAB-500',3:'FAB-500'}}});

/* ======================================================================================================================
   MODERN — BLUE
   ====================================================================================================================== */
// F-16V Block 70: APG-83 SABR AESA, F110-GE-129, CFT-capable
addM({id:'F-16V',src:'F-16C',side:'BLUE',call:'VIPER',nctr:'F-16',foe:'J-10C',eng:'F110-GE-129',ccip:true,hms:'HMS_MODERN',
  role:'USAF EXPORT · BLOCK 70 · APG-83 SABR AESA · CENTER PEDESTAL DISPLAY',
  ac:{name:'F-16V Block 70',empty:9200,fuel:3175,radar:R('APG-83 SABR',78*NM,[10,20,40,80,160],'NM',.9,{aesa:1,beam:3*D}),twsN:8,trkN:20},
  load:{modern:{1:'AIM-9X',9:'AIM-9X',2:'AIM-120D',8:'AIM-120D',3:'AIM-120D',7:'AIM-120D',4:'TK',6:'TK',5:'ALQ-184'}}});

// F-16E Block 60 'Desert Falcon': APG-80 AESA, F110-GE-132 (144.6 kN), CFTs, internal FLIR (IFTS)
addM({id:'F-16E',src:'F-16C',side:'BLUE',call:'DESERT FALCON',nctr:'F-16',foe:'Su-35S',eng:'F110-GE-132',ccip:true,hms:'HMS_MODERN',irstn:'AAQ-32 IFTS',
  role:'UAE · BLOCK 60 · APG-80 AESA · CFT · IFTS · AIM-120 / AIM-9X',
  ac:{name:'F-16E Block 60',empty:10000,fuel:4535,mil:85000,ab:144600,rcs:2,radar:R('APG-80',80*NM,[10,20,40,80,160],'NM',.9,{aesa:1,beam:3*D}),irst:true,ols:{tail:45000,head:15000,lrf:20000},twsN:8,trkN:20},
  load:{modern:{1:'AIM-9X',9:'AIM-9X',2:'AIM-120C',8:'AIM-120C',3:'AIM-120C',7:'AIM-120C',4:'TK',6:'TK',5:'ALQ-184'}}});

// F-16I Sufa: two-seat Block 52+, F100-PW-229, APG-68(V)9, CFTs, Python 5 / AIM-120, SPICE
addM({id:'F-16I',src:'F-16C',side:'BLUE',call:'SUFA',nctr:'F-16',foe:'Su-30MKI',eng:'F100-PW-229',crew:'WSO',ccip:true,hms:'HMS_ALWAYS',
  role:'ISRAEL · TWO-SEAT STRIKE FIGHTER · APG-68(V)9 · CFT · PYTHON 5 · SPICE',
  ac:{name:'F-16I Sufa',empty:10200,fuel:4500,mil:79200,ab:129400,radar:R('APG-68(V)9',60*NM,[10,20,40,80,160],'NM',.75)},
  add:{1:['Python 5'],9:['Python 5'],2:['Python 5'],8:['Python 5'],3:['Spice-1000'],7:['Spice-1000'],4:['Spice-1000'],6:['Spice-1000']},
  load:{modern:{1:'Python 5',9:'Python 5',2:'AIM-120C',8:'AIM-120C',3:'AIM-120C',7:'AIM-120C',4:'TK',6:'TK',5:'ALQ-184'},
        strike:{1:'Python 5',9:'Python 5',2:'AIM-120C',8:'AIM-120C',3:'Spice-1000',7:'Spice-1000',4:'TK',6:'TK','5R':'TGP'}}});

// F-15I Ra'am: F-15E for Israel, APG-70I, Python 5
addM({id:'F-15I',src:'F-15E',side:'BLUE',call:'RAAM',nctr:'F-15',foe:'Su-30MKI',eng:'2× F100-PW-229',crew:'WSO',ccip:true,hms:'HMS_ALWAYS',
  role:'ISRAEL · LONG-RANGE STRIKE · APG-70I · PYTHON 5 · GBU-28',
  ac:{name:'F-15I Ra\'am',radar:R('APG-70I',56*NM,[10,20,40,80,160],'NM',.6)},
  add:{'2A':['Python 5'],'8A':['Python 5'],'2B':['Python 5'],'8B':['Python 5']},
  load:{modern:{'2A':'Python 5','8A':'Python 5','2B':'AIM-120C','8B':'AIM-120C','3C':'AIM-120C','7C':'AIM-120C',2:'TK',8:'TK',5:'GBU-28',TP:'SNIPER'}}});

// Tornado ECR: SEAD Tornado, ELS emitter locator, AGM-88 HARM
addM({id:'Tornado ECR',src:'Tornado GR.4',side:'BLUE',call:'TORNADO',nctr:'TORNADO',foe:'MiG-29S',eng:'2× RB199 Mk 105',crew:'WSO',
  role:'GERMANY / ITALY · SEAD · ELS · AGM-88 HARM · NO GUN',
  ac:{name:'Tornado ECR',gun:NOGUN},add:{3:['AGM-88C','AGM-88E'],7:['AGM-88C','AGM-88E'],4:['AGM-88B','AGM-88C'],6:['AGM-88B','AGM-88C']},
  load:{modern:{1:'Sky Shadow',9:'Sky Shadow',2:'TK',8:'TK',3:'AGM-88C',7:'AGM-88C',4:'AGM-88C',6:'AGM-88C','2a':'AIM-9L','8a':'AIM-9L'}}});

// Mirage 2000D: two-seat strike, Antilope 5 terrain-following radar, Magic 2, GBU-12/24, SCALP-EG
addM({id:'Mirage 2000D',src:'Mirage 2000',side:'BLUE',call:'MIRAGE',nctr:'M2000',foe:'MiG-29S',eng:'SNECMA M53-P2',crew:'WSO',ccip:true,
  role:'FRANCE · TWO-SEAT ALL-WEATHER STRIKE · ANTILOPE 5 · GBU / SCALP-EG · PILOT + NAVIGATOR',
  ac:{name:'Mirage 2000D',empty:7800,radar:R('Antilope 5',20*NM,[10,20,40],'NM',.05),noHudRdr:true,gun:G_('CC422 30 mm pod',41,800,26,250,.003)},
  stn:{2:['TK','GBU-12','GBU-16','GBU-24','AASM-250','Mk-82','SAMP 250'],8:['TK','GBU-12','GBU-16','GBU-24','AASM-250','Mk-82','SAMP 250'],C:['PTB','SCALP-EG','GBU-24','TGP'],
       3:['GBU-12','AASM-250','Mk-82'],4:['GBU-12','AASM-250','Mk-82'],6:['GBU-12','AASM-250','Mk-82'],7:['GBU-12','AASM-250','Mk-82']},
  load:{modern:{1:'Magic 2',9:'Magic 2',2:'TK',8:'TK',3:'GBU-12',7:'GBU-12',C:'SCALP-EG'},strike:{1:'Magic 2',9:'Magic 2',2:'GBU-24',8:'GBU-24',4:'GBU-12',6:'GBU-12',C:'TGP'}}});

// Sea Harrier FA2: Blue Vixen pulse-doppler, AIM-120 (first AMRAAM-capable British jet), carrier
addM({id:'Sea Harrier FA2',src:'AV-8B',side:'BLUE',call:'SHAR',nctr:'HARRIER',foe:'MiG-29S',eng:'Pegasus Mk 106',cv:true,app:110,noRdr:false,
  role:'RN · FLEET AIR DEFENCE · BLUE VIXEN · 4× AIM-120 · 2× ADEN',
  ac:{name:'Sea Harrier FA2',empty:6374,fuel:2295,S:18.68,mil:95600,ab:95600,gLim:7.8,roll:4,radar:R('Blue Vixen',40*NM,[10,20,40],'NM',.65),pulse:false,twsN:4,trkN:8,
    gun:G_('2× ADEN 30 mm (pods)',40,790,26,200,.0035)},
  add:{1:['AIM-120B','AIM-120C'],7:['AIM-120B','AIM-120C'],2:['AIM-120B','AIM-120C'],6:['AIM-120B','AIM-120C']},
  load:{modern:{1:'AIM-9L',7:'AIM-9L',2:'AIM-120C',6:'AIM-120C',3:'TK',5:'TK'}}});

// Harrier GR.9: Pegasus 107, Brimstone, Paveway, Maverick, AIM-9L
addM({id:'Harrier GR.9',src:'AV-8B',side:'BLUE',call:'HARRIER',nctr:'HARRIER',foe:'MiG-29S',eng:'Pegasus Mk 107',ccip:true,
  role:'RAF · V/STOL STRIKE · BRIMSTONE · PAVEWAY · SNIPER',
  ac:{name:'Harrier GR.9',empty:6340,gun:NOGUN},add:{2:['Brimstone','GBU-16'],6:['Brimstone','GBU-16'],3:['Brimstone','GBU-16'],5:['Brimstone','GBU-16'],C:['SNIPER']},
  load:{modern:{1:'AIM-9L',7:'AIM-9L',2:'Brimstone',6:'Brimstone',3:'GBU-12',5:'GBU-12',C:'SNIPER'}}});

// HAL Tejas Mk 1A: F404-GE-IN20 (53.9 / 89.8 kN), EL/M-2052 AESA, Derby / Python 5 / Astra, GSh-23
addM({id:'Tejas Mk1A',src:'F-16C',side:'BLUE',call:'TEJAS',nctr:'TEJAS',foe:'JF-17',eng:'F404-GE-IN20',ccip:true,hms:'HMS_ALWAYS',
  role:'INDIA · LIGHT COMBAT AIRCRAFT · EL/M-2052 AESA · DERBY / PYTHON 5 / ASTRA',
  ac:{name:'Tejas Mk 1A',empty:6560,fuel:2458,S:38.4,CLa:3.9,cd0:.018,k:.14,mil:53900,ab:89800,spool:1.6,gLim:8,aoaLim:24,roll:4.6,rcs:.8,irs:.9,dW:13500,
    radar:R('EL/M-2052',60*NM,[10,20,40,80,160],'NM',.88,{aesa:1,beam:3*D}),twsN:6,trkN:20,gun:G_('GSh-23',57,715,12,220,.0032)},
  stn:{1:['Python 5','R-73'],9:['Python 5','R-73'],2:['Derby','I-Derby ER','Astra','Python 5'],8:['Derby','I-Derby ER','Astra','Python 5'],3:['TK','Derby','Astra','GBU-12','Spice-1000','Mk-82'],7:['TK','Derby','Astra','GBU-12','Spice-1000','Mk-82'],
       4:['TK','Mk-82','GBU-12'],6:['TK','Mk-82','GBU-12'],5:['PTB','TK'],'5R':['TGP'],'5L':[],'3b':[],'3c':[],'4b':[],'4c':[],'6b':[],'6c':[],'7b':[],'7c':[]},
  load:{modern:{1:'Python 5',9:'Python 5',2:'I-Derby ER',8:'I-Derby ER',3:'Astra',7:'Astra',5:'PTB'},strike:{1:'Python 5',9:'Python 5',2:'Derby',8:'Derby',3:'GBU-12',7:'GBU-12',5:'PTB','5R':'TGP'}},cms:[48,48]});

// KAI FA-50 Block 20: F404-GE-102 (53 / 78.7 kN), EL/M-2032, AIM-9 / AIM-120, General Dynamics A-50 20 mm
addM({id:'FA-50',src:'F-16C',side:'BLUE',call:'FIGHTING EAGLE',nctr:'T-50',foe:'J-10C',eng:'F404-GE-102',ccip:true,hms:'HMS_MODERN',
  role:'KOREA · LIGHT COMBAT · EL/M-2032 · AIM-9 / AIM-120 · JDAM',
  ac:{name:'FA-50 Block 20',empty:6470,fuel:2655,S:23.69,CLa:4.2,cd0:.019,k:.13,mil:53000,ab:78700,spool:1.6,gLim:8,aoaLim:25,roll:5,rcs:1.5,irs:.9,dW:12300,
    radar:R('EL/M-2032',40*NM,[10,20,40,80],'NM',.65),twsN:4,trkN:10,gun:G_('A-50 20 mm',35,1030,9,205,.0026)},
  stn:{1:['AIM-9L','AIM-9M','AIM-9X'],9:['AIM-9L','AIM-9M','AIM-9X'],2:['AIM-9M','AIM-120C','Mk-82','GBU-12','GBU-38','AGM-65G'],8:['AIM-9M','AIM-120C','Mk-82','GBU-12','GBU-38','AGM-65G'],
       3:['TK','AIM-120C','Mk-82','Mk-84','GBU-12','GBU-38','GBU-31','AGM-65G','CBU-105'],7:['TK','AIM-120C','Mk-82','Mk-84','GBU-12','GBU-38','GBU-31','AGM-65G','CBU-105'],
       4:[],6:[],5:['PTB','TK'],'5R':['SNIPER'],'5L':[],'3b':[],'3c':[],'4b':[],'4c':[],'6b':[],'6c':[],'7b':[],'7c':[]},
  load:{modern:{1:'AIM-9X',9:'AIM-9X',2:'AIM-120C',8:'AIM-120C',5:'PTB'},strike:{1:'AIM-9M',9:'AIM-9M',3:'GBU-38',7:'GBU-38',2:'AGM-65G',8:'AGM-65G',5:'PTB','5R':'SNIPER'}},cms:[60,60]});

// Leonardo M-346FA: 2× F124-GA-200 (27.8 kN, no afterburner), Grifo-M346, AIM-9L / IRIS-T, LIZARD / JDAM
addM({id:'M-346FA',src:'F-16C',side:'BLUE',call:'MASTER',nctr:'M-346',foe:'Yak-130',eng:'2× F124-GA-200',ccip:true,noAB:true,hms:'HMS_ALWAYS',
  role:'ITALY · LIGHT FIGHTER / ATTACK · GRIFO-M346 · FBW · NO AFTERBURNER',stall:{s:.03,twin:1},
  ac:{name:'M-346FA',empty:4610,fuel:2000,S:23.52,CLa:4.6,cd0:.022,k:.11,mil:55600,ab:55600,abLight:99,spool:1.8,gLim:8,aoaLim:30,roll:4.8,rcs:2,irs:.8,dW:10400,ff:[.1,.8,.8],vne:1090,
    radar:R('Grifo-M346',30*NM,[10,20,40],'NM',.6),twsN:4,trkN:8,gun:NOGUN},
  stn:{1:['AIM-9L','IRIS-T'],9:['AIM-9L','IRIS-T'],2:['GBU-12','GBU-38','Mk-82','LAU-10'],8:['GBU-12','GBU-38','Mk-82','LAU-10'],3:['TK','GBU-12','GBU-38','GBU-31','Mk-82','Mk-83'],7:['TK','GBU-12','GBU-38','GBU-31','Mk-82','Mk-83'],
       4:[],6:[],5:['PTB','TGP'],'5R':[],'5L':[],'3b':[],'3c':[],'4b':[],'4c':[],'6b':[],'6c':[],'7b':[],'7c':[]},
  load:{modern:{1:'IRIS-T',9:'IRIS-T',3:'TK',7:'TK'},strike:{1:'AIM-9L',9:'AIM-9L',2:'GBU-12',8:'GBU-12',3:'GBU-38',7:'GBU-38',5:'TGP'}},cms:[30,30]});

// AIDC F-CK-1C Ching-kuo: 2× TFE1042-70 (27 / 42.1 kN), GD-53 Golden Dragon, Tien Chien I / II, M61
addM({id:'F-CK-1',src:'F-16C',side:'BLUE',call:'CHING-KUO',nctr:'F-CK-1',foe:'J-10C',eng:'2× TFE1042-70',ccip:true,
  role:'TAIWAN · INDIGENOUS DEFENCE FIGHTER · GD-53 · TIEN CHIEN I / II',stall:{s:.04,twin:1},
  ac:{name:'F-CK-1C Ching-kuo',empty:6500,fuel:2000,S:24.26,CLa:4.3,cd0:.0185,k:.12,mil:54000,ab:84200,spool:1.8,gLim:8,aoaLim:26,roll:5,rcs:1.6,irs:.9,dW:12250,
    radar:R('GD-53 Golden Dragon',38*NM,[10,20,40,80],'NM',.6),twsN:4,trkN:10,gun:G_('M61A1',100,1030,9,510,.0024)},
  stn:{1:['Tien Chien I','AIM-9P'],9:['Tien Chien I','AIM-9P'],2:['Tien Chien II','Tien Chien I','Mk-82','GBU-12'],8:['Tien Chien II','Tien Chien I','Mk-82','GBU-12'],
       3:['TK','Tien Chien II','Mk-82','Mk-84','GBU-12','AGM-65G'],7:['TK','Tien Chien II','Mk-82','Mk-84','GBU-12','AGM-65G'],4:['Tien Chien II'],6:['Tien Chien II'],5:['PTB','TK'],'5R':[],'5L':[],'3b':[],'3c':[],'4b':[],'4c':[],'6b':[],'6c':[],'7b':[],'7c':[]},
  load:{cold:{1:'Tien Chien I',9:'Tien Chien I',5:'PTB'},modern:{1:'Tien Chien I',9:'Tien Chien I',4:'Tien Chien II',6:'Tien Chien II',2:'Tien Chien II',8:'Tien Chien II',5:'PTB'}},cms:[60,60]});

// IAI Kfir Block 60: J79 (re-lifed), EL/M-2052 AESA, Derby / Python 5
addM({id:'Kfir Block 60',src:'Mirage III',side:'BLUE',call:'KFIR',nctr:'KFIR',foe:'MiG-29S',eng:'J79-J1E',ccip:true,hms:'HMS_ALWAYS',noRdr:false,
  role:'ISRAEL EXPORT · MULTIROLE · EL/M-2052 AESA · DERBY / PYTHON 5',
  ac:{name:'Kfir Block 60',empty:7300,fuel:2570,mil:52900,ab:79400,gLim:7.5,aoaLim:28,roll:4.6,radar:R('EL/M-2052',50*NM,[10,20,40,80],'NM',.85,{aesa:1,beam:3*D}),pulse:false,twsN:6,trkN:20},
  stn:{1:['Python 5','Python 3'],5:['Python 5','Python 3'],2:['TK','Derby','Mk-82','GBU-12','Spice-1000'],4:['TK','Derby','Mk-82','GBU-12','Spice-1000'],C:['PTB','Mk-84','GBU-12']},
  load:{modern:{1:'Python 5',5:'Python 5',2:'Derby',4:'Derby',C:'PTB'},strike:{1:'Python 5',5:'Python 5',2:'Spice-1000',4:'Spice-1000',C:'PTB'}},cms:[60,60]});

/* ======================================================================================================================
   MODERN — RED
   ====================================================================================================================== */
// MiG-29K: carrier Fulcrum, RD-33MK, quad FBW, Zhuk-ME, Kh-31 / Kh-35
addM({id:'MiG-29K',src:'MiG-29SMT',side:'RED',call:'FULCRUM-D',nctr:'MIG-29',foe:'F-18E',eng:'2× RD-33MK',hms:'HMS_ALWAYS',cv:true,app:135,ccip:true,
  role:'RUSSIA / INDIA · CARRIER MULTIROLE · ZHUK-ME · Kh-31 / Kh-35 · FBW',
  ac:{name:'MiG-29K',empty:12700,fuel:4560,mil:106000,ab:176600,fbw:true,gLim:8,aoaLim:28,rcs:5},
  add:{2:['R-77-1','Kh-31A','Kh-31P','Kh-35U','KAB-500Kr'],5:['R-77-1','Kh-31A','Kh-31P','Kh-35U','KAB-500Kr'],3:['R-77-1','Kh-31A','Kh-35U'],4:['R-77-1','Kh-31A','Kh-35U']},
  load:{modern:{1:'R-73',6:'R-73',2:'R-77-1',5:'R-77-1',3:'R-77-1',4:'R-77-1',C:'PTB'},strike:{1:'R-73',6:'R-73',2:'R-77-1',5:'R-77-1',3:'Kh-35U',4:'Kh-35U',C:'PTB'}},cms:[60,60]});

// MiG-31BM: Zaslon-M PESA (larger range, 10 tracks / 6 engaged), R-37M, R-77-1
addM({id:'MiG-31BM',src:'MiG-31',side:'RED',call:'FOXHOUND',nctr:'MIG-31',foe:'F-15C',eng:'2× D-30F6',crew:'WSO',
  role:'RUSSIA · LONG-RANGE INTERCEPTOR · ZASLON-M PESA · R-37M · MULTIROLE',
  ac:{name:'MiG-31BM',radar:R('Zaslon-M',220000,[25,50,100,200,400],'KM',.85,{pesa:1,beam:3*D}),twsN:6,trkN:24},
  add:{2:['R-77-1','Kh-31P'],3:['R-77-1','Kh-31P']},
  load:{modern:{1:'R-73',4:'R-73',2:'R-77-1',3:'R-77-1',5:'R-37M',6:'R-37M',7:'R-37M',8:'R-37M'}}});

// Su-25SM3: SOLT-25 sight, Vitebsk (L370) self-protection, KAB / Kh-29 / R-73
addM({id:'Su-25SM3',src:'Su-25',side:'RED',call:'FROGFOOT',nctr:'SU-25',foe:'A-10C',eng:'2× R-195',ccip:true,
  role:'RUSSIA · CLOSE AIR SUPPORT · SOLT-25 · VITEBSK · KAB / Kh-29',
  ac:{name:'Su-25SM3'},add:{1:['R-73'],10:['R-73'],3:['Kh-29T'],8:['Kh-29T'],4:['KAB-500L'],7:['KAB-500L']},
  ecm:{cold:{n:'L370 Vitebsk',jp:1.6,dec:.82,kg:0,cd:0,warm:12},modern:{n:'L370 Vitebsk',jp:1.8,dec:.85,kg:0,cd:0,warm:12}},
  load:{modern:{1:'R-73',10:'R-73',2:'B-8M1',9:'B-8M1',3:'Kh-29L',8:'Kh-29L',4:'KAB-500Kr',7:'KAB-500Kr',5:'TK',6:'TK'}},cms:[256,0]});

// Su-25T: Shkval TV / laser, 16 Vikhr ATGMs, Kh-25ML / Kh-29T / Kh-58U
addM({id:'Su-25T',src:'Su-25',side:'RED',call:'FROGFOOT',nctr:'SU-25',foe:'A-10C',eng:'2× R-195',ccip:true,
  role:'RUSSIA · ANTI-TANK · SHKVAL · VIKHR · Kh-25ML / Kh-29T / Kh-58U',
  ac:{name:'Su-25T',empty:10600},add:{1:['R-73'],10:['R-73'],3:['Vikhr','Kh-29T','Kh-58U'],8:['Vikhr','Kh-29T','Kh-58U'],4:['Kh-29T'],7:['Kh-29T']},
  load:{cold:{1:'R-60M',10:'R-60M',3:'Vikhr',8:'Vikhr',4:'Kh-25ML',7:'Kh-25ML',5:'TK',6:'TK'},modern:{1:'R-73',10:'R-73',3:'Vikhr',8:'Vikhr',4:'Kh-29T',7:'Kh-29T',5:'TK',6:'TK'}}});

// J-11B: indigenous Flanker, WS-10A, Type 1474 PD radar, PL-12 / PL-8
addM({id:'J-11B',src:'J-11',side:'RED',call:'FLANKER-L',nctr:'SU-27',foe:'F-15C',eng:'2× WS-10A',hms:'HMS_ALWAYS',irstn:'OLS-27',
  role:'CHINA · AIR SUPERIORITY · TYPE 1474 · PL-12 / PL-8',
  ac:{name:'J-11B',empty:16500,mil:152000,ab:264000,radar:R('Type 1474',60*NM,[10,25,50,100,200],'KM',.7),twsN:4,trkN:10},
  map:toCN,load:{modern:{1:'PL-8',10:'PL-8',2:'PL-8',9:'PL-8',3:'PL-12',8:'PL-12',4:'PL-12',7:'PL-12',5:'PL-12',6:'PL-12'}}});

// J-35: carrier 5th-gen (FC-31 family), twin WS-19-class, AESA, EODAS, internal PL-15 / PL-10, no gun
addM({id:'J-35',src:'J-20',side:'RED',call:'J-35',nctr:'J-35',foe:'F-35A',eng:'2× WS-19',hms:'HMS_ALWAYS',irstn:'EODAS / EOTS',cv:true,app:140,ccip:true,
  role:'CHINA · CARRIER 5TH-GEN · AESA · EODAS · INTERNAL PL-15 / PL-10',
  ac:{name:'J-35',empty:17000,fuel:8000,S:50,CLa:4.3,cd0:.019,k:.13,mil:108000,ab:186000,aoaLim:28,rcs:.08,radar:R('J-35 AESA',85*NM,[10,25,50,100,200],'KM',.9,{aesa:1,beam:2.6*D})},
  load:{modern:{1:'PL-10',10:'PL-10',5:'PL-15',6:'PL-15','5B':'PL-15','6B':'PL-15'}}});

// JH-7A: JL-10A radar, KD-88 / YJ-91 / LS-6, PL-8
addM({id:'JH-7A',src:'JH-7',side:'RED',call:'FLOUNDER',nctr:'JH-7',foe:'F-16C',eng:'2× WS-9A',crew:'WSO',ccip:true,
  role:'CHINA · FIGHTER-BOMBER · JL-10A · KD-88 / YJ-91 / LS-6',
  ac:{name:'JH-7A',radar:R('JL-10A',40*NM,[10,25,50,100],'KM',.5),noHudRdr:false,pulse:false},
  add:{3:['YJ-91','LS-6','YJ-83K'],7:['YJ-91','LS-6','YJ-83K'],4:['LS-6','YJ-83K'],6:['LS-6','YJ-83K'],2:['LS-6'],8:['LS-6']},
  load:{modern:{1:'PL-8',9:'PL-8',3:'YJ-91',7:'YJ-91',4:'KD-88',6:'KD-88',2:'LS-6',8:'LS-6',C:'PTB'}}});

// J-7G: last Fishbed copy, cranked delta, KLJ-6E pulse-doppler, PL-8
addM({id:'J-7G',src:'MiG-21',side:'RED',call:'FISHCAN',nctr:'MIG-21',foe:'F-16',eng:'WP-13F',
  role:'CHINA · LIGHT INTERCEPTOR · CRANKED DELTA · KLJ-6E · PL-8 / PL-5E',
  ac:{name:'J-7G',empty:5290,fuel:2400,S:24.88,mil:44100,ab:64700,gLim:8,roll:4.4,radar:R('KLJ-6E',30000,[10,25,50],'KM',.45),pulse:false,gun:G_('Type 30-1',14,780,26,60,.003)},
  stn:{1:['PL-8','PL-5E','PL-2'],4:['PL-8','PL-5E','PL-2'],2:['TK','PL-5E','PL-2','FAB-250','B-8M1'],3:['TK','PL-5E','PL-2','FAB-250','B-8M1'],C:['PTB']},
  load:{cold:{1:'PL-2',4:'PL-2',C:'PTB'},modern:{1:'PL-8',4:'PL-8',2:'PL-5E',3:'PL-5E',C:'PTB'}}});

/* ---------------- campaign pools ---------------- */
try{const pool={cold:{0:{CAP:['F-4J','F-4B','F-104G','Hunter F.6','JA 37','Tornado F.3','Sea Harrier FRS.1','Kfir C2','F-5A'],INT:['F-101B','F-102A','Tornado F.3','JA 37'],
    STK:['F-105D','A-6E','A-37B','Buccaneer S.2B','Harrier GR.3','Mirage 5'],ESC:['F-4J','JA 37']},
  1:{CAP:['MiG-17F','MiG-21MF','J-6'],INT:['Su-15TM','Tu-128','Yak-28P'],STK:['Su-7BMK','Q-5'],ESC:['MiG-21MF']}},
  modern:{0:{CAP:['F-16V','F-16E','Tejas Mk1A','FA-50','F-CK-1','Kfir Block 60','Sea Harrier FA2'],STK:['F-16I','F-15I','Tornado ECR','Mirage 2000D','Harrier GR.9','M-346FA'],ESC:['F-16V','F-16E']},
  1:{CAP:['MiG-29K','J-11B','J-35','J-7G'],INT:['MiG-31BM','J-11B'],STK:['Su-25SM3','Su-25T','JH-7A'],ESC:['J-11B']}}};
  for(const era of Object.keys(pool))for(const side of Object.keys(pool[era]))for(const r of Object.keys(pool[era][side])){const T=CTYPES[era]&&CTYPES[era][side]&&CTYPES[era][side][r];if(!T)continue;
    for(const id of pool[era][side][r])if(AC[id]&&!T.includes(id))T.push(id);}}catch(e){console.warn('[more] campaign',e);}
for(const s of M.NEW.slice(n0))if(!AC[FOE[s.id]])FOE[s.id]=s.side==='RED'?'F-4E':'MiG-21';
window.MORE_NEW=M.NEW.slice(n0).map(s=>s.id);
console.info('[more] added '+window.MORE_NEW.length+' jets: '+window.MORE_NEW.join(', '));
})();
