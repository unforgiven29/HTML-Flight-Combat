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

// ---------- one PRF: returns {f, snrOut, clutDb, blanked}
// c: {lam, R, los, s (noise-limited SNR of the target), sig (rcs), vp (vec), rr, agl, sea, bwA, bwE, sll, wMLC, wZDF, vpl}
S.simPRF=function(c,prf,tau,Nn,H){const lam=c.lam,Ru=C/(2*prf),Rapp=c.R%Ru,N=Nn,w=hamming(N),rho=c.s*w.s2/(w.s1*w.s1);
  const re=new Float64Array(N),im=new Float64Array(N);
  const los=c.los,az0=Math.atan2(los.x,-los.z),el0=Math.asin(cl(los.y,-1,1)),gam=un(c.sea?(F.Q.clutterGammaSea==null?-25:F.Q.clutterGammaSea):(F.Q.clutterGammaTerrain==null?-15:F.Q.clutterGammaTerrain));
  const Pt=c.sig/Math.pow(c.R,4),vp=c.vp,nAmb=H?5:7,hz=4120*Math.sqrt(Math.max(c.agl,10))*1.15;
  let clutPow=0,patches=0;
  const add=(Rn,phi,dphi)=>{const g=Math.asin(cl(c.agl/Rn,0,1)),cg=Math.cos(g);if(cg<.03)return;
    const ux=Math.sin(phi)*cg,uy=-Math.sin(g),uz=-Math.cos(phi)*cg;
    const dAz=Math.atan2(Math.sin(phi-az0),Math.cos(phi-az0))*Math.cos(el0),dEl=-g-el0,pg=pat(dAz,dEl,c.bwA,c.bwE,c.sll),p2=pg*pg;
    const area=(C*tau/2/cg)*(Rn*cg)*dphi,P=gam*Math.sin(Math.max(g,.02))*area*p2/Math.pow(Rn,4);
    const pw=rho*P/Pt;if(pw<1e-9)return;const amp=Math.sqrt(pw),fd=2*(vp.x*ux+vp.y*uy+vp.z*uz)/lam,th=TWO*fd/prf,ph=Math.random()*TWO;
    let cr=Math.cos(ph),ci=Math.sin(ph);const sr=Math.cos(th),si=Math.sin(th);
    for(let m=0;m<N;m++){re[m]+=amp*cr;im[m]+=amp*ci;const t=cr*sr-ci*si;ci=cr*si+ci*sr;cr=t;}clutPow+=pw;patches++;};
  for(let n=0;n<nAmb;n++){const Rn=Rapp+n*Ru;if(Rn<c.agl*1.02)continue;if(Rn>hz&&n>0)break;
    // fine azimuth patches in and around the beam, coarse ones all the way round
    const fine=c.bwA*.5;for(let i=-9;i<=9;i++)add(Rn,az0+i*fine,fine);
    const coarse=16*D;for(let a=-Math.PI;a<Math.PI;a+=coarse){if(Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<9.5*fine)continue;add(Rn,az0+a,coarse);}}
  // clutter spectrum
  const cr2=new Float64Array(N),ci2=new Float64Array(N);for(let m=0;m<N;m++){cr2[m]=re[m]*w[m];ci2[m]=im[m]*w[m];}fft(cr2,ci2);
  const noise=w.s2,Pc=new Float64Array(N);for(let k=0;k<N;k++)Pc[k]=cr2[k]*cr2[k]+ci2[k]*ci2[k]+noise;
  // filters: bin k covers Doppler (k/N)·prf (folded); blank the mainlobe-clutter line and the zero-Doppler band
  const binHz=prf/N,fML=2*c.vpl/lam,blank=new Uint8Array(N);
  for(let k=0;k<N;k++){const f=(k<N/2?k:k-N)*binHz;if(Math.abs(fold(f-fML,prf))<2*c.wMLC/lam||Math.abs(fold(f,prf))<2*c.wZDF/lam)blank[k]=1;}
  const ft=2*c.rr/lam,kt=((Math.round(fold(ft,prf)/binHz)%N)+N)%N;
  if(blank[kt])return{f:0,blanked:1,clut:clutPow,patches};
  // CA-CFAR: reference cells either side of the target bin, guard cells excluded, blanked bins skipped
  let sum=0,cnt=0;for(let d=3;d<=14;d++)for(const sgn of[-1,1]){const k=((kt+sgn*d)%N+N)%N;if(blank[k])continue;sum+=Pc[k];cnt++;}
  const ref=cnt?sum/cnt:noise,own=Math.max(Pc[kt]-noise*0,0),denom=Math.max(ref,own*.5+noise*.5);
  return{f:cl(noise/denom,0,1.2),blanked:0,clut:clutPow,patches,ref:ref/noise};};
console.log('[sensorsim] loaded');
})();
