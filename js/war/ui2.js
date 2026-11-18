/* =====================================================================================================================
   v373 — interface: the sortie setup and debriefing, the INDEX tab, controls in SETTINGS, a tidier country panel
   (spec v49 ch.17 player interface, briefings and debriefings, information hierarchy; ch.13 preflight).
   * SORTIE SETUP (before every world-war sortie): pick the AIRCRAFT (your country's types first, then any in the
     hangar), the MISSION (AUTO, CAP, CAS, SEAD, STRIKE, ESCORT, INTERCEPT, ANTI-SHIP), its TARGET and ESCORTS, and
     whether to start from the CARRIER when your country has one; then FLY. Replaces the direct start from FLY FOR.
   * DEBRIEFING (after every sortie): duration, mission and target, aircraft and ground targets destroyed, your aircraft
     lost or recovered, the munitions you used, events of the sortie, and links to the replay and the record.
   * INDEX tab on the main menu (next to SETTINGS): the game's aircraft, weapons and countries in one place — search,
     with each entry's facts (aircraft: role, gun, radar, limits, weapons it carries; weapons: kind, range, guidance;
     countries: government, equipment, forces in this war).
   * CONTROLS in SETTINGS: the controller axis setup (stick, throttle, pedals) is a section of the SETTINGS tab.
   * COUNTRY PANEL GROUPS: the country tabs are grouped (OVERVIEW · GOVERNMENT · MILITARY · RECORD) with one row of
     sub-tabs, instead of one long row of twenty-five.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR,WS=window.WSORTIE&&WSORTIE.WS;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function css(){if(document.getElementById('ui2Css'))return;const s=document.createElement('style');s.id='ui2Css';s.textContent=
 '#pIndex{flex-direction:column;gap:8px;padding:12px;overflow:auto}#pIndex input{background:#18221f;color:#d6e2dc;border:1px solid #41594f;padding:6px;font:inherit;width:240px}#pIndex .ent{border-bottom:1px solid #26332e;padding:6px 0}#pIndex .ent b{color:#9fe0b8}'+
 '#menu[data-tab=index] #pIndex{display:flex}'+
 '#wsNat .grp{display:flex;gap:4px;margin:6px 0 2px}#wsNat .grp button{flex:1;letter-spacing:.08em}#wsNat .tabs{display:flex;flex-wrap:wrap;gap:3px}';document.head.appendChild(s);}
css();
/* a re-render (every click rebuilds the dialog) keeps the scroll position and the focused control */
const snap=()=>{const d=document.getElementById('u2m');if(!d)return null;const mb=d.querySelector('.mb'),a=document.activeElement,k=a&&d.contains(a)?[...a.attributes].find(x=>/^data-/.test(x.name)):null;
  return{k:d.dataset.k,st:mb?mb.scrollTop:0,sel:k?'['+k.name+'="'+k.value+'"]':null};};
const restore=(d,s,key)=>{if(!s||s.k!==key)return;const mb=d.querySelector('.mb');if(mb)mb.scrollTop=s.st;if(s.sel){const e=d.querySelector(s.sel);if(e)e.focus({preventScroll:true});}};
const modal=(h,key,wide)=>{const s=snap();close();const d=document.createElement('div');d.className='u2m';d.id='u2m';d.dataset.k=key||'';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','u2t');
  d.innerHTML='<div class="bx'+(wide?' wide':'')+'">'+h+'</div>';document.body.appendChild(d);restore(d,s,key||'');return d;};
const close=()=>{const d=document.getElementById('u2m');if(d)d.remove();};
window.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const b=document.querySelector('#u2m [data-u2x],#u2m [data-ix]');if(b){e.preventDefault();e.stopImmediatePropagation();b.click();}},true);   // capture: the game's own Esc handling must not also run
/* ------------------------------------------------------------------ sortie setup */
const SU={a3:null,ap:null,ac:null,mis:'AUTO',tgt:null,ti:null,esc:0,cv:false};
const MIS=['AUTO','CAP','CAS','SEAD','STRIKE','ESCORT','INTERCEPT','ANTI-SHIP'];
// [group, what it is flown as in the war (deep.js / go() below), one line for the card]
const MI={AUTO:['THEATRE','The war assigns your task after take-off.'],CAP:['AIR','Patrol over the target area and fight what comes.'],CAS:['GROUND','Attack enemy armour and troops at the front.'],
  SEAD:['AIR DEFENCE','Destroy the SAM battery at the target.'],STRIKE:['DEEP','Bomb buildings and trucks at a fixed target.'],ESCORT:['AIR','Fly cover over the target for the strike flights.'],
  INTERCEPT:['AIR','Hunt enemy aircraft over the target.'],'ANTI-SHIP':['SEA','Strike a naval target.']};
function aircraftFor(a3){const st=W.st,p=st.c[a3];const own=window.WSORTIE?WSORTIE.typesOf(a3,p.side):[];const all=Object.keys(AC).filter(t=>AC[t].model&&!AC[t].heli&&!AC[t].gnd&&!AC[t].sam&&!/A-50|E-3A|P-18|P-37|55Zh6/.test(t));return{own:own.filter(t=>AC[t]),all};}
function setup(a3,ap){if(!W||!W.st)return;SU.a3=a3;SU.ap=ap;SU.ac=SU.ac&&AC[SU.ac]?SU.ac:game.ac;const p=W.st.c[a3];const A=aircraftFor(a3);const T=W.deep?W.deep.targets(a3):[];const cv=p.nav&&p.nav.cv>0&&window.CV_AC;
  const TL=T.filter(t=>SU.mis==='ANTI-SHIP'?true:SU.mis==='CAS'?t.kind==='FRONT':SU.mis==='STRIKE'?t.kind!=='FRONT':true);
  const seg=(attr,cur,L)=>'<div class="seg">'+L.map(([v,t])=>'<button data-'+attr+'="'+v+'" aria-pressed="'+(String(cur)===String(v))+'">'+t+'</button>').join('')+'</div>';
  const h='<header class="mh"><div class="mk">SORTIE BRIEFING</div><h2 id="u2t">SORTIE — '+esc(p.n.toUpperCase())+'</h2><div class="ms"><span>FROM <b>'+esc(ap.name)+'</b></span>'+(SU.cv?'<span>CARRIER START</span>':'')+'</div></header>'+
   '<div class="mb">'+
   '<section class="sec"><h3>AIRCRAFT</h3><select id="u2ac" aria-label="Aircraft">'+(A.own.length?'<optgroup label="'+esc(p.n)+' flies">'+A.own.map(t=>'<option'+(t===SU.ac?' selected':'')+'>'+esc(t)+'</option>').join('')+'</optgroup>':'')+'<optgroup label="Hangar">'+A.all.filter(t=>!A.own.includes(t)).map(t=>'<option'+(t===SU.ac?' selected':'')+'>'+esc(t)+'</option>').join('')+'</optgroup></select></section>'+
   '<section class="sec"><h3>MISSION TYPE</h3><div class="opts">'+MIS.map(m=>'<button class="opt" data-u2m="'+m+'" aria-pressed="'+(SU.mis===m)+'"><i>'+MI[m][0]+'</i><b>'+m+'</b><span>'+MI[m][1]+'</span></button>').join('')+'</div></section>'+
   (SU.mis!=='AUTO'?'<section class="sec"><h3>TARGET<em>'+TL.length+' available</em></h3>'+(TL.length?'<select id="u2tg" aria-label="Target">'+TL.map(t=>{const v=T.indexOf(t);return '<option value="'+v+'"'+(String(v)===String(SU.ti)?' selected':'')+'>'+esc(t.n)+'</option>';}).join('')+'</select>':'<div class="muted">No target of this kind is known. You fly the mission over the front.</div>')+'</section>':'')+
   '<div'+(cv?' class="two"':'')+'><section class="sec"><h3>ESCORTS</h3>'+seg('u2e',SU.esc,[[0,'NONE'],[1,'1 FLIGHT'],[2,'2 FLIGHTS']])+'</section>'+
   (cv?'<section class="sec"><h3>START</h3>'+seg('u2c',SU.cv?1:0,[[0,'RUNWAY'],[1,'CARRIER']])+'</section>':'')+'</div>'+
   '</div>'+
   '<footer class="mf"><button class="ghost" data-u2x="1">CANCEL</button><div class="r"><button class="alt" data-inf="1">GO AS INFANTRY</button><button class="go" data-u2go="1">FLY SORTIE ▸</button></div></footer>';
  modal(h,'setup');}
async function go(){const s=document.getElementById('u2ac');if(s)SU.ac=s.value;game.ac=SU.ac;const T=W.deep?W.deep.targets(SU.a3):[];const t=document.getElementById('u2tg');
  if(W.deep){const k=W.deep.PLN();k.k=SU.mis==='AUTO'?'AUTO':SU.mis==='INTERCEPT'?'CAP':SU.mis==='ANTI-SHIP'?'STRIKE':SU.mis;k.tgt=SU.mis==='AUTO'||!t?null:(T[+t.value]||null);k.esc=SU.esc;}
  close();SU.t0=Date.now();SU.mun0=JSON.parse(JSON.stringify((W.st.census&&W.st.census.mun[SU.a3])||{}));SU.ev0=W.st.seq;
  if(SU.cv&&W.realwar)await W.realwar.fromCarrier(SU.a3);else await WSORTIE.start(SU.a3,SU.ap);}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsFly [data-ws]');if(!b||!W||!W.st||!WARMAP.UI.sel)return;e.stopImmediatePropagation();e.preventDefault();
  const ap=WGEO.airports.find(q=>q.ident===b.dataset.ws);if(ap)setup(WARMAP.UI.sel,ap);},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#u2m button');if(!b)return;const d=b.dataset;
  const keep=()=>{const s=document.getElementById('u2ac');if(s)SU.ac=s.value;const t=document.getElementById('u2tg');if(t)SU.ti=t.value;};
  if(d.u2m){keep();SU.mis=d.u2m;SU.ti=null;setup(SU.a3,SU.ap);}else if(d.u2e!=null){keep();SU.esc=+d.u2e;setup(SU.a3,SU.ap);}
  else if(d.u2c!=null){keep();SU.cv=d.u2c==='1';setup(SU.a3,SU.ap);}else if(d.u2x)close();else if(d.u2go)go();else if(d.u2close)close();});
/* ------------------------------------------------------------------ debriefing */
if(window.WSORTIE){const _f=WSORTIE.finish;WSORTIE.finish=function(){const was=WS.on,a3=WS.me,k={...(WS.kills||{})},lost=WS.lost,task=WS.task,base=WS.base,ty=typeof player!=='undefined'&&player?player.type:'';const r=_f.apply(this,arguments);
  if(was&&W.st&&!window.__noDebrief)try{debrief({a3,k,lost,task,base,ty});}catch(e){console.warn('[debrief]',e);}return r;};}
function debrief(o){const st=W.st,p=st.c[o.a3],mins=SU.t0?Math.round((Date.now()-SU.t0)/60000):null;const m1=(st.census&&st.census.mun[o.a3])||{},m0=SU.mun0||{};
  const used=Object.entries(m1).map(([k,v])=>[k,v-(m0[k]||0)]).filter(x=>x[1]>0&&!/rounds$|missiles$|weapons$/.test(x[0])||/^gun/.test(x[0])&&x[1]>0);
  const ev=st.ev.filter(e=>SU.ev0!=null&&parseInt(e.id.slice(1),36)>=SU.ev0&&/SORTIE|AIR|MISSILE|CONVOY|NAVAL|PATCH|AWARD|SQUADRON/.test(e.ty)).slice(-8);
  const h='<header class="mh"><div class="mk">SORTIE COMPLETE</div><h2 id="u2t">DEBRIEFING</h2><div class="ms"><span><b>'+esc(p?p.n:'')+'</b></span><span>'+esc(o.ty)+'</span><span>FROM <b>'+esc(o.base?o.base.name:'')+'</b></span>'+(mins!=null?'<span><b>'+mins+'</b> MIN</span>':'')+'</div></header>'+
   '<div class="mb"><section class="sec"><h3>MISSION</h3><div class="verdict">'+esc(o.task?(o.task.l||o.task.k):'Patrol the front (theatre tasking)')+'</div></section>'+
   '<section class="sec"><h3>RESULTS</h3><div class="kpis"><div class="kp"><b>'+(o.k.air|0)+'</b><span>Aircraft destroyed</span></div><div class="kp"><b>'+(o.k.gnd|0)+'</b><span>Ground and sea targets</span></div>'+
   '<div class="kp '+(o.lost?'bad':'ok')+'"><b>'+(o.lost?'LOST':'RECOVERED')+'</b><span>Your aircraft</span></div></div></section>'+
   '<section class="sec"><h3>MUNITIONS YOU USED</h3>'+(used.length?used.map(([k,v])=>'<div class="row"><span>'+esc(k)+'</span><b>'+v+'</b></div>').join(''):'<div class="muted">None fired.</div>')+'</section>'+
   (ev.length?'<section class="sec"><h3>DURING THE SORTIE</h3>'+ev.map(e=>'<div class="row"><span>'+esc(e.txt)+'</span></div>').join('')+'</section>':'')+
   '<div class="note">The replay and your flight record are in the country\'s DEBRIEF tab.</div></div>'+
   '<footer class="mf"><span></span><div class="r"><button class="go" data-u2close="1">CONTINUE</button></div></footer>';
  modal(h,'debrief');}
/* ------------------------------------------------------------------ INDEX tab */
function indexTab(){const tabs=document.querySelector('#menu .hq-tabs');if(!tabs||document.querySelector('[data-tab="index"]'))return;const ops=tabs.querySelector('[data-tab="ops"]');
  const b=document.createElement('button');b.setAttribute('role','tab');b.dataset.tab='index';b.setAttribute('aria-selected','false');b.innerHTML='<kbd>7</kbd>INDEX';tabs.insertBefore(b,ops?ops.nextSibling:null);b.onclick=()=>{if(typeof setTab==='function')setTab('index');renderIndex();};
  const pane=document.createElement('section');pane.className='hq-pane';pane.id='pIndex';(document.getElementById('pOps')||document.querySelector('#menu .hq-pane')).after(pane);}
const IX={q:'',k:'AIRCRAFT'};
function renderIndex(){const el=document.getElementById('pIndex');if(!el)return;const q=IX.q.toLowerCase();let L=[];
  if(IX.k==='AIRCRAFT')for(const[t,a]of Object.entries(AC)){if(!a.model||a.gnd||a.sam)continue;const w=typeof STN!=='undefined'&&STN[t]?[...new Set(Object.values(STN[t]).flat())]:[];
    L.push({n:a.name||t,h:[a.gun&&a.gun.name?'Gun: '+a.gun.name:'',a.radar&&a.radar.name?'Radar: '+a.radar.name:'',a.gLim?'Limit: '+a.gLim+' g':'',w.length?'Weapons: '+w.slice(0,18).join(', ')+(w.length>18?' …':''):''].filter(Boolean).join(' · '),s:t});}
  if(IX.k==='WEAPONS'){if(typeof MSL!=='undefined')for(const[k,m]of Object.entries(MSL))L.push({n:k,h:'Air-to-air · '+(m.seek||'')+(m.range?' · range '+Math.round(m.range/1000)+' km':''),s:k});
    if(typeof AGW!=='undefined')for(const[k,a]of Object.entries(AGW))L.push({n:k,h:({bomb:'Bomb',lgb:'Guided bomb',agm:'Air-to-ground missile',arm:'Anti-radiation missile',pod:'Rocket pod',tgp:'Targeting pod'}[a.k]||a.k)+(a.as?' · anti-ship':'')+(a.range?' · range '+Math.round(a.range/1000)+' km':'')+(a.mass?' · '+a.mass+' kg':''),s:k});}
  if(IX.k==='COUNTRIES'&&window.WGEO)for(const c of WGEO.countries){const P=window.NATDATA&&NATDATA.POL[c.a3],E=window.NATDATA&&NATDATA.EQ[c.a3],p=W&&W.st&&W.st.c[c.a3];
    L.push({n:c.n,h:[P?P.sys.replace(/_/g,' ').toLowerCase()+' · '+P.hs+(P.hg?' / '+P.hg:''):'',E&&E.FTR4?'Fighters: '+E.FTR4:'',E&&E.MBT?'Tanks: '+E.MBT:'',p&&p.side?'In the war: '+(p.side==='B'?'BLUEFOR':'REDFOR')+' ('+p.al.toLowerCase()+') · '+Math.round(p.air)+' aircraft · '+p.gnd.toFixed(1)+' brigades':''].filter(Boolean).join(' · '),s:c.a3});}
  if(q)L=L.filter(x=>(x.n+' '+x.h+' '+x.s).toLowerCase().includes(q));L.sort((a,b)=>String(a.n).localeCompare(String(b.n)));
  el.innerHTML='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><b style="letter-spacing:.14em">INDEX</b>'+['AIRCRAFT','WEAPONS','COUNTRIES'].map(k=>'<button data-ix="'+k+'" aria-pressed="'+(IX.k===k)+'">'+k+'</button>').join('')+'<input id="ixQ" placeholder="search" value="'+esc(IX.q)+'" aria-label="search the index"> <span class="muted">'+L.length+' entries</span></div>'+
    L.slice(0,300).map(x=>'<div class="ent"><b>'+esc(x.n)+'</b><div style="font-size:11px;color:#9fb3aa">'+esc(x.h)+'</div></div>').join('')+(L.length>300?'<div class="muted">… refine the search to see more</div>':'');}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#pIndex [data-ix]');if(b){IX.k=b.dataset.ix;renderIndex();}});
document.addEventListener('input',e=>{if(e.target.id==='ixQ'){IX.q=e.target.value;renderIndex();setTimeout(()=>{const i=document.getElementById('ixQ');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},0);}});
document.addEventListener('keydown',e=>{if(e.key==='7'&&!$('#menu').hidden&&!(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))&&typeof setTab==='function'){setTab('index');renderIndex();}});
/* ------------------------------------------------------------------ controls in SETTINGS */
function controlsSection(){const ops=document.querySelector('#pOps .ops')||document.getElementById('pOps');if(!ops||document.getElementById('ctlSec'))return;const d=document.createElement('div');d.id='ctlSec';d.className='fld';
  d.innerHTML='<span class="lb">CONTROLLERS · STICK, THROTTLE, PEDALS</span><div><button id="ctlOpen" class="u2b">AXIS AND BUTTON SETUP</button> <span class="muted" style="font-size:11px">Assign roll, pitch, rudder and throttle on any connected device.</span></div>';ops.appendChild(d);
  d.querySelector('#ctlOpen').onclick=()=>{if(window.COCKPIT)COCKPIT.openSetup();};}
/* ------------------------------------------------------------------ the country panel, grouped */
const GROUPS={OVERVIEW:['PEOPLE','ECONOMY','LIFE','CITIES','CIVIC','NEWSROOM','POPULATION','LIVES','PEOPLE_REGISTER'],GOVERNMENT:['GOVERNMENT','POLITICS','LEADERS','DECISIONS','NEWS','JUSTICE','WORLD'],MILITARY:['FORCES','MILITARY','LAND','OPERATIONS','ARSENAL','NAVY','SEA','STRATEGIC','INTEL','INFOWAR','MUNITIONS','STRATEGY'],RECORD:['CEMETERY','HISTORY','DEBRIEF']};
const GUI={g:'OVERVIEW'};
if(window.WARMAP&&WARMAP.after){WARMAP.after.push(()=>{const nat=document.getElementById('wsNat');if(!nat)return;const tabs=nat.querySelector('.tabs');if(!tabs||nat.querySelector('.grp'))return;const cur=window.NATPANEL&&NATPANEL.UI.tab;
  const g=Object.keys(GROUPS).find(k=>GROUPS[k].includes(cur))||GUI.g;GUI.g=g;const grp=document.createElement('div');grp.className='grp';grp.innerHTML=Object.keys(GROUPS).map(k=>'<button data-grp="'+k+'" aria-pressed="'+(g===k)+'">'+k+'</button>').join('');tabs.before(grp);
  tabs.querySelectorAll('button[data-nt]').forEach(b=>{if(!GROUPS[g].includes(b.dataset.nt))b.style.display='none';b.textContent=b.textContent.replace('PEOPLE_REGISTER','REGISTER');});});
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-grp]');if(!b||!window.NATPANEL)return;GUI.g=b.dataset.grp;NATPANEL.UI.tab=GROUPS[GUI.g][0];WARMAP.panel();});}
/* ------------------------------------------------------------------ boot */
const boot=()=>{try{indexTab();controlsSection();}catch(e){console.warn('[ui2]',e);}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();setTimeout(boot,1500);
window.UI2={SU,setup,go,debrief,renderIndex,GROUPS,close,snap,restore};
})();
