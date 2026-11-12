/* =====================================================================================================================
   ka50pit.js — Ka-50 "Black Shark" cockpit.
   Laid out from the DCS Ka-50 guide (panel overview, caution light panel, UV-26, weather protection / data link panels), the Black Shark 3
   flight manual (figures 6-9 / 6-10) and photographs of the real cabin (K-041 / Shkval monitor bay, right-hand systems console, left-hand
   start-up panel, collective and cyclic).
   Main instrument panel, left to right: left wing (master caution, G-meter, VVI, radar altimeter, IAS, ADI, rotor RPM, barometric altimeter, HSI,
   rotor pitch, landing gear), centre bay (ILS-31 HUD with its control panel, Shkval monitor, weapon control panel with the rounds counter),
   right wing (Ekran, standby attitude indicator, ABRIS moving map with its soft keys, engine RPM / EGT / fuel dials).
   Above the glare shield: weather protection panel, data link panel, caution / status lights, UV-26 countermeasure panel, laser warning light.
   Side consoles: right (electric, fuel pumps, fuel shut-off valves, radio, fire extinguisher, PVI-800 keypad), left (engine start panel,
   rotor brake, engine throttles on the collective).
   Needs game.js and heli.js.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof ck==='undefined'||typeof buildCockpit!=='function'||!window.HELI){console.warn('[ka50pit] game missing');return;}
const KP=.0014;                                            // metres per pixel of the 800 px wide reference picture of the panel
const PL=()=>typeof player!=='undefined'?player:null;
const hl=P=>P&&P.hl?P.hl:{Nr:0,Pe:0,Pa:1,run:false};
const TAU=Math.PI*2,D=Math.PI/180;
const out={root:new THREE.Group(),tex:[],lamps:[],anims:[],redraw:[],stat:[],faces:[],ctls:[]};
ckScene.add(out.root);const root=out.root;
const L=(c,sh=14)=>new THREE.MeshPhongMaterial({color:c,shininess:sh,specular:0x1a1a1a});
const grey=L(0x4b5049),dark=L(0x20231f),black=L(0x0c0d0d),panelM=L(0x262a28),consM=L(0x2b2f2c),alu=L(0x9aa0a0,60),redM=L(0xa01810,30),olive=L(0x3f4534),bezel=L(0x121414,30),wing=L(0x1d201f);
const add=(geo,mat,x,y,z,par=root,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);par.add(m);return m;};
const mkCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const mkTex=cv=>{const t=new THREE.CanvasTexture(cv);t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;out.tex.push(t);return t;};
const FONT='"B612 Mono","B612",monospace';
const EYE=new THREE.Vector3(0,.02,.05);
const gauges=[];

/* ---------------- groups: the instrument panel is a left wing, a centre bay and a right wing, the wings toed in toward the pilot ---------------- */
const dash=new THREE.Group();dash.position.set(0,-.47,-.74);dash.rotation.x=-.52;root.add(dash);
function wingG(cx,cy,wpx,hpx,yaw,mat=wing){const g=new THREE.Group();g.position.set((cx-400)*KP,(470-cy)*KP,0);g.rotation.y=yaw;dash.add(g);
  add(new THREE.BoxGeometry(wpx*KP,hpx*KP,.02),mat,0,0,-.01,g);return{g,p:(x,y)=>[(x-cx)*KP,(cy-y)*KP]};}
const LW=wingG(238,480,176,290,.17),CW=wingG(400,480,140,290,0,panelM),RW=wingG(562,480,184,290,-.17);
// a free-standing panel facing the pilot
function pnl(x,y,z,w,h,mat=panelM,par=root){const g=new THREE.Group();g.position.set(x,y,z);par.add(g);g.lookAt(EYE.x,EYE.y,EYE.z);add(new THREE.BoxGeometry(w,h,.016),mat,0,0,-.008,g);return g;}

/* ---------------- printed plates: legends painted on a canvas, drawn once ---------------- */
function plate(par,x,y,w,h,paint,z=.0012,ppu=1100,bgc=null){const cw=Math.max(8,Math.round(w*ppu)),ch=Math.max(8,Math.round(h*ppu)),cv=mkCanvas(cw,ch),c=cv.getContext('2d');
  if(bgc){c.fillStyle=bgc;c.fillRect(0,0,cw,ch);}paint(c,cw,ch);
  const m=new THREE.MeshBasicMaterial({map:mkTex(cv),transparent:!bgc,color:0xe2e2e2,toneMapped:false});out.faces.push(m);return add(new THREE.PlaneGeometry(w,h),m,x,y,z,par);}
const txt=(c,s,x,y,sz,col='#e6e9e4',al='center')=>{c.fillStyle=col;c.font=`700 ${sz}px ${FONT}`;c.textAlign=al;c.textBaseline='middle';c.fillText(s,x,y);};
const rule=(c,x0,y0,x1,y1,col='#d8dcd6',w=1.2)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();};
// toggle switch: a chrome lever on a round base, up or down
function tog(par,x,y,up=true,z=.002){const g=new THREE.Group();g.position.set(x,y,z);par.add(g);add(new THREE.CylinderGeometry(.0055,.0065,.005,10),alu,0,0,.002,g,Math.PI/2);
  const l=add(new THREE.CylinderGeometry(.0017,.0022,.016,6),alu,0,(up?1:-1)*.006,.008,g,0,0,0);l.rotation.x=(up?-1:1)*.55;add(new THREE.SphereGeometry(.0028,6,5),alu,0,(up?1:-1)*.0125,.0125,g);return g;}
// guarded red push button / cap
function cap(par,x,y,col=0xcc1e12,r=.0085){const g=new THREE.Group();g.position.set(x,y,.002);par.add(g);add(new THREE.CylinderGeometry(r,r*1.1,.008,14),L(col,40),0,0,.004,g,Math.PI/2);add(new THREE.SphereGeometry(r*.55,8,6),L(0xe8e8e0,50),0,0,.011,g);return g;}
// push-light / lamp window
function lampW(par,x,y,w,h,col,lit=false){const m=new THREE.MeshBasicMaterial({color:lit?col:new THREE.Color(col).multiplyScalar(.22),toneMapped:false});add(new THREE.BoxGeometry(w,h,.004),m,x,y,.003,par);return m;}
const knob=(par,x,y,r=.008,col=0x17191a)=>{const k=add(new THREE.CylinderGeometry(r,r*1.1,.01,14),L(col,60),x,y,.005,par,Math.PI/2);add(new THREE.BoxGeometry(r*.25,r*1.6,.002),alu,x,y,.0105,par);return k;};

/* ---------------- instruments: a canvas face per gauge, redrawn at about 15 Hz ---------------- */
function gauge(par,pos,r,draw,sq){const S=256,cv=mkCanvas(S,S),c=cv.getContext('2d'),t=mkTex(cv);
  const w=r*2*KP;
  add(new THREE.CylinderGeometry(w*.56,w*.56,.014,28),black,pos[0],pos[1],.007,par,Math.PI/2);
  add(new THREE.TorusGeometry(w*.52,w*.03,6,28),L(0x1b1d1d,50),pos[0],pos[1],.0148,par);
  const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false}),pl=add(sq?new THREE.PlaneGeometry(w,w):new THREE.CircleGeometry(w*.5,36),m,pos[0],pos[1],.0151,par);
  out.faces.push(m);gauges.push({c,S,t,draw,pl});return pl;}
function screen(par,pos,w,h,cw,ch,draw,bez=.006){const cv=mkCanvas(cw,ch),c=cv.getContext('2d'),t=mkTex(cv);
  add(new THREE.BoxGeometry(w+bez*2,h+bez*2,.016),bezel,pos[0],pos[1],.008,par);
  const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});add(new THREE.PlaneGeometry(w,h),m,pos[0],pos[1],.0165,par);out.faces.push(m);
  gauges.push({c,S:cw,H:ch,t,draw,pl:null});return m;}
const bg=(c,S,col='#0c0e0e')=>{c.setTransform(1,0,0,1,0,0);c.fillStyle=col;c.fillRect(0,0,S,S);};
// dial: angles in degrees clockwise from 12 o'clock
function dial(c,S,o){const cx=S/2,cy=S/2,R=S*.47,a0=o.a0*D,a1=o.a1*D,ang=v=>a0+(a1-a0)*(v-o.min)/(o.max-o.min);
  c.save();c.translate(cx,cy);c.strokeStyle=c.fillStyle='#e9ecea';c.lineCap='butt';
  for(let v=o.min;v<=o.max+1e-6;v+=o.minor){const a=ang(v),maj=Math.abs((v-o.min)/o.major-Math.round((v-o.min)/o.major))<1e-6;
    c.lineWidth=maj?S*.018:S*.01;c.beginPath();c.moveTo(Math.sin(a)*R*(maj?.82:.9),-Math.cos(a)*R*(maj?.82:.9));c.lineTo(Math.sin(a)*R,-Math.cos(a)*R);c.stroke();
    if(maj&&o.lab!==false){c.font=`700 ${S*.1}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';const rr=R*.66,t=o.fmt?o.fmt(v):String(v);c.fillText(t,Math.sin(a)*rr,-Math.cos(a)*rr);}}
  if(o.arcs)for(const [v0,v1,col] of o.arcs){c.strokeStyle=col;c.lineWidth=S*.03;c.beginPath();c.arc(0,0,R*.97,ang(v0)-Math.PI/2,ang(v1)-Math.PI/2);c.stroke();}
  if(o.title){c.fillStyle='#d8dcd9';c.font=`700 ${S*.065}px ${FONT}`;c.textAlign='center';c.fillText(o.title,0,S*.2);}
  c.restore();}
function needle(c,S,a,len=.8,w=.03,col='#f2f2ee',tail=.12){c.save();c.translate(S/2,S/2);c.rotate(a);c.fillStyle=col;c.beginPath();c.moveTo(-S*w*.5,S*tail*.5);c.lineTo(-S*w*.25,-S*.47*len);c.lineTo(S*w*.25,-S*.47*len);c.lineTo(S*w*.5,S*tail*.5);c.closePath();c.fill();
  c.fillStyle='#1b1d1d';c.beginPath();c.arc(0,0,S*.035,0,TAU);c.fill();c.restore();}
const lin=(v,a,b,A,B)=>A+(B-A)*Math.max(0,Math.min(1,(v-a)/(b-a)));

/* ================= LEFT WING: flight instruments, in the order of the guide's labelled picture ================= */
{const g=LW.g,p=LW.p;
 // master caution push-light and the lamp-test switch above the instruments
 {const [x,y]=p(150,392);lampW(g,x,y,.018,.032,0xff2a1a,false);plate(g,x,y+.03,.05,.014,(c,w,h)=>txt(c,'ВНИМАНИЕ',w/2,h/2,h*.6));}
 // G-meter (accelerometer)
 gauge(g,p(172,434),17,(c,S)=>{const P=PL();bg(c,S);dial(c,S,{min:-2,max:5,a0:-130,a1:130,major:1,minor:.5,fmt:v=>v});needle(c,S,lin(P?P.nz:1,-2,5,-130,130)*D);});
 // vertical speed (m/s, +-30)
 gauge(g,p(222,418),26,(c,S)=>{const P=PL();bg(c,S);const v=P?P.vel.y:0;
   dial(c,S,{min:-30,max:30,a0:-165,a1:165,major:10,minor:5,title:'ВВ',fmt:x=>Math.abs(x)});needle(c,S,lin(Math.max(-30,Math.min(30,v)),-30,30,-165,165)*D);});
 // radar altimeter (m)
 gauge(g,p(150,470),25,(c,S)=>{const P=PL();bg(c,S);const agl=P?Math.max(0,P.pos.y-groundAt(P.pos.x,P.pos.z)-(HELI.H['Ka-50'].gh)):0;
   dial(c,S,{min:0,max:30,a0:-160,a1:160,major:5,minor:1,title:'РВ',fmt:v=>v});needle(c,S,lin(Math.min(agl,30),0,30,-160,160)*D);
   if(agl>30){c.fillStyle='#e9ecea';c.font=`700 ${S*.12}px ${FONT}`;c.textAlign='center';c.fillText(Math.round(agl)+'',S/2,S*.78);}});
 // indicated airspeed (km/h)
 gauge(g,p(204,478),30,(c,S)=>{const P=PL();bg(c,S);dial(c,S,{min:0,max:400,a0:-150,a1:150,major:50,minor:10,title:'КМ/Ч',fmt:v=>v/10});needle(c,S,(lin(P?P.cas*1.852:0,0,400,-150,150))*D);});
 // ADI
 gauge(g,p(262,478),40,(c,S)=>adiFace(c,S,PL(),{slip:1}));
 // rotor rpm (%)
 gauge(g,p(160,540),25,(c,S)=>{const P=PL(),h=hl(P);bg(c,S);dial(c,S,{min:0,max:110,a0:-145,a1:145,major:10,minor:5,title:'НВ %',fmt:v=>v>=100?'':v/10,arcs:[[93,108,'#37c85a']]});needle(c,S,lin((h.Nr||0)*100,0,110,-145,145)*D);});
 // barometric altimeter (m)
 gauge(g,p(212,545),28,(c,S)=>{const P=PL(),alt=P?P.pos.y:0;bg(c,S);dial(c,S,{min:0,max:10,a0:0,a1:360-36,major:1,minor:.5,title:'М',fmt:v=>v});
   needle(c,S,(alt%1000)/1000*TAU,.82,.03);needle(c,S,Math.min(alt,9999)/10000*TAU,.5,.045,'#e6e0a0');
   c.fillStyle='#e9ecea';c.font=`700 ${S*.1}px ${FONT}`;c.textAlign='center';c.fillText(String(Math.round(alt)).padStart(4,' '),S/2,S*.82);});
 // HSI
 gauge(g,p(268,556),38,(c,S)=>hsiFace(c,S,PL()));
 // rotor pitch (collective) indicator
 gauge(g,p(186,594),22,(c,S)=>{const P=PL(),h=hl(P);bg(c,S);const deg=((h.th||0)*180/Math.PI);dial(c,S,{min:0,max:24,a0:-120,a1:120,major:4,minor:2,title:'ОБЩ ШАГ',fmt:v=>v});needle(c,S,lin(deg,0,24,-120,120)*D);});
 // clock
 gauge(g,p(148,598),20,(c,S)=>{bg(c,S);const d=new Date();dial(c,S,{min:0,max:12,a0:0,a1:360-30,major:1,minor:1,fmt:v=>v===0?12:v});
   const hr=(d.getHours()%12+d.getMinutes()/60)/12*TAU,mn=(d.getMinutes()+d.getSeconds()/60)/60*TAU,sc=d.getSeconds()/60*TAU;needle(c,S,hr,.5,.05,'#e6e6e0',0);needle(c,S,mn,.8,.035,'#e6e6e0',0);needle(c,S,sc,.85,.012,'#e8a020',.1);});
 // low rotor RPM "zebra" warning push-light (below 85 %)
 {const [x,y]=p(132,508);const m=lampW(g,x,y,.03,.012,0xd8b000,false);gauges.push({c:null,draw:()=>{const P=PL(),h=hl(P);m.color.set((h.Nr||0)<.85&&(h.Nr||0)>.2&&!(P&&P.onGnd)?0xffc800:0x3c3000);},t:{needsUpdate:0}});}
 // landing gear position indicator (three green lamps) and the gear lever label
 {const [x,y]=p(132,560);add(new THREE.BoxGeometry(.034,.07,.012),black,x,y,.006,g);for(let i=0;i<3;i++)add(new THREE.CylinderGeometry(.0042,.0042,.004,8),L(0x2fbf4a),x-.008+i*.008,y+.018,.013,g,Math.PI/2);
   plate(g,x,y-.015,.034,.02,(c,w,h)=>{txt(c,'ШАССИ',w/2,h*.3,h*.38);txt(c,'ВЫП ✓',w/2,h*.75,h*.32,'#7be08e');});}
 // screws on the bezel corners
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])add(new THREE.CylinderGeometry(.0028,.0028,.004,6),alu,sx*(88*KP-.006),sy*(145*KP-.006),.011,g,Math.PI/2);
}
/* ADI and HSI faces */
function adiFace(c,S,P,opt){bg(c,S,'#000');const cx=S/2,cy=S/2,R=S*.46;c.save();c.beginPath();c.arc(cx,cy,R,0,TAU);c.clip();
  const pit=P?P.pitch:0,bank=P?P.bank:0;c.translate(cx,cy);c.rotate(-bank);const py=pit*R/(35*D);
  c.fillStyle='#3a79c9';c.fillRect(-S,-S*2+py,S*2,S*2);c.fillStyle='#8a5a2c';c.fillRect(-S,py,S*2,S*2);
  c.strokeStyle='#fff';c.lineWidth=S*.012;c.beginPath();c.moveTo(-S,py);c.lineTo(S,py);c.stroke();
  c.font=`700 ${S*.07}px ${FONT}`;c.fillStyle='#fff';c.textAlign='center';
  for(let a=-30;a<=30;a+=10){if(!a)continue;const y=py-a*D*R/(35*D);c.beginPath();c.moveTo(-S*.1,y);c.lineTo(S*.1,y);c.stroke();c.fillText(Math.abs(a),S*.17,y+S*.025);}
  c.restore();c.save();c.translate(cx,cy);c.strokeStyle='#f6b300';c.lineWidth=S*.03;c.beginPath();c.moveTo(-S*.28,0);c.lineTo(-S*.1,0);c.lineTo(-S*.1,S*.05);c.moveTo(S*.28,0);c.lineTo(S*.1,0);c.lineTo(S*.1,S*.05);c.stroke();
  c.fillStyle='#f6b300';c.beginPath();c.arc(0,0,S*.018,0,TAU);c.fill();
  c.strokeStyle='#fff';c.lineWidth=S*.012;for(const a of[-60,-45,-30,-20,-10,0,10,20,30,45,60]){const t=a*D;c.beginPath();c.moveTo(Math.sin(t)*R*.97,-Math.cos(t)*R*.97);c.lineTo(Math.sin(t)*R*(a%30===0?.86:.91),-Math.cos(t)*R*(a%30===0?.86:.91));c.stroke();}
  c.rotate(-bank);c.fillStyle='#f6b300';c.beginPath();c.moveTo(0,-R*.97);c.lineTo(-S*.03,-R*.85);c.lineTo(S*.03,-R*.85);c.closePath();c.fill();c.restore();
  if(opt&&opt.slip){const sl=P?Math.max(-1,Math.min(1,-P.beta*6)):0;c.fillStyle='#e9ecea';c.beginPath();c.arc(cx+sl*S*.18,S*.92,S*.025,0,TAU);c.fill();}}
function hsiFace(c,S,P){bg(c,S);const hd=P?P.hdg:0,cx=S/2,R=S*.47;c.save();c.translate(cx,cx);c.rotate(-hd*D);
  c.strokeStyle=c.fillStyle='#e9ecea';c.font=`700 ${S*.09}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';
  for(let a=0;a<360;a+=5){const t=a*D,maj=a%10===0;c.lineWidth=S*(a%30===0?.016:.008);c.beginPath();c.moveTo(Math.sin(t)*R*(maj?.86:.92),-Math.cos(t)*R*(maj?.86:.92));c.lineTo(Math.sin(t)*R,-Math.cos(t)*R);c.stroke();
    if(a%30===0){c.save();c.translate(Math.sin(t)*R*.68,-Math.cos(t)*R*.68);c.rotate(t);c.fillText(a===0?'С':a===90?'В':a===180?'Ю':a===270?'З':String(a/10),0,0);c.restore();}}
  const brg=P?(Math.atan2(AF.x-P.pos.x,-(AF.z-P.pos.z))):0;c.strokeStyle='#f6b300';c.lineWidth=S*.02;c.rotate(brg);c.beginPath();c.moveTo(0,-R*.82);c.lineTo(0,-R*.3);c.moveTo(0,R*.3);c.lineTo(0,R*.82);c.stroke();c.restore();
  c.fillStyle='#f6b300';c.beginPath();c.moveTo(cx,cx-R*1.0);c.lineTo(cx-S*.03,cx-R*.88);c.lineTo(cx+S*.03,cx-R*.88);c.closePath();c.fill();
  c.strokeStyle='#e9ecea';c.lineWidth=S*.02;c.beginPath();c.moveTo(cx-S*.1,cx);c.lineTo(cx+S*.1,cx);c.moveTo(cx,cx-S*.08);c.lineTo(cx,cx+S*.1);c.stroke();}

/* ================= CENTRE BAY: HUD control panel, Shkval monitor, weapon control panel ================= */
{const g=CW.g,p=CW.p;
 // ILS-31 control panel under the HUD combiner: mode knob, test button, brightness knobs, small toggles
 {const [x,y]=p(400,352);add(new THREE.BoxGeometry(150*KP,36*KP,.02),bezel,x,y,.004,g);
  plate(g,x,y,150*KP,36*KP,(c,w,h)=>{txt(c,'ИЛС-31',w*.5,h*.2,h*.2,'#cfd4cc');for(const [fx,s] of [[.14,'ЯРК'],[.34,'ТЕСТ'],[.66,'РЕЖ'],[.86,'КОНТР']])txt(c,s,w*fx,h*.88,h*.16,'#cfd4cc');},.013);
  knob(g,x-56*KP,y-2*KP,.008);knob(g,x+56*KP,y-2*KP,.008);cap(g,x-18*KP,y-2*KP,0x2a2a28,.006);tog(g,x+20*KP,y-2*KP,true,.013);}
 // Shkval monitor: green-grey CRT in its bezel with the control row underneath
 {const [x,y]=p(400,456);
  screen(g,[x,y],128*KP,76*KP,256,152,(c,S)=>{const t=performance.now()/1000;c.setTransform(1,0,0,1,0,0);c.fillStyle='#8c9486';c.fillRect(0,0,256,152);
    for(let i=0;i<152;i+=2){c.fillStyle='rgba(30,40,30,.18)';c.fillRect(0,i,256,1);}
    for(let i=0;i<90;i++){const a=Math.sin(i*12.9898+Math.floor(t*8)*78.233)*43758.5453;c.fillStyle=`rgba(${60+(a%1+1)*40|0},${70+(a%1+1)*40|0},60,.10)`;c.fillRect((a%1+1)*127,((a*7)%1+1)*76,2,1);}
    c.strokeStyle='#1a211a';c.lineWidth=1.6;c.beginPath();c.moveTo(118,76);c.lineTo(100,76);c.moveTo(138,76);c.lineTo(156,76);c.moveTo(128,66);c.lineTo(128,60);c.moveTo(128,86);c.lineTo(128,92);c.stroke();
    c.beginPath();c.moveTo(28,40);c.lineTo(52,40);c.moveTo(204,40);c.lineTo(228,40);c.stroke();
    c.fillStyle='#161d16';c.font=`700 14px ${FONT}`;c.textAlign='left';const P=PL();c.fillText('+'+Math.round(P?Math.max(0,P.pos.y-groundAt(P.pos.x,P.pos.z)):0),8,16);},.007);
  // two knobs and a switch under the monitor (contrast / brightness / mode)
  for(const [dx,s] of [[-46,'ЯРК'],[0,'КОНТР'],[46,'ЧЕТК']]){knob(g,x+dx*KP,y-52*KP,.0075);plate(g,x+dx*KP,y-64*KP,.03,.008,(c,w,h)=>txt(c,s,w/2,h/2,h*.7,'#b9bdb5'));}}
 // weapon control panel: rounds counter (red 7-segment style), ATGM / gun / rocket selectors
 {const [x,y]=p(400,552);add(new THREE.BoxGeometry(142*KP,64*KP,.02),bezel,x,y,.004,g);
  const cv=mkCanvas(96,48),c=cv.getContext('2d'),t=mkTex(cv),m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});out.faces.push(m);
  add(new THREE.PlaneGeometry(38*KP,20*KP),m,x-46*KP,y+10*KP,.0145,g);
  gauges.push({c,S:96,H:48,t,draw:(c)=>{const P=PL();c.setTransform(1,0,0,1,0,0);c.fillStyle='#020405';c.fillRect(0,0,96,48);const n=P&&P.hl?(P.gun?P.gun.ammo:0):0;
    c.fillStyle='#35e0a8';c.font=`700 34px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(String(Math.min(99,Math.round((P&&P.gun?P.gun.ammo:0)/10))).padStart(2,'0'),48,26);c.font=`700 9px ${FONT}`;c.fillStyle='#8aa';c.fillText('RNDS',48,6);}});
  plate(g,x,y,142*KP,64*KP,(c,w,h)=>{txt(c,'ОРУЖИЕ',w*.5,h*.1,h*.12,'#cfd4cc');for(const [fx,fy,s] of [[.62,.3,'ПУШКА'],[.82,.3,'АБН'],[.62,.78,'НАР'],[.82,.78,'УР']])txt(c,s,w*fx,h*fy,h*.1,'#cfd4cc');},.0135);
  knob(g,x+26*KP,y+8*KP,.0075);knob(g,x+50*KP,y+8*KP,.0075);tog(g,x+26*KP,y-16*KP,true,.0135);tog(g,x+50*KP,y-16*KP,false,.0135);
  cap(g,x-20*KP,y-20*KP,0xd02a1a,.006);}
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])add(new THREE.CylinderGeometry(.0028,.0028,.004,6),alu,sx*(70*KP-.006),sy*(145*KP-.006),.011,g,Math.PI/2);
}

/* ================= RIGHT WING: Ekran, standby attitude indicator, ABRIS, engine instruments ================= */
{const g=RW.g,p=RW.p;
 // Ekran: the text display of the system warnings (dark, orange legends)
 {const [x,y]=p(498,395);
  screen(g,[x,y],46*KP,36*KP,184,144,(c)=>{const P=PL(),h=hl(P);c.setTransform(1,0,0,1,0,0);c.fillStyle='#050805';c.fillRect(0,0,184,144);c.font=`700 15px ${FONT}`;c.fillStyle='#ffb030';c.textAlign='left';
    const msgs=[];if(P){if((h.Nr||0)<.88&&(h.Nr||0)>.3&&!P.onGnd)msgs.push('ОБОРОТЫ НВ МАЛЫ');if((h.Nr||0)>1.1)msgs.push('ОБОРОТЫ НВ ВЕЛИКИ');if(P.totalFuel<250)msgs.push('ОСТАТОК ТОПЛИВА');if(P.hp<50)msgs.push('ПОВРЕЖДЕНИЕ');if(!h.run)msgs.push('ДВИГАТЕЛИ ВЫКЛ');}
    if(!msgs.length)msgs.push('');msgs.slice(0,7).forEach((s,i)=>c.fillText(s,6,20+i*18));},.005);}
 // standby attitude indicator (round, to the right of the Ekran)
 gauge(g,p(548,398),22,(c,S)=>adiFace(c,S,PL()));
 // ABRIS moving map: 5 inch portrait display, a page header, the map, a data table at the bottom, soft keys underneath
 {const [x,y]=p(534,484),W=112*KP,H=128*KP;
  screen(g,[x,y],W,H,280,320,(c)=>{const P=PL();c.setTransform(1,0,0,1,0,0);c.fillStyle='#d9ca8c';c.fillRect(0,0,280,320);
    if(!P){return;}
    c.save();c.beginPath();c.rect(0,24,280,200);c.clip();c.translate(140,124);c.rotate(-P.hdg*D);
    const ox=-P.pos.x/60,oz=-P.pos.z/60;c.fillStyle='#8fd0dc';c.beginPath();c.ellipse(ox-380,oz+260,520,300,0,0,TAU);c.fill();c.beginPath();c.ellipse(ox+620,oz-500,380,260,0,0,TAU);c.fill();
    c.strokeStyle='#b9a65e';c.lineWidth=2;for(let i=-8;i<=8;i++){c.beginPath();c.moveTo(ox+i*90,-700);c.lineTo(ox+i*90,700);c.moveTo(-700,oz+i*90);c.lineTo(700,oz+i*90);c.stroke();}
    c.fillStyle='#e6c200';c.beginPath();c.arc((AF.x-P.pos.x)/60,(AF.z-P.pos.z)/60,6,0,TAU);c.fill();c.strokeStyle='#1c37e0';c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo((AF.x-P.pos.x)/60,(AF.z-P.pos.z)/60);c.stroke();c.restore();
    c.fillStyle='#0a0a0a';c.beginPath();c.moveTo(140,102);c.lineTo(132,132);c.lineTo(140,126);c.lineTo(148,132);c.closePath();c.fill();
    c.fillStyle='#101810';c.fillRect(0,0,280,24);c.font=`700 14px ${FONT}`;c.fillStyle='#4dff6a';c.textAlign='left';c.fillText('ПЛАН',8,13);c.textAlign='center';c.fillStyle='#ffe040';c.fillText('EXCL 3D',140,13);
    c.textAlign='right';c.fillStyle='#e8f0e8';const d=new Date();c.fillText(String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0'),272,13);
    c.fillStyle='#050805';c.fillRect(0,224,280,96);c.strokeStyle='#4a5a4a';c.lineWidth=1;for(let i=0;i<5;i++){c.beginPath();c.moveTo(0,244+i*18);c.lineTo(280,244+i*18);c.stroke();}
    c.font=`700 11px ${FONT}`;c.textAlign='left';c.fillStyle='#d8e8d8';c.fillText('КУРС  ПУ  GS КМ/Ч  ВЫС  ДАЛЬН',6,236);
    const gs=Math.round(Math.hypot(P.vel.x,P.vel.z)*3.6),dst=Math.hypot(AF.x-P.pos.x,AF.z-P.pos.z);c.fillStyle='#4dff6a';c.fillText(String(Math.round(P.hdg)).padStart(3,'0')+'°  '+String(Math.round(((Math.atan2(AF.x-P.pos.x,-(AF.z-P.pos.z))*180/Math.PI)+360)%360)).padStart(3,'0')+'°  '+String(gs).padStart(3,' ')+'    '+String(Math.round(P.pos.y)).padStart(4,' ')+'  '+(dst/1000).toFixed(1),6,254);
    c.fillStyle='#d8e8d8';c.fillText('ВЫБОР  ПРАВКА  АКТИВ  МЕНЮ',8,308);},.006);
  // soft keys under the display (five chevrons) and a knob at each end
  for(let i=0;i<5;i++){const bx=x+(-46+i*23)*KP;add(new THREE.BoxGeometry(14*KP,7*KP,.008),L(0x16191a,30),bx,y-82*KP,.006,g);plate(g,bx,y-82*KP,14*KP,7*KP,(c,w,h)=>txt(c,'^',w/2,h/2,h*.9,'#8bd49a'),.0105);}
  knob(g,x-58*KP,y-86*KP,.0075);knob(g,x+58*KP,y-86*KP,.0075);
  plate(g,x-60*KP,y+72*KP,.012,.01,(c,w,h)=>txt(c,'АБРИС',w/2,h/2,h*.5),.01,600);}
 // engine instruments: dual engine RPM, dual EGT, fuel quantity, in a column on the right edge
 gauge(g,p(634,430),27,(c,S)=>{const P=PL(),h=hl(P);bg(c,S);dial(c,S,{min:0,max:110,a0:-140,a1:140,major:10,minor:5,title:'ОБ/МИН %',fmt:v=>v/10,arcs:[[93,100,'#37c85a']]});
   const n=(h.run&&h.start<=0?(P.n||0)*100:0);needle(c,S,lin(n*1.0,0,110,-140,140)*D,.85,.03,'#f2f2ee');needle(c,S,lin(n*.995,0,110,-140,140)*D,.7,.025,'#e8a020');});
 for(const sx of[-1,1])gauge(g,p(612+sx*17+17,486),19,(c,S)=>{const P=PL(),h=hl(P);bg(c,S);dial(c,S,{min:0,max:1000,a0:-135,a1:135,major:200,minor:100,lab:false});
   const t=h.run?300+560*Math.min(1,(h.Pe||0)/Math.max(1,h.Pa||1)):Math.max(20,20+(h.Nr||0)*200);needle(c,S,lin(t,0,1000,-135,135)*D);});
 gauge(g,p(634,548),24,(c,S)=>{const P=PL();bg(c,S);dial(c,S,{min:0,max:2000,a0:-135,a1:135,major:500,minor:100,title:'ТОПЛ КГ',fmt:v=>v/100});needle(c,S,lin(P?P.totalFuel:0,0,2000,-135,135)*D);});
 // engine power indicator strip (bottom right)
 {const [x,y]=p(628,596);plate(g,x,y,.08,.016,(c,w,h)=>{txt(c,'РЕЖИМ ДВ',w*.2,h/2,h*.45);for(let i=0;i<3;i++)txt(c,['Л','ПР','ВСУ'][i],w*(.5+i*.2),h/2,h*.45,'#c8d0c8');},.005,500);}
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])add(new THREE.CylinderGeometry(.0028,.0028,.004,6),alu,sx*(92*KP-.006),sy*(145*KP-.006),.011,g,Math.PI/2);
}

/* ================= glare shield, ILS-31 combiner, overhead panels ================= */
const hudG=new THREE.Group();hudG.position.set(0,-.07,-.86);root.add(hudG);
add(new THREE.BoxGeometry(.2,.03,.07),dark,0,-.105,-.012,hudG);                    // the unit housing under the glass
for(const sx of[-1,1]){add(new THREE.BoxGeometry(.007,.19,.008),black,sx*.098,.005,-.004,hudG,0,0,sx*-.06);add(new THREE.BoxGeometry(.012,.02,.012),alu,sx*.098,-.09,-.004,hudG);}
add(new THREE.BoxGeometry(.2,.007,.014),black,0,.098,-.004,hudG);                  // top bar of the combiner frame
{const gm=new THREE.MeshPhongMaterial({color:0x9fc6b6,transparent:true,opacity:.07,shininess:90,depthWrite:false});add(new THREE.PlaneGeometry(.18,.16),gm,0,.005,-.002,hudG);}
hudG.updateMatrixWorld(true);
out.glass=out.glass0=[[-.09,.08],[.09,.08],[.09,-.075],[-.09,-.075]].map(([x,y])=>new THREE.Vector3(x,y,0).applyMatrix4(hudG.matrixWorld));
// glare shield with the sun visor of the HUD
add(new THREE.BoxGeometry(1.0,.03,.22),dark,0,-.2,-.92,root,.1);
// overhead strip: the panels along the top of the windscreen, tilted toward the pilot's eyes
const ovh=(x,y,w,h)=>{const g=pnl(x,.37+y,-.70,w,h,L(0x1c1f1d));return g;};
{ // weather protection panel
 const g=ovh(-.12,.07,.44,.07);const W=.44,H=.07;
 plate(g,0,0,W,H,(c,w,h)=>{c.fillStyle='#161816';c.fillRect(0,0,w,h);txt(c,'ЗАЩИТА ОТ ПЫЛИ И ОБЛЕДЕНЕНИЯ',w*.5,h*.14,h*.1,'#d4d8d0');
   const items=['ПИТО ЛЕВ','ПИТО ПРАВ','ОБОГРЕВ СТЕКОЛ','ЩЁТКА','ПЫЛЕЗАЩ','ПОС','ВЕНТ'];items.forEach((s,i)=>{const fx=.08+i*.14;txt(c,s,w*fx,h*.42,h*.085,'#c9cec6');rule(c,w*fx,h*.52,w*fx,h*.6,'#8a8f88',1);});},.009,1300);
 for(let i=0;i<7;i++)tog(g,(-.19+i*.0615),-.012,i%3!==1,.01);}
{ // data link control panel with its keypad
 const g=ovh(-.38,-.03,.17,.09);
 plate(g,0,0,.17,.09,(c,w,h)=>{c.fillStyle='#14181a';c.fillRect(0,0,w,h);txt(c,'ПЕРЕДАЧА ДАННЫХ',w/2,h*.1,h*.09,'#cfd4cc');for(let r=0;r<2;r++)for(let k=0;k<6;k++){const bx=w*(.09+k*.165),by=h*(.34+r*.28);c.fillStyle='#223a30';c.fillRect(bx-w*.06,by-h*.1,w*.12,h*.2);txt(c,r?['1','2','3','4','ОЧИСТ','ПЕРЕД'][k]:['ВСЕМ','','','','СБРОС','ДАЛЬ'][k],bx,by,h*.085,'#8be0a8');}},.009,1100);}
{ // caution / status lights: two matrices of legend windows
 const g=ovh(.02,-.03,.36,.075);
 plate(g,0,0,.36,.075,(c,w,h)=>{c.fillStyle='#0d0f0d';c.fillRect(0,0,w,h);
   const A=[['ОСН ГЕНА','ЛЕВ ДВ ПРОТ','ПРАВ ДВ ПРОТ','ПЕРЕД БАК','ЗАДН БАК','КРАН ЛЕВ'],['ВЫКЛ ИНВ','ЛЕВ ЛИМ','ПРАВ ЛИМ','ЛЕВ ВНЕШ','ПРАВ ВНЕШ','КРАН ПР'],['ШКВАЛ ОТК','ВСУ','КОМП ОТК','ИЛС НЕ ГОТ','ОБОГРЕВ','ВНЕШ БАК']];
   A.forEach((row,r)=>row.forEach((s,k)=>{const bx=w*(.02+k*.158),by=h*(.06+r*.31);c.fillStyle='#1f2a1c';c.fillRect(bx,by,w*.145,h*.26);c.strokeStyle='#3d4d38';c.lineWidth=1;c.strokeRect(bx,by,w*.145,h*.26);txt(c,s,bx+w*.0725,by+h*.13,h*.07,'#6f8f66');}));},.009,1400);
 tog(g,.18,.035,true,.01);}
{ // UV-26 countermeasure panel: red 3-digit quantity display, program selector, RESET PROG, STOP, START
 const g=ovh(.31,.0,.085,.12);
 plate(g,0,0,.085,.12,(c,w,h)=>{c.fillStyle='#15181a';c.fillRect(0,0,w,h);txt(c,'УВ-26',w/2,h*.07,h*.06,'#d4d8d0');c.fillStyle='#1a0505';c.fillRect(w*.12,h*.12,w*.76,h*.2);txt(c,String(64).padStart(3,'0'),w*.5,h*.23,h*.17,'#ff2a1a');
   c.fillStyle='#1b3a8a';c.fillRect(w*.1,h*.4,w*.35,h*.14);c.fillRect(w*.55,h*.4,w*.35,h*.14);txt(c,'Л',w*.275,h*.47,h*.07);txt(c,'ПР',w*.725,h*.47,h*.07);
   c.fillStyle='#173a2a';c.fillRect(w*.1,h*.6,w*.35,h*.14);txt(c,'СТОП',w*.275,h*.67,h*.06,'#8be0a8');c.fillStyle='#8a1a14';c.fillRect(w*.55,h*.6,w*.35,h*.14);txt(c,'ПУСК',w*.725,h*.67,h*.06,'#ffd2c8');txt(c,'ПРОГ',w*.5,h*.88,h*.06,'#cfd4cc');},.009,1200);}
{ // laser warning indicator (SPO-15 / L-140) and its lamp, left of the HUD
 const g=ovh(-.30,-.1,.035,.045);lampW(g,0,.008,.012,.008,0xff7a10,false);lampW(g,0,-.006,.012,.008,0xff2a1a,false);}
{ // form light brightness
 const g=ovh(-.40,.07,.07,.03);plate(g,0,0,.07,.03,(c,w,h)=>txt(c,'ЯРКОСТЬ ПОДСВ',w/2,h*.2,h*.14,'#cfd4cc'),.009,1100);knob(g,0,-.004,.007);}

/* ================= right console: electric, fuel, radio, fire extinguishers, PVI-800 ================= */
{const g=new THREE.Group();g.position.set(.5,-.52,-.34);g.scale.setScalar(.85);root.add(g);g.lookAt(EYE.x-.2,EYE.y-.1,EYE.z-.1);g.rotation.z+=.1;
 add(new THREE.BoxGeometry(.38,.2,.02),consM,0,0,-.01,g);
 plate(g,0,0,.38,.2,(c,w,h)=>{c.fillStyle='#1a1d1b';c.fillRect(0,0,w,h);c.fillStyle='#d8dcd4';
   // frame lines and block titles, as on the painted panel
   rule(c,w*.04,h*.46,w*.58,h*.46);rule(c,w*.31,h*.2,w*.31,h*.9);rule(c,w*.58,h*.2,w*.58,h*.9);rule(c,w*.31,h*.62,w*.58,h*.62);
   txt(c,'ЭНЕРГЕТИКА',w*.12,h*.52,h*.04);txt(c,'ТОПЛИВО',w*.44,h*.52,h*.04);txt(c,'ПЕРЕКР. КРАНЫ',w*.7,h*.52,h*.04);txt(c,'РАДИО',w*.12,h*.88,h*.04);txt(c,'СИСТЕМА ПОЖАРОТУШЕНИЯ',w*.3,h*.1,h*.045);
   const lab=(a,fx,fy)=>a.forEach((s,i)=>txt(c,s,w*(fx+i*.065),h*fy,h*.027,'#c9cec6'));
   lab(['ВНЕШ','АК1','АК2','ГЕН Л','ГЕН П'],.06,.6);lab(['ПЕРЕД','ЗАДН','ВНУТР','ВНЕШ','ИЗМ'],.34,.6);lab(['ЛЕВ','ПРАВ','ВСУ','КОЛЬЦ'],.62,.6);lab(['СПУ','УКВ-1','УКВ-2','ПДСВ','Р-828'],.06,.95);
   txt(c,'ГИДРО ОСН',w*.86,h*.2,h*.034);txt(c,'КОНТР ЗАП',w*.86,h*.5,h*.034);},.0012,1500);
 // switch rows (the toggles that carry the legends above)
 for(let i=0;i<5;i++){tog(g,-.17+i*.0245,-.012,i!==3);tog(g,-.07+i*.0245,-.012,i<2||i===4);}
 for(let i=0;i<4;i++)tog(g,.04+i*.0245,-.012,false);
 for(let i=0;i<5;i++)tog(g,-.17+i*.0245,-.085,i%2===0);
 // four red guarded fire-extinguisher buttons and the system test toggles
 for(const [dx,dy] of [[-.06,.075],[-.035,.075],[.0,.075],[.025,.075]])cap(g,dx-.04,dy,0xd01c10);
 for(let i=0;i<2;i++)lampW(g,.07+i*.025,.078,.018,.012,0xffa020,false);
 tog(g,.15,.07,true);tog(g,.15,.012,false);
 // black / red hazard guard of the eject system switch
 {const gm=add(new THREE.BoxGeometry(.04,.03,.004),L(0xb03020),.12,-.075,.006,g);gm.rotation.z=.15;}
 // lower-left: PVI-800 navigation keypad with its red digital display and blue selector buttons
 const kp=new THREE.Group();kp.position.set(-.13,-.15,.0);g.add(kp);add(new THREE.BoxGeometry(.13,.07,.016),dark,0,0,-.004,kp);
 plate(kp,0,0,.13,.07,(c,w,h)=>{c.fillStyle='#0b0d0c';c.fillRect(0,0,w,h);c.fillStyle='#2a0505';c.fillRect(w*.04,h*.08,w*.4,h*.2);txt(c,'42500',w*.24,h*.18,h*.16,'#ff3020');
   const keys=['1','2','3','4','5','6','7','8','9','ВВОД','0','СБР'];keys.forEach((s,i)=>{const bx=w*(.14+(i%4)*.11),by=h*(.45+Math.floor(i/4)*.2);c.fillStyle='#2b4a3a';c.fillRect(bx-w*.04,by-h*.08,w*.08,h*.16);txt(c,s,bx,by,h*.1,'#9be8b6');});
   for(let i=0;i<4;i++){c.fillStyle='#1d3a86';c.fillRect(w*(.62+(i%2)*.16),h*(.1+Math.floor(i/2)*.3),w*.12,h*.2);txt(c,['К','Т','В','Н'][i],w*(.68+(i%2)*.16),h*(.2+Math.floor(i/2)*.3),h*.12,'#cfe0ff');}},.009,1100);
 // ПНК mode knobs next to it
 knob(g,-.03,-.15,.011);knob(g,.01,-.15,.009);knob(g,.05,-.15,.009);
}
/* ================= left console: engine start panel, rotor brake lever, engine throttles ================= */
{const g=new THREE.Group();g.position.set(-.5,-.52,-.30);g.scale.setScalar(.85);root.add(g);g.lookAt(EYE.x+.2,EYE.y-.12,EYE.z-.1);g.rotation.z-=.1;
 add(new THREE.BoxGeometry(.2,.22,.02),consM,0,0,-.01,g);
 plate(g,0,0,.2,.22,(c,w,h)=>{c.fillStyle='#1a1d1b';c.fillRect(0,0,w,h);txt(c,'ЗАПУСК',w*.3,h*.07,h*.045,'#d4d8d0');txt(c,'ОСТАНОВ',w*.72,h*.07,h*.045,'#d4d8d0');
   txt(c,'ЛЕВ',w*.2,h*.5,h*.035);txt(c,'ПРАВ',w*.5,h*.5,h*.035);txt(c,'ВСУ',w*.8,h*.5,h*.035);txt(c,'ЛОЖНЫЙ ЗАПУСК',w*.5,h*.34,h*.035,'#c9cec6');
   c.fillStyle='#16261a';for(let i=0;i<3;i++){c.fillRect(w*(.1+i*.28),h*.58,w*.2,h*.1);txt(c,['ПИТАНИЕ','ПЛС','ВЫКЛ'][i],w*(.2+i*.28),h*.63,h*.04,'#8be0a8');}
   txt(c,'ТОРМОЗ НВ',w*.3,h*.9,h*.04);txt(c,'РУД',w*.75,h*.9,h*.04);},.0012,1200);
 for(let i=0;i<3;i++)lampW(g,-.07+i*.045,.075,.022,.012,0x39ff7a,false);cap(g,.07,.075,0xd01c10,.01);
 tog(g,-.05,.02,true);tog(g,0,.02,true);knob(g,.06,.015,.011);
 for(let i=0;i<4;i++)lampW(g,-.07+i*.05,-.03,.025,.014,i%2?0x39ff7a:0xffb030,false);
 // rotor brake lever and the two engine throttle levers (black with red knobs)
 add(new THREE.BoxGeometry(.012,.06,.012),black,-.06,-.075,.01,g);add(new THREE.SphereGeometry(.009,8,6),redM,-.06,-.1,.012,g);
 for(const sx of[-1,1]){add(new THREE.BoxGeometry(.011,.06,.011),black,.04+sx*.02,-.075,.01,g);add(new THREE.SphereGeometry(.009,8,6),L(0x9c1a10,30),.04+sx*.02,-.1,.012,g);}
}

/* ---------------- shell: dashboard top, consoles, floor, seat, windscreen frame ---------------- */
{add(new THREE.BoxGeometry(1.02,.5,.03),dark,0,-.56,-.76,root,-.5);                                 // dash body behind the panel wings
 add(new THREE.BoxGeometry(.2,.12,1.0),consM,-.46,-.66,-.1);add(new THREE.BoxGeometry(.2,.12,1.0),consM,.46,-.66,-.1);
 add(new THREE.BoxGeometry(1.1,.04,1.5),dark,0,-.88,-.1);
 add(new THREE.BoxGeometry(.08,.34,.9),consM,-.57,-.5,-.1);add(new THREE.BoxGeometry(.08,.34,.9),consM,.57,-.5,-.1);
 add(new THREE.BoxGeometry(.46,.6,.08),olive,0,-.35,.38);                                           // seat back
 add(new THREE.BoxGeometry(.5,.07,.34),olive,0,-.66,.14);                                           // seat cushion
 add(new THREE.BoxGeometry(.03,.5,.04),black,0,.27,-.9);for(const sx of[-1,1]){add(new THREE.BoxGeometry(.035,.62,.05),black,sx*.48,.25,-.82,root,0,0,sx*-.14);add(new THREE.BoxGeometry(.6,.03,.05),black,sx*.25,.55,-.76);}
 add(new THREE.BoxGeometry(1.0,.04,.06),black,0,.56,-.78);}
/* the pilot's controls: cyclic with its rubber boot, collective with the engine throttles, rudder pedals */
const stick=new THREE.Group();stick.position.set(0,-.80,-.24);root.add(stick);
add(new THREE.CylinderGeometry(.03,.07,.09,14),black,0,.0,0,stick);add(new THREE.CylinderGeometry(.013,.017,.3,10),L(0x25282a),0,.15,0,stick);
{const gp=new THREE.Group();gp.position.set(0,.31,0);gp.rotation.x=.12;stick.add(gp);add(new THREE.BoxGeometry(.045,.12,.055),black,0,.03,0,gp);add(new THREE.CylinderGeometry(.006,.006,.01,8),redM,0,.1,-.015,gp);add(new THREE.CylinderGeometry(.006,.006,.01,8),L(0xcfcfc8),.012,.075,-.02,gp);}
const col=new THREE.Group();col.position.set(-.455,-.64,-.5);root.add(col);
add(new THREE.CylinderGeometry(.012,.014,.78,10),L(0x25282a),0,0,.39,col,Math.PI/2);          // the lever points aft, the grip is near the pilot
add(new THREE.BoxGeometry(.05,.07,.13),black,0,.03,.78,col);add(new THREE.BoxGeometry(.012,.014,.03),alu,.015,.075,.76,col);
for(const sx of[-1,1])add(new THREE.BoxGeometry(.03,.03,.1),redM,-.02+sx*.0,.0,.1,col).visible=sx>0;
const ped=(()=>{const g=new THREE.Group();root.add(g);const ps=[];for(const s of[-1,1]){const p=new THREE.Group();p.position.set(s*.12,-.84,-.55);g.add(p);add(new THREE.BoxGeometry(.1,.015,.12),L(0x24282a),0,0,0,p);add(new THREE.BoxGeometry(.1,.1,.012),L(0x24282a),0,.04,.05,p,-.4);ps.push(p);}
  return{g,set:y=>{ps[0].position.z=-.55-y*.05;ps[1].position.z=-.55+y*.05;}};})();

/* ---------------- required members for the cockpit system ---------------- */
out.stk=stick;out.thr=col;out.sg=.12;
out.panelMats=[panelM,consM,wing];out.panel0=[panelM.color.getHex(),consM.color.getHex(),wing.color.getHex()];
out.vars={ka50:{stk:stick,thr:col,sg:.12,ped:ped.set,on:[],off:[]}};
let gt=0;
out.tick=(P,dt)=>{gt+=dt;if(gt<1/30)return;gt=0;for(const g of gauges){try{g.draw(g.c,g.S);if(g.t)g.t.needsUpdate=true;}catch(e){if(!g.err){g.err=1;console.warn('[ka50pit] gauge',e);}}}};
out.redrawAll=()=>{for(const g of gauges){try{g.draw(g.c,g.S);if(g.t)g.t.needsUpdate=true;}catch(e){}}};
root.traverse(o=>{if(!o.isMesh)return;const m=o.material,tr=m.transparent||m.opacity<1;o.castShadow=!tr&&!m.isMeshBasicMaterial;o.receiveShadow=!m.isMeshBasicMaterial;});
root.visible=false;
ck.ka50=out;
out.redrawAll();
console.info('[ka50pit] cockpit built · '+gauges.length+' live faces');
})();
