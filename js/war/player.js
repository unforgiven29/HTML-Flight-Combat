/* =====================================================================================================================
   v343 — the player's campaign around the cockpit (spec v49 ch.13 player campaign, flight experience, career and
   training; ch.15 AI flight behaviour; ch.14 long aftermath).
   CH.13
   * FLIGHT RECORDER: every world-war sortie records your track (lat/lon/alt, 1 Hz), weapon releases and the outcome;
     the last 10 recordings are kept; the debrief draws the track on a small map with events (DEBRIEF tab).
   * MISSION PATCHES: a patch per kind of mission flown (first sortie, CAS, SEAD, intercept, strike, ten sorties, a
     return from a lost aircraft) in a deployment insignia archive.
   * DIFFICULTY AND REALISM for the war: enemy skill (the game's own setting), strategic attrition (x0.7 / x1 / x1.3),
     and whether your own losses count in the war (REHEARSAL: fly a real campaign mission in isolation, no
     consequences — no losses, kills or events recorded).
   * OBSERVER MODE: in a world sortie, O cycles a spectator camera through the aircraft in the air (yours first);
     shift+O returns to your aircraft.
   CH.15
   * FUEL AND RECOVERY: AI flights in a world sortie go home at bingo (about 35-50 minutes aloft) and land (leave).
   * RADIO LIFE: flights report in, check out at bingo, call engagements; enemy flights that are far away and not
     engaged fly with radars cold ("GO COLD": no radar lock until within 60 km).
   CH.14
   * LONG AFTERMATH: every year after the war, the day it ended is a day of remembrance (event); veterans' care and
     children who lost a parent are estimated (labelled) from the war's losses.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WSORTIE)return;
const W=WWAR,WS=WSORTIE.WS,G=WGEO,rn=Math.random;
const PL=()=>{const st=W.st;return st.pl||(st.pl={rec:[],patch:{},diff:{att:1,rehearse:false}});};
/* ------------------------------------------------------------------ difficulty */
{const _m=W.mod;W.mod=(p,f,s)=>_m(p,f,s);}
{const _l=W.unitLoss;W.unitLoss=(u,a)=>{const pl=W.st&&W.st.pl;if(pl&&pl.diff.rehearse&&WS.on)return;return _l(u,a);};}
{const _e=W.emit;W.emit=function(ty,o){const pl=W.st&&W.st.pl;if(pl&&pl.diff.rehearse&&WS.on&&ty==='SORTIE')return null;return _e.apply(this,arguments);};}
W.daily.push(()=>{const pl=W.st&&W.st.pl;if(!pl||pl.diff.att===1)return;});
// strategic attrition: scale the daily losses through readiness of the enemy side (x att) — a light-touch rule
{const _r=W.rdy;W.rdy=p=>{const v=_r(p),pl=W.st&&W.st.pl;if(!pl||pl.diff.att===1)return v;const me=(typeof game!=='undefined'&&game.team==='RED')?'R':'B';return p.side&&p.side!==me?v*pl.diff.att:v;};}
/* ------------------------------------------------------------------ flight recorder */
let rec=null;
setInterval(()=>{if(!WS.on||!player||typeof game==='undefined'||!game.active){return;}if(!rec)rec={t0:W.st.t,a3:WS.me,ac:player.type,base:WS.base&&WS.base.name,trk:[],ev:[],task:WS.task&&WS.task.k||''};
  const ll=G.xz2ll(player.pos.x,player.pos.z);rec.trk.push([+ll.lat.toFixed(4),+ll.lon.toFixed(4),Math.round(player.pos.y)]);if(rec.trk.length>3600)rec.trk.splice(0,1);},1000);
{let nm=0;setInterval(()=>{if(!rec||typeof missiles==='undefined')return;const mine=missiles.filter(m=>m.sh===player&&!m.remote);if(mine.length>nm){const ll=G.xz2ll(player.pos.x,player.pos.z);rec.ev.push(['WEAPON',+ll.lat.toFixed(4),+ll.lon.toFixed(4),mine[mine.length-1].type]);}nm=mine.length;},500);}
{const _f=WSORTIE.finish;WSORTIE.finish=function(){const was=WS.on,k={...(WS.kills||{})},lost=WS.lost,task=WS.task&&WS.task.k;const r=_f.apply(this,arguments);
  if(was&&W.st){const pl=PL();if(rec){rec.out={air:k.air|0,gnd:k.gnd|0,lost:!!lost};rec.t1=W.st.t;rec.rehearsal=pl.diff.rehearse;pl.rec.unshift(rec);pl.rec.length=Math.min(pl.rec.length,10);}rec=null;
    patches(pl,k,lost,task);}return r;};}
/* ------------------------------------------------------------------ patches */
const PATCH={FIRST:'First Sortie',CAS:'Close Air Support',SEAD:'Air Defence Suppression',INTERCEPT:'Interceptor',STRIKE:'Strike',TEN:'Ten Sorties',SURVIVOR:'Came Home the Long Way',ACE:'Five Victories'};
function patches(pl,k,lost,task){const P=pl.patch,n=(pl.n=(pl.n||0)+1),give=x=>{if(P[x])return;P[x]=W.st.t;W.emit('PATCH',{txt:'Mission patch earned: '+PATCH[x]+'.'});};
  give('FIRST');if(task&&PATCH[task])give(task);if(n>=10)give('TEN');if(lost)give('SURVIVOR');pl.air=(pl.air||0)+(k.air|0);if(pl.air>=5)give('ACE');}
/* ------------------------------------------------------------------ AI: bingo fuel, radio, go cold */
const CALL={in:['{cs} checking in, on station.','{cs}, flight of two, at the front.'],out:['{cs} is bingo, RTB.','{cs} heading home, fuel state low.'],eng:['{cs} engaged, defending.','{cs}, tally, engaging.']};
const say=(k,cs,en)=>{if(typeof radio!=='function'||(typeof SET!=='undefined'&&SET.calls!=='ON'))return;const L=CALL[k];radio(L[(rn()*L.length)|0].replace('{cs}',cs),en);};
setInterval(()=>{if(!WS.on||!player||typeof game==='undefined'||!game.active)return;const now=performance.now();
  for(const j of WS.jets){if(!j.alive||j.gone)continue;if(!j._t0){j._t0=now;j._bingo=(35+rn()*15)*60e3;if(j.side===0)say('in',j.callsign||'Flight',false);}
    const ai=j.ai;if(!ai)continue;
    if(!j._rtb&&now-j._t0>j._bingo){j._rtb=1;const home=ai.route&&ai.route[0];ai.route=[{x:j.pos.x+(j.side?1:-1)*60000,z:j.pos.z+(j.side?-1:1)*60000,alt:8000}];ai.wi=0;ai.engaged=false;if(j.side===0)say('out',j.callsign||'Flight',false);}
    if(j._rtb&&now-j._t0>j._bingo+8*60e3){j._gone=1;j.alive=false;j.gone=true;scene.remove(j.mesh);const i=jets.indexOf(j);if(i>=0)jets.splice(i,1);}   // landed at home: out of the sortie, not a loss
    // GO COLD: far away and not engaged, the enemy's radars stay off
    if(j.side===1&&ai.radarLock&&j.pos.distanceTo(player.pos)>60000&&!ai.engaged){ai.radarLock=false;j._cold=1;}else if(j._cold&&j.pos.distanceTo(player.pos)<60000)j._cold=0;
    if(j.side===0&&ai.engaged&&!j._said){j._said=1;say('eng',j.callsign||'Flight',true);}}},2000);
// an aircraft that leaves the sortie at bingo is not counted as lost
{const _k=Jet.prototype.damage;}
/* ------------------------------------------------------------------ observer mode */
const OBS={on:false,i:0};
document.addEventListener('keydown',e=>{if(typeof game==='undefined'||game.scen!=='WORLD'||!game.active)return;if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.key!=='o'&&e.key!=='O')return;
  if(e.shiftKey){OBS.on=false;return;}const L=jets.filter(j=>j.alive&&!j.gone);if(!L.length)return;OBS.on=true;OBS.i=(OBS.i+1)%L.length;OBS.t=L[OBS.i];if(typeof flash==='function')flash('OBSERVER · '+(OBS.t===player?'YOUR AIRCRAFT':(OBS.t.callsign||OBS.t.type)),1500);});
if(typeof renderer!=='undefined'){const _r=renderer.render.bind(renderer);renderer.render=function(sc,cam){if(OBS.on&&OBS.t&&OBS.t.alive&&game.scen==='WORLD'&&cam===camera){const j=OBS.t,f=j.fwd(new THREE.Vector3()),u=j.up(new THREE.Vector3());
    camera.position.copy(j.pos).addScaledVector(f,-60).addScaledVector(u,14);camera.up.set(0,1,0);camera.lookAt(j.pos);}else if(OBS.on&&(!OBS.t||!OBS.t.alive))OBS.on=false;return _r(sc,cam);};}
/* ------------------------------------------------------------------ the long aftermath */
W.daily.push(()=>{const st=W.st;if(!st||!st.over)return;const days=Math.floor((st.t-st.over.t)/24);if(days<=0||days%365!==0)return;const yrs=days/365;
  const L=Object.values(st.c).filter(p=>p.lostAir>0||p.lostGnd>0),air=L.reduce((t,p)=>t+p.lostAir,0),gnd=L.reduce((t,p)=>t+p.lostGnd,0);
  const T=W.cemetery?W.cemetery.totals(null):null;
  W.emit('REMEMBRANCE',{txt:yrs+' year'+(yrs>1?'s':'')+' since the war ended. A day of remembrance in the countries that fought.'+(T?' The memorial archive holds '+(T.kM+T.kC)+' names of the dead and '+T.mM+' of the missing.':'')});});
/* ------------------------------------------------------------------ DEBRIEF tab */
function trackSvg(r){const T=r.trk;if(T.length<2)return'';let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const[la,lo]of T){a=Math.min(a,la);b=Math.max(b,la);c=Math.min(c,lo);d=Math.max(d,lo);}
  const w=220,h=140,sx=w/Math.max(.01,d-c),sy=h/Math.max(.01,b-a),s=Math.min(sx,sy)*.9,X=lo=>(lo-c)*s+5,Y=la=>h-((la-a)*s+5);
  return '<svg width="'+w+'" height="'+h+'" style="background:#0f1413;border:1px solid #333" role="img" aria-label="flight track"><polyline fill="none" stroke="#7fd1a0" stroke-width="1.4" points="'+T.map(([la,lo])=>X(lo).toFixed(1)+','+Y(la).toFixed(1)).join(' ')+'"/>'+
    r.ev.map(e=>'<circle cx="'+X(e[2]).toFixed(1)+'" cy="'+Y(e[1]).toFixed(1)+'" r="3" fill="#e0b05a"><title>'+e[3]+'</title></circle>').join('')+'<circle cx="'+X(T[0][1]).toFixed(1)+'" cy="'+Y(T[0][0]).toFixed(1)+'" r="3" fill="#6aa9e0"/></svg>';}
const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>';
function tab(p){const pl=PL(),R=pl.rec.filter(r=>r.a3===p.a3);let h='<h4>SETTINGS</h4>'+
  row('Enemy strategic strength','<span>'+[['0.7','EASIER'],['1','NORMAL'],['1.3','HARDER']].map(([v,l])=>'<button data-pd="att" data-v="'+v+'" aria-pressed="'+(pl.diff.att===+v)+'">'+l+'</button>').join(' ')+'</span>')+
  row('Rehearsal (no consequences)','<button data-pd="reh" aria-pressed="'+pl.diff.rehearse+'">'+(pl.diff.rehearse?'ON':'OFF')+'</button>')+'<div style="font-size:10px;color:#8a9a92">Enemy pilot skill is the game\'s own SKILL setting. Observer camera in flight: O (cycle), Shift+O (back).</div>';
  const P=Object.keys(pl.patch);h+='<h4>MISSION PATCHES</h4>'+(P.length?'<div style="display:flex;flex-wrap:wrap;gap:4px">'+P.map(k=>'<span style="border:1px solid #6a6;border-radius:12px;padding:2px 8px">'+PATCH[k]+'</span>').join('')+'</div>':'<div>None yet.</div>');
  h+='<h4>FLIGHT RECORDER</h4>'+(R.length?R.slice(0,3).map(r=>'<div>'+W.date(r.t0).slice(0,10)+' · '+r.ac+' from '+(r.base||'?')+(r.task?' · '+r.task:'')+(r.rehearsal?' · REHEARSAL':'')+' · '+(r.out?r.out.air+' air, '+r.out.gnd+' ground'+(r.out.lost?', aircraft lost':''):'')+'</div>'+trackSvg(r)).join(''):'<div>No sorties recorded for '+p.n+' yet.</div>');
  return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.DEBRIEF=tab;
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-pd]');if(!b||!W.st)return;const pl=PL();if(b.dataset.pd==='att')pl.diff.att=+b.dataset.v;else pl.diff.rehearse=!pl.diff.rehearse;WARMAP.panel();});
W.player={PL,patches,tab,OBS,trackSvg};
})();
