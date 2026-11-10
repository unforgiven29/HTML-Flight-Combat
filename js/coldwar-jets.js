/* =====================================================================================================================
   v229 — Cold War hangar, part 2: the aircraft. Needs game.js and coldwar.js.
   ===================================================================================================================== */
(function(){
'use strict';
const H=window.CW_HELP;if(!H){console.warn('[coldwar] helpers missing');return;}
const {clt,cdm,mkJet,fvMake}=H;
try{H.addAAMs();}catch(e){console.warn('[coldwar] AAMs',e);}
try{H.addAGs();}catch(e){console.warn('[coldwar] AG stores',e);}
const D=D2R,KM=1000;
const has=k=>!!(MSL[k]||AGW[k]||k==='TK'||k==='PTB');
const L=(...a)=>a.flat().filter(has);
// store groups
const US_IR_OLD=['AIM-9B','AIM-9D','AIM-9E','AIM-9G','AIM-9J','AIM-9P'],US_IR=[...US_IR_OLD,'AIM-9L','AIM-9M'];
const US_BOMB=['Mk-82','Mk-82AIR','Mk-83','Mk-84','Mk-20','CBU-87'],US_AGM=['AGM-65A','AGM-65B','AGM-65D','AGM-65E','AGM-65F'];
const SOV_BOMB=['FAB-250','FAB-500','OFAB-100','OFAB-250','OFAB-250Sh','FAB-500Sh','ZB-500'],SOV_RKT=['B-8M1','UB-32','UB-16','S-24B','S-25O','S-25OF','B-13L'];
const FR_AG=['SAMP 250','SAMP 400','Mk-82','Belouga','Matra F1'];
const ST=(o)=>{const r={};for(const k of Object.keys(o))r[k]=L(o[k]);return r;};
// release order: outboard pairs first, then inward
const relOf=st=>{const ks=Object.keys(st).filter(k=>!/[a-z]$/.test(k)||true);return ks.sort((a,b)=>Math.abs(st[b][0])-Math.abs(st[a][0])||st[a][0]-st[b][0]);};
const eyeOf=(cz,cy)=>[-cz+.15,cy+.2];
const NEW=[];
const DEF={cms:{cold:[30,30],modern:[30,30]}};

/* ---------------- registration ---------------- */
function addJet(s){try{
  const src=s.src,id=s.id;if(!AC[src]){console.warn('[coldwar] no source',src,'for',id);return;}
  const over=Object.assign({},s.ac);
  if(over.st){if(!over.rel)over.rel=relOf(over.st).map(k=>isNaN(+k)?k:+k);
    if(AC[src].cockpit==='fulcrum'||over.cockpit==='fulcrum')over.migRel=over.rel.map(String);else over.migRel=undefined;
    if(!over.keepJ)over.keepJ=[];}
  cloneType(src,id,over);
  const A=AC[id];
  if(s.crew){A.rio=true;A.wso=true;A.crew=2;A.crewName=s.crew;CREW[id]=s.crew;}
  else{A.rio=false;A.wso=false;delete A.crew;delete A.crewName;delete CREW[id];}
  if(!s.swing)delete A.swing;
  if(!A.ols)delete A.ols;
  // tables
  STN[id]=ST(s.stn);
  for(const era of['cold','modern'])LOAD[era][id]=validLoad(id,era,s.load[era]||s.load.cold);
  LOAD.guns[id]=s.load.guns||{};STRIKE_LOAD[id]=Object.assign({},s.load.strike||s.load.cold);
  for(const era of Object.keys(CMS))CMS[era][id]=(s.cms||DEF.cms)[era]||(s.cms||DEF.cms).cold;
  ENGN[id]=s.eng;IRSTN[id]=s.irstn||undefined;if(!s.irstn)delete IRSTN[id];
  CALLS[id]=s.call;NCTR_ID[id]=s.nctr;FOE[id]=s.foe;ACROLE[id]=s.role;RWR_OF[id]=s.rwr;
  if(s.ecm)ECM_FIT[id]=s.ecm;else delete ECM_FIT[id];
  if(s.stall)STALL[id]=s.stall;else delete STALL[id];
  FV[id]=fvMake(s.fv);
  if(s.side==='RED')RUS.add(id);else RUS.delete(id);
  if(s.ccip)NO_CCIP.delete(id);else NO_CCIP.add(id);
  if(s.dl)DL_FIT.add(id);else DL_FIT.delete(id);
  if(s.gci)GUIDJ.add(id);else if(!s.keepGci)GUIDJ.delete(id);
  for(const n of['HMS_ALWAYS','HMS_MODERN']){try{const S=eval(n);if(s.hms===n)S.add(id);else S.delete(id);}catch(e){}}
  try{if(s.cv){CV_AC.add(id);APP_KT[id]=s.app||135;}else CV_AC.delete(id);}catch(e){}
  if(s.flap)FLAPSW[id]=s.flap;
  try{delete RACKS[id];}catch(e){}
  if(s.noAB)A.noAB=true;
  if(s.vstol)A.vstol=s.vstol;
  A.cwSrc=src;A.cwPit=s.pitNote||'';
  NEW.push(s);
}catch(e){console.warn('[coldwar] '+s.id,e);}}

/* ======================================================================================================================
   BLUE
   ====================================================================================================================== */

// ---------- A-4E Skyhawk (NATOPS A-4E/F/G) ----------
// J52-P-6A 8,500 lbf (37.8 kN), no afterburner; empty 4,469 kg, 800 US gal internal (~2,420 kg JP-5), 24.15 m² delta wing with automatic slats,
// two Mk 12 20 mm with 200 rds each, AN/APG-53A terrain-clearance / ranging radar, 5 stations (centreline 3,500 lb, inboard 2,200 lb, outboard 1,000 lb).
const A4ST={1:[-3.05,-.62,1.0],2:[-1.75,-.66,.5],C:[0,-.98,.2],4:[1.75,-.66,.5],5:[3.05,-.62,1.0]};
function makeA4(){return mkJet({c:0xc9ccc8,dk:0x8f9590,lt:0xdcdfdb,rad:0x2f3437,st:A4ST,wy:()=>-.42,
  body:[[-6.1,.02,.05,.02,2],[-5.4,.2,.06,.22,2],[-4.6,.36,.08,.4,2.1],[-3.6,.48,.16,.56,2.3],[-2.2,.56,.18,.66,2.6],[0,.58,.12,.64,2.6],[2.4,.52,.1,.58,2.4],[4.6,.42,.08,.46,2.2],[6.0,.36,.08,.38,2]],
  radome:[[-6.1,.02,.05,.02,2],[-5.4,.2,.06,.22,2],[-4.95,.3,.07,.32,2.05]],
  intakes:[{x:.66,y:.02,z:-2.75,w:.22,h:.38,duct:[[-2.8,.2,.02,.36,4],[-1.2,.22,.02,.36,3.5],[.8,.12,.02,.24,2.5]]}],
  spine:[[-3.0,.04,.6,.04,2],[-2.0,.24,.72,.16,2.2],[1.5,.2,.66,.12,2],[3.5,.06,.55,.05,2]],
  wing:{pts:[[.45,-1.55],[4.19,1.25],[4.19,2.2],[.45,2.95]],y:-.38,th:.13,dih:-.03,nav:[4.1,1.8],fence:[]},
  tail:{pts:[[0,3.95],[1.75,5.0],[1.75,5.55],[0,5.75]],y:.95,th:.06},
  fins:[{pts:[[2.2,.55],[4.55,2.55],[5.5,2.6],[6.1,.55]],th:.11}],
  nozzles:[[0,.08,5.95,.38,.33,.6]],
  canopy:[[.38,.42,1.25,.58,-3.5,0x5a7488]],
  extra:(g,M)=>{rod(g,[.32,.15,-3.8],[.42,.1,-6.6],.05,M.met,1);}// fixed refuelling probe, right side
});}

// ---------- A-7D Corsair II (T.O. 1A-7D-1, 1972) ----------
// TF41-A-1 (Spey) 14,500 lbf (64.5 kN), no afterburner; empty 8,668 kg, 9,263 lb (4,200 kg) internal, 34.84 m², M61A1 with 1,000 rds,
// AN/APQ-126 forward-looking radar (ground map, terrain following, air ranging), AN/AVQ-7 HUD with continuously computed impact point (the first CCIP),
// eight stations: 1-3 / 6-8 under the wings, 4 / 5 fuselage Sidewinder rails.
const A7ST={1:[-4.4,-.5,.9],2:[-3.3,-.52,.7],3:[-2.2,-.55,.5],4:[-.85,-.55,-2.2],5:[.85,-.55,-2.2],6:[2.2,-.55,.5],7:[3.3,-.52,.7],8:[4.4,-.5,.9]};
function makeA7(){return mkJet({c:0x8c968f,dk:0x5f6862,lt:0xb2bab4,rad:0x3c4246,st:A7ST,wy:()=>.0,tipX:0,
  body:[[-6.9,.3,-.18,.22,2],[-6.3,.58,-.12,.5,3.2],[-5.2,.72,-.02,.66,3.4],[-3.5,.78,.08,.78,3.2],[-1,.8,.1,.8,3],[1.5,.74,.1,.74,2.8],[4,.58,.1,.58,2.4],[6.3,.42,.12,.42,2.1],[7.0,.38,.12,.38,2]],
  noseOpen:true,noseInt:{z:-6.85,r:.5,y:-.25,sx:1.25,sy:.55},
  radome:[[-7.15,.02,.32,.02,2],[-6.85,.26,.3,.22,2],[-6.5,.42,.3,.32,2.2]],
  wing:{pts:[[.7,-1.5],[5.4,1.6],[5.4,2.6],[.7,2.75]],y:.62,th:.13,dih:-.09,nav:[5.3,2.1]},
  tail:{pts:[[.3,4.6],[2.75,6.0],[2.75,6.75],[.3,6.95]],y:.15,th:.07,dih:-.07},
  fins:[{pts:[[2.6,.75],[5.4,3.55],[6.6,3.6],[7.1,.75]],th:.12}],
  nozzles:[[0,.12,7.05,.42,.36,.5]],
  canopy:[[.44,.48,1.5,.85,-4.4,0x5a7488]],
  extra:(g,M)=>{rod(g,[0,-.82,-1.2],[0,-.85,1.6],.25,M.dk,.18,[1,0,0]);}
});}

// ---------- AV-8B Harrier II Night Attack (A1-AV8BB-NFM-000) ----------
// F402-RR-408 (Pegasus 11-61) 23,400 lbf (104 kN), no reheat, four rotating nozzles; empty 6,340 kg, 3,519 kg internal, 22.6 m² supercritical wing,
// GAU-12/U 25 mm (300 rds) in the twin under-fuselage pods, no radar (ARBS angle-rate bombing set with TV / laser spot tracker, NAVFLIR), seven stations.
const AV8ST={1:[-3.95,-.32,1.0],2:[-3.0,-.4,.65],3:[-1.95,-.48,.35],C:[0,-1.05,.2],5:[1.95,-.48,.35],6:[3.0,-.4,.65],7:[3.95,-.32,1.0]};
function makeAV8(){return mkJet({c:0x6f7778,dk:0x4e5556,lt:0x8b9394,rad:0x5e6668,st:AV8ST,wy:x=>.42-Math.abs(x)*.12,tipX:3.8,
  body:[[-6.9,.02,.15,.02,2],[-6.3,.22,.12,.24,2],[-5.4,.4,.15,.44,2.2],[-4.2,.52,.25,.62,2.4],[-2.6,.78,.15,.78,2.8],[-.5,.86,.05,.8,3],[2,.72,.1,.7,2.8],[4.2,.48,.25,.5,2.4],[6.4,.26,.45,.3,2.1],[7.3,.1,.55,.1,2]],
  intakes:[{x:.82,y:.18,z:-3.6,w:.42,h:.55,duct:[[-3.6,.42,.18,.56,2.4],[-2,.45,.12,.62,2.4],[0,.35,.05,.55,2.2]]}],
  wing:{pts:[[.5,-1.1],[4.55,1.15],[4.65,1.85],[.5,2.4]],y:.82,th:.14,dih:-.2,nav:[4.55,1.5]},
  tail:{pts:[[.15,5.3],[2.15,6.6],[2.15,7.15],[.15,7.25]],y:.5,th:.06,dih:-.2},
  fins:[{pts:[[3.9,.6],[6.3,2.55],[7.15,2.55],[7.45,.6]],th:.1}],
  ventral:[{pts:[[5.3,-.3],[6.3,-.75],[7.0,-.75],[7.1,-.3]],th:.05}],
  canopy:[[.42,.5,1.6,.68,-4.6,0x5a7488]],
  extra:(g,M)=>{// four swivelling nozzles, gun / strake pods, outrigger gear fairings at the wingtips
    for(const sd of[-1,1]){for(const z of[-1.2,1.0]){const n=new THREE.Mesh(new THREE.CylinderGeometry(.28,.32,.62,18,1,true),M.met);n.position.set(sd*.95,-.35,z);g.add(n);
      rim(g,.3,.04,M.dk,sd*.95,-.66,z,1,1);}
      pod(g,2.9,.2,M.dk,sd*.42,-.86,.6,1,1,14);pod(g,.9,.09,M.dk,sd*4.0,.2,1.45,1,1,10);}}
});}

// ---------- Dassault-Breguet / Dornier Alpha Jet E (flight manual) ----------
// Two Larzac 04-C6 (13.24 kN each), no reheat; empty 3,515 kg, 1,520 kg internal (1,900 l), 17.5 m², 7.5 g, DEFA 553 30 mm pod (150 rds) on the centreline,
// four wing pylons (Magic 1, bombs, Matra rocket pods, 310 l tanks). No radar.
const AJST={1:[-3.1,-.55,.7],2:[-1.9,-.52,.45],C:[0,-1.0,.0],4:[1.9,-.52,.45],5:[3.1,-.55,.7]};
function makeAlphaJet(){return mkJet({c:0xb8bcae,dk:0x7f8576,lt:0xd2d6c8,rad:0x3a3e3a,st:AJST,wy:()=>-.3,
  body:[[-6.2,.02,-.15,.02,2],[-5.6,.22,-.12,.22,2],[-4.6,.42,-.02,.44,2.2],[-3,.56,.15,.68,2.4],[-1,.62,.1,.7,2.6],[1.5,.58,.05,.6,2.5],[4,.4,.12,.42,2.2],[5.9,.22,.22,.25,2]],
  intakes:[{x:.7,y:.15,z:-1.6,w:.24,h:.32,duct:[[-1.6,.24,.15,.32,2.4],[1.5,.24,.0,.3,2.2],[3.4,.22,-.05,.24,2]]}],
  wing:{pts:[[.5,-.9],[4.55,.9],[4.55,1.6],[.5,2.2]],y:.62,th:.11,dih:-.11,nav:[4.5,1.3]},
  tail:{pts:[[.2,4.0],[2.2,5.05],[2.2,5.55],[.2,5.8]],y:.25,th:.06,dih:-.1},
  fins:[{pts:[[2.4,.55],[4.8,2.75],[5.75,2.75],[6.1,.55]],th:.1}],
  nozzles:[[-.72,-.02,3.35,.24,.2,.5],[.72,-.02,3.35,.24,.2,.5]],
  canopy:[[.4,.48,1.0,.7,-3.6,0x5a7488],[.4,.55,1.0,.8,-2.25,0x5a7488]]
});}

// ---------- Dassault Super Étendard (Aéronavale) ----------
// SNECMA Atar 8K-50 49 kN, no reheat; empty 6,500 kg, 3,270 kg internal, 28.4 m², 6.5 g, two DEFA 552 30 mm (125 rds each),
// Agave multi-mode radar (air search ~28 km on a fighter, sea search for the Exocet), AM39 Exocet on the right inboard pylon, Magic on the outboards.
const SEST={1:[-3.45,-.6,.95],2:[-2.15,-.62,.5],C:[0,-.98,.3],4:[2.15,-.62,.5],5:[3.45,-.6,.95]};
function makeSEM(){return mkJet({c:0x8a9497,dk:0x5f686b,lt:0xaab3b6,rad:0x3a4044,st:SEST,wy:()=>-.32,
  body:[[-7.2,.02,.0,.02,2],[-6.6,.2,.02,.22,2],[-5.6,.42,.08,.44,2.1],[-4.2,.56,.2,.62,2.3],[-2.2,.66,.15,.7,2.6],[0,.68,.1,.7,2.6],[3,.6,.1,.62,2.4],[5.6,.45,.1,.45,2.2],[7.1,.4,.1,.4,2]],
  radome:[[-7.2,.02,.0,.02,2],[-6.6,.2,.02,.22,2],[-6.05,.33,.05,.35,2.05]],
  intakes:[{x:.72,y:.08,z:-3.0,w:.26,h:.42,duct:[[-3.0,.24,.08,.42,3],[-.8,.26,.05,.42,2.6],[1.6,.12,.05,.28,2.2]]}],
  wing:{pts:[[.6,-1.4],[4.8,1.65],[4.8,2.6],[.6,2.6]],y:-.18,th:.12,dih:-.06,nav:[4.75,2.1]},
  tail:{pts:[[.3,5.15],[2.6,6.55],[2.6,7.1],[.3,7.2]],y:.65,th:.06},
  fins:[{pts:[[2.8,.62],[5.7,3.0],[6.8,3.05],[7.2,.62]],th:.11}],
  nozzles:[[0,.08,7.15,.44,.4,.6]],
  canopy:[[.4,.45,1.35,.68,-4.3,0x5a7488]]
});}

// ---------- North American F-100A Super Sabre (Flight Manual USAF Series F-100A) ----------
// J57-P-39 10,200 / 16,000 lbf (45.4 / 71.2 kN), empty 8,250 kg, 744 US gal (2,250 kg), 35.8 m² wing swept 45°, four M39 20 mm (200 rds each),
// A-4 gunsight with AN/APG-30 ranging radar. Pylons for 275 gal tanks and, on the ROCAF jets, AIM-9B Sidewinders.
const F100ST={1:[-4.35,-.42,1.4],2:[-2.9,-.45,.7],3:[-1.6,-.5,.2],4:[1.6,-.5,.2],5:[2.9,-.45,.7],6:[4.35,-.42,1.4]};
function makeF100(){return mkJet({c:0xc3c7c9,dk:0x8a9093,lt:0xd8dcde,rad:0x343a3e,st:F100ST,wy:()=>-.25,
  body:[[-7.4,.6,.02,.42,2.2],[-6.5,.66,.04,.6,2.3],[-4.8,.72,.1,.74,2.3],[-2.4,.76,.1,.78,2.3],[0,.78,.06,.78,2.3],[3,.72,.06,.72,2.2],[5.6,.6,.06,.6,2.1],[7.3,.52,.06,.52,2]],
  noseOpen:true,noseInt:{z:-7.4,r:.58,y:.02,sx:1.05,sy:.72},probe:[-6.8,-8.6,-.55],
  wing:{pts:[[.6,-2.6],[5.9,2.75],[5.9,3.95],[.6,2.6]],y:-.22,th:.12,dih:0,nav:[5.85,3.3]},
  tail:{pts:[[.4,5.35],[2.75,7.0],[2.75,7.6],[.4,7.75]],y:-.25,th:.07},
  fins:[{pts:[[2.0,.6],[5.0,3.3],[6.4,3.35],[7.3,.6]],th:.13}],
  nozzles:[[0,.06,7.6,.5,.44,.7]],ab:4.5,
  canopy:[[.42,.46,1.4,.66,-3.6,0x5a7488]],
  extra:(g,M)=>{g.add(new THREE.Mesh(sloft([[-2.4,.04,.72,.05,2],[-1.2,.28,.8,.16,2],[4,.24,.72,.12,2],[6.2,.05,.66,.05,2]],16),M.lt));}
});}

// ---------- Lockheed / Aeritalia F-104S Starfighter ----------
// J79-GE-19 52.8 / 79.6 kN, empty 6,760 kg, 2,700 kg internal, 18.2 m² thin straight wing (anhedral), APC stick shaker / pusher near the pitch-up AoA,
// FIAR R21G/M1 Setter radar (~40 km), Aspide or AIM-7 on the underwing pylons, AIM-9 on the tips and belly, M61A1 (ASA version) 725 rds.
const F104ST={1:[-3.35,-.15,1.2],2:[-2.4,-.62,1.0],3:[-1.45,-.55,.9],4:[-.55,-.98,-.6],C:[0,-1.12,.6],6:[.55,-.98,-.6],7:[1.45,-.55,.9],8:[2.4,-.62,1.0],9:[3.35,-.15,1.2]};
function makeF104(){return mkJet({c:0x9aa29e,dk:0x6a726e,lt:0xb8c0bc,rad:0x2f3536,st:F104ST,wy:x=>-.3-Math.abs(x)*.17,tipX:3.3,
  body:[[-8.6,.02,.05,.02,2],[-7.8,.22,.06,.22,2],[-6.6,.42,.1,.44,2],[-5.0,.56,.18,.6,2.1],[-3,.62,.18,.66,2.2],[0,.66,.12,.68,2.2],[3,.62,.12,.62,2.1],[6,.55,.15,.55,2],[7.9,.5,.15,.5,2]],
  radome:[[-8.6,.02,.05,.02,2],[-7.8,.22,.06,.22,2],[-7.0,.36,.08,.36,2]],probe:[-8.6,-9.6,.05],
  intakes:[{x:.62,y:.05,z:-2.3,w:.22,h:.42,duct:[[-2.3,.25,.05,.42,2.2],[0,.25,.05,.4,2.1],[2,.12,.05,.25,2]],split:[[-2.8,-.45],[-2.8,.45],[-2,.4],[-2,-.4]]}],
  wing:{pts:[[.6,.0],[3.35,.95],[3.35,1.75],[.6,2.4]],y:-.25,th:.06,dih:-.17},
  tail:{pts:[[0,6.4],[1.8,7.25],[1.8,7.75],[0,7.85]],y:3.3,th:.06},
  fins:[{pts:[[3.6,.6],[6.0,3.3],[7.4,3.3],[7.8,.6]],th:.08}],
  ventral:[{pts:[[4.2,-.45],[5.0,-.85],[6.2,-.85],[6.4,-.45]],th:.04}],
  nozzles:[[0,.15,8.2,.52,.46,.8]],ab:5,
  canopy:[[.38,.42,1.45,.66,-4.6,0x5a7488]]
});}

// ---------- Convair F-106A Delta Dart (T.O. 1F-106A-1) ----------
// J75-P-17 17,200 / 24,500 lbf (76.5 / 109 kN), empty 11,077 kg, 1,514 US gal (4,580 kg), 64.8 m² conical-camber delta, Hughes MA-1 fire-control
// (radar ~35 NM on a fighter, IR search set ahead of the windscreen, SAGE datalink), internal bay with two AIM-4F and two AIM-4G (AIR-2A not modelled),
// M61A1 'Six Shooter' (650 rds) in the late jets, two 360 gal supersonic tanks.
const F106ST={1:[-.45,-1.0,-1.6],2:[.45,-1.0,-1.6],3:[-.45,-1.0,.6],4:[.45,-1.0,.6],5:[-2.6,-.88,1.6],6:[2.6,-.88,1.6]};
function makeF106(){return mkJet({c:0xb9bec2,dk:0x7c8286,lt:0xd3d7da,rad:0x2c3134,st:F106ST,wy:()=>-.7,
  body:[[-10.2,.02,.1,.02,2],[-9.2,.28,.12,.3,2],[-7.8,.5,.15,.52,2.1],[-6,.7,.2,.74,2.3],[-3.5,.92,.05,.86,2.6],[0,1.0,0,.92,2.7],[3.5,.92,.02,.84,2.5],[7,.7,.05,.7,2.2],[9.6,.6,.05,.6,2]],
  radome:[[-10.2,.02,.1,.02,2],[-9.2,.28,.12,.3,2],[-8.5,.4,.13,.42,2]],probe:[-10.2,-11.4,.1],
  intakes:[{x:.98,y:.15,z:-4.6,w:.3,h:.62,duct:[[-4.6,.3,.15,.62,3.2],[-1,.3,.05,.6,3],[2.5,.12,.05,.3,2.2]]}],
  wing:{pts:[[.9,-3.2],[5.84,4.6],[5.84,5.4],[.9,8.1]],y:-.45,th:.13,dih:0,nav:[5.8,5.0]},
  fins:[{pts:[[3.6,.85],[8.3,4.7],[9.6,4.75],[9.9,.85]],th:.14}],
  nozzles:[[0,.05,9.75,.6,.54,.8]],ab:5.5,
  canopy:[[.45,.5,1.6,.88,-6.2,0x5a7488]],
  extra:(g,M)=>{ball(g,.12,SKIN(0x2a3438,90),0,.55,-7.9,1,.8,1.6);}// IR search set
});}

// ---------- General Dynamics F-111F (Flight Manual USAF Series F-111F) ----------
// TF30-P-100 25,100 lbf reheat (2× 111.7 kN; ~2× 62.3 kN dry), empty 21,537 kg, 32,493 lb internal (14,700 kg), wing 16° / 72.5° (manual handle),
// AN/APQ-144 attack radar + APQ-146 TFR (no air-to-air search), AN/AVQ-26 Pave Tack in the bay, GBU-10 / -12 / -24, Mk 82 / 84, AIM-9P on the
// pivot pylons, crew of two side by side (WSO on the right runs radar and Pave Tack).
const F111ST={2:[-3.6,-.25,.1],3:[-2.7,-.28,-.1],4:[-1.8,-.3,-.3],C:[0,-1.05,1.5],6:[1.8,-.3,-.3],7:[2.7,-.28,-.1],8:[3.6,-.25,.1]};
function makeF111(){return mkJet({c:0x6f7860,dk:0x50574a,lt:0x8a947a,rad:0x2c3330,st:F111ST,wy:()=>.0,
  body:[[-11.0,.02,.15,.02,2],[-10.2,.36,.15,.36,2],[-9.0,.72,.2,.66,2.3],[-7.4,.98,.3,.82,2.6],[-5.4,1.06,.25,.86,3],[-2,1.25,.1,.9,3.4],[2,1.3,.05,.88,3.4],[5.5,1.1,.05,.8,3],[8.2,.98,.05,.68,2.6],[9.6,.95,.05,.6,2.4]],
  radome:[[-11.0,.02,.15,.02,2],[-10.2,.36,.15,.36,2],[-9.4,.6,.18,.58,2.1]],
  intakes:[{x:1.35,y:-.15,z:-2.4,w:.3,h:.55,round:true}],
  glove:{pts:[[.9,-3.4],[2.9,-.2],[2.9,1.6],[.9,2.6]],y:.42,th:.16},
  swing:{base:16,piv:[2.6,.42,.4],pts:[[0,-.95],[7.0,.55],[7.0,1.55],[0,2.15]],th:.13,nav:[6.95,1.0]},
  tail:{pts:[[.9,6.4],[4.3,8.2],[4.3,9.0],[.9,9.6]],y:.0,th:.08},
  fins:[{pts:[[3.4,.85],[7.6,5.15],[9.2,5.2],[9.7,.85]],th:.14}],
  ventral:[{pts:[[6.5,-.6],[7.3,-1.3],[8.6,-1.3],[8.9,-.6]],x:.65,th:.05,cant:.25}],
  nozzles:[[-.66,.0,9.9,.52,.46,.8],[.66,.0,9.9,.52,.46,.8]],ab:5,
  canopy:[[.95,.5,1.5,.86,-6.8,0x5a7488]]
});}

// ---------- Northrop F-20A Tigershark (utility flight manual) ----------
// F404-GE-100 17,000 lbf reheat (75.6 kN; 48.9 kN dry), empty 5,090 kg, 2,005 kg internal, 17.28 m², 9 g, GE APG-67(V) multimode pulse-doppler
// (~30 NM look-up, look-down), HUD + two displays, two M39A2 20 mm (280 rds each), AIM-9L on the tips, AIM-7F on the inboards (as offered).
const F5ST={1:[-4.07,-.08,.9],2:[-3.0,-.42,.75],3:[-1.75,-.45,.4],C:[0,-.82,.2],5:[1.75,-.45,.4],6:[3.0,-.42,.75],7:[4.07,-.08,.9]};
function f5Body(f20){return{
  body:[[-7.2,.02,.0,.02,2],[-6.4,f20?.36:.24,.02,f20?.2:.24,2],[-5.4,f20?.5:.38,.06,.4,2.1],[-4.2,.56,.15,.58,2.3],[-2.6,.66,.1,.62,2.6],[0,.8,.05,.6,3],[2.8,.82,.05,.58,3],[5.2,.75,.05,.52,2.8],[6.9,.72,.05,.48,2.6]],
  radome:[[-7.2,.02,.0,.02,2],[-6.4,f20?.36:.24,.02,f20?.2:.24,2],[-5.8,f20?.46:.32,.04,f20?.32:.32,2.1]],
  intakes:[{x:.78,y:.0,z:-2.4,w:.22,h:.4,duct:[[-2.4,.24,.0,.4,3],[0,.24,.0,.4,2.6],[2.4,.1,.0,.2,2]]}],
  wing:{pts:[[.6,-.95],[4.07,.55],[4.07,1.4],[.6,2.25]],y:-.22,th:.08,dih:0},
  tail:{pts:[[.5,5.15],[2.3,6.4],[2.3,6.95],[.5,7.05]],y:.15,th:.06},
  fins:[{pts:[[3.0,.55],[5.6,f20?2.65:2.75],[6.6,f20?2.65:2.75],[7.0,.55]],th:.1}],
  nozzles:f20?[[0,.05,7.0,.52,.46,.6]]:[[-.38,.05,6.95,.33,.3,.55],[.38,.05,6.95,.33,.3,.55]],ab:4,
  canopy:[[.36,.42,1.25,.58,-4.0,0x5a7488]],st:F5ST,wy:()=>-.3,tipX:4.0};}
function makeF20(){return mkJet(Object.assign(f5Body(true),{c:0x8f9aa3,dk:0x66717a,lt:0xadb7bf,rad:0x3a4146}));}
// ---------- Northrop F-5E Tiger II (flight manual) ----------
// Two J85-GE-21B 3,500 / 5,000 lbf (2× 15.5 / 22.2 kN), empty 4,349 kg, 2,050 kg internal, 17.28 m², 7.33 g, Emerson AN/APQ-159 (APQ-153 class, ~10-15 NM
// ranging / search, no look-down), two M39A2 20 mm (280 rds), AIM-9 on the tips, five pylons.
function makeF5(){return mkJet(Object.assign(f5Body(false),{c:0x8e8a72,dk:0x67624f,lt:0xaaa58c,rad:0x3a3a33}));}

// ---------- North American F-86F Sabre (Flight Manual USAF Series F-86F) ----------
// J47-GE-27 5,910 lbf (26.3 kN), no reheat, empty 5,045 kg, 437 US gal (1,320 kg) internal, '6-3' hard leading-edge wing 29.1 m², six M3 .50 (300 rds each),
// A-4 gunsight + AN/APG-30 ranging radar, inboard / outboard pylons for 120 / 200 gal tanks, bombs, and (ROCAF 1958) AIM-9B.
const F86ST={1:[-3.2,-.42,.75],2:[-1.9,-.45,.35],3:[1.9,-.45,.35],4:[3.2,-.42,.75]};
function makeF86(){return mkJet({c:0xc6cacc,dk:0x8d9396,lt:0xdadee0,rad:0x2f3437,st:F86ST,wy:()=>-.32,
  body:[[-5.6,.55,.0,.5,2],[-4.8,.64,.02,.66,2],[-3.4,.7,.06,.78,2.05],[-1.6,.72,.06,.8,2.1],[.5,.7,.04,.76,2.1],[2.6,.58,.04,.62,2],[4.6,.42,.08,.44,2],[5.7,.35,.1,.36,2]],
  noseOpen:true,noseInt:{z:-5.6,r:.52,y:.0,sx:1,sy:.92},
  wing:{pts:[[.6,-1.05],[5.65,2.0],[5.65,3.0],[.6,1.95]],y:-.4,th:.12,dih:.06,nav:[5.6,2.5],fence:[]},
  tail:{pts:[[.3,3.7],[2.35,4.85],[2.35,5.4],[.3,5.65]],y:.45,th:.06,dih:.18},
  fins:[{pts:[[2.4,.6],[4.5,2.85],[5.35,2.85],[5.7,.6]],th:.1}],
  nozzles:[[0,.1,5.75,.38,.34,.4]],
  canopy:[[.4,.44,1.35,.62,-2.3,0x5a7488]]
});}

// ---------- Vought F-8E Crusader (supplemental NATOPS F-8D / F-8E) ----------
// J57-P-20A 10,700 / 18,000 lbf (47.6 / 80.1 kN), empty 9,040 kg, 1,348 US gal (4,100 kg), 34.8 m² variable-incidence wing, four Colt Mk 12 20 mm (144 rds each),
// AN/APQ-94 search / track radar (~15 NM), four AIM-9D on the fuselage Y-rails, two wing pylons (Mk 82 / Mk 84 / Zuni) on the E.
const F8ST={1:[-.92,-.15,-.9],2:[-.92,-.55,-.9],3:[.92,-.15,-.9],4:[.92,-.55,-.9],5:[-3.0,.85,.55],6:[3.0,.85,.55]};
function makeF8(){return mkJet({c:0xbfc3c4,dk:0x868c8e,lt:0xd6dadb,rad:0x2c3134,st:F8ST,wy:()=>1.12,
  body:[[-8.1,.02,.1,.02,2],[-7.3,.32,.12,.32,2],[-6.3,.6,.0,.6,2.2],[-5.0,.76,-.08,.78,2.6],[-2.5,.82,.0,.86,2.6],[0,.84,.05,.84,2.6],[3,.76,.08,.76,2.4],[6,.6,.12,.6,2.2],[8.2,.5,.15,.5,2]],
  radome:[[-8.1,.02,.1,.02,2],[-7.3,.32,.12,.32,2],[-6.8,.46,.12,.46,2]],
  intakes:[{one:true,x:0,y:-.6,z:-6.55,w:.72,h:.38}],
  wing:{pts:[[.7,-2.0],[5.45,1.8],[5.45,2.9],[.7,2.4]],y:1.0,th:.12,dih:-.09,nav:[5.4,2.3]},
  tail:{pts:[[.5,5.6],[2.95,7.2],[2.95,7.8],[.5,8.0]],y:-.15,th:.07},
  fins:[{pts:[[2.6,.75],[6.2,3.85],[7.6,3.9],[8.1,.75]],th:.12}],
  ventral:[{pts:[[6.3,-.45],[6.9,-.95],[7.9,-.95],[8.1,-.45]],x:.45,th:.05,cant:.3}],
  nozzles:[[0,.15,8.35,.5,.44,.7]],ab:4.5,
  canopy:[[.4,.46,1.4,.8,-5.0,0x5a7488]]
});}

// ---------- Saab J 35F Draken ----------
// RM6C (Avon 300) 56.9 / 77.5 kN, empty 7,425 kg, 3,250 kg internal, 49.2 m² double delta, ~'super-stall' past ~25° AoA, PS-01/A radar (~30 km),
// Hughes S71N IR sensor under the nose (J 35F-2), S7B sight, one ADEN M/55 30 mm (90 rds), Rb 27 / Rb 28 Falcons and Rb 24 Sidewinders, STRIL datalink.
const J35ST={1:[-3.6,-.45,1.9],2:[-2.4,-.42,1.4],3:[-.55,-.82,.0],4:[.55,-.82,.0],5:[2.4,-.42,1.4],6:[3.6,-.45,1.9]};
function makeJ35(){return mkJet({c:0x7f8a74,dk:0x5c6553,lt:0x9aa58e,rad:0x2e3430,st:J35ST,wy:()=>-.22,
  body:[[-7.4,.02,.0,.02,2],[-6.6,.24,.02,.26,2],[-5.4,.46,.08,.48,2.1],[-3.8,.6,.12,.62,2.2],[-1,.7,.06,.66,2.4],[2.5,.72,.05,.66,2.4],[5.6,.6,.08,.6,2.2],[7.5,.5,.1,.5,2]],
  radome:[[-7.4,.02,.0,.02,2],[-6.6,.24,.02,.26,2],[-6.0,.36,.05,.38,2]],
  intakes:[{x:.72,y:-.02,z:-3.8,w:.2,h:.38,round:false}],
  wing:{pts:[[.65,-4.2],[1.9,-.6],[4.7,3.6],[4.7,4.6],[.65,6.6]],y:-.18,th:.12,dih:0,nav:[4.65,4.1]},
  fins:[{pts:[[3.9,.6],[6.5,3.2],[7.4,3.2],[7.7,.6]],th:.12}],
  nozzles:[[0,.1,7.55,.5,.44,.6]],ab:5,
  canopy:[[.36,.42,1.4,.58,-4.4,0x5a7488]],
  extra:(g)=>{ball(g,.1,SKIN(0x2a3438,90),0,-.38,-5.6,1,.8,1.6);}
});}

// ---------- Saab AJS 37 Viggen (SFI del 1, DCS manual) ----------
// RM8A 65.6 / 115.6 kN with thrust reverser, empty 11,800 kg, 5,640 l (4,500 kg), 46 m² delta + flapped canards, 7 g, PS-37/A radar (ground mapping,
// air ranging, ~25 km air search), no gun, Rb 74 / Rb 24J for self defence, Rb 75 TV Maverick, Rb 04E / Rb 15F anti-ship, m/71 bombs, ARAK rockets.
const VIGST={1:[-3.5,-.48,2.4],2:[-2.4,-.45,1.5],3:[-.8,-.95,.2],C:[0,-1.0,1.4],5:[.8,-.95,.2],6:[2.4,-.45,1.5],7:[3.5,-.48,2.4]};
function makeAJS37(){return mkJet({c:0x6d7259,dk:0x4c513e,lt:0x8a8f74,rad:0x2c3129,st:VIGST,wy:()=>-.2,
  body:[[-8.4,.02,.1,.02,2],[-7.6,.28,.1,.3,2],[-6.4,.52,.15,.56,2.1],[-4.6,.68,.2,.72,2.3],[-2,.82,.1,.82,2.6],[1.5,.84,.05,.8,2.6],[5,.72,.05,.7,2.3],[7.6,.6,.05,.6,2.1]],
  radome:[[-8.4,.02,.1,.02,2],[-7.6,.28,.1,.3,2],[-7.0,.42,.12,.44,2]],
  intakes:[{x:.92,y:.12,z:-3.8,w:.24,h:.5,duct:[[-3.8,.26,.12,.5,3],[-1,.3,.08,.55,2.8],[1.5,.12,.05,.3,2]]}],
  canard:{pts:[[.85,-4.0],[2.95,-2.3],[2.95,-1.6],[.85,-1.25]],y:.42,th:.07},
  wing:{pts:[[.85,-.4],[2.4,1.3],[5.3,3.6],[5.3,4.6],[.85,6.6]],y:-.1,th:.12,dih:-.05,nav:[5.25,4.1]},
  fins:[{pts:[[2.6,.8],[6.3,4.4],[7.5,4.4],[7.8,.8]],th:.12}],
  nozzles:[[0,.05,7.75,.58,.52,.6]],ab:5.5,
  canopy:[[.4,.46,1.5,.78,-4.9,0x5a7488]]
});}

// ---------- AMX International AMX (A-11 Ghibli) (AMX-1 flight manual) ----------
// Rolls-Royce Spey 807 49.1 kN, no reheat, empty 6,700 kg, 2,790 kg internal, 21 m², 7.33 g, fly-by-wire spoilers / rudder / elevators with mechanical back-up,
// Elta EL/M-2001B ranging radar, HUD + MFD, one M61A1 (350 rds, Italian jets), AIM-9L on the tips, five under-wing/fuselage stations.
const AMXST={1:[-4.45,-.08,.9],2:[-3.2,-.45,.65],3:[-1.95,-.48,.35],C:[0,-.96,.1],5:[1.95,-.48,.35],6:[3.2,-.45,.65],7:[4.45,-.08,.9]};
function makeAMX(){return mkJet({c:0x777f78,dk:0x555c56,lt:0x949c95,rad:0x3a3f3b,st:AMXST,wy:()=>.25,tipX:4.4,
  body:[[-6.6,.02,.0,.02,2],[-6.0,.22,.02,.22,2],[-5.0,.44,.06,.46,2.1],[-3.6,.6,.16,.68,2.4],[-1.5,.7,.1,.72,2.6],[1.5,.68,.08,.66,2.6],[4,.55,.1,.52,2.4],[6.4,.38,.14,.38,2.1]],
  radome:[[-6.6,.02,.0,.02,2],[-6.0,.22,.02,.22,2],[-5.4,.36,.04,.36,2]],
  intakes:[{x:.78,y:.18,z:-2.5,w:.22,h:.42,duct:[[-2.5,.24,.18,.42,3],[0,.26,.1,.44,2.6],[2.5,.12,.05,.24,2]]}],
  wing:{pts:[[.6,-.8],[4.43,1.2],[4.43,1.9],[.6,2.4]],y:.55,th:.11,dih:-.08},
  tail:{pts:[[.3,4.4],[2.4,5.6],[2.4,6.15],[.3,6.35]],y:.35,th:.06,dih:-.08},
  fins:[{pts:[[2.4,.6],[5.3,2.95],[6.3,2.95],[6.6,.6]],th:.1}],
  nozzles:[[0,.12,6.55,.38,.34,.5]],
  canopy:[[.38,.44,1.25,.7,-3.9,0x5a7488]]
});}

// ---------- English Electric Lightning F.6 ----------
// Two Avon 301R stacked (56.5 / 72.7 kN each), empty 12,700 kg, ~4,900 kg internal incl. the ventral pack, overwing 260 gal ferry tanks, 43 m² 60° swept wing,
// AI.23B Airpass radar (~25 NM on a bomber, ~15 NM fighter), two ADEN 30 mm (120 rds each) in the front of the ventral pack, Red Top / Firestreak on the forward fuselage.
const LTST={1:[-.75,-.25,-3.4],2:[.75,-.25,-3.4],3:[-3.2,.35,1.6],4:[3.2,.35,1.6]};
function makeLightning(){return mkJet({c:0xc4c8ca,dk:0x8b9193,lt:0xd9dddf,rad:0x2c3134,st:LTST,wy:()=>.0,
  body:[[-8.1,.62,.0,.7,2],[-7.2,.7,.02,.84,2.1],[-5.4,.74,.08,.96,2.2],[-2.6,.76,.06,1.0,2.3],[0,.76,.0,1.02,2.3],[3,.72,-.05,.96,2.3],[5.8,.62,.0,.82,2.2],[7.9,.56,.0,.78,2.1]],
  noseOpen:true,noseInt:{z:-8.1,r:.6,y:.0,sx:1,sy:1.1,cone:.36,coneL:1.4},
  wing:{pts:[[.7,-1.6],[5.3,3.4],[5.3,4.4],[2.4,4.2],[.7,4.3]],y:-.05,th:.12,dih:-.02,nav:[5.25,3.9]},
  tail:{pts:[[.5,5.3],[2.75,7.3],[2.75,7.85],[.5,7.9]],y:-.75,th:.07},
  fins:[{pts:[[3.8,.95],[7.0,3.65],[8.0,3.7],[8.3,.95]],th:.12}],
  nozzles:[[0,.42,8.05,.42,.38,.5],[0,-.42,8.05,.42,.38,.5]],ab:4.5,
  canopy:[[.36,.42,1.45,1.0,-5.2,0x5a7488]],
  extra:(g,M)=>{g.add(new THREE.Mesh(sloft([[-3.5,.05,-1.0,.05,2],[-2.6,.5,-1.15,.32,2.4],[1.5,.55,-1.2,.38,2.6],[3.2,.1,-1.0,.1,2]],22),M.dk));}// ventral fuel / gun pack
});}

// ---------- Dassault Mirage IIIE (aircraft operating manual) ----------
// Atar 9C 41.97 / 60.8 kN, empty 7,050 kg, 2,390 kg internal, 35 m² delta, Cyrano II radar (~28 km air), two DEFA 552 30 mm (125 rds),
// R530 on the centreline, Magic / Sidewinder outboard, 1,700 l / 500 l tanks, AS-37 Martel and AS-30 for strike.
const M3ST={1:[-2.9,-.42,1.9],2:[-1.9,-.48,1.3],C:[0,-.92,.6],4:[1.9,-.48,1.3],5:[2.9,-.42,1.9]};
function makeMirage3(){return mkJet({c:0x9b9a7e,dk:0x6b6a55,lt:0xb9b89c,rad:0x2c3129,st:M3ST,wy:()=>-.28,
  body:[[-8.0,.02,.0,.02,2],[-7.2,.24,.02,.26,2],[-5.8,.46,.08,.5,2.1],[-4.0,.58,.15,.68,2.2],[-1.5,.72,.08,.74,2.3],[1.5,.72,.05,.7,2.3],[4.5,.6,.05,.6,2.1],[6.9,.52,.05,.52,2]],
  radome:[[-8.0,.02,.0,.02,2],[-7.2,.24,.02,.26,2],[-6.5,.38,.05,.4,2]],
  intakes:[{x:.72,y:.0,z:-3.4,w:.18,h:.42,round:true}],
  wing:{pts:[[.7,-2.1],[4.11,3.4],[4.11,4.2],[.7,5.9]],y:-.25,th:.11,dih:0,nav:[4.05,3.8]},
  fins:[{pts:[[2.3,.62],[5.7,3.6],[6.6,3.6],[7.0,.62]],th:.11}],
  nozzles:[[0,.05,7.0,.48,.43,.6]],ab:4.6,
  canopy:[[.38,.42,1.4,.62,-4.7,0x5a7488]]
});}

// ---------- Dassault Mirage F1C (F1AZ / F1CE documentation, Cyrano IV notes) ----------
// Atar 9K-50 49.2 / 70.6 kN, empty 7,400 kg, 3,400 kg internal (4,300 l), 25 m² swept shoulder wing with full-span slats, 7 g, Cyrano IV (~45 km on a fighter),
// two DEFA 553 30 mm (125 rds), Super 530F / R530 inboard, Magic on the tips, 1,200 l tanks.
const F1ST={1:[-4.2,-.08,1.6],2:[-3.0,-.15,1.3],3:[-1.75,-.2,.9],C:[0,-.96,.4],5:[1.75,-.2,.9],6:[3.0,-.15,1.3],7:[4.2,-.08,1.6]};
function makeMirageF1(){return mkJet({c:0x8e9584,dk:0x646a5d,lt:0xabb2a1,rad:0x2d322c,st:F1ST,wy:()=>.42,tipX:4.1,
  body:[[-7.7,.02,.0,.02,2],[-6.9,.26,.02,.28,2],[-5.6,.48,.08,.52,2.1],[-4.0,.62,.15,.7,2.3],[-1.5,.74,.08,.76,2.5],[1.5,.74,.05,.72,2.5],[4.5,.6,.05,.6,2.2],[7.0,.5,.05,.5,2]],
  radome:[[-7.7,.02,.0,.02,2],[-6.9,.26,.02,.28,2],[-6.2,.4,.05,.42,2]],
  intakes:[{x:.75,y:.05,z:-3.5,w:.18,h:.44,round:true}],
  wing:{pts:[[.7,-.6],[4.2,1.6],[4.2,2.3],[.7,2.7]],y:.55,th:.1,dih:-.05},
  tail:{pts:[[.4,4.9],[2.6,6.2],[2.6,6.8],[.4,7.0]],y:.25,th:.07},
  fins:[{pts:[[2.0,.7],[5.6,3.6],[6.7,3.6],[7.1,.7]],th:.11}],
  ventral:[{pts:[[5.3,-.4],[6.0,-.85],[6.8,-.85],[7.0,-.4]],x:.4,th:.05,cant:.2}],
  nozzles:[[0,.05,7.1,.48,.43,.6]],ab:4.8,
  canopy:[[.38,.44,1.4,.66,-4.6,0x5a7488]]
});}

// ---------- Dassault Mirage 2000C (RDI, S5; DCS manual / guide) ----------
// SNECMA M53-P2 64.3 / 95.1 kN, empty 7,500 kg, 3,160 kg internal, 41 m² delta, quadruplex FBW (9 g, ~29° AoA limit), Thomson-CSF RDI pulse-doppler
// (~45 NM, look-down), Super 530D / 530F on the inner wing stations, Magic 2 outboard, two DEFA 554 30 mm (125 rds), Spirale chaff / flares, Serval RWR, Sabre jammer.
const M2KST={1:[-3.45,-.4,2.4],2:[-2.35,-.45,1.6],3:[-.75,-.95,-1.2],4:[-.75,-.95,1.8],C:[0,-1.02,.4],6:[.75,-.95,1.8],7:[.75,-.95,-1.2],8:[2.35,-.45,1.6],9:[3.45,-.4,2.4]};
function makeMirage2000(){return mkJet({c:0x8e979e,dk:0x646c72,lt:0xadb5bb,rad:0x2d3236,st:M2KST,wy:()=>-.25,
  body:[[-7.3,.02,.05,.02,2],[-6.6,.26,.06,.28,2],[-5.4,.5,.12,.54,2.1],[-3.8,.64,.2,.72,2.3],[-1.5,.78,.1,.78,2.5],[1.5,.8,.05,.74,2.6],[4.5,.66,.05,.62,2.3],[6.6,.55,.05,.55,2.1]],
  radome:[[-7.3,.02,.05,.02,2],[-6.6,.26,.06,.28,2],[-5.9,.42,.08,.44,2]],probe:[-7.3,-8.3,.06],
  intakes:[{x:.78,y:.05,z:-3.3,w:.2,h:.46,round:true}],
  wing:{pts:[[.75,-2.3],[4.56,3.6],[4.56,4.4],[.75,6.0]],y:-.22,th:.11,dih:0,nav:[4.5,4.0]},
  fins:[{pts:[[2.4,.75],[5.4,4.0],[6.4,4.0],[6.8,.75]],th:.12}],
  nozzles:[[0,.05,6.8,.52,.46,.65]],ab:5,
  canopy:[[.4,.46,1.45,.72,-4.3,0x5a7488]],
  extra:(g,M)=>{for(const sd of[-1,1]){const s=planform([[0,-.6],[.5,.2],[0,.25]],.03,false,M.dk,false);s.scale.x=sd;s.position.set(sd*.95,.42,-3.3);g.add(s);}}// intake strakes
});}

// ---------- SEPECAT Jaguar A (type A aircraft crew manual) ----------
// Two Adour Mk 102 (22.75 kN dry / 32.5 kN reheat each), empty 7,000 kg, 3,337 kg internal (4,200 l), 24.18 m², no radar (laser rangefinder, navigation /
// attack system with CCIP), two DEFA 553 30 mm (150 rds each), Magic outboard, AS-37 Martel, AS-30L, Belouga, SAMP bombs, rocket pods, 1,200 l tanks.
const JAGST={1:[-3.3,-.45,.9],2:[-2.0,-.48,.55],C:[0,-.98,.2],4:[2.0,-.48,.55],5:[3.3,-.45,.9]};
function makeJaguar(){return mkJet({c:0x8a8a6e,dk:0x626249,lt:0xa6a688,rad:0x2f2f27,st:JAGST,wy:()=>.15,
  body:[[-8.2,.02,-.15,.02,2],[-7.4,.22,-.12,.2,2],[-6.2,.42,-.05,.42,2.2],[-4.6,.55,.12,.62,2.4],[-2.4,.7,.08,.72,2.8],[.5,.78,.0,.7,3],[3.5,.72,.02,.64,2.8],[6.5,.62,.02,.52,2.4],[8.0,.55,.02,.45,2.2]],
  intakes:[{x:.84,y:.1,z:-2.9,w:.24,h:.44,round:false,duct:[[-2.9,.26,.1,.44,4],[0,.26,.05,.44,3.4],[2.5,.12,.02,.24,2.4]]}],
  wing:{pts:[[.7,-.4],[4.35,1.85],[4.35,2.6],[.7,2.9]],y:.6,th:.1,dih:-.05,nav:[4.3,2.2]},
  tail:{pts:[[.5,5.4],[2.6,6.9],[2.6,7.5],[.5,7.7]],y:-.1,th:.07,dih:-.17},
  fins:[{pts:[[3.4,.65],[6.4,3.3],[7.5,3.3],[7.9,.65]],th:.11}],
  ventral:[{pts:[[6.0,-.4],[6.6,-.85],[7.6,-.85],[7.8,-.4]],x:.45,th:.05,cant:.3}],
  nozzles:[[-.42,-.05,8.1,.3,.27,.5],[.42,-.05,8.1,.3,.27,.5]],ab:3.6,
  canopy:[[.36,.42,1.3,.68,-5.3,0x5a7488]]
});}

// ---------- Panavia Tornado GR.4 ----------
// Two RB199 Mk 103 (43.8 / 76.8 kN each), empty 13,890 kg, 5,090 kg internal, wing 25° / 45° / 67° (manual), triplex CSAS (FBW), 7.5 g, ground-mapping /
// terrain-following radar only, TIALD / Litening, one Mauser BK-27 (180 rds), AIM-9L on the inner-pylon side rails, Paveway II / III, ALARM, BL755, 1,500 l / 2,250 l tanks.
const TORST={2:[-2.75,-.05,.9],'2a':[-3.05,.08,.8],3:[-.75,-.9,-2.6],4:[-.75,-.9,1.3],C:[0,-1.0,-.6],6:[.75,-.9,1.3],7:[.75,-.9,-2.6],8:[2.75,-.05,.9],'8a':[3.05,.08,.8]};
function makeTornado(){return mkJet({c:0x737d74,dk:0x515a52,lt:0x8f998f,rad:0x2c312d,st:TORST,wy:()=>.3,
  body:[[-8.6,.02,.0,.02,2],[-7.8,.3,.02,.3,2],[-6.6,.56,.08,.56,2.2],[-4.8,.72,.15,.74,2.5],[-2,.96,.05,.78,3],[1.5,1.04,.0,.76,3.2],[4.6,.92,.0,.68,3],[7.2,.82,.0,.58,2.6],[8.4,.78,.0,.55,2.4]],
  radome:[[-8.6,.02,.0,.02,2],[-7.8,.3,.02,.3,2],[-7.1,.46,.05,.46,2.1]],
  intakes:[{x:1.05,y:-.05,z:-3.2,w:.28,h:.5,round:false}],
  glove:{pts:[[.9,-2.6],[2.3,-.2],[2.3,1.6],[.9,2.0]],y:.42,th:.15},
  swing:{base:25,piv:[2.0,.42,.6],pts:[[0,-.9],[4.95,.9],[4.95,1.65],[0,2.15]],th:.12,nav:[4.9,1.25]},
  tail:{pts:[[.85,5.9],[3.4,7.3],[3.4,8.0],[.85,8.5]],y:-.05,th:.08,dih:-.08},
  fins:[{pts:[[2.8,.75],[6.6,4.6],[8.0,4.6],[8.5,.75]],th:.14}],
  nozzles:[[-.5,.0,8.65,.4,.36,.55],[.5,.0,8.65,.4,.36,.55]],ab:4.5,
  canopy:[[.42,.5,1.9,.78,-4.9,0x5a7488]]
});}

/* ======================================================================================================================
   RED
   ====================================================================================================================== */

// ---------- Sukhoi Su-25 'Frogfoot' (cockpit photos in the docs folder) ----------
// Two R-95Sh (40.2 kN each), no reheat, empty 9,315 kg, 3,000 kg internal, 33.7 m², 6.5 g clean, armoured titanium cockpit, no radar (Klen-PS laser
// rangefinder, ASP-17BTs8 sight), GSh-30-2 (250 rds), ten pylons + two R-60M rails, ASO-2V 256 cartridges, SPO-15 warner.
const SU25ST={1:[-6.6,-.32,1.3],2:[-5.4,-.38,1.2],3:[-4.4,-.42,1.1],4:[-3.4,-.46,.95],5:[-2.4,-.5,.8],6:[2.4,-.5,.8],7:[3.4,-.46,.95],8:[4.4,-.42,1.1],9:[5.4,-.38,1.2],10:[6.6,-.32,1.3]};
function makeSu25(){return mkJet({c:0x7c7f63,dk:0x585a45,lt:0x989b7e,rad:0x3c3e33,st:SU25ST,wy:()=>.05,tipX:6.5,
  body:[[-7.2,.06,-.15,.08,2],[-6.6,.3,-.1,.32,2.2],[-5.4,.52,.0,.56,2.6],[-3.8,.6,.1,.72,3],[-1.5,.62,.05,.74,3],[1.5,.56,.0,.66,2.8],[4.5,.44,.05,.5,2.4],[7.2,.3,.15,.32,2.1]],
  intakes:[{x:.78,y:.08,z:-2.2,w:.3,h:.42,duct:[[-2.2,.32,.08,.44,2.2],[0,.36,.0,.46,2.2],[2.6,.42,-.05,.42,2.1],[4.0,.4,-.05,.38,2.1]]}],
  wing:{pts:[[.7,-.9],[7.18,.5],[7.18,1.6],[.7,2.4]],y:.45,th:.13,dih:-.04,nav:[7.15,1.0]},
  tail:{pts:[[.3,5.2],[2.6,6.4],[2.6,6.95],[.3,7.2]],y:.4,th:.07,dih:.05},
  fins:[{pts:[[3.6,.5],[6.2,3.15],[7.3,3.15],[7.6,.5]],th:.11}],
  nozzles:[[-1.02,-.05,4.55,.32,.28,.5],[1.02,-.05,4.55,.32,.28,.5]],
  canopy:[[.38,.42,1.15,.62,-4.2,0x5a7488]],
  extra:(g,M)=>{for(const sd of[-1,1])pod(g,.9,.12,M.dk,sd*7.1,.45,1.2,1,1,10);}// wingtip airbrake / ECM pods
});}

// ---------- Sukhoi Su-24M 'Fencer-D' ----------
// Two AL-21F-3 (76.5 / 109.8 kN), empty 22,300 kg, 9,800 kg internal, wing 16° / 35° / 45° / 69° (manual), 6.5 g, Orion-A attack radar + Relief TFR
// (no air-to-air search), Kaira-24 laser / TV, crew of two side by side (WSO on the right), GSh-6-23M (500 rds), R-60M for self defence, Kh-25ML /
// Kh-29 / Kh-58 / KAB-500Kr, PTB-3000 / PTB-2000 tanks.
const SU24ST={1:[-3.4,-.25,.9],2:[-2.15,-.62,.2],3:[-.85,-1.15,-1.4],C:[0,-1.25,.8],5:[.85,-1.15,-1.4],6:[2.15,-.62,.2],7:[3.4,-.25,.9]};
function makeSu24(){return mkJet({c:0x8f9a90,dk:0x667068,lt:0xabb5ab,rad:0x30362f,st:SU24ST,wy:x=>Math.abs(x)>3?.05:-.2,
  body:[[-11.0,.02,.0,.02,2],[-10.1,.36,.02,.36,2],[-8.8,.7,.08,.62,2.2],[-7.0,.96,.18,.78,2.6],[-4.6,1.06,.1,.82,3],[-1.5,1.36,.0,.82,3.4],[2,1.38,-.05,.8,3.4],[5.5,1.2,-.05,.72,3],[8.6,1.0,-.05,.62,2.6],[10.1,.94,-.05,.58,2.4]],
  radome:[[-11.0,.02,.0,.02,2],[-10.1,.36,.02,.36,2],[-9.3,.58,.05,.54,2.1]],
  intakes:[{x:1.42,y:.0,z:-4.2,w:.3,h:.6,round:false,split:[[-4.7,-.6],[-4.7,.6],[-3.6,.55],[-3.6,-.55]]}],
  glove:{pts:[[1.2,-3.6],[2.9,-.6],[2.9,1.6],[1.2,2.6]],y:.38,th:.16},
  swing:{base:16,piv:[2.6,.38,.3],pts:[[0,-1.0],[6.2,.45],[6.2,1.5],[0,2.2]],th:.13,nav:[6.15,1.0]},
  tail:{pts:[[1.0,6.6],[4.0,8.3],[4.0,9.1],[1.0,9.6]],y:-.05,th:.08,dih:-.04},
  fins:[{pts:[[3.6,.85],[8.0,5.0],[9.5,5.0],[10.0,.85]],th:.14}],
  ventral:[{pts:[[7.2,-.6],[8.0,-1.2],[9.3,-1.2],[9.6,-.6]],x:.8,th:.05}],
  nozzles:[[-.72,-.05,10.15,.52,.46,.7],[.72,-.05,10.15,.52,.46,.7]],ab:5,
  canopy:[[1.0,.52,1.5,.86,-6.8,0x5a7488]]
});}

// ---------- Sukhoi Su-22M4 'Fitter-K' ----------
// AL-21F-3 (76.5 / 110.3 kN), empty 10,767 kg, 3,770 kg internal, outer wing 30° / 45° / 63°, 7 g, Fon-1400 laser / ranging set (no air-to-air radar),
// ASP-17BTs8, Klen-PS, two NR-30 30 mm (80 rds each) in the wing roots, R-60M, Kh-25ML / Kh-29L / Kh-58, bombs, rockets, PTB-800.
const SU22ST={1:[-3.95,-.15,.9],2:[-2.6,-.25,.6],3:[-1.4,-.32,.1],4:[-.6,-.92,-1.6],5:[.6,-.92,-1.6],6:[1.4,-.32,.1],7:[2.6,-.25,.6],8:[3.95,-.15,.9]};
function makeSu22(){return mkJet({c:0x8e9a8d,dk:0x657064,lt:0xaab6a8,rad:0x343a33,st:SU22ST,wy:()=>.0,
  body:[[-9.1,.62,.0,.62,2],[-8.2,.7,.02,.74,2.1],[-6.4,.76,.1,.84,2.2],[-3.5,.8,.08,.86,2.3],[0,.82,.04,.84,2.3],[3.5,.76,.04,.76,2.2],[6.6,.66,.04,.66,2.1],[8.6,.6,.04,.6,2]],
  noseOpen:true,noseInt:{z:-9.1,r:.56,y:.0,sx:1.05,sy:1.05,cone:.36,coneL:1.6},
  spine:[[-6.0,.04,.75,.05,2],[-4.8,.32,.92,.18,2],[3,.3,.85,.14,2],[5.6,.06,.78,.05,2]],
  glove:{pts:[[.75,-2.6],[2.2,-.2],[2.2,1.8],[.75,2.4]],y:.0,th:.15},
  swing:{base:30,piv:[2.05,.0,.6],pts:[[0,-.9],[4.8,.75],[4.8,1.55],[0,2.05]],th:.11,nav:[4.75,1.15]},
  tail:{pts:[[.5,5.9],[3.0,7.3],[3.0,7.9],[.5,8.2]],y:-.15,th:.07},
  fins:[{pts:[[2.4,.75],[6.4,4.0],[7.8,4.05],[8.4,.75]],th:.12}],
  ventral:[{pts:[[6.6,-.55],[7.3,-1.0],[8.3,-1.0],[8.5,-.55]],th:.06}],
  nozzles:[[0,.0,8.75,.56,.5,.65]],ab:5,
  canopy:[[.4,.46,1.5,.78,-5.8,0x5a7488]]
});}

// ---------- Mikoyan MiG-27K 'Flogger-J2' ----------
// R-29B-300 78.5 / 112.7 kN (fixed intakes, simplified nozzle), empty 11,908 kg, 4,560 kg internal, MiG-23 wing 16° / 45° / 72°, 7 g, M ~1.7, Kaira-23 laser /
// TV designator (no radar), GSh-6-30 (260 rds), armoured sloping 'duck' nose, seven pylons: Kh-25ML / Kh-29L / KAB-500Kr, bombs, rockets, R-60M.
const M27ST={1:[-2.1,-.38,.2],2:[-.75,-1.02,-.6],3:[-.75,-1.02,1.6],C:[0,-1.12,.6],5:[.75,-1.02,1.6],6:[.75,-1.02,-.6],7:[2.1,-.38,.2]};
function makeMiG27(){return mkJet({c:0x7d8766,dk:0x5a6249,lt:0x98a280,rad:0x34382d,st:M27ST,wy:x=>Math.abs(x)<1.2?-.62:.16,
  body:[[-8.1,.12,-.3,.1,2],[-7.4,.34,-.22,.3,2.3],[-6.4,.46,-.08,.46,2.5],[-5.2,.52,.12,.6,2.6],[-4.2,.56,.2,.64,2.7],[-2.5,.6,.2,.64,3],[0,.66,.16,.64,3.2],[2.5,.68,.12,.62,3.2],[5,.64,.1,.6,3],[6.8,.58,.08,.58,2.6],[8.0,.54,.05,.54,2.2]],
  intakes:[{x:.92,y:-.05,z:-4.38,w:.34,h:.5,duct:[[-4.35,.36,-.05,.52,6],[-3.0,.38,-.06,.54,6],[-.5,.36,-.06,.52,5],[1.8,.24,-.04,.42,3.5]]}],
  glove:{pts:[[.55,-4.4],[2.32,-.35],[2.32,1.75],[.55,2.3]],y:.22,th:.14},
  swing:{base:16,piv:[2.15,.21,.55],pts:[[0,-1.18],[4.85,.22],[4.85,1.42],[0,2.22]],th:.11,nav:[4.85,.8]},
  tail:{pts:[[.55,5.0],[2.85,6.95],[2.9,7.75],[.55,7.95]],y:.02,th:.08,dih:-.05},
  fins:[{pts:[[-1.6,.62],[1.6,.82],[4.9,3.55],[6.55,3.62],[7.5,.62]],th:.13}],
  ventral:[{pts:[[5.2,-.55],[6.1,-1.5],[7.25,-1.5],[7.6,-.55]],th:.06}],
  nozzles:[[0,.0,8.4,.56,.5,.9]],ab:5,
  canopy:[[.44,.46,1.45,.66,-5.0,0x5a7488]],
  extra:(g,M)=>{ball(g,.12,SKIN(0x2a3438,90),0,-.35,-7.2,1,.7,1.2);pod(g,1.6,.2,M.dk,0,-.72,-1.8,1.2,.9,12);}// Kaira window, gun fairing
});}

// ---------- Mikoyan-Gurevich MiG-15bis (DCS manual, UTI maintenance books) ----------
// VK-1 26.5 kN, no reheat, empty 3,681 kg, 1,173 kg internal, 20.6 m² 35° swept wing, 8 g, ASP-3N gyro sight, no radar,
// N-37D 37 mm (40 rds) + two NR-23 23 mm (80 rds each), wing pylons for 300 / 600 l tanks or FAB-100 / FAB-250.
const M15ST={1:[-2.6,-.38,.55],2:[2.6,-.38,.55]};
function makeMiG15(){return mkJet({c:0xb9bdb5,dk:0x82867e,lt:0xcfd3cb,rad:0x2c3129,st:M15ST,wy:()=>.0,
  body:[[-4.9,.52,.0,.56,2],[-4.3,.6,.02,.68,2],[-3.0,.66,.05,.8,2],[-1.2,.68,.05,.82,2],[.8,.64,.05,.76,2],[2.6,.5,.08,.56,2],[4.2,.36,.1,.38,2],[5.0,.3,.12,.3,2]],
  noseOpen:true,noseInt:{z:-4.9,r:.5,y:.0,sx:1,sy:1.08},
  wing:{pts:[[.6,-.9],[5.04,1.9],[5.04,2.75],[.6,2.1]],y:.15,th:.13,dih:-.035,nav:[5.0,2.3],fence:[[1.9,-.2,1.6],[3.3,.6,1.5]]},
  tail:{pts:[[0,4.0],[1.6,4.75],[1.6,5.2],[0,5.4]],y:2.6,th:.06},
  fins:[{pts:[[1.6,.55],[3.9,3.0],[4.9,3.0],[5.1,.55]],th:.1}],
  nozzles:[[0,.12,5.0,.34,.3,.3]],
  canopy:[[.36,.4,1.2,.72,-2.0,0x5a7488]],
  extra:(g,M)=>{pod(g,.9,.14,M.dk,-.35,-.7,-2.5,1,1,10);}// gun pack
});}

// ---------- Mikoyan-Gurevich MiG-19P 'Farmer-B' (DCS manual / guide) ----------
// Two RD-9B (25.5 / 31.9 kN each), empty 5,560 kg, 1,800 kg internal, 25 m² 55° wing, 8 g, RP-5 Izumrud radar (~12 km search / 4 km track) in the intake lip
// and splitter, ASP-5N sight, two NR-30 30 mm (73 rds each) in the wing roots, R-3S (K-13) or rockets / bombs / PTB-760 on four pylons.
const M19ST={1:[-3.2,-.25,1.2],2:[-1.9,-.3,.6],3:[1.9,-.3,.6],4:[3.2,-.25,1.2]};
function makeMiG19(){return mkJet({c:0xb7bcb5,dk:0x7f857d,lt:0xcdd2cb,rad:0x2c3129,st:M19ST,wy:()=>-.1,
  body:[[-6.0,.56,.02,.58,2],[-5.3,.64,.03,.68,2],[-3.8,.7,.06,.78,2.05],[-1.5,.74,.06,.8,2.1],[1,.74,.04,.76,2.1],[3.5,.66,.04,.64,2.1],[5.6,.62,.04,.56,2.3],[6.4,.62,.04,.52,2.4]],
  noseOpen:true,noseInt:{z:-6.0,r:.54,y:.02,sx:1,sy:1.05,cone:.16,coneL:.8},
  wing:{pts:[[.6,-1.5],[4.5,2.4],[4.5,3.3],[.6,2.4]],y:-.15,th:.11,dih:-.075,nav:[4.45,2.8],fence:[[2.2,-.1,2.2]]},
  tail:{pts:[[.4,4.4],[2.4,6.1],[2.4,6.6],[.4,6.7]],y:-.3,th:.06},
  fins:[{pts:[[1.9,.6],[5.0,3.15],[6.0,3.15],[6.4,.6]],th:.11}],
  ventral:[{pts:[[4.3,-.5],[5.0,-.9],[6.0,-.9],[6.2,-.5]],th:.05}],
  nozzles:[[-.38,.0,6.55,.3,.27,.4],[.38,.0,6.55,.3,.27,.4]],ab:3.6,
  canopy:[[.38,.42,1.25,.7,-3.2,0x5a7488]]
});}

// ---------- Yakovlev Yak-38 'Forger-A' ----------
// R-27V-300 lift / cruise 66.7 kN with two swivelling nozzles plus two RD-36-35FV lift jets (2× 29.4 kN, take-off / landing only), empty 7,385 kg,
// ~2,900 kg internal, 18.4 m², 6 g, no radar, ASP-PFD sight, no gun (UPK-23 pod not modelled), R-60M, bombs, UB-32 / UB-16, PTB-600 on four pylons.
const Y38ST={1:[-2.9,-.4,.9],2:[-1.9,-.42,.5],3:[1.9,-.42,.5],4:[2.9,-.4,.9]};
function makeYak38(){return mkJet({c:0x7f8a8f,dk:0x5a6468,lt:0x9aa5aa,rad:0x2c3134,st:Y38ST,wy:()=>.3,
  body:[[-8.2,.02,.0,.02,2],[-7.4,.26,.02,.28,2],[-6.2,.46,.08,.5,2.2],[-4.8,.6,.2,.66,2.4],[-2.5,.82,.1,.78,2.8],[.5,.84,.05,.8,3],[3.5,.7,.1,.66,2.7],[6.0,.5,.15,.48,2.3],[7.8,.3,.25,.3,2]],
  intakes:[{x:.82,y:.15,z:-3.6,w:.3,h:.52,duct:[[-3.6,.32,.15,.54,2.6],[-1,.34,.1,.56,2.4],[1.6,.2,.05,.3,2]]}],
  wing:{pts:[[.7,-.6],[3.66,.9],[3.66,1.7],[.7,2.4]],y:.55,th:.11,dih:-.05,nav:[3.6,1.3]},
  tail:{pts:[[.3,5.6],[2.0,6.6],[2.0,7.1],[.3,7.4]],y:.3,th:.06},
  fins:[{pts:[[3.6,.6],[6.3,3.0],[7.3,3.0],[7.7,.6]],th:.1}],
  canopy:[[.38,.42,1.2,.74,-5.3,0x5a7488]],
  extra:(g,M)=>{for(const sd of[-1,1]){const n=new THREE.Mesh(new THREE.CylinderGeometry(.3,.34,.7,18,1,true),M.met);n.position.set(sd*.82,-.35,2.2);g.add(n);rim(g,.32,.04,M.dk,sd*.82,-.7,2.2);}
    rim(g,.55,.04,M.dk,0,.88,-3.0,1,.5);}// cruise nozzles, lift-jet door
});}

// ---------- Yakovlev Yak-141 'Freestyle' (cockpit photos, cutaways in the docs folder) ----------
// R-79V-300 lift / cruise engine (107.9 kN dry / 152 kN reheat) with a three-bearing swivel nozzle, two RD-41 lift jets (2× 41.7 kN, take-off / landing),
// empty 11,650 kg, 4,400 kg internal, 31.7 m², 7 g, M1.7, Zhuk (N019 family) radar, MiG-29-style cockpit and HUD, GSh-301 (120 rds), R-73, R-27R / T, R-77.
const Y141ST={1:[-3.6,-.25,.7],2:[-2.3,-.32,.3],3:[2.3,-.32,.3],4:[3.6,-.25,.7]};
function makeYak141(){return mkJet({c:0x7f8b92,dk:0x5a656b,lt:0x9aa6ad,rad:0xb7bcb5,st:Y141ST,wy:()=>.1,
  body:[[-9.4,.02,.0,.02,2],[-8.5,.3,.02,.32,2],[-7.0,.56,.1,.58,2.2],[-5.2,.72,.25,.76,2.5],[-2.5,1.1,.1,.82,3.2],[.5,1.2,.0,.8,3.4],[3.0,1.0,.0,.66,3],[4.6,.72,.0,.52,2.6]],
  radome:[[-9.4,.02,.0,.02,2],[-8.5,.3,.02,.32,2],[-7.8,.44,.05,.46,2.05]],tailOpen:true,
  intakes:[{x:1.1,y:-.1,z:-3.8,w:.34,h:.62,round:false}],
  wing:{pts:[[.9,-.9],[5.05,.9],[5.05,1.7],[.9,2.6]],y:.55,th:.12,dih:-.04,nav:[5.0,1.3]},
  tail:{pts:[[.9,7.0],[3.2,7.6],[3.2,8.3],[.9,8.6]],y:.35,th:.07},
  fins:[{pts:[[3.6,.5],[6.9,3.2],[8.1,3.2],[8.6,.5]],th:.11,x:1.3,cant:.08}],
  nozzles:[[0,.0,4.9,.62,.55,.7]],ab:5,
  canopy:[[.4,.46,1.35,.84,-5.6,0x5a7488]],
  extra:(g,M)=>{for(const sd of[-1,1]){const bm=new THREE.Mesh(sloft([[2.5,.08,.25,.08,2],[4,.24,.32,.22,2.4],[8.6,.18,.3,.18,2.2]],18),M.mat);bm.position.x=sd*1.3;g.add(bm);}
    rim(g,.6,.04,M.dk,0,.95,-2.6,1,.5);}// tail booms, lift-jet door
});}

// ---------- Shenyang J-8F 'Finback-B' ----------
// Two WP-13B (47.1 / 68.6 kN each), empty 10,371 kg, ~4,300 kg internal, 42.2 m² delta, 7 g, M2.2, Type 1492 pulse-doppler radar (~75 km, PL-12 capable),
// Type 23-III 23 mm twin cannon (200 rds), PL-8 / PL-5E short range, PL-12 / PL-11 medium range, seven pylons.
const J8ST={1:[-4.4,-.3,1.8],2:[-3.2,-.35,1.3],3:[-2.0,-.4,.8],C:[0,-1.05,.6],5:[2.0,-.4,.8],6:[3.2,-.35,1.3],7:[4.4,-.3,1.8]};
function makeJ8F(){return mkJet({c:0x8a959c,dk:0x626c72,lt:0xa8b2b8,rad:0x2e3438,st:J8ST,wy:()=>-.18,
  body:[[-10.8,.02,.05,.02,2],[-9.9,.3,.06,.32,2],[-8.6,.56,.12,.58,2.1],[-6.8,.72,.25,.76,2.3],[-4,.98,.1,.8,3],[0,1.06,.05,.8,3.2],[4,.96,.05,.74,3],[8,.86,.05,.66,2.6],[10.2,.8,.05,.6,2.4]],
  radome:[[-10.8,.02,.05,.02,2],[-9.9,.3,.06,.32,2],[-9.1,.48,.1,.5,2.05]],probe:[-10.8,-11.8,.05],
  intakes:[{x:1.02,y:.0,z:-5.2,w:.3,h:.62,round:false,split:[[-5.7,-.6],[-5.7,.6],[-4.6,.55],[-4.6,-.55]]}],
  wing:{pts:[[1.0,-2.0],[4.67,3.2],[4.67,4.1],[1.0,4.8]],y:-.2,th:.11,dih:-.04,nav:[4.6,3.6]},
  tail:{pts:[[.8,7.4],[3.0,8.9],[3.0,9.5],[.8,9.8]],y:.0,th:.07,dih:-.1},
  fins:[{pts:[[4.0,.85],[8.0,4.5],[9.4,4.5],[9.9,.85]],th:.13}],
  ventral:[{pts:[[7.6,-.6],[8.4,-1.4],[9.6,-1.4],[9.9,-.6]],th:.06}],
  nozzles:[[-.5,.0,10.3,.42,.38,.6],[.5,.0,10.3,.42,.38,.6]],ab:4.5,
  canopy:[[.4,.46,1.5,.82,-6.6,0x5a7488]]
});}

// ---------- Xi'an JH-7 'Flounder' ----------
// Two WS-9 (licence Spey Mk 202, 54.5 / 91.3 kN each), empty 14,500 kg, ~7,500 kg internal, 52.3 m², 7 g, M1.7, Type 232H multimode radar (sea search,
// limited air search ~40 km), crew of two in tandem (navigator / WSO in the back), twin 23 mm (300 rds), PL-5E on the tips, YJ-82 (C-801K) anti-ship,
// KD-88 TV missile, LS-500J laser bombs, FAB bombs, 1,100 l tanks, eleven stations.
const JH7ST={1:[-6.3,-.05,1.4],2:[-5.0,-.4,1.1],3:[-3.7,-.45,.8],4:[-2.4,-.5,.4],C:[0,-1.2,.4],6:[2.4,-.5,.4],7:[3.7,-.45,.8],8:[5.0,-.4,1.1],9:[6.3,-.05,1.4]};
function makeJH7(){return mkJet({c:0x8c9488,dk:0x646b60,lt:0xa8b0a4,rad:0x30362f,st:JH7ST,wy:()=>.05,tipX:6.2,
  body:[[-11.2,.02,.0,.02,2],[-10.3,.32,.02,.34,2],[-9.0,.6,.1,.6,2.2],[-7.2,.76,.25,.8,2.5],[-4.6,1.0,.2,.84,3],[-1,1.2,.05,.84,3.3],[3,1.16,.0,.78,3.2],[7,1.02,.0,.68,2.8],[10.3,.92,.0,.6,2.4]],
  radome:[[-11.2,.02,.0,.02,2],[-10.3,.32,.02,.34,2],[-9.5,.52,.06,.54,2.1]],
  intakes:[{x:1.25,y:.05,z:-4.4,w:.3,h:.62,round:false,split:[[-4.9,-.6],[-4.9,.6],[-3.8,.55],[-3.8,-.55]]}],
  wing:{pts:[[1.0,-1.4],[6.36,2.6],[6.36,3.6],[1.0,4.4]],y:.6,th:.13,dih:-.06,nav:[6.3,3.1]},
  tail:{pts:[[.9,7.6],[3.6,9.2],[3.6,9.9],[.9,10.3]],y:.0,th:.08,dih:-.1},
  fins:[{pts:[[4.2,.85],[8.6,5.0],[10.0,5.0],[10.5,.85]],th:.14}],
  ventral:[{pts:[[8.3,-.6],[9.0,-1.25],[10.1,-1.25],[10.4,-.6]],th:.06}],
  nozzles:[[-.55,.0,10.45,.44,.4,.6],[.55,.0,10.45,.44,.4,.6]],ab:4.5,
  canopy:[[.42,.5,2.3,.86,-6.6,0x5a7488]]
});}

/* ======================================================================================================================
   type data
   ====================================================================================================================== */
const imp={units:'imp',cockpit:'viper'},met={units:'met'};
const R=(name,R0,ranges,unit,ecc,extra)=>Object.assign({name,R0,ranges,unit:unit==='NM'?NM:1000,ul:unit,ecc},extra||{});
const G_=(name,rate,v,dmg,ammo,spread=.003)=>({name,rate,v,dmg,ammo,spread});
const NOGUN={name:'NO GUN',rate:1,v:900,dmg:0,ammo:0,spread:.01};
const sub=(peak,mdd)=>cdm(peak,mdd,false),sup=(peak,mdd=.86)=>cdm(peak,mdd,true);
const TK=['TK'];

// ---- A-4E ----
addJet({id:'A-4E',src:'F-4E',side:'BLUE',name:'A-4E Skyhawk',call:'SCOOTER',nctr:'A-4',foe:'MiG-19',eng:'J52-P-6A',rwr:'ALR-45/50',cv:true,app:128,noAB:true,
  role:'US · NAVY LIGHT ATTACK · J52 · 2× Mk 12 · NO CCIP',stall:{s:.15,twin:0},
  ac:Object.assign({},imp,{name:'A-4E Skyhawk',model:makeA4,st:A4ST,empty:4469,fuel:2420,tank:910,ptb:1210,S:24.15,CLa:3.9,cd0:.0215,k:.14,mil:37800,ab:37800,spool:3.2,abLight:99,
    clt:clt(3.9,1.32,26,.05),cdm:sub(.045,.8),dW:7400,tkG:[5,6],dep:{a:28,rock:1.0,spin:2.6},ff:[.12,.95,.95],gLim:7,aoaLim:25,roll:4.6,fbw:false,noLimiter:true,
    rcs:2.5,irs:.7,pit:'phantom',eye:eyeOf(-3.5,.58),radar:R('APG-53A',9000,[5,10],'NM',.05),irst:false,pulse:true,
    gun:G_('2× Mk 12',33,840,10,400,.003),keepJ:[],rwr:'A4',spo:4,tankName:'300 gal tank',vne:1100}),
  stn:{1:[...US_IR_OLD,'Mk-82','Mk-82AIR','Mk-20','LAU-10','AGM-45A'],2:['TK','Mk-82','Mk-82AIR','Mk-83','Mk-20','LAU-10','AGM-45A','AGM-65A'],C:['PTB','Mk-82','Mk-83','Mk-84','Mk-20'],
       4:['TK','Mk-82','Mk-82AIR','Mk-83','Mk-20','LAU-10','AGM-45A','AGM-65A'],5:[...US_IR_OLD,'Mk-82','Mk-82AIR','Mk-20','LAU-10','AGM-45A']},
  load:{cold:{1:'AIM-9D',5:'AIM-9D',2:'TK',4:'TK'},modern:{1:'AIM-9G',5:'AIM-9G',2:'TK',4:'TK'},strike:{1:'AIM-9D',5:'AIM-9D',2:'Mk-82',4:'Mk-82',C:'Mk-83'}},
  cms:{cold:[30,0],modern:[30,30]},
  fv:{hw:4.2,y1:2.6,span:'8.38 m',fus:[.6,.66,.12],wing:[-.38,-.5,.5],tail:[1.8,.95,.2],eng:[[.66,.02,.22]],engSy:1.6,can:[.62,.36,.36],fins:[[0,.6,2.6]]},
  camp:{cold:{0:['STK']}}});

// ---- A-7D ----
addJet({id:'A-7D',src:'F-4E',side:'BLUE',name:'A-7D Corsair II',call:'SLUF',nctr:'A-7',foe:'MiG-21',eng:'TF41-A-1',rwr:'ALR-46',noAB:true,ccip:true,
  role:'USAF · ATTACK · TF41 · APQ-126 · FIRST CCIP HUD',stall:{s:.1,twin:0},
  ecm:{cold:{n:'ALQ-119(V)',jp:.7,dec:.5,kg:290,cd:.0012,warm:20},modern:{n:'ALQ-131(V)',jp:1,dec:.62,kg:300,cd:.0012,warm:20}},
  ac:Object.assign({},imp,{name:'A-7D Corsair II',model:makeA7,st:A7ST,empty:8668,fuel:4200,tank:910,S:34.84,CLa:4.0,cd0:.022,k:.12,mil:64500,ab:64500,spool:3.5,abLight:99,
    clt:clt(4.0,1.35,22,.06),cdm:sub(.04,.82),dW:13600,tkG:[5,6],dep:{a:24,rock:1.1,spin:2.4},ff:[.18,1.3,1.3],gLim:7,aoaLim:22,roll:3.4,fbw:false,noLimiter:true,
    rcs:5,irs:.8,pit:'phantom',eye:eyeOf(-4.4,.85),radar:R('APQ-126',15000,[5,10,20],'NM',.08),irst:false,pulse:true,
    gun:G_('M61A1',100,1030,9,1000,.0024),keepJ:[],rwr:'A7',spo:4,tankName:'300 gal tank',vne:1150}),
  stn:{1:['Mk-82','Mk-82AIR','Mk-20','CBU-87','LAU-10'],2:['TK',...US_BOMB,'GBU-12','GBU-10','LAU-10','AGM-65A','AGM-65B','AGM-45A'],3:['TK',...US_BOMB,'GBU-12','GBU-10','LAU-10','AGM-65A','AGM-65B'],
       4:US_IR,5:US_IR,6:['TK',...US_BOMB,'GBU-12','GBU-10','LAU-10','AGM-65A','AGM-65B'],7:['TK',...US_BOMB,'GBU-12','GBU-10','LAU-10','AGM-65A','AGM-65B','AGM-45A'],8:['Mk-82','Mk-82AIR','Mk-20','CBU-87','LAU-10']},
  load:{cold:{4:'AIM-9J',5:'AIM-9J',2:'TK',7:'TK'},modern:{4:'AIM-9L',5:'AIM-9L',2:'TK',7:'TK'},strike:{4:'AIM-9J',5:'AIM-9J',2:'TK',7:'TK',3:'Mk-82',6:'Mk-82',1:'Mk-82',8:'Mk-82'}},
  fv:{hw:5.9,y1:3.6,span:'11.80 m',fus:[.8,.8,.05],wing:[.62,.2,.7],tail:[2.7,.15,.3],can:[.95,.4,.36],nose:[-.25,.42],fins:[[0,.8,3.6]]},
  camp:{cold:{0:['STK']}}});

// ---- AV-8B ----
addJet({id:'AV-8B',src:'F-18C',side:'BLUE',name:'AV-8B Harrier II',call:'HARRIER',nctr:'AV-8B',foe:'MiG-23',eng:'F402-RR-408 (Pegasus 11-61)',rwr:'ALR-67(V)2',noAB:true,ccip:true,cv:true,app:110,
  vstol:{nozMax:98,key:true},role:'USMC · V/STOL ATTACK · PEGASUS · ARBS · GAU-12',stall:{s:.05,twin:0},
  ac:Object.assign({},imp,{name:'AV-8B Harrier II',model:makeAV8,st:AV8ST,empty:6340,fuel:3519,tank:910,S:22.61,CLa:4.3,cd0:.026,k:.115,mil:104000,ab:104000,spool:2.2,abLight:99,
    clt:clt(4.3,1.55,24,.12),cdm:sub(.05,.82),dW:10400,tkG:[5,6],dep:{a:26,rock:1.0,spin:2.4},ff:[.2,2.4,2.4],gLim:8,aoaLim:22,roll:4.2,fbw:false,noLimiter:false,
    rcs:3,irs:1.1,pit:'hornet',eye:eyeOf(-4.6,.68),radar:R('ARBS / angle-rate',8000,[5,10],'NM',.05),irst:false,pulse:true,
    gun:G_('GAU-12/U',60,1030,11,300,.0025),keepJ:['1','7'],rwr:'AV8',spo:4,tankName:'300 gal tank',vne:1150}),
  stn:{1:['AIM-9L','AIM-9M','Mk-82','Mk-20','LAU-10'],2:['TK','Mk-82','Mk-82AIR','Mk-83','Mk-20','CBU-87','GBU-12','AGM-65E','AGM-65F','LAU-10'],3:['TK','Mk-82','Mk-82AIR','Mk-83','Mk-20','CBU-87','GBU-12','AGM-65E','LAU-10'],
       C:['TGP'],5:['TK','Mk-82','Mk-82AIR','Mk-83','Mk-20','CBU-87','GBU-12','AGM-65E','LAU-10'],6:['TK','Mk-82','Mk-82AIR','Mk-83','Mk-20','CBU-87','GBU-12','AGM-65E','AGM-65F','LAU-10'],7:['AIM-9L','AIM-9M','Mk-82','Mk-20','LAU-10']},
  load:{cold:{1:'AIM-9L',7:'AIM-9L',3:'TK',5:'TK'},modern:{1:'AIM-9M',7:'AIM-9M',3:'TK',5:'TK'},strike:{1:'AIM-9L',7:'AIM-9L',2:'Mk-82',3:'Mk-82',5:'Mk-82',6:'Mk-82'}},
  cms:{cold:[60,60],modern:[60,60]},
  fv:{hw:4.7,y1:3.2,span:'9.25 m',fus:[.86,.8,.08],wing:[.82,.0,.6],tail:[2.2,.5,.2],eng:[[.95,-.4,.3]],can:[.95,.4,.42],fins:[[0,.6,2.6]],tips:[[4.0,.2]]},
  camp:{cold:{0:['STK']},modern:{0:['STK']}}});

// ---- Alpha Jet E ----
addJet({id:'Alpha Jet',src:'F-4E',side:'BLUE',name:'Alpha Jet E',call:'ALPHA',nctr:'ALPHA JET',foe:'MiG-21',eng:'2× Larzac 04-C6',rwr:'ALR-46',noAB:true,
  role:'FRANCE / GERMANY · LIGHT ATTACK / TRAINER · DEFA 553 POD',stall:{s:.1,twin:1},
  ac:Object.assign({},imp,{name:'Alpha Jet E',model:makeAlphaJet,st:AJST,empty:3515,fuel:1520,tank:250,ptb:250,S:17.5,CLa:4.2,cd0:.023,k:.13,mil:26480,ab:26480,spool:2.6,abLight:99,
    clt:clt(4.2,1.32,22,.05),cdm:sub(.05,.8),dW:5000,tkG:[5,6],dep:{a:24,rock:.9,spin:2.4},ff:[.06,.42,.42],gLim:7.5,aoaLim:22,roll:4.2,fbw:false,noLimiter:true,
    rcs:1.6,irs:.45,pit:'phantom',eye:eyeOf(-3.6,.7),radar:R('ranging only',5000,[2,5],'NM',.03),irst:false,pulse:true,
    gun:G_('DEFA 553 pod',21,820,26,150,.003),keepJ:[],rwr:'AJ',spo:4,tankName:'310 l tank',vne:1000}),
  stn:{1:['Magic 1','Mk-82','SAMP 250','Belouga','Matra F1','LAU-10'],2:['TK','Mk-82','SAMP 250','Belouga','Matra F1','LAU-10'],C:[],4:['TK','Mk-82','SAMP 250','Belouga','Matra F1','LAU-10'],5:['Magic 1','Mk-82','SAMP 250','Belouga','Matra F1','LAU-10']},
  load:{cold:{1:'Magic 1',5:'Magic 1',2:'TK',4:'TK'},strike:{2:'Matra F1',4:'Matra F1',1:'Mk-82',5:'Mk-82'}},
  cms:{cold:[0,0],modern:[30,30]},
  fv:{hw:4.6,y1:2.8,span:'9.11 m',fus:[.62,.7,.1],wing:[.62,.1,.5],tail:[2.2,.25,.2],eng:[[.7,.15,.25]],can:[.82,.4,.45],fins:[[0,.55,2.8]]},
  camp:{cold:{0:['STK']}}});

// ---- Super Etendard ----
addJet({id:'Super Etendard',src:'F-4E',side:'BLUE',name:'Super Étendard',call:'ETENDARD',nctr:'SUPER ETENDARD',foe:'MiG-21',eng:'Atar 8K-50',rwr:'ALR-46',noAB:true,cv:true,app:140,ccip:true,
  role:'FRANCE · CARRIER STRIKE · AGAVE · AM39 EXOCET',stall:{s:.25,twin:0},
  ac:Object.assign({},imp,{name:'Super Étendard',model:makeSEM,st:SEST,empty:6500,fuel:3270,tank:880,ptb:480,S:28.4,CLa:4.0,cd0:.022,k:.13,mil:49000,ab:49000,spool:3.2,abLight:99,
    clt:clt(4.0,1.3,22,.06),cdm:sup(.04,.88),dW:9500,tkG:[5,6],dep:{a:24,rock:1.0,spin:2.6},ff:[.14,1.3,1.3],gLim:6.5,aoaLim:22,roll:3.6,fbw:false,noLimiter:true,
    rcs:4,irs:.9,pit:'phantom',eye:eyeOf(-4.3,.68),radar:R('Agave',28000,[10,20,40],'KM',.12),irst:false,pulse:true,
    gun:G_('2× DEFA 552',40,800,26,250,.003),keepJ:[],rwr:'SEM',spo:4,tankName:'1,100 l tank',vne:1200}),
  stn:{1:['Magic 1','Magic 2','SAMP 250','Mk-82','Matra F1','LAU-10'],2:['TK','SAMP 250','SAMP 400','Mk-82','Belouga','Matra F1'],C:['PTB','SAMP 250','Mk-82'],
       4:['TK','AM39 Exocet','SAMP 250','SAMP 400','Mk-82','Belouga','Matra F1','AS-30L'],5:['Magic 1','Magic 2','SAMP 250','Mk-82','Matra F1','LAU-10']},
  load:{cold:{1:'Magic 1',5:'Magic 1',2:'TK',4:'AM39 Exocet'},modern:{1:'Magic 2',5:'Magic 2',2:'TK',4:'AM39 Exocet'},strike:{1:'Magic 1',5:'Magic 1',2:'TK',4:'AM39 Exocet'}},
  fv:{hw:4.8,y1:3.05,span:'9.60 m',fus:[.68,.7,.1],wing:[-.18,-.4,.6],tail:[2.6,.65,.2],eng:[[.72,.08,.26]],engSy:1.6,can:[.68,.4,.45],fins:[[0,.62,3.05]]},
  camp:{cold:{0:['STK']}}});

// ---- F-100A ----
addJet({id:'F-100A',src:'F-4E',side:'BLUE',name:'F-100A Super Sabre',call:'HUN',nctr:'F-100',foe:'MiG-19',eng:'J57-P-39',rwr:'ALR-45/50',
  role:'USAF · DAY FIGHTER · FIRST SUPERSONIC IN LEVEL FLIGHT · 4× M39',stall:{s:.35,twin:0},
  ac:Object.assign({},imp,{name:'F-100A Super Sabre',model:makeF100,st:F100ST,empty:8250,fuel:2250,tank:830,S:35.8,CLa:3.6,cd0:.02,k:.15,mil:45400,ab:71200,spool:4,abLight:.9,
    clt:clt(3.6,1.15,22,.02),cdm:sup(.034,.88),dW:12000,tkG:[5,6],dep:{a:22,rock:1.2,spin:2.8},ff:[.15,1.2,4.6],gLim:7.33,aoaLim:22,roll:3.4,fbw:false,noLimiter:true,adv:.4,
    rcs:5,irs:1.1,pit:'phantom',eye:eyeOf(-3.6,.66),radar:R('APG-30 ranging',2700,[1,2],'NM',.02),irst:false,pulse:true,
    gun:G_('4× M39',100,1030,9,800,.0026),keepJ:[],rwr:'100',spo:4,tankName:'275 gal tank',mcap:1.4,vne:1300}),
  stn:{1:['AIM-9B','Mk-82','Mk-83','LAU-10'],2:['TK','Mk-82','Mk-83','LAU-10'],3:['TK','Mk-82','Mk-83'],4:['TK','Mk-82','Mk-83'],5:['TK','Mk-82','Mk-83','LAU-10'],6:['AIM-9B','Mk-82','Mk-83','LAU-10']},
  load:{cold:{1:'AIM-9B',6:'AIM-9B',2:'TK',5:'TK'},strike:{1:'AIM-9B',6:'AIM-9B',2:'TK',5:'TK',3:'Mk-82',4:'Mk-82'}},
  cms:{cold:[0,0],modern:[30,30]},
  fv:{hw:5.9,y1:3.35,span:'11.82 m',fus:[.78,.78,.06],wing:[-.22,-.22,.7],tail:[2.75,-.25,.3],can:[.66,.42,.42],nose:[.02,.5],fins:[[0,.6,3.35]]},
  camp:{cold:{0:['CAP','ESC','STK']}}});

// ---- F-104S ----
addJet({id:'F-104S',src:'F-4E',side:'BLUE',name:'F-104S Starfighter',call:'ZIPPER',nctr:'F-104',foe:'MiG-21',eng:'J79-GE-19',rwr:'ALR-46',
  role:'ITALY · ALL-WEATHER INTERCEPTOR · R21G · ASPIDE',stall:{s:.25,twin:0},
  ac:Object.assign({},imp,{name:'F-104S Starfighter',model:makeF104,st:F104ST,empty:6760,fuel:2700,tank:520,ptb:620,S:18.22,CLa:3.3,cd0:.0175,k:.2,mil:52800,ab:79600,spool:4,abLight:.9,smoky:.2,
    clt:clt(3.3,1.0,15,.02),cdm:sup(.03,.9),dW:9500,tkG:[5,6],dep:{a:17,rock:1.4,spin:3.4},ff:[.16,1.5,6.4],gLim:7.33,aoaLim:15,roll:4.4,fbw:false,noLimiter:false,
    rcs:2.5,irs:1.2,pit:'phantom',eye:eyeOf(-4.6,.66),radar:R('R21G/M1',40000,[10,20,40],'KM',.3),irst:false,pulse:false,
    gun:G_('M61A1',100,1030,9,725,.0024),keepJ:['1','9'],rwr:'104',spo:4,tankName:'tip tank',mcap:2.2,vne:1350}),
  stn:{1:['TK',...US_IR],9:['TK',...US_IR],2:['Aspide','AIM-7E','AIM-7E-2','AIM-7F','TK','Mk-82','Mk-83','LAU-10'],8:['Aspide','AIM-7E','AIM-7E-2','AIM-7F','TK','Mk-82','Mk-83','LAU-10'],
       3:['Mk-82','Mk-83','LAU-10','TK'],7:['Mk-82','Mk-83','LAU-10','TK'],4:US_IR,6:US_IR,C:['PTB','Mk-82','Mk-83','Mk-84']},
  load:{cold:{1:'AIM-9J',9:'AIM-9J',2:'Aspide',8:'Aspide',4:'AIM-9J',6:'AIM-9J'},modern:{1:'AIM-9L',9:'AIM-9L',2:'Aspide',8:'Aspide',4:'AIM-9L',6:'AIM-9L'},strike:{1:'TK',9:'TK',3:'Mk-82',7:'Mk-82',C:'Mk-83'}},
  fv:{hw:3.5,y1:3.35,span:'6.68 m',fus:[.66,.68,.12],wing:[-.25,-.8,.6],tail:[1.8,3.3,.1],eng:[[.62,.05,.22]],engSy:1.8,can:[.68,.38,.42],nose:[.05,.36],fins:[[0,.6,3.3]],tips:[[3.35,-.8]]},
  camp:{cold:{0:['INT','CAP']},modern:{0:['INT']}}});

// ---- F-106A ----
addJet({id:'F-106A',src:'F-4E',side:'BLUE',name:'F-106A Delta Dart',call:'SIX',nctr:'F-106',foe:'MiG-25',eng:'J75-P-17',rwr:'ALR-46',irstn:'MA-1 IR search set',dl:true,
  role:'USAF ADC · INTERCEPTOR · MA-1 / SAGE · AIM-4 FALCON · SIX SHOOTER',stall:{s:.3,twin:0},
  ac:Object.assign({},imp,{name:'F-106A Delta Dart',model:makeF106,st:F106ST,empty:11077,fuel:4580,tank:1100,S:64.8,CLa:2.9,cd0:.0155,k:.21,mil:76500,ab:109000,spool:4.2,abLight:.9,
    clt:clt(2.9,1.15,28,.0),cdm:sup(.024,.92),dW:15500,tkG:[4,5],dep:{a:30,rock:.8,spin:2.4},ff:[.2,1.9,7],gLim:7,aoaLim:26,roll:3.4,fbw:false,noLimiter:true,
    rcs:8,irs:1.3,pit:'phantom',eye:eyeOf(-6.2,.88),radar:R('MA-1',35*NM,[10,20,40,80],'NM',.35),irst:true,ols:{tail:18000,head:6000,lrf:0},pulse:true,
    gun:G_('M61A1 (Six Shooter)',100,1030,9,650,.0024),keepJ:[],rwr:'106',spo:4,tankName:'360 gal tank',mcap:2.3,vne:1350}),
  stn:{1:['AIM-4F','AIM-4G'],2:['AIM-4F','AIM-4G'],3:['AIM-4F','AIM-4G'],4:['AIM-4F','AIM-4G'],5:['TK'],6:['TK']},
  load:{cold:{1:'AIM-4F',2:'AIM-4F',3:'AIM-4G',4:'AIM-4G',5:'TK',6:'TK'}},
  cms:{cold:[30,0],modern:[30,30]},
  fv:{hw:5.9,y1:4.8,span:'11.67 m',fus:[1.0,.92,0],wing:[-.45,-.45,.9],eng:[[.98,.15,.32]],engSy:1.8,can:[.92,.46,.46],fins:[[0,.85,4.8]]},
  camp:{cold:{0:['INT','CAP']}}});

// ---- F-111F ----
{const sw={a:[16,45,72],rate:4,auto:false,S:[48.77,48.77,48.77],CLa:[4.6,3.6,2.5],cd0:[.0225,.02,.0175],k:[.08,.13,.24],aoaLim:[20,18,16],gLim:[6.5,7.33,6],roll:[2.6,2.4,1.8],
  vne:[800,1200,1480],dep:[{a:24,rock:1.0,spin:2.4},{a:22,rock:.9,spin:2.4},{a:19,rock:.9,spin:2.2}],
  clt:[clt(4.6,1.5,20,.08).map(v=>v[1]),clt(3.6,1.15,20,.04).map(v=>v[1]),clt(2.5,.85,18,.02).map(v=>v[1])],
  cdm:[sub(.07,.75),sup(.032,.84),sup(.022,.92)]};
addJet({id:'F-111F',src:'F-4E',side:'BLUE',name:'F-111F Aardvark',call:'AARDVARK',nctr:'F-111',foe:'MiG-23',eng:'2× TF30-P-100',rwr:'ALR-46',crew:'WSO',ccip:true,swing:true,
  role:'USAF · LONG-RANGE STRIKE · SWING WING · PAVE TACK · PILOT + WSO SIDE BY SIDE',stall:{s:.7,twin:1},
  ecm:{cold:{n:'ALQ-94',jp:1.2,dec:.6,kg:0,cd:0,warm:20},modern:{n:'ALQ-137',jp:1.4,dec:.66,kg:0,cd:0,warm:20}},
  ac:Object.assign({},imp,{name:'F-111F Aardvark',model:makeF111,st:F111ST,empty:21537,fuel:14700,tank:1830,S:48.77,CLa:3.6,cd0:.02,k:.13,mil:124600,ab:223400,spool:3.6,abLight:.8,adv:.3,
    clt:clt(3.6,1.15,20,.04),cdm:sup(.032,.84),dW:36000,tkG:[4,5],dep:{a:22,rock:.9,spin:2.4},ff:[.4,3.4,14],gLim:7.33,aoaLim:18,roll:2.4,fbw:false,noLimiter:false,
    rcs:12,irs:1.4,pit:'phantom',eye:eyeOf(-6.8,.88),radar:R('APQ-144 / Pave Tack',18000,[5,10,20,40],'NM',.05),irst:false,pulse:true,
    gun:NOGUN,keepJ:[],rwr:'111',spo:4,tankName:'600 gal tank',mcap:2.2,vne:1480,swing:sw}),
  stn:{2:['TK','AIM-9P','AIM-9J','Mk-82','Mk-84','GBU-12','GBU-10','GBU-24','CBU-87'],3:['Mk-82','Mk-84','GBU-12','GBU-10','GBU-24','CBU-87','Mk-20'],4:['TK','Mk-82','Mk-84','GBU-12','GBU-10','GBU-24','GBU-28','CBU-87','Mk-20'],
       C:['TGP'],6:['TK','Mk-82','Mk-84','GBU-12','GBU-10','GBU-24','GBU-28','CBU-87','Mk-20'],7:['Mk-82','Mk-84','GBU-12','GBU-10','GBU-24','CBU-87','Mk-20'],8:['TK','AIM-9P','AIM-9J','Mk-82','Mk-84','GBU-12','GBU-10','GBU-24','CBU-87']},
  load:{cold:{2:'AIM-9P',8:'AIM-9P',4:'GBU-10',6:'GBU-10',C:'TGP'},modern:{2:'AIM-9P',8:'AIM-9P',4:'GBU-24',6:'GBU-24',C:'TGP'},strike:{2:'AIM-9P',8:'AIM-9P',3:'GBU-12',7:'GBU-12',4:'GBU-10',6:'GBU-10',C:'TGP'}},
  cms:{cold:[60,30],modern:[90,45]},
  fv:{hw:9.6,y1:5.2,span:'19.20 m spread',fus:[1.3,.88,.05],wing:[.42,.3,1.4],tail:[4.3,.0,.5],eng:[[.66,.0,.3]],can:[.86,.95,.4],fins:[[0,.85,5.2]]},
  camp:{cold:{0:['STK']},modern:{0:['STK']}}});}

// ---- F-20 ----
addJet({id:'F-20',src:'F-16',side:'BLUE',name:'F-20A Tigershark',call:'TIGERSHARK',nctr:'F-20',foe:'MiG-23',eng:'F404-GE-100',rwr:'ALR-69',ccip:true,
  role:'US · EXPORT LIGHTWEIGHT FIGHTER · APG-67 · F404 · 9 G',stall:{s:.05,twin:0},
  ac:{name:'F-20A Tigershark',model:makeF20,st:F5ST,empty:5090,fuel:2005,tank:830,ptb:830,S:17.28,CLa:4.1,cd0:.0175,k:.135,mil:48900,ab:75600,spool:1.8,abLight:.6,
    clt:clt(4.1,1.38,28,.05),cdm:sup(.024,.88),dW:8000,tkG:[6,7],dep:{a:30,rock:.8,spin:2.4},ff:[.12,1.2,4.6],gLim:9,aoaLim:28,roll:4.6,fbw:false,noLimiter:true,
    rcs:1.8,irs:.95,eye:eyeOf(-4.0,.58),radar:R('APG-67(V)',30*NM,[10,20,40,80],'NM',.55),irst:false,pulse:false,
    gun:G_('2× M39A2',50,1030,9,560,.0026),keepJ:['1','7'],rwr:'20',spo:4,tankName:'275 gal tank',mcap:2.0},
  stn:{1:US_IR,7:US_IR,2:[...US_BOMB,'AGM-65A','AGM-65B','AGM-65D','LAU-10'],6:[...US_BOMB,'AGM-65A','AGM-65B','AGM-65D','LAU-10'],
       3:['TK','AIM-7F','AIM-7M',...US_BOMB,'AGM-65A','AGM-65B','AGM-65D','LAU-10'],5:['TK','AIM-7F','AIM-7M',...US_BOMB,'AGM-65A','AGM-65B','AGM-65D','LAU-10'],C:['PTB','Mk-82','Mk-83','Mk-84']},
  load:{cold:{1:'AIM-9L',7:'AIM-9L',3:'AIM-7F',5:'AIM-7F',C:'PTB'},modern:{1:'AIM-9M',7:'AIM-9M',3:'AIM-7M',5:'AIM-7M',C:'PTB'},strike:{1:'AIM-9L',7:'AIM-9L',2:'Mk-82',6:'Mk-82',3:'AGM-65B',5:'AGM-65B',C:'PTB'}},
  cms:{cold:[30,30],modern:[30,30]},
  fv:{hw:4.3,y1:2.65,span:'8.13 m',fus:[.8,.6,.05],wing:[-.22,-.22,.6],tail:[2.3,.15,.2],eng:[[.78,0,.2]],engSy:1.8,can:[.58,.36,.4],fins:[[0,.55,2.65]],tips:[[4.07,-.08]]},
  camp:{cold:{0:['CAP','ESC']}}});

// ---- F-5E ----
addJet({id:'F-5E',src:'F-4E',side:'BLUE',name:'F-5E Tiger II',call:'TIGER',nctr:'F-5',foe:'MiG-21',eng:'2× J85-GE-21B',rwr:'ALR-46',
  role:'US · LIGHTWEIGHT FIGHTER / AGGRESSOR · APQ-159 · 2× M39',stall:{s:.1,twin:1},
  ac:Object.assign({},imp,{name:'F-5E Tiger II',model:makeF5,st:F5ST,empty:4349,fuel:2050,tank:830,ptb:830,S:17.28,CLa:4.0,cd0:.019,k:.14,mil:31000,ab:44400,spool:2.2,abLight:.6,
    clt:clt(4.0,1.32,26,.05),cdm:sup(.026,.88),dW:7000,tkG:[5,6],dep:{a:28,rock:.9,spin:2.6},ff:[.1,.85,3.2],gLim:7.33,aoaLim:26,roll:4.5,fbw:false,noLimiter:true,
    rcs:1.5,irs:.8,pit:'phantom',eye:eyeOf(-4.0,.58),radar:R('APQ-159',13*NM,[5,10,20],'NM',.05),irst:false,pulse:true,
    gun:G_('2× M39A2',50,1030,9,560,.0026),keepJ:['1','7'],rwr:'F5',spo:4,tankName:'275 gal tank',mcap:1.6}),
  stn:{1:US_IR,7:US_IR,2:['Mk-82','Mk-82AIR','Mk-20','LAU-10','CBU-87'],6:['Mk-82','Mk-82AIR','Mk-20','LAU-10','CBU-87'],
       3:['TK','Mk-82','Mk-82AIR','Mk-83','Mk-20','LAU-10','AGM-65A','AGM-65B'],5:['TK','Mk-82','Mk-82AIR','Mk-83','Mk-20','LAU-10','AGM-65A','AGM-65B'],C:['PTB','Mk-82','Mk-83','Mk-84']},
  load:{cold:{1:'AIM-9P',7:'AIM-9P',C:'PTB'},modern:{1:'AIM-9L',7:'AIM-9L',C:'PTB'},strike:{1:'AIM-9P',7:'AIM-9P',3:'Mk-82',5:'Mk-82',2:'Mk-82',6:'Mk-82',C:'PTB'}},
  fv:{hw:4.3,y1:2.75,span:'8.13 m',fus:[.8,.6,.05],wing:[-.22,-.22,.6],tail:[2.3,.15,.2],eng:[[.78,0,.2]],engSy:1.8,can:[.58,.36,.4],fins:[[0,.55,2.75]],tips:[[4.07,-.08]]},
  camp:{cold:{0:['CAP','ESC','STK']}}});

// ---- F-86F ----
addJet({id:'F-86F',src:'F-4E',side:'BLUE',name:'F-86F Sabre',call:'SABRE',nctr:'F-86',foe:'MiG-15',eng:'J47-GE-27',rwr:'ALR-45/50',noAB:true,
  role:'USAF · KOREAN WAR DAY FIGHTER · 6× .50 CAL · A-4 SIGHT / APG-30',stall:{s:.25,twin:0},
  ac:Object.assign({},imp,{name:'F-86F Sabre',model:makeF86,st:F86ST,empty:5045,fuel:1320,tank:365,S:29.1,CLa:4.0,cd0:.0185,k:.12,mil:26300,ab:26300,spool:4.5,abLight:99,
    clt:clt(4.0,1.25,20,.02),cdm:sub(.06,.88),dW:7000,tkG:[5,6],dep:{a:22,rock:1.0,spin:2.8},ff:[.1,.85,.85],gLim:7.33,aoaLim:20,roll:4.0,fbw:false,noLimiter:true,
    rcs:3,irs:.6,pit:'phantom',eye:eyeOf(-2.3,.62),radar:R('APG-30 ranging',2700,[1,2],'NM',.02),irst:false,pulse:true,
    gun:G_('6× M3 .50',120,890,3.2,1800,.0035),keepJ:[],rwr:'86',spo:4,tankName:'120 gal tank',vne:1100}),
  stn:{1:['TK','Mk-82','AIM-9B'],2:['TK','Mk-82','Mk-83'],3:['TK','Mk-82','Mk-83'],4:['TK','Mk-82','AIM-9B']},
  load:{cold:{2:'TK',3:'TK'},modern:{1:'AIM-9B',4:'AIM-9B',2:'TK',3:'TK'},guns:{},strike:{1:'Mk-82',4:'Mk-82',2:'TK',3:'TK'}},
  cms:{cold:[0,0],modern:[0,0]},
  fv:{hw:5.65,y1:2.85,span:'11.31 m',fus:[.72,.8,.05],wing:[-.4,-.05,.6],tail:[2.35,.45,.2],can:[.62,.4,.4],nose:[0,.48],fins:[[0,.6,2.85]]},
  camp:{cold:{0:['CAP','ESC']}}});

// ---- F-8E ----
addJet({id:'F-8E',src:'F-4E',side:'BLUE',name:'F-8E Crusader',call:'CRUSADER',nctr:'F-8',foe:'MiG-21',eng:'J57-P-20A',rwr:'ALR-45/50',cv:true,app:145,
  role:'US NAVY · LAST OF THE GUNFIGHTERS · 4× Mk 12 · APQ-94 · AIM-9D',stall:{s:.3,twin:0},
  ac:Object.assign({},imp,{name:'F-8E Crusader',model:makeF8,st:F8ST,empty:9040,fuel:4100,tank:0,S:34.8,CLa:3.8,cd0:.0185,k:.14,mil:47600,ab:80100,spool:4,abLight:.9,
    clt:clt(3.8,1.22,22,.04),cdm:sup(.03,.9),dW:12500,tkG:[5,6],dep:{a:24,rock:1.1,spin:2.8},ff:[.15,1.3,5.2],gLim:6.4,aoaLim:22,roll:3.8,fbw:false,noLimiter:true,adv:.3,
    rcs:5,irs:1.1,pit:'phantom',eye:eyeOf(-5.0,.8),radar:R('APQ-94',15*NM,[5,10,20],'NM',.1),irst:false,pulse:true,
    gun:G_('4× Mk 12',67,840,10,576,.003),keepJ:[],rwr:'F8',spo:4,tankName:'—',mcap:1.8}),
  stn:{1:US_IR_OLD,2:US_IR_OLD,3:US_IR_OLD,4:US_IR_OLD,5:['Mk-82','Mk-83','Mk-84','LAU-10'],6:['Mk-82','Mk-83','Mk-84','LAU-10']},
  load:{cold:{1:'AIM-9D',2:'AIM-9D',3:'AIM-9D',4:'AIM-9D'},strike:{1:'AIM-9D',3:'AIM-9D',5:'Mk-83',6:'Mk-83'}},
  cms:{cold:[0,0],modern:[30,30]},
  fv:{hw:5.45,y1:3.9,span:'10.87 m',fus:[.84,.84,.05],wing:[1.0,.6,.7],tail:[2.95,-.15,.3],eng:[[0,-.6,.36]],engSy:.5,can:[.8,.4,.44],nose:[.12,.4],fins:[[0,.75,3.9]]},
  camp:{cold:{0:['CAP','ESC']}}});

// ---- J 35F Draken ----
addJet({id:'J 35F',src:'F-4E',side:'BLUE',name:'J 35F Draken',call:'DRAKEN',nctr:'J 35',foe:'MiG-21',eng:'RM6C (Avon 300)',rwr:'ALR-46',irstn:'S71N IR sensor',dl:true,
  role:'SWEDEN · INTERCEPTOR · DOUBLE DELTA · PS-01 · Rb 27 / Rb 28 · STRIL DATALINK',stall:{s:.3,twin:0},
  ac:Object.assign({},met,{cockpit:'viper',name:'J 35F Draken',model:makeJ35,st:J35ST,empty:7425,fuel:3250,tank:400,S:49.2,CLa:3.1,cd0:.0165,k:.19,mil:56900,ab:77500,spool:3.4,abLight:.8,
    clt:clt(3.1,1.2,26,.0),cdm:sup(.026,.9),dW:11000,tkG:[5,6],dep:{a:25,rock:1.2,spin:3.2},ff:[.15,1.6,6.5],gLim:7,aoaLim:24,roll:4.2,fbw:false,noLimiter:true,
    rcs:4,irs:1.1,pit:'phantom',eye:eyeOf(-4.4,.58),radar:R('PS-01/A',30000,[10,25,50],'KM',.25),irst:true,ols:{tail:12000,head:4000,lrf:0},pulse:true,
    gun:G_('ADEN M/55',20,790,26,90,.003),keepJ:[],rwr:'35',spo:4,tankName:'500 l tank',mcap:2.0}),
  stn:{1:['Rb 24','Rb 24J'],6:['Rb 24','Rb 24J'],2:['Rb 27','Rb 28','Rb 24','Rb 24J','m/71'],5:['Rb 27','Rb 28','Rb 24','Rb 24J','m/71'],3:['TK','Rb 27','Rb 28','m/71'],4:['TK','Rb 27','Rb 28','m/71']},
  load:{cold:{2:'Rb 27',5:'Rb 28',1:'Rb 24J',6:'Rb 24J',3:'TK',4:'TK'},strike:{1:'Rb 24J',6:'Rb 24J',2:'m/71',5:'m/71',3:'m/71',4:'m/71'}},
  cms:{cold:[0,0],modern:[30,30]},
  fv:{hw:4.7,y1:3.2,span:'9.42 m',fus:[.72,.66,.05],wing:[-.18,-.18,.7],eng:[[.72,0,.2]],engSy:1.8,can:[.58,.36,.42],nose:[0,.3],fins:[[0,.6,3.2]]},
  camp:{cold:{0:['INT','CAP']}}});

// ---- AJS 37 Viggen ----
addJet({id:'AJS-37',src:'F-4E',side:'BLUE',name:'AJS 37 Viggen',call:'VIGGEN',nctr:'AJ 37',foe:'MiG-23',eng:'RM8A',rwr:'ALR-46',ccip:true,dl:true,
  role:'SWEDEN · ATTACK · CANARD DELTA · PS-37 · Rb 04E / Rb 15F / Rb 75 · NO GUN',stall:{s:.3,twin:0},
  ac:Object.assign({},met,{cockpit:'viper',name:'AJS 37 Viggen',model:makeAJS37,st:VIGST,empty:11800,fuel:4500,tank:0,ptb:1200,S:46,CLa:3.3,cd0:.019,k:.17,mil:65600,ab:115600,spool:2.8,abLight:.6,
    clt:clt(3.3,1.4,26,.08),cdm:sup(.03,.9),dW:16000,tkG:[5,6],dep:{a:26,rock:.9,spin:2.6},ff:[.2,1.7,9],gLim:7,aoaLim:24,roll:3.6,fbw:false,noLimiter:false,
    rcs:6,irs:1.2,pit:'phantom',eye:eyeOf(-4.9,.78),radar:R('PS-37/A',25000,[15,30,60],'KM',.1),irst:false,pulse:true,
    gun:NOGUN,keepJ:[],rwr:'37',spo:4,tankName:'1,350 l tank',mcap:2.0}),
  stn:{1:['Rb 74','Rb 24J','Rb 24','ARAK 135'],7:['Rb 74','Rb 24J','Rb 24','ARAK 135'],2:['Rb 04E','Rb 15F','Rb 75','m/71','ARAK 135','Rb 74','Rb 24J'],6:['Rb 04E','Rb 15F','Rb 75','m/71','ARAK 135','Rb 74','Rb 24J'],
       3:['Rb 75','m/71','ARAK 135'],5:['Rb 75','m/71','ARAK 135'],C:['PTB','Rb 04E','Rb 15F','m/71']},
  load:{cold:{1:'Rb 24J',7:'Rb 24J',2:'Rb 74',6:'Rb 74',C:'PTB'},modern:{1:'Rb 74',7:'Rb 74',2:'Rb 15F',6:'Rb 15F',C:'PTB'},strike:{1:'Rb 24J',7:'Rb 24J',2:'Rb 75',6:'Rb 75',3:'m/71',5:'m/71',C:'PTB'}},
  cms:{cold:[30,30],modern:[60,60]},
  fv:{hw:5.3,y1:4.4,span:'10.60 m',fus:[.84,.82,.05],wing:[-.1,-.32,.85],tail:[2.95,.42,.85],eng:[[.92,.12,.24]],engSy:2,can:[.78,.4,.46],nose:[.1,.4],fins:[[0,.8,4.4]]},
  camp:{cold:{0:['STK']},modern:{0:['STK']}}});

// ---- AMX ----
addJet({id:'AMX',src:'F-16',side:'BLUE',name:'AMX (A-11 Ghibli)',call:'GHIBLI',nctr:'AMX',foe:'MiG-23',eng:'Spey 807',rwr:'ALR-69',noAB:true,ccip:true,
  role:'ITALY / BRAZIL · LIGHT ATTACK · EL/M-2001B RANGING · HUD + MFD',stall:{s:.1,twin:0},
  ac:{name:'AMX (A-11 Ghibli)',model:makeAMX,st:AMXST,empty:6700,fuel:2790,tank:800,ptb:460,S:21,CLa:4.2,cd0:.021,k:.13,mil:49100,ab:49100,spool:3,abLight:99,
    clt:clt(4.2,1.38,22,.06),cdm:sub(.045,.84),dW:9600,tkG:[5,6],dep:{a:24,rock:.9,spin:2.4},ff:[.14,1.1,1.1],gLim:7.33,aoaLim:22,roll:3.8,fbw:true,
    rcs:2.5,irs:.8,eye:eyeOf(-3.9,.7),radar:R('EL/M-2001B',12000,[5,10],'NM',.05),irst:false,pulse:true,
    gun:G_('M61A1',100,1030,9,350,.0024),keepJ:['1','7'],rwr:'AMX',spo:4,tankName:'1,000 l tank',vne:1150},
  stn:{1:['AIM-9L','AIM-9P'],7:['AIM-9L','AIM-9P'],2:['TK','Mk-82','Mk-83','Mk-20','CBU-87','LAU-10','GBU-12'],6:['TK','Mk-82','Mk-83','Mk-20','CBU-87','LAU-10','GBU-12'],
       3:['TK','Mk-82','Mk-83','Mk-84','Mk-20','CBU-87','GBU-12','AGM-65A'],5:['TK','Mk-82','Mk-83','Mk-84','Mk-20','CBU-87','GBU-12','AGM-65A'],C:['PTB','Mk-82','Mk-83','Mk-84','TGP']},
  load:{cold:{1:'AIM-9L',7:'AIM-9L',3:'TK',5:'TK'},modern:{1:'AIM-9L',7:'AIM-9L',3:'TK',5:'TK',C:'TGP'},strike:{1:'AIM-9L',7:'AIM-9L',2:'Mk-82',6:'Mk-82',3:'Mk-83',5:'Mk-83',C:'PTB'}},
  fv:{hw:4.5,y1:2.95,span:'8.87 m',fus:[.7,.72,.1],wing:[.55,.2,.6],tail:[2.4,.35,.2],eng:[[.78,.18,.22]],engSy:1.8,can:[.7,.38,.44],fins:[[0,.6,2.95]],tips:[[4.45,-.08]]},
  camp:{cold:{0:['STK']},modern:{0:['STK']}}});

// ---- Lightning F.6 ----
addJet({id:'Lightning F.6',src:'F-4E',side:'BLUE',name:'Lightning F.6',call:'LIGHTNING',nctr:'LIGHTNING',foe:'MiG-21',eng:'2× Avon 301R',rwr:'ALR-45/50',
  role:'UK · POINT-DEFENCE INTERCEPTOR · STACKED AVONS · AI.23B · RED TOP',stall:{s:.25,twin:1},
  ac:Object.assign({},imp,{name:'Lightning F.6',model:makeLightning,st:LTST,empty:12700,fuel:4900,tank:950,S:42.97,CLa:3.2,cd0:.0185,k:.17,mil:113000,ab:145400,spool:3,abLight:.7,
    clt:clt(3.2,1.2,24,.02),cdm:sup(.03,.9),dW:16000,tkG:[5,6],dep:{a:24,rock:1.0,spin:2.6},ff:[.3,2.6,11],gLim:6,aoaLim:22,roll:4.0,fbw:false,noLimiter:true,
    rcs:6,irs:1.5,pit:'phantom',eye:eyeOf(-5.2,1.0),radar:R('AI.23B Airpass',15*NM,[5,10,20,40],'NM',.15),irst:false,pulse:true,
    gun:G_('2× ADEN 30 mm',40,790,26,240,.003),keepJ:[],rwr:'LTN',spo:4,tankName:'260 gal overwing tank',mcap:2.0}),
  stn:{1:['Red Top','Firestreak'],2:['Red Top','Firestreak'],3:['TK'],4:['TK']},
  load:{cold:{1:'Red Top',2:'Red Top'},modern:{1:'Red Top',2:'Red Top'}},
  cms:{cold:[0,0],modern:[0,0]},
  fv:{hw:5.3,y1:3.7,span:'10.62 m',fus:[.76,1.0,0],wing:[-.05,-.15,.7],tail:[2.75,-.75,.3],can:[1.0,.36,.42],nose:[0,.5,.3],fins:[[0,.95,3.7]]},
  camp:{cold:{0:['INT','CAP']}}});

// ---- Mirage IIIE ----
addJet({id:'Mirage III',src:'F-4E',side:'BLUE',name:'Mirage IIIE',call:'MIRAGE',nctr:'MIRAGE III',foe:'MiG-21',eng:'Atar 9C',rwr:'ALR-46',
  role:'FRANCE · DELTA MULTIROLE · CYRANO II · R530 · MAGIC',stall:{s:.3,twin:0},
  ac:Object.assign({},imp,{name:'Mirage IIIE',model:makeMirage3,st:M3ST,empty:7050,fuel:2390,tank:1360,ptb:400,S:35,CLa:2.9,cd0:.0155,k:.2,mil:41970,ab:60800,spool:3.2,abLight:.8,
    clt:clt(2.9,1.15,28,.0),cdm:sup(.025,.9),dW:9500,tkG:[5,6],dep:{a:28,rock:.9,spin:2.6},ff:[.13,1.15,5],gLim:7,aoaLim:26,roll:4.0,fbw:false,noLimiter:true,
    rcs:3,irs:1.0,pit:'phantom',eye:eyeOf(-4.7,.62),radar:R('Cyrano II',28000,[10,20,40],'KM',.1),irst:false,pulse:true,
    gun:G_('2× DEFA 552',40,800,26,250,.003),keepJ:[],rwr:'M3',spo:4,tankName:'1,700 l tank',mcap:2.2}),
  stn:{1:['Magic 1','Magic 2','AIM-9B','AIM-9J','SAMP 250','Matra F1'],5:['Magic 1','Magic 2','AIM-9B','AIM-9J','SAMP 250','Matra F1'],2:['TK','SAMP 250','SAMP 400','Belouga','Matra F1','AS-37 Martel'],4:['TK','SAMP 250','SAMP 400','Belouga','Matra F1','AS-37 Martel'],
       C:['R530','PTB','SAMP 250','SAMP 400','AS-30L','AS-37 Martel']},
  load:{cold:{1:'Magic 1',5:'Magic 1',C:'R530',2:'TK',4:'TK'},modern:{1:'Magic 2',5:'Magic 2',C:'R530',2:'TK',4:'TK'},strike:{1:'Magic 1',5:'Magic 1',2:'SAMP 250',4:'SAMP 250',C:'SAMP 400'}},
  fv:{hw:4.15,y1:3.6,span:'8.22 m',fus:[.72,.74,.05],wing:[-.25,-.25,.7],eng:[[.72,0,.18]],engSy:2.2,can:[.62,.38,.42],nose:[0,.3],fins:[[0,.62,3.6]]},
  camp:{cold:{0:['CAP','INT','STK']}}});

// ---- Mirage F1C ----
addJet({id:'Mirage F1',src:'F-4E',side:'BLUE',name:'Mirage F1C',call:'MIRAGE',nctr:'MIRAGE F1',foe:'MiG-23',eng:'Atar 9K-50',rwr:'ALR-46',
  role:'FRANCE · ALL-WEATHER INTERCEPTOR · CYRANO IV · SUPER 530F',stall:{s:.3,twin:0},
  ac:Object.assign({},imp,{name:'Mirage F1C',model:makeMirageF1,st:F1ST,empty:7400,fuel:3400,tank:950,ptb:950,S:25,CLa:4.1,cd0:.0175,k:.135,mil:49200,ab:70600,spool:3,abLight:.75,
    clt:clt(4.1,1.4,24,.05),cdm:sup(.027,.88),dW:11000,tkG:[5,6],dep:{a:26,rock:.9,spin:2.6},ff:[.15,1.35,5.8],gLim:7,aoaLim:24,roll:4.0,fbw:false,noLimiter:true,
    rcs:4,irs:1.1,pit:'phantom',eye:eyeOf(-4.6,.66),radar:R('Cyrano IV',45000,[10,20,40,80],'KM',.3),irst:false,pulse:false,
    gun:G_('2× DEFA 553',42,800,26,250,.003),keepJ:['1','7'],rwr:'F1',spo:4,tankName:'1,200 l tank',mcap:2.2}),
  stn:{1:['Magic 1','Magic 2','AIM-9J','AIM-9P'],7:['Magic 1','Magic 2','AIM-9J','AIM-9P'],2:['SAMP 250','Belouga','Matra F1'],6:['SAMP 250','Belouga','Matra F1'],
       3:['Super 530F','R530','TK','SAMP 250','SAMP 400','Belouga','Matra F1','AS-30L'],5:['Super 530F','R530','TK','SAMP 250','SAMP 400','Belouga','Matra F1','AS-30L'],C:['PTB','SAMP 250','SAMP 400']},
  load:{cold:{1:'Magic 1',7:'Magic 1',3:'Super 530F',5:'Super 530F',C:'PTB'},modern:{1:'Magic 2',7:'Magic 2',3:'Super 530F',5:'Super 530F',C:'PTB'},strike:{1:'Magic 1',7:'Magic 1',2:'SAMP 250',6:'SAMP 250',3:'TK',5:'TK',C:'SAMP 400'}},
  fv:{hw:4.25,y1:3.6,span:'8.40 m',fus:[.74,.74,.05],wing:[.55,.3,.7],tail:[2.6,.25,.2],eng:[[.75,.05,.18]],engSy:2.4,can:[.66,.38,.42],nose:[0,.3],fins:[[0,.7,3.6]],tips:[[4.2,-.08]]},
  camp:{cold:{0:['CAP','INT','ESC']}}});

// ---- Mirage 2000C ----
addJet({id:'Mirage 2000',src:'F-16',side:'BLUE',name:'Mirage 2000C',call:'MIRAGE',nctr:'MIRAGE 2000',foe:'MiG-29',eng:'M53-P2',rwr:'ALR-69',ccip:true,
  role:'FRANCE · FBW DELTA · RDI · SUPER 530D · MAGIC 2 · 2× DEFA 554',stall:{s:.1,twin:0},
  ecm:{cold:{n:'Sabre',jp:1,dec:.6,kg:0,cd:0,warm:20},modern:{n:'Sabre',jp:1.2,dec:.66,kg:0,cd:0,warm:20}},
  ac:{name:'Mirage 2000C',model:makeMirage2000,st:M2KST,empty:7500,fuel:3160,tank:1350,ptb:1050,S:41,CLa:3.0,cd0:.016,k:.18,mil:64300,ab:95100,spool:2.2,abLight:.6,
    clt:clt(3.0,1.45,32,.02),cdm:sup(.025,.9),dW:10500,tkG:[5.5,7],dep:{a:36,rock:.6,spin:2.0},ff:[.15,1.4,6.8],gLim:9,aoaLim:29,roll:4.8,fbw:true,
    rcs:2.5,irs:1.1,eye:eyeOf(-4.3,.72),radar:R('RDI',45*NM,[10,20,40,80],'NM',.55),irst:false,pulse:false,
    gun:G_('2× DEFA 554',60,800,26,250,.0028),keepJ:['1','9'],rwr:'M2',spo:4,tankName:'1,700 l tank',mcap:2.2},
  stn:{1:['Magic 2','Magic 1'],9:['Magic 2','Magic 1'],2:['Super 530D','Super 530F','TK','SAMP 250','GBU-12','Belouga'],8:['Super 530D','Super 530F','TK','SAMP 250','GBU-12','Belouga'],
       3:['SAMP 250','Mk-82','Belouga'],7:['SAMP 250','Mk-82','Belouga'],4:['SAMP 250','Mk-82','Belouga'],6:['SAMP 250','Mk-82','Belouga'],C:['PTB','SAMP 400','GBU-12']},
  load:{cold:{1:'Magic 2',9:'Magic 2',2:'Super 530F',8:'Super 530F',C:'PTB'},modern:{1:'Magic 2',9:'Magic 2',2:'Super 530D',8:'Super 530D',C:'PTB'},strike:{1:'Magic 2',9:'Magic 2',3:'SAMP 250',7:'SAMP 250',4:'SAMP 250',6:'SAMP 250',C:'PTB'}},
  cms:{cold:[112,32],modern:[112,32]},
  fv:{hw:4.6,y1:4.0,span:'9.13 m',fus:[.8,.78,.05],wing:[-.22,-.22,.75],eng:[[.78,.05,.2]],engSy:2.3,can:[.72,.4,.44],nose:[.05,.3],fins:[[0,.75,4.0]]},
  camp:{cold:{0:['CAP','ESC','INT']},modern:{0:['CAP','ESC']}}});

// ---- Jaguar A ----
addJet({id:'Jaguar',src:'F-4E',side:'BLUE',name:'Jaguar A',call:'JAGUAR',nctr:'JAGUAR',foe:'MiG-21',eng:'2× Adour Mk 102',rwr:'ALR-46',ccip:true,
  role:'FRANCE / UK · LOW-LEVEL STRIKE · NAV-ATTACK + LRMTS · AS-37 MARTEL',stall:{s:.15,twin:1},
  ac:Object.assign({},imp,{name:'Jaguar A',model:makeJaguar,st:JAGST,empty:7000,fuel:3337,tank:950,ptb:950,S:24.18,CLa:3.9,cd0:.02,k:.14,mil:45500,ab:65000,spool:2.4,abLight:.7,
    clt:clt(3.9,1.25,20,.04),cdm:sup(.03,.88),dW:11000,tkG:[5,6],dep:{a:22,rock:1.0,spin:2.6},ff:[.12,1.0,3.9],gLim:8,aoaLim:20,roll:3.6,fbw:false,noLimiter:true,
    rcs:3,irs:.9,pit:'phantom',eye:eyeOf(-5.3,.68),radar:R('LRMTS / ranging',6000,[2,5],'NM',.04),irst:false,pulse:true,
    gun:G_('2× DEFA 553',42,800,26,300,.003),keepJ:[],rwr:'JAG',spo:4,tankName:'1,200 l tank',mcap:1.6}),
  stn:{1:['Magic 1','Magic 2','SAMP 250','Belouga','Matra F1'],5:['Magic 1','Magic 2','SAMP 250','Belouga','Matra F1'],2:['TK','SAMP 250','SAMP 400','Belouga','Matra F1','AS-37 Martel','AS-30L','BL755'],4:['TK','SAMP 250','SAMP 400','Belouga','Matra F1','AS-37 Martel','AS-30L','BL755'],
       C:['PTB','SAMP 400','AS-37 Martel','AS-30L','TGP']},
  load:{cold:{1:'Magic 1',5:'Magic 1',2:'TK',4:'TK',C:'PTB'},modern:{1:'Magic 2',5:'Magic 2',2:'TK',4:'TK',C:'PTB'},strike:{1:'Magic 1',5:'Magic 1',2:'Belouga',4:'Belouga',C:'AS-37 Martel'}},
  fv:{hw:4.35,y1:3.3,span:'8.69 m',fus:[.78,.7,.05],wing:[.6,.4,.7],tail:[2.6,-.1,.3],eng:[[.84,.1,.24]],engSy:1.8,can:[.68,.36,.42],fins:[[0,.65,3.3]]},
  camp:{cold:{0:['STK']}}});

// ---- Tornado GR.4 ----
{const sw={a:[25,45,67],rate:6,auto:false,S:[26.6,26.6,26.6],CLa:[5.6,4.4,3.2],cd0:[.024,.021,.019],k:[.07,.11,.19],aoaLim:[21,20,17],gLim:[6.5,7.5,7.5],roll:[3.8,3.6,2.8],
  vne:[900,1250,1480],dep:[{a:26,rock:.9,spin:2.4},{a:24,rock:.8,spin:2.2},{a:21,rock:.8,spin:2.0}],
  clt:[clt(5.6,1.95,20,.1).map(v=>v[1]),clt(4.4,1.45,20,.05).map(v=>v[1]),clt(3.2,1.05,18,.02).map(v=>v[1])],
  cdm:[sub(.07,.78),sup(.035,.86),sup(.028,.92)]};
addJet({id:'Tornado GR.4',src:'F-4E',side:'BLUE',name:'Tornado GR.4',call:'TONKA',nctr:'TORNADO',foe:'MiG-29',eng:'2× RB199 Mk 103',rwr:'ALR-56C',crew:'WSO',ccip:true,swing:true,
  role:'UK · LOW-LEVEL STRIKE · SWING WING · TFR · PAVEWAY / ALARM · PILOT + NAVIGATOR',stall:{s:.1,twin:1},
  ecm:{cold:{n:'Sky Shadow',jp:1.3,dec:.66,kg:0,cd:0,warm:20},modern:{n:'Sky Shadow 2',jp:1.6,dec:.74,kg:0,cd:0,warm:15}},
  ac:Object.assign({},imp,{name:'Tornado GR.4',model:makeTornado,st:TORST,empty:13890,fuel:5090,tank:1200,S:26.6,CLa:4.4,cd0:.021,k:.11,mil:87600,ab:153600,spool:2.4,abLight:.6,
    clt:clt(4.4,1.45,20,.05),cdm:sup(.035,.86),dW:20000,tkG:[5,6],dep:{a:24,rock:.8,spin:2.2},ff:[.25,2.4,10],gLim:7.5,aoaLim:20,roll:3.6,fbw:true,
    rcs:5,irs:1.2,pit:'phantom',eye:eyeOf(-4.9,.78),radar:R('GMR / TFR',15000,[5,10,20],'NM',.05),irst:false,pulse:true,
    gun:G_('Mauser BK-27',28,1025,20,180,.0025),keepJ:['2a','8a'],rwr:'TOR',spo:4,tankName:'1,500 l tank',mcap:2.2,swing:sw}),
  stn:{'2a':['AIM-9L','AIM-9M'],'8a':['AIM-9L','AIM-9M'],2:['TK','BL755','GBU-12','Mk-83','AGM-88B'],8:['TK','BL755','GBU-12','Mk-83','AGM-88B'],
       3:['GBU-12','GBU-10','GBU-24','BL755','Mk-82','Mk-83','AGM-88B'],7:['GBU-12','GBU-10','GBU-24','BL755','Mk-82','Mk-83','AGM-88B'],4:['GBU-12','GBU-10','GBU-24','BL755','Mk-82','Mk-83'],6:['GBU-12','GBU-10','GBU-24','BL755','Mk-82','Mk-83'],C:['TGP']},
  load:{cold:{'2a':'AIM-9L','8a':'AIM-9L',2:'TK',8:'TK',3:'GBU-12',7:'GBU-12',C:'TGP'},modern:{'2a':'AIM-9M','8a':'AIM-9M',2:'TK',8:'TK',3:'GBU-24',7:'GBU-24',C:'TGP'},strike:{'2a':'AIM-9L','8a':'AIM-9L',2:'TK',8:'TK',3:'GBU-12',7:'GBU-12',4:'BL755',6:'BL755',C:'TGP'}},
  cms:{cold:[60,30],modern:[90,45]},
  fv:{hw:6.95,y1:5.2,span:'13.91 m spread',fus:[1.04,.78,0],wing:[.42,.3,1.2],tail:[3.4,-.05,.6],eng:[[1.05,-.05,.26]],engSy:2,can:[.78,.42,.5],nose:[0,.4],fins:[[0,.75,4.6]]},
  camp:{cold:{0:['STK']},modern:{0:['STK']}}});}

/* ================================ RED ================================ */
const SOV_AAM_OLD=['R-3S','R-13M','R-60M'];

// ---- Su-25 ----
addJet({id:'Su-25',src:'MiG-21',side:'RED',name:'Su-25',call:'FROGFOOT',nctr:'SU-25',foe:'A-10A',eng:'2× R-95Sh',rwr:'SPO-15LM',noAB:true,ccip:true,
  role:'USSR · ARMOURED CLOSE SUPPORT · KLEN-PS · GSh-30-2 · 10 PYLONS',stall:{s:.1,twin:1},
  ac:Object.assign({},met,{name:'Su-25',model:makeSu25,st:SU25ST,empty:9315,fuel:3000,tank:640,S:33.7,CLa:4.3,cd0:.026,k:.115,mil:80400,ab:80400,spool:3,abLight:99,
    clt:clt(4.3,1.45,20,.08),cdm:sub(.05,.78),dW:14600,tkG:[4,5],dep:{a:22,rock:1.0,spin:2.4},ff:[.18,1.75,1.75],gLim:6.5,aoaLim:18,roll:3.2,fbw:false,noLimiter:true,
    rcs:7,irs:.9,pit:'fishbed',eye:eyeOf(-4.2,.62),radar:R('Klen-PS',8000,[2.5,5,10],'KM',.03),irst:false,pulse:true,
    gun:G_('GSh-30-2',50,870,26,250,.0032),keepJ:['1','10'],rwr:'25',spo:3,tankName:'PTB-800',vne:1000}),
  stn:{1:['R-60M','R-3S'],10:['R-60M','R-3S'],2:[...SOV_BOMB,...SOV_RKT],9:[...SOV_BOMB,...SOV_RKT],3:[...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-29L'],8:[...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-29L'],
       4:['TK',...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-29L','KAB-500Kr'],7:['TK',...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-29L','KAB-500Kr'],5:['TK',...SOV_BOMB,...SOV_RKT,'Kh-25ML','KAB-500Kr'],6:['TK',...SOV_BOMB,...SOV_RKT,'Kh-25ML','KAB-500Kr']},
  load:{cold:{1:'R-60M',10:'R-60M',2:'B-8M1',9:'B-8M1',3:'FAB-250',8:'FAB-250',4:'Kh-25ML',7:'Kh-25ML',5:'TK',6:'TK'},strike:{1:'R-60M',10:'R-60M',2:'B-8M1',9:'B-8M1',3:'FAB-250',8:'FAB-250',4:'FAB-500',7:'FAB-500',5:'Kh-25ML',6:'Kh-25ML'}},
  cms:{cold:[128,128],modern:[128,128]},
  fv:{hw:7.2,y1:3.15,span:'14.36 m',fus:[.62,.74,.05],wing:[.45,.2,.9],tail:[2.6,.4,.3],eng:[[1.02,-.05,.3]],can:[.62,.38,.4],fins:[[0,.5,3.15]],tips:[[7.1,.45]]},
  camp:{cold:{1:['STK']},modern:{1:['STK']}}});

// ---- Su-24M ----
{const sw={a:[16,45,69],rate:4,auto:false,S:[55.2,53,51],CLa:[4.8,3.7,2.6],cd0:[.025,.022,.019],k:[.075,.12,.22],aoaLim:[22,20,17],gLim:[6,6.5,6.5],roll:[2.6,2.5,1.9],
  vne:[850,1300,1400],dep:[{a:25,rock:1.0,spin:2.4},{a:23,rock:.9,spin:2.3},{a:20,rock:.9,spin:2.2}],
  clt:[clt(4.8,1.6,20,.08).map(v=>v[1]),clt(3.7,1.2,20,.04).map(v=>v[1]),clt(2.6,.9,18,.02).map(v=>v[1])],
  cdm:[sub(.07,.76),sup(.034,.85),sup(.025,.92)]};
addJet({id:'Su-24M',src:'MiG-23',side:'RED',name:'Su-24M',call:'FENCER',nctr:'SU-24',foe:'F-15C',eng:'2× AL-21F-3',rwr:'SPO-15LM',crew:'WSO',ccip:true,swing:true,
  role:'USSR · FRONTLINE BOMBER · SWING WING · ORION-A / RELIEF TFR · KAIRA-24 · PILOT + WSO',stall:{s:.4,twin:1},
  ecm:{cold:{n:'Geran-F',jp:1.1,dec:.55,kg:0,cd:0,warm:20},modern:{n:'Geran-F',jp:1.2,dec:.6,kg:0,cd:0,warm:20}},
  ac:Object.assign({},met,{name:'Su-24M',model:makeSu24,st:SU24ST,empty:22300,fuel:9800,tank:1600,ptb:2400,S:53,CLa:3.7,cd0:.022,k:.12,mil:153000,ab:219600,spool:3,abLight:.8,
    clt:clt(3.7,1.2,20,.04),cdm:sup(.034,.85),dW:33000,tkG:[4,5],dep:{a:23,rock:.9,spin:2.3},ff:[.4,3.6,14],gLim:6.5,aoaLim:20,roll:2.5,fbw:false,noLimiter:false,
    rcs:15,irs:1.5,pit:'flogger',eye:eyeOf(-6.8,.86),radar:R('Orion-A / Relief',20000,[10,20,40],'KM',.05),irst:false,pulse:true,ols:undefined,
    gun:G_('GSh-6-23M',130,715,12,500,.003),rwr:'24',spo:3,tankName:'PTB-2000',mcap:1.6,vne:1400,swing:sw}),
  stn:{1:['R-60M','TK',...SOV_BOMB,'B-8M1','S-25O','Kh-25ML','Kh-58U'],7:['R-60M','TK',...SOV_BOMB,'B-8M1','S-25O','Kh-25ML','Kh-58U'],2:[...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-29L','Kh-29T','Kh-29TD','Kh-58U','Kh-31P','KAB-500Kr','KAB-1500L'],
       6:[...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-29L','Kh-29T','Kh-29TD','Kh-58U','Kh-31P','KAB-500Kr','KAB-1500L'],3:[...SOV_BOMB,'Kh-25ML','Kh-29L','Kh-29TD','KAB-500Kr'],5:[...SOV_BOMB,'Kh-25ML','Kh-29L','Kh-29TD','KAB-500Kr'],C:['PTB',...SOV_BOMB,'Kh-29TD','KAB-500Kr']},
  load:{cold:{1:'R-60M',7:'R-60M',2:'Kh-29TD',6:'Kh-29TD',3:'FAB-500',5:'FAB-500',C:'PTB'},modern:{1:'R-60M',7:'R-60M',2:'Kh-29L',6:'Kh-29L',3:'KAB-500Kr',5:'KAB-500Kr',C:'PTB'},strike:{1:'R-60M',7:'R-60M',2:'Kh-29TD',6:'Kh-29TD',3:'FAB-500',5:'FAB-500',C:'FAB-500'}},
  cms:{cold:[96,96],modern:[96,96]},
  fv:{hw:8.8,y1:5.1,span:'17.64 m spread',fus:[1.38,.82,0],wing:[.38,.2,1.4],tail:[4.0,-.05,.6],eng:[[1.42,0,.3]],engSy:2,can:[.86,1.0,.4],nose:[0,.5],fins:[[0,.85,5.0]]},
  camp:{cold:{1:['STK']},modern:{1:['STK']}}});}

// ---- Su-22M4 ----
{const sw={a:[30,45,63],rate:5,auto:false,S:[38.5,36,34.45],CLa:[4.4,3.8,3.0],cd0:[.023,.021,.019],k:[.09,.12,.18],aoaLim:[22,20,18],gLim:[7,7,6.5],roll:[3.2,3.2,2.6],
  vne:[900,1250,1400],dep:[{a:24,rock:1.0,spin:2.6},{a:23,rock:.9,spin:2.5},{a:21,rock:.9,spin:2.4}],
  clt:[clt(4.4,1.45,22,.06).map(v=>v[1]),clt(3.8,1.25,22,.04).map(v=>v[1]),clt(3.0,1.0,20,.02).map(v=>v[1])],
  cdm:[sub(.06,.8),sup(.035,.86),sup(.028,.92)]};
addJet({id:'Su-22M4',src:'MiG-23',side:'RED',name:'Su-22M4',call:'FITTER',nctr:'SU-22',foe:'F-4E',eng:'AL-21F-3',rwr:'SPO-15LM',ccip:true,swing:true,
  role:'USSR · FIGHTER-BOMBER · SWING WING · KLEN-PS · Kh-25ML / Kh-29L',stall:{s:.4,twin:0},
  ac:Object.assign({},met,{name:'Su-22M4',model:makeSu22,st:SU22ST,empty:10767,fuel:3770,tank:640,S:36,CLa:3.8,cd0:.021,k:.12,mil:76500,ab:110300,spool:3,abLight:.8,
    clt:clt(3.8,1.25,22,.04),cdm:sup(.035,.86),dW:16000,tkG:[5,6],dep:{a:23,rock:.9,spin:2.5},ff:[.2,1.9,7.5],gLim:7,aoaLim:20,roll:3.2,fbw:false,noLimiter:false,
    rcs:6,irs:1.3,pit:'flogger',eye:eyeOf(-5.8,.78),radar:R('Fon-1400 ranging',8000,[2.5,5,10],'KM',.03),irst:false,pulse:true,ols:undefined,
    gun:G_('2× NR-30',30,780,26,160,.0032),rwr:'22',spo:3,tankName:'PTB-800',mcap:1.75,vne:1400,swing:sw}),
  stn:{1:['R-60M','R-13M','B-8M1','UB-32','S-24B'],8:['R-60M','R-13M','B-8M1','UB-32','S-24B'],2:['TK',...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-58U'],7:['TK',...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-58U'],
       3:[...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-29L','Kh-29TD','KAB-500Kr'],6:[...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-29L','Kh-29TD','KAB-500Kr'],4:['TK',...SOV_BOMB,'Kh-25ML'],5:['TK',...SOV_BOMB,'Kh-25ML']},
  load:{cold:{1:'R-60M',8:'R-60M',3:'Kh-25ML',6:'Kh-25ML',4:'TK',5:'TK'},strike:{1:'R-60M',8:'R-60M',2:'B-8M1',7:'B-8M1',3:'FAB-500',6:'FAB-500',4:'FAB-250',5:'FAB-250'}},
  cms:{cold:[32,32],modern:[64,64]},
  fv:{hw:6.85,y1:4.05,span:'13.68 m spread',fus:[.82,.84,.04],wing:[.0,-.1,1.0],tail:[3.0,-.15,.4],can:[.78,.4,.42],nose:[0,.5,.3],fins:[[0,.75,4.0]]},
  camp:{cold:{1:['STK']},modern:{1:['STK']}}});}

// ---- MiG-27K ----
addJet({id:'MiG-27K',src:'MiG-23',side:'RED',name:'MiG-27K',call:'FLOGGER',nctr:'MIG-27',foe:'F-16',eng:'R-29B-300',rwr:'SPO-15LM',ccip:true,swing:true,
  role:'USSR · FIGHTER-BOMBER · SWING WING · KAIRA-23 LASER / TV · GSh-6-30',stall:{s:.4,twin:0},
  ac:Object.assign({},met,{name:'MiG-27K',model:makeMiG27,st:M27ST,empty:11908,fuel:4560,tank:640,mil:78500,ab:112700,ff:[.25,2.3,7.6],mcap:1.7,
    rcs:6,irs:1.2,pit:'flogger',eye:eyeOf(-5.0,.66),radar:R('Kaira-23 (no radar)',9000,[2.5,5,10],'KM',.03),irst:false,pulse:true,ols:undefined,
    gun:G_('GSh-6-30',75,875,26,260,.0034),rwr:'27',spo:3,tankName:'PTB-800'}),
  stn:{1:['R-60M','R-13M','B-8M1','UB-32','S-24B','FAB-250','OFAB-250'],7:['R-60M','R-13M','B-8M1','UB-32','S-24B','FAB-250','OFAB-250'],2:[...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-29L','Kh-29T','Kh-29TD','KAB-500Kr','Kh-58U'],6:[...SOV_BOMB,...SOV_RKT,'Kh-25ML','Kh-29L','Kh-29T','Kh-29TD','KAB-500Kr','Kh-58U'],
       3:[...SOV_BOMB,'Kh-25ML'],5:[...SOV_BOMB,'Kh-25ML'],C:['PTB',...SOV_BOMB,'Kh-29TD','KAB-500Kr']},
  load:{cold:{1:'R-60M',7:'R-60M',2:'Kh-29TD',6:'Kh-29TD',C:'PTB'},modern:{1:'R-60M',7:'R-60M',2:'Kh-29L',6:'Kh-29L',C:'PTB'},strike:{1:'R-60M',7:'R-60M',2:'Kh-29TD',6:'Kh-29TD',3:'FAB-500',5:'FAB-500',C:'PTB'}},
  cms:{cold:[60,60],modern:[60,60]},
  fv:{hw:7.0,y1:3.62,span:'13.97 m spread',fus:[.66,.64,.16],wing:[.22,.15,.9],tail:[2.9,.02,.3],eng:[[.92,-.05,.3]],engSy:1.6,can:[.66,.44,.4],fins:[[0,.62,3.62]]},
  camp:{cold:{1:['STK']},modern:{1:['STK']}}});

// ---- MiG-15bis ----
addJet({id:'MiG-15',src:'MiG-21',side:'RED',name:'MiG-15bis',call:'FAGOT',nctr:'MIG-15',foe:'F-86F',eng:'VK-1',rwr:'SPO-10',noAB:true,
  role:'USSR · KOREAN WAR DAY FIGHTER · N-37D + 2× NR-23 · ASP-3N',stall:{s:.3,twin:0},
  ac:Object.assign({},met,{name:'MiG-15bis',model:makeMiG15,st:M15ST,empty:3681,fuel:1173,tank:240,ptb:240,S:20.6,CLa:4.1,cd0:.019,k:.12,mil:26500,ab:26500,spool:4.2,abLight:99,
    clt:clt(4.1,1.2,18,.02),cdm:sub(.06,.86),dW:5000,tkG:[5,6],dep:{a:20,rock:1.1,spin:3.0},ff:[.08,.8,.8],gLim:8,aoaLim:18,roll:3.2,fbw:false,noLimiter:true,
    rcs:2.5,irs:.55,pit:'fishbed',eye:eyeOf(-2.0,.72),radar:R('no radar (ASP-3N)',1500,[1,2],'KM',.02),irst:false,pulse:true,
    gun:G_('N-37D + 2× NR-23',24,690,24,200,.0042),keepJ:[],rwr:'15',spo:4,tankName:'300 l tank',vne:1070}),
  stn:{1:['TK','OFAB-100','FAB-250'],2:['TK','OFAB-100','FAB-250']},
  load:{cold:{1:'TK',2:'TK'},guns:{},strike:{1:'FAB-250',2:'FAB-250'}},
  cms:{cold:[0,0],modern:[0,0]},
  fv:{hw:5.05,y1:3.0,span:'10.08 m',fus:[.68,.82,.05],wing:[.15,-.2,.6],tail:[1.6,2.6,.1],can:[.72,.36,.4],nose:[0,.46],fins:[[0,.55,3.0]]},
  camp:{cold:{1:['CAP','ESC']}}});

// ---- MiG-19P ----
addJet({id:'MiG-19',src:'MiG-21',side:'RED',name:'MiG-19P',call:'FARMER',nctr:'MIG-19',foe:'F-100A',eng:'2× RD-9B',rwr:'SPO-10',gci:true,
  role:'USSR · ALL-WEATHER FIGHTER · RP-5 IZUMRUD · 2× NR-30 · R-3S',stall:{s:.3,twin:1},
  ac:Object.assign({},met,{name:'MiG-19P',model:makeMiG19,st:M19ST,empty:5560,fuel:1800,tank:600,ptb:600,S:25,CLa:3.6,cd0:.0185,k:.15,mil:51000,ab:63800,spool:3.2,abLight:.8,
    clt:clt(3.6,1.15,20,.02),cdm:sup(.032,.88),dW:7600,tkG:[5,6],dep:{a:22,rock:1.2,spin:3.0},ff:[.12,1.0,2.6],gLim:8,aoaLim:20,roll:3.6,fbw:false,noLimiter:true,
    rcs:3,irs:1.0,pit:'fishbed',eye:eyeOf(-3.2,.7),radar:R('RP-5 Izumrud',12000,[2.5,5,10,20],'KM',.03),irst:false,pulse:true,
    gun:G_('2× NR-30',30,780,26,146,.0034),keepJ:[],rwr:'19',spo:4,tankName:'PTB-760',mcap:1.4,vne:1100}),
  stn:{1:['R-3S','R-13M','ORO-57K','UB-16','OFAB-100'],4:['R-3S','R-13M','ORO-57K','UB-16','OFAB-100'],2:['TK','FAB-250','OFAB-100','OFAB-250','UB-16','ORO-57K'],3:['TK','FAB-250','OFAB-100','OFAB-250','UB-16','ORO-57K']},
  load:{cold:{1:'R-3S',4:'R-3S',2:'TK',3:'TK'},strike:{1:'UB-16',4:'UB-16',2:'FAB-250',3:'FAB-250'}},
  cms:{cold:[0,0],modern:[0,0]},
  fv:{hw:4.6,y1:3.15,span:'9.00 m',fus:[.74,.8,.05],wing:[-.15,-.5,.6],tail:[2.4,-.3,.3],can:[.7,.38,.4],nose:[0,.48,.18],fins:[[0,.6,3.15]]},
  camp:{cold:{1:['CAP','INT','ESC']}}});

// ---- Yak-38 ----
addJet({id:'Yak-38',src:'MiG-21',side:'RED',name:'Yak-38',call:'FORGER',nctr:'YAK-38',foe:'AV-8B',eng:'R-27V-300 + 2× RD-36-35FV',rwr:'SPO-10',noAB:true,cv:true,app:120,
  vstol:{nozMax:90,key:true},role:'USSR · V/STOL SHIPBORNE ATTACK · LIFT + CRUISE ENGINES · R-60M',stall:{s:.2,twin:0},
  ac:Object.assign({},met,{name:'Yak-38',model:makeYak38,st:Y38ST,empty:7385,fuel:2900,tank:480,S:18.4,CLa:4.0,cd0:.025,k:.13,mil:66700,ab:66700,spool:2.6,abLight:99,
    clt:clt(4.0,1.3,20,.04),cdm:sub(.05,.82),dW:10300,tkG:[4,5],dep:{a:22,rock:1.1,spin:2.6},ff:[.2,1.9,1.9],gLim:6,aoaLim:18,roll:2.6,fbw:false,noLimiter:true,
    rcs:4,irs:1.0,pit:'fishbed',eye:eyeOf(-5.3,.74),radar:R('no radar (ASP-PFD)',2500,[1,2.5],'KM',.02),irst:false,pulse:true,
    gun:NOGUN,keepJ:[],rwr:'38',spo:4,tankName:'PTB-600',vne:1100}),
  stn:{1:['R-60M','UB-32','UB-16','FAB-250','OFAB-250','OFAB-100'],4:['R-60M','UB-32','UB-16','FAB-250','OFAB-250','OFAB-100'],2:['TK','R-60M','UB-32','UB-16','FAB-250','FAB-500','OFAB-250'],3:['TK','R-60M','UB-32','UB-16','FAB-250','FAB-500','OFAB-250']},
  load:{cold:{1:'R-60M',4:'R-60M',2:'TK',3:'TK'},strike:{1:'R-60M',4:'R-60M',2:'UB-32',3:'FAB-250'}},
  cms:{cold:[0,32],modern:[0,32]},
  fv:{hw:3.7,y1:3.0,span:'7.32 m',fus:[.84,.8,.05],wing:[.55,.3,.6],tail:[2.0,.3,.2],eng:[[.82,.15,.3]],engSy:1.7,can:[.74,.38,.42],fins:[[0,.6,3.0]]},
  camp:{cold:{1:['STK']}}});

// ---- Yak-141 ----
addJet({id:'Yak-141',src:'MiG-29',side:'RED',name:'Yak-141',call:'FREESTYLE',nctr:'YAK-141',foe:'AV-8B',eng:'R-79V-300 + 2× RD-41',rwr:'SPO-15LM',cv:true,app:130,keepGci:true,hms:'HMS_ALWAYS',
  vstol:{nozMax:95,key:true},role:'USSR · SUPERSONIC V/STOL FIGHTER (PROTOTYPE) · ZHUK · R-77',stall:{s:.2,twin:0},
  ac:{name:'Yak-141',model:makeYak141,st:Y141ST,empty:11650,fuel:4400,tank:1180,S:31.7,CLa:4.0,cd0:.021,k:.13,mil:107900,ab:152000,spool:2.4,abLight:.6,
    clt:clt(4.0,1.4,24,.04),cdm:sup(.032,.88),dW:15800,tkG:[5,6],dep:{a:26,rock:.8,spin:2.4},ff:[.3,2.6,10],gLim:7,aoaLim:24,roll:3.6,fbw:true,
    rcs:5,irs:1.4,ols:undefined,eye:eyeOf(-5.6,.84),radar:R('Zhuk',40*NM,[10,25,50,100],'KM',.55),irst:false,
    gun:G_('GSh-301',25,860,26,120,.003),rwr:'141',spo:5,tankName:'PTB-1150',mcap:1.7},
  stn:{1:['R-73','R-60M','R-27R','R-27T','R-77','B-8M1','FAB-500','Kh-25ML'],4:['R-73','R-60M','R-27R','R-27T','R-77','B-8M1','FAB-500','Kh-25ML'],2:['R-73','R-60M','R-27R','R-27T','R-77','TK','B-8M1','FAB-500','Kh-25ML','Kh-31P'],3:['R-73','R-60M','R-27R','R-27T','R-77','TK','B-8M1','FAB-500','Kh-25ML','Kh-31P']},
  load:{cold:{1:'R-73',4:'R-73',2:'R-27R',3:'R-27R'},modern:{1:'R-73',4:'R-73',2:'R-77',3:'R-77'},strike:{1:'R-73',4:'R-73',2:'Kh-25ML',3:'Kh-25ML'}},
  cms:{cold:[30,30],modern:[60,60]},
  fv:{hw:5.05,y1:3.2,span:'10.10 m',fus:[1.2,.8,0],wing:[.55,.35,.9],tail:[3.2,.35,1.3],eng:[[1.1,-.1,.3]],engSy:1.8,can:[.84,.4,.42],nose:[0,.3],fins:[[1.3,.5,3.2,.08]]},
  camp:{cold:{1:['CAP']},modern:{1:['CAP']}}});

// ---- J-11 (licence Su-27SK) ----
addJet({id:'J-11',src:'Su-27',side:'RED',name:'J-11',call:'FLANKER-B',nctr:'SU-27',foe:'F-15C',eng:'2× AL-31F',rwr:'SPO-15LM',dl:true,gci:true,hms:'HMS_ALWAYS',irstn:'OLS-27',
  role:'CHINA · AIR SUPERIORITY · LICENCE Su-27SK · N001E · R-27 / R-73',stall:null,keepGci:true,
  ac:{name:'J-11'},
  stn:Object.fromEntries(Object.entries(STN['Su-27']).map(([k,v])=>[k,v.slice()])),
  load:{cold:Object.assign({},LOAD.cold['Su-27']),modern:Object.assign({},LOAD.modern['Su-27']),strike:Object.assign({},STRIKE_LOAD['Su-27']||LOAD.cold['Su-27'])},
  cms:{cold:CMS.cold['Su-27'],modern:CMS.modern['Su-27']},
  ecm:ECM_FIT['Su-27'],
  fv:{hw:7.4,y1:5.2,span:'14.70 m',fus:[.95,.6,.3],wing:[-.05,-.12,1.0],tail:[4.3,-.3,1.3],eng:[[1.4,-.45,.6]],engSy:.6,can:[.9,.45,.4],fins:[[2.2,.6,5.1,.06]]},
  camp:{cold:{1:['CAP','ESC']},modern:{1:['CAP','ESC']}}});
if(FV['Su-27']&&FV['J-11'])FV['J-11']=FV['Su-27'];

// ---- J-8F ----
addJet({id:'J-8F',src:'MiG-23',side:'RED',name:'J-8F',call:'FINBACK',nctr:'J-8',foe:'F-16',eng:'2× WP-13B',rwr:'SPO-15LM',dl:true,gci:true,
  role:'CHINA · HIGH-ALTITUDE INTERCEPTOR · TYPE 1492 PD · PL-12 / PL-8',stall:{s:.3,twin:1},
  ac:Object.assign({},met,{name:'J-8F',model:makeJ8F,st:J8ST,empty:10371,fuel:4300,tank:640,ptb:640,S:42.2,CLa:3.0,cd0:.017,k:.19,mil:94200,ab:137200,spool:2.8,abLight:.7,
    clt:clt(3.0,1.15,26,.0),cdm:sup(.028,.9),dW:14500,tkG:[5,6],dep:{a:26,rock:.9,spin:2.6},ff:[.25,2.2,9],gLim:7,aoaLim:22,roll:3.5,fbw:false,noLimiter:false,
    rcs:7,irs:1.4,pit:'flogger',eye:eyeOf(-6.6,.86),radar:R('Type 1492',75000,[10,25,50,100],'KM',.5),irst:false,pulse:false,ols:undefined,
    gun:G_('Type 23-III',57,715,12,200,.0032),rwr:'J8',spo:5,tankName:'800 l tank',mcap:2.2}),
  stn:{1:['PL-8','PL-5E','R-60M'],7:['PL-8','PL-5E','R-60M'],2:['PL-12','PL-11','PL-8','PL-5E','FAB-250','B-8M1'],6:['PL-12','PL-11','PL-8','PL-5E','FAB-250','B-8M1'],3:['PL-12','PL-11','TK','FAB-250','FAB-500','B-8M1'],5:['PL-12','PL-11','TK','FAB-250','FAB-500','B-8M1'],C:['PTB','FAB-500']},
  load:{cold:{1:'PL-8',7:'PL-8',2:'PL-11',6:'PL-11',3:'PL-5E',5:'PL-5E',C:'PTB'},modern:{1:'PL-8',7:'PL-8',2:'PL-12',6:'PL-12',3:'PL-12',5:'PL-12',C:'PTB'},strike:{1:'PL-8',7:'PL-8',2:'FAB-250',6:'FAB-250',3:'FAB-500',5:'FAB-500',C:'PTB'}},
  cms:{cold:[30,30],modern:[60,60]},
  fv:{hw:4.7,y1:4.5,span:'9.34 m',fus:[1.06,.8,.05],wing:[-.2,-.35,1.0],tail:[3.0,.0,.8],eng:[[1.02,0,.3]],engSy:2,can:[.82,.4,.44],nose:[.05,.4],fins:[[0,.85,4.5]]},
  camp:{cold:{1:['INT','CAP']},modern:{1:['INT']}}});

// ---- JH-7 ----
addJet({id:'JH-7',src:'MiG-23',side:'RED',name:'JH-7',call:'FLOUNDER',nctr:'JH-7',foe:'F-16',eng:'2× WS-9 (Spey Mk 202)',rwr:'SPO-15LM',crew:'WSO',ccip:true,
  role:'CHINA · NAVAL STRIKE · TYPE 232H · YJ-82 · PILOT + NAVIGATOR',stall:{s:.2,twin:1},
  ac:Object.assign({},met,{name:'JH-7',model:makeJH7,st:JH7ST,empty:14500,fuel:7500,tank:880,ptb:880,S:52.3,CLa:3.8,cd0:.021,k:.13,mil:109000,ab:182600,spool:2.8,abLight:.7,
    clt:clt(3.8,1.25,22,.04),cdm:sup(.034,.86),dW:22000,tkG:[4,5],dep:{a:24,rock:.9,spin:2.4},ff:[.3,2.6,11],gLim:7,aoaLim:20,roll:3.0,fbw:false,noLimiter:false,
    rcs:9,irs:1.4,pit:'flogger',eye:eyeOf(-7.2,.9),radar:R('Type 232H',40000,[10,25,50,100],'KM',.15),irst:false,pulse:true,ols:undefined,
    gun:G_('Type 23-III',57,715,12,300,.0032),rwr:'JH7',spo:3,tankName:'1,100 l tank',mcap:1.7}),
  stn:{1:['PL-5E','PL-8'],9:['PL-5E','PL-8'],2:['FAB-250','FAB-500','B-8M1','LS-500J'],8:['FAB-250','FAB-500','B-8M1','LS-500J'],3:['YJ-82','KD-88','TK','FAB-500','LS-500J','Kh-31P'],7:['YJ-82','KD-88','TK','FAB-500','LS-500J','Kh-31P'],
       4:['YJ-82','KD-88','FAB-500','LS-500J'],6:['YJ-82','KD-88','FAB-500','LS-500J'],C:['PTB','FAB-500']},
  load:{cold:{1:'PL-5E',9:'PL-5E',4:'YJ-82',6:'YJ-82',3:'TK',7:'TK'},modern:{1:'PL-8',9:'PL-8',4:'YJ-82',6:'YJ-82',3:'KD-88',7:'KD-88',C:'PTB'},strike:{1:'PL-5E',9:'PL-5E',4:'YJ-82',6:'YJ-82',3:'TK',7:'TK'}},
  cms:{cold:[60,60],modern:[60,60]},
  fv:{hw:6.35,y1:5.0,span:'12.71 m',fus:[1.2,.84,.05],wing:[.6,.2,1.2],tail:[3.6,.0,.7],eng:[[1.25,.05,.3]],engSy:2,can:[.86,.42,.48],nose:[0,.4],fins:[[0,.85,5.0]],tips:[[6.3,-.05]]},
  camp:{cold:{1:['STK']},modern:{1:['STK']}}});

/* ---------------- menu order: new BLUE jets after the F-4E, new RED after the MiG-31 ---------------- */
try{const blue=NEW.filter(s=>s.side==='BLUE').map(s=>s.id),red=NEW.filter(s=>s.side==='RED').map(s=>s.id);
  for(const id of[...blue,...red]){const i=ACS.indexOf(id);if(i>=0)ACS.splice(i,1);}
  let i=ACS.indexOf('F-4E')+1;ACS.splice(i,0,...blue);i=ACS.indexOf('MiG-31');if(i<0)i=ACS.length-1;ACS.splice(i+1,0,...red);}catch(e){console.warn('[coldwar] order',e);}
/* ---------------- FOE fall-backs for opponents that are not in the game ---------------- */
for(const s of NEW)if(!AC[FOE[s.id]])FOE[s.id]=s.side==='RED'?'F-4E':'MiG-21';
/* ---------------- campaign pools ---------------- */
try{for(const s of NEW){if(!s.camp)continue;for(const era of Object.keys(s.camp))for(const side of Object.keys(s.camp[era]))for(const role of s.camp[era][side]){
  const T=CTYPES[era]&&CTYPES[era][side];if(T&&T[role]&&!T[role].includes(s.id))T[role].push(s.id);}}}catch(e){console.warn('[coldwar] campaign',e);}

/* ---------------- no-afterburner types: the throttle tops out at MIL ---------------- */
{const _st=Jet.prototype.step;Jet.prototype.step=function(dt){if(this.ac&&this.ac.noAB&&this.thr>.8)this.thr=.8;return _st.call(this,dt);};}

/* ---------------- V/STOL: nozzle / lift-jet thrust vectored downward ([ and ] set the nozzle angle on Harrier, Yak-38, Yak-141) ---------------- */
// The flight model flies the velocity vector, so there is no true hover: the vectored thrust gives jet-borne lift for very slow flight, short take-offs
// and vertical landings, and VIFF (nozzles down in forward flight) for a quick deceleration and nose-up rotation.
const VS={noz:0,cmd:0};W_VS();
function W_VS(){window.CW_VSTOL=VS;}
{const _st=Jet.prototype.step,_up=new V3(),_fw=new V3();Jet.prototype.step=function(dt){const r=_st.call(this,dt);
  const v=this.ac&&this.ac.vstol;if(!v||this!==player||!this.alive||this.remote)return r;
  VS.noz+=Math.max(-90*dt,Math.min(90*dt,VS.cmd-VS.noz));const th=VS.noz*D;if(th<.5*D)return r;
  const T=engThrust(this.ac,this.n,0,this.mach||0,this.pos.y)*(this.thrK?this.thrK():1),m=this.mass;
  // lift jets (Yak-38 / Yak-141) add ~45-55 % of the cruise engine's thrust when the nozzles are down past 60°
  const lift=(this.type==='Yak-38'||this.type==='Yak-141')&&VS.noz>60?.5:0;
  this.up(_up);this.fwd(_fw);const a=T/m;
  this.vel.addScaledVector(_fw,a*(Math.cos(th)-1)*dt).addScaledVector(_up,a*(Math.sin(th)+lift)*dt);
  // reaction-control: at low airspeed the puffer jets hold the attitude level-ish so the jet does not tumble
  const V=this.vel.length();if(V<70){const k=1-V/70;this.ctl.p*=1-k*.5;}
  if(lift)this.fuel=Math.max(0,this.fuel-dt*.9);
  return r;};}
// Comma / Period (the wing-sweep keys) set the nozzle angle on the V/STOL jets; manual swing wings step through their own sweep stops
{const _sw=sweepStep;sweepStep=function(d){const P=player;if(P&&P.alive&&P.ac&&P.ac.vstol){const mx=P.ac.vstol.nozMax||90;VS.cmd=Math.max(0,Math.min(mx,VS.cmd+d*15));
    try{flash('NOZZLES '+Math.round(VS.cmd)+'°',800);sfx.click();}catch(_){}return;}
  if(P&&P.alive&&P.ac&&P.ac.swing&&!P.ac.swing.auto&&P.ac.cwSrc){const A=P.ac.swing.a;let i=A.indexOf(P.sweepCmd);if(i<0)i=1;i=Math.max(0,Math.min(A.length-1,i+d));
    if(A[i]===P.sweepCmd)return;P.sweepCmd=A[i];try{flash('WING '+A[i]+'°',900);sfx.click();}catch(_){}return;}
  return _sw.apply(this,arguments);};}
{const _sp=Jet.prototype.spawn;if(_sp)Jet.prototype.spawn=function(){const r=_sp.apply(this,arguments);if(this===player){VS.noz=0;VS.cmd=0;}return r;};}

window.CW_NEW=NEW.map(s=>s.id);
console.info('[coldwar] added '+NEW.length+' jets: '+window.CW_NEW.join(', '));
})();
