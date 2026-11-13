/* =====================================================================================================================
   v317 — Hangar: Cold War interceptors and the Matra R.511 / Fireflash carriers, plus the Su-39, Phantom FGR.2, EA-6B and F3H Demon.
   Same rules as more-jets.js: each jet is a clone of the closest existing airframe (cockpit, HUD and 3D model are the parent's for
   now) with its own flight numbers, radar, gun, stations and loadouts. Figures are gameplay-level estimates from public data.
   New missiles: Matra R.511, Fairey Fireflash, RS-2US (K-5MS), R-8MR / R-8MT (K-8M), AIM-7C Sparrow III.
   Needs coldwar.js, modern-jets.js and more-jets.js loaded first.
   ===================================================================================================================== */
(function(){
'use strict';
const M=window.MJ,H=window.CW_HELP;if(!M||!H){console.warn('[v317] helpers missing');return;}
const {addM,R,G_,NOGUN}=M;const NM_=NM,D=D2R,n0=M.NEW.length;
const has=id=>!!AC[id];
const cp=o=>Object.assign({},o||{});
function loads(src,over,map){const o={};for(const k of['cold','modern','strike']){
  const base=k==='strike'?(STRIKE_LOAD[src]||LOAD.modern[src]):(LOAD[k]&&LOAD[k][src]);if(!base)continue;
  const r=cp(base);if(map)for(const s of Object.keys(r))r[s]=map(r[s],s)||r[s];if(over&&over[k])Object.assign(r,over[k]);o[k]=r;}return o;}

/* ---------------- new missiles (same cloning rule as coldwar.js: motor from mass / burn / acceleration; era-neutral) ---------------- */
function aam(k,base,over,shape,dia,sn,name){if(MSL[k]||!MSL[base])return;const d=Object.assign({},MSL[base],over);delete d.ph;delete d.apn;
  const S=Math.PI*dia*dia/4,dv=d.acc*d.burn,mbo=d.mass*Math.exp(-dv/2350),mp=d.mass-mbo,I=mp*2350,tb=d.burn;
  d.ph={S,dia,m0:d.mass,mp,mbo,tb,ts:0,gap:0,Tb:I/tb,Ts:0,mdB:mp/tb,mdS:0,cd0:2.38*d.cd*mbo/S,cnMax:.004*mbo/S*(d.cnK||1)};d.ph.cna=d.ph.cnMax/.38;d.burnT=tb;
  if(d.trk==null)d.trk=d.seek==='IR'?.6:.5;
  d.rcs=+Math.max(.02,Math.min(.25,.015+d.mass/3500)).toFixed(3);d.irsB=+Math.max(.4,Math.min(2.4,.4+d.mass/400)).toFixed(2);d.irsC=.03;
  MSL[k]=d;SHAPE[k]=shape;MDIA[k]=dia;if(!MSL_KEYS.includes(k))MSL_KEYS.push(k);SN[k]=sn;WNAME[k]=name;
  if(d.seek==='IR'&&H.IRN)H.IRN.add(k);}
try{
  // Matra R.511 (1957): semi-active radar, 180 kg, short range, poor manoeuvre
  aam('R511','R530',{mass:180,acc:100,burn:2.4,cd:6.2e-5,maxG:8,fuse:8,life:22,res:.3,rmin:1000,aiR:6000},{L:3.1,R:.13,f:[[.2,.4,.3],[2.2,.3,.2]]},.264,'R511','Matra R.511 · SARH');
  // Fairey Fireflash (1957): beam-riding, 148 kg, ~5 km, only ever on the Swift F.7
  aam('Fireflash','AIM-4F',{mass:148,acc:110,burn:2.5,cd:6e-5,maxG:5,gimbal:20*D,fuse:5,contact:0,life:18,res:.12,rmin:800,aiR:4500,aiOff:10*D},{L:2.86,R:.073,f:[[.2,.36,.25],[2,.3,.2]]},.146,'FFLH','Fairey Fireflash · beam-riding');
  // RS-2US (K-5MS): beam-riding, 82.5 kg, Su-9 / MiG-19PM
  aam('RS-2US','AIM-4F',{mass:82.5,acc:130,burn:2.2,cd:6.5e-5,maxG:6,gimbal:25*D,fuse:6,contact:0,life:18,res:.2,rmin:800,aiR:5000,aiOff:8*D},{L:2.4,R:.1,f:[[.2,.36,.25],[1.8,.3,.2]]},.2,'RS2U','RS-2US (K-5MS) · beam-riding');
  // K-8M: R-8MR (semi-active radar) and R-8MT (IR), ~275 kg, Su-11
  aam('R-8MR','R-98R',{mass:275,aiR:9000,maxG:7,life:30},{L:3.9,R:.14,f:[[.2,.4,.3],[2.8,.3,.2]]},.275,'R8MR','R-8MR (K-8M) · SARH');
  aam('R-8MT','R-98T',{mass:275,irR:6000,aiR:5500,maxG:7,life:30},{L:3.9,R:.14,f:[[.2,.4,.3],[2.8,.3,.2]]},.275,'R8MT','R-8MT (K-8M) · IR');
  // AIM-7C Sparrow III: first radar-guided Sparrow to enter service (F3H-2M, F-4B)
  aam('AIM-7C','AIM-7E',{mass:143,aiR:9000,maxG:8,life:28,acc:110},SHAPE['AIM-7E'],.203,'A7C','AIM-7C Sparrow III · SARH');
}catch(e){console.warn('[v317] missiles',e);}

const CDEF=(n)=>({cold:{n,jp:2.4,dec:.85,kg:0,cd:0,warm:10},modern:{n,jp:2.4,dec:.85,kg:0,cd:0,warm:10}});

/* ---------------- REDFOR ---------------- */
// Su-9 'Fishpot': AL-7F-1 (~100 kN ab), TsD-30 ranging radar, 4× RS-2US beam-riders, no gun
if(has('Su-15TM'))addM({id:'Su-9',src:'Su-15TM',side:'RED',call:'FISHPOT',nctr:'SU-9',foe:'F-4E',eng:'AL-7F-1',
  role:'PVO · DELTA-WING INTERCEPTOR · TSD-30 · 4× RS-2US BEAM-RIDERS · GCI',stall:{s:.2,twin:0},
  ac:{name:'Su-9',empty:8400,fuel:2900,S:34,CLa:3.0,cd0:.021,k:.17,mil:68000,ab:100000,gLim:5.5,aoaLim:18,roll:3,rcs:5,irs:1.2,dW:12500,
    radar:R('TsD-30',20000,[10,25],'KM',.05),pulse:true,gun:NOGUN,vne:undefined},
  stn:{1:['RS-2US'],2:['RS-2US'],3:['RS-2US'],4:['RS-2US'],'1B':[],'4B':[],C:['PTB']},
  load:{cold:{1:'RS-2US',2:'RS-2US',3:'RS-2US',4:'RS-2US',C:'PTB'}},cms:[0,0]});
// Su-11 'Fishpot-C': Su-9 with the AL-7F-2, TsD-30T radar and 2× K-8M
if(has('Su-15TM'))addM({id:'Su-11',src:'Su-15TM',side:'RED',call:'FISHPOT-C',nctr:'SU-11',foe:'F-4E',eng:'AL-7F-2',
  role:'PVO · DELTA-WING INTERCEPTOR · TSD-30T · 2× K-8M · GCI',stall:{s:.2,twin:0},
  ac:{name:'Su-11',empty:9100,fuel:3100,S:34,CLa:3.0,cd0:.021,k:.17,mil:72000,ab:99000,gLim:5.5,aoaLim:18,roll:3,rcs:5,irs:1.2,dW:13500,
    radar:R('TsD-30T',25000,[10,25,50],'KM',.05),pulse:true,gun:NOGUN,vne:undefined},
  stn:{1:['R-8MR','R-8MT'],4:['R-8MR','R-8MT'],2:[],3:[],'1B':[],'4B':[],C:['PTB']},
  load:{cold:{1:'R-8MR',4:'R-8MT',C:'PTB'}},cms:[0,0]});
// Su-39: Su-25TM export, Kopyo-class radar is not modelled; 16× Vikhr, R-73 tips, Khibiny-class defences as the Su-25T
if(has('Su-25T'))addM({id:'Su-39',src:'Su-25T',side:'RED',call:'FROGFOOT',nctr:'SU-25',foe:'A-10C',eng:'2× R-195',ccip:true,
  role:'RUSSIA · ANTI-TANK ATTACK · SHKVAL · 16× VIKHR · R-73',
  ac:{name:'Su-39 Frogfoot',empty:10500},
  load:loads('Su-25T')});

/* ---------------- BLUFOR: UK / FRANCE / USA ---------------- */
// Phantom FGR.2: RAF F-4M, 2× RB.168-25R Spey, AN/AWG-12, Sky Flash / AIM-9L, SUU-23 gun pod (no internal gun)
if(has('F-4E'))addM({id:'Phantom FGR.2',src:'F-4E',side:'BLUE',call:'PHANTOM',nctr:'F-4',foe:'MiG-23',eng:'2× RB.168-25R Spey',crew:'RIO',ccip:true,
  role:'RAF · AIR DEFENCE / STRIKE · SPEY ENGINES · AWG-12 · SKY FLASH / AIM-9L · PILOT + NAV',
  ac:{name:'Phantom FGR.2',empty:14400,mil:109000,ab:182400,radar:R('AWG-12',34*NM_,[5,10,25,50],'NM',.05),pulse:true,gun:NOGUN},
  add:{3:['Sky Flash'],4:['Sky Flash'],6:['Sky Flash'],7:['Sky Flash'],2:['AIM-9L'],8:['AIM-9L'],'2b':['AIM-9L'],'8b':['AIM-9L']},
  drop:['AIM-9M','AIM-7M','AIM-7P','AIM-9X','AGM-65A','AGM-65B','AGM-65D','AGM-65G','AGM-65H','GBU-10','GBU-12','GBU-24','CBU-87'],
  load:loads('F-4E',{cold:{2:'AIM-9G',8:'AIM-9G','2b':'AIM-9G','8b':'AIM-9G'},modern:{2:'AIM-9L',8:'AIM-9L','2b':'AIM-9L','8b':'AIM-9L',3:'Sky Flash',4:'Sky Flash',6:'Sky Flash',7:'Sky Flash'}})});

// EA-6B Prowler: 2× J52-P-408, ALQ-99 tactical jamming system on up to five pods, HARM on the outer pylons, pilot + 3 ECMOs (2 modelled)
if(has('A-6E'))addM({id:'EA-6B',src:'A-6E',side:'BLUE',call:'PROWLER',nctr:'EA-6',foe:'MiG-29S',eng:'2× J52-P-408',crew:'ECMO',cv:true,app:118,noAB:true,
  role:'USN / USMC · ELECTRONIC WARFARE · ALQ-99 TJS · HARM · PILOT + ECMO',
  ac:{name:'EA-6B Prowler',empty:14300,fuel:6800,mil:99600,ab:99600,gLim:3.8},
  stn:{2:['AGM-88C','TK'],8:['AGM-88C','TK'],3:['ALQ-99','TK'],7:['ALQ-99','TK'],4:['ALQ-99','TK'],6:['ALQ-99','TK'],C:['ALQ-99']},
  ecm:CDEF('ALQ-99 TJS'),
  load:{cold:{3:'ALQ-99',4:'ALQ-99',6:'ALQ-99',7:'ALQ-99',2:'TK',8:'TK',C:'ALQ-99'},modern:{3:'ALQ-99',4:'ALQ-99',6:'ALQ-99',7:'ALQ-99',2:'AGM-88C',8:'AGM-88C',C:'ALQ-99'}}});

// F3H-2 Demon: J71-A-2E (65.6 kN ab), APG-51 pulse radar, 4× Mk 12 20 mm, AIM-7C Sparrow III / AIM-9B, carrier
if(has('F-8E'))addM({id:'F3H-2',src:'F-8E',side:'BLUE',call:'DEMON',nctr:'F3H',foe:'MiG-17F',eng:'J71-A-2E',cv:true,app:130,noAB:false,
  role:'USN · CARRIER ALL-WEATHER FIGHTER · APG-51 · AIM-7C / AIM-9B · 4× MK 12',
  ac:{name:'F3H-2 Demon',empty:10040,fuel:3400,S:48.2,mil:42300,ab:65600,gLim:6.5,aoaLim:18,radar:R('APG-51',16*NM_,[5,10,25],'NM',.05),pulse:true},
  stn:{1:['AIM-9B','AIM-7C'],2:['AIM-9B','AIM-7C'],3:['AIM-9B','AIM-7C'],4:['AIM-9B','AIM-7C'],5:['TK','Mk-82','Mk-83'],6:['TK','Mk-82','Mk-83']},
  load:{cold:{1:'AIM-7C',2:'AIM-9B',3:'AIM-9B',4:'AIM-7C'},strike:{1:'AIM-9B',2:'AIM-9B',5:'Mk-83',6:'Mk-83'}}});

// Gloster Javelin FAW.9: 2× Sapphire, AI.17 radar, 4× Firestreak, 2× ADEN, crew of two
if(has('F-101B'))addM({id:'Javelin FAW.9',src:'F-101B',side:'BLUE',call:'JAVELIN',nctr:'JAVELIN',foe:'Tu-128',eng:'2× Sapphire Sa.7R',crew:'Navigator',noAB:false,
  role:'RAF · ALL-WEATHER INTERCEPTOR · AI.17 · 4× FIRESTREAK · 2× ADEN · PILOT + NAV',
  ac:{name:'Javelin FAW.9',empty:10900,fuel:5000,mil:97800,ab:115600,gLim:5,aoaLim:16,radar:R('AI.17',30000,[10,25,50],'KM',.05),pulse:true,
    gun:G_('2× ADEN 30 mm',85,790,26,200,.0035)},
  stn:{1:['Firestreak'],2:['Firestreak'],3:['Firestreak'],4:['Firestreak'],5:['TK'],6:['TK']},
  load:{cold:{1:'Firestreak',2:'Firestreak',3:'Firestreak',4:'Firestreak',5:'TK',6:'TK'}}});
// Sea Vixen FAW.2: 2× Avon 208, AI.18, Red Top / Firestreak, carrier, pilot + observer
if(has('F-101B'))addM({id:'Sea Vixen FAW.2',src:'F-101B',side:'BLUE',call:'VIXEN',nctr:'SEA VIXEN',foe:'MiG-21',eng:'2× Avon 208',crew:'Observer',cv:true,app:118,noAB:true,
  role:'ROYAL NAVY · CARRIER ALL-WEATHER FIGHTER · AI.18 · RED TOP / FIRESTREAK · PILOT + OBSERVER',
  ac:{name:'Sea Vixen FAW.2',empty:9500,fuel:4100,mil:100200,ab:100200,gLim:5,aoaLim:16,radar:R('AI.18',30000,[10,25,50],'KM',.05),pulse:true,gun:NOGUN},
  stn:{1:['Red Top','Firestreak'],2:['Red Top','Firestreak'],3:['Red Top','Firestreak'],4:['Red Top','Firestreak'],5:['TK'],6:['TK']},
  load:{cold:{1:'Red Top',2:'Red Top',3:'Red Top',4:'Red Top',5:'TK',6:'TK'}}});

// Mirage IIIC: Atar 9B (58.8 kN ab), Cyrano I, 2× DEFA 552; R.511 / R.530 / AIM-9B
if(has('Mirage III'))addM({id:'Mirage IIIC',src:'Mirage III',side:'BLUE',call:'MIRAGE',nctr:'MIRAGE III',foe:'MiG-21',eng:'Atar 9B',
  role:'FRANCE / ISRAEL · DELTA INTERCEPTOR · CYRANO I · R.511 / R.530 / AIM-9B',
  ac:{name:'Mirage IIIC',empty:6100,mil:41000,ab:58800,radar:R('Cyrano I',27000,[10,25,50],'KM',.05),pulse:true},
  add:{1:['R511'],5:['R511'],C:['R511']},
  load:{cold:{1:'AIM-9B',5:'AIM-9B',C:'R530',2:'TK',4:'TK'},strike:{1:'AIM-9B',5:'AIM-9B',C:'SAMP 250',2:'SAMP 250',4:'SAMP 250'}}});
// Super Mystère B2: Atar 101G-3 (44.1 kN ab), Aida ranging radar, 2× DEFA 30 mm, 2× R.511 on the wingtips, Matra F1 rocket pods
if(has('F-100A'))addM({id:'Super Mystere',src:'F-100A',side:'BLUE',call:'MYSTERE',nctr:'MYSTERE',foe:'MiG-19',eng:'Atar 101G-3',
  role:'FRANCE / ISRAEL · SUPERSONIC FIGHTER · 2× DEFA 30 MM · R.511 · MATRA F1 ROCKETS',
  ac:{name:'Super Mystere B2',empty:6400,fuel:2300,mil:33300,ab:44100,gLim:7,gun:AC['Mirage III']&&AC['Mirage III'].gun?AC['Mirage III'].gun:G_('2× DEFA 552',1,1,1,1)},
  stn:{1:['R511','AIM-9B'],6:['R511','AIM-9B'],2:['TK','Matra F1','Mk-82'],5:['TK','Matra F1','Mk-82'],3:['TK','Mk-82','Mk-83'],4:['TK','Mk-82','Mk-83']},
  load:{cold:{1:'R511',6:'R511',2:'TK',5:'TK'},strike:{1:'R511',6:'R511',2:'Matra F1',5:'Matra F1',3:'Mk-82',4:'Mk-82'}}});
// Vautour IIN: 2× Atar 101E-3, Aida II, 4× DEFA 30 mm, 2× R.511, crew of two
if(has('F-101B'))addM({id:'Vautour IIN',src:'F-101B',side:'BLUE',call:'VAUTOUR',nctr:'VAUTOUR',foe:'MiG-19',eng:'2× Atar 101E-3',crew:'Navigator',noAB:true,
  role:'FRANCE / ISRAEL · ALL-WEATHER FIGHTER · AIDA II · 4× DEFA 30 MM · R.511 · PILOT + NAV',
  ac:{name:'Vautour IIN',empty:10500,fuel:4500,mil:68600,ab:68600,gLim:5,aoaLim:16,radar:R('Aida II',20000,[10,25],'KM',.05),pulse:true,
    gun:G_('4× DEFA 551 30 mm',100,790,26,400,.0035)},
  stn:{1:['R511'],2:['R511'],3:['Matra F1','TK'],4:['Matra F1','TK'],5:['TK'],6:['TK']},
  load:{cold:{1:'R511',2:'R511',5:'TK',6:'TK'}}});
// Mystère IVA: Tay 250A (34.3 kN, no reheat), 2× DEFA 30 mm, rocket pods / bombs
if(has('F-86F'))addM({id:'Mystere IVA',src:'F-86F',side:'BLUE',call:'MYSTERE',nctr:'MYSTERE',foe:'MiG-17F',eng:'Hispano Tay 250A',noAB:true,
  role:'FRANCE / ISRAEL · TRANSONIC FIGHTER-BOMBER · 2× DEFA 30 MM',
  ac:{name:'Mystere IVA',empty:5870,fuel:2000,mil:34300,ab:34300,gLim:7.5,gun:AC['Mirage III']&&AC['Mirage III'].gun?AC['Mirage III'].gun:G_('2× DEFA 552',1,1,1,1),radar:Object.assign({},AC['F-86F'].radar,{name:'Aida ranging (ACM)'})},
  add:{2:['Matra F1'],3:['Matra F1']},drop:['AIM-9B'],
  load:{cold:{2:'TK',3:'TK'},strike:{1:'Mk-82',4:'Mk-82',2:'Matra F1',3:'Matra F1'}}});
// Swift F.7: Avon 114, 2× ADEN, 2× Fairey Fireflash (the only aircraft that carried it)
if(has('F-86F'))addM({id:'Swift F.7',src:'F-86F',side:'BLUE',call:'SWIFT',nctr:'SWIFT',foe:'MiG-17F',eng:'RR Avon 114',noAB:true,
  role:'RAF · TRANSONIC FIGHTER · 2× ADEN · 2× FIREFLASH BEAM-RIDERS',
  ac:{name:'Swift F.7',empty:6350,fuel:1800,mil:45000,ab:45000,gLim:7,gun:G_('2× ADEN 30 mm',85,790,26,300,.0035)},
  stn:{1:['Fireflash','AIM-9B'],4:['Fireflash','AIM-9B'],2:['TK','Mk-82'],3:['TK','Mk-82']},
  load:{cold:{1:'Fireflash',4:'Fireflash',2:'TK',3:'TK'},strike:{1:'Mk-82',4:'Mk-82',2:'TK',3:'TK'}}});
// Folland Gnat F.1: Orpheus 701 (21.1 kN), 2× ADEN, tiny
if(has('F-86F'))addM({id:'Gnat F.1',src:'F-86F',side:'BLUE',call:'GNAT',nctr:'GNAT',foe:'MiG-17F',eng:'Bristol Orpheus 701',noAB:true,
  role:'INDIA / FINLAND / UK · LIGHT FIGHTER ("SABRE SLAYER") · 2× ADEN',
  ac:{name:'Gnat F.1',empty:2200,fuel:520,S:16.2,mil:21100,ab:21100,gLim:7,roll:5.5,rcs:1.5,gun:G_('2× ADEN 30 mm',85,790,26,230,.0035)},
  drop:['AIM-9B','Mk-83'],
  load:{cold:{2:'TK',3:'TK'},strike:{1:'Mk-82',4:'Mk-82'}}});
// Vampire FB.5: Goblin 3 (15.6 kN), 4× Hispano 20 mm
if(has('F-86F'))addM({id:'Vampire FB.5',src:'F-86F',side:'BLUE',call:'VAMPIRE',nctr:'VAMPIRE',foe:'MiG-15',eng:'DH Goblin 3',noAB:true,
  role:'RAF / COMMONWEALTH · FIRST-GENERATION JET FIGHTER-BOMBER · 4× HISPANO 20 MM',
  ac:{name:'Vampire FB.5',empty:3300,fuel:900,S:24.3,mil:15600,ab:15600,gLim:6,roll:3.8,rcs:3,vne:880,gun:G_('4× Hispano Mk 5 20 mm',130,840,16,600,.0035)},
  drop:['AIM-9B'],
  load:{cold:{2:'TK',3:'TK'},strike:{1:'Mk-82',4:'Mk-82'}}});
// Gloster Meteor F.8: 2× Derwent 5 (31.2 kN), 4× Hispano 20 mm
if(has('F-86F'))addM({id:'Meteor F.8',src:'F-86F',side:'BLUE',call:'METEOR',nctr:'METEOR',foe:'MiG-15',eng:'2× RR Derwent 5',noAB:true,
  role:'RAF / COMMONWEALTH · FIRST-GENERATION JET FIGHTER · 4× HISPANO 20 MM',
  ac:{name:'Meteor F.8',empty:4850,fuel:1500,S:34.7,mil:31200,ab:31200,gLim:6,roll:3.6,rcs:4,vne:960,gun:G_('4× Hispano Mk 5 20 mm',130,840,16,600,.0035)},
  drop:['AIM-9B'],
  load:{cold:{2:'TK',3:'TK'},strike:{1:'Mk-83',4:'Mk-83'}}});

/* ---------------- campaign pools ---------------- */
try{const pool={cold:{0:{CAP:['Phantom FGR.2','Mirage IIIC','Super Mystere','Mystere IVA','Swift F.7','Gnat F.1','Meteor F.8','Vampire FB.5','F3H-2'],INT:['Javelin FAW.9','Sea Vixen FAW.2','Vautour IIN','F3H-2','Phantom FGR.2'],
    STK:['Mystere IVA','Super Mystere','Vampire FB.5','Meteor F.8'],ESC:['Phantom FGR.2','Sea Vixen FAW.2']},
  1:{CAP:['Su-9','Su-11'],INT:['Su-9','Su-11'],STK:['Su-39'],ESC:['Su-11']}}};
  for(const era of Object.keys(pool))for(const side of Object.keys(pool[era]))for(const r of Object.keys(pool[era][side])){const T=CTYPES[era]&&CTYPES[era][side]&&CTYPES[era][side][r];if(!T)continue;
    for(const id of pool[era][side][r])if(AC[id]&&!T.includes(id))T.push(id);}}catch(e){console.warn('[v317] campaign',e);}
for(const s of M.NEW.slice(n0))if(!AC[FOE[s.id]])FOE[s.id]=s.side==='RED'?'F-4E':'MiG-21';
window.V317_NEW=M.NEW.slice(n0).map(s=>s.id);
console.info('[v317] added '+window.V317_NEW.length+' jets: '+window.V317_NEW.join(', '));
})();
