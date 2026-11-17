/* =====================================================================================================================
   v374 — civilian airliners in world flight (spec v49 ch.06 civilian aircraft roster and visuals; ch.11 civil
   aviation, airspace management). Up to eight airliners at a time fly between the region's large and medium civil
   airports at cruise altitude (9-12 km) or climbing / descending near their airports, in their operators' plain
   liveries (a generic narrow-body or wide-body by route length; type names follow the country's fleet, natpol.js).
   In a world war they keep 150 km away from active fronts (airspace closed there, warfare.js / world2.js), so they are
   seen behind the lines and in neutral airspace.
   They are NEVER targets: not in the game's aircraft or ground-unit lists, never locked, never counted; the
   guardrails keep civilians out of every target list. You can see them and fly near them; a collision would be your
   own crash.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WF||!window.WGEO)return;
const G=WGEO,rn=Math.random,TR={list:[],t:0};
function mesh(wide){const g=new THREE.Group(),w=new THREE.MeshLambertMaterial({color:0xeef0f2}),b=new THREE.MeshLambertMaterial({color:[0x2a5aa8,0xb02a2a,0x2a8a5a,0x404040][(rn()*4)|0]}),L=wide?60:38,R=wide?3:2;
  const f=new THREE.Mesh(new THREE.CylinderGeometry(R,R,L,12),w);f.rotation.x=Math.PI/2;g.add(f);const n=new THREE.Mesh(new THREE.SphereGeometry(R,12,8),w);n.position.z=-L/2;g.add(n);
  const wg=new THREE.Mesh(new THREE.BoxGeometry(wide?60:34,.5,wide?9:6),w);wg.position.set(0,-R*.4,0);g.add(wg);const tl=new THREE.Mesh(new THREE.BoxGeometry(wide?20:12,.4,4),w);tl.position.z=L/2-2;g.add(tl);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.4,wide?10:7,6),b);fin.position.set(0,R+3,L/2-3);g.add(fin);for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,5,10),b);e.rotation.x=Math.PI/2;e.position.set(s*(wide?11:7),-R,-2);g.add(e);}
  g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});return g;}
function fronts(){const st=window.WWAR&&WWAR.st;if(!st)return[];const P=[];for(const f of st.fronts){if(f.cf)continue;for(const s of f.sec)P.push(s);}return P;}
function safe(lat,lon,F){for(const s of F)if(G.dist(lat,lon,s.lat,s.lon)<150e3)return false;return true;}
function spawn(){if(!WF.on||typeof player==='undefined'||!player)return;const F=fronts(),here=G.xz2ll(player.pos.x,player.pos.z);
  const A=G.airports.filter(a=>!a.mil&&(a.size==='L'||a.size==='M')&&G.dist(here.lat,here.lon,a.lat,a.lon)<400e3&&safe(a.lat,a.lon,F));if(A.length<2)return;
  for(let k=0;k<10;k++){const a=A[(rn()*A.length)|0],b=A[(rn()*A.length)|0];if(a===b)continue;const d=G.dist(a.lat,a.lon,b.lat,b.lon);if(d<120e3)continue;
    // along the route, a point near the player, and the line must avoid the fronts
    let ok=true;for(let t=0;t<=1;t+=.1)if(!safe(a.lat+(b.lat-a.lat)*t,a.lon+(b.lon-a.lon)*t,F)){ok=false;break;}if(!ok)continue;
    const wide=d>600e3,m=mesh(wide);scene.add(m);const pa=G.ll2xz(a.lat,a.lon),pb=G.ll2xz(b.lat,b.lon);const t0=.15+rn()*.7;
    TR.list.push({m,a:{lat:a.lat,lon:a.lon},b:{lat:b.lat,lon:b.lon},t:t0,d,spd:wide?250:230,alt:9000+rn()*3000,name:(a.city||a.name)+' → '+(b.city||b.name)});return;}}
function tick(dt){for(let i=TR.list.length-1;i>=0;i--){const r=TR.list[i];r.t+=r.spd*dt/r.d;if(r.t>=1||!WF.on){scene.remove(r.m);TR.list.splice(i,1);continue;}
  const lat=r.a.lat+(r.b.lat-r.a.lat)*r.t,lon=r.a.lon+(r.b.lon-r.a.lon)*r.t,p=G.ll2xz(lat,lon),edge=Math.min(r.t,1-r.t)*r.d,alt=Math.min(r.alt,groundAt(p.x,p.z)+300+edge*.06);
  const q=G.ll2xz(r.b.lat,r.b.lon);r.m.position.set(p.x,alt,p.z);r.m.rotation.set(0,Math.atan2(-(q.x-p.x),-(q.z-p.z)),0);
  const d=typeof player!=='undefined'&&player?r.m.position.distanceTo(player.pos):1e9;r.m.visible=d<60000;}}
let last=performance.now();
function loop(){requestAnimationFrame(loop);const n=performance.now(),dt=Math.min(.1,(n-last)/1000);last=n;if(!WF.on){for(const r of TR.list)scene.remove(r.m);TR.list.length=0;return;}
  tick(dt);TR.t-=dt;if(TR.t<=0&&TR.list.length<8){TR.t=20+rn()*40;try{spawn();}catch(e){}}}
requestAnimationFrame(loop);
window.TRAFFIC=TR;TR.spawn=spawn;
})();
