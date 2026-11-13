/* =====================================================================================================================
   v316 — Hangar: 12 more jets (F-4G, F-35B, F-35C, Rafale M, F-117A, F-16XL, F-15J, F-15K, MiG-29M, Su-27UB, J-10A,
   Gripen D). Same rules as more-jets.js: each is a clone of the closest existing airframe (cockpit, HUD and 3D model are the
   parent's for now) with its own flight numbers, radar, stations and loadouts. Gameplay-level estimates from public data.
   Needs modern-jets.js and more-jets.js loaded first.
   ===================================================================================================================== */
(function(){
'use strict';
const M=window.MJ;if(!M){console.warn('[v316] modern-jets.js helpers missing');return;}
const {addM,ag,R,G_,NOGUN,toCN,CN_IR}=M;const NM_=NM,n0=M.NEW.length;
const cp=o=>Object.assign({},o||{});
// copy a parent's loadouts (optionally mapped / overridden) so the new jet never spawns empty
function loads(src,over,map){const o={};for(const k of['cold','modern','strike']){
  const base=k==='strike'?(STRIKE_LOAD[src]||LOAD.modern[src]):(LOAD[k]&&LOAD[k][src]);if(!base)continue;
  const r=cp(base);if(map)for(const s of Object.keys(r))r[s]=map(r[s],s)||r[s];if(over&&over[k])Object.assign(r,over[k]);o[k]=r;}return o;}
const has=id=>!!AC[id];

/* ---------------- BLUFOR ---------------- */
// F-4G Wild Weasel V: F-4E rebuilt for SEAD, AN/APR-38 (later APR-47) radar homing and attack system, gun removed, EWO in the back seat
if(has('F-4E'))addM({id:'F-4G',src:'F-4E',side:'BLUE',call:'WEASEL',nctr:'F-4',foe:'MiG-29S',eng:'2× J79-GE-17',crew:'EWO',ccip:true,
  role:'USAF · WILD WEASEL V · SEAD · APR-38 / APR-47 · HARM / SHRIKE · PILOT + EWO',
  ac:{name:'F-4G Wild Weasel V',empty:14000,gun:NOGUN},
  add:{2:['AGM-88C','AGM-45A'],8:['AGM-88C','AGM-45A'],3:['AGM-88C','AGM-45A'],7:['AGM-88C','AGM-45A'],4:['AGM-88C','AGM-45A'],6:['AGM-88C','AGM-45A'],'2b':['AGM-88C','AGM-45A'],'8b':['AGM-88C','AGM-45A']},
  load:loads('F-4E',{strike:{2:'AGM-88C',8:'AGM-88C',3:'AGM-45A',7:'AGM-45A'},modern:{2:'AIM-9M',8:'AIM-9M'}})});

// F-35B: F135-PW-600 + lift fan (STOVL), 6,125 kg internal fuel, 7 g, smaller bays
if(has('F-35A'))addM({id:'F-35B',src:'F-35A',side:'BLUE',call:'LIGHTNING',nctr:'F-35',foe:'Su-57',eng:'F135-PW-600',crew:null,ccip:true,hms:'HMS_ALWAYS',irstn:'AAQ-40 EOTS / AAQ-37 DAS',
  role:'USMC / RN / ITALY · STOVL STEALTH MULTIROLE · APG-81 AESA · EOTS / DAS',
  ac:{name:'F-35B Lightning II',empty:14515,fuel:6125,S:42.7,gLim:7,tank:0},
  load:loads('F-35A')});
// F-35C: folding 62.1 m² wing, 8,960 kg fuel, 7.5 g, carrier hook
if(has('F-35A'))addM({id:'F-35C',src:'F-35A',side:'BLUE',call:'LIGHTNING',nctr:'F-35',foe:'Su-57',eng:'F135-PW-400',crew:null,ccip:true,hms:'HMS_ALWAYS',irstn:'AAQ-40 EOTS / AAQ-37 DAS',cv:true,app:135,
  role:'USN · CARRIER STEALTH STRIKE FIGHTER · APG-81 AESA · EOTS / DAS',
  ac:{name:'F-35C Lightning II',empty:15700,fuel:8960,S:62.1,CLa:4.5,gLim:7.5},
  load:loads('F-35A')});

// Rafale M: carrier variant of the Rafale, strengthened gear and hook, ~300 kg heavier
if(has('Rafale'))addM({id:'Rafale M',src:'Rafale',side:'BLUE',call:'RAFALE',nctr:'RAFALE',foe:'Su-35S',eng:'2× Snecma M88-2',crew:null,ccip:true,hms:'HMS_MODERN',irstn:'OSF',cv:true,app:130,
  role:'FRENCH NAVY · CARRIER MULTIROLE · RBE2 AESA · OSF · MICA / METEOR / SCALP',
  ac:{name:'Rafale M',empty:10600},
  load:loads('Rafale')});

// F-117A Nighthawk: 2× F404-GE-F1D2 (no afterburner), faceted stealth airframe, no radar, FLIR / DLIR, two bombs, subsonic
if(has('F-16C'))(function(){const keys=Object.keys(AC['F-16C'].st||{}),stn={};for(const k of keys)stn[k]=[];
  stn[3]=['GBU-10','GBU-12','GBU-24','Mk-84'];stn[7]=['GBU-10','GBU-12','GBU-24','Mk-84'];
  addM({id:'F-117A',src:'F-16C',side:'BLUE',call:'NIGHTHAWK',nctr:'F-117',foe:'MiG-29S',eng:'2× F404-GE-F1D2',crew:null,ccip:true,noAB:true,
  role:'USAF · STEALTH ATTACK · NO RADAR · FLIR / DLIR · TWO 2,000 LB BOMBS',stall:{s:.02,twin:1},
  ac:{name:'F-117A Nighthawk',empty:13380,fuel:6700,S:105.9,CLa:3.0,cd0:.028,k:.1,mil:96000,ab:96000,spool:3,gLim:6,aoaLim:25,roll:2.2,fbw:true,rcs:.02,irs:.6,dW:23800,ff:[.2,1.4,1.4],vne:1100,
    radar:R('none (FLIR / DLIR)',3000,[1,2],'NM',.02),noRdr:true,pulse:true,irst:false,gun:NOGUN,tank:0},
  stn,load:{modern:{3:'GBU-24',7:'GBU-24'},strike:{3:'GBU-24',7:'GBU-10'},cold:{3:'GBU-10',7:'GBU-10'}},cms:[0,0]});})();

// F-16XL: cranked-arrow wing (62.1 m²), F110-GE-129, much more internal fuel, 27 hardpoints on the real test aircraft (F-16C pylon set here)
if(has('F-16C'))addM({id:'F-16XL',src:'F-16C',side:'BLUE',call:'VIPER',nctr:'F-16',foe:'Su-27SM',eng:'F110-GE-129',crew:null,ccip:true,hms:'HMS_MODERN',
  role:'USAF · F-16XL · CRANKED-ARROW WING · LONG-RANGE STRIKE / INTERCEPTOR',
  ac:{name:'F-16XL',empty:9500,fuel:5000,S:62.1,CLa:4.0,cd0:.021,k:.1,gLim:9},
  load:loads('F-16C')});

// F-15J: JASDF Eagle, F100-IHI-220E, AAM-4B / AAM-5 / AIM-7M (J/APG-63(V)1)
if(has('F-15C'))addM({id:'F-15J',src:'F-15C',side:'BLUE',call:'EAGLE',nctr:'F-15',foe:'Su-30MKM',eng:'2× F100-IHI-220E',crew:null,ccip:true,
  role:'JAPAN · AIR SUPERIORITY · J/APG-63(V)1 · AAM-4B / AAM-5 / AIM-7M',
  ac:{name:'F-15J'},
  add:{'2A':['AAM-5'],'8A':['AAM-5'],'2B':['AAM-4B'],'8B':['AAM-4B'],'3C':['AAM-4B'],'4C':['AAM-4B'],'6C':['AAM-4B'],'7C':['AAM-4B']},
  drop:['AIM-9X','AIM-120D'],
  load:loads('F-15C',null,(w)=>/^AIM-120/.test(w)?'AAM-4B':/^AIM-9/.test(w)?'AAM-5':w)});

// F-15K Slam Eagle: ROKAF F-15E derivative, F110-GE-129, APG-63(V)1, Taurus KEPD 350, Harpoon, AIM-120C
if(has('F-15E'))addM({id:'F-15K',src:'F-15E',side:'BLUE',call:'EAGLE',nctr:'F-15',foe:'Su-30MKM',eng:'2× F110-GE-129',crew:'WSO',ccip:true,hms:'HMS_MODERN',
  role:'KOREA · LONG-RANGE STRIKE · APG-63(V)1 · TAURUS / HARPOON / JDAM',
  ac:{name:'F-15K Slam Eagle',radar:R('APG-63(V)1',56*NM_,[10,20,40,80,160],'NM',.6)},
  add:{2:['Taurus','AGM-84D'],8:['Taurus','AGM-84D'],5:['Taurus']},
  drop:['AIM-120D'],
  load:loads('F-15E',{strike:{5:'Taurus'}})});

/* ---------------- REDFOR ---------------- */
// MiG-29M: Zhuk-ME radar, FBW, 9 hardpoints, RD-33MK, R-77 (the airframe that became the MiG-35)
if(has('MiG-29SMT'))addM({id:'MiG-29M',src:'MiG-29SMT',side:'RED',call:'FULCRUM-E',nctr:'MIG-29',foe:'F-16C',eng:'2× RD-33MK',hms:'HMS_ALWAYS',irstn:'OLS-UEM',ccip:true,
  role:'RUSSIA · MULTIROLE FULCRUM · ZHUK-ME · FBW · R-77 / R-73',
  ac:{name:'MiG-29M',empty:11200,radar:R('Zhuk-ME',55*NM_,[10,25,50,100,200],'KM',.7),twsN:6,trkN:10},
  load:loads('MiG-29SMT')});

// Su-27UB Flanker-C: two-seat trainer / combat trainer, Su-27 systems, instructor in the back seat
if(has('Su-27'))addM({id:'Su-27UB',src:'Su-27',side:'RED',call:'FLANKER-C',nctr:'SU-27',foe:'F-15C',eng:'2× AL-31F',crew:'WSO',hms:'HMS_ALWAYS',irstn:'OLS-27',
  role:'USSR / RUSSIA · TWO-SEAT FLANKER · N001 · R-27 / R-73',
  ac:{name:'Su-27UB',empty:17500,fuel:9000},
  load:loads('Su-27')});

// J-10A: first J-10, KLJ-3 mechanical-scan pulse-Doppler radar, AL-31FN, PL-8 / PL-12, no IRST
if(has('J-10C'))addM({id:'J-10A',src:'J-10C',side:'RED',call:'FIREBIRD',nctr:'J-10',foe:'F-16C',eng:'AL-31FN',hms:'HMS_ALWAYS',ccip:true,
  role:'CHINA · MULTIROLE · KLJ-3 MECHANICAL RADAR · PL-8 / PL-12',stall:{s:.04,twin:0},
  ac:{name:'J-10A',empty:9750,mil:79400,ab:122500,rcs:3,radar:R('KLJ-3',54*NM_,[10,25,50,100,200],'KM',.65),irst:false,twsN:2,trkN:8},
  drop:['PL-15','PL-10'],
  load:{modern:{1:'PL-8',6:'PL-8',2:'PL-12',5:'PL-12',3:'PL-12',4:'PL-12',C:'PTB'},strike:{1:'PL-8',6:'PL-8',2:'PL-12',5:'PL-12',3:'LS-500J',4:'LS-500J',C:'PTB'}}});

/* ---------------- SWEDEN ---------------- */
// Gripen D: two-seat C, fuselage stretched 0.2 m, ~600 kg heavier, less internal fuel
if(has('JAS-39C'))addM({id:'JAS-39D',src:'JAS-39C',side:'BLUE',call:'GRIPEN',nctr:'GRIPEN',foe:'Su-30MKM',eng:'RM12',crew:'WSO',ccip:true,
  role:'SWEDEN / HUNGARY / CZECHIA · TWO-SEAT GRIPEN · PS-05/A · RB 99 / RB 74 / METEOR',
  ac:{name:'JAS 39D Gripen',empty:7100,fuel:2400},
  load:loads('JAS-39C')});

for(const s of M.NEW.slice(n0))if(!AC[FOE[s.id]])FOE[s.id]=s.side==='RED'?'F-4E':'MiG-21';
window.V316_NEW=M.NEW.slice(n0).map(s=>s.id);
console.info('[v316] added '+window.V316_NEW.length+' jets: '+window.V316_NEW.join(', '));
})();
