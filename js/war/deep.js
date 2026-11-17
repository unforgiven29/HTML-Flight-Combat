/* =====================================================================================================================
   v350 — less simplified: support aircraft you can see and use, the planning room, a depot network, and lives
   (spec v49 ch.06 support aviation as persistent entities, tanker operations, global air operations and package
   construction; ch.06 / ch.10 logistics as a network with capacity, bottlenecks and priorities; ch.08 individuals,
   families and households).
   SUPPORT AIRCRAFT IN THE AIR (world sorties): when your side has tankers (military.js), a KC-135R flies a racetrack
   about 120 km behind the front — the same tanker as the air-refuelling mode (boom and drogues, Shift+H). When your
   side has airborne early warning, an E-3A or A-50 orbits behind the line; the enemy's early-warning aircraft orbits
   behind theirs and is a target (losing it costs that country one AEW aircraft). Floating-origin safe.
   THE PLANNING ROOM (DEBRIEF tab): choose the next sortie's mission (CAP, CAS, SEAD, STRIKE, ESCORT), its target from
   the war's places (front sectors, enemy airfields, depots), and up to two escort flights of your country's fighters
   that take off with you. A STRIKE places the target's depot buildings and vehicles; the briefing states the package.
   DEPOT NETWORK: each country at war has depots — its capital and the largest cities toward each front — with stocks
   in days of supply. Industry and imports fill the capital; transport moves stocks along capital → depot → front
   links (capacity from transport, rail share, distance, enemy air interdiction, cut bridges); fronts draw from their
   depot by priority. A front's supply level (ops.js) now comes from its depot's stock. Depots can be struck where
   the enemy holds the air (stocks destroyed; events); ports add seaborne imports unless blockaded (naval.js).
   LIVES: for each country at war, six fictional households (names from the regional pools) whose members live through
   the war by the country's own rates: called up, displaced, hurt, back to school, returned home, reunited. Their
   stories are logged in the LIFE tab. They are illustrations drawn from aggregate rates, not real people.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WSORTIE||!WWAR.mil)return;
const W=WWAR,G=WGEO,WS=WSORTIE.WS,rn=Math.random,MIL=W.mil;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[(rn()*a.length)|0];
/* ================================================================== support aircraft in the air */
const SUP={tnk:null,aw:[]};
function behind(side,km){const n=WS.front;if(!n)return null;const sg=(n.enemyIsB?1:-1)*(side?-1:1);const lat=n.p.lat-n.s.ny*sg*km/111.2,lon=n.p.lon-n.s.nx*sg*km/(111.2*Math.cos(n.p.lat*Math.PI/180));return{lat,lon};}
function supportUp(){if(!WS.on||!WS.front||!W.st)return;const me=W.st.c[WS.me],mine=Object.values(W.st.c).filter(p=>p.side===me.side&&bel(p)),theirs=Object.values(W.st.c).filter(p=>p.side&&p.side!==me.side&&bel(p));
  const has=(L,k)=>L.some(p=>{const m=W.st.mil&&W.st.mil[p.a3];return m&&m[k]>0;});
  if(has(mine,'tnk')&&typeof TNK!=='undefined'){const b=behind(0,120);if(b){const q=G.ll2xz(b.lat,b.lon);TNK.setup(q.x,q.z,(WS.front.s.ny?90:0),7620);SUP.tnk={lat:b.lat,lon:b.lon};if(typeof radio==='function')setTimeout(()=>WS.on&&radio('Texaco on station '+Math.round(cd2(player.pos.x,player.pos.z,q.x,q.z)/NM)+' miles behind the line, flight level two-five-zero.'),6000);}}
  for(const[side,L]of[[0,mine],[1,theirs]]){if(!has(L,'aew'))continue;const b=behind(side,side?160:140);if(!b)continue;const q=G.ll2xz(b.lat,b.lon);const ty=(side?L:mine).some(p=>['RUS','CHN','BLR','IRN'].includes(p.a3))?'A-50':'E-3A';
    let j;try{j=new Jet(side,ty,{},'modern');}catch(e){continue;}const alt=9000,pts=[[18000,0],[-18000,0]].map(([f])=>({x:q.x+f,z:q.z,alt}));j.spawn(pts[0].x,alt,pts[0].z,270,200);j.gciA=!side;j.cmpAw=1;
    j.ai=new AI(j);j.ai.dumb=true;j.ai.spd=200;j.ai.route=pts;j.ai.wi=1;j.callsign=side?'ENEMY AWACS':(ty==='E-3A'?'MAGIC':'MAINSTAY');const owner=(side?L:mine).find(p=>(W.st.mil[p.a3]||{}).aew>0);j._ws=owner&&owner.a3;j._aew=1;
    if(side){WS.jets.add(j);WS.enemy.push(j);}SUP.aw.push(j);}}
// an enemy AEW shot down costs its country an AEW aircraft
if(typeof Jet!=='undefined'){const _k=Jet.prototype.kill;if(_k)Jet.prototype.kill=function(){const was=this.alive&&this._aew&&this._ws;const r=_k.apply(this,arguments);if(was&&W.st&&W.st.mil[this._ws]){W.st.mil[this._ws].aew=Math.max(0,W.st.mil[this._ws].aew-1);W.emit('AIR',{e:[this._ws],txt:'An airborne early-warning aircraft of '+W.st.c[this._ws].n+' is shot down.'});}return r;};}
function supportDown(){if(typeof TNK!=='undefined'&&SUP.tnk)TNK.clear();SUP.tnk=null;for(const j of SUP.aw){if(j.mesh)scene.remove(j.mesh);const i=jets.indexOf(j);if(i>=0)jets.splice(i,1);}SUP.aw=[];}
// keep the tanker in place across floating-origin rebases
if(window.WF){const _r=WF.rebase;WF.rebase=async function(){const on=typeof TNK!=='undefined'&&TNK.on&&SUP.tnk,ll=on?G.xz2ll(TNK.pos.x,TNK.pos.z):null;const r=await _r.apply(this,arguments);if(on&&TNK.on){const q=G.ll2xz(ll.lat,ll.lon);TNK.pos.x=q.x;TNK.pos.z=q.z;TNK.orient();}return r;};}
/* ================================================================== the planning room */
const PLN=()=>W.st.pkg||(W.st.pkg={k:'AUTO',tgt:null,esc:0});
function targets(a3){const st=W.st,p=st.c[a3],out=[];if(!p)return out;
  for(const f of st.fronts){if(f.a!==a3&&f.b!==a3)continue;const o=st.c[f.a===a3?f.b:f.a];f.sec.forEach((s,i)=>{if(i%4)return;const q=W.linePt(s);out.push({n:'Front with '+o.n+' · sector '+(i+1),lat:q.lat,lon:q.lon,kind:'FRONT'});});}
  for(const[e,L]of W.milBases()){const q=st.c[e];if(!q||!q.side||q.side===p.side||!bel(q))continue;for(const a of L.slice(0,3))out.push({n:a.name+' ('+q.n+')',lat:a.lat,lon:a.lon,kind:'AIRFIELD',a3:e});}
  const D=st.dep||{};for(const[a,L]of Object.entries(D)){const q=st.c[a];if(!q||!q.side||q.side===p.side)continue;for(const d of L)out.push({n:'Depot at '+d.n+' ('+q.n+')',lat:d.lat,lon:d.lon,kind:'DEPOT',a3:a});}
  const c=G.byA3.get(a3);return out.filter(t=>!c||G.dist(c.ly,c.lx,t.lat,t.lon)<2.5e6).slice(0,50);}
{const _s=WSORTIE.start;WSORTIE.start=async function(a3,ap){const r=await _s.apply(this,arguments);if(!WS.on||!W.st)return r;
  try{const k=PLN(),P=player;if(k.tgt&&k.k!=='AUTO'){const q=G.ll2xz(k.tgt.lat,k.tgt.lon);WS.task={k:k.k==='ESCORT'?'CAP':k.k,x:q.x,z:q.z,l:k.k+' — '+k.tgt.n};
      if(k.k==='STRIKE'||k.k==='SEAD'){const side=1,owner=k.tgt.a3||WS.me;for(let i=0;i<(k.k==='STRIKE'?4:2);i++){const kind=k.k==='STRIKE'?(i<2?'BLDG':'TRUCK'):'SURN';if(typeof GTY==='undefined'||!GTY[kind])continue;
        const u=GND.add(kind,side,q.x+(rn()-.5)*600,q.z+(rn()-.5)*600,rn()*360);u._ws=owner;if(k.tgt.kind==='DEPOT')u._depot=k.tgt.n;WS.ground.push(u);}}
      setTimeout(()=>{if(WS.on&&typeof radio==='function')radio('Package: '+k.k+' on '+k.tgt.n+(k.esc?', '+k.esc+' escort flight'+(k.esc>1?'s':''):'')+'. '+String(Math.round(brgTo(P.pos.x,P.pos.z,q.x,q.z))).padStart(3,'0')+' for '+Math.round(cd2(P.pos.x,P.pos.z,q.x,q.z)/NM)+' miles.');},3500);}
    for(let i=0;i<(k.esc|0);i++){const ll=G.xz2ll(P.pos.x+(i+1)*1500,P.pos.z+800);WSORTIE.spawnFlight(0,a3,{lat:ll.lat,lon:ll.lon,ident:ap.ident},k.tgt?k.tgt.lat:ll.lat,k.tgt?k.tgt.lon:ll.lon,'CAP');}
    supportUp();}catch(e){console.warn('[deep] package',e);}return r;};}
{const _f=WSORTIE.finish;WSORTIE.finish=function(){const r=_f.apply(this,arguments);supportDown();return r;};}
/* ================================================================== the depot network */
function depots(p){const st=W.st,D=st.dep||(st.dep={});if(D[p.a3])return D[p.a3];const c=G.byA3.get(p.a3);if(!c)return null;const places=G.places.filter(q=>q.a3===p.a3).sort((a,b)=>(b.pop||0)-(a.pop||0));
  const cap=places[0]||{name:p.n,lat:c.ly,lon:c.lx};const L=[{n:cap.name,lat:cap.lat,lon:cap.lon,cap:1,stock:20,fr:[]}];
  for(const f of st.fronts){if(f.a!==p.a3&&f.b!==p.a3)continue;const s=f.sec[(f.sec.length/2)|0];let best=null,bd=1e12;for(const q of places.slice(0,40)){const d=G.dist(q.lat,q.lon,s.lat,s.lon);if(d<bd&&d>40e3){bd=d;best=q;}}
    if(!best)continue;let d=L.find(x=>x.n===best.name);if(!d){d={n:best.name,lat:best.lat,lon:best.lon,cap:0,stock:10,fr:[]};L.push(d);}d.fr.push(f.id);}
  return D[p.a3]=L;}
function network(){const st=W.st,o=W.ops&&W.ops.O();if(!o)return;
  for(const p of Object.values(st.c)){if(!bel(p))continue;const L=depots(p);if(!L||L.length<2)continue;const e=p.ecn,cap=L[0],rail=p.gdp>1e6?.6:p.gdp>2e5?.4:.2;
    const th=(st.th||[]).find(t=>t.f&&t.f[p.a3]),inter=th?Math.max(0,p.side==='B'?-th.sup:th.sup):0;
    // the capital fills from industry and imports (ports unless blockaded)
    const imp=p.nav&&!p.blk?.4:.1;cap.stock=Math.min(60,cap.stock+(e?e.ind*.9+imp:1));
    for(const d of L.slice(1)){const dist=G.dist(cap.lat,cap.lon,d.lat,d.lon)/1000,cut=d.fr.reduce((t,f)=>t+(W.supply?W.supply.cutOn(p.a3,f):0),0);
      const capy=(e?e.trans:1)*(rail*1.4+(1-rail))*Math.max(.25,1-dist/3000)*(1-inter*.35)*Math.pow(.85,cut)*(d.cutRoute?.3:1)*3;const mv=Math.min(capy,cap.stock*.5,30-d.stock);if(mv>0){cap.stock-=mv;d.stock+=mv;}
      // fronts draw, PRIORITY first
      const F=d.fr.map(id=>st.fronts.find(f=>f.id===id)).filter(f=>f&&!f.cf).sort((a,b)=>(o.prio[p.a3]===b.id)-(o.prio[p.a3]===a.id));
      for(const f of F){const need=1,take=Math.min(need,d.stock);d.stock-=take;o.sup[p.a3+':'+f.id]=cl(take/need*(.6+.4*Math.min(1,d.stock/10)),0,1.2);
        if(take<need*.6&&!o.seen['d'+p.a3+f.id]){o.seen['d'+p.a3+f.id]=1;W.emit('LOGISTICS',{e:[p.a3],txt:'The depot at '+d.n+' ('+p.n+') runs low: the front with '+st.c[f.a===p.a3?f.b:f.a].n+' is rationed (transport, distance and air attacks on the routes).'});}}
      // depots struck where the enemy holds the air
      if(inter>.4&&rn()<.01*inter){const lost=d.stock*.3;d.stock-=lost;W.emit('DEPOT',{e:[p.a3],txt:'Enemy aircraft strike the supply depot at '+d.n+' ('+p.n+'): about '+Math.round(lost)+' days of stocks are destroyed.'});}}}}
// replace ops.js's single-route estimate with the network (run after it, the same day)
W.daily.push(()=>{if(W.st&&!W.st.over)W.deep.network();});   /* through W.deep so realwar.js can mark routes cut by destroyed bridges */
// a strike on a depot in your sortie destroys stocks
if(typeof GUnit!=='undefined'){const _k=GUnit.prototype.kill;GUnit.prototype.kill=function(src){const was=this.alive,r=_k.apply(this,arguments);if(was&&!this.alive&&this._depot&&W.st&&W.st.dep){const L=W.st.dep[this._ws]||[],d=L.find(x=>x.n===this._depot);if(d)d.stock=Math.max(0,d.stock-2.5);}return r;};}
/* ================================================================== lives */
const EVT={CALL:'is called up and reports to a training camp',DISP:'leave their home as the fighting comes close',HURT:'is hurt; treated at a field hospital',SCHOOL:'goes back to school in a temporary classroom',HOME:'return home; the house needs repairs',REUN:'is back with the family after demobilization',LOST:'is missing; the family waits for news'};
function lives(){const st=W.st,LV=st.lives||(st.lives={});for(const p of Object.values(st.c)){if(!bel(p)&&!LV[p.a3])continue;if(!W.lead)continue;
  let H=LV[p.a3];if(!H){H=LV[p.a3]=[];for(let i=0;i<6;i++){const sur=W.lead.person(p.a3,'civilian',null).name.split(' ').slice(-1)[0];const n=1+((rn()*4)|0);H.push({sur,m:Array.from({length:n},(_,k)=>({n:W.lead.person(p.a3,'civilian',null).name.split(' ')[0],age:k===0?25+((rn()*30)|0):k===1?20+((rn()*35)|0):((rn()*16)|0),st:'HOME'})),st:'HOME',log:[]});}
    for(const pp of Object.values(st.lead.people))if(pp.role==='civilian'&&pp.a3===p.a3)delete st.lead.people[pp.id];}   // the name pool only; these are not leaders
  const m=st.mil&&st.mil[p.a3],callR=m?m.called/Math.max(1,p.pop)/30:0,dispR=(p.disp||0)/Math.max(1,p.pop)/60,war=bel(p)&&!st.over;
  for(const h of H){const say=(who,k)=>{h.log.unshift([st.t,(who?who+' '+h.sur:'The '+h.sur+' family')+' '+EVT[k]]);h.log.length=Math.min(h.log.length,8);};
    for(const x of h.m){if(war&&x.st==='HOME'&&x.age>=18&&x.age<=45&&rn()<callR*40){x.st='SERVING';say(x.n,'CALL');}
      else if(war&&x.st==='SERVING'&&rn()<.0015){x.st=rn()<.25?'MISSING':'HURT';say(x.n,x.st==='MISSING'?'LOST':'HURT');}
      else if(x.st==='HURT'&&rn()<.02){x.st='SERVING';}
      else if(!war&&x.st==='SERVING'&&rn()<.01){x.st='HOME';say(x.n,'REUN');}
      else if(x.age<18&&x.st==='HOME'&&h.st==='DISPLACED'&&rn()<.01){say(x.n,'SCHOOL');x.sch=1;}}
    if(war&&h.st==='HOME'&&rn()<dispR*60){h.st='DISPLACED';say(null,'DISP');}else if(h.st==='DISPLACED'&&!war&&rn()<.01){h.st='HOME';say(null,'HOME');}}}}
W.daily.push(()=>{if(W.st)lives();});
if(window.NATPANEL&&NATPANEL.tabs&&NATPANEL.tabs.LIFE){const _t=NATPANEL.tabs.LIFE;NATPANEL.tabs.LIFE=p=>{const H=(W.st.lives||{})[p.a3];const D=(W.st.dep||{})[p.a3];
  return _t(p)+(D?'<h4>DEPOTS (DAYS OF SUPPLY)</h4>'+D.map(d=>'<div class="row"><span>'+d.n+(d.cap?' (capital)':'')+'</span><b>'+Math.round(d.stock)+'</b></div>').join(''):'')+
    (H?'<h4>LIVES (FICTIONAL FAMILIES, DRAWN FROM THE COUNTRY\'S RATES)</h4>'+H.map(h=>'<div><b>The '+h.sur+' family</b> ('+h.m.map(x=>x.n+' '+x.age+(x.st!=='HOME'?' · '+x.st.toLowerCase():'')).join(', ')+')'+(h.st==='DISPLACED'?' — displaced':'')+(h.log[0]?'<br><span style="color:#8a9a92">'+W.date(h.log[0][0]).slice(0,10)+' · '+h.log[0][1]+'</span>':'')+'</div>').join(''):'');};}
/* ================================================================== the planning room UI (DEBRIEF tab) */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
if(window.NATPANEL&&NATPANEL.tabs&&NATPANEL.tabs.DEBRIEF){const _t=NATPANEL.tabs.DEBRIEF;NATPANEL.tabs.DEBRIEF=p=>{const k=PLN(),T=targets(p.a3);
  const h='<h4>PLANNING ROOM — NEXT SORTIE</h4><div class="tc">'+['AUTO','CAP','CAS','SEAD','STRIKE','ESCORT'].map(x=>'<button data-pk="k" data-v="'+x+'" aria-pressed="'+(k.k===x)+'">'+x+'</button>').join(' ')+'</div>'+
    (k.k!=='AUTO'?'<div>Target: <select id="pkT" style="max-width:220px">'+T.map((t,i)=>'<option value="'+i+'"'+(k.tgt&&k.tgt.n===t.n?' selected':'')+'>'+esc(t.n)+'</option>').join('')+'</select> <button data-pk="t">SET</button></div>':'<div style="font-size:10px;color:#8a9a92">AUTO: the theatre assigns your task on take-off.</div>')+
    '<div class="row"><span>Escort flights</span><span>'+[0,1,2].map(n=>'<button data-pk="e" data-v="'+n+'" aria-pressed="'+(k.esc===n)+'">'+n+'</button>').join(' ')+'</span></div>'+(k.tgt?'<div>Package: '+k.k+' on '+esc(k.tgt.n)+(k.esc?' with '+k.esc+' escort flight'+(k.esc>1?'s':''):'')+'.</div>':'');
  return h+_t(p);};}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-pk]');if(!b||!W.st)return;const k=PLN(),d=b.dataset;
  if(d.pk==='k'){k.k=d.v;if(d.v==='AUTO')k.tgt=null;}else if(d.pk==='e')k.esc=+d.v;else if(d.pk==='t'){const s=document.getElementById('pkT'),T=targets(WARMAP.UI.sel);k.tgt=T[+(s&&s.value)||0]||null;}WARMAP.panel();});

/* ================================================================== the battlefield moves (world sorties) */
// front vehicles follow their side's posture (ops.js): ADVANCE creeps toward the enemy, WITHDRAW pulls back; a unit
// that sees a neighbour destroyed or an attacking aircraft low and close disperses and moves to cover (away from the
// threat) for about two minutes; nothing moves into water
const MOV=new Set(['TANK','IFVR','IFVB','MBTB','MBTR','TRUCK']);
setInterval(()=>{if(!WS.on||!W.st||typeof game==='undefined'||!game.active||!WS.front)return;const n=WS.front,o=W.ops&&W.ops.O(),now=Date.now();
  const enemyA3=n.enemyIsB?n.f.b:n.f.a,ownA3=n.enemyIsB?n.f.a:n.f.b,post=o&&o.post[n.f.id]||{};const sg=n.enemyIsB?1:-1;
  for(const u of WS.ground){if(!u.alive||!MOV.has(u.kind))continue;const a3=u._ws,side=a3===enemyA3?1:0;
    // threats: a neighbour lost, or an enemy aircraft low within 4 km
    const near=WS.ground.some(v=>v!==u&&!v.alive&&v._diedAt&&now-v._diedAt<20000&&v.pos.distanceTo(u.pos)<1500);
    const air=jets.find(j=>j.alive&&j.side!==u.side&&j.pos.y-groundAt(j.pos.x,j.pos.z)<1500&&Math.hypot(j.pos.x-u.pos.x,j.pos.z-u.pos.z)<4000);
    if((near||air)&&!(u._cov>now)){u._cov=now+120000;const from=air?air.pos:WS.ground.find(v=>!v.alive&&v._diedAt).pos;const dx=u.pos.x-from.x,dz=u.pos.z-from.z,d=Math.hypot(dx,dz)||1;u._mv={x:dx/d,z:dz/d,v:9};}
    else if(!(u._cov>now)){const ps=post[a3];const dir=(side?-1:1)*sg;const v=ps==='ADVANCE'?2.5:ps==='WITHDRAW'?-3:0;u._mv=v?{x:n.s.nx*dir*Math.sign(v),z:-n.s.ny*dir*Math.sign(v),v:Math.abs(v)}:null;}
    if(!u._mv)continue;const nx=u.pos.x+u._mv.x*u._mv.v,nz=u.pos.z+u._mv.z*u._mv.v;if(groundAt(nx,nz)<2)continue;
    u.pos.x=nx;u.pos.z=nz;u.pos.y=groundAt(nx,nz);u.hdg=(Math.atan2(u._mv.x,-u._mv.z)*180/Math.PI+360)%360;if(u.mesh){u.mesh.position.set(nx,u.pos.y,nz);u.mesh.rotation.y=-u.hdg*Math.PI/180;}}},1000);
if(typeof GUnit!=='undefined'){const _k2=GUnit.prototype.kill;GUnit.prototype.kill=function(){const was=this.alive,r=_k2.apply(this,arguments);if(was&&!this.alive)this._diedAt=Date.now();return r;};}
W.deep={MOV,SUP,supportUp,supportDown,PLN,targets,depots,network,lives};
})();
