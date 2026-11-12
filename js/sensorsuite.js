/* =====================================================================================================================
   v309 — modern sensor suite (js/sensorsuite.js, window.MSS)

   * Missile approach warning runs every frame from the aircraft step. (It used to run inside drawRWR; the Mirage's own VCM display replaces
     drawRWR, so the SAMIR never warned.) Alerts go into RW.msl, so the RWR scope, the Mirage VCM, the HUD "MISSILE" cue, the tone and the
     auto-dispenser all see them.
   * Sensor kinds: IR / UV plume detectors (DAS, AAR-56, 101KS-U, DDM, PAWS...), the AESA radar (a missile is a small echo, so range follows
     the radar equation with the missile's own RCS; it needs the radar radiating and the missile inside the field of regard), and the IRST
     (plume inside its field of regard). The first two generic rules apply to every AESA / IRST jet, dedicated fits to the ones that carry one.
   * Su-57: N036 nose array plus two cheek arrays facing sideways. Field of regard +-135 deg, array-relative steering loss, small side
     apertures (range ~ sqrt(area)), blind rear sector. 101KS-U UV MAWS, 101KS-O DIRCM turrets that dazzle incoming IR seekers.
   * F-35A (and J-35): built-in EOTS targeting pod (no pod store needed), DAS spherical IRST: staring, 360 deg, tracks without a scan.
   Gameplay-level estimates, not published data. Switches: MSS.on .maws .dircm .das
   ===================================================================================================================== */
(function(){'use strict';
if(typeof radar==='undefined'||typeof Jet==='undefined'||typeof missiles==='undefined'||typeof rwrUpdate==='undefined'){console.warn('[sensorsuite] core missing');return;}
const D=Math.PI/180,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const M=window.MSS={on:true,maws:true,dircm:true,das:true,warned:[],fakes:[],fit:null,dir:{state:'OFF',t:0,tgt:null,n:0},st:{ticks:0,alerts:0}};
const _v=new THREE.Vector3(),_q=new THREE.Quaternion();
const IRG0={az:IRG.az,eu:IRG.eu,ed:IRG.ed};

/* ---------------- sensor library (gameplay-level estimates) ----------------
   R: range against a reference IR plume (an AIM-9 class motor), m.  cones: list of [az, el, half-angle] in degrees, body axes; 'S' = all round. */
const SPH='S';
const SEN={   // fa: false alarms per hour (more near the ground), acc: bearing error, deg 1-sigma
  DAS:  {k:'IR',n:'AN/AAQ-37 DAS',R:22000,cones:SPH,lat:.25,fa:.3,acc:.5},
  MLD:  {k:'IR',n:'AN/AAR-56 MLD',R:14000,cones:SPH,lat:.3,fa:.5,acc:1.5},
  U101: {k:'UV',n:'101KS-U',R:12000,cones:SPH,lat:.3,fa:1,acc:3},
  DDMNG:{k:'IR',n:'DDM-NG',R:14000,cones:SPH,lat:.3,fa:1,acc:2},
  PAWS: {k:'IR',n:'PAWS-2',R:12000,cones:SPH,lat:.3,fa:1,acc:2},
  EPAWS:{k:'IR',n:'ALQ-250 EPAWSS',R:12000,cones:SPH,lat:.3,fa:1,acc:2},
  DASJ: {k:'IR',n:'EODAS',R:18000,cones:SPH,lat:.3,fa:.6,acc:1},
  AAR47:{k:'UV',n:'AN/AAR-47 class',R:9000,cones:SPH,lat:.4,fa:3,acc:5},
  AAR57:{k:'UV',n:'AN/AAR-57 CMWS',R:9000,cones:SPH,lat:.4,fa:3,acc:4},
  EOW:  {k:'IR',n:'EO/IR missile warner',R:9000,cones:SPH,lat:.35,fa:2,acc:3},
  SUW:  {k:'UV',n:'Su-30 MAWS',R:9000,cones:SPH,lat:.4,fa:3,acc:4},
  MAW300:{k:'UV',n:'MAWS-300 / L-150',R:9000,cones:SPH,lat:.4,fa:3,acc:4},
  MAKUL:{k:'UV',n:'Mak-UL class',R:9000,cones:SPH,lat:.4,fa:4,acc:4},
  VIT:  {k:'UV',n:'Vitebsk MAWS',R:8000,cones:SPH,lat:.4,fa:3,acc:4}};
// DIRCM: turrets (cones in body axes), slew rate deg/s, tracker acquisition time s, laser range m, pk = base chance a completed dwell breaks the seeker
const TWO_UD=[[[0,90,100]],[[0,-90,100]]],WTIP=[[[-90,0,100]],[[90,0,100]]];
// dedicated fits by aircraft type. das: spherical staring IRST. eots: built-in targeting sensor. arrays: radar apertures.
const FIT={
  'F-35A':{maws:['DAS'],das:true,eots:true},
  'J-35':{maws:['DASJ'],das:true,eots:true},
  'J-20':{maws:['DASJ'],das:true},
  'F-22':{maws:['MLD']},
  'Su-57':{maws:['U101'],
    arrays:[{n:'N036-1-01 nose',az:0,hw:60,ap:1},{n:'N036B-1-01L cheek',az:-90,hw:45,ap:.35},{n:'N036B-1-01R cheek',az:90,hw:45,ap:.35}],
    dircm:{n:'101KS-O',R:5200,rmin:300,slew:140,acq:.8,pk:.6,turrets:TWO_UD}},
  'Rafale':{maws:['DDMNG']},'EF-2000':{maws:['PAWS']},'F-15EX':{maws:['EPAWS']},
  'A-10C':{maws:['AAR47']},'Harrier GR.9':{maws:['EOW']},
  'Su-30SM':{maws:['SUW']},'Su-30MKI':{maws:['SUW']},'Su-30MKM':{maws:['MAW300']},'MiG-35':{maws:['MAKUL']},
  'JAS-39E':{maws:['EOW']},'J-10C':{maws:['EOW']},'KF-21':{maws:['EOW']},
  'Su-25SM3':{maws:['VIT'],dircm:{n:'Vitebsk-25',R:4200,rmin:250,slew:150,acq:.7,pk:.55,turrets:WTIP}},
  'Su-25T':{maws:['VIT'],dircm:{n:'Vitebsk',R:4000,rmin:250,slew:130,acq:.8,pk:.5,turrets:WTIP}},
  'Cargo':{maws:['AAR47'],dircm:{n:'LAIRCM class',R:4500,rmin:300,slew:100,acq:1.0,pk:.6,turrets:TWO_UD}},
  'Su-35S':{maws:['MAKUL'],dircm:{n:'IR jammer',R:3500,rmin:250,slew:120,acq:1.0,pk:.4,turrets:[[[180,0,110]]]}},
  'Su-34':{maws:['MAKUL'],dircm:{n:'IR jammer',R:3500,rmin:250,slew:120,acq:1.0,pk:.4,turrets:[[[180,0,110]]]}},
  'F-18F':{maws:['AAR57'],dircm:{n:'DIRCM pod',R:4500,rmin:300,slew:120,acq:.9,pk:.55,turrets:[[[0,-90,100]]]}},
  'EA-18G':{maws:['AAR57'],dircm:{n:'DIRCM pod',R:4500,rmin:300,slew:120,acq:.9,pk:.55,turrets:[[[0,-90,100]]]}}};
M.SEN=SEN;
M.FIT=FIT;

/* ---------------- geometry ---------------- */
function body(P,pos,out){out.copy(pos).sub(P.pos);const d=out.length()||1;out.applyQuaternion(_q.copy(P.q).invert());return d;}   // out: body-frame vector, returns range
const bAz=b=>Math.atan2(b.x,-b.z),bEl=b=>Math.atan2(b.y,Math.hypot(b.x,b.z));
function inCones(b,cones){if(cones===SPH)return true;const L=b.length()||1;
  for(const c of cones){const az=c[0]*D,el=c[1]*D,cx=Math.sin(az)*Math.cos(el),cy=Math.sin(el),cz=-Math.cos(az)*Math.cos(el);
    if((b.x*cx+b.y*cy+b.z*cz)/L>=Math.cos(c[2]*D))return true;}return false;}
// radar apertures: which array is best for an azimuth (radians from the nose), and what it costs
function arrFor(arrs,baz,bel,p){let best=null;
  for(const a of arrs){const rel=Math.acos(cl(Math.cos(bel)*Math.cos(baz-a.az*D),-1,1));if(rel>a.hw*D*1.04)continue;
    const g=Math.pow(Math.max(Math.cos(Math.min(rel,1.4)),.17),p)*a.ap*a.ap;if(!best||g>best.g)best={a:a,rel:rel,g:g,ap:a.ap};}
  return best;}
M.arrOf=function(baz,bel){const f=M.fit;if(!f||!f.arrays)return null;return arrFor(f.arrays,baz,bel||0,(F()&&F().reg&&F().reg.arrScanLossCosPower)||1.5);};
const F=()=>window.SENSOR_FUSE;

/* ---------------- fit resolution ---------------- */
let fitType=null;
function fitOf(P){if(!P)return null;if(M.fit&&fitType===P.type&&M._ld===JSON.stringify(P.load))return M.fit;
  fitType=P.type;M._ld=JSON.stringify(P.load);if(FIT[P.type]&&FIT[P.type].dircm)FIT[P.type].dircm._st=null;const base=FIT[P.type]||{},out={maws:[],arrays:base.arrays||null,das:!!base.das,eots:!!base.eots,dircm:base.dircm||null};
  for(const id of base.maws||[])out.maws.push(Object.assign({id},SEN[id]));
  const legacy=window.MAWS_FIT&&window.MAWS_FIT[P.type];       // pod-dependent fits (SAMIR on the Mirage, Mak-UL on the Su-24M)
  if(legacy&&(!legacy.need||legacy.need(P))){const sam=/SAMIR/.test(legacy.n);
    out.maws.push({id:'LEG',k:'IR',n:legacy.n,R:legacy.r,lat:.3,cones:sam?[[-110,0,110],[110,0,110]]:SPH});}
  const rd=P.ac&&P.ac.radar;
  if(rd&&rd.aesa)out.radarMaws=true;                                   // an AESA is also a missile warner
  if(P.ac&&(P.ac.ols||P.ac.irst))out.irstMaws=true;                    // so is an IRST
  M.fit=out;return out;}

/* ---------------- missile detection ---------------- */
const seen=new Map();let acc=0,toneT=0,rowT=0,sideT=0,faT=0,fakeN=0;
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(6.2832*v);};
function plume(m){const d=m.def||{},burning=m.burning||(!(d.ph&&d.ph.gap)&&m.t<((d.burn)||3)+.5);
  const sm=d.smoke!=null?d.smoke:.3,mass=d.mass||90,sp=m.vel.length();
  // burning: the plume (reduced-smoke motors are fainter). Coasting: a UV warner sees nothing, an IR one only the aerodynamically heated nose at high speed
  return{burning,uv:burning?cl(.55+.9*sm,.6,1.4)*Math.sqrt(cl(mass/90,.5,3)):0,ir:burning?cl(.55+.9*sm,.6,1.4)*Math.sqrt(cl(mass/90,.5,3)):(sp>500?.2*cl((sp-500)/400,0,1):0)};}
function radiating(){const f=F();return radar.power==='ON'&&radar.warm<=0&&(!f||f.radiating!==false);}
// atmosphere: rain and fog shorten both bands, the sun in an IR field of view hides a plume
function wx(k,dirW){let q=1;try{const fog=(ENV.P&&ENV.P.fog)||1.2e-5;q=Math.exp(-(ENV.rain||0)*1.0-Math.max(0,fog-1.5e-5)*2.5e4);}catch(e){}
  if(k==='IR'&&typeof SUNDIR!=='undefined'&&SUNDIR.y>.03&&dirW){const sa=Math.acos(cl(dirW.dot(SUNDIR),-1,1))/D;if(sa<20)q*=.35+.65*sa/20;}
  return cl(q,.15,1);}
// seeker generation decides how hard a DIRCM has to work: old AM / conical-scan heads, rosette / cross-array heads, imaging heads
function seekerGen(m){const t=String(m.type||'');
  if(/AIM-9X|AIM-9M-9X|IRIS|ASRAAM|MICA|R-74M|PL-10|AAM-5|Python-5|Magic 2|MAGIC 2|Mistral|Stinger/i.test(t))return 3;
  if(/AIM-9L|AIM-9M|AIM-9P|R-73|R-27ET|R-27T|PL-9|AAM-3|Magic/i.test(t))return 2;return 1;}
function sense(P,m,fit,now){
  const d=body(P,m.pos,_v);if(d<50||d>45000)return null;
  const b=_v,vh=m.vel.clone().normalize(),toP=P.pos.clone().sub(m.pos).normalize();
  if(vh.dot(toP)<.6&&m.track!==P)return null;                                 // not coming at us
  const pl=plume(m),az=bAz(b),el=bEl(b);let best=null;
  const dirW=m.pos.clone().sub(P.pos).normalize();
  const hit=(src,lat,pd,acc)=>{if(Math.random()<pd&&(!best||lat<best.lat))best={src,lat,acc};};
  for(const s of fit.maws){if(!inCones(b,s.cones))continue;
    const R=s.R*(s.k==='UV'?pl.uv:pl.ir)*wx(s.k,dirW);if(R&&d<R)hit(s.n,s.lat,d<R*.7?1:(R-d)/(R*.3),s.acc);}
  if(fit.irstMaws&&!fit.das){const o=P.ac.ols||{head:6000},R=(o.head||6000)*.35*pl.ir*wx('IR',dirW);
    const g=IRG.az*D;if(R&&d<R&&Math.abs(az)<=g&&el<IRG.eu*D&&el>-IRG.ed*D)hit('IRST',.6,.6,1.5);}
  if(fit.radarMaws&&radiating()){
    const rcs=(m.def&&m.def.rcs)||.05;let R=radar.R0*Math.pow(rcs/5,.25),gA=radar.gl.az*D,sec=1;
    if(fit.arrays){const q=arrFor(fit.arrays,az,el,1.5);if(!q)sec=0;else R*=Math.sqrt(q.ap)*Math.pow(Math.cos(Math.min(q.rel,1.4)),.375);}
    else{if(Math.abs(az)>gA)sec=0;R*=Math.pow(Math.max(Math.cos(Math.min(Math.abs(az),1.4)),.17),.375);}
    if(el>radar.gl.eu*D||el<-radar.gl.ed*D)sec=0;
    if(el<-2*D&&P.pos.y<3000)R*=.55;                                          // look-down clutter
    if(sec&&d<R){const inScan=radar.sensor==='RDR'&&Math.abs(az-(radar.scanC||0))<=Math.min((radar.azs[radar.ai]||60)*D,gA)+radar.beam;
      const rate=radar.mode==='STT'?(Math.abs(az-radar.antAz)<15*D?1:.3):inScan?1.2:.35;hit('AESA',.5,1-Math.exp(-rate*.1),.8);}}
  return best&&{d,az,el,src:best.src,lat:best.lat,acc:best.acc};}

/* ---------------- DIRCM ----------------
   Each turret takes one missile: it has to slew (from where it last pointed), its tracker has to acquire the plume, then the laser dwells on the
   seeker. The dwell needed depends on the seeker generation (old heads break in about 1.5 s, rosette heads 2.5 s, imaging heads 5 s and may
   still not break), the chance of a break when the dwell completes falls with generation, haze and a laser that is aimed through weather, and a
   failed dwell is tried once more. A missile in the last second cannot be stopped, a second missile needs a second turret, and it does nothing
   against radar-guided rounds. */
const PK_GEN={1:.92,2:.78,3:.4},DW_GEN={1:1.5,2:2.5,3:5};
function dircmTick(P,fit,list,dt,now){const dc=fit.dircm;if(!dc||!M.dircm){M.dir.state='OFF';return;}
  const T=dc.turrets;if(!dc._st)dc._st=T.map(c=>({tgt:null,az:c[0][0]*D,el:c[0][1]*D,state:'RDY',t:0}));
  const taken=new Set();
  dc._st.forEach((u,i)=>{const cones=T[i];
    let m=u.tgt;
    if(m&&m._dc&&m._dc.done){u.hold=(u.hold||0)+dt;if(u.hold>1.5){u.hold=0;u.tgt=null;m=null;u.state='RDY';u.t=0;}else return;}
    if(m){const w=list.find(x=>x.m===m);if(!m.alive||!w||w.d>dc.R||w.d<dc.rmin||!(body(P,m.pos,_v)&&inCones(_v,cones))){u.tgt=null;m=null;u.state='RDY';u.t=0;}}
    if(!m){let pick=null;
      for(const w of list){const q=w.m;if(taken.has(q)||!q.alive||!q.def||q.def.seek!=='IR'||q._dc&&q._dc.done)continue;
        if(w.d>dc.R||w.d<dc.rmin||!(body(P,q.pos,_v)&&inCones(_v,cones)))continue;if(!pick||w.d<pick.d)pick=w;}
      if(pick){u.tgt=m=pick.m;u.state='SLEW';u.t=0;body(P,m.pos,_v);u.slew=Math.acos(cl(Math.cos(u.el)*Math.cos(bEl(_v))*Math.cos(u.az-bAz(_v))+Math.sin(u.el)*Math.sin(bEl(_v)),-1,1))/(dc.slew*D);
        if(!m._dc){const g=seekerGen(m);m._dc={g,need:DW_GEN[g]*(.8+.4*Math.random()),got:0,tries:0,done:false};}}}
    if(!m){return;}
    taken.add(m);const w=list.find(x=>x.m===m),j=m._dc;u.t+=dt;
    if(u.state==='SLEW'){if(u.t>=u.slew){u.state='ACQ';u.t=0;}return;}
    if(u.state==='ACQ'){if(u.t>=dc.acq){u.state='LASE';u.t=0;}return;}
    // lasing
    if(w.d/Math.max(m.vel.length(),1)<1){u.state='LATE';return;}
    j.got+=dt*wx('IR',null);
    if(j.got>=j.need){j.tries++;const pk=dc.pk*PK_GEN[j.g]/ .92*(1-.15*(j.tries-1));
      if(Math.random()<pk){m.track=null;m.target=null;m.maddog=true;m.active=false;j.done=true;u.state='JAM';M.dir.n++;try{flash('DIRCM · SEEKER DEFEATED',1500);}catch(e){}}
      else if(j.tries>=2){j.done=true;u.state='FAIL';try{flash('DIRCM · NO EFFECT',1200);}catch(e){}}
      else{j.got=0;j.need*=1.3;}}});
  const st=dc._st.map(u=>u.state);M.dir.state=['JAM','LASE','ACQ','SLEW','LATE','FAIL','RDY'].find(x=>st.includes(x))||'RDY';}

/* ---------------- tick ---------------- */
function cfg(P,fit){// field of regard, scan widths, scope width and IRST limits that depend on the fit
  if(fit.arrays){const mx=Math.max(...fit.arrays.map(a=>Math.abs(a.az)+a.hw));
    if(radar.gl.az<mx){radar.gl.az=mx;}
    if(radar.scopeAz!==mx){radar.scopeAz=mx;radar.azs=[120,60,30,10];radar.ai=1;}}
  else if(radar.scopeAz){radar.scopeAz=0;}
  if(fit.das){IRG.az=180;IRG.eu=90;IRG.ed=90;}else{IRG.az=IRG0.az;IRG.eu=IRG0.eu;IRG.ed=IRG0.ed;}}
function dasTick(P,now){if(!M.das)return;
  for(const j of jets){if(j===P||!j.alive||(window.IFF&&IFF.hide&&IFF.hide(j)))continue;
    const a=radar.ang(j.pos),toMe=_v.copy(P.pos).sub(j.pos).normalize(),c=j.fwd(new THREE.Vector3()).dot(toMe);
    const R=radar.irRange(j,a,c);if(!R||a.d>R*.9||!terrLOS(P.pos,j.pos))continue;
    const o=radar.sensor;radar.sensor='IRST';
    try{const t0=radar.tracks.get(j),tp=t0&&t0.t;radar.hit(j,a,Math.pow(R/Math.max(a.d,1),4)*20,now);const t=radar.tracks.get(j);if(t){t.das=1;if(t.t!==tp&&a.d>radar.lrf)t.d=radar.trkR(j,t);}}finally{radar.sensor=o;}}}
// the cheek arrays search on their own while the nose array sweeps (the scan-zone control only steers the nose array)
function sideTick(P,fit,now){if(!radar.on()||radar.sensor!=='RDR'||!radiating()||radar.mode==='ACM')return;
  for(const j of jets){if(j===P||!j.alive||(window.IFF&&IFF.hide&&IFF.hide(j)))continue;
    const a=radar.ang(j.pos),q=arrFor(fit.arrays,a.baz,a.bel,1.5);if(!q||q.a.az===0||Math.abs(a.bel)>radar.gl.eu*D)continue;
    const R=radar.rdet(j,a)*Math.sqrt(q.ap)*Math.pow(Math.cos(Math.min(q.rel,1.4)),.375);
    if(a.d>R*.9||radar.notch(j,a)||!terrLOS(P.pos,j.pos))continue;
    if(Math.random()<.6)radar.hit(j,a,Math.pow(R/Math.max(a.d,1),4)*20,now);}}
M.tick=function(dt){const P=player;M.warned.length=0;if(!P||!P.alive||!M.on)return;
  const fit=fitOf(P);cfg(P,fit);const now=performance.now()/1000;M.st.ticks++;
  acc+=dt;if(acc<.1)return;const step=acc;acc=0;
  if(fit.arrays){sideT+=step;if(sideT>=.4){sideT=0;sideTick(P,fit,now);}}
  if(fit.das){rowT+=step;if(rowT>=.2){rowT=0;dasTick(P,now);}}
  const list=[];
  if(M.maws&&(fit.maws.length||fit.radarMaws||fit.irstMaws)){
    for(const m of missiles){if(!m.alive||m.sh===P)continue;const r=sense(P,m,fit,now);
      if(r){let s=seen.get(m.id);if(!s){s={t0:now,last:now};seen.set(m.id,s);}s.last=now;
        if(now-s.t0>=r.lat){list.push({m,d:r.d,az:r.az,el:r.el,src:r.src,acc:r.acc});}}}
    for(const[id,s]of seen)if(now-s.last>1.5)seen.delete(id);}
  // keep a warning up for a moment so it does not flicker
  for(const w of list)w.m._mwT=now;
  for(const m of missiles)if(m.alive&&m._mwT&&now-m._mwT<1.2&&!list.some(w=>w.m===m)){const d=m.pos.distanceTo(P.pos);list.push({m,d,az:0,el:0,src:'hold'});}
  // false alarms: UV and IR warners see sun glint, fires, flares, hot ground; more of them low down
  if(M.maws&&fit.maws.length){const agl=P.pos.y-groundAt(P.pos.x,P.pos.z);
    for(const s of fit.maws){if(!s.fa)continue;if(Math.random()<s.fa/3600*(agl<1500?3:1)*step){
      const az=Math.random()*6.283,el=(Math.random()-.5)*1.2,dd=new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el)).applyQuaternion(P.q);
      if(!inCones(new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el)),s.cones))continue;
      M.fakes.push({alive:true,id:-(++fakeN),type:'FALSE',t:0,burning:true,track:P,def:{seek:'FALSE'},vel:new THREE.Vector3(),pos:P.pos.clone().addScaledVector(dd,4000),until:now+1.5,acc:s.acc,src:s.n});}}
    for(let i=M.fakes.length-1;i>=0;i--){const f=M.fakes[i];if(now>f.until){M.fakes.splice(i,1);continue;}list.push({m:f,d:4000,az:0,el:0,src:'FALSE',acc:f.acc,fake:1});}}
  for(const w of list){const m=w.m;m._mwE=(m._mwE||0)*.7+gauss()*(w.acc||3)*D*.3;}
  for(const w of list)M.warned.push(w);
  dircmTick(P,fit,list,step,now);
  if(M.warned.length){toneT-=step;if(toneT<=0){try{sfx.rwr('launch');}catch(e){}toneT=1.6;}}else toneT=0;};

/* ---------------- alerts: RWR scope, VCM, HUD ---------------- */
{const _u=rwrUpdate;rwrUpdate=function(dt){const r=_u.apply(this,arguments);
  try{const P=player;if(!P||!M.warned.length||!RW.msl)return r;const qi=P.q.clone().invert();
    for(const w of M.warned){if(RW.msl.some(x=>x.m===w.m))continue;
      const m=w.m;
      const rel=m.pos.clone().sub(P.pos).applyQuaternion(qi);
      if(!RW.mseen.has(m)){RW.mseen.add(m);rwrState.launchT=3;
        if(!isMig()&&sys.cm.mode===4){if(window.RWRX)RWRX.autoCM('launch',P);else cmdsRun('flare');}else if(!isMig()&&sys.cm.mode===3)flash('CMDS CONSENT · PRESS C',1600);
        M.st.alerts++;}
      RW.msl.push({m,d:w.d,a:Math.atan2(rel.x,-rel.z)+m._mwE,maws:1});}
    if(sys.rwr.pwr===0||!sys.rwr.pwr){/* RWR off: HUD cue below still works */}
  }catch(e){}
  return r;};}
{const _h=drawHUD;drawHUD=function(){_h.apply(this,arguments);try{const P=player;if(!P||!M.warned.length)return;const cv=document.getElementById('hud');if(!cv)return;const c=cv.getContext('2d');
  if(performance.now()%400>250)return;c.save();c.setTransform(1,0,0,1,0,0);c.font='700 22px "B612 Mono",monospace';c.textAlign='center';c.fillStyle='#ff3a24';c.fillText('MISSILE',cv.width/2,cv.height*.16);
  const w=M.warned[0],qi=P.q.clone().invert(),r=w.m.pos.clone().sub(P.pos).applyQuaternion(qi),clk=Math.round(((Math.atan2(r.x,-r.z)*180/Math.PI+360)%360)/30)||12;
  c.font='700 16px "B612 Mono",monospace';c.fillText(clk+' O\'CLOCK',cv.width/2,cv.height*.16+22);
  const st=M.dir.state;if(M.fit&&M.fit.dircm&&st!=='OFF'&&st!=='RDY'){c.fillStyle='#ffd24a';c.fillText('DIRCM '+st,cv.width/2,cv.height*.16+42);}
  c.restore();}catch(e){}};}
{const _s=Jet.prototype.step;Jet.prototype.step=function(dt){const r=_s.apply(this,arguments);if(this===player&&!game.paused)M.tick(dt);return r;};}


/* ---------------- pulse radars lock ground clutter ----------------
   A pulse set (no Doppler filter) cannot tell a ground return from an aircraft. If the lock-on cursor sits on a strong clutter return and
   there is no aircraft track under it, the gate takes the ground: the lock behaves like any other (range, SARH launch) until the return fades.
   It is the operator's job to put the cursor on the right blip. */
{const _d=radar.designate;radar.designate=function(){const was=this.mode,pre=this.lock;_d.apply(this,arguments);
  try{const P=player;if(!P||!P.ac.pulse||this.sensor!=='RDR'||!this.on()||this.mode==='STT'||this.mode==='ACM'||this.mode==='TWS'||was==='STT')return;
    const rng=this.rngM,c=flClutter;if(!c||c.rng!==rng)return;let bv=0,baz=0,bd=0;
    for(let da=-3;da<=3;da++)for(let dr=-3;dr<=3;dr++){const az=this.cur.az+da*1.5*D,d=(this.cur.r+dr*.02)*rng;if(d<1500||d>rng)continue;const v=flClutterAt(az,d);if(v>bv){bv=v;baz=az;bd=d;}}
    if(bv<.8)return;                                          // nothing strong enough under the cursor
    const f=P.fwd(new THREE.Vector3()),hw=Math.atan2(f.x,-f.z)+baz,x=P.pos.x+Math.sin(hw)*bd,z=P.pos.z-Math.cos(hw)*bd,y=Math.max(0,terrMesh(x,z))+6;
    let g=GROUND.list.find(q=>Math.abs(q.pos.x-x)<400&&Math.abs(q.pos.z-z)<400);
    if(!g){g=new GroundEcho(new THREE.Vector3(x,y,z));GROUND.list.push(g);}
    g.seen=performance.now()/1000;const a=this.ang(g.pos);if(a.off<this.gimbal()){this.hit(g,a,10,g.seen);this.stt(g);flash('LOCK · GROUND RETURN',900);}
  }catch(e){}};}

/* ---------------- steering of a multi-array radar ---------------- */
const S=window.SENSOR_SIG;
if(S&&S.scan){const _sc=S.scan;
  S.scan=function(th,baz,bel){const fit=M.fit;if(!fit||!fit.arrays||baz==null)return _sc.apply(this,arguments);
    const q=arrFor(fit.arrays,baz,bel||0,(F()&&F().reg&&F().reg.arrScanLossCosPower)||1.5);if(!q)return{w:1,g:0};
    const r=_sc.call(this,q.rel);return{w:r.w,g:r.g*q.ap*q.ap};};}
if(window.ESAS)ESAS.arrOf=(az,el)=>{const q=M.arrOf(az,el);return q?{relAz:az>=0?q.rel:-q.rel}:null;};

/* ---------------- built-in targeting sensor (EOTS) ---------------- */
if(typeof SNS!=='undefined'&&window.TGP_PODS){
  TGP_PODS.EOTS={nm:'AAQ-40 EOTS',fovs:[3.5,1.2,.5,.25],fn:['WIDE','MED','NARO','ZOOM'],tv:1,res:256,lrf:30000,lockR:26000};
  const own=P=>!!P&&!!FIT[P.type]&&!!FIT[P.type].eots;M.hasEots=own;
  const _k=SNS.podKind;SNS.podKind=function(P){return own(P)?'EOTS':_k.call(this,P);};
  const _p=SNS.podPos;SNS.podPos=function(P){if(!own(P))return _p.call(this,P);
    return P.pos.clone().addScaledVector(P.fwd(new THREE.Vector3()),4.2).addScaledVector(P.up(new THREE.Vector3()),-1.1);};
}
console.info('[sensorsuite] v309 MAWS / DAS / EOTS / side arrays / DIRCM');
})();
