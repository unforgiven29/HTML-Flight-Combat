/* =====================================================================================================================
   v245 — Mirage 2000C cockpit, after the RAZBAM DCS M-2000C flight manual (chapter 1, "Instruments Panel Map", items 1-75)
   and the DCS Mirage 2000C guide (Chuck's guide).
   * Main panel: every numbered item of the map placed at the position traced from it (figure pixels, ~0.85 mm each):
     1 airspeed / Mach, 2 autopilot altitude selector, 3 vertical velocity, 4 autopilot push-lights, 5 FBW spin guard, 6 V/UHF + UHF
     frequency display, 7 master caution / warning lights, 8 AOA tape, 9 HUD pedestal, 10 G meter, 11 RWR (live), 12 afterburner light,
     13 engine start light, 14 engine RPM / temperature, 15 fuel flow, 16 bingo selector, 17 fire lights, 18 fuel control panel,
     19 HSI, 20 VTB radar screen (live), 26 PCA / PPA weapons panels, 27 standby attitude, 28 main attitude sphere, 29 altimeter,
     alarm light panel, 56 clock; pedestal: 21 IFF panel, 22 hydraulic selector, 23 cabin pressure, 24 hydraulic pressure.
   * Left sill panel 30-31, 51-55; left console 32-49; right sill panel 57-60; right console 62-75.
   * Functions: gear + emergency gear, master arm / PCA, radar operation (OFF / WARM UP / STBY / ON), range, PRF, scan, master caution,
     fire test, battery / generator / fuel master / start (cold start), throttle, drag chute, canopy, lights.
   Needs game.js, cwpit.js, cw-systems.js, startup.js.
   ===================================================================================================================== */
(function(){
'use strict';
const PIT=window.CW_PIT;const ID='Mirage 2000';if(!PIT||!PIT[ID]){console.warn('[m2kpit] cwpit missing');return;}
const K=.001,OX=840,OY=268;
const PL=()=>typeof player!=='undefined'?player:null;
const bx=x=>(x-OX)*K,by=y=>(OY-y)*K;
const now=()=>performance.now()/1000;
let STV=0,FK='',SK='';
const ST=new Proxy({},{set(t,k,v){t[k]=v;STV++;return true;}});
const sv=(k,d)=>ST[k]===undefined?d:ST[k];
let lampTest=0,fireTest=0,mcAck=false;
/* ---------------- engine / aircraft readouts (TF41-A-1, no afterburner) ---------------- */
const E0=P=>P.eng&&!P.eng.done?P.eng.e[0]:null;
const running=P=>{const e=E0(P);return e?e.lit:P.totalFuel>0&&!(P.dm&&P.dm.eng<=0);};
const rpm=P=>{const e=E0(P);return e?e.rpm:running(P)?58+42*clamp(P.n||0,0,1.02):0;};
const tot=P=>{const e=E0(P);return e?e.egt*700:running(P)?380+330*clamp(P.n||0,0,1):20;};
const powered=P=>window.START&&P.eng?START.powered(P):running(P);
const LB=2.2046;
const fuelLb=P=>(P.totalFuel||0)*LB;
const intLb=P=>Math.min(fuelLb(P),(P.ac.fuel||4200)*LB);
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

const F={
 // 11 · Mach-airspeed: 80-850 KIAS, Mach window
 masi:(c,P)=>{const v=P.cas||0,m=P.mach||0,a=v=>-160+Math.sqrt(lin(v,80,850))*320;c.strokeStyle=INK;
   for(const t of[80,100,120,140,160,180,200,250,300,350,400,450,500,550,600,650,700,750,800,850]){const q=(a(t)-90)*D2R,M=t%100===0||t===80||t===150;c.lineWidth=M?3:1.6;
     c.beginPath();c.moveTo(Math.cos(q)*R*(M?.8:.87),Math.sin(q)*R*(M?.8:.87));c.lineTo(Math.cos(q)*R*.97,Math.sin(q)*R*.97);c.stroke();if(t===80||t%100===0&&t<=800)T(c,String(t>=100?t/10:t),Math.cos(q)*R*.64,Math.sin(q)*R*.64,15);}
   T(c,'KNOTS',0,-R*.3,12,DIM);win(c,0,R*.2,R*.6,R*.24,'M '+m.toFixed(2),18);
   needle(c,R,a(Math.max(80,P.ac.vne?P.ac.vne*.53:600)),.9,4,'#e22');needle(c,R,a(Math.max(80,v)));},
 // 12 · AOA units 0-30, on-speed band, approach chevrons
 aoa:(c,P)=>{scale(c,R,-150,150,30,5,[0,5,10,15,20,25,30],.64,19);const u=clamp((P.alpha||0)*R2D*1.12+3,0,30);
   arc(c,R*.9,-150+300*17.4/30,-150+300*18.6/30,'#3c3',8);arc(c,R*.9,-150+300*22/30,150,'#d33',6);
   T(c,'ANGLE OF',0,R*.34,13,DIM);T(c,'ATTACK',0,R*.5,13,DIM);T(c,'UNITS',0,-R*.34,12,DIM);
   if(!powered(P))flag(c,'OFF',0,R*.7);needle(c,R,-150+300*u/30);},
 clk:(c,P)=>{const d=new Date();scale(c,R,0,330,59,5,[12,1,2,3,4,5,6,7,8,9,10,11],.68,20);needle(c,R,((d.getHours()%12)+d.getMinutes()/60)*30,.5,8);needle(c,R,d.getMinutes()*6,.8,6);needle(c,R,d.getSeconds()*6,.88,2.5,'#e33');},
 // 17 · ADI with flight director bars, OFF / GS flags, slip ball
 adi:(c,P)=>{c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();c.rotate(-(P.bank||0));const k=R/48,po=(P.pitch||0)*R2D*k;
   c.fillStyle='#e8e8e0';c.fillRect(-R*2,-R*4+po,R*4,R*4);c.fillStyle='#2a2a28';c.fillRect(-R*2,po,R*4,R*4);
   c.lineWidth=2;for(let q=5;q<=90;q+=5){for(const s of[-1,1]){const y=po-s*q*k,w=q%10?R*.1:R*.26;c.strokeStyle=s>0?'#111':'#e8e8e0';c.beginPath();c.moveTo(-w,y);c.lineTo(w,y);c.stroke();if(q%10===0){T(c,String(q),w+14,y,12,s>0?'#111':'#e8e8e0');T(c,String(q),-w-14,y,12,s>0?'#111':'#e8e8e0');}}}
   // heading tape on the ball's horizon
   const hd=P.hdg||0;for(let h=Math.ceil((hd-40)/10)*10;h<=hd+40;h+=10){const x=(h-hd)*R/40;c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(x,po);c.lineTo(x,po+8);c.stroke();if(h%30===0)T(c,String(((h%360)+360)%360/10|0),x,po+18,11,'#fff');}
   c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-R*2,po);c.lineTo(R*2,po);c.stroke();c.restore();
   c.strokeStyle=INK;c.lineWidth=2;for(const b of[-60,-45,-30,-20,-10,0,10,20,30,45,60]){const q=(b-90)*D2R;c.beginPath();c.moveTo(Math.cos(q)*R*(b%30?.9:.84),Math.sin(q)*R*(b%30?.9:.84));c.lineTo(Math.cos(q)*R*.98,Math.sin(q)*R*.98);c.stroke();}
   c.save();c.rotate(-(P.bank||0));c.fillStyle=INK;c.beginPath();c.moveTo(0,-R*.82);c.lineTo(-7,-R*.7);c.lineTo(7,-R*.7);c.closePath();c.fill();c.restore();
   // flight director (steering to the field)
   const st=clamp(((brgField(P)-(P.hdg||0)+540)%360-180)/30,-1,1);c.strokeStyle='#e040e0';c.lineWidth=3;c.beginPath();c.moveTo(st*R*.5,-R*.55);c.lineTo(st*R*.5,R*.55);c.stroke();
   c.strokeStyle='#ffb21a';c.lineWidth=6;c.beginPath();c.moveTo(-R*.55,0);c.lineTo(-R*.18,0);c.lineTo(-R*.09,R*.09);c.lineTo(0,0);c.lineTo(R*.09,R*.09);c.lineTo(R*.18,0);c.lineTo(R*.55,0);c.stroke();
   c.fillStyle='#111';c.fillRect(-R*.42,R*.78,R*.84,R*.14);c.fillStyle='#000';c.beginPath();c.arc(clamp(-(P.beta||0)*R2D*6,-R*.36,R*.36),R*.85,R*.065,0,7);c.fill();c.strokeStyle='#ddd';c.lineWidth=1.5;c.strokeRect(-R*.42,R*.78,R*.84,R*.14);
   if(!powered(P))flag(c,'OFF',-R*.6,-R*.55);if(!gearDn())flag(c,'GS',R*.62,-R*.2);},
 // 18 · HSI: compass card, course arrow (to the field), DME window, course window
 hsi:(c,P)=>{const hd=P.hdg||0,brg=brgField(P),d=distField(P),crs=ST.crs!=null?ST.crs:Math.round(brg);
   c.save();c.rotate(-hd*D2R);for(let i=0;i<72;i++){const a=i*5*D2R;c.strokeStyle=INK;c.lineWidth=i%2?1.5:3;c.beginPath();c.moveTo(Math.sin(a)*R*(i%2?.86:.8),-Math.cos(a)*R*(i%2?.86:.8));c.lineTo(Math.sin(a)*R*.97,-Math.cos(a)*R*.97);c.stroke();}
   ['N','3','6','E','12','15','S','21','24','W','30','33'].forEach((s,i)=>{c.save();c.rotate(i*30*D2R);T(c,s,0,-R*.68,s.length>1?16:19);c.restore();});
   c.save();c.rotate(crs*D2R);const dev=clamp(((brg-crs+540)%360-180)/10,-1,1)*R*.35;c.fillStyle='#e8c040';
   c.beginPath();c.moveTo(0,-R*.62);c.lineTo(-9,-R*.46);c.lineTo(9,-R*.46);c.fill();c.fillRect(-2.5,-R*.46,5,R*.2);c.fillRect(-2.5,R*.3,5,R*.3);c.fillRect(dev-2.5,-R*.24,5,R*.5);
   c.fillStyle=INK;for(const k of[-2,-1,1,2]){c.beginPath();c.arc(k*R*.175,0,3.5,0,7);c.fill();}c.restore();
   c.save();c.rotate(brg*D2R);c.fillStyle='#ddd';c.beginPath();c.moveTo(0,-R*.97);c.lineTo(-6,-R*.86);c.lineTo(6,-R*.86);c.fill();c.restore();c.restore();
   c.strokeStyle='#ffb21a';c.lineWidth=3;c.beginPath();c.moveTo(0,-R*.14);c.lineTo(0,R*.14);c.moveTo(-R*.2,0);c.lineTo(R*.2,0);c.moveTo(-R*.08,R*.12);c.lineTo(R*.08,R*.12);c.stroke();
   c.fillStyle=INK;c.beginPath();c.moveTo(0,-R);c.lineTo(-7,-R+13);c.lineTo(7,-R+13);c.fill();
   win(c,-R*.72,-R*.82,R*.46,R*.24,d<999?String(Math.round(d)).padStart(3,'0'):'---',17);T(c,'MILES',-R*.72,-R*.62,10,DIM);
   win(c,R*.72,-R*.82,R*.46,R*.24,String(((crs%360)+360)%360|0).padStart(3,'0'),17);T(c,'COURSE',R*.72,-R*.62,10,DIM);},
 // 21 · radar altimeter: expanded 0-1000, LOW ALT index
 ralt:(c,P)=>{const h=Math.max(0,(P.pos.y-groundAt(P.pos.x,P.pos.z))*3.2808),pwr=powered(P)&&!!sv('ralt',1),f=v=>v<1000?v/1000*.62:.62+lin(v,1000,5000)*.38;
   c.strokeStyle=INK;for(const t of[0,100,200,300,400,500,600,700,800,900,1000,1500,2000,3000,4000,5000]){const q=(-160+320*f(t)-90)*D2R,M=t%500===0;c.lineWidth=M?3:1.5;c.beginPath();c.moveTo(Math.cos(q)*R*(M?.8:.88),Math.sin(q)*R*(M?.8:.88));c.lineTo(Math.cos(q)*R*.97,Math.sin(q)*R*.97);c.stroke();
     if([0,200,400,600,800,1000,2000,5000].includes(t))T(c,t>=1000?String(t/1000)+'K':String(t/100),Math.cos(q)*R*.64,Math.sin(q)*R*.64,15);}
   T(c,'RADAR',0,-R*.28,12,DIM);T(c,'ALTITUDE',0,R*.3,12,DIM);T(c,'FEET',0,R*.46,11,DIM);
   c.save();c.rotate((-160+320*f(sv('lowAlt',500)))*D2R);c.fillStyle='#e22';c.fillRect(-5,-R*.99,10,R*.14);c.restore();
   if(!pwr||h>5000)flag(c,'OFF',0,-R*.55);needle(c,R,-160+320*f(pwr?Math.min(h,5000):0));},
 // 22 · AAU-19 counter-pointer altimeter
 alt:(c,P)=>{const h=Math.max(0,P.pos.y*3.2808);scale(c,R,0,324,50,5,[0,1,2,3,4,5,6,7,8,9],.64,22);T(c,'ALT',0,-R*.42,15,DIM);
   const s=String(Math.round(h/100)).padStart(3,'0');win(c,-R*.12,0,R*.62,R*.26,s.slice(0,-1)+' '+s.slice(-1),20);T(c,'× 100 FT',R*.0,R*.22,10,DIM);
   win(c,R*.2,R*.5,R*.5,R*.2,'29.92',13);needle(c,R,(h%1000)/1000*360,.86,8);},
 // 23 · VVI ±6000
 vvi:(c,P)=>{const v=(P.vel?P.vel.y:0)*196.85/1000;scale(c,R,-170,-10,12,2,[6,4,2,1,0],.64,19);scale(c,R,10,170,12,2,[0,1,2,4,6],.64,19);
   T(c,'UP',-R*.48,-R*.2,13,DIM);T(c,'DN',-R*.48,R*.2,13,DIM);T(c,'VERTICAL VELOCITY',R*.05,R*.46,9,DIM);T(c,'1000 FT/MIN',R*.05,R*.6,9,DIM);
   const f=x=>{const a=Math.abs(x);return Math.sign(x)*(a<1?a*.25:a<2?.25+(a-1)*.2:.45+(a-2)/4*.55);};needle(c,R,-90+clamp(f(clamp(v,-6,6)),-1,1)*80);},
 // 24 · accelerometer with max / min pointers
 acc:(c,P)=>{P._minNz=Math.min(P._minNz==null?1:P._minNz,P.nz||1);scale(c,R,-150,150,14,2,[-4,-2,0,2,4,6,8,10],.64,19);T(c,'G UNITS',0,R*.42,13,DIM);T(c,'PUSH TO SET',0,R*.6,9,DIM);
   const a=g=>-150+300*clamp((g+4)/14,0,1);needle(c,R,a(P.maxNz||1),.78,4,'#cfcfc8');needle(c,R,a(P._minNz),.78,4,'#cfcfc8');needle(c,R,a(P.nz||1));},
 // 27 · fuel quantity (lbs × 1000) with total counter; selector 37 picks TOTAL / INT / L WG / R WG / EXT
 fuel:(c,P)=>{const sel=sv('ftq',0),tot=fuelLb(P),int=intLb(P),ext=Math.max(0,tot-int),
     v=[tot,int,int*.17,int*.17,ext][sel];
   scale(c,R,-140,140,24,2,[0,1,2,3,4,5,6,7,8,9,10,11,12],.66,15);T(c,'FUEL',0,-R*.34,14,DIM);T(c,'QUANTITY',0,R*.3,12,DIM);
   win(c,0,R*.55,R*.62,R*.22,String(Math.round(int/10)*10).padStart(5,'0'),15);T(c,['TOTAL','INT','L WG','R WG','EXT'][sel],0,-R*.16,11,'#e8c040');
   needle(c,R,-140+280*clamp((v/1000)/12,0,1),.86,8);},
 tot:(c,P)=>{const t=tot(P);scale(c,R,-150,150,20,2,[0,1,2,3,4,5,6,7,8,9,10],.64,16);arc(c,R*.9,-150+300*.6,-150+300*.64,'#3c3');arc(c,R*.9,-150+300*.64,-150+300*.7,'#fc0');
   T(c,'TURBINE OUTLET',0,R*.32,10,DIM);T(c,'TEMP °C × 100',0,R*.48,10,DIM);needle(c,R,-150+300*clamp(t/1000,0,1));},
 top:(c,P)=>{const r=rpm(P),p=r<30?1:1+lin(r,55,100)*1.55;scale(c,R,-140,140,20,5,['1.0','1.5','2.0','2.5','3.0'],.64,16);T(c,'TURBINE OUTLET',0,R*.32,10,DIM);T(c,'PRESS RATIO',0,R*.48,10,DIM);needle(c,R,-140+280*lin(p,1,3));},
 ff:(c,P)=>{const f=running(P)?(rpm(P)<70?.6+rpm(P)/100:1.1+Math.pow(P.n||0,1.6)*8.6):0;scale(c,R,-150,150,24,2,[0,1,2,3,4,5,6,7,8,9,10,11,12],.66,14);T(c,'FUEL FLOW',0,R*.32,11,DIM);T(c,'PPH × 1000',0,R*.48,10,DIM);needle(c,R,-150+300*clamp(f/12,0,1));},
 // 31 · tachometer with vernier
 rpm:(c,P)=>{const r=rpm(P);scale(c,R,-150,150,22,2,[0,10,20,30,40,50,60,70,80,90,100,110],.68,14);arc(c,R*.9,-150+300*100/110,-150+300*104/110,'#d33');
   T(c,'% RPM',0,R*.3,13,DIM);c.save();c.translate(0,-R*.38);c.beginPath();c.arc(0,0,R*.22,0,7);c.fillStyle='#161718';c.fill();c.strokeStyle=INK;c.lineWidth=1.2;
   for(let i=0;i<10;i++){const q=(i*36-90)*D2R;c.beginPath();c.moveTo(Math.cos(q)*R*.15,Math.sin(q)*R*.15);c.lineTo(Math.cos(q)*R*.21,Math.sin(q)*R*.21);c.stroke();}
   c.rotate((r%10)*36*D2R);c.fillStyle=INK;c.fillRect(-1.5,-R*.2,3,R*.2);c.restore();needle(c,R,-150+300*clamp(r/110,0,1));},
 oilp:(c,P)=>{const p=window.ENGSYS&&window.ENGSYS.on?ENGSYS.oilP(P,0):running(P)?(rpm(P)<70?20+rpm(P)*.25:38+(P.n||0)*10):0;scale(c,R,-130,130,10,2,[0,20,40,60,80,100],.64,18);arc(c,R*.9,-130+260*.4,-130+260*.55,'#3c3');T(c,'OIL',0,R*.36,14,DIM);T(c,'PSI',0,R*.52,12,DIM);needle(c,R,-130+260*p/100);},
 oilq:(c,P)=>{c.fillStyle='#262624';c.beginPath();c.arc(0,0,R*.98,0,7);c.fill();scale(c,R,-90,90,8,2,['E','1/4','1/2','3/4','F'],.62,15);T(c,'OIL QTY',0,R*.36,14,DIM);needle(c,R,-90+180*(sv('oilq',.82)));},
 // 36 · hydraulic pressure, PC-1 / PC-2 pointers
 hyd:(c,P)=>{const p=k=>window.ENGSYS&&window.ENGSYS.on?ENGSYS.hydN(P,k===2?'B':'A')*.75:running(P)?(rpm(P)>40?.75+.008*Math.sin(now()*2+k):rpm(P)/53):0;scale(c,R,-140,140,8,2,[0,1,2,3,4],.62,20);T(c,'HYD PRESS',0,R*.36,12,DIM);T(c,'PSI × 1000',0,R*.52,10,DIM);
   needle(c,R,-140+280*clamp(p(1)*.99,0,1),.8,6,'#e8e8e0');needle(c,R,-140+280*clamp(p(2),0,1),.86,4,'#ffb21a');},
 lox:(c,P)=>{scale(c,R,-130,130,10,2,[0,2,4,6,8,10],.64,18);T(c,'LIQUID',0,R*.32,12,DIM);T(c,'OXYGEN',0,R*.46,12,DIM);T(c,'LITERS',0,R*.6,10,DIM);
   P._lox=(P._lox==null?9.2:P._lox)-(sv('o2',1)?.0006:0);needle(c,R,-130+260*clamp((lampTest>now()?0:P._lox)/10,0,1));},
 cab:(c,P)=>{const h=P.pos.y*3.2808,ca=h<8000?h:Math.max(8000,h*.45);scale(c,R,-150,150,10,2,[0,10,20,30,40,50],.64,18);T(c,'COCKPIT',0,R*.32,12,DIM);T(c,'ALTITUDE',0,R*.46,12,DIM);T(c,'FT × 1000',0,R*.6,10,DIM);needle(c,R,-150+300*clamp(ca/50000,0,1));},
 tas:(c,P)=>{c.fillStyle='#8d2b22';c.beginPath();c.arc(0,0,R*.98,0,7);c.fill();c.fillStyle='#141414';c.beginPath();c.arc(0,0,R*.78,0,7);c.fill();
   T(c,'TRUE',0,-R*.42,16,'#eee');T(c,'AIRSPEED',0,-R*.22,16,'#eee');const tas=(P.vel?Math.hypot(P.vel.x,P.vel.y,P.vel.z):0)*1.944;win(c,0,R*.1,R*.7,R*.3,String(Math.round(tas)).padStart(3,'0'),28);T(c,'KNOTS',0,R*.42,14,'#eee');},
 sbk:(c,P)=>{const s=P.sb||0;scale(c,R,-60,60,4,2,['IN','','OUT'],.6,17);T(c,'SPEED',0,R*.25,14,DIM);T(c,'BRAKE',0,R*.42,14,DIM);needle(c,R,-60+120*clamp(s,0,1));},
 flap:(c,P)=>{const f=(P.flapPos!=null?P.flapPos:P.flapCmd||0);scale(c,R,-90,60,8,2,['UP','','10','','20','','30','','40'],.6,15);T(c,'FLAPS',0,R*.42,15,DIM);needle(c,R,-90+150*clamp(f,0,1));},
 // 8 · standby attitude (ARU-type, 3")
 sby:(c,P)=>{c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();c.rotate(-(P.bank||0));const k=R/40,po=(P.pitch||0)*R2D*k;c.fillStyle='#e8e8e0';c.fillRect(-R*2,-R*4+po,R*4,R*4);c.fillStyle='#1b1b1b';c.fillRect(-R*2,po,R*4,R*4);
   c.lineWidth=2;for(let q=10;q<=60;q+=10)for(const s of[-1,1]){c.strokeStyle=s>0?'#111':'#ddd';c.beginPath();c.moveTo(-R*.2,po-s*q*k);c.lineTo(R*.2,po-s*q*k);c.stroke();}c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-R*2,po);c.lineTo(R*2,po);c.stroke();c.restore();
   c.strokeStyle='#ff8a1a';c.lineWidth=7;c.beginPath();c.moveTo(-R*.55,0);c.lineTo(-R*.15,0);c.lineTo(0,R*.12);c.lineTo(R*.15,0);c.lineTo(R*.55,0);c.stroke();T(c,'PULL TO CAGE',0,R*.8,10,DIM);},
 uhf:(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#151617';c.fillRect(0,0,S,S);c.fillStyle='#000';c.fillRect(S*.08,S*.25,S*.84,S*.42);
   const ch=sv('uhfCh',7),fq=['225.0','243.0','251.9','255.4','264.2','270.6','275.8','282.8','290.0','296.3','304.6','311.0','317.4','321.0','334.5','340.2','348.7','352.0','358.6','363.8'][(ch-1)%20];
   T(c,fq,S/2,S*.46,S*.26,'#ffe9a8');T(c,'UHF  CH '+String(ch).padStart(2,'0'),S/2,S*.82,S*.12,DIM);},
 // 37 · fuel tank qty switch face
 ftq:(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#1b1c1e';c.fillRect(0,0,S,S);T(c,'FUEL TANK',S/2,S*.08,S*.075);T(c,'QTY',S/2,S*.17,S*.075);
   ['TOTAL','INT','L WG','R WG','EXT'].forEach((s,i)=>{const a=(-90+i*45)*D2R;T(c,s,S/2+Math.sin(a+Math.PI/2*0)*S*.0+Math.cos((i*45-180)*D2R)*S*.34,S*.48+Math.sin((i*45-180)*D2R)*S*.3,S*.06,i===sv('ftq',0)?'#e8c040':INK);});
   T(c,'LOX',S*.3,S*.86,S*.06);T(c,'IND TEST',S*.3,S*.94,S*.05);},
 small:(kind)=>(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#111';c.fillRect(0,0,S,S);
   if(kind==='gear'){const tr=P.gearPos!=null&&P.gearPos>.05&&P.gearPos<.95;if(tr)barber(c,S/2,S/2,S*.45);else if(gearDn()&&P.gearPos>.9){c.fillStyle='#ddd';c.beginPath();c.arc(S/2,S/2,S*.42,0,7);c.fill();c.fillStyle='#111';c.beginPath();c.arc(S/2,S/2,S*.18,0,7);c.fill();}else T(c,'UP',S/2,S/2,S*.38,'#fff');}
   else if(kind==='le'){const dn0=(P.flapPos||P.flapCmd||0)>.1||(P.alpha||0)*R2D>9,dn=window.STRUCT?STRUCT.slatOut(P,dn0):dn0;T(c,dn?'DN':'UP',S/2,S/2,S*.38,'#fff');}
   else if(kind==='ptrim'||kind==='rtrim'){c.strokeStyle=INK;c.lineWidth=2;const v=kind==='ptrim'?clamp(P._trimP||0,-1,1):clamp(P.ctl?P.ctl.r||0:0,-1,1);
     if(kind==='ptrim'){for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(S*.35,S/2+i*S*.1);c.lineTo(S*.6,S/2+i*S*.1);c.stroke();}c.fillStyle='#ffb21a';c.beginPath();c.moveTo(S*.65,S/2-v*S*.4);c.lineTo(S*.9,S/2-v*S*.4-10);c.lineTo(S*.9,S/2-v*S*.4+10);c.fill();T(c,'NOSE',S*.17,S*.12,S*.11,DIM);T(c,'DN',S*.17,S*.88,S*.12,DIM);}
     else{for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(S/2+i*S*.1,S*.35);c.lineTo(S/2+i*S*.1,S*.6);c.stroke();}c.fillStyle='#ffb21a';c.beginPath();c.moveTo(S/2+v*S*.4,S*.65);c.lineTo(S/2+v*S*.4-10,S*.9);c.lineTo(S/2+v*S*.4+10,S*.9);c.fill();T(c,'L   ROLL   R',S/2,S*.15,S*.1,DIM);}}}};
function brgField(P){try{return(Math.atan2(AF.x-P.pos.x,-(AF.z-P.pos.z))*R2D+360)%360;}catch(e){return 0;}}
function distField(P){try{return Math.hypot(AF.x-P.pos.x,AF.z-P.pos.z)/1852;}catch(e){return 999;}}

// caution list: the lights of the alarm panel and the advisory panel that the sim can drive (French legends as on the panel)
function cautions(P){const L=[];if(!running(P))L.push('MOTEUR');if(fuelLb(P)<1800)L.push('CARBU');if(running(P)&&rpm(P)<45)L.push('HUILE');
  if(!(P.eng&&!P.eng.done?P.eng.gen:running(P)))L.push('ALTER');if(!running(P)||rpm(P)<40)L.push('HYD');if(sv('canopy',0))L.push('CANOP');
  if(P.dm&&P.dm.hyd!=null&&P.dm.hyd<.5)L.push('PC');if(gearDn()&&(P.sb||0)>.05)L.push('AF');if((P.fire||0)>0)L.push('FEU');return L;}
const AB=P=>running(P)&&(P.thr||0)>.92;
const ALARM=[['FEU','#f33'],['HYD','#fb3'],['CARBU','#fb3'],['ALTER','#fb3'],['HUILE','#fb3'],['PC','#fb3'],['MOTEUR','#fb3'],['CANOP','#fb3'],['AF','#fb3'],['PA','#fb3'],['DIRAV','#fb3'],['PIL AUTO','#fb3'],['BATT','#fb3'],['O2','#fb3'],['FREIN','#fb3']];

/* ---------------- build ---------------- */
function build(ctx){const{g,box,LM,liveTex}=ctx;const ctls=[],upd=[],lamps=[];
  const hit=new THREE.MeshBasicMaterial({visible:false});
  // redraw gating: gauges redraw only when what they show has changed (quantised to what is visible)
  const q=(v,s)=>Math.round((v||0)*s);
  const FASTK=new Set(['masi','aoa','adi','hsi','alt','vvi','acc','sby','ralt']);
  const gate=k=>{let last=null;const fast=FASTK.has(k);return()=>{const key=fast?FK:SK;if(key===last)return false;last=key;return true;};};
  const PC=0x2c2f32,pm=LM(PC,12),dk=LM(0x1b1d1f,8),blk=LM(0x0b0c0d,4),bz=LM(0x141618,40),met=LM(0x9aa0a4,60);
  const board=new THREE.Group();board.position.set(0,-.30,-.72);board.rotation.x=-.18;g.add(board);
  // ---- outline traced from the panel map: two lobes either side of the HUD pedestal, VTB bezel, centre pedestal ----
  const OUT=[[400,822],[378,545],[668,268],[715,268],[715,330],[965,330],[965,268],[1300,545],[1300,822],[965,822],[965,889],[960,912],[960,1340],[705,1340],[705,912],[715,889],[715,822]];
  const sh=new THREE.Shape();OUT.forEach(([x,y],i)=>i?sh.lineTo(bx(x),by(y)):sh.moveTo(bx(x),by(y)));
  const X0=370,Y0=260,W0=940,H0=1090,bg=document.createElement('canvas');bg.width=1128;bg.height=1308;const SX=bg.width/W0,SY=bg.height/H0,fx=x=>(x-X0)*SX,fy=y=>(y-Y0)*SY;
  {const c=bg.getContext('2d');c.fillStyle='#2c2f32';c.fillRect(0,0,bg.width,bg.height);
    c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=3;[[410,700,410,822],[700,700,700,822],[965,620,965,822],[715,330,715,575],[965,330,965,575],[715,575,965,575],[715,620,965,620],[705,912,960,912],[705,1230,960,1230]].forEach(([a,b,c2,d])=>{c.beginPath();c.moveTo(fx(a),fy(b));c.lineTo(fx(c2),fy(d));c.stroke();});
    const lab=(s,x,y,sz=10,al='center')=>{c.font=`bold ${sz*SX}px Arial`;c.textAlign=al;c.textBaseline='middle';c.fillStyle='#e6e6de';s.split('\n').forEach((l,i,a)=>c.fillText(l,fx(x),fy(y)+(i-(a.length-1)/2)*(sz+2)*SY));};
    lab('ALTITUDE',548,590,7);lab('VITESSE',455,590,7);lab('RADIO',607,383,6);lab('PA',500,545,6);lab('INDICATEUR D\'INCIDENCE',682,262,5);
    lab('VTB',840,615,8);lab('PCA',768,842,7);lab('PPA',880,842,7);lab('VTH',840,338,7);lab('LUM',905,452,6);lab('MODE',745,470,6);lab('ALT',800,436,6);lab('EFF',880,525,6);
    lab('GAUCHE',1262,630,5);lab('COMBUSTIBLE',1192,630,6);lab('CAB',910,1272,7);lab('HYD',760,1272,7);
    c.fillStyle='rgba(255,255,255,.18)';for(const [x,y] of[[395,540],[395,800],[1285,540],[1285,800],[720,300],[960,300],[725,1325],[945,1325],[725,925],[945,925]]){c.beginPath();c.arc(fx(x),fy(y),5,0,7);c.fill();}}
  const bgT=new THREE.CanvasTexture(bg);bgT.anisotropy=8;ctx.o.tex.push(bgT);
  const geo=new THREE.ShapeGeometry(sh);{const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i)/K+OX,y=OY-p.getY(i)/K;uv.setXY(i,(x-X0)/W0,1-(y-Y0)/H0);}uv.needsUpdate=true;}
  const faceM=new THREE.MeshBasicMaterial({map:bgT,toneMapped:false});ctx.o.faces.push(faceM);const bm=new THREE.Mesh(geo,faceM);bm.userData.cwFx=1;board.add(bm);
  {const eg=new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false});const e=new THREE.Mesh(eg,pm);e.position.z=-.031;e.userData.cwFx=1;board.add(e);}
  // HUD pedestal (9): recessed black block under the sight head, with its controls
  box(board,(965-715)*K,(575-330)*K,.05,LM(0x0f1011,6),bx(840),by(452),.03);
  box(board,(960-715)*K,6*K,.04,pm,bx(840),by(330),.03);
  // VTB (20) bezel
  box(board,(965-715)*K,(868-620)*K,.03,dk,bx(840),by(744),.012);
  {const sq=typeof fcrC!=='undefined'?fcrC:null;if(sq){const m=new THREE.MeshBasicMaterial({map:liveTex(ctx.kind,sq),toneMapped:false});ctx.o.faces.push(m);const sc=new THREE.Mesh(new THREE.PlaneGeometry(190*K,200*K),m);sc.position.set(bx(840),by(722),.0285);sc.userData.screen='fcr';board.add(sc);}}
  // RWR (11): the jet's Serval picture
  box(board,172*K,172*K,.03,dk,bx(1050),by(455),.012);
  try{if(typeof rwrC!=='undefined'){const m=new THREE.MeshBasicMaterial({map:liveTex(ctx.kind,rwrC),toneMapped:false});ctx.o.faces.push(m);const rw=new THREE.Mesh(new THREE.CircleGeometry(80*K,40),m);rw.position.set(bx(1050),by(455),.0285);board.add(rw);}}catch(e){}
  const glsM=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.08,shininess:140,specular:0x8a8a8a,depthWrite:false});
  function inst(k,x,y,hs,draw,round=true){const S=k==='adi'||k==='hsi'?256:hs<16?96:192,cv=document.createElement('canvas');cv.width=cv.height=S;const t=new THREE.CanvasTexture(cv);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;ctx.o.tex.push(t);
    const c=cv.getContext('2d'),r=hs*K;box(board,2*r*1.04,2*r*1.04,.03,bz,bx(x),by(y),.008);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const fm=new THREE.Mesh(round?new THREE.CircleGeometry(r*.9,48):new THREE.PlaneGeometry(r*1.8,r*1.8),m);fm.position.set(bx(x),by(y),.0235);fm.userData.cwFx=1;board.add(fm);
    if(round){const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.92,r*.05,8,40),LM(0x0a0a0a,30));ring.position.set(bx(x),by(y),.0245);ring.userData.cwFx=1;board.add(ring);
      const gl=new THREE.Mesh(new THREE.CircleGeometry(r*.92,40),glsM);gl.position.set(bx(x),by(y),.026);gl.userData.cwFx=1;gl.renderOrder=2;board.add(gl);
      for(const [sx,sy] of[[-1,-1],[1,-1],[-1,1],[1,1]]){const s=new THREE.Mesh(new THREE.CylinderGeometry(r*.06,r*.06,.004,8),met);s.rotation.x=Math.PI/2;s.position.set(bx(x)+sx*r*.85,by(y)+sy*r*.85,.024);board.add(s);}}
    const gt=gate(k);upd.push(P=>{if(!gt())return;if(round){face(c,S);c.scale(S/256,S/256);}draw(c,P);t.needsUpdate=true;});}
  function lampAt(par,x,y,z,w,h,lg,col,lit,ww,hh){const cv=document.createElement('canvas');cv.width=128;cv.height=Math.max(32,Math.round(128*hh/ww));const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const lm=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);lm.position.set(x,y,z);lm.userData.cwFx=1;par.add(lm);let last=null;
    lamps.push(P=>{const on=lampTest>now()||!!lit(P);if(on===last)return;last=on;c.fillStyle=on?col:'#1c1a14';c.fillRect(0,0,cv.width,cv.height);const n=lg.split('\n');c.font=`bold ${Math.round(cv.height*(n.length>1?.3:.42))}px Arial`;c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=on?'#200':'#5a5444';n.forEach((l,i,a)=>c.fillText(l,64,cv.height/2+(i-(a.length-1)/2)*cv.height*.36));t.needsUpdate=true;});return lm;}
  function reg(par,mesh,name,state,act){mesh.userData.ctl={meshes:[mesh],name,state,act:(d)=>{try{act(d);}catch(e){console.warn('[m2kpit]',name,e);}try{sfx.click();}catch(e){}}};ctls.push(mesh.userData.ctl);}
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
  const tg2=(par,x,y,name,pos,get,set,o={})=>toggle(par,x,y,o.z||BZ,name,pos,get,set,o);

  // generic textured rectangle (frequency display, tape, engine panels): draw(c,P,w,h) every frame, or once when stat is set
  function pTex(x,y,w,h,cw,ch,draw,stat,z=.0235,fastTex=false){const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;ctx.o.tex.push(t);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(w*K,h*K),m);pl.position.set(bx(x),by(y),z);pl.userData.cwFx=1;board.add(pl);
    box(board,w*K+.006,h*K+.006,.03,bz,bx(x),by(y),.008);let done=false;const gt3=gate(fastTex?'aoat':'p');upd.push(P=>{if(stat&&done)return;if(!stat&&!gt3())return;done=true;c.setTransform(1,0,0,1,0,0);draw(c,P||PL(),cw,ch);t.needsUpdate=true;});}
  const rct=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const txt=(c,s,x,y,sz,col=INK,al='center')=>T(c,s,x,y,sz,col,al);

  /* ---------------- main panel instruments (map items) ---------------- */
  [['masi',455,632,48,F.masi],['alt',548,632,48,F.alt],['sby',655,632,44,F.sby],['adi',630,522,60,F.adi],['vvi',538,548,30,F.vvi],
   ['acc',1010,350,33,F.acc],['hsi',1050,640,58,F.hsi],['rpm',1175,527,33,F.rpm],['tot',1172,585,33,F.tot],['hyd',760,1317,45,F.hyd],['cab',910,1317,45,F.cab]]
    .forEach(([k,x,y,hs,d])=>inst(k,x,y,hs,d,true));
  // 56 · clock, on the left canopy rail
  inst('clk',190,555,38,F.clk,true);
  // 8 · AOA indicator: vertical tape in degrees
  pTex(682,350,38,148,96,370,(c,P,w,h)=>{rct(c,0,0,w,h,'#0b0c0d');c.strokeStyle=INK;c.fillStyle=INK;c.lineWidth=2;const a=clamp((P.alpha||0)*R2D,0,30);
    for(let i=0;i<=30;i+=2){const y=h-14-(h-28)*i/30,M=i%10===0;c.beginPath();c.moveTo(M?10:20,y);c.lineTo(38,y);c.stroke();if(M)txt(c,String(i),62,y,17,INK);}
    const yy=h-14-(h-28)*a/30;c.fillStyle='#ffb21a';c.beginPath();c.moveTo(2,yy);c.lineTo(22,yy-9);c.lineTo(22,yy+9);c.fill();if(a>=26){c.fillStyle='#f33';c.fillRect(0,0,w,10);}txt(c,'α',w/2,h-4,13,DIM);},false,.0235,true);
  // 6 · radio frequency display: V/UHF main on top, UHF auxiliary below
  pTex(607,410,56,62,140,155,(c,P,w,h)=>{const ch=sv('uhfCh',7),fq=['225.000','243.000','251.900','255.400','264.200','270.600','275.800','282.800','290.000','296.300','304.600','311.000','317.400','321.000','334.500','340.200','348.700','352.000','358.600','363.800'][(ch-1)%20];
    rct(c,0,0,w,h,'#050505');txt(c,powered(P)?fq:'------',w/2,30,25,'#ffcf7a');txt(c,'V/UHF  P'+String(ch).padStart(2,'0'),w/2,56,14,DIM);txt(c,powered(P)?'243.000':'------',w/2,100,25,'#ffcf7a');txt(c,'UHF AUX',w/2,126,14,DIM);},false,.0245);
  // 2 · autopilot altitude selector (drum counter + knob)
  pTex(463,572,72,40,180,100,(c,P,w,h)=>{rct(c,0,0,w,h,'#0a0a0a');const a=sv('apalt',3000);c.fillStyle='#e8e8e0';c.font='bold 11px Arial';c.textAlign='center';c.fillText('ALT SEL  (FT)',w/2,14);
    c.fillStyle='#000';c.fillRect(30,24,120,60);c.strokeStyle='#555';c.strokeRect(30,24,120,60);txt(c,String(a).padStart(5,'0'),90,55,34,'#fff');},false);
  knob(board,bx(502),by(572),BZ,10*K,'AUTOPILOT ALTITUDE SELECTOR (2)',['−1000','−500','−100','+100','+500','+1000'],'apk',()=>3,v=>{const d=[-1000,-500,-100,100,500,1000][v];ST.apalt=clamp(sv('apalt',3000)+d,0,50000);ST.apk=3;},{col:0xd0d0c8});
  // 14 / 15 / 16 · engine: RPM and temperature, fuel flow digital, bingo selector
  pTex(1262,548,56,26,140,64,(c,P,w,h)=>{rct(c,0,0,w,h,'#050505');const f=running(P)?(rpm(P)<70?.6+rpm(P)/100:1.1+Math.pow(P.n||0,1.6)*9.2):0;txt(c,String(Math.round(f*10)).padStart(4,'0'),w/2,28,32,'#ffcf7a');txt(c,'KG/MIN',w/2,52,12,DIM);},false);
  pTex(1262,590,56,26,140,64,(c,P,w,h)=>{rct(c,0,0,w,h,'#050505');txt(c,String(sv('bingo',900)).padStart(4,'0'),w/2,28,32,'#ffcf7a');txt(c,'BINGO KG',w/2,52,12,DIM);},false);
  knob(board,bx(1296),by(590),BZ,7*K,'BINGO FUEL SELECTOR (16)',['−100','+100'],'bgk',()=>0,v=>{ST.bingo=clamp(sv('bingo',900)+(v?100:-100),0,3000);ST.bgk=0;},{col:0xd0d0c8});
  // 18 · fuel control panel: quantity, pump / transfer lights
  pTex(1192,712,100,172,250,430,(c,P,w,h)=>{rct(c,0,0,w,h,'#0b0c0d');txt(c,'CARBURANT',w/2,18,16);const kg=Math.round((P.totalFuel||0));c.fillStyle='#000';c.fillRect(40,34,170,48);c.strokeStyle='#555';c.strokeRect(40,34,170,48);
    txt(c,String(kg).padStart(4,'0'),125,60,38,'#ffcf7a');txt(c,'KG',125,96,13,DIM);const tk=['G','D','AV','AR','CTR','EXT'];
    tk.forEach((s,i)=>{const x=36+(i%3)*80,y=130+(i/3|0)*66,f=clamp(kg/(P.ac.fuel||3200)*(i<4?1:.7),0,1);txt(c,s,x+16,y-12,12,DIM);c.fillStyle='#111';c.fillRect(x,y,34,52);c.fillStyle=f<.15?'#d33':'#6c6';c.fillRect(x+3,y+50-46*f,28,46*f);c.strokeStyle='#666';c.strokeRect(x,y,34,52);});
    ['POMPE G','POMPE D','TRANSF'].forEach((s,i)=>{const on=powered(P)&&sv('boostL'+i,1);c.fillStyle=on?'#4c4':'#1c241c';c.fillRect(20+i*72,276,62,26);txt(c,s,51+i*72,289,11,on?'#031':'#576');});
    txt(c,'PURGE',60,332,12,DIM);txt(c,'VIDANGE',186,332,12,DIM);c.fillStyle=sv('dump',0)?'#fb3':'#1c1a14';c.fillRect(150,344,70,24);txt(c,'DUMP',185,356,12,sv('dump',0)?'#210':'#5a5444');},false);
  tg2(board,bx(1160),by(790),'FUEL BOOST PUMP LEFT (18)',['OFF','ON'],()=>sv('boostL0',1),v=>{ST.boostL0=v;});
  tg2(board,bx(1192),by(790),'FUEL BOOST PUMP RIGHT (18)',['OFF','ON'],()=>sv('boostL1',1),v=>{ST.boostL1=v;});
  tg2(board,bx(1224),by(790),'FUEL TRANSFER (18)',['OFF','ON'],()=>sv('boostL2',1),v=>{ST.boostL2=v;});
  // alarm lights panel (left, below the lobe)
  pTex(558,760,285,118,570,236,(c,P,w,h)=>{rct(c,0,0,w,h,'#0b0c0d');const L=cautions(P),n=5,cw=w/n,chh=h/3;
    ALARM.forEach(([s,col],i)=>{const x=(i%n)*cw,y=(i/n|0)*chh,on=lampTest>now()||L.includes(s)||(s==='FEU'&&fireTest>now());c.fillStyle='#16130c';c.fillRect(x+4,y+4,cw-8,chh-8);if(on){c.fillStyle=col;c.fillRect(x+6,y+6,cw-12,chh-12);}txt(c,s,x+cw/2,y+chh/2,s.length>5?17:22,on?'#200':'#5a5444');});},false);
  // 7 · MASTER CAUTION (amber) and WARNING (red)
  lampAt(board,bx(608),by(357),.016,26*K,26*K,'MASTER\nCAUT','#fb3',P=>cautions(P).length>0&&!mcAck,26,26);box(board,26*K+.004,26*K+.004,.012,blk,bx(608),by(357),.009);
  lampAt(board,bx(638),by(357),.016,26*K,26*K,'WARN','#f33',P=>cautions(P).includes('FEU')&&!mcAck,26,26);box(board,26*K+.004,26*K+.004,.012,blk,bx(638),by(357),.009);
  hitBox(board,bx(608),by(357),.02,28*K,28*K,'MASTER CAUTION (7) · press to reset',()=>cautions(PL()).join(' · ')||'—',()=>{mcAck=true;});
  // 4 · autopilot push-lights (diagonal strip): A/P, BAR, SEL, STBY, APP
  [['A/P','ap',452,490],['BAR','apb',478,471],['SEL','aps',504,453],['STBY','apy',524,436],['APP','apa',546,420]].forEach(([s,k,x,y])=>{
    box(board,28*K,16*K,.012,blk,bx(x),by(y),.009);lampAt(board,bx(x),by(y),.016,26*K,14*K,s,'#4d4',()=>sv(k,0)===1,26,14);
    hitBox(board,bx(x),by(y),.02,28*K,18*K,'AUTOPILOT '+s+' (4)',()=>sv(k,0)?'ON':'OFF',()=>{if(k==='ap'||k==='apy'){const on=!sv(k,0);ST.ap=on&&k==='ap'?1:0;ST.apy=on&&k==='apy'?1:0;}else ST[k]=sv(k,0)?0:1;});});
  // 5 · FBW spin guard, 12 / 13 lamps, 17 fire lights
  tg2(board,bx(528),by(497),'FBW SPIN (5)',['NORM','VRILLE'],()=>sv('spin',0),v=>{ST.spin=v;},{guard:true,guardUp:()=>sv('spin',0)});
  lampAt(board,bx(1152),by(462),.016,24*K,24*K,'PC','#4f4',P=>AB(P),24,24);box(board,28*K,28*K,.012,blk,bx(1152),by(462),.009);
  lampAt(board,bx(1185),by(462),.016,24*K,24*K,'START','#f33',P=>!!(window.START&&P.eng&&!P.eng.done&&P.eng.e[0]&&P.eng.e[0].cranking),24,24);box(board,28*K,28*K,.012,blk,bx(1185),by(462),.009);
  [[637,0],[660,1]].forEach(([y,i])=>{box(board,32*K,20*K,.012,blk,bx(1262),by(y),.009);lampAt(board,bx(1262),by(y),.016,30*K,18*K,'FEU','#f33',P=>(P.fire||0)>0||fireTest>now(),30,18);});
  button(board,bx(1296),by(648),BZ,6*K,'FIRE TEST (17)',0x6a6a6a,()=>{fireTest=now()+3;lampTest=now()+3;});
  // 15 · switches beside the fuel flow window, 22 hydraulic selector, 25 rudder pedal adjuster
  tg2(board,bx(1240),by(520),'FUEL FLOW SELECT (15)',['INST','TOT'],()=>sv('ffs',0),v=>{ST.ffs=v;});
  tg2(board,bx(905),by(1177),'HYDRAULIC PRESSURE SELECTOR (22)',['CIRC 1','CIRC 2'],()=>sv('hysel',0),v=>{ST.hysel=v;});
  // 9 · HUD pedestal controls
  knob(board,bx(905),by(420),.055,12*K,'HUD BRIGHTNESS (9)',['DIM','MED','BRT'],'hbrt',()=>{try{return sys.hud.brt>.8?2:sys.hud.brt>.45?1:0;}catch(e){return 2;}},v=>{try{sys.hud.brt=[.35,.65,1][v];}catch(e){}});
  knob(board,bx(745),by(440),.055,11*K,'HUD MODE (9)',['NAV','AA','AG'],'hmode',()=>sv('hmode',0));
  tg2(board,bx(800),by(410),'HUD ALTITUDE SOURCE (9)',['BARO','RADAR'],()=>sv('hralt',0),v=>{ST.hralt=v;},{z:.055});
  tg2(board,bx(880),by(500),'HUD DECLUTTER (9)',['NORM','DCLT'],()=>sv('hdc',0),v=>{ST.hdc=v;},{z:.055});
  // 26 · PCA (weapons control panel) and PPA (weapons preparation panel) under the VTB
  [[735,'1'],[755,'2'],[775,'3'],[795,'4'],[815,'5']].forEach(([x,s],i)=>{box(board,16*K,16*K,.012,blk,bx(x),by(868),.009);lampAt(board,bx(x),by(868),.016,14*K,14*K,s,'#f0f0e8',()=>sv('pca',0)===i+1,14,14);
    hitBox(board,bx(x),by(868),.02,16*K,16*K,'PCA STATION '+s+' (26)',()=>sv('pca',0)===i+1?'SELECTED':'—',()=>{ST.pca=sv('pca',0)===i+1?0:i+1;});});
  tg2(board,bx(740),by(850),'MASTER ARM (26)',['OFF','ARM'],()=>game.armPos===0?1:0,v=>setArm(v?0:1),{col:0xd8b820});
  tg2(board,bx(785),by(850),'GUN SELECT (26)',['—','GUN'],()=>game.wsel==='GUN'?1:0,v=>{try{if(v)game.wsel='GUN';}catch(e){}});
  knob(board,bx(845),by(850),BZ,9*K,'MISSILE SELECTOR (26)',['SUPER 530D','MAGIC II'],'msel',()=>sv('msel',0));
  tg2(board,bx(885),by(850),'SUPER 530D PREP (26)',['STBY','PREP'],()=>sv('prep',0),v=>{ST.prep=v;});
  tg2(board,bx(925),by(850),'BOMB FUZE (26)',['SAFE','ARM'],()=>sv('fuzeb',0),v=>{ST.fuzeb=v;});
  knob(board,bx(905),by(880),BZ,8*K,'RELEASE QUANTITY (26)',['1','2','3','4','6','8'],'relq');

  /* ---------- pedestal (21 IFF panel) ---------- */
  pTex(840,974,230,40,460,80,(c,P,w,h)=>{rct(c,0,0,w,h,'#0a0a0a');for(let i=0;i<6;i++){c.fillStyle='#000';c.fillRect(8+i*74,8,64,64);c.strokeStyle='#444';c.strokeRect(8+i*74,8,64,64);txt(c,String([4,0,1,2,3,0][i]),40+i*74,40,38,'#ffcf7a');}},true);
  [['M1',740],['M2',770],['M3',800],['M4',830]].forEach(([s,x],i)=>knob(board,bx(x),by(1030),BZ,10*K,'IFF MODE '+s+' (21)',['OFF','ON'],'iff'+i,()=>sv('iff'+i,1),v=>{ST['iff'+i]=v;}));
  knob(board,bx(785),by(1090),BZ,26*K,'IFF MASTER (21)',['OFF','STBY','LOW','NORM','EMER'],'iffm',()=>sv('iffm',3),v=>{ST.iffm=v;},{col:0x0e0e0e});
  knob(board,bx(880),by(1090),BZ,22*K,'IFF CODE (21)',['A','B','Z','O'],'iffc',()=>sv('iffc',0));
  button(board,bx(740),by(1090),BZ,7*K,'IFF IDENT (21)',0xc83a2a,()=>{});

  /* ---------- left sill panel: 55 emergency gear, 54 configuration, 53 gear lever, 51 FBW limiter, 30 jettison, 31 trim ---------- */
  const LSP=(x,y,z=.003)=>[(x-303)*K,(830-y)*K,z];
  {const fp=new THREE.Group();fp.position.set(-.45,-.665,-.30);fp.rotation.x=-1.05;fp.scale.setScalar(.85);g.add(fp);box(fp,213*K,262*K,.012,dk,0,0,-.007);
    const cv=document.createElement('canvas');cv.width=426;cv.height=524;const c=cv.getContext('2d');c.fillStyle='#272a2d';c.fillRect(0,0,426,524);c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=3;c.strokeRect(3,3,420,518);
    const fl=(s,x,y,sz=12)=>{c.font=`bold ${sz}px Arial`;c.textAlign='center';c.fillStyle='#e8e8e0';s.split('\n').forEach((l,i)=>c.fillText(l,(x-197)*2,(y-700)*2+i*(sz+2)));};
    fl('TRAIN',258,712);fl('SECOURS',322,712,11);fl('CONFIGURATION',370,712,10);fl('LARGAGE\nSECOURS',375,775,10);fl('LIM FBW',320,855,10);fl('COMPENSATEURS',330,920,10);
    // hatched jettison button
    c.save();c.beginPath();c.arc((375-197)*2,(748-700)*2,34,0,7);c.clip();c.fillStyle='#f0c020';c.fillRect(0,0,426,524);c.fillStyle='#111';for(let i=-12;i<12;i++){c.save();c.translate((375-197)*2,(748-700)*2);c.rotate(.7);c.fillRect(i*16,-60,8,120);c.restore();}c.restore();
    const t=new THREE.CanvasTexture(cv);t.anisotropy=4;ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(213*K,262*K),m);pl.userData.cwFx=1;fp.add(pl);
    // 53 landing gear lever (red wheel handle) with transit light
    {const gh=new THREE.Group();gh.position.set(...LSP(258,790));fp.add(gh);box(gh,.008,.008,.04,met,0,0,.02);const wh=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.01,16),LM(0xc83020,40));wh.position.set(0,0,.042);gh.add(wh);
      const lt=new THREE.Mesh(new THREE.SphereGeometry(.005,8,6),new THREE.MeshBasicMaterial({color:0x330a08}));lt.position.set(0,0,.05);gh.add(lt);
      const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.06),hit);hb.position.z=.03;hb.userData.cwFx=1;gh.add(hb);
      reg(gh,hb,'LANDING GEAR LEVER (53)',()=>gearDn()?'DOWN':'UP',()=>{try{uiKey('Digit7');}catch(e){}});
      upd.push(P=>{gh.rotation.x=gearDn()?-.45:.35;const tr=P.gearPos!=null&&P.gearPos>.05&&P.gearPos<.95;lt.material.color.set(tr||lampTest>now()?0xff3020:0x330a08);});}
    // 55 emergency landing gear lever (yellow)
    {const h=new THREE.Group();h.position.set(...LSP(322,745));fp.add(h);box(h,.01,.01,.03,LM(0xd8b820,30),0,0,.015);box(h,.03,.01,.01,LM(0xd8b820,30),0,0,.03);
      const hb=new THREE.Mesh(new THREE.BoxGeometry(.04,.03,.05),hit);hb.position.z=.02;hb.userData.cwFx=1;h.add(hb);
      reg(h,hb,'EMERGENCY LANDING GEAR LEVER (55)',()=>gearDn()?'DOWN':'STOWED',()=>{try{if(!gearDn())uiKey('Digit7');}catch(e){}});upd.push(()=>{h.position.z=LSP(322,745)[2]+(gearDn()?.02:0);});}
    // 54 configuration indicator panel: three gear lights + brake / hook / slats
    [['G',350,785],['D',372,785],['AV',394,785]].forEach(([s,x,y],i)=>{const m=new THREE.MeshBasicMaterial({color:0x103010});const lm=new THREE.Mesh(new THREE.CircleGeometry(.0065,12),m);lm.position.set(...LSP(x,y,.0025));fp.add(lm);upd.push(P=>{m.color.set(lampTest>now()||(gearDn()&&P.gearPos>.9)?0x40ff50:(P.gearPos>.05&&P.gearPos<.95?0xff3020:0x103010));});});
    // 30 emergency jettison (guarded)
    {const[x,y,z]=LSP(375,748,.004);button(fp,x,y,z,.012,'EMERGENCY JETTISON (30) · all stores except Magic',0xd8b820,()=>{try{if(typeof jettison==='function')jettison();else uiKey('KeyJ');}catch(e){}});}
    // 51 FBW limiter switch (orange, guarded)
    {const[x,y,z]=LSP(320,877);toggle(fp,x,y,z,'FBW G-LIMITER (51)',['NORM','OVERRIDE'],()=>sv('gl',0),v=>{ST.gl=v;},{col:0xe8761a,guard:true,guardUp:()=>sv('gl',0)});}
    // 31 trim indicators
    {const mini=(x,y,w,h,draw)=>{const cv2=document.createElement('canvas');cv2.width=Math.round(w*4);cv2.height=Math.round(h*4);const c2=cv2.getContext('2d'),t2=new THREE.CanvasTexture(cv2);ctx.o.tex.push(t2);const m2=new THREE.MeshBasicMaterial({map:t2,toneMapped:false});ctx.o.faces.push(m2);
        const fm=new THREE.Mesh(new THREE.PlaneGeometry(w*K,h*K),m2);fm.position.set(...LSP(x,y,.0025));fp.add(fm);const gt2=gate('m');upd.push(P=>{if(!gt2())return;draw(c2,P,cv2.width,cv2.height);t2.needsUpdate=true;});};
      mini(260,940,60,26,(c2,P,w,h)=>{c2.fillStyle='#111';c2.fillRect(0,0,w,h);c2.strokeStyle=INK;c2.lineWidth=2;c2.beginPath();c2.moveTo(8,h/2);c2.lineTo(w-8,h/2);c2.stroke();for(let i=-3;i<=3;i++){c2.beginPath();c2.moveTo(w/2+i*(w/8),h*.3);c2.lineTo(w/2+i*(w/8),h*.7);c2.stroke();}c2.fillStyle='#ffb21a';const v=clamp(P.ctl?P.ctl.r||0:0,-1,1);c2.fillRect(w/2+v*(w*.4)-3,h*.15,6,h*.7);txt(c2,'ROULIS',w/2,h-4,11,DIM);});
      mini(340,940,60,26,(c2,P,w,h)=>{c2.fillStyle='#111';c2.fillRect(0,0,w,h);c2.strokeStyle=INK;c2.lineWidth=2;c2.beginPath();c2.moveTo(8,h/2);c2.lineTo(w-8,h/2);c2.stroke();for(let i=-3;i<=3;i++){c2.beginPath();c2.moveTo(w/2+i*(w/8),h*.3);c2.lineTo(w/2+i*(w/8),h*.7);c2.stroke();}c2.fillStyle='#ffb21a';const v=clamp(P._trimP||0,-1,1);c2.fillRect(w/2+v*(w*.4)-3,h*.15,6,h*.7);txt(c2,'TANGAGE',w/2,h-4,11,DIM);});}
  }
  // 52 canopy breaking handle, 50 drag chute handle, 56 clock sit on the left rail
  {const ch=new THREE.Group();ch.position.set(-.535,-.54,-.28);g.add(ch);box(ch,.012,.012,.12,LM(0x111111,20),0,0,0);box(ch,.016,.016,.04,LM(0xe8c018,30),0,0,.05);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.04,.14),hit);hb.userData.cwFx=1;ch.add(hb);reg(ch,hb,'CANOPY BREAKING HANDLE (52)',()=>sv('canopyB',0)?'PULLED':'STOWED',()=>{ST.canopyB=1;});}
  {const dc=new THREE.Group();dc.position.set(-.535,-.58,-.1);g.add(dc);box(dc,.02,.02,.05,LM(0x2a2a2a,20),0,0,0);box(dc,.012,.012,.03,LM(0xb02020,30),0,0,.03);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.04,.07),hit);hb.userData.cwFx=1;dc.add(hb);reg(dc,hb,'DRAG CHUTE HANDLE (50)',()=>sv('chute',0)?'DEPLOYED':'STOWED',()=>{ST.chute=sv('chute',0)?0:1;try{uiKey('KeyR');}catch(e){}});upd.push(()=>{dc.position.z=-.1+(sv('chute',0)?.04:0);});}

  /* ---------- right sill panel: 57 O2, 58 power switches, 59 caution / warning advisory panel ---------- */
  {const RSP=(x,y,z=.003)=>[(x-1370)*K,(830-y)*K,z];const fp=new THREE.Group();fp.position.set(.45,-.665,-.30);fp.rotation.x=-1.05;fp.scale.setScalar(.85);g.add(fp);box(fp,215*K,262*K,.012,dk,0,0,-.007);
    const cv=document.createElement('canvas');cv.width=430;cv.height=524;const c=cv.getContext('2d');c.fillStyle='#272a2d';c.fillRect(0,0,430,524);c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=3;c.strokeRect(3,3,424,518);
    const fl=(s,x,y,sz=12)=>{c.font=`bold ${sz}px Arial`;c.textAlign='center';c.fillStyle='#e8e8e0';c.fillText(s,(x-1263)*2,(y-700)*2);};
    fl('OXYGENE',1335,712,11);fl('BATT',1296,785,10);fl('ALT 1',1332,785,10);fl('ALT 2',1368,785,10);fl('TRN',1404,785,10);fl('PANNE / ALARME',1340,858,11);
    const t=new THREE.CanvasTexture(cv);t.anisotropy=4;ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(215*K,262*K),m);pl.userData.cwFx=1;fp.add(pl);
    [['BATT','batt',1296],['ALT 1','alt1',1332],['ALT 2','alt2',1368],['TRN','trn',1404]].forEach(([s,k,x])=>{const[px,py,pz]=RSP(x,812);toggle(fp,px,py,pz,'POWER · '+s+' (58)',['OFF','ON'],()=>{const P=PL();if(k==='batt'&&P&&P.eng&&!P.eng.done)return P.eng.batt?1:0;return sv(k,1);},v=>{const P=PL();if(k==='batt'&&P&&P.eng&&!P.eng.done&&window.START)START.batt();else if(k==='alt1'&&P&&P.eng&&!P.eng.done&&window.START){if((v===1)!==!!P.eng.gen)START.gen();}else ST[k]=v;});});
    // 57 oxygen quantity
    {const S=192,cv2=document.createElement('canvas');cv2.width=cv2.height=S;const c2=cv2.getContext('2d'),t2=new THREE.CanvasTexture(cv2);ctx.o.tex.push(t2);const m2=new THREE.MeshBasicMaterial({map:t2,toneMapped:false});ctx.o.faces.push(m2);
      const fm=new THREE.Mesh(new THREE.CircleGeometry(36*K,32),m2);fm.position.set(...RSP(1335,748,.0025));fm.userData.cwFx=1;fp.add(fm);box(fp,76*K,76*K,.008,bz,...RSP(1335,748,.0015));const gt4=gate('m');upd.push(P=>{if(!gt4())return;face(c2,S);c2.scale(S/256,S/256);F.lox(c2,P);t2.needsUpdate=true;});}
    // 59 advisory lights (amber grid)
    const ADVL=['ALT','FUEL','HUILE','HYD','FEU','CANOP','FREIN','PA','GEN','VRILLE','TRAIN','AF','TIR','INS','IFF','RADAR'];
    ADVL.forEach((s,i)=>{const x=1294+(i%4)*38,y=886+(i/4|0)*20;const lm=lampAt(fp,...RSP(x,y,.0025).slice(0,2),.0025,32*K,15*K,s,'#fb3',P=>{const L=cautions(P);return L.includes(s)||(s==='ALT'&&L.includes('ALTER'))||(s==='FUEL'&&L.includes('CARBU'))||(s==='VRILLE'&&sv('spin',0)===1);},32,15);});}

  /* ---------- consoles ---------- */
  const CY=-.64,CWD=.2,CZ0=-.30,CZ1=.34;
  // strip of a console: side -1 / +1, z0..z1 (fore to aft), u across (0 = outboard)
  function cp(side,z0,z1,title,draw,u0=0,u1=1){const w=CWD*(u1-u0),xo=side*(.43+CWD/2)-side*CWD*((u0+u1)/2),d=z1-z0,cv=document.createElement('canvas');cv.width=Math.max(64,Math.round(w*1500));cv.height=Math.max(48,Math.round(d*1500));const c=cv.getContext('2d');
    c.fillStyle='#2b2f32';c.fillRect(0,0,cv.width,cv.height);c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=3;c.strokeRect(3,3,cv.width-6,cv.height-6);
    c.font='bold 15px Arial';c.textAlign='center';c.fillStyle='#ececE4';if(title)c.fillText(title,cv.width/2,19);if(draw)draw(c,cv.width,cv.height);
    for(const [sx,sy] of[[9,9],[cv.width-9,9],[9,cv.height-9],[cv.width-9,cv.height-9]]){c.fillStyle='rgba(255,255,255,.3)';c.beginPath();c.arc(sx,sy,3.5,0,7);c.fill();}
    const t=new THREE.CanvasTexture(cv);t.anisotropy=4;ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);pl.rotation.x=-Math.PI/2;pl.position.set(xo,CY+.001,(z0+z1)/2);pl.userData.cwFx=1;g.add(pl);
    return{at:(u,v,h=.004)=>[xo-w/2+u*w,CY+h,z0+v*d],lab:(s,u,v,sz=11)=>{c.font=`bold ${sz}px Arial`;c.textAlign='center';c.fillStyle='#e0e0d8';s.split('\n').forEach((l,i)=>c.fillText(l,u*cv.width,v*cv.height+i*(sz+2)));t.needsUpdate=true;}};}
  const tg=(p,u,v,name,pos,get,set,o={})=>{const[x,y,z]=p.at(u,v);return toggle(g,x,y,z,name,pos,get,set,Object.assign({rx:-Math.PI/2},o));};
  const kn=(p,u,v,r,name,pos,key,get,set,o={})=>{const[x,y,z]=p.at(u,v,.006);return knob(g,x,y,z,r,name,pos,key,get,set,Object.assign({rx:-Math.PI/2},o));};
  const bt=(p,u,v,r,name,col,act)=>{const[x,y,z]=p.at(u,v,.004);return button(g,x,y,z,r,name,col,act);};
  const stGet=k=>()=>sv(k,0),stSet=k=>v=>{ST[k]=v;};
  const zz=(a,b)=>[CZ0+(CZ1-CZ0)*a,CZ0+(CZ1-CZ0)*b];
  // bodies, sills, tub
  box(g,.18,.34,.22,dk,0,-1.3,-.40);
  [-1,1].forEach(sd=>{box(g,.22,.1,.98,LM(0x2a2d30,8),sd*.43,CY-.052,-.15);box(g,.05,.1,1.3,LM(0x25282a,8),sd*.555,-.55,-.2);});
  {const sk=LM(0x1c1f21,6);box(g,1.14,.02,1.5,sk,0,-1.5,-.1);[-1,1].forEach(sd=>box(g,.03,.9,1.3,sk,sd*.565,-1.05,-.2));{const ws=new THREE.Shape();[[-.57,-1.5],[-.57,-.58],[-.32,-.27],[.32,-.27],[.57,-.58],[.57,-1.5]].forEach(([x,y],i)=>i?ws.lineTo(x,y):ws.moveTo(x,y));const wm=new THREE.Mesh(new THREE.ExtrudeGeometry(ws,{depth:.02,bevelEnabled:false}),sk);wm.position.z=-.82;g.add(wm);}}

  // ======== LEFT CONSOLE ========
  // 32 communications radios
  {const [a,b]=zz(0,.1);const p=cp(-1,a,b,'COMMUNICATIONS (32)');kn(p,.3,.6,.011,'MAIN RADIO MODE (32)',['OFF','ON','GUARD','MANUAL','PRESET'],'umode',()=>sv('umode',1));kn(p,.7,.6,.01,'PRESET CHANNEL (32)',Array.from({length:20},(_,i)=>String(i+1)),'uhfCh',()=>sv('uhfCh',7)-1,v=>{ST.uhfCh=v+1;});}
  // 49 exterior lights, 33 anti-skid
  {const [a,b]=zz(.1,.2);const p=cp(-1,a,b,'EXTERIOR LIGHTS (49)');tg(p,.2,.55,'LANDING LIGHTS (49)',['OFF','LAND','TAXI'],()=>sv('ldgl',0),v=>{ST.ldgl=v;});tg(p,.4,.55,'NAVIGATION LIGHTS (49)',['OFF','DIM','BRIGHT'],()=>sv('navl',1),v=>{ST.navl=v;});tg(p,.6,.55,'ANTI-COLLISION (49)',['OFF','DIM','BRIGHT'],()=>sv('acol',1),v=>{ST.acol=v;});tg(p,.8,.55,'FORMATION (49)',['OFF','DIM','BRIGHT'],()=>sv('frml',0),v=>{ST.frml=v;});}
  {const [a,b]=zz(.2,.27);const p=cp(-1,a,b,'ANTI-SKID (33)');tg(p,.3,.6,'ANTI-SKID (33)',['OFF','ON'],()=>sv('askid',1),v=>{ST.askid=v;});tg(p,.7,.6,'AIR REFUEL (33)',['OFF','ON'],()=>sv('arf',0),v=>{ST.arf=v;});}
  // 48 flight controls
  {const [a,b]=zz(.27,.4);const p=cp(-1,a,b,'FLIGHT CONTROLS (48)');tg(p,.15,.5,'SLATS (48)',['AUTO','RETRACT','EXTEND'],()=>sv('slats',0),v=>{ST.slats=v;window.STRUCT&&STRUCT.slatMode(v,true);});tg(p,.38,.5,'FBW GAIN (48)',['NORM','EMER'],()=>sv('gain',0),v=>{ST.gain=v;},{guard:true,guardUp:()=>sv('gain',0)});tg(p,.62,.5,'G-LIMITER (48)',['OFF','ON'],()=>sv('glim',1),v=>{ST.glim=v;});tg(p,.85,.5,'BECS (48)',['AUTO','MAN'],()=>sv('becs',0),v=>{ST.becs=v;});}
  // 34 radar control panel: wired to the game radar
  {const [a,b]=zz(.4,.56);const p=cp(-1,a,b,'COMMANDE RADAR (34)');
    kn(p,.2,.4,.013,'RADAR OPERATION (34)',['OFF','WARM UP','STBY','ON'],'rop',()=>{try{return radar.power==='OFF'?0:(radar.warm||0)>.5&&radar.power!=='ON'?1:2+(sv('rstby',0)?0:1);}catch(e){return 3;}},v=>{try{if(v===0){radar.power='OFF';radar.warm=0;ST.rstby=0;}else{radar.power='ON';radar.warm=Math.max(radar.warm||0,3);ST.rstby=v===2?1:0;}}catch(e){}});
    kn(p,.5,.4,.011,'RADAR RANGE (34)',['10','20','40','80','160','320'],'rrg',()=>{try{return radar.ri;}catch(e){return 2;}},v=>{try{radar.ri=v%radar.ranges.length;}catch(e){}});
    kn(p,.8,.4,.011,'PRF SELECTOR (34)',['HFR','ENT','BFR'],'rprf',()=>{try{return radar.prf==='A'?0:radar.prf==='B'?2:1;}catch(e){return 1;}},v=>{try{radar.prf=['A','AUTO','B'][v];}catch(e){}});
    kn(p,.2,.75,.01,'AZIMUTH (34)',['WIDE','MIDDLE','NARROW'],'raz',()=>{try{return radar.ai;}catch(e){return 0;}},v=>{try{radar.ai=v;}catch(e){}});
    kn(p,.5,.75,.01,'BARS (34)',['4','2','1'],'rbar',()=>{try{return radar.bi;}catch(e){return 0;}},v=>{try{radar.bi=v;}catch(e){}});
    tg(p,.8,.75,'DISPLAY MODE (34)',['PPI','B-SCOPE'],()=>sv('rdisp',0),v=>{ST.rdisp=v;});}
  // 35 throttle quadrant, 47 emergency throttle, 46 mid-air startup
  {const [a,b]=zz(.56,.86);const thq=cp(-1,a,b,'',(c,w,h)=>{c.fillStyle='#111';c.fillRect(w*.38,h*.1,w*.16,h*.82);c.font='bold 12px Arial';c.fillStyle='#ddd';c.textAlign='left';
      [['STOP',.92],['RALENTI',.76],['PLEIN GAZ',.28],['PC',.12]].forEach(([s,v])=>c.fillText(s,w*.57,h*v));c.textAlign='center';c.fillText('ARRET',w*.17,h*.12);c.fillText('MOTEUR',w*.17,h*.12+13);c.fillText('SECOURS',w*.84,h*.5);});
    const tq=new THREE.Group();g.add(tq);const[x0,y0]=thq.at(.46,0);tq.position.set(x0,y0,(a+b)/2);
    const arm=new THREE.Group();tq.add(arm);box(arm,.01,.11,.012,met,0,.055,0);const grip=new THREE.Group();grip.position.y=.11;arm.add(grip);
    box(grip,.034,.05,.065,LM(0x1c1c1c,25),-.006,0,0);box(grip,.012,.012,.012,LM(0xb02020,30),-.022,.018,-.014);box(grip,.01,.016,.01,LM(0x777777,30),-.024,-.008,.012);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.06,.07,.08),hit);hb.userData.cwFx=1;grip.add(hb);
    reg(grip,hb,'THROTTLE (35)',()=>{const P=PL();if(P&&P.eng&&!P.eng.done)return P.eng.e[0].fuel?'IDLE':'STOP';return Math.round((P?P.thr:0)*100)+'%';},()=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.thr();});
    upd.push(P=>{let q;if(P.eng&&!P.eng.done&&!P.eng.e[0].fuel)q=.5;else q=.32-(P.thr||0)*.8;arm.rotation.x=q;});
    const sbh=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,.02),hit);sbh.position.set(-.024,-.008,.012);sbh.userData.cwFx=1;grip.add(sbh);
    reg(grip,sbh,'AIR BRAKE (throttle grip)',()=>keys.has('KeyB')?'OUT':'IN',()=>{if(keys.has('KeyB'))keys.delete('KeyB');else keys.add('KeyB');});
    tg(thq,.17,.36,'THROTTLE IDLE STOP / FUEL (35)',['OFF','ON'],()=>{const P=PL();return P&&P.eng&&!P.eng.done?(P.eng.fm?1:0):sv('fmaster',1);},v=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.fm();else ST.fmaster=v;},{guard:true,guardUp:()=>true});
    tg(thq,.84,.7,'EMERGENCY THROTTLE (47)',['NORM','EMER'],()=>sv('ethr',0),v=>{ST.ethr=v;},{guard:true,guardUp:()=>sv('ethr',0)});
    tg(thq,.84,.2,'MID-AIR STARTUP (46)',['OFF','START'],()=>0,()=>{try{START.src();}catch(e){}});
    tg(thq,.17,.82,'AFTERBURNER CUTOFF (43)',['AUTO','CUTOFF'],()=>sv('abc',0),v=>{ST.abc=v;});}
  // 36 audio, 37 trim, 45 tape recorder, 44 ground emission, 38-42 misc
  {const [a,b]=zz(.86,1);const p=cp(-1,a,b,'AUDIO · TRIM · SECOURS');
    kn(p,.15,.3,.008,'AUDIO VOLUME (36)',['1','2','3','4','5'],'avol',()=>sv('avol',3));tg(p,.4,.3,'TRIM RESET (37)',['NORM','RESET'],()=>0,()=>{try{const P=PL();if(P)P._trimP=0;}catch(e){}});tg(p,.62,.3,'TAPE RECORDER (45)',['OFF','ON'],stGet('tape'),stSet('tape'));
    tg(p,.85,.3,'RADAR GND EMISSION (44)',['INHIB','AUTH'],()=>sv('gemit',1),v=>{ST.gemit=v;},{guard:true,guardUp:()=>sv('gemit',1)});
    tg(p,.15,.7,'EMERGENCY OIL PUMP (38)',['OFF','ON'],stGet('eop'),stSet('eop'));tg(p,.38,.7,'EMERGENCY COMPUTER (39)',['NORM','EMER'],stGet('ecomp'),stSet('ecomp'));
    tg(p,.6,.7,'FUEL DUMP (40)',['OFF','DUMP'],()=>sv('dump',0),v=>{ST.dump=v;},{guard:true,guardUp:()=>sv('dump',0)});tg(p,.85,.7,'FBW / AUTOPILOT TEST (41)',['OFF','TEST'],()=>0,()=>{lampTest=now()+3;},{guard:true,guardUp:()=>false});}

  // ======== RIGHT CONSOLE ========
  // 75 INS panel: display + keypad, 74 radar IFF, 73 EW panel, 72 VOR/ILS, 71 INS PSM/MIP, 67 env, 66 emerg horizon, 65 TACAN, 64 pitot, 63 audio alert, 62 emergency hyd, 70 lights, 69 engine start, 68 breakers
  {const [a,b]=zz(0,.16);const p=cp(1,a,b,'PCN · INS (75)',(c,w,h)=>{c.fillStyle='#000';c.fillRect(w*.08,h*.2,w*.84,h*.22);c.fillStyle='#4e4';c.font='bold 18px monospace';c.textAlign='left';c.fillText('N 00°00.0   E 000°00.0',w*.1,h*.33);
      c.fillStyle='#e0e0d8';c.font='bold 11px Arial';c.textAlign='center';['PREP','DEST','BUT','MRQ','ENT','CLR'].forEach((s,i)=>c.fillText(s,w*(.15+i*.14),h*.52));});
    for(let i=0;i<10;i++)bt(p,.14+(i%5)*.18,.68+(i/5|0)*.16,.006,'INS KEY '+((i+1)%10),0x1e1e1e,()=>{});}
  {const [a,b]=zz(.16,.24);const p=cp(1,a,b,'RADAR IFF (74)');tg(p,.25,.55,'IFF POWER (74)',['OFF','ON'],()=>sv('iffp',1),v=>{ST.iffp=v;});kn(p,.65,.55,.009,'IFF MODE (74)',['A','B','C'],'iffk');}
  {const [a,b]=zz(.24,.36);const p=cp(1,a,b,'EW PANEL (73)');tg(p,.15,.55,'RWR (73)',['OFF','ON'],()=>sv('rwr',1),v=>{ST.rwr=v;});tg(p,.38,.55,'JAMMER (73)',['OFF','ON'],stGet('jam'),stSet('jam'));tg(p,.62,.55,'MISSILE DETECTOR (73)',['OFF','ON'],()=>sv('mdet',1),v=>{ST.mdet=v;});kn(p,.85,.55,.009,'CHAFF / FLARES (73)',['OFF','CHAFF','FLARE','BOTH'],'cmd',()=>sv('cmd',3));}
  {const [a,b]=zz(.36,.45);const p=cp(1,a,b,'VOR / ILS (72)');kn(p,.3,.6,.009,'VOR/ILS CHANNEL (72)',['108.10','108.30','109.50','110.30','111.10'],'ils');tg(p,.75,.6,'VOR/ILS POWER (72)',['OFF','ON'],()=>sv('ilsp',0),v=>{ST.ilsp=v;});}
  {const [a,b]=zz(.45,.54);const p=cp(1,a,b,'INS PSM / MIP (71)');kn(p,.3,.6,.009,'INS MODE (71)',['OFF','STBY','ALIGN','NAV','TEST'],'ins',()=>sv('ins',3));tg(p,.75,.6,'MIP (71)',['OFF','ON'],()=>sv('mip',1),v=>{ST.mip=v;});}
  {const [a,b]=zz(.54,.64);const p=cp(1,a,b,'CONDITIONNEMENT (67) · HORIZON (66)');kn(p,.25,.6,.009,'TEMPERATURE (67)',['COLD','','','','HOT'],'ctemp',()=>sv('ctemp',2));tg(p,.55,.6,'AIR SOURCE (67)',['AUTO','RAM'],()=>sv('acm',0),v=>{ST.acm=v;});tg(p,.82,.6,'EMERGENCY HORIZON (66)',['OFF','ON'],stGet('eh'),stSet('eh'));}
  {const [a,b]=zz(.64,.73);const p=cp(1,a,b,'TACAN (65)');kn(p,.2,.6,.009,'TACAN CHANNEL ×10 (65)',Array.from({length:13},(_,i)=>String(i*10)),'tch10',()=>sv('tch10',3));kn(p,.45,.6,.009,'TACAN UNITS (65)',['0','1','2','3','4','5','6','7','8','9'],'tch1',()=>sv('tch1',4));kn(p,.75,.6,.009,'TACAN MODE (65)',['OFF','REC','T/R','A/A'],'tfn',()=>sv('tfn',2));}
  {const [a,b]=zz(.73,.8);const p=cp(1,a,b,'(62-64)');tg(p,.2,.55,'EMERGENCY HYDRAULIC PUMP (62)',['OFF','ON','AUTO'],()=>sv('ehp',2),v=>{ST.ehp=v;});tg(p,.5,.55,'AUDIO ALERT (63)',['OFF','ON'],()=>sv('aal',1),v=>{ST.aal=v;});tg(p,.8,.55,'PITOT ANTI-ICE (64)',['OFF','AUTO','ON'],()=>sv('pit',1),v=>{ST.pit=v;});}
  {const [a,b]=zz(.8,.9);const p=cp(1,a,b,'ECLAIRAGE (70)');kn(p,.2,.6,.01,'CONSOLE LIGHTS (70)',['OFF','DIM','BRT'],'conl');kn(p,.5,.6,.01,'INSTRUMENT LIGHTS (70)',['OFF','DIM','BRT'],'insl');kn(p,.8,.6,.01,'FLOOD (70)',['OFF','DIM','BRT'],'fld');}
  {const [a,b]=zz(.9,1);const p=cp(1,a,b,'DEMARRAGE (69)');
    tg(p,.15,.5,'LEFT FUEL BOOST PUMP (69)',['OFF','ON'],()=>sv('bpl',1),v=>{ST.bpl=v;});tg(p,.33,.5,'RIGHT FUEL BOOST PUMP (69)',['OFF','ON'],()=>sv('bpr',1),v=>{ST.bpr=v;});
    tg(p,.52,.5,'FUEL EMERGENCY CUTOFF (69)',['CUTOFF','NORM'],()=>{const P=PL();return P&&P.eng&&!P.eng.done?(P.eng.fm?1:0):sv('fmaster',1);},v=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.fm();else ST.fmaster=v;},{guard:true,guardUp:()=>true});
    tg(p,.7,.5,'IGNITION (69)',['OFF','AUTO','ON'],()=>sv('ign',1),v=>{ST.ign=v;});bt(p,.9,.5,.009,'START BUTTON (69) · engine start',0x222222,()=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.src();});}
  {const p=cp(1,CZ1-.02,CZ1+.1,'DISJONCTEURS (68)',(c,w,h)=>{c.fillStyle='#111';for(let i=0;i<24;i++)c.fillRect(10+(i%12)*(w-20)/12,26+(i/12|0)*(h-36)/2,(w-20)/12-5,(h-36)/2-6);});}

  // stick: Mirage grip — trigger, bomb / missile button, trim hat, pickle, nose wheel steering
  const stkG=new THREE.Group(),thrG=new THREE.Group();g.add(stkG);g.add(thrG);thrG.visible=false;
  box(stkG,.026,.34,.026,LM(0x1a1a1a,30),0,.17,0);box(stkG,.04,.11,.046,LM(0x2a2a2a,20),0,.39,-.004,-.25);box(stkG,.014,.016,.014,LM(0x777777,30),0,.455,.004);box(stkG,.012,.022,.012,LM(0xb02020,30),-.018,.43,0);box(stkG,.006,.03,.022,LM(0x888888,30),0,.37,-.03);
  let tt=0;
  return{stkG,thrG,ctls,upd:(P)=>{if(!P)return;stkG.position.set(0,-1.3,-.40);{const c=P.ctl||{};stkG.quaternion.setFromEuler(new THREE.Euler(-(c.p||0)*.3,0,-(c.r||0)*.3));}if(!cautions(P).length&&!(fireTest>now()))mcAck=false;for(const l of lamps)l(P);const tn=now();if(tn-tt<.066)return;tt=tn;
        {const E=P.eng&&!P.eng.done?P.eng.e[0]:null;let h=0;try{h=q(P.pos.y-groundAt(P.pos.x,P.pos.z),.66);}catch(e){}let b=0;try{b=q(brgField(P),2)+q(distField(P),4);}catch(e){}
     FK=[q(P.bank,229),q(P.pitch,229),q(P.hdg,2),q(P.cas,1),q(P.mach,100),q(P.alpha,229),q(P.pos.y,.66),q(P.vel?P.vel.y:0,.1),q(P.nz,20),q(P.maxNz,5),q(P.beta,115),h,b,P.gearPos>.5?1:0,STV].join();
     SK=[q(P.n,50),q(P.thr,50),q(P.totalFuel,.2),q(P.gearPos,20),q(P.flapPos!=null?P.flapPos:P.flapCmd,20),q(P.sb,20),Math.floor(now()),lampTest>now()?1:0,STV,E?q(E.rpm,2)+'/'+q(E.egt,40)+(E.lit?1:0):'',(P.fire||0)>0?1:0,q(P._trimP,20),q(P.ctl?P.ctl.r:0,20),(typeof cautions==='function'?cautions(P).join('.'):''),P.hook?1:0,P.onGnd?1:0].join();}
    for(let i=0;i<upd.length;i++){try{upd[i](P);}catch(e){}}
    P._trimP=(P._trimP||0)*.97+(P.ctl?P.ctl.p:0)*.03;}};}

PIT[ID].custom=build;
window.M2KPIT={sv:k=>ST[k],set:(k,v)=>{ST[k]=v;}};
console.info('[m2kpit] Mirage 2000C instrument panel map cockpit active');
})();
