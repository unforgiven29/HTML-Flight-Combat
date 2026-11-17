/* =====================================================================================================================
   v364 — interceptors, close air support runs and REDFOR ground-controlled intercept in world sorties (spec v49 ch.06
   global air operations, dynamic air mission generation; ch.15 dynamic air-operation AI, air-defence and sensor AI).
   * INTERCEPTORS (both sides): when an enemy flight comes within about 90 km of one of a side's airfields or crosses
     its side of the front, that side scrambles two fighters from its nearest airfield in the region; they fly straight
     at the intruders with a long detection range. At most two scrambles at once per side.
   * CLOSE AIR SUPPORT (both sides): every few minutes a side sends two attack aircraft (strike loadouts from the
     game's campaign tables) against the other side's units in the ground fight below (gfight.js). They run in low,
     aim with the game's own bomb sight (CCIP) and release when the solution falls on the target, up to three passes,
     then go home. Their bombs damage the units they hit like any other bomb. AWACS warns you when the enemy's CAS
     is bombing near you.
   * GCI FOR REDFOR: REDFOR gets the game's ground-controlled-intercept network in world sorties — early-warning radars
     (P-37 / 55Zh6) behind its line and its A-50 when it has airborne early warning. The controller steers REDFOR's
     Russian-built fighters onto the radar picture when their own radar has nothing (it never fires for them). Sites
     stay in place across floating-origin shifts.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WSORTIE)return;
const W=WWAR,G=WGEO,WS=WSORTIE.WS,rn=Math.random,D=Math.PI/180;
const OPS={scr:{0:0,1:0},cas:[],gci:null,t:{cas:90,scr:0}};
const sideLetter=s=>{const me=W.st.c[WS.me].side;return s===0?me:(me==='B'?'R':'B');};
function basesOf(side){const L=[];const letter=sideLetter(side);for(const[a3,B]of W.milBases()){const q=W.st.c[a3];if(!q||q.side!==letter||!W.bell(q))continue;for(const a of B){const p=G.ll2xz(a.lat,a.lon);if(Math.hypot(p.x-player.pos.x,p.z-player.pos.z)<160000)L.push({a3,a,p});}}return L;}
function launch(side,a3,from,role,load){const types=WSORTIE.typesOf(a3,W.st.c[a3].side);if(!types.length)return[];const out=[];
  const SL=t=>typeof STRIKE_LOAD!=='undefined'?(STRIKE_LOAD[t]||(t==='F-16C'?STRIKE_LOAD['F-16']:null)):null;const ag=types.filter(t=>SL(t));const type=role==='CAS'&&ag.length?ag[(rn()*ag.length)|0]:types[(rn()*types.length)|0];
  const p=G.ll2xz(from.lat,from.lon);for(let i=0;i<2;i++){let j;try{const ld=role==='CAS'&&SL(type)?(guidedLoad(type,side)||Object.assign({},SL(type))):(side?foeLoad(type,'modern'):getLoad('modern',type));j=new Jet(side,type,ld,'modern');}catch(e){break;}
    j.spawn(p.x+i*300,groundAt(p.x,p.z)+(role==='CAS'?700:2500),p.z+i*200,0,role==='CAS'?200:260);j.ai=new AI(j);j.ai.skill(side?+SET.skill+(W.learn?W.learn.skillAdj(a3):0):1);j.ai.wi=0;j.ai.engaged=false;
    j._ws=a3;j.callsign=(side?'BANDIT ':'')+(G.byA3.get(a3)?G.byA3.get(a3).a2:a3)+' '+type+(role==='CAS'?' · CAS':' · INTERCEPT');j._role=role;WS.jets.add(j);(side?WS.enemy:WS.friend).push(j);out.push(j);}
  return out;}
/* ------------------------------------------------------------------ interceptors */
function scramble(){for(const side of[0,1]){if(OPS.scr[side]>=2)continue;const foes=[...WS.jets,player].filter(j=>j&&j.alive&&!j.gone&&j.side!==side&&j._role!=='INT');const B=basesOf(side);if(!B.length)continue;
  for(const f of foes){let best=null,bd=90000;for(const b of B){const d=Math.hypot(f.pos.x-b.p.x,f.pos.z-b.p.z);if(d<bd){bd=d;best=b;}}if(!best)continue;
    const fl=launch(side,best.a3,best.a,'INT');if(!fl.length)continue;OPS.scr[side]++;for(const j of fl){j._role='INT';j._tgt=f;j.ai.det=120000;j.ai.route=[{x:f.pos.x,z:f.pos.z,alt:Math.max(4000,f.pos.y)}];j._scr=side;}
    if(typeof radio==='function'&&(typeof SET==='undefined'||SET.calls==='ON'))radio(side?'DARKSTAR: enemy interceptors scrambling from '+best.a.name+'.':'DARKSTAR: friendly interceptors scrambling from '+best.a.name+' against the inbound flight.',side===1);break;}}}
/* ------------------------------------------------------------------ close air support */
function casFlight(force){if(!window.GFIGHT||!GFIGHT.GF.on)return;for(const side of[0,1]){if(OPS.cas.filter(c=>c.side===side&&c.j.some(j=>j.alive)).length)continue;if(!force&&rn()<.5)continue;
  const targets=GFIGHT.GF.units.filter(u=>u.alive&&u.side!==side);if(!targets.length)continue;const B=basesOf(side);if(!B.length)continue;const b=B[(rn()*B.length)|0];
  const fl=launch(side,b.a3,b.a,'CAS');if(!fl.length)continue;const t=targets[(rn()*targets.length)|0];OPS.cas.push({side,j:fl,t,pass:0});
  for(const j of fl){j._role='CAS';const ga=groundAt(t.pos.x,t.pos.z);j.ai.route=[{x:t.pos.x,z:t.pos.z,alt:ga+1200}];j.ai.det=6000;}
  if(side===0&&typeof radio==='function')radio('Close air support: '+fl[0].callsign.split(' · ')[0]+' flight inbound to the '+(GFIGHT.GF.units.find(u=>u.side===0&&u.alive)||{callsign:'friendly'}).callsign.split(',')[0]+' sector.',false);}}
function casTick(dt){for(const c of OPS.cas){if(!c.t||!c.t.alive){const n=GFIGHT.GF.units.filter(u=>u.alive&&u.side!==c.side).sort((a,b)=>a.pos.distanceTo(c.j[0].pos)-b.pos.distanceTo(c.j[0].pos))[0];if(!n)continue;c.t=n;}
  for(const j of c.j){if(!j.alive||j.gone||!j.ai||j._done)continue;const t=c.t,dd=Math.hypot(j.pos.x-t.pos.x,j.pos.z-t.pos.z);const ga=groundAt(t.pos.x,t.pos.z);if(!j.ai.engaged){j.ai.route=[{x:t.pos.x,z:t.pos.z,alt:ga+1100}];j.ai.wi=0;}
    if(dd<14000&&!j._gcd){if(guidedPass(j,t,dd,c)){j._gcd=6;if(c.side===1&&player&&Math.hypot(t.pos.x-player.pos.x,t.pos.z-player.pos.z)<40000&&typeof radio==='function'&&(typeof SET==='undefined'||SET.calls==='ON'))radio('DARKSTAR: enemy CAS releasing guided weapons on friendly positions.',true);if(j._pass>=4){j._done=1;j.ai.route=[{x:j.pos.x+(j.side?1:-1)*60000,z:j.pos.z,alt:3000}];}continue;}}if(j._gcd)j._gcd=Math.max(0,j._gcd-dt);
    if(dd<9000&&typeof GND!=='undefined'&&GND.ccip&&typeof agTypes==='function'){const kind=agTypes(j).find(k=>AGW[k]&&AGW[k].k==='bomb');if(!kind){if(!agTypes(j).length){j._done=1;}continue;}j._cc=(j._cc||0)-dt;if(j._cc>0)continue;j._cc=.25;
      const s=GND.ccip(j,kind),miss=s?Math.hypot(s.p.x-t.pos.x,s.p.z-t.pos.z):1e9;if(miss<200||dd<900){const shots=game.stats.shots;let n=0;while(j.count(kind)>0&&n<2){const p=j.release(kind);if(!p)break;GND.drop(kind,j,p);n++;}game.stats.shots=shots;j._pass=(j._pass||0)+1;
        if(c.side===1&&player&&Math.hypot(t.pos.x-player.pos.x,t.pos.z-player.pos.z)<40000&&typeof radio==='function'&&(typeof SET==='undefined'||SET.calls==='ON'))radio('DARKSTAR: enemy CAS bombing friendly positions, '+String(Math.round(brgTo(player.pos.x,player.pos.z,t.pos.x,t.pos.z))).padStart(3,'0')+' for '+Math.round(cd2(player.pos.x,player.pos.z,t.pos.x,t.pos.z)/NM)+'.',true);
        if(j.count(kind)<=0||j._pass>=3){j._done=1;j.ai.route=[{x:j.pos.x+(j.side?1:-1)*60000,z:j.pos.z,alt:3000}];}else{j.ai.route=[{x:t.pos.x+(rn()-.5)*14000,z:t.pos.z+(rn()-.5)*14000,alt:ga+1500},{x:t.pos.x,z:t.pos.z,alt:ga+1100}];j.ai.wi=0;}}}}}}

/* ------------------------------------------------------------------ guided munitions for CAS (v365) */
// REDFOR equivalents of the game's guided weapons (game data; public type names): laser-guided bomb and TV / laser missiles
if(typeof AGW!=='undefined'){if(!AGW['KAB-500L']&&AGW['GBU-12'])AGW['KAB-500L']=Object.assign({},AGW['GBU-12'],{mass:525,L:3.05,R:.2,soft:60,hard:14,col:0x6f7564,band:0xb03a2a});
  if(!AGW['Kh-29T']&&AGW['AGM-65B'])AGW['Kh-29T']=Object.assign({},AGW['AGM-65B'],{mass:680,L:3.9,R:.19,soft:24,hard:8,dmg:280,range:12000,col:0x8e9684});
  if(!AGW['Kh-25ML']&&AGW['AGM-65E'])AGW['Kh-25ML']=Object.assign({},AGW['AGM-65E'],{mass:300,L:3.7,R:.14,soft:14,hard:4,dmg:160,range:10000,col:0xb0b4a8});
  if(typeof STORE_NAME!=='undefined')Object.assign(STORE_NAME,{'KAB-500L':'KAB-500L laser-guided bomb','Kh-29T':'Kh-29T TV-guided missile','Kh-25ML':'Kh-25ML laser-guided missile'});
  if(typeof SN!=='undefined')Object.assign(SN,{'KAB-500L':'KAB500','Kh-29T':'KH29T','Kh-25ML':'KH25'});}
const RED_T=new Set(['MiG-29','MiG-29S','Su-27','MiG-23','MiG-21','MiG-25','Su-25','Su-25T','Su-25SM3','Su-24','Su-30','Su-30SM','Su-34','Su-35S','Su-57','J-10C','J-16','JF-17','MiG-31']);
function guidedLoad(type,side){const SLx=typeof STRIKE_LOAD!=='undefined'?(STRIKE_LOAD[type]||(type==='F-16C'?STRIKE_LOAD['F-16']:null)):null;if(!SLx)return null;const red=RED_T.has(type)||(side===1&&W.st&&W.st.c[WS.me]&&W.st.c[WS.me].side==='B'&&!/^F-|^A-|Rafale|Typhoon|Gripen|Tornado/.test(type));
  const G=red?['KAB-500L','Kh-29T','Kh-25ML']:['GBU-12','AGM-65D','GBU-38'];const L=Object.assign({},SLx);let i=0;for(const k of Object.keys(L))if(typeof AGW!=='undefined'&&AGW[L[k]]&&AGW[L[k]].k==='bomb'){const g=G[i++%G.length];if(AGW[g])L[k]=g;}return L;}
// laser / GPS bombs dropped by AI: steered onto their target (the player's own laser guidance is untouched)
setInterval(()=>{if(typeof GND==='undefined')return;for(const b of GND.bombs){if(!b._aiT||!b.v)continue;const t=b._aiT;if(!t.pos)continue;const h=b.p.y-groundAt(b.p.x,b.p.z),tgo=Math.max(.5,h/Math.max(-b.v.y,1));
  const vx=(t.pos.x-b.p.x)/tgo,vz=(t.pos.z-b.p.z)/tgo,a=12*.1;b.v.x+=Math.max(-a,Math.min(a,vx-b.v.x));b.v.z+=Math.max(-a,Math.min(a,vz-b.v.z));}},100);
function guidedPass(j,t,dd,c){if(typeof agTypes!=='function'||typeof GND==='undefined')return false;const K=agTypes(j);
  const mav=K.find(k=>AGW[k]&&AGW[k].k==='agm');if(mav&&dd<AGW[mav].range*.8&&dd>1500){const p=j.release(mav);if(p){GND.launchMav(mav,j,p,t);j._pass=(j._pass||0)+1;return true;}}
  const lgb=K.find(k=>AGW[k]&&AGW[k].k==='lgb');if(lgb){const h=j.pos.y-groundAt(j.pos.x,j.pos.z),reach=Math.min(7000,Math.max(1500,j.vel.length()*Math.sqrt(2*Math.max(h,300)/9.81)*1.1));
    if(dd<reach){const p=j.release(lgb);if(p){GND.drop(lgb,j,p);const b=GND.bombs[GND.bombs.length-1];if(b)b._aiT=t;j._pass=(j._pass||0)+1;return true;}}}
  return false;}
/* ------------------------------------------------------------------ REDFOR GCI */
function gciUp(){if(typeof GCI==='undefined'||typeof GCI_TY==='undefined'||!WS.front)return;const me=W.st.c[WS.me].side,red=me==='R'?0:1,n=WS.front;const sg=(n.enemyIsB?1:-1)*(red===1?1:-1);
  const behind=km=>{const q=n.p;const lat=q.lat+n.s.ny*sg*km/111.2,lon=q.lon+n.s.nx*sg*km/(111.2*Math.cos(q.lat*D));return G.ll2xz(lat,lon);};
  const redA3=Object.values(W.st.c).filter(p=>p.side==='R'&&W.bell(p));const aew=redA3.some(p=>W.st.mil&&W.st.mil[p.a3]&&W.st.mil[p.a3].aew>0);
  const A=[{k:'ewr',ty:'P-37',side:red,...xz(behind(60))},{k:'ewr',ty:'55Zh6',side:red,...xz(behind(110))}];if(aew){const q=behind(170);A.push({k:'awacs',side:red,x:q.x,z:q.z,hdg:90});}
  const bull=behind(0);const enemies=[...WS.jets].filter(j=>j.side===red);try{GCI.setup({bull:{x:bull.x,z:bull.z},gci:{on:true,assets:A}},enemies);}catch(e){console.warn('[gci]',e);return;}
  OPS.gci={red,ll:GCI.sites.map(s=>G.xz2ll(s.pos.x,s.pos.z)),bull:G.xz2ll(bull.x,bull.z)};}
const xz=p=>({x:p.x,z:p.z});
function gciTick(){if(!OPS.gci||typeof GCI==='undefined'||!GCI.run)return;for(const j of WS.jets){if(!j.alive||j.side!==OPS.gci.red||!j.ai||j.ai.gciOn||typeof RUS==='undefined'||!RUS.has(j.type))continue;j.ai.gciOn=true;j.ai.kn=new Map();}}
if(window.WF){const _r=WF.rebase;WF.rebase=async function(){const on=OPS.gci&&typeof GCI!=='undefined'&&GCI.run;const r=await _r.apply(this,arguments);
  if(on){GCI.sites.forEach((s,i)=>{const ll=OPS.gci.ll[i];if(!ll||s.jet)return;const q=G.ll2xz(ll.lat,ll.lon);s.pos.x=q.x;s.pos.z=q.z;if(s.mesh){s.mesh.position.x=q.x;s.mesh.position.z=q.z;}});const b=G.ll2xz(OPS.gci.bull.lat,OPS.gci.bull.lon);if(GCI.bull){GCI.bull.x=b.x;GCI.bull.z=b.z;}}return r;};}
/* ------------------------------------------------------------------ hooks */
{const _s=WSORTIE.start;WSORTIE.start=async function(){const r=await _s.apply(this,arguments);if(WS.on){OPS.scr={0:0,1:0};OPS.cas=[];OPS.t={cas:120,scr:10};try{gciUp();}catch(e){console.warn('[airops]',e);}}return r;};}
{const _f=WSORTIE.finish;WSORTIE.finish=function(){const r=_f.apply(this,arguments);OPS.cas=[];OPS.gci=null;if(typeof GCI!=='undefined')try{GCI.clear();}catch(e){}return r;};}
setInterval(()=>{if(!WS.on||typeof game==='undefined'||!game.active||!player||WS.client)return;const dt=1;OPS.t.scr-=dt;OPS.t.cas-=dt;
  for(const s of[0,1])OPS.scr[s]=[...WS.jets].filter(j=>j._role==='INT'&&j._scr===s&&j.alive&&!j.gone).length?OPS.scr[s]:0;
  if(OPS.t.scr<=0){OPS.t.scr=20;try{scramble();}catch(e){console.warn('[airops]',e);}}if(OPS.t.cas<=0){OPS.t.cas=180+rn()*180;try{casFlight();}catch(e){console.warn('[airops]',e);}}
  try{casTick(dt);gciTick();}catch(e){console.warn('[airops]',e);}},1000);
W.airops={OPS,scramble,casFlight,casTick,gciUp,basesOf,guidedLoad,guidedPass};
})();
