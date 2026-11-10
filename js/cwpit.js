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
  scr(rwrC,'round',L.rwr[0],L.rwr[1],L.rwr[2],null);
  // side consoles and sills
  [-1,1].forEach(sd=>{box(g,.2,.09,.95,cm,sd*.43,-.66,-.16);box(g,.05,.16,1.3,dk,sd*.55,-.48,-.2);
    for(let i=0;i<4;i++)box(g,.14,.006,.16,LM(0x24282a),sd*.43,-.612,-.5+i*.2);});
  box(g,.3,.25,.3,dk,0,-.98,-.55);// pedestal under the panel
  return{g,cv,tx,S,L,glass,lb:LB[S.l]||LB.en,t:0};}

// panel layout in canvas px: [x, y, r]
function layout(S){const sc=!!S.sc,two=!!S.m2,L={dial:{}};
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
  T(B.S.l==='ru'?'СПО':S.l==='zh'?'告警':'RWR',B.L.rwr[0],B.L.rwr[1]+B.L.rwr[2]+15,10,dimInk);}

// ---------- switching ----------
const boards={};let cur=null;
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
    if(!cur.B.g.visible)cur.B.g.visible=true;o.glass=cur.B.glass;
    const B=cur.B;if((B.t^=1))return;try{paint(B,player);B.tx.needsUpdate=true;}catch(e){}});}
window.CW_PIT=PIT;
})();
