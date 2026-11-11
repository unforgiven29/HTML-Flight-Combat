/* ============================================================================
   structure.js — airframe loads, G-overstress, wing failure and leading-edge slats
   Loaded after engsys.js.  Classic script: wraps Jet.prototype methods like realism.js / engsys.js.

   G / STRUCTURE
   - Limit load LL = the rated G for the current weight / stores / Mach, derated by wing + tail damage and by permanent
     deformation.  Ultimate load UL = LL × ur (1.5 by design rule, or the type's gUlt/gLim) × a per-airframe strength factor.
   - Jets WITHOUT a hard fly-by-wire limiter (everything with fbw:false except the MiG-29 family, whose limiter is soft)
     get the rated-G cap lifted for the player: full back stick commands PULL × the rated G, so at speed the aerodynamics
     can give more G than the structure holds.  FBW jets keep their limiter; AI pilots never get the extra authority.
   - Above LL (+4 %) the airframe takes permanent deformation (def 0–1): wing health falls, fuel weeps, LL itself drops.
     Above UL for ~0.1 s a wing folds: the wing tears off (visible, with debris), the jet rolls, the second wing follows
     soon after if the load persists.  Combat damage that takes a wing to 0 % separates it the same way.
   SLATS
   - kind 'auto' = aerodynamically driven (no hydraulics), 'sched' = hydraulic / FCS scheduled leading-edge slats or flaps.
     Each side has its own position.  The base lift table is "slats working"; a slat that lags, is switched to RETRACT,
     is frozen by hydraulic loss or jams (wing damage, overspeed) costs lift near the stall, lowers the departure AoA,
     and an L/R difference rolls the jet at high alpha.  EXTEND mode costs drag.
   Per-type numbers below are approximations — tune them in the tables.
   ============================================================================ */
(function(){'use strict';
if(typeof Jet==='undefined'||typeof AC==='undefined'){console.warn('[structure] Jet/AC missing');return;}
const SX=window.STRUCT={pull:1.3,tear:.35,debug:false};   // pull: stick authority above rated G (stays under the 1.5x ultimate, so one hard pull overstresses but does not instantly fold a wing); tear: seconds above ultimate before a wing goes
Object.defineProperty(SX,'on',{get(){try{return SET.struct!=='OFF';}catch(e){return true;}},set(v){try{SET.struct=v?'REAL':'OFF';}catch(e){}}});
const sm=x=>{x=x<0?0:x>1?1:x;return x*x*(3-2*x);};
const PL=()=>{try{return player;}catch(e){return null;}};
const f0=v=>Math.round(v);

/* ---------- per-type data ---------- */
const SOFT=new Set(['MiG-29','MiG-29S','MiG-29SMT']);                 // mechanical jets with a soft G limiter: keep the old behaviour
const HEAVY=new Set(['Cargo','E-3A','A-50','B-52H','Tu-95MS']);         // not a fighter airframe: no stick-authority lift
const SLK={auto:['A-4E','Alpha Jet','Super Etendard','Su-25','Su-22M4'],
  sched:['F-4E','F-14A','F-14B','F-14D','F-16','F-16C','F-18C','F-18E','Su-27','Su-27SM','Su-33','Su-30SM','Su-30MK2','Su-35S','J-11',
    'MiG-29','MiG-29S','MiG-29SMT','MiG-23','MiG-27K','Su-24M','F-111F','F-5E','F-20','F-104S','F-8E','A-7D','Mirage F1','Mirage 2000','Tornado GR.4','AMX',
    'F-15EX','F-18F','EA-18G','F-22','F-35A','F-2A','EF-2000','Rafale','Mirage 2000-5','JAS-39C','JAS-39E','KF-21','MiG-35','Su-30MKI','Su-30MKM','Su-34','Su-57','J-10C','J-16','J-15T','J-20','JF-17','Yak-130',
    'F-104G','F-15I','F-16E','F-16I','F-16V','F-4B','F-4J','F-5A','F-CK-1','FA-50','J-11B','J-35','MiG-29K','Mirage 2000D','Tejas Mk1A','Tornado ECR','Tornado F.3']};
const SLT={};for(const k in SLK)for(const t of SLK[k])SLT[t]=k;
const MODES=['AUTO','RETRACT','EXTEND'];

/* ---------- per-jet state ---------- */
function get(j){let s=j.st;if(s)return s;if(j.remote||!j.ac)return null;const ac=j.ac,kind=SLT[j.type]||null,fbw=!!ac.fbw;
  s=j.st={def:0,peak:1,over:0,fail:0,str:.97+Math.random()*.1,ur:Math.min(1.6,Math.max(1.3,ac.gUlt?ac.gUlt/ac.gLim:1.5)),b:(Math.random()<.5?-1:1)*(.3+Math.random()*.7),
    off:{L:0,R:0},second:null,killT:null,tumble:0,r:0,LL:ac.gLim,UL:ac.gLim*1.5,cue:0,
    sl:{kind,mode:0,L:0,R:0,jam:{L:null,R:null},req:0,fast:fbw,frozen:false},
    dq:0,xs:0,pl:{L:null,R:null},clipped:false,x0:2,brk:false,_o:null,_k:'',_v:null};
  return s;}
const breakable=(j)=>j===PL()&&!j.ac.fbw&&!SOFT.has(j.type)&&!HEAVY.has(j.type)&&j.ac.gLim>=4;

/* ---------- slats ---------- */
function slatReq(j,st){const ac=j.acx||j.ac,S=st.sl;if(!S.kind)return 0;const dpa=(ac.dep&&ac.dep.a)||26,ad=(j.alpha||0)*57.2958,on=.30*dpa,fu=.62*dpa;
  let r=sm((ad-on)/(fu-on));const M=j.mach||0;if(M>.9)r*=1-sm((M-.9)/.25);
  if(S.kind==='sched'&&(j.gearPos>.5||(j.flapPos||0)>.4))r=Math.max(r,.9);return r;}
function slatTick(j,st,dt){const S=st.sl;if(!S.kind){st.dq=0;st.xs=0;return;}
  const req=slatReq(j,st);S.req=req;const hyd=S.kind==='auto'?1:clamp(j.dm.hyd/100,0,1);S.frozen=S.kind==='sched'&&hyd<.3;
  const rate=(S.kind==='auto'?3.5:S.fast?1.7:.9)*(S.kind==='auto'?1:.35+.65*hyd);
  const tgt=S.mode===1?0:S.mode===2?1:req;
  for(const sd of['L','R']){const hp=(sd==='L'?j.dm.wl:j.dm.wr)/100;
    if(st.off[sd]){S[sd]=0;continue;}
    if(S.jam[sd]===null&&!S.frozen){// jams: heavily damaged wing, or slats driven out at high airspeed
      let pj=0;if(hp<.5)pj+=.05*(1-hp/.5);if(S[sd]>.5&&(j.cas||0)>420)pj+=.5;
      if(pj>0&&Math.abs(tgt-S[sd])>.02&&Math.random()<pj*dt){S.jam[sd]=S[sd];if(j===PL())try{radio('SLAT '+sd+' JAM',true);}catch(e){}}}
    if(S.jam[sd]!==null){S[sd]=S.jam[sd];continue;}
    if(S.frozen)continue;
    S[sd]+=clamp(tgt-S[sd],-rate*dt,rate*dt);}
  const avg=(S.L+S.R)/2;st.dq=Math.round(clamp(req-avg,0,1)*10);st.xs=Math.round(clamp(avg-req,0,1)*10);}
SX.slatMode=(v,silent)=>{const j=PL();if(!j||!j.alive)return;const s=get(j);if(!s)return;
  if(!s.sl.kind){if(!silent)try{radio('NO LEADING-EDGE SLATS ON THIS AIRCRAFT');}catch(e){}return;}
  s.sl.mode=v===undefined?(s.sl.mode+1)%3:v|0;try{sfx.click();if(!silent)radio('SLATS · '+MODES[s.sl.mode]);}catch(e){}};
SX.slatOut=(P,fb)=>{const s=P&&P.st;if(!s||!s.sl.kind)return fb;return (s.sl.L+s.sl.R)/2>.35;};
SX.slatPos=(P)=>{const s=P&&P.st;return s&&s.sl.kind?(s.sl.L+s.sl.R)/2:null;};

/* ---------- flight-model hooks ---------- */
{const f1=Jet.prototype.fx0;Jet.prototype.fx0=function(base){const o=f1.call(this,base);const st=this.st;if(!st||!o||!o.clt)return o;
  const brk=st.brk?1:0,off=st.off.L+st.off.R,dq=st.dq,xs=st.xs;if(!brk&&!off&&!dq&&!xs)return o;
  const key=brk+'|'+off+'|'+dq+'|'+xs;if(st._o===o&&st._k===key)return st._v;
  const v=Object.create(o);
  if(brk){v.gLim=o.gLim*SX.pull;if(o.gHi)v.gHi=o.gHi*SX.pull;}
  if(dq){const d=dq/10;v.clt=o.clt.map(([a,c])=>[a,c>0?c*(1-.2*d*sm((a-6)/12)):c]);if(o.dep)v.dep=Object.assign({},o.dep,{a:o.dep.a-5*d});}
  if(xs)v.cd0=o.cd0+.007*xs/10;
  if(off){v.S=o.S*(off===1?.62:.12);v.roll=o.roll*(off===1?.5:.2);}
  st._o=o;st._k=key;st._v=v;return v;};}
{const sg=Jet.prototype.storeG;Jet.prototype.storeG=function(){const g=sg.call(this);const st=this.st;return st&&st.brk?g*SX.pull:g;};}
{const rb=Jet.prototype.rBias;Jet.prototype.rBias=function(){let b=rb.call(this);const st=this.st;if(!st)return b;const ac=this.acx||this.ac,S=st.sl;
  if(S.kind&&!st.off.L&&!st.off.R&&Math.abs(S.L-S.R)>.04){const ad=(this.alpha||0)*57.2958;b+=(S.L-S.R)*.32*ac.roll*sm((ad-5)/10)*clamp((this.cas||0)/260,.3,1.2);}
  if(st.off.L&&st.off.R)b+=st.tumble*2.4*ac.roll*clamp((this.cas||0)/260,.4,1.2);return b;};}
{const hl=Jet.prototype.healAll;Jet.prototype.healAll=function(){hl.call(this);const s=this.st;if(!s)return;unclip(this);s.def=0;s.fail=0;s.off.L=s.off.R=0;s.second=null;s.killT=null;s.over=0;s.peak=1;s.sl.jam.L=s.sl.jam.R=null;s._o=null;};}

/* ---------- wing separation: clipped mesh + tumbling debris ---------- */
const _m=new THREE.Matrix4(),_one=new THREE.Vector3(1,1,1),_q=new THREE.Quaternion(),_ax=new THREE.Vector3();
const deb=[];let lastStamp=0;
try{renderer.localClippingEnabled=true;}catch(e){}
function prepClip(root,planes){root.traverse(o=>{if(!o.material||o.isSprite)return;const c=m=>{const n=m.clone();n.clippingPlanes=planes;n.clipShadows=true;n.needsUpdate=true;return n;};
  o.material=Array.isArray(o.material)?o.material.map(c):c(o.material);});}
function unclip(j){const s=j.st;if(!s||!s.clipped)return;j.mesh.traverse(o=>{if(!o.material)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.clippingPlanes=null;m.needsUpdate=true;});});s.clipped=false;s.pl.L=s.pl.R=null;}
function halfSpan(j){const m=j.mesh,p=m.position.clone(),q=m.quaternion.clone();m.position.set(0,0,0);m.quaternion.identity();m.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(m);m.position.copy(p);m.quaternion.copy(q);m.updateMatrixWorld(true);return Math.max(Math.abs(b.min.x),Math.abs(b.max.x),3);}
function setPlane(pl,side,x0,keepOuter,j){// keepOuter=true: debris (keep beyond the root); false: original (remove beyond the root)
  const sgn=side==='R'?1:-1,n=keepOuter?sgn:-sgn;pl.normal.set(n,0,0);pl.constant=keepOuter?-x0:x0;
  _m.compose(j.mesh.position,j.mesh.quaternion,j.mesh.scale);pl.applyMatrix4(_m);}
function sever(j,side){const st=get(j);if(!st||st.off[side])return;st.off[side]=1;const sgn=side==='R'?1:-1,key=side==='R'?'wr':'wl';j.dm[key]=0;
  st.tumble=st.tumble||sgn;
  try{ // the stores hanging on that wing go with it
    for(const k of Object.keys(j.load||{})){const p=j.ac.st&&j.ac.st[k];if(p&&p[0]*sgn>.4){delete j.load[k];if(j.stMesh&&j.stMesh[k]){j.mesh.remove(j.stMesh[k]);delete j.stMesh[k];}}}
  }catch(e){}
  try{ // visual: clip the wing off the airframe and throw a clipped copy away
    if(!st.clipped){st.x0=Math.min(3.4,Math.max(1.4,.3*halfSpan(j)));st.pl.L=new THREE.Plane();st.pl.R=new THREE.Plane();
      const arr=[st.pl.L,st.pl.R];st.pl.L.constant=st.pl.R.constant=1e9;prepClip(j.mesh,arr);st.clipped=true;}
    setPlane(st.pl[side],side,st.x0,false,j);
    const d=j.mesh.clone(true);const dp=new THREE.Plane();setPlane(dp,side,st.x0,true,j);prepClip(d,[dp]);
    const rt=j.right(new THREE.Vector3());d.position.copy(j.pos);d.quaternion.copy(j.q);scene.add(d);
    deb.push({m:d,pl:dp,side,x0:st.x0,pos:j.pos.clone(),vel:j.vel.clone().addScaledVector(rt,sgn*(5+Math.random()*7)).add(new THREE.Vector3(0,Math.random()*5,0)),
      ax:new THREE.Vector3(Math.random()-.5,Math.random()-.5,sgn*(.6+Math.random())).normalize(),w:3+Math.random()*4,t:0,jet:j});
  }catch(e){if(SX.debug)console.warn('[structure] sever',e);}
  try{sfx.bang(j===PL()?1:.5);explode(j.pos.clone().addScaledVector(j.right(new THREE.Vector3()),sgn*2),false);}catch(e){}
  j.leak=Math.max(j.leak||0,.9);try{j.ignite(.5);}catch(e){}
  try{if(j===PL()){j.shake=Math.max(j.shake||0,2);radio((side==='R'?'RIGHT':'LEFT')+' WING FAILURE',true);}else if(j.ai&&j.ai.friend&&j.callsign)radio(j.callsign+', I\'ve lost a wing!',true);}catch(e){}
  if(j!==PL()&&st.killT===null)st.killT=3+Math.random()*3;}
function debStep(dt){for(let i=deb.length-1;i>=0;i--){const d=deb[i];d.t+=dt;d.vel.y-=9.81*dt;d.vel.multiplyScalar(1-.08*dt);d.pos.addScaledVector(d.vel,dt);
    _q.setFromAxisAngle(d.ax,d.w*dt);d.m.quaternion.premultiply(_q);d.m.position.copy(d.pos);
    // the clip plane follows the debris, fixed in its own frame
    const sgn=d.side==='R'?1:-1;d.pl.normal.set(sgn,0,0);d.pl.constant=-d.x0;_m.compose(d.m.position,d.m.quaternion,d.m.scale);d.pl.applyMatrix4(_m);
    if(Math.random()<dt*14){try{smoke.emit(d.pos,null,3,3,10,.2,.2,.2,.5,.3);if(Math.random()<.5)glow.emit(d.pos,null,.4,4,8,1,.5,.1,.8);}catch(e){}}
    let gone=d.t>45;try{if(d.pos.y<groundAt(d.pos.x,d.pos.z)+.5){explode(d.pos,false);gone=true;}}catch(e){}
    if(gone){scene.remove(d.m);d.m.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose&&m.dispose());});deb.splice(i,1);}}}
{const st0=Jet.prototype.step;Jet.prototype.step=function(dt){const r=st0.call(this,dt);
  try{const now=performance.now();if(now-lastStamp>3){lastStamp=now;if(deb.length&&!game.paused)debStep(dt);}
    const st=this.st;if(st&&(st.off.L||st.off.R)&&st.clipped){if(st.off.L)setPlane(st.pl.L,'L',st.x0,false,this);if(st.off.R)setPlane(st.pl.R,'R',st.x0,false,this);}}catch(e){}
  return r;};}

/* ---------- per-step structure tick ---------- */
function tick(j,dt){const st=get(j);if(!st||!j.alive||j.remote)return;const ac=j.acx||j.ac,dm=j.dm,M=j.mach||0;
  st.brk=SX.on&&breakable(j);
  slatTick(j,st,dt);
  if(!SX.on)return;
  // loads
  const gBase=ac.gHi&&M>.85?ac.gLim+(ac.gHi-ac.gLim)*clamp((M-.85)/.1,0,1):ac.gLim;
  const wm=Math.min(dm.wl,dm.wr)/100,tl=dm.tail/100;
  const LL=Math.max(1.5,Math.min(gBase,j.gAllow||gBase)*(.5+.5*wm)*(.6+.4*tl)*(1-.25*st.def));
  const ult=st.ur*st.str*(1-.3*st.def),nz=j.nz||1,r=nz>=0?nz/LL:-nz/Math.max(1.5,.42*LL);
  st.LL=LL;st.UL=LL*ult;st.r=r;if(nz>st.peak)st.peak=nz;
  // permanent deformation
  const ex=r-1.04;
  if(ex>0){if(!st.inOver){st.inOver=1;st.over++;}st.def=Math.min(1,st.def+.55*Math.pow(ex,1.4)*dt);if(j===PL())j.shake=Math.max(j.shake||0,Math.min(1.4,.25+ex*2));}
  else if(r<1)st.inOver=0;
  if(st.def>0){const d=60*st.def;dm.wl=Math.min(dm.wl,Math.max(1,100-d*(1+.25*st.b)));dm.wr=Math.min(dm.wr,Math.max(1,100-d*(1-.25*st.b)));
    if(st.def>.45&&(j.leak||0)<.2)j.leak=.2;
    if(j===PL()){const c=st.def>.6?3:st.def>.3?2:st.def>.04?1:0;if(c>st.cue){st.cue=c;try{radio(['','AIRFRAME OVERSTRESS · REDUCE G','WING SKIN WRINKLING · NO MORE G','WING STRUCTURE CRACKING · EJECT IF IT BREAKS'][c],true);}catch(e){}}}}
  // failure
  if(r>ult&&!(st.off.L&&st.off.R)){st.fail+=dt;if(st.fail>SX.tear){const side=dm.wl<dm.wr?'L':dm.wr<dm.wl?'R':Math.random()<.5?'L':'R';
      if(!st.off[side])sever(j,side);else sever(j,side==='L'?'R':'L');
      if(!(st.off.L&&st.off.R)&&st.second===null)st.second=.25+Math.random()*.9;st.fail=0;}}
  else st.fail=Math.max(0,st.fail-dt*2);
  if(st.second!==null){st.second-=dt;if(st.second<=0){st.second=null;if(!(st.off.L&&st.off.R)&&Math.random()<.75)sever(j,st.off.L?'R':'L');}}
  // combat damage that takes a wing to zero separates it too
  if(dm.wl<=0&&!st.off.L)sever(j,'L');if(dm.wr<=0&&!st.off.R)sever(j,'R');
  if(st.killT!==null){st.killT-=dt;if(st.killT<=0){st.killT=null;try{j.kill('WING FAILURE');}catch(e){}}}
}
{const ex=Jet.prototype.exFx;Jet.prototype.exFx=function(dt){ex.call(this,dt);try{if(this.alive)tick(this,dt);}catch(e){if(SX.debug)console.warn('[structure] tick',e);}};}

/* ---------- panels ---------- */
let el=null,pageOn=false;
function ensureEl(){if(el)return el;el=document.createElement('div');el.id='strp';el.hidden=true;document.body.appendChild(el);return el;}
function bar(v,n){n=n||20;const k=Math.max(0,Math.min(n,Math.round(v*n)));return'█'.repeat(k)+'░'.repeat(n-k);}
function render(P){const s=P.st,S=s.sl;let h='<div class="h">AIRFRAME · '+(P.ac.name||P.type).toUpperCase()+'</div>';
  const mode=!SX.on?'OFF (classic limiter)':P.ac.fbw?'FBW LIMITER':SOFT.has(P.type)?'SOFT LIMITER':P===PL()&&s.brk?'NO LIMITER · stick = G':'NO LIMITER';
  h+='<div>G LIMITER <b>'+mode+'</b></div>';
  h+='<div class="'+(s.r>s.UL/s.LL?'r':s.r>1?'a':'')+'">G <b>'+(P.nz||1).toFixed(1)+'</b> · LIMIT <b>'+s.LL.toFixed(1)+'</b> · ULT <b>'+s.UL.toFixed(1)+'</b> · PEAK <b>'+s.peak.toFixed(1)+'</b></div>';
  h+='<div class="'+(s.r>s.UL/s.LL?'r':s.r>1?'a':'')+'">LOAD '+bar(Math.min(1.2,s.r/(s.UL/s.LL)),24)+' '+f0(s.r/(s.UL/s.LL)*100)+'% of ultimate</div>';
  h+='<div class="'+(s.def>.3?'r':s.def>.02?'a':'')+'">OVERSTRESS EVENTS <b>'+s.over+'</b> · DEFORMATION <b>'+f0(s.def*100)+'</b>% · WINGS <b>'+(s.off.L?'L OFF ':'L ok ')+(s.off.R?'R OFF':'R ok')+'</b></div>';
  if(S.kind){const hy=S.kind==='auto'?'aerodynamic':'hydraulic';
    h+='<div class="'+(S.jam.L!==null||S.jam.R!==null||S.frozen?'r':S.mode?'a':'')+'">SLATS ('+hy+') <b>'+MODES[S.mode]+'</b> · L <b>'+f0(S.L*100)+'</b> R <b>'+f0(S.R*100)+'</b>% · REQ <b>'+f0(S.req*100)+'</b>%'+(S.jam.L!==null?' · L JAM':'')+(S.jam.R!==null?' · R JAM':'')+(S.frozen?' · FROZEN (HYD)':'')+'</div>';}
  else h+='<div>SLATS <b>none</b> (fixed leading edge)</div>';
  h+='<div>FLAPS <b>'+f0((P.flapPos||0)*100)+'</b>% · AoA <b>'+((P.alpha||0)*57.2958).toFixed(1)+'</b>° · '+(P.cas||0).toFixed(0)+' kt</div>';return h;}
function rows(P){const s=P.st,S=s.sl,r=[];if(!s)return r;
  if(SX.on){if(s.r>1.25)r.push(['OVER-G · RELAX THE PULL','r b']);else if(s.r>.92)r.push(['G '+(P.nz||1).toFixed(1)+' · LIMIT '+s.LL.toFixed(1),s.r>1?'a b':'a']);
    if(s.def>.02)r.push(['OVERSTRESSED '+f0(s.def*100)+'% · LIMIT '+s.LL.toFixed(1)+' G',s.def>.3?'r':'a']);}
  if(S.kind){if(S.jam.L!==null||S.jam.R!==null)r.push(['SLATS '+(S.jam.L!==null?'L ':'')+(S.jam.R!==null?'R ':'')+'JAMMED','r']);else if(S.frozen)r.push(['SLATS FROZEN · HYD','a']);if(S.mode)r.push(['SLATS '+MODES[S.mode],'a']);}
  return r;}
try{if(typeof uiPanels==='function'){const u0=uiPanels;uiPanels=function(P){u0.apply(this,arguments);SX._ui(P);};}}catch(e){}
SX._ui=function(P){try{const d=document.getElementById('dmg'),menu=document.getElementById('menu');
  if(P&&P.alive&&P.st&&d&&menu&&menu.hidden){const rw=rows(P);if(rw.length){const add=rw.map(x=>'<div class="'+x[1]+'">'+x[0]+'</div>').join('');if(d.hidden){d.hidden=false;d.innerHTML='<div class="h">DAMAGE</div>'+add;}else d.insertAdjacentHTML('beforeend',add);}}
  const e=ensureEl();if(pageOn&&P&&P.alive&&P.st&&menu&&menu.hidden){e.hidden=false;e.innerHTML=render(P);}else e.hidden=true;}catch(x){if(SX.debug)console.warn('[structure] ui',x);}};
SX.toggle=()=>{pageOn=!pageOn;return pageOn;};
SX.state=(j)=>{j=j||PL();return j&&j.st;};
SX._debris=deb;SX._sever=sever;SX._tick=tick;
try{if(typeof CTL!=='undefined'&&CTL.map){CTL.map['+KeyH']={fn:()=>SX.toggle()};CTL.map['+KeyL']={fn:()=>SX.slatMode()};}}catch(e){}
console.info('[structure] G-overstress / slats / wing failure active');
})();
