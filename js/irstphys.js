"use strict";
/* =====================================================================================================================
   v298 — IRST physics. The old IRST range was a table of multipliers (aspect, throttle, afterburner, altitude) and detection was a window test with the
   radar's R^-4 law. Now:
   * Range is where the target's irradiance meets the detector threshold: I(aspect, throttle, afterburner, Mach) * transmission / R^2 = threshold.
     Intensity: nozzle and plume (hidden head-on, afterburner roughly x3.6) plus aerodynamic skin heating that grows with Mach. Transmission is Beer-Lambert
     along the real path: water vapour falls off with height (scale 2.1 km), plus haze, rain and fog near the ground, so a low target is far shorter than the
     same target high. The stratus layer (the same one that is drawn) blocks the path where the ray crosses a cell it covers; the IRST cannot see through cloud.
     The threshold is set so the reference case (tail-on, 85 % throttle, 9 km, clear) is exactly the old published range.
   * SNR falls with R^-2 times the transmission (passive: one-way), not R^-4.
   * Detection integrates the dwell: a rectangular focal-plane footprint with soft edges sweeps over the target, the overlap time is the energy, the decision
     is made when the footprint has passed (same method as the radar beam in beamtrace.js). IRPHYS.kcal keeps the old ranges.
   * Passive ranging: the old random fixed error is gone. Range is fused from (a) intensity ranging, assuming 85 % throttle and the aspect read off the track
     velocity, so an afterburning target looks nearer and a head-on one farther, and (b) bearings-only triangulation from your own motion, whose error is
     R^2 * sigma_theta / baseline, so it converges only when you manoeuvre across the line of sight. Laser or radar range still wins when available.
   Cumulus (v305): the drawn cumulus clusters block the path (RAWVID.cuIR). Conical-scan sets (ALR-23 type) get a bearing error from the nutation modulation that falls with signal-to-noise (IRPHYS.coneSig) instead of a fixed 0.2 degrees.
   IRPHYS.on=false restores the old behaviour; IRPHYS.ranging / IRPHYS.cloud switch parts. Loads after sensorirst.js and beamtrace.js.
   ===================================================================================================================== */
(function(){
if(typeof radar==='undefined'||typeof jets==='undefined'||typeof player==='undefined'||typeof THREE==='undefined'){console.warn('[irstphys] core missing');return;}
const F=window.SENSOR_FUSE||{},D=Math.PI/180,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),HW=2100;
const IR=window.IRPHYS={coneSig:snr=>Math.max(.04*D,1.6*D/(2*Math.sqrt(2*Math.max(snr,1)))),on:true,ranging:true,cloud:true,kcal:1,dw:new Map(),fr:0,st:{dwell:0,det:0,miss:0,edge:0,cloud:0},last:null};
const gauss=()=>Math.sqrt(-2*Math.log(1-Math.random()+1e-12))*Math.cos(2*Math.PI*Math.random());
/* ---------- intensity (relative units; 1 = nozzle at 85 % throttle seen tail-on) and the atmosphere ---------- */
function inten(o,asp,thr,ab,M){const fh=o.tail>0?Math.pow((o.head||0)/o.tail,2):.17,fa=fh+(1-fh)*Math.pow(clamp(asp,0,1),1.6);
  return((.25+.75*Math.pow(clamp(thr,0,1),2.5))*(1+2.6*clamp(ab,0,1)))*fa+.03*Math.pow(Math.max(M,.2)/.8,2.5);}
const clamp=cl;
function atmos(P,T){const E=typeof ENV!=='undefined'?ENV:{rain:0,P:{}},fog=(E.P&&E.P.fog)||1.2e-5,h1=P.y,h2=T.y,dh=h2-h1;
  const dens=Math.abs(dh)>50?HW/dh*(Math.exp(-h1/HW)-Math.exp(-h2/HW)):Math.exp(-h1/HW),low=Math.abs(dh)>50?600/dh*(Math.exp(-h1/600)-Math.exp(-h2/600)):Math.exp(-h1/600);
  return .045*dens+.004+1.1*(E.rain||0)*Math.min(1,dens*2)+Math.max(0,fog-1.3e-5)*2e4*low;}   // per km
function hash(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);}
function vn(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz),a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return a+(b-a)*sx+(c-a)*sz+(a-b-c+d)*sx*sz;}
function cuK(P,T){return IR.cloud&&window.RAWVID&&RAWVID.cuIR?RAWVID.cuIR(P,T):1;}
function cloudK(P,T){return cloudK0(P,T)*cuK(P,T);}
function cloudK0(P,T){const E=typeof ENV!=='undefined'?ENV:null,Pp=E&&E.P;if(!IR.cloud||!Pp||!(Pp.strat>0))return 1;const lo=Pp.alt-300,hi=Pp.alt+300,y1=P.y,y2=T.y;
  if((y1<lo&&y2<lo)||(y1>hi&&y2>hi))return 1;let t=.5;if(!(y1>=lo&&y1<=hi&&y2>=lo&&y2<=hi))t=cl((Pp.alt-y1)/((y2-y1)||1e-6),0,1);
  const x=P.x+(T.x-P.x)*t,z=P.z+(T.z-P.z)*t;return vn(x/4000,z/4000)<Pp.strat?.03:1;}
function solve(Iv,Eth,be){const tg=Iv/Eth;let lo=100,hi=250000;for(let i=0;i<26;i++){const m=.5*(lo+hi),v=m*m*Math.exp(be*m/1000);if(v<tg)lo=m;else hi=m;}return .5*(lo+hi);}
function ethr(o){if(o._eth)return o._eth;const Rb=o.tail*(.55+.45*.85),I=inten(o,1,.85,0,.8);return o._eth=I*Math.exp(-.0046*Rb/1000)/(Rb*Rb);}
function mach(j){return j.vel.length()/Math.max(280,340-.0035*j.pos.y);}
// range (m) of j for the player's IRST, and the extinction it used
function phys(j,asp){const o=player.ac.ols,thr=j.thr==null?.85:j.thr,Iv=inten(o,asp,thr,j.ab||0,mach(j))*cloudK(player.pos,j.pos),be=atmos(player.pos,j.pos);
  return{R:solve(Iv,ethr(o),be),be:be,I:Iv};}
IR.phys=phys;
{const _r=radar.irRange;radar.irRange=function(j,a,c){const q=F.reg,sv=q&&q.irstFogRainRangeScalar;if(IR.on&&q)q.irstFogRainRangeScalar=1;   // the path model below does fog and rain itself
  let R0;try{R0=_r.call(this,j,a,c);}finally{if(IR.on&&q&&sv!=null)q.irstFogRainRangeScalar=sv;}
  if(!IR.on||!R0||!player.ac.ols||!player.ac.ols.tail||!j.ac||!j.vel)return R0;
  const o=player.ac.ols,asp=(1-c)/2,thr=j.thr==null?.85:j.thr,ab=j.ab||0,h=(player.pos.y+j.pos.y)/2,
    Rb=(o.head+(o.tail-o.head)*asp)*(.55+.45*clamp(thr,0,1))*(1+.9*clamp(ab,0,1))*(.7+.3*clamp(h/9000,0,1)),ph=phys(j,asp);j._irBe=ph.be;
  if(ph.I<1e-9)return 0;IR.last={R:ph.R,be:ph.be,id:j.type};return R0*ph.R/Math.max(Rb,1);};}
// passive detection: SNR goes with transmission / R^2 (not R^-4)
{const _s=radar.snr1;radar.snr1=function(j,a,loss){const s=_s.call(this,j,a,loss);if(!IR.on||this.sensor!=='IRST'||!s||!j._irBe)return s;
  const R=this.rdet(j,a);if(!(R>0))return s;return s*Math.pow(a.d/R,2)*Math.exp(-j._irBe*(a.d-R)/1000);};}
/* ---------- dwell: a rectangular footprint with soft edges sweeps over the target ---------- */
const sm=(x,s)=>.5*(1+Math.tanh(x/s));
IR.sweep=function(rd,prev,cur,now,dt,gim){const fr=++IR.fr,w=rd.beam,h=rd.bmV(),stab=true,K=cl(Math.ceil(Math.abs(cur-prev)/(w*.3)),1,10),
    rate=rd.rate*(rd.rotor()?1.7:2.1),Tn=w/Math.max(rate,1e-3);
  for(const j of jets){if(j===player||!j.alive||IFF.hide(j))continue;const a=rd.ang(j.pos);let g=0,rec=IR.dw.get(j);
    if(a.off<=gim+2*D){const dE=a.el-rd.antEl,ge=sm(h/2-Math.abs(dE),.1*h);
      for(let i=0;i<K;i++){let dA=a.az-(prev+(cur-prev)*(i+.5)/K);dA=Math.atan2(Math.sin(dA),Math.cos(dA));g+=sm(w/2-Math.abs(dA),.1*w)*ge;}g/=K;}
    if(g>.01){if(!rec){rec={E:0,pk:0,sb:0,a:null,t:now};IR.dw.set(j,rec);}rec.E+=g*dt;rec.fr=fr;rec.t=now;
      if(g>rec.pk){rec.pk=g;if(g>.3){rec.a=a;rec.sb=rd.snr(j,a,1);}}}
    else if(rec)IR.fin(rd,j,rec,now,Tn);}
  for(const [j,rec] of IR.dw)if(rec.fr!==fr)IR.fin(rd,j,rec,now,Tn);};
IR.fin=function(rd,j,rec,now,Tn){IR.dw.delete(j);if(now-rec.t>.4)return;IR.st.dwell++;if(!j.alive||!rec.a||rec.pk<.45){IR.st.edge++;return;}
  const snr=rec.sb*(rec.E/Tn)*IR.kcal;if(snr>0&&Math.random()<pdOf(snr)){IR.st.det++;rd.hit(j,rec.a,snr,now);}else IR.st.miss++;};
/* ---------- passive ranging: intensity + bearings-only triangulation ---------- */
{const _t=radar.trkR;radar.trkR=function(j,tk){const d0=_t.call(this,j,tk);
  if(!IR.on||!IR.ranging||this.sensor!=='IRST'||!player.ac.ols||!player.ac.ols.tail||tk.d<=this.lrf||this.radCovers(j,tk.d)||!j.vel)return d0;
  const now=performance.now()/1000;let s=j._irR;const Rt=player.pos.distanceTo(j.pos);
  if(!s||now-s.t>8){s=j._irR={t:0,t0:now,p0:player.pos.clone(),Rf:Rt*(1+(Math.random()-.5)*.6)};}
  if(now-s.t>.25){s.t=now;if(now-s.t0>25){s.t0=now;s.p0.copy(player.pos);}
    const u=j.pos.clone().sub(player.pos).normalize(),o=player.ac.ols;let asp=.5;
    if(tk.v&&tk.v.length()>40){asp=(1-tk.v.clone().normalize().dot(u.clone().negate()))/2;}
    const It=inten(o,(1-j.fwd(new THREE.Vector3()).dot(u.clone().negate()))/2,j.thr==null?.85:j.thr,j.ab||0,mach(j)),Ia=inten(o,asp,.85,0,.8),
      Ri=Rt*Math.sqrt(Ia/Math.max(It,1e-6))*(1+gauss()*.08),dd=player.pos.clone().sub(s.p0),Bp=dd.sub(u.clone().multiplyScalar(dd.dot(u))).length(),
      st=(F.reg&&F.reg.irstAngularAccuracyRmsDeg||.1)*D,w1=1/Math.pow(.3*Rt,2);let w2=0,Rm=Rt;
    if(Bp>150){const sg=2*Rt*Rt*st/Bp;w2=1/(sg*sg);Rm=Rt*(1+gauss()*Math.min(sg/Rt,1.5));}
    s.Rf+=.25*((Ri*w1+Rm*w2)/(w1+w2)-s.Rf);s.Rf=Math.max(s.Rf,500);s.sig=Math.sqrt(1/(w1+w2));}
  j._irE=(s.Rf-Rt)/Math.max(Rt,1);return s.Rf;};}
const RD=window.RADARDBG;
if(RD){const _r=RD.extraRows;RD.extraRows=()=>{if(radar.sensor!=='IRST')return _r?_r():[];const l=IR.last,s=IR.st;
  return['','IRST PHYS  '+(IR.on?'ON':'OFF')+'  dwells '+s.dwell+'  declared '+s.det+'  missed '+s.miss+'  edge '+s.edge,l?'  last '+(l.id||'?')+'  range '+(l.R/1000).toFixed(1)+'km  extinction '+l.be.toFixed(3)+'/km':'  (no target)'].concat(_r?_r():[]);};}
console.info('[irstphys] v298 IRST physics loaded');
})();
