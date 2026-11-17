/* =====================================================================================================================
   v341 — campaign tools: time, persistence and the information layer (spec v49 ch.04 world clock, scheduling,
   persistence and performance; ch.17 interface, dashboards, notifications, statistics, search, calendar, archive,
   accessibility, developer views; ch.15 explainable AI decisions).
   CH.04
   * Multi-rate scheduling: W.weekly and W.monthly hook lists, run from the daily step (every 7th / 30th war day).
   * Bounded catch-up: one timer tick never advances more than 48 war hours (a long tab sleep does not jump months);
     adaptive workload: if a step costs more than 250 ms the speed drops one notch (event in the debug view).
   * Save slots: three named slots in this browser, plus EXPORT (a .json file) and IMPORT. Every save carries the
     format version; imports are validated (countries, fronts, clock) before they replace the running war.
   * History compaction already folds events beyond 900 (worldwar.js); trends are kept daily for 120 days, weekly after.
   CH.17
   * Status bar: date, clock state, your side's air situation and fronts, unread notifications.
   * Notification centre: important events (endings, ceasefires, mobilization, orders, base strikes, cyber, arms for
     your side, your watchlist), unread count, mark read.
   * Trends: per side combat aircraft, ground strength, average economy and public support (sparklines).
   * Search events by text; watchlist of countries (their events notify you); bookmarks of events.
   * Calendar: what is scheduled — training cohorts, arms deliveries, bridge repairs, ceasefire ends, programmes.
   * Accessibility: text size, high contrast, reduced motion for the war panels and the end-of-war page.
   * Developer view (?wwdebug in the address): step timings, record counts, hook counts.
   CH.15
   * Decisions explained: an AI decision log (orders with their reasons, mobilization, arms, strategy) per country.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR)return;
const W=WWAR,VER=341;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mine=()=>(typeof game!=='undefined'&&game.team==='RED')?'R':'B';
const T=()=>{const st=W.st;return st.tools||(st.tools={read:0,watch:[],bm:[],trend:{B:[],R:[]},perf:[]});};
/* ------------------------------------------------------------------ ch.04: rates, catch-up, budget */
W.weekly=W.weekly||[];W.monthly=W.monthly||[];
W.daily.push(()=>{const st=W.st;if(!st)return;const d=Math.floor(st.t/24);if(d%7===0)for(const f of W.weekly)try{f();}catch(e){}if(d%30===0)for(const f of W.monthly)try{f();}catch(e){}trend();});
{const _s=W.step;W.step=function(h){const H=W.run?Math.min(48,h):h,t0=performance.now();   /* the running clock catches up at most 48 war hours per tick */const r=_s.call(this,H);const ms=performance.now()-t0;
  if(W.st){const P=T().perf;P.push(Math.round(ms));if(P.length>60)P.shift();if(ms>250&&W.run&&W.speed>1&&h<48){const L=[1,6,24];W.speed=L[Math.max(0,L.indexOf(W.speed)-1)]||1;W._slow=(W._slow||0)+1;}}return r;};}
/* ------------------------------------------------------------------ trends */
function trend(){const st=W.st,tr=T().trend;for(const s of['B','R']){const L=Object.values(st.c).filter(p=>p.side===s&&(p.al==='CORE'||p.al==='ALLY'));if(!L.length)continue;
  const v=[Math.floor(st.t/24),Math.round(L.reduce((t,p)=>t+p.air,0)),Math.round(L.reduce((t,p)=>t+p.gnd,0)),Math.round(100*L.reduce((t,p)=>t+(p.econ??1),0)/L.length),Math.round(100*L.reduce((t,p)=>t+(p.sup??.6),0)/L.length)];
  tr[s].push(v);if(tr[s].length>120){const old=tr[s].splice(0,tr[s].length-120);tr[s+'w']=(tr[s+'w']||[]).concat(old.filter(x=>x[0]%7===0)).slice(-260);}}}
function spark(a,i,col){if(!a||a.length<2)return'';const v=a.map(x=>x[i]),mx=Math.max(...v),mn=Math.min(...v),w=150,h=26;const pts=v.map((y,k)=>(k/(v.length-1)*w).toFixed(1)+','+(h-2-(mx===mn?h/2:(y-mn)/(mx-mn)*(h-4))).toFixed(1)).join(' ');
  return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="trend"><polyline fill="none" stroke="'+col+'" stroke-width="1.5" points="'+pts+'"/></svg>';}
/* ------------------------------------------------------------------ notifications */
const IMP=/^(END|CEASEFIRE|MOBILIZATION|ORDERS|AIRBASE|CYBER|SPACE|BRIDGE|COMMAND|NAVAL|MEMORIAL|EPILOGUE|ENTRY|EXIT|COUP|ASSASSINATION|SQUADRON|AWARD)$/;
function notes(){const st=W.st,t=T(),me=mine(),w=new Set(t.watch);return st.ev.filter(e=>{if(w.size&&e.e&&e.e.some(a=>w.has(a)))return true;if(!IMP.test(e.ty))return false;
  if(!e.e||!e.e.length)return true;return e.e.some(a=>st.c[a]&&st.c[a].side===me);});}
/* ------------------------------------------------------------------ calendar */
function calendar(){const st=W.st,out=[];const add=(t,txt)=>{if(t>st.t)out.push([t,txt]);};
  for(const a3 in st.mil||{}){const m=st.mil[a3],n=st.c[a3].n;for(const c of m.trn)add(c.t,n+': about '+Math.round(c.n/1000)+',000 '+c.k.toLowerCase()+' finish training');for(const d of m.inb)add(d.t,n+': arms delivery from '+st.c[d.from].n);for(const q of m.pend)add(q.t,n+': new orders reach a front ('+q.i.toLowerCase()+')');}
  for(const d of (st.frc&&st.frc.deals)||[])if(d.st==='AGREED')add(d.due,st.c[d.buyer].n+': deliveries due from '+st.c[d.seller].n);
  for(const g of (st.frc&&st.frc.prog)||[])if(g.st==='DEVELOPMENT')add(g.due,st.c[g.a3].n+': '+g.n+' due to be fielded');
  for(const k in (st.br&&st.br.cut)||{}){const c=st.br.cut[k];add(c.fix,st.c[c.a3].n+': a destroyed bridge due to be repaired');}
  for(const f of st.fronts)if(f.cf&&f.cf.until)add(f.cf.until,'Ceasefire ends on the '+st.c[f.a].n+' / '+st.c[f.b].n+' front');
  return out.sort((a,b)=>a[0]-b[0]).slice(0,25);}
/* ------------------------------------------------------------------ saves */
const SLOT=i=>'viper.ww.slot'+i;
function saveSlot(i,name){try{localStorage.setItem(SLOT(i),JSON.stringify({v:VER,name:name||('Slot '+(i+1)),at:Date.now(),day:Math.floor(W.st.t/24),st:W.st}));return true;}catch(e){return false;}}
function valid(st){return st&&typeof st==='object'&&st.c&&typeof st.c==='object'&&Array.isArray(st.fronts)&&Array.isArray(st.th)&&Number.isFinite(st.t)&&Array.isArray(st.ev);}
function loadSlot(i){try{const o=JSON.parse(localStorage.getItem(SLOT(i))||'null');if(!o||!valid(o.st))return false;W.st=o.st;W.run=false;return true;}catch(e){return false;}}
function slots(){return[0,1,2].map(i=>{try{const o=JSON.parse(localStorage.getItem(SLOT(i))||'null');return o?{i,name:o.name,day:o.day,at:o.at,v:o.v}:{i};}catch(e){return{i};}});}
function exportFile(){const b=new Blob([JSON.stringify({v:VER,st:W.st})],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='world-war-day'+Math.floor(W.st.t/24)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}
function importText(txt){try{const o=JSON.parse(txt),st=o.st||o;if(!valid(st))return'not a world-war save';W.st=st;W.run=false;return'';}catch(e){return'unreadable file';}}
/* ------------------------------------------------------------------ AI decision log (explained) */
const DEC=/^(ORDERS|MOBILIZATION|ARMS|STRATEGY|DIPLO|ENTRY|EXIT|PROGRAMME)$/;
function decisions(a3){return W.st.ev.filter(e=>DEC.test(e.ty)&&(!a3||(e.e||[]).includes(a3))).slice(-12).reverse();}
/* ------------------------------------------------------------------ accessibility */
const A11Y=(()=>{try{return JSON.parse(localStorage.getItem('viper.a11y')||'{}');}catch(e){return{};}})();
function applyA11y(){let s=document.getElementById('wwA11y');if(!s){s=document.createElement('style');s.id='wwA11y';document.head.appendChild(s);}
  s.textContent=(A11Y.big?'#wmWar,#wwEnd{font-size:'+(A11Y.big===2?'15px':'13px')+' !important}':'')+(A11Y.hc?'#wmWar{background:#000 !important;color:#fff !important}#wmWar button{border:1px solid #fff !important;color:#fff !important}':'')+
    (A11Y.rm||matchMedia('(prefers-reduced-motion: reduce)').matches?'#wwEnd,#wwEnd .s{transition:none !important}':'');}
applyA11y();
/* ------------------------------------------------------------------ the panel */
const UI={open:'',q:''};
function render(){const el=document.getElementById('wmWar'),st=W.st;if(!el||!st)return;el.querySelector('#wwTools')&&el.querySelector('#wwTools').remove();el.querySelector('#wwBar')&&el.querySelector('#wwBar').remove();
  const t=T(),me=mine(),N=notes(),unread=N.filter(e=>e.t>t.read).length,th=st.th.map(x=>me==='B'?x.sup:-x.sup),air=th.length?th.reduce((a,b)=>a+b,0)/th.length:0;
  const bar='<div id="wwBar" class="row" style="gap:6px;flex-wrap:wrap;border-bottom:1px solid #333;padding-bottom:3px"><span>'+esc(W.date(st.t).slice(0,10))+' · '+(st.over?'WAR OVER':W.run?'RUNNING ×'+W.speed:'PAUSED')+'</span><span>AIR '+(Math.abs(air)<.1?'CONTESTED':air>0?'YOURS':'THEIRS')+'</span><span>FRONTS '+st.fronts.filter(f=>!f.cf).length+' ACTIVE</span><button data-wt="NOTES">🔔 '+unread+'</button></div>';
  const tabs=['NOTES','TRENDS','SEARCH','CALENDAR','SAVES','AI LOG','ACCESS'].concat(/wwdebug/.test(location.search)?['DEBUG']:[]);
  let h='<div id="wwTools" class="prof"><div class="tabs" style="display:flex;flex-wrap:wrap;gap:3px">'+tabs.map(k=>'<button data-wt="'+k+'" aria-pressed="'+(UI.open===k)+'">'+k+'</button>').join('')+'</div>';
  const o=UI.open;
  if(o==='NOTES')h+='<div class="tc"><button data-wta="read">MARK ALL READ</button></div>'+N.slice(-25).reverse().map(e=>'<div style="'+(e.t>t.read?'font-weight:bold':'')+'">'+esc(W.date(e.t).slice(5,10))+' · '+esc(e.txt)+' <button data-bm="'+e.id+'" title="bookmark">☆</button></div>').join('')+
    (t.bm.length?'<h4>BOOKMARKS</h4>'+t.bm.map(id=>st.ev.find(e=>e.id===id)).filter(Boolean).map(e=>'<div>★ '+esc(e.txt)+'</div>').join(''):'');
  if(o==='TRENDS')h+=['B','R'].map(s=>{const a=t.trend[s];return '<h4>'+(s==='B'?'BLUEFOR':'REDFOR')+(a.length?' · DAY '+a[0][0]+'–'+a[a.length-1][0]:'')+'</h4>'+[['Combat aircraft',1],['Ground strength',2],['Economy %',3],['Public support %',4]].map(([n,i])=>'<div class="row"><span>'+n+' '+(a.length?a[a.length-1][i]:'')+'</span>'+spark(a,i,s==='B'?'#6aa9e0':'#e07a6a')+'</div>').join('');}).join('');
  if(o==='SEARCH'){const q=UI.q.toLowerCase();const R=q?st.ev.filter(e=>e.txt.toLowerCase().includes(q)||e.ty.toLowerCase()===q).slice(-30).reverse():[];
    h+='<div><input id="wwQ" value="'+esc(UI.q)+'" placeholder="search events" style="width:150px"> <button data-wta="q">SEARCH</button></div>'+R.map(e=>'<div>'+esc(W.date(e.t).slice(0,10))+' · '+esc(e.ty)+' · '+esc(e.txt)+'</div>').join('')+
      '<h4>WATCHLIST</h4><div>'+(t.watch.map(a=>esc(st.c[a]?st.c[a].n:a)+' <button data-uw="'+a+'">×</button>').join(' ')||'empty')+'</div>'+(WARMAP.UI.sel&&!t.watch.includes(WARMAP.UI.sel)?'<button data-wta="watch">WATCH '+esc(st.c[WARMAP.UI.sel].n)+'</button>':'');}
  if(o==='CALENDAR'){const C=calendar();h+=C.length?C.map(([tt,x])=>'<div>'+esc(W.date(tt).slice(0,10))+' · '+esc(x)+'</div>').join(''):'<div>Nothing scheduled.</div>';}
  if(o==='SAVES')h+=slots().map(s=>'<div class="row"><span>'+(s.name?esc(s.name)+' · day '+s.day:'Slot '+(s.i+1)+' (empty)')+'</span><span><button data-sv="'+s.i+'">SAVE</button>'+(s.name?' <button data-ld="'+s.i+'">LOAD</button>':'')+'</span></div>').join('')+
    '<div class="tc"><button data-wta="exp">EXPORT FILE</button> <label><input type="file" id="wwImp" accept=".json" style="display:none"><span style="cursor:pointer;border:1px solid #555;padding:2px 6px">IMPORT FILE</span></label></div><div id="wwSvS" style="font-size:10px"></div>';
  if(o==='AI LOG'){const a3=WARMAP.UI.sel;h+='<div style="font-size:10px;color:#8a9a92">Decisions by governments and headquarters'+(a3?' of '+esc(st.c[a3].n):'')+', with their stated reasons.</div>'+decisions(a3).map(e=>'<div>'+esc(W.date(e.t).slice(0,10))+' · '+esc(e.txt)+'</div>').join('');}
  if(o==='ACCESS')h+=['big','hc','rm'].map(k=>'<div class="row"><span>'+{big:'Larger text',hc:'High contrast',rm:'Reduced motion'}[k]+'</span><button data-ax="'+k+'" aria-pressed="'+!!A11Y[k]+'">'+(k==='big'?['OFF','LARGE','LARGER'][A11Y.big||0]:A11Y[k]?'ON':'OFF')+'</button></div>').join('');
  if(o==='DEBUG'){const P=t.perf;h+='<div>Step ms (last 60): avg '+(P.length?Math.round(P.reduce((a,b)=>a+b,0)/P.length):0)+', max '+(P.length?Math.max(...P):0)+' · slowdowns '+(W._slow||0)+'</div><div>Events '+st.ev.length+' (folded '+(st.folded||0)+') · countries '+Object.keys(st.c).length+' · fronts '+st.fronts.length+' · daily hooks '+W.daily.length+' · weekly '+W.weekly.length+' · monthly '+W.monthly.length+'</div><div>Save size ~'+Math.round(JSON.stringify(st).length/1024)+' KB</div>';}
  h+='</div>';el.insertAdjacentHTML('afterbegin',bar);el.insertAdjacentHTML('beforeend',h);}
if(window.WARMAP&&WARMAP.after)WARMAP.after.push(render);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wwTools button,#wwBar button');if(!b||!W.st)return;const t=T(),d=b.dataset;
  if(d.wt)UI.open=UI.open===d.wt?'':d.wt;else if(d.wta==='read')t.read=W.st.t;else if(d.bm){if(!t.bm.includes(d.bm))t.bm.push(d.bm);}
  else if(d.wta==='q'){const i=document.getElementById('wwQ');UI.q=i?i.value:'';}else if(d.wta==='watch')t.watch.push(WARMAP.UI.sel);else if(d.uw)t.watch=t.watch.filter(a=>a!==d.uw);
  else if(d.sv!=null)saveSlot(+d.sv,'Day '+Math.floor(W.st.t/24)+' · '+W.date(W.st.t).slice(0,10));else if(d.ld!=null){if(!confirm('Load this save? The running war is replaced.'))return;loadSlot(+d.ld);}
  else if(d.wta==='exp')exportFile();else if(d.ax){A11Y[d.ax]=d.ax==='big'?((A11Y.big||0)+1)%3:!A11Y[d.ax];try{localStorage.setItem('viper.a11y',JSON.stringify(A11Y));}catch(_){}applyA11y();}
  WARMAP.panel();});
document.addEventListener('change',e=>{if(e.target.id!=='wwImp'||!e.target.files[0])return;const f=e.target.files[0];f.text().then(txt=>{const err=importText(txt);const s=document.getElementById('wwSvS');if(s)s.textContent=err?'Import failed: '+err:'Imported.';WARMAP.panel();});});
W.tools={T,trend,notes,calendar,saveSlot,loadSlot,slots,importText,valid,decisions,render,UI,A11Y};
})();
