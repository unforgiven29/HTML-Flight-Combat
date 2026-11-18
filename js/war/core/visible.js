/* =====================================================================================================================
   v368 — the war you can see from the cockpit (spec v49 ch.06 / ch.15 / ch.07 / ch.17: make the strategic war visible
   where the player is; intelligence that changes what the player is told).
   * MISSILE SALVOS IN THE SKY: during a world sortie the enemy fires conventional long-range salvos (strategic.js
     stocks and interception rules) at your side's airbases and depots within about 150 km of you, every few minutes
     while it has missiles. You see them: bright trails arcing in from the enemy's side, interceptors climbing from
     your side's air defence to meet them, flashes where they meet, and impacts where some get through (damage applies
     to the base or depot as in strategic.js). The same happens to the enemy when your side fires.
   * MERCHANT CONVOYS AT SEA: near open sea, a merchant convoy (four cargo ships) of either side sails with an escort;
     an enemy convoy is a target (each ship sunk is a convoy loss in sea2.js); your own convoy can be attacked by the
     enemy's strike aircraft.
   * ON THE WAR MAP: air battles of the last war day are marked in each theatre (size by losses), and sectors where the
     line moved are marked with ground-fighting bursts — the war away from you, at a glance.
   * INTELLIGENCE IN THE COCKPIT: your side's intelligence quality (intel.js) changes AWACS: good intelligence calls
     threats early and accurately; poor intelligence misses some calls and gives ranges with error. The sortie briefing
     states the quality of the picture.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WSORTIE)return;
const W=WWAR,G=WGEO,WS=WSORTIE.WS,rn=Math.random;
/* ------------------------------------------------------------------ missile salvos you can see */
const FX={list:[]};
function trail(a,b,col,dur,arc,onEnd){if(typeof THREE==='undefined')return;const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(3*40),3));geo.setDrawRange(0,0);
  const ln=new THREE.Line(geo,new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.85}));ln.frustumCulled=false;scene.add(ln);FX.list.push({ln,geo,a:a.clone(),b:b.clone(),t:0,dur,arc,onEnd,n:0});}
setInterval(()=>{const dt=.05;for(let i=FX.list.length-1;i>=0;i--){const f=FX.list[i];f.t+=dt;const k=Math.min(1,f.t/f.dur),p=f.a.clone().lerp(f.b,k);p.y+=Math.sin(k*Math.PI)*f.arc;
    const at=f.geo.attributes.position;const idx=Math.min(39,Math.floor(k*39));for(let j=f.n;j<=idx;j++){const q=f.a.clone().lerp(f.b,j/39);q.y+=Math.sin(j/39*Math.PI)*f.arc;at.setXYZ(j,q.x,q.y,q.z);}f.n=idx+1;f.geo.setDrawRange(0,f.n);at.needsUpdate=true;
    if(typeof glow!=='undefined')glow.emit(p,null,.15,9,6,1,.85,.5,1);
    if(k>=1){if(f.onEnd)f.onEnd(p);f.ln.material.opacity-=.02;if(f.ln.material.opacity<=0){scene.remove(f.ln);f.geo.dispose();FX.list.splice(i,1);}}}},50);
function burst(p,big){if(typeof glow!=='undefined')glow.emit(p,null,big?.6:.35,big?24:14,18,1,.7,.35,1);if(typeof smoke!=='undefined')for(let k=0;k<(big?6:3);k++)smoke.emit(p,new THREE.Vector3(rn()*10-5,rn()*6,rn()*10-5),8,10,30,.3,.28,.25,.6,.35);}
function localSalvo(){if(!WS.on||!W.st||!player||!W.strategic||!WS.front)return;const st=W.st,me=st.c[WS.me],n=WS.front;
  // who fires at whom: the enemy at your side (and sometimes your side at the enemy)
  const mine=rn()<.7,defA=st.c[mine?WS.me:(n.enemyIsB?n.f.b:n.f.a)],attSide=mine?(me.side==='B'?'R':'B'):me.side;
  const att=Object.values(st.c).filter(p=>p.side===attSide&&W.bell(p)).map(p=>[p,W.strategic.rec(p).conv]).sort((x,y)=>y[1]-x[1])[0];if(!att||att[1]<4||!defA)return;const def=defA;const ra=W.strategic.rec(att[0]),rd=W.strategic.rec(def);const attP=att[0];
  // a target near you: an airbase or depot of the defending side within 150 km
  const T=[];for(const[a3,L]of W.milBases()){if(st.c[a3]&&st.c[a3].side===def.side)for(const a of L){const q=G.ll2xz(a.lat,a.lon);if(Math.hypot(q.x-player.pos.x,q.z-player.pos.z)<150000)T.push({n:a.name,q,k:a.ident,a3});}}
  if(!T.length)return;const tg=T[(rn()*T.length)|0],cnt=Math.min(ra.conv|0,3+((rn()*6)|0));ra.conv-=cnt;ra.fired+=cnt;
  const from=G.ll2xz(n.p.lat-n.s.ny*(def.side===me.side?-1:1)*(n.enemyIsB?1:-1)*3,n.p.lon);let intc=0,thr=0;
  for(let i=0;i<cnt;i++){const a=new THREE.Vector3(from.x+(rn()-.5)*20000,800,from.z+(rn()-.5)*20000),b=new THREE.Vector3(tg.q.x+(rn()-.5)*600,groundAt(tg.q.x,tg.q.z)+2,tg.q.z+(rn()-.5)*600);
    const tryI=rd.abm>0;const hit=tryI&&rn()<.7;if(tryI)rd.abm--;
    if(hit){intc++;const k=.55+rn()*.25,mp=a.clone().lerp(b,k);mp.y+=Math.sin(k*Math.PI)*25000;const lp=new THREE.Vector3(tg.q.x+(rn()-.5)*8000,groundAt(tg.q.x,tg.q.z)+5,tg.q.z+(rn()-.5)*8000);
      trail(a,b,0xffb050,30+i*2,25000);setTimeout(()=>{trail(lp,mp,0x9fe0ff,(30+i*2)*(k)*.45,2000,p=>burst(p,false));},(30+i*2)*k*.55*1000);
      setTimeout(()=>{const f=FX.list.find(x=>x.b.equals(b));if(f){f.dur=f.t;f.b=f.a.clone().lerp(f.b,k);}},(30+i*2)*k*1000);}
    else{thr++;trail(a,b,0xffb050,30+i*2,25000,p=>{burst(p,true);if(typeof GND!=='undefined'&&GND.blast0)try{GND.blast0(p,{soft:80,hard:20},null,true);}catch(e){}});}}
  rd.intc+=intc;ra.hit+=thr;const m=st.mil&&st.mil[def.a3];if(thr&&m&&m.bases[tg.k])m.bases[tg.k].c=Math.max(0,m.bases[tg.k].c-.08*thr);
  W.emit('MISSILE',{e:[attP.a3,def.a3],cf:'REPORTED',txt:attP.n+' fires '+cnt+' long-range missiles at '+tg.n+' ('+def.n+'): '+intc+' intercepted, '+thr+' get through.'});
  if(typeof radio==='function')radio(def.side===me.side?'MISSILE WARNING: inbound ballistic and cruise missiles toward '+tg.n+'. Air defence engaging.':'Our long-range missiles inbound to '+tg.n+'.',def.side===me.side);}
/* ------------------------------------------------------------------ merchant convoys at sea */
if(window.CMESH&&typeof GTY!=='undefined'){const M=new THREE.MeshLambertMaterial({color:0x5a4a3a}),D=new THREE.MeshLambertMaterial({color:0xb0a080});CMESH.MERCH=function(){const g=new THREE.Group();const h=new THREE.Mesh(new THREE.BoxGeometry(22,8,140),M);h.position.y=3;g.add(h);
  for(let i=0;i<4;i++){const c=new THREE.Mesh(new THREE.BoxGeometry(18,6,22),D);c.position.set(0,10,-45+i*26);g.add(c);}const b=new THREE.Mesh(new THREE.BoxGeometry(16,12,14),new THREE.MeshLambertMaterial({color:0xe0e0d8}));b.position.set(0,13,58);g.add(b);return g;};GTY.MERCH={n:'Merchant ship',hp:500,arm:1,r:70,tgt:1};}
const CV={list:[]};
function convoy(){if(!WS.on||!player||!WS.front||typeof GTY==='undefined'||!GTY.MERCH)return;const st=W.st,n=WS.front;const enemy=rn()<.6,a3=enemy?(n.enemyIsB?n.f.b:n.f.a):WS.me,p=st.c[a3];if(!p||!p.nav)return;
  let spot=null;for(let k=0;k<40&&!spot;k++){const ang=rn()*Math.PI*2,R=25000+rn()*55000,x=player.pos.x+Math.sin(ang)*R,z=player.pos.z-Math.cos(ang)*R;if(groundAt(x,z)<-30&&groundAt(x+3000,z)<-30&&groundAt(x,z+3000)<-30)spot={x,z};}if(!spot)return;
  const side=enemy?1:0,hd=rn()*360,L=[];for(let i=0;i<4;i++){const u=GND.add('MERCH',side,spot.x+(i%2)*500,spot.z+i*700,hd);u.pos.y=0;u.mesh.position.y=0;u._ws=a3;u._merch=1;u._ship=1;u.spd=6;u.callsign='Merchant ship ('+p.n+')';L.push(u);WS.ground.push(u);}
  if(p.nav.sur>0&&GTY[side?(p.side==='B'?'FFGB':'FACR'):(p.side==='B'?'FFGB':'FACR')]){const k=p.side==='B'?'FFGB':'FACR';const e=GND.add(k,side,spot.x-1500,spot.z,hd);e.pos.y=0;e.mesh.position.y=0;e._ws=a3;e._ship=1;e.callsign=GTY[k].n+' (escort, '+p.n+')';L.push(e);WS.ground.push(e);if(typeof ASM!=='undefined'&&side)ASM.ships.push(e);}
  CV.list.push(L);if(typeof radio==='function')radio(enemy?'Maritime patrol: enemy merchant convoy with escort at sea, '+String(Math.round(brgTo(player.pos.x,player.pos.z,spot.x,spot.z))).padStart(3,'0')+' for '+Math.round(cd2(player.pos.x,player.pos.z,spot.x,spot.z)/NM)+'.':'A friendly merchant convoy is passing through your area; keep enemy strike aircraft off it.',false);}
setInterval(()=>{for(const L of CV.list)for(const u of L){if(!u.alive)continue;const r=u.hdg*Math.PI/180;u.pos.x+=Math.sin(r)*u.spd;u.pos.z-=Math.cos(r)*u.spd;if(u.mesh){u.mesh.position.x=u.pos.x;u.mesh.position.z=u.pos.z;u.mesh.rotation.y=-r;}}},1000);
if(typeof GUnit!=='undefined'){const _k=GUnit.prototype.kill;GUnit.prototype.kill=function(src){const was=this.alive&&this._merch;const r=_k.apply(this,arguments);if(was&&!this.alive&&W.st){const c=W.st.sea2&&W.st.sea2.conv&&W.st.sea2.conv[this._ws];if(c){c.sunk++;c.hit++;}
  W.emit('CONVOY',{e:[this._ws],cf:'REPORTED',txt:'A '+(W.st.c[this._ws]||{n:''}).n+' merchant ship is sunk'+(src===player?' by your attack':'')+'. The fate of its crew is not yet known.'});}return r;};}
/* ------------------------------------------------------------------ the war away from you, on the map */
if(window.WARMAP){const _d=WARMAP.draw;WARMAP.draw=function(c,w2s,M,phase){const r=_d.apply(this,arguments);if(phase!=='over'||!W.st)return r;const st=W.st,day=Math.floor(st.t/24);
  for(const e of st.ev.slice(-300)){if(e.ty!=='AIR'||Math.floor(e.t/24)<day-1)continue;const th=st.th.find(t=>e.txt.startsWith(t.name));if(!th)continue;const T=W.THEATRES.find(q=>q.id===th.id);if(!T)continue;const m=/about (\d+) BLUEFOR and (\d+) REDFOR/.exec(e.txt);const n=m?(+m[1])+(+m[2]):1;
    const[x,y]=w2s((T.lat[0]+T.lat[1])/2,(T.lon[0]+T.lon[1])/2);c.strokeStyle='rgba(255,230,120,.8)';c.lineWidth=1.2;for(let k=0;k<4;k++){const a=k*Math.PI/2+.4;c.beginPath();c.moveTo(x+Math.cos(a)*4,y+Math.sin(a)*4);c.lineTo(x+Math.cos(a)*(6+Math.min(10,n)),y+Math.sin(a)*(6+Math.min(10,n)));c.stroke();}
    c.fillStyle='rgba(255,230,120,.9)';c.font='9px "B612 Mono",monospace';c.fillText('AIR '+n,x+8,y-6);}
  if(st.land&&st.land.last&&M.ppd>=3)for(const f of st.fronts){if(f.cf)continue;f.sec.forEach((s,i)=>{const prev=st.land.last[f.id+':'+i];if(prev==null||Math.abs(s.off-prev)<.3)return;const q=W.linePt(s),[x,y]=w2s(q.lat,q.lon);c.fillStyle='rgba(255,140,60,.85)';c.beginPath();c.arc(x,y,2.5+Math.min(4,Math.abs(s.off-prev)),0,7);c.fill();});}
  return r;};}
/* ------------------------------------------------------------------ intelligence in the cockpit */
const IQ=()=>{const X=W.st&&W.st.intel,me=W.st&&WS.me&&W.st.c[WS.me];return X&&me?X[me.side].q:.6;};
if(typeof radio==='function'){const _r=radio;radio=function(txt,urgent){if(WS.on&&/^DARKSTAR|^MAGIC|^Maritime patrol/.test(String(txt))){const q=IQ();if(q<.45&&rn()<(.45-q)*1.6)return;   // poor intelligence: some threats are not called
    if(q<.6)txt=String(txt).replace(/(\d+) (miles|for)/g,(m,a,b)=>Math.max(1,Math.round(+a*(1+(rn()-.5)*(.6-q))))+' '+b).replace(/for (\d+)/g,(m,a)=>'for '+Math.max(1,Math.round(+a*(1+(rn()-.5)*(.6-q)))));}
  return _r.call(this,txt,urgent);};}
{const _s=WSORTIE.start;WSORTIE.start=async function(){const r=await _s.apply(this,arguments);if(WS.on&&typeof radio==='function'){const q=IQ();setTimeout(()=>{if(WS.on)radio('Intelligence picture '+(q>.7?'good: early warning of threats':q>.45?'fair: some threats may be called late':'poor: expect threats without warning')+'.',false);},9000);}FX.t=150;CV.t=200;CV.list=[];return r;};}
setInterval(()=>{if(!WS.on||typeof game==='undefined'||!game.active)return;FX.t=(FX.t??150)-5;CV.t=(CV.t??200)-5;if(FX.t<=0){FX.t=240+rn()*240;try{localSalvo();}catch(e){console.warn('[visible]',e);}}if(CV.t<=0){CV.t=500+rn()*400;try{convoy();}catch(e){console.warn('[visible]',e);}}},5000);
W.visible={FX,CV,localSalvo,convoy,trail,IQ};
})();
