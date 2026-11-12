/* =====================================================================================================================
   ah64pit.js — AH-64A Apache pilot cockpit (rear seat).
   Built from the AH-64A operator's manual TM 1-1520-238-10, Figure 2-9 "Pilot Instrument Panel": standby magnetic compass, master caution / warning
   panel, video display unit, radar altimeter, radio call and stabilator placards, stabilator position indicator, radar jammer indicator, radar warning
   display, icing meter, countermeasure control panels, caution / warning panel, clock, accelerometer, VSI, HARS control panel, encoding barometric
   altimeter, dual hydraulic pressure indicator, utility accumulator gauge, HSI, standby attitude indicator, engine oil pressure, Np / Nr, Ng, TGT and
   torque indicators (dual vertical-scale LED bars with digital read-outs), fuel quantity, fire control panel, arm / safe indicator, canopy jettison
   handle, tail wheel lock, fire pull handles and bottle select, airspeed indicator. Engine bar colour bands follow Figure 5-1 (TGT yellow 867-917 C,
   Ng 63-99 normal / 99-102 / red above, torque 100 % continuous). The panel list and the engine markings are from the manual; the exact placement of each
   item on the panel, the VSI / accelerometer / stabilator scale ranges and the caution legend set are estimates and not taken from the manual.
   The AH-64A has no HUD and no multi-function displays: symbology goes to the helmet monocle (IHADSS).
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof ck==='undefined'||typeof buildCockpit!=='function'||!window.HELI){console.warn('[ah64pit] game missing');return;}
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
/* ---------------- AH-64A-specific faces ---------------- */
const FT=3.28084,KT=1.94384;
const aglFt=P=>P?Math.max(0,P.pos.y-groundAt(P.pos.x,P.pos.z)-((HELI.H['AH-64A']||{}).gh||1.9))*FT:0;
const BAND=(o,v)=>{for(const [a,b,col] of o.bands||[])if(v>=a&&v<b)return col;return o.base||'#37d65a';};
// dual / triple vertical-scale instrument: rows of lit segments with a digital read-out under each column (the real instruments are LED bars with digits below)
function vscale(c,W,H,o){c.setTransform(1,0,0,1,0,0);c.fillStyle='#030505';c.fillRect(0,0,W,H);
  c.font=`700 ${H*.05}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#cfd6cc';c.fillText(o.title,W/2,H*.06);
  const n=o.vals.length,cw=W/n,top=H*.14,bot=H*.8,NS=28,sh=(bot-top)/NS;
  o.vals.forEach((val,i)=>{const cx=cw*(i+.5),bw=cw*(n===2?.30:.26);
    for(let s=0;s<NS;s++){const v=o.min+(o.max-o.min)*(s+.5)/NS,col=BAND(o,v),lit=val>=o.min+(o.max-o.min)*s/NS;
      c.globalAlpha=lit?1:.14;c.fillStyle=col;c.fillRect(cx-bw/2,bot-(s+1)*sh+sh*.18,bw,sh*.64);}
    c.globalAlpha=1;const red=BAND(o,val)==='#e8301c',fl=Math.floor(performance.now()/350)%2===0;if(o.tq){const split=Math.abs(o.vals[0]-o.vals[1])>12;if(val>=98){c.strokeStyle=fl?'#ffffff':'#555';c.lineWidth=2;c.strokeRect(cx-cw*.42,H*.9-H*.06,cw*.84,H*.12);}if(split&&!fl)return;}c.fillStyle=red?'#ff4a38':'#eaf2ea';c.font=`700 ${H*.085}px ${FONT}`;c.fillText(o.fmt?o.fmt(val):String(Math.round(val)),cx,H*.9);});
  c.fillStyle='#9aa49a';c.font=`700 ${H*.05}px ${FONT}`;
  (o.ticks||[]).forEach(t=>{const y=bot-(t-o.min)/(o.max-o.min)*(bot-top);c.textAlign='center';c.fillText(o.tf?o.tf(t):String(t),n===2?W/2:cw*.5-(n===3?cw*.36:0),y);});}
function radAlt(c,S,ft){bg(c,S);const R=S*.47,cx=S/2,u=Math.sqrt(Math.min(ft,1500)/1500),A=a=>(-150+300*a)*D;c.save();c.translate(cx,cx);c.fillStyle=c.strokeStyle='#e9ecea';
  for(const v of[0,10,20,30,40,50,60,70,80,90,100,150,200,300,400,500,600,800,1000,1200,1500]){const a=A(Math.sqrt(v/1500)),mj=[0,50,100,200,500,1000,1500].includes(v);c.lineWidth=S*(mj?.018:.01);c.beginPath();c.moveTo(Math.sin(a)*R*(mj?.82:.9),-Math.cos(a)*R*(mj?.82:.9));c.lineTo(Math.sin(a)*R,-Math.cos(a)*R);c.stroke();
    if(mj){c.font=`700 ${S*.085}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(v>=1000?v/1000+'K':String(v),Math.sin(a)*R*.66,-Math.cos(a)*R*.66);}}
  c.font=`700 ${S*.06}px ${FONT}`;c.textAlign='center';c.fillText('RAD ALT FT',0,S*.2);c.restore();needle(c,S,A(u),.82,.03);
  c.fillStyle=ft<500?'#e9ecea':'#4a4e4a';c.font=`700 ${S*.1}px ${FONT}`;c.textAlign='center';c.fillText(String(Math.round(Math.min(ft,9999))).padStart(4,' '),S/2,S*.84);}
// HSI: rotating compass card with the lubber line, bearing pointer to the active point, course arrow and a distance window
function hsiAH(c,S,P){bg(c,S);const hd=P?P.hdg:0,cx=S/2,R=S*.47;c.save();c.translate(cx,cx);c.rotate(-hd*D);c.strokeStyle=c.fillStyle='#e9ecea';c.font=`700 ${S*.09}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';
  for(let a=0;a<360;a+=5){const t=a*D,mj=a%10===0;c.lineWidth=S*(a%30===0?.016:.008);c.beginPath();c.moveTo(Math.sin(t)*R*(mj?.86:.92),-Math.cos(t)*R*(mj?.86:.92));c.lineTo(Math.sin(t)*R,-Math.cos(t)*R);c.stroke();
    if(a%30===0){c.save();c.translate(Math.sin(t)*R*.68,-Math.cos(t)*R*.68);c.rotate(t);c.fillText(a===0?'N':a===90?'E':a===180?'S':a===270?'W':String(a/10),0,0);c.restore();}}
  const brg=P?Math.atan2(AF.x-P.pos.x,-(AF.z-P.pos.z)):0;c.strokeStyle='#f6b300';c.lineWidth=S*.02;c.rotate(brg);c.beginPath();c.moveTo(0,-R*.8);c.lineTo(0,-R*.25);c.moveTo(0,R*.3);c.lineTo(0,R*.8);c.stroke();
  c.fillStyle='#f6b300';c.beginPath();c.moveTo(0,-R*.8);c.lineTo(-S*.03,-R*.66);c.lineTo(S*.03,-R*.66);c.closePath();c.fill();c.restore();
  c.fillStyle='#f6b300';c.beginPath();c.moveTo(cx,cx-R);c.lineTo(cx-S*.03,cx-R*.88);c.lineTo(cx+S*.03,cx-R*.88);c.closePath();c.fill();
  c.strokeStyle='#e9ecea';c.lineWidth=S*.02;c.beginPath();c.moveTo(cx-S*.1,cx);c.lineTo(cx+S*.1,cx);c.moveTo(cx,cx-S*.08);c.lineTo(cx,cx+S*.1);c.stroke();
  const dst=P?Math.hypot(AF.x-P.pos.x,AF.z-P.pos.z)/1852:0;c.fillStyle='#050505';c.fillRect(S*.05,S*.05,S*.3,S*.14);c.fillStyle='#e9ecea';c.font=`700 ${S*.09}px ${FONT}`;c.textAlign='center';c.fillText(dst.toFixed(1),S*.2,S*.12);
  c.fillStyle='#050505';c.fillRect(S*.65,S*.05,S*.3,S*.14);c.fillStyle='#e9ecea';c.fillText(String(Math.round(hd)%360).padStart(3,'0'),S*.8,S*.12);}
// AH-64A engine data from the helicopter-systems module (falls back to the airframe state if it is not loaded)
const ENG=(P,i)=>{const h=hl(P),e=P&&P.hs&&P.hs.e[i];if(e){const live=e.ok&&e.hp>0&&h.run;return{ng:e.n1,tgt:e.tgt,trq:e.trq,np:live?Math.max(0,(h.Nr||0)*100):(h.Nr||0)*95,oil:live?52+e.trq*.12:e.n1*.3,ok:live,fire:e.fire};}
  const run=h.run&&h.start<=0,t=Math.min(1.2,(h.Pe||0)/Math.max(1,h.Pa||1));return{ng:run?62+38*t:0,tgt:run?330+560*t:20,trq:run?t*100:0,np:(h.Nr||0)*100,oil:run?55+t*8:0,ok:run,fire:0};};
const TB=[[0,60,'#e8301c'],[60,99,'#37d65a'],[99,102,'#f0c020'],[102,200,'#e8301c']];

/* ================= LEFT WING: radar altimeter, clock, accelerometer, VSI, altimeter, HARS panel, hydraulics, airspeed ================= */
{const g=LW.g,p=LW.p;
 gauge(g,p(180,372),24,(c,S)=>radAlt(c,S,aglFt(PL())));                                                              // 4  radar altimeter
 gauge(g,p(236,368),17,(c,S)=>{const P=PL();bg(c,S);dial(c,S,{min:-2,max:4,a0:-130,a1:130,major:1,minor:.5,title:'G',fmt:v=>v});needle(c,S,lin(P?P.nz:1,-2,4,-130,130)*D);}); // 17 accelerometer
 gauge(g,p(288,368),17,(c,S)=>{bg(c,S);const d=new Date();dial(c,S,{min:0,max:12,a0:0,a1:330,major:1,minor:1,fmt:v=>v===0?12:v});          // 16 clock
   needle(c,S,(d.getHours()%12+d.getMinutes()/60)/12*TAU,.5,.05,'#e6e6e0',0);needle(c,S,(d.getMinutes()+d.getSeconds()/60)/60*TAU,.8,.035,'#e6e6e0',0);needle(c,S,d.getSeconds()/60*TAU,.85,.012,'#e8a020',0);});
 gauge(g,p(188,432),28,(c,S)=>{const P=PL();bg(c,S);const v=P?P.vel.y*FT*60:0;dial(c,S,{min:-3000,max:3000,a0:-160,a1:160,major:1000,minor:500,title:'VSI x1000',fmt:x=>Math.abs(x/1000)});  // 18 VSI
   needle(c,S,lin(Math.max(-3000,Math.min(3000,v)),-3000,3000,-160,160)*D);});
 gauge(g,p(268,436),30,(c,S)=>{const P=PL(),alt=P?P.pos.y*FT:0;bg(c,S);dial(c,S,{min:0,max:10,a0:0,a1:360-36,major:1,minor:.5,title:'ALT FT',fmt:v=>v});     // 20 encoding barometric altimeter
   needle(c,S,(alt%1000)/1000*TAU,.82,.03);needle(c,S,(alt%10000)/10000*TAU,.5,.045,'#e6e0a0');c.fillStyle='#e9ecea';c.font=`700 ${S*.1}px ${FONT}`;c.textAlign='center';c.fillText(String(Math.round(alt)).padStart(5,' '),S/2,S*.84);});
 {const [x,y]=p(176,496);add(new THREE.BoxGeometry(70*KP,34*KP,.014),bezel,x,y,.007,g);                                       // 19 HARS control panel
  plate(g,x,y,70*KP,34*KP,(c,w,h)=>{txt(c,'HARS',w*.5,h*.14,h*.18,'#cfd4cc');for(const [fx,s] of[[.18,'SLAVE'],[.5,'DG'],[.82,'FAST ERECT']])txt(c,s,w*fx,h*.86,h*.12,'#cfd4cc');},.0085);
  knob(g,x-18*KP,y,.0075);tog(g,x+4*KP,y,true,.0085);cap(g,x+24*KP,y,0x2a2a28,.0058);}
 gauge(g,p(240,500),19,(c,S)=>{const P=PL(),h=hl(P);bg(c,S);dial(c,S,{min:0,max:4,a0:-135,a1:135,major:1,minor:.5,title:'HYD x1000',fmt:v=>v});                 // 21 dual hydraulic pressure
   const dm=P&&P.dm?P.dm.hyd/100:1,pr=h.run?3000*(P.dm?Math.max(.05,dm):1):0;needle(c,S,lin(pr/1000,0,4,-135,135)*D,.85,.025,'#f2f2ee');needle(c,S,lin(pr/1000*.985,0,4,-135,135)*D,.65,.025,'#e8a020');});
 gauge(g,p(292,502),14,(c,S)=>{const h=hl(PL());bg(c,S);dial(c,S,{min:0,max:4,a0:-135,a1:135,major:1,minor:.5,lab:false,title:'ACCUM'});needle(c,S,lin(h.run?3.0:2.8,0,4,-135,135)*D);});  // 22 utility accumulator
 gauge(g,p(188,566),32,(c,S)=>{const P=PL();bg(c,S);dial(c,S,{min:0,max:200,a0:-150,a1:150,major:20,minor:10,title:'KNOTS',fmt:v=>v%40===0?v:'',arcs:[[190,200,'#e8301c']]});   // 39 airspeed indicator
   needle(c,S,lin(P?P.cas:0,0,200,-150,150)*D);});
 {const [x,y]=p(266,566);                                                                                             // 6/7 stabilator position indicator and its placard
  screen(g,[x,y],44*KP,62*KP,176,248,(c)=>{const P=PL(),v=P?Math.max(0,Math.min(1,(P.cas-30)/50)):0,ang=25*(1-v)-0;                                   // auto schedule: trailing edge down at low speed, trailing edge up at speed (indicative)
     c.setTransform(1,0,0,1,0,0);c.fillStyle='#050805';c.fillRect(0,0,176,248);c.fillStyle='#cfd6cc';c.font=`700 16px ${FONT}`;c.textAlign='center';c.fillText('STAB',88,16);
     for(let d=-10;d<=35;d+=5){const y=214-(d+10)/45*180;c.fillStyle='#8a948a';c.fillRect(60,y,d%10===0?40:24,2);if(d%10===0){c.fillStyle='#cfd6cc';c.font=`700 14px ${FONT}`;c.textAlign='left';c.fillText(String(Math.abs(d)),108,y+1);}}
     const yy=214-(ang+10)/45*180;c.fillStyle='#37d65a';c.beginPath();c.moveTo(52,yy);c.lineTo(32,yy-9);c.lineTo(32,yy+9);c.closePath();c.fill();},.005);}
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])add(new THREE.CylinderGeometry(.0028,.0028,.004,6),alu,sx*(88*KP-.006),sy*(145*KP-.006),.011,g,Math.PI/2);
}

/* ================= CENTRE BAY: caution / warning panel, VDU, standby attitude indicator, HSI, fire control panel ================= */
{const g=CW.g,p=CW.p;
 // 2 master caution / warning panel: red warning legends on top, amber cautions below; legends light with the helicopter state
 {const [x,y]=p(400,362);
  const WN=['ENG 1 OUT','ENG 2 OUT','LOW RPM','HIGH RPM'],CN=['XMSN OIL PSI','XMSN OIL HOT','FUEL LOW','HYD PRESS'],C2=['ENG 1 OIL','ENG 2 OIL','GEN FAIL','CHIP DET'];
  screen(g,[x,y],128*KP,42*KP,384,126,(c)=>{const P=PL(),h=hl(P),s=P&&P.hs;c.setTransform(1,0,0,1,0,0);c.fillStyle='#070908';c.fillRect(0,0,384,126);
    const on=(P&&P.alive)?[[!!(s&&(!s.e[0].ok||s.e[0].hp<=0)&&h.run),!!(s&&(!s.e[1].ok||s.e[1].hp<=0)&&h.run),(h.Nr||0)<.9&&(h.Nr||0)>.3&&!P.onGnd,(h.Nr||0)>1.06],
       [!!(s&&s.oil<30),!!(s&&s.temp>140),P.totalFuel<110,!!(P.dm&&P.dm.hyd<40)],[!!(s&&s.e[0].hp<35),!!(s&&s.e[1].hp<35),!!(P.dm&&P.dm.eng<25),!!(s&&s.vib>.8)]]:[[],[],[]];
    [WN,CN,C2].forEach((row,r)=>row.forEach((t,k)=>{const x0=k*96+3,y0=r*42+3,lit=on[r]&&on[r][k];c.fillStyle=lit?(r===0?'#d82a1a':'#e8a010'):'#17201a';c.fillRect(x0,y0,90,36);c.fillStyle=lit?'#fff4e0':'#4c5a4c';c.font=`700 13px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(t,x0+45,y0+18);}));},.004);
  const mc=lampW(g,x-48*KP,y+31*KP,.012,.008,0xff9a10,false);gauges.push({c:null,draw:()=>{const P=PL(),s=P&&P.hs,any=!!(s&&(s.oil<30||s.temp>140||s.e.some(e=>!e.ok||e.hp<35)||s.vib>.8))||(P&&P.totalFuel<110);mc.color.set(any&&Math.floor(performance.now()/400)%2?0xffb020:0x3c2a00);},t:{needsUpdate:0}});
  plate(g,x+4*KP,y+31*KP,.07,.008,(c,w,h)=>txt(c,'MASTER CAUTION · PRESS TO RESET',w/2,h/2,h*.62,'#cfd4cc'),.006,800);}
 // 3 video display unit: the pilot's monochrome CRT with flight symbology and sensor video
 {const [x,y]=p(400,428);
  screen(g,[x,y],104*KP,72*KP,312,216,(c)=>{const P=PL(),h=hl(P);c.setTransform(1,0,0,1,0,0);c.fillStyle='#021008';c.fillRect(0,0,312,216);if(!P)return;
    c.strokeStyle='#3cff7a';c.fillStyle='#3cff7a';c.lineWidth=2;c.font=`700 15px ${FONT}`;c.textAlign='center';c.textBaseline='middle';
    // horizon line with pitch ladder, heading tape, speed and altitude read-outs
    c.save();c.beginPath();c.rect(40,30,232,150);c.clip();c.translate(156,105);c.rotate(-P.bank);const py=P.pitch/D*3.2;c.beginPath();c.moveTo(-120,py);c.lineTo(-20,py);c.moveTo(20,py);c.lineTo(120,py);c.stroke();
    for(const a of[-10,10,20]){const yy=py-a*3.2;c.beginPath();c.moveTo(-30,yy);c.lineTo(30,yy);c.stroke();}c.restore();
    c.beginPath();c.arc(156,105,5,0,TAU);c.stroke();c.beginPath();c.moveTo(139,105);c.lineTo(151,105);c.moveTo(161,105);c.lineTo(173,105);c.stroke();
    c.fillText(String(Math.round(P.hdg)%360).padStart(3,'0'),156,18);c.textAlign='left';c.fillText('KT '+Math.round(P.cas),10,105);c.textAlign='right';c.fillText('AL '+Math.round(aglFt(P)),302,105);
    c.textAlign='left';c.fillText('TRQ '+Math.round(Math.max(ENG(P,0).trq,ENG(P,1).trq)),10,196);c.textAlign='right';c.fillText('NR '+Math.round((h.Nr||0)*100),302,196);},.006);
  for(let i=0;i<4;i++)knob(g,x-34*KP+i*23*KP,y-46*KP,.0058);}
 // 25 standby attitude indicator
 gauge(g,p(400,498),24,(c,S)=>adiFace(c,S,PL(),{slip:1}));
 // 24 horizontal situation indicator
 gauge(g,p(400,556),32,(c,S)=>hsiAH(c,S,PL()));
 // 28 fire control panel, 30 arm / safe indicator
 {const [x,y]=p(400,606);add(new THREE.BoxGeometry(134*KP,34*KP,.014),bezel,x,y,.007,g);
  plate(g,x,y,134*KP,34*KP,(c,w,h)=>{txt(c,'FIRE CONTROL',w*.5,h*.12,h*.16,'#cfd4cc');for(const [fx,s] of[[.14,'ENG 1'],[.38,'APU'],[.62,'ENG 2'],[.86,'ARM']])txt(c,s,w*fx,h*.84,h*.14,'#cfd4cc');},.0085);
  const L1=lampW(g,x-48*KP,y+1*KP,.022,.011,0xff2a1a,false),L2=lampW(g,x-8*KP,y+1*KP,.022,.011,0xff2a1a,false),L3=lampW(g,x+30*KP,y+1*KP,.022,.011,0xff2a1a,false),L4=lampW(g,x+58*KP,y+1*KP,.02,.011,0xffb020,false);
  gauges.push({c:null,draw:()=>{const P=PL(),s=P&&P.hs;L1.color.set(s&&s.e[0].fire?0xff3020:0x3a0a06);L3.color.set(s&&s.e[1].fire?0xff3020:0x3a0a06);L2.color.set(0x3a0a06);L4.color.set(typeof game!=='undefined'&&game.agMM&&game.agMM!=='NAV'?0xffb020:0x3c2a00);},t:{needsUpdate:0}});}
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])add(new THREE.CylinderGeometry(.0028,.0028,.004,6),alu,sx*(70*KP-.006),sy*(145*KP-.006),.011,g,Math.PI/2);
}

/* ================= RIGHT WING: engine oil, Np/Nr, Ng, TGT, torque and fuel quantity vertical-scale indicators ================= */
{const g=RW.g,p=RW.p,VS=(cx,cy,w,h,o)=>screen(g,p(cx,cy),w*KP,h*KP,Math.round(w*4),Math.round(h*4),(c,W,H)=>{const P=PL();vscale(c,c.canvas.width,c.canvas.height,o(P));},.005);
 VS(500,404,54,128,P=>({title:'ENG OIL PSI',min:0,max:120,bands:[[0,25,'#e8301c'],[25,100,'#37d65a'],[100,200,'#e8301c']],vals:[ENG(P,0).oil,ENG(P,1).oil],ticks:[0,50,100]}));                                // 26
 VS(562,404,66,128,P=>({title:'Np  Nr  Np',min:0,max:130,bands:[[0,90,'#f0c020'],[90,102,'#37d65a'],[102,110,'#f0c020'],[110,200,'#e8301c']],vals:[ENG(P,0).np,(hl(P).Nr||0)*100,ENG(P,1).np],ticks:[50,100]}));       // 27
 VS(624,404,54,128,P=>({title:'Ng RPM %',min:0,max:110,bands:[[0,63,'#3a7ae8'],[63,99,'#37d65a'],[99,102,'#f0c020'],[102,200,'#e8301c']],vals:[ENG(P,0).ng,ENG(P,1).ng],ticks:[0,50,100]}));                  // 34
 VS(500,548,54,128,P=>({title:'TGT C x100',min:0,max:12,bands:[[0,8.67,'#37d65a'],[8.67,9.17,'#f0c020'],[9.17,20,'#e8301c']],vals:[ENG(P,0).tgt/100,ENG(P,1).tgt/100],fmt:v=>(v*100).toFixed(0),ticks:[0,4,8,12]}));  // 36
 VS(562,548,54,128,P=>({title:'TORQUE %',tq:1,min:0,max:120,bands:[[0,100,'#37d65a'],[100,115,'#f0c020'],[115,200,'#e8301c']],vals:[ENG(P,0).trq,ENG(P,1).trq],ticks:[0,50,100]}));                                   // 37
 VS(624,548,54,128,P=>({title:'FUEL LB x100',min:0,max:14,bands:[[0,1.5,'#e8301c'],[1.5,3,'#f0c020'],[3,20,'#37d65a']],vals:[(P?P.totalFuel:0)*2.2046/200,(P?P.totalFuel:0)*2.2046/200],fmt:v=>String(Math.round(v*100)),ticks:[0,5,10]})); // 32
 // 40 engine fire pull handles, 38 extinguisher bottle select, 31 canopy jettison handle, 29 tail wheel lock
 {const [x,y]=p(500,616);for(const s of[-1,1])add(new THREE.BoxGeometry(.016,.016,.02),L(0xc01810,30),x+s*.016,y,.014,g);plate(g,x,y-.014,.06,.008,(c,w,h)=>txt(c,'ENG FIRE PULL',w/2,h/2,h*.7,'#cfd4cc'),.006,700);}
 {const [x,y]=p(562,616);tog(g,x-.012,y,true,.008);plate(g,x,y-.014,.07,.008,(c,w,h)=>txt(c,'BOTTLE  MAIN · RESERVE',w/2,h/2,h*.62,'#cfd4cc'),.006,700);}
 {const [x,y]=p(624,616);tog(g,x,y,false,.008);plate(g,x,y-.014,.05,.008,(c,w,h)=>txt(c,'TAIL WHEEL LOCK',w/2,h/2,h*.62,'#cfd4cc'),.006,700);}
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])add(new THREE.CylinderGeometry(.0028,.0028,.004,6),alu,sx*(92*KP-.006),sy*(145*KP-.006),.011,g,Math.PI/2);
}
/* 35 instrument dim / test panel, 8 radar jammer indicator */
{const [x,y]=RW.p(640,356);add(new THREE.BoxGeometry(40*KP,22*KP,.012),bezel,x,y,.006,RW.g);plate(RW.g,x,y,40*KP,22*KP,(c,w,h)=>{txt(c,'INSTR DIM · TEST',w/2,h*.16,h*.14,'#cfd4cc');txt(c,'OFF  NORM  TEST',w/2,h*.86,h*.12,'#aab3a8');},.008);knob(RW.g,x-8*KP,y,.0065);tog(RW.g,x+12*KP,y,true,.009);}
{const [x,y]=LW.p(160,596);const m=lampW(LW.g,x,y,.02,.01,0xff7a10,false);plate(LW.g,x,y-.011,.04,.008,(c,w,h)=>txt(c,'JAMMER',w/2,h/2,h*.7,'#cfd4cc'),.006,700);gauges.push({c:null,draw:()=>{const P=PL();m.color.set(P&&P.alive&&P.hs&&P.hs.vib>10?0xff7a10:0x3c2000);},t:{needsUpdate:0}});}
/* canopy jettison handle (31): yellow / black, lower centre of the panel */
{const [x,y]=CW.p(400,634);add(new THREE.BoxGeometry(.05,.012,.02),L(0xd8b000,30),x,y,.016,CW.g);}

/* ================= glare shield: standby magnetic compass (1), radar warning display (9), jammer indicator (8), countermeasure panels (12-14), icing meter (10) ================= */
const hudG=new THREE.Group();hudG.position.set(0,-.07,-.86);root.add(hudG);hudG.updateMatrixWorld(true);        // the AH-64A has no HUD: symbology goes to the IHADSS monocle, the glass is only the projection plane for the game's HUD
out.glass=out.glass0=[[-.09,.08],[.09,.08],[.09,-.075],[-.09,-.075]].map(([x,y])=>new THREE.Vector3(x,y,0).applyMatrix4(hudG.matrixWorld));
add(new THREE.BoxGeometry(1.0,.03,.22),dark,0,-.2,-.92,root,.1);
{const g=pnl(.26,-.1,-.86,.06,.06,L(0x1c1f1d));add(new THREE.SphereGeometry(.022,14,10),L(0x0a0c0c,80),0,0,.012,g);add(new THREE.TorusGeometry(.024,.003,6,18),alu,0,0,.012,g);}
const ovh=(x,y,w,h)=>pnl(x,.37+y,-.70,w,h,L(0x1c1f1d));
{const g=ovh(-.30,.0,.12,.12);                                                                                            // radar warning display scope
 gauge(g,[0,0],26,(c,S)=>{bg(c,S);c.strokeStyle='#2fdc6a';c.fillStyle='#2fdc6a';c.lineWidth=2;for(const r of[.2,.45,.7]){c.beginPath();c.arc(S/2,S/2,S*r*.64,0,TAU);c.stroke();}
   c.beginPath();c.moveTo(S/2,S*.1);c.lineTo(S/2,S*.9);c.moveTo(S*.1,S/2);c.lineTo(S*.9,S/2);c.stroke();c.font=`700 ${S*.08}px ${FONT}`;c.textAlign='center';c.fillText('RWR',S/2,S*.06);},);}
{const g=ovh(-.15,.01,.2,.09);plate(g,0,0,.2,.09,(c,w,h)=>{c.fillStyle='#14181a';c.fillRect(0,0,w,h);txt(c,'RADAR / IR COUNTERMEASURES',w/2,h*.1,h*.08,'#cfd4cc');
   for(const [fx,s] of[[.15,'RLWR'],[.38,'JAMMER'],[.62,'CHAFF'],[.85,'FLARE']]){c.fillStyle='#223a30';c.fillRect(w*(fx-.09),h*.3,w*.18,h*.28);txt(c,s,w*fx,h*.44,h*.08,'#9be8b6');}
   txt(c,'RADAR WARNING · CHAFF DISPENSER',w/2,h*.82,h*.075,'#aab3a8');},.0012,1100);for(let i=0;i<4;i++)tog(g,-.075+i*.05,-.034,i!==1,.01);}
{const g=ovh(.07,.01,.07,.09);plate(g,0,0,.07,.09,(c,w,h)=>{c.fillStyle='#14181a';c.fillRect(0,0,w,h);txt(c,'ICING',w/2,h*.12,h*.1,'#cfd4cc');txt(c,'PRESS TO TEST',w/2,h*.86,h*.07,'#aab3a8');},.0012,1100);cap(g,0,-.01,0x2a2a28,.008);}
{const g=ovh(.2,.01,.2,.09);plate(g,0,0,.2,.09,(c,w,h)=>{c.fillStyle='#14181a';c.fillRect(0,0,w,h);txt(c,'RADIO CALL PLACARD',w/2,h*.12,h*.09,'#cfd4cc');txt(c,'STAB / AIRSPEED PLACARD',w/2,h*.84,h*.08,'#cfd4cc');for(let i=0;i<3;i++){c.strokeStyle='#8a8f88';c.strokeRect(w*(.08+i*.3),h*.28,w*.26,h*.4);}},.0012,1100);}

/* ================= right console: electrical power, fuel control, lighting, comms ================= */
{const g=new THREE.Group();g.position.set(.5,-.52,-.34);g.scale.setScalar(.85);root.add(g);g.lookAt(EYE.x-.2,EYE.y-.1,EYE.z-.1);g.rotation.z+=.1;
 add(new THREE.BoxGeometry(.38,.2,.02),consM,0,0,-.01,g);
 plate(g,0,0,.38,.2,(c,w,h)=>{c.fillStyle='#1a1d1b';c.fillRect(0,0,w,h);c.fillStyle='#d8dcd4';
   rule(c,w*.04,h*.46,w*.96,h*.46);rule(c,w*.35,h*.08,w*.35,h*.92);rule(c,w*.66,h*.08,w*.66,h*.92);
   txt(c,'ELECTRICAL POWER',w*.19,h*.1,h*.045);txt(c,'FUEL CONTROL',w*.5,h*.1,h*.045);txt(c,'LIGHTING',w*.82,h*.1,h*.045);txt(c,'COMMUNICATIONS',w*.19,h*.55,h*.045);txt(c,'ANTI-ICE',w*.5,h*.55,h*.045);txt(c,'NAV',w*.82,h*.55,h*.045);
   const lab=(a,fx,fy)=>a.forEach((s,i)=>txt(c,s,w*(fx+i*.065),h*fy,h*.027,'#c9cec6'));
   lab(['BATT','APU','GEN 1','GEN 2','EXT'],.07,.38);lab(['FWD','AFT','XFEED','XFER','BOOST'],.37,.38);lab(['CKPT','FORM','CONSOLE','FLOOD','INSTR'],.68,.38);lab(['UHF','VHF','FM','HF','INTERCOM'],.07,.92);},.0012,1500);
 for(let i=0;i<5;i++){tog(g,-.17+i*.0245,.012,i<2||i===3);tog(g,-.07+i*.0245,.012,true);tog(g,.04+i*.0245,.012,i%2===0);}
 for(let i=0;i<5;i++){tog(g,-.17+i*.0245,-.085,i%2===0);tog(g,-.07+i*.0245,-.085,false);}
 for(let i=0;i<3;i++)knob(g,.07+i*.04,-.085,.01);
 // fuel quantity selector and test
 knob(g,.15,.05,.01);cap(g,.15,.0,0x2a2a28,.008);
}
/* ================= left console: engine power levers (OFF / IDLE / FLY), rotor brake, start controls ================= */
let pwr=null;
{const g=new THREE.Group();g.position.set(-.5,-.52,-.30);g.scale.setScalar(.85);root.add(g);g.lookAt(EYE.x+.2,EYE.y-.12,EYE.z-.1);g.rotation.z-=.1;
 add(new THREE.BoxGeometry(.2,.22,.02),consM,0,0,-.01,g);
 plate(g,0,0,.2,.22,(c,w,h)=>{c.fillStyle='#1a1d1b';c.fillRect(0,0,w,h);txt(c,'ENGINE · APU',w*.5,h*.07,h*.05,'#d4d8d0');txt(c,'ENG START',w*.28,h*.3,h*.04);txt(c,'APU',w*.72,h*.3,h*.04);
   txt(c,'POWER LEVERS',w*.5,h*.6,h*.045);for(let i=0;i<2;i++)txt(c,'ENG '+(i+1),w*(.34+i*.32),h*.68,h*.035);
   for(const [y,s] of[[.74,'OFF'],[.82,'IDLE'],[.9,'FLY']])txt(c,s,w*.08,h*y,h*.035,'#c9cec6');txt(c,'ROTOR BRAKE',w*.84,h*.94,h*.032);},.0012,1200);
 for(let i=0;i<3;i++)lampW(g,-.07+i*.045,.075,.022,.012,0x39ff7a,false);cap(g,.07,.075,0xd01c10,.01);tog(g,-.05,.03,true);tog(g,.0,.03,true);knob(g,.06,.03,.011);
 pwr=[0,1].map(i=>{const gg=new THREE.Group();gg.position.set(-.03+i*.065,-.065,.01);g.add(gg);add(new THREE.BoxGeometry(.012,.07,.012),black,0,0,0,gg);add(new THREE.SphereGeometry(.0095,8,6),L(0x1a1a18,30),0,-.038,.002,gg);return gg;});
 add(new THREE.BoxGeometry(.012,.06,.012),black,.085,-.075,.01,g);add(new THREE.SphereGeometry(.009,8,6),redM,.085,-.105,.012,g);
}
gauges.push({c:null,draw:()=>{const P=PL(),h=hl(P);if(!pwr||!P)return;const fly=h.run&&h.start<=0?1:h.run?.5:0;pwr.forEach((q,i)=>{const s=P.hs&&P.hs.e[i],f=s&&(!s.ok||s.hp<=0)?0:fly;q.position.y=-.065+.045*(1-f);});},t:{needsUpdate:0}});

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

/* solid fill so nothing of the outside shows through the cockpit: front bulkhead behind the panel, an anti-glare cowl from the panel top to the glare shield, side walls and the floor */
{const body=L(0x1c1f1d);
 add(new THREE.BoxGeometry(2.0,.62,.06),body,0,-.63,-.93);                                   // bulkhead behind and below the panel, wider than the wings
 add(new THREE.BoxGeometry(1.5,.03,.17),body,0,-.255,-.895,root,-.6);                        // cowl: panel top edge up to the glare shield
 for(const sx of[-1,1]){add(new THREE.BoxGeometry(.05,.95,1.5),body,sx*.72,-.5,-.15);          // side walls under the canopy sills
   add(new THREE.BoxGeometry(.5,.05,1.4),body,sx*.5,-.78,-.15);}
 add(new THREE.BoxGeometry(1.5,.05,1.5),body,0,-.92,-.15);}                                   // floor
/* ---------------- required members for the cockpit system ---------------- */
out.stk=stick;out.thr=col;out.sg=.12;
out.panelMats=[panelM,consM,wing];out.panel0=[panelM.color.getHex(),consM.color.getHex(),wing.color.getHex()];
out.vars={ah64:{stk:stick,thr:col,sg:.12,ped:ped.set,on:[],off:[]}};
let gt=0;
out.tick=(P,dt)=>{gt+=dt;if(gt<1/30)return;gt=0;for(const g of gauges){try{g.draw(g.c,g.S);if(g.t)g.t.needsUpdate=true;}catch(e){if(!g.err){g.err=1;console.warn('[ah64pit] gauge',e);}}}};
out.redrawAll=()=>{for(const g of gauges){try{g.draw(g.c,g.S);if(g.t)g.t.needsUpdate=true;}catch(e){}}};
root.traverse(o=>{if(!o.isMesh)return;const m=o.material,tr=m.transparent||m.opacity<1;o.castShadow=!tr&&!m.isMeshBasicMaterial;o.receiveShadow=!m.isMeshBasicMaterial;});
root.visible=false;
ck.ah64=out;
out.redrawAll();
console.info('[ah64pit] cockpit built · '+gauges.length+' live faces');
})();

(function(){const A=typeof AC!=='undefined'&&AC['AH-64A'];if(A){A.cockpit='ah64';A.pit='ah64';A.cwPit='AH-64A · pilot (rear seat) instrument panel per TM 1-1520-238-10';}else console.warn('[ah64pit] AH-64A not registered yet');})();