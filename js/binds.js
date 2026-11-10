/* =====================================================================================================================
   v238 — custom key and gamepad binds (Settings ▸ KEY & BUTTON BINDS).
   * Every action the game has (HOTAS: TMS / DMS / CMS, cursor, antenna, range; weapons; flight; view; crew; aircraft-specific
     switches) can get a keyboard key (Shift allowed) and/or a gamepad button.
   * Profiles: ALL AIRCRAFT, plus an override profile for any single aircraft. The aircraft profile wins over ALL.
   * Binds are layered on top of the default keys through the game's own key map (CTL.map), so a bound key does exactly what the
     default key does. A key bound to an action stops doing its default job.
   * Saved in this browser (localStorage 'viper.binds').
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof CTL==='undefined'){console.warn('[binds] no CTL');return;}
const LS='viper.binds';
const BASE=Object.assign({},CTL.map);
// [id, label, group, kind, target, default key shown]   kind: p = press (raw key sent once), h = hold (raw key held), b = press + hold, f = function
const ACT=[
 ['tmsU','TMS UP · lock / designate','HOTAS','p','Enter','Enter'],
 ['tmsD','TMS DOWN · break lock / drop','HOTAS','p','KeyU','U'],
 ['tmsR','TMS RIGHT · next target','HOTAS','p','Tab','Tab'],
 ['tmsL','TMS LEFT · boresight / ACM','HOTAS','p','KeyT','T'],
 ['dmsU','DMS UP · RWS ⇄ TWS','HOTAS','p','Digit4','5'],
 ['dmsD','DMS DOWN · radar ⇄ IRST','HOTAS','p','Backslash','\\'],
 ['cmsU','CMS UP · flare','HOTAS','p','KeyX','X'],
 ['cmsD','CMS DOWN · chaff','HOTAS','p','KeyC','C'],
 ['cmsL','CMS LEFT · ECM / jammer','HOTAS','p','Digit5','7'],
 ['curU','Cursor up','HOTAS','h','KeyI','I'],['curD','Cursor down','HOTAS','h','KeyK','K'],
 ['curL','Cursor left','HOTAS','h','KeyJ','J'],['curR','Cursor right','HOTAS','h','KeyL','L'],
 ['antU','Antenna elevation up','HOTAS','h','KeyY','='],['antD','Antenna elevation down','HOTAS','h','KeyH','−'],
 ['rngU','Radar range +','HOTAS','p','BracketRight',']'],['rngD','Radar range −','HOTAS','p','BracketLeft','['],
 ['az','Scan azimuth','HOTAS','p','KeyZ','Z'],['bars','Scan bars','HOTAS','p','KeyN','N'],
 ['fire','Fire / pickle (hold for gun)','WEAPONS','b','Space','Space'],
 ['wGun','Select gun','WEAPONS','p','Digit1','1'],['wIr','Select IR missile','WEAPONS','p','Digit2','2'],
 ['wRdr','Select radar missile','WEAPONS','p','Digit3','3'],['wAg','Select A/G store','WEAPONS','p','Digit7','4'],
 ['arm','Master arm','WEAPONS','p','KeyM','M'],['jett','Jettison tanks','WEAPONS','p','Backspace','Backspace'],
 ['scopeSw','Scope: radar ⇄ weapon video (Maverick / TV)','WEAPONS','f',()=>window.WPNSCOPE&&WPNSCOPE.toggle(),'—'],
 ['pUp','Pitch down (push)','FLIGHT','h','KeyW','W'],['pDn','Pitch up (pull)','FLIGHT','h','KeyS','S'],
 ['rL','Roll left','FLIGHT','h','KeyA','A'],['rR','Roll right','FLIGHT','h','KeyD','D'],
 ['yL','Rudder left','FLIGHT','h','KeyQ','Q'],['yR','Rudder right','FLIGHT','h','KeyE','E'],
 ['tUp','Throttle up','FLIGHT','h','KeyR','R'],['tDn','Throttle down','FLIGHT','h','KeyF','F'],
 ['sb','Speed brake (hold)','FLIGHT','h','KeyB','B'],
 ['gear','Landing gear','FLIGHT','f',()=>BASE.KeyG&&BASE.KeyG.fn(),'G'],
 ['flap','Flaps (F-8E: wing incidence)','FLIGHT','f',()=>flapKey(),'O'],
 ['swF','Wing sweep / nozzle forward','FLIGHT','p','Comma',','],['swA','Wing sweep / nozzle aft','FLIGHT','p','Period','.'],
 ['view','Cockpit ⇄ chase view','VIEW','p','KeyV','V'],['pad','Padlock (hold)','VIEW','h','KeyO','Shift+O'],
 ['ctr','Centre view','VIEW','p','Home','Home'],['look','Look down at panel','VIEW','p','Backquote','`'],['mcam','Missile camera','VIEW','p','Semicolon',';'],
 ['crew','Back-seater takes the sensors','CREW','p','Digit6','6'],
 ['wInc','F-8E · wing incidence handle','AIRCRAFT','f',()=>window.CW_SYS&&CW_SYS.wingInc(),'—'],
 ['apc','F-104S · APC on / off','AIRCRAFT','f',()=>window.CW_SYS&&CW_SYS.apcToggle(),'—'],
 ['stList','Start checklist','START-UP','f',()=>window.START&&START.list(),'Shift+C'],
 ['stBatt','Battery','START-UP','f',()=>window.START&&START.batt(),'—'],['stExt','External power','START-UP','f',()=>window.START&&START.ext(),'—'],
 ['stFm','Fuel / engine master','START-UP','f',()=>window.START&&START.fm(),'—'],['stSrc','Start source (air cart / JFS / APU)','START-UP','f',()=>window.START&&START.src(),'—'],
 ['stSel','Engine select L / R','START-UP','f',()=>window.START&&START.sel(),'—'],['stStr','Starter / crank / START','START-UP','f',()=>window.START&&START.starter(),'—'],
 ['stThr','Throttle cutoff ⇄ IDLE','START-UP','f',()=>window.START&&START.thr(),'—'],['stGen','Generators','START-UP','f',()=>window.START&&START.gen(),'—'],
 ['pause','Pause','GAME','f',()=>BASE.KeyP&&BASE.KeyP.fn(),'P']];
const A=Object.fromEntries(ACT.map(a=>[a[0],a]));

let DB={ALL:{}};try{const o=JSON.parse(localStorage.getItem(LS)||'null');if(o&&typeof o==='object')DB=Object.assign({ALL:{}},o);}catch(e){}
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(DB));}catch(e){}};
const eff=type=>{const o={};for(const p of['ALL',type])for(const [id,b] of Object.entries(DB[p]||{}))o[id]=Object.assign({},o[id],b);return o;};

/* ---------------- keyboard layer ---------------- */
const release=new Map();   // bound physical key -> raw key to let go on keyup
function entry(a){const [, , ,k,t]=a;
  if(k==='h')return{hold:t};
  if(k==='p')return{leg:t};
  if(k==='b')return{fn:()=>{CTL.legacy(t,{},false);keys.add(t);}};
  return{fn:()=>{try{t();}catch(e){console.warn('[binds]',e);}}};}
function apply(){const type=(typeof player!=='undefined'?player:null)?player.type:null,b=eff(type);
  for(const k of Object.keys(CTL.map))if(!(k in BASE))delete CTL.map[k];Object.assign(CTL.map,BASE);release.clear();
  for(const [id,v] of Object.entries(b)){const a=A[id];if(!a||!v.key)continue;CTL.map[v.key]=entry(a);if(a[3]==='b')release.set(v.key.replace(/^\+/,''),a[4]);}}
addEventListener('keyup',e=>{const r=release.get(e.code);if(r)keys.delete(r);},true);
{const _mp=makePlayer;makePlayer=function(){const r=_mp.apply(this,arguments);try{apply();}catch(e){}return r;};}
apply();

/* ---------------- gamepad layer ---------------- */
let prev=[],held=new Map();
function padLoop(){requestAnimationFrame(padLoop);
  const gps=navigator.getGamepads?navigator.getGamepads():[],gp=[...gps].find(g=>g);if(!gp)return;const b=gp.buttons.map(x=>x.pressed);
  if(cap&&cap.pad){const i=b.findIndex((v,i)=>v&&!prev[i]);if(i>=0)finish('pad',i);prev=b;return;}
  if(!game.running||!$('#menu').hidden||!(typeof player!=='undefined'?player:null)){prev=b;return;}
  const bb=eff(player.type);
  for(const [id,v] of Object.entries(bb)){if(v.pad==null)continue;const a=A[id],i=v.pad,on=!!b[i],was=!!prev[i];if(!a)continue;const k=a[3],t=a[4];
    if(on&&!was){if(k==='h'){keys.add(t);held.set(i,t);}else if(k==='b'){CTL.legacy(t,{},false);keys.add(t);held.set(i,t);}else if(k==='p'){const en=entry(a);if(en.leg)CTL.legacy(en.leg,{},en.sh);else if(en.fn)en.fn();}else{try{t();}catch(e){}}}
    if(!on&&was&&held.has(i)){keys.delete(held.get(i));held.delete(i);}}
  prev=b;}
requestAnimationFrame(padLoop);

/* ---------------- settings UI ---------------- */
let cap=null,prof='ALL';
const keyName=k=>!k?'—':(k[0]==='+'?'Shift+':'')+k.replace(/^\+/,'').replace(/^Key/,'').replace(/^Digit/,'').replace('Bracket','[').replace('Backslash','\\');
function finish(kind,val){if(!cap)return;const {id}=cap;cap=null;const P=DB[prof]||(DB[prof]={});const o=P[id]||(P[id]={});
  if(kind==='key'){// one key, one action within a profile
    for(const [oid,ov] of Object.entries(P))if(oid!==id&&ov.key===val)delete ov.key;o.key=val;}
  else{for(const [oid,ov] of Object.entries(P))if(oid!==id&&ov.pad===val)delete ov.pad;o.pad=val;}
  save();apply();render();}
addEventListener('keydown',e=>{if(!cap||cap.pad)return;e.preventDefault();e.stopImmediatePropagation();
  if(e.code==='Escape'){cap=null;render();return;}
  if(/^(Shift|Control|Alt|Meta)/.test(e.code))return;finish('key',(e.shiftKey?'+':'')+e.code);},true);

let root=null;
function render(){if(!root)return;const types=Object.keys(AC).filter(t=>LOAD&&LOAD.cold&&LOAD.cold[t]).sort();
  const P=DB[prof]||{},all=DB.ALL||{};
  let h=`<h2>KEY &amp; BUTTON BINDS</h2><div class="bd-top"><span class="lb">PROFILE</span><select id="bdProf"><option value="ALL">ALL AIRCRAFT</option>${types.map(t=>`<option value="${t}"${t===prof?' selected':''}>${t}</option>`).join('')}</select>
    <button class="srst" id="bdClr">CLEAR THIS PROFILE</button></div>
    <p class="hint">Click a KEY or PAD cell, then press a key (Shift allowed) or a gamepad button. Esc cancels. An aircraft profile overrides ALL AIRCRAFT for that jet only. A bound key stops doing its default job. Gamepad buttons 0–5, 7, 10, 11 already have default jobs (lock/next, flare, chaff, weapon, throttle, fire, view).</p><div class="bd-grid">`;
  let g='';for(const a of ACT){if(a[2]!==g){g=a[2];h+=`<div class="bd-g">${g}</div>`;}
    const v=P[a[0]]||{},inh=prof!=='ALL'?all[a[0]]||{}:{},ck=cap&&cap.id===a[0];
    const kc=ck&&!cap.pad?'PRESS A KEY…':v.key?keyName(v.key):inh.key?`<i>${keyName(inh.key)}</i>`:`<i>${a[5]}</i>`;
    const pc=ck&&cap.pad?'PRESS A BUTTON…':v.pad!=null?'BTN '+v.pad:inh.pad!=null?`<i>BTN ${inh.pad}</i>`:'—';
    h+=`<div class="bd-r"><span>${a[1]}</span><button data-k="${a[0]}">${kc}</button><button data-p="${a[0]}">${pc}</button><button data-x="${a[0]}" title="Clear">×</button></div>`;}
  root.innerHTML=h+'</div>';
  root.querySelector('#bdProf').value=prof;
  root.querySelector('#bdProf').onchange=e=>{prof=e.target.value;render();};
  root.querySelector('#bdClr').onclick=()=>{DB[prof]={};save();apply();render();};
  root.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{cap={id:b.dataset.k,pad:false};render();});
  root.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{cap={id:b.dataset.p,pad:true};render();});
  root.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{const P=DB[prof]||{};delete P[b.dataset.x];save();apply();render();});}
function mount(){const ops=document.querySelector('#pOps .ops');if(!ops||root)return;root=document.createElement('div');root.className='pl-sec wide';root.id='bindSec';
  const st=document.createElement('style');st.textContent=`#bindSec .bd-top{display:flex;gap:10px;align-items:center;margin:8px 0}#bindSec select{background:#0b0f10;color:var(--tx);border:1px solid #2a3236;padding:4px}
  #bindSec .bd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:2px 16px;margin-top:8px}#bindSec .bd-g{grid-column:1/-1;font:700 10px var(--f1);letter-spacing:.2em;color:var(--dm);margin-top:8px}
  #bindSec .bd-r{display:grid;grid-template-columns:1fr 120px 80px 26px;gap:4px;align-items:center;font-size:11.5px}#bindSec .bd-r button{background:#0b0f10;color:var(--cy);border:1px solid #2a3236;padding:3px 4px;font:600 11px var(--f1);cursor:pointer}
  #bindSec .bd-r button i{color:var(--dm);font-style:normal}`;
  document.head.appendChild(st);const set=document.querySelector('#setSec');(set&&set.nextSibling?ops.insertBefore(root,set.nextSibling):ops.appendChild(root));render();}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',mount);else mount();
window.BINDS={apply,DB:()=>DB};
console.info('[binds] custom binds active');
})();
