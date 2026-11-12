/* v277 — radar missile seeker architectures (SARH / ARH). Gameplay-level parameters (my estimates, not published data).
   Each radar missile gets an architecture: antenna size -> acquisition range from RCS/aspect/rain, velocity-gate (notch) width, memory time,
   chaff gate (Doppler discrimination), jam burn-through scaling with ECCM, and re-acquisition. Layered on SENSOR_FUSE; wraps Missile.update and Decoy.engage. */
(function(){
if(typeof Missile==='undefined'||typeof MSL==='undefined')return;
const W=window.SENSOR_WAR,cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const A={ // ant: seeker dish diameter m (acq range), notch: m/s half-width of main-lobe-clutter notch, mem: s, chaff: gate scale, cw: CW illumination
  CW:  {name:'CW conical-scan SARH',ant:.20,notch:60,mem:1.2,chaff:1.0,cw:1,agile:0,bt:.0},
  MONO:{name:'monopulse CW SARH',   ant:.20,notch:45,mem:2.0,chaff:.8, cw:1,agile:0,bt:.2},
  PDS: {name:'pulse-Doppler SARH',  ant:.25,notch:30,mem:3.0,chaff:.55,cw:0,agile:0,bt:.4},
  PDA: {name:'pulse-Doppler active',ant:.18,notch:35,mem:3.5,chaff:.6, cw:0,agile:1,bt:.5},
  APD: {name:'agile PD active + HOJ',ant:.18,notch:25,mem:5.0,chaff:.35,cw:0,agile:1,bt:.8},
  TVM: {name:'track-via-missile',   ant:.35,notch:35,mem:4.0,chaff:.5, cw:0,agile:0,bt:.6}};
const MAP={'AIM-7E':'CW','AIM-7E-2':'CW','R-24R':'CW','R-40RD':'CW','AIM-7F':'MONO','R-27R':'MONO','R-27ER':'MONO','AIM-7M':'PDS','AIM-7P':'PDS',
  'AIM-120C':'APD','R-77':'PDA','AIM-54A':'PDA','AIM-54C':'APD'};
const S=window.SENSOR_ARH={on:true,A,MAP,lost:0,chaffRej:0,notch:0,acqFail:0,last:null};
const archOf=m=>{const k=MAP[m.type];return k?A[k]:null;};
// acquisition range: R^4 with dish size, RCS, aspect and rain (K/Ku for active heads)
function acqRange(m,tg,a){const rcs=(tg.ac&&tg.ac.rcs||5);const los=tg.pos.clone().sub(m.pos).normalize();
  const asp=Math.abs(tg.fwd?tg.fwd(new THREE.Vector3()).dot(los):.5);const rf=.55+.45*(1-asp);   // beam aspect returns more than nose/tail on average
  let R=18000*Math.pow(a.ant/.18,1)*Math.pow(rcs/5*rf,.25)*(a.agile?1.1:1);
  const rd=W&&W.rainDb?W.rainDb(R*.5,m.def.seek==='ARH'?15:9.6):0;R*=Math.pow(10,-cl(rd,0,12)/40);return R;}
const _u=Missile.prototype.update;
Missile.prototype.update=function(dt){
  const a=S.on&&this.alive&&archOf(this),d=this.def;
  if(a){const st=this.rsx||(this.rsx={a,acq:false,gateT:0,lostT:0,t0:this.t});
    const tg=this.track&&!this.track.isDecoy?this.track:this.target;
    if(tg&&tg.alive&&tg.pos){
      const rel=tg.pos.clone().sub(this.pos),R=rel.length();rel.divideScalar(R||1);
      const rr=Math.abs(tg.vel.clone().sub(this.vel).dot(rel));          // closing speed seen by the velocity gate
      // ARH: self-acquisition at pitbull only inside the seeker's own detection range
      if(d.seek==='ARH'&&this.active&&!st.acq&&this.track){if(R<acqRange(this,tg,a))st.acq=true;else if(Math.random()<dt*.9){this.track=null;this.noReacq=this.t+.4;S.acqFail++;}}
      // main-lobe clutter / speed gate notch: a near-beam target below the missile falls inside the notch and drops out; wide for CW, narrow for agile PD
      const beamD=Math.abs(tg.vel.clone().sub(this.vel).dot(rel))-Math.abs(this.vel.clone().dot(rel))*0;   // relative closing already
      const lookDown=tg.pos.y<this.pos.y-250,notch=a.notch*(1-.35*(d.ccm||0));
      if((this.track||d.seek==='SARH')&&lookDown&&(this.active||this.dl)&&Math.abs(tg.vel.dot(rel))<notch&&Math.random()<dt*(a.cw?.9:.5)){this.track=null;S.notch++;if(d.seek==='SARH')this.seekLost=true;S.last='notch drop-out ('+a.name+')';}
      // gate memory: SARH loses illumination -> memory time depends on architecture (overrides the generic value); simple coast is handled by base class
      if(d.seek==='SARH'&&this.seekLost&&st.lostT<a.mem&&this.t>3){st.lostT+=dt;if(st.lostT<a.mem){this.seekLost=false;this.track=this.track||tg;this.illLost=(this.illLost||0)*0;}}
      else if(!this.seekLost)st.lostT=Math.max(0,st.lostT-dt);
    }}
  const r=_u.call(this,dt);return r;};
// chaff discrimination: temporary ECCM override per architecture inside Decoy.engage
if(typeof Decoy!=='undefined'&&Decoy.prototype.engage){const _e=Decoy.prototype.engage;
  Decoy.prototype.engage=function(dt){const sv=[];if(S.on)for(const m of missiles){const a=m.alive&&archOf(m);if(a&&m.def.seek!=='IR'){sv.push([m.def,m.def.ccm]);m.def.ccm=Math.min(.95,(m.def.ccm||0)+(1-a.chaff)*.9);}}
    try{return _e.call(this,dt);}finally{for(const [df,c] of sv)df.ccm=c;}};}
// F-4 row
const RD=window.RADARDBG;if(RD){const p=RD.extraRows;RD.extraRows=()=>{const L=p?p():[];L.push('','RADAR MISSILE SEEKERS  acq-fail '+S.acqFail+'  notch '+S.notch+(S.last?'  last: '+S.last:''));return L;};}
})();
