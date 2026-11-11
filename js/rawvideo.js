/* =====================================================================================================================
   v299 — Raw radar video for the pulse sets (F-4E/B/J, F-104, MiG-21, MiG-23, MiG-25, Mirage, F-8 ... every jet with ac.pulse).
   Until now these scopes drew clutter blobs from a coarse terrain store and put target marks wherever the tracker had a track file.
   Now the scope shows what the receiver outputs: one video sample per range bin per azimuth step, written as the antenna sweeps across,
   and it stays on the screen only as long as the phosphor holds it. The operator has to pick the blip out of the grass.

   What goes into one sample (power in units of receiver noise, then the gain knob and a log amplifier turn it into brightness):
     * receiver noise, exponentially distributed, so a high gain setting fills the picture with grass
     * terrain clutter by the radar equation on the real terrain mesh: slant-range bins, ground point found from the slant range,
       4/3-Earth bulge, running-elevation shadowing, local slope for the grazing angle, land (gamma · sin psi, patchy by cover type) and
       sea (grazing angle and wind) backscatter, resolution cell = range · beamwidth · c·tau/2, Rayleigh fluctuation
     * the antenna pattern at the elevation of each ground point, so the mainlobe lights up where it touches the ground and the sidelobes
       paint a faint wash everywhere; the empty gap below the aircraft and the altitude line come out of the same geometry
     * main bang at zero range
     * rain: patchy cells, volume backscatter falling as 1/R^2, only below the freezing level / the cloud top
     * noise jammers: a strobe along the whole range line at the jammer's bearing, strength from the burn-through range
     * target echoes: SNR from the same calibration as the detector (R0, RCS, aspect), two-way beam pattern in azimuth and elevation, multipath
       and diffraction factor from BEAM, Swerling I fluctuation per beam passage, spread over the pulse length; with MTI on, slow-closing
       targets fade toward the blind speeds
   Detection is NOT decided here. The tracker and the AI still decide what the radar "sees"; this is the picture the pilot reads.
   Gameplay-level estimates, not published data. flPaint (called by every pulse scope) is wrapped, so all of them get it at once.
   RAWVID.on=false restores the old painter.  Switches: .clut .rain .jam .tgt .noise .mti
   ===================================================================================================================== */
(function(){'use strict';
if(typeof radar==='undefined'||typeof flPaint!=='function'||typeof flClutterSweep!=='function'||typeof flClutter==='undefined')return;
const D=Math.PI/180,C=299792458,RE=6371000*4/3,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const S=window.SENSOR_SIG||{},F=window.SENSOR_FUSE||{};
const RV=window.RAWVID={on:true,clut:true,rain:true,jam:true,tgt:true,noise:true,mti:true,tau:1.0e-6,tph:2.2,thr:3,span:30,
  st:{cols:0,ms:0,tgt:0,last:0,err:null}};
const nR=192;let nA=0,V=null,T=null,AZ=0,RNG=0,BWk=0;RV.dump=()=>({V:V,T:T,nA:nA,nR:nR,AZ:AZ,RNG:RNG});
const clr=new Float32Array(nR),rainA=new Float32Array(nR);
const _f=new THREE.Vector3();
const ex=()=>-Math.log(1-Math.random());                    // unit-mean exponential: noise and Rayleigh power fluctuation
const pat1=(dAz,dEl,bwA,bwE,sll)=>S.pattern?S.pattern(dAz,dEl,bwA,bwE,sll):Math.exp(-2.7726*((dAz/bwA)*(dAz/bwA)+(dEl/bwE)*(dEl/bwE)));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function ant(){const bw=radar.beam||3.3*D,bwE=radar.bmV?radar.bmV():bw,w=S.wfOf?S.wfOf():null;return{bwA:bw,bwE:bwE,sll:(w&&w.sll)||-21};}
function gainOf(){const P=player,pit=P&&P.ac&&P.ac.pit;return(pit==='flogger'||pit==='foxbat'||pit==='fishbed')?sys.mig.fgain:(sys.fcr&&sys.fcr.gain!=null?sys.fcr.gain:.6);}
function setup(){if(typeof flFit==='function')flFit();const az=flClutter.AZ,rng=radar.rngM,bw=radar.beam||3.3*D,n=cl(Math.round(2*az/(bw*.25)),64,420);
  if(n!==nA||Math.abs(az-AZ)>1e-6||rng!==RNG){nA=n;AZ=az;RNG=rng;V=new Float32Array(nA*nR);T=new Float32Array(nA*nR);}}
function windMs(){let U=0;try{U=(WNDP[ENV.wind]||0)*.5144*(ENV.wx==='STORM'?1.5:ENV.wx==='OVERCAST'?1.15:1);}catch(e){}return U;}
// patchy rain: value noise on a 6 km grid, drifting slowly with the wind
function rainField(x,z,t){const g=6000,u=(x+t*6)/g,v=(z+t*3)/g,i=Math.floor(u),j=Math.floor(v),fu=u-i,fv=v-j,s=q=>q*q*(3-2*q),
  a=hash(i,j),b=hash(i+1,j),c=hash(i,j+1),d=hash(i+1,j+1),n=a+(b-a)*s(fu)+(c-a)*s(fv)+(a-b-c+d)*s(fu)*s(fv);return cl((n-.42)*2.2,0,1);}

/* ---------- targets seen this frame (shared by every column written in the frame) ---------- */
const tg=[];
function targets(now,P){tg.length=0;if(!RV.tgt&&!RV.jam)return;
  const stab=radar.gl.stab,lam=C/(((F.reg&&F.reg.carrierFrequencyGHz)||9.7)*1e9);
  for(const j of jets){if(j===P||!j.alive||(window.IFF&&IFF.hide&&IFF.hide(j)))continue;
    const a=radar.ang(j.pos);if(a.d>RNG*1.05||a.d<60)continue;
    const toMe=P.pos.clone().sub(j.pos).normalize(),c=j.fwd(new THREE.Vector3()).dot(toMe);
    const Rt=radar.R0*Math.pow((j.ac.rcs||5)/5,.25)*(.62+.38*Math.max(0,c));            // same RCS / aspect law as the detector
    const ra=stab?a.az:(a.baz!=null?a.baz:a.az),re=stab?a.el:(a.bel!=null?a.bel:a.el);
    let st=j._rv;if(!st){st={f:1,t:-9};j._rv=st;}if(now-st.t>1.0)st.f=ex();st.t=now;       // Swerling I: one draw per beam passage
    const J=radar.jam(j);let mt=1;
    if(RV.mti&&sys.mig&&sys.mig.mti){const los=toMe.clone().negate(),vr=j.vel.clone().sub(P.vel).dot(los),vb=lam*2000/2;mt=Math.pow(Math.sin(Math.PI*vr/vb),2)*.9+.1;}
    const jn=J&&J.noise&&!J.esc?Math.max(J.bt||1,1):0;
    tg.push({j:j,a:a,ra:ra,re:re,d:a.d,S:SNR50*Math.pow(Rt/a.d,4),st:st,mt:mt,pf:window.BEAM?BEAM.k(j,a):1,jn:jn,Sbt:jn?SNR50*Math.pow(Rt/jn,4):0});}}   // echo power in noise units: SNR50 (Rt/d)^4

/* ---------- one azimuth column ---------- */
function column(ia,az,now,P,A,elH,hw0,tau,mti){
  const rng=RNG,dR=C*tau/2,bin=rng/nR,sx=Math.sin(hw0+az),sz=-Math.cos(hw0+az),y=P.pos.y,Su=SNR50*Math.pow(radar.R0,4)/5,U=windMs(),ceh=Math.cos(elH);
  clr.fill(0);rainA.fill(0);
  let maxE=-2,prevH=terrMesh(P.pos.x,P.pos.z),prevG=0,hh=Math.max(0,prevH);
  const rainOn=RV.rain&&ENV&&ENV.rain>.04,top=rainOn?(ENV.P&&ENV.P.strat>0?ENV.P.alt+ENV.P.th:3600):0,wex=mti?.08:1;
  for(let ir=0;ir<nR;ir++){const R=(ir+.5)*bin;
    if(RV.clut){
      // ground range that gives this slant range, iterated twice against the terrain height
      let hs=hh,g=0;for(let k=0;k<2;k++){const dy=y-hs+0,q=R*R-dy*dy;g=q>0?Math.sqrt(q):0;hs=Math.max(0,terrMesh(P.pos.x+sx*g,P.pos.z+sz*g));}
      if(g>0.5||R>y-hs){
        const th=terrMesh(P.pos.x+sx*g,P.pos.z+sz*g),sea=th<1;hh=Math.max(0,th);const curv=g*g/(2*RE),e=Math.atan2(hh-curv-y,Math.max(g,1));
        if(R>=y-hh-1&&e>=maxE-.0004){
          const slope=g>prevG+1?(hh-Math.max(0,prevH))/(g-prevG):0,al=Math.atan2(y-hh+curv,Math.max(g,1));let psi=al+(sea?0:Math.atan(slope));
          if(psi>.002){
            const p=pat1(0,e-elH,A.bwA,A.bwE,A.sll),g2=p*p;
            if(g2>1e-13){let s0;
              if(sea)s0=Math.pow(10,(-45+15*Math.log10(Math.max(psi/D,.1))+20*Math.log10(Math.max(U,2.5)/8))/10);
              else{const tx=.35+1.9*hash(Math.floor((P.pos.x+sx*g)/1400),Math.floor((P.pos.z+sz*g)/1400));s0=.0079*tx*Math.sin(Math.min(psi,1.5));}
              if(psi>1.2)s0*=1+(sea?800:300)*Math.pow((psi-1.2)/.37,2);                                   // near-vertical: specular return, the altitude line
              s0=Math.min(s0,40);
              const sig=s0*R*A.bwA*dR/Math.max(Math.cos(Math.min(psi,1.45)),.2);
              clr[ir]=Su*sig/(R*R*R*R)*g2*wex;}}}
        maxE=Math.max(maxE,e);prevH=th;prevG=g;}}
    if(rainOn){const x=P.pos.x+sx*R*ceh,z=P.pos.z+sz*R*ceh,yb=y+R*Math.sin(elH);
      if(yb<top&&yb>-50){const I=ENV.rain*rainField(x,z,now);if(I>.03)rainA[ir]=.6*SNR50*Math.pow(radar.R0/R,2)*Math.pow(I,1.4)*wex;}}}
}

/* ---------- sweep: write every column the antenna crossed since the last call ---------- */
RV.sweep=function(a0,a1,now){
  const P=player;if(!RV.on||!P||!P.alive||!P.ac||!P.ac.pulse||radar.sensor!=='RDR'||!radar.on())return;
  const t0=performance.now();setup();const lo=Math.min(a0,a1),hi=Math.max(a0,a1),i0=cl(Math.floor((lo/AZ*.5+.5)*nA),0,nA-1),i1=cl(Math.floor((hi/AZ*.5+.5)*nA),0,nA-1);
  const A=ant(),f=P.fwd(_f),h0=Math.atan2(f.x,-f.z),stab=radar.gl.stab,elH=radar.antEl+(stab?0:Math.asin(cl(f.y,-1,1))),tau=RV.tau,mti=!!(sys.mig&&sys.mig.mti&&RV.mti),bin=RNG/nR;
  targets(now,P);const spread=Math.max(1,Math.round(C*tau/2/bin));
  for(let ia=i0;ia<=i1;ia++){const az=((ia+.5)/nA*2-1)*AZ;column(ia,az,now,P,A,elH,h0,tau,mti);
    const base=ia*nR,row=new Float32Array(nR);
    for(let ir=0;ir<nR;ir++){let v=RV.noise?ex():.2;if(clr[ir]>0)v+=clr[ir]*ex();if(rainA[ir]>0)v+=rainA[ir]*ex();row[ir]=v;}
    if(RV.clut){                                                                            // main bang: transmitter leakage and recovery
      for(let ir=0;ir<nR;ir++){const R=(ir+.5)*bin;if(R>2500)break;row[ir]+=1.5e3*Math.exp(-R/230);}}
    for(const q of tg){
      let dA=wrap(q.ra-az);const ce=Math.cos(q.re),p=pat1(dA*ce,q.re-radar.antEl,A.bwA,A.bwE,A.sll);
      if(q.jn&&RV.jam){const Jp=q.Sbt*Math.pow(q.jn/Math.max(q.d,200),2)*p;if(Jp>.05)for(let ir=0;ir<nR;ir++)row[ir]+=Jp*ex();}
      if(!RV.tgt)continue;const g2=p*p;if(g2<2e-4)continue;
      const ir0=Math.floor(q.d/bin);if(ir0<0||ir0>=nR)continue;
      const pw=q.S*g2*q.pf*q.st.f*q.mt;if(pw<.05)continue;
      for(let k=0;k<spread;k++){const ir=ir0+k;if(ir>=nR)break;row[ir]+=pw*(k?.55:1);}
      if(g2>.1)RV.st.tgt++;}
    for(let ir=0;ir<nR;ir++){V[base+ir]=row[ir];T[base+ir]=now;}
    RV.st.cols++;}
  RV.st.ms+=performance.now()-t0;};

/* ---------- paint: video -> brightness (gain knob, log amplifier), phosphor decay, scope geometry from the caller's mapping m(u,v) ---------- */
let cv=null,cx=null,img=null,cW=0,cH=0;
function rgbOf(s){if(typeof s!=='string')return[141,255,180];let m=/^#([0-9a-f]{6})$/i.exec(s.trim());if(m){const n=parseInt(m[1],16);return[n>>16&255,n>>8&255,n&255];}
  m=/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s.trim());if(m)return[parseInt(m[1],16)*17,parseInt(m[2],16)*17,parseInt(m[3],16)*17];
  m=/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(s);return m?[+m[1],+m[2],+m[3]]:[141,255,180];}
RV.bright=function(v,GdB){const dB=10*Math.log10(Math.max(v,1e-3))+GdB-RV.thr;return cl(dB/RV.span,0,1);};
RV.paint=function(c,m,px,base){
  if(!V||RNG!==radar.rngM||Math.abs(AZ-flClutter.AZ)>1e-6)return;
  const now=performance.now()/1000,GdB=(gainOf()-.5)*18,col=rgbOf(c.strokeStyle),tph=RV.tph;
  const p00=m(-1,0),p11=m(1,1),pm=m(0,.5),p10=m(1,0),p01=m(-1,1);
  const aff=p00&&p11&&pm&&p10&&p01&&p11.x>p00.x&&p11.y<p00.y&&Math.abs(pm.x-(p00.x+p11.x)/2)<1.5&&Math.abs(pm.y-(p00.y+p11.y)/2)<1.5&&Math.abs(p10.y-p00.y)<1.5&&Math.abs(p01.x-p00.x)<1.5;
  if(aff){
    if(!cv||cW!==nA||cH!==nR){cv=document.createElement('canvas');cv.width=cW=nA;cv.height=cH=nR;cx=cv.getContext('2d');img=cx.createImageData(nA,nR);}
    const id=img.data;
    for(let ia=0;ia<nA;ia++)for(let ir=0;ir<nR;ir++){const i=ia*nR+ir,age=now-T[i],p=((nR-1-ir)*nA+ia)*4;
      if(age>6||T[i]===0){id[p+3]=0;continue;}
      const I=RV.bright(V[i],GdB)*Math.exp(-age/tph);
      id[p]=col[0];id[p+1]=col[1];id[p+2]=col[2];id[p+3]=Math.round(clamp(I*1.25,0,1)*255);}
    cx.putImageData(img,0,0);
    const sv=c.globalAlpha,sw=p11.x-p00.x,sh=p00.y-p11.y,cs=c.globalCompositeOperation;c.globalAlpha=base;c.imageSmoothingEnabled=true;c.drawImage(cv,p00.x,p11.y,sw,sh);
    c.globalCompositeOperation='lighter';c.globalAlpha=base*.55;c.drawImage(cv,p00.x-.9,p11.y-1.1,sw+1.8,sh+2.2);   // spot bloom: a one-bin echo is still a visible dash on the tube
    c.globalCompositeOperation=cs;c.globalAlpha=sv;
    return;}
  // non-affine mapping (HUD repeater): short horizontal strokes, only for cells bright enough to matter
  const du=2/nA*.62,lv=[[],[],[]];
  for(let ia=0;ia<nA;ia++)for(let ir=0;ir<nR;ir++){const i=ia*nR+ir,age=now-T[i];if(age>4.5||T[i]===0)continue;
    const I=RV.bright(V[i],GdB)*Math.exp(-age/tph);if(I<.18)continue;lv[I>.6?2:I>.35?1:0].push((ia+.5)/nA*2-1,(ir+.5)/nR);}
  c.lineCap='round';
  lv.forEach((arr,k)=>{if(!arr.length)return;c.globalAlpha=base*[.4,.7,1][k];c.lineWidth=px*[1.5,2,2.8][k];c.beginPath();
    for(let q=0;q<arr.length;q+=2){const a=m(arr[q]-du,arr[q+1]),b=m(arr[q]+du,arr[q+1]);if(a&&b){c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);}}c.stroke();});
  c.globalAlpha=base;c.lineCap='butt';};

/* ---------- hooks ---------- */
{const _s=window.flClutterSweep;window.flClutterSweep=function(a0,a1){const r=_s.apply(this,arguments);try{RV.sweep(a0,a1,performance.now()/1000);}catch(e){RV.st.err=String(e&&e.message||e);}return r;};}
{const _p=window.flPaint;window.flPaint=function(c,m,px,base){if(RV.on&&V&&player&&player.ac&&player.ac.pulse){try{RV.paint(c,m,px,base);return;}catch(e){RV.st.err=String(e&&e.message||e);}}return _p.apply(this,arguments);};}
{const _j=window.jamPaint;if(typeof _j==='function')window.jamPaint=function(){if(RV.on&&V&&player&&player.ac&&player.ac.pulse&&radar.sensor==='RDR')return;return _j.apply(this,arguments);};}   // the strobe is now in the video
const RD=window.RADARDBG;
if(RD){const _r=RD.extraRows;RD.extraRows=()=>{const L=_r?_r():[];L.push('','RAWVID  '+(RV.on?'ON':'OFF')+'  '+nA+' x '+nR+' cells  tau '+(RV.tau*1e6).toFixed(1)+' us  cols '+RV.st.cols+'  blips '+RV.st.tgt+'  '+(RV.st.cols?(RV.st.ms/RV.st.cols).toFixed(3):'0')+' ms/col'+(RV.st.err?'  ERR '+RV.st.err:''));return L;};}
})();
