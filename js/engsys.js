/* =====================================================================================================================
   v263 — engine systems, in-depth damage and the intake-based compressor stall model. Loads after game.js, coldwar-jets.js,
   startup.js and realism.js, and wraps the existing Jet methods so per-jet data is unchanged.

   COMPRESSOR STALLS (replaces the old per-jet "s" number)
   A stall is the sum of loads on the compressor compared with that engine's surge margin, so the same event is a non-event on
   one jet and a problem on another:
     * inlet distortion   angle of attack and sideslip, divided by how good and how big the intake is (a big, ramp-controlled
                          F-15 / Flanker inlet shrugs off what a small fixed Mirage / Viggen inlet cannot); supersonic
                          mismatch on fixed-geometry intakes
     * throttle transient the engine is accelerating hard from low rpm; worse with a fast throttle movement, with altitude,
                          and with a simple hydromechanical fuel control (J79, TF30, Atar, R-11 ...); a digital fuel control
                          (F100-220, F110, F404, AL-31F ...) schedules around it
     * intake starvation  the engine wants more air than the intake can pass at low speed and high rpm (small intakes)
     * ingestion          gun gas, missile exhaust, afterburner light-off, battle damage
     * heat / wear        engine already damaged or running hot
   A centrifugal or early low-pressure-ratio axial engine (MiG-15, F-86) has a huge margin: it almost never stalls. A modern
   engine behind a huge adjustable inlet (F-15, Su-27) very rarely stalls. TF30, Atar, J79 on a small intake, the Viggen's RM8
   and the M53 stall readily. All the numbers are in the tables just below and are meant to be tuned.

   ENGINE SYSTEMS (per engine)  oil pressure / temperature / quantity, EGT with a redline, vibration, bearing seizure on oil
   starvation, over-temperature wear, windmilling after flame-out.
   HYDRAULICS  two systems driven by the engine gearboxes (system A from the left / only engine, B from the right), fluid
   quantity, line leaks, pump damage, windmill pressure after flame-out, F-16 EPU. Flight-control authority, gear, flaps and
   brakes read the result (dm.hyd), as before.
   DAMAGE  an engine hit now picks a side and a sub-system (compressor / turbine / fuel control / gearbox / case burn-through),
   plus oil-line hits, hydraulic line / pump hits and flight-control actuator hits. dm.eng and dm.hyd stay as the summary values
   the rest of the game reads.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof Jet==='undefined'||!Jet.prototype.stallTick||!Jet.prototype.hurt){console.warn('[engsys] game core missing');return;}
const cl=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a);
const ES=window.ENGSYS={on:true,stalls:true,rate:1,debug:false};
const PL=()=>typeof player!=='undefined'?player:null;
const say=(t,u)=>{try{radio(t,u);}catch(e){}};

/* ===================================== TABLES ===================================== */
// Engine classes. mg: surge margin (fraction of the compressor map) · fc: fuel-control sophistication, 0 hydromechanical … 1 digital
// idle: idle rpm as a fraction of full · egt: [idle, military, afterburner delta, redline] °C · oilP: normal oil pressure psi
// oilT: normal oil temperature at military power in flight °C · oilM: oil temperature caution °C
const EC={
  cent:{n:'centrifugal',     mg:.34, fc:.10,idle:.52,egt:[320,620, 0,690],oilP:28,oilT:78,oilM:118},
  ax1: {n:'early axial',     mg:.27, fc:.15,idle:.58,egt:[340,640,40,700],oilP:34,oilT:82,oilM:122},
  axA: {n:'turbojet',        mg:.17, fc:.25,idle:.65,egt:[380,650,30,720],oilP:40,oilT:88,oilM:130},
  tf30:{n:'TF30 turbofan',   mg:.115,fc:.30,idle:.68,egt:[400,610,20,650],oilP:42,oilT:92,oilM:135},
  axB: {n:'turbojet / fan',  mg:.165,fc:.30,idle:.66,egt:[400,690,30,760],oilP:42,oilT:90,oilM:135},
  axM: {n:'analog-electronic',mg:.21,fc:.45,idle:.66,egt:[390,700,30,780],oilP:45,oilT:92,oilM:138},
  axD: {n:'digital (DEEC / FADEC)',mg:.27,fc:.85,idle:.62,egt:[380,720,30,830],oilP:48,oilT:95,oilM:145}};
// Per aircraft: [engine class, ik, ic, overrides]
//   ik  intake capture area against what the engine can swallow: 1 = adequate, 0.7 = starved (Viggen), 1.6 = huge (F-15, Flanker, F-86)
//   ic  inlet control: 0 fixed pitot / fixed cone … 1 automatic ramps, bypass doors, ground-run louvres
//   overrides: mg, fc, gi (gun-gas ingestion 0-1), mi (missile-exhaust ingestion 0-1), hy (hydraulic profile key)
const T={
  'MiG-15':['cent',1.60,.05],           'F-86F':['ax1',1.55,.10,{gi:.35}],     'MiG-19':['ax1',1.30,.15,{mg:.24}],
  'F-100A':['axA',1.10,.15,{mg:.18}],   'F-8E':['axA',1.00,.30,{mg:.18}],      'F-104S':['axA',.85,.25,{mg:.165}],
  'F-106A':['axA',1.20,.70,{mg:.18}],   'F-4E':['axA',1.15,.60,{mg:.165,mi:.25}],'F-5E':['axA',.95,.15,{mg:.20,fc:.30}],
  'A-4E':['axB',1.25,.15,{mg:.20}],     'A-7D':['axM',1.30,.15,{mg:.20,fc:.35}],'AV-8B':['axM',1.00,.20,{mg:.20,fc:.50,mi:.2}],
  'F-20':['axD',1.00,.30,{mg:.25}],     'F-14A':['tf30',1.35,.80,{mi:.75}],    'F-14B':['axD',1.35,.80,{mg:.25}],
  'F-14D':['axD',1.35,.80,{mg:.26}],    'F-111F':['tf30',1.40,.85,{mg:.105}],
  'F-15C':['axD',1.55,.90,{mg:.26}],    'F-15E':['axD',1.55,.90,{mg:.27}],
  'F-16':['axM',1.20,.45,{mg:.20,fc:.50}],'F-16C':['axD',1.20,.45,{mg:.25}],
  'F-18C':['axD',1.25,.60,{mg:.27}],    'F-18E':['axD',1.25,.60,{mg:.28,fc:.90}],
  'Lightning F.6':['axA',.75,.10,{mg:.16,fc:.20}],'J 35F':['axA',.80,.25,{mg:.16}],
  'AJS-37':['axB',.70,.35,{mg:.125}],   'Mirage III':['axA',.85,.30,{mg:.16,fc:.22}],
  'Mirage F1':['axA',.95,.30,{mg:.17}], 'Mirage 2000':['axM',1.00,.50,{mg:.15,fc:.45}],
  'Super Etendard':['axA',1.00,.10,{mg:.17}],'Jaguar':['axM',1.00,.10,{mg:.22,fc:.35}],
  'Alpha Jet':['axM',1.10,.00,{mg:.24,fc:.40}],'AMX':['axM',1.10,.10,{mg:.21,fc:.35}],
  'Tornado GR.4':['axB',1.00,.60,{mg:.145,fc:.45}],'Yak-38':['axB',.90,.00,{mg:.15}],'Yak-141':['axM',1.00,.40,{mg:.20}],
  'MiG-21':['axA',.80,.40,{mg:.18}],    'MiG-23':['axB',1.00,.60,{mg:.15}],    'MiG-27K':['axB',.95,.30,{mg:.15}],
  'Su-22M4':['axB',1.00,.50,{mg:.15}],  'Su-24M':['axM',1.30,.65,{mg:.17,fc:.30}],
  'Su-25':['axA',1.10,.00,{mg:.19,gi:.90,mi:.60}],
  'MiG-25':['axB',1.55,.75,{mg:.14}],   'MiG-31':['axM',1.60,.85,{mg:.20,fc:.50}],
  'MiG-29':['axM',1.35,.80,{mg:.19,fc:.40}],'MiG-29S':['axM',1.35,.80,{mg:.19,fc:.40}],'MiG-29SMT':['axM',1.35,.80,{mg:.21,fc:.50}],
  'Su-27':['axM',1.65,.90,{mg:.22,fc:.45,hy:'h4'}],'Su-27SM':['axM',1.65,.90,{mg:.23,fc:.50,hy:'h4'}],
  'Su-33':['axM',1.65,.90,{mg:.24,fc:.55,hy:'h4'}],'Su-30SM':['axM',1.65,.90,{mg:.24,fc:.55,hy:'h4'}],
  'Su-30MK2':['axM',1.65,.90,{mg:.24,fc:.55,hy:'h4'}],'Su-35S':['axD',1.65,.90,{mg:.26,hy:'h4'}],
  'J-11':['axM',1.60,.90,{mg:.24,fc:.50,hy:'h4'}],'J-8F':['axA',1.00,.30,{mg:.17}],'JH-7':['axM',1.00,.20,{mg:.21,fc:.30}]};
// hydraulics: n systems · pnom psi · dep share of the flight controls that need hydraulic power (rest is manual reversion)
const HY={h3:{n:2,pnom:3000,dep:.85},h4:{n:2,pnom:4000,dep:.90},h1:{n:1,pnom:3000,dep:.55}};
const HYT={'MiG-15':'h1','F-86F':'h1','MiG-19':'h1','F-100A':'h1','MiG-21':'h1'};
const DEF=['axB',1.00,.30,{}];
const PC={};
function prof(t){let p=PC[t];if(p)return p;const r=T[t]||DEF,c=EC[r[0]],o=r[3]||{};
  p=PC[t]={ec:r[0],c,ik:r[1],ic:r[2],mg:o.mg||c.mg,fc:o.fc!=null?o.fc:c.fc,gi:o.gi||.15,mi:o.mi||.1,hy:HY[o.hy||HYT[t]||'h3'],epu:t==='F-16'||t==='F-16C'};
  return p;}
const nEng=t=>{try{if(window.START)return window.START.spec(t).n;}catch(e){}return 1;};

/* ===================================== STALL MODEL (pure) ===================================== */
// c: {a,b (deg, absolute), M, cas, alt, n (0-1 throttle spool), nT, rate (throttle units/s), ab, imp, h (engine health 0-1), comp, fcu, egtN}
// returns the loads in "points of surge margin" and r = total / margin
const K=ES.K={dk:.085,dexp:2.4,a0:18,a1:10,bk:.045,Tc:.12,Ti:.5,LK:3,R0:.62,FD:.30,FM:.12,FF:.7};   // tuning knobs for the stall model
function loads(c,p){
  const ikE=Math.pow(p.ik,.8)*(.75+.5*p.ic);
  const aref=K.a0+K.a1*p.ic;
  const dist=K.dk*Math.pow(c.a/aref,K.dexp)/ikE+K.bk*Math.pow(c.b/9,1.5)/ikE;
  const Md=1.55+.7*p.ic,mach=.06*Math.pow(Math.max(0,c.M-Md),1.2)/(.5+p.ic);
  const acc=Math.max(0,c.nT-c.n),altF=1+.5*cl(c.alt/12000,0,1.2),slam=cl((c.rate-.3)/1.3,0,1);
  const trans=K.Tc*Math.pow(acc,1.3)*Math.pow(1-.8*c.n,.6)*(1-.85*p.fc)*altF*(1+1.4*slam)*(1+1.5*(c.fcu||0))/Math.pow(ikE,K.Ti);
  const nrel=p.c.idle+(1-p.c.idle)*c.n,dem=Math.pow(nrel,1.2)*(1+.12*c.ab),sup=p.ik*(.72+.45*cl(c.cas/260,0,1));
  const starve=.10*Math.max(0,dem-sup);
  const dmg=.10*Math.pow(1-c.h,1.2)+.08*(c.comp||0)+.04*(c.fcu||0);
  const heat=.5*Math.max(0,(c.egtN||0)-.97);
  const imp=c.imp||0,tot=dist+mach+trans+starve+dmg+heat+imp;
  return{dist,mach,trans,starve,dmg,heat,imp,tot,r:tot/p.mg};}
const hazard=r=>r>K.R0?K.LK*(r-K.R0)*(r-K.R0):0;
const causeOf=L=>{let k='dist',v=L.dist;for(const q of['trans','starve','imp','dmg','heat','mach'])if(L[q]>v){v=L[q];k=q;}
  return{dist:'INLET DISTORTION',trans:'THROTTLE TRANSIENT',starve:'INTAKE STARVED',imp:'INGESTION',dmg:'ENGINE DAMAGE',heat:'OVER-TEMP',mach:'INLET MISMATCH'}[k];};

/* ===================================== STATE ===================================== */
function mk(j){const p=prof(j.type),n=nEng(j.type),warm=!j.onGnd||(j.n||0)>.2,am=ambC(j);
  return{t:j.type,p,n,e:Array.from({length:n},()=>({h:1,seize:false,f:1,nE:warm?p.c.idle+(1-p.c.idle)*(j.n||.5):0,egt:warm?p.c.egt[0]+(p.c.egt[1]-p.c.egt[0])*Math.pow(j.n||.5,1.5):am,
      oilQ:1,oilT:warm?p.c.oilT*.85:am,oilP:warm?p.c.oilP:0,leak:0,vib:0,lowT:0,hot:0,comp:0,turb:0,fcu:0,agb:0,off:false})),
    hyd:{A:mkH(p,warm),B:mkH(p,warm)},epu:1,epuOn:false,act:{p:1,r:1,y:1},imp:0,rate:0,thp:j.thr||0,thT:0,abp:0,gunT:0,
    lastEng:j.dm?j.dm.eng:100,lastHyd:j.dm?j.dm.hyd:100,acc:0,load:null,warn:{},hit:0,mild:false,auto:false,tmo:0};}
function mkH(p,warm){return{p:warm?p.hy.pnom:0,q:1,leak:0,pump:1}}
function ambC(j){try{return isaT(Math.max(0,j.pos.y))-273.15;}catch(e){return 15;}}
function get(j){if(!j||!j.dm)return null;let s=j.es;if(!s||s.t!==j.type){s=j.es=mk(j);}return s;}
ES.get=get;ES.prof=prof;ES._loads=loads;ES._hazard=hazard;ES._cause=causeOf;ES._EC=EC;ES._T=T;

const warn=(j,es,k,txt,cd,urgent)=>{const t=performance.now()/1000;if(es.warn[k]&&t-es.warn[k]<(cd||12))return;es.warn[k]=t;
  if(j===PL())say(txt,urgent!==false);else if(j.ai&&j.ai.friend&&j.callsign&&urgent!==false)say(j.callsign+', '+txt.toLowerCase());};
const eName=(es,i)=>es.n>1?(i?'R':'L')+' ENG':'ENGINE';

/* ===================================== STALL STATE MACHINE ===================================== */
// which engines a stall is on: [left, right]
const hit=(cs,es,i)=>!cs.twin||cs.both||(i===(cs.side<0?0:1));
const _sfT=Jet.prototype.stallStart;
Jet.prototype.stallStart=function(why){
  const cs=this.cs,es=get(this);if(!ES.on||!ES.stalls||!es)return;
  if(cs.st||!this.alive||this.dm.eng<=0||this.remote)return;
  const p=es.p,L=es.load||{r:1};
  cs.st=1;cs.t=0;cs.hang=0;cs.rel=0;cs.twin=es.n>1;cs.side=Math.random()<.5?-1:1;
  // the engine with the lower margin (more damage, hotter) is the one that goes
  if(cs.twin){const a=es.e[0],b=es.e[1];if(Math.abs((a.h-a.comp*.5)-(b.h-b.comp*.5))>.08)cs.side=(a.h-a.comp*.5)<(b.h-b.comp*.5)?-1:1;}
  cs.both=cs.twin&&Math.random()<(L.r>1.6?.35:L.r>1.25?.12:.04)+(why==='INGESTION'?.2:0);cs.x=.5;
  // a modern digital control rides it out and recovers by itself; an older one hangs until the pilot retards the throttle
  const auto=p.fc>=.7&&es.e.every(e=>e.h>.5);
  es.auto=auto;es.mild=auto||Math.random()>cl(.25+(1-p.fc)*.50+(L.r-1)*.30,.04,.96);
  es.stCause=why||'';
  try{sfx.bang(this===PL()?1:.4);this.stFlame(true);}catch(e){}
  const side=cs.twin&&!cs.both?(cs.side<0?'LEFT ENGINE':'RIGHT ENGINE'):cs.twin?'BOTH ENGINES':'ENGINE';
  if(this===PL()){this.shake=Math.max(this.shake,es.mild?.8:1.3);
    try{radio('COMPRESSOR STALL · '+side+' · '+(why||'')+(es.mild?'':' · RETARD THROTTLE'),true);}catch(e){}
    try{if(rio.active())rio.say((side.charAt(0)+side.slice(1).toLowerCase())+' stall! '+(es.mild?'':'Pull the power back!'),'cst',4);}catch(e){}}
  else if(this.ai&&this.ai.friend&&this.callsign){try{radio(this.callsign+', compressor stall!',true);}catch(e){}}};

// kept for callers: ingestion from an external event (gun gas, missile exhaust) is an impulse on the compressor load
Jet.prototype.stallIngest=function(){const es=get(this);if(!es)return;es.imp+=.04;};

const _stT=Jet.prototype.stallTick;
Jet.prototype.stallTick=function(dt){
  const cs=this.cs;if(!cs)return;
  if(!ES.on)return _stT.call(this,dt);
  if(!this.alive||this.remote){cs.st=0;cs.thr=1;return;}
  const es=get(this);if(!es)return;
  if(this.dm.eng<=0){cs.st=0;return;}
  const p=es.p;
  // throttle rate (units / s), smoothed
  es.thT+=dt;if(es.thT>=.2){const r=(this.thr-es.thp)/es.thT;es.thp=this.thr;es.thT=0;es.rate=Math.max(r,es.rate*Math.exp(-.2/.7));}
  es.imp*=Math.exp(-dt/1.3);
  const abUp=this.ab>.12&&es.abp<=.12;es.abp=this.ab;
  const out=this.totalFuel<=0,nT=out?0:cl(this.thr/.8,0,1);
  let av=0,cmp=0,fcu=0,eg=0;for(const e of es.e){av+=e.h;if(e.comp>cmp)cmp=e.comp;if(e.fcu>fcu)fcu=e.fcu;if(e.egt>eg)eg=e.egt;}av/=es.n;eg/=p.c.egt[3];
  // gun gas: both the gun and the intake are on the nose of some jets, and the Su-25 breathes its own rocket and cannon smoke
  let gun=false;try{gun=!!this.trigger&&this.gun&&this.gun.ammo>0;}catch(e){}
  if(gun)es.imp=Math.min(.16*p.gi+.02,es.imp+p.gi*.12*dt*(1+.5*cl(this.pos.y/12000,0,1.2)));
  if(abUp)es.imp+=.05*(1-.8*p.fc)*(1+.5*cl(this.pos.y/12000,0,1.2))*(this.n>.9?1:.4);
  const L=es.load=loads({a:Math.abs(this.alpha*57.2958),b:Math.abs(this.beta*57.2958),M:this.mach||0,cas:this.cas||0,alt:this.pos.y,n:this.n,nT,rate:es.rate,ab:this.ab,imp:es.imp,h:av,comp:cmp,fcu,egtN:eg},p);
  if(cs.st===0){
    cs.cool-=dt;if(cs.thr<1)cs.thr=Math.min(1,cs.thr+dt/2.2);
    if(cs.cool<=0&&this.n>.25&&this.fuel>0&&ES.stalls){
      // FADEC / digital control (fc >= FF): the control schedules fuel, nozzle and stators around surge, so the onset moves out
      // by FD and what is left is scaled by FM. Stalls then only come from real abuse (extreme AoA, ingestion, damage)
      const fad=p.fc>=K.FF,lam=hazard(fad?L.r-K.FD:L.r)*ES.rate*(fad?K.FM:1);
      if(lam>0&&Math.random()<lam*dt)this.stallStart(causeOf(L));}
    return;}
  cs.t+=dt;
  const twin=cs.twin,tot=x=>twin&&!cs.both?.5+.5*x:x;
  if(cs.st===1){// surge: violent pulsing, bangs and flames out of both ends
    cs.x=.12+.7*Math.abs(Math.sin(cs.t*24));cs.thr=tot(cs.x);
    if(this===PL())this.shake=Math.max(this.shake,es.mild?.55:.9);
    if(Math.random()<dt*(es.mild?5:9))this.stFlame(true);
    if(Math.random()<dt*(es.mild?2:3.2))sfx.bang(this===PL()?.8:.3);
    if(cs.t>(es.mild?.8:1.1)){
      if(es.mild){cs.st=0;cs.cool=5+Math.random()*8;cs.thr=.7;es.imp=0;if(this===PL())try{radio('Stall cleared.');}catch(e){}}
      else{cs.st=2;cs.t=0;}}
    return;}
  if(cs.st===2){// hung: the engine sits at a fraction of its thrust, EGT climbing, until the throttle is pulled back
    cs.x=.08+.04*Math.sin(cs.t*9);cs.thr=tot(cs.x);
    if(this===PL())this.shake=Math.max(this.shake,.25);
    if(Math.random()<dt*3.5)this.stFlame(false);
    const ret=this.ai?cs.t>2.4:this.thr<.35;cs.rel=ret?cs.rel+dt:0;
    if(cs.rel>.9){cs.st=0;cs.cool=14+Math.random()*10;es.imp=0;if(this===PL())try{radio('Engine recovered. Advance the throttle slowly.');}catch(e){}return;}
    cs.hang+=dt;
    if(cs.hang>7&&!cs.burn&&es.p.mg<.2&&Math.random()<dt*.25){cs.burn=true;this.ignite(.25);}
    if(cs.hang>9&&!this.ai){cs.st=3;cs.t=0;cs.burn=false;cs.thr=twin&&!cs.both?.5:0;if(this===PL())try{radio('ENGINE FLAMEOUT · THROTTLE IDLE · AIR RELIGHT',true);}catch(e){}}
    return;}
  if(cs.st===3){// flame-out: windmill relight with the throttle back and some airspeed. Only the stalled engine of a twin is out.
    cs.thr=twin&&!cs.both?.5:0;const ok=this.thr<.5&&this.cas>150;cs.rel=ok?cs.rel+dt:0;
    if(cs.rel>3.5){cs.st=0;cs.cool=20;cs.thr=.05;cs.burn=false;if(this===PL())try{radio('Engine relight.');}catch(e){}}}};

/* ===================================== SYSTEMS TICK ===================================== */
function tick(j,dt){
  const es=get(j);if(!es||j.remote)return;
  const p=es.p,c=p.c,dm=j.dm,cs=j.cs,isP=j===PL();
  if(!isP){es.acc+=dt;if(es.acc<.2)return;dt=es.acc;es.acc=0;}
  dt=Math.min(dt,.25);
  // ---- anything outside this module that changed dm.eng / dm.hyd (fire, landing, extinguisher, healAll)
  const dE=dm.eng-es.lastEng;
  if(dE>8&&dm.eng>=99){reset(j);return;}
  else if(dE<-.01){const w=-dE/100;for(const e of es.e)e.h=Math.max(0,e.h-w*(es.n>1&&j.fire<=0?(Math.random()<.5?1.7:.3):1));}
  const dH=dm.hyd-es.lastHyd;
  if(dH<-.01){const w=-dH/100;const s=Math.random()<.5?es.hyd.A:es.hyd.B;s.leak+=w*.05;}
  const am=ambC(j),M=j.mach||0,air=cl((j.cas||0)/350,0,1),startM=j.eng&&!j.eng.done?j.eng:null,alt=j.pos.y;
  let thrSum=0,hotMax=0;
  for(let i=0;i<es.n;i++){
    const e=es.e[i],inSt=cs.st&&hit(cs,es,i),out=j.totalFuel<=0||e.seize||e.h<=0||(cs.st===3&&inSt)||dm.eng<=0;
    // ---- rpm: throttle spool, stall sag, start-up model, windmilling after flame-out
    let nT;
    if(startM){const se=startM.e[Math.min(i,startM.e.length-1)];nT=se.rpm/100;}
    else if(out){nT=e.seize?0:cl(.05+(j.cas||0)/420,.05,.28);}
    else{nT=c.idle+(1-c.idle)*cl(j.n,0,1.02);if(inSt)nT*=cs.st===1?.9:.78;}
    e.nE+=(nT-e.nE)*(1-Math.exp(-dt/(out?2.5:.35)));
    const nE=e.nE,x=cl((nE-c.idle)/(1-c.idle),0,1.05),run=!out&&nE>.35;
    // ---- EGT
    let tg;
    if(startM){const se=startM.e[Math.min(i,startM.e.length-1)];tg=se.egt*700;}
    else if(!run){tg=am+(nE>.1?40+nE*60:0);}
    else{tg=c.egt[0]+(c.egt[1]-c.egt[0])*Math.pow(x,1.5)+c.egt[2]*(j.ab||0)+25*cl(M,0,1.5)+30*cl(alt/12000,0,1.3)+130*(1-e.h)+90*e.turb+40*e.fcu;
      if(inSt)tg+=cs.st===1?120:Math.min(260,60+cs.t*50);
      if(j.fire>0)tg+=80*j.fire;}
    e.egt+=(tg-e.egt)*(1-Math.exp(-dt/(tg>e.egt?(run?3.5:5):(run?6:22))));
    const over=e.egt-c.egt[3];
    if(over>0&&!startM){hotMax=Math.max(hotMax,over);e.hot+=dt;e.h=Math.max(0,e.h-.0045*Math.pow(over/40,1.5)*dt);
      if(over>25)warn(j,es,'egt'+i,'OVER-TEMP · '+eName(es,i),8);
      if(over>180&&e.hot>5&&j.fire<=0&&Math.random()<dt*.15)j.ignite(.3);}
    else e.hot=Math.max(0,e.hot-dt*.5);
    // ---- oil
    const pump=Math.pow(cl((nE-.05)/.55,0,1),.7),visc=cl(1.15-.0042*(e.oilT-30),.7,1.2),q=e.oilQ,qf=q>.35?1:q<.05?0:(q-.05)/.3;
    e.oilQ=Math.max(0,q-e.leak*dt);
    const pT=p.c.oilP*(.40+.60*cl(nE,0,1))*pump*visc*qf*(e.seize?0:1);
    e.oilP+=(pT-e.oilP)*(1-Math.exp(-dt/(pT>e.oilP?.6:1.5)));
    const f=(.55+.55*x)*(1.12-.25*air)+.12*(j.ab||0),starve=1+1.8*Math.max(0,.45-e.oilQ);
    let tT=am+(c.oilT-am)*f*starve*(run||nE>.15?1:.35);if(j.fire>0)tT+=60*j.fire;if(e.seize)tT+=30;
    e.oilT+=(tT-e.oilT)*(1-Math.exp(-dt/(45*(.5+.5*Math.max(.15,e.oilQ)))));
    // oil starvation: no pressure with the engine turning means the bearings go
    if(!out&&nE>.35&&e.oilP<.15*c.oilP){e.lowT+=dt*(.5+nE);}else e.lowT=Math.max(0,e.lowT-dt*.4);
    const fail=45;e.vib=cl(e.lowT/fail,0,1);
    if(e.oilP<.35*c.oilP&&run)warn(j,es,'oil'+i,'OIL PRESSURE · '+eName(es,i),10);
    if(e.vib>.5)warn(j,es,'vib'+i,'ENGINE VIBRATION · '+eName(es,i)+' · SHUT DOWN',8);
    if(e.lowT>=fail&&!e.seize){e.seize=true;e.h=0;warn(j,es,'sz'+i,'ENGINE SEIZURE · '+eName(es,i),5);if(Math.random()<.6)j.ignite(.35);}
    if(e.oilT>c.oilM&&run){warn(j,es,'ot'+i,'OIL TEMP HIGH · '+eName(es,i),12,false);e.h=Math.max(0,e.h-.0006*((e.oilT-c.oilM)/10)*dt);}
    // ---- thrust this engine delivers (stall handled separately through cs.thr)
    e.f=(e.seize||e.h<=0)?0:(.3+.7*e.h*(1-.5*e.turb)*(1-.35*e.comp)*(1-.1*e.fcu));
    if(e.h<=0&&!e.off){e.off=true;warn(j,es,'fo'+i,'ENGINE FLAMEOUT · '+eName(es,i),5);}
    if(e.h>0)e.off=false;
    thrSum+=e.f;
  }
  // ---- hydraulics: gearbox pumps, fluid, leaks
  const H=es.hyd,hy=p.hy;let epu=false;
  if(p.epu&&!j.onGnd&&es.epu>0){
    const pa=H.A.p/hy.pnom,pb=H.B.p/hy.pnom;
    if(!es.epuOn&&(thrSum<=.01||(pa<.35&&pb<.35)))es.epuOn=true;
    if(es.epuOn)epu=true;}
  const dr=[es.e[0],es.e[es.n>1?1:0]];
  [['A',0],['B',1]].forEach(([k,ix])=>{const s=H[k],e=dr[ix],pumpOut=(e.seize?0:cl((e.nE-.12)/.4,0,1))*(1-.9*e.agb)*s.pump;
    let out=pumpOut;if(epu)out=Math.max(out,.72);
    s.q=Math.max(0,s.q-s.leak*dt*(.3+.7*s.p/hy.pnom));
    const fl=cl((s.q-.05)/.3,0,1);
    const tgt=hy.pnom*out*fl*(1-.5*cl(s.leak*10,0,1));
    s.p+=(tgt-s.p)*(1-Math.exp(-dt/(tgt>s.p?.5:(out>0?.8:9))));
    s.p=Math.max(0,s.p);});
  if(epu){es.epu=Math.max(0,es.epu-dt/600);if(es.epu<=0)es.epuOn=false;}
  const pA=cl(H.A.p/hy.pnom,0,1),pB=cl(H.B.p/hy.pnom,0,1),eff=hy.n===1?pA:cl(.62*(pA+pB),0,1);
  const hOld=dm.hyd;dm.hyd=Math.round(100*(1-hy.dep*(1-eff)));
  if(es.hyA===undefined){es.hyA=pA;es.hyB=pB;}
  if(pA<.3&&es.hyA>=.3)warn(j,es,'hA','HYD A PRESSURE LOSS',6);
  if(pB<.3&&es.hyB>=.3&&hy.n>1)warn(j,es,'hB','HYD B PRESSURE LOSS',6);
  if(es.epuOn&&!es.epuW){es.epuW=true;warn(j,es,'epu','EPU RUN',20,false);}if(!es.epuOn)es.epuW=false;
  es.hyA=pA;es.hyB=pB;es.eff=eff;
  // ---- summary values the rest of the game reads
  const mean=es.e.reduce((s,e)=>s+e.h,0)/es.n;
  dm.eng=Math.round(mean*1000)/10;es.lastEng=dm.eng;es.lastHyd=dm.hyd;
  es.thrF=thrSum/es.n;
  // oil/hyd smoke trail on a leaking engine
  for(let i=0;i<es.n;i++){const e=es.e[i];if(e.leak>.004&&Math.random()<dt*14){try{smoke.emit(j.pos.clone().addScaledVector(j.fwd(_f),-3+0).addScaledVector(j.right(_r),es.n>1?(i?1:-1)*1.1:0),j.vel.clone().multiplyScalar(.96),2,.9,4,.5,.5,.5,.3,.4);}catch(x){}}}
  void hOld;void hotMax;}
function reset(j){j.es=null;const f=get(j);if(f&&(!j.onGnd||j.n>.2)){f.hyd.A.p=f.hyd.B.p=f.p.hy.pnom;}return f;}

/* ===================================== WRAPS ===================================== */
{const o=Jet.prototype.dmgTick;Jet.prototype.dmgTick=function(dt){const r=o.call(this,dt);if(ES.on&&this.alive)try{tick(this,dt);}catch(e){if(ES.debug)console.warn('[engsys]',e);}return r;};}
{const o=Jet.prototype.thrK;Jet.prototype.thrK=function(){const es=ES.on&&!this.remote&&this.es;if(!es||es.thrF===undefined)return o.call(this);return(this.hp<60?.75:1)*es.thrF*this.cs.thr;};}
{const o=Jet.prototype.rBias;Jet.prototype.rBias=function(){let b=o.call(this);const es=ES.on&&this.es;if(es&&es.n>1&&es.thrF!==undefined){
  const d=es.e[1].f-es.e[0].f;if(Math.abs(d)>.02)b+=-d*.5*this.ac.roll*cl(this.cas/260,.2,1.2);}return b;};}
{const o=Jet.prototype.ctlE;Jet.prototype.ctlE=function(){const c=o.call(this),es=ES.on&&this.es;if(!es)return c;const a=es.act;if(a.p>=.995&&a.r>=.995&&a.y>=.995)return c;return{p:c.p*a.p,r:c.r*a.r,y:c.y*a.y};};}
{const o=Jet.prototype.flapMove;Jet.prototype.flapMove=function(dt){const h=this.dm?this.dm.hyd:100;return o.call(this,h<60?dt*cl(h/60,.12,1):dt);};}
{const o=Jet.prototype.healAll;Jet.prototype.healAll=function(){o.call(this);this.es=null;const s=get(this);if(s){s.lastEng=this.dm.eng;s.lastHyd=this.dm.hyd;}};}

// ---- damage: new hit locations and the finer sub-systems
{const o=Jet.prototype.hitParts;Jet.prototype.hitParts=function(rel){const w=o.call(this,rel);this._hrel=rel||null;
  const aft=rel&&rel.z>.35?rel.z:0;w.oil=.30+1.6*aft;w.fcs=.40+1.4*aft+(rel&&rel.y>.3?.5:0);return w;};}
{const o=Jet.prototype.hurt;Jet.prototype.hurt=function(part,a){
  if(!ES.on||this.remote)return o.call(this,part,a);const es=get(this);if(!es)return o.call(this,part,a);
  if(part==='eng')return hurtEng(this,es,a);
  if(part==='hyd')return hurtHyd(this,es,a);
  if(part==='oil')return hurtOil(this,es,a);
  if(part==='fcs')return hurtFcs(this,es,a);
  return o.call(this,part,a);};}
function pickEng(j,es){if(es.n<2)return 0;const r=j._hrel;let pl=.5;if(r){pl=cl(.5-r.x*1.4,.1,.9);}return Math.random()<pl?0:1;}
const SUBS=[['comp',.30,'COMPRESSOR DAMAGE'],['turb',.25,'TURBINE DAMAGE'],['fcu',.15,'FUEL CONTROL DAMAGE'],['agb',.15,'GEARBOX DAMAGE'],['case',.15,'CASE BURN-THROUGH']];
function hurtEng(j,es,a){const i=pickEng(j,es),e=es.e[i],before=e.h,dm=j.dm;
  let r=Math.random()*1,sub=SUBS[0];for(const s of SUBS){r-=s[1];if(r<=0){sub=s;break;}}
  e.h=Math.max(0,e.h-a/100*rnd(.8,1.25));
  const k=cl(a/60,0,1)*rnd(.6,1);
  if(sub[0]==='case'){if(a>10){j.ignite(.3+a/200);}e.hot+=2;}else e[sub[0]]=cl(e[sub[0]]+k,0,1);
  if(a>8&&Math.random()<.5){e.leak=Math.min(.03,e.leak+a*.00025);}
  if(a>14&&Math.random()<Math.min(.85,a/45))j.ignite(.25+a/200);
  if(a>8)j.note(eName(es,i)+' '+sub[2]);
  if(e.h<=0&&before>0){j.note('ENGINE FLAMEOUT'+(es.n>1?' · '+eName(es,i):''));if(Math.random()<.6)j.ignite(.5);}
  dm.eng=Math.round(es.e.reduce((s,q)=>s+q.h,0)/es.n*1000)/10;es.lastEng=dm.eng;}
function hurtOil(j,es,a){const i=pickEng(j,es),e=es.e[i];e.leak=Math.min(.03,e.leak+a*.0003*rnd(.7,1.4));
  if(a>6)j.note(eName(es,i)+' OIL LEAK');if(a>25&&Math.random()<.2)j.ignite(.25);}
function hurtHyd(j,es,a){const r=j._hrel;let pa=.5;if(r)pa=cl(.5-r.x*.6-(r.z>.3?.15:0),.15,.85);
  const s=Math.random()<pa?es.hyd.A:es.hyd.B,k=s===es.hyd.A?'A':'B';
  if(a>30&&Math.random()<.35){s.pump=Math.max(0,s.pump-a/80);j.note('HYD '+k+' PUMP DAMAGE');}
  else{s.leak=Math.min(.12,s.leak+a*.0005*rnd(.7,1.5)*(a>45?2.5:1));if(a>8)j.note('HYD '+k+' LEAK');}}
function hurtFcs(j,es,a){const ax=['p','r','y'][(Math.random()*3)|0];es.act[ax]=Math.max(0,es.act[ax]-a/70*rnd(.7,1.2));
  if(a>6)j.note('FLT CONTROL '+({p:'PITCH',r:'ROLL',y:'YAW'}[ax])+' ACTUATOR');}

// ---- missile exhaust ingestion
try{if(typeof fireMissile==='function'){const f0=fireMissile;fireMissile=function(type,sh){try{const q=sh&&get(sh);if(q)q.imp+=q.p.mi*.10*(1-.5*q.p.fc);}catch(e){}return f0.apply(this,arguments);};}}catch(e){if(ES.debug)console.warn('[engsys] fireMissile hook',e);}

/* ===================================== READ-OUTS (cockpits, panels) ===================================== */
const eng=(P,i)=>{const s=get(P);return s?s.e[Math.min(i||0,s.n-1)]:null;};
ES.rpm=(P,i)=>{const e=eng(P,i);return e?e.nE*100:0;};
ES.egt=(P,i)=>{const e=eng(P,i);return e?e.egt:0;};
ES.oilP=(P,i)=>{const e=eng(P,i);return e?e.oilP:0;};
ES.oilT=(P,i)=>{const e=eng(P,i);return e?e.oilT:0;};
ES.oilQ=(P,i)=>{const e=eng(P,i);return e?e.oilQ:0;};
// worst engine (lowest oil pressure) for single-gauge panels
ES.oilWorst=P=>{const s=get(P);if(!s)return 0;let m=1e9;for(const e of s.e)m=Math.min(m,e.oilP);return m;};
ES.oilTWorst=P=>{const s=get(P);if(!s)return 0;let m=0;for(const e of s.e)m=Math.max(m,e.oilT);return m;};
const hk=k=>(k==='B'||k===2)?'B':'A';
ES.hyd=(P,k)=>{const s=get(P);return s?s.hyd[hk(k)].p:0;};
ES.hydN=(P,k)=>{const s=get(P);return s?cl(s.hyd[hk(k)].p/s.p.hy.pnom,0,1.1):0;};
ES.pnom=P=>{const s=get(P);return s?s.p.hy.pnom:3000;};
ES.egtRed=P=>{const s=get(P);return s?s.p.c.egt[3]:750;};
ES.oilNom=P=>{const s=get(P);return s?s.p.c.oilP:45;};
// one entry point for the gauges in game.js: value of kind at engine i, or the old approximation (fb) when this module is off.
// k multiplies the result (psi -> kgf/cm2 on the Soviet panels)
ES.v=(P,kind,i,fb,k)=>{if(!ES.on||!P||P.remote)return fb;const s=get(P);if(!s)return fb;let v;
  switch(kind){case'egt':v=eng(P,i).egt;break;case'oilP':v=eng(P,i).oilP;break;case'oilT':v=eng(P,i).oilT;break;case'hydA':v=s.hyd.A.p;break;case'hydB':v=s.p.hy.n>1?s.hyd.B.p:s.hyd.A.p;break;default:return fb;}
  return k?v*k:v;};
// caution logic shared by the lamps
ES.lamp=(P,k)=>{const s=get(P);if(!s)return false;const c=s.p.c;
  switch(k){
    case'oilL':return s.e[0].nE>.3&&s.e[0].oilP<.35*c.oilP;
    case'oilR':return s.e[s.n-1].nE>.3&&s.e[s.n-1].oilP<.35*c.oilP;
    case'oil':return s.e.some(e=>e.nE>.3&&e.oilP<.35*c.oilP);
    case'hot':return s.e.some(e=>e.egt>c.egt[3]);
    case'oilHot':return s.e.some(e=>e.oilT>c.oilM);
    case'hydA':return s.hyd.A.p<.5*s.p.hy.pnom;
    case'hydB':return s.p.hy.n>1&&s.hyd.B.p<.5*s.p.hy.pnom;
    case'hyd':return s.hyd.A.p<.5*s.p.hy.pnom||(s.p.hy.n>1&&s.hyd.B.p<.5*s.p.hy.pnom);
    case'eng':return s.e.some(e=>e.h<=0||e.seize||e.nE<.3);
    case'stall':return !!P.cs&&P.cs.st>0;
    case'vib':return s.e.some(e=>e.vib>.5);}
  return false;};

/* ===================================== PANEL ===================================== */
let el=null,pageOn=false;
function ensureEl(){if(el)return el;el=document.createElement('div');el.id='esys';el.hidden=true;document.body.appendChild(el);return el;}
const f0=(v)=>Math.round(v),b2=(on,t)=>on?'<b class="r">'+t+'</b>':t;
function render(P){
  const s=get(P),c=s.p.c,L=s.load;let h='<div class="h">ENGINE SYSTEMS · '+s.p.c.n.toUpperCase()+'</div>';
  for(let i=0;i<s.n;i++){const e=s.e[i],nm=s.n>1?(i?'R':'L'):'',flags=[];
    if(e.egt>c.egt[3])flags.push('OVER-TEMP');if(e.oilP<.35*c.oilP&&e.nE>.3)flags.push('OIL P');if(e.oilT>c.oilM)flags.push('OIL T');if(e.vib>.5)flags.push('VIB');
    if(e.seize)flags.push('SEIZED');else if(e.h<=0)flags.push('OUT');if(e.leak>.002)flags.push('OIL LEAK');if(e.comp>.2)flags.push('COMP');if(e.turb>.2)flags.push('TURB');if(e.fcu>.2)flags.push('FCU');if(e.agb>.2)flags.push('GBX');
    h+='<div class="'+(e.egt>c.egt[3]||e.seize?'r':e.h<.6||e.oilP<.35*c.oilP&&e.nE>.3?'a':'')+'">'+nm+' RPM <b>'+f0(e.nE*100)+'</b> EGT <b>'+f0(e.egt)+'</b> OIL <b>'+f0(e.oilP)+'</b>psi <b>'+f0(e.oilT)+'</b>°C Q<b>'+f0(e.oilQ*100)+'</b>% HP <b>'+f0(e.h*100)+'</b>%'+(flags.length?' · '+flags.join(' '):'')+'</div>';}
  const H=s.hyd,pn=s.p.hy.pnom;
  h+='<div class="'+(s.eff<.5?'r':s.eff<.9?'a':'')+'">HYD A <b>'+f0(H.A.p)+'</b>'+(s.p.hy.n>1?' B <b>'+f0(H.B.p)+'</b>':'')+' psi · FLUID '+f0(H.A.q*100)+(s.p.hy.n>1?'/'+f0(H.B.q*100):'')+'% · CTRL <b>'+f0(P.dm.hyd)+'</b>%'+(s.epuOn?' · <b class="a">EPU</b>':'')+'</div>';
  if(L){const m=cl(1-L.r,0,1)*100;
    h+='<div class="'+(L.r>1?'r':L.r>.62?'a':'')+'">STALL MARGIN <b>'+f0(m)+'</b>% · dist '+f0(L.dist/s.p.mg*100)+' trans '+f0(L.trans/s.p.mg*100)+' starve '+f0(L.starve/s.p.mg*100)+' ingest '+f0(L.imp/s.p.mg*100)+'</div>';}
  if(s.act.p<.95||s.act.r<.95||s.act.y<.95)h+='<div class="a">ACTUATORS P '+f0(s.act.p*100)+' R '+f0(s.act.r*100)+' Y '+f0(s.act.y*100)+'%</div>';
  return h;}
// abnormal-only lines appended to the existing damage panel
function abn(P){const s=get(P),c=s.p.c,rows=[];
  s.e.forEach((e,i)=>{const nm=eName(s,i);
    if(e.seize)rows.push([nm+' SEIZED','r b']);
    else if(e.egt>c.egt[3])rows.push([nm+' OVER-TEMP '+f0(e.egt)+'°C','r b']);
    if(e.nE>.3&&e.oilP<.35*c.oilP)rows.push([nm+' OIL PRESS '+f0(e.oilP)+' PSI','r']);
    else if(e.oilT>c.oilM)rows.push([nm+' OIL TEMP '+f0(e.oilT)+'°C','a']);
    if(e.vib>.5)rows.push([nm+' VIBRATION','r']);
    if(e.leak>.002&&e.oilQ<.85)rows.push([nm+' OIL '+f0(e.oilQ*100)+'%','a']);
    if(e.comp>.3||e.turb>.3||e.fcu>.3||e.agb>.3)rows.push([nm+' '+[e.comp>.3?'COMP':'',e.turb>.3?'TURB':'',e.fcu>.3?'FCU':'',e.agb>.3?'GBX':''].filter(Boolean).join(' '),'a']);});
  const hy=s.p.hy;for(const k of hy.n>1?['A','B']:['A']){const q=s.hyd[k],pr=q.p/hy.pnom;if(pr<.85||q.leak>.002)rows.push(['HYD '+k+' '+f0(q.p)+' PSI'+(q.leak>.002?' · LEAK '+f0(q.q*100)+'%':''),pr<.4?'r':'a']);}
  if(s.epuOn)rows.push(['EPU RUN '+f0(s.epu*100)+'%','a']);
  const ac=s.act;if(ac.p<.9||ac.r<.9||ac.y<.9)rows.push(['FLT CTRL '+(ac.p<.9?'P ':'')+(ac.r<.9?'R ':'')+(ac.y<.9?'Y':''),'a']);
  return rows;}
try{if(typeof uiPanels==='function'){const u0=uiPanels;uiPanels=function(P){u0.apply(this,arguments);ES._ui(P);};}}catch(e){if(ES.debug)console.warn('[engsys] uiPanels hook',e);}
ES._ui=function(P){try{
  const d=document.getElementById('dmg');
  if(P&&P.alive&&ES.on&&d&&document.getElementById('menu')&&document.getElementById('menu').hidden){
    const rows=abn(P);
    if(rows.length){const add=rows.map(r=>'<div class="'+r[1]+'">'+r[0]+'</div>').join('');
      if(d.hidden){d.hidden=false;d.innerHTML='<div class="h">DAMAGE</div>'+add;}else d.insertAdjacentHTML('beforeend',add);}}
  const e=ensureEl();
  if(pageOn&&P&&P.alive&&document.getElementById('menu')&&document.getElementById('menu').hidden){e.hidden=false;e.innerHTML=render(P);}else e.hidden=true;
  }catch(x){if(ES.debug)console.warn('[engsys] ui',x);}};
ES.toggle=()=>{pageOn=!pageOn;try{flash(pageOn?'ENGINE PAGE':'',900);}catch(e){}return pageOn;};
// throttle snap: the cockpit lever thrown in one move (this is what produces throttle-transient stalls)
ES.snap=(to)=>{const P=PL();if(!P||!P.alive)return;P.thr=to;try{sfx.click();radio('THROTTLE '+(to>=.99?'SNAP · FULL':to>=.79?'SNAP · MIL':to<=.01?'SNAP · IDLE':'SNAP'));}catch(e){}};
try{if(typeof CTL!=='undefined'&&CTL.map){CTL.map['+KeyG']={fn:()=>ES.toggle()};CTL.map['+KeyR']={fn:()=>ES.snap(.8)};CTL.map['+KeyF']={fn:()=>ES.snap(0)};}}catch(e){}

console.info('[engsys] engine systems / intake-based stalls active');
})();
