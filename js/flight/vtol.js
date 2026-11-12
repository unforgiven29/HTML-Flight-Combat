/* ============================================================================================================================
   vtol.js — powered-lift flight model for the V/STOL jets (AV-8B Harrier II, Yak-38 Forger, Yak-141 Freestyle)
   Hooks into Jet.step (game.js `vtHook`).  Per DCS AV-8B guide / NATOPS: Pegasus 11-61 with four rotating nozzles (0..98.5°, STO detent ≈10°, VL stop 82°,
   braking beyond), water injection (≈400 lb) for hover thrust, RCS puffer jets fed by engine bleed (authority follows RPM), LIDS ground cushion; Yak lift
   jets (2× RD-36-35FV / 2× RD-41) that spool when the nozzle lever passes 60° and are cut again above ≈250 kt.
   Comma / Period (the wing-sweep keys) step the nozzle lever through its detents; the stop must be released to pass the VL stop.
   ============================================================================================================================ */
(function(){
const DEG=Math.PI/180;
const VT=window.VT={st:null,step:null,edp:null,setLever:null,toggleWater:null};

function st(j){return j.vt||(j.vt={noz:0,cmd:0,stop:true,stopArm:0,ln:0,liftOn:false,water:(j.ac.vstol&&j.ac.vstol.water)||0,wsw:true,inj:0,w:{p:0,y:0,r:0},ge:1,h:999,hgi:0,vlw:false,T:0,msgT:0,dust:0});}
VT.st=st;

/* ---- the hook called from Jet.step: adds the vectored-thrust / lift-jet accelerations to `a` and returns jet-borne rate commands when hovering ---- */
Jet.prototype.vtHook=function(dt,a,c,T,m,f,u,rt,V,pr,yr){
  const v=this.ac.vstol;if(!v||this.remote)return null;const s=st(this);
  // nozzle lever -> nozzle: hydraulic motor slews at v.rate °/s, the stop holds the lever at the VL stop until released
  if(v.stopAt){if(s.cmd<=v.stopAt-4)s.stop=true;if(s.stop&&s.cmd>v.stopAt)s.cmd=v.stopAt;}
  if(s.stopArm>0)s.stopArm-=dt;
  s.cmd=Math.max(0,Math.min(v.nozMax,s.cmd));
  s.noz+=Math.max(-v.rate*dt,Math.min(v.rate*dt,s.cmd-s.noz));
  const sig=rho(this.pos.y)/1.225,gh=groundAt(this.pos.x,this.pos.z),h=Math.max(0,this.pos.y-gh-GH);s.h=h;
  // ---- water injection: restores the full wet rating at the top of the throttle; a dry engine falls to wetK of rating ----
  let Tn=T;
  if(v.water){const want=s.wsw&&s.water>0&&this.thr>=.72&&this.n>.85;s.inj+=Math.max(-.5*dt,Math.min(.5*dt,(want?1:0)-s.inj));
    if(s.inj>.05)s.water=Math.max(0,s.water-2.0*dt*s.inj);
    Tn*=1-(1-v.wetK)*Math.max(0,Math.min(1,(this.thr-.45)/.3))*(1-s.inj);
    if(this===player&&want&&s.water<=0&&s.msgT<=0){flash('WATER · EMPTY',900);s.msgT=3;}}
  s.msgT-=dt;
  // ---- lift jets (Yak): armed above the lever's ON point, cut below OFF or above ~250 kt; spool over v.lift.spool seconds ----
  let Fl=0;
  if(v.lift){if(s.cmd>=v.lift.on&&V<110)s.liftOn=true;else if(s.cmd<v.lift.off&&V>65)s.liftOn=false;// the pilot shuts the lift engines down once the wing carries the jet (≈130 kt)
    if(V>110||this.totalFuel<=0)s.liftOn=false;
    const sp=v.lift.spool;s.ln+=Math.max(-dt/(sp*.5),Math.min(dt/sp,(s.liftOn?1:0)-s.ln));
    Fl=v.lift.F*s.ln*Math.pow(sig,.85)*(this.dm&&this.dm.eng<=0?0:1);
    if(Fl>0)this.fuel=Math.max(0,this.fuel-v.lift.sfc*Fl*dt);}
  // ---- vectored thrust: exhaust leaves aft at nozzle 0°, straight down at 90° (thrust acts forward / up) ----
  const th=s.noz*DEG,cs=Math.cos(th),sn=Math.sin(th);
  // ground cushion / fountain lift inside about a wingspan of the ground; the AV-8B's LIDS strakes and gun pods trap it
  let ge=1;const dn=Math.max(0,sn);
  if(dn>.3&&h<16){const k=Math.pow(1-h/16,2);ge=1+(v.lids?.085:.04)*k*dn;}
  s.ge=ge;
  a.addScaledVector(f,(Tn*ge*cs-T)/m);
  const Fup=Tn*ge*sn+Fl*ge;
  if(Fup!==0)a.addScaledVector(u,Fup/m);
  s.T=Tn;this.vtLift=Math.max(0,Fup);
  // hot-gas ingestion / VL gross-weight cautions
  s.hgi+=((h<8&&dn>.85&&V<25?1:0)-s.hgi)*Math.min(1,dt*.5);
  s.vlw=!!(v.vlMax&&this.mass>v.vlMax&&s.noz>60);
  if(this===player&&s.vlw&&h<80&&s.msgT<=0){flash('VL GROSS WEIGHT · '+Math.round(this.mass*2.2046)+' LB',1200);s.msgT=4;}
  // ground dust / spray under the jet-borne thrust
  if(h<24&&Fup>.45*m*G&&!(this.dm&&this.dm.eng<=0)){s.dust+=dt*60*Math.min(1,Fup/(m*G))*(1-h/24);
    while(s.dust>=1){s.dust-=1;const ang=Math.random()*6.2832,sp=14+Math.random()*16,w=this.pos;
      smoke.emit(_vtp.set(w.x+Math.cos(ang)*3,gh+.6,w.z+Math.sin(ang)*3),_vtv.set(Math.cos(ang)*sp,.6+Math.random()*2.4,Math.sin(ang)*sp),2.6,2.2,9,.62,.58,.5,.34,.5);}}
  // ---- jet-borne attitude control: RCS puffers (bleed from the engine, so authority follows RPM) command body rates, attitude holds on a centred stick ----
  const wN=Math.max(0,Math.min(1,(s.noz-5)/30)),wL=v.lift?s.ln:0,spdK=Math.max(0,Math.min(1,(115-V)/65)),wJ=Math.max(wN,wL)*spdK;
  const rc=v.rcs,rk=Math.max(0,Math.min(1,.2+1.1*this.n))*(this.dm&&this.dm.eng<=0?0:1),k=1-Math.exp(-dt*3.2),w=s.w;
  w.p+=(c.p*rc.p*DEG*rk-w.p)*k;w.y+=(c.y*rc.y*DEG*rk-w.y)*k;w.r+=(c.r*rc.r*DEG*rk-w.r)*k;
  if(wJ<=0.001)return null;
  // gentle horizontal damping from the downwash (no real hover is perfectly free-floating)
  const dmp=.05*wJ;a.x-=this.vel.x*dmp;a.z-=this.vel.z*dmp;
  return{pr:pr+(w.p-pr)*wJ,yr:yr+(w.y-yr)*wJ,rr:this.rr+(w.r-this.rr)*wJ};
};
const _vtp=new V3(),_vtv=new V3();

/* ---- rotation speed falls as the vectored thrust takes over the weight (rolling STO: nozzles 40-60° at 60-80 kt) ---- */
{const _vr=Jet.prototype.vRot;Jet.prototype.vRot=function(){const r=_vr.call(this);if(!this.ac.vstol)return r;
  return r*Math.sqrt(Math.max(.15,1-(this.vtLift||0)/(this.mass*G)));};}

/* ---- nozzle lever ---- */
const NAME={0:'AFT',10:'STO',82:'VL STOP',98.5:'BRAKE'};
function stepLever(d){
  const P=player;if(!P||!P.alive)return false;const v=P.ac&&P.ac.vstol;if(!v)return false;
  const s=st(P),A=v.stops;let i=-1;
  if(d>0){i=A.findIndex(x=>x>s.cmd+.5);if(i<0)i=A.length-1;}else{for(let k=0;k<A.length;k++)if(A[k]<s.cmd-.5)i=k;if(i<0)i=0;}
  if(v.stopAt&&A[i]>v.stopAt&&s.stop){
    if(s.stopArm>0){s.stop=false;s.stopArm=0;}
    else{s.stopArm=2.5;try{flash('NOZZLE STOP '+v.stopAt+'° · PRESS AGAIN TO RELEASE',1500);sfx.click();}catch(_){}return true;}}
  if(P.vt&&!(v.stopAt&&A[i]>v.stopAt))s.stop=true;
  s.cmd=A[i];
  try{flash('NOZZLES '+s.cmd+'°'+(NAME[s.cmd]&&v.type==='harrier'?' · '+NAME[s.cmd]:''),900);sfx.click();}catch(_){}
  return true;}
VT.step=stepLever;
VT.setLever=function(deg){const P=player;if(!P||!P.ac.vstol)return;const s=st(P),v=P.ac.vstol;
  let t=Math.max(0,Math.min(v.nozMax,deg));if(v.stopAt&&t>v.stopAt&&s.stop)t=v.stopAt;s.cmd=t;};
VT.toggleWater=function(){const P=player;if(!P||!P.ac.vstol||!P.ac.vstol.water)return;const s=st(P);s.wsw=!s.wsw;try{flash('WATER '+(s.wsw?'ON':'OFF'),900);sfx.click();}catch(_){}};
{const _sw=sweepStep;sweepStep=function(d){const P=player;if(P&&P.alive&&P.ac&&P.ac.vstol){stepLever(d);return;}return _sw.apply(this,arguments);};}

/* ---- engine data panel values (EDP): RPM %, JPT °C, duct pressure psi, water lb ---- */
VT.edp=function(j){const s=st(j),n=j.n||0,v=j.ac.vstol||{};const hp=Math.max(0,Math.min(1,j.thr/.8));
  return{rpm:Math.min(104,Math.round(n*(60+44*hp))),jpt:Math.round(n*(250+420*hp+150*s.inj*0-60*s.inj)+(s.hgi*60)),duct:Math.round(Math.min(1,n*1.05)*(32+34*hp)*(s.noz>5?1:.95)),
    noz:s.noz,cmd:s.cmd,water:Math.round((s.water||0)*2.2046),inj:s.inj,wsw:s.wsw,stop:s.stop,hgi:s.hgi,vlw:s.vlw,ln:s.ln,v};};

/* ---- visuals: nozzles rotate with the lever, lift-jet doors open as the lift engines spool ---- */
{const _sy=Jet.prototype.sync;Jet.prototype.sync=function(){_sy.call(this);const ud=this.mesh&&this.mesh.userData;if(!ud||!ud.noz)return;
  const s=this.vt,n=s?s.noz:0;const rx=-(90-n)*DEG;for(const pv of ud.noz)pv.rotation.x=rx;
  if(ud.liftDoors){const o=s?-1.15*Math.min(1,s.ln*1.5+(s.liftOn?.4:0)):0;for(const d of ud.liftDoors)d.rotation.x=o;}};}

/* ---- cleanup on respawn/new sortie happens by creating a fresh Jet (vt is lazily created per jet) ---- */
})();
