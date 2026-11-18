/* =====================================================================================================================
   v351 — the land war by brigade (spec v49 ch.06 ground forces as persistent organizations, movement and manoeuvre,
   formation survival, artillery and fires, engineering; dynamic ground-force behaviour).
   Every ACTIVE brigade (orbat.js) now HOLDS A SECTOR of its front and is a unit on the map:
   * POSITION: behind its sector of the line on its own side (artillery deeper); it moves with the line as it moves.
   * CONCENTRATION: a sector's power for a country comes from the brigades actually in it and its two neighbours
     (relative to the country's average per sector), x0.6 to x1.5 — so where the brigades are matters.
   * TERRAIN: each sector's ground (mountain over 1,000 m, hills over 400 m, plains) from the elevation data; armour
     fights better on plains (+10 %), infantry in hills and mountains (+10 / +20 %), armour worse in mountains (-15 %).
   * ARTILLERY: artillery brigades fire in support of their own and the two neighbouring sectors (+6 % each, at most
     +18 %); short of artillery ammunition (military.js) they fire less.
   * ENGINEERS: a country's engineering capacity digs in brigades that HOLD or DEFEND (sector fortification up to +15 %
     against attacks into it) and repairs bridges and depots faster.
   * REDEPLOYMENT: each day the headquarters moves one brigade from its quietest sector to its most threatened one, or
     to the sector chosen for an attack (intent ATTACK); a brigade under 30 % strength withdraws to rebuild (orbat.js).
   * LOSSES: strategic ground losses on a front fall first on the brigades in the sectors where the line moved.
   * MAP: brigades are drawn on the war map as unit symbols (armour, mechanised, infantry, artillery) in their side's
     colour when zoomed in; the FORCES tab lists each brigade's sector, terrain and fortification.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.ob||!window.WARMAP)return;
const W=WWAR,G=WGEO,rn=Math.random;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const D2=Math.PI/180;
const terr=s=>{if(s.ter)return s.ter;let h=0;try{h=G.heightLL?G.heightLL(s.lat,s.lon):0;}catch(e){}return s.ter=h>1000?'MOUNTAIN':h>400?'HILLS':'PLAINS';};
const TK={ARM:{PLAINS:1.1,HILLS:1,MOUNTAIN:.85},MECH:{PLAINS:1.05,HILLS:1,MOUNTAIN:.95},INF:{PLAINS:.95,HILLS:1.1,MOUNTAIN:1.2},ART:{PLAINS:1,HILLS:1,MOUNTAIN:1}};
const B=(a3,fid)=>W.ob.units(a3).filter(u=>u.kind==='BDE'&&u.st==='ACTIVE'&&u.front===fid&&u.num!==0);
/* ------------------------------------------------------------------ assignment and positions */
function assign(){const st=W.st;for(const f of st.fronts)for(const a3 of[f.a,f.b]){const L=B(a3,f.id);if(!L.length)continue;const n=f.sec.length;
  L.forEach((u,i)=>{if(u.sec==null||u.sec>=n)u.sec=Math.floor((i+.5)*n/L.length)%n;});}}
function where(u,f){const s=f.sec[u.sec]||f.sec[0];const q=W.linePt(s),A=u.a3===f.a?-1:1;const back=(u.branch==='ART'?22:9)*A;   // own side: a is on the -normal side
  return{lat:q.lat+s.ny*back/111.2,lon:q.lon+s.nx*back/(111.2*Math.cos(q.lat*D2))};}
/* ------------------------------------------------------------------ sector power */
function power(p,f,si){const L=B(p.a3,f.id);if(!L.length)return 1;const n=f.sec.length,avg=L.reduce((t,u)=>t+u.str*u.ready,0)/n;let here=0,art=0;
  for(const u of L){const d=Math.abs(u.sec-si);if(u.branch==='ART'){if(d<=2)art++;continue;}const w=d===0?1:d===1?.5:0;if(w)here+=u.str*u.ready*w*TK[u.branch][terr(f.sec[si])];}
  const con=cl(Math.sqrt(here/Math.max(1e-3,avg*2)),.6,1.5),m=W.st.mil&&W.st.mil[p.a3],artK=1+Math.min(.18,art*.06)*(m&&m.mun.ART<5?.4:1);return con*artK;}
const fortK=(p,f,si)=>{const o=W.st.land&&W.st.land.fort[p.a3+':'+f.id+':'+si];return o||0;};
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);if(!W.st.ob||!s)return k;const si=f.sec.indexOf(s);if(si<0)return k;k*=power(p,f,si);const o=W.st.c[f.a===p.a3?f.b:f.a];k/=1+.15*fortK(o,f,si);return k;};}
/* ------------------------------------------------------------------ daily: dig in, redeploy, losses where the line moved */
function daily(){const st=W.st,Ld=st.land||(st.land={fort:{},last:{}});assign();
  for(const f of st.fronts){if(f.cf)continue;for(const a3 of[f.a,f.b]){const p=st.c[a3],m=st.mil&&st.mil[a3],L=B(a3,f.id);if(!L.length)continue;const intent=m&&m.intent[f.id];
    // engineers dig in where not attacking
    if(intent!=='ATTACK')for(const u of L){const k=a3+':'+f.id+':'+u.sec;Ld.fort[k]=Math.min(1,(Ld.fort[k]||0)+.01*(m?m.eng:.5));}
    // threat per sector: the other side's power there over ours
    const o=st.c[f.a===a3?f.b:f.a];const thr=f.sec.map((s,i)=>power(o,f,i)/Math.max(.2,power(p,f,i)));
    const own=L.filter(u=>u.branch!=='ART'&&u.str/u.str0>.3);if(own.length<2)continue;
    let tgt;if(intent==='ATTACK'){tgt=thr.indexOf(Math.min(...thr));}else tgt=thr.indexOf(Math.max(...thr));
    const cnt=i=>own.filter(u=>u.sec===i).length,src=own.filter(u=>u.sec!==tgt&&cnt(u.sec)>0).sort((a,b)=>thr[a.sec]-thr[b.sec])[0];
    if(src&&(intent==='ATTACK'||thr[tgt]>1.3)&&rn()<.5){const from=src.sec;src.sec=tgt;src.hist.push([st.t,'redeployed from sector '+(from+1)+' to sector '+(tgt+1)]);
      if(rn()<.15)W.emit('GROUND',{e:[a3],txt:'The '+src.name+' ('+p.n+') moves to sector '+(tgt+1)+' of the front with '+o.n+(intent==='ATTACK'?' for the attack':' to meet the threat there')+'.'});}}
    // losses where the line moved: the brigades in moving sectors take extra wear (the aggregate stays the authority: orbat reconciles)
    for(let i=0;i<f.sec.length;i++){const s=f.sec[i],k=f.id+':'+i,prev=Ld.last[k]??s.off;Ld.last[k]=s.off;const mv=Math.abs(s.off-prev);if(mv<.5)continue;
      for(const a3 of[f.a,f.b])for(const u of B(a3,f.id))if(Math.abs(u.sec-i)<=0&&u.branch!=='ART')u.ready=Math.max(.2,u.ready-.01*mv);}}}
W.daily.push(()=>{if(W.st&&W.st.ob&&!W.st.over)daily();});
/* ------------------------------------------------------------------ map symbols */
{const _d=WARMAP.draw;WARMAP.draw=function(c,w2s,M,phase){const r=_d.apply(this,arguments);if(phase!=='over'||!W.st||!W.st.ob||M.ppd<6)return r;
  for(const f of W.st.fronts)for(const a3 of[f.a,f.b]){const p=W.st.c[a3];for(const u of B(a3,f.id)){if(u.sec==null)continue;const q=where(u,f),[x,y]=w2s(q.lat,q.lon);const col=p.side==='B'?'#5be1ff':'#ff7a68';
    c.strokeStyle=col;c.fillStyle='rgba(10,14,16,.75)';c.lineWidth=1.3;c.fillRect(x-7,y-4.5,14,9);c.strokeRect(x-7,y-4.5,14,9);c.beginPath();
    if(u.branch==='ARM'||u.branch==='MECH'){c.ellipse(x,y,4.5,2.6,0,0,7);}if(u.branch==='INF'||u.branch==='MECH'){c.moveTo(x-7,y-4.5);c.lineTo(x+7,y+4.5);c.moveTo(x+7,y-4.5);c.lineTo(x-7,y+4.5);}
    if(u.branch==='ART'){c.arc(x,y,1.8,0,7);c.fillStyle=col;c.fill();}c.stroke();
    if(u.str/u.str0<.5){c.fillStyle=col;c.fillRect(x-7,y+5.5,14*u.str/u.str0,1.6);}}}return r;};}
/* ------------------------------------------------------------------ FORCES tab additions */
if(window.NATPANEL&&NATPANEL.tabs){const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  NATPANEL.tabs.LAND=p=>{const st=W.st;if(!st.ob)return'<div>No order of battle.</div>';const F=st.fronts.filter(f=>f.a===p.a3||f.b===p.a3);if(!F.length)return'<div>No fronts.</div>';
    return '<div style="font-size:10px;color:#8a9a92">Brigades by sector. Symbols on the war map when zoomed in: oval armour, cross infantry, both mechanised, dot artillery.</div>'+F.map(f=>{const o=st.c[f.a===p.a3?f.b:f.a];
      return '<h4>FRONT WITH '+esc(o.n.toUpperCase())+'</h4>'+f.sec.map((s,i)=>{const L=B(p.a3,f.id).filter(u=>u.sec===i);if(!L.length)return'';const fo=fortK(p,f,i);
        return '<div class="row"><span>Sector '+(i+1)+' · '+terr(s).toLowerCase()+(fo>.05?' · dug in '+Math.round(fo*100)+' %':'')+'</span><b>'+L.map(u=>esc(u.name)+' '+Math.round(u.str/u.str0*100)+' %').join('; ')+'</b></div>';}).join('');}).join('');};}
W.land={assign,where,power,terr,daily,B};
})();
