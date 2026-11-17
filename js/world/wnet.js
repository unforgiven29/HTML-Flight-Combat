/* =====================================================================================================================
   v336 — roads, rivers and bridges on the Earth (spec v49 ch.03 terrain and map features; ch.11 transport networks:
   "a damaged bridge is one infrastructure asset ... affects road capacity, military and civilian routing ...").
   * Data: Natural Earth 1:10m roads (major and secondary highways) and rivers, in the regional tiles. Generalised:
     minor roads and small rivers are not in the data.
   * Drawn in the flight region as ribbons that follow the terrain (sampled every ~250 m): rivers as water (width by
     the river's size class), highways in asphalt grey (two widths).
   * Bridges: wherever a highway crosses a river in the region, a bridge stands (deck and piers). In a country at war
     it is a ground target (GND kind BRIDGE). Destroying one: that country loses transport capacity, and if it is
     within 150 km of a front the country's units on that front lose supply (front power x0.85 per bridge, at most
     x0.6) until it is repaired (about ten war days; events). Destroyed bridges stay destroyed until repaired.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WF||!window.WGEO)return;
const G=WGEO,SZ=170000,L=SZ/2-1500;
const NET={grp:null,bridges:[],roads:0,rivers:0};
const wMat=new THREE.MeshLambertMaterial({color:0x2c5a74,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
const rMat=new THREE.MeshLambertMaterial({color:0x4a4c4e,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
// a ribbon along a polyline (local metres), draped on the ground
function ribbon(pts,w,lift,P,I){for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<1)continue;const n=Math.max(1,Math.ceil(d/250)),nx=-dz/d*w/2,nz=dx/d*w/2;
  for(let k=0;k<n;k++){const t0=k/n,t1=(k+1)/n,x0=a.x+dx*t0,z0=a.z+dz*t0,x1=a.x+dx*t1,z1=a.z+dz*t1,y0=groundAt(x0,z0)+lift,y1=groundAt(x1,z1)+lift,o=P.length/3;
    P.push(x0+nx,y0,z0+nz,x0-nx,y0,z0-nz,x1+nx,y1,z1+nz,x1-nx,y1,z1-nz);I.push(o,o+2,o+1,o+1,o+2,o+3);}}}
function mesh(P,I,mat){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.frustumCulled=false;return m;}
const inside=p=>Math.abs(p.x)<L&&Math.abs(p.z)<L;
function polylines(key){const out=[];if(!WF.cells)return out;for(const[k,c]of WF.cells){const R=c[key]||[];for(const r of R){const pts=[];for(let i=1;i<r.length;i+=2){const p=G.ll2xz(r[i+1]/1000,r[i]/1000);pts.push(p);}
    if(pts.some(inside))out.push({cls:r[0],pts});}}return out;}
function segX(a,b,c,d){const r1x=b.x-a.x,r1z=b.z-a.z,r2x=d.x-c.x,r2z=d.z-c.z,den=r1x*r2z-r1z*r2x;if(Math.abs(den)<1e-6)return null;
  const t=((c.x-a.x)*r2z-(c.z-a.z)*r2x)/den,u=((c.x-a.x)*r1z-(c.z-a.z)*r1x)/den;return t>=0&&t<=1&&u>=0&&u<=1?{x:a.x+r1x*t,z:a.z+r1z*t,hd:(Math.atan2(r1x,-r1z)*180/Math.PI+360)%360}:null;}
function build(){if(NET.grp){scene.remove(NET.grp);NET.grp.traverse(o=>o.geometry&&o.geometry.dispose());}const g=new THREE.Group();NET.grp=g;NET.bridges=[];
  const RV=polylines('v'),RD=polylines('r');NET.rivers=RV.length;NET.roads=RD.length;
  {const P=[],I=[];for(const r of RV)ribbon(r.pts,r.cls===3?150:r.cls===2?80:40,.6,P,I);if(P.length)g.add(mesh(P,I,wMat));}
  {const P=[],I=[];for(const r of RD)ribbon(r.pts,r.cls===1?16:10,.9,P,I);if(P.length)g.add(mesh(P,I,rMat));}
  // bridges where highways cross rivers
  const bb=o=>{if(o.bb)return o.bb;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of o.pts){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);z0=Math.min(z0,p.z);z1=Math.max(z1,p.z);}return o.bb=[x0,x1,z0,z1];};
  for(const rd of RD)for(const rv of RV){const a=bb(rd),b=bb(rv);if(a[1]<b[0]||b[1]<a[0]||a[3]<b[2]||b[3]<a[2])continue;   // only pieces whose boxes overlap
    for(let i=0;i<rd.pts.length-1;i++)for(let j=0;j<rv.pts.length-1;j++){const x=segX(rd.pts[i],rd.pts[i+1],rv.pts[j],rv.pts[j+1]);if(!x||!inside(x))continue;
      if(NET.bridges.some(b=>Math.hypot(b.x-x.x,b.z-x.z)<800))continue;NET.bridges.push({x:x.x,z:x.z,hd:x.hd,span:rv.cls===3?220:rv.cls===2?130:70,road:rd.cls});}}
  scene.add(g);NET.ready=true;}
// region rebuilds go through WF.start / WF.rebase (worldflight.js calls its build() internally)
for(const k of['start','rebase']){const _f=WF[k];WF[k]=async function(){const r=await _f.apply(this,arguments);try{if(WF.on){build();if(NET.after)NET.after();}}catch(e){console.warn('[wnet]',e);}return r;};}
{const _l=WF.leave;WF.leave=function(){if(NET.grp){scene.remove(NET.grp);NET.grp=null;}NET.bridges=[];return _l.apply(this,arguments);};}
window.WNET=NET;NET.build=build;
})();
