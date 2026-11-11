/* v274 — antenna pattern and an I/Q simulation of one coherent processing interval (CPI) per PRF.
   ANTENNA: a 2-D power pattern from the registry's beamwidths: Gaussian main beam (-3 dB at half the beamwidth), tapered sidelobe envelope at the radar's
   sidelobe level with nulls and ripple, far-out floor and back lobe. An electronic array widens the beam by 1/cos(scan) and loses gain by cos^p.
   CPI SIMULATION (for each non-eclipsed PRF):
     - the ground returning in the target's range gate is split into patches (fine around the beam, coarse all round) for every ambiguous range;
       each patch has its own sigma0 (land/sea), area (pulse length x ring width), two-way pattern gain and Doppler (2·Vp·u/lambda);
     - complex samples are generated pulse by pulse (so Doppler aliasing and blind speeds come out of the sampling, not a formula);
     - Hamming window, FFT, mainlobe-clutter and zero-Doppler filters blank their bins, noise floor added, CA-CFAR reference cells around the target bin;
     - result = signal-to-(clutter+noise) retained, relative to the noise-only case (f_k), fed to snr1 by sensorsig. */
(function(){
'use strict';
const S=window.SENSOR_SIG,F=window.SENSOR_FUSE;if(!S||!F){console.warn('[sensorsim] sig missing');return;}
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),un=x=>Math.pow(10,x/10),C=299792458,D=Math.PI/180,TWO=Math.PI*2;
S.sim=true;

// ---------- antenna
const pat=S.pattern=function(dAz,dEl,bwA,bwE,sllDb){const u=Math.hypot(dAz/bwA,dEl/bwE),main=Math.exp(-2.7726*u*u);if(u<.9)return main;
  const sl=un(sllDb),env=sl*Math.min(1,Math.pow(1.3/u,1.4)),rip=.3+.7*Math.pow(Math.cos(Math.PI*u*.95),2),t=cl((u-.9)/.5,0,1);return Math.max(main*(1-t)+env*rip*t,sl*.004);};
// scan geometry for an electronic array: beam widens and gain falls with scan angle from the array normal
S.scan=function(scanRad){const type=F.reg&&F.reg.antennaType,elec=type&&type!=='Mechanical_Slotted_Planar';if(!elec)return{w:1,g:1};const c=Math.max(Math.cos(Math.min(Math.abs(scanRad),1.4)),.17);return{w:1/c,g:Math.pow(c,1.5)};};

// ---------- FFT (radix-2, in place)
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}}
  for(let len=2;len<=n;len<<=1){const a=-TWO/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const ur=re[i+k],ui=im[i+k],xr=re[i+k+len/2],xi=im[i+k+len/2],vr=xr*cr-xi*ci,vi=xr*ci+xi*cr;
    re[i+k]=ur+vr;im[i+k]=ui+vi;re[i+k+len/2]=ur-vr;im[i+k+len/2]=ui-vi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t;}}}}
const win=new Map();function hamming(N){let w=win.get(N);if(!w){w=new Float64Array(N);for(let i=0;i<N;i++)w[i]=.54-.46*Math.cos(TWO*i/(N-1));let s1=0,s2=0;for(const x of w){s1+=x;s2+=x*x;}win.set(N,w);w.s1=s1;w.s2=s2;}return w;}
const fold=(x,p)=>((x%p)+p*1.5)%p-p*.5;

// ---------- terrain horizon profile: 120 rays (3 deg), heights along each, and which steps are hidden behind nearer terrain (with 4/3-earth curvature)
const NR=120,NS=80,RE=6371000*4/3;
const HZ=S.hz={t:0,x:1e9,z:1e9,hA:0,step:0,rays:null};
function profile(){const P=player,x=P.pos.x,z=P.pos.z,hA=P.pos.y,now=performance.now();
  if(HZ.rays&&now-HZ.t<2500&&Math.hypot(x-HZ.x,z-HZ.z)<1500&&Math.abs(hA-HZ.hA)<200)return HZ;
  const agl=Math.max(hA-(typeof groundAt==='function'?groundAt(x,z):0),30),rMax=cl(4120*Math.sqrt(agl)*1.2,20000,200000),step=rMax/NS;
  if(!HZ.rays){HZ.rays=[];for(let i=0;i<NR;i++)HZ.rays.push({h:new Float32Array(NS),vis:new Uint8Array(NS)});}
  for(let i=0;i<NR;i++){const az=i/NR*TWO,sx=Math.sin(az),sz=-Math.cos(az),r=HZ.rays[i];let mx=-9;
    for(let k=0;k<NS;k++){const d=(k+1)*step,h=Math.max(0,terrMesh(x+sx*d,z+sz*d)),el=(h-hA-d*d/(2*RE))/d;r.h[k]=h;r.vis[k]=el>=mx-1e-5?1:0;if(el>mx)mx=el;}}
  Object.assign(HZ,{t:now,x,z,hA,step,agl});S.stats.prof=(S.stats.prof||0)+1;return HZ;}
// compression ratio and peak range-sidelobe level per radar (modern sets use phase codes; older ones transmit a plain pulse)
const KC={'APG-68(V)5':[13,-30],'APG-70':[13,-30],'APG-73':[13,-34],'APG-79':[32,-40],'N019M':[13,-26],'Zhuk-ME':[13,-30],'Zaslon':[32,-36]};
// target RCS fluctuation: Swerling I for fighters, III for large/steady targets; drawn independently per PRF look (frequency diversity)
const expo=()=>-Math.log(1-Math.random()+1e-12),gauss=()=>Math.sqrt(-2*Math.log(1-Math.random()+1e-12))*Math.cos(TWO*Math.random());
S.swerling=rcs=>rcs>25?(expo()+expo())/2:expo();

// ---------- one PRF: returns {f, blanked, clut, patches}
// c: {lam, R, los, s, sig, vp, rr, agl, bwA, bwE, sll, wMLC, wZDF, vpl}
S.simPRF=function(c,prf,tau,Nn,H){const lam=c.lam,Ru=C/(2*prf),Rapp=c.R%Ru,N=Nn,w=hamming(N),rho=c.s*w.s2/(w.s1*w.s1),hp=profile();
  const nm=player.ac.radar&&player.ac.radar.name,kc=KC[nm]||[1,-24],Kc=H?1:kc[0],psl=kc[1],cell=C*tau/(2*Kc);
  const re=new Float64Array(N),im=new Float64Array(N);
  const los=c.los,az0=Math.atan2(los.x,-los.z),el0=Math.asin(cl(los.y,-1,1)),gL=un(F.Q.clutterGammaTerrain==null?-15:F.Q.clutterGammaTerrain),gS=un(F.Q.clutterGammaSea==null?-25:F.Q.clutterGammaSea);
  const Pt=c.sig/Math.pow(c.R,4),vp=c.vp,nAmb=H?5:7,hA=player.pos.y;let clutPow=0,patches=0,shadowed=0;
  const add=(Rn,phi,dphi,wt)=>{
    // ground range for this slant range over the local terrain (one refinement), shadow test on the horizon profile
    let ri=Math.round(((phi%TWO)+TWO)%TWO/TWO*NR)%NR,ray=hp.rays[ri],Rg=Math.sqrt(Math.max(Rn*Rn-c.agl*c.agl,1)),k=cl(Math.round(Rg/hp.step)-1,0,NS-1);
    if(Rg>hp.step*NS*1.02){return;}
    const hT=ray.h[k],dh=hA-hT;if(dh<1)return;Rg=Math.sqrt(Math.max(Rn*Rn-dh*dh,1));k=cl(Math.round(Rg/hp.step)-1,0,NS-1);
    if(!ray.vis[k]){shadowed++;return;}
    const g=Math.asin(cl((hA-ray.h[k])/Rn,0,1)),cg=Math.cos(g);if(cg<.03)return;
    const ux=Math.sin(phi)*cg,uy=-Math.sin(g),uz=-Math.cos(phi)*cg;
    const dAz=Math.atan2(Math.sin(phi-az0),Math.cos(phi-az0))*Math.cos(el0),dEl=-g-el0,pg=pat(dAz,dEl,c.bwA,c.bwE,c.sll),p2=pg*pg;
    const gam=ray.h[k]<=1.5?gS:gL,area=(cell/cg)*(Rn*cg)*dphi,P=wt*gam*Math.sin(Math.max(g,.02))*area*p2/Math.pow(Rn,4);
    const pw=rho*P/Pt;if(pw<1e-9)return;const amp=Math.sqrt(pw),fd=2*(vp.x*ux+vp.y*uy+vp.z*uz)/lam,th=TWO*fd/prf,ph=Math.random()*TWO;
    let cr=Math.cos(ph),ci=Math.sin(ph);const sr=Math.cos(th),si=Math.sin(th);
    for(let m=0;m<N;m++){re[m]+=amp*cr;im[m]+=amp*ci;const t=cr*sr-ci*si;ci=cr*si+ci*sr;cr=t;}clutPow+=pw;patches++;};
  const pslW=un(psl);
  for(let n=0;n<nAmb;n++){const R0=Rapp+n*Ru;if(R0<c.agl*.98)continue;
    const fine=c.bwA*.5,coarse=16*D;
    const ring=(Rn,wt)=>{if(Rn<c.agl*1.02)return;for(let i=-9;i<=9;i++)add(Rn,az0+i*fine,fine,wt);for(let a=-Math.PI;a<Math.PI;a+=coarse){if(Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<9.5*fine)continue;add(Rn,az0+a,coarse,wt);}};
    ring(R0,1);
    // range sidelobes of the compressed pulse: neighbouring gates leak into this one at the code's peak sidelobe level
    if(Kc>1)for(let i=1;i<=4;i++){const wt=pslW/(i<=2?1:2);ring(R0+i*cell,wt);ring(R0-i*cell,wt);}}
  // noise (unit complex variance per sample) and the target with its fluctuation draw
  const gT=S.swerling(c.sig),aT=Math.sqrt(rho*gT),ft=2*c.rr/lam,thT=TWO*ft/prf,phT=Math.random()*TWO,cx=new Float64Array(N),cy=new Float64Array(N);
  for(let m=0;m<N;m++){cx[m]=re[m]+gauss()*.7071;cy[m]=im[m]+gauss()*.7071;}
  const cr2=new Float64Array(N),ci2=new Float64Array(N);
  for(let m=0;m<N;m++){cr2[m]=cx[m]*w[m];ci2[m]=cy[m]*w[m];}fft(cr2,ci2);
  const Pc=new Float64Array(N);for(let k=0;k<N;k++)Pc[k]=cr2[k]*cr2[k]+ci2[k]*ci2[k];
  const tr=new Float64Array(N),ti=new Float64Array(N);for(let m=0;m<N;m++){tr[m]=cx[m]+aT*Math.cos(phT+thT*m);ti[m]=cy[m]+aT*Math.sin(phT+thT*m);cr2[m]=tr[m]*w[m];ci2[m]=ti[m]*w[m];}fft(cr2,ci2);
  const Pt2=new Float64Array(N);for(let k=0;k<N;k++)Pt2[k]=cr2[k]*cr2[k]+ci2[k]*ci2[k];
  // filters: mainlobe-clutter line and the zero-Doppler band are blanked
  const binHz=prf/N,fML=2*c.vpl/lam,blank=new Uint8Array(N);
  for(let k=0;k<N;k++){const f=(k<N/2?k:k-N)*binHz;if(Math.abs(fold(f-fML,prf))<2*c.wMLC/lam||Math.abs(fold(f,prf))<2*c.wZDF/lam)blank[k]=1;}
  const kt=((Math.round(fold(ft,prf)/binHz)%N)+N)%N;
  if(blank[kt])return{f:0,blanked:1,clut:clutPow,patches,shadowed};
  // CA-CFAR on the clutter-plus-noise spectrum (without the target), peak taken from the spectrum with it
  let sum=0,cnt=0;for(let d=3;d<=14;d++)for(const sgn of[-1,1]){const k=((kt+sgn*d)%N+N)%N;if(blank[k])continue;sum+=Pc[k];cnt++;}
  const ref=Math.max(cnt?sum/cnt:w.s2,w.s2*.3);let pk=0;for(let d=-1;d<=1;d++){const k=((kt+d)%N+N)%N;if(!blank[k])pk=Math.max(pk,Pt2[k]);}
  return{f:cl(pk/ref/(c.s+1),0,3),blanked:0,clut:clutPow,patches,shadowed,g:gT,ref:ref/w.s2};};
console.log('[sensorsim] loaded');
})();
