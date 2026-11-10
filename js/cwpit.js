/* =====================================================================================================================
   v230 — simple cockpits for the 33 Cold War jets (v229). Needs game.js, coldwar.js, coldwar-jets.js.
   Each jet gets its own board instead of the borrowed one: panel colour of the real pit, its own instrument set (basic T,
   one or two engine stacks, metric / imperial scales, labels in the jet's own language), the right kind of sight (fixed
   reflector gunsight glass or a wide HUD combiner), its radar scope where it had one, the RWR, a stores / gear / caution
   block, side consoles. The borrowed jet's stick, throttle and pedals stay (they drive the controls). The flight, radar,
   HUD and weapon logic are unchanged: the scope and RWR faces show the same canvases the borrowed pit draws.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof ck==='undefined'||!ck.viper){console.warn('[cwpit] cockpits missing');return;}
// ---------- per-jet board ----------
// pc panel colour, cc console colour, u units, l labels, e engines, s sight ('gun' reflector / 'hud' combiner), sc scope ('ph' round CRT,
// 'fcr' square display, 0 none), m2 second display ('sms'), fc dial face colour
const GRY=0x33383b,BLK=0x1f2224,TQ=0x4f9c98,TQ2=0x6c9fa6;
const PIT={
 'A-4E':{pc:GRY,u:'imp',l:'en',e:1,s:'gun',sc:'ph'},
 'A-7D':{pc:GRY,u:'imp',l:'en',e:1,s:'hud',sc:'ph'},
 'AV-8B':{pc:0x2c3033,u:'imp',l:'en',e:1,s:'hud',sc:'fcr',m2:'sms'},
 'Alpha Jet':{pc:0x2e3236,u:'met',l:'fr',e:2,s:'hud',sc:0},
 'Super Etendard':{pc:0x2e3236,u:'met',l:'fr',e:1,s:'gun',sc:'ph'},
 'F-100A':{pc:BLK,u:'imp',l:'en',e:1,s:'gun',sc:0},
 'F-104S':{pc:GRY,u:'imp',l:'en',e:1,s:'gun',sc:'ph'},
 'F-106A':{pc:GRY,u:'imp',l:'en',e:1,s:'gun',sc:'ph'},
 'F-111F':{pc:GRY,u:'imp',l:'en',e:2,s:'hud',sc:'ph',wide:1},
 'F-20':{pc:0x2c3033,u:'imp',l:'en',e:1,s:'hud',sc:'fcr',m2:'sms'},
 'F-5E':{pc:GRY,u:'imp',l:'en',e:2,s:'gun',sc:'ph'},
 'F-86F':{pc:BLK,u:'imp',l:'en',e:1,s:'gun',sc:0},
 'F-8E':{pc:GRY,u:'imp',l:'en',e:1,s:'gun',sc:'ph'},
 'J 35F':{pc:0x3a3f44,u:'met',l:'sv',e:1,s:'gun',sc:'ph'},
 'AJS-37':{pc:0x2b2f33,u:'met',l:'sv',e:1,s:'hud',sc:'ph'},
 'AMX':{pc:0x2c3033,u:'imp',l:'en',e:1,s:'hud',sc:'fcr'},
 'Lightning F.6':{pc:BLK,u:'imp',l:'en',e:2,s:'gun',sc:'ph'},
 'Mirage III':{pc:0x2e3236,u:'met',l:'fr',e:1,s:'gun',sc:'ph'},
 'Mirage F1':{pc:0x2e3236,u:'met',l:'fr',e:1,s:'gun',sc:'ph'},
 'Mirage 2000':{pc:0x2a2e31,u:'met',l:'fr',e:1,s:'hud',sc:'fcr'},
 'Jaguar':{pc:BLK,u:'imp',l:'en',e:2,s:'hud',sc:0},
 'Tornado GR.4':{pc:BLK,u:'imp',l:'en',e:2,s:'hud',sc:'ph',m2:'sms',wide:1},
 'Su-25':{pc:TQ,u:'met',l:'ru',e:2,s:'gun',sc:0},
 'Su-24M':{pc:TQ,u:'met',l:'ru',e:2,s:'hud',sc:'fcr',wide:1},
 'Su-22M4':{pc:TQ,u:'met',l:'ru',e:1,s:'gun',sc:0},
 'MiG-27K':{pc:TQ,u:'met',l:'ru',e:1,s:'hud',sc:0},
 'MiG-15':{pc:0x262826,u:'met',l:'ru',e:1,s:'gun',sc:0},
 'MiG-19':{pc:0x262826,u:'met',l:'ru',e:2,s:'gun',sc:'ph'},
 'Yak-38':{pc:TQ,u:'met',l:'ru',e:1,s:'gun',sc:0},
 'Yak-141':{pc:0x5f8f96,u:'met',l:'ru',e:1,s:'hud',sc:'fcr'},
 'J-11':{pc:TQ2,u:'met',l:'zh',e:2,s:'hud',sc:'fcr'},
 'J-8F':{pc:0x5d7480,u:'met',l:'zh',e:2,s:'hud',sc:'fcr'},
 'JH-7':{pc:0x55606a,u:'met',l:'zh',e:2,s:'hud',sc:'fcr',wide:1}};
const LB={
 en:{ias:'AIRSPEED',alt:'ALT',vvi:'VERT VEL',aoa:'AOA',g:'G',rpm:'RPM %',egt:'EGT',fuel:'FUEL',ff:'FUEL FLOW',clk:'',arm:'MASTER ARM',safe:'SAFE',gear:'GEAR',fire:'FIRE',hyd:'HYD',low:'FUEL LOW',eng:'ENGINE',wpn:'WEAPON',kt:'KNOTS',ft:'FEET',ab:'A/B'},
 fr:{ias:'VITESSE',alt:'ALTITUDE',vvi:'VARIO',aoa:'INCIDENCE',g:'G',rpm:'N %',egt:'T4',fuel:'CARBURANT',ff:'DEBIT',clk:'',arm:'ARMT',safe:'SECU',gear:'TRAIN',fire:'FEU',hyd:'HYD',low:'BINGO',eng:'MOTEUR',wpn:'ARME',kt:'KM/H',ft:'M',ab:'PC'},
 sv:{ias:'FART',alt:'HÖJD',vvi:'STIG',aoa:'ALFA',g:'G',rpm:'VARV %',egt:'TEMP',fuel:'BRÄNSLE',ff:'FLÖDE',clk:'',arm:'HUVUDSÄKR',safe:'SÄKRAD',gear:'STÄLL',fire:'BRAND',hyd:'HYDR',low:'BRÄNSLE',eng:'MOTOR',wpn:'VAPEN',kt:'KM/H',ft:'M',ab:'EBK'},
 ru:{ias:'СКОРОСТЬ',alt:'ВЫСОТА',vvi:'ВАР',aoa:'α',g:'Ny',rpm:'ОБ %',egt:'Т°',fuel:'ТОПЛИВО',ff:'РАСХОД',clk:'',arm:'ГЛАВН ВКЛ',safe:'ВЫКЛ',gear:'ШАССИ',fire:'ПОЖАР',hyd:'ГИДРО',low:'ОСТАТОК',eng:'ДВИГ',wpn:'ОРУЖИЕ',kt:'КМ/Ч',ft:'М',ab:'ФОРС'},
 zh:{ias:'空速',alt:'高度',vvi:'升降',aoa:'攻角',g:'过载',rpm:'转速 %',egt:'排温',fuel:'燃油',ff:'油耗',clk:'',arm:'总电门',safe:'保险',gear:'起落架',fire:'火警',hyd:'液压',low:'余油',eng:'发动机',wpn:'武器',kt:'公里/时',ft:'米',ab:'加力'}};


// ======================= accurate layouts, batch 1 (1950s–60s gun-sight fighters) =======================
// positions are canvas px on the 1024×512 main-panel face; dial keys: ias alt vvi aoa acc mach adi hsi turn cmp clk rpm rpm2 egt egt2 noz noz2
// fuel fpr oil hyd oxy apc lamp_*; plates [x,y,w,h,title,[switches]]; cau [x,y,cols,rows,cw,ch,[legends]]; gearH [x,y]; arm [x,y,w]
Object.assign(PIT['F-86F'],{pc:0x1d1f20,gs:'a4',stk:'a1',thr:1,lay:{rwr:null,
  dial:{acc:[70,100,44],ias:[190,105,62],hsi:[340,105,62],adi:[500,105,70],alt:[660,105,62],cmp:[190,250,56],turn:[340,250,56],vvi:[500,255,60],oxy:[660,250,46],
    rpm:[800,100,58],egt:[930,100,52],fpr:[800,240,46],oil:[930,232,42],hyd:[800,360,44],fuel:[930,352,54],clk:[660,370,40],lamp_fire:[580,330,10]},
  gearH:[70,250],arm:[150,410,300],plates:[[480,410,210,70,'BOMB-ROCKET-TANK',['SEL','ARM','JETT']]],txt:[['FIRE',580,350,9]]},
  con:{L:[['ENGINE',['MASTER','IGNITION','EMER FUEL']],['THROTTLE QUADRANT',['SPD BRK','MIC']],['AN/ARC-27 UHF',['CHAN','VOL','TONE']],['TRIM / FLAPS',['RUD','FLAP','T/O TRIM']]],
       R:[['ELECTRICAL',['BATT','GEN','INVERTER']],['LIGHTS',['POS','FUS','INST']],['A-4 GUNSIGHT',['FILTER','CAGE','RANGE']],['OXYGEN / CB',['DILUTER','EMER','CB']]]}});
Object.assign(PIT['MiG-15'],{pc:0x232523,gs:'asp',stk:'a1',thr:1,lay:{rwr:null,
  dial:{mach:[215,105,48],ias:[350,105,62],adi:[512,110,74],turn:[660,105,56],rpm:[800,105,58],egt:[930,105,50],
    oxy:[215,250,46],alt:[350,260,62],vvi:[512,265,58],cmp:[660,260,58],fuel:[800,255,56],fpr:[930,240,44],oil:[930,352,40],clk:[800,385,38],lamp_mach:[275,40,9],lamp_fire:[930,440,10]},
  gearH:[80,170],arm:[40,400,250],plates:[[330,355,360,78,'ВООРУЖЕНИЕ',['Н-37Д','НР-23','БОМБЫ','ФКП']]],
  txt:[['М 0.92',275,62,9],['ПОЖАР',930,462,9]]},
  con:{L:[['РУД / ВК-1',['ЗАПУСК','СТОП']],['ЗАКРЫЛКИ',['20°','55°']],['РСИУ-3М',['КАНАЛ','ГРОМК']],['ЭЛ. ЩИТОК',['АККУМ','ГЕН','ПО-750']]],
       R:[['ЩИТОК АЗС',['АРК','ПРИЦЕЛ','ФОТО']],['АВАРИЙН',['ШАССИ','ЗАКРЫЛ','ТОРМ']],['КИСЛОРОД КП-14',['ПОДАЧА','АВАР']],['ОСВЕЩЕНИЕ',['УФО','ФАРА']]]}});
Object.assign(PIT['MiG-19'],{pc:0x232523,gs:'asp',stk:'a1',thr:2,lay:{rwr:null,scope:[890,115,92],
  dial:{mach:[90,110,46],ias:[230,110,60],adi:[390,118,70],turn:[540,110,52],rpm:[690,105,50],
    oxy:[90,250,44],alt:[230,255,60],vvi:[390,265,56],cmp:[540,255,56],rpm2:[690,232,50],
    egt:[800,300,46],egt2:[920,300,46],fuel:[690,365,50],oil:[800,410,36],fpr:[920,410,36],lamp_fire:[540,345,10]},
  gearH:[90,370],arm:[150,410,230],plates:[[395,360,240,72,'ВООРУЖЕНИЕ',['НР-30','РС','БОМБЫ','ФКП']]],txt:[['ПОЖАР',540,365,9],['РП-5',890,222,10]]},
  con:{L:[['РУД ×2 / РД-9Б',['ЗАПУСК Л','ЗАПУСК П','ФОРСАЖ']],['ЗАКРЫЛКИ / ЩИТКИ',['ЗАКР','ЩИТКИ']],['РСИУ-4',['КАНАЛ','ГРОМК']],['ТРИММЕР',['СТАБ','ЭЛЕР']]],
       R:[['ЩИТОК АЗС',['РЛС','ПРИЦЕЛ','АРК']],['РАДИОЛОКАТОР РП-5',['ВКЛ','ДАЛЬН','ЯРК']],['КИСЛОРОД',['ПОДАЧА','АВАР']],['ОСВЕЩЕНИЕ',['УФО','АНО']]]}});
Object.assign(PIT['F-104S'],{pc:0x2a2d2f,gs:'opt',stk:'b8',thr:1,lay:{rwr:[90,95,56],scope:[512,118,98],
  dial:{ias:[330,100,60],alt:[330,232,60],vvi:[330,358,50],adi:[512,300,66],hsi:[512,445,56],
    apc:[690,95,50],rpm:[820,95,56],egt:[940,95,48],acc:[690,225,46],noz:[820,225,46],fuel:[940,225,52],clk:[690,345,40],oil:[820,345,40],hyd:[940,345,40]},
  gearH:[80,250],arm:[150,440,240],cau:[620,420,4,2,90,30,['FIRE','HYD','FUEL LOW','GEN','OIL','PITCH','CANOPY','TIP TANK']],txt:[['R21G',512,232,10]]},
  con:{L:[['THROTTLE / ENGINE',['START','IGN','A/B']],['AN/ARC-552 UHF',['CHAN','VOL','MODE']],['FLAPS / TRIM',['T.O.','LAND','TRIM']],['ARMAMENT',['SPARROW','GUN','RKT']]],
       R:[['R21G RADAR',['MODE','RANGE','GAIN']],['ELECTRICAL',['BATT','GEN','INV']],['NAV / TACAN',['CHAN','MODE']],['LIGHTS / OXY',['INST','POS','O2']]]}});
Object.assign(PIT['F-5E'],{pc:0x30353a,gs:'opt',stk:'b8',thr:2,lay:{rwr:[80,90,50],scope:[512,95,82],
  dial:{aoa:[190,90,46],ias:[345,120,62],adi:[512,262,72],alt:[680,120,62],acc:[360,290,50],hsi:[512,430,62],vvi:[680,270,56],oil:[680,410,40],
    rpm:[810,90,46],rpm2:[920,90,46],egt:[810,200,44],egt2:[920,200,44],noz:[810,305,40],noz2:[920,305,40],fuel:[865,422,54]},
  gearH:[80,250],arm:[140,415,240],cau:[130,170,2,4,90,26,['L GEN','R GEN','HYD','FUEL LOW','L FIRE','R FIRE','OXY','CANOPY']],txt:[['APQ-159',512,190,9]]},
  con:{L:[['THROTTLES / ENGINE',['L START','R START','IGN']],['ARMAMENT',['ARM','GUNS','MSL']],['FUEL',['BOOST L','BOOST R','XFEED']],['FLAPS / TRIM',['AUTO','RUD','AIL']]],
       R:[['RADAR APQ-159',['MODE','RANGE','GAIN']],['ELECTRICAL',['BATT','L GEN','R GEN']],['UHF / TACAN',['CHAN','VOL','MODE']],['LIGHTS / OXY',['INST','FORM','O2']]]}});

// ---------- geometry helpers ----------
const LM=(c,sh=10)=>new THREE.MeshPhongMaterial({color:c,shininess:sh,specular:0x1c1c1c});
const box=(par,w,h,d,m,x,y,z,rx=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.rotation.x=rx;par.add(o);return o;};
const PW=.88,PH=.44,CW=1024,CH=Math.round(CW*PH/PW),PX=PW/CW;// panel metres, canvas px
const lx=x=>(x-CW/2)*PX,ly=y=>(CH/2-y)*PX;
function liveTex(kind,canvas){const o=ck[kind];if(!o._cwT)o._cwT=new Map();if(o._cwT.has(canvas))return o._cwT.get(canvas);
  const t=new THREE.CanvasTexture(canvas);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;o.tex.push(t);o._cwT.set(canvas,t);return t;}
const scopeOf=s=>s==='ph'?(typeof phScopeC!=='undefined'?phScopeC:null):s==='fcr'?fcrC:s==='sms'?smsC:null;

function build(id,kind){const S=PIT[id],o=ck[kind],root=o.root,g=new THREE.Group();g.visible=false;root.add(g);
  const pm=LM(S.pc),dk=LM(0x16191b,6),cm=LM(S.cc||S.pc,8),blk=LM(0x0d0f10,4);
  // glare shield and sight head
  box(g,.92,.03,.42,dk,0,-.262,-.95);box(g,.62,.026,.05,dk,0,-.272,-.735);
  const hud=S.s==='hud',gw=hud?(S.wide?.24:.21):.15,gh=hud?.19:.13,gy=hud?-.075:-.1,gz=-.615;
  box(g,hud?.24:.17,.075,.15,blk,0,-.215,-.69);
  const gmat=new THREE.MeshBasicMaterial({color:0x9effd0,transparent:true,opacity:.07,depthWrite:false,side:THREE.DoubleSide});
  const gl=new THREE.Mesh(new THREE.PlaneGeometry(gw,gh),gmat);gl.position.set(0,gy,gz);gl.rotation.x=-.08;g.add(gl);
  const fr=new THREE.MeshBasicMaterial({color:0x121415});
  if(hud){[-1,1].forEach(sd=>box(g,.012,gh+.06,.016,blk,sd*(gw/2+.006),gy-.02,gz-.005,-.08));box(g,gw+.024,.012,.016,blk,0,gy+gh/2+.006,gz-.003,-.08);}
  else{// reflector gunsight: glass plate in a thin frame on a centre post
    [[0,gh/2],[0,-gh/2]].forEach(([x,y])=>box(g,gw,.005,.005,fr,x,gy+y,gz));[-1,1].forEach(sd=>box(g,.005,gh,.005,fr,sd*gw/2,gy,gz));
    box(g,.016,.11,.016,blk,0,-.17,-.64);}
  // period gunsight bodies (the glass and symbology stay as above)
  if(S.gs==='a4'){box(g,.15,.12,.2,LM(0x1b1d1e),0,-.205,-.7);box(g,.11,.05,.08,LM(0x26292b),0,-.16,-.66);box(g,.04,.03,.03,LM(0x3a3d40),.06,-.14,-.66);}
  else if(S.gs==='asp'){box(g,.13,.15,.24,LM(0x22252a),0,-.2,-.72);box(g,.09,.06,.1,LM(0x2c3036),0,-.13,-.67);const ring=new THREE.Mesh(new THREE.TorusGeometry(.03,.006,8,24),LM(0x111));ring.position.set(0,-.17,-.59);g.add(ring);}
  else if(S.gs==='opt'){box(g,.12,.08,.16,LM(0x17191a),0,-.215,-.69);box(g,.06,.04,.05,LM(0x2a2d30),-.07,-.21,-.65);}
  gl.updateMatrixWorld(true);
  const glass=[[-gw/2,gh/2],[gw/2,gh/2],[gw/2,-gh/2],[-gw/2,-gh/2]].map(([x,y])=>new V3(x,y,0).applyMatrix4(gl.matrixWorld));
  // main panel: shaped body, painted face (one canvas), scope / RWR / second display set into it
  const pp=new THREE.Group();pp.position.set(0,-.472,-.668);pp.rotation.x=-.28;g.add(pp);
  box(pp,PW+.03,PH+.03,.03,pm,0,-.03,-.018);box(pp,PW+.2,.2,.03,pm,0,-.33,-.03,0);
  const cv=document.createElement('canvas');cv.width=CW;cv.height=CH;const tx=new THREE.CanvasTexture(cv);tx.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());o.tex.push(tx);
  const faceM=new THREE.MeshBasicMaterial({map:tx,toneMapped:false});const fm=new THREE.Mesh(new THREE.PlaneGeometry(PW,PH),faceM);fm.position.set(0,-.03,0);pp.add(fm);o.faces.push(faceM);
  const L=layout(S);
  const scr=(canvas,shape,cx,cy,r,id)=>{if(!canvas)return;const cxm=lx(cx),cym=ly(cy)-.03;
    box(pp,2*r*PX+.03,2*r*PX+.03,.03,blk,cxm,cym,.012);
    const geo=shape==='round'?new THREE.CircleGeometry(r*PX,48):new THREE.PlaneGeometry(2*r*PX,2*r*PX);
    const m=new THREE.MeshBasicMaterial({map:liveTex(kind,canvas),toneMapped:false});const ms=new THREE.Mesh(geo,m);ms.position.set(cxm,cym,.0285);if(id)ms.userData.screen=id;pp.add(ms);o.faces.push(m);};
  if(L.scope)scr(scopeOf(S.sc),S.sc==='ph'?'round':'sq',L.scope[0],L.scope[1],L.scope[2],S.sc==='ph'?'phscope':'fcr');
  if(L.m2)scr(scopeOf(S.m2),'sq',L.m2[0],L.m2[1],L.m2[2],S.m2);
  if(L.rwr)scr(rwrC,'round',L.rwr[0],L.rwr[1],L.rwr[2],null);
  // side consoles and sills
  [-1,1].forEach(sd=>{box(g,.2,.09,.95,cm,sd*.43,-.66,-.16);box(g,.05,.16,1.3,dk,sd*.55,-.48,-.2);
    if(!S.con)for(let i=0;i<4;i++)box(g,.14,.006,.16,LM(0x24282a),sd*.43,-.612,-.5+i*.2);});
  box(g,.3,.25,.3,dk,0,-.98,-.55);// pedestal under the panel
  // console tops: painted switch panels per jet  S.con={L:[[title,[switches]],..],R:[..]}
  if(S.con)['L','R'].forEach((sd,si)=>{const list=S.con[sd]||[];const cc=document.createElement('canvas');cc.width=256;cc.height=1024;const x=cc.getContext('2d');
    x.fillStyle='#'+(S.cc||S.pc).toString(16).padStart(6,'0');x.fillRect(0,0,256,1024);const ph=1024/Math.max(1,list.length);
    list.forEach(([ti,sw],i)=>{const y=i*ph;x.fillStyle='rgba(0,0,0,.3)';x.fillRect(8,y+6,240,ph-12);x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=2;x.strokeRect(8,y+6,240,ph-12);
      x.font='bold 15px Arial';x.textAlign='center';x.fillStyle='#e8e8e0';x.fillText(ti,128,y+26);
      (sw||[]).forEach((w,j)=>{const cols=Math.min(3,sw.length),sx=40+(j%cols)*88,sy=y+60+Math.floor(j/cols)*54;x.fillStyle='#4a4a4a';x.beginPath();x.arc(sx,sy,10,0,7);x.fill();x.fillStyle='#ddd';x.fillRect(sx-3,sy-20,6,18);x.font='11px Arial';x.fillStyle='#c8c8c0';x.fillText(w,sx,sy+24);});});
    const t=new THREE.CanvasTexture(cc);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(.19,.94),m);pl.rotation.x=-Math.PI/2;pl.position.set((si?1:-1)*.43,-.613,-.16);g.add(pl);
    // a few real 3D toggles so the console reads as hardware
    list.forEach((_,i)=>{for(let j=0;j<2;j++){const tg=box(g,.006,.022,.006,LM(0xcccccc,40),(si?1:-1)*(.43-.05+j*.05),-.6,-.16-.47+(i+.5)*(.94/list.length)+.02,-.4);}});});
  // own stick and throttle; they copy the borrowed ones' motion each frame
  const stkG=new THREE.Group(),thrG=new THREE.Group();g.add(stkG);g.add(thrG);const sm=LM(0x1a1a1a,30),gm=LM(0x2b2b2b,20),bt=LM(0xb02020,30);
  const st=S.stk||'b8';
  box(stkG,.025,.34,.025,sm,0,.17,0);
  if(st==='ru'){const ring=new THREE.Mesh(new THREE.TorusGeometry(.045,.008,8,20,Math.PI*1.3),gm);ring.position.set(0,.36,0);ring.rotation.z=-Math.PI*.15;stkG.add(ring);box(stkG,.03,.07,.03,gm,0,.34,0);box(stkG,.012,.02,.012,bt,.02,.38,-.01);}
  else if(st==='a1'){box(stkG,.035,.1,.04,gm,0,.38,0,-.2);box(stkG,.012,.025,.012,bt,0,.43,.005);box(stkG,.006,.03,.02,LM(0x888888),0,.36,-.025);}
  else{box(stkG,.04,.12,.045,gm,0,.39,-.005,-.25);box(stkG,.016,.018,.016,LM(0x777777),0,.455,.005);box(stkG,.012,.02,.012,bt,-.018,.43,.0);box(stkG,.006,.03,.02,LM(0x888888),0,.37,-.03);}
  const nt=S.thr||1;for(let i=0;i<nt;i++){const lv=new THREE.Group();lv.position.x=(i-(nt-1)/2)*.035;box(lv,.012,.16,.012,sm,0,.08,0);box(lv,nt>1?.03:.05,.05,.05,gm,0,.17,0);thrG.add(lv);}
  return{g,cv,tx,S,L,glass,lb:LB[S.l]||LB.en,t:0,stkG,thrG};}

// panel layout in canvas px: [x, y, r]
function layout(S){if(S.lay){const L=JSON.parse(JSON.stringify(S.lay));if(!L.scope)L.scope=null;L.dial=L.dial||{};if(!L.rwr)L.rwr=null;return L;}
  const sc=!!S.sc,two=!!S.m2,L={dial:{}};
  L.rwr=[88,92,58];L.dial.ias=[222,104,70];L.dial.aoa=[88,232,54];L.dial.vvi=[222,248,60];
  L.dial.alt=[800,104,70];L.dial.clk=[940,90,46];
  if(S.e===2){L.dial.rpm=[800,240,56];L.dial.rpm2=[940,214,50];}else{L.dial.rpm=[800,240,56];L.dial.ff=[940,214,46];}
  L.dial.egt=[800,372,54];L.dial.fuel=[940,350,58];
  if(sc&&two){L.scope=[420,124,92];L.m2=[606,124,92];L.dial.adi=[430,370,74];L.dial.hsi=[600,370,74];}
  else if(sc){L.scope=[512,130,112];L.dial.adi=[420,372,74];L.dial.hsi=[604,372,74];}
  else{L.dial.adi=[512,138,96];L.dial.hsi=[512,365,82];L.dial.g=[380,130,46];}
  L.box=[22,312,312,170];return L;}

// ---------- painting ----------
function paint(B,P){const c=B.cv.getContext('2d'),S=B.S,lb=B.lb,ru=S.l==='ru'||S.l==='zh',imp=S.u==='imp';
  const col='#'+S.pc.toString(16).padStart(6,'0');c.fillStyle=col;c.fillRect(0,0,CW,CH);
  // panel screws and engraved separators
  c.fillStyle='rgba(0,0,0,.25)';c.fillRect(326,6,2,CH-12);c.fillRect(696,6,2,CH-12);
  c.fillStyle='rgba(255,255,255,.18)';for(const[x,y]of[[10,10],[CW-10,10],[10,CH-10],[CW-10,CH-10],[512,8]]){c.beginPath();c.arc(x,y,4,0,7);c.fill();}
  const face=ru&&S.pc!==0x262826?'#0e1212':'#0c0d0e',ink='#eef0ea',dimInk='#aab0a8';
  const T=(s,x,y,sz=13,cl=ink,al='center')=>{c.font=`bold ${sz}px Arial, "Noto Sans", sans-serif`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=cl;c.fillText(s,x,y);};
  const dial=(k,draw)=>{const d=B.L.dial[k];if(!d)return;const[x,y,r]=d;c.save();c.translate(x,y);
    c.fillStyle='#08090a';c.beginPath();c.arc(0,0,r+6,0,7);c.fill();c.fillStyle=face;c.beginPath();c.arc(0,0,r,0,7);c.fill();draw(r);c.restore();};
  const ticks=(r,a0,a1,n,maj=1)=>{c.strokeStyle=ink;for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n-90)*D2R,M=i%maj===0;c.lineWidth=M?2.5:1.2;c.beginPath();c.moveTo(Math.cos(a)*r*(M?.78:.86),Math.sin(a)*r*(M?.78:.86));c.lineTo(Math.cos(a)*r*.96,Math.sin(a)*r*.96);c.stroke();}};
  const nums=(r,a0,a1,vals)=>vals.forEach((v,i)=>{const a=(a0+(a1-a0)*i/(vals.length-1)-90)*D2R;T(String(v),Math.cos(a)*r*.6,Math.sin(a)*r*.6,Math.max(10,r*.2));});
  const ndl=(r,deg,len=.82,cl=ink,w=4)=>{const a=(deg-90)*D2R;c.strokeStyle=cl;c.lineWidth=w;c.beginPath();c.moveTo(-Math.cos(a)*r*.12,-Math.sin(a)*r*.12);c.lineTo(Math.cos(a)*r*len,Math.sin(a)*r*len);c.stroke();c.fillStyle='#333';c.beginPath();c.arc(0,0,r*.07,0,7);c.fill();};
  if(!P)return;
  const run=P.totalFuel>0,n=clamp(P.n||0,0,1.1),ab=P.ab||0;
  // airspeed
  dial('ias',r=>{const v=imp?(P.cas||0):(P.cas||0)*1.852,mx=imp?800:1400,a=-150+300*clamp(v/mx,0,1);
    ticks(r,-150,150,16,2);nums(r,-150,150,imp?[0,200,400,600,800]:[0,350,700,1050,1400]);ndl(r,a);T(lb.ias,0,r*.3,10,dimInk);T('M '+(P.mach||0).toFixed(2),0,-r*.28,12);});
  // altimeter: hundreds / thousands needles, digital window
  dial('alt',r=>{const h=imp?P.pos.y*3.2808:P.pos.y,u=imp?1000:1000;ticks(r,0,360,50,5);nums(r,0,324,[0,1,2,3,4,5,6,7,8,9]);
    ndl(r,360*((h%u)/u),.85);ndl(r,360*((h/(u*10))%1),.5,'#e8c040',6);c.fillStyle='#000';c.fillRect(-r*.42,r*.22,r*.84,r*.3);T(String(Math.max(0,Math.round(h/10)*10)),0,r*.37,12,'#fff');T(lb.alt+' '+(imp?'FT':lb.ft),0,-r*.35,9,dimInk);});
  dial('vvi',r=>{ticks(r,-170,-10,8,2);ticks(r,10,170,8,2);const vs=(P.vel?P.vel.y:0),k=imp?vs*196.85/6000:vs/100;ndl(r,-90+clamp(k,-1,1)*80);T(lb.vvi,r*.25,0,9,dimInk,'left');T(imp?'×1000 FPM':S.l==='ru'?'М/С':'M/S',r*.25,r*.25,8,dimInk,'left');});
  dial('aoa',r=>{ticks(r,-140,-20,6);ticks(r,20,140,6);ndl(r,-140+120*clamp(((P.alpha||0)*R2D+5)/35,0,1),.8);ndl(r,140-120*clamp(((P.nz||1)+2)/11,0,1),.8,'#e8c040',3);T(lb.aoa,-r*.32,r*.45,10,dimInk);T(lb.g,r*.32,r*.45,10,'#e8c040');});
  dial('g',r=>{ticks(r,-150,150,15,5);ndl(r,-150+300*clamp(((P.nz||1)+5)/15,0,1));ndl(r,-150+300*clamp(((P.maxNz||1)+5)/15,0,1),.7,'#e05040',2);T(lb.g,0,r*.4,11,dimInk);});
  dial('clk',r=>{const d=new Date();ticks(r,0,330,11,3);ndl(r,360*((d.getHours()%12)+d.getMinutes()/60)/12,.5);ndl(r,360*d.getMinutes()/60,.8,ink,3);ndl(r,6*d.getSeconds(),.85,'#e05040',1.5);});
  const rpm=k=>dial(k,r=>{const v=run?(k==='rpm2'?n*.995:n):0;ticks(r,-135,135,11,2);nums(r,-135,135,[0,20,40,60,80,100]);ndl(r,-135+270*clamp(v/1.1,0,1));T(lb.rpm,0,r*.42,9,dimInk);T(String(Math.round(v*100)),0,-r*.3,11);if(ab>.02){T(lb.ab,0,r*.66,9,'#ffb030');}});
  rpm('rpm');rpm('rpm2');
  dial('ff',r=>{ticks(r,-135,135,10,2);ndl(r,-135+270*clamp(run?(.12+n*.55+ab*.33):0,0,1));T(lb.ff,0,r*.42,8,dimInk);});
  dial('egt',r=>{ticks(r,-135,135,9,3);const e=k=>clamp(run?.25+n*.55+ab*.15+k:0,0,1);ndl(r,-135+270*e(0));if(S.e===2)ndl(r,-135+270*e(-.012),.62,'#e8c040',3);T(lb.egt+(S.l==='en'?' °C':''),0,r*.42,9,dimInk);});
  dial('fuel',r=>{const f=P.totalFuel||0,mx=Math.max(1,(P.ac.fuel||3000)+(P.ac.tank||0)*2),v=imp?f*2.2046:f;ticks(r,-135,135,10,2);ndl(r,-135+270*clamp(f/mx,0,1));
    c.fillStyle='#000';c.fillRect(-r*.48,r*.18,r*.96,r*.32);T(String(Math.round(v/10)*10),0,r*.34,12,'#fff');T(lb.fuel+(imp?' LB':' KG'),0,-r*.35,9,dimInk);});
  // ADI
  dial('adi',r=>{c.save();c.beginPath();c.arc(0,0,r,0,7);c.clip();c.rotate(-(P.bank||0));const po=(P.pitch||0)*R2D*r/45;
    c.fillStyle=ru?'#4f86b8':'#9aa3a8';c.fillRect(-r*2,-r*2+po,r*4,r*2);c.fillStyle=ru?'#6b4a2a':'#1a1a1a';c.fillRect(-r*2,po,r*4,r*2);
    c.strokeStyle=ru?'#fff':'#fff';c.lineWidth=2;c.beginPath();c.moveTo(-r*2,po);c.lineTo(r*2,po);for(let q=-60;q<=60;q+=10){if(!q)continue;const yy=po-q*r/45,w=q%30?r*.18:r*.36;c.moveTo(-w,yy);c.lineTo(w,yy);}c.stroke();c.restore();
    c.strokeStyle='#ffb21a';c.lineWidth=5;c.beginPath();c.moveTo(-r*.6,0);c.lineTo(-r*.18,0);c.lineTo(-r*.1,r*.1);c.moveTo(r*.6,0);c.lineTo(r*.18,0);c.lineTo(r*.1,r*.1);c.stroke();ticks(r,-60,60,8,2);});
  // HSI / compass card
  dial('hsi',r=>{c.save();c.rotate(-(P.hdg||0)*D2R);c.strokeStyle=ink;c.lineWidth=2;for(let i=0;i<72;i++){const a=i*5*D2R,l=i%2?.9:.82;c.beginPath();c.moveTo(Math.sin(a)*r*l,-Math.cos(a)*r*l);c.lineTo(Math.sin(a)*r*.97,-Math.cos(a)*r*.97);c.stroke();}
    const card=S.l==='ru'?['С','В','Ю','З']:S.l==='zh'?['北','东','南','西']:S.l==='fr'||S.l==='sv'?['N','E','S',S.l==='fr'?'O':'V']:['N','E','S','W'];
    card.forEach((s,i)=>{c.save();c.rotate(i*Math.PI/2);T(s,0,-r*.65,Math.round(r*.22),'#fff');c.restore();});[3,6,12,15,21,24,30,33].forEach(v=>{c.save();c.rotate(v*10*D2R);T(String(v),0,-r*.66,Math.round(r*.16),dimInk);c.restore();});c.restore();
    c.fillStyle='#ffb21a';c.beginPath();c.moveTo(0,-r);c.lineTo(-7,-r+14);c.lineTo(7,-r+14);c.closePath();c.fill();c.strokeStyle='#ffb21a';c.lineWidth=3;c.beginPath();c.moveTo(0,-r*.3);c.lineTo(0,r*.3);c.moveTo(-r*.22,0);c.lineTo(r*.22,0);c.stroke();
    T(String(Math.round(P.hdg||0)).padStart(3,'0'),0,r*.55,12,'#fff');});
  // stores / gear / caution block
  if(!B.L.box){return extra(B,P,c,T,dial,ticks,nums,ndl,ink,dimInk);}
  const[bx,by,bw,bh]=B.L.box;c.fillStyle='rgba(0,0,0,.35)';c.fillRect(bx,by,bw,bh);c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=2;c.strokeRect(bx,by,bw,bh);
  const armed=game.armPos===0,w=game.wsel||'GUN';
  T(lb.arm,bx+14,by+20,12,ink,'left');c.fillStyle=armed?'#ff4a2a':'#3a1612';c.fillRect(bx+170,by+9,62,22);T(armed?'ARM':lb.safe,bx+201,by+20,11,armed?'#fff':'#a08070');
  let cnt='';try{cnt=w==='GUN'?String(P.gun.ammo):String(P.count(w));}catch(e){}
  T(lb.wpn,bx+14,by+50,12,ink,'left');c.fillStyle='#000';c.fillRect(bx+100,by+38,bw-112,24);T(((typeof SN!=='undefined'&&SN[w])||w)+'  '+cnt,bx+108,by+50,13,'#7dffa0','left');
  // gear: three lamps (green down and locked, red in transit)
  let gd=false;try{gd=P.ac.cockpit==='fulcrum'?!!sys.mig.gear:!!sys.v.gear;}catch(e){}const tr=(P.gearPos!=null)&&P.gearPos>.05&&P.gearPos<.95;
  T(lb.gear,bx+14,by+92,12,ink,'left');[[bx+150,by+80],[bx+125,by+104],[bx+175,by+104]].forEach(([x,y])=>{c.fillStyle=tr?'#ff3a2a':gd?'#46ff6a':'#123a1a';c.beginPath();c.arc(x,y,10,0,7);c.fill();});
  // caution lamps
  const lowF=P.totalFuel<(P.ac.fuel||3000)*.15,cau=[[lb.fire,P.fire>0||P.hp<25],[lb.hyd,P.hp<45],[lb.low,lowF],[lb.eng,!run]];
  cau.forEach(([s,on],i)=>{const x=bx+214+(i%2)*46,y=by+78+Math.floor(i/2)*34;c.fillStyle=on?(i===0?'#ff3a2a':'#ffb21a'):'#2a2416';c.fillRect(x-21,y-13,42,26);T(s,x,y,s.length>6?7:9,on?'#200':'#7a6a40');});
  // scope / display labels under the screens
  if(B.L.scope){const[x,y,r]=B.L.scope;T(S.sc==='ph'?(S.l==='ru'?'РЛС':S.l==='zh'?'雷达':'RADAR'):'',x,y+r+18,11,dimInk);}
  if(B.L.rwr)T(B.S.l==='ru'?'СПО':S.l==='zh'?'告警':'RWR',B.L.rwr[0],B.L.rwr[1]+B.L.rwr[2]+15,10,dimInk);
  extra(B,P,c,T,dial,ticks,nums,ndl,ink,dimInk);}


// ---------- extra instruments, sub-panels, annunciators, gear handle (per-jet layouts) ----------
function extra(B,P,c,T,dial,ticks,nums,ndl,ink,dimInk){const S=B.S,L=B.L,lb=B.lb,ru=S.l==='ru',run=P.totalFuel>0,n=clamp(P.n||0,0,1.1),ab=P.ab||0;
  const lab=(r,s,y=.42)=>T(s,0,r*y,Math.max(8,Math.round(r*.15)),dimInk);
  const gauge=(k,v,txt,a0=-135,a1=135,nn=10)=>dial(k,r=>{ticks(r,a0,a1,nn,2);ndl(r,a0+(a1-a0)*clamp(v,0,1));lab(r,txt);});
  for(const k of Object.keys(L.dial)){const t=k.replace(/_.*$/,'');
    if(t==='oil')gauge(k,run?.35+n*.4:0,ru?'МАСЛО':'OIL PSI');
    else if(t==='hyd')gauge(k,run?.75+.02*Math.sin(performance.now()/900):0,ru?'ГИДРО':'HYD PSI');
    else if(t==='noz'||t==='noz2')gauge(k,ab>.02?.85:clamp(1-n,0,1)*.4,ru?'СОПЛО':'NOZ POS %');
    else if(t==='egt2')dial(k,r=>{ticks(r,-135,135,9,3);ndl(r,-135+270*clamp(run?.25+n*.55+ab*.15-.012:0,0,1));lab(r,lb.egt);});
    else if(t==='fpr')gauge(k,run?.3+n*.5:0,ru?'ДАВЛ ТОПЛ':'FUEL PRESS');
    else if(t==='oxy')gauge(k,.82,ru?'КИСЛОРОД':'OXYGEN');
    else if(t==='cab')gauge(k,clamp(P.pos.y/15000,0,1)*.6,ru?'ВЫСОТА КАБ':'CABIN ALT');
    else if(t==='lox')gauge(k,.7,ru?'КИСЛОРОД':'LOX');
    else if(t==='acc')dial(k,r=>{ticks(r,-150,150,15,5);nums(r,-150,150,[-5,0,5,10]);ndl(r,-150+300*clamp(((P.nz||1)+5)/15,0,1));ndl(r,-150+300*clamp(((P.maxNz||1)+5)/15,0,1),.7,'#e05040',2);lab(r,ru?'ПЕРЕГРУЗКА':'ACCEL G',.4);});
    else if(t==='mach')dial(k,r=>{ticks(r,-150,150,12,2);nums(r,-150,150,ru?['.5','.6','.7','.8','.9','1.0']:['.4','.8','1.2','1.6','2.0','2.4']);
      const m=P.mach||0,v=ru?(m-.5)/.5:(m-.4)/2;ndl(r,-150+300*clamp(v,0,1));lab(r,ru?'М':'MACH');});
    else if(t==='turn')dial(k,r=>{const rr=(P.yawRate!=null?P.yawRate:(P.angVel?P.angVel.y:0));ndl(r,clamp(-rr*R2D*12,-60,60),.8);
      c.fillStyle='#222';c.fillRect(-r*.55,r*.42,r*1.1,r*.22);c.fillStyle='#fff';c.beginPath();c.arc(clamp((P.beta||0)*R2D*-4,-r*.45,r*.45),r*.53,r*.09,0,7);c.fill();lab(r,ru?'ЭУП':'TURN',-.45);});
    else if(t==='cmp')dial(k,r=>{c.save();c.rotate(-(P.hdg||0)*D2R);for(let i=0;i<36;i++){c.save();c.rotate(i*10*D2R);c.fillStyle=ink;c.fillRect(-1,-r*.95,2,i%3?r*.08:r*.15);if(i%9===0)T(ru?['С','В','Ю','З'][i/9]:['N','E','S','W'][i/9],0,-r*.68,Math.round(r*.2));c.restore();}c.restore();
      let br=0;try{const tg=jets.find(j=>j!==P&&j.alive&&j.side!==P.side);if(tg)br=Math.atan2(tg.pos.x-P.pos.x,-(tg.pos.z-P.pos.z))*R2D-(P.hdg||0);}catch(e){}ndl(r,br,.85,'#e8c040',3);lab(r,ru?'АРК':'RADIO COMP',.35);});
    else if(t==='apc')dial(k,r=>{ticks(r,-120,120,8,2);ndl(r,-120+240*clamp(((P.alpha||0)*R2D)/25,0,1));c.strokeStyle='#e03030';c.lineWidth=5;c.beginPath();c.arc(0,0,r*.9,(-90+60)*D2R,(-90+120)*D2R);c.stroke();lab(r,'APC / AOA');});
    else if(t==='trim')gauge(k,.5,ru?'ТРИМ':'TRIM');
    else if(t==='lamp'){const[x,y,r]=L.dial[k];const on=k.includes('mach')?(P.mach||0)>.92:k.includes('fire')?(P.fire>0):false;c.fillStyle='#090909';c.beginPath();c.arc(x,y,r+4,0,7);c.fill();c.fillStyle=on?'#ff3a2a':'#4a1410';c.beginPath();c.arc(x,y,r,0,7);c.fill();}}
  // sub-panels with switches: [x,y,w,h,title,[switch labels]]
  for(const pl of L.plates||[]){const[x,y,w,h,ti,sw]=pl;c.fillStyle='rgba(0,0,0,.28)';c.fillRect(x,y,w,h);c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=2;c.strokeRect(x,y,w,h);
    T(ti,x+w/2,y+11,10,ink);(sw||[]).forEach((s,i)=>{const n2=sw.length,sx=x+w*(i+.5)/n2,sy=y+h*.58;c.fillStyle='#555';c.beginPath();c.arc(sx,sy,7,0,7);c.fill();c.fillStyle='#ddd';c.fillRect(sx-2,sy-15,4,14);T(s,sx,y+h-9,8,dimInk);});}
  // annunciator / caution grid: [x,y,cols,rows,cw,ch,[labels]]
  if(L.cau){const[x,y,cols,rows,cw,ch,items]=L.cau,lowF=P.totalFuel<(P.ac.fuel||3000)*.15;
    const lit=s=>/FIRE|ПОЖАР/.test(s)?P.fire>0||P.hp<25:/HYD|ГИДР/.test(s)?P.hp<45:/FUEL|ТОПЛ|ОСТАТ|BINGO/.test(s)?lowF:/GEN|ГЕН/.test(s)?!run:/OIL|МАСЛ/.test(s)?!run:false;
    items.forEach((s,i)=>{const cx=x+(i%cols)*cw,cy=y+Math.floor(i/cols)*ch,on=lit(s),red=/FIRE|ПОЖАР/.test(s);c.fillStyle=on?(red?'#ff3a2a':'#ffb21a'):'#2a2416';c.fillRect(cx+2,cy+2,cw-4,ch-4);T(s,cx+cw/2,cy+ch/2,s.length>8?7:9,on?'#200':'#7a6a40');});}
  // landing-gear handle with three lights: [x,y]
  if(L.gearH){const[x,y]=L.gearH;let gd=false;try{gd=P.ac.cockpit==='fulcrum'?!!sys.mig.gear:!!sys.v.gear;}catch(e){}
    c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x-40,y-50,80,112);c.fillStyle='#999';c.fillRect(x-4,y+(gd?0:-40),8,48);c.fillStyle=ru?'#d23a2a':'#e8e8e8';c.beginPath();c.arc(x,y+(gd?44:4),11,0,7);c.fill();
    [[x-24,y+56],[x,y+56],[x+24,y+56]].forEach(([a,b])=>{c.fillStyle=gd?'#46ff6a':'#123a1a';c.beginPath();c.arc(a,b-10,6,0,7);c.fill();});T(lb.gear,x,y-40,9,ink);}
  // armament block (master arm + selected weapon): [x,y,w]
  if(L.arm){const[x,y,w]=L.arm,armed=game.armPos===0,wn=game.wsel||'GUN';let cnt='';try{cnt=wn==='GUN'?String(P.gun.ammo):String(P.count(wn));}catch(e){}
    c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x,y,w,58);T(lb.arm,x+8,y+14,10,ink,'left');c.fillStyle=armed?'#ff4a2a':'#3a1612';c.fillRect(x+w-62,y+4,56,20);T(armed?'ARM':lb.safe,x+w-34,y+14,10,armed?'#fff':'#a08070');
    c.fillStyle='#000';c.fillRect(x+6,y+30,w-12,22);T(((typeof SN!=='undefined'&&SN[wn])||wn)+'  '+cnt,x+12,y+41,12,'#7dffa0','left');}
  // painted placards
  for(const[tx,x,y,sz,cl]of L.txt||[])T(tx,x,y,sz||10,cl||dimInk);}

// ---------- switching ----------
const boards={};let cur=null;const _sc=new THREE.Vector3();
// keep only the borrowed stick, throttle, pedals: walk down from the root and hide every branch that holds none of them
function keepObjs(o){const k=[o.stk,o.thr,o.eBoot];for(const pk of['pedV','pedE','pedR'])if(o[pk]&&o[pk].g)k.push(o[pk].g);return new Set(k.filter(Boolean));}
function sweep(o,B,hid){const keep=keepObjs(o),anc=new Set();for(const k of keep)for(let p=k.parent;p&&p!==o.root;p=p.parent)anc.add(p);
  const walk=n=>{for(const ch of n.children){if(ch===B.g||keep.has(ch))continue;if(anc.has(ch)){walk(ch);continue;}if(ch.visible){ch.visible=false;if(!hid.includes(ch))hid.push(ch);}}};walk(o.root);}
function deactivate(){if(!cur)return;cur.B.g.visible=false;for(const x of cur.hid)x.visible=true;const o=ck[cur.kind];if(cur.glass0)o.glass=cur.glass0;cur=null;}
function activate(id,kind){const o=ck[kind];if(!o)return;let B=boards[id];if(!B){try{B=boards[id]=build(id,kind);}catch(e){console.warn('[cwpit] build',id,e);return;}}
  const hid=[];sweep(o,B,hid);B.g.visible=true;o._ltN=0;o._lt=null;cur={id,kind,B,hid,glass0:o.glass};o.glass=B.glass;}
const _sel=selectCockpit;
selectCockpit=function(kind,pit){deactivate();const r=_sel(kind,pit);try{if(player&&PIT[player.type])activate(player.type,kind);}catch(e){console.warn('[cwpit]',e);}return r;};
// keep the borrowed board hidden (other modules may toggle their groups) and repaint the face ~20 Hz
for(const kind of['viper','fulcrum']){const o=ck[kind];if(!o||!o.anims)continue;
  o.anims.push(()=>{if(!cur||cur.kind!==kind||!player)return;if(!PIT[player.type]||cur.id!==player.type){deactivate();return;}
    sweep(o,cur.B,cur.hid);
    {const B=cur.B,cp=(src,dst)=>{if(!src)return;src.updateMatrixWorld(true);src.matrixWorld.decompose(dst.position,dst.quaternion,_sc);if(src.visible){src.visible=false;if(!cur.hid.includes(src))cur.hid.push(src);}};
      cp(o.stk,B.stkG);cp(o.thr,B.thrG);}
    if(!cur.B.g.visible)cur.B.g.visible=true;o.glass=cur.B.glass;
    const B=cur.B;if((B.t^=1))return;try{paint(B,player);B.tx.needsUpdate=true;}catch(e){}});}
window.CW_PIT=PIT;
})();
