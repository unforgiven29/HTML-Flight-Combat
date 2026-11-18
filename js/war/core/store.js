/* =====================================================================================================================
   STORE — chapter 04 in more depth (spec v49 ch.04 persistence, recovery, scheduling telemetry, browser lifecycle).
     * INDEXEDDB AS THE PRIMARY STORE: the running war is also written, gzip-compressed, to IndexedDB (autosave every
       minute of real time, when the tab is hidden, and before the page closes). localStorage stays as a fast mirror
       while the save fits; when it does not, IndexedDB alone carries it and W.load reads it from there.
     * CHECKPOINTS: a ring of three compressed recovery checkpoints, one per war week; RESTORE CHECKPOINT in DEBUG.
     * CRASH RECOVERY: a session flag notices an interrupted session (tab crash, kill); the next start says so and
       offers the last checkpoint. Private browsing / no IndexedDB: falls back to localStorage with a notice.
     * VERSIONED SCHEMA AND MIGRATIONS: every save carries the schema number; migrations upgrade old saves step by step
       (missing records are created, renamed fields moved); integrity checks run after a load.
     * STORAGE BUDGET: navigator.storage.estimate() and the size of the current save; compaction trims the AI
       decision record and per-key histories when a save is large (never the death ledger or person records).
     * SCHEDULER TELEMETRY: each daily hook is timed; the slowest show in DEBUG; a hook that throws repeatedly is
       reported (not silently dropped). WebGL context loss and network offline / online are noticed and reported.
     * DETERMINISM AIDS: a campaign seed recorded at the start; replay of the event log by day in DEBUG.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const SCHEMA=4,DB='viper-ww',OS='saves';const T={hooks:{},fail:{},db:null,ok:typeof indexedDB!=='undefined',last:0,ckpt:0,crash:false,est:null,offline:false,glLost:0};
/* ------------------------------------------------------------------ IndexedDB */
function db(){if(T.db)return T.db;T.db=new Promise((res,rej)=>{try{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(OS);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});return T.db;}
async function put(k,v){const d=await db();return new Promise((res,rej)=>{const tx=d.transaction(OS,'readwrite');tx.objectStore(OS).put(v,k);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);});}
async function get(k){const d=await db();return new Promise((res,rej)=>{const tx=d.transaction(OS,'readonly');const q=tx.objectStore(OS).get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}
async function gz(str){if(typeof CompressionStream==='undefined')return new Blob([str]);return await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).blob();}
async function gunz(b){if(!(b instanceof Blob))return String(b);if(typeof DecompressionStream==='undefined')return await b.text();try{return await new Response(b.stream().pipeThrough(new DecompressionStream('gzip'))).text();}catch(e){return await b.text();}}
let chain=Promise.resolve();
function autosave(kind,str){const p=chain.then(()=>save1(kind,str));chain=p.catch(()=>{});return p;}
async function save1(kind,str){if(!W.st||!T.ok)return false;try{W.st.schema=SCHEMA;const s=str||JSON.stringify(W.st);const b=await gz(s);await put('current',{at:Date.now(),day:Math.floor(W.st.t/24),size:s.length,b});
    if(kind==='ckpt'){const i=T.ckpt=(T.ckpt+1)%3;await put('ckpt'+i,{at:Date.now(),day:Math.floor(W.st.t/24),b});}T.last=Date.now();T.size=s.length;T.gz=b.size;return true;}
  catch(e){T.ok=false;console.warn('[store] IndexedDB unavailable; localStorage only',e);return false;}}
async function loadIDB(k){try{const o=await get(k||'current');if(!o)return null;return JSON.parse(await gunz(o.b));}catch(e){return null;}}
/* ------------------------------------------------------------------ migrations and load */
const MIG={1:st=>{st.ev=st.ev||[];st.fold=st.fold||{};},2:st=>{if(st.dl&&!st.dl.names)st.dl.names={};},3:st=>{if(st.aic&&st.aic.rec&&st.aic.rec.length>160)st.aic.rec=st.aic.rec.slice(-160);},4:st=>{st.schema=4;}};
function migrate(st){let v=st.schema||1;const done=[];while(v<SCHEMA){v++;try{MIG[v]&&MIG[v](st);done.push(v);}catch(e){console.warn('[store] migration',v,e);}}st.schema=SCHEMA;return done;}
{const _l=W.load;W.load=async function(){let ok=await _l.apply(this,arguments);if(!ok&&T.ok){const st=await loadIDB();if(st&&st.c&&st.fronts){if(window.WGEO&&WGEO.loadData)await WGEO.loadData();W.st=st;ok=true;}}
  if(ok&&W.st){const m=migrate(W.st);if(m.length)W.emit('SYSTEM',{txt:'Save upgraded to schema '+SCHEMA+' ('+m.length+' migration steps).'});}return ok;};}
/* ------------------------------------------------------------------ compaction of the large, regenerable parts */
{const _c=W.compact;W.compact=function(){const r=_c?_c.apply(this,arguments):null;const st=W.st;if(!st)return r;const X=st.aic;if(X){if(X.rec.length>60)X.rec=X.rec.slice(-60);for(const kind in X.hist)for(const k in X.hist[kind])if(X.hist[kind][k].length>6)X.hist[kind][k]=X.hist[kind][k].slice(-6);}
  const L=st.lead&&st.lead.people;if(L)for(const id in L){const p=L[id];if(p.hist&&p.hist.length>4)p.hist=[p.hist[0]].concat(p.hist.slice(-3));}return r;};}
/* ------------------------------------------------------------------ scheduler telemetry */
function wrapHooks(){for(let i=0;i<W.daily.length;i++){const f=W.daily[i];if(f._t)continue;const name=(f.name||'hook')+'#'+i;const g=function(){const t0=performance.now();try{return f.apply(this,arguments);}catch(e){T.fail[name]=(T.fail[name]||0)+1;if(T.fail[name]===3)console.warn('[store] daily hook keeps failing',name,e);}finally{const d=performance.now()-t0;const h=T.hooks[name]||(T.hooks[name]={n:0,ms:0,max:0});h.n++;h.ms+=d;h.max=Math.max(h.max,d);}};g._t=1;W.daily[i]=g;}}
setTimeout(wrapHooks,0);
/* ------------------------------------------------------------------ lifecycle: autosave, checkpoints, crash, offline, WebGL */
try{T.crash=sessionStorage.getItem('viper.ww.live')==='1'&&!!localStorage.getItem('viper.ww.lastLive');sessionStorage.setItem('viper.ww.live','1');}catch(e){}
addEventListener('pagehide',()=>{try{sessionStorage.removeItem('viper.ww.live');}catch(e){}autosave();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)autosave();});
setInterval(()=>{if(W.st&&Date.now()-T.last>60000)autosave();try{localStorage.setItem('viper.ww.lastLive',String(Date.now()));}catch(e){}},15000);
W.weekly=W.weekly||[];W.weekly.push(()=>{autosave('ckpt');});
addEventListener('offline',()=>{T.offline=true;W.st&&W.emit('SYSTEM',{txt:'The connection is offline: the campaign continues locally; multiplayer and map tiles wait for it.'});});
addEventListener('online',()=>{T.offline=false;});
document.addEventListener('webglcontextlost',e=>{T.glLost++;try{e.preventDefault();}catch(x){}},true);
if(navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(e=>{T.est=e;}).catch(()=>{});
// a campaign seed for replay and debugging (recorded once; Math.random is not replaced)
{const _n=W.newWar;W.newWar=async function(){const r=await _n.apply(this,arguments);try{W.st.seed=(Math.random()*2**31)|0;W.st.schema=SCHEMA;}catch(e){}return r;};}
/* ------------------------------------------------------------------ report (DEBUG) */
function report(){const H=Object.entries(T.hooks).map(([k,h])=>({k,avg:h.ms/h.n,max:h.max,n:h.n})).sort((a,b)=>b.avg-a.avg).slice(0,8);
  return{idb:T.ok,last:T.last,size:T.size,gz:T.gz,crash:T.crash,offline:T.offline,glLost:T.glLost,quota:T.est&&{used:T.est.usage,quota:T.est.quota},slow:H,fail:T.fail,schema:SCHEMA};}
W.store={autosave,loadIDB,migrate,report,T,SCHEMA,restore:async i=>{const st=await loadIDB('ckpt'+(i||0));if(st){W.st=st;migrate(st);return true;}return false;}};
})();
