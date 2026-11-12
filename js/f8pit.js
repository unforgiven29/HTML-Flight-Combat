/* =====================================================================================================================
   v240 — F-8E Crusader cockpit, 1:1 after NAVAIR 01-45HHD-1 (NATOPS F-8D/E, changed 15 January 1967).
   * Instrument board: figure 1-3 sheet 2 (F-8E typical, BuNo 150284 and subsequent). Every item 1-45 is placed at its position
     measured from the figure (board coordinates in figure pixels, 0.68 mm each), on an arched board with the armament pedestal.
     Each instrument is its own live face in a square case; warning lights are separate lamps; switches are 3D and clickable.
   * Left console: figure 1-4 sheet 2 (items 1-34). Right console: figure 1-5 sheet 2 (items 1-24, before AFC 490).
   * Functions: gear, wing incidence (handle / release / downlock / guard), throttle (cutoff ⇄ idle on a cold start, follows the
     power lever), speed brake, cruise droop, engine master, master generator, anti-icing / pitot, arresting hook, master arm,
     armament select (guns / Sidewinder / rockets-bombs), select jettison, radar power / range, UHF channel, fire-warning test,
     fuel quantity test. Other switches keep their own positions.
   Needs game.js, cwpit.js, cw-systems.js, startup.js.
   ===================================================================================================================== */
(function(){
'use strict';
const PIT=window.CW_PIT;if(!PIT||!PIT['F-8E']){console.warn('[f8pit] cwpit missing');return;}
const ID='F-8E',K=.00077,OX=606,OY=380;
const PL=()=>typeof player!=='undefined'?player:null;
const bx=x=>(x-OX)*K,by=y=>(OY-y)*K;
const now=()=>performance.now()/1000;
let STV=0,FK='',SK='',FKA=[];
const ST=new Proxy({},{set(t,k,v){t[k]=v;STV++;return true;}});                 // switch positions that have no game function
const sv=(k,d)=>ST[k]===undefined?d:ST[k];
let lampTest=0,qtyTest=0;

/* ---------------- engine / aircraft readouts ---------------- */
const E0=P=>P.eng&&!P.eng.done?P.eng.e[0]:null;
const running=P=>{const e=E0(P);return e?e.lit:P.totalFuel>0&&!(P.dm&&P.dm.eng<=0);};
const rpm=P=>{const e=E0(P);return e?e.rpm:running(P)?62+38*clamp(P.n||0,0,1.05):0;};
const egt=P=>{const e=E0(P);return e?e.egt*800:window.ENGSYS&&window.ENGSYS.on?ENGSYS.egt(P,0):running(P)?320+300*clamp(P.n||0,0,1)+120*(P.ab||0):20;};
const LB=2.2046;

/* ---------------- 2D drawing helpers for faces ---------------- */
const INK='#f0f0ea',DIM='#a8aca4',FACE='#0d0e0f';
function face(c,S){c.setTransform(1,0,0,1,0,0);c.fillStyle=FACE;c.fillRect(0,0,S,S);c.translate(S/2,S/2);}
function T(c,s,x,y,sz,col=INK,al='center',f='bold'){c.font=`${f} ${sz}px Arial, Helvetica, sans-serif`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;c.fillText(s,x,y);}
function scale(c,r,a0,a1,n,maj,lbls,lr=.66,sz=18){c.strokeStyle=INK;for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n-90)*D2R,M=i%maj===0;c.lineWidth=M?3.2:1.6;
  c.beginPath();c.moveTo(Math.cos(a)*r*(M?.78:.87),Math.sin(a)*r*(M?.78:.87));c.lineTo(Math.cos(a)*r*.97,Math.sin(a)*r*.97);c.stroke();}
  if(lbls)lbls.forEach((v,i)=>{const a=(a0+(a1-a0)*i/(lbls.length-1)-90)*D2R;T(c,String(v),Math.cos(a)*r*lr,Math.sin(a)*r*lr,sz);});}
function needle(c,r,deg,len=.84,w=7,col=INK,tail=.18){c.save();c.rotate(deg*D2R);c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=6;c.shadowOffsetX=3;c.shadowOffsetY=4;
  c.fillStyle=col;c.beginPath();c.moveTo(-w*.5,r*tail);c.lineTo(-w*.4,-r*len*.75);c.lineTo(0,-r*len);c.lineTo(w*.4,-r*len*.75);c.lineTo(w*.5,r*tail);c.closePath();c.fill();c.restore();
  c.fillStyle='#222';c.beginPath();c.arc(0,0,w*1.1,0,7);c.fill();c.fillStyle='#555';c.beginPath();c.arc(0,0,w*.5,0,7);c.fill();}
function win(c,x,y,w,h,s,sz,col='#fff'){c.fillStyle='#000';c.fillRect(x-w/2,y-h/2,w,h);c.strokeStyle='#444';c.lineWidth=2;c.strokeRect(x-w/2,y-h/2,w,h);T(c,s,x,y+1,sz,col,'center','bold');}
function barber(c,x,y,r){c.save();c.beginPath();c.arc(x,y,r,0,7);c.clip();c.translate(x,y);c.rotate(.8);for(let i=-6;i<7;i++){c.fillStyle=i%2?'#eee':'#1a1a1a';c.fillRect(i*r*.28,-r*2,r*.28,r*4);}c.restore();}
const R=110; // face radius on a 256 canvas
// gauge = (value 0..1 across the arc)
const G=(lbl,a0,a1,n,maj,lbls,v,sub,sz)=>(c,P)=>{scale(c,R,a0,a1,n,maj,lbls,.64,sz||20);T(c,lbl,0,R*.36,15,DIM);if(sub)T(c,sub,0,R*.55,13,DIM);needle(c,R,a0+(a1-a0)*clamp(v(P),0,1));};

/* ---------------- the instruments (figure 1-3 sheet 2) ---------------- */
// [key, x, y, half-size of case (figure px), draw]
const F={
 tach:(c,P)=>{scale(c,R,-150,150,22,2,[0,10,20,30,40,50,60,70,80,90,100,110],.66,17);T(c,'PERCENT',0,R*.32,14,DIM);T(c,'RPM',0,R*.48,14,DIM);needle(c,R,-150+300*clamp(rpm(P)/110,0,1));},
 aoa:(c,P)=>{scale(c,R,-135,135,30,5,[0,5,10,15,20,25,30],.64,19);const u=clamp((P.alpha||0)*R2D*1.25+2,0,30);
   c.strokeStyle='#e6c43a';c.lineWidth=7;c.beginPath();c.arc(0,0,R*.9,(-135+270*14/30-90)*D2R,(-135+270*17/30-90)*D2R);c.stroke();// approach band
   T(c,'ANGLE OF',0,R*.34,13,DIM);T(c,'ATTACK',0,R*.5,13,DIM);T(c,'UNITS',0,R*.66,11,DIM);needle(c,R,-135+270*u/30);},
 epr:(c,P)=>{scale(c,R,-140,140,24,4,['1.0','1.4','1.8','2.2','2.6','3.0','3.4'],.64,17);const r=rpm(P),e=r<40?1:1+clamp((r-55)/55,0,1)*2.1+(P.ab||0)*.15;
   T(c,'ENGINE',0,R*.3,13,DIM);T(c,'PRESSURE',0,R*.46,13,DIM);T(c,'RATIO',0,R*.62,13,DIM);needle(c,R,-140+280*clamp((e-1)/2.4,0,1));},
 vvi:(c,P)=>{const v=(P.vel?P.vel.y:0)*196.85/1000;scale(c,R,-170,-10,12,2,[6,4,2,1,0],.64,19);scale(c,R,10,170,12,2,[0,1,2,4,6],.64,19);
   T(c,'CLIMB',-R*.45,-R*.12,14,DIM,'left');T(c,'DIVE',-R*.45,R*.12,14,DIM,'left');T(c,'1000 FT PER MIN',R*.05,R*.5,11,DIM);
   const f=x=>{const a=Math.abs(x);return Math.sign(x)*(a<1?a*.25:a<2?.25+(a-1)*.2:.45+(a-2)/4*.55);};needle(c,R,-90-clamp(f(clamp(v,-6,6)),-1,1)*80);},
 egt:(c,P)=>{scale(c,R,-150,150,24,4,[0,2,4,6,8,10,12],.64,19);T(c,'EXHAUST',0,R*.3,13,DIM);T(c,'TEMP',0,R*.46,13,DIM);T(c,'°C × 100',0,R*.62,12,DIM);
   const e=egt(P);c.strokeStyle='#d33';c.lineWidth=7;c.beginPath();c.arc(0,0,R*.9,(-150+300*6.3/12-90)*D2R,(-150+300*6.6/12-90)*D2R);c.stroke();needle(c,R,-150+300*clamp(e/1200,0,1));},
 acc:(c,P)=>{P._minNz=Math.min(P._minNz==null?1:P._minNz,P.nz||1);scale(c,R,-150,150,14,2,[-4,-2,0,2,4,6,8,10],.64,19);T(c,'G UNITS',0,R*.42,13,DIM);
   const a=g=>-150+300*clamp((g+4)/14,0,1);needle(c,R,a(P.maxNz||1),.78,4,'#e8e8e0');needle(c,R,a(P._minNz),.78,4,'#e8e8e0');needle(c,R,a(P.nz||1));},
 oil:G('ENG OIL',-130,130,10,2,[0,20,40,60,80,100],P=>window.ENGSYS&&window.ENGSYS.on?ENGSYS.oilP(P,0)/100:running(P)?(rpm(P)<70?.3+rpm(P)/400:.42+(P.n||0)*.08):0,'PSI'),
 ralt:(c,P)=>{const h=Math.max(0,(P.pos.y-groundAt(P.pos.x,P.pos.z))*3.2808),pwr=!!sv('ralt',1),f=v=>v<1000?v/1000*.6:.6+clamp((v-1000)/4000,0,1)*.4;
   scale(c,R,-160,160,20,4,[0,200,400,600,800,1000,'',2000,'',5000],.64,15);T(c,'RADIO',0,R*.28,13,DIM);T(c,'ALTITUDE',0,R*.43,13,DIM);T(c,'FEET',0,R*.58,12,DIM);
   if(!pwr||h>5000){c.fillStyle='#c22';c.fillRect(-R*.3,-R*.62,R*.6,R*.24);T(c,'OFF',0,-R*.5,16,'#fff');}needle(c,R,-160+320*f(pwr?Math.min(h,5000):0));},
 asi:(c,P)=>{const v=P.cas||0,m=P.mach||0,a=v=>v<100?-150+v/100*20:v<300?-130+(v-100)/200*120:-10+clamp((v-300)/550,0,1)*170;
   c.strokeStyle=INK;for(const t of[80,100,150,200,250,300,350,400,450,500,550,600,700,800]){const q=(a(t)-90)*D2R,M=t%100===0;c.lineWidth=M?3:1.6;c.beginPath();c.moveTo(Math.cos(q)*R*(M?.8:.87),Math.sin(q)*R*(M?.8:.87));c.lineTo(Math.cos(q)*R*.97,Math.sin(q)*R*.97);c.stroke();
     if(M)T(c,String(t/10|0),Math.cos(q)*R*.66,Math.sin(q)*R*.66,17);}
   // Mach sub-dial rotates with pressure altitude; the needle tip reads it
   c.save();c.beginPath();c.arc(0,0,R*.42,0,7);c.fillStyle='#161718';c.fill();c.restore();T(c,'MACH',0,-R*.18,12,DIM);win(c,0,R*.06,R*.62,R*.24,m.toFixed(2),20);T(c,'KNOTS',0,R*.3,11,DIM);needle(c,R,a(v));},
 alt:(c,P)=>{const h=Math.max(0,P.pos.y*3.2808);scale(c,R,0,324,50,5,[0,1,2,3,4,5,6,7,8,9],.64,22);T(c,'ALT',0,-R*.34,16,DIM);
   win(c,-R*.18,R*.3,R*.62,R*.26,String(Math.floor(h/1000)).padStart(2,'0'),22);T(c,'× 1000',R*.32,R*.3,11,DIM);needle(c,R,(h%1000)/1000*360,.86,8);},
 adi:(c,P)=>{c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();c.rotate(-(P.bank||0));const k=R/50,po=(P.pitch||0)*R2D*k;
   c.fillStyle='#e8e8e0';c.fillRect(-R*2,-R*3+po,R*4,R*3);c.fillStyle='#1b1b1b';c.fillRect(-R*2,po,R*4,R*3);
   c.strokeStyle='#111';c.lineWidth=2;for(let q=5;q<=60;q+=5){const y=po-q*k,w=q%10?R*.12:R*.28;c.beginPath();c.moveTo(-w,y);c.lineTo(w,y);c.stroke();if(q%10===0){T(c,String(q),w+14,y,12,'#111');}}
   c.strokeStyle='#e8e8e0';for(let q=5;q<=60;q+=5){const y=po+q*k,w=q%10?R*.12:R*.28;c.beginPath();c.moveTo(-w,y);c.lineTo(w,y);c.stroke();if(q%10===0)T(c,String(q),w+14,y,12,'#e8e8e0');}
   c.strokeStyle='#d33';c.lineWidth=3;c.beginPath();c.moveTo(-R*2,po);c.lineTo(R*2,po);c.stroke();c.restore();
   c.strokeStyle=INK;c.lineWidth=2;for(const b of[-60,-30,-20,-10,10,20,30,60]){const q=(b-90)*D2R;c.beginPath();c.moveTo(Math.cos(q)*R*.86,Math.sin(q)*R*.86);c.lineTo(Math.cos(q)*R*.98,Math.sin(q)*R*.98);c.stroke();}
   c.save();c.rotate(-(P.bank||0));c.fillStyle=INK;c.beginPath();c.moveTo(0,-R*.84);c.lineTo(-7,-R*.72);c.lineTo(7,-R*.72);c.closePath();c.fill();c.restore();
   c.strokeStyle='#ffb21a';c.lineWidth=6;c.beginPath();c.moveTo(-R*.58,0);c.lineTo(-R*.2,0);c.lineTo(-R*.1,R*.1);c.lineTo(0,0);c.lineTo(R*.1,R*.1);c.lineTo(R*.2,0);c.lineTo(R*.58,0);c.stroke();
   if(!running(P)&&!(P.eng&&P.eng.gen)){c.fillStyle='#c22';c.fillRect(R*.45,-R*.75,R*.36,R*.2);T(c,'OFF',R*.63,-R*.65,13,'#fff');}},
 crs:(c,P)=>{const hd=P.hdg||0,brg=brgField(P);c.save();c.rotate(-hd*D2R);for(let i=0;i<72;i++){const a=i*5*D2R;c.strokeStyle=INK;c.lineWidth=i%2?1.5:3;c.beginPath();c.moveTo(Math.sin(a)*R*(i%2?.86:.8),-Math.cos(a)*R*(i%2?.86:.8));c.lineTo(Math.sin(a)*R*.97,-Math.cos(a)*R*.97);c.stroke();}
   ['N','3','6','E','12','15','S','21','24','W','30','33'].forEach((s,i)=>{c.save();c.rotate(i*30*D2R);T(c,s,0,-R*.66,s.length>1?16:20);c.restore();});
   c.rotate(brg*D2R);c.strokeStyle='#e8c040';c.lineWidth=5;c.beginPath();c.moveTo(0,-R*.55);c.lineTo(0,R*.55);c.stroke();c.fillStyle='#e8c040';c.beginPath();c.moveTo(0,-R*.62);c.lineTo(-9,-R*.45);c.lineTo(9,-R*.45);c.closePath();c.fill();c.restore();
   c.strokeStyle='#ffb21a';c.lineWidth=3;c.beginPath();c.moveTo(0,-R*.12);c.lineTo(0,R*.12);c.moveTo(-R*.2,0);c.lineTo(R*.2,0);c.stroke();c.fillStyle=INK;c.beginPath();c.moveTo(0,-R);c.lineTo(-7,-R+13);c.lineTo(7,-R+13);c.fill();},
 bdhi:(c,P)=>{const hd=P.hdg||0,brg=brgField(P),d=distField(P);c.save();c.rotate(-hd*D2R);for(let i=0;i<72;i++){const a=i*5*D2R;c.strokeStyle=INK;c.lineWidth=i%2?1.5:3;c.beginPath();c.moveTo(Math.sin(a)*R*(i%2?.86:.8),-Math.cos(a)*R*(i%2?.86:.8));c.lineTo(Math.sin(a)*R*.97,-Math.cos(a)*R*.97);c.stroke();}
   ['N','3','6','E','12','15','S','21','24','W','30','33'].forEach((s,i)=>{c.save();c.rotate(i*30*D2R);T(c,s,0,-R*.68,s.length>1?15:19);c.restore();});
   c.save();c.rotate(brg*D2R);c.fillStyle='#e8e8e0';c.fillRect(-3,-R*.78,6,R*1.5);c.beginPath();c.moveTo(0,-R*.86);c.lineTo(-10,-R*.66);c.lineTo(10,-R*.66);c.fill();c.restore();// No. 1 (TACAN)
   c.save();c.rotate((brg+180)*D2R);c.strokeStyle='#e8c040';c.lineWidth=4;c.beginPath();c.moveTo(0,-R*.7);c.lineTo(0,R*.6);c.stroke();c.restore();c.restore();
   c.fillStyle=INK;c.beginPath();c.moveTo(0,-R);c.lineTo(-7,-R+13);c.lineTo(7,-R+13);c.fill();win(c,0,-R*.2,R*.6,R*.24,d<999?String(Math.round(d)).padStart(3,'0'):'---',19);T(c,'MILES',0,R*.02,10,DIM);},
 clk:(c,P)=>{const d=new Date();scale(c,R,0,330,59,5,[12,1,2,3,4,5,6,7,8,9,10,11],.68,20);needle(c,R,((d.getHours()%12)+d.getMinutes()/60)*30,.5,8);needle(c,R,d.getMinutes()*6,.8,6);needle(c,R,d.getSeconds()*6,.88,2.5,'#e33');},
 uhf:(c,P)=>{T(c,'UHF',0,-R*.55,18,DIM);win(c,0,0,R*.9,R*.62,String(sv('uhfCh',7)).padStart(2,'0'),62);T(c,'CHANNEL',0,R*.58,16,DIM);},
 fuel:(c,P)=>{const lb=(qtyTest>now()?0:(P.totalFuel||0)*LB),main=Math.min(lb,(P.ac.fuel||5800)*LB*.62);scale(c,R,-140,140,20,4,[0,1,2,3,4,5],.64,19);
   T(c,'MAIN',0,R*.28,14,DIM);T(c,'FUEL',0,R*.43,14,DIM);T(c,'LBS × 1000',0,R*.58,11,DIM);needle(c,R,-140+280*clamp(main/5500,0,1));},
 xfr:(c,P)=>{const lb=(qtyTest>now()?0:(P.totalFuel||0)*LB),x=Math.max(0,lb-(P.ac.fuel||5800)*LB*.62);scale(c,R,-140,140,20,4,[0,1,2,3,4,5],.64,19);
   T(c,'TRANSFER',0,R*.28,14,DIM);T(c,'FUEL',0,R*.43,14,DIM);T(c,'LBS × 1000',0,R*.58,11,DIM);needle(c,R,-140+280*clamp(x/5000,0,1));},
 ff:(c,P)=>{const f=running(P)?(rpm(P)<70?.08+rpm(P)/700:.12+(P.n||0)*.6+(P.ab||0)*.28):0;scale(c,R,-140,140,24,4,[0,2,4,6,8,10,12],.64,19);T(c,'FUEL FLOW',0,R*.32,13,DIM);T(c,'PPH × 1000',0,R*.5,11,DIM);needle(c,R,-140+280*clamp(f,0,1));},
 lox:G('LIQUID',-130,130,10,2,[0,2,4,6,8,10],P=>.78,'OXYGEN · LITERS'),
 hyd:(lbl)=>(c,P)=>{scale(c,R,-130,130,8,2,[0,1,2,3,4],.62,24);T(c,lbl,0,R*.42,20,DIM);needle(c,R,-130+260*clamp(window.ENGSYS&&window.ENGSYS.on?ENGSYS.hydN(P,/2|3|UTIL/i.test(lbl)?'B':'A')*.75:running(P)?(rpm(P)>40?.75+.01*Math.sin(now()*2):rpm(P)/53):0,0,1),.84,10);},
 tb:(c,P)=>{const rr=P.yawRate!=null?P.yawRate:(P.angVel?P.angVel.y:0);c.fillStyle=INK;for(const x of[-R*.5,0,R*.5])c.fillRect(x-4,-R*.82,8,R*.18);
   c.save();c.translate(0,R*.25);c.rotate(clamp(-rr*R2D*10,-45,45)*D2R);c.fillStyle=INK;c.fillRect(-4,-R*.95,8,R*.8);c.restore();
   c.fillStyle='#ddd';c.beginPath();c.ellipse(0,R*.48,R*.62,R*.16,0,0,Math.PI);c.fill();c.fillStyle='#000';c.beginPath();c.arc(clamp(-(P.beta||0)*R2D*6,-R*.48,R*.48),R*.55,R*.1,0,7);c.fill();
   c.strokeStyle='#000';c.lineWidth=2;c.beginPath();c.moveTo(-R*.13,R*.42);c.lineTo(-R*.13,R*.64);c.moveTo(R*.13,R*.42);c.lineTo(R*.13,R*.64);c.stroke();T(c,'4 MIN',0,-R*.32,11,DIM);},
 cab:G('CABIN ALT',-150,150,10,2,[0,10,20,30,40,50],P=>clamp(Math.min(P.pos.y*3.2808,8000+P.pos.y*3.2808*.35)/50000,0,1),'FEET × 1000'),
 small:(kind)=>(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#111';c.fillRect(0,0,S,S);
   if(kind==='droop'){const tr=P._wingT>0;if(tr)barber(c,S/2,S/2,S*.45);else T(c,(P.flapCmd||0)>.5?'DN':'UP',S/2,S/2,S*.38,'#fff');}
   else if(kind==='cool'){const p=sv('cooler','AUTO');T(c,p==='CLOSE'?'CLOSE':p==='OPEN'?'OPEN':running(P)?'OPEN':'CLOSE',S/2,S/2,S*.22,'#fff');}
   else if(kind==='trim'){c.strokeStyle=INK;c.lineWidth=3;for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(S*.3,S/2+i*S*.1);c.lineTo(S*.55,S/2+i*S*.1);c.stroke();}
     const t=clamp((P._trimP||0),-1,1);c.fillStyle='#ffb21a';c.beginPath();c.moveTo(S*.6,S/2-t*S*.4);c.lineTo(S*.85,S/2-t*S*.4-12);c.lineTo(S*.85,S/2-t*S*.4+12);c.fill();T(c,'UP',S*.16,S*.12,S*.13,DIM);T(c,'DN',S*.16,S*.88,S*.13,DIM);}
   else if(kind==='gear'){let gd=false;try{gd=!!sys.v.gear;}catch(e){}const tr=P.gearPos!=null&&P.gearPos>.05&&P.gearPos<.95;
     if(tr)barber(c,S/2,S/2,S*.45);else if(gd&&P.gearPos>.9){c.fillStyle='#ddd';c.beginPath();c.arc(S/2,S/2,S*.42,0,7);c.fill();c.fillStyle='#111';c.beginPath();c.arc(S/2,S/2,S*.2,0,7);c.fill();}else T(c,'UP',S/2,S/2,S*.38,'#fff');}
   else if(kind==='gen'){const on=P.eng&&!P.eng.done?(P.eng.gen&&P.eng.e.some(e=>e.lit)):running(P);if(on)T(c,'ON',S/2,S/2,S*.38,'#fff');else barber(c,S/2,S/2,S*.45);}}};
function brgField(P){try{return(Math.atan2(AF.x-P.pos.x,-(AF.z-P.pos.z))*R2D+360)%360;}catch(e){return 0;}}
function distField(P){try{return Math.hypot(AF.x-P.pos.x,AF.z-P.pos.z)/1852;}catch(e){return 999;}}

// item 15 radar scope is the borrowed APQ-94 picture (phScopeC); the rest are faces.  [key, x, y, case half-size, face]
const INST=[
 ['tach',178,352,58,F.tach],['aoa',278,352,52,F.aoa],['epr',178,457,56,F.epr],['vvi',280,460,52,F.vvi],['egt',178,562,56,F.egt],['acc',282,565,52,F.acc],
 ['oil',276,243,44,F.oil],['ralt',410,250,70,F.ralt],['asi',410,410,72,F.asi],['alt',410,555,72,F.alt],
 ['adi',606,452,100,F.adi],['crs',788,262,64,F.crs],['bdhi',772,425,70,F.bdhi],['tb',772,548,46,F.tb],
 ['clk',895,372,48,F.clk],['uhf',998,372,50,F.uhf],['fuel',890,478,48,F.fuel],['xfr',990,476,48,F.xfr],['ff',882,573,48,F.ff],['lox',985,570,48,F.lox],
 ['hyd1',1078,470,20,F.hyd('PC-1')],['hyd2',1072,515,20,F.hyd('PC-2')],['hyd3',1066,560,20,F.hyd('UTIL')]];
const SMALL=[['droop',513,588,15,F.small('droop')],['cool',600,588,17,F.small('cool')],['trim',655,580,18,F.small('trim')],
 ['g1',88,425,15,F.small('gear')],['g2',72,478,15,F.small('gear')],['g3',104,478,15,F.small('gear')]];
// warning lights [key, x, y, w, h, legend, colour, lit(P)]
const LAMPS=[
 ['rudT',115,600,30,22,'RUD\nTRIM','#5f5',P=>Math.abs(P.ctl?P.ctl.y||0:0)<.05],['ailT',85,600,30,22,'AIL\nTRIM','#5f5',P=>Math.abs(P.ctl?P.ctl.r||0:0)<.05],
 ['sbL',100,570,60,24,'SPEED BRAKE','#fb3',P=>(P.sb||0)>.05],['probeL',100,532,60,24,'PROBE','#fb3',P=>!!sv('probe',0)],
 ['wwd',62,447,26,18,'WING\nWHL','#f42',P=>{let gd=false;try{gd=!!sys.v.gear;}catch(e){}return gd!==((P.flapCmd||0)>.5)&&now()%1<.5;}],
 ['fire',392,168,58,30,'FIRE','#f42',P=>(P.fire||0)>0],
 ['fuelLow',760,170,30,26,'FUEL\nLOW','#fb3',P=>(P.totalFuel||0)*LB<1500],['pump',795,170,30,26,'FUEL\nPUMP','#fb3',P=>!running(P)],
 ['xpump',1005,300,40,26,'XFER\nPUMP','#fb3',P=>!!sv('xfer',0)&&!running(P)],['oxy',1075,425,50,28,'OXYGEN','#fb3',P=>!sv('o2',1)],
 ['oilHyd',1062,605,44,24,'OIL\nHYD','#f42',P=>!running(P)||rpm(P)<45],['boost',735,600,26,20,'BOOST\nPUMP','#fb3',P=>!running(P)],
 ['mfc',0,0,0,0,'','',P=>sv('fuelCtl','NORMAL')==='MANUAL']];

/* ---------------- build ---------------- */
function build(ctx){const{g,box,LM,liveTex}=ctx;const ctls=[],upd=[],lamps=[];
  const hit=new THREE.MeshBasicMaterial({visible:false});
  // redraw gating: gauges redraw only when what they show has changed (quantised to what is visible)
  const q=(v,s)=>Math.round((v||0)*s);
  const FASTK=new Set(['aoa','vvi','acc','ralt','asi','alt','adi','crs','bdhi','tb','tach']);
  // v259: each fast gauge keys only on the values it shows (plus STV and a 2 Hz refresh), instead of every gauge redrawing and
  // re-uploading whenever any flight value changes. Gauges not listed in FKSUB keep the full key, as before.
  const FKSUB={masi:[3,4],asi:[3,4],aoa:[5,13],adi:[0,1,2,5,10,12,13],sby:[0,1,2,10],hsi:[2,12],crs:[2,12],bdhi:[2,12],alt:[6],vvi:[7],acc:[8,9],ralt:[11],tb:[0,2,8,10]};
  const gate=k=>{let last=null;const fast=FASTK.has(k),sub=FKSUB[k];return()=>{const key=!fast?SK:sub?sub.map(i=>FKA[i]).join()+'|'+STV+'|'+Math.floor(now()*2):FK;if(key===last)return false;last=key;return true;};};
  const PC=0x3a3e41,pm=LM(PC,12),dk=LM(0x1b1d1f,8),blk=LM(0x0b0c0d,4),bz=LM(0x141618,40),met=LM(0x9aa0a4,60);
  const board=new THREE.Group();board.position.set(0,-.47,-.70);board.rotation.x=-.24;g.add(board);
  // ---- board outline (figure 1-3): arched top, centre hood over the scope, armament pedestal below the ADI ----
  const OUT=[[40,612],[40,470],[60,400],[100,330],[160,268],[240,210],[330,160],[430,118],[488,108],[488,85],[725,85],[725,108],[800,128],[900,170],[990,225],[1070,290],[1130,360],[1165,440],[1170,612],
    [722,612],[722,842],[428,842],[428,612]];
  const sh=new THREE.Shape();OUT.forEach(([x,y],i)=>i?sh.lineTo(bx(x),by(y)):sh.moveTo(bx(x),by(y)));
  const bg=document.createElement('canvas');bg.width=1280;bg.height=820;// board face texture covers figure x 30..1190, y 75..850
  const X0=30,Y0=75,SX=1280/1160,SY=820/775,fx=x=>(x-X0)*SX,fy=y=>(y-Y0)*SY;
  {const c=bg.getContext('2d');c.fillStyle='#3a3e41';c.fillRect(0,0,1280,820);
    // panel seams, screws
    c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=3;[[330,160,330,612],[488,108,488,612],[725,108,725,612],[840,140,840,612],[1040,250,1040,612],[428,612,722,612],[120,300,120,612]].forEach(([a,b,c2,d])=>{c.beginPath();c.moveTo(fx(a),fy(b));c.lineTo(fx(c2),fy(d));c.stroke();});
    const lab=(s,x,y,sz=13,al='center')=>{c.font=`bold ${sz}px Arial`;c.textAlign=al;c.textBaseline='middle';c.fillStyle='#e9e9e2';s.split('\n').forEach((l,i,a)=>c.fillText(l,fx(x),fy(y)+(i-(a.length-1)/2)*(sz+2)));};
    lab('LG POSITION',92,405,11);lab('PROBE',215,248,12);lab('ON',240,262,10);lab('OFF',240,292,10);lab('FIRE\nTEST',448,140,10);lab('FUEL DUMP',885,205,11);lab('FUEL\nTRANSFER',955,215,10);lab('ON',955,250,9);lab('PRESS\nRESET',955,297,9);
    lab('DROOP',513,610,10);lab('OPEN\nAUTO\nCLOSE',560,588,9);lab('OIL COOLER DOOR',560,612,10);lab('NOSE TRIM',655,612,10);lab('FUEL QTY\nTEST',808,598,9);lab('BUNO\n150284',722,560,10);
    // armament pedestal (37)
    lab('ARMAMENT\nSELECT',485,635,11);lab('MASTER\nARMT',490,762,11);lab('GUNS',548,790,11);lab('READY',575,812,9);lab('SAFE',575,838,9);lab('SELECT\nJETTISON',603,775,10);lab('MECH\nFUSING',628,655,10);
    lab('NOSE',662,670,8);lab('SAFE',662,688,8);lab('TAIL',662,706,8);lab('MSL\nTONE',690,640,9);lab('FULL IR\nCOOL',630,722,9);lab('MSL\nFUZE',690,722,9);lab('MSL / APCS\nVOLUME',665,778,9);
    ['SW','GUNS','RKT','BOMB','OFF'].forEach((s,i)=>{const a=(-120+i*60)*D2R;lab(s,485+Math.sin(a)*58,690-Math.cos(a)*52,9);});
    c.fillStyle='rgba(0,0,0,.35)';[[540,655,70,110]].forEach(([x,y,w,h])=>c.fillRect(fx(x),fy(y),w*SX,h*SY));
    // screws
    c.fillStyle='rgba(255,255,255,.22)';for(const [x,y] of[[60,600],[1150,600],[440,830],[710,830],[500,100],[712,100],[340,175],[860,160]]){c.beginPath();c.arc(fx(x),fy(y),5,0,7);c.fill();}}
  const bgT=new THREE.CanvasTexture(bg);bgT.anisotropy=8;ctx.o.tex.push(bgT);
  const geo=new THREE.ShapeGeometry(sh);{const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i)/K+OX,y=OY-p.getY(i)/K;uv.setXY(i,(x-X0)/1160,1-(y-Y0)/775);}uv.needsUpdate=true;}
  const faceM=new THREE.MeshBasicMaterial({map:bgT,toneMapped:false});ctx.o.faces.push(faceM);const bm=new THREE.Mesh(geo,faceM);bm.userData.cwFx=1;board.add(bm);
  {const eg=new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false});const e=new THREE.Mesh(eg,pm);e.position.z=-.031;e.userData.cwFx=1;board.add(e);}
  // scope hood (15): raised box, rectangular CRT window
  box(board,(725-488)*K,(330-85)*K,.05,dk,bx(606),by(207),.025);
  {const IP=window.F8IP626,cv=document.createElement('canvas');cv.width=IP?IP.W:260;cv.height=IP?IP.H:380;const sct=new THREE.CanvasTexture(cv);sct.generateMipmaps=false;sct.minFilter=THREE.LinearFilter;ctx.o.tex.push(sct);
    const m=new THREE.MeshBasicMaterial({map:sct,toneMapped:false});ctx.o.faces.push(m);const sc=new THREE.Mesh(new THREE.PlaneGeometry(130*K,190*K),m);sc.position.set(bx(606),by(212),.062);sc.userData.screen='phscope';sc.renderOrder=3;m.polygonOffset=true;m.polygonOffsetFactor=-2;m.polygonOffsetUnits=-2;board.add(sc);
    {let lt=0;upd.push(()=>{const n=performance.now();if(n-lt<40)return;lt=n;try{if(IP)IP.draw(cv.getContext('2d'),PL());sct.needsUpdate=true;}catch(e){}});}
    {const fw=130*K,fh=190*K,t=9*K,d=.04;   // v310: raised bezel ring round the CRT window (proud of the screen) and a black tube behind it, no coplanar faces
      box(board,fw+2*t,t,d,blk,bx(606),by(212)-fh/2-t/2,.07);box(board,fw+2*t,t,d,blk,bx(606),by(212)+fh/2+t/2,.07);
      box(board,t,fh,d,blk,bx(606)-fw/2-t/2,by(212),.07);box(board,t,fh,d,blk,bx(606)+fw/2+t/2,by(212),.07);
      box(board,fw,fh,.004,blk,bx(606),by(212),.057);}
    // six scope knobs on the bezel
    [[505,130,'INT'],[505,190,'STORE'],[505,250,'CURSOR'],[707,130,'GAIN'],[707,190,'MKR'],[707,250,'FOCUS']].forEach(([x,y,n])=>knob(board,bx(x),by(y),.055,13*K,'SCOPE · '+n,['1','2','3','4','5'],'scope'+n));}
  // instruments: square cases, live faces, glass
  const glsM=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.08,shininess:140,specular:0x8a8a8a,depthWrite:false});
  function inst(k,x,y,hs,draw,round=true){const S=k==='adi'?256:hs<25?96:192,cv=document.createElement('canvas');cv.width=cv.height=S;const t=new THREE.CanvasTexture(cv);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;ctx.o.tex.push(t);
    const c=cv.getContext('2d'),r=hs*K;box(board,2*r*1.04,2*r*1.04,.03,bz,bx(x),by(y),.008);// case
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const fm=new THREE.Mesh(round?new THREE.CircleGeometry(r*.9,48):new THREE.PlaneGeometry(r*1.6,r*1.6),m);fm.position.set(bx(x),by(y),.0235);fm.userData.cwFx=1;board.add(fm);
    if(round){const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.92,r*.05,8,40),LM(0x0a0a0a,30));ring.position.set(bx(x),by(y),.0245);ring.userData.cwFx=1;board.add(ring);}
    const gl=new THREE.Mesh(round?new THREE.CircleGeometry(r*.92,40):new THREE.PlaneGeometry(r*1.65,r*1.65),glsM);gl.position.set(bx(x),by(y),.026);gl.userData.cwFx=1;gl.renderOrder=2;board.add(gl);
    for(const [sx,sy] of[[-1,-1],[1,-1],[-1,1],[1,1]]){const s=new THREE.Mesh(new THREE.CylinderGeometry(r*.06,r*.06,.004,8),met);s.rotation.x=Math.PI/2;s.position.set(bx(x)+sx*r*.85,by(y)+sy*r*.85,.024);board.add(s);}
    const gt=gate(k);upd.push(P=>{if(!gt())return;if(round){face(c,S);c.scale(S/256,S/256);}draw(c,P);t.needsUpdate=true;});}
  INST.forEach(([k,x,y,hs,d])=>inst(k,x,y,hs,d,true));SMALL.forEach(([k,x,y,hs,d])=>inst(k,x,y,hs,d,false));
  // lamps
  LAMPS.forEach(([k,x,y,w,h,lg,col,lit])=>{if(!w)return;const cv=document.createElement('canvas');cv.width=128;cv.height=Math.round(128*h/w);const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const lm=new THREE.Mesh(new THREE.PlaneGeometry(w*K,h*K),m);lm.position.set(bx(x),by(y),.016);lm.userData.cwFx=1;board.add(lm);
    box(board,w*K+.004,h*K+.004,.012,blk,bx(x),by(y),.009);let last=null;
    lamps.push(P=>{const on=lampTest>now()||lit(P);if(on===last)return;last=on;c.fillStyle=on?col:'#1c1a14';c.fillRect(0,0,cv.width,cv.height);c.font=`bold ${Math.round(cv.height*(lg.includes('\n')?.3:.42))}px Arial`;c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=on?'#200':'#5a5444';lg.split('\n').forEach((l,i,a)=>c.fillText(l,64,cv.height/2+(i-(a.length-1)/2)*cv.height*.36));t.needsUpdate=true;});});

  /* ---------- 3D controls ---------- */
  function reg(par,mesh,name,state,act){mesh.userData.ctl={meshes:[mesh],name,state,act:(d)=>{try{act(d);}catch(e){console.warn('[f8pit]',name,e);}try{sfx.click();}catch(e){}}};ctls.push(mesh.userData.ctl);}
  // toggle: positions array (2 or 3), get() index, set(i); axis 'y' = lever moves up/down on the face
  function toggle(par,x,y,z,name,pos,get,set,o={}){const gq=new THREE.Group();gq.position.set(x,y,z);if(o.rx)gq.rotation.x=o.rx;if(o.ry)gq.rotation.y=o.ry;par.add(gq);
    const nut=new THREE.Mesh(new THREE.CylinderGeometry(.0065,.0065,.004,12),met);nut.rotation.x=Math.PI/2;gq.add(nut);
    const lv=new THREE.Group();gq.add(lv);const st=new THREE.Mesh(new THREE.CylinderGeometry(.0022,.0028,.022,8),LM(o.col||0xd8d8d0,50));st.position.y=.011;lv.add(st);
    if(o.paddle){box(lv,.012,.008,.006,LM(0xc8c8c0,40),0,.022,0);}
    if(o.guard){const gd=new THREE.Group();gq.add(gd);box(gd,.02,.004,.03,LM(0xc8281e,30),0,.002,.014);gq.userData.guard=gd;}
    const h=new THREE.Mesh(new THREE.BoxGeometry(.026,.03,.03),hit);h.userData.cwFx=1;gq.add(h);
    const n=pos.length;let cur=-1;upd.push(()=>{const i=clamp(get(),0,n-1);if(i===cur)return;cur=i;lv.rotation.x=n===2?(i?-.55:.55):(i-1)*-.6;if(gq.userData.guard)gq.userData.guard.rotation.x=o.guardUp&&o.guardUp()?-1.6:0;});
    reg(gq,h,name,()=>pos[clamp(get(),0,n-1)],d=>{const i=get();set(n===2?1-i:(i+(d<0?-1:1)+n)%n);});return gq;}
  function knob(par,x,y,z,r,name,pos,key,get,set,o={}){const gq=new THREE.Group();gq.position.set(x,y,z);if(o.rx)gq.rotation.x=o.rx;par.add(gq);
    const kb=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.08,r*.9,16),LM(0x111213,30));kb.rotation.x=Math.PI/2;gq.add(kb);
    const pt=new THREE.Group();gq.add(pt);box(pt,r*.25,r*1.05,r*.3,LM(0xe8e8e0,30),0,r*.4,r*.5);
    const h=new THREE.Mesh(new THREE.BoxGeometry(r*2.6,r*2.6,r*2),hit);h.userData.cwFx=1;gq.add(h);
    const g2=get||(()=>sv(key,0)),s2=set||(v=>ST[key]=v);let cur=-1;
    upd.push(()=>{const i=g2();if(i===cur)return;cur=i;pt.rotation.z=-(-.9+1.8*(pos.length>1?i/(pos.length-1):0));});
    reg(gq,h,name,()=>pos[clamp(g2(),0,pos.length-1)],d=>s2((g2()+(d<0?-1:1)+pos.length)%pos.length));return gq;}
  function button(par,x,y,z,r,name,col,act,state){const b=new THREE.Mesh(new THREE.CylinderGeometry(r,r,r*.8,14),LM(col,40));b.rotation.x=Math.PI/2;b.position.set(x,y,z);par.add(b);
    const h=new THREE.Mesh(new THREE.BoxGeometry(r*3,r*3,r*3),hit);h.position.set(x,y,z);h.userData.cwFx=1;par.add(h);reg(par,h,name,state||(()=>'PUSH'),act);return b;}
  const st2=(k,d)=>()=>sv(k,d),set2=k=>v=>{ST[k]=v;};
  // ---- board switches ----
  const BZ=.02;
  toggle(board,bx(215),by(276),BZ,'INFLIGHT REFUELING PROBE (10)',['OFF','ON'],()=>sv('probe',0),v=>{ST.probe=v;});
  button(board,bx(445),by(168),BZ,10*K,'FIRE WARNING TEST (14)',0x6a6a6a,()=>{lampTest=now()+3;});
  toggle(board,bx(885),by(258),BZ,'FUEL DUMP (21)',['OFF','DUMP'],()=>sv('dump',0),v=>{ST.dump=v;},{guard:true,guardUp:()=>sv('dump',0)});
  toggle(board,bx(955),by(272),BZ,'FUEL TRANSFER (22)',['OFF','ON','PRESS RESET'],()=>sv('xfer',1),v=>{ST.xfer=v;});
  toggle(board,bx(560),by(586),BZ,'OIL COOLER DOOR (39)',['CLOSE','AUTO','OPEN'],()=>({CLOSE:0,AUTO:1,OPEN:2})[sv('cooler','AUTO')],v=>{ST.cooler=['CLOSE','AUTO','OPEN'][v];});
  button(board,bx(808),by(600),BZ,8*K,'FUEL QUANTITY TEST (33)',0x6a6a6a,()=>{qtyTest=now()+3;});
  // armament pedestal (37)
  const armSel=()=>{const P=PL(),w=game.wsel||'GUN';if(!game.arm)return 4;if(w==='GUN')return 1;if(MSL[w]&&MSL[w].seek==='IR')return 0;if(typeof AGW!=='undefined'&&AGW[w])return /^(LAU|Zuni|UB|ORO|B-8)/.test(w)?2:3;return 0;};
  knob(board,bx(485),by(690),.03,26*K,'ARMAMENT SELECT',['SW','GUNS','RKT','BOMB','OFF'],'armsel',armSel,v=>{const P=PL();if(!P)return;
    if(v===4){setArm(1);return;}if(!game.arm)setArm(0);
    if(v===1)game.wsel='GUN';else if(v===0){const ir=P.missileTypes().filter(x=>MSL[x].seek==='IR');if(ir.length)game.wsel=ir[0];}
    else{const ag=typeof agTypes!=='undefined'?agTypes(P):[];const want=ag.find(x=>v===2?/^(LAU|Zuni)/.test(x):!/^(LAU|Zuni)/.test(x));if(want)game.wsel=want;}});
  toggle(board,bx(500),by(792),BZ,'MASTER ARMAMENT',['OFF','ON'],()=>game.armPos===0?1:0,v=>setArm(v?0:1));
  toggle(board,bx(548),by(822),BZ,'GUNS',['SAFE','READY'],()=>sv('guns',1),v=>{ST.guns=v;});
  toggle(board,bx(603),by(812),BZ,'SELECT JETTISON',['OFF','JETTISON'],()=>0,v=>{if(v)jettison();},{guard:true});
  toggle(board,bx(645),by(688),BZ,'MECHANICAL FUSING',['TAIL','SAFE','NOSE'],()=>sv('fusing',1),v=>{ST.fusing=v;});
  toggle(board,bx(630),by(742),BZ,'MSL FULL IR COOL',['OFF','ON'],()=>sv('irCool',1),v=>{ST.irCool=v;});
  toggle(board,bx(690),by(742),BZ,'MSL FUZE',['CONTACT','PROX'],()=>sv('mslFuze',1),v=>{ST.mslFuze=v;});
  knob(board,bx(690),by(665),.025,12*K,'MSL TONE',['LOW','MED','HIGH'],'tone');
  knob(board,bx(665),by(810),.025,16*K,'MSL / APCS VOLUME',['1','2','3','4','5','6'],'vol');
  // armament indicator lights block (2 × 3)
  [['SW 1',548,670],['SW 2',590,670],['SW 3',548,705],['SW 4',590,705],['GUNS',548,740],['RKT',590,740]].forEach(([s,x,y],i)=>{
    const cv=document.createElement('canvas');cv.width=96;cv.height=64;const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);
    const lm=new THREE.Mesh(new THREE.PlaneGeometry(36*K,28*K),m);lm.position.set(bx(x+18),by(y+12),.016);lm.userData.cwFx=1;board.add(lm);let last=null;
    lamps.push(P=>{let on=false;try{if(i<4){const ir=P.missileTypes().filter(x=>MSL[x].seek==='IR');const n=ir.reduce((a,w)=>a+P.count(w),0);on=game.arm&&n>i;}else if(i===4)on=game.arm&&game.wsel==='GUN'&&sv('guns',1);else on=game.arm&&typeof AGW!=='undefined'&&!!AGW[game.wsel];}catch(e){}
      on=on||lampTest>now();if(on===last)return;last=on;c.fillStyle=on?'#3f6':'#14201a';c.fillRect(0,0,96,64);c.font='bold 22px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle=on?'#021':'#3a4a40';c.fillText(s,48,33);t.needsUpdate=true;});});

  /* ---------- consoles ---------- */
  const CY=-.62,CW=.2;
  function cpanel(side,z0,z1,title,draw,o={}){// flat console panel, front edge z0, aft edge z1
    const w=o.w||CW,x=side*(.43)+(o.dx||0),d=z1-z0,cv=document.createElement('canvas');cv.width=Math.round(w*1400);cv.height=Math.round(d*1400);const c=cv.getContext('2d');
    c.fillStyle='#2f3336';c.fillRect(0,0,cv.width,cv.height);c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=3;c.strokeRect(4,4,cv.width-8,cv.height-8);
    c.font='bold 17px Arial';c.textAlign='center';c.fillStyle='#ececE4';c.fillText(title,cv.width/2,22);if(draw)draw(c,cv.width,cv.height);
    for(const [sx,sy] of[[10,10],[cv.width-10,10],[10,cv.height-10],[cv.width-10,cv.height-10]]){c.fillStyle='rgba(255,255,255,.3)';c.beginPath();c.arc(sx,sy,4,0,7);c.fill();}
    const t=new THREE.CanvasTexture(cv);t.anisotropy=4;ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);pl.rotation.x=-Math.PI/2;pl.position.set(x,(o.y||CY)+.001,(z0+z1)/2);pl.userData.cwFx=1;g.add(pl);
    // panel-local position: u across (0 inboard side... 1), v front→aft
    return{at:(u,v,h=.004)=>[x-w/2+u*w,(o.y||CY)+h,z0+v*d],lab:(s,u,v,sz=12)=>{c.font=`bold ${sz}px Arial`;c.textAlign='center';c.fillStyle='#e0e0d8';s.split('\n').forEach((l,i)=>c.fillText(l,u*cv.width,v*cv.height+i*(sz+2)));t.needsUpdate=true;}};}
  const tg=(p,u,v,name,pos,get,set,o={})=>{const[x,y,z]=p.at(u,v);const q=toggle(g,x,y,z,name,pos,get,set,Object.assign({rx:-Math.PI/2},o));return q;};
  const kn=(p,u,v,r,name,pos,key,get,set)=>{const[x,y,z]=p.at(u,v,.006);return knob(g,x,y,z,r,name,pos,key,get,set,{rx:-Math.PI/2});};
  const lp=(p,u,v,name,col,lit)=>{const[x,y,z]=p.at(u,v,.003);const m=new THREE.MeshBasicMaterial({color:0x221a10});const b=new THREE.Mesh(new THREE.CylinderGeometry(.0055,.0055,.005,12),m);b.position.set(x,y,z);g.add(b);
    lamps.push(P=>{m.color.set(lampTest>now()||lit(P)?col:0x221a10);});const h=new THREE.Mesh(new THREE.BoxGeometry(.016,.01,.016),hit);h.position.set(x,y,z);h.userData.cwFx=1;g.add(h);reg(g,h,name,()=>lit(PL())?'ON':'OFF',()=>{});};
  // console bodies, centre pedestal below the armament panel, footwell kick panels (hide the borrowed rudder-pedal rods)
  box(g,.26,.42,.34,dk,0,-1.02,-.66);box(g,.72,.5,.03,LM(0x202325,6),0,-1.06,-.86);[-1,1].forEach(sd=>box(g,.03,.42,.4,LM(0x232628,6),sd*.17,-1.0,-.66));
  [-1,1].forEach(sd=>{box(g,.22,.1,.96,LM(0x2a2d30,8),sd*.43,-.675,-.15);box(g,.05,.1,1.3,LM(0x25282a,8),sd*.555,-.55,-.2);});
  {const sk=LM(0x1c1f21,6);box(g,1.14,.02,1.5,sk,0,-1.23,-.1);[-1,1].forEach(sd=>box(g,.03,.66,1.3,sk,sd*.565,-.93,-.2));box(g,.9,.42,.02,sk,0,-.52,-.83);}
  // ======== LEFT CONSOLE (figure 1-4 sheet 2) ========
  // forward stab / autopilot panel (15-25), angled up in front of the throttle
  {const fp=new THREE.Group();fp.position.set(-.43,-.565,-.63);fp.rotation.x=-.75;g.add(fp);box(fp,.21,.13,.012,dk,0,0,-.007);
    const cv=document.createElement('canvas');cv.width=300;cv.height=186;const c=cv.getContext('2d');c.fillStyle='#2f3336';c.fillRect(0,0,300,186);c.font='bold 11px Arial';c.fillStyle='#e8e8e0';c.textAlign='center';
    [['YAW STAB',40,22],['ROLL STAB',110,22],['AUTOPILOT',190,22],['HDG HOLD\nDISABLE',255,22],['EMER PITCH\nTRIM CHAN',60,118],['ENGAGED',190,118]].forEach(([s,x,y])=>s.split('\n').forEach((l,i)=>c.fillText(l,x,y+i*15)));
    const t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(.205,.127),m);pl.userData.cwFx=1;fp.add(pl);
    const P2=(u,v)=>[-.1025+u*.205,.0635-v*.127,.003];
    toggle(fp,...P2(.13,.45),'YAW STABILIZATION (15)',['OFF RESET','ENGAGE'],()=>sv('yaw',1),v=>{ST.yaw=v;});
    toggle(fp,...P2(.37,.45),'ROLL STABILIZATION (25)',['OFF RESET','ENGAGE'],()=>sv('roll',1),v=>{ST.roll=v;});
    toggle(fp,...P2(.63,.45),'AUTOPILOT MASTER (19)',['OFF','ON'],()=>sv('ap',0),v=>{ST.ap=v;});
    toggle(fp,...P2(.85,.45),'AUTOPILOT HEADING HOLD DISABLE (20)',['NORMAL','DISABLE'],()=>sv('hdgDis',0),v=>{ST.hdgDis=v;});
    toggle(fp,...P2(.2,.88),'EMERGENCY PITCH TRIM CHANNEL (24)',['NORMAL','ALTERNATE'],()=>sv('ptc',0),v=>{ST.ptc=v;});
    const lpf=(u,v,col,lit,n)=>{const m2=new THREE.MeshBasicMaterial({color:0x221a10});const b=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.005,12),m2);b.rotation.x=Math.PI/2;b.position.set(...P2(u,v));fp.add(b);lamps.push(P=>m2.color.set(lampTest>now()||lit(P)?col:0x221a10));};
    lpf(.13,.75,0xffb020,P=>!sv('yaw',1));lpf(.37,.75,0xffb020,P=>!sv('roll',1));lpf(.63,.88,0x40ff70,P=>!!sv('ap',0));
    // emergency power handle (21) and emergency pitch trim handle (16)
    {const h=new THREE.Group();h.position.set(...P2(.93,.85));fp.add(h);box(h,.012,.012,.03,LM(0xd8b820,30),0,0,.015);box(h,.03,.012,.012,LM(0xd8b820,30),0,0,.03);
      const hb=new THREE.Mesh(new THREE.BoxGeometry(.04,.03,.05),hit);hb.position.z=.02;hb.userData.cwFx=1;h.add(hb);reg(h,hb,'EMERGENCY POWER HANDLE (21) · RAT',()=>sv('rat',0)?'EXTENDED':'STOWED',()=>{if(!sv('rat',0)){ST.rat=1;try{radio('EMERGENCY POWER PACKAGE EXTENDED');}catch(e){}}});
      upd.push(()=>{h.position.z=P2(.93,.85)[2]+(sv('rat',0)?.03:0);});}
    {const h=new THREE.Group();h.position.set(...P2(.45,.85));fp.add(h);box(h,.04,.01,.012,LM(0x222222,20),0,0,.012);const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.03,.03),hit);hb.userData.cwFx=1;h.add(hb);
      reg(h,hb,'EMERGENCY PITCH TRIM HANDLE (16)',()=>sv('ept',0)?'PULLED':'STOWED',()=>{ST.ept=sv('ept',0)?0:1;});}}
  // landing gear handle (23): on the forward left wall, wheel-shaped knob
  {const gh=new THREE.Group();gh.position.set(-.53,-.47,-.62);g.add(gh);box(gh,.012,.06,.015,met,0,0,0);const wh=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.012,16),LM(0xe8e8e8,40));wh.rotation.z=Math.PI/2;wh.position.set(.012,.03,0);gh.add(wh);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.1,.05),hit);hb.userData.cwFx=1;gh.add(hb);
    reg(gh,hb,'LANDING GEAR HANDLE (23)',()=>{try{return sys.v.gear?'WHLS DOWN':'WHLS UP';}catch(e){return'';}},()=>{try{uiKey('Digit7');}catch(e){}});
    const lt=new THREE.Mesh(new THREE.SphereGeometry(.006,8,6),new THREE.MeshBasicMaterial({color:0x330a08}));lt.position.set(.012,.075,0);gh.add(lt);
    upd.push(P=>{let d=0;try{d=sys.v.gear?1:0;}catch(e){}gh.rotation.x=d?.45:-.35;const tr=P.gearPos!=null&&P.gearPos>.05&&P.gearPos<.95;lt.material.color.set(tr?0xff3020:0x330a08);});}
  // throttle quadrant (9, 26-30): slot on the console, lever follows the power lever; click = cutoff ⇄ idle on a cold start
  const thq=cpanel(-1,-.58,-.3,'',(c,w,h)=>{c.fillStyle='#111';c.fillRect(w*.42,h*.1,w*.16,h*.85);c.font='bold 13px Arial';c.fillStyle='#ddd';c.textAlign='left';
    [['OFF',.95],['IDLE',.78],['MIL',.32],['A/B',.12]].forEach(([s,v])=>c.fillText(s,w*.62,h*v));c.textAlign='center';c.fillText('THROTTLE',w*.2,h*.08);c.fillText('FRICTION',w*.82,h*.55);c.fillText('RUDDER\nTRIM',w*.2,h*.62);});
  {const tq=new THREE.Group();g.add(tq);const[x0,y0]=thq.at(.5,0);tq.position.set(x0,y0,-.44);
    const arm=new THREE.Group();tq.add(arm);box(arm,.01,.11,.012,met,0,.055,0);const grip=new THREE.Group();grip.position.y=.11;arm.add(grip);
    box(grip,.035,.045,.06,LM(0x1c1c1c,25),-.008,.0,0);box(grip,.012,.012,.012,LM(0xb02020,30),-.024,.015,-.012);// mic (29)
    box(grip,.01,.016,.01,LM(0x777777,30),-.026,-.008,.01);// speed brake switch (30)
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.06,.07,.08),hit);hb.userData.cwFx=1;grip.add(hb);
    reg(grip,hb,'THROTTLE (9)',()=>{const P=PL();if(P&&P.eng&&!P.eng.done)return P.eng.e[0].fuel?'IDLE':'OFF';return Math.round((P?P.thr:0)*100)+'%';},()=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.thr();});
    upd.push(P=>{let a;if(P.eng&&!P.eng.done&&!P.eng.e[0].fuel)a=.55;else a=.35-(P.thr||0)*.85;arm.rotation.x=a;});
    // speed brake switch (30), cruise droop switch on the grip, catapult handle (26), friction wheel (27), rudder trim (28)
    const sbh=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,.02),hit);sbh.position.set(-.026,-.008,.01);sbh.userData.cwFx=1;grip.add(sbh);
    reg(grip,sbh,'SPEED BRAKE SWITCH (30)',()=>keys.has('KeyB')?'OUT':'IN',()=>{if(keys.has('KeyB'))keys.delete('KeyB');else keys.add('KeyB');});
    const cdh=new THREE.Mesh(new THREE.BoxGeometry(.018,.018,.018),hit);cdh.position.set(.0,.025,-.02);cdh.userData.cwFx=1;grip.add(cdh);box(grip,.008,.01,.008,LM(0xdddddd,30),0,.025,-.02);
    reg(grip,cdh,'CRUISE DROOP SWITCH (throttle grip)',()=>sv('cdroop',0)?'DOWN':'UP',()=>{ST.cdroop=sv('cdroop',0)?0:1;});
    const[cx,cy,cz]=thq.at(.15,.15,.02);box(g,.006,.04,.006,met,cx,cy,cz);
    kn(thq,.82,.7,.012,'THROTTLE FRICTION WHEEL (27)',['LOOSE','MED','TIGHT'],'fric');kn(thq,.2,.82,.012,'RUDDER TRIM KNOB (28)',['L','NEUTRAL','R'],'rtrim',()=>sv('rtrim',1));}
  // left-hand switch panel (13) on the wall beside the throttle: engine master (14), ignition (12A), fuel control (10), manual fuel light (11), emergency brake (12)
  {const wp=new THREE.Group();wp.position.set(-.528,-.53,-.46);wp.rotation.y=Math.PI/2;wp.rotation.order='YXZ';wp.rotation.x=-.2;g.add(wp);box(wp,.17,.08,.008,dk,0,0,-.005);
    const cv=document.createElement('canvas');cv.width=340;cv.height=160;const c=cv.getContext('2d');c.fillStyle='#2f3336';c.fillRect(0,0,340,160);c.font='bold 15px Arial';c.fillStyle='#e8e8e0';c.textAlign='center';
    [['ENGINE\nMASTER',60,18],['IGNITION\nCONT',150,18],['FUEL CONTROL\nNORMAL / MANUAL',255,18],['EMER\nBRAKE',60,128]].forEach(([s,x,y])=>s.split('\n').forEach((l,i)=>c.fillText(l,x,y+i*16)));
    const t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(.17,.08),m);pl.userData.cwFx=1;wp.add(pl);
    const W=(u,v)=>[-.085+u*.17,.04-v*.08,.002];
    toggle(wp,...W(.18,.6),'ENGINE MASTER SWITCH (14)',['OFF','ON'],()=>{const P=PL();return P&&P.eng&&!P.eng.done?(P.eng.fm?1:0):sv('emaster',1);},v=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.fm();else ST.emaster=v;},{guard:true,guardUp:()=>true});
    toggle(wp,...W(.44,.6),'CONTINUOUS ENGINE IGNITION (12A)',['OFF','ON'],()=>sv('cign',0),v=>{ST.cign=v;});
    toggle(wp,...W(.75,.6),'FUEL CONTROL SWITCH (10)',['NORMAL','MANUAL'],()=>sv('fuelCtl','NORMAL')==='MANUAL'?1:0,v=>{ST.fuelCtl=v?'MANUAL':'NORMAL';});
    {const m2=new THREE.MeshBasicMaterial({color:0x221a10});const b=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.005,12),m2);b.rotation.x=Math.PI/2;b.position.set(...W(.92,.6));wp.add(b);lamps.push(()=>m2.color.set(lampTest>now()||sv('fuelCtl','NORMAL')==='MANUAL'?0xffb020:0x221a10));}
    {const h=new THREE.Group();h.position.set(...W(.36,.86));wp.add(h);box(h,.02,.014,.02,LM(0xd8b820,30),0,0,.01);const hb=new THREE.Mesh(new THREE.BoxGeometry(.04,.03,.04),hit);hb.userData.cwFx=1;h.add(hb);
      reg(h,hb,'EMERGENCY BRAKE HANDLE (12)',()=>sv('ebrk',0)?'PULLED':'STOWED',()=>{ST.ebrk=sv('ebrk',0)?0:1;});upd.push(()=>{h.position.z=.002+(sv('ebrk',0)?.02:0);});}}
  // wing incidence handle (7), guard (6), release switch (8), downlock handle (5): aft of the throttle on the left sill
  {const wq=new THREE.Group();wq.position.set(-.52,-.56,-.16);g.add(wq);box(wq,.04,.03,.2,dk,0,-.015,0);
    const hd=new THREE.Group();hd.position.set(0,0,.04);wq.add(hd);box(hd,.012,.12,.012,met,0,.06,0);const knb=new THREE.Mesh(new THREE.SphereGeometry(.016,10,8),LM(0x1a1a1a,30));knb.position.y=.12;hd.add(knb);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.15,.05),hit);hb.position.y=.07;hb.userData.cwFx=1;hd.add(hb);
    reg(hd,hb,'WING INCIDENCE HANDLE (7)',()=>{const P=PL();return P&&P._wingT>0?'IN TRANSIT':(P&&(P.flapCmd||0)>.5)?'UP':'DN';},()=>{if(!sv('wrel',0)&&!sv('wguard',0)){try{radio('WING · HOLD THE RELEASE SWITCH (8) FIRST');}catch(e){}return;}if(!sv('wdl',1)){if(window.CW_SYS)CW_SYS.wingInc();ST.wrel=0;}else{try{radio('WING · DOWNLOCK HANDLE IN LOCK');}catch(e){}}});
    upd.push(P=>{const up=(P.flapCmd||0)>.5,tr=P._wingT>0;hd.rotation.x=tr?(P._wingTo?-.2:.2):up?-.5:.45;});
    const rb=button(hd,0,.135,0,.006,'WING INCIDENCE RELEASE SWITCH (8)',0xc02020,()=>{ST.wrel=1;try{radio('WING RELEASE · HANDLE FREE');}catch(e){}setTimeout(()=>{ST.wrel=0;},6000);},()=>sv('wrel',0)?'DEPRESSED':'—');
    // guard (6)
    const gd=new THREE.Group();gd.position.set(.03,0,-.02);wq.add(gd);box(gd,.004,.04,.06,LM(0xc8281e,30),0,.02,0);const gb=new THREE.Mesh(new THREE.BoxGeometry(.02,.05,.07),hit);gb.position.y=.02;gb.userData.cwFx=1;gd.add(gb);
    reg(gd,gb,'EMERGENCY DROOP AND WING INCIDENCE GUARD (6)',()=>sv('wguard',0)?'RAISED':'DOWN',()=>{ST.wguard=sv('wguard',0)?0:1;});upd.push(()=>{gd.rotation.z=sv('wguard',0)?-1.2:0;});
    // downlock (5)
    const dl=new THREE.Group();dl.position.set(0,0,-.07);wq.add(dl);box(dl,.01,.01,.06,met,0,.01,0);const db=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.02,12),LM(0x111,20));db.position.set(0,.01,-.035);db.rotation.x=Math.PI/2;dl.add(db);
    const dh=new THREE.Mesh(new THREE.BoxGeometry(.03,.03,.08),hit);dh.userData.cwFx=1;dl.add(dh);reg(dl,dh,'WING DOWNLOCK HANDLE (5)',()=>sv('wdl',1)?'LOCK':'UNLOCK',()=>{const P=PL();if(sv('wdl',1)===0&&P&&(P.flapCmd||0)>.5){try{radio('DOWNLOCK · LOWER THE WING FIRST');}catch(e){}return;}ST.wdl=sv('wdl',1)?0:1;});
    upd.push(()=>{dl.rotation.y=sv('wdl',1)?0:.7;});}
  // aft left console panels (30A, 31, 32, 33, 4) and 1, 2, 3, 34
  {const apc=cpanel(-1,-.28,-.2,'APPROACH POWER COMPENSATOR');tg(apc,.3,.65,'APC (30A)',['STBY','ENGAGE'],()=>sv('apcs',0),v=>{ST.apcs=v;});kn(apc,.72,.62,.01,'APC TEMP',['COLD','STD','HOT'],'apct',()=>sv('apct',1));apc.lab('STBY  ENGAGE',.3,.95,10);apc.lab('TEMP',.72,.95,10);
   const rd=cpanel(-1,-.2,-.07,'RADAR SET CONTROL');
   const pwr=()=>({OFF:0,STBY:1,ON:2})[radar.power]??2;
   kn(rd,.2,.42,.013,'RADAR POWER',['OFF','STBY','OPR'],'rpwr',pwr,v=>{radar.power=['OFF','STBY','ON'][v];if(v===2)radar.warm=Math.max(radar.warm||0,3);});rd.lab('OFF STBY OPR',.2,.72,10);
   kn(rd,.5,.42,.013,'RANGE',radar.ranges.map(String),'rrng',()=>radar.ri,v=>{radar.ri=clamp(v,0,radar.ranges.length-1);});rd.lab('RANGE',.5,.72,10);
   kn(rd,.8,.42,.013,'MODE',['SEARCH','BEACON','MAP'],'rmode');tg(rd,.9,.85,'SENSOR (RADAR / IRST)',['RDR','IRST'],()=>radar.sensor==='IRST'?1:0,v=>{try{if((v===1)!==(radar.sensor==='IRST'))radar.toggleSensor();}catch(e){}});rd.lab('MODE',.8,.72,10);kn(rd,.35,.85,.009,'GAIN',['1','2','3','4','5'],'rgain');kn(rd,.65,.85,.009,'TILT',['-5','0','+5','+10'],'rtilt');
   const fc=cpanel(-1,-.07,.05,'FIRE CONTROL');kn(fc,.25,.45,.013,'SIGHT MODE',['CAGED','GUNS','MSL','RKT'],'sight');kn(fc,.6,.45,.011,'RETICLE',['DIM','MED','BRT'],'ret');tg(fc,.85,.45,'GUNSIGHT POWER',['OFF','ON'],()=>sv('gsp',1),v=>{ST.gsp=v;});fc.lab('SIGHT',.25,.8,10);fc.lab('RETICLE',.6,.8,10);fc.lab('POWER',.85,.8,10);
   const fz=cpanel(-1,.05,.13,'FUSE CONTROL');kn(fz,.3,.55,.01,'BOMB FUSE',['INST','DLY 1','DLY 2'],'bfz');kn(fz,.7,.55,.01,'RKT FUSE',['INST','DLY'],'rfz');
   const ox=cpanel(-1,.13,.23,'VENT / OXYGEN');tg(ox,.25,.55,'OXYGEN (4)',['OFF','ON'],()=>sv('o2',1),v=>{ST.o2=v;});tg(ox,.55,.55,'ANTI-EXPOSURE COVERALL VENT (3)',['OFF','ON'],()=>sv('aex',0),v=>{ST.aex=v;});tg(ox,.82,.55,'SPEED BRAKE OVERRIDE (2)',['NORMAL','OVERRIDE'],()=>sv('sbo',0),v=>{ST.sbo=v;},{guard:true});
   const ag=cpanel(-1,.23,.31,'G VALVE · O2');const[gx,gy,gz]=ag.at(.3,.5,.01);button(g,gx,gy,gz,.012,'G VALVE TEST (1)',0xd8d8d0,()=>{try{radio('G VALVE · TEST');}catch(e){}});
   const[ox2,oy2,oz2]=ag.at(.75,.5,.01);button(g,ox2,oy2,oz2,.01,'OXYGEN DISCONNECT (34)',0x2a6a2a,()=>{});}

  // ======== RIGHT CONSOLE (figure 1-5 sheet 2, before AFC 490) ========
  // forward angled panel: arresting gear handle (1), anti-ice lights (2) / switch (3), pitot heat (4), cockpit pressure altimeter (5),
  // emergency power light (6), emergency generator (7), master generator (23), main generator indicator (24)
  {const fp=new THREE.Group();fp.position.set(.43,-.565,-.63);fp.rotation.x=-.75;g.add(fp);box(fp,.21,.13,.012,dk,0,0,-.007);
    const cv=document.createElement('canvas');cv.width=300;cv.height=186;const c=cv.getContext('2d');c.fillStyle='#2f3336';c.fillRect(0,0,300,186);c.font='bold 11px Arial';c.fillStyle='#e8e8e0';c.textAlign='center';
    [['ENG\nANTI-ICE',40,16],['PITOT\nHEAT',100,16],['EMER\nGEN',240,16],['MASTER GEN\nON · OFF RESET · TEST',190,124],['MAIN\nGEN',270,124],['EMER\nPWR',240,92]].forEach(([s,x,y])=>s.split('\n').forEach((l,i)=>c.fillText(l,x,y+i*14)));
    const t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(.205,.127),m);pl.userData.cwFx=1;fp.add(pl);
    const P2=(u,v)=>[-.1025+u*.205,.0635-v*.127,.003];
    toggle(fp,...P2(.13,.45),'ENGINE ANTI-ICING SWITCH (3)',['OFF','ON'],()=>sv('aice',0),v=>{ST.aice=v;});
    toggle(fp,...P2(.33,.45),'PITOT HEAT SWITCH (4)',['OFF','ON'],()=>sv('pitot',1),v=>{ST.pitot=v;});
    toggle(fp,...P2(.8,.45),'EMERGENCY GENERATOR SWITCH (7)',['OFF','ON'],()=>sv('egen',0),v=>{ST.egen=v;});
    toggle(fp,...P2(.62,.82),'MASTER GENERATOR SWITCH (23)',['OFF RESET','ON','TEST'],()=>{const P=PL();if(P&&P.eng&&!P.eng.done)return P.eng.gen?1:(P.eng.ext?2:0);return sv('mgen',1);},
      v=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START){if((v===1)!==!!P.eng.gen)START.gen();}else ST.mgen=v;});
    const lpf=(u,v,col,lit)=>{const m2=new THREE.MeshBasicMaterial({color:0x221a10});const b=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.005,12),m2);b.rotation.x=Math.PI/2;b.position.set(...P2(u,v));fp.add(b);lamps.push(P=>m2.color.set(lampTest>now()||lit(P)?col:0x221a10));};
    lpf(.08,.85,0xffb020,P=>!!sv('aice',0));lpf(.18,.85,0xffb020,P=>!!sv('aice',0)&&!running(P));lpf(.8,.62,0xff3020,P=>!!sv('rat',0));
    // cockpit pressure altimeter (5) and main generator indicator (24)
    const mini=(u,v,r,draw,round)=>{const cv2=document.createElement('canvas');cv2.width=cv2.height=round?192:96;const c2=cv2.getContext('2d'),t2=new THREE.CanvasTexture(cv2);ctx.o.tex.push(t2);const m2=new THREE.MeshBasicMaterial({map:t2,toneMapped:false});ctx.o.faces.push(m2);
      const fm=new THREE.Mesh(round?new THREE.CircleGeometry(r,32):new THREE.PlaneGeometry(r*2,r*2),m2);fm.position.set(...P2(u,v));fm.position.z+=.002;fp.add(fm);const gt2=gate('m');upd.push(P=>{if(!gt2())return;if(round){face(c2,192);c2.scale(192/256,192/256);}draw(c2,P);t2.needsUpdate=true;});};
    mini(.55,.38,.022,F.cab,true);mini(.9,.82,.009,F.small('gen'),false);
    // arresting gear handle (1): hook-shaped handle on the inboard edge
    {const h=new THREE.Group();h.position.set(...P2(.05,.25));h.position.z+=.01;fp.add(h);box(h,.008,.008,.04,met,0,0,.02);box(h,.024,.012,.01,LM(0xe8e8e8,30),0,-.006,.04);
      const hb=new THREE.Mesh(new THREE.BoxGeometry(.04,.04,.06),hit);hb.position.z=.03;hb.userData.cwFx=1;h.add(hb);
      reg(h,hb,'ARRESTING GEAR HANDLE (1)',()=>{const P=PL();return P&&P.hook?'HOOK DOWN':'HOOK UP';},()=>{const P=PL();if(P){P.hook=!P.hook;try{flash('HOOK '+(P.hook?'DOWN':'UP'),900);}catch(e){}}});
      upd.push(P=>{h.rotation.x=P.hook?-.6:0;});}}
  // console row front → aft
  {let z=-.5;const nx=(d)=>{const a=z;z+=d;return[a,z];};
   const ac=cpanel(1,...nx(.075),'AIR CONDITIONING');kn(ac,.3,.55,.012,'COCKPIT TEMPERATURE',['COLD','','','','HOT'],'ctemp',()=>sv('ctemp',2));tg(ac,.72,.55,'AIR-CONDITIONING MANUAL OVERRIDE',['AUTO','MANUAL'],()=>sv('acm',0),v=>{ST.acm=v;});
   const apn=cpanel(1,...nx(.08),'AUTOPILOT');kn(apn,.25,.5,.012,'AP TURN KNOB',['L','CTR','R'],'apturn',()=>sv('apturn',1));tg(apn,.55,.5,'ALTITUDE HOLD',['OFF','ON'],()=>sv('alth',0),v=>{ST.alth=v;});tg(apn,.8,.5,'AUTOPILOT MODE',['STAB','CONTROL STICK STEERING'],()=>sv('apm',0),v=>{ST.apm=v;});
   const tac=cpanel(1,...nx(.09),'TACAN');kn(tac,.25,.5,.014,'TACAN CHANNEL (TENS)',['0','1','2','3','4','5','6','7','8','9','10','11','12'],'tch10',()=>sv('tch10',3));kn(tac,.55,.5,.011,'TACAN CHANNEL (UNITS)',['0','1','2','3','4','5','6','7','8','9'],'tch1',()=>sv('tch1',4));
     kn(tac,.82,.5,.012,'TACAN FUNCTION',['OFF','REC','T/R'],'tfn',()=>sv('tfn',2));
   const uh=cpanel(1,...nx(.09),'UHF · AN/ARC-27');kn(uh,.3,.5,.016,'UHF PRESET CHANNEL',Array.from({length:18},(_,i)=>String(i+1)),'uhfCh',()=>sv('uhfCh',7)-1,v=>{ST.uhfCh=v+1;});kn(uh,.72,.45,.011,'UHF FUNCTION',['OFF','T/R','T/R+G','ADF'],'ufn',()=>sv('ufn',1));kn(uh,.72,.8,.008,'UHF VOLUME',['1','2','3','4','5'],'uvol',()=>sv('uvol',3));
   const cp=cpanel(1,...nx(.06),'COMPASS');kn(cp,.3,.55,.01,'COMPASS MODE',['SLAVED','FREE','DG'],'cmode');button(g,...cp.at(.7,.55,.006),.007,'COMPASS SYNC',0x2a2a2a,()=>{});
   const il=cpanel(1,...nx(.06),'INTERIOR LIGHTS');kn(il,.25,.55,.01,'INSTRUMENT LIGHTS',['OFF','DIM','MED','BRT'],'ilt');kn(il,.55,.55,.01,'CONSOLE LIGHTS',['OFF','DIM','MED','BRT'],'clt');kn(il,.82,.55,.01,'FLOOD',['OFF','DIM','BRT'],'flt');
   const cd=cpanel(1,...nx(.07),'CODER GROUP');kn(cd,.3,.55,.011,'CODER',['1','2','3','4'],'cod');tg(cd,.72,.55,'CODER POWER',['OFF','ON'],()=>sv('codp',0),v=>{ST.codp=v;});
   const ff2=cpanel(1,...nx(.07),'IFF');kn(ff2,.3,.55,.012,'IFF MASTER',['OFF','STBY','LOW','NORM','EMER'],'iff',()=>sv('iff',3));tg(ff2,.72,.55,'IFF MODE 3',['OFF','ON'],()=>sv('iff3',1),v=>{ST.iff3=v;});
   const ms=cpanel(1,...nx(.1),'MISSILE SYNCHRONIZER');kn(ms,.25,.4,.012,'MISSILE SELECT',['1','2','3','4'],'msel');tg(ms,.6,.4,'GUNSIGHT CAMERA TEST (16)',['OFF','TEST'],()=>sv('gcam',0),v=>{ST.gcam=v;});
     tg(ms,.85,.4,'APPROACH LIGHT HOOK BYPASS (15)',['NORMAL','BYPASS'],()=>sv('hbyp',0),v=>{ST.hbyp=v;},{guard:true});ms.lab('SYNC',.25,.85,10);ms.lab('CAM TEST',.6,.85,10);ms.lab('HOOK BYPASS',.85,.85,10);}
  // right wall: exterior / interior light panels (11, 11A), armament panel dimming (12), emergency vent knob (13), wingfold (14)
  {const wp=new THREE.Group();wp.position.set(.528,-.5,-.42);wp.rotation.y=-Math.PI/2;wp.rotation.order='YXZ';wp.rotation.x=-.2;g.add(wp);box(wp,.2,.08,.008,dk,0,0,-.005);
    const cv=document.createElement('canvas');cv.width=400;cv.height=160;const c=cv.getContext('2d');c.fillStyle='#2f3336';c.fillRect(0,0,400,160);c.font='bold 14px Arial';c.fillStyle='#e8e8e0';c.textAlign='center';
    [['EXTERIOR LIGHTS',110,16],['POSITION',50,140],['FUS',110,140],['ANTI-COL',170,140],['INT LIGHTS',290,16],['ARMT DIM',290,140],['FLOOD',360,140]].forEach(([s,x,y])=>c.fillText(s,x,y));
    const t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(.2,.08),m);pl.userData.cwFx=1;wp.add(pl);
    const W=(u,v)=>[-.1+u*.2,.04-v*.08,.002];
    toggle(wp,...W(.12,.5),'POSITION LIGHTS (11)',['OFF','DIM','BRT'],()=>sv('posl',2),v=>{ST.posl=v;});toggle(wp,...W(.28,.5),'FUSELAGE LIGHTS (11)',['OFF','ON'],()=>sv('fusl',1),v=>{ST.fusl=v;});
    toggle(wp,...W(.43,.5),'ANTI-COLLISION (11)',['OFF','ON'],()=>sv('acol',1),v=>{ST.acol=v;});knob(wp,...W(.72,.5),.012,'ARMAMENT PANEL DIMMING (12)',['OFF','DIM','MED','BRT'],'adim',undefined,undefined,{});
    knob(wp,...W(.9,.5),.012,'FLOOD LIGHTS (11A)',['OFF','DIM','BRT'],'flood');}
  {const kv=new THREE.Group();kv.position.set(.53,-.53,-.2);kv.rotation.z=Math.PI/2;g.add(kv);knob(kv,0,0,0,.014,'COCKPIT EMERGENCY VENTILATION KNOB (13)',['CLOSED','OPEN'],'event');}
  {const wf=new THREE.Group();wf.position.set(.52,-.56,.02);g.add(wf);box(wf,.04,.03,.1,dk,0,-.015,0);const hd=new THREE.Group();wf.add(hd);box(hd,.01,.07,.01,LM(0xd8b820,30),0,.035,0);box(hd,.03,.012,.012,LM(0xd8b820,30),0,.07,0);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.04,.09,.04),hit);hb.position.y=.04;hb.userData.cwFx=1;hd.add(hb);
    reg(hd,hb,'WINGFOLD CONTROLS (14)',()=>sv('wfold',0)?'FOLD':'SPREAD',()=>{const P=PL();if(P&&!P.onGnd){try{radio('WINGFOLD · ON DECK ONLY');}catch(e){}return;}ST.wfold=sv('wfold',0)?0:1;});upd.push(()=>{hd.rotation.x=sv('wfold',0)?.6:0;});}

  // stick (control stick with trigger and trim button); borrowed stick motion is copied into stkG
  const stkG=new THREE.Group(),thrG=new THREE.Group();g.add(stkG);g.add(thrG);thrG.visible=false;
  box(stkG,.026,.34,.026,LM(0x1a1a1a,30),0,.17,0);box(stkG,.042,.12,.048,LM(0x2a2a2a,20),0,.39,-.004,-.25);box(stkG,.014,.016,.014,LM(0x777777,30),0,.455,.004);box(stkG,.012,.022,.012,LM(0xb02020,30),-.018,.43,0);box(stkG,.006,.03,.022,LM(0x888888,30),0,.37,-.03);
  // per-frame: instruments ~15 Hz, lamps and switch positions every frame
  let t=0,fr=0;
  return{stkG,thrG,ctls,upd:(P)=>{if(!P)return;for(const l of lamps)l(P);const tn=now();if(tn-t<.025)return;t=tn;fr++;
        {const E=P.eng&&!P.eng.done?P.eng.e[0]:null;let h=0;try{h=q(P.pos.y-groundAt(P.pos.x,P.pos.z),.66);}catch(e){}let b=0;try{b=q(brgField(P),2)+q(distField(P),4);}catch(e){}
     FKA=[q(P.bank,229),q(P.pitch,229),q(P.hdg,2),q(P.cas,1),q(P.mach,100),q(P.alpha,229),q(P.pos.y,.66),q(P.vel?P.vel.y:0,.1),q(P.nz,20),q(P.maxNz,5),q(P.beta,115),h,b,P.gearPos>.5?1:0,STV];FK=FKA.join();
     SK=[q(P.n,50),q(P.thr,50),q(P.totalFuel,.2),q(P.gearPos,20),q(P.flapPos!=null?P.flapPos:P.flapCmd,20),q(P.sb,20),Math.floor(now()),lampTest>now()?1:0,STV,E?q(E.rpm,2)+'/'+q(E.egt,40)+(E.lit?1:0):'',(P.fire||0)>0?1:0,q(P._trimP,20),q(P.ctl?P.ctl.r:0,20),(typeof cautions==='function'?cautions(P).join('.'):''),P.hook?1:0,P.onGnd?1:0].join();}
    for(let i=0;i<upd.length;i++){try{upd[i](P);}catch(e){}}
    // nose trim indicator: follow the pitch input slowly
    P._trimP=(P._trimP||0)*.97+(P.ctl?P.ctl.p:0)*.03;}};}

PIT[ID].custom=build;
// keep the cockpit's own clickable list alive for hover / pick: the cwpit group is under ck[kind].root, so pick() finds userData.ctl
console.info('[f8pit] F-8E NATOPS cockpit active');
})();
