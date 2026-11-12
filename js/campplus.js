/* =====================================================================================================================
   v315 — dynamic campaign expansion. Loads after strategic.js.
   * Era-correct ground forces. COLD (mid-1980s Central Europe): M1 / M2 / M113A2 / M109A2 / M270 against T-80B / BMP-2 / BTR-70 / 2S3 / BM-21.
     MODERN: M1A2 SEPv3 / M2A3 / Stryker / M109A7 / HIMARS against T-90M / BMP-3 / BTR-82A / 2S19M2 / BM-30. New unit kind APC (armoured personnel carrier)
     join the tank, IFV and infantry mix.
   * Cold-war air order of battle: red strikes fly Su-24 / Su-25 / MiG-27 / Su-17 where those airframes exist in the game,
     blue strikes F-111 / A-10 / F-4E / F-16; fighters stay on CAP. No drones of any kind in the cold-war era.
   * MODERN only: Shahed-136 one-way attack drones (red) raid our airfields: slow (about 185 km/h), low, small radar and IR
     signature, piston engine. They are real contacts for radar, IRST and missiles and can be gunned down.
   * MODERN only: FPV drone strikes by both sides against tanks, IFVs and infantry in the contested sectors; you see them
     when you are near the line.
   * More red air activity (more CAP flights, more frequent strikes).
   * Map: two more airfields (one per side), forward helicopter pads (FARPs) near the line that are lost when the front
     passes them, and towns and a city on the campaign map. Helicopters start at the nearest friendly FARP.
   * Tasks: an INTERCEPT call for each Shahed raid, a COUNTER-BATTERY call when enemy artillery fires near you.
   Figures are gameplay-level, from public data.
   ===================================================================================================================== */
(()=>{
'use strict';
if(typeof CAMP==='undefined'||typeof CK==='undefined'||typeof CBASE==='undefined'){console.warn('[campplus] campaign missing');return;}
const rr=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
const ERA=()=>CAMP.st&&CAMP.st.era==='modern'?'modern':'cold';

/* ---------------------------------------------------------------- ground forces */
const NAMES={cold:{MBT:['M1 ABRAMS','T-80B'],IFV:['M2 BRADLEY','BMP-2'],INF:['INFANTRY SQUAD','MOTOR RIFLE SQUAD'],APC:['M113A2','BTR-70'],ART:['M109A2','2S3 AKATSIYA'],MRL:['M270 MLRS','BM-21 GRAD']},
            modern:{MBT:['M1A2 SEPV3','T-90M'],IFV:['M2A3 BRADLEY','BMP-3'],INF:['INFANTRY SQUAD','MOTOR RIFLE SQUAD'],APC:['M1126 STRYKER','BTR-82A'],ART:['M109A7','2S19M2 MSTA-S'],MRL:['M142 HIMARS','BM-30 SMERCH']}};
CK.APC={v:1.5,spd:10,nm:['','']};
for(const k of Object.keys(CK))Object.defineProperty(CK[k],'nm',{get(){return NAMES[ERA()][k]||['UNIT','UNIT'];},configurable:true});
CWPN.APC=[{r:1500,rof:4,p:.3,dv:4,ds:15,fx:'can'}];
CDEP.hotA.APC=520;CDEP.hotD.APC=760;CDEP.quiet.APC=3000;
CMIX.push(['APC',1]);
{const M={},mat=(c)=>M[c]||(M[c]=SKIN(c,14));
 const bx=(g,w,h,l,m,x,y,z,rx=0)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),m);b.position.set(x,y,z);b.rotation.x=rx;g.add(b);return b;};
 const cy=(g,r,l,m,x,y,z)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.15,l,8),m);c.rotation.x=Math.PI/2;c.position.set(x,y,z);g.add(c);return c;};
 const wheels=(g,n,L,w,m)=>{for(let i=0;i<n;i++)for(const s of[-1,1]){const t=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.4,10),m);t.rotation.z=Math.PI/2;t.position.set(s*w/2,.55,-L/2+.9+i*(L-1.8)/(n-1));g.add(t);}};
 const done=g=>{g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.userData.m0=o.material;}});return g;};
 Object.assign(CMESH,{
  APCB(){const g=new THREE.Group(),h=mat(0x75744e),d=mat(0x26282a);if(ERA()==='modern'){wheels(g,4,6.9,2.7,d);bx(g,2.7,1.6,6.9,h,0,1.65,0);bx(g,2.6,.6,1.2,h,0,1.5,-3.4,.6);bx(g,.8,.5,.8,h,.6,2.7,.4);}
    else{bx(g,.5,.8,4.9,d,-1.25,.45,0);bx(g,.5,.8,4.9,d,1.25,.45,0);bx(g,2.7,1.7,4.9,h,0,1.5,0);bx(g,2.6,.8,.8,h,0,1.1,-2.6,.9);cy(g,.06,1.4,d,.4,2.6,-.6);}return done(g);},
  APCR(){const g=new THREE.Group(),h=mat(0x56603e),d=mat(0x23262a);wheels(g,4,7.6,2.9,d);bx(g,2.9,1.4,7.6,h,0,1.55,0);bx(g,2.8,.5,1.6,h,0,1.5,-3.8,.5);
    const t=new THREE.Mesh(new THREE.CylinderGeometry(.6,.7,.5,10),h);t.position.set(0,2.5,-1);g.add(t);cy(g,.05,1.8,d,0,2.6,-2);return done(g);}});
 Object.assign(GTY,{APCB:{n:'APC',hp:100,arm:1,r:3.8,tgt:1},APCR:{n:'APC',hp:100,arm:1,r:3.8,tgt:1}});
 // the T-80B / T-90M shape (low turret, side skirts) for red tanks; the T-72B shape stays for nothing new
 const _r=CMESH.MBTR;CMESH.MBTR=function(){const g=_r();const h=mat(ERA()==='modern'?0x5d6340:0x56603e);bx(g,.08,.7,6.2,h,-1.78,1.15,0);bx(g,.08,.7,6.2,h,1.78,1.15,0);
   if(ERA()==='modern'){bx(g,2.6,.35,.8,h,0,2.25,-.9);}return done(g);};}

/* ---------------------------------------------------------------- era-correct air order of battle */
{const have=a=>a.filter(t=>AC[t]);
 const coldR=have(['Su-24M','Su-24','Su-25','MiG-27','Su-17M4','Su-17','MiG-23']),coldB=have(['F-111F','A-10A','A-10','F-4E','F-16']);
 if(coldR.length)CTYPES.cold[1].STK=coldR;if(coldB.length)CTYPES.cold[0].STK=coldB;
 CTYPES.cold[1].CAP=have(['MiG-29','MiG-23','MiG-21']);CTYPES.cold[0].CAP=have(['F-15C','F-16','F-4E']);
 const modR=have(['Su-34','Su-25','Su-24M','MiG-29','Su-27']);if(modR.length)CTYPES.modern[1].STK=modR;}

/* ---------------------------------------------------------------- more red air activity */
{const _ao=CAMP.airOps;CAMP.airOps=function(dt){_ao.call(this,dt);if(!this.st||this.client)return;const st=this.st;
   // a second red strike clock: extra raids into the sectors red attacks
   st.strk2=(st.strk2==null?.2:st.strk2)-dt/3600;const red=this.air.filter(j=>j.alive&&j.side===1).length;
   if(st.strk2<=0&&red<16){st.strk2=rr(.22,.4)-st.diff*.03;const hot=st.hot.filter(i=>st.hs[i]===1),i=hot.length?pick(hot):pick(st.hot),c=st.units.filter(u=>!u.dead&&u.s===0&&u.i===i);
     if(c.length){const u=pick(c),b=this.bases(1).filter(b=>b.pool>=2&&b.dmg<75).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];if(b)this.launch(1,'STK',b.id,2,{x:u.x,z:u.z,tu:u.id});}}
   // a second red CAP over the line when red has the aircraft
   const caps=new Set(this.air.filter(j=>j.alive&&j.side===1&&j.ai&&j.ai.camp&&j.ai.camp.role==='CAP').map(j=>j.ai.camp.fl.id)).size;
   if(caps<4&&red<16&&Math.random()<.35){const x=rr(-80000,80000),z=this.frontZ(x)-rr(20000,34000),b=this.bases(1).filter(b=>b.pool>=4&&b.dmg<75)[0];if(b)this.launch(1,'CAP',b.id,2,{x,z});}};}

/* ---------------------------------------------------------------- more airfields, FARPs, towns */
const NEWB=[{id:'FOX',name:'FOXBORO',x:8000,z:122000,side:0},{id:'DUB',name:'DUBRAVA',x:-22000,z:-124000,side:1}];
for(const b of NEWB)if(!CBASE.find(q=>q.id===b.id)){let h=0;for(const [dx,dz] of [[0,0],[600,0],[-600,0],[0,1500],[0,-1500]])h+=cmpRaw(b.x+dx,b.z+dz);b.H=Math.max(35,Math.min(640,h/5));CBASE.push(b);}
// older saves: give them the new fields
{const _ld=CAMP.load;CAMP.load=function(){const ok=_ld.call(this);if(ok&&this.st)for(const b of NEWB)if(!this.st.bases.find(q=>q.id===b.id))this.st.bases.push({id:b.id,side:b.side,pool:b.side?8:6,dmg:0});return ok;};}
const FARPX=[-70000,-30000,10000,50000,85000];
const farps=()=>{const st=CAMP.st;if(!st)return[];const o=[];for(const x of FARPX)for(const s of[0,1]){const fz=CAMP.frontZ(x),z=fz+(s?-1:1)*rr(0,0)+(s?-14000:14000);o.push({x,z,s,lost:s===0?z<fz+3000:z>fz-3000});}return o;};
const TOWNS=[{x:-40000,z:40000,n:90,r:900,big:0},{x:30000,z:30000,n:60,r:700},{x:-80000,z:-20000,n:70,r:800},{x:20000,z:-40000,n:200,r:1600,big:1},{x:-10000,z:80000,n:150,r:1300,big:1},
  {x:60000,z:-90000,n:50,r:600},{x:-60000,z:100000,n:60,r:700},{x:-15000,z:-80000,n:80,r:900}];
function townGroup(){const g=new THREE.Group(),geo=new THREE.BoxGeometry(1,1,1),mats=[SKIN(0x9a958a,8),SKIN(0x8a7f70,8),SKIN(0xa8a49a,8),SKIN(0x6e7378,10)];
  for(const T of TOWNS){if(cmpRaw(T.x,T.z)<15)continue;const per=mats.map(m=>new THREE.InstancedMesh(geo,m,T.n));const cnt=[0,0,0,0],mx=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
    for(let i=0;i<T.n;i++){const a=Math.random()*6.283,d=Math.sqrt(Math.random())*T.r,x=T.x+Math.cos(a)*d,z=T.z+Math.sin(a)*d,y=cmpH(x,z);if(y<5)continue;
      const core=1-d/T.r,hh=T.big?(core>.6?rr(20,60):rr(8,22)):rr(5,12),w=rr(10,24),l=rr(10,30),k=T.big&&core>.6?3:(i%3);e.set(0,Math.round(a/1.57)*1.57,0);q.setFromEuler(e);
      mx.compose(new THREE.Vector3(x,y+hh/2-1,z),q,new THREE.Vector3(w,hh,l));per[k].setMatrixAt(cnt[k]++,mx);}
    per.forEach((m,k)=>{m.count=cnt[k];m.castShadow=false;m.receiveShadow=false;g.add(m);});}
  return g;}
function farpGroup(){const g=new THREE.Group(),pad=new THREE.MeshLambertMaterial({color:0x5c5e58,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),wh=new THREE.MeshLambertMaterial({color:0xe8e8e0,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  g.userData.items=[];for(const f of farps()){const y=cmpH(f.x,f.z),sub=new THREE.Group();sub.position.set(f.x,y,f.z);
    for(const dx of[-40,40]){const p=new THREE.Mesh(new THREE.PlaneGeometry(30,30),pad);p.rotation.x=-Math.PI/2;p.position.set(dx,.15,0);sub.add(p);const hm=new THREE.Mesh(new THREE.RingGeometry(8,10,24),wh);hm.rotation.x=-Math.PI/2;hm.position.set(dx,.2,0);sub.add(hm);}
    const tent=new THREE.Mesh(new THREE.BoxGeometry(10,4,6),SKIN(f.s?0x4f5a3c:0x6d6b4c,8));tent.position.set(0,2,30);sub.add(tent);
    for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,4,10),SKIN(0x3a3e34,8));b.rotation.z=Math.PI/2;b.position.set(-20+i*6,1.2,-30);sub.add(b);}
    g.add(sub);g.userData.items.push({f,sub});}
  return g;}
{const _em=CAMP.ensureMap,_lm=CAMP.leaveMap;
 CAMP.ensureMap=function(){const was=this.mapOn;_em.apply(this,arguments);if(!was&&this.mapOn){try{this.towns=townGroup();scene.add(this.towns);this.farpG=farpGroup();scene.add(this.farpG);}catch(e){console.warn('[campplus] scenery',e);}}};
 CAMP.leaveMap=function(){for(const k of['towns','farpG'])if(this[k]){scene.remove(this[k]);this[k]=null;}_lm.apply(this,arguments);};}
// helicopters start at the friendly FARP nearest to the line (pad 1), or 60 m over it for an air start
{const _sp=CAMP.spawnPlayer;CAMP.spawnPlayer=function(b,first){const P=_sp.apply(this,arguments);if(!P||!P.ac||!P.ac.heli)return P;
   const own=farps().filter(f=>f.s===0&&!f.lost);if(!own.length)return P;const f=own.sort((a,b)=>Math.abs(a.x-P.pos.x)-Math.abs(b.x-P.pos.x))[0],x=f.x-40,z=f.z,y=groundAt(x,z);
   if(game.sstart==='AIR'){P.spawn(x,y+60,z+200,180,40);P.onGnd=false;}else{P.spawn(x,y+(P.ac.heli.gh||1.9),z,180,0);P.onGnd=true;P.vel.set(0,0,0);}
   if(window.HELI&&HELI.st){const h=HELI.st(P);h.init=0;}flash('FARP · SECTOR '+(Math.round((f.x-CFX[0])/19000)+1),2500);return P;};}

/* ---------------------------------------------------------------- Shahed-136 */
function makeShahed(){const g=new THREE.Group(),m=SKIN(0xb8b8b0,20),d=SKIN(0x30302c,10);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.2,.26,3.4,10),m);body.rotation.x=Math.PI/2;g.add(body);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.2,.5,10),m);nose.rotation.x=-Math.PI/2;nose.position.z=-1.95;g.add(nose);
  const sh=new THREE.Shape();sh.moveTo(0,-1.4);sh.lineTo(1.25,1.0);sh.lineTo(1.25,1.45);sh.lineTo(-1.25,1.45);sh.lineTo(-1.25,1.0);sh.closePath();
  const w=new THREE.Mesh(new THREE.ShapeGeometry(sh),new THREE.MeshPhongMaterial({color:0xb0b0a8,side:THREE.DoubleSide}));w.rotation.x=-Math.PI/2;w.position.set(0,0,.2);g.add(w);
  for(const s of[-1,1]){const f=new THREE.Mesh(new THREE.BoxGeometry(.04,.55,.5),m);f.position.set(s*1.25,.2,1.4);g.add(f);}
  const pr=new THREE.Mesh(new THREE.BoxGeometry(.9,.08,.04),d);pr.position.z=1.75;g.add(pr);g.userData.prop=pr;const ab=new THREE.Object3D();ab.visible=false;g.add(ab);g.userData.ab=ab;return g;}
if(!AC['Shahed-136']&&AC['MiG-21']){cloneType('MiG-21','Shahed-136',{name:'Shahed-136',model:makeShahed,rcs:.12,irs:.12,empty:200,fuel:30,gun:null,heli:undefined});
  const i=ACS.indexOf('Shahed-136');if(i>=0)ACS.splice(i,1);if(typeof STN!=='undefined')STN['Shahed-136']={};}
const SH={list:[],raidT:.15};
{const _st=Jet.prototype.step;Jet.prototype.step=function(dt){if(!this.shahed||!this.alive)return _st.call(this,dt);
   const s=this.shahed,to=new THREE.Vector3(s.tx-this.pos.x,0,s.tz-this.pos.z),dh=to.length(),gy=groundAt(this.pos.x,this.pos.z);
   let tY=Math.max(gy+s.agl,gy+60);if(dh<1800)tY=s.ty;                           // terminal dive on the aim point
   const dir=new THREE.Vector3(to.x,(tY-this.pos.y)*(dh<1800?dh/1800+.2:.15),to.z).normalize();
   this.vel.lerp(dir.multiplyScalar(dh<1800?62:51),Math.min(1,dt*.6));this.pos.addScaledVector(this.vel,dt);
   this.q.setFromUnitVectors(new THREE.Vector3(0,0,-1),this.vel.clone().normalize());
   if(this.mesh.userData.prop)this.mesh.userData.prop.rotation.z+=dt*90;this.sync();
   if(this.pos.y<=groundAt(this.pos.x,this.pos.z)+3||dh<25&&this.pos.y<s.ty+15){SHboom(this);}};}
function SHboom(j){const s=j.shahed;j.alive=false;j.hp=0;j.gone=true;explode(j.pos.clone(),true);scene.remove(j.mesh);const k=jets.indexOf(j);if(k>=0)jets.splice(k,1);
  const b=CAMP.st&&CAMP.baseRec(s.base);if(b&&Math.hypot(j.pos.x-s.tx,j.pos.z-s.tz)<350){b.dmg=Math.min(100,b.dmg+8);b.pool=Math.max(0,b.pool-.3);s.raid.hit++;}
  if(player&&player.alive&&player.pos.distanceTo(j.pos)<60)player.damage(80,null);}
function launchRaid(){const st=CAMP.st,tgts=CAMP.bases(0).filter(b=>b.dmg<90);if(!tgts.length)return;const tb=pick(tgts),n=3+((Math.random()*4)|0);
  const sx=tb.x+rr(-60000,60000),sz=CAMP.frontZ(sx)-rr(45000,70000),raid={n,hit:0,down:0,base:tb.id};
  const near=player&&player.alive&&Math.hypot(player.pos.x-tb.x,player.pos.z-tb.z)<220000&&CAMP.on;
  if(!near){// abstract: about a third get through
    let hit=0;for(let i=0;i<n;i++)if(Math.random()<.35)hit++;const br=CAMP.baseRec(tb.id);br.dmg=Math.min(100,br.dmg+hit*8);br.pool=Math.max(0,br.pool-hit*.3);
    CAMP.log('Shahed raid on '+tb.name+': '+hit+' of '+n+' hit.','r');return;}
  for(let i=0;i<n;i++){const j=new Jet(1,'Shahed-136',{},'modern');const x=sx+i*300,z=sz-i*500;j.spawn(x,groundAt(x,z)+rr(250,500),z,0,51);
    j.callsign='SHAHED '+(i+1);j.ai={radarLock:false,t:null,friend:false,hojLock:false,target:null,update(){},skill(){},plan(){}};
    j.shahed={tx:tb.x+330+rr(-150,150),tz:tb.z+rr(-400,400),ty:tb.H+2,agl:rr(120,400),base:tb.id,raid};jets.push(j);SH.list.push(j);}
  const eta=Math.round(Math.hypot(tb.x-sx,tb.z-sz)/51/60);
  CAMP.log('INTERCEPT: Shahed raid, '+n+' drones inbound '+tb.name+', ETA '+eta+' min, low and slow.','r');
  if(SET.calls==='ON')radio('DARKSTAR: drones, '+n+' Shaheds tracking toward '+tb.name+'. Intercept, ETA '+eta+' minutes.',true);}
{const _ak=CAMP.airKill;CAMP.airKill=function(v,src){if(v&&v.shahed){v.shahed.raid.down++;if(src===player){flash('SHAHED DOWN',1800);if(this.sortie)this.sortie.ak=(this.sortie.ak||0)+1;}return;}return _ak.apply(this,arguments);};}
{const _k=Jet.prototype.kill;Jet.prototype.kill=function(why,src){if(this.shahed&&this.alive){if(typeof CAMP!=='undefined'&&CAMP.st)CAMP.airKill(this,src||this.lastHitBy);}return _k.apply(this,arguments);};}

/* ---------------------------------------------------------------- FPV drones */
const FPV={vis:[]};
function fpvMesh(){const g=new THREE.Group(),m=SKIN(0x2a2c2a,10);const b=new THREE.Mesh(new THREE.BoxGeometry(.25,.08,.25),m);g.add(b);
  for(const [x,z] of[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]]){const r=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.01,8),SKIN(0x111111,5));r.position.set(x,.05,z);g.add(r);}
  const war=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.35,6),SKIN(0x5a5a40,8));war.rotation.x=Math.PI/2;war.position.set(0,-.06,-.15);g.add(war);g.scale.setScalar(2);return g;}
function fpvStrike(side){const st=CAMP.st,hot=st.hot;if(!hot.length)return;const i=pick(hot),c=st.units.filter(u=>!u.dead&&u.s!==side&&u.i===i&&Math.abs(u.z-CAMP.frontZ(u.x))<6000);if(!c.length)return;
  const u=pick(c),hit=Math.random()<(u.k==='INF'?.55:.4),dmg=u.k==='INF'?rr(40,90):u.k==='MBT'?rr(20,55):rr(30,70);
  const P=player&&player.alive?player:null;
  if(P&&CAMP.mapOn&&Math.hypot(P.pos.x-u.x,P.pos.z-u.z)<9000){const m=fpvMesh(),sx=u.x+rr(-600,600),sz=u.z+(side?-1:1)*rr(2500,4000);m.position.set(sx,groundAt(sx,sz)+40,sz);scene.add(m);
    FPV.vis.push({m,u,hit,dmg,side,t:0});}
  else if(hit)CAMP.dmgUnit(u,dmg,null);}
function fpvTick(dt){for(let k=FPV.vis.length-1;k>=0;k--){const f=FPV.vis[k],m=f.m;f.t+=dt;const tx=f.u.x,tz=f.u.z,ty=groundAt(tx,tz)+2,v=new THREE.Vector3(tx-m.position.x,ty-m.position.y,tz-m.position.z),d=v.length();
    const h=d>300?Math.max(groundAt(m.position.x,m.position.z)+25,m.position.y):m.position.y;if(d>300)v.y=h-m.position.y;v.normalize();m.position.addScaledVector(v,Math.min(d,(d>300?38:45)*dt));m.lookAt(tx,ty,tz);
    if(d<4||f.t>150||f.u.dead){scene.remove(m);FPV.vis.splice(k,1);if(d<10){explode(m.position.clone(),false);if(f.hit&&!f.u.dead)CAMP.dmgUnit(f.u,f.dmg,null);}}}}

/* ---------------------------------------------------------------- the clocks */
{const _tk=CAMP.tick;CAMP.tick=function(dt){_tk.call(this,dt);const st=this.st;if(!st)return;
   try{fpvTick(dt);}catch(e){}
   for(let i=SH.list.length-1;i>=0;i--){const j=SH.list[i];if(j.gone||!jets.includes(j)){SH.list.splice(i,1);const r=j.shahed.raid;if(!r.done&&r.hit+r.down>=r.n){r.done=1;this.log('Shahed raid on '+cbDef(r.base).name+': '+r.down+' shot down, '+r.hit+' hit.',r.hit?'r':'b');}}}
   if(this.client||ERA()!=='modern')return;
   st.shT=(st.shT==null?rr(.08,.2):st.shT)-dt/3600;if(st.shT<=0){st.shT=rr(.25,.5)-st.diff*.04;try{launchRaid();}catch(e){console.warn('[campplus] raid',e);}}
   st.fpvT=(st.fpvT==null?.01:st.fpvT)-dt/3600;if(st.fpvT<=0){st.fpvT=rr(.006,.016);fpvStrike(Math.random()<.5?0:1);}};}
// dead Shahed wrecks are removed from the list when the campaign despawns them
{const _cl=CAMP.leaveMap;CAMP.leaveMap=function(){for(const f of FPV.vis)scene.remove(f.m);FPV.vis.length=0;return _cl.apply(this,arguments);};}
window.CAMPPLUS={SH,FPV,farps,TOWNS,NAMES,launchRaid};
console.info('[campplus] loaded');
})();
