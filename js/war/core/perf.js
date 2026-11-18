/* =====================================================================================================================
   v361 — performance: smooth stepping, level of detail, bounded saves (spec v49 ch.04 adaptive workload scheduling and
   fidelity tiers, browser-safe multi-scale updates, state compression and storage quotas; ch.20 performance gates).
   * SMOOTH STEPPING: when the war clock runs fast, a long step is split into six-hour chunks spread over animation
     frames, so the map and the flight never freeze for a whole war day at once. Direct calls (tests, ADVANCE buttons)
     stay synchronous.
   * LEVEL OF DETAIL (W.lod): countries at war, and countries next to a war, update every day; distant neutral countries
     update their slow processes (population, services, inventories) once a week on a staggered day — the same totals
     over time, a seventh of the work.
   * BOUNDED SAVES (W.compact): if a save would exceed 4.5 MB, the oldest history is compacted — trends to weekly, logs
     trimmed, folded event counts kept, the death ledger and every person record kept whole (never deleted to save
     space, per ch.04).
   * MEASURED: the step-time history (tools.js) and the budget (integrity.js) show the effect; the DEBUG view reports
     chunks and LOD skips.
   The war simulation still runs on the page's main thread (a background worker would need the whole simulation
   separated from the page's 3D and DOM globals; not done).
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR)return;
const W=WWAR,P={chunks:0,skips:0,q:0};
// level of detail
const near=new Map();
W.lod=(p,day)=>{const st=W.st;if(p.side&&(p.al==='CORE'||p.al==='ALLY'))return true;let n=near.get(p.a3);if(n==null||day%30===0){const c=WGEO.byA3.get(p.a3);n=!!(c&&st.fronts.some(f=>{const s=f.sec[0];return WGEO.dist(c.ly,c.lx,s.lat,s.lon)<1.5e6;}));near.set(p.a3,n);}
  if(n)return true;let h=0;for(const ch of p.a3)h+=ch.charCodeAt(0);if(day%7===h%7)return true;P.skips++;return false;};
// smooth stepping: only for the running clock
{const _s=W.step;W.step=function(h){if(!W.run||h<=6||P.busy)return _s.call(this,h);P.busy=true;let left=h;const run=()=>{const k=Math.min(6,left);left-=k;P.chunks++;try{_s.call(W,k);}catch(e){console.warn('[perf]',e);}if(left>1e-9&&W.run)requestAnimationFrame(run);else P.busy=false;};run();};}
// bounded saves
W.compact=()=>{const st=W.st;if(!st)return;const T=st.tools;if(T&&T.trend)for(const s of['B','R'])if(T.trend[s]&&T.trend[s].length>60){T.trend[s+'w']=(T.trend[s+'w']||[]).concat(T.trend[s].splice(0,T.trend[s].length-60).filter(x=>x[0]%7===0)).slice(-150);}
  if(st.ev&&st.ev.length>600){const n=st.ev.length-600;for(const x of st.ev.splice(0,n))st.fold[x.ty]=(st.fold[x.ty]||0)+1;st.folded=(st.folded||0)+n;}
  if(st.sea2&&st.sea2.log)st.sea2.log.length=Math.min(st.sea2.log.length,20);if(st.frc&&st.frc.deals)st.frc.deals=st.frc.deals.slice(-60);
  for(const H of Object.values(st.lives||{}))for(const h of H)h.log.length=Math.min(h.log.length,4);P.compacted=(P.compacted||0)+1;};
W.perf=P;
})();
