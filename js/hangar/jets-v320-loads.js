/* =====================================================================================================================
   v320 — Weapons audit for the jets added in jets-v316..v319.
   Those jets were clones of a parent airframe, so they inherited the parent's whole station list and a copy of its loadouts
   (a Mirage 4000 with MICA and GBU-24, a Gnat with nothing but tanks, a Vampire with no stores at all). Each jet now has the
   weapons it carried in service (or in the prototype / trials fit): `only` filters every station to that weapon set (tanks,
   PTB stay), `ad` adds weapons to given stations, and C / M / S replace the cold-war, modern and strike default loads.
   M:'=' means the modern load is the cold-war load (the jet never carried anything newer). Gameplay-level, from public data.
   ===================================================================================================================== */
(function(){
'use strict';
const MJ=window.MJ;if(!MJ){console.warn('[v320 loads] helpers missing');return;}
/* ---------------- R-3R (K-13R, 1966): semi-active radar version of the R-3S, 75.7 kg, ~8 km, MiG-21PFM / PFMA era ---------------- */
function aam(k,base,over,shape,dia,sn,name){if(MSL[k]||!MSL[base])return;const d=Object.assign({},MSL[base],over);delete d.ph;delete d.apn;
  const S=Math.PI*dia*dia/4,dv=d.acc*d.burn,mbo=d.mass*Math.exp(-dv/2350),mp=d.mass-mbo,I=mp*2350,tb=d.burn;
  d.ph={S,dia,m0:d.mass,mp,mbo,tb,ts:0,gap:0,Tb:I/tb,Ts:0,mdB:mp/tb,mdS:0,cd0:2.38*d.cd*mbo/S,cnMax:.004*mbo/S*(d.cnK||1)};d.ph.cna=d.ph.cnMax/.38;d.burnT=tb;
  if(d.trk==null)d.trk=.5;d.rcs=+Math.max(.02,Math.min(.25,.015+d.mass/3500)).toFixed(3);d.irsB=+Math.max(.4,Math.min(2.4,.4+d.mass/400)).toFixed(2);d.irsC=.03;
  MSL[k]=d;SHAPE[k]=shape;MDIA[k]=dia;if(!MSL_KEYS.includes(k))MSL_KEYS.push(k);SN[k]=sn;WNAME[k]=name;}
try{aam('R-3R','R-98R',{mass:75.7,acc:150,burn:2.4,maxG:7,fuse:6,life:22,aiR:6000,rmin:600},{L:2.84,R:.06,f:[[.18,.52,.26],[2.3,.32,.12]]},.127,'R3R','R-3R (K-13R) · SARH');}catch(e){console.warn('[v320] R-3R',e);}
const T=new Set(['TK','PTB']);
function fix(id,o){if(!AC[id]||!STN[id]){return;}
  const keep=new Set(o.only||[]);
  if(o.only)for(const k of Object.keys(STN[id])){STN[id][k]=STN[id][k].filter(w=>T.has(w)||keep.has(w));}
  for(const [k,l] of Object.entries(o.ad||{})){const cur=STN[id][k];if(!cur)continue;for(const w of l)if(!cur.includes(w))cur.push(w);}
  for(const [k,l] of Object.entries(o.stn||{})){if(STN[id][k])STN[id][k]=l.slice();}
  const ok=(k,w)=>w&&(STN[id][k]||[]).includes(w);
  const mk=(src)=>{const r={};for(const [k,w] of Object.entries(src||{}))if(ok(k,w))r[k]=w;return r;};
  const C=mk(o.C),M=o.M==='='?Object.assign({},C):mk(o.M),S=mk(o.S||o.C);
  if(!LOAD.cold[id])LOAD.cold[id]={};if(!LOAD.modern[id])LOAD.modern[id]={};
  for(const k of Object.keys(LOAD.cold[id]))delete LOAD.cold[id][k];for(const k of Object.keys(LOAD.modern[id]))delete LOAD.modern[id][k];
  Object.assign(LOAD.cold[id],C);Object.assign(LOAD.modern[id],M);
  if(typeof STRIKE_LOAD!=='undefined'){STRIKE_LOAD[id]=S;}
  if(o.name&&AC[id])AC[id].role=o.name;}
const F4=(extra)=>Object.assign({},extra);
/* ------------------------------------------------------------ USA ------------------------------------------------------------ */
fix('F-4G',{only:['AIM-7F','AIM-7M','AIM-9L','AIM-9M','AGM-45A','AGM-88C','ALQ-119','ALQ-131','Mk-82','Mk-20','CBU-87'],
 C:{2:'AIM-9L',8:'AIM-9L',3:'ALQ-119',4:'AIM-7F',6:'AIM-7F',7:'AIM-7F',C:'PTB'},M:{2:'AIM-9M',8:'AIM-9M',3:'ALQ-119',4:'AIM-7M',6:'AIM-7M',7:'AIM-7M',C:'PTB'},
 S:{1:'AGM-45A',9:'AGM-45A',2:'AGM-88C',8:'AGM-88C',3:'ALQ-119',4:'AIM-7F',7:'AIM-7F',C:'PTB'}});
fix('F-4C',{only:['AIM-9B','AIM-9D','AIM-7E','AIM-7E-2','AGM-45A','ALQ-119','Mk-82','Mk-82AIR','Mk-83','Mk-84','Mk-20','LAU-10'],
 C:{2:'AIM-9D',8:'AIM-9D',3:'AIM-7E',4:'AIM-7E',6:'AIM-7E',7:'AIM-7E',C:'PTB'},M:'=',
 S:{1:'Mk-82',9:'Mk-82',2:'AIM-9D',8:'AIM-9D',3:'AIM-7E',4:'AIM-7E',C:'Mk-84'}});
fix('F-4D',{only:['AIM-9B','AIM-9D','AIM-9G','AIM-7E','AIM-7E-2','AGM-45A','AGM-65A','ALQ-119','GBU-10','GBU-12','Mk-82','Mk-82AIR','Mk-83','Mk-84','Mk-20','LAU-10'],
 C:{2:'AIM-9D',8:'AIM-9D',3:'AIM-7E-2',4:'AIM-7E-2',6:'AIM-7E-2',7:'AIM-7E-2',C:'PTB'},M:'=',
 S:{1:'GBU-12',9:'GBU-12',2:'AIM-9G',8:'AIM-9G',3:'ALQ-119',4:'AIM-7E-2',7:'AIM-7E-2',C:'GBU-10'}});
fix('F-4N',{only:['AIM-9G','AIM-9L','AIM-7E-2','AIM-7F','AGM-45A','AGM-65A','ALQ-119','Mk-82','Mk-82AIR','Mk-83','Mk-84','Mk-20','LAU-10'],
 C:{2:'AIM-9G',8:'AIM-9G',3:'AIM-7F',4:'AIM-7F',6:'AIM-7F',7:'AIM-7F',C:'PTB'},M:{2:'AIM-9L',8:'AIM-9L',3:'AIM-7F',4:'AIM-7F',6:'AIM-7F',7:'AIM-7F',C:'PTB'},
 S:{1:'Mk-82',9:'Mk-82',2:'AIM-9G',8:'AIM-9G',3:'AIM-7F',4:'AIM-7F',C:'Mk-84'}});
fix('F-4S',{only:['AIM-9G','AIM-9L','AIM-7F','AIM-7M','AGM-45A','AGM-65A','AGM-65B','ALQ-119','Mk-82','Mk-82AIR','Mk-83','Mk-84','Mk-20','CBU-87','LAU-10'],
 C:{2:'AIM-9G',8:'AIM-9G',3:'AIM-7F',4:'AIM-7F',6:'AIM-7F',7:'AIM-7F',C:'PTB'},M:{2:'AIM-9L',8:'AIM-9L',3:'AIM-7M',4:'AIM-7M',6:'AIM-7M',7:'AIM-7M',C:'PTB'},
 S:{1:'Mk-82',9:'Mk-82',2:'AIM-9L',8:'AIM-9L',3:'AIM-7F',4:'AIM-7F',C:'Mk-84'}});
fix('F-4EJ',{only:['AIM-9B','AIM-9E','AIM-9J','AIM-9L','AIM-7E-2','AIM-7F','AIM-7M','Mk-82','Mk-83','Mk-84','Mk-20','CBU-87','ALQ-131'],
 C:{2:'AIM-9J',8:'AIM-9J',3:'AIM-7E-2',4:'AIM-7E-2',6:'AIM-7E-2',7:'AIM-7E-2',C:'PTB'},M:{2:'AIM-9L',8:'AIM-9L',3:'AIM-7F',4:'AIM-7F',6:'AIM-7F',7:'AIM-7F',C:'PTB'},
 S:{1:'Mk-82',9:'Mk-82',2:'AIM-9L',8:'AIM-9L',3:'AIM-7F',4:'AIM-7F',C:'Mk-84'}});
fix('Phantom FGR.2',{only:['AIM-9G','AIM-9L','AIM-7E-2','AIM-7F','Sky Flash','Mk-82','Mk-83','Mk-84','Mk-20','LAU-10'],
 C:{2:'AIM-9G',8:'AIM-9G',3:'AIM-7E-2',4:'AIM-7E-2',6:'AIM-7E-2',7:'AIM-7E-2',C:'PTB'},M:{2:'AIM-9L',8:'AIM-9L',3:'Sky Flash',4:'Sky Flash',6:'Sky Flash',7:'Sky Flash',C:'PTB'},
 S:{1:'Mk-83',9:'Mk-83',2:'AIM-9L',8:'AIM-9L',3:'Sky Flash',4:'Sky Flash',C:'Mk-84'}});
fix('RF-4C',{only:['ALQ-119','ALQ-131'],ad:{},C:{3:'ALQ-119',C:'PTB',2:'TK',8:'TK'},M:{3:'ALQ-131',C:'PTB',2:'TK',8:'TK'},S:{3:'ALQ-119',C:'PTB',2:'TK',8:'TK'}});
fix('F-8J',{only:['AIM-9B','AIM-9D','AIM-9E','AIM-9G','Mk-82','Mk-83','Mk-84','LAU-10'],C:{1:'AIM-9D',2:'AIM-9D',3:'AIM-9D',4:'AIM-9D'},M:'=',S:{1:'AIM-9D',2:'AIM-9D',5:'Mk-83',6:'Mk-83'}});
fix('F-89J',{only:['AIM-4A','AIM-4D','AIR-2A'],C:{1:'AIM-4D',2:'AIM-4D',3:'AIM-4D',4:'AIM-4D',5:'TK',6:'TK'},M:'=',S:{1:'AIM-4D',2:'AIM-4D',3:'AIM-4D',4:'AIM-4D'}});
fix('F-94C',{only:['LAU-10'],C:{1:'LAU-10',4:'LAU-10',2:'TK',3:'TK'},M:'=',S:{1:'LAU-10',4:'LAU-10'}});
fix('F9F-2',{only:['Mk-82','Mk-83','LAU-10'],C:{2:'TK',3:'TK'},M:'=',S:{1:'Mk-82',4:'Mk-82',2:'Mk-82',3:'Mk-82'}});
fix('F9F-8',{only:['AIM-9B','Mk-82','Mk-83','LAU-10'],C:{1:'AIM-9B',4:'AIM-9B',2:'TK',3:'TK'},M:'=',S:{1:'AIM-9B',4:'AIM-9B',2:'Mk-82',3:'Mk-82'}});
fix('F-84F',{only:['Mk-82','Mk-83','LAU-10'],C:{2:'TK',3:'TK'},M:'=',S:{1:'Mk-82',4:'Mk-82',2:'Mk-83',3:'Mk-83'}});
fix('F3H-2',{only:['AIM-9B','AIM-7C','Mk-82','Mk-83'],C:{1:'AIM-7C',4:'AIM-7C',2:'AIM-9B',3:'AIM-9B'},M:'=',S:{1:'AIM-9B',4:'AIM-9B',5:'Mk-83',6:'Mk-83'}});
fix('F-100D',{only:['AIM-9B','Mk-82','Mk-83','Mk-84','Mk-20','LAU-10'],C:{1:'AIM-9B',6:'AIM-9B',2:'TK',5:'TK'},M:'=',S:{1:'AIM-9B',6:'AIM-9B',2:'Mk-83',3:'Mk-82',4:'Mk-82',5:'Mk-83'}});
fix('F-101A',{only:['Mk-82','Mk-83','Mk-84'],C:{1:'Mk-83',2:'Mk-83',5:'TK',6:'TK'},M:'=',S:{1:'Mk-83',2:'Mk-83',3:'Mk-82',4:'Mk-82'}});
fix('F-104A',{only:['AIM-9B','AIM-9D','Mk-82','LAU-10'],C:{1:'AIM-9B',9:'AIM-9B',4:'AIM-9B',6:'AIM-9B',C:'PTB'},M:'=',S:{1:'AIM-9B',9:'AIM-9B',C:'PTB'}});
fix('F-104C',{only:['AIM-9B','AIM-9D','Mk-82','Mk-83','Mk-84','LAU-10'],C:{1:'AIM-9B',9:'AIM-9B',C:'PTB'},M:'=',S:{1:'AIM-9B',9:'AIM-9B',2:'Mk-82',8:'Mk-82',3:'Mk-82',7:'Mk-82',C:'Mk-84'}});
fix('F-106B',{only:['AIM-4F','AIM-4G','AIR-2A'],C:{1:'AIM-4F',2:'AIM-4F',3:'AIM-4G',4:'AIM-4G'},M:'=',S:{1:'AIM-4F',2:'AIM-4F',3:'AIM-4G',4:'AIM-4G'}});
fix('A-4F',{only:['AIM-9B','AIM-9D','AIM-9G','Mk-82','Mk-82AIR','Mk-83','Mk-20','LAU-10','AGM-45A'],C:{1:'AIM-9D',5:'AIM-9D',2:'TK',4:'TK'},M:'=',S:{1:'AIM-9D',5:'AIM-9D',2:'Mk-82',4:'Mk-82',C:'Mk-83'}});
fix('A-4M',{only:['AIM-9D','AIM-9G','AIM-9L','Mk-82','Mk-82AIR','Mk-83','Mk-20','LAU-10','AGM-45A','AGM-65A','AGM-65B'],C:{1:'AIM-9G',5:'AIM-9G',2:'TK',4:'TK'},M:{1:'AIM-9L',5:'AIM-9L',2:'TK',4:'TK'},S:{1:'AIM-9L',5:'AIM-9L',2:'Mk-82',4:'Mk-82',C:'Mk-83'}});
fix('A-7E',{only:['AIM-9G','AIM-9J','AIM-9L','Mk-82','Mk-82AIR','Mk-83','Mk-84','Mk-20','CBU-87','GBU-10','GBU-12','AGM-45A','AGM-65A','AGM-65B','LAU-10','ALQ-119','ALQ-131'],
 C:{4:'AIM-9J',5:'AIM-9J',2:'TK',7:'TK',8:'ALQ-119'},M:{4:'AIM-9L',5:'AIM-9L',2:'TK',7:'TK',8:'ALQ-131'},S:{4:'AIM-9L',5:'AIM-9L',2:'Mk-83',3:'Mk-83',6:'Mk-83',7:'Mk-83',1:'Mk-82'}});
fix('A-6A',{only:['AIM-9J','Mk-82','Mk-84','Mk-20'],C:{3:'Mk-82',4:'Mk-82',6:'Mk-82',7:'Mk-82',2:'TK',8:'TK'},M:'=',S:{3:'Mk-84',7:'Mk-84',4:'Mk-82',6:'Mk-82',2:'TK',8:'TK'}});
fix('EA-6B',{only:['AGM-88C','ALQ-99'],C:{3:'ALQ-99',4:'ALQ-99',6:'ALQ-99',7:'ALQ-99',C:'ALQ-99',2:'TK',8:'TK'},M:{3:'ALQ-99',4:'ALQ-99',6:'ALQ-99',7:'ALQ-99',C:'ALQ-99',2:'AGM-88C',8:'AGM-88C'},S:{3:'ALQ-99',4:'ALQ-99',6:'ALQ-99',7:'ALQ-99',C:'ALQ-99',2:'AGM-88C',8:'AGM-88C'}});
fix('A-10A',{only:['AIM-9L','AIM-9M','Mk-82','Mk-82AIR','Mk-84','CBU-87','LAU-10','AGM-65A','AGM-65B','AGM-65D','ALQ-119','ALQ-131'],ad:{3:['AGM-65A'],7:['AGM-65A']},
 C:{9:'AIM-9L',3:'AGM-65A',7:'AGM-65A',2:'Mk-82',8:'Mk-82'},M:{9:'AIM-9M',3:'AGM-65D',7:'AGM-65D',2:'Mk-82',8:'Mk-82',4:'Mk-82',6:'Mk-82'},S:{9:'AIM-9M',3:'AGM-65D',7:'AGM-65D',4:'Mk-82',6:'Mk-82',2:'CBU-87',8:'CBU-87',1:'ALQ-131'}});
fix('F-111A',{only:['AIM-9P','AIM-9J','Mk-82','Mk-84','Mk-20','CBU-87','GBU-10'],C:{2:'AIM-9P',8:'AIM-9P',4:'Mk-84',6:'Mk-84'},M:'=',S:{2:'AIM-9P',8:'AIM-9P',3:'Mk-82',4:'Mk-84',6:'Mk-84',7:'Mk-82'}});
fix('EF-111A',{only:[],C:{},M:'=',S:{}});
fix('F-105G',{only:['AIM-9B','AIM-9E','AGM-45A','AGM-88B','LAU-10','Mk-82','Mk-83','Mk-84','CBU-87','ALQ-119'],C:{1:'AIM-9B',9:'AIM-9B',3:'AGM-45A',7:'AGM-45A',2:'TK',8:'TK',C:'PTB'},M:'=',S:{3:'AGM-45A',7:'AGM-45A',4:'AGM-45A',6:'AGM-45A',2:'TK',8:'TK',C:'PTB'}});
fix('F-15A',{only:['AIM-9L','AIM-7F','AIM-7M','Mk-82'],C:{3:'AIM-7F',4:'AIM-7F',6:'AIM-7F',7:'AIM-7F',5:'TK','2A':'AIM-9L','2B':'AIM-9L','8A':'AIM-9L','8B':'AIM-9L'},M:{3:'AIM-7M',4:'AIM-7M',6:'AIM-7M',7:'AIM-7M',5:'TK','2A':'AIM-9L','8A':'AIM-9L'},S:{3:'AIM-7M',4:'AIM-7M',6:'AIM-7M',7:'AIM-7M',5:'TK','2A':'AIM-9L','8A':'AIM-9L'}});
fix('F-15D',{only:['AIM-9L','AIM-9M','AIM-9X','AIM-7F','AIM-7M','AIM-120A','AIM-120C','Mk-82'],C:{3:'AIM-7F',4:'AIM-7F',6:'AIM-7F',7:'AIM-7F',5:'TK','2A':'AIM-9L','2B':'AIM-9L','8A':'AIM-9L','8B':'AIM-9L'},M:{3:'AIM-7M',4:'AIM-7M',6:'AIM-7M',7:'AIM-7M',5:'TK','2A':'AIM-9M','2B':'AIM-9M','8A':'AIM-9M','8B':'AIM-9M'},S:{3:'AIM-7M',4:'AIM-7M',6:'AIM-7M',7:'AIM-7M',5:'TK','2A':'AIM-9M','8A':'AIM-9M'}});
fix('F-15J',{only:['AIM-7F','AIM-7M','AIM-9L','AIM-9M','AAM-3','AAM-4B','AAM-5','AIM-120A','AIM-120C','Mk-82'],C:{3:'AIM-7F',4:'AIM-7F',6:'AIM-7F',7:'AIM-7F',5:'TK','2A':'AIM-9L','8A':'AIM-9L'},M:{3:'AIM-7M',4:'AIM-7M',6:'AIM-7M',7:'AIM-7M',5:'TK','2A':'AAM-5','2B':'AAM-4B','8B':'AAM-4B','8A':'AAM-5'},S:{3:'AAM-4B',4:'AAM-4B',6:'AAM-4B',7:'AAM-4B',5:'TK','2A':'AAM-5','8A':'AAM-5'}});
fix('F-16B',{only:['AIM-9L','AIM-9M','AIM-9X','AIM-7F','AIM-7M','AIM-120A','AIM-120C','Mk-82','Mk-84','Mk-82AIR','Mk-20','CBU-87','AGM-65A','AGM-65B','AGM-65D','ALQ-131','ALQ-184'],
 C:{1:'AIM-9L',2:'AIM-9L',3:'AIM-7F',7:'AIM-7F',8:'AIM-9L',9:'AIM-9L',4:'TK',6:'TK',5:'ALQ-131'},M:{1:'AIM-9M',2:'AIM-9M',3:'AIM-120A',7:'AIM-120A',8:'AIM-9M',9:'AIM-9M',4:'TK',6:'TK',5:'ALQ-131'},S:{1:'AIM-9L',9:'AIM-9L',3:'AGM-65A',7:'AGM-65A',4:'Mk-84',6:'Mk-84',5:'ALQ-131'}});
fix('F-18A',{only:['AIM-9L','AIM-9M','AIM-7F','AIM-7M','Mk-82','Mk-83','Mk-84','Mk-82AIR','Mk-20','CBU-87','LAU-10','AGM-65F','AGM-65D','AGM-88B','AGM-88C','GBU-10','GBU-12'],
 C:{1:'AIM-9L',9:'AIM-9L',2:'AIM-7F',8:'AIM-7F',3:'TK',7:'TK'},M:{1:'AIM-9L',9:'AIM-9L',2:'AIM-7M',8:'AIM-7M',3:'TK',7:'TK',4:'AIM-7M',6:'AIM-7M'},S:{1:'AIM-9L',9:'AIM-9L',2:'AGM-65D',8:'AGM-65D',3:'Mk-83',7:'Mk-83',5:'TK'}});
fix('F-35B',{only:['AIM-9X','AIM-9X-II','AIM-120C','AIM-120D','GBU-12','GBU-31','GBU-32','GBU-38','GBU-39','GBU-54','AGM-154A','AGM-88E','ALQ-184','CBU-103','CBU-105'],C:{},M:{1:'AIM-9X',9:'AIM-9X',4:'AIM-120D',6:'AIM-120D',3:'AIM-120D',7:'AIM-120D'},S:{1:'AIM-9X',9:'AIM-9X',3:'GBU-32',7:'GBU-32',4:'AIM-120D',6:'AIM-120D'}});
fix('F-35C',{only:['AIM-9X','AIM-9X-II','AIM-120C','AIM-120D','GBU-12','GBU-31','GBU-32','GBU-38','GBU-39','GBU-54','AGM-154A','AGM-88E','ALQ-184','CBU-103','CBU-105'],C:{},M:{1:'AIM-9X',9:'AIM-9X',4:'AIM-120D',6:'AIM-120D',3:'AIM-120D',7:'AIM-120D'},S:{1:'AIM-9X',9:'AIM-9X',3:'GBU-31',7:'GBU-31',4:'AIM-120D',6:'AIM-120D'}});
fix('F-117A',{only:['GBU-10','GBU-12','GBU-24','Mk-84','AGM-65A','AGM-88B'],C:{3:'GBU-10',7:'GBU-10'},M:{3:'GBU-10',7:'GBU-10'},S:{3:'GBU-10',7:'GBU-10'}});
fix('F-16XL',{only:['AIM-9L','AIM-9M','AIM-120A','Mk-82','Mk-84','Mk-82AIR','Mk-20','CBU-87','GBU-10','GBU-12','ALQ-131'],C:{1:'AIM-9L',9:'AIM-9L',4:'TK',6:'TK'},M:{1:'AIM-9M',9:'AIM-9M',2:'AIM-120A',8:'AIM-120A',4:'TK',6:'TK'},S:{1:'AIM-9M',9:'AIM-9M',3:'GBU-12',7:'GBU-12',4:'Mk-84',6:'Mk-84'}});
/* ------------------------------------------------- UK / France / Europe ------------------------------------------------- */
fix('Javelin FAW.9',{only:['Firestreak'],C:{1:'Firestreak',2:'Firestreak',3:'Firestreak',4:'Firestreak',5:'TK',6:'TK'},M:'=',S:{1:'Firestreak',2:'Firestreak',3:'Firestreak',4:'Firestreak'}});
fix('Sea Vixen FAW.2',{only:['Red Top','Firestreak'],C:{1:'Red Top',2:'Red Top',3:'Red Top',4:'Red Top',5:'TK',6:'TK'},M:'=',S:{1:'Red Top',2:'Red Top',3:'Red Top',4:'Red Top'}});
fix('Mirage IIIC',{only:['R530','R511','Magic 1','AIM-9B','Matra F1'],stn:{},C:{C:'R530',1:'Magic 1',5:'Magic 1'},M:'=',S:{C:'R530',1:'Magic 1',5:'Magic 1'}});
fix('Super Mystere',{only:['R511','AIM-9B','Matra F1','Mk-82','Mk-83'],C:{1:'R511',6:'R511',2:'TK',5:'TK'},M:'=',S:{1:'AIM-9B',6:'AIM-9B',2:'Matra F1',5:'Matra F1',3:'Mk-83',4:'Mk-83'}});
fix('Vautour IIN',{only:['R511','Matra F1'],C:{1:'R511',2:'R511',3:'TK',4:'TK'},M:'=',S:{3:'Matra F1',4:'Matra F1',1:'R511',2:'R511'}});
fix('Mystere IVA',{only:['Mk-82','Mk-83','Matra F1'],C:{2:'TK',3:'TK'},M:'=',S:{1:'Mk-82',4:'Mk-82',2:'Matra F1',3:'Matra F1'}});
fix('Swift F.7',{only:['Fireflash','AIM-9B','Mk-82'],C:{1:'Fireflash',4:'Fireflash',2:'TK',3:'TK'},M:'=',S:{1:'Fireflash',4:'Fireflash',2:'Mk-82',3:'Mk-82'}});
fix('Gnat F.1',{only:['Mk-82'],C:{2:'TK',3:'TK'},M:'=',S:{1:'Mk-82',4:'Mk-82',2:'TK',3:'TK'}});
fix('Vampire FB.5',{only:['Mk-82','Mk-83'],C:{2:'TK',3:'TK'},M:'=',S:{1:'Mk-82',4:'Mk-82'}});
fix('Meteor F.8',{only:['Mk-82','Mk-83'],C:{2:'TK',3:'TK'},M:'=',S:{1:'Mk-82',4:'Mk-82',2:'Mk-83',3:'Mk-83'}});
fix('CF-105',{only:['AIM-7E','AIM-4D','AIR-2A'],C:{1:'AIM-7E',2:'AIM-7E',3:'AIM-4D',4:'AIM-4D',5:'TK',6:'TK'},M:'=',S:{1:'AIM-7E',2:'AIM-7E',3:'AIM-4D',4:'AIM-4D'}});
fix('CF-100',{only:['LAU-10'],C:{1:'LAU-10',2:'LAU-10',3:'TK',4:'TK'},M:'=',S:{1:'LAU-10',2:'LAU-10'}});
fix('TSR-2',{only:['Mk-83','Mk-84','BL755'],C:{3:'Mk-83',4:'Mk-83',6:'Mk-83',7:'Mk-83',2:'TK',8:'TK'},M:'=',S:{3:'Mk-84',4:'Mk-84',6:'Mk-83',7:'Mk-83'}});
fix('Sea Venom',{only:['LAU-10'],C:{1:'LAU-10',2:'LAU-10',3:'TK',4:'TK'},M:'=',S:{1:'LAU-10',2:'LAU-10'}});
fix('Saab 29',{only:['Rb 24','ARAK 135','Mk-82'],C:{1:'Rb 24',4:'Rb 24',2:'TK',3:'TK'},M:'=',S:{2:'ARAK 135',3:'ARAK 135',1:'Mk-82',4:'Mk-82'}});
fix('Saab 32',{only:['ARAK 135','Rb 04E','Rb 24','Mk-82'],C:{1:'Rb 24',4:'Rb 24',2:'TK',3:'TK'},M:'=',S:{2:'Rb 04E',3:'Rb 04E',1:'ARAK 135',4:'ARAK 135'}});
fix('Saab 105',{only:['Mk-82','ARAK 135','Matra F1'],C:{2:'TK',4:'TK'},M:'=',S:{1:'ARAK 135',5:'ARAK 135',2:'Mk-82',4:'Mk-82'}});
fix('G.91',{only:['Mk-82','LAU-10','Matra F1'],C:{2:'TK',3:'TK'},M:'=',S:{1:'Matra F1',4:'Matra F1',2:'Mk-82',3:'Mk-82'}});
fix('Mirage IV',{only:['Magic 1','Mk-83','Mk-84','AS-37 Martel'],C:{1:'Magic 1',5:'Magic 1',C:'Mk-84'},M:'=',S:{1:'Magic 1',5:'Magic 1',2:'Mk-84',4:'Mk-84',C:'Mk-84'}});
fix('Mirage 4000',{only:['Magic 2','Magic 1','Super 530D','Matra F4','Mk-82','Mk-82SE','Mk-82AIR','SAMP 250','Belouga'],
 C:{1:'Magic 2',9:'Magic 2',2:'Super 530D',8:'Super 530D',3:'Super 530D',7:'Super 530D'},M:'=',S:{1:'Magic 2',9:'Magic 2',3:'SAMP 250',4:'SAMP 250',6:'SAMP 250',7:'SAMP 250',2:'TK',8:'TK'}});
fix('J-22 Orao',{only:['R-60M','FAB-250','FAB-500','OFAB-250','B-8M1','UB-16','UB-32'],C:{1:'R-60M',5:'R-60M',2:'TK',4:'TK'},M:'=',S:{1:'R-60M',5:'R-60M',2:'FAB-250',4:'FAB-250',C:'FAB-500'}});
fix('Scimitar',{only:['AIM-9B','Mk-82','Mk-83','LAU-10'],C:{1:'AIM-9B',5:'AIM-9B',2:'TK',4:'TK'},M:'=',S:{1:'AIM-9B',5:'AIM-9B',2:'Mk-83',4:'Mk-83',C:'Mk-83'}});
fix('Etendard IVM',{only:['Magic 1','Matra F1','Mk-82','SAMP 250','LAU-10','AS-30L'],C:{1:'Magic 1',5:'Magic 1',2:'TK',4:'TK'},M:'=',S:{1:'Magic 1',5:'Magic 1',2:'SAMP 250',4:'SAMP 250',C:'SAMP 250'}});
fix('Canberra',{only:['Mk-82','Mk-83','Mk-84','BL755'],C:{3:'Mk-83',4:'Mk-83',6:'Mk-83',7:'Mk-83',2:'TK',8:'TK'},M:'=',S:{3:'Mk-84',4:'Mk-84',6:'Mk-83',7:'Mk-83'}});
fix('Buccaneer S.1',{only:['Mk-82','Mk-83','Mk-84','BL755','AS-37 Martel'],C:{3:'Mk-82',4:'Mk-82',6:'Mk-82',7:'Mk-82',2:'TK',8:'TK'},M:'=',S:{3:'Mk-84',7:'Mk-84',4:'Mk-82',6:'Mk-82',2:'TK',8:'TK'}});
fix('Hawker P.1154',{only:['AIM-9B','AIM-9L','Red Top','Firestreak','Mk-82','Mk-83','Matra F1','BL755'],C:{1:'Red Top',7:'Red Top',3:'TK',5:'TK'},M:'=',S:{1:'AIM-9B',7:'AIM-9B',2:'Mk-83',3:'Mk-83',5:'Mk-83',6:'Mk-83'}});
fix('Hunter FGA.9',{only:['AIM-9B','Mk-82','Mk-83','Matra F1','BL755','LAU-10'],C:{1:'AIM-9B',4:'AIM-9B',2:'TK',3:'TK'},M:'=',S:{1:'Matra F1',4:'Matra F1',2:'Mk-83',3:'Mk-83'}});
fix('Lightning F.1',{only:['Firestreak'],C:{1:'Firestreak',2:'Firestreak',3:'TK',4:'TK'},M:'=',S:{1:'Firestreak',2:'Firestreak'}});
fix('Mirage F1CT',{only:['Magic 1','Magic 2','R530','Super 530F','Matra F1','Mk-82','SAMP 250','SAMP 400','Belouga','AS-30L','AS-37 Martel','AIM-9J'],
 C:{1:'Magic 1',7:'Magic 1',3:'Super 530F',5:'TK',C:'PTB'},M:{1:'Magic 2',7:'Magic 2',3:'Super 530F',5:'TK',C:'PTB'},S:{1:'Magic 2',7:'Magic 2',2:'AS-30L',6:'AS-30L',3:'Belouga',5:'Belouga',C:'SAMP 400'}});
fix('Mirage F1CR',{only:['Magic 1','Magic 2','R530','Super 530F','Matra F1','SAMP 250'],C:{1:'Magic 1',7:'Magic 1',3:'TK',5:'TK',C:'PTB'},M:{1:'Magic 2',7:'Magic 2',3:'TK',5:'TK',C:'PTB'},S:{1:'Magic 2',7:'Magic 2',3:'TK',5:'TK',C:'PTB'}});
fix('Mirage 2000-9',{only:['Magic 2','MICA EM','MICA IR','Super 530D','Mk-82','Mk-82SE','Mk-82AIR','GBU-12','GBU-16','SAMP 250','Belouga','SCALP-EG','AASM-250','Matra F4'],
 C:{1:'Magic 2',9:'Magic 2',2:'Super 530D',8:'Super 530D',C:'PTB'},M:{1:'MICA IR',9:'MICA IR',3:'MICA EM',4:'MICA EM',6:'MICA EM',7:'MICA EM',C:'PTB'},S:{1:'MICA IR',9:'MICA IR',2:'GBU-12',8:'GBU-12',3:'GBU-12',7:'GBU-12',C:'PTB'}});
fix('Mirage 2000N',{only:['Magic 2','Magic 1','Mk-82','GBU-12','GBU-16','SAMP 250','SAMP 400','Belouga','AASM-250','SCALP-EG','AS-37 Martel','TGP'],ad:{C:['SAMP 400']},
 C:{1:'Magic 2',9:'Magic 2',2:'TK',8:'TK',C:'SAMP 400'},M:{1:'Magic 2',9:'Magic 2',2:'TK',8:'TK',C:'SCALP-EG'},S:{1:'Magic 2',9:'Magic 2',3:'SAMP 250',4:'SAMP 250',6:'SAMP 250',7:'SAMP 250',2:'TK',8:'TK',C:'SAMP 400'}});
fix('EF-2000 T1',{only:['AIM-9L','AIM-9M','ASRAAM','IRIS-T','AIM-120C','GBU-10','GBU-12','GBU-16','GBU-24','Mk-82','Mk-83','Mk-84','ALQ-131'],
 C:{1:'AIM-9L',9:'AIM-9L',3:'TK',7:'TK'},M:{1:'ASRAAM',9:'ASRAAM',2:'IRIS-T',8:'IRIS-T','4b':'AIM-120C','4c':'AIM-120C','6b':'AIM-120C','6c':'AIM-120C',3:'TK',7:'TK'},S:{1:'ASRAAM',9:'ASRAAM',4:'GBU-16',6:'GBU-16',3:'TK',7:'TK','4b':'AIM-120C','6b':'AIM-120C'}});
fix('EF-2000 T3',{only:['AIM-9L','ASRAAM','IRIS-T','AIM-120C','AIM-120D','Meteor','GBU-10','GBU-12','GBU-16','GBU-24','GBU-38','Mk-82','Mk-83','Mk-84','Taurus','SCALP-EG','ALQ-131'],
 C:{1:'AIM-9L',9:'AIM-9L',3:'TK',7:'TK'},M:{1:'ASRAAM',9:'ASRAAM',2:'IRIS-T',8:'IRIS-T','4b':'Meteor','4c':'Meteor','6b':'Meteor','6c':'Meteor',3:'TK',7:'TK'},S:{1:'ASRAAM',9:'ASRAAM',3:'Taurus',7:'Taurus',4:'GBU-16',6:'GBU-16','4b':'Meteor','6b':'Meteor'}});
fix('J 35A',{only:['Rb 24'],C:{1:'Rb 24',6:'Rb 24',3:'TK',4:'TK'},M:'=',S:{1:'Rb 24',6:'Rb 24'}});
fix('J 35D',{only:['Rb 24','Rb 24J','Rb 27','Rb 28','71','m'],C:{1:'Rb 24J',6:'Rb 24J',2:'Rb 27',5:'Rb 28',3:'TK',4:'TK'},M:'=',S:{1:'Rb 24J',6:'Rb 24J',2:'71',3:'71',4:'71',5:'71'}});
fix('Gripen A',{only:['Rb 74','Rb 99','AIM-9L','Rb 15F','GBU-12','GBU-16','Mk-82','ALQ-131'],C:{1:'AIM-9L',9:'AIM-9L'},M:{1:'Rb 74',9:'Rb 74',2:'Rb 99',8:'Rb 99',3:'Rb 99',7:'Rb 99'},S:{1:'Rb 74',9:'Rb 74',3:'Rb 15F',7:'Rb 15F',2:'Rb 99',8:'Rb 99',5:'TK'}});
fix('Gripen B',{only:['Rb 74','Rb 99','AIM-9L','Rb 15F','GBU-12','GBU-16','Mk-82','ALQ-131'],C:{1:'AIM-9L',9:'AIM-9L'},M:{1:'Rb 74',9:'Rb 74',2:'Rb 99',8:'Rb 99',3:'Rb 99',7:'Rb 99'},S:{1:'Rb 74',9:'Rb 74',3:'Rb 15F',7:'Rb 15F',2:'Rb 99',8:'Rb 99',5:'TK'}});
/* ---------------------------------------------------------- Israel / Asia ---------------------------------------------------------- */
fix('Lavi',{only:['Python 3','Derby','Mk-82','Mk-84','GBU-12','GBU-10','CBU-87','AGM-65D','ALQ-131'],C:{1:'Python 3',9:'Python 3',2:'Python 3',8:'Python 3',4:'TK',6:'TK'},M:{1:'Python 3',9:'Python 3',2:'Derby',8:'Derby',4:'TK',6:'TK'},S:{1:'Python 3',9:'Python 3',3:'AGM-65D',7:'AGM-65D',4:'Mk-84',6:'Mk-84',5:'ALQ-131'}});
fix('Nesher',{only:['Shafrir 2','Magic 1','Matra F1','Mk-82','AS-30L','SAMP 250','SAMP 400','Belouga'],C:{1:'Shafrir 2',5:'Shafrir 2',2:'TK',4:'TK'},M:'=',S:{1:'Shafrir 2',5:'Shafrir 2',2:'SAMP 250',4:'SAMP 250',C:'SAMP 400'}});
fix('F-2B',{only:['AAM-3','AAM-4B','AAM-5','AIM-9L','AIM-7M','AIM-120C','ASM-2','GBU-12','GBU-38','Mk-82','Mk-82AIR','ALQ-131','ALQ-184'],
 C:{1:'AIM-9L',9:'AIM-9L',2:'AIM-7M',8:'AIM-7M',4:'TK',6:'TK'},M:{1:'AAM-5',9:'AAM-5',2:'AAM-4B',8:'AAM-4B',3:'AAM-4B',7:'AAM-4B',4:'TK',6:'TK'},S:{1:'AAM-5',9:'AAM-5',3:'ASM-2',7:'ASM-2',4:'ASM-2',6:'ASM-2',2:'AAM-4B',8:'AAM-4B'}});
fix('J-10B',{only:['PL-8','PL-10','PL-12','LS-6','LS-500J','KD-88','YJ-91','FAB-250','FAB-500'],C:{1:'PL-8',6:'PL-8',C:'PTB'},M:{1:'PL-10',6:'PL-10',2:'PL-12',5:'PL-12',3:'PL-12',4:'PL-12',C:'PTB'},S:{1:'PL-10',6:'PL-10',2:'PL-12',5:'PL-12',3:'LS-6',4:'LS-6',C:'PTB'}});
fix('Tejas Mk2',{only:['Python 5','R-73','Derby','I-Derby ER','Astra','GBU-12','Spice-1000','Mk-82','ALQ-131','ALQ-184'],C:{1:'R-73',9:'R-73'},M:{1:'Python 5',9:'Python 5',2:'I-Derby ER',8:'I-Derby ER',3:'Astra',7:'Astra'},S:{1:'Python 5',9:'Python 5',3:'Spice-1000',7:'Spice-1000',4:'GBU-12',6:'GBU-12',5:'PTB'}});
fix('Kaan',{only:['AIM-9M','IRIS-T','AIM-120C','Meteor','GBU-32','GBU-39','ALQ-131'],C:{},M:{1:'IRIS-T',9:'IRIS-T',2:'Meteor',8:'Meteor',3:'Meteor',4:'Meteor',6:'Meteor',7:'Meteor'},S:{1:'IRIS-T',9:'IRIS-T',2:'Meteor',8:'Meteor',3:'GBU-32',7:'GBU-32'}});
fix('Marut',{only:['Mk-82','Mk-83','Matra F1','LAU-10'],C:{2:'TK',3:'TK'},M:'=',S:{1:'Matra F1',4:'Matra F1',2:'Mk-82',3:'Mk-82'}});
fix('Hurjet',{only:['AIM-9L','IRIS-T','GBU-12','GBU-38','Mk-82','LAU-10','TGP'],C:{3:'TK',7:'TK'},M:{1:'AIM-9L',9:'AIM-9L',3:'TK',7:'TK'},S:{1:'AIM-9L',9:'AIM-9L',3:'GBU-38',7:'GBU-38',2:'GBU-12',8:'GBU-12'}});
/* ------------------------------------------------------------- Soviet / Chinese ------------------------------------------------------------- */
fix('Su-9',{only:['RS-2US','R-3S'],C:{1:'RS-2US',2:'RS-2US',3:'RS-2US',4:'RS-2US',C:'PTB'},M:'=',S:{1:'RS-2US',2:'RS-2US',3:'RS-2US',4:'RS-2US'}});
fix('Su-11',{only:['R-8MR','R-8MT'],C:{1:'R-8MR',4:'R-8MT',C:'PTB'},M:'=',S:{1:'R-8MR',4:'R-8MT'}});
fix('MiG-19PM',{only:['RS-2US','R-3S'],C:{1:'RS-2US',2:'RS-2US',3:'RS-2US',4:'RS-2US'},M:'=',S:{1:'RS-2US',2:'RS-2US',3:'RS-2US',4:'RS-2US'}});
fix('MiG-25RB',{only:['FAB-500','FAB-250','OFAB-250'],C:{1:'FAB-500',2:'FAB-500',3:'FAB-500',4:'FAB-500',C:'PTB'},M:'=',S:{1:'FAB-500',2:'FAB-500',3:'FAB-500',4:'FAB-500'}});
fix('Su-17M4',{only:['R-60M','R-13M','FAB-250','FAB-500','OFAB-250','OFAB-100','ZB-500','B-8M1','UB-32','S-24B','S-25OF','B-13L','Kh-25ML','Kh-29L','KAB-500Kr','Kh-58U','L-080'],C:{1:'R-60M',8:'R-60M',3:'Kh-25ML',6:'Kh-25ML',4:'TK',5:'TK'},M:'=',S:{1:'R-60M',8:'R-60M',3:'FAB-500',6:'FAB-500',4:'FAB-250',5:'FAB-250',2:'B-8M1',7:'B-8M1'}});
fix('F-84F',{only:['Mk-82','Mk-83','LAU-10'],C:{2:'TK',3:'TK'},M:'=',S:{1:'Mk-82',4:'Mk-82',2:'Mk-83',3:'Mk-83'}});
fix('MiG-21F-13',{only:['R-3S','FAB-250','UB-16'],C:{1:'R-3S',4:'R-3S',C:'PTB'},M:'=',S:{1:'R-3S',4:'R-3S',2:'FAB-250',3:'FAB-250'}});
fix('MiG-21PF',{only:['R-3S','R-3R','R-13M','FAB-250'],ad:{1:['R-3R'],4:['R-3R'],2:['R-3R'],3:['R-3R']},C:{1:'R-3R',4:'R-3R',2:'R-3S',3:'R-3S',C:'PTB'},M:{1:'R-13M',4:'R-13M',2:'R-13M',3:'R-13M',C:'PTB'},S:{1:'R-13M',4:'R-13M',2:'FAB-250',3:'FAB-250'}});
fix('MiG-23MS',{only:['R-60M','R-13M','FAB-250','B-8M1'],C:{1:'R-13M',4:'R-13M',2:'R-60M',3:'R-60M',C:'PTB'},M:'=',S:{1:'B-8M1',4:'B-8M1',2:'FAB-250',3:'FAB-250',C:'PTB'}});
fix('MiG-23MLD',{only:['R-24R','R-24T','R-60M','R-73','FAB-250','B-8M1'],C:{1:'R-24R',4:'R-24T',2:'R-60M',3:'R-60M',C:'PTB'},M:{1:'R-24R',4:'R-24R',2:'R-73',3:'R-73',C:'PTB'},S:{1:'B-8M1',4:'B-8M1',2:'FAB-250',3:'FAB-250',C:'PTB'}});
fix('MiG-23-98',{only:['R-24R','R-24T','R-27R','R-77','R-60M','R-73','FAB-250','B-8M1'],C:{1:'R-24R',4:'R-24T',2:'R-60M',3:'R-60M',C:'PTB'},M:{1:'R-77',4:'R-77',2:'R-73',3:'R-73',C:'PTB'},S:{1:'B-8M1',4:'B-8M1',2:'FAB-250',3:'FAB-250',C:'PTB'}});
fix('MiG-23BN',{only:['R-60M','R-13M','FAB-250','FAB-500','OFAB-250','ZB-500','B-8M1','UB-32','S-24B','Kh-25ML','L-080'],C:{1:'R-60M',7:'R-60M',2:'FAB-250',6:'FAB-250',C:'PTB'},M:'=',S:{1:'R-60M',7:'R-60M',2:'Kh-25ML',6:'Kh-25ML',3:'FAB-500',5:'FAB-500',C:'PTB'}});
fix('MiG-27M',{only:['R-60M','FAB-250','FAB-500','OFAB-250','ZB-500','B-8M1','UB-32','S-24B','Kh-25ML','Kh-29L','Kh-58U','KAB-500Kr','L-080'],C:{1:'R-60M',7:'R-60M',2:'FAB-500',6:'FAB-500',C:'PTB'},M:{1:'R-60M',7:'R-60M',2:'Kh-29L',6:'Kh-29L',C:'PTB'},S:{1:'R-60M',7:'R-60M',2:'Kh-29L',6:'Kh-29L',3:'FAB-500',5:'FAB-500',C:'PTB'}});
fix('Su-24MR',{only:['R-60M'],C:{1:'R-60M',7:'R-60M',C:'PTB'},M:'=',S:{1:'R-60M',7:'R-60M',C:'PTB'}});
fix('Su-25UB',{only:['R-60M','R-3S','R-73','FAB-250','FAB-500','OFAB-250','B-8M1','UB-32','S-24B','S-25O','Kh-25ML','Kh-29L','KAB-500Kr'],C:{1:'R-60M',10:'R-60M',2:'B-8M1',9:'B-8M1',3:'FAB-250',8:'FAB-250',4:'TK',7:'TK'},M:'=',S:{1:'R-60M',10:'R-60M',2:'B-8M1',9:'B-8M1',3:'FAB-250',8:'FAB-250',4:'FAB-500',7:'FAB-500',5:'Kh-25ML',6:'Kh-25ML'}});
fix('Su-39',{only:['R-60M','R-73','FAB-250','FAB-500','B-8M1','UB-32','S-24B','S-25O','Kh-25ML','Kh-29L','Kh-29T','Vikhr','KAB-500Kr','Kh-58U'],C:{1:'R-60M',10:'R-60M',3:'Vikhr',8:'Vikhr',4:'Kh-25ML',7:'Kh-25ML',5:'TK',6:'TK'},M:{1:'R-73',10:'R-73',3:'Vikhr',8:'Vikhr',4:'Kh-29T',7:'Kh-29T',5:'TK',6:'TK'},S:{1:'R-73',10:'R-73',3:'Vikhr',8:'Vikhr',4:'Kh-29T',7:'Kh-29T',5:'TK',6:'TK'}});
fix('Su-27P',{only:['R-27R','R-27T','R-27ER','R-27ET','R-73'],C:{1:'R-73',2:'R-73',3:'R-27R',4:'R-27T',5:'R-27R',6:'R-27R',7:'R-27T',8:'R-27R',9:'R-73',10:'R-73'},M:{1:'R-73',2:'R-73',3:'R-27ER',4:'R-27ET',5:'R-27ER',6:'R-27ER',7:'R-27ET',8:'R-27ER',9:'R-73',10:'R-73'},S:{1:'R-73',2:'R-73',3:'R-27ER',4:'R-27ET',5:'R-27ER',6:'R-27ER',7:'R-27ET',8:'R-27ER',9:'R-73',10:'R-73'}});
fix('Su-27UB',{only:['R-27R','R-27T','R-27ER','R-27ET','R-73','FAB-250','B-8M1'],C:{1:'R-73',2:'R-73',3:'R-27R',4:'R-27T',5:'R-27R',6:'R-27R',7:'R-27T',8:'R-27R',9:'R-73',10:'R-73'},M:{1:'R-73',2:'R-73',3:'R-27ER',4:'R-27ET',5:'R-27ER',6:'R-27ER',7:'R-27ET',8:'R-27ER',9:'R-73',10:'R-73'},S:{1:'R-73',2:'R-73',3:'B-8M1',4:'FAB-250',5:'FAB-250',6:'FAB-250',7:'FAB-250',8:'B-8M1',9:'R-73',10:'R-73'}});
fix('MiG-29M',{only:['R-27R','R-27T','R-27ER','R-27ET','R-73','R-77','FAB-250','B-8M1'],C:{1:'R-73',2:'R-73',3:'R-27R',4:'R-27T',5:'R-73',6:'R-73',C:'PTB'},M:{1:'R-73',2:'R-77',3:'R-27ER',4:'R-27ER',5:'R-77',6:'R-73',C:'PTB'},S:{1:'R-73',2:'B-8M1',3:'FAB-250',4:'FAB-250',5:'B-8M1',6:'R-73',C:'PTB'}});
fix('J-10A',{only:['PL-5E','PL-8','PL-12','LS-6','LS-500J','FAB-250','FAB-500','B-8M1'],C:{1:'PL-8',6:'PL-8',C:'PTB'},M:{1:'PL-8',6:'PL-8',2:'PL-12',3:'PL-12',4:'PL-12',5:'PL-12',C:'PTB'},S:{1:'PL-8',6:'PL-8',2:'PL-12',5:'PL-12',3:'LS-500J',4:'LS-500J',C:'PTB'}});
fix('JAS-39D',{only:['Rb 74','IRIS-T','AIM-9L','AIM-120C','Meteor','Rb 15F','GBU-12','GBU-16','Mk-82','Taurus','ALQ-131'],C:{1:'Rb 74',9:'Rb 74'},M:{1:'IRIS-T',9:'IRIS-T',2:'Meteor',8:'Meteor',3:'AIM-120C',7:'AIM-120C'},S:{1:'IRIS-T',9:'IRIS-T',3:'Rb 15F',7:'Rb 15F',2:'AIM-120C',8:'AIM-120C'}});
fix('Il-28',{only:['FAB-250','FAB-500','OFAB-250'],C:{3:'FAB-250',4:'FAB-250',6:'FAB-250',7:'FAB-250',2:'TK',8:'TK'},M:'=',S:{3:'FAB-500',4:'FAB-500',6:'FAB-250',7:'FAB-250'}});
fix('J-5',{only:['OFAB-100','FAB-250'],C:{1:'TK',2:'TK'},M:'=',S:{1:'FAB-250',2:'FAB-250'}});
fix('Yak-25',{only:[],C:{C:'PTB'},M:'=',S:{}});
try{if(STRIKE_LOAD['Rafale M']&&STRIKE_LOAD['Rafale M'][5]==='SCALP-EG'&&!(STN['Rafale M'][5]||[]).includes('SCALP-EG')){delete STRIKE_LOAD['Rafale M'][5];STRIKE_LOAD['Rafale M'][3]='SCALP-EG';}}catch(e){}
console.info('[v320] weapons audit applied');
})();
