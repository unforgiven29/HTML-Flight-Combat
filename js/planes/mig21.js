"use strict";
/* =====================================================================================================================
   MiG-21bis — everything that belongs to this jet family, split out of game.js (v258).
   Loaded BEFORE game.js (after js/planes/registry.js). Nothing here runs against game.js state at load time:
     * top-level declarations below are pure data (station layouts, store lists) or functions (model builder, cockpit/MFD code);
     * `tables` are thunks. game.js calls PLANES.apply('<TABLE>',<TABLE>) right after it declares each table, which merges
       these entries in at the same point the old inline literal used to be evaluated;
     * `hooks` are the one-off statements that used to sit inline in game.js (variants, cockpit builders, HUD/MFD patches).
       game.js calls PLANES.run('mig21','<tag>') at the exact spot each one was cut from, so execution order is unchanged.
   Type ids in this file: MiG-21
   ===================================================================================================================== */
// MiG-21bis stations: four wing pylons (1, 2 left, 3, 4 right: inner ones take the PTB-490 tanks) and the belly tank station
const MIG21ST={1:[-2.55,-.5,.5],2:[-1.55,-.5,.1],3:[1.55,-.5,.1],4:[2.55,-.5,.5],C:[0,-.95,.4]};
function makeMiG21(){
  // MiG-21bis 'Fishbed-N': 15.76 m with the pitot boom, span 7.15 m, 23 m² delta wing swept 57°, round nose intake with a shock cone, tall dorsal spine into the fin,
  // all-moving tailplanes, small ventral fin, one R-25-300 behind a petal nozzle
  const grp=new THREE.Group(),mat=SKIN(0x9aa09a),dk=SKIN(0x727a74),lt=SKIN(0xb4bab2),blk=SKIN(0x1c1f22,10),met=SKIN(0x5a5550,60),rad=SKIN(0xa8aea4,20);
  grp.add(new THREE.Mesh(sloft([[-6.0,.46,.02,.46,2],[-5.0,.58,.03,.58,2.2],[-3.6,.63,.09,.66,2.4],[-1.6,.65,.12,.7,2.6],[1,.65,.08,.68,2.8],[3.2,.62,.04,.62,2.6],[5.2,.55,.02,.55,2.3],[6.5,.5,0,.5,2.1]],40,false,true),mat));
  rim(grp,.47,.045,dk,0,.02,-6.0);
  {const d=new THREE.Mesh(new THREE.CircleGeometry(.43,28),blk);d.position.set(0,.02,-5.93);d.rotation.y=Math.PI;grp.add(d);}
  tube(grp,.03,.3,1.15,rad,0,.02,-6.62);ball(grp,.03,met,0,.02,-7.2);
  rod(grp,[0,.07,-7.15],[0,.07,-8.2],.025,met,1,[0,1,0],8);ball(grp,.04,met,0,.07,-8.2);
  // dorsal spine
  grp.add(new THREE.Mesh(sloft([[-2.4,.04,.64,.05,2],[-.6,.3,.7,.12,2],[3,.3,.66,.12,2],[5.8,.07,.62,.05,2]],16),lt));
  for(const sd of[-1,1]){
    const wi=planform([[.5,-2.4],[3.575,2.3],[3.575,3.2],[.5,3.0]],.12,false,mat);wi.scale.x=sd;wi.position.y=-.26;grp.add(wi);
    navLight(sd<0?0xff2a1a:0x22ff55,sd*3.58,-.26,2.5,grp);
    const tp=planform([[.35,5.2],[1.9,6.7],[1.9,7.25],[.35,7.3]],.07,false,mat);tp.scale.x=sd;tp.position.y=-.06;grp.add(tp);}
  grp.add(finShape([[2.9,.6],[5.4,3.15],[6.75,3.15],[7.2,.6]],.13,mat));
  pod(grp,1.2,.08,dk,0,3.2,6.1);
  grp.add(finShape([[5.4,-.5],[6.2,-1.0],[7.2,-1.0],[7.4,-.5]],.07,dk));
  canopy(grp,0x557080,.38,.4,1.3,.64,-3.3,dk);
  nozzle(grp,0,0,7.0,.47,.4,.9,met,dk);
  const ab=abPlume(4.4,.4);ab.position.z=7.6;grp.add(ab);grp.userData.ab=ab;
  pylons(grp,MIG21ST,['C'],SKIN(0x76857a),x=>-.32);
  return bake(grp,[ab]);}

PLANES.add('mig21',{
 ids:["MiG-21"],
 tables:{
  AC:()=>({
    // MiG-21bis 'Fishbed-N': one R-25-300 (40.2 kN dry / 69.7 kN AB), empty 5,450 kg, internal fuel ~2,880 kg, 23 m² delta wing at 57°, 8.5 g, hydraulic controls
      // with no limiter, RP-22SM (Sapfir-21) pulse radar ~20 km, no IRST, SPO-10, GSh-23L 200 rds. R-13M / R-3S infra-red missiles, PTB-490 tanks, PTB-800 on the belly.
      'MiG-21':{name:'MiG-21bis',model:makeMiG21,st:MIG21ST,empty:5450,fuel:2880,tank:390,ptb:620,S:23,CLa:3.0,cd0:.0225,k:.19,mil:40200,ab:69700,spool:3.0,
        clt:[[-20,-.8],[-10,-.45],[0,0],[5,.26],[10,.5],[15,.74],[20,.94],[25,1.08],[30,1.12],[35,1.06],[40,.97],[50,.8],[60,.64],[90,0]],
        abM:[[0,1],[.5,1.195],[1,1.36],[1.5,1.495],[2,1.7521],[2.5,1.9494],[3,2.0763]],cdm:[[0,0],[.8,0],[.9,.004],[1,.02],[1.1,.027],[1.3,.026],[1.6,.0153],[2,.0135],[2.5,.0102],[3,.0083]],dW:8500,tkG:[5.5,7],dep:{a:30,rock:1.0,spin:2.6},
        ff:[.14,1.15,4.0],gLim:8.5,aoaLim:27,roll:4.2,fbw:false,noLimiter:true,rcs:3,irs:.9,cockpit:'viper',pit:'fishbed',eye:[3.4,.8],units:'met',
        radar:{name:'RP-22SM',R0:18000/* ~9.8 NM detection, ~6 NM track (Cooper, MiG-23 Flogger in the Middle East) */,ranges:[2.5,5,10,20],unit:1000,ul:'KM',ecc:.05},irst:false,pulse:true,
        gun:{name:'GSh-23L',rate:57,v:715,dmg:12,ammo:200,spread:.0032},rel:[1,4,2,3],keepJ:['1','4'],rwr:'21',spo:4,tankName:'PTB-490'}
  }),
  ENG_SUP:()=>({
    'MiG-21bis':.149
  }),
  FOE:()=>({
    'MiG-21':'F-4E'
  }),
  LOAD:()=>({
    cold:{
      'MiG-21':{1:'R-13M',2:'R-3S',3:'R-3S',4:'R-13M',C:'PTB'}
    },
    modern:{
      'MiG-21':{1:'R-13M',2:'R-60M',3:'R-60M',4:'R-13M',C:'PTB'}
    },
    guns:{
      'MiG-21':{C:'PTB'}
    }
  }),
  CMS:()=>({
    cold:{
      'MiG-21':[0,32]
    },
    modern:{
      'MiG-21':[0,32]
    }
  }),
  RWR_OF:()=>({
    'MiG-21':'SPO-10'
  }),
  NCTR_ID:()=>({
    'MiG-21':'MIG-21'
  }),
  STN:()=>({
    'MiG-21':{1:['R-13M','R-3S','R-60M'],2:['TK','R-3S','R-13M','R-60M'],3:['TK','R-3S','R-13M','R-60M'],4:['R-13M','R-3S','R-60M'],C:['PTB']}
  }),
  ACROLE:()=>({
    'MiG-21':'USSR · POINT DEFENCE'
  }),
  FV:()=>({
    'MiG-21':{hw:4,y1:4.2,span:'7.15 m',d:()=>one([[-.09,.55],[-.05,4.1],[.05,4.1],[.09,.55]],'sk-body')+bth([[-.6,-.1],[-2.1,-.2],[-2.1,-.3],[-.6,-.3]],'sk-wing')+bth([[-.6,-.1],[-3.6,-.18],[-3.6,-.28],[-.6,-.42]],'sk-wing')+one([[-.04,-.65],[-.04,-1],[.04,-1],[.04,-.65]],'sk-body')+ell(0,0,.68,.68,'sk-body')+ell(0,0,.5,.5,'sk-dark')+ell(0,0,.17,.17,'sk-body')+ell(0,.6,.24,.3,'sk-can')}
  }),
  CALLS:()=>({
    'MiG-21':'FISHBED'
  }),
  FLAPSW:()=>({
    'MiG-21':'flap'
  }),
  STALL:()=>({
    'MiG-21':{s:.3,twin:0}
  }),
  STRIKE_LOAD:()=>({
    'MiG-21':{1:'R-13M',4:'R-13M',2:'FAB-250',3:'FAB-250',C:'PTB'}
  }),
  ENGN:()=>({
    'MiG-21':'R-25-300'
  })
 },
 hooks:{

 }
});
