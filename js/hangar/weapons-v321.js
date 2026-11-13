/* =====================================================================================================================
   v321 — Missing weapons. Each is cloned from the closest existing entry (same rule as coldwar.js) with its own mass, size,
   range and seeker numbers (gameplay-level, from public data), then put on the jets that really carried it.
   Air-to-air: AIM-9C (SARH Sidewinder), AIM-9H, AIM-7D, AIM-26B Falcon, Python 4, Shafrir 1, AAM-3 (Type 90).
   Air-to-ground: AGM-12B / AGM-12C Bullpup, AGM-78B Standard ARM, AGM-62A Walleye, GBU-8 HOBOS, GBU-15, GBU-27, BLU-27 napalm,
   Kh-23 Grom, Kh-25MP, Kh-28.
   Needs coldwar.js, modern-jets.js and jets-v320-loads.js.
   ===================================================================================================================== */
(function(){
'use strict';
const D2=Math.PI/180;
function aam(k,base,over,shape,dia,sn,name){if(MSL[k]||!MSL[base])return false;const d=Object.assign({},MSL[base],over);delete d.ph;delete d.apn;
  const S=Math.PI*dia*dia/4,dv=d.acc*d.burn,mbo=d.mass*Math.exp(-dv/2350),mp=d.mass-mbo,I=mp*2350,tb=d.burn;
  d.ph={S,dia,m0:d.mass,mp,mbo,tb,ts:0,gap:0,Tb:I/tb,Ts:0,mdB:mp/tb,mdS:0,cd0:2.38*d.cd*mbo/S,cnMax:.004*mbo/S*(d.cnK||1)};d.ph.cna=d.ph.cnMax/.38;d.burnT=tb;
  if(d.trk==null)d.trk=d.seek==='IR'?.6:.5;
  d.rcs=+Math.max(.02,Math.min(.25,.015+d.mass/3500)).toFixed(3);d.irsB=+Math.max(.4,Math.min(2.4,.4+d.mass/400)).toFixed(2);d.irsC=.03;
  MSL[k]=d;SHAPE[k]=shape||SHAPE[base];MDIA[k]=dia;if(!MSL_KEYS.includes(k))MSL_KEYS.push(k);SN[k]=sn;WNAME[k]=name;
  if(d.seek==='IR'&&window.CW_HELP&&CW_HELP.IRN)CW_HELP.IRN.add(k);return true;}
function ag(k,base,over,sn,name){if(AGW[k]||!AGW[base])return false;AGW[k]=Object.assign({},AGW[base],over||{});SN[k]=sn;STORE_NAME[k]=name;return true;}
try{
  // ---------------- air-to-air ----------------
  // AIM-9C (1960s): semi-active radar Sidewinder for the F-8 Crusader, 84 kg, short range, SARH seeker needs the radar to illuminate
  aam('AIM-9C','AIM-7E',{mass:84,acc:140,burn:2.6,cd:6.2e-5,maxG:16,fuse:8,life:20,aiR:9000,rmin:600},SHAPE['AIM-9D'],.127,'9C','AIM-9C · SARH Sidewinder');
  // AIM-9H (1972): solid-state AIM-9D / G successor, 84.5 kg, improved manoeuvre
  aam('AIM-9H','AIM-9G',{mass:84.5,maxG:22,irR:14000},SHAPE['AIM-9G'],.127,'9H','AIM-9H · IR');
  // AIM-7D (1960): Sparrow III, 197 kg, ~14 km head-on, 
  aam('AIM-7D','AIM-7C',{mass:197,acc:120,burn:3.2,aiR:12000,maxG:10,life:36},SHAPE['AIM-7C']||SHAPE['AIM-7E'],.203,'7D','AIM-7D · Sparrow III');
  // AIM-26B Super Falcon: 92 kg conventional-warhead SARH Falcon for the F-102 / F-106 
  aam('AIM-26B','AIM-4F',{mass:92,acc:150,burn:4.5,aiR:11000,contact:0,fuse:8,life:34,maxG:9},{L:2.14,R:.084,f:[[.2,.5,.6]]},.168,'26B','AIM-26B Falcon · SARH');
  // Python 4 (1993): helmet-cued, 105 kg, ~15 km, 
  aam('Python 4','Python 3',{mass:105,acc:190,burn:3.4,irR:15000,maxG:50,gimbal:90*D2,life:34},null,.16,'PY4','Python 4 · IR, helmet-cued');
  // Shafrir 1 (1960s): Rafael's first IR round, 93 kg, tail-chase
  aam('Shafrir 1','Shafrir 2',{mass:93,irR:6500,maxG:14,front:.02,gimbal:18*D2},null,.16,'SHF1','Shafrir 1 · IR');
  // AAM-3 / Type 90 (1990): Japanese off-boresight IR, 91 kg, 
  aam('AAM-3','AIM-9L',{mass:91,irR:17000,maxG:40,gimbal:60*D2},SHAPE['AIM-9L'],.127,'AAM3','AAM-3 (Type 90) · IR');
  // ---------------- air-to-ground ----------------
  ag('AGM-12B','AGM-65A',{mass:259,L:3.2,R:.3,dmg:113,soft:30,hard:9,range:9000,lockR:7000},'BPUP','AGM-12B Bullpup A · command-guided');
  ag('AGM-12C','AGM-65A',{mass:810,L:4.1,R:.3,dmg:454,soft:80,hard:22,range:11000,lockR:8000},'BPUC','AGM-12C Bullpup B · command-guided');
  ag('AGM-78B','AGM-88B',{mass:620,L:4.57,R:.343,dv:550,range:50000,dmg:100,soft:30,hard:10},'ARM','AGM-78B Standard ARM · anti-radiation');
  ag('AGM-62A','AGM-65A',{mass:510,L:3.45,R:.32,dmg:386,soft:70,hard:25,range:16000,lockR:9000},'WLYE','AGM-62A Walleye · TV glide bomb (rocket-model stand-in)');
  ag('GBU-8','GBU-10',{mass:907,L:3.9,R:.45,soft:80,hard:20},'HOBO','GBU-8 HOBOS · TV / data-link, 2,000 lb');
  ag('GBU-15','GBU-24',{mass:1115,L:3.9,R:.45,soft:90,hard:25},'GB15','GBU-15 · TV / IIR data-link, 2,000 lb');
  ag('GBU-27','GBU-24',{mass:930,L:4.0,R:.23,soft:85,hard:30},'GB27','GBU-27 Paveway III · BLU-109 penetrator');
  ag('BLU-27','Mk-83',{mass:386,L:2.8,R:.28,soft:55,hard:2},'NAPL','BLU-27/B firebomb · napalm (blast / fragmentation model)');
  ag('Kh-23','AGM-65A',{mass:288,L:3.53,R:.275,dmg:110,soft:25,hard:8,range:10000,lockR:9000},'KH23','Kh-23 Grom (AS-7 Kerry) · radio-command');
  ag('Kh-25MP','Kh-58U',{mass:320,L:4.3,R:.275,dmg:90,soft:22,hard:8,range:40000},'KH25P','Kh-25MP (AS-12 Kegler) · anti-radiation');
  ag('Kh-28','Kh-58U',{mass:715,L:5.8,R:.275,dmg:140,soft:35,hard:12,range:90000},'KH28','Kh-28 (AS-9 Kyle) · long-range anti-radiation');
}catch(e){console.warn('[v321] weapons',e);}
// ---- put each weapon on the jets that carried it, onto every station that already carries a reference store ----
function give(ids,w,refs){if(!(MSL[w]||AGW[w]))return;for(const id of ids){const S=STN[id];if(!S)continue;
  const ref=[].concat(refs).find(r=>Object.values(S).some(l=>Array.isArray(l)&&l.includes(r)));if(!ref)continue;
  for(const k of Object.keys(S))if(Array.isArray(S[k])&&S[k].includes(ref)&&!S[k].includes(w))S[k].push(w);}}
give(['F-8E','F-8J'],'AIM-9C','AIM-9D');
give(['F-4J','F-4N','F-4S','F-14A','A-7E','A-4F','A-4M','F-8J','A-6E','F-4B'],'AIM-9H',['AIM-9G','AIM-9L']);
give(['F-4B','F-4C'],'AIM-7D','AIM-7E');
give(['F-102A','F-106A','F-106B'],'AIM-26B',['AIM-4F','AIM-4D','AIM-4A']);
give(['F-15I','F-16I','Lavi','Kfir Block 60'],'Python 4',['Python 3','AIM-9M','AIM-9L']);
give(['Nesher','Mirage III','Mirage IIIC','Kfir C2'],'Shafrir 1',['Shafrir 2','Magic 1']);
give(['F-15J','F-2A','F-2B','F-4EJ'],'AAM-3',['AAM-5','AIM-9L']);
give(['A-4E','A-4F','A-4M','F-4B','F-4C','F-4D','F-100A','F-100D','F-105D','F-8E'],'AGM-12B',['AGM-45A','Mk-82']);
give(['A-4E','F-4C','F-4D','F-105D'],'AGM-12C',['AGM-12B']);
give(['F-4G','F-105G','F-4E','F-4D'],'AGM-78B','AGM-45A');
give(['A-6A','A-6E','A-7D','A-7E','F-111A','F-111F','F-4B','F-4J'],'AGM-62A',['Mk-84','Mk-83','Mk-82']);
give(['F-4D','F-4E'],'GBU-8','GBU-10');
give(['F-111A','F-111F','F-4E','F-4D'],'GBU-15',['GBU-10','Mk-84']);
give(['F-117A'],'GBU-27','GBU-24');
give(['F-100A','F-100D','A-4E','A-4F','A-4M','A-7D','A-7E','F-4B','F-4C','F-4D','F-105D','F-84F','A-37B','F-5A','F-5E','F-101A','F-104C','Mystere IVA','Super Mystere'],'BLU-27',['Mk-83','Mk-82']);
give(['MiG-23BN','MiG-27K','MiG-27M','Su-17M4','Su-22M4','Su-24M'],'Kh-23','Kh-25ML');
give(['Su-17M4','Su-22M4','MiG-27K','MiG-27M','MiG-23BN','Su-24M','Su-25'],'Kh-25MP','Kh-25ML');
give(['Su-17M4','Su-22M4','MiG-27K','MiG-27M','Su-24M'],'Kh-28','Kh-25ML');
// F-117A carries the BLU-109 GBU-27 on its modern / strike loads
try{if(AGW['GBU-27']&&STN['F-117A']){for(const k of['3','7']){if((STN['F-117A'][k]||[]).includes('GBU-27')){LOAD.modern['F-117A'][k]='GBU-27';if(STRIKE_LOAD['F-117A'])STRIKE_LOAD['F-117A'][k]='GBU-27';}}}}catch(e){}
console.info('[v321] weapons added');
})();
