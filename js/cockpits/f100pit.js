/* =====================================================================================================================
   v266 - F-100A Super Sabre cockpit, 1:1 after T.O. 1F-100A-1 (North American F-100A flight manual): figure 1-5 "Instrument panel",
   1-6 / 1-7 left and right consoles, 1-10 engine and armament control panel, 1-12 indicator-caution-warning lights, 1-18 electrical
   control panel, 1-23 landing gear control panel. The sight is the A-4 gyro computing sight, coupled to the AN/ASG-17 ranging radar
   (ACM-only: see acmradar.js) - there is no radar scope. Instrument panel, keyed after Fig 1-5:
     36 UHF remote channel indicator, 2 airspeed / Mach indicator, 6 heading indicator, 9 attitude indicator (CLIMB / DIVE sphere),
     11 accelerometer, 16 hydraulic pressure gage, 17 oil pressure gage, 33 turn-and-slip, 34 altimeter, 32 course indicator,
     28 vertical velocity indicator, 18 tachometer, 19 engine differential pressure gage, 31 TACAN range indicator, 30 radio magnetic
     indicator, 29 clock, 26 fuel quantity gage, 20 fuel flow indicator, 21 exhaust temperature gage, 24 cockpit pressure altitude,
     25 bomb-target wind control, 27 drop tank emergency jettison handle, 22 landing gear emergency lowering handle, 23 fuel quantity
     test button; MISSILE 1-4 / M1 RELEASE lights, FIRE and OVERHEAT warning lights, fire warning test button, FLT SYS FAIL light,
     loadmeter, V.G. erect plate, trigger safety switch, hydraulic pressure selector, compass slaving switch, drag chute handle.
   Consoles: engine & armament control panel (ENG MASTER, AIR START, FUEL REG, GUIDE VANE ANTI-ICE, SIGHT & RADAR / MANUAL / DIVE /
   OFF, SIGHT FIL, ANTI-SKID, bomb arming, ARMAMENT SELECTOR), electrical panel (GENERATOR, BATTERY, STARTER & ENGINE IGNITION, SEC BUS
   TIE-IN, POWER INVERTER, INSTRUMENT INVERTER), landing gear control panel, sight selector unit, caution placards, radios, circuit breakers.
   Needs game.js, cwpit.js, cw-systems.js, startup.js, acmradar.js.
   ===================================================================================================================== */
(function(){
'use strict';
const PIT=window.CW_PIT;if(!PIT||!PIT['F-100A']){console.warn('[f100pit] cwpit missing');return;}
const ID='F-100A',K=.0008,OX=782,OY=720;
const PL=()=>typeof player!=='undefined'?player:null;
const bx=x=>(x-OX)*K,by=y=>(OY-y)*K;
const now=()=>performance.now()/1000;
let STV=0,FK='',SK='',FKA=[];
const ST=new Proxy({},{set(t,k,v){t[k]=v;STV++;return true;}});
const sv=(k,d)=>ST[k]===undefined?d:ST[k];
let lampTest=0,fireTest=0,qtyTest=0;
const LB=2.2046;

/* ---------------- readouts (J57-P-7) ---------------- */
const E0=P=>P.eng&&!P.eng.done?P.eng.e[0]:null;
const running=P=>{const e=E0(P);return e?e.lit:P.totalFuel>0&&!(P.dm&&P.dm.eng<=0);};
const rpm=P=>{const e=E0(P);return e?e.rpm:running(P)?62+38*clamp(P.n||0,0,1.02):0;};
const egt=P=>{const e=E0(P);return e?e.egt*700:window.ENGSYS&&window.ENGSYS.on?ENGSYS.egt(P,0):running(P)?380+300*clamp(P.n||0,0,1)+(P.ab>.1?110:0):20;};
const ffl=P=>{if(!running(P))return 0;const n=clamp(P.n||0,0,1);return 900+9500*Math.pow(n,1.7)+(P.ab>.1?22000*P.ab:0);};
const dpr=P=>running(P)?8+30*clamp(rpm(P)/100,0,1.05)*(.7+.3*clamp(P.n||0,0,1)):0;
const powered=P=>window.START&&P.eng?START.powered(P):running(P);
const instOn=P=>powered(P)&&sv('iinv',0)!==1;
const fuelLb=P=>(P.totalFuel||0)*LB;
const gearDn=()=>{try{return!!sys.v.gear;}catch(e){return false;}};
const brgTo=(P,x,z)=>(Math.atan2(x-P.pos.x,-(z-P.pos.z))*R2D+360)%360;
const dstTo=(P,x,z)=>Math.hypot(x-P.pos.x,z-P.pos.z)/1852;
const tacan=()=>({x:AF.x,z:AF.z});
const dh=(a,b)=>((a-b+540)%360)-180;

/* ---------------- 2D faces ---------------- */
const INK='#f0f0ea',DIM='#b4b8b0',FACE='#0d0e0f',R=110;
function face(c,W,H){c.setTransform(1,0,0,1,0,0);c.fillStyle=FACE;c.fillRect(0,0,W,H);c.translate(W/2,H/2);}
function T(c,s,x,y,sz,col=INK,al='center',f='bold'){c.font=`${f} ${sz}px Arial, Helvetica, sans-serif`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;c.fillText(s,x,y);}
function tick(c,r,a,l0,l1,w,col=INK){const q=(a-90)*D2R;c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(Math.cos(q)*r*l0,Math.sin(q)*r*l0);c.lineTo(Math.cos(q)*r*l1,Math.sin(q)*r*l1);c.stroke();}
function scale(c,r,a0,a1,n,maj,lbls,lr=.66,sz=18){for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n,M=i%maj===0;tick(c,r,a,M?.78:.87,.97,M?3.2:1.6);}
  if(lbls)lbls.forEach((v,i)=>{if(v==='')return;const a=(a0+(a1-a0)*i/(lbls.length-1)-90)*D2R;T(c,String(v),Math.cos(a)*r*lr,Math.sin(a)*r*lr,sz);});}
function arc(c,r,a0,a1,col,w=7){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.arc(0,0,r,(a0-90)*D2R,(a1-90)*D2R);c.stroke();}
function needle(c,r,deg,len=.84,w=7,col=INK,tail=.18){c.save();c.rotate(deg*D2R);c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=6;c.shadowOffsetX=3;c.shadowOffsetY=4;
  c.fillStyle=col;c.beginPath();c.moveTo(-w*.5,r*tail);c.lineTo(-w*.4,-r*len*.75);c.lineTo(0,-r*len);c.lineTo(w*.4,-r*len*.75);c.lineTo(w*.5,r*tail);c.closePath();c.fill();c.restore();
  c.fillStyle='#222';c.beginPath();c.arc(0,0,w*1.1,0,7);c.fill();c.fillStyle='#555';c.beginPath();c.arc(0,0,w*.5,0,7);c.fill();}
function win(c,x,y,w,h,s,sz,col='#fff'){c.fillStyle='#000';c.fillRect(x-w/2,y-h/2,w,h);c.strokeStyle='#444';c.lineWidth=2;c.strokeRect(x-w/2,y-h/2,w,h);T(c,s,x,y+1,sz,col,'center','bold');}
function barber(c,x,y,r){c.save();c.beginPath();c.arc(x,y,r,0,7);c.clip();c.translate(x,y);c.rotate(.8);for(let i=-6;i<7;i++){c.fillStyle=i%2?'#eee':'#1a1a1a';c.fillRect(i*r*.28,-r*2,r*.28,r*4);}c.restore();}
function flag(c,s,x,y,col='#c22'){c.fillStyle=col;c.fillRect(x-R*.2,y-R*.1,R*.4,R*.2);T(c,s,x,y,13,'#fff');}
const lin=(v,a,b)=>clamp((v-a)/(b-a),0,1);
// rotating compass card, N at the top of the card, rotated by -hdg
function card(c,hd,r,inner=.72,sz=15){c.save();c.rotate(-hd*D2R);for(let i=0;i<72;i++){const M=i%2===0,q=i*5*D2R;c.strokeStyle=INK;c.lineWidth=i%6===0?3:M?2:1.2;c.beginPath();c.moveTo(Math.sin(q)*r*(i%6===0?.8:.86),-Math.cos(q)*r*(i%6===0?.8:.86));c.lineTo(Math.sin(q)*r*.96,-Math.cos(q)*r*.96);c.stroke();}
  ['N','3','6','E','12','15','S','21','24','W','30','33'].forEach((s,i)=>{c.save();c.rotate(i*30*D2R);T(c,s,0,-r*inner,s.length>1?sz*.85:sz);c.restore();});c.restore();}
const F={};
Object.assign(F,{
 // 36 UHF remote channel indicator: preset channel counter
 uhf:(c,P,W,H)=>{T(c,'UHF CHANNEL',0,-H*.36,H*.15,DIM);const ch=sv('uhfCh',7);win(c,0,H*.08,W*.62,H*.42,String(ch).padStart(2,'0')+'  '+(sv('ufn',1)?'T/R':'OFF'),H*.3);},
 // 2 airspeed / Mach indicator: knots pointer 80-850, Mach in a window
 asi:(c,P)=>{const v=Math.max(0,P.cas||0),a=t=>-150+Math.pow(lin(t,50,850),.78)*300;
   for(let t=50;t<=850;t+=10){const M=t%50===0;tick(c,R,a(t),M?.8:.9,.97,M?3:1.2);if(t%100===0||t===50)T(c,String(t/10),Math.cos((a(t)-90)*D2R)*R*.66,Math.sin((a(t)-90)*D2R)*R*.66,t===50?14:16);}
   T(c,'AIRSPEED',0,-R*.3,11,DIM);T(c,'KNOTS',0,-R*.16,10,DIM);T(c,'x10',0,-R*.04,9,DIM);win(c,0,R*.36,R*.62,R*.26,'M '+(P.mach||0).toFixed(2).replace(/^0/,''),15);
   {const mm=Math.min(1.5,(P.ac&&P.ac.mcap)||1.4);c.save();c.rotate(a(clamp(mm*661,50,850))*D2R);for(let i=0;i<6;i++){c.fillStyle=i%2?'#eee':'#d22';c.fillRect(-4,-R*(.99-i*.03),8,R*.03);}c.restore();}
   if(!instOn(P)&&false)flag(c,'OFF',0,-R*.5);needle(c,R*.9,a(Math.max(50,v)),.88,7);},
 // 6 heading indicator: rotating card, heading bug
 hdg:(c,P)=>{const hd=P.hdg||0;card(c,hd,R,.7,17);T(c,'HDG',0,R*.3,12,DIM);c.save();c.rotate((sv('hdgM',0)-hd)*D2R);c.fillStyle='#e8c040';c.fillRect(-5,-R*1.0,10,R*.13);c.restore();
   c.strokeStyle='#ffb21a';c.lineWidth=4;c.beginPath();c.moveTo(0,-R*.98);c.lineTo(0,-R*.5);c.stroke();c.fillStyle='#fff';c.beginPath();c.moveTo(0,-R*.2);c.lineTo(-R*.14,R*.14);c.lineTo(R*.14,R*.14);c.closePath();c.fill();if(!instOn(P))flag(c,'OFF',R*.55,-R*.5);},
 // 9 attitude indicator: sphere with CLIMB / DIVE legends, bank scale, slip-free
 adi:(c,P)=>{c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();c.rotate(-(P.bank||0));const k=R/46,po=(P.pitch||0)*R2D*k;
   c.fillStyle='#c9d6dc';c.fillRect(-R*2,-R*4+po,R*4,R*4);c.fillStyle='#3a2f26';c.fillRect(-R*2,po,R*4,R*4);c.fillStyle='#fff';c.fillRect(-R*2,po-1.5,R*4,3);
   c.strokeStyle='#fff';c.lineWidth=2;c.fillStyle='#fff';for(let d=-90;d<=90;d+=10){if(!d)continue;const y=po-d*k,w=d%20?R*.2:R*.38;c.beginPath();c.moveTo(-w,y);c.lineTo(w,y);c.stroke();if(!(d%20)){T(c,String(Math.abs(d)),-w-14,y,11);T(c,String(Math.abs(d)),w+14,y,11);}}
   T(c,'CLIMB',0,po-R*.62,13,'#fff');T(c,'DIVE',0,po+R*.62,13,'#fff');c.restore();
   c.save();c.rotate(-(P.bank||0));for(const a of[-60,-45,-30,-20,-10,0,10,20,30,45,60])tick(c,R,a,.88,.99,a%30?1.5:3,'#fff');c.restore();
   c.fillStyle='#ffb21a';c.fillRect(-R*.5,-2.5,R*.3,5);c.fillRect(R*.2,-2.5,R*.3,5);c.beginPath();c.arc(0,0,4,0,7);c.fill();c.beginPath();c.moveTo(0,-R*.99);c.lineTo(-7,-R*.9);c.lineTo(7,-R*.9);c.closePath();c.fill();if(!instOn(P))flag(c,'OFF',0,R*.45);},
 // 11 accelerometer -4 to +10 g, maximum and minimum recording pointers
 acc:(c,P)=>{P._minNz=Math.min(P._minNz==null?1:P._minNz,P.nz||1);scale(c,R,-150,150,14,2,[-4,-2,0,2,4,6,8,10],.64,19);T(c,'ACCELEROMETER',0,R*.34,9,DIM);T(c,'G',0,R*.5,12,DIM);
   const a=g=>-150+300*clamp((g+4)/14,0,1);needle(c,R,a(P.maxNz||1),.78,4,'#cfcfc8');needle(c,R,a(P._minNz),.78,4,'#cfcfc8');needle(c,R,a(P.nz||1));},
 // 16 hydraulic pressure gage 0-4000 psi (selector: FLIGHT CONTROL 1 / 2 / UTILITY)
 hyd:(c,P)=>{const p=running(P)?3000*(rpm(P)>35?1:rpm(P)/35):window.START&&P.eng&&P.eng.hyd?1500:0;scale(c,R,-140,140,16,4,['0','1','2','3','4'],.62,17);arc(c,R*.92,-140+280*.68,140,'#d33',5);T(c,'HYD',0,-R*.3,12,DIM);T(c,'PRESS',0,-R*.16,10,DIM);T(c,'PSI x1000',0,R*.5,9,DIM);
   T(c,['FLT 1','FLT 2','UTIL'][sv('hsel',0)],0,R*.3,9,DIM);needle(c,R,-140+280*clamp(p/4000,0,1));},
 // 17 oil pressure gage 0-100 psi
 oil:(c,P)=>{const p=running(P)?35+45*clamp(rpm(P)/100,0,1):0;scale(c,R,-140,140,20,2,['0','20','40','60','80','100'],.62,15);arc(c,R*.92,-140,-140+280*.1,'#d33',5);T(c,'OIL',0,-R*.3,13,DIM);T(c,'PRESS',0,-R*.14,10,DIM);T(c,'PSI',0,R*.5,10,DIM);needle(c,R,-140+280*clamp(p/100,0,1));},
 // 33 turn-and-slip
 tsi:(c,P,W,H)=>{const ball=clamp(-(P.beta||0)*R2D/6,-1,1);T(c,'TURN & SLIP',0,-H*.4,H*.12,DIM);T(c,'L',-W*.4,-H*.1,H*.16);T(c,'R',W*.4,-H*.1,H*.16);for(const k of[-1,0,1])tick(c,H*.7,k*22,.8,1,3);
   const nd=clamp(((P.bank||0)>0?1:-1)*Math.abs(P.hdgRate||0)*R2D/3,-1.2,1.2);c.save();c.translate(0,H*.25);c.rotate(nd*22*D2R);c.strokeStyle=INK;c.lineWidth=6;c.beginPath();c.moveTo(0,0);c.lineTo(0,-H*.5);c.stroke();c.restore();
   c.fillStyle='#111';c.fillRect(-W*.3,H*.28,W*.6,H*.14);c.strokeStyle='#ddd';c.lineWidth=2;c.strokeRect(-W*.3,H*.28,W*.6,H*.14);c.fillStyle='#e8e8e0';c.beginPath();c.arc(ball*W*.22,H*.35,H*.06,0,7);c.fill();},
 // 34 altimeter: three pointers (100 / 1 000 / 10 000 ft), barber-pole wedge below 10 000 ft, baro window
 alt:(c,P)=>{const h=Math.max(0,P.pos.y*3.2808);for(let i=0;i<50;i++)tick(c,R,i*7.2,i%5?.9:.84,.97,i%5?1.3:3);for(let d=0;d<10;d++){const q=(d*36-90)*D2R;T(c,String(d),Math.cos(q)*R*.7,Math.sin(q)*R*.7,18);}
   T(c,'ALT',0,-R*.42,13,DIM);const bp=sv('baro',29.92);win(c,R*.0,R*.46,R*.6,R*.2,bp.toFixed(2),11);if(h<10000){c.save();c.rotate(-.5);c.restore();barber(c,R*.55,-R*.55,R*.17);}
   needle(c,R,(h%100000)/100000*360,.5,9,'#cfcfc8');needle(c,R,(h%10000)/10000*360,.64,8,'#e8e8e0');needle(c,R*1.02,(h%1000)/1000*360,.92,6);},
 // 32 course indicator: heading window, bearing-deviation crossbar, TO / FROM
 crs:(c,P,W,H)=>{const t=tacan(),b=brgTo(P,t.x,t.z),cs=sv('crs',360),dv=clamp(dh(b,cs)/10,-1,1);T(c,'COURSE',0,-H*.42,H*.1,DIM);win(c,0,-H*.28,W*.4,H*.14,String(Math.round(P.hdg||0)%360).padStart(3,'0'),H*.1);
   c.strokeStyle='#555';c.lineWidth=2;for(let i=-2;i<=2;i++){if(!i)continue;c.beginPath();c.arc(i*W*.15,H*.05,3,0,7);c.stroke();}
   c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(-W*.4,H*.05);c.lineTo(W*.4,H*.05);c.stroke();c.strokeStyle='#ffb21a';c.lineWidth=5;c.beginPath();c.moveTo(dv*W*.3,-H*.2);c.lineTo(dv*W*.3,H*.3);c.stroke();
   c.fillStyle='#fff';c.beginPath();c.moveTo(0,-H*.12);c.lineTo(-W*.07,H*.0);c.lineTo(W*.07,H*.0);c.closePath();c.fill();T(c,Math.abs(dh(b,cs))<90?'TO':'FROM',W*.3,H*.38,H*.09,'#fff');if(!instOn(P))flag(c,'OFF',-W*.3,H*.38);},
 // 28 vertical velocity indicator +-6000 fpm
 vvi:(c,P)=>{const v=(P.vel?P.vel.y:0)*196.85/1000;scale(c,R,-170,-10,12,2,[6,4,2,1,0],.64,18);scale(c,R,10,170,12,2,[0,1,2,4,6],.64,18);T(c,'CLIMB',-R*.5,-R*.34,12,DIM);T(c,'DOWN',-R*.5,R*.28,11,DIM);T(c,'FPM x1000',R*.05,R*.5,9,DIM);
   const f=x=>{const a=Math.abs(x);return Math.sign(x)*(a<1?a*.25:a<2?.25+(a-1)*.2:.45+(a-2)/4*.55);};needle(c,R,-90+clamp(f(clamp(v,-6,6)),-1,1)*80);},
 // 18 tachometer: outer 50-110 % scale, inner dial for the fine reading
 tach:(c,P)=>{const r=rpm(P),a=x=>-150+300*lin(x,0,110);scale(c,R,-150,150,22,2,['0','10','20','30','40','50','60','70','80','90','100','110'],.7,13);arc(c,R*.93,a(100),150,'#d33');
   T(c,'RPM',0,-R*.34,12,DIM);T(c,'PERCENT',0,R*.28,9,DIM);c.save();c.translate(0,R*.1);c.beginPath();c.arc(0,0,R*.36,0,7);c.fillStyle='#050505';c.fill();c.strokeStyle='#777';c.lineWidth=2;c.stroke();for(let i=0;i<10;i++)tick(c,R*.36,i*36,.78,.98,1.6);needle(c,R*.36,(r%10)*36,.85,3,'#fff');c.restore();
   needle(c,R,a(clamp(r,0,110)),.9,7);},
 // 19 engine differential pressure gage 0-50 in. Hg
 dp:(c,P)=>{scale(c,R,-140,140,25,5,['0','10','20','30','40','50'],.62,16);T(c,'ENGINE',0,-R*.34,10,DIM);T(c,'DIFF PRESS',0,-R*.2,9,DIM);T(c,'IN. HG',0,R*.5,10,DIM);needle(c,R,-140+280*clamp(dpr(P)/50,0,1));},
 // 31 TACAN range indicator: DISTANCE NAUTICAL MILES counter
 dist:(c,P,W,H)=>{const t=tacan(),d=Math.min(999.9,dstTo(P,t.x,t.z));T(c,'DISTANCE',0,-H*.38,H*.12,DIM);win(c,0,0,W*.7,H*.3,(instOn(P)?d.toFixed(1).padStart(5,'0'):'-----'),H*.24);T(c,'NAUTICAL MILES',0,H*.32,H*.1,DIM);},
 // 30 radio magnetic indicator: heading card, TACAN bearing needle (single) and ADF needle (double)
 rmi:(c,P)=>{const hd=P.hdg||0,t=tacan(),b=brgTo(P,t.x,t.z);card(c,hd,R,.7,16);c.strokeStyle='#ffb21a';c.lineWidth=4;c.beginPath();c.moveTo(0,-R*.98);c.lineTo(0,-R*.55);c.stroke();
   c.save();c.rotate((b-hd)*D2R);c.strokeStyle='#e8e8e0';c.lineWidth=5;c.beginPath();c.moveTo(0,-R*.82);c.lineTo(0,R*.82);c.stroke();c.beginPath();c.moveTo(0,-R*.82);c.lineTo(-8,-R*.62);c.lineTo(8,-R*.62);c.closePath();c.fillStyle='#e8e8e0';c.fill();c.restore();
   c.save();c.rotate((b+8-hd)*D2R);c.strokeStyle='#8ac';c.lineWidth=2.5;c.beginPath();c.moveTo(-4,-R*.7);c.lineTo(-4,R*.7);c.moveTo(4,-R*.7);c.lineTo(4,R*.7);c.stroke();c.restore();if(!instOn(P))flag(c,'OFF',R*.5,-R*.5);},
 // 29 clock
 clk:(c,P)=>{const d=new Date();scale(c,R,0,330,59,5,[12,1,2,3,4,5,6,7,8,9,10,11],.68,22);needle(c,R,((d.getHours()%12)+d.getMinutes()/60)*30,.5,8);needle(c,R,d.getMinutes()*6,.8,6);needle(c,R,d.getSeconds()*6,.88,2.5,'#e33');},
 // 26 fuel quantity, lb x 1000 (test button drives the pointer to zero)
 fq:(c,P)=>{scale(c,R,-150,150,20,2,['0','1','2','3','4','5','6','7','8','9','10'],.66,15);T(c,'FUEL',0,-R*.3,13,DIM);T(c,'QUANTITY',0,-R*.14,10,DIM);T(c,'LBS x1000',0,R*.5,9,DIM);needle(c,R,-150+300*(qtyTest>now()?0:clamp(fuelLb(P)/10000,0,1)),.86,8);},
 // 20 fuel flow indicator, pph x 1000
 ff:(c,P)=>{scale(c,R,-150,150,16,2,['0','5','10','15','20','25','30','35','40'],.66,15);T(c,'FUEL FLOW',0,-R*.28,11,DIM);T(c,'PPH x1000',0,R*.5,9,DIM);needle(c,R,-150+300*clamp(ffl(P)/40000,0,1));},
 // 21 exhaust temperature gage, degrees C x 1000
 egt:(c,P)=>{const t=egt(P);scale(c,R,-150,150,20,4,['0','.2','.4','.6','.8','1.0'],.66,16);arc(c,R*.93,-150+300*.88,150,'#d33',5);T(c,'EXHAUST',0,-R*.34,10,DIM);T(c,'TEMP',0,-R*.2,10,DIM);T(c,'°C x1000',0,R*.5,9,DIM);needle(c,R,-150+300*clamp(t/1000,0,1));},
 // 24 cockpit pressure altitude
 cab:(c,P)=>{const h=P.pos.y*3.2808,ca=h<8000?h:Math.max(8000,8000+(h-8000)*.35);scale(c,R,-150,150,10,2,['0','10','20','30','40','50'],.64,17);T(c,'COCKPIT',0,R*.28,10,DIM);T(c,'PRESS ALT',0,R*.42,9,DIM);needle(c,R,-150+300*clamp(ca/50000,0,1));},
 // loadmeter
 ldm:(c,P)=>{scale(c,R,-120,120,10,5,['0','.5','1.0'],.62,16);T(c,'LOAD',0,-R*.34,12,DIM);T(c,'METER',0,R*.4,10,DIM);needle(c,R,-120+240*clamp(powered(P)?.35+.25*(P.thr||0):0,0,1));}});
// [key, x, y, width, height, drawer, round] in manual figure 1-5 display units
const INST=[
 ['uhf',375,636,110,70,F.uhf,0],['asi',527,642,156,156,F.asi,1],['hdg',673,632,144,144,F.hdg,1],['adi',843,645,164,164,F.adi,1],['acc',975,650,132,132,F.acc,1],['hyd',1088,665,84,84,F.hyd,1],['oil',1193,665,94,94,F.oil,1],
 ['tsi',365,808,120,84,F.tsi,0],['alt',528,808,152,152,F.alt,1],['crs',683,792,130,130,F.crs,0],['vvi',838,795,144,144,F.vvi,1],['tach',1027,803,154,154,F.tach,1],['dp',1192,808,164,164,F.dp,1],
 ['dist',378,982,116,96,F.dist,0],['rmi',517,975,132,132,F.rmi,1],['clk',655,985,88,88,F.clk,1],['fq',835,968,152,152,F.fq,1],['ff',1010,972,144,144,F.ff,1],['egt',1180,975,152,152,F.egt,1],
 ['cab',885,1155,100,100,F.cab,1],['ldm',1205,515,70,70,F.ldm,1]];
// annunciators [key,x,y,w,h,legend,colour,lit(P)] on the instrument panel and glareshield
const MSLON=n=>P=>{try{return!!game.arm&&String(game.wsel||'').indexOf('AIM')===0&&n<=Math.min(4,(P.stn?Object.values(P.stn).filter(s=>s&&String(s).indexOf('AIM')===0).length:2));}catch(e){return false;}};
const LAMPS=[
 ['m1',500,400,52,26,'MISSILE\n1','#4c4',MSLON(1)],['m2',558,400,52,26,'MISSILE\n2','#4c4',MSLON(2)],['m3',616,400,52,26,'MISSILE\n3','#4c4',MSLON(3)],['m4',674,400,52,26,'MISSILE\n4','#4c4',MSLON(4)],
 ['mr',770,400,70,26,'M1 RELEASE','#fb3',P=>false],
 ['fire',690,490,50,30,'FIRE','#f33',P=>(P.fire||0)>0||fireTest>now()],
 ['ovh',695,525,60,24,'OVERHEAT','#fb3',P=>(P.dm&&P.dm.eng<=.4&&running(P))||fireTest>now()],
 ['fsf',1130,490,62,26,'FLT SYS\nFAIL','#fb3',P=>!powered(P)||(sv('yd',1)===0&&sv('pd',1)===0)]];
const LEFTPL=[['EMERG FUEL\nREGULATOR ON','#fb3',P=>sv('fuelReg',0)===1],['GUIDE VANE\nANTI-ICE ON','#fb3',P=>sv('gvai',0)===1],['ENG FUEL\nPUMP FAIL','#f33',P=>running(P)&&P.totalFuel<=0],
  ['ENG OIL\nOVERHEATED','#f33',P=>running(P)&&P.dm&&P.dm.eng<=.4],['YAW DAMPER\nOUT','#fb3',P=>sv('yd',1)===0],['CANOPY NOT\nLOCKED','#f33',P=>sv('cnpO',0)===1]];
const RIGHTPL=[['HEAT & VENT\nOVERHEATED','#fb3',P=>false],['PITCH DAMP\nOUT','#fb3',P=>sv('pd',1)===0],['POWER\nINVERTER OUT','#f33',P=>!powered(P)||sv('pinv',1)===0],
  ['TRIMMED FOR\nTAKE OFF','#4c4',P=>!!P.onGnd&&sv('ttko',1)===1],['INSTRUMENT\nINVERTER OUT','#f33',P=>!powered(P)||sv('iinv',0)===1],['GENERATOR\nOFF','#fb3',P=>!(P.eng?P.eng.gen:true)]];

/* ---------------- build ---------------- */
function build(ctx){const{g,box,LM,liveTex}=ctx;const ctls=[],upd=[],lamps=[];
  const hit=new THREE.MeshBasicMaterial({visible:false});
  const q=(v,s)=>Math.round((v||0)*s);
  const FASTK=new Set(['asi','hdg','adi','acc','tsi','alt','crs','vvi','rmi','dist']);
  const gate=k=>{let last=null;const fast=FASTK.has(k);return()=>{const key=fast?FK:SK;if(key===last)return false;last=key;return true;};};
  const pm=LM(0x3a3e41,12),dk=LM(0x1b1d1f,8),blk=LM(0x0b0c0d,4),bz=LM(0x141618,40),met=LM(0x9aa0a4,60);
  const board=new THREE.Group();board.position.set(0,-.45,-.74);board.rotation.x=-.18;g.add(board);
  // outline traced from Fig 1-5: shoulders, glareshield strip with the missile lights, panel, lower right instrument group
  const OUT=[[272,1092],[272,590],[315,545],[395,495],[450,455],[450,372],[870,372],[1120,372],[1120,455],[1200,470],[1262,505],[1292,560],[1292,1340],[700,1340],[700,1092]];
  const sh=new THREE.Shape();OUT.forEach(([x,y],i)=>i?sh.lineTo(bx(x),by(y)):sh.moveTo(bx(x),by(y)));
  const X0=272,Y0=372,W0=1020,H0=968,bg=document.createElement('canvas');bg.width=1530;bg.height=1452;const SX=bg.width/W0,SY=bg.height/H0,fx=x=>(x-X0)*SX,fy=y=>(y-Y0)*SY;
  {const c=bg.getContext('2d');c.fillStyle='#26292a';c.fillRect(0,0,bg.width,bg.height);
    const lab=(s,x,y,sz=11,al='center',col='#e9e9e2')=>{c.font=`bold ${sz*SX}px Arial`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;s.split('\n').forEach((l,i,a)=>c.fillText(l,fx(x),fy(y)+(i-(a.length-1)/2)*(sz+2)*SY));};
    const box2=(x0,y0,x1,y1,col='#141516')=>{c.fillStyle=col;c.fillRect(fx(x0),fy(y0),(x1-x0)*SX,(y1-y0)*SY);};
    box2(470,378,830,425,'#0f1011');lab('ARMAMENT',650,388,8);
    lab('FIRE WARN\nTEST',745,556,7);lab('COMPASS SLAVING',625,470,7);lab('IN      OUT',625,520,7);lab('HDG FAST SLAVE',540,484,7);lab('UHF',410,470,9);lab('RADIO CALL',410,495,7);
    lab('DRAG CHUTE',355,420,7);lab('V.G. ERECT',900,486,7);lab('TRIGGER SAFETY',950,486,7);lab('GUNS CAM  CAM  MSL CAM',950,520,6);lab('HYD PRESS SEL',1075,520,7);lab('FLT 1  FLT 2  UTIL',1075,575,6);lab('LOADMETER',1205,548,7);
    lab('DROP TANK EMERG\nJETTISON',740,1235,7);lab('BOMB-TARGET WIND',885,1332,7);lab('EMER LDG GR',1275,1180,7);lab('FUEL QTY TEST',940,1075,7);
    c.fillStyle='rgba(255,255,255,.22)';for(const [x,y] of[[300,600],[1270,560],[470,380],[1100,380],[300,1080],[1270,1320],[720,1320]]){c.beginPath();c.arc(fx(x),fy(y),5,0,7);c.fill();}}
  const bgT=new THREE.CanvasTexture(bg);bgT.anisotropy=8;ctx.o.tex.push(bgT);
  const geo=new THREE.ShapeGeometry(sh);{const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i)/K+OX,y=OY-p.getY(i)/K;uv.setXY(i,(x-X0)/W0,1-(y-Y0)/H0);}uv.needsUpdate=true;}
  const faceM=new THREE.MeshBasicMaterial({map:bgT,toneMapped:false});ctx.o.faces.push(faceM);const bm=new THREE.Mesh(geo,faceM);bm.userData.cwFx=1;board.add(bm);
  {const eg=new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false});const e=new THREE.Mesh(eg,pm);e.position.z=-.031;e.userData.cwFx=1;board.add(e);}
  const glsM=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.08,shininess:140,specular:0x8a8a8a,depthWrite:false});
  function inst(k,x,y,w,h,draw,round){const S=Math.max(w,h)>=120?256:192,cw=S,ch=Math.max(64,Math.round(S*h/w)),cv=document.createElement('canvas');cv.width=cw;cv.height=round?cw:ch;const t=new THREE.CanvasTexture(cv);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;ctx.o.tex.push(t);
    const c=cv.getContext('2d'),r=w*K/2,rh=h*K/2;
    if(round){const cs=new THREE.Mesh(new THREE.CylinderGeometry(r*1.03,r*1.08,.03,36),bz);cs.rotation.x=Math.PI/2;cs.position.set(bx(x),by(y),.008);cs.userData.cwFx=1;board.add(cs);}
    else{box(board,w*K*1.08,h*K*1.1,.03,bz,bx(x),by(y),.008);}
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const fm=new THREE.Mesh(round?new THREE.CircleGeometry(r*.9,48):new THREE.PlaneGeometry(w*K*.94,h*K*.9),m);fm.position.set(bx(x),by(y),.0235);fm.userData.cwFx=1;board.add(fm);
    if(round){const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.92,r*.05,8,40),LM(0x0a0a0a,30));ring.position.set(bx(x),by(y),.0245);ring.userData.cwFx=1;board.add(ring);
      const gl=new THREE.Mesh(new THREE.CircleGeometry(r*.92,40),glsM);gl.position.set(bx(x),by(y),.026);gl.userData.cwFx=1;gl.renderOrder=2;board.add(gl);}
    else{const gl=new THREE.Mesh(new THREE.PlaneGeometry(w*K*.94,h*K*.9),glsM);gl.position.set(bx(x),by(y),.026);gl.userData.cwFx=1;gl.renderOrder=2;board.add(gl);}
    for(const [sx,sy] of[[-1,-1],[1,-1],[-1,1],[1,1]]){const s=new THREE.Mesh(new THREE.CylinderGeometry(r*.06,r*.06,.004,8),met);s.rotation.x=Math.PI/2;s.position.set(bx(x)+sx*(round?r*.8:r*.98),by(y)+sy*(round?r*.8:rh*1.02),.024);board.add(s);}
    const gt=gate(k);upd.push(P=>{if(!gt())return;face(c,cv.width,cv.height);if(round)c.scale(cv.width/256,cv.width/256);else c.scale(cv.width/256,cv.width/256);draw(c,P,round?256:256,round?256:256*h/w);t.needsUpdate=true;});}
  INST.forEach(([k,x,y,w,h,d,rd])=>inst(k,x,y,w,h,d,rd));
  function lampAt(par,x,y,z,w,h,lg,col,lit,ww,hh){const cv=document.createElement('canvas');cv.width=128;cv.height=Math.max(32,Math.round(128*hh/ww));const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const lm=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);lm.position.set(x,y,z);lm.userData.cwFx=1;par.add(lm);let last=null;
    lamps.push(P=>{const on=lampTest>now()||!!lit(P);if(on===last)return;last=on;c.fillStyle=on?col:'#1c1a14';c.fillRect(0,0,cv.width,cv.height);const n=lg.split('\n');c.font=`bold ${Math.round(cv.height*(n.length>1?.3:.42))}px Arial`;c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=on?'#200':'#5a5444';n.forEach((l,i,a)=>c.fillText(l,64,cv.height/2+(i-(a.length-1)/2)*cv.height*.36));t.needsUpdate=true;});return lm;}
  LAMPS.forEach(([k,x,y,w,h,lg,col,lit])=>{lampAt(board,bx(x),by(y),.016,w*K,h*K,lg,col,lit,w,h);box(board,w*K+.004,h*K+.004,.012,blk,bx(x),by(y),.009);});
  // A-4 sight head on the glareshield is built by the base cockpit; the radar lock-on light sits on it
  box(g,.012,.012,.006,LM(0x222222,10),.045,-.2,-.742);
  {const lo=new THREE.Mesh(new THREE.CircleGeometry(.0055,12),new THREE.MeshBasicMaterial({color:0x331100,toneMapped:false}));lo.position.set(.045,-.2,-.7385);g.add(lo);ctx.o.faces.push(lo.material);let la=null;
   upd.push(P=>{const on=!!(window.ACMR&&ACMR.locked())||lampTest>now();if(on===la)return;la=on;lo.material.color.setHex(on?0xff3a20:0x331100);});}

  /* ---------- clickable controls ---------- */
  function reg(par,mesh,name,state,act){mesh.userData.ctl={meshes:[mesh],name,state,act:(d)=>{try{act(d);}catch(e){console.warn('[f100pit]',name,e);}try{sfx.click();}catch(e){}}};ctls.push(mesh.userData.ctl);}
  function toggle(par,x,y,z,name,pos,get,set,o={}){const gq=new THREE.Group();gq.position.set(x,y,z);if(o.rx)gq.rotation.x=o.rx;par.add(gq);
    const nut=new THREE.Mesh(new THREE.CylinderGeometry(.0065,.0065,.004,12),met);nut.rotation.x=Math.PI/2;gq.add(nut);
    const lv=new THREE.Group();gq.add(lv);const st=new THREE.Mesh(new THREE.CylinderGeometry(.0022,.0028,.022,8),LM(o.col||0xd8d8d0,50));st.position.y=.011;lv.add(st);
    if(o.guard){const gd=new THREE.Group();gq.add(gd);box(gd,.02,.004,.03,LM(0xc8281e,30),0,.002,.014);gq.userData.guard=gd;}
    const h=new THREE.Mesh(new THREE.BoxGeometry(.026,.03,.03),hit);h.userData.cwFx=1;gq.add(h);
    const n=pos.length;let cur=-1;upd.push(()=>{const i=clamp(get(),0,n-1);if(i===cur)return;cur=i;lv.rotation.x=n===2?(i?-.55:.55):(i-(n-1)/2)*-.6;if(gq.userData.guard)gq.userData.guard.rotation.x=o.guardUp&&o.guardUp()?-1.6:0;});
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
  // --- instrument panel controls (Fig 1-5) ---
  button(board,bx(745),by(540),.03,9*K,'FIRE WARNING TEST BUTTON',0x772222,()=>{fireTest=now()+2;});
  toggle(board,bx(625),by(495),BZ,'COMPASS SLAVING SWITCH · IN / OUT',['IN','OUT'],()=>sv('cmpS',0),v=>{ST.cmpS=v;});
  button(board,bx(540),by(503),.03,9*K,'HEADING INDICATOR FAST SLAVE BUTTON',0x555555,()=>{const P=PL();if(P)ST.hdgM=Math.round(P.hdg||0);});
  button(board,bx(900),by(505),.03,10*K,'V.G. ERECT PUSH PLATE',0x444444,()=>{try{radio('VERTICAL GYRO · FAST ERECT');}catch(e){}});
  knob(board,bx(950),by(505),.03,10*K,'TRIGGER SAFETY SWITCH · GUNS CAMERA / CAMERA / MISSILE CAMERA',['GUNS CAMERA','CAMERA','MISSILE CAMERA'],'trs',()=>sv('trs',1));
  knob(board,bx(1075),by(550),.03,11*K,'HYDRAULIC PRESSURE SELECTOR · FLIGHT CONTROL 1 / 2 / UTILITY',['FLIGHT CONTROL 1','FLIGHT CONTROL 2','UTILITY'],'hsel',()=>sv('hsel',0));
  knob(board,bx(640),by(700),.03,9*K,'HEADING INDICATOR SET KNOB',Array.from({length:12},(_,i)=>String(i*30).padStart(3,'0')),'hdgK',()=>Math.round(sv('hdgM',0)/30)%12,v=>{ST.hdgM=v*30;});
  knob(board,bx(700),by(870),.03,9*K,'COURSE INDICATOR COURSE SET',Array.from({length:12},(_,i)=>String(i*30).padStart(3,'0')),'crsK',()=>Math.round(sv('crs',360)/30)%12,v=>{ST.crs=v*30;});
  knob(board,bx(590),by(885),.03,9*K,'ALTIMETER SETTING KNOB',['28.1','29.0','29.92','30.5','31.0'],'baroK',()=>sv('baroK',2),v=>{ST.baroK=v;ST.baro=[28.1,29.0,29.92,30.5,31.0][v];});
  button(board,bx(940),by(1045),.03,9*K,'FUEL QUANTITY TEST BUTTON',0x555555,()=>{qtyTest=now()+3;});
  button(board,bx(330),by(715),.03,8*K,'ACCELEROMETER · PUSH TO SET',0x333333,()=>{const P=PL();if(P){P.maxNz=1;P._minNz=1;}});
  hitBox(board,bx(355),by(440),.02,44*K,34*K,'DRAG CHUTE HANDLE',()=>sv('chute',0)?'DEPLOYED':'STOWED',()=>{ST.chute=1;try{if(typeof deployChute==='function')deployChute();else radio('DRAG CHUTE');}catch(e){}});
  hitBox(board,bx(740),by(1190),.02,50*K,36*K,'DROP TANK EMERGENCY JETTISON HANDLE',()=>'PULL',()=>{try{radio('EXTERNAL TANKS · JETTISON');if(typeof jettison==='function')jettison();}catch(e){}});
  hitBox(board,bx(1275),by(1135),.02,54*K,54*K,'LANDING GEAR EMERGENCY LOWERING HANDLE',()=>gearDn()?'DOWN':'STOWED',()=>{try{if(!gearDn())CTL.map.KeyG.fn();}catch(e){}});
  knob(board,bx(885),by(1290),.03,11*K,'BOMB-TARGET WIND CONTROL',['0','10','20','30','40'],'btw',()=>sv('btw',0));

  const CY=-.64,CW=.2,CZ0=-.54,CZ1=.3;
  function cpanel(side,u0,u1,z0,z1,title,draw){const w=CW*(u1-u0),xo=side*(.43+CW/2)-side*CW*((u0+u1)/2),d=z1-z0,cv=document.createElement('canvas');cv.width=Math.max(64,Math.round(w*1500));cv.height=Math.max(48,Math.round(d*1500));const c=cv.getContext('2d');
    c.fillStyle='#2b2f32';c.fillRect(0,0,cv.width,cv.height);c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=3;c.strokeRect(3,3,cv.width-6,cv.height-6);
    c.font='bold 15px Arial';c.textAlign='center';c.fillStyle='#ececE4';if(title)c.fillText(title,cv.width/2,19);if(draw)draw(c,cv.width,cv.height);
    for(const [sx,sy] of[[9,9],[cv.width-9,9],[9,cv.height-9],[cv.width-9,cv.height-9]]){c.fillStyle='rgba(255,255,255,.3)';c.beginPath();c.arc(sx,sy,3.5,0,7);c.fill();}
    const t=new THREE.CanvasTexture(cv);t.anisotropy=4;ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);pl.rotation.x=-Math.PI/2;pl.position.set(xo,CY+.001,(z0+z1)/2);pl.userData.cwFx=1;g.add(pl);
    return{w,d,at:(u,v,h=.004)=>[xo-w/2+u*w,CY+h,z0+v*d],lab:(s,u,v,sz=11)=>{c.font=`bold ${sz}px Arial`;c.textAlign='center';c.fillStyle='#e0e0d8';s.split('\n').forEach((l,i)=>c.fillText(l,u*cv.width,v*cv.height+i*(sz+2)));t.needsUpdate=true;}};}
  const tg=(p,u,v,name,pos,get,set,o={})=>{const[x,y,z]=p.at(u,v);return toggle(g,x,y,z,name,pos,get,set,Object.assign({rx:-Math.PI/2},o));};
  const kn=(p,u,v,r,name,pos,key,get,set,o={})=>{const[x,y,z]=p.at(u,v,.006);return knob(g,x,y,z,r,name,pos,key,get,set,Object.assign({rx:-Math.PI/2},o));};
  const zL=y=>CZ0+(y-60)/(1540-60)*(CZ1-CZ0);
  const T_=(u,v,n,p,k,d=0,x={})=>Object.assign({t:'t',u,v,n,p,k,d},x),K_=(u,v,n,p,k,d=0,x={})=>Object.assign({t:'k',u,v,n,p,k,d},x),B_=(u,v,n,act,x={})=>Object.assign({t:'b',u,v,n,act},x);
  function panel(side,u0,u1,y0,y1,title,items,draw){const p=side<0?cpanel(-1,u0,u1,zL(y0),zL(y1),title,draw):cpanel(1,1-u1,1-u0,zL(y0),zL(y1),title,draw);
    for(const it of items||[]){const get=it.g||(()=>sv(it.k,it.d)),set=it.s||(x=>{ST[it.k]=x;});
      if(it.t==='t')tg(p,it.u,it.v,it.n,it.p,get,set,it.o||{});else if(it.t==='k')kn(p,it.u,it.v,it.r||.009,it.n,it.p,it.k,get,set,it.o||{});
      else{const[x,y,z]=p.at(it.u,it.v,.006);button(g,x,y,z,it.r||.006,it.n,it.col||0x2a2a2a,it.act||(()=>{}));}
      const lb=it.l!=null?it.l:it.n.replace(/\s*\(.*$/,'').replace(/ · .*/,'');if(lb){const ws=lb.split(' '),ln=[''];for(const w of ws){if((ln[ln.length-1]+' '+w).trim().length>10&&ln[ln.length-1])ln.push(w);else ln[ln.length-1]=(ln[ln.length-1]+' '+w).trim();}p.lab(ln.join('\n'),it.u,Math.min(.92,it.v+(it.ly!=null?it.ly:.24)),7);}}
    return p;}
  // caution placards laid flat on a console panel
  function placards(p,list,u0,v0,cols,du,dv){list.forEach(([lg,col,lit],i)=>{const u=u0+(i%cols)*du,v=v0+Math.floor(i/cols)*dv,[x,y,z]=p.at(u,v,.003),lm=lampAt(g,x,y,z,p.w*du*.9,p.d*dv*.82,lg,col,lit,100,34);lm.rotation.x=-Math.PI/2;});}
  [-1,1].forEach(sd=>{box(g,.22,.1,.98,LM(0x2a2d30,8),sd*.43,CY-.052,-.15);box(g,.05,.1,1.3,LM(0x25282a,8),sd*.555,-.55,-.2);});
  {const sk=LM(0x1c1f21,6);box(g,1.14,.02,1.5,sk,0,-1.23,-.1);[-1,1].forEach(sd=>box(g,.03,.66,1.3,sk,sd*.565,-.93,-.2));box(g,1.1,.5,.03,sk,0,-1.0,-.86);box(g,.9,.42,.02,sk,0,-.52,-.83);}
  const eng=P=>P&&P.eng?P.eng:null;
  // ======== LEFT CONSOLE (Fig 1-6) — u 0 = outboard, top = forward ========
  const LC=(u0,u1,y0,y1,t,it,d)=>panel(-1,u0,u1,y0,y1,t,it,d);
  // 20 landing gear control panel (inboard, forward), 22 landing gear handle
  LC(.45,1,60,300,'LANDING GEAR CONTROL PANEL (20)',[
    T_(.3,.28,'LANDING GEAR HANDLE (22) · UP / DOWN',['UP','DOWN'],'gearH',0,{g:()=>gearDn()?1:0,s:()=>{try{CTL.map.KeyG.fn();}catch(e){}},l:'LANDING GEAR'}),
    B_(.7,.28,'LANDING GEAR EMERGENCY UP BUTTON',()=>{},{col:0xc03020,r:.007,l:'EMERG UP'}),
    T_(.3,.65,'LANDING & TAXI LIGHTS · ON / OFF',['OFF','ON'],'ltx',0,{l:'LDG & TAXI'}),T_(.7,.65,'PITOT HEATER · ON / OFF',['OFF','ON'],'pitot',0,{l:'PITOT HEAT'}),
    B_(.5,.88,'LANDING GEAR WARNING HORN CUTOUT BUTTON',()=>{},{r:.006,l:'HORN CUTOUT'})],
    (c,w,h)=>{[['N',.22],['L',.5],['R',.78]].forEach(([s,u])=>{c.fillStyle='#183a18';c.fillRect(w*(u-.09),h*.07,w*.18,h*.08);c.fillStyle='#bde8bd';c.font='bold 11px Arial';c.textAlign='center';c.fillText(s,w*u,h*.125);});c.fillStyle='#e0e0d8';c.font='bold 8px Arial';c.fillText('ANTI SKID OFF',w*.5,h*.19);});
  // 19 indicator-caution-warning light panel
  {const p=LC(.45,1,300,480,'CAUTION · WARNING LIGHTS (19)',[]);placards(p,LEFTPL,.26,.32,2,.48,.3);}
  // 21 air conditioning control panel
  LC(.45,1,480,640,'AIR CONDITIONING (21)',[K_(.3,.4,'CABIN TEMPERATURE · AUTO / MAN COLD / MAN HOT',['MAN COLD','AUTO','MAN HOT'],'ctk',1,{r:.01,l:'TEMP'}),K_(.7,.4,'CABIN AIR · RAM / NORM / DEFOG',['RAM','NORMAL','DEFOG'],'cabAir',1,{r:.01,l:'CABIN AIR'}),T_(.5,.82,'CANOPY DEFROST · ON / OFF',['OFF','ON'],'cdef',0,{l:'CANOPY DEFROST'})]);
  // 24 UHF command radio control panel, 23 AGM-12B missile control panel
  LC(.45,1,640,780,'UHF COMMAND RADIO (24)',[K_(.28,.45,'UHF FUNCTION · OFF / T/R / T/R+G / ADF',['OFF','T/R','T/R+G','ADF'],'ufn',1,{r:.01,l:'FUNCTION'}),K_(.72,.45,'UHF PRESET CHANNEL',Array.from({length:20},(_,i)=>String(i+1)),'uhfCh',6,{g:()=>sv('uhfCh',7)-1,s:v=>{ST.uhfCh=v+1;},r:.013,l:'CHANNEL'})]);
  LC(.45,1,780,860,'AGM-12B MISSILE CONTROL (23)',[T_(.35,.5,'AGM-12B MASTER · ON / OFF',['OFF','ON'],'agm',0,{l:'AGM-12B'}),T_(.7,.5,'AGM-12B MODE',['SAFE','ARM'],'agmA',0,{l:'MODE'})]);
  // 27 engine and armament control panel (Fig 1-10)
  LC(.45,1,860,1160,'ENGINE & ARMAMENT CONTROL (27)',[
    T_(.2,.1,'ENGINE MASTER SWITCH · ON / OFF',['OFF','ON'],'engM',0,{g:()=>eng(PL())&&eng(PL()).fm?1:0,s:()=>{},l:'ENG MASTER'}),
    T_(.5,.1,'AIR START SWITCH · ON / OFF',['OFF','ON'],'airS',0,{l:'AIR START'}),
    T_(.8,.1,'FUEL REGULATOR · NORM / EMER',['NORM','EMER'],'fuelReg',0,{l:'FUEL REG'}),
    T_(.2,.4,'GUIDE VANE ANTI-ICE · AUTO / ON / OFF',['AUTO','ON','OFF'],'gvai',0,{l:'GUIDE VANE A/I'}),
    K_(.62,.42,'SIGHT & RADAR / MANUAL / DIVE / OFF · mode selector',['SIGHT & RADAR','MANUAL','DIVE','OFF'],'sgm',0,{r:.012,l:'SIGHT MODE',g:()=>{try{if(radar.power!=='ON')return 3;}catch(e){}return sv('sgm',0)===3?0:sv('sgm',0);},s:v=>{ST.sgm=v;try{radar.power=v===3?'OFF':'ON';if(v!==3)radar.warm=Math.max(radar.warm||0,3);}catch(e){}}}),
    T_(.88,.45,'SIGHT FILAMENT · PRI / SEC',['PRI','SEC'],'sfil',0,{l:'SIGHT FIL'}),
    T_(.2,.72,'ANTI-SKID · ARM / ON / OFF',['OFF','ARM','ON'],'askid',1,{l:'ANTI-SKID'}),
    T_(.5,.72,'BOMB ARMING · NOSE & TAIL / SAFE / TAIL ONLY',['SAFE','NOSE & TAIL','TAIL ONLY'],'barm',0,{l:'BOMB ARM'}),
    T_(.8,.72,'ARMAMENT SELECTOR · NOR / OFF / ALT (master arm)',['OFF','NOR'],'armS',0,{g:()=>game.arm?1:0,s:v=>{try{setArm(v?0:1);}catch(e){game.arm=!!v;}},l:'ARMAMENT SEL'})]);
  // 28 AIM-9B missile control panel, 29 circuit breakers, 31 missile circuit breakers
  LC(.45,1,1160,1260,'AIM-9B MISSILE CONTROL (28)',[T_(.3,.5,'AIM-9B MASTER · ON / OFF',['OFF','ON'],'aim9',1,{g:()=>String(game.wsel||'').indexOf('AIM')===0?1:0,s:()=>{try{if(typeof MSL!=='undefined'){const m=MSL['AIM-9B']?'AIM-9B':'AIM-9E';if(MSL[m])game.wsel=m;}}catch(e){}},l:'AIM-9B'}),K_(.7,.5,'MISSILE SELECT · STATIONS',['1','2','1+2','ALL'],'msel',2,{r:.009,l:'STATION'})]);
  LC(.45,1,1260,1500,'CIRCUIT BREAKERS (29 / 31)',[],(c,w,h)=>{c.fillStyle='#17191a';c.fillRect(w*.06,h*.12,w*.88,h*.8);c.fillStyle='#d8d8d0';for(let i=0;i<6;i++)for(let j=0;j<8;j++){c.beginPath();c.arc(w*(.16+i*.13),h*(.2+j*.09),3.4,0,7);c.fill();}});
  // outboard column: throttle quadrant (25), friction lever (12), drop tank jettison (26), sight selector (10), armament (8), CBs, anti-G (4), camera (6)
  {const thq=panel(-1,0,.45,60,420,'THROTTLE (25)',[K_(.5,.76,'THROTTLE FRICTION LEVER (12)',['OFF','LOW','HIGH'],'tfr',0,{r:.009,l:'FRICTION'}),B_(.5,.9,'DROP TANK JETTISON BUTTON (26)',()=>{try{radio('EXTERNAL TANKS · JETTISON');if(typeof jettison==='function')jettison();}catch(e){}},{col:0xc8a020,r:.007,l:'TANKS JETT'})]);
    const tq=new THREE.Group();g.add(tq);const[x0,y0]=thq.at(.5,0);tq.position.set(x0,y0,zL(190));
    const arm=new THREE.Group();tq.add(arm);box(arm,.01,.11,.012,met,0,.055,0);const grip=new THREE.Group();grip.position.y=.11;arm.add(grip);
    box(grip,.034,.05,.065,LM(0x1c1c1c,25),-.006,0,0);box(grip,.012,.012,.012,LM(0xb02020,30),-.022,.018,-.014);box(grip,.01,.016,.01,LM(0x777777,30),-.024,-.008,.012);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.06,.07,.08),hit);hb.userData.cwFx=1;grip.add(hb);
    reg(grip,hb,'THROTTLE (25) · range twist control, speed brake switch and mic switch on the grip',()=>{const P=PL();return Math.round((P?P.thr:0)*100)+'%'+(P&&P.ab>.1?' · AFTERBURNER':'');},()=>{});
    upd.push(P=>{arm.rotation.x=.32-(P.thr||0)*.8;arm.rotation.z=P.ab>.1?-.12:0;});
    const sbh=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,.02),hit);sbh.position.set(-.024,-.008,.012);sbh.userData.cwFx=1;grip.add(sbh);
    reg(grip,sbh,'SPEED BRAKE SWITCH (throttle grip)',()=>keys.has('KeyB')?'OUT':'IN',()=>{if(keys.has('KeyB'))keys.delete('KeyB');else keys.add('KeyB');});}
  LC(0,.45,420,560,'SIGHT SELECTOR UNIT (10)',[T_(.2,.4,'SIGHT MODE · GUN / BOMB / ROCKET',['GUN','BOMB','ROCKET'],'ssm',0,{l:'GUN BOMB RKT'}),T_(.5,.4,'TARGET SPEED · LO / HI / TR',['LO','HI','TR'],'tsp',1,{l:'TGT SPEED'}),
    K_(.8,.4,'RADAR RANGE SWEEP RHEOSTAT · MIN - MAX',['MIN','','','MAX'],'rsw',3,{r:.009,l:'SWEEP',g:()=>Math.round((window.ACMR?ACMR.sweep:1)*3),s:v=>{if(window.ACMR)ACMR.sweep=v/3;ST.rsw=v;}}),
    B_(.5,.85,'RADAR REJECT BUTTON · breaks the lock, the range sweep restarts',()=>{try{radar.bore();}catch(e){}},{r:.007,col:0x8a2a2a,l:'RADAR REJECT'})]);
  LC(0,.45,560,700,'ARMAMENT CONTROL (8)',[T_(.3,.4,'MASTER ARM (8)',['SAFE','ARM'],'arm',0,{g:()=>game.arm?1:0,s:v=>{try{setArm(v?0:1);}catch(e){game.arm=!!v;}}}),T_(.7,.4,'GUN HEATER / CHARGER',['OFF','ON'],'gunS',1),B_(.5,.82,'AUXILIARY STORE RELEASE BUTTON (9)',()=>{},{r:.006,l:'AUX STORE REL'})]);
  LC(0,.45,700,820,'',[K_(.3,.5,'CAMERA SHUTTER SELECTOR (6)',['OFF','LOW','HIGH'],'cam',0,{r:.009,l:'CAMERA'}),T_(.72,.5,'ANTI-G SUIT VALVE (4)',['OFF','ON'],'agv',1,{l:'ANTI-G'})]);
  LC(0,.45,820,1000,'',[T_(.25,.3,'CANOPY DEFROST (3)',['OFF','ON'],'cdf',0,{l:'CANOPY DEFR'}),T_(.7,.3,'DROP TANK PRESSURE SHUTOFF HANDLE (7)',['ON','SHUTOFF'],'dtp',0,{l:'TANK PRESS'}),T_(.25,.74,'THUNDERSTORM LIGHT (11)',['OFF','ON'],'tsl',0,{l:'T-STORM LT'}),T_(.7,.74,'CONSOLE FLOODLIGHT (5)',['OFF','ON'],'cfl',0,{l:'CONSOLE LT'})]);
  LC(0,.45,1000,1500,'CIRCUIT BREAKERS (2)',[B_(.5,.95,'SPARE LAMP COMPARTMENT (1)',()=>{},{r:.005,l:'SPARE LAMPS'})],(c,w,h)=>{c.fillStyle='#17191a';c.fillRect(w*.06,h*.05,w*.88,h*.85);c.fillStyle='#d8d8d0';for(let i=0;i<7;i++)for(let j=0;j<16;j++){c.beginPath();c.arc(w*(.14+i*.12),h*(.09+j*.05),3.4,0,7);c.fill();}});
  // speed brake emergency dump lever (32)
  LC(.45,1,1500,1540,'',[T_(.5,.5,'SPEED BRAKE EMERGENCY DUMP LEVER (32)',['NORM','DUMP'],'sbd',0,{l:'SB DUMP',g:()=>keys.has('KeyB')?1:0,s:v=>{if(v)keys.add('KeyB');else keys.delete('KeyB');}})]);

  // ======== RIGHT CONSOLE (Fig 1-7) — u 0 = inboard, top = forward ========
  const RC=(u0,u1,y0,y1,t,it,d)=>panel(1,u0,u1,y0,y1,t,it,d);
  // 1 indicator-caution-warning light panel, 2 electrical control panel (Fig 1-18)
  {const p=RC(0,1,60,200,'CAUTION · WARNING LIGHTS (1)',[]);placards(p,RIGHTPL,.26,.3,2,.48,.22);}
  RC(0,1,200,420,'ELECTRICAL CONTROL PANEL (2)',[
    T_(.2,.2,'GENERATOR SWITCH · ON / OFF / RESET',['OFF','ON'],'genS',1,{g:()=>eng(PL())&&eng(PL()).gen?1:0,s:()=>{},l:'GENERATOR'}),
    T_(.5,.2,'BATTERY SWITCH · ON / OFF',['OFF','ON'],'battS',0,{g:()=>eng(PL())&&eng(PL()).batt?1:0,s:()=>{},l:'BATTERY'}),
    B_(.8,.2,'ENGINE START · STARTER & ENGINE IGNITION (START LIGHT ON / IGNITION ON · STOP)',()=>{},{col:0x2f6a2f,r:.009,l:'START / IGN'}),
    T_(.2,.55,'SEC BUS TIE-IN · NORM / EMERG',['NORM','EMERG'],'sbus',0,{l:'SEC BUS'}),
    T_(.5,.55,'POWER INVERTER · ON / OFF',['OFF','ON'],'pinv',1,{l:'POWER INV'}),
    K_(.8,.55,'INSTRUMENT INVERTER · NO. 1 / OFF / NO. 2',['NO.1','OFF','NO.2'],'iinv',0,{r:.01,l:'INSTR INV'}),
    B_(.5,.88,'GROUND POWER · external electrical cart (ground crew)',()=>{},{r:.006,col:0x444444,l:'GND POWER'}),
    B_(.8,.88,'GROUND AIR CART · external air for start (APU, ground crew)',()=>{},{r:.006,col:0x444444,l:'GND AIR'})]);
  // 7 lighting control panel, 3 / 4 / 8 / 11 floodlights, 5 utility light, 9 face mask antifrost
  RC(0,1,420,620,'LIGHTING CONTROL PANEL (7)',[K_(.2,.3,'INSTRUMENT LIGHTS',['OFF','DIM','MED','BRT'],'ilt',2,{r:.011,l:'INSTR LT'}),K_(.5,.3,'CONSOLE LIGHTS',['OFF','DIM','MED','BRT'],'clt',2,{r:.011,l:'CONSOLE LT'}),K_(.8,.3,'FLOOD LIGHTS',['OFF','DIM','MED','BRT'],'flt',0,{r:.011,l:'FLOOD'}),
    T_(.2,.74,'COCKPIT UTILITY LIGHT (5)',['OFF','ON'],'utl',0,{l:'UTILITY'}),T_(.5,.74,'THUNDERSTORM LIGHT (8)',['OFF','ON'],'tsl2',0,{l:'T-STORM'}),K_(.8,.74,'FACE MASK ANTIFROST RHEOSTAT (9)',['OFF','LOW','HIGH'],'fma',0,{r:.009,l:'MASK AF'})]);
  // 24 oxygen regulator, 22 radio compass, 21 TACAN, 19 SIF, 20 IFF
  RC(0,1,620,740,'OXYGEN REGULATOR (24)',[T_(.2,.5,'OXYGEN SUPPLY LEVER',['OFF','ON'],'o2',1,{l:'SUPPLY'}),K_(.5,.5,'DILUTER · NORMAL / 100%',['NORMAL','100%'],'dil',0,{r:.01,l:'DILUTER'}),T_(.8,.5,'EMERGENCY',['NORMAL','EMER'],'o2e',0,{l:'EMERG'})]);
  RC(0,1,740,860,'RADIO COMPASS (22)',[K_(.3,.5,'RADIO COMPASS FUNCTION · OFF / COMP / ANT / LOOP',['OFF','COMP','ANT','LOOP'],'rcf',1,{r:.01,l:'FUNCTION'}),K_(.7,.5,'RADIO COMPASS TUNING',Array.from({length:10},(_,i)=>String(i)),'rct',3,{r:.011,l:'TUNE'})]);
  RC(0,1,860,1000,'TACAN CONTROL (21)',[K_(.2,.5,'TACAN CHANNEL TENS',Array.from({length:13},(_,i)=>String(i*10)),'tch10',3,{r:.011,l:'TENS'}),K_(.5,.5,'TACAN CHANNEL UNITS',Array.from({length:10},(_,i)=>String(i)),'tch1',4,{r:.009,l:'UNITS'}),K_(.82,.5,'TACAN FUNCTION · OFF / REC / T/R / A/A',['OFF','REC','T/R','A/A'],'tfn',2,{r:.009,l:'FUNCTION'})]);
  RC(0,1,1000,1120,'IFF (20) · SIF (19)',[K_(.25,.5,'IFF MASTER · OFF / STBY / LOW / NORM / EMER',['OFF','STBY','LOW','NORM','EMER'],'iff',3,{r:.011,l:'IFF'}),T_(.6,.3,'SIF MODE 2',['OFF','ON'],'iff2',1,{l:'MODE 2'}),T_(.6,.72,'SIF MODE 3',['OFF','ON'],'iff3',1,{l:'MODE 3'}),T_(.88,.5,'IFF I/P',['OUT','MIC'],'iffp',0,{l:'I/P'})]);
  // 12 fuse panel, 13 map case, 15 gun sight ground test plug, 16 emergency hydraulic pump lever, 17 emergency flight control system panel
  RC(0,1,1120,1260,'FUSE PANEL (12)',[],(c,w,h)=>{c.fillStyle='#17191a';c.fillRect(w*.06,h*.16,w*.88,h*.74);c.fillStyle='#d8d8d0';for(let i=0;i<8;i++)for(let j=0;j<4;j++){c.beginPath();c.arc(w*(.14+i*.1),h*(.3+j*.16),3.2,0,7);c.fill();}});
  RC(0,1,1260,1360,'',[T_(.3,.5,'EMERGENCY HYDRAULIC PUMP LEVER (16)',['STOWED','ON'],'ehp',0,{o:{guard:true,guardUp:()=>sv('ehp',0)},l:'EMER HYD PUMP'}),B_(.7,.5,'GUN SIGHT GROUND TEST PLUG (15)',()=>{lampTest=now()+3;},{r:.006,l:'SIGHT TEST'})]);
  RC(0,1,1360,1540,'EMERGENCY FLIGHT CONTROL (17)',[T_(.25,.4,'YAW DAMPER · ON / OFF',['OFF','ON'],'yd',1,{l:'YAW DAMP'}),T_(.55,.4,'PITCH DAMPER · ON / OFF',['OFF','ON'],'pd',1,{l:'PITCH DAMP'}),T_(.82,.4,'TRIM FOR TAKE-OFF · ON / OFF',['OFF','ON'],'ttko',1,{l:'T/O TRIM'}),
    T_(.25,.8,'CANOPY · CLOSE / OPEN',['CLOSE','OPEN'],'cnpO',0,{l:'CANOPY'}),B_(.65,.8,'CANOPY ALTERNATE EMERGENCY JETTISON HANDLE (23)',()=>{},{r:.006,col:0xc8a020,l:'CANOPY JETT'})]);

  // control stick: borrowed stick motion drives it (A-4 sight head is built by the base cockpit)
  const stkG=new THREE.Group(),thrG=new THREE.Group();g.add(stkG);g.add(thrG);thrG.visible=false;stkG.scale.set(1,.55,1);
  box(stkG,.026,.34,.026,LM(0x1a1a1a,30),0,.17,0);box(stkG,.042,.12,.048,LM(0x2a2a2a,20),0,.39,-.004,-.25);box(stkG,.014,.016,.014,LM(0x777777,30),0,.455,.004);box(stkG,.012,.022,.012,LM(0xb02020,30),-.018,.43,0);box(stkG,.006,.03,.022,LM(0x888888,30),0,.37,-.03);
  let t=0;
  return{stkG,thrG,ctls,upd:(P)=>{if(!P)return;for(const l of lamps)l(P);const tn=now();if(tn-t<.025)return;t=tn;
        {const E=P.eng&&!P.eng.done?P.eng.e[0]:null;
     FKA=[q(P.bank,229),q(P.pitch,229),q(P.hdg,2),q(P.cas,1),q(P.mach,100),q(P.pos.y,.66),q(P.vel?P.vel.y:0,.1),q(P.nz,20),q(P.maxNz,5),q(P.beta,115),q(P.pos.x,.02),q(P.pos.z,.02),STV];FK=FKA.join();
     SK=[q(P.n,50),q(P.thr,50),q(P.totalFuel,.2),q(P.ab,10),Math.floor(now()),lampTest>now()?1:0,STV,E?q(E.rpm,2)+'/'+q(E.egt,40)+(E.lit?1:0):'',(P.fire||0)>0?1:0,P.onGnd?1:0,qtyTest>now()?1:0].join();}
    for(let i=0;i<upd.length;i++){try{upd[i](P);}catch(e){}}}};}

PIT[ID].custom=build;
console.info('[f100pit] F-100A T.O. 1F-100A-1 cockpit active (A-4 sight, ACM-only AN/ASG-17 ranging radar)');
})();
