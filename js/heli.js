/* =====================================================================================================================
   heli.js — rotorcraft flight model and the Ka-50 "Black Shark" (stage 1).
   Numbers are gameplay-level estimates after the DCS Ka-50 Black Shark 3 flight manual (ch. 2 performance table), not published data.
     Ka-50: coaxial contra-rotating rotors (no tail rotor), 14.45 m rotor diameter, 2 x TV3-117VMA at 2 x 2,200 hp, normal takeoff mass 9,800 kg,
     max 10,800 kg, internal fuel 1,870 l (+4 x 550 l), Vmax 350 km/h at sea level, cruise 255 km/h, hover ceiling 4,000 m, service ceiling 5,500 m,
     max climb rate 10 m/s at 2,500 m, 3.5 g, empty mass about 7,700 kg.
   Rotor: blade-element thrust coefficient CT = k(2θ/3 − λ) with soft blade-stall saturation; induced velocity from Glauert momentum theory with
   ground effect, the Johnson vortex-ring branch and the windmill-brake state; rotor power = T(vi + Vc) + profile + fuselage parasite power;
   the rotor speed follows the energy equation IΩ dΩ/dt = Pengine − Protor, with a governor that feeds the engines forward and proportionally.
   Attitude: body rates with SAS attitude hold; the rotor thrust acts along the rotor axis, so every translation comes from tilting the aircraft.
   Hooks Jet.step (the same way vtol.js hooks the powered-lift jets): aircraft with ac.heli skip the fixed-wing model.
   Controls: W/S cyclic (forward / back), A/D cyclic (left / right), Q/E pedals, R/F collective up / down, ; engine start / stop, B wheel brakes.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof Jet==='undefined'||typeof cloneType!=='function'){console.warn('[heli] game missing');return;}
const DEG=Math.PI/180,KT_=1.852;
const HELI=window.HELI={ids:[],H:{},st:null,step:null,startStop:null};

/* ---------------- airframe data ---------------- */
const KA50={
  R:7.225,                       // rotor radius (m); the two rotors turn in opposite senses
  A:164.0,                       // swept disc area of one rotor (m²); the coaxial pair is treated as one disc with a mutual-interference factor
  om0:30.7,                      // rotor speed at 100 % (rad/s, 293 rpm)
  I:4700,                        // rotor system inertia (kg m²)
  sigma:.10,kBE:.14,             // solidity; lift-curve slope term k = σa/4
  thMin:.026,thMax:.40,          // blade pitch at 75 % radius (rad): lever fully down / fully up
  ctMax:.0205,                   // blade-stall limit of the thrust coefficient
  kappa:1.15,                    // induced-power factor
  cd0:.011,                      // blade profile drag coefficient
  Pa:2*1640e3*.96,               // power available at sea level (W): 2 x 2,200 hp through the gearbox
  tauEng:.7,                     // engine response (s)
  fuelK:8.4e-5,                  // kg per kW s
  fPar:[3.6,6.5,3.2],            // fuselage drag areas CdA: forward, side, vertical (m²)
  gh:1.72,                       // CG height above the ground on the wheels (m)
  rateP:65,rateR:115,rateY:90,    // peak pitch / roll / yaw rates (°/s)
  gLim:3.5,gNeg:-.9,vne:350,     // km/h
};
HELI.H['Ka-50']=KA50;

/* ---------------- helpers ---------------- */
const _q=new THREE.Quaternion(),_ax=new THREE.Vector3(),_f=new THREE.Vector3(),_u=new THREE.Vector3(),_r=new THREE.Vector3(),_a=new THREE.Vector3(),_va=new THREE.Vector3(),_ge=new THREE.Euler();
const sgn=x=>x<0?-1:1;
function st(j){return j.hl||(j.hl={Nr:1,run:true,start:0,pe:0,vi:0,ge:1,vrs:0,T:0,Pr:0,Pa:0,Pe:0,col:0,th:0,rot:0,hold:{p:null,r:null,y:null},w:{p:0,y:0,r:0},
  air:false,td:0,dust:0,msgT:0,vz:0,nzS:1,ovsp:0,eng:[1,1],gov:0,warm:0,brk:0,trim:0,coldS:false});}
HELI.st=st;

/* ---------------- momentum-theory inflow: induced velocity vi (m/s, positive = downwash) for thrust T ---------------- */
// Vax: velocity along the rotor axis (up positive), Vh: in-plane speed. Glauert fixed point with the Johnson empirical vortex-ring branch and the windmill brake.
function inflow(T,rho,A,Vax,Vh,kappa,seed){
  const vh=Math.sqrt(Math.max(T,1)/(2*rho*A));                 // ideal hover induced velocity
  let vi=Math.max(.2*vh,seed||vh);
  for(let i=0;i<8;i++){const d=Math.sqrt(Vh*Vh+(Vax+vi)*(Vax+vi));vi=.5*vi+.5*(vh*vh/Math.max(d,.3*vh));}
  vi*=kappa;
  // descending: vortex-ring state (Johnson), strongest at low horizontal speed; deep descent: windmill brake
  const x=Vax/vh;let vrs=0;
  if(Vax<0){
    const w=Math.max(0,1-Vh/(.9*vh*Math.max(1,-x)));          // forward speed carries the rotor out of its own wake
    if(x>-2.1){const xx=Math.max(x,-2),vj=vh*(kappa-1.125*xx-1.372*xx*xx-1.718*xx*xx*xx-.655*xx*xx*xx*xx);
      vi=vi+(Math.max(vi,vj)-vi)*w;vrs=w*Math.max(0,Math.min(1,(vj-vh)/(.8*vh)))*Math.min(1,(-x)/.4);}
    else{const wb=vh*(-x/2-Math.sqrt(Math.max(x*x/4-1,0)));vi=vi+(wb-vi)*Math.min(1,(-x-2.1)/.9)*(1-Math.min(1,Vh/(.6*vh+1)));}
  }
  return{vi,vh,vrs};
}

/* ---------------- the step ---------------- */
function heliStep(j,dt){
  if(!j.alive){j.fall(dt);return;}
  const H=j.ac.heli,h=st(j);
  if(window.HELISYS)HELISYS.pre(j,h,H,dt);
  if(!h.init){h.init=1;if(!j.onGnd){const hg=groundAt(j.pos.x,j.pos.z);if(j.pos.y>hg+H.gh+3){if(j.pos.y>hg+2500)j.pos.y=hg+700;j.thr=.57;if(j.vel.length()<5)j.vel.copy(j.fwd(new V3())).multiplyScalar(45);}}h.Nr=1;h.run=true;h.warm=1;h.gov=j.onGnd?.1:.6;h.vi=j.onGnd?3:15;h.T=j.mass*G*(j.onGnd?.05:1);}
  const sub=dt>1/50?2:1;dt/=sub;
  for(let s=0;s<sub;s++){if(!j.alive)return;sub1(j,H,h,dt,s===sub-1);}
  j.sync();
}

function sub1(j,H,h,dt,last){
  const f=j.fwd(_f),u=j.up(_u),rt=j.right(_r);
  const pos=j.pos,vel=j.vel,hgt=pos.y,rho_=rho(hgt),sig=rho_/1.225,m=j.mass;
  if(last)j.windFx(dt);
  // air-relative velocity along the body axes
  const vf=vel.dot(f),vr=vel.dot(rt),vu=vel.dot(u),V=vel.length();
  j.alpha=Math.atan2(-vu,Math.max(Math.abs(vf),1));j.beta=Math.atan2(vr,Math.max(Math.abs(vf),V*.3+.5));j.cas=V*Math.sqrt(sig)*KT;j.mach=V/sos(hgt);
  const ctl=j.gloc>0?{p:0,r:0,y:0}:j.ctlE();
  // ---- engines: start / stop, governor ----
  const fuelOut=j.totalFuel<=0,dmE=j.dm.eng<=0?0:.3+.7*Math.min(1,j.dm.eng/100);
  if(h.start>0){h.start=Math.max(0,h.start-dt);}
  const eOn=h.run&&!fuelOut&&h.start<=0;
  const Pamax=H.Pa*Math.pow(sig,H.paExp||.7)*(h.pwF==null?dmE:h.pwF)*(j.hp<60?.8:1)*(1-.04*Math.max(0,hgt-3000)/1000*0);
  h.Pa=Pamax;
  const lever=Math.max(0,Math.min(1,j.thr));
  // ---- rotor thrust from the blade pitch and the inflow ----
  const th=H.thMin+(H.thMax-H.thMin)*lever;h.th=th;
  const Nr=h.Nr,om=H.om0*Nr,tip=om*H.R;
  const q=rho_*H.A*tip*tip;                                   // ρ A (ΩR)²
  const Vh=Math.hypot(vf,vr),Vax=vu;
  let T=Math.max(h.T,1000);
  let inf=null;
  for(let it=0;it<3;it++){
    inf=inflow(T,rho_,H.A,Vax,Vh,H.kappa,h.vi);
    // ground effect: the cushion cuts the induced velocity inside about a rotor radius of the ground
    const gh=groundAt(pos.x,pos.z),z=Math.max(H.R*.5,hgt-gh-H.gh+2.5);let ge=1;
    if(z<H.R*3.2){const k=H.R/(4*z);ge=Math.max(.8,1-.5*k*k);} h.ge=ge;
    const vi=inf.vi*ge,lam=(Vax+vi)/Math.max(tip,10);
    let CT=H.kBE*(2*th/3-lam);CT=Math.max(-.002,CT);
    const CTs=H.ctMax*Math.tanh(CT/H.ctMax);                  // blade stall: more pitch buys less and less thrust
    T=q*CTs;h.vi+=(vi-h.vi)*Math.min(1,dt/.35*(it===0?1:.0));
  }
  h.T=T;h.vrs=inf.vrs;h.vh=inf.vh;
  // blade flapping / collective servo lag: the disc takes about a seventh of a second to build or shed thrust after a collective change
  h.Tf=h.Tf==null?T:h.Tf+(T-h.Tf)*(1-Math.exp(-dt/(.14/Math.max(.6,Nr))));
  // ---- rotor power: induced + climb, profile, fuselage parasite ----
  const mu=Vh/Math.max(tip,10),Pind=T*(Vax+h.vi),Pprof=(H.sigma*H.cd0/8)*rho_*H.A*tip*tip*tip*(1+4.65*mu*mu)*(1+8*Math.max(0,CTover(T,q,H)));
  const Vtot=Math.max(V,.1),Ppar=.5*rho_*H.fPar[0]*Vtot*Vtot*Vtot*.35;                       // the fuselage drag is also applied as a force below; only the power the rotor must supply
  const Pr=(Pind+Pprof)*1.06+Math.max(0,Ppar*.0);
  h.Pr=Pr;
  // ---- engine governor and rotor speed ----
  const want=eOn?Math.max(0,Math.min(1,Pr/Math.max(Pamax,1)+22*(1-Nr)+(h.warm<1?0:0))):0;
  const lag=eOn?H.tauEng:1.6;h.gov+=(want-h.gov)*Math.min(1,dt/lag);
  let Pe=eOn?h.gov*Pamax:0;
  // engine run-up after a start: the engines only take load once the rotors have been driven up
  if(eOn&&h.warm<1){h.warm=Math.min(1,h.warm+dt/22);Pe*=Math.min(1,.12+h.warm*1.2);}
  if(!eOn)h.warm=0;
  h.Pe=Pe;
  const Eir=H.I*H.om0*H.om0;                                     // rotor kinetic energy scale
  const dN=(Pe-Pr-(Nr<.2?0:Nr*Nr*Nr*18000))/(Eir*Math.max(Nr,.15));
  h.Nr=Math.max(0,Math.min(1.3,Nr+dN*dt));
  j.n=Math.max(0,Math.min(1.05,h.Nr*(eOn?.98:.6)+(eOn?.02:0)));
  // rotor overspeed / droop cautions
  if(j===player){h.msgT-=dt;
    if(h.Nr>1.12&&h.msgT<=0){flash('ROTOR OVERSPEED',900);h.msgT=2;}
    else if(h.Nr<.88&&h.Nr>.3&&h.msgT<=0&&!j.onGnd){flash('ROTOR RPM LOW',900);h.msgT=2.5;}}
  if(h.Nr>1.18)j.hp-=(h.Nr-1.18)*40*dt;
  // fuel
  if(eOn){let burn=(Pe/1000)*H.fuelK*dt;if(j.tankFuel>0){const t=Math.min(j.tankFuel,burn);j.tankFuel-=t;burn-=t;}j.fuel=Math.max(0,j.fuel-burn);}
  // ---- forces ----
  const a=_a.set(0,-G,0);
  a.addScaledVector(u,h.Tf/m);
  // fuselage drag (body axes), the fins and stub wing add sideways and vertical area; compressibility and retreating-blade stall bring in a Vne wall
  const wall=1+Math.pow(Math.max(0,(V-(H.vne/3.6)*.82)/22),2);
  const dfx=.5*rho_*H.fPar[0]*wall*Math.abs(vf),dfy=.5*rho_*H.fPar[1]*Math.abs(vr),dfz=.5*rho_*H.fPar[2]*Math.abs(vu);
  a.addScaledVector(f,-dfx*vf/m).addScaledVector(rt,-dfy*vr/m).addScaledVector(u,-dfz*vu/m);
  // rotor flapping damps horizontal drift at low speed (what lets a real helicopter hang in a hover with the stick still)
  const kd=.035*Math.max(0,1-Vh/30)*Nr;a.addScaledVector(f,-kd*vf).addScaledVector(rt,-kd*vr);
  // stub wing lift at speed
  const qd=.5*rho_*V*V,cl=Math.max(-.6,Math.min(1.1,j.alpha*3.2)),Lw=qd*8.5*cl;
  _va.copy(vel).normalize();_ax.crossVectors(rt,_va).normalize();a.addScaledVector(_ax,Lw/m*(V>20?1:0));
  j.nz=Math.max(-3,Math.min(8,(a.dot(u)+G*u.y)/G));if(j===player)j.maxNz=Math.max(j.maxNz,j.nz);
  if(!(window.STRUCT&&STRUCT.on)&&j.nz>H.gLim*1.4){j.hp-=(j.nz-H.gLim*1.4)*8*dt;if(j===player&&Math.random()<dt*2)flash('OVER-G',800);if(j.hp<=0){j.kill('AIRFRAME FAILURE');return;}}
  if(j.nz<H.gNeg-.4&&h.Nr>.5){h.lowg=(h.lowg||0)+dt;if(h.lowg>.6){if(j===player)flash('ROTORS · NEGATIVE G',900);if(h.lowg>2.4){j.kill('ROTOR BLADE COLLISION');return;}}}else h.lowg=Math.max(0,(h.lowg||0)-dt);
  // Vne
  const ias=j.cas*1.852;if(ias>H.vne*1.04){const ov=ias-H.vne*1.04;j.hp-=ov*.03*dt;if(j===player&&Math.random()<dt*2)flash('OVERSPEED',800);if(j.hp<=0){j.kill('AIRFRAME FAILURE');return;}}
  j.vel.addScaledVector(a,dt);
  j.pos.addScaledVector(j.vel,dt);

  // ---- attitude: rate command with SAS attitude hold ----
  const eff=Math.max(0,Math.min(1.1,Nr*Nr))*(j.dm.hyd<20?.4:1)*(j.hp<35?.6:1);
  const pit=j.pitch,bnk=j.bank;
  let cp=ctl.p,cr=ctl.r,cy=ctl.y,hdg=j.hdg*DEG;
  const gnd=j.onGnd;
  // SAS attitude hold works inside the normal envelope only; outside it (and while the stick is moved) the SAS just damps the body rates,
  // so the aircraft can be rolled, looped and flown inverted without Euler-angle limits fighting the pilot
  const envP=Math.abs(pit)<32*DEG&&Math.abs(bnk)<48*DEG,envR=envP;
  let qCmd;
  if(Math.abs(cp)>.04||!envP){h.hold.p=null;qCmd=cp*H.rateP*DEG;}
  else{if(h.hold.p===null)h.hold.p=pit;qCmd=Math.max(-24*DEG,Math.min(24*DEG,(h.hold.p-pit)*2.4));}
  let pCmd;
  if(Math.abs(cr)>.04||!envR){h.hold.r=null;pCmd=cr*H.rateR*DEG;}
  else{if(h.hold.r===null)h.hold.r=bnk;pCmd=Math.max(-30*DEG,Math.min(30*DEG,(h.hold.r-bnk)*2.4));}
  // on the wheels the skids / wheels still limit the angles
  if(gnd){if(pit>25*DEG&&qCmd>0)qCmd=0;if(pit<-25*DEG&&qCmd<0)qCmd=0;if(Math.abs(bnk)>25*DEG&&pCmd*bnk>0)pCmd=0;}
  // yaw: pedals command rate; centred pedals hold heading in a hover and weathercock into the wind at speed (twin fins). The heading hold and the
  // coordinated-turn term use Euler angles, so they are switched off when the aircraft is steeply pitched or banked
  const upr=j.up(_u).y>.55&&Math.abs(pit)<55*DEG;
  const spdY=Math.min(1,Math.max(0,(V-12)/30));
  let rCmd=cy*H.rateY*DEG*(1-.25*spdY);
  if(Math.abs(cy)>.04||!upr){h.hold.y=null;}
  else{if(h.hold.y===null)h.hold.y=hdg;let e=h.hold.y-hdg;e=Math.atan2(Math.sin(e),Math.cos(e));rCmd+=Math.max(-30*DEG,Math.min(30*DEG,e*2.0))*(1-spdY);}
  if(upr)rCmd+=j.beta*1.6*Math.max(0,spdY)*(j.onGnd?0:1);
  if(spdY>0&&!gnd&&upr)rCmd+=Math.tan(Math.max(-1.2,Math.min(1.2,bnk)))*G/Math.max(V,12)*.55*spdY*Math.cos(pit);
  // coaxial collective-yaw coupling: raising the lever shifts torque between the two rotors, a small yaw kick the pedals must trim out
  {const dl=h.lev0==null?0:(lever-h.lev0)/Math.max(dt,1e-4);h.lev0=lever;rCmd+=Math.max(-2,Math.min(2,dl))*(H.yawK||3.2)*DEG*(1-spdY*.6);}
  if(window.HELISYS)rCmd+=HELISYS.yaw(j,h,H);
  h.qc=qCmd;h.cpIn=cp;const tau=.17/Math.max(.6,Math.min(1.1,Nr)),ka=1-Math.exp(-dt/tau),w=h.w;
  // rotor-disc flapping effects the SAS has to fight: flap-back (speed makes the nose rise), dihedral (sideslip rolls the aircraft away from the wind),
  // and cyclic cross-coupling (a pitch input leaks a little into roll). All three vanish with the rotor unloaded on the ground.
  if(!j.onGnd){const air=Math.min(1,Math.max(0,(hgt-groundAt(pos.x,pos.z)-H.gh)/6));
    qCmd+=vf*.0011*Nr*air;pCmd+=-vr*.0042*Nr*air+cp*H.rateP*DEG*.07*(Math.abs(cp)>.04?1:0);}
  // v313 dynamics: effective translational lift (the rotor leaves its own wake at about 8-15 m/s: inflow changes shake the disc), and the disc answering gusts at low
  // speed (a rotor in a hover feels every gust through the whole disc, far more than a fixed wing at the same airspeed)
  h.tt=(h.tt||0)+dt;
  if(!j.onGnd&&Nr>.5){const ag=Math.min(1,Math.max(0,(hgt-groundAt(pos.x,pos.z)-H.gh)/5)),etl=Math.exp(-Math.pow((Vh-11)/3.2,2))*ag*Math.min(1,T/(m*G)),slow=ag*(1-Math.min(1,Vh/40));
    pCmd+=Math.sin(h.tt*17.3)*etl*5*DEG;qCmd+=(Math.sin(h.tt*13.1)*4-2.5*Math.cos(h.tt*2.1))*etl*DEG;
    if(j.gust){const gf=j.gust.dot(f),gr=j.gust.dot(rt);qCmd+=gf*1.1*DEG*slow;pCmd+=-gr*1.1*DEG*slow;}}
  w.p+=(qCmd*eff-w.p)*ka;w.r+=(pCmd*eff-w.r)*ka;w.y+=(rCmd*eff-w.y)*ka;
  // ground contact
  const gh=groundAt(pos.x,pos.z),gl=gh+H.gh;
  let touch=false;
  if(j.pos.y<=gl+.02){
    const sink=Math.max(0,-j.vel.y),tilt=Math.acos(Math.max(-1,Math.min(1,j.up(_u).y)))/DEG;
    if(!j.onGnd){
      j.td=sink;const pav=onPaved(j.pos.x,j.pos.z),slope=Math.max(Math.abs(groundAt(j.pos.x+10,j.pos.z)-groundAt(j.pos.x-10,j.pos.z)),Math.abs(groundAt(j.pos.x,j.pos.z+10)-groundAt(j.pos.x,j.pos.z-10)))/20;
      const hv=Math.hypot(j.vel.x,j.vel.z);
      if(sink>9||tilt>48||(sink>5.5&&tilt>25)){j.kill(sink>9?'CRASHED':'ROLLOVER');return;}
      if(sink>3.4){j.hp-=(sink-3.4)*9;j.dm.gear=Math.max(0,j.dm.gear-(sink-3.4)*14);if(j===player)flash('HARD LANDING',1300);}
      else if(j===player)flash('TOUCHDOWN',900);
      if(tilt>22&&hv>6){j.hp-=(tilt-22)*1.5;}
      if(slope>.3){j.kill('ROLLOVER');return;}
      for(let i=0;i<6;i++)smoke.emit(j.pos,new V3(rnd(-3,3),rnd(.5,3),rnd(-3,3)),2,1,5,.6,.6,.6,.35,.4);
      if(j.hp<=0){j.kill('CRASHED');return;}
      j.onGnd=true;h.gHdg=j.hdg*DEG;}
    touch=true;
    j.pos.y=gl;if(j.vel.y<0)j.vel.y=0;
  }else if(j.pos.y>gl+.25&&j.onGnd){j.onGnd=false;if(j===player)flash('AIRBORNE',700);h.hold.p=h.hold.r=h.hold.y=null;}
  if(touch||j.onGnd){
    // wheels: rolling friction, brakes, nose-wheel steering, lateral grip; the aircraft settles level on the wheels as the rotor unloads
    const W=j._W,hd=j.hdg*DEG,fx=Math.sin(hd),fz=-Math.cos(hd),rx=Math.cos(hd),rz=Math.sin(hd);
    let lon=j.vel.x*fx+j.vel.z*fz,lat=j.vel.x*rx+j.vel.z*rz;
    const pav=onPaved(j.pos.x,j.pos.z),load=Math.max(0,Math.min(1,1-T*Math.max(0,j.up(_u).y)/(m*G)));
    const mu=(pav?.03:.12)*(1+.0),dec=(mu+.35*j.brk)*G*load*dt;
    lon=lon>0?Math.max(0,lon-dec):Math.min(0,lon+dec);
    // dynamic rollover: sliding sideways with the rotor carrying part of the weight, a skid catches and the aircraft pivots over it; the SAS cannot hold it once it starts
    if(j.onGnd&&load<.85&&Math.abs(lat)>1.2){const ex=(Math.abs(lat)-1.2)*(.3+(1-load));w.r+=Math.sign(lat)*ex*.1*dt*60*.35;}
    if(j.onGnd&&load<.9&&Math.abs(bnk)>38*DEG&&Math.abs(w.r)>.05){j.kill('DYNAMIC ROLLOVER');return;}
    lat*=Math.exp(-dt*(4+8*load));
    j.vel.x=fx*lon+rx*lat;j.vel.z=fz*lon+rz*lat;
    if(load>.15){const settle=1-Math.exp(-dt*(1.2+3*load));w.p+=((-pit)*3-w.p)*settle*.5;w.r+=((-bnk)*3-w.r)*settle*.5;}
    // nose wheel steering with the pedals
    if(load>.3)w.y+=(cy*45*DEG*Math.min(1,Math.hypot(lon,lat)/3+.25)*(1)-w.y)*Math.min(1,dt*6)*load;
    // rotor / engine shut down on the ground: blades droop; the rotor brake stops them
    j.vel.y=Math.max(0,j.vel.y);
  }
  // integrate the attitude
  {const wx=w.p,wy=-w.y,wz=-w.r,wl=Math.hypot(wx,wy,wz);
   if(wl>1e-6){_ax.set(wx/wl,wy/wl,wz/wl);_q.setFromAxisAngle(_ax,wl*dt);j.q.multiply(_q);j.q.normalize();}}
  // rotor visuals
  const rt_=j.mesh.userData.rotors;
  if(rt_&&last){h.rot=(h.rot+h.Nr*H.om0*dt*2)%(Math.PI*2);rt_[0].rotation.y=h.rot;rt_[1].rotation.y=-h.rot;
    const bl=j.mesh.userData.blur;if(bl){const o=Math.max(0,Math.min(.22,(h.Nr-.35)*.3));for(const b of bl){b.material.opacity=o;b.visible=o>.01;}}
    for(let i=0;i<2;i++)for(const bd of rt_[i].userData.blades){bd.visible=h.Nr<.55||Math.floor(performance.now()/60)%2===0||true;}}
  // dust and spray under the rotor wash near the ground
  const agl=hgt-gh-H.gh;
  if(agl<22&&last&&h.Nr>.6&&T>m*G*.5&&gfx.mode!=='LOW'){h.dust+=dt*55*Math.min(1,T/(m*G))*(1-agl/22);
    while(h.dust>=1){h.dust-=1;const an=Math.random()*6.2832,sp=11+Math.random()*14;
      smoke.emit(_va.set(j.pos.x+Math.cos(an)*3.5,gh+.5,j.pos.z+Math.sin(an)*3.5),new V3(Math.cos(an)*sp,.5+Math.random()*2,Math.sin(an)*sp),2.8,2.2,8,.62,.58,.5,.3,.5);}}
  if(j.hp<60&&Math.random()<.6)smoke.emit(j.pos,null,4,3,14,.25,.24,.23,.55,.3);
  j.thrKeep=lever;
}
function CTover(T,q,H){const ct=T/Math.max(q,1);return Math.max(0,ct/H.ctMax-.8);}

/* ---------------- hook into Jet.step ---------------- */
{const _st=Jet.prototype.step;
 Jet.prototype.step=function(dt,f){
  if(this.ac&&this.ac.heli&&!this.remote){heliStep(this,Math.min(dt,.05));return;}
  return _st.call(this,dt,f);};}
HELI.step=heliStep;

/* the generic jet gear mesh makes no sense on a helicopter: the model carries its own undercarriage */
{const _b=window.buildGearMesh;
 if(typeof _b==='function')window.buildGearMesh=function(j){if(j&&j.ac&&j.ac.heli){if(!j.gearMesh){const g=new THREE.Group();g.visible=false;j.gearMesh=g;j.gearLegs=[];}return;}return _b.apply(this,arguments);};}

/* ---------------- engine start / stop ---------------- */
function startStop(){const P=window.player;if(!P||!P.ac||!P.ac.heli)return;const h=st(P);
  if(h.run){h.run=false;flash('ENGINES · SHUTDOWN',1200);}
  else{if(P.totalFuel<=0){flash('NO FUEL',1000);return;}h.run=true;h.start=P.onGnd?6:1.2;h.warm=0;flash(P.onGnd?'ENGINES · START':'ENGINES · RELIGHT',1200);}}
HELI.startStop=startStop;
addEventListener('keydown',e=>{if(e.code==='Semicolon'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&window.game&&game.running&&document.querySelector('#menu')&&document.querySelector('#menu').hidden){e.preventDefault();startStop();}});

/* ---------------- Ka-50 procedural model ---------------- */
function makeKa50(){
  const g=new THREE.Group(),
    olive=SKIN(0x5b6048),dk=SKIN(0x3e4332),lt=SKIN(0x777d62),blk=SKIN(0x1c1f22,10),met=SKIN(0x57544e,60),grey=SKIN(0x6b6f68),rub=SKIN(0x151616,4);
  const add=(geo,mat,x,y,z,par=g,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);par.add(m);return m;};
  const ell=(sx,sy,sz,mat,x,y,z)=>{const m=add(new THREE.SphereGeometry(1,24,16),mat,x,y,z);m.scale.set(sx,sy,sz);return m;};
  // fuselage: the narrow, deep Ka-50 body, nose to -Z
  ell(.78,.98,3.5,olive,0,-.05,-.55);                            // main body
  ell(.62,.72,2.2,olive,0,-.2,-3.6);                              // nose
  ell(.5,.5,1.5,dk,0,-.42,-4.7);                                  // Shkval / nose sensor housing
  add(new THREE.SphereGeometry(.36,16,12),blk,0,-.55,-5.55);       // Shkval-V turret ball
  add(new THREE.CylinderGeometry(.3,.3,.04,14),blk,0,-.34,-5.15,g,Math.PI/2,0,0).scale.set(1,1,1);
  // canopy: flat armoured glass panels
  const glass=new THREE.Group();g.add(glass);
  const gm=new THREE.MeshPhongMaterial({color:0x9fc4cf,transparent:true,opacity:.34,shininess:90,specular:0x888888,depthWrite:false});
  add(new THREE.BoxGeometry(1.0,.62,1.5),gm,0,.55,-3.0,glass,.5,0,0).scale.set(1,1,1);
  add(new THREE.BoxGeometry(1.0,.5,1.1),gm,0,.7,-2.0,glass,.12,0,0);
  for(const sx of[-1,1])add(new THREE.BoxGeometry(.05,.62,1.7),olive,sx*.5,.5,-2.6,glass);
  g.userData.canopy=glass;
  // engine nacelles and gearbox fairing
  for(const sx of[-1,1]){ell(.5,.52,2.1,olive,sx*.9,.72,.25);add(new THREE.CylinderGeometry(.34,.34,.5,14),blk,sx*.9,.7,-1.7,g,Math.PI/2,0,0);add(new THREE.CylinderGeometry(.22,.3,.8,12),met,sx*.9,.68,2.6,g,Math.PI/2,0,0);}
  ell(.7,.55,1.2,olive,0,1.05,.3);                                // gearbox
  // tail boom and the Ka-50 stabiliser with its two fins
  add(new THREE.CylinderGeometry(.3,.5,5.4,14),olive,0,.0,4.0,g,Math.PI/2,0,0);
  add(new THREE.BoxGeometry(3.4,.08,.75),olive,0,.15,6.4);
  for(const sx of[-1,1]){add(new THREE.BoxGeometry(.07,1.55,1.05),olive,sx*1.7,.7,6.3);add(new THREE.BoxGeometry(.5,.07,.9),dk,sx*1.7,1.5,6.45);}
  add(new THREE.BoxGeometry(.06,1.1,.9),olive,0,.65,6.7);          // centre keel fin
  // stub wings with four pylons
  const wing=add(new THREE.BoxGeometry(7.34,.14,1.25),lt,0,-.12,.55);
  for(const sx of[-1,1]){add(new THREE.BoxGeometry(.5,.16,1.2),dk,sx*3.6,-.12,.55);
    for(const x of[2.0,3.3])add(new THREE.BoxGeometry(.12,.28,.9),met,sx*x,-.32,.55);}
  // 2A42 cannon on the right of the fuselage
  add(new THREE.BoxGeometry(.5,.45,1.3),dk,.98,-.55,-1.3);
  const gun=add(new THREE.CylinderGeometry(.065,.075,2.5,10),met,.98,-.55,-2.75,g,Math.PI/2,0,0);g.userData.gun=gun;
  // undercarriage: nose leg and two main legs, fixed in the model
  const leg=(x,z,r,w)=>{const gr=new THREE.Group();gr.position.set(x,-.7,z);g.add(gr);
    add(new THREE.CylinderGeometry(.045,.055,.7,8),grey,0,-.2,0,gr);
    const wh=add(new THREE.CylinderGeometry(r,r,w,16),rub,0,-.55,0,gr);wh.rotation.z=Math.PI/2;
    const hb=add(new THREE.CylinderGeometry(r*.55,r*.55,w+.02,10),grey,0,-.55,0,gr);hb.rotation.z=Math.PI/2;return gr;};
  leg(0,-3.0,.2,.14);leg(-1.15,.9,.26,.2);leg(1.15,.9,.26,.2);
  // rotor mast and the two contra-rotating rotors (3 blades each)
  add(new THREE.CylinderGeometry(.15,.2,2.0,12),met,0,1.9,.3);
  const blur=[];const rot=[];
  const mkRotor=(y,spin)=>{const r=new THREE.Group();r.position.set(0,y,.3);g.add(r);r.userData.blades=[];
    add(new THREE.CylinderGeometry(.24,.24,.22,14),dk,0,0,0,r);
    for(let i=0;i<3;i++){const a=new THREE.Group();a.rotation.y=i*Math.PI*2/3;r.add(a);
      const b=add(new THREE.BoxGeometry(7.0,.035,.38),SKIN(0x23262a,12),3.7,0,0,a);b.rotation.x=.05;r.userData.blades.push(b);}
    const d=new THREE.Mesh(new THREE.CircleGeometry(7.2,40),new THREE.MeshBasicMaterial({color:0x2a2d30,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
    d.rotation.x=-Math.PI/2;d.visible=false;r.add(d);blur.push(d);return r;};
  rot.push(mkRotor(2.65,1));rot.push(mkRotor(3.3,-1));
  g.userData.rotors=rot;g.userData.blur=blur;
  // navigation lights
  for(const [sx,c] of[[-1,0xff2a1a],[1,0x22ff55]]){const l=add(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:c}),sx*3.72,-.1,.55);}
  const ab=new THREE.Group();g.add(ab);g.userData.ab=ab;
  g.traverse(o=>{if(o.isMesh&&!o.material.transparent){o.castShadow=true;o.receiveShadow=true;}});
  return g;}
window.makeKa50=makeKa50;

/* ---------------- registration (the same tables coldwar-jets.js fills for a jet) ---------------- */
(function register(){
  const id='Ka-50',src='Su-25';if(!AC[src]){console.warn('[heli] no source airframe',src);return;}
  const SOV_RKT_=['B-8M1'],has=k=>!!(MSL[k]||AGW[k]||k==='TK'||k==='PTB'),L=(...a)=>a.flat().filter(has);
  const ST_={1:[0,-.32,.55],2:[0,-.32,.55],3:[0,-.32,.55],4:[0,-.32,.55]};
  ST_[1]=[-3.3,-.52,.55];ST_[2]=[-2.0,-.52,.55];ST_[3]=[2.0,-.52,.55];ST_[4]=[3.3,-.52,.55];
  const over={name:'Ka-50',model:makeKa50,st:ST_,heli:KA50,empty:7200,fuel:1500,tank:440,S:30,CLa:3,cd0:.1,k:.2,mil:1,ab:1,spool:6,abLight:99,
    gLim:3.5,gHi:undefined,aoaLim:25,roll:1.5,fbw:false,noLimiter:true,vne:KA50.vne,rcs:6,irs:2.2,pit:'ka50',cockpit:'ka50',eye:[2.45,.5],ff:[.2,.4,.4],
    rwr:'25',spo:3,tankName:'PTB-550',rel:[],keepJ:[],rwrKind:'SPO-15',gun:{name:'2A42',rate:13,v:960,dmg:20,ammo:460,spread:.0032,acc:0,spin:0}};
  cloneType(src,id,over);
  const A=AC[id];delete A.noAB;delete A.swing;
  A.rel=['1','4','2','3'];A.rio=false;A.wso=false;A.crew=1;A.eye=[2.45,.5];A.cwSrc=src;A.cwPit='Ka-50 · cockpit after the DCS Black Shark manual';
  STN[id]={1:L('B-8M1','TK'),2:L('B-8M1','TK'),3:L('B-8M1','TK'),4:L('B-8M1','TK')};
  let ld={2:'B-8M1',3:'B-8M1'};
  if(window.vikhrRack&&vikhrRack(id,['1','4'],6))ld=Object.assign(vikhrFull(['1','4'],6),ld);   // APU-6 on each outer pylon: 12 Vikhr
  for(const era of['cold','modern'])LOAD[era][id]=validLoad(id,era,ld);
  LOAD.guns[id]={};STRIKE_LOAD[id]=Object.assign({},LOAD.cold[id]);
  for(const era of Object.keys(CMS))CMS[era][id]=[128,128];
  ENGN[id]='2× TV3-117VMA';CALLS[id]='SHARK';NCTR_ID[id]='KA-50';FOE[id]='F-4E';ACROLE[id]='ATTACK HELICOPTER';RWR_OF[id]='SPO-15LM';
  // head-on picture for the loadout screen: coaxial rotors, narrow fuselage, two engine intakes, stub wings with the outer pylons, twin tail fins
  FV[id]={hw:7.4,y1:3.2,span:'14.5 m (rotor)',d:()=>{let s='';
    s+=ell(0,-1.05,.2,.2,'sk-dark')+ell(-1.35,-1.0,.22,.22,'sk-dark')+ell(1.35,-1.0,.22,.22,'sk-dark');
    s+=one([[-.1,.9],[.1,.9],[.12,2.55],[-.12,2.55]],'sk-body');
    s+=bth([[0,2.62],[7.2,2.5],[7.2,2.44],[0,2.52]],'sk-wing')+bth([[0,3.08],[7.2,2.96],[7.2,2.9],[0,2.98]],'sk-wing');
    s+=bth([[-.5,-.3],[-3.65,-.4],[-3.65,-.52],[-.5,-.5]].map(([x,y])=>[-x,y]),'sk-wing');
    s+=bth([[-3.7,-.24],[-3.6,-.24],[-3.6,-.62],[-3.7,-.62]].map(([x,y])=>[-x,y]),'sk-body');
    s+=bth([[1.9,.3],[2.1,.3],[2.12,1.25],[1.95,1.25]],'sk-body');
    s+=ell(0,.2,.72,.82,'sk-body');
    s+=bth([[.5,.3],[1.1,.55],[1.1,1.05],[.5,.95]],'sk-body')+ell(.78,.7,.34,.38,'sk-dark')+ell(-.78,.7,.34,.38,'sk-dark');
    s+=ell(0,.5,.46,.4,'sk-can');return s;}};
  if(typeof RUS!=='undefined')RUS.add(id);
  if(typeof NO_CCIP!=='undefined')NO_CCIP.delete(id);
  A.name='Ka-50';A.role='USSR · ATTACK HELICOPTER · COAXIAL ROTORS · SHKVAL-V · 2A42 · VIKHR';
  HELI.ids.push(id);
  console.info('[heli] registered '+id);
})();
})();
