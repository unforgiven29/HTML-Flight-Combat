/* =====================================================================================================================
   v262 - AV-8B Harrier II (Night Attack) cockpit, 1:1 after the DCS AV-8B guide part 3 "Cockpit & Gauges" and the AV-8B tactical manual
   (instrument panel, left / right consoles, HUD).
   * Main instrument panel: left MPCD and right MPCD (20 push-buttons each: DAY / OFF / BRT / SYM, GAIN, SCL, MENU, PRS/GRS, CONT; pages EHSD, VREST,
     TAC, ENG, FUEL), UFC with the COMM 1 / COMM 2 displays, scratchpad and keypad (TMR TOO VOL ... ENT CLR I/P SVE, IFF TCN AWL WPN WOF BCN ALT EMCON),
     MASTER CAUTION and MASTER WARNING, caution lights (L FUEL, R FUEL, 15 SEC, MFS, BINGO, H2O), warning ladder (FIRE LAW FLAPS L TANK R TANK HYD
     GEAR JPT EFC GEN), engine display panel (DUCT psi, RPM %, FUEL FLOW lb/min, JPT °C, NOZ °, STAB, WATER lb, water-flow light), HUD control panel
     (symbology brightness / reject, DAY-AUTO-NIGHT, video brightness / contrast, ALT BARO-RDR, NAV / VSTOL), standby attitude, airspeed (x100 kt),
     AoA, vertical speed, altimeter and turn-and-slip indicators, fuel totalizer (TOTAL / LEFT / RIGHT / bingo), clock, DECM / expendables panel.
   * Left console: throttle quadrant with the NOZZLE lever (0 / STO 10 / VL stop 82 / BRAKE 98.5 with the nozzle-stop release), throttle, DECS, fuel
     shut-off lever, RPM selector, LIDS, EFC, water dump, fuel proportioner, A/R probe, lights, caution / advisory panel, electrical panel,
     brake / hydraulic / accumulator / cabin pressure gauges.
   * HUD: NAV mode (pitch ladder, heading scale, CAS, altitude, VVM, vertical speed, waypoint data, Cα, M, G, S, bullseye data, max G) and VSTOL mode
     (AoA analog scale, digital RPM / JPT, nozzle N and flap F degrees, vertical-speed scale, witch hat, side-slip indicator, power margin / water).
   Needs game.js, cwpit.js, cw-systems.js, startup.js, vtol.js.
   ===================================================================================================================== */
(function(){
'use strict';

const PIT=window.CW_PIT;if(!PIT||!PIT['AV-8B']){console.warn('[a4pit] cwpit missing');return;}
const ID='AV-8B',K=.00066,OX=640,OY=400;
const PL=()=>typeof player!=='undefined'?player:null;
const bx=x=>(x-OX)*K,by=y=>(OY-y)*K;
const now=()=>performance.now()/1000;
let STV=0,FK='',SK='',FKA=[];
const ST=new Proxy({},{set(t,k,v){t[k]=v;STV++;return true;}});
window.AV8ST=ST;
const sv=(k,d)=>ST[k]===undefined?d:ST[k];
let lampTest=0,fireTest=0,mcAck=false;
const isMine=P=>P&&P.type===ID;

/* ---------------- engine / aircraft readouts (J52-P-6A, no afterburner) ---------------- */
const E0=P=>P.eng&&!P.eng.done?P.eng.e[0]:null;
const running=P=>{const e=E0(P);return e?e.lit:P.totalFuel>0&&!(P.dm&&P.dm.eng<=0);};
const rpm=P=>{const e=E0(P);return e?e.rpm:running(P)?58+42*clamp(P.n||0,0,1.02):0;};
const tot=P=>{const e=E0(P);return e?e.egt*700:window.ENGSYS&&window.ENGSYS.on?ENGSYS.egt(P,0):running(P)?380+330*clamp(P.n||0,0,1):20;};
const powered=P=>window.START&&P.eng?START.powered(P):running(P);
const LB=2.2046;
const fuelLb=P=>(P.totalFuel||0)*LB;
const intLb=P=>Math.min(fuelLb(P),(P.ac.fuel||2420)*LB);
const gearDn=()=>{try{return!!sys.v.gear;}catch(e){return false;}};

/* ---------------- 2D faces ---------------- */
const INK='#f0f0ea',DIM='#a8aca4',FACE='#0d0e0f';
function face(c,S){c.setTransform(1,0,0,1,0,0);c.fillStyle=FACE;c.fillRect(0,0,S,S);c.translate(S/2,S/2);}
function T(c,s,x,y,sz,col=INK,al='center',f='bold'){c.font=`${f} ${sz}px Arial, Helvetica, sans-serif`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;c.fillText(s,x,y);}
function scale(c,r,a0,a1,n,maj,lbls,lr=.66,sz=18){c.strokeStyle=INK;for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n-90)*D2R,M=i%maj===0;c.lineWidth=M?3.2:1.6;
  c.beginPath();c.moveTo(Math.cos(a)*r*(M?.78:.87),Math.sin(a)*r*(M?.78:.87));c.lineTo(Math.cos(a)*r*.97,Math.sin(a)*r*.97);c.stroke();}
  if(lbls)lbls.forEach((v,i)=>{if(v==='')return;const a=(a0+(a1-a0)*i/(lbls.length-1)-90)*D2R;T(c,String(v),Math.cos(a)*r*lr,Math.sin(a)*r*lr,sz);});}
function arc(c,r,a0,a1,col,w=7){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.arc(0,0,r,(a0-90)*D2R,(a1-90)*D2R);c.stroke();}
function needle(c,r,deg,len=.84,w=7,col=INK,tail=.18){c.save();c.rotate(deg*D2R);c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=6;c.shadowOffsetX=3;c.shadowOffsetY=4;
  c.fillStyle=col;c.beginPath();c.moveTo(-w*.5,r*tail);c.lineTo(-w*.4,-r*len*.75);c.lineTo(0,-r*len);c.lineTo(w*.4,-r*len*.75);c.lineTo(w*.5,r*tail);c.closePath();c.fill();c.restore();
  c.fillStyle='#222';c.beginPath();c.arc(0,0,w*1.1,0,7);c.fill();c.fillStyle='#555';c.beginPath();c.arc(0,0,w*.5,0,7);c.fill();}
function win(c,x,y,w,h,s,sz,col='#fff'){c.fillStyle='#000';c.fillRect(x-w/2,y-h/2,w,h);c.strokeStyle='#444';c.lineWidth=2;c.strokeRect(x-w/2,y-h/2,w,h);T(c,s,x,y+1,sz,col,'center','bold');}
function barber(c,x,y,r){c.save();c.beginPath();c.arc(x,y,r,0,7);c.clip();c.translate(x,y);c.rotate(.8);for(let i=-6;i<7;i++){c.fillStyle=i%2?'#eee':'#1a1a1a';c.fillRect(i*r*.28,-r*2,r*.28,r*4);}c.restore();}
function flag(c,s,x,y){c.fillStyle='#c22';c.fillRect(x-R*.2,y-R*.1,R*.4,R*.2);T(c,s,x,y,13,'#fff');}
const R=110;
const lin=(v,a,b)=>clamp((v-a)/(b-a),0,1);


let qtyTest=0;
const mk=(a0,a1)=>v=>a0+(a1-a0)*clamp(v,0,1);
const F={
 // 44 · airspeed (fixed dial 80-650 kt) with rotating Mach disc seen through a cutout, index pointer 80-145 kt
 masi:(c,P)=>{const v=P.cas||0,m=P.mach||0,a=t=>-150+Math.pow(lin(t,80,650),.8)*300;c.strokeStyle=INK;
   for(const t of[80,100,120,140,160,180,200,250,300,350,400,450,500,550,600,650]){const q=(a(t)-90)*D2R,M=t%100===0||t===650||t===150;c.lineWidth=M?3:1.6;c.beginPath();c.moveTo(Math.cos(q)*R*(M?.8:.88),Math.sin(q)*R*(M?.8:.88));c.lineTo(Math.cos(q)*R*.97,Math.sin(q)*R*.97);c.stroke();
     if(t>=100&&(t%100===0||t===150||t===650))T(c,t===150?'150':String(t),Math.cos(q)*R*.66,Math.sin(q)*R*.66,13);}
   const q=(a(130)-90)*D2R;c.strokeStyle='#e22';c.lineWidth=5;c.beginPath();c.moveTo(Math.cos(q)*R*.84,Math.sin(q)*R*.84);c.lineTo(Math.cos(q)*R*.98,Math.sin(q)*R*.98);c.stroke();
   T(c,'KNOTS',0,-R*.3,13,DIM);T(c,'MACH',-R*.5,R*.58,12,DIM);win(c,R*.12,R*.5,R*.5,R*.22,m.toFixed(2),16);needle(c,R,a(Math.max(80,v)));},
 // 42 · AOA: 0-30 units, dial set so the optimum index (17.5) is at 3 o'clock; stall index (27) near 12; OFF window
 aoa:(c,P)=>{const ang=u=>90-(u-17.5)*9,u=clamp((P.alpha||0)*R2D*1.12+3,0,33);c.strokeStyle=INK;
   for(let k=0;k<=33;k++){const q=(ang(k)-90)*D2R,M=k%3===0;c.lineWidth=M?3:1.4;c.beginPath();c.moveTo(Math.cos(q)*R*(M?.8:.88),Math.sin(q)*R*(M?.8:.88));c.lineTo(Math.cos(q)*R*.97,Math.sin(q)*R*.97);c.stroke();if(M)T(c,String(k),Math.cos(q)*R*.64,Math.sin(q)*R*.64,15);}
   for(const[k,col]of[[17.5,'#3c3'],[27,'#d33']]){const q=(ang(k)-90)*D2R;c.strokeStyle=col;c.lineWidth=7;c.beginPath();c.moveTo(Math.cos(q)*R*.74,Math.sin(q)*R*.74);c.lineTo(Math.cos(q)*R*.98,Math.sin(q)*R*.98);c.stroke();}
   T(c,'ANGLE OF',0,R*.4,11,DIM);T(c,'ATTACK',0,R*.54,11,DIM);win(c,R*.34,0,R*.4,R*.2,powered(P)?'':'OFF',11,'#fff');needle(c,R,ang(u));},
 // 41 · altimeter: 100 ft marks, one turn = 1000 ft, 10 000 / 1000 ft counters, baro window 28.10-31.00
 alt:(c,P)=>{const h=Math.max(0,P.pos.y*3.2808);c.strokeStyle=INK;for(let i=0;i<50;i++){const q=(i*7.2-90)*D2R,M=i%5===0;c.lineWidth=M?3.2:1.4;c.beginPath();c.moveTo(Math.cos(q)*R*(M?.8:.88),Math.sin(q)*R*(M?.8:.88));c.lineTo(Math.cos(q)*R*.97,Math.sin(q)*R*.97);c.stroke();}
   for(let d=0;d<10;d++){const q=(d*36-90)*D2R;T(c,String(d),Math.cos(q)*R*.66,Math.sin(q)*R*.66,20);}T(c,'ALT',0,-R*.38,15,DIM);
   win(c,-R*.5,0,R*.26,R*.3,String(Math.floor(h/10000)%10),18);win(c,-R*.26,0,R*.26,R*.3,String(Math.floor(h/1000)%10),18);win(c,R*.64,0,R*.46,R*.3,String(sv('baro',29.92).toFixed?sv('baro',29.92).toFixed(2):'29.92').replace('.',''),13);needle(c,R,(h%1000)/1000*360,.86,8);},
 // 40 · vertical speed: 100 ft steps to 1000, 500 ft steps to 6000 (x1000)
 vvi:(c,P)=>{const v=(P.vel?P.vel.y:0)*196.85/1000;scale(c,R,-170,-10,12,2,[6,4,2,1,0],.64,18);scale(c,R,10,170,12,2,[0,1,2,4,6],.64,18);
   T(c,'UP',-R*.55,-R*.3,13,DIM);T(c,'CLIMB',-R*.48,-R*.14,10,DIM);T(c,'DOWN',-R*.5,R*.24,12,DIM);T(c,'FEET PER MIN',R*.05,R*.5,9,DIM);
   const f=x=>{const a=Math.abs(x);return Math.sign(x)*(a<1?a*.25:a<2?.25+(a-1)*.2:.45+(a-2)/4*.55);};needle(c,R,-90+clamp(f(clamp(v,-6,6)),-1,1)*80);},
 // 18 · accelerometer with +g / -g record pointers
 acc:(c,P)=>{P._minNz=Math.min(P._minNz==null?1:P._minNz,P.nz||1);scale(c,R,-150,150,14,2,[-4,-2,0,2,4,6,8,10],.64,19);T(c,'ACCELERATION',0,R*.34,10,DIM);T(c,'G UNITS',0,R*.5,12,DIM);
   const a=g=>-150+300*clamp((g+4)/14,0,1);needle(c,R,a(P.maxNz||1),.78,4,'#cfcfc8');needle(c,R,a(P._minNz),.78,4,'#cfcfc8');needle(c,R,a(P.nz||1));},
 // 22 · 8-day clock
 clk:(c,P)=>{const d=new Date();scale(c,R,0,330,59,5,[12,1,2,3,4,5,6,7,8,9,10,11],.68,22);needle(c,R,((d.getHours()%12)+d.getMinutes()/60)*30,.5,8);needle(c,R,d.getMinutes()*6,.8,6);needle(c,R,d.getSeconds()*6,.88,2.5,'#e33');},
 // 21 · LABS timer (counter window and SEC RANGE legend)
 labs:(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#18191a';c.fillRect(0,0,S,S);c.fillStyle='#000';c.fillRect(S*.12,S*.14,S*.76,S*.3);
   T(c,'SEC   RANGE   SEC',S/2,S*.08,S*.075);T(c,String(sv('labsT',1)).padStart(3,'0'),S/2,S*.3,S*.2,'#fff');T(c,'LABS TIMER',S/2,S*.66,S*.11);},
 // 24 · engine pressure ratio
 pr:(c,P)=>{const r=rpm(P),p=r<30?1:1+lin(r,55,100)*2.4;scale(c,R,-140,140,10,2,['1.5','2.0','2.5','3.0','3.5','4.0'],.62,16);T(c,'PR',0,-R*.34,18,INK);needle(c,R,-140+280*clamp((p-1.5)/2.5,0,1));},
 // 25 · oil quantity (small)
 oilq:(c,P)=>{scale(c,R,-120,120,10,2,['0','20','40','60','80','100'],.62,17);T(c,'OIL',0,R*.4,14,DIM);needle(c,R,-120+240*(window.ENGSYS&&window.ENGSYS.on?ENGSYS.oilQ(P,0):sv('oilq',.82)));},
 // 26 · tachometer % rpm with vernier
 rpm:(c,P)=>{const r=rpm(P);scale(c,R,-150,150,20,2,[0,10,20,30,40,50,60,70,80,90,100],.68,15);arc(c,R*.9,-150+300*100/110,150,'#d33');
   T(c,'PERCENT',0,R*.3,12,DIM);T(c,'RPM',0,R*.46,12,DIM);c.save();c.translate(-R*.38,-R*.1);c.beginPath();c.arc(0,0,R*.2,0,7);c.fillStyle='#161718';c.fillRect(-R*.2,-R*.2,R*.4,R*.4);c.strokeStyle=INK;c.lineWidth=1.2;
   for(let i=0;i<10;i++){const q=(i*36-90)*D2R;c.beginPath();c.moveTo(Math.cos(q)*R*.13,Math.sin(q)*R*.13);c.lineTo(Math.cos(q)*R*.19,Math.sin(q)*R*.19);c.stroke();}c.rotate((r%10)*36*D2R);c.fillStyle=INK;c.fillRect(-1.5,-R*.18,3,R*.18);c.restore();needle(c,R,-150+300*clamp(r/100,0,1.05));},
 // 27 · exhaust temperature, C x 100
 egt:(c,P)=>{const t=tot(P);scale(c,R,-150,150,20,2,[0,1,2,3,4,5,6,7,8,9,10],.64,16);T(c,'EXH',R*.36,-R*.22,11,DIM);T(c,'TEMP',R*.36,-R*.06,11,DIM);T(c,'CX100',0,R*.42,10,DIM);needle(c,R,-150+300*clamp(t/1000,0,1));},
 // 28 · fuel flow, pph x 1000 (expanded below 3)
 ff:(c,P)=>{const f=running(P)?(rpm(P)<70?.6+rpm(P)/100:1.1+Math.pow(P.n||0,1.6)*8.6):0,g=x=>x<=3?x/3*.5:.5+clamp((x-3)/12,0,1)*.5;c.strokeStyle=INK;
   for(const t of[0,.3,1,2,3,4,5,7.5,10,12.5,15]){const q=(-150+300*g(t)-90)*D2R,M=[0,1,2,3,5,10,15].includes(t);c.lineWidth=M?3:1.5;c.beginPath();c.moveTo(Math.cos(q)*R*(M?.78:.87),Math.sin(q)*R*(M?.78:.87));c.lineTo(Math.cos(q)*R*.97,Math.sin(q)*R*.97);c.stroke();if(M)T(c,String(t),Math.cos(q)*R*.62,Math.sin(q)*R*.62,15);}
   T(c,'FUEL FLOW',0,-R*.2,13,DIM);T(c,'PPH X 1000',0,R*.5,10,DIM);needle(c,R,-150+300*g(clamp(f,0,15)));},
 // 29 · fuel quantity, lb x 1000
 fq:(c,P)=>{scale(c,R,-150,150,12,2,[0,1,2,3,4,5,6],.66,16);T(c,'FUEL',0,-R*.3,13,DIM);T(c,'QUANTITY',0,-R*.14,12,DIM);T(c,'LBS X 1000',0,R*.5,10,DIM);
   if(qtyTest>now())needle(c,R,-150+300*0);else needle(c,R,-150+300*clamp(fuelLb(P)/6000,0,1),.86,8);},
 // 30 · radar altimeter: 10 ft to 200, 50 ft to 600, 100 ft to 2000, 500 ft to 5000; OFF flag; low-limit index
 ralt:(c,P)=>{const h=Math.max(0,(P.pos.y-groundAt(P.pos.x,P.pos.z))*3.2808),pwr=powered(P)&&!!sv('ralt',1),
     f=v=>v<200?v/200*.34:v<600?.34+(v-200)/400*.24:v<2000?.58+(v-600)/1400*.28:.86+(v-2000)/3000*.14;c.strokeStyle=INK;
   for(const t of[0,50,100,150,200,300,400,500,600,800,1000,1500,2000,3000,4000,5000]){const q=(-160+320*f(t)-90)*D2R,M=[0,100,200,400,600,1000,2000,3000,5000].includes(t);c.lineWidth=M?3:1.5;c.beginPath();c.moveTo(Math.cos(q)*R*(M?.8:.88),Math.sin(q)*R*(M?.8:.88));c.lineTo(Math.cos(q)*R*.97,Math.sin(q)*R*.97);c.stroke();if(M&&t)T(c,String(t),Math.cos(q)*R*.62,Math.sin(q)*R*.62,t>=1000?14:13);}
   T(c,'RADAR',0,-R*.12,14,INK);T(c,'ALTITUDE',0,R*.14,14,INK);T(c,'FEET',0,R*.3,10,DIM);c.save();c.rotate((-160+320*f(sv('lowAlt',500)))*D2R);c.fillStyle='#e8c040';c.fillRect(-5,-R*.99,10,R*.14);c.restore();
   if(!pwr||h>5000)win(c,0,-R*.34,R*.36,R*.18,'OFF',12);needle(c,R,-160+320*f(pwr?Math.min(h,5000):0));},
 // 31 · dead reckoning indicator (range / course)
 dri:(c,P)=>{const hd=P.hdg||0;scale(c,R,-150,150,33,3,['0','3','6','9','12','15','18','21','24','27','30','33'],.66,14);T(c,'RANGE',0,R*.4,13,DIM);T(c,'OFF',R*.34,0,11,DIM);
   c.save();c.rotate(hd*D2R);c.fillStyle=INK;c.beginPath();c.moveTo(0,-R*.5);c.lineTo(-R*.14,-R*.22);c.lineTo(R*.14,-R*.22);c.fill();c.fillRect(-3,-R*.26,6,R*.3);c.restore();needle(c,R,(P.hdg||0),.6,5);},
 // 39 · BDHI: compass card, pointer 1 (single bar, UHF / ADF), pointer 2 (double bar, TACAN), DME window, OFF flag
 bdhi:(c,P)=>{const hd=P.hdg||0,brg=brgField(P),d=distField(P);c.save();c.rotate(-hd*D2R);for(let i=0;i<72;i++){const a=i*5*D2R;c.strokeStyle=INK;c.lineWidth=i%2?1.5:3;c.beginPath();c.moveTo(Math.sin(a)*R*(i%2?.86:.8),-Math.cos(a)*R*(i%2?.86:.8));c.lineTo(Math.sin(a)*R*.97,-Math.cos(a)*R*.97);c.stroke();}
   ['N','3','6','E','12','15','S','21','24','W','30','33'].forEach((s,i)=>{c.save();c.rotate(i*30*D2R);T(c,s,0,-R*.68,s.length>1?16:19);c.restore();});
   c.save();c.rotate(brg*D2R);c.strokeStyle='#e8e8e0';c.lineWidth=3;c.beginPath();c.moveTo(-5,-R*.62);c.lineTo(-5,R*.62);c.moveTo(5,-R*.62);c.lineTo(5,R*.62);c.stroke();c.fillStyle='#e8e8e0';c.beginPath();c.moveTo(0,-R*.74);c.lineTo(-10,-R*.55);c.lineTo(10,-R*.55);c.fill();c.restore();
   c.save();c.rotate((brg+25)*D2R);c.strokeStyle='#cfcf9a';c.lineWidth=3;c.beginPath();c.moveTo(0,-R*.66);c.lineTo(0,R*.5);c.stroke();c.beginPath();c.moveTo(0,-R*.74);c.lineTo(-7,-R*.58);c.lineTo(7,-R*.58);c.closePath();c.fill();c.restore();c.restore();
   win(c,0,-R*.02,R*.42,R*.2,d<999?String(Math.round(d)).padStart(3,'0'):'OFF',14);c.fillStyle=INK;c.beginPath();c.moveTo(0,-R);c.lineTo(-7,-R+13);c.lineTo(7,-R+13);c.fill();},
 // 33 · standby attitude
 sby:null,
 // 38 · liquid oxygen, litres 0-10
 lox:null,
 // 35 · cabin pressure altitude (in the armament panel)
 cab:null,
 small:(kind)=>(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#111';c.fillRect(0,0,S,S);
   if(kind==='gear'){const tr=P.gearPos!=null&&P.gearPos>.05&&P.gearPos<.95;if(tr)barber(c,S/2,S/2,S*.45);else if(gearDn()&&P.gearPos>.9){c.fillStyle='#ddd';c.beginPath();c.arc(S/2,S/2,S*.42,0,7);c.fill();c.fillStyle='#111';c.beginPath();c.arc(S/2,S/2,S*.18,0,7);c.fill();}else T(c,'UP',S/2,S/2,S*.38,'#fff');}
   else if(kind==='flap'){const f=(P.flapPos!=null?P.flapPos:P.flapCmd||0);if(f>.05&&f<.95&&Math.abs((P.flapCmd||0)-f)>.02)barber(c,S/2,S/2,S*.45);else T(c,f>.5?'DN':'UP',S/2,S/2,S*.38,'#fff');}
   else if(kind==='trim'){c.strokeStyle=INK;c.lineWidth=2;c.beginPath();c.arc(S/2,S/2,S*.42,0,7);c.stroke();T(c,'NOSE',S/2,S*.2,S*.12,DIM);const v=clamp(P._trimP||0,-1,1);c.strokeStyle='#ffb21a';c.lineWidth=4;c.beginPath();c.moveTo(S/2,S/2);c.lineTo(S/2+Math.sin(v*1.2)*S*.36,S/2-Math.cos(v*1.2)*S*.36);c.stroke();}}};
Object.assign(F,{ adi:(c,P)=>{c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();c.rotate(-(P.bank||0));const k=R/48,po=(P.pitch||0)*R2D*k;
   c.fillStyle='#e8e8e0';c.fillRect(-R*2,-R*4+po,R*4,R*4);c.fillStyle='#2a2a28';c.fillRect(-R*2,po,R*4,R*4);
   c.lineWidth=2;for(let q=5;q<=90;q+=5){for(const s of[-1,1]){const y=po-s*q*k,w=q%10?R*.1:R*.26;c.strokeStyle=s>0?'#111':'#e8e8e0';c.beginPath();c.moveTo(-w,y);c.lineTo(w,y);c.stroke();if(q%10===0){T(c,String(q),w+14,y,12,s>0?'#111':'#e8e8e0');T(c,String(q),-w-14,y,12,s>0?'#111':'#e8e8e0');}}}
   // heading tape on the ball's horizon
   const hd=P.hdg||0;for(let h=Math.ceil((hd-40)/10)*10;h<=hd+40;h+=10){const x=(h-hd)*R/40;c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(x,po);c.lineTo(x,po+8);c.stroke();if(h%30===0)T(c,String(((h%360)+360)%360/10|0),x,po+18,11,'#fff');}
   c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-R*2,po);c.lineTo(R*2,po);c.stroke();c.restore();
   c.strokeStyle=INK;c.lineWidth=2;for(const b of[-60,-45,-30,-20,-10,0,10,20,30,45,60]){const q=(b-90)*D2R;c.beginPath();c.moveTo(Math.cos(q)*R*(b%30?.9:.84),Math.sin(q)*R*(b%30?.9:.84));c.lineTo(Math.cos(q)*R*.98,Math.sin(q)*R*.98);c.stroke();}
   c.save();c.rotate(-(P.bank||0));c.fillStyle=INK;c.beginPath();c.moveTo(0,-R*.82);c.lineTo(-7,-R*.7);c.lineTo(7,-R*.7);c.closePath();c.fill();c.restore();
   c.strokeStyle='#ffb21a';c.lineWidth=6;c.beginPath();c.moveTo(-R*.55,0);c.lineTo(-R*.18,0);c.lineTo(-R*.09,R*.09);c.lineTo(0,0);c.lineTo(R*.09,R*.09);c.lineTo(R*.18,0);c.lineTo(R*.55,0);c.stroke();
   c.fillStyle='#111';c.fillRect(-R*.42,R*.78,R*.84,R*.14);c.fillStyle='#000';c.beginPath();c.arc(clamp(-(P.beta||0)*R2D*6,-R*.36,R*.36),R*.85,R*.065,0,7);c.fill();c.strokeStyle='#ddd';c.lineWidth=1.5;c.strokeRect(-R*.42,R*.78,R*.84,R*.14);
   if(!powered(P))flag(c,'OFF',-R*.6,-R*.55);},
 // 8 · standby attitude (ARU-type, 3")
 sby:(c,P)=>{c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();c.rotate(-(P.bank||0));const k=R/40,po=(P.pitch||0)*R2D*k;c.fillStyle='#e8e8e0';c.fillRect(-R*2,-R*4+po,R*4,R*4);c.fillStyle='#1b1b1b';c.fillRect(-R*2,po,R*4,R*4);
   c.lineWidth=2;for(let q=10;q<=60;q+=10)for(const s of[-1,1]){c.strokeStyle=s>0?'#111':'#ddd';c.beginPath();c.moveTo(-R*.2,po-s*q*k);c.lineTo(R*.2,po-s*q*k);c.stroke();}c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-R*2,po);c.lineTo(R*2,po);c.stroke();c.restore();
   c.strokeStyle='#ff8a1a';c.lineWidth=7;c.beginPath();c.moveTo(-R*.55,0);c.lineTo(-R*.15,0);c.lineTo(0,R*.12);c.lineTo(R*.15,0);c.lineTo(R*.55,0);c.stroke();T(c,'PULL TO CAGE',0,R*.8,10,DIM);},
 lox:(c,P)=>{scale(c,R,-130,130,10,2,[0,2,4,6,8,10],.64,18);T(c,'LIQUID',0,R*.32,12,DIM);T(c,'OXYGEN',0,R*.46,12,DIM);T(c,'LITERS',0,R*.6,10,DIM);
   P._lox=(P._lox==null?9.2:P._lox)-(sv('o2',1)?.0006:0);needle(c,R,-130+260*clamp((lampTest>now()?0:P._lox)/10,0,1));},
 cab:(c,P)=>{const h=P.pos.y*3.2808,ca=h<8000?h:Math.max(8000,h*.45);scale(c,R,-150,150,10,2,[0,10,20,30,40,50],.64,18);T(c,'COCKPIT',0,R*.32,12,DIM);T(c,'ALTITUDE',0,R*.46,12,DIM);T(c,'FT × 1000',0,R*.6,10,DIM);needle(c,R,-150+300*clamp(ca/50000,0,1));},
});

function brgField(P){try{return(Math.atan2(AF.x-P.pos.x,-(AF.z-P.pos.z))*R2D+360)%360;}catch(e){return 0;}}
function distField(P){try{return Math.hypot(AF.x-P.pos.x,AF.z-P.pos.z)/1852;}catch(e){return 999;}}

/* ---------------- Harrier engine data (Pegasus 11-61, F402-RR-408) from vtol.js ---------------- */
const EDP=P=>{try{if(window.VT)return VT.edp(P);}catch(e){}return{rpm:0,jpt:0,duct:0,noz:0,cmd:0,water:0,inj:0,wsw:true,stop:true,hgi:0,vlw:false,ln:0,v:{}};};
const ffLb=P=>running(P)?(.2+2.2*clamp(P.n||0,0,1))*60*LB:0;      // lb / min
const GR='#7dff9a',GD='#2f8a48',GB='#0a1a0e';
function mt(c,s,x,y,sz=14,col=GR,al='left'){c.font=`bold ${sz}px "Courier New", Courier, monospace`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;c.fillText(s,x,y);}
function g3(n){return String(Math.max(0,Math.round(n))).padStart(3,'0');}
const rwy=()=>{try{return AF;}catch(e){return null;}};

/* ---------------- MPCD: the two 5" colour multi-purpose displays (256x256 face) ----------------
   20 option-select buttons: 5 top, 5 bottom, 5 left, 5 right, labelled on the glass. DAY/NGT, OFF/BRT, SYM, GAIN and CONT are bezel controls.
   Page set and OSB legends follow the DCS AV-8B guide part 3 (MPCD main menu: HUD STRS DMT EHSD FLIR | ENG CONF TPOD IFF EW | BIT VREST | COMM SDAT EMER CAS CARD). */
const px=(S,i)=>22+i*(S-44)/4, py=(S,i)=>S*(40+i*44)/256;
const hms=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const trkOf=P=>(Math.atan2(P.vel.x,-P.vel.z)*R2D+360)%360, gsOf=P=>Math.hypot(P.vel.x,P.vel.z)*KT;
const fieldFt=()=>{try{return Math.round(groundAt(AF.x,AF.z)*FT);}catch(e){return 0;}};
const isaC=ft=>Math.round(15-1.98*ft/1000);
const SCALES=[3,6,13,25,50,100,200];
const mpg=side=>sv('mp'+side+'g',side==='l'?'EHSD':'STRS'), mpu=(side,d)=>sv('mp'+side+'u',d);
const goto=(side,p)=>{ST['mp'+side+'g']=p;ST['mp'+side+'u']=undefined;};
function mScr(c,S,P,side){c.setTransform(1,0,0,1,0,0);c.fillStyle='#010503';c.fillRect(0,0,S,S);const on=sv('mp'+side+'p',1)&&powered(P);if(!on)return false;
  const ng=sv('mp'+side+'n',0);c.globalAlpha=[.35,.6,.85,1][sv('mp'+side+'b',3)]*(ng?.8:1)*[.5,.75,1][sv('mp'+side+'y',2)];return true;}
function mLabels(c,S,L){const tx=(s,x,y)=>{let box=false;if(s[0]==='*'){box=true;s=s.slice(1);}if(!s)return;const sz=s.length>6?7:9,w=s.length*sz*.62+6;
    if(box){c.strokeStyle=GR;c.lineWidth=1;c.strokeRect(x-w/2,y-sz*.75,w,sz*1.5);}mt(c,s,x,y,sz,GR,'center');};
  (L.t||[]).forEach((s,i)=>s&&tx(s,px(S,i),S*.045));(L.b||[]).forEach((s,i)=>s&&tx(s,px(S,i),S-S*.045));
  const vert=(arr,x)=>arr.forEach((s,i)=>{if(!s)return;let box=false;if(s[0]==='*'){box=true;s=s.slice(1);}const n=s.length,sz=8,y0=py(S,i)-(n-1)*sz*.5;
    if(n===1&&(s==='↑'||s==='↓')){mt(c,s,x,py(S,i),15,GR,'center');return;}
    if(box){c.strokeStyle=GR;c.lineWidth=1;c.strokeRect(x-6,y0-sz*.8,12,n*sz+3);}for(let k=0;k<n;k++)mt(c,s[k],x,y0+k*sz,sz,GR,'center');});
  vert(L.l||[],S*.032);vert(L.r||[],S-S*.032);}
const row=(c,S,y,a,b,col=GR,x0=.16,x1=.84)=>{mt(c,a,S*x0,y,10,GD);if(b!=null)mt(c,String(b),S*x1,y,11,col,'right');};
const MPD={};
/* ---- MENU ---- */
MPD.MENU={lab:()=>({t:['','BIT','VREST','',''],b:['COMM','SDAT','EMER','CAS','CARD'],l:['HUD','STRS','DMT','EHSD','FLIR'],r:['ENG','CONF','TPOD','IFF','EW']}),
  draw:()=>{},press:(g,i,side)=>{const s=MPD.MENU.lab()[g][i];if(s)goto(side,s);}};
/* ---- EHSD (track-up compass rose, TACAN / waypoint data, scale, course) ---- */
MPD.EHSD={lab:(side)=>({t:[],b:['SCL','MK1','MENU','','POS/INS'],l:[(sv('tcn',1)?'*':'')+'TCN',(sv('awls',0)?'*':'')+'AWLS',(sv('mapm',0)?'*':'')+'MAPM',(mpu(side,'')==='DATA'?'*':'')+'DATA',''],r:['*WYPT','↑','↓','WO/S','ECM']}),
  draw:(c,S,P,side)=>{const cx=S/2,cy=S*.56,r=S*.31,trk=trkOf(P),gs=gsOf(P),brg=brgField(P),d=distField(P),tt=gs>20?d/gs*3600:-1,scl=sv('mpScl',13),rel=brg-trk;
    // rose: dotted every 10 deg, numerals every 30 deg, track-up
    c.save();c.translate(cx,cy);c.rotate(-trk*D2R);c.fillStyle=GR;
    for(let i=0;i<36;i++){const a=i*10*D2R;c.beginPath();c.arc(Math.sin(a)*r,-Math.cos(a)*r,i%3?1.3:2,0,7);c.fill();}
    ['N','3','6','E','12','15','S','21','24','W','30','33'].forEach((s,i)=>{const a=i*30*D2R;c.save();c.translate(Math.sin(a)*(r-15),-Math.cos(a)*(r-15));c.rotate(trk*D2R);mt(c,s,0,0,11,GR,'center');c.restore();});
    // field / TACAN station and mark point on the map (range ring = scale)
    const mp=(x,z)=>{const dx=(x-P.pos.x)/NM/scl*r,dz=(z-P.pos.z)/NM/scl*r;return[dx,dz];};
    try{const[x,z]=mp(AF.x,AF.z);if(Math.hypot(x,z)<r-4){c.strokeStyle=GR;c.lineWidth=1.4;c.strokeRect(x-4,z-4,8,8);c.beginPath();c.moveTo(x,z-4);c.lineTo(x,z-9);c.stroke();}}catch(e){}
    if(ST.mk1){const[x,z]=mp(ST.mk1.x,ST.mk1.z);if(Math.hypot(x,z)<r-4){c.strokeStyle=GR;c.beginPath();c.moveTo(x-5,z);c.lineTo(x+5,z);c.moveTo(x,z-5);c.lineTo(x,z+5);c.stroke();mt(c,'M1',x+7,z-6,8);}}
    // waypoint bearing pointer (open triangle) and TACAN pointer (filled) on the rose
    c.rotate(brg*D2R);c.strokeStyle=GR;c.lineWidth=1.6;c.beginPath();c.moveTo(0,-r+3);c.lineTo(-5,-r+13);c.lineTo(5,-r+13);c.closePath();c.stroke();
    if(sv('tcn',1)){c.fillStyle=GR;c.beginPath();c.moveTo(0,-r-3);c.lineTo(-4,-r-11);c.lineTo(4,-r-11);c.closePath();c.fill();}c.restore();
    // ground track pointer (fixed at the top of the rose)
    c.strokeStyle=GR;c.lineWidth=1.8;c.beginPath();c.moveTo(cx,cy-r-5);c.lineTo(cx,cy-r+8);c.stroke();mt(c,g3(trk).slice(0,2),cx-12,cy-r-9,9,GR,'right');
    // own aircraft, track and ground speed
    c.beginPath();c.moveTo(cx,cy-9);c.lineTo(cx,cy+8);c.moveTo(cx-8,cy);c.lineTo(cx+8,cy);c.moveTo(cx-3,cy+7);c.lineTo(cx+3,cy+7);c.stroke();
    mt(c,g3(trk)+'°',cx-12,cy,12,GR,'right');mt(c,Math.round(gs)+'KTS',cx+14,cy,12);
    // data blocks
    const tc=sv('tcn',1);mt(c,tc?g3(brg)+'°':'---°',S*.05,S*.1,11);mt(c,tc&&d<400?d.toFixed(1):'-.-',S*.38,S*.1,11,GR,'right');mt(c,tc&&tt>=0?hms(tt):'--:--',S*.2,S*.16,10);
    mt(c,'NSEQ',S*.78,S*.06,8,GD,'center');mt(c,g3(brg)+'°',S*.56,S*.1,11);mt(c,Math.min(99.9,d).toFixed(1),S*.9,S*.1,11,GR,'right');mt(c,tt>=0?hms(tt):'--:--',S*.62,S*.16,10);
    mt(c,'SCL',S*.1,S*.86,10,GR);mt(c,String(scl),S*.1,S*.92,12);mt(c,'CRS',S*.84,S*.86,10);mt(c,g3(sv('crs',0)),S*.84,S*.92,12);
    if(sv('woS',0))mt(c,'OFFSET',S*.5,S*.97,8,GD,'center');if(sv('posins',0))mt(c,'POS',S*.75,S*.97,8,GD);
    if(mpu(side,'')==='DATA'){c.fillStyle='#010503';c.fillRect(S*.14,S*.2,S*.72,S*.6);c.strokeStyle=GR;c.strokeRect(S*.14,S*.2,S*.72,S*.6);mt(c,'A/C DATA',S/2,S*.26,11,GR,'center');
      const gx=P.pos.x/NM,gz=-P.pos.z/NM;[['GRID N',(gz>=0?'+':'')+gz.toFixed(1)+' NM'],['GRID E',(gx>=0?'+':'')+gx.toFixed(1)+' NM'],['ALT',Math.round(P.pos.y*FT)+' FT'],['GS',Math.round(gs)+' KT'],['TRK',g3(trk)+'°'],['WPT 1',d.toFixed(1)+' NM']].forEach((q,i)=>row(c,S,S*(.34+i*.07),q[0],q[1],GR,.2,.8));}},
  press:(g,i,side)=>{if(g==='l'){if(i===0)ST.tcn=sv('tcn',1)?0:1;else if(i===1)ST.awls=sv('awls',0)?0:1;else if(i===2)ST.mapm=sv('mapm',0)?0:1;else if(i===3)ST['mp'+side+'u']=mpu(side,'')==='DATA'?'':'DATA';}
    else if(g==='b'){if(i===0)ST.mpScl=SCALES[(SCALES.indexOf(sv('mpScl',13))+1)%SCALES.length];else if(i===1){const P=PL();if(P)ST.mk1={x:P.pos.x,z:P.pos.z};}else if(i===2)goto(side,'MENU');else if(i===4)ST.posins=sv('posins',0)?0:1;}
    else if(g==='r'){if(i===3)ST.woS=sv('woS',0)?0:1;else if(i===1)ST.crs=(sv('crs',0)+1)%360;else if(i===2)ST.crs=(sv('crs',0)+359)%360;}}};
/* ---- ENG (Pegasus F402-RR-408 / ID(3)-408 data page) ---- */
MPD.ENG={lab:()=>({t:[],b:['FRZ','','MENU','',''],l:['EMS','','','',''],r:['','','','','']}),
  draw:(c,S,P,side)=>{const e=EDP(P),n=e.rpm,jp=Math.round(e.jpt),mx=sv('sortieJpt',0);if(jp>mx)ST.sortieJpt=jp;const fz=sv('engFrz',0);
    const L=fz?sv('engSnap',null):null;mt(c,'ENG ID(3)-408',S/2,S*.04,10,GR,'center');mt(c,'JPT',S*.9,S*.04,8,GD,'right');
    const R=(y,a,b,col)=>{mt(c,a,S*.2,y,10,GD);mt(c,String(b),S*.82,y,11,col||GR,'right');};
    R(S*.12,'LIFE','1500');R(S*.17,'SORTIE JPT',(ST.sortieJpt||jp)+'°C');R(S*.22,'MAX JPT','790°C',jp>790?'#ffb21a':GR);R(S*.27,'OT TIME',jp>790?Math.max(0,4-Math.round((jp-790)/10))+' SEC':'4 SEC');
    mt(c,'STAB POS',S*.2,S*.34,10,GD);mt(c,(-(P._trimP||0)*4).toFixed(0)+'°',S*.52,S*.34,11);mt(c,'↑',S*.6,S*.34,12);mt(c,'HOV 1',S*.88,S*.34,9,GD,'right');
    R(S*.42,'IGV',Math.round(clamp((100-n)*.9+3,0,55))+'°');R(S*.47,'COMP RPM',Math.round(n*.97)+'%');R(S*.52,'FAN RPM',Math.round(n*.99)+'%');R(S*.57,'JPT',jp+'°C',jp>800?'#ff6a4a':GR);
    R(S*.62,'COR COMP',Math.round(n*.94)+'%');R(S*.67,'COR FAN',Math.round(n*.96)+'%');R(S*.72,'FUEL WT',Math.round(fuelLb(P)));
    mt(c,'ACCELERATION',S/2,S*.79,9,GD,'center');mt(c,'RPM',S*.12,S*.84,9,GD);mt(c,'95-63%',S*.42,S*.84,9,GR,'right');mt(c,'60-105%',S*.8,S*.84,9,GR,'right');mt(c,'TIME',S*.12,S*.9,9,GD);mt(c,'0.00SEC',S*.42,S*.9,9,GR,'right');mt(c,'0.00SEC',S*.8,S*.9,9,GR,'right');
    // nozzle, water and RPM readouts (right edge)
    mt(c,'NOZ '+Math.round(e.noz)+'°',S*.97,S*.62,8,GR,'right');mt(c,'H2O '+Math.round(e.water),S*.97,S*.66,8,e.water<30?'#ffb21a':GR,'right');if(e.inj>.3)mt(c,'INJ',S*.97,S*.7,8,'#4aff7a','right');},
  press:(g,i,side)=>{if(g==='b'&&i===0)ST.engFrz=sv('engFrz',0)?0:1;else if(g==='b'&&i===2)goto(side,'MENU');}};
/* ---- STRS (stores: laid out as the aircraft is loaded, SAFE / ARM, station select) ---- */
MPD.STRS={lab:()=>({t:['','','','',''],b:['TONE','','MENU','',''],l:['','','','',''],r:['SITE','','','','ECM']}),
  draw:(c,S,P,side)=>{const arm=(typeof game!=='undefined'&&game.armPos===0);mt(c,arm?'ARM':'SAFE',S*.1,S*.12,12,arm?'#ffb21a':GR);
    let ks=[];try{ks=Object.keys(P.load||{}).filter(k=>P.load[k]);}catch(e){}const xs=[.14,.28,.42,.5,.58,.72,.86],ys=[.62,.5,.4,.32,.4,.5,.62],ids=['1','2','3','4','5','6','7'];
    const SNx=typeof SN!=='undefined'?SN:{};const wsel=typeof game!=='undefined'?game.wsel:'';
    ids.forEach((id,i)=>{const t=P.load&&P.load[id];const x=S*xs[i],y=S*ys[i];if(!t){mt(c,id,x,y+S*.06,8,GD,'center');return;}const nm=SNx[t]||String(t).slice(0,6),sel=wsel===t;
      mt(c,nm,x,y,10,sel?'#ffffff':GR,'center');if(sel){c.strokeStyle=GR;c.strokeRect(x-S*.07,y-7,S*.14,14);}let n=1;try{n=P.count(t);}catch(e){}mt(c,id+(n>1?' x'+n:''),x,y+S*.06,8,GD,'center');});
    c.strokeStyle=GD;c.lineWidth=1;c.beginPath();c.moveTo(S*.5,S*.4);c.lineTo(S*.28,S*.55);c.moveTo(S*.5,S*.4);c.lineTo(S*.72,S*.55);c.stroke();
    try{mt(c,'GUN '+P.gun.ammo,S*.5,S*.82,11,wsel==='GUN'?'#ffffff':GR,'center');}catch(e){}if(!ks.length)mt(c,'NO STORES',S/2,S*.56,11,GD,'center');},
  press:(g,i,side)=>{if(g==='b'&&i===2)goto(side,'MENU');}};
/* ---- VREST (vertical / short takeoff & landing, range, endurance, speed, time) ---- */
const wetMaxLb=P=>(P.ac.vstol&&P.ac.vstol.vlMax||9300)*LB, dryMaxLb=P=>wetMaxLb(P)*((P.ac.vstol&&P.ac.vstol.wetK)||.915);
const bawLb=P=>(P.mass-(P.totalFuel||0))*LB-EDP(P).water;
function stoCalc(P,wet){const T=(wet?105900:95600)*(P.ac.vstol?1:.5),noz=sv('stoNoz',60),W=P.mass*G,Tv=T*Math.sin(noz*D2R),Th=T*Math.cos(noz*D2R),S=P.ac.S||21;
  const vlo=Math.sqrt(Math.max(1,(W-Tv*.96)*2/(1.2*S*1.9))),a=Math.max(.3,(Th*.97/P.mass)-.04*G),grol=vlo*vlo/(2*a),vab=vlo*.82;return{nras:vlo*.78*KT,grol:grol*FT,dt50:grol*FT*1.28+120,aspd:vab*KT,sdst:(vab*vab/(2*3.4))*FT,vlo:vlo*KT};}
function cruCalc(P,bingo){const alt=P.pos.y*FT,w=P.mass*LB,res=bingo?0:sv('bingo',1500),fuel=Math.max(0,fuelLb(P)-(bingo?0:0)),ff=w/9*.76;
  const opt=clamp(Math.round((38000-(w-20000)*.9)/1000)*1000,20000,41000),tas=(m,h)=>m*661.5*Math.sqrt(clamp(1-6.875e-6*h,.2,1)),mo=.74;
  const rr=(h,m)=>Math.max(0,(fuel-res)/(w/9*.76*(1+Math.max(0,m-.72)*3.2))*tas(m,h));
  return{opt,optM:mo,optR:rr(opt,mo),optCas:Math.round(mo*661.5*Math.sqrt(Math.pow(1-6.875e-6*opt,4.256))),acr:rr(alt,Math.max(.4,P.mach||.5)),ff};}
MPD.VREST={lab:(side)=>{const u=mpu(side,'VL');return{t:[(u==='VL'?'*':'')+'VL',(u==='VTO'?'*':'')+'VTO',(u==='STO'?'*':'')+'STO','',''],b:['','','MENU','',''],l:['','TEMP','','',''],r:[(u==='CRUS'?'*':'')+'CRUS','↑','↓',(u==='BNGO'?'*':'')+'BNGO','']};},
  draw:(c,S,P,side)=>{const u=mpu(side,'VL'),ft=P.pos.y*FT,fe=fieldFt(),oat=sv('oatC',isaC(fe)),gw=Math.round(P.mass*LB),baw=bawLb(P),e=EDP(P);
    if(u==='VL'||u==='VTO'){mt(c,'WET',S*.52,S*.28,9,GD,'center');mt(c,'DRY',S*.8,S*.28,9,GD,'center');
      const fw=(m)=>Math.max(0,Math.round(m-baw+(0)));mt(c,'F+W',S*.2,S*.36,10,GD);mt(c,String(fw(wetMaxLb(P)-(u==='VTO'?0:0))),S*.58,S*.36,11,GR,'right');mt(c,String(fw(dryMaxLb(P))),S*.86,S*.36,11,GR,'right');
      row(c,S,S*.56,'OATC',oat);row(c,S,S*.62,'ALTM',sv('altm',29.92).toFixed(2));row(c,S,S*.68,'FELV',fe);row(c,S,S*.74,'GWT',gw,gw>wetMaxLb(P)?'#ffb21a':GR);row(c,S,S*.82,'BAW',Math.round(baw));row(c,S,S*.88,'H2O',Math.round(e.water));}
    else if(u==='STO'){const w=stoCalc(P,true),d=stoCalc(P,false);mt(c,'WET',S*.55,S*.16,9,GD,'center');mt(c,'DRY',S*.82,S*.16,9,GD,'center');
      [['NRAS',Math.round(w.nras),Math.round(d.nras)],['NOZ',sv('stoNoz',60)+'°',sv('stoNoz',60)+'°'],['GROL',Math.round(w.grol),Math.round(d.grol)],['DT50',Math.round(w.dt50),Math.round(d.dt50)],['ASPD',Math.round(w.aspd),Math.round(d.aspd)],['SDST',Math.round(w.sdst),Math.round(d.sdst)]].forEach((q,i)=>{const y=S*(.24+i*.065);mt(c,q[0],S*.12,y,10,GD);mt(c,String(q[1]),S*.64,y,11,GR,'right');mt(c,String(q[2]),S*.9,y,11,GR,'right');});
      row(c,S,S*.68,'OATC',oat,GR,.12,.9);row(c,S,S*.73,'ALTM',sv('altm',29.92).toFixed(2),GR,.12,.9);row(c,S,S*.78,'FELV',fe,GR,.12,.9);row(c,S,S*.83,'GWT',gw,GR,.12,.9);row(c,S,S*.88,'GWIND','000/00',GR,.12,.9);row(c,S,S*.93,'RUNW','FDAT',GR,.12,.9);}
    else{const bn=u==='BNGO',k=cruCalc(P,bn),cas=Math.round(P.cas||0);mt(c,bn?'ABNG':'ACR',S*.62,S*.16,9,GD,'center');mt(c,bn?'OBNG':'OPCR',S*.86,S*.16,9,GD,'center');
      [['CAS',cas,k.optCas],['MACH',(P.mach||0).toFixed(2),k.optM.toFixed(2)],['CALT',Math.round(ft/100)*100,k.opt],['RNG',Math.round(k.acr),Math.round(k.optR)],['RFUL',Math.round(fuelLb(P)),Math.round(fuelLb(P))]].forEach((q,i)=>{const y=S*(.24+i*.07);mt(c,q[0],S*.1,y,10,GD);mt(c,String(q[1]),S*.7,y,11,GR,'right');mt(c,String(q[2]),S*.93,y,11,GR,'right');});
      row(c,S,S*.66,'MRNG',Math.round(k.optR),GR,.1,.93);row(c,S,S*.72,'WIND','000/00',GR,.1,.93);row(c,S,S*.78,'DI',sv('di',30),GR,.1,.93);row(c,S,S*.84,'GWT',gw,GR,.1,.93);}}};
MPD.VREST.press=(g,i,side)=>{const U=['VL','VTO','STO','CRUS','BNGO'],u=mpu(side,'VL');if(g==='t'&&i<3)ST['mp'+side+'u']=U[i];else if(g==='r'&&i===0)ST['mp'+side+'u']='CRUS';else if(g==='r'&&i===3)ST['mp'+side+'u']='BNGO';
  else if(g==='b'&&i===2)goto(side,'MENU');else if(g==='l'&&i===1)ST.oatC=(sv('oatC',isaC(fieldFt()))>=isaC(fieldFt())+20)?isaC(fieldFt())-10:sv('oatC',isaC(fieldFt()))+5;
  else if(g==='r'&&(i===1||i===2)&&u==='STO')ST.stoNoz=clamp(sv('stoNoz',60)+(i===1?5:-5),10,98);};
/* ---- HUD repeater ---- */
MPD.HUD={lab:()=>({t:[],b:['','','MENU','',''],l:[],r:[]}),draw:(c,S,P)=>{const gs=gsOf(P),alt=Math.round(P.pos.y*FT),vs=Math.round(P.vel.y*196.85),cas=Math.round(P.cas||0);
    mt(c,String(cas),S*.12,S*.1,14);mt(c,String(alt),S*.9,S*.1,14,GR,'right');mt(c,g3(P.hdg||0),S/2,S*.2,12,GR,'center');
    c.strokeStyle=GR;c.lineWidth=1.4;c.beginPath();c.arc(S/2,S*.48,5,0,7);c.moveTo(S/2-15,S*.48);c.lineTo(S/2-5,S*.48);c.moveTo(S/2+5,S*.48);c.lineTo(S/2+15,S*.48);c.moveTo(S/2,S*.48-5);c.lineTo(S/2,S*.48-10);c.stroke();
    mt(c,'M',S*.08,S*.7,10,GD);mt(c,(P.mach||0).toFixed(2),S*.2,S*.7,11);mt(c,'G',S*.08,S*.76,10,GD);mt(c,(P.nz||1).toFixed(1),S*.2,S*.76,11);mt(c,'S',S*.08,S*.82,10,GD);mt(c,String(Math.round(gs)),S*.2,S*.82,11);mt(c,'MAX G '+(P.maxNz||1).toFixed(1),S*.08,S*.9,10);
    mt(c,(vs>=0?'+':'')+vs+' FPM',S*.92,S*.7,11,GR,'right');mt(c,'AOA '+((P.alpha||0)*R2D).toFixed(1),S*.92,S*.78,10,GR,'right');},
  press:(g,i,side)=>{if(g==='b'&&i===2)goto(side,'MENU');}};
/* ---- BIT ---- */
MPD.BIT={lab:()=>({t:['','','M2','ATHS','STOP'],b:['BIT2','RSFF','MENU','FAST','CONT'],l:['','','','',''],r:['','','','','CMDS']}),draw:(c,S,P)=>{const on=powered(P);
    ['SMS','RWR','FLIR','DMT','TACTS','MSC','ATHS','CMDS'].forEach((s,i)=>{mt(c,s,S*.2,S*(.2+i*.075),10,GR);mt(c,sv('bit'+s,on?'GO':'--'),S*.62,S*(.2+i*.075),10,on?GR:GD);});mt(c,'TEST',S*.2,S*.84,10,GD);},
  press:(g,i,side)=>{if(g==='b'&&i===2)goto(side,'MENU');else if(g==='b'&&i===3)['SMS','RWR','FLIR','DMT','TACTS','MSC','ATHS','CMDS'].forEach(s=>{ST['bit'+s]='GO';});}};
/* ---- CONF ---- */
MPD.CONF={lab:()=>({t:[],b:['','','MENU','',''],l:[],r:['C','O','N','F','']}),draw:(c,S)=>{mt(c,'SOFTWARE CONFIGURATION PAGE 1',S/2,S*.14,9,GR,'center');
    [['WMC','XC06-00V'],['ASMCI','CD-014'],['MSC','MC06-00V'],['DC','DC06-00V'],['CMDS','3901'],['RWR','2944'],['ALQ-126B','1327'],['ALQ-162','0505'],['TACTS','3A'],['TPOD','00008561']].forEach((q,i)=>{mt(c,q[0],S*.2,S*(.26+i*.063),9,GR);mt(c,q[1],S*.74,S*(.26+i*.063),9,GR,'right');});},
  press:(g,i,side)=>{if(g==='b'&&i===2)goto(side,'MENU');}};
/* ---- IFF (drives the iff.js transponder / interrogator) ---- */
MPD.IFF={lab:()=>({t:['','','','',''],b:['','','MENU','',''],l:['M1','M2','M3','MC','M4'],r:['ROE','IDENT','INT','','']}),draw:(c,S,P)=>{let st={};try{st=IFF.st;}catch(e){}
    mt(c,'IFF',S/2,S*.1,12,GR,'center');[['MODE 1',st.c1||'--'],['MODE 2',st.c2||'--'],['MODE 3/A',st.c3||'1200'],['MODE C',st.mon!==false?'ON':'OFF'],['MODE 4',(st.crypt||'NORM')+' '+(st.key||'A')]].forEach((q,i)=>{mt(c,q[0],S*.2,S*(.26+i*.1),10,GD);mt(c,String(q[1]),S*.84,S*(.26+i*.1),12,GR,'right');});
    mt(c,'ROE '+(st.roe||'TIGHT'),S*.2,S*.84,11,GR);mt(c,st.ident>0?'IDENT':'',S*.84,S*.84,11,'#ffb21a','right');},
  press:(g,i,side)=>{if(g==='b'&&i===2)goto(side,'MENU');else if(g==='r'&&i===0){try{IFF.cycleRoe();}catch(e){}}else if(g==='r'&&i===1){try{IFF.ctl&&IFF.ctl('ident');}catch(e){}}else if(g==='r'&&i===2){try{IFF.interrogate&&IFF.interrogate();}catch(e){}}}};
/* ---- EW (RWR scope + CMDS programmes) ---- */
MPD.EW={lab:()=>({t:['','','','',''],b:['','','MENU','',''],l:['EXP','CHF','FLR','PROG',''],r:['DFST','PRI','LIM','BIT','ECM']}),draw:(c,S,P)=>{const cx=S/2,cy=S*.5,R0=S*.34;mt(c,'EXP AUTO',S*.12,S*.1,9);mt(c,'RWR',S*.88,S*.1,11,GR,'right');
    c.strokeStyle=GD;c.lineWidth=1.2;[.33,.66,1].forEach(k=>{c.beginPath();c.arc(cx,cy,R0*k,0,7);c.stroke();});mt(c,'N',cx,cy,9,GR,'center');
    try{const L=RW.list||[];L.slice(0,10).forEach(t=>{const rr=R0*(.25+.7*(1-clamp(t.pwr!=null?t.pwr:.5,0,1))),x=cx+Math.sin(t.a)*rr,y=cy-Math.cos(t.a)*rr,s=t.sym||'U';mt(c,String(s).slice(0,2),x,y,10,t.mode==='L'?'#ff6a4a':GR,'center');if(t.mode==='T'||t.mode==='L'){c.strokeStyle=t.mode==='L'?'#ff6a4a':GR;c.strokeRect(x-9,y-8,18,16);}});}catch(e){}},
  press:(g,i,side)=>{if(g==='b'&&i===2)goto(side,'MENU');}};
/* ---- COMM (channel list drives COMM 1) ---- */
const CHAN=[['243.000','A'],['264.000','P'],['265.000','P'],['256.000','P'],['254.000','P'],['260.000','P'],['270.000','P'],['257.000','P'],['265.000','P'],['262.000','P']];
MPD.COMM={lab:()=>({t:['SCAN','FF','FJ','HM',''],b:['COMM1','','MENU','',''],l:['↑','','LINE','','↓'],r:['↑','','','','↓']}),draw:(c,S,P)=>{const sel=sv('commCh',1);mt(c,'CH',S*.1,S*.14,8,GD);mt(c,'FREQ/MOD',S*.2,S*.14,8,GD);mt(c,'COLOR',S*.48,S*.14,8,GD);mt(c,'CIPH',S*.64,S*.14,8,GD);mt(c,'AGENCY CALL',S*.78,S*.14,8,GD);
    CHAN.forEach((q,i)=>{const y=S*(.2+i*.065),on=i+1===sel;if(on){c.fillStyle='rgba(125,255,154,.25)';c.fillRect(S*.07,y-6,S*.86,12);}mt(c,String(i+1),S*.1,y,9);mt(c,q[0]+q[1],S*.2,y,9,on?'#ffffff':GR);mt(c,'-----',S*.5,y,8,GD);mt(c,'P',S*.66,y,8);mt(c,'-----  -----',S*.78,y,8,GD);});
    mt(c,'DEGRADE',S*.1,S*.88,8,GD);mt(c,'TIME VALID',S*.1,S*.93,8,GD);mt(c,'COMM1',S*.6,S*.94,9,GR);},
  press:(g,i,side)=>{const sel=sv('commCh',1);if(g==='l'&&i===0||g==='r'&&i===0)ST.commCh=Math.max(1,sel-1);else if(g==='l'&&i===4||g==='r'&&i===4)ST.commCh=Math.min(10,sel+1);else if(g==='b'&&i===0){ST.comm1=CHAN[sel-1][0];try{radio('COMM 1 · '+ST.comm1);}catch(e){}}else if(g==='b'&&i===2)goto(side,'MENU');}};
/* ---- CAS / EMER / SDAT / CARD ---- */
MPD.CAS={lab:()=>({t:['SAVE','ARCH','PCLR','BMODE','FTEXT'],b:['RCALL','','MENU','','CAS'],l:['↑','','','','↓'],r:['','','','','']}),draw:(c,S)=>{mt(c,'WPT 99',S*.72,S*.17,8);
    [['1','IP'],['2','BRG'],['3','RNG'],['4','ELEV'],['5','DESC'],['6','L/L'],['7','MARK'],['8','FRND'],['9','EGRS'],['13','RMKS'],['14','TOT']].forEach((q,i)=>{mt(c,q[0],S*.12,S*(.24+i*.06),8,GD);mt(c,q[1],S*.22,S*(.24+i*.06),8);mt(c,'XXXXXX',S*.55,S*(.24+i*.06),8,GD);});},
  press:(g,i,side)=>{if(g==='b'&&i===2)goto(side,'MENU');}};
const EMER={'GEAR LAND':['GEAR HANDLE - DN','EMERG GEAR - PULL','HYD - CHECK','SPEED - 140 KT MAX FOR EXT','LAND - NOZZLES 0'],'EJCT DTCH':['ALT - ABOVE 2000 AGL IF POSSIBLE','SPEED - REDUCE','CANOPY - JETT','EJECT HANDLE - PULL'],'ENG':['THROTTLE - IDLE','NOZ - AFT','FUEL SW - CHECK','RELIGHT - ATTEMPT BELOW 25000'],'FUEL':['FUEL FLOW - CHECK','XFER - ON','LAND AS SOON AS POSSIBLE'],'FLT CONT':['STAB AUG - CHECK','SPEED - CONTROLLABLE','NOZ - AFT','LAND AS SOON AS POSSIBLE']};
MPD.EMER={lab:()=>({t:['GEAR LAND','EJCT DTCH','ENG','FUEL','FLT CONT'],b:['','','MENU','',''],l:[],r:['BRAKE','FIRE','','HUD','JETT']}),draw:(c,S,P,side)=>{const k=sv('emerK','GEAR LAND');mt(c,k,S/2,S*.14,11,GR,'center');(EMER[k]||[]).forEach((s,i)=>mt(c,(i+1)+'. '+s,S*.1,S*(.26+i*.08),9));},
  press:(g,i,side)=>{if(g==='t')ST.emerK=['GEAR LAND','EJCT DTCH','ENG','FUEL','FLT CONT'][i];else if(g==='b'&&i===2)goto(side,'MENU');}};
MPD.SDAT={lab:()=>({t:[],b:['','','MENU','',''],l:[],r:[]}),draw:(c,S,P)=>{mt(c,'SYSTEM DATA',S/2,S*.12,11,GR,'center');[['A/C',P.type||'AV-8B'],['GWT',Math.round(P.mass*LB)+' LB'],['FUEL',Math.round(fuelLb(P))+' LB'],['BINGO',sv('bingo',1500)+' LB'],['GEAR',gearDn()?'DN':'UP'],['STAB AUG','ON'],['NAV','INS']].forEach((q,i)=>row(c,S,S*(.26+i*.08),q[0],q[1]));},
  press:(g,i,side)=>{if(g==='b'&&i===2)goto(side,'MENU');}};
MPD.CARD={lab:()=>({t:[],b:['','','MENU','',''],l:[],r:[]}),draw:(c,S,P)=>{mt(c,'CARD 1',S/2,S*.12,11,GR,'center');['T/O DATA','VNE 540 KT / M .90','GEAR 250 KT','FLAP 250 KT','NOZ 0 > 10 STO','NOZ 82 STOP VL'].forEach((s,i)=>mt(c,s,S*.12,S*(.26+i*.08),9));},
  press:(g,i,side)=>{if(g==='b'&&i===2)goto(side,'MENU');}};
/* ---- sensor video pages: the sim has no FLIR / DMT / TPOD sensors, so these show their real STBY / NO POD states ---- */
const vid=(nm,txt)=>({lab:()=>({t:nm==='FLIR'?['B2L','B2H','LMAV','GUN']:[],b:nm==='FLIR'?['BLK','LIM/O','MENU','UPDT','NITE']:['','','MENU','',''],l:[],r:[]}),draw:(c,S,P)=>{mt(c,txt,S/2,S*.5,12,GR,'center');if(nm!=='TPOD')mt(c,'INS',S*.08,S*.16,10);},
  press:(g,i,side)=>{if(g==='b'&&i===2)goto(side,'MENU');}});
MPD.FLIR=vid('FLIR','FLIR STBY');MPD.DMT=vid('DMT','DMT STBY');MPD.TPOD=vid('TPOD','');
window.AV8MPD={MPD,mpPress,mpg};
function mpcd(side,defPage){return(c,P)=>{const S=c.canvas.width;if(!mScr(c,S,P,side))return;const pg=MPD[mpg(side)]||MPD[defPage]||MPD.MENU;pg.draw(c,S,P,side);mLabels(c,S,pg.lab(side,P));c.globalAlpha=1;};}
function mpPress(side,grp,i){const P=PL();if(!P)return;const pg=MPD[mpg(side)]||MPD.MENU;try{pg.press(grp,i,side,P);}catch(e){}}

/* ---------------- UFC ---------------- */
function ufcDraw(c,P){const W=c.canvas.width,H=c.canvas.height;c.setTransform(1,0,0,1,0,0);c.fillStyle='#17191a';c.fillRect(0,0,W,H);const on=powered(P);
  const win=(x,y,w,h,s,col=GR)=>{c.fillStyle='#020804';c.fillRect(x,y,w,h);c.strokeStyle='#444';c.lineWidth=2;c.strokeRect(x,y,w,h);if(on)mt(c,s,x+w/2,y+h/2+1,h*.62,col,'center');};
  const f1=sv('comm1','127.500'),f2=sv('comm2','225.000'),pad=sv('pad','');
  win(W*.04,H*.04,W*.4,H*.14,'TMR',GD);win(W*.46,H*.04,W*.5,H*.14,pad||'127.500'.replace(/.*/,f1));
  win(W*.04,H*.22,W*.4,H*.12,sv('pad2','PLN'),GD);win(W*.46,H*.22,W*.5,H*.12,'');
  mt(c,'COMM 1',W*.14,H*.62,Math.round(H*.05),INK,'center');mt(c,'COMM 2',W*.88,H*.62,Math.round(H*.05),INK,'center');
  win(W*.04,H*.66,W*.18,H*.1,'M',GD);win(W*.78,H*.66,W*.18,H*.1,'M',GD);win(W*.28,H*.86,W*.44,H*.1,f2.toString(),GD);}
const UFCK=[['TMR','TOO','VOL'],['1','2','3'],['4','5','6'],['7','8','9'],['ENT','0','CLR']];
const UFCL=[['IFF','TCN','AWL','WPN'],['WOF','BCN','ALT','EMCON']];

/* ---------------- EDP (engine display panel), 192x192 ---------------- */
F.edp=(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#050805';c.fillRect(0,0,S,S);if(!powered(P)&&!running(P))return;const e=EDP(P),s=S/192;
  const row=(lb,v,x,y,col=GR)=>{mt(c,lb,x*s,y*s,11*s,GD);mt(c,String(v),(x+66)*s,y*s,17*s,col,'right');};
  mt(c,'ENGINE',S/2,10*s,12*s,GR,'center');
  row('DUCT',e.duct,6,34);row('RPM',Math.round(e.rpm),100,34);row('FF',Math.round(ffLb(P)),6,66);row('JPT',Math.round(e.jpt),100,66,e.jpt>800?'#ff6a4a':GR);
  row('NOZ',Math.round(e.noz),6,98);row('STAB',(-(P._trimP||0)*4).toFixed(1),100,98);row('WATER',Math.round(e.water),6,130,e.water<30?'#ffb21a':GR);
  c.fillStyle=e.inj>.3?'#4aff7a':'#14301c';c.fillRect(150*s,120*s,34*s,20*s);mt(c,'H2O',167*s,130*s,10*s,e.inj>.3?'#041':GD,'center');
  mt(c,e.stop?'STOP':'',150*s,160*s,10*s,GD,'center');mt(c,(P.ac.vstol&&e.vlw)?'VL WT':'',50*s,160*s,10*s,'#ffb21a','center');};
/* standby airspeed (x100 kt) */
F.sas=(c,P)=>{const v=P.cas||0;scale(c,R,-150,150,20,2,['0','1','2','3','4','5','6','7','8','9','10'],.66,17);T(c,'AIRSPEED',0,-R*.32,11,DIM);T(c,'X100 KTS',0,R*.5,11,DIM);needle(c,R,-150+300*clamp(v/1000,0,1));};
/* turn & slip */
F.tns=(c,P)=>{c.fillStyle='#0b0c0d';c.beginPath();c.arc(0,0,R,0,7);c.fill();c.strokeStyle=INK;c.lineWidth=3;const tr=clamp((P.rr||0)*R2D/3,-1.2,1.2);
  c.save();c.rotate(tr*.5);c.fillStyle=INK;c.beginPath();c.moveTo(-R*.8,0);c.lineTo(-R*.2,0);c.lineTo(0,-R*.18);c.lineTo(R*.2,0);c.lineTo(R*.8,0);c.lineTo(R*.2,R*.06);c.lineTo(-R*.2,R*.06);c.closePath();c.fill();c.restore();
  c.strokeStyle='#888';c.lineWidth=2;c.strokeRect(-R*.5,R*.45,R,R*.28);c.fillStyle='#ddd';c.beginPath();c.arc(clamp(-(P.beta||0)*R2D*5,-R*.4,R*.4),R*.59,R*.1,0,7);c.fill();T(c,'L',-R*.7,-R*.5,14,DIM);T(c,'R',R*.7,-R*.5,14,DIM);T(c,'2 MIN',0,R*.85,10,DIM);};
/* AoA: Harrier units, 0-30, approach index ~ 15 */
F.aoa8=(c,P)=>{const u=clamp((P.alpha||0)*R2D+1.5,0,30);scale(c,R,-120,120,15,5,['0','5','10','15','20','25','30'],.64,15);T(c,'AOA',0,-R*.3,14,DIM);T(c,'UNITS',0,R*.4,11,DIM);
  c.strokeStyle='#3c3';c.lineWidth=6;{const q=(-120+240*15/30-90)*D2R;c.beginPath();c.moveTo(Math.cos(q)*R*.72,Math.sin(q)*R*.72);c.lineTo(Math.cos(q)*R*.97,Math.sin(q)*R*.97);c.stroke();}needle(c,R,-120+240*u/30);};
/* 8-day clock (reuses F.clk), fuel totalizer */
F.fuelT=(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#0d0e0f';c.fillRect(0,0,S,S);const sel=sv('ftS',0),tot=fuelLb(P),int=intLb(P),L=int/2,Rr=int/2,s=S/192;
  const v=[tot,Math.min(tot,ext0(P))][0];const win=(x,y,w,h,val,lb)=>{c.fillStyle='#000';c.fillRect(x*s,y*s,w*s,h*s);c.strokeStyle='#555';c.lineWidth=2;c.strokeRect(x*s,y*s,w*s,h*s);mt(c,String(val).padStart(5,' '),(x+w-6)*s,(y+h/2)*s,22*s,'#ffb21a','right');T(c,lb,(x+w/2)*s,(y-9)*s,10*s,DIM);};
  win(52,18,90,34,Math.round(sel===0?tot:sel===1?fuelLb(P)*.5:Math.max(0,tot-int)),['TOTAL','FEED','EXT'][sel]);win(6,92,76,32,Math.round(L),'LEFT');win(110,92,76,32,Math.round(Rr),'RIGHT');
  win(52,150,90,30,Math.round(sv('bingo',1500)),'BINGO');};
const ext0=P=>Math.max(0,fuelLb(P)-intLb(P));
/* ---------------- lamps ---------------- */
const lowFuel=P=>fuelLb(P)<sv('bingo',1500);
const LAMPS=[];
function cautions(P){const L=[];const e=EDP(P);if(!running(P))L.push('ENG');if(lowFuel(P))L.push('BINGO');if(P.ac.vstol&&e.vlw)L.push('VL WT');if(P.ac.vstol&&e.water<=0&&running(P))L.push('H2O');if(!(P.eng&&!P.eng.done?P.eng.gen:running(P)))L.push('GEN');return L;}
const CAUTL=[['L FUEL',P=>fuelLb(P)<500],['R FUEL',P=>fuelLb(P)<500],['15 SEC',P=>EDP(P).water<30&&EDP(P).water>0],['MFS',P=>!!sv('mfs',0)],['BINGO',lowFuel],['H2O',P=>EDP(P).water<=0&&running(P)]];
const WARNL=[['FIRE',P=>(P.fire||0)>0],['LAW',P=>(P.pos.y-groundAt(P.pos.x,P.pos.z))<60&&!P.onGnd&&P.vel.y<-4],['FLAPS',P=>false],['L TANK',P=>false],['R TANK',P=>false],['HYD',P=>!running(P)||(P.dm&&P.dm.hyd<20)],
  ['GEAR',P=>!gearDn()&&(P.pos.y-groundAt(P.pos.x,P.pos.z))*3.2808<500&&!P.onGnd&&P.vel.length()<110],['JPT',P=>EDP(P).jpt>800],['EFC',P=>sv('efc',1)===0],['GEN',P=>!(P.eng&&!P.eng.done?P.eng.gen:running(P))]];
let mwAck=false;
/* ---------------- Harrier HUD (NAV / VSTOL) ---------------- */
const hudModeAV8=P=>{const m=ST.hudM;if(m===1)return'VSTOL';if(m===0)return'NAV';const e=EDP(P);return e.noz>=15&&!P.onGnd||e.noz>=50?'VSTOL':'NAV';};
const _v1=new V3(),_v2=new V3(),_v3=new V3(),Yup=new V3(0,1,0);
function drawAV8Hud(P,fs){
  const k=KPX*D2R,T2=(s,a,e,al='left')=>{const p=hb(a,e);if(p)txt(s,p.x,p.y,al);return p;},seg=(a1,e1,a2,e2)=>{const p=hb(a1,e1),q=hb(a2,e2);if(p&&q)line(p.x,p.y,q.x,q.y);},
    small=hfont(Math.round(fs*.8)),big=hfont(Math.round(fs*1.05));hx.lineWidth=1.6;
  const mode=hudModeAV8(P),e=EDP(P),gs=Math.hypot(P.vel.x,P.vel.z),vn=P.vel.clone();if(vn.lengthSq()<4)P.fwd(vn);vn.normalize();const fpm=projDir(vn);
  const alt=Math.max(0,P.pos.y*3.2808),agl=Math.max(0,(P.pos.y-groundAt(P.pos.x,P.pos.z))*3.2808),useR=sv('altR',0)&&agl<5000,aShow=useR?agl:alt,vs=P.vel.y*196.85;
  hx.font=big;
  // ---- pitch ladder, referenced to the aircraft attitude and rolled with it (5° lines, dashed below the horizon) ----
  {const hz=_v1.set(vn.x,0,vn.z);if(hz.lengthSq()<1e-6){P.fwd(hz);hz.y=0;}hz.normalize();const hr=_v2.set(-hz.z,0,hz.x);const gam=Math.asin(clamp(vn.y,-1,1))*R2D;
    const pt=(el,a)=>{const d=_v3.copy(hz).multiplyScalar(Math.cos(el*D2R)).addScaledVector(Yup,Math.sin(el*D2R)).addScaledVector(hr,Math.tan(a*D2R));return projDir(d.normalize());};
    for(let el=Math.ceil((gam-14)/5)*5;el<=gam+14;el+=5){if(el<-90||el>90)continue;hx.save();if(el<0)hx.setLineDash([7,6]);
      for(const s of[-1,1]){const a=pt(el,s*2.2),b=pt(el,s*(el===0?8.6:5.4));if(a&&b)line(a.x,a.y,b.x,b.y);}hx.setLineDash([]);
      if(el!==0)for(const s of[-1,1]){const n=pt(el,s*6.6);if(n){hx.font=small;txt(String(Math.abs(el)),n.x,n.y,'center');}}hx.restore();}}
  // ---- velocity vector marker (circle, wings, tail) ----
  if(fpm&&(gs>3||mode==='NAV')){circ(fpm.x,fpm.y,5.5);line(fpm.x-16,fpm.y,fpm.x-5.5,fpm.y);line(fpm.x+5.5,fpm.y,fpm.x+16,fpm.y);line(fpm.x,fpm.y-5.5,fpm.x,fpm.y-12);}
  hx.font=big;const cas=Math.round(P.cas||0);
  if(mode==='NAV'){
    // heading scale: two-digit tens, dots every 5°, aircraft heading index, bearing-to-waypoint caret
    const hd=P.hdg,E=7.2,Kd=.34;for(let h=Math.ceil((hd-14)/5)*5;h<=hd+14;h+=5){const a=(h-hd)*Kd,p=hb(a,E);if(!p)continue;const hh=((h%360)+360)%360;if(hh%10===0){hx.font=big;txt(String(hh/10).padStart(2,'0'),p.x,p.y,'center');}else{hx.beginPath();hx.arc(p.x,p.y,1.8,0,7);hx.fill();}}
    seg(0,E-1.1,0,E-2);{const b=((brgField(P)-hd+540)%360)-180,p=hb(clamp(b,-14,14)*Kd,E-1.4);if(p){hx.beginPath();hx.moveTo(p.x,p.y);hx.lineTo(p.x-4,p.y+8);hx.lineTo(p.x+4,p.y+8);hx.closePath();hx.stroke();}}
    T2(String(Math.round(hd)).padStart(3,'0'),0,E+1.3,'center');
    T2(String(cas),-7.4,3.6,'right');                                          // calibrated airspeed
    {const p=hb(7.6,3.6);if(p){hx.font=big;txt(String(Math.floor(aShow/1000)>0?Math.floor(aShow/1000):''),p.x-2,p.y,'right');hx.font=small;txt(String(Math.round(aShow%1000/10)*10%1000).padStart(3,'0'),p.x+2,p.y+2,'left');hx.font=big;}}
    hx.font=small;
    T2('Cα '+Math.max(0,(P.alpha||0)*R2D).toFixed(1),-10.4,-1.4);T2('M '+(P.mach||0).toFixed(2),-10.4,-2.5);T2('G '+(P.nz||1).toFixed(1),-10.4,-3.6);T2('S '+Math.round(gs*1.944),-10.4,-4.7);
    {const rb=((Math.atan2(AF.x-P.pos.x,-(AF.z-P.pos.z))*R2D+360)%360);T2(g3(rb)+' '+Math.min(99.9,distField(P)).toFixed(1),-10.4,-5.8);}T2('MAX G '+(P.maxNz||1).toFixed(1),-10.4,-7);
    T2(Math.round(vs/100)*100+' FPM',8.2,.6);T2(Math.min(99.9,distField(P)).toFixed(1)+' WYPT 1',8.2,-.6);{const d=new Date();T2(String(d.getUTCHours()).padStart(2,'0')+'.'+String(d.getUTCMinutes()).padStart(2,'0')+'.'+String(d.getUTCSeconds()).padStart(2,'0'),8.2,-3.4);}
    T2(g3(P.hdg),8.2,-5.6);
  }else{
    // VSTOL: AoA analog scale (left), digital RPM / JPT, nozzle and flap (right), vertical speed analog scale, witch hat, side-slip indicator
    hx.font=small;{const a=-6.2,e0=-4.2,e1=3.4;for(let i=0;i<=8;i++){const el=e0+(e1-e0)*i/8,p=hb(a,el);if(!p)continue;line(p.x,p.y,p.x+(i%2?4:8),p.y);}
      const u=clamp(((P.alpha||0)*R2D+1.5)/30,0,1),p=hb(a,e0+(e1-e0)*u);if(p){hx.beginPath();hx.moveTo(p.x+10,p.y);hx.lineTo(p.x+18,p.y-5);hx.lineTo(p.x+18,p.y+5);hx.closePath();hx.stroke();}}
    T2('Cα '+Math.max(0,(P.alpha||0)*R2D).toFixed(1),-10.4,-1.4);T2(String(cas),-10.4,-2.5);T2('R '+Math.round(e.rpm),-10.4,-3.6);T2('J '+Math.round(e.jpt),-10.4,-4.7);
    {const a=6.4,e0=-3.6,e1=3.6;for(let i=0;i<=8;i++){const el=e0+(e1-e0)*i/8,p=hb(a,el);if(!p)continue;line(p.x,p.y,p.x+(i%4===0?9:4),p.y);}
      const p=hb(a,(e0+e1)/2+clamp(vs/2000,-1,1)*(e1-e0)/2);if(p){hx.beginPath();hx.moveTo(p.x,p.y);hx.lineTo(p.x-8,p.y-4);hx.lineTo(p.x-8,p.y+4);hx.closePath();hx.stroke();}}
    T2(Math.round(vs/10)*10+' FPM',7.4,4.6);T2(Math.round(e.noz)+' N',8.4,-1.0);T2(Math.round((P.flapPos||0)*(P.ac.flapMax||60))+' F',8.4,-2.1);
    {const r=hb(0,-7.2);if(r){circ(r.x,r.y,k*1.1);const sl=clamp(-(P.beta||0)*R2D*3,-k*3,k*3);line(r.x+sl,r.y-k*1.3,r.x+sl,r.y+k*1.3);}}
    // witch hat: depressed attitude symbol at the pitch reference
    {const p=hb(0,-(P.pitch||0)*R2D*.9);if(p&&Math.abs((P.pitch||0)*R2D)<30){line(p.x-k*1.2,p.y+k*.6,p.x,p.y-k*.6);line(p.x,p.y-k*.6,p.x+k*1.2,p.y+k*.6);}}
    if(e.inj>.3)T2('W',-10.4,-5.8);T2('CAST',-3,-7.6);T2(g3(P.hdg),0,7.2,'center');
    {const t=P.mass*2.2046,l=(P.ac.vstol.vlMax||0)*2.2046;if(e.vlw&&blink)T2('VL WT',0,5,'center');}
  }
  // pull-up warning (impact predicted along the velocity vector)
  {let warn=false;if(!P.onGnd&&gs>25){for(let t=1;t<=6;t+=.5){const x=P.pos.x+P.vel.x*t,y=P.pos.y+P.vel.y*t,z=P.pos.z+P.vel.z*t;if(y<groundAt(x,z)+40){warn=true;break;}}}if(warn&&blink)T2('PULL UP',0,-8.6,'center');}
  hx.font=small;T2(mode,-10.4,-8.2);}
{const _h=drawHudSym;drawHudSym=function(P,fs,lh){if(P&&P.type===ID){try{drawAV8Hud(P,fs);}catch(e){if(!drawAV8Hud._w){drawAV8Hud._w=1;console.warn('[av8pit] HUD',e);}}return;}return _h.apply(this,arguments);};}
{const _a=agHud;agHud=function(P,fs){if(P&&P.type===ID&&hudModeAV8(P)==='VSTOL')return;return _a.apply(this,arguments);};}


F.hyd=(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#0d0e0f';c.fillRect(0,0,S,S);const run=running(P),h=run?3000:0,s=S/192;
  const win=(y,lb,v)=>{c.fillStyle='#000';c.fillRect(10*s,y*s,172*s,34*s);c.strokeStyle='#555';c.lineWidth=2;c.strokeRect(10*s,y*s,172*s,34*s);mt(c,lb,16*s,(y+17)*s,12*s,INK,'left');mt(c,String(v),176*s,(y+17)*s,20*s,'#ffb21a','right');};
  win(8,'BRAKE',run?3000:Math.round(sv('brk',2800)));win(52,'HYD 1',h);win(96,'HYD 2',h);win(140,'ACCUM',run?3:2.9);};
// instrument panel layout [key, x, y, half-size, face]
const INST=[['aoa8',185,690,56,F.aoa8],['sas',455,690,62,F.sas],['alt',600,690,66,F.alt],['vvi',738,696,56,F.vvi],['tns',840,706,40,F.tns],['clk',1090,740,40,F.clk]];
const SQ=[['sby',320,676,86,F.sby]];
const UFCKEYS=UFCK;

function build(ctx){const{g,box,LM,liveTex}=ctx;const ctls=[],upd=[],lamps=[];
  const hit=new THREE.MeshBasicMaterial({visible:false});
  // redraw gating: gauges redraw only when what they show has changed (quantised to what is visible)
  const q=(v,s)=>Math.round((v||0)*s);
  const FASTK=new Set(['masi','aoa','adi','hsi','alt','vvi','acc','sby','ralt']);
  // v259: each fast gauge keys only on the values it shows (plus STV and a 2 Hz refresh), instead of every gauge redrawing and
  // re-uploading whenever any flight value changes. Gauges not listed in FKSUB keep the full key, as before.
  const FKSUB={masi:[3,4],asi:[3,4],aoa:[5,13],adi:[0,1,2,5,10,12,13],sby:[0,1,2,10],hsi:[2,12],crs:[2,12],bdhi:[2,12],alt:[6],vvi:[7],acc:[8,9],ralt:[11],tb:[0,2,8,10]};
  const gate=k=>{let last=null;const fast=FASTK.has(k),sub=FKSUB[k];return()=>{const key=!fast?SK:sub?sub.map(i=>FKA[i]).join()+'|'+STV+'|'+Math.floor(now()*2):FK;if(key===last)return false;last=key;return true;};};
  const PC=0x3a3e41,pm=LM(PC,12),dk=LM(0x1b1d1f,8),blk=LM(0x0b0c0d,4),bz=LM(0x141618,40),met=LM(0x9aa0a4,60);
  const board=new THREE.Group();board.position.set(0,-.45,-.74);board.rotation.x=-.18;g.add(board);

  // ---- outline: sloped glareshield shoulders over the MPCD / UFC / MPCD row, lower instrument tier ----
  const OUT=[[108,812],[108,360],[150,235],[260,190],[1050,190],[1160,235],[1182,360],[1182,812]];
  const sh=new THREE.Shape();OUT.forEach(([x,y],i)=>i?sh.lineTo(bx(x),by(y)):sh.moveTo(bx(x),by(y)));
  const X0=100,Y0=180,W0=1090,H0=640,bg=document.createElement('canvas');bg.width=1635;bg.height=960;const SX=bg.width/W0,SY=bg.height/H0,fx=x=>(x-X0)*SX,fy=y=>(y-Y0)*SY;
  {const c=bg.getContext('2d');c.fillStyle='#26292a';c.fillRect(0,0,bg.width,bg.height);
    const lab=(s,x,y,sz=11,al='center',col='#e9e9e2')=>{c.font=`bold ${sz*SX}px Arial`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;s.split('\n').forEach((l,i,a)=>c.fillText(l,fx(x),fy(y)+(i-(a.length-1)/2)*sz*SX*1.15));};
    const box2=(x0,y0,x1,y1,col='#141516')=>{c.fillStyle=col;c.fillRect(fx(x0),fy(y0),(x1-x0)*SX,(y1-y0)*SY);};
    box2(110,225,360,475,'#101112');box2(895,225,1145,475,'#101112');box2(450,225,692,475,'#101112');
    lab('LEFT MPCD',235,486,9);lab('RIGHT MPCD',1020,486,9);lab('UFC',570,486,9);
    // HUD control panel
    box2(222,500,475,596,'#17191a');lab('HUD CONTROL PANEL',348,508,8);lab('SYM BRT',248,556,6);lab('SYM REJ',292,556,6);lab('DAY AUTO NIGHT',336,556,6);lab('VIDEO BRT',381,556,6);lab('CONT',418,556,6);lab('ALT',455,556,7);
    lab('NAV',262,528,8);lab('VSTOL',312,528,8);
    // standby tier labels
    lab('STBY AOA',185,628,7);lab('STBY ATT',320,578,7);lab('STBY ASI',455,624,7);lab('STBY ALT',600,622,7);lab('STBY VSI',738,640,7);lab('T&S',840,664,7);
    lab('FUEL',985,505,9);lab('DECM / EXPENDABLES',1005,780,7);lab('CLOCK',1090,790,7);lab('LDG GEAR',150,760,8);
    lab('EDP',765,486,8);lab('WARNING',860,486,8);lab('CAUTION',400,486,8);
    c.fillStyle='rgba(255,255,255,.22)';for(const [x,y] of[[125,240],[1165,240],[125,800],[1165,800],[640,200]]){c.beginPath();c.arc(fx(x),fy(y),5,0,7);c.fill();}}
  const bgT=new THREE.CanvasTexture(bg);bgT.anisotropy=8;ctx.o.tex.push(bgT);
  const geo=new THREE.ShapeGeometry(sh);{const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i)/K+OX,y=OY-p.getY(i)/K;uv.setXY(i,(x-X0)/W0,1-(y-Y0)/H0);}uv.needsUpdate=true;}
  const faceM=new THREE.MeshBasicMaterial({map:bgT,toneMapped:false});ctx.o.faces.push(faceM);const bm=new THREE.Mesh(geo,faceM);bm.userData.cwFx=1;board.add(bm);
  {const eg=new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false});const e=new THREE.Mesh(eg,pm);e.position.z=-.031;e.userData.cwFx=1;board.add(e);}

  const glsM=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.08,shininess:140,specular:0x8a8a8a,depthWrite:false});
  function inst(k,x,y,hs,draw,round){const S=k==='adi'||k==='bdhi'||k==='sby'?256:hs<40?96:192,cv=document.createElement('canvas');cv.width=cv.height=S;const t=new THREE.CanvasTexture(cv);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;ctx.o.tex.push(t);
    const c=cv.getContext('2d'),r=hs*K;
    if(round){const cs=new THREE.Mesh(new THREE.CylinderGeometry(r*1.03,r*1.08,.03,36),bz);cs.rotation.x=Math.PI/2;cs.position.set(bx(x),by(y),.008);cs.userData.cwFx=1;board.add(cs);}else box(board,2*r*1.04,2*r*1.04,.03,bz,bx(x),by(y),.008);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const fm=new THREE.Mesh(round||k==='adi'||k==='bdhi'||k==='sby'?new THREE.CircleGeometry(r*.9,48):new THREE.PlaneGeometry(r*1.8,r*1.8),m);fm.position.set(bx(x),by(y),.0235);fm.userData.cwFx=1;board.add(fm);
    {const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.92,r*.05,8,40),LM(0x0a0a0a,30));ring.position.set(bx(x),by(y),.0245);ring.userData.cwFx=1;board.add(ring);
      const gl=new THREE.Mesh(new THREE.CircleGeometry(r*.92,40),glsM);gl.position.set(bx(x),by(y),.026);gl.userData.cwFx=1;gl.renderOrder=2;board.add(gl);
      for(const [sx,sy] of[[-1,-1],[1,-1],[-1,1],[1,1]]){const s=new THREE.Mesh(new THREE.CylinderGeometry(r*.06,r*.06,.004,8),met);s.rotation.x=Math.PI/2;s.position.set(bx(x)+sx*r*.88,by(y)+sy*r*.88,.024);board.add(s);}}
    const gt=gate(k);upd.push(P=>{if(!gt())return;if(k!=='labs'){face(c,S);c.scale(S/256,S/256);}draw(c,P);t.needsUpdate=true;});}
  INST.forEach(([k,x,y,hs,d])=>inst(k,x,y,hs,d,true));SQ.forEach(([k,x,y,hs,d])=>inst(k,x,y,hs,d,false));
  function lampAt(par,x,y,z,w,h,lg,col,lit,ww,hh){const cv=document.createElement('canvas');cv.width=128;cv.height=Math.max(32,Math.round(128*hh/ww));const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const lm=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);lm.position.set(x,y,z);lm.userData.cwFx=1;par.add(lm);let last=null;
    lamps.push(P=>{const on=lampTest>now()||!!lit(P);if(on===last)return;last=on;c.fillStyle=on?col:'#1c1a14';c.fillRect(0,0,cv.width,cv.height);const n=lg.split('\n');c.font=`bold ${Math.round(cv.height*(n.length>1?.3:.42))}px Arial`;c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=on?'#200':'#5a5444';n.forEach((l,i,a)=>c.fillText(l,64,cv.height/2+(i-(a.length-1)/2)*cv.height*.36));t.needsUpdate=true;});return lm;}
  LAMPS.forEach(([k,x,y,w,h,lg,col,lit])=>{lampAt(board,bx(x),by(y),.016,w*K,h*K,lg,col,lit,w,h);box(board,w*K+.004,h*K+.004,.012,blk,bx(x),by(y),.009);});
  function reg(par,mesh,name,state,act){mesh.userData.ctl={meshes:[mesh],name,state,act:(d)=>{try{act(d);}catch(e){console.warn('[a4pit]',name,e);}try{sfx.click();}catch(e){}}};ctls.push(mesh.userData.ctl);}
  function toggle(par,x,y,z,name,pos,get,set,o={}){const gq=new THREE.Group();gq.position.set(x,y,z);if(o.rx)gq.rotation.x=o.rx;if(o.ry)gq.rotation.y=o.ry;par.add(gq);
    const nut=new THREE.Mesh(new THREE.CylinderGeometry(.0065,.0065,.004,12),met);nut.rotation.x=Math.PI/2;gq.add(nut);
    const lv=new THREE.Group();gq.add(lv);const st=new THREE.Mesh(new THREE.CylinderGeometry(.0022,.0028,.022,8),LM(o.col||0xd8d8d0,50));st.position.y=.011;lv.add(st);
    if(o.guard){const gd=new THREE.Group();gq.add(gd);box(gd,.02,.004,.03,LM(0xc8281e,30),0,.002,.014);gq.userData.guard=gd;}
    const h=new THREE.Mesh(new THREE.BoxGeometry(.026,.03,.03),hit);h.userData.cwFx=1;gq.add(h);
    const n=pos.length;let cur=-1;upd.push(()=>{const i=clamp(get(),0,n-1);if(i===cur)return;cur=i;lv.rotation.x=n===2?(i?-.55:.55):(i-1)*-.6;if(gq.userData.guard)gq.userData.guard.rotation.x=o.guardUp&&o.guardUp()?-1.6:0;});
    reg(gq,h,name,()=>pos[clamp(get(),0,n-1)],d=>{const i=get();set(n===2?1-i:(i+(d<0?-1:1)+n)%n);});return gq;}
  function knob(par,x,y,z,r,name,pos,key,get,set,o={}){const gq=new THREE.Group();gq.position.set(x,y,z);if(o.rx)gq.rotation.x=o.rx;par.add(gq);
    const kb=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.08,r*.9,16),LM(o.col||0x111213,30));kb.rotation.x=Math.PI/2;gq.add(kb);
    const pt=new THREE.Group();gq.add(pt);box(pt,r*.25,r*1.05,r*.3,LM(0xe8e8e0,30),0,r*.4,r*.5);
    const h=new THREE.Mesh(new THREE.BoxGeometry(r*2.6,r*2.6,r*2),hit);h.userData.cwFx=1;gq.add(h);
    const g2=get||(()=>sv(key,0)),s2=set||(v=>ST[key]=v);let cur=-1;
    upd.push(()=>{const i=g2();if(i===cur)return;cur=i;pt.rotation.z=-(-.9+1.8*(pos.length>1?i/(pos.length-1):0));});
    reg(gq,h,name,()=>pos[clamp(g2(),0,pos.length-1)],d=>s2((g2()+(d<0?-1:1)+pos.length)%pos.length));return gq;}
  function button(par,x,y,z,r,name,col,act,state){const b=new THREE.Mesh(new THREE.CylinderGeometry(r,r,r*.8,14),LM(col,40));b.rotation.x=Math.PI/2;b.position.set(x,y,z);par.add(b);
    const h=new THREE.Mesh(new THREE.BoxGeometry(r*3,r*3,r*3),hit);h.position.set(x,y,z);h.userData.cwFx=1;par.add(h);reg(par,h,name,state||(()=>'PUSH'),act);return b;}
  const hitBox=(par,x,y,z,w,h,name,state,act)=>{const hb=new THREE.Mesh(new THREE.BoxGeometry(w,h,.012),hit);hb.position.set(x,y,z);hb.userData.cwFx=1;par.add(hb);reg(par,hb,name,state,act);};
  const BZ=.02;
  const hdl=(par,x,y,z,w,h,name,state,act)=>hitBox(par,x,y,z,w,h,name,state,act);
  const CY=-.64,CW=.2,CZ0=-.54,CZ1=.3;
  // panel covering a strip of one console: u0..u1 across (0 = outboard edge), figure y range y0..y1 mapped onto z
  function cpanel(side,u0,u1,z0,z1,title,draw){const w=CW*(u1-u0),xo=side*(.43+CW/2)-side*CW*((u0+u1)/2),d=z1-z0,cv=document.createElement('canvas');cv.width=Math.max(64,Math.round(w*1500));cv.height=Math.max(48,Math.round(d*1500));const c=cv.getContext('2d');
    c.fillStyle='#2b2f32';c.fillRect(0,0,cv.width,cv.height);c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=3;c.strokeRect(3,3,cv.width-6,cv.height-6);
    c.font='bold 15px Arial';c.textAlign='center';c.fillStyle='#ececE4';if(title)c.fillText(title,cv.width/2,19);if(draw)draw(c,cv.width,cv.height);
    for(const [sx,sy] of[[9,9],[cv.width-9,9],[9,cv.height-9],[cv.width-9,cv.height-9]]){c.fillStyle='rgba(255,255,255,.3)';c.beginPath();c.arc(sx,sy,3.5,0,7);c.fill();}
    const t=new THREE.CanvasTexture(cv);t.anisotropy=4;ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);pl.rotation.x=-Math.PI/2;pl.position.set(xo,CY+.001,(z0+z1)/2);pl.userData.cwFx=1;g.add(pl);
    // u across from the inboard edge for the right console reads left-to-right as seen from the seat
    return{at:(u,v,h=.004)=>[xo-w/2+u*w,CY+h,z0+v*d],lab:(s,u,v,sz=11)=>{c.font=`bold ${sz}px Arial`;c.textAlign='center';c.fillStyle='#e0e0d8';s.split('\n').forEach((l,i)=>c.fillText(l,u*cv.width,v*cv.height+i*(sz+2)));t.needsUpdate=true;}};}
  const tg=(p,u,v,name,pos,get,set,o={})=>{const[x,y,z]=p.at(u,v);return toggle(g,x,y,z,name,pos,get,set,Object.assign({rx:-Math.PI/2},o));};
  const kn=(p,u,v,r,name,pos,key,get,set,o={})=>{const[x,y,z]=p.at(u,v,.006);return knob(g,x,y,z,r,name,pos,key,get,set,Object.assign({rx:-Math.PI/2},o));};
  const lpC=(p,u,v,name,col,lit)=>{const[x,y,z]=p.at(u,v,.003);const m=new THREE.MeshBasicMaterial({color:0x221a10});const b=new THREE.Mesh(new THREE.CylinderGeometry(.0055,.0055,.005,12),m);b.position.set(x,y,z);g.add(b);
    lamps.push(P=>{m.color.set(lampTest>now()||lit(P)?col:0x221a10);});const h=new THREE.Mesh(new THREE.BoxGeometry(.016,.01,.016),hit);h.position.set(x,y,z);h.userData.cwFx=1;g.add(h);reg(g,h,name,()=>lit(PL())?'ON':'OFF',()=>{});};
  // figure y → z, per console

  /* ---------- consoles ---------- */
  const T_=(u,v,n,p,k,d=0,x={})=>Object.assign({t:'t',u,v,n,p,k,d},x),K_=(u,v,n,p,k,d=0,x={})=>Object.assign({t:'k',u,v,n,p,k,d},x),B_=(u,v,n,act,x={})=>Object.assign({t:'b',u,v,n,act},x);
  function panel(side,u0,u1,y0,y1,title,items,draw){const zf=side<0?zL:zR,p=side<0?cpanel(-1,u0,u1,zf(y0),zf(y1),title,draw):cpanel(1,1-u1,1-u0,zf(y0),zf(y1),title,draw);
    for(const it of items||[]){const get=it.g||(()=>sv(it.k,it.d)),set=it.s||(x=>{ST[it.k]=x;});
      if(it.t==='t')tg(p,it.u,it.v,it.n,it.p,get,set,it.o||{});else if(it.t==='k')kn(p,it.u,it.v,it.r||.009,it.n,it.p,it.k,get,set,it.o||{});
      else{const[x,y,z]=p.at(it.u,it.v,.006);button(g,x,y,z,it.r||.006,it.n,it.col||0x2a2a2a,it.act||(()=>{}));}
      const lb=it.l!=null?it.l:it.n.replace(/\s*\(.*$/,'').replace(/ · .*/,'');if(lb){const ws=lb.split(' '),ln=[''];for(const w of ws){if((ln[ln.length-1]+' '+w).trim().length>10&&ln[ln.length-1])ln.push(w);else ln[ln.length-1]=(ln[ln.length-1]+' '+w).trim();}p.lab(ln.join('\n'),it.u,Math.min(.9,it.v+(it.ly!=null?it.ly:.24)),7);}}
    return p;}

  // ---- flat live screens: MPCDs and UFC ----
  function screen(k,cx,cy,half,bezel,S,draw){const cv=document.createElement('canvas');cv.width=cv.height=S;const t=new THREE.CanvasTexture(cv);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;ctx.o.tex.push(t);const c=cv.getContext('2d');
    box(board,bezel*2*K,bezel*2*K,.03,bz,bx(cx),by(cy),.008);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const fm=new THREE.Mesh(new THREE.PlaneGeometry(half*2*K,half*2*K),m);fm.position.set(bx(cx),by(cy),.0235);fm.userData.cwFx=1;board.add(fm);
    const gl=new THREE.Mesh(new THREE.PlaneGeometry(half*2*K,half*2*K),glsM);gl.position.set(bx(cx),by(cy),.026);gl.userData.cwFx=1;gl.renderOrder=2;board.add(gl);
    const gt=gate(k);upd.push(P=>{if(!gt())return;draw(c,P);t.needsUpdate=true;});}
  screen('edp',765,335,64,70,192,(c,P)=>F.edp(c,P));screen('fuelT',985,615,84,92,192,(c,P)=>F.fuelT(c,P));screen('hyd',158,548,44,52,192,(c,P)=>F.hyd(c,P));
  screen('mpl',235,350,95,125,256,mpcd('l','EHSD'));
  screen('mpr',1020,350,95,125,256,mpcd('r','STRS'));
  screen('ufc',570,350,115,122,256,(c,P)=>{ufcDraw2(c,P);});
  function ufcDraw2(c,P){const W=256,on=powered(P);c.setTransform(1,0,0,1,0,0);c.fillStyle='#111314';c.fillRect(0,0,W,W);
    const win=(x,y,w,h,s,col=GR,sz)=>{c.fillStyle='#020804';c.fillRect(x,y,w,h);c.strokeStyle='#3a3d3f';c.lineWidth=2;c.strokeRect(x,y,w,h);if(on&&s)mt(c,s,x+w/2,y+h/2+1,sz||h*.62,col,'center');};
    win(8,8,76,26,'TMR',GD,13);win(92,8,156,26,sv('pad','')||sv('comm1','127.500'),GR,20);win(8,40,76,22,sv('pad2','PLN'),GD,13);win(92,40,70,22,'COMM 1',GD,11);win(170,40,78,22,sv('comm2','225.000'),GD,12);
    const keys=[['1','2','3','I/P'],['4','5','6','SVE'],['7','8','9','VOL'],['ENT','0','CLR','BRT']];c.fillStyle='#1c1e20';
    keys.forEach((r,i)=>r.forEach((s,j)=>{const x=10+j*58,y=74+i*34;c.fillStyle='#232628';c.fillRect(x,y,50,28);c.strokeStyle='#3d4144';c.strokeRect(x,y,50,28);mt(c,s,x+25,y+15,12,INK,'center');}));
    [['IFF','TCN','AWL','WPN'],['WOF','BCN','ALT','EMCON']].forEach((r,i)=>r.forEach((s,j)=>{const x=10+j*58,y=214+i*20;mt(c,s,x+25,y+8,s.length>3?8:10,'#c8cac4','center');}));
    mt(c,'COMM1',18,252,8,DIM,'left');mt(c,'COMM2',238,252,8,DIM,'right');}
  // MPCD: 5 top / 5 bottom / 5 left / 5 right option select buttons on the glass; DAY/NGT, OFF/BRT, SYM, GAIN, CONT on the bezel
  function osbs(side,cx,cy,half,defPage){const S=256,sc=half*2/S,pos=(fx,fy)=>[cx-half+fx*sc,cy-half+fy*sc];
    const nm=(g,i)=>{const L=(MPD[mpg(side)]||MPD.MENU).lab(side,PL()||{ac:{}});const s=((L[g]||[])[i]||'').replace('*','');return 'MPCD '+(side==='l'?'LEFT':'RIGHT')+' \u00b7 OSB '+({t:'T',b:'B',l:'L',r:'R'}[g])+(i+1)+(s?' ('+s+')':'');};
    for(let i=0;i<5;i++){const[x,y]=pos(px(S,i),14);hitBox(board,bx(x),by(y),.03,30*K,16*K,nm('t',i),()=>'PUSH',()=>mpPress(side,'t',i));}
    for(let i=0;i<5;i++){const[x,y]=pos(px(S,i),S+6);hitBox(board,bx(x),by(y+6),.03,34*K,18*K,nm('b',i),()=>'PUSH',()=>mpPress(side,'b',i));}
    for(let i=0;i<5;i++){const[x,y]=pos(-8,py(S,i));hitBox(board,bx(x-8),by(y),.03,18*K,30*K,nm('l',i),()=>'PUSH',()=>mpPress(side,'l',i));const[x2,y2]=pos(S+8,py(S,i));hitBox(board,bx(x2+8),by(y2),.03,18*K,30*K,nm('r',i),()=>'PUSH',()=>mpPress(side,'r',i));}
    // bezel controls
    const bz=(fx,fy,w,h,name,fn,rd)=>{const[x,y]=pos(fx,fy);hitBox(board,bx(x),by(y),.03,w*K,h*K,name,rd||(()=>'PUSH'),fn);};
    const sd='mp'+side;
    bz(24,-18,34,16,'MPCD DAY / NGT',()=>{ST[sd+'n']=sv(sd+'n',0)?0:1;},()=>sv(sd+'n',0)?'NGT':'DAY');
    bz(S/2,-18,40,16,'MPCD OFF / BRT',()=>{if(!sv(sd+'p',1)){ST[sd+'p']=1;ST[sd+'b']=0;}else if(sv(sd+'b',3)>=3){ST[sd+'p']=0;}else ST[sd+'b']=sv(sd+'b',3)+1;},()=>sv(sd+'p',1)?'BRT '+(sv(sd+'b',3)+1):'OFF');
    bz(S-24,-18,34,16,'MPCD SYM',()=>{ST[sd+'y']=(sv(sd+'y',2)+1)%3;},()=>['LOW','MED','HIGH'][sv(sd+'y',2)]);
    bz(-14,S+12,30,16,'MPCD GAIN',()=>{ST[sd+'gn']=(sv(sd+'gn',2)+1)%4;},()=>String(sv(sd+'gn',2)));
    bz(S+14,S+12,30,16,'MPCD CONT',()=>{ST[sd+'ct']=(sv(sd+'ct',2)+1)%4;},()=>String(sv(sd+'ct',2)));}
  osbs('l',235,350,95,'EHSD');osbs('r',1020,350,95,'STRS');
  // UFC keypad
  {const ux=570-115,uy=350-115,sc=230/256,keys=[['1','2','3','I/P'],['4','5','6','SVE'],['7','8','9','VOL'],['ENT','0','CLR','BRT']];
    const press=s=>{const cur=sv('pad','');if(/^[0-9]$/.test(s)){if(cur.replace('.','').length<6){let n=cur.replace('.','')+s;ST.pad=n.length>3?n.slice(0,3)+'.'+n.slice(3):n;}}
      else if(s==='CLR'){ST.pad=cur.slice(0,-1);}else if(s==='ENT'){const d=cur.replace('.','');if(d.length>=5){const f=d.slice(0,3)+'.'+(d.slice(3)+'000').slice(0,3);ST.comm1=f;ST.pad='';try{radio('COMM 1 · '+f);}catch(e){}}}
      else if(s==='VOL'||s==='BRT'){try{radio('UFC · '+s);}catch(e){}}else{try{radio('UFC · '+s);}catch(e){}}};
    keys.forEach((r,i)=>r.forEach((s,j)=>{const x=ux+(10+j*58+25)*sc,y=uy+(74+i*34+14)*sc;hitBox(board,bx(x),by(y),.03,50*sc*K,28*sc*K,'UFC · '+s,()=>sv('pad','')||'—',()=>press(s));}));
    [['IFF','TCN','AWL','WPN'],['WOF','BCN','ALT','EMCON']].forEach((r,i)=>r.forEach((s,j)=>{const x=ux+(10+j*58+25)*sc,y=uy+(214+i*20+8)*sc;hitBox(board,bx(x),by(y),.03,50*sc*K,18*sc*K,'UFC · '+s,()=>'PUSH',()=>press(s));}));}
  // master caution / master warning, caution lights, warning ladder
  const mcL=lampAt(board,bx(440),by(208),.016,92*K,30*K,'MASTER\nCAUTION','#fa3',P=>cautions(P).length>0&&!mcAck,92,30);box(board,92*K+.004,30*K+.004,.012,blk,bx(440),by(208),.009);
  const mwL=lampAt(board,bx(835),by(208),.016,92*K,30*K,'MASTER\nWARNING','#f33',P=>WARNL.some(w=>{try{return w[1](P);}catch(e){return false;}})&&!mwAck,92,30);box(board,92*K+.004,30*K+.004,.012,blk,bx(835),by(208),.009);
  hitBox(board,bx(440),by(208),.03,92*K,30*K,'MASTER CAUTION · push to reset',()=>'PUSH',()=>{mcAck=true;});
  hitBox(board,bx(835),by(208),.03,92*K,30*K,'MASTER WARNING · push to reset',()=>'PUSH',()=>{mwAck=true;});
  CAUTL.forEach(([lg,lit],i)=>{lampAt(board,bx(400),by(262+i*27),.016,76*K,22*K,lg,'#ffb21a',lit,76,22);box(board,76*K+.004,22*K+.004,.012,blk,bx(400),by(262+i*27),.009);});
  WARNL.forEach(([lg,lit],i)=>{lampAt(board,bx(861),by(246+i*22),.016,56*K,18*K,lg,'#ff3a2a',lit,56,18);box(board,56*K+.004,18*K+.004,.012,blk,bx(861),by(246+i*22),.009);});
  // ---------- clickable controls: instrument panel ----------
  // HUD control panel
  button(board,bx(262),by(542),BZ,9*K,'HUD · NAV mode',0x2a6a3a,()=>{ST.hudM=0;},()=>hudModeAV8(PL()||{ac:{}})==='NAV'?'NAV':'—');
  button(board,bx(312),by(542),BZ,9*K,'HUD · VSTOL mode',0x2a6a3a,()=>{ST.hudM=1;},()=>hudModeAV8(PL()||{ac:{}})==='VSTOL'?'VSTOL':'—');
  hdl(board,bx(288),by(518),BZ,130*K,14*K,'HUD · NAV / VSTOL auto select (nozzles >= 15)',()=>ST.hudM===undefined?'AUTO':ST.hudM?'VSTOL':'NAV',()=>{ST.hudM=undefined;});
  knob(board,bx(248),by(576),BZ,10*K,'HUD SYMBOLOGY BRIGHTNESS',['LOW','MED','HIGH','MAX'],'hudB',()=>sv('hudB',2),v=>{ST.hudB=v;try{sys.hud.brt=[.45,.7,.9,1][v];}catch(e){}});
  toggle(board,bx(292),by(576),BZ,'HUD SYMBOLOGY REJECT · NORM / REJ 1 / REJ 2',['NORM','REJ 1','REJ 2'],()=>sv('rej',0),v=>{ST.rej=v;});
  toggle(board,bx(336),by(576),BZ,'HUD DAY / AUTO / NIGHT MODE SELECTOR',['DAY','AUTO','NIGHT'],()=>sv('hdn',0),v=>{ST.hdn=v;try{sys.hud.day=[0,1,2][v];}catch(e){}});
  knob(board,bx(381),by(576),BZ,9*K,'HUD VIDEO BRIGHTNESS',['1','2','3','4','5'],'hvb',()=>sv('hvb',2));
  knob(board,bx(418),by(576),BZ,9*K,'HUD VIDEO CONTRAST',['1','2','3','4','5'],'hvc',()=>sv('hvc',2));
  toggle(board,bx(455),by(576),BZ,'HUD ALTITUDE SELECTOR · BARO / RDR',['BARO','RDR'],()=>sv('altR',0),v=>{ST.altR=v;});
  // EDP, standby, fuel, DECM
  button(board,bx(712),by(408),BZ,7*K,'EDP BUILT-IN TEST',0x333333,()=>{lampTest=now()+3;});
  knob(board,bx(828),by(408),BZ,8*K,'EDP BRIGHTNESS',['OFF','LOW','MED','HIGH'],'edpB',()=>sv('edpB',3));
  button(board,bx(320),by(752),BZ,10*K,'STANDBY ATTITUDE · CAGE / FAST ERECT',0x333333,()=>{ST.erect=now();try{radio('STANDBY ATTITUDE · ERECT');}catch(e){}});
  knob(board,bx(1100),by(560),BZ,13*K,'FUEL TOTALIZER SELECTOR · TOTAL / FEED / EXT',['TOTAL','FEED','EXT'],'ftS',()=>sv('ftS',0),v=>{ST.ftS=v;});
  knob(board,bx(1100),by(665),BZ,11*K,'BINGO FUEL SET (lb)',['500','1000','1500','2000','2500'],'bingoK',()=>sv('bingoK',2),v=>{ST.bingoK=v;ST.bingo=[500,1000,1500,2000,2500][v];});
  knob(board,bx(905),by(780),BZ,12*K,'RWR · OFF / ON / VOLUME',['OFF','ON','VOL'],'rwr',()=>sv('rwr',1));
  knob(board,bx(960),by(780),BZ,12*K,'EXPENDABLES DISPENSER · OFF / AUT / UP / RWR',['OFF','AUT','UP','RWR'],'exp',()=>sv('exp',0));
  knob(board,bx(1015),by(780),BZ,12*K,'ECM · OFF / STBY / RCV / RPT',['OFF','STBY','RCV','RPT'],'ecmK',()=>sv('ecmK',0));
  knob(board,bx(1160),by(730),BZ,9*K,'8-DAY CLOCK SET',['1'],'clkS',()=>0);
  // landing gear handle
  {const gh=new THREE.Group();gh.position.set(bx(150),by(722),.03);board.add(gh);box(gh,.008,.008,.04,met,0,0,.02);const wh=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.01,16),LM(0xe8e8e8,40));wh.rotation.x=Math.PI/2;wh.position.z=.045;gh.add(wh);
    const lt=new THREE.Mesh(new THREE.SphereGeometry(.005,8,6),new THREE.MeshBasicMaterial({color:0x330a08}));lt.position.set(0,0,.05);gh.add(lt);const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.06),hit);hb.position.z=.03;hb.userData.cwFx=1;gh.add(hb);
    reg(gh,hb,'LANDING GEAR CONTROL HANDLE',()=>gearDn()?'DOWN':'UP',()=>{try{uiKey('Digit7');}catch(e){}});upd.push(P=>{gh.position.z=.03+(gearDn()?0:.012);const tr=P.gearPos!=null&&P.gearPos>.05&&P.gearPos<.95;lt.material.color.set(tr?0xff2a1a:gearDn()?0x2aff5a:0x330a08);});}
  // nozzle position / gear lamps (3 greens)
  [-1,0,1].forEach(i=>lampAt(board,bx(150+i*26),by(785),.016,22*K,16*K,i<0?'L':i?'R':'N','#3f6',P=>gearDn()&&P.gearPos>.9,22,16));

  /* ---------- consoles ---------- */
  const zL=y=>CZ0+y/1000*(CZ1-CZ0),zR=zL;
  const on1=k=>()=>sv(k,1);
  box(g,.18,.34,.22,dk,0,-1.0,-.68);
  [-1,1].forEach(sd=>{box(g,.22,.1,.98,LM(0x2a2d30,8),sd*.43,CY-.052,-.15);box(g,.05,.1,1.3,LM(0x25282a,8),sd*.555,-.55,-.2);});
  {const sk=LM(0x1c1f21,6);box(g,1.14,.02,1.5,sk,0,-1.23,-.1);[-1,1].forEach(sd=>box(g,.03,.66,1.3,sk,sd*.565,-.93,-.2));box(g,1.1,.5,.03,sk,0,-1.0,-.86);box(g,.9,.42,.02,sk,0,-.52,-.83);}

  // ======== LEFT CONSOLE: throttle quadrant (throttle + NOZZLE lever), engine switches, lights, caution / advisory panel ========
  {const thq=panel(-1,0,1,40,430,'THROTTLE QUADRANT',[T_(.1,.12,'THROTTLE FRICTION',['OFF','ON'],'thf',0,{l:'FRICTION'}),T_(.1,.42,'MANUAL FUEL SWITCH · OFF / ON',['OFF','ON'],'manF',0,{l:'MAN FUEL'}),K_(.12,.82,'RUDDER TRIM · NOSE LEFT / NEUTRAL / NOSE RIGHT',['NOSE LEFT','NEUTRAL','NOSE RIGHT'],'rtrim',1,{r:.008,l:'RUDDER'}),
      T_(.9,.12,'FLAPS · CRUISE / AUTO / STOL',['CRUISE','AUTO','STOL'],'flpS',1,{l:'FLAPS',s:v=>{ST.flpS=v;try{const P=PL();if(P&&((v===2)!==((P.flapCmd||0)>.5)))flapKey();}catch(e){}}})]);
    const tq=new THREE.Group();g.add(tq);const[x0,y0]=thq.at(.36,0);tq.position.set(x0,y0,zL(250));
    const arm=new THREE.Group();tq.add(arm);box(arm,.01,.11,.012,met,0,.055,0);const grip=new THREE.Group();grip.position.y=.11;arm.add(grip);
    box(grip,.034,.05,.065,LM(0x1c1c1c,25),-.006,0,0);box(grip,.012,.012,.012,LM(0xb02020,30),-.022,.018,-.014);box(grip,.01,.016,.01,LM(0x777777,30),-.024,-.008,.012);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.06,.07,.08),hit);hb.userData.cwFx=1;grip.add(hb);
    reg(grip,hb,'THROTTLE',()=>{const P=PL();if(P&&P.eng&&!P.eng.done)return P.eng.e[0].fuel?'IDLE':'OFF';return Math.round((P?P.thr:0)*100)+'%';},()=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.thr();});
    upd.push(P=>{let a;if(P.eng&&!P.eng.done&&!P.eng.e[0].fuel)a=.5;else a=.32-(P.thr||0)*.8;arm.rotation.x=a;});
    const sbh=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,.02),hit);sbh.position.set(-.024,-.008,.012);sbh.userData.cwFx=1;grip.add(sbh);
    reg(grip,sbh,'SPEED BRAKE SWITCH (throttle grip)',()=>keys.has('KeyB')?'OUT':'IN',()=>{if(keys.has('KeyB'))keys.delete('KeyB');else keys.add('KeyB');});
    // NOZZLE lever (inboard of the throttle): 0 AFT, 10 STO, 82 VL stop, 98.5 BRAKE; hand-held at the nozzle-stop gate
    const nz=new THREE.Group();g.add(nz);const[nx,ny]=thq.at(.7,0);nz.position.set(nx,ny,zL(250));const nl=new THREE.Group();nz.add(nl);box(nl,.008,.09,.01,met,0,.045,0);const nk=new THREE.Mesh(new THREE.SphereGeometry(.014,12,10),LM(0x1a1a1a,30));nk.position.y=.095;nl.add(nk);
    box(nl,.02,.006,.014,LM(0xd8b820,30),0,.075,0);
    const nh=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.07),hit);nh.position.y=.09;nh.userData.cwFx=1;nl.add(nh);
    reg(nl,nh,'NOZZLE LEVER · click = next detent (0 / STO 10 / 25 / 45 / 60 / VL STOP 82 / BRAKE 98.5); at the VL stop click twice to release it',()=>{const P=PL(),e=P&&P.ac.vstol?EDP(P):null;return e?Math.round(e.cmd)+'° cmd · '+Math.round(e.noz)+'° actual'+(e.stop?' · STOP':''):'—';},d=>{if(window.VT)VT.step(d<0?-1:1);});
    // lever stop gate (visual plate)
    box(nz,.03,.004,.12,LM(0x101112,20),0,.002,0);
    upd.push(P=>{const e=P.ac.vstol?EDP(P):null;nl.rotation.x=e?.35-(e.cmd/98.5)*1.15:.35;});
    // plates under the levers
    box(g,.008,.005,.004,met,0,0,0);}
  panel(-1,0,1,440,610,'ENGINE',[T_(.12,.3,'DECS (DIGITAL ENGINE CONTROL SYSTEM) · ON / OFF',['OFF','ON'],'decs',1),T_(.3,.3,'FUEL SHUTOFF LEVER · OFF / ON (locked down)',['OFF','ON'],'fso',1,{o:{guard:true,guardUp:()=>!sv('fso',1)},l:'FUEL SHUTOFF'}),T_(.48,.3,'EFC (ENGINE FUEL CONTROL) · POS 1 / POS 2',['POS 2','POS 1'],'efc',1),
    T_(.66,.3,'ENGINE RPM SELECTOR · LOW (fan) / HIGH (compressor)',['LOW','HIGH'],'rpmS',1,{l:'RPM SEL'}),T_(.84,.3,'LIDS · NORMAL / RETRACT',['RETRACT','NORMAL'],'lids',1),
    T_(.12,.75,'OXYGEN SWITCH · ON / OFF',['OFF','ON'],'o2',1),T_(.48,.75,'WATER TANK DUMP · DUMP / OFF',['OFF','DUMP'],'wdump',0,{o:{guard:true,guardUp:()=>sv('wdump',0)},l:'WATER DUMP',s:v=>{ST.wdump=v;try{const P=PL();if(v&&P&&P.vt)P.vt.water=0;}catch(e){}}}),
    T_(.8,.75,'WATER INJECTION · ON / OFF',['OFF','ON'],'wsw',1,{l:'WATER INJ',g:()=>{const P=PL();return P&&P.vt?(P.vt.wsw?1:0):1;},s:v=>{try{const P=PL();if(P&&P.vt)P.vt.wsw=!!v;ST.wsw=v;}catch(e){}}})]);
  panel(-1,0,1,620,760,'FUEL · LIGHTS',[T_(.12,.3,'A/R PROBE · IN / OUT / OUT + PRESS',['IN','OUT','PRESS'],'probe',0,{l:'A/R PROBE',s:v=>{ST.probe=v;try{const P=PL();if(P)P.arOpen=v>0;}catch(e){}}}),T_(.34,.3,'FUEL PROPORTIONER · ON / OFF',['OFF','ON'],'prop',1,{l:'PROPORTIONER'}),K_(.58,.3,'FORMATION LIGHTS BRIGHTNESS',['OFF','DIM','BRT'],'form',0,{r:.01,l:'FORM'}),
    T_(.8,.3,'POSITION LIGHTS · OFF / BRIGHT',['OFF','BRIGHT'],'pos',1,{l:'POSITION'}),T_(.34,.78,'ANTI-COLLISION LIGHT · OFF / BRIGHT',['OFF','BRIGHT'],'acl',0,{l:'ANTI-COLL'})]);
  // caution / advisory panel (lamp grid)
  {const CAD=[['OXY','WSHLD','',''],['HYD 1','HYD 2','',''],['L PUMP','R PUMP','',''],['L TRANS','R TRANS','',''],['FLAPS 1','FLAPS 2','AUT FLP',''],['PROP','LIDS','OIL',''],['APU GEN','','GPS',''],['DEP RES','DC','STBY TR',''],['CS COOL','LOAD','CANOPY',''],['INS','SKID','EFC','NWS'],['AFC','CIP AUT','H2O SEL','APU'],['PITCH','IFF','SPD BRK','DROOP'],['ROLL','ENG EXC','BIT','']];
    const lit={'HYD 1':P=>!running(P),'HYD 2':P=>!running(P),'L PUMP':P=>fuelLb(P)<200,'R PUMP':P=>fuelLb(P)<200,'LIDS':P=>sv('lids',1)===0,'OIL':P=>running(P)&&rpm(P)<45,'EFC':P=>sv('efc',1)===0,'H2O SEL':P=>EDP(P).water<=0&&running(P),'SPD BRK':P=>(P.sb||0)>.05,'CANOPY':P=>false,'GPS':P=>false,
      'DC':P=>!(P.eng&&!P.eng.done?P.eng.gen:running(P)),'APU GEN':P=>false,'FLAPS 1':P=>false,'FLAPS 2':P=>false};
    const p=panel(-1,0,1,770,1000,'CAUTION / ADVISORY',[],(c,w,h)=>{c.fillStyle='#e8e8e0';c.font='bold 9px Arial';c.textAlign='center';CAD.forEach((r,i)=>r.forEach((s,j)=>{if(s)c.fillText(s,(.12+j*.25)*w,((.1+i*.066)*h)+13);}));});
    CAD.forEach((r,i)=>r.forEach((s,j)=>{if(s)lpC(p,.12+j*.25,.1+i*.066,'CAUTION · '+s,'#ffb21a',lit[s]||(()=>false));}));}

  // ======== RIGHT CONSOLE: electrical, comm / IFF, lights, ECS ========
  panel(1,0,1,40,300,'ELECTRICAL',[T_(.15,.35,'DC TEST SWITCH · MANUAL / OFF / STANDBY',['MANUAL','OFF','STANDBY'],'dct',1,{l:'DC TEST'}),T_(.4,.35,'GENERATOR · GEN-ON / OFF / TEST',['TEST','OFF','GEN ON'],'gen',2,{l:'GEN'}),T_(.65,.35,'BATTERY · BATT-ON / OFF / ALERT',['ALERT','OFF','BATT ON'],'batt',2,{l:'BATT'}),
    T_(.15,.8,'APU GEN · RESET / ON / OFF',['OFF','ON','RESET'],'apug',0,{l:'APU GEN'}),T_(.5,.8,'ENGINE START · ENG ST / OFF',['OFF','ENG ST'],'engst',0,{l:'ENG ST'}),
    B_(.82,.55,'ENGINE START · push to start',()=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.src();},{r:.009,l:'START'})]);
  panel(1,0,1,320,560,'COMM / IFF',[K_(.25,.3,'COMM 1 VOLUME',['1','2','3','4','5'],'cv1',3,{r:.011,l:'COMM 1'}),K_(.72,.3,'COMM 2 VOLUME',['1','2','3','4','5'],'cv2',3,{r:.011,l:'COMM 2'}),K_(.25,.75,'IFF MASTER · OFF / STBY / LOW / NORM / EMER',['OFF','STBY','LOW','NORM','EMER'],'iff',3,{r:.011,l:'IFF'}),T_(.72,.75,'IFF MODE 4',['OFF','ON'],'iff4',1,{l:'MODE 4'})]);
  panel(1,0,1,580,780,'INTERIOR LIGHTS',[K_(.2,.4,'INSTRUMENT LIGHTS',['OFF','DIM','MED','BRT'],'ilt',2,{r:.011,l:'INST'}),K_(.5,.4,'CONSOLE LIGHTS',['OFF','DIM','MED','BRT'],'clt',2,{r:.011,l:'CONSOLE'}),K_(.8,.4,'FLOOD LIGHTS',['OFF','DIM','MED','BRT'],'flt',0,{r:.011,l:'FLOOD'}),T_(.5,.85,'LIGHTS TEST',['OFF','TEST'],'ltest',0,{l:'TEST',s:v=>{ST.ltest=v;if(v)lampTest=now()+2.5;}})]);
  panel(1,0,1,800,1000,'ECS · CANOPY',[K_(.25,.4,'CABIN TEMPERATURE',['COLD','MED','HOT'],'ctemp',1,{r:.011,l:'TEMP'}),T_(.6,.4,'WINDSHIELD DEFOG',['OFF','ON'],'defog',0,{l:'DEFOG'}),T_(.45,.8,'CANOPY LOCKING LEVER · LOCKED / UNLOCKED',['UNLOCKED','LOCKED'],'canopy',1,{l:'CANOPY'})]);

  // control stick (Harrier grip)
  const stkG=new THREE.Group(),thrG=new THREE.Group();g.add(stkG);g.add(thrG);thrG.visible=false;
  box(stkG,.026,.34,.026,LM(0x1a1a1a,30),0,.17,0);box(stkG,.042,.12,.048,LM(0x2a2a2a,20),0,.39,-.004,-.25);box(stkG,.014,.016,.014,LM(0x777777,30),0,.455,.004);box(stkG,.012,.022,.012,LM(0xb02020,30),-.018,.43,0);box(stkG,.006,.03,.022,LM(0x888888,30),0,.37,-.03);
  let t=0;
  return{stkG,thrG,ctls,upd:(P)=>{if(!P)return;if(!cautions(P).length)mcAck=false;if(!WARNL.some(w=>{try{return w[1](P);}catch(e){return false;}}))mwAck=false;for(const l of lamps)l(P);const tn=now();if(tn-t<.025)return;t=tn;
        {const e=EDP(P);let h=0;try{h=q(P.pos.y-groundAt(P.pos.x,P.pos.z),.66);}catch(er){}let b=0;try{b=q(brgField(P),2)+q(distField(P),4);}catch(er){}
     FKA=[q(P.bank,229),q(P.pitch,229),q(P.hdg,2),q(P.cas,1),q(P.mach,100),q(P.alpha,229),q(P.pos.y,.66),q(P.vel?P.vel.y:0,.1),q(P.nz,20),q(P.maxNz,5),q(P.beta,115),h,b,P.gearPos>.5?1:0,STV];FK=FKA.join();
     SK=[q(P.n,50),q(P.thr,50),q(P.totalFuel,.2),q(P.gearPos,20),q(P.flapPos!=null?P.flapPos:P.flapCmd,20),q(P.sb,20),Math.floor(now()),lampTest>now()?1:0,STV,q(e.noz,2),q(e.jpt,.1),q(e.water,1),q(e.rpm,1),q(e.duct,1),(P.fire||0)>0?1:0,q(P._trimP,20),q(P.ctl?P.ctl.r:0,20),cautions(P).join('.'),P.onGnd?1:0,q(P.hdg,1),q(Math.hypot(P.vel.x,P.vel.z),1)].join();}
    for(let i=0;i<upd.length;i++){try{upd[i](P);}catch(er){}}
    P._trimP=(P._trimP||0)*.97+(P.ctl?P.ctl.p:0)*.03;}};}

PIT[ID].custom=build;
console.info('[av8pit] AV-8B Harrier II cockpit and HUD active');
})();
