"use strict";
/* =====================================================================================================================
   MiG-25PD / MiG-31 — everything that belongs to this jet family, split out of game.js (v258).
   Loaded BEFORE game.js (after js/planes/registry.js). Nothing here runs against game.js state at load time:
     * top-level declarations below are pure data (station layouts, store lists) or functions (model builder, cockpit/MFD code);
     * `tables` are thunks. game.js calls PLANES.apply('<TABLE>',<TABLE>) right after it declares each table, which merges
       these entries in at the same point the old inline literal used to be evaluated;
     * `hooks` are the one-off statements that used to sit inline in game.js (variants, cockpit builders, HUD/MFD patches).
       game.js calls PLANES.run('mig25','<tag>') at the exact spot each one was cut from, so execution order is unchanged.
   Type ids in this file: MiG-25, MiG-31
   ===================================================================================================================== */
// MiG-23ML: glove pylons (1, 4: R-24R/T), ventral fuselage pylons (2, 3: R-60M), centreline (C: PTB-800)
// MiG-25PD: four underwing pylons (1 / 4 outer, 2 / 3 inner; the outer pair also take a second R-60M rail, 1B / 4B) and the 5,300 l belly tank (C)
const MIG25ST={1:[-4.78,-.84,1.7],'1B':[-4.5,-.84,1.7],2:[-2.9,-.64,1.5],3:[2.9,-.64,1.5],'4B':[4.5,-.84,1.7],4:[4.78,-.84,1.7],C:[0,-1.2,.9]};
function makeMiG25(){
  // MiG-25PD 'Foxbat-E' (izd. 84): 19.75 m long without the 4 m nose boom, span 14.01 m, 41° leading-edge sweep on a slightly anhedral wing carrying
  // long wingtip fairings, stainless-steel airframe, big rectangular side intakes with variable ramps, two canted fins, all-moving differential
  // stabilators, twin R-15BD-300 nozzles, Sapfir-25 radome, a small IRST fairing under the nose and the hinged canopy behind a flat windscreen.
  const grp=new THREE.Group(),mat=SKIN(0xa4aaae,50),dk=SKIN(0x6e7479,40),lt=SKIN(0xbcc2c5,55),blk=SKIN(0x15181a,10),met=SKIN(0x585550,60),rad=SKIN(0xc4c8c0,20),fin=SKIN(0x8d9498,45);
  grp.add(new THREE.Mesh(sloft([[-9.9,.02,0,.02,2],[-9.3,.2,0,.2,2],[-8.4,.4,-.02,.42,2],[-7.4,.55,-.04,.6,2.2],[-6.4,.64,-.04,.72,2.4],[-5.2,.72,0,.8,2.8],
    [-3.5,.8,0,.82,3.2],[-1,.9,-.02,.8,3.6],[2,1.0,0,.78,3.8],[5,1.3,0,.76,3.6],[8,1.5,0,.7,3.2],[9.6,1.55,0,.66,3]]),mat));
  grp.add(new THREE.Mesh(loft([[-9.92,.022,0,.022,2],[-9.3,.205,0,.205,2],[-8.4,.405,-.02,.425,2],[-8.0,.46,-.03,.49,2.05]],40,false,false),rad));
  rim(grp,.46,.02,dk,0,-.03,-8.0,1,1.06);
  rod(grp,[0,.05,-9.85],[0,.05,-13.9],.026,met,1,[0,1,0],8);ball(grp,.04,met,0,.05,-13.9);
  // IRST fairing under the nose
  ball(grp,.15,SKIN(0x2a3438,90),0,-.55,-7.5,1,.75,2.2);
  grp.add(new THREE.Mesh(sloft([[-4.2,.02,.78,.02,2],[-2,.34,.8,.12,2],[3,.62,.82,.12,2],[6,.7,.76,.1,2],[9.4,.5,.7,.06,2]],16),lt));
  for(const sd of[-1,1]){
    // rectangular side intake, dark throat behind a sharp lip
    const it=new THREE.Mesh(sloft([[-4.9,.42,-.1,.72,6],[-3.8,.46,-.08,.76,6],[-1.5,.5,-.04,.78,5],[2,.5,0,.76,4],[5.2,.4,0,.6,3]],28,false,true),mat);it.position.x=sd*1.32;grp.add(it);
    const ix=sd*1.32,fz=-4.9,P=(x,y)=>[ix+x,y,fz];
    const fc=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.38),blk);fc.position.set(ix,-.1,fz+.02);fc.rotation.y=Math.PI;grp.add(fc);
    [[[-.42,-.82],[.42,-.82]],[[.42,-.82],[.42,.62]],[[.42,.62],[-.42,.62]],[[-.42,.62],[-.42,-.82]]].forEach(([a,b])=>rod(grp,P(a[0],a[1]),P(b[0],b[1]),.045,lt,1,[0,1,0],8));
    rod(grp,[ix-.38,.42,fz+.1],[ix+.38,.42,fz+.1],.03,dk,1,[0,1,0],6);rod(grp,[ix-.38,.1,fz+.1],[ix+.38,.1,fz+.1],.03,dk,1,[0,1,0],6);
    // wing: 41° leading edge, anhedral, wingtip fairing, fence
    const w=planform([[1.7,-1.6],[7.0,2.7],[7.0,4.3],[1.7,5.4]],.17,false,mat);w.scale.x=sd;w.position.y=.1;w.rotation.z=-sd*.087;grp.add(w);
    rod(grp,[sd*1.9,-.04,4.7],[sd*6.8,-.4,3.95],.12,dk,.35,[0,1,0],8);
    pod(grp,3.6,.15,dk,sd*7.05,-.5,3.25);navLight(sd<0?0xff2a1a:0x22ff55,sd*7.05,-.5,1.5,grp);
    const fe=finShape([[.7,0],[1.1,.32],[4.3,.32],[4.7,0]],.03,dk);fe.position.set(sd*4.4,-.32,0);grp.add(fe);
    // all-moving differential stabilators
    const st=planform([[.9,6.3],[4.1,8.2],[4.1,9.3],[.9,9.4]],.1,false,mat);st.scale.x=sd;st.position.y=-.05;st.rotation.z=-sd*.1;grp.add(st);
    // canted fin
    const fn=finShape([[3.7,.55],[6.6,3.95],[8.7,3.95],[9.2,.55]],.12,fin);fn.position.set(sd*1.4,0,0);fn.rotation.z=-sd*.14;grp.add(fn);
    pod(grp,1.0,.07,dk,sd*(1.4+3.4*.14),3.95,8.0);
    nozzle(grp,sd*.9,0,9.55,.66,.62,1.1,met,dk);
    pod(grp,5.5,.18,dk,sd*1.0,-.6,5.8,1,.7);}
  canopy(grp,0x55707f,.46,.42,1.6,.58,-5.5,dk);
  rod(grp,[-.42,.62,-6.95],[.42,.62,-6.95],.05,dk,1,[0,1,0],8);
  const ab=new THREE.Group();[-.9,.9].forEach(x=>{const c=abPlume(6.0,.6);c.position.set(x,0,10.1);ab.add(c);});grp.add(ab);grp.userData.ab=ab;
  pylons(grp,MIG25ST,['C','1B','4B'],SKIN(0x7d858a),x=>.1-.087*Math.abs(x)-.05);
  return bake(grp,[ab]);}

PLANES.add('mig25',{
 ids:["MiG-25","MiG-31"],
 tables:{
  AC:()=>({
    // MiG-25PD 'Foxbat-E' (izd. 84): two R-15BD-300 (73.5 kN dry / ~110 kN reheat each), empty ~20,000 kg, 14,570 kg internal fuel + 5,300 l belly tank (~4,350 kg), MTOW 36,720 kg
      // with four R-40, S = 61.4 m². Operating limit M2.83 (engine and skin temperature: stagnation temperature at M2.83 in the stratosphere is ~290 °C, where the cockpit
      // warning lamp lights), 1,200-1,250 km/h IAS at low level, +5 g clean (3.8 g with the belly tank), unlimited-roll aileron reversal and wingtip flexing keep the roll rate low.
      // Sapfir-25 (RP-25M) pulse radar with MTI, TP-26Sh1 IRST, SPO-10 warner, no gun.
      'MiG-25':{name:'MiG-25PD',model:makeMiG25,st:MIG25ST,empty:20000,fuel:14570,tank:4350,ptb:4350,S:61.4,CLa:3.0,cd0:.0095,k:.2,mil:147000,ab:224000,mcap:3,mlim:2.83,vne:1250,mmax:3.2,
        abM:[[0,1],[.5,1],[1,1.2],[1.5,1.6],[2,2.0],[2.5,2.6],[3,3.1]],sfc:[3.53e-5,8.3e-5],spool:5.5,abLight:.9,
        clt:[[-20,-.8],[-10,-.45],[0,0],[5,.25],[10,.5],[15,.72],[20,.88],[25,.95],[30,.9],[35,.88],[40,.85],[50,.75],[60,.65],[90,0]],
        cdm:[[0,0],[.8,0],[.9,.004],[1,.016],[1.1,.024],[1.3,.023],[1.6,.019],[2,.0145],[2.5,.0105],[3,.009]],gHi:0,dW:34000,tkG:[3.8,5],gUlt:6.7,dep:{a:25,rock:.7,spin:3.0},
        ff:[.6,5.2,16.8],gLim:5,aoaLim:17,roll:1.9,fbw:false,rcs:20,irs:1.6,ols:{tail:13000,head:4500,lrf:0},cockpit:'fulcrum',pit:'foxbat',pki:true,units:'met',eye:[5.1,.85],
        radar:{name:'Sapfir-25',R0:66000,ranges:[25,50,100,200],unit:1000,ul:'KM',ecc:.12},irst:true,pulse:true,
        gun:{name:'NO GUN',rate:1,v:900,dmg:0,ammo:0,spread:.01},rel:[2,3,1,4,'1B','4B'],migRel:['2','3','1','4','1B','4B'],keepJ:['1','1B','2','3','4','4B'],rwr:'25',spo:4,tankName:'PTB-5300'}
  }),
  FOE:()=>({
    'MiG-25':'F-15C'
  }),
  LOAD:()=>({
    cold:{
      'MiG-25':{1:'R-40RD',2:'R-40TD',3:'R-40TD',4:'R-40RD',C:'PTB'}
    },
    modern:{
      'MiG-25':{1:'R-40RD','1B':'R-60M',2:'R-40RD',3:'R-40RD',4:'R-40RD','4B':'R-60M',C:'PTB'}
    },
    guns:{
      'MiG-25':{C:'PTB'}
    }
  }),
  CMS:()=>({
    cold:{
      'MiG-25':[0,0]
    },
    modern:{
      'MiG-25':[0,0]
    }
  }),
  RWR_OF:()=>({
    'MiG-25':'SPO-10'
  }),
  NCTR_ID:()=>({
    'MiG-25':'MIG-25'
  }),
  STN:()=>({
    'MiG-25':{1:['R-40RD','R-40TD','R-60M'],'1B':['R-60M'],2:['R-40RD','R-40TD'],3:['R-40RD','R-40TD'],4:['R-40RD','R-40TD','R-60M'],'4B':['R-60M'],C:['PTB']}
  }),
  ACROLE:()=>({
    'MiG-25':'USSR · HIGH-SPEED INTERCEPTOR'
  }),
  FV:()=>({
    'MiG-25':{hw:7.4,y1:4.1,span:'14.01 m',d:()=>bth([[-1.3,.6],[-1.7,.6],[-2.15,4.0],[-1.88,4.0]],'sk-body')+bth([[-1.7,-.02],[-7.05,-.5],[-7.05,-.64],[-1.7,-.3]],'sk-wing')+bth([[-1,-.05],[-4.1,-.3],[-4.1,-.4],[-1,-.25]],'sk-wing')+ell(0,0,1.5,.78,'sk-body')+bth([[-.82,.65],[-1.82,.65],[-1.82,-.9],[-.82,-.9]],'sk-body')+bth([[-.9,.55],[-1.74,.55],[-1.74,-.8],[-.9,-.8]],'sk-dark')+ell(0,.7,.42,.36,'sk-can')}
  }),
  CALLS:()=>({
    'MiG-25':'FOXBAT'
  }),
  FLAPSW:()=>({
    'MiG-25':'fl25'
  }),
  STALL:()=>({
    'MiG-25':{s:.55,twin:1}
  }),
  ENGN:()=>({
    'MiG-25':'2× R-15BD-300'
  }),
  IRSTN:()=>({
    'MiG-25':'TP-26Sh1'
  }),
  CREW:()=>({
    'MiG-31':'NAVIGATOR'
  })
 },
 hooks:{
  /* game.js line 14166 */
  L14166(){
    // ---------- MiG-31 'Foxhound' (izd. 01 / 01B; the BM fit in the modern era) ----------
    // Two D-30F6 turbofans (93.2 kN dry / 151.9 kN reheat each), empty 21,820 kg, 16,350 kg internal fuel, 61.6 m² wing, 5 g, M2.83 / 1,500 km/h at low level.
    // RP-31 N007 Zaslon: the first fighter PESA (1.1 m array, ±70° electronic scan, HPRF 200 kHz in the ППС front-hemisphere mode), ten track files and four
    // R-33s guided at once; instrumented scales 0-200 / 0-400 km (reference notes in planes/Modern/MiG-31/Zaslon). The navigator in the back seat runs the
    // set ([6] hands it to the pilot). 8TK retractable IRST under the nose. Four R-33 (AA-9 Amos) in tandem pairs under the belly, R-40TD / R-60M on the
    // wing pylons, GSh-6-23 with 260 rounds. Modern era: R-37M under the belly, R-77 / R-73 on the wings (MiG-31BM).
    try{
      const M31ST={1:[-4.78,-.84,1.7],2:[-2.9,-.64,1.5],3:[2.9,-.64,1.5],4:[4.78,-.84,1.7],5:[-.62,-.98,-1.6],6:[.62,-.98,-1.6],7:[-.62,-.98,3.0],8:[.62,-.98,3.0]};
      // R-33 (izd. 410): 490 kg, semi-active with inertial mid-course under Zaslon time-shared illumination. Modelled as a datalinked round whose own
      // seeker only takes over in the last 2 km, so the radar has to hold the track file almost to impact, and four can be in the air on four targets.
      v215Msl('R-33',Object.assign({},MSL['AIM-54A'],{ph:null,hoj:1,ecc:.45,trk:.6,ccm:.35,loft:.5,loftCap:28000,seek:'ARH',pit:2000,burn:24,acc:44,cd:5.8e-5,maxG:16,gimbal:50*D2R,
        life:200,N:3.6,res:.55,rmin:2500,mass:490,aiR:55000,aiOff:20*D2R,smoke:.6}),{mp:175,isp:245,tb:8,ts:16,f:.55},{L:4.15,R:.19,f:[[.3,.9,.5],[2.0,1.1,1.4]]},.38,'R33','AA-9 Amos · long range, Zaslon-guided','33');
      let mk=AC['MiG-25'].model;
      try{mk=eval('('+AC['MiG-25'].model.toString().replace(/^function\s*\w*/,'function makeMiG31').replace(/pylons\(grp,MIG25ST,/,'pylons(grp,M31ST,')+')');}catch(e){}
      cloneType('MiG-25','MiG-31',{name:'MiG-31',model:mk,st:M31ST,empty:21820,fuel:16350,tank:0,S:61.6,CLa:3.1,cd0:.0105,k:.19,mil:186400,ab:303800,spool:4.2,abLight:.8,
        sfc:[2.05e-5,5.4e-5],ff:[.5,3.9,16.4],gLim:5,aoaLim:18,roll:2.0,mlim:2.83,vne:1500,mmax:3.0,mcap:2.9,rcs:20,irs:1.7,dW:39000,tkG:[5,5],gUlt:6.5,
        ols:{tail:40000,head:12000,lrf:0},irst:true,pulse:false,rio:true,wso:true,twsN:4,trkN:10,pki:true,
        radar:{name:'Zaslon',R0:160000,ranges:[50,100,200,400],unit:1000,ul:'KM',ecc:.5,pesa:1,beam:2.5*D2R},
        gun:{name:'GSh-6-23',rate:130,v:715,dmg:12,ammo:260,spread:.003},rel:[5,6,7,8,2,3,1,4],migRel:['5','6','7','8','2','3','1','4'],keepJ:['1','2','3','4','5','6','7','8'],tankName:'—'});
      delete AC['MiG-31'].ptb;RGIM['Zaslon']=[70,70,60,1];
      STN['MiG-31']={1:['R-60M','R-73'],4:['R-60M','R-73'],2:['R-40TD','R-60M','R-73','R-77'],3:['R-40TD','R-60M','R-73','R-77'],5:['R-33','R-37M'],6:['R-33','R-37M'],7:['R-33','R-37M'],8:['R-33','R-37M']};
      LOAD.cold['MiG-31']={5:'R-33',6:'R-33',7:'R-33',8:'R-33',2:'R-40TD',3:'R-40TD',1:'R-60M',4:'R-60M'};
      LOAD.modern['MiG-31']=MSL['R-37M']?{5:'R-37M',6:'R-37M',7:'R-37M',8:'R-37M',2:'R-77',3:'R-77',1:'R-73',4:'R-73'}:Object.assign({},LOAD.cold['MiG-31']);
      if(LOAD.guns)LOAD.guns['MiG-31']={};STRIKE_LOAD['MiG-31']=Object.assign({},LOAD.cold['MiG-31']);
      for(const era of Object.keys(CMS))CMS[era]['MiG-31']=[32,32];
      ENGN['MiG-31']='2× D-30F6';IRSTN['MiG-31']='8TK';ENG_SUP['MiG-31']=.06;CALLS['MiG-31']='FOXHOUND';NCTR_ID['MiG-31']='MIG-31';FOE['MiG-31']='F-14A';RWR_OF['MiG-31']='SPO-15LM';
      ACROLE['MiG-31']='USSR · LONG-RANGE INTERCEPTOR · ZASLON PESA · 4× R-33 · PILOT + NAVIGATOR';DL_FIT.add('MiG-31');
      try{CTYPES.cold[1].INT.push('MiG-31');CTYPES.modern[1].INT.unshift('MiG-31');}catch(e){}
    }catch(e){console.warn('v215 MiG-31',e);}
  },
  /* game.js line 14653 */
  L14653(){
    /* ===== v218: MiG-31 crew split and pilot's cockpit =====
       The navigator (штурман-оператор) owns the Zaslon. In the front seat the radar keys become requests to him (lock, next target, drop, TWS); range,
       cursor, sensor and mode keys are his alone and do nothing up front. The pilot flies, picks and fires weapons, and reads the navigator's picture
       on the ИПВ tactical indicator. Pilot board after the photos in planes/Modern/MiG-31/pilot cockpit: turquoise panel, all-analogue flight group
       (airspeed / Mach, altimeter, variometer, AoA-g in a column; attitude indicator over the ПНП course indicator), the ИПВ to the right of it with a
       lamp block under it, engine tachometer and temperatures, fuel and clock on the right, the HUD control box with its digital strip on top. ===== */
    try{
    const M31=()=>!!player&&player.alive&&player.type==='MiG-31';
    let busy=0;const own=f=>function(){busy++;try{return f.apply(this,arguments);}finally{busy--;}};
    rio.update=own(rio.update);rio.cmd=own(rio.cmd);
    let nagT=0;const nag=()=>{const t=performance.now();if(t>nagT){nagT=t+1500;flash('НАВИГАТОР · THE NAVIGATOR RUNS THE RADAR',1300);}sfx.click();};
    for(const k of['slew','setTWS','bore','designate','next','toggleSensor','drop']){const f=radar[k];if(typeof f!=='function')continue;
      radar[k]=function(){if(M31()&&!busy&&game.active){nag();return;}return f.apply(this,arguments);};}
    {let ri=radar.ri||0;Object.defineProperty(radar,'ri',{configurable:true,get(){return ri;},set(v){if(M31()&&!busy&&game.active&&player.alive&&radar._r31!==1){nag();return;}ri=v;}});}
    {const _r=radar.reset;if(_r)radar.reset=function(){radar._r31=1;try{return _r.apply(this,arguments);}finally{radar._r31=0;}};}
    {const _t=rio.toggle;rio.toggle=function(){if(player&&player.type==='MiG-31'){this.on=true;this.say('I keep the Zaslon. You fly, I find them.','m31t',3);sfx.click();return;}return _t.apply(this,arguments);};
     const _p=rio.pilot;rio.pilot=function(){if(player&&player.type==='MiG-31')return;return _p.apply(this,arguments);};}
    {const _mp=makePlayer;makePlayer=function(){const r=_mp.apply(this,arguments);if(player&&player.type==='MiG-31')rio.on=true;return r;};}

    // ---------------- pilot board ----------------
    const o=ck.fulcrum,xg=o.fxOnly[0],{drawG,T}=window.V216;
    const g=new THREE.Group();g.position.copy(xg.position);g.rotation.copy(xg.rotation);g.visible=false;o.root.add(g);
    const Lm=(c,s=16)=>new THREE.MeshPhongMaterial({color:c,shininess:s}),cvs=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
    const box=(w,h,d,m,x,y,z)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);g.add(b);return b;};
    const live=[],quad=(c,w,h,x,y,z,geo)=>{const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;live.push(t);
      const m=new THREE.Mesh(geo||new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));m.position.set(x,y,z);g.add(m);return m;};
    const turq=Lm(0x2fa39b),turq2=Lm(0x268f88),blk=Lm(0x141618),gl=[];
    box(1.0,.46,.03,turq,0,-.01,0);box(.31,.36,.012,turq2,-.31,-.01,.018);box(.3,.36,.012,turq2,.3,-.01,.018);
    const gauge=(x,y,r,draw)=>{const ring=new THREE.Mesh(new THREE.CylinderGeometry(r+.006,r+.006,.016,28),blk);ring.rotation.x=Math.PI/2;ring.position.set(x,y,.028);g.add(ring);
      const c=cvs(160,160);quad(c,0,0,x,y,.0365,new THREE.CircleGeometry(r,32));gl.push({cv:c,draw});};
    // flight group
    gauge(-.42,.115,.038,'ias');gauge(-.42,.025,.038,'alt');gauge(-.42,-.065,.038,'vvi');gauge(-.42,-.155,.033,'aoa');
    gauge(-.29,.09,.062,'adi');gauge(-.29,-.075,.062,'hsi');gauge(-.175,.15,.026,'clk');
    // engines and fuel
    gauge(.15,.105,.048,'rpm');gauge(.27,.12,.032,'egt');gauge(.36,.12,.032,'egt');gauge(.15,-.07,.034,'aoa');
    const fuelC=cvs(160,300);box(.07,.13,.012,blk,.32,-.06,.026);quad(fuelC,.06,.11,.32,-.06,.0325);
    // ИПВ tactical indicator, its lamp block, and the HUD control box with the digital strip on top
    const lampC=cvs(320,96);quad(lampC,.17,.05,-.06,-.12,.026);
    box(.22,.06,.04,Lm(0x23272a),-.04,.205,.03);const hudC=cvs(400,96);quad(hudC,.2,.048,-.04,.205,.0505);
    function drawSide(){const P=player;
      {const c=fuelC.getContext('2d'),f=clamp((P.totalFuel||0)/Math.max(1,P.ac.fuel),0,1);c.fillStyle='#0d0f10';c.fillRect(0,0,160,300);c.strokeStyle='#e6e8e2';c.lineWidth=2;c.strokeRect(50,30,60,230);
        c.fillStyle=f<.2?'#ff5a4a':'#e6e8e2';c.fillRect(54,256-222*f,52,222*f);T(c,'ТОПЛ',80,14,'#bfc4bc',16);T(c,String(Math.round(P.totalFuel||0)),80,282,'#fff',20);}
      {const c=lampC.getContext('2d');c.fillStyle='#1b1e20';c.fillRect(0,0,320,96);const now=performance.now(),thr=typeof rwrMslSeen==='function'&&rwrMslSeen();
        [['ПОЖАР',P.dm&&P.dm.fire],['ОТКАЗ',P.hp<60],['ТОПЛ',(P.totalFuel||0)<P.ac.fuel*.15],['РАКЕТА',thr],['ПР',radar.mode==='STT'],['ШТУРМ',rio.active()],['ФОРС',(P.ab||0)>.05],['ЗЕМЛЯ',!!P.onGnd]].forEach(([s,on],i)=>{
          const x=6+(i%4)*78,y=6+(i/4|0)*45;c.fillStyle=on?(i<4?'#ff4a30':i===4?'#ffd23a':'#46d66a'):'#3a3530';if(on&&i<4&&now%500>300)c.fillStyle='#5a1810';c.fillRect(x,y,72,38);T(c,s,x+36,y+20,on?'#101010':'#8a8070',15);});}
      {const c=hudC.getContext('2d');c.fillStyle='#23272a';c.fillRect(0,0,400,96);c.fillStyle='#200805';c.fillRect(20,14,250,40);
        const d=new Date(),p2=v=>String(v).padStart(2,'0');T(c,'К'+String(Math.round(((P.hdg%360)+360)%360)).padStart(3,'0')+' Н'+(P.pos.y/1000).toFixed(1),30,34,'#ff6a3a',20,'left');
        T(c,p2(d.getHours())+':'+p2(d.getMinutes()),340,34,'#e8ece6',18);['ЯРК','ТЕСТ','ОБОГР','ВКЛ'].forEach((s,i)=>{c.strokeStyle='#e8ece6';c.lineWidth=2;c.beginPath();c.arc(40+i*95,74,9,0,7);c.stroke();T(c,s,62+i*95,74,'#cfd3cf',12,'left');});}}
    {const _sc=selectCockpit;selectCockpit=function(kind,pit){const r=_sc.apply(this,arguments);try{const on=kind==='fulcrum'&&!!player&&player.type==='MiG-31';g.visible=on;if(on)xg.visible=false;}catch(e){}return r;};}
    {let n=0;o.anims.push(()=>{if(!g.visible||!player)return;if(n++&1)return;try{drawG(gl);drawSide();}catch(e){}for(const t of live)t.needsUpdate=true;});}
    ACROLE['MiG-31']='USSR · LONG-RANGE INTERCEPTOR · ZASLON PESA · 4× R-33 · PILOT FLIES, NAVIGATOR RUNS THE RADAR';
    }catch(e){console.warn('v218 MiG-31',e);}
  }
 }
});
