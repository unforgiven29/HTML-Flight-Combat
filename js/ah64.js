/* v314 — AH-64A Apache (Hughes / McDonnell Douglas): two-seat attack helicopter with a WSO (the front-seat gunner) who runs the TADS targeting sensor,
   M230 30 mm chain gun on a chin turret slaved to the TADS line of sight, AGM-114K Hellfire II (semi-active laser, rides the TADS spot), M261 Hydra 70 pods.
   The cockpit is the Ka-50 one for now. Airframe, rotor, engine and weapon figures are gameplay-level estimates after public AH-64A data, not published model data.
   The same slaved-gun mount (smaller travel) is fitted to the Ka-50's 2A42. */
(function(){
'use strict';
if(!window.HELI||typeof cloneType!=='function'||!AC['Ka-50']||!window.V121||!V121.PODS||typeof SNS==='undefined'){console.warn('[ah64] heli base missing');return;}
const ID='AH-64A',DEG=Math.PI/180;

/* ---------- weapons ---------- */
const agd=(k,base,over,sn,name)=>{if(AGW[k]||!AGW[base])return;AGW[k]=Object.assign({},AGW[base],over||{});SN[k]=sn;STORE_NAME[k]=name;};
agd('AGM-114K','Kh-25ML',{mass:45,L:1.63,R:.09,dmg:60,soft:8,hard:6,range:8000,lockR:8000},'HFIR','AGM-114K Hellfire II · semi-active laser');
agd('M261','B-8M1',{cap:19,mass:300,L:2.1,R:.2},'HYD70','M261 · 19× Hydra 70');
if(AGW['AGM-114K'])AGW['AGM-114K'].beam=1;   // follows the laser spot (beamrider.js flies it)

/* ---------- TADS / PNVS in the nose ---------- */
V121.PODS.TADS={nm:'TADS/PNVS',fovs:[4,1.6,.7],fn:['WIDE','MED','NARO'],tv:1,res:224,lrf:12000,lockR:14000};
const has=P=>!!P&&P.type===ID;
{const _k=SNS.podKind;SNS.podKind=function(P){return has(P)?'TADS':_k.call(this,P);};}
{const _p=SNS.podPos;SNS.podPos=function(P){if(!has(P))return _p.call(this,P);
  return P.pos.clone().addScaledVector(P.fwd(new V3()),4.9).addScaledVector(P.up(new V3()),-.62);};}

/* ---------- airframe ---------- */
const KA=HELI.H['Ka-50'];
const AH=Object.assign({},KA,{
  R:7.315,A:168.5,om0:30.2,I:3800,sigma:.0826,
  Pa:2*1260e3*.96,                   // 2 x T700-GE-701 (1,690 shp each)
  fPar:[3.4,6.2,3.0],gh:1.9,
  rateP:62,rateR:95,rateY:85,gLim:3.5,gNeg:-.5,vne:365,
  yawK:7});                          // single rotor: a collective change pushes the nose round far harder than on the coaxial Ka-50
HELI.H[ID]=AH;

/* ---------- model ---------- */
function makeAH64(){
  const g=new THREE.Group(),SK=(c,s=20)=>new THREE.MeshPhongMaterial({color:c,shininess:s,specular:0x222222}),
    olive=SK(0x474d3c),dk=SK(0x31362b),blk=SK(0x17191b,10),met=SK(0x55524c,60),grey=SK(0x6a6e66),rub=SK(0x151616,4);
  const add=(geo,mat,x,y,z,par=g,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);par.add(m);return m;};
  const ell=(sx,sy,sz,mat,x,y,z)=>{const m=add(new THREE.SphereGeometry(1,24,16),mat,x,y,z);m.scale.set(sx,sy,sz);return m;};
  ell(.82,.95,2.9,olive,0,0,-.2);                 // main body
  ell(.6,.62,1.7,olive,0,-.1,-2.9);               // nose
  ell(.36,.36,.55,blk,0,-.55,-4.55);              // TADS turret (chin)
  ell(.3,.3,.45,blk,0,.5,-4.4);                   // PNVS (on top of the nose)
  const glass=new THREE.Group();g.add(glass);
  const gm=new THREE.MeshPhongMaterial({color:0x9fc4cf,transparent:true,opacity:.34,shininess:90,specular:0x888888,depthWrite:false});
  add(new THREE.BoxGeometry(.8,.55,1.25),gm,0,.62,-3.0,glass,.42,0,0);      // front seat (WSO)
  add(new THREE.BoxGeometry(.8,.6,1.3),gm,0,.95,-1.5,glass,.3,0,0);          // rear seat (pilot), raised
  for(const sx of[-1,1])add(new THREE.BoxGeometry(.05,.6,2.7),olive,sx*.42,.8,-2.2,glass);
  g.userData.canopy=glass;
  for(const sx of[-1,1]){ell(.55,.5,1.9,olive,sx*.95,.82,.55);add(new THREE.CylinderGeometry(.3,.3,.4,14),blk,sx*.95,.8,-1.2,g,Math.PI/2,0,0);
    add(new THREE.CylinderGeometry(.2,.28,.9,12),met,sx*.95,.78,2.0,g,Math.PI/2,0,0);}
  ell(.7,.5,1.2,olive,0,1.15,.4);                  // transmission fairing
  add(new THREE.CylinderGeometry(.34,.46,7.2,14),olive,0,.5,5.1,g,Math.PI/2,0,0);   // tail boom
  add(new THREE.BoxGeometry(3.2,.07,.85),olive,0,.7,8.2);                            // stabilator
  add(new THREE.BoxGeometry(.08,2.0,1.4),olive,0,1.55,8.5,g,-.22,0,0);                // fin
  add(new THREE.BoxGeometry(.5,.08,.9),dk,0,2.5,8.6);
  // stub wings and four pylons
  add(new THREE.BoxGeometry(5.2,.1,1.3),dk,0,-.18,.2);
  for(const x of[-2.4,-1.3,1.3,2.4])add(new THREE.BoxGeometry(.12,.3,.9),met,x,-.36,.2);
  // M230 chin turret: yaw pivot (userData.gunT) carrying a pitch pivot (userData.gunP) and the barrel
  const tur=new THREE.Group();tur.position.set(0,-.78,-3.85);g.add(tur);g.userData.gunT=tur;
  add(new THREE.CylinderGeometry(.22,.26,.2,12),met,0,0,0,tur);
  const gp=new THREE.Group();gp.position.set(0,-.15,0);tur.add(gp);g.userData.gunP=gp;
  add(new THREE.BoxGeometry(.3,.28,.9),dk,0,0,-.1,gp);
  add(new THREE.CylinderGeometry(.045,.05,1.4,10),met,0,0,-1.0,gp,Math.PI/2,0,0);
  // undercarriage: two main legs and the tail wheel
  const leg=(x,y,z,len,r,w)=>{const gr=new THREE.Group();gr.position.set(x,y,z);g.add(gr);
    add(new THREE.CylinderGeometry(.045,.055,len,8),grey,0,-len/2,0,gr);
    const wh=add(new THREE.CylinderGeometry(r,r,w,16),rub,0,-len,0,gr);wh.rotation.z=Math.PI/2;return gr;};
  leg(-1.0,-.6,-.35,.9,.3,.18);leg(1.0,-.6,-.35,.9,.3,.18);leg(0,.4,7.6,2.0,.2,.1);
  // main rotor (four blades) and tail rotor (four blades), each spun by heliStep through userData.rotors
  add(new THREE.CylinderGeometry(.14,.2,1.0,12),met,0,1.9,.4);
  const blur=[],rot=[];
  const mk=(par,pos,n,len,chord,disc,tiltFix)=>{const r=new THREE.Group();r.position.set(pos[0],pos[1],pos[2]);par.add(r);r.userData.blades=[];
    add(new THREE.CylinderGeometry(.22,.22,.2,14),dk,0,0,0,r);
    for(let i=0;i<n;i++){const a=new THREE.Group();a.rotation.y=i*Math.PI*2/n;r.add(a);
      const b=add(new THREE.BoxGeometry(len,.03,chord),SK(0x24272a,12),len/2+.3,0,0,a);r.userData.blades.push(b);}
    const d=new THREE.Mesh(new THREE.CircleGeometry(len+.3,40),new THREE.MeshBasicMaterial({color:0x2a2d30,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
    d.rotation.x=-Math.PI/2;d.visible=false;r.add(d);blur.push(d);return r;};
  rot.push(mk(g,[0,2.45,.4],4,6.9,.53));
  const tp=new THREE.Group();tp.position.set(.45,1.6,8.75);tp.rotation.z=Math.PI/2;g.add(tp);   // pivot: its local y axis lies along the aircraft's x axis
  rot.push(mk(tp,[0,0,0],4,1.3,.2));
  g.userData.rotors=rot;g.userData.blur=blur;
  for(const [sx,c] of[[-1,0xff2a1a],[1,0x22ff55]])add(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:c}),sx*2.65,-.18,.2);
  const ab=new THREE.Group();g.add(ab);g.userData.ab=ab;
  g.traverse(o=>{if(o.isMesh&&!o.material.transparent){o.castShadow=true;o.receiveShadow=true;}});
  return g;}
window.makeAH64=makeAH64;

/* ---------- registration ---------- */
(function register(){
  const has2=k=>!!(MSL[k]||AGW[k]||k==='TK'||k==='PTB'),L=(...a)=>a.flat().filter(has2);
  const ST_={1:[-2.4,-.5,.2],2:[-1.3,-.5,.2],3:[1.3,-.5,.2],4:[2.4,-.5,.2]};
  const over={name:'AH-64A',model:makeAH64,st:ST_,heli:AH,empty:5165,fuel:1000,tank:420,gun:{name:'M230',rate:10.4,v:790,dmg:16,ammo:1200,spread:.0034,acc:0,spin:0},
    rwrKind:'APR-39',rcs:6,irs:2.0};
  cloneType('Ka-50',ID,over);
  const A=AC[ID];
  A.st=ST_;A.rel=['1','4','2','3'];A.rio=false;A.wso=true;A.crew=2;A.crewName='WSO';
  A.cwPit='AH-64A · Ka-50 cockpit for now';
  STN[ID]={1:L('AGM-114K','M261','TK'),2:L('AGM-114K','M261','TK'),3:L('AGM-114K','M261','TK'),4:L('AGM-114K','M261','TK')};
  window.vikhrRack(ID,['1','2','3','4'],4,'AGM-114K');
  const ld={1:'AGM-114K',4:'AGM-114K',2:'M261',3:'M261'};
  const full=window.vikhrFull(['1','4'],4,'AGM-114K');
  for(const era of['cold','modern'])LOAD[era][ID]=validLoad(ID,era,Object.assign({},ld,full));
  LOAD.guns[ID]={};STRIKE_LOAD[ID]=Object.assign({},LOAD.modern[ID]);
  for(const era of Object.keys(CMS))CMS[era][ID]=[30,30];
  ENGN[ID]='2× T700-GE-701';CALLS[ID]='APACHE';NCTR_ID[ID]='AH-64';FOE[ID]='F-4E';ACROLE[ID]='ATTACK HELICOPTER';RWR_OF[ID]='ALR-56C';
  if(typeof RUS!=='undefined')RUS.delete(ID);
  A.name='AH-64A';A.role='USA · ATTACK HELICOPTER · TADS/PNVS · M230 · HELLFIRE · HYDRA 70';
  HELI.ids.push(ID);
  console.info('[ah64] registered '+ID);
})();

/* ---------- movable gun, slaved to the targeting sensor ---------- */
// limits in degrees about the airframe: azimuth, elevation (negative = down); the Apache's chin turret has a very wide field, the Ka-50's 2A42 only a little travel (estimates)
const GM={'AH-64A':{az:[-86,86],el:[-60,11],rate:90,at:[0,-.9,-3.9]},'Ka-50':{az:[-3,3],el:[-37,3.5],rate:35,at:[.98,-.55,-3.6]}};
const gst=P=>P._gm||(P._gm={az:0,el:0,slaved:null});
const _bq=new THREE.Quaternion(),_e=new THREE.Euler(),_v=new V3(),_w=new V3(),_m=new V3();
function aimOf(P,M){
  // dir (unit, world) the gun should point, and whether it is following the sensor
  const f=P.fwd(new V3());if(!(SNS.hasPod(P)&&SNS.spi))return{dir:f,sl:false};
  const mz=_m.set(M.at[0],M.at[1],M.at[2]).applyQuaternion(P.q).add(P.pos),tp=_v.copy(SNS.spi);
  const R=tp.distanceTo(mz),t=R/(AC[P.type].gun.v*.97);
  if(SNS.unit&&SNS.mode==='POINT'&&SNS.unit.vel)tp.addScaledVector(SNS.unit.vel,t);
  tp.y+=.5*G*t*t;
  const b=_w.copy(tp).sub(mz).applyQuaternion(_bq.copy(P.q).invert()).normalize();
  const az=Math.atan2(b.x,-b.z)/DEG,el=Math.asin(Math.max(-1,Math.min(1,b.y)))/DEG;
  return{az,el,sl:true};}
const _u=updateGun;
updateGun=function(j,dt){const M=j&&GM[j.type];if(!M||j.remote||j!==player)return _u(j,dt);
  const S=gst(j),a=aimOf(j,M);let ta=0,te=0;if(a.sl){ta=Math.max(M.az[0],Math.min(M.az[1],a.az));te=Math.max(M.el[0],Math.min(M.el[1],a.el));}
  const st=M.rate*dt;S.az+=Math.max(-st,Math.min(st,ta-S.az));S.el+=Math.max(-st,Math.min(st,te-S.el));
  if(S.slaved!==a.sl){S.slaved=a.sl;if(game.wsel==='GUN')flash(a.sl?'GUN SLAVED · '+(j.type==='AH-64A'?'TADS':'SHKVAL'):'GUN FIXED FORWARD',1100);}
  // fire along the turret: temporarily point the aircraft's forward vector at the gun direction for the shared firing code
  const dir=new V3(Math.sin(S.az*DEG)*Math.cos(S.el*DEG),Math.sin(S.el*DEG),-Math.cos(S.az*DEG)*Math.cos(S.el*DEG)).applyQuaternion(j.q).normalize();
  const _f=j.fwd;j.fwd=function(o){return(o||new V3()).copy(dir);};
  try{_u(j,dt);}finally{j.fwd=_f;if(Object.prototype.hasOwnProperty.call(j,'fwd')&&j.fwd===_f)delete j.fwd;}
  // turret animation
  const ud=j.mesh&&j.mesh.userData;if(ud&&ud.gunT){ud.gunT.rotation.y=-S.az*DEG;ud.gunP.rotation.x=S.el*DEG;}
  else if(ud&&ud.gun&&j.type==='Ka-50'){if(!ud._gq)ud._gq=ud.gun.quaternion.clone();_e.set(S.el*DEG,-S.az*DEG,0,'YXZ');ud.gun.quaternion.setFromEuler(_e).multiply(ud._gq);}
};

/* ---------- the WSO: runs the TADS (picks and tracks targets, calls them out); the pilot can take it over by slewing or locking, and key 6 hands it over / takes it back ---------- */
const W={on:true,pilotT:-99,actT:0,callT:-99};
const now=()=>performance.now()/1000;
for(const fn of['slew','tms','brk','bore']){const o=SNS[fn];if(typeof o==='function')SNS[fn]=function(){if(has(player))W.pilotT=now();return o.apply(this,arguments);};}
const PRI={SURN:5,TEL:5,ZSU:4,TANK:3,TRUCK:2,BLDG:1};
const NM={SURN:'SA-6 radar',TEL:'SA-6 launcher',ZSU:'Shilka',TANK:'armour',TRUCK:'truck',BLDG:'structure'};
function pick(P){const ps=SNS.podSpec(),e=SNS.podPos(P);let best=null,bs=-1e9;
  for(const u of GND.units){if(!u.alive)continue;const d=e.distanceTo(u.pos);if(d>Math.min(ps.lockR,9000))continue;
    const dir=_v.copy(u.pos).sub(e).normalize();if(SNS.off(P,dir)>SNS.lim()*.8)continue;
    if(!terrLOS(e,_w.copy(u.pos).setY(u.pos.y+2)))continue;
    const hos=u.side!==P.side;if(!hos)continue;const s=(PRI[u.kind]||1)*1e5-d;if(s>bs){bs=s;best=u;}}
  return best;}
{const _t=SNS.tick;SNS.tick=function(dt){_t.call(this,dt);const P=player;if(!P||!P.alive||!has(P)||!W.on||game.paused)return;
  const t=now();if(t-W.pilotT<8||t<W.actT)return;
  if(this.mode==='POINT'&&this.unit&&this.unit.alive)return;
  W.actT=t+1.5;const u=pick(P);if(!u)return;
  this.unit=u;this.mode='POINT';this.spi=u.pos.clone();this.coast=0;
  if(t-W.callT>6){W.callT=t;const e=P.pos,b=Math.atan2(u.pos.x-e.x,-(u.pos.z-e.z))/DEG,rel=((b-P.hdg+540)%360)-180,clock=Math.round(((rel+360)%360)/30)||12;
    try{radio('WSO: Tally '+(NM[u.kind]||'target')+', '+clock+' o\'clock, '+(e.distanceTo(u.pos)/1000).toFixed(1)+' km. Tracking.');}catch(_){}}};}
{const _r=rio.toggle;rio.toggle=function(){const P=player;if(P&&P.alive&&has(P)){W.on=!W.on;W.pilotT=-99;try{radio(W.on?'WSO: I have the sensor.':'WSO: Your sensor.');}catch(_){}sfx.click();return;}return _r.apply(this,arguments);};}
window.AH64={W,GM};
})();
