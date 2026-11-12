/* v319: missile camera seeker views.
   Imaging-IR weapons (AIM-9X, IRIS-T, ASRAAM, Python 5, PL-10, A-Darter, AGM-65G and the like) get a window with the picture the seeker head is looking at right now:
   a narrow-field render from the nose along the seeker boresight (the head slews toward the track inside its gimbal limit), white-hot, with the track gate and the gimbal margin.
   Active-radar weapons (AIM-120, R-77, AIM-54, MICA-EM ...) get the F7 treatment: the seeker beam drawn as a cone in the world from the missile along its boresight, with
   pulses out to the target and echoes back, plus a B-scope panel (azimuth against range, the gimbal limit, the target in or out of the beam, seeker state).
   Needs game.js (drawMslCam, mcam, readRTAsync, renderer, scene, camera). */
(()=>{if(typeof drawMslCam!=='function'||typeof mcam==='undefined'||typeof readRTAsync!=='function'){console.warn('[mcamseek] engine missing');return;}
const IIR=/^(AIM-9X|IRIS-T$|ASRAAM|MICA[ -]IR|Python[ -]?5|AAM-5|R-74M2?)/,D=Math.PI/180,TWO=Math.PI*2,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
// v320: seeker video only for the imaging-IR dogfight missiles: AIM-9X, IRIS-T, ASRAAM, MICA IR, Python 5, AAM-5, R-74M / R-74M2
const isIIR=m=>m&&m.def&&m.def.seek==='IR'&&IIR.test(m.type||'');
const isARH=m=>m&&m.def&&m.def.seek==='ARH';
const S={N:160,rt:null,buf:null,cv:null,ctx:null,img:null,cam:null,t:0,bs:new THREE.Vector3(0,0,-1),lim:false,off:0,tp:null,fov:5};
// the head looks at the track while it is inside the gimbal limit, otherwise it stays on the airframe axis
function boresight(m,out){const ax=m.vel.lengthSq()>1?m.vel.clone().normalize():new THREE.Vector3(0,0,-1),tg=m.track||m.target;out.copy(ax);S.lim=false;S.off=0;
  if(tg&&tg.pos&&tg.alive!==false){const to=tg.pos.clone().sub(m.pos).normalize(),a=Math.acos(cl(ax.dot(to),-1,1));S.off=a;const g=(m.def.gimbal||.5);
    if(a<=g)out.copy(to);else{S.lim=true;out.copy(ax).lerp(to,g/a).normalize();}}return out;}
function capture(m){const N=S.N;if(!S.rt){S.rt=new THREE.WebGLRenderTarget(N,N);S.buf=new Uint8Array(N*N*4);S.cv=document.createElement('canvas');S.cv.width=S.cv.height=N;S.ctx=S.cv.getContext('2d');S.img=S.ctx.createImageData(N,N);S.cam=new THREE.PerspectiveCamera(S.fov,1,3,120000);}
  const cam=S.cam,d=boresight(m,S.bs);cam.position.copy(m.pos).addScaledVector(d,1.2);cam.up.set(0,1,0);cam.lookAt(cam.position.clone().add(d));cam.updateMatrixWorld(true);
  const vis=m.mesh&&m.mesh.visible;if(m.mesh)m.mesh.visible=false;const prev=renderer.getRenderTarget();renderer.setRenderTarget(S.rt);renderer.setClearColor(0x6a7680,1);renderer.clear(true,true,false);
  renderer.render(scene,cam);readRTAsync(S.rt,N,N,S.buf);renderer.setRenderTarget(prev);if(m.mesh)m.mesh.visible=vis;
  const b=S.buf,o=S.img.data;for(let y=0;y<N;y++){const sr=(N-1-y)*N*4,dr=y*N*4;for(let x=0;x<N*4;x+=4){let g=.3*b[sr+x]+.59*b[sr+x+1]+.11*b[sr+x+2];g=cl((g-50)*1.7+40+(Math.random()-.5)*16,0,255);o[dr+x]=o[dr+x+1]=o[dr+x+2]=g;o[dr+x+3]=255;}}
  S.ctx.putImageData(S.img,0,0);const tg=m.track||m.target;S.tp=null;
  if(tg&&tg.pos){const p=tg.pos.clone().project(cam);if(p.z<1)S.tp={x:p.x,y:p.y};}}
function frame(g,txt,x,y,w,h,title,col){g.save();g.fillStyle='rgba(0,8,4,.72)';g.fillRect(x-6,y-22,w+12,h+30);g.strokeStyle=col;g.lineWidth=1.4;g.strokeRect(x,y,w,h);g.fillStyle=col;g.textAlign='left';g.fillText(title,x,y-10);g.restore();}
function drawIIR(m){const g=hx,fs=Math.round(clamp(Math.min(W,H)*.02,10,16)),sz=Math.round(clamp(Math.min(W,H)*.3,150,300)),x=W-sz-26,y=78,col='rgba(89,255,159,.95)';
  const now=performance.now();if(now-S.t>70){S.t=now;try{capture(m);}catch(e){if(!S.w){S.w=1;console.warn('[mcamseek] IIR video',e);}}}
  g.font=hfont(fs);frame(g,null,x,y,sz,sz,'SEEKER  '+(m.type||'')+'  IIR',col);
  if(S.cv){g.save();g.beginPath();g.rect(x,y,sz,sz);g.clip();g.imageSmoothingEnabled=true;g.drawImage(S.cv,x,y,sz,sz);
    g.strokeStyle='rgba(120,255,170,.55)';g.lineWidth=1;g.beginPath();g.moveTo(x+sz/2,y+sz/2-12);g.lineTo(x+sz/2,y+sz/2-4);g.moveTo(x+sz/2,y+sz/2+4);g.lineTo(x+sz/2,y+sz/2+12);g.moveTo(x+sz/2-12,y+sz/2);g.lineTo(x+sz/2-4,y+sz/2);g.moveTo(x+sz/2+4,y+sz/2);g.lineTo(x+sz/2+12,y+sz/2);g.stroke();
    if(S.tp&&Math.abs(S.tp.x)<1&&Math.abs(S.tp.y)<1){const px=x+(S.tp.x*.5+.5)*sz,py=y+(-S.tp.y*.5+.5)*sz,k=Math.max(10,sz*.07);g.strokeStyle=m.alive?'#ffd24a':'#888';g.lineWidth=1.6;
      g.beginPath();for(const[a,b]of[[-1,-1],[1,-1],[1,1],[-1,1]]){g.moveTo(px+a*k,py+b*k*.4);g.lineTo(px+a*k,py+b*k);g.lineTo(px+a*k*.4,py+b*k);}g.stroke();}
    g.restore();}
  g.fillStyle=col;g.textAlign='left';const tg=m.track||m.target,rng=tg&&tg.pos?(tg.pos.distanceTo(m.pos)/1000).toFixed(1)+' km':'--';
  g.fillText('FOV '+S.fov.toFixed(1)+'°  WHOT',x,y+sz+14);g.textAlign='right';g.fillStyle=S.lim?'#ff7a4a':col;g.fillText(S.lim?'GIMBAL LIMIT':'TRACK  '+(S.off/D).toFixed(0)+'° off axis',x+sz,y+sz+14);
  g.textAlign='left';g.fillStyle=col;g.fillText('RNG '+rng+(m.track&&m.track.isDecoy?'  DECOY':''),x,y+sz+14+fs*1.3);g.textAlign='left';}
/* ---- ARH: world cone like the F7 beam view, and a B-scope ---- */
let G=null,cone,edge,pts,pp,pc;const MAXP=24,_q=new THREE.Quaternion(),_z=new THREE.Vector3(0,0,-1),_b=new THREE.Vector3();
function build(){G=new THREE.Group();G.frustumCulled=false;G.renderOrder=40;const N=24,pos=[0,0,0],idx=[];for(let i=0;i<N;i++){const t=i/N*TWO;pos.push(Math.cos(t),Math.sin(t),-1);}for(let i=0;i<N;i++)idx.push(0,1+i,1+(i+1)%N);
  const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));cg.setIndex(idx);
  cone=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({color:0x58ff9c,transparent:true,opacity:.07,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,side:THREE.DoubleSide,fog:false}));cone.frustumCulled=false;cone.renderOrder=40;
  const lp=[];for(let k=0;k<8;k++){const t=k/8*TWO;lp.push(0,0,0,Math.cos(t),Math.sin(t),-1);}for(let i=0;i<N;i++){const t0=i/N*TWO,t1=(i+1)/N*TWO;lp.push(Math.cos(t0),Math.sin(t0),-1,Math.cos(t1),Math.sin(t1),-1);}lp.push(0,0,0,0,0,-1);
  const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));
  edge=new THREE.LineSegments(eg,new THREE.LineBasicMaterial({color:0x7dffb0,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,fog:false}));edge.frustumCulled=false;edge.renderOrder=41;
  pp=new Float32Array(MAXP*3);pc=new Float32Array(MAXP*3);const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setAttribute('color',new THREE.BufferAttribute(pc,3));pg.setDrawRange(0,0);
  pts=new THREE.Points(pg,new THREE.PointsMaterial({size:7,sizeAttenuation:false,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,fog:false}));pts.frustumCulled=false;pts.renderOrder=42;
  G.add(cone);G.add(edge);G.add(pts);scene.add(G);}
const BW=m=>(m.def.bw||(m.def.seekBW)||5.5)*D;       // seeker half-angle: about 5-6 degrees for the 120/R-77 class
function worldBeam(){if(!G)return;const m=mcam.m;if(!m||!m.alive||!isARH(m)){G.visible=false;return;}
  const d=boresight(m,_b),tg=m.track||m.target,rng=tg&&tg.pos?m.pos.distanceTo(tg.pos):8000,L=cl(rng*1.15,1500,20000);G.visible=true;
  _q.setFromUnitVectors(_z,d);for(const o of[cone,edge]){o.position.copy(m.pos);o.quaternion.copy(_q);const r=L*Math.tan(BW(m));o.scale.set(r,r,L);}
  const on=m.active||m.dl===false&&m.active;cone.material.color.setHex(m.active?0x58ff9c:0xffc24a);edge.material.color.setHex(m.active?0x7dffb0:0xffd98a);cone.material.opacity=m.active?.09:.04;
  let n=0;if(tg&&tg.pos&&m.active){const ph=(performance.now()/1000*.9)%1,T=tg.pos,a=m.pos;const put=(u,amp,r,g,b)=>{for(let k=0;k<3&&n<MAXP;k++){const uu=u-k*.03;if(uu<0||uu>1)continue;const w=amp*(1-k*.3);pp[n*3]=a.x+(T.x-a.x)*uu;pp[n*3+1]=a.y+(T.y-a.y)*uu;pp[n*3+2]=a.z+(T.z-a.z)*uu;pc[n*3]=r*w;pc[n*3+1]=g*w;pc[n*3+2]=b*w;n++;}};
    if(ph<.5)put(ph*2,1,.35,1,.6);else put(1-(ph-.5)*2,.8,1,.9,.45);
    const off=Math.acos(cl(d.dot(T.clone().sub(a).normalize()),-1,1));if(n<MAXP){pp[n*3]=T.x;pp[n*3+1]=T.y;pp[n*3+2]=T.z;const gl=off<BW(m)?1:.35;pc[n*3]=.5*gl;pc[n*3+1]=gl;pc[n*3+2]=.7*gl;n++;}}
  pts.geometry.attributes.position.needsUpdate=pts.geometry.attributes.color.needsUpdate=true;pts.geometry.setDrawRange(0,n);}
function drawARH(m){const g=hx,fs=Math.round(clamp(Math.min(W,H)*.02,10,16)),w=Math.round(clamp(Math.min(W,H)*.34,170,320)),h=Math.round(w*.72),x=W-w-26,y=78,col='rgba(89,255,159,.95)';g.font=hfont(fs);
  frame(g,null,x,y,w,h,'SEEKER RADAR  '+(m.type||''),col);const tg=m.track||m.target,gim=(m.def.gimbal||1),az=60*D;
  const rmax=cl((tg&&tg.pos?m.pos.distanceTo(tg.pos):10000)*1.4,6000,40000);g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
  // B-scope: azimuth across (relative to the missile axis), range up
  g.strokeStyle='rgba(89,255,159,.25)';g.lineWidth=1;for(let i=1;i<4;i++){g.beginPath();g.moveTo(x,y+h*i/4);g.lineTo(x+w,y+h*i/4);g.stroke();}for(let i=1;i<6;i++){g.beginPath();g.moveTo(x+w*i/6,y);g.lineTo(x+w*i/6,y+h);g.stroke();}
  const X=a=>x+w/2+cl(a/az,-1,1)*w/2,gx=Math.min(gim,az);g.strokeStyle='rgba(255,194,74,.8)';g.setLineDash([5,4]);g.beginPath();g.moveTo(X(-gx),y);g.lineTo(X(-gx),y+h);g.moveTo(X(gx),y);g.lineTo(X(gx),y+h);g.stroke();g.setLineDash([]);
  const ax=m.vel.lengthSq()>1?m.vel.clone().normalize():new THREE.Vector3(0,0,-1),bs=boresight(m,new THREE.Vector3());
  const azOf=v=>{const r=v.clone().normalize(),axh=Math.atan2(ax.x,-ax.z);return((Math.atan2(r.x,-r.z)-axh+Math.PI*3)%TWO)-Math.PI;};
  const bz=azOf(bs),bw=BW(m);g.fillStyle=m.active?'rgba(89,255,159,.16)':'rgba(255,194,74,.12)';g.fillRect(X(bz-bw),y,Math.max(2,X(bz+bw)-X(bz-bw)),h);
  g.strokeStyle=m.active?'#59ff9f':'#ffc24a';g.beginPath();g.moveTo(X(bz),y);g.lineTo(X(bz),y+h);g.stroke();
  const T=tg&&tg.pos&&tg.alive!==false?tg:null;if(T){const rel=T.pos.clone().sub(m.pos),rg=rel.length(),a=azOf(rel),px=X(a),py=y+h-cl(rg/rmax,0,1)*h,inb=Math.abs(a-bz)<=bw;
    g.fillStyle=inb?'#ffd24a':'#ff7a4a';g.fillRect(px-4,py-4,8,8);g.strokeStyle=g.fillStyle;g.strokeRect(px-8,py-8,16,16);
    if(m.active){const gh=cl(1200/rmax,.02,.2)*h;g.strokeStyle='rgba(255,210,74,.7)';g.strokeRect(x+4,py-gh/2,w-8,gh);}}
  g.restore();g.fillStyle=col;g.textAlign='left';
  const st=m.active?'ACTIVE · SEEKER ON':(m.dl?'DATALINK · INERTIAL':'INERTIAL · SEEKER OFF');g.fillText(st,x,y+h+14);g.textAlign='right';
  g.fillStyle=T&&m.active?'#ffd24a':col;g.fillText(T?'RNG '+(T.pos.distanceTo(m.pos)/1000).toFixed(1)+' km':'NO TRACK',x+w,y+h+14);g.textAlign='left';
  g.fillStyle='rgba(89,255,159,.6)';g.fillText('AZ ±'+(gx/D).toFixed(0)+'°',x+4,y+h-6);g.textAlign='left';}
const _d=drawMslCam;drawMslCam=function(){_d.apply(this,arguments);try{const m=mcam.m;if(!m||!m.alive||!m.def)return;if(isIIR(m))drawIIR(m);else if(isARH(m))drawARH(m);}catch(e){if(!S.e){S.e=1;console.warn('[mcamseek]',e);}}};
(function loop(){requestAnimationFrame(loop);try{if(!G&&mcam.m&&isARH(mcam.m))build();worldBeam();}catch(e){if(!S.e2){S.e2=1;console.warn('[mcamseek] beam',e);}}})();
window.MCAMSEEK={S,isIIR,isARH};console.info('[mcamseek] v319 seeker views loaded');})();
