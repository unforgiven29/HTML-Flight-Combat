/* =====================================================================================================================
   v249 — MiG-27K Kaira-23 television display.  The nose-mounted Kaira-23 head carries a laser ranger and a TV camera; its picture
   comes up on the big hooded display in the middle of the panel (the MiG-27 has no radar).  The tube is monochrome with a yellow
   filter, so the picture is rendered in the yellow phosphor colour with scan-line texture and a little noise.
     * line of sight: boresight, dropped a few degrees; the cursor (slew keys) moves it +/-12 deg in azimuth and, through the range
       cursor, in elevation; with a target locked (radar.lock) the head slews to it
     * field of view: wide 9 deg, medium 4.5 deg, narrow 2.5 deg (radar azimuth selector)
     * symbology: aiming cross, gate corners, laser range in km when the target is inside the ranger's 9 km, FOV label, LOCK
   Needs game.js.  The cockpit builder (cwpit.js) uses window.KAIRA.canvas as the screen.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof drawFCR==='undefined'||typeof THREE==='undefined')return;
const N=256,cv=document.createElement('canvas');cv.width=cv.height=N;cv._cwOwn=true;const c2=cv.getContext('2d');
const K={canvas:cv,t:0,rt:null,buf:null,img:null,cam:null,fov:[9,4.5,2.5]};window.KAIRA=K;
const isK=()=>!!player&&player.alive&&player.ac&&player.ac.tvScope;
function capture(P){
  if(!K.rt){K.rt=new THREE.WebGLRenderTarget(N,N);K.buf=new Uint8Array(N*N*4);K.img=c2.createImageData(N,N);K.cam=new THREE.PerspectiveCamera(9,1,4,90000);}
  const zi=clamp(radar.ai||0,0,2),L=radar.lock&&radar.lock.alive&&radar.mode==='STT'?radar.lock:null,qi=P.q.clone().invert();
  let dir;
  if(L)dir=L.pos.clone().sub(P.pos).normalize().applyQuaternion(qi);
  else{const az=clamp((radar.cur&&radar.cur.az||0),-12*D2R,12*D2R),el=-9*D2R+((radar.cur&&radar.cur.r!=null?radar.cur.r:.5)-.5)*-20*D2R;dir=new V3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el));}
  // gimbal limits: +/-12 deg azimuth, -20..+4 deg elevation (head under the nose)
  const az=clamp(Math.atan2(dir.x,-dir.z),-12*D2R,12*D2R),el=clamp(Math.asin(clamp(dir.y,-1,1)),-20*D2R,4*D2R);K.az=az;K.el=el;K.lock=!!L;
  const w=new V3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el)).applyQuaternion(P.q),cam=K.cam;
  cam.fov=K.fov[zi];K.zi=zi;cam.updateProjectionMatrix();cam.position.copy(P.pos).addScaledVector(P.fwd(new V3()),4.5).addScaledVector(P.up(new V3()),-.9);cam.up.set(0,1,0);cam.lookAt(cam.position.clone().add(w));
  const vis=P.mesh.visible;P.mesh.visible=false;const prev=renderer.getRenderTarget();renderer.setRenderTarget(K.rt);renderer.setClearColor(0xb8c4cc,1);renderer.clear(true,true,false);
  renderer.render(scene,cam);readRTAsync(K.rt,N,N,K.buf);renderer.setRenderTarget(prev);P.mesh.visible=vis;
  const b=K.buf,d=K.img.data,night=(typeof ENV!=='undefined'&&ENV.nightK)||0,gain=1-.8*night;
  for(let y=0;y<N;y++){const sr=(N-1-y)*N*4,dr=y*N*4,ln=y%3===0?.82:1;for(let x=0;x<N*4;x+=4){let g=(.3*b[sr+x]+.59*b[sr+x+1]+.11*b[sr+x+2])*gain;g=clamp((g-95)*1.9+75+(Math.random()-.5)*14,0,255)*ln;
    d[dr+x]=g;d[dr+x+1]=g*.9;d[dr+x+2]=g*.14;d[dr+x+3]=255;}}   // yellow filter: full red, ~90 % green, almost no blue
  c2.putImageData(K.img,0,0);
}
function symbols(P){
  const Y='#ffe34a',cx=N/2,cy=N/2;c2.save();c2.strokeStyle=c2.fillStyle=Y;c2.lineWidth=1.6;c2.shadowColor='rgba(255,220,60,.7)';c2.shadowBlur=3;
  // aiming cross with a gap
  [[-26,0,-8,0],[8,0,26,0],[0,-26,0,-8],[0,8,0,26]].forEach(([a,b,c,d])=>{c2.beginPath();c2.moveTo(cx+a,cy+b);c2.lineTo(cx+c,cy+d);c2.stroke();});
  // gate corners
  const g=K.lock?40:60;[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sy])=>{c2.beginPath();c2.moveTo(cx+sx*g,cy+sy*(g-14));c2.lineTo(cx+sx*g,cy+sy*g);c2.lineTo(cx+sx*(g-14),cy+sy*g);c2.stroke();});
  c2.font='700 13px "B612 Mono",monospace';c2.textBaseline='middle';c2.textAlign='left';c2.fillText('ТВ',8,14);
  c2.textAlign='right';c2.fillText(['ШУ','СУ','УУ'][K.zi||0],N-8,14);
  const L=K.lock?radar.lock:null,d=L?P.pos.distanceTo(L.pos):0;c2.textAlign='center';
  c2.fillText(L&&d<9000?(d/1000).toFixed(1)+' КМ':'-.-',cx,N-12);if(L)c2.fillText('ЗАХВАТ',cx,N-28);
  c2.textAlign='left';c2.font='700 11px "B612 Mono",monospace';c2.fillText('АЗ '+(K.az*R2D).toFixed(0).padStart(3,' '),8,N-12);c2.textAlign='right';c2.fillText('УМ '+(K.el*R2D).toFixed(0),N-8,N-12);
  c2.restore();
}
function tick(){
  const P=player,now=performance.now();if(!isK()||now-K.t<90)return;K.t=now;
  if(P.totalFuel<=0){c2.fillStyle='#050400';c2.fillRect(0,0,N,N);}
  else{try{capture(P);symbols(P);}catch(e){if(!K._w){K._w=1;console.warn('[kaira]',e);}}}
  if(cv._cwTex)cv._cwTex.needsUpdate=true;
}
{const _f=drawFCR;drawFCR=function(){tick();return _f.apply(this,arguments);};}
})();
