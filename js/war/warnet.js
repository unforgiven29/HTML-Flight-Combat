/* =====================================================================================================================
   v337 — world war multiplayer (spec v49 ch.16), on the existing room system (net: PeerJS rooms, presence 20 Hz, events).
   * HOST: the first player in the room. Its game runs the war (strategic simulation, sorties, AI traffic, ground units).
   * GUESTS: receive the host's war state on joining and every 15 s (read only: their own simulation is paused), and
     fly for any country at war: the same country as the host (co-op, friendly) or one on the other side (PvP).
   * Each game keeps its own floating origin. Every position sent carries the sender's origin (lat/lon) and is moved
     into the receiver's frame (WGEO.ll2xz of the sender's origin), so players can be anywhere on Earth.
   * During a host sortie: AI jets and their missiles 5x a second, ground units (front armour, SAM sites, AAA) once a
     second, all with absolute sides (B/R) so a guest on the other side sees them the right way round.
   * Hits: a guest's hit on an AI jet goes to the host ('chit' with the jet's id); a guest's kill of a ground unit or
     bridge goes to the host ('wgk'); the host's AI hits on players go through the usual 'hit' event. The war counts
     losses only in the host's game. A guest's sortie summary is sent to the host and logged in the war ('wsx').
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WSORTIE||typeof net==='undefined')return;
const W=WWAR,G=WGEO,WS=WSORTIE.WS,N={on:false,host:false,prox:new Map(),gu:new Map(),rms:new Map(),T:{st:0,ai:0,gu:0},n:0,ids:new WeakMap()};
const n2=(v,d=0)=>Number.isFinite(+v)?+v:d,r1=v=>Math.round(v*10)/10,r4=v=>Math.round(v*1e4)/1e4;
const myO=()=>[G.o.lat,G.o.lon];
// offset that moves a position in the sender's frame (origin o) into ours
const off=o=>{if(!Array.isArray(o)||!G.o)return{x:0,z:0};const p=G.ll2xz(n2(o[0]),n2(o[1]));return{x:p.x,z:p.z};};
const sideL=()=>{const c=WS.me&&W.st&&W.st.c[WS.me];return c&&c.side||(game.team==='RED'?'R':'B');};
const loc=L=>L===sideL()?0:1;
const ABS=s=>s===0?sideL():(sideL()==='B'?'R':'B');
function cid(j){let c=N.ids.get(j);if(!c){c='w'+(++N.n);N.ids.set(j,c);if(!missiles.includes(j))j.cid=c;}return c;}

/* ------------------------------------------------------------------ joining a room for the war */
async function join(){const cs=((document.getElementById('cs')||{}).value||'').trim().slice(0,16)||'Pilot',
    code=(((document.getElementById('wwCode')||document.getElementById('code')||{}).value||'').trim().toLowerCase().replace(/[^a-z0-9_.-]/g,'')||'war').slice(0,40);
  if(net.on&&!net.ww)await net.leave();
  if(!net.on){const ok=await net.connect('ww-'+code,cs);if(!ok)return status('Could not connect to the room.');}
  net.ww=true;N.on=true;N.host=!!net.isHost;net.sd=sideL();hooks();
  if(N.host){status('Hosting war room "'+code+'" · friends join with the same code. Your game runs the war.');}
  else{status('Joined "'+code+'" · waiting for the host\'s war…');net.r.emit('wreq',{}).catch(()=>{});}
  render();}
async function leave(){N.on=false;N.host=false;net.ww=false;clear();if(net.on)await net.leave();status('Left the war room.');render();}
function status(t){N.msg=t;const el=document.getElementById('wwMpS');if(el)el.textContent=t;}
function clear(){for(const j of N.prox.values())drop(j);N.prox.clear();for(const u of N.gu.values()){u.alive=false;if(u.mesh)scene.remove(u.mesh);const i=GND.units.indexOf(u);if(i>=0)GND.units.splice(i,1);}N.gu.clear();
  for(const m of N.rms.values())m.remove(false);N.rms.clear();}
function drop(j){j.alive=false;j.gone=true;scene.remove(j.mesh);const i=jets.indexOf(j);if(i>=0)jets.splice(i,1);if(radar.lock===j)radar.drop();radar.tracks.delete(j);}

/* ------------------------------------------------------------------ messages */
let hooked=null;
function hooks(){if(hooked===net.r)return;hooked=net.r;const r=net.r,U=net.unsub;
  U.push(r.on('wreq',m=>{if(!N.host||m.sameTab||!W.st)return;r.emit('wst',{to:m.peer,st:W.st}).catch(()=>{});}));
  U.push(r.on('wst',m=>{if(N.host||!m.data||!m.data.st||(m.data.to&&m.data.to!==net.me))return;const st=m.data.st;if(!st.c||!st.fronts)return;
    const first=!N.got;W.st=st;W.run=false;N.got=1;N.quiet=0;if(first){status('In the host\'s war · pick a country and an airfield on the WORLD WAR map.');}
    try{WARMAP.panel();}catch(e){}render();}));
  U.push(r.on('wai',m=>{if(N.host||m.sameTab||!m.data||!WS.on)return;applyAI(m.data);}));
  U.push(r.on('wgu',m=>{if(N.host||m.sameTab||!m.data||!WS.on)return;applyGU(m.data);}));
  U.push(r.on('chit',m=>{if(!N.host||m.sameTab||!m.data||!rate(m.peer))return;const j=[...WS.jets].find(q=>q.cid===m.data.cid);if(!j||!j.alive)return;
    j.lastWeapon=String(m.data.w||'');j.damage(Math.max(0,Math.min(250,n2(m.data.dmg))),net.jetByPeer(m.peer));}));
  U.push(r.on('wgk',m=>{if(!N.host||m.sameTab||!m.data||!rate(m.peer))return;const d=m.data,src=net.jetByPeer(m.peer);
    const u=d.br?GND.units.find(q=>q._bridge===d.br&&q.alive):WS.ground.find(q=>q.cid===d.id&&q.alive);if(u&&plausible(src,u))u.kill(src);else if(u)N.rej=(N.rej||0)+1;}));
  U.push(r.on('wsx',m=>{if(!N.host||m.sameTab||!m.data||!W.st)return;const d=m.data,c=W.st.c[d.a3];if(!c)return;
    W.emit('SORTIE',{e:[d.a3],txt:'A '+c.n+' '+String(d.ac||'').slice(0,12)+' sortie (wingman '+String(d.cs||'Pilot').slice(0,16)+'): '+Math.min(8,+d.air|0)+' aircraft and '+Math.min(40,+d.gnd|0)+' ground targets destroyed'+(d.lost?'; the aircraft was lost':'')+'.'});
    if(d.lost){const sq=W.ob&&W.ob.squadronFor(d.a3,String(d.base||''));if(sq)W.unitLoss(sq,1);}}));}

/* ------------------------------------------------------------------ validation of guests' messages (ch.16 security) */
// at most 10 hit / kill reports a second per player; a ground kill only from a player whose aircraft is within 15 km of
// the target (in the host's frame); sortie summaries clamped. Rejected reports are counted (DEBUG view), never applied.
const RL=new Map();function rate(peer){const now=Date.now(),r=RL.get(peer)||{t:now,n:0};if(now-r.t>1000){r.t=now;r.n=0;}r.n++;RL.set(peer,r);if(r.n>10){N.rej=(N.rej||0)+1;return false;}return true;}
function plausible(src,u){if(!src||!src.pos)return false;return Math.hypot(src.pos.x-u.pos.x,src.pos.z-u.pos.z)<15000;}
/* ------------------------------------------------------------------ host: publish */
function pubAI(){const A=[],M=[];for(const j of WS.jets){if(j.gone)continue;
    A.push([cid(j),ACK.indexOf(j.type),ABS(j.side),r1(j.pos.x),r1(j.pos.y),r1(j.pos.z),r4(j.q.x),r4(j.q.y),r4(j.q.z),r4(j.q.w),r1(j.vel.x),r1(j.vel.y),r1(j.vel.z),j.alive?1:0,j.trigger?1:0,
      j.ai&&j.ai.radarLock&&j.ai.t&&j.ai.t.peer||'',j.callsign||'']);}
  for(const m of missiles){if(m.remote||!m.alive||!m.sh||!WS.jets.has(m.sh))continue;const tg=m.track&&!m.track.isDecoy?(m.track===player?net.me:m.track.peer||''):'';
    M.push([cid(m),MSL_KEYS.indexOf(m.type),r1(m.pos.x),r1(m.pos.y),r1(m.pos.z),r1(m.vel.x),r1(m.vel.y),r1(m.vel.z),(m.active?1:0)|(m.dl?2:0)|(m.burning?4:0),tg,cid(m.sh)]);if(M.length>=24)break;}
  net.r.emit('wai',{o:myO(),a:A,m:M}).catch(()=>{});}
function pubGU(){const g=[];for(const u of WS.ground){g.push([cid(u),u.kind,ABS(u.side),Math.round(u.pos.x),Math.round(u.pos.z),Math.round(u.hdg||0),u.alive?1:0]);}
  net.r.emit('wgu',{o:myO(),g}).catch(()=>{});}

/* ------------------------------------------------------------------ guest: apply */
function applyAI(D){const o=off(D.o),now=performance.now(),seen=new Set();
  for(const a of Array.isArray(D.a)?D.a:[]){if(!Array.isArray(a)||a.length<17)continue;const type=ACK[a[1]];if(!type||!AC[type])continue;const side=loc(a[2]);let j=N.prox.get(a[0]);
    if(j&&j.side!==side){drop(j);N.prox.delete(a[0]);j=null;}
    const px=n2(a[3])+o.x,py=n2(a[4]),pz=n2(a[5])+o.z;
    if(!j){try{j=new Jet(side,type,{},'modern');}catch(e){continue;}j.remote=true;j.cid=a[0];j.ai={radarLock:false,t:null,friend:side===0,update(){}};
      j.net={p:new V3(px,py,pz),v:new V3(),q:new Q4(),t:now};j.pos.copy(j.net.p);j.q.set(n2(a[6]),n2(a[7]),n2(a[8]),n2(a[9],1)).normalize();N.prox.set(a[0],j);}
    j.callsign=String(a[16]||'').slice(0,40);j.net.p.set(px,py,pz);j.net.q.set(n2(a[6]),n2(a[7]),n2(a[8]),n2(a[9],1)).normalize();j.net.v.set(n2(a[10]),n2(a[11]),n2(a[12]));j.net.t=now;
    if(!a[13]&&j.alive){j.alive=false;explode(j.net.p,true);j.mesh.visible=false;}j.netTrig=!!a[14];j.ai.radarLock=!!a[13]&&a[15]===net.me&&!!net.me;j.ai.t=j.ai.radarLock?player:null;seen.add(a[0]);}
  for(const[k,j]of N.prox)if(!seen.has(k)){drop(j);N.prox.delete(k);}
  const ms=new Set();for(const a of Array.isArray(D.m)?D.m:[]){if(!Array.isArray(a)||a.length<11)continue;const type=MSL_KEYS[a[1]];if(!type)continue;const key='w'+a[0];ms.add(key);
    let m=N.rms.get(key);if(!m||!m.alive){const sh=N.prox.get(a[10]);if(!sh)continue;m=new RemoteMissile(key,type,sh);N.rms.set(key,m);if(a[9]===net.me&&MSL[type].seek!=='IR')rwrEvent('launch');}
    m.set(a.map((v,i)=>i===9?v:i===2?n2(v)+o.x:i===4?n2(v)+o.z:n2(v)),a[9]===net.me&&!!net.me);}
  for(const[k,m]of N.rms)if(!ms.has(k)){m.remove(true);N.rms.delete(k);}}
function applyGU(D){const o=off(D.o),seen=new Set();
  for(const a of Array.isArray(D.g)?D.g:[]){if(!Array.isArray(a)||a.length<7||typeof GTY==='undefined'||!GTY[a[1]])continue;seen.add(a[0]);let u=N.gu.get(a[0]);const x=n2(a[3])+o.x,z=n2(a[4])+o.z;
    if(!u){if(!a[6])continue;u=GND.add(a[1],loc(a[2]),x,z,n2(a[5]));u._net=a[0];u.mesh.position.y=groundAt(x,z);N.gu.set(a[0],u);}
    else if(Math.hypot(u.pos.x-x,u.pos.z-z)>60){u.pos.x=x;u.pos.z=z;if(u.mesh){u.mesh.position.x=x;u.mesh.position.z=z;}}
    if(!a[6]&&u.alive){u._quiet=1;u.kill(null);}}
  for(const[k,u]of N.gu)if(!seen.has(k)&&!u.alive)N.gu.delete(k);}
// a guest's kill of a host ground unit or of a bridge goes to the host
if(typeof GUnit!=='undefined'){const _k=GUnit.prototype.kill;GUnit.prototype.kill=function(src){const was=this.alive,r=_k.apply(this,arguments);
  if(was&&!this.alive&&N.on&&!N.host&&net.on&&!this._quiet&&src===player){if(this._net)net.r.emit('wgk',{id:this._net}).catch(()=>{});else if(this._bridge)net.r.emit('wgk',{br:this._bridge}).catch(()=>{});
    if(this._net)WS.kills.gnd++;}
  return r;};}

/* ------------------------------------------------------------------ positions of other players: into our frame */
{const _a=net.applyPeer;net.applyPeer=function(p,now){const pr=p&&p.presence;
  if(this.ww&&pr&&Array.isArray(pr.s)&&pr.o){const o=off(pr.o);if(o.x||o.z){const s=pr.s.slice();s[0]=n2(s[0])+o.x;s[2]=n2(s[2])+o.z;
      const m=Array.isArray(pr.m)?pr.m.map(a=>Array.isArray(a)?a.map((v,i)=>i===2?n2(v)+o.x:i===4?n2(v)+o.z:v):a):pr.m;p={...p,presence:{...pr,s,m}};}
    const e=this.peers.get(p.peer),want=(this.coop||(pr.sd&&pr.sd===this.sd))?0:1;if(e&&e.jet&&e.jet.side!==want)this.dropJet(e);}
  return _a.call(this,p,now);};}
// AI that is a guest's proxy: CAMP.byCid lookups (who shot me) also see these
if(window.CAMP){const _b=CAMP.byCid;CAMP.byCid=function(c){return _b.call(this,c)||N.prox.get(c)||[...WS.jets].find(j=>j.cid===c)||null;};}

/* ------------------------------------------------------------------ sortie hooks */
{const _s=WSORTIE.start;WSORTIE.start=async function(a3,ap){if(N.on&&!N.host&&!N.got){flash('WAITING FOR THE HOST\'S WAR',2500);return;}
  WS.client=N.on&&!N.host;net.sd=W.st&&W.st.c[a3]?W.st.c[a3].side:net.sd;const r=await _s.apply(this,arguments);if(WS.client)W.run=false;N.base=ap&&ap.ident;return r;};}
{const _f=WSORTIE.finish;WSORTIE.finish=function(){const was=WS.on;if(was&&WS.client&&net.on)
    net.r.emit('wsx',{a3:WS.me,ac:player&&player.type,cs:net.cs,air:WS.kills.air,gnd:WS.kills.gnd,lost:WS.lost?1:0,base:N.base||''}).catch(()=>{});
  const r=_f.apply(this,arguments);if(was&&N.on){clear();if(WS.client){W.run=false;}}return r;};}
// no own war simulation on a guest
setInterval(()=>{if(N.on&&!N.host&&N.got)W.run=false;},500);

/* ------------------------------------------------------------------ tick */
{let last=Date.now();setInterval(()=>{const now=Date.now(),dt=(now-last)/1000;last=now;if(!N.on||!net.on)return;
  if(N.host!==!!net.isHost){N.host=!!net.isHost;if(N.host){   // host migration: the room promoted this guest; it already holds the latest war state
      WS.client=false;for(const j of N.prox.values())drop(j);N.prox.clear();N.got=1;W.run=true;status('The host left: your game now runs the war for the room.');if(W.st)W.emit('MULTIPLAYER',{txt:'Host migration: '+(net.cs||'a guest')+' now runs the war for the room.'});}}
  if(!N.host&&N.on){N.quiet=(N.quiet||0)+dt;if(N.quiet>45){N.quiet=0;net.r.emit('wreq',{}).catch(()=>{});status('No word from the host for 45 s: asking for the war again…');}}
  if(!N.host)return;N.T.st-=dt;N.T.ai-=dt;N.T.gu-=dt;
  if(N.T.st<=0&&W.st){N.T.st=15;net.r.emit('wst',{st:W.st}).catch(()=>{});}
  if(WS.on&&G.o){if(N.T.ai<=0){N.T.ai=.2;pubAI();}if(N.T.gu<=0){N.T.gu=1;pubGU();}}},100);}

/* ------------------------------------------------------------------ UI: a box on the WORLD WAR map panel */
function render(){const el=document.getElementById('wmWar');if(!el)return;let b=el.querySelector('#wwMp');if(b)b.remove();
  const peers=net.on&&net.r?Math.max(0,net.r.peers().length-1):0;
  const h='<div id="wwMp" class="prof"><b>MULTIPLAYER WAR</b><div style="font-size:10px;color:#8a9a92">Fly the same war with friends. The host\'s game runs the war; guests fly for the same side (co-op) or the other side (PvP). Same room code on every game.</div>'+
    (N.on?'<div class="tc" style="margin-top:3px">'+(N.host?'HOST':'GUEST')+' · '+peers+' other player'+(peers===1?'':'s')+' <button data-wwmp="leave">LEAVE</button></div>'
      :'<div class="tc" style="margin-top:3px"><input id="wwCode" placeholder="room code" maxlength="40" style="width:110px" value="'+(N.code||'')+'"> <button data-wwmp="join">HOST / JOIN</button></div>')+
    '<div id="wwMpS" style="font-size:10px;margin-top:2px">'+(N.msg||'')+'</div></div>';
  el.insertAdjacentHTML('beforeend',h);}
if(window.WARMAP&&WARMAP.after)WARMAP.after.push(render);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wwMp [data-wwmp]');if(!b)return;if(b.dataset.wwmp==='join'){const i=document.getElementById('wwCode');N.code=i?i.value:'';join();}else leave();});
window.WWNET={N,join,leave,render,off,applyAI,applyGU,rate,plausible};
})();
