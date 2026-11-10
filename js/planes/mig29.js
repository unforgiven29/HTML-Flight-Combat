"use strict";
/* =====================================================================================================================
   MiG-29 / MiG-29S / MiG-29SMT — everything that belongs to this jet family, split out of game.js (v258).
   Loaded BEFORE game.js (after js/planes/registry.js). Nothing here runs against game.js state at load time:
     * top-level declarations below are pure data (station layouts, store lists) or functions (model builder, cockpit/MFD code);
     * `tables` are thunks. game.js calls PLANES.apply('<TABLE>',<TABLE>) right after it declares each table, which merges
       these entries in at the same point the old inline literal used to be evaluated;
     * `hooks` are the one-off statements that used to sit inline in game.js (variants, cockpit builders, HUD/MFD patches).
       game.js calls PLANES.run('mig29','<tag>') at the exact spot each one was cut from, so execution order is unchanged.
   Type ids in this file: MiG-29, MiG-29S, MiG-29SMT
   ===================================================================================================================== */
const MIGST={1:[-4.3,-.36,2.1],2:[-3.3,-.38,1.6],3:[-2.45,-.42,1.2],4:[2.45,-.42,1.2],5:[3.3,-.38,1.6],6:[4.3,-.36,2.1],C:[0,-1.25,1.6]};
function makeMiG29(){
  const grp=new THREE.Group(),mat=SKIN(0x8495a3),lt=SKIN(0xa9b6bf),dk=SKIN(0x5f6f7b),blk=SKIN(0x1c1f22,10),met=SKIN(0x5a5550,60),rad=SKIN(0xdcdccc,20);
  grp.add(new THREE.Mesh(sloft([[-9.2,.02,.0,.02,2],[-8.6,.2,0,.2,2],[-7.6,.37,.04,.37,2.1],[-6.6,.47,.09,.47,2.2],[-5.6,.53,.15,.53,2.3],[-4.4,.58,.2,.56,2.4],
    [-3.2,.66,.2,.56,2.6],[-1.8,.8,.12,.5,3],[0,.95,.08,.42,3.6],[2.5,1.0,.04,.38,3.8],[4.5,.85,.03,.33,3.4],[6.2,.45,.03,.28,2.4],[7.3,.12,.03,.12,2]]),mat));
  grp.add(new THREE.Mesh(loft([[-9.22,.022,0,.022,2],[-8.6,.205,0,.205,2],[-7.6,.375,.04,.375,2.1],[-7.2,.41,.05,.41,2.1]],40,false,false),rad));
  rim(grp,.41,.022,dk,0,.05,-7.2);
  // engine nacelles with rounded intake lips under the LERX, petal nozzles, canted fins, stabs, ventral fins
  for(const sd of[-1,1]){{const nc=new THREE.Mesh(sloft([[-3.2,.5,-.48,.42,4.5],[-2.0,.56,-.46,.46,4],[1.5,.6,-.42,.46,3.2],[4.5,.56,-.38,.42,2.6],[6.4,.48,-.36,.38,2.2]],32,false,false),mat);nc.position.x=sd*1.3;grp.add(nc);}
    intake(grp,sd*1.3,-.48,-3.24,.47,.4,mat,blk);
    nozzle(grp,sd*1.3,-.36,6.85,.46,.38,.9,met,dk);
    const f=finShape([[2.9,.25],[5.1,3.0],[6.2,3.05],[6.6,.2]],.12,mat);f.position.set(sd*1.3,.05,0);f.rotation.z=-sd*.14;grp.add(f);
    const st=planform([[.9,4.9],[4.0,6.8],[4.0,7.6],[.9,7.7]],.08,false,mat);st.scale.x=sd;st.position.y=-.05;grp.add(st);
    const vf=finShape([[3.6,-.75],[4.8,-1.25],[5.4,-1.25],[5.2,-.75]],.05,mat);vf.position.x=sd*1.65;vf.rotation.z=sd*.3;grp.add(vf);
    // overwing louvre bulge and the LERX-root bleed fairing
    pod(grp,2.2,.22,lt,sd*.85,.42,-2.6,1,.35);}
  const wing=planform([[.45,-5.8],[1.05,-3.4],[1.9,0.15],[5.65,2.95],[5.7,3.9],[1.9,4.75],[.5,4.8]],.12,true,mat);wing.position.y=.04;grp.add(wing);
  canopy(grp,0x557080,.46,.5,1.6,.7,-4.6,dk);
  ball(grp,.13,SKIN(0x2a3438,90),.3,.66,-6.15,1,1,1.2);// OLS-29 IRST ball ahead of the windscreen
  grp.add(new THREE.Mesh(sloft([[-3.2,.02,.72,.02,2],[-2.6,.32,.7,.18,2],[1.5,.3,.6,.14,2],[3.6,.1,.45,.05,2]],20),lt));
  pod(grp,1.6,.18,lt,0,.42,5.6,1,.7);// drag-chute fairing between the nozzles
  rod(grp,[0,0,-9.1],[0,0,-10.3],.022,met,1,[0,1,0],8);ball(grp,.035,met,0,0,-10.3);
  navLight(0xff2a1a,-5.65,.04,3.3,grp);navLight(0x22ff55,5.65,.04,3.3,grp);
  const ab=new THREE.Group();[-1.3,1.3].forEach(x=>{const c=abPlume(4.4,.38);c.position.set(x,-.36,7.3);ab.add(c);});
  grp.add(ab);grp.userData.ab=ab;
  pylons(grp,MIGST,['C'],SKIN(0x76858f),x=>.0);
  return bake(grp,[ab]);}

PLANES.add('mig29',{
 ids:["MiG-29","MiG-29S","MiG-29SMT"],
 tables:{
  AC:()=>({
    'MiG-29':{name:'MiG-29',model:makeMiG29,st:MIGST,empty:10900,fuel:3500,tank:1180,S:38,CLa:4.6,cd0:.0195,k:.105,mil:98800,ab:162800,spool:1.9,
        // integral LERX body: higher CLmax and gentler break than the Viper; 2x RD-33 49.4/81.4 kN; 9 g below M0.85, 7 g above
        clt:[[-20,-1],[-10,-.58],[0,.04],[5,.4],[10,.76],[15,1.08],[20,1.33],[25,1.5],[30,1.6],[35,1.63],[40,1.58],[50,1.38],[60,1.1],[90,0]],
        cdm:[[0,0],[.8,0],[.9,.005],[1,.022],[1.1,.031],[1.3,.03],[1.6,.022],[2,.0197],[2.5,.0149],[3,.0121]],gHi:7,dW:15300,tkG:[5,7],dep:{a:34,rock:.6,spin:2.2},
        ff:[.3,2.2,9.5],gLim:9,aoaLim:26,roll:4.0,fbw:false,rcs:5,irs:1.25,ols:{tail:15000,head:7000,lrf:7000},cockpit:'fulcrum',units:'met',
        radar:{name:'N019',R0:38*NM,ranges:[10,25,50,100],unit:1000,ul:'KM',ecc:.55},irst:true,
        gun:{name:'GSh-30-1',rate:25,v:860,dmg:26,ammo:150,spread:.003},rel:[1,6,2,5,3,4],migRel:['3','4','2','5','1','6'],rwr:'29',spo:5,tankName:'Drop tank'}
  }),
  ENG_SUP:()=>({
    'MiG-29':.073,
    'MiG-29S':.073
  }),
  FOE:()=>({
    'MiG-29S':'F-16',
    'MiG-29':'F-16'
  }),
  LOAD:()=>({
    cold:{
      'MiG-29':{1:'R-73',2:'R-73',3:'R-27R',4:'R-27T',5:'R-73',6:'R-73',C:'PTB'},
      'MiG-29S':{1:'R-73',2:'R-73',3:'R-27R',4:'R-27T',5:'R-73',6:'R-73',C:'PTB'}
    },
    modern:{
      'MiG-29':{1:'R-73',2:'R-73',3:'R-27ER',4:'R-27ET',5:'R-73',6:'R-73',C:'PTB'},
      'MiG-29S':{1:'R-73',2:'R-77',3:'R-77',4:'R-77',5:'R-77',6:'R-73',C:'PTB'}
    },
    guns:{
      'MiG-29':{C:'PTB'},
      'MiG-29S':{C:'PTB'}
    }
  }),
  CMS:()=>({
    cold:{
      'MiG-29':[30,30],
      'MiG-29S':[30,30]
    },
    modern:{
      'MiG-29':[60,30],
      'MiG-29S':[60,30]
    }
  }),
  RWR_OF:()=>({
    'MiG-29':'SPO-15LM',
    'MiG-29S':'SPO-15LM'
  }),
  NCTR_ID:()=>({
    'MiG-29':'MIG-29',
    'MiG-29S':'MIG-29'
  }),
  STN:()=>({
    'MiG-29':{1:['R-73'],2:['R-73'],3:['R-27R','R-27T','R-27ER','R-27ET','R-73','PTB'],4:['R-27R','R-27T','R-27ER','R-27ET','R-73','PTB'],
                5:['R-73'],6:['R-73'],C:['PTB']},
    'MiG-29S':{1:['R-73'],2:['R-73','R-77'],3:['R-27R','R-27T','R-27ER','R-27ET','R-73','R-77','PTB'],4:['R-27R','R-27T','R-27ER','R-27ET','R-73','R-77','PTB'],
                5:['R-73','R-77'],6:['R-73'],C:['PTB']}
  }),
  ACROLE:()=>({
    'MiG-29':'USSR · FRONTLINE',
    'MiG-29S':'USSR · FRONTLINE · R-77 · 2-TARGET TWS'
  }),
  FV:()=>({
    'MiG-29':{hw:6.1,y1:3.7,span:'11.36 m',d:()=>bth([[-1.3,.6],[-1.65,.6],[-2.05,3.6],[-1.8,3.6]],'sk-body')+bth([[-1.2,-.1],[-3.6,-.18],[-3.6,-.3],[-1.2,-.34]],'sk-wing')+bth([[-1.4,-.18],[-5.7,-.1],[-5.7,-.22],[-1.4,-.5]],'sk-wing')+ell(0,.12,1,.62,'sk-body')+bth([[-.35,-.05],[-1.55,-.05],[-1.55,-.85],[-.35,-.85]],'sk-body')+bth([[-.45,-.15],[-1.45,-.15],[-1.45,-.75],[-.45,-.75]],'sk-dark')+ell(0,.2,.45,.42,'sk-body')+ell(0,.78,.44,.38,'sk-can')}
  }),
  CALLS:()=>({
    'MiG-29':'FULCRUM',
    'MiG-29S':'FULCRUM-C'
  }),
  FLAPSW:()=>({
    'MiG-29':'flap',
    'MiG-29S':'flap'
  }),
  STRIKE_LOAD:()=>({
    'MiG-29':{1:'R-73',6:'R-73',2:'B-8M1',5:'B-8M1',3:'FAB-250',4:'FAB-250',C:'PTB'},
    'MiG-29S':{1:'R-73',6:'R-73',2:'B-8M1',5:'B-8M1',3:'FAB-250',4:'FAB-250',C:'PTB'}
  }),
  ENGN:()=>({
    'MiG-29':'2× RD-33',
    'MiG-29S':'2× RD-33'
  }),
  IRSTN:()=>({
    'MiG-29':'KOLS (OEPS-29)',
    'MiG-29S':'KOLS (OEPS-29)'
  })
 },
 hooks:{
  /* game.js line 1000 */
  L1000(){
    AC['MiG-29S']=Object.assign({},AC['MiG-29'],{name:'MiG-29S',empty:11000,gLim:9,aoaLim:28,twsN:2,
      radar:{name:'N019M',R0:52*NM,ranges:[10,25,50,100],unit:1000,ul:'KM',ecc:.62}});
  },
  /* game.js line 6897 */
  L6897(){
    FV['MiG-29S']=FV['MiG-29'];
  },
  /* game.js line 14239 */
  L14239(){
    // ---------- MiG-29SMT (izd. 9.19) ----------
    // The 9.13 airframe with the large dorsal tank (about 4,700 kg of internal fuel), RD-33 series 3, N010ME Zhuk-ME slotted-array radar (about 120 km against
    // a fighter, ±85° in azimuth, ten track files, four engaged with the R-77), OEPS-29 with the laser, R-27ER / ET, R-77, R-73.
    try{
      cloneType('MiG-29S','MiG-29SMT',{name:'MiG-29SMT',empty:11600,fuel:4700,dW:17000,twsN:4,trkN:10,rcs:5,
        radar:{name:'Zhuk-ME',R0:65*NM,ranges:[10,25,50,100,200],unit:1000,ul:'KM',ecc:.72}});
      RGIM['Zhuk-ME']=[85,60,40,1];ENGN['MiG-29SMT']='2× RD-33 ser. 3';CALLS['MiG-29SMT']='FULCRUM-F';NCTR_ID['MiG-29SMT']='MIG-29';HMS_ALWAYS.add('MiG-29SMT');
      ACROLE['MiG-29SMT']='RUSSIA · FRONTLINE MULTIROLE · ZHUK-ME · 4-TARGET TWS · LONG LEGS';
      if(LOAD.modern&&LOAD.modern['MiG-29SMT'])Object.assign(LOAD.modern['MiG-29SMT'],{3:'R-27ER',4:'R-27ER'});
      {const S=STN['MiG-29SMT'];for(const k of['3','4'])if(S[k])for(const w of['R-27ER','R-27ET'])if(!S[k].includes(w))S[k].push(w);}
      try{CTYPES.modern[1].CAP.push('MiG-29SMT');}catch(e){}
    }catch(e){console.warn('v215 MiG-29SMT',e);}
  }
 }
});
