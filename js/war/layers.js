/* =====================================================================================================================
   v344 — map layers and overlays (spec v49 ch.17 map layers, filters and accessibility; fuel and energy overlays; live
   force dashboards). One layer at a time over the war map, colouring each country by a measure, with a legend:
   ENERGY (power), FUEL (days of stocks), SUPPLY (brigade readiness), DISPLACED (share of population), SERVICES
   (public services), INFLATION, INTEL (what your side knows: grey where it knows little). Colours are a single-hue
   ramp (light to dark) that reads without colour vision; values are shown on hover in the panel legend.
   A FORCES dashboard lists your side's countries with air, ground, readiness, munitions and fuel at a glance.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WARMAP)return;
const W=WWAR,G=WGEO;
const LAY={ENERGY:p=>p.ecn&&p.ecn.energy,FUEL:p=>p.ecn&&Math.min(1,p.ecn.fuel/60),SUPPLY:p=>{const U=W.ob&&W.st.ob&&W.ob.units(p.a3).filter(u=>u.kind==='BDE');return U&&U.length?U.reduce((t,u)=>t+u.ready,0)/U.length:null;},
  DISPLACED:p=>p.disp?1-Math.min(1,p.disp/Math.max(1,p.pop)*10):null,SERVICES:p=>p.life&&Object.values(p.life.svc).reduce((a,b)=>a+b,0)/6,INFLATION:p=>p.life&&1-Math.min(1,p.life.fin.infl/.5),
  INTEL:p=>{const X=W.st.intel,me=(typeof game!=='undefined'&&game.team==='RED')?'R':'B';if(!X||!p.side||p.side===me)return null;return X[me].q;}};
const UI={l:''};
// 1 = good (light), 0 = bad (dark): one hue, varying lightness
const ramp=v=>{const L=Math.round(85-v*0,0);const l=Math.round(22+63*v);return 'hsla(35,85%,'+l+'%,.62)';};
{const _d=WARMAP.draw;WARMAP.draw=function(c,w2s,M,phase){const r=_d.apply(this,arguments);if(phase!=='under'||!UI.l||!W.st)return r;const f=LAY[UI.l];
  for(const C of G.countries){const p=W.st.c[C.a3];if(!p)continue;let v;try{v=f(p);}catch(e){v=null;}if(v==null||!Number.isFinite(v))continue;c.fillStyle=ramp(Math.max(0,Math.min(1,v)));c.beginPath();
    for(const rr of C.r){let px=null;for(let i=0;i<rr.length;i+=2){const[x,y]=w2s(rr[i+1],rr[i]);if(i===0||Math.abs(x-px)>M.W*.5)c.moveTo(x,y);else c.lineTo(x,y);px=x;}c.closePath();}c.fill('evenodd');}
  return r;};}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function dash(){const st=W.st,me=(typeof game!=='undefined'&&game.team==='RED')?'R':'B';const L=Object.values(st.c).filter(p=>p.side===me&&(p.al==='CORE'||p.al==='ALLY')).sort((a,b)=>b.air-a.air).slice(0,10);
  return '<table style="width:100%;font-size:10px;border-collapse:collapse"><tr><th align="left">COUNTRY</th><th>AIR</th><th>GND</th><th>READY</th><th>MUN</th><th>FUEL</th></tr>'+L.map(p=>{const m=st.mil&&st.mil[p.a3];const mun=m?Math.round(Math.min(...Object.values(m.mun))):'—';
    return '<tr><td>'+esc(p.n)+'</td><td align="center">'+Math.round(p.air)+'</td><td align="center">'+Math.round(p.gnd)+'</td><td align="center">'+Math.round(p.ready*100)+'%</td><td align="center"'+(mun!=='—'&&mun<8?' style="color:#e07a5f"':'')+'>'+mun+'d</td><td align="center">'+(p.ecn?Math.round(p.ecn.fuel)+'d':'—')+'</td></tr>';}).join('')+'</table>';}
function render(){const el=document.getElementById('wmWar');if(!el||!W.st)return;el.querySelector('#wwLay')&&el.querySelector('#wwLay').remove();
  const h='<div id="wwLay" class="prof"><b>MAP LAYER</b><div class="tabs" style="display:flex;flex-wrap:wrap;gap:3px">'+['',...Object.keys(LAY)].map(k=>'<button data-ly="'+k+'" aria-pressed="'+(UI.l===k)+'">'+(k||'NONE')+'</button>').join('')+'</div>'+
    (UI.l?'<div style="display:flex;align-items:center;gap:6px;font-size:10px">worse <span style="display:inline-block;width:90px;height:8px;background:linear-gradient(90deg,'+ramp(0)+','+ramp(1)+')"></span> better'+(UI.l==='INTEL'?' (your knowledge of enemy countries)':'')+'</div>':'')+
    '<details><summary>YOUR SIDE AT A GLANCE</summary>'+dash()+'</details></div>';
  el.insertAdjacentHTML('beforeend',h);}
WARMAP.after.push(render);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wwLay [data-ly]');if(!b)return;UI.l=b.dataset.ly;WARMAP.panel();if(window.WMAP)WMAP.draw();});
W.layers={LAY,UI,ramp,dash};
})();
