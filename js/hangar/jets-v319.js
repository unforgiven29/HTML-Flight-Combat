/* =====================================================================================================================
   v319 — Hangar: 58 variants and extra types, each a clone of its parent (cockpit, HUD and 3D model are the parent's for now)
   with its own name, engine numbers, radar, gun, stores and loadouts. Gameplay-level estimates from public data.
   F-100D, F-101A, F-104A/C, F-106B, A-4F/M, A-7E, F-4S/N, F-4EJ, RF-4C, F-15A/D, F-16B, F/A-18A, A-6A, A-10A, F-111A, EF-111A,
   F-105G, Scimitar, Etendard IVM, Canberra, Hawker P.1154, MiG-21F-13/PF, MiG-23MS/BN/MLD/-98, MiG-27M, Su-24MR, Su-25UB, Su-27P,
   Il-28, J-5, J-10B, Mirage F1CT/CR, 2000-9, 2000N, Hunter FGA.9, Lightning F.1, Buccaneer S.1, J 35A/D, Gripen A/B, Tejas Mk2,
   TF-2000 Kaan, HAL Marut, Hurjet, F-2B, Eurofighter T1/T3, Lavi, Nesher.
   Needs jets-v318.js and everything before it.
   ===================================================================================================================== */
(function(){
'use strict';
const M=window.MJ;if(!M){console.warn('[v319] helpers missing');return;}
const {addM,R,G_,NOGUN}=M;const NM_=NM,n0=M.NEW.length;
const has=id=>!!AC[id];const cp=o=>Object.assign({},o||{});
const sset=n=>{try{return eval(n);}catch(e){return null;}};
function loads(src,over,wm){const o={};for(const k of['cold','modern','strike']){
  const base=k==='strike'?(STRIKE_LOAD[src]||LOAD.modern[src]):(LOAD[k]&&LOAD[k][src]);if(!base)continue;
  const r={};for(const s of Object.keys(base)){const w=base[s];const m=wm?wm(w,s):w;if(m)r[s]=m;}
  if(over&&over[k])Object.assign(r,over[k]);else if(over&&over.all)Object.assign(r,over.all);o[k]=r;}return o;}
const mapOf=t=>(w=>t[w]||w);
const NOMRAAM=mapOf({'AIM-120A':'AIM-7M','AIM-120B':'AIM-7M','AIM-120C':'AIM-7M','AIM-120D':'AIM-7M','AIM-9X':'AIM-9L','AIM-9M':'AIM-9L'});
const DROPMRAAM=['AIM-120A','AIM-120B','AIM-120C','AIM-120D','AIM-9X','AGM-88E','AGM-154A'];
const CDEF=(n)=>({cold:{n,jp:2.6,dec:.87,kg:0,cd:0,warm:10},modern:{n,jp:2.6,dec:.87,kg:0,cd:0,warm:10}});
const CRW=id=>{try{return CREW[id];}catch(e){return undefined;}};

// build a spec from the parent's registered data, then apply the overrides
function V(s){const src=s.src;if(!has(src)){console.warn('[v319] no source',src,'for',s.id);return;}const P=AC[src];
  const hm=(()=>{const a=sset('HMS_ALWAYS'),m=sset('HMS_MODERN');return a&&a.has(src)?'HMS_ALWAYS':m&&m.has(src)?'HMS_MODERN':undefined;})();
  const cmsP=(()=>{try{const c=CMS.modern[src]||CMS.cold[src];return Array.isArray(c)?c:undefined;}catch(e){return undefined;}})();
  const d={side:RUS.has(src)?'RED':'BLUE',call:(CALLS[src]||s.id),nctr:(NCTR_ID[src]||s.id),foe:FOE[src],eng:ENGN[src],ccip:!NO_CCIP.has(src),
    irstn:IRSTN[src],dl:DL_FIT.has(src),hms:hm,stall:STALL[src],ecm:ECM_FIT[src],cms:cmsP,noAB:P.noAB?true:undefined,
    cv:CV_AC.has(src)?true:undefined,app:CV_AC.has(src)?APP_KT[src]:undefined,crew:CRW(src)};
  const spec=Object.assign({},d,s);
  if(!spec.load)spec.load=loads(src,s.lo,s.wm);
  delete spec.lo;delete spec.wm;
  addM(spec);}

/* ====================================================== USA ====================================================== */
V({id:'F-100D',src:'F-100A',name:'F-100D',ac:{name:'F-100D Super Sabre',empty:9525,mil:45400,ab:75400,gLim:7.3},
  role:'USAF / NATO · SUPERSONIC FIGHTER-BOMBER · J57-P-21A · 4× M39 · AIM-9 / BOMBS',ccip:true});
V({id:'F-101A',src:'F-101B',crew:null,call:'VOODOO',
  role:'USAF · NUCLEAR / CONVENTIONAL STRIKE FIGHTER · 4× M39 · BOMBS · NO AAMS',
  ac:{name:'F-101A Voodoo',empty:12000,gun:AC['F-100A']&&AC['F-100A'].gun,radar:Object.assign({},AC['F-100A']&&AC['F-100A'].radar,{name:'MA-2 ranging'})},
  stn:{1:['Mk-82','Mk-83','TK'],2:['Mk-82','Mk-83','TK'],3:['Mk-82','Mk-83'],4:['Mk-82','Mk-83'],5:['TK'],6:['TK']},
  load:{cold:{1:'Mk-83',2:'Mk-83',5:'TK',6:'TK'},strike:{1:'Mk-83',2:'Mk-83',3:'Mk-82',4:'Mk-82',5:'TK',6:'TK'}}});
V({id:'F-104A',src:'F-104G',name:'F-104A',ac:{name:'F-104A Starfighter',empty:5830,mil:42700,ab:65800,radar:R('ASG-14T-2 ranging',9*NM_,[5,10],'NM',.05)},
  role:'USAF ADC · INTERCEPTOR · J79-GE-3B · M61A1 · AIM-9B · RANGING RADAR'});
V({id:'F-104C',src:'F-104G',name:'F-104C',ac:{name:'F-104C Starfighter',empty:6000,mil:44500,ab:70300,radar:R('ASG-14T-2 ranging',9*NM_,[5,10],'NM',.05)},
  role:'USAF TAC · FIGHTER-BOMBER · J79-GE-7 · M61A1 · AIM-9B · BOMBS',ccip:true});
V({id:'F-106B',src:'F-106A',crew:'Instructor',ac:{name:'F-106B Delta Dart',empty:11900,fuel:3100},
  role:'USAF ADC · TWO-SEAT DELTA DART · MA-1 · AIM-4 / GENIE'});
V({id:'A-4F',src:'A-4E',ac:{name:'A-4F Skyhawk II',mil:41400,ab:41400,empty:4580},role:'USN / USMC · CARRIER ATTACK · J52-P-8A · AVIONICS "HUMPBACK" · AIM-9'});
V({id:'A-4M',src:'A-4E',ac:{name:'A-4M Skyhawk II',mil:49800,ab:49800,empty:4750,gLim:8},ccip:true,
  add:{1:['AIM-9L','AGM-65B','AGM-65D'],5:['AIM-9L','AGM-65B','AGM-65D'],2:['AGM-65B','AGM-65D'],4:['AGM-65B','AGM-65D']},
  role:'USMC · ATTACK · J52-P-408 · ANGLE-RATE BOMBING SYSTEM · AGM-65 / AIM-9L'});
V({id:'A-7E',src:'A-7D',cv:true,app:125,ac:{name:'A-7E Corsair II',mil:66700,ab:66700},
  role:'USN · CARRIER LIGHT ATTACK · TF41-A-2 · APQ-126 · M61A1 · HARM / SHRIKE / AIM-9'});
V({id:'F-4N',src:'F-4J',ac:{name:'F-4N Phantom II',empty:13300},role:'USN / USMC · REBUILT F-4B · AWG-10 · AIM-7F / AIM-9'});
V({id:'F-4S',src:'F-4J',ac:{name:'F-4S Phantom II',empty:13600},role:'USN / USMC · REBUILT F-4J · LEADING-EDGE SLATS · AWG-10B · AIM-7F / AIM-9L'});
V({id:'F-4EJ',src:'F-4E',crew:'WSO',call:'KAI',ac:{name:'F-4EJ Kai Phantom II',radar:R('J/APG-66J',60*NM_,[10,25,50,100],'NM',.55)},
  role:'JAPAN · AIR DEFENCE · J79-IHI-17 · J/APG-66J · AIM-7F / AIM-9P'});
V({id:'RF-4C',src:'F-4E',ac:{name:'RF-4C Phantom II',gun:NOGUN,radar:R('APQ-99',30*NM_,[5,10,25,50],'NM',.05),empty:13300},pulse:true,
  drop:['AIM-7E','AIM-7E-2','AIM-7F','AIM-7M','AIM-7P','AIM-120A','AIM-120C','AIM-9L','AIM-9M','AIM-9X','AGM-65A','AGM-65B','AGM-65D','AGM-65G','AGM-65H','CBU-87','GBU-10','GBU-12','GBU-24'],
  role:'USAF · TACTICAL RECONNAISSANCE · APQ-99 TERRAIN-FOLLOWING · CAMERAS / SLAR · NO GUN',
  load:{cold:{2:'TK',8:'TK',C:'PTB'},modern:{2:'TK',8:'TK',C:'PTB'}}});
V({id:'F-15A',src:'F-15C',ac:{name:'F-15A Eagle',empty:12247},drop:DROPMRAAM,wm:NOMRAAM,
  role:'USAF · AIR SUPERIORITY · F100-PW-100 · APG-63 · AIM-7F / M · AIM-9L / M'});
V({id:'F-15D',src:'F-15C',crew:'Instructor',ac:{name:'F-15D Eagle',empty:12900,fuel:5800},role:'USAF · TWO-SEAT EAGLE · APG-63 · AIM-120 / AIM-9X'});
V({id:'F-16B',src:'F-16',crew:'Instructor',ac:{name:'F-16B ADF',fuel:2900},role:'USAF / ANG · TWO-SEAT AIR DEFENCE FIGHTER · APG-66 · AIM-120 / AIM-9'});
V({id:'F-18A',src:'F-18C',drop:DROPMRAAM,wm:NOMRAAM,ac:{name:'F/A-18A Hornet',radar:R('APG-65',65*NM_,[10,20,40,80,160],'NM',.55)},
  role:'USN / USMC / RAAF · MULTIROLE · F404-GE-400 · APG-65 · AIM-7M / AIM-9L'});
V({id:'A-6A',src:'A-6E',ac:{name:'A-6A Intruder',mil:82800,ab:82800,empty:12000},ccip:false,
  drop:['GBU-24','GBU-12','GBU-10','GBU-28','CBU-87','AGM-65E','AGM-84D','AIM-9P','AGM-88C'],
  role:'USN · CARRIER ALL-WEATHER ATTACK · J52-P-8A · DIANE · BOMBS / ROCKETS',
  load:{cold:{2:'TK',8:'TK',3:'Mk-82',4:'Mk-82',6:'Mk-82',7:'Mk-82'},modern:{2:'TK',8:'TK',3:'Mk-82',4:'Mk-82',6:'Mk-82',7:'Mk-82'}}});
V({id:'A-10A',src:'A-10C',ac:{name:'A-10A Thunderbolt II',empty:11321},ccip:true,
  drop:['GBU-38','GBU-54','AGM-65H','AGM-65G','AGM-65E','CBU-103','CBU-105','TGP','SNIPER','ALQ-184'],
  role:'USAF · CLOSE AIR SUPPORT · GAU-8/A · AGM-65B / D · UNGUIDED BOMBS · NO POD',
  wm:(w)=>({'GBU-38':'Mk-82','GBU-54':'Mk-82','AGM-65H':'AGM-65D','AGM-65G':'AGM-65D','SNIPER':null,'TGP':null,'ALQ-184':'ALQ-131'})[w]===undefined?w:({'GBU-38':'Mk-82','GBU-54':'Mk-82','AGM-65H':'AGM-65D','AGM-65G':'AGM-65D','SNIPER':null,'TGP':null,'ALQ-184':'ALQ-131'})[w]});
V({id:'F-111A',src:'F-111F',ac:{name:'F-111A Aardvark',mil:98000,ab:164600,empty:21400},drop:['TGP','GBU-24','GBU-12','AGM-65E'],
  wm:(w)=>w==='TGP'?null:w==='GBU-24'?'GBU-10':w,
  role:'USAF · SWING-WING STRIKE · TF30-P-3 · APQ-113 / TFR · BOMBS'});
V({id:'EF-111A',src:'F-111F',crew:'EWO',call:'SPARK VARK',ac:{name:'EF-111A Raven',gun:NOGUN,mil:98000,ab:164600,empty:25000,rcs:8},
  ecm:CDEF('ALQ-99E TJS'),stn:{2:[],3:[],4:[],6:[],7:[],8:[],C:[]},
  role:'USAF · STANDOFF / ESCORT JAMMER · ALQ-99E TJS · TFR · NO WEAPONS',load:{cold:{},modern:{},strike:{}}});
V({id:'F-105G',src:'F-105D',crew:'EWO',call:'WILD WEASEL',add:{1:['AGM-45A','AGM-88B'],2:['AGM-45A','AGM-88B'],3:['AGM-45A','AGM-88B'],4:['AGM-45A','AGM-88B'],5:['AGM-45A','AGM-88B'],6:['AGM-45A','AGM-88B'],7:['AGM-45A','AGM-88B'],8:['AGM-45A','AGM-88B'],9:['AGM-45A','AGM-88B']},
  ac:{name:'F-105G Wild Weasel III',empty:13000},role:'USAF · WILD WEASEL III · APR-25 / 26 · SHRIKE / HARM · M61A1 · EWO'});

/* ================================================== UK / FRANCE / EUROPE ================================================== */
V({id:'Scimitar',src:'Super Etendard',cv:true,app:125,noAB:true,call:'SCIMITAR',nctr:'SCIMITAR',foe:'MiG-17F',eng:'2× Avon 202',
  ac:{name:'Scimitar F.1',empty:10700,fuel:3800,mil:100000,ab:100000,gLim:6,vne:1100,gun:G_('4× ADEN 30 mm',80,790,26,600,.0035),radar:Object.assign({},AC['Super Etendard'].radar,{name:'ranging'})},
  stn:{1:['AIM-9B','TK','Mk-82'],5:['AIM-9B','TK','Mk-82'],2:['TK','Mk-82','Mk-83','LAU-10'],4:['TK','Mk-82','Mk-83','LAU-10'],C:['PTB','Mk-83']},
  role:'ROYAL NAVY · CARRIER STRIKE FIGHTER · 2× AVON · 4× ADEN · AIM-9B / BOMBS',
  load:{cold:{1:'AIM-9B',5:'AIM-9B',2:'TK',4:'TK'},strike:{1:'AIM-9B',5:'AIM-9B',2:'Mk-83',4:'Mk-83'}}});
V({id:'Etendard IVM',src:'Super Etendard',nctr:'ETENDARD',eng:'Atar 8B',ac:{name:'Etendard IVM',empty:6000,mil:43200,ab:43200,radar:Object.assign({},AC['Super Etendard'].radar,{name:'Aida II ranging'})},
  drop:['AM39 Exocet','Magic 2'],
  role:'FRENCH NAVY · CARRIER STRIKE FIGHTER · ATAR 8B · 2× DEFA · MAGIC 1 / BOMBS / MATRA F1',
  load:{cold:{1:'Magic 1',5:'Magic 1',2:'TK',4:'TK'},modern:{1:'Magic 1',5:'Magic 1',2:'TK',4:'TK'},strike:{1:'Magic 1',5:'Magic 1',2:'Matra F1',4:'Matra F1'}}});
V({id:'Canberra',src:'Buccaneer S.2B',cv:false,call:'CANBERRA',nctr:'CANBERRA',foe:'MiG-17F',eng:'2× Avon 109',crew:'Navigator',
  ac:{name:'Canberra B(I).8',empty:11000,fuel:4500,S:89,mil:64400,ab:64400,gLim:3.5,roll:1.5,vne:900,gun:G_('4× ADEN 30 mm',80,790,26,500,.0035)},
  stn:{2:['TK'],8:['TK'],3:['Mk-82','Mk-83','Mk-84','BL755'],4:['Mk-82','Mk-83','Mk-84','BL755'],6:['Mk-82','Mk-83','Mk-84','BL755'],7:['Mk-82','Mk-83','Mk-84','BL755'],C:[]},
  role:'RAF / RAAF / INDIA · TWIN-JET LIGHT BOMBER · 4× ADEN · BOMBS',
  load:{cold:{2:'TK',8:'TK',3:'Mk-83',4:'Mk-83',6:'Mk-83',7:'Mk-83'},strike:{3:'Mk-83',4:'Mk-83',6:'Mk-83',7:'Mk-83'}}});
V({id:'Buccaneer S.1',src:'Buccaneer S.2B',cv:true,app:130,eng:'2× Gyron Junior 101',
  ac:{name:'Buccaneer S.1',empty:12700,mil:64400,ab:64400},
  drop:['Sea Eagle','GBU-12','GBU-10','GBU-24','CBU-87','AIM-9P','AIM-9J','AIM-9L','TGP'],
  stn:{C:[]},role:'ROYAL NAVY · CARRIER LOW-LEVEL STRIKE · GYRON JUNIOR · BLUE PARROT · BOMBS',
  load:{cold:{2:'TK',8:'TK',3:'Mk-82',4:'Mk-82',6:'Mk-82',7:'Mk-82'},modern:{2:'TK',8:'TK',3:'Mk-82',4:'Mk-82',6:'Mk-82',7:'Mk-82'},strike:{2:'TK',8:'TK',3:'Mk-84',4:'Mk-82',6:'Mk-82',7:'Mk-84'}}});
V({id:'Hawker P.1154',src:'Harrier GR.3',call:'P.1154',nctr:'P.1154',foe:'MiG-21',eng:'BS.100 Pegasus (PCB)',
  ac:{name:'Hawker P.1154',empty:6800,mil:95600,ab:150000,gLim:7,rcs:5},
  add:{1:['Red Top','Firestreak'],7:['Red Top','Firestreak']},
  role:'RAF (CANCELLED 1965) · SUPERSONIC V/STOL FIGHTER · PEGASUS WITH PCB · RED TOP / SIDEWINDER'});
V({id:'Hunter FGA.9',src:'Hunter F.6',ac:{name:'Hunter FGA.9',mil:45000,ab:45000},
  add:{1:['BL755'],4:['BL755'],2:['BL755'],3:['BL755']},role:'RAF · GROUND-ATTACK HUNTER · AVON 207 · 4× ADEN · ROCKETS / BOMBS / BL755',
  load:{cold:{2:'TK',3:'TK'},strike:{1:'Matra F1',4:'Matra F1',2:'BL755',3:'BL755'}}});
V({id:'Lightning F.1',src:'Lightning F.6',eng:'2× Avon 201R',ac:{name:'Lightning F.1',empty:12500,mil:104000,ab:132000},drop:['Red Top'],
  role:'RAF · SUPERSONIC INTERCEPTOR · AI.23 · 2× ADEN · FIRESTREAK',load:{cold:{1:'Firestreak',2:'Firestreak'},modern:{1:'Firestreak',2:'Firestreak'}}});
V({id:'Mirage F1CT',src:'Mirage F1',ac:{name:'Mirage F1CT',empty:7400},ccip:true,add:{2:['AS-30L','AS-37 Martel'],6:['AS-30L','AS-37 Martel'],3:['Belouga','SAMP 250'],5:['Belouga','SAMP 250']},
  role:'FRANCE / ECUADOR · TACTICAL STRIKE F1 · CYRANO IVM · AS-30L · BELOUGA · MAGIC 2'});
V({id:'Mirage F1CR',src:'Mirage F1',ac:{name:'Mirage F1CR',empty:7800},role:'FRANCE · TACTICAL RECONNAISSANCE F1 · CYRANO IVMR · CAMERAS · MAGIC 2'});
V({id:'Mirage 2000-9',src:'Mirage 2000-5',crew:'WSO',ac:{name:'Mirage 2000-9',empty:7800},ccip:true,add:{C:['SCALP-EG']},
  role:'UAE · TWO-SEAT MULTIROLE · RDY-2 · MICA · SCALP-EG · M53-P2'});
V({id:'Mirage 2000N',src:'Mirage 2000D',ac:{name:'Mirage 2000N',empty:7500},
  role:'FRANCE · LOW-LEVEL STRIKE · ANTILOPE V · TERRAIN FOLLOWING · CONVENTIONAL STORES (ASMP NOT MODELLED) · WSO'});
V({id:'EF-2000 T1',src:'EF-2000',drop:['Meteor','AIM-120D','AIM-9X','SCALP-EG','Taurus'],
  wm:(w)=>({'Meteor':'AIM-120C','AIM-120D':'AIM-120C','SCALP-EG':null,'Taurus':null})[w]===undefined?w:({'Meteor':'AIM-120C','AIM-120D':'AIM-120C','SCALP-EG':null,'Taurus':null})[w],
  ac:{name:'Eurofighter Typhoon T1'},role:'UK / GERMANY / ITALY / SPAIN · TRANCHE 1 · CAPTOR-M · AIM-120C · ASRAAM / IRIS-T'});
V({id:'EF-2000 T3',src:'EF-2000',ac:{name:'Eurofighter Typhoon T3',radar:R('CAPTOR-E',90*NM_,[10,20,40,80,160],'NM',.92,{aesa:1,beam:2.6*D2R}),twsN:8,trkN:20},
  add:{3:['SCALP-EG','Taurus'],7:['SCALP-EG','Taurus']},role:'UK / GERMANY / ITALY / SPAIN · TRANCHE 3 · CAPTOR-E AESA · METEOR · STORM SHADOW / TAURUS'});
V({id:'J 35A',src:'J 35F',ac:{name:'J 35A Draken',empty:7200,mil:49000,ab:68000,radar:R('S7B sight (ranging)',6000,[2,5],'NM',.05)},
  stn:{1:['Rb 24'],6:['Rb 24'],2:['TK'],3:['TK'],4:['TK'],5:['TK']},role:'SWEDEN · FIRST DRAKEN · RM6B · 2× ADEN · RB 24',
  load:{cold:{1:'Rb 24',6:'Rb 24',3:'TK',4:'TK'}}});
V({id:'J 35D',src:'J 35F',ac:{name:'J 35D Draken',ab:73500,radar:R('PS-03/A',20000,[10,25,50],'KM',.05)},
  role:'SWEDEN · DRAKEN D · RM6C · PS-03/A · RB 24 / RB 27 / RB 28'});
V({id:'Gripen A',src:'JAS-39C',ac:{name:'JAS 39A Gripen',empty:6622},wm:mapOf({'IRIS-T':'Rb 74','Meteor':'Rb 99','AIM-120C':'Rb 99'}),
  drop:['IRIS-T','Meteor','AIM-120C','AIM-120D'],add:{3:['Rb 99'],7:['Rb 99'],2:['Rb 99'],8:['Rb 99']},role:'SWEDEN · GRIPEN A · RM12 · PS-05/A · RB 74 / RB 99'});
V({id:'Gripen B',src:'JAS-39C',crew:'Instructor',ac:{name:'JAS 39B Gripen',empty:6800,fuel:1900},wm:mapOf({'IRIS-T':'Rb 74','Meteor':'Rb 99','AIM-120C':'Rb 99'}),
  drop:['IRIS-T','Meteor','AIM-120C','AIM-120D'],add:{3:['Rb 99'],7:['Rb 99'],2:['Rb 99'],8:['Rb 99']},role:'SWEDEN · TWO-SEAT GRIPEN · RM12 · PS-05/A · RB 74 / RB 99'});
V({id:'Lavi',src:'F-16C',side:'BLUE',ccip:true,hms:undefined,call:'LAVI',nctr:'LAVI',foe:'MiG-29S',eng:'PW1120',dl:false,
  ac:{name:'IAI Lavi',empty:7031,fuel:2700,S:33,mil:62300,ab:90300,gLim:9,rcs:1.5,radar:R('EL/M-2035',60*NM_,[10,20,40,80],'NM',.7)},
  drop:['AIM-120A','AIM-120B','AIM-120C','AIM-120D','AIM-9X','AIM-9M','AGM-88E','AGM-154A'],add:{1:['Python 3'],9:['Python 3'],2:['Python 3','Derby'],8:['Python 3','Derby']},
  wm:mapOf({'AIM-120C':'Derby','AIM-9X':'Python 3','AIM-9M':'Python 3'}),role:'ISRAEL (CANCELLED 1987) · CANARD-DELTA MULTIROLE · PW1120 · EL/M-2035 · PYTHON 3 / DERBY'});
V({id:'Nesher',src:'Mirage 5',side:'BLUE',call:'NESHER',nctr:'MIRAGE 5',foe:'MiG-21',eng:'Atar 9C',ac:{name:'IAI Nesher'},wm:mapOf({'Magic 1':'Shafrir 2'}),
  add:{1:['Shafrir 2'],5:['Shafrir 2']},role:'ISRAEL · MIRAGE 5 COPY · ATAR 9C · 2× DEFA · SHAFRIR · BOMBS'});

/* ======================================================= ASIA ======================================================= */
V({id:'F-2B',src:'F-2A',crew:'Instructor',ac:{name:'F-2B',fuel:3600,empty:9800},role:'JAPAN · TWO-SEAT F-2 · J/APG-1 AESA · AAM-4B / AAM-5'});
V({id:'J-10B',src:'J-10C',ac:{name:'J-10B',mil:79400,ab:122500,radar:R('KLJ-7',70*NM_,[10,25,50,100,200],'KM',.85,{aesa:1,beam:3*D2R})},drop:['PL-15'],wm:mapOf({'PL-15':'PL-12'}),
  role:'CHINA · MULTIROLE · AL-31FN S3 · AESA · IRST · PL-12 / PL-10'});
V({id:'Tejas Mk2',src:'Tejas Mk1A',ac:{name:'Tejas Mk 2',empty:7000,mil:62000,ab:98000,gLim:9,radar:R('Uttam AESA',100*NM_,[10,20,40,80,160],'NM',.9,{aesa:1,beam:2.8*D2R}),twsN:8,trkN:20},
  role:'INDIA · MEDIUM-WEIGHT FIGHTER · F414-INS6 · UTTAM AESA · ASTRA / PYTHON 5 / I-DERBY ER'});
V({id:'Kaan',src:'F-22',side:'BLUE',call:'KAAN',nctr:'KAAN',foe:'Su-57',eng:'2× F110-GE-129',dl:true,
  ac:{name:'TF-2000 Kaan',empty:14000,fuel:7700,mil:154000,ab:262000,gLim:9,rcs:.05,radar:R('MURAD-100A AESA',100*NM_,[10,20,40,80,160],'NM',.92,{aesa:1,beam:2.6*D2R}),twsN:8,trkN:24},
  drop:['AIM-120D','AIM-9X'],add:{1:['IRIS-T'],9:['IRIS-T'],2:['Meteor'],3:['Meteor'],4:['Meteor'],6:['Meteor'],7:['Meteor'],8:['Meteor']},wm:mapOf({'AIM-120D':'Meteor','AIM-120C':'Meteor','AIM-9X':'IRIS-T'}),
  role:'TURKEY (PROTOTYPE) · TWIN-ENGINE 5TH-GEN · MURAD AESA · METEOR / IRIS-T'});
V({id:'Marut',src:'Hunter F.6',side:'BLUE',call:'MARUT',nctr:'HF-24',foe:'MiG-21',eng:'2× Orpheus 703',
  ac:{name:'HAL HF-24 Marut',empty:6195,fuel:2000,mil:44400,ab:44400,gLim:7},drop:['AIM-9B'],role:'INDIA · TWIN-ENGINE FIGHTER-BOMBER · 4× ADEN · ROCKETS / BOMBS'});
V({id:'Hurjet',src:'M-346FA',side:'BLUE',call:'HURJET',nctr:'HURJET',foe:'MiG-29S',eng:'F404-GE-102',
  ac:{name:'Hurjet',empty:4800,mil:48900,ab:78700},role:'TURKEY · LIGHT FIGHTER / ADVANCED TRAINER · F404-GE-102 · AESA (OPTIONAL)'});

/* ====================================================== SOVIET ====================================================== */
V({id:'MiG-21F-13',src:'MiG-21',ac:{name:'MiG-21F-13',empty:4800,mil:38700,ab:56400,gun:G_('NR-30 30 mm',85,780,26,60,.0035),radar:R('SRD-5 Kvant (ranging)',10000,[5,10],'KM',.02)},
  stn:{1:['R-3S'],4:['R-3S'],2:['TK','FAB-250','UB-16'],3:['TK','FAB-250','UB-16'],C:['PTB']},
  role:'USSR · FISHBED-C · ONE CANNON · 2× R-3S · RANGING ONLY',load:{cold:{1:'R-3S',4:'R-3S',C:'PTB'},modern:{1:'R-3S',4:'R-3S',C:'PTB'}},cms:[0,0]});
V({id:'MiG-21PF',src:'MiG-21MF',ac:{name:'MiG-21PF',empty:5000,mil:38700,ab:60800,gun:NOGUN,radar:R('TsD-30',15000,[10,25],'KM',.05)},
  role:'USSR · FISHBED-D · TSD-30 RADAR · NO GUN · R-3S / R-3R'});
V({id:'MiG-23MS',src:'MiG-23',ac:{name:'MiG-23MS',mil:79000,ab:122500,radar:R('Sapfir-23E',30000,[10,25,50],'KM',.05)},
  drop:['R-24R','R-24T'],wm:mapOf({'R-24R':'R-13M','R-24T':'R-13M'}),add:{1:['R-13M'],4:['R-13M']},
  role:'USSR / EXPORT · FLOGGER-E · SAPFIR-23E · R-13M / R-60M · NO R-24'});
V({id:'MiG-23MLD',src:'MiG-23',ac:{name:'MiG-23MLD',radar:R('Sapfir-23D-III',40000,[10,25,50,100],'KM',.05)},add:{2:['R-73'],3:['R-73']},
  role:'USSR · FLOGGER-K · UPDATED SAPFIR-23D · R-73 · R-24R / T'});
V({id:'MiG-23-98',src:'MiG-23',ac:{name:'MiG-23-98',radar:R('Kopyo-M',40*NM_,[10,25,50,100],'KM',.7),twsN:4,trkN:8,pulse:false},hms:'HMS_ALWAYS',
  add:{1:['R-77'],4:['R-77'],2:['R-73'],3:['R-73']},role:'RUSSIA / BELARUS (UPGRADE) · MIG-23 WITH KOPYO RADAR · R-77 / R-73'});
V({id:'MiG-23BN',src:'MiG-27K',ac:{name:'MiG-23BN',mil:81000,ab:117000,gun:G_('GSh-23L',57,715,12,200,.0032)},
  drop:['Kh-29TD','Kh-29L','Kh-58U','KAB-500Kr','Kh-31P'],wm:mapOf({'Kh-29TD':'Kh-25ML','Kh-29L':'Kh-25ML','KAB-500Kr':'FAB-500'}),
  role:'USSR / EXPORT · FLOGGER-F · FIGHTER-BOMBER · KLEN LASER RANGER · KH-25ML / FAB'});
V({id:'MiG-27M',src:'MiG-27K',ac:{name:'MiG-27M',mil:80000,ab:116000,gun:AC['Su-24M']&&AC['Su-24M'].gun},
  drop:['Kh-29TD'],wm:mapOf({'Kh-29TD':'Kh-29L'}),role:'USSR · FLOGGER-J · GSH-6-23M · KAIRA · KH-25ML / KH-29L'});
V({id:'Su-24MR',src:'Su-24M',ac:{name:'Su-24MR',gun:NOGUN},drop:['Kh-29TD','Kh-29L','Kh-29T','Kh-58U','Kh-31P','KAB-500Kr','KAB-1500L','FAB-500','FAB-250','OFAB-250','S-25O','S-24B','B-8M1'],
  role:'USSR / RUSSIA · TACTICAL RECONNAISSANCE · SLAR / TV / ELINT PODS · R-60M',load:{cold:{1:'R-60M',7:'R-60M',C:'PTB'},modern:{1:'R-60M',7:'R-60M',C:'PTB'}}});
V({id:'Su-25UB',src:'Su-25',crew:'Instructor',ac:{name:'Su-25UB',empty:9800},role:'USSR / RUSSIA · TWO-SEAT FROGFOOT'});
V({id:'Su-27P',src:'Su-27',ac:{name:'Su-27P'},role:'PVO · FLANKER-B AIR DEFENCE VERSION · N001 · R-27 / R-73 · NO GROUND ATTACK'});
V({id:'Il-28',src:'Buccaneer S.2B',side:'RED',cv:false,call:'BEAGLE',nctr:'IL-28',foe:'F-86F',eng:'2× VK-1',crew:'Navigator',
  ac:{name:'Il-28 Beagle',empty:12890,fuel:6500,S:60.8,mil:53000,ab:53000,gLim:3,roll:1.2,vne:900,gun:G_('2× NR-23 23 mm',100,690,13,200,.004),rcs:20},
  stn:{2:['TK'],8:['TK'],3:['FAB-250','FAB-500','OFAB-250'],4:['FAB-250','FAB-500','OFAB-250'],6:['FAB-250','FAB-500','OFAB-250'],7:['FAB-250','FAB-500','OFAB-250'],C:[]},
  role:'USSR / CHINA / EGYPT · TWIN-JET LIGHT BOMBER · 2× NR-23 · FAB-250 / 500',cms:[0,0],
  load:{cold:{2:'TK',8:'TK',3:'FAB-250',4:'FAB-250',6:'FAB-250',7:'FAB-250'},strike:{3:'FAB-500',4:'FAB-500',6:'FAB-500',7:'FAB-500'}}});
V({id:'J-5',src:'MiG-17F',side:'RED',call:'FRESCO',nctr:'MIG-17',foe:'F-86F',ac:{name:'J-5 (Shenyang)'},role:'CHINA · LICENCE MIG-17F · WP-5 · 1× 37 MM + 2× 23 MM'});

/* ---------------- campaign pools ---------------- */
const NEWIDS=()=>M.NEW.slice(n0).map(s=>s.id);
try{const ids=NEWIDS();const bl=ids.filter(i=>AC[i]&&!RUS.has(i)),rd=ids.filter(i=>AC[i]&&RUS.has(i));
  const add=(era,side,role,list)=>{const T=CTYPES[era]&&CTYPES[era][side]&&CTYPES[era][side][role];if(!T)return;for(const id of list)if(AC[id]&&!T.includes(id))T.push(id);};
  const bCAP=['F-100D','F-104A','F-15A','F-15D','F-16B','F-18A','F-4N','F-4S','F-4EJ','Lightning F.1','J 35A','J 35D','Gripen A','Gripen B','Mirage F1CT','F-2B','EF-2000 T1','EF-2000 T3','Lavi','Nesher','Marut','Tejas Mk2','Kaan','Mirage 2000-9','Hawker P.1154'];
  const bSTK=['F-100D','F-101A','F-104C','A-4F','A-4M','A-7E','A-6A','A-10A','F-111A','F-105G','Scimitar','Etendard IVM','Canberra','Buccaneer S.1','Hunter FGA.9','Mirage F1CT','Mirage 2000N','Nesher','Marut'];
  const bESC=['F-15A','F-18A','F-4N','F-4S','F-4EJ','EF-2000 T3'];
  const rCAP=['MiG-21F-13','MiG-21PF','MiG-23MS','MiG-23MLD','MiG-23-98','Su-27P','J-5','J-10B'];
  const rSTK=['MiG-23BN','MiG-27M','Su-24MR','Il-28','Su-25UB'];
  for(const era of['cold','modern']){add(era,0,'CAP',bCAP);add(era,0,'STK',bSTK);add(era,0,'ESC',bESC);add(era,1,'CAP',rCAP);add(era,1,'STK',rSTK);add(era,1,'ESC',['MiG-23MLD','MiG-23-98','Su-27P']);}
}catch(e){console.warn('[v319] campaign',e);}
for(const s of M.NEW.slice(n0))if(!AC[FOE[s.id]])FOE[s.id]=s.side==='RED'?'F-4E':'MiG-21';
window.V319_NEW=M.NEW.slice(n0).map(s=>s.id);
console.info('[v319] added '+window.V319_NEW.length+' jets: '+window.V319_NEW.join(', '));
})();
