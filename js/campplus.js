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

/* ---------------------------------------------------------------- v316: more air defence on both sides
   The campaign already fields S-300 / SA-6 / Tor / Tunguska / Pantsir / ZSU-23-4 for red and Patriot / I-Hawk or IRIS-T SLM /
   Roland or NASAMS / Gepard for blue (the v182 faction mapping turns each entry into its own side's equivalent, by era).
   This adds a second belt: per side one long-range battery, two medium SAM batteries, two short-range SAMs, two gun / missile
   SPAAGs and two AAA guns, spread along the front at the usual depths. Every SA-6 and ZSU-23-4 now also engages the nearest
   hostile aircraft, not only the player. */
(()=>{const rr=(a,b)=>a+Math.random()*(b-a);
 const BELT=[['S300',5,38000,42000,[10000]],['SITE',4,19000,25000,[-70000,30000]],['TOR',1,9000,14000,[-40000,60000]],
             ['TUNG',1,3500,5000,[-60000,20000]],['ZSU',1,3200,4600,[-20000,75000]]];
 function addAD(st){if(st.adPlus)return;st.adPlus=1;let id=st.ad.reduce((m,a)=>Math.max(m,a.id),0)+1;
   for(const s of[1,0])for(const [k,n,d0,d1,xs] of BELT)for(const x0 of xs){const x=x0+rr(-6000,6000)+(s?0:9000),fz=CAMP.frontZ(x);
     st.ad.push({id:id++,k,s,x,z:fz+(s?-1:1)*rr(d0,d1),hd:s?180:0,al:Array(n).fill(1)});}}
 const _ns=CAMP.newState;CAMP.newState=function(){const st=_ns.apply(this,arguments);addAD(st);return st;};
 const _ld=CAMP.load;CAMP.load=function(){const ok=_ld.apply(this,arguments);if(ok&&this.st)addAD(this.st);return ok;};
 // our own SA-6-slot and gun-slot sites pull back when the front closes on them
 const _pa=CAMP.placeAD;CAMP.placeAD=function(first){_pa.apply(this,arguments);for(const a of this.st.ad){if(a.s!==0||a.k!=='SITE'&&a.k!=='ZSU')continue;const fz=this.frontZ(a.x),d=a.k==='SITE'?19000:3200;
     if(a.z-fz<d*.5){a.z=fz+rr(d,d*1.3);a.mv=1;}}};})();

/* ---------------------------------------------------------------- v317: more SAM types (red)
   COLD (mid-1980s): S-75 Dvina (SA-2 'Guideline', SNR-75 'Fan Song' + 6 launchers), S-125 Neva (SA-3 'Goa', SNR-125 'Low Blow' + 4 launchers),
   9K37 Buk (SA-11 'Gadfly' TELAR) and 9K33 Osa (SA-8 'Gecko').
   MODERN: S-400 (SA-21 'Growler', 92N6 'Grave Stone' + 4 TELs, 48N6DM) and Buk-M2 (SA-17 'Grizzly', 9M317).
   Engagement envelopes from public figures (rounded); missile kinematics are gameplay-level. SA-2 / SA-3 are command-guided in reality;
   here they use the game's semi-active homing model, which is the closest it has. On a REDFOR war each one maps to the NATO
   counterpart on the blue side (S-400 -> Patriot, SA-2 / SA-3 / SA-11 / SA-17 -> Hawk or IRIS-T SLM, SA-8 -> Roland or NASAMS). */
(()=>{if(typeof PROF==='undefined'||typeof addMsl!=='function'){console.warn('[campplus] SAM engine missing');return;}
const rr=(a,b)=>a+Math.random()*(b-a),D=Math.PI/180;
const T5=MSL['5V55R'];
addMsl('V-750','V-750 (SA-2)',Object.assign({},T5,{burn:26,acc:85,maxG:12,fuse:65,life:90,rmin:7000,mass:2300,aiR:40000,trk:.4,res:.55}),{b:4,s:22,f:.6},.5,10.6);
addMsl('5V27','5V27 (SA-3)',Object.assign({},T5,{burn:23,acc:100,maxG:15,fuse:12,life:60,rmin:3500,mass:950,aiR:25000,trk:.5,res:.6}),{b:3,s:20,f:.6},.38,6.1);
addMsl('9M38M1','9M38M1 (SA-11)',Object.assign({},T5,{burn:15,acc:120,maxG:24,fuse:17,life:60,rmin:3000,mass:690,aiR:32000,trk:.6,res:.7}),{b:3,s:12,f:.6},.4,5.55);
addMsl('9M317','9M317 (SA-17)',Object.assign({},T5,{burn:15,acc:125,maxG:26,fuse:17,life:70,rmin:3000,mass:715,aiR:45000,trk:.65,res:.72}),{b:3,s:12,f:.6},.4,5.55);
addMsl('9M33','9M33 (SA-8)',Object.assign({},T5,{burn:12,acc:110,maxG:25,fuse:6,life:25,rmin:1500,mass:130,aiR:10000,trk:.6,res:.7}),{b:2,s:10,f:.65},.21,3.16);
addMsl('48N6DM','48N6DM (S-400)',Object.assign({},T5,{burn:18,acc:130,maxG:22,fuse:24,life:180,rmin:5000,mass:1900,aiR:150000,trk:.6,res:.7}),{b:4,s:14,f:.6},.52,7.5);
if(typeof MSL_KEYS!=='undefined')for(const k of Object.keys(MSL))if(!MSL_KEYS.includes(k))MSL_KEYS.push(k);
Object.assign(PROF,{
  S75:{nm:'SA-2',msl:'V-750',R0:110000,rmin:7000,rmax:40000,amin:300,amax:25000,floor:300,acq:12,sw:5,salvo:2,gap:6,reload:60,maxAir:2,el:60,am:1},
  S125:{nm:'SA-3',msl:'5V27',R0:80000,rmin:3500,rmax:25000,amin:20,amax:18000,floor:25,acq:9,sw:4,salvo:2,gap:5,reload:50,maxAir:2,el:60,am:2},
  BUK:{nm:'SA-11',msl:'9M38M1',R0:85000,rmin:3000,rmax:32000,amin:15,amax:22000,floor:20,acq:5,sw:4,salvo:2,gap:4,reload:12,maxAir:2,el:60,am:4,self:1},
  OSA:{nm:'SA-8',msl:'9M33',R0:30000,rmin:1500,rmax:10000,amin:10,amax:5000,floor:10,acq:3.5,sw:1.2,salvo:2,gap:3,reload:10,maxAir:2,el:60,am:6,self:1},
  S400:{nm:'S-400',msl:'48N6DM',R0:250000,rmin:5000,rmax:150000,amin:10,amax:27000,floor:15,acq:8,sw:6,salvo:2,gap:5,reload:30,maxAir:6,el:60,am:4}});
Object.assign(GTY,{
  FANS:{n:'SNR-75 Fan Song (SA-2)',hp:60,arm:0,r:5,rcs:0,emit:1,rwr:'2',spo:2,R0:110000},S75L:{n:'SM-63 launcher (SA-2)',hp:50,arm:0,r:4.5},
  LOWB:{n:'SNR-125 Low Blow (SA-3)',hp:60,arm:0,r:5,rcs:0,emit:1,rwr:'3',spo:2,R0:80000},S125L:{n:'5P73 launcher (SA-3)',hp:50,arm:0,r:4.5},
  BUKT:{n:'9A310 TELAR (SA-11)',hp:70,arm:1,r:4.5,emit:1,rwr:'11',spo:2,R0:85000},
  OSAV:{n:'9A33 Osa (SA-8)',hp:55,arm:1,r:4.2,emit:1,rwr:'8',spo:3,R0:30000},
  S4R:{n:'92N6 Grave Stone (S-400)',hp:60,arm:1,r:5,rcs:0,emit:1,rwr:'21',spo:1,R0:250000},S4L:{n:'5P85TE2 TEL (S-400)',hp:70,arm:1,r:4.8}});
{const mt={},M=c=>mt[c]||(mt[c]=SKIN(c,14)),ol=0x56603e,dk=0x23262a,cr=0xb8b4a0;
 const B=(g,w,h,l,m,x,y,z,rx=0,ry=0)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),m);b.position.set(x,y,z);b.rotation.set(rx,ry,0);g.add(b);return b;};
 const C=(g,r,l,m,x,y,z,rx=Math.PI/2)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,10),m);c.rotation.x=rx;c.position.set(x,y,z);g.add(c);return c;};
 const trk=(g,w,l)=>{B(g,.6,.95,l,M(dk),-w/2+.3,.48,0);B(g,.6,.95,l,M(dk),w/2-.3,.48,0);};
 const truck=(g,len)=>{B(g,2.6,1.1,len,M(dk),0,.9,0);B(g,2.6,1.7,2.2,M(ol),0,1.9,-len/2+1.4);for(const z of[-len/2+1.6,0,len/2-1.6])for(const x of[-1.25,1.25]){const w=C(g,.6,.45,M(dk),x,.6,z,0);w.rotation.z=Math.PI/2;}};
 const fin=g=>{g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});return g;};
 const ant=(g,y)=>{const a=new THREE.Group();a.position.set(0,y,0);g.add(a);g.userData.ant=a;return a;};
 const rail=(g,len,r,el,y)=>{const p=new THREE.Group();p.position.set(0,y,0);p.rotation.x=el;g.add(p);B(p,.5,.3,len*.9,M(ol),0,-.3,0);C(p,r,len,M(0xd8d6cc),0,0,0);C(p,r*1.3,len*.25,M(0xd8d6cc),0,0,len*.38);return p;};
 Object.assign(CMESH,{
  FANS(){const g=new THREE.Group();B(g,3,2.4,6,M(ol),0,1.2,0);const a=ant(g,2.6);B(a,.6,1.6,.6,M(dk),0,.8,0);B(a,7,.8,.25,M(cr),0,2,0);B(a,.8,5,.25,M(cr),1.5,2,0,0,0).rotation.z=0;B(a,1.6,1.6,.4,M(cr),-1.8,1.2,.3);return fin(g);},
  S75L(){const g=new THREE.Group();B(g,3.2,.8,3.2,M(ol),0,.4,0);C(g,.9,.5,M(ol),0,1,0,0);rail(g,10.6,.25,-.45,2.2);return fin(g);},
  LOWB(){const g=new THREE.Group();B(g,3,2.4,6,M(ol),0,1.2,0);const a=ant(g,2.6);B(a,.6,1.4,.6,M(dk),0,.7,0);B(a,4,.6,.3,M(cr),0,1.8,0,-.3);B(a,.6,3,.3,M(cr),0,2.2,.2,0,.0);return fin(g);},
  S125L(){const g=new THREE.Group();B(g,3,.8,3,M(ol),0,.4,0);C(g,.8,.5,M(ol),0,1,0,0);for(const x of[-.6,.6])for(const y of[0,.9]){const p=rail(g,6.1,.19,-.5,1.8+y);p.position.x=x;}return fin(g);},
  BUKT(){const g=new THREE.Group();trk(g,3.2,7.2);B(g,3.1,1.2,7,M(ol),0,1.3,0);const t=new THREE.Group();t.position.set(0,2,.6);g.add(t);B(t,2.4,.6,2.4,M(ol),0,.3,0);
    for(const x of[-.5,-.17,.17,.5]){const p=rail(t,5.5,.2,-.35,1);p.position.x=x;}const a=ant(g,2.4);a.position.z=-2;B(a,2,1.6,.3,M(cr),0,.9,0);return fin(g);},
  OSAV(){const g=new THREE.Group();B(g,2.8,1.8,8.5,M(ol),0,1.5,0);for(let i=0;i<3;i++)for(const x of[-1.25,1.25]){const w=C(g,.65,.5,M(dk),x,.65,-2.5+i*2.5,0);w.rotation.z=Math.PI/2;}
    const t=new THREE.Group();t.position.set(0,2.4,.5);g.add(t);B(t,1.8,1,1.8,M(ol),0,.5,0);for(const x of[-1.4,1.4])for(const y of[0,.45])C(t,.11,3.1,M(0xd8d6cc),x,1+y,0);const a=ant(g,3.4);B(a,1.6,.9,.2,M(cr),0,.6,.5);return fin(g);},
  S4R(){const g=new THREE.Group();truck(g,9);B(g,2.6,2,3.8,M(ol),0,2.6,2);const a=ant(g,3.6);a.position.z=2;B(a,3.8,3.2,.35,M(cr),0,1.8,0,-.25);return fin(g);},
  S4L(){const g=new THREE.Group();truck(g,11);for(const x of[-.7,.7])for(const y of[0,1])C(g,.4,7.5,M(0x6a6846),x,2.6+y*.9,1.3,Math.PI/2+.0);return fin(g);}});}
const PARTS={S75:['FANS','S75L','S75L','S75L','S75L','S75L','S75L'],S125:['LOWB','S125L','S125L','S125L','S125L'],BUK:['BUKT'],OSA:['OSAV'],S400:['S4R','S4L','S4L','S4L','S4L']};
const OFF={S75:[[0,0]].concat([0,1,2,3,4,5].map(i=>[Math.cos(i*1.047)*170,Math.sin(i*1.047)*170])),S125:[[0,0],[140,0],[-140,0],[0,140],[0,-140]],
  S400:[[0,0],[-260,-140],[260,-140],[-260,180],[260,180]],BUK:[[0,0]],OSA:[[0,0]]};
// REDFOR wars: the blue side fields NATO counterparts
if(typeof effK==='function'){const _e=effK;effK=function(a){if(a&&PARTS[a.k]&&a.s!=null&&!redSide(a.s)){const mod=CAMP.st&&CAMP.st.era==='modern';return{S400:'PATR',S75:mod?'IRIS':'HAWK',S125:mod?'IRIS':'HAWK',BUK:mod?'IRIS':'HAWK',OSA:mod?'NASM':'ROL'}[a.k];}return _e(a);};}
const own=a=>PARTS[a.k]&&(typeof effK!=='function'||effK(a)===a.k);
{const _mk=CAMP.mkAD;CAMP.mkAD=function(a){if(!own(a))return _mk.call(this,a);
   const parts=PARTS[a.k].map((t,i)=>{const o=OFF[a.k][i],g=GND.add(t,a.s==null?1:a.s,a.x+o[0],a.z+o[1],a.hd);g.callsign=GTY[t].n;return g;});
   parts.forEach((g,i)=>{g.ad=[a.id,i];if(!a.al[i])this.wreck(g,0);});this.adPhys.set(a.id,parts);a.mv=0;this.mkS2(a,parts,PROF[a.k]);};
 const _of=CAMP.adOff;CAMP.adOff=function(a){return own(a)?OFF[a.k]:_of.call(this,a);};
 const _ak=CAMP.adKilled;CAMP.adKilled=function(g,src){_ak.call(this,g,src);const a=this.st&&this.st.ad.find(q=>q.id===g.ad[0]);if(!a||this.client||!own(a))return;
   if(g.ad[1]===0&&PARTS[a.k].length>1)this.log(PROF[a.k].nm+' radar destroyed. The battery is blind.',a.s===0?'r':'b');};}
const eraNames=()=>{const m=CAMP.st&&CAMP.st.era==='modern';PROF.BUK.nm=m?'SA-17':'SA-11';PROF.BUK.msl=m?'9M317':'9M38M1';PROF.BUK.rmax=m?45000:32000;GTY.BUKT.n=m?'9A317 TELAR (SA-17)':'9A310 TELAR (SA-11)';GTY.BUKT.rwr=m?'17':'11';};
function add3(st){if(st.ad3)return;st.ad3=1;eraNames();let id=st.ad.reduce((m,a)=>Math.max(m,a.id),0)+1;const P=(k,x,d0,d1)=>{const fz=CAMP.frontZ(x);st.ad.push({id:id++,k,s:1,x,z:fz-rr(d0,d1),hd:180,al:Array(PARTS[k].length).fill(1)});};
  if(st.era==='modern'){P('S400',-5000,60000,70000);for(const x of[-65000,-5000,55000])P('BUK',x+rr(-5000,5000),16000,24000);}
  else{for(const x of[-55000,40000])P('S75',x,32000,42000);for(const x of[-25000,70000])P('S125',x,15000,22000);for(const x of[-80000,10000])P('BUK',x,15000,24000);for(const x of[-45000,25000,85000])P('OSA',x,5000,9000);}}
{const _ns=CAMP.newState;CAMP.newState=function(){const st=_ns.apply(this,arguments);add3(st);return st;};
 const _ld=CAMP.load;CAMP.load=function(){const ok=_ld.apply(this,arguments);if(ok&&this.st){eraNames();add3(this.st);}return ok;};}
window.CAMPSAM={PROF,PARTS,OFF};})();

/* ---------------------------------------------------------------- v318: MANPADS
   Shoulder-fired IR missile teams on both sides, in the campaign (around every airfield and along the front) and in the STRIKE mission.
   COLD:   red 9K32M Strela-2M (SA-7b: uncooled seeker, tail-chase only, easily flared) and 9K34 Strela-3 (SA-14: cooled seeker, still mostly rear aspect);
           blue FIM-43C Redeye (rear aspect) and FIM-92A Stinger (all-aspect, UV / IR).
   MODERN: red 9K338 Igla-S (SA-24, all-aspect, flare rejection); blue FIM-92J Stinger RMP (all-aspect, better rejection).
   A team has no radar and gives no RWR warning: it sees the aircraft by eye (day about 9 km, night about 2.5 km), needs line of sight, waits for the
   seeker tone (several seconds), and fires only inside the missile's envelope; rear-aspect missiles need you flying away from the team, all-aspect ones
   have a shorter range head-on. Two or three missiles per team and a reload of 7-8 s. Ranges, ceilings, speeds and seeker figures are rounded public data;
   the flight model is the game's IR missile with these parameters. Teams engage any hostile aircraft (the player, AI jets, helicopters). */
(()=>{if(typeof addMsl!=='function'||typeof Missile==='undefined'){console.warn('[campplus] MANPADS: engine missing');return;}
const rr=(a,b)=>a+Math.random()*(b-a),D=Math.PI/180,T9=MSL['AIM-9P'];
const def=(o)=>Object.assign({},T9,{seek:'IR',ign:0,search:2.5*D,smoke:.5},o);
addMsl('9M32M','Strela-2M (SA-7b)',def({trk:.25,ccm:0,burn:1.9,acc:230,cd:1.25e-4,maxG:9,gimbal:20*D,fuse:4,life:15,N:3,res:.3,rmin:500,stop:160,mass:9.8,irR:3800,front:.02,aiR:3600,aiOff:14*D}),{b:.3,s:1.6,f:.35},.072,1.44);
addMsl('9M36','Strela-3 (SA-14)',def({trk:.4,ccm:.12,burn:2.2,acc:215,cd:1.3e-4,maxG:14,gimbal:28*D,fuse:4,life:16,N:3.3,res:.45,rmin:500,stop:170,mass:10.3,irR:5200,front:.1,aiR:4800,aiOff:18*D}),{b:.35,s:1.85,f:.4},.072,1.47);
addMsl('9M342','Igla-S (SA-24)',def({trk:.6,ccm:.35,burn:2.4,acc:240,cd:1.4e-4,maxG:20,gimbal:30*D,fuse:4,life:18,N:3.6,res:.6,rmin:400,stop:180,mass:11.1,irR:7000,front:.4,aiR:6000,aiOff:22*D}),{b:.4,s:2,f:.4},.072,1.7);
addMsl('FIM-43C','Redeye',def({trk:.28,ccm:.05,burn:1.8,acc:260,cd:1.2e-4,maxG:10,gimbal:22*D,fuse:4,life:14,N:3,res:.35,rmin:600,stop:170,mass:8.3,irR:4000,front:.03,aiR:3600,aiOff:14*D}),{b:.3,s:1.5,f:.35},.07,1.4);
addMsl('FIM-92A','Stinger',def({trk:.55,ccm:.3,burn:2.2,acc:440,cd:1.4e-4,maxG:20,gimbal:30*D,fuse:4,life:16,N:3.5,res:.55,rmin:300,stop:200,mass:10.1,irR:6000,front:.4,aiR:5200,aiOff:25*D}),{b:.35,s:1.85,f:.4},.07,1.5);
addMsl('FIM-92J','Stinger RMP',def({trk:.7,ccm:.45,burn:2.3,acc:450,cd:1.4e-4,maxG:24,gimbal:32*D,fuse:4,life:18,N:3.8,res:.65,rmin:300,stop:200,mass:10.1,irR:8000,front:.6,aiR:6500,aiOff:28*D}),{b:.35,s:1.95,f:.4},.07,1.5);
if(typeof MSL_KEYS!=='undefined')for(const k of Object.keys(MSL))if(!MSL_KEYS.includes(k))MSL_KEYS.push(k);
// per-weapon employment envelope: range m, min range, ceiling above the team, time to seeker tone, missiles per team, reload s, rear-aspect only
const WP={'9M32M':{nm:'9K32M Strela-2M (SA-7b)',rmax:3700,rmin:500,amax:2300,acq:4.5,ammo:2,rl:8,rear:1},'9M36':{nm:'9K34 Strela-3 (SA-14)',rmax:4000,rmin:500,amax:2300,acq:4,ammo:2,rl:8,rear:1},
  '9M342':{nm:'9K338 Igla-S (SA-24)',rmax:5200,rmin:400,amax:3500,acq:3.5,ammo:3,rl:7},'FIM-43C':{nm:'FIM-43C Redeye',rmax:4000,rmin:600,amax:2700,acq:4.5,ammo:2,rl:8,rear:1},
  'FIM-92A':{nm:'FIM-92A Stinger',rmax:4800,rmin:300,amax:3800,acq:3.5,ammo:3,rl:7},'FIM-92J':{nm:'FIM-92J Stinger RMP',rmax:6000,rmin:300,amax:4800,acq:3.2,ammo:3,rl:7}};
const ERAK=(side)=>{const m=(CAMP.on&&CAMP.st?CAMP.st.era:game.era)==='modern';
  if(side===1)return m?['9M342']:['9M32M','9M32M','9M36'];return m?['FIM-92J']:['FIM-43C','FIM-92A','FIM-92A'];};
Object.assign(GTY,{MPDR:{n:'MANPADS team',hp:25,arm:0,r:5,mp:1},MPDB:{n:'MANPADS team',hp:25,arm:0,r:5,mp:1}});
{const mt={},M=c=>mt[c]||(mt[c]=SKIN(c,8)),fin=g=>{g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});return g;};
 const B=(g,w,h,l,m,x,y,z)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),m);b.position.set(x,y,z);g.add(b);return b;};
 const team=(c1,c2)=>{const g=new THREE.Group(),a=M(c1),b=M(c2),d=M(0x23262a);
   for(const [x,z,k] of[[0,0,1],[2.2,.8,0],[-2,1.2,0]]){B(g,.55,.9,.4,a,x,.55,z);B(g,.3,.3,.3,b,x,1.2,z);B(g,.5,.5,.35,b,x,.25,z+.1);if(!k)B(g,.5,.7,.3,b,x,.9,z+.1);}
   const tu=new THREE.Group();tu.position.set(0,1.05,0);g.add(tu);g.userData.tube=tu;const t=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,1.5,8),M(0x4a4f3a));t.rotation.x=Math.PI/2;t.position.z=-.55;tu.add(t);
   const gp=new THREE.Mesh(new THREE.BoxGeometry(.14,.3,.2),d);gp.position.set(0,-.1,-.2);tu.add(gp);g.userData.rounds=[tu];
   B(g,1.2,.5,.6,M(0x5a5a3a),-.9,.25,-1.2);return fin(g);};
 CMESH.MPDR=()=>team(0x56603e,0x434a34);CMESH.MPDB=()=>team(0x6d6b4c,0x4f4f3a);}
const MP={t:0,cache:[],nU:-1,list(){if(this.nU!==GND.units.length){this.nU=GND.units.length;this.cache=GND.units.filter(u=>u.T&&u.T.mp);}return this.cache;}};
function init(u){const ks=ERAK(u.side),k=ks[(Math.random()*ks.length)|0],w=WP[k];u._mp={k,w,ammo:w.ammo,nextT:0,acq:0,cnd:null,selT:rr(0,.5),msl:[]};u.callsign=u.type=w.nm+' team';u.ac.irs=.3;}
function pick(u,s){const w=s.w,out=[],eye=new V3(u.pos.x,u.pos.y+1.6,u.pos.z),night=typeof ENV!=='undefined'&&ENV.nightK>.5,vis=night?2500:9000;let best=null,bd=1e12;
  const c=[];if(player&&player.alive&&player.side!==u.side)c.push(player);if(!CAMP.client)for(const j of jets)if(j.alive&&!j.gone&&!j.remote&&!j.peer&&j!==player&&j.side!==u.side&&j.ai)c.push(j);
  for(const j of c){const d=eye.distanceTo(j.pos);if(d>Math.min(w.rmax*1.05,vis*Math.pow(Math.max(.5,j.ac&&j.ac.rcs||5)/6,.18)))continue;const alt=j.pos.y-u.pos.y;if(alt<-50||alt>w.amax||d<w.rmin)continue;
    if(!terrLOS(eye,j.pos))continue;if(d<bd){bd=d;best=j;}}return best;}
function tone(u,s,T){// is there a seeker tone: aspect and range scaling
  const w=s.w,to=new V3().copy(T.pos).sub(u.pos),d=to.length();to.divideScalar(d||1);const f=T.fwd?T.fwd(new V3()):new V3(0,0,-1),c=f.dot(to);   // c = 1 when the aircraft flies directly away
  const fr=MSL[s.k].front;let mult;if(w.rear&&fr<=.12){if(c<.2)return false;mult=.5+.5*c;}else mult=fr+(1-fr)*(c+1)/2;
  if(T.ac&&T.ac.heli)mult*=.9;return d<w.rmax*mult&&d>w.rmin;}
function fire(u,s,T){const w=s.w,lp=new V3(u.pos.x,u.pos.y+1.7,u.pos.z),d0=T.pos.distanceTo(lp),tof=d0/430,to=T.pos.clone().addScaledVector(T.vel,Math.min(tof,5)).sub(lp),hz=Math.hypot(to.x,to.z)||1,
    el=Math.max(Math.atan2(to.y,hz),8*D),dir=new V3(to.x/hz*Math.cos(el),Math.sin(el),to.z/hz*Math.cos(el)).normalize();
  const sh={gnd:true,side:u.side,get alive(){return u.alive;},ai:{radarLock:false,hojLock:false,t:null},pos:u.pos,vel:new V3(),ac:u.ac,type:w.nm,callsign:w.nm,fwd:v=>v.copy(dir),up:v=>v.set(-dir.x*dir.y,1-dir.y*dir.y,-dir.z*dir.y).normalize()};
  const m=new Missile(s.k,sh,T,lp);m.vel.copy(dir).multiplyScalar(28);s.msl.push(m);s.ammo--;
  const tu=u.mesh.userData.tube;if(tu){tu.rotation.set(el,-Math.atan2(to.x,-to.z)+u.hdg*D,0,'YXZ');}
  for(let i=0;i<10;i++)smoke.emit(lp,GV.set(rnd(-4,4),rnd(0,3),rnd(-4,4)),rnd(3,6),4,12,.85,.84,.8,.55,.3);glow.emit(lp,null,.3,5,6,1,.7,.3,1);
  if(T===player&&SET.calls==='ON'&&!isMig())radio('Missile launch! Shoulder-fired, '+w.nm+'.');}
MP.tick=function(dt){this.t+=dt;const now=this.t;for(const u of this.list()){if(!u.alive){continue;}if(!u._mp)init(u);const s=u._mp,w=s.w;s.msl=s.msl.filter(m=>m.alive);
    s.selT-=dt;if(s.selT<=0){s.selT=.4+Math.random()*.2;s.cnd=pick(u,s);}
    const T=s.cnd;if(!T||!T.alive){s.acq=Math.max(0,s.acq-dt*2);continue;}
    const rel=T.pos.clone().sub(u.pos);u.aim.copy(rel).normalize();const tu=u.mesh.userData.tube;if(tu){const hz=Math.hypot(rel.x,rel.z)||1;tu.rotation.set(Math.atan2(rel.y,hz),-Math.atan2(rel.x,-rel.z)+u.hdg*D,0,'YXZ');}
    if(tone(u,s,T))s.acq+=dt;else s.acq=Math.max(0,s.acq-dt*1.5);
    if(s.acq>w.acq&&s.ammo>0&&now>=s.nextT&&!s.msl.length){fire(u,s,T);s.nextT=now+w.rl;s.acq=w.acq*.4;}}};
{const _t=GND.tick;GND.tick=function(dt){_t.call(this,dt);try{MP.tick(dt);}catch(e){if(!MP.err){MP.err=1;console.warn('[campplus] MANPADS',e);}}};}
{const _c=GND.clear;GND.clear=function(){MP.nU=-1;return _c.apply(this,arguments);};}
// STRIKE mission: three teams around the depot
{const _s=GND.setup;GND.setup=function(P){_s.apply(this,arguments);const C=this.center;if(!C)return;const hd=P.hdg*D,fx=Math.sin(hd),fz=-Math.cos(hd),rx=-fz,rz=fx;
   for(const [f,r] of[[120,-110],[120,110],[-180,0]]){const x=C.x+fx*f+rx*r,z=C.z+fz*f+rz*r;this.add('MPDR',1,x,z,P.hdg+180);}MP.nU=-1;};}
// campaign: teams at every airfield and along the front
function add4(st){if(st.ad4)return;st.ad4=1;let id=st.ad.reduce((m,a)=>Math.max(m,a.id),0)+1;
  for(const b of st.bases){const d=cbDef(b.id);for(let i=0;i<2;i++)st.ad.push({id:id++,k:'MANP',s:b.side,x:d.x+(i?-1:1)*rr(450,900),z:d.z+(i?-1:1)*rr(900,1600),hd:b.side?180:0,al:[1],b:b.id});}
  for(const s of[1,0])for(const x0 of[-75000,-35000,5000,45000,80000]){const x=x0+rr(-6000,6000),fz=CAMP.frontZ(x);st.ad.push({id:id++,k:'MANP',s,x,z:fz+(s?-1:1)*rr(1500,3200),hd:s?180:0,al:[1],fr:1});}}
{const _mk=CAMP.mkAD;CAMP.mkAD=function(a){if(a.k!=='MANP')return _mk.call(this,a);const g=GND.add(a.s?'MPDR':'MPDB',a.s,a.x,a.z,a.hd);g.ad=[a.id,0];if(!a.al[0])this.wreck(g,0);this.adPhys.set(a.id,[g]);a.mv=0;MP.nU=-1;};
 const _pa=CAMP.placeAD;CAMP.placeAD=function(first){_pa.apply(this,arguments);const st=this.st;let q=0;const hots=st.hot.slice();if(!hots.length)return;
   for(const a of st.ad){if(a.k!=='MANP'||!a.fr||!a.al[0])continue;if(first||Math.random()<.5){const i=hots[q++%hots.length];a.x=CFX[i]+rr(-5000,5000);a.z=this.frontZ(a.x)+(a.s?-1:1)*rr(1500,3200);a.mv=1;}}};
 const _ns=CAMP.newState;CAMP.newState=function(){const st=_ns.apply(this,arguments);add4(st);return st;};
 const _ld=CAMP.load;CAMP.load=function(){const ok=_ld.apply(this,arguments);if(ok&&this.st)add4(this.st);return ok;};}
window.MANPADS={MP,WP};})();
