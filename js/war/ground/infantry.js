/* =====================================================================================================================
   v377 — PLAYABLE INFANTRY (owner request). From the sortie setup, GO AS INFANTRY opens the KIT menu:
   * ROLE presets (assault, sniper, marksman, anti-tank, air defence, machine gunner, close quarters, breacher) set
     the kit; each item can still be changed.
   * PRIMARY: carbine, submachine gun, combat shotgun, service rifle, light machine gun, designated marksman rifle or
     sniper rifle (with a scope view); your country's service rifle is named from its equipment table. Each has its
     own first-person model.
   * LAUNCHER: anti-tank rocket, anti-tank guided missile or portable air-defence missile (named from the table), or none.
   * BODY ARMOUR: none, soft, plates, heavy plates — more protection, slower movement.
   * GRENADES and sidearm.
   * INSERTION: APC, IFV (stays and supports you with its cannon), helicopter, or airdrop by parachute (steer it down).
   A TOWN on a street grid: hollow houses of one to three storeys with doors, windows you can see and shoot through,
   floors and stairs; walls collide for you and every soldier.
   DRONES: FPV attack drones dive on soldiers, vehicles and you (shoot them down); one-way attack drones (Shahed-136 /
   Geran-2 type for REDFOR) fly over and strike the rear; armed loitering drones (MQ-9 Reaper type, or the side's own)
   circle high and fire missiles. Both sides use them; your air-defence missile locks them.
   You then fight on foot near the front: take and hold the objective with your squad against the enemy's infantry, a
   vehicle and, at times, a helicopter. A win pushes that front sector forward a little; losses are reported.
   First person, its own scene and renderer (the flight game is paused underneath).
   Keys: WASD move · mouse look (click to capture) · Shift sprint · C crouch · Space jump / open parachute / skip ·
   F place an FPV drone (an operator at base flies it) · V its feed · H medevac ·
   LMB fire · RMB or Q aim (iron sights) · R reload · 1 primary · 2 launcher · 3 sidearm · G grenade · B build a
   sandbag wall · O call an offensive · Esc leave.
   v380: from a world-war sortie the battle is IN THE LIVE WORLD (real terrain and towns, real AI flights, the war's
   clock running); enemy troops call for backup; engineers dig in; offensives; craters and holed walls build up.
   Abstract and game-like: no technical weapon data beyond class behaviour.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR||{st:null,emit(){}};if(typeof THREE==='undefined')return;
const rn=()=>Math.random(),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EQ=a3=>(window.NATDATA&&NATDATA.EQ&&NATDATA.EQ[a3])||{};const first=v=>v?String(v).split(/,\s*/)[0]:null;
/* ------------------------------------------------------------------ kit */
const PRI={CARB:{n:'Carbine',rpm:750,dmg:30,mag:30,res:210,spr:.016,ads:1.5,rl:2,auto:1,vm:'carb'},
           SMG:{n:'Submachine gun',rpm:900,dmg:22,mag:30,res:240,spr:.026,ads:1.3,rl:1.8,auto:1,fast:1.08,vm:'smg'},
           SHOT:{n:'Combat shotgun',rpm:110,dmg:16,pel:9,mag:8,res:40,spr:.07,ads:1.2,rl:3.4,auto:0,vm:'shot'},
           RIFLE:{n:'Service rifle',rpm:700,dmg:34,mag:30,res:210,spr:.012,ads:1.6,rl:2.2,auto:1,vm:'rifle'},
           LMG:{n:'Light machine gun',rpm:780,dmg:34,mag:100,res:300,spr:.02,ads:1.4,rl:5,auto:1,slow:.9,vm:'lmg'},
           DMR:{n:'Designated marksman rifle',rpm:260,dmg:62,mag:20,res:120,spr:.004,ads:3.5,rl:2.6,auto:0,vm:'dmr'},
           SNP:{n:'Sniper rifle',rpm:50,dmg:140,mag:5,res:40,spr:.0015,ads:7,rl:3.2,auto:0,vm:'snp',scope:1}};
// roles set a sensible kit; each item can still be changed
const ROLE={ASSAULT:{n:'Assault',pri:'RIFLE',lau:'NONE',arm:'PLATE',gren:4},SNIPER:{n:'Sniper',pri:'SNP',lau:'NONE',arm:'SOFT',gren:0},MARKSMAN:{n:'Marksman',pri:'DMR',lau:'NONE',arm:'PLATE',gren:2},
  AT:{n:'Anti-tank',pri:'CARB',lau:'ATGM',arm:'PLATE',gren:2},AA:{n:'Air defence',pri:'CARB',lau:'MANPADS',arm:'SOFT',gren:2},MG:{n:'Machine gunner',pri:'LMG',lau:'NONE',arm:'HEAVY',gren:2},
  MEDIC:{n:'Medic',pri:'CARB',lau:'NONE',arm:'SOFT',gren:2},ENGINEER:{n:'Engineer',pri:'CARB',lau:'RPG',arm:'PLATE',gren:2},CQB:{n:'Close quarters',pri:'SMG',lau:'NONE',arm:'HEAVY',gren:4},BREACH:{n:'Breacher',pri:'SHOT',lau:'RPG',arm:'HEAVY',gren:4}};
const LAU={NONE:{n:'None'},RPG:{n:'Anti-tank rocket',mag:1,res:2,spd:120,dmg:400,rl:3.5},ATGM:{n:'Anti-tank guided missile',mag:1,res:1,spd:90,dmg:700,rl:5,guided:1},
           MANPADS:{n:'Portable air-defence missile',mag:1,res:0,spd:400,dmg:600,rl:6,air:1}};
const ARM={NONE:{n:'None',k:1,spd:1},SOFT:{n:'Soft armour vest',k:.8,spd:.97},PLATE:{n:'Armour plates',k:.55,spd:.9},HEAVY:{n:'Heavy plates and helmet',k:.4,spd:.8}};
const INS={APC:'Armoured personnel carrier',IFV:'Infantry fighting vehicle',HELO:'Helicopter',AIR:'Airdrop',TANKD:'Tank crew · driver',TANKG:'Tank crew · gunner'};
const SIDE={n:'Sidearm',rpm:400,dmg:24,mag:15,res:45,spr:.02,ads:1.2,rl:1.6,auto:0,vm:'pistol'};
// v385: weapon models by class (names of real, widely known service weapons; handling is abstract game values, not data)
const GUNS={
  M4A1:{n:'M4A1',cls:'CARB',rpm:800,dmg:30,mag:30},X95:{n:'Tavor X95',cls:'CARB',rpm:850,dmg:30,mag:30},AK105:{n:'AK-105',cls:'CARB',rpm:650,dmg:30,mag:30},HK416C:{n:'HK416 (short)',cls:'CARB',rpm:850,dmg:30,mag:30},
  GROT:{n:'MSBS Grot',cls:'RIFLE',rpm:750,dmg:33,mag:30},HK416:{n:'HK416',cls:'RIFLE',rpm:850,dmg:33,mag:30,spr:.011},AK74M:{n:'AK-74M',cls:'RIFLE',rpm:650,dmg:33,mag:30,spr:.013},AK12:{n:'AK-12',cls:'RIFLE',rpm:700,dmg:33,mag:30,spr:.011},
  AKM:{n:'AKM',cls:'RIFLE',rpm:600,dmg:40,mag:30,spr:.016},M16A4:{n:'M16A4',cls:'RIFLE',rpm:800,dmg:33,mag:30,spr:.01,burst:3},SCARL:{n:'FN SCAR-L',cls:'RIFLE',rpm:625,dmg:33,mag:30},SCARH:{n:'FN SCAR-H',cls:'RIFLE',rpm:600,dmg:46,mag:20,spr:.013},
  G36:{n:'G36',cls:'RIFLE',rpm:750,dmg:31,mag:30},AUG:{n:'Steyr AUG',cls:'RIFLE',rpm:700,dmg:32,mag:30,spr:.01},FAMAS:{n:'FAMAS',cls:'RIFLE',rpm:950,dmg:30,mag:25},QBZ191:{n:'QBZ-191',cls:'RIFLE',rpm:750,dmg:32,mag:30},
  L85:{n:'L85A3',cls:'RIFLE',rpm:700,dmg:32,mag:30,spr:.01},FAL:{n:'FN FAL',cls:'RIFLE',rpm:650,dmg:46,mag:20,spr:.014},G3:{n:'HK G3',cls:'RIFLE',rpm:550,dmg:46,mag:20,spr:.014},
  MP5:{n:'MP5',cls:'SMG',rpm:800,dmg:22,mag:30},MP7:{n:'MP7',cls:'SMG',rpm:950,dmg:20,mag:40},P90:{n:'P90',cls:'SMG',rpm:900,dmg:20,mag:50},VITYAZ:{n:'PP-19-01 Vityaz',cls:'SMG',rpm:700,dmg:22,mag:30},UMP:{n:'UMP45',cls:'SMG',rpm:600,dmg:27,mag:25},
  M870:{n:'Remington 870',cls:'SHOT',rpm:70,dmg:17,pel:9,mag:7},M1014:{n:'M1014',cls:'SHOT',rpm:150,dmg:15,pel:9,mag:7},SAIGA:{n:'Saiga-12',cls:'SHOT',rpm:250,dmg:14,pel:8,mag:8},
  M249:{n:'M249',cls:'LMG',rpm:780,dmg:33,mag:100},PKP:{n:'PKP Pecheneg',cls:'LMG',rpm:650,dmg:42,mag:100},RPK16:{n:'RPK-16',cls:'LMG',rpm:700,dmg:33,mag:95},MG4:{n:'MG4',cls:'LMG',rpm:800,dmg:33,mag:100},
  SVD:{n:'SVD',cls:'DMR',rpm:200,dmg:66,mag:10},M110:{n:'M110',cls:'DMR',rpm:250,dmg:62,mag:20},MK14:{n:'Mk 14 EBR',cls:'DMR',rpm:300,dmg:60,mag:20},G28:{n:'HK G28',cls:'DMR',rpm:250,dmg:62,mag:20},
  QBZ95:{n:'QBZ-95-1',cls:'CARB',rpm:650,dmg:30,mag:30},QCW05:{n:'QCW-05',cls:'SMG',rpm:900,dmg:20,mag:50},QBS09:{n:'QBS-09',cls:'SHOT',rpm:120,dmg:15,pel:9,mag:5},QJB201:{n:'QJB-201',cls:'LMG',rpm:750,dmg:33,mag:75},QBU191:{n:'QBU-191',cls:'DMR',rpm:250,dmg:58,mag:20},CSLR4:{n:'CS/LR4',cls:'SNP',rpm:45,dmg:145,mag:5},
  M24:{n:'M24',cls:'SNP',rpm:45,dmg:140,mag:5},SV98:{n:'SV-98',cls:'SNP',rpm:45,dmg:140,mag:10},AWM:{n:'AWM',cls:'SNP',rpm:40,dmg:170,mag:5},T5000:{n:'Orsis T-5000',cls:'SNP',rpm:45,dmg:150,mag:5},M82:{n:'Barrett M82',cls:'SNP',rpm:90,dmg:260,mag:10,spr:.003,am:1,slow:.9}};
const SIDES={M17:{n:'M17 (SIG P320)',dmg:24,mag:17},G17:{n:'Glock 17',dmg:24,mag:17,rpm:450},M9:{n:'Beretta M9',dmg:24,mag:15},P226:{n:'SIG P226',dmg:24,mag:15},CZP10:{n:'CZ P-10 C',dmg:24,mag:15},
  PM:{n:'Makarov PM',dmg:20,mag:8},PYA:{n:'Yarygin PYa',dmg:25,mag:17},FN57:{n:'FN Five-seveN',dmg:21,mag:20,rpm:500},DEAGLE:{n:'Desert Eagle',dmg:45,mag:7,rpm:250,spr:.03},G18:{n:'Glock 18',dmg:22,mag:33,rpm:1100,auto:1,spr:.04},QSZ92:{n:'QSZ-92',dmg:24,mag:15},MP443:{n:'MP-443 Grach',dmg:25,mag:17}};
// attachments: each slot changes handling; which ones a gun takes depends on its class
const ATT={optic:{IRON:{n:'Iron sights'},RDS:{n:'Red dot',mag:1.45,ret:'dot'},HOLO:{n:'Holographic',mag:1.45,ret:'holo'},X4:{n:'4× prism',mag:4,ret:'chev',scope:1},V16:{n:'1–6× variable',mag:6,low:1.6,ret:'chev',scope:1,vari:1},X8:{n:'8× scope',mag:8,ret:'mil',scope:1},X12:{n:'12× scope',mag:12,ret:'mil',scope:1},MAG3:{n:'Red dot + 3× magnifier',mag:3,ret:'dot'},PSO:{n:'4× PSO-type scope',mag:4,ret:'chev',scope:1},THERM:{n:'Thermal sight (3×)',mag:3,ret:'chev',scope:1,therm:1}},
  muzzle:{NONE:{n:'None'},SUP:{n:'Suppressor',dmg:.95,quiet:1,kick:.9},COMP:{n:'Compensator',kick:.6},FH:{n:'Flash hider',kick:.85},BRAKE:{n:'Muzzle brake',kick:.5,loud:1}},
  under:{NONE:{n:'None'},GRIP:{n:'Vertical grip',move:.75,grip:.85},ANGLED:{n:'Angled grip',move:.85,grip:.9},HSTOP:{n:'Handstop',grip:.92},BIPOD:{n:'Bipod',crouch:.45},UGL:{n:'Grenade launcher',ugl:4}},
  laser:{NONE:{n:'None'},VIS:{n:'Visible laser',hip:.55,seen:1},IR:{n:'IR laser',hip:.7},LIGHT:{n:'Weapon light',light:1},COMBO:{n:'Laser and light unit',hip:.6,light:1,seen:1}},
  stock:{STD:{n:'Standard stock'},FOLD:{n:'Folded stock',stock:1.3,move:.9},PREC:{n:'Precision stock',stock:.8,move:1.08}},
  mag:{STD:{n:'Standard magazine'},EXT:{n:'Extended magazine',mag:1.33,rl:1.15},DRUM:{n:'Drum magazine',mag:2.5,rl:1.6,heavy:1},COUP:{n:'Magazine coupler',rl:.7}}};
const ALL=['IRON','RDS','HOLO','X4','V16'],ALLOW={CARB:{optic:ALL,muzzle:'*',under:'*',laser:'*'},RIFLE:{optic:ALL,muzzle:'*',under:'*',laser:'*'},SMG:{optic:['IRON','RDS','HOLO'],muzzle:'*',under:['NONE','GRIP'],laser:'*'},
  SHOT:{optic:['IRON','RDS','HOLO'],muzzle:['NONE'],under:['NONE','GRIP'],laser:'*'},LMG:{optic:['IRON','RDS','HOLO','X4'],muzzle:'*',under:['NONE','BIPOD','GRIP'],laser:'*'},
  DMR:{optic:['IRON','RDS','X4','V16','X8'],muzzle:'*',under:['NONE','BIPOD','GRIP'],laser:'*'},SNP:{optic:['X8','X12','V16'],muzzle:['NONE','SUP'],under:['NONE','BIPOD'],laser:['NONE','IR']},
  PISTOL:{optic:['IRON','RDS'],muzzle:['NONE','SUP','COMP'],under:['NONE'],laser:['NONE','VIS','LIGHT']}};
const ALLOW2={SNP:{mag:['STD','EXT'],stock:['STD','PREC']},PISTOL:{mag:['STD','EXT'],stock:['STD']},SHOT:{mag:['STD','EXT'],stock:['STD','FOLD']},LMG:{mag:['STD','DRUM'],stock:['STD','PREC']},SMG:{mag:['STD','EXT','COUP'],stock:['STD','FOLD']}};
const allowed=(cls,slot)=>{let a=(ALLOW[cls]||ALLOW.RIFLE)[slot];if(a===undefined)a=(ALLOW2[cls]&&ALLOW2[cls][slot])||'*';if(slot==='optic'&&a!=='*'){a=a.slice();if(cls==='DMR'||cls==='SNP')a.push('PSO','THERM');else if(cls!=='PISTOL'&&cls!=='SHOT')a.push('MAG3','THERM');}return a==='*'?Object.keys(ATT[slot]):a;};
// armour, piece by piece: each covers its own hit zone and adds weight (game values)
const HELM={NONE:{n:'No helmet',k:1,kg:0},BALL:{n:'Ballistic helmet',k:.55,kg:1.4},VISOR:{n:'Helmet and visor',k:.4,kg:2.8}};
const VEST={NONE:{n:'No body armour',k:1,kg:0},SOFT:{n:'Soft vest',k:.8,kg:2.5},P3:{n:'Rifle plates',k:.55,kg:7},P4:{n:'Heavy rifle plates',k:.42,kg:10},HEAVY:{n:'Heavy plate carrier',k:.35,kg:14}};
const EXTRA={NONE:{n:'None',k:1,kg:0},SHOULDER:{n:'Shoulder and groin',k:.75,kg:3},FULL:{n:'Full limb protection',k:.6,kg:6}};
const ARMSET={NONE:['NONE','NONE','NONE'],SOFT:['BALL','SOFT','NONE'],PLATE:['BALL','P3','NONE'],HEAVY:['VISOR','HEAVY','SHOULDER']};
const CLSDEF={CARB:'M4A1',RIFLE:'GROT',SMG:'MP5',SHOT:'M870',LMG:'M249',DMR:'M110',SNP:'M24'};
/* v407: WEAPON FAMILIES BY SIDE AND THE SMALL-ARMS TRADE. Each gun has a family (Western, Soviet / Russian pattern,
   Chinese) and a producing country. A country fields its own family's standard-issue weapons, the guns its own industry
   makes, and whatever it has BOUGHT from friendly countries: allies on the same side sell batches of rifles and
   ammunition to each other through the campaign (a weekly market; each sale is an event and the buyer's soldiers can
   then draw that gun; ammunition sales fill the reserve you carry). REDFOR armies stay with the Russian or Chinese
   families; BLUEFOR with Western ones. */
const FAM_E=new Set(['AK105','AK74M','AK12','AKM','VITYAZ','SAIGA','PKP','RPK16','SVD','SV98','T5000','PM','PYA','MP443']),FAM_C=new Set(['QBZ191','QBZ95','QCW05','QBS09','QJB201','QBU191','CSLR4','QSZ92']);
const MAKER={M4A1:'USA',X95:'ISR',HK416C:'DEU',HK416:'DEU',GROT:'POL',M16A4:'USA',SCARL:'BEL',SCARH:'BEL',G36:'DEU',AUG:'AUT',FAMAS:'FRA',L85:'GBR',FAL:'BEL',G3:'DEU',MP5:'DEU',MP7:'DEU',P90:'BEL',UMP:'DEU',M870:'USA',M1014:'ITA',M249:'BEL',MG4:'DEU',M110:'USA',MK14:'USA',G28:'DEU',M24:'USA',AWM:'GBR',M82:'USA',
  M17:'USA',G17:'AUT',M9:'ITA',P226:'CHE',CZP10:'CZE',FN57:'BEL',DEAGLE:'ISR',G18:'AUT'};
const famOfGun=id=>FAM_E.has(id)?'EAST':FAM_C.has(id)?'CHN':'WEST';const makerOf=id=>MAKER[id]||(FAM_E.has(id)?'RUS':FAM_C.has(id)?'CHN':'USA');
const STDFAM={WEST:{CARB:'M4A1',RIFLE:'HK416',SMG:'MP5',SHOT:'M870',LMG:'M249',DMR:'M110',SNP:'M24',SIDE:'G17'},EAST:{CARB:'AK105',RIFLE:'AK74M',SMG:'VITYAZ',SHOT:'SAIGA',LMG:'PKP',DMR:'SVD',SNP:'SV98',SIDE:'PYA'},CHN:{CARB:'QBZ95',RIFLE:'QBZ191',SMG:'QCW05',SHOT:'QBS09',LMG:'QJB201',DMR:'QBU191',SNP:'CSLR4',SIDE:'QSZ92'}};
function famOf3(a3){const r=(EQ(a3).RIFLE||'');if(/QBZ|Type 0|Type 95|Type 56/.test(r)||a3==='CHN'||a3==='PRK')return'CHN';if(/AK|Kalash|AKM/.test(r))return'EAST';const p=W.st&&W.st.c[a3];if(p&&p.side==='R'&&!r)return'EAST';return'WEST';}
const ARMS=()=>{const st=W.st;if(!st)return{};return st.arms2||(st.arms2={});};
function owned(a3){const A=ARMS()[a3];return A?A.g:[];}
function canField(a3,id){const fam=famOf3(a3);if(famOfGun(id)!==fam)return false;const S0=STDFAM[fam];if(Object.values(S0).includes(id))return true;if(makerOf(id)===a3)return true;if(owned(a3).includes(id))return true;const iss=issued(a3);return iss===id;}
function armsMarket(){const st=W.st;if(!st||st.over)return;if(Math.floor(st.t/24)%7)return;const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
  for(const p of Object.values(st.c)){if(!bel(p)||Math.random()>.35)continue;const fam=famOf3(p.a3);const cand=[...Object.keys(GUNS),...Object.keys(SIDES)].filter(id=>famOfGun(id)===fam&&!canField(p.a3,id));if(!cand.length)continue;
    const id=cand[(Math.random()*cand.length)|0],mk=makerOf(id),q=st.c[mk];const seller=q&&q.side===p.side&&q!==p?q:Object.values(st.c).find(x=>x.side===p.side&&x!==p&&x.gdp>p.gdp&&famOf3(x.a3)===fam);if(!seller)continue;
    const A=ARMS()[p.a3]||(ARMS()[p.a3]={g:[],ammo:0,from:{}});A.g.push(id);A.ammo=Math.min(3,A.ammo+.5);A.from[id]=seller.a3;const n=(5+Math.round(Math.random()*45))*1000;const nm=(GUNS[id]||SIDES[id]).n;
    W.emit('ARMS',{e:[seller.a3,p.a3],txt:seller.n+' sells about '+n.toLocaleString('en')+' '+nm+' and their ammunition to '+p.n+'; the first batches reach the units in a fortnight.'});}}
if(W.daily)W.daily.push(()=>{try{armsMarket();}catch(e){}});
// your country's issued rifle, if the table names one we have
function issued(a3){const r=(EQ(a3).RIFLE||'').toLowerCase();for(const[id,g]of Object.entries(GUNS))if(g.cls==='RIFLE'&&r&&r.split(/,\s*/).some(x=>x&&(x.includes(g.n.toLowerCase())||g.n.toLowerCase().includes(x))))return id;return null;}
function gunDef(cls,a3){const iss=cls==='RIFLE'&&issued(a3);if(iss&&canField(a3,iss))return iss;return STDFAM[famOf3(a3)][cls]||CLSDEF[cls];}
function fixAtt(att,cls){const o={};for(const sl of Object.keys(ATT)){const A=allowed(cls,sl);o[sl]=A.includes(att&&att[sl])?att[sl]:A[0];}if(cls==='SNP'&&!A0(o.optic))o.optic='X8';return o;}
const A0=k=>ATT.optic[k]&&ATT.optic[k].scope;
// the weapon you carry: class handling, then the model, then the attachments
function makeGun(cls,id,att){const base={...PRI[cls]},g=GUNS[id]||{};const w={...base,...g,cls,id,n:g.n||base.n};delete w.cls0;att=fixAtt(att,cls);w.att=att;
  const O=ATT.optic[att.optic],Mz=ATT.muzzle[att.muzzle],U=ATT.under[att.under],L=ATT.laser[att.laser];
  if(O.mag){w.ads=O.mag;w.scope=O.scope?1:0;w.ret=O.ret;w.vari=O.vari?O.low:0;}else{w.scope=0;w.ret=null;w.ads=Math.min(base.ads,1.6);}
  w.dmg=Math.round(w.dmg*(Mz.dmg||1));w.kickK=Mz.kick||1;w.quiet=!!Mz.quiet;w.moveK=U.move||1;w.crouchK=U.crouch||1;w.ugl=U.ugl||0;w.hipK=L.hip||1;w.seen=!!L.seen;w.light=!!L.light;w.laser=att.laser;w.pen=g.am?'AMR':cls;
  const St=ATT.stock[att.stock]||{},Mg=ATT.mag[att.mag]||{};w.gripK=U.grip||1;w.stockK=St.stock||1;w.moveK*=St.move||1;w.therm=!!O.therm;if(Mg.mag)w.mag=Math.round(w.mag*Mg.mag);if(Mg.rl)w.rl=(w.rl||2.5)*Mg.rl;if(Mg.heavy)w.slow=(w.slow||1)*.92;return w;}
function makeSide(id,att){const g=SIDES[id]||SIDES.M17;const w={...SIDE,...g,cls:'PISTOL',id};att=fixAtt(att,'PISTOL');w.att=att;const O=ATT.optic[att.optic],Mz=ATT.muzzle[att.muzzle],L=ATT.laser[att.laser];
  if(O.mag){w.ads=O.mag;w.ret=O.ret;}w.dmg=Math.round(w.dmg*(Mz.dmg||1));w.kickK=Mz.kick||1;w.quiet=!!Mz.quiet;w.hipK=L.hip||1;w.seen=!!L.seen;w.light=!!L.light;w.laser=att.laser;w.pen='PISTOL';const Mg=ATT.mag[att.mag]||{};if(Mg.mag)w.mag=Math.round(w.mag*Mg.mag);w.gripK=1;w.stockK=1;return w;}
function armOf(k){const h=HELM[k.helm]||HELM.BALL,v=VEST[k.vest]||VEST.P3,x=EXTRA[k.extra]||EXTRA.NONE,kg=h.kg+v.kg+x.kg;
  return{n:[h.k<1?h.n:null,v.k<1?v.n:null,x.k<1?x.n:null].filter(Boolean).join(' · ')||'No armour',k:v.k,head:h.k,limb:x.k,kg,spd:Math.max(.7,1-kg*.011)};}
// saved kits (three slots, in this browser)
const KITKEYS=['tank','loc0','role','pri','gun','att','side','satt','lau','helm','vest','extra','gren','ins','mis'];
function kitsLoad(){try{return JSON.parse(localStorage.getItem('viper.kits')||'[]')||[];}catch(e){return[];}}
function kitSave(i){const L=kitsLoad();const o={};for(const k of KITKEYS)o[k]=JSON.parse(JSON.stringify(K[k]));L[i]=o;try{localStorage.setItem('viper.kits',JSON.stringify(L));}catch(e){}}
function kitApply(i){const o=kitsLoad()[i];if(!o)return false;for(const k of KITKEYS)if(o[k]!==undefined)K[k]=JSON.parse(JSON.stringify(o[k]));return true;}
const K={tank:'AUTO',mode:'INF',mis:'FRONT',role:'ASSAULT',pri:'RIFLE',gun:null,att:{optic:'IRON',muzzle:'NONE',under:'NONE',laser:'NONE'},side:'M17',satt:{optic:'IRON',muzzle:'NONE',under:'NONE',laser:'NONE'},lau:'RPG',arm:'PLATE',helm:'BALL',vest:'P3',extra:'NONE',ins:'IFV',gren:2,a3:null,ap:null};
function names(a3){const E=EQ(a3);return{MBT:first(E.MBT),FTR:first(E.FTR4),ATK:first(E.ATK),RIFLE:first(E.RIFLE),RPG:null,ATGM:first(E.ATGM),MANPADS:first(E.MANPADS),APC:first(E.APC),IFV:first(E.IFV),HELO:first(E.UH)||first(E.HEL),AIR:first(E.TRN)};}
// v378: the classic campaign (CAMP) has no country registry: BLUEFOR fights as the USA, REDFOR as Russia; the battle is
// in the campaign's hottest sector and its result moves that sector of the campaign front.
const campCtx=()=>{const red=typeof game!=='undefined'&&game.team==='RED';return{camp:true,a3:red?'RUS':'USA',en:red?'USA':'RUS',side:red?'R':'B',n:red?'Russia':'United States',enN:red?'United States':'Russia'};};
const country=(cfg)=>cfg.camp?{n:campCtx().n,side:campCtx().side,gnd:1}:W.st.c[cfg.a3];
const INSB={APC:'Drops you and leaves.',IFV:'Stays and supports you with its cannon.',HELO:'Drops you and leaves.',AIR:'Parachute: steer it down.',TANKD:'You drive; your gunner, loader and commander fight the tank.',TANKG:'You aim and fire; the commander finds targets, the driver moves.'};
const MISD={ATTACK:['ATTACK','Take the town.'],DEFEND:['DEFEND','Hold the trenches.'],FRONT:['FRONT','Push from trench to trench; hold, fall back.']};
function kitMenu(a3,ap,camp,mode){if(!camp&&!W.st)return;if(mode)K.mode=mode;K.mode=K.mode||'INF';K.mis='FRONT';if(K.mode==='TANK'&&!/^TANK/.test(K.ins))K.ins='TANKG';if(K.mode!=='TANK'&&/^TANK/.test(K.ins))K.ins='IFV';K.camp=!!camp;if(camp)a3=campCtx().a3;K.a3=a3;K.ap=ap;if(K.gun&&!canField(a3,K.gun))K.gun=null;if(!canField(a3,K.side))K.side=STDFAM[famOf3(a3)].SIDE;const p=country(K),N=names(a3);if(!GUNS[K.gun]||GUNS[K.gun].cls!==K.pri)K.gun=gunDef(K.pri,a3);K.att=fixAtt(K.att,K.pri);K.satt=fixAtt(K.satt,'PISTOL');const G0=makeGun(K.pri,K.gun,K.att),AR=armOf(K),iss=issued(a3);const sn=window.UI2&&UI2.snap?UI2.snap():null;if(window.UI2)UI2.close();
  // one choice button: group g, key k; the data-ik attribute is what the click handler below reads
  const o=(g,k,nm,sub)=>'<button class="opt" data-ik="'+g+':'+k+'" aria-pressed="'+(K[g]===k)+'"><b>'+esc(nm)+'</b>'+(sub?'<span>'+esc(sub)+'</span>':'')+'</button>';
  const sec=(t,body,em)=>'<section class="sec"><h3>'+t+(em?'<em>'+em+'</em>':'')+'</h3>'+body+'</section>';
  const priSub=(k)=>Object.values(GUNS).filter(g=>g.cls===k).length+' models'+(PRI[k].pel?' · shot':'')+(k==='SNP'?' · scoped':'');
  const lauSub=(k)=>k==='NONE'?'':(N[k]?N[k]+' · ':'')+(LAU[k].air?'air defence, IR seeker':LAU[k].guided?MODEN[atgmMode(N.ATGM,country(K).side)]:'unguided')+' · '+(LAU[k].mag+LAU[k].res)+' rd';
  const armSub=(k)=>k==='NONE'?'No protection.':Math.round((1-ARM[k].k)*100)+'% protection · '+Math.round((1-ARM[k].spd)*100)+'% slower';
  const bar=(lab,v,txt)=>'<div class="st"><span>'+lab+'</span><u><i style="width:'+Math.round(Math.max(.04,Math.min(1,v))*100)+'%"></i></u><em>'+txt+'</em></div>';
  const R=ROLE[K.role],pr=G0,la=LAU[K.lau],ar=AR;const gp=(g,k)=>{const v=g.split('.');return v.length>1?K[v[0]][v[1]]===k:K[g]===k;};
  const o2=(g,k,nm,sub)=>'<button class="opt" data-ik="'+g+':'+k+'" aria-pressed="'+gp(g,k)+'"><b>'+esc(nm)+'</b>'+(sub?'<span>'+esc(sub)+'</span>':'')+'</button>';
  const sg=(g,keys,lab)=>'<div class="seg">'+keys.map(k=>'<button data-ik="'+g+':'+k+'" aria-pressed="'+gp(g,k)+'">'+esc(lab(k))+'</button>').join('')+'</div>';
  const KS=kitsLoad();
  const mod=R&&(R.pri!==K.pri||R.lau!==K.lau||R.gren!==K.gren||ARMSET[R.arm].join()!==[K.helm,K.vest,K.extra].join());
  const ln=(l,v)=>'<div class="ln"><span>'+l+'</span><b>'+esc(v)+'</b></div>';
  const card='<aside class="ks" aria-label="Loadout"><div class="sb">LOADOUT'+(mod?' · MODIFIED':'')+'</div><div class="rl">'+esc(R?R.n:K.role)+'</div>'+
    ln('OBJECTIVE',MISD[K.mis]?MISD[K.mis][0]+' — '+MISD[K.mis][1]:K.mis)+ln('PRIMARY',pr.n)+ln('ATTACHMENTS',['optic','muzzle','under','laser','stock','mag'].map(sl=>K.att[sl]).filter(x=>x!=='NONE'&&x!=='IRON'&&x!=='STD').map(x=>{for(const sl in ATT)if(ATT[sl][x])return ATT[sl][x].n;}).join(', ')||'None')+ln('LAUNCHER',K.lau==='NONE'?'None':(N[K.lau]?N[K.lau]+' — ':'')+la.n)+ln('SIDEARM',(SIDES[K.side]||SIDES.M17).n)+ln('ARMOUR',ar.n)+ln('WEIGHT',ar.kg.toFixed(1)+' kg of armour')+ln('GRENADES',String(K.gren))+ln('INSERTION',INS[K.ins]+(N[K.ins]?' · '+N[K.ins]:''))+
    '<div class="br">'+bar('DAMAGE',pr.dmg/140,pr.dmg+(pr.pel?' ×'+pr.pel:''))+bar('FIRE RATE',pr.rpm/900,String(pr.rpm))+bar('MAGAZINE',pr.mag/100,String(pr.mag))+bar('ACCURACY',1-pr.spr/.07,Math.round((1-pr.spr/.07)*100)+'%')+bar('PROTECTION',(3-ar.k-ar.head-ar.limb)/1.7,Math.round((1-ar.k)*100)+'% body · '+Math.round((1-ar.head)*100)+'% head')+bar('ZOOM',pr.ads/12,pr.ads.toFixed(1)+'×')+bar('MOBILITY',ar.spd,Math.round(ar.spd*100)+'%')+'</div>'+
    '<div class="fine">'+esc(INSB[K.ins])+' Abstract game values, not published data.</div></aside>';
  const keys=K.mode==='TANK'?[['WASD','drive (driver)'],['MOUSE','traverse and elevate (gunner)'],['LMB','fire the main gun'],['RMB','coaxial machine gun'],['1 2 3','sabot, HEAT, high explosive'],['Z','sight zoom'],['Q','zoom in / out'],['T','thermal sight'],['F','turret stabiliser'],['V','outside view'],['X','fire extinguisher'],['Esc','pause']]:[['WASD','move'],['MOUSE','look'],['Q','aim (or right mouse)'],['B','sandbag wall'],['O','offensive'],['F','place FPV drone'],['V','its feed'],['H','medevac'],['G','grenade'],['4','grenade launcher'],['5','tourniquet'],['6','bandage'],['7','medical kit'],['X','go prone'],['E','command post / ride / treat a wounded friend'],['K','build command post'],['T','fall back'],['Z','scope zoom (1–6×)'],['L','laser / light'],['Esc','leave']];
  const h='<header class="mh"><div class="mk">'+(K.mode==='TANK'?'TANK CREW · THE FRONT':'INFANTRY · KIT AND INSERTION')+'</div><h2 id="u2t">'+(K.mode==='TANK'?'TANKER':'INFANTRY')+' — '+esc(p.n.toUpperCase())+'</h2><div class="ms"><span>'+(K.mode==='TANK'?'Your seat in the tank and where you fight':'Your kit and how you get to the front')+'</span></div></header>'+
   '<div class="mb"><div class="kit"><div class="col">'+
   (()=>{const C=locChoices(K);if(!C.length)return'';if(!C.some(c=>c.id===K.loc0))K.loc0=C[0].id;return sec('BATTLE LOCATION','<div class="opts">'+C.map(c=>o2('loc0',c.id,c.name,c.front?(c.front+(c.pop?' · pop. '+(c.pop>=1e6?(c.pop/1e6).toFixed(1)+' M':Math.round(c.pop/1000)+' k'):'')):('front '+Math.round(c.d/1000)+' km'))).join('')+'</div>','where you go in');})()+
   (K.mode==='TANK'?'':''+
   sec('ROLE','<div class="opts c3">'+Object.keys(ROLE).map(k=>o('role',k,ROLE[k].n,PRI[ROLE[k].pri].n)).join('')+'</div>','sets the kit, each item can still be changed')+
   sec('SAVED KITS','<div class="seg">'+[0,1,2].map(i=>'<button data-ik="kitsave:'+i+'">SAVE '+(i+1)+'</button>').join('')+'</div><div class="seg" style="margin-top:6px">'+[0,1,2].map(i=>'<button data-ik="kitload:'+i+'"'+(KS[i]?'':' disabled')+'>'+(KS[i]?'LOAD '+(i+1)+' · '+esc(((GUNS[KS[i].gun]||{}).n||KS[i].pri)+' · '+((ROLE[KS[i].role]||{}).n||'')):'SLOT '+(i+1)+' EMPTY')+'</button>').join('')+'</div>','kept in this browser')+
   sec('PRIMARY WEAPON','<div class="opts c3">'+Object.keys(PRI).map(k=>o('pri',k,PRI[k].n,priSub(k))).join('')+'</div><div class="opts" style="margin-top:8px">'+Object.entries(GUNS).filter(([id,g])=>g.cls===K.pri&&canField(K.a3,id)).map(([id,g])=>{const w=makeGun(K.pri,id,{});return o2('gun',id,g.n+(id===iss?' · issued':''),w.mag+' rd · '+w.rpm+' rpm · dmg '+w.dmg+(w.burst?' · 3-round burst':'')+(g.am?' · anti-materiel':''));}).join('')+'</div>','class, then model')+
   sec('ATTACHMENTS',['optic','muzzle','under','laser','stock','mag'].map(sl=>'<div class="note" style="margin:6px 0 3px">'+({optic:'OPTIC',muzzle:'MUZZLE',under:'UNDERBARREL',laser:'LASER / LIGHT',stock:'STOCK',mag:'MAGAZINE'}[sl])+'</div>'+sg('att.'+sl,allowed(K.pri,sl),k=>ATT[sl][k].n)).join(''),'what this class takes')+
   sec('SIDEARM','<div class="opts">'+Object.entries(SIDES).filter(([id])=>canField(K.a3,id)).map(([id,g])=>o2('side',id,g.n,(g.mag)+' rd · dmg '+g.dmg+(g.auto?' · automatic':''))).join('')+'</div>'+['optic','muzzle','laser'].map(sl=>'<div class="note" style="margin:6px 0 3px">'+({optic:'OPTIC',muzzle:'MUZZLE',laser:'LASER / LIGHT'}[sl])+'</div>'+sg('satt.'+sl,allowed('PISTOL',sl),k=>ATT[sl][k].n)).join(''))+
   sec('LAUNCHER','<div class="opts">'+Object.keys(LAU).map(k=>o('lau',k,(N[k]?N[k]+' — ':'')+LAU[k].n,lauSub(k))).join('')+'</div>')+
   sec('ARMOUR','<div class="note" style="margin:0 0 3px">HELMET (head)</div><div class="opts">'+Object.entries(HELM).map(([k,a])=>o2('helm',k,a.n,(a.k<1?Math.round((1-a.k)*100)+'% · ':'')+a.kg+' kg')).join('')+'</div>'+
     '<div class="note" style="margin:8px 0 3px">BODY (torso)</div><div class="opts">'+Object.entries(VEST).map(([k,a])=>o2('vest',k,a.n,(a.k<1?Math.round((1-a.k)*100)+'% · ':'')+a.kg+' kg')).join('')+'</div>'+
     '<div class="note" style="margin:8px 0 3px">LIMBS</div><div class="opts">'+Object.entries(EXTRA).map(([k,a])=>o2('extra',k,a.n,(a.k<1?Math.round((1-a.k)*100)+'% · ':'')+a.kg+' kg')).join('')+'</div>'+
     '<div class="note">'+ar.kg.toFixed(1)+' kg in all · you move at '+Math.round(ar.spd*100)+'% speed. Each piece protects its own hit zone.</div>','pick each piece')+
   sec('GRENADES','<div class="seg">'+[0,2,4].map(n=>'<button data-ik="gren:'+n+'" aria-pressed="'+(K.gren===n)+'">'+n+'</button>').join('')+'</div><div class="note">A sidearm is always carried.</div>'))+
   (K.mode==='TANK'?sec('TANK','<div class="opts">'+(()=>{const mine=String(EQ(K.a3)['MBT']||'').split(/,\s*/).map(n=>Object.keys(VC).find(k=>{const x=k.toLowerCase().replace(/[^a-z0-9]/g,''),y=n.toLowerCase().replace(/[^a-z0-9]/g,'');return y&&(x.includes(y)||y.includes(x));})).filter(Boolean);
      const all=Object.keys(VC).filter(k=>VC[k].cls==='MBT').sort((a,b)=>(mine.includes(b)-mine.includes(a))||a.localeCompare(b));const A=ARMT.MBT;
      return o2('tank','AUTO','Your army\'s tank','what '+(p?p.n:'your country')+' sends to this front')+all.map(k=>{const v=VC[k];return o2('tank',k,k+(mine.includes(k)?' · in service':''),(v.fam==='SOV'?'Soviet school':'Western school')+' · crew '+(v.crew||4)+' · '+(v.lay==='carousel'?'autoloader':v.lay==='bustle'?'loader, bustle rack':v.lay||'loader')+(v.era?' · ERA '+v.era:'')+' · armour ×'+(v.arm||1));}).join('');})()+'</div>','the tank you crew'):'')+
   sec(K.mode==='TANK'?'CREW POSITION':'INSERTION','<div class="opts">'+Object.keys(INS).filter(k=>(K.mode==='TANK')===/^TANK/.test(k)).map(k=>o('ins',k,INS[k],(N[k]?N[k]+' · ':'')+INSB[k])).join('')+'</div>')+
   '</div>'+card+'</div>'+
   sec('CONTROLS','<div class="keys">'+keys.map(([k,t])=>'<span><kbd>'+k+'</kbd>'+t+'</span>').join('')+'</div><div class="note">In the world war you fight in the live world while the war goes on.</div>')+
   '</div>'+
   '<footer class="mf"><button class="ghost" data-ix="1">'+(K.camp?'CANCEL':'BACK')+'</button><div class="r"><button class="go" data-igo="1">DEPLOY ▸</button></div></footer>';
  const d=document.createElement('div');d.className='u2m';d.id='u2m';d.dataset.k='kit';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','u2t');d.innerHTML='<div class="bx wide">'+h+'</div>';document.body.appendChild(d);
  if(sn&&UI2.restore)UI2.restore(d,sn,'kit');}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-inf],[data-ik],[data-ix],[data-igo]');if(!t)return;const d=t.dataset;
  if(d.inf&&window.UI2){kitMenu(UI2.SU.a3,UI2.SU.ap);}
  else if(d.ik){const[g,k]=d.ik.split(':');
    if(g==='kitsave')kitSave(+k);else if(g==='kitload')kitApply(+k);
    else if(g.includes('.')){const[a,b]=g.split('.');K[a]={...K[a],[b]:k};}
    else{K[g]=g==='gren'?+k:k;if(g==='role'){const R=ROLE[k];Object.assign(K,{pri:R.pri,lau:R.lau,arm:R.arm,gren:R.gren});[K.helm,K.vest,K.extra]=ARMSET[R.arm];K.gun=gunDef(R.pri,K.a3);if(R.pri==='SNP')K.att={...K.att,optic:'X8'};}
      if(g==='pri'){K.gun=gunDef(k,K.a3);if(k==='SNP')K.att={...K.att,optic:'X8'};}}
    kitMenu(K.a3,K.ap,K.camp);}
  else if(d.ix){const m=document.getElementById('u2m');if(m)m.remove();}
  else if(d.igo){K.mis='FRONT';auInit();if(AU.C&&AU.C.state==='suspended')AU.C.resume();const m=document.getElementById('u2m');if(m)m.remove();if(!K.camp&&K.ap&&K.ap.runways&&window.WSORTIE)startWorld({...K});else start({...K});}});

/* ------------------------------------------------------------------ the battle */
const V3=THREE.Vector3;let S=null;
function noise(x,z){return Math.sin(x*.011)*6+Math.cos(z*.013)*5+Math.sin((x+z)*.031)*1.6+Math.cos((x-z)*.047)*.9;}
let HF=noise;const H=(x,z)=>HF(x,z)-(TR.n?cut(x,z):0);
/* v407: MODERN TRENCHES CUT INTO THE GROUND (after the field fortifications of the current war in Ukraine: narrow
   zig-zag fire trenches about 1.8 m deep and 1.2 m wide, walls revetted with timber and wattle, duckboard floors, a low
   spoil parapet and sandbags toward the enemy, covered dugouts with log-and-earth roofs off the rear wall, nets over
   sections against drones, communication trenches running back to the rear (the way in and out), and in front an
   anti-tank ditch with rows of concrete "dragon's teeth"). The ground surface is opened over every cut (a shader hole
   in the terrain); the height function H drops into the cut, so bullets, grenades and people use the real trench. */
const TR={n:0,L:[],G:[],U:{uTL:{value:[]},uTLn:{value:0},uTG:{value:[]},uTGw:{value:Array.from({length:12},()=>new THREE.Vector4())},uTGn:{value:0}},O:{x:0,z:0},mats:new Set()};
const TRA=1.6,TRP=20,TRW=.6,TRD=1.35;   // v420: deep enough to crouch under, shallow enough to see over standing (a fire step)
function zig(x0,x){const u=((x-x0)%TRP+TRP)%TRP;return u<8?-TRA:u<10?-TRA+TRA*(u-8):u<18?TRA:TRA-TRA*(u-18);}
function cut(x,z){let d=0;for(const L of TR.L){if(x<L.x0||x>L.x1)continue;if(L.k===1){const u=((x-L.x0)%70+70)%70;if(u<60&&Math.abs(z-L.z)<1.6)d=Math.max(d,2.2-Math.abs(z-L.z)*.6);}else if(Math.abs(z-(L.z+zig(L.x0,x)))<TRW)d=Math.max(d,TRD);}
  for(const g of TR.G){const vx=g.x1-g.x0,vz=g.z1-g.z0,l2=vx*vx+vz*vz||1;const t=Math.max(0,Math.min(1,((x-g.x0)*vx+(z-g.z0)*vz)/l2));const ex=x-g.x0-vx*t,ez=z-g.z0-vz*t;if(ex*ex+ez*ez<g.w*g.w)d=Math.max(d,g.d*(g.tp?Math.min(1,(1-t)*4):1));}return d;}
function trSync(){const U=TR.U,O=TR.O;U.uTL.value=TR.L.slice(0,10).map(L=>new THREE.Vector4(L.z+O.z,L.x0+O.x,L.x1+O.x,L.k));while(U.uTL.value.length<10)U.uTL.value.push(new THREE.Vector4(0,0,0,0));U.uTLn.value=Math.min(10,TR.L.length);
  let G=TR.G;if(G.length>48){const px=S&&S.pos?S.pos.x:0,pz=S&&S.pos?S.pos.z:0,dd=g=>{const vx=g.x1-g.x0,vz=g.z1-g.z0,l2=vx*vx+vz*vz||1e-6,t=Math.max(0,Math.min(1,((px-g.x0)*vx+(pz-g.z0)*vz)/l2));return Math.hypot(px-g.x0-vx*t,pz-g.z0-vz*t);};G=G.slice().sort((a,b)=>dd(a)-dd(b)).slice(0,48);}TR.sx=S&&S.pos?S.pos.x:0;TR.sz=S&&S.pos?S.pos.z:0;   /* v423: the 48 cuts nearest you are drawn (the shader's limit); they follow you */U.uTG.value=G.map(g=>new THREE.Vector4(g.x0+O.x,g.z0+O.z,g.x1+O.x,g.z1+O.z));while(U.uTG.value.length<48)U.uTG.value.push(new THREE.Vector4(0,0,0,0));for(const v of U.uTGw.value)v.set(0,0,0,0);G.forEach((g,i)=>U.uTGw.value[i>>2].setComponent(i&3,g.w));U.uTGn.value=G.length;TR.n=TR.L.length+TR.G.length;}
// open the ground over the cuts: a fragment discard added to a terrain material (keeps its own shader changes)
function trHole(m){if(!m||TR.mats.has(m))return;TR.mats.add(m);const prev=m.onBeforeCompile;m.onBeforeCompile=function(sh,r){if(prev)prev.call(this,sh,r);Object.assign(sh.uniforms,TR.U);
  sh.vertexShader='varying vec3 vTW;\n'+sh.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvTW=(modelMatrix*vec4(transformed,1.)).xyz;');
  sh.fragmentShader='varying vec3 vTW;uniform vec4 uTL[10];uniform int uTLn;uniform vec4 uTG[48];uniform vec4 uTGw[12];uniform int uTGn;\nfloat trZ(float x,float x0){float u=mod(x-x0,20.);return u<8.?-1.6:u<10.?-1.6+1.6*(u-8.):u<18.?1.6:1.6-1.6*(u-18.);}\n'+
    sh.fragmentShader.replace(/void main\(\) \{/,'void main() {\n for(int i=0;i<10;i++){if(i>=uTLn)break;vec4 L=uTL[i];if(vTW.x<L.y||vTW.x>L.z)continue;if(L.w>.5){if(mod(vTW.x-L.y,70.)<60.&&abs(vTW.z-L.x)<1.6)discard;}else if(abs(vTW.z-(L.x+trZ(vTW.x,L.y)))<.6)discard;}\n for(int i=0;i<48;i++){if(i>=uTGn)break;vec4 g=uTG[i];vec2 a=g.xy,v=g.zw-g.xy;float t=clamp(dot(vTW.xz-a,v)/max(dot(v,v),1e-4),0.,1.);vec4 W4=uTGw[i/4];int j=i-(i/4)*4;float gw=j==0?W4.x:j==1?W4.y:j==2?W4.z:W4.w;if(length(vTW.xz-a-v*t)<gw)discard;}');};
  m.customProgramCacheKey=()=>'trhole';m.needsUpdate=true;}
let TRT=null;function trTex(){if(TRT)return TRT;const mk=(f)=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');f(g);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;};
  TRT={wall:mk(g=>{g.fillStyle='#5e4a32';g.fillRect(0,0,128,128);for(let y=0;y<128;y+=16){g.fillStyle=y%32?'#6e5638':'#584229';g.fillRect(0,y,128,14);g.fillStyle='#3a2c1c';g.fillRect(0,y+14,128,2);}for(let x=0;x<128;x+=42){g.fillStyle='#3e3020';g.fillRect(x,0,6,128);}}),
    floor:mk(g=>{g.fillStyle='#3a2e22';g.fillRect(0,0,128,128);for(let x=0;x<128;x+=18){g.fillStyle='#7a6448';g.fillRect(x,0,13,128);}g.fillStyle='#4a3a2a';g.fillRect(0,20,128,6);g.fillRect(0,100,128,6);}),
    net:mk(g=>{g.clearRect(0,0,128,128);g.strokeStyle='rgba(60,80,40,.9)';g.lineWidth=2;for(let i=-128;i<256;i+=12){g.beginPath();g.moveTo(i,0);g.lineTo(i+128,128);g.stroke();g.beginPath();g.moveTo(i,128);g.lineTo(i+128,0);g.stroke();}for(let i=0;i<60;i++){g.fillStyle='rgba(70,90,45,.8)';g.fillRect(Math.random()*128,Math.random()*128,8,5);}})};return TRT;}
// a strip along a path: pts [{x,z}], two edges at offsets a and b from the centre line, heights from fy(x,z,side)
function strip(pts,a,b,fyA,fyB,mat,uv){const P=[],I=[],U=[];let len=0;for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[Math.min(i+1,pts.length-1)],o=pts[Math.max(i-1,0)];let dx=q.x-o.x,dz=q.z-o.z;const l=Math.hypot(dx,dz)||1;const nx=-dz/l,nz=dx/l;
    if(i)len+=Math.hypot(p.x-pts[i-1].x,p.z-pts[i-1].z);const ax=p.x+nx*a,az=p.z+nz*a,bx=p.x+nx*b,bz=p.z+nz*b;P.push(ax,fyA(ax,az,p),az,bx,fyB(bx,bz,p),bz);U.push(len/(uv||2),0,len/(uv||2),1);if(i)I.push((i-1)*2,(i-1)*2+1,i*2,(i-1)*2+1,i*2+1,i*2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.frustumCulled=false;return m;}
// one trench along a path: two revetted walls, duckboards, spoil parapet toward the enemy (face: -1 enemy at -z, +1 at +z)
function trBuild(sc,pts,face,w,d){const T=trTex(),wm=new THREE.MeshLambertMaterial({map:T.wall,side:THREE.DoubleSide}),fm=new THREE.MeshLambertMaterial({map:T.floor}),em=new THREE.MeshLambertMaterial({color:0x5a4630,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});   /* v407: the spoil drawn over the ground, never fighting it */
  const gy=(x,z,p)=>HF(x,z);const G=new THREE.Group();
  G.add(strip(pts,-w,-w,(x,z,p)=>gy(x,z,p)+.05,(x,z,p)=>gy(x,z,p)-d,wm,2));G.add(strip(pts,w,w,(x,z,p)=>gy(x,z,p)+.05,(x,z,p)=>gy(x,z,p)-d,wm,2));
  G.add(strip(pts,-w,w,(x,z,p)=>gy(x,z,p)-d+.02,(x,z,p)=>gy(x,z,p)-d+.02,fm,1.2));
  if(face){const f=face;G.add(strip(pts,f*w,f*(w+1.4),(x,z,p)=>gy(x,z,p)+.05,(x,z,p)=>gy(x,z,p)+.45,em,4));G.add(strip(pts,f*(w+1.4),f*(w+3.2),(x,z,p)=>gy(x,z,p)+.45,(x,z,p)=>gy(x,z,p)+.04,em,4));
    G.add(strip(pts,-f*w,-f*(w+.9),(x,z,p)=>gy(x,z,p)+.05,(x,z,p)=>gy(x,z,p)+.2,em,4));}
  sc.add(G);return G;}
function zigPts(L){const pts=[];for(let x=L.x0;x<=L.x1;x+=Math.abs(x)<700?1:2)pts.push({x,z:L.z+zig(L.x0,x)});return pts;}
// a full fortified line: the zig-zag trench, sandbags at the bays, nets, dugouts and communication trenches to the rear
function trLine(sc,z,face,own,x0,x1,bag){const L={k:0,z,x0,x1,face,own};TR.L.push(L);trBuild(sc,zigPts(L),face,TRW,TRD);const slots=[];
  const T=trTex(),netM=new THREE.MeshLambertMaterial({map:T.net,transparent:true,depthWrite:false,side:THREE.DoubleSide}),logM=new THREE.MeshLambertMaterial({color:0x4a3a28}),bagM=new THREE.MeshLambertMaterial({color:bag||0x8c7d5a});
  const nb=Math.floor((x1-x0)/20);const bags=new THREE.InstancedMesh(new THREE.BoxGeometry(.55,.22,.32),bagM,nb*8);let bi=0;const M4=new THREE.Matrix4();
  for(let i=0;i<nb;i++){const bx=x0+i*20+4,bz=z+zig(x0,bx);slots.push(new V3(bx,0,bz));{const b2=x0+i*20+14;slots.push(new V3(b2,0,z+zig(x0,b2)));}if(i%2===0)for(let k=0;k<8;k++){const x=bx-2+k*.55,zz=bz+face*(TRW+.35),g=HF(x,zz)+.13+(k%2)*.01;M4.makeTranslation(x,g,zz);bags.setMatrixAt(bi++,M4);}
    if(i%2===1){const nx=x0+i*20+13,nz=z+zig(x0,nx);const n=new THREE.Mesh(new THREE.PlaneGeometry(7,2.2),netM);n.rotation.x=-Math.PI/2;n.position.set(nx,HF(nx,nz)+.35,nz);sc.add(n);}
    if(i%3===1&&Math.abs(x0+i*20)<320){const dx=x0+i*20+14,dz=z+zig(x0,dx),rz=dz-face*(TRW+2.4);TR.G.push({x0:dx,z0:dz,x1:dx,z1:rz-face*1.2,w:.8,d:TRD});
      const roof=new THREE.Mesh(new THREE.BoxGeometry(4,.55,3),logM);roof.position.set(dx,HF(dx,rz)+.2,rz-face*.6);sc.add(roof);trBuild(sc,[{x:dx,z:dz-face*TRW},{x:dx,z:rz}],0,.7,TRD);}
    if(i%8===4&&Math.abs(x0+i*20)<520){const cx=x0+i*20+4,cz=z+zig(x0,cx);const ez=cz-face*70;TR.G.push({x0:cx,z0:cz,x1:cx,z1:ez,w:.55,d:TRD,tp:1});const pts=[];for(let t=0;t<=1.0001;t+=1/35)pts.push({x:cx,z:cz+(ez-cz)*t});trBuild(sc,pts,0,.55,TRD*.8);}}
  // v407: MACHINE-GUN NESTS every 100 m near the fight (a horseshoe of sandbags on the parapet, the gun on its bipod,
  // a firing slit under a log cover) and SNIPER HIDES 30-40 m behind the line (a scrape under a net with a log rest)
  L.mg=[];L.snp=[];const mgM=new THREE.MeshLambertMaterial({color:0x1d1f20});
  for(let i=2;i<nb;i+=5){const x=x0+i*20+4;if(Math.abs(x)>320)continue;const zc=z+zig(x0,x),zp=zc+face*(TRW+.3),g=HF(x,zp);
    for(let k=-3;k<=3;k++){const a=k*.42,bxx=x+Math.sin(a)*1.3,bzz=zp+face*Math.cos(a)*1.3;for(let h=0;h<2;h++){const b=new THREE.Mesh(new THREE.BoxGeometry(.55,.22,.32),bagM);b.position.set(bxx,HF(bxx,bzz)+.11+h*.22,bzz);b.rotation.y=a;sc.add(b);}}
    const cov=new THREE.Mesh(new THREE.BoxGeometry(2.4,.25,1.6),logM);cov.position.set(x,g+.62,zp+face*.5);sc.add(cov);
    const gun=new THREE.Group();const rc=new THREE.Mesh(new THREE.BoxGeometry(.09,.12,.7),mgM);gun.add(rc);const br=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.7,6),mgM);br.rotation.x=Math.PI/2;br.position.z=face*.65;gun.add(br);
    for(const sx of[-.12,.12]){const lg=new THREE.Mesh(new THREE.BoxGeometry(.015,.3,.015),mgM);lg.position.set(sx,-.12,face*.55);lg.rotation.x=face*.4;gun.add(lg);}gun.position.set(x,g+.3,zp+face*.2);sc.add(gun);
    L.mg.push(new V3(x,0,zc+face*.2));}
  for(let i=4;i<nb;i+=7){const x=x0+i*20+10;if(Math.abs(x)>320)continue;const zz=z-face*(30+((i*7)%10)),g=HF(x,zz);TR.G.push({x0:x-1,z0:zz,x1:x+1,z1:zz,w:.9,d:.7});
    const n=new THREE.Mesh(new THREE.PlaneGeometry(3,2.4),netM);n.rotation.x=-Math.PI/2+.15*face;n.position.set(x,g+.45,zz);sc.add(n);const lg=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,1.6,6),logM);lg.rotation.z=Math.PI/2;lg.position.set(x,g+.1,zz+face*1);sc.add(lg);L.snp.push(new V3(x,0,zz));}
  L.all=slots;L.slots=slots.filter(t=>Math.abs(t.x)<220);return L;}
// anti-tank ditch with gaps, and a row of dragon's teeth in front of it
function trDitch(sc,z,x0,x1,face){TR.L.push({k:1,z,x0,x1});const tm=new THREE.MeshLambertMaterial({color:0xa8a49a});const n=Math.floor((x1-x0)/2.5);const im=new THREE.InstancedMesh(new THREE.ConeGeometry(.7,1.2,4),tm,n);let k=0;const M4=new THREE.Matrix4();
  for(let x=x0;x<x1;x+=2.5){if(((x-x0)%70)>60)continue;const zz=z+face*9+((k%2)?1.2:0);M4.makeTranslation(x,HF(x,zz)+.5,zz);im.setMatrixAt(k++,M4);}im.count=k;im.instanceMatrix.needsUpdate=true;sc.add(im);}

// v387: soldiers with jointed limbs (legs and arms swing, crouch, recoil, fall), helmet or cap, vest, pack and rifle;
// uniforms vary man to man within each side's palette, skin tones and helmet covers vary; materials are shared.
const MAT=new Map();const MT=c=>{let m=MAT.get(c);if(!m){m=new THREE.MeshLambertMaterial({color:c});MAT.set(c,m);}return m;};
const PAL={F:[0x4f6a3a,0x5b6b45,0x667050,0x4a5a3a,0x6b6a4a,0x55603f],E:[0x7a6a44,0x6d6248,0x5e5a3e,0x84765a,0x6f6a52,0x5a5236]};
const SKIN=[0x8a6a50,0xc59c7c,0x6a4a35,0xa47858,0xe0b896,0x7d5a42];const GEOS={};const GE=(k,f)=>GEOS[k]||(GEOS[k]=f());
function vary(c,a){const C=new THREE.Color(c);C.offsetHSL((rn()-.5)*.03,(rn()-.5)*.08,(rn()-.5)*a);return C.getHex()&0xf8f8f8;}
function soldier(friend){const g=new THREE.Group(),P=PAL[friend?'F':'E'],uni=MT(vary(P[(rn()*P.length)|0],.06)),dark=MT(vary(P[(rn()*P.length)|0],.04)&0xd0d0d0),sk=MT(SKIN[(rn()*SKIN.length)|0]),blk=MT(0x1e1f1d);
  const box=(k,w,h,d)=>GE(k,()=>new THREE.BoxGeometry(w,h,d));const up=new THREE.Group();g.add(up);
  const leg=x=>{const hip=new THREE.Group();hip.position.set(x,.92,0);const th=new THREE.Mesh(box('th',.16,.48,.18),uni);th.position.y=-.24;hip.add(th);const kn=new THREE.Group();kn.position.y=-.47;hip.add(kn);
    const sh=new THREE.Mesh(box('sh',.14,.44,.15),uni);sh.position.y=-.22;kn.add(sh);const bt=new THREE.Mesh(box('bt',.15,.1,.26),blk);bt.position.set(0,-.43,-.04);kn.add(bt);th.userData.part=sh.userData.part=bt.userData.part='legs';g.add(hip);return{hip,kn};};
  const L=leg(-.1),R=leg(.1);
  const tor=new THREE.Mesh(box('to',.44,.56,.24),uni);tor.position.y=1.2;up.add(tor);const vest=new THREE.Mesh(box('ve',.48,.4,.3),dark);vest.position.y=1.24;up.add(vest);
  if(rn()<.65){const pk=new THREE.Mesh(box('pk',.34,.42,.18),dark);pk.position.set(0,1.22,.22);up.add(pk);pk.userData.part='body';}
  const hd=new THREE.Mesh(GE('hd',()=>new THREE.SphereGeometry(.12,8,6)),sk);hd.position.y=1.62;up.add(hd);
  const cap=rn()<.12;const hm=new THREE.Mesh(cap?GE('cap',()=>new THREE.CylinderGeometry(.14,.15,.08,10)):GE('hm',()=>new THREE.SphereGeometry(.15,10,6,0,6.3,0,1.45)),cap?uni:MT(vary(P[(rn()*P.length)|0],.05)));hm.position.y=cap?1.71:1.65;up.add(hm);
  const arm=x=>{const sh=new THREE.Group();sh.position.set(x,1.42,0);const a=new THREE.Mesh(box('ar',.11,.56,.12),uni);a.position.y=-.27;sh.add(a);const h=new THREE.Mesh(box('ha',.09,.09,.09),sk);h.position.y=-.58;sh.add(h);a.userData.part=h.userData.part='arms';up.add(sh);return sh;};
  const AL=arm(-.29),AR=arm(.29);AL.rotation.set(-1.1,0,.35);AR.rotation.set(-1.25,0,-.15);
  const gun=new THREE.Group();gun.position.set(.08,1.3,-.28);const gb=new THREE.Mesh(box('gb',.06,.09,.62),blk);gun.add(gb);const gm=new THREE.Mesh(box('gm',.04,.13,.06),blk);gm.position.set(0,-.1,-.06);gun.add(gm);const gs=new THREE.Mesh(box('gs',.05,.08,.2),blk);gs.position.set(0,-.02,.36);gun.add(gs);up.add(gun);
  tor.userData.part=vest.userData.part='body';hd.userData.part=hm.userData.part='head';g.userData.J={L,R,AL,AR,up,gun,ph:rn()*6};return g;}
// animation: walk / run cycles, crouch, recoil; nothing once dead
function animMan(u,dt,spd){const J=u.m.userData.J;if(!J||!u.alive||J.sit)return;if(u.crawl||u.wounded){u.m.rotation.x=-1.35;J.ph+=dt*4;J.L.hip.rotation.x=Math.sin(J.ph)*.4;J.R.hip.rotation.x=-Math.sin(J.ph)*.4;return;}else if(u.m.rotation.x)u.m.rotation.x=0;const run=spd>3.5,cr=u.crouch&&spd<.5;J.ph+=dt*(run?11:spd>.3?7:0);const sw=spd>.3?Math.sin(J.ph)*(run?.75:.45):0;
  J.L.hip.rotation.x=cr?-1.2:sw;J.R.hip.rotation.x=cr?-.4:-sw;J.L.kn.rotation.x=cr?1.9:Math.max(0,-Math.sin(J.ph))*.8*(spd>.3?1:0);J.R.kn.rotation.x=cr?1.0:Math.max(0,Math.sin(J.ph))*.8*(spd>.3?1:0);
  J.up.position.y=cr?-.42:run?-.05:0;J.up.rotation.x=run?-.18:0;J.L.hip.position.y=J.R.hip.position.y=cr?.6:.92;J.L.hip.position.z=cr?-.15:0;
  J.rec=Math.max(0,(J.rec||0)-dt*6);J.gun.position.z=-.28+J.rec*.08;J.AR.rotation.x=-1.25+J.rec*.15;}
// v387: vehicle models by family, from the vehicle's name: Soviet / Russian-pattern (low rounded turret, ERA bricks,
// sharp-nosed BMP, eight-wheeled BTR) or Western-pattern (angular turret with a bustle, skirts, boxy IFV, Stryker-type
// eight-wheeler). Hulls are built from their side profile (sloped glacis), on road wheels, sprockets and tracks.
function famOf(name){return/T-\d|BMP|BTR|BMD|ZBD|ZSL|Type 9|PT-91|BMP|MT-LB/i.test(name||'')?'SOV':'WEST';}
function camo(side){const base=side===S.me?[0x4e5a3c,0x56603f,0x4a553a]:[0x6a5a3a,0x5e5640,0x6b6248];return MT(vary(base[(rn()*base.length)|0],.04));}
function prism(pts,width,m){const sh=new THREE.Shape();pts.forEach(([z,y],i)=>i?sh.lineTo(z,y):sh.moveTo(z,y));const g=new THREE.ExtrudeGeometry(sh,{depth:width,bevelEnabled:false});g.translate(0,0,-width/2);g.rotateY(Math.PI/2);return new THREE.Mesh(g,m);}
function running(g,len,w,nW,r,dk,skirt,m){for(const sx of[-1,1]){const tr=new THREE.Mesh(new THREE.BoxGeometry(.62,.16,len),dk);tr.position.set(sx*(w/2-.31),.08,0);g.add(tr);const tt=tr.clone();tt.position.y=r*2+.05;g.add(tt);
    for(let i=0;i<nW;i++){const wh=new THREE.Mesh(GE('rw'+r,()=>new THREE.CylinderGeometry(r,r,.5,12)),dk);wh.rotation.z=Math.PI/2;wh.position.set(sx*(w/2-.31),r+.05,-len/2+.6+i*(len-1.2)/(nW-1));g.add(wh);}
    for(const z of[-len/2+.25,len/2-.25]){const sp=new THREE.Mesh(GE('sp',()=>new THREE.CylinderGeometry(.36,.36,.55,10)),dk);sp.rotation.z=Math.PI/2;sp.position.set(sx*(w/2-.31),r*2-.1,z);g.add(sp);}
    if(skirt){const sk=new THREE.Mesh(new THREE.BoxGeometry(.08,.55,len-.5),m);sk.position.set(sx*(w/2+.02),r*2-.05,0);g.add(sk);}}}
// v391: a catalogue of armoured vehicles by model (game values: armour factor against the family's plates, ERA type,
// active protection, ammunition layout, crew). Each side fields its country's own (equipment table) first, then others
// of its bloc. Models are built from a style: hull length and width, turret shape, fittings.
const VC={
  'T-72B3':{cls:'MBT',fam:'SOV',st:'T72',arm:.85,era:'K5',lay:'carousel',crew:3},'T-80BVM':{cls:'MBT',fam:'SOV',st:'T80',arm:.95,era:'RELIKT',lay:'carousel',crew:3},
  'T-90M':{cls:'MBT',fam:'SOV',st:'T90',arm:1.05,era:'RELIKT',aps:'ARENA-M',apsN:6,lay:'carousel',crew:3},'T-14 Armata':{cls:'MBT',fam:'SOV',st:'T14',arm:1.25,era:'MALACHIT',aps:'AFGANIT',apsN:10,lay:'capsule',crew:3},
  'BMPT-72 Terminator':{cls:'MBT',fam:'SOV',st:'BMPT',arm:.85,era:'RELIKT',lay:'carousel',crew:5,fs:1},
  'M1A2 SEPv3 Abrams':{cls:'MBT',fam:'WEST',st:'M1',arm:1.1,aps:'TROPHY',apsN:8,lay:'bustle',crew:4},'Leopard 2A6':{cls:'MBT',fam:'WEST',st:'LEO',arm:1.0,lay:'bustle',crew:4},
  'Leopard 2A7':{cls:'MBT',fam:'WEST',st:'LEO',arm:1.1,aps:'TROPHY',apsN:6,lay:'bustle',crew:4},'Challenger 2':{cls:'MBT',fam:'WEST',st:'CR',arm:1.05,lay:'bins',crew:4},
  'Challenger 3':{cls:'MBT',fam:'WEST',st:'CR',arm:1.15,aps:'TROPHY',apsN:8,lay:'bustle',crew:4},'Leclerc':{cls:'MBT',fam:'WEST',st:'LEC',arm:1.0,lay:'bustle',crew:3},
  'K2 Black Panther':{cls:'MBT',fam:'WEST',st:'K2',arm:1.05,aps:'KAPS',apsN:6,lay:'bustle',crew:3},'K1A2':{cls:'MBT',fam:'WEST',st:'K1',arm:.95,lay:'bustle',crew:4},
  'Merkava IV':{cls:'MBT',fam:'WEST',st:'MERK',arm:1.1,aps:'TROPHY',apsN:8,lay:'merkava',crew:4},
  'BMP-2':{cls:'IFV',fam:'SOV',st:'BMP2'},'BMP-3':{cls:'IFV',fam:'SOV',st:'BMP3',arm:1.1},'BTR-82A':{cls:'APC',fam:'SOV',st:'BTR'},
  'M2A3 Bradley':{cls:'IFV',fam:'WEST',st:'BRAD',arm:1.1},'CV90':{cls:'IFV',fam:'WEST',st:'CV90',arm:1.15},'Puma':{cls:'IFV',fam:'WEST',st:'PUMA',arm:1.35},'Warrior':{cls:'IFV',fam:'WEST',st:'WAR'},
  'K21':{cls:'IFV',fam:'WEST',st:'K21'},'Marder':{cls:'IFV',fam:'WEST',st:'MARD',arm:.9},'Stryker':{cls:'APC',fam:'WEST',st:'STRY'},'Boxer':{cls:'APC',fam:'WEST',st:'BOXER',arm:1.3},'Rosomak':{cls:'APC',fam:'WEST',st:'KTO'}};
const BLOC={SOV:{MBT:['T-72B3','T-72B3','T-80BVM','T-90M','T-14 Armata','BMPT-72 Terminator'],IFV:['BMP-2','BMP-3','BMP-2'],APC:['BTR-82A']},
  WEST:{MBT:['M1A2 SEPv3 Abrams','Leopard 2A6','Leopard 2A7','Challenger 2','Challenger 3','Leclerc','K2 Black Panther','K1A2','Merkava IV'],IFV:['M2A3 Bradley','CV90','Puma','Warrior','K21','Marder'],APC:['Stryker','Boxer','Rosomak']}};
// a model for this side and class: the country's own equipment (by name) more often than not, else one of its bloc
function pickModel(side,cls){const N=side===S.me?S.N:S.EN,a3=side===S.me?S.cfg.a3:S.enA3,fam=famOf(N[cls==='MBT'?'MBT':cls]||'')==='SOV'||side==='R'?'SOV':'WEST';
  const own=String((EQ(a3||'')[cls==='MBT'?'MBT':cls])||'').split(/,\s*/).map(n=>Object.keys(VC).find(k=>{const a=k.toLowerCase().replace(/[^a-z0-9]/g,''),b=n.toLowerCase().replace(/[^a-z0-9]/g,'');return b&&(a.includes(b)||b.includes(a));})).filter(Boolean);
  if(own.length&&rn()<.65)return own[(rn()*own.length)|0];const L=BLOC[side==='R'?'SOV':fam][cls];return L[(rn()*L.length)|0];}
function famOf(name){if(VC[name])return VC[name].fam;return/T-\d|BMP|BTR|BMD|ZBD|ZSL|Type 9|PT-91|MT-LB/i.test(name||'')?'SOV':'WEST';}
// the fittings for active protection, by system
function apsFit(tu,kind,m,dk){const box=(w,h,d,x,y,z,mm)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mm||m);o.position.set(x,y,z);tu.add(o);return o;};
  if(kind==='TROPHY'){for(const sx of[-1,1]){box(.5,.5,.7,sx*1.75,.55,.2);box(.06,.35,.45,sx*1.95,.5,-.6,MT(0x2a2e2a));box(.06,.35,.45,sx*1.95,.5,1.0,MT(0x2a2e2a));}}
  else if(kind==='ARENA-M'){const mast=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.9,8),dk);mast.position.set(0,1.2,.6);tu.add(mast);box(.5,.3,.5,0,1.7,.6,MT(0x2a2e2a));for(let i=0;i<8;i++){const a=-1.6+i*.45;box(.18,.25,.18,Math.sin(a)*1.6,.45,-Math.cos(a)*1.4+.3);}}
  else if(kind==='AFGANIT'){for(const sx of[-1,1])for(let i=0;i<5;i++){const t=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.4,6),dk);t.rotation.z=Math.PI/2;t.position.set(sx*1.7,.25,-.9+i*.25);tu.add(t);}for(const sx of[-1,1])box(.04,.4,.5,sx*1.62,.85,-1.1,MT(0x2a2e2a));}
  else if(kind==='KAPS'){for(const sx of[-1,1]){box(.04,.38,.5,sx*1.7,.7,-.9,MT(0x2a2e2a));box(.04,.38,.5,sx*1.7,.7,1.0,MT(0x2a2e2a));box(.35,.3,.45,sx*1.5,.95,.1);}}}
function tankModel(side,name){name=name&&VC[name]?name:pickModel(side,'MBT');const vc=VC[name]||{fam:famOf(name),st:famOf(name)==='SOV'?'T72':'M1'},st=vc.st;
  const g=new THREE.Group(),m=camo(side),dk=MT(0x1d1f1c),fam=vc.fam;g.userData.fam=fam;g.userData.name=name;g.userData.vc=vc;
  const D={T72:[6.9,3.5,6],T80:[7.0,3.5,6],T90:[6.9,3.6,6],T14:[8.4,3.6,7],BMPT:[6.9,3.5,6],M1:[7.9,3.7,7],LEO:[7.7,3.7,7],CR:[8.3,3.5,6],LEC:[6.9,3.6,6],K2:[7.5,3.6,6],K1:[7.5,3.6,6],MERK:[7.6,3.7,6]}[st]||[7.4,3.6,6];
  const L=D[0],W=D[1];running(g,L,W,D[2],.36,dk,fam!=='SOV'||st==='T14',m);
  // hull: sloped glacis; Merkava has its engine in front (long sloped nose); T-80 a flat gas-turbine rear deck
  const hullP=st==='MERK'?[[-L/2,.6],[-L/2+.4,1.0],[-L/2+2.8,1.85],[L/2,1.85],[L/2,.6]]:fam==='SOV'?[[-L/2,.55],[-L/2+1.1,1.15],[-L/2+2.1,1.62],[L/2,st==='T80'?1.55:1.7],[L/2,.55]]:[[-L/2,.6],[-L/2+.6,1.25],[-L/2+1.9,1.75],[L/2-.2,1.8],[L/2,1.1],[L/2,.6]];
  g.add(prism(hullP,W-.3,m));
  const tu=new THREE.Group();tu.position.set(0,st==='MERK'?1.85:1.7,st==='MERK'?1.0:fam==='SOV'?.2:.4);g.add(tu);let gz=-2.3,gy=.5,cupX=.7,cupY=1.1;
  if(st==='T72'||st==='T80'||st==='T90'||st==='BMPT'){const dome=new THREE.Mesh(GE('dome',()=>new THREE.SphereGeometry(1,16,8,0,6.3,0,1.5)),m);dome.scale.set(st==='T90'?1.75:1.65,st==='BMPT'?.5:.62,1.85);tu.add(dome);
    if(st==='T90'){tu.add(prism([[-1.9,0],[-1.5,.62],[1.2,.62],[1.2,0]],2.9,m));}   // T-90M: welded turret with a bustle
    if(st!=='BMPT')for(const sx of[-1,1])for(let i=0;i<4;i++){const b=new THREE.Mesh(GE('era',()=>new THREE.BoxGeometry(.32,.22,.18)),m);b.position.set(sx*(.45+i*.3),.25,-1.45+i*.18);b.rotation.y=sx*.5;tu.add(b);}
    for(let i=0;i<6;i++){const b=new THREE.Mesh(GE('era',()=>new THREE.BoxGeometry(.32,.22,.18)),m);b.position.set(-1.25+i*.5,1.66,-L/2+1.55);b.rotation.x=-.9;g.add(b);}
    gz=-1.6;cupX=-.55;cupY=.75;if(st==='T80'){const ex=new THREE.Mesh(new THREE.BoxGeometry(2,.25,.8),dk);ex.position.set(0,1.6,L/2-.5);g.add(ex);}}
  else if(st==='T14'){tu.add(prism([[-2.0,0],[-2.2,.5],[-1.4,.95],[1.6,.95],[1.9,.4],[1.6,0]],2.9,m));gz=-2.1;gy=.55;cupX=.6;cupY=1.05;}
  else if(st==='M1'){tu.add(prism([[-2.3,0],[-2.45,.4],[-1.8,.85],[2.6,.85],[2.9,.35],[2.6,0]],3.4,m));const rws=new THREE.Mesh(new THREE.BoxGeometry(.4,.35,.6),dk);rws.position.set(.75,1.15,.2);tu.add(rws);}
  else if(st==='LEO'){tu.add(prism([[-1.9,0],[-2.0,.85],[2.3,.85],[2.5,.3],[2.3,0]],3.2,m));for(const sx of[-1,1]){const w=prism([[0,0],[-1.3,.4],[-1.3,.85],[0,.85]],1.4,m);w.position.set(sx*.8,0,-1.9);tu.add(w);}gz=-2.4;}   // the 2A6 / 2A7 arrowhead wedges
  else if(st==='CR'){tu.add(prism([[-2.1,0],[-2.1,.75],[-1.6,.9],[2.0,.9],[2.0,0]],3.0,m));gz=-2.2;}
  else if(st==='LEC'){tu.add(prism([[-1.8,0],[-1.9,.8],[2.4,.8],[2.4,0]],2.8,m));gz=-2.1;}
  else if(st==='K2'||st==='K1'){tu.add(prism([[-2.0,0],[-2.2,.45],[-1.6,.85],[2.2,.85],[2.5,.35],[2.2,0]],3.2,m));gz=-2.3;}
  else if(st==='MERK'){tu.add(prism([[-2.6,0],[-2.8,.25],[-1.2,.85],[1.6,.85],[2.2,.5],[2.4,0]],3.0,m));gz=-2.9;const ch=new THREE.Mesh(new THREE.BoxGeometry(3.2,.06,.3),dk);ch.position.set(0,.2,2.3);tu.add(ch);}
  const gun=new THREE.Group();gun.position.set(0,gy,gz);tu.add(gun);
  if(st==='BMPT'){for(const sx of[-1,1]){const c=new THREE.Mesh(GE('ib',()=>new THREE.CylinderGeometry(.06,.07,2.4,8)),dk);c.rotation.x=Math.PI/2;c.position.set(sx*.25,.1,-1.2);gun.add(c);const at=new THREE.Mesh(new THREE.BoxGeometry(.35,.35,1.6),m);at.position.set(sx*1.3,.6,.3);tu.add(at);}}
  else{const mant=new THREE.Mesh(new THREE.BoxGeometry(.7,.55,.5),m);gun.add(mant);const br=new THREE.Mesh(GE('br',()=>new THREE.CylinderGeometry(.08,.11,5.4,10)),dk);br.rotation.x=Math.PI/2;br.position.z=-2.8;gun.add(br);
    const fe=new THREE.Mesh(GE('fe',()=>new THREE.CylinderGeometry(.15,.15,.6,10)),dk);fe.rotation.x=Math.PI/2;fe.position.z=-2.3;gun.add(fe);}
  const cup=new THREE.Mesh(GE('cup',()=>new THREE.CylinderGeometry(.3,.33,.3,10)),m);cup.position.set(cupX,cupY,.4);if(st!=='T14')tu.add(cup);const mg=new THREE.Mesh(GE('mg',()=>new THREE.BoxGeometry(.06,.08,.9)),dk);mg.position.set(cup.position.x,cup.position.y+.25,cup.position.z-.4);tu.add(mg);
  if(st!=='T14'){const cm=new THREE.Group(),uni=MT(vary(PAL[side===S.me?'F':'E'][0],.05));const tb=new THREE.Mesh(GE('ct',()=>new THREE.BoxGeometry(.38,.42,.26)),uni);tb.position.y=.21;cm.add(tb);const hd=new THREE.Mesh(GE('hd',()=>new THREE.SphereGeometry(.12,8,6)),MT(SKIN[(rn()*SKIN.length)|0]));hd.position.y=.55;cm.add(hd);
    const hm=new THREE.Mesh(GE('hm',()=>new THREE.SphereGeometry(.15,10,6,0,6.3,0,1.45)),MT(0x3a3d34));hm.position.y=.58;cm.add(hm);cm.position.copy(cup.position).add(new V3(0,.12,0));tu.add(cm);g.userData.cmdr=cm;}
  for(const sx of[-1,1])for(let i=0;i<4;i++){const sd=new THREE.Mesh(GE('sd',()=>new THREE.CylinderGeometry(.06,.06,.3,6)),dk);sd.rotation.x=1.2;sd.position.set(sx*(1.15+i*.1),fam==='SOV'?.55:.8,(fam==='SOV'?-.6:-1)+i*.12);tu.add(sd);}
  if(vc.aps)apsFit(tu,vc.aps,m,dk);
  const rack=new THREE.Mesh(new THREE.BoxGeometry(W-.4,.35,.5),MT(0x3d3a30));rack.position.set(0,1.85,L/2-.4);g.add(rack);
  g.userData.tu=tu;g.userData.gun=null;g.userData.tgun=gun;return g;}
function vehicle(kind,col){const side=kind==='EIFV'||col===0x6a5a3a?S.en:S.me,ifv=kind==='IFV'||kind==='EIFV';const name=pickModel(side,ifv?'IFV':'APC');const vc=VC[name]||{},st=vc.st,fam=famOf(name);
  const g=new THREE.Group(),m=camo(side),dk=MT(0x1d1f1c);g.userData.fam=fam;g.userData.name=name;g.userData.vc=vc;
  if(ifv){const L=st==='BMP3'?7.1:st==='BRAD'||st==='PUMA'?6.6:st==='CV90'?6.8:6.5,W=st==='PUMA'?3.6:3.2;running(g,L,W,6,.32,dk,fam!=='SOV',m);
    const P=fam==='SOV'?(st==='BMP3'?[[-L/2,.5],[-L/2+1.5,1.25],[-L/2+1.8,1.75],[L/2,1.85],[L/2,.5]]:[[-L/2,.5],[-L/2+1.6,1.2],[-L/2+1.9,1.55],[L/2,1.65],[L/2,.5]]):st==='CV90'?[[-L/2,.55],[-L/2+1.0,1.6],[-L/2+1.6,1.95],[L/2,1.9],[L/2,.55]]:st==='PUMA'?[[-L/2,.6],[-L/2+.9,1.7],[L/2,1.9],[L/2,.6]]:[[-L/2,.55],[-L/2+.7,1.5],[-L/2+1.4,2.0],[L/2,2.0],[L/2,.55]];
    g.add(prism(P,W-.2,m));const tu=new THREE.Group();tu.position.set(0,P[P.length-2][1]-.05,fam==='SOV'?.1:-.2);g.add(tu);
    const tt=new THREE.Mesh(fam==='SOV'?GE('it',()=>new THREE.CylinderGeometry(.9,1.05,.55,10)):new THREE.BoxGeometry(st==='PUMA'?1.6:1.9,.65,2.2),m);tt.position.y=.3;tu.add(tt);
    const b=new THREE.Mesh(GE('ib',()=>new THREE.CylinderGeometry(.06,.07,2.4,8)),dk);b.rotation.x=Math.PI/2;b.position.set(0,.4,-1.8);tu.add(b);
    if(st==='BMP3'){const b2=new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,1.6,8),dk);b2.rotation.x=Math.PI/2;b2.position.set(.25,.45,-1.4);tu.add(b2);}
    if(st==='BRAD'){const tow=new THREE.Mesh(new THREE.BoxGeometry(.5,.4,1.2),m);tow.position.set(-1.1,.45,.1);tu.add(tow);}
    g.userData.tu=tu;g.userData.gun=b;}
  else{const L=st==='BOXER'?7.9:7,W=st==='BOXER'?3:2.9,Hh=st==='BOXER'?2.4:2.1;g.add(prism([[-L/2,.9],[-L/2+1.2,Hh-.2],[L/2,Hh],[L/2,.9]],W,m));for(const sx of[-1,1])for(let i=0;i<4;i++){const wh=new THREE.Mesh(GE('ww',()=>new THREE.CylinderGeometry(.55,.55,.45,14)),dk);wh.rotation.z=Math.PI/2;wh.position.set(sx*1.5,.55,-2.5+i*1.55);g.add(wh);}
    const rw=new THREE.Mesh(new THREE.BoxGeometry(.8,.4,.9),m);rw.position.set(fam==='SOV'?0:.6,Hh+.2,-.6);g.add(rw);g.userData.gun=null;}
  return g;}
function tank(side,col){return tankModel(side,null);}
function helo(col){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:col});const b=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,7),m);b.position.y=1.6;g.add(b);
  const tb=new THREE.Mesh(new THREE.BoxGeometry(.5,.6,7),m);tb.position.set(0,2.2,-6.5);g.add(tb);const r=new THREE.Mesh(new THREE.BoxGeometry(15,.08,.5),new THREE.MeshLambertMaterial({color:0x111111}));r.position.y=3.2;g.add(r);g.userData.rotor=r;return g;}
function plane(){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:0x5a6458});const f=new THREE.Mesh(new THREE.CylinderGeometry(2,2,30,10),m);f.rotation.x=Math.PI/2;g.add(f);
  const w=new THREE.Mesh(new THREE.BoxGeometry(40,.6,4),m);w.position.y=1.5;g.add(w);const t=new THREE.Mesh(new THREE.BoxGeometry(.5,7,4),m);t.position.set(0,4,14);g.add(t);return g;}

function build(cfg){const LOC=cfg.loc||{pop:3000};const GR=LOC.pop>5e5?5:LOC.pop>5e4?4:LOC.pop>5e3?3:2,FLMAX=LOC.pop>5e5?6:LOC.pop>5e4?4:3;const cv=document.createElement('canvas');cv.id='infCv';cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:9980;cursor:crosshair';document.body.appendChild(cv);
  const hud=document.createElement('div');hud.id='infHud';hud.style.cssText='position:fixed;inset:0;z-index:9981;pointer-events:none;font:13px/1.4 "B612 Mono",monospace;color:#e2efe6;text-shadow:0 1px 2px #000';
  hud.innerHTML='<div id="iX" style="position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px;border:1px solid rgba(255,255,255,.7);border-radius:50%"></div>'+
   '<div id="iHit" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:20px;color:#fff;opacity:0">✕</div>'+
   '<div id="iTop" style="display:none;position:absolute;top:10px;left:50%;transform:translateX(-50%);text-align:center"></div><div id="iBL" style="position:absolute;left:16px;bottom:14px"></div>'+
   '<div id="iBR" style="position:absolute;right:16px;bottom:14px;text-align:right"></div><div id="iMsg" style="position:absolute;top:30%;width:100%;text-align:center;font-size:18px;letter-spacing:.1em"></div>'+
   '<div id="iScope" style="display:none;position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,transparent 0 33vh,#000 33.3vh);"><div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:#000"></div><div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#000"></div></div>'+
   '<div id="iDmg" style="position:absolute;inset:0;background:radial-gradient(transparent 50%,rgba(160,0,0,.6));opacity:0"></div>';document.body.appendChild(hud);
  const WM=!!cfg.world;let R=null,sc,cam,ter=null;const DET={win:[],chim:[],bal:[],fence:[],car:[],tree:[]};
  if(WM){cv.style.background='transparent';sc=new THREE.Group();sc.position.copy(cfg.O);scene.add(sc);cam=camera;}
  else{try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true});R.setPixelRatio(Math.min(1.25,devicePixelRatio||1));R.setSize(innerWidth,innerHeight,false);}catch(e){R=null;}
  const E=envFor(cfg);cfg.env=E;sc=new THREE.Scene();sc.background=new THREE.Color(E.sky);sc.fog=new THREE.Fog(E.sky,E.fog[0],E.fog[1]);sc.add(new THREE.HemisphereLight(0xdfeeff,0x4a5038,E.hem));const sun=new THREE.DirectionalLight(E.sunc,E.sun);sun.position.set(200,E.low?80:400,100);sc.add(sun);
  cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,3000);
  const tg=new THREE.PlaneGeometry(2400,2400,200,200);tg.rotateX(-Math.PI/2);const pa=tg.attributes.position;for(let i=0;i<pa.count;i++)pa.setY(i,HF(pa.getX(i),pa.getZ(i)));tg.computeVertexNormals();
  ter=new THREE.Mesh(tg,new THREE.MeshLambertMaterial({color:vary(E.g,.03)}));sc.add(ter);}
  const solid=ter?[ter]:[],bm=new THREE.MeshLambertMaterial({color:0xa49a86});
  const village=new V3(0,0,-260);const boxes=[];
  // a town on a street grid: houses of one to three storeys, hollow, with doors, windows, floors and stairs
  const wallM=[0xa49a86,0x9a8a74,0xb6aa92,0x8c8478,0xd8cfb8,0xc9b27a,0x8a4a3a,0x9a9a96,0xb8c4c8,0xa8b48e,0xd6b8a0,0x7e6e62].map(c=>new THREE.MeshLambertMaterial({color:vary(c,.04)})),flM=new THREE.MeshLambertMaterial({color:0x6e6253}),RFS=[0x7a3a2e,0x5a5a5e,0x6b4a32,0x3e5a44,0x2e2e30,0x8a4a36].map(c=>new THREE.MeshLambertMaterial({color:c})),rfM=RFS[0];
  let CB=null;const BLD=[],STR=[];
  const box=(x0,y0,z0,x1,y1,z1,m,nos)=>{const g=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0),m);g.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);if(!CB){sc.add(g);solid.push(g);}const b={x0,y0,z0,x1,y1,z1,m:g,bid:CB?CB.id:null};boxes.push(b);if(CB){CB.parts.push(b);if(y1-y0>2.4&&!nos)CB.walls++;}return g;};
  const begin=(kind,x,z,w,d,fl)=>{CB={id:BLD.length,kind,x,z,w,d,fl,parts:[],walls:0,lost:0,down:false,sc,meshes:[]};BLD.push(CB);return CB;},done=()=>{const c=CB;CB=null;mergeB(c);return c;};
  const fuM=new THREE.MeshLambertMaterial({color:0x5a4a38}),fuM2=new THREE.MeshLambertMaterial({color:0x7a7468});
  // furniture on a floor: a table, a bed or sofa, shelves; kept clear of the door and the stairs
  const furnish=(x0,z0,x1,z1,y)=>{if(x1-x0<5||z1-z0<5)return;const cx=(x0+x1)/2+.7,cz=(z0+z1)/2;box(cx-.6,y,cz-.4,cx+.6,y+.75,cz+.4,fuM,1);
    box(x1-1.1,y,z0+.5,x1-.3,y+.5,z0+2.4,fuM2,1);box(x1-.6,y,cz+.6,x1-.25,y+1.8,cz+1.8,fuM,1);if(rn()<.5)box(cx-1.6,y,z0+.4,cx-.2,y+.9,z0+.9,fuM2,1);};
  function house(cx,cz,w,d,fl,mat,kind){begin(kind||(fl>3?'APARTMENTS':'HOUSE'),cx,cz,w,d,fl);const T=.3,SH=3,y0=Math.max(H(cx-w/2,cz-d/2),H(cx+w/2,cz-d/2),H(cx-w/2,cz+d/2),H(cx+w/2,cz+d/2),H(cx,cz))+.15,x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2;
    box(x0,y0-3,z0,x1,y0,z1,flM);// foundation and ground floor
    // a wall along x (at z) or along z (at x) with windows, and a door on the ground floor of the front (z1) wall
    const wall=(along,fixed,a0,a1,f,door)=>{const yb=y0+f*SH,L=a1-a0,n=Math.max(1,Math.floor(L/3.2)),seg=L/n;
      const put=(p0,p1,q0,q1)=>along==='x'?box(a0+p0,yb+q0,fixed-T/2,a0+p1,yb+q1,fixed+T/2,mat):box(fixed-T/2,yb+q0,a0+p0,fixed+T/2,yb+q1,a0+p1,mat);
      for(let i=0;i<n;i++){const s0=i*seg,s1=s0+seg,m=(s0+s1)/2,isDoor=door&&i===(n>>1),hw=isDoor?.65:.6;
        put(s0,m-hw,0,SH);put(m+hw,s1,0,SH);if(isDoor)put(m-hw,m+hw,2.2,SH);else{put(m-hw,m+hw,0,1);put(m-hw,m+hw,2.1,SH);DET.win.push(along,fixed,a0+m,yb+1.55,hw*2,1.1);}}};
    for(let f=0;f<fl;f++){wall('x',z1,x0,x1,f,f===0);wall('x',z0,x0,x1,f,f===0&&fl>1);wall('z',x0,z0+T/2,z1-T/2,f,false);wall('z',x1,z0+T/2,z1-T/2,f,false);
      if(f>0){// upper floor with a stair opening along the x0 wall
        box(x0+1.4,y0+f*SH-.2,z0,x1,y0+f*SH,z1,flM);if(d>6.8)box(x0,y0+f*SH-.2,z0,x0+1.4,y0+f*SH,z1-6.4,flM);}}
    // stairs: steps along the x0 wall up to each floor
    for(let f=1;f<fl;f++){const n=12,sd=6/n;for(let i=0;i<n;i++){const zz=z1-.4-(i+1)*sd;box(x0+.2,y0+(f-1)*SH,zz,x0+1.4,y0+(f-1)*SH+(i+1)*SH/n,zz+sd,flM);}}
    for(let f=0;f<fl;f++)furnish(x0+1.5,z0+.4,x1-.4,z1-.4,y0+f*SH);
    const rM=RFS[(rn()*RFS.length)|0];box(x0-.3,y0+fl*SH,z0-.3,x1+.3,y0+fl*SH+.3,z1+.3,rM);
    {const hy=y0+fl*SH+.3;if(fl<=3&&rn()<.7)DET.chim.push(x0+w*.25+rn()*w*.5,hy,z0+d*.3+rn()*d*.4,fl);if(fl>3)for(let f=1;f<fl;f++)DET.bal.push(cx,y0+f*SH,z1+.6,Math.min(w-2,6));if(fl<=2&&!WM){DET.fence.push(x0-3,x1+3,z0-3,z1+3);if(rn()<.6)DET.car.push(x1+2.2,z1+1.5,rn());if(rn()<.5)DET.tree.push(x0-1.8,z0-1.8);}}
    // a gabled roof on most houses up to three storeys (not walkable: it sits above the flat roof)
    if(fl<=3&&rn()<.75){const along=w>=d,sp=(along?d:w)+.8,len=(along?w:d)+.8,h=sp*.32,shp=new THREE.Shape();shp.moveTo(-sp/2,0);shp.lineTo(0,h);shp.lineTo(sp/2,0);shp.lineTo(-sp/2,0);
      const gg=new THREE.ExtrudeGeometry(shp,{depth:len,bevelEnabled:false});gg.translate(0,0,-len/2);if(along)gg.rotateY(Math.PI/2);const gm=new THREE.Mesh(gg,rM);gm.position.set(cx,y0+fl*SH+.3,cz);sc.add(gm);CB&&(CB.roof=gm);}
    // window sills on the front
    const sill=MT(0xd8d4c8);for(let f=0;f<fl;f++)for(let x=x0+1.6;x<x1-1;x+=3.2){const sl=new THREE.Mesh(GE('sill',()=>new THREE.BoxGeometry(1.3,.08,.18)),sill);sl.position.set(x,y0+f*SH+1,z1+.2);sc.add(sl);}
    done();return{x0,z0,x1,z1};}
  // a hall: warehouse, factory or church — one tall open room with columns, big doors, high windows; a church has a tower
  function hall(cx,cz,w,d,h,kind,mat){begin(kind,cx,cz,w,d,1);const T=.4,y0=Math.max(H(cx-w/2,cz-d/2),H(cx+w/2,cz+d/2),H(cx,cz))+.15,x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2;box(x0,y0-3,z0,x1,y0,z1,flM);
    const seg=(along,fixed,a0,a1,door)=>{const L=a1-a0,n=Math.max(1,Math.floor(L/5)),sl=L/n;for(let i=0;i<n;i++){const s0=a0+i*sl,s1=s0+sl,m=(s0+s1)/2,dr=door&&i===(n>>1),hw=dr?2:1;
      const put=(p0,p1,q0,q1)=>along==='x'?box(p0,y0+q0,fixed-T/2,p1,y0+q1,fixed+T/2,mat):box(fixed-T/2,y0+q0,p0,fixed+T/2,y0+q1,p1,mat);
      put(s0,m-hw,0,h);put(m+hw,s1,0,h);if(dr)put(m-hw,m+hw,4,h);else{put(m-hw,m+hw,0,h*.55);put(m-hw,m+hw,h*.8,h);}}};
    seg('x',z1,x0,x1,true);seg('x',z0,x0,x1,kind!=='CHURCH');seg('z',x0,z0+T/2,z1-T/2,false);seg('z',x1,z0+T/2,z1-T/2,false);
    for(let x=x0+5;x<x1-3;x+=6)for(let z=z0+5;z<z1-3;z+=6)box(x-.2,y0,z-.2,x+.2,y0+h,z+.2,flM,1);
    if(kind==='FACTORY')for(let i=0;i<3;i++){const x=x0+3+i*(w-6)/2;box(x-1,y0,cz-1.5,x+1,y0+1.6,cz+1.5,fuM2,1);}
    if(kind==='WAREHOUSE')for(let i=0;i<4;i++){const x=x0+3+i*(w-6)/3;box(x-.6,y0,z0+2,x+.6,y0+2.2,z0+5,fuM,1);}
    if(kind==='CHURCH'){for(let i=0;i<5;i++){const z=z0+3+i*2;box(cx-3,y0,z,cx-.6,y0+.6,z+.5,fuM,1);box(cx+.6,y0,z,cx+3,y0+.6,z+.5,fuM,1);}box(x0+1,y0,z0-5,x0+5,y0+h*2.2,z0,mat);}
    box(x0-.4,y0+h,z0-.4,x1+.4,y0+h+.4,z1+.4,rfM);done();}
  // fortifications: bunker (concrete, firing slits facing 'face' = -1 north / +1 south, door at the back), dugout
  // (earth walls, log roof, half sunk), command post (sandbagged hut, radio mast, map table)
  const conc=new THREE.MeshLambertMaterial({color:0x8a8a84}),earthM=new THREE.MeshLambertMaterial({color:0x5a4630}),logM=new THREE.MeshLambertMaterial({color:0x4a3a26}),sbM=new THREE.MeshLambertMaterial({color:0x8c7d5a});
  function bunker(cx,cz,face,side){const c=begin('BUNKER',cx,cz,6,5,1),y0=H(cx,cz)-.6,x0=cx-3,x1=cx+3,z0=cz-2.5,z1=cz+2.5,T=.8,fz=face<0?z0:z1,bz=face<0?z1:z0;
    box(x0,y0-1,z0,x1,y0,z1,conc);box(x0,y0,fz-T/2,x0+1.2,y0+2.4,fz+T/2,conc);box(x1-1.2,y0,fz-T/2,x1,y0+2.4,fz+T/2,conc);box(x0+1.2,y0,fz-T/2,x1-1.2,y0+1.3,fz+T/2,conc);box(x0+1.2,y0+1.7,fz-T/2,x1-1.2,y0+2.4,fz+T/2,conc);
    box(x0-T/2,y0,z0,x0+T/2,y0+2.4,z1,conc);box(x1-T/2,y0,z0,x1+T/2,y0+2.4,z1,conc);box(x0,y0,bz-T/2,cx-.6,y0+2.4,bz+T/2,conc);box(cx+.6,y0,bz-T/2,x1,y0+2.4,bz+T/2,conc);box(cx-.6,y0+2,bz-T/2,cx+.6,y0+2.4,bz+T/2,conc);
    box(x0-.4,y0+2.4,z0-.4,x1+.4,y0+3,z1+.4,conc);c.hp=2400;c.side=side;c.cx=cx;c.cz=cz;c.y0=y0;STR.push(c);done();return c;}
  function dugout(cx,cz,side){const c=begin('DUGOUT',cx,cz,5,4,1),y0=H(cx,cz)-1.2,x0=cx-2.5,x1=cx+2.5,z0=cz-2,z1=cz+2;
    box(x0,y0-.5,z0,x1,y0,z1,earthM);box(x0-.6,y0,z0-.6,x0,y0+2.3,z1,earthM);box(x1,y0,z0-.6,x1+.6,y0+2.3,z1,earthM);box(x0,y0,z0-.6,x1,y0+2.3,z0,earthM);box(x0,y0,z1,cx-.7,y0+2.3,z1+.6,earthM);box(cx+.7,y0,z1,x1,y0+2.3,z1+.6,earthM);
    for(let i=0;i<6;i++){const x=x0-.6+i*1.03;box(x,y0+2.3,z0-.6,x+.9,y0+2.6,z1+.6,logM,1);}box(x0-.8,y0+2.6,z0-.8,x1+.8,y0+3,z1+.8,earthM,1);box(cx-.6,y0,z0+.2,cx+.6,y0+.8,z0+.8,fuM,1);
    c.hp=1500;c.side=side;c.cx=cx;c.cz=cz;c.y0=y0;STR.push(c);done();return c;}
  function cpost(cx,cz,side){const c=begin('COMMAND POST',cx,cz,7,6,1),y0=H(cx,cz),x0=cx-3.5,x1=cx+3.5,z0=cz-3,z1=cz+3;
    box(x0,y0-.5,z0,x1,y0,z1,flM);box(x0,y0,z0,x1,y0+2.2,z0+.8,sbM);box(x0,y0,z0,x0+.8,y0+2.2,z1,sbM);box(x1-.8,y0,z0,x1,y0+2.2,z1,sbM);box(x0,y0,z1-.8,cx-.8,y0+2.2,z1,sbM);box(cx+.8,y0,z1-.8,x1,y0+2.2,z1,sbM);
    box(x0-.3,y0+2.2,z0-.3,x1+.3,y0+2.5,z1+.3,new THREE.MeshLambertMaterial({color:0x4d5a3a}));box(cx-1.2,y0,cz-.6,cx+1.2,y0+.8,cz+.6,fuM,1);box(x1-1.6,y0,z0+1,x1-.9,y0+1.1,z0+1.8,fuM2,1);
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.04,.06,9,5),new THREE.MeshLambertMaterial({color:0x333333}));mast.position.set(x1-1,y0+4.5,z0+1);sc.add(mast);
    c.hp=1600;c.side=side;c.cx=cx;c.cz=cz;c.y0=y0;c.mast=mast;STR.push(c);done();return c;}
  // v381: in the live world the town's real buildings near the battle (the flight world's blocks) are replaced by ones you
  // can enter, of the same footprint and height: houses, apartment blocks and towers, warehouses and factories
  const TZS=cfg.mis==='FRONT'?[-300,-470,-760,-1040,-430,-800]:cfg.mis==='DEFEND'?[-470,-505]:[];const nearTr=(z,d)=>TZS.some(t=>Math.abs(z-t)<d/2+9);   // v408: no house stands where a trench line runs
  let REAL=0;const hidden=[];
  if(WM&&window.WF&&WF.bldg&&WF.townMesh){const M0=new THREE.Matrix4(),Z=new THREE.Matrix4().makeScale(0,0,0),near0=WF.bldg.filter(b=>b[7]&&Math.hypot(b[0]-cfg.O.x,b[1]-(cfg.O.z-260))<700).sort((a,b)=>Math.hypot(a[0]-cfg.O.x,a[1]-cfg.O.z+260)-Math.hypot(b[0]-cfg.O.x,b[1]-cfg.O.z+260));
    // v397: the insertion routes (APC road from the south, helicopter approach from the south-west) are kept clear of buildings
    const segD=(x,z,ax,az,bx,bz)=>{const vx=bx-ax,vz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*vx+(z-az)*vz)/(vx*vx+vz*vz)));return Math.hypot(x-ax-vx*t,z-az-vz*t);};
    const onRoute=b=>{const x=b[0]-cfg.O.x,z=b[1]-cfg.O.z,r=Math.max(b[3],b[4])*.75+8;return segD(x,z,0,720,0,150)<r||segD(x,z,-520,720,0,150)<r;};
    for(const b of near0)if(onRoute(b)){WF.townMesh.getMatrixAt(b[6],M0);hidden.push([b,M0.clone()]);WF.townMesh.setMatrixAt(b[6],Z);}
    for(const b of near0)if(!onRoute(b)&&nearTr(b[1]-cfg.O.z,Math.max(b[3],b[4]))){WF.townMesh.getMatrixAt(b[6],M0);hidden.push([b,M0.clone()]);WF.townMesh.setMatrixAt(b[6],Z);b._tr=1;}
    const near=near0.filter(b=>!onRoute(b)&&!b._tr).slice(0,140);
    // every other plain block within 3 km is solid: you, the enemy and vehicles cannot walk or drive through it
    {const NS=new Set(near);for(const b of WF.bldg){if(!b[7]||NS.has(b))continue;const x=b[0]-cfg.O.x,z=b[1]-cfg.O.z;if(Math.abs(x)>3000||Math.abs(z)>3000)continue;if(Math.hypot(b[0]-cfg.O.x,b[1]-(cfg.O.z-260))<700&&onRoute(b))continue;
      const e=Math.max(b[3],b[4])*.55;boxes.push({x0:x-e,y0:b[2]-1,z0:z-e,x1:x+e,y1:b[2]-1+b[5],z1:z+e,m:null,wb:b});}}
    for(const b of near){WF.townMesh.getMatrixAt(b[6],M0);hidden.push([b,M0.clone()]);WF.townMesh.setMatrixAt(b[6],Z);const x=b[0]-cfg.O.x,z=b[1]-cfg.O.z,w=Math.max(7,Math.min(40,b[3])),d=Math.max(7,Math.min(40,b[4])),h=b[5];
      if(w*d>350&&h<12)hall(x,z,w,d,Math.max(6,h),rn()<.5?'WAREHOUSE':'FACTORY',wallM[3]);else house(x,z,Math.round(w),Math.round(d),Math.max(1,Math.min(8,Math.round(h/3))),wallM[(rn()*wallM.length)|0],h>15?'APARTMENTS':'HOUSE');REAL++;}
    WF.townMesh.instanceMatrix.needsUpdate=true;if(REAL<8)REAL=0;}
  const lots=[];for(let gx=-GR;gx<=GR;gx++)for(let gz=-GR;gz<=GR;gz++){if(nearTr(village.z+gz*30,22))continue;if(rn()<.18&&!(gx===GR&&gz===-GR))continue;const cx=village.x+gx*30+(rn()-.5)*4,cz=village.z+gz*30+(rn()-.5)*4;if(Math.abs(gx)<1&&Math.abs(gz)<1)continue;
    const cen=1-Math.max(Math.abs(gx),Math.abs(gz))/(GR+1),w=8+rn()*6+(FLMAX>4?cen*6:0),d=8+rn()*6+(FLMAX>4?cen*6:0),fl=1+((rn()*Math.max(1,FLMAX*cen+1))|0);if(gx===GR&&gz===-GR&&!REAL)hall(cx,cz,16,24,7,'CHURCH',wallM[2]);else if(Math.abs(gx)===GR&&rn()<.35&&!REAL)hall(cx,cz,18,22,8,rn()<.5?'WAREHOUSE':'FACTORY',wallM[3]);else if(!REAL)lots.push(house(cx,cz,Math.round(w),Math.max(8,Math.round(d)),fl,wallM[(rn()*wallM.length)|0]));}
  // streets
  const stM=new THREE.MeshLambertMaterial({color:0x55524c});for(let k=-GR;k<=GR;k++){for(const ax of['x','z']){const g=new THREE.Mesh(new THREE.PlaneGeometry(ax==='x'?GR*60+30:5,ax==='x'?5:GR*60+30),stM);g.rotation.x=-Math.PI/2;g.position.set(village.x+(ax==='z'?k*30+15:0),H(village.x,village.z)+.05,village.z+(ax==='x'?k*30+15:0));}}
  const blds=boxes;
  const trm=new THREE.MeshLambertMaterial({color:0x2f4a26});for(let i=0;i<(WM?0:700);i++){const x=(rn()-.5)*2200,z=(rn()-.5)*2200;if(Math.hypot(x-village.x,z-village.z)<GR*32+40||(cfg.mis==='DEFEND'&&Math.abs(z+470)<40&&Math.abs(x)<200)||(cfg.mis==='FRONT'&&[-300,-470,-760,-1040].some(L=>Math.abs(z-L)<40)&&Math.abs(x)<200))continue;const t=new THREE.Mesh(new THREE.ConeGeometry(2.5,8,6),trm);t.position.set(x,H(x,z)+4,z);sc.add(t);}
  // DEFEND: a zig-zag trench line north of the town: earth parapet (stops rounds), sandbags, rear wall, dugouts
  // FRONT: four trench lines across the field — two of ours (an older one behind), two of theirs; each a zig-zag with a
  // parapet toward its enemy, a lower rear wall and duckboards; the slots are where riflemen stand
  TR.L=[];TR.G=[];TR.O={x:WM?cfg.O.x:0,z:WM?cfg.O.z:0};const XS=WM?5000:1150;   // v412: in the live world a trench line runs 10 km along the front
  const lines=[];if(cfg.mis==='FRONT'){for(const[TZ,face,own]of[[-300,-1,'F'],[-470,-1,'F'],[-760,1,'E'],[-1040,1,'E']])lines.push(trLine(sc,TZ,face,own,-XS,XS,own==='E'?0x7a7258:0x8c7d5a));
    trDitch(sc,-430,-XS,XS,-1);trDitch(sc,-800,-XS,XS,1);}
  const trench=[];if(cfg.mis==='DEFEND'){const L=trLine(sc,-470,-1,'F',-XS,XS);for(const t of L.slots)if(Math.abs(t.x)<200)trench.push(t);trDitch(sc,-505,-XS,XS,-1);}
  trSync();if(ter)trHole(ter.material);if(WM){try{if(window.TERRAIN)trHole(TERRAIN.material);scene.traverse(o=>{if(o.isMesh&&o.geometry&&o.geometry.attributes.position&&o.geometry.attributes.position.count>20000&&o!==ter&&!o.isInstancedMesh)trHole(o.material);});}catch(e){}}

  if(cfg.mis==='FRONT'){dugout(-40,-462,'F');dugout(40,-462,'F');cpost(0,-400,'F');bunker(-90,-757,1,'E');bunker(90,-757,1,'E');dugout(0,-1048,'E');cpost(30,-1150,'E');}
  else if(cfg.mis==='DEFEND'){bunker(-90,-472,-1,'F');bunker(90,-472,-1,'F');dugout(-40,-462,'F');dugout(40,-462,'F');cpost(0,-420,'F');cpost(30,-1050,'E');bunker(-60,-1020,1,'E');}
  else{const c=village;for(let a=0;a<8;a++){const an=a*Math.PI/4,x=c.x+Math.cos(an)*38,z=c.z+Math.sin(an)*38;if(Math.abs(Math.sin(an))>.5){box(x-4,H(x,z)-.3,z-.5,x+4,H(x,z)+1.3,z+.5,sbM);}else box(x-.5,H(x,z)-.3,z-4,x+.5,H(x,z)+1.3,z+4,sbM);}
    bunker(c.x-25,c.z+30,1,'E');bunker(c.x+28,c.z+28,1,'E');dugout(c.x+8,c.z-30,'E');cpost(c.x-8,c.z-14,'E');cpost(0,300,'F');}
  // vegetation: bushes across the field (instanced), grass tufts around you (re-centred as you move, see grassStep)
  const inB=(x,z)=>boxes.some(b=>x>b.x0-1&&x<b.x1+1&&z>b.z0-1&&z<b.z1+1);
  const bush=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshLambertMaterial({color:0x35552a}),900);bush.count=0;sc.add(bush);
  const gq=new THREE.PlaneGeometry(.22,.5);gq.translate(0,.25,0);const grM=new THREE.MeshLambertMaterial({color:0x5f7d3a,emissive:0x1c2a10,side:THREE.DoubleSide});const grass=new THREE.InstancedMesh(gq,grM,4500);grass.frustumCulled=false;sc.add(grass);grass.count=0;
  village.y=H(village.x,village.z);const flag=new THREE.Mesh(new THREE.CylinderGeometry(25,25,.3,32,1,true),new THREE.MeshBasicMaterial({color:0xffe14a,transparent:true,opacity:.25,side:THREE.DoubleSide}));flag.position.copy(village).setY(village.y+.4);sc.add(flag);
  // first-person weapons held in view, one model per kind
  const vmRoot=new THREE.Group();(WM?scene:sc).add(vmRoot);
  const gm=new THREE.MeshLambertMaterial({color:0x26282a}),gm2=new THREE.MeshLambertMaterial({color:0x4a4232}),vms={};
  const mk=(parts)=>{const g=new THREE.Group();for(const[w,h,d,x,y,z,m,cyl]of parts){const o=cyl?new THREE.Mesh(new THREE.CylinderGeometry(w,w,d,8),m||gm):new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||gm);if(cyl)o.rotation.x=Math.PI/2;o.position.set(x,y,z);g.add(o);}g.visible=false;g.scale.setScalar(.7);vmRoot.add(g);return g;};
  vms.rifle=mk([[.07,.11,.62,0,0,0],[.015,0,.4,0,.02,-.5,0,1],[.05,.16,.08,0,-.12,-.08],[.06,.1,.25,0,-.02,.4]]);
  vms.carb=mk([[.07,.11,.5,0,0,0],[.015,0,.25,0,.02,-.37,0,1],[.05,.15,.08,0,-.12,-.05],[.05,.08,.22,0,-.02,.34]]);
  vms.smg=mk([[.07,.1,.38,0,0,0],[.014,0,.16,0,.02,-.27,0,1],[.04,.2,.06,0,-.14,-.05],[.04,.05,.2,0,0,.27]]);
  vms.shot=mk([[.07,.1,.55,0,0,0],[.024,0,.5,0,.02,-.5,0,1],[.03,0,.3,0,-.05,-.45,gm2,1],[.06,.12,.28,0,-.05,.4,gm2]]);
  vms.lmg=mk([[.09,.13,.7,0,0,0],[.018,0,.5,0,.02,-.58,0,1],[.12,.14,.14,-.07,-.1,-.05,gm2],[.07,.11,.26,0,-.02,.45],[.01,.2,.01,.05,-.12,-.75]]);
  vms.dmr=mk([[.07,.11,.7,0,0,0],[.016,0,.5,0,.02,-.58,0,1],[.03,0,.24,0,.1,-.05,0,1],[.05,.15,.08,0,-.12,-.08],[.06,.12,.28,0,-.02,.45,gm2]]);
  vms.snp=mk([[.07,.1,.8,0,0,0,gm2],[.016,0,.6,0,.02,-.68,0,1],[.035,0,.34,0,.11,-.05,0,1],[.06,.14,.3,0,-.03,.5,gm2]]);
  vms.pistol=mk([[.04,.08,.2,0,0,-.05],[.035,.12,.05,0,-.08,.03]]);
  vms.tube=mk([[.06,0,1,0,.02,0,gm2,1],[.04,.12,.05,0,-.08,.1],[.08,0,.2,0,.02,-.55,gm2,1]]);
  // iron sights: rear aperture posts and a front post; aiming lines them up on the centre of the view
  const sm=new THREE.MeshBasicMaterial({color:0x101010});const sights=(g,fz,y)=>{for(const x of[-.014,.014]){const r=new THREE.Mesh(new THREE.BoxGeometry(.008,.03,.012),sm);r.position.set(x,y,.12);g.add(r);}
    const f=new THREE.Mesh(new THREE.BoxGeometry(.005,.026,.006),sm);f.position.set(0,y-.002,fz);g.add(f);const h=new THREE.Mesh(new THREE.BoxGeometry(.04,.006,.01),sm);h.position.set(0,y-.014,.12);g.add(h);g.userData.sy=y;};
  sights(vms.rifle,-.66,.085);sights(vms.carb,-.48,.083);sights(vms.smg,-.33,.078);sights(vms.shot,-.72,.07);sights(vms.lmg,-.8,.095);sights(vms.pistol,-.14,.055);vms.dmr.userData.sy=.1;vms.tube.userData.sy=.09;
  townDetail(sc,DET,village,typeof GR!=='undefined'?GR:3,WM);TDET=DET;
  const vm=new THREE.Group();
  return{cv,hud,R,sc,cam,ter,solid,blds,village,flag,vm,vms,trench,lines,vmRoot,WM,BLD,STR,hidden,grass,inB,bush,townR:REAL?0:GR*30+22};}

/* v407: TOWN DETAIL, batched into a few instanced meshes: glass and frames in every window, chimneys, balconies on
   apartment blocks, garden fences, parked cars, yard trees; along the streets lamp posts, power poles with lines and
   benches. None of it blocks movement or bullets except the cars (a low box), and none of it costs a draw call each. */
let TDET=null;
// a fallen building takes its windows, frames, chimneys and balconies with it
function detailGone(b){const D=TDET;if(!D||!D.ims)return;const Z=new THREE.Matrix4().makeScale(0,0,0),inB=(x,z)=>Math.abs(x-b.x)<b.w/2+.8&&Math.abs(z-b.z)<b.d/2+1.5;
  const W=D.win;for(let i=0,k=0;i<W.length;i+=6,k++){const[al,fx,c]=W.slice(i,i+3);const x=al==='x'?c:fx,z=al==='x'?fx:c;if(!inB(x,z))continue;if(D.ims.glass)D.ims.glass.setMatrixAt(k,Z);if(D.ims.frame){D.ims.frame.setMatrixAt(k*2,Z);D.ims.frame.setMatrixAt(k*2+1,Z);}}
  for(let i=0,k=0;i<D.chim.length;i+=4,k++)if(inB(D.chim[i],D.chim[i+2])&&D.ims.chim)D.ims.chim.setMatrixAt(k,Z);
  for(let i=0,k=0;i<D.bal.length;i+=4,k++)if(inB(D.bal[i],D.bal[i+2])){if(D.ims.bal)D.ims.bal.setMatrixAt(k,Z);if(D.ims.bal2)D.ims.bal2.setMatrixAt(k,Z);}
  for(const m of Object.values(D.ims))if(m)m.instanceMatrix.needsUpdate=true;}
function townDetail(sc,D,village,GR,WM){const M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0),V=new THREE.Vector3(),Sc=new THREE.Vector3();
  const inst=(geo,mat,n,fill)=>{if(!n)return null;const im=new THREE.InstancedMesh(geo,mat,n);let k=0;fill((p,r,s)=>{Q.setFromAxisAngle(Y,r||0);M4.compose(p,Q,s||Sc.set(1,1,1));im.setMatrixAt(k++,M4);});im.count=k;im.instanceMatrix.needsUpdate=true;sc.add(im);return im;};
  const W=D.win;const nW=W.length/6;
  D.ims={};D.ims.glass=inst(new THREE.PlaneGeometry(1,1),new THREE.MeshLambertMaterial({color:0x8fb0c4,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false}),nW,put=>{for(let i=0;i<W.length;i+=6){const[al,fx,c,y,w,h]=W.slice(i,i+6);put(al==='x'?V.set(c,y,fx):V.set(fx,y,c),al==='x'?0:Math.PI/2,new THREE.Vector3(w,h,1));}});
  D.ims.frame=inst(new THREE.BoxGeometry(1,.08,.12),new THREE.MeshLambertMaterial({color:0xe6e0d2}),nW*2,put=>{for(let i=0;i<W.length;i+=6){const[al,fx,c,y,w,h]=W.slice(i,i+6);for(const dy of[-h/2,h/2])put(al==='x'?V.set(c,y+dy,fx):V.set(fx,y+dy,c),al==='x'?0:Math.PI/2,new THREE.Vector3(w+.16,1,1));}});
  D.ims.chim=inst(new THREE.BoxGeometry(.7,1.4,.7),new THREE.MeshLambertMaterial({color:0x7a5444}),D.chim.length/4,put=>{for(let i=0;i<D.chim.length;i+=4)put(V.set(D.chim[i],D.chim[i+1]+1.6,D.chim[i+2]));});
  D.ims.bal=inst(new THREE.BoxGeometry(1,.15,1.2),new THREE.MeshLambertMaterial({color:0x9a968c}),D.bal.length/4,put=>{for(let i=0;i<D.bal.length;i+=4)put(V.set(D.bal[i],D.bal[i+1],D.bal[i+2]),0,new THREE.Vector3(D.bal[i+3],1,1));});
  D.ims.bal2=inst(new THREE.BoxGeometry(1,.9,.06),new THREE.MeshLambertMaterial({color:0x8a7558}),D.bal.length/4,put=>{for(let i=0;i<D.bal.length;i+=4)put(V.set(D.bal[i],D.bal[i+1]+.5,D.bal[i+2]+.58),0,new THREE.Vector3(D.bal[i+3],1,1));});
  // garden fences: posts and rails on the four sides (a gap at the front gate)
  const posts=[];for(let i=0;i<D.fence.length;i+=4){const[a,b,c,d]=D.fence.slice(i,i+4);for(let x=a;x<=b;x+=2.5){posts.push(x,c,x,d);}for(let z=c;z<=d;z+=2.5){posts.push(a,z,b,z);}}
  inst(new THREE.BoxGeometry(.08,1.1,.08),new THREE.MeshLambertMaterial({color:0x6a5a44}),posts.length/2,put=>{for(let i=0;i<posts.length;i+=2)put(V.set(posts[i],H(posts[i],posts[i+1])+.55,posts[i+1]));});
  // parked cars (a body and a cabin, random colours), yard trees
  const CC=[0x8a2a2a,0x2a3a6a,0xd8d8d0,0x303030,0x6a6a62,0x3a5a3a,0xa08a50];
  if(D.car.length){const n=D.car.length/3;const body=new THREE.InstancedMesh(new THREE.BoxGeometry(1.8,.75,4.2),new THREE.MeshLambertMaterial({color:0xffffff}),n),cab=new THREE.InstancedMesh(new THREE.BoxGeometry(1.6,.6,2.2),new THREE.MeshLambertMaterial({color:0x2a3036}),n);
    const col=new THREE.Color();for(let k=0;k<n;k++){const x=D.car[k*3],z=D.car[k*3+1],g=H(x,z);M4.makeTranslation(x,g+.55,z);body.setMatrixAt(k,M4);col.setHex(CC[Math.floor(D.car[k*3+2]*CC.length)]);body.setColorAt(k,col);M4.makeTranslation(x,g+1.2,z-.2);cab.setMatrixAt(k,M4);}
    body.instanceMatrix.needsUpdate=true;if(body.instanceColor)body.instanceColor.needsUpdate=true;cab.instanceMatrix.needsUpdate=true;sc.add(body);sc.add(cab);}
  inst(new THREE.ConeGeometry(1.6,4.5,7),new THREE.MeshLambertMaterial({color:0x3a5a2e}),D.tree.length/2,put=>{for(let i=0;i<D.tree.length;i+=2)put(V.set(D.tree[i],H(D.tree[i],D.tree[i+1])+2.6,D.tree[i+1]));});
  // street furniture along the street grid (the generated town; the live world's streets are its own)
  if(!WM){const lp=[],pw=[],bn=[];for(let k=-GR;k<=GR;k++)for(let t=-GR*30;t<=GR*30;t+=18){lp.push(village.x+k*30+15+2.8,village.z+t);if(t%54===0)pw.push(village.x+t,village.z+k*30+15-2.8);if(t%72===0)bn.push(village.x+k*30+15-2.8,village.z+t+4);}
    const pm=new THREE.MeshLambertMaterial({color:0x3a3c3e});inst(new THREE.CylinderGeometry(.06,.08,5,6),pm,lp.length/2,put=>{for(let i=0;i<lp.length;i+=2)put(V.set(lp[i],H(lp[i],lp[i+1])+2.5,lp[i+1]));});
    inst(new THREE.BoxGeometry(.5,.15,.25),new THREE.MeshBasicMaterial({color:0xfff2c8}),lp.length/2,put=>{for(let i=0;i<lp.length;i+=2)put(V.set(lp[i]-.2,H(lp[i],lp[i+1])+5,lp[i+1]));});
    inst(new THREE.CylinderGeometry(.11,.13,8,6),new THREE.MeshLambertMaterial({color:0x5a4632}),pw.length/2,put=>{for(let i=0;i<pw.length;i+=2)put(V.set(pw[i],H(pw[i],pw[i+1])+4,pw[i+1]));});
    if(pw.length>2){const pts=[];for(let i=0;i<pw.length-2;i+=2){if(Math.abs(pw[i+3]-pw[i+1])>1)continue;pts.push(new V3(pw[i],H(pw[i],pw[i+1])+7.6,pw[i+1]),new V3(pw[i+2],H(pw[i+2],pw[i+3])+7.6,pw[i+3]));}const lg=new THREE.BufferGeometry().setFromPoints(pts);sc.add(new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:0x202020})));}
    inst(new THREE.BoxGeometry(1.6,.45,.5),new THREE.MeshLambertMaterial({color:0x6a4a30}),bn.length/2,put=>{for(let i=0;i<bn.length;i+=2)put(V.set(bn[i],H(bn[i],bn[i+1])+.3,bn[i+1]));});}}
/* v412: THE FRONT WEARS. Each front keeps a wear level (0-1) that grows with every day of fighting on it (about three
   months to the worst) and falls slowly in a ceasefire. A battle on that front is built with it: craters everywhere,
   houses already shot up or fallen, burnt-out vehicles in no-man's land, shattered tree stumps, churned mud, more nets
   over the trenches and, as the months pass, extra trench lines dug behind the old ones. */
if(W.daily)W.daily.push(()=>{const st=W.st;if(!st)return;const Wr=st.wear||(st.wear={});for(const f of st.fronts){const v=Wr[f.id]||0;Wr[f.id]=Math.round(Math.max(0,Math.min(1,v+(f.cf?-.002:1/90)))*1000)/1000;}});
/* v425: STATIC BATCHING. Once the battlefield is built, every loose static mesh nothing in the game keeps a
   reference to (trees, revetment boards, posts, nets, sandbag walls, wrecks' pieces...) is merged with the others of the
   same look into one mesh: a few dozen draw calls instead of a few thousand. Anything the game holds (buildings that
   collapse, solids, craters, vehicles, soldiers, mines, smoke) stays as it is. */
function batchStatic(){const sc=S.sc,held=new Set(),seen=new Set();
  const scan=(o,d)=>{if(!o||typeof o!=='object'||seen.has(o)||d>5)return;seen.add(o);if(o.isObject3D){held.add(o);return;}if(o.isMaterial||o.isBufferGeometry||o.isTexture||ArrayBuffer.isView(o))return;
    if(o instanceof Map){for(const[k,v]of o){scan(k,d+1);scan(v,d+1);}return;}if(o instanceof Set){for(const v of o)scan(v,d+1);return;}
    for(const k in o){let v;try{v=o[k];}catch(e){continue;}if(v&&typeof v==='object')scan(v,d+1);}};
  scan(S,0);scan(TR,0);
  const groups=new Map();let n0=0;
  // loose meshes, and the meshes of static groups nothing holds (trench sections, gun nests, wrecks)
  const cand=[],grp=[];for(const o of sc.children){if(held.has(o)||!o.visible||o.userData.keep)continue;if(o.isMesh&&!o.children.length)cand.push(o);
    else if(o.isGroup||(o.type==='Object3D')){let ok=true;o.traverse(c=>{if(c!==o&&(held.has(c)||c.isLight||c.isSprite||c.isPoints||c.isLine||c.userData.J||c.isInstancedMesh))ok=false;});if(o.userData.J||o.userData.tu||o.userData.rotor)ok=false;if(!ok)continue;const ms=[];o.traverse(c=>{if(c.isMesh&&c.visible)ms.push(c);});if(ms.length){grp.push(o);cand.push(...ms);}}}
  sc.updateMatrixWorld(true);
  for(const m of cand){if(!m.isMesh||m.isInstancedMesh||m.isSkinnedMesh||(m.parent===sc&&m.children.length)||m.userData.keep)continue;const mt=m.material;if(Array.isArray(mt)||!mt||mt.isShaderMaterial||mt.onBeforeCompile&&mt.onBeforeCompile.toString().length>40)continue;
    const g=m.geometry;if(!g||!g.attributes.position||g.morphAttributes&&Object.keys(g.morphAttributes).length)continue;
    const key=[mt.type,mt.color?mt.color.getHexString():'',mt.emissive?mt.emissive.getHexString():'',mt.map?mt.map.uuid:'',mt.transparent?1:0,mt.opacity,mt.side,mt.vertexColors?1:0,mt.depthWrite?1:0,mt.polygonOffset?mt.polygonOffsetFactor:'',!!g.attributes.uv,!!g.attributes.color].join('|');
    let G=groups.get(key);if(!G)groups.set(key,G={mt,list:[]});G.list.push(m);}
  let calls=0;
  for(const G of groups.values()){if(G.list.length<4)continue;const L=G.list;let nv=0;const geos=[];
    for(const m of L){const g=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone());g.applyMatrix4(m.matrixWorld);if(!g.attributes.normal)g.computeVertexNormals();geos.push(g);nv+=g.attributes.position.count;}
    if(nv>2e6)continue;const hasUV=geos.every(g=>g.attributes.uv),hasC=geos.every(g=>g.attributes.color);
    const P=new Float32Array(nv*3),N=new Float32Array(nv*3),U=hasUV?new Float32Array(nv*2):null,C=hasC?new Float32Array(nv*3):null;let o=0;
    for(const g of geos){const c=g.attributes.position.count;P.set(g.attributes.position.array.subarray(0,c*3),o*3);N.set(g.attributes.normal.array.subarray(0,c*3),o*3);if(U)U.set(g.attributes.uv.array.subarray(0,c*2),o*2);if(C)C.set(g.attributes.color.array.subarray(0,c*3),o*3);o+=c;g.dispose();}
    const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(P,3));bg.setAttribute('normal',new THREE.BufferAttribute(N,3));if(U)bg.setAttribute('uv',new THREE.BufferAttribute(U,2));if(C)bg.setAttribute('color',new THREE.BufferAttribute(C,3));bg.computeBoundingSphere();
    const M=new THREE.Mesh(bg,G.mt);M.matrixAutoUpdate=false;M.userData.batch=L.length;sc.add(M);for(const m of L){if(m.parent)m.parent.remove(m);if(m.material!==G.mt&&m.material.dispose)m.material.dispose();}n0+=L.length;calls++;}
  for(const o of grp)if(!o.children.some(c=>c.isMesh||c.children.length))sc.remove(o);
  return{merged:n0,into:calls};}
/* v425: SOLDIER LOD. Beyond 150 m a soldier is a few pixels tall: he is drawn as one block in his uniform's colour
   (lying down if he is down), not twenty parts. Checked a few times a second. */
const LODG=new THREE.BoxGeometry(.5,1.7,.32);LODG.translate(0,.85,0);
function lodStep(dt){S.lodT=(S.lodT||0)-dt;if(S.lodT>0)return;S.lodT=.35;const P=S.tk?S.tk.v.m.position:S.pos,R2=150*150;
  for(const L of[S.us,S.them,S.civ||[]])for(const u of L){const m=u.m;if(!m||!m.visible&&!u.lod)continue;const dx=m.position.x-P.x,dz=m.position.z-P.z,far=dx*dx+dz*dz>R2;if(far===!!u.lod)continue;
    if(far&&!u.px){let col=0x556b45;m.traverse(o=>{if(o.isMesh&&o.userData.part==='body'&&o.material&&o.material.color&&col===0x556b45)col=o.material.color.getHex();});u.px=new THREE.Mesh(LODG,new THREE.MeshLambertMaterial({color:col}));u.px.userData.lodP=1;m.add(u.px);}
    for(const c of m.children)c.visible=c===u.px?far:!far;u.lod=far;}
  // vehicles beyond 400 m: their small parts (wheels, hatches, antennas, track links) are not drawn
  const V2=400*400;for(const v of S.veh){if(!v.alive||v.me||!v.m)continue;const dx=v.m.position.x-P.x,dz=v.m.position.z-P.z,far=dx*dx+dz*dz>V2;if(far===!!v.lod)continue;
    if(!v.small){v.small=[];v.m.traverse(o=>{if(!o.isMesh||!o.geometry)return;if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();const sc=o.getWorldScale(new V3());if(o.geometry.boundingSphere.radius*Math.max(sc.x,sc.y,sc.z)<.45)v.small.push(o);});}
    for(const o of v.small)o.visible=!far;v.lod=far;}}
function warScars(w){if(!(w>0.01))return;S.wear=w;S.quiet=true;try{warScars0(w);}finally{S.quiet=false;}}
function warScars0(w){const sc=S.sc,M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),Y=new V3(0,1,0),Sc=new V3();const inField=(x,z)=>!(TR.n&&cut(x,z)>0);
  // craters: dark bowls with a lighter rim of thrown earth
  const nC=Math.round(60+w*1100);const cr=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1.15,.08,12),new THREE.MeshLambertMaterial({color:0x2e2418}),nC),rim=new THREE.InstancedMesh(new THREE.TorusGeometry(1.15,.18,4,14),new THREE.MeshLambertMaterial({color:0x6a5a40}),nC);let k=0;
  for(let i=0;i<nC*3&&k<nC;i++){const x=(rn()-.5)*1300,z=-80-rn()*1150;if(!inField(x,z))continue;const r=.8+Math.pow(rn(),2)*4.5,y=H(x,z);Q.setFromAxisAngle(Y,rn()*6);M4.compose(new V3(x,y+.03,z),Q,Sc.set(r,1,r));cr.setMatrixAt(k,M4);
    const q2=new THREE.Quaternion().setFromAxisAngle(new V3(1,0,0),Math.PI/2);M4.compose(new V3(x,y+.05,z),q2,Sc.set(r,r,1));rim.setMatrixAt(k,M4);k++;}
  cr.count=rim.count=k;cr.instanceMatrix.needsUpdate=rim.instanceMatrix.needsUpdate=true;sc.add(cr);sc.add(rim);S.craterN=k;
  // houses already damaged: shell hits on walls and roofs, some fallen
  for(const b of S.BLD){if(!b||b.down||!b.walls||/BUNKER|DUGOUT|COMMAND/.test(b.kind||''))continue;if(rn()>w*.85)continue;if(rn()<w*.35){try{collapse(b,'');}catch(e){}S.ruined=(S.ruined||0)+1;continue;}const hits=2+Math.floor(rn()*w*4);for(let i=0;i<hits;i++){const p=new V3(b.x+(rn()<.5?-1:1)*b.w/2*(.8+rn()*.3),H(b.x,b.z)+1+rn()*3*(b.fl||1),b.z+(rn()-.5)*b.d);try{scar(p,3+rn()*4*w);}catch(e){}}S.ruined=(S.ruined||0)+1;}
  // burnt-out vehicles, shattered tree stumps
  const burnt=new THREE.MeshLambertMaterial({color:0x1e1c1a});for(let i=0;i<Math.round(w*4);i++){try{const m=rn()<.5?tank(rn()<.5?S.me:S.en,0x26241f):vehicle('APC',0x26241f);m.traverse(o=>{if(o.isMesh)o.material=burnt;});const x=(rn()-.5)*700,z=-520-rn()*300;m.position.set(x,H(x,z)-.2,z);m.rotation.set((rn()-.5)*.15,rn()*6,(rn()-.5)*.2);sc.add(m);}catch(e){}}
  const nS=Math.round(w*500);if(nS){const st=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.2,1,5),new THREE.MeshLambertMaterial({color:0x3a2e22}),nS);let j=0;for(let i=0;i<nS*2&&j<nS;i++){const x=(rn()-.5)*1600,z=-rn()*1300;if(!inField(x,z))continue;const h=.5+rn()*2.5;M4.compose(new V3(x,H(x,z)+h/2,z),Q.setFromAxisAngle(new V3(rn()-.5,0,rn()-.5).normalize(),(rn()-.5)*.5),Sc.set(1,h,1));st.setMatrixAt(j++,M4);}st.count=j;st.instanceMatrix.needsUpdate=true;sc.add(st);}
  // churned ground
  if(S.ter&&S.ter.material&&S.ter.material.color)S.ter.material.color.lerp(new THREE.Color(0x4a3c2a),Math.min(.7,w*.8));
  // more nets and, after a while, extra trench lines dug behind the old ones
  const T=trTex(),netM=new THREE.MeshLambertMaterial({map:T.net,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  for(const L of TR.L){if(L.k)continue;for(let x=-300;x<300;x+=20){if(rn()>w*.7)continue;const z=L.z+zig(L.x0,x+3);const n=new THREE.Mesh(new THREE.PlaneGeometry(6,2.4),netM);n.rotation.x=-Math.PI/2;n.position.set(x+3,HF(x+3,z)+.4,z);sc.add(n);}}
  if(w>.35&&S.lines){const back=Math.min(...S.lines.filter(l=>l.own==='F').map(l=>l.z))+(-1)*0;const zF=Math.max(...S.lines.filter(l=>l.own==='F').map(l=>l.z))+180;trLine(sc,zF,-1,'F',TR.L[0]?TR.L[0].x0:-1150,TR.L[0]?TR.L[0].x1:1150);if(w>.7){const zE=Math.min(...S.lines.map(l=>l.z))-200;trLine(sc,zE,1,'E',TR.L[0]?TR.L[0].x0:-1150,TR.L[0]?TR.L[0].x1:1150);}trSync();void back;}}
/* v413: THE RIDE. Before an APC / IFV insertion: your vehicle pulls out of the motor-pool garage at the rear and drives
   the road to the front past checkpoints, a field hospital, burnt-out wrecks and shell holes, while the squad talks in
   the back (squad.js). You sit inside on the bench: a dim red light, your men opposite, the rear door's vision block.
   Space or Enter skips it. */
/* seated on the bench: thighs forward, shins down, rifle upright between the knees, a little slouch */
function sitPose(m){const J=m.userData.J;if(!J)return;J.sit=1;for(const k of['L','R']){J[k].hip.rotation.x=Math.PI/2;J[k].kn.rotation.x=-Math.PI/2;}J.L.hip.rotation.z=.08;J.R.hip.rotation.z=-.08;
  J.up.rotation.x=.08;J.AR.rotation.x=-.6;if(J.AL)J.AL.rotation.x=-.6;J.gun.rotation.x=-Math.PI/2+.15;J.gun.position.set(0,.95,-.35);}
function rideSetup(v){const sc=S.sc,R={t:0,dur:42,lines:[],li:0,lt:2},Z0=1500,Z1=700;S.trip=R;
  const M=c=>new THREE.MeshLambertMaterial({color:c}),box=(w,h,d,x,y,z,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);sc.add(o);return o;};
  // the garage: a long shed with an open door toward the front, strip lights, other vehicles parked
  const gy=H(0,Z0),gm=M(0x6a6c66),gl=M(0x3a3c38);box(16,.3,30,0,gy+7,Z0,gl);box(.4,7,30,-8,gy+3.5,Z0,gm);box(.4,7,30,8,gy+3.5,Z0,gm);box(16,7,.4,0,gy+3.5,Z0+15,gm);box(4,7,.4,-6,gy+3.5,Z0-15,gm);box(4,7,.4,6,gy+3.5,Z0-15,gm);box(8,1.5,.4,0,gy+6.2,Z0-15,gm);
  for(let i=0;i<4;i++){const l=new THREE.PointLight(0xfff0c8,.8,14);l.position.set(0,gy+6.5,Z0-10+i*7);sc.add(l);}
  for(const x of[-5,5])try{const p=vehicle('APC',0x4e5a3c);p.position.set(x,gy,Z0+6);sc.add(p);}catch(e){}
  // the road: checkpoints, a field hospital, wrecks, shell holes (more on a worn front)
  const w=S.wear||0,sb=M(0x8c7d5a),tent=M(0x5a6a4a),wr=M(0x22201c);
  for(const z of[1250,1000]){box(3,1.1,1,-5,H(-5,z)+.55,z,sb);box(3,1.1,1,5,H(5,z)+.55,z,sb);const bar=box(6,.15,.15,0,H(0,z)+1.1,z,M(0xc83030));void bar;}
  box(10,3,6,14,H(14,1120)+1.5,1120,tent);box(.2,1.2,1.2,8.9,H(8.9,1120)+2,1120,M(0xd8d8d8));
  for(let i=0;i<4+w*8;i++){const z=Z1+40+rn()*700,x=(rn()<.5?-1:1)*(8+rn()*14);try{const m=rn()<.5?vehicle('APC',0x26241f):tank(S.en,0x26241f);m.traverse(o=>{if(o.isMesh)o.material=wr;});m.position.set(x,H(x,z)-.2,z);m.rotation.y=rn()*6;sc.add(m);}catch(e){}}
  for(let i=0;i<20+w*60;i++){const z=Z1+rn()*800,x=(rn()-.5)*40;if(Math.abs(x)<3)continue;const c=new THREE.Mesh(new THREE.CylinderGeometry(1+rn()*2,1.3+rn()*2,.1,10),M(0x2e2418));c.position.set(x,H(x,z)+.03,z);sc.add(c);}
  // inside: benches, your men opposite you, a red lamp, the rear door's vision block
  const cab=new THREE.Group();const dk=M(0x2a2c28);for(const[w2,h,d,x,y,z]of[[2.4,.08,4,0,.8,0],[.08,1.6,4,-1.2,1.6,0],[.08,1.6,4,1.2,1.6,0],[2.4,.08,4,0,2.4,0],[2.4,1.6,.08,0,1.6,-2]]){const o=new THREE.Mesh(new THREE.BoxGeometry(w2,h,d),dk);o.position.set(x,y,z);cab.add(o);}
  for(const sx of[-.85,.85]){const b=new THREE.Mesh(new THREE.BoxGeometry(.45,.4,3.4),M(0x3e3a30));b.position.set(sx,1.05,0);cab.add(b);}
  const lamp=new THREE.PointLight(0xff4a3a,1.1,5);lamp.position.set(0,2.2,0);cab.add(lamp);for(const[w2,h,x,y]of[[2.4,.9,0,1.25],[2.4,.5,0,2.15],[.9,.4,-.75,1.9],[.9,.4,.75,1.9]]){const o=new THREE.Mesh(new THREE.BoxGeometry(w2,h,.08),dk);o.position.set(x,y,2);cab.add(o);}   /* the rear hatch with a vision slot */
  R.men=[];for(let i=0;i<3;i++){try{const m=soldier(true);sitPose(m);m.scale.setScalar(.95);m.position.set(.85,1.25-.92*.95,-1.1+i*1.1);m.rotation.y=Math.PI/2;cab.add(m);R.men.push(m);}catch(e){}}
  cab.position.y=0;v.add(cab);R.cab=cab;R.v=v;R.Z0=Z0;R.Z1=Z1;
  try{R.lines=W.squad?W.squad.talk(S.cfg.a3,{enemy:S.EN&&S.enA3&&W.st.c[S.enA3]?W.st.c[S.enA3].n:'the enemy',place:S.loc&&S.loc.name}):[];}catch(e){R.lines=[];}R.dur=Math.max(42,R.lines.reduce((t,l)=>t+3.5+l[1].length*.065,0)+8);   // v422: the ride lasts as long as the talk (Space skips)
  S.yaw=-Math.PI/2;S.pitch=-.12;say('THE ROAD TO THE FRONT · SPACE TO SKIP',4);}
function rideStep(dt){const R=S.trip;R.t+=dt;if(S.keys.Space||S.keys.Enter||S.keys.NumpadEnter||R.t>=R.dur){rideEnd();return false;}
  const u=R.t/R.dur,e=u<.15?u*u/.15*.5/.15*.15:u;void e;const z=R.Z0-(R.Z0-R.Z1)*Math.min(1,u*1.02),x=Math.sin(u*9)*2*Math.min(1,u*4);R.v.position.set(x,H(x,z),z);R.v.rotation.y=Math.cos(u*9)*.08;
  const bump=Math.sin(R.t*11)*.03+Math.sin(R.t*5.3)*.02;S.pos.set(x-.85,H(x,z)+1.75+bump,z);
  const now=Date.now();if((!R.nx||now>=R.nx)&&R.li<R.lines.length){const[w,t]=R.lines[R.li++];const ms=3500+t.length*65;rideSub(w,t,ms+600);R.nx=now+ms;}
  for(const m of R.men)m.rotation.z=bump*2;return true;}
function rideEnd(){const R=S.trip;if(!R)return;S.trip=null;try{for(const[w,t]of R.lines.slice(R.li).filter(x=>x[0]==='HQ'||x[0]==='SQUAD').slice(-3))vline(w,t);}catch(e){}try{R.v.remove(R.cab);}catch(e){}S.keys.Space=false;S.ins_t=0;S.yaw=0;}
/* v416: THE BATTLE IS PART OF THE CAMPAIGN. You fight with a real brigade of your country's order of battle on that
   front, against a real enemy brigade; their strength, the front's supply, the air situation over the theatre, your
   artillery stocks, the squad's morale and the front's wear are read at the start and shown in the briefing, and they
   act on the battle: ammunition you carry follows supply, artillery calls spend real stocks, the squad shoots as well
   as its morale lets it. Afterwards the battle goes into both brigades' histories and moves their readiness. */
/* v418: CIVILIANS WHO STAYED. Not every resident leaves a front-line town: how many remain follows the country's
   displacement and the front's wear (spec ch.08 / ch.14: civilians are protected, never targets). They shelter in
   basements and doorways and move away from the shooting; no soldier of either side aims at them. If your fire or
   your grenade harms one, it is a civilian-harm incident: it goes into the death ledger (estimated details withheld),
   your service record opens an inquiry, and the rules-of-engagement review sees it. */
function civSpawn(cfg,fr){S.civ=[];if(cfg.camp||!W.st)return;const p=W.st.c[cfg.a3];if(!p)return;const disp=Math.min(.9,(p.disp||0)/Math.max(1,p.pop)*8+(S.wear||0)*.6);
  const n=Math.round(Math.max(0,8*(1-disp)));const B=(S.BLD||[]).filter(b=>b&&!b.down&&b.walls&&!/BUNKER|DUGOUT|COMMAND/.test(b.kind||''));const CC=[0x6a4a3a,0x3a4a6a,0x7a7a72,0x5a3a4a,0x8a7a5a,0x2e3a2e];
  for(let i=0;i<n&&B.length;i++){const b=B[(rn()*B.length)|0];const x=b.x+(rn()-.5)*(b.w-2),z=b.z+(rn()-.5)*(b.d-2);const m=soldier(true);const col=new THREE.Color(CC[i%CC.length]);m.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.userData.part!=='head')o.material.color=col.clone();if(/gun|rifle|wpn/i.test(o.name||''))o.visible=false;}});
    m.position.set(x,H(x,z),z);S.sc.add(m);S.civ.push({m,alive:true,civ:true,hp:60,home:b,name:W.people&&W.people.name?W.people.name(cfg.a3,Math.random):'a resident'});}
  if(S.civ.length)setTimeout(()=>{try{if(S)vline('HQ',S.civ.length+' civilians are still in '+S.loc.name+' — sheltering in basements. Check your fire.');}catch(e){}},9500);}
function civStep(dt){if(!S.civ)return;for(const c of S.civ){if(!c.alive)continue;const P=c.m.position;let th=null,bd=30;for(const u of[...S.us,...S.them]){if(!u.alive)continue;const d=u.m.position.distanceTo(P);if(d<bd){bd=d;th=u;}}
  if(th&&bd<25){const d=P.clone().sub(th.m.position).setY(0).normalize();const nx=P.x+d.x*2.2*dt,nz=P.z+d.z*2.2*dt;if(!collideTest(new V3(nx,0,nz))){P.x=nx;P.z=nz;}P.y=H(P.x,P.z);c.m.rotation.y=Math.atan2(-d.x,-d.z);}}}
function civHit(c,dmg,own){if(!c.alive)return;c.hp-=dmg;if(c.hp>0){if(own)civHarm(c,'WOUNDED');return;}c.alive=false;c.m.rotation.x=-Math.PI/2;c.m.position.y+=.25;civHarm(c,'KILLED');}
function civHarm(c,st0){if(c.rep&&st0==='WOUNDED')return;c.rep=1;S.civHarm=(S.civHarm||0)+1;say('CIVILIAN '+(st0==='KILLED'?'KILLED':'WOUNDED')+' · CEASE FIRE IN THAT DIRECTION',3);
  try{if(W.cemetery&&st0==='KILLED')W.cemetery.record({a3:S.cfg.a3,n:1,kind:'CIV',st:'KILLED',role:'resident',place:S.loc.name,cause:'killed during the battle for '+S.loc.name+' (incident under review)',named:[c.name]});
    W.emit('PLAYER_HARM',{e:[S.cfg.a3],rec:{cat:'INFANTRY FIRE',n:1},txt:'A civilian is '+st0.toLowerCase()+' during the battle for '+S.loc.name+'. An inquiry into the player\'s fire is opened; the rules-of-engagement review will hear it.'});
    const I=W.st.pol2&&W.st.pol2.inv;if(I)I.roe++;}catch(e){}}
function campLink(cfg,fr,enA3){const st=W.st;if(!st||cfg.camp||!fr)return;const a3=cfg.a3,L={};
  const pickB=(c)=>W.ob&&W.ob.units?W.ob.units(c).filter(u=>u&&u.kind==='BDE'&&u.front===fr.id&&u.str>0).sort((x,y)=>y.str-x.str)[0]:null;
  L.my=pickB(a3);L.en=enA3?pickB(enA3):null;L.sup=(st.ops&&st.ops.sup&&st.ops.sup[a3+':'+fr.id])??1;const m=st.mil&&st.mil[a3];L.art=m&&m.mun?m.mun.ART:8;
  const th=(st.th||[]).reduce((b,t)=>Math.abs(t.sup||0)>Math.abs(b.sup||0)?t:b,{sup:0});L.air=(th.sup||0)*(st.c[a3].side==='B'?1:-1);
  const R=W.squad&&W.squad.roster?W.squad.roster(a3):null;const F=R?R.m.filter(x=>x.st==='FIT'):[];L.mor=F.length?F.reduce((t,x)=>t+x.mor,0)/F.length:.6;L.wear=(st.wear&&st.wear[fr.id])||0;
  S.link=L;S.mFr=.7+.6*L.mor;
  const k=.5+.5*Math.min(1,L.sup);for(const w of['pri','side'])if(S.wp[w]&&S.wp[w].res)S.wp[w].res=Math.round(S.wp[w].res*k);if(L.sup<.5)S.gren=Math.max(0,(S.gren||0)-1);
  const pc=x=>Math.round(x*100)+'%';const bn=u=>u?u.name+' ('+pc(u.str/(u.str0||u.str))+', ready '+pc(u.ready)+')':'no brigade on record';
  const lines=[['HQ','You are with '+bn(L.my)+'.'],['HQ','Facing '+bn(L.en)+'.'],['HQ','Supply on this front '+pc(Math.min(1.2,L.sup))+(L.sup<.6?' — ammunition is short, make every round count.':'.')+' Artillery: '+(L.art>1?Math.round(L.art)+' days of shells.':'almost none.')],
    ['HQ','Air over the theatre: '+(L.air>.15?'ours.':L.air<-.15?'theirs — watch for drones and strikes.':'contested.')+' Squad morale '+pc(L.mor)+'.'+(L.wear>.4?' This ground has been fought over for months.':'')]];
  lines.forEach(([w,t],i)=>setTimeout(()=>{try{if(S)vline(w,t);}catch(e){}},400+i*2200));}
function linkAfter(r){const L=S&&S.link;if(!L)return;const good=r==='WON'||r==='HELD'||r==='BREAK';const t=W.st.t;
  if(L.my){L.my.ready=Math.max(.2,Math.min(1,(L.my.ready||.8)+(good?.03:-.05)));(L.my.hist||(L.my.hist=[])).push([t,(good?'won':'fought')+' the battle for '+S.loc.name]);if(L.my.hist.length>12)L.my.hist.shift();}
  if(L.en){L.en.ready=Math.max(.2,Math.min(1,(L.en.ready||.8)+(good?-.05:.02)));(L.en.hist||(L.en.hist=[])).push([t,(good?'lost':'held')+' the battle for '+S.loc.name]);if(L.en.hist.length>12)L.en.hist.shift();}}
function start(cfg){if(S)stop(false);const st=cfg.camp?null:W.st;if(!st&&!cfg.camp)return;if(cfg.camp){const c=campCtx();cfg.a3=c.a3;}const p=country(cfg);const me=p.side,en=me==='B'?'R':'B';
  let fr=st?(st.fronts.find(f=>!f.cf&&(f.a===cfg.a3||f.b===cfg.a3))||st.fronts.find(f=>!f.cf&&(st.c[f.a].side===me||st.c[f.b].side===me))):null;
  if(cfg.loc0&&st){const C=locChoices(cfg).find(c=>c.id===cfg.loc0);const f2=C&&st.fronts.find(f=>f.id===C.fr);if(f2)fr=f2;}
  const enA3=cfg.camp?campCtx().en:fr?(fr.a===cfg.a3||st.c[fr.a].side===me?fr.b:fr.a):null,N=names(cfg.a3),EN=names(enA3||'');
  const cs=cfg.camp&&typeof CAMP!=='undefined'&&CAMP.st?(CAMP.st.hot&&CAMP.st.hot.length?CAMP.st.hot[0]:(CAMP.st.front.length>>1)):null;
  if(typeof game!=='undefined'&&!cfg.world){S0.paused=game.paused;game.paused=true;}
  const LOC=cfg.world?cfg.loc:resolveLoc(cfg,fr,cs);cfg.loc=LOC;HF=cfg.world?((x,z)=>groundAt(cfg.O.x+x,cfg.O.z+z)):LOC.H;cfg.mis=cfg.mis||'ATTACK';
  auInit();try{if(typeof sfx!=='undefined'&&sfx.mute)sfx.mute(true);}catch(e){}
  const B=build(cfg);if(cfg.a3&&cfg.side&&!canField(cfg.a3,cfg.side))cfg.side=STDFAM[famOf3(cfg.a3)].SIDE;const pri=makeGun(cfg.pri,cfg.gun&&GUNS[cfg.gun]&&GUNS[cfg.gun].cls===cfg.pri&&(!cfg.a3||canField(cfg.a3,cfg.gun))?cfg.gun:gunDef(cfg.pri,cfg.a3),cfg.att),lau={...LAU[cfg.lau]},sd=makeSide(cfg.side,cfg.satt);{const A=cfg.a3&&ARMS()[cfg.a3];if(A&&A.ammo)pri.res=Math.round(pri.res*(1+A.ammo*.2));}pri.cur=pri.mag;sd.cur=sd.mag;if(lau.mag)lau.cur=lau.mag;
  S={env:cfg.env||(cfg.cond?{n:'live · '+cfg.cond.wx.toLowerCase()+' · '+cfg.cond.season.toLowerCase(),wind:cfg.cond.wx==='STORM'?5:1.5,dark:cfg.cond.tod<5||cfg.cond.tod>=21}:{n:'live',wind:1.5}),fpvKit:cfg.role==='AT'||cfg.role==='ENGINEER'?3:2,myFpv:[],feed:null,med:null,medN:0,wia:0,evac:0,armLog:[],O:cfg.world?cfg.O.clone():new V3(),smk:[],craters:[],fires:[],calls:0,callDead:0,pend:null,arty:null,offN:0,bags:cfg.role==='ENGINEER'?8:2,dug:0,cfg,cs,loc:LOC,mission:cfg.mis,trZ:-470,wave:0,air:[],airT:8,me,en,fr,enA3,N,EN,...B,t:0,phase:'INSERT',ins:cfg.ins,pos:new V3(0,0,250),vel:new V3(),yaw:0,pitch:0,hp:100,arm:cfg.helm?armOf(cfg):armOf({helm:ARMSET[cfg.arm||'PLATE'][0],vest:ARMSET[cfg.arm||'PLATE'][1],extra:ARMSET[cfg.arm||'PLATE'][2]}),uglN:0,laserOn:true,loudT:0,vlow:false,bc:0,crouch:false,ads:false,w:'pri',wp:{pri,lau,side:sd},gren:cfg.gren,
    reload:0,cool:0,fire:false,keys:{},drones:[],dT:20,us:[],them:[],veh:[],gnades:[],rk:[],kills:0,lost:0,hold:0,res:null,ifv:null,eheli:null,shots:0,hits:0,heliT:60+rn()*60,waveT:70,msg:'',msgT:0};
  // squads: yours (6) and theirs (scaled by the enemy's ground strength on that front)
  const ePow=cfg.camp?campPow(cs):enA3&&st?Math.min(1.6,Math.max(.6,(st.c[enA3].gnd/Math.max(1,p.gnd))||1)):1;
  for(let i=0;i<6;i++)S.us.push(man(true,(rn()-.5)*30,230+rn()*20));
  S.ePow=ePow;
  if(S.mission==='FRONT'){S.cur=1;S.trZ=S.lines[1].z;S.waveT=60;S.push=false;S.digQ=[];
    for(let i=0;i<14;i++){const u=man(true,0,0);u.si=i;S.us.push(u);}
    for(const L of[2,3])for(let i=0;i<8;i++){const t=S.lines[L].slots[(i*4+L)%S.lines[L].slots.length];const u=man(false,t.x,t.z);u.line=L;u.gar=1;S.them.push(u);}
    for(const x of[-70,70]){const z=S.lines[1].z+70;const m=tank(S.me,0x4e5a3c);m.position.set(x,H(x,z),z);S.sc.add(m);S.veh.push({m,hp:1100,side:'F',x,z,cool:3,alive:true,tank:1,name:m.userData.name});}
    {const m=tank(S.en,0x6a5a3a),x=-60,z=S.lines[3].z-60;m.position.set(x,H(x,z),z);S.sc.add(m);S.veh.push({m,hp:1100,side:'E',x,z,cool:4,alive:true,tank:1,name:m.userData.name});}
    {const v=vehicle('EIFV',0x6a5a3a),x=50,z=S.lines[2].z-80;v.position.set(x,H(x,z),z);S.sc.add(v);S.veh.push({m:v,hp:600,side:'E',x,z,cool:3,alive:true});}}
  else if(S.mission==='DEFEND'){// your squad and more riflemen hold the trench; two of your tanks stand behind it
    for(let i=0;i<6;i++)S.us.push(man(true,0,0));for(let i=0;i<6;i++){const u=man(true,0,0);S.us.push(u);}
    S.us.forEach((u,i)=>{const t=S.trench[Math.round((i+.5)*S.trench.length/S.us.length)%S.trench.length];u.slot=t.clone();u.m.position.set(t.x,H(t.x,t.z),t.z);});
    for(const x of[-70,70]){const z=S.trZ+70;const m=tank(S.me,0x4e5a3c);m.position.set(x,H(x,z),z);S.sc.add(m);S.veh.push({m,hp:1100,side:'F',x,z,cool:3,alive:true,tank:1,name:m.userData.name});}}
  else{for(let i=0;i<Math.round(10*ePow);i++)S.them.push(man(false,S.village.x+(rn()-.5)*110,S.village.z+(rn()-.5)*110));
    {const v=vehicle('EIFV',0x6a5a3a);const x=S.village.x+40,z=S.village.z-30;v.position.set(x,H(x,z),z);S.sc.add(v);S.veh.push({m:v,hp:600,side:'E',x,z,cool:3,alive:true});}
    {const m=tank(S.en,0x6a5a3a);const x=S.village.x-50,z=S.village.z-60;m.position.set(x,H(x,z),z);S.sc.add(m);S.veh.push({m,hp:1100,side:'E',x,z,cool:4,alive:true,tank:1,name:m.userData.name});}}
  try{campLink(cfg,fr,enA3);}catch(e){console.warn('[infantry] link',e);}
  try{civSpawn(cfg,fr);}catch(e){console.warn('[infantry] civilians',e);}
  try{if(window.INFNET)setTimeout(()=>{try{if(S)INFNET.join(cfg,S);}catch(e){}},0);}catch(e){}
  try{warScars(fr?((W.st&&W.st.wear&&W.st.wear[fr.id])||0):(cfg.wear||0));}catch(e){console.warn('[infantry] scars',e);}
  gridBuild();layGreen();try{mineInit();if(S.mission==='FRONT')manSpots();}catch(e){console.warn(e);}for(const v of S.veh)if(v.side==='E'&&rn()<(S.decoyK||0)*.6+.05&&!v.decoy){v.decoy=true;v.nofire=true;v.immob=true;}S.atgm=atgmMode(S.N.ATGM,S.me);S.uglN=pri.ugl;equipVM();S.body={head:100,torso:100,armL:100,armR:100,legL:100,legR:100};S.wounds=[];S.kit2={tq:2,band:3,kit:cfg.role==='MEDIC'?3:1};if(S.us[2])S.us[2].medic=true;if(S.them[3])S.them[3].medic=true;iwInit();S.us.slice(0,2).forEach(u=>u.eng=true);S.them.slice(0,2).forEach(u=>u.eng=true);
  if(S.WM)worldOn();
  {const eb=S.STR.filter(c=>c.side==='E'&&c.kind!=='COMMAND POST');const al=S.them.filter(u=>u.alive);eb.forEach((c,i)=>{const u=al[i];if(!u)return;u.m.position.set(c.cx,c.y0,c.cz);u.ox=c.cx-S.village.x;u.oz=c.cz-S.village.z;u.bunk=c;});}
  try{S.batched=batchStatic();}catch(e){console.warn('[infantry] batch',e);}
  for(const u of S.us)u.m.visible=false;insertion();bind();loop.last=performance.now();if(!loop.on){loop.on=true;requestAnimationFrame(loop);}
  const dtx='You deploy as infantry with '+p.n+' ('+(cfg.pri==='RIFLE'&&N.RIFLE?N.RIFLE:PRI[cfg.pri].n)+', '+ARM[cfg.arm].n.toLowerCase()+') by '+INS[cfg.ins].toLowerCase()+(S.mission==='DEFEND'?' to hold the trenches before '+LOC.name:' to take '+LOC.name)+(fr?' on the front with '+st.c[enA3].n:cs!=null?' (sector '+(cs+1)+')':'')+'.';
  if(cfg.camp){if(typeof CAMP!=='undefined'&&CAMP.st)CAMP.log(dtx,'b');}else W.emit('INFANTRY',{e:[cfg.a3],txt:dtx});return S;}
// enemy strength in a campaign sector against yours (unit values by hit points)
function campPow(i){if(typeof CAMP==='undefined'||!CAMP.st||i==null)return 1;const st=CAMP.st,ms=0;let o=0,e=0;for(const u of st.units){if(u.dead||u.i!==i)continue;const v=(u.hp||100)/100;if(u.s===ms)o+=v;else e+=v;}return Math.min(1.6,Math.max(.6,(e+1)/(o+1)));}
const S0={paused:false};
/* ------------------------------------------------------------------ v379: where the battle is */
// World war: the real town or city (GeoNames / Natural Earth places) nearest the middle of your front, its size from its
// population, the ground from the real elevation grid. Campaign: the campaign town nearest the hot sector, on the
// campaign's own terrain. The town is laid out around its centre; the objective is its centre.
const CTN=['Velden','Korsk','Marnow','Ostbrück','Hadley Cross','Pirna','Lesk','Drovna','Altheim','Brenno','Sakra','Tolvi','Rusk','Elmsted','Gorzan','Vira'];
// v387: places you can choose to fight at — the real towns and cities along your side's fronts (world war), or the
// campaign towns nearest the front (campaign). The default is the one nearest the middle of your front.
function locChoices(cfg){const out=[];if(cfg.camp){if(typeof CAMP==='undefined'||!CAMP.st||!window.CAMPPLUS)return out;const st=CAMP.st;
    CAMPPLUS.TOWNS.forEach((t,i)=>{let d=1e18;st.front.forEach((fz,k)=>{const fx=typeof CFX!=='undefined'?CFX[k]:0;d=Math.min(d,Math.hypot(t.x-fx,t.z-fz));});out.push({id:'c'+i,i,name:t.nm||CTN[i%CTN.length],d,pop:t.big?60000:t.n*120});});
    return out.sort((a,b)=>a.d-b.d).slice(0,10);}
  const st=W.st,G=window.WGEO;if(!st||!G||!G.places)return out;const p=st.c[cfg.a3];if(!p)return out;const seen=new Set();
  for(const f of st.fronts){if(f.cf)continue;if(st.c[f.a].side!==p.side&&st.c[f.b].side!==p.side)continue;const mine=f.a===cfg.a3||f.b===cfg.a3;
    for(let k=0;k<f.sec.length;k+=Math.max(1,(f.sec.length/6)|0)){const ll=W.linePt(f.sec[k]);let best=null,bd=1e18;for(const pl of G.places){const d=(pl.lat-ll.lat)**2+((pl.lon-ll.lon)*Math.cos(ll.lat*Math.PI/180))**2;if(d<bd){bd=d;best=pl;}}
      if(best&&bd<.35&&!seen.has(best.name)){seen.add(best.name);out.push({id:best.name,place:best,fr:f.id,mine,name:best.name,a3:best.a3,pop:best.pop||0,front:st.c[f.a].n+' – '+st.c[f.b].n});}}}
  // v417: every front on your side is a place to go (Korea included), a few towns each; your own fronts first
  const by={};for(const c of out)(by[c.fr]||(by[c.fr]=[])).push(c);const fr=Object.values(by).sort((a,b)=>(b[0].mine-a[0].mine));
  return fr.flatMap(L=>L.sort((a,b)=>b.pop-a.pop).slice(0,4));}
function resolveLoc(cfg,fr,cs){if(cfg.loc0){const C=locChoices(cfg).find(c=>c.id===cfg.loc0);if(C){if(cfg.camp)cs=null,cfg._town=C.i;else return placeLoc(C.place);}}
  if(cfg.camp&&typeof CAMP!=='undefined'&&CAMP.st&&window.CAMPPLUS&&typeof cmpRaw==='function'){const st=CAMP.st,i=cs??(st.front.length>>1),fx=typeof CFX!=='undefined'?CFX[i]:0,fz=st.front[i];
    let bi=0,bd=1e18;CAMPPLUS.TOWNS.forEach((t,k)=>{const d=(t.x-fx)**2+(t.z-fz)**2;if(d<bd){bd=d;bi=k;}});if(cfg._town!=null)bi=cfg._town;const T=CAMPPLUS.TOWNS[bi];
    const h0=cmpRaw(T.x,T.z);return{name:T.nm||CTN[bi%CTN.length],pop:T.big?60000:T.n*120,real:false,H:(x,z)=>Math.max(-6,Math.min(60,(cmpRaw(T.x+x,T.z+z+260)-h0)*.8))+noise(x,z)*.15};}
  const G=window.WGEO;if(fr&&G&&G.places&&W.linePt){const mid=fr.sec[(fr.sec.length/2)|0],ll=W.linePt(mid);let best=null,bd=1e18;
    for(const pl of G.places){const d=(pl.lat-ll.lat)**2+((pl.lon-ll.lon)*Math.cos(ll.lat*Math.PI/180))**2;if(d<bd){bd=d;best=pl;}}
    if(best&&bd<1.2)return placeLoc(best);}
  return{name:'the village',pop:3000,real:false,H:noise};}
function placeLoc(best){const G=window.WGEO,lat0=best.lat,lon0=best.lon,cl=Math.cos(lat0*Math.PI/180),h0=G.coarse?G.coarse(lat0,lon0):0;
  return{name:best.name,pop:best.pop||5000,real:true,lat:best.lat,lon:best.lon,H:(x,z)=>(G.coarse?Math.max(-8,Math.min(80,(G.coarse(lat0-(z+260)/111200,lon0+x/(111200*cl))-h0))):0)+noise(x,z)*.35};}

function man(friend,x,z){const m=soldier(friend);m.position.set(x,H(x,z),z);S.sc.add(m);const u={m,friend,hp:100,alive:true,cool:1+rn()*2,tgt:null,goal:null,crouch:false,mv:0,sup:0};nameMan(u);return u;}
/* v408: every soldier in the battle is a person with a name (fictional, from the war's regional name pools, unique in
   the campaign) and a rank; your squad wears name tags. A death goes into the death ledger as a named record — who,
   which side, where, how, and whether it was by your hand — so it is found in the CEMETERY like any other. */
function nameMan(u){try{const a3=u.friend?S.cfg.a3:S.enA3;u.a3=a3;const rk=W.lead&&W.lead.rank?W.lead.rank(a3||'USA','army',rn()<.7?1:rn()<.7?2:3):'';
  const sm=u.friend&&!S.cfg.camp&&W.squad&&(S.sqi=(S.sqi||0)+1)<=6?W.squad.take(a3,S.sqi-1):null;if(sm){u.name=sm.n;u.rank=sm.rk;u.mid=sm.id;u.smRole=sm.role;}else{u.name=W.people&&W.people.name?W.people.name(a3||'USA',Math.random):'Soldier';u.rank=rk||'';}u.full=(u.rank?u.rank+' ':'')+u.name;
}catch(e){u.full=u.name||'a soldier';}}
function tagMan(u){const c=document.createElement('canvas');c.width=256;c.height=48;const g=c.getContext('2d');g.font='600 22px "B612 Mono",monospace';g.textAlign='center';g.fillStyle='rgba(10,20,30,.55)';g.fillRect(0,6,256,36);g.fillStyle='#9fd0ff';g.fillText(u.full.slice(0,22),128,32);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));sp.scale.set(1.6,.3,1);sp.position.y=2.25;sp.visible=false;u.m.add(sp);u.tag=sp;}
function tagStep(){for(const u of S.us){if(!u.tag)continue;const d=u.m.position.distanceTo(S.pos);u.tag.visible=u.alive&&d<25&&d>1.5;}}
function recordDeath(u,own,how){if(u.rec||!W.st||S.cfg.camp||!W.cemetery||!W.cemetery.record)return;u.rec=1;const p=W.st.c[u.a3];if(!p)return;
  const unit=(u.friend?(S.N&&S.N.unit)||(p.n+' infantry'):(S.EN&&S.EN.unit)||(p.n+' infantry'));
  W.cemetery.record({a3:u.a3,n:1,kind:'MIL',st:how||'KILLED',role:(u.role==='MG'?'machine gunner':u.role==='SNP'?'sniper':u.eng?'combat engineer':'rifleman'),unit,place:S.loc.name,
    cause:how==='CAPTURED'?'captured in the battle for '+S.loc.name:(own?'killed in action in the battle for '+S.loc.name+' (by the player)':'killed in action in the battle for '+S.loc.name),named:[u.full||u.name]});
  if(u.friend&&u.mid&&how!=='CAPTURED')(S.sqDead||(S.sqDead=[])).push(u.mid);
  if(u.friend)S.recF=(S.recF||0)+(how==='CAPTURED'?0:1);else S.recE=(S.recE||0)+(how==='CAPTURED'?0:1);}

/* ------------------------------------------------------------------ insertion */
function insertion(){const k=S.ins;S.ins_t=0;if(k==='TANKD'||k==='TANKG'){tankStart();return;}
  if(k==='APC'||k==='IFV'){const v=vehicle(k,0x4e5a3c);S.sc.add(v);S.carrier={m:v,from:new V3(0,0,700),to:new V3(0,0,170),dur:16};if(!S.cfg.noRide&&!S.cfg.camp&&W.st)rideSetup(v);}
  else if(k==='HELO'){const h=helo(0x46503f);S.sc.add(h);S.carrier={m:h,from:new V3(-500,90,700),to:new V3(0,0,170),dur:18};}
  else{const a=plane();S.sc.add(a);S.carrier={m:a,from:new V3(-900,600,250),to:new V3(900,600,250),dur:20,jump:.5};S.chute=null;}
  say(INS[k].toUpperCase()+(S.N[k]?' · '+S.N[k]:'')+(k==='AIR'?' · SPACE TO JUMP':' · SPACE TO SKIP'),5);}
function insertStep(dt){if(S.trip&&rideStep(dt))return;const C=S.carrier,k=S.ins;S.ins_t+=dt;const u=Math.min(1,S.ins_t/C.dur);
  if(k==='AIR'){if(!S.jumped){const p=C.from.clone().lerp(C.to,u);C.m.position.copy(p);C.m.rotation.y=-Math.PI/2;S.pos.copy(p).add(new V3(-15.6,-.6,0));if(!S.rampLook){S.yaw=Math.PI/2;S.rampLook=1;}
      if(u>=C.jump&&S.keys.Space||u>=.75){S.jumped=true;S.jt=0;S.vel.set(55,0,0);say('JUMP · SPACE OPENS THE PARACHUTE',3);}return;}
    C.m.position.x+=60*dt;S.jt+=dt;
    const g=H(S.pos.x,S.pos.z);if(!S.chute&&(S.keys.Space&&S.jt>2&&S.pos.y-g<520||S.pos.y-g<220)){S.chute=true;const c=new THREE.Mesh(new THREE.SphereGeometry(4,12,6,0,7,0,1.3),new THREE.MeshLambertMaterial({color:0x56603c}));S.sc.add(c);S.chuteM=c;say('CANOPY · STEER WITH WASD',3);}
    if(S.chute){S.vel.y+=(-5.5-S.vel.y)*Math.min(1,dt*2);const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw)),r=new V3(-f.z,0,f.x);let tx=0,tz=0;if(S.keys.KeyW){tx+=f.x*9;tz+=f.z*9;}if(S.keys.KeyS){tx-=f.x*3;tz-=f.z*3;}if(S.keys.KeyA){tx-=r.x*6;tz-=r.z*6;}if(S.keys.KeyD){tx+=r.x*6;tz+=r.z*6;}
      // drift toward your squad's landing area if nothing is pressed
      if(!tx&&!tz){const d=new V3(0-S.pos.x,0,200-S.pos.z);const L=d.length();if(L>5){tx=d.x/L*6;tz=d.z/L*6;}}
      S.vel.x+=(tx-S.vel.x)*Math.min(1,dt);S.vel.z+=(tz-S.vel.z)*Math.min(1,dt);S.chuteM.position.copy(S.pos).add(new V3(0,7,0));}
    else{S.vel.y-=9.81*dt;S.vel.y=Math.max(S.vel.y,-55);S.vel.x*=1-dt*.4;}
    S.pos.addScaledVector(S.vel,dt);if(S.pos.y<=g+1.7){S.pos.y=g+1.7;if(!S.chute&&S.vel.y<-15){hurt(200,'fall');}land();}return;}
  // vehicles and helicopter: ride in the back, look around
  const e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2,p=C.from.clone().lerp(C.to,e);if(k==='HELO'){const g=H(p.x,p.z);p.y=Math.max(g,g+C.from.y*(1-Math.min(1,Math.max(0,(u-.6)/.4))));C.m.userData.rotor.rotation.y+=dt*30;}
  else p.y=H(p.x,p.z);C.m.position.copy(p);C.m.rotation.y=0;S.pos.copy(p).add(new V3(k==='HELO'?1.6:0,k==='HELO'?2:3.4,k==='HELO'?0:1.2));
  // incoming fire near the end
  if(u>.7&&rn()<dt*.6)fx(S.pos.clone().add(new V3((rn()-.5)*20,0,-10-rn()*20)),.6);
  if(u>=1||S.keys.Space&&S.ins_t>1.5){C.m.position.copy(C.to).setY(H(C.to.x,C.to.z));land();}}
function land(){if(S.res)return;if(S.trip)rideEnd();S.phase='FIGHT';const C=S.carrier;S.pos.y=H(S.pos.x,S.pos.z)+1.7;if(S.ins!=='AIR'){S.pos.set(C.m.position.x+1.5,0,C.m.position.z+5);S.pos.y=H(S.pos.x,S.pos.z)+1.7;S.yaw=0;}
  S.vel.set(0,0,0);if(S.chuteM){S.sc.remove(S.chuteM);S.chuteM=null;}
  if(S.mission==='DEFEND'){const t=S.trench[(S.trench.length/2)|0];S.pos.set(t.x+2,H(t.x+2,t.z)+1.7,t.z);S.yaw=0;S.us.forEach(u=>u.m.visible=true);S.waveT=12;}
  else if(S.mission==='FRONT'){const L=S.lines[S.cur],t=L.slots[(L.slots.length/2)|0];S.pos.set(t.x+2,H(t.x+2,t.z)+1.7,t.z);S.yaw=0;S.us.forEach(u=>{const q=slotOf(u);u.m.position.set(q.x,H(q.x,q.z),q.z);u.m.visible=true;});}
  else S.us.forEach((u,i)=>{const x=S.pos.x+((i%3)-1)*3,z=S.pos.z+3+Math.floor(i/3)*3;u.m.position.set(x,H(x,z),z);u.m.visible=true;});
  if(S.ins==='IFV'){S.ifv={m:C.m,hp:800,side:'F',x:C.m.position.x,z:C.m.position.z,cool:2,alive:true};S.veh.push(S.ifv);}
  else if(S.ins!=='IFV')S.leave=C;{const q=clearSpot(S.pos.x,S.pos.z);if(q.x!==S.pos.x||q.z!==S.pos.z){S.pos.x=q.x;S.pos.z=q.z;S.pos.y=H(q.x,q.z)+1.7;}}say(S.mission==='FRONT'?'HOLD THE LINE · PUSH WITH O OR THE COMMAND POST (E)':S.mission==='DEFEND'?'HOLD THE TRENCHES BEFORE '+S.loc.name.toUpperCase():'TAKE AND HOLD '+S.loc.name.toUpperCase(),4);}

/* ------------------------------------------------------------------ input */
// v409: the browser refuses the mouse right after you released it (Esc) and reports it as a rejected promise; that is
// not an error: the next click on the view takes the mouse
function lockPtr(c){try{const p=c&&c.requestPointerLock&&c.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
function bind(){const c=S.cv;c.addEventListener('click',()=>{if(AU.C&&AU.C.state==='suspended')AU.C.resume();if(document.pointerLockElement!==c&&c.requestPointerLock)lockPtr(c);});
  S.onK=e=>{if(!S)return;S.keys[e.code]=e.type==='keydown';if(e.type!=='keydown')return;e.stopPropagation();
    if(e.code==='Escape'){if(S.pan){closePan();return;}if(S.res){stop(true,'LEFT');}else pauseMenu(!S.paused);return;}if(S.paused)return;if(e.code==='KeyR')reload();if(S.tk){const T=S.tk;if(e.code==='Digit1'||e.code==='Digit2'||e.code==='Digit3'){const k=['APFSDS','HEAT','HE'][+e.code.slice(-1)-1];T.load=k;T.want=k;if(T.ready&&T.sel!==k){T.ready=false;T.rt=T.rel*.8;tsay('C','Load '+TKA[k]+'!');}}if(e.code==='KeyQ'){T.zl=T.zl?0:2;}if(e.code==='KeyZ'){T.zl=((T.zl|0)+1)%3;}if(e.code==='KeyT'){T.th=!T.th;tsay('G',T.th?'Thermal.':'Day sight.');}if(e.code==='KeyF'){T.stab=!T.stab;tsay('G',T.stab?'Stabiliser on.':'Stabiliser off.');}if(e.code==='KeyV')T.ext=!T.ext;return;}if(e.code==='KeyJ')digMine();if(e.code==='KeyN')mineKey();if(e.code==='KeyC')S.crouch=!S.crouch;if(e.code==='Digit1')swap('pri');if(e.code==='Digit2'&&S.wp.lau.mag)swap('lau');if(e.code==='Digit3')swap('side');if(e.code==='KeyG')grenade();if(e.code==='KeyQ')S.ads=!S.ads;if(e.code==='KeyB')dig(true);if(e.code==='Digit5')treat('tq');if(e.code==='Digit6')treat('band');if(e.code==='Digit7')treat('kit');if(e.code==='KeyX')S.prone=!S.prone;if(e.code==='KeyO')radio('OFFENSIVE',()=>{offensive();if(S.readBy&&rn()<.6&&S.mission!=='ATTACK'){say('THEY HEARD THE ORDER · ENEMY BARRAGE ON OUR LINE',3);const L=S.mission==='FRONT'?S.lines[S.cur]:{z:S.trZ||S.pos.z};arty(new V3(0,0,L.z),6,'E');}});if(e.code==='KeyE')interact();if(e.code==='KeyK')buildCP();if(e.code==='KeyT')fallBack(true);if(e.code==='Digit4')ugl();if(e.code==='KeyZ')S.vlow=!S.vlow;if(e.code==='KeyL')S.laserOn=!S.laserOn;if(e.code==='KeyF')placeFpv();if(e.code==='KeyV')feedView();if(e.code==='KeyH')medevac();};
  S.onM=e=>{if(!S||document.pointerLockElement!==S.cv)return;if(S.tk){if(S.tk.seat==='G'&&!S.tk.ext){S.mdx=(S.mdx||0)-e.movementX;S.mdy=(S.mdy||0)+e.movementY;}else S.lookY=Math.max(-2.6,Math.min(2.6,(S.lookY||0)-e.movementX*.0022));return;}const k=S.ads?1/(S.wp[S.w].ads||1):1;S.yaw-=e.movementX*.0022*k;S.pitch=Math.max(-1.45,Math.min(1.45,S.pitch-e.movementY*.0022*k));};
  S.onD=e=>{if(!S)return;if(S.tk){if(e.button===0&&e.type==='mousedown'&&S.tk.seat==='G')fireMain();if(e.button===2)S.mb2=e.type==='mousedown';return;}if(e.button===0){S.fire=e.type==='mousedown';if(!S.fire)S.bc=0;}if(e.button===2)S.ads=e.type==='mousedown';};S.onC=e=>{if(S)e.preventDefault();};S.onR=()=>{if(!S)return;S.cam.aspect=innerWidth/innerHeight;S.cam.updateProjectionMatrix();S.R&&S.R.setSize(innerWidth,innerHeight,false);};
  addEventListener('keydown',S.onK,true);addEventListener('keyup',S.onK,true);addEventListener('mousemove',S.onM);S.cv.addEventListener('mousedown',S.onD);addEventListener('mouseup',S.onD);S.cv.addEventListener('contextmenu',S.onC);addEventListener('resize',S.onR);}
function unbind(){removeEventListener('keydown',S.onK,true);removeEventListener('keyup',S.onK,true);removeEventListener('mousemove',S.onM);removeEventListener('mouseup',S.onD);removeEventListener('resize',S.onR);if(document.pointerLockElement)document.exitPointerLock();}
function swap(w){if(S.w===w)return;S.w=w;S.reload=0;S.cool=.6;}
function reload(){const g=S.wp[S.w];if(S.reload>0||!g.mag||g.cur>=g.mag||g.res<=0)return;S.reload=g.rl*(S.sway>.3?1.5:1);SND.click();}
/* v420: threats are called on the radio (top left), not flashed in the middle of the screen */
const THREAT=/^(ENEMY HELICOPTER|FPV DRONE|ONE-WAY ATTACK DRONE|ARMED DRONE|INCOMING|ENEMY COUNTER-ATTACK|ENEMY REINFORCEMENTS|ENEMY RADIO|THEY HEARD THE ORDER|ENEMY (JET|TANK|ARMOUR|ATTACK HELICOPTER|DRONE)|MINE!|SNIPER|MORTAR|DRONE|MISSILE LAUNCH)/;
function say(t,s){if(THREAT.test(String(t))&&S&&S.phase!=='INSERT'){try{const tx=String(t).toLowerCase().replace(/(^|[.·!] *)([a-z])/g,(m,a,b)=>a+b.toUpperCase()).replace(/ · /g,'. ');vline(/INCOMING|BARRAGE|RADIO|REINFORCE|COUNTER/.test(t)?'HQ':'SQUAD',tx.endsWith('.')||tx.endsWith('!')?tx:tx+'.');return;}catch(e){}}S.msg=t;S.msgT=s||3;}

/* ------------------------------------------------------------------ combat */
const ray=new THREE.Raycaster();
function aimDir(spr){const d=new V3(0,0,-1).applyEuler(new THREE.Euler(S.pitch+(S.rec||0)+(S.swY||0),S.yaw+(S.recH||0)+(S.swX||0),0,'YXZ'));if(spr){d.x+=(rn()-.5)*spr;d.y+=(rn()-.5)*spr;d.z+=(rn()-.5)*spr;d.normalize();}return d;}
function shoot(){const g=S.wp[S.w];if(S.reload>0||S.cool>0||S.downed||S.evacMe||S.treat)return;if(g.cur<=0){reload();return;}g.cur--;S.shots++;
  if(S.w==='lau'){S.cool=1;const d=aimDir(.004);const L=lockState();if(g.guided&&!g.air&&S.atgm==='UNG'){g.guided=0;}const air=g.air?(L.locked?L.tgt:null):null;if(g.air&&!L.locked)say('NO LOCK · THE MISSILE FLIES BLIND',1.5);if(g.guided&&!g.air&&L.ff&&!L.locked)say('NO LOCK · FIRED DIRECT',1.5);
  SND.launch();S.rk.push({p:S.pos.clone().add(d.clone().multiplyScalar(1)),v:d.multiplyScalar(g.spd),t:0,g,own:true,tgt:g.air?air:(g.guided&&L.ff?(L.locked?L.tgt:null):null),sac:g.guided&&!g.air&&(S.atgm==='SACLOS'||S.atgm==='MCLOS'),mclos:S.atgm==='MCLOS',tgtP:g.guided&&!g.air&&S.atgm==='PLOS'&&S.lockTgt?plosPoint(S.lockTgt):undefined});S.lockT=0;if(g.cur<=0)reload();return;}
  S.cool=60/g.rpm;if(g.burst){S.bc++;if(S.bc>=g.burst){S.fire=false;S.bc=0;S.cool=.25;}}else if(!g.auto)S.fire=false;if(!g.quiet)S.loudT=4;SND.shot(g);if((S.shots&3)===0){const d0=aimDir(0);tracer(S.pos.clone().add(new V3(0,-.15,0)).addScaledVector(d0,1),S.pos.clone().addScaledVector(d0,Math.min(400,rayWorld(S.pos,d0,400))),S.me);}const lz=S.laserOn?(g.hipK||1):1;const mv=S.vel.length()>2?1.8*(g.moveK||1):1,spr=g.spr*(S.ads?.35:lz)*(S.crouch?.7*(g.crouchK||1):1)*mv;let r=null;for(let i=0;i<(g.pel||1);i++)r=hitscan(S.pos,aimDir(g.pel?g.spr:spr),g.dmg,true)||r;
  recoil(g);try{if(window.INFNET)INFNET.shot(S.pos.clone(),aimDir(0),g.dmg,'gun');}catch(e){}if(g.cur<=0)reload();return r;}
/* v407: RECOIL — each shot kicks the muzzle up (part of it stays: you pull it down) and a little to the side; heavier
   cartridges kick harder; a compensator or brake, a grip, a stock, crouching, lying down and a bipod reduce it. */
const RC={CARB:.010,RIFLE:.012,SMG:.007,SHOT:.055,LMG:.011,DMR:.024,SNP:.05,PISTOL:.022};
function recoil(g){const big=g.dmg>=45&&g.cls!=='SNP'?1.35:1;const bip=g.crouchK<1&&(S.crouch||S.crawl);
  const k=(RC[g.cls]||.012)*big*(g.kickK||1)*(g.gripK||1)*(g.stockK||1)*(S.crawl?.55:S.crouch?.8:1)*(bip?.3:1)*(.85+rn()*.3);
  S.pitch+=k*.35;S.rec=(S.rec||0)+k*.65;S.recH=(S.recH||0)+(rn()-.42)*k*.5;S.vk=Math.min(.12,(S.vk||0)+k*2.5);}
/* SWAY — the aim drifts in a slow figure-eight with breathing: more standing, moving, tired, hurt or with a heavy
   weapon; less crouched, lying down, on a bipod or resting the weapon on cover. Hold Shift while aiming to hold your
   breath: steadier for a few seconds, then shakier until you breathe again. */
const SWW={SNP:1.25,LMG:1.4,DMR:1.1,SHOT:1,CARB:.9,SMG:.85,RIFLE:1,PISTOL:1.2};
function aimStep(dt){const g=S.wp[S.w]||{};S.rec=(S.rec||0)*(1-Math.min(1,dt*7));S.recH=(S.recH||0)*(1-Math.min(1,dt*5));S.vk=(S.vk||0)*(1-Math.min(1,dt*12));
  const run=S.keys.ShiftLeft&&!S.ads,mv=S.vel?Math.hypot(S.vel.x,S.vel.z):0;S.fat=Math.max(0,Math.min(1,(S.fat||0)+(run&&mv>4?dt*.1:-dt*.04)));
  const hold=S.ads&&S.keys.ShiftLeft;if(hold)S.br=(S.br||0)+dt;else S.br=Math.max(0,(S.br||0)-dt*1.5);const bk=hold?(S.br<5?.25:2.2):S.br>5?1.6:1;
  if(hold&&S.br>=5&&!S.brSaid){S.brSaid=1;say('OUT OF BREATH',1);}if(!hold)S.brSaid=0;
  let rest=false;if(S.ads){const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw));const o=S.pos.clone().add(new V3(0,-.35,0));rest=rayWorld(o,f,.9)<.9;}
  const bip=g.crouchK<1&&(S.crouch||S.crawl||rest);
  const A=(S.ads?.0042:.008)*(SWW[g.cls]||1)*(S.crawl?.35:S.crouch?.6:1)*(bip?.2:rest?.45:1)*(mv>.5?2.5:1)*(1+2*S.fat)*(1+2*(S.sway||0))*bk;
  const t=S.t;S.swX=A*(Math.sin(t*.9)+.4*Math.sin(t*2.3+1));S.swY=A*(.6*Math.sin(t*1.8)+.3*Math.sin(t*.7))+A*.5*Math.sin(t*1.6)*(hold&&S.br<5?.2:1);S.rested=rest||bip;}
function pickVeh(){let b=null,bd=1e9;for(const v of S.veh)if(v.alive&&v.side==='E'){const d=Math.hypot(v.x-S.pos.x,v.z-S.pos.z);if(d<bd){bd=d;b=v;}}return b;}
function hitscan(o,d,dmg,own){S.sc.updateMatrixWorld();const tS=rayWorld(o,d,900);ray.set(o.clone().add(S.O),d);ray.far=Math.min(900,tS);const targets=[];const owner=new Map();
  for(const u of[...S.us,...S.them])if(u.alive)u.m.traverse(x=>{if(x.isMesh&&x.userData.part){targets.push(x);owner.set(x,u);}});
  if(own&&S.civ)for(const c of S.civ)if(c.alive)c.m.traverse(x=>{if(x.isMesh&&x.userData.part){targets.push(x);owner.set(x,c);}});
  const vown=new Map();if(own)for(const v of S.veh)if(v.alive)v.m.traverse(x=>{if(x.isMesh){targets.push(x);vown.set(x,v);}});
  if(own)for(const dr of S.drones){if(!dr.alive)continue;const c=dr.m.position,t=c.clone().sub(o).dot(d);if(t<0||t>900)continue;const cl=o.clone().addScaledVector(d,t);
    if(cl.distanceTo(c)<(dr.k==='FPV'?.6:dr.k==='OWA'?1.8:4)){if(tS>t){hitDrone(dr,dmg,true);S.hits++;mark(false);return dr;}}}
  const hs=ray.intersectObjects(targets,false);if(!hs.length){if(tS<900)fx(o.clone().addScaledVector(d,tS),.15);return null;}const h=hs[0],u=owner.get(h.object);
  {const v=vown.get(h.object);if(v){if(v.side==='E')armorHit(v,h.point.clone().sub(S.O),d.clone(),S.wp[S.w].pen||S.cfg.pri);fx(h.point.clone().sub(S.O),.1);return null;}}
  if(!u){fx(h.point.clone().sub(S.O),.15);return null;}
  if(u.civ){civHit(u,dmg,own);return null;}
  const part=h.object.userData.part,k=part==='head'?2.6:part==='legs'||part==='arms'?.7:1;if(u.alive&&part!=='head')npcWound(u,part,dmg*k);hitMan(u,dmg*k,own);if(own){S.hits++;mark(part==='head');}return u;}
function hitMan(u,dmg,own){if(!u.alive)return;u.hp-=dmg;u.sup=2;if(u.hp<=0){u.alive=false;u.m.rotation.x=-Math.PI/2;u.m.position.y+=.3;if(u.friend&&rn()<.6&&dmg<200){u.down=true;S.wia++;}else if(u.friend){S.lost++;recordDeath(u,own);if(own){say('FRIENDLY FIRE · '+(u.full||'').toUpperCase(),3);S.ff=(S.ff||0)+1;}else if(u.m.position.distanceTo(S.pos)<40)say((u.full||'').toUpperCase()+' IS KILLED',2);}else{recordDeath(u,own);if(own){S.kills++;say('KILLED · '+(u.full||'ENEMY SOLDIER').toUpperCase(),1.6);}}}}
function mark(hd){const e=document.getElementById('iHit');if(e){e.style.color=hd?'#ff5a4a':'#fff';e.style.opacity=1;clearTimeout(mark.t);mark.t=setTimeout(()=>e.style.opacity=0,120);}}
function hurt(d,why){if(S&&S.tk&&why==='bullet')return;   // v414: rifle fire rings off the armour
if(why==='bullet')SND.hit();let k=1,part='torso';if(why==='bullet'){const z=rn();if(z<.12){d*=1.8;k=S.arm.head;S.lastZone='head';part='head';}else if(z<.62){k=S.arm.k;S.lastZone='torso';}else{d*=.7;k=S.arm.limb;S.lastZone='limb';part=['armL','armR','legL','legR','legL','legR'][(rn()*6)|0];}}
  if(S.body&&S.hp<1e6&&!S.downed){if(why==='bullet')wound(part,d*k,why);else if(why==='blast'){for(let i=0;i<2;i++)wound(['torso','armL','armR','legL','legR'][(rn()*5)|0],d*.4,why);}}S.lastHurt={d:Math.round(d*k),why,stk:(new Error().stack||'').split('\n').slice(2,5).join('<')};if(S.downed){if(d*k>25)end('KIA');return;}S.hp-=d*k;const e=document.getElementById('iDmg');if(e){e.style.opacity=.8;setTimeout(()=>e.style.opacity=0,250);}if(S.hp<=0){if(d*k<160&&S.medN<3&&S.phase==='FIGHT'){S.hp=1;S.downed=true;S.downT=40;S.med=null;medevac(true);say('YOU ARE DOWN · MEDEVAC CALLED · HOLD ON',4);}else end('KIA');}}
function grenade(){if(S.gren<=0||S.phase!=='FIGHT')return;S.gren--;const d=aimDir(0);S.gnades.push({p:S.pos.clone(),v:d.multiplyScalar(18).add(new V3(0,4,0)),t:0,own:true});}
function blast(p,r,dmg,own){fx(p,1.4);SND.boom(p,r);if(r>=5)scar(p,r);if(S.civ)for(const c of S.civ){if(!c.alive)continue;const d=c.m.position.distanceTo(p);if(d<r)civHit(c,dmg*(1-d/r),own);}for(const u of[...S.us,...S.them]){if(!u.alive)continue;const d=u.m.position.distanceTo(p);if(d<r)hitMan(u,dmg*(1-d/r),own);}
  for(const v of S.veh){if(!v.alive)continue;const d=Math.hypot(v.x-p.x,v.z-p.z);if(d<4)hitVeh(v,dmg,own);}
  const d=S.pos.distanceTo(p);if(d<r)hurt(dmg*(1-d/r)*.8,'blast');}
function hitVeh(v,dmg,own){if(v.me&&S.tk){tankHit(dmg);return;}if(v.decoy&&v.alive){v.alive=false;v.m.scale.y=.25;v.m.position.y-=.3;if(own){S.decoys=(S.decoys||0)+1;say('A DECOY · INFLATABLE MOCK-UP · DEFLATED',2.5);}return;}v.hp-=dmg;if(v.hp<=0&&v.alive){v.alive=false;S.fires.push({p:v.m.position.clone().setY(v.m.position.y+2.5),t:0});fx(v.m.position.clone().setY(v.m.position.y+2),3);v.m.traverse(x=>{if(x.isMesh)x.material=new THREE.MeshLambertMaterial({color:0x222018});});if(own&&v.side==='E'){S.kills++;S.vk=(S.vk||0)+1;say('VEHICLE DESTROYED',2);}}}
const fxL=[];function fx(p,s){const m=new THREE.Mesh(new THREE.SphereGeometry(s,8,6),new THREE.MeshBasicMaterial({color:0xffb050,transparent:true,opacity:.9}));m.position.copy(p);S.sc.add(m);fxL.push({m,t:0});}

function ai(u,dt,foes){if(!u.alive)return;u.cool-=dt;
  if(u.cool<=0)for(const dr of S.drones){if(!dr.alive||(dr.side==='F')===u.friend||dr.k==='MALE')continue;if(dr.m.position.distanceTo(u.m.position)<60){u.cool=.4;if(rn()<.12)hitDrone(dr,30,false);break;}}u.sup=Math.max(0,u.sup-dt);const P=u.m.position;
  // target: nearest live foe in 320 m (the player counts as a friendly)
  if(!u.tgt||!u.tgt.alive||rn()<dt*.3){let b=null,bd=u.role==='SNP'?750:u.role==='MG'?450:320;for(const f of foes){if(!f.alive)continue;const d=f.m.position.distanceTo(P);if(d<bd){bd=d;b=f;}}
    if(!u.friend&&S.phase==='FIGHT'&&!S.downed&&!S.evacMe){const d=S.pos.distanceTo(P),g=S.wp[S.w],det=(S.loudT>0?1.3:.85)*((g.seen||g.light)&&S.laserOn?1.25:1);if(d<bd*1.1*det)b={alive:true,player:true,m:{position:S.pos}};}u.tgt=b;}
  const goal=S.mission==='FRONT'?frontGoal(u):u.off?new V3((u.ox??=(rn()-.5)*120),0,S.mission==='DEFEND'?S.trZ-350:S.village.z+(u.oz??=(rn()-.5)*40)):S.mission==='DEFEND'?(u.friend?u.slot:new V3((u.ox??=(rn()-.5)*300),0,S.trZ)):u.friend?(S.phase==='FIGHT'?S.village.clone().add(new V3((u.ox??=(rn()-.5)*30),0,(u.oz??=(rn()-.5)*30)+(S.hold>0?0:40))):null):S.village.clone().add(new V3((u.ox??=(rn()-.5)*80),0,(u.oz??=(rn()-.5)*80)));
  let mv=0,spd=0;const p0x=P.x,p0z=P.z;const lame=u.crawl||u.wounded?.22:(u.leg??100)<50?.55:1;
  if(u.wounded||u.treating){const g2=u.treating?u.treating.m.position.clone():P.clone().add(new V3(0,0,u.friend?40:-40));const d2=g2.sub(P).setY(0);if(d2.length()>1.5){d2.normalize();P.x+=d2.x*(u.treating?3.5:.8)*dt;P.z+=d2.z*(u.treating?3.5:.8)*dt;u.m.rotation.y=Math.atan2(-d2.x,-d2.z);}
    const gy0=H(P.x,P.z);P.y=gy0;animMan(u,dt,u.treating?3:.5);return;}
  // bounding: in a fight, now and then dash 6-14 m toward the objective or sideways to new cover, then go to ground and fire
  u.bt=(u.bt??(2+rn()*5))-dt;if(u.tgt&&!u.slot&&!(S.mission==='FRONT'&&!u.assault)&&u.bt<=0&&!u.bound){u.bt=4+rn()*6;const base=goal?goal.clone().sub(P).setY(0):new V3(rn()-.5,0,rn()-.5);base.normalize();const sd=new V3(-base.z,0,base.x).multiplyScalar((rn()-.5)*14);u.bound=P.clone().addScaledVector(base,6+rn()*8).add(sd);u.boundT=3.5;}
  if(u.bound){u.boundT-=dt;const d=u.bound.clone().sub(P).setY(0);if(d.length()<1||u.boundT<=0)u.bound=null;else{d.normalize();P.x+=d.x*4.6*lame*dt;P.z+=d.z*4.6*lame*dt;mv=1;u.crouch=false;u.m.rotation.y=Math.atan2(-d.x,-d.z);}}
  if(!u.bound&&goal&&(!u.tgt||u.sup>0&&u.friend||u.assault)){const d=goal.clone().sub(P).setY(0);if(d.length()>3){d.normalize();P.x+=d.x*2.6*lame*dt;P.z+=d.z*2.6*lame*dt;mv=1;u.m.rotation.y=Math.atan2(-d.x,-d.z);}}
  if(u.tgt&&!u.bound){const tp=u.tgt.m.position,d=tp.clone().sub(P);u.m.rotation.y=Math.atan2(-d.x,-d.z);const L=d.length();if(!mv&&u.cr0===undefined)u.cr0=rn()<.6;u.crouch=!mv&&u.cr0;
    if(L>60&&!mv&&u.friend&&S.phase==='FIGHT'&&S.mission!=='DEFEND'&&S.mission!=='FRONT'){d.setY(0).normalize();P.x+=d.x*2*dt;P.z+=d.z*2*dt;}
    if(u.cool<=0){const o0=P.clone().setY(P.y+(u.crouch?1.05:1.4)),aim=tp.clone().setY(tp.y+(u.tgt.player?0:1.3));
      // v407: no shooting at walls: without a line of sight the soldier moves to get one (sideways, then forward) instead
      if(!los(o0,aim)){u.cool=.35+rn()*.3;u.blind=(u.blind||0)+1;if(!u.bound&&!u.spot&&u.blind>2){u.blind=0;const dd=aim.clone().sub(P).setY(0).normalize();const sd=new V3(-dd.z,0,dd.x).multiplyScalar((rn()<.5?-1:1)*(4+rn()*5));u.bound=P.clone().add(sd).addScaledVector(dd,rn()*4);u.boundT=3;}}
      else{u.blind=0;
    u.cool=(.5+rn()*1.2)*(u.role==='MG'?.18:u.role==='SNP'?3.5:1);const o=o0;if(rn()<.6)SND.far(o,false);if(u.m.userData.J)u.m.userData.J.rec=1;{const te=tp.clone().setY(tp.y+(u.tgt.player?-.2:1.2)).add(new V3((rn()-.5)*2,(rn()-.5)*1.5,(rn()-.5)*2));const dv=te.clone().sub(o),dl=dv.length();dv.divideScalar(dl||1);const hit=Math.min(dl,rayWorld(o,dv,dl));tracer(o,o.clone().addScaledVector(dv,hit),u.friend?S.me:S.en);}
      const acc=(u.wounded?0:1)*(u.friend?(S.mFr||1):1)*((u.arm??100)<50?.5:1)*(u.role==='SNP'?Math.max(.3,.9-L/1500):Math.max(.04,.55-L/500)*(u.role==='MG'?.7:1))*(u.sup>0?.5:1)*(u.tgt.player?(S.crouch?.6:1)*(S.vel.length()>3?.6:1):1);
      if(los(o,tp.clone().setY(tp.y+(u.tgt.player?0:1.3)))){if(rn()<acc){if(u.tgt.player)hurt(14+rn()*10,'bullet');else hitMan(u.tgt,(22+rn()*14)*(u.role==='SNP'?2.6:1),false);}
        else if(u.tgt.player&&L<120){S.near=.3;if(rn()<.5)SND.whiz(S.pos.clone().add(new V3((rn()-.5)*3,0,(rn()-.5)*3)));}}}}}
  const gy=H(P.x,P.z),top=collide(P,P.y,P.y+1.7,.35);P.y=Math.max(gy,top>-1e8?top:gy);spd=Math.hypot(P.x-p0x,P.z-p0z)/Math.max(dt,1e-3);animMan(u,dt,spd);
  // v407: smarter movement — a soldier who meant to move but is held by a wall steps round it (left or right, toward
  // the open side); one under fire in the open runs to the nearest building corner or into a trench
  if(mv&&spd<.4){u.stk=(u.stk||0)+dt;if(u.stk>.8&&!u.bound){u.stk=0;const fw=new V3(-Math.sin(u.m.rotation.y),0,-Math.cos(u.m.rotation.y));const sd=new V3(-fw.z,0,fw.x);const side=(u.sideP=u.sideP||(rn()<.5?1:-1));
      const t1=P.clone().addScaledVector(sd,side*4),t2=P.clone().addScaledVector(sd,-side*4);const ok1=!collideTest(t1),pick=ok1?t1:t2;u.bound=pick.addScaledVector(fw,2);u.boundT=2;}}else u.stk=0;
  if(u.sup>.5&&!u.spot&&!u.bound&&!u.cov&&cut(P.x,P.z)<1&&rn()<dt*.6){const c=coverNear(P,u.tgt?u.tgt.m.position:null);if(c){u.bound=c;u.boundT=4;u.cov=6;}}if(u.cov)u.cov=Math.max(0,u.cov-dt);}
/* v422: never spawn inside a building: the nearest open ground outside every footprint */
function inBld(x,z){for(const b of S.BLD||[]){if(!b||b.down||b.w==null)continue;if(Math.abs(x-b.x)<b.w/2+1&&Math.abs(z-b.z)<b.d/2+1)return true;}return false;}
function clearSpot(x,z){const free=(x,z)=>!inBld(x,z)&&!collideTest(new V3(x,0,z));if(free(x,z))return{x,z};for(let r=2;r<=80;r+=2)for(let a=0;a<12;a++){const t=a/12*Math.PI*2,nx=x+Math.cos(t)*r,nz=z+Math.sin(t)*r;if(free(nx,nz))return{x:nx,z:nz};}return{x,z};}
function collideTest(p){for(const b of near(p.x-1,p.z-1,p.x+1,p.z+1,_nb)){if(b.gone||b.y1-b.y0<1.2)continue;if(p.x>b.x0-.4&&p.x<b.x1+.4&&p.z>b.z0-.4&&p.z<b.z1+.4)return true;}return false;}
function coverNear(P,threat){let best=null,bd=18;for(const b of near(P.x-18,P.z-18,P.x+18,P.z+18,_nb)){if(b.gone||b.y1-b.y0<1.2)continue;const cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;const d=Math.hypot(cx-P.x,cz-P.z);if(d>=bd)continue;
    let tx=cx,tz=cz;if(threat){const dx=cx-threat.x,dz=cz-threat.z,l=Math.hypot(dx,dz)||1;tx=cx+dx/l*(Math.max(b.x1-b.x0,b.z1-b.z0)/2+.8);tz=cz+dz/l*(Math.max(b.x1-b.x0,b.z1-b.z0)/2+.8);}bd=d;best=new V3(tx,0,tz);}
  if(!best&&TR.n){for(let r=2;r<16;r+=2)for(let a=0;a<6.28;a+=.8){const x=P.x+Math.cos(a)*r,z=P.z+Math.sin(a)*r;if(cut(x,z)>1)return new V3(x,0,z);}}return best;}
/* v407: VOICES AT CLOSE RANGE — soldiers near you speak: your squad calls out (contact, reloading, moving, man down);
   enemies at a few metres shout, and a wounded or cornered one begs or gives up. Subtitles; enemy lines in their
   language with a translation. */
const VL={F:{contact:['Contact front!','Enemy, close!','Eyes left — movement!'],reload:['Reloading!','Changing mag!'],move:['Moving!','Cover me, I\'m moving!'],down:['Man down!','Medic! We\'ve got wounded!']},
  RU:{shout:['Стой! (Stop!)','Граната! (Grenade!)','Он здесь! (He\'s here!)'],beg:['Не стреляй! Сдаюсь! (Don\'t shoot! I surrender!)','Пожалуйста… у меня дети… (Please… I have children…)','Не надо! Я ранен! (Don\'t! I\'m wounded!)']},
  EN:{shout:['Contact! He\'s right there!','Frag out!','Push him!'],beg:['Don\'t shoot! I give up!','Please — I\'m hit, I\'m done!','Okay, okay! Hands up!']}};
// voice lines are shown like the RIO's intercom calls: small lines low on the left, a coloured tag, fading out
// v420: talk in the back of the vehicle as subtitles: each line stays until the next one, timed by its length
// v422: who speaks where. Your men and your crew talk on the intercom: low on the left, like the RIO in the jet.
// HQ and everything heard over the radio: the radio box top left.
const RADIO=w=>/^(HQ|ENEMY|RADIO|BRIGADE|ARTILLERY|AIR|OPERATOR)/.test(String(w));
function crewLine(who,txt,hold){let el=document.getElementById('iCrew');if(!el){el=document.createElement('div');el.id='iCrew';el.style.cssText='position:fixed;left:14px;bottom:92px;z-index:9991;display:flex;flex-direction:column;gap:4px;pointer-events:none;font:600 15px "B612",sans-serif;max-width:52vw';document.body.appendChild(el);}
  const d=document.createElement('div');d.style.cssText='background:rgba(11,15,13,.5);padding:3px 10px;color:#eef2ec;transition:opacity 2.5s;opacity:1';d.innerHTML='<b style="color:#ffc46a;margin-right:10px">'+esc(who)+'</b>'+esc(txt);el.append(d);
  while(el.children.length>3)el.firstChild.remove();const h=hold||Math.max(5500,2500+String(txt).length*75);setTimeout(()=>{d.style.opacity='0';},h);setTimeout(()=>d.remove(),h+2700);}
function rideSub(who,txt,hold){if(RADIO(who))radioLine(who,txt,hold);else crewLine(who,txt,hold);}
function vline(who,txt){if(S&&S.trip&&S.trip.lines){S.trip.lines.splice(S.trip.li,0,[who,txt]);return;}   // v421: during the ride every call joins the subtitle queue
  if(!RADIO(who)){crewLine(who,txt);return;}radioLine(who,txt);}
function radioLine(who,txt,hold0){let el=document.getElementById('iVoice');if(!el){el=document.createElement('div');el.id='iVoice';el.style.cssText='position:fixed;left:14px;top:14px;z-index:9991;display:flex;flex-direction:column;gap:4px;pointer-events:none;font:600 14px "B612",sans-serif';document.body.appendChild(el);}
  const d=document.createElement('div');d.style.cssText='background:rgba(11,15,13,.5);padding:3px 10px;color:#eef2ec;transition:opacity 2.5s;opacity:1;max-width:46vw';d.innerHTML='<b style="color:'+(who==='ENEMY'?'#ff8a6a':'#ffc46a')+';margin-right:10px">'+esc(who)+'</b>'+esc(txt);el.append(d);
  while(el.children.length>4)el.firstChild.remove();const hold=hold0||Math.max(5500,2500+String(txt).length*75);setTimeout(()=>{d.style.opacity='0';},hold);setTimeout(()=>d.remove(),hold+2700);}
function voiceStep(dt){if(S.phase!=='FIGHT')return;S.vT=(S.vT||0)-dt;if(S.vT>0)return;const P=S.pos;const say2=(t,c)=>{const i=t.indexOf(': ');vline(t.slice(0,i),t.slice(i+2));S.vT=3+rn()*3;S.vlines=(S.vlines||0)+1;};
  const en=S.them.filter(u=>u.alive&&!u.pow&&u.m.position.distanceTo(P)<12).sort((a,b)=>a.m.position.distanceTo(P)-b.m.position.distanceTo(P))[0];
  const lang=S.en==='R'?VL.RU:VL.EN;
  if(en){const hurt=en.hp<45||en.wounded;if(hurt||(en.m.position.distanceTo(P)<5&&rn()<.3)){say2('ENEMY: '+lang.beg[(rn()*lang.beg.length)|0]);if(hurt&&rn()<.35){en.pow=true;en.alive=false;en.m.rotation.x=0;S.pows=(S.pows||0)+1;recordDeath(en,true,'CAPTURED');}return;}
    say2('ENEMY: '+lang.shout[(rn()*lang.shout.length)|0]);return;}
  const mate=S.us.find(u=>u.alive&&u.m.position.distanceTo(P)<15);if(!mate)return;const down=S.us.find(u=>u.down&&u.m.position.distanceTo(P)<30);
  const k=down?'down':mate.tgt?'contact':mate.bound?'move':rn()<.3?'reload':null;if(k&&rn()<.5)say2('SQUAD: '+VL.F[k][(rn()*VL.F[k].length)|0]);else S.vT=2;}

function collide(P,feet,head,r){let top=-1e9;for(const b of near(P.x-r-1,P.z-r-1,P.x+r+1,P.z+r+1,_nb)){if(b.gone||b.wb&&!b.wb[7])continue;if(P.x<b.x0-r||P.x>b.x1+r||P.z<b.z0-r||P.z>b.z1+r)continue;
    if(b.y1<=feet+.45){if(P.x>b.x0-.05&&P.x<b.x1+.05&&P.z>b.z0-.05&&P.z<b.z1+.05)top=Math.max(top,b.y1);continue;}if(b.y0>=head)continue;
    const dx0=P.x-(b.x0-r),dx1=(b.x1+r)-P.x,dz0=P.z-(b.z0-r),dz1=(b.z1+r)-P.z,m=Math.min(dx0,dx1,dz0,dz1);if(m===dx0)P.x=b.x0-r;else if(m===dx1)P.x=b.x1+r;else if(m===dz0)P.z=b.z0-r;else P.z=b.z1+r;}return top;}
function los(a,b){const d=b.clone().sub(a),L=d.length();if(L<.5)return true;d.divideScalar(L);return rayWorld(a,d,L-.4)>=L-.4;}

function step(dt){if(!S||S.res||S.paused||S.panP)return;S.t+=dt;try{if(window.INFNET)INFNET.step(dt);}catch(e){}S.msgT-=dt;S.sc.updateMatrixWorld();
  if(S.phase==='INSERT'){insertStep(dt);}
  else if(S.tk){tankStep(dt);}
  else{// player movement
    const g=S.wp[S.w],f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw)),r=new V3(-f.z,0,f.x);let sp=(S.keys.ShiftLeft&&!S.ads&&!S.limp&&!S.crawl?6.2:3.4)*(S.crawl?.28:S.limp?.6:1)*(S.crouch?.5:1)*S.arm.spd*(g.slow||1)*(S.ads?.6:1);
    const w=new V3();if(S.keys.KeyW)w.add(f);if(S.keys.KeyS)w.sub(f);if(S.keys.KeyD)w.add(r);if(S.keys.KeyA)w.sub(r);if(w.lengthSq())w.normalize().multiplyScalar(sp);
    if(S.downed||S.ride||S.evacMe){w.set(0,0,0);}S.vel.x=w.x;S.vel.z=w.z;const gr=H(S.pos.x,S.pos.z),eye=S.crawl?.45:S.crouch?1.1:1.7;if(S.vel.y===0&&S.keys.Space&&!S.crouch)S.vel.y=4.2;S.vel.y-=9.81*dt;const px0=S.pos.x,pz0=S.pos.z;S.pos.addScaledVector(S.vel,dt);
    {const fl=S.pos.y-eye,tall=(x,z)=>H(x,z)-fl>1.0;if(tall(S.pos.x,S.pos.z)){if(S.keys.Space&&H(S.pos.x,S.pos.z)-fl<2.3&&!S.downed){S.pos.y=H(S.pos.x,S.pos.z)+eye;say('CLIMBED OUT',1);}else{const nx=S.pos.x,nz=S.pos.z;   /* v421: slide along the trench wall instead of stopping dead */
      if(!tall(nx,pz0)){S.pos.z=pz0;}else if(!tall(px0,nz)){S.pos.x=px0;}else{S.pos.x=px0;S.pos.z=pz0;}}}}   // v407: a trench wall stops you; Space climbs
    {const feet=S.pos.y-eye,top=collide(S.pos,feet,S.pos.y+.1,.3),fl=Math.max(gr,top);if(S.pos.y<fl+eye){S.pos.y=Math.min(fl+eye,S.pos.y+Math.max(.0,fl+eye-S.pos.y));S.vel.y=0;}}
    if(!S.WM){S.pos.x=Math.max(-1150,Math.min(1150,S.pos.x));S.pos.z=Math.max(-1150,Math.min(1150,S.pos.z));}
    S.cool-=dt;if(S.reload>0){S.reload-=dt;if(S.reload<=0){const n=Math.min(g.mag-g.cur,g.res);g.cur+=n;g.res-=n;}}if(S.fire)shoot();
    if(S.leave){const C=S.leave;C.t=(C.t||0)+dt;if(S.ins==='HELO'){C.m.position.y+=dt*12;C.m.position.z+=dt*30*Math.min(1,C.t/4);C.m.userData.rotor.rotation.y+=dt*30;}else C.m.position.z+=dt*9;if(C.t>30){S.sc.remove(C.m);S.leave=null;}}
    // objective: hold the village with no enemy close
    if(S.mission==='FRONT')frontStep(dt);else if(S.mission==='DEFEND')defendStep(dt);else{const inZone=Math.hypot(S.pos.x-S.village.x,S.pos.z-S.village.z)<25,enemyNear=S.them.some(u=>u.alive&&u.m.position.distanceTo(S.village)<45);
    if(inZone&&!enemyNear){S.hold+=dt;if(S.hold>=30)end('WON');}else S.hold=Math.max(0,S.hold-dt*.5);
    S.waveT-=dt;if(S.waveT<=0&&S.them.filter(u=>u.alive).length<6){S.waveT=80;const n=4;for(let i=0;i<n;i++)S.them.push(man(false,S.village.x+(rn()-.5)*60,S.village.z-160-rn()*40));say('ENEMY REINFORCEMENTS FROM THE NORTH',3);}}
    S.heliT-=dt;if(S.heliT<=0&&!S.eheli){const h=helo(0x6a5a3a);h.position.set(400,80,-500);S.sc.add(h);S.eheli={m:h,hp:500,alive:true,cool:3,t:0};say('ENEMY HELICOPTER',3);S.heliT=1e9;}}
  droneStep(dt);if(!S.WM)airStep(dt);else casOnly(dt);casStep(dt);bombStep(dt);cqbStep(dt);voiceStep(dt);tagStep();civStep(dt);lodStep(dt);if(TR.G.length>48&&Math.hypot(S.pos.x-(TR.sx||0),S.pos.z-(TR.sz||0))>30)trSync();vehStep(dt);mineStep(dt);battleStep(dt);v381Step(dt);v390Step(dt);lockStep(dt);bodyStep(dt);npcStep(dt);iwStep(dt);v385Step(dt);audioStep(dt);tracerStep(dt);ambient(dt);precipStep(dt);if(S.dirtyB&&S.dirtyB.size){for(const c of S.dirtyB)mergeB(c);S.dirtyB.clear();}
  // AI
  const all=[...S.us,...S.them];for(const u of S.us)ai(u,dt,S.them);for(const u of S.them)ai(u,dt,S.us);
  for(const v of S.veh){if(!v.alive)continue;v.cool-=dt;const foes=v.side==='F'?S.them:S.us;let b=null,bd=500;for(const f of foes){if(!f.alive)continue;const d=f.m.position.distanceTo(v.m.position);if(d<bd){bd=d;b=f.m.position;}}
    if(v.side==='E'&&S.phase==='FIGHT'&&!S.downed&&!S.evacMe&&S.pos.distanceTo(v.m.position)<bd)b=S.pos;
    if(v.nofire||(v.tank&&!v.me))continue;if(v.me)continue;if(b&&v.cool<=0){v.cool=v.side==='F'?1.2:2.5;if(v.m.userData.tu){const P2=v.m.position;v.m.userData.tu.rotation.y=Math.atan2(-(b.x-P2.x),-(b.z-P2.z))-v.m.rotation.y;}tracer(v.m.position.clone().setY(v.m.position.y+2.4),b.clone().setY(b.y+.8),v.side==='F'?S.me:S.en,true);const o=v.m.position.clone().setY(v.m.position.y+2.8);if(los(o,b.clone().setY(b.y+.8))){const hp=b.clone().add(new V3((rn()-.5)*6,0,(rn()-.5)*6));blast(hp,4,90,false);}}}
  if(S.eheli&&S.eheli.alive){const h=S.eheli;h.t+=dt;h.m.userData.rotor.rotation.y+=dt*30;const c=S.village;h.m.position.set(c.x+Math.cos(h.t*.15)*220,H(c.x,c.z)+70,c.z+Math.sin(h.t*.15)*220);h.cool-=dt;
    if(h.cool<=0&&S.phase==='FIGHT'){h.cool=4;const fr=S.us.find(u=>u.alive);if(fr||!(S.downed||S.evacMe)){const tg=(rn()<.4&&!S.downed&&!S.evacMe)||!fr?S.pos.clone():fr.m.position.clone();blast(tg.add(new V3((rn()-.5)*12,0,(rn()-.5)*12)),6,110,false);}}}
  // projectiles
  for(let i=S.rk.length-1;i>=0;i--){const k=S.rk[i];k.t+=dt;if(apsCheck(k)){S.rk.splice(i,1);continue;}
    if(k.tgtP&&k.plos)k.tgtP.copy(plosPoint(k.plos));if(k.sac&&S.w==='lau'&&S.ads){if(k.mclos&&rn()<.3)continue;const ad=aimDir(0),t=Math.min(2000,rayWorld(S.pos,ad,2000));const aim=S.pos.clone().addScaledVector(ad,t);const d=aim.sub(k.p).normalize().multiplyScalar(k.g.spd);k.v.lerp(d,Math.min(1,dt*4));}
    // your ATGM flies a top-attack profile: up over its target, then down onto the roof
    if(k.own&&k.g.guided&&k.tgt&&k.tgt.alive){const tp=k.tgt.m.position,dh=Math.hypot(tp.x-k.p.x,tp.z-k.p.z);const aim=tp.clone().setY(tp.y+(dh>45?Math.min(70,dh*.45):1.2));const d=aim.sub(k.p).normalize().multiplyScalar(k.g.spd);k.v.lerp(d,Math.min(1,dt*3));k.top=dh<45;}
    else if(k.tgtP&&!k.tgt){const d=k.tgtP.clone().sub(k.p).normalize().multiplyScalar(k.g.spd);k.v.lerp(d,Math.min(1,dt*4));}
    if(k.tgt&&k.tgt.alive&&!(k.own&&k.g.guided)){const tp=k.tgt.m.position.clone().setY(k.tgt.m.position.y+1.5),d=tp.sub(k.p).normalize().multiplyScalar(k.g.spd);k.v.lerp(d,Math.min(1,dt*3));}
    else k.v.y-=(k.g.air?0:3)*dt;k.p.addScaledVector(k.v,dt);let hit=null;
    for(const v of S.veh)if(v.alive&&Math.hypot(v.x-k.p.x,v.z-k.p.z)<3.5&&k.p.y<v.m.position.y+3.5){if(k.own&&v.side==='E')armorHit(v,k.p.clone(),k.v.clone().normalize(),k.g.guided?'ATGM':'RPG');else hitVeh(v,k.g.dmg,k.own);hit=1;}
    for(const dr of S.drones)if(dr.alive&&k.own&&k.p.distanceTo(dr.m.position)<(dr.k==='MALE'?10:5)){hitDrone(dr,k.g.dmg,true);hit=1;}
    if(k.own&&k.g.air)for(const a of S.air||[])if(a.alive&&a.side==='E'&&k.p.distanceTo(a.m.position)<14){a.alive=false;a.vy=0;hit=1;S.kills++;say('ENEMY '+String(a.name).toUpperCase()+' SHOT DOWN',3);}
    if(S.eheli&&S.eheli.alive&&k.p.distanceTo(S.eheli.m.position)<6){S.eheli.hp-=k.g.dmg;hit=1;if(S.eheli.hp<=0){S.eheli.alive=false;fx(S.eheli.m.position,4);S.sc.remove(S.eheli.m);if(k.own){S.kills++;say('HELICOPTER DOWN',3);}}}
    if(hit||k.p.y<H(k.p.x,k.p.z)||k.t>8){blast(k.p,5,hit?0:120,k.own);S.rk.splice(i,1);}}
  for(let i=S.gnades.length-1;i>=0;i--){const n=S.gnades[i];n.t+=dt;n.v.y-=9.81*dt;n.p.addScaledVector(n.v,dt);const g=H(n.p.x,n.p.z);if(n.impact&&n.t>.05){const sp=n.v.length()*dt+.01,dn=n.v.clone().normalize();if(rayBoxes(n.p.clone().addScaledVector(dn,-sp),dn,sp)<sp)n.hitg=true;}if(n.p.y<g+.1){n.hitg=true;n.p.y=g+.1;n.v.multiplyScalar(.3);n.v.y=Math.abs(n.v.y);}if(n.t>3.5||(n.impact&&(n.hitg||n.t>6))){blast(n.p,n.impact?7:9,n.impact?130:160,n.own);S.gnades.splice(i,1);}}
  for(let i=fxL.length-1;i>=0;i--){const e=fxL[i];e.t+=dt;if(!e.m.parent){fxL.splice(i,1);continue;}e.m.scale.setScalar(1+e.t*3);e.m.material.opacity=Math.max(0,.9-e.t*2);if(e.t>.5){S.sc.remove(e.m);fxL.splice(i,1);}}
  if(S.us.every(u=>!u.alive)&&S.phase==='FIGHT'&&S.t>5&&rn()<dt*.05)say('YOUR SQUAD IS DOWN · YOU ARE ALONE',3);}

function pose(){const c=S.cam;if(S.feed&&S.feed.alive){c.position.copy(S.feed.m.position).add(S.O);c.up.set(0,1,0);c.quaternion.copy(S.feed.m.quaternion);c.rotateY(Math.PI);c.fov=90;c.updateProjectionMatrix();c.updateMatrixWorld();S.vmRoot.visible=false;return;}S.vmRoot.visible=!S.tk;c.position.copy(S.pos).add(S.O);c.up.set(0,1,0);if(S.tk)c.rotation.set(S.pitch,S.yaw,0,'YXZ');else c.rotation.set(S.pitch+(S.rec||0)+(S.swY||0),S.yaw+(S.recH||0)+(S.swX||0),0,'YXZ');const g=S.wp[S.w];const fov=S.tk&&!S.tk.ext?(S.tk.seat==='G'?[24,10,4][S.tk.zl|0]*(S.tk.mod.optics>.5?1:1.4):60):S.ads&&S.phase==='FIGHT'?70/((g.vari&&S.vlow?g.vari:g.ads)||1):70;
  S.fov=(S.fov||70)+(fov-(S.fov||70))*.3;if(S.WM){c.near=.05;}c.fov=S.fov;c.updateProjectionMatrix();c.updateMatrixWorld();S.vmRoot.position.copy(c.position);S.vmRoot.quaternion.copy(c.quaternion);}
// in the live world the game draws the frame: the camera is put where you are just before it does
if(typeof renderer!=='undefined'&&renderer.render&&!renderer._inf){const _r=renderer.render.bind(renderer);renderer.render=function(sc0,c0){if(S&&S.WM&&sc0===scene&&c0===camera){try{pose();}catch(e){}}return _r(sc0,c0);};renderer._inf=1;}
function draw(){if(!S)return;if(!S.WM&&!S.R)return;if(!S.WM)pose();const g=S.wp[S.w];
  const vk=S.w==='lau'?'tube':g.vm||'rifle',scoped=g.scope&&S.ads&&S.phase==='FIGHT'&&!(g.vari&&S.vlow);if(S.tk){reticle(S.tk.seat==='G'&&!S.tk.ext?'mil':null);}else reticle(S.ads&&S.phase==='FIGHT'&&S.w!=='lau'?(scoped?g.ret:(g.ret==='dot'||g.ret==='holo'||(g.vari&&S.vlow))?(g.ret==='holo'?'holo':'dot'):null):null);for(const k in S.vms){const m=S.vms[k];m.visible=!S.tk&&k===vk&&S.phase==='FIGHT'&&!scoped;}const cur=S.vms[vk];if(cur){const sy=(cur.userData.sy||.085)*.7;cur.position.set(S.ads?0:.2,S.ads?-sy:-.2,(S.ads?-.32:-.45)+(S.vk||0)+(S.reload>0?.15:0));}if(cur)cur.rotation.x=S.reload>0?-.6:0;
  {const sc2=document.getElementById('iScope');if(sc2)sc2.style.display=scoped?'block':'none';}S.flag.material.color.set(S.hold>0?0x5be1ff:0xffe14a);if(!S.WM)S.R.render(S.sc,S.cam);else if((S.hf=(S.hf||0)+1)%30===1)hideFlight();
  const $=id=>document.getElementById(id);const live=S.us.filter(u=>u.alive).length,elive=S.them.filter(u=>u.alive).length,dv=Math.round(Math.hypot(S.pos.x-S.village.x,S.pos.z-S.village.z));
  const nm=S.w==='pri'?g.n+(g.vari?(S.vlow?' · 1.6×':' · 6×'):'')+(S.uglN?' · GL '+S.uglN:''):S.w==='lau'?((S.N[S.cfg.lau]||'')+' '+g.n):g.n;
  const brg=S.gpsJam>.45?NaN:((Math.atan2(S.village.x-S.pos.x,-(S.village.z-S.pos.z))*180/Math.PI+360)%360),hd=((-S.yaw*180/Math.PI)%360+360)%360;
  const tl=S.cfg.cond?' · '+String(Math.floor(S.cfg.cond.tod)).padStart(2,'0')+':'+String(Math.floor(S.cfg.cond.tod%1*60)).padStart(2,'0')+' '+S.cfg.cond.wx:'';
  $('iTop').innerHTML=S.mission==='FRONT'&&S.phase!=='INSERT'?'FRONT · '+esc(S.loc.name.toUpperCase())+tl+' · OUR LINE '+(S.cur+1)+' OF '+S.lines.length+(S.push?' · ASSAULTING LINE '+(S.cur+2):'')+(S.digQ&&S.digQ.length?' · DIGGING IN':'')+' · NEXT COUNTER-ATTACK '+Math.max(0,Math.round(S.waveT))+' s<br><span style="font-size:11px;color:#9fb">FRIENDLIES '+live+' · ENEMY '+elive+' · KILLS '+S.kills+' · E PLAN / RIDE · K BUILD COMMAND POST · T FALL BACK</span>':S.phase==='INSERT'?esc(INS[S.ins].toUpperCase()+' · '+S.loc.name.toUpperCase()+tl):S.mission==='DEFEND'?'HOLD THE TRENCHES · '+esc(S.loc.name.toUpperCase())+' · WAVE '+S.wave+'/4'+(S.wave<4?' · NEXT IN '+Math.max(0,Math.round(S.waveT))+' s':'')+' · HDG '+Math.round(hd)+'°<br><span style="font-size:11px;color:#9fb">DEFENDERS '+live+'/'+S.us.length+' · ENEMY '+elive+' · ARMOUR '+S.veh.filter(v=>v.alive&&v.side==='E').length+' · KILLS '+S.kills+'</span>':esc(S.loc.name.toUpperCase())+' · OBJECTIVE '+dv+' m · '+Math.round(brg)+'° · HDG '+Math.round(hd)+'°'+(S.hold>0?' · HOLDING '+Math.round(S.hold)+'/30 s':'')+'<br><span style="font-size:11px;color:#9fb">SQUAD '+live+'/'+S.us.length+' · ENEMY SEEN '+elive+' · KILLS '+S.kills+'</span>';
  $('iBL').innerHTML='HEALTH '+Math.max(0,Math.round(S.hp))+'<br><span style="font-size:11px">'+esc(S.arm.n)+(S.crouch?' · CROUCHED':'')+(S.lastZone?' · last hit: '+S.lastZone:'')+'</span>';
  $('iBR').innerHTML=esc(nm)+'<br><b style="font-size:18px">'+(g.mag?(S.reload>0?'RELOADING':g.cur+' / '+g.res):'—')+'</b><br><span style="font-size:11px">GRENADES '+S.gren+' · FPV '+S.fpvKit+' (F) · SANDBAGS '+S.bags+' (B) · MEDEVAC (H) '+(3-S.medN)+'</span>';
  $('iMsg').textContent=S.msgT>0?S.msg:'';{let f=$('iFeed');if(!f){f=document.createElement('div');f.id='iFeed';f.style.cssText='position:absolute;inset:0;pointer-events:none;border:2px solid rgba(255,255,255,.35);display:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 2px,transparent 2px 4px)';S.hud.appendChild(f);}f.style.display=S.feed?'block':'none';if(S.feed)f.innerHTML='<div style="position:absolute;left:14px;top:60px;color:#fff">FPV FEED · OPERATOR AT BASE · '+Math.round(S.feed.m.position.distanceTo(S.pos))+' m FROM YOU · V TO RETURN</div>';}$('iX').style.display=S.phase==='FIGHT'&&!S.ads?'block':'none';}
function loop(){if(!S){loop.on=false;return;}requestAnimationFrame(loop);const n=performance.now(),dt=Math.min(.05,Math.max(0,(n-loop.last)/1000));loop.last=n;if(S.WM&&typeof player!=='undefined'&&player&&player.mesh)player.mesh.visible=false;try{if(typeof sfx!=='undefined'&&sfx.ctx&&sfx.m&&sfx.m.gain.value>.001)sfx.mute(true);}catch(e){}   /* v407: no engine, RWR or cockpit tones on foot */   /* v397: never your aircraft on the ground */if(dt>0)step(dt);draw();}

/* ------------------------------------------------------------------ v379: tanks, the trench fight, the air war overhead */
// a main battle tank, named from the side's equipment table; Western turrets boxy, Russian / Soviet-pattern low and round
function wave(){S.wave++;const n=Math.round((6+S.wave*2)*S.ePow);for(let i=0;i<n;i++){const u=man(false,(rn()-.5)*320,S.trZ-520-rn()*120);S.them.push(u);}
  const nt=Math.min(3,1+(S.wave>>1));for(let i=0;i<nt;i++){const x=(rn()-.5)*240,z=S.trZ-600-rn()*80,m=tank(S.en,0x6a5a3a);m.position.set(x,H(x,z),z);S.sc.add(m);S.veh.push({m,hp:1100,side:'E',x,z,cool:5,alive:true,tank:1,mv:1,stop:S.trZ-150-rn()*80,name:m.userData.name});}
  {const x=(rn()-.5)*200,z=S.trZ-650,v=vehicle('EIFV',0x6a5a3a);v.position.set(x,H(x,z),z);S.sc.add(v);S.veh.push({m:v,hp:600,side:'E',x,z,cool:3,alive:true,mv:1,stop:S.trZ-220});}
  say('WAVE '+S.wave+' · '+n+' INFANTRY, '+nt+' '+(S.EN.MBT||'TANKS').toUpperCase()+(nt>1?' TANKS':''),4);}
function defendStep(dt){S.waveT-=dt;if(S.waveT<=0&&S.wave<4){wave();S.waveT=75;}
  const eAlive=S.them.filter(u=>u.alive).length+S.veh.filter(v=>v.alive&&v.side==='E').length;
  // the trench is lost when enemy infantry stand in it and none of yours do
  const inT=u=>Math.abs(u.m.position.z-S.trZ)<6&&Math.abs(u.m.position.x)<175;const eIn=S.them.filter(u=>u.alive&&inT(u)).length,fIn=S.us.filter(u=>u.alive&&inT(u)).length+(Math.abs(S.pos.z-S.trZ)<6?1:0);
  if(eIn>=3&&fIn===0)end('LOST');if(S.wave>=4&&eAlive===0)end('HELD');S.hold=S.wave;}
/* v407: vehicles do not drive through buildings: a move that would enter a building footprint (house, hall, bunker,
   command post, or one of the town's plain blocks) is turned 30 / 60 / 90 degrees either way until it is clear, and the
   detour is kept for a few seconds so the vehicle drives around the corner instead of shaking against the wall. */
function vblocked(x,z,r){for(const b of near(x-r-1,z-r-1,x+r+1,z+r+1,_nb)){if(b.gone||b.y1-b.y0<1.6||(b.bid==null&&!b.wb&&!b.str))continue;if(b.wb&&!b.wb[7])continue;if(x>b.x0-r&&x<b.x1+r&&z>b.z0-r&&z<b.z1+r)return true;}return false;}
function solidAt(p){for(const b of near(p.x-.5,p.z-.5,p.x+.5,p.z+.5,_nb2)){if(b.gone)continue;if(p.x>b.x0&&p.x<b.x1&&p.z>b.z0&&p.z<b.z1&&p.y>b.y0&&p.y<b.y1)return true;}return false;}const _nb2=[];
function vclash(v,x,z,r){for(const o of S.veh){if(o===v||!o.alive)continue;const dx=o.x-x,dz=o.z-z;if(dx*dx+dz*dz<(r+2.4)*(r+2.4)&&dx*dx+dz*dz<(o.x-v.x)**2+(o.z-v.z)**2)return true;}return false;}
function vmove(v,ux,uz,sp){const r=v.tank?2.6:2.2;let a0=Math.atan2(ux,uz);if(v.det&&v.detT>0){v.detT-=.016;a0=v.det;}
  if(v.rev>0){v.rev-=.016;const a=a0+Math.PI+(v.revS||.6),nx=v.x+Math.sin(a)*sp*.6,nz=v.z+Math.cos(a)*sp*.6;if(!vblocked(nx,nz,r)&&!vclash(v,nx,nz,r)){v.x=nx;v.z=nz;}return{x:-Math.sin(a),z:-Math.cos(a)};}
  for(const da of[0,.52,-.52,1.05,-1.05,1.57,-1.57,2.1,-2.1]){const a=a0+(v.side==='E'?-da:da),dx=Math.sin(a),dz=Math.cos(a),nx=v.x+dx*sp,nz=v.z+dz*sp;
    if(!vblocked(nx,nz,r)&&!vclash(v,nx,nz,r)){if(da){v.det=a;v.detT=2.5;}else if(v.detT<=0)v.det=null;v.x=nx;v.z=nz;v.stk=0;return{x:dx,z:dz};}}
  v.stk=(v.stk||0)+.016;if(v.stk>1){v.stk=0;v.rev=2.2;v.revS=rn()<.5?.7:-.7;v.det=a0+v.revS*2;v.detT=4;}   // v420: boxed in: back out and turn away
  return{x:ux,z:uz};}
/* v420: AI TANK CREWS. The commander picks the most dangerous enemy he can see (tanks first, then IFVs, then men);
   the turret traverses at a real rate toward it (and sweeps its sector when there is nothing), the gun fires only when
   laid on. Facing an enemy, the tank halts and fights instead of driving on; badly hit, it backs away to its own lines. */
function aiTank(v,dt){const P=v.m.position,tu=v.m.userData.tu;v.hpMax=v.hpMax||v.hp;
  v.tsT=(v.tsT||rn())-dt;if(v.tsT<=0){v.tsT=1;v.tg=null;let bs=-1;const eye=P.clone().setY(P.y+2.6);
    for(const o of S.veh)if(o.alive&&o.side!==v.side&&!(o.decoy&&rn()<.5)){const d=o.m.position.distanceTo(P);if(d>2200)continue;const sc=(o.tank?3:2)/(1+d/500);if(sc>bs&&los(eye,o.m.position.clone().setY(o.m.position.y+1.4))){bs=sc;v.tg={p:o.m.position,veh:o};}}
    for(const u of(v.side==='F'?S.them:S.us))if(u.alive){const d=u.m.position.distanceTo(P);if(d>900)continue;const sc=(u.role==='MG'||u.role==='AT'?1.3:.8)/(1+d/300);if(sc>bs&&los(eye,u.m.position.clone().setY(u.m.position.y+1.2))){bs=sc;v.tg={p:u.m.position,man:u};}}
    if(v.side==='E'&&!S.tk&&S.phase==='FIGHT'&&!S.downed&&!S.evacMe){const d=S.pos.distanceTo(P);const sc=1.1/(1+d/300);if(d<900&&sc>bs&&los(eye,S.pos)){bs=sc;v.tg={p:S.pos,me:1};}}}
  v.ty=v.ty??(tu?tu.rotation.y:0);let want;if(v.tg)want=Math.atan2(-(v.tg.p.x-P.x),-(v.tg.p.z-P.z))-v.m.rotation.y;else{v.sw=(v.sw||rn()*6)+dt*.2;want=Math.sin(v.sw)*.8;}
  const a=Math.atan2(Math.sin(want-v.ty),Math.cos(want-v.ty));v.ty+=Math.max(-.45*dt,Math.min(.45*dt,a));if(tu)tu.rotation.y=v.ty;v.tyErr=a;
  if(v.tg&&Math.abs(a)<.035&&v.cool<=0&&!v.nofire&&S.phase==='FIGHT'){v.cool=6+rn()*3;const o=P.clone().setY(P.y+2.4),tp=v.tg.p.clone().setY(v.tg.p.y+(v.tg.veh?1.4:1));tracer(o,tp,v.side==='F'?S.me:S.en,true);fx(o.clone().addScaledVector(tp.clone().sub(o).normalize(),4),1.6);
    if(v.tg.veh){const x=v.tg.veh;if(x.me&&S.tk){if(rn()<.6)tankHit(rn()<.5?420:260,'tank');else fx(tp.clone().add(new V3((rn()-.5)*8,0,(rn()-.5)*8)),1);}else if(rn()<.5)hitVeh(x,380,false);else fx(tp.clone().add(new V3((rn()-.5)*8,0,(rn()-.5)*8)),1);}
    else blast(tp.add(new V3((rn()-.5)*5,0,(rn()-.5)*5)),5,110,false);}
  const close=v.tg&&v.tg.p.distanceTo(P)<(v.tg.veh?1400:500);v.hold=!!close;
  if(!v.retreat&&v.hp<v.hpMax*.35&&!v.immob){v.retreat=1;v.goal=new V3(v.x,0,v.z+(v.side==='E'?-220:220));}}
/* v407: LANDMINES. Anti-tank minefields in front of the anti-tank ditches (pressure-fused discs half buried), anti-
   personnel mines scattered between the lines, a row of red warning triangles on the friendly side. A vehicle on an
   anti-tank mine is heavily damaged; a person on an anti-personnel mine is badly wounded (shown without detail).
   Engineers see mines within 6 m (marked), clear them with N when close, and lay their own (N, away from mines). AI
   engineers on both sides lay a few during the battle. */
// put a gunner in each nest and a sniper in each hide, from the soldiers holding that line
function manSpots(){if(!S.lines)return;for(const[li,L]of S.lines.entries()){const pool=(L.own==='E'?S.them:S.us).filter(u=>u.alive&&!u.spot&&(L.own==='E'?u.line===li:true));
    for(const sp of L.mg||[]){const u=pool.shift();if(!u)break;u.spot=sp;u.role='MG';u.m.position.set(sp.x,H(sp.x,sp.z),sp.z);}
    for(const sp of L.snp||[]){const u=pool.shift();if(!u)break;u.spot=sp;u.role='SNP';u.m.position.set(sp.x,H(sp.x,sp.z),sp.z);}if(L.own==='F'&&li!==S.cur)for(const u of S.us)if(u.spot&&(L.mg.includes(u.spot)||L.snp.includes(u.spot)))u.spot=null;}}
function mineInit(){S.mines=[];const mm=new THREE.MeshLambertMaterial({color:0x3c4a32}),am=new THREE.MeshLambertMaterial({color:0x4a4436});S.mineM={at:new THREE.CylinderGeometry(.16,.16,.08,10),ap:new THREE.CylinderGeometry(.05,.05,.05,8),m:mm,a:am};
  if(!S.lines&&S.mission!=='DEFEND')return;const Z=S.mission==='FRONT'?[[-445,'F'],[-785,'E']]:[[-520,'F']];
  for(const[z,own]of Z)for(let x=-260;x<260;x+=7+rn()*6){mine(x+(rn()-.5)*4,z+(rn()-.5)*14,'AT',own);}
  const mid=S.mission==='FRONT'?[-560,-690]:[-560,-640];for(let i=0;i<40;i++)mine((rn()-.5)*400,mid[0]+(rn())*(mid[1]-mid[0]),'AP',rn()<.5?'E':'F');
  const sg=new THREE.MeshBasicMaterial({color:0xc82020,side:THREE.DoubleSide});const tri=new THREE.BufferGeometry().setFromPoints([new V3(-.2,0,0),new V3(.2,0,0),new V3(0,.34,0)]);
  for(let x=-250;x<250;x+=25){const z=(S.mission==='FRONT'?-430:-505),y=H(x,z);const p=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.9,4),new THREE.MeshLambertMaterial({color:0x6a5a3a}));p.position.set(x,y+.45,z);S.sc.add(p);const t=new THREE.Mesh(tri,sg);t.position.set(x,y+.75,z);S.sc.add(t);}}
function mine(x,z,k,own){const g=S.mineM;const m=new THREE.Mesh(k==='AT'?g.at:g.ap,k==='AT'?g.m:g.a);const y=H(x,z);m.position.set(x,y-.02,z);m.visible=false;S.sc.add(m);const o={x,z,k,own,m,live:true};S.mines.push(o);return o;}
function mineStep(dt){if(!S.mines)return;const eng=S.cfg&&S.cfg.role==='ENGINEER';
  for(const o of S.mines){if(!o.live)continue;const dp=Math.hypot(o.x-S.pos.x,o.z-S.pos.z);o.m.visible=dp<(eng?6:o.k==='AT'?3:1.2)||o.own==='F'&&dp<14;
    if(o.k==='AT'){for(const v of S.veh){if(!v.alive||v.decoy&&false)continue;if(Math.hypot(v.x-o.x,v.z-o.z)<1.8){boomMine(o);hitVeh(v,v.tank?650:900,o.own==='F');say((v.side==='E'?'ENEMY ':'OUR ')+(v.name||'VEHICLE').toUpperCase()+' HITS A MINE',2.5);break;}}}
    else{if(dp<.7&&S.phase==='FIGHT'&&!S.ride){boomMine(o);hurt(140,'mine');say('MINE!',2);continue;}for(const u of[...S.us,...S.them]){if(!u.alive)continue;const P=u.m.position;if(Math.abs(P.x-o.x)<.6&&Math.abs(P.z-o.z)<.6){boomMine(o);hitMan(u,140,false);break;}}}}
  for(const u of[...S.us,...S.them]){if(!u.alive||!u.eng)continue;u.mn=(u.mn||0)+dt;if(u.mn>40&&S.mines.length<160){u.mn=0;const P=u.m.position;mine(P.x+(rn()-.5)*6,P.z+(u.friend?-1:1)*(8+rn()*8),rn()<.5?'AT':'AP',u.friend?'F':'E');}}}
function boomMine(o){o.live=false;S.sc.remove(o.m);const p=new V3(o.x,H(o.x,o.z)+.2,o.z);fx(p,o.k==='AT'?2.4:1.1);SND.boom&&SND.boom(p,o.k==='AT'?8:3);scar(p,o.k==='AT'?3:1.2);}
function mineKey(){if(S.phase!=='FIGHT')return;if(!(S.cfg&&S.cfg.role==='ENGINEER')){say('ONLY ENGINEERS LAY OR CLEAR MINES',1.5);return;}
  const n=S.mines.filter(o=>o.live&&Math.hypot(o.x-S.pos.x,o.z-S.pos.z)<2.2).sort((a,b)=>Math.hypot(a.x-S.pos.x,a.z-S.pos.z)-Math.hypot(b.x-S.pos.x,b.z-S.pos.z))[0];
  if(n){n.live=false;S.sc.remove(n.m);S.cleared=(S.cleared||0)+1;say((n.k==='AT'?'ANTI-TANK':'ANTI-PERSONNEL')+' MINE CLEARED',1.5);return;}
  if((S.myMines=(S.myMines||0))>=6){say('NO MINES LEFT TO LAY',1.5);return;}S.myMines++;const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw));const P=S.pos.clone().addScaledVector(f,3);mine(P.x,P.z,'AT','F');say('ANTI-TANK MINE LAID ('+(6-S.myMines)+' LEFT)',1.5);}
/* v407: CLOSE-QUARTERS FIGHTING IN ENEMY TRENCHES. Inside an enemy trench line the defenders within 50 m turn to you
   along the trench, two of your riflemen stack up behind you, and fighting is at a few metres round each traverse;
   grenades go over the traverses. When few defenders are left close by, some put their hands up: prisoners are taken
   to the rear and counted in the war's prisoner totals. */
function cqbStep(dt){if(S.phase!=='FIGHT'||!S.lines)return;const P=S.pos;let L=null;for(const l of S.lines){if(l.own!=='E')continue;if(Math.abs(P.z-(l.z+zig(-1150,P.x)))<2.2||cut(P.x,P.z)>1)if(Math.abs(P.z-l.z)<4){L=l;break;}}
  if(!L){S.cqb=null;return;}if(!S.cqb){S.cqb={t:0};say('IN THE ENEMY TRENCH · CLEAR IT TRAVERSE BY TRAVERSE',2.5);}S.cqb.t+=dt;
  const near=S.them.filter(u=>u.alive&&!u.pow&&u.m.position.distanceTo(P)<50);for(const u of near){u.tgt=null;u.bound=new V3(P.x+(rn()-.5)*4,0,P.z+(rn()-.5)*1.2);u.boundT=1.5;u.sup=0;}
  const mates=S.us.filter(u=>u.alive&&!u.down).sort((a,b)=>a.m.position.distanceTo(P)-b.m.position.distanceTo(P)).slice(0,2);mates.forEach((u,i)=>{u.bound=new V3(P.x+(i?3:-3),0,P.z+1.5);u.boundT=2;});
  if(near.length&&rn()<dt*.08){const u=near[(rn()*near.length)|0];const tp=P.clone().add(new V3((rn()-.5)*6,0,(rn()-.5)*2));blast(tp,5,60,false);say('GRENADE OVER THE TRAVERSE',1.2);}
  const close=near.filter(u=>u.m.position.distanceTo(P)<25);if(close.length&&close.length<=2&&rn()<dt*.25){const u=close[0];u.pow=true;u.alive=false;u.m.rotation.x=0;S.pows=(S.pows||0)+1;recordDeath(u,true,'CAPTURED');say((u.full||'AN ENEMY SOLDIER').toUpperCase()+' SURRENDERS · SENT TO THE REAR',2);}}
/* v407: CLOSE AIR SUPPORT FROM THE CAMPAIGN. Requests go up to the campaign: how often aircraft come depends on your
   side's air superiority over this theatre, how many attack-capable aircraft your country has left, and its
   precision-munition stocks. The aircraft that come are the campaign's own (type and squadron from the order of
   battle); each run is a real attack pattern (approach, dive, release, pull-out), the weapons fall onto the target, and
   the outcome goes back into the war: munitions spent, ground losses inflicted, and an aircraft lost to air defence
   counts as a combat loss. The enemy does the same to you. */
function casOnly(dt){S.air=S.air||[];for(let i=S.air.length-1;i>=0;i--){const a=S.air[i];if(a.run&&a.alive){casFly(a,dt);if(a.done){S.sc.remove(a.m);S.air.splice(i,1);}}else if(!a.alive){a.vy=(a.vy||0)-9.8*dt;const P=a.m.position;P.y+=a.vy*dt*3;if(P.y<H(P.x,P.z)){fx(new V3(P.x,H(P.x,P.z)+5,P.z),12);S.sc.remove(a.m);S.air.splice(i,1);}}}}
function casSide(side){const st=W.st;if(!st||S.cfg.camp)return null;const a3=side==='F'?S.cfg.a3:S.enA3;const p=a3&&st.c[a3];if(!p)return null;let sup=0;
  for(const th of st.th||[]){const v=th.sup||0;sup=Math.max(sup,Math.abs(v));}const mine=p.side==='B'?1:-1;const th=(st.th||[]).reduce((b,t)=>Math.abs(t.sup||0)>Math.abs(b.sup||0)?t:b,{sup:0});
  const edge=(th.sup||0)*mine;const m=st.mil&&st.mil[a3];const pgm=m&&m.mun?(m.mun.PGM??8):8;
  const sq=W.ob&&W.ob.units?W.ob.units(a3).filter(u=>u.kind==='SQN'||u.type==='air'||/sq/i.test(u.name||'')).slice(0,6):[];const s0=sq[(rn()*sq.length)|0];
  return{a3,p,edge,pgm,rate:Math.max(.15,Math.min(1.6,.6+edge*1.5))*Math.min(1,(p.air||0)/40)*Math.min(1,pgm/4),type:(S.N&&side==='F'?S.N.ATK:S.EN&&S.EN.ATK)||'attack aircraft',sqn:s0&&s0.name};}
function casStep(dt){if(S.phase!=='FIGHT'||S.cfg.camp||!W.st)return;S.casT=(S.casT??25)-dt;if(S.casT>0)return;S.casT=35+rn()*40;
  for(const side of['F','E']){const C=casSide(side);if(!C||rn()>C.rate*.5)continue;const tg=side==='F'?(S.veh.find(v=>v.alive&&v.side==='E')||S.them.find(u=>u.alive)):(S.veh.find(v=>v.alive&&v.side==='F')||S.us.find(u=>u.alive));if(!tg)continue;
    const tp=(tg.m?tg.m.position:tg).clone();const m=jet(side);const dir=side==='F'?1:-1;const a={m,side,alive:true,t:0,cas:true,run:{tp,from:tp.clone().add(new V3(-900*dir,500,600*dir)),C,tg,rel:false},name:C.type};S.air.push(a);S.casRuns=(S.casRuns||0)+1;
    say((side==='F'?'CLOSE AIR SUPPORT INBOUND · '+C.type+(C.sqn?' ('+C.sqn+')':''):'ENEMY AIRCRAFT INBOUND · '+C.type).toUpperCase(),3);}}
function casFly(a,dt){const R=a.run,P=a.m.position;a.t+=dt;const T=14,u=Math.min(1,a.t/T);const pull=Math.max(0,(a.t-T*.75)/(T*.25));
  const p=R.from.clone().lerp(R.tp.clone().add(new V3(0,140,0)),Math.min(1,u/.75));if(pull>0)p.add(new V3((R.tp.x-R.from.x)*.3*pull,260*pull*pull,(R.tp.z-R.from.z)*.3*pull));P.copy(p);P.y=Math.max(P.y,H(P.x,P.z)+60);const d=R.tp.clone().sub(R.from);a.m.rotation.set(-.35*(1-pull),Math.atan2(-d.x,-d.z),0);
  if(!R.rel&&u>=.7){R.rel=true;const own=a.side==='F';S.bombs=S.bombs||[];S.bombs.push({p:P.clone(),v:d.clone().normalize().multiplyScalar(140).add(new V3(0,-30,0)),tp:R.tp.clone(),own,C:R.C,tg:R.tg});
    const m=W.st.mil&&W.st.mil[R.C.a3];if(m&&m.mun&&m.mun.PGM!=null)m.mun.PGM=Math.max(0,m.mun.PGM-.05);}
  // enemy air defence on the way out: man-portable missiles from the trenches
  if(R.rel&&!R.ad&&a.t>T*.8){R.ad=true;const shooters=(a.side==='F'?S.them:S.us).filter(x=>x.alive).length;if(rn()<Math.min(.25,shooters*.008)){a.alive=false;a.vy=0;const p=R.C.p;p.air=Math.max(0,(p.air||0)-1);p.lostAir=(p.lostAir||0)+1;
      W.emit('LOSS',{e:[R.C.a3],txt:p.n+' loses a '+R.C.type+' to a shoulder-launched missile over '+S.loc.name+' during a close-air-support run.'});say((a.side==='F'?'OUR ':'ENEMY ')+'ATTACK AIRCRAFT HIT BY A MANPADS',2.5);}}
  if(a.t>T*1.4){a.done=true;}}
function bombStep(dt){if(!S.bombs)return;for(let i=S.bombs.length-1;i>=0;i--){const b=S.bombs[i];b.v.y-=9.8*dt;b.p.addScaledVector(b.v,dt);const toT=b.tp.clone().sub(b.p).setY(0);if(toT.length()>2)b.v.add(toT.normalize().multiplyScalar(25*dt));
  if(b.p.y<=H(b.p.x,b.p.z)+.5){S.bombs.splice(i,1);const p=new V3(b.p.x,H(b.p.x,b.p.z),b.p.z);blast(p,16,220,b.own);scar(p,6);if(b.tg&&b.tg.hp!=null&&b.tg.alive&&b.tg.m.position.distanceTo(p)<12){hitVeh(b.tg,900,b.own);}
    const q=W.st&&W.st.c[b.own?S.enA3:S.cfg.a3];if(q&&q.gnd!=null)q.gnd=Math.max(0,q.gnd-.002);}}}
/* v414: TANK MACHINE GUNS. Every tank carries a coaxial machine gun and a commander's heavy machine gun (Kord or NSVT
   12.7 mm on Russian-pattern tanks, M2 .50 on Western ones, MG3 on Leopards, PKT coax); against infantry inside about
   500 m they fire bursts with tracers. */
const MGN=v=>{const f=v.fam||vfam(v);const n=(v.name||'');return f==='SOV'?{hmg:'12.7 mm Kord',cx:'7.62 mm PKT'}:/Leopard/.test(n)?{hmg:'7.62 mm MG3',cx:'7.62 mm MG3'}:{hmg:'12.7 mm M2',cx:'7.62 mm M240'};};
function tankMG(v,dt){v.mgc=(v.mgc||0)-dt;if(v.mgc>0||v.nofire)return;const foes=(v.side==='E'?S.us.concat(S.tk?[]:[{alive:S.phase==='FIGHT',m:{position:S.pos.clone().setY(S.pos.y-1.6)},player:1}]):S.them).filter(u=>u.alive);
  const P=v.m.position;let t=null,bd=500;for(const u of foes){const d=u.m.position.distanceTo(P);if(d<bd){bd=d;t=u;}}if(!t){v.mgc=1.5;return;}
  const o=P.clone().setY(P.y+2.6),tp=t.m.position.clone().setY(t.m.position.y+1.1);if(!los(o,tp)){v.mgc=1;return;}v.mgc=.12;v.mgb=(v.mgb||0)+1;if(v.mgb>8){v.mgb=0;v.mgc=1.6+rn();}
  const dv=tp.clone().sub(o),dl=dv.length();dv.divideScalar(dl);if(v.mgb%2===0)tracer(o,o.clone().addScaledVector(dv,Math.min(dl,rayWorld(o,dv,dl))),v.side==='E'?S.en:S.me,true);if(rn()<.5)SND.far(o,true);
  if(rn()<Math.max(.03,.22-bd/3000)){if(t.player)hurt(30,'bullet');else hitMan(t,45,false);}}
/* v414: PLAYABLE TANKS. You join a four-man crew as DRIVER or GUNNER; the other three are the crew AI and they talk:
   the COMMANDER scans for threats (tanks, infantry fighting vehicles, anti-tank teams first), calls them with a clock
   bearing and range and the round to use, orders the driver (move up, halt, back up, turn to face) and fires the
   heavy machine gun at infantry; the GUNNER (AI when you drive) lays on the commander's target and fires when on;
   the LOADER loads the round called and reports it up (an autoloader on Russian-pattern tanks); the DRIVER (AI when
   you aim) follows the commander's orders, keeps the frontal armour toward the threat and stops for the shot.
   Driver: W/S throttle, A/D steer, mouse to look through the periscope, V outside view. Gunner: mouse traverses the
   turret and elevates the gun (at the turret's real rates), left button fires the main gun, right button the coax,
   1/2/3 select sabot / HEAT / HE, Q zooms the sight. X fights a fire. Hits on your tank are resolved by part:
   engine, tracks, turret drive, gun, optics, ammunition and fuel, and each crewman; damage changes what the crew can
   do (no loader: slower loading; no driver: immobile; gunner hit: the commander takes the gun). */
const TKA={APFSDS:'sabot',HEAT:'HEAT',HE:'HE'};
function tankStart(){const seat=S.ins==='TANKD'?'D':'G';const m=tankModel(S.me,S.cfg.tank&&S.cfg.tank!=='AUTO'?S.cfg.tank:null);const x=0,z=260;m.position.set(x,H(x,z),z);S.sc.add(m);
  const vc=VC[m.userData.name]||{};const fam=famOf(m.userData.name||'')||'NATO',auto=fam==='SOV';
  const v={m,hp:1400,side:'F',tank:true,me:true,x,z,cool:0,alive:true,name:m.userData.name||'tank',fam};S.veh.push(v);
  const crew={C:{n:'Commander',hp:100},G:{n:'Gunner',hp:100},L:{n:auto?'Autoloader':'Loader',hp:auto?999:100},D:{n:'Driver',hp:100}};
  S.tk={v,seat,crew,auto,spd:0,hd:Math.PI,ty:0,gp:0,ammo:{APFSDS:22,HEAT:12,HE:16},sel:'APFSDS',load:'APFSDS',rt:0,rel:auto?7.1:5.2,ready:true,tgt:null,ct:0,ord:'ADVANCE',zoom:false,zl:0,th:false,stab:true,ext:false,
    mod:{engine:1,tracks:1,turret:1,gun:1,optics:1,fire:0,ammo:1},mgT:0,coax:1500,hmg:300,lt:0,said:{}};
  m.rotation.y=S.tk.hd;S.phase='FIGHT';S.vmRoot.visible=false;
  tsay('C',(seat==='D'?'Driver, ':'Gunner, ')+'this is the commander. '+m.userData.name+', loaded with sabot. Move out on my order.');tsay('L',auto?'Autoloader: carousel full.':'Sabot up!');}
function tsay(k,t){const n={C:'COMMANDER',G:'GUNNER',L:'LOADER',D:'DRIVER'}[k];vline(n,t);}
function clock(from,hd,to){let a=Math.atan2(-(to.x-from.x),-(to.z-from.z))-hd;a=((a%(Math.PI*2))+Math.PI*3)%(Math.PI*2)-Math.PI;const h=Math.round(-a/(Math.PI/6));return((h+12)%12||12)+' o\'clock';}
function tankStep(dt){const T=S.tk,v=T.v,m=v.m,P=m.position;if(!v.alive){if(!S.res)end('KIA');return;}
  const tu=m.userData.tu,gun=m.userData.tgun||m.userData.gun;const crew=T.crew,alive=k=>crew[k].hp>0;
  // ---- commander: scan, pick, call
  T.ct-=dt;if(T.ct<=0&&alive('C')){T.ct=1.2;let best=null,bs=-1;const me=P.clone().setY(P.y+2.6);
    for(const o of S.veh){if(!o.alive||o.side===v.side||o.decoy&&rn()<.5)continue;const d=o.m.position.distanceTo(P);if(d>2600)continue;if(!los(me,o.m.position.clone().setY(o.m.position.y+1.5)))continue;const sc=(o.tank?3:2)/(1+d/800);if(sc>bs){bs=sc;best={o,veh:1,d};}}
    if(!best)for(const u of S.them){if(!u.alive)continue;const d=u.m.position.distanceTo(P);if(d>900)continue;if(!los(me,u.m.position.clone().setY(u.m.position.y+1.2)))continue;const sc=(u.role==='MG'?1.4:1)/(1+d/300);if(sc>bs){bs=sc;best={o:u,veh:0,d};}}
    if(best&&(!T.tgt||T.tgt.o!==best.o)){T.tgt=best;const rnd=best.veh?(best.o.tank?'APFSDS':'HEAT'):'HE';T.want=rnd;
      tsay('C',(best.veh?(best.o.tank?'Tank':'BMP'):(best.o.role==='MG'?'Machine gun':'Infantry'))+', '+clock(P,T.hd+T.ty,best.o.m.position)+', '+Math.round(best.d/50)*50+' metres — '+TKA[rnd]+'!');
      if(T.seat==='G'&&T.sel!==rnd){T.load=rnd;}else if(T.seat==='D'){T.load=rnd;T.sel=rnd;}}
    if(T.tgt&&!T.tgt.o.alive){tsay('G',rn()<.5?'Target destroyed.':'Target. Cease fire.');T.tgt=null;}
    // orders to the AI driver (when you are the gunner)
    if(T.seat==='G'){const n=T.tgt?T.tgt.d:9999;T.ord=n<500?'BACK':n<1600?'HALT':'ADVANCE';if(T.ord!==T.lastOrd){T.lastOrd=T.ord;tsay('C',T.ord==='ADVANCE'?'Driver, move up.':T.ord==='HALT'?'Driver, halt. Gunner, take the shot.':'Driver, back up, back up!');}}}
  // ---- loader / autoloader
  if(!T.ready){T.rt-=dt*(alive('L')?1:.45);if(T.rt<=0){T.ready=true;T.sel=T.load;tsay('L',T.auto?'Loaded: '+TKA[T.sel]+'.':TKA[T.sel].replace(/^./,c=>c.toUpperCase())+' up!');}}
  // ---- driving (you, or the AI driver on the commander's orders)
  const canMove=T.mod.engine>.15&&T.mod.tracks>.15&&alive('D')||T.seat==='D'&&T.mod.engine>.15&&T.mod.tracks>.15;let thr=0,str=0;
  if(T.seat==='D'){thr=(S.keys.KeyW?1:0)-(S.keys.KeyS?1:0);str=(S.keys.KeyA?1:0)-(S.keys.KeyD?1:0);}
  else{thr=T.ord==='ADVANCE'?1:T.ord==='BACK'?-.6:0;if(T.tgt){let a=Math.atan2(-(T.tgt.o.m.position.x-P.x),-(T.tgt.o.m.position.z-P.z))-T.hd;a=Math.atan2(Math.sin(a),Math.cos(a));str=Math.max(-1,Math.min(1,a*2));}}
  if(!canMove){thr=0;str=0;}const vmax=(T.mod.engine*.6+.4)*(T.mod.tracks>.5?1:.4)*(thr<0?5:15);T.spd+=(thr*vmax-T.spd)*Math.min(1,dt*.8);{const dh=str*dt*.55*(T.mod.tracks>.5?1:.4);T.hd+=dh;if(T.stab&&T.mod.turret>.3)T.ty-=dh;}
  const ux=-Math.sin(T.hd),uz=-Math.cos(T.hd);if(Math.abs(T.spd)>.05){const nx=v.x+ux*T.spd*dt,nz=v.z+uz*T.spd*dt;if(!vblocked(nx,nz,2.6)){v.x=nx;v.z=nz;}else T.spd*=.2;}
  P.set(v.x,H(v.x,v.z),v.z);m.rotation.y=T.hd;seatV(m,v.x,v.z,T.hd,7,3.4);
  // ---- turret and gun: you (gunner) or the AI gunner laying on the commander's target
  const trav=.42*(T.mod.turret>.5?1:.25),elev=.07;
  if(T.seat==='G'){T.ty+=(S.mdx||0)*.0022;T.gp=Math.max(-.1,Math.min(.26,T.gp-(S.mdy||0)*.0016));S.mdx=0;S.mdy=0;}
  else if(T.tgt&&alive('G')){const tp=T.tgt.o.m.position;let a=Math.atan2(-(tp.x-P.x),-(tp.z-P.z))-T.hd-T.ty;a=Math.atan2(Math.sin(a),Math.cos(a));T.ty+=Math.max(-trav*dt,Math.min(trav*dt,a));const d=tp.distanceTo(P);T.gp+=(Math.atan2(tp.y+1.2-(P.y+2.4),d)-T.gp)*Math.min(1,dt*elev*30);
    if(Math.abs(a)<.01&&T.ready&&T.mod.gun>.2&&T.sel===T.load){fireMain();}}
  if(!T.stab&&Math.abs(T.spd)>.5){const k=Math.min(1,Math.abs(T.spd)/12);T.gp+=Math.sin(Date.now()*.011)*.0025*k;T.ty+=Math.sin(Date.now()*.007)*.0015*k;}
  if(tu)tu.rotation.y=T.ty;if(gun)gun.rotation.x=T.gp;
  // ---- the commander's heavy machine gun on infantry (AI), and your coax
  if(alive('C')&&T.hmg>0){T.mgT-=dt;const inf=S.them.filter(u=>u.alive&&u.m.position.distanceTo(P)<500);if(inf.length&&T.mgT<=0){T.mgT=.15;T.hmgB=(T.hmgB||0)+1;if(T.hmgB>10){T.hmgB=0;T.mgT=1.5;}const u=inf[0],o=P.clone().setY(P.y+3.1),tp=u.m.position.clone().setY(u.m.position.y+1);if(los(o,tp)){T.hmg--;if(T.hmgB%2===0)tracer(o,tp,S.me,true);if(rn()<.18)hitMan(u,55,true);}}}
  if(T.seat==='G'&&S.mb2&&T.coax>0){T.cxT=(T.cxT||0)-dt;if(T.cxT<=0){T.cxT=.09;T.coax--;const d=gunDir();const o=P.clone().setY(P.y+2.4);const far=Math.min(800,rayWorld(o,d,800));tracer(o,o.clone().addScaledVector(d,far),S.me);hitscan(o,d,30,true);}}
  // ---- enemy anti-tank teams: an RPG or ATGM from infantry inside about 400 m who can see you
  T.atT=(T.atT??12)-dt;if(T.atT<=0){T.atT=10+rn()*14;const at=S.them.find(u=>u.alive&&u.m.position.distanceTo(P)<400&&los(u.m.position.clone().setY(u.m.position.y+1.4),P.clone().setY(P.y+1.5)));
    if(at){const o=at.m.position.clone().setY(at.m.position.y+1.4);tracer(o,P.clone().setY(P.y+1.5),S.en,true);fx(P.clone().setY(P.y+1.5),1.4);tsay('C',rn()<.5?'RPG! '+clock(P,T.hd,at.m.position)+'!':'Missile launch — '+clock(P,T.hd,at.m.position)+'!');if(rn()<.65)tankHit(rn()<.6?320:520,'AT');T.tgt={o:at,veh:0,d:at.m.position.distanceTo(P)};T.load='HE';T.want='HE';}}
  // ---- fire on board
  if(T.mod.fire>0){T.mod.fire+=dt*.02;if(S.keys.KeyX&&!T.ext){T.ext=true;T.mod.fire=0;tsay('C','Fire! Extinguishers — fire\'s out.');}if(T.mod.fire>1){tsay('C','We\'re burning — bail out, bail out!');tankLost('BAILED');}}
  // ---- view: driver's periscope low in the hull, or the gunner's sight on the gun; V for the outside view
  const hy=P.y+(T.seat==='D'?1.35:2.35);if(T.ext){S.pos.set(P.x-Math.sin(T.hd+T.ty)*-12,P.y+6,P.z-Math.cos(T.hd+T.ty)*-12);}else if(T.seat==='D'){S.pos.set(P.x+ux*2.2,hy,P.z+uz*2.2);}else{S.pos.set(P.x,hy,P.z);S.yaw=T.hd+T.ty;S.pitch=T.gp;}{const sight=!T.ext&&T.seat==='G';const tu2=m.userData.tu,g2=m.userData.tgun||m.userData.gun;if(tu2)tu2.visible=!sight;if(g2)g2.visible=!sight;}   /* v422: in the gunner's sight your own turret and barrel are not in front of the glass */
  if(T.seat==='D'&&!T.ext){S.yaw=T.hd+(S.lookY||0);}
  tankHud();}
function gunDir(){const T=S.tk;return new V3(0,0,-1).applyEuler(new THREE.Euler(T.gp,T.hd+T.ty,0,'YXZ'));}
function fireMain(){const T=S.tk;if(!T||!T.ready||T.mod.gun<=.2)return;const k=T.sel;if(T.ammo[k]<=0){tsay('L','No more '+TKA[k]+'!');return;}T.ammo[k]--;T.ready=false;T.rt=T.rel*(T.mod.turret>.5?1:1.3);
  const P=T.v.m.position,o=P.clone().setY(P.y+2.4),d=gunDir();o.addScaledVector(d,4.5);fx(o.clone(),2.2);SND.boom&&SND.boom(o,9);S.shots++;
  const far=Math.min(3000,rayWorld(o,d,3000));let hitV=null,ht=1e9;for(const x of S.veh){if(!x.alive||x===T.v)continue;const c=x.m.position.clone().setY(x.m.position.y+1.3),tt=c.clone().sub(o).dot(d);if(tt<0||tt>far)continue;const cp=o.clone().addScaledVector(d,tt);if(cp.distanceTo(c)<2.6&&tt<ht){ht=tt;hitV=x;}}
  const end0=o.clone().addScaledVector(d,hitV?ht:far);tracer(o,end0,S.me,true);
  if(hitV){if(k==='HE'){blast(end0,8,120,true);hitVeh(hitV,60,true);}else{const r=armorHit2(hitV,end0,d.clone(),k==='APFSDS'?'TANK':'TANKHEAT');if(r&&r.res)tsay('G',/PENETRAT/.test(r.res)?'Hit! Penetration.':/RICOCHET|BOUNCED|NO PEN/i.test(r.res)?'Bounced!':'Hit.');}}
  else{blast(end0,k==='HE'?9:3,k==='HE'?150:40,true);if(k==='HE')scar(end0,3);}
  T.load=T.want||T.load;tsay('G','On the way!');try{if(window.INFNET)INFNET.shot(o.clone(),d.clone(),600,'tank');}catch(e){}}
function tankLost(why){const T=S.tk;if(!T)return;T.v.alive=false;fx(T.v.m.position.clone().setY(T.v.m.position.y+2),3);end(why==='BAILED'?'EVACUATED':'KIA');}
// a hit on your tank, by part, with crew injuries and what they do to the tank
const TKPART=[['engine','ENGINE HIT · we\'re losing power'],['tracks','TRACK\'S GONE · we\'re immobile'],['turret','TURRET DRIVE HIT · manual traverse'],['gun','GUN DAMAGED'],['optics','SIGHT\'S CRACKED'],['ammo','AMMUNITION HIT'],['fire','FIRE IN THE ENGINE BAY']];
function tankHit(dmg,src){const T=S.tk;if(!T)return;const P=T.v;P.hp-=dmg*.25;const pen=dmg>250?rn()<.55:dmg>120?rn()<.25:false;
  if(!pen){tsay('C',rn()<.5?'Bounced! Keep going.':'Hit on the front plate — no penetration.');return;}
  const[k,t]=TKPART[(rn()*TKPART.length)|0];if(k==='fire')T.mod.fire=.05;else if(k==='ammo'){if(rn()<.25){tsay('C','Ammo\'s cooking off!');tankLost('KIA');return;}T.mod.ammo=.5;T.ammo.HE=Math.max(0,T.ammo.HE-6);}else T.mod[k]=Math.max(0,T.mod[k]-.6);tsay('C','We\'re hit! '+t.toLowerCase().replace(/^./,c=>c.toUpperCase())+'.');
  const ck=['C','G','L','D'][(rn()*4)|0],cm=T.crew[ck];if(cm.hp<500&&rn()<.6){cm.hp-=40+rn()*80;if(cm.hp<=0){cm.hp=0;tsay(ck==='C'?'G':'C',cm.n+' is down!');if(ck===T.seat){end('KIA');return;}if(ck==='G'&&T.seat==='D')tsay('C','I have the gun.');}else tsay(ck,'I\'m hit — I\'m okay, keep fighting.');}
  if(P.hp<=0)tankLost('KIA');}
function tankHud(){let el=document.getElementById('iTank');const T=S.tk;if(!el){el=document.createElement('div');el.id='iTank';el.style.cssText='position:fixed;right:16px;bottom:70px;z-index:9991;font:12px "B612 Mono",monospace;color:#cfe3d6;background:rgba(8,12,10,.6);padding:6px 10px;pointer-events:none;line-height:1.5';document.body.appendChild(el);}
  const pc=x=>Math.round(x*100)+'%',c=T.crew;el.innerHTML='<b>'+esc((T.v.name||'TANK').toUpperCase())+'</b> · '+(T.seat==='D'?'DRIVER':'GUNNER')+' · '+Math.round(Math.abs(T.spd)*3.6)+' km/h<br>'+
    'GUN '+(T.ready?'<b style="color:#9fe0b8">'+TKA[T.sel].toUpperCase()+' UP</b>':'loading '+TKA[T.load])+'<br>'+['APFSDS','HEAT','HE'].map((k,i)=>'<span style="padding:0 5px;'+(T.load===k?'background:#cfe3d6;color:#0b0f0d':'')+'">'+(i+1)+' '+k+' '+T.ammo[k]+'</span>').join(' ')+'<br>'+'SIGHT '+['WIDE','×3','×6'][T.zl|0]+' [Z] · '+(T.th?'<b style="color:#fff">THERMAL</b>':'DAY')+' [T] · STAB '+(T.stab?'ON':'<b style="color:#ff9a6a">OFF</b>')+' [F]<br>COAX '+T.coax+' · HMG '+T.hmg+'<br>'+
    'ENG '+pc(T.mod.engine)+' TRK '+pc(T.mod.tracks)+' TUR '+pc(T.mod.turret)+' GUN '+pc(T.mod.gun)+(T.mod.fire>0?' <b style="color:#ff6a4a">FIRE · X</b>':'')+'<br>'+['C','G','L','D'].map(k=>(c[k].hp<=0?'<s>':'')+c[k].n.slice(0,4)+(c[k].hp<=0?'</s>':c[k].hp<60?'+':'')).join(' ');}
/* v420: vehicles sit on the ground, not through it: four contact points (front, back, sides) set the hull's height,
   pitch and roll, so a tank on a slope or over a crest tilts with it instead of its nose or tail sinking into the hill */
function seatV(m,x,z,hd,L,Wd){const fx=-Math.sin(hd),fz=-Math.cos(hd),rx=-fz,rz=fx;const hf=H(x+fx*L/2,z+fz*L/2),hb=H(x-fx*L/2,z-fz*L/2),hr=H(x+rx*Wd/2,z+rz*Wd/2),hl=H(x-rx*Wd/2,z-rz*Wd/2),hc=H(x,z);
  m.rotation.order='YXZ';m.rotation.x=Math.atan2(hf-hb,L);m.rotation.z=Math.atan2(hr-hl,Wd);m.position.y=Math.max(hc,(hf+hb)/2,(hl+hr)/2);}
function vehStep(dt){for(const v of S.veh){if(!v.alive)continue;if(v.goal&&!v.immob&&!(v.hold&&!v.retreat)){const dx=v.goal.x-v.x,dz=v.goal.z-v.z,L2=Math.hypot(dx,dz);if(L2>2){const sp2=(v.tank?3.4:4)*dt;const mvd=vmove(v,dx/L2,dz/L2,sp2);v.m.position.set(v.x,H(v.x,v.z),v.z);const hd=Math.atan2(-mvd.x,-mvd.z);v.m.rotation.y+=Math.atan2(Math.sin(hd-v.m.rotation.y),Math.cos(hd-v.m.rotation.y))*Math.min(1,dt*1.5);}else v.goal=null;}
    if(v.mv&&!v.immob&&!v.hold&&Math.abs(v.stop-v.z)>2){const mvd=vmove(v,0,Math.sign(v.stop-v.z),3.2*dt);v.m.position.set(v.x,H(v.x,v.z),v.z);v.m.rotation.y=Math.atan2(-mvd.x,-mvd.z);}
    if(!v.me&&!v.air)seatV(v.m,v.x,v.z,v.m.rotation.y,v.tank?7:6,3.4);
    if(v.tank&&!v.me)aiTank(v,dt);
    // tank guns: anti-armour against vehicles, high explosive against men and trenches
    if(v.tank&&!v.me)tankMG(v,dt);
  }}
// fighters and attack aircraft of both sides over the battle: pairs that turn and fight, shootdowns, close air support
function jet(side){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:side==='F'?0x7b8790:0x8f8a78});const f=new THREE.Mesh(new THREE.ConeGeometry(.9,16,8),m);f.rotation.x=-Math.PI/2;g.add(f);
  const w=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new V3(0,0,-3),new V3(-6,0,4),new V3(6,0,4)]),m);w.material.side=THREE.DoubleSide;g.add(w);const t=new THREE.Mesh(new THREE.BoxGeometry(.2,3,3),m);t.position.set(0,1.5,6.5);g.add(t);S.sc.add(g);return g;}
function airStep(dt){if(S.phase!=='FIGHT')return;S.airT-=dt;const c=S.village;
  if(S.airT<=0&&S.air.filter(a=>a.alive).length<6){S.airT=10+rn()*14;for(const side of['F','E']){if(rn()<.75){const m=jet(side);const a={m,side,alive:true,t:rn()*6,r:900+rn()*900,y:1200+rn()*1600,w:(.05+rn()*.05)*(rn()<.5?-1:1),cx:c.x+(rn()-.5)*800,cz:c.z+(rn()-.5)*800,name:side==='F'?(S.N.FTR||'fighter'):(S.EN.FTR||'fighter')};S.air.push(a);}}}
  for(let i=S.air.length-1;i>=0;i--){const a=S.air[i];if(a.run&&a.alive){casFly(a,dt);if(a.done){S.sc.remove(a.m);S.air.splice(i,1);}continue;}a.t+=dt;const P=a.m.position;
    if(a.alive){const th=a.t*a.w*6;P.set(a.cx+Math.cos(th)*a.r,H(a.cx,a.cz)+a.y+Math.sin(a.t*.7)*120,a.cz+Math.sin(th)*a.r);a.m.rotation.set(0,-th+(a.w>0?Math.PI:0),a.w>0?-.6:.6);
      if(a.cas&&a.t>a.cas.t){a.cas=null;}
      // a fight: now and then one side downs the other
      if(rn()<dt*.02){const foes=S.air.filter(b=>b.alive&&b.side!==a.side);if(foes.length){const b=foes[0];b.alive=false;b.vy=0;S.kills+=0;say((b.side==='E'?'ENEMY ':'OUR ')+b.name.toUpperCase()+' SHOT DOWN OVERHEAD',2.5);}}
      // close air support: our attack aircraft on enemy armour, theirs on our trench
      if(rn()<dt*.012){const tg=a.side==='F'?S.veh.find(v=>v.alive&&v.side==='E'):(S.mission==='DEFEND'?{m:{position:S.trench[(rn()*S.trench.length)|0]}}:S.us.find(u=>u.alive));
        if(tg){const tp=tg.m.position.clone();blast(tp.clone().add(new V3((rn()-.5)*10,0,(rn()-.5)*10)),14,a.side==='F'?0:180,a.side==='F');if(a.side==='F'&&tg.hp!=null)hitVeh(tg,700,false);
          say((a.side==='F'?'CLOSE AIR SUPPORT · '+(S.N.ATK||'our attack aircraft'):'ENEMY AIR STRIKE · '+(S.EN.ATK||'attack aircraft')).toUpperCase(),2.5);}}
      if(a.t>90){S.sc.remove(a.m);S.air.splice(i,1);}}
    else{a.vy=(a.vy||0)-9.8*dt;P.y+=a.vy*dt*3;a.m.rotation.x+=dt;if(rn()<.5)fx(P.clone(),2.5);if(P.y<H(P.x,P.z)){fx(new V3(P.x,H(P.x,P.z)+5,P.z),12);S.sc.remove(a.m);S.air.splice(i,1);}}}}

/* ------------------------------------------------------------------ v380: in the live world */
// From a world-war sortie the battle is fought in the game's own world: the flight sortie starts as usual, the world
// moves to the battle site on the front (real terrain, real towns around it), and you fight on foot while the flight
// simulation keeps running: real AI flights of both sides, missiles and the war's clock go on around you. Your
// aircraft waits out of the way (hidden, untouchable) until the battle ends; then the sortie closes.
if(typeof Jet!=='undefined'){const _s=Jet.prototype.step,_d=Jet.prototype.damage;
  Jet.prototype.step=function(h){if(this.infantry&&S&&S.WM){this.pos.copy(S.pos).add(S.O);this.pos.y+=60;this.vel.set(0,0,0);if(this.mesh)this.mesh.visible=false;return;}if(this.infantry&&!S){if(this.mesh)this.mesh.visible=false;this.vel.set(0,0,0);return;}return _s.apply(this,arguments);};
  if(_d)Jet.prototype.damage=function(){if(this.infantry&&S&&S.WM)return;return _d.apply(this,arguments);};}
function facade(){if(facade.t)return facade.t;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#d8d2c4';g.fillRect(0,0,128,128);
  g.fillStyle='#bdb5a4';for(let y=0;y<128;y+=32)g.fillRect(0,y+28,128,4);                                  // floor bands
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){const lit=((x*7+y*3)%5)===0;g.fillStyle=lit?'#e8d79a':'#3a4652';g.fillRect(x*32+7,y*32+8,18,16);g.fillStyle='#f0ece2';g.fillRect(x*32+15,y*32+8,2,16);g.fillRect(x*32+6,y*32+24,20,2);}
  g.fillStyle='#5a4a3a';g.fillRect(52,104,24,24);                                                          // door (bottom row)
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return facade.t=t;}
function worldOn(){if(window.WF&&WF.townMesh){const m=WF.townMesh.material;S.tm0={map:m.map};m.map=facade();m.needsUpdate=true;}S.view0=typeof view!=='undefined'?view:null;try{view='chase';}catch(e){}if(player){player.infantry=true;if(player.mesh)player.mesh.visible=false;}S.near0=camera.near;S.fov0=camera.fov;document.body.classList.add('infWorld');
  if(!document.getElementById('infWCss')){const st=document.createElement('style');st.id='infWCss';st.textContent='body.infWorld #hud,body.infWorld #iffbar,body.infWorld #dmg,body.infWorld .mfd,body.infWorld #rwrBox,body.infWorld #touch{display:none!important}';document.head.appendChild(st);}}
const KEEP=new Set(['view','msg','infCv','infHud','u2m','menu']);   // v407: the cockpit radio panel is hidden on foot
function hideFlight(){const v=document.getElementById('view');if(v)for(const el of v.children){if(el.id==='gl'||el.dataset.infhid)continue;el.dataset.infhid='1';el.style.setProperty('display','none','important');}
  for(const el of document.body.children){if(KEEP.has(el.id)||/^i[A-Z]/.test(el.id)||el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.dataset.infhid)continue;if(getComputedStyle(el).display==='none')continue;el.dataset.infhid='1';el.style.setProperty('display','none','important');}}
function showFlight(){for(const el of document.querySelectorAll('[data-infhid]')){el.style.removeProperty('display');delete el.dataset.infhid;}}
function worldOff(){showFlight();if(S.hidden&&window.WF&&WF.townMesh){for(const[b,M]of S.hidden)if(b[7])WF.townMesh.setMatrixAt(b[6],M);WF.townMesh.instanceMatrix.needsUpdate=true;}try{if(S.view0)view=S.view0;}catch(e){}if(window.WF&&WF.townMesh&&S.tm0){WF.townMesh.material.map=S.tm0.map;WF.townMesh.material.needsUpdate=true;}
  // v397: your aircraft stays hidden until the sortie has closed — it never appears at the battle site
  const pl=typeof player!=='undefined'?player:null;if(pl){pl.infantry=false;if(pl.mesh)pl.mesh.visible=false;setTimeout(()=>{try{if(typeof openMenu==='function')openMenu();}catch(e){}if(pl.mesh&&!pl.infantry)pl.mesh.visible=true;},120);}   // you return to the menu, not to the cockpitcamera.near=S.near0||camera.near;camera.fov=S.fov0||camera.fov;camera.updateProjectionMatrix();
  document.body.classList.remove('infWorld');scene.remove(S.sc);scene.remove(S.vmRoot);if(window.WF&&WF.on&&WF.leave)setTimeout(()=>{try{WF.leave();}catch(e){}},50);}
async function startWorld(cfg){const mi=setInterval(()=>{try{if(typeof sfx!=='undefined'&&sfx.ctx)sfx.mute(true);}catch(e){}},50);   // v408: the aircraft is silent while you travel to the front
  try{return await startWorld0(cfg);}finally{clearInterval(mi);try{if(typeof sfx!=='undefined'&&sfx.ctx)sfx.mute(true);}catch(e){}}}
async function startWorld0(cfg){const G=window.WGEO;if(!window.WSORTIE||!window.WF||!G||!W.st){return start(cfg);}
  const st=W.st,p=st.c[cfg.a3],me=p.side;const fr=st.fronts.find(f=>!f.cf&&(f.a===cfg.a3||f.b===cfg.a3))||st.fronts.find(f=>!f.cf&&(st.c[f.a].side===me||st.c[f.b].side===me));
  let fr2=fr;if(cfg.loc0){const C=locChoices(cfg).find(c=>c.id===cfg.loc0);const f2=C&&st.fronts.find(f=>f.id===C.fr);if(f2)fr2=f2;}const loc=resolveLoc(cfg,fr2,null);if(!loc.real){return start(cfg);}
  // a loading screen covers the move: you do not see your aircraft on the runway, at the site, or under unloaded ground
  const cov=document.createElement('div');cov.id='infLoad';cov.style.cssText='position:fixed;inset:0;z-index:9999;background:#0b0f0d;color:#cfe3d6;display:flex;align-items:center;justify-content:center;font:14px "B612 Mono",monospace;letter-spacing:.14em';
  cov.textContent='MOVING TO THE FRONT · '+loc.name.toUpperCase()+' …';document.body.appendChild(cov);const unc=()=>cov.remove();
  try{
  await WSORTIE.start(cfg.a3,cfg.ap);for(let i=0;i<200&&!(WF.on&&player);i++)await new Promise(r=>setTimeout(r,100));if(!WF.on||!player)return start(cfg);
  if(player.mesh)player.mesh.visible=false;player.infantry=true;
  const q=G.ll2xz(loc.lat,loc.lon);player.pos.set(q.x,groundAt(q.x,q.z)+60,q.z);player.vel.set(0,0,0);try{await WF.rebase();}catch(e){}
  // wait for the ground at the site to be loaded (its height settles)
  /* v421: the whole battlefield's detailed terrain is in before anything is built on it, and kept (pinned) until the
     battle ends, so trenches and houses are not left standing on heights the terrain later replaces */
  try{if(G.prefetch){cov.textContent='MOVING TO THE FRONT · '+loc.name.toUpperCase()+' · LOADING TERRAIN …';let tr=null;for(let k=0;k<5;k++){const r=tr=await G.prefetch(loc.lat,loc.lon,2600,(d,n)=>{cov.textContent='MOVING TO THE FRONT · '+loc.name.toUpperCase()+' · TERRAIN '+d+' / '+n;},15000);if(r.have>=r.need)break;cov.textContent='MOVING TO THE FRONT · '+loc.name.toUpperCase()+' · TERRAIN '+r.have+' / '+r.need+' · RETRYING';await new Promise(q=>setTimeout(q,1500));}   /* v424: wait until every tile of the battlefield is in */if(tr&&tr.have<tr.need){/* v427: the real terrain did not load: fight on generated ground rather than on a broken (sea-level) one */unc();try{if(typeof player!=='undefined'&&player)player.infantry=false;}catch(e){}
      const r2=start(cfg);setTimeout(()=>{try{vline('HQ','The map of '+loc.name+' did not load ('+tr.have+' of '+tr.need+' terrain tiles): this battle is fought on generated terrain.');}catch(e){}},2500);return r2;}
    G.pin(loc.lat,loc.lon,2600,true);window._infPin=[loc.lat,loc.lon];if(WF.build){WF.build();}   /* v422: the terrain mesh is rebuilt from the detailed heights: the battle is built on that mesh, never on a sea-level gap */}}catch(e){}
  {const q1=G.ll2xz(loc.lat,loc.lon);let h0=groundAt(q1.x,q1.z);for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,100));const h=groundAt(q1.x,q1.z);if(Math.abs(h-h0)<.05&&i>3)break;h0=h;}}
  try{const c=conditions({...cfg,loc});ENV.tod=c.tod;ENV.rate=0;const map={CLEAR:'CLEAR',CLOUD:'SCATTERED',RAIN:'OVERCAST',SNOW:'OVERCAST',STORM:'STORM'};if(map[c.wx])ENV.wx=map[c.wx];ENV.setup&&ENV.setup();ENV.step&&ENV.step(0,true);cfg.cond=c;}catch(e){}
  const q2=G.ll2xz(loc.lat,loc.lon);cfg.world=true;cfg.loc=loc;cfg.O=new V3(q2.x,0,q2.z+260);const r=start(cfg);unc();return r;}
  catch(e){unc();console.warn('[infantry] world start',e);return start(cfg);}}

if(window.WF&&WF.shift&&!WF._inf){const _sh=WF.shift;WF.shift=function(dx,dz){const r=_sh.apply(this,arguments);if(S&&S.WM){S.O.x-=dx;S.O.z-=dz;S.sc.position.copy(S.O);}return r;};WF._inf=1;}

/* ------------------------------------------------------------------ v380: backup, engineers, offensives, battle damage */
// Enemy troops radio for backup when they lose men: reinforcements with a vehicle, an artillery strike, or drones.
// Engineers (two in each squad, and you with the ENGINEER role) dig trench sections and sandbag walls where it is quiet.
// You can call an OFFENSIVE (O, twice a battle): a preparatory barrage on the enemy and a fresh assault group with a tank;
// it also pushes that sector of the front in the war (or the campaign). The ground scars as the fight goes on: craters,
// holed and collapsed walls, burning wrecks.
function arty(c,n,side){S.arty={c:c.clone(),n,t:1.5,side};}
function battleStep(dt){if(S.phase!=='FIGHT')return;
  const dead=S.them.filter(u=>!u.alive).length;
  if(!S.pend&&!S.eCP&&S.calls<4&&dead-S.callDead>=4){S.callDead=dead;S.calls++;const k=['REINF','ARTY','DRONES'][(rn()*3)|0];S.pend={k,t:15+rn()*10};say('ENEMY RADIO · THEY ARE CALLING FOR '+(k==='REINF'?'REINFORCEMENTS':k==='ARTY'?'ARTILLERY':'DRONES'),3);}
  if(S.pend){S.pend.t-=dt;if(S.pend.t<=0){const k=S.pend.k;S.pend=null;
    if(k==='REINF'){const bz=S.mission==='DEFEND'?S.trZ-560:S.village.z-200;for(let i=0;i<6;i++)S.them.push(man(false,(rn()-.5)*160,bz-rn()*60));const x=(rn()-.5)*100,z=bz-80,v=vehicle('EIFV',0x6a5a3a);v.position.set(x,H(x,z),z);S.sc.add(v);S.veh.push({m:v,hp:600,side:'E',x,z,cool:3,alive:true,mv:1,stop:S.mission==='DEFEND'?S.trZ-200:S.village.z-40});say('ENEMY REINFORCEMENTS ARRIVE',3);}
    else if(k==='ARTY'){const al=S.us.filter(u=>u.alive);const c=al.length?al[(rn()*al.length)|0].m.position:S.pos;arty(c,8,'E');say('INCOMING ARTILLERY',3);}
    else{spawnDrone('FPV','E');spawnDrone('FPV','E');}}}
  if(S.arty){S.arty.t-=dt;if(S.arty.t<=0){S.arty.t=1+rn()*.8;S.arty.n--;const a=S.arty,p=a.c.clone().add(new V3((rn()-.5)*50,0,(rn()-.5)*50));p.y=H(p.x,p.z);blast(p,11,a.side==='F'?0:150,false);if(a.side==='F')for(const u of S.them)if(u.alive&&u.m.position.distanceTo(p)<11)hitMan(u,150,false);if(a.n<=0)S.arty=null;}}
  // engineers dig in where no enemy is near
  for(const u of[...S.us,...S.them]){if(!u.alive||!u.eng)continue;u.dg=(u.dg||0)+dt;const foes=u.friend?S.them:S.us;if(foes.some(f=>f.alive&&f.m.position.distanceTo(u.m.position)<90))continue;
    if(u.dg>12&&S.dug<40){u.dg=0;const P=u.m.position;digTrench(P,u.friend?-1:1,u.friend);}}
  // fires and smoke from wrecks
  for(const f of S.fires){f.t+=dt;if(f.t<120&&rn()<dt*4)smoke(f.p);}
  for(let i=S.smk.length-1;i>=0;i--){const m=S.smk[i];m.userData.t+=dt;m.position.y+=dt*2.5;m.scale.setScalar(1+m.userData.t*.8);m.material.opacity=Math.max(0,.5-m.userData.t*.08);if(m.userData.t>6){S.sc.remove(m);S.smk.splice(i,1);}}}
function smoke(p){S.smk=S.smk||[];if(S.smk.length>80)return;const m=new THREE.Mesh(new THREE.SphereGeometry(1.4,6,5),new THREE.MeshBasicMaterial({color:0x3a3a3a,transparent:true,opacity:.5,depthWrite:false}));m.position.copy(p).add(new V3((rn()-.5)*1.5,0,(rn()-.5)*1.5));m.userData.t=0;S.sc.add(m);S.smk.push(m);}
// a trench section with an earth parapet facing the enemy (dir -1: the enemy is to the north, -z)
function dig(mine,at,dir){if(mine){if(S.bags<=0||S.phase!=='FIGHT'){say('NO SANDBAGS LEFT',1.5);return;}S.bags--;}
  const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw));const P=at?at.clone():S.pos.clone().addScaledVector(f,1.8);let ax=Math.abs(f.x)>Math.abs(f.z)&&mine;const sg=mine?(ax?Math.sign(f.x):Math.sign(f.z)):(dir||-1);
  const g=H(P.x,P.z),earth=new THREE.MeshLambertMaterial({color:mine?0x8c7d5a:0x5a4630});const w=4,t=.9,h=1.3;let b;
  if(ax)b={x0:P.x+sg*.2,x1:P.x+sg*.2+sg*t,z0:P.z-w/2,z1:P.z+w/2};else b={x0:P.x-w/2,x1:P.x+w/2,z0:P.z+sg*.2,z1:P.z+sg*.2+sg*t};
  const x0=Math.min(b.x0,b.x1),x1=Math.max(b.x0,b.x1),z0=Math.min(b.z0,b.z1),z1=Math.max(b.z0,b.z1);
  const m=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,h+.4,z1-z0),earth);m.position.set((x0+x1)/2,g+h/2-.2,(z0+z1)/2);S.sc.add(m);S.solid.push(m);{const bb={x0,y0:g-.4,z0,x1,y1:g+h,z1,m};S.blds.push(bb);gridAdd(bb);}S.dug++;
  if(mine)say('SANDBAG WALL BUILT · '+S.bags+' LEFT',1.5);return m;}
// v407: dig an 8 m trench section where you stand, across your facing (or along x for AI engineers); both sides dig
function digTrench(P,face,friend,ang){const a=ang??0,cx=P.x,cz=P.z,dx=Math.cos(a)*4,dz=-Math.sin(a)*4;for(let t=0;t<=1.001;t+=.125){if(collideTest(new V3(cx-dx+2*dx*t,0,cz-dz+2*dz*t))){if(friend&&!ang&&ang!==0)return null;if(ang!=null&&friend)say('CANNOT DIG HERE · A BUILDING IS IN THE WAY',1.5);return null;}}const g={x0:cx-dx,z0:cz-dz,x1:cx+dx,z1:cz+dz,w:TRW,d:TRD};g.dyn=1;if(TR.G.length>=96){const k=TR.G.findIndex(q=>q.dyn);if(k>=0)TR.G.splice(k,1);else return null;}TR.G.push(g);
  const pts=[];for(let t=0;t<=1.0001;t+=.125)pts.push({x:g.x0+(g.x1-g.x0)*t,z:g.z0+(g.z1-g.z0)*t});trBuild(S.sc,pts,face,TRW,TRD);trSync();S.dug++;if(friend!==false&&S.phase==='FIGHT'&&rn()<.3)say((friend?'OUR':'ENEMY')+' ENGINEERS DIG A NEW TRENCH SECTION',1.5);return g;}
function digMine(){if(S.phase!=='FIGHT')return;if(!(S.cfg&&S.cfg.role==='ENGINEER')){say('ONLY ENGINEERS DIG TRENCHES (B: SANDBAGS)',1.5);return;}if((S.trN=(S.trN||0)+1)>12){say('NO MORE TRENCH STORES',1.5);return;}
  const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw));const P=S.pos.clone().addScaledVector(f,3);const ang=S.yaw+Math.PI/2;digTrench(P,f.z<0?-1:1,true,S.yaw);say('TRENCH SECTION DUG ('+(12-S.trN)+' LEFT)',1.5);}
/* v407: Esc pauses the battle: everything stops where it is; a map shows where you are (the battle area, and the place
   on Earth and in the war); RESUME, MAIN MENU (the battle waits, paused, behind it) or LEAVE THE BATTLE. */
/* v411: Esc pauses the battle and opens the MAIN MENU on the CAMPAIGN tab (the world-war map, centred on the battle,
   your position marked). RESUME in the menu, or Esc again, returns you to the fight exactly where you were. */
function pauseMenu(on){if(!S)return;closePan();const $m=id=>document.getElementById(id);
  if(!on){if(!S.paused)return;S.paused=false;const m=$m('menu');if(m)m.hidden=true;S.hud.style.display='';S.cv.style.display='';try{if(typeof game!=='undefined')game.paused=S.gp0??game.paused;}catch(e){}
    const rb=$m('infBack');if(rb)rb.remove();const ip=$m('infPause');if(ip)ip.remove();say('RESUMED · CLICK TO AIM',1.5);return;}
  if(S.paused)return;S.paused=true;if(document.pointerLockElement)document.exitPointerLock();S.hud.style.display='none';S.cv.style.display='none';
  try{S.gp0=typeof game!=='undefined'?game.paused:false;if(typeof openMenu==='function')openMenu();}catch(e){}
  const m=$m('menu');if(m)m.hidden=false;const r=$m('resume');if(r){r.hidden=false;r.textContent='RESUME THE BATTLE ▸';}
  try{const t=document.querySelector('.hq-tabs [data-tab="camp"]');if(t)t.click();const w=document.querySelector('#cmMode [data-m="WAR"]');if(w&&w.getAttribute('aria-pressed')!=='true')w.click();}catch(e){}
  const L=S.loc||{};setTimeout(()=>{try{if(window.WMAP&&L.lat!=null){WMAP.M.lat=L.lat;WMAP.M.lon=L.lon;WMAP.M.ppd=Math.max(WMAP.M.ppd||0,22);WMAP.draw&&WMAP.draw();}}catch(e){}},80);}
// the menu's RESUME button returns to the battle while it is paused
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#resume');if(!b||!S||!S.paused)return;e.stopImmediatePropagation();e.preventDefault();b.textContent='RESUME ▸';pauseMenu(false);},true);
// your position on the campaign map while paused
if(window.WARMAP){const _d=WARMAP.draw;WARMAP.draw=function(c,w2s,M,phase){const r=_d.apply(this,arguments);try{if(phase==='over'&&S&&S.paused&&S.loc&&S.loc.lat!=null){const[x,y]=w2s(S.loc.lat,S.loc.lon);c.fillStyle='#fff';c.strokeStyle='#000';c.lineWidth=2;c.beginPath();c.arc(x,y,7,0,7);c.fill();c.stroke();c.fillStyle='#fff';c.font='700 12px "B612 Mono",monospace';c.fillText('YOU · '+(S.loc.name||''),x+11,y+4);}}catch(e){}return r;};}
// the browser's own Esc releases the mouse first: losing the mouse in a fight opens the pause menu (so one Esc pauses, the next resumes)
document.addEventListener('pointerlockchange',()=>{if(!S||S.res||S.paused||S.pan||S.phase!=='FIGHT')return;if(!document.pointerLockElement&&S.locked)pauseMenu(true);S.locked=!!document.pointerLockElement;});
setInterval(()=>{if(S&&document.pointerLockElement)S.locked=true;},500);
function offensive(){if(S.phase!=='FIGHT')return;if(S.fCP){say('OUR COMMAND POST IS GONE · NO OFFENSIVES',2);return;}if(S.offN>=(S.mission==='FRONT'?5:2)){say('NO MORE OFFENSIVES THIS BATTLE',2);return;}S.offN++;
  if(S.mission==='FRONT'){if(S.cur>=S.lines.length-1)return;S.push=true;S.pushT=0;say('OFFENSIVE · ON THE NEXT TRENCH',2);}
  const nx=S.mission==='FRONT'?S.lines[S.cur+1]:null;const tgt=nx?new V3(0,0,nx.z):S.mission==='DEFEND'?new V3(0,0,S.trZ-300):S.village.clone();arty(tgt,10,'F');
  const z0=nx?S.lines[S.cur].z+120:S.mission==='DEFEND'?S.trZ+150:300;for(let i=0;i<10;i++){const u=man(true,(rn()-.5)*80,z0+rn()*40);u.off=true;S.us.push(u);}
  const m=tank(S.me,0x4e5a3c),x=(rn()-.5)*60;m.position.set(x,H(x,z0+60),z0+60);S.sc.add(m);S.veh.push({m,hp:1100,side:'F',x,z:z0+60,cool:3,alive:true,tank:1,mv:1,stop:nx?nx.z+70:S.mission==='DEFEND'?S.trZ-150:S.village.z+80,name:m.userData.name});
  // the war: a local push on this sector
  let note='';const st=S.cfg.camp?null:W.st;if(st&&S.fr){const mid=S.fr.sec[(S.fr.sec.length/2)|0],mine=st.c[S.fr.a].side===S.me;mid.off+=mine?.3:-.3;const p=st.c[S.cfg.a3];if(p)p.gnd*=.995;W.emit('OFFENSIVE',{e:[S.cfg.a3],txt:(p?p.n:'')+' opens a local offensive at '+S.loc.name+'.'});note=' · THE FRONT PUSHES';}
  if(S.cfg.camp&&typeof CAMP!=='undefined'&&CAMP.st&&S.cs!=null){CAMP.st.front[S.cs]-=400;CAMP.log('Local offensive at '+S.loc.name+', sector '+(S.cs+1)+'.','b');note=' · SECTOR '+(S.cs+1)+' PUSHES';}
  say('OFFENSIVE · BARRAGE, '+(S.N.MBT||'TANK').toUpperCase()+' AND TEN RIFLEMEN'+note,4);}
// craters and holed walls
function scar(p,r){const hitB=new Set();structHit(p,r);const g=H(p.x,p.z),cm=new THREE.Mesh(new THREE.CircleGeometry(r*.35,10),new THREE.MeshLambertMaterial({color:0x2b241c,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));cm.rotation.x=-Math.PI/2;cm.position.set(p.x,g+.07,p.z);if(!S.quiet){S.sc.add(cm);S.craters.push(cm);}
  if(S.craters.length>300)S.sc.remove(S.craters.shift());
  if(S.ter&&S.craters.length%10===0){const c=S.ter.material.color;c.lerp(new THREE.Color(0x4a4636),.04);}
  for(let i=S.blds.length-1;i>=0;i--){const b=S.blds[i];if(b.y1-b.y0<2||!b.m)continue;const cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,cy=(b.y0+b.y1)/2;if(Math.hypot(cx-p.x,cz-p.z,cy-p.y)>r*.45||rn()<.4)continue;
    removeBox(b);S.holes=(S.holes||0)+1;if(b.bid!=null&&S.BLD[b.bid])hitB.add(S.BLD[b.bid]);
    if(!S.quiet){const rb=new THREE.Mesh(new THREE.BoxGeometry(b.x1-b.x0+.6,.5,b.z1-b.z0+.6),RUBM);rb.position.set(cx,b.y0+.25,cz);S.sc.add(rb);}}
  for(const c of hitB)settle(c);}
/* v420: nothing floats. A wall block with nothing under it falls; a house that has lost much of itself collapses into a
   rubble mound instead of standing as pieces in the air. */
const RUBM=new THREE.MeshLambertMaterial({color:0x6d665a});
function settle(c){if(!c||c.down||!c.parts)return;const L=c.parts.filter(q=>!q.gone);if(!L.length)return;const g0=Math.min(...c.parts.map(q=>q.y0));
  let ch=true;while(ch){ch=false;for(const q of L){if(q.gone||q.y0<=g0+.4)continue;const ok=L.some(o=>!o.gone&&o!==q&&Math.abs(o.y1-q.y0)<.35&&o.x0<q.x1-.05&&o.x1>q.x0+.05&&o.z0<q.z1-.05&&o.z1>q.z0+.05);if(!ok){removeBox(q);ch=true;}}}
  const gone=c.parts.filter(q=>q.gone).length/c.parts.length;if(gone>.45){try{collapse(c,'');}catch(e){}}}

/* ------------------------------------------------------------------ v382: performance */
// A building is drawn as one merged mesh per material (not dozens of boxes), rebuilt when a wall is blown out. Walls and
// floors are found through a 20 m grid; rays (shots, line of sight, drones) are tested against their boxes by plain
// slab maths and against the ground by sampling its height, instead of raycasting thousands of meshes and the terrain.
function mergeB(c){for(const m of c.meshes){c.sc.remove(m);m.geometry.dispose();}c.meshes=[];const by=new Map();
  for(const q of c.parts){if(q.gone)continue;const mat=q.m.material;let L=by.get(mat);if(!L){L={p:[],n:[]};by.set(mat,L);}const g=q.m.geometry.index?q.m.geometry.toNonIndexed():q.m.geometry;
    const P=g.attributes.position.array,N=g.attributes.normal.array,o=q.m.position;for(let i=0;i<P.length;i+=3){L.p.push(P[i]+o.x,P[i+1]+o.y,P[i+2]+o.z);L.n.push(N[i],N[i+1],N[i+2]);}}
  for(const[mat,L]of by){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(L.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(L.n,3));g.computeBoundingSphere();
    const m=new THREE.Mesh(g,mat);m.matrixAutoUpdate=false;m.updateMatrix();c.sc.add(m);c.meshes.push(m);}}
const GC=20,gk=(i,j)=>i*100003+j;
function gridAdd(b){const G=S.grid;for(let i=Math.floor(b.x0/GC);i<=Math.floor(b.x1/GC);i++)for(let j=Math.floor(b.z0/GC);j<=Math.floor(b.z1/GC);j++){const k=gk(i,j);let L=G.get(k);if(!L){L=[];G.set(k,L);}L.push(b);}}
function gridBuild(){S.grid=new Map();for(const b of S.blds)gridAdd(b);}
// v383: where grass and bushes may grow (local x, z): not in a town's built-up area (the battlefield's own town square;
// in the live world, the real urban footprints), not within a few metres of any wall, not in the trench or on streets.
const _gb=[];
function green(x,z,pad){const v=S.village;if(TR.n&&(cut(x,z)>0||cut(x+1.5,z)>0||cut(x-1.5,z)>0||cut(x,z+1.5)>0||cut(x,z-1.5)>0))return false;/* v407: nothing grows in a trench */if(S.townR&&Math.abs(x-v.x)<S.townR&&Math.abs(z-v.z)<S.townR)return false;
  if(S.mission==='DEFEND'&&Math.abs(z-S.trZ)<10&&Math.abs(x)<185)return false;
  if(S.urb){const wx=x+S.O.x,wz=z+S.O.z;for(const u of S.urb){if(wx<u.x0||wx>u.x1||wz<u.z0||wz>u.z1)continue;let c=false;const X=u.xs,Z=u.zs;for(let i=0,j=X.length-1;i<X.length;j=i++)if((Z[i]>wz)!==(Z[j]>wz)&&wx<(X[j]-X[i])*(wz-Z[i])/(Z[j]-Z[i])+X[i])c=!c;if(c)return false;}}
  const r=pad||3;return near(x-r,z-r,x+r,z+r,_gb).length===0;}
function layGreen(){// the real urban footprints near the battle (world coordinates; they move with the world's origin, as S.O does)
  S.urb=S.WM&&window.WF&&WF.urbanPolys?WF.urbanPolys.filter(u=>u.x1>S.O.x-3000&&u.x0<S.O.x+3000&&u.z1>S.O.z-3000&&u.z0<S.O.z+3000):null;
  const M=new THREE.Matrix4();let n=0;for(let i=0;i<2400&&n<900;i++){const x=(rn()-.5)*1400,z=(rn()-.5)*1400-200;if(!green(x,z,4))continue;const k=.6+rn()*1.4;M.makeScale(k*1.3,k,k*1.3).setPosition(x,H(x,z)+k*.5,z);S.bush.setMatrixAt(n++,M);}
  S.bush.count=n;S.bush.instanceMatrix.needsUpdate=true;}
function near(x0,z0,x1,z1,out){const G=S.grid;out.length=0;const seen=near.seen||(near.seen=new Set());seen.clear();
  for(let i=Math.floor(x0/GC);i<=Math.floor(x1/GC);i++)for(let j=Math.floor(z0/GC);j<=Math.floor(z1/GC);j++){const L=G.get(gk(i,j));if(!L)continue;for(const b of L)if(!b.gone&&!seen.has(b)){seen.add(b);out.push(b);}}return out;}
const _nb=[];
// the nearest box a ray meets within far (local coordinates), or Infinity
function rayBoxes(o,d,far){const seen=rayBoxes.seen||(rayBoxes.seen=new Set());seen.clear();let best=Infinity;const st=Math.max(4,far/200);
  for(let t=0;t<=far+st;t+=st){const x=o.x+d.x*t,z=o.z+d.z*t;const L=S.grid.get(gk(Math.floor(x/GC),Math.floor(z/GC)));if(!L)continue;
    for(const b of L){if(b.gone||seen.has(b))continue;seen.add(b);let t0=0,t1=far;
      const sl=(oa,da,lo,hi)=>{if(Math.abs(da)<1e-9){if(oa<lo||oa>hi){t0=1e9;}return;}let a=(lo-oa)/da,c=(hi-oa)/da;if(a>c){const q=a;a=c;c=q;}if(a>t0)t0=a;if(c<t1)t1=c;};
      sl(o.x,d.x,b.x0,b.x1);sl(o.y,d.y,b.y0,b.y1);sl(o.z,d.z,b.z0,b.z1);if(t0<=t1&&t0<best&&t0<=far)best=t0;}
    if(best<t)break;}
  return best;}
// where a ray first goes under the ground (sampled), or Infinity
function rayGround(o,d,far){let t=0,prev=0;while(t<far){const st=t<60?2:t<300?6:15;t=Math.min(far,t+st);const x=o.x+d.x*t,y=o.y+d.y*t,z=o.z+d.z*t;if(y<H(x,z)-.05)return prev+(t-prev)*.5;prev=t;}return Infinity;}
function rayWorld(o,d,far){return Math.min(rayBoxes(o,d,far),rayGround(o,d,far));}

/* ------------------------------------------------------------------ v386: infantry sound */
// Its own synthesised sound (Web Audio), not the flight sim's: that is muted while you are on foot (no jet engine).
// Everything is placed left / right by bearing and falls off with distance: your shots by gun class (a suppressor
// muffles them), enemy fire, rounds cracking past you, hits on you, explosions, footsteps (walk, run, crouch, indoors),
// reloads, the launcher, and running loops for tank / IFV engines, FPV and one-way and armed drones, helicopters and
// the transport plane.
const AU={C:null,M:null,nb:null,loops:new Map(),fs:0};
function auInit(){if(AU.C)return AU.C;const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;try{const C=new A();AU.C=C;AU.M=C.createGain();
  AU.M.gain.value=.8*((typeof SET!=='undefined'&&SET.vol!=null)?SET.vol/80:1);AU.M.connect(C.destination);const b=C.createBuffer(1,C.sampleRate*1.5,C.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AU.nb=b;}catch(e){AU.C=null;}return AU.C;}
// where a sound at local point p sits for you: gain by distance, pan by bearing
function place(p,ref){if(!p||!S)return{g:1,pan:0};const dx=p.x-S.pos.x,dz=p.z-S.pos.z,dy=(p.y||S.pos.y)-S.pos.y,d=Math.hypot(dx,dz,dy);const fx=-Math.sin(S.yaw),fz=-Math.cos(S.yaw),rx=-fz,rz=fx;
  const pan=d<.5?0:Math.max(-1,Math.min(1,(dx*rx+dz*rz)/d));return{g:1/(1+Math.pow(d/(ref||25),1.3)),pan,d};}
function out(g0,pan){const C=AU.C,g=C.createGain();g.gain.value=g0;let n=g;if(C.createStereoPanner){const P=C.createStereoPanner();P.pan.value=pan||0;g.connect(P);P.connect(AU.M);}else g.connect(AU.M);return g;}
function nz(dest,t0,dur,type,f,q,a,decay){const C=AU.C,src=C.createBufferSource();src.buffer=AU.nb;src.loop=true;const fl=C.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||.7;const e=C.createGain();
  e.gain.setValueAtTime(0,t0);e.gain.linearRampToValueAtTime(a,t0+.004);e.gain.exponentialRampToValueAtTime(.0005,t0+(decay||dur));src.connect(fl);fl.connect(e);e.connect(dest);src.start(t0,Math.random());src.stop(t0+dur+.05);}
function tone(dest,t0,type,f0,f1,dur,a){const C=AU.C,o=C.createOscillator(),e=C.createGain();o.type=type;o.frequency.setValueAtTime(f0,t0);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t0+dur);
  e.gain.setValueAtTime(a,t0);e.gain.exponentialRampToValueAtTime(.0005,t0+dur);o.connect(e);e.connect(dest);o.start(t0);o.stop(t0+dur+.02);}
const SND={
  shot(g){if(!AU.C)return;const t=AU.C.currentTime,cls=g.cls||'PISTOL',big=cls==='SNP'||cls==='DMR'||g.am,q=g.quiet;const o=out(q?.35:big?1:.8,0);
    if(cls==='SHOT'){nz(o,t,.35,'lowpass',q?1200:2600,.7,1,.3);tone(o,t,'sine',110,40,.25,.9);return;}
    nz(o,t,big?.45:.18,'highpass',q?300:900,.6,q?.5:1,big?.4:.14);nz(o,t,big?.6:.25,'lowpass',q?700:1600,.8,q?.4:.8,big?.55:.2);tone(o,t,'sine',big?80:110,35,big?.3:.14,big?1:.7);
    if(g.am)tone(o,t,'sine',55,25,.6,1);},
  launch(){if(!AU.C)return;const t=AU.C.currentTime,o=out(.9,0);nz(o,t,.9,'bandpass',700,.6,.9,.85);tone(o,t,'sawtooth',90,40,.5,.25);},
  thunk(){if(!AU.C)return;const t=AU.C.currentTime,o=out(.7,0);tone(o,t,'sine',160,60,.18,.9);nz(o,t,.12,'lowpass',900,.7,.4,.1);},
  far(p,big){if(!AU.C)return;const P=place(p,40);if(P.g<.03)return;const t=AU.C.currentTime+Math.min(1.2,P.d/340),o=out(P.g*(big?1:.75),P.pan);nz(o,t,.3,'lowpass',Math.max(400,2600-P.d*4),.7,.9,.25);tone(o,t,'sine',90,40,.18,.5);},
  whiz(p){if(!AU.C)return;const P=place(p,8),t=AU.C.currentTime,o=out(.55,P.pan);nz(o,t,.07,'highpass',3000,.8,.9,.06);tone(o,t,'sine',2400,500,.09,.25);},
  hit(){if(!AU.C)return;const t=AU.C.currentTime,o=out(.9,0);tone(o,t,'sine',70,40,.2,1);nz(o,t,.1,'lowpass',500,.7,.7,.08);},
  boom(p,r){if(!AU.C)return;const P=place(p,60+(r||5)*6);if(P.g<.02)return;const t=AU.C.currentTime+Math.min(2,P.d/340),o=out(Math.min(1.4,P.g*(.5+(r||5)/10)),P.pan);
    nz(o,t,1.6,'lowpass',Math.max(150,900-P.d*.6),.7,1,1.4);tone(o,t,'sine',60,25,1,1);if(P.d<120)nz(o,t,.25,'highpass',1500,.6,.5,.2);},
  step(run,crouch,indoor){if(!AU.C)return;const t=AU.C.currentTime,o=out(crouch?.12:run?.35:.22,(AU.fs++%2)?.15:-.15);nz(o,t,.09,'bandpass',indoor?1800:(500+Math.random()*250),indoor?2.5:1.2,1,.07);if(!indoor)nz(o,t+.02,.06,'highpass',2500,.6,.25,.05);},
  click(){if(!AU.C)return;const t=AU.C.currentTime,o=out(.4,.2);tone(o,t,'square',1800,900,.03,.4);tone(o,t+.35,'square',1400,700,.04,.5);nz(o,t+.6,.05,'highpass',2000,1,.4,.05);}};
// running loops: one per vehicle, drone, helicopter or plane in earshot
function loopFor(key,kind){let L=AU.loops.get(key);if(L)return L;const C=AU.C,g=C.createGain();g.gain.value=0;let pn=null;if(C.createStereoPanner){pn=C.createStereoPanner();g.connect(pn);pn.connect(AU.M);}else g.connect(AU.M);
  const nodes=[];const osc=(type,f)=>{const o=C.createOscillator();o.type=type;o.frequency.value=f;o.start();nodes.push(o);return o;},filt=(type,f,q)=>{const b=C.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q||.7;return b;};
  const noise=()=>{const src=C.createBufferSource();src.buffer=AU.nb;src.loop=true;src.start(0,Math.random());nodes.push(src);return src;};let pitch=null;
  if(kind==='TANK'||kind==='IFV'||kind==='APC'){const a=osc('sawtooth',kind==='TANK'?34:46),b=osc('sawtooth',kind==='TANK'?68:92),f=filt('lowpass',kind==='TANK'?220:300);a.connect(f);b.connect(f);const n=noise(),fn=filt('bandpass',kind==='TANK'?900:1200,2);const gn=C.createGain();gn.gain.value=.15;n.connect(fn);fn.connect(gn);gn.connect(g);f.connect(g);pitch=[a,b];}
  else if(kind==='FPV'){const a=osc('sawtooth',190),l=osc('sine',28),lg=C.createGain();lg.gain.value=18;l.connect(lg);lg.connect(a.frequency);const f=filt('bandpass',1300,1.2);a.connect(f);f.connect(g);const b=osc('sawtooth',380);const g2=C.createGain();g2.gain.value=.4;b.connect(g2);g2.connect(f);pitch=[a,b];}
  else if(kind==='OWA'){const a=osc('sawtooth',92),b=osc('square',184),f=filt('lowpass',900);const l=osc('sine',6),lg=C.createGain();lg.gain.value=4;l.connect(lg);lg.connect(a.frequency);a.connect(f);b.connect(f);f.connect(g);}
  else if(kind==='MALE'){const a=osc('triangle',118),f=filt('lowpass',420);a.connect(f);f.connect(g);const n=noise(),fn=filt('lowpass',300);n.connect(fn);fn.connect(g);}
  else if(kind==='HELO'){const n=noise(),f=filt('lowpass',320),am=C.createGain();am.gain.value=.5;const l=osc('square',17),lg=C.createGain();lg.gain.value=.5;l.connect(lg);lg.connect(am.gain);n.connect(f);f.connect(am);am.connect(g);const t=osc('sawtooth',55),tf=filt('lowpass',160);t.connect(tf);tf.connect(g);}
  else{const a=osc('sawtooth',62),n=noise(),f=filt('lowpass',520);a.connect(f);n.connect(f);f.connect(g);}
  L={g,pn,nodes,pitch,kind,seen:0};AU.loops.set(key,L);return L;}
function audioStep(dt){if(!AU.C)return;AU.mt=(AU.mt||0)-dt;if(AU.mt<=0){AU.mt=1;try{if(typeof sfx!=='undefined'&&sfx.mute)sfx.mute(true);}catch(e){}if(AU.C.state==='suspended')AU.C.resume();}
  const now=(AU.tick=(AU.tick||0)+1);const want=(key,kind,p,vol,ref,f)=>{const P=place(p,ref);if(P.g<.01)return;const L=loopFor(key,kind);L.seen=now;L.g.gain.setTargetAtTime(Math.min(1,P.g*vol),AU.C.currentTime,.08);if(L.pn)L.pn.pan.setTargetAtTime(P.pan,AU.C.currentTime,.08);
    if(L.pitch&&f)L.pitch.forEach((o,i)=>o.frequency.setTargetAtTime(f*(i+1),AU.C.currentTime,.2));};
  for(const v of S.veh)if(v.alive){const k=v.tank?'TANK':v.m.userData.gun?'IFV':'APC';want(v,k,v.m.position,.6,60,(k==='TANK'?34:46)*(v.mv&&Math.abs((v.stop||v.z)-v.z)>2?1.25:1));}
  for(const d of S.drones)if(d.alive&&!(d.mine&&d.wait>0))want(d,d.k,d.m.position,d.k==='FPV'?.7:d.k==='OWA'?.9:.5,d.k==='FPV'?30:d.k==='OWA'?120:400,d.k==='FPV'?(d.dive?240:190):0);
  if(S.carrier&&S.phase==='INSERT'){const k=S.ins==='HELO'?'HELO':S.ins==='AIR'?'PLANE':S.ins;want('carrier',k,S.carrier.m.position,S.ins==='AIR'?.8:.7,40,0);}
  if(S.leave)want('leave',S.ins==='HELO'?'HELO':S.ins,S.leave.m.position,.6,50,0);if(S.med)want('med','HELO',S.med.h.position,.8,60,0);if(S.eheli&&S.eheli.alive)want('eheli','HELO',S.eheli.m.position,.8,80,0);
  for(const a of S.air||[])if(a.alive)want(a,'PLANE',a.m.position,.5,500,0);
  for(const[k,L]of AU.loops)if(L.seen!==now){L.g.gain.setTargetAtTime(0,AU.C.currentTime,.1);if(now-L.seen>40){for(const n of L.nodes)try{n.stop();}catch(e){}L.g.disconnect();AU.loops.delete(k);}}
  // footsteps
  const sp=Math.hypot(S.vel.x,S.vel.z);if(S.phase==='FIGHT'&&sp>.5&&S.vel.y===0){AU.sd=(AU.sd||0)+sp*dt;const run=sp>5,str=run?1.9:S.crouch?.9:1.3;if(AU.sd>=str){AU.sd=0;const inside=S.blds&&near(S.pos.x-.2,S.pos.z-.2,S.pos.x+.2,S.pos.z+.2,_nb).some(b=>b.y1<=S.pos.y-1.2&&b.y1>S.pos.y-2.4);SND.step(run,S.crouch,inside);}}}
function auStop(){for(const[,L]of AU.loops){for(const n of L.nodes)try{n.stop();}catch(e){}try{L.g.disconnect();}catch(e){}}AU.loops.clear();try{if(typeof sfx!=='undefined'&&sfx.mute&&typeof game!=='undefined'&&game.active&&!game.paused)sfx.mute(false);}catch(e){}}

/* ------------------------------------------------------------------ v385: weapons, attachments */
// reticles over the view: red dot, holographic ring, scope reticles (chevron for prism scopes, mil-dot for long scopes)
function reticle(k){let el=document.getElementById('iRet');if(!el){el=document.createElement('div');el.id='iRet';el.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none';S.hud.appendChild(el);}
  if(el.dataset.k===String(k))return;el.dataset.k=String(k);const sc=document.getElementById('iScope');
  el.innerHTML=k==='dot'?'<div style="width:5px;height:5px;border-radius:50%;background:#ff3a2a;box-shadow:0 0 6px #ff3a2a"></div>':
   k==='holo'?'<div style="width:46px;height:46px;border:2px solid rgba(255,70,50,.85);border-radius:50%;display:flex;align-items:center;justify-content:center"><div style="width:4px;height:4px;border-radius:50%;background:#ff3a2a"></div></div>':
   k==='chev'?'<svg width="60" height="60" viewBox="-30 -30 60 60"><path d="M-7 6 L0 -2 L7 6" stroke="#ff4a30" stroke-width="2" fill="none"/><line x1="0" y1="10" x2="0" y2="28" stroke="#111" stroke-width="1.5"/></svg>':
   k==='mil'?'<svg width="160" height="160" viewBox="-80 -80 160 160">'+[-60,-45,-30,-15,15,30,45,60].map(v=>'<circle cx="'+v+'" cy="0" r="1.8" fill="#111"/><circle cx="0" cy="'+v+'" r="1.8" fill="#111"/>').join('')+'</svg>':'';}
// the parts you fitted, on the gun in your hands
/* v407: DETAILED WEAPON MODELS by family and layout: Western rifles (flat-top receiver with a rail, ribbed handguard,
   straight magazine, angled pistol grip, collapsible stock, forward assist), Kalashnikov-pattern rifles (dust cover,
   gas tube over the handguard, curved magazine, wood or polymer furniture, side charging handle, slant brake), bullpups
   (magazine behind the grip, cheek riser), machine guns (box or belt, carry handle), precision rifles (heavy barrel,
   adjustable stock), pump shotguns, compact SMGs, and pistols (slide, frame, grip). */
const BULLPUP=new Set(['X95','AUG','FAMAS','L85','QBZ95']);
function gunBody(m,id,cls,vk){const keep=m.userData.att;for(const c of[...m.children])if(c!==keep)m.remove(c);const fam=famOfGun(id),wood=id==='AKM'||id==='SVD',fde=id==='SCARL'||id==='SCARH'||id==='X95';
  const M=c=>new THREE.MeshLambertMaterial({color:c});const blk=M(0x1b1c1d),met=M(0x2b2d2f),fur=M(wood?0x6b3a1c:fde?0x9a8462:0x202224),mg=M(fam==='EAST'&&!wood?0x3a2626:wood?0x8a4a1c:0x26282a),sm=new THREE.MeshBasicMaterial({color:0x0c0c0c});
  const bx=(w,h,d,x,y,z,mat,rx)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat||met);o.position.set(x,y,z);if(rx)o.rotation.x=rx;m.add(o);return o;},cy=(r,l,x,y,z,mat,r2)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r2||r,l,10),mat||met);o.rotation.x=Math.PI/2;o.position.set(x,y,z);m.add(o);return o;};
  const fz={rifle:-.66,carb:-.48,smg:-.33,shot:-.72,lmg:-.8,dmr:-.75,snp:-.85,pistol:-.14}[vk]||-.6;
  if(vk==='pistol'){bx(.032,.035,.2,0,.03,-.04,blk);bx(.03,.03,.16,0,-.002,-.03,met);bx(.03,.11,.045,0,-.07,.04,blk,.25);bx(.03,.012,.05,0,-.03,-.01,met);bx(.006,.012,.006,0,.054,-.13,sm);bx(.02,.01,.006,0,.054,.05,sm);m.userData.sy=.055;return;}
  if(vk==='shot'){bx(.06,.07,.3,0,0,0,blk);cy(.018,.55,0,.025,-.42);cy(.016,.42,0,-.012,-.38,met);bx(.055,.05,.16,0,-.015,-.33,fur);bx(.035,.1,.045,0,-.07,.1,fur,.3);bx(.05,.09,.24,0,-.02,.3,fur);bx(.008,.015,.008,0,.05,-.68,sm);m.userData.sy=.07;return;}
  const lg=vk==='lmg',dm=vk==='dmr'||vk==='snp',bp=BULLPUP.has(id),L=-fz;
  if(bp){bx(.07,.1,.55,0,0,.08,fur);bx(.034,.012,.3,0,.058,-.02,blk);cy(.012,L-.3,0,.02,fz+(L-.3)/2);bx(.035,.11,.045,0,-.09,-.12,fur,.25);bx(.032,.15,.07,0,-.11,.17,mg,.1);bx(.06,.04,.2,0,.06,.25,fur);
    cy(.016,.05,0,.02,fz+.02,blk);m.userData.sy=.085;bx(.008,.02,.01,-.012,.075,.1,sm);bx(.008,.02,.01,.012,.075,.1,sm);bx(.004,.02,.006,0,.072,-.25,sm);return;}
  if(fam==='WEST'||fam==='CHN'){bx(.058,.07,.36,0,0,-.02,blk);bx(.03,.012,.36,0,.041,-.02,met);for(let i=0;i<9;i++)bx(.036,.006,.012,0,.05,-.18+i*.04,met);bx(.012,.012,.02,.03,.02,.06,met);bx(.02,.02,.02,0,.03,.17,met);
    const hg=lg?.36:dm?.38:.3;bx(.064,.066,hg,0,.005,-.2-hg/2,fur);for(let i=0;i<5;i++)bx(.066,.012,.03,0,-.005,-.24-i*hg/5,met);bx(.03,.012,hg,0,.044,-.2-hg/2,met);
    cy(dm?.013:.011,L-.2-hg+.04,0,.012,(-.2-hg+fz)/2,met);if(fam==='WEST'&&!dm){bx(.012,.035,.02,0,.04,-.2-hg-.02,met);}
    if(lg){bx(.09,.1,.11,-.07,-.07,-.02,M(0x3a3a2a));bx(.025,.03,.18,0,.075,-.05,blk);bx(.01,.16,.01,-.03,-.08,fz*.82,met,-.6);bx(.01,.16,.01,.03,-.08,fz*.82,met,-.6);}
    else bx(.032,.16,.065,0,-.1,-.06,mg,.12);
    bx(.033,.1,.045,0,-.075,.09,blk,.32);bx(.012,.008,.06,0,-.035,.03,met);
    if(dm){bx(.045,.08,.24,0,-.01,.3,blk);bx(.04,.03,.1,0,.045,.28,blk);}else{cy(.016,.22,0,-.0,.28,met);bx(.045,.075,.14,0,-.015,.36,fur);}
    cy(.016,.05,0,.012,fz+.02,blk);bx(.008,.02,.01,-.012,.068,.06,sm);bx(.008,.02,.01,.012,.068,.06,sm);bx(.004,.022,.006,0,.065,fz+.1,sm);m.userData.sy=.08;return;}
  // Kalashnikov pattern
  bx(.055,.068,.34,0,0,-.02,met);bx(.05,.028,.3,0,.043,-.02,met);bx(.014,.012,.012,.033,.02,-.13,met);bx(.03,.016,.07,0,.06,-.14,met);
  const hg=lg?.3:dm?.3:.24;bx(.058,.06,hg,0,-.01,-.19-hg/2,fur);bx(.036,.026,hg*.9,0,.04,-.19-hg/2,fur);cy(.011,hg*.95,0,.032,-.19-hg/2,met);
  cy(.011,L-.19-hg+.02,0,.008,(-.19-hg+fz)/2,met);bx(.02,.05,.025,0,.03,fz+.05,met);bx(.005,.02,.005,0,.06,fz+.05,sm);
  if(lg){bx(.09,.11,.1,0,-.1,-.05,M(0x2a2a22));bx(.01,.16,.01,-.03,-.08,fz*.82,met,-.6);bx(.01,.16,.01,.03,-.08,fz*.82,met,-.6);}
  else{for(let i=0;i<4;i++)bx(.03,.045,.06,0,-.055-i*.038,-.07+i*.016,mg,.18+i*.12);}
  bx(.032,.1,.045,0,-.07,.08,fur,.35);bx(.01,.006,.055,0,-.032,.02,met);
  if(dm){bx(.045,.09,.06,0,-.02,.18,fur);bx(.04,.06,.2,0,-.03,.3,fur);bx(.03,.04,.1,0,.03,.32,fur);}else if(id==='AK12'||id==='AK105'){cy(.014,.24,0,.0,.28,blk);bx(.04,.07,.06,0,-.02,.4,blk);}else bx(.045,.075,.26,0,-.02,.3,fur);
  bx(.03,.03,.06,0,.012,fz+.02,met);bx(.012,.014,.02,0,.06,-.12,sm);m.userData.sy=.074;}
function equipVM(){try{const g=S.wp.pri;if(g&&g.id)gunBody(S.vms[g.vm||'rifle'],g.id,g.cls,g.vm||'rifle');if(S.wp.side)gunBody(S.vms.pistol,S.wp.side.id,'PISTOL','pistol');}catch(e){console.warn('[infantry] model',e);}
  const pm=new THREE.MeshLambertMaterial({color:0x1d1f20}),gl=new THREE.MeshBasicMaterial({color:0x6688aa,transparent:true,opacity:.12,depthWrite:false}),FZ={rifle:-.66,carb:-.48,smg:-.33,shot:-.72,lmg:-.8,dmr:-.75,snp:-.85,pistol:-.14};
  for(const[w,vk]of[['pri',S.wp.pri.vm],['side','pistol']]){const g=S.wp[w],m=S.vms[vk];if(!m||!g.att)continue;if(m.userData.att)m.remove(m.userData.att);const A=new THREE.Group();m.add(A);m.userData.att=A;const fz=FZ[vk]||-.6,top=vk==='pistol'?.06:.09;
    const bx=(w2,h,d,x,y,z,mat)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w2,h,d),mat||pm);o.position.set(x,y,z);A.add(o);return o;},cy=(r,l,x,y,z,mat)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,10),mat||pm);o.rotation.x=Math.PI/2;o.position.set(x,y,z);A.add(o);return o;};
    const O=g.att.optic;/* v421: open sights are hollow frames around the window you look through, with a clear lens */const frame=(w,h,d,y,z)=>{const t=.005;bx(w,t,d,0,y-h/2,z);bx(w,t,d,0,y+h/2,z);bx(t,h,d,-w/2,y,z);bx(t,h,d,w/2,y,z);bx(w*.8,.01,d,0,y-h/2-.008,z);};
    if(O==='MAG3'){frame(.04,.036,.05,top+.04,-.05);for(const z of[.0,.06])frame(.03,.03,.008,top+.04,z);m.userData.sy=top+.04;}else if(O==='PSO'){cy(.022,.2,-.02,top+.05,-.02);m.userData.sy=top+.05;}else if(O==='THERM'){bx(.05,.06,.18,0,top+.04,-.04);cy(.025,.03,0,top+.04,-.14);m.userData.sy=top+.045;}
    else if(O==='RDS'){frame(.04,.036,.05,top+.04,-.05);bx(.03,.025,.002,0,top+.04,-.075,gl);m.userData.sy=top+.04;}
    else if(O==='HOLO'){frame(.05,.04,.08,top+.045,-.05);bx(.04,.03,.002,0,top+.045,-.09,gl);m.userData.sy=top+.045;}
    else if(O==='X4'||O==='V16'){cy(.025,.16,0,top+.05,-.05);m.userData.sy=top+.05;}else if(O==='X8'||O==='X12'){cy(.028,O==='X12'?.3:.24,0,top+.055,-.05);m.userData.sy=top+.055;}
    if(g.att.muzzle==='SUP')cy(.022,.18,0,.02,fz-.09);else if(g.att.muzzle==='BRAKE')bx(.04,.03,.07,0,.015,fz-.035);else if(g.att.muzzle==='COMP'||g.att.muzzle==='FH')cy(.02,.06,0,.02,fz-.03);
    if(g.att.under==='GRIP')bx(.03,.1,.03,0,-.09,fz*.55);else if(g.att.under==='ANGLED'){const o=bx(.03,.03,.09,0,-.055,fz*.55);o.rotation.x=.5;}else if(g.att.under==='HSTOP')bx(.03,.03,.02,0,-.045,fz*.7);else if(g.att.under==='BIPOD'){bx(.012,.14,.012,-.025,-.07,fz*.8);bx(.012,.14,.012,.025,-.07,fz*.8);}else if(g.att.under==='UGL')cy(.025,.22,0,-.05,fz*.6);
    if(g.att.stock==='FOLD'){}if(g.att.mag==='DRUM')cy(.06,.07,0,-.13,-.05);if(g.att.laser!=='NONE')bx(.03,.03,.07,.04,.0,fz*.55,new THREE.MeshLambertMaterial({color:g.att.laser==='LIGHT'?0x222222:0x2a2a2a}));}
  // the laser beam you see, and the light
  S.lzLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(),new V3(0,0,-1)]),new THREE.LineBasicMaterial({color:0xff2a1a,transparent:true,opacity:.75}));S.lzLine.frustumCulled=false;S.sc.add(S.lzLine);
  S.lzDot=new THREE.Mesh(new THREE.SphereGeometry(.05,6,4),new THREE.MeshBasicMaterial({color:0xff2a1a}));S.sc.add(S.lzDot);
  S.wlight=new THREE.SpotLight(0xfff2d8,2.2,60,.35,.5);S.wlight.target=new THREE.Object3D();S.sc.add(S.wlight);S.sc.add(S.wlight.target);}
function v385Step(dt){S.loudT=Math.max(0,S.loudT-dt);const g=S.wp[S.w]||{};const fw=S.phase==='FIGHT'&&S.laserOn;
  const d=new V3(0,0,-1).applyEuler(new THREE.Euler(S.pitch,S.yaw,0,'YXZ'));const m=S.pos.clone().add(new V3(Math.cos(S.yaw)*.15,-.18,-Math.sin(S.yaw)*.15));
  const vis=fw&&g.laser==='VIS'&&!S.ads;   /* v397: the visible laser is off while you aim through the sight, so its beam and dot never cover the scope */S.lzLine.visible=vis;S.lzDot.visible=vis;if(vis){const t=Math.min(300,rayWorld(S.pos,d,300));const e=S.pos.clone().addScaledVector(d,t);S.lzLine.geometry.setFromPoints([m,e]);S.lzDot.position.copy(e);}
  const li=fw&&g.light;S.wlight.visible=!!li;if(li){S.wlight.position.copy(m);S.wlight.target.position.copy(S.pos).addScaledVector(d,20);}}
// the underbarrel grenade launcher (4): a fast arc, bursts on impact
function ugl(){if(S.phase!=='FIGHT'||S.w!=='pri')return;if(S.uglN<=0){say('NO LAUNCHER GRENADES',1.2);return;}S.uglN--;const d=aimDir(.004);SND.thunk();S.gnades.push({p:S.pos.clone().addScaledVector(d,.8),v:d.multiplyScalar(70).add(new V3(0,2,0)),t:0,own:true,impact:true});}

function armorHit2(v,pt,dir,wpn){if(v.decoy){const r0={v,ld:[dir.x,dir.y,dir.z],name:(v.name||'vehicle')+' (decoy)',k:vkind(v),fam:vfam(v),part:'—',face:'—',ang:0,slope:null,t:0,eff:0,pen:0,res:'DECOY · INFLATABLE MOCK-UP',dmg:[],notes:['no armour, no crew: a decoy to draw fire'],lx:0,lz:0,ly:1,wpn,wh:''};hitVeh(v,1,true);S.armLog.push(r0);showArm(r0);return r0;}const k=vkind(v),fam=vfam(v),T=PL[fam][k],A=ARMT[k],P=v.m.position,ry=v.m.rotation.y,c=Math.cos(-ry),s2=Math.sin(-ry);
  const dx=pt.x-P.x,dz=pt.z-P.z,lx=dx*c-dz*s2,lz=dx*s2+dz*c,ly=pt.y-P.y,ldx=dir.x*c-dir.z*s2,ldz=dir.x*s2+dir.z*c;
  const turret=ly>A.tz&&Math.abs(lz)<A.dim[2]*.35,part=turret?'turret':'hull';let face;
  if(dir.y<-.55&&(wpn==='ATGM'||wpn==='FPV'))face='top';else{const ax=Math.abs(lx)/(A.dim[0]/2),az=Math.abs(lz)/(A.dim[2]/2);face=az>=ax?(lz<0?'front':'rear'):'side';}
  const VCm=vcOf(v);const tracks=face==='side'&&!turret&&ly<.95,[tA,sl]=T[part][face],t0=tA*(VCm.arm||1);const sr=sl*Math.PI/180;
  // the plate's normal, tilted back by its slope
  const n=face==='front'?new V3(0,Math.sin(sr),-Math.cos(sr)):face==='rear'?new V3(0,Math.sin(sr),Math.cos(sr)):face==='side'?new V3(Math.sign(lx)||1,0,0).multiplyScalar(Math.cos(sr)).add(new V3(0,Math.sin(sr),0)):new V3(0,1,0);
  const cos=Math.min(1,Math.abs(n.x*ldx+n.y*dir.y+n.z*ldz)),ang=Math.round(Math.acos(cos)*180/Math.PI);
  const wh=WH[wpn]||'KE',heat=wh!=='KE',notes=[];let t=t0*(tracks?.5:1);
  if(heat&&!tracks&&T.comp>1&&(face==='front'||(face==='side'&&turret))){t*=T.comp;notes.push('composite');}
  const key=part+'.'+face;v.era=v.era||{};let pen=(PEN[wpn]||8)*(.9+rn()*.2);
  if(T.era.includes(key)&&!tracks){const tile=key+':'+Math.round(lx)+','+Math.round(ly);if(!v.era[tile]){v.era[tile]=1;const ek=VCm.era||'K5',en={K5:'Kontakt-5',RELIKT:'Relikt',MALACHIT:'Malachit'}[ek]||'ERA';if(wh==='HEAT'){pen*=ek==='MALACHIT'?.25:.35;notes.push(en+' brick detonated, jet disrupted');}else if(wh==='HEAT2'){if(ek==='RELIKT'||ek==='MALACHIT'){pen*=ek==='MALACHIT'?.6:.75;notes.push(en+' brick detonated: the tandem precursor did not clear it fully');}else notes.push(en+' brick set off by the precursor (tandem)');}else if(wpn==='TANK'||wpn==='AMR'){pen*=ek==='K5'?.8:.7;notes.push(en+' brick detonated');}}else notes.push('ERA already spent here');}
  const eff=t/Math.max(.15,cos);let res,dmg=[];
  if(!heat&&cos<.34&&pen<eff*1.4)res='RICOCHET';else if(heat&&cos<.17)res='GRAZE · DID NOT FUZE';else if(pen<eff)res='NO PENETRATION';else res='PENETRATED';
  if(res==='PENETRATED'){const over=pen-eff;const liner=T.liner||0;if(liner)notes.push('spall liner '+(liner>=.8?'catches most fragments':'catches some fragments'));
    // what is behind the plate that was struck
    let L;if(tracks)L=['track'];else if(face==='rear')L=['engine','fuel tank','transmission'];else if(face==='top')L=turret?['commander','gunner','gun breech','optics'].concat(fam==='WEST'&&k==='MBT'?['bustle ammunition']:['ammunition']):['engine','crew'];
    else if(turret)L=face==='front'?['gun breech','gunner sight','gunner','commander']:(fam==='WEST'&&k==='MBT'&&lz>0?['bustle ammunition','turret drive']:['gunner','commander','turret drive','gun breech']);
    else L=face==='front'?(VCm.lay==='merkava'?['engine','transmission','fuel tank']:['driver','transmission','fuel tank']):(k==='MBT'&&fam==='SOV'?['ammunition','crew','fuel tank','road wheels']:['crew','fuel tank','ammunition','road wheels']);
    if(VCm.lay==='merkava'&&face==='rear'&&!turret)L=['crew','ammunition'];if(VCm.lay==='capsule'&&turret)L=L.filter(x=>!/gunner$|commander/.test(x)).concat(['turret ammunition','turret ammunition']);
    const n2=Math.max(1,Math.round((1+Math.min(3,over/120))*(1-liner*.35)));for(let i=0;i<n2&&L.length;i++)dmg.push(L.splice((rn()*L.length)|0,1)[0]);
    v.crew=v.crew??(VCm.crew||(k==='MBT'?(fam==='SOV'?3:4):3));
    v.cas=v.cas||{};for(const d of dmg){if(/driver|crew|commander|gunner$/.test(d)&&rn()<1-liner*.5){v.crew-=1;const seat=d==='crew'?['driver','gunner','commander','loader'][(rn()*4)|0]:d;v.cas[seat]=1;if(seat==='commander'&&v.m.userData.cmdr)v.m.userData.cmdr.visible=false;}if(/engine|transmission|track|road wheels/.test(d))v.immob=true;if(/gun breech|gunner sight|optics|turret drive|bustle/.test(d))v.nofire=true;}
    let st;const am=dmg.includes('ammunition'),bam=dmg.includes('bustle ammunition');
    if(dmg.includes('turret ammunition')){st='UNMANNED TURRET AMMUNITION DETONATES · CREW CAPSULE HOLDS';v.nofire=true;}
    else if(am&&VCm.lay==='merkava'&&rn()<.6){st='AMMUNITION IN PROTECTED CONTAINERS DOES NOT COOK OFF';}
    else if(am&&rn()<(k==='MBT'&&fam==='SOV'?.8:.45))st='DESTROYED · AMMUNITION DETONATED';else if(bam){st='AMMUNITION BURNS · BLOW-OUT PANELS VENT · CREW SURVIVES';v.nofire=true;}
    else if(dmg.includes('fuel tank')&&rn()<.35)st='DESTROYED · FIRE';else if(v.crew<=1)st='KNOCKED OUT · CREW ABANDONS';else st=v.immob&&v.nofire?'MOBILITY AND FIREPOWER KILL':v.immob?'MOBILITY KILL':v.nofire?'FIREPOWER KILL':'DAMAGED';
    if(/DESTROYED|KNOCKED/.test(st)){hitVeh(v,1e6,true);if(/DETONATED/.test(st)&&v.m.userData.tu){const tu=v.m.userData.tu;tu.position.set((rn()<.5?-1:1)*(3+rn()),-1.05,(rn()-.5)*3);tu.rotation.set((rn()-.5)*.5,rn()*6.28,Math.PI*(.85+rn()*.1));if(v.m.userData.cmdr)v.m.userData.cmdr.visible=false;v.cas=v.cas||{};v.cas.driver=v.cas.gunner=v.cas.commander=v.cas.loader=1;}}
    if(bam)for(let i=0;i<4;i++)smoke(v.m.position.clone().setY(v.m.position.y+3.2));res+=' · '+st;}
  else if(heat)hitVeh(v,40,true);
  const rec={v,ld:[ldx,dir.y,ldz],name:v.name||v.m.userData.name||({MBT:'main battle tank',IFV:'infantry fighting vehicle',APC:'armoured personnel carrier'}[k]),k,fam,part,face:tracks?'tracks':face,ang,slope:sl,t:Math.round(t),eff:Math.round(eff),pen:Math.round(pen),res,dmg,notes,lx,lz,ly,wpn,wh};S.armLog.push(rec);showArm(rec);return rec;}

/* ------------------------------------------------------------------ v392: launcher sights, wounds, the information war */
// LAUNCHER SIGHTS. Aim (Q / right mouse) with the launcher: an anti-tank missile shows its sight in thermal (grey-hot);
// a fire-and-forget missile (Western-pattern) must LOCK first — hold the target in the box until the seeker settles —
// then flies top attack; a command-guided one (Soviet-pattern) flies to where your crosshair is while you keep aiming.
// An air-defence missile's seeker growls when an aircraft, helicopter or armed drone is in its field and gives a steady
// lock tone when it has it; fired without a lock it flies blind. A rocket launcher has an optical sight with range marks.
// v393: guidance by the missile, not by the side: the country's own anti-tank missile (equipment table) decides it.
// Fire-and-forget (lock, then top attack): Javelin, Spike, MMP, Type 01 LMAT, HJ-12, Hyungung, Nag, OMTAS.
// Command guidance — wire or laser beam, the missile flies to your crosshair while you keep aiming: Kornet, Konkurs,
// Metis, TOW, Toophan, Baktar-Shikan, Stugna-P, Skif, Ingwe, Milan, Bulsae; AT-3 by hand (MCLOS: slower to answer).
// Predicted line of sight: NLAW — track the target briefly, it flies to where the target will be (no lock).
// Unguided: Carl Gustaf (a recoilless rifle, fired like a rocket). Unknown names: by the side's tradition.
function atgmMode(name,side){const n=String(name||'').toLowerCase();
  if(/javelin|spike|mmp|lmat|hj-12|hyungung|nag|omtas|akeron|mars/.test(n))return'FF';if(/nlaw/.test(n))return'PLOS';if(/carl gustaf|gustav|at4\b/.test(n))return'UNG';
  if(/at-3|malyutka|sagger/.test(n))return'MCLOS';if(/kornet|konkurs|metis|fagot|tow|toophan|baktar|stugna|skif|ingwe|milan|bulsae|hj-8|hj-73|dehlavieh|shturm|ataka|corsar|barrier/.test(n))return'SACLOS';
  return side==='B'?'FF':'SACLOS';}
const MODEN={FF:'fire-and-forget (lock, top attack)',SACLOS:'command guidance (keep the crosshair on it)',MCLOS:'manual command guidance',PLOS:'predicted line of sight (track, then fire)',UNG:'unguided'};
function lockState(){const g=S.wp.lau||{},mode=g.air?'IR':(S.atgm||atgmMode(S.N.ATGM,S.me)),ff=mode==='FF',air=!!g.air;const L={ff,air,locked:S.lockT>=(air?1.2:2.2)&&!!S.lockTgt&&S.lockTgt.alive!==false,tgt:S.lockTgt};return L;}
function plosPoint(t){const p=t.m.position.clone().setY(t.m.position.y+1.5);if(t.goal&&!t.immob){const d=new V3(t.goal.x-t.x,0,t.goal.z-t.z);if(d.length()>1)p.addScaledVector(d.normalize(),3.4*Math.min(4,p.distanceTo(S.pos)/90));}return p;}
function lockStep(dt){const g=S.wp.lau||{};const on=S.phase==='FIGHT'&&S.w==='lau'&&S.ads&&(g.guided||g.air);let best=null,ba=1e9,bd=0;
  if(on){const ad=aimDir(0),cone=g.air?.07:.05;const C=g.air?[S.eheli&&S.eheli.alive?S.eheli:null,...S.drones.filter(d=>d.alive&&d.side==='E'&&d.k!=='FPV'),...(S.air||[]).filter(a=>a.alive&&a.side==='E')].filter(Boolean):S.veh.filter(v=>v.alive&&v.side==='E');
    for(const t of C){const tp=t.m.position.clone().setY(t.m.position.y+(g.air?0:1.5)),d=tp.sub(S.pos),L=d.length();if(L>(g.air?5000:2500)||L<30)continue;const a=Math.acos(Math.min(1,d.normalize().dot(ad)));if(a<cone&&a<ba){if(!g.air&&rayWorld(S.pos,d,L-3)<L-3)continue;ba=a;best=t;bd=L;}}}
  if(best&&best===S.lockTgt)S.lockT+=dt*(1-(S.jam||0)*.4);else{S.lockTgt=best;S.lockT=best?0:Math.max(0,(S.lockT||0)-dt*3);}
  // sight overlay and seeker tone
  let el=document.getElementById('iLau');if(!el){el=document.createElement('div');el.id='iLau';el.style.cssText='position:absolute;inset:0;pointer-events:none;display:none';S.hud.appendChild(el);}
  const cvs=S.WM?document.getElementById('gl'):S.cv;const show=S.phase==='FIGHT'&&S.w==='lau'&&S.ads;el.style.display=show?'block':'none';if(cvs)cvs.style.filter=show&&g.guided&&!g.air?'grayscale(1) contrast(1.5) brightness(1.15)':'';
  if(show){const L=lockState(),pr=Math.min(1,(S.lockT||0)/(g.air?1.2:2.2));let h='';
    if(g.air)h='<svg width="100%" height="100%" style="position:absolute;inset:0"><circle cx="50%" cy="50%" r="11%" fill="none" stroke="#1d1" stroke-width="1.5"/><line x1="50%" y1="35%" x2="50%" y2="41%" stroke="#1d1"/><line x1="50%" y1="59%" x2="50%" y2="65%" stroke="#1d1"/></svg>'+
      '<div style="position:absolute;left:50%;top:70%;transform:translateX(-50%);color:'+(L.locked?'#ff5a3a':'#9fe0b8')+';letter-spacing:.15em">'+(L.locked?'LOCK · FIRE':best?'SEEKER · TONE · HOLD':'SEARCH')+'</div>';
    else if(g.guided)h='<div style="position:absolute;inset:6%;border:2px solid rgba(0,0,0,.6)"></div><div style="position:absolute;left:50%;top:50%;width:'+(L.ff?'12%':'1px')+';height:'+(L.ff?'9%':'1px')+';transform:translate(-50%,-50%);border:2px solid '+(L.locked?'#fff':'rgba(255,255,255,.5)')+'"></div>'+
      '<div style="position:absolute;left:50%;top:22%;transform:translateX(-50%);color:#fff;letter-spacing:.15em;text-shadow:0 0 3px #000">'+esc((S.N.ATGM||'ATGM').toUpperCase())+' · '+(L.ff?(L.locked?'LOCKED · TOP ATTACK · FIRE':best?'TRACKING '+Math.round(pr*100)+' %':'SEEKER · PUT THE BOX ON A VEHICLE'):S.atgm==='PLOS'?(best?'TRACKING · FIRE · IT LEADS THE TARGET':'TRACK A VEHICLE, THEN FIRE'):S.atgm==='MCLOS'?'MANUAL GUIDANCE · STEER IT ONTO THE TARGET':'COMMAND GUIDANCE · KEEP THE CROSSHAIR ON THE TARGET')+'</div>'+(best?'<div style="position:absolute;left:50%;top:76%;transform:translateX(-50%);color:#fff">'+Math.round(bd)+' m</div>':'');
    else h='<svg width="100%" height="100%" style="position:absolute;inset:0">'+[100,200,300,400].map((r,i)=>'<line x1="47%" x2="53%" y1="'+(50+i*3)+'%" y2="'+(50+i*3)+'%" stroke="#111"/><text x="54%" y="'+(50.6+i*3)+'%" font-size="10" fill="#111">'+r+'</text>').join('')+'</svg>';
    el.innerHTML=h;}
  seekerTone(show&&g.air?(lockState().locked?2:best?1:0):show&&g.guided&&lockState().ff?(lockState().locked?3:best?4:0):0);}
function seekerTone(m){if(!AU.C)return;if(!AU.st){const o=AU.C.createOscillator(),g=AU.C.createGain();o.type='square';g.gain.value=0;o.connect(g);g.connect(AU.M);o.start();AU.st={o,g};}
  const t=AU.C.currentTime;AU.st.g.gain.setTargetAtTime(m?.06:0,t,.03);if(m===1)AU.st.o.frequency.setTargetAtTime(380+Math.sin(t*30)*60,t,.02);else if(m===2)AU.st.o.frequency.setTargetAtTime(1150,t,.02);else if(m===3)AU.st.o.frequency.setTargetAtTime(900,t,.02);else if(m===4){AU.st.o.frequency.setTargetAtTime(700,t,.02);AU.st.g.gain.setTargetAtTime((t*4%1)<.3?.05:0,t,.01);}}

// WOUNDS. Each part — head, torso, each arm, each leg — has its own condition; a bullet or fragment wound bleeds (light,
// heavy, or arterial in a limb). Bleeding drains your blood (the health figure); a hurt leg makes you limp and stops you
// running, two bad legs or low blood put you on the ground crawling; hurt arms shake your aim and slow reloads; little
// blood left blurs and darkens what you see. 5 tourniquet (stops the worst limb bleed), 6 bandage (a light or heavy
// bleed), 7 medical kit (patches every part, some blood back). E next to a wounded friendly treats him. The enemy's and
// your squad's soldiers are hurt by part too: leg wounds slow them or put them down crawling, arm wounds spoil their
// aim; they bleed, crawl back when badly hurt, and a medic on each side goes to the wounded.
const PARTN={head:'head',torso:'torso',armL:'left arm',armR:'right arm',legL:'left leg',legR:'right leg'};
function wound(part,d,why){const B=S.body;B[part]=Math.max(0,B[part]-d*1.4);const limb=/arm|leg/.test(part);
  const sev=d>30?(limb&&rn()<.35?'ARTERIAL':'HEAVY'):d>8?'LIGHT':null;if(!sev)return;const bleed={LIGHT:.18,HEAVY:.55,ARTERIAL:1.6}[sev];S.wounds.push({part,sev,bleed,tq:false,band:false});
  if(sev!=='LIGHT')say((sev==='ARTERIAL'?'ARTERIAL BLEED · ':'HEAVY BLEED · ')+PARTN[part].toUpperCase()+(limb&&sev==='ARTERIAL'?' · TOURNIQUET (5)':' · BANDAGE (6)'),2.5);}
function treat(kind){if(S.phase!=='FIGHT'||S.treat||S.evacMe)return;const K2=S.kit2;if(!K2[kind]){say('NO '+{tq:'TOURNIQUETS',band:'BANDAGES',kit:'MEDICAL KITS'}[kind]+' LEFT',1.5);return;}
  const ok=kind==='kit'||S.wounds.some(w=>w.bleed>0&&(kind==='tq'?/arm|leg/.test(w.part):true));if(!ok){say(kind==='tq'?'NO LIMB BLEEDING':'NOTHING TO BANDAGE',1.5);return;}
  S.treat={kind,t:0,dur:kind==='tq'?3:kind==='band'?4:8};say({tq:'APPLYING A TOURNIQUET',band:'BANDAGING',kit:'USING THE MEDICAL KIT'}[kind]+'…',S.treat.dur);}
function treatDone(kind){const K2=S.kit2;K2[kind]--;const W2=S.wounds.filter(w=>w.bleed>0).sort((a,b)=>b.bleed-a.bleed);
  if(kind==='tq'){const w=W2.find(w=>/arm|leg/.test(w.part));if(w){for(const x of S.wounds)if(x.part===w.part){x.tq=true;x.bleed=0;}S.body[w.part]=Math.max(0,S.body[w.part]-10);say('TOURNIQUET ON · '+PARTN[w.part].toUpperCase(),2);}}
  else if(kind==='band'){const w=W2.find(w=>w.sev!=='ARTERIAL')||W2[0];if(w){w.band=true;w.bleed=w.sev==='ARTERIAL'?w.bleed*.5:0;say('BANDAGED · '+PARTN[w.part].toUpperCase(),2);}}
  else{for(const k in S.body)S.body[k]=Math.min(100,S.body[k]+35);for(const w of S.wounds)if(w.sev==='LIGHT')w.bleed=0;if(S.hp<1e6)S.hp=Math.min(100,S.hp+25);say('PATCHED UP',2);}}
function bodyStep(dt){if(S.phase!=='FIGHT'||!S.body)return;const bl=S.wounds.reduce((t,w)=>t+(w.tq?0:w.bleed),0);if(bl>0&&S.hp<1e6&&!S.evacMe){S.hp-=bl*dt;if(S.hp<=0){if(S.medN<3&&!S.downed){S.hp=1;S.downed=true;S.downT=40;S.med=null;medevac(true);say('BLED OUT · DOWN · MEDEVAC CALLED',4);}else if(!S.downed)end('KIA');}}
  if(S.body.head<=0&&!S.res)end('KIA');
  if(S.treat){S.treat.t+=dt;if(S.treat.t>=S.treat.dur){const k=S.treat.kind;S.treat=null;treatDone(k);}}
  const lg=Math.min(S.body.legL,S.body.legR),lg2=Math.max(S.body.legL,S.body.legR);S.crawl=(S.hp<30&&S.hp<1e6)||(lg<15&&lg2<15)||S.prone;S.limp=lg<40;
  const arm=(S.body.armL+S.body.armR)/2;S.sway=arm<60?(60-arm)/60:0;if(S.phase==='FIGHT'&&!S.tk)aimStep(dt);else if(S.tk){S.swX=S.swY=S.rec=S.recH=0;}
  // blood loss: the view darkens and blurs
  const cvs=S.WM?document.getElementById('gl'):S.cv;if(cvs&&S.tk&&S.tk.th&&!S.tk.ext){cvs.style.filter='grayscale(1) invert(1) contrast(2) brightness(1.05)';}   /* v420: tank thermal sight, white-hot */
  else if(cvs&&S.ads&&S.phase==='FIGHT'&&S.wp[S.w]&&S.wp[S.w].therm&&S.wp[S.w].scope&&S.w!=='lau'){cvs.style.filter='grayscale(1) invert(1) contrast(1.8) brightness(1.1)';}   /* v407: thermal sight, white-hot */
  else if(cvs&&!(S.w==='lau'&&S.ads)){const lo=S.hp<1e6?Math.max(0,(50-S.hp)/50):0;cvs.style.filter=lo>0?'blur('+(lo*2.5).toFixed(1)+'px) brightness('+(1-lo*.45).toFixed(2)+') saturate('+(1-lo*.7).toFixed(2)+')':'';}
  // the body diagram
  let el=document.getElementById('iBody');if(!el){el=document.createElement('div');el.id='iBody';el.style.cssText='position:absolute;left:16px;bottom:58px;font-size:10px';S.hud.appendChild(el);}
  const c=k=>{const v=S.body[k];return v>70?'#7fbf7f':v>35?'#e0c050':v>0?'#e06a3a':'#555';},bd=k=>S.wounds.some(w=>w.part===k&&w.bleed>0)?'<circle cx="'+({head:20,torso:20,armL:7,armR:33,legL:15,legR:25}[k])+'" cy="'+({head:6,torso:24,armL:24,armR:24,legL:50,legR:50}[k])+'" r="3" fill="#d00"/>':'';
  el.innerHTML='<svg width="40" height="62"><circle cx="20" cy="6" r="5" fill="'+c('head')+'"/><rect x="13" y="13" width="14" height="22" fill="'+c('torso')+'"/><rect x="4" y="14" width="7" height="20" fill="'+c('armL')+'"/><rect x="29" y="14" width="7" height="20" fill="'+c('armR')+'"/><rect x="13" y="37" width="6" height="24" fill="'+c('legL')+'"/><rect x="21" y="37" width="6" height="24" fill="'+c('legR')+'"/>'+Object.keys(PARTN).map(bd).join('')+'</svg>'+
    '<div>TQ '+S.kit2.tq+' (5) · BANDAGE '+S.kit2.band+' (6) · KIT '+S.kit2.kit+' (7)'+(S.treat?' · TREATING…':'')+(S.crawl?' · CRAWLING':S.limp?' · LIMPING':'')+'</div>';}
// NPC wounds: part damage, bleeding, crawling back, medics
function npcWound(u,part,dmg){if(part==='legs'){u.leg=(u.leg??100)-dmg*1.5;if(u.leg<=0)u.crawl=true;}else if(part==='arms')u.arm=(u.arm??100)-dmg*1.5;u.bleed=(u.bleed||0)+(dmg>30?.9:dmg>12?.35:.1);}
function npcStep(dt){for(const u of[...S.us,...S.them]){if(!u.alive)continue;if(u.bleed&&!u.stab){u.hp-=u.bleed*dt;if(u.hp<=0){hitMan(u,1,false);continue;}if(u.hp<30&&!u.wounded){u.wounded=true;u.tgt=null;}}}
  // a medic on each side goes to the worst wounded within 60 m
  for(const side of[S.us,S.them]){const med=side.find(u=>u.alive&&u.medic&&!u.wounded&&!u.crawl);if(!med)continue;const wd=side.filter(u=>u.alive&&u.wounded&&!u.stab&&u.m.position.distanceTo(med.m.position)<60).sort((a,b)=>a.hp-b.hp)[0];med.treating=wd||null;
    if(wd&&med.m.position.distanceTo(wd.m.position)<2.2){med.tt=(med.tt||0)+dt;if(med.tt>5){wd.stab=true;wd.bleed=0;med.tt=0;if(wd.friend)say('MEDIC: CASUALTY STABILISED',1.5);}}}}

// THE INFORMATION WAR IN BATTLE (infowar.js): their jamming delays your radio calls and can cut your drones' link; it
// can spoil the satellite-navigation bearing; if they read your radio they can answer an offensive before it lands;
// if you read theirs you hear intercepts that show where they are for a moment; some of their armour is decoys; a
// public missile alert during the battle shows on screen until it is called a false alarm.
function iwInit(){const I=window.WWAR&&WWAR.infowar,c=S.cfg.camp;S.jam=I&&!c?I.jam(S.me):.15;S.gpsJam=I&&!c?I.gps(S.me):.1;S.readBy=I&&!c?I.readBy(S.me):rn()<.25;S.readThem=I&&!c?I.reads(S.me):rn()<.3;S.decoyK=I&&!c?I.decoy(S.en):.15;S.radioQ=[];S.icT=30+rn()*30;}
function radio(name,fn){if(!S.jam||rn()>S.jam*.6)return fn();const d=5+rn()*8;S.radioQ.push({t:d,fn,name});say('RADIO JAMMED · '+name+' GOES THROUGH IN ~'+Math.round(d)+' S',2.5);}
function iwStep(dt){if(S.phase!=='FIGHT')return;for(let i=S.radioQ.length-1;i>=0;i--){const q=S.radioQ[i];q.t-=dt;if(q.t<=0){S.radioQ.splice(i,1);q.fn();}}
  // your drones' link
  for(const d of S.myFpv)if(d.alive&&!d.wait&&!d.jc){d.jc=1;if(rn()<S.jam*.5){d.alive=false;fx(d.m.position.clone(),.5);say('FPV LINK JAMMED · THE DRONE IS LOST',2.5);}}
  // their intercepted radio
  if(S.readThem){S.icT-=dt;if(S.icT<=0){S.icT=40+rn()*40;const al=S.them.filter(u=>u.alive);if(al.length){const L=['moving to the left flank','reinforcing the second trench','pulling back from the town square','armour moving up behind the treeline','ammunition running low on the east side'];
      say('[INTERCEPT] THEIR RADIO: "'+L[(rn()*L.length)|0].toUpperCase()+'" · POSITIONS MARKED',4);S.marks=al.slice(0,8).map(u=>u);S.markT=6;}}}
  if(S.markT>0){S.markT-=dt;if(!S.mk){S.mk=[];}while(S.mk.length<(S.marks||[]).length){const m=new THREE.Mesh(GE('mk',()=>new THREE.ConeGeometry(.35,.7,4)),new THREE.MeshBasicMaterial({color:0xff3a2a}));m.rotation.x=Math.PI;S.sc.add(m);S.mk.push(m);}
    S.mk.forEach((m,i)=>{const u=S.marks[i];m.visible=!!u&&u.alive&&S.markT>0;if(m.visible)m.position.copy(u.m.position).setY(u.m.position.y+2.6);});}else if(S.mk)S.mk.forEach(m=>m.visible=false);
  // a public missile alert in the war shows here too
  const A=window.WWAR&&WWAR.lastAlarm;if(A&&!S.cfg.camp){const t=WWAR.st.t;const on=t>=A.t&&!A.done;let el=document.getElementById('iAlert');if(!el){el=document.createElement('div');el.id='iAlert';el.style.cssText='position:absolute;top:90px;left:50%;transform:translateX(-50%);padding:6px 14px;background:rgba(160,20,10,.85);letter-spacing:.12em;display:none';S.hud.appendChild(el);}
    if(on){el.style.display='block';el.textContent='PUBLIC ALERT · '+A.city.toUpperCase()+' · BALLISTIC MISSILE THREAT · TAKE SHELTER';S.alertSeen=A;}else if(S.alertSeen===A&&A.done){el.style.display='block';el.style.background='rgba(40,90,40,.85)';el.textContent='ALL CLEAR · '+A.city.toUpperCase()+' · FALSE ALARM';S.alertClr=(S.alertClr||8)-dt;if(S.alertClr<=0){el.style.display='none';S.alertSeen=null;}}}}

/* ------------------------------------------------------------------ v391: active protection */
// Tanks that carry an active protection system (Trophy, Arena-M, Afganit, KAPS) detect an incoming rocket or missile at
// about 25 m and fire a countermeasure while they have charges: likely against a direct shot from where the system
// covers (Arena-M not from the rear), much less likely against a missile diving onto the roof; drones are not engaged.
const APSD={TROPHY:{p:.9,top:.3,rear:1},'ARENA-M':{p:.8,top:.15,rear:0},AFGANIT:{p:.9,top:.55,rear:1},KAPS:{p:.85,top:.3,rear:1}};
function apsCheck(k){if(k.apsDone)return false;for(const v of S.veh){if(!v.alive)continue;const vc=vcOf(v);if(!vc.aps)continue;if((v.side==='E')!==!!k.own)continue;
    v.apsN=v.apsN??vc.apsN;if(v.apsN<=0)continue;const P=v.m.position.clone().setY(v.m.position.y+1.8),d=P.clone().sub(k.p),L=d.length();if(L>25||L<6)continue;if(d.dot(k.v)<=0)continue;
    k.apsDone=true;const D=APSD[vc.aps];const ry=v.m.rotation.y,fx=-Math.sin(ry),fz=-Math.cos(ry);const from=-(d.x*fx+d.z*fz)/Math.max(.01,Math.hypot(d.x,d.z));const rear=from<-.5;
    const pr=(k.top?D.top:D.p)*(rear&&!D.rear?0:1);v.apsN--;const hit=rn()<pr;
    if(hit){fx2(k.p,v,vc);SND.boom(k.p,4);const ll=localOf(v,k.p,k.v);const rec={v,ld:ll.ld,name:v.name||vc.st,k:vkind(v),fam:vfam(v),part:'—',face:ll.face,ang:0,slope:null,t:0,eff:0,pen:Math.round(PEN[k.g.guided?'ATGM':'RPG']||0),
      res:'INTERCEPTED BY '+vc.aps+' APS',dmg:[],notes:[vc.aps+' radar tracked it; a countermeasure fired at '+Math.round(L)+' m · '+v.apsN+' charge'+(v.apsN===1?'':'s')+' left'+(k.top?' · it was diving on the roof':'')],lx:ll.lx,lz:ll.lz,ly:ll.ly,wpn:k.g.guided?'ATGM':'RPG',wh:k.g.guided?'HEAT2':'HEAT',aps:1};
      if(k.own){S.armLog.push(rec);showArm(rec);say(vc.aps+' APS · YOUR '+(k.g.guided?'MISSILE':'ROCKET')+' WAS SHOT DOWN · '+v.apsN+' CHARGES LEFT',3);}return true;}
    else if(k.own&&(rear&&!D.rear))say(vc.aps+' DOES NOT COVER THE REAR',1.5);}
  return false;}
function fx2(p,v,vc){fx(p.clone(),1.2);for(let i=0;i<4;i++){const f=new THREE.Mesh(GE('apsf',()=>new THREE.SphereGeometry(.15,6,4)),MT(0xffd060));f.position.copy(p).add(new V3((rn()-.5)*2,(rn()-.5)*2,(rn()-.5)*2));S.sc.add(f);fxL.push({m:f,t:.2});}}
function localOf(v,p,dir){const P=v.m.position,ry=v.m.rotation.y,c=Math.cos(-ry),s2=Math.sin(-ry),dx=p.x-P.x,dz=p.z-P.z,lx=dx*c-dz*s2,lz=dx*s2+dz*c,dn=dir.clone().normalize(),ldx=dn.x*c-dn.z*s2,ldz=dn.x*s2+dn.z*c;
  return{lx,lz,ly:p.y-P.y,ld:[ldx,dn.y,ldz],face:Math.abs(lz)>Math.abs(lx)?(lz<0?'front':'rear'):'side'};}

/* ------------------------------------------------------------------ v390: the front, command posts, transport */
// FRONT: your current trench line is S.lines[S.cur]. An offensive sends your riflemen (and reinforcements) at the next
// enemy line; when it is clear of enemy and yours stand in it, it is taken, and the engineers dig it in to face the
// enemy, section by section. Enemy counter-attacks come in waves with tanks; if they stand in your line and none of
// yours do, you fall back to the older trench behind. Take the last enemy line: breakthrough. Lose the last of yours:
// the battle is lost. T orders a fall-back yourself.
function slotOf(u){const L=S.lines[S.cur],n=L.slots.length;const i=((u.si??(u.si=(rn()*n)|0))*5+3)%n;return L.slots[i];}
function frontGoal(u){u.assault=false;if(u.spot&&!u.atk&&!(u.friend&&S.push)){return new V3(u.spot.x,0,u.spot.z);}if(u.friend){if(S.push&&S.cur+1<S.lines.length){u.assault=true;const N=S.lines[S.cur+1];return new V3((u.ox??=(rn()-.5)*300),0,N.z);}const q=slotOf(u);return new V3(q.x,0,q.z);}
  if(u.line==null&&!u.atk)u.atk=1;   // reinforcements called up by radio join the counter-attack
  if(u.atk){u.assault=true;const L=S.lines[S.cur]||S.lines[0];return new V3((u.ox??=(rn()-.5)*300),0,L.z);}
  // garrison: their own line, or the next one back if theirs has fallen
  let li=u.line;while(li<S.lines.length&&S.lines[li].own!=='E')li++;if(li>=S.lines.length){u.atk=1;return frontGoal(u);}u.line=li;const L=S.lines[li],q=L.slots[((u.ox2??=(rn()*L.slots.length)|0))%L.slots.length];return new V3(q.x,0,q.z);}
function bandCount(L){const inb=p=>Math.abs(p.z-L.z)<10&&Math.abs(p.x)<180;return{e:S.them.filter(u=>u.alive&&inb(u.m.position)).length,f:S.us.filter(u=>u.alive&&inb(u.m.position)).length+(inb(S.pos)?1:0)};}
function counter(){S.wave++;const back=S.lines.filter(l=>l.own==='E').map(l=>l.z);const z0=(back.length?Math.min(...back):S.lines[S.cur].z-500)-180;const n=Math.round((5+S.wave*2)*S.ePow);
  for(let i=0;i<n;i++){const u=man(false,(rn()-.5)*300,z0-rn()*60);u.atk=1;S.them.push(u);}
  const m=tank(S.en,0x6a5a3a),x=(rn()-.5)*200;m.position.set(x,H(x,z0-80),z0-80);S.sc.add(m);S.veh.push({m,hp:1100,side:'E',x,z:z0-80,cool:5,alive:true,tank:1,goal:new V3(x,0,S.lines[S.cur].z-160),name:m.userData.name});
  say('ENEMY COUNTER-ATTACK · '+n+' INFANTRY WITH A '+String(m.userData.name||'TANK').toUpperCase(),3.5);}
function fallBack(order){if(S.mission!=='FRONT'||S.phase!=='FIGHT')return;if(S.cur<=0){if(order)say('NO TRENCH BEHIND US',2);return;}if(order)S.lines[S.cur].own='N';S.cur--;S.push=false;S.trZ=S.lines[S.cur].z;
  for(const u of S.us)u.bound=null;say(order?'FALL BACK · TO THE OLDER TRENCH':'THE LINE IS LOST · FALLING BACK TO THE OLDER TRENCH',3.5);}
function frontStep(dt){S.waveT-=dt;if(S.waveT<=0){counter();S.waveT=90;}
  if(S.push){S.pushT+=dt;const N=S.lines[S.cur+1],b=bandCount(N);if(b.e===0&&b.f>=2){N.own='F';S.cur++;S.push=false;S.trZ=N.z;
      for(const u of S.them)if(u.alive&&u.line===S.cur)u.line++;
      if(S.cur>=S.lines.length-1){end('BREAK');return;}
      // the engineers turn the parapet round to face the enemy
      if(N.face>0){N.face=-1;for(let x=-170;x<170;x+=10)S.digQ.push(new V3(x+5,0,N.z));}say('TRENCH TAKEN · ENGINEERS DIGGING IN TO FACE THE ENEMY',3.5);}
    else if(S.pushT>150){S.push=false;say('THE ASSAULT STALLS · BACK TO THE LINE',3);}}
  const L=S.lines[S.cur],b=bandCount(L);if(b.e>=3&&b.f===0){L.own='E';if(S.cur===0){end('LOST');return;}fallBack(false);}
  // engineers dig the queued sections (faster with both alive)
  if(S.digQ.length){const eng=S.us.filter(u=>u.alive&&u.eng).length;S.digT=(S.digT||0)+dt*Math.max(.3,eng);if(S.digT>=1.4){S.digT=0;const q=S.digQ.shift();dig(false,new V3(q.x,0,q.z-2.4),-1);}}
  S.hold=S.cur;}
// runtime boxes (command posts you build)
function rbox(x0,y0,z0,x1,y1,z1,m,c){const g=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0),m);g.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);S.sc.add(g);S.solid.push(g);const b={x0,y0,z0,x1,y1,z1,m:g,bid:null};S.blds.push(b);gridAdd(b);if(c)c.parts.push(b);return b;}
// K: a command post dug in behind the line — a base in the trench: sandbag walls, log and earth roof, map table with
// the plan of the lines, radio and mast, bunks, ammunition crates, a lamp. E inside it opens the planning table.
function buildCP(){if(S.phase!=='FIGHT'||S.downed)return;const mine=S.STR.filter(c=>c.kind==='COMMAND POST'&&c.side==='F'&&c.built&&!c.down).length;if(mine>=2){say('TWO COMMAND POSTS ARE ENOUGH',2);return;}
  if(S.mission==='FRONT'&&S.pos.z<S.lines[S.cur].z+20){say('BUILD IT BEHIND THE LINE (20 M OR MORE)',2);return;}if(S.them.some(u=>u.alive&&u.m.position.distanceTo(S.pos)<70)){say('TOO CLOSE TO THE ENEMY TO BUILD',2);return;}
  const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw)),c0=S.pos.clone().addScaledVector(f,6),cx=c0.x,cz=c0.z,y0=H(cx,cz)-.9;
  const c={kind:'COMMAND POST',side:'F',built:true,cx,cz,x:cx,z:cz,w:9,d:7,fl:1,y0,hp:2000,parts:[],walls:4,meshes:[],sc:S.sc};
  const sb=MT(0x8c7d5a),earth=MT(0x5a4630),log=MT(0x4a3a26),wood=MT(0x6a5038),met=MT(0x3d4038);
  rbox(cx-4.5,y0-.3,cz-3.5,cx+4.5,y0,cz+3.5,earth,c);rbox(cx-4.5,y0,cz-3.5,cx+4.5,y0+2.3,cz-2.7,sb,c);rbox(cx-4.5,y0,cz-3.5,cx-3.7,y0+2.3,cz+3.5,sb,c);rbox(cx+3.7,y0,cz-3.5,cx+4.5,y0+2.3,cz+3.5,sb,c);
  rbox(cx-4.5,y0,cz+2.7,cx-.8,y0+2.3,cz+3.5,sb,c);rbox(cx+.8,y0,cz+2.7,cx+4.5,y0+2.3,cz+3.5,sb,c);
  for(let i=0;i<9;i++)rbox(cx-4.6+i*1.03,y0+2.3,cz-3.6,cx-3.7+i*1.03,y0+2.6,cz+3.6,log,c);rbox(cx-4.8,y0+2.6,cz-3.8,cx+4.8,y0+3.1,cz+3.8,earth,c);
  rbox(cx-1.3,y0,cz-.7,cx+1.3,y0+.85,cz+.7,wood,c);rbox(cx+2.4,y0,cz-2.5,cx+3.6,y0+1,cz-1.6,met,c);rbox(cx-3.6,y0,cz-2.5,cx-2.3,y0+.6,cz+.5,wood,c);rbox(cx-3.6,y0+1.2,cz-2.5,cx-2.3,y0+1.3,cz+.5,wood,c);
  for(let i=0;i<3;i++)rbox(cx+2.4,y0,cz+.4+i*.75,cx+3.5,y0+.55,cz+1.05+i*.75,MT(0x55603f),c);
  // the plan on the map table: the lines and your position, drawn live
  const pc=document.createElement('canvas');pc.width=256;pc.height=128;const tx=new THREE.CanvasTexture(pc);const pl=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.2),new THREE.MeshBasicMaterial({map:tx}));pl.rotation.x=-Math.PI/2;pl.position.set(cx,y0+.87,cz);S.sc.add(pl);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.04,.06,8,5),met);mast.position.set(cx+3,y0+7,cz-2);S.sc.add(mast);const lamp=new THREE.PointLight(0xffd8a0,.9,9);lamp.position.set(cx,y0+2,cz);S.sc.add(lamp);
  c.mast=mast;c.plan={pc,tx,pl};S.STR.push(c);S.BLD.push(c);c.id=S.BLD.length-1;S.fCP=false;S.cps=(S.cps||0)+1;drawPlan(c);say('COMMAND POST BUILT · E INSIDE FOR THE PLANNING TABLE',3);return c;}
function drawPlan(c){if(!c.plan)return;const g=c.plan.pc.getContext('2d');g.fillStyle='#d8ccaa';g.fillRect(0,0,256,128);const Z=z=>8+(-z-200)/1000*112,X=x=>128+x*.6;
  if(S.lines)for(const[i,L]of S.lines.entries()){g.strokeStyle=L.own==='F'?'#2a5a9a':L.own==='E'?'#b03a2a':'#777';g.lineWidth=i===S.cur?4:2;g.beginPath();g.moveTo(X(-170),Z(L.z));for(let x=-170;x<=170;x+=20)g.lineTo(X(x),Z(L.z)+((x/20)&1?2:-2));g.stroke();}
  g.fillStyle='#b03a2a';for(const u of S.them)if(u.alive)g.fillRect(X(u.m.position.x)-1,Z(u.m.position.z)-1,2,2);g.fillStyle='#2a5a9a';for(const u of S.us)if(u.alive)g.fillRect(X(u.m.position.x)-1,Z(u.m.position.z)-1,2,2);
  g.fillStyle='#000';g.beginPath();g.arc(X(S.pos.x),Z(S.pos.z),3,0,7);g.fill();c.plan.tx.needsUpdate=true;}
// E: the planning table at a command post, a ride in a friendly APC / IFV, or leaving from the rear
function nearCP(){return S.STR.find(c=>c.kind==='COMMAND POST'&&c.side==='F'&&!c.down&&Math.hypot(S.pos.x-c.cx,S.pos.z-c.cz)<6);}
function nearTaxi(){return S.veh.find(v=>v.alive&&v.side==='F'&&!v.tank&&Math.hypot(S.pos.x-v.x,S.pos.z-v.z)<7);}
function interact(){if(S.phase!=='FIGHT'||S.downed)return;if(S.ride){say('RIDING · WAIT FOR THE STOP',1.5);return;}{const w=S.us.find(u=>u.alive&&u.wounded&&!u.stab&&u.m.position.distanceTo(S.pos)<3);if(w){if(S.kit2.band<=0&&S.kit2.tq<=0){say('NOTHING LEFT TO TREAT HIM WITH',1.5);return;}if(S.kit2.band>0)S.kit2.band--;else S.kit2.tq--;w.stab=true;w.bleed=0;say('YOU STABILISE HIM',2);return;}}const c=nearCP(),v=nearTaxi();
  if(c)return panel('plan',c);if(v)return panel('ride',v);if(S.pos.z>(S.mission==='FRONT'?S.lines[0].z+260:420))return panel('leave');say('NOTHING HERE · E AT A COMMAND POST OR NEXT TO ONE OF OUR APCS / IFVS',2);}
function panel(kind,obj){if(document.pointerLockElement)document.exitPointerLock();const old=document.getElementById('iPan');if(old)old.remove();const d=document.createElement('div');d.id='iPan';d.className='u2m';d.style.zIndex=9990;
  const btn=(a,t,sub,dis)=>'<button class="opt" data-ip="'+a+'"'+(dis?' disabled':'')+'><b>'+esc(t)+'</b>'+(sub?'<span>'+esc(sub)+'</span>':'')+'</button>';let body='',title='';
  if(kind==='plan'){title='COMMAND POST · PLANNING TABLE';const fr=S.mission==='FRONT';const can=fr?S.cur<S.lines.length-1:true;
    body='<canvas id="iPlanC" width="512" height="200" style="width:100%;max-width:512px;border:1px solid #4a5e52;background:#d8ccaa"></canvas><div class="opts c3" style="margin-top:10px">'+
      btn('off','OFFENSIVE',fr?'Assault the next trench line':'Barrage and fresh riflemen',!can||S.fCP)+btn('hold','HOLD','Stop the assault, hold this line',!S.push)+btn('back','FALL BACK','To the older trench',!fr||S.cur<=0)+
      btn('arty','ARTILLERY','On the enemy line (every 60 s)',(S.artyCd||0)>0)+btn('veh','CALL A VEHICLE','An APC drives up to this post',!!S.taxiCall)+btn('sup','RESUPPLY','Magazines, grenades, sandbags, a drone (every 90 s)',(S.supCd||0)>0)+
      btn('med','MEDEVAC','Out for you and the wounded',S.medN>=3||!!S.med)+btn('x','CLOSE','')+'</div>';}
  else if(kind==='ride'){title='RIDE · '+esc((obj.m.userData.name||'APC').toUpperCase());body='<div class="opts c2">'+btn('r:front','TO THE FRONT LINE',S.mission==='FRONT'?'Behind the current trench':'Toward the objective')+btn('r:cp','TO A COMMAND POST','',!S.STR.some(c=>c.kind==='COMMAND POST'&&c.side==='F'&&!c.down))+
      btn('r:look','WHERE I AM LOOKING','Up to 200 m')+btn('r:base','BACK TO BASE','Leave the battle')+btn('x','STAY HERE','')+'</div>';}
  else{title='THE REAR';body='<div class="note">You are behind your lines.</div><div class="opts c2">'+btn('leave','LEAVE THE BATTLE','Back to base')+btn('x','STAY','')+'</div>';}
  d.innerHTML='<div class="bx"><header class="mh"><div class="mk">INFANTRY</div><h2>'+title+'</h2></header><div class="mb">'+body+'</div></div>';document.body.appendChild(d);S.pan={kind,obj};S.panP=true;   /* v407: the battle waits while a menu is open */
  if(kind==='plan'){const c2=document.getElementById('iPlanC');const g=c2.getContext('2d');drawPlan(obj.plan?obj:{plan:{pc:c2,tx:{}}});if(obj.plan)g.drawImage(obj.plan.pc,0,0,512,200);}
  d.addEventListener('click',e=>{const b=e.target.closest('[data-ip]');if(!b||b.disabled)return;doPan(b.dataset.ip);});}
function closePan(){const d=document.getElementById('iPan');if(d)d.remove();if(S){S.pan=null;S.panP=false;}}
function doPan(a){if(!S){closePan();return;}const P=S.pan;closePan();if(!P||a==='x')return;
  if(a==='off')offensive();else if(a==='hold'){S.push=false;say('HOLD THIS LINE',2);}else if(a==='back')fallBack(true);
  else if(a==='arty'&&S.link&&S.link.art<=.5){say('NO ARTILLERY AMMUNITION ON THIS FRONT',2.5);}
  else if(a==='arty')radio('ARTILLERY',()=>{try{const m=W.st&&W.st.mil&&W.st.mil[S.cfg.a3];if(m&&m.mun&&m.mun.ART!=null){m.mun.ART=Math.max(0,m.mun.ART-.15);if(S.link)S.link.art=m.mun.ART;}}catch(e){}const tz=S.mission==='FRONT'?(S.lines[S.cur+1]||S.lines[S.cur]).z:S.village.z;arty(new V3(0,0,tz),10,'F');S.artyCd=60;say('ARTILLERY ON THE ENEMY LINE',2);});
  else if(a==='veh'){const c=P.obj;const m=vehicle('APC',0x4e5a3c),x=c.cx+8,z=c.cz+420;m.position.set(x,H(x,z),z);S.sc.add(m);const v={m,hp:500,side:'F',x,z,cool:3,alive:true,goal:new V3(c.cx+8,0,c.cz+6),taxi:1};S.veh.push(v);S.taxiCall=v;say('AN APC IS ON ITS WAY TO THE COMMAND POST',2.5);}
  else if(a==='sup'){for(const w of['pri','side']){const g=S.wp[w];g.res=Math.max(g.res,g.mag*7);}if(S.wp.lau.mag)S.wp.lau.res=Math.max(S.wp.lau.res,2);S.gren=Math.max(S.gren,4);S.bags+=4;S.fpvKit+=1;S.uglN=Math.max(S.uglN,S.wp.pri.ugl||0);S.supCd=90;say('RESUPPLIED',2);}
  else if(a==='med')medevac(true);
  else if(a==='leave')end('EXTRACTED');
  else if(a.startsWith('r:')){const v=P.obj,k=a.slice(2);let g=null;if(!v||!v.alive){say('THE VEHICLE IS GONE',1.5);return;}
    if(k==='front')g=S.mission==='FRONT'?new V3(S.pos.x*.3,0,S.lines[S.cur].z+18):S.village.clone().add(new V3(0,0,90));
    else if(k==='cp'){const c=S.STR.filter(c=>c.kind==='COMMAND POST'&&c.side==='F'&&!c.down).sort((a,b)=>Math.hypot(a.cx-S.pos.x,a.cz-S.pos.z)-Math.hypot(b.cx-S.pos.x,b.cz-S.pos.z))[0];g=new V3(c.cx+7,0,c.cz+5);}
    else if(k==='look'){const d0=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw));g=S.pos.clone().addScaledVector(d0,Math.min(200,rayBoxes(S.pos,d0,200)-4));}
    else g=new V3(v.x,0,v.z+700);
    v.goal=g;v.mv=0;S.ride={v,base:k==='base',t:0};say(k==='base'?'MOUNTED · HEADING BACK TO BASE':'MOUNTED · MOVING',2);}}
function v390Step(dt){S.artyCd=Math.max(0,(S.artyCd||0)-dt);S.supCd=Math.max(0,(S.supCd||0)-dt);
  if(S.taxiCall&&!S.taxiCall.goal&&S.taxiCall.alive){say('APC AT THE COMMAND POST · E NEXT TO IT TO RIDE',2.5);S.taxiCall=null;}
  // riding on top of the vehicle
  const R=S.ride;if(R){R.t+=dt;const v=R.v;if(!v.alive){S.ride=null;say('THE VEHICLE IS HIT · DISMOUNT',2);}else{S.pos.set(v.x,H(v.x,v.z)+3.4,v.z+1.2);S.vel.set(0,0,0);
    if(R.base&&R.t>14){end('EXTRACTED');return;}if(!v.goal&&!R.base){S.ride=null;S.pos.set(v.x+2.5,H(v.x+2.5,v.z)+1.7,v.z+1);say('DISMOUNT',1.5);}}}
  // the plan on the table follows the fight
  S.planT=(S.planT||0)-dt;if(S.planT<=0){S.planT=1;for(const c of S.STR)if(c.plan&&!c.down)drawPlan(c);}
  if(S.downed){let o=document.getElementById('iDown');if(!o){o=document.createElement('div');o.id='iDown';o.style.cssText='position:absolute;inset:0;background:radial-gradient(rgba(60,0,0,.35),rgba(20,0,0,.85));display:flex;align-items:center;justify-content:center;font-size:20px;letter-spacing:.15em';S.hud.appendChild(o);}o.textContent='DOWN · MEDEVAC '+(S.med&&S.med.st!=='IN'?'HERE':'INBOUND')+' · '+Math.max(0,Math.ceil(S.downT))+' S';}}

/* ------------------------------------------------------------------ v387: a battle that moves */
// tracers (red for Western-pattern ammunition, green for Soviet-pattern) and muzzle flashes, pooled
const TRC={pool:[],live:[]};
function tracer(a,b,side,heavy){if(!S)return;let L=TRC.pool.pop();const red=side==='B';if(!L){L=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(),new V3()]),new THREE.LineBasicMaterial({transparent:true}));L.frustumCulled=false;}
  L.material.color.setHex(red?0xff6a3a:0x8aff6a);L.material.opacity=heavy?1:.85;const d=b.clone().sub(a).normalize();L.userData={a:a.clone(),b:b.clone(),d,t:0,len:a.distanceTo(b)};S.sc.add(L);TRC.live.push(L);
  if(rn()<.7){const f=new THREE.Mesh(GE('mf',()=>new THREE.SphereGeometry(.12,6,4)),MT(0xffd27a));f.position.copy(a).addScaledVector(d,.5);f.scale.setScalar(heavy?3:1);S.sc.add(f);fxL.push({m:f,t:.35});}}
function tracerStep(dt){for(let i=TRC.live.length-1;i>=0;i--){const L=TRC.live[i],u=L.userData;u.t+=dt;const s0=Math.min(u.len,u.t*700),s1=Math.min(u.len,s0+18);
    L.geometry.setFromPoints([u.a.clone().addScaledVector(u.d,s0),u.a.clone().addScaledVector(u.d,s1)]);if(s0>=u.len){S.sc.remove(L);TRC.live.splice(i,1);if(TRC.pool.length<80)TRC.pool.push(L);}}}
// distant battle: artillery flashes and rumbles on the horizon, flares at dusk and night, smoke drifting with the wind
function ambient(dt){if(S.phase!=='FIGHT')return;S.ambT=(S.ambT??(4+rn()*6))-dt;if(S.ambT<=0){S.ambT=5+rn()*10;const a=rn()*6.283,r=650+rn()*600,p=new V3(S.pos.x+Math.cos(a)*r,0,S.pos.z+Math.sin(a)*r);p.y=H(p.x,p.z);
    const f=new THREE.Mesh(GE('af',()=>new THREE.SphereGeometry(6,8,6)),new THREE.MeshBasicMaterial({color:0xffb860,transparent:true,opacity:.9}));f.position.copy(p).setY(p.y+4);S.sc.add(f);fxL.push({m:f,t:0});SND.boom(p,12);for(let i=0;i<3;i++)smoke(p.clone().setY(p.y+6));
    if(S.env&&S.env.dark&&rn()<.5){const fl=new THREE.PointLight(0xfff0c0,2,500);const fm=new THREE.Mesh(GE('fl',()=>new THREE.SphereGeometry(.6,6,4)),new THREE.MeshBasicMaterial({color:0xfffae0}));fm.add(fl);fm.position.set(p.x*.5+S.pos.x*.5,H(S.pos.x,S.pos.z)+180,p.z*.5+S.pos.z*.5);S.sc.add(fm);S.flares=(S.flares||[]);S.flares.push({m:fm,t:0});}}
  for(let i=(S.flares||[]).length-1;i>=0;i--){const f=S.flares[i];f.t+=dt;f.m.position.y-=dt*4;f.m.position.x+=dt*2;if(f.t>40){S.sc.remove(f.m);S.flares.splice(i,1);}}
  for(const m of S.smk){m.position.x+=dt*(S.env?S.env.wind:1.5);}
  // the enemy's armour does not sit still: it shifts to new firing positions every so often
  for(const v of S.veh)if(v.alive&&v.side==='E'&&!v.mv&&!v.immob){v.rp=(v.rp??(15+rn()*20))-dt;if(v.rp<=0){v.rp=20+rn()*25;const c=S.mission==='DEFEND'?new V3(v.x,0,v.z):S.village;v.goal=new V3(c.x+(rn()-.5)*120,0,(S.mission==='DEFEND'?v.z:c.z-40)+(rn()-.5)*80);}}}
// v389: the battle's time of day, weather and season come from where and when it is: in the world war the local solar
// time at the place (war clock), that theatre's weather and the season at its latitude (seasons.js); in the campaign the
// campaign's clock and weather. They set the sky, light, fog, ground colour and rain or snow.
function conditions(cfg){const o={tod:12,wx:'CLEAR',season:'SUMMER',src:'default'};
  try{if(cfg.camp&&typeof CAMP!=='undefined'&&CAMP.st){const c=CAMP.clock();o.tod=c.hod;o.wx=(CAMP.st.wx&&CAMP.st.wx.s)||ENV.wx||'CLEAR';o.season='SUMMER';o.src='campaign';return o;}
    const st=W.st,L=cfg.loc;if(st&&st.start){const t=Date.parse(st.start)+st.t*3600e3,d=new Date(t),lat=L&&L.lat!=null?L.lat:50,lon=L&&L.lon!=null?L.lon:20;
      o.tod=((d.getUTCHours()+d.getUTCMinutes()/60+lon/15)%24+24)%24;o.season=W.season?W.season(lat,d.getUTCMonth()):'SUMMER';
      for(const th of st.th||[]){const T=W.THEATRES&&W.THEATRES.find(q=>q.id===th.id);if(T&&lat>=T.lat[0]&&lat<=T.lat[1]&&lon>=T.lon[0]&&lon<=T.lon[1]){o.wx=th.wx||'CLEAR';break;}}o.src='war';}}catch(e){}
  return o;}
function envFor(cfg){const c=conditions(cfg);cfg.cond=c;const h=c.tod,night=h<5||h>=21,dawn=h>=5&&h<7.5,dusk=h>=18&&h<21;const wx=c.wx;
  const wet=wx==='RAIN'||wx==='STORM'||wx==='OVERCAST',snow=wx==='SNOW';
  let sky=night?0x141b2a:dawn?0xd8a98a:dusk?0x8a6a78:0x9fb8c8,hem=night?.22:dawn||dusk?.55:.85,sun=night?.08:dawn||dusk?.5:.7,sunc=night?0x8aa0d0:dawn?0xffc89a:dusk?0xff9a6a:0xffffff,fog=[250,900];
  if(wx==='CLOUD'||wx==='SCATTERED'){sky=night?sky:0xa8b2b8;sun*=.75;}if(wet){sky=night?0x10141c:wx==='STORM'?0x5c6268:0x8e979c;sun*=.45;fog=wx==='STORM'?[90,450]:[150,650];}if(snow){sky=night?0x1a2030:0xc4c8cc;fog=[120,550];sun*=.6;}
  const SG={WINTER:Math.abs((cfg.loc&&cfg.loc.lat)||50)>40?0xd8dcd8:0x6a6a4c,SPRING:0x63764a,SUMMER:0x5e7442,AUTUMN:0x7a6e42,WET:0x557a3c,DRY:0x9a8a5a}[c.season]||0x5e7442;
  return{n:(night?'night':dawn?'dawn':dusk?'dusk':'day')+' · '+wx.toLowerCase()+' · '+c.season.toLowerCase(),sky,fog,hem,sun,sunc,g:snow?0xdfe3e0:SG,low:dawn||dusk,dark:night||dusk,wind:wx==='STORM'?5:wet?3:1.5,rain:wet&&wx!=='OVERCAST'?(wx==='STORM'?2:1):0,snow,tod:h,wx,season:c.season};}
// rain or snow falling around you
function precipStep(dt){const E=S.env;if(!E||(!E.rain&&!E.snow)||!S.sc)return;if(!S.pp){const n=E.snow?1500:2500,g=new THREE.BufferGeometry(),a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=(rn()-.5)*80;a[i*3+1]=rn()*40;a[i*3+2]=(rn()-.5)*80;}
    g.setAttribute('position',new THREE.BufferAttribute(a,3));S.pp=new THREE.Points(g,new THREE.PointsMaterial({color:E.snow?0xffffff:0xaabbcc,size:E.snow?.12:.06,transparent:true,opacity:E.snow?.9:.6}));S.pp.frustumCulled=false;S.sc.add(S.pp);}
  const a=S.pp.geometry.attributes.position.array,vy=E.snow?1.2:(E.rain>1?16:11),wx=E.wind*.6;for(let i=0;i<a.length;i+=3){a[i+1]-=vy*dt;a[i]+=wx*dt;if(a[i+1]<0){a[i+1]=40;a[i]=(rn()-.5)*80;a[i+2]=(rn()-.5)*80;}}
  S.pp.geometry.attributes.position.needsUpdate=true;S.pp.position.set(S.pos.x,S.pos.y-20,S.pos.z);}
// (kept for reference: the old random presets)
const ENVS=[{n:'day',sky:0x9fb8c8,fog:[250,900],hem:.85,sun:.7,sunc:0xffffff,g:0x5e7442},{n:'overcast',sky:0x8e979c,fog:[150,650],hem:.75,sun:.35,sunc:0xdde4ea,g:0x566b40,wind:3},
  {n:'dawn',sky:0xd8a98a,fog:[180,750],hem:.6,sun:.6,sunc:0xffc89a,g:0x5a6c42,low:1},{n:'dusk',sky:0x8a6a78,fog:[160,700],hem:.45,sun:.45,sunc:0xff9a6a,g:0x55663f,low:1,dark:1},
  {n:'autumn',sky:0xa8b0b4,fog:[220,850],hem:.8,sun:.6,sunc:0xfff0d8,g:0x7a6e42},{n:'early spring',sky:0xb0c0c8,fog:[220,850],hem:.8,sun:.6,sunc:0xffffff,g:0x6a6a48},{n:'fog',sky:0xb4b8b6,fog:[40,320],hem:.8,sun:.2,sunc:0xffffff,g:0x5a6c42,wind:.5}];

/* ------------------------------------------------------------------ v381 */
// STRUCTURAL DAMAGE: every heavy blast (rocket, grenade, FPV, artillery, one-way drone, bomb) hits bunkers, dugouts and
// command posts by their strength; a building that loses enough of its walls collapses (upper floors and roof come down
// as rubble). The enemy's command post destroyed or taken silences their calls for backup.
const SDMG=r=>r>=14?2200:r>=11?900:r>=9?140:r>=7?300:500;
function structHit(p,r){const sd=SDMG(r);
  for(const c of S.STR){if(c.down)continue;const d=Math.hypot(c.cx-p.x,c.cz-p.z);if(d>r+3.5)continue;c.hp-=sd*(d<3.5?1:.5);if(c.hp<=0)collapse(c,c.kind+(c.side==='E'?' (enemy)':' (yours)')+' destroyed');}
  for(const b of S.BLD){if(b.down||!b.walls||b.kind==='BUNKER'||b.kind==='DUGOUT'||b.kind==='COMMAND POST')continue;const near=Math.abs(p.x-b.x)<b.w/2+3&&Math.abs(p.z-b.z)<b.d/2+3;if(!near)continue;
    // each building has a strength from its size and storeys; heavy blasts on or by it use it up, and walls blown out weaken it
    b.hp=b.hp??b.w*b.d*(b.fl||1)*25;b.hp-=sd;const lost=b.parts.filter(q=>q.gone&&q.y1-q.y0>2.4).length;if(b.hp<=0||lost/b.walls>.42)collapse(b,b.kind.toLowerCase()+' collapses');}}
function removeBox(q){if(q.gone)return;q.gone=true;S.sc.remove(q.m);const k=S.solid.indexOf(q.m);if(k>=0)S.solid.splice(k,1);const j=S.blds.indexOf(q);if(j>=0)S.blds.splice(j,1);if(q.bid!=null&&S.BLD[q.bid])(S.dirtyB||(S.dirtyB=new Set())).add(S.BLD[q.bid]);}
function collapse(c,why){if(c.down)return;c.down=true;try{if(c.x!=null&&c.w)detailGone(c);}catch(e){}if(c.roof)c.sc.remove(c.roof);const ys=c.parts.map(q=>q.y0),y0=Math.min(...ys);
  for(const q of c.parts)if(q.y0>y0+.5||c.kind==='BUNKER'||c.kind==='DUGOUT'||c.kind==='COMMAND POST')removeBox(q);
  mergeB(c);if(S.dirtyB)S.dirtyB.delete(c);const h=Math.min(3.5,1+(c.fl||1)*.6),rb=new THREE.Mesh(new THREE.BoxGeometry(c.w*.9,h,c.d*.9),RUBM);rb.position.set(c.x,y0+h/2,c.z);rb.rotation.y=(rn()-.5)*.3;S.sc.add(rb);
  if(!S.quiet)smoke(new V3(c.x,y0+2,c.z));for(let i=0;i<(S.quiet?0:6);i++)smoke(new V3(c.x+(rn()-.5)*c.w,y0+3,c.z+(rn()-.5)*c.d));
  for(const u of[...S.us,...S.them])if(u.alive&&Math.abs(u.m.position.x-c.x)<c.w/2+.5&&Math.abs(u.m.position.z-c.z)<c.d/2+.5)hitMan(u,400,false);
  if(Math.abs(S.pos.x-c.x)<c.w/2&&Math.abs(S.pos.z-c.z)<c.d/2)hurt(120,'blast');
  if(c.kind==='COMMAND POST'){if(c.mast)S.sc.remove(c.mast);if(c.side==='E'){S.eCP=true;S.pend=null;say('ENEMY COMMAND POST DESTROYED · THEIR RADIO IS SILENT',4);}else{S.fCP=true;say('OUR COMMAND POST IS DESTROYED · NO MORE OFFENSIVES',4);}}
  else if(why)say(why.toUpperCase(),2.5);S.collapsed=(S.collapsed||0)+1;}

// ARMOUR: a hit on an armoured vehicle is worked out by where it struck (hull or turret; front, side, rear, top; tracks),
// the plate there and the angle it met, against the weapon's penetration (game values by class, not data for any real
// vehicle or round). It bounces (ricochet), stops in the armour, or penetrates and damages what is behind: crew,
// engine, transmission, tracks, gun, optics, fuel, ammunition. The overview shows it on a diagram.
const PEN={TANKHEAT:520,AMR:45,PISTOL:3,RPG:420,ATGM:780,FPV:300,TANK:650,RIFLE:8,CARB:7,SMG:4,SHOT:3,LMG:8,DMR:12,SNP:22,PISTOL:3};
const ARMT={MBT:{hull:{front:550,side:90,rear:45,top:30},turret:{front:680,side:230,rear:70,top:40},dim:[3.6,2.6,7.6],tz:2.0},IFV:{hull:{front:45,side:28,rear:20,top:16},turret:{front:40,side:25,rear:20,top:15},dim:[3.1,2.9,6.6],tz:2.3},APC:{hull:{front:16,side:11,rear:9,top:8},turret:{front:10,side:10,rear:10,top:8},dim:[3.1,2.4,6.6],tz:9}};
const COMP={front:['driver','transmission','gun breech','gunner sight'],side:['ammunition','fuel tank','crew','road wheels'],rear:['engine','fuel tank','transmission'],top:['commander','gunner','ammunition','optics'],tracks:['track']};
function vkind(v){return v.tank?'MBT':v.m.userData.gun?'IFV':'APC';}
const vcOf=v=>v.m.userData.vc||{};
const vfam=v=>v.m.userData.fam||'WEST';
// v387 armour: each face is a plate of a thickness at a slope (from vertical); a warhead is kinetic (bullets, sabot) or
// shaped-charge (rockets, missiles, FPV). Explosive reactive armour bricks (Soviet-pattern) burn off a shaped charge's
// jet (a tandem warhead defeats them) and blunt sabot; composite arrays count more against shaped charges; a kinetic
// round may ricochet off steep plates and a shaped charge may fail to fuze at a grazing angle. Behind the armour, a
// spall liner limits fragments; what is hit follows the family's layout: Soviet-pattern tanks carry their ammunition
// in a carousel under the turret (it detonates), Western-pattern in a turret bustle behind blow-out panels (it vents,
// the crew lives). Game values by class, not data for any real vehicle or round.
const PL={SOV:{MBT:{hull:{front:[220,68],side:[80,0],rear:[40,0],top:[30,85]},turret:{front:[480,30],side:[200,15],rear:[70,0],top:[40,80]},era:['hull.front','turret.front','hull.side'],comp:1.3,liner:.5},
              IFV:{hull:{front:[35,78],side:[18,0],rear:[16,0],top:[12,85]},turret:{front:[25,40],side:[18,20],rear:[14,0],top:[10,80]},era:[],comp:1,liner:0},
              APC:{hull:{front:[14,55],side:[9,10],rear:[8,0],top:[7,85]},turret:{front:[8,30],side:[8,20],rear:[8,0],top:[7,80]},era:[],comp:1,liner:0}},
          WEST:{MBT:{hull:{front:[300,60],side:[70,0],rear:[40,0],top:[30,85]},turret:{front:[620,12],side:[190,10],rear:[60,0],top:[40,80]},era:[],comp:1.45,liner:.8,bustle:1},
              IFV:{hull:{front:[45,60],side:[30,0],rear:[25,0],top:[15,85]},turret:{front:[35,30],side:[25,15],rear:[18,0],top:[12,80]},era:[],comp:1.1,liner:.5},
              APC:{hull:{front:[20,55],side:[14,10],rear:[12,0],top:[10,85]},turret:{front:[10,30],side:[10,20],rear:[10,0],top:[8,80]},era:[],comp:1,liner:.3}}};
const WH={RPG:'HEAT',ATGM:'HEAT2',FPV:'HEAT',TANK:'KE',TANKHEAT:'HEAT'};
function armorHit(v,pt,dir,wpn){return armorHit2(v,pt,dir,wpn);}
function armorHitOld(v,pt,dir,wpn){const k=vkind(v),A=ARMT[k],P=v.m.position,ry=v.m.rotation.y,c=Math.cos(-ry),s2=Math.sin(-ry);
  const dx=pt.x-P.x,dz=pt.z-P.z,lx=dx*c-dz*s2,lz=dx*s2+dz*c,ly=pt.y-P.y,ldx=dir.x*c-dir.z*s2,ldz=dir.x*s2+dir.z*c;
  const turret=ly>A.tz&&Math.abs(lz)<A.dim[2]*.35,part=turret?'turret':'hull';let face,n;
  if(dir.y<-.55&&(wpn==='ATGM'||wpn==='FPV')){face='top';n=new V3(0,1,0);}else{const ax=Math.abs(lx)/(A.dim[0]/2),az=Math.abs(lz)/(A.dim[2]/2);if(az>=ax){face=lz<0?'front':'rear';n=new V3(0,0,lz<0?-1:1);}else{face='side';n=new V3(Math.sign(lx)||1,0,0);}}
  const tracks=face==='side'&&!turret&&ly<.95;const t=A[part][face]*(tracks?.5:1);const cos=Math.abs(n.x*ldx+n.y*dir.y+n.z*ldz),ang=Math.round(Math.acos(Math.min(1,cos))*180/Math.PI);
  const eff=t/Math.max(.18,cos),pen=(PEN[wpn]||8)*(.9+rn()*.2);let res,dmg=[];
  if(cos<.34&&pen<eff*1.4)res='RICOCHET';else if(pen<eff)res='NO PENETRATION';else res='PENETRATED';
  if(res==='PENETRATED'){const L=tracks?COMP.tracks.slice():COMP[face].slice();const n2=1+((rn()*Math.min(3,1+(pen-eff)/150))|0);for(let i=0;i<n2&&L.length;i++)dmg.push(L.splice((rn()*L.length)|0,1)[0]);
    v.crew=v.crew??(k==='MBT'?(S.en==='R'?3:4):3);
    for(const d of dmg){if(/driver|crew|commander|gunner$/.test(d))v.crew--;if(/engine|transmission|track|road wheels/.test(d))v.immob=true;if(/gun breech|gunner sight|optics/.test(d))v.nofire=true;}
    const cook=dmg.includes('ammunition')&&rn()<(k==='MBT'&&S.en==='R'?.75:.4),fire=dmg.includes('fuel tank')&&rn()<.4;
    const st=cook?'DESTROYED · AMMUNITION DETONATED':fire?'DESTROYED · FIRE':v.crew<=1?'KNOCKED OUT · CREW ABANDONS':v.immob&&v.nofire?'MOBILITY AND FIREPOWER KILL':v.immob?'MOBILITY KILL':v.nofire?'FIREPOWER KILL':'DAMAGED';
    if(/DESTROYED|KNOCKED/.test(st)){hitVeh(v,1e6,true);if(cook&&v.m.userData.tu){v.m.userData.tu.position.y+=1.5;v.m.userData.tu.rotation.z=.8;}}res+=' · '+st;}
  else if(wpn==='RPG'||wpn==='ATGM'||wpn==='FPV')hitVeh(v,40,true);
  const rec={name:v.name||({MBT:'main battle tank',IFV:'infantry fighting vehicle',APC:'armoured personnel carrier'}[k]),k,part,face:tracks?'tracks':face,ang,t:Math.round(t),eff:Math.round(eff),pen:Math.round(pen),res,dmg,lx,lz,ly,wpn};S.armLog.push(rec);showArm(rec);return rec;}
function showArm(r){let el=document.getElementById('iArm');if(!el){el=document.createElement('div');el.id='iArm';el.style.cssText='position:absolute;right:16px;top:70px;width:250px;background:rgba(10,14,12,.82);border:1px solid #4a5e52;padding:8px;font-size:11px;line-height:1.45;transition:opacity .4s';S.hud.appendChild(el);}
  const ok=/PENETRATED/.test(r.res);el.innerHTML='<b style="color:#9fe0b8">HIT · '+esc(r.name.toUpperCase())+'</b><canvas id="iArmC" width="230" height="96" style="display:none"></canvas><div id="iArm3h" style="margin:5px 0"></div>'+
   esc(r.wpn)+(r.wh?' ('+(r.wh==='KE'?'kinetic':r.wh==='HEAT2'?'tandem shaped charge':'shaped charge')+')':'')+' → '+r.part.toUpperCase()+' '+r.face.toUpperCase()+(r.slope!=null?' · plate sloped '+r.slope+'°':'')+' · '+r.ang+'° off normal<br>Armour '+r.t+' mm · effective '+r.eff+' mm · penetration '+r.pen+' mm'+(r.notes&&r.notes.length?'<br><span style="color:#bcd">'+esc(r.notes.join(' · '))+'</span>':'')+'<br><b style="color:'+(ok?'#ff8a6a':'#ffe14a')+'">'+esc(r.res)+'</b>'+(r.dmg.length?'<br>Damaged: '+esc(r.dmg.join(', ')):'');
  const c=document.getElementById('iArmC').getContext('2d'),A=ARMT[r.k];c.clearRect(0,0,230,96);c.strokeStyle='#9fb8a8';c.lineWidth=1;c.font='9px monospace';
  const k=10,tw=A.dim[0]*k,tl=A.dim[2]*k;c.strokeRect(55-tw/2,48-tl/2,tw,tl);if(r.k!=='APC')c.strokeRect(55-tw*.35,48-tl*.2,tw*.7,tl*.4);c.fillStyle='#9fb8a8';c.fillText('TOP · FRONT ↑',4,10);
  const sl=A.dim[2]*13,sh=A.dim[1]*10;c.strokeRect(120,74-sh*.6,sl,sh*.6);if(r.k!=='APC')c.strokeRect(120+sl*.3,74-sh,sl*.4,sh*.4);c.fillText('SIDE · FRONT ←',120,10);
  c.fillStyle=ok?'#ff5a4a':'#ffe14a';c.beginPath();c.arc(55+r.lx*k,48+r.lz*k,3.5,0,7);c.fill();c.beginPath();c.arc(120+(r.lz/A.dim[2]+.5)*sl,74-Math.min(sh,r.ly*10),3.5,0,7);c.fill();
  {const h=document.getElementById('iArm3h');if(arm3D(r,h))document.getElementById('iArmC').style.display='none';else document.getElementById('iArmC').style.display='block';}
  el.style.opacity=1;clearTimeout(showArm.t);showArm.t=setTimeout(()=>{if(el)el.style.opacity=0;A3.until=0;},9000);}
// v388: the hit overview in 3D — a see-through copy of the vehicle you hit, turning slowly; the round's path in (yellow),
// through the armour and on inside (red) with the spall cone when it penetrated, deflected when it bounced, a spark when
// it stopped; the vehicle's internal parts by family, the damaged ones in red. Its own small renderer, drawn only while
// the overview is open.
const A3={R:null,sc:null,cam:null,root:null,until:0,t:0};
// where the parts sit inside, by kind and family (vehicle frame: front is -z)
function compLayout(k,fam){const L=k==='MBT'?(fam==='SOV'?6.9:7.9):6.6,F=-L/2,B=L/2,tz=k==='MBT'?(fam==='SOV'?.2:.4):0;
  const C={driver:[0,.95,F+1.3],transmission:[0,.8,B-.5],engine:[0,1.0,B-1.6],'fuel tank':[1.1,.9,F+1.9],'road wheels':[1.6,.4,0],track:[1.75,.25,0],crew:[-.6,1.1,.6],
    gunner:[.55,1.9,tz-.3],commander:[-.55,2.0,tz+.4],'gun breech':[0,2.0,tz-.9],'gunner sight':[.75,2.4,tz-1.3],optics:[-.6,2.5,tz-.2],'turret drive':[0,1.6,tz]};
  if(k==='MBT'&&fam==='SOV')C.ammunition=[0,.75,tz];else C.ammunition=[-1.1,.9,F+1.8];if(k==='MBT'&&fam==='WEST')C['bustle ammunition']=[0,2.3,tz+2.5];
  if(k!=='MBT'){C.crew=[0,1.0,B-1.6];C.engine=[.6,1.0,F+1.2];C.transmission=[0,.8,F+.6];}
  return C;}
function arm3D(r,host){if(!host||!r.v)return false;try{
  if(!A3.R){const cv=document.createElement('canvas');cv.width=460;cv.height=300;cv.style.cssText='width:230px;height:150px;display:block;background:#0b100e;border:1px solid #2a3a33';
    A3.R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:false});A3.R.setPixelRatio(1);A3.R.setSize(460,300,false);A3.cv=cv;
    A3.cam=new THREE.PerspectiveCamera(38,460/300,.1,100);}
  host.appendChild(A3.cv);if(A3.root)A3.root.traverse(o=>{if(o.geometry&&!o.userData.sh)o.geometry.dispose();});
  const sc=new THREE.Scene();sc.background=new THREE.Color(0x0b100e);sc.add(new THREE.HemisphereLight(0xe0f0ff,0x202820,1.1));const dl=new THREE.DirectionalLight(0xffffff,.6);dl.position.set(4,8,5);sc.add(dl);
  const root=new THREE.Group();sc.add(root);
  // the vehicle as glass: a faint body and its outline
  const v=r.v.m.clone(true);v.position.set(0,0,0);v.rotation.set(0,0,0);const ghost=new THREE.MeshLambertMaterial({color:0x8fb0a0,transparent:true,opacity:.14,depthWrite:false}),edge=new THREE.LineBasicMaterial({color:0x6f9a86,transparent:true,opacity:.55});
  const lines=[];v.traverse(o=>{if(o.isMesh){o.userData.sh=1;o.material=ghost;if(o.geometry&&o.geometry.attributes.position.count<600){const e=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,25),edge);e.position.copy(o.position);e.rotation.copy(o.rotation);e.scale.copy(o.scale);lines.push([o.parent,e]);}}});
  for(const[pa,e]of lines)pa.add(e);root.add(v);
  // the parts inside
  const C=compLayout(r.k,r.fam||'WEST'),hit=new Set(r.dmg);for(const[n,pp]of Object.entries(C)){if(/^(driver|gunner|commander|crew)$/.test(n))continue;const big=/engine|ammunition|transmission|fuel/.test(n),dmg=hit.has(n);
    const m=new THREE.Mesh(new THREE.BoxGeometry(big?.9:.32,big?.55:.32,big?.7:.32),new THREE.MeshLambertMaterial({color:dmg?0xff4a30:0x6f8a7c,transparent:true,opacity:dmg?.95:.5,emissive:dmg?0x601000:0}));m.position.set(pp[0],pp[1],pp[2]);root.add(m);}
  // the crew in their seats
  const seats=r.k==='MBT'?(r.fam==='SOV'?['driver','gunner','commander']:['driver','gunner','commander','loader']):r.k==='IFV'?['driver','gunner','commander']:['driver','commander'];
  const SP=Object.assign({},C,{loader:[-.6,1.7,(C.gunner?C.gunner[2]:0)+.2]});const cas=(r.v&&r.v.cas)||{};
  for(const n of seats){const q=SP[n];if(!q)continue;const dead=!!cas[n],cm=new THREE.MeshLambertMaterial({color:dead?0xff3a2a:0xd8c49a,emissive:dead?0x501000:0x202010}),fg=new THREE.Group();
    const bd=new THREE.Mesh(new THREE.BoxGeometry(.3,.42,.24),cm);bd.position.y=.0;fg.add(bd);const hd=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),cm);hd.position.y=.32;fg.add(hd);const lg=new THREE.Mesh(new THREE.BoxGeometry(.28,.14,.36),cm);lg.position.set(0,-.24,-.12);fg.add(lg);
    fg.position.set(q[0],q[1]+.1,q[2]+.15);root.add(fg);}
  // the round's path: in (yellow) to the strike point; then inside (red) with the spall cone, or deflected, or stopped
  const P=new V3(r.lx,r.ly,r.lz),D=new V3(r.ld[0],r.ld[1],r.ld[2]).normalize(),Y=new THREE.LineBasicMaterial({color:0xffe14a}),Rm=new THREE.LineBasicMaterial({color:0xff4a30});
  const seg=(a,b,m)=>root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),m));seg(P.clone().addScaledVector(D,-5),P,Y);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),new THREE.MeshBasicMaterial({color:/PENETRATED/.test(r.res)?0xff4a30:0xffe14a}));dot.position.copy(P);root.add(dot);
  if(r.aps){const f=new THREE.Mesh(new THREE.SphereGeometry(.6,10,8),new THREE.MeshBasicMaterial({color:0xffd060,transparent:true,opacity:.6}));f.position.copy(P);root.add(f);}
  else if(/PENETRATED/.test(r.res)){seg(P,P.clone().addScaledVector(D,2.6),Rm);const cone=new THREE.Mesh(new THREE.ConeGeometry(.9,2.2,16,1,true),new THREE.MeshBasicMaterial({color:0xff8a3a,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
    cone.position.copy(P.clone().addScaledVector(D,1.1));cone.quaternion.setFromUnitVectors(new V3(0,-1,0),D);root.add(cone);
    for(const n of r.dmg){const q=C[n];if(q)seg(P,new V3(q[0],q[1],q[2]),new THREE.LineBasicMaterial({color:0xff7a50,transparent:true,opacity:.7}));}}
  else if(/RICOCHET/.test(r.res)){const n=new V3(0,.4,0).add(D.clone().multiplyScalar(-1)).normalize();const out=D.clone().reflect(new V3(Math.abs(D.x)>Math.abs(D.z)?Math.sign(-D.x):0,.3,Math.abs(D.z)>=Math.abs(D.x)?Math.sign(-D.z):0).normalize());seg(P,P.clone().addScaledVector(out,3.5),Y);}
  else{for(let i=0;i<6;i++){const s2=new V3((rn()-.5),(rn()-.2),(rn()-.5)).normalize();seg(P,P.clone().addScaledVector(s2,.5),Y);}}
  // ERA brick that went off
  if(r.notes&&r.notes.some(x=>/ERA brick (detonated|set off)/.test(x))){const f=new THREE.Mesh(new THREE.SphereGeometry(.45,10,8),new THREE.MeshBasicMaterial({color:0xffb050,transparent:true,opacity:.45}));f.position.copy(P);root.add(f);}
  // camera: three-quarter view from the side that was hit, turning slowly
  const A=ARMT[r.k];A3.sc=sc;A3.root=root;A3.dist=A.dim[2]*(r.aps?2.6:1.55);A3.az=Math.atan2(r.lx||.01,r.lz||.01)+.6;A3.t=0;A3.until=performance.now()+9000;
  if(!A3.loop){A3.loop=1;const tick=()=>{if(A3.until<performance.now()||!A3.sc){A3.loop=0;return;}requestAnimationFrame(tick);A3.t+=1/60;const a=A3.az+A3.t*.35;
      A3.cam.position.set(Math.sin(a)*A3.dist,A3.dist*.55,Math.cos(a)*A3.dist);A3.cam.lookAt(0,1.3,0);A3.R.render(A3.sc,A3.cam);};requestAnimationFrame(tick);}
  A3.cam.position.set(Math.sin(A3.az)*A3.dist,A3.dist*.55,Math.cos(A3.az)*A3.dist);A3.cam.lookAt(0,1.3,0);A3.R.render(sc,A3.cam);
  return true;}catch(e){console.warn('[infantry] 3D overview',e);return false;}}

// FPV YOU PLACE: F puts a drone on the ground in front of you; an operator back at base takes it over, lifts it and
// flies it into the best target it finds (armour first). V shows its video feed until it strikes.
function placeFpv(){if(S.phase!=='FIGHT')return;if(S.fpvKit<=0){say('NO FPV DRONES LEFT',1.5);return;}S.fpvKit--;const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw)),p=S.pos.clone().addScaledVector(f,1.5);p.y=H(p.x,p.z)+.15;
  const m=dMesh('FPV',0x2b2f2b);m.position.copy(p);const d={k:'FPV',side:'F',m,hp:10,alive:true,t:0,cool:0,name:'FPV attack drone (yours)',spd:32,mine:true,wait:4};S.drones.push(d);S.myFpv.push(d);
  say('FPV PLACED · OPERATOR AT BASE TAKING CONTROL'+(S.fpvKit?' · '+S.fpvKit+' LEFT':''),3);return d;}
function feedView(){const d=S.myFpv.find(x=>x.alive&&x.wait<=0);if(!d){S.feed=null;say('NO DRONE IN THE AIR',1.5);return;}S.feed=S.feed===d?null:d;}
// MEDEVAC: H calls a helicopter to a landing zone near you; the wounded near it are flown out, and you are treated if you
// stand by it. One at a time, three a battle.
function medevac(forced){if(S.phase!=='FIGHT'||S.med)return;if(S.medN>=3){say('NO MORE MEDEVAC THIS BATTLE',2);return;}const wounded=S.us.filter(u=>u.down&&!u.evac).length;if(!forced&&!wounded&&S.hp>=99){say('NO CASUALTIES TO EVACUATE',2);return;}
  S.medN++;const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw));const lz=forced?S.pos.clone().add(new V3(6,0,8)):S.pos.clone().addScaledVector(f,-22);lz.y=H(lz.x,lz.z);
  // with enemy aircraft or drones about, an armoured ambulance comes by road instead of a helicopter
  const air=(S.eheli&&S.eheli.alive)||S.drones.some(d=>d.alive&&d.side==='E'&&d.k!=='FPV');if(air){const v=vehicle('APC',0x4e5a3c);const cr=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),new THREE.MeshBasicMaterial({color:0xd03030,side:THREE.DoubleSide}));cr.position.set(1.47,1.5,0);cr.rotation.y=Math.PI/2;v.add(cr);
    v.position.set(lz.x,H(lz.x,lz.z+420),lz.z+420);S.sc.add(v);v.userData.rotor={rotation:{y:0}};S.med={h:v,lz,t:0,st:'IN',from:v.position.clone(),road:true};if(S.downed)S.downT=60;say('ARMOURED AMBULANCE INBOUND BY ROAD (ENEMY AIR ABOUT) · ABOUT 25 S',3);return;}
  const h=helo(0x46503f);h.position.set(lz.x-600,lz.y+120,lz.z+600);S.sc.add(h);
  const cross=new THREE.Mesh(new THREE.PlaneGeometry(2,6),new THREE.MeshBasicMaterial({color:0xd03030}));cross.rotation.x=-Math.PI/2;h.add(cross);cross.position.set(0,2.85,0);
  S.med={h,lz,t:0,st:'IN',from:h.position.clone()};say(forced?'MEDEVAC HELICOPTER INBOUND TO YOU · ABOUT 25 S':'MEDEVAC INBOUND · LANDING ZONE 20 M BEHIND YOU · ABOUT 25 S · STAND BY IT IF HURT TO BE FLOWN OUT',3);}
const grassStep={M:new THREE.Matrix4(),q:new THREE.Quaternion(),e:new THREE.Euler(),s:new V3(),v:new V3()};
function v381Step(dt){
  if(S.grass){if(!S.gj&&(!S.gp||S.gp.distanceTo(S.pos)>14)){S.gp=S.pos.clone();S.gj={c:S.pos.clone(),n:0,i:0};}
    const J=S.gj;if(J){const M=grassStep.M,q=grassStep.q,e=grassStep.e,sc3=grassStep.s,v=grassStep.v;const lim=Math.min(J.i+900,6000);
      for(;J.i<lim&&J.n<3600;J.i++){const a=rn()*6.283,r=Math.sqrt(rn())*48,x=J.c.x+Math.cos(a)*r,z=J.c.z+Math.sin(a)*r;if(!green(x,z,1.2))continue;e.set(0,rn()*3.14,0);q.setFromEuler(e);const k=.6+rn()*.9;sc3.set(k,k*(.7+rn()*.8),k);v.set(x,H(x,z)-.02,z);M.compose(v,q,sc3);S.grass.setMatrixAt(J.n++,M);}
      S.grass.instanceMatrix.needsUpdate=true;if(J.i>=6000||J.n>=3600){S.grass.count=J.n;S.gj=null;}else S.grass.count=Math.max(S.grass.count,J.n);}}
  for(const d of S.myFpv){if(!d.alive)continue;if(d.wait>0){d.wait-=dt;if(d.wait<=0)say('OPERATOR: DRONE UP · LOOKING FOR A TARGET (V FOR THE FEED)',2.5);continue;}
    if(!d.dive){d.m.position.y+=8*dt;if(d.m.position.y>H(d.m.position.x,d.m.position.z)+25)d.dive=true;}}
  if(S.feed&&!S.feed.alive){S.feed=null;say('FEED LOST · DRONE STRUCK',2);}
  const M=S.med;if(M){M.t+=dt;const P=M.h.position;M.h.userData.rotor.rotation.y+=dt*30;
    if(M.road&&M.st==='IN'){const u=Math.min(1,M.t/24);P.lerpVectors(M.from,M.lz,u);P.y=H(P.x,P.z);if(u>=1){M.st='DOWN';M.t=0;say('AMBULANCE HERE · WOUNDED BEING LOADED',3);}}
    else if(M.st==='IN'){const u=Math.min(1,M.t/22);P.lerpVectors(M.from,new V3(M.lz.x,M.lz.y+(u>.8?(1-u)*200:40),M.lz.z),u);if(u>=1){P.copy(M.lz);M.st='DOWN';M.t=0;say('MEDEVAC ON THE GROUND · WOUNDED BEING LOADED',3);}}
    else if(M.st==='DOWN'){for(const u of S.us)if(u.down&&!u.evac&&u.m.position.distanceTo(M.lz)<70){u.evac=true;S.evac++;u.m.visible=false;}
      if(!S.evacMe&&(S.downed||S.hp<70)&&Math.hypot(S.pos.x-P.x,S.pos.z-P.z)<12){S.evacMe=true;M.st='OUT';M.t=0;say((M.road?'LOADED INTO THE AMBULANCE':'ON BOARD THE MEDEVAC')+' · OUT OF THE BATTLE',3);}
      else if(S.pos.distanceTo(P)<12&&S.hp<100&&!S.evacMe){S.hp=100;say('TREATED BY THE MEDEVAC CREW · HEALTH RESTORED',2.5);}if(M.t>20){M.st='OUT';M.t=0;say('MEDEVAC LIFTING · '+S.evac+' EVACUATED SO FAR',2.5);}}
    else{if(M.road){P.z+=dt*9;P.y=H(P.x,P.z);}else{P.y+=dt*15;P.x+=dt*40;}if(S.evacMe){S.pos.copy(P).add(new V3(0,M.road?3.2:2,0));S.vel.set(0,0,0);if(M.t>8){end('EVACUATED');return;}}if(M.t>15){S.sc.remove(M.h);S.med=null;}}}
  if(S.downed&&!S.evacMe){S.downT-=dt;S.vel.set(0,0,0);if(S.downT<=0)end('KIA');}
  for(const c of S.STR)if(c.kind==='COMMAND POST'&&c.side==='E'&&!c.down&&!c.taken&&Math.abs(S.pos.x-c.cx)<3.5&&Math.abs(S.pos.z-c.cz)<3&&!S.them.some(u=>u.alive&&Math.hypot(u.m.position.x-c.cx,u.m.position.z-c.cz)<30)){c.taken=true;S.eCP=true;S.pend=null;say('ENEMY COMMAND POST TAKEN · THEIR RADIO IS SILENT',4);}
  if(S.eCP)S.pend=null;}

/* ------------------------------------------------------------------ drones */
// FPV: small quadcopters that dive on almost anything (soldiers, vehicles, you); shoot them down.
// One-way attack drones (Shahed-136 / Geran-2 type for REDFOR): slow, loud, fly over toward the rear and strike.
// Loitering armed drones (MQ-9 Reaper type, or the side's own, from its equipment table): circle high, strike with a missile.
function dName(side,k){const a3=side==='F'?S.cfg.a3:S.enA3,E=EQ(a3||''),red=(side==='F'?S.me:S.en)==='R';
  return k==='FPV'?'FPV attack drone':k==='OWA'?(red?'Shahed-136 / Geran-2 type one-way attack drone':'one-way attack drone'):(first(E.UAVA)||(red?'Orion':'MQ-9 Reaper'))+' armed drone';}
function dMesh(k,col){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:col});
  if(k==='FPV'){const b=new THREE.Mesh(new THREE.BoxGeometry(.25,.08,.25),m);g.add(b);for(const[x,z]of[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]]){const r=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.01,8),new THREE.MeshBasicMaterial({color:0x111111}));r.position.set(x,.05,z);g.add(r);}}
  else if(k==='OWA'){const b=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,3.5,8),m);b.rotation.x=Math.PI/2;g.add(b);const w=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new V3(0,0,-1.6),new V3(-1.25,0,1.4),new V3(1.25,0,1.4)]),m);w.material.side=THREE.DoubleSide;g.add(w);}
  else{const b=new THREE.Mesh(new THREE.CylinderGeometry(.5,.35,11,8),m);b.rotation.x=Math.PI/2;g.add(b);const w=new THREE.Mesh(new THREE.BoxGeometry(20,.15,1),m);g.add(w);const t=new THREE.Mesh(new THREE.BoxGeometry(3,.1,.6),m);t.position.set(0,.6,5);t.rotation.z=.7;g.add(t);}
  g.traverse(o=>{if(o.isMesh)o.userData.part='drone';});S.sc.add(g);return g;}
function spawnDrone(k,side){const red=(side==='F'?S.me:S.en)==='R',col=k==='FPV'?0x333333:red?0x8a8a7a:0x9aa0a6;const m=dMesh(k,col);const v=S.village;
  const from=side==='E'?new V3(v.x+(rn()-.5)*300,0,v.z-500):new V3((rn()-.5)*200,0,500);
  from.y=H(from.x,from.z)+(k==='FPV'?40:k==='OWA'?150:1500);m.position.copy(from);
  const d={k,side,m,hp:k==='FPV'?10:k==='OWA'?60:300,alive:true,t:0,cool:k==='MALE'?12:0,name:dName(side,k),spd:k==='FPV'?32:k==='OWA'?50:45};S.drones.push(d);
  if(side==='E')say((k==='FPV'?'FPV DRONE INBOUND':k==='OWA'?'ONE-WAY ATTACK DRONE OVERHEAD':'ARMED DRONE OVERHEAD').toUpperCase(),2.5);return d;}
function droneTarget(d){const foes=d.side==='E'?S.us.filter(u=>u.alive).map(u=>u.m.position):S.them.filter(u=>u.alive).map(u=>u.m.position);
  for(const v of S.veh)if(v.alive&&v.side!==d.side)foes.push(v.m.position);if(d.side==='E'&&S.phase==='FIGHT')foes.push(S.pos);if(!foes.length)return null;
  let b=null,bd=1e12;for(const f of foes){const x=f.distanceTo(d.m.position)*(f===S.pos?.7:1);if(x<bd){bd=x;b=f;}}return b;}
function droneStep(dt){if(S.phase!=='FIGHT')return;S.dT-=dt;
  if(S.dT<=0){S.dT=14+rn()*16;const r=rn();spawnDrone(r<.6?'FPV':r<.85?'OWA':'MALE',rn()<.72?'E':'F');}
  for(let i=S.drones.length-1;i>=0;i--){const d=S.drones[i],P=d.m.position;d.t+=dt;if(!d.alive){S.sc.remove(d.m);S.drones.splice(i,1);continue;}
    if(d.k==='FPV'){if(d.mine&&!d.dive)continue;const mv=d.mine?S.veh.filter(v=>v.alive&&v.side==='E').sort((a,b)=>a.m.position.distanceTo(P)-b.m.position.distanceTo(P))[0]:null;const tg=mv?mv.m.position.clone().setY(mv.m.position.y+2.6):droneTarget(d);if(!tg){d.alive=false;continue;}const dir=tg.clone().add(new V3(0,tg===S.pos?-.6:1,0)).sub(P),L=dir.length();
      // weave on the approach, then dive
      dir.normalize();if(L>30)dir.x+=Math.sin(d.t*3)*.3;{const p0=P.clone();P.addScaledVector(dir.normalize(),d.spd*dt);   /* v421: a drone cannot pass through walls or the ground: it climbs over what it can see ahead, and strikes what it flies into */
        if(solidAt(P)||P.y<H(P.x,P.z)+.2){if(L<14||d.dive){P.copy(p0);blast(P.clone(),6,150,d.side==='F');d.alive=false;S.sc.remove(d.m);continue;}P.copy(p0);P.y+=d.spd*dt;}
        else{const ah=P.clone().addScaledVector(dir,6);if(L>14&&(solidAt(ah)||ah.y<H(ah.x,ah.z)+1))P.y+=d.spd*.6*dt;}}d.m.lookAt(tg);if(L<2.2){if(d.mine){const v=S.veh.find(v=>v.alive&&v.side==='E'&&v.m.position.distanceTo(P)<5);if(v)armorHit(v,P.clone(),dir.clone(),'FPV');}blast(P.clone(),7,170,d.side==='F');d.alive=false;}}
    else if(d.k==='OWA'){const tz=d.side==='E'?700:-900;P.z+=(tz>P.z?1:-1)*d.spd*dt;P.y=Math.max(P.y-dt*4,H(P.x,P.z)+60);d.m.rotation.y=tz>P.z?Math.PI:0;
      if(Math.abs(P.z-tz)<20||d.t>40){blast(new V3(P.x,H(P.x,P.z),P.z),12,250,false);fx(new V3(P.x,H(P.x,P.z)+3,P.z),5);d.alive=false;}}
    else{const c=S.village;P.set(c.x+Math.cos(d.t*.05)*900,H(c.x,c.z)+1500,c.z+Math.sin(d.t*.05)*900);d.m.rotation.y=-d.t*.05;d.cool-=dt;
      if(d.cool<=0){d.cool=18+rn()*8;const tg=droneTarget(d);if(tg){const tp=tg.clone();S.rk.push({p:P.clone(),v:tp.clone().sub(P).normalize().multiplyScalar(280),t:0,g:{spd:280,dmg:500,guided:1},own:d.side==='F',tgtP:tp});if(d.side==='E')say('MISSILE LAUNCH FROM ARMED DRONE',2);}}
      if(d.t>200)d.alive=false;}}}
function hitDrone(d,dmg,own){d.hp-=dmg;if(d.hp<=0&&d.alive){d.alive=false;fx(d.m.position.clone(),d.k==='FPV'?1:3);if(own&&d.side==='E'){S.dk=(S.dk||0)+1;say(d.name.toUpperCase()+' DOWN',2);}}}

/* ------------------------------------------------------------------ end */
const TTL=r=>({WON:'OBJECTIVE HELD',BREAK:'BREAKTHROUGH',HELD:'TRENCHES HELD',LOST:'TRENCHES LOST',KIA:'KILLED IN ACTION',EVACUATED:'EVACUATED WOUNDED',EXTRACTED:'BACK TO BASE'}[r]||'WITHDRAWN');
function end(r){if(!S||S.res)return;closePan();S.res=r;const st=S.cfg.camp?null:W.st,p=S.cfg.camp?country(S.cfg):st&&st.c[S.cfg.a3];let txt='';
  if((r==='WON'||r==='HELD'||r==='BREAK')&&S.fr){const f=S.fr,mid=f.sec[(f.sec.length/2)|0],mine=st.c[f.a].side===S.me;mid.off+=mine?.6:-.6;}
  txt=(r==='EVACUATED'?'You are wounded and evacuated '+(S.med&&S.med.road?'by armoured ambulance':'by helicopter')+' to base.':r==='EXTRACTED'?'You ride back to base.':r==='BREAK'?'Your side breaks through the enemy trench lines before '+S.loc.name+'.':r==='WON'?'Your squad takes and holds '+S.loc.name+'.':r==='HELD'?'The trenches before '+S.loc.name+' hold against '+S.wave+' waves.':r==='LOST'?'The enemy takes the trenches before '+S.loc.name+'.':r==='KIA'?'You are killed in action.':'You withdraw from the fight.')+' Enemy killed by you: '+S.kills+(S.vk?' (vehicles '+S.vk+')':'')+'; your squad lost '+S.lost+' of 6.'+(S.ff?' Friendly fire: '+S.ff+'.':'')+(S.dk?' Drones you shot down: '+S.dk+'.':'')+(S.wia?' Wounded '+S.wia+', evacuated '+S.evac+'.':'')+(S.armLog.length?' Hits on armour: '+S.armLog.length+' ('+S.armLog.filter(a=>/PENETRATED/.test(a.res)).length+' penetrated).':'')+(S.collapsed?' Structures destroyed: '+S.collapsed+'.':'');
  if(st)W.emit('INFANTRY',{e:[S.cfg.a3],txt:(p?p.n+': ':'')+txt});
  try{linkAfter(r);}catch(e){}
  try{if(st){const bt={a3:S.cfg.a3,en:S.enA3,place:S.loc.name,front:S.fr&&S.fr.id,res:r,lost:S.lost,wia:S.wia||0,kills:S.kills,pows:S.pows||0,civ:S.civHarm||0,dead:(S.sqDead||[]).slice(),names:S.us.filter(u=>u.mid&&!u.alive).map(u=>u.name).filter(Boolean),hp:S.hp,tank:!!S.tk,cas:S.casRuns||0,mis:S.mission};W.emit('BATTLE',{e:[S.cfg.a3].concat(S.enA3?[S.enA3]:[]),txt:'Battle for '+S.loc.name+': '+String(r).toLowerCase()+'.'});if(W.battlelink)W.battlelink.onBattle({battle:bt});}}catch(e){console.warn('[infantry] battle',e);}
  try{if(st&&W.squad)W.squad.after(S.cfg.a3,{dead:S.sqDead||[],wounded:S.us.filter(u=>u.mid&&(u.down||u.wounded)&&!(S.sqDead||[]).includes(u.mid)).map(u=>u.mid),place:S.loc.name,won:r==='WON'||r==='HELD'||r==='BREAK',ff:(S.ff||0)>0});}catch(e){console.warn('[infantry] squad',e);}
  // v407: the battle's results enter the war: losses on both sides come off the brigades on that front and go into the
  // death ledger, prisoners into the prisoner totals, ammunition spent off the stocks, trenches dug into the front's
  // fortification, mines cleared into the hazard clearance count
  try{if(st&&p){const e=S.enA3&&st.c[S.enA3];const ek=S.kills+(S.them.filter(u=>!u.alive&&!u.pow).length-S.kills>0?S.them.filter(u=>!u.alive&&!u.pow).length-S.kills:0);
    p.gnd=Math.max(0,(p.gnd||0)-S.lost/4000);if(e)e.gnd=Math.max(0,(e.gnd||0)-ek/4000);try{if(W.ob&&W.ob.reconcile){W.ob.reconcile(p);if(e)W.ob.reconcile(e);}}catch(x){}p.lostGnd=(p.lostGnd||0)+S.lost/4000;if(e)e.lostGnd=(e.lostGnd||0)+ek/4000;
    if(W.cemetery&&W.cemetery.record){const fl=Math.max(0,S.lost-(S.recF||0)),el=Math.max(0,ek-(S.recE||0));if(fl)W.cemetery.record({a3:p.a3,n:fl,kind:'MIL',st:'KILLED',role:'infantry',place:S.loc.name,cause:'killed in action in the battle for '+S.loc.name});if(e&&el)W.cemetery.record({a3:e.a3,n:el,kind:'MIL',st:'KILLED',role:'infantry',place:S.loc.name,cause:'killed in action in the battle for '+S.loc.name});}
    if(S.pows&&st.csar){st.csar.pow=st.csar.pow||{B:0,R:0};st.csar.pow[p.side]=(st.csar.pow[p.side]||0)+S.pows;}
    const m=st.mil&&st.mil[p.a3];if(m){if(m.mun&&m.mun.ART!=null)m.mun.ART=Math.max(0,m.mun.ART-S.shots/200000);if(S.fr&&m.fort)m.fort[S.fr.id]=Math.min(1,(m.fort[S.fr.id]||0)+(S.dug||0)*.004);}
    const svc=st.svc&&st.svc.c[p.a3];if(svc&&S.cleared)svc.eod.clr+=S.cleared;
    W.emit('INFANTRY',{e:[p.a3].concat(e?[e.a3]:[]),cf:'ESTIMATED',txt:'After the battle for '+S.loc.name+': '+S.lost+' of ours killed, about '+ek+' enemy killed'+(S.pows?', '+S.pows+' prisoners taken':'')+(S.casRuns?', '+S.casRuns+' air strikes flown':'')+(S.dug?', '+S.dug+' trench sections dug':'')+(S.cleared?', '+S.cleared+' mines cleared':'')+'. The losses come off the brigades on the front.'});}}catch(e){console.warn('[infantry] results',e);}
  if(S.cfg.camp&&typeof CAMP!=='undefined'&&CAMP.st&&S.cs!=null){const C=CAMP.st,i=S.cs,ms=0;   // side 0 is always the player's side in the campaign
    // a win pushes the sector toward the enemy (the player's side advances toward -z) and wears down its units there; a loss the other way
    if(r==='WON'||r==='HELD'||r==='BREAK'){C.front[i]-=r==='HELD'?800:1500;for(const u of C.units)if(!u.dead&&u.i===i&&u.s!==ms)u.hp=Math.max(5,(u.hp||100)-15);}
    else if(r==='KIA'){for(const u of C.units)if(!u.dead&&u.i===i&&u.s===ms){u.hp=Math.max(5,(u.hp||100)-5);break;}}
    CAMP.log('Infantry, sector '+(i+1)+': '+txt,(r==='WON'||r==='HELD')?'b':'r');try{CAMP.save();}catch(e){}}
  const ws=window.WSORTIE&&WSORTIE.WS;if(ws&&ws.kills)ws.kills.gnd+=S.kills;say(TTL(r),4);
  const good=r==='WON'||r==='HELD';
  const d=document.createElement('div');d.className='u2m';d.id='u2m';d.dataset.k='idebrief';d.style.zIndex=9995;d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','u2t');
  d.innerHTML='<div class="bx" style="border-top-color:'+(good?'#8fae6a':r==='KIA'||r==='LOST'?'#c4432e':'#cfa94f')+'"><header class="mh"><div class="mk">INFANTRY · AFTER ACTION</div><h2 id="u2t">INFANTRY DEBRIEF — '+TTL(r)+'</h2></header>'+
    '<div class="mb"><section class="sec"><h3>OUTCOME</h3><div class="verdict">'+esc(txt)+'</div></section>'+
    '<section class="sec"><h3>RESULTS</h3><div class="kpis"><div class="kp"><b>'+(S.kills|0)+'</b><span>Kills</span></div><div class="kp"><b>'+S.shots+' / '+S.hits+'</b><span>Shots / hits</span></div><div class="kp"><b>'+Math.round(S.t)+' s</b><span>Time</span></div></div>'+
    '<div class="row" style="margin-top:8px"><span>Insertion</span><b>'+esc(INS[S.ins])+'</b></div></section>'+
    (r==='WON'&&(S.fr||S.cfg.camp)?'<div class="note">The front line in this sector moves forward a little.</div>':'')+'</div>'+
    '<footer class="mf"><span></span><div class="r"><button class="go" data-iend="1">CONTINUE</button></div></footer></div>';document.body.appendChild(d);
  d.querySelector('[data-iend]').onclick=()=>{d.remove();stop(false);};if(document.pointerLockElement)document.exitPointerLock();}
function stop(early,why){if(!S)return;closePan();try{if(window._infPin&&window.WGEO&&WGEO.pin){WGEO.pin(window._infPin[0],window._infPin[1],2600,false);window._infPin=null;}}catch(e){}{const el=document.getElementById('iRideSub');if(el)el.remove();}try{if(window.INFNET&&!(early&&!S.res))INFNET.leave();}catch(e){}{const t=document.getElementById('iTank');if(t)t.remove();}{const v=document.getElementById('iVoice');if(v)v.remove();}{const p=document.getElementById('infPause');if(p)p.remove();const b=document.getElementById('infBack');if(b)b.remove();}if(early&&!S.res){end(why||'LEFT');return;}TR.n=0;TR.L=[];TR.G=[];try{trSync();}catch(e){}unbind();{const g0=document.getElementById('gl');if(g0)g0.style.filter='';}if(AU.st)AU.st.g.gain.value=0;auStop();TRC.live.length=0;if(S.WM)worldOff();S.cv.remove();S.hud.remove();try{S.R&&S.R.dispose();}catch(e){}if(typeof game!=='undefined')game.paused=S0.paused;S=null;}
window.INFANTRY={batchStatic,TR,trSync,Hf:(x,z)=>H(x,z),solidAt,nearB:(x,z)=>near(x-2,z-2,x+2,z+2,[]).map(b=>({x0:+b.x0.toFixed(1),x1:+b.x1.toFixed(1),z0:+b.z0.toFixed(1),z1:+b.z1.toFixed(1),y0:+b.y0.toFixed(1),y1:+b.y1.toFixed(1),bid:b.bid,wb:!!b.wb,str:!!b.str,kind:b.bid!=null&&S.BLD[b.bid]?S.BLD[b.bid].kind:null})),aiTank,vmove,sitPose,civSpawn,civHit,soldier,tankModel,hurt,say,tracer,rayWorld,los,tankStart,tankStep,fireMain,tankHit,tankMG,clock,rideSetup,rideStep,rideEnd,warScars,hitMan,recordDeath,nameMan,voiceStep,coverNear,cqbStep,casStep,casSide,bombStep,mine,mineInit,mineKey,vmove,vblocked,canField,famOf3,armsMarket,famOfGun,recoil,aimStep,pauseMenu,digTrench,cut,TR,collide,atgmMode,plosPoint,lockState,lockStep,wound,treat,treatDone,bodyStep,npcWound,npcStep,iwInit,radio,iwStep,VC,BLOC,pickModel,apsCheck,APSD,conditions,frontStep,counter,fallBack,buildCP,interact,doPan,panel,slotOf,bandCount,envFor,A3,arm3D,compLayout,locChoices,armorHit2,PL,tankModel,soldier,animMan,ENVS,tracer,AU,SND,GUNS,SIDES,ATT,ALLOW,HELM,VEST,EXTRA,makeGun,makeSide,armOf,kitSave,kitApply,kitsLoad,ugl,hurt,issued,armorHit,placeFpv,feedView,medevac,structHit,collapse,PEN,ARMT,startWorld,dig,offensive,arty,battleStep,ROLE,spawnDrone,K,PRI,LAU,ARM,INS,kitMenu,start,step:(dt,n)=>{for(let i=0;i<(n||1);i++)step(dt);},get S(){return S;},stop,end,shoot,grenade,land,v:377};
})();
