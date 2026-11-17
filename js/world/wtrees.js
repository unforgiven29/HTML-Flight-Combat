/* =====================================================================================================================
   v333 — forests on the Earth, with collisions (spec v49 ch.03: "forests with dense tree cover, variable tree sizes,
   clearings ... Trees should have collision, but use sensible collision proxies").
   * Generated per geographic cell of 0.01 deg (about 1 km), seeded by the cell's latitude / longitude, so the same
     forest stands in the same place every time (and after the floating origin moves).
   * Where: land 3 m above sea level and below the tree line (about 3,800 m in the tropics, falling to sea level near
     70 deg), not in the big desert belts, not inside towns' urban footprints, not near runways, not on steep slopes;
     density in patches (forests and clearings) from noise. Conifers at height and in the north, broadleaf elsewhere.
   * Drawn within 5 km of the camera (instanced: two meshes). No real forest map is used: placement is plausible, not
     surveyed.
   * Collision proxy: a vertical cylinder per tree (radius ~3 m, height 9-20 m). Checked for every aircraft below 40 m
     above the ground: at more than 40 m/s a tree strike destroys the aircraft ("TREE STRIKE"); slower, it damages it.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WF||!window.WGEO)return;
const G=WGEO,D=Math.PI/180,CELL=.01,R=5000,N=12000;
const DES=[[15,32,-17,35],[15,32,35,60],[25,37,55,75],[-32,-18,115,145],[-28,-17,12,25],[-28,-17,-72,-68],[36,46,75,110],[28,37,-118,-103]];
const T={grp:null,con:null,dec:null,cache:new Map(),last:null,near:[],hits:0};
function init(){if(T.grp)return;T.grp=new THREE.Group();const cg=new THREE.ConeGeometry(3,13,7);cg.translate(0,6.5,0);const dg=new THREE.IcosahedronGeometry(4,0);dg.scale(1,1.2,1);dg.translate(0,8,0);
  T.con=new THREE.InstancedMesh(cg,new THREE.MeshLambertMaterial({color:0x173d1c}),N);T.dec=new THREE.InstancedMesh(dg,new THREE.MeshLambertMaterial({color:0x2d5c1c}),N);
  for(const m of[T.con,T.dec]){m.frustumCulled=false;m.count=0;T.grp.add(m);}}
const treeLine=lat=>Math.max(0,3800-Math.max(0,Math.abs(lat)-20)*76);
// trees of one cell, in lat / lon (persistent across origin moves)
function cell(i,j){const k=i+','+j;let c=T.cache.get(k);if(c)return c;c=[];const lat0=i*CELL,lon0=j*CELL;
  if(DES.some(([a,b,o,p])=>lat0>=a&&lat0<=b&&lon0>=o&&lon0<=p)){T.cache.set(k,c);return c;}
  let s=((i*73856093)^(j*19349663))>>>0;const rn=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
  const tl=treeLine(lat0);
  for(let n=0;n<70;n++){const lat=lat0+rn()*CELL,lon=lon0+rn()*CELL,r1=rn(),r2=rn(),r3=rn();const p=G.ll2xz(lat,lon);
    const f=vnoise(lat*90+11.3,lon*90+3.1)*.5+.5;if(r1>Math.max(0,Math.min(1,(f-.42)*3)))continue;
    const h=groundAt(p.x,p.z);if(h<3||h>tl)continue;if(Math.abs(groundAt(p.x+25,p.z)-h)>14||Math.abs(groundAt(p.x,p.z+25)-h)>14)continue;
    c.push([lat,lon,.8+r2*.7,(h>1100||Math.abs(lat)>55||vnoise(lat*30,lon*30)>.15)?1:0,r3]);}
  if(T.cache.size>3000)T.cache.clear();T.cache.set(k,c);return c;}
function blocked(x,z){if(WF.nearRunway&&WF.nearRunway(x,z))return true;const U=WF.urbanPolys||[];for(const u of U){if(x<u.x0||x>u.x1||z<u.z0||z>u.z1)continue;let c=false;const X=u.xs,Z=u.zs;for(let i=0,j=X.length-1;i<X.length;j=i++)if((Z[i]>z)!==(Z[j]>z)&&x<(X[j]-X[i])*(z-Z[i])/(Z[j]-Z[i])+X[i])c=!c;if(c)return true;}return false;}
function rebuild(){const cp=camera.position,ll=G.xz2ll(cp.x,cp.z),di=Math.ceil(R/111000/CELL)+1,dj=Math.ceil(R/(111000*Math.max(.1,Math.cos(ll.lat*D)))/CELL)+1;
  const i0=Math.floor(ll.lat/CELL),j0=Math.floor(ll.lon/CELL),m=new THREE.Matrix4();let nc=0,nd=0;T.near=[];
  for(let i=i0-di;i<=i0+di;i++)for(let j=j0-dj;j<=j0+dj;j++)for(const t of cell(i,j)){const p=G.ll2xz(t[0],t[1]),dx=p.x-cp.x,dz=p.z-cp.z;if(dx*dx+dz*dz>R*R)continue;
    if(blocked(p.x,p.z))continue;const g=groundAt(p.x,p.z),sc=t[2],con=t[3];
    if(con){if(nc>=N)continue;m.makeScale(sc,sc*(.9+t[4]*.4),sc);m.setPosition(p.x,g-.5,p.z);T.con.setMatrixAt(nc++,m);}else{if(nd>=N)continue;m.makeScale(sc,sc,sc);m.setPosition(p.x,g-.5,p.z);T.dec.setMatrixAt(nd++,m);}
    T.near.push([p.x,p.z,g,3*sc,(con?13:10)*sc*(con?(.9+t[4]*.4):1)]);}
  T.con.count=nc;T.dec.count=nd;T.con.instanceMatrix.needsUpdate=T.dec.instanceMatrix.needsUpdate=true;T.last={x:cp.x,z:cp.z,o:G.o.lat+','+G.o.lon};}
// collision: a cylinder per tree, for every aircraft low over the ground
function collide(){const L=T.near;if(!L.length)return;
  for(const j of jets){if(!j.alive||j.onGnd||j.gnd)continue;const g=groundAt(j.pos.x,j.pos.z);if(j.pos.y-g>40)continue;
    for(const t of L){const dx=j.pos.x-t[0],dz=j.pos.z-t[1];if(dx*dx+dz*dz>(t[3]+4)**2)continue;if(j.pos.y>t[2]+t[4])continue;
      T.hits++;const v=j.vel.length();if(v>40)j.kill('TREE STRIKE',null);else{j.damage(25,null);j.vel.multiplyScalar(.6);}if(j===player)flash(v>40?'TREE STRIKE':'TREES · DAMAGE',2000);break;}}}
function loop(){requestAnimationFrame(loop);if(!WF.on){if(T.grp&&T.grp.parent)scene.remove(T.grp);return;}init();if(!T.grp.parent)scene.add(T.grp);
  const cp=camera.position,ok=T.last&&T.last.o===G.o.lat+','+G.o.lon&&Math.hypot(cp.x-T.last.x,cp.z-T.last.z)<700;if(!ok)rebuild();if(game.active&&!game.paused)collide();}
requestAnimationFrame(loop);
window.WTREE=T;WTREE.rebuild=()=>{init();rebuild();};WTREE.collide=collide;WTREE.cell=cell;
})();
