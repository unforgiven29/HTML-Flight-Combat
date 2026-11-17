/* =====================================================================================================================
   v367 — level of detail for the 3D world (spec v49 ch.04 tier A / B detail, Three.js large-campaign performance).
   The game already scales render resolution to hold the frame rate (gfx AUTO). On top of it, in world flight:
   * TREES (wtrees.js) are not drawn above 2,500 m above the ground (too small to see from there; the instanced
     forest is the largest draw in the region) and come back below 2,000 m (hysteresis).
   * GROUND UNITS beyond 30 km from the camera are not drawn (they keep fighting and are still radar / sensor targets;
     only their meshes are hidden), and come back inside 28 km.
   Counts of hidden objects are shown in the tools DEBUG view (?wwdebug).
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WF)return;
const L={trees:true,hidden:0};
function tick(){requestAnimationFrame(tick);if(!WF.on||typeof player==='undefined'||!player||typeof camera==='undefined')return;
  const agl=camera.position.y-groundAt(camera.position.x,camera.position.z);if(window.WTREE&&WTREE.grp){if(L.trees&&agl>2500)L.trees=false;else if(!L.trees&&agl<2000)L.trees=true;WTREE.grp.visible=L.trees;}
  if(typeof GND==='undefined')return;let h=0;const cx=camera.position.x,cz=camera.position.z;
  for(const u of GND.units){if(!u.mesh)continue;const d=Math.hypot(u.pos.x-cx,u.pos.z-cz);if(d>30000){if(u.mesh.visible){u.mesh.visible=false;u._lod=1;}if(u._lod)h++;}else if(d<28000&&u._lod){u.mesh.visible=true;u._lod=0;}}L.hidden=h;}
requestAnimationFrame(tick);
window.WLOD=L;
})();
