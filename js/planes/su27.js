"use strict";
/* =====================================================================================================================
   Su-27 family (Su-27, Su-27SM, Su-33, Su-30SM, Su-30MK2, Su-35S) — everything that belongs to this jet family, split out of game.js (v258).
   Loaded BEFORE game.js (after js/planes/registry.js). Nothing here runs against game.js state at load time:
     * top-level declarations below are pure data (station layouts, store lists) or functions (model builder, cockpit/MFD code);
     * `tables` are thunks. game.js calls PLANES.apply('<TABLE>',<TABLE>) right after it declares each table, which merges
       these entries in at the same point the old inline literal used to be evaluated;
     * `hooks` are the one-off statements that used to sit inline in game.js (variants, cockpit builders, HUD/MFD patches).
       game.js calls PLANES.run('su27','<tag>') at the exact spot each one was cut from, so execution order is unchanged.
   Type ids in this file: Su-27, Su-27SM, Su-33, Su-30SM, Su-30MK2, Su-35S
   ===================================================================================================================== */
const SU27ST={1:[-7.35,.02,3.6],2:[-5.75,-.36,2.9],3:[-4.1,-.42,2.0],4:[-1.62,-1.32,-1.4],5:[-.42,-.98,1.6],6:[.42,-.98,1.6],7:[1.62,-1.32,-1.4],8:[4.1,-.42,2.0],9:[5.75,-.36,2.9],10:[7.35,.02,3.6]};
function makeSu27(){
  // Su-27: 21.9 m long, 14.7 m span, ogival LERX blended into the wing, widely spaced nacelles, fins on tail booms, long central stinger
  const grp=new THREE.Group(),mat=SKIN(0x9fb2c2),dk=SKIN(0x6f8698),lt=SKIN(0xbcc9d3),blk=SKIN(0x1c1f22,10),met=SKIN(0x5a5550,60),rad=SKIN(0xd8dccc,20);
  grp.add(new THREE.Mesh(sloft([[-11.0,.02,.04,.02,2],[-10.4,.25,.03,.25,2],[-9.4,.45,.06,.45,2.1],[-8.2,.58,.14,.58,2.2],[-6.8,.66,.26,.64,2.3],[-5.4,.72,.34,.7,2.4],
    [-4.0,.8,.36,.66,2.6],[-2.5,.95,.3,.52,3],[0,1.08,.24,.4,3.4],[3,1.0,.22,.34,3.4],[6,.72,.2,.28,3],[8.5,.42,.16,.22,2.5],[10.9,.12,.12,.1,2]]),mat));
  grp.add(new THREE.Mesh(loft([[-11.02,.022,.04,.022,2],[-10.4,.255,.03,.255,2],[-9.4,.455,.06,.455,2.1],[-8.9,.52,.1,.52,2.15]],40,false,false),rad));
  rim(grp,.52,.022,dk,0,.1,-8.9);
  ball(grp,.12,dk,0,.12,10.95,1,1,1.6);// stinger tail cap
  for(const sd of[-1,1]){{const nc=new THREE.Mesh(sloft([[-4.7,.56,-.68,.52,5],[-3.0,.62,-.64,.54,4.5],[1,.62,-.56,.5,3.5],[5,.58,-.46,.48,2.8],[7.7,.52,-.42,.45,2.3]],32,false,false),mat);nc.position.x=sd*1.58;grp.add(nc);}
    intake(grp,sd*1.58,-.68,-4.74,.55,.5,mat,blk);
    nozzle(grp,sd*1.58,-.42,8.2,.52,.44,1.0,met,dk);
    const bm=new THREE.Mesh(sloft([[3.2,.02,.05,.02,2],[4.2,.2,.05,.14,2.5],[8.6,.2,.05,.14,2.5],[9.6,.04,.05,.04,2]],16),mat);bm.position.x=sd*2.35;grp.add(bm);
    const f=finShape([[3.7,.15],[6.5,3.55],[7.7,3.55],[8.2,.15]],.12,mat);f.position.set(sd*2.35,.1,0);grp.add(f);
    pod(grp,1.1,.08,dk,sd*2.35,3.62,7.2);// fin-tip antenna fairing
    const st=planform([[1.9,6.1],[5.2,8.4],[5.2,9.45],[1.9,9.7]],.08,false,mat);st.scale.x=sd;st.position.y=.02;grp.add(st);
    const vf=finShape([[5.6,-.1],[6.6,-1.0],[7.3,-1.0],[7.2,-.1]],.05,dk);vf.position.x=sd*2.35;vf.rotation.z=sd*.1;grp.add(vf);}
  const wing=planform([[.5,-7.1],[1.15,-5.0],[2.2,-1.1],[7.35,2.95],[7.35,4.25],[2.3,5.6],[.5,5.7]],.13,true,mat);wing.position.y=.05;grp.add(wing);
  canopy(grp,0x557080,.5,.56,2.1,.88,-6.0,dk);
  grp.add(new THREE.Mesh(sloft([[-3.9,.02,.95,.02,2],[-3.2,.34,.92,.18,2],[1.5,.32,.8,.14,2],[3.6,.1,.6,.05,2]],20),lt));
  pod(grp,3.2,.32,lt,0,.86,1.2,1,.45);// dorsal air-brake hump
  ball(grp,.13,SKIN(0x2a3438,90),.3,.86,-7.3,1,1,1.15);// OLS-27 IRST ball
  rod(grp,[0,.04,-10.9],[0,.04,-12.0],.022,met,1,[0,1,0],8);ball(grp,.035,met,0,.04,-12.0);
  navLight(0xff2a1a,-7.3,.05,3.3,grp);navLight(0x22ff55,7.3,.05,3.3,grp);
  const ab=new THREE.Group();[-1.58,1.58].forEach(x=>{const c=abPlume(5,.44);c.position.set(x,-.42,8.7);ab.add(c);});grp.add(ab);grp.userData.ab=ab;
  pylons(grp,SU27ST,['4','5','6','7'],SKIN(0x8a9cac),x=>.0);
  return bake(grp,[ab]);}
function _smGauges(V){const P=player;  for(const g of V.G){const c=g.cv.getContext('2d'),S=160,r=74;c.setTransform(1,0,0,1,0,0);c.fillStyle='#0d0f10';c.fillRect(0,0,S,S);c.translate(S/2,S/2);
    const tick=(a0,a1,n)=>{c.strokeStyle='#e6e8e2';c.lineWidth=2;for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n-90)*D2R;c.beginPath();c.moveTo(Math.cos(a)*r*.82,Math.sin(a)*r*.82);c.lineTo(Math.cos(a)*r*.96,Math.sin(a)*r*.96);c.stroke();}};
    const ndl=(deg,len,col)=>{const a=(deg-90)*D2R;c.strokeStyle=col||'#fff';c.lineWidth=4;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*r*len,Math.sin(a)*r*len);c.stroke();};
    if(g.draw==='adi'){c.save();c.rotate(-(P.bank||0));const po=(P.pitch||0)*R2D*2;c.fillStyle='#5a6d80';c.fillRect(-90,-180+po,180,180);c.fillStyle='#2b2b2b';c.fillRect(-90,po,180,180);c.restore();
      c.strokeStyle='#ffd23a';c.lineWidth=4;c.beginPath();c.moveTo(-40,0);c.lineTo(-12,0);c.moveTo(40,0);c.lineTo(12,0);c.stroke();}
    else if(g.draw==='ias'){tick(-150,150,10);ndl(-150+300*clamp((P.cas||0)*1.852/1600,0,1),.8);smTxt(c,'КМ/Ч',0,40,'#bfc4bc',13);}
    else if(g.draw==='vvi'){tick(-170,-10,8);ndl(-90+clamp((P.vel?P.vel.y:0)/150,-1,1)*80,.8);smTxt(c,'ВАР',0,40,'#bfc4bc',13);}
    else if(g.draw==='alt'){tick(0,324,10);ndl(360*((P.pos.y%1000)/1000),.85);ndl(360*((P.pos.y/20000)%1),.55,'#e8c040');smTxt(c,(P.pos.y/1000).toFixed(1),0,38,'#fff',16);}
    else if(g.draw==='n1'||g.draw==='n2'){tick(-135,135,11);ndl(-135+270*clamp((P.n||0)/1.1,0,1),.8);smTxt(c,g.draw==='n1'?'1':'2',0,38,'#bfc4bc',14);}
    else if(g.draw==='clk'){const d=new Date();tick(0,330,11);ndl(360*((d.getHours()%12)+d.getMinutes()/60)/12,.5);ndl(360*d.getMinutes()/60,.8);}
    c.setTransform(1,0,0,1,0,0);}}
/* ===== v206: Su-30SM 'Flanker-H' (two seats, canards, AL-31FP thrust vectoring, N011M Bars PESA, OLS-30, R-74M / R-74M2, R-77-1, R-77M, R-37M).
   Cockpit and systems after the Codename Flanker Su-30 EFM / ASM and CWS manuals: MFD pages VSD / TSD / RWR / MFWS (ENG FUE SYS LG HYD LSS AEP RFL FRP) /
   MASD, UFCP with NAV / A/A / A/G and VV/FXD (three HUD modes), SM HUD (G circle, watermark, acceleration chevrons slaved to the bank scale, Su-30 sink-rate
   arc, AoA scale, WP block), quadruplex FBW with the payload G-limiter, TVC (Shift+Y), GCES, TWS multitrack (each R-77 / R-37M keeps its own track file,
   four in the air at once). The WSO runs the radar and weapons; [6] gives them to you. Shift+8 hides the cockpit switch panel. ===== */
function SMX(t){return t==='Su-27SM'||t==='Su-30SM';}

PLANES.add('su27',{
 ids:["Su-27","Su-27SM","Su-33","Su-30SM","Su-30MK2","Su-35S"],
 tables:{
  AC:()=>({
    // OLS-27 (v203): ~50 km on an afterburning fighter's tail and ~15 km head-on in the published figures; 22 / 10 km here before the target's heat scale and reheat
      // Su-27S: 2x AL-31F (74.5 / 122.6 kN), 62 m² wing, normal fuel 5,270 kg, analog FBW with a limiter that can be pulled through, N001 + OEPS-27
      'Su-27':{name:'Su-27',model:makeSu27,st:SU27ST,empty:16380,fuel:5270,tank:0,S:62,CLa:4.5,cd0:.0185,k:.12,mil:149000,ab:245200,spool:2.0,
        clt:[[-20,-1],[-10,-.6],[0,.03],[5,.38],[10,.74],[15,1.07],[20,1.34],[25,1.55],[30,1.68],[35,1.74],[40,1.72],[50,1.55],[60,1.25],[90,0]],
        abM:[[0,1],[.5,1.195],[1,1.36],[1.5,1.495],[2,1.6498],[2.5,1.7345],[3,1.7693]],cdm:[[0,0],[.8,0],[.9,.005],[1,.021],[1.1,.029],[1.3,.028],[1.6,.0197],[2,.0175],[2.5,.0132],[3,.0107]],dW:23000,tkG:[9,9],dep:{a:37,rock:.5,spin:2.0},
        ff:[.35,2.7,12.5],gLim:9,aoaLim:26,roll:4.0,fbw:true,ovrOK:true,rcs:12,irs:1.4,ols:{tail:22000,head:10000,lrf:9000},cockpit:'fulcrum',pit:'flanker',units:'met',
        radar:{name:'N001',R0:46*NM,ranges:[10,25,50,100],unit:1000,ul:'KM',ecc:.5},irst:true,
        gun:{name:'GSh-30-1',rate:25,v:860,dmg:26,ammo:150,spread:.003},rel:[1,10,2,9,3,8,4,7,5,6],migRel:['3','8','4','7','5','6','2','9','1','10'],rwr:'27',spo:5,tankName:'—'}
  }),
  ENG_SUP:()=>({
    'Su-27':.081,
    'Su-27SM':.081,
    'Su-33':.069
  }),
  FOE:()=>({
    'Su-27':'F-15C'
  }),
  LOAD:()=>({
    cold:{
      'Su-27':{1:'R-73',2:'R-73',3:'R-27R',4:'R-27T',5:'R-27R',6:'R-27R',7:'R-27T',8:'R-27R',9:'R-73',10:'R-73'}
    },
    modern:{
      'Su-27':{1:'R-73',2:'R-73',3:'R-77',4:'R-27ET',5:'R-27ER',6:'R-27ER',7:'R-27ET',8:'R-77',9:'R-73',10:'R-73'}
    },
    guns:{
      'Su-27':{}
    }
  }),
  CMS:()=>({
    cold:{
      'Su-27':[96,96]
    },
    modern:{
      'Su-27':[96,96]
    }
  }),
  ECM_FIT:()=>({
    'Su-27':{cold:{n:'L-005S',jp:.9,dec:.42,kg:90,cd:.0004,warm:20,tips:true},modern:{n:'L-005S',jp:1,dec:.5,kg:90,cd:.0004,warm:20,tips:true}}
  }),
  RWR_OF:()=>({
    'Su-27':'SPO-15LM'
  }),
  NCTR_ID:()=>({
    'Su-27':'SU-27'
  }),
  STN:()=>({
    'Su-27':{1:['R-73'],2:['R-73','R-77'],3:['R-27R','R-27T','R-27ER','R-27ET','R-73','R-77'],4:['R-27R','R-27T','R-27ER','R-27ET','R-77'],
               5:['R-27R','R-27ER','R-77'],6:['R-27R','R-27ER','R-77'],7:['R-27R','R-27T','R-27ER','R-27ET','R-77'],
               8:['R-27R','R-27T','R-27ER','R-27ET','R-73','R-77'],9:['R-73','R-77'],10:['R-73']}
  }),
  ACROLE:()=>({
    'Su-27':'USSR · AIR SUPERIORITY'
  }),
  FV:()=>({
    'Su-27':{hw:8,y1:5.2,span:'14.70 m',d:()=>bth([[-2,.6],[-2.3,.6],[-2.6,5.1],[-2.38,5.1]],'sk-body')+bth([[-1.3,-.2],[-4.3,-.3],[-4.3,-.42],[-1.3,-.5]],'sk-wing')+bth([[-1,-.05],[-7.4,0],[-7.4,-.12],[-1,-.42]],'sk-wing')+bth([[-.45,.15],[-2.35,.15],[-2.35,-1],[-.45,-1]],'sk-body')+ell(1.4,-.45,.78,.44,'sk-dark')+ell(-1.4,-.45,.78,.44,'sk-dark')+ell(0,.3,.95,.6,'sk-body')+ell(0,.25,.5,.48,'sk-body')+ell(0,.9,.45,.4,'sk-can')+ell(0,.55,.14,.14,'sk-dark')}
  }),
  CALLS:()=>({
    'Su-27':'FLANKER'
  }),
  FLAPSW:()=>({
    'Su-27':'flap'
  }),
  STRIKE_LOAD:()=>({
    'Su-27':{1:'R-73',10:'R-73',2:'R-73',9:'R-73',3:'B-8M1',8:'B-8M1',4:'FAB-250',5:'FAB-250',6:'FAB-250',7:'FAB-250'}
  }),
  ENGN:()=>({
    'Su-27':'2× AL-31F',
    'Su-27SM':'2× AL-31F',
    'Su-33':'2× AL-31F (series 3)'
  }),
  IRSTN:()=>({
    'Su-27':'OLS-27',
    'Su-27SM':'OLS-27',
    'Su-33':'OLS-27'
  }),
  CREW:()=>({
    'Su-30SM':'WSO',
    'Su-30MK2':'OPERATOR'
  })
 },
 hooks:{
  /* game.js line 11906 */
  L11906(){
    {
    // ---------- type helpers ----------
    const cp=v=>Array.isArray(v)?v.slice():v&&typeof v==='object'?Object.assign({},v):v;
    function cloneT(src,dst){
      for(const T of[FOE,NCTR_ID,ACROLE,CALLS,FLAPSW,RWR_OF,ECM_FIT,FV,STRIKE_LOAD])if(T&&T[src]!==undefined&&T[dst]===undefined)T[dst]=T===ECM_FIT||T===FV?T[src]:cp(T[src]);
      for(const era of Object.keys(LOAD))if(LOAD[era][src]&&!LOAD[era][dst])LOAD[era][dst]=cp(LOAD[era][src]);
      for(const era of Object.keys(CMS))if(CMS[era][src]&&!CMS[era][dst])CMS[era][dst]=CMS[era][src].slice();
      if(STN[src]&&!STN[dst]){STN[dst]={};for(const k of Object.keys(STN[src]))STN[dst][k]=STN[src][k].slice();}
      for(const S of[DL_FIT,RUS,GUIDJ])if(S.has(src))S.add(dst);
      if(!ACS.includes(dst))ACS.splice(ACS.indexOf(src)+1,0,dst);}

    // ---------- Su-27S: R-27 family and R-73 only; TWS stays the single-target N001 mode of the MiG-29A ----------
    const STN27=JSON.parse(JSON.stringify(STN['Su-27']));
    for(const k of Object.keys(STN['Su-27']))STN['Su-27'][k]=STN['Su-27'][k].filter(w=>w!=='R-77');
    delete AC['Su-27'].twsN;
    LOAD.modern['Su-27']={1:'R-73',2:'R-73',3:'R-27ER',4:'R-27ET',5:'R-27ER',6:'R-27ER',7:'R-27ET',8:'R-27ER',9:'R-73',10:'R-73'};
    ACROLE['Su-27']='USSR · AIR SUPERIORITY · R-27 / R-73';

    // ---------- Su-27SM: upgraded N001V, two-target TWS, R-77 (cockpit still the Su-27S pit for now) ----------
    AC['Su-27SM']=Object.assign({},AC['Su-27'],{name:'Su-27SM',empty:16700,twsN:2,
      radar:Object.assign({},AC['Su-27'].radar,{name:'N001V',R0:52*NM,ecc:.6})});
    cloneT('Su-27','Su-27SM');
    STN['Su-27SM']=JSON.parse(JSON.stringify(STN27));
    LOAD.modern['Su-27SM']={1:'R-73',2:'R-73',3:'R-77',4:'R-27ET',5:'R-27ER',6:'R-27ER',7:'R-27ET',8:'R-77',9:'R-73',10:'R-73'};
    ACROLE['Su-27SM']='RUSSIA · AIR SUPERIORITY · R-77 · 2-TARGET TWS';CALLS['Su-27SM']='FLANKER';NCTR_ID['Su-27SM']='SU-27';FOE['Su-27SM']='F-15C';
    RGIM&&RGIM['N001']&&(RGIM['N001V']=RGIM['N001']);

    // ---------- Su-33: the Su-27K deck fighter: canards, folding wings, hook, 12 hardpoints (two more under the wings for R-27s) ----------
    const SU33ST=Object.assign({},SU27ST,{11:[-4.92,-.4,2.45],12:[4.92,-.4,2.45]});
    let makeSu33=makeSu27;
    try{let src=makeSu27.toString().replace('function makeSu27','function makeSu33').replace('pylons(grp,SU27ST,','pylons(grp,SU33ST,').replace('SKIN(0x9fb2c2)','SKIN(0x8b98a4)');
      // canards on the LERX and a tail hook under the stinger
      src=src.replace('canopy(grp,',"{const cn=planform([[1.0,-5.95],[3.25,-4.65],[3.25,-3.95],[1.0,-3.7]],.07,true,mat);cn.position.y=.32;grp.add(cn);}rod(grp,[0,-.18,8.6],[0,-.55,10.3],.05,met,1,[0,1,0],6);canopy(grp,");
      makeSu33=eval('('+src+')');}catch(e){console.warn('Su-33 model fallback',e);}
    AC['Su-33']=Object.assign({},AC['Su-27'],{name:'Su-33',model:makeSu33,st:SU33ST,empty:18400,fuel:6000,S:67.84,mil:149000,ab:251000,dW:26000,gLim:8,aoaLim:28,rcs:13,
      rel:[1,10,2,9,3,8,11,12,4,7,5,6],migRel:['3','8','11','12','4','7','5','6','2','9','1','10'],hook:true});
    delete AC['Su-33'].twsN;
    cloneT('Su-27','Su-33');
    STN['Su-33']=JSON.parse(JSON.stringify(STN['Su-27']));STN['Su-33'][11]=STN['Su-33'][12]=['R-27R','R-27T','R-27ER','R-27ET','R-73'];
    LOAD.cold['Su-33']={1:'R-73',2:'R-73',3:'R-27R',4:'R-27T',5:'R-27R',6:'R-27R',7:'R-27T',8:'R-27R',9:'R-73',10:'R-73',11:'R-27R',12:'R-27R'};
    LOAD.modern['Su-33']={1:'R-73',2:'R-73',3:'R-27ER',4:'R-27ET',5:'R-27ER',6:'R-27ER',7:'R-27ET',8:'R-27ER',9:'R-73',10:'R-73',11:'R-27ER',12:'R-27ER'};
    if(LOAD.guns)LOAD.guns['Su-33']={};
    ACROLE['Su-33']='RUSSIA · CARRIER FIGHTER · 12 PYLONS';CALLS['Su-33']='FLANKER-D';NCTR_ID['Su-33']='SU-33';FOE['Su-33']='F-18C';
    FV['Su-33']=Object.assign({},FV['Su-27']);
    window.CV_AC&&CV_AC.add('Su-33');if(window.APP_KT)APP_KT['Su-33']=130;
    try{const S=eval('PROBE_AC');S.add('Su-33');}catch(e){}

    // ---------- campaign: the new Flankers fly for the red side ----------
    CTYPES.modern[1].CAP=['Su-27SM','Su-27','MiG-29S','MiG-29'];CTYPES.modern[1].INT=['MiG-29S','Su-27SM','Su-27','MiG-25'];CTYPES.modern[1].ESC=['MiG-29S','Su-27SM','Su-27'];
    // the network type index has to know every jet, in the same order on every client
    for(const k of Object.keys(AC))if(!ACK.includes(k))ACK.push(k);

    // ---------- team selection ----------
    game.team='BLUE';try{const t=localStorage.getItem('viper.team');if(t==='RED'||t==='BLUE')game.team=t;}catch(e){}
    try{const v=JSON.parse(localStorage.getItem('viper.sel')||'null');if(v&&ACS.includes(v.ac))game.ac=v.ac;}catch(e){}
    function teamFix(){if(!teamOK(game.ac))game.ac=game.team==='RED'?'MiG-29':'F-16';if(game.foe!=='AUTO'&&teamOK(game.foe))game.foe='AUTO';
      try{localStorage.setItem('viper.team',game.team);}catch(e){}if(window.CV)CV.name=cvShipName()==='KUZNETSOV'?'KUZNETSOV':'CVN-71';}
    window.teamFix=teamFix;
    {const _hr=hqRefresh;hqRefresh=function(){const was=game._tm;teamFix();_hr.apply(this,arguments);hqPersist();
      if(was!==game.team){game._tm=game.team;try{if(typeof CMPUI!=='undefined')CMPUI.renderSide(true);}catch(e){}}};}
    teamFix();game._tm=game.team;try{segSet();}catch(e){}

    // GCI in the planner: REDFOR always fights under ground control
    {const _gs=GCI.setup;GCI.setup=function(plan,b){if(game.team==='RED'&&plan&&plan.gci&&!plan.gci.on)plan=Object.assign({},plan,{gci:Object.assign({},plan.gci,{on:true})});return _gs.call(this,plan,b);};}

    // quick-flight carrier missions: REDFOR goes to sea in the Su-33 off the Kuznetsov
    {const _s1=start0;start0=async function(scen){
      if((scen==='CVL'||scen==='CVA')&&game.team==='RED'&&game.ac!=='Su-33'){const old=game.ac;game.ac='Su-33';setTimeout(()=>flash('REDFOR CARRIER · FLYING THE SU-33 OFF THE KUZNETSOV',3500),300);
        try{return await _s1(scen);}finally{game.ac=old;}}
      return _s1(scen);};}

    // ---------- the Admiral Kuznetsov: same ship systems, a 14° ski-jump bow and no catapults ----------
    {const C=window.CV;const RAMP0=-118,BOW=-166,RAMPA=14*D2R,SPOT={x:3,z:34};
      const rampH=lz=>{if(lz>RAMP0)return 0;const t=clamp((RAMP0-lz)/(RAMP0-BOW),0,1),L=RAMP0-BOW;return L*RAMPA*t*t/2;};
      const rampA=lz=>lz>RAMP0?0:RAMPA*clamp((RAMP0-lz)/(RAMP0-BOW),0,1);
      C.kind='CVN';
      const _setup=C.setup;C.setup=function(){const k=player&&RUS.has(player.type)?'KZN':'CVN';
        if(k!==this.kind){if(this.mesh)scene.remove(this.mesh);this.mesh=null;this.kind=k;}
        this.name=k==='KZN'?'KUZNETSOV':'CVN-71';return _setup.apply(this,arguments);};
      const _build=C.build;C.build=function(){if(this.mesh)return this.mesh;const g=_build.apply(this,arguments);
        if(this.kind==='KZN'){
          // darker hull and island
          g.traverse(o=>{if(o.isMesh&&o.material&&o.material.color&&!o.material.map&&!o.userData.keep){const c=o.material.color;if(Math.abs(c.r-c.g)<.06&&Math.abs(c.g-c.b)<.08&&c.r>.25)o.material=o.material.clone(),o.material.color.multiplyScalar(.82);}});
          // ski-jump: a curved ramp across the bow, built up from slices
          const mat=SKIN(0x474c50,8),n=10;for(let i=0;i<n;i++){const z0=RAMP0+(BOW-RAMP0)*i/n,z1=RAMP0+(BOW-RAMP0)*(i+1)/n,h=(rampH(z0)+rampH(z1))/2,w=i<6?30:30-(i-5)*3.5;
            const m=new THREE.Mesh(new THREE.BoxGeometry(w,Math.max(h,.05)+.6,Math.abs(z1-z0)+.2),mat);m.position.set(4,this.deckY+h/2-.3+.3,(z0+z1)/2);g.add(m);}
          // gas deflector behind the take-off spot and a taller island mast
          {const d=new THREE.Mesh(new THREE.BoxGeometry(12,2.2,.4),SKIN(0x6a6f72,10));d.position.set(SPOT.x,this.deckY+1.1,SPOT.z+14);d.rotation.x=-.6;g.add(d);
           const m=new THREE.Mesh(new THREE.BoxGeometry(3,22,3),SKIN(0x7a8088,12));m.position.set(16.6,this.deckY+30,10);g.add(m);
           const r=new THREE.Mesh(new THREE.BoxGeometry(8,4,1),SKIN(0x2a2c2e,8));r.position.set(16.6,this.deckY+39,10);g.add(r);}}
        return g;};
      const _spot=C.spotCat;C.spotCat=function(P,i){_spot.call(this,P,i);if(this.kind!=='KZN')return;const k=this.cat;k.kzn=true;k.st='hold';k.run=0;k.s=0;k.v=0;
        {const w=this.world(SPOT.x,SPOT.z,{x:0,z:0});P.pos.set(w.x,this.deckY+GH,w.z);}if(P.sync)P.sync();};
      const _cs=C.catStep;C.catStep=function(P,dt){const k=this.cat;if(!k||!k.kzn)return _cs.call(this,P,dt);
        const fwd=()=>{P.gHdg=this.hdg*D2R;};
        if(k.st==='hold'){const w=this.world(SPOT.x,SPOT.z,{x:0,z:0});P.pos.set(w.x,this.deckY+GH,w.z);P.vel.copy(this.vel);P.onGnd=true;fwd();P.gPitch=0;P.q.setFromEuler(_ge.set(0,-P.gHdg,0,'YXZ'));
          if(P.thr>=.78&&P.n>.9){if(!k.run)radio('Deck: restrainers set · full burner, check engines.');k.run+=dt;if(k.run>2.0){k.st='run';flash('RESTRAINERS DOWN · ROLLING',900);sfx.click();}}else k.run=0;return;}
        // deck run on engine thrust (helped along to a realistic end speed), then the ramp throws the jet up at 14°
        const T=P.thr>.9?1:.8,acc=13.5*T;k.v+=acc*dt;k.s+=k.v*dt;const lz=SPOT.z-k.s,h=rampH(lz),a=rampA(lz);
        {const w=this.world(SPOT.x,Math.max(lz,BOW),{x:0,z:0});P.pos.set(w.x,this.deckY+GH+h,w.z);}
        P.vel.set(this.sin,0,-this.cos).multiplyScalar(k.v*Math.cos(a)).add(this.vel);P.vel.y=k.v*Math.sin(a);P.onGnd=true;fwd();P.gPitch=a;P.q.setFromEuler(_ge.set(a,-P.gHdg,0,'YXZ'));
        if(lz<=BOW){this.cat=null;P.pos.y+=.3;P.onGnd=false;const pit=Math.max(a,12*D2R);P.gPitch=pit;P.q.setFromEuler(_ge.set(pit,-P.gHdg,0,'YXZ'));
          flash('OFF THE RAMP · '+Math.round((k.v+this.spd)*KT)+' KT · HOLD 12° · GEAR UP',2000);}};
      const _tr=C.trapStep;C.trapStep=function(P,dt){_tr.call(this,P,dt);};
    }

    // ---------- campaign: team, the carrier as a base with its own deck pool, escorts, GCI ----------
    {const _ns=CAMP.newState;CAMP.newState=function(era,diff){const st=_ns.apply(this,arguments);st.team=game.team;st.cvp=CV_POOL;st.cvT=st.t;return st;};}
    // bases swap their names with the sides: a REDFOR war is fought from Volkov, Severny and Kamen
    {const SW={KES:'VOL',HAR:'SEV',HIG:'KAM',VOL:'KES',SEV:'HAR',KAM:'HIG'},N0={};for(const b of CBASE)N0[b.id]=b.name;
      for(const b of CBASE)Object.defineProperty(b,'name',{configurable:true,enumerable:true,get(){return CAMP.st&&CAMP.st.team==='RED'?N0[SW[b.id]]:N0[b.id];}});}
    CAMP.kindName=function(u){return u.k+(redSide(u.s)?'R':'B');};
    {const _lg=CAMP.log;CAMP.log=function(txt,c){if(this.st&&this.st.team==='RED'&&typeof txt==='string')txt=txt.replace(/\bRed\b/g,'Enemy').replace(/\bred\b/g,'enemy').replace(/\bblue\b/g,'our');return _lg.call(this,txt,c);};}
    {const _rd=radio;radio=function(txt,u){if(typeof txt==='string'&&CAMP.on&&CAMP.st&&CAMP.st.team==='RED')txt=txt.replace(/^DARKSTAR:/,'ZENIT (GCI):');return _rd.call(this,txt,u);};}
    // red flights work under ground control: their own radars see further with the GCI picture behind them
    {const _la=CAMP.launch;CAMP.launch=function(side,role){const o=_la.apply(this,arguments);if(o&&redSide(side))for(const j of o)if(j.ai){j.ai.det=Math.min(160000,(j.ai.det||30000)*1.5);j.ai.gciOn=true;}return o;};}
    // escorts stay with the package they protect, a few km behind and above it, until there is someone to fight
    {const _ap=CAMP.aiPre;CAMP.aiPre=function(ai,dt){_ap.apply(this,arguments);const c=ai.camp,j=ai.j;if(!c||!c.escL||!j.alive||ai.engaged||c.state==='rtb')return;
      ai._escT=(ai._escT||0)-dt;if(ai._escT>0)return;ai._escT=2;const L=c.escL.find(x=>x.alive&&x.ai&&x.ai.camp&&x.ai.camp.state!=='rtb');
      if(!L){c.escL=null;return;}const f=L.fwd(new V3()),sd=(j.cid%2)?1:-1;c.until=Math.max(c.until,this.st.t+.05);
      ai.route=[{x:L.pos.x-f.x*2500-f.z*1800*sd,z:L.pos.z-f.z*2500+f.x*1800*sd,alt:Math.max(L.pos.y+1400,2500)}];ai.wi=0;};}
    // start / end / respawn: the deck pool is the carrier's airfield
    {const _ss=CAMP.startSortie;CAMP.startSortie=async function(){
      if(this.st&&!this.client&&(this.st.team||'BLUE')!==game.team){flash('THIS CAMPAIGN IS FOUGHT BY '+((this.st.team||'BLUE')==='RED'?'REDFOR':'BLUFOR')+' · SWITCH TEAM OR START A NEW ONE',3500);return;}
      if(cvSel()&&cvPool()<1){flash('NO AIRCRAFT LEFT ABOARD '+cvShipName()+' · TAKE OFF FROM AN AIRFIELD',3000);return;}
      await _ss.apply(this,arguments);if(this.sortie&&cvSel())this.sortie.cv=1;};}
    {const _se=CAMP.sortieEnd;CAMP.sortieEnd=function(){const s=this.sortie,st=this.st,lost=player&&!player.alive;_se.apply(this,arguments);
      if(s&&s.cv&&lost&&st){const b=this.baseRec(s.base);if(b)b.pool+=1;st.cvp=Math.max(0,cvPool()-1);this.save();if(this.ui)this.ui.dirty=true;}};}
    {const _rs=CAMP.respawn;CAMP.respawn=function(){const dead=player&&!player.alive;
      if(cvSel()){if(cvPool()<1){game.cmpStart='AF';flash('NO JETS LEFT ABOARD · LAUNCHING FROM AN AIRFIELD',2500);}else if(dead&&!this.client)this.st.cvp=cvPool()-1;}
      _rs.apply(this,arguments);if(this.sortie&&cvSel())this.sortie.cv=1;};}
    // the ship's hangar is refilled slowly; ground control talks REDFOR pilots onto their targets
    {const _tk=CAMP.tick;CAMP.tick=function(dt){_tk.apply(this,arguments);const st=this.st;if(!st)return;
      if(!this.client){cvPool();if(st.cvp<CV_POOL&&st.t-(st.cvT||0)>1.5){st.cvp++;st.cvT=st.t;}else if(st.cvp>=CV_POOL)st.cvT=st.t;}
      campGCI(this,dt);};}
    {const _aw=CAMP.applyWorld;CAMP.applyWorld=function(D){_aw.apply(this,arguments);const st=this.st;if(!st||!D)return;
      if(typeof D.cvp==='number')st.cvp=D.cvp;
      if(D.tm==='RED'||D.tm==='BLUE'){st.team=D.tm;if(game.team!==D.tm){game.team=D.tm;teamFix();flash('THE HOST FIGHTS FOR '+(D.tm==='RED'?'REDFOR':'BLUFOR')+' · YOUR NEXT SORTIE USES '+(D.tm==='RED'?'RED':'BLUE')+' JETS',3500);}}};}
    // a client's own loss comes out of the right pool on the host too; nothing else to do here
    const GCIC={t:0,last:null,close:false};
    function campGCI(C,dt){const P=player;if(!C.on||!P||!P.alive||!C.st||!redSide(0)||SET.calls!=='ON')return;
      const now=performance.now()/1000;if(now<GCIC.t)return;
      // the ground radar net covers our side of the line; the A-50 pushes it across
      const aw=C.awOK(0),home=C.bases(0).some(b=>cd2(b.x,b.z,P.pos.x,P.pos.z)<190000);if(!aw&&!home){GCIC.t=now+20;return;}
      let best=null,bd=1e12;for(const e of jets){if(!e.alive||e.side===P.side||e.gciA||e.gone||e.cmpFr)continue;
        const agl=e.pos.y-groundAt(e.pos.x,e.pos.z);if(!aw&&agl<300)continue;const d=e.pos.distanceTo(P.pos);if(d<bd){bd=d;best=e;}}
      const cs=(CALLS[P.type]||'LEAD')+' 1';
      if(!best||bd>200000){GCIC.t=now+40;if(GCIC.last){radio('ZENIT (GCI): '+cs+', picture clean.');GCIC.last=null;}return;}
      const km=bd/1000,brg=Math.round(brgTo(P.pos.x,P.pos.z,best.pos.x,best.pos.z)),alt=Math.round(best.pos.y/100)*100;
      const tb=Math.atan2(P.pos.x-best.pos.x,-(P.pos.z-best.pos.z)),hot=Math.cos(tb-best.hdg*D2R)>.5?'closing':Math.cos(tb-best.hdg*D2R)<-.5?'going away':'flanking';
      if(km<12){if(!GCIC.close){radio('ZENIT (GCI): '+cs+', target ahead '+km.toFixed(0)+' km. You have control, search with your sight.');GCIC.close=true;}GCIC.t=now+25;return;}
      GCIC.close=false;const nw=GCIC.last!==best;GCIC.last=best;
      radio('ZENIT (GCI): '+cs+(nw?', new target. ':', ')+'Heading '+String(brg).padStart(3,'0')+', range '+Math.round(km)+' km, height '+alt+' m, '+hot+'.',nw&&km<60);
      GCIC.t=now+(km<40?10:km<90?18:30);}
    }
  },
  /* game.js line 12250 */
  L12250(){
    // the SM's board replaces the Su-27S main board whenever the Su-27SM is flown
    {const _sc=selectCockpit;selectCockpit=function(kind,pit){const r=_sc.apply(this,arguments);try{const o=ck.fulcrum,sm=o.smOnly&&o.smOnly[0];if(sm){const on=kind==='fulcrum'&&!!player&&SMX(player.type);sm.visible=on;if(on&&o.suOnly&&o.suOnly[0])o.suOnly[0].visible=false;}}catch(e){}return r;};}
    ACROLE['Su-27SM']='RUSSIA · AIR SUPERIORITY · R-77 · 2-TARGET TWS · GLASS COCKPIT';
  },
  /* game.js line 12357 */
  L12357(){
    // ===== v185: Su-27SM air-to-ground and expanded air-to-air armament (12 hardpoints, MBD multiple racks, Kh-29TD, Kh-31PD / AD, KAB-500Kr / 1500Kr) =====
    try{
    const SMST=Object.assign({},SU27ST,{11:[-2.85,-.55,1.5],12:[2.85,-.55,1.5]});
    let makeSu27SM=makeSu27;
    try{const src=makeSu27.toString().replace('function makeSu27','function makeSu27SM').replace('pylons(grp,SU27ST,','pylons(grp,SMST,');makeSu27SM=eval('('+src+')');}catch(e){console.warn('Su-27SM model fallback',e);}
    Object.assign(AC['Su-27SM'],{st:SMST,model:makeSu27SM,rel:[1,10,2,9,3,8,11,12,4,7,5,6],migRel:['3','8','11','12','4','7','5','6','2','9','1','10']});
    // ---- stores ----
    const B=(mass,L,R,kd,soft,hard,col,band,x)=>Object.assign({k:'bomb',mass,L,R,kd,soft,hard,col,band},x||{});
    Object.assign(AGW,{
      'OFAB-100':  B(114,1.07,.135,4.0e-5,32,6,0x6f7564,0x3a3e42),
      'OFAB-250':  B(268,1.5,.162,3.6e-5,52,10,0x6f7564,0x3a3e42),
      'OFAB-250Sh':B(275,1.65,.162,1.6e-4,52,10,0x6f7564,0x2f6fb0),
      'FAB-500':   B(508,2.47,.2,3.4e-5,72,15,0x6f7564,0xb03a2a),
      'FAB-500Sh': B(515,2.47,.2,1.6e-4,72,15,0x6f7564,0x2f6fb0),
      'ZB-500':    B(374,2.5,.25,3.6e-5,40,3,0x8a8d80,0xd04a2a,{cluster:1,pat:70,n:10,bs:18,bh:3}),
      'B-13L':     {k:'pod',rk:'S-13',cap:5,mass:505,L:3.56,R:.21,col:0x6d7a72},
      'S-25O':     {k:'pod',rk:'S-25O',cap:1,mass:370,L:3.8,R:.2,col:0x7a8076},
      'S-25OF':    {k:'pod',rk:'S-25OF',cap:1,mass:367,L:3.8,R:.2,col:0x7a8076},
      'S-25OFM':   {k:'pod',rk:'S-25OFM',cap:1,mass:367,L:3.8,R:.2,col:0x7a8076},
      '2xB-8M1':   {k:'pod',rk:'S-8',cap:40,mass:752,L:2.75,R:.26,col:0x6d7a72,twin:'B-8M1'},
      '2xB-13L':   {k:'pod',rk:'S-13',cap:10,mass:1010,L:3.56,R:.21,col:0x6d7a72,twin:'B-13L'},
      '2xS-25O':   {k:'pod',rk:'S-25O',cap:2,mass:740,L:3.8,R:.2,col:0x7a8076,twin:'S-25O'},
      '2xS-25OF':  {k:'pod',rk:'S-25OF',cap:2,mass:734,L:3.8,R:.2,col:0x7a8076,twin:'S-25OF'},
      '2xS-25OFM': {k:'pod',rk:'S-25OFM',cap:2,mass:734,L:3.8,R:.2,col:0x7a8076,twin:'S-25OFM'},
      'Kh-29TD':  {k:'agm',mass:686,L:3.9,R:.19,col:0xd6d4c8,soft:34,hard:11,dmg:420,dv:300,burn:6,kd:2.6e-5,maxG:10,range:30000,fov:[6,3],seek:'TV',lockR:20000,nav:3.0,cone:40},
      'Kh-31AD':  {k:'agm',mass:715,L:5.23,R:.18,col:0xdcdad0,soft:30,hard:12,dmg:380,dv:950,burn:14,kd:1.8e-5,maxG:15,range:50000,fov:[8,3],seek:'TV',lockR:40000,nav:3.4,cone:50},
      'KAB-500Kr':{k:'agm',mass:520,L:3.05,R:.2,col:0x6f7564,soft:62,hard:14,dmg:460,dv:0,burn:1,kd:3.0e-5,maxG:5,range:12000,fov:[6,3],seek:'TV',lockR:10000,nav:3.0,cone:40},
      'KAB-1500Kr':{k:'agm',mass:1525,L:4.6,R:.29,col:0x6f7564,soft:100,hard:30,dmg:900,dv:0,burn:1,kd:3.0e-5,maxG:4,range:14000,fov:[6,3],seek:'TV',lockR:10000,nav:3.0,cone:40}});
    AGW['Kh-31PD']=Object.assign({},AGW['AGM-88C'],{mass:715,L:5.23,R:.18,col:0xdcdad0,dv:1000,burn:14,kd:1.8e-5,maxG:20,soft:32,hard:15,dmg:330,posAct:40000,posWin:4000,life:240});
    // MBD3-U6-68 multiple racks: one store id, several bombs released one by one
    const RK=(child,n,mass)=>Object.assign({},AGW[child],{rack:n,child,mass});
    Object.assign(AGW,{'6xOFAB-100':RK('OFAB-100',6,684),'6xOFAB-250':RK('OFAB-250',6,1608),'5xOFAB-250':RK('OFAB-250',5,1340),'4xOFAB-250':RK('OFAB-250',4,1072),
      '2xOFAB-250':RK('OFAB-250',2,536),'2xFAB-250':RK('FAB-250',2,454),'2xOFAB-250Sh':RK('OFAB-250Sh',2,550),'2xFAB-500':RK('FAB-500',2,1017),
      '2xFAB-500Sh':RK('FAB-500Sh',2,1030),'2xZB-500':RK('ZB-500',2,748)});
    Object.assign(RKT,{'S-13':{m:68,burn:1.1,dv:530,kd:4.0e-5,disp:.004,soft:22,hard:6,range:6000},
      'S-25O':{m:381,burn:1.2,dv:600,kd:3.0e-5,disp:.003,soft:45,hard:6,range:4000},
      'S-25OF':{m:381,burn:1.2,dv:600,kd:3.0e-5,disp:.003,soft:40,hard:14,range:4000},
      'S-25OFM':{m:381,burn:1.2,dv:620,kd:2.8e-5,disp:.003,soft:26,hard:30,range:4000}});
    const SNX={'OFAB-100':'OFAB100','OFAB-250':'OFAB250','OFAB-250Sh':'OFB250SH','FAB-500':'FAB500','FAB-500Sh':'FAB500SH','ZB-500':'ZB500','B-13L':'S-13','S-25O':'S-25O','S-25OF':'S-25OF','S-25OFM':'S-25OFM',
      '2xB-8M1':'S-8','2xB-13L':'S-13','2xS-25O':'S-25O','2xS-25OF':'S-25OF','2xS-25OFM':'S-25OFM','Kh-29TD':'X29TD','Kh-31AD':'X31AD','Kh-31PD':'X31PD','KAB-500Kr':'KAB500','KAB-1500Kr':'KAB1500',
      '6xOFAB-100':'6OFB100','6xOFAB-250':'6OFB250','5xOFAB-250':'5OFB250','4xOFAB-250':'4OFB250','2xOFAB-250':'2OFB250','2xFAB-250':'2FAB250','2xOFAB-250Sh':'2OFB250S','2xFAB-500':'2FAB500','2xFAB-500Sh':'2FAB500S','2xZB-500':'2ZB500'};
    Object.assign(SN,SNX);
    Object.assign(STORE_NAME,{'OFAB-100':'OFAB-100 · 100 kg HE-frag bomb','OFAB-250':'OFAB-250-270 · 250 kg HE-frag bomb','OFAB-250Sh':'OFAB-250Sh · parachute retarded',
      'FAB-500':'FAB-500M-62 · 500 kg bomb','FAB-500Sh':'FAB-500Sh · parachute retarded, 500 kg','ZB-500':'ZB-500 · incendiary tank',
      'B-13L':'B-13L · 5 S-13OF, 122 mm','S-25O':'S-25O · 340 mm rocket, frag','S-25OF':'S-25OF · 340 mm rocket, HE-frag','S-25OFM':'S-25OFM · 340 mm rocket, penetrator',
      '2xB-8M1':'2 × B-8M1 · 40 S-8KO','2xB-13L':'2 × B-13L · 10 S-13OF','2xS-25O':'2 × S-25O','2xS-25OF':'2 × S-25OF','2xS-25OFM':'2 × S-25OFM',
      'Kh-29TD':'Kh-29TD · TV-guided, 320 kg warhead','Kh-31AD':'Kh-31AD · ramjet anti-ship (locks ground targets here)','Kh-31PD':'Kh-31PD · ramjet anti-radiation',
      'KAB-500Kr':'KAB-500Kr · TV-correlation guided bomb','KAB-1500Kr':'KAB-1500Kr · TV-correlation guided bomb, 1,500 kg',
      '6xOFAB-100':'MBD · 6 × OFAB-100','6xOFAB-250':'MBD · 6 × OFAB-250','5xOFAB-250':'MBD · 5 × OFAB-250','4xOFAB-250':'MBD · 4 × OFAB-250 (centreline)',
      '2xOFAB-250':'MBD · 2 × OFAB-250','2xFAB-250':'MBD · 2 × FAB-250','2xOFAB-250Sh':'MBD · 2 × OFAB-250Sh','2xFAB-500':'MBD · 2 × FAB-500','2xFAB-500Sh':'MBD · 2 × FAB-500Sh','2xZB-500':'MBD · 2 × ZB-500'});
    const CY={'OFAB-100':'ОФАБ-100','OFAB-250':'ОФАБ-250','OFAB-250Sh':'ОФАБ-250Ш','FAB-500':'ФАБ-500','FAB-500Sh':'ФАБ-500Ш','ZB-500':'ЗБ-500','B-13L':'Б-13Л','S-25O':'С-25О','S-25OF':'С-25ОФ','S-25OFM':'С-25ОФМ',
      'Kh-29TD':'Х-29ТД','Kh-31AD':'Х-31АД','Kh-31PD':'Х-31ПД','KAB-500Kr':'КАБ-500Кр','KAB-1500Kr':'КАБ-1500Кр'};
    for(const [k,v] of Object.entries(SNX))SM_ST[k]=CY[k]||(k.startsWith('2x')||/^\dx/.test(k)?(k[0]+'×'+(CY[k.slice(2)]||SM_ST[k.slice(2)]||k.slice(2))):v);
    try{MODERN_ONLY.add('Kh-31AD');MODERN_ONLY.add('Kh-31PD');}catch(e){}
    // ---- meshes: racks show their bombs, twin pods show two pods ----
    {const _b=buildAG;buildAG=function(kind){const a=AGW[kind];
      if(a&&a.rack){const g=new THREE.Group(),c=AGW[a.child],n=a.rack,beam=new THREE.Mesh(new THREE.BoxGeometry(.12,.1,Math.max(c.L*1.1,(Math.ceil(n/2))*c.L*.9)),SKIN(0x5a6058,30));g.add(beam);
        for(let i=0;i<n;i++){const m=_b(a.child);let x,y,z;if(n<=2){x=(i?1:-1)*c.R*1.15;y=-c.R*.9;z=0;}else if(n===4||n===5){x=n===5&&i===4?0:((i%2)?1:-1)*c.R*1.1;y=n===5&&i===4?-c.R*2.6:-c.R*.9;z=n===5&&i===4?0:(Math.floor(i/2)-.5)*c.L*1.02;}
          else{x=((i%2)?1:-1)*c.R*1.15;y=-c.R*.9;z=(Math.floor(i/2)-1)*c.L*1.02;}m.position.set(x,y,z);m.name='rb'+i;g.add(m);}return g;}
      if(a&&a.twin){const g=new THREE.Group();for(const s of[-1,1]){const m=buildAG(a.twin);m.position.set(s*AGW[a.twin].R*1.1,-AGW[a.twin].R*.6,0);g.add(m);}return g;}
      return _b(kind);};}
    // ---- release: racks drop one bomb per side per press, in the jet's release order ----
    {const _p=agPickle;agPickle=function(w){const a=AGW[w],P=player;if(!a||!a.rack)return _p(w);if(game.pickleCd>0)return;if(!game.arm){flash('MASTER ARM SIM',1200);return;}
      P.rk=P.rk||{};const order=P.ac.rel.map(String).concat(Object.keys(P.load)),seen=new Set(),sts=[];for(const k of order)if(!seen.has(k)&&P.load[k]===w){seen.add(k);sts.push(k);}
      let fired=0;for(const k of sts){if(fired>=2)break;if(P.rk[k]==null)P.rk[k]=a.rack;if(P.rk[k]<=0)continue;const m=P.stMesh[k];const i=a.rack-P.rk[k];P.rk[k]--;
        let pos=m?P.pos.clone().add(m.position.clone().applyQuaternion(P.q)):P.pos.clone();if(m){const c=m.getObjectByName('rb'+i);if(c){c.visible=false;const wp=new V3();c.getWorldPosition(wp);pos=wp;}}
        GND.drop(a.child,P,pos);fired++;if(P.rk[k]<=0){delete P.load[k];if(m){P.mesh.remove(m);delete P.stMesh[k];}delete P.rk[k];}}
      if(!fired){flash('NO '+SN[w]+' LEFT',1000);return;}game.pickleCd=.3;sfx.click();};}
    {const _l=agLeft;agLeft=function(P,w){const a=AGW[w];if(a&&a.rack){P.rk=P.rk||{};let n=0;for(const k of Object.keys(P.load))if(P.load[k]===w)n+=P.rk[k]==null?a.rack:P.rk[k];return n;}return _l(P,w);};}
    // ---- stations, after the Su-27SM weapons table (table columns 1..5 / 6 centre / 7..11 → game 1,2,3,11,4 / 5-6 / 7,12,8,9,10) ----
    const S=STN['Su-27SM'],put=(sts,ws)=>{for(const k of sts){S[k]=S[k]||[];for(const w of ws)if(!S[k].includes(w))S[k].push(w);}};
    const AAR=['R-27R','R-27ER'],FB=['FAB-250','OFAB-250Sh','FAB-500','FAB-500Sh','ZB-500'];
    put(['1','10'],['R-73']);
    put(['2','9'],['R-73','OFAB-100','OFAB-250']);
    put(['3','8'],['R-73','OFAB-250','R-27R','R-27ER','R-27T','R-27ET','R-77','B-8M1','B-13L','S-25O','S-25OF','S-25OFM','Kh-29TD','Kh-31PD','Kh-31AD','6xOFAB-100','6xOFAB-250',...FB,'KAB-500Kr',
      '2xOFAB-250','2xFAB-250','2xOFAB-250Sh','2xFAB-500','2xFAB-500Sh','2xZB-500','2xB-8M1','2xB-13L','2xS-25O','2xS-25OF','2xS-25OFM']);
    put(['11','12'],['OFAB-250',...AAR,'R-77','Kh-29TD','Kh-31PD','Kh-31AD','6xOFAB-100','5xOFAB-250','2xOFAB-250',...FB,'KAB-500Kr']);
    put(['4','7'],['OFAB-250',...AAR,'R-77','6xOFAB-100',...FB]);
    put(['5','6'],[...AAR,'R-77']);put(['5'],['4xOFAB-250','KAB-1500Kr']);
    // the centreline MBD and the KAB-1500 take both tandem stations
    {const _v=validLoad;validLoad=function(ac,era,o){const r=_v(ac,era,o);if(SMX(ac)&&(r[5]==='4xOFAB-250'||r[5]==='KAB-1500Kr'))delete r[6];return r;};}
    STRIKE_LOAD['Su-27SM']={1:'R-73',10:'R-73',2:'R-73',9:'R-73',3:'B-8M1',8:'B-8M1',11:'FAB-500',12:'FAB-500',4:'FAB-250',7:'FAB-250',5:'R-77',6:'R-77'};
    try{RUS.add('Su-27SM');}catch(e){}
    ACROLE['Su-27SM']='RUSSIA · MULTIROLE · R-77 · Kh-29 / Kh-31 / KAB · 2-TARGET TWS · GLASS COCKPIT';
    }catch(e){console.warn('v185 Su-27SM weapons',e);}
  },
  /* game.js line 12773 */
  L12773(){
    // ===== v194: Su-27SM gets the L-150 "Pastel" (SPO-150) warner: wider band, finer bearing, identifies emitters and missile launches;
    // display after the Su-30SM / Su-35 picture: ranged circular scope, own-jet symbol in the middle, threats as type letters at their bearing,
    // the stronger the closer in, tracking radar boxed, launch flashing red with ПУСК, missile seekers as red diamonds =====
    try{
    RWRF['L-150']={fam:'W',k:3.2,sd:3,pd:1,lpi:.65,id:.95,mem:5,arh:9000,sarh:1,sam:1,lim:[8,16],ring:'state',dia:1,tone:'N'};
    RWR_OF['Su-27SM']='L-150';
    const L150T=['И','Д','С','П','Ф','Б'],L150E=['AI','LR','MR','PT','F','SR'];
    const _dr=drawRWR;
    drawRWR=function(dt){const P=player;if(!P||!SMX(P.type))return _dr(dt);
      const c=rwc,S=240,cx=S/2,cy=S/2+4,NOW=performance.now()/1000,en=SET.hudlang==='EN',bl=performance.now()%400<220;
      c.fillStyle='#030806';c.fillRect(0,0,S,S);if(!sys.rwr.pwr)return;
      rwrUpdate(dt);const th=RW.list,G='#4dff70',GD='rgba(77,255,112,.35)',RD='#ff3b2a',YL='#ffd23a',test=NOW<(sys.rwr.testT||0);
      c.globalAlpha=.35+.65*(sys.rwr.brt==null?1:sys.rwr.brt);c.textAlign='center';c.textBaseline='middle';
      const R=98;
      // rings and 30° ticks, nose up
      c.strokeStyle=GD;c.lineWidth=1;for(const q of[1/3,2/3]){c.beginPath();c.arc(cx,cy,R*q,0,7);c.stroke();}
      c.strokeStyle=G;c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,R,0,7);c.stroke();
      for(let d=0;d<360;d+=30){const a=d*D2R,l=d%90?6:11;c.beginPath();c.moveTo(cx+Math.sin(a)*R,cy-Math.cos(a)*R);c.lineTo(cx+Math.sin(a)*(R-l),cy-Math.cos(a)*(R-l));c.stroke();}
      c.fillStyle=G;c.font='700 11px "B612 Mono",monospace';c.fillText('0',cx,cy-R-9);c.fillText('9',cx+R+8,cy);c.fillText('18',cx,cy+R+9);c.fillText('27',cx-R-9,cy);
      // own jet
      c.strokeStyle=G;c.lineWidth=2;c.beginPath();c.moveTo(cx,cy-12);c.lineTo(cx,cy+11);c.moveTo(cx-11,cy+1);c.lineTo(cx+11,cy+1);c.moveTo(cx-5,cy+10);c.lineTo(cx+5,cy+10);c.stroke();
      // threats
      const list=test?L150T.map((_,i)=>({a:(i*60+15)*D2R,pwr:.5,spoI:i,mode:i===1?'T':i===2?'L':'S',gnd:i?1:0})):th.slice(0,10);
      let anyL=false,anyT=false;
      for(const t of list){const r=R*(.88-.66*clamp(t.pwr,0,1)),x=cx+Math.sin(t.a)*r,y=cy-Math.cos(t.a)*r;
        const lab=t.spoI>=0&&t.spoI<6?(en?L150E[t.spoI]:L150T[t.spoI]):(en?'U':'Н');
        const L=t.mode==='L',T=t.mode==='T';if(L)anyL=true;else if(T)anyT=true;
        if(L&&!bl)continue;
        const col=L?RD:T?YL:G;c.fillStyle=col;c.strokeStyle=col;c.font='700 '+(lab.length>1?12:15)+'px "B612 Mono",monospace';c.fillText(lab,x,y+1);
        if(!t.gnd){c.lineWidth=1.6;c.beginPath();c.moveTo(x-9,y-11);c.lineTo(x,y-16);c.lineTo(x+9,y-11);c.stroke();}   // airborne: chevron over the letter
        if(T||L){c.lineWidth=1.8;c.strokeRect(x-12,y-11,24,22);}
        if(t===th[0]&&!test){c.lineWidth=1;c.beginPath();c.arc(x,y,17,0,7);c.stroke();}}
      // missile seekers heard (active radar homing): red diamonds on the outer ring
      for(const m of test?[]:RW.msl){anyL=true;if(!bl)continue;const x=cx+Math.sin(m.a)*(R-4),y=cy-Math.cos(m.a)*(R-4);c.fillStyle=RD;c.beginPath();c.moveTo(x,y-8);c.lineTo(x+7,y);c.lineTo(x,y+8);c.lineTo(x-7,y);c.closePath();c.fill();}
      // status line
      c.font='700 12px "B612 Mono",monospace';
      if(anyL||test){c.fillStyle=RD;if(bl||test)c.fillText(en?'LAUNCH':'ПУСК',cx,16);}else if(anyT){c.fillStyle=YL;c.fillText(en?'TRACK':'ЗАХВАТ',cx,16);}
      c.fillStyle=GD;c.textAlign='left';c.fillText('Л-150',6,S-10);c.textAlign='right';c.fillText(String(th.length),S-8,S-10);c.globalAlpha=1;};
    }catch(e){console.warn('v194 Su-27SM L-150',e);}
  },
  /* game.js line 13551 */
  L13551(){
    /* ===== v205: Su-27SM twin R-77 racks on the centreline tunnel between the intakes: the front tunnel station (5, where the KAB-1500 / MBD
       hang) and the one behind it (6) each carry a pair of R-77s side by side; 5B / 6B are the second rail of each pair and take an R-77 only
       when its partner carries one. A KAB-1500 or MBD on 5 clears the whole tunnel. ===== */
    try{const A=AC['Su-27SM'],st=A.st;st[5]=[-.3,-1.0,-.3];st['5B']=[.3,-1.0,-.3];st[6]=[-.3,-1.0,2.1];st['6B']=[.3,-1.0,2.1];
      STN['Su-27SM']['5B']=['R-77'];STN['Su-27SM']['6B']=['R-77'];
      A.rel=A.rel.concat(['5B','6B']);if(A.migRel)A.migRel.push('5B','6B');
      {const _v=validLoad;validLoad=function(ac,era,o){const r=_v(ac,era,o);if(SMX(ac)){if(r['5B']&&r[5]!=='R-77')delete r['5B'];if(r['6B']&&r[6]!=='R-77')delete r['6B'];}return r;};}
      if(LOAD.modern)LOAD.modern['Su-27SM']=Object.assign({},LOAD.modern['Su-27SM'],{4:'R-27ET',7:'R-27ET',5:'R-77','5B':'R-77',6:'R-77','6B':'R-77'});
    }catch(e){console.warn('v205 Su-27SM twin R-77',e);}
    try{
    const T30='Su-30SM';
    // ---------------- missiles ----------------
    const mkPh=(k,mo)=>{const d=MSL[k],sh=SHAPE[k]||{};for(const f of['trk','ccm','loft'])if(d[f]==null&&sh[f]!=null)d[f]=sh[f];if(d.trk==null)d.trk=d.seek==='IR'?.6:.8;
      const dia=MDIA[k]||(sh.R?sh.R*2:.13),S=Math.PI*dia*dia/4;
      if(mo){const mbo=d.mass-mo.mp,I=mo.mp*mo.isp*G,mb=mo.f*mo.mp;
        d.ph={S,dia,m0:d.mass,mp:mo.mp,mbo,tb:mo.tb,ts:mo.ts,gap:mo.gap||0,Tb:mo.f*I/mo.tb,Ts:mo.ts?(1-mo.f)*I/mo.ts:0,mdB:mb/mo.tb,mdS:mo.ts?(mo.mp-mb)/mo.ts:0,cd0:2.38*d.cd*mbo/S,cnMax:.004*mbo/S*(d.cnK||1)};
        d.burnT=mo.tb+(mo.gap||0)+mo.ts;d.burn=d.burnT;}
      else{const dv=d.acc*d.burn,mbo=d.mass*Math.exp(-dv/2350),mp=d.mass-mbo,I=mp*2350;
        d.ph={S,dia,m0:d.mass,mp,mbo,tb:d.burn,ts:0,Tb:I/d.burn,Ts:0,mdB:mp/d.burn,mdS:0,cd0:2.38*d.cd*mbo/S,cnMax:.004*mbo/S*(d.cnK||1)};d.burnT=d.burn;}
      d.ph.cna=d.ph.cnMax/.38;d.apn=1;
      if(d.rcs==null)d.rcs=+Math.max(.02,Math.min(.25,.015+d.mass/3500)).toFixed(3);if(d.irsB==null)d.irsB=+Math.max(.4,Math.min(2.4,.4+d.mass/400)).toFixed(2);if(d.irsC==null)d.irsC=.03;
      if(!MSL_KEYS.includes(k))MSL_KEYS.push(k);};
    const R73=MSL['R-73'],R77=MSL['R-77'];
    // R-74M (izd. 760, export R-73M2 family): better IRCCM, ±75° head, longer motor; R-74M2: cropped fins for internal bays, longer reach (CWS chart 27 / 30 / 37 km)
    MSL['R-74M']=Object.assign({},R73,{ph:null,mass:110,burn:5.2,acc:162,cd:7.0e-5,gimbal:75*D2R,irR:14800,front:.66,trk:1.35,ccm:.6,life:42,res:.72,aiR:12500,aiOff:60*D2R,maxG:45});
    MSL['R-74M2']=Object.assign({},R73,{ph:null,mass:106,burn:5.6,acc:168,cd:6.4e-5,gimbal:75*D2R,irR:17200,front:.72,trk:1.45,ccm:.72,life:48,res:.76,aiR:14500,aiOff:60*D2R,maxG:45});
    // R-77-1 (RVV-SD, izd. 170-1): boat-tail, longer motor, ~80 km on the CWS chart (R-77 = RVV-AE ~60 km)
    MSL['R-77-1']=Object.assign({},R77,{ph:null,mass:190,burn:8.0,acc:102,cd:3.7e-5,loft:.5,ccm:.6,ecc:.7,life:90,aiR:36000,res:.74});
    // R-77M (izd. 180): dual-pulse motor (second pulse lit on the terminal run), new AESA-type seeker, ~115 km
    MSL['R-77M']=Object.assign({},R77,{ph:null,mass:210,cd:3.4e-5,loft:.62,loftCap:26000,ccm:.78,ecc:.82,trk:.92,life:130,pit:20000,aiR:52000,res:.8,maxG:40,search:16*D2R});
    // R-37M (izd. 610M, AA-13 Axehead): 510 kg, dual-mode solid motor, very high loft, active seeker ~40 km, HOJ; 150 km on the chart
    MSL['R-37M']=Object.assign({},R77,{ph:null,mass:510,cd:5.4e-5,maxG:20,gimbal:60*D2R,loft:.72,loftCap:36000,ccm:.7,ecc:.8,trk:.82,life:260,pit:30000,search:14*D2R,rmin:5000,res:.6,fuse:18,aiR:90000,aiOff:15*D2R,smoke:.35,stop:300});
    Object.assign(SHAPE,{'R-74M':Object.assign({},SHAPE['R-73']),'R-74M2':{L:2.9,R:.085,f:[[.25,.38,.24],[2.6,.28,.14]]},'R-77-1':Object.assign({},SHAPE['R-77'],{L:3.71}),
      'R-77M':Object.assign({},SHAPE['R-77'],{L:3.71}),'R-37M':{L:4.2,R:.19,f:[[.15,.72,.42],[2.1,.36,1.5]]}});
    for(const k of['trk','ccm','loft']){delete SHAPE['R-74M'][k];}
    Object.assign(MDIA,{'R-74M':.17,'R-74M2':.17,'R-77-1':.2,'R-77M':.2,'R-37M':.38});
    mkPh('R-74M');mkPh('R-74M2');mkPh('R-77-1');
    mkPh('R-77M',{mp:58,isp:255,tb:5.5,ts:6.5,gap:9,f:.58});
    mkPh('R-37M',{mp:160,isp:250,tb:6,ts:16,f:.56});
    Object.assign(SN,{'R-74M':'R74M','R-74M2':'R74M2','R-77-1':'R77-1','R-77M':'R77M','R-37M':'R37M'});
    Object.assign(WNAME,{'R-74M':'AA-11 Archer · R-74M · IRCCM, ±75°','R-74M2':'R-74M2 · compact, ±75°','R-77-1':'AA-12 Adder · RVV-SD','R-77M':'R-77M · dual-pulse, AESA seeker','R-37M':'AA-13 Axehead · very long range'});
    try{Object.assign(RU_WPN,{'R-74M':'74М','R-74M2':'74М2','R-77-1':'77-1','R-77M':'77М','R-37M':'37М'});}catch(e){}
    Object.assign(SM_ST,{'R-74M':'Р-74М','R-74M2':'Р-74М2','R-77-1':'Р-77-1','R-77M':'Р-77М','R-37M':'Р-37М'});
    ['R-74M','R-74M2','R-77-1','R-77M','R-37M'].forEach(k=>{MODERN_ONLY.add(k);if(!/RCS/.test(WNAME[k]))WNAME[k]+=' · RCS '+MSL[k].rcs+' m² · IR '+MSL[k].irsB;});
    // dual-pulse: coast between the pulses
    {const _mm=mslMotor;mslMotor=function(d,tb,r){const p=d.ph;if(!p||!p.gap||tb<=p.tb)return _mm(d,tb,r);if(tb<p.tb+p.gap)return[0,p.m0-p.mdB*p.tb];return _mm(d,tb-p.gap,r);};}

    // ---------------- airframe ----------------
    const B=AC['Su-27SM'];
    const S30ST=Object.assign({},B.st);
    let makeSu30SM=B.model;
    try{let src=B.model.toString().replace(/^function\s*\w*/,'function makeSu30SM').replace('pylons(grp,SMST,','pylons(grp,S30ST,').replace('SKIN(0x9fb2c2)','SKIN(0x7f8f8a)');
      // long tandem canopy over pilot and WSO, canards on the LERX, refuelling probe left of the windscreen, bigger spine
      src=src.replace(/canopy\(grp,0x557080,[^;]*;/,"canopy(grp,0x557080,.5,.6,3.15,.9,-5.15,dk);{const cn=planform([[1.0,-5.95],[3.15,-4.7],[3.15,-4.0],[1.0,-3.75]],.07,true,mat);cn.position.y=.32;grp.add(cn);}rod(grp,[-.42,.55,-6.3],[-.42,.62,-8.6],.045,met,1,[0,1,0],6);ball(grp,.06,met,-.42,.62,-8.62);");
      makeSu30SM=eval('('+src+')');}catch(e){console.warn('Su-30SM model fallback',e);}
    AC[T30]=Object.assign({},B,{name:'Su-30SM',model:makeSu30SM,st:S30ST,empty:18800,fuel:9400,dW:26000,mil:149000,ab:245200,S:62,CLa:4.6,cd0:.0198,k:.118,
      gLim:9,aoaLim:26,fbw:true,ovrOK:false,rcs:13,irs:1.42,dep:{a:40,rock:.45,spin:1.8},tkG:[9,9],tvc:{pitch:15,yaw:10},s30:true,
      ols:{tail:38000,head:18000,lrf:12000},irst:true,rio:true,wso:true,twsN:4,trkN:15,
      radar:Object.assign({},B.radar,{name:'N011M',R0:66*NM,ranges:[10,25,50,100,200],unit:1000,ul:'KM',ecc:.78,pesa:1,beam:2.8*D2R}),
      rel:B.rel.slice(),migRel:B.migRel?B.migRel.slice():undefined});
    RGIM['N011M']=[90,56,40,1];
    // copy the per-type tables
    {const cp=v=>Array.isArray(v)?v.slice():v&&typeof v==='object'?Object.assign({},v):v;
      const tabs=[FOE,NCTR_ID,ACROLE,CALLS,RWR_OF,ECM_FIT,FV,STRIKE_LOAD];try{tabs.push(FLAPSW);}catch(e){}
      for(const T of tabs)if(T&&T['Su-27SM']!==undefined)T[T30]=T===ECM_FIT||T===FV?T['Su-27SM']:cp(T['Su-27SM']);
      for(const era of Object.keys(LOAD))if(LOAD[era]['Su-27SM'])LOAD[era][T30]=cp(LOAD[era]['Su-27SM']);
      for(const era of Object.keys(CMS))if(CMS[era]['Su-27SM'])CMS[era][T30]=[96,96];
      STN[T30]={};for(const k of Object.keys(STN['Su-27SM']))STN[T30][k]=STN['Su-27SM'][k].slice();
      for(const S of[DL_FIT,RUS])if(S.has('Su-27SM'))S.add(T30);try{if(GUIDJ.has('Su-27SM'))GUIDJ.add(T30);}catch(e){}
      try{eval('PROBE_AC').add(T30);}catch(e){}
      if(!ACS.includes(T30))ACS.splice(ACS.indexOf('Su-27SM')+1,0,T30);if(!ACK.includes(T30))ACK.push(T30);
      ENG_SUP['Su-30SM']=.05;ENGN[T30]='2× AL-31FP (TVC)';IRSTN[T30]='OLS-30';try{if(window.APP_KT)APP_KT[T30]=140;}catch(e){}}
    CALLS[T30]='FLANKER-H';NCTR_ID[T30]='SU-30';FOE[T30]='F-15E';RWR_OF[T30]='L-150';
    ACROLE[T30]='RUSSIA · TWO-SEAT MULTIROLE · N011M BARS PESA · TVC · R-77M / R-37M · WSO';
    // ---------------- stores, after the Su-30SM weapons fit (12 hardpoints + twin tunnel rails) ----------------
    {const S=STN[T30],put=(sts,ws)=>{for(const k of sts){S[k]=S[k]||[];for(const w of ws)if(!S[k].includes(w))S[k].push(w);}};
      put(['1','10'],['R-74M','R-74M2']);
      put(['2','9'],['R-74M','R-74M2','R-77-1','R-77M']);
      put(['3','8'],['R-74M','R-74M2','R-77-1','R-77M']);
      put(['11','12'],['R-77-1','R-77M']);
      put(['4','7'],['R-77-1','R-77M','R-37M','Kh-31PD','Kh-31AD','KAB-1500Kr']);
      put(['5','6','5B','6B'],['R-77-1','R-77M']);
      put(['5','6'],['R-37M']);
      // the T220 FLIR / laser targeting pod on station 8 (CWS: Su-30SM = T220)
      try{const PD=window.V121&&V121.PODS;if(PD&&!PD.T220){PD.T220={nm:'T220',fovs:[4,1.2,.5],fn:['WIDE','NARO','ZOOM'],tv:1,res:224,lrf:20000,lockR:20000};
          AGW.T220={k:'tgp',mass:250,L:2.6,R:.2,col:0x7c8580,rcs:.15,irsB:.05,irsC:.05};SN.T220='T220';STORE_NAME.T220='T220/E · FLIR / laser designator pod';SM_ST.T220='Т220';
          const _pk=SNS.podKind;SNS.podKind=function(P){const r=_pk.call(this,P);if(r)return r;return P&&P.load&&Object.values(P.load).includes('T220')?'T220':null;};}
        put(['8'],['T220']);}catch(e){console.warn('T220',e);}
      {const _v=validLoad;validLoad=function(ac,era,o){const r=_v(ac,era,o);if(ac===T30){if((r[5]==='R-37M'||r[5]==='KAB-1500Kr'||r[5]==='4xOFAB-250'))delete r['5B'];if(r[6]==='R-37M')delete r['6B'];}return r;};}
      if(LOAD.modern)LOAD.modern[T30]={1:'R-74M',10:'R-74M',2:'R-74M',9:'R-74M',3:'R-77-1',8:'R-77-1',11:'R-77M',12:'R-77M',4:'R-37M',7:'R-37M',5:'R-77-1','5B':'R-77-1',6:'R-77M','6B':'R-77M'};
      STRIKE_LOAD[T30]={1:'R-74M',10:'R-74M',2:'R-77-1',9:'R-77-1',3:'Kh-29TD',8:'T220',11:'KAB-500Kr',12:'KAB-500Kr',4:'Kh-31PD',7:'Kh-31PD',5:'R-77-1',6:'R-77-1'};}
    try{CTYPES.modern[1].CAP.unshift(T30);CTYPES.modern[1].INT.unshift(T30);CTYPES.modern[1].ESC.unshift(T30);}catch(e){}

    // ---------------- G-limiter (EFM ch. 11): KAB-1500 6.5 g; other A/G stores 7.5 → 6.5 g by pylon count; A/A or clean 9 g ----------------
    {const _sg=Jet.prototype.storeG;Jet.prototype.storeG=function(){if(!this.ac.s30)return _sg.call(this);const v=Object.values(this.load||{});
      let g=9;if(v.some(s=>/^KAB-1500/.test(s)))g=6.5;else{const n=v.filter(s=>AGW[s]&&AGW[s].k!=='tgp').length;if(n)g=lerp(7.5,6.5,clamp((n-1)/5,0,1));}
      if(v.some(isTank))g=Math.min(g,this.tankFuel>50?this.ac.tkG[0]:this.ac.tkG[1]);this.gAllow=g;return g;};}

    // ---------------- state ----------------
    const S3=window.S30={tvcSw:1,tvc:false,gces:1,gcesAct:0,hud:2,isa:0,haz:0,L:{pg:'RDR',mf:'ENG'},M:{pg:'TSD',mf:'ENG'},R:{pg:'VSD',mf:'ENG'},C:{pg:'UFCP'},ufc:'NAV',fuel:[],rsc:2};
    const is30=()=>!!player&&player.type===T30;
    const s30AG=()=>{const w=game.wsel,a=w&&AGW[w];return !!(is30()&&a&&a.k!=='tgp'&&radar.on()&&radar.sensor==='RDR');};
    // v211: front-seat ground radar. The Su-27SM A/G radar (MAP / GMT / SEA / RNG, SAR picture) now runs on any Su-30SM screen that shows the RDR page while an A/G store is selected
    {const A=window.V121&&window.V121.AGR;if(A){const _a=A.active.bind(A);A.active=function(){if(is30())return !!(player.alive&&game.active&&s30AG()&&['L','M','R'].some(k=>S3[k].pg==='RDR'));return _a();};}}
    const tvcToggle=()=>{if(!(player&&player.ac&&player.ac.tvc))return;if(!S3.tvcSw){flash('TVC MASTER OFF',900);return;}S3.tvc=!S3.tvc;flash(S3.tvc?'TVC ON · ESC OFF':'TVC OFF',1100);sfx.click();};
    window.s30Tvc=tvcToggle;
    // ---------------- TVC and GCES in the flight model ----------------
    {const _fx=Jet.prototype.fx0;Jet.prototype.fx0=function(base){const r=_fx.call(this,base);if(!(this.ac.tvc&&this===player&&S3.tvc))return r;
        const o=Object.create(r);o.aoaLim=60;o.dep=Object.assign({},r.dep,{a:75,rock:.15,spin:.8});return o;};
     const _st=Jet.prototype.step;Jet.prototype.step=function(dt){
      const me=this.ac.s30&&this===player&&this.alive&&!this.remote;
      if(me){// GCES: predicted terrain impact inside ~4 s (radar-altitude hazard) or below the barometric hazard altitude
        const agl=this.pos.y-groundAt(this.pos.x,this.pos.z),vy=this.vel.y,tti=vy<-1?agl/-vy:99,haz=S3.haz>0&&this.pos.y<S3.haz&&vy<0;
        const gear=(this.gearPos||0)>.5,arm=S3.gces&&!S3.tvc&&!gear&&this.hp>15;
        if(arm&&(S3.gcesAct||(tti<4.2+Math.abs(this.bank)*1.2&&agl<1400)||haz)){S3.gcesAct=1;const b=this.bank;
          this.ctl.r=clamp(-b*2.2,-1,1);this.ctl.p=Math.abs(b)<1.2?.9:0;this.thr=Math.max(this.thr,.95);
          if((vy>15&&Math.abs(b)<.4&&agl>200)||!arm)S3.gcesAct=0;if(Math.random()<dt*3)flash('DANGER · GCES',600);}
        else S3.gcesAct=0;}
      _st.call(this,dt);
      const meT=this.ac.tvc&&this===player&&this.alive&&!this.remote;
      if(meT&&S3.tvc){// nozzle moments: authority from thrust, falling off with dynamic pressure; the FBW trims deflection to the G-limiter
        const V=Math.max(this.vel.length(),20),qd=.5*rho(this.pos.y)*V*V,c=this.gloc>0?{p:0,r:0,y:0}:this.ctlE(),Tm=(this.ac.mil*(.35+.65*this.n)+this.ab*(this.ac.ab-this.ac.mil))/this.mass/G;
        const lim=clamp((this.gAllow||9)/9,.6,1),k=Tm*(1-clamp(qd/52000,0,.85))*lim;
        const tv=this.ac.tvc,dp=c.p*1.15*k*(tv.pitch||15)/15,dy=c.y*.55*k*(tv.yaw||10)/10;if(isFinite(dp)&&isFinite(dy)&&Math.abs(dp)+Math.abs(dy)>1e-5){const ax=new V3(dp,-dy,0),l=ax.length(),q0=this.q.clone();this.q.multiply(new Q4().setFromAxisAngle(ax.divideScalar(l),l*dt)).normalize();if(!isFinite(this.q.x+this.q.y+this.q.z+this.q.w))this.q.copy(q0);}
        this.dep=(this.dep||0)*Math.exp(-dt*1.5);this.nozD=c.p*15*lim;}
      else if(meT)this.nozD=0;};}

    // ---------------- radar: PESA beam agility, TWS multitrack (each Fox-3 keeps its own track file, four engaged) ----------------
    {const _r=radar.reset;radar.reset=function(ac){const o=_r.apply(this,arguments);if(ac&&ac.radar&&ac.radar.pesa){this.aesa=true;this.rate=260*D2R;}return o;};}
    const ENG=window.S30ENG=new Map();
    const dlFresh=tg=>{if(!player||!player.alive||!radar.on()||radar.sensor!=='RDR'||!tg||!tg.alive)return false;
      if(radar.mode==='STT')return radar.lock===tg;if(radar.mode!=='TWS')return false;const tk=radar.tracks.get(tg);if(!tk||tk.hoj||performance.now()/1000-tk.t>4)return false;
      return radar.ang(tg.pos).off<radar.gimbal();};
    let _curM=null;
    {const _u=Missile.prototype.update;Missile.prototype.update=function(dt){if(this.n011&&!this.active){this.dlx=true;_curM=this;try{return _u.call(this,dt);}finally{_curM=null;}}return _u.call(this,dt);};}
    {const _e=dlLinkEst;dlLinkEst=function(tg){const m=_curM;if(m&&m.n011){
        // only the four newest engagements get uplink time
        const live=[...new Set(missiles.filter(x=>x.alive&&x.n011&&!x.active&&x.target&&x.target.alive).map(x=>x.target))];if(live.indexOf(tg)>3)return null;
        if(!dlFresh(tg))return null;const now=performance.now()/1000;
        if(radar.mode==='STT')return{p:tg.pos.clone(),v:tg.vel.clone()};const tk=radar.tracks.get(tg);const d=Math.min(now-tk.t,6);return{p:(tk.p||tg.pos).clone().addScaledVector(tk.v||tg.vel,d),v:(tk.v||tg.vel).clone()};}
      return _e(tg);};}
    {const _f=fireMissile;fireMissile=function(type,sh,tg,stPos){const m=_f(type,sh,tg,stPos);try{if(sh===player&&sh.ac.s30&&MSL[type].seek==='ARH'&&tg){m.n011=true;ENG.set(tg,(ENG.get(tg)||0)+1);}}catch(e){}return m;};}
    // the WSO: TWS on this set, and his calls name Russian rounds
    {const _m=rio.mode.bind(rio);rio.mode=function(m){if(is30()&&m==='TWS'){if(radar.mode==='TWS')return;radar.lock=null;radar.bug=null;radar.fromACM=radar.fromTWS=false;radar.mode='TWS';return;}return _m(m);};
     const _c=rio.cmd.bind(rio);rio.cmd=function(c){if(is30()&&c==='tws'&&this.active()&&radar.mode!=='ACM'){this.hold=10;this.mode(radar.mode==='TWS'?'RWS':'TWS');this.say(radar.mode==='TWS'?'TWS, multitrack.':'Back to search.','tw',.5);sfx.click();return true;}return _c(c);};
     const _s=rio.say.bind(rio);rio.say=function(s,key,cd){if(is30()){const w=game.wsel||'Missile';s=s.replace(/^(Phoenix|Sparrow|Sidewinder) away/,w+' away').replace('Phoenix is active.','Pitbull.').replace(', Phoenix priority set',', multitrack').replace(/Maverick's|Mav's/g,'Seeker\'s').replace('Maverick','missile');}return _s(s,key,cd);};}

    // ---------------- HUD: Su-30SM symbology (EFM ch. 4), three modes on VV/FXD ----------------
    const hudPrev={v:0,t:0,a:0};
    function s30Hud(P,fs){const f=P.fwd(new V3()),now=performance.now()/1000,k=KPX*D2R,G2='#59ff9f',sm=Math.round(fs*.85);
      const T=(s,a,e,al='left')=>{const p=hb(a,e);if(p)txt(s,p.x,p.y,al);return p;};
      hx.font=hfont(fs);hx.lineWidth=1.6;
      const _ga=hx.globalAlpha;
      // 1 load factor circle
      {const p=hb(-9,4.6);if(p){circ(p.x,p.y,fs*1.15);txt((P.nz||1).toFixed(1),p.x,p.y,'center');}}
      // 2 speed (IAS km/h, ground speed small above), 5 altitude with R for radar
      {const ias=Math.round((P.cas||0)*1.852),gs=Math.round(Math.hypot(P.vel.x,P.vel.z)*3.6);hx.font=hfont(sm);T(String(gs),-5.6,5.5,'center');hx.font=hfont(fs);
        const p=T(String(ias),-5.6,4.5,'center');if(p){line(p.x-fs*1.6,p.y+fs*.8,p.x+fs*1.6,p.y+fs*.8);diamond(p.x,p.y+fs*1.1,fs*.3);}
        const agl=P.pos.y-groundAt(P.pos.x,P.pos.z);hx.font=hfont(sm);T(String(Math.round(P.vel.y)),5.6,5.5,'center');hx.font=hfont(fs);T(agl<1500?Math.round(agl)+'R':String(Math.round(P.pos.y)),5.6,4.5,'center');}
      // 3 heading tape
      {const hd=((P.hdg%360)+360)%360,y=4.9;for(let d=-15;d<=15;d+=5){const v=Math.round(hd/5)*5+d,a=(v-hd)*.18;if(Math.abs(a)>3)continue;const p=hb(a,y),q=hb(a,y-(v%10?.25:.5));if(p&&q)line(p.x,p.y,q.x,q.y);
          if(v%10===0){hx.font=hfont(sm);T(String((((v%360)+360)%360)/10|0).padStart(2,'0'),a,y+.55,'center');hx.font=hfont(fs);}}
        {const a=hb(-3,y),b=hb(3,y);if(a&&b)line(a.x,a.y,b.x,b.y);}const c=hb(0,y-.7);if(c){hx.beginPath();hx.moveTo(c.x,c.y-6);hx.lineTo(c.x+6,c.y+4);hx.lineTo(c.x-6,c.y+4);hx.closePath();hx.stroke();}}
      // waypoint: SPI, carrier or home field
      const wp=SNS&&SNS.spi?{x:SNS.spi.x,y:SNS.spi.y||0,z:SNS.spi.z,n:'WP02'}:{x:AF.x,y:AF.H||0,z:AF.z,n:'WP01'};
      const wd=new V3(wp.x-P.pos.x,wp.y-P.pos.y,wp.z-P.pos.z),wdist=wd.length(),wb=((Math.atan2(wd.x,-wd.z)*R2D)+360)%360;
      {const wpP=projDir(wd.clone().normalize()),poly=hudPoly(),hT=hb(0,5),hB=hb(0,-13),inside=!!(wpP&&hT&&hB&&Math.abs(wpP.x-hT.x)<k*10&&wpP.y>hT.y&&wpP.y<hB.y);
        if(inside){circ(wpP.x,wpP.y,7);line(wpP.x-5,wpP.y-5,wpP.x+5,wpP.y+5);line(wpP.x-5,wpP.y+5,wpP.x+5,wpP.y-5);}
        else{const p=hb(-5.6,3.1);if(p){hx.strokeRect(p.x-fs*1.6,p.y-fs*.7,fs*3.2,fs*1.4);txt(String(Math.round(wb)).padStart(3,'0'),p.x,p.y,'center');line(p.x,p.y-fs*.7,p.x,p.y-fs*1.7);line(p.x-4,p.y-fs*1.3,p.x,p.y-fs*1.7);line(p.x+4,p.y-fs*1.3,p.x,p.y-fs*1.7);}}}
      // 8 watermark at the nose
      {const p=hb(0,0);if(p){hx.beginPath();hx.moveTo(p.x-14,p.y-5);hx.lineTo(p.x-7,p.y+5);hx.lineTo(p.x,p.y-2);hx.lineTo(p.x+7,p.y+5);hx.lineTo(p.x+14,p.y-5);hx.stroke();line(p.x,p.y-2,p.x,p.y-12);}}
      // 7 flight path marker
      const fpm=projDir(P.vel.clone().normalize());
      if(fpm){circ(fpm.x,fpm.y,6);line(fpm.x-16,fpm.y,fpm.x-6,fpm.y);line(fpm.x+6,fpm.y,fpm.x+16,fpm.y);line(fpm.x,fpm.y-6,fpm.x,fpm.y-12);}
      hx.globalAlpha=_ga*.55;// v211: secondary symbology (bank scale, horizon, sink-rate arc, AoA) drawn dimmer
      // 9 bank scale with 10 acceleration chevrons slaved to it (they ride with longitudinal acceleration; level them with the wings to hold TAS)
      {const dtt=Math.max(now-hudPrev.t,1e-3),V=P.vel.length();if(dtt>.05){hudPrev.a=lerp(hudPrev.a,(V-hudPrev.v)/dtt,.4);hudPrev.v=V;hudPrev.t=now;}
        const c=hb(0,-1.6);if(c){const b=-(P.bank||0),R=k*6.5,cs=Math.cos(b),sn=Math.sin(b);hx.save();hx.translate(c.x,c.y);hx.rotate(b);hx.setLineDash([k*.7,k*.45]);line(-R,0,-k*1.2,0);line(k*1.2,0,R,0);hx.setLineDash([]);
          line(-R,0,-R,k*.5);line(R,0,R,k*.5);hx.restore();
          for(const a of[-30,-15,15,30]){const r=a*D2R;const p={x:c.x+Math.sin(r)*k*2.6,y:c.y+Math.cos(r)*k*2.6};line(p.x,p.y,p.x+Math.sin(r)*k*.4,p.y+Math.cos(r)*k*.4);}
          const off=clamp(hudPrev.a/9.81,-1,1)*k*2.2;for(const s of[-1,1]){const x=c.x+s*(R+k*1.3)*cs,y=c.y+s*(R+k*1.3)*sn-off;hx.beginPath();hx.moveTo(x+s*k*.8,y-k*.6);hx.lineTo(x,y);hx.lineTo(x+s*k*.8,y+k*.6);hx.stroke();}}}
      // 18 horizon line
      {const h=new V3(f.x,0,f.z).normalize(),r=P.right(new V3()),rh=new V3(r.x,0,r.z).normalize(),c0=projDir(h);if(c0){const a=projDir(h.clone().addScaledVector(rh,.25)),b=projDir(h.clone().addScaledVector(rh,-.25));if(a&&b)line(a.x,a.y,b.x,b.y);}}
      // 11/12 Su-30 sink-rate arc on the right: dots every 1 m/s ×10, pointer and value
      {const c=hb(8.3,-.8),R=k*2.6,vy=P.vel.y;if(c){for(let i=-4;i<=4;i++){const a=(i*14)*D2R,x=c.x-Math.cos(a)*R,y=c.y-Math.sin(a)*R;hx.beginPath();hx.arc(x,y,1.8,0,7);hx.fill();}
        const a=clamp(-vy/10,-4,4)*14*D2R,x=c.x-Math.cos(a)*R*.55,y=c.y-Math.sin(a)*R*.55;line(x,y,c.x-Math.cos(a)*R*.95,c.y-Math.sin(a)*R*.95);line(x,y,x+6,y-3);line(x,y,x+6,y+3);
        txt(String(Math.round(Math.abs(vy))),c.x-R*.15,c.y-fs*1.1,'right');}}
      // 16 AoA scale -10…+30 with the aircraft symbol (360° circle in TVC)
      {const c=hb(-9.2,-9.2);if(c){const ad=(P.alpha||0)*R2D;if(S3.tvc){circ(c.x+k,c.y,k*1.6);const a=-ad*D2R;line(c.x+k,c.y,c.x+k+Math.cos(a)*k*1.5,c.y+Math.sin(a)*k*1.5);[0,90,180,270].forEach(d=>{const r=d*D2R;line(c.x+k+Math.cos(r)*k*1.6,c.y+Math.sin(r)*k*1.6,c.x+k+Math.cos(r)*k*1.3,c.y+Math.sin(r)*k*1.3);});}
        else{hx.beginPath();for(let d=-10;d<=30;d+=5){const y=c.y-d*k*.075;hx.moveTo(c.x,y);hx.lineTo(c.x+(d%10?4:8),y);}hx.moveTo(c.x,c.y+10*k*.075);hx.lineTo(c.x,c.y-30*k*.075);hx.stroke();
          const y=c.y-clamp(ad,-10,30)*k*.075;hx.beginPath();hx.moveTo(c.x+6,y);hx.lineTo(c.x+k*1.6,y);hx.lineTo(c.x+k*1.6,y-k*.4);hx.lineTo(c.x+k*1.1,y);hx.stroke();}}}
      hx.globalAlpha=_ga*.8;
      // 13/14/17 navigation block
      hx.font=hfont(sm);T('ENR',-3.2,-6.4,'center');T((wdist/1000).toFixed(1),3,-6.4,'center');hx.font=hfont(fs);
      {const p=hb(0,-6.4);if(p)circ(p.x,p.y,k*.7);}
      T(wp.n+'  '+String(Math.round(wb)).padStart(3,'0'),8.2,-8.8,'right');
      hx.globalAlpha=_ga;
      // 15 master mode / sub-mode or weapon
      const a=AGW[game.wsel],mm=game.wsel==='GUN'?'GUN':a?'A/G':MSL[game.wsel]?'A/A':'NAV';
      T(mm,8.2,-6.4,'right');T(mm==='NAV'?'ENR':mm==='GUN'?'GSh-30':game.wsel,8.2,-7.6,'right');
      if(S3.tvc){hx.fillStyle=hx.strokeStyle;T('ESC OFF',-8.2,-6.4,'left');}else if(!S3.gces)T('ESC OFF',-8.2,-6.4,'left');
      if(S3.gcesAct&&now%.6<.38)T('DANGER',0,-3.4,'center');
      // v211: with the Su-27 layer gone (CUSTOM) the weapon cues live here: radar lock box with range, A/G designation diamond
      if(S3.hud===2){const L=radar.on()&&radar.sensor==='RDR'?radar.lock:null;
        if(L&&L.alive){const p=proj(L.pos);if(p){hx.strokeRect(p.x-14,p.y-14,28,28);const d=radar.ang(L.pos).d;hx.font=hfont(sm);txt((d/1000).toFixed(1),p.x,p.y+26,'center');hx.font=hfont(fs);}}
        if(a&&a.k!=='tgp'&&SNS&&SNS.spi){const p=proj(SNS.spi);if(p){hx.beginPath();hx.moveTo(p.x,p.y-9);hx.lineTo(p.x+9,p.y);hx.lineTo(p.x,p.y+9);hx.lineTo(p.x-9,p.y);hx.closePath();hx.stroke();}}}
      // TWS multitrack marks (CWS ch. 2): dashes on each track file, box on the TWS lock, fired-at tracks carry their count
      if(radar.on()&&radar.mode==='TWS'&&radar.sensor==='RDR'){for(const[j,tk]of radar.tracks){if(!j.alive)continue;const p=proj(radar.trkPos(j,tk,now));if(!p)continue;
          if(j===radar.bug){hx.strokeRect(p.x-11,p.y-7,22,14);}line(p.x-9,p.y,p.x-3,p.y);line(p.x+3,p.y,p.x+9,p.y);
          const n=missiles.filter(m=>m.alive&&m.sh===P&&m.target===j).length;if(n){hx.font=hfont(sm);txt(String(n),p.x+12,p.y-9,'left');hx.font=hfont(fs);}}
        T('TWS',-8.2,-7.6,'left');T('BVR',-8.2,-8.6,'left');}}
    {const _mh=drawMigHud;drawMigHud=function(P,fs,lh){if(!P||P.type!==T30)return _mh(P,fs,lh);
      if(S3.hud===2){try{s30Hud(P,fs);}catch(e){if(!s30Hud._w){s30Hud._w=1;console.warn(e);}}return;}
      _mh(P,fs,lh);if(S3.hud===0){try{s30Hud(P,fs);}catch(e){if(!s30Hud._w){s30Hud._w=1;console.warn(e);}}}};}

    // ---------------- MFDs and UFCP (EFM ch. 5 / 6) on the three glass screens ----------------
    const GR='#46e86e',GD='#2a9a4a',WH='#e8f2ec',CY='#46c8e8',YE='#ffe23a',RD='#ff4a3a',AM='#ffb03a';
    const F=(c,s,x,y,sz,col,al)=>{c.fillStyle=col||GR;c.font='700 '+sz+'px "B612 Mono",monospace';c.textAlign=al||'left';c.textBaseline='middle';c.fillText(String(s),x,y);};
    const BOX=(c,x,y,w,h,col)=>{c.strokeStyle=col||GR;c.lineWidth=1.5;c.strokeRect(x,y,w,h);};
    const TOP=['VSD','TSD','RWR','MFWS','MASD','RDR','TGP'],LFT=['FRP','RFL','AEP','LSS','HYD'],RGT=['CNT','PS','PG','<','>'],BOTM=['LG','FUE','ENG','SYS','','',''],BOT2=['PFD','NAV','ESM','ECM','HUD','',''];
    function wpNow(P){return SNS&&SNS.spi?{x:SNS.spi.x,z:SNS.spi.z,y:SNS.spi.y||0,n:'WP02'}:{x:AF.x,z:AF.z,y:AF.H||0,n:'WP01'};}
    function dial(c,x,y,r,a0,a1,n,v,lab,col){c.strokeStyle=col||GR;c.lineWidth=2;c.beginPath();c.arc(x,y,r,a0,a1);c.stroke();for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;c.beginPath();c.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);c.lineTo(x+Math.cos(a)*(r-6),y+Math.sin(a)*(r-6));c.stroke();if(lab&&lab[i]!=null)F(c,lab[i],x+Math.cos(a)*(r-15),y+Math.sin(a)*(r-15),10,col||GR,'center');}
      const a=a0+(a1-a0)*clamp(v,0,1);c.strokeStyle=WH;c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*(r-4),y+Math.sin(a)*(r-4));c.stroke();}
    const PG={};window.S30PG=PG;
    PG.VSD=(c,x0,y0,x1,y1)=>{const P=player,W=x1-x0,H=y1-y0,cx=(x0+x1)/2,ay=y0+H*.36,R=Math.min(W*.24,H*.27),pp=R/30;
      // attitude ball: cyan sky, brown ground, ladder 10 / 20, plane silhouette, gear stripes
      c.save();c.beginPath();c.moveTo(cx-R,ay-R*.35);c.lineTo(cx-R*.92,ay-R);c.lineTo(cx+R*.92,ay-R);c.lineTo(cx+R,ay-R*.35);c.lineTo(cx+R,ay+R*.7);c.quadraticCurveTo(cx,ay+R*1.25,cx-R,ay+R*.7);c.closePath();c.clip();
      c.translate(cx,ay);c.rotate(-(P.bank||0));const po=(P.pitch||0)*R2D*pp;c.fillStyle='#4ec4cc';c.fillRect(-2*R,-4*R+po,4*R,4*R);c.fillStyle='#8a4a26';c.fillRect(-2*R,po,4*R,4*R);
      c.strokeStyle=WH;c.lineWidth=2;c.beginPath();c.moveTo(-2*R,po);c.lineTo(2*R,po);c.stroke();
      for(const d of[-20,-10,10,20]){const y=po-d*pp;c.beginPath();c.moveTo(-R*.32,y);c.lineTo(R*.32,y);c.moveTo(-R*.32,y);c.lineTo(-R*.32,y+(d>0?6:-6));c.moveTo(R*.32,y);c.lineTo(R*.32,y+(d>0?6:-6));c.stroke();F(c,Math.abs(d),0,y,12,WH,'center');}
      c.restore();c.strokeStyle=WH;c.lineWidth=2;c.beginPath();c.moveTo(cx-R*.5,ay);c.lineTo(cx-R*.12,ay);c.lineTo(cx-R*.06,ay+8);c.lineTo(cx,ay);c.lineTo(cx+R*.06,ay+8);c.lineTo(cx+R*.12,ay);c.lineTo(cx+R*.5,ay);c.moveTo(cx,ay-10);c.lineTo(cx,ay+10);c.stroke();
      if((P.gearPos||0)>.5){c.fillStyle='#111';for(const s of[-1,1])c.fillRect(cx+s*R*.3-3,ay+R*.25,6,R*.3);}
      // thrust indicator on the right edge of the ball
      {const t=clamp((P.n||0)*.8+(P.ab||0)*.2,0,1);F(c,'>',cx+R+4,ay+R*.6-t*R*1.2,14,WH);}
      // top row: Mach, bearing tape with WP arrow, WP relative altitude box, baro alt
      const wp=wpNow(P),wdx=wp.x-P.pos.x,wdz=wp.z-P.pos.z,wdist=Math.hypot(wdx,wdz),wb=((Math.atan2(wdx,-wdz)*R2D)+360)%360,hd=((P.hdg%360)+360)%360;
      BOX(c,x0+4,y0+2,46,16);F(c,Math.round(Math.hypot(P.vel.x,P.vel.z)*3.6),x0+46,y0+10,12,GR,'right');F(c,(P.mach||0).toFixed(2)+'M',x0+56,y0+10,14,GR);
      F(c,Math.round((P.cas||0)*1.852),x0+20,y0+28,14,GR,'center');
      {const tx=cx,ty=y0+24,tw=W*.26;for(let d=-30;d<=30;d+=10){const v=Math.round(hd/10)*10+d,x=tx+(v-hd)/30*tw;if(Math.abs(x-tx)>tw)continue;F(c,String((((v%360)+360)%360)/10|0).padStart(2,'0'),x,ty-10,12,GR,'center');c.strokeStyle=GR;c.beginPath();c.moveTo(x,ty);c.lineTo(x,ty+5);c.stroke();}
        c.beginPath();c.moveTo(tx-tw,ty+5);c.lineTo(tx+tw,ty+5);c.stroke();c.fillStyle=GR;c.fillRect(tx-1,ty+5,3,7);
        const wx=tx+clamp(((wb-hd+540)%360-180)/30,-1,1)*tw;c.fillStyle=WH;c.beginPath();c.moveTo(wx,ty-2);c.lineTo(wx+5,ty+6);c.lineTo(wx-5,ty+6);c.closePath();c.fill();
        if(Math.abs(((wb-hd+540)%360-180))>30){BOX(c,wx-14,ty+8,28,14,WH);F(c,Math.round(wb),wx,ty+15,10,WH,'center');}}
      BOX(c,x1-56,y0+2,52,16);F(c,Math.round(P.pos.y-(wp.y||0)),x1-8,y0+10,12,GR,'right');F(c,Math.round(P.pos.y),x1-30,y0+28,14,GR,'center');F(c,'QFE-1000.0',x1-6,y0+44,10,GR,'right');
      // left: G meter and AoA arc
      {const gx=x0+18,gt=y0+50,gb=ay+R*.9;c.strokeStyle=RD;c.lineWidth=2;c.beginPath();c.moveTo(gx,gt);c.lineTo(gx,gb);c.stroke();c.strokeStyle=GR;for(let g=-1;g<=9;g++){const y=gb-(g+1)/10*(gb-gt);c.beginPath();c.moveTo(gx,y);c.lineTo(gx+(g%2?4:8),y);c.stroke();if(g>0&&g%2)F(c,g,gx-10,y,10,GR,'center');}
        const y=gb-(clamp(P.nz||1,-1,9)+1)/10*(gb-gt);c.fillStyle=WH;c.beginPath();c.moveTo(gx+2,y);c.lineTo(gx+10,y-5);c.lineTo(gx+10,y+5);c.closePath();c.fill();
        const ax=x0+30,a0=Math.PI*.62,a1=Math.PI*1.38,r=(gb-gt)*.6,ccx=ax+r,ccy=(gt+gb)/2;c.strokeStyle=GR;c.lineWidth=2;c.beginPath();c.arc(ccx,ccy,r,a0,a1);c.stroke();
        for(let d=0;d<=40;d+=10){const a=a1-(a1-a0)*(d+5)/45;F(c,d<=30?d:'',ccx+Math.cos(a)*(r+9),ccy+Math.sin(a)*(r+9),10,GR,'center');}
        const a=a1-(a1-a0)*(clamp((P.alpha||0)*R2D,-5,40)+5)/45;c.strokeStyle=WH;c.lineWidth=2;c.beginPath();c.moveTo(ccx+Math.cos(a)*(r-12),ccy+Math.sin(a)*(r-12));c.lineTo(ccx+Math.cos(a)*r,ccy+Math.sin(a)*r);c.stroke();}
      // right: VSI M/C
      {const vx=x1-36,vy=ay,r=R*.6;c.strokeStyle=GR;c.lineWidth=2;c.beginPath();c.arc(vx,vy,r,Math.PI*.55,Math.PI*1.45);c.stroke();F(c,'M/C',vx-r*.2,vy-12,10,GR,'center');
        for(const v of[-30,-20,-10,0,10,20,30]){const a=Math.PI-v/30*Math.PI*.45;F(c,Math.abs(v),vx+Math.cos(a)*(r-10),vy+Math.sin(a)*(r-10),9,GR,'center');}
        const a=Math.PI-clamp(P.vel.y,-30,30)/30*Math.PI*.45;c.strokeStyle=WH;c.lineWidth=3;c.beginPath();c.moveTo(vx,vy);c.lineTo(vx+Math.cos(a)*r,vy+Math.sin(a)*r);c.stroke();F(c,Math.round(P.vel.y),vx+6,vy+16,14,WH);}
      // bottom: Mach (or IAS with ISA), sideslip, nav cross, combined baro / radar altimeter
      const by=y1-H*.2,r2=Math.min(W*.13,H*.17);
      if(S3.isa)dial(c,x0+r2+30,by,r2,Math.PI*.75,Math.PI*2.25,12,clamp((P.cas||0)*1.852/1200,0,1),['0','1','2','3','4','5','6','7','8','9','10','11','12']);
      else dial(c,x0+r2+30,by,r2,Math.PI*.75,Math.PI*2.25,5,clamp((P.mach||0)/2.5,0,1),['0','.5','1','1.5','2','2.5']);
      F(c,'I',x0+6,by-14,10,S3.isa?WH:GR);F(c,'S',x0+6,by,10,S3.isa?WH:GR);F(c,'A',x0+6,by+14,10,S3.isa?WH:GR);
      {const sx=cx,sy=ay+R*1.15;c.strokeStyle=GR;c.lineWidth=1.5;c.beginPath();c.moveTo(sx-30,sy);c.lineTo(sx+30,sy);c.moveTo(sx-8,sy-5);c.lineTo(sx-8,sy+5);c.moveTo(sx+8,sy-5);c.lineTo(sx+8,sy+5);c.stroke();
        const bx=sx+clamp((P.beta||0)*R2D*3,-26,26);c.beginPath();c.arc(bx,sy,5,0,7);c.stroke();}
      {const nx=cx,ny=by,eb=clamp(((wb-hd+540)%360-180)/10,-1,1)*r2*.8;c.strokeStyle=WH;c.lineWidth=3;c.beginPath();c.moveTo(nx+eb,ny-r2*.8);c.lineTo(nx+eb,ny+r2*.8);c.moveTo(nx-r2*.8,ny);c.lineTo(nx+r2*.8,ny);c.stroke();c.strokeStyle=GR;c.beginPath();c.arc(nx,ny,6,0,7);c.stroke();}
      {const agl=P.pos.y-groundAt(P.pos.x,P.pos.z);dial(c,x1-r2-26,by,r2,-Math.PI/2,Math.PI*1.5,10,(P.pos.y%1000)/1000,['0','1','2','3','4','5','6','7','8','9','']);
        BOX(c,x1-r2-44,by-18,30,16);F(c,Math.floor(P.pos.y/1000),x1-r2-29,by-10,12,WH,'center');if(agl<1000){c.fillStyle=YE;c.fillRect(x1-r2-50,by+6,48,16);F(c,Math.round(agl),x1-r2-26,by+14,12,'#111','center');}}
      F(c,Math.round(P.vel.length()*3.6)+'T',x0+W*.22,y1-8,13,GR,'center');F(c,(wdist/1000).toFixed(1),cx-20,y1-8,13,GR,'center');
      if(S3.haz>0){c.fillStyle=RD;c.fillRect(cx+4,y1-16,44,16);F(c,S3.haz,cx+26,y1-8,12,'#111','center');}
      {const agl=P.pos.y-groundAt(P.pos.x,P.pos.z);F(c,(agl<1500?Math.round(agl):'---')+'R',x1-30,y1-8,13,YE,'center');}};
    PG.TSD=(c,x0,y0,x1,y1)=>{const P=player,W=x1-x0,H=y1-y0,cx=(x0+x1)/2,cy=y0+H*.62,R=Math.min(W,H)*.48,rk=[25,50,100,200,400][S3.rsc],k=R/(rk*1000),h=P.hdg*D2R;
      const pt=(x,z)=>{const dx=x-P.pos.x,dz=z-P.pos.z,ex=dx*Math.cos(h)+dz*Math.sin(h),ez=-dx*Math.sin(h)+dz*Math.cos(h);return[cx+ex*k,cy+ez*k];};
      c.save();c.beginPath();c.rect(x0,y0,W,H);c.clip();c.strokeStyle=GD;c.lineWidth=1;for(const q of[.25,.5,.75,1]){c.beginPath();c.arc(cx,cy,R*q,0,7);c.stroke();}
      F(c,rk/2,cx+R*.36,cy-R*.36,10,GD);F(c,rk,cx+R*.72,cy-R*.72,10,GD);
      // threat rings of emitting SAMs
      if(typeof GND!=='undefined'&&GND.units)for(const u of GND.units){if(!u.alive||!u.T||!u.T.emit||u.side===P.side||!u.T.R0)continue;const[sx,sy]=pt(u.pos.x,u.pos.z);c.strokeStyle=RD;c.lineWidth=1.2;c.beginPath();c.arc(sx,sy,u.T.R0*k*.9,0,7);c.stroke();F(c,'SAM',sx,sy,10,RD,'center');}
      // flight plan
      const wp=[{x:AF.x,z:AF.z,n:'1'}];if(SNS&&SNS.spi)wp.push({x:SNS.spi.x,z:SNS.spi.z,n:'2'});c.strokeStyle=YE;c.setLineDash([5,4]);c.beginPath();{const[a,b]=pt(P.pos.x,P.pos.z);c.moveTo(a,b);}for(const w of wp){const[a,b]=pt(w.x,w.z);c.lineTo(a,b);}c.stroke();c.setLineDash([]);
      for(const w of wp){const[a,b]=pt(w.x,w.z);c.strokeStyle=GR;c.beginPath();c.arc(a,b,7,0,7);c.stroke();F(c,w.n,a,b,10,GR,'center');}
      // radar track files: hostile hat, our fox-3s in the air as a count
      for(const[j,tk]of radar.tracks){if(!j.alive)continue;const[sx,sy]=pt(j.pos.x,j.pos.z),lk=j===radar.lock||j===radar.bug,n=missiles.filter(m=>m.alive&&m.sh===P&&m.target===j).length,col=n?RD:lk?AM:YE;
        c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.moveTo(sx-7,sy+3);c.lineTo(sx,sy-6);c.lineTo(sx+7,sy+3);c.stroke();const vh=Math.atan2(j.vel.x,-j.vel.z)-h;c.beginPath();c.moveTo(sx,sy-6);c.lineTo(sx+Math.sin(vh)*16,sy-6-Math.cos(vh)*16);c.stroke();
        F(c,Math.round(j.pos.y/100),sx+9,sy+8,9,col);if(n)F(c,'×'+n,sx-10,sy+8,9,RD,'right');}
      for(const j of jets){if(j===P||!j.alive||j.side!==P.side)continue;const[sx,sy]=pt(j.pos.x,j.pos.z);c.strokeStyle=CY;c.lineWidth=2;c.beginPath();c.arc(sx,sy,5,0,7);c.stroke();}
      // radar coverage wedge
      if(radar.on()){c.strokeStyle='rgba(70,232,110,.35)';const g=radar.gimbal?radar.gimbal():60*D2R;for(const s of[-1,1]){c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.sin(s*g)*R,cy-Math.cos(s*g)*R);c.stroke();}}
      c.restore();c.strokeStyle=WH;c.lineWidth=2.5;c.beginPath();c.moveTo(cx,cy-10);c.lineTo(cx,cy+8);c.moveTo(cx-9,cy-2);c.lineTo(cx+9,cy-2);c.moveTo(cx-4,cy+7);c.lineTo(cx+4,cy+7);c.stroke();
      const wb=wp[wp.length-1],b=Math.atan2(wb.x-P.pos.x,-(wb.z-P.pos.z))-h;c.save();c.translate(cx+Math.sin(b)*R*.95,cy-Math.cos(b)*R*.95);c.rotate(b);c.fillStyle=GR;c.beginPath();c.moveTo(0,-8);c.lineTo(6,4);c.lineTo(-6,4);c.closePath();c.fill();c.restore();
      F(c,'HDG '+String(Math.round(((P.hdg%360)+360)%360)).padStart(3,'0'),x0+4,y0+10,12,GR);F(c,rk+' KM',x1-4,y0+10,12,GR,'right');F(c,'TRK '+radar.tracks.size+'/15',x0+4,y1-8,11,GR);};
    PG.RWR=(c,x0,y0,x1,y1)=>{const P=player,cx=(x0+x1)/2,cy=(y0+y1)/2+6,R=Math.min(x1-x0,y1-y0)*.42;c.strokeStyle=GR;c.lineWidth=1.5;for(const q of[.33,.66,1]){c.beginPath();c.arc(cx,cy,R*q,0,7);c.stroke();}
      for(let a=0;a<360;a+=30){const r=a*D2R;c.beginPath();c.moveTo(cx+Math.sin(r)*R,cy-Math.cos(r)*R);c.lineTo(cx+Math.sin(r)*(R+6),cy-Math.cos(r)*(R+6));c.stroke();}
      F(c,'L-150',x0+4,y0+10,12,GR);let n=0;if(window.l150List&&window.l150Sym)for(const t of l150List()){const r=R*(.95-.6*clamp(t.pwr,0,1));l150Sym(c,t,cx+Math.sin(t.a)*r,cy-Math.cos(t.a)*r,14,performance.now()%400<220);n++;}
      F(c,n?n+' EMITTERS':'CLEAN',x1-4,y0+10,12,n?AM:GR,'right');c.strokeStyle=WH;c.beginPath();c.moveTo(cx,cy-8);c.lineTo(cx,cy+8);c.moveTo(cx-7,cy);c.lineTo(cx+7,cy);c.stroke();};
    PG.RDR=(c,x0,y0,x1,y1)=>{if(s30AG()){try{SM_PAGE.RDR(c,x0,y0,x1,y1);return;}catch(e){}}const P=player,W=x1-x0,H=y1-y0,on=radar.on(),A=70,gx0=x0+24,gx1=x1-24,gy0=y0+22,gy1=y1-26,now=performance.now()/1000;
      const X=az=>lerp(gx0,gx1,(clamp(az*R2D,-A,A)/A+1)/2),Y=d=>gy1-clamp(d/radar.rngM,0,1)*(gy1-gy0);
      c.strokeStyle=GD;c.lineWidth=1;c.strokeRect(gx0,gy0,gx1-gx0,gy1-gy0);for(const a of[-60,-30,0,30,60]){c.beginPath();c.moveTo(X(a*D2R),gy0);c.lineTo(X(a*D2R),gy1);c.stroke();}for(const q of[.25,.5,.75]){c.beginPath();c.moveTo(gx0,Y(radar.rngM*q));c.lineTo(gx1,Y(radar.rngM*q));c.stroke();}
      F(c,Math.round(radar.rngM/1000),gx0-4,gy0+6,11,GR,'right');F(c,Math.round(radar.rngM/2000),gx0-4,Y(radar.rngM/2),11,GR,'right');
      const md={RWS:'RWS',TWS:'TWS',STT:'STT',ACM:'CC'}[radar.mode]||radar.mode;F(c,'N011M '+(radar.sensor==='IRST'?'OLS-30':md),x0+4,y0+8,12,AM);F(c,rio.active()?'WSO':'PLT',x1-4,y0+8,12,rio.active()?CY:WH,'right');
      if(!on){F(c,radar.power==='OFF'?'RDR OFF':'STBY',(x0+x1)/2,(y0+y1)/2,18,GD,'center');return;}
      // antenna position
      c.fillStyle=CY;c.fillRect(X(radar.antAz||0)-2,gy1+2,4,8);
      for(const[j,tk]of radar.tracks){if(!j.alive)continue;const q=radar.mode==='TWS'?radar.ang(radar.trkPos(j,tk,now)):radar.ang(j.pos);if(Math.abs(q.az)>A*D2R)continue;const x=X(q.az),y=Y(q.d),lk=j===radar.lock,bg=j===radar.bug,n=missiles.filter(m=>m.alive&&m.sh===P&&m.target===j).length;
        const col=n?RD:lk||bg?AM:YE;c.fillStyle=col;c.fillRect(x-6,y-3,12,6);if(radar.mode==='TWS'){const vh=Math.atan2(j.vel.x,-j.vel.z)-P.hdg*D2R;c.strokeStyle=col;c.lineWidth=1.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(vh)*14,y-Math.cos(vh)*14);c.stroke();}
        F(c,Math.round(j.pos.y/1000),x+8,y+9,9,col);if(lk||bg){c.strokeStyle=col;c.lineWidth=1.5;c.strokeRect(x-10,y-7,20,14);}if(n){const m=missiles.find(m=>m.alive&&m.sh===P&&m.target===j);F(c,Math.round(m.tti||0),x-10,y-12,9,RD,'right');}}
      for(const[j,s]of radar.strobes){c.strokeStyle=AM;c.setLineDash([3,3]);c.beginPath();c.moveTo(X(s.az),gy0);c.lineTo(X(s.az),gy1);c.stroke();c.setLineDash([]);}
      if(radar.mode!=='STT'){const x=X(radar.cur.az),y=Y(radar.cur.r*radar.rngM);c.strokeStyle=WH;c.lineWidth=1.6;c.beginPath();c.moveTo(x-6,y-8);c.lineTo(x-6,y+8);c.moveTo(x+6,y-8);c.lineTo(x+6,y+8);c.stroke();}
      if(radar.lock){const a=radar.ang(radar.lock.pos);F(c,'D '+(a.d/1000).toFixed(1)+'  H '+Math.round(radar.lock.pos.y)+'  Vc '+Math.round(-radar.lock.vel.clone().sub(P.vel).dot(radar.lock.pos.clone().sub(P.pos).normalize())*3.6),(x0+x1)/2,y1-8,11,AM,'center');}
      else{const live=[...new Set(missiles.filter(m=>m.alive&&m.sh===P&&m.n011&&!m.active).map(m=>m.target))].length;F(c,'TRK '+radar.tracks.size+'/15   ENG '+live+'/4',(x0+x1)/2,y1-8,11,GR,'center');}
      if(game.wsel&&MSL[game.wsel])F(c,game.wsel+' ×'+P.count(game.wsel),x1-4,y1-8,11,GR,'right');};
    PG.TGP=(c,x0,y0,x1,y1)=>{try{const f=SM_PAGE.TV;if(f)return f(c,x0,y0,x1,y1);}catch(e){}F(c,'NO VIDEO',(x0+x1)/2,(y0+y1)/2,16,GD,'center');};
    PG.MASD=(c,x0,y0,x1,y1)=>{const P=player,W=x1-x0,cx=(x0+x1)/2,w=game.wsel;F(c,'MASD',x0+4,y0+10,13,AM);F(c,game.arm?'MASTER ARM':'SAFE',x1-4,y0+10,12,game.arm?RD:GR,'right');
      const py=y0+60,sw=W*.44;c.strokeStyle=GR;c.lineWidth=1.4;c.beginPath();c.moveTo(cx-sw,py);c.lineTo(cx-W*.1,py-30);c.lineTo(cx,py-44);c.lineTo(cx+W*.1,py-30);c.lineTo(cx+sw,py);c.lineTo(cx+W*.1,py+6);c.lineTo(cx-W*.1,py+6);c.closePath();c.stroke();
      const ks=Object.keys(P.ac.st||{}).sort((a,b)=>P.ac.st[a][0]-P.ac.st[b][0]||P.ac.st[a][2]-P.ac.st[b][2]),n=ks.length||1;
      ks.forEach((k,i)=>{const x=cx-sw+(i+.5)*(2*sw)/n,s=P.load[k],sel=s&&s===w;F(c,k,x,py+18,9,GD,'center');const col=!s?GD:sel?YE:GR;c.strokeStyle=col;c.fillStyle=col;
        if(s){c.beginPath();c.arc(x,py+36,7,0,7);sel?c.fill():c.stroke();F(c,(SN[s]||s).replace('R7','7').slice(0,6),x,py+54+(i%2)*12,9,col,'center');}else{c.beginPath();c.moveTo(x-5,py+36);c.lineTo(x+5,py+36);c.stroke();}});
      const cnt={};for(const s of Object.values(P.load))if(MSL[s]||AGW[s])cnt[s]=(cnt[s]||0)+1;let yy=py+90;for(const[s,k]of Object.entries(cnt)){F(c,s+'  ×'+k,x0+10,yy,12,s===w?YE:GR);yy+=17;}
      F(c,'GUN '+(P.gun?P.gun.ammo:0)+'   FLR '+(P.flares||0)+'   CHF '+(P.chaff||0),x0+10,y1-10,11,GR);F(c,'G-LIM '+(P.gAllow||9).toFixed(1),x1-6,y1-10,11,AM,'right');};
    const MF={};
    MF.ENG=(c,x0,y0,x1,y1)=>{const P=player,W=x1-x0,H=y1-y0,n1=clamp((P.n||0)*100,0,110),ab=(P.ab||0)>.2,o2=(performance.now()/2600)%1<.45;
      [x0+W*.12,x0+W*.62].forEach((x,i)=>{F(c,String(i+1),x+(i?-12:W*.28),y0+44,13,WH,i?'right':'left');if(o2){c.strokeStyle=CY;c.lineWidth=2;c.strokeRect(x,y0+36,W*.08,14);c.strokeRect(x+W*.1,y0+36,W*.08,14);}});
      c.strokeStyle=GR;c.beginPath();c.moveTo(x0,y0+62);c.lineTo(x1,y0+62);c.stroke();if(P.hp<60)F(c,'ENGINE DAMAGE',(x0+x1)/2,y0+74,13,RD,'center');
      [x0+W*.22,x0+W*.48].forEach((x,i)=>{BOX(c,x-16,y0+88,32,16,GR);F(c,ab?'CMB':'TRN',x,y0+96,10,GR,'center');const y=y0+H*.48;dial(c,x,y,26,Math.PI*.75,Math.PI*1.6,4,n1/110,['','6','8','10',''],GR);BOX(c,x+4,y-10,26,16,WH);F(c,Math.round(n1),x+17,y-2,11,WH,'center');
        const tt=Math.round(350+n1*5+(ab?60:0)),ty=y0+H*.74;dial(c,x,ty,20,Math.PI*1.1,Math.PI*1.9,3,(tt-300)/700,null,CY);c.strokeStyle=RD;c.beginPath();c.arc(x,ty,20,Math.PI*1.75,Math.PI*1.95);c.stroke();BOX(c,x-14,ty+12,28,14,CY);F(c,tt,x,ty+19,10,CY,'center');});
      F(c,'RPM%',x0+W*.35,y0+H*.36,11,GR,'center');F(c,'T°',x0+W*.22,y0+H*.64,11,CY,'center');F(c,'T°',x0+W*.48,y0+H*.64,11,CY,'center');
      {const nx=x0+W*.82,ny=y0+H*.6,h=H*.3,d=clamp((P.nozD||0)/15,-1,1);F(c,'NOZZLE',nx,ny-h/2-12,11,GR,'center');c.strokeStyle=GR;c.beginPath();c.moveTo(nx-12,ny-h/2);c.lineTo(nx-12,ny+h/2);c.moveTo(nx+12,ny-h/2);c.lineTo(nx+12,ny+h/2);c.stroke();
        ['10','0','10'].forEach((t,i)=>F(c,t,nx,ny-h/2+i*h/2,10,GR,'center'));const y=ny-d*h/2;c.fillStyle=WH;c.beginPath();c.moveTo(nx-14,y);c.lineTo(nx-22,y-5);c.lineTo(nx-22,y+5);c.closePath();c.fill();c.beginPath();c.moveTo(nx+14,y);c.lineTo(nx+22,y-5);c.lineTo(nx+22,y+5);c.closePath();c.fill();
        F(c,S3.tvc?'TVC':'',nx,ny+h/2+12,11,AM,'center');}};
    MF.FUE=(c,x0,y0,x1,y1)=>{const P=player,cx=(x0+x1)/2,f=P.totalFuel||0,now=performance.now()/1000,L=S3.fuel;L.push([now,f]);while(L.length&&now-L[0][0]>20)L.shift();const ff=L.length>1?Math.max(0,(L[0][1]-f)/Math.max(1,now-L[0][0])*3600):0;
      F(c,'TOTAL '+(f/1000).toFixed(2)+' t',cx,y0+60,20,f<P.ac.fuel*.15?RD:WH,'center');const bx=x1-50,bt=y0+80,bb=y1-30;c.strokeStyle=GR;c.strokeRect(bx,bt,22,bb-bt);c.fillStyle=f<P.ac.fuel*.15?RD:GR;const r=clamp(f/(P.ac.fuel+(P.ac.tank||0)),0,1);c.fillRect(bx+2,bb-(bb-bt)*r,18,(bb-bt)*r);
      for(let i=0;i<=5;i++)F(c,(P.ac.fuel/1000*i/5).toFixed(0),bx-6,bb-(bb-bt)*i/5,10,GR,'right');F(c,'CONS '+Math.round(ff)+' kg/h',x0+16,y0+110,13,GR);F(c,'ENG1 '+Math.round(ff/2),x0+16,y0+134,12,GR);F(c,'ENG2 '+Math.round(ff/2),x0+16,y0+152,12,GR);
      F(c,ff>50?'ENDUR '+Math.round(f/ff*60)+' MIN':'',x0+16,y0+178,12,GR);};
    MF.SYS=(c,x0,y0,x1,y1)=>{const P=player,dm=P.dm||{},ok=v=>v==null||v>50;const it=[['GEN SYS',P.hp>20],['FLT CTL / NAV',ok(dm.fcs)&&P.hp>30],['FIRE CTL',P.hp>20],['ECM',!!P.ecm],['TGT EQUIP',true],['COMM',P.hp>15],['RADAR',radar.on()],['IRST / TGP',!!P.ac.irst]];
      const cw=(x1-x0-20)/2;it.forEach(([t,g],i)=>{const x=x0+10+(i%2)*cw,y=y0+46+Math.floor(i/2)*((y1-y0-60)/4);c.fillStyle=g?'#0d3a1c':'#4a120c';c.fillRect(x+4,y,cw-8,28);BOX(c,x+4,y,cw-8,28,g?GR:RD);F(c,t,x+cw/2,y+14,12,g?GR:RD,'center');});};
    MF.LG=(c,x0,y0,x1,y1)=>{const P=player,cx=(x0+x1)/2,g=P.gearPos||0;F(c,'AIRBRAKE',cx,y0+50,13,(P.sb||0)>.1?YE:GD,'center');F(c,'FLAPS',cx,y0+72,13,(P.flapPos||0)>.1?YE:GD,'center');
      [[cx,y0+120],[cx-50,y0+160],[cx+50,y0+160]].forEach(([x,y])=>{c.fillStyle=g>.98?GR:g>.02?YE:'#222';c.beginPath();c.arc(x,y,12,0,7);c.fill();});
      ['ST','AL','RD'].forEach((t,i)=>F(c,t,cx-40+i*40,y1-20,13,GR,'center'));};
    MF.HYD=(c,x0,y0,x1,y1)=>{const P=player,dm=P.dm||{},h=dm.hyd==null||dm.hyd>50;[x0+(x1-x0)*.3,x0+(x1-x0)*.7].forEach((x,i)=>{F(c,'HYD '+(i+1),x,y0+50,13,GR,'center');c.fillStyle=h?GR:RD;c.beginPath();c.moveTo(x,y0+64);c.lineTo(x+10,y0+84);c.lineTo(x-10,y0+84);c.closePath();c.fill();});
      F(c,'PROBE '+(P.probe?'EXT':'RET'),x0+20,y1-40,12,GR);F(c,'BRAKES',x1-20,y1-40,12,GR,'right');};
    MF.LSS=(c,x0,y0,x1,y1)=>{const P=player;F(c,'CABIN ALT '+Math.round(Math.min(P.pos.y,2000+Math.max(0,P.pos.y-8000)*.3))+' m',x0+16,y0+70,13,GR);F(c,'O2 MODE  NORM',x0+16,y0+100,13,GR);F(c,'PRESS  NORM',x0+16,y0+130,13,GR);};
    MF.AEP=(c,x0,y0,x1,y1)=>{const P=player,v=P.hp>15;F(c,'VOLTAGE',(x0+x1)/2,y0+44,13,GR,'center');[['DC',27,20,32],['AC',115,110,126]].forEach(([t,val,a,b],i)=>{const x=x0+(x1-x0)*(.3+.4*i),t0=y0+64,t1=y1-30;F(c,t,x,t0-8,12,GR,'center');c.strokeStyle=YE;c.beginPath();c.moveTo(x,t0);c.lineTo(x,t1);c.stroke();
      for(let k=0;k<=6;k++){const y=t1-(t1-t0)*k/6;F(c,Math.round(a+(b-a)*k/6),x-6,y,9,GR,'right');}const y=t1-(t1-t0)*((v?val:0)-a)/(b-a);F(c,'⇦',x+4,y,13,WH);});};
    MF.RFL=(c,x0,y0,x1,y1)=>{const P=player;F(c,P.probe?'READY':'—',(x0+x1)/2,y0+60,16,P.probe?GR:GD,'center');F(c,'LOAD '+Math.round(P.refuelKg||0)+' kg',x0+16,y0+100,13,GR);F(c,'TOTAL '+Math.round(P.totalFuel)+' kg',x0+16,y0+122,13,GR);F(c,'MODE AUTO',x0+16,y0+150,13,GR);};
    MF.FRP=(c,x0,y0,x1,y1)=>{const P=player;F(c,'FBW  QUAD',x0+16,y0+60,13,GR);F(c,'G-LIMIT  '+(P.gAllow||9).toFixed(1),x0+16,y0+84,13,AM);F(c,'TVC  '+(S3.tvcSw?(S3.tvc?'ON':'ARMED'):'OFF'),x0+16,y0+108,13,S3.tvc?AM:GR);
      F(c,'GCES  '+(S3.tvc||!S3.gces?'OFF':S3.gcesAct?'ACTIVE':'ON'),x0+16,y0+132,13,S3.gcesAct?RD:GR);F(c,'HAZ BARO '+S3.haz+' m',x0+16,y0+156,13,GR);F(c,'MAX G '+(P.maxNz||1).toFixed(1),x0+16,y0+180,13,GR);};
    PG.MFWS=(c,x0,y0,x1,y1,k)=>{const P=player,f=P.totalFuel||0;F(c,'FUEL',x0+20,y0+20,20,GR);F(c,'RES = '+(f/1000).toFixed(1)+' t',x0+80,y0+20,15,WH);(MF[S3[k].mf]||MF.ENG)(c,x0,y0+10,x1,y1);};
    // UFCP (centre screen): COM / IFF / NAV / A/A / A/G and the DEST / WP / VV/FXD / TVC / ESC keys
    PG.UFCP=(c,x0,y0,x1,y1)=>{const P=player,W=x1-x0,wp=wpNow(P),d=Math.hypot(wp.x-P.pos.x,wp.z-P.pos.z),b=((Math.atan2(wp.x-P.pos.x,-(wp.z-P.pos.z))*R2D)+360)%360;
      c.fillStyle='#021208';c.fillRect(x0,y0+18,W,96);const L=S3.ufc==='DEST'?['DEST FPL '+wp.n,'LAT N 42 21 32 LON E 41 41 22',String(Math.round(b)).padStart(3,'0')+' '+(d/1000).toFixed(1)+'KM ETA:00:00']:
        ['COM1 CH01 252.00',wp.n+' '+String(Math.round(b)).padStart(3,'0')+' '+(d/1000).toFixed(1)+'K','NAV-DNAV '+wp.n];
      L.forEach((s,i)=>F(c,s,x0+6,y0+36+i*28,i===1&&S3.ufc==='DEST'?9:12,GR));
      const mm=game.wsel==='GUN'?'GUN':AGW[game.wsel]?'A/G':MSL[game.wsel]?'A/A':'NAV';
      F(c,'MODE '+mm,x0+6,y0+136,13,AM);F(c,'HUD '+['HYB','FC3','CST'][S3.hud],x1-6,y0+136,13,GR,'right');
      F(c,'TVC '+(S3.tvc?'ON':'OFF'),x0+6,y0+160,13,S3.tvc?AM:GR);F(c,'ESC '+(S3.gces&&!S3.tvc?'ON':'OFF'),x1-6,y0+160,13,S3.gces&&!S3.tvc?GR:AM,'right');
      F(c,'WSO '+(rio.active()?'AUTO':'MAN'),x0+6,y0+184,13,rio.active()?CY:WH);F(c,'ISA '+(S3.isa?'IAS':'M'),x1-6,y0+184,13,GR,'right');
      F(c,'G '+(P.nz||1).toFixed(1)+'  α '+Math.round((P.alpha||0)*R2D),(x0+x1)/2,y1-16,13,WH,'center');};
    const C_TOP=['NAV','A/A','A/G','VV/FXD'],C_BOT=['DEST','TVC','ESC','WSO'],C_L=['ISA','HAZ+','HAZ-','EXIT'],C_R=['TSD+','TSD-','RDR+','RDR-'];
    const pickAA=()=>{const l=player.missileTypes();if(!l.length){flash('NO A/A STORES',900);return;}game.wsel=l[(l.indexOf(game.wsel)+1)%l.length];};
    const pickAG=()=>{const l=[...new Set(Object.values(player.load).filter(s=>AGW[s]&&AGW[s].k!=='tgp'))];if(!l.length){flash('NO A/G STORES',900);return;}game.wsel=l[(l.indexOf(game.wsel)+1)%l.length];};
    function s30Label(k,sd,i){if(k==='C')return({T:C_TOP,B:C_BOT,L:C_L,R:C_R}[sd]||[])[i]||'';if(sd==='T')return TOP[i]||'';if(sd==='L')return LFT[i]||'';if(sd==='R')return(RGT[i]==='PG'&&S3[k].pg==='RDR'&&s30AG())?'MODE':RGT[i]||'';if(sd==='B')return S3[k].pg==='MFWS'?(BOTM[i]||''):(BOT2[i]||'');return'';}
    function s30Press(k,sd,i){if(k==='C'){const a=({T:C_TOP,B:C_BOT,L:C_L,R:C_R}[sd]||[])[i];
        if(a==='NAV')game.wsel='GUN';else if(a==='A/A')pickAA();else if(a==='A/G')pickAG();else if(a==='VV/FXD'){S3.hud=(S3.hud+1)%3;flash('HUD '+['HYBRID','FC3','CUSTOM'][S3.hud],900);}
        else if(a==='DEST')S3.ufc=S3.ufc==='DEST'?'NAV':'DEST';else if(a==='TVC')tvcToggle();else if(a==='ESC'){S3.gces^=1;flash(S3.gces?'GCES ON':'GCES OFF · ESC OFF',900);}else if(a==='WSO')rio.toggle();
        else if(a==='ISA')S3.isa^=1;else if(a==='HAZ+')S3.haz=Math.min(5000,S3.haz+100);else if(a==='HAZ-')S3.haz=Math.max(0,S3.haz-100);else if(a==='EXIT')S3.ufc='NAV';
        else if(a==='TSD+')S3.rsc=Math.min(4,S3.rsc+1);else if(a==='TSD-')S3.rsc=Math.max(0,S3.rsc-1);else if(a==='RDR+')radar.ri=Math.min(radar.ranges.length-1,radar.ri+1);else if(a==='RDR-')radar.ri=Math.max(0,radar.ri-1);return;}
      const S=S3[k];if(sd==='T'){const p=TOP[i];if(p)S.pg=p;return;}
      if(sd==='L'){const p=LFT[i];if(p){S.pg='MFWS';S.mf=p;}return;}
      if(sd==='B'&&S.pg==='MFWS'){const p=BOTM[i];if(p)S.mf=p;return;}
      if(sd==='B'){const p=BOT2[i];if(p)S.pg=p;return;}
      if(sd==='R'){const a=RGT[i];if(a==='<'||a==='>'){if(S.pg==='RDR'||S.pg==='TSD'){if(S.pg==='RDR')radar.ri=clamp(radar.ri+(a==='>'?1:-1),0,radar.ranges.length-1);else S3.rsc=clamp(S3.rsc+(a==='>'?1:-1),0,4);}}
        else if(a==='CNT')S.pg=S.pg==='RDR'?'TSD':'RDR';else if(a==='PS')radar.toggleSensor();else if(a==='PG'){if(S.pg==='RDR'&&s30AG()){try{window.V121.AGR.nextMode(1);}catch(e){}sfx.click();}else if(radar.mode==='TWS')radar.setTWS(false);else radar.setTWS(true);}}}
    {const _l=smLabel,_p=smPress;smLabel=function(k,sd,i){return is30()?s30Label(k,sd,i):_l(k,sd,i);};smPress=function(k,sd,i){if(is30())return s30Press(k,sd,i);return _p(k,sd,i);};}
    function s30Screen(key,cv){const S=S3[key],G=window.SMG&&SMG[key],c=cv.getContext('2d'),W=cv.width,H=cv.height;c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#010503';c.fillRect(0,0,W,H);if(!G)return;
      const C=key==='C',x0=C?18:44,x1=W-(C?18:44),y0=C?18:22,y1=H-(C?18:22),pg=C?'UFCP':S.pg;
      try{c.save();(PG[pg]||PG.VSD)(c,x0,y0,x1,y1,key);}catch(e){if(!s30Screen._w){s30Screen._w=1;console.warn('Su-30 MFD '+pg,e);}}finally{c.restore();}
      const tx=i=>W/2+((i-(G.nT-1)/2)*(G.w/G.nT)*.95)/G.w*W,ty=i=>H/2-((i-(G.nS-1)/2)*(G.h/G.nS)*.95)/G.h*H,fz=C?9:11;
      for(let i=0;i<G.nT;i++){const t=s30Label(key,'T',i),on=!C&&TOP[i]===S.pg;if(t){if(on)BOX(c,tx(i)-22,1,44,15,GR);F(c,t,tx(i),9,fz,GR,'center');}
        const b=s30Label(key,'B',i);if(b){const o=!C&&(S.pg==='MFWS'?S.mf===b:S.pg===b);if(o)BOX(c,tx(i)-22,H-16,44,15,GR);F(c,b,tx(i),H-8,fz,GR,'center');}}
      for(let i=0;i<G.nS;i++){const l=s30Label(key,'L',i),r=s30Label(key,'R',i);if(l)F(c,l,C?4:6,ty(i),fz,GR,'left');if(r)F(c,r,W-(C?4:6),ty(i),fz,GR,'right');}}
    window.S30F={label:s30Label,press:s30Press,screen:s30Screen};
    {const _sd=suSMDraw;suSMDraw=function(V){if(is30()){s30Screen('L',V.L);s30Screen('C',V.C);s30Screen('R',V.R);try{_smGauges(V);}catch(e){}return;}return _sd(V);};}

    // ---------------- keys: Shift+Y TVC, Shift+8 cockpit switch panel ----------------
    try{CTL.map['+KeyY']={fn:()=>tvcToggle()};
      const swOff=()=>{let v=false;try{v=localStorage.getItem('viper.swpHide')==='1';}catch(e){}return v;};
      const st=document.createElement('style');st.textContent='body.swpoff #swp{display:none!important}';document.head.appendChild(st);if(swOff())document.body.classList.add('swpoff');
      CTL.map['+Digit8']={fn:()=>{const on=document.body.classList.toggle('swpoff');try{localStorage.setItem('viper.swpHide',on?'1':'0');}catch(e){}flash(on?'SWITCH PANEL HIDDEN · SHIFT+8':'SWITCH PANEL',900);}};
      document.querySelectorAll('.keys').forEach(k=>{k.insertAdjacentHTML('beforeend','<div>Su-30SM thrust vectoring<kbd>Shift+Y</kbd></div><div>Hide / show cockpit switch panel<kbd>Shift+8</kbd></div>');});}catch(e){console.warn('v206 keys',e);}
    // reset the jet's systems on each sortie
    {const _sp=Jet.prototype.spawn;Jet.prototype.spawn=function(){const r=_sp.apply(this,arguments);if((this.ac.s30||this.ac.tvc)&&this===player){S3.tvc=false;S3.gcesAct=0;ENG.clear();}return r;};}
    }catch(e){console.warn('v206 Su-30SM',e);}
    /* ===== v207: Su-30SM stores after the published Su-30SM weapons list (12 hardpoints, 8,000 kg, 14 AAMs max), its own T220/E targeting pod page,
       APK-9 datalink pod for the Kh-59 family, and a Su-30SM front cockpit pass: UFCP under the HUD, centre standby cluster, canopy-bow mirrors, left console box. ===== */
    try{
    const T30='Su-30SM';
    // v210: LCODES (laser codes) is private to the pod module; the T220 page read it from here and threw every frame it was drawn
    const LCODES=['1688','1511','1111','1234','2222'];
    // ---------------- new A/G stores ----------------
    const AG=(o)=>Object.assign({k:'agm',col:0xd6d4c8,kd:2.4e-5,nav:3.0,cone:40},o);
    Object.assign(AGW,{
      'Kh-29L':  AG({mass:657,L:3.88,R:.19,soft:34,hard:11,dmg:420,dv:300,burn:6,maxG:10,range:10000,fov:[6,3],seek:'LASER',lockR:10000,cone:35}),
      'Kh-29T':  AG({mass:680,L:3.88,R:.19,soft:34,hard:11,dmg:420,dv:300,burn:6,maxG:10,range:12000,fov:[6,3],seek:'TV',lockR:12000}),
      'Kh-38MT': AG({mass:520,L:4.2,R:.16,col:0xb8bcb4,soft:30,hard:9,dmg:300,dv:600,burn:8,kd:2.0e-5,maxG:14,range:40000,fov:[5,2.5],ir:1,seek:'IR',lockR:20000,nav:3.4,cone:60}),
      'Kh-59MK': AG({mass:930,L:5.7,R:.19,col:0xc9c8be,soft:40,hard:16,dmg:520,dv:280,burn:70,kd:1.4e-5,maxG:6,range:120000,fov:[8,3],seek:'TV',lockR:25000,nav:2.6,cone:50}),
      'Kh-59MK2':AG({mass:900,L:5.7,R:.19,col:0xbfc2b8,soft:44,hard:16,dmg:540,dv:280,burn:70,kd:1.4e-5,maxG:6,range:120000,fov:[8,3],seek:'TV',lockR:25000,nav:2.6,cone:50}),
      'Kh-31A':  Object.assign({},AGW['Kh-31AD'],{mass:610,L:4.7,range:25000,lockR:25000,burn:10}),
      'Kh-35U':  AG({mass:550,L:4.4,R:.21,col:0xd3d0c4,soft:30,hard:12,dmg:300,dv:270,burn:60,kd:1.3e-5,maxG:8,range:90000,fov:[8,3],seek:'TV',lockR:30000,nav:3.0,cone:45}),
      'Kh-35D':  AG({mass:520,L:4.4,R:.21,col:0xd3d0c4,soft:30,hard:12,dmg:300,dv:270,burn:60,kd:1.3e-5,maxG:8,range:70000,fov:[8,3],seek:'TV',lockR:30000,nav:3.0,cone:45}),
      'P-800':   AG({mass:3000,L:8.0,R:.36,col:0xe2e0d6,soft:90,hard:40,dmg:1100,dv:720,burn:40,kd:1.2e-5,maxG:12,range:120000,fov:[8,3],seek:'TV',lockR:50000,nav:3.2,cone:45}),
      'KAB-500L': {k:'lgb',mass:534,L:3.05,R:.2,kd:3.0e-5,soft:62,hard:14,col:0x6f7564,band:0xd9b23a},
      'KAB-1500L':{k:'lgb',mass:1525,L:4.6,R:.29,kd:3.0e-5,soft:100,hard:30,col:0x6f7564,band:0xd9b23a},
      'KAB-1500LG':{k:'lgb',mass:1525,L:4.6,R:.29,kd:3.0e-5,soft:90,hard:45,col:0x6f7564,band:0xd9b23a},
      'UPAB-500B':{k:'lgb',gps:1,mass:500,L:3.0,R:.2,kd:2.4e-5,soft:58,hard:14,col:0x7a7f74,band:0x2f6fb0,glide:3.0},
      'UPAB-1500B':{k:'lgb',gps:1,mass:1525,L:5.0,R:.29,kd:2.4e-5,soft:100,hard:30,col:0x7a7f74,band:0x2f6fb0,glide:3.6},
      'Grom-2':  {k:'lgb',gps:1,mass:598,L:4.2,R:.2,kd:2.0e-5,soft:60,hard:14,col:0x9a9e94,band:0x2f6fb0,glide:3.4},
      'APK-9':   {k:'tgp',mass:260,L:2.4,R:.19,col:0x8c918a}});
    AGW['Kh-31P']=Object.assign({},AGW['Kh-31PD'],{mass:600,L:4.7,dv:900,burn:10,life:150,posAct:30000});
    const NEW=['Kh-29L','Kh-29T','Kh-38MT','Kh-59MK','Kh-59MK2','Kh-31A','Kh-31P','Kh-35U','Kh-35D','P-800','KAB-500L','KAB-1500L','KAB-1500LG','UPAB-500B','UPAB-1500B','Grom-2','APK-9'];
    Object.assign(SN,{'Kh-29L':'X29L','Kh-29T':'X29T','Kh-38MT':'X38MT','Kh-59MK':'X59MK','Kh-59MK2':'X59MK2','Kh-31A':'X31A','Kh-31P':'X31P','Kh-35U':'X35U','Kh-35D':'X35D','P-800':'ONIKS',
      'KAB-500L':'KAB500L','KAB-1500L':'KAB1500L','KAB-1500LG':'KAB15LG','UPAB-500B':'UPAB500','UPAB-1500B':'UPAB1500','Grom-2':'GROM2','APK-9':'APK9'});
    Object.assign(STORE_NAME,{'Kh-29L':'Kh-29L · laser, 320 kg warhead','Kh-29T':'Kh-29T · TV, 320 kg warhead','Kh-38MT':'Kh-38MT · IIR / inertial, fire-and-forget',
      'Kh-59MK':'Kh-59MK · stand-off precision cruise (APK-9 for full range)','Kh-59MK2':'Kh-59MK2 · stand-off cruise (APK-9 for full range)',
      'Kh-31A':'Kh-31A · supersonic anti-ship, active radar','Kh-31P':'Kh-31P · anti-radiation, Mach 3.5','Kh-35U':'Kh-35U · subsonic sea-skimmer','Kh-35D':'Kh-35D · subsonic sea-skimmer',
      'P-800':'P-800 Oniks (Yakhont) · heavy supersonic cruise, centreline','KAB-500L':'KAB-500L · laser-guided, 500 kg','KAB-1500L':'KAB-1500L · laser-guided, 1,500 kg',
      'KAB-1500LG':'KAB-1500LG · laser-guided penetrator, 1,500 kg','UPAB-500B':'UPAB-500B · satellite-guided glide, 500 kg','UPAB-1500B':'UPAB-1500B · satellite-guided glide, 1,500 kg',
      'Grom-2':'Grom-2 · satellite-guided glide weapon','APK-9':'APK-9 · Kh-59 datalink pod','FAB-500':'FAB-500M-62 · 500 kg bomb','T220':'T220/E · FLIR / TV / laser targeting pod'});
    const CY={'Kh-29L':'Х-29Л','Kh-29T':'Х-29Т','Kh-38MT':'Х-38МТ','Kh-59MK':'Х-59МК','Kh-59MK2':'Х-59МК2','Kh-31A':'Х-31А','Kh-31P':'Х-31П','Kh-35U':'Х-35У','Kh-35D':'Х-35Д','P-800':'П-800',
      'KAB-500L':'КАБ-500Л','KAB-1500L':'КАБ-1500Л','KAB-1500LG':'КАБ-1500ЛГ','UPAB-500B':'УПАБ-500Б','UPAB-1500B':'УПАБ-1500Б','Grom-2':'Гром-2','APK-9':'АПК-9'};
    Object.assign(SM_ST,CY);try{Object.assign(RU_WPN,CY);}catch(e){}
    NEW.forEach(k=>{try{MODERN_ONLY.add(k);}catch(e){}});
    // Kh-59: full lock range only with the APK-9 datalink pod aboard (operator steers the seeker over the link)
    {const _lr=SNS.lockRangeFor.bind(SNS);SNS.lockRangeFor=function(u,a){let r=_lr(u,a);if(a&&(a===AGW['Kh-59MK']||a===AGW['Kh-59MK2'])&&player&&Object.values(player.load||{}).includes('APK-9'))r*=2.6;return r;};}

    // ---------------- the Su-30SM stations, rebuilt from the list (no R-74M2 / R-77M / R-37M on this jet) ----------------
    const S=STN[T30]={},put=(sts,ws)=>{for(const k of sts){S[k]=S[k]||[];for(const w of ws)if(!S[k].includes(w))S[k].push(w);}};
    const R27=['R-27R','R-27ER','R-27T','R-27ET'],R77=['R-77','R-77-1'],IR=['R-73','R-74M'];
    const ASM=['Kh-29L','Kh-29T','Kh-29TD','Kh-38MT','Kh-31P','Kh-31PD','Kh-31A','Kh-31AD','Kh-35U','Kh-35D'];
    const BMB=['FAB-250','FAB-500','OFAB-250','ZB-500','2xFAB-250','2xOFAB-250','2xFAB-500','2xZB-500'];
    const RKT=['B-8M1','B-13L','S-25O','S-25OF','S-25OFM','2xB-8M1','2xB-13L','2xS-25OF'];
    put(['1','10'],IR);
    put(['2','9'],[...IR,...R77,'OFAB-250','FAB-250']);
    put(['3','8'],[...IR,...R27,...R77,...ASM,'Kh-59MK','Kh-59MK2','KAB-500L','KAB-500Kr','UPAB-500B','Grom-2',...BMB,...RKT,'6xOFAB-250']);
    put(['11','12'],[...R27,...R77,...ASM,'Kh-59MK','Kh-59MK2','KAB-500L','KAB-500Kr','KAB-1500L','KAB-1500LG','KAB-1500Kr','UPAB-500B','UPAB-1500B','Grom-2',...BMB]);
    put(['4','7'],[...R27,...R77,...ASM,'Kh-59MK','Kh-59MK2','KAB-500L','KAB-500Kr','KAB-1500L','KAB-1500LG','KAB-1500Kr','UPAB-500B','UPAB-1500B','Grom-2',...BMB]);
    put(['5','6'],['R-27R','R-27ER',...R77]);
    put(['5'],['P-800','KAB-1500L','KAB-1500LG','KAB-1500Kr','UPAB-1500B','4xOFAB-250']);
    put(['5B','6B'],R77);
    put(['12','8'],['T220']);put(['11'],['APK-9']);
    for(const k of Object.keys(S))S[k]=S[k].filter(w=>MSL[w]||AGW[w]);
    const HEAVY=new Set(['P-800','KAB-1500L','KAB-1500LG','KAB-1500Kr','UPAB-1500B','4xOFAB-250']);
    const stM=s=>{const a=AGW[s];return a?a.mass||0:MSL[s]?MSL[s].mass||0:0;};
    {const _v=validLoad;validLoad=function(ac,era,o){const r=_v(ac,era,o);if(ac!==T30)return r;
      for(const k of Object.keys(r))if(r[k]&&S[k]&&!S[k].includes(r[k])&&!isTank(r[k]))delete r[k];
      if(HEAVY.has(r[5])){delete r[6];delete r['5B'];delete r['6B'];}
      // 14 air-to-air missiles at most, 8,000 kg payload: shed from the last stations in the release order
      const ord=['6B','5B','6','5','12','11','7','4','8','3','9','2','10','1'];
      let n=Object.values(r).filter(s=>MSL[s]).length;for(const k of ord){if(n<=14)break;if(MSL[r[k]]){delete r[k];n--;}}
      let m=Object.values(r).reduce((a,s)=>a+(isTank(s)?0:stM(s)),0);for(const k of ord){if(m<=8000)break;if(r[k]&&!isTank(r[k])){m-=stM(r[k]);delete r[k];}}
      return r;};}
    if(LOAD.modern)LOAD.modern[T30]={1:'R-73',10:'R-73',2:'R-74M',9:'R-74M',3:'R-27ET',8:'R-27ET',11:'R-77-1',12:'R-77-1',4:'R-27ER',7:'R-27ER',5:'R-77-1','5B':'R-77-1',6:'R-77-1','6B':'R-77-1'};
    STRIKE_LOAD[T30]={1:'R-73',10:'R-73',2:'R-77-1',9:'R-77-1',3:'Kh-29L',8:'Kh-29L',12:'T220',11:'KAB-500L',4:'Kh-31P',7:'Kh-31P',5:'R-77-1',6:'R-77-1'};
    ACROLE[T30]='RUSSIA · TWO-SEAT MULTIROLE · N011M BARS PESA · TVC · R-77-1 / R-27 / R-74M · Kh-29 / Kh-31 / Kh-59 / KAB · T220 · WSO';

    // ---------------- T220/E: its own pod (own key, own page) ----------------
    const PD=window.V121&&V121.PODS;
    if(PD){PD.T220=PD.T220||{};Object.assign(PD.T220,{nm:'T220/E',fovs:[6,2,.7],fn:['ШИР','СРЕД','УЗК'],tv:1,res:224,lrf:20000,lockR:20000});
      try{if(typeof POD_KEYS!=='undefined'&&!POD_KEYS.includes('T220'))POD_KEYS.unshift('T220');}catch(e){}
      // pod hangs from whichever station carries it
      {const _pp=SNS.podPos.bind(SNS);SNS.podPos=function(P){const k=P&&P.load&&Object.keys(P.load).find(k=>P.load[k]==='T220');const m=k&&P.stMesh&&P.stMesh[k];
        if(m)return P.pos.clone().add(m.position.clone().applyQuaternion(P.q)).addScaledVector(P.up(new V3()),-.3);return _pp(P);};}
      {const _nm=SNS.fovName;if(_nm)SNS.fovName=function(){if(this.podKind(player)==='T220'){const p=PD.T220;return p.fn[Math.min(this.zi,p.fn.length-1)];}return _nm.apply(this,arguments);};}
      // T220 page: Russian symbology, open-corner gate, azimuth / elevation scales, ЛД laser status
      const _sy=SNS.symbology;SNS.symbology=function(P,masked){
        if(!(P&&this.podKind(P)==='T220'&&this.wk()!=='agm'))return _sy.call(this,P,masked);
        const cvx=this.cv,c=cvx.getContext('2d'),S=320;c.clearRect(0,0,S,S);
        const e=this.eye(P),rng=e.distanceTo(this.spi),vm=this.vmodeFor(true),blink=performance.now()%700<420,col='#e9f5ec';
        c.strokeStyle=c.fillStyle=col;c.lineWidth=2;c.font='700 14px "B612 Mono",monospace';c.textBaseline='middle';
        const tx=(s,x,y,al='left')=>{c.textAlign=al;c.fillText(s,x,y);};
        if(masked){tx('ЗАТЕНЕНИЕ',S/2,S/2,'center');}
        // centre: broken cross, open-corner tracking gate
        c.beginPath();for(const [dx,dy] of[[1,0],[-1,0],[0,1],[0,-1]]){c.moveTo(S/2+dx*22,S/2+dy*22);c.lineTo(S/2+dx*60,S/2+dy*60);}c.stroke();
        c.beginPath();c.arc(S/2,S/2,2,0,7);c.fill();
        {const g=this.mode==='POINT'?16:30,l=8;if(this.coast>0)c.setLineDash([4,3]);c.beginPath();
          for(const [sx,sy] of[[-1,-1],[1,-1],[1,1],[-1,1]]){c.moveTo(S/2+sx*g,S/2+sy*(g-l));c.lineTo(S/2+sx*g,S/2+sy*g);c.lineTo(S/2+sx*(g-l),S/2+sy*g);}c.stroke();c.setLineDash([]);}
        // look angles against the gimbal
        const l=this.spi.clone().sub(e).normalize(),b=l.applyQuaternion(qInv(P.q)),baz=Math.atan2(b.x,-b.z),bel=Math.atan2(b.y,Math.hypot(b.x,b.z)),lim=this.lim();
        c.lineWidth=1.5;c.beginPath();c.moveTo(60,S-26);c.lineTo(S-60,S-26);for(let i=-4;i<=4;i++){const x=S/2+i*25;c.moveTo(x,S-26);c.lineTo(x,S-(i%2?31:35));}
        c.moveTo(S-22,60);c.lineTo(S-22,S-60);for(let i=-4;i<=4;i++){const y=S/2+i*25;c.moveTo(S-22,y);c.lineTo(S-(i%2?27:31),y);}c.stroke();
        {const ax=S/2+clamp(baz/lim,-1,1)*100,ey=S/2-clamp(bel/(lim*.75),-1,1)*100;c.beginPath();c.moveTo(ax,S-22);c.lineTo(ax-5,S-14);c.lineTo(ax+5,S-14);c.closePath();c.fill();
          c.beginPath();c.moveTo(S-18,ey);c.lineTo(S-10,ey-5);c.lineTo(S-10,ey+5);c.closePath();c.fill();}
        c.lineWidth=2;
        tx('Т220',10,16);tx(vm==='TV'?'ТВ':'ТПВ '+(vm==='WHOT'?'БГ':'ЧГ'),10,34);
        tx(this.fovName(true),S-36,16,'right');tx(this.coast>0?'ПАМЯТЬ':this.mode==='POINT'?'СОПР':this.mode==='AREA'?'ОБЛ':'ВИЗ',S-36,34,'right');
        const lsr=this.lase?(blink?'ЛД ИЗЛ':''):(this.laseMan?'ЛД ГОТОВ':'ЛД ВЫКЛ');if(lsr)tx(lsr,S-36,52,'right');tx('КОД '+LCODES[this.codeI],S-36,70,'right');
        tx('Д '+(rng/1000).toFixed(1)+' КМ',S/2,S-46,'center');
        tx((SM_ST[game.wsel]||SN[game.wsel]||'')+' '+(game.wsel?P.count(game.wsel):''),10,S-46);
        const sp=this.spi;c.font='700 11px "B612 Mono",monospace';tx('Н '+Math.round(sp.y)+' М',10,S-64);tx('А '+Math.round(baz*R2D)+'°  У '+Math.round(bel*R2D)+'°',10,S-80);
        const fb=GND.bombs.find(x=>x.w.k==='lgb');if(fb){const h=fb.p.y-groundAt(fb.p.x,fb.p.z);c.font='700 14px "B612 Mono",monospace';tx('ВР '+Math.max(0,h/Math.max(-fb.v.y,1)).toFixed(0),S-36,88,'right');}
        if(this.glim>0&&blink){c.font='700 14px "B612 Mono",monospace';tx('ОГР УГЛА',S/2,S/2+52,'center');}
        if(this.unit&&this.mode==='POINT'){const u=this.unit,v=Math.hypot(u.vel.x,u.vel.z);if(v>.5){c.font='700 12px "B612 Mono",monospace';tx(Math.round(v*3.6)+' КМ/Ч',S/2,S/2+40,'center');}}};}

    // ---------------- cockpit: Su-30SM front seat ----------------
    const o=ck&&ck.fulcrum;
    if(o&&o.smOnly&&o.smOnly[0]){const sm=o.smOnly[0],root=o.root,G=new THREE.Group();G.visible=false;sm.add(G);
      const W=new THREE.Group();W.visible=false;root.add(W);
      const Lm=c=>new THREE.MeshPhongMaterial({color:c,shininess:30});
      const box=(par,w,h,d,m,x,y,z,rx=0,ry=0,rz=0)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);b.rotation.set(rx,ry,rz);par.add(b);return b;};
      const cv=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
      const live=[],texOf=(c,dyn)=>{const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;if(dyn)live.push(t);return t;};
      const quad=(par,c,w,h,x,y,z,dyn)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texOf(c,dyn),toneMapped:false}));m.position.set(x,y,z);par.add(m);return m;};
      const blk=Lm(0x15181a),dk=Lm(0x24292b),teal=Lm(0x3f8f99),osb=Lm(0x454c4f);
      // UFCP under the HUD: five round mode keys, the display (mirrors the centre MFI page), 3×5 keypad
      // v214: raise the HUD unit 4 cm in this jet (combiner glass, its clip window, posts, body) and hang the UFCP from it on a pedestal
      const HUDUP=.03,hudM=[];root.children.forEach(m=>{const p=m.position;if(Math.abs(p.x)<.14&&((Math.abs(p.y+.188)<.002&&p.z<-.6&&p.z>-.68)||(Math.abs(p.y+.075)<.002&&Math.abs(p.z+.6)<.002)||(Math.abs(p.y+.06)<.002&&(Math.abs(p.z+.6)<.002||Math.abs(p.z+.615)<.002))))hudM.push([m,p.y]);});
      box(W,.27,.075,.08,Lm(0x7a8c97),0,-.212,-.70);
      // v210: the UFCP is part of the HUD assembly: mounted straight under the HUD body, tilted up to the pilot's eye, inside the default view (it used to sit on the instrument panel, below the glare shield)
      const uf=new THREE.Group();uf.position.set(0,-.2735,-.64);uf.rotation.x=-.375;uf.scale.set(1.3,1.05,1.05);W.add(uf);
      box(uf,.2,.16,.05,blk,0,0,0);
      const ufc=cv(320,256);const ufm=quad(uf,ufc,.19,.152,0,0,.0255,true);
      // centre standby cluster: ADI with ASI / altimeter / VVI column (covers the small centre MFI; its page now lives on the UFCP)
      // v208: the cluster drops below the screens so the centre MFI can return as a full third MFD (Su-30SM: three MFI-55 in a row)
      const CL=new THREE.Group();CL.position.set(0,-.185,0);CL.scale.setScalar(.9);G.add(CL);
      box(CL,.15,.17,.012,Lm(0x3b8a93),0,.04,.036);
      const gcv=[],gg=(x,y,r,draw)=>{const ring=new THREE.Mesh(new THREE.CylinderGeometry(r+.006,r+.006,.012,28),blk);ring.rotation.x=Math.PI/2;ring.position.set(x,y,.044);CL.add(ring);
        const c=cv(160,160);const f=new THREE.Mesh(new THREE.CircleGeometry(r,32),new THREE.MeshBasicMaterial({map:texOf(c,true),toneMapped:false}));f.position.set(x,y,.0505);CL.add(f);gcv.push({cv:c,draw});};
      // centre MFD 'M': same page set and OSB layout as the outboard pair (7 top / 7 bottom, 5 per side)
      // v211: the three MFDs come out of one builder (same rounded bezel, buttons, screen), evenly spaced. The Su-27SM's own L / R models are hidden in this jet.
      const MW=.17,MH=.17,MY=.045,mcv=cv(400,400);window.SMG=window.SMG||{};SMG.M={nT:7,nS:5,w:MW,h:MH,cw:400,ch:400};
      const bezM=new THREE.MeshPhongMaterial({color:0x1b1e20,shininess:6,specular:0x1c1c1c}),osbM=new THREE.MeshPhongMaterial({color:0x4a5154,shininess:6,specular:0x1c1c1c});
      const mfdBuild=(key,MX,canvas)=>{const bz=new THREE.Mesh(sbox(MW+.05,MH+.05,.022),bezM);bz.position.set(MX,MY,.02);G.add(bz);quad(G,canvas,MW,MH,MX,MY,.0322,true);
        const btn=(bx,by,bw,bh,sd,i)=>{const m=new THREE.Mesh(sbox(bw,bh,.008),osbM);m.position.set(bx,by,.033);G.add(m);
          const def={meshes:[m],name:'MFI '+key+' · '+sd+(i+1),state:()=>{try{return S30F.label(key,sd,i)||'—';}catch(e){return'';}},act:()=>{try{S30F.press(key,sd,i);}catch(e){console.warn(e);}sfx.click();}};m.userData.ctl=def;(o.ctls||[]).push(def);};
        for(let i=0;i<7;i++){const ox=(i-3)*(MW/7)*.95;btn(MX+ox,MY+MH/2+.015,.014,.009,'T',i);btn(MX+ox,MY-MH/2-.015,.014,.009,'B',i);}
        for(let i=0;i<5;i++){const oy=(i-2)*(MH/5)*.95;btn(MX-MW/2-.015,MY+oy,.009,.014,'L',i);btn(MX+MW/2+.015,MY+oy,.009,.014,'R',i);}};
      mfdBuild('L',-.30,o.smCv.L);mfdBuild('M',-.065,mcv);mfdBuild('R',.30,o.smCv.R);
      const oldLR=[];sm.children.forEach(m=>{if(m===G)return;const p=m.position;for(const cx of[-.385,.30])if(Math.abs(p.x-cx)<.115&&Math.abs(p.y-.055)<.115)oldLR.push(m);});
      // UFCP keys made clickable (they replace the old small centre MFI push-buttons)
      const ukey=(x,y,w,h,name,a)=>{const m=box(uf,w,h,.006,osb,x,y,.03);m.material=m.material.clone();m.material.transparent=true;m.material.opacity=0;const def={meshes:[m],name:'UFCP · '+name,state:()=>name,act:()=>{try{a();}catch(e){console.warn(e);}sfx.click();}};m.userData.ctl=def;(o.ctls||[]).push(def);};
      const cpress=n=>{const t={NAV:['T',0],'A/A':['T',1],'A/G':['T',2],HUD:['T',3],DEST:['B',0],TVC:['B',1],ESC:['B',2],COM:['B',3],CLR:['L',3]}[n];if(t)S30F.press('C',t[0],t[1]);};
      ['COM','IFF','NAV','A/A','A/G'].forEach((n,i)=>ukey((36+i*62-160)/320*.19,(128-22)/256*.152,.022,.018,n==='COM'?'WSO':n,()=>cpress(n)));
      ['1','2','3','DEST','HUD','4','5','6','TVC','ESC','7','8','9','0','CLR'].forEach((n,k)=>{const r=k/5|0,q=k%5;if(!['DEST','HUD','TVC','ESC','CLR'].includes(n))return;ukey((45+q*58-160)/320*.19,(128-(160+r*36))/256*.152,.026,.016,n,()=>cpress(n));});
      const oldC=[];o.smOnly[0].traverse(m=>{const u=m.userData||{};if(u.screen==='smC'||(u.ctl&&/^MFI C/.test(u.ctl.name||'')))oldC.push(m);});
      gg(.025,.06,.036,'adi');gg(-.045,.105,.02,'ias');gg(-.045,.055,.02,'alt');gg(-.045,.005,.02,'vvi');gg(.025,-.01,.02,'n1');
      // left console box (PU-weapons control block on the left side panel)
      {const lb=new THREE.Group();lb.position.set(-.53,-.04,.03);lb.rotation.y=.35;G.add(lb);box(lb,.12,.1,.06,dk,0,0,0);
        const c=cv(192,160),g=c.getContext('2d');g.fillStyle='#24292b';g.fillRect(0,0,192,160);g.fillStyle='#d8dcd6';g.font='700 15px sans-serif';g.textAlign='center';
        g.fillText('УПРАВЛЕНИЕ ОРУЖИЕМ',96,18);for(let r=0;r<3;r++)for(let q=0;q<4;q++){g.fillStyle=r===0?'#5a2a24':'#3a4044';g.fillRect(14+q*44,34+r*40,34,26);g.fillStyle='#cfd3cf';g.font='700 11px sans-serif';g.fillText(['ПУСК','СБРОС','АВАР','ПРЦ','ЗАЛП','ОЧЕР','1','2','БЛК','ВЗР','НВЗ','СТВ'][r*4+q],31+q*44,51+r*40);}
        quad(lb,c,.115,.095,0,0,.031,false);}
      // canopy bow: wider black frame with three rear-view mirrors (top centre, both sides), as on the Su-30SM
      {const fr=Lm(0x101214),mir=new THREE.MeshPhongMaterial({color:0xdfe6ec,shininess:140,specular:0xffffff});
        const mc=cv(128,32),mg=mc.getContext('2d'),gr=mg.createLinearGradient(0,0,0,32);gr.addColorStop(0,'#cfe2f2');gr.addColorStop(.55,'#eef3f6');gr.addColorStop(1,'#9fb3c0');mg.fillStyle=gr;mg.fillRect(0,0,128,32);
        const mt=texOf(mc,false);mir.map=mt;
        const bow=new THREE.Group();bow.position.set(0,-.3,-.6);bow.rotation.x=.15;bow.scale.set(1.28,1,1);W.add(bow);
        const t=new THREE.Mesh(new THREE.TorusGeometry(.52,.026,8,56,Math.PI),fr);bow.add(t);
        const mirror=(x,y,z,w,h,rz,ry)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.set(0,ry,rz);W.add(g);box(g,w+.014,h+.014,.012,fr,0,0,0);
          const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mir);p.position.z=.0065;g.add(p);box(g,.012,.02,.03,fr,0,-h/2-.008,-.02);return g;};
        mirror(0,.19,-.5,.21,.05,0,0);mirror(-.36,.02,-.48,.19,.045,.84,.35);mirror(.36,.02,-.48,.19,.045,-.84,-.35);}
      // frame tick: UFCP display, standby gauges
      let n=0;o.anims.push(()=>{if(!G.visible||!player)return;if(n++&1)return;const P=player;
        try{_smGauges({G:gcv});}catch(e){}
        try{S30F.screen('M',mcv);}catch(e){}
        const g=ufc.getContext('2d');g.fillStyle='#16191b';g.fillRect(0,0,320,256);
        for(let i=0;i<5;i++){g.fillStyle='#2c3236';g.beginPath();g.arc(36+i*62,22,15,0,7);g.fill();g.strokeStyle='#59605f';g.lineWidth=2;g.stroke();g.fillStyle='#d8dcd6';g.font='700 10px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(['COM','IFF','NAV','A/A','A/G'][i],36+i*62,22);}
        g.fillStyle='#020604';g.fillRect(14,44,292,92);
        try{const C=o.smCv&&o.smCv.C;if(C)g.drawImage(C,0,C.height*.12,C.width,C.height*.5,16,46,288,88);}catch(e){}
        for(let r=0;r<3;r++)for(let q=0;q<5;q++){const x=22+q*58,y=146+r*36;g.fillStyle='#2a3034';g.fillRect(x,y,46,28);g.fillStyle='#d8dcd6';g.font='700 13px sans-serif';g.fillText(['1','2','3','DEST','HUD','4','5','6','TVC','ESC','7','8','9','0','CLR'][r*5+q],x+23,y+14);}
        for(const t of live)t.needsUpdate=true;});
      // show only in the Su-30SM
      {const _sc=selectCockpit;selectCockpit=function(kind,pit){const r=_sc.apply(this,arguments);try{const on=kind==='fulcrum'&&!!player&&player.type===T30;G.visible=on;W.visible=on;for(const m of oldC)m.visible=!on;for(const m of oldLR)m.visible=!on;for(const[m,y]of hudM)m.position.y=y+(on?HUDUP:0);try{const g=ck.fulcrum;g.glass=on?g.glass0.map(p=>p.clone().add(new V3(0,HUDUP,0))):g.glass0;}catch(e){}}catch(e){}return r;};}
    }
    }catch(e){console.warn('v207 Su-30SM',e);}
  },
  /* game.js line 14206 */
  L14206(){
    // ---------- the Flanker glass-cockpit family: Su-27SM, Su-30SM and now the Su-35S and Su-30MK2 ----------
    {const _smx=SMX,FAM=new Set(['Su-35S','Su-30MK2']);SMX=function(t){return FAM.has(t)||_smx(t);};}
    // Su-35S 'Flanker-E': two AL-41F1S (izd. 117S, 86.3 kN dry / 142.2 kN reheat), empty 19,000 kg, 11,500 kg internal fuel, no canards, N035 Irbis-E PESA on a
    // two-axis drive (±60° electronic, ±120° with the mechanical turn; 350-400 km against a 3 m² target in a narrow sector search, ~200 km in a normal volume),
    // 30 track files / 8 engaged, OLS-35 (about 90 km tail-on, 35 km head-on, 20 km laser), L-150-35, 12 hardpoints.
    try{
      const S30=AC['Su-30SM'],B=AC['Su-27SM'];
      cloneType('Su-27SM','Su-35S',{name:'Su-35S',tvc:{pitch:15,yaw:15},empty:19000,fuel:11500,dW:27500,mil:172600,ab:284400,S:62,CLa:4.6,cd0:.0188,k:.118,gLim:9,aoaLim:28,fbw:true,rcs:3,irs:1.4,
        dep:{a:42,rock:.4,spin:1.7},ols:{tail:90000,head:35000,lrf:20000},irst:true,twsN:4,trkN:30,ff:[.35,2.9,13.4],
        radar:Object.assign({},B.radar,{name:'Irbis-E',R0:110*NM,ranges:[10,25,50,100,200,400],unit:1000,ul:'KM',ecc:.85,pesa:1,beam:2.5*D2R}),rel:B.rel.slice(),migRel:B.migRel?B.migRel.slice():undefined});
      RGIM['Irbis-E']=[120,60,60,1];
      if(S30&&STN['Su-30SM']){STN['Su-35S']={};for(const k of Object.keys(STN['Su-30SM']))STN['Su-35S'][k]=STN['Su-30SM'][k].filter(w=>w!=='T220');}
      if(MSL['R-77-1']&&LOAD.modern)LOAD.modern['Su-35S']={1:'R-74M',10:'R-74M',2:'R-74M',9:'R-74M',3:'R-77-1',8:'R-77-1',11:'R-77M',12:'R-77M',4:'R-37M',7:'R-37M',5:'R-77-1',6:'R-77-1'};
      for(const era of Object.keys(CMS))CMS[era]['Su-35S']=[96,96];
      ENGN['Su-35S']='2× AL-41F1S (117S)';IRSTN['Su-35S']='OLS-35';ENG_SUP['Su-35S']=.05;CALLS['Su-35S']='FLANKER-E';NCTR_ID['Su-35S']='SU-35';FOE['Su-35S']='F-15C';RWR_OF['Su-35S']='L-150';
      ACROLE['Su-35S']='RUSSIA · AIR SUPERIORITY · 3D THRUST VECTORING · IRBIS-E PESA · OLS-35 · R-77M / R-37M';HMS_ALWAYS.add('Su-35S');
      // v257: R-77M and R-37M were in the loadout tables but missing from the pylon lists, so they could not be picked on the stations
      {const addW=(id,sts,ws)=>{const S=STN[id];if(!S)return;for(const k of sts){S[k]=S[k]||[];for(const w of ws)if(MSL[w]&&!S[k].includes(w))S[k].push(w);}};
       for(const id of['Su-30SM','Su-35S']){addW(id,['2','9','3','8','11','12','5','6','5B','6B'],['R-77M']);addW(id,['4','7'],['R-77M','R-37M']);addW(id,['5','6'],['R-37M']);}
       addW('MiG-31',['2','3'],['R-77M']);}
      try{CTYPES.modern[1].CAP.unshift('Su-35S');CTYPES.modern[1].ESC.unshift('Su-35S');}catch(e){}
    }catch(e){console.warn('v215 Su-35S',e);}
    // Su-30MK2 (KnAAZ two-seater: no canards, no thrust vectoring): two AL-31F, empty 17,700 kg, 9,400 kg internal fuel, N001VEP (two-target R-77 TWS, sea and
    // ground modes), OLS-27, L-150 (the РЭП-СПО pages in the folder are this jet's), Kh-31A / P, Kh-29, KAB-500Kr / 1500Kr. The operator in the back seat runs the radar.
    try{
      const B=AC['Su-27SM'];cloneType('Su-27SM','Su-30MK2',{name:'Su-30MK2',empty:17700,fuel:9400,dW:25000,gLim:8.5,aoaLim:26,rcs:13,irs:1.42,rio:true,wso:true,twsN:2,
        radar:Object.assign({},B.radar,{name:'N001VEP',R0:58*NM,ecc:.62}),rel:B.rel.slice(),migRel:B.migRel?B.migRel.slice():undefined});
      RGIM['N001VEP']=RGIM['N001'];ENGN['Su-30MK2']='2× AL-31F';CALLS['Su-30MK2']='FLANKER-G';NCTR_ID['Su-30MK2']='SU-30';RWR_OF['Su-30MK2']='L-150';HMS_ALWAYS.add('Su-30MK2');
      ACROLE['Su-30MK2']='RUSSIA · TWO-SEAT MULTIROLE · N001VEP · Kh-31 / Kh-29 / KAB · OPERATOR';
    }catch(e){console.warn('v215 Su-30MK2',e);}
  },
  /* game.js line 14262 */
  L14262(){
    /* ===== v216: cockpits for the v215 jets, from the reference folder =====
       Su-35S  — instrument board after the Su-35 cockpit diagrams (S3-A-31-11): two landscape МФИ-35 side by side filling the board, the ПУИ-35 keyboard /
                 display unit under the КАИ-35 HUD, a small standby flight display top right; no round gauges. Each МФИ-35 shows an Su-27SM-family
                 page in its main window plus a data column (flight / target on the left screen, fuel / engines / stores on the right).
       Su-30MK2 — front board after the flight manual (РЛЭ Су-30МК2, Приложение 1, "Доска приборов 1 кабина"): two МФИ-10-5 with an analogue centre column
                 between them (airspeed, altimeter, УАП on the left; КПП attitude indicator over the ПНП course indicator), the ДОЗАПРАВКА panel under it,
                 clock / variometer bottom left, two ИТ temperature gauges and the twin-needle ИТЭ tachometer bottom right, the 23-02-01 lamp block top right.
       F-14D   — digital HUD (airspeed / altitude boxes, heading tape, Mach, g, AoA, velocity vector) on a framed combiner, and three MFDs: MFD 1 in place
                 of the VDI, MFD 2 in place of the HSD, MFD 3 on the right; each can show VDI / HSD / SMS / ENG from its bottom push-buttons. ===== */
    try{
    const o=ck.fulcrum,sm=o.smOnly[0],root=o.root,isT=t=>!!player&&player.type===t;
    const Lm=(c,s=18)=>new THREE.MeshPhongMaterial({color:c,shininess:s}),cvs=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
    const live=[],texOf=c=>{const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;live.push(t);return t;};
    const quad=(par,c,w,h,x,y,z,geo)=>{const m=new THREE.Mesh(geo||new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texOf(c),toneMapped:false}));m.position.set(x,y,z);par.add(m);return m;};
    const box=(par,w,h,d,m,x,y,z)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);par.add(b);return b;};
    const mkCtl=(O,m,name,state,act)=>{const def={meshes:[m],name,state,act:()=>{try{act();}catch(e){console.warn(e);}sfx.click();}};m.userData.ctl=def;(O.ctls||[]).push(def);};
    const T=(c,s,x,y,col,sz,al)=>{c.fillStyle=col||'#d8f0e0';c.font='700 '+(sz||15)+'px "B612 Mono",monospace';c.textAlign=al||'center';c.textBaseline='middle';c.fillText(s,x,y);};
    const blk=Lm(0x15181a),bez=Lm(0x1b1e20,6),osb=Lm(0x4a5154,6),teal=Lm(0x3b8a93);
    // the Su-27SM board's own parts, sorted by where they sit, so a variant can switch them off
    const old={L:[],R:[],C:[],G:[],K:[],H:[]};
    sm.children.forEach(m=>{if(!m.isMesh)return;const p=m.position;if(p.x===0&&p.y===0&&p.z===0)return;
      if(Math.abs(p.x+.385)<.115&&Math.abs(p.y-.055)<.115)old.L.push(m);else if(Math.abs(p.x-.30)<.115&&Math.abs(p.y-.055)<.115)old.R.push(m);
      else if(Math.abs(p.x)<.09&&Math.abs(p.y-.045)<.1)old.C.push(m);else if(Math.abs(p.y+.135)<.02)old.G.push(m);
      else if(Math.abs(p.x+.46)<.03&&Math.abs(p.y-.193)<.03)old.K.push(m);else if(Math.abs(p.x)<.11&&Math.abs(p.y-.2)<.03)old.H.push(m);});
    const HUDUP=.03,hudM=[];root.children.forEach(m=>{const p=m.position;if(Math.abs(p.x)<.14&&((Math.abs(p.y+.188)<.002&&p.z<-.6&&p.z>-.68)||(Math.abs(p.y+.075)<.002&&Math.abs(p.z+.6)<.002)||(Math.abs(p.y+.06)<.002&&(Math.abs(p.z+.6)<.002||Math.abs(p.z+.615)<.002))))hudM.push([m,p.y]);});
    // round instruments shared by the two boards
    const gauges=(par,list)=>(x,y,r,draw)=>{const ring=new THREE.Mesh(new THREE.CylinderGeometry(r+.005,r+.005,.014,28),blk);ring.rotation.x=Math.PI/2;ring.position.set(x,y,.024);par.add(ring);
      const c=cvs(160,160);quad(par,c,0,0,x,y,.0315,new THREE.CircleGeometry(r,32));list.push({cv:c,draw});};
    function drawG(list){const P=player;for(const g of list){const c=g.cv.getContext('2d'),S=160,r=74;c.setTransform(1,0,0,1,0,0);c.fillStyle='#0d0f10';c.fillRect(0,0,S,S);c.translate(S/2,S/2);
      const tick=(a0,a1,n)=>{c.strokeStyle='#e6e8e2';c.lineWidth=2;for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n-90)*D2R;c.beginPath();c.moveTo(Math.cos(a)*r*.82,Math.sin(a)*r*.82);c.lineTo(Math.cos(a)*r*.96,Math.sin(a)*r*.96);c.stroke();}};
      const ndl=(deg,len,col,w)=>{const a=(deg-90)*D2R;c.strokeStyle=col||'#fff';c.lineWidth=w||4;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*r*len,Math.sin(a)*r*len);c.stroke();};
      const d=g.draw,n=clamp((P.n||0)/1.1,0,1);
      if(d==='adi'){c.save();c.beginPath();c.arc(0,0,r,0,7);c.clip();c.rotate(-(P.bank||0));const po=(P.pitch||0)*R2D*2;c.fillStyle='#4f86b8';c.fillRect(-90,-180+po,180,180);c.fillStyle='#6b4a2a';c.fillRect(-90,po,180,180);
        c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(-90,po);c.lineTo(90,po);for(let q=-30;q<=30;q+=10){if(!q)continue;c.moveTo(-18,po-q*2);c.lineTo(18,po-q*2);}c.stroke();c.restore();
        c.strokeStyle='#ffd23a';c.lineWidth=5;c.beginPath();c.moveTo(-46,0);c.lineTo(-14,0);c.lineTo(-14,8);c.moveTo(46,0);c.lineTo(14,0);c.lineTo(14,8);c.stroke();tick(-60,60,8);}
      else if(d==='hsi'){c.save();c.rotate(-(P.hdg||0)*D2R);c.strokeStyle='#e6e8e2';c.lineWidth=2;for(let i=0;i<36;i++){const a=i*10*D2R,l=i%3?.9:.82;c.beginPath();c.moveTo(Math.sin(a)*r*l,-Math.cos(a)*r*l);c.lineTo(Math.sin(a)*r*.98,-Math.cos(a)*r*.98);c.stroke();}
        ['С','В','Ю','З'].forEach((s,i)=>{c.save();c.rotate(i*Math.PI/2);T(c,s,0,-r*.64,'#fff',20);c.restore();});[3,6,12,15,21,24,30,33].forEach(v=>{c.save();c.rotate(v*10*D2R);T(c,String(v),0,-r*.66,'#cfd3cf',14);c.restore();});c.restore();
        c.fillStyle='#ffd23a';c.beginPath();c.moveTo(0,-r);c.lineTo(-7,-r+14);c.lineTo(7,-r+14);c.closePath();c.fill();c.strokeStyle='#ffd23a';c.lineWidth=3;c.beginPath();c.moveTo(0,-22);c.lineTo(0,22);c.moveTo(-16,2);c.lineTo(16,2);c.moveTo(-7,18);c.lineTo(7,18);c.stroke();}
      else if(d==='ias'){tick(-150,150,10);ndl(-150+300*clamp((P.cas||0)*1.852/1600,0,1),.8);T(c,'КМ/Ч',0,40,'#bfc4bc',13);T(c,'М '+(P.mach||0).toFixed(2),0,-34,'#fff',14);}
      else if(d==='alt'){tick(0,324,10);ndl(360*((P.pos.y%1000)/1000),.85);ndl(360*((P.pos.y/20000)%1),.55,'#e8c040');T(c,(P.pos.y/1000).toFixed(1),0,38,'#fff',16);}
      else if(d==='vvi'){tick(-170,-10,8);tick(10,170,8);ndl(-90+clamp((P.vel?P.vel.y:0)/150,-1,1)*80,.8);T(c,'М/С',18,0,'#bfc4bc',12);}
      else if(d==='aoa'){tick(-140,-20,6);tick(20,140,5);ndl(-140+120*clamp(((P.alpha||0)*R2D+5)/40,0,1),.8);ndl(140-120*clamp(((P.nz||1)+2)/11,0,1),.8,'#e8c040');T(c,'α',-30,34,'#bfc4bc',15);T(c,'Ny',30,34,'#bfc4bc',13);}
      else if(d==='clk'){const t=new Date();tick(0,330,11);ndl(360*((t.getHours()%12)+t.getMinutes()/60)/12,.5);ndl(360*t.getMinutes()/60,.8,'#fff',3);}
      else if(d==='egt'){tick(-135,135,9);ndl(-135+270*clamp(.25+n*.55+(P.ab||0)*.15,0,1),.8);T(c,'°C',0,38,'#bfc4bc',13);}
      else if(d==='rpm'){tick(-135,135,11);ndl(-135+270*n,.82);ndl(-135+270*n*.985,.6,'#e8c040');T(c,'% ОБ',0,38,'#bfc4bc',12);T(c,String(Math.round(n*110)),0,-32,'#fff',14);}
      c.setTransform(1,0,0,1,0,0);}}

    // ---------------- Su-35S ----------------
    const G35=new THREE.Group();G35.visible=false;sm.add(G35);const W35=new THREE.Group();W35.visible=false;root.add(W35);
    // v224: the two МФИ-35 (screens, 40 keys each) are built by the МФИ page engine further down
    // v226: board after S3-A-31-11 Рис. 1 (Приборная доска) and the cockpit photos. Top strip: Щиток левый верхний (СМОТРИ ОТКАЗ lamp, РЛС ИЗЛ /
    // ФАРЫ ПОСАДКА toggles, guarded ГЛАВН ВКЛ, red ПК+ОГНЕТУШ ЛЕВ ДВИГ), standby display with the lamp column (Щиток правый верхний) and
    // ПК+ОГНЕТУШ ПРАВ ДВИГ on the right; bottom left the ШАССИ ВЫПУЩ lamp and the gear handle; Щиток нижний (ДОЗАПРАВКА) hangs under the screens.
    const pnl35=Lm(0x6f8f9e,10);box(G35,1.0,.44,.012,pnl35,0,0,.012);
    const cnv=(w,h,x,y,W,H,draw,dyn,par)=>{const c=cvs(W,H);const m=quad(par||G35,c,w,h,x,y,.0212);if(!dyn)m.material.map.needsUpdate=true;draw&&draw(c.getContext('2d'),W,H);return{c,m,draw};};
    const dyn35=[];
    const tog=(g,x,y,up,lbl,lbl2)=>{g.fillStyle='#c8ccc8';g.beginPath();g.arc(x,y,9,0,7);g.fill();g.fillStyle='#e8d23a';g.beginPath();g.arc(x,y+(up?-16:16),6,0,7);g.fill();g.strokeStyle='#d8dcd8';g.lineWidth=4;g.beginPath();g.moveTo(x,y);g.lineTo(x,y+(up?-14:14));g.stroke();if(lbl)T(g,lbl,x,y-34,'#f0f2ee',11);if(lbl2)T(g,lbl2,x,y+34,'#f0f2ee',10);};
    const redBtn=(g,x,y,s,l1,l2)=>{g.fillStyle='#c41e1e';g.fillRect(x-s/2,y-s/2,s,s);g.fillStyle='#8a1010';for(const a of[-1,1])for(const b of[-1,1])g.fillRect(x+a*s*.22-s*.17,y+b*s*.22-s*.17,s*.34,s*.34);g.fillStyle='#1c2226';g.fillRect(x-s*.9,y+s*.62,s*1.8,s*.62);T(g,l1,x,y+s*.78,'#f0f2ee',9);T(g,l2,x,y+s*1.05,'#f0f2ee',9);};
    // Щиток левый верхний
    dyn35.push(cnv(.2,.09,-.31,.165,400,180,(g,W,H)=>{const P=player,t=performance.now();g.fillStyle='#6f8f9e';g.fillRect(0,0,W,H);
      const mc=P&&(P.hp<60||P.totalFuel<P.ac.fuel*.15||(sys.mig&&sys.mig.lamp>performance.now()/1000));g.fillStyle=mc&&t%600<350?'#ffb21a':'#3a3010';g.fillRect(16,60,58,40);T(g,'СМОТРИ',45,72,mc?'#201000':'#8a7a40',10);T(g,'ОТКАЗ',45,88,mc?'#201000':'#8a7a40',10);
      tog(g,120,90,radar.power==='ON','РЛС','ИЗЛ');tog(g,180,90,true,'ФАРЫ','ПОСАДКА');
      g.fillStyle='#202020';g.fillRect(222,20,40,60);for(let i=0;i<6;i++){g.fillStyle=i%2?'#e8c020':'#1a1a1a';g.beginPath();g.moveTo(222,26+i*10);g.lineTo(262,16+i*10);g.lineTo(262,24+i*10);g.lineTo(222,34+i*10);g.fill();}T(g,'ГЛАВН',242,8,'#f0f2ee',10);T(g,'ВКЛ',242,96,'#f0f2ee',10);
      g.fillStyle='#1c2226';g.fillRect(278,120,110,50);T(g,'ПК+ОГНЕТУШ',333,134,'#f0f2ee',10);T(g,'ЛЕВ ДВИГ',333,154,'#f0f2ee',10);redBtn(g,340,62,60,'','');}));
    // Щиток правый верхний: standby display (МФИ репер) and the lamp column
    {box(G35,.11,.105,.02,bez,.29,.165,.02);const m=quad(G35,o.smCv.C,.092,.088,.29,.165,.0312);m.material.map=texOf(o.smCv.C);}
    dyn35.push(cnv(.05,.1,.385,.165,100,200,(g,W,H)=>{const P=player;g.fillStyle='#6f8f9e';g.fillRect(0,0,W,H);
      [['ПОЖАР',P&&P.fire>0],['ГИДРО',P&&P.hp<35],['ОТКАЗ',P&&P.hp<50],['ВЫХОД',false],['ОПАСН ВЫСОТА',P&&P.pos.y-groundAt(P.pos.x,P.pos.z)<150&&!P.onGround]].forEach(([s,on],i)=>{g.fillStyle=on?'#ff3a2a':'#4a1410';g.fillRect(14,6+i*38,72,32);T(g,s.split(' ')[0],50,16+i*38,on?'#fff':'#c8a8a0',9);if(s.includes(' '))T(g,s.split(' ')[1],50,30+i*38,on?'#fff':'#c8a8a0',9);});}));
    dyn35.push(cnv(.07,.06,.45,.17,140,120,(g)=>{g.fillStyle='#6f8f9e';g.fillRect(0,0,140,120);redBtn(g,70,40,52,'','');g.fillStyle='#1c2226';g.fillRect(10,80,120,36);T(g,'ПК+ОГНЕТУШ',70,90,'#f0f2ee',10);T(g,'ПРАВ ДВИГ',70,106,'#f0f2ee',10);}));
    // ШАССИ ВЫПУЩ lamp and the gear handle, bottom left of the board
    dyn35.push(cnv(.07,.16,-.46,-.12,140,320,(g,W,H)=>{const P=player,dn=P&&((sys.mig&&sys.mig.gear)||P.gearPos>.5);g.fillStyle='#6f8f9e';g.fillRect(0,0,W,H);
      T(g,'УБРАНО',70,22,'#f0f2ee',12);g.fillStyle='#2a2f31';g.fillRect(58,34,24,180);g.fillStyle='#d8d8d0';const hy=dn?180:60;g.fillRect(50,hy-30,40,60);g.fillStyle='#9aa0a0';for(let i=0;i<5;i++)g.fillRect(50,hy-26+i*12,40,4);T(g,'ВЫПУЩЕНО',70,228,'#f0f2ee',11);
      g.fillStyle=dn?'#46ff6a':'#123a1a';g.fillRect(24,256,92,48);T(g,'ШАССИ',70,272,dn?'#062010':'#3a7a4a',13);T(g,'ВЫПУЩ',70,290,dn?'#062010':'#3a7a4a',13);}));
    // Щиток нижний (ДОЗАПРАВКА) under the screens
    const LS=new THREE.Group();LS.position.set(0,0,.05);G35.add(LS);box(LS,.23,.085,.05,pnl35,0,-.255,-.005);
    dyn35.push(cnv(.22,.075,0,-.255,440,150,(g)=>{g.fillStyle='#6f8f9e';g.fillRect(0,0,440,150);g.strokeStyle='#4a6270';g.strokeRect(2,2,436,146);g.fillStyle='#4a6270';g.fillRect(118,0,2,150);
      T(g,'ТРИММЕР РН',58,18,'#f0f2ee',11);tog(g,58,52,true);T(g,'БЛИЖН  ДАЛЬН',58,110,'#f0f2ee',10);
      T(g,'ДОЗАПРАВКА',280,16,'#f0f2ee',15);[['ШТАНГА',170,player&&player.arOpen],['ФАРЫ',240,false],['КРАНЫ',310,false],['ШТАНГА АВАР',385,false]].forEach(([s,x,on])=>{tog(g,x,80,!!on);T(g,s.split(' ')[0],x,42,'#f0f2ee',10);if(s.includes(' '))T(g,'АВАР',x,124,'#f0f2ee',10);});},false,LS));
    // ПУИ-35 under the КАИ-35: display, mode keys НАВ Р/С ГО В-В В-П on top, ПЗК…КОР keypad, Ф ТВ СБР СТК ИРК ОЧС along the bottom, four keys each side
    box(W35,.27,.075,.08,Lm(0x7a8c97),0,-.212,-.70);
    const pui=new THREE.Group();pui.position.set(0,-.283,-.635);pui.rotation.x=-.375;pui.scale.set(1.08,.92,1);W35.add(pui);box(pui,.2,.16,.05,blk,0,0,0);
    const puiC=cvs(320,256);quad(pui,puiC,.19,.152,0,0,.0255);
    const PTOP=['НАВ','Р/С','ГО','В-В','В-П'],PK1=[['ПЗК','1'],['ОПЦ','2'],['БРЖ','3'],['ВСТ','4'],['РМ','5']],PK2=[['ППМ','6'],['АЭР','7'],['ПОС','8'],['ПЗ','9'],['КОР','0']],PBOT=['Ф','ТВ','СБР','СТК','ИРК','ОЧС'];
    function drawPUI(){const P=player,g=puiC.getContext('2d');g.fillStyle='#1a1d1f';g.fillRect(0,0,320,256);
      const key=(x,y,w,h,a,b)=>{g.fillStyle='#2c3236';g.fillRect(x,y,w,h);g.strokeStyle='#59605f';g.lineWidth=1;g.strokeRect(x,y,w,h);T(g,a,x+w/2,y+(b?h*.36:h/2),'#d8dcd6',a.length>3?9:11);if(b)T(g,b,x+w/2,y+h*.74,'#d8dcd6',10);};
      PTOP.forEach((s,i)=>key(52+i*44,4,38,20,s));
      for(let i=0;i<4;i++){key(4,32+i*24,34,18,'');key(282,32+i*24,34,18,i===3?'ВВД':'');}
      g.fillStyle='#061008';g.fillRect(44,30,232,96);g.strokeStyle='#3a4044';g.lineWidth=2;g.strokeRect(44,30,232,96);
      const w=game.wsel,m=radar.sensor==='IRST'?'ОЛС':'РЛС',md={RWS:'ОБЗОР',TWS:'СНП',STT:'ЗАХВАТ',ACM:'БВБ'}[radar.mode]||radar.mode,L=radar.mode==='STT'?radar.lock:null,d=new Date(),p2=v=>String(v).padStart(2,'0');
      T(g,(AGW[w]?'В-П':'В-В')+' '+m+' '+md,52,44,'#7dff8a',13,'left');T(g,p2(d.getHours())+':'+p2(d.getMinutes()),268,44,'#7dff8a',12,'right');
      T(g,(w==='GUN'?'ПУШКА '+(P.gun?P.gun.ammo:0):((typeof SM_ST!=='undefined'&&SM_ST[w])||w)+' × '+(MSL[w]?P.count(w):'')),52,66,'#7dff8a',13,'left');T(g,L?'Д '+(L.pos.distanceTo(P.pos)/1000).toFixed(1):'',268,66,'#7dff8a',12,'right');
      T(g,'ППМ '+((typeof wpNow==='function'&&wpNow(P)&&wpNow(P).name)||'01'),52,88,'#7dff8a',12,'left');T(g,'Н '+Math.round(P.pos.y),268,88,'#7dff8a',12,'right');
      T(g,'К '+String(Math.round(((P.hdg%360)+360)%360)).padStart(3,'0')+'   Gт '+((P.totalFuel||0)/1000).toFixed(1),52,110,'#7dff8a',12,'left');
      PK1.forEach(([a,b],i)=>key(44+i*47,134,42,32,a,b));PK2.forEach(([a,b],i)=>key(44+i*47,172,42,32,a,b));
      PBOT.forEach((s,i)=>key(20+i*48,216,42,22,s));
      for(const c of dyn35)if(c.draw){c.draw(c.c.getContext('2d'),c.c.width,c.c.height);c.m.material.map.needsUpdate=true;}}
    // ---------------- Su-30MK2 (front cockpit) ----------------
    const GMK=new THREE.Group();GMK.visible=false;sm.add(GMK);const mkL=[];
    {const gg=gauges(GMK,mkL),CX=-.045;box(GMK,.24,.25,.01,teal,CX,.055,.016);
      gg(CX-.075,.135,.027,'ias');gg(CX-.075,.068,.027,'alt');gg(CX-.075,.001,.027,'aoa');gg(CX+.035,.105,.05,'adi');gg(CX+.035,-.008,.05,'hsi');
      gg(-.43,-.14,.03,'clk');gg(-.355,-.14,.03,'vvi');gg(.215,-.14,.028,'egt');gg(.285,-.14,.028,'egt');gg(.375,-.14,.04,'rpm');
      const st=(w,h,x,y,W,H,draw)=>{const c=cvs(W,H);draw(c.getContext('2d'));const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),toneMapped:false}));m.position.set(x,y,.0215);GMK.add(m);};
      st(.2,.05,CX,-.14,400,100,g=>{g.fillStyle='#2a2f31';g.fillRect(0,0,400,100);T(g,'ДОЗАПРАВКА',200,16,'#e8ece6',16);[['ШТАНГА',70],['ОГНИ',200],['СЛИВ',330]].forEach(([s,x])=>{g.strokeStyle='#e8ece6';g.lineWidth=3;g.beginPath();g.arc(x,54,13,0,7);g.stroke();T(g,s,x,86,'#cfd3cf',12);});});
      st(.13,.042,.305,.195,260,84,g=>{g.fillStyle='#1b1e20';g.fillRect(0,0,260,84);const L=['ПОЖАР','ОТКАЗ САУ','ГИДРО 1','ГИДРО 2','ТОПЛИВО','ГЕНЕР','МАСЛО','КИСЛОРОД','ШАССИ','ОБЛЕД','СДУ','РЭП'];L.forEach((s,i)=>{const x=6+(i%4)*63,y=6+(i/4|0)*26;g.fillStyle=i<2?'#5a1810':'#4a3c10';g.fillRect(x,y,58,21);T(g,s,x+29,y+11,'#d8c8b0',9);});});}

    // ---------------- which board: applied after every cockpit change ----------------
    {const _sc=selectCockpit;selectCockpit=function(kind,pit){const r=_sc.apply(this,arguments);try{
        const t=kind==='fulcrum'&&player?player.type:'',s35=t==='Su-35S',mk2=t==='Su-30MK2',s30=t==='Su-30SM',vis=(l,v)=>{for(const m of l)m.visible=v;};
        G35.visible=W35.visible=s35;GMK.visible=mk2;
        if(!s30){vis(old.L,!s35);vis(old.R,!s35);vis(old.C,!(s35||mk2));}
        vis(old.G,!(s35||mk2));vis(old.K,!(s35||mk2));vis(old.H,!s35);
        if(s35){for(const[m,y]of hudM)m.position.y=y+HUDUP;o.glass=o.glass0.map(p=>p.clone().add(new V3(0,HUDUP,0)));}
        else if(!s30)for(const[m,y]of hudM)m.position.y=y;
      }catch(e){console.warn('v216 board',e);}return r;};}
    window.V216={drawG,T};
    {let n=0;o.anims.push(()=>{if(!player||!sm.visible)return;if(n++&1)return;try{if(G35.visible){drawPUI();}else if(GMK.visible)drawG(mkL);else return;}catch(e){}for(const t of live)t.needsUpdate=true;});}
    ACROLE['Su-35S']='RUSSIA · AIR SUPERIORITY · 3D THRUST VECTORING · IRBIS-E PESA · OLS-35 · 2× МФИ-35 + ПУИ-35';
    }catch(e){console.warn('v216 Flanker boards',e);}
  },
  /* game.js line 14609 */
  L14609(){
    /* ===== v217: Su-27SM instrument board after the real cockpit (two wide МФИ-10-5 with the narrower centre МФИ packed edge to edge across the board,
       the КР-6 HUD control unit above the centre screen, the lamp block top right, round engine / standby gauges in a row underneath). The
       old square screens are switched off in this jet; pages, labels and push-buttons are the same smLabel / smPress set. ===== */
    try{
    const o=ck.fulcrum,sm=o.smOnly[0];
    const old=[];sm.children.forEach(m=>{if(!m.isMesh)return;const p=m.position;if(p.x===0&&p.y===0&&p.z===0)return;
      if((Math.abs(p.x+.385)<.115||Math.abs(p.x-.30)<.115)&&Math.abs(p.y-.055)<.115||Math.abs(p.x)<.09&&Math.abs(p.y-.045)<.1)old.push(m);});
    const G=new THREE.Group();G.visible=false;sm.add(G);
    const bz=new THREE.MeshPhongMaterial({color:0x1b1e20,shininess:6}),ob=new THREE.MeshPhongMaterial({color:0x3e4548,shininess:8});
    const cvs=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),live=[];
    const scr={};
    const mfi=(k,X,Y,w,h,cw,ch,nT,nS)=>{const b=new THREE.Mesh(sbox(w+.05,h+.05,.022),bz);b.position.set(X,Y,.02);G.add(b);
      const c=cvs(cw,ch),t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;live.push(t);scr[k]=c;
      const q=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));q.position.set(X,Y,.0322);q.userData.screen='sm'+k;G.add(q);
      const btn=(bx,by,s,i)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.0065,.0065,.008,12),ob);m.rotation.x=Math.PI/2;m.position.set(bx,by,.033);G.add(m);
        const def={meshes:[m],name:'MFI '+k+' · '+s+(i+1),state:()=>{try{return smLabel(k,s,i)||'—';}catch(e){return'';}},act:()=>{try{smPress(k,s,i);}catch(e){console.warn(e);}sfx.click();}};m.userData.ctl=def;(o.ctls||[]).push(def);};
      for(let i=0;i<nT;i++){const ox=(i-(nT-1)/2)*(w/nT);btn(X+ox,Y+h/2+.0125,'T',i);btn(X+ox,Y-h/2-.0125,'B',i);}
      for(let i=0;i<nS;i++){const oy=((nS-1)/2-i)*(h/nS);btn(X-w/2-.0125,Y+oy,'L',i);btn(X+w/2+.0125,Y+oy,'R',i);}};
    // board 1.0 m wide: 0.255 m wide screens either side, 0.12 m centre screen, ~5 mm of bezel between them
    mfi('L',-.268,.045,.255,.19,640,480,7,5);mfi('C',0,.045,.12,.155,256,296,4,4);mfi('R',.268,.045,.255,.19,640,480,7,5);
    // lamp block top right (СМОТРИ ОТКАЗ / warning captions)
    {const c=cvs(240,150),g=c.getContext('2d');g.fillStyle='#1b1e20';g.fillRect(0,0,240,150);
      ['ПОЖАР','ОТКАЗ','ТОПЛ','ГИДР','ГЕН','МАСЛ','ШАСС','ОБЛЕД','САУ','РЭП','ЗАКР','КИСЛ'].forEach((s,i)=>{const x=8+(i%3)*78,y=8+(i/3|0)*35;g.fillStyle=i<2?'#5a1810':'#4a4a40';g.fillRect(x,y,70,28);g.fillStyle='#e8dccc';g.font='700 14px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(s,x+35,y+15);});
      const m=new THREE.Mesh(new THREE.PlaneGeometry(.1,.0625),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),toneMapped:false}));m.position.set(.39,.2,.022);G.add(m);}
    // wide screens: the page keeps its square shape in the middle, the flanks carry the extra data the 4:3 screen has room for
    const T=(c,s,x,y,col,sz,al)=>{c.fillStyle=col||'#9fe8c0';c.font='700 '+(sz||17)+'px "B612 Mono",monospace';c.textAlign=al||'center';c.textBaseline='middle';c.fillText(s,x,y);};
    function paint(){const P=player;if(!P)return;const V=o.smCv;
      {const c=scr.L.getContext('2d');c.fillStyle='#030a0c';c.fillRect(0,0,640,480);c.drawImage(V.L,80,0,480,480);
        const r=(i,k,v)=>{T(c,k,8,150+i*40,'#6fbf8a',15,'left');T(c,v,8,170+i*40,'#fff',17,'left');};
        r(0,'V КМ/Ч',String(Math.round((P.cas||0)*1.852)));r(1,'H М',String(Math.round(P.pos.y)));r(2,'M',(P.mach||0).toFixed(2));r(3,'Ny',(P.nz||1).toFixed(1));
        const L=radar.mode==='STT'?radar.lock:null;if(L&&L.alive){const d=L.pos.distanceTo(P.pos);T(c,'Д',632,150,'#6fbf8a',15,'right');T(c,(d/1000).toFixed(1),632,170,'#fff',17,'right');T(c,'Hц',632,200,'#6fbf8a',15,'right');T(c,String(Math.round(L.pos.y)),632,220,'#fff',17,'right');}}
      {const c=scr.R.getContext('2d');c.fillStyle='#030a0c';c.fillRect(0,0,640,480);c.drawImage(V.R,80,0,480,480);
        const fk=Math.round(P.totalFuel||0);T(c,'ТОПЛ',8,150,'#6fbf8a',15,'left');T(c,String(fk),8,170,fk<(P.ac.fuel||1)*.2?'#ff5a4a':'#fff',17,'left');
        T(c,'ЛТЦ',8,200,'#6fbf8a',15,'left');T(c,String(P.flares||0),8,220,'#fff',17,'left');T(c,'ДО',8,250,'#6fbf8a',15,'left');T(c,String(P.chaff||0),8,270,'#fff',17,'left');
        T(c,'ПУШ',632,150,'#6fbf8a',15,'right');T(c,String(P.gun?P.gun.ammo:0),632,170,'#fff',17,'right');}
      scr.C.getContext('2d').drawImage(V.C,0,0,256,296);
      for(const t of live)t.needsUpdate=true;}
    {const _sc=selectCockpit;selectCockpit=function(kind,pit){const r=_sc.apply(this,arguments);try{const on=kind==='fulcrum'&&!!player&&player.type==='Su-27SM';G.visible=on;if(on)for(const m of old)m.visible=false;}catch(e){}return r;};}
    {let n=0;o.anims.push(()=>{if(!G.visible||!sm.visible)return;if(n++&1)return;try{paint();}catch(e){}});}
    }catch(e){console.warn('v217 Su-27SM board',e);}
  }
 }
});
