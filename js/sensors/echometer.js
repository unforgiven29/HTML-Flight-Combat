"use strict";
/* =====================================================================================================================
   v298 — radar range and Doppler measured from the echo. Before, a hit put the aircraft's true position (plus a flat noise figure) in the track
   file and seeded its velocity from the exact range rate. Now the measurement is what a pulse-Doppler set actually gets:
   * Range from echo delay (tau = 2R/c) in a range gate of c*tau_pulse/2. The error is the gate over the square root of 2*SNR (split-gate), so a
     weak contact at 100 km is tens of metres off and a strong close one a few metres. Pulse sets keep their old coarse figure.
   * Range and Doppler ambiguity. Medium PRF: the echo of anything beyond c/(2*PRF) (about 12 km) folds into the gate, and closing speed beyond
     lambda*PRF/2 (about 190 m/s at X band) aliases. A new contact needs several PRFs to unfold; with a weak echo the set can fail that dwell and the
     contact stays out of the picture for another scan. An established track resolves from its prediction. A set with only high PRF (AWG-9) unfolds range
     more slowly.
   * Doppler. The track's line-of-sight velocity is blended with the measured range rate: the FFT bin lambda*PRF/(2N) plus noise by SNR, added to the
     own-ship velocity. Before, it was the exact figure on the first hit only.
   F4: ECHO block. ECHO.on=false restores the old measurement; ECHO.amb / ECHO.dop switch the parts. Loads after beamtrace.js.
   ===================================================================================================================== */
(function(){
if(typeof radar==='undefined'||typeof player==='undefined'||!window.SENSOR_SIG){console.warn('[echometer] core missing');return;}
const S=window.SENSOR_SIG,F=window.SENSOR_FUSE||{},C=299792458,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const EM=window.ECHO={on:true,amb:true,dop:true,st:{hits:0,amb:0,fail:0,res:0},last:null};
const gauss=()=>Math.sqrt(-2*Math.log(1-Math.random()+1e-12))*Math.cos(2*Math.PI*Math.random()),_u=new THREE.Vector3();
function params(){const w=S.wfOf?S.wfOf():{},lam=C/(((F.reg&&F.reg.carrierFrequencyGHz)||9.7)*1e9),pulse=!!(player.ac&&player.ac.pulse);
  let prf=1000,tau=1.5,hp=false;
  if(!pulse){if(w.prfM&&w.prfM.length){prf=w.prfM[0];tau=w.tauM||1.4;}else{prf=(w.prfH&&w.prfH[0])||200000;tau=w.tauH||1.5;hp=true;}}
  const N=pulse?1:(w.N||48);return{lam:lam,prf:prf,tau:tau*1e-6,N:N,pulse:pulse,hp:hp,Ru:C/(2*prf),Vamb:lam*prf/2,bin:lam*prf/(2*N)};}
EM.params=params;
// range error from the pulse: gate / sqrt(2 SNR)
{const _m=radar.meas;radar.meas=function(j,a,snr,out){if(!EM.on||this.sensor!=='RDR'||!player.ac||player.ac.pulse)return _m.apply(this,arguments);
  const p=params(),sig=Math.max(3,(C*p.tau/2)/(1.6*Math.sqrt(2*Math.max(snr,1)))),sr0=25+.0025*a.d,k0=this.kRng;
  this.kRng=k0*sig/sr0;try{return _m.apply(this,arguments);}finally{this.kRng=k0;}};}
{const _h=radar.hit;radar.hit=function(j,a,snr,now){
  if(!EM.on||this.sensor!=='RDR'||!j||!j.vel||j.isGhost||!player.ac)return _h.apply(this,arguments);
  const tk0=this.tracks.get(j),t0=tk0&&tk0.t,p=params(),los=_u.copy(j.pos).sub(player.pos),d=los.length()||1;los.divideScalar(d);
  const vrel=(j.vel.x-player.vel.x)*los.x+(j.vel.y-player.vel.y)*los.y+(j.vel.z-player.vel.z)*los.z;
  EM.st.hits++;
  if(EM.amb&&!p.pulse&&(!tk0||!tk0.p||now-tk0.t>3)&&(d>p.Ru||Math.abs(vrel)>p.Vamb)){
    EM.st.amb++;const pr=cl(1-Math.exp(-snr/10),.2,.98)*(p.hp?.6:1);if(Math.random()>pr){EM.st.fail++;return;}EM.st.res++;}
  const r=_h.apply(this,arguments),tk=this.tracks.get(j);
  if(EM.dop&&!p.pulse&&tk&&tk.p&&tk.v&&tk.t!==t0){const u=_u.copy(tk.p).sub(player.pos),dl=u.length();
    if(dl>1){u.divideScalar(dl);const sg=Math.sqrt(Math.pow(p.bin*.5/Math.sqrt(2*Math.max(snr,1)),2)+p.bin*p.bin/12),vm=vrel+gauss()*sg,
        va=vm+player.vel.dot(u),w=(tk.n||1)>2?.4:.75;tk.v.addScaledVector(u,(va-tk.v.dot(u))*w);if(tk.v.length()>950)tk.v.setLength(950);tk.vr=vm;tk.vrSig=sg;}}
  EM.last={R:d,tau:2*d/C,fold:d%p.Ru,vrel:vrel,prf:p.prf,snr:snr};return r;};}
const RD=window.RADARDBG;
if(RD){const _r=RD.extraRows;RD.extraRows=()=>{const p=params(),l=EM.last,s=EM.st;
  return['','ECHO  '+(EM.on?'ON':'OFF')+'  PRF '+(p.prf/1000).toFixed(1)+'k  pulse '+(p.tau*1e6).toFixed(1)+'us  gate '+(C*p.tau/2).toFixed(0)+'m  Ru '+(p.Ru/1000).toFixed(1)+'km  Vamb '+p.Vamb.toFixed(0)+'m/s  bin '+p.bin.toFixed(1)+'m/s',
    l?'  last '+(l.R/1000).toFixed(1)+'km  delay '+(l.tau*1e6).toFixed(0)+'us  folds to '+(l.fold/1000).toFixed(1)+'km  closure '+(-l.vrel).toFixed(0)+'m/s':'  (no echo yet)',
    '  hits '+s.hits+'  ambiguous '+s.amb+'  unresolved '+s.fail+'  resolved '+s.res].concat(_r?_r():[]);};}
console.info('[echometer] v298 range/Doppler from the echo');
})();
