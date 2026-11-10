/* =====================================================================================================================
   v239 — engine start-up for every aircraft (Quick Flight ▸ START ▸ COLD & DARK).
   Engine model (player only): battery / external power, fuel master, start source (ground air cart, JFS, APU, AVPIN, electric /
   turbo starter), engine select, starter, light-off, spool to idle, starter cut-out, generator. Each engine is its own state.
     * MANUAL starts (Western: ground air, JFS, APU, AVPIN): crank first, open the throttle (cutoff → IDLE) once rpm reaches the
       light-off value. Opening it early floods the engine: HOT START (EGT over limit) — throttle OFF, wait for the fuel to drain
       (purge, 30 s), try again.
     * AUTOMATIC starts (Soviet / Swedish / French): throttle to IDLE (МГ) first, then press START; the start panel sequences fuel
       and ignition itself. With the throttle in cutoff the engine just motors and runs down.
   F-8E follows NAVAIR 01-45HHD-1 "Starting engine": external power, engine master ON, GTC air, throttle CRANK → IGNITE at 5 % →
   IDLE at 12 %, ignition in ~3 s, idle 40-45 s after IDLE, starter air cuts out at 46-53 %, unplug at 40 %-idle, master generator ON.
   Other jets use their family's procedure (see SPEC); timings are typical, not from each jet's manual.
   Shift+C opens the checklist. Every step also has a bind (Settings ▸ KEY & BUTTON BINDS ▸ START-UP), and the start switches in the
   cockpits (console BATT / GEN / START / IGN / MASTER, the F-15 JFS and engine master switches, etc.) work the same steps.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof Jet==='undefined'){console.warn('[start] core missing');return;}
const PL=()=>typeof player!=='undefined'?player:null;

/* ---------------- per-aircraft start data ---------------- */
// src: AIR ground air cart, JFS, APU, AVPIN, ELEC (electric / turbo starter); auto: start panel sequences fuel; lo light-off %, idle %,
// cut starter cut-out %, tI seconds from light-off to idle
const FAM={
  AIR:{src:'AIR',auto:false,lo:12,idle:65,cut:50,tI:40,srcName:'EXTERNAL AIR (GTC)'},
  JFS:{src:'JFS',auto:false,lo:20,idle:70,cut:55,tI:25,srcName:'JFS'},
  APU:{src:'APU',auto:false,lo:18,idle:68,cut:55,tI:25,srcName:'APU'},
  APUR:{src:'APU',auto:true,lo:16,idle:66,cut:52,tI:22,srcName:'ВСУ (APU)'},
  ELEC:{src:'ELEC',auto:true,lo:14,idle:62,cut:45,tI:30,srcName:'TURBO / ELECTRIC STARTER'},
  AUTO:{src:'ELEC',auto:true,lo:15,idle:64,cut:48,tI:25,srcName:'ONBOARD STARTER'},
  CART:{src:'AVPIN',auto:false,lo:15,idle:62,cut:40,tI:20,srcName:'AVPIN STARTER'}};
const TYPE={'F-8E':{f:'AIR',lo:12,idle:65,cut:50,tI:42,ign:5},'F-4E':'AIR','F-14A':'AIR','F-14B':'AIR','F-14D':'AIR','F-5E':'AIR','F-104S':'AIR','F-106A':'AIR','F-100A':'AIR',
  'A-4E':'AIR','A-7D':'AIR','F-20':'AIR','F-86F':'ELEC','F-111F':'CART',
  'F-16':'JFS','F-16C':'JFS','F-15C':'JFS','F-15E':'JFS','F-18C':'APU','F-18E':'APU','AV-8B':'APU','Tornado GR.4':'APU','Jaguar':'APU','AMX':'APU',
  'Lightning F.6':'CART','Mirage III':'AUTO','Mirage F1':'AUTO','Mirage 2000':'AUTO','Super Etendard':'AIR','Alpha Jet':'AUTO','J 35F':'AUTO','AJS-37':'AUTO',
  'MiG-29':'APUR','MiG-29S':'APUR','MiG-29SMT':'APUR','Su-27':'APUR','Su-27SM':'APUR','Su-33':'APUR','Su-30SM':'APUR','Su-30MK2':'APUR','Su-35S':'APUR','J-11':'APUR',
  'Su-24M':'APUR','MiG-31':'APUR','Yak-141':'APUR','JH-7':'APUR'};
const TWIN=new Set(['F-4E','F-14A','F-14B','F-14D','F-5E','F-15C','F-15E','F-18C','F-18E','F-111F','F-20','Tornado GR.4','Jaguar','Alpha Jet','Lightning F.6',
  'MiG-29','MiG-29S','MiG-29SMT','Su-27','Su-27SM','Su-33','Su-30SM','Su-30MK2','Su-35S','J-11','Su-24M','MiG-25','MiG-31','Su-25','MiG-19','J-8F','JH-7']);
function spec(type){let t=TYPE[type];if(!t)t='ELEC';const o=typeof t==='string'?Object.assign({},FAM[t]):Object.assign({},FAM[t.f],t);
  try{if(typeof STALL!=='undefined'&&STALL[type]&&STALL[type].twin)TWIN.add(type);}catch(e){}o.n=TWIN.has(type)?2:1;return o;}

/* ---------------- state ---------------- */
// P.eng = {sp, batt, ext, air, fm (fuel master), aux:0 off / >0 starting / 1 running, sel, gen, e:[{rpm, egt, fuel (throttle out of cutoff), lit, st (starter), hot, purge, early}]}
function cold(P){const sp=spec(P.type);P.eng={sp,batt:false,ext:false,air:false,fm:false,aux:0,auxT:0,sel:0,gen:false,
  e:Array.from({length:sp.n},()=>({rpm:0,egt:0,fuel:false,lit:false,st:false,hot:false,purge:0,early:0,ign:0}))};
  P.thr=0;P.n=0;P.ab=0;try{radar.power='OFF';}catch(e){}}
const run=e=>e.lit&&e.rpm>=(e._idle||60)-.5;
function allRun(P){return!P.eng||P.eng.e.every(run);}
function powered(P){const E=P.eng;return!E||E.batt||E.ext||(E.gen&&E.e.some(run));}
const START=window.START={cold,spec,allRun,powered,
  say(m){try{radio(m);}catch(e){}},
  batt(){const P=PL();if(!P||!P.eng)return;P.eng.batt=!P.eng.batt;this.say('BATTERY '+(P.eng.batt?'ON':'OFF'));upd();},
  ext(){const P=PL();if(!P||!P.eng)return;const E=P.eng;if(!E.ext&&!P.onGnd){this.say('NO GROUND POWER IN FLIGHT');return;}E.ext=!E.ext;this.say('EXTERNAL POWER '+(E.ext?'CONNECTED':'DISCONNECTED'));upd();},
  fm(){const P=PL();if(!P||!P.eng)return;P.eng.fm=!P.eng.fm;this.say('FUEL MASTER '+(P.eng.fm?'ON':'OFF'));upd();},
  src(){const P=PL();if(!P||!P.eng)return;const E=P.eng,s=E.sp.src;
    if(s==='AIR'){if(!E.air&&!P.onGnd){this.say('NO GROUND AIR IN FLIGHT');return;}E.air=!E.air;this.say('EXTERNAL AIR '+(E.air?'CONNECTED':'REMOVED'));}
    else if(s==='JFS'||s==='APU'){if(E.aux){E.aux=0;this.say(E.sp.srcName+' OFF');}else if(!powered(P)){this.say(E.sp.srcName+' · NO POWER (BATTERY)');}else{E.aux=.01;E.auxT=0;this.say(E.sp.srcName+' START');}}
    else this.starter();upd();},
  sel(){const P=PL();if(!P||!P.eng||P.eng.e.length<2)return;P.eng.sel=1-P.eng.sel;this.say('ENGINE SELECT · '+(P.eng.sel?'RIGHT':'LEFT'));upd();},
  starter(){const P=PL();if(!P||!P.eng)return;const E=P.eng,e=E.e[E.sel],s=E.sp.src;
    if(e.st){e.st=false;this.say('STARTER OFF');upd();return;}
    if(e.purge>0){this.say('PURGE · WAIT '+Math.ceil(e.purge)+' S');return;}
    const ok=s==='AIR'?E.air:(s==='JFS'||s==='APU')?E.aux>=1:powered(P);
    if(!ok){this.say(s==='AIR'?'NO STARTING AIR':(s==='JFS'||s==='APU')?E.sp.srcName+' NOT RUNNING':'NO ELECTRICAL POWER');return;}
    if(!E.fm){this.say('FUEL MASTER OFF');}
    e.st=true;this.say((E.sp.auto?'START · ':'CRANK · ')+(E.e.length>1?(E.sel?'RIGHT':'LEFT')+' ENGINE':'ENGINE'));upd();},
  thr(){const P=PL();if(!P||!P.eng)return;const E=P.eng,e=E.e[E.sel];e.fuel=!e.fuel;this.say('THROTTLE '+(E.e.length>1?(E.sel?'R ':'L '):'')+(e.fuel?'IDLE':'OFF / CUTOFF')+(e.fuel?' · '+Math.round(e.rpm)+'%':''));
    if(e.fuel&&!E.sp.auto&&e.rpm<E.sp.lo*.6&&!e.lit)this.say('CAUTION · RPM BELOW LIGHT-OFF');upd();},
  genOn(){const P=PL();if(!P||!P.eng)return;if(!P.eng.gen){P.eng.gen=true;this.say('GENERATOR ON');upd();}},
  gen(){const P=PL();if(!P||!P.eng)return;P.eng.gen=!P.eng.gen;this.say('GENERATOR '+(P.eng.gen?'ON':'OFF'));upd();},
  // put everything to "running" (for the other start modes and respawns)
  hot(P){P.eng=null;}};

/* ---------------- simulation ---------------- */
function tick(P,dt){const E=P.eng,sp=E.sp;
  if(E.aux>0&&E.aux<1){E.auxT+=dt;E.aux=Math.min(1,E.auxT/(sp.src==='JFS'?8:12));if(E.aux>=1)START.say(sp.srcName+' RUNNING');if(!powered(P)){E.aux=0;START.say(sp.srcName+' · POWER LOST');}}
  if(P.vel.length()>6||P.pos.y-groundAt(P.pos.x,P.pos.z)>20){if(E.ext){E.ext=false;START.say('EXTERNAL POWER PULLED');}if(E.air){E.air=false;START.say('EXTERNAL AIR PULLED');}}
  let anyRun=false;
  E.e.forEach((e,i)=>{e._idle=sp.idle;
    const srcOK=sp.src==='AIR'?E.air:(sp.src==='JFS'||sp.src==='APU')?E.aux>=1:powered(P);
    if(e.st&&!srcOK){e.st=false;START.say('STARTER · SOURCE LOST');}
    const sMax=sp.src==='AVPIN'?sp.cut+8:sp.cut+6;
    if(e.purge>0){e.purge-=dt;if(e.purge<=0){e.hot=false;e.early=0;START.say('PURGE COMPLETE · READY TO RESTART');}}
    // fuel actually reaching the engine: throttle out of cutoff and fuel master on (the automatic panel only opens it with the starter running)
    const fuel=e.fuel&&E.fm&&!e.hot&&e.purge<=0;
    if(e.st)e.rpm+=(sMax-e.rpm)*(sp.src==='AVPIN'?1.6:sp.src==='AIR'?.12:.2)*dt;
    if(!e.lit){
      if(fuel&&e.rpm>=sp.lo*(sp.auto?.8:1)&&(e.st||e.rpm>sp.lo)){e.ign+=dt;if(e.ign>2.5+Math.random()){if(e.early>1.5){e.hot=true;e.egt=1.25;e.fuel=false;e.st=false;e.purge=30;e.early=0;e.ign=0;START.say('HOT START · FUEL POOLED · THROTTLE OFF · PURGE 30 S');try{flash('HOT START',2000);}catch(_){}return;}e.lit=true;e.ign=0;START.say('LIGHT-OFF'+(E.e.length>1?' · '+(i?'R':'L'):'')+' · '+Math.round(e.rpm)+'%');}}
      else e.ign=0;
      // manual start: fuel in with too little airflow pools in the tailpipe
      if(fuel&&!sp.auto&&e.rpm<sp.lo*.6)e.early+=dt;else if(!fuel)e.early=Math.max(0,e.early-dt*.1);
      if(!e.st)e.rpm=Math.max(0,e.rpm-e.rpm*.12*dt-1.5*dt);}
    else{
      if(!fuel){e.lit=false;START.say('ENGINE SHUTDOWN'+(E.e.length>1?' · '+(i?'R':'L'):''));}
      else if(e.rpm<sp.idle){const r=(sp.idle-sp.lo)/sp.tI;e.rpm=Math.min(sp.idle,e.rpm+r*dt*(e.st?1.15:.8));
        if(e.st&&e.rpm>=sp.cut){e.st=false;START.say((sp.src==='AIR'?'STARTER AIR CUT-OUT':'STARTER CUT-OUT')+' · '+Math.round(e.rpm)+'%');}
        if(!e.st&&e.rpm<sp.lo+6){e.lit=false;START.say('HUNG START · THROTTLE OFF');}}
      else if(run(e)&&!e._said){e._said=1;START.say((E.e.length>1?(i?'RIGHT':'LEFT')+' ':'')+'ENGINE AT IDLE');}}
    if(!e.lit)e._said=0;
    const egtT=e.hot?1.25:e.lit?(e.rpm<sp.idle?.75-.25*(e.rpm-sp.lo)/(sp.idle-sp.lo):.45):0;e.egt+=(egtT-e.egt)*Math.min(1,dt*(e.lit?.9:.25));
    if(run(e))anyRun=true;});
  if(!powered(P))try{radar.power='OFF';}catch(e){}
  if(allRun(P)&&E.gen&&!E.ext&&!E.air&&!E.e.some(x=>x.st)&&E.aux<1){START.say('START COMPLETE');P.eng.done=1;}}
// thrust: only running engines give thrust; nothing until at least one is running
{const pr=Jet.prototype,_k=pr.thrK;pr.thrK=function(){const k=_k.call(this);const E=this.eng;if(!E||E.done)return k;
  const n=E.e.filter(run).length/E.e.length;return k*n;}}
{const pr=Jet.prototype,_s=pr.step;pr.step=function(dt){const E=this.eng;
  if(E&&!E.done&&this===PL()){if(!E.e.some(run)){this.thr=0;}tick(this,dt);}
  const r=_s.call(this,dt);
  if(E&&!E.done&&this===PL()){const mx=Math.max(...E.e.map(e=>e.rpm));if(!E.e.some(run))this.n=0;this._startRpm=mx;}
  if(E&&E.done&&this===PL()&&this.eng.done===1){this.eng.done=2;}
  return r;};}

/* ---------------- cold & dark start option ---------------- */
{const seg=document.querySelector('#menu .seg[data-k="sstart"]');
  if(seg&&!seg.querySelector('[data-v="COLD"]')){const b=document.createElement('button');b.dataset.v='COLD';b.setAttribute('aria-pressed','false');b.textContent='COLD & DARK · ENGINES OFF';seg.appendChild(b);}
  try{const o=JSON.parse(localStorage.getItem('viper.opt')||'null');if(o&&o.sstart==='COLD')game.sstart='COLD';}catch(e){}}
{const _ss=soloSetup;soloSetup=function(){const cd=game.sstart==='COLD';if(cd)game.sstart='RWY';let r;try{r=_ss.apply(this,arguments);}finally{if(cd)game.sstart='COLD';}
  const P=PL();if(P){if(cd){cold(P);P.flapCmd=0;START.say('COLD & DARK · Shift+C opens the start checklist');setTimeout(()=>{if(PL()===P&&P.eng)showList(true);},400);}else P.eng=null;}return r;};}
// optSave in game.js only accepts RWY / AIR: remember COLD ourselves
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#menu .seg[data-k="sstart"] button');if(!b)return;setTimeout(()=>{
  try{const o=JSON.parse(localStorage.getItem('viper.opt')||'{}');o.sstart=b.dataset.v;localStorage.setItem('viper.opt',JSON.stringify(o));game.sstart=b.dataset.v;
    b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));}catch(_){}},0);},true);

/* ---------------- checklist ---------------- */
const RU=t=>{try{return RUS.has(t);}catch(e){return false;}};
function steps(P){const E=P.eng,sp=E.sp,ru=RU(P.type),two=E.e.length>1,s=[];const L=(en,r)=>ru&&r?en+' ('+r+')':en;
  const fr=/Mirage|Etendard|Alpha/.test(P.type),sv=/J 35|AJS/.test(P.type);
  s.push([L('BATTERY — ON','АККУМ'),()=>E.batt,'batt']);
  if(sp.src==='AIR'||P.type==='F-8E')s.push(['EXTERNAL POWER — CONNECTED',()=>E.ext||E.done||E.e.every(run),'ext']);
  s.push([L(P.type==='F-8E'?'ENGINE MASTER — ON':ru?'FUEL PUMPS / SHUT-OFF — ON':fr?'BP / CARBURANT — ON':sv?'LT-KRAN — ON':'FUEL MASTER — ON','ПЦН / ПЕРЕКРЫВ'),()=>E.fm,'fm']);
  if(sp.src==='AIR')s.push(['EXTERNAL AIR (GTC) — CONNECTED',()=>E.air||E.e.every(run),'src']);
  if(sp.src==='JFS'||sp.src==='APU')s.push([L(sp.srcName+' — START, wait RUN','ЗАПУСК ВСУ'),()=>E.aux>=1||E.e.every(run),'src']);
  const one=(i)=>{const e=E.e[i],nm=two?(i?'RIGHT ':'LEFT '):'',sel=two?[['ENGINE SELECT — '+(i?'RIGHT':'LEFT'),()=>E.sel===i||run(e),'sel']]:[];
    if(sp.auto)return[...sel,[L(nm+'THROTTLE — IDLE','РУД — МГ'),()=>e.fuel,'thr'],[L(nm+'START — PRESS','ЗАПУСК'),()=>e.st||e.lit,'starter'],[nm+'WAIT FOR IDLE ('+sp.idle+'%)',()=>run(e),null]];
    const crank=P.type==='F-8E'?'THROTTLE — CRANK':sp.src==='JFS'?'JFS START / ENGINE CRANK':'STARTER — ENGAGE';
    return[...sel,[nm+crank,()=>e.st||e.lit,'starter'],[nm+'THROTTLE — IDLE at ≥ '+sp.lo+'% rpm',()=>e.fuel&&e.lit||run(e),'thr'],[nm+'WAIT FOR IDLE ('+sp.idle+'%)'+(sp.src==='AIR'?' · air cuts out '+sp.cut+'%':''),()=>run(e),null]];};
  for(let i=0;i<E.e.length;i++)s.push(...one(i));
  if(sp.src==='AIR')s.push(['EXTERNAL AIR — REMOVED',()=>!E.air&&E.e.every(run),'src']);
  if(sp.src==='JFS'||sp.src==='APU')s.push([L(sp.srcName+' — OFF (auto)','ВСУ ВЫКЛ'),()=>E.aux<1&&E.e.every(run),'src']);
  s.push([L(P.type==='F-8E'?'MASTER GENERATOR — ON':'GENERATORS — ON','ГЕНЕРАТОРЫ'),()=>E.gen,'gen']);
  if(sp.src==='AIR'||P.type==='F-8E')s.push(['EXTERNAL POWER — DISCONNECTED',()=>!E.ext&&E.gen&&E.e.every(run),'ext']);
  return s;}
let box=null,shown=false;
function mk(){if(box)return;box=document.createElement('div');box.id='startList';
  box.style.cssText='position:fixed;right:12px;top:70px;width:330px;max-height:70vh;overflow:auto;background:rgba(6,10,12,.9);border:1px solid #2a3a40;color:#cfe;font:600 11.5px "B612 Mono",monospace;z-index:60;padding:8px;pointer-events:auto';
  document.body.appendChild(box);box.addEventListener('click',e=>{const k=e.target.dataset&&e.target.dataset.a;if(k&&START[k]){START[k]();e.stopPropagation();}});}
function showList(v){mk();shown=v==null?!shown:v;box.style.display=shown?'block':'none';upd();}
function upd(){if(!box||!shown)return;const P=PL();if(!P||!P.eng){box.innerHTML='<b>START-UP</b><br>Engines running. Pick START ▸ COLD & DARK in Quick Flight for a cold start.';return;}
  const E=P.eng,st=steps(P);let h=`<div style="display:flex;justify-content:space-between"><b>START-UP · ${P.type}</b><span style="color:#8a9">${E.sp.srcName}</span></div><div style="color:#8a9;margin:2px 0 6px">Shift+C hides · ${E.sp.auto?'automatic start panel':'manual: watch the rpm before IDLE'}</div>`;
  let first=true;for(const[t,ok,a]of st){const d=ok();const cur=!d&&first;if(cur)first=false;
    h+=`<div style="display:flex;align-items:center;gap:6px;padding:2px 0;${cur?'color:#fff':d?'color:#5c7':'color:#789'}"><span style="width:14px">${d?'✓':cur?'▶':'·'}</span><span style="flex:1">${t}</span>${a?`<button data-a="${a}" style="background:#0b1416;color:#6ef;border:1px solid #2a3a40;font:600 10px monospace;padding:2px 6px;cursor:pointer">DO</button>`:''}</div>`;}
  h+='<div style="margin-top:6px;border-top:1px solid #2a3a40;padding-top:4px">';
  E.e.forEach((e,i)=>{h+=`${E.e.length>1?(i?'R':'L'):'ENG'} ${String(Math.round(e.rpm)).padStart(3)}% · EGT ${String(Math.round(e.egt*800)).padStart(3)}°C · ${e.hot?'<span style="color:#f55">HOT</span>':run(e)?'IDLE':e.lit?'LIT':e.st?'CRANK':'OFF'}${e.purge>0?' · PURGE '+Math.ceil(e.purge):''}<br>`;});
  h+=`PWR ${E.batt?'BATT ':''}${E.ext?'EXT ':''}${E.gen&&E.e.some(run)?'GEN':''}${powered(P)?'':'<span style="color:#f55">NONE</span>'} · ${E.sp.src} ${E.sp.src==='AIR'?(E.air?'ON':'OFF'):(E.sp.src==='JFS'||E.sp.src==='APU')?(E.aux>=1?'RUN':E.aux>0?Math.round(E.aux*100)+'%':'OFF'):''}</div>`;
  box.innerHTML=h;}
setInterval(upd,250);
CTL.map['+KeyC']={fn:()=>showList()};
try{if(window.BINDS)window.BINDS.apply();}catch(e){}
START.list=showList;

/* ---------------- cockpit switches ---------------- */
// Cold War consoles (cwpit): switch names → start steps
if(window.CW_SW){const _fn=CW_SW.fn.bind(CW_SW),_flip=CW_SW.flip.bind(CW_SW),_get=CW_SW.get.bind(CW_SW);
  const map=(w,ti)=>{const W=w.toUpperCase(),T=(ti||'').toUpperCase();
    if(/^(BATT|АККУМ|BATTERY)$/.test(W))return'batt';if(/^(GEN|MSTR GEN|GEN 1|ГЕН|EMER GEN)$/.test(W)&&W!=='EMER GEN')return'gen';
    if(/^(START|ЗАПУСК|DEMAR|START 1|START L|L START|ЗАПУСК Л|左起动|起动)$/.test(W))return'starter';
    if(/^(START 2|START R|R START|ЗАПУСК П|DEMAR D|右起动)$/.test(W))return'starter2';
    if(/^(MASTER)$/.test(W)&&/ENGINE|THROTTLE/.test(T))return'fm';if(/^(FUEL CTL|BOOST|CARBU|LP COCK)$/.test(W))return'fm';return null;};
  CW_SW.fn=function(w,ti){return map(w,ti)?'start:'+map(w,ti):_fn(w,ti);};
  CW_SW.get=function(id,w,ti){const m=map(w,ti),P=PL();if(m&&P&&P.type===id&&P.eng){const E=P.eng;
      return m==='batt'?E.batt:m==='gen'?E.gen:m==='fm'?E.fm:m==='starter'?E.e[0].st||run(E.e[0]):m==='starter2'?(E.e[1]||E.e[0]).st||run(E.e[1]||E.e[0]):false;}
    return _get(id,w,ti);};
  CW_SW.flip=function(id,w,ti){const m=map(w,ti),P=PL();if(m&&P&&P.type===id&&P.eng){
      if(m==='starter2'){if(P.eng.e.length>1)P.eng.sel=1;START.starter();}else if(m==='starter'){if(P.eng.e.length>1&&/START|ЗАПУСК|DEMAR|起动/.test(w)&&!/2|R|П|D|右/.test(w))P.eng.sel=0;START.starter();}else START[m]();
      CW_SW.redraw.forEach(d=>{try{d();}catch(e){}});return;}
    return _flip(id,w,ti);};}
// native cockpits: the named start controls (F-15 JFS / engine masters / generators, MiG / Su start buttons, MAIN PWR)
{const _sel=selectCockpit;selectCockpit=function(kind,pit){const r=_sel.apply(this,arguments);try{const o=ck[kind];for(const c of o&&o.ctls||[]){if(c._st)continue;const n=(c.name||'').toUpperCase();
    let a=/JFS|APU|ВСУ|ГТДЭ/.test(n)?'src':/ENGINE · START|ENGINE START|^START|ЗАПУСК/.test(n)&&!/AIRSTART/.test(n)?'starter':/MAIN PWR|\bBATT|АККУМ/.test(n)?'batt':/GND PWR|GROUND POWER|АЭР/.test(n)?'ext':/\bGEN\b|GENERATOR|ГЕНЕРАТ/.test(n)&&!/TEST|EMERG|WINDSHLD/.test(n)?'genOn':/\b(L|R) MSTR|ENG MASTER|ENGINE MASTER/.test(n)?'fm':null;
    if(!a)continue;c._st=1;c.name=c.name.replace(/\s*\(no effect here\)/g,'');const _a=c.act;c.act=function(d){const P=PL();if(P&&P.eng){if(/\bR (GEN|MSTR)|R ENG/.test(n)&&P.eng.e.length>1&&a!=='gen')P.eng.sel=1;else if(/\bL (GEN|MSTR)|L ENG/.test(n))P.eng.sel=0;START[a]();}return _a&&_a.apply(this,arguments);};}}catch(e){console.warn('[start] ctls',e);}return r;};}

console.info('[start] cold & dark start-up active');
})();
