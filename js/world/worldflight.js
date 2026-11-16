/* =====================================================================================================================
   v326 — WORLD FLIGHT (world campaign, stage 1): fly anywhere on Earth. Real terrain and coastlines (streamed elevation),
   oceans, every large / medium airport and paved field of 1,500 m+ with its runways at their real positions, lengths and
   headings, and cities and towns built where they are, sized by population. Free flight; the war comes in later stages.

   * Start: the WORLD MAP card on QUICK FLIGHT (worldmap.js) picks an airport and runway; WF.start(airport, runway, end).
   * Terrain: the existing 170 km mesh and collision grid (terrGeo / THF in game.js), fed by WGEO.height through MAPMODE.fn,
     with runways flattened into it so the wheels sit on what is drawn.
   * Floating origin: when the aircraft is 35 km from the origin, the tiles ahead are fetched, then the origin moves to the
     aircraft and everything in the scene shifts by the same amount in one step (jets, missiles, decoys, bullets, ground units,
     smoke / fire particles, parachutes, clouds, camera). The terrain, runways and towns are rebuilt around the new origin.
   * Leaving (any other mode, the campaign) restores the old theatre terrain, airfield and palette.
   Gameplay-level visual detail: building footprints and heights are generated, not surveyed.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WGEO||typeof terrGeo!=='function'){console.warn('[world] geo missing');return;}
const G=WGEO,D=Math.PI/180,SZ=170000,REB=35000,REG=95000;
const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const WF={on:false,ap:null,rw:null,rwys:[],grp:null,busy:false,reb:0,AF0:null,rebT:0,lastQ:''};

/* ------------------------------------------------------------------ climate palette by latitude and the big deserts */
const DES=[[15,32,-17,35],[15,32,35,60],[25,37,55,75],[-32,-18,115,145],[-28,-17,12,25],[-28,-17,-72,-68],[36,46,75,110],[28,37,-118,-103]];
function pal(lat,lon){const a=Math.abs(lat),des=DES.some(([l0,l1,o0,o1])=>lat>=l0&&lat<=l1&&lon>=o0&&lon<=o1);
  const sn=a>72?0:a>62?900:a>50?2300:a>35?3200:a>20?4600:4900,win=a>72?.95:a>64?.55:a>58?.2:0;
  let A=a<15?[.20,.38,.15]:a<40?[.30,.42,.20]:a<58?[.29,.41,.21]:[.30,.36,.25],B=a<15?[.30,.36,.22]:[.37,.37,.27];
  if(des){A=[.66,.55,.38];B=[.58,.47,.34];}
  // the stock palette paints everything under 22 m as beach; here the low ground keeps its colour and tintUrban adds a thin beach
  return{p:{a:A,b:B,sand:des?[.70,.60,.42]:A,sn,win},snowA:sn,win,fld:des?[1.25,1.0,.75]:[1,1,1],des};}

/* ------------------------------------------------------------------ height with runways pressed flat */
function hfn(x,z){let h=G.height(x,z);if(!WF.rwys.length)return h;
  for(const r of WF.rwys){const dx=x-r.cx,dz=z-r.cz;if(Math.abs(dx)>r.hl+2000&&Math.abs(dz)>r.hl+2000)continue;
    const al=dx*r.ux+dz*r.uz,ac=-dx*r.uz+dz*r.ux,ox=Math.max(0,Math.abs(al)-r.hl-600),oz=Math.max(0,Math.abs(ac)-r.hw-600),o=Math.hypot(ox,oz);
    if(o<900){const w=1-sstep(0,900,o);h+=(r.e-h)*w;}}
  return h;}
function grass(x,z){let m=0;for(const r of WF.rwys){const dx=x-r.cx,dz=z-r.cz;if(Math.abs(dx)>r.hl+1500&&Math.abs(dz)>r.hl+1500)continue;
  const al=dx*r.ux+dz*r.uz,ac=-dx*r.uz+dz*r.ux,o=Math.hypot(Math.max(0,Math.abs(al)-r.hl-150),Math.max(0,Math.abs(ac)-r.hw-180));m=Math.max(m,1-sstep(0,500,o));}return m;}

/* ------------------------------------------------------------------ the region around the origin */
function collectRunways(){const out=[],o=G.o;
  for(const a of G.near(G.airports,o.lat,o.lon,REG))for(const r of a.runways){if(r.len_m<600)continue;const g=G.runway(a,r);
    if(Math.abs(g.cx)>SZ/2-3000||Math.abs(g.cz)>SZ/2-3000)continue;
    // runway elevation: the terrain along its centre line (consistent with the ground around it), never below 2 m
    let s=0;for(let k=-2;k<=2;k++){s+=G.height(g.cx+g.ux*g.hl*k/2.2,g.cz+g.uz*g.hl*k/2.2);}g.e=Math.max(2,s/5);g.ap=a;out.push(g);}
  return out;}
function runwayMesh(r){const tex=typeof cmpRwyTex==='function'?cmpRwyTex():null;
  const m=new THREE.MeshLambertMaterial(Object.assign({color:r.paved?0xffffff:0x8f8a6c,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2},r.paved&&tex?{map:tex}:{}));
  const p=new THREE.Mesh(new THREE.PlaneGeometry(r.hw*2,r.hl*2),m);p.rotation.order='YXZ';p.rotation.y=-r.hdg*D;p.rotation.x=-Math.PI/2;p.position.set(r.cx,r.e+.15,r.cz);return p;}
function shoulder(r){const p=new THREE.Mesh(new THREE.PlaneGeometry(r.hw*2+30,r.hl*2+120),new THREE.MeshLambertMaterial({color:0x5b5f5e,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
  p.rotation.order='YXZ';p.rotation.y=-r.hdg*D;p.rotation.x=-Math.PI/2;p.position.set(r.cx,r.e+.08,r.cz);return p;}
// ---- towns (GeoNames 1,000+) and urban footprints (Natural Earth), from 10-degree cells loaded on demand
const CELLS=new Map();
async function loadCells(lat,lon){const ks=new Set();for(const a of[-1.2,0,1.2])for(const b of[-1.6,0,1.6])ks.add(Math.floor((lat+a)/10)*10+'_'+Math.floor((lon+b)/10)*10);
  await Promise.all([...ks].map(async k=>{if(CELLS.has(k))return;try{const r=await fetch('assets/world/tiles/'+k+'.json');CELLS.set(k,r.ok?await r.json():{t:[],u:[],q:1000});}catch(e){/* offline: Natural Earth places stay */}}));}
function regionPlaces(){const o=G.o,T=[],U=[],L=SZ/2-1500;
  for(const[k,c]of CELLS){const[la,lo]=k.split('_').map(Number);if(o.lat<la-2||o.lat>la+12||Math.abs(((o.lon-lo-5+540)%360)-180)>7)continue;
    for(const t of c.t){const p=G.ll2xz(t[1],t[2]);if(Math.abs(p.x)<L&&Math.abs(p.z)<L)T.push({x:p.x,z:p.z,pop:t[3],name:t[0]});}
    for(const u of c.u){const xs=new Float64Array(u.length/2),zs=new Float64Array(u.length/2);let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
      for(let i=0;i<u.length;i+=2){const p=G.ll2xz(u[i+1]/c.q,u[i]/c.q);xs[i/2]=p.x;zs[i/2]=p.z;x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);z0=Math.min(z0,p.z);z1=Math.max(z1,p.z);}
      if(x1<-L||x0>L||z1<-L||z0>L)continue;let a=0;for(let i=0,j=xs.length-1;i<xs.length;j=i++)a+=(xs[j]+xs[i])*(zs[j]-zs[i]);U.push({xs,zs,x0,x1,z0,z1,area:Math.abs(a/2)});}}
  if(!T.length)for(const p of G.near(G.places,o.lat,o.lon,REG)){const c=G.ll2xz(p.lat,p.lon);if(Math.abs(c.x)<L&&Math.abs(c.z)<L)T.push({x:c.x,z:c.z,pop:Math.max(3000,p.pop),name:p.name});}
  T.sort((a,b)=>b.pop-a.pop);return{T,U};}
const pip=(u,x,z)=>{if(x<u.x0||x>u.x1||z<u.z0||z>u.z1)return false;let c=false;const X=u.xs,Z=u.zs;for(let i=0,j=X.length-1;i<X.length;j=i++)if((Z[i]>z)!==(Z[j]>z)&&x<(X[j]-X[i])*(z-Z[i])/(Z[j]-Z[i])+X[i])c=!c;return c;};
const inUrban=(U,x,z)=>{for(const u of U)if(pip(u,x,z))return true;return false;};
// grey the ground inside urban footprints (the terrain mesh is ~390 m per cell, so a city reads as a city from altitude)
function tintUrban(g,U){const p=g.attributes.position,c=g.attributes.color.array;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i);if(y>0&&y<4){c[i*3]+=(.80-c[i*3])*.7;c[i*3+1]+=(.75-c[i*3+1])*.7;c[i*3+2]+=(.58-c[i*3+2])*.7;}if(!inUrban(U,x,z)||p.getY(i)<=1)continue;const k=.86+.1*vnoise(x/900,z/900);
    c[i*3]+=(.47-c[i*3])*k;c[i*3+1]+=(.46-c[i*3+1])*k;c[i*3+2]+=(.44-c[i*3+2])*k;}g.attributes.color.needsUpdate=true;}
// buildings: urban footprints filled (density shared out by area), a cluster at every town (size from population),
// high-rise cores at cities over 500,000. Footprints and heights are generated, positions and extents are real.
function towns(R){const{T,U}=R,CAP=30000;let seed=Math.floor(Math.abs(G.o.lat*1e3+G.o.lon*7e3))%2147483646+1;const rn=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const geo=new THREE.BoxGeometry(1,1,1);geo.translate(0,.5,0);const im=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({color:0xffffff}),CAP);
  const M=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),v=new THREE.Vector3(),col=new THREE.Color(),Y=new THREE.Vector3(0,1,0);let i=0;
  const put=(x,z,w,d,h,ang,tall)=>{if(i>=CAP)return;const g=groundAt(x,z);if(g<=1.5||nearRunway(x,z))return;q.setFromAxisAngle(Y,ang);s.set(w,h,d);v.set(x,g-1,z);M.compose(v,q,s);im.setMatrixAt(i,M);
    const sh=.55+rn()*.3;if(tall)col.setRGB(.42+rn()*.2,.5+rn()*.15,.58+rn()*.12);else col.setRGB(sh*(.95+rn()*.1),sh*(.92+rn()*.08),sh*(.86+rn()*.1));im.setColorAt(i,col);i++;};
  // 1) high-rise cores
  for(const t of T){if(t.pop<5e5)break;const n=Math.min(260,Math.round(Math.pow(t.pop,.5)/12)),r=1.2*Math.pow(t.pop,.45);
    for(let b=0;b<n;b++){const rr=r*Math.sqrt(rn()),a=rn()*6.283;put(t.x+Math.cos(a)*rr,t.z+Math.sin(a)*rr,18+rn()*30,18+rn()*30,40+rn()*(t.pop>4e6?220:120)*(1-rr/r*.6),rn()*.4,1);}}
  // 2) towns: a cluster each, biggest first, until 55 % of the budget
  for(const t of T){if(i>CAP*.55)break;const n=Math.min(420,Math.max(6,Math.round(Math.sqrt(t.pop)/3))),r=6*Math.pow(t.pop,.4),ang=rn()*6.28;
    for(let b=0;b<n;b++){const rr=r*Math.pow(rn(),.7),a=rn()*6.283,cen=1-rr/r;put(t.x+Math.cos(a)*rr,t.z+Math.sin(a)*rr,9+rn()*16,9+rn()*14,5+rn()*(cen>.6?16:8),ang+(rn()<.7?0:Math.PI/2),0);}}
  // 3) the rest of the urban footprints, shared out by area
  const tot=U.reduce((m,u)=>m+u.area,0),left=CAP-i;
  if(tot>0)for(const u of U){let n=Math.round(left*u.area/tot),tries=n*3;while(n>0&&tries-->0){const x=u.x0+rn()*(u.x1-u.x0),z=u.z0+rn()*(u.z1-u.z0);if(!pip(u,x,z))continue;put(x,z,10+rn()*22,10+rn()*18,5+rn()*12,rn()<.6?0:rn()*3.14,0);n--;}}
  im.count=i;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.frustumCulled=false;return{mesh:im,list:T};}
function nearRunway(x,z){for(const r of WF.rwys){const dx=x-r.cx,dz=z-r.cz;const al=dx*r.ux+dz*r.uz,ac=-dx*r.uz+dz*r.ux;if(Math.abs(al)<r.hl+250&&Math.abs(ac)<r.hw+220)return true;}return false;}

function build(){const t0=performance.now(),o=G.o,P=pal(o.lat,o.lon);
  if(WF.grp){scene.remove(WF.grp);WF.grp.traverse(c=>{if(c.geometry)c.geometry.dispose();if(c.material&&c.material!==WF.keepMat)c.material.dispose&&c.material.dispose();});}
  WF.rwys=collectRunways();
  MAPMODE.fn=hfn;const old=TERRAIN.geometry,RP=regionPlaces();TERRAIN.geometry=terrGeo(SZ,hfn,P.p,grass);old.dispose();tintUrban(TERRAIN.geometry,RP.U);WF.urban=RP.U.length;
  TERRU.uSnowA.value=P.snowA;TERRU.uWin.value=P.win;TERRU.uFld.value.setRGB(P.fld[0],P.fld[1],P.fld[2]);ENV.snow=P.win>.4;
  const g=new THREE.Group();for(const r of WF.rwys){g.add(shoulder(r));g.add(runwayMesh(r));}
  const T=towns(RP);g.add(T.mesh);WF.towns=T.list;WF.bld=T.mesh.count;
  g.traverse(c=>{if(c.isMesh){c.castShadow=false;c.receiveShadow=false;}});scene.add(g);WF.grp=g;
  WF.buildMs=Math.round(performance.now()-t0);WF.lastQ=G.quality(o.lat,o.lon,SZ/2);}

/* ------------------------------------------------------------------ paved surfaces for the wheels */
{const _op=onPaved;onPaved=function(x,z){if(!WF.on)return _op(x,z);
  for(const r of WF.rwys){const dx=x-r.cx,dz=z-r.cz,al=dx*r.ux+dz*r.uz,ac=-dx*r.uz+dz*r.ux;if(Math.abs(al)<=r.hl+40&&Math.abs(ac)<=r.hw+12)return true;}return false;};}

/* ------------------------------------------------------------------ floating origin */
function shift(dx,dz){const V=p=>{if(p){p.x-=dx;p.z-=dz;}};
  for(const j of jets){V(j.pos);if(j.mesh)V(j.mesh.position);const ai=j.ai;if(ai){if(ai.route)for(const w of ai.route)V(w);V(ai.home);V(ai.tp);}}
  for(const m of missiles){V(m.pos);if(m.mesh)V(m.mesh.position);V(m.aim);V(m.pip);}
  for(const d of decoys){V(d.pos);if(d.mesh)V(d.mesh.position);}
  for(const b of bullets){V(b.p);V(b.q);}
  if(typeof GND!=='undefined'){for(const u of GND.units){V(u.pos);if(u.mesh)V(u.mesh.position);}for(const b of GND.bombs||[]){V(b.pos||b.p);if(b.mesh)V(b.mesh.position);}for(const b of GND.rkts||[]){V(b.pos||b.p);if(b.mesh)V(b.mesh.position);}V(GND.center);}
  for(const P of [smoke,glow]){const a=P.p;for(let i=0;i<a.length;i+=3){a[i]-=dx;a[i+2]-=dz;}const at=P.g.attributes.position;at.updateRange.offset=0;at.updateRange.count=-1;at.needsUpdate=true;}
  if(window.PILOTS)for(const p of PILOTS)V(p.pos);
  if(window.CLOUDPTS){const c=CLOUDPTS.position,per=144000*(CLOUDPTS.scale.x||1),w=v=>((v%per)+per*1.5)%per-per/2;c.x=w(c.x-dx);c.z=w(c.z-dz);}
  V(camera.position);if(typeof SNS!=='undefined'&&SNS.spi&&SNS.spi.isVector3)V(SNS.spi);
  if(typeof radar!=='undefined'&&radar.tracks)for(const t of radar.tracks.values()){if(t&&t.p&&t.p.isVector3)V(t.p);if(t&&t.pos&&t.pos.isVector3)V(t.pos);}}
async function rebase(){if(WF.busy||!WF.on||!player)return;WF.busy=true;const gen=WF.gen;
  try{const P=player,ahead=Math.min(60,REB/Math.max(50,P.vel.length())),lx=P.pos.x+P.vel.x*ahead*.5,lz=P.pos.z+P.vel.z*ahead*.5,ll=G.xz2ll(lx,lz);
    await Promise.all([G.prefetch(ll.lat,ll.lon,SZ/2+20000,null,15000),loadCells(ll.lat,ll.lon)]);
    if(!WF.on||!player||gen!==WF.gen)return;const dx=Math.round(player.pos.x),dz=Math.round(player.pos.z),nl=G.xz2ll(dx,dz);
    shift(dx,dz);G.setOrigin(nl.lat,nl.lon);build();WF.reb++;}
  catch(e){console.warn('[world] rebase',e);}finally{WF.busy=false;}}
function loop(){requestAnimationFrame(loop);if(!WF.on||!game.active||!player)return;
  const d=Math.max(Math.abs(player.pos.x),Math.abs(player.pos.z));if(d>REB&&!WF.busy)rebase();
  if(d>SZ/2-8000&&WF.busy&&!WF.warned){WF.warned=1;flash('TERRAIN LOADING · SLOW DOWN OR WAIT',2500);}if(d<REB)WF.warned=0;}
requestAnimationFrame(loop);

/* ------------------------------------------------------------------ enter / leave */
function enter(){if(WF.on)return;WF.on=true;WF.AF0=Object.assign({},AF);AF.x=9e8;AF.z=9e8;if(typeof AFX!=='undefined'&&AFX.group)AFX.group.visible=false;}
function leave(){if(!WF.on)return;WF.on=false;if(WF.grp){scene.remove(WF.grp);WF.grp=null;}WF.rwys=[];
  MAPMODE.fn=null;const old=TERRAIN.geometry;TERRAIN.geometry=terrGeo(170000,terrainH,null,null);old.dispose();
  Object.assign(AF,WF.AF0||{});if(typeof AFX!=='undefined'&&AFX.group)AFX.group.visible=true;
  TERRU.uSnowA.value=1800;TERRU.uWin.value=0;TERRU.uFld.value.setRGB(1,1,1);ENV.snow=false;if(window.CLOUDPTS)CLOUDPTS.position.set(0,0,0);}
// any other mode (quick flight, campaign, multiplayer) leaves the world first
{const _s=start;start=async function(scen){if(scen!=='WORLD')leave();return _s.apply(this,arguments);};}
if(typeof CAMP!=='undefined'){const _ss=CAMP.startSortie;CAMP.startSortie=async function(){leave();return _ss.apply(this,arguments);};}

WF.start=async function(ap,rwIdx,end){if(startBusy)return;
  const note=t=>{const el=document.getElementById('wmStatus');if(el)el.textContent=t;};
  WF.gen=(WF.gen||0)+1;WF.busy=true;game.active=false;
  try{startBusy=true;await G.loadData();const rw=ap.runways[rwIdx|0]||ap.runways[0];
    note('LOADING TERRAIN AROUND '+(ap.iata||ap.ident)+' …');G.setOrigin(ap.lat,ap.lon);
    const[res]=await Promise.all([G.prefetch(ap.lat,ap.lon,SZ/2,(d,n)=>note('LOADING TERRAIN '+d+' / '+n),30000),loadCells(ap.lat,ap.lon)]);
    sfx.init();sfx.mute(false);if(net.on)await net.leave();
    clearWorld();WING.list.length=0;rio.reset();game.scen='WORLD';game.stats={shots:0,hits:0,t0:performance.now()};game.over=false;game.endT=0;game.paused=false;game.result='';game.respawnT=0;game.total=0;
    enter();build();WF.ap=ap;WF.reb=0;
    const r=WF.rwys.find(q=>q.ap===ap&&q.id===(rw.le_id+'/'+rw.he_id))||WF.rwys.find(q=>q.ap===ap)||null;
    makePlayer(game.ac,game.era,game.era);const P=player;
    if(r){const back=end==='he'?-1:1,hd=end==='he'?(r.hdg+180)%360:r.hdg,sx=r.cx-r.ux*back*(r.hl-150),sz=r.cz-r.uz*back*(r.hl-150);
      P.spawn(sx,r.e+GH,sz,hd,0);P.thr=0;P.n=.12;P.gearPos=1;P.gearCmd=1;P.onGnd=true;P.gHdg=hd;P.gPitch=0;sys.v.gear=1;sys.v.gearT=0;sys.mig.gear=0;P._gc=undefined;P.rotCall=false;
      buildGearMesh(P);gearVis(P);view='cockpit';P.flapCmd=P.flapPos=P.flapTO();P._fsw=undefined;}
    else{const c=G.ll2xz(ap.lat,ap.lon);P.spawn(c.x,Math.max(1500,groundAt(c.x,c.z)+1200),c.z,0,220);P.thr=.8;sys.v.gear=0;}
    game.wsel=defaultWeapon('ir');ENV.setup();ENV.step(0,true);P.fwd(P.prevF);
    game.active=game.running=true;$('#menu').hidden=true;$('#touch').hidden=!isTouch;updateRepeaters();renderScore();
    const nm=(ap.iata||ap.ident)+' · '+ap.name;flash(nm.toUpperCase()+(r?' · RWY '+(end==='he'?r.id.split('/')[1]:r.id.split('/')[0]):'')+' · '+WF.lastQ,4500);
    if(res.have<res.need)setTimeout(()=>flash('SOME TERRAIN TILES DID NOT LOAD · COARSE GROUND THERE',3000),4600);note('');}
  catch(e){console.error('[world] start',e);flash('WORLD FLIGHT FAILED · '+(e&&e.message||e),4000);leave();$('#menu').hidden=false;}
  finally{startBusy=false;WF.busy=false;}};
WF.leave=leave;WF.build=build;WF.shift=shift;WF.rebase=rebase;WF.hfn=hfn;
window.WF=WF;
})();
