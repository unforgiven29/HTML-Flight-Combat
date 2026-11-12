"use strict";
/* =====================================================================================================================
   v259 — performance overlay. F3 toggles a small panel (top right): frame rate, frame time, the slowest frame in the last
   second, draw calls and triangles per frame (every render pass summed: world, cockpit, pod / radar videos), JS heap,
   render scale and graphics mode. Meant for tuning the GRAPHICS setting on slow machines (Chromebooks).
   Loaded after game.js.
   ===================================================================================================================== */
(function(){
if(typeof renderer==='undefined'){console.warn('[perfhud] renderer missing');return;}
const box=document.createElement('div');
box.id='perfhud';box.hidden=true;
box.style.cssText='position:fixed;top:6px;right:6px;z-index:60;pointer-events:none;font:600 12px/1.35 "B612 Mono",monospace;'+
  'color:#cfe8d4;background:rgba(8,12,10,.72);border:1px solid rgba(140,200,150,.35);border-radius:4px;padding:5px 8px;white-space:pre;';
document.body.appendChild(box);

// sum every render pass in a frame
let calls=0,tris=0;
const _r=renderer.render.bind(renderer);
renderer.render=function(s,c){const i=renderer.info.render,c0=i.calls,t0=i.triangles;const r=_r(s,c);
  if(i.calls>=c0){calls+=i.calls-c0;tris+=i.triangles-t0;}else{calls+=i.calls;tris+=i.triangles;}return r;};

let last=performance.now(),acc=0,n=0,worst=0,fc=0,ft=0;
const hist={calls:0,tris:0};
function tick(t){requestAnimationFrame(tick);
  const dt=t-last;last=t;
  if(!box.hidden){acc+=dt;n++;if(dt>worst)worst=dt;hist.calls=calls;hist.tris=tris;
    if(acc>=500){const avg=acc/n,m=performance.memory;
      box.textContent=
        `FPS   ${(1000/avg).toFixed(0).padStart(4)}\n`+
        `FRAME ${avg.toFixed(1).padStart(5)} ms  max ${worst.toFixed(0)}\n`+
        `CALLS ${String(hist.calls).padStart(5)}\n`+
        `TRIS  ${(hist.tris/1000).toFixed(0).padStart(4)} k\n`+
        (m?`HEAP  ${(m.usedJSHeapSize/1048576).toFixed(0).padStart(4)} MB\n`:'')+
        `SCALE ${(typeof gfx!=='undefined'?gfx.scale:1).toFixed(2)}  ${typeof gfx!=='undefined'?gfx.mode:''}`;
      acc=n=0;worst=0;}}
  calls=tris=0;}
requestAnimationFrame(tick);

addEventListener('keydown',e=>{if(e.code!=='F3'||e.repeat)return;e.preventDefault();box.hidden=!box.hidden;acc=n=worst=0;
  if(!box.hidden)box.textContent='measuring…';},true);

// list it in the quick reference
try{const k=document.querySelector('.keys');if(k&&!/Performance overlay/.test(k.textContent)){const d=document.createElement('div'),b=document.createElement('kbd');
  d.textContent='Performance overlay (FPS, draw calls)';b.textContent='F3';d.appendChild(b);k.appendChild(d);}}catch(e){}
console.info('[perfhud] F3: performance overlay');
})();
