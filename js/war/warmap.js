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
const UI={sel:null,feed:'all'},AFTER=[];
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
  // v375: ground taken is shaded between the old border and today's line (the occupier's colour); the line itself is a
  // smooth curve through the sector positions, red / blue either side, its width following the zoom; breaks where the
  // border itself breaks (islands, gaps between sectors)
  const lw=Math.max(1.2,Math.min(4.5,M.ppd*.22)),gap=Math.max(30,M.ppd*1.3),col=s=>s==='B'?'91,225,255':'255,90,74';
  for(const f of st.fronts){const A=st.c[f.a],B=st.c[f.b];
    // v407: draw a smoothed line: offsets and normals averaged over neighbouring sectors (weights 1-2-3-2-1), so a long war
    // does not draw spikes, loops and crossings; a point that would run backwards along the front is dropped
    // v420: the sectors are ordered into continuous chains along the front first (the border pieces a front is made of
    // come in any order and direction), then smoothed along each chain, so the line follows the front without splits
    for(const run of frontRuns(f)){if(run.length<2)continue;const n=run.length,K=[1,2,4,6,4,2,1];
      const sm=run.map((s,i)=>{let o=0,nx=0,ny=0,w=0;for(let k=-3;k<=3;k++){const q=run[i+k];if(!q)continue;const ww=K[k+3];o+=q.off*ww;nx+=q.nx*ww;ny+=q.ny*ww;w+=ww;}const l=Math.hypot(nx,ny)||1;return{lat:s.lat,lon:s.lon,off:o/w,nx:nx/l,ny:ny/l};});
      let P=sm.map(s=>({l:w2s(s.lat+s.ny*s.off/111.2,s.lon+s.nx*s.off/(111.2*Math.cos(s.lat*D))),b:w2s(s.lat,s.lon),off:s.off}));
      P=P.filter((p,i)=>{if(!i||i===P.length-1)return true;const a=P[i-1],b=P[i+1];const bx=b.b[0]-a.b[0],by=b.b[1]-a.b[1],dx=p.l[0]-a.l[0],dy=p.l[1]-a.l[1];return bx*dx+by*dy>=0;});
      if(Math.abs(P[0].l[0]-P[P.length-1].l[0])>M.W*.5)continue;
      for(let i=0;i<P.length-1;i++){const p=P[i],q=P[i+1];const o=(p.off+q.off)/2;if(Math.abs(o)<.5)continue;
        c.fillStyle='rgba('+col(o>0?A.side:B.side)+','+Math.min(.42,.12+Math.abs(o)/150)+')';c.beginPath();c.moveTo(p.b[0],p.b[1]);c.lineTo(q.b[0],q.b[1]);c.lineTo(q.l[0],q.l[1]);c.lineTo(p.l[0],p.l[1]);c.closePath();c.fill();}
      const R=P.map(p=>p.l);
      // blue on the blue side, red on the red side: offset each colour along the local normal, not a fixed screen shift
      for(const[cl,sg]of[[A.side==='B'?'#5be1ff':'#ff5a4a',-1],[A.side==='B'?'#ff5a4a':'#5be1ff',1]]){c.strokeStyle=cl;c.lineWidth=lw;c.lineJoin='round';c.lineCap='round';
        const Q=R.map((p,i)=>{const a=R[Math.max(0,i-1)],b=R[Math.min(R.length-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;
          // screen normal pointing into country b
          const nb=w2s(sm[i].lat+sm[i].ny*.5,sm[i].lon+sm[i].nx*.5/Math.cos(sm[i].lat*D)),bb=w2s(sm[i].lat,sm[i].lon);let nx=-ty,ny=tx;if(nx*(nb[0]-bb[0])+ny*(nb[1]-bb[1])<0){nx=-nx;ny=-ny;}
          return[p[0]+nx*sg*lw*.55,p[1]+ny*sg*lw*.55];});
        c.beginPath();c.moveTo(Q[0][0],Q[0][1]);for(let i=1;i<Q.length-1;i++){const mx=(Q[i][0]+Q[i+1][0])/2,my=(Q[i][1]+Q[i+1][1])/2;c.quadraticCurveTo(Q[i][0],Q[i][1],mx,my);}c.lineTo(Q[Q.length-1][0],Q[Q.length-1][1]);c.stroke();}}}
  // cities that changed hands
  c.font='700 10px "B612 Mono",monospace';for(const[k,v]of Object.entries(st.cities)){if(v.h===v.own)continue;const[x,y]=w2s(v.lat,v.lon);c.strokeStyle='#ffcf5a';c.lineWidth=2;c.beginPath();c.moveTo(x-5,y-5);c.lineTo(x+5,y+5);c.moveTo(x+5,y-5);c.lineTo(x-5,y+5);c.stroke();if(M.ppd>=8){c.fillStyle='#ffcf5a';c.fillText(k.split('|')[0],x+7,y-6);}}
  if(UI.sel){const C=G.byA3.get(UI.sel);if(C){c.strokeStyle='#ffcf5a';c.lineWidth=1.5;c.beginPath();for(const r of C.r){let px=null;for(let i=0;i<r.length;i+=2){const[x,y]=w2s(r[i+1],r[i]);if(i===0||Math.abs(x-px)>M.W*.5)c.moveTo(x,y);else c.lineTo(x,y);px=x;}c.closePath();}c.stroke();}}}

// v420: chains of sectors in order along the front (nearest neighbour from an end), split where the border really
// breaks (> 250 km); cached on the front as indices, the sectors themselves never move
function frontRuns(f){const S0=f.sec;if(f._rn&&f._rn.n===S0.length)return f._rn.r.map(r=>r.map(i=>S0[i]));const n=S0.length,km=(a,b)=>Math.hypot((a.lon-b.lon)*111.2*Math.cos(a.lat*D),(a.lat-b.lat)*111.2);
  const left=new Set(S0.map((_,i)=>i)),runs=[];
  while(left.size){const L=[...left];let st=L[0],far=-1;const cx=L.reduce((t,i)=>t+S0[i].lon,0)/L.length,cy=L.reduce((t,i)=>t+S0[i].lat,0)/L.length;for(const i of L){const d=km(S0[i],{lon:cx,lat:cy});if(d>far){far=d;st=i;}}
    const run=[st];left.delete(st);let cur=st;for(;;){let bi=-1,bd=250;for(const i of left){const d=km(S0[cur],S0[i]);if(d<bd){bd=d;bi=i;}}if(bi<0)break;run.push(bi);left.delete(bi);cur=bi;}runs.push(run);}
  f._rn={n,r:runs};return runs.map(r=>r.map(i=>S0[i]));}
// v407: fronts relax: a sector far ahead of or behind both neighbours moves a little toward them each day (a front line
// is continuous; isolated salients are cut off or straightened), the total ground held is kept the same
if(W.daily)W.daily.push(()=>{const st=W.st;if(!st)return;for(const f of st.fronts)for(const S0 of frontRuns(f)){if(S0.length<3)continue;const d=S0.map((s,i)=>{const a=S0[i-1],b=S0[i+1];if(!a||!b)return 0;const m=(a.off+b.off)/2;return Math.abs(s.off-m)>8?(m-s.off)*.05:0;});
  const mean=d.reduce((t,x)=>t+x,0)/S0.length;S0.forEach((s,i)=>{s.off+=d[i]-mean;});}});
function panel(){const el=document.getElementById('wmWar');if(!el)return;const st=W.st;
  if(!st){el.innerHTML='<h3>WORLD WAR</h3><div class="disc">Fictional scenario: real countries, borders and airfields; an invented war. Not a prediction of what any country would do.</div><div class="tc"><button data-w="new">START · FORCES AS ESTIMATED</button><button data-w="new" data-v="EVEN">START · EVEN SIDES</button><button data-w="load">LOAD SAVED WAR</button></div>';return;}
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
  el.innerHTML=h;for(const f of AFTER)try{f();}catch(e){console.warn('[warmap]',e);}}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('#wmWar [data-w]');if(!b)return;const k=b.dataset.w;
  if(k==='new'){if(W.st&&!confirm('Start a new world war? The current one is replaced.'))return;await W.newWar(b.dataset.v||(W.st&&W.st.bal==='EVEN'?'EVEN':'EST'));W.run=false;}
  else if(k==='load'){if(!await W.load())alert('No saved world war.');}
  else if(k==='run')W.run=!W.run;else if(k==='spd')W.speed=+b.dataset.v;else if(k==='adv')W.step(+b.dataset.v);
  panel();WMAP.draw();});
const pick=(lat,lon)=>{const c=G.countryAt(lat,lon);UI.sel=c?c.a3:null;panel();WMAP.draw();};
// keep the panel and the map live while the war runs
setInterval(()=>{const m=document.getElementById('wmap');if(m&&!m.hidden){panel();if(W.run)WMAP.draw();}},1500);
{const _o=WMAP.open;WMAP.open=async function(){await _o.apply(this,arguments);if(!W.st)await W.load();panel();WMAP.draw();};
 const card=document.getElementById('sWORLD');if(card)card.onclick=()=>WMAP.open();}
window.WARMAP={draw,panel,pick,UI,after:AFTER};
})();
