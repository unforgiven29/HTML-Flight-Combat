/* =====================================================================================================================
   v348 — mission route planning and war news on the radio (spec v49 ch.03 mission route planner, waypoints and flight
   plans; ch.17 news, radio and world audio).
   * ROUTE PLANNER: before a sortie, build a plan from your base through waypoints picked from the war's own places
     (front sectors, cities that changed hands, enemy airfields); legs show distance and heading; the plan is drawn on
     the war map and kept with the flight record. Map planning only: the guardrails exclude radio-navigation aids and
     instrument approaches, so nothing steers the aircraft — you fly it by sight, map and compass.
   * WAR NEWS ON THE RADIO: during a world sortie, every few minutes a short news line from the war (endings,
     ceasefires, cities, mobilization, crises), with the source marked when it is a claim.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WSORTIE)return;
const W=WWAR,G=WGEO,WS=WSORTIE.WS;
const PLAN=()=>W.st.plan||(W.st.plan={from:null,wp:[]});
const hdg=(a,b)=>{const y=Math.sin((b.lon-a.lon)*Math.PI/180)*Math.cos(b.lat*Math.PI/180),x=Math.cos(a.lat*Math.PI/180)*Math.sin(b.lat*Math.PI/180)-Math.sin(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.cos((b.lon-a.lon)*Math.PI/180);return(Math.atan2(y,x)*180/Math.PI+360)%360;};
function candidates(a3){const st=W.st,out=[];const p=st.c[a3];if(!p)return out;
  for(const f of st.fronts){if(f.a!==a3&&f.b!==a3)continue;const o=st.c[f.a===a3?f.b:f.a];f.sec.forEach((s,i)=>{if(i%3)return;const q=W.linePt(s);out.push({n:'Front with '+o.n+' · sector '+(i+1),lat:q.lat,lon:q.lon});});}
  for(const[k,v]of Object.entries(st.cities||{}))if(v.h!==v.own&&(v.h===a3||v.own===a3))out.push({n:k.split('|')[0],lat:v.lat,lon:v.lon});
  const B=W.milBases();for(const[e,L]of B){const q=st.c[e];if(!q||!q.side||q.side===p.side)continue;for(const a of L.slice(0,2)){const d=G.dist(a.lat,a.lon,(G.byA3.get(a3)||{}).ly||0,(G.byA3.get(a3)||{}).lx||0);if(d<1.5e6)out.push({n:a.name+' ('+q.n+')',lat:a.lat,lon:a.lon});}}
  return out.slice(0,40);}
function legs(){const pl=PLAN();const pts=(pl.from?[pl.from]:[]).concat(pl.wp);const L=[];for(let i=1;i<pts.length;i++)L.push({d:G.dist(pts[i-1].lat,pts[i-1].lon,pts[i].lat,pts[i].lon)/1852,h:hdg(pts[i-1],pts[i]),to:pts[i].n});return L;}
{const _d=WARMAP.draw;WARMAP.draw=function(c,w2s,M,phase){const r=_d.apply(this,arguments);if(phase!=='over'||!W.st||!W.st.plan)return r;const pl=W.st.plan,pts=(pl.from?[pl.from]:[]).concat(pl.wp);if(pts.length<2)return r;
  c.strokeStyle='#e8e2a0';c.setLineDash([3,4]);c.lineWidth=1.6;c.beginPath();pts.forEach((q,i)=>{const[x,y]=w2s(q.lat,q.lon);if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.stroke();c.setLineDash([]);
  c.fillStyle='#e8e2a0';pts.forEach((q,i)=>{const[x,y]=w2s(q.lat,q.lon);c.beginPath();c.arc(x,y,3,0,7);c.fill();if(i)c.fillText(String(i),x+5,y-5);});return r;};}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function box(p){const pl=PLAN(),C=candidates(p.a3);const L=legs();
  return '<h4>ROUTE PLAN</h4><div style="font-size:10px;color:#8a9a92">Map planning only: no navigation aid steers the aircraft.</div>'+
    '<div>From: '+(pl.from?esc(pl.from.n):'<i>pick an airfield under FLY FOR, or</i>')+' '+(WSORTIE.basesFor(p.a3)[0]?'<button data-rp="from">'+esc(WSORTIE.basesFor(p.a3)[0].a.name)+'</button>':'')+'</div>'+
    (L.length?L.map((l,i)=>'<div class="row"><span>'+(i+1)+'. '+esc(l.to)+'</span><b>'+Math.round(l.h)+'° · '+Math.round(l.d)+' NM</b></div>').join('')+'<div class="row"><span>Total</span><b>'+Math.round(L.reduce((t,l)=>t+l.d,0))+' NM</b></div>':'')+
    '<div><select id="rpSel" style="max-width:200px">'+C.map((q,i)=>'<option value="'+i+'">'+esc(q.n)+'</option>').join('')+'</select> <button data-rp="add">ADD WAYPOINT</button> <button data-rp="clr">CLEAR</button></div>';}
if(window.NATPANEL&&NATPANEL.tabs&&NATPANEL.tabs.DEBRIEF){const _t=NATPANEL.tabs.DEBRIEF;NATPANEL.tabs.DEBRIEF=p=>box(p)+_t(p);}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-rp]');if(!b||!W.st)return;const pl=PLAN(),a3=WARMAP.UI.sel;
  if(b.dataset.rp==='from'){const a=WSORTIE.basesFor(a3)[0];if(a)pl.from={n:a.a.name,lat:a.a.lat,lon:a.a.lon};}
  else if(b.dataset.rp==='add'){const s=document.getElementById('rpSel'),C=candidates(a3),q=C[+(s&&s.value)||0];if(q&&pl.wp.length<8)pl.wp.push(q);}else{pl.wp=[];}
  WARMAP.panel();if(window.WMAP)WMAP.draw();});
{const _s=WSORTIE.start;WSORTIE.start=async function(a3,ap){const pl=W.st&&W.st.plan;if(pl&&ap)pl.from={n:ap.name,lat:ap.lat,lon:ap.lon};return _s.apply(this,arguments);};}
// war news on the radio
{let last=0,seen=0;const NEWS=/^(END|CEASEFIRE|CITY|MOBILIZATION|CRISIS|ASSEMBLY|ENTRY|EXIT|CLAIM)$/;
 setInterval(()=>{if(!WS.on||typeof game==='undefined'||!game.active||typeof radio!=='function')return;const now=Date.now();if(now-last<240e3)return;const E=W.st.ev.filter(e=>NEWS.test(e.ty)&&e.t>seen);if(!E.length)return;last=now;const e=E[E.length-1];seen=e.t;
   radio('NEWS · '+(e.cf==='CLAIMED'?'(claim) ':'')+String(e.txt).slice(0,140),false);},10000);}
W.extras={PLAN,candidates,legs,box};
})();
