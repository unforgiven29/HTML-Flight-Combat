/* =====================================================================================================================
   INFNET — multiplayer for the infantry and tank battles (v415), on the game's existing rooms (net.r, PeerJS).
     * When you start a battle, the room hears where (the place, the mission, your side and country, live world or not).
       Anyone in the room who is not already fighting gets a JOIN button: they start the same battle at the same place,
       on your side (co-op) — or, from a country on the other side, against you.
     * In the same battle, every player sends position, heading, stance, health and whether they are in a tank (about
       ten times a second). The others draw them as soldiers (blue for your side, red for the other) or as tanks, with
       their callsign, and hear their shots (tracers drawn).
     * Shots between players are resolved by the shooter and sent to the one hit (rifle, machine gun, tank gun); friendly
       fire counts. The AI soldiers and vehicles stay each player's own; the war around the battle is the host's (warnet).
   ===================================================================================================================== */
(()=>{
'use strict';
if(typeof window==='undefined')return;
const N={room:null,on:false,key:null,peers:new Map(),last:0,invite:null,me:null};
const rn=()=>Math.random();
const I=()=>window.INFANTRY;
const cs=()=>(typeof net!=='undefined'&&net.cs)||'PLAYER';
function attach(){try{if(typeof net==='undefined'||!net.r||net.r===N.room||!net.r.on)return;N.room=net.r;const r=net.r;
  r.on('iJoin',m=>{if(m.sameTab||!m.data)return;const d=m.data;const S=I()&&I().S;if(S&&N.key===d.key)return;N.invite={...d,peer:m.peer};toast(d);});
  r.on('iPos',m=>{if(m.sameTab||!m.data)return;const d=m.data;N.rk=d.key;if(!N.key||d.key!==N.key)return;N.peers.set(m.peer,{...N.peers.get(m.peer),...d,t:Date.now()});});
  r.on('iShot',m=>{if(m.sameTab||!m.data)return;const d=m.data;if(d.key!==N.key)return;shotFx(d);});
  r.on('iHit',m=>{if(m.sameTab||!m.data)return;const d=m.data;if(d.key!==N.key||d.to!==cs())return;const X=I();if(!X||!X.S)return;
    if(X.S.tk&&d.k==='tank'){X.tankHit(Math.min(900,+d.dmg||0),'player');}else if(!X.S.tk&&X.hurt)X.hurt(Math.min(200,+d.dmg||0),'bullet');
    X.say&&X.say((d.ff?'FRIENDLY FIRE FROM ':'HIT BY ')+String(d.by||'').slice(0,16).toUpperCase(),1.5);});
  r.on('iLeave',m=>{N.peers.delete(m.peer);});}catch(e){}}
setInterval(attach,2000);
function send(k,d){attach();try{if(N.room&&N.room.emit)N.room.emit(k,d).catch(()=>{});}catch(e){}}
/* ------------------------------------------------------------------ joining */
function join(cfg,S){N.key=[(S.loc&&S.loc.name)||'x',S.mission,cfg.world?1:0].join('|');N.peers.clear();N.me={side:S.me,a3:cfg.a3};
  send('iJoin',{key:N.key,place:S.loc&&S.loc.name,mis:S.mission,a3:cfg.a3,side:S.me,world:!!cfg.world,loc0:cfg.loc0||null,ins:cfg.ins,by:cs()});}
function leave(){if(N.key)send('iLeave',{key:N.key});N.key=null;for(const p of N.peers.values())if(p.m&&p.m.parent)p.m.parent.remove(p.m);N.peers.clear();}
function toast(d){let el=document.getElementById('iNetT');if(!el){el=document.createElement('div');el.id='iNetT';el.style.cssText='position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:9999;background:rgba(8,12,10,.92);color:#cfe3d6;border:1px solid #6a7;padding:8px 12px;font:12px "B612 Mono",monospace';document.body.appendChild(el);}
  el.innerHTML=String(d.by).slice(0,16)+' is fighting at <b>'+String(d.place||'').slice(0,40)+'</b> ('+String(d.mis||'').toLowerCase()+') · <button id="iNetJ">JOIN</button> <button id="iNetX">✕</button>';
  el.querySelector('#iNetX').onclick=()=>el.remove();el.querySelector('#iNetJ').onclick=()=>{el.remove();joinInvite();};}
async function joinInvite(){const d=N.invite;const X=I();if(!d||!X)return;const K=X.K||{};const cfg={...K,a3:d.a3,mis:d.mis,ins:d.ins&&!/TANK/.test(d.ins)?d.ins:'APC',loc0:d.loc0,noRide:true};
  try{if(d.world&&X.startWorld)await X.startWorld(cfg);else X.start(cfg);}catch(e){console.warn('[infnet] join',e);}}
/* ------------------------------------------------------------------ the battle: positions, avatars, shots */
function step(dt){const X=I();const S=X&&X.S;if(!S||!N.key)return;const now=Date.now();
  if(now-N.last>100){N.last=now;const T=S.tk;const p=T?T.v.m.position:S.pos;send('iPos',{key:N.key,p:[+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)],y:+((T?T.hd:S.yaw)||0).toFixed(3),ty:T?+T.ty.toFixed(3):0,c:S.crouch?1:0,hp:Math.round(S.hp),side:S.me,tk:T?T.v.name||'tank':null,by:cs(),dn:S.downed?1:0});}
  for(const[id,q]of N.peers){if(now-q.t>5000){if(q.m&&q.m.parent)q.m.parent.remove(q.m);N.peers.delete(id);continue;}
    const want=q.tk?'T':'S';if(!q.m||q.kind!==want||q.mside!==q.side){if(q.m&&q.m.parent)q.m.parent.remove(q.m);try{q.m=want==='T'?X.tankModel(q.side===S.me?S.me:S.en):X.soldier(q.side===S.me);}catch(e){continue;}q.kind=want;q.mside=q.side;S.sc.add(q.m);tag(q);}
    const tp=new THREE.Vector3(q.p[0],q.p[1]-(want==='S'?1.7:0),q.p[2]);q.m.position.lerp(tp,Math.min(1,dt*10));q.m.rotation.y=q.y+(want==='S'?0:0);if(want==='T'&&q.m.userData.tu)q.m.userData.tu.rotation.y=q.ty;q.m.rotation.x=q.dn?-Math.PI/2:0;}}
function tag(q){const c=document.createElement('canvas');c.width=256;c.height=40;const g=c.getContext('2d');g.font='700 20px "B612 Mono",monospace';g.textAlign='center';g.fillStyle=q.side===(I().S||{}).me?'#9fd0ff':'#ff9a8a';g.fillText(String(q.by).slice(0,16),128,26);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));sp.scale.set(1.8,.28,1);sp.position.y=q.tk?4:2.3;q.m.add(sp);}
// your shot: tell the room (tracer) and resolve hits on other players
function shot(o,d,dmg,k){if(!N.key)return;const X=I(),S=X.S;send('iShot',{key:N.key,o:[o.x,o.y,o.z].map(v=>+v.toFixed(2)),d:[d.x,d.y,d.z].map(v=>+v.toFixed(3)),k:k||'gun'});
  for(const[id,q]of N.peers){if(!q.m)continue;const c=q.m.position.clone().setY(q.m.position.y+(q.tk?1.4:1.2)),t=c.clone().sub(o).dot(d);if(t<0||t>(k==='tank'?3000:900))continue;const cp=o.clone().addScaledVector(d,t),rad=q.tk?2.6:.45;
    if(cp.distanceTo(c)<rad&&X.los(o,c.clone().addScaledVector(d,-.5))){const ff=q.side===S.me;send('iHit',{key:N.key,to:q.by,dmg:k==='tank'?(q.tk?600:400):dmg,k:q.tk?'tank':'gun',by:cs(),ff});if(ff)X.say&&X.say('FRIENDLY FIRE · '+String(q.by).toUpperCase(),2);break;}}}
function shotFx(d){const X=I(),S=X&&X.S;if(!S)return;const o=new THREE.Vector3(...d.o),dv=new THREE.Vector3(...d.d);const far=Math.min(d.k==='tank'?3000:600,X.rayWorld?X.rayWorld(o,dv,600):400);try{X.tracer(o,o.clone().addScaledVector(dv,far),S.en,d.k==='tank');}catch(e){}}
window.INFNET={N,join,leave,step,shot,joinInvite};
})();
