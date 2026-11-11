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
const D=Math.PI/180,C=299792458,RE0=6371000;let RE=RE0*4/3;const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const S=window.SENSOR_SIG||{},F=window.SENSOR_FUSE||{};
const RV=window.RAWVID={on:true,clut:true,rain:true,cu:true,gnd:true,chaff:true,det:true,prop:true,rcv:true,crt:true,side:true,bank:true,lock:true,jam:true,tgt:true,noise:true,mti:true,prf:0,tau:1.0e-6,tph:2.2,thr:2.5,span:30,
  st:{cols:0,ms:0,tgt:0,last:0,err:null,sl:0,fold:0,lk:0}};
const nR=192;let nA=0,V=null,T=null,AZ=0,RNG=0,BWk=0;RV.dump=()=>({V:V,T:T,nA:nA,nR:nR,AZ:AZ,RNG:RNG});
const clr=new Float32Array(nR),rainA=new Float32Array(nR);
const _f=new THREE.Vector3();
const ex=()=>-Math.log(1-Math.random());
const nz=()=>(ex()+ex()+ex()+ex())*.25;                     // video integrator: a few pulses per beam passage are averaged, so the grass is finer and an echo stands out                    // unit-mean exponential: noise and Rayleigh power fluctuation
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

/* ---------- range folding: a pulse set cannot tell an echo from this pulse from one of the pulse before (second-time-around) ---------- */
function prfOf(){const r=player&&player.ac&&player.ac.radar,p=r&&r.prf;return RV.prf||(p&&p<6000?p:1200);}
const Ru=()=>C/(2*prfOf());

/* ---------- STC (sensitivity time control): the receiver gain is cut at short range, 40 log(R) like the sea-clutter return, scaled by the knob ---------- */
if(typeof sys==='object'&&!sys.stc)sys.stc={depth:0};
function stcDB(R){const d=sys.stc?sys.stc.depth:0;if(d<.02)return 0;const Rs=cl(.3*RNG,6000,30000);return R>=Rs?0:-d*40*Math.log10(Rs/Math.max(R,600));}
/* receiver recovery after the main bang: the TR switch and the receiver are blind for the first kilometre or so */
const rcvF=R=>RV.rcv?1-Math.exp(-(R*R)/(1100*1100)):1;

/* ---------- propagation: refraction (surface duct), two-way rain attenuation ---------- */
function ductK(P){const U=windMs(),alt=P.pos.y,calm=cl(1.25-U/9,0,1),clear=(ENV&&ENV.rain>.05)?0:1,low=alt<400?1:alt<1600?(1600-alt)/1200:0;return 4/3+(RV.prop?1.7*calm*clear*low:0);}   // k 4/3 standard, up to ~3 in a calm surface duct over the sea
function rainMM(x,z,y,now){if(!ENV||!(ENV.rain>.04))return 0;const top=ENV.P&&ENV.P.strat>0?ENV.P.alt+ENV.P.th:3600;if(y>top||y<-50)return 0;const I=ENV.rain*rainField(x,z,now);return I>.03?I*50:0;}
const alphaDB=r=>.012*Math.pow(r,1.15);                      // one-way X-band attenuation, dB/km, for rain rate r mm/h
function pathAtt(P,pos,now){if(!RV.prop||!ENV||!(ENV.rain>.04))return 1;let L=0;const n=8,dx=pos.x-P.pos.x,dz=pos.z-P.pos.z,dy=pos.y-P.pos.y,d=Math.hypot(dx,dz,dy)/1000;
  for(let k=1;k<=n;k++){const t=(k-.5)/n;L+=alphaDB(rainMM(P.pos.x+dx*t,P.pos.z+dz*t,P.pos.y+dy*t,now))*2*d/n;}return Math.pow(10,-L/10);}

/* ---------- targets seen this frame (shared by every column written in the frame) ---------- */
const tg=[];RV.tgl=tg;const _gv=new THREE.Vector3(),_cp={};let tgNow=-1;
function addTarget(j,P,now,stab,lam,ru){
  const a=radar.ang(j.pos);if(a.d<60||a.d>3*ru)return;
  const dS=a.d<ru?a.d:a.d%ru;if(dS>RNG*1.05)return;                                  // second-time-around: an echo from beyond c/(2 PRF) lands at d mod Ru
  const toMe=P.pos.clone().sub(j.pos).normalize(),c=j.gnd?1:j.fwd(new THREE.Vector3()).dot(toMe);
  const Rt=radar.R0*Math.pow((j.ac.rcs||5)/5,.25)*(.62+.38*Math.max(0,c));            // same RCS / aspect law as the detector
  const ra=stab?a.az:(a.baz!=null?a.baz:a.az),re=stab?a.el:(a.bel!=null?a.bel:a.el);
  let st=j._rv;if(!st){st={f:ex(),t:-9};j._rv=st;}                                           // Swerling I: one draw per beam passage (refreshed below when the beam is on it)
  const J=j.gnd?null:radar.jam(j);let mt=1;
  if(RV.mti&&sys.mig&&sys.mig.mti){const los=toMe.clone().negate(),vr=(j.vel||_gv.set(0,0,0)).clone().sub(P.vel).dot(los),vb=lam*2000/2;mt=Math.pow(Math.sin(Math.PI*vr/vb),2)*.9+.1;if(j.chaff)mt=.12;}
  const jn=J&&J.noise&&!J.esc?Math.max(J.bt||1,1):0;
  tg.push({j:j,a:a,ra:ra,re:re,d:a.d,dS:dS,fold:a.d>=ru,S:SNR50*Math.pow(Rt/a.d,4),Rt:Rt,st:st,mt:mt,pf:window.BEAM&&!j.chaff?BEAM.k(j,a):1,jn:jn,Sbt:jn?SNR50*Math.pow(Rt/jn,4):0,
    att:pathAtt(P,j.pos,now),ext:j.chaff?Math.max(1,Math.round((20+15*j.age)*2/(RNG/nR))):1,chaff:!!j.chaff});}
function targets(now,P){tg.length=0;tgNow=now;if(!RV.tgt&&!RV.jam)return;
  const stab=radar.gl.stab,lam=C/(((F.reg&&F.reg.carrierFrequencyGHz)||9.7)*1e9),ru=Ru();
  for(const j of jets){if(j===P||!j.alive||(window.IFF&&IFF.hide&&IFF.hide(j)))continue;addTarget(j,P,now,stab,lam,ru);}
  if(RV.gnd&&typeof GND!=='undefined'&&GND.units)for(const u of GND.units){if(!u.alive)continue;                          // tanks, SAM sites, buildings, ships: ordinary radar targets
    if(typeof terrLOS==='function'&&!terrLOS(P.pos,_gv.copy(u.pos).setY(u.pos.y+2)))continue;addTarget(u,P,now,stab,lam,ru);}   // hills hide a ground target
  if(RV.chaff&&typeof decoys!=='undefined')for(const d of decoys){if(!d.alive||d.type!=='chaff')continue;
    const age=d.t||0,rc=18*Math.min(1,age/1.5)*Math.exp(-Math.max(0,age-5)/7);if(rc<.3)continue;                        // a bloom of dipoles: RCS grows as the cloud opens, then falls as it disperses
    addTarget({pos:d.pos,vel:d.vel||_cp,alive:true,gnd:true,chaff:true,age:age,ac:{rcs:rc}},P,now,stab,lam,ru);}}

/* ---------- cumulus rain cells: the same 300 cloud clusters the sky draws (same generator), the ones that rain get a core ---------- */
let cuAll=null;
function cuInit(){cuAll=[];let s=1;const R=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<300;i++){const cx=(R()*2-1)*72000,cz=(R()*2-1)*72000,cy=2300+R()*900,w=500+R()*1100;for(let k=0;k<64;k++)R();cuAll.push({i:i,x:cx,z:cz,y:cy,w:w,h:hash(i,91),k:hash(i,17)});}}
const cuList=[];
function cuNear(P,sx,sz,range){cuList.length=0;if(!RV.cu||!ENV||!(ENV.rain>.03))return;if(!cuAll)cuInit();
  const nvis=ENV.P&&ENV.P.cu!=null?ENV.P.cu:0,pr=cl(ENV.rain*.8,0,.9),base=ENV.P&&ENV.P.base||0;
  for(let i=0;i<nvis&&i<cuAll.length;i++){const c=cuAll[i];if(c.k>pr)continue;
    const dx=c.x-P.pos.x,dz=c.z-P.pos.z,s=dx*sx+dz*sz,q=Math.abs(dx*sz-dz*sx),rad=c.w*1.6;
    if(s<-rad||s>range+rad||q>rad*2.2)continue;
    const b0=c.y+base;cuList.push({s:s,q:q,rad:rad,b0:b0,top:b0+1200+c.h*(2000+4500*ENV.rain),I:.5+.5*hash(c.i,5)});}}

/* ---------- land cover from the terrain itself (the heightfield is all the game has): towns, forest, farmland, bare rock ---------- */
function landTex(x,z,h,sl){let k=.35+1.9*hash(Math.floor(x/1400),Math.floor(z/1400)),as=Math.abs(sl);
  if(h<350&&as<.08&&hash(Math.floor(x/4500)+91,Math.floor(z/4500)-37)>.93)k*=5;                         // a town: corner reflectors, +7 dB
  else if(h>=350&&h<1500&&as<.35&&hash(Math.floor(x/9000)+5,Math.floor(z/9000)+8)>.45)k*=1.5;       // forest canopy
  else if(h<350)k*=.55;                                                                                 // farmland and plains
  else if(h>2300||as>.5)k*=1.25;                                                                        // bare rock, steep faces
  return k;}

/* ---------- ground clutter along one ray, in the antenna frame (bank and pitch included for a non-stabilised antenna) ---------- */
const _v=new THREE.Vector3(),_b=new THREE.Vector3(),QI=new THREE.Quaternion(),QF=new THREE.Quaternion(),_Y=new THREE.Vector3(0,1,0);
const seaA=new Float32Array(nR),mC=new Float32Array(nR),mS=new Float32Array(nR),sC=new Float32Array(nR),sS=new Float32Array(nR);let wC=clr,wS=seaA,cc=0;
const OFFS=[[1.6,1.2,1],[3.2,2,1],[6.5,4,1],[13,8,2],[26,16,2],[50,30,3]];        // sidelobe rays: offset, width (beamwidths), range stride
function groundRay(X,hw,wid,fold,stride){
  const P=X.P,A=X.A,sx=Math.sin(hw),sz=-Math.cos(hw),y=P.pos.y,px=P.pos.x,pz=P.pos.z,bin=X.bin,Rf=Ru(),lim=fold?Math.min(Rf+RNG,3*Rf):RNG;
  let maxE=-2,prevH=X.h0,prevG=0,hh=Math.max(0,X.h0),R=bin*.5,n=0;
  while(R<lim&&n<1400){n++;const shown=R<RNG||(fold&&R>=Rf&&(R%Rf)<RNG),Rd=fold&&R>=Rf?R%Rf:R,step=shown?bin*stride:bin*4;
    {let dy=y-hh,q=R*R-dy*dy,g=q>0?Math.sqrt(q):0;const hs=Math.max(0,terrMesh(px+sx*g,pz+sz*g));dy=y-hs;q=R*R-dy*dy;g=q>0?Math.sqrt(q):0;
      if(g>.5||R>y-hs){const th=terrMesh(px+sx*g,pz+sz*g),sea=th<1;hh=Math.max(0,th);const curv=g*g/(2*RE),e=Math.atan2(hh-curv-y,Math.max(g,1));
        if(R>=y-hh-1&&e>=maxE-.0004){
          if(shown){const slope=g>prevG+1?(hh-Math.max(0,prevH))/(g-prevG):0,al=Math.atan2(y-hh+curv,Math.max(g,1));let psi=al+(sea?0:Math.atan(slope));
            if(psi>.002){
              _v.set(sx*g,hh-curv-y,sz*g).applyQuaternion(QI);const azb=Math.atan2(_v.x,-_v.z),elb=Math.atan2(_v.y,Math.hypot(_v.x,_v.z)),pt=pat1(wrap(azb-X.az)*Math.cos(elb),elb-radar.antEl,A.bwA,A.bwE,A.sll),g2=pt*pt;
              if(g2>1e-13){let s0;
                if(sea)s0=Math.pow(10,(-45+15*Math.log10(Math.max(psi/D,.1))+20*Math.log10(Math.max(X.U,2.5)/8))/10);
                else{const tx=landTex(px+sx*g,pz+sz*g,hh,slope);s0=.0079*tx*Math.sin(Math.min(psi,1.5));}
                if(psi>1.2)s0*=1+(sea?800:300)*Math.pow((psi-1.2)/.37,2);                                   // near-vertical: specular return, the altitude line
                s0=Math.min(s0,40);
                const v=X.Su*s0*R*wid*X.dR/Math.max(Math.cos(Math.min(psi,1.45)),.2)/(R*R*R*R)*g2*X.wex*rcvF(R),ir=Math.floor(Rd/bin),arr=sea?wS:wC;
                for(let k=0;k<(R<RNG?stride:1);k++){const j=ir+k;if(j>=0&&j<nR)arr[j]+=v;}
                if(R>=RNG)RV.st.fold++;}}}
          prevH=th;prevG=g;}
        maxE=Math.max(maxE,e);}}
    R+=step;}}

/* ---------- one azimuth column ---------- */
const attC=new Float32Array(nR);
function column(X,az,now,fresh){
  clr.fill(0);rainA.fill(0);seaA.fill(0);X.az=az;cc++;const P=X.P,A=X.A;
  _b.set(Math.sin(az)*Math.cos(radar.antEl),Math.sin(radar.antEl),-Math.cos(az)*Math.cos(radar.antEl)).applyQuaternion(QF);          // boresight in the world: bank and pitch are in QF
  const hwb=Math.atan2(_b.x,-_b.z),elw=Math.asin(cl(_b.y,-1,1));
  if(RV.clut){                      // the beam is oversampled four times, so the terrain is traced on every second column and the sidelobe rays on every fourth; the columns in between reuse them
    if(fresh||cc%2===0||!X.warm){wC=mC;wS=mS;mC.fill(0);mS.fill(0);groundRay(X,hwb,A.bwA,true,1);}
    if(RV.side&&(fresh||cc%4===0||!X.warm)){wC=sC;wS=sS;sC.fill(0);sS.fill(0);for(const o of OFFS)for(const sg of[-1,1]){if(o[0]*A.bwA>Math.PI)continue;groundRay(X,hwb+sg*o[0]*A.bwA,o[1]*A.bwA,false,o[2]);RV.st.sl++;}}
    else if(!RV.side){sC.fill(0);sS.fill(0);}
    wC=clr;wS=seaA;for(let i=0;i<nR;i++){clr[i]=mC[i]+sC[i];seaA[i]=mS[i]+sS[i];}X.warm=true;}
  const rainOn=RV.rain&&ENV&&ENV.rain>.04,top=rainOn?(ENV.P&&ENV.P.strat>0?ENV.P.alt+ENV.P.th:3600):0,sx=Math.sin(hwb),sz=-Math.cos(hwb),ceh=Math.cos(elw),y=P.pos.y,hv=A.bwE*.5;
  cuNear(P,sx,sz,RNG*ceh+3000);let cum=1;
  for(let ir=0;ir<nR;ir++){const R=(ir+.5)*X.bin,Rg=R*ceh,yb=y+R*Math.sin(elw)-Rg*Rg/(2*RE);let r=0,mm=0;
    if(rainOn&&yb<top&&yb>-50){const I=ENV.rain*rainField(P.pos.x+sx*Rg,P.pos.z+sz*Rg,now);if(I>.03){r+=.25*SNR50*Math.pow(radar.R0/R,2)*Math.pow(I,1.4);mm=Math.max(mm,I*50);}}
    for(const c of cuList){const ds=Rg-c.s,r2=(ds*ds+c.q*c.q)/(c.rad*c.rad);if(r2>6)continue;const h=Math.max(R*hv,150),ov=cl((Math.min(c.top,yb+h)-Math.max(c.b0,yb-h))/(2*h),0,1);
      if(ov>0){r+=.9*SNR50*Math.pow(radar.R0/R,2)*Math.pow(c.I,1.4)*Math.exp(-r2)*ov;mm=Math.max(mm,c.I*Math.exp(-r2)*ov*50);}}
    rainA[ir]=r*X.wex*cum*rcvF(R);attC[ir]=cum;
    if(mm>0&&RV.prop)cum*=Math.pow(10,-2*alphaDB(mm)*(X.bin*ceh/1000)/10);}                       // two-way loss through the cell: everything behind it is dimmer
  if(RV.prop)for(let ir=0;ir<nR;ir++){clr[ir]*=attC[ir];seaA[ir]*=attC[ir];}
}

/* ---------- build the shared frame state (antenna frame, constants); used by the sweep and by the detector ---------- */
function mkX(now,P){setup();const A=ant(),f=P.fwd(_f),h0=Math.atan2(f.x,-f.z),stab=radar.gl.stab,mti=!!(sys.mig&&sys.mig.mti&&RV.mti),bin=RNG/nR;
  RE=RE0*ductK(P);
  if(stab||!RV.bank)QI.setFromAxisAngle(_Y,h0);else QI.copy(P.q).invert();QF.copy(QI).invert();           // a stabilised antenna keeps the horizon (yaw only), a fixed one rolls and pitches with the aircraft
  return{P:P,A:A,bin:bin,dR:C*RV.tau/2,Su:SNR50*Math.pow(radar.R0,4)/5,U:windMs(),wex:mti?.08:1,h0:terrMesh(P.pos.x,P.pos.z),az:0};}

/* ---------- sweep: write every column the antenna crossed since the last call ---------- */
RV.sweep=function(a0,a1,now){
  const P=player;if(!RV.on||!P||!P.alive||!P.ac||!P.ac.pulse||radar.sensor!=='RDR'||!radar.on())return;
  const t0=performance.now();const X=mkX(now,P);const lo=Math.min(a0,a1),hi=Math.max(a0,a1),i0=cl(Math.floor((lo/AZ*.5+.5)*nA),0,nA-1),i1=cl(Math.floor((hi/AZ*.5+.5)*nA),0,nA-1);
  const A=X.A,bin=X.bin;targets(now,P);const spread=Math.max(2,Math.round(C*tau()/2/bin));
  for(let ia=i0;ia<=i1;ia++){const az=((ia+.5)/nA*2-1)*AZ;column(X,az,now);
    const base=ia*nR,row=new Float32Array(nR);
    for(let ir=0;ir<nR;ir++){let v=RV.noise?nz():.2;if(clr[ir]>0)v+=clr[ir]*nz();if(seaA[ir]>0)v+=seaA[ir]*ex()*ex()*.7;if(rainA[ir]>0)v+=rainA[ir]*nz();row[ir]=v;}   // sea clutter is spiky: heavier tailed than land
    if(RV.clut){                                                                            // main bang: transmitter leakage and recovery
      for(let ir=0;ir<nR;ir++){const R=(ir+.5)*bin;if(R>2500)break;row[ir]+=1.5e3*Math.exp(-R/230);}}
    for(const q of tg){
      let dA=wrap(q.ra-az);const ce=Math.cos(q.re),p=pat1(dA*ce,q.re-radar.antEl,A.bwA,A.bwE,A.sll);
      if(q.jn&&RV.jam){const Jp=q.Sbt*Math.pow(q.jn/Math.max(q.d,200),2)*p;if(Jp>.05)for(let ir=0;ir<nR;ir++)row[ir]+=Jp*ex();}
      if(!RV.tgt)continue;const g2=p*p;if(g2<2e-4)continue;if(g2>.05){if(now-q.st.t>1.0)q.st.f=ex();q.st.t=now;}
      const ir0=Math.floor(q.dS/bin);if(ir0<0||ir0>=nR)continue;
      const mag=RV.rcv?Math.max(.3,1+.22*(Math.random()+Math.random()+Math.random()-1.5)):1;                          // magnetron frequency pulling: the echo sparkles pulse to pulse
      const pw=q.S*g2*q.pf*q.st.f*q.mt*q.att*rcvF(q.dS)*mag;if(pw<.05)continue;
      const sp=Math.max(spread,q.ext);for(let k=0;k<sp;k++){const ir=ir0+k-(q.chaff?sp>>1:0);if(ir<0)continue;if(ir>=nR)break;row[ir]+=pw*(k&&!q.chaff?.55:1)*(q.chaff?.55+.45*ex():1);}
      if(g2>.1)RV.st.tgt++;}
    if(RV.rcv){                                                                              // AGC: a very strong return desensitises the receiver for the next few cells, and the IF stage saturates
      for(let ir=0;ir<nR;ir++){let v=row[ir];if(v>3e4){const f=.45;if(ir+1<nR)row[ir+1]*=f;if(ir+2<nR)row[ir+2]*=.7;v=3e4+(v-3e4)*.15;}row[ir]=Math.min(v,1e5);}}
    for(let ir=0;ir<nR;ir++){V[base+ir]=row[ir];T[base+ir]=now;}
    RV.st.cols++;}
  RV.st.ms+=performance.now()-t0;};
function tau(){return RV.tau;}

/* ---------- one detector: the same echo, noise, clutter, rain and chaff the scope shows, as a cell-averaging signal-to-background ratio ---------- */
const dc=new WeakMap();
RV.det=function(j,a,loss){const P=player,now=performance.now()/1000;
  const c=dc.get(j);if(c&&now-c.t<.04&&Math.abs(c.l-loss)<1e-3)return c.s;
  if(!radar.on()||!terrLOS(P.pos,j.pos))return 0;
  const X=mkX(now,P);if(tgNow<0||now-tgNow>.05)targets(now,P);
  const ru=Ru(),toMe=P.pos.clone().sub(j.pos).normalize(),cs=j.gnd?1:j.fwd(new THREE.Vector3()).dot(toMe);
  const Rt=radar.R0*Math.pow((j.ac.rcs||5)/5,.25)*(.62+.38*Math.max(0,cs)),d=a.d,dS=d<ru?d:d%ru;
  const J=j.gnd?null:radar.jam(j);if(J&&J.noise&&d>J.bt)return 0;
  const stab=radar.gl.stab,ra=stab?a.az:(a.baz!=null?a.baz:a.az),bin=X.bin,ir0=cl(Math.floor(dS/bin),0,nR-1);
  let mt=1;if(RV.mti&&sys.mig&&sys.mig.mti){const lam=C/(((F.reg&&F.reg.carrierFrequencyGHz)||9.7)*1e9),vr=j.vel.clone().sub(P.vel).dot(toMe.clone().negate()),vb=lam*2000/2;mt=Math.pow(Math.sin(Math.PI*vr/vb),2)*.9+.1;}
  let s=SNR50*Math.pow(Rt/d,4)*loss*mt*pathAtt(P,j.pos,now)*rcvF(dS);
  column(X,ra,now);                                                                         // the background in the target's own cell, at the bearing the antenna is looking
  let bg=1+clr[ir0]+seaA[ir0]*.7+rainA[ir0];
  for(const q of tg){if(!q.chaff||q.j===j)continue;const p=pat1(wrap(q.ra-ra)*Math.cos(q.re),q.re-radar.antEl,X.A.bwA,X.A.bwE,X.A.sll);
    if(Math.abs(Math.floor(q.dS/bin)-ir0)<=q.ext)bg+=q.S*p*p*q.mt*q.att;}                    // sitting inside a chaff cloud is sitting in clutter
  s=s/bg*Math.pow(10,(((sys.mig&&sys.mig.fgain!=null&&(player.ac.pit==='flogger'||player.ac.pit==='foxbat'||player.ac.pit==='fishbed')?sys.mig.fgain:sys.fcr.gain)||.6)-.6)*1.8);
  dc.set(j,{t:now,l:loss,s:s});return s;};

/* ---------- the same background for anybody else's radar (AI jets, SAM / GCI sites, missile seekers): the echo is not noise-limited, it is limited by what is in the target's cell ---------- */
const aiX={P:{pos:null},A:{bwA:3.3*D,bwE:3.3*D,sll:-21},bin:300,dR:C*1e-6/2,Su:0,U:0,wex:1,h0:0,az:0};
RV.bgAny=function(op,tp,R0,bw){const now=performance.now()/1000,dx=tp.x-op.x,dz=tp.z-op.z,dy=tp.y-op.y,d=Math.max(Math.hypot(dx,dy,dz),50),hw=Math.atan2(dx,-dz),el=Math.atan2(dy,Math.hypot(dx,dz));
  const sEl=radar.antEl,sRE=RE;RE=RE0*4/3;aiX.P.pos=op;aiX.A.bwA=aiX.A.bwE=bw||3.3*D;aiX.bin=Math.max(100,d*1.15/nR);aiX.Su=SNR50*Math.pow(R0,4)/5;aiX.U=windMs();aiX.h0=terrMesh(op.x,op.z);aiX.az=0;
  clr.fill(0);seaA.fill(0);QI.setFromAxisAngle(_Y,hw);radar.antEl=el;
  try{groundRay(aiX,hw,aiX.A.bwA,false,1);}finally{radar.antEl=sEl;RE=sRE;}
  const ir=cl(Math.floor(d/aiX.bin),0,nR-1);let bg=1+clr[ir]+seaA[ir]*.7;
  if(RV.rain&&ENV&&ENV.rain>.04){const top=ENV.P&&ENV.P.strat>0?ENV.P.alt+ENV.P.th:3600;if(tp.y<top){const I=ENV.rain*rainField(tp.x,tp.z,now);if(I>.03)bg+=.25*SNR50*Math.pow(R0/d,2)*Math.pow(I,1.4);}}
  if(RV.chaff&&typeof decoys!=='undefined')for(const c of decoys){if(!c.alive||c.type!=='chaff')continue;const age=c.t||0,rc=18*Math.min(1,age/1.5)*Math.exp(-Math.max(0,age-5)/7);if(rc<.3)continue;
    const cx=c.pos.x-op.x,cy=c.pos.y-op.y,cz=c.pos.z-op.z,dc=Math.hypot(cx,cy,cz);if(Math.abs(dc-d)>Math.max(150,20+15*age))continue;
    if((cx*dx+cy*dy+cz*dz)/(dc*d)<Math.cos(aiX.A.bwA))continue;bg+=SNR50*Math.pow(R0*Math.pow(rc/5,.25)/dc,4)*(RV.mti?1:1);}
  return{bg:bg,att:pathAtt({pos:op},tp,now),ds:d};};
RV.ductK=ductK;RV.stcDB=stcDB;

/* ---------- paint: video -> brightness (gain knob, log amplifier), phosphor decay, scope geometry from the caller's mapping m(u,v) ---------- */
let cv=null,cx=null,img=null,cW=0,cH=0;
function rgbOf(s){if(typeof s!=='string')return[141,255,180];let m=/^#([0-9a-f]{6})$/i.exec(s.trim());if(m){const n=parseInt(m[1],16);return[n>>16&255,n>>8&255,n&255];}
  m=/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s.trim());if(m)return[parseInt(m[1],16)*17,parseInt(m[2],16)*17,parseInt(m[3],16)*17];
  m=/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(s);return m?[+m[1],+m[2],+m[3]]:[141,255,180];}
RV.bright=function(v,GdB){const dB=10*Math.log10(Math.max(v,1e-3))+GdB-RV.thr;return Math.pow(cl(dB/RV.span,0,1),.7);};
RV.paint=function(c,m,px,base){
  if(!V||RNG!==radar.rngM||Math.abs(AZ-flClutter.AZ)>1e-6)return;
  const now=performance.now()/1000,Gd0=(gainOf()-.5)*18,col=rgbOf(c.strokeStyle),tph=RV.tph,stc=new Float32Array(nR);for(let k=0;k<nR;k++)stc[k]=stcDB((k+.5)/nR*RNG);
  const p00=m(-1,0),p11=m(1,1),pm=m(0,.5),p10=m(1,0),p01=m(-1,1);
  const aff=p00&&p11&&pm&&p10&&p01&&p11.x>p00.x&&p11.y<p00.y&&Math.abs(pm.x-(p00.x+p11.x)/2)<1.5&&Math.abs(pm.y-(p00.y+p11.y)/2)<1.5&&Math.abs(p10.y-p00.y)<1.5&&Math.abs(p01.x-p00.x)<1.5;
  if(aff){
    if(!cv||cW!==nA||cH!==nR){cv=document.createElement('canvas');cv.width=cW=nA;cv.height=cH=nR;cx=cv.getContext('2d');img=cx.createImageData(nA,nR);}
    const id=img.data;
    for(let ia=0;ia<nA;ia++)for(let ir=0;ir<nR;ir++){const i=ia*nR+ir,age=now-T[i],p=((nR-1-ir)*nA+ia)*4;
      if(age>6||T[i]===0){id[p+3]=0;continue;}
      const b=RV.bright(V[i],Gd0+stc[ir]);
      if(RV.crt){const Ig=b*Math.exp(-age/tph),If=b*Math.exp(-age/.14)*.8,t=If/(If+Ig+1e-3);          // two-layer phosphor: a short white-blue flash over the long green afterglow
        id[p]=col[0]+(215-col[0])*t;id[p+1]=col[1]+(255-col[1])*t;id[p+2]=col[2]+(240-col[2])*t;id[p+3]=Math.round(clamp((Ig+If)*1.2,0,1)*255);}
      else{const I=b*Math.exp(-age/tph);id[p]=col[0];id[p+1]=col[1];id[p+2]=col[2];id[p+3]=Math.round(clamp(I*1.25,0,1)*255);}}
    cx.putImageData(img,0,0);
    const sv=c.globalAlpha,sw=p11.x-p00.x,sh=p00.y-p11.y,cs=c.globalCompositeOperation;const jx=RV.crt?(Math.random()-.5)*.5:0,jy=RV.crt?(Math.random()-.5)*.5:0,df=RV.crt?1.2+Math.max(0,Gd0)*.22:1.2;c.globalAlpha=base;c.imageSmoothingEnabled=true;c.drawImage(cv,p00.x+jx,p11.y+jy,sw,sh);
    c.globalCompositeOperation='lighter';c.globalAlpha=base*.9;c.drawImage(cv,p00.x-df+jx,p11.y-df*1.33+jy,sw+2*df,sh+2.66*df);   // spot bloom: a one-bin echo is still a visible dash on the tube
    c.globalCompositeOperation=cs;c.globalAlpha=sv;
    return;}
  // non-affine mapping (HUD repeater): short horizontal strokes, only for cells bright enough to matter
  const du=2/nA*.62,lv=[[],[],[]];
  for(let ia=0;ia<nA;ia++)for(let ir=0;ir<nR;ir++){const i=ia*nR+ir,age=now-T[i];if(age>4.5||T[i]===0)continue;
    const I=RV.bright(V[i],Gd0+stc[ir])*Math.exp(-age/tph);if(I<.18)continue;lv[I>.6?2:I>.35?1:0].push((ia+.5)/nA*2-1,(ir+.5)/nR);}
  c.lineCap='round';
  lv.forEach((arr,k)=>{if(!arr.length)return;c.globalAlpha=base*[.4,.7,1][k];c.lineWidth=px*[1.5,2,2.8][k];c.beginPath();
    for(let q=0;q<arr.length;q+=2){const a=m(arr[q]-du,arr[q+1]),b=m(arr[q]+du,arr[q+1]);if(a&&b){c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);}}c.stroke();});
  c.globalAlpha=base;c.lineCap='butt';};


/* ---------- lock-on video: a range-gated A-scope of the locked target (conical scan: the beam is squinted and nutated, the echo is amplitude modulated by the pointing error) ---------- */
const lkHist=[];let lkT=0;
RV.lockPaint=function(c,x0,y0,x1,y1,col){
  const P=player,j=radar.lock;if(!RV.on||!RV.lock||!P||!j||!j.alive||!P.ac||!P.ac.pulse||radar.sensor!=='RDR')return false;
  const now=performance.now()/1000,a=radar.ang(j.pos),A=ant(),toMe=P.pos.clone().sub(j.pos).normalize(),cs=j.gnd?1:j.fwd(new THREE.Vector3()).dot(toMe);
  const Rt=radar.R0*Math.pow((j.ac.rcs||5)/5,.25)*(.62+.38*Math.max(0,cs)),S0=SNR50*Math.pow(Rt/a.d,4)*(window.BEAM?BEAM.k(j,a):1);
  const nutF=30,sq=.3*A.bwA,N=4,w=x1-x0,h=y1-y0,gate=1500,bins=96,st=j._rv||(j._rv={f:ex(),t:-9});
  if(now-st.t>1.0){st.f=ex();}st.t=now;
  c.save();c.beginPath();c.rect(x0,y0,w,h);c.clip();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=1;c.globalAlpha=.35;c.strokeRect(x0+.5,y0+.5,w-1,h-1);
  const tr=[];let pk=0;
  const sweepRow=()=>{const row=new Float32Array(bins),ph=2*Math.PI*nutF*now,oa=(a.az-radar.antAz)*Math.cos(a.el)-sq*Math.cos(ph),oe=(a.el-radar.antEl)-sq*Math.sin(ph),pt=pat1(oa,oe,A.bwA,A.bwE,A.sll),pw=S0*pt*pt*st.f,ctr=bins/2;
    for(let i=0;i<bins;i++){const R=a.d+(i-ctr)/bins*2*gate;let v=nz();v+=Math.max(0,clr[Math.min(nR-1,Math.max(0,Math.floor(R/(RNG/nR))))])*nz()*0;const u=(i-ctr)/bins*2*gate/(C*RV.tau/2);v+=pw*Math.exp(-u*u*2.8);row[i]=v;}
    const Jm=j.gnd?null:radar.jam(j),bw=2*gate/bins,add=(off,pw2,wd)=>{const c0=ctr+off/bw;for(let i=Math.max(0,Math.floor(c0-wd*3)),e=Math.min(bins-1,Math.ceil(c0+wd*3));i<=e;i++){const u=(i-c0)/wd;row[i]+=pw2*Math.exp(-u*u*.5);}};
    if(Jm&&RV.jam){if(Jm.noise){const Jp=SNR50*Math.pow(Rt/Math.max(Jm.bt,1),4)*Math.pow(Jm.bt/Math.max(a.d,200),2)*pt*pt;if(Jp>.05)for(let i=0;i<bins;i++)row[i]+=Jp*ex();}                 // noise jamming raises the whole trace: burn-through is where the echo climbs out of it
      else if(Jm.dec&&radar.pull>.02)add(radar.rngErr,Math.max(pw,SNR50*.5)*(1.4+radar.pull)*(.7+.3*ex()),2.2);}                                                  // range-gate pull-off: the repeater's false echo walks away from the real one
    if(RV.chaff&&typeof decoys!=='undefined')for(const cd of decoys){if(!cd.alive||cd.type!=='chaff')continue;const age=cd.t||0,rc=18*Math.min(1,age/1.5)*Math.exp(-Math.max(0,age-5)/7);if(rc<.3)continue;
      const dd=cd.pos.distanceTo(P.pos),off=dd-a.d;if(Math.abs(off)>gate*1.1)continue;add(off,SNR50*Math.pow(radar.R0*Math.pow(rc/5,.25)/dd,4)*(.6+.4*ex())*.5,Math.max(3,(20+15*age)/bw*1.2));}    // a chaff cloud: a broad, ragged return in the gate
    return{row:row,mod:pt*pt};};
  const rw=sweepRow();lkHist.push(rw.mod*S0*st.f);if(lkHist.length>90)lkHist.shift();
  const GdB=(gainOf()-.5)*18+stcDB(a.d),amp=v=>cl((10*Math.log10(Math.max(v,1e-3))+GdB-3)/40,0,1);
  const ah=h*.58,ay=y0+h*.04+ah;c.globalAlpha=.95;c.lineWidth=1.5;c.beginPath();
  for(let i=0;i<bins;i++){const X=x0+w*(i/(bins-1)),Y=ay-amp(rw.row[i])*ah;i?c.lineTo(X,Y):c.moveTo(X,Y);}c.stroke();
  c.globalAlpha=.55;c.setLineDash([3,4]);{const gx=x0+w*cl(.5+(radar.rngErr||0)/(2*gate),.02,.98);c.beginPath();c.moveTo(gx,y0+h*.04);c.lineTo(gx,ay);c.stroke();}c.setLineDash([]);   // the tracking gate: it follows the displayed range, so a pull-off drags it off the target
  const by=y0+h*.7,bh=h*.26;c.globalAlpha=.5;c.beginPath();c.moveTo(x0,by+bh);c.lineTo(x1,by+bh);c.stroke();c.globalAlpha=.95;c.lineWidth=1.4;c.beginPath();       // nutation envelope: the lock-on error signal
  for(let i=0;i<lkHist.length;i++){const X=x0+w*(i/89),Y=by+bh-amp(lkHist[i])*bh;i?c.lineTo(X,Y):c.moveTo(X,Y);}c.stroke();
  c.restore();RV.st.lk++;return true;};

/* ---------- hooks ---------- */
/* the detector reads the same video the scope shows (pulse sets only): a target buried in clutter, rain or chaff cannot be locked, and a lock fades out when its echo does */
const isP=r=>RV.on&&RV.det&&player&&player.ac&&player.ac.pulse&&r.sensor==='RDR';
{const _s=radar.snr1;radar.snr1=function(j,a,loss){if(isP(this)&&this.on()){try{return RV.det(j,a,loss==null?1:loss);}catch(e){RV.st.err=String(e&&e.message||e);}}return _s.call(this,j,a,loss);};}
{const _d=radar.detect1;radar.detect1=function(j,a){if(isP(this)&&this.on()){try{const J=this.jam(j);if(J&&J.noise&&a.d>J.bt)return false;return pdOf(RV.det(j,a,1)*8)>=.5;}catch(e){RV.st.err=String(e&&e.message||e);}}return _d.call(this,j,a);};}

{const _s=window.flClutterSweep;window.flClutterSweep=function(a0,a1){const r=_s.apply(this,arguments);try{RV.sweep(a0,a1,performance.now()/1000);}catch(e){RV.st.err=String(e&&e.message||e);}return r;};}
{const _p=window.flPaint;window.flPaint=function(c,m,px,base){if(RV.on&&V&&player&&player.ac&&player.ac.pulse){try{RV.paint(c,m,px,base);return;}catch(e){RV.st.err=String(e&&e.message||e);}}return _p.apply(this,arguments);};}
{const _j=window.jamPaint;if(typeof _j==='function')window.jamPaint=function(){if(RV.on&&V&&player&&player.ac&&player.ac.pulse&&radar.sensor==='RDR')return;return _j.apply(this,arguments);};}   // the strobe is now in the video
const RD=window.RADARDBG;
if(RD){const _r=RD.extraRows;RD.extraRows=()=>{const L=_r?_r():[];L.push('','RAWVID  '+(RV.on?'ON':'OFF')+'  '+nA+' x '+nR+' cells  tau '+(RV.tau*1e6).toFixed(1)+' us  cols '+RV.st.cols+'  blips '+RV.st.tgt+'  '+(RV.st.cols?(RV.st.ms/RV.st.cols).toFixed(3):'0')+' ms/col'+(RV.st.err?'  ERR '+RV.st.err:''));return L;};}
})();
