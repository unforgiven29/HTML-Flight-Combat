/* =====================================================================================================================
   v318 — Hangar: 22 more Cold War jets: MiG-19PM, MiG-25RB, Su-17M4, Yak-25, F-4C, F-4D, F-8J, F-89J, F-94C, F9F-2 Panther,
   F9F-8 Cougar, F-84F, CF-105 Arrow, CF-100, TSR-2, Sea Venom, J 29F, J 32B, Saab 105, G.91R, Mirage IVA, Mirage 4000, J-22 Orao.
   Same rules as more-jets.js: each jet is a clone of the closest existing airframe (cockpit, HUD and 3D model are the parent's
   for now) with its own flight numbers, radar, gun, stations and loadouts. Gameplay-level estimates from public data.
   Needs jets-v317.js (RS-2US) and more-jets.js loaded first.
   ===================================================================================================================== */
(function(){
'use strict';
const M=window.MJ;if(!M){console.warn('[v318] helpers missing');return;}
const {addM,R,G_,NOGUN}=M;const NM_=NM,n0=M.NEW.length;
const has=id=>!!AC[id];
const cp=o=>Object.assign({},o||{});
function loads(src,over){const o={};for(const k of['cold','modern','strike']){
  const base=k==='strike'?(STRIKE_LOAD[src]||LOAD.modern[src]):(LOAD[k]&&LOAD[k][src]);if(!base)continue;
  const r=cp(base);if(over&&over[k])Object.assign(r,over[k]);o[k]=r;}return o;}
const A4=(a)=>a;   // readability

/* ---------------- REDFOR ---------------- */
// MiG-19PM: RP-2U radar, no cannon, 4× RS-2US beam-riding missiles
if(has('MiG-19'))addM({id:'MiG-19PM',src:'MiG-19',side:'RED',call:'FARMER-E',nctr:'MIG-19',foe:'F-4B',eng:'2× RD-9BF-2',
  role:'PVO · ALL-WEATHER INTERCEPTOR · RP-2U · 4× RS-2US BEAM-RIDERS · NO GUN · GCI',
  ac:{name:'MiG-19PM',gun:NOGUN},
  stn:{1:['RS-2US'],2:['RS-2US'],3:['RS-2US'],4:['RS-2US']},
  load:{cold:{1:'RS-2US',2:'RS-2US',3:'RS-2US',4:'RS-2US'}},cms:[0,0]});
// MiG-25RB: Foxbat-B reconnaissance-bomber, Peleng navigation / bombing system, 4× 500 kg bombs, no AAMs
if(has('MiG-25'))addM({id:'MiG-25RB',src:'MiG-25',side:'RED',call:'FOXBAT-B',nctr:'MIG-25',foe:'F-4E',eng:'2× R-15B-300',ccip:true,
  role:'USSR · SUPERSONIC RECONNAISSANCE-BOMBER · PELENG · 4× FAB-500',
  ac:{name:'MiG-25RB',radar:R('Peleng nav / SLAR',30000,[10,25],'KM',.1),pulse:true},
  stn:{1:['FAB-500','FAB-250','OFAB-250'],2:['FAB-500','FAB-250','OFAB-250'],3:['FAB-500','FAB-250','OFAB-250'],4:['FAB-500','FAB-250','OFAB-250'],'1B':[],'4B':[],C:['PTB']},
  load:{cold:{1:'FAB-500',2:'FAB-500',3:'FAB-500',4:'FAB-500',C:'PTB'}},cms:[0,0]});
// Su-17M4 'Fitter-K': the Soviet-service Su-22M4, swing wing, AL-21F-3, Fon-1400 laser ranger, R-60M
if(has('Su-22M4'))addM({id:'Su-17M4',src:'Su-22M4',side:'RED',call:'FITTER-K',nctr:'SU-22',foe:'F-15C',eng:'AL-21F-3',ccip:true,
  role:'USSR · SWING-WING FIGHTER-BOMBER · FON-1400 · KH-25ML / KH-29L · R-60M',
  ac:{name:'Su-17M4'},load:loads('Su-22M4')});
// Yak-25M 'Flashlight-A': 2× RD-9, Sokol radar, 2× NR-37, crew of two
if(has('Yak-28P'))addM({id:'Yak-25',src:'Yak-28P',side:'RED',call:'FLASHLIGHT',nctr:'YAK-25',foe:'F-86F',eng:'2× RD-9AF',crew:'Navigator',
  role:'PVO · FIRST ALL-WEATHER INTERCEPTOR · SOKOL RADAR · 2× NR-37 · PILOT + NAV',stall:{s:.2,twin:1},
  ac:{name:'Yak-25M',empty:5700,fuel:2300,S:28.9,CLa:3.4,cd0:.02,k:.14,mil:51000,ab:63800,gLim:5,aoaLim:16,roll:3,rcs:6,irs:1.2,
    radar:R('Sokol',20000,[10,25],'KM',.05),pulse:true,gun:G_('2× NR-37 37 mm',55,690,40,80,.0035)},
  stn:{1:[],4:[],'1B':[],'4B':[],2:[],3:[],C:['PTB']},
  load:{cold:{C:'PTB'}},cms:[0,0]});

/* ---------------- USA ---------------- */
// F-4C: J79-GE-15, APQ-100, AIM-7E / AIM-9B / D, no gun, USAF
if(has('F-4B'))addM({id:'F-4C',src:'F-4B',side:'BLUE',call:'PHANTOM',nctr:'F-4',foe:'MiG-21',eng:'2× J79-GE-15',crew:'RIO',cv:false,
  role:'USAF · TWO-SEAT FIGHTER-BOMBER · APQ-100 · AIM-7E / AIM-9B / D · NO GUN',
  ac:{name:'F-4C Phantom II',empty:13700,mil:105800,ab:158000,radar:R('APQ-100',35*NM_,[5,10,25,50],'NM',.05),pulse:true},
  load:loads('F-4B')});
// F-4D: APQ-109, ASQ-91 toss bombing, Paveway, SUU-16 pod
if(has('F-4B'))addM({id:'F-4D',src:'F-4B',side:'BLUE',call:'PHANTOM',nctr:'F-4',foe:'MiG-21',eng:'2× J79-GE-15',crew:'RIO',cv:false,ccip:true,
  role:'USAF · TWO-SEAT FIGHTER-BOMBER · APQ-109 · ASQ-91 LABS · GBU-10 / GBU-12',
  ac:{name:'F-4D Phantom II',empty:13800,mil:105800,ab:158000,radar:R('APQ-109',40*NM_,[5,10,25,50],'NM',.05),pulse:true},
  add:{1:['GBU-10','GBU-12'],9:['GBU-10','GBU-12'],C:['GBU-10','GBU-12']},
  load:loads('F-4B',{strike:{C:'GBU-10'}})});
// F-8J Crusader: J57-P-20A, rebuilt F-8E, APQ-124, 4× Mk 12, AIM-9
if(has('F-8E'))addM({id:'F-8J',src:'F-8E',side:'BLUE',call:'CRUSADER',nctr:'F-8',foe:'MiG-21',eng:'J57-P-20A',cv:true,app:128,
  role:'USN · CARRIER AIR-SUPERIORITY FIGHTER · 4× MK 12 · AIM-9D / G / J · BLOWN FLAPS',
  ac:{name:'F-8J Crusader',empty:9100},load:loads('F-8E')});
// F-89J Scorpion: 2× J35-A-35, E-6 FCS, 2× MB-1 Genie + 4× Falcon, crew of two
if(has('F-101B'))addM({id:'F-89J',src:'F-101B',side:'BLUE',call:'SCORPION',nctr:'F-89',foe:'Tu-128',eng:'2× J35-A-35',crew:'Radar Observer',
  role:'USAF ADC · ALL-WEATHER INTERCEPTOR · E-6 FCS · 2× GENIE + 4× FALCON · PILOT + RO',
  ac:{name:'F-89J Scorpion',empty:11500,fuel:3700,S:56.2,mil:48400,ab:64000,gLim:5,aoaLim:16,roll:2.6,radar:R('E-6 FCS / APG-40',40000,[10,25,50],'KM',.05),pulse:true,gun:NOGUN},
  stn:{1:['AIR-2A','AIM-4A','AIM-4D'],2:['AIR-2A','AIM-4A','AIM-4D'],3:['AIM-4A','AIM-4D'],4:['AIM-4A','AIM-4D'],5:['TK'],6:['TK']},
  load:{cold:{1:'AIR-2A',2:'AIR-2A',3:'AIM-4D',4:'AIM-4D',5:'TK',6:'TK'}}});
// F-94C Starfire: J48-P-5 (with reheat), APG-40, 24 FFAR in the nose, crew of two
if(has('F-86F'))addM({id:'F-94C',src:'F-86F',side:'BLUE',call:'STARFIRE',nctr:'F-94',foe:'MiG-17F',eng:'J48-P-5',crew:'Radar Observer',del:['noAB'],
  role:'USAF ADC · ALL-WEATHER INTERCEPTOR · APG-40 · ROCKET PODS · PILOT + RO',
  ac:{name:'F-94C Starfire',empty:5900,fuel:2300,S:21.8,mil:28200,ab:38900,gLim:6,aoaLim:16,radar:R('APG-40',20000,[10,25],'KM',.05),pulse:true,gun:NOGUN},
  stn:{1:['LAU-10'],4:['LAU-10'],2:['TK'],3:['TK']},drop:['AIM-9B'],
  load:{cold:{1:'LAU-10',4:'LAU-10',2:'TK',3:'TK'}}});
// F9F-2 Panther: J42-P-8 (25.8 kN), 4× 20 mm, carrier
if(has('F-86F'))addM({id:'F9F-2',src:'F-86F',side:'BLUE',call:'PANTHER',nctr:'F9F',foe:'MiG-15',eng:'J42-P-8',cv:true,app:115,noAB:true,
  role:'USN · FIRST CARRIER JET FIGHTER · 4× 20 MM · KOREA',
  ac:{name:'F9F-2 Panther',empty:4200,fuel:1500,S:23.2,mil:25800,ab:25800,gLim:6.5,vne:900,gun:G_('4× AN/M3 20 mm',100,840,16,760,.0035)},
  drop:['AIM-9B','Mk-83'],load:{cold:{2:'TK',3:'TK'},strike:{1:'Mk-82',4:'Mk-82',2:'TK',3:'TK'}}});
// F9F-8 Cougar: swept-wing Panther, J48-P-8A (32.9 kN), AIM-9B
if(has('F-86F'))addM({id:'F9F-8',src:'F-86F',side:'BLUE',call:'COUGAR',nctr:'F9F',foe:'MiG-17F',eng:'J48-P-8A',cv:true,app:125,noAB:true,
  role:'USN · CARRIER SWEPT-WING FIGHTER · 4× 20 MM · AIM-9B',
  ac:{name:'F9F-8 Cougar',empty:5380,fuel:1800,S:31.3,mil:32900,ab:32900,gLim:7,vne:1030,gun:G_('4× AN/M3 20 mm',100,840,16,760,.0035)},
  load:{cold:{1:'AIM-9B',4:'AIM-9B',2:'TK',3:'TK'},strike:{1:'AIM-9B',4:'AIM-9B',2:'Mk-82',3:'Mk-82'}}});
// F-84F Thunderstreak: J65-W-3 (32.1 kN), 6× .50, bombs / rockets
if(has('F-86F'))addM({id:'F-84F',src:'F-86F',side:'BLUE',call:'THUNDER',nctr:'F-84',foe:'MiG-17F',eng:'J65-W-3',noAB:true,
  role:'USAF / NATO · SWEPT-WING FIGHTER-BOMBER · 6× .50 · BOMBS / ROCKETS',
  ac:{name:'F-84F Thunderstreak',empty:6350,fuel:2500,S:30.2,mil:32100,ab:32100,gLim:7,vne:1100},
  drop:['AIM-9B'],load:{cold:{2:'TK',3:'TK'},strike:{1:'Mk-82',4:'Mk-82',2:'TK',3:'TK'}}});

/* ---------------- CANADA / UK ---------------- */
// Avro CF-105 Arrow Mk 1: 2× Iroquois PS.13 (~111 kN ab each), MX-1179 Astra, Sparrow II / Falcon, crew of two
if(has('F-101B'))addM({id:'CF-105',src:'F-101B',side:'BLUE',call:'ARROW',nctr:'CF-105',foe:'Tu-128',eng:'2× Iroquois PS.13',crew:'Navigator',
  role:'RCAF · DELTA-WING INTERCEPTOR · 2× IROQUOIS · MX-1179 ASTRA · SPARROW / FALCON · PILOT + NAV',stall:{s:.04,twin:1},
  ac:{name:'Avro CF-105 Arrow',empty:19200,fuel:9000,S:120.8,CLa:3.2,cd0:.02,k:.15,mil:171000,ab:222000,gLim:6,aoaLim:18,roll:3.2,rcs:10,irs:1.6,dW:31000,
    radar:R('MX-1179 Astra',45*NM_,[10,25,50,100],'NM',.05),pulse:true,gun:NOGUN},
  stn:{1:['AIM-7E','AIM-4D'],2:['AIM-7E','AIM-4D'],3:['AIM-4D'],4:['AIM-4D'],5:['TK'],6:['TK']},
  load:{cold:{1:'AIM-7E',2:'AIM-7E',3:'AIM-4D',4:'AIM-4D',5:'TK',6:'TK'}},cms:[0,0]});
// Avro Canada CF-100 Canuck Mk 5: 2× Orenda 11, 8× .50 belly pod, wingtip rocket pods, crew of two
if(has('F-101B'))addM({id:'CF-100',src:'F-101B',side:'BLUE',call:'CANUCK',nctr:'CF-100',foe:'Tu-128',eng:'2× Orenda 11',crew:'Navigator',noAB:true,
  role:'RCAF / BELGIUM · ALL-WEATHER INTERCEPTOR · APG-40 · 8× .50 POD · WINGTIP ROCKETS · PILOT + NAV',
  ac:{name:'CF-100 Canuck Mk 5',empty:9500,fuel:3700,S:54.4,mil:65000,ab:65000,gLim:5,aoaLim:16,roll:2.6,radar:R('APG-40',20000,[10,25],'KM',.05),pulse:true,
    gun:G_('8× M2 .50 (belly pod)',90,880,12,2400,.004)},
  stn:{1:['LAU-10'],2:['LAU-10'],3:['TK'],4:['TK'],5:['TK'],6:['TK']},
  load:{cold:{1:'LAU-10',2:'LAU-10',3:'TK',4:'TK'}}});
// BAC TSR-2: 2× Olympus 22R (136 kN ab each), TFR / sideways radar, 4× 1,000 lb in the bay, crew of two
if(has('Buccaneer S.2B'))addM({id:'TSR-2',src:'Buccaneer S.2B',side:'BLUE',call:'TSR',nctr:'TSR-2',foe:'MiG-21',eng:'2× Olympus 22R',crew:'Navigator',ccip:true,del:['noAB'],
  role:'RAF · SUPERSONIC STRIKE / RECONNAISSANCE · TERRAIN FOLLOWING · 4× 1,000 LB BAY · PILOT + NAV',
  ac:{name:'BAC TSR-2',empty:24500,fuel:14000,S:65.1,mil:177000,ab:272000,gLim:4,aoaLim:14,roll:2,rcs:8,dW:43000,vne:2100,radar:R('TSR-2 FLR / SLR',40000,[10,25,50],'KM',.05),pulse:true},
  stn:{2:['TK'],8:['TK'],3:['Mk-83','Mk-84','BL755'],4:['Mk-83','Mk-84','BL755'],6:['Mk-83','Mk-84','BL755'],7:['Mk-83','Mk-84','BL755'],C:[]},
  load:{cold:{3:'Mk-83',4:'Mk-83',6:'Mk-83',7:'Mk-83'},strike:{3:'Mk-83',4:'Mk-83',6:'Mk-83',7:'Mk-83',2:'TK',8:'TK'}},cms:[40,40]});
// De Havilland Sea Venom FAW.22: Ghost 105, AI.21, 4× 20 mm, rockets, carrier, crew of two
if(has('F-101B'))addM({id:'Sea Venom',src:'F-101B',side:'BLUE',call:'VENOM',nctr:'VENOM',foe:'MiG-15',eng:'DH Ghost 105',crew:'Observer',cv:true,app:110,noAB:true,
  role:'ROYAL NAVY · CARRIER NIGHT / ALL-WEATHER FIGHTER · AI.21 · 4× 20 MM · ROCKETS · PILOT + OBSERVER',
  ac:{name:'Sea Venom FAW.22',empty:4350,fuel:1200,S:25.9,mil:22200,ab:22200,gLim:6,aoaLim:16,vne:900,radar:R('AI.21',20000,[10,25],'KM',.05),pulse:true,
    gun:G_('4× Hispano Mk 5 20 mm',130,840,16,600,.0035)},
  stn:{1:['LAU-10'],2:['LAU-10'],3:['TK'],4:['TK'],5:['TK'],6:['TK']},
  load:{cold:{1:'LAU-10',2:'LAU-10',3:'TK',4:'TK'}}});

/* ---------------- SWEDEN / ITALY / FRANCE / YUGOSLAVIA ---------------- */
// J 29F Tunnan: RM2B with reheat, 4× 20 mm Akan, Rb 24 Sidewinders
if(has('F-86F'))addM({id:'Saab 29',src:'F-86F',side:'BLUE',call:'TUNNAN',nctr:'J 29',foe:'MiG-15',eng:'RM2B (Ghost)',del:['noAB'],
  role:'SWEDEN · "FLYING BARREL" · 4× AKAN 20 MM · RB 24 · ARAK 135',
  ac:{name:'J 29F Tunnan',empty:4845,fuel:1500,S:24.15,mil:22800,ab:27500,gLim:7,vne:1060,gun:G_('4× Akan m/47 20 mm',120,840,16,640,.0035)},
  stn:{1:['Rb 24','TK','Mk-82'],4:['Rb 24','TK','Mk-82'],2:['TK','Mk-82','ARAK 135'],3:['TK','Mk-82','ARAK 135']},
  load:{cold:{1:'Rb 24',4:'Rb 24',2:'TK',3:'TK'},strike:{1:'Rb 24',4:'Rb 24',2:'ARAK 135',3:'ARAK 135'}}});
// J 32B Lansen: Avon 200 with reheat, PS-431/A radar, 4× 30 mm, Rb 24 / Rb 04E, crew of two
if(has('Hunter F.6'))addM({id:'Saab 32',src:'Hunter F.6',side:'BLUE',call:'LANSEN',nctr:'J 32',foe:'MiG-19',eng:'RM6A (Avon 200)',crew:'Navigator',del:['noAB'],
  role:'SWEDEN · ALL-WEATHER FIGHTER / ATTACK · PS-431/A · 4× 30 MM · RB 24 · RB 04E · PILOT + NAV',
  ac:{name:'J 32B Lansen',empty:7500,fuel:3400,S:37.4,mil:47000,ab:70000,gLim:6.5,vne:1150,radar:R('PS-431/A',30000,[10,25,50],'KM',.05),pulse:true,
    gun:G_('4× ADEN m/55 30 mm',80,790,26,600,.0035)},
  stn:{1:['Rb 24','ARAK 135','Rb 04E','TK'],4:['Rb 24','ARAK 135','Rb 04E','TK'],2:['TK','Mk-82','ARAK 135','Rb 04E'],3:['TK','Mk-82','ARAK 135','Rb 04E']},
  load:{cold:{1:'Rb 24',4:'Rb 24',2:'TK',3:'TK'},strike:{1:'Rb 24',4:'Rb 24',2:'Rb 04E',3:'Rb 04E'}}});
// Saab 105 (Sk 60): 2× Aubisque (7.3 kN each), ranging only, gun pod, rocket pods / bombs
if(has('Alpha Jet'))addM({id:'Saab 105',src:'Alpha Jet',side:'BLUE',call:'SAAB',nctr:'SAAB 105',foe:'MiG-21',eng:'2× Turbomeca Aubisque',
  role:'SWEDEN / AUSTRIA · LIGHT JET TRAINER / ATTACK · GUN POD · ARAK 135 · BOMBS',
  ac:{name:'Saab 105 (Sk 60)',empty:2570,fuel:1100,S:16.3,mil:14600,ab:14600,gLim:6.5,vne:800},
  stn:{1:['Mk-82','ARAK 135','Matra F1'],5:['Mk-82','ARAK 135','Matra F1'],2:['TK','Mk-82','ARAK 135'],4:['TK','Mk-82','ARAK 135']},
  load:{cold:{2:'TK',4:'TK'},strike:{1:'ARAK 135',5:'ARAK 135',2:'Mk-82',4:'Mk-82'}}});
// Fiat G.91R/3: Orpheus 803 (22.2 kN), 2× DEFA 30 mm, recon / light attack
if(has('Hunter F.6'))addM({id:'G.91',src:'Hunter F.6',side:'BLUE',call:'GINA',nctr:'G.91',foe:'MiG-21',eng:'Bristol Orpheus 803',
  role:'ITALY / GERMANY / PORTUGAL · LIGHT ATTACK AND RECONNAISSANCE · 2× DEFA 30 MM',
  ac:{name:'Fiat G.91R/3',empty:3100,fuel:1500,S:16.4,mil:22200,ab:22200,gLim:7,roll:4.4,vne:1075,gun:G_('2× DEFA 552 30 mm',85,790,26,240,.0035)},
  stn:{1:['TK','Mk-82','LAU-10','Matra F1'],4:['TK','Mk-82','LAU-10','Matra F1'],2:['TK','Mk-82'],3:['TK','Mk-82']},drop:['AIM-9B'],
  load:{cold:{2:'TK',3:'TK'},strike:{1:'Matra F1',4:'Matra F1',2:'Mk-82',3:'Mk-82'}}});
// Mirage IVA: 2× Atar 9K (70.6 kN ab each), crew of two, supersonic bomber (conventional bombs here; the AN-22 is not modelled)
if(has('Mirage III'))addM({id:'Mirage IV',src:'Mirage III',side:'BLUE',call:'MIRAGE',nctr:'MIRAGE IV',foe:'MiG-21',eng:'2× Atar 9K',crew:'Navigator',ccip:true,
  role:'FRANCE · SUPERSONIC STRATEGIC BOMBER (IVA) · 2× ATAR 9K · PILOT + NAV · CONVENTIONAL BOMBS',
  ac:{name:'Mirage IVA',empty:14500,fuel:11000,S:78,mil:98400,ab:141200,gLim:4,aoaLim:16,roll:2.2,rcs:9,dW:33000,radar:R('Thomson-CSF Aida / bombing radar',40000,[10,25,50],'KM',.05),pulse:true},
  stn:{1:['Magic 1'],5:['Magic 1'],2:['PTB','Mk-83','Mk-84'],4:['PTB','Mk-83','Mk-84'],C:['Mk-84','Mk-83','PTB']},
  load:{cold:{1:'Magic 1',5:'Magic 1',2:'PTB',4:'PTB',C:'Mk-84'},strike:{1:'Magic 1',5:'Magic 1',2:'Mk-84',4:'Mk-84',C:'Mk-84'}}});
// Mirage 4000: twin M53-2 (170 kN ab), Mirage 2000 avionics, RDM / RDI, the heavy 2000
if(has('Mirage 2000-5'))addM({id:'Mirage 4000',src:'Mirage 2000-5',side:'BLUE',call:'MIRAGE',nctr:'MIRAGE 4000',foe:'Su-27SM',eng:'2× SNECMA M53-2',
  role:'FRANCE (PROTOTYPE) · TWIN-ENGINE MIRAGE 2000 · RDI · SUPER 530D / MAGIC 2 / MICA',
  ac:{name:'Mirage 4000',empty:13000,fuel:5600,S:73.6,mil:108000,ab:170000,gLim:9,rcs:3},
  load:loads('Mirage 2000-5')});
// IAR-93 / J-22 Orao: 2× Viper 633-47, 2× GSh-23L, R-60, FAB / rocket pods
if(has('Jaguar'))addM({id:'J-22 Orao',src:'Jaguar',side:'RED',call:'ORAO',nctr:'ORAO',foe:'F-16C',eng:'2× Viper Mk 633-47',ccip:true,
  role:'YUGOSLAVIA / ROMANIA · LIGHT ATTACK · 2× GSH-23L · R-60 · FAB / ROCKET PODS',
  ac:{name:'J-22 Orao',empty:5700,fuel:2400,S:26,mil:35600,ab:44400,gLim:7,roll:4.4,gun:G_('2× GSh-23L 23 mm',80,715,12,400,.0032)},
  stn:{1:['R-60M'],5:['R-60M'],2:['TK','FAB-250','FAB-500','OFAB-250','B-8M1','UB-16','UB-32'],4:['TK','FAB-250','FAB-500','OFAB-250','B-8M1','UB-16','UB-32'],C:['PTB','FAB-250','FAB-500']},
  load:{cold:{1:'R-60M',5:'R-60M',2:'TK',4:'TK'},strike:{1:'R-60M',5:'R-60M',2:'FAB-250',4:'FAB-250',C:'FAB-500'}}});

/* ---------------- campaign pools ---------------- */
try{const pool={cold:{0:{CAP:['F-4C','F-4D','F-8J','F9F-8','F9F-2','F-84F','Saab 29','Saab 32','G.91','Saab 105','Sea Venom','Mirage 4000'],INT:['F-89J','F-94C','CF-105','CF-100','Sea Venom','Saab 32','Saab 29'],
    STK:['F-84F','F-4D','TSR-2','Mirage IV','G.91','Saab 105','Saab 32','F9F-2','F9F-8'],ESC:['F-4C','F-4D','F-8J']},
  1:{CAP:['MiG-19PM','Yak-25','J-22 Orao'],INT:['MiG-19PM','Yak-25'],STK:['Su-17M4','MiG-25RB','J-22 Orao'],ESC:['MiG-19PM']}}};
  for(const era of Object.keys(pool))for(const side of Object.keys(pool[era]))for(const r of Object.keys(pool[era][side])){const T=CTYPES[era]&&CTYPES[era][side]&&CTYPES[era][side][r];if(!T)continue;
    for(const id of pool[era][side][r])if(AC[id]&&!T.includes(id))T.push(id);}}catch(e){console.warn('[v318] campaign',e);}
for(const s of M.NEW.slice(n0))if(!AC[FOE[s.id]])FOE[s.id]=s.side==='RED'?'F-4E':'MiG-21';
window.V318_NEW=M.NEW.slice(n0).map(s=>s.id);
console.info('[v318] added '+window.V318_NEW.length+' jets: '+window.V318_NEW.join(', '));
})();
