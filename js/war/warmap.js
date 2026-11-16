/* =====================================================================================================================
   v327 — the world war on the WORLD MAP (presentation only; WWAR owns the state). Countries shaded by alignment, fronts
   drawn where they stand now (the border, pushed by each sector's offset), air theatres coloured by superiority, cities
   that changed hands, and a WAR panel: date and time controls, theatres, fronts, the event feed, and the profile of any
   country you click. The scenario disclaimer is always visible: the war is fictional.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WMAP)return;
const W=WWAR,G=WGEO,D=Math.PI/180,esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const UI={sel:null,feed:'all'};
const AL={CORE:'principal power',ALLY:'ally',PARTNER:'partner (not fighting)',NEUTRAL:'neutral',UNDECIDED:'undecided'};
const fill=p=>!p||!p.side?null:p.side==='B'?(p.al==='PARTNER'?'rgba(91,180,255,.10)':'rgba(70,150,255,.26)'):(p.al==='PARTNER'?'rgba(255,90,74,.10)':'rgba(255,80,64,.26)');

document.head.insertAdjacentHTML('beforeend','<style>'+
 '#wmWar{border-top:1px solid rgba(255,255,255,.12);padding-top:8px;display:grid;gap:6px}#wmWar h3{margin:0;font:700 12px "B612 Mono",monospace;letter-spacing:.16em;color:#ffcf5a}'+
 '#wmWar .disc{font-size:10px;color:#ffcf5a;border:1px solid rgba(255,207,90,.4);border-radius:3px;padding:4px 6px}#wmWar .row{display:flex;justify-content:space-between;gap:8px}#wmWar .row span{color:#8a9a92}'+
 '#wmWar .tc{display:flex;flex-wrap:wrap;gap:4px}#wmWar .tc button{all:unset;cursor:pointer;padding:3px 7px;border:1px solid rgba(255,255,255,.2);border-radius:3px;font-weight:700;font-size:10.5px}#wmWar .tc button[aria-pressed=true]{background:#5be1ff;color:#07131b}'+
 '#wmWar .bar{height:6px;border-radius:3px;background:linear-gradient(90deg,#ff5a4a,#ff5a4a var(--r),#5be1ff var(--r));margin:2px 0 4px}#wmWar .feed{max-height:22vh;overflow:auto;font-size:10.5px;display:grid;gap:3px}#wmWar .feed em{font-style:normal;color:#8a9a92;margin-right:5px}'+
 '#wmWar .cf{color:#ffcf5a;font-size:9px;margin-left:4px}#wmWar .prof{border:1px solid rgba(255,255,255,.12);border-radius:4px;padding:6px}#wmWar .b{color:#5be1ff}#wmWar .r{color:#ff7a68}#wmWar .n{color:#b9c6c0}'+
 '</style>');

function draw(c,w2s,M,phase){const st=W.st;if(!st)return;
  if(phase==='under'){for(const C of G.countries){const f=fill(st.c[C.a3]);if(!f)continue;c.fillStyle=f;c.beginPath();
      for(const r of C.r){let px=null;for(let i=0;i<r.length;i+=2){const[x,y]=w2s(r[i+1],r[i]);if(i===0||Math.abs(x-px)>M.W*.5)c.moveTo(x,y);else c.lineTo(x,y);px=x;}c.closePath();}c.fill('evenodd');}
    // air theatres
    for(const th of st.th){const T=W.THEATRES.find(q=>q.id===th.id),[x0,y0]=w2s(T.lat[1],T.lon[0]),[x1,y1]=w2s(T.lat[0],T.lon[1]>180?T.lon[1]-360:T.lon[1]);let w=x1-x0;if(w<0)w+=360*M.ppd;
      c.strokeStyle=th.sup>.1?'rgba(91,225,255,.55)':th.sup<-.1?'rgba(255,122,104,.55)':'rgba(255,207,90,.5)';c.setLineDash([6,5]);c.lineWidth=1.2;c.strokeRect(x0,y0,w,y1-y0);c.setLineDash([]);
      if(M.ppd>=4){c.fillStyle=c.strokeStyle;c.font='700 10px "B612 Mono",monospace';c.fillText(th.name.toUpperCase(),x0+4,y0+12);}}
    return;}
  // fronts where they stand: red and blue lines either side
  for(const f of st.fronts){const A=st.c[f.a];const pts=f.sec.map(s=>{const lat=s.lat+s.ny*s.off/111.2,lon=s.lon+s.nx*s.off/(111.2*Math.cos(s.lat*D));return w2s(lat,lon);});
    for(const[col,sh]of[[A.side==='B'?'#5be1ff':'#ff5a4a',-1.6],[A.side==='B'?'#ff5a4a':'#5be1ff',1.6]]){c.strokeStyle=col;c.lineWidth=2.4;c.beginPath();let pv=null;
      for(const[x,y]of pts){if(pv&&Math.hypot(x-pv[0],y-pv[1])>Math.max(30,M.ppd*1.2)){c.moveTo(x+sh,y+sh);}else if(pv)c.lineTo(x+sh,y+sh);else c.moveTo(x+sh,y+sh);pv=[x,y];}c.stroke();}}
  // cities that changed hands
  c.font='700 10px "B612 Mono",monospace';for(const[k,v]of Object.entries(st.cities)){if(v.h===v.own)continue;const[x,y]=w2s(v.lat,v.lon);c.strokeStyle='#ffcf5a';c.lineWidth=2;c.beginPath();c.moveTo(x-5,y-5);c.lineTo(x+5,y+5);c.moveTo(x+5,y-5);c.lineTo(x-5,y+5);c.stroke();if(M.ppd>=8){c.fillStyle='#ffcf5a';c.fillText(k.split('|')[0],x+7,y-6);}}
  if(UI.sel){const C=G.byA3.get(UI.sel);if(C){c.strokeStyle='#ffcf5a';c.lineWidth=1.5;c.beginPath();for(const r of C.r){let px=null;for(let i=0;i<r.length;i+=2){const[x,y]=w2s(r[i+1],r[i]);if(i===0||Math.abs(x-px)>M.W*.5)c.moveTo(x,y);else c.lineTo(x,y);px=x;}c.closePath();}c.stroke();}}}

function panel(){const el=document.getElementById('wmWar');if(!el)return;const st=W.st;
  if(!st){el.innerHTML='<h3>WORLD WAR</h3><div class="disc">Fictional scenario: real countries, borders and airfields; an invented war. Not a prediction of what any country would do.</div><div class="tc"><button data-w="new">START THE WORLD WAR</button><button data-w="load">LOAD SAVED WAR</button></div>';return;}
  const P=Object.values(st.c),bel=s=>P.filter(p=>p.side===s&&(p.al==='CORE'||p.al==='ALLY')),sum=(L,k)=>Math.round(L.reduce((t,p)=>t+p[k],0));
  const B=bel('B'),R=bel('R');
  let h='<h3>WORLD WAR · DAY '+(Math.floor(st.t/24)+1)+'</h3><div class="row"><span>'+esc(W.date(st.t))+'</span><span>'+(W.run?'RUNNING ×'+W.speed:'PAUSED')+'</span></div>'+
   '<div class="tc"><button data-w="run" aria-pressed="'+W.run+'">'+(W.run?'PAUSE':'RUN')+'</button>'+[1,6,24].map(s=>'<button data-w="spd" data-v="'+s+'" aria-pressed="'+(W.speed===s)+'">'+s+' H/S</button>').join('')+'<button data-w="adv" data-v="24">+1 DAY</button></div>'+
   '<div class="row"><span class="b">BLUEFOR '+B.length+' at war</span><span class="r">REDFOR '+R.length+' at war</span></div>'+
   '<div class="row"><span>Combat aircraft (est.)</span><span><b class="b">'+sum(B,'air')+'</b> · <b class="r">'+sum(R,'air')+'</b></span></div>'+
   '<div class="row"><span>Ground brigades (est.)</span><span><b class="b">'+sum(B,'gnd')+'</b> · <b class="r">'+sum(R,'gnd')+'</b></span></div>'+
   '<div style="font-size:10.5px;color:#8a9a92;margin-top:4px">AIR THEATRES</div>';
  for(const th of st.th){const r=Math.round((1-(th.sup+1)/2)*100);h+='<div class="row"><span>'+esc(th.name)+'</span><span>'+(Math.abs(th.sup)<.1?'contested':th.sup>0?'<b class="b">BLUE</b>':'<b class="r">RED</b>')+'</span></div><div class="bar" style="--r:'+r+'%"></div>';}
  h+='<div style="font-size:10.5px;color:#8a9a92">FRONTS</div>';
  for(const f of st.fronts){const avg=f.sec.reduce((t,s)=>t+s.off,0)/f.sec.length;h+='<div class="row"><span>'+esc(st.c[f.a].n)+' / '+esc(st.c[f.b].n)+'</span><span>'+(Math.abs(avg)<3?'at the border':Math.round(Math.abs(avg))+' km into '+esc(avg>0?st.c[f.b].n:st.c[f.a].n))+'</span></div>';}
  if(UI.sel&&st.c[UI.sel]){const p=st.c[UI.sel];h+='<div class="prof"><b>'+esc(p.n)+'</b> · <span class="'+(p.side==='B'?'b':p.side==='R'?'r':'n')+'">'+(p.side?(p.side==='B'?'BLUEFOR ':'REDFOR ')+AL[p.al]:AL[p.al])+'</span>'+
    '<div class="row"><span>Population (NE est.)</span><span>'+(p.pop/1e6).toFixed(1)+' M</span></div><div class="row"><span>GDP (NE est.)</span><span>$'+Math.round(p.gdp/1000)+' bn</span></div>'+
    '<div class="row"><span>Military airfields</span><span>'+p.mb+'</span></div><div class="row"><span>Combat aircraft (est.)</span><span>'+Math.round(p.air)+' / '+p.air0+'</span></div>'+
    '<div class="row"><span>Ground brigades (est.)</span><span>'+Math.round(p.gnd)+' / '+p.gnd0+'</span></div><div class="row"><span>War exhaustion</span><span>'+Math.round(p.exh*100)+' %</span></div>'+
    (p.hist.length?'<div style="font-size:10px;color:#8a9a92">'+p.hist.map(x=>esc(W.date(x[0]))+' '+x[1].toLowerCase()+' · '+esc(x[3])).join('<br>')+'</div>':'')+'</div>';}
  h+='<div style="font-size:10.5px;color:#8a9a92">WAR DIARY</div><div class="feed">'+st.ev.slice(-40).reverse().map(e=>'<div><em>D'+(Math.floor(e.t/24)+1)+' '+String(Math.floor(e.t%24)).padStart(2,'0')+'h</em>'+esc(e.txt)+(e.cf!=='CONFIRMED'?'<span class="cf">'+e.cf+'</span>':'')+'</div>').join('')+'</div>'+
   '<div class="disc">Fictional scenario. Force figures are estimates from population, economy and airfield counts, not real orders of battle.</div><div class="tc"><button data-w="new">NEW WAR</button></div>';
  el.innerHTML=h;}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('#wmWar [data-w]');if(!b)return;const k=b.dataset.w;
  if(k==='new'){if(W.st&&!confirm('Start a new world war? The current one is replaced.'))return;await W.newWar();W.run=false;}
  else if(k==='load'){if(!await W.load())alert('No saved world war.');}
  else if(k==='run')W.run=!W.run;else if(k==='spd')W.speed=+b.dataset.v;else if(k==='adv')W.step(+b.dataset.v);
  panel();WMAP.draw();});
const pick=(lat,lon)=>{const c=G.countryAt(lat,lon);UI.sel=c?c.a3:null;panel();WMAP.draw();};
// keep the panel and the map live while the war runs
setInterval(()=>{const m=document.getElementById('wmap');if(m&&!m.hidden){panel();if(W.run)WMAP.draw();}},1500);
{const _o=WMAP.open;WMAP.open=async function(){await _o.apply(this,arguments);if(!W.st)await W.load();panel();WMAP.draw();};
 const card=document.getElementById('sWORLD');if(card)card.onclick=()=>WMAP.open();}
window.WARMAP={draw,panel,pick,UI};
})();
