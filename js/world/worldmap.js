/* =====================================================================================================================
   v326 — WORLD MAP: the whole planet, to pick where to fly. Elevation and bathymetry shading from the bundled grid,
   country outlines, cities and towns (bigger dots for bigger places, names when zoomed in), every airport in the data
   (large, medium, paved small; military fields marked). Search by ICAO / IATA / name / city; pick a runway and an end; FLY.
   Opened from the WORLD MAP card on QUICK FLIGHT. Presentation only: it calls WF.start().
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WGEO||!window.WF)return;
const G=WGEO,esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M={el:null,cv:null,cx:null,img:null,lon:10,lat:12,ppd:3,sel:null,rw:0,end:'le',drag:null,hover:null,dpr:1};
try{const o=JSON.parse(localStorage.getItem('viper.wm')||'null');if(o&&isFinite(o.lat)){M.lat=o.lat;M.lon=o.lon;M.ppd=o.ppd||3;M.last=o.ap||null;}}catch(e){}
const keep=()=>{try{localStorage.setItem('viper.wm',JSON.stringify({lat:M.lat,lon:M.lon,ppd:M.ppd,ap:M.sel&&M.sel.ident}));}catch(e){}};

document.head.insertAdjacentHTML('beforeend','<style>'+
 '#wmap{position:fixed;inset:0;z-index:30;display:grid;grid-template-columns:1fr min(360px,42vw);background:#07131b;color:#e8f0ec;font:12px/1.45 "B612 Mono",monospace}'+
 '#wmap[hidden]{display:none}#wmCv{width:100%;height:100%;display:block;cursor:grab;touch-action:none}#wmap .side{display:flex;flex-direction:column;gap:8px;padding:12px;border-left:1px solid rgba(255,255,255,.1);overflow:auto;background:rgba(6,14,18,.96)}'+
 '#wmap h2{margin:0;font:700 15px "Stardos Stencil","B612",sans-serif;letter-spacing:.16em;color:#ffcf5a}#wmap input{width:100%;box-sizing:border-box;padding:7px 8px;background:#0c1c24;border:1px solid rgba(255,255,255,.2);border-radius:4px;color:#e8f0ec;font:inherit}'+
 '#wmap .res{display:grid;gap:2px;max-height:30vh;overflow:auto}#wmap .res button,#wmap .chips button,#wmap .act button{all:unset;cursor:pointer;padding:4px 6px;border-radius:3px;border:1px solid rgba(255,255,255,.12)}'+
 '#wmap .res button:hover,#wmap .res button.on{background:rgba(91,225,255,.14);border-color:#5be1ff}#wmap .res i{font-style:normal;color:#8a9a92}'+
 '#wmap .chips{display:flex;flex-wrap:wrap;gap:4px}#wmap .chips button[aria-pressed=true]{background:#5be1ff;color:#07131b;border-color:#5be1ff}'+
 '#wmap .act{display:flex;gap:8px;margin-top:auto}#wmap .act button{padding:8px 14px;font-weight:700;letter-spacing:.12em}#wmap .act .go{background:#ffcf5a;color:#07131b;border-color:#ffcf5a}'+
 '#wmap .note{color:#8a9a92;font-size:10.5px}#wmStatus{color:#5be1ff;min-height:1.4em}#wmap .zb{position:absolute;left:12px;bottom:12px;display:flex;gap:4px}#wmap .zb button{all:unset;cursor:pointer;width:30px;height:30px;text-align:center;line-height:30px;background:rgba(6,14,18,.85);border:1px solid rgba(255,255,255,.2);border-radius:4px}'+
 '@media (max-width:720px){#wmap{grid-template-columns:1fr;grid-template-rows:55vh 1fr}#wmap .side{border-left:0;border-top:1px solid rgba(255,255,255,.1)}}'+
 '</style>');

function mount(){if(M.el)return;const d=document.createElement('div');d.id='wmap';d.hidden=true;
  d.innerHTML='<div style="position:relative;min-height:0"><canvas id="wmCv"></canvas><div class="zb"><button data-z="in" aria-label="Zoom in">+</button><button data-z="out" aria-label="Zoom out">−</button></div></div>'+
   '<div class="side"><h2>WORLD MAP</h2><div class="note">Pick an airport anywhere on Earth. Drag to pan, wheel or ± to zoom, click a field to select it.</div>'+
   '<input id="wmQ" type="search" placeholder="ICAO, IATA, airport or city (e.g. KLAX, Ramstein, Tokyo)" autocomplete="off"><div class="res" id="wmRes"></div><div id="wmSel"></div><div id="wmStatus"></div>'+
   '<div class="note">Terrain streams at about 150 m from public elevation tiles; offline, a coarse world grid is used. Cities and towns are placed and sized from Natural Earth; airports and runways from OurAirports. Sources: assets/world/SOURCES.md</div>'+
   '<div class="act"><button class="go" id="wmGo">FLY</button><button id="wmX">CLOSE</button></div></div>';
  document.body.appendChild(d);M.el=d;M.cv=d.querySelector('#wmCv');M.cx=M.cv.getContext('2d');
  const cv=M.cv;
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);M.drag={x:e.clientX,y:e.clientY,lat:M.lat,lon:M.lon,mv:false};cv.style.cursor='grabbing';});
  cv.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();M.hover=[e.clientX-r.left,e.clientY-r.top];
    if(M.drag){const dx=e.clientX-M.drag.x,dy=e.clientY-M.drag.y;if(Math.abs(dx)+Math.abs(dy)>4)M.drag.mv=true;M.lon=M.drag.lon-dx/M.ppd;M.lat=Math.max(-85,Math.min(85,M.drag.lat+dy/M.ppd));}draw();});
  cv.addEventListener('pointerup',e=>{const d0=M.drag;M.drag=null;cv.style.cursor='grab';if(d0&&!d0.mv)click(e);keep();});
  cv.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1/1.25:1.25,e);},{passive:false});
  d.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>zoom(b.dataset.z==='in'?1.5:1/1.5));
  d.querySelector('#wmQ').addEventListener('input',e=>results(e.target.value));
  d.querySelector('#wmRes').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(!b)return;select(G.airports.find(a=>a.ident===b.dataset.i),true);});
  d.querySelector('#wmSel').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.rw!=null){M.rw=+b.dataset.rw;M.end='le';}if(b.dataset.end)M.end=b.dataset.end;side();draw();});
  d.querySelector('#wmGo').onclick=()=>{if(!M.sel){status('PICK AN AIRPORT FIRST');return;}keep();WF.start(M.sel,M.rw,M.end).then(()=>{if(game.active&&game.scen==='WORLD')close();});};
  d.querySelector('#wmX').onclick=close;addEventListener('resize',()=>{if(!d.hidden)resize();});
  addEventListener('keydown',e=>{if(!d.hidden&&e.key==='Escape'){e.stopPropagation();close();}},true);}
const status=t=>{const s=document.getElementById('wmStatus');if(s)s.textContent=t;};
async function open(){mount();M.el.hidden=false;resize();status('LOADING WORLD DATA …');
  try{await G.loadData();status('');if(!M.img)M.img=shade();if(M.last&&!M.sel){const a=G.airports.find(q=>q.ident===M.last);if(a)select(a,false);}draw();}
  catch(e){status('WORLD DATA FAILED TO LOAD · '+(e&&e.message||e));}}
function close(){if(M.el)M.el.hidden=true;}
function resize(){const r=M.cv.getBoundingClientRect();M.dpr=Math.min(2,devicePixelRatio||1);M.W=r.width;M.H=r.height;M.cv.width=Math.max(2,r.width*M.dpr);M.cv.height=Math.max(2,r.height*M.dpr);draw();}
const w2s=(lat,lon)=>{let dl=lon-M.lon;dl=((dl+540)%360)-180;return[M.W/2+dl*M.ppd,M.H/2-(lat-M.lat)*M.ppd];};
const s2w=(x,y)=>({lat:M.lat-(y-M.H/2)/M.ppd,lon:((M.lon+(x-M.W/2)/M.ppd+540)%360)-180});
function zoom(k,e){let ax=M.W/2,ay=M.H/2;if(e&&e.clientX!=null){const r=M.cv.getBoundingClientRect();ax=e.clientX-r.left;ay=e.clientY-r.top;}
  const a=s2w(ax,ay);M.ppd=Math.max(M.W/360*.9,Math.min(900,M.ppd*k));M.lon=a.lon-(ax-M.W/2)/M.ppd;M.lat=Math.max(-85,Math.min(85,a.lat+(ay-M.H/2)/M.ppd));draw();keep();}
// hypsometric tint and hill shade from the global grid (built once)
function shade(){const q=G.grid,cv=document.createElement('canvas');cv.width=q.W;cv.height=q.H;const c=cv.getContext('2d'),im=c.createImageData(q.W,q.H),d=im.data;
  const L=[[0,[86,112,70]],[300,[120,132,82]],[800,[160,150,104]],[1600,[150,126,96]],[2800,[170,160,150]],[4500,[236,238,240]]],S=[[-8000,[8,22,48]],[-3000,[14,42,78]],[-200,[28,78,118]],[0,[52,110,148]]];
  const ramp=(T,h)=>{if(h<=T[0][0])return T[0][1];for(let i=1;i<T.length;i++)if(h<=T[i][0]){const a=T[i-1],b=T[i],t=(h-a[0])/(b[0]-a[0]);return[0,1,2].map(k=>a[1][k]+(b[1][k]-a[1][k])*t);}return T[T.length-1][1];};
  for(let j=0;j<q.H;j++)for(let i=0;i<q.W;i++){const k=j*q.W+i,h=q.g[k],o=k*4;
    if(h<=0){const c2=ramp(S,h);d[o]=c2[0];d[o+1]=c2[1];d[o+2]=c2[2];}
    else{const e=q.g[j*q.W+Math.min(q.W-1,i+1)],s=q.g[Math.min(q.H-1,j+1)*q.W+i],sh=Math.max(.6,Math.min(1.4,1+((h-e)+(h-s))/900)),c2=ramp(L,h);d[o]=c2[0]*sh;d[o+1]=c2[1]*sh;d[o+2]=c2[2]*sh;}
    d[o+3]=255;}
  c.putImageData(im,0,0);return cv;}
function draw(){const c=M.cx;if(!c||M.el.hidden)return;const W=M.W,H=M.H;c.setTransform(M.dpr,0,0,M.dpr,0,0);c.fillStyle='#07131b';c.fillRect(0,0,W,H);
  if(!G.ready||!M.img)return;
  // the shaded grid, drawn three times across the date line so panning wraps
  const sw=360*M.ppd,sh=180*M.ppd,[x0,y0]=w2s(90,-180);c.imageSmoothingEnabled=true;for(const k of[-1,0,1])c.drawImage(M.img,x0+k*sw,y0,sw,sh);
  // countries
  c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=.8;c.beginPath();
  for(const C of G.countries)for(const r of C.r){let px=null;for(let i=0;i<r.length;i+=2){const[x,y]=w2s(r[i+1],r[i]);if(px!=null&&Math.abs(x-px)>W*.5){c.moveTo(x,y);}else if(i)c.lineTo(x,y);else c.moveTo(x,y);px=x;}}
  c.stroke();
  // places: big ones always, smaller as you zoom in
  const minPop=M.ppd<4?2e6:M.ppd<10?5e5:M.ppd<30?1e5:M.ppd<80?2e4:0;c.font='600 11px "B612 Mono",monospace';
  for(const p of G.places){if(p.pop<minPop)break;const[x,y]=w2s(p.lat,p.lon);if(x<-20||y<-20||x>W+20||y>H+20)continue;const r=Math.max(1.5,Math.min(5,Math.log10(Math.max(1e3,p.pop))-3));
    c.fillStyle=p.cap===2?'#ffcf5a':'#f2efe6';c.beginPath();c.arc(x,y,r,0,7);c.fill();if(M.ppd>=10&&p.pop>=minPop*3||p.cap===2&&M.ppd>=5){c.fillStyle='rgba(242,239,230,.85)';c.fillText(p.name,x+r+3,y+4);}}
  // airports
  const show=M.ppd<6?'L':M.ppd<20?'LM':'LMS';
  for(const a of G.airports){if(!show.includes(a.size))continue;const[x,y]=w2s(a.lat,a.lon);if(x<-8||y<-8||x>W+8||y>H+8)continue;
    c.fillStyle=a.mil?'#ff7a5a':a.size==='L'?'#5be1ff':a.size==='M'?'#7dffa0':'#b9c6c0';const s=a.size==='L'?3.2:2.4;c.fillRect(x-s,y-s,s*2,s*2);}
  if(M.sel){const a=M.sel,[x,y]=w2s(a.lat,a.lon);c.strokeStyle='#ffcf5a';c.lineWidth=2;c.beginPath();c.arc(x,y,9,0,7);c.stroke();
    if(M.ppd>=60){const rw=a.runways[M.rw];if(rw&&rw.le_lat!=null){const[p,q]=[w2s(rw.le_lat,rw.le_lon),w2s(rw.he_lat,rw.he_lon)];c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);c.lineWidth=4;c.stroke();}}
    c.fillStyle='#ffcf5a';c.fillText((a.iata||a.ident)+' · '+a.name,x+12,y-10);}
  c.fillStyle='rgba(232,240,236,.8)';c.fillText(M.lat.toFixed(2)+'°  '+M.lon.toFixed(2)+'°',8,16);}
function click(e){if(!G.ready)return;const r=M.cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let best=null,bd=144;
  const show=M.ppd<6?'L':M.ppd<20?'LM':'LMS';
  for(const a of G.airports){if(!show.includes(a.size))continue;const[sx,sy]=w2s(a.lat,a.lon),d=(sx-x)**2+(sy-y)**2;if(d<bd){bd=d;best=a;}}
  if(best)select(best,false);}
function select(a,fly){if(!a)return;M.sel=a;M.rw=0;M.end='le';
  // the longest paved runway first
  let bi=0,bl=-1;a.runways.forEach((r,i)=>{const v=r.len_m*(r.paved?1:.5);if(v>bl){bl=v;bi=i;}});M.rw=bi;
  if(fly){M.lat=a.lat;M.lon=a.lon;M.ppd=Math.max(M.ppd,40);}side();draw();keep();}
function side(){const a=M.sel,el=document.getElementById('wmSel');if(!el)return;if(!a){el.innerHTML='';return;}
  const rw=a.runways[M.rw]||a.runways[0];
  el.innerHTML='<div><b>'+esc(a.name)+'</b><br><span class="note">'+esc([a.ident,a.iata,a.city,a.iso2].filter(Boolean).join(' · '))+' · '+a.elev_m+' m'+(a.mil?' · military':'')+'</span></div>'+
   '<div class="note" style="margin-top:6px">RUNWAY</div><div class="chips">'+a.runways.map((r,i)=>'<button data-rw="'+i+'" aria-pressed="'+(i===M.rw)+'">'+esc(r.le_id+'/'+r.he_id)+' · '+Math.round(r.len_m)+' m'+(r.paved?'':' (unpaved)')+'</button>').join('')+'</div>'+
   (rw?'<div class="note" style="margin-top:6px">TAKE OFF FROM</div><div class="chips"><button data-end="le" aria-pressed="'+(M.end==='le')+'">RWY '+esc(rw.le_id||'A')+'</button><button data-end="he" aria-pressed="'+(M.end==='he')+'">RWY '+esc(rw.he_id||'B')+'</button></div>':'');}
function results(q){const el=document.getElementById('wmRes');if(!el)return;const L=G.search(q,30);
  el.innerHTML=L.map(a=>'<button data-i="'+esc(a.ident)+'" class="'+(M.sel===a?'on':'')+'"><b>'+esc(a.iata||a.ident)+'</b> '+esc(a.name)+' <i>'+esc(a.city)+' '+esc(a.iso2)+'</i></button>').join('')||(q?'<div class="note">No airport matches.</div>':'');}

// the WORLD MAP card on QUICK FLIGHT
function card(){const rng=document.getElementById('sRNG');if(!rng||document.getElementById('sWORLD'))return;
  rng.insertAdjacentHTML('beforebegin','<button class="qm" id="sWORLD"><i>EARTH</i><b>WORLD MAP</b><span>Fly from any airport on Earth: real terrain, coastlines, runways, cities and towns. Free flight.</span><em>PICK</em></button>');
  document.getElementById('sWORLD').onclick=open;}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',card);else card();
window.WMAP={open,close,M,select};
})();
