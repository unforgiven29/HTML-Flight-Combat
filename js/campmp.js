/* =====================================================================================================================
   v224 — campaign and multiplayer upgrade. Loads after game.js and wraps the existing CAMP / CMPUI / net objects.

   CAMPAIGN
   * Sortie debrief: the tasking you flew is scored against what actually happened (CAS: red ground units destroyed near the
     task point, SEAD: the SAM battery, STRIKE: the airfield hangars, CAP: an air kill). A completed task takes red reserves
     and adds to ours, and goes in the war log.
   * Theatre status panel on the CAMPAIGN tab: objective (win condition), airfields held, how far the front has moved since
     the war began, reserves, and every red airfield with its distance from the line, damage and jets left.
   * Save export / import (JSON file), so a campaign can move between machines and Chromebooks.

   MULTIPLAYER
   * Ping per pilot (round trip through the host) in the scoreboard and in a live pilot list in the room panel.
   * Text chat: Ctrl+Enter in flight (or the box in the MULTIPLAYER tab).
   * Invite link: ?room=CODE&mode=coop|ffa opens the MULTIPLAYER tab with the code filled in. Copy it with one button.
   * Dogfight rules: score limit chosen by the host. When someone reaches it everyone sees the final standings, scores reset
     and the room respawns for the next round. 4 s of spawn protection in dogfights.
   * Co-op: the host's selected tasking is shared with every pilot in the room.
   ===================================================================================================================== */
(()=>{
"use strict";
if(typeof net==='undefined'||typeof CAMP==='undefined'||typeof CMPUI==='undefined'||typeof Jet==='undefined')return;
const $q=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fin=(v,d=0)=>Number.isFinite(v)?v:d;
const NMk=1852;

/* ------------------------------------------------------------------------------------------------ styles */
document.head.insertAdjacentHTML('beforeend','<style>'+
 '#mpChatIn{position:fixed;left:50%;bottom:16%;transform:translateX(-50%);width:min(520px,80vw);z-index:9;padding:8px 10px;background:rgba(6,10,8,.88);border:1px solid var(--cy,#5be1ff);border-radius:6px;color:#e8f0ec;font:700 13px "B612 Mono",monospace;outline:none}'+
 '#mpLog{position:fixed;left:calc(12px + env(safe-area-inset-left,0px));bottom:22%;max-width:min(420px,60vw);z-index:4;display:grid;gap:2px;pointer-events:none;font:700 12px "B612 Mono",monospace}'+
 '#mpLog div{padding:2px 8px;background:rgba(6,10,8,.62);border-left:2px solid #5be1ff;color:#dfeee6;text-shadow:0 1px 2px #000}#mpLog div b{color:#ffcf5a;margin-right:6px}#mpLog div.sys{border-color:#ffcf5a;color:#ffcf5a}'+
 '#mpRound{position:fixed;inset:0;z-index:10;display:grid;place-content:center;justify-items:center;gap:6px;background:rgba(2,6,8,.78);color:#e8f0ec;font:700 14px "B612 Mono",monospace;text-align:center;pointer-events:none}'+
 '#mpRound h2{margin:0;font:700 30px "Stardos Stencil","B612",sans-serif;letter-spacing:.14em;color:#ffcf5a}#mpRound .row{display:flex;gap:18px;justify-content:space-between;min-width:300px}#mpRound .row.w{color:#7dffa0}#mpRound small{color:#9bb0a6;margin-top:8px}'+
 '.mp-peers{display:grid;gap:2px;font:700 11px "B612 Mono",monospace;margin:6px 0}.mp-peers div{display:grid;grid-template-columns:1fr auto auto auto;gap:12px;padding:2px 0;border-bottom:1px solid rgba(255,255,255,.06)}.mp-peers .me{color:#7dffa0}.mp-peers .h{color:var(--dm,#8a9a92);font-size:9.5px;letter-spacing:.1em}'+
 '.png-g{color:#7dffa0}.png-a{color:#ffcf5a}.png-r{color:#ff6a58}'+
 '.mp-chat{display:flex;gap:6px;margin-top:6px}.mp-chat input{flex:1;min-width:0}'+
 '#cmObj .cm-bar{display:flex;height:6px;border-radius:3px;overflow:hidden;background:rgba(255,255,255,.08);margin:3px 0 7px}#cmObj .cm-bar i{display:block;height:100%}#cmObj .cm-bar .b{background:#5be1ff}#cmObj .cm-bar .r{background:#ff5a4a}'+
 '#cmObj .ob{display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:11px;margin:2px 0}#cmObj .ob span{color:var(--dm,#8a9a92)}#cmObj .ob b{color:var(--tx,#e8f0ec)}'+
 '#cmObj .rb{display:grid;grid-template-columns:1fr auto;gap:0 10px;font-size:10.5px;padding:3px 0;border-top:1px solid rgba(255,255,255,.06)}#cmObj .rb em{font-style:normal;color:var(--dm,#8a9a92);grid-column:1/3}'+
 '#cmObj .cm-io{display:flex;gap:6px;margin-top:8px}#cmObj .cm-io button{all:unset;cursor:pointer;font:700 10px var(--f1,"B612 Mono",monospace);letter-spacing:.1em;color:var(--cy,#5be1ff);padding:3px 7px;border:1px solid currentColor;border-radius:3px}'+
 '.cm-debrief{display:block;margin-top:6px;font-size:11px;line-height:1.5;color:var(--dm,#9bb0a6);text-align:left}.cm-debrief b{color:#e8f0ec}.cm-debrief .ok{color:#7dffa0}.cm-debrief .no{color:#ff9a88}.cm-debrief .pt{color:#ffcf5a}'+
 '</style>');

/* ================================================================================================ CAMPAIGN */
// ---------- tasking progress: what is left of the thing the task asked you to hit ----------
const RAD={CAS:15000,SEAD:1,STRIKE:1,CAP:0};
function taskProbe(){const st=CAMP.st,t=CAMP.task;if(!st||!t)return null;
  try{
    if(t.kind==='CAS'){return{kind:'CAS',n:st.units.filter(u=>!u.dead&&u.s===1&&Math.hypot(u.x-t.x,u.z-t.z)<RAD.CAS).length};}
    if(t.kind==='SEAD'){const id=+String(t.id).replace('SEAD',''),a=st.ad.find(q=>q.id===id);return{kind:'SEAD',id,n:a?a.al.reduce((m,v)=>m+(v?1:0),0):0};}
    if(t.kind==='STRIKE'){const bid=String(t.id).replace('STK','');return{kind:'STRIKE',bid,n:st.ad.filter(a=>a.k==='BT'&&String(a.b)===bid&&a.al[0]).length};}
    if(t.kind==='CAP'){return{kind:'CAP',n:0};}
    if((t.kind==='INTERCEPT'||t.kind==='ESCORT')&&t.fid!=null){const fl=CAMP._bfl&&CAMP._bfl.get(t.fid);return{kind:t.kind,n:fl?fl.dead:0,drop:fl&&fl.dropped?1:0,nuke:fl&&fl.nuke?1:0};}
  }catch(e){}
  return null;}
function snap(){const t=CAMP.task;return{task:t?{id:t.id,kind:t.kind,label:t.label,x:t.x,z:t.z,fid:t.fid}:null,probe:taskProbe(),ak:0,gk:0};}

function grade(S,sortie){if(!S||!S.task||!S.probe)return null;
  const now=(()=>{const keep=CAMP.task;CAMP.task=S.task;const p=taskProbe();CAMP.task=keep;return p;})();
  if(!now)return null;const was=S.probe.n,left=now.n,k=S.task.kind,ak=sortie?sortie.ak:0;let state='NONE',txt='';
  if(k==='INTERCEPT'||k==='ESCORT'){const kills=left-was,dr=now.drop,big=!!S.probe.nuke||!!now.nuke;
    if(k==='INTERCEPT'){if(kills>0&&!dr){state='DONE';txt='bomber flight destroyed before it reached its target'+(big?' · nuclear attack averted':'');}else if(kills>0){state='PART';txt=kills+' bomber'+(kills===1?'':'s')+' shot down, but the bombs were dropped';}else{state='NONE';txt=dr?'the bombers hit their target':'no bomber brought down';}}
    else{state=dr&&kills===0?'DONE':dr?'PART':'NONE';txt=dr?(kills?kills+' bomber'+(kills===1?'':'s')+' lost, the strike went in':'strike delivered, no bombers lost'):'the strike did not reach its target';}
    return{kind:k,label:S.task.label,state,txt,big};}
    if(k==='CAS'){const d=was-left;txt=d+' red ground unit'+(d===1?'':'s')+' destroyed near the target area';state=d>=3?'DONE':d>=1?'PART':'NONE';}
  else if(k==='SEAD'){txt=left===0?'SAM battery destroyed':'battery still has '+left+' launcher'+(left===1?'':'s');state=left===0&&was>0?'DONE':left<was?'PART':'NONE';}
  else if(k==='STRIKE'){const d=was-left;txt=left===0&&was>0?'airfield hangars destroyed':d+' of '+was+' hangar'+(was===1?'':'s')+' destroyed';state=left===0&&was>0?'DONE':d>=1?'PART':'NONE';}
  else if(k==='CAP'){txt=ak+' air kill'+(ak===1?'':'s')+' on station';state=ak>=1?'DONE':'NONE';}
  return{kind:k,label:S.task.label,state,txt};}

// remember the tasking when a sortie starts (and again after a respawn in the same sortie)
{const _ss=CAMP.startSortie;CAMP.startSortie=async function(){const r=await _ss.apply(this,arguments);try{if(this.on)this._snap=snap();}catch(e){}return r;};
 const _rs=CAMP.respawn;CAMP.respawn=function(){const r=_rs.apply(this,arguments);try{this._snap=snap();}catch(e){}return r;};}

// score the sortie, pay out the reward, show the debrief
{const _se=CAMP.sortieEnd;CAMP.sortieEnd=function(){
  const st=this.st,s=this.sortie?Object.assign({},this.sortie):null,P=player,S=this._snap,t0=s?performance.now()-s.start:0;let g=null,dead=false;
  try{dead=!!(P&&!P.alive);g=grade(S,s);}catch(e){}
  const r=_se.apply(this,arguments);
  try{
    if(g&&st){
      if(g.state==='DONE'&&!dead||g.state==='DONE'&&dead){const rr=g.big?10:g.kind==='CAP'?2:4;st.res[1]=Math.max(0,st.res[1]-rr);st.res[0]+=Math.ceil(rr*.75);this.log('Tasking complete ('+g.kind+'): '+g.txt+'. Red reserves -'+rr+'.','b');}
      else if(g.state==='PART'){st.res[1]=Math.max(0,st.res[1]-1);this.log('Tasking partly done ('+g.kind+'): '+g.txt+'.','');}
      else this.log('Tasking not completed ('+g.kind+'): '+g.txt+'.','r');
      this.save();}
    const m=Math.max(0,Math.round(t0/1000)),res=$q('#result');
    if(res&&s){const st2=g?(g.state==='DONE'?'<span class="ok">TASK COMPLETE</span>':g.state==='PART'?'<span class="pt">TASK PARTLY DONE</span>':'<span class="no">TASK NOT COMPLETED</span>'):'<span class="pt">FREE HUNT · no tasking</span>';
      res.insertAdjacentHTML('beforeend','<span class="cm-debrief"><b>DEBRIEF</b> · '+Math.floor(m/60)+':'+String(m%60).padStart(2,'0')+' flown · '+s.ak+' air / '+s.gk+' ground kills<br>'+st2+(g?' · '+esc(g.txt):'')+
        (g&&g.state==='DONE'?'<br>Reserves swing in your favour.':'')+'</span>');}
  }catch(e){console.warn('debrief',e);}
  this._snap=null;return r;};}

// ---------- theatre status ----------
function theatre(){const st=CAMP.st;if(!st)return'';
  const F=st.front,mean=F.reduce((a,b)=>a+b,0)/F.length;if(st.f0==null||!isFinite(st.f0))st.f0=mean;
  const adv=(st.f0-mean)/1000; // front z falls as blue advances north
  const blue=CAMP.bases(0).length,red=CAMP.bases(1).length,tot=Math.max(1,st.bases.length);
  const rs0=Math.max(0,st.res[0]),rs1=Math.max(0,st.res[1]),pb=Math.round(100*rs0/Math.max(1,rs0+rs1));
  const nmFmt=v=>Math.round(Math.abs(v)/NMk);
  let rb='';for(const b of CAMP.bases(1).sort((a,c)=>(Math.abs(a.z-CAMP.frontZ(a.x)))-(Math.abs(c.z-CAMP.frontZ(c.x))))){
    const d=(b.z-CAMP.frontZ(b.x))/1000; // negative: beyond the line in red land
    rb+='<div class="rb"><b>'+esc(b.name)+'</b><b>'+nmFmt(d*1000)+' NM</b><em>'+Math.round(d*-1)+' km behind the red line · '+Math.floor(b.pool)+' jets · '+Math.round(b.dmg)+'% damaged</em></div>';}
  const at=CAMP.bases(0).filter(b=>b.dmg>=40).map(b=>esc(b.name)+' '+Math.round(b.dmg)+'%').join(', ');
  const verdict=st.over==='VICTORY'?'VICTORY · every red airfield is ours':st.over==='DEFEAT'?'DEFEAT · our last airfield has fallen':
    (red<=1?'One red airfield left. Finish it.':blue<=1?'Our last airfield is under threat. Hold it.':'Take all '+tot/2+' red airfields. A field falls when the front rolls over it.');
  return'<div class="pl-sec" id="cmObj"><h3>THEATRE <span class="cm-sub">objective and front</span></h3>'+
    '<div class="ob"><span>Objective</span><b>'+verdict+'</b></div>'+
    '<div class="ob"><span>Airfields</span><b>'+blue+' held · '+red+' red</b></div>'+
    '<div class="ob"><span>Front since day 1</span><b>'+(Math.abs(adv)<.5?'unchanged':adv>0?'+'+adv.toFixed(1)+' km advanced':Math.abs(adv).toFixed(1)+' km lost')+'</b></div>'+
    '<div class="ob"><span>Reserves</span><b>'+Math.floor(rs0)+' vs '+Math.floor(rs1)+'</b></div><div class="cm-bar"><i class="b" style="width:'+pb+'%"></i><i class="r" style="width:'+(100-pb)+'%"></i></div>'+
    (at?'<div class="ob"><span>Our fields damaged</span><b>'+at+'</b></div>':'')+rb+
    '<div class="cm-io"><button data-x="export">EXPORT SAVE</button><button data-x="import">IMPORT SAVE</button></div></div>';}

{const _r=CMPUI.renderSide;CMPUI.renderSide=function(){_r.apply(this,arguments);
  try{const el=this.side;if(!el||!CAMP.st||this.confirm)return;const old=el.querySelector('#cmObj');if(old)old.remove();
    const hd=el.querySelector('.cm-hd');if(hd)hd.insertAdjacentHTML('afterend',theatre());}catch(e){if(!theatre._w){theatre._w=1;console.warn('theatre',e);}}};}

// save export / import
function saveKey(st){return st&&st.team==='RED'?'viper.camp.red':'viper.camp';}
function exportSave(){const st=CAMP.st;if(!st){flash('NO CAMPAIGN TO EXPORT',1500);return;}
  const blob=new Blob([JSON.stringify(st)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='viper-campaign-'+String(st.name||'save').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-day'+(CAMP.clock().day+1)+'.json';document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);flash('CAMPAIGN SAVE EXPORTED',1800);}
function importSave(){const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';
  inp.onchange=async()=>{const f=inp.files&&inp.files[0];if(!f)return;
    try{if(f.size>8e6)throw new Error('file too large');const o=JSON.parse(await f.text());
      if(!o||!(o.v===3||o.v===4)||!Array.isArray(o.units)||!Array.isArray(o.bases)||!Array.isArray(o.front)||!Array.isArray(o.res))throw new Error('not a Viper Sortie campaign save');
      if(net.on){flash('LEAVE THE ROOM BEFORE IMPORTING A SAVE',2500);return;}
      if(game.active&&game.scen==='CAMP')CAMP.endSortie();
      localStorage.setItem(saveKey(o),JSON.stringify(o));flash('SAVE IMPORTED · RELOADING',1500);setTimeout(()=>location.reload(),900);}
    catch(e){flash('IMPORT FAILED · '+(e&&e.message||e),3500);}};
  inp.click();}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#cmObj [data-x]');if(!b)return;
  if(b.dataset.x==='export')exportSave();else if(b.dataset.x==='import')importSave();});

/* ================================================================================================ MULTIPLAYER */
const Q={rtt:new Map(),own:0,t:0,round:0,roundT:0,prot:0,rules:{limit:20},lastChat:0,lastSent:'',endAt:0};
const pClass=ms=>ms<=0?'':ms<90?'png-g':ms<200?'png-a':'png-r';
const pTxt=ms=>ms>0?Math.round(ms)+' ms':'—';
const peerName=id=>id===net.me?net.cs:((net.peers.get(id)||{}).cs||'Pilot');

// ---------- chat ----------
function logLine(who,txt,sys){let el=$q('#mpLog');if(!el){el=document.createElement('div');el.id='mpLog';document.body.appendChild(el);}
  const d=document.createElement('div');if(sys)d.className='sys';if(who){const b=document.createElement('b');b.textContent=who;d.append(b);}d.append(document.createTextNode(txt));el.append(d);
  while(el.children.length>6)el.firstChild.remove();setTimeout(()=>d.remove(),sys?7000:11000);}
function sendChat(txt){txt=String(txt||'').replace(/[\u0000-\u001f]/g,'').trim().slice(0,120);if(!txt||!net.on||!net.r)return;
  const now=performance.now();if(now-Q.lastChat<600)return;Q.lastChat=now;
  net.r.emit('chat',{cs:net.cs,txt}).catch(()=>{});}
function openChat(){if(!net.on||!game.active||!$q('#menu').hidden)return;let el=$q('#mpChatIn');
  if(!el){el=document.createElement('input');el.id='mpChatIn';el.maxLength=120;el.placeholder='Message to the room · Enter sends · Esc cancels';el.autocomplete='off';document.body.appendChild(el);
    el.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){sendChat(el.value);el.value='';el.hidden=true;el.blur();}else if(e.key==='Escape'){el.value='';el.hidden=true;el.blur();}});
    el.addEventListener('keyup',e=>e.stopPropagation());el.addEventListener('blur',()=>{el.hidden=true;});}
  try{if(typeof keys!=='undefined')keys.clear();}catch(e){}
  el.hidden=false;el.value='';el.focus();}
addEventListener('keydown',e=>{if(e.code==='Enter'&&e.ctrlKey&&!e.repeat&&net.on){const tg=e.target&&e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA')return;e.preventDefault();e.stopImmediatePropagation();openChat();}},true);

// ---------- room hooks (registered every time a room is joined) ----------
function hookRoom(){const r=net.r;if(!r)return;Q.rtt.clear();Q.own=0;Q.round=0;Q.prot=0;Q.endAt=0;
  net.unsub.push(
   r.on('png',m=>{if(m.sameTab||!m.data)return;r.emit('pog',{to:m.peer,t:m.data.t}).catch(()=>{});}),
   r.on('pog',m=>{if(m.sameTab||!m.data||m.data.to!==net.me)return;const rtt=performance.now()-fin(m.data.t,0);if(rtt<=0||rtt>20000)return;
     const old=Q.rtt.get(m.peer);Q.rtt.set(m.peer,old?old*.7+rtt*.3:rtt);Q.own=[...Q.rtt.values()].reduce((a,b)=>Math.max(a,b),0);}),
   r.on('chat',m=>{if(!m.data)return;const txt=String(m.data.txt||'').slice(0,120),who=m.sameTab?net.cs:(peerName(m.peer)||String(m.data.cs||'Pilot').slice(0,16));if(txt)logLine(who,txt);}),
   r.on('rules',m=>{if(m.sameTab||!m.data)return;const l=Math.round(fin(m.data.limit,20));Q.rules.limit=l>=0&&l<=100?l:20;}),
   r.on('rnd',m=>onRound(m)),
   r.on('ctask',m=>{if(m.sameTab||net.isHost||!net.coop||!m.data||!CAMP.st)return;
     if(!m.data.id){if(CAMP.task){CAMP.task=null;logLine('','Host cleared the tasking',true);}return;}
     const t=CAMP.tasks().find(q=>q.id===String(m.data.id));if(t&&(!CAMP.task||CAMP.task.id!==t.id)){CAMP.task=t;logLine('','Host tasking: '+t.label,true);}}));
  if(net.isHost)emitRules();
  logLine('','Room "'+net.code+'" · Ctrl+Enter to chat',true);}
{const _c=net.connect;net.connect=async function(){const ok=await _c.apply(this,arguments);if(ok){try{hookRoom();}catch(e){console.warn('hookRoom',e);}}return ok;};}
{const _l=net.leave;net.leave=async function(){const r=await _l.apply(this,arguments);Q.rtt.clear();Q.own=0;const rd=$q('#mpRound');if(rd)rd.remove();const lg=$q('#mpLog');if(lg)lg.replaceChildren();return r;};}

// peers joining: the host tells them the rules, everyone says hello
{const _op=net.onPeers;net.onPeers=function(ch){const r=_op.apply(this,arguments);
  try{if(ch&&ch.joined)for(const p of ch.joined){if(p.sameTab)continue;const e=this.peers.get(p.peer);logLine('',((e&&e.cs)||'A pilot')+' joined the room',true);if(this.isHost)emitRules();}
      if(ch&&ch.left)for(const p of ch.left){Q.rtt.delete(p.peer);}}catch(e){}return r;};}
function emitRules(){if(net.on&&net.r&&net.isHost&&!net.coop)net.r.emit('rules',{limit:Q.rules.limit}).catch(()=>{});}

// ---------- dogfight: score limit, round end, standings ----------
function standings(){const rows=[{cs:net.cs,k:net.score.k,d:net.score.d,me:true}];for(const [id,e] of net.peers)if(e.cs)rows.push({cs:e.cs,k:fin(e.k),d:fin(e.d)});
  rows.sort((a,b)=>b.k-a.k||a.d-b.d);return rows;}
function hostCheck(){if(!net.on||net.coop||!net.isHost||!game.active||!Q.rules.limit||performance.now()<Q.endAt)return;
  const s=standings();if(s.length>1&&s[0].k>=Q.rules.limit&&s[0].k>s[1].k){
    Q.round++;Q.endAt=performance.now()+14000;
    net.r.emit('rnd',{n:Q.round,w:s[0].cs,st:s.slice(0,8).map(r=>[String(r.cs).slice(0,16),r.k,r.d])}).catch(()=>{});}}
function onRound(m){if(!m.data||net.coop)return;const d=m.data,st=Array.isArray(d.st)?d.st.slice(0,8):[];
  let el=$q('#mpRound');if(el)el.remove();el=document.createElement('div');el.id='mpRound';
  const h=document.createElement('h2');h.textContent='ROUND '+Math.round(fin(d.n,1))+' · '+String(d.w||'').slice(0,16)+' WINS';el.append(h);
  st.forEach((r,i)=>{const row=document.createElement('div');row.className='row'+(i===0?' w':'');const a=document.createElement('span'),b=document.createElement('span');
    a.textContent=(i+1)+'. '+String(r[0]).slice(0,16);b.textContent=Math.round(fin(r[1]))+' / '+Math.round(fin(r[2]));row.append(a,b);el.append(row);});
  const s=document.createElement('small');s.textContent='Next round in 12 seconds · scores reset';el.append(s);document.body.appendChild(el);
  Q.endAt=performance.now()+14000;
  setTimeout(()=>{if(!net.on)return;net.score={k:0,d:0};for(const e of net.peers.values()){e.k=0;e.d=0;}const x=$q('#mpRound');if(x)x.remove();
    try{if(game.active)spawnMP();}catch(e){}renderScore();logLine('','Round '+Math.round(fin(d.n,1)+1)+' · fight\'s on',true);},12000);}

// spawn protection in dogfights
{const _s=spawnMP;spawnMP=function(){const r=_s.apply(this,arguments);if(!net.coop)Q.prot=performance.now()+4000;return r;};}
{const _d=Jet.prototype.damage;Jet.prototype.damage=function(d,src){if(this===player&&net.on&&!net.coop&&performance.now()<Q.prot)return;return _d.call(this,d,src);};}

// ---------- scoreboard: ping next to each name ----------
{const _rs=renderScore;renderScore=function(){_rs.apply(this,arguments);
  try{const el=$q('#score');if(!net.on||!el||el.hidden)return;const rows=el.querySelectorAll('.sr'),ids=[...net.peers.entries()].filter(([k,e])=>e.cs).map(([k])=>k);
    rows.forEach((r,i)=>{if(i===0)return;const id=ids[i-1],ms=Q.rtt.get(id)||0;if(!ms)return;const s=document.createElement('span');s.className=pClass(ms);s.textContent=' '+Math.round(ms);s.style.marginLeft='6px';s.style.fontWeight='400';r.children[0].after(s);});
    if(!net.coop&&Q.rules.limit){const f=document.createElement('div');f.className='sf';f.textContent='first to '+Q.rules.limit+' wins the round';el.append(f);}
    if(Q.own>0){const f=document.createElement('div');f.className='sf '+pClass(Q.own);f.textContent='worst link '+Math.round(Q.own)+' ms';el.append(f);}}catch(e){}};}

// ---------- lobby panel: invite link, code generator, rules, pilot list, chat ----------
function lobbyUI(){const pane=$q('#pMp .pl-sec.mp');if(!pane||$q('#mpExtra'))return;
  const row=pane.querySelector('.mprow'),ex=document.createElement('div');ex.id='mpExtra';
  ex.innerHTML='<div class="mprow"><button id="mpNew">NEW CODE</button><button id="mpInv">COPY INVITE LINK</button></div>'+
   '<div id="mpPeers" class="mp-peers"></div>'+
   '<div class="mp-chat" id="mpChatRow" hidden><input id="mpChatBox" type="text" maxlength="120" placeholder="Message to the room" autocomplete="off"><button id="mpChatGo">SEND</button></div>'+
   '<p class="hint">In flight: <b>Ctrl+Enter</b> opens chat. Dogfights end at the score limit and restart with fresh scores; you are protected for 4 s after every spawn.</p>';
  row.before(ex);
  game.mpLimit=String(Q.rules.limit);if(typeof segSet==='function')segSet();
  $q('#mpNew').onclick=()=>{const w=['viper','cobra','eagle','falcon','raven','hawk','talon','fox'];const c=w[Math.floor(Math.random()*w.length)]+'-'+Math.floor(1000+Math.random()*9000);$q('#code').value=c;flash('ROOM CODE '+c.toUpperCase(),1500);};
  $q('#mpInv').onclick=async()=>{const code=($q('#code').value||'sortie').trim().toLowerCase().replace(/[^a-z0-9_.-]/g,'')||'sortie',
      url=location.origin+location.pathname+'?room='+encodeURIComponent(code)+'&mode='+(game.mpMode||'coop');
    try{await navigator.clipboard.writeText(url);flash('INVITE LINK COPIED',1800);}catch(e){window.prompt('Copy this invite link:',url);}};
  const send=()=>{const b=$q('#mpChatBox');sendChat(b.value);b.value='';};
  $q('#mpChatGo').onclick=send;$q('#mpChatBox').addEventListener('keydown',e=>{if(e.key==='Enter'){e.stopPropagation();send();}else e.stopPropagation();});
  // limit buttons are handled by the generic seg handler (game.mpLimit); the host publishes the value
  $q('#pMp [data-k="mpLimit"]').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;setTimeout(()=>{Q.rules.limit=Math.max(0,Math.round(+game.mpLimit||0));emitRules();renderScore();},0);});}
lobbyUI();

function refreshPeers(){const el=$q('#mpPeers'),cr=$q('#mpChatRow');if(cr)cr.hidden=!net.on;if(!el)return;
  if(!net.on){el.replaceChildren();return;}
  const rows=[['PILOT','JET','K / D','PING']],mk=(c,a,k,p,me)=>[c,a,k,p,me];
  const lines=[];lines.push('<div class="h"><span>PILOT</span><span>JET</span><span>K / D</span><span>PING</span></div>');
  lines.push('<div class="me"><span>'+esc(net.cs)+' (you)'+(net.isHost?' · host':'')+'</span><span>'+esc((typeof player!=='undefined'&&player&&player.type)||game.ac)+'</span><span>'+net.score.k+' / '+net.score.d+'</span><span>—</span></div>');
  for(const [id,e] of net.peers){if(!e.cs)continue;const ms=Q.rtt.get(id)||0;lines.push('<div><span>'+esc(e.cs)+'</span><span>'+esc((e.jet&&e.jet.type)||'—')+'</span><span>'+fin(e.k)+' / '+fin(e.d)+'</span><span class="'+pClass(ms)+'">'+pTxt(ms)+'</span></div>');}
  el.innerHTML=lines.join('');}

// ---------- periodic work: ping, host checks, co-op tasking broadcast, peer list ----------
let lastTask='';
setInterval(()=>{
  try{
    refreshPeers();
    if(!net.on||!net.r)return;
    const now=performance.now();
    if(now-Q.t>2000){Q.t=now;net.r.emit('png',{t:now}).catch(()=>{});renderScore();}
    hostCheck();
    if(net.coop&&net.isHost){const id=CAMP.task?CAMP.task.id:'';if(id!==lastTask){lastTask=id;net.r.emit('ctask',{id}).catch(()=>{});}}
  }catch(e){}
},1000);

// ---------- invite link: ?room=CODE&mode=coop|ffa ----------
try{const q=new URLSearchParams(location.search),room=q.get('room'),mode=q.get('mode');
  if(room){const code=room.toLowerCase().replace(/[^a-z0-9_.-]/g,'').slice(0,40);
    setTimeout(()=>{const c=$q('#code');if(c&&code)c.value=code;
      if(mode==='coop'||mode==='ffa'){game.mpMode=mode;if(typeof segSet==='function')segSet();const mn=$q('#menu');if(mn)mn.dataset.mp=mode;try{coptSave();}catch(e){}}
      if(typeof setTab==='function')setTab('mp');
      const s=$q('#mpStatus');if(s)s.textContent='Invite loaded: room "'+code+'". Pick your jet on the HANGAR tab, then press JOIN ROOM.';},200);}
}catch(e){}

window.VIPER_CAMPMP={Q,grade,snap,theatre,taskProbe,hookRoom,onRound,hostCheck,standings,sendChat,refreshPeers};
})();
