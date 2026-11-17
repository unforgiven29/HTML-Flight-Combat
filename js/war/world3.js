/* =====================================================================================================================
   v369 — supply on the road network, trade between countries, and the register of people (spec v49 ch.06 / ch.10 /
   ch.11 logistics and trade as networks; ch.08 population registry of instantiated persons).
   * DEPOT ROUTES ON ROADS: each depot link (capital to front depot, deep.js) is checked against the Natural Earth
     highways in the regional tiles (the same data the 3D world draws): points every 50 km along the link; the share
     of points within 25 km of a highway is the route's road coverage. Capacity is scaled x(0.55 + 0.45 x coverage);
     a link with little road is a bottleneck (event once). Computed once per link, in the background, cached.
   * TRADE BETWEEN COUNTRIES: each country's five largest trading partners by a gravity rule (economies over distance),
     recomputed monthly; partners across the line of war are cut (sanctions), partners under blockade or at war trade
     less. Lost trade lowers the economy a little (economy.js, life.js); the LIFE tab lists the partners and what
     happened to each.
   * THE REGISTER OF PEOPLE: every person the campaign has actually instantiated — heads of state and government,
     ministers, commanders, mayors and administrators, squadron pilots, the members of the families followed in the
     LIFE tab, and the memorial archive's entries — in one searchable register (PEOPLE tab) with role, country and
     status. It is not a census: the population of each country is a figure (life.js), not a list.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR)return;
const W=WWAR,G=WGEO,rn=Math.random;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
/* ------------------------------------------------------------------ roads for depot routes */
const TILES=new Map(),GRID=new Map();
async function tile(k){if(TILES.has(k))return TILES.get(k);const pr=(async()=>{try{const r=await fetch('assets/world/tiles/'+k+'.json');const j=r.ok?await r.json():null;if(j&&j.r)for(const rd of j.r)for(let i=1;i<rd.length;i+=6){const lon=rd[i]/1000,lat=rd[i+1]/1000,g=Math.floor(lat*4)+'_'+Math.floor(lon*4);GRID.set(g,1);}return j;}catch(e){return null;}})();TILES.set(k,pr);return pr;}
const tk=(lat,lon)=>Math.floor(lat/10)*10+'_'+Math.floor(lon/10)*10;
function nearRoad(lat,lon){for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if(GRID.has((Math.floor(lat*4)+a)+'_'+(Math.floor(lon*4)+b)))return true;return false;}   // a quarter-degree cell and its neighbours (~25 km)
async function route(a,b){const n=Math.max(2,Math.round(G.dist(a.lat,a.lon,b.lat,b.lon)/50e3)),pts=[];for(let i=0;i<=n;i++)pts.push([a.lat+(b.lat-a.lat)*i/n,a.lon+(b.lon-a.lon)*i/n]);
  await Promise.all([...new Set(pts.map(p=>tk(p[0],p[1])))].map(tile));const hit=pts.filter(p=>nearRoad(p[0],p[1])).length;return hit/pts.length;}
const RQ=()=>W.st.roads||(W.st.roads={});let busy=false;
async function roads(){if(busy||!W.st||!W.st.dep)return;busy=true;try{const R=RQ();for(const[a3,L]of Object.entries(W.st.dep)){const cap=L[0];for(const d of L.slice(1)){const k=a3+':'+d.n;if(R[k]!=null)continue;R[k]=await route(cap,d);
  if(R[k]<.4&&W.st)W.emit('LOGISTICS',{e:[a3],txt:'Few highways link '+cap.n+' to the depot at '+d.n+' ('+W.st.c[a3].n+'): supply moves slowly on secondary roads and tracks.'});}}}finally{busy=false;}}
setInterval(()=>{roads();},4000);
if(W.deep&&W.deep.network){const _n=W.deep.network;W.deep.network=function(){const r=_n.apply(this,arguments);const st=W.st,R=st.roads,o=st.ops;if(!R||!o||!st.dep)return r;
  for(const[a3,L]of Object.entries(st.dep))for(const d of L.slice(1)){const c=R[a3+':'+d.n];if(c==null)continue;for(const fid of d.fr){const k=a3+':'+fid;if(o.sup[k]!=null)o.sup[k]*=.55+.45*c;}}return r;};}
/* ------------------------------------------------------------------ trade between countries */
function partners(p){const st=W.st,c=G.byA3.get(p.a3);if(!c||p.gdp<5e4)return[];const L=[];for(const q of Object.values(st.c)){if(q===p||q.gdp<5e4)continue;const d=G.byA3.get(q.a3);if(!d)continue;
  const km=Math.max(300,G.dist(c.ly,c.lx,d.ly,d.lx)/1000);L.push({a3:q.a3,v:p.gdp*q.gdp/Math.pow(km,1.2)});}L.sort((a,b)=>b.v-a.v);const tot=L.slice(0,5).reduce((t,x)=>t+x.v,0)||1;return L.slice(0,5).map(x=>({a3:x.a3,share:x.v/tot}));}
function trade(){const st=W.st,T=st.trade2||(st.trade2={});const day=Math.floor(st.t/24);for(const p of Object.values(st.c)){if(p.gdp<5e4)continue;let r=T[p.a3];if(!r||day%30===0){const P=partners(p);r=T[p.a3]={P,lost:0};}
  let lost=0;for(const x of r.P){const q=st.c[x.a3];x.st='NORMAL';if(p.side&&q.side&&p.side!==q.side&&bel(p)&&bel(q)){x.st='SANCTIONED';lost+=x.share;}else if(q.blockade>.4){x.st='BLOCKADED';lost+=x.share*.6;}else if(bel(q)&&!st.over){x.st='AT WAR';lost+=x.share*.2;}}
  r.lost=lost;if(p.econ!=null&&lost>0)p.econ=Math.max(.4,p.econ-.0006*lost);}}
W.daily.push(()=>{if(W.st&&Math.floor(W.st.t/24)%3===0)trade();});
if(window.NATPANEL&&NATPANEL.tabs&&NATPANEL.tabs.LIFE){const _t=NATPANEL.tabs.LIFE;NATPANEL.tabs.LIFE=p=>{const r=W.st.trade2&&W.st.trade2[p.a3];return _t(p)+(r&&r.P.length?'<h4>TRADING PARTNERS (GRAVITY RULE)</h4>'+r.P.map(x=>'<div class="row"><span>'+W.st.c[x.a3].n+'</span><b>'+Math.round(x.share*100)+' % · '+(x.st||'NORMAL').toLowerCase()+'</b></div>').join('')+'<div class="row"><span>Trade lost to the war</span><b>'+Math.round(r.lost*100)+' %</b></div>':'');};}
/* ------------------------------------------------------------------ the register of people */
const UI={q:'',pg:0};const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function people(a3){const st=W.st,out=[];for(const x of Object.values((st.lead&&st.lead.people)||{}))if(!a3||x.a3===a3)out.push({n:x.name,role:(x.rank?x.rank+', ':'')+x.role,a3:x.a3,st:x.st||'IN OFFICE',src:'leaders'});
  const R=st.frc&&st.frc.roster;if(R&&(!a3||R.a3===a3))for(const q of R.ppl)out.push({n:q.name,role:q.rank+', pilot ('+q.cs+')',a3:R.a3,st:q.st,src:'squadron'});
  for(const[k,H]of Object.entries(st.lives||{})){if(a3&&k!==a3)continue;for(const h of H)for(const m of h.m)out.push({n:m.n+' '+h.sur,role:'member of a family followed in LIFE ('+m.age+')',a3:k,st:m.st,src:'lives'});}
  if(W.cemetery)for(const x of W.cemetery.entries(r=>!a3||r.a3===a3))out.push({n:W.cemetery.nameFor(x.r,x.i),role:x.r.role,a3:x.r.a3,st:x.r.st,src:'archive'});
  return out;}
function tab(p){const L0=people(p.a3),q=UI.q.toLowerCase(),L=q?L0.filter(x=>(x.n+' '+x.role+' '+x.st).toLowerCase().includes(q)):L0;const pages=Math.max(1,Math.ceil(L.length/25));UI.pg=Math.min(UI.pg,pages-1);
  return '<div style="font-size:10px;color:#8a9a92">Every person the campaign has instantiated for '+esc(p.n)+' (fictional). Not a census: the population is a figure in LIFE.</div><div><input id="ppQ" value="'+esc(UI.q)+'" placeholder="search" style="width:130px" aria-label="search people"> <button data-pp="q">FIND</button> · '+L.length+' people</div>'+
    L.slice(UI.pg*25,UI.pg*25+25).map(x=>'<div class="row"><span>'+esc(x.n)+'</span><b>'+esc(x.role)+' · '+esc(String(x.st).toLowerCase())+'</b></div>').join('')+(pages>1?'<div class="tc">'+(UI.pg>0?'<button data-pp="prev">←</button>':'')+' '+(UI.pg+1)+' / '+pages+' '+(UI.pg<pages-1?'<button data-pp="next">→</button>':'')+'</div>':'');}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.PEOPLE_REGISTER=tab;
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-pp]');if(!b)return;const d=b.dataset.pp;if(d==='q'){const i=document.getElementById('ppQ');UI.q=i?i.value:'';UI.pg=0;}else if(d==='prev')UI.pg--;else UI.pg++;if(window.WARMAP)WARMAP.panel();});
W.world3={route,roads,partners,trade,people,tab,RQ};
})();
