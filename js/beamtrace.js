"use strict";
/* =====================================================================================================================
   v297 — Beam propagation. Until now a radar target was "seen" when it sat inside an angular window around the antenna and a calibrated range
   formula said so. Nothing was illuminated, nothing travelled, nothing came back. This module makes the beam a real object.

   WHAT HAPPENS NOW (player radar, mechanically or electronically scanned, search and track):
   * Dwell energy. While the antenna sweeps, every aircraft is hit by the true two-way antenna pattern (main lobe + sidelobes, js/sensorsim.js)
     sampled along the arc the beam covered this frame. The energy it receives is added up over the whole beam passage; the detection decision is
     made once, when the beam has gone past, on the integrated SNR. Passing through the middle of the beam gives the old detection range; clipping
     the edge, a slow or fast scan, or a long ESA dwell all change it because they change how many pulses actually landed.
   * Sidelobe blanking. A target that only the sidelobes lit is not declared (a real set would paint it at the boresight azimuth).
   * Multipath. The ray to the target and the ray bouncing off the sea or ground arrive in or out of phase: two-ray interference with the
     surface reflection coefficient (sea 0.92, land 0.45), cut by surface roughness from the wind (Ament) and by the beam pattern toward the
     image (a narrow beam does not light the bounce). Low targets over calm water ride in lobes and drop into nulls as the range changes.
   * Terrain. The ray is walked over the real terrain mesh on a 4/3-Earth, every point's clearance of the first Fresnel zone gives a knife-edge
     diffraction loss, so a ridge that merely grazes the path costs 6 dB instead of being all or nothing.
   * Electronic arrays lose gain and widen as the beam steers off the array normal.
   * The same ray-trace feeds the AI fighters' radars and the SAM / GCI scans, so a target low behind a ridge or in a null is lost to them too.
   * STT: the lock now sits on the propagation factor as well, so a low target flying through a multipath null can break track.

   F7 shows it: the beam cone out to where its axis meets the ground (the footprint is where clutter comes from), a pulse leaving the antenna for every
   illuminated aircraft and the echo coming back (time-dilated: real pulses cross 100 km in a third of a millisecond), brightness by how much
   of the energy is returned; an orange pulse returns from the ground footprint. Calibration: the old code rolled a full-strength look on every frame the beam was near (about 2.3x the energy a 16 ms frame really gets, several looks a pass),
   so the integrated dwell is scaled by BEAM.kcal = 2 to keep the published detection ranges; 1 gives the strict energy-accounted ranges (about 12 % shorter).
   F4 gets a BEAM block (gain, multipath dB, diffraction dB, echo delay,
   range ambiguity). BEAM.on=false restores the old window test everywhere; BEAM.mp / .df switch multipath / diffraction individually.
   Loads after jamming.js (needs sensorsim's pattern, sensorsig's waveform table, the F4 panel).
   ===================================================================================================================== */
(function(){
if(typeof radar==='undefined'||typeof jets==='undefined'||typeof player==='undefined'||typeof THREE==='undefined'||typeof groundAt!=='function'){console.warn('[beamtrace] core missing');return;}
const S=window.SENSOR_SIG||{},F=window.SENSOR_FUSE||{};
const D=Math.PI/180,C=299792458,TWO=Math.PI*2,RE=6371000*4/3,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),db=x=>10*Math.log10(Math.max(x,1e-30));
const B=window.BEAM={on:true,mp:true,df:true,vis:false,kcal:2,dw:new Map(),fr:0,ill:[],gnd:null,
  st:{dwell:0,det:0,miss:0,slb:0,props:0},lastMp:null};

/* ---------- antenna ---------- */
function ant(){const bw=radar.beam||3.3*D,bwE=radar.bmV?radar.bmV():bw,w=S.wfOf?S.wfOf():null;return{bwA:bw,bwE:bwE,sll:(w&&w.sll)||-28};}
function pat1(dAz,dEl,bwA,bwE,sll){if(S.pattern)return S.pattern(dAz,dEl,bwA,bwE,sll);const u2=(dAz/bwA)*(dAz/bwA)+(dEl/bwE)*(dEl/bwE);return Math.exp(-2.7726*u2);}
// steering loss and widening of an electronic array; mechanical antennas return {w:1,g:1}
function scanOf(a){if(!S.scan||a.baz==null)return{w:1,g:1};return S.scan(Math.acos(cl(Math.cos(a.baz)*Math.cos(a.bel),-1,1)));}
B.ant=ant;

/* ---------- propagation: multipath + diffraction along the real terrain ---------- */
function seaSigma(){let U=0;try{U=(WNDP[ENV.wind]||0)*.5144*(ENV.wx==='STORM'?1.5:ENV.wx==='OVERCAST'?1.15:1);}catch(e){}return Math.max(.01,.0053*U*U);}   // rms wave height, m
B.prop=function(P,T,lam,bwE,sll){
  const o={f:1,mp:1,df:1,J:0,psi:0,rho:0,phi:0};if(!B.on)return o;B.st.props++;
  const dx=T.x-P.x,dz=T.z-P.z,Rg=Math.hypot(dx,dz);if(Rg<400)return o;
  if(B.mp){
    let h1=P.y-groundAt(P.x,P.z),h2=T.y-groundAt(T.x,T.z);
    if(h1>1&&h2>1){const fr=h1/(h1+h2),xs=P.x+dx*fr,zs=P.z+dz*fr,hs=groundAt(xs,zs);h1=P.y-hs;h2=T.y-hs;
      if(h1>2&&h2>2){const d1=Rg*h1/(h1+h2),d2=Rg-d1,h1e=h1-d1*d1/(2*RE),h2e=h2-d2*d2/(2*RE);
        if(h1e>1&&h2e>1){const psi=Math.atan((h1e+h2e)/Rg);
          if(psi<10*D){const dr=Math.hypot(Rg,h1e+h2e)-Math.hypot(Rg,h1e-h2e),phi=TWO*dr/lam+Math.PI,sea=hs<=.5,sh=sea?seaSigma():2,gr=4*Math.PI*sh*Math.sin(psi)/lam,
              rough=Math.exp(-.5*gr*gr),image=pat1(0,2*h2e/Rg,bwE,bwE,sll),rho=(sea?.92:.45)*rough*image,a=1+rho*rho+2*rho*Math.cos(phi);
            o.mp=cl(a*a,.001,40);o.psi=psi;o.rho=rho;o.phi=phi;}}}}}
  if(B.df){const top=typeof THF!=='undefined'?THF.top:4400;
    if(!(P.y>top&&T.y>top)){const d=Math.hypot(dx,T.y-P.y,dz),n=Math.min(48,Math.max(8,Math.ceil(d/1200)));let Jm=0;
      for(let i=1;i<n;i++){const t=i/n,y=P.y+(T.y-P.y)*t;if(y>top)continue;const d1=d*t,d2=d-d1,hc=y-(groundAt(P.x+dx*t,P.z+dz*t)+d1*d2/(2*RE)),r1=Math.sqrt(lam*d1*d2/d),nu=-1.4142*hc/r1;
        if(nu>-.78){const q=nu-.1,J=6.9+20*Math.log10(Math.sqrt(q*q+1)+q);if(J>Jm)Jm=J;}}
      o.J=Jm;o.df=Math.pow(10,-2*Jm/10);}}
  o.f=o.mp*o.df;return o;};
// the player's radar to one aircraft, cached for a moment (the geometry changes slowly)
function propRadar(j,a){const now=performance.now();let c=j._bpR;if(c&&now-c.t<120)return c;
  const lam=C/(((F.reg&&F.reg.carrierFrequencyGHz)||9.7)*1e9),A=ant(),r=B.prop(player.pos,j.pos,lam,A.bwE,A.sll);r.t=now;j._bpR=r;return r;}
B.k=function(j,a){return B.on?propRadar(j,a).f:1;};
// AI fighter radar and SAM / GCI scans: source and target positions; wavelength per radar class
B.pj=function(src,tgt,lam,bw){if(!B.on||!src||!tgt)return 1;const now=performance.now(),k=tgt._bpA;
  if(k&&k.s===src&&now-k.t<300)return k.f;const r=B.prop(src.pos||src,tgt.pos,lam||.031,(bw||3.5)*D,-26);tgt._bpA={s:src,t:now,f:r.f};return r.f;};
B.pv=function(srcPos,tgt,lam,bw){if(!B.on||!srcPos||!tgt)return 1;const now=performance.now(),k=tgt._bpV;
  if(k&&now-k.t<400&&Math.abs(k.x-srcPos.x)+Math.abs(k.z-srcPos.z)<300)return k.f;const r=B.prop(srcPos,tgt.pos,lam||.1,(bw||3.5)*D,-24);tgt._bpV={x:srcPos.x,z:srcPos.z,t:now,f:r.f};return r.f;};

/* ---------- dwell: the beam sweeps, energy lands, the decision comes when the beam has passed ---------- */
// ESA / revisit cell: one electronic dwell, the loss is the real two-way pattern x steering loss x propagation
B.cell=function(j,a,dAz,dEl){
  if(!B.on)return Math.exp(-5.55*((dAz/radar.beam)*(dAz/radar.beam)+(dEl/radar.bmV())*(dEl/radar.bmV())));
  const A=ant(),sc=scanOf(a),p=pat1(dAz*Math.cos(a.el),dEl,A.bwA*sc.w,A.bwE*sc.w,A.sll);return p*p*sc.g*sc.g*propRadar(j,a).f;};

B.sweep=function(rd,prev,cur,now,dt,gim){
  const fr=++B.fr,A=ant(),stab=rd.gl.stab,K=cl(Math.ceil(Math.abs(cur-prev)/(A.bwA*.3)),1,10),Tn=.752*A.bwA/Math.max(rd.rate,1e-3);
  for(const j of jets){
    if(j===player||!j.alive||IFF.hide(j))continue;
    const a=rd.ang(j.pos);let g=0,rec=B.dw.get(j);
    if(a.off<=gim+2*D){
      const ra=stab?a.az:a.baz,re=stab?a.el:a.bel,sc=scanOf(a),bw=A.bwA*sc.w,bwE=A.bwE*sc.w,dE=re-rd.antEl,ce=Math.cos(re);
      for(let i=0;i<K;i++){let dA=ra-(prev+(cur-prev)*(i+.5)/K);dA=Math.atan2(Math.sin(dA),Math.cos(dA));const p=pat1(dA*ce,dE,bw,bwE,A.sll);g+=p*p;}
      g=g/K*sc.g*sc.g;}
    if(g>1e-4){
      if(!rec){rec={E:0,pk:0,sb:0,pf:1,a:null,Tn:Tn};B.dw.set(j,rec);}
      rec.E+=g*dt;rec.fr=fr;rec.Tn=Tn;rec.t=now;
      if(g>rec.pk){rec.pk=g;if(g>.05){rec.a=a;rec.pf=propRadar(j,a).f;rec.sb=rd.snr(j,a,1);}}
      if(g>.1){const J=rd.jam(j);if(J&&J.noise&&!J.esc&&a.d>J.bt&&terrLOS(player.pos,j.pos)&&a.d<rd.rdet(j,a)*1.5)rd.strobes.set(j,{az:a.az,el:a.el,d:a.d,t:now});}
    }else if(rec)B.fin(rd,j,rec,now);
  }
  for(const [j,rec] of B.dw)if(rec.fr!==fr)B.fin(rd,j,rec,now);};

B.fin=function(rd,j,rec,now){B.dw.delete(j);if(now-(rec.t||now)>.4)return;B.st.dwell++;
  if(!j.alive||!rec.a||rec.pk<.25){if(rec.pk>=.003)B.st.slb++;return;}   // sidelobe blanking: only the main lobe declares a target
  const snr=rec.sb*rec.pf*(rec.E/rec.Tn)*B.kcal;
  if(snr>0&&Math.random()<pdOf(snr)){B.st.det++;rd.hit(j,rec.a,snr,now);}else B.st.miss++;};

/* ---------- what the beam is hitting right now (F4 block and F7 view) ---------- */
const _d=new THREE.Vector3(),_q=new THREE.Quaternion();
function beamDir(o){const a=radar.antAz,e=radar.antEl,ce=Math.cos(e);
  if(radar.gl.stab){const f=player.fwd(new THREE.Vector3()),h=Math.atan2(f.x,-f.z)+a;return o.set(Math.sin(h)*ce,Math.sin(e),-Math.cos(h)*ce);}
  return o.set(Math.sin(a)*ce,Math.sin(e),-Math.cos(a)*ce).applyQuaternion(player.q);}
function nose(o){return player.fwd(o).multiplyScalar(3.5).add(player.pos);}
function groundHit(org,dir,maxR){const step=250;let pd=0,pc=org.y-groundAt(org.x,org.z);
  for(let d=step;d<=maxR;d+=step){const x=org.x+dir.x*d,z=org.z+dir.z*d,y=org.y+dir.y*d-d*d/(2*RE),c=y-groundAt(x,z);
    if(c<0){const t=pc/(pc-c),dd=pd+(d-pd)*t;return{d:dd,x:org.x+dir.x*dd,y:org.y+dir.y*dd,z:org.z+dir.z*dd};}
    pd=d;pc=c;}return null;}
B.scanIll=function(){B.ill.length=0;B.gnd=null;if(!player||!player.alive||radar.sensor!=='RDR'||!radar.on())return;
  const A=ant(),org=nose(new THREE.Vector3()),dir=beamDir(new THREE.Vector3());
  B.gnd=groundHit(org,dir,Math.min(radar.rngM*1.5,150000));
  for(const j of jets){if(j===player||!j.alive||IFF.hide(j))continue;const a=radar.ang(j.pos),sc=scanOf(a),stab=radar.gl.stab,ra=stab?a.az:a.baz,re=stab?a.el:a.bel;
    let dA=ra-radar.antAz;dA=Math.atan2(Math.sin(dA),Math.cos(dA));const p=pat1(dA*Math.cos(re),re-radar.antEl,A.bwA*sc.w,A.bwE*sc.w,A.sll),g2=p*p*sc.g*sc.g;
    if(g2<.02)continue;const pr=propRadar(j,a),s=radar.snr(j,a,1)*g2*pr.f;
    B.ill.push({j:j,d:a.d,g2:g2,mp:pr.mp,df:pr.df,J:pr.J,psi:pr.psi,snr:s,tau:2*a.d/C,prf:Math.max(1,(player.ac.radar&&player.ac.radar.prf)||12000)});}};
{const _u=radar.update;radar.update=function(dt){const o=_u.call(this,dt);try{if(B.vis||(window.RADARDBG&&RADARDBG.on))B.scanIll();else if(B.ill.length)B.ill.length=0;}catch(e){}return o;};}

/* ---------- F4 block ---------- */
const RD=window.RADARDBG;
if(RD){const _r=RD.extraRows;RD.extraRows=()=>{const L=['','BEAM  '+(B.on?'ON':'OFF')+'  boresight az '+(radar.antAz/D).toFixed(1)+' el '+(radar.antEl/D).toFixed(1)+'  width '+(radar.beam/D).toFixed(1)+'°  MP '+(B.mp?'on':'off')+' DF '+(B.df?'on':'off'),
  '  dwells '+B.st.dwell+'  declared '+B.st.det+'  missed '+B.st.miss+'  sidelobe-blanked '+B.st.slb,
  B.gnd?'  axis meets ground at '+(B.gnd.d/1000).toFixed(1)+' km  (clutter footprint)':'  axis clear of the ground'];
  for(const e of B.ill.slice(0,5)){const id=(e.j.type||'?')+'';const Ru=C/(2*e.prf);
    L.push('  '+id.padEnd(8)+(e.d/1852).toFixed(1).padStart(5)+'NM  pat '+db(e.g2).toFixed(1)+'dB  MP '+db(e.mp).toFixed(1)+'  DF '+db(e.df).toFixed(1)+'  echo '+(e.tau*1e6).toFixed(0)+'µs  fold '+((e.d%Ru)/1000).toFixed(1)+'km  snr '+db(e.snr).toFixed(1)+'dB');}
  return L.concat(_r?_r():[]);};}

/* ---------- F7: the beam, the pulse out, the echo back ---------- */
let G=null,cone,edge,pts,pp,pc,MAXP=160;
function build(){G=new THREE.Group();G.frustumCulled=false;G.renderOrder=40;
  const N=24,pos=[0,0,0],idx=[];for(let i=0;i<N;i++){const t=i/N*TWO;pos.push(Math.cos(t),Math.sin(t),-1);}
  for(let i=0;i<N;i++)idx.push(0,1+i,1+(i+1)%N);
  const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));cg.setIndex(idx);
  cone=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({color:0x58ff9c,transparent:true,opacity:.06,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,side:THREE.DoubleSide,fog:false}));cone.frustumCulled=false;cone.renderOrder=40;
  const lp=[];for(let k=0;k<8;k++){const t=k/8*TWO;lp.push(0,0,0,Math.cos(t),Math.sin(t),-1);}for(let i=0;i<N;i++){const t0=i/N*TWO,t1=(i+1)/N*TWO;lp.push(Math.cos(t0),Math.sin(t0),-1,Math.cos(t1),Math.sin(t1),-1);}
  lp.push(0,0,0,0,0,-1);
  const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));
  edge=new THREE.LineSegments(eg,new THREE.LineBasicMaterial({color:0x7dffb0,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,fog:false}));edge.frustumCulled=false;edge.renderOrder=41;
  pp=new Float32Array(MAXP*3);pc=new Float32Array(MAXP*3);const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setAttribute('color',new THREE.BufferAttribute(pc,3));pg.setDrawRange(0,0);
  pts=new THREE.Points(pg,new THREE.PointsMaterial({size:8,sizeAttenuation:false,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,fog:false}));pts.frustumCulled=false;pts.renderOrder=42;
  G.add(cone);G.add(edge);G.add(pts);scene.add(G);}
const _o=new THREE.Vector3(),_dr=new THREE.Vector3(),_z=new THREE.Vector3(0,0,-1),_t=new THREE.Vector3();
function packet(n,a,b,u,amp,r,g,bl){// a short train of points behind the head, fading, from a towards b
  for(let k=0;k<4&&n<MAXP;k++){const uu=u-k*.012;if(uu<0||uu>1)continue;const w=amp*(1-k*.22);pp[n*3]=a.x+(b.x-a.x)*uu;pp[n*3+1]=a.y+(b.y-a.y)*uu;pp[n*3+2]=a.z+(b.z-a.z)*uu;pc[n*3]=r*w;pc[n*3+1]=g*w;pc[n*3+2]=bl*w;n++;}return n;}
function frame(){requestAnimationFrame(frame);
  if(!B.vis||!player||!player.alive||radar.sensor!=='RDR'||!radar.on()){if(G)G.visible=false;return;}
  if(!G)build();G.visible=true;
  const A=ant();nose(_o);beamDir(_dr);
  const L=B.gnd?B.gnd.d:Math.min(radar.rngM,80000);_q.setFromUnitVectors(_z,_dr);
  for(const m of[cone,edge]){m.position.copy(_o);m.quaternion.copy(_q);const r=L*Math.tan(A.bwA/2);m.scale.set(r,L*Math.tan(A.bwE/2),L);}
  const ph=(performance.now()/1000*.7)%1;let n=0;
  for(const e of B.ill){const T=e.j.pos,g=Math.sqrt(e.g2),outU=cl(ph*2,0,1),backU=cl(1-(ph-.5)*2,0,1);
    if(ph<.5)n=packet(n,_o,T,outU,.35+.65*g,.35,1,.6);
    else{const echo=cl(.25+.2*Math.log10(Math.max(e.snr,1e-3)+1),.2,1);n=packet(n,T,_o,1-backU,echo,1,.9,.45);}
    if(n<MAXP){pp[n*3]=T.x;pp[n*3+1]=T.y;pp[n*3+2]=T.z;const gl=.25+.75*g;pc[n*3]=.5*gl;pc[n*3+1]=1*gl;pc[n*3+2]=.7*gl;n++;}}
  if(B.gnd){_t.set(B.gnd.x,B.gnd.y,B.gnd.z);
    if(ph<.5)n=packet(n,_o,_t,cl(ph*2,0,1),.45,.35,1,.6);else n=packet(n,_t,_o,cl((ph-.5)*2,0,1),.7,1,.55,.15);
    if(n<MAXP){pp[n*3]=_t.x;pp[n*3+1]=_t.y;pp[n*3+2]=_t.z;pc[n*3]=1;pc[n*3+1]=.5;pc[n*3+2]=.1;n++;}}
  pts.geometry.attributes.position.needsUpdate=pts.geometry.attributes.color.needsUpdate=true;pts.geometry.setDrawRange(0,n);}
requestAnimationFrame(frame);

B.show=function(v){B.vis=v===undefined?!B.vis:!!v;if(!B.vis&&G)G.visible=false;try{flash('BEAM VIEW '+(B.vis?'ON':'OFF'),900);}catch(e){}return B.vis;};
addEventListener('keydown',e=>{if(e.code!=='F7'||e.repeat)return;e.preventDefault();B.show();},true);
try{const k=document.querySelector('.keys');if(k&&!/Beam view/.test(k.textContent)){const d=document.createElement('div'),b=document.createElement('kbd');
  d.textContent='Beam view (cone, pulses out, echoes back)';b.textContent='F7';d.appendChild(b);k.appendChild(d);}}catch(e){}
console.info('[beamtrace] v297 beam propagation loaded (F7 beam view)');
})();
