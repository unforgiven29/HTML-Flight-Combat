/* =====================================================================================================================
   v241 — A-7D Corsair II cockpit, 1:1 after T.O. 1A-7D-1 (USAF flight manual, 20 Sep 1972 / change 1).
   * Instrument panel: figure 1-3 (instrument panel, typical). Every item 1-41 is placed at its position traced from the figure
     (board coordinates in figure pixels, ~0.85 mm each): LAND / TAKE-OFF check lists on the side tabs, ARMT select panel,
     armament advisory lights, flap / LE flap / gear position, APQ-126 forward looking radar, standby attitude, speed brake,
     APR-36 threat display, Mach-airspeed, AOA, clock, attack master function switches, MASTER CAUTION, MKR BCN / LOW ALT,
     ADI, HSI, ARMAMENT RELEASE pedestal, UHF remote, radar altimeter, barometric altimeter, VVI, accelerometer, HDG MODE,
     TF / LDG, fuel quantity, turbine outlet pressure / temperature, fuel flow, tachometer, FIRE light and test, oil pressure /
     quantity, hydraulic pressure, FUEL TANK QTY switch, LOX, cockpit altitude, true airspeed.
   * Left console: figure 1-7 (items 1-16). Right console: figure 1-5 (items 1-18).
   * Functions: gear, flaps, emergency power, generator / external power / fuel master (cold start), throttle (OFF ⇄ IDLE on a cold
     start, follows the power lever), speed brake, master arm, station select, attack mode, radar power / range, UHF channel,
     arresting hook, wingfold (on the ground), fire test, lamp test, fuel tank quantity selector, master caution reset.
   Needs game.js, cwpit.js, cw-systems.js, startup.js.
   ===================================================================================================================== */
(function(){
'use strict';
const PIT=window.CW_PIT;if(!PIT||!PIT['A-7D']){console.warn('[a7pit] cwpit missing');return;}
const ID='A-7D',K=.00098,OX=625,OY=270;
const PL=()=>typeof player!=='undefined'?player:null;
const bx=x=>(x-OX)*K,by=y=>(OY-y)*K;
const now=()=>performance.now()/1000;
const ST={};
const sv=(k,d)=>ST[k]===undefined?d:ST[k];
let lampTest=0,fireTest=0,mcAck=false;
const isMine=P=>P&&P.type===ID;

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
 oilp:(c,P)=>{const p=running(P)?(rpm(P)<70?20+rpm(P)*.25:38+(P.n||0)*10):0;scale(c,R,-130,130,10,2,[0,20,40,60,80,100],.64,18);arc(c,R*.9,-130+260*.4,-130+260*.55,'#3c3');T(c,'OIL',0,R*.36,14,DIM);T(c,'PSI',0,R*.52,12,DIM);needle(c,R,-130+260*p/100);},
 oilq:(c,P)=>{c.fillStyle='#262624';c.beginPath();c.arc(0,0,R*.98,0,7);c.fill();scale(c,R,-90,90,8,2,['E','1/4','1/2','3/4','F'],.62,15);T(c,'OIL QTY',0,R*.36,14,DIM);needle(c,R,-90+180*(sv('oilq',.82)));},
 // 36 · hydraulic pressure, PC-1 / PC-2 pointers
 hyd:(c,P)=>{const p=k=>running(P)?(rpm(P)>40?.75+.008*Math.sin(now()*2+k):rpm(P)/53):0;scale(c,R,-140,140,8,2,[0,1,2,3,4],.62,20);T(c,'HYD PRESS',0,R*.36,12,DIM);T(c,'PSI × 1000',0,R*.52,10,DIM);
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
   else if(kind==='le'){const dn=(P.flapPos||P.flapCmd||0)>.1||(P.alpha||0)*R2D>9;T(c,dn?'DN':'UP',S/2,S/2,S*.38,'#fff');}
   else if(kind==='ptrim'||kind==='rtrim'){c.strokeStyle=INK;c.lineWidth=2;const v=kind==='ptrim'?clamp(P._trimP||0,-1,1):clamp(P.ctl?P.ctl.r||0:0,-1,1);
     if(kind==='ptrim'){for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(S*.35,S/2+i*S*.1);c.lineTo(S*.6,S/2+i*S*.1);c.stroke();}c.fillStyle='#ffb21a';c.beginPath();c.moveTo(S*.65,S/2-v*S*.4);c.lineTo(S*.9,S/2-v*S*.4-10);c.lineTo(S*.9,S/2-v*S*.4+10);c.fill();T(c,'NOSE',S*.17,S*.12,S*.11,DIM);T(c,'DN',S*.17,S*.88,S*.12,DIM);}
     else{for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(S/2+i*S*.1,S*.35);c.lineTo(S/2+i*S*.1,S*.6);c.stroke();}c.fillStyle='#ffb21a';c.beginPath();c.moveTo(S/2+v*S*.4,S*.65);c.lineTo(S/2+v*S*.4-10,S*.9);c.lineTo(S/2+v*S*.4+10,S*.9);c.fill();T(c,'L   ROLL   R',S/2,S*.15,S*.1,DIM);}}}};
function brgField(P){try{return(Math.atan2(AF.x-P.pos.x,-(AF.z-P.pos.z))*R2D+360)%360;}catch(e){return 0;}}
function distField(P){try{return Math.hypot(AF.x-P.pos.x,AF.z-P.pos.z)/1852;}catch(e){return 999;}}

// figure 1-3 positions  [key, x, y, case half-size, face, round]
const INST=[
 ['masi',478,258,44,F.masi],['aoa',478,355,36,F.aoa],['clk',478,428,30,F.clk],
 ['adi',617,292,80,F.adi],['hsi',617,462,70,F.hsi],
 ['ralt',765,130,50,F.ralt],['alt',752,258,46,F.alt],['vvi',752,350,38,F.vvi],['acc',752,430,38,F.acc],
 ['rpm',897,165,32,F.rpm],['tot',872,242,32,F.tot],['oilp',950,236,32,F.oilp],['ff',872,310,32,F.ff],['oilq',950,310,32,F.oilq],['top',872,380,32,F.top],['hyd',950,380,32,F.hyd],
 ['fuel',852,472,52,F.fuel],['tas',1042,350,30,F.tas],['cab',1045,416,32,F.cab],['lox',1045,488,32,F.lox],
 ['sby',357,140,40,F.sby],['sbk',468,40,22,F.sbk],['flap',185,363,26,F.flap]];
const SQ=[['uhf',790,28,34,F.uhf],['ftq',965,483,52,F.ftq],
 ['lg1',186,300,12,F.small('gear')],['lg2',170,322,12,F.small('gear')],['lg3',202,322,12,F.small('gear')],['le',160,345,10,F.small('le')]];
// lamps [key, x, y, w, h, legend, colour, lit(P)]
const LAMPS=[
 ['mc',564,200,52,26,'MASTER\nCAUTION','#fb3',P=>cautions(P).length>0&&!mcAck],
 ['mkr',614,200,30,22,'MKR\nBCN','#4cf',P=>{const d=distField(P);return d>4&&d<4.6||d>.5&&d<.7;}],
 ['lalt',648,200,30,22,'LOW\nALT','#f42',P=>powered(P)&&(P.pos.y-groundAt(P.pos.x,P.pos.z))*3.2808<sv('lowAlt',500)&&!P.onGnd],
 ['fire',877,100,46,20,'FIRE','#f42',P=>(P.fire||0)>0||fireTest>now()],
 ['tf',768,494,24,22,'TF','#eee',P=>sv('tf',0)],['ldg',768,520,24,22,'LDG','#eee',P=>gearDn()&&sv('ldg',1)]];
// 3 · armament advisory lights: stations 1-8 (station 4 = gun on the A-7D panel figure)
const ADV=['1','2','3','4','5','6','7','8'];

// caution list (right console, item 18) — the lights the manual's caution panel carries that the sim can drive
function cautions(P){const L=[];if(!running(P))L.push('ENG');if(fuelLb(P)<2000)L.push('FUEL LOW');if(running(P)&&rpm(P)<45)L.push('OIL PRESS');
  if(!(P.eng&&!P.eng.done?P.eng.gen:running(P)))L.push('GEN OUT');if(!running(P)||rpm(P)<40)L.push('HYD PRESS');if(P.dm&&P.dm.hyd!=null&&P.dm.hyd<.5)L.push('PC-1');
  if(sv('canopy',0))L.push('CANOPY');if((P.sb||0)>.05&&gearDn())L.push('SPD BRK');if(P.hook)L.push('HOOK');if(sv('afcs',1)===0)L.push('AFCS');return L;}

/* ---------------- build ---------------- */
function build(ctx){const{g,box,LM,liveTex}=ctx;const ctls=[],upd=[],lamps=[];
  const hit=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  const PC=0x3a3e41,pm=LM(PC,12),dk=LM(0x1b1d1f,8),blk=LM(0x0b0c0d,4),bz=LM(0x141618,40),met=LM(0x9aa0a4,60);
  const board=new THREE.Group();board.position.set(0,-.565,-.74);board.rotation.x=-.18;g.add(board);
  // ---- outline traced from figure 1-3: two lobes either side of the HUD well, ARMT and check-list tabs, ARMAMENT RELEASE pedestal ----
  const OUT=[[150,445],[150,300],[180,235],[235,165],[320,98],[452,10],[532,8],[532,183],[702,183],[702,8],[828,4],[900,60],[970,150],[1040,280],[1100,445],[1100,540],
    [700,540],[700,642],[545,642],[545,540],[150,540]];
  const sh=new THREE.Shape();OUT.forEach(([x,y],i)=>i?sh.lineTo(bx(x),by(y)):sh.moveTo(bx(x),by(y)));
  const X0=140,Y0=0,W0=970,H0=650,bg=document.createElement('canvas');bg.width=1552;bg.height=1040;const SX=bg.width/W0,SY=bg.height/H0,fx=x=>(x-X0)*SX,fy=y=>(y-Y0)*SY;
  {const c=bg.getContext('2d');c.fillStyle='#3a3e41';c.fillRect(0,0,bg.width,bg.height);
    c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=3;[[230,200,230,445],[430,200,430,540],[532,183,532,540],[702,183,702,540],[810,60,810,540],[1010,220,1010,540],[150,440,1100,440]].forEach(([a,b,c2,d])=>{c.beginPath();c.moveTo(fx(a),fy(b));c.lineTo(fx(c2),fy(d));c.stroke();});
    const lab=(s,x,y,sz=11,al='center')=>{c.font=`bold ${sz*SX}px Arial`;c.textAlign=al;c.textBaseline='middle';c.fillStyle='#e9e9e2';s.split('\n').forEach((l,i,a)=>c.fillText(l,fx(x),fy(y)+(i-(a.length-1)/2)*(sz+2)*SY));};
    // armament panel (2) legends
    c.fillStyle='#1b1c1e';c.fillRect(fx(150),fy(443),290*SX,95*SY);lab('—— LH ——————  ARMT  —————— RH ——',295,452,7);
    ADV.forEach((s,i)=>lab(s,170+i*36,464,7));lab('GUN\nRATE',172,503,5.5);lab('GUN\nARM',208,503,5.5);lab('FUZE',265,498,6);lab('NOSE  TAIL',265,533,5);lab('RIPL\nSGL',322,503,5.5);lab('REL QTY',378,497,5.5);lab('MASTER\nARM',414,500,5.5);
    lab('L G POS',186,286,6);lab('LE\nFLAPS',140+33,355,5);lab('FLAPS',185,393,5);
    lab('STBY TIME',282,212,5.5);lab('FAIL',338,212,6);lab('SCALE',392,212,5.5);lab('BRIGHT',272,382,5.5);lab('CONTRAST',392,382,5.5);lab('APQ-126',330,377,6);
    lab('HDG\nMODE',722,494,5.5);lab('SLAVED\nDG',722,532,4.5);lab('FIRE\nTEST',836,48,5);lab('APR-36',452,92,5.5);
    // checklist tabs (1, 41) are drawn on their own meshes
    c.fillStyle='rgba(255,255,255,.22)';for(const [x,y] of[[160,455],[160,530],[1090,455],[1090,530],[555,632],[690,632],[540,192],[694,192],[460,20],[820,14]]){c.beginPath();c.arc(fx(x),fy(y),5,0,7);c.fill();}}
  const bgT=new THREE.CanvasTexture(bg);bgT.anisotropy=8;ctx.o.tex.push(bgT);
  const geo=new THREE.ShapeGeometry(sh);{const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i)/K+OX,y=OY-p.getY(i)/K;uv.setXY(i,(x-X0)/W0,1-(y-Y0)/H0);}uv.needsUpdate=true;}
  const faceM=new THREE.MeshBasicMaterial({map:bgT,toneMapped:false});ctx.o.faces.push(faceM);const bm=new THREE.Mesh(geo,faceM);bm.userData.cwFx=1;board.add(bm);
  {const eg=new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false});const e=new THREE.Mesh(eg,pm);e.position.z=-.031;e.userData.cwFx=1;board.add(e);}
  // glareshield coaming over both lobes, open in the HUD well
  // LAND (1) and TAKE OFF (41) check lists: black tabs either side
  const tab=(pts,lines,name,x0)=>{const s=new THREE.Shape();pts.forEach(([x,y],i)=>i?s.lineTo(bx(x),by(y)):s.moveTo(bx(x),by(y)));const cv=document.createElement('canvas');cv.width=160;cv.height=200;const c=cv.getContext('2d');c.fillStyle='#17191a';c.fillRect(0,0,160,200);
    c.fillStyle='#e8e8e0';c.textAlign='left';lines.forEach((l,i)=>{c.font=`bold ${i?14:20}px Arial`;c.fillText(l,12,28+i*(i?17:22));});const t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);
    const gg=new THREE.ShapeGeometry(s),p=gg.attributes.position,uv=gg.attributes.uv,xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),xa=Math.min(...xs),xb=Math.max(...xs),ya=Math.min(...ys),yb=Math.max(...ys);
    for(let i=0;i<p.count;i++){const x=p.getX(i)/K+OX,y=OY-p.getY(i)/K;uv.setXY(i,(x-xa)/(xb-xa),1-(y-ya)/(yb-ya));}
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const ms=new THREE.Mesh(gg,m);ms.position.z=.001;ms.userData.cwFx=1;board.add(ms);
    const hb=new THREE.Mesh(new THREE.BoxGeometry((xb-xa)*K,(yb-ya)*K,.01),hit);hb.position.set(bx((xa+xb)/2),by((ya+yb)/2),.005);hb.userData.cwFx=1;board.add(hb);reg(board,hb,name,()=>'CHECK LIST',()=>{});};
  tab([[70,452],[150,445],[150,545],[62,548]],['LAND','1 ARMAMENT','2 HARNESS','3 WHEELS','4 FLAPS','','RADIO CALL','67-14582'],'LAND CHECK LIST (1)');
  tab([[1100,445],[1172,450],[1186,545],[1100,545]],['TAKE-OFF','1 FLAPS','2 STAB','3 HARNESS','4 TRIM','5 CANOPY','6 FUEL','7 WINGFOLD','8 SEAT','9 COMPASS'],'TAKE OFF CHECK LIST (41)');
  // forward looking radar (7): square bezel, round CRT showing the radar picture, four corner knobs, six-button column
  box(board,192*K,180*K,.03,dk,bx(331),by(295),.012);
  {const scC=typeof phScopeC!=='undefined'?phScopeC:null;if(scC){const m=new THREE.MeshBasicMaterial({map:liveTex(ctx.kind,scC),toneMapped:false});ctx.o.faces.push(m);const sc=new THREE.Mesh(new THREE.CircleGeometry(74*K,48),m);sc.position.set(bx(330),by(295),.0285);sc.userData.screen='phscope';board.add(sc);}}
  // APR-36 (10): the jet's RWR picture
  box(board,100*K,92*K,.03,dk,bx(452),by(138),.012);
  try{if(typeof rwrC!=='undefined'){const m=new THREE.MeshBasicMaterial({map:liveTex(ctx.kind,rwrC),toneMapped:false});ctx.o.faces.push(m);const rw=new THREE.Mesh(new THREE.CircleGeometry(40*K,40),m);rw.position.set(bx(452),by(138),.0285);board.add(rw);}}catch(e){}
  // HUD well floor: AVQ-7 control box between the lobes
  box(board,(702-532)*K,.012,.08,LM(0x161718,10),bx(617),by(183)-.006,.04);
  // HUD control panel (figure 1-107) on the well floor: SCALES, TF clearance, brightness
  {const hp=new THREE.Group();hp.position.set(bx(617),by(183)+.0,.075);hp.rotation.x=-1.25;board.add(hp);box(hp,(702-536)*K,.05,.006,dk,0,0,-.004);
    const cv=document.createElement('canvas');cv.width=320;cv.height=96;const c=cv.getContext('2d');c.fillStyle='#1b1c1e';c.fillRect(0,0,320,96);c.font='bold 13px Arial';c.fillStyle='#e8e8e0';c.textAlign='center';
    [['SCALES',50,14],['TF CLR',130,14],['BRT',210,14],['AVQ-7 HUD',270,84]].forEach(([t,x,y])=>c.fillText(t,x,y));['OFF','ON'].forEach((t,i)=>c.fillText(t,30+i*40,86));['300','500','1000'].forEach((t,i)=>c.fillText(t,100+i*30,86));
    const t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry((702-536)*K,.05),m);pl.userData.cwFx=1;hp.add(pl);
    const W=(166*K),Hh=.05,P2=(u,v)=>[-W/2+u*W,Hh/2-v*Hh,.003];
    toggle(hp,...P2(.16,.5),'HUD SCALES SWITCH',['OFF','SCALES'],()=>sv('scales',1),v=>{ST.scales=v;});
    knob(hp,...P2(.41,.5),.007,'TF CLEARANCE SET',['300','500','1000'],'tfclr',()=>sv('tfclr',2));
    knob(hp,...P2(.66,.5),.007,'HUD BRIGHTNESS',['DIM','MED','BRT'],'hbrt',()=>{try{return sys.hud.brt>.8?2:sys.hud.brt>.45?1:0;}catch(e){return 2;}},v=>{try{sys.hud.brt=[.35,.65,1][v];}catch(e){}});}
  const glsM=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.08,shininess:140,specular:0x8a8a8a,depthWrite:false});
  function inst(k,x,y,hs,draw,round=true){const S=k==='adi'||k==='hsi'?320:hs<16?96:256,cv=document.createElement('canvas');cv.width=cv.height=S;const t=new THREE.CanvasTexture(cv);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;ctx.o.tex.push(t);
    const c=cv.getContext('2d'),r=hs*K;box(board,2*r*1.04,2*r*1.04,.03,bz,bx(x),by(y),.008);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const fm=new THREE.Mesh(round?new THREE.CircleGeometry(r*.9,48):new THREE.PlaneGeometry(r*1.8,r*1.8),m);fm.position.set(bx(x),by(y),.0235);fm.userData.cwFx=1;board.add(fm);
    if(round){const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.92,r*.05,8,40),LM(0x0a0a0a,30));ring.position.set(bx(x),by(y),.0245);ring.userData.cwFx=1;board.add(ring);
      const gl=new THREE.Mesh(new THREE.CircleGeometry(r*.92,40),glsM);gl.position.set(bx(x),by(y),.026);gl.userData.cwFx=1;gl.renderOrder=2;board.add(gl);
      for(const [sx,sy] of[[-1,-1],[1,-1],[-1,1],[1,1]]){const s=new THREE.Mesh(new THREE.CylinderGeometry(r*.06,r*.06,.004,8),met);s.rotation.x=Math.PI/2;s.position.set(bx(x)+sx*r*.85,by(y)+sy*r*.85,.024);board.add(s);}}
    upd.push(P=>{if(round){face(c,S);c.scale(S/256,S/256);}draw(c,P);t.needsUpdate=true;});}
  INST.forEach(([k,x,y,hs,d])=>inst(k,x,y,hs,d,true));SQ.forEach(([k,x,y,hs,d])=>inst(k,x,y,hs,d,false));
  function lampAt(par,x,y,z,w,h,lg,col,lit,ww,hh){const cv=document.createElement('canvas');cv.width=128;cv.height=Math.max(32,Math.round(128*hh/ww));const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const lm=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);lm.position.set(x,y,z);lm.userData.cwFx=1;par.add(lm);let last=null;
    lamps.push(P=>{const on=lampTest>now()||!!lit(P);if(on===last)return;last=on;c.fillStyle=on?col:'#1c1a14';c.fillRect(0,0,cv.width,cv.height);const n=lg.split('\n');c.font=`bold ${Math.round(cv.height*(n.length>1?.3:.42))}px Arial`;c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=on?'#200':'#5a5444';n.forEach((l,i,a)=>c.fillText(l,64,cv.height/2+(i-(a.length-1)/2)*cv.height*.36));t.needsUpdate=true;});return lm;}
  LAMPS.forEach(([k,x,y,w,h,lg,col,lit])=>{lampAt(board,bx(x),by(y),.016,w*K,h*K,lg,col,lit,w,h);box(board,w*K+.004,h*K+.004,.012,blk,bx(x),by(y),.009);});
  // armament advisory lights (3): one per station, lit when armed and the station is selected and loaded
  const stOn=i=>sv('sta'+i,i===3?1:0);
  const stationLoaded=(P,i)=>{try{if(i===3)return(P.ammo||0)>0;const id=String(i+1),ld=P.load||{};return!!ld[id]||!!ld[i+1];}catch(e){return false;}};
  ADV.forEach((s,i)=>{const x=152+i*35+16,y=413;box(board,33*K,42*K,.012,blk,bx(x),by(y),.009);lampAt(board,bx(x),by(y),.016,31*K,40*K,(i===3?'GUN':'STA '+s)+'\nREADY','#3f6',P=>game.arm&&stOn(i)&&stationLoaded(P,i),31,40);});

  /* ---------- clickable controls ---------- */
  function reg(par,mesh,name,state,act){mesh.userData.ctl={meshes:[mesh],name,state,act:(d)=>{try{act(d);}catch(e){console.warn('[a7pit]',name,e);}try{sfx.click();}catch(e){}}};ctls.push(mesh.userData.ctl);}
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
  // ---- ARMT select panel (2) ----
  ADV.forEach((s,i)=>toggle(board,bx(170+i*36),by(478),BZ,i===3?'ARMT · GUN SELECT (station 4 position)':'ARMT · STATION '+s+' SELECT',['OFF','SELECT'],()=>stOn(i),v=>{ST['sta'+i]=v;}));
  toggle(board,bx(172),by(520),BZ,'GUN RATE (2)',['LOW','HIGH'],()=>sv('gunRate',1),v=>{ST.gunRate=v;});
  toggle(board,bx(208),by(520),BZ,'GUN ARM (2)',['SAFE','ARM'],()=>sv('gunArm',1),v=>{ST.gunArm=v;});
  knob(board,bx(265),by(516),BZ,13*K,'FUZE SELECTOR (2)',['SAFE','NOSE','TAIL','NOSE & TAIL'],'fuze',()=>sv('fuze',3));
  toggle(board,bx(322),by(520),BZ,'RIPL / SGL (2)',['SGL','RIPL'],()=>sv('ripl',0),v=>{ST.ripl=v;});
  knob(board,bx(378),by(516),BZ,12*K,'RELEASE QUANTITY (2)',['1','2','3','4','6','8','12'],'relq');
  toggle(board,bx(414),by(520),BZ,'MASTER ARM (2)',['OFF','ARM'],()=>game.armPos===0?1:0,v=>setArm(v?0:1),{col:0xd8b820});
  // ---- attack master function switches (14): NAV / ATTK / A-G WPN / A-A GUN push lights
  const MODES=['NAV','ATTK','A/G\nWPN','A/A\nGUN'];
  MODES.forEach((s,i)=>{const x=451+(i%2)*41+18,y=453+(i/2|0)*28+12;box(board,38*K,26*K,.012,blk,bx(x),by(y),.009);
    lampAt(board,bx(x),by(y),.016,36*K,24*K,s,'#f0f0e8',()=>sv('amode',0)===i,36,24);
    hitBox(board,bx(x),by(y),.02,36*K,24*K,'ATTACK MASTER FUNCTION · '+s.replace('\n',' ')+' (14)',()=>sv('amode',0)===i?'ON':'—',()=>{ST.amode=i;
      try{if(i===3){game.wsel='GUN';if(game.armPos!==0)setArm(0);}else if(i===2){const ag=agTypes(PL());if(ag.length)game.wsel=ag[0];}}catch(e){}});});
  // ---- warnings: MASTER CAUTION (15) press-to-reset, fire test (33), lamp test via MC long press ----
  hitBox(board,bx(564),by(200),.02,52*K,26*K,'MASTER CAUTION (15) · press to reset',()=>cautions(PL()).join(' · ')||'—',()=>{mcAck=true;});
  button(board,bx(836),by(28),BZ,9*K,'FIRE WARNING TEST (33)',0x6a6a6a,()=>{fireTest=now()+3;lampTest=now()+3;});
  hitBox(board,bx(614),by(200),.02,30*K,22*K,'MKR BCN (16)',()=>'',()=>{});
  hitBox(board,bx(648),by(200),.02,30*K,22*K,'LOW ALT (16) · set index on the radar altimeter',()=>sv('lowAlt',500)+' FT',()=>{});
  knob(board,bx(765)+50*K*.82,by(130)-50*K*.82,.03,8*K,'RADAR ALTIMETER · LOW ALT SET / POWER (21)',['OFF','100','200','300','500','1000'],'raltk',()=>sv('raltk',4),v=>{ST.raltk=v;ST.ralt=v?1:0;ST.lowAlt=[0,100,200,300,500,1000][v];});
  knob(board,bx(752)-46*K*.82,by(258)+46*K*.82,.03,7*K,'ALTIMETER BARO SET (22)',['29.92'],'baro');
  knob(board,bx(617)+70*K*.88,by(462)+70*K*.82,.03,7*K,'HSI COURSE SET (18)',['−10°','+10°'],'crsK',()=>0,v=>{const P=PL();const c=ST.crs!=null?ST.crs:Math.round(brgField(P));ST.crs=((c+(v?10:-10))%360+360)%360;});
  knob(board,bx(617)-70*K*.88,by(462)+70*K*.82,.03,7*K,'HSI HEADING SET (18)',['—'],'hdgK');
  knob(board,bx(357)-34*K,by(140)+38*K,.03,6*K,'STANDBY ATTITUDE · PULL TO CAGE (8)',['RUN','CAGED'],'sbyc');
  button(board,bx(752)+38*K*.8,by(430)+38*K*.8,.03,5*K,'ACCELEROMETER · PUSH TO SET (24)',0x333333,()=>{const P=PL();if(P){P.maxNz=1;P._minNz=1;}});
  toggle(board,bx(722),by(518),BZ,'HDG MODE (25)',['DG','SLAVED'],()=>sv('hdgm',1),v=>{ST.hdgm=v;});
  hitBox(board,bx(768),by(494),.02,24*K,22*K,'TF MASTER FUNCTION (26)',()=>sv('tf',0)?'ON':'OFF',()=>{ST.tf=sv('tf',0)?0:1;});
  hitBox(board,bx(768),by(520),.02,24*K,22*K,'LDG MASTER FUNCTION (26)',()=>sv('ldg',1)?'ON':'OFF',()=>{ST.ldg=sv('ldg',1)?0:1;});
  // fuel tank qty switch (37) and LOX indicator test
  knob(board,bx(965),by(478),.03,17*K,'FUEL TANK QTY (37)',['TOTAL','INT','L WG','R WG','EXT'],'ftq',undefined,undefined,{col:0xdcdcd4});
  button(board,bx(987),by(522),BZ,7*K,'LOX INDICATOR TEST (37)',0x777777,()=>{lampTest=Math.max(lampTest,now()+.01);ST._loxT=now()+3;});
  // radar (7) bezel knobs
  [[258,218,'STBY TIME'],[402,218,'SCALE'],[258,368,'BRIGHT'],[402,368,'CONTRAST']].forEach(([x,y,n])=>knob(board,bx(x),by(y),.03,10*K,'RADAR · '+n+' (7)',['1','2','3','4','5'],'r'+n,undefined,undefined,{col:0xd0d0c8}));
  for(let i=0;i<6;i++)button(board,bx(414),by(240+i*20),.03,4.5*K,'RADAR INDICATOR PUSHBUTTON '+(i+1)+' (7)',0xc8c8c0,()=>{});
  // ARMAMENT RELEASE (19): quantity and interval counters, salvo / single switch
  {const cv=document.createElement('canvas');cv.width=280;cv.height=176;const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(140*K,88*K),m);pl.position.set(bx(622),by(592),.003);pl.userData.cwFx=1;board.add(pl);let last='';
    upd.push(()=>{const k=sv('relq',0)+'|'+sv('ivl',2);if(k===last)return;last=k;c.fillStyle='#1b1c1e';c.fillRect(0,0,280,176);c.fillStyle='#e8e8e0';c.font='bold 16px Arial';c.textAlign='center';c.fillText('ARMAMENT RELEASE',140,20);
      c.font='bold 12px Arial';c.fillText('QUANTITY',52,42);c.fillText('INTERVAL-FT',228,42);c.fillStyle='#000';c.fillRect(24,52,56,52);c.fillRect(200,52,56,52);c.fillStyle='#fff';c.font='bold 28px Arial';
      c.fillText(String([1,2,3,4,6,8,12][sv('relq',0)]).padStart(2,'0'),52,88);c.fillText(String([25,50,75,100,150,200][sv('ivl',2)]),228,88);c.font='bold 12px Arial';c.fillStyle='#e8e8e0';c.fillText('SALVO   SINGLE',140,160);t.needsUpdate=true;});}
  knob(board,bx(580),by(615),.008,9*K,'RELEASE QUANTITY SET (19)',['1','2','3','4','6','8','12'],'relq');
  knob(board,bx(665),by(615),.008,9*K,'RELEASE INTERVAL SET (19)',['25','50','75','100','150','200'],'ivl',()=>sv('ivl',2));
  toggle(board,bx(622),by(600),BZ,'RELEASE MODE (19)',['SINGLE','SALVO'],()=>sv('salvo',0),v=>{ST.salvo=v;});

  /* ---------- consoles ---------- */
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
  const zL=y=>CZ0+(y-195)/(580-195)*(CZ1-CZ0),zR=y=>CZ0+(y-210)/(605-210)*(CZ1-CZ0);
  // bodies, sills, pedestal
  box(g,.18,.34,.22,dk,0,-1.0,-.68);
  // console tops sit just under the panel plates (CY) so the painted panels show; longerons are a low sill, not a wall
  [-1,1].forEach(sd=>{box(g,.22,.1,.98,LM(0x2a2d30,8),sd*.43,CY-.052,-.15);box(g,.05,.1,1.3,LM(0x25282a,8),sd*.555,-.55,-.2);});
  // tub: floor, fuselage skin below the consoles, kick board under the panel and a backing behind the HUD well so nothing shows the ground through the cockpit
  {const sk=LM(0x1c1f21,6);box(g,1.14,.02,1.5,sk,0,-1.23,-.1);[-1,1].forEach(sd=>box(g,.03,.66,1.3,sk,sd*.565,-.93,-.2));box(g,1.1,.5,.03,sk,0,-1.0,-.86);box(g,.9,.42,.02,sk,0,-.52,-.83);}

  // ======== LEFT CONSOLE (figure 1-7) — u 0 = outboard ========
  // 1 · EMER POWER handle, landing gear controls, gear / flap / pitch & roll trim indicators (forward, angled)
  {const fp=new THREE.Group();fp.position.set(-.43,-.62,zL(222)-.02);fp.rotation.x=-.9;g.add(fp);box(fp,.21,.11,.012,dk,0,0,-.007);
    const cv=document.createElement('canvas');cv.width=300;cv.height=158;const c=cv.getContext('2d');c.fillStyle='#2b2f32';c.fillRect(0,0,300,158);c.font='bold 11px Arial';c.fillStyle='#e8e8e0';c.textAlign='center';
    [['EMER\nPOWER',36,14],['LANDING GEAR',122,14],['PITCH TRIM',205,14],['ROLL TRIM',265,14],['WHEELS\nFLAPS',205,98],['EMER GEAR\nRELEASE',122,118]].forEach(([s,x,y])=>s.split('\n').forEach((l,i)=>c.fillText(l,x,y+i*13)));
    const t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(.205,.108),m);pl.userData.cwFx=1;fp.add(pl);
    const P2=(u,v)=>[-.1025+u*.205,.054-v*.108,.003];
    const mini=(u,v,r,draw)=>{const cv2=document.createElement('canvas');cv2.width=cv2.height=96;const c2=cv2.getContext('2d'),t2=new THREE.CanvasTexture(cv2);ctx.o.tex.push(t2);const m2=new THREE.MeshBasicMaterial({map:t2,toneMapped:false});ctx.o.faces.push(m2);
      const fm=new THREE.Mesh(new THREE.PlaneGeometry(r*2,r*2),m2);fm.position.set(...P2(u,v));fm.position.z+=.002;fp.add(fm);upd.push(P=>{draw(c2,P);t2.needsUpdate=true;});};
    mini(.68,.45,.016,F.small('ptrim'));mini(.88,.45,.016,F.small('rtrim'));mini(.62,.88,.009,F.small('gear'));mini(.75,.88,.009,F.small('gear'));mini(.86,.88,.009,(c,P)=>{const S=96;c.setTransform(1,0,0,1,0,0);c.fillStyle='#111';c.fillRect(0,0,S,S);const f=P.flapPos!=null?P.flapPos:P.flapCmd||0;
      if(f>.05&&f<.95&&Math.abs((P.flapCmd||0)-f)>.02)barber(c,S/2,S/2,S*.45);else T(c,f>.5?'DN':'UP',S/2,S/2,S*.38,'#fff');});
    // emergency power (RAT) handle
    {const h=new THREE.Group();h.position.set(...P2(.12,.55));fp.add(h);box(h,.012,.012,.03,LM(0xd8b820,30),0,0,.015);box(h,.034,.012,.012,LM(0xd8b820,30),0,0,.03);
      const hb=new THREE.Mesh(new THREE.BoxGeometry(.04,.03,.05),hit);hb.position.z=.02;hb.userData.cwFx=1;h.add(hb);
      reg(h,hb,'EMER POWER HANDLE (1) · RAT',()=>sv('rat',0)?'EXTENDED':'STOWED',()=>{if(!sv('rat',0)){ST.rat=1;try{radio('EMERGENCY POWER · RAM AIR TURBINE EXTENDED');}catch(e){}}});
      upd.push(()=>{h.position.z=P2(.12,.55)[2]+(sv('rat',0)?.03:0);});}
    // landing gear handle: wheel knob, red light in the knob while in transit
    {const gh=new THREE.Group();gh.position.set(...P2(.38,.5));fp.add(gh);box(gh,.008,.008,.04,met,0,0,.02);const wh=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.01,16),LM(0xe8e8e8,40));wh.position.set(0,0,.042);gh.add(wh);
      const lt=new THREE.Mesh(new THREE.SphereGeometry(.005,8,6),new THREE.MeshBasicMaterial({color:0x330a08}));lt.position.set(0,0,.05);gh.add(lt);
      const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.06),hit);hb.position.z=.03;hb.userData.cwFx=1;gh.add(hb);
      reg(gh,hb,'LANDING GEAR HANDLE (1)',()=>gearDn()?'DOWN':'UP',()=>{try{uiKey('Digit7');}catch(e){}});
      upd.push(P=>{gh.rotation.x=gearDn()?-.45:.35;const tr=P.gearPos!=null&&P.gearPos>.05&&P.gearPos<.95;lt.material.color.set(tr||lampTest>now()?0xff3020:0x330a08);});}
    button(fp,...P2(.38,.92),.006,'EMERGENCY GEAR RELEASE (1)',0xd8b820,()=>{try{if(!gearDn())uiKey('Digit7');}catch(e){}});}
  // 2 · generators, control selector (full width)
  {const p=cpanel(-1,0,1,zL(250),zL(300),'ELECTRICAL');
    tg(p,.15,.5,'GENERATOR SWITCH (2)',['OFF RESET','ON'],()=>{const P=PL();return P&&P.eng&&!P.eng.done?(P.eng.gen?1:0):sv('gen',1);},v=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START){if((v===1)!==!!P.eng.gen)START.gen();}else ST.gen=v;});
    tg(p,.38,.5,'BATTERY (2)',['OFF','ON'],()=>{const P=PL();return P&&P.eng&&!P.eng.done?(P.eng.batt?1:0):sv('batt',1);},v=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.batt();else ST.batt=v;});
    tg(p,.6,.5,'EXTERNAL POWER (2)',['OFF','ON'],()=>{const P=PL();return P&&P.eng&&!P.eng.done?(P.eng.ext?1:0):0;},()=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.ext();});
    tg(p,.82,.5,'EMERGENCY GENERATOR / CONTROL SELECTOR (2)',['NORM','EMER','TEST'],()=>sv('egen',0),v=>{ST.egen=v;});
    p.lab('GEN',.15,.85);p.lab('BATT',.38,.85);p.lab('EXT PWR',.6,.85);p.lab('EMER GEN',.82,.85);}
  // 3 · fuel and emergency brake (outboard) | 10 · throttle, fuel master, AR door, rudder trim (inboard)
  {const p=cpanel(-1,0,.5,zL(300),zL(380),'FUEL · EMER BRAKE');
    tg(p,.3,.4,'FUEL BOOST PUMP (3)',['OFF','ON'],()=>sv('boost',1),v=>{ST.boost=v;});tg(p,.72,.4,'FUEL DUMP (3)',['OFF','DUMP'],()=>sv('dump',0),v=>{ST.dump=v;},{guard:true,guardUp:()=>sv('dump',0)});
    p.lab('BOOST',.3,.66);p.lab('DUMP',.72,.66);
    const[x,y,z]=p.at(.5,.86,.01);const eb=new THREE.Group();eb.position.set(x,y,z);g.add(eb);box(eb,.03,.012,.014,LM(0xd8b820,30),0,0,0);const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.03,.03),hit);hb.userData.cwFx=1;eb.add(hb);
    reg(eb,hb,'EMERGENCY BRAKE HANDLE (3)',()=>sv('ebrk',0)?'PULLED':'STOWED',()=>{ST.ebrk=sv('ebrk',0)?0:1;});upd.push(()=>{eb.position.z=z+(sv('ebrk',0)?.02:0);});}
  {const thq=cpanel(-1,.5,1,zL(300),zL(380),'',(c,w,h)=>{c.fillStyle='#111';c.fillRect(w*.38,h*.1,w*.16,h*.82);c.font='bold 12px Arial';c.fillStyle='#ddd';c.textAlign='left';
      [['OFF',.92],['IDLE',.76],['MIL',.14]].forEach(([s,v])=>c.fillText(s,w*.57,h*v));c.textAlign='center';c.fillText('FUEL',w*.17,h*.12);c.fillText('MASTER',w*.17,h*.12+13);c.fillText('AR DOOR',w*.84,h*.5);c.fillText('RUDDER',w*.17,h*.66);c.fillText('TRIM',w*.17,h*.66+13);});
    const tq=new THREE.Group();g.add(tq);const[x0,y0]=thq.at(.46,0);tq.position.set(x0,y0,zL(340));
    const arm=new THREE.Group();tq.add(arm);box(arm,.01,.11,.012,met,0,.055,0);const grip=new THREE.Group();grip.position.y=.11;arm.add(grip);
    box(grip,.034,.05,.065,LM(0x1c1c1c,25),-.006,0,0);box(grip,.012,.012,.012,LM(0xb02020,30),-.022,.018,-.014);box(grip,.01,.016,.01,LM(0x777777,30),-.024,-.008,.012);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.06,.07,.08),hit);hb.userData.cwFx=1;grip.add(hb);
    reg(grip,hb,'THROTTLE (10)',()=>{const P=PL();if(P&&P.eng&&!P.eng.done)return P.eng.e[0].fuel?'IDLE':'OFF';return Math.round((P?P.thr:0)*100)+'%';},()=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.thr();});
    upd.push(P=>{let a;if(P.eng&&!P.eng.done&&!P.eng.e[0].fuel)a=.5;else a=.32-(P.thr||0)*.8;arm.rotation.x=a;});
    const sbh=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,.02),hit);sbh.position.set(-.024,-.008,.012);sbh.userData.cwFx=1;grip.add(sbh);
    reg(grip,sbh,'SPEED BRAKE SWITCH (throttle grip)',()=>keys.has('KeyB')?'OUT':'IN',()=>{if(keys.has('KeyB'))keys.delete('KeyB');else keys.add('KeyB');});
    tg(thq,.17,.36,'FUEL MASTER (10)',['OFF','ON'],()=>{const P=PL();return P&&P.eng&&!P.eng.done?(P.eng.fm?1:0):sv('fmaster',1);},v=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.fm();else ST.fmaster=v;},{guard:true,guardUp:()=>true});
    tg(thq,.84,.72,'AIR REFUELING DOOR (10)',['CLOSE','OPEN'],()=>sv('ardoor',0),v=>{ST.ardoor=v;});
    kn(thq,.17,.86,.011,'RUDDER TRIM (10)',['L','NEUTRAL','R'],'rtrim',()=>sv('rtrim',1));
    // ENGINE START (air turbine starter) on the inboard edge
    {const[x,y,z]=thq.at(.84,.2,.006);button(g,x,y,z,.007,'ENGINE START (10) · air turbine starter',0x222222,()=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.src();});}}
  // 4 flap control | 5 AFCS (outboard) — 11 RADAR (inboard)
  {const p=cpanel(-1,0,.25,zL(370),zL(425),'FLAPS');
    const[x,y,z]=p.at(.5,.55,.004);const fl=new THREE.Group();fl.position.set(x,y,z);g.add(fl);box(fl,.008,.04,.008,met,0,.02,0);box(fl,.03,.012,.014,LM(0xe8e8e0,30),0,.04,0);const hb=new THREE.Mesh(new THREE.BoxGeometry(.04,.06,.04),hit);hb.position.y=.03;hb.userData.cwFx=1;fl.add(hb);
    reg(fl,hb,'FLAP CONTROL (4)',()=>{const P=PL();return P&&(P.flapCmd||0)>.5?'DOWN':'UP';},()=>{try{flapKey();}catch(e){}});upd.push(P=>{fl.rotation.x=(P.flapCmd||0)>.5?.5:-.4;});
    p.lab('UP',.5,.25,10);p.lab('DN',.5,.95,10);}
  {const p=cpanel(-1,.25,.5,zL(370),zL(425),'AFCS');
    tg(p,.25,.4,'AFCS PITCH (5)',['OFF','ENGAGE'],()=>sv('afp',1),v=>{ST.afp=v;ST.afcs=v&&sv('afr',1)?1:0;});tg(p,.5,.4,'AFCS ROLL (5)',['OFF','ENGAGE'],()=>sv('afr',1),v=>{ST.afr=v;ST.afcs=v&&sv('afp',1)?1:0;});tg(p,.75,.4,'AFCS YAW (5)',['OFF','ENGAGE'],()=>sv('afy',1),v=>{ST.afy=v;});
    tg(p,.25,.8,'AUTOPILOT (5)',['OFF','ENGAGE'],()=>sv('ap',0),v=>{ST.ap=v;});tg(p,.5,.8,'ALT HOLD (5)',['OFF','ON'],()=>sv('alth',0),v=>{ST.alth=v;});tg(p,.75,.8,'HDG SEL (5)',['OFF','ON'],()=>sv('hsel',0),v=>{ST.hsel=v;});}
  {const p=cpanel(-1,.5,1,zL(380),zL(425),'RADAR · APQ-126');
    const pwr=()=>({OFF:0,STBY:1,ON:2})[radar.power]??2;
    kn(p,.18,.5,.012,'RADAR POWER (11)',['OFF','STBY','OPR'],'rpwr',pwr,v=>{radar.power=['OFF','STBY','ON'][v];if(v===2)radar.warm=Math.max(radar.warm||0,3);});
    const RM=['GMP','GMS','TA','TF','AGR','BCN'];kn(p,.42,.5,.012,'RADAR MODE (11)',['GND MAP PENCIL','GND MAP SPOILED','TERRAIN AVOIDANCE','TERRAIN FOLLOWING','AIR-GND RANGING','BEACON'],'rmode',
      ()=>Math.max(0,RM.indexOf(window.AGR?AGR.mode:'GMP')),v=>{if(window.AGR){AGR.mode=RM[v];AGR.sig='';}});
    kn(p,.66,.5,.012,'RANGE (11)',radar.ranges.map(String),'rrng',()=>radar.ri,v=>{radar.ri=clamp(v,0,radar.ranges.length-1);});
    kn(p,.88,.5,.009,'TILT (11)',['-5','0','+5','+10'],'rtilt');p.lab('PWR',.18,.92,10);p.lab('MODE',.42,.92,10);p.lab('RANGE',.66,.92,10);p.lab('TILT',.88,.92,10);}
  // 6 IFF | 12 UHF
  {const p=cpanel(-1,0,.5,zL(425),zL(465),'IFF');kn(p,.25,.55,.011,'IFF MASTER (6)',['OFF','STBY','LOW','NORM','EMER'],'iff',()=>sv('iff',3));tg(p,.6,.55,'MODE 3/A (6)',['OFF','ON'],()=>sv('iff3',1),v=>{ST.iff3=v;});tg(p,.82,.55,'MODE C (6)',['OFF','ON'],()=>sv('iffc',1),v=>{ST.iffc=v;});}
  {const p=cpanel(-1,.5,1,zL(425),zL(465),'UHF · ARC-51BX');kn(p,.3,.55,.014,'UHF PRESET CHANNEL (12)',Array.from({length:20},(_,i)=>String(i+1)),'uhfCh',()=>sv('uhfCh',7)-1,v=>{ST.uhfCh=v+1;});
    kn(p,.62,.55,.01,'UHF FUNCTION (12)',['OFF','T/R','T/R+G','ADF'],'ufn',()=>sv('ufn',1));kn(p,.86,.55,.008,'UHF VOLUME (12)',['1','2','3','4','5'],'uvol',()=>sv('uvol',3));}
  // 7 RHAW | 13 INTER
  {const p=cpanel(-1,0,.5,zL(465),zL(505),'RHAW');tg(p,.22,.55,'RHAW POWER (7)',['OFF','ON'],()=>sv('rhaw',1),v=>{ST.rhaw=v;});kn(p,.52,.55,.009,'RHAW MODE (7)',['SRCH','LCH','PRI'],'rhm');kn(p,.8,.55,.009,'RHAW AUDIO (7)',['1','2','3','4'],'rha');}
  {const p=cpanel(-1,.5,1,zL(465),zL(505),'INTER');tg(p,.3,.55,'INTERPHONE (13)',['NORM','HOT MIC'],()=>sv('icsh',0),v=>{ST.icsh=v;});kn(p,.72,.55,.009,'INTER VOLUME (13)',['1','2','3','4','5'],'icsv');}
  // 8 suit temp | 14 ADF / aux UHF
  {const p=cpanel(-1,0,.5,zL(505),zL(530),'SUIT TEMP');kn(p,.5,.6,.009,'SUIT TEMPERATURE (8)',['COLD','','','HOT'],'suit');}
  {const p=cpanel(-1,.5,1,zL(505),zL(530),'ADF / AUX UHF');kn(p,.35,.6,.009,'AUX UHF CHANNEL (14)',['1','2','3','4','5','6'],'auxu');tg(p,.75,.6,'ADF (14)',['OFF','ON'],()=>sv('adf',0),v=>{ST.adf=v;});}
  // 9 pilot services (aft, full width)
  {const p=cpanel(-1,0,1,zL(530),zL(580),'PILOT SERVICES');tg(p,.2,.5,'OXYGEN (9)',['OFF','ON'],()=>sv('o2',1),v=>{ST.o2=v;});const[gx,gy,gz]=p.at(.48,.5,.01);button(g,gx,gy,gz,.01,'ANTI-G VALVE TEST (9)',0xd8d8d0,()=>{try{radio('G VALVE · TEST');}catch(e){}});
    kn(p,.75,.5,.01,'CONSOLE LIGHTS (9)',['OFF','DIM','BRT'],'conl');}
  // 15 ALTERNATE FUEL FEED, 16 CANOPY JETTISON on the left longeron (wall)
  {const wp=new THREE.Group();wp.position.set(-.528,-.53,zL(330));wp.rotation.y=Math.PI/2;wp.rotation.order='YXZ';wp.rotation.x=-.2;g.add(wp);box(wp,.12,.06,.008,dk,0,0,-.005);
    const cv=document.createElement('canvas');cv.width=240;cv.height=120;const c=cv.getContext('2d');c.fillStyle='#2b2f32';c.fillRect(0,0,240,120);c.font='bold 14px Arial';c.fillStyle='#e8e8e0';c.textAlign='center';c.fillText('ALTERNATE',120,20);c.fillText('FUEL FEED',120,36);
    const t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(.12,.06),m);pl.userData.cwFx=1;wp.add(pl);
    toggle(wp,0,-.01,.002,'ALTERNATE FUEL FEED (15)',['NORM','ALT'],()=>sv('altf',0),v=>{ST.altf=v;},{guard:true,guardUp:()=>sv('altf',0)});}
  {const ch=new THREE.Group();ch.position.set(-.53,-.5,zL(250));g.add(ch);box(ch,.01,.05,.01,LM(0x111111,20),0,0,0);box(ch,.014,.014,.05,LM(0xd8b820,30),.008,.025,0);
    for(let i=0;i<4;i++)box(ch,.0145,.004,.012,LM(0x111111,20),.008,.025,-.018+i*.012);const hb=new THREE.Mesh(new THREE.BoxGeometry(.04,.06,.06),hit);hb.userData.cwFx=1;ch.add(hb);
    reg(ch,hb,'CANOPY JETTISON CONTROL HANDLE (16)',()=>'SAFE · NOT MODELLED',()=>{try{radio('CANOPY JETTISON · NOT IN THIS BUILD');}catch(e){}});}

  // ======== RIGHT CONSOLE (figure 1-5) — u 0 = inboard ========
  const R0=(u0,u1,y0,y1,t,d)=>cpanel(1,1-u1,1-u0,zR(y0),zR(y1),t,d);// keep u = inboard→outboard in the figure's left→right order
  {const p=R0(0,1,210,255,'INTERIOR LIGHTS');kn(p,.12,.55,.009,'WARNING / CAUTION LIGHTS (1)',['DIM','BRT'],'wcl');kn(p,.32,.55,.009,'INSTRUMENT LIGHTS (1)',['OFF','DIM','BRT'],'ilt');kn(p,.52,.55,.009,'CONSOLE LIGHTS (1)',['OFF','DIM','BRT'],'clt');
    kn(p,.72,.55,.009,'FLOOD (1)',['OFF','DIM','BRT'],'fld');tg(p,.9,.55,'LIGHT TEST (1)',['OFF','TEST'],()=>lampTest>now()?1:0,v=>{if(v)lampTest=now()+3;});}
  {const p=R0(0,.62,255,280,'DPLR');kn(p,.3,.6,.009,'DOPPLER (2)',['OFF','STBY','OPR','TEST'],'dplr',()=>sv('dplr',2));kn(p,.7,.6,.009,'LAND / SEA (2)',['LAND','SEA'],'dls');}
  {const p=R0(0,.62,280,310,'OXYGEN REGULATOR');tg(p,.25,.6,'OXYGEN SUPPLY (3)',['OFF','ON'],()=>sv('o2',1),v=>{ST.o2=v;});tg(p,.5,.6,'DILUTER (3)',['NORMAL','100%'],()=>sv('dil',0),v=>{ST.dil=v;});tg(p,.75,.6,'EMERGENCY (3)',['NORMAL','EMER'],()=>sv('o2e',0),v=>{ST.o2e=v;});}
  {const p=R0(0,.62,310,395,'NAV WD',(c,w,h)=>{c.fillStyle='#000';c.fillRect(w*.08,h*.18,w*.84,h*.22);c.font='bold 12px Arial';c.fillStyle='#e8e8e0';c.fillText('DATA',w*.2,h*.5);c.fillText('MODE',w*.8,h*.5);});
    kn(p,.2,.68,.01,'NAV WD DATA (4)',['PP','DEST','MARK','WIND','MAG VAR','ALT'],'nwd');kn(p,.8,.68,.012,'NAV MODE (4)',['OFF','STBY','ALIGN','NORM','IMS ONLY','DR'],'nwm',()=>sv('nwm',3));
    for(let i=0;i<3;i++)for(let j=0;j<4;j++){const[x,y,z]=p.at(.36+j*.09,.6+i*.12,.004);button(g,x,y,z,.0045,'NAV WD KEY '+(i*4+j+1)+' (4)',0x1e1e1e,()=>{});}}
  {const p=R0(0,.62,395,430,'TACAN');kn(p,.25,.55,.012,'TACAN CHANNEL (5)',Array.from({length:13},(_,i)=>String(i*10)),'tch10',()=>sv('tch10',3));kn(p,.5,.55,.01,'TACAN UNITS (5)',['0','1','2','3','4','5','6','7','8','9'],'tch1',()=>sv('tch1',4));kn(p,.78,.55,.01,'TACAN FUNCTION (5)',['OFF','REC','T/R','A/A'],'tfn',()=>sv('tfn',2));}
  {const p=R0(0,.62,430,450,'ILS');kn(p,.3,.6,.008,'ILS CHANNEL (6)',['108.1','108.3','109.5','110.3','111.1'],'ils');tg(p,.75,.6,'ILS POWER (6)',['OFF','ON'],()=>sv('ilsp',0),v=>{ST.ilsp=v;});}
  {const p=R0(0,.62,450,480,'VHF FM');kn(p,.3,.6,.009,'VHF FM FUNCTION (7)',['OFF','T/R','RETRAN','HOME'],'vhf');kn(p,.7,.6,.008,'VHF FM VOLUME (7)',['1','2','3','4','5'],'vhfv');}
  {const p=R0(0,.62,480,505,'SPEECH SECURITY');kn(p,.3,.6,.008,'SPEECH SECURITY (8)',['OFF','PLAIN','CIPHER'],'kys');tg(p,.75,.6,'ZEROIZE (8)',['NORM','ZERO'],()=>0,()=>{},{guard:true});}
  {const p=R0(0,.62,505,520,'RADAR BEACON');kn(p,.4,.6,.007,'RADAR BEACON (9)',['OFF','STBY','ON'],'rbcn');}
  R0(0,.62,520,545,'');
  // outboard column: 18 advisory & caution panels, 17 ext lights, 16 ECM pod, 15 IMS, 14 air cond, 13 blank
  {const CN=['ENG','FUEL LOW','OIL PRESS','GEN OUT','HYD PRESS','PC-1','CANOPY','SPD BRK','HOOK','AFCS','IMS','ANTI-SKID'];
    const p=R0(.62,1,255,350,'CAUTION');const ww=.38*CW;
    CN.forEach((s,i)=>{const[x,y,z]=p.at(.08+(i%2)*.46,.2+(i/2|0)*.13,.003);const lm=lampAt(g,x+.46*ww/2,y,z,.44*ww,.012,s,'#fb3',P=>cautions(P).includes(s),44,12);lm.rotation.x=-Math.PI/2;});}
  {const p=R0(.62,1,350,440,'EXT LIGHTS');tg(p,.3,.35,'POSITION LIGHTS (17)',['OFF','DIM','BRT'],()=>sv('posl',2),v=>{ST.posl=v;});tg(p,.72,.35,'FLASH / STEADY (17)',['STEADY','FLASH'],()=>sv('flsh',1),v=>{ST.flsh=v;});
    tg(p,.3,.75,'ANTI-COLLISION (17)',['OFF','ON'],()=>sv('acol',1),v=>{ST.acol=v;});tg(p,.72,.75,'FORMATION (17)',['OFF','ON'],()=>sv('frm',0),v=>{ST.frm=v;});}
  {const p=R0(.62,1,440,465,'ECM POD');kn(p,.35,.6,.008,'ECM POD (16)',['OFF','STBY','XMIT'],'ecm',()=>sv('ecm',1));tg(p,.75,.6,'ECM MODE (16)',['A','B'],()=>sv('ecmm',0),v=>{ST.ecmm=v;});}
  {const p=R0(.62,1,465,490,'IMS');kn(p,.5,.6,.008,'IMS MODE (15)',['OFF','STBY','ALIGN','NORM','GYRO'],'ims',()=>sv('ims',3));}
  {const p=R0(.62,1,490,515,'AIR COND');kn(p,.35,.6,.008,'COCKPIT TEMP (14)',['COLD','','','','HOT'],'ctemp',()=>sv('ctemp',2));tg(p,.75,.6,'AIR SOURCE (14)',['AUTO','RAM'],()=>sv('acm',0),v=>{ST.acm=v;});}
  R0(.62,1,515,545,'');
  // 11 WINGFOLD, 12 map case (aft)
  {const p=R0(0,1,545,575,'WINGFOLD');const[x,y,z]=p.at(.3,.6,.004);const wf=new THREE.Group();wf.position.set(x,y,z);g.add(wf);box(wf,.008,.05,.008,LM(0xd8b820,30),0,.025,0);box(wf,.03,.012,.012,LM(0xd8b820,30),0,.05,0);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.04,.07,.04),hit);hb.position.y=.03;hb.userData.cwFx=1;wf.add(hb);
    reg(wf,hb,'WINGFOLD (11)',()=>sv('wfold',0)?'FOLD':'SPREAD',()=>{const P=PL();if(P&&!P.onGnd){try{radio('WINGFOLD · ON THE GROUND ONLY');}catch(e){}return;}ST.wfold=sv('wfold',0)?0:1;});upd.push(()=>{wf.rotation.x=sv('wfold',0)?.6:-.2;});
    // arresting hook (USAF A-7D keeps the hook) beside the wingfold
    tg(p,.75,.6,'ARRESTING HOOK',['UP','DOWN'],()=>{const P=PL();return P&&P.hook?1:0;},()=>{const P=PL();if(P){P.hook=!P.hook;try{flash('HOOK '+(P.hook?'DOWN':'UP'),900);}catch(e){}}});}
  {R0(0,1,575,605,'MAP CASE',(c,w,h)=>{c.fillStyle='#1a1c1e';c.fillRect(w*.08,h*.3,w*.84,h*.6);});}

  // stick (A-7D grip: trigger, bomb button, trim hat, AP disengage) — the borrowed stick's motion is copied into stkG
  const stkG=new THREE.Group(),thrG=new THREE.Group();g.add(stkG);g.add(thrG);thrG.visible=false;
  box(stkG,.026,.34,.026,LM(0x1a1a1a,30),0,.17,0);box(stkG,.042,.12,.048,LM(0x2a2a2a,20),0,.39,-.004,-.25);box(stkG,.014,.016,.014,LM(0x777777,30),0,.455,.004);box(stkG,.012,.022,.012,LM(0xb02020,30),-.018,.43,0);box(stkG,.006,.03,.022,LM(0x888888,30),0,.37,-.03);
  let t=0;
  return{stkG,thrG,ctls,upd:(P)=>{if(!P)return;if(!cautions(P).length)mcAck=false;for(const l of lamps)l(P);const tn=now();if(tn-t<.066)return;t=tn;
    for(let i=0;i<upd.length;i++){try{upd[i](P);}catch(e){}}
    P._trimP=(P._trimP||0)*.97+(P.ctl?P.ctl.p:0)*.03;}};}

PIT[ID].custom=build;
window.A7PIT={amode:()=>sv('amode',0),scales:()=>sv('scales',1),ldg:()=>sv('ldg',1),tf:()=>sv('tf',0),clr:()=>[300,500,1000][sv('tfclr',2)]};
console.info('[a7pit] A-7D T.O. 1A-7D-1 cockpit active');
})();
