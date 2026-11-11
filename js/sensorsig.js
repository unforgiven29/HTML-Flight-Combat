/* v273 — pulse-Doppler signal processing (waveform level) for the player's fire-control radar.
   Replaces the old two shortcuts (a fixed eclipse band and a smooth-step Doppler notch) with a processor evaluated per target:
     * waveform: LPRF / MPRF (a staggered set of PRFs) / HPRF (three close PRFs, high duty), chosen by the PRF switch (A / AUTO / B)
       and interleaved in time in AUTO. Pulse width, duty, number of pulses per CPI, PRI stagger, M-of-N detection.
     * range eclipsing: a return that arrives while the transmitter is on is blanked, per PRF, with the radar's own pulse width and duty.
     * Doppler: the ownship-compensated mainlobe clutter line (fML = 2·Vp·cosψ/λ) with its beam-spread width, the zero-Doppler filter,
       the altitude line, the sidelobe-clutter band (±2·Vp/λ) and ambiguity folding by each PRF — so blind speeds appear where the
       target's own line-of-sight speed is a multiple of the PRF's ambiguous velocity (λ·PRF/2).
     * sidelobe clutter: for every ambiguous range cell the clutter power from the ring of ground at the target's Doppler is summed
       (sigma0 from the registry's grazing-angle gamma, antenna sidelobe level, pulse length, Doppler-filter width) -> SCR -> SNR loss.
     * a CFAR loss and a coherent-integration gain from the pulses-per-CPI.
   Data: public figures where they exist (see docs/radar_waveform_data.md), otherwise typical values for the radar's class. */
(function(){
'use strict';
const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'){console.warn('[sensorsig] fuse missing');return;}
const Q=F.Q,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),un=x=>Math.pow(10,x/10),C=299792458,D=Math.PI/180;
const S=window.SENSOR_SIG={on:true,last:null,cache:new Map(),stats:{n:0,blind:0,ecl:0}};

// ---- waveform parameters per radar. prfM: medium-PRF base set (Hz); prfH: high-PRF set; tauM/tauH: pulse width (µs); dutyH: HPRF duty;
// sll: one-way first-sidelobe level (dB below peak); mlc/zdf: mainlobe-clutter / zero-Doppler filter half-width (m/s); N: pulses per CPI; hprf: has a high-PRF mode;
// M/Nn: detections needed of PRFs transmitted; cfar: CFAR loss (dB).
// AWG-9 and APG-59 filter widths are the DCS-published figures (±133/±100 kt, ±110/±50 kt); N019 HPRF window (230–2500 km/h closure) and
// the Su-27/MiG-29 mixed H/M interleave are from the open literature; the rest are typical values for the class.
const kt=.5144;
const WF={
 'APG-66(V)1':{prfM:[10500,11300,12100,13100,14200,15300,16500,17800],tauM:1.4,dutyM:.05,sll:-26,mlc:55,zdf:30,N:32,hprf:0,M:3,cfar:1.4},
 'APG-68':{prfM:[10200,11000,11900,12900,14000,15200,16500,17900],tauM:1.2,dutyM:.045,sll:-30,mlc:50,zdf:28,N:48,hprf:1,M:3,cfar:1.2,hprfVSonly:1},
 'APG-68(V)5':{prfM:[10200,11000,11900,12900,14000,15200,16500,17900],tauM:1.1,dutyM:.045,sll:-32,mlc:48,zdf:26,N:64,hprf:1,M:3,cfar:1.1,hprfVSonly:1},
 'APG-63':{prfM:[9800,10600,11500,12500,13600,14800,16100,17500],tauM:1.5,dutyM:.06,sll:-28,mlc:52,zdf:30,N:48,hprf:1,M:3,cfar:1.3},
 'APG-70':{prfM:[9800,10600,11500,12500,13600,14800,16100,17500],tauM:1.3,dutyM:.055,sll:-31,mlc:48,zdf:26,N:64,hprf:1,M:3,cfar:1.1},
 'APG-73':{prfM:[10000,10900,11900,13000,14200,15500,16900,18400],tauM:1.2,dutyM:.05,sll:-32,mlc:46,zdf:25,N:64,hprf:1,M:3,cfar:1.0},
 'APG-79':{prfM:[10000,11000,12100,13300,14600,16000,17600,19300],tauM:1,dutyM:.05,sll:-38,mlc:36,zdf:20,N:96,hprf:1,M:3,cfar:.8},
 'AWG-9':{prfM:[],tauM:2,dutyM:.06,prfH:[250000,263000,277000],tauH:2,dutyH:.2,sll:-27,mlc:133*kt,zdf:100*kt,N:128,hprf:1,M:2,cfar:1.5,pdOnly:1},
 'N019':{prfM:[9600,10500,11500,12600,13800],tauM:1.8,dutyM:.07,prfH:[198000,214000,231000],tauH:1.6,dutyH:.32,sll:-25,mlc:64,zdf:40,N:48,hprf:1,M:3,cfar:1.7,hClose:[64,694]},
 'N019M':{prfM:[9600,10500,11500,12600,13800],tauM:1.6,dutyM:.065,prfH:[198000,214000,231000],tauH:1.5,dutyH:.3,sll:-28,mlc:56,zdf:34,N:64,hprf:1,M:3,cfar:1.4,hClose:[64,694]},
 'N001':{prfM:[9500,10400,11400,12500,13700],tauM:1.8,dutyM:.07,prfH:[196000,212000,229000],tauH:1.6,dutyH:.32,sll:-26,mlc:62,zdf:38,N:48,hprf:1,M:3,cfar:1.6},
 'Zhuk-ME':{prfM:[9800,10700,11700,12800,14000],tauM:1.4,dutyM:.06,prfH:[210000,226000,243000],tauH:1.3,dutyH:.28,sll:-30,mlc:50,zdf:30,N:64,hprf:1,M:3,cfar:1.2},
 'Zaslon':{prfM:[10000,11000,12100,13300,14600],tauM:1.2,dutyM:.06,prfH:[220000,238000,256000],tauH:1.2,dutyH:.3,sll:-33,mlc:44,zdf:26,N:96,hprf:1,M:3,cfar:1.0}};
const GENW={prfM:[10000,11000,12100,13300,14600,16000],tauM:1.5,dutyM:.055,prfH:[210000,226000,243000],tauH:1.5,dutyH:.28,sll:-27,mlc:55,zdf:32,N:48,hprf:1,M:3,cfar:1.4};
function wfOf(){const n=player&&player.ac&&player.ac.radar&&player.ac.radar.name;return WF[n]||(n&&WF[n.replace(/\(V\)\d$/,'')])||GENW;}
S.wfOf=wfOf;

// waveform choice: A = high PRF (MiG) / up-look, B = medium PRF (down-look), AUTO = interleave scan lines H/M (M only when closing is low or the radar has no HPRF)
function pick(w,closing,look){const p=radar.prf;
  if(!w.hprf||(w.hprfVSonly&&radar.xm!=='VS'))return'M';
  if(w.pdOnly&&p==='B')return'H';
  if(p==='A')return'H';if(p==='B')return'M';
  if(radar.xm==='VS')return'H';
  const alt=Math.floor(performance.now()/1000/0.9)%2;     // interleaved: one bar high, the next medium
  return alt?'H':'M';}

const fold=(x,p)=>{const r=((x%p)+p*1.5)%p-p*.5;return r;};   // fold into [-p/2,p/2)
const gam=(sea)=>un(sea?(Q.clutterGammaSea==null?-25:Q.clutterGammaSea):(Q.clutterGammaTerrain==null?-15:Q.clutterGammaTerrain));
const _a=new THREE.Vector3(),_b=new THREE.Vector3();
const gAt=(x,z)=>typeof groundAt==='function'?groundAt(x,z):0;

// evaluate one target: returns {f:SNR multiplier, why, ...}
S.eval=function(j,a){const w=wfOf(),lam=C/((F.reg.carrierFrequencyGHz||9.7)*1e9);
  const los=_a.copy(j.pos).sub(player.pos);const R=los.length();los.divideScalar(R||1);
  const vp=player.vel,vt=j.vel,vpl=vp.dot(los),vtl=vt.dot(los),rr=vpl-vtl,Vp=vp.length();
  const mode=pick(w,rr,a.el);const H=mode==='H';
  const prfs=H?w.prfH:w.prfM;if(!prfs||!prfs.length)return{f:1,why:'-',mode};
  const tau=(H?w.tauH:w.tauM)*1e-6,duty=H?w.dutyH:w.dutyM,N=w.N*(H?1.4:1);
  const agl=Math.max(player.pos.y-gAt(player.pos.x,player.pos.z),30),sea=gAt(player.pos.x+los.x*R*.5,player.pos.z+los.z*R*.5)<=1.5;
  // HPRF only works on a closing target faster than the clutter band edge or in the clear window; below that the sidelobe band covers it
  const sll2=un(2*w.sll),sig0=gam(sea);
  // ownship-compensated mainlobe clutter: target in it when its own LOS speed is within the filter, folded by the PRF's ambiguous velocity
  const bw=((F.reg&&F.reg.beamwidthAzDeg)||3.5)*D,psi=Math.acos(cl(vpl/(Vp||1),-1,1)),spread=Vp*bw*Math.sin(psi)*.5;
  const qf=(((F.reg&&F.reg.dopplerFilterQuality)||1)*.2+.8),wMLC=Math.max(w.mlc*(H?1:.32)*qf,spread),wZDF=w.zdf;
  let ok=0,sumSnr=0,ecl=0,blind=0,scrMin=1e9;const T=prfs.length;
  const sN=(a.snrRef||1)*(typeof SNR50!=="undefined"?SNR50:20);
  for(let k=0;k<T;k++){const prf=prfs[k]*(1+.03*((Math.floor(performance.now()/1500)+k)%3)),Ru=C/(2*prf),Vamb=lam*prf/2;
    // 1. eclipsing: the return coincides with a transmitted pulse (plus a recovery guard); also the altitude-line gate
    const ph=((R%Ru)/Ru),guard=tau*prf*1.3+.012;const eclipsed=ph<duty+(H?0:guard)||ph>1-.005||Math.abs((R%Ru)-agl)<C*tau/2*1.5&&R>agl*.7&&R<agl*1.6;
    if(eclipsed){ecl++;continue;}
    // 2. mainlobe clutter and zero-Doppler filters, with ambiguity folding (blind speeds)
    const dvm=Math.abs(fold(vtl,Vamb)),dvz=Math.abs(fold(rr-vpl*0,Vamb));
    if(dvm<wMLC){blind++;continue;}
    if(H&&w.hClose){const c=-vtl*0+rr;if(c<w.hClose[0]||c>w.hClose[1]){blind++;continue;}}   // N019 HPRF: closing targets only, 64–694 m/s
    // 3. sidelobe clutter in the target's Doppler: ground at the same closing rate lies on a ring; nothing there when |rr| > Vp
    const rrf=H?rr:fold(rr,Vamb);
    let scr=1e9;
    const clutterFrac=H?(Math.abs(rr)<Vp*1.02?1:0):cl(2*Vp/Vamb,0,1);
    if(clutterFrac>0){const dvf=lam*prf/(2*N),sinp=Math.max(Math.abs(Math.sin(Math.acos(cl(rrf/(Vp||1),-1,1)))),.05),dpsi=cl(dvf/(Vp*sinp),.0005,.8);
      let Cs=0;const nAmb=H?5:7;
      for(let n=0;n<nAmb;n++){const Rn=(R%Ru)+n*Ru;if(Rn<agl*1.02)continue;if(Rn>4120*Math.sqrt(agl)*1.15&&n>0)break;const g=Math.asin(cl(agl/Rn,0,1)),cg=Math.max(Math.cos(g),.05);
        const A=(C*tau/2/cg)*Rn*dpsi*(H?1:1);Cs+=sig0*Math.sin(Math.max(g,.02))*A/Math.pow(Rn,4);}
      const St=(j.ac.rcs||5)/Math.pow(R,4);scr=St/(Math.max(Cs*sll2,1e-40))*(H?1:Math.max(clutterFrac,.2));}
    scrMin=Math.min(scrMin,scr);
    // coherent-integration gain relative to a 32-pulse reference, then clutter-limited SNR: 1/s_eff = 1/(s) + 1/SCR
    const gainInt=cl(Math.sqrt(N/32),.6,2.2);ok++;sumSnr+=gainInt/(1+ (sN*gainInt)/Math.max(scr,1e-6));}
  const det=ok>=(H?Math.min(w.M,2):w.M);const meanF=ok?sumSnr/ok:0;
  const f=det?cl(meanF*un(-w.cfar),0,3):0;
  S.stats.n++;if(!det)S.stats[ecl>=blind?'ecl':'blind']++;
  return{f,mode,ok,T,ecl,blind,scr:scrMin,why:det?'':(ecl>=blind?'ECLIPSE':'DOPPLER'),Vamb:lam*prfs[0]/2,wMLC};};

// replace the legacy shortcuts inside snr1: neutralise the PRF eclipse (prf 'A' skips it) and divide out the smooth-step notch, then apply the processor
{const _s=radar.snr1;radar.snr1=function(j,a,loss){
  if(!S.on||this.sensor!=='RDR'||!player||!player.ac||player.ac.pulse||j.isGhost||j.gnd||!j.vel||!j.ac)return _s.call(this,j,a,loss);
  const p0=this.prf;this.prf='A';let s;try{s=_s.call(this,j,a,loss);}finally{this.prf=p0;}
  if(!s)return 0;
  if(a.el<=-1*D){const vr=Math.abs(j.vel.dot(_b.copy(j.pos).sub(player.pos).normalize())),t=cl((vr-17)/22,0,1),fn=.003+.997*(t*t*(3-2*t));s/=fn;}   // undo the old notch
  const key=j,now=performance.now();let c=S.cache.get(key);
  if(!c||now-c.t>250){a.snrRef=s;c={t:now,r:S.eval(j,a)};S.cache.set(key,c);if(this.lock===j||this.bug===j||!S.last)S.last=Object.assign({id:j.type||'?',R:a.d},c.r);}
  return s*c.r.f;};}

// F4 overlay lines
const RD=window.RADARDBG;
if(RD){const _r=RD.extraRows;RD.extraRows=()=>{const l=S.last,w=wfOf();return['','SIGNAL  '+(player&&player.ac.radar?player.ac.radar.name:'?')+'  mode '+(l?l.mode:'-')+'  PRFs '+(l?l.T:'-')+'  M-of-N '+w.M+'/'+(l?l.T:'-'),
  l?`  target ${l.id} R ${(l.R/1852).toFixed(1)}NM  clear ${l.ok}  eclipsed ${l.ecl}  blind ${l.blind}  SCR ${l.scr>1e8?'inf':(10*Math.log10(l.scr)).toFixed(1)}dB  f ${l.f.toFixed(2)} ${l.why}`:'  (no target evaluated)',
  `  Vamb ${l?l.Vamb.toFixed(0):'-'} m/s  MLC ±${l?l.wMLC.toFixed(0):'-'} m/s  stats n${S.stats.n} ecl${S.stats.ecl} dop${S.stats.blind}`].concat(_r?_r():[]);};}
console.log('[sensorsig] loaded');
})();
