/* =====================================================================================================================
   DESK — chapters 13, 16 and 17 in more depth: the player's desk around the war.
   CH.13  * TASKING BOARD: dynamic mission families generated from the war's own state (close air support where a
            front is defending, CSAR where a crew is down, airbase defence where a base was struck, escort for
            transports, reconnaissance, maritime patrol, humanitarian escort, investigation flights after an incident),
            each with a reason, complications, a deadline, and fairness (no family repeats more than twice running).
          * ONBOARDING: first-session hints; a SETUP summary (side, difficulty, realism) and an ENCYCLOPEDIA searchable
            over the equipment catalogue, the country tables and a glossary.
   CH.16  * CREW SEATS for two-seat aircraft (pilot / weapons systems officer) with seat assignment, and a SHARED
            BRIEFING ROOM: map markers and planning notes, a ready check before launch; in a room they are sent to the
            other players as events (host decides; guests' commands are validated by the host).
   CH.17  * SQUADRON READINESS BOARD (aircraft up / down, crews rested, duty roster), ENTITY CARDS (formations, aircraft,
            personnel, facilities), PERSONAL JOURNAL, SAVED MAP VIEWS (bookmarks), DATA EXPORT (CSV of country figures),
            and a developer INSPECTOR (state counts, relationships, decision log, reconciliation) behind ?wwdebug.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rn=()=>Math.random();const pct=x=>Math.round((x||0)*100)+'%';
const S=()=>{const st=W.st;if(!st.desk)st.desk={task:[],last:[],jr:[],bm:[],brief:{mk:[],notes:[],ready:{}},seat:{pilot:'you',wso:'AI'},hint:0};return st.desk;};
const FAM={CAS:'Close air support',CSAR:'Combat search and rescue cover',BASE:'Airbase defence (combat air patrol)',ESC:'Transport escort',RECON:'Reconnaissance',MAR:'Maritime patrol',HUM:'Humanitarian corridor escort',INV:'Investigation flight over an incident site'};
const CMPL=['weather closes in at the target','a tanker is late','enemy fighters reported nearby','the ground controller loses contact','civilians reported near the target area','a jammer degrades navigation'];
const GLOS={IADS:'integrated air defence system: radars, missiles and command linked together',CSAR:'combat search and rescue: recovering a downed crew',CAS:'close air support: attacks near friendly troops, controlled from the ground',AEW:'airborne early warning: a radar aircraft that sees far',QRA:'quick reaction alert: fighters ready to launch in minutes',ROE:'rules of engagement: when force may be used',MANPADS:'man-portable air-defence missiles',ATGM:'anti-tank guided missile',SEAD:'suppression of enemy air defences',EW:'electronic warfare: jamming, detection and protection of signals'};
const HINTS=['Pick a country at war on the WORLD MAP, then FLY FOR it from one of its airfields.','The tabs above group the country\'s records: OVERVIEW, GOVERNMENT, MILITARY, RECORD.','The TASKING board suggests missions where your side needs help most.','Estimates are labelled; claims are marked until verified.','Esc pauses; the war clock runs only when you start it.'];
/* ------------------------------------------------------------------ tasking board */
function tasking(){const st=W.st,X=S();const me=st.me||'B';const mine=Object.values(st.c).filter(p=>p.side===me&&(p.al==='CORE'||p.al==='ALLY'));if(!mine.length)return;const out=[];
  const why=(k,a3,txt)=>{if(X.last.slice(-2).every(x=>x===k)&&X.last.length>=2)return;out.push({k,a3,txt,c:CMPL[Math.floor(rn()*CMPL.length)],due:st.t+24*(1+Math.floor(rn()*3))});};
  for(const f of st.fronts){if(f.cf)continue;const p=mine.find(q=>q.a3===f.a||q.a3===f.b);if(!p)continue;const post=f.posture&&f.posture[p.a3];if(/DEF/.test(post||''))why('CAS',p.a3,'troops on the '+(st.c[f.a].n)+' / '+(st.c[f.b].n)+' front are defending and ask for support');else why('RECON',p.a3,'the staff want a fresh picture of the '+st.c[f.b===p.a3?f.a:f.b].n+' positions');if(out.length>3)break;}
  const ev=(st.ev||[]).slice(-60);if(ev.some(e=>/CSAR|ejected|downed/i.test((e.ty||'')+(e.txt||''))))why('CSAR',mine[0].a3,'a crew is down behind the lines');
  if(ev.some(e=>/airbase|AIRBASE/.test((e.ty||'')+(e.txt||''))))why('BASE',mine[0].a3,'a base was struck; cover it while it is repaired');
  if(ev.some(e=>/COLLATERAL|CIVILIAN|AIRLINER/.test(e.ty||'')))why('INV',mine[0].a3,'investigators need photographs of an incident site');
  if(st.navy||rn()<.3)why('MAR',mine[0].a3,'shipping lanes need a patrol');if(rn()<.3)why('ESC',mine[0].a3,'transports carry ammunition forward');if(rn()<.2)why('HUM',mine[0].a3,'a humanitarian corridor opens for a day');
  X.task=out.slice(0,6);}
function accept(i){const X=S(),t=X.task[i];if(!t)return null;X.last.push(t.k);if(X.last.length>4)X.last.shift();W.emit('TASKING',{e:[t.a3],txt:'You accept a tasking: '+FAM[t.k].toLowerCase()+' — '+t.txt+'. Expected complication: '+t.c+'.'});return t;}
/* ------------------------------------------------------------------ crew seats and the briefing room (ch.16) */
const TWO=new Set(['F-15E','F-14A','F-14B','Su-34','Su-30','Su-30SM','Tornado','F-4E','EA-18G','Su-24','J-16','F-18F','F/A-18F']);
function seats(type){return TWO.has(type)?['pilot','weapons systems officer']:['pilot'];}
function take(seat,who){const X=S();if(seat==='wso')X.seat.wso=who;else X.seat.pilot=who;send('seat',{seat,who});return X.seat;}
function mark(lat,lon,txt){const X=S();X.brief.mk.push({lat:+lat||0,lon:+lon||0,txt:String(txt).slice(0,60),t:W.st.t});if(X.brief.mk.length>20)X.brief.mk.shift();send('mk',X.brief.mk[X.brief.mk.length-1]);}
function note(txt){const X=S();X.brief.notes.push(String(txt).slice(0,140));if(X.brief.notes.length>20)X.brief.notes.shift();send('note',txt);}
function ready(name,on){S().brief.ready[String(name).slice(0,16)]=!!on;send('ready',{name,on});}
let room=null;function attach(){try{if(typeof net==='undefined'||!net.r||net.r===room||!net.r.on)return;room=net.r;room.on('desk',m=>recv(m&&m.data));}catch(e){}}
function send(k,v){attach();try{if(room&&room.emit)room.emit('desk',{k,v}).catch(()=>{});}catch(e){}}
// incoming (validated: only known kinds, strings clipped, numbers checked)
function recv(m){const X=W.st&&S();if(!X||!m)return;if(m.k==='mk'&&m.v&&isFinite(m.v.lat)&&isFinite(m.v.lon))X.brief.mk.push({lat:+m.v.lat,lon:+m.v.lon,txt:String(m.v.txt||'').slice(0,60),t:W.st.t});
  if(m.k==='note')X.brief.notes.push(String(m.v||'').slice(0,140));if(m.k==='ready'&&m.v)X.brief.ready[String(m.v.name).slice(0,16)]=!!m.v.on;if(m.k==='seat'&&m.v&&/^(pilot|wso)$/.test(m.v.seat))X.seat[m.v.seat]=String(m.v.who).slice(0,16);
  if(X.brief.mk.length>20)X.brief.mk.shift();if(X.brief.notes.length>20)X.brief.notes.shift();}
setInterval(attach,3000);
/* ------------------------------------------------------------------ journal, bookmarks, export, cards */
function journal(txt){const X=S();X.jr.unshift({t:W.st.t,txt:String(txt).slice(0,400)});if(X.jr.length>100)X.jr.length=100;}
function bookmark(name,lat,lon,zoom){const X=S();X.bm.push({name:String(name).slice(0,30),lat:+lat,lon:+lon,zoom:+zoom||4});if(X.bm.length>20)X.bm.shift();}
function csv(){const st=W.st;const H=['a3','name','side','alliance','population','air','ground','support','exhaustion','economy','displaced'];const L=[H.join(',')];
  for(const p of Object.values(st.c))L.push([p.a3,'"'+String(p.n).replace(/"/g,"'")+'"',p.side||'',p.al||'',p.pop||0,Math.round(p.air||0),Math.round((p.gnd||0)*10)/10,(p.sup??'').toString().slice(0,5),(p.exh??'').toString().slice(0,5),(p.econ??'').toString().slice(0,5),Math.round(p.disp||0)].join(','));return L.join('\n');}
function download(){try{const b=new Blob([csv()],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='war-day-'+Math.floor(W.st.t/24)+'.csv';a.click();}catch(e){}}
function card(kind,o){if(kind==='unit')return'<div class="card"><b>'+esc(o.name||o.id)+'</b> · '+esc(o.kind||'')+' · strength '+pct(o.str??1)+' · readiness '+pct(o.rdy??1)+'</div>';
  if(kind==='person')return'<div class="card"><b>'+esc(o.name||o.n)+'</b> · '+esc(o.rank||'')+' '+esc(o.role||o.job||'')+' · '+esc(String(o.st||'').toLowerCase())+'</div>';return'<div class="card">'+esc(JSON.stringify(o).slice(0,120))+'</div>';}
function board(p){const st=W.st,m=st.mil&&st.mil[p.a3];const sv=st.svc&&st.svc.c[p.a3];const up=Math.round((p.air||0)*(p.ready||.8));
  return'<h4>SQUADRON READINESS BOARD</h4><div style="display:flex;justify-content:space-between"><span>aircraft up · down</span><b>'+up+' · '+Math.max(0,Math.round(p.air||0)-up)+'</b></div><div style="display:flex;justify-content:space-between"><span>crews per aircraft · experience</span><b>'+(m?((m.crews||0)/Math.max(1,p.air||1)).toFixed(2):'—')+' · '+(m?pct(m.exp):'—')+'</b></div>'+
    (sv&&sv.inst[0]?'<div style="display:flex;justify-content:space-between"><span>duty roster</span><b>'+sv.inst[0].sh+' shifts · alert '+sv.inst[0].qra+' aircraft</b></div>':'');}
/* ------------------------------------------------------------------ DESK tab */
function daily(){if(!W.st)return;try{if(Math.floor(W.st.t/24)%2===0)tasking();}catch(e){console.warn('[desk]',e);}}
W.daily.push(daily);
function tab(p){const st=W.st;if(!st)return'<div>No war running.</div>';const X=S();const h0=X.hint<HINTS.length?'<div style="border:1px solid #6a7;padding:4px;font-size:10px">💡 '+HINTS[X.hint]+' <button data-dk="hint">next</button></div>':'';
  let h=h0+'<h4>TASKING</h4>'+(X.task.map((t,i)=>'<div><b>'+FAM[t.k]+'</b> — '+esc(t.txt)+' <span style="font-size:10px;color:#9ab">(complication: '+t.c+'; by day '+Math.floor(t.due/24)+')</span> <button data-dk="acc'+i+'">accept</button></div>').join('')||'<div>no tasking yet</div>');
  h+=board(p);
  h+='<h4>BRIEFING ROOM</h4><div style="font-size:10px">Seats ('+esc(typeof game!=='undefined'&&game.ac?game.ac:'')+'): '+seats(typeof game!=='undefined'?game.ac:'').join(', ')+' — pilot: '+esc(X.seat.pilot)+', WSO: '+esc(X.seat.wso)+'</div>'+X.brief.mk.slice(-5).map(m=>'<div style="font-size:10px">📍 '+m.lat.toFixed(2)+', '+m.lon.toFixed(2)+' — '+esc(m.txt)+'</div>').join('')+X.brief.notes.slice(-5).map(n=>'<div style="font-size:10px">📝 '+esc(n)+'</div>').join('')+
    '<div style="font-size:10px">Ready: '+(Object.entries(X.brief.ready).map(([k,v])=>esc(k)+(v?' ✔':' …')).join(', ')||'—')+'</div><input id="dkNote" placeholder="planning note" style="width:150px"><button data-dk="note">add</button>';
  h+='<h4>JOURNAL</h4><textarea id="dkJr" rows="2" style="width:95%"></textarea><button data-dk="jr">save entry</button>'+X.jr.slice(0,5).map(j=>'<div style="font-size:10px">day '+Math.floor(j.t/24)+' — '+esc(j.txt)+'</div>').join('');
  h+='<h4>SAVED MAP VIEWS</h4>'+(X.bm.map(b=>'<div style="font-size:10px">🔖 '+esc(b.name)+' ('+b.lat.toFixed(1)+', '+b.lon.toFixed(1)+')</div>').join('')||'<div style="font-size:10px">none</div>')+'<button data-dk="csv">export country figures (CSV)</button>';
  h+='<h4>ENCYCLOPEDIA</h4><input id="dkQ" placeholder="search equipment or terms" style="width:150px"><div id="dkR" style="font-size:10px"></div>';
  if(/wwdebug/.test(location.search))h+='<h4>INSPECTOR</h4><div style="font-size:10px">'+Object.keys(st).map(k=>k+' '+Math.round(JSON.stringify(st[k]).length/1024)+' kB').join(' · ')+'</div>';
  return h;}
function search(q){q=String(q||'').toLowerCase();if(q.length<2)return[];const out=[];for(const k in GLOS)if((k+GLOS[k]).toLowerCase().includes(q))out.push(k+' — '+GLOS[k]);
  const E=window.NATDATA&&NATDATA.EQ;if(E)for(const a3 in E)for(const c in E[a3])if(String(E[a3][c]).toLowerCase().includes(q)){out.push(E[a3][c]+' ('+a3+', '+c+')');if(out.length>20)return out;}return out;}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-dk]');if(!b||!W.st)return;const k=b.dataset.dk,X=S();
  if(k==='hint')X.hint++;else if(k.startsWith('acc'))accept(+k.slice(3));else if(k==='note'){const i=document.getElementById('dkNote');if(i&&i.value)note(i.value);}else if(k==='jr'){const i=document.getElementById('dkJr');if(i&&i.value)journal(i.value);}else if(k==='csv')download();
  if(window.NATPANEL&&NATPANEL.render)NATPANEL.render();});
document.addEventListener('input',e=>{if(e.target&&e.target.id==='dkQ'){const r=document.getElementById('dkR');if(r)r.innerHTML=search(e.target.value).map(esc).join('<br>');}});
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.DESK=tab;
W.desk={recv,S,tasking,accept,seats,take,mark,note,ready,journal,bookmark,csv,card,search,tab,FAM};
})();
