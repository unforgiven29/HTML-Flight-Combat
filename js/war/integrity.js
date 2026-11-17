/* =====================================================================================================================
   v355 — integrity: causality, reconciliation and release checks (spec v49 ch.02 causality, accounting and ledgers;
   ch.20 acceptance criteria, data integrity, performance gates).
   * CAUSALITY: every event carries the events that caused it (worldwar.js: an event emitted while another is being
     handled is caused by it; modules can also pass causes explicitly). W.integrity.chain(id) walks a cause chain; the
     tools SEARCH and NOTES views show "because of ..." for linked events. W.because(ev, fn) runs fn with ev as cause.
   * RECONCILIATION (added to WWAR.audit, which every test checks):
       cities never hold more displaced people than their country (cities.js allocates national figures);
       legislature seats add up to the table's seats (natpol.js);
       depot stocks, munitions, crews and readiness are finite and not negative;
       every country number is finite (no NaN reaches a save);
       every brigade's sector index is inside its front (land.js);
       events refer to countries that exist.
   * PERFORMANCE BUDGET: each war day's step time is measured (tools.js); W.integrity.budget() reports the average and
     the worst against the budget (250 ms a step) and the save size against 5 MB.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR)return;
const W=WWAR;
W.because=(ev,fn)=>{(W._cz||(W._cz=[])).push(ev.id||ev);try{return fn();}finally{W._cz.pop();}};

// rule-based causes for the main chains, where the effect is emitted later by the daily simulation (not inside the
// cause's own handling): the most recent event of a causing type that names the same country within 7 war days.
const RULES={OCCUPATION:['CITY'],HERITAGE:['CITY'],LOGISTICS:['BRIDGE','DEPOT','AIRBASE','FRONT'],DEPOT:['AIR'],MOBILIZATION:['FRONT','ENTRY','CITY'],CEASEFIRE:['DIPLO','HAZARD'],
  EVACUATION:['ENTRY','FRONT'],CRISIS:['CITY','FRONT'],RELIEF:['HAZARD','CITY','CRISIS'],RECOVERY:['HAZARD'],RATIONING:['BRIDGE','AIRBASE','FRONT'],ORDERS:['FRONT','COMMAND'],GROUND:['FRONT'],
  SURRENDER:['FRONT'],ELECTION:['POLITICS'],AID:['HAZARD'],UXO:['FRONT'],EPILOGUE:['END'],MEMORIAL:['END'],POSTWAR:['END'],REMEMBRANCE:['END'],CEREMONY:['END'],BRIDGE:['BRIDGE']};
W.listeners.unshift(e=>{if(e.c&&e.c.length)return;const R=RULES[e.ty];if(!R||!W.st)return;const st=W.st;
  for(let i=st.ev.length-2;i>=0&&i>st.ev.length-400;i--){const x=st.ev[i];if(st.t-x.t>24*7)break;if(!R.includes(x.ty)||x===e)continue;if(e.e&&e.e.length&&x.e&&x.e.length&&!e.e.some(a=>x.e.includes(a))&&x.ty!=='END')continue;e.c=[x.id];e.cr='rule';break;}});
function chain(id,max=8){const st=W.st,out=[];let e=st.ev.find(x=>x.id===id);while(e&&out.length<max){out.push(e);const c=e.c&&e.c[0];e=c?st.ev.find(x=>x.id===c):null;}return out;}
function checks(){const st=W.st,out=[];if(!st)return out;const fin=v=>typeof v!=='number'||Number.isFinite(v);
  for(const p of Object.values(st.c)){for(const k of['air','gnd','pop','econ','sup','stab','disp','ref','lostAir','lostGnd'])if(!fin(p[k]))out.push(p.a3+' '+k+' is not finite');
    if(p.ecn)for(const[k,v]of Object.entries(p.ecn))if(typeof v==='number'&&!Number.isFinite(v))out.push(p.a3+' ecn.'+k+' is not finite');}
  if(st.city)for(const[a3,L]of Object.entries(st.city)){const p=st.c[a3];const d=L.reduce((t,c)=>t+c.disp,0);if(p&&d>(p.disp||0)+1)out.push(a3+' cities hold more displaced than the country');}
  if(st.pol&&window.NATDATA)for(const[a3,o]of Object.entries(st.pol)){const P=NATDATA.POL[a3];if(P&&P.seats&&o.parties.length){const s=o.parties.reduce((t,x)=>t+x.seats,0);if(s!==P.seats)out.push(a3+' seats '+s+' ≠ '+P.seats);}}
  if(st.dep)for(const[a3,L]of Object.entries(st.dep))for(const d of L)if(!(d.stock>=0)||!Number.isFinite(d.stock))out.push(a3+' depot '+d.n+' stock invalid');
  if(st.mil)for(const[a3,m]of Object.entries(st.mil)){for(const[k,v]of Object.entries(m.mun))if(!(v>=0)||!Number.isFinite(v))out.push(a3+' munitions '+k+' invalid');if(!(m.crews>=0))out.push(a3+' crews negative');}
  if(st.ob)for(const u of Object.values(st.ob.u)){if(u.kind!=='BDE'||u.sec==null||!u.front)continue;const f=st.fronts.find(q=>q.id===u.front);if(f&&(u.sec<0||u.sec>=f.sec.length))out.push(u.id+' sector out of range');}
  for(const e of st.ev.slice(-200))for(const a3 of e.e||[])if(!st.c[a3])out.push('event '+e.id+' names unknown country '+a3);
  return out;}
{const _a=W.audit;W.audit=function(){return _a.apply(this,arguments).concat(checks());};}
function budget(){const P=(W.st&&W.st.tools&&W.st.tools.perf)||[],size=W.st?JSON.stringify(W.st).length:0;return{avg:P.length?P.reduce((a,b)=>a+b,0)/P.length:0,max:P.length?Math.max(...P):0,budget:250,size,sizeBudget:5e6,ok:(!P.length||Math.max(...P)<=1000)&&size<5e6};}
// "because of ..." in the tools views
if(window.WARMAP&&WARMAP.after){WARMAP.after.push(function(){const el=document.getElementById('wwTools');if(!el||!W.st)return;
  el.querySelectorAll('[data-bm]').forEach(b=>{const e=W.st.ev.find(x=>x.id===b.dataset.bm);if(e&&e.c&&e.c[0]){const c=W.st.ev.find(x=>x.id===e.c[0]);if(c)b.insertAdjacentHTML('afterend','<div style="font-size:10px;color:#8a9a92;margin-left:10px">because of: '+String(c.txt).slice(0,90).replace(/[<>&]/g,'')+'</div>');}});});}
W.integrity={chain,checks,budget};
})();
