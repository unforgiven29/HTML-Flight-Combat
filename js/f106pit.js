/* =====================================================================================================================
   v265 - F-106A Delta Dart cockpit, 1:1 after T.O. 1F-106A-1 (1 Nov 1980, change 2 / 30 Apr 1985) figure FO-1 "F-106A cockpit -
   typical, conventional instrument display" (sheet 1) with the left and right consoles. NO HUD: the jet never had one. The only sight
   is a small fixed optical sight head (reticle, no symbology) - everything else is read from round instruments, the MA-1 radar scope
   and the Tactical Situation Display.
   Instrument panel, keyed after FO-1 sheet 1 (items 1-46):
     16 radar scope (with 14 scope recorder above), 42 attitude director indicator, 43 horizontal situation indicator, 46 TSD,
     44 airspeed-angle of attack indicator (pointer 80-800 kt, rotating 0-100 kt scale in a cut-out, AoA scale with FINAL / MIN SAFE
     SPD marks), 45 Mach indicator (0.4-2.2, command Mach marker, striped maximum-allowable Mach pointer), 40 AAU-19/A servoed
     altimeter (10 000 / 1 000 / 100 ft drums, pointer, Kollsman 28.1-31.0 window, STBY flag), 41 vertical velocity indicator,
     3 command and target altitude indicator, 2 clock, 11 turn-and-slip, 12 cabin pressure altitude, 14A accelerometer,
     15 standby compass, 19 standby attitude indicator, 25 engine pressure ratio 1.2-3.4, 30 tachometer, 31 fuel flow,
     32 exhaust gas temperature, 33 fuel quantity (+34 selector), 36 nucleonic oil quantity, 37 radar / IR selector panel,
     1 flight modes panel, 8 UHF remote indicator, 9 / 10 landing gear warning and position lights, 13 external tank empty lights,
     17 maximum maneuver warning light, 18 computer mode indicator, 20 marker beacon, 20A master warning repeater, 21-23 air
     refuelling lights, 24 variable ramp warning, 26 engine fire warning (+28 test), 35 hydraulic pressure low, 38 master warning,
     39 canopy unlocked, 6 / 7 tail hook and drag chute handles.
   Consoles: left console items 1-38 and right console items 1-37 as listed on the figure.
   Needs game.js, cwpit.js, cw-systems.js, startup.js.
   ===================================================================================================================== */
(function(){
'use strict';
const PIT=window.CW_PIT;if(!PIT||!PIT['F-106A']){console.warn('[f106pit] cwpit missing');return;}
const ID='F-106A',K=.00066,OX=620,OY=330;
const PL=()=>typeof player!=='undefined'?player:null;
const bx=x=>(x-OX)*K,by=y=>(OY-y)*K;
const now=()=>performance.now()/1000;
let STV=0,FK='',SK='',FKA=[];
const ST=new Proxy({},{set(t,k,v){t[k]=v;STV++;return true;}});
const sv=(k,d)=>ST[k]===undefined?d:ST[k];
let lampTest=0,fireTest=0,qtyTest=0;
const LB=2.2046;

/* ---------------- readouts (J75-P-17 with afterburner) ---------------- */
const E0=P=>P.eng&&!P.eng.done?P.eng.e[0]:null;
const running=P=>{const e=E0(P);return e?e.lit:P.totalFuel>0&&!(P.dm&&P.dm.eng<=0);};
const rpm=P=>{const e=E0(P);return e?e.rpm:running(P)?62+38*clamp(P.n||0,0,1.02):0;};
const egt=P=>{const e=E0(P);return e?e.egt*700:window.ENGSYS&&window.ENGSYS.on?ENGSYS.egt(P,0):running(P)?400+300*clamp(P.n||0,0,1)+(P.ab>.1?90:0):20;};
const epr=P=>{if(!running(P))return 1.0;const n=clamp(P.n||0,0,1);return 1.28+1.12*Math.pow(n,1.15)+(P.ab>.1?.38*P.ab:0);};
const ffl=P=>{if(!running(P))return 0;const n=clamp(P.n||0,0,1);return 1100+11500*Math.pow(n,1.7)+(P.ab>.1?48000*P.ab:0);};
const powered=P=>window.START&&P.eng?START.powered(P):running(P);
const fuelLb=P=>(P.totalFuel||0)*LB;
const gearDn=()=>{try{return!!sys.v.gear;}catch(e){return false;}};
const MMO=P=>Math.min(2.3,(P.ac&&P.ac.mcap)||2.2);
const brgTo=(P,x,z)=>(Math.atan2(x-P.pos.x,-(z-P.pos.z))*R2D+360)%360;
const dstTo=(P,x,z)=>Math.hypot(x-P.pos.x,z-P.pos.z)/1852;
const tacan=()=>({x:AF.x,z:AF.z});
const bugT=()=>{try{return radar.bug&&radar.bug.alive?radar.bug:null;}catch(e){return null;}};
// bearing pointer source: TAC (airfield beacon) / TGT (radar target) / UHF / DL (data link target)
const brgSrc=P=>{const s=sv('bsel',0),b=bugT();if((s===1||s===3)&&b)return{b:brgTo(P,b.pos.x,b.pos.z),d:dstTo(P,b.pos.x,b.pos.z),n:s===1?'TGT':'DL'};const t=tacan();return{b:brgTo(P,t.x,t.z),d:dstTo(P,t.x,t.z),n:s===2?'UHF':'TAC'};};
const dh=(a,b)=>((a-b+540)%360)-180;

/* ---------------- 2D faces ---------------- */
const INK='#f0f0ea',DIM='#a8aca4',FACE='#0d0e0f',R=110;
function face(c,S){c.setTransform(1,0,0,1,0,0);c.fillStyle=FACE;c.fillRect(0,0,S,S);c.translate(S/2,S/2);}
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
const F={};
Object.assign(F,{
 // 44 airspeed-angle of attack indicator: pointer on a fixed 80-800 kt scale (10 kt marks), 0-100 kt rotating scale in a cut-out, AoA scale at the right
 asi:(c,P)=>{const v=Math.max(0,P.cas||0),a=t=>-155+Math.pow(lin(t,80,800),.82)*310;
   for(let t=80;t<=800;t+=10){const M=t%100===0;tick(c,R,a(t),M?.8:.9,.97,M?3:1.3);if(M)T(c,String(t/100),Math.cos((a(t)-90)*D2R)*R*.67,Math.sin((a(t)-90)*D2R)*R*.67,17);}
   T(c,'AIRSPEED',-R*.12,-R*.3,10,DIM);T(c,'KNOTS x100',-R*.12,-R*.16,9,DIM);
   // cut-out with the 0-100 kt rotating scale (marks every 2 kt)
   c.save();c.translate(-R*.42,R*.2);c.fillStyle='#050505';c.fillRect(-R*.24,-R*.2,R*.48,R*.4);c.strokeStyle='#555';c.lineWidth=2;c.strokeRect(-R*.24,-R*.2,R*.48,R*.4);
   c.beginPath();c.rect(-R*.24,-R*.2,R*.48,R*.4);c.clip();const k=v%100;for(let i=-3;i<=3;i++){const t=Math.floor(k/10)*10+i*10,y=(k-t)/10*R*.16;if(Math.abs(y)>R*.28)continue;const tt=((t%100)+100)%100;T(c,String(tt).padStart(2,'0'),0,y,15,'#fff');}c.restore();
   // angle of attack: vertical scale 0-30 units at the right, FINAL triangle and MIN SAFE SPD mark, lubber line moves
   const u=clamp((P.alpha||0)*R2D*1.12+2,0,30),yu=x=>R*.62-x/30*R*1.1;c.save();c.translate(R*.66,0);c.fillStyle='#0a0a0a';c.fillRect(-R*.12,-R*.5,R*.24,R*1.1);c.strokeStyle=INK;c.lineWidth=1.5;
   for(let x=0;x<=30;x+=3){c.beginPath();c.moveTo(-R*.1,yu(x)-R*.5+R*.5);c.lineTo(R*(x%15?-.04:-.01),yu(x)-R*.5+R*.5);c.stroke();}
   c.fillStyle='#3c3';c.beginPath();c.moveTo(-R*.11,yu(17)-R*.01);c.lineTo(R*.1,yu(17)-R*.1);c.lineTo(R*.1,yu(17)+R*.08);c.closePath();c.fill();T(c,'FINAL',0,yu(17)+R*.2,8,'#3c3');
   c.fillStyle='#d33';c.fillRect(-R*.1,yu(24)-R*.03,R*.2,R*.06);T(c,'MIN',0,yu(24)-R*.14,7,'#d33');T(c,'SAFE',0,yu(24)+R*.12,7,'#d33');
   c.strokeStyle='#ffb21a';c.lineWidth=3;c.beginPath();c.moveTo(-R*.15,yu(u));c.lineTo(R*.13,yu(u));c.stroke();T(c,'AOA',0,-R*.62,9,DIM);c.restore();
   if(!powered(P))flag(c,'OFF',0,-R*.05);needle(c,R*.9,a(Math.max(80,v)),.88,7);},
 // 45 Mach indicator 0.4-2.2: pointer, command Mach marker, striped maximum allowable Mach pointer, OFF flag
 mach:(c,P)=>{const m=P.mach||0,a=t=>-150+Math.pow(lin(t,.4,2.2),.9)*300;for(let t=.4;t<=2.201;t+=.05){const M=Math.abs(t*10-Math.round(t*10))<.01&&Math.round(t*10)%2===0;tick(c,R,a(t),M?.8:.9,.97,M?3:1.2);}
   for(const t of[.5,.8,1.0,1.2,1.4,1.6,1.8,2.0,2.2]){const q=(a(t)-90)*D2R;T(c,t.toFixed(1).replace(/^0/,''),Math.cos(q)*R*.64,Math.sin(q)*R*.64,t>=2?13:14);}
   T(c,'MACH',0,-R*.3,13,DIM);c.save();c.rotate(a(MMO(P))*D2R);for(let i=0;i<6;i++){c.fillStyle=i%2?'#eee':'#d22';c.fillRect(-4,-R*(.99-i*.03),8,R*.03);}c.restore();
   const cm=sv('cmdM',0)||clamp(P.mach||.9,.5,2);c.save();c.rotate(a(cm)*D2R);c.fillStyle='#e8c040';c.beginPath();c.moveTo(0,-R*.97);c.lineTo(-7,-R*1.07);c.lineTo(7,-R*1.07);c.closePath();c.fill();c.restore();
   win(c,0,R*.42,R*.5,R*.2,'G '+(P.nz||1).toFixed(1),13);if(!powered(P))flag(c,'OFF',-R*.35,-R*.5);needle(c,R*.9,a(clamp(m,.4,2.2)),.86,7);},
 // 40 AAU-19/A servoed altimeter: counter-drum-pointer, 10 000 / 1 000 / 100 ft drums (10 000 barber pole below 10 000), Kollsman 28.1-31.0
 alt:(c,P)=>{const h=Math.max(0,P.pos.y*3.2808);for(let i=0;i<50;i++){tick(c,R,i*7.2,i%5?.9:.84,.97,i%5?1.3:3);}
   for(let d=0;d<10;d++){const q=(d*36-90)*D2R;T(c,String(d),Math.cos(q)*R*.7,Math.sin(q)*R*.7,18);}
   c.fillStyle='#000';c.fillRect(-R*.5,-R*.17,R*.96,R*.34);c.strokeStyle='#555';c.lineWidth=2;c.strokeRect(-R*.5,-R*.17,R*.96,R*.34);
   if(h<10000)barber(c,-R*.37,0,R*.15);else T(c,String(Math.floor(h/10000)%10),-R*.37,0,24,'#fff');T(c,String(Math.floor(h/1000)%10),-R*.14,0,24,'#fff');T(c,String(Math.floor(h/100)%10)+'00',R*.18,0,24,'#fff');
   T(c,'ALT',0,-R*.42,13,DIM);const bp=sv('baro',29.92);win(c,R*.66,R*.44,R*.44,R*.2,bp.toFixed(1)+(Math.round(bp*100)%10),11);if(sv('alts',0))flag(c,'STBY',-R*.55,-R*.5,'#d90');needle(c,R*.92,(h%1000)/1000*360,.9,8);},
 // 41 vertical velocity indicator: +-6000 fpm
 vvi:(c,P)=>{const v=(P.vel?P.vel.y:0)*196.85/1000;scale(c,R,-170,-10,12,2,[6,4,2,1,0],.64,18);scale(c,R,10,170,12,2,[0,1,2,4,6],.64,18);T(c,'UP',-R*.55,-R*.3,13,DIM);T(c,'DOWN',-R*.5,R*.24,12,DIM);T(c,'FPM x1000',R*.05,R*.5,9,DIM);
   const f=x=>{const a=Math.abs(x);return Math.sign(x)*(a<1?a*.25:a<2?.25+(a-1)*.2:.45+(a-2)/4*.55);};needle(c,R,-90+clamp(f(clamp(v,-6,6)),-1,1)*80);},
 // 3 command and target altitude indicator (MA-1 / data link): command altitude, target altitude, vertical steering pointer
 cmd:(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#111';c.fillRect(0,0,S,S);const b=bugT(),tg=b?Math.round(b.pos.y*3.2808/100):0,cm=b?Math.round((b.pos.y*3.2808)/100):Math.round(P.pos.y*3.2808/100);
   T(c,'CMD ALT',S/2,S*.1,S*.08,DIM);c.fillStyle='#000';c.fillRect(S*.12,S*.17,S*.76,S*.2);T(c,b?String(cm*100).padStart(5,'0'):'-----',S/2,S*.27,S*.14,'#fff');
   T(c,'TGT ALT',S/2,S*.5,S*.08,DIM);c.fillStyle='#000';c.fillRect(S*.12,S*.57,S*.76,S*.2);T(c,b?String(tg*100).padStart(5,'0'):'-----',S/2,S*.67,S*.14,'#fff');
   const dv=b?clamp((b.pos.y-P.pos.y)/3000,-1,1):0;c.strokeStyle=INK;c.lineWidth=2;c.beginPath();c.moveTo(S*.9,S*.18);c.lineTo(S*.9,S*.82);c.stroke();c.fillStyle='#ffb21a';c.beginPath();c.moveTo(S*.82,S*.5-dv*S*.3);c.lineTo(S*.9,S*.45-dv*S*.3);c.lineTo(S*.9,S*.55-dv*S*.3);c.closePath();c.fill();
   T(c,'COMMAND / TARGET',S/2,S*.92,S*.065,DIM);},
 // 11 turn-and-slip: 2-minute turn needle and ball
 tsi:(c,P)=>{const rr=(P.rr||0),ball=clamp(-(P.beta||0)*R2D/6,-1,1);T(c,'TURN AND SLIP',0,-R*.5,11,DIM);T(c,'2 MIN',0,R*.2,11,DIM);
   for(const k of[-1,0,1]){const a=k*20;tick(c,R,a,.7,.95,3);}T(c,'L',-R*.78,-R*.1,16);T(c,'R',R*.78,-R*.1,16);
   const nd=clamp(((P.bank||0)>0?1:-1)*Math.abs(P.hdgRate||0)*R2D/3,-1.5,1.5);c.save();c.rotate((clamp(nd,-1.2,1.2)*22)*D2R);c.strokeStyle=INK;c.lineWidth=8;c.beginPath();c.moveTo(0,0);c.lineTo(0,-R*.7);c.stroke();c.restore();
   c.fillStyle='#111';c.fillRect(-R*.5,R*.55,R,R*.22);c.strokeStyle='#ddd';c.lineWidth=2;c.strokeRect(-R*.5,R*.55,R,R*.22);c.fillStyle='#e8e8e0';c.beginPath();c.arc(ball*R*.4,R*.66,R*.08,0,7);c.fill();},
 // 14A accelerometer with +g / -g record pointers
 acc:(c,P)=>{P._minNz=Math.min(P._minNz==null?1:P._minNz,P.nz||1);scale(c,R,-150,150,14,2,[-4,-2,0,2,4,6,8,10],.64,19);T(c,'ACCEL',0,R*.34,11,DIM);T(c,'G',0,R*.5,12,DIM);
   const a=g=>-150+300*clamp((g+4)/14,0,1);needle(c,R,a(P.maxNz||1),.78,4,'#cfcfc8');needle(c,R,a(P._minNz),.78,4,'#cfcfc8');needle(c,R,a(P.nz||1));},
 // 2 clock
 clk:(c,P)=>{const d=new Date();scale(c,R,0,330,59,5,[12,1,2,3,4,5,6,7,8,9,10,11],.68,22);needle(c,R,((d.getHours()%12)+d.getMinutes()/60)*30,.5,8);needle(c,R,d.getMinutes()*6,.8,6);needle(c,R,d.getSeconds()*6,.88,2.5,'#e33');},
 // 12 cabin pressure altitude
 cab:(c,P)=>{const h=P.pos.y*3.2808,ca=h<8000?h:Math.max(8000,8000+(h-8000)*.35);scale(c,R,-150,150,10,2,[0,10,20,30,40,50],.64,18);T(c,'CABIN',0,R*.32,12,DIM);T(c,'ALT',0,R*.46,12,DIM);T(c,'FT x1000',0,R*.6,10,DIM);needle(c,R,-150+300*clamp(ca/50000,0,1));},
 // 25 engine pressure ratio 1.2-3.4 with the takeoff thrust index marker
 epr:(c,P)=>{const p=epr(P),a=x=>-140+280*clamp((x-1.2)/2.2,0,1);for(let x=1.2;x<=3.401;x+=.1){const M=Math.abs(x*5-Math.round(x*5))<.01;tick(c,R,a(x),M?.8:.88,.97,M?3:1.4);}
   for(const x of[1.2,1.6,2.0,2.4,2.8,3.2,3.4]){const q=(a(x)-90)*D2R;T(c,x.toFixed(1),Math.cos(q)*R*.66,Math.sin(q)*R*.66,x===3.4?12:14);}
   T(c,'ENGINE',0,-R*.3,12,DIM);T(c,'PRESSURE',0,-R*.16,10,DIM);T(c,'RATIO',0,-R*.04,10,DIM);const ti=sv('epri',2.35);tick(c,R,a(ti),.72,.99,5,'#e8c040');needle(c,R,a(p));},
 // 30 tachometer, percent rpm
 tach:(c,P)=>{const r=rpm(P);scale(c,R,-150,150,20,2,[0,10,20,30,40,50,60,70,80,90,100],.68,14);arc(c,R*.92,-150+300*100/110,150,'#d33');T(c,'RPM',0,-R*.3,13,DIM);T(c,'PERCENT',0,R*.35,11,DIM);
   win(c,0,R*.52,R*.4,R*.16,String(Math.round(r)),12);needle(c,R,-150+300*clamp(r/110,0,1));},
 // 32 exhaust gas temperature, degrees C x 100, with the spread warning light beside it
 egt:(c,P)=>{const t=egt(P);scale(c,R,-150,150,20,2,[0,1,2,3,4,5,6,7,8,9,10],.64,15);T(c,'EGT',R*.0,-R*.3,13,DIM);T(c,'C x100',0,R*.42,10,DIM);const ti=sv('egti',6.6);tick(c,R,-150+300*ti/10,.74,.99,5,'#e8c040');needle(c,R,-150+300*clamp(t/1000,0,1));},
 // 31 fuel flow, pph x 1000 (expanded below 10)
 ff:(c,P)=>{const f=ffl(P)/1000,g=x=>x<=10?x/10*.55:.55+clamp((x-10)/50,0,1)*.45;for(const t of[0,1,2,3,4,5,6,8,10,15,20,30,40,50,60]){const q=-150+300*g(t),M=[0,2,4,6,10,20,40,60].includes(t);tick(c,R,q,M?.78:.87,.97,M?3:1.4);if(M)T(c,String(t),Math.cos((q-90)*D2R)*R*.63,Math.sin((q-90)*D2R)*R*.63,14);}
   T(c,'FUEL FLOW',0,-R*.2,12,DIM);T(c,'PPH x1000',0,R*.5,10,DIM);needle(c,R,-150+300*g(clamp(f,0,60)));},
 // 33 fuel quantity, lb x 1000, selector (34): TOTAL / INT / EXT / L WING / R WING
 fq:(c,P)=>{scale(c,R,-150,150,12,2,[0,2,4,6,8,10,12],.66,16);T(c,'FUEL',0,-R*.3,13,DIM);T(c,'QTY',0,-R*.14,12,DIM);T(c,'LB x1000',0,R*.5,10,DIM);
   const s=sv('fqs',0),ac=P.ac||{},intL=Math.min(fuelLb(P),(ac.fuel||4580)*LB),tot=fuelLb(P),ext=Math.max(0,tot-intL),val=[tot,intL,ext,intL*.2,intL*.2][s];
   T(c,['TOTAL','INT','EXT','L WING','R WING'][s],0,R*.28,9,DIM);needle(c,R,-150+300*(qtyTest>now()?0:clamp(val/12000,0,1)),.86,8);},
 // 36 nucleonic oil quantity
 nuc:(c,P)=>{scale(c,R,-120,120,10,2,['0','1','2','3','4','5'],.62,16);T(c,'OIL',0,R*.4,13,DIM);T(c,'QTY',0,R*.55,10,DIM);needle(c,R,-120+240*(window.ENGSYS&&window.ENGSYS.on?ENGSYS.oilQ(P,0):.8));},
 // 15 standby compass (card seen through a window)
 scmp:(c,P)=>{const hd=P.hdg||0;c.fillStyle='#e8e8e0';c.beginPath();c.arc(0,0,R*.95,0,7);c.fill();c.save();c.rotate(-hd*D2R);for(let i=0;i<36;i++){const q=i*10*D2R;c.strokeStyle='#111';c.lineWidth=i%3?1.5:3;c.beginPath();c.moveTo(Math.sin(q)*R*(i%3?.82:.74),-Math.cos(q)*R*(i%3?.82:.74));c.lineTo(Math.sin(q)*R*.92,-Math.cos(q)*R*.92);c.stroke();}
   ['N','3','6','E','12','15','S','21','24','W','30','33'].forEach((s,i)=>{c.save();c.rotate(i*30*D2R);T(c,s,0,-R*.58,s.length>1?15:19,'#111');c.restore();});c.restore();c.strokeStyle='#d22';c.lineWidth=4;c.beginPath();c.moveTo(0,-R*.98);c.lineTo(0,-R*.7);c.stroke();},
 // 42 attitude director indicator: attitude sphere, bank scale, slip ball, turn-rate scale, glide-slope pointer at the left, OFF / AUX flags
 adi:(c,P)=>{c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();c.rotate(-(P.bank||0));const k=R/46,po=(P.pitch||0)*R2D*k;
   c.fillStyle='#d8d8d0';c.fillRect(-R*2,-R*4+po,R*4,R*4);c.fillStyle='#2a2a28';c.fillRect(-R*2,po,R*4,R*4);
   c.lineWidth=2;for(let q=5;q<=90;q+=5){for(const s of[-1,1]){const y=po-s*q*k,w=q%10?R*.1:R*.26;c.strokeStyle=s>0?'#111':'#e8e8e0';c.beginPath();c.moveTo(-w,y);c.lineTo(w,y);c.stroke();if(q%10===0){T(c,String(q/10),w+12,y,12,s>0?'#111':'#e8e8e0');T(c,String(q/10),-w-12,y,12,s>0?'#111':'#e8e8e0');}}}
   c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-R*2,po);c.lineTo(R*2,po);c.stroke();c.restore();
   c.strokeStyle=INK;c.lineWidth=2;for(const b of[-60,-45,-30,-20,-10,0,10,20,30,45,60]){tick(c,R,b,b%30?.9:.84,.98,2);}
   c.save();c.rotate(-(P.bank||0));c.fillStyle=INK;c.beginPath();c.moveTo(0,-R*.82);c.lineTo(-7,-R*.7);c.lineTo(7,-R*.7);c.closePath();c.fill();c.restore();
   c.strokeStyle='#ffb21a';c.lineWidth=6;c.beginPath();c.moveTo(-R*.55,0);c.lineTo(-R*.18,0);c.lineTo(-R*.09,R*.09);c.lineTo(0,0);c.lineTo(R*.09,R*.09);c.lineTo(R*.18,0);c.lineTo(R*.55,0);c.stroke();
   c.fillStyle='#111';c.fillRect(-R*.42,R*.78,R*.84,R*.14);c.fillStyle='#000';c.beginPath();c.arc(clamp(-(P.beta||0)*R2D*6,-R*.36,R*.36),R*.85,R*.065,0,7);c.fill();c.strokeStyle='#ddd';c.lineWidth=1.5;c.strokeRect(-R*.42,R*.78,R*.84,R*.14);
   c.fillStyle='#111';c.fillRect(-R*.98,-R*.3,R*.14,R*.6);c.fillStyle='#e8c040';c.fillRect(-R*.96,-R*.02,R*.1,R*.04);if(!powered(P)){flag(c,'OFF',-R*.62,-R*.5);flag(c,'AUX',R*.62,-R*.5,'#d90');}},
 // 43 horizontal situation indicator: compass card, lubber line, heading marker, bearing pointer (TAC / TGT / UHF / DL), course arrow + CDI (5 deg per dot), TO-FROM
 hsi:(c,P)=>{const hd=P.hdg||0,bs=brgSrc(P),crs=sv('crs',360),hm=sv('hdgM',0),mode=sv('hmode',0);
   c.save();c.rotate(-hd*D2R);for(let i=0;i<72;i++){tick(c,R,i*5,i%2?.88:.82,.97,i%2?1.5:3);}
   ['N','3','6','E','12','15','S','21','24','W','30','33'].forEach((s,i)=>{c.save();c.rotate(i*30*D2R);T(c,s,0,-R*.7,s.length>1?15:19);c.restore();});
   // heading marker
   c.save();c.rotate(hm*D2R);c.fillStyle='#e8c040';c.fillRect(-7,-R*1.02,14,R*.1);c.restore();
   // course arrow and CDI
   c.save();c.rotate(crs*D2R);c.strokeStyle='#e8e8e0';c.fillStyle='#e8e8e0';c.lineWidth=4;c.beginPath();c.moveTo(0,-R*.58);c.lineTo(0,-R*.32);c.moveTo(0,R*.32);c.lineTo(0,R*.58);c.stroke();c.beginPath();c.moveTo(0,-R*.62);c.lineTo(-9,-R*.46);c.lineTo(9,-R*.46);c.fill();
   const dev=clamp(dh(bs.b,crs),-90,90),dev2=Math.abs(dev)>90?180-Math.abs(dev):dev,dd=clamp(Math.sign(dev)*Math.min(Math.abs(dev),180-Math.abs(dev))/5,-2.5,2.5);
   for(let i=-2;i<=2;i++){if(i){c.fillStyle='#bbb';c.beginPath();c.arc(i*R*.15,0,2.4,0,7);c.fill();}}c.strokeStyle='#ffb21a';c.lineWidth=5;c.beginPath();c.moveTo(dd*R*.15,-R*.3);c.lineTo(dd*R*.15,R*.3);c.stroke();c.restore();
   // bearing pointer (outside the card)
   c.save();c.rotate(bs.b*D2R);c.fillStyle='#e8e8e0';c.beginPath();c.moveTo(0,-R*.97);c.lineTo(-9,-R*.8);c.lineTo(-3,-R*.8);c.lineTo(-3,-R*.6);c.lineTo(3,-R*.6);c.lineTo(3,-R*.8);c.lineTo(9,-R*.8);c.closePath();c.fill();c.restore();c.restore();
   // fixed aircraft symbol and lubber line
   c.fillStyle=INK;c.beginPath();c.moveTo(0,-R*.2);c.lineTo(-R*.14,R*.1);c.lineTo(0,R*.03);c.lineTo(R*.14,R*.1);c.closePath();c.fill();c.fillRect(-2,-R*1.0,4,R*.12);
   const fr=Math.abs(dh(bs.b,sv('crs',360)))<90;T(c,fr?'TO':'FR',R*.28,-R*.16,12,'#fff');
   // mode lights (left NAV / DL / ILS / MAN, right TAC / TGT / UHF / DL) and range window
   [['NAV',0],['DL',1],['ILS',2],['MAN',3]].forEach(([s,i],k)=>T(c,s,-R*.9,-R*.4+k*R*.2,9,mode===i?'#4f4':'#496',  'center'));
   ['TAC','TGT','UHF','DL'].forEach((s,k)=>T(c,s,R*.9,-R*.4+k*R*.2,9,bs.n===s?'#4f4':'#496','center'));
   win(c,-R*.45,R*.62,R*.5,R*.18,bs.d<999?String(Math.round(bs.d)).padStart(3,'0'):'---',12);win(c,R*.45,R*.62,R*.5,R*.18,String(Math.round(crs)).padStart(3,'0'),12);if(!powered(P))flag(c,'OFF',-R*.6,-R*.55);},
 // 19 standby attitude indicator
 sby:(c,P)=>{c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();c.rotate(-(P.bank||0));const k=R/40,po=(P.pitch||0)*R2D*k;c.fillStyle='#e8e8e0';c.fillRect(-R*2,-R*4+po,R*4,R*4);c.fillStyle='#1b1b1b';c.fillRect(-R*2,po,R*4,R*4);
   c.lineWidth=2;for(let q=10;q<=60;q+=10)for(const s of[-1,1]){c.strokeStyle=s>0?'#111':'#ddd';c.beginPath();c.moveTo(-R*.2,po-s*q*k);c.lineTo(R*.2,po-s*q*k);c.stroke();}c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-R*2,po);c.lineTo(R*2,po);c.stroke();c.restore();
   c.strokeStyle='#ff8a1a';c.lineWidth=7;c.beginPath();c.moveTo(-R*.55,0);c.lineTo(-R*.15,0);c.lineTo(0,R*.12);c.lineTo(R*.15,0);c.lineTo(R*.55,0);c.stroke();T(c,'PULL TO CAGE',0,R*.8,10,DIM);if(!powered(P))flag(c,'OFF',-R*.5,-R*.5);},
 small:(kind)=>(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#111';c.fillRect(0,0,S,S);
   if(kind==='gear'){const tr=P.gearPos!=null&&P.gearPos>.05&&P.gearPos<.95;if(tr)barber(c,S/2,S/2,S*.45);else if(gearDn()&&P.gearPos>.9){c.fillStyle='#ddd';c.beginPath();c.arc(S/2,S/2,S*.42,0,7);c.fill();c.fillStyle='#111';c.beginPath();c.arc(S/2,S/2,S*.18,0,7);c.fill();}else T(c,'UP',S/2,S/2,S*.38,'#fff');}
   else if(kind==='flap'){const f=(P.flapPos!=null?P.flapPos:P.flapCmd||0);T(c,f>.5?'DN':'UP',S/2,S/2,S*.38,'#fff');}}
});
// 46 tactical situation display (TSD): own aircraft, TACAN station, data-link / radar tracks, assigned target with the steering line
const TSDR=[20,40,80,160];
F.tsd=(c,P)=>{const S=c.canvas.width,mid=S/2,rr=TSDR[sv('tsdR',1)],rm=rr*1852,sc=(S*.44)/rm,nu=sv('tsdN',0),dl=sv('dl',1),hd=P.hdg||0;
   c.setTransform(1,0,0,1,0,0);c.fillStyle='#04120a';c.fillRect(0,0,S,S);c.translate(mid,mid);c.save();c.beginPath();c.arc(0,0,S*.47,0,7);c.clip();
   if(!nu)c.rotate(-hd*D2R);
   const G='#3df27a',GD='#1a8a46';c.lineWidth=1;c.strokeStyle=GD;for(let i=1;i<=3;i++){c.beginPath();c.arc(0,0,S*.44*i/3,0,7);c.stroke();}
   c.beginPath();c.moveTo(0,-S*.46);c.lineTo(0,S*.46);c.moveTo(-S*.46,0);c.lineTo(S*.46,0);c.stroke();
   const pt=(x,z)=>[(x-P.pos.x)*sc,(z-P.pos.z)*sc];
   // TACAN station / field with its runway
   {const[ax,az]=pt(AF.x,AF.z);c.save();c.translate(ax,az);c.strokeStyle=G;c.lineWidth=1.5;c.beginPath();c.moveTo(0,-6);c.lineTo(6,4);c.lineTo(-6,4);c.closePath();c.stroke();c.beginPath();c.moveTo(0,-AF.L*sc/2);c.lineTo(0,AF.L*sc/2);c.stroke();c.restore();}
   // true north index on a heading-up display
   const bug=bugT();
   for(const j of jets){if(j===P||!j.alive||j.remote&&!j.peer&&false)continue;const hostile=j.side!==P.side;if(!hostile&&!sv('frn',1))continue;const tk=radar.tracks&&radar.tracks.get?radar.tracks.get(j):null,seen=!!tk;
     if(hostile&&!seen&&!dl)continue;const d=dstTo(P,j.pos.x,j.pos.z);if(d>rr*1.05)continue;const[x,z]=pt(j.pos.x,j.pos.z),isB=bug===j;
     c.save();c.translate(x,z);c.strokeStyle=hostile?(isB?'#ffd24a':'#ff5a4a'):'#6ab8ff';c.fillStyle=c.strokeStyle;c.lineWidth=isB?2.5:1.6;
     if(hostile){c.beginPath();c.moveTo(0,-6);c.lineTo(6,0);c.lineTo(0,6);c.lineTo(-6,0);c.closePath();c.stroke();}else{c.beginPath();c.arc(0,0,5,0,7);c.stroke();}
     const hh=Math.atan2(j.vel.x,-j.vel.z);c.beginPath();c.moveTo(0,0);c.lineTo(Math.sin(hh)*13,-Math.cos(hh)*13);c.stroke();
     c.rotate(nu?0:hd*D2R);c.font='bold 11px Arial';c.textAlign='left';c.fillStyle=c.strokeStyle;c.fillText(String(Math.round(j.pos.y*3.2808/1000)).padStart(2,'0'),9,-6);c.restore();}
   // steering line to the assigned target (lead-collision course from the MA-1 computer)
   if(bug){const[x,z]=pt(bug.pos.x,bug.pos.z),rel=bug.vel.clone().sub(P.vel),dist=Math.hypot(bug.pos.x-P.pos.x,bug.pos.z-P.pos.z),tgo=dist/Math.max(50,Math.hypot(P.vel.x,P.vel.z)+40),ix=bug.pos.x+bug.vel.x*Math.min(tgo,120),iz=bug.pos.z+bug.vel.z*Math.min(tgo,120),[px,pz]=pt(ix,iz);
     c.strokeStyle='#ffd24a';c.lineWidth=1.5;c.setLineDash([5,4]);c.beginPath();c.moveTo(0,0);c.lineTo(px,pz);c.stroke();c.setLineDash([]);c.strokeRect(px-4,pz-4,8,8);}
   c.restore();
   // own aircraft symbol, fixed up when heading-up
   c.save();if(nu)c.rotate(hd*D2R);c.strokeStyle='#fff';c.fillStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(0,-9);c.lineTo(6,7);c.lineTo(0,3);c.lineTo(-6,7);c.closePath();c.fill();c.restore();
   // annotations
   c.save();c.font='bold 12px Arial';c.fillStyle='#3df27a';c.textAlign='left';c.fillText('TSD',-S*.44,-S*.4);c.textAlign='right';c.fillText(rr+' NM',S*.44,-S*.4);c.textAlign='left';c.fillText(nu?'NORTH UP':'HDG UP',-S*.44,S*.42);c.textAlign='right';c.fillText(dl?'DL ON':'DL OFF',S*.44,S*.42);
   c.textAlign='center';c.fillText(nu?'N':String(Math.round(hd)).padStart(3,'0'),0,-S*.455);const bg=bugT();if(bg){c.fillStyle='#ffd24a';c.fillText('TGT '+String(Math.round(brgTo(P,bg.pos.x,bg.pos.z))).padStart(3,'0')+'/'+dstTo(P,bg.pos.x,bg.pos.z).toFixed(0)+' NM',0,S*.455);}
   if(!powered(P)){c.fillStyle='#04120a';c.fillRect(-S/2,-S/2,S,S);c.fillStyle='#d22';c.textAlign='center';c.font='bold 18px Arial';c.fillText('OFF',0,0);}c.restore();};
// FO-1 instrument panel positions [key, x, y, half-size of the case, face drawer, size class]
const INST=[
 ['asi',400,530,92,F.asi],['mach',400,745,92,F.mach],['alt',840,530,92,F.alt],['vvi',840,745,92,F.vvi],
 ['tsi',150,440,52,F.tsi],['cab',150,570,50,F.cab],['clk',150,700,48,F.clk],['acc',215,185,40,F.acc],['scmp',860,205,38,F.scmp],
 ['epr',1035,420,56,F.epr],['tach',1035,540,56,F.tach],['ff',1035,660,56,F.ff],['egt',1150,540,56,F.egt],['fq',1150,660,56,F.fq],['nuc',1035,770,38,F.nuc]];
const SQ=[['adi',620,530,100,F.adi],['hsi',620,745,100,F.hsi],['sby',1150,420,56,F.sby],['cmd',262,880,64,F.cmd],['tsd',620,975,142,F.tsd]];
// annunciators [key,x,y,w,h,legend,colour,lit(P)]
const LAMPS=[
 ['vr',905,285,52,24,'VARI RAMP','#fb3',P=>(P.mach||0)<1.2&&(P.mach||0)>.9&&!!sv('vrf',0)],
 ['fire',965,285,46,24,'FIRE','#f33',P=>(P.fire||0)>0||fireTest>now()],
 ['mw',1025,285,46,24,'MSTR WARN','#f33',P=>cautions(P).length>0&&!sv('mwAck',0)],
 ['mm',905,325,52,24,'MAX MNVR','#fb3',P=>(P.nz||1)>((P.ac&&P.ac.gLim)||7)*.92],
 ['cm',965,325,46,24,'CMPTR','#4c4',P=>!!sv('compOn',1)&&powered(P)],
 ['hyd',1025,325,46,24,'HYD LOW','#fb3',P=>!running(P)||rpm(P)<45],
 ['cnp',905,365,52,24,'CANOPY','#fb3',P=>!!sv('canopyU',0)],
 ['mkr',965,365,46,24,'MARKER','#58f',P=>false],
 ['et1',330,185,44,24,'EXT TK\nEMPTY','#fb3',P=>fuelLb(P)<(((P.ac&&P.ac.fuel)||4580)*LB)&&!!sv('xt',1)&&false],
 ['et2',385,185,44,24,'EXT TK\nEMPTY','#fb3',P=>false],
 ['ar1',700,165,40,22,'AR RDY','#4c4',P=>!!P.arProbe&&false],['ar2',745,165,40,22,'CONTACT','#fb3',P=>false],['ar3',790,165,40,22,'DISC','#fb3',P=>false],
 ['gw',90,830,60,26,'GEAR\nWARN','#f33',P=>!gearDn()&&(P.pos.y-groundAt(P.pos.x,P.pos.z))*3.2808<1500&&!P.onGnd&&(P.thr||0)<.5||lampTest>now()],
 ['g1',64,880,24,22,'N','#4c4',P=>gearDn()&&P.gearPos>.9],['g2',94,880,24,22,'L','#4c4',P=>gearDn()&&P.gearPos>.9],['g3',124,880,24,22,'R','#4c4',P=>gearDn()&&P.gearPos>.9],
 ['oil',1090,770,46,24,'OIL LOW','#fb3',P=>running(P)&&rpm(P)<45],
 ['egs',1150,770,46,24,'EGT SPRD','#fb3',P=>false]];
function cautions(P){const L=[];if(!running(P))L.push('ENG');if(fuelLb(P)<700)L.push('FUEL LOW');if(running(P)&&rpm(P)<45)L.push('OIL');if(!(P.eng&&!P.eng.done?P.eng.gen:running(P)))L.push('GEN');if(!running(P)||rpm(P)<40)L.push('HYD');if(P.hook)L.push('HOOK');return L;}

/* ---------------- build ---------------- */
function build(ctx){const{g,box,LM,liveTex}=ctx;const ctls=[],upd=[],lamps=[];
  const hit=new THREE.MeshBasicMaterial({visible:false});
  const q=(v,s)=>Math.round((v||0)*s);
  const FASTK=new Set(['asi','mach','alt','vvi','adi','hsi','acc','sby','tsi','tsd']);
  const FKSUB={asi:[3,5],mach:[4,8],alt:[6],vvi:[7],adi:[0,1,2,5,10],hsi:[2,12],acc:[8,9],sby:[0,1],tsi:[0,10],tsd:[2,12,13]};
  const gate=k=>{let last=null;const fast=FASTK.has(k),sub=FKSUB[k];return()=>{const key=!fast?SK:sub?sub.map(i=>FKA[i]).join()+'|'+STV+'|'+Math.floor(now()*(k==='tsd'?1:2)):FK;if(key===last)return false;last=key;return true;};};
  const PC=0x3a3e41,pm=LM(PC,12),dk=LM(0x1b1d1f,8),blk=LM(0x0b0c0d,4),bz=LM(0x141618,40),met=LM(0x9aa0a4,60);
  const board=new THREE.Group();board.position.set(0,-.45,-.74);board.rotation.x=-.18;g.add(board);
  // outline traced from FO-1: glareshield shoulders, centre column (scope / ADI / HSI / TSD), right engine cluster, pedestal
  const OUT=[[50,1020],[50,430],[140,330],[270,230],[340,160],[900,160],[1000,230],[1100,330],[1190,430],[1190,1020],[780,1020],[780,1115],[460,1115],[460,1020]];
  const sh=new THREE.Shape();OUT.forEach(([x,y],i)=>i?sh.lineTo(bx(x),by(y)):sh.moveTo(bx(x),by(y)));
  const X0=0,Y0=150,W0=1240,H0=980,bg=document.createElement('canvas');bg.width=1488;bg.height=1176;const SX=bg.width/W0,SY=bg.height/H0,fx=x=>(x-X0)*SX,fy=y=>(y-Y0)*SY;
  {const c=bg.getContext('2d');c.fillStyle='#26292a';c.fillRect(0,0,bg.width,bg.height);
    const lab=(s,x,y,sz=11,al='center',col='#e9e9e2')=>{c.font=`bold ${sz*SX}px Arial`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;s.split('\n').forEach((l,i,a)=>c.fillText(l,fx(x),fy(y)+(i-(a.length-1)/2)*(sz+2)*SY));};
    const box2=(x0,y0,x1,y1,col='#141516')=>{c.fillStyle=col;c.fillRect(fx(x0),fy(y0),(x1-x0)*SX,(y1-y0)*SY);};
    box2(470,160,770,170,'#0f1011');                                        // 14 radar scope recorder
    box2(540,168,700,200,'#17191a');lab('SCOPE RECORDER',620,184,7);
    // 1 flight modes panel
    box2(60,925,330,1005,'#17191a');lab('FLIGHT MODES',195,936,8);lab('NAV  DL  ILS  MAN',195,985,7);lab('TRT / GYRO',100,955,6);
    // 8 UHF remote indicator, 6 tail hook, 7 drag chute
    box2(60,235,150,285,'#17191a');lab('UHF CHAN',105,248,7);box2(60,300,100,330,'#3a2a2a');lab('HOOK',80,315,7);lab('DRAG CHUTE',142,315,6);
    lab('GEAR',90,810,7);lab('MARKER',965,385,6);
    // 37 radar / IR selector panel, 34 fuel quantity selector, 35 / 38 / 39 lights, 36 oil qty
    box2(900,860,1040,1000,'#17191a');lab('RADAR / IR',970,872,8);lab('RADAR  IR  OFF',970,985,7);box2(900,1020,1040,1110,'#17191a');lab('FUEL QTY SEL',970,1032,7);lab('FUEL TEST',1000,1100,6);
    lab('RAMP',905,262,6);lab('TSD',620,1105,8);lab('ADI',620,432,7);lab('HSI',620,640,7);lab('AIRSPEED - AOA',400,432,7);lab('MACH',400,646,7);lab('ALTIMETER',840,432,7);lab('VVI',840,646,7);
    lab('ENGINE',1090,365,7);lab('BARO',860,265,6);
    c.fillStyle='rgba(255,255,255,.22)';for(const [x,y] of[[60,440],[1180,440],[345,172],[895,172],[60,1010],[1180,1010]]){c.beginPath();c.arc(fx(x),fy(y),5,0,7);c.fill();}
    c.fillStyle='#0b0c0d';c.fillRect(fx(470),fy(165),(770-470)*SX,(200-165)*SY);}
  const bgT=new THREE.CanvasTexture(bg);bgT.anisotropy=8;ctx.o.tex.push(bgT);
  const geo=new THREE.ShapeGeometry(sh);{const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i)/K+OX,y=OY-p.getY(i)/K;uv.setXY(i,(x-X0)/W0,1-(y-Y0)/H0);}uv.needsUpdate=true;}
  const faceM=new THREE.MeshBasicMaterial({map:bgT,toneMapped:false});ctx.o.faces.push(faceM);const bm=new THREE.Mesh(geo,faceM);bm.userData.cwFx=1;board.add(bm);
  {const eg=new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false});const e=new THREE.Mesh(eg,pm);e.position.z=-.031;e.userData.cwFx=1;board.add(e);}
  // 16 radar scope: hooded round CRT with the MA-1 picture
  {const R0=150*K,cs=new THREE.Mesh(new THREE.CylinderGeometry(R0*1.12,R0*1.2,.05,40),dk);cs.rotation.x=Math.PI/2;cs.position.set(bx(620),by(300),.02);cs.userData.cwFx=1;board.add(cs);
   const hood=new THREE.Mesh(new THREE.CylinderGeometry(R0*1.14,R0*1.14,.09,40,1,true,-Math.PI*.9,Math.PI*1.8),LM(0x111213,6));hood.rotation.x=Math.PI/2;hood.rotation.z=Math.PI;hood.position.set(bx(620),by(300),.07);hood.userData.cwFx=1;board.add(hood);
   const scC=typeof phScopeC!=='undefined'?phScopeC:null;if(scC){const m=new THREE.MeshBasicMaterial({map:liveTex(ctx.kind,scC),toneMapped:false});ctx.o.faces.push(m);const sc=new THREE.Mesh(new THREE.CircleGeometry(R0,48),m);sc.position.set(bx(620),by(300),.0455);sc.userData.screen='phscope';board.add(sc);}}
  const glsM=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.08,shininess:140,specular:0x8a8a8a,depthWrite:false});
  function inst(k,x,y,hs,draw,round){const S=k==='adi'||k==='hsi'||k==='sby'||k==='tsd'?256:hs<40?96:192,cv=document.createElement('canvas');cv.width=cv.height=S;const t=new THREE.CanvasTexture(cv);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;ctx.o.tex.push(t);
    const c=cv.getContext('2d'),r=hs*K;
    if(round){const cs=new THREE.Mesh(new THREE.CylinderGeometry(r*1.03,r*1.08,.03,36),bz);cs.rotation.x=Math.PI/2;cs.position.set(bx(x),by(y),.008);cs.userData.cwFx=1;board.add(cs);}else{const cs=new THREE.Mesh(new THREE.CylinderGeometry(r*1.04,r*1.1,.03,40),bz);cs.rotation.x=Math.PI/2;cs.position.set(bx(x),by(y),.008);cs.userData.cwFx=1;board.add(cs);}
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const fm=new THREE.Mesh(k==='cmd'?new THREE.PlaneGeometry(r*1.8,r*1.8):new THREE.CircleGeometry(r*.9,48),m);fm.position.set(bx(x),by(y),.0235);fm.userData.cwFx=1;board.add(fm);
    {const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.92,r*.05,8,40),LM(0x0a0a0a,30));ring.position.set(bx(x),by(y),.0245);ring.userData.cwFx=1;board.add(ring);
      const gl=new THREE.Mesh(new THREE.CircleGeometry(r*.92,40),glsM);gl.position.set(bx(x),by(y),.026);gl.userData.cwFx=1;gl.renderOrder=2;board.add(gl);
      for(const [sx,sy] of[[-1,-1],[1,-1],[-1,1],[1,1]]){const s=new THREE.Mesh(new THREE.CylinderGeometry(r*.06,r*.06,.004,8),met);s.rotation.x=Math.PI/2;s.position.set(bx(x)+sx*r*.8,by(y)+sy*r*.8,.024);board.add(s);}}
    const gt=gate(k);upd.push(P=>{if(!gt())return;if(k!=='cmd'){face(c,S);c.scale(S/256,S/256);}draw(c,P);t.needsUpdate=true;});}
  INST.forEach(([k,x,y,hs,d])=>inst(k,x,y,hs,d,true));SQ.forEach(([k,x,y,hs,d])=>inst(k,x,y,hs,d,false));
  function lampAt(par,x,y,z,w,h,lg,col,lit,ww,hh){const cv=document.createElement('canvas');cv.width=128;cv.height=Math.max(32,Math.round(128*hh/ww));const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const lm=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);lm.position.set(x,y,z);lm.userData.cwFx=1;par.add(lm);let last=null;
    lamps.push(P=>{const on=lampTest>now()||!!lit(P);if(on===last)return;last=on;c.fillStyle=on?col:'#1c1a14';c.fillRect(0,0,cv.width,cv.height);const n=lg.split('\n');c.font=`bold ${Math.round(cv.height*(n.length>1?.3:.42))}px Arial`;c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=on?'#200':'#5a5444';n.forEach((l,i,a)=>c.fillText(l,64,cv.height/2+(i-(a.length-1)/2)*cv.height*.36));t.needsUpdate=true;});return lm;}
  LAMPS.forEach(([k,x,y,w,h,lg,col,lit])=>{lampAt(board,bx(x),by(y),.016,w*K,h*K,lg,col,lit,w,h);box(board,w*K+.004,h*K+.004,.012,blk,bx(x),by(y),.009);});
  // the only sight: a small fixed optical sight head on the glareshield (reticle only, no HUD symbology)
  box(g,.1,.045,.1,blk,0,-.232,-.8);box(g,.07,.03,.05,LM(0x25292c,12),0,-.205,-.77);

  /* ---------- clickable controls ---------- */
  function reg(par,mesh,name,state,act){mesh.userData.ctl={meshes:[mesh],name,state,act:(d)=>{try{act(d);}catch(e){console.warn('[f106pit]',name,e);}try{sfx.click();}catch(e){}}};ctls.push(mesh.userData.ctl);}
  function toggle(par,x,y,z,name,pos,get,set,o={}){const gq=new THREE.Group();gq.position.set(x,y,z);if(o.rx)gq.rotation.x=o.rx;par.add(gq);
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
  // instrument panel controls
  knob(board,bx(620),by(1090),.03,14*K,'TSD RANGE · 20 / 40 / 80 / 160 NM',['20','40','80','160'],'tsdR',()=>sv('tsdR',1));
  toggle(board,bx(500),by(1095),BZ,'TSD · HDG UP / NORTH UP',['HDG UP','N UP'],()=>sv('tsdN',0),v=>{ST.tsdN=v;});
  toggle(board,bx(740),by(1095),BZ,'TSD DATA LINK · ON / OFF',['OFF','ON'],()=>sv('dl',1),v=>{ST.dl=v;});
  knob(board,bx(640),by(640),.03,10*K,'HSI DISPLAY / AUTOMATIC MODE · NAV / DL / ILS / MAN',['NAV','DL','ILS','MAN'],'hmode',()=>sv('hmode',0));
  knob(board,bx(560),by(870),.03,10*K,'HSI BEARING SELECT · TAC / TGT / UHF / DL',['TAC','TGT','UHF','DL'],'bsel',()=>sv('bsel',0));
  knob(board,bx(700),by(870),.03,10*K,'HSI COURSE SET',Array.from({length:12},(_,i)=>String(i*30).padStart(3,'0')),'crsK',()=>Math.round(sv('crs',360)/30)%12,v=>{ST.crs=v*30;});
  knob(board,bx(480),by(870),.03,10*K,'HSI HEADING SET',Array.from({length:12},(_,i)=>String(i*30).padStart(3,'0')),'hdgK',()=>Math.round(sv('hdgM',0)/30)%12,v=>{ST.hdgM=v*30;});
  knob(board,bx(768),by(600),.03,10*K,'ALTIMETER BARO SET (27)',['28.1','29.0','29.92','30.5','31.0'],'baroK',()=>sv('baroK',2),v=>{ST.baroK=v;ST.baro=[28.1,29.0,29.92,30.5,31.0][v];});
  toggle(board,bx(900),by(600),BZ,'ALTIMETER RESET / STBY LEVER',['SERVO','STBY'],()=>sv('alts',0),v=>{ST.alts=v;});
  knob(board,bx(470),by(600),.03,10*K,'AMI COMMAND MACH SLEW',['0.6','0.8','0.9','1.2','1.6','2.0'],'cmdMk',()=>sv('cmdMk',2),v=>{ST.cmdMk=v;ST.cmdM=[.6,.8,.9,1.2,1.6,2.0][v];});
  button(board,bx(1040),by(1050),.03,10*K,'FUEL QUANTITY GAGE TEST BUTTON (29)',0x555555,()=>{qtyTest=now()+3;});
  knob(board,bx(960),by(1050),.03,12*K,'FUEL QUANTITY GAGE SELECTOR (34) · TOTAL / INT / EXT / L / R',['TOTAL','INT','EXT','L WING','R WING'],'fqs',()=>sv('fqs',0));
  button(board,bx(965),by(310),.03,8*K,'ENGINE FIRE WARNING TEST SWITCH (28)',0x772222,()=>{fireTest=now()+2;});
  button(board,bx(1025),by(250),.03,8*K,'MASTER WARNING LIGHT · PRESS TO RESET (38)',0x772222,()=>{ST.mwAck=1;try{setTimeout(()=>{ST.mwAck=0;},9000);}catch(e){}});
  button(board,bx(330),by(235),.03,7*K,'ACCELEROMETER · PUSH TO SET',0x333333,()=>{const P=PL();if(P){P.maxNz=1;P._minNz=1;}});
  button(board,bx(80),by(270),.03,8*K,'LAMP TEST (13 · warning lights test)',0x555555,()=>{lampTest=now()+3;});
  knob(board,bx(150),by(210),.03,10*K,'FLIGHT MODES PANEL · TRT/GYRO',['OFF','ON'],'trt',()=>sv('trt',1));
  toggle(board,bx(330),by(960),BZ,'FLIGHT MODES · NAV / DL / ILS',['NAV','DL','ILS'],()=>sv('fm',0),v=>{ST.fm=v;});
  // 7 drag chute handle, 6 tail hook button, 2 landing gear handle on the instrument panel side
  hitBox(board,bx(142),by(315),.02,40*K,30*K,'DRAG CHUTE HANDLE (7)',()=>sv('chute',0)?'DEPLOYED':'STOWED',()=>{ST.chute=1;try{if(typeof deployChute==='function')deployChute();else radio('DRAG CHUTE');}catch(e){}});
  hitBox(board,bx(80),by(315),.02,40*K,30*K,'TAIL HOOK DOWN BUTTON (6)',()=>{const P=PL();return P&&P.hook?'DOWN':'UP';},()=>{const P=PL();if(P){P.hook=!P.hook;try{flash('HOOK '+(P.hook?'DOWN':'UP'),900);}catch(e){}}});
  // radar / IR selector panel (37)
  {const RP=()=>({OFF:0,STBY:1,ON:2})[radar.power]??2;
   knob(board,bx(945),by(930),.03,12*K,'RADAR POWER · OFF / STBY / ON (37)',['OFF','STBY','ON'],'rpwr',RP,v=>{radar.power=['OFF','STBY','ON'][v];if(v===2)radar.warm=Math.max(radar.warm||0,3);});
   toggle(board,bx(1000),by(930),BZ,'RADAR / IR SELECT (37)',['RADAR','IR'],()=>radar.sensor==='IRST'?1:0,v=>{try{radar.sensor=v?'IRST':'RDR';radar.tracks.clear();}catch(e){}});}

  const CY=-.64,CW=.2,CZ0=-.54,CZ1=.3;
  function cpanel(side,u0,u1,z0,z1,title,draw){const w=CW*(u1-u0),xo=side*(.43+CW/2)-side*CW*((u0+u1)/2),d=z1-z0,cv=document.createElement('canvas');cv.width=Math.max(64,Math.round(w*1500));cv.height=Math.max(48,Math.round(d*1500));const c=cv.getContext('2d');
    c.fillStyle='#2b2f32';c.fillRect(0,0,cv.width,cv.height);c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=3;c.strokeRect(3,3,cv.width-6,cv.height-6);
    c.font='bold 15px Arial';c.textAlign='center';c.fillStyle='#ececE4';if(title)c.fillText(title,cv.width/2,19);if(draw)draw(c,cv.width,cv.height);
    for(const [sx,sy] of[[9,9],[cv.width-9,9],[9,cv.height-9],[cv.width-9,cv.height-9]]){c.fillStyle='rgba(255,255,255,.3)';c.beginPath();c.arc(sx,sy,3.5,0,7);c.fill();}
    const t=new THREE.CanvasTexture(cv);t.anisotropy=4;ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);pl.rotation.x=-Math.PI/2;pl.position.set(xo,CY+.001,(z0+z1)/2);pl.userData.cwFx=1;g.add(pl);
    return{at:(u,v,h=.004)=>[xo-w/2+u*w,CY+h,z0+v*d],lab:(s,u,v,sz=11)=>{c.font=`bold ${sz}px Arial`;c.textAlign='center';c.fillStyle='#e0e0d8';s.split('\n').forEach((l,i)=>c.fillText(l,u*cv.width,v*cv.height+i*(sz+2)));t.needsUpdate=true;}};}
  const tg=(p,u,v,name,pos,get,set,o={})=>{const[x,y,z]=p.at(u,v);return toggle(g,x,y,z,name,pos,get,set,Object.assign({rx:-Math.PI/2},o));};
  const kn=(p,u,v,r,name,pos,key,get,set,o={})=>{const[x,y,z]=p.at(u,v,.006);return knob(g,x,y,z,r,name,pos,key,get,set,Object.assign({rx:-Math.PI/2},o));};
  const zL=y=>CZ0+(y-60)/(1540-60)*(CZ1-CZ0),zR=zL;
  const T_=(u,v,n,p,k,d=0,x={})=>Object.assign({t:'t',u,v,n,p,k,d},x),K_=(u,v,n,p,k,d=0,x={})=>Object.assign({t:'k',u,v,n,p,k,d},x),B_=(u,v,n,act,x={})=>Object.assign({t:'b',u,v,n,act},x);
  function panel(side,u0,u1,y0,y1,title,items,draw){const zf=side<0?zL:zR,p=side<0?cpanel(-1,u0,u1,zf(y0),zf(y1),title,draw):cpanel(1,1-u1,1-u0,zf(y0),zf(y1),title,draw);
    for(const it of items||[]){const get=it.g||(()=>sv(it.k,it.d)),set=it.s||(x=>{ST[it.k]=x;});
      if(it.t==='t')tg(p,it.u,it.v,it.n,it.p,get,set,it.o||{});else if(it.t==='k')kn(p,it.u,it.v,it.r||.009,it.n,it.p,it.k,get,set,it.o||{});
      else{const[x,y,z]=p.at(it.u,it.v,.006);button(g,x,y,z,it.r||.006,it.n,it.col||0x2a2a2a,it.act||(()=>{}));}
      const lb=it.l!=null?it.l:it.n.replace(/\s*\(.*$/,'').replace(/ · .*/,'');if(lb){const ws=lb.split(' '),ln=[''];for(const w of ws){if((ln[ln.length-1]+' '+w).trim().length>10&&ln[ln.length-1])ln.push(w);else ln[ln.length-1]=(ln[ln.length-1]+' '+w).trim();}p.lab(ln.join('\n'),it.u,Math.min(.9,it.v+(it.ly!=null?it.ly:.24)),7);}}
    return p;}
  [-1,1].forEach(sd=>{box(g,.22,.1,.98,LM(0x2a2d30,8),sd*.43,CY-.052,-.15);box(g,.05,.1,1.3,LM(0x25282a,8),sd*.555,-.55,-.2);});
  {const sk=LM(0x1c1f21,6);box(g,1.14,.02,1.5,sk,0,-1.23,-.1);[-1,1].forEach(sd=>box(g,.03,.66,1.3,sk,sd*.565,-.93,-.2));box(g,1.1,.5,.03,sk,0,-1.0,-.86);box(g,.9,.42,.02,sk,0,-.52,-.83);}

  // ======== LEFT CONSOLE (FO-1 left console items 1-38) — u 0 = outboard, top of the figure = forward ========
  const LC=(u0,u1,y0,y1,t,it,d)=>panel(-1,u0,u1,y0,y1,t,it,d);
  // 1-4 landing gear and external tanks
  LC(.45,1,60,170,'GEAR · TANKS',[B_(.2,.35,'LANDING GEAR EMERGENCY UP BUTTON (1)',()=>{},{col:0xc03020,r:.007,l:'EMER UP'}),
    T_(.5,.35,'LANDING GEAR HANDLE (2)',['UP','DOWN'],'gearH',0,{g:()=>gearDn()?1:0,s:()=>{try{CTL.map.KeyG.fn();}catch(e){}},l:'GEAR'}),
    B_(.8,.35,'EXTERNAL WING TANKS RELEASE BUTTON (3)',()=>{try{radio('EXTERNAL TANKS · JETTISON');if(typeof jettison==='function')jettison();}catch(e){}},{col:0xc8a020,r:.007,l:'TANKS REL'}),
    T_(.5,.8,'LANDING GEAR EMERGENCY EXTENSION HANDLE (4)',['STOWED','PULLED'],'gEmer',0,{l:'EMER EXT'})]);
  // 5-10
  LC(.45,1,170,300,'',[T_(.15,.3,'ALTITUDE BAND SWITCH (5)',['OFF','ON'],'altb',0),T_(.4,.3,'MASTER ELECTRICAL POWER SWITCH (6)',['OFF','ON'],'mast',1,{l:'MASTER'}),B_(.65,.3,'LANDING GEAR AUDIO WARNING CUTOFF BUTTON (7)',()=>{},{r:.006}),
    T_(.88,.3,'IDLE THRUST CONTROL SWITCH (8)',['OFF','IDLE'],'idlT',0,{l:'IDLE THRUST'}),T_(.25,.78,'CG CONTROL SWITCH (9)',['AUTO','MAN'],'cgc',0),B_(.7,.78,'CG TRANSFER TEST FAILURE LIGHT (10)',()=>{lampTest=now()+2;},{col:0x553300,r:.006})]);
  // 11 radar/IR control, 12 oxygen, 13 ILS channel
  LC(.45,1,300,420,'RADAR / IR CONTROL (11)',[K_(.25,.5,'RADAR / IR POWER (11)',['OFF','STBY','ON'],'rirp',2,{r:.011,l:'POWER'}),K_(.65,.5,'RADAR RANGE (11)',['10','20','40','80'],'rrng',2,{g:()=>radar.ri,s:v=>{radar.ri=v;},r:.01,l:'RANGE'})]);
  LC(.45,1,420,520,'OXYGEN (12)',[T_(.25,.45,'OXYGEN SUPPLY LEVER',['OFF','ON'],'o2',1),K_(.6,.45,'DILUTER · NORMAL / 100%',['NORMAL','100%'],'dil',0,{r:.01}),T_(.88,.45,'EMERGENCY',['NORMAL','EMER'],'o2e',0)]);
  LC(.45,1,520,600,'ILS CHANNEL (13)',[K_(.5,.5,'ILS CHANNEL SELECTOR (13)',Array.from({length:10},(_,i)=>String(i+1)),'ils',0,{r:.011,l:'CHAN'})]);
  // 14 armament control panel
  LC(.45,1,600,760,'ARMAMENT CONTROL (14)',[K_(.2,.4,'MISSILE SELECT · AIM-4F / AIM-4G / AIR-2A (14)',['SAFE','AIM-4F','AIM-4G','GENIE'],'wsl',0,{r:.01,l:'MISSILE',s:v=>{ST.wsl=v;try{const m=[null,'AIM-4F','AIM-4G','AIR-2A'][v];if(m&&MSL[m])game.wsel=m;}catch(e){}}}),
    T_(.55,.35,'MASTER ARM (14)',['SAFE','ARM'],'arm',0,{g:()=>game.arm?1:0,s:v=>{try{setArm(v?0:1);}catch(e){game.arm=!!v;}}}),T_(.85,.35,'GUN SELECT (14)',['OFF','ON'],'gunS',0),
    T_(.3,.8,'AIR-2A ARM / SAFE / MONITOR POWER (38)',['SAFE','ARM'],'genie',0,{o:{guard:true,guardUp:()=>sv('genie',0)}}),B_(.7,.8,'ARMAMENT RECYCLE BUTTON (30)',()=>{},{r:.006})]);
  // 17 UHF, 21 IFF, 22 mask defog, 23 anti-G test
  LC(.45,1,760,900,'UHF (17)',[K_(.3,.5,'UHF CHANNEL (17)',Array.from({length:20},(_,i)=>String(i+1)),'uhfCh',6,{g:()=>sv('uhfCh',7)-1,s:v=>{ST.uhfCh=v+1;},r:.016,l:'CHAN'}),K_(.78,.4,'UHF FUNCTION (17)',['OFF','T/R','T/R+G','ADF'],'ufn',1,{r:.009})]);
  LC(.45,1,900,1030,'IFF (21)',[K_(.25,.5,'IFF MASTER · OFF / STBY / LOW / NORM / EMER (21)',['OFF','STBY','LOW','NORM','EMER'],'iff',3,{r:.011}),T_(.58,.3,'IFF MODE 2',['OFF','ON'],'iff2',1),T_(.58,.72,'IFF MODE 3',['OFF','ON'],'iff3',1),T_(.85,.5,'IFF I/P',['OUT','MIC'],'iffp',0)]);
  LC(.45,1,1030,1110,'',[K_(.3,.5,'MASK DEFOG RHEOSTAT (22)',['OFF','LOW','MED','HIGH'],'mdf',0,{r:.009,l:'MASK DEFOG'}),B_(.7,.5,'ANTI-G SUIT TEST BUTTON (23)',()=>{},{r:.007,l:'ANTI-G TEST'})]);
  // 24 MA-1 power, 25 fuel control, 26 MA-1 test, 27 cabin air, 28 air refuelling, 29 variable ramp recycle, 31 pitch G limit test
  LC(.45,1,1110,1230,'MA-1 POWER (24)',[T_(.2,.45,'MA-1 POWER',['OFF','ON'],'ma1',1),K_(.55,.45,'MA-1 MASTER · OFF / STBY / ON',['OFF','STBY','ON'],'ma1m',2,{r:.01}),T_(.85,.45,'COMPUTER',['OFF','ON'],'compOn',1)]);
  LC(.45,1,1230,1330,'FUEL CONTROL (25)',[T_(.2,.45,'FUEL BOOST PUMPS',['OFF','ON'],'boost',1),T_(.5,.45,'EXTERNAL TANK TRANSFER',['OFF','ON'],'xt',1),T_(.8,.45,'WING TRANSFER',['OFF','ON'],'wxfr',1)]);
  LC(.45,1,1330,1400,'MA-1 TEST (26)',[B_(.3,.5,'MA-1 TEST BUTTON',()=>{lampTest=now()+3;},{r:.008}),B_(.7,.5,'PITCH G LIMIT TEST (31)',()=>{},{r:.008})]);
  LC(.45,1,1400,1470,'AIR REFUELING (28)',[T_(.3,.5,'AIR REFUELING SLIPWAY / RECEPTACLE',['CLOSE','OPEN'],'arr',0),B_(.7,.5,'VARIABLE RAMP SWITCH (29)',()=>{},{r:.007})]);
  // 15-16 throttle quadrant (outboard column), 18-20 trim and fuel control switch
  {const thq=panel(-1,0,.45,60,420,'THROTTLE (15)',[T_(.5,.88,'FUEL CONTROL SWITCH (19)',['OFF','ON'],'fcs',1,{l:'FUEL'}),K_(.5,.72,'RUDDER TRIM SWITCH (20)',['NOSE LEFT','NEUTRAL','NOSE RIGHT'],'rtrim',1,{r:.01,l:'RUDDER TRIM'})]);
    const tq=new THREE.Group();g.add(tq);const[x0,y0]=thq.at(.5,0);tq.position.set(x0,y0,zL(190));
    const arm=new THREE.Group();tq.add(arm);box(arm,.01,.11,.012,met,0,.055,0);const grip=new THREE.Group();grip.position.y=.11;arm.add(grip);
    box(grip,.034,.05,.065,LM(0x1c1c1c,25),-.006,0,0);box(grip,.012,.012,.012,LM(0xb02020,30),-.022,.018,-.014);box(grip,.01,.016,.01,LM(0x777777,30),-.024,-.008,.012);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.06,.07,.08),hit);hb.userData.cwFx=1;grip.add(hb);
    reg(grip,hb,'THROTTLE (16) · speed brake switch, ignition button, mic button on the grip',()=>{const P=PL();return Math.round((P?P.thr:0)*100)+'%'+(P&&P.ab>.1?' · AFTERBURNER':'');},()=>{});
    upd.push(P=>{arm.rotation.x=.32-(P.thr||0)*.8;arm.rotation.z=P.ab>.1?-.12:0;});
    const sbh=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,.02),hit);sbh.position.set(-.024,-.008,.012);sbh.userData.cwFx=1;grip.add(sbh);
    reg(grip,sbh,'SPEED BRAKES SWITCH (throttle grip)',()=>keys.has('KeyB')?'OUT':'IN',()=>{if(keys.has('KeyB'))keys.delete('KeyB');else keys.add('KeyB');});}
  // outboard column: 33 RAT, 34 pressure suit, 35 reset / MBL, 36 no-fog, 37 landing and taxi lights, 32 left fuse / circuit breaker panel
  LC(0,.45,420,520,'RAT HANDLE (33)',[T_(.5,.5,'RAM AIR TURBINE (RAT) HANDLE (33)',['STOWED','EXTENDED'],'rat',0,{o:{guard:true,guardUp:()=>sv('rat',0)},l:'RAT'})]);
  LC(0,.45,520,600,'PRESSURE SUIT (34)',[T_(.5,.5,'PRESSURE SUIT CONTROL HANDLE (34)',['OFF','ON'],'psuit',0,{l:'SUIT'})]);
  LC(0,.45,600,760,'',[T_(.25,.25,'RESET / MBL SWITCH (35)',['RESET','MBL'],'mbl',0,{l:'RESET/MBL'}),T_(.7,.25,'COCKPIT NO-FOG AND VENTILATED SUIT SWITCH (36)',['OFF','ON'],'nofog',0,{l:'NO-FOG'}),T_(.25,.72,'LANDING AND TAXI LIGHT SWITCH (37)',['OFF','TAXI','LAND'],'ltx',0,{l:'LDG/TAXI'}),T_(.7,.72,'CABIN AIR SELECTOR (27)',['OFF','NORMAL','DUMP'],'cabAir',1,{l:'CABIN AIR'})]);
  panel(-1,0,.45,760,1500,'L FUSE / CIRCUIT BREAKER (32)',[],(c,w,h)=>{c.fillStyle='#17191a';c.fillRect(w*.06,h*.05,w*.88,h*.9);c.fillStyle='#d8d8d0';for(let i=0;i<7;i++)for(let j=0;j<14;j++){c.beginPath();c.arc(w*(.14+i*.12),h*(.1+j*.06),3.5,0,7);c.fill();}});

  // ======== RIGHT CONSOLE (FO-1 right console items 1-37) — u 0 = inboard, top of the figure = forward ========
  const RC=(u0,u1,y0,y1,t,it,d)=>panel(1,u0,u1,y0,y1,t,it,d);
  // 1 master warning light panel
  RC(0,.62,60,300,'MASTER WARNING LIGHT PANEL (1)',[],(c,w,h)=>{const ls=['FUEL LOW','OIL PRESS','GEN','HYD','ENG','CANOPY','RAMP','CG'];ls.forEach((s,i)=>{const x=w*(.14+(i%4)*.24),y=h*(.35+Math.floor(i/4)*.3);c.fillStyle='#4a3a10';c.fillRect(x-w*.1,y-h*.09,w*.2,h*.17);c.font='bold 10px Arial';c.fillStyle='#1a1306';c.textAlign='center';c.fillText(s,x,y+3);});});
  // 2 / 3 / 4 hydraulic pressure gages, oil pressure
  RC(0,.62,300,420,'HYD · OIL PRESS (2-4)',[],(c,w,h)=>{[['PRI HYD',.2],['SEC HYD',.5],['OIL PRESS',.8]].forEach(([s,u])=>{c.strokeStyle='#e8e8e0';c.lineWidth=2;c.beginPath();c.arc(u*w,h*.5,h*.3,0,7);c.stroke();c.fillStyle='#e8e8e0';c.font='bold 9px Arial';c.textAlign='center';c.fillText(s,u*w,h*.92);});});
  RC(.62,1,60,300,'',[T_(.5,.12,'IFF CAUTION LIGHT (5)',['OFF','ON'],'iffc',0,{l:'IFF CAUT'}),T_(.5,.3,'GENERATOR SWITCH (6)',['OFF','NORM'],'gen',1,{l:'GEN'}),T_(.5,.48,'NO. 3 FUEL TANK SWITCH (7)',['OFF','NORM'],'tk3',1,{l:'NO.3 TANK'}),T_(.5,.66,'CANOPY SWITCH (8)',['CLOSE','OPEN'],'cnpS',0,{l:'CANOPY'}),T_(.5,.84,'DATA LINK ANTENNA SWITCH (9)',['AUTO','MAN'],'dla',0,{l:'DL ANT'})]);
  RC(.62,1,300,420,'',[T_(.5,.3,'CANOPY LATCH HANDLE (10)',['LATCHED','OPEN'],'cnpL',0,{l:'LATCH'}),T_(.5,.7,'ATG SWITCH (11)',['OFF','ON'],'atg',0)]);
  // 12-14 map reading light, warning lights test, 15 EGT spread, 16 emergency AC generator, 17 windshield anti-ice
  RC(0,1,420,520,'',[T_(.15,.45,'MAP READING LIGHT SWITCH (12)',['OFF','ON'],'mapL',0,{l:'MAP LT'}),B_(.38,.45,'WARNING LIGHTS TEST BUTTON (13)',()=>{lampTest=now()+3;try{radio('WARNING LIGHTS TEST');}catch(e){}},{r:.008,l:'LIGHTS TEST'}),
    B_(.6,.45,'EGT SPREAD BUTTON (15)',()=>{},{r:.007,l:'EGT SPREAD'}),T_(.82,.45,'EMERGENCY AC GENERATOR SWITCH (16)',['OFF','ON'],'eag',0,{l:'EMER GEN',o:{guard:true,guardUp:()=>sv('eag',0)}})]);
  RC(0,1,520,620,'',[T_(.2,.45,'WINDSHIELD ANTI-ICE (17)',['OFF','ON'],'wai',0,{l:'WSHLD AI'}),T_(.5,.45,'WINDSHIELD ANTIFOG (17)',['OFF','ON'],'waf',0,{l:'WSHLD AF'}),K_(.8,.45,'TACAN-ADF SELECTOR SWITCH (19)',['TACAN','ADF'],'tacadf',0,{r:.009,l:'TACAN-ADF'})]);
  RC(0,1,620,720,'',[B_(.2,.45,'ENGINE ANTI-ICE WARNING TEST BUTTON (20)',()=>{lampTest=now()+2;},{r:.007,l:'ENG AI TEST'}),T_(.5,.45,'RAIN REMOVAL SWITCH (21)',['OFF','ON'],'rain',0,{l:'RAIN'}),K_(.8,.45,'ALTITUDE WARNING SELECTOR (21A)',['OFF','5','10','20','30'],'aws',0,{r:.009,l:'ALT WARN'})]);
  RC(0,1,720,820,'',[T_(.2,.45,'EJECTION SEAT GROUND SAFETY PIN STOWAGE (22)',['STOWED','OUT'],'pin',0,{l:'SEAT PIN'}),K_(.5,.45,'CABIN TEMPERATURE CONTROL KNOB (23)',['COLD','MID','HOT'],'ctk',1,{r:.01,l:'CABIN TEMP'}),T_(.8,.45,'PITOT HEAT SWITCH (24)',['OFF','ON'],'pitot',0,{l:'PITOT'})]);
  RC(0,1,820,920,'',[T_(.2,.45,'CANOPY ANTIFOG SWITCH (25)',['OFF','ON'],'canf',0,{l:'CANOPY AF'}),T_(.5,.45,'SURFACE AND ENGINE ANTI-ICING SWITCH (26)',['OFF','SURF','ENG','BOTH'],'sai',0,{l:'ANTI-ICE'}),K_(.8,.45,'COMPASS SYSTEM CONTROLLER (27)',['SLAVED','FREE'],'cmpc',0,{r:.009,l:'COMPASS'})]);
  RC(0,1,920,1100,'R FUSE / CIRCUIT BREAKER (28)',[],(c,w,h)=>{c.fillStyle='#17191a';c.fillRect(w*.06,h*.12,w*.88,h*.8);c.fillStyle='#d8d8d0';for(let i=0;i<8;i++)for(let j=0;j<5;j++){c.beginPath();c.arc(w*(.14+i*.1),h*(.22+j*.14),3.2,0,7);c.fill();}});
  RC(0,1,1100,1200,'',[T_(.2,.45,'MATTS SWITCH (29)',['OFF','ON'],'matts',0,{l:'MATTS'}),K_(.55,.45,'LIGHTING CONTROL POWERSTATS (31)',['OFF','DIM','MED','BRT'],'ilt',2,{r:.011,l:'POWERSTAT'}),K_(.85,.45,'LIGHTING CONTROL PANEL (32)',['OFF','DIM','MED','BRT'],'clt',2,{r:.009,l:'LIGHTING'})]);
  RC(0,1,1200,1330,'DATA LINK (33)',[T_(.2,.45,'DATA LINK ON / OFF',['OFF','ON'],'dlk',1,{g:()=>sv('dl',1),s:v=>{ST.dl=v;},l:'DL'}),K_(.55,.45,'DATA LINK MODE · NAV / DL / ILS',['NAV','DL','ILS'],'dlm',0,{r:.01,l:'MODE'}),K_(.85,.45,'AUTO-NAVIGATION HOMING POINT SELECTOR (34)',['1','2','3','4','5'],'hp',0,{r:.009,l:'HOMING PT'})]);
  RC(0,1,1330,1440,'TACAN (35)',[K_(.2,.5,'TACAN CHANNEL TENS',Array.from({length:13},(_,i)=>String(i*10)),'tch10',3,{r:.011}),K_(.5,.5,'TACAN CHANNEL UNITS',['0','1','2','3','4','5','6','7','8','9'],'tch1',4,{r:.009}),K_(.82,.5,'TACAN FUNCTION · OFF / REC / T/R / A/A',['OFF','REC','T/R','A/A'],'tfn',2,{r:.009})]);
  RC(0,1,1440,1520,'',[T_(.3,.45,'REFRIGERATION UNIT SWITCH (36)',['OFF','ON'],'ref',1,{l:'REFRIG'}),T_(.7,.45,'CABIN AIR SELECTOR SWITCH (37)',['RAM','NORM','DUMP'],'cabAir2',1,{l:'CABIN AIR'})]);

  // control stick: borrowed stick motion drives it
  const stkG=new THREE.Group(),thrG=new THREE.Group();g.add(stkG);g.add(thrG);thrG.visible=false;stkG.scale.set(1,.55,1);
  box(stkG,.026,.34,.026,LM(0x1a1a1a,30),0,.17,0);box(stkG,.042,.12,.048,LM(0x2a2a2a,20),0,.39,-.004,-.25);box(stkG,.014,.016,.014,LM(0x777777,30),0,.455,.004);box(stkG,.012,.022,.012,LM(0xb02020,30),-.018,.43,0);box(stkG,.006,.03,.022,LM(0x888888,30),0,.37,-.03);
  let t=0;
  return{stkG,thrG,ctls,upd:(P)=>{if(!P)return;if(!cautions(P).length)ST.mwAck=0;for(const l of lamps)l(P);const tn=now();if(tn-t<.025)return;t=tn;
        {const E=P.eng&&!P.eng.done?P.eng.e[0]:null;
     FKA=[q(P.bank,229),q(P.pitch,229),q(P.hdg,2),q(P.cas,1),q(P.mach,100),q(P.alpha,229),q(P.pos.y,.66),q(P.vel?P.vel.y:0,.1),q(P.nz,20),q(P.maxNz,5),q(P.beta,115),0,q(radar.bug?radar.bug.pos.x/500:0,1)+q(P.pos.x,.02),q(P.pos.z,.02),STV];FK=FKA.join();
     SK=[q(P.n,50),q(P.thr,50),q(P.totalFuel,.2),q(P.gearPos,20),q(P.ab,10),Math.floor(now()),lampTest>now()?1:0,STV,E?q(E.rpm,2)+'/'+q(E.egt,40)+(E.lit?1:0):'',(P.fire||0)>0?1:0,q(P.ctl?P.ctl.r:0,20),(typeof cautions==='function'?cautions(P).join('.'):''),P.hook?1:0,P.onGnd?1:0].join();}
    for(let i=0;i<upd.length;i++){try{upd[i](P);}catch(e){}}}};}

PIT[ID].custom=build;
console.info('[f106pit] F-106A T.O. 1F-106A-1 FO-1 cockpit active (no HUD)');
})();
