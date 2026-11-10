/* =====================================================================================================================
   v260 - A-4E Skyhawk cockpit, 1:1 after NAVAIR 01-40AVC-1 (NATOPS A-4E/F/G) figure FO-1 "A-4E Cockpit - Typical Left,
   Instrument, and Right Panels" (changed 1 March 1970), keyed items 1-61 / 17A / 16A / 49A.
   * Instrument panel (items 18-45): every instrument and light at its position traced from the figure (board px ~0.74 mm):
     accelerometer 18, AJB-3A all-attitude indicator 19, radar scope 20, LABS timer 21, 8-day clock 22, OIL LOW light 23,
     pressure ratio 24, oil quantity 25, tachometer 26, exhaust temperature 27, fuel flow 28, fuel quantity 29, radar altimeter 30,
     dead reckoning indicator 31, radar low-limit light 32, standby attitude 33, SIDS CONT/NORM 34, armament panel 35 with cabin
     pressure altitude, misc switches 36, AWRS panel 37, liquid oxygen 38, BDHI 39, vertical speed 40, altimeter 41, angle of
     attack 42, ladder caution lights 43, airspeed / Mach 44, gunsight panel 45, LANDING and TAKEOFF check lists, MAN FLT / CONT,
     EMER / BOMB release tabs, IN RANGE / SET RANGE / DIVE lights.
   * Scales follow the text: airspeed 80-650 kt with Mach disc 0.5-2.9, VSI 100 ft steps to 1000 then 500 ft to 6000, altimeter
     100 ft marks / 1000 ft per turn / 28.10-31.00 in. Hg window, radar altimeter 0-5000 ft with OFF flag, AOA 0-30 units with the
     optimum index at 3 o'clock (17.5) and stall index (27).
   * Left console (items 1-17A): wheels and flaps panel, LABS control, throttle panel with friction, engine control panel (wing
     fuel dump, start, fuel control, emergency transfer), radar control, AFCS, GCBS / TACAN beacon, oxygen and anti-G, anti-exposure
     suit, flap handle, spoiler arm, JATO, APC, canopy handle, manual fuel shutoff, smoke abatement, emergency speedbrake.
   * Right console (items 46-61): trim position indicators, doppler computer / NAV panel, UHF, TACAN, SIF, IFF, compass control,
     interior lights, misc switches, AFCS test, exterior lights, air conditioning, rain removal, fuel transfer bypass, spare lamps.
   Needs game.js, cwpit.js, cw-systems.js, startup.js.
   ===================================================================================================================== */
(function(){
'use strict';
const PIT=window.CW_PIT;if(!PIT||!PIT['A-4E']){console.warn('[a4pit] cwpit missing');return;}
const ID='A-4E',K=.00066,OX=640,OY=400;
const PL=()=>typeof player!=='undefined'?player:null;
const bx=x=>(x-OX)*K,by=y=>(OY-y)*K;
const now=()=>performance.now()/1000;
let STV=0,FK='',SK='',FKA=[];
const ST=new Proxy({},{set(t,k,v){t[k]=v;STV++;return true;}});
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
// FO-1 instrument panel positions [key, x, y, half-size of case, face] (figure pixels, 200 dpi crop, y down)
const INST=[
 ['masi',240,415,92,F.masi],['alt',242,600,90,F.alt],['aoa',125,770,68,F.aoa],['vvi',278,775,62,F.vvi],
 ['acc',447,255,68,F.acc],['clk',960,245,55,F.clk],
 ['pr',1020,385,62,F.pr],['oilq',1115,385,34,F.oilq],['rpm',1030,505,64,F.rpm],['egt',1150,495,62,F.egt],['ff',1055,625,66,F.ff],['fq',1190,610,66,F.fq],
 ['ralt',950,745,92,F.ralt],['dri',1160,755,86,F.dri],['lox',650,692,50,F.lox],['cab',745,1020,56,F.cab]];
const SQ=[['adi',480,487,135,F.adi],['bdhi',412,755,92,F.bdhi],['sby',790,705,66,F.sby],['labs',832,235,74,F.labs]];
// lamps [key,x,y,w,h,legend,colour,lit(P)]
const LAMPS=[
 ['oil',1040,278,40,36,'OIL\nLOW','#fb3',P=>running(P)&&rpm(P)<45],
 ['fb',100,543,84,24,'FUEL BOOST','#fb3',P=>!sv('boost',1)||fuelLb(P)<500],
 ['ch',100,568,84,24,'CONTROL HYD','#fb3',P=>!running(P)||rpm(P)<40],
 ['uh',100,593,84,24,'UTILITY HYD','#fb3',P=>!running(P)||rpm(P)<40],
 ['ft',100,618,84,24,'FUEL TRANS','#fb3',P=>fuelLb(P)<900&&running(P)],
 ['sb',100,643,84,24,'SPD BRK OPEN','#fb3',P=>(P.sb||0)>.05],
 ['sp',100,668,84,24,'SPOILER EXT','#fb3',P=>false],
 ['ir',552,652,76,22,'IN RANGE','#eee',P=>false],['sr',552,677,76,22,'SET RANGE','#eee',P=>false],['dv',552,702,76,22,'DIVE','#eee',P=>(P.pitch||0)*R2D<-5&&game.arm],
 ['rl',1055,830,34,28,'','#f42',P=>powered(P)&&(P.pos.y-groundAt(P.pos.x,P.pos.z))*3.2808<sv('lowAlt',500)&&!P.onGnd]];
function cautions(P){const L=[];if(!running(P))L.push('ENG');if(fuelLb(P)<500)L.push('FUEL LOW');if(running(P)&&rpm(P)<45)L.push('OIL');if(!(P.eng&&!P.eng.done?P.eng.gen:running(P)))L.push('GEN');if(!running(P)||rpm(P)<40)L.push('HYD');if((P.sb||0)>.05&&gearDn())L.push('SPD BRK');if(P.hook)L.push('HOOK');return L;}
function brgField(P){try{return(Math.atan2(AF.x-P.pos.x,-(AF.z-P.pos.z))*R2D+360)%360;}catch(e){return 0;}}
function distField(P){try{return Math.hypot(AF.x-P.pos.x,AF.z-P.pos.z)/1852;}catch(e){return 999;}}

/* ---------------- build ---------------- */
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
  // ---- outline traced from FO-1: sloped glareshield shoulders, centre well for the radar scope, armament panel and pedestal ----
  const OUT=[[20,915],[20,640],[75,470],[190,330],[335,165],[545,165],[550,275],[750,275],[760,170],[960,170],[1030,215],[1095,290],[1175,420],[1255,540],[1275,915],[920,915],[920,1090],[800,1100],[800,1205],[490,1205],[490,1100],[385,1090],[385,915]];
  const sh=new THREE.Shape();OUT.forEach(([x,y],i)=>i?sh.lineTo(bx(x),by(y)):sh.moveTo(bx(x),by(y)));
  const X0=0,Y0=150,W0=1300,H0=1070,bg=document.createElement('canvas');bg.width=1560;bg.height=1284;const SX=bg.width/W0,SY=bg.height/H0,fx=x=>(x-X0)*SX,fy=y=>(y-Y0)*SY;
  {const c=bg.getContext('2d');c.fillStyle='#26292a';c.fillRect(0,0,bg.width,bg.height);
    const lab=(s,x,y,sz=11,al='center',col='#e9e9e2')=>{c.font=`bold ${sz*SX}px Arial`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;s.split('\n').forEach((l,i,a)=>c.fillText(l,fx(x),fy(y)+(i-(a.length-1)/2)*(sz+2)*SY));};
    const box2=(x0,y0,x1,y1,col='#141516')=>{c.fillStyle=col;c.fillRect(fx(x0),fy(y0),(x1-x0)*SX,(y1-y0)*SY);};
    // radar scope well, ADI well, LABS timer well
    box2(632,315,955,640,'#0c0d0e');box2(345,350,615,625,'#0c0d0e');
    // 45 gunsight panel
    lab('BRT',282,205,9);lab('OFF',350,205,9);lab('OFF',282,312,9);lab('BRT',350,312,9);lab('GUN SIGHT',318,305,10);
    lab('STBY\nGYRO\nERECT',578,282,8);
    // LANDING (check list) and TAKEOFF plates
    box2(48,832,190,905,'#17191a');lab('LANDING',120,845,10);lab('HARNESS\nARMAMENT\nWHEELS\nHOOK\nFLAPS',118,878,7);
    box2(1100,840,1255,918,'#17191a');lab('TAKEOFF',1180,852,11);lab('TRIM\nHARNESS\nCANOPY\nFLAPS\nSPEED BRAKE\nARMAMENT',1180,885,7);
    // EMER / BOMB release tabs, MAN FLT / CONT
    box2(185,845,255,872,'#3a3a2a');lab('EMER',220,858,10);box2(295,845,365,872,'#3a3a2a');lab('BOMB',330,858,10);
    box2(925,845,985,868,'#1a1c1d');lab('MAN. FLT',955,857,8);box2(1030,845,1090,868,'#1a1c1d');lab('CONT',1060,857,8);
    // 36 misc switches panel
    box2(510,725,860,865,'#17191a');lab('TEST',546,738,8);lab('BDHI\nNAV CMPT',548,790,7);lab('TACAN',590,822,7);lab('NAV  PAC',560,852,7);lab('WALLEYE  CLEAR\nREG',640,772,6);lab('SHRIKE  1  2',680,805,6);lab('VOL',607,830,7);lab('PROFILE',735,805,7);lab('PLAN',735,852,7);lab('LONG',783,805,7);lab('SHORT',783,852,7);lab('FUEL',835,805,7);lab('EXT',835,852,7);
    // 35 armament panel
    box2(385,865,915,1095,'#17191a');lab('EMER\nSELECT',440,880,10);lab('ALL',445,905,7);lab('CTR',410,935,7);lab('WING',445,968,7);lab('GUNS',510,880,10);lab('READY',505,902,7);lab('SAFE',505,968,7);lab('ARM',570,880,10);lab('NOSE\n& TAIL',595,900,7);lab('OFF',545,925,7);lab('TAIL',570,965,7);
    for(let i=0;i<5;i++)lab(String(i+1),622+i*58,885,8);lab('READY',740,905,7);lab('SALVO',740,962,7);lab('OFF',880,925,7);
    lab('SPRAY\nTANK',508,992,7);lab('LABS',618,990,7);lab('GM UNARM',500,1030,7);lab('BOMBS\n& GM\nARM',628,1020,7);lab('ROCKETS',515,1052,7);lab('OFF',583,1068,7);lab('ON',655,1040,7);lab('OFF',655,1085,7);lab('MASTER',626,1090,9);
    // 37 AWRS pedestal
    box2(490,1100,800,1205,'#17191a');lab('SPECIAL',520,1112,6);lab('DROP INTERVAL',635,1112,6);lab('MULT',695,1135,6);lab('STEP    RIPPLE',745,1112,6);lab('MODE SEL',745,1190,7);lab('OFF',512,1190,6);
    lab('INTERVAL',632,1188,6);
    // 43 caution lamps are 3-D lamps; 2-D screws
    c.fillStyle='rgba(255,255,255,.22)';for(const [x,y] of[[135,880],[1100,880],[390,1090],[915,1090],[560,170],[750,170],[335,185],[1030,230]]){c.beginPath();c.arc(fx(x),fy(y),5,0,7);c.fill();}}
  const bgT=new THREE.CanvasTexture(bg);bgT.anisotropy=8;ctx.o.tex.push(bgT);
  const geo=new THREE.ShapeGeometry(sh);{const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i)/K+OX,y=OY-p.getY(i)/K;uv.setXY(i,(x-X0)/W0,1-(y-Y0)/H0);}uv.needsUpdate=true;}
  const faceM=new THREE.MeshBasicMaterial({map:bgT,toneMapped:false});ctx.o.faces.push(faceM);const bm=new THREE.Mesh(geo,faceM);bm.userData.cwFx=1;board.add(bm);
  {const eg=new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false});const e=new THREE.Mesh(eg,pm);e.position.z=-.031;e.userData.cwFx=1;board.add(e);}
  // radar scope (20): square bezel, round CRT showing the radar picture
  box(board,320*K,320*K,.03,dk,bx(793),by(478),.012);
  {const scC=typeof phScopeC!=='undefined'?phScopeC:null;if(scC){const m=new THREE.MeshBasicMaterial({map:liveTex(ctx.kind,scC),toneMapped:false});ctx.o.faces.push(m);const sc=new THREE.Mesh(new THREE.CircleGeometry(124*K,48),m);sc.position.set(bx(793),by(478),.0285);sc.userData.screen='phscope';board.add(sc);}}
  try{if(window.WPNSCOPE&&WPNSCOPE.can(ID))WPNSCOPE.mount(board,{cx:bx(793),cy:by(478),R:124*K,px:bx(793+150),py:by(478+135),z:.012});}catch(e){console.warn('[a4pit] scope switch',e);}
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
  // glareshield: angle-of-attack indexer (left of the gunsight, chevron / doughnut / inverted chevron), FIRE and WHEELS lights
  {const cv=document.createElement('canvas');cv.width=96;cv.height=192;const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);
    const ix=new THREE.Mesh(new THREE.PlaneGeometry(.026,.052),m);ix.position.set(-.105,-.205,-.7);ix.rotation.x=-.5;ix.userData.cwFx=1;g.add(ix);box(g,.032,.058,.012,blk,-.105,-.205,-.703,-.5);let last='';
    upd.push(P=>{const u=clamp((P.alpha||0)*R2D*1.12+3,0,33),tst=lampTest>now(),k=(tst?'T':'')+(powered(P)?[u<16.5,u>15.5&&u<18.5||u>=16.5&&u<=18.5,u>18.5].map(x=>x?1:0).join(''):'x');if(k===last)return;last=k;
      c.fillStyle='#120a0a';c.fillRect(0,0,96,192);const on=powered(P)||tst,v=tst||on&&u<16.5,o=tst||on&&u>15.5&&u<19.5,l=tst||on&&u>18.5;
      c.lineWidth=12;c.strokeStyle=v?'#3f3':'#142014';c.beginPath();c.moveTo(20,50);c.lineTo(48,20);c.lineTo(76,50);c.stroke();
      c.fillStyle=o?'#fb2':'#2a2410';c.beginPath();c.arc(48,96,20,0,7);c.fill();c.fillStyle='#120a0a';c.beginPath();c.arc(48,96,8,0,7);c.fill();
      c.strokeStyle=l?'#f33':'#241010';c.beginPath();c.moveTo(20,142);c.lineTo(48,172);c.lineTo(76,142);c.stroke();t.needsUpdate=true;});}
  lampAt(g,.14,-.19,-.7,.03,.016,'FIRE','#f42',P=>(P.fire||0)>0||fireTest>now(),30,16).rotation.x=-.5;
  lampAt(g,.19,-.19,-.7,.03,.016,'WHEELS','#f42',P=>!gearDn()&&(P.pos.y-groundAt(P.pos.x,P.pos.z))*3.2808<600&&!P.onGnd||lampTest>now(),30,16).rotation.x=-.5;

  /* ---------- clickable controls: instrument panel ---------- */
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
  // 45 gunsight panel, 18 / 44 / 41 set knobs, standby gyro erect
  knob(board,bx(318),by(262),.03,26*K,'GUN SIGHT BRIGHTNESS (45)',['OFF','1','2','3','BRT'],'gsb',()=>sv('gsb',3),undefined,{col:0x161718});
  button(board,bx(578),by(305),.03,13*K,'STANDBY GYRO ERECT (33)',0x333333,()=>{ST.erect=now();try{radio('STANDBY ATTITUDE · FAST ERECT');}catch(e){}});
  button(board,bx(385),by(300),.03,9*K,'ACCELEROMETER · PUSH TO SET (18)',0x333333,()=>{const P=PL();if(P){P.maxNz=1;P._minNz=1;}});
  knob(board,bx(170),by(490),.03,10*K,'MACH / AIRSPEED INDEX SET (44)',['80','100','120','145'],'mset',undefined,undefined,{col:0xd0d0c8});
  knob(board,bx(160),by(692),.03,12*K,'ALTIMETER BARO SET (41)',['28.10','29.00','29.92','30.50','31.00'],'baroK',()=>sv('baroK',2),v=>{ST.baroK=v;ST.baro=[28.10,29.00,29.92,30.50,31.00][v];});
  // 30 radar altimeter control knob (power / low-limit index / push to test)
  knob(board,bx(880),by(800),.03,12*K,'RADAR ALTIMETER · OFF / LOW LIMIT SET / PUSH TO TEST (30)',['OFF','100','200','300','500','1000'],'raltk',()=>sv('raltk',4),v=>{ST.raltk=v;ST.ralt=v?1:0;ST.lowAlt=[0,100,200,300,500,1000][v];},{col:0xd0d0c8});
  // 29 fuel quantity test, 32 radar altimeter low limit light (press to test)
  button(board,bx(1130),by(675),.03,10*K,'FUEL QUANTITY TEST (29)',0x555555,()=>{qtyTest=now()+3;});
  button(board,bx(1055),by(830),.03,14*K,'RADAR LOW-LIMIT LIGHT · PRESS TO TEST (32)',0x442222,()=>{lampTest=now()+2;});
  // 21 LABS timer set
  knob(board,bx(790),by(300),.03,8*K,'LABS TIMER SET (21)',['1','2','3','4','5','6','7','8','9','10'],'labsK',()=>sv('labsT',1)-1,v=>{ST.labsT=v+1;});
  // 34 SIDS CONT-NORM mode, 36 misc switches
  toggle(board,bx(850),by(770),BZ,'SIDS CONT-NORM MODE SWITCH (34)',['NORM','CONT'],()=>sv('sids',0),v=>{ST.sids=v;});
  button(board,bx(546),by(752),BZ,12*K,'INDICATOR TEST (36)',0x777777,()=>{lampTest=now()+3;});
  toggle(board,bx(540),by(815),BZ,'BDHI NAV CMPT / TACAN / NAV PAC (36)',['NAV CMPT','TACAN','NAV PAC'],()=>sv('bdhiS',1),v=>{ST.bdhiS=v;});
  knob(board,bx(607),by(840),BZ,12*K,'VOLUME (36)',['1','2','3','4','5'],'vol36',()=>sv('vol36',3));
  knob(board,bx(640),by(800),BZ,13*K,'WEAPON VIDEO SELECT (36)',['WALLEYE','CLEAR','REG','SHRIKE 1','SHRIKE 2'],'wvid',()=>sv('wvid',1));
  toggle(board,bx(735),by(830),BZ,'PROFILE / PLAN (36)',['PROFILE','PLAN'],()=>sv('prof',0),v=>{ST.prof=v;});
  toggle(board,bx(783),by(830),BZ,'LONG / SHORT (36)',['LONG','SHORT'],()=>sv('lsr',0),v=>{ST.lsr=v;});
  hdl(board,bx(835),by(830),.02,36*K,36*K,'FUEL EXT (36) · external tank fuel',()=>sv('fext',1)?'ON':'OFF',()=>{ST.fext=sv('fext',1)?0:1;});
  // 35 armament panel
  toggle(board,bx(440),by(930),BZ,'EMER SELECT · ALL / CTR / WING (35)',['CTR','ALL','WING'],()=>sv('emsel',1),v=>{ST.emsel=v;});
  toggle(board,bx(510),by(935),BZ,'GUNS · READY / SAFE (35)',['SAFE','READY'],()=>sv('gunR',1),v=>{ST.gunR=v;});
  toggle(board,bx(570),by(935),BZ,'ARM · NOSE & TAIL / OFF / TAIL (35)',['OFF','NOSE & TAIL','TAIL'],()=>sv('fuze',1),v=>{ST.fuze=v;});
  for(let i=0;i<5;i++)toggle(board,bx(622+i*58),by(935),BZ,'STATION '+(i+1)+' · OFF / READY / SALVO (35)',['OFF','READY','SALVO'],()=>sv('sta'+i,i===2?1:0),v=>{ST['sta'+i]=v;try{if(v){const ld=(PL()||{}).load||{};}}catch(e){}});
  knob(board,bx(565),by(1025),BZ,42*K,'ARMAMENT FUNCTION SELECTOR (35)',['OFF','ROCKETS','GM UNARM','SPRAY TANK','LABS','BOMBS & GM ARM'],'afn',()=>sv('afn',5),v=>{ST.afn=v;try{if(v===1||v===5||v===4){const ag=agTypes(PL());if(ag.length)game.wsel=ag[0];}}catch(e){}},{col:0x15161a});
  toggle(board,bx(655),by(1055),BZ,'MASTER ARM · ON / OFF (35)',['OFF','ON'],()=>game.armPos===0?1:0,v=>setArm(v?0:1),{col:0xd8b820});
  hdl(board,bx(610),by(1085),.02,44*K,36*K,'MASTER ARM LIGHT (35)',()=>game.armPos===0?'ARMED':'SAFE',()=>{});
  // 37 AWRS panel
  knob(board,bx(540),by(1160),BZ,18*K,'AWRS SPECIAL WEAPONS / OFF (37)',['OFF','SAFE','ARM'],'awsw');
  knob(board,bx(632),by(1158),BZ,18*K,'AWRS DROP INTERVAL (37)',['110','120','130','140','150','160','170','180','190','200'],'ivl',()=>sv('ivl',3));
  knob(board,bx(745),by(1160),BZ,18*K,'AWRS MODE SEL · SINGLE / STEP / RIPPLE (37)',['SINGLE','STEP','RIPPLE'],'amode',()=>sv('amode',0));
  knob(board,bx(700),by(1160),BZ,8*K,'AWRS MULT (37)',['1','2','3','4','6','8'],'mult');
  // gear handle (left of the panel) and arresting hook handle (right), EMER / BOMB release tabs
  {const gh=new THREE.Group();gh.position.set(bx(160),by(865),.03);board.add(gh);box(gh,.008,.008,.04,met,0,0,.02);const wh=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.01,16),LM(0xe8e8e8,40));wh.rotation.x=Math.PI/2;wh.position.set(0,0,.042);gh.add(wh);
    const lt=new THREE.Mesh(new THREE.SphereGeometry(.005,8,6),new THREE.MeshBasicMaterial({color:0x330a08}));lt.position.set(0,0,.05);gh.add(lt);const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.06),hit);hb.position.z=.03;hb.userData.cwFx=1;gh.add(hb);
    reg(gh,hb,'LANDING GEAR CONTROL HANDLE (12)',()=>gearDn()?'DOWN':'UP',()=>{try{uiKey('Digit7');}catch(e){}});upd.push(P=>{gh.position.z=.03+(gearDn()?0:.012);const tr=P.gearPos!=null&&P.gearPos>.05&&P.gearPos<.95;lt.material.color.set(tr||lampTest>now()?0xff3020:0x330a08);});}
  {const hk=new THREE.Group();hk.position.set(bx(1130),by(865),.03);board.add(hk);const kb=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.012,16),LM(0xd8b820,40));kb.rotation.x=Math.PI/2;kb.position.z=.03;hk.add(kb);box(hk,.006,.006,.03,met,0,0,.014);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.045,.045,.05),hit);hb.position.z=.025;hb.userData.cwFx=1;hk.add(hb);reg(hk,hb,'ARRESTING HOOK HANDLE (30)',()=>{const P=PL();return P&&P.hook?'DOWN':'UP';},()=>{const P=PL();if(P){P.hook=!P.hook;try{flash('HOOK '+(P.hook?'DOWN':'UP'),900);}catch(e){}}});upd.push(P=>{hk.position.z=.03+(P.hook?.014:0);});}
  hdl(board,bx(220),by(858),.02,70*K,28*K,'EMERGENCY STORES RELEASE (EMER)',()=>'PUSH',()=>{try{radio('EMERGENCY RELEASE · JETTISON');if(typeof jettison==='function')jettison();}catch(e){}});
  hdl(board,bx(330),by(858),.02,70*K,28*K,'BOMB RELEASE (BOMB)',()=>'PUSH',()=>{try{radio('BOMB RELEASE');}catch(e){}});
  hdl(board,bx(100),by(594),.02,90*K,150*K,'CAUTION PANEL (43)',()=>cautions(PL()).join(' · ')||'—',()=>{});

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
  const zL=y=>CZ0+(y-60)/(1540-60)*(CZ1-CZ0),zR=y=>CZ0+(y-90)/(1480-90)*(CZ1-CZ0);
  const T_=(u,v,n,p,k,d=0,x={})=>Object.assign({t:'t',u,v,n,p,k,d},x),K_=(u,v,n,p,k,d=0,x={})=>Object.assign({t:'k',u,v,n,p,k,d},x),B_=(u,v,n,act,x={})=>Object.assign({t:'b',u,v,n,act},x);
  function panel(side,u0,u1,y0,y1,title,items,draw){const zf=side<0?zL:zR,p=side<0?cpanel(-1,u0,u1,zf(y0),zf(y1),title,draw):cpanel(1,1-u1,1-u0,zf(y0),zf(y1),title,draw);
    for(const it of items||[]){const get=it.g||(()=>sv(it.k,it.d)),set=it.s||(x=>{ST[it.k]=x;});
      if(it.t==='t')tg(p,it.u,it.v,it.n,it.p,get,set,it.o||{});else if(it.t==='k')kn(p,it.u,it.v,it.r||.009,it.n,it.p,it.k,get,set,it.o||{});
      else{const[x,y,z]=p.at(it.u,it.v,.006);button(g,x,y,z,it.r||.006,it.n,it.col||0x2a2a2a,it.act||(()=>{}));}
      const lb=it.l!=null?it.l:it.n.replace(/\s*\(.*$/,'').replace(/ · .*/,'');if(lb){const ws=lb.split(' '),ln=[''];for(const w of ws){if((ln[ln.length-1]+' '+w).trim().length>10&&ln[ln.length-1])ln.push(w);else ln[ln.length-1]=(ln[ln.length-1]+' '+w).trim();}p.lab(ln.join('\n'),it.u,Math.min(.9,it.v+(it.ly!=null?it.ly:.24)),7);}}
    return p;}
  const on1=k=>()=>sv(k,1);
  // bodies, sills, tub
  box(g,.18,.34,.22,dk,0,-1.0,-.68);
  [-1,1].forEach(sd=>{box(g,.22,.1,.98,LM(0x2a2d30,8),sd*.43,CY-.052,-.15);box(g,.05,.1,1.3,LM(0x25282a,8),sd*.555,-.55,-.2);});
  {const sk=LM(0x1c1f21,6);box(g,1.14,.02,1.5,sk,0,-1.23,-.1);[-1,1].forEach(sd=>box(g,.03,.66,1.3,sk,sd*.565,-.93,-.2));box(g,1.1,.5,.03,sk,0,-1.0,-.86);box(g,.9,.42,.02,sk,0,-.52,-.83);}

  // ======== LEFT CONSOLE (FO-1 items 1-17A) — u 0 = outboard, top of the figure = forward ========
  // 1 · WHEELS and FLAPS panel: LH / NOSE / RH wheel indicators and the flap position indicator
  {const p=panel(-1,.3,1,60,190,'WHEELS · FLAPS',[],(c,w,h)=>{c.font='bold 11px Arial';c.fillStyle='#e8e8e0';c.textAlign='center';[['LH',.2],['NOSE',.42],['RH',.64],['FLAPS',.88]].forEach(([s,u])=>c.fillText(s,u*w,h*.88));});
    [.2,.42,.64].forEach((u,i)=>{const[x,y,z]=p.at(u,.5,.004);const cv=document.createElement('canvas');cv.width=cv.height=96;const c2=cv.getContext('2d'),t2=new THREE.CanvasTexture(cv);ctx.o.tex.push(t2);const m2=new THREE.MeshBasicMaterial({map:t2,toneMapped:false});ctx.o.faces.push(m2);
      const fm=new THREE.Mesh(new THREE.CircleGeometry(.014,20),m2);fm.rotation.x=-Math.PI/2;fm.position.set(x,y+.001,z);g.add(fm);const gt2=gate('w'+i);upd.push(P=>{if(!gt2())return;F.small('gear')(c2,P);t2.needsUpdate=true;});});
    {const[x,y,z]=p.at(.88,.5,.004);const cv=document.createElement('canvas');cv.width=cv.height=96;const c2=cv.getContext('2d'),t2=new THREE.CanvasTexture(cv);ctx.o.tex.push(t2);const m2=new THREE.MeshBasicMaterial({map:t2,toneMapped:false});ctx.o.faces.push(m2);
      const fm=new THREE.Mesh(new THREE.CircleGeometry(.014,20),m2);fm.rotation.x=-Math.PI/2;fm.position.set(x,y+.001,z);g.add(fm);const gt2=gate('wf');upd.push(P=>{if(!gt2())return;F.small('flap')(c2,P);t2.needsUpdate=true;});}}
  panel(-1,.3,1,190,280,'',[]);                                             // 2 · blank panel
  // 3 · LABS control panel
  panel(-1,.3,1,280,350,'LABS',[T_(.25,.45,'LABS TIMER NORMAL (3)',['NORMAL','TIMED'],'labsN'),T_(.7,.45,'LABS · LOFT / INST O/S (3)',['LOFT','INST O/S'],'labsM'),K_(.5,.5,'LABS TIMER KNOB (3)',['1','2','3','4','5'],'labsKn',0,{r:.008})]);
  // 17A · APC panel (approach power compensator) · 17 · JATO
  panel(-1,.3,1,350,420,'APC',[T_(.2,.5,'APC ENGAGE / STBY / OFF (17A)',['OFF','STBY','ENGAGE'],'apc',0),K_(.6,.5,'APC HOT / STD / COLD (17A)',['COLD','STD','HOT'],'apcT',1,{r:.008})]);
  panel(-1,.3,.7,420,560,'JATO',[T_(.45,.38,'JATO ARM / OFF (17)',['OFF','ARM'],'jato',0),T_(.45,.74,'JATO JETTISON / SAFE (17)',['SAFE','JETTISON'],'jetS',0,{o:{guard:true,guardUp:()=>sv('jetS',0)}})]);
  // 16A spoiler ARM / OFF · 16 flap handle
  {const p=panel(-1,.3,.55,560,700,'FLAP',[T_(.5,.18,'SPOILER ARM / OFF (16A)',['OFF','ARM'],'spoil',0,{l:'SPOILER'})]);
    const[x,y,z]=p.at(.5,.62,.004);const fl=new THREE.Group();fl.position.set(x,y,z);g.add(fl);box(fl,.008,.04,.008,met,0,.02,0);box(fl,.03,.012,.014,LM(0xe8e8e0,30),0,.04,0);const hb=new THREE.Mesh(new THREE.BoxGeometry(.04,.06,.04),hit);hb.position.y=.03;hb.userData.cwFx=1;fl.add(hb);
    reg(fl,hb,'FLAP HANDLE (16)',()=>{const P=PL();return P&&(P.flapCmd||0)>.5?'DOWN':'UP';},()=>{try{flapKey();}catch(e){}});upd.push(P=>{fl.rotation.x=(P.flapCmd||0)>.5?.5:-.4;});}
  // 4 · THROTTLE panel: throttle, throttle friction / lock, ignition, nose trim
  {const thq=panel(-1,.55,1,420,720,'THROTTLE',[T_(.2,.2,'THROTTLE FRICTION AND LOCK (4)',['OFF','FRICTION','LOCK'],'thf',0,{l:'FRICTION'}),K_(.3,.82,'NOSE LEFT / RIGHT RUDDER TRIM (4)',['NOSE LEFT','NEUTRAL','NOSE RIGHT'],'rtrim',1,{r:.012,l:'RUDDER TRIM'}),T_(.78,.75,'IGN (4)',['OFF','IGN'],'ign',0)],(c,w,h)=>{c.fillStyle='#111';c.fillRect(w*.4,h*.1,w*.2,h*.6);c.font='bold 10px Arial';c.fillStyle='#ddd';c.textAlign='left';[['IDLE',.62],['MIL',.14]].forEach(([s,v])=>c.fillText(s,w*.62,h*v));});
    const tq=new THREE.Group();g.add(tq);const[x0,y0]=thq.at(.46,0);tq.position.set(x0,y0,zL(590));
    const arm=new THREE.Group();tq.add(arm);box(arm,.01,.11,.012,met,0,.055,0);const grip=new THREE.Group();grip.position.y=.11;arm.add(grip);
    box(grip,.034,.05,.065,LM(0x1c1c1c,25),-.006,0,0);box(grip,.012,.012,.012,LM(0xb02020,30),-.022,.018,-.014);box(grip,.01,.016,.01,LM(0x777777,30),-.024,-.008,.012);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.06,.07,.08),hit);hb.userData.cwFx=1;grip.add(hb);
    reg(grip,hb,'THROTTLE (4)',()=>{const P=PL();if(P&&P.eng&&!P.eng.done)return P.eng.e[0].fuel?'IDLE':'OFF';return Math.round((P?P.thr:0)*100)+'%';},()=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.thr();});
    upd.push(P=>{let a;if(P.eng&&!P.eng.done&&!P.eng.e[0].fuel)a=.5;else a=.32-(P.thr||0)*.8;arm.rotation.x=a;});
    const sbh=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,.02),hit);sbh.position.set(-.024,-.008,.012);sbh.userData.cwFx=1;grip.add(sbh);
    reg(grip,sbh,'SPEED BRAKE SWITCH (throttle grip)',()=>keys.has('KeyB')?'OUT':'IN',()=>{if(keys.has('KeyB'))keys.delete('KeyB');else keys.add('KeyB');});}
  // 5 · ENGINE control panel
  panel(-1,.3,1,720,820,'ENGINE',[T_(.15,.45,'WING FUEL DUMP (5)',['OFF','DUMP'],'dump',0,{o:{guard:true,guardUp:()=>sv('dump',0)}}),K_(.4,.5,'WING FUEL · PRESS / OFF / REFUEL / EMER TRANS (5)',['PRESS','OFF','REFUEL','EMER TRANS'],'wfp',0,{r:.009}),
    B_(.62,.5,'ENGINE START (5) · air turbine starter',()=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.src();},{r:.009,l:'START'}),
    T_(.85,.45,'FUEL CONT · PRIMARY / MANUAL (5)',['PRIMARY','MANUAL'],'fcont',0,{o:{guard:true,guardUp:()=>sv('fcont',0)}})]);
  // 6 · RADAR control panel (AN/APG-53A): power / mode, antenna tilt, angle-of-attack compensation
  {const RP=()=>({OFF:0,STBY:1,ON:2})[radar.power]??2;
   panel(-1,.3,1,820,905,'RADAR',[K_(.2,.5,'RADAR POWER · OFF / STBY / ON (6)',['OFF','STBY','ON'],'rpwr',2,{g:RP,s:v=>{radar.power=['OFF','STBY','ON'][v];if(v===2)radar.warm=Math.max(radar.warm||0,3);},r:.012,l:'MODE'}),
     K_(.5,.5,'ANT TILT (6)',['-10','-5','0','+5','+10'],'rtilt',2,{r:.011,l:'ANT TILT'}),T_(.8,.5,'ANGLE OF ATTACK COMP · SPCH ON / OFF (6)',['OFF','ON'],'aoac',1,{l:'AOA COMP'})]);}
  // 8 · AFCS panel
  panel(-1,.3,1,905,990,'AFCS',[T_(.2,.4,'AFCS STAB AUG (8)',['OFF','ENGAGE'],'sa',1),T_(.45,.4,'AFCS HDG SEL (8)',['OFF','ON'],'hsel',0),T_(.68,.4,'AFCS ALT (8)',['OFF','ON'],'alth',0),T_(.9,.4,'AFCS ENGAGE (8)',['OFF','ENGAGE'],'afe',1),
    T_(.2,.85,'AFCS STANDBY (8)',['OFF','STANDBY'],'afs',0,{o:{guard:true,guardUp:()=>sv('afs',0)}}),T_(.7,.85,'AILERON TRIM NORM / EMER (8)',['NORM','EMER'],'ailT',0)]);
  // 9 · GCBS / TACAN beacon / AFCS pitch
  panel(-1,.3,1,990,1080,'GCBS · BEACON',[T_(.12,.45,'GCBS ENGAGE / STANDBY (9)',['STANDBY','ENGAGE'],'gcbs',0),T_(.33,.45,'STEP TURN L / OFF / R (9)',['L','OFF','R'],'stt',1),T_(.55,.45,'BEACON OFF / ON (9)',['OFF','ON'],'bcn',0),K_(.8,.4,'CHAN · PULSE / DOUBLE / SINGLE (9)',['SINGLE','PULSE','DOUBLE'],'pls',0,{r:.01})]);
  // 10 · OXYGEN and ANTI-G
  panel(-1,.3,1,1080,1210,'OXYGEN · ANTI-G',[T_(.2,.45,'OXYGEN SUPPLY DRY / ON / OFF (10)',['OFF','ON'],'o2',1),K_(.5,.45,'OXYGEN DILUTER · NORMAL / 100% (10)',['NORMAL','100%'],'dil',0,{r:.012}),T_(.82,.45,'OXYGEN EMERGENCY (10)',['NORMAL','EMER'],'o2e',0)]);
  // 11 · anti-exposure suit control
  panel(-1,.3,1,1210,1540,'SUIT VENT',[T_(.3,.3,'EXPOSURE SUIT VENT (11)',['OFF','ON'],'esv',0),K_(.7,.3,'SUIT VENT FLOW (11)',['LOW','MED','HIGH'],'esvf',1,{r:.011})]);
  // wall: 15 smoke abatement, 14 manual fuel shutoff, 13 canopy control handle, 12 emergency speedbrake
  panel(-1,0,.3,590,680,'SMOKE',[T_(.5,.5,'SMOKE ABATEMENT (15)',['OFF','ON'],'smk',0)]);
  panel(-1,0,.3,680,800,'FUEL SHUTOFF',[T_(.5,.45,'MANUAL FUEL SHUTOFF CONTROL LEVER (14)',['NORMAL','SHUTOFF'],'mfs',0,{o:{guard:true,guardUp:()=>sv('mfs',0)}})]);
  panel(-1,0,.3,900,1040,'CANOPY',[T_(.5,.45,'CANOPY CONTROL HANDLE (13)',['CLOSE','OPEN'],'canopy',0,{l:'CANOPY'})]);
  panel(-1,0,.3,1240,1360,'EMER S/B',[B_(.5,.5,'EMERGENCY SPEEDBRAKE (12)',()=>{if(keys.has('KeyB'))keys.delete('KeyB');else keys.add('KeyB');},{r:.012,col:0xd8d8d0,l:'EMER SPEED BRAKE'})]);

  // ======== RIGHT CONSOLE (FO-1 items 46-61) — u 0 = inboard, top of the figure = forward ========
  // 46 · trim position indicators
  panel(1,0,.62,90,200,'TRIM POSITION',[],(c,w,h)=>{c.strokeStyle='#e8e8e0';c.lineWidth=2;[.3,.7].forEach(u=>{c.beginPath();c.arc(u*w,h*.55,h*.28,0,7);c.stroke();c.fillStyle='#e8e8e0';c.font='bold 8px Arial';c.textAlign='center';c.fillText('NOSE',u*w,h*.4);});});
  // 60 · NAV control panel (AN/ASN-19): variation / position / target / base counters, function knob
  panel(1,0,.62,200,390,'NAV',[K_(.2,.8,'NAV FUNCTION · OFF / TARGET / BASE / RESET (60)',['OFF','TARGET','BASE','RESET'],'nvf',0,{r:.012}),K_(.62,.82,'WIND / DEG SET (60)',['1','2','3','4','5'],'nvw',0,{r:.008}),K_(.85,.82,'KNOTS SET (60)',['1','2','3','4','5'],'nvk',0,{r:.008})],(c,w,h)=>{c.fillStyle='#000';c.fillRect(w*.1,h*.12,w*.4,h*.1);c.fillRect(w*.55,h*.12,w*.38,h*.1);c.fillRect(w*.55,h*.32,w*.38,h*.1);c.fillRect(w*.55,h*.5,w*.38,h*.1);c.fillStyle='#e8e8e0';c.font='bold 8px Arial';c.fillText('VARIATION',w*.3,h*.3);c.fillText('LATITUDE',w*.74,h*.3);c.fillText('LONGITUDE',w*.74,h*.48);c.fillText('POSITION',w*.74,h*.68);});
  // 59 · UHF (AN/ARC-51): channel, mode, volume, sensitivity
  panel(1,0,.62,390,540,'UHF',[K_(.32,.5,'UHF PRESET CHANNEL (59)',Array.from({length:20},(_,i)=>String(i+1)),'uhfCh',6,{g:()=>sv('uhfCh',7)-1,s:v=>{ST.uhfCh=v+1;},r:.018,l:'CHAN'}),K_(.75,.38,'UHF FUNCTION · OFF / T/R / T/R+G / ADF (59)',['OFF','T/R','T/R+G','ADF'],'ufn',1,{r:.009,l:'FUNCTION'}),K_(.75,.74,'UHF VOLUME (59)',['1','2','3','4','5'],'uvol',3,{r:.008,l:'VOL'})]);
  // 58 · TACAN
  panel(1,0,.62,540,630,'TACAN',[K_(.25,.5,'TACAN CHANNEL TENS (58)',Array.from({length:13},(_,i)=>String(i*10)),'tch10',3,{r:.012,l:'CHAN'}),K_(.55,.5,'TACAN CHANNEL UNITS (58)',['0','1','2','3','4','5','6','7','8','9'],'tch1',4,{r:.009,l:'UNITS'}),K_(.85,.5,'TACAN FUNCTION · OFF / REC / T/R / A/A (58)',['OFF','REC','T/R','A/A'],'tfn',2,{r:.009,l:'MODE'})]);
  // 57 · SIF
  panel(1,0,.62,630,740,'SIF',[K_(.3,.5,'SIF MODE 1 (57)',['0','1','2','3','4','5','6','7'],'sif1',2,{r:.013,l:'MODE 1'}),K_(.7,.5,'SIF MODE 3 (57)',['0','1','2','3','4','5','6','7'],'sif3',4,{r:.013,l:'MODE 3'})]);
  // 56 · IFF
  panel(1,0,.62,740,870,'IFF',[K_(.25,.5,'IFF MASTER · OFF / STBY / LOW / NORM / EMER (56)',['OFF','STBY','LOW','NORM','EMER'],'iff',3,{r:.012,l:'MASTER'}),T_(.55,.3,'IFF MODE 2 (56)',['OFF','ON'],'iff2',1,{l:'MODE 2'}),T_(.55,.72,'IFF MODE 3 (56)',['OFF','ON'],'iff3',1,{l:'MODE 3'}),T_(.85,.3,'IFF I/P · MIC (56)',['OUT','MIC','I/P'],'iffip',0,{l:'I/P'})]);
  // 55 · compass control
  panel(1,0,.62,870,915,'COMPASS',[K_(.3,.5,'COMPASS SET · PUSH TO TURN (55)',['1','2','3','4','5'],'cmpS',2,{r:.011,l:'SET'}),T_(.7,.5,'COMPASS SLAVED / FREE (55)',['FREE','SLAVED'],'cmpM',1)]);
  // 54 · interior lights
  panel(1,0,.62,915,995,'INTERIOR LIGHTS',[K_(.14,.5,'PRI INST LIGHTS (54)',['OFF','DIM','MED','BRT'],'ilt',2,{r:.011,l:'PRI INST'}),K_(.4,.5,'CONSOLES LIGHTS (54)',['OFF','DIM','MED','BRT'],'clt',2,{r:.011,l:'CONSOLES'}),K_(.64,.5,'FLOOD LIGHTS (54)',['OFF','DIM','BRT'],'fld',0,{r:.01,l:'FLOOD'}),K_(.88,.5,'SEC INST LIGHTS (54)',['OFF','DIM','BRT'],'sil',1,{r:.009,l:'SEC INST'})]);
  // 53 · miscellaneous switches
  panel(1,0,.62,995,1050,'MISC',[T_(.15,.5,'SEAT UP / DOWN (53)',['DOWN','UP'],'seat',1,{l:'SEAT'}),T_(.45,.5,'EMER GEN BYPASS · NORMAL (53)',['NORMAL','BYPASS'],'egb',0,{l:'EMER GEN BYPASS',o:{guard:true,guardUp:()=>sv('egb',0)}}),K_(.8,.5,'TACAN ANT · AUTO / FWD / AFT (53)',['AUTO','FWD','AFT'],'tant',0,{r:.009,l:'TACAN ANT'})]);
  // 52 · AFCS test switch panel
  panel(1,0,.62,1050,1110,'AFCS TEST',[B_(.2,.5,'AFCS TEST R (52)',()=>{lampTest=now()+2;},{l:'R'}),B_(.42,.5,'AFCS TEST Y (52)',()=>{lampTest=now()+2;},{l:'Y'}),B_(.64,.5,'AFCS TEST P (52)',()=>{lampTest=now()+2;},{l:'P'}),T_(.88,.5,'AFCS TEST SWITCH (52)',['OFF','TEST'],'afT',0,{l:'TEST'})]);
  // 51 · spare lamps container
  panel(1,0,.62,1110,1480,'SPARE LAMPS',[],(c,w,h)=>{c.fillStyle='#17191a';c.fillRect(w*.08,h*.12,w*.84,h*.5);c.fillStyle='#e8e8e0';c.font='bold 14px Arial';c.textAlign='center';c.fillText('SPARE LAMPS',w/2,h*.38);});
  // 47 · exterior lights
  panel(1,.62,1,180,540,'EXT LIGHTS',[T_(.5,.08,'PROBE LIGHT · OFF / BRT / DIM (47)',['OFF','DIM','BRT'],'prl',0,{l:'PROBE'}),T_(.5,.22,'TAXI LIGHT (47)',['OFF','ON'],'taxi',0,{l:'TAXI'}),T_(.5,.36,'ANTI-COLLISION (47)',['OFF','ON'],'acol',1,{l:'ANTI-COLL'}),T_(.5,.5,'FUS LIGHTS · BRT / OFF / DIM (47)',['OFF','DIM','BRT'],'fus',2,{l:'FUS'}),T_(.5,.64,'FLASH / STEADY (47)',['STEADY','FLASH'],'flsh',1,{l:'FLASH'}),T_(.5,.78,'WING LIGHTS (47)',['OFF','DIM','BRT'],'wng',2,{l:'WING'}),T_(.5,.92,'TAIL LIGHT (47)',['OFF','DIM','BRT'],'tll',2,{l:'TAIL',ly:-.06})]);
  // 48 · air conditioning
  panel(1,.62,1,540,890,'AIR COND',[T_(.5,.1,'CABIN PRESS · NORMAL / RAM (48)',['NORMAL','RAM'],'cprs',0,{l:'CABIN PRESS'}),K_(.5,.32,'WINDSHIELD DEFROST · DECREASE / HOLD / INCREASE (48)',['DECREASE','HOLD','INCREASE'],'wdf',1,{r:.01,l:'DEFROST'}),K_(.5,.6,'CABIN TEMP · MAN COLD / AUTO / MAN HOT (48)',['MAN COLD','AUTO','MAN HOT'],'ctemp',1,{r:.014,l:'CABIN TEMP'}),T_(.5,.88,'ANTI-ICING · ALL / OFF / PITOT (48)',['OFF','PITOT','ALL'],'aice',0,{l:'ANTI-ICING',ly:-.08})]);
  // 49 · rain removal, 49A fuel transfer bypass
  panel(1,.62,1,890,1020,'RAIN REMOVAL',[T_(.5,.5,'RAIN REMOVAL (49)',['OFF','ON'],'rain',0,{l:'RAIN'})]);
  panel(1,.62,1,1020,1100,'FUEL XFER BYPASS',[T_(.5,.5,'FUEL TRANSFER BYPASS (49A)',['NORMAL','BYPASS'],'fxb',0,{l:'BYPASS',o:{guard:true,guardUp:()=>sv('fxb',0)}})]);
  panel(1,.62,1,1100,1480,'',[]);

  // control stick (A-4 grip): borrowed stick motion is copied into stkG
  const stkG=new THREE.Group(),thrG=new THREE.Group();g.add(stkG);g.add(thrG);thrG.visible=false;
  box(stkG,.026,.34,.026,LM(0x1a1a1a,30),0,.17,0);box(stkG,.042,.12,.048,LM(0x2a2a2a,20),0,.39,-.004,-.25);box(stkG,.014,.016,.014,LM(0x777777,30),0,.455,.004);box(stkG,.012,.022,.012,LM(0xb02020,30),-.018,.43,0);box(stkG,.006,.03,.022,LM(0x888888,30),0,.37,-.03);
  let t=0;
  return{stkG,thrG,ctls,upd:(P)=>{if(!P)return;if(!cautions(P).length)mcAck=false;for(const l of lamps)l(P);const tn=now();if(tn-t<.066)return;t=tn;
        {const E=P.eng&&!P.eng.done?P.eng.e[0]:null;let h=0;try{h=q(P.pos.y-groundAt(P.pos.x,P.pos.z),.66);}catch(e){}let b=0;try{b=q(brgField(P),2)+q(distField(P),4);}catch(e){}
     FKA=[q(P.bank,229),q(P.pitch,229),q(P.hdg,2),q(P.cas,1),q(P.mach,100),q(P.alpha,229),q(P.pos.y,.66),q(P.vel?P.vel.y:0,.1),q(P.nz,20),q(P.maxNz,5),q(P.beta,115),h,b,P.gearPos>.5?1:0,STV];FK=FKA.join();
     SK=[q(P.n,50),q(P.thr,50),q(P.totalFuel,.2),q(P.gearPos,20),q(P.flapPos!=null?P.flapPos:P.flapCmd,20),q(P.sb,20),Math.floor(now()),lampTest>now()?1:0,STV,E?q(E.rpm,2)+'/'+q(E.egt,40)+(E.lit?1:0):'',(P.fire||0)>0?1:0,q(P._trimP,20),q(P.ctl?P.ctl.r:0,20),(typeof cautions==='function'?cautions(P).join('.'):''),P.hook?1:0,P.onGnd?1:0].join();}
    for(let i=0;i<upd.length;i++){try{upd[i](P);}catch(e){}}
    P._trimP=(P._trimP||0)*.97+(P.ctl?P.ctl.p:0)*.03;}};}

PIT[ID].custom=build;
console.info('[a4pit] A-4E NATOPS FO-1 cockpit active');
})();
