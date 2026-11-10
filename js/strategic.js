/* =====================================================================================================================
   v226 — strategic air war: AI heavy bombers in the campaign, and a rare nuclear escalation. Loads after campmp.js.

   BOMBERS
   * Two heavy airframes, AI only: Tu-95MS "Bear" (red faction) and B-52H (blue faction). Swept wing, four turboprops / eight pods,
     eight bomb stations. Their shapes are built from the transport model; they have no cockpit.
   * Both sides fly bomber raids with fighter escorts: airfield hangars or troop concentrations, level run-in at 8-9 km, a stick of
     bombs released one by one along the track. Enemy raids show up as INTERCEPT tasks (our own as ESCORT); the sortie debrief grades them.
   * Bombers do not fight back and do not manoeuvre like fighters. They run for home when damaged or empty.

   NUCLEAR ESCALATION (rare, and it can be switched off on the CAMPAIGN tab: OFF / RARE / LIKELY)
   * A strategic alert meter (DEFCON 5-2) rises with the front moving, airfields lost, bomber raids and earlier detonations.
   * Only near the top of the scale does the side that is losing roll for a nuclear raid: a flight of two bombers, one carrying a
     parachute-retarded bomb. You get about 90 s of warning, then a top-priority INTERCEPT (or ESCORT, if it is ours) task.
     Shoot the carrier down before it releases and the attack is averted.
   * A released weapon takes about a minute to fall. Detonation: flash, fireball, mushroom cloud, ground shockwave that damages
     every aircraft by distance; the airfield at ground zero is destroyed, units are wiped out, reserves drop. The other side may
     retaliate once; after two detonations both sides call a ceasefire and the campaign ends.
   * Time skips (+1 H, +6 H, NEXT DAWN) resolve a raid on the averages: it is stopped or it is not.
   ===================================================================================================================== */
(()=>{
"use strict";
if(typeof CAMP==='undefined'||typeof makeCargo==='undefined'||typeof AC==='undefined'||typeof CMPUI==='undefined')return;
const $q=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fin=(v,d=0)=>Number.isFinite(v)?v:d;
const warn=(k,e)=>{if(!warn[k]){warn[k]=1;console.warn('strategic:'+k,e);}};

/* ---------------------------------------------------------------------------------------------- airframes */
function makeHeavy(kind){
  const bear=kind==='bear',src=makeCargo(),grp=new THREE.Group(),mat=SKIN(bear?0xb9bdb6:0x9ea4a0,40),dk=SKIN(0x474c47),
    fus=src.children[0],tail=src.children[6],fin2=src.children[7],cock=src.children[8];
  for(const o of[fus,tail,fin2,cock])o.traverse(c=>{if(c.isMesh&&c!==cock)c.material=mat;});
  fus.scale.set(.82,.82,1.35);tail.translateZ(5.5);fin2.translateZ(5.5);cock.translateZ(-3.8);cock.translateY(-.55);
  grp.add(fus,tail,fin2,cock);
  if(bear){
    grp.add(planform([[0,-2],[24,9],[24,11.5],[0,4.5]],.5,true,mat).translateY(.5));
    for(const sd of[-1,1])for(const x of[6.5,13]){const z=-2+x*.46-3.2;pod(grp,6.2,.72,dk,sd*x,.15,z,1,1);
      const d=new THREE.Mesh(new THREE.CircleGeometry(2.7,24),new THREE.MeshBasicMaterial({color:0x777b78,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));d.position.set(sd*x,.15,z-3.4);grp.add(d);}
  }else{
    grp.add(planform([[0,-2],[28,11],[28,13],[0,4]],.4,true,mat).translateY(1.0));
    for(const sd of[-1,1])for(const x of[4.5,8,11.5,15]){const z=-2+x*.46-2.6;pod(grp,4.6,.62,dk,sd*x,-.45,z,1,1);}
  }
  const ab=new THREE.Group();grp.add(ab);grp.userData.ab=ab;return grp;}
{const base=AC['Cargo'],BST={},REL=[],gun=Object.assign({},base.gun||{},{ammo:0});
 for(let i=1;i<=8;i++){BST[i]=[0,-1.4,-9+(i-1)*2.6];REL.push(String(i));}
 const mk=(name,kind,rcs)=>Object.assign({},base,{name,model:()=>makeHeavy(kind),rcs,irs:1.1,cargo:false,heavy:true,st:BST,rel:REL,gun,gLim:3});
 AC['Tu-95MS']=mk('Tu-95MS Bear-H','bear',95);AC['B-52H']=mk('B-52H Stratofortress','buff',100);
 if(typeof ACK!=='undefined')for(const k of['Tu-95MS','B-52H'])if(!ACK.includes(k))ACK.push(k);
 if(typeof STN!=='undefined'){STN['Tu-95MS']={};STN['B-52H']={};for(let i=1;i<=8;i++){STN['Tu-95MS'][i]=['FAB-250','FAB-500'];STN['B-52H'][i]=['Mk-82','Mk-84'];}}}

for(const e of Object.keys(CMS))for(const k of['Tu-95MS','B-52H'])if(!CMS[e][k])CMS[e][k]=[40,40];
/* ---------------------------------------------------------------------------------------------- helpers */
const Eo=()=>{const st=CAMP.st;return st.esc||(st.esc={v:6,nk:0,nuc:1,nx:0,seq:null,ret:null,heat:0,stg:0,cf:0});};
CAMP._bfl=CAMP._bfl||new Map();const BF=CAMP._bfl;
const bombFor=side=>{const l=redSide(side)?['FAB-500','FAB-250']:['Mk-84','Mk-82'];return l.find(k=>AGW[k]&&AGW[k].k==='bomb')||l[l.length-1];};
const near=(x,z,r)=>game.active&&player&&cd2(player.pos.x,player.pos.z,x,z)<r;
const say=(t,urgent,force)=>{if(game.active&&player&&SET.calls==='ON'&&(force||CAMP.awOK(0)))radio('DARKSTAR: '+t,urgent);};
const lostB=s=>Math.max(0,3-CAMP.bases(s).length);

/* ---------------------------------------------------------------------------------------------- bomber flights */
function launchBomber(side,baseId,tgt,o){o=o||{};const C=CAMP,st=C.st,br=C.baseRec(baseId),bd=cbDef(baseId),n=o.n||2;
  if(!br||br.side!==side||br.pool<n||br.dmg>75)return null;br.pool-=n;
  const rs=redSide(side),type=rs?'Tu-95MS':'B-52H',hd=brgTo(bd.x,bd.z,tgt.x,tgt.z),fx=Math.sin(hd*D2R),fz=-Math.cos(hd*D2R),dist=cd2(bd.x,bd.z,tgt.x,tgt.z),lead=Math.min(45000,dist*.6);
  const cs=(rs?CALLS_R:CALLS_B)[(C.cidN+st.nid+2)%6]+' '+(1+(C.cidN%9)),fl={id:C.cidN,side,role:'BMB',base:baseId,n,bmb:true,nuke:!!o.nuke,what:o.what||'',dead:0,dropped:0,tx:tgt.x,tz:tgt.z};
  BF.set(fl.id,fl);const alt=o.alt||(st.era==='modern'?9000:7800),bomb=bombFor(side),out=[];
  for(let i=0;i<n;i++){const load={};if(!o.nuke)for(let k=1;k<=8;k++)load[k]=bomb;
    const j=new Jet(side,type,load,st.era),lx=-fz*(i?600:0),lz=fx*(i?600:0);
    j.spawn(bd.x+fx*2500+lx,bd.H+900+i*60,bd.z+fz*2500+lz,hd,200);
    j.ai=new AI(j);j.ai.skill(1);j.cid=C.cidN++;j.callsign=cs+'-'+(i+1);j.cmpFr=side===0;
    const ai=j.ai;ai.alt0=alt;ai.spd=215;ai.roe='BMB';ai.engaged=false;ai.det=1;
    ai.route=[{x:tgt.x-fx*lead,z:tgt.z-fz*lead,alt},{x:tgt.x,z:tgt.z,alt}];ai.wi=0;
    ai.camp={fl,role:'BMB',side,home:baseId,state:'out',t0:st.t,until:st.t+1.4,tx:tgt.x,tz:tgt.z,lost:0,rel:0,bmb:true,carrier:!!o.nuke&&i===0,rT:0,ccT:0};
    C.air.push(j);out.push(j);}
  if(o.escort!==false){const e=C.launch(side,'ESC',baseId,2,{x:tgt.x,z:tgt.z});if(e)for(const j of e)if(j.ai&&j.ai.camp){j.ai.camp.escL=out;j.ai.camp.until+=.6;}}
  return out;}

{const _ap=CAMP.aiPre;CAMP.aiPre=function(ai,dt){const c=ai.camp;if(!c||!c.bmb)return _ap.apply(this,arguments);try{bmbStep(this,ai,dt);}catch(e){warn('bmb',e);}};}
function bmbStep(C,ai,dt){const j=ai.j,c=ai.camp;if(!j.alive)return;
  if(c.state==='rtb'){const h=cbDef(c.home);if(cd2(j.pos.x,j.pos.z,h.x,h.z)<5000)C.land(j);return;}
  if(j.hp<35||j.totalFuel/(j.ac.fuel||1)<.22){C.rtb(ai);return;}
  const dd=cd2(j.pos.x,j.pos.z,c.tx,c.tz),fl=c.fl;
  if(fl.nuke){
    if(c.carrier&&!fl.dropped&&dd<1400){dropNuke(j,c);C.rtb(ai);}
    else if(!c.carrier&&fl.dropped)C.rtb(ai);
    return;}
  const kind=agTypes(j).find(k=>AGW[k]&&AGW[k].k==='bomb');
  if(!kind){C.rtb(ai);return;}
  if(!c.stk&&dd<16000){c.ccT-=dt;if(c.ccT<=0){c.ccT=.25;const s=GND.ccip(j,kind),miss=s?cd2(s.p.x,s.p.z,c.tx,c.tz):1e9;
    if(miss<150||dd<1200){c.stk=true;fl.dropped=1;if(j.side===1&&near(c.tx,c.tz,50000))say('heavy bombs falling at '+clockOf(player,new V3(c.tx,0,c.tz))+" o'clock!",true);}}}
  if(c.stk){c.rT-=dt;if(c.rT<=0){c.rT=.18;const shots=game.stats.shots,p=j.release(kind);if(p)GND.drop(kind,j,p);game.stats.shots=shots;}}}

// kills are counted per flight (debrief + nuclear carrier check)
{const _k=CAMP.airKill;CAMP.airKill=function(v){const c=v&&v.ai&&v.ai.camp;if(c&&c.bmb&&!this.client){c.fl.dead++;if(c.fl.nuke&&c.carrier&&!c.fl.dropped)setTimeout(()=>checkSeq(),50);}return _k.apply(this,arguments);};}

// raids: both sides, one flight at a time per side
function raid(C,dt){const st=C.st;st.bmT=(st.bmT==null?rnd(.15,.3):st.bmT)-dt/3600;if(st.bmT>0)return;
  st.bmT=Math.max(.25,rnd(.45,.8)-st.diff*.06);
  const A=C.air.filter(j=>j.alive&&j.ai&&j.ai.camp),act=s=>new Set(A.filter(j=>j.side===s&&j.ai.camp.bmb&&j.ai.camp.state!=='rtb').map(j=>j.ai.camp.fl.id)).size;
  const side=Math.random()<.68?1:0;if(act(side)>=1||A.filter(j=>j.side===side).length>=10)return;
  let tgt=null,what='';
  const tb=C.bases(side?0:1);
  if(tb.length&&Math.random()<.45){const b=tb.sort((a,c)=>Math.abs(a.z-C.frontZ(a.x))-Math.abs(c.z-C.frontZ(c.x)))[0];tgt={x:b.x+(side?330:590),z:b.z+(side?0:300)};what=b.name+' airfield';}
  else{const hot=st.hot.filter(i=>st.hs[i]===(side?1:0)),i=hot.length?cpick(hot):cpick(st.hot);if(i==null)return;const us=st.units.filter(u=>!u.dead&&u.s===(side?0:1)&&u.i===i);if(!us.length)return;
    const u=cpick(us);tgt={x:u.x,z:u.z};what=(side?'our':'red')+' troops in sector '+(i+1);}
  let best=null,bd=-1;for(const b of C.bases(side)){if(b.pool<4||b.dmg>75)continue;const d=cd2(b.x,b.z,tgt.x,tgt.z);if(d>230000)continue;const rear=Math.abs(b.z-C.frontZ(b.x));if(rear>bd){bd=rear;best=b;}}
  if(!best)return;const f=launchBomber(side,best.id,tgt,{what});if(!f)return;Eo().heat+=3;
  if(side===1){say('heavy bombers up from '+best.name+': two '+f[0].type+', target '+what+'.',true);C.log('Intelligence: two red '+f[0].type+' bombers are heading for '+what+'.','');}
  else C.log('Our '+f[0].type+' bombers are on their way to '+what+'.','b');}

// tasking
{const _t=CAMP.tasks;CAMP.tasks=function(){const T=_t.apply(this,arguments);
  try{const seen=new Set();for(const j of this.air){const c=j.alive&&j.ai&&j.ai.camp;if(!c||!c.bmb||c.state==='rtb'||seen.has(c.fl.id))continue;seen.add(c.fl.id);
    const fl=c.fl,eta=Math.round(cd2(j.pos.x,j.pos.z,c.tx,c.tz)/NM);
    if(j.side===1)T.push({id:'BMB'+fl.id,kind:'INTERCEPT',fid:fl.id,label:'INTERCEPT · red '+j.type+(fl.nuke?' NUCLEAR-ARMED bombers':' bomber flight')+' → '+(fl.what||'target')+', '+eta+' NM from it',x:j.pos.x,z:j.pos.z,pri:fl.nuke?9:2.6});
    else T.push({id:'ESB'+fl.id,kind:'ESCORT',fid:fl.id,label:'ESCORT · our '+j.type+(fl.nuke?' NUCLEAR-ARMED bombers':' bomber flight')+' → '+(fl.what||'target')+', '+eta+' NM from it',x:j.pos.x,z:j.pos.z,pri:fl.nuke?8:1.4});}
    T.sort((a,b)=>b.pri-a.pri);}catch(e){warn('tasks',e);}return T;};}

/* ---------------------------------------------------------------------------------------------- escalation */
const stageOf=v=>v>=60?3:v>=45?2:v>=25?1:0;
const STG=['ROUTINE','ELEVATED','CRISIS','NUCLEAR THRESHOLD'];
function tension(C,dt){const st=C.st,E=Eo(),h=dt/3600,F=st.front,mean=F.reduce((a,b)=>a+b,0)/F.length;if(st.f0==null)st.f0=mean;
  const adv=(st.f0-mean)/1000;E.heat=Math.max(0,(E.heat||0)-4*h);
  const T=Math.min(100,6+Math.min(40,Math.abs(adv)*1.6)+13*(lostB(0)+lostB(1))+E.nk*22+E.heat);
  E.v=T>E.v?Math.min(T,E.v+14*h):Math.max(T,E.v-5*h);
  const s=stageOf(E.v);if(s!==E.stg){const up=s>E.stg;E.stg=s;
    if(s>0&&up){C.log('Strategic alert raised to DEFCON '+(5-s)+' · '+STG[s].toLowerCase()+'.','r');say('strategic alert is up to DEFCON '+(5-s)+'.',s>=2,true);}
    else if(!up)C.log('Strategic alert eased to DEFCON '+(5-s)+'.','b');}
  return adv;}
function pickSide(adv){const sc0=-adv+12*lostB(0),sc1=adv+12*lostB(1);let side=sc1>sc0?1:0;if(Math.abs(sc1-sc0)<6)side=Math.random()<.5?1:0;if(side===0&&Math.random()<.4)side=1;return side;}
function pickTarget(C,side){const v=side?0:1,bs=C.bases(v).filter(b=>b.dmg<100);if(!bs.length)return null;
  const hb=C.sortie&&C.homeBase?C.homeBase():null,w=bs.map(b=>b.pool+3+(hb&&hb.id===b.id&&v===0?4:0)),tot=w.reduce((a,b)=>a+b,0);let r=Math.random()*tot,k=0;
  for(;k<bs.length-1&&r>w[k];k++)r-=w[k];const b=bs[k];return{base:b,x:b.x+(v?590:330),z:b.z+(v?300:0),what:b.name+' airfield'};}
function roll(E,adv){if(E.seq||E.ret||!E.nuc||E.nk>=2||E.v<60||CAMP.st.t<(E.nx||0))return false;E.nx=CAMP.st.t+.083;
  const p=(.012+(E.v-60)*.0012)*(E.nuc===2?3:1);return Math.random()<p;}
function startSeq(C,side){const E=Eo(),st=C.st,t=pickTarget(C,side);if(!t){E.nx=st.t+.5;return false;}
  E.seq={side,stage:'warn',at:st.t+.025,x:t.x,z:t.z,what:t.what,bid:t.base.id};
  C.log((side?'Red':'Our')+' strategic forces have gone to the highest alert. '+(side?'Nuclear-armed bombers are being readied':'Command is preparing a nuclear strike')+'.','r');
  say('FLASH TRAFFIC: strategic alert at DEFCON 2. '+(side?'Intelligence reports nuclear-armed bombers being readied.':'Our command is preparing a nuclear strike.'),true,true);
  flash('STRATEGIC ALERT · DEFCON 2',3500);return true;}
function launchSeq(C){const E=Eo(),s=E.seq,st=C.st;let best=null,bd=-1;
  for(const b of C.bases(s.side)){if(b.pool<4||b.dmg>75)continue;const rear=Math.abs(b.z-C.frontZ(b.x));if(rear>bd){bd=rear;best=b;}}
  if(!best){C.log('The strike could not be launched: no usable airfield.','b');E.seq=null;E.nx=st.t+.5;return;}
  const f=launchBomber(s.side,best.id,{x:s.x,z:s.z},{nuke:true,n:2,what:s.what,alt:st.era==='modern'?9500:8200});
  if(!f){E.seq=null;E.nx=st.t+.5;return;}
  s.stage='fly';s.fid=f[0].ai.camp.fl.id;
  C.log((s.side?'Red':'Our')+' nuclear-armed '+f[0].type+' flight is airborne from '+best.name+', target '+s.what+'.','r');
  say('FLASH! '+(s.side?'Nuclear-armed bombers airborne from '+best.name+', heading for '+s.what+'.':'Our nuclear-armed bombers are airborne for '+s.what+'.')+(s.side?' Shoot them down before they release!':' Keep them alive!'),true,true);
  flash('NUCLEAR-ARMED BOMBERS AIRBORNE',4000);}
function checkSeq(){const C=CAMP,E=C.st&&C.st.esc,s=E&&E.seq;if(!s||s.stage!=='fly'||C.client)return;
  const fl=BF.get(s.fid);if(!fl||fl.dropped)return;
  if(C.air.some(j=>j.alive&&j.ai&&j.ai.camp&&j.ai.camp.carrier&&j.ai.camp.fl.id===s.fid))return;
  C.log('The nuclear-armed bomber has been stopped before it reached '+s.what+'. The attack is averted.','b');
  say('the nuclear bomber is down. Attack averted.',true,true);flash('NUCLEAR ATTACK AVERTED',4000);
  E.seq=null;E.v=Math.max(0,E.v-14);E.nx=C.st.t+.5;}
function escTick(C,dt){const st=C.st;if(!st||st.over||C.client)return;const E=Eo(),adv=tension(C,dt);
  if(E.seq){if(E.seq.stage==='warn'&&st.t>=E.seq.at)launchSeq(C);else if(E.seq.stage==='fly')checkSeq();}
  else if(E.ret&&st.t>=E.ret.at){const sd=E.ret.side;E.ret=null;startSeq(C,sd);if(E.seq)E.seq.at=st.t;}
  else if(roll(E,adv))startSeq(C,pickSide(adv));
  if(E.cf&&st.t>=E.cf&&!E.seq){st.over='CEASEFIRE';C.log('Both governments call an immediate ceasefire. The war is over.','');flash('CEASEFIRE',5000);E.cf=0;C.save();}}
{const _ao=CAMP.airOps;CAMP.airOps=function(dt){_ao.call(this,dt);const st=this.st;if(!st||this.client||st.over)return;try{raid(this,dt);escTick(this,dt);}catch(e){warn('ops',e);}};}

// time skips: no flight is flown, the raid is resolved on the averages
{const _adv=CAMP.advance;CAMP.advance=function(hours){const r=_adv.apply(this,arguments);
  try{const st=this.st;if(st&&!st.over&&!this.client){let rest=hours;while(rest>0&&!st.over){const step=Math.min(.25,rest);rest-=step;const E=Eo(),adv=tension(this,step*3600);E.seq=null;
    if(roll(E,adv)){const side=pickSide(adv),t=pickTarget(this,side);if(!t)continue;
      if(Math.random()<.45){this.log('Air defences stopped a nuclear-armed '+(side?'red':'allied')+' bomber flight heading for '+t.what+'.','b');E.v=Math.max(0,E.v-12);E.nx=st.t+.5;}
      else boom(t.x,t.z,Math.round(rnd(70,120)),side,false);}
    if(E.cf&&st.t>=E.cf){st.over='CEASEFIRE';this.log('Both governments call an immediate ceasefire. The war is over.','');E.cf=0;}}
    this.save();}}catch(e){warn('adv',e);}return r;};}

/* ---------------------------------------------------------------------------------------------- the weapon */
const NK=[],NFX=[];
function dropNuke(j,c){const fl=c.fl,E=Eo(),s=E.seq;fl.dropped=1;
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,3.4,10),new THREE.MeshPhongMaterial({color:0xe6e8e2}));mesh.rotation.x=Math.PI/2;scene.add(mesh);
  NK.push({p:j.pos.clone(),v:j.vel.clone().multiplyScalar(.9),mesh,side:fl.side,kt:Math.round(rnd(70,120)),x:c.tx,z:c.tz,t:0,fl});
  CAMP.log('Weapon released over '+fl.what+'.','r');
  say('BOMB AWAY at '+fl.what+'! Impact in about a minute. Get clear of the target area!',true,true);
  if(near(c.tx,c.tz,160000))flash('NUCLEAR WEAPON RELEASED · IMPACT IN ~60 S',5000);
  if(s)s.stage='drop';}
function stepNK(dt){for(let i=NK.length-1;i>=0;i--){const o=NK[i];
  if(!CAMP.st||(!CAMP.on&&!game.active)){boom(o.x,o.z,o.kt,o.side,false);scene.remove(o.mesh);NK.splice(i,1);continue;}
  o.t+=dt;const k=Math.exp(-dt/6);o.v.x*=k;o.v.z*=k;o.v.y+=(-120-o.v.y)*Math.min(1,dt*.6);o.p.addScaledVector(o.v,dt);
  o.mesh.position.copy(o.p);o.mesh.lookAt(o.p.x+o.v.x,o.p.y+o.v.y,o.p.z+o.v.z);
  if(o.p.y<=groundAt(o.p.x,o.p.z)+560||o.t>180){const gz=o.p;scene.remove(o.mesh);NK.splice(i,1);boom(gz.x,gz.z,o.kt,o.side,true);}}}

// campaign damage + log + aftermath (host / single player). live: show the effects here as well
function boom(x,z,kt,side,live){const C=CAMP,st=C.st,E=Eo(),s=Math.cbrt(kt/50);if(!st||C.client)return;
  E.nk++;E.v=Math.min(100,E.v+18);E.heat=(E.heat||0)+15;E.seq=null;E.nx=st.t+1;(st.nukes=st.nukes||[]).push({x,z,t:st.t,kt});
  let bases='',vic=null;for(const b of st.bases){const bd=cbDef(b.id),d=cd2(bd.x,bd.z,x,z);if(d<3500*s){b.dmg=100;b.pool=0;bases+=bd.name+' ';vic=b.side;}else if(d<9000*s){b.dmg=Math.min(100,b.dmg+60);b.pool*=.4;}}
  let dead=0;for(const u of st.units){if(u.dead)continue;const d=cd2(u.x,u.z,x,z),pk=d<4500*s?1:d<10500*s?1-(d-4500*s)/(6000*s):0;if(pk>0&&Math.random()<pk){C.dmgUnit(u,99999,null);dead++;}}
  for(const a of st.ad)if(cd2(a.x,a.z,x,z)<5500*s)a.al=a.al.map(()=>0);try{if(C.on&&C.adSync)C.adSync();}catch(e){}
  if(vic!=null){st.res[vic]=Math.floor(st.res[vic]*.7);}
  C.log('NUCLEAR DETONATION · '+kt+' kt at '+(bases?bases.trim():Math.round(x/1000)+'/'+Math.round(z/1000)+' km')+(bases?' destroyed':'')+'. '+dead+' ground units lost.','r');
  if(live){fx(x,z,kt,true);try{if(net.on&&net.r&&net.isHost)net.r.emit('nuke',{x:Math.round(x),z:Math.round(z),kt}).catch(()=>{});}catch(e){}
    say('NUCLEAR DETONATION '+(bases?'at '+bases.trim():'')+'!',true,true);}
  if(E.nk===1&&Math.random()<.7){E.ret={side:side?0:1,at:st.t+.3};C.log('Retaliation is expected.','r');}
  else if(E.nk>=2||!E.ret){E.cf=st.t+(live?.08:.02);}
  C.save();}

/* ---------------------------------------------------------------------------------------------- effects */
let flashEl=null;
function ensureFlash(){if(!flashEl){flashEl=document.createElement('div');flashEl.id='nukeFlash';flashEl.style.cssText='position:fixed;inset:0;z-index:6;background:#fff;opacity:0;pointer-events:none';document.body.appendChild(flashEl);}return flashEl;}
function rumble(delay,gain,dur){const x=sfx.ctx;if(!x||!sfx.m)return;setTimeout(()=>{try{const n=Math.floor(x.sampleRate*dur),b=x.createBuffer(1,n,x.sampleRate),d=b.getChannelData(0);let l=0;
  for(let i=0;i<n;i++){l=l*.98+(Math.random()*2-1)*.02;d[i]=l*Math.exp(-i/n*3.5)*8;}const sr=x.createBufferSource();sr.buffer=b;const g=x.createGain();g.gain.value=gain;const f=x.createBiquadFilter();f.type='lowpass';f.frequency.value=180;sr.connect(f);f.connect(g);g.connect(sfx.m);sr.start();}catch(e){}},Math.max(0,delay)*1000);}
const shockR=(t,s)=>330*t+5500*s*(1-Math.exp(-t/5));
const shockDmg=(d,Rk)=>d<=Rk?9999:Math.min(500,320*Math.pow(Rk*1.4/d,1.6));
function mat(c,o){return new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,fog:false,depthWrite:false,side:THREE.DoubleSide});}
function fx(x,z,kt,live){if(typeof scene==='undefined')return;const s=Math.cbrt(kt/50),y0=groundAt(x,z),G=new THREE.Group();G.position.set(x,y0,z);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),mat(0xfff2c0,1)),cap=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),mat(0xd88a3a,0)),
    stem=new THREE.Mesh(new THREE.CylinderGeometry(1,1.35,1,20,1,true),mat(0xb8743a,0)),skirt=new THREE.Mesh(new THREE.TorusGeometry(1,.2,10,40),mat(0xd8d0c4,0)),
    ring=new THREE.Mesh(new THREE.RingGeometry(.975,1,96),mat(0xfff0d0,.6));
  ring.rotation.x=-Math.PI/2;ring.position.y=40;skirt.rotation.x=Math.PI/2;G.add(ball,cap,stem,skirt,ring);scene.add(G);
  const o={G,t:0,x,z,y0,s,kt,live,hit:new Set(),ball,cap,stem,skirt,ring,Rk:5200*s};NFX.push(o);
  if(live&&game.active&&player){const d=player.pos.distanceTo(new V3(x,y0+300,z)),dir=new V3(x-player.pos.x,0,z-player.pos.z).normalize(),fw=camera.getWorldDirection(new V3());
    let I=clamp(1.15-d/140000,0,1);if(dir.dot(fw)<0)I*=.45;o.flashI=I;o.flashT=0;ensureFlash();
    rumble(Math.min(40,d/340),clamp(1.6-d/90000,.15,1.4),7);
    for(const j of jets)if(!j.remote&&j.alive&&!j.gone&&j.pos.distanceTo(G.position)<o.Rk){j.lastWeapon='NUCLEAR BLAST';o.hit.add(j);j.damage(9999,null);}}}
function stepFx(dt){const el=flashEl;
  for(let i=NFX.length-1;i>=0;i--){const o=NFX[i],s=o.s;o.t+=dt;const t=o.t;
    if(el&&o.flashI!=null){o.flashT+=dt;const f=o.flashT<.25?1:Math.exp(-(o.flashT-.25)/1.6);el.style.opacity=String(clamp(o.flashI*f,0,1));if(o.flashT>8){el.style.opacity='0';o.flashI=null;}}
    const fade=t<240?1:Math.max(0,1-(t-240)/100),heat=clamp(t/60,0,1);
    const rf=1250*s*(1-Math.exp(-t/1.8))*(t<12?1:Math.max(0,1-(t-12)/10));o.ball.scale.setScalar(rf+1);o.ball.material.opacity=clamp(1-t/14,0,1);o.ball.material.color.setHSL(.13-.1*clamp(t/12,0,1),1,.85-.35*clamp(t/12,0,1));
    const top=9500*s*(1-Math.exp(-t/45)),capR=(500+2600*(1-Math.exp(-t/55)))*s,capY=Math.max(top,300),oc=clamp(t/6,0,1)*.9*fade;
    const col=new THREE.Color().setHSL(.08+.0*heat,.7-.55*heat,.42+.1*heat);
    o.cap.position.y=capY+capR*.3;o.cap.scale.set(capR,capR*.6,capR);o.cap.material.opacity=oc;o.cap.material.color.copy(col);
    const rs=(180+300*(1-Math.exp(-t/40)))*s;o.stem.scale.set(rs,capY,rs);o.stem.position.y=capY/2;o.stem.material.opacity=oc*.85;o.stem.material.color.copy(col);
    o.skirt.position.y=capY*.98;o.skirt.scale.setScalar(capR*.85);o.skirt.material.opacity=oc*.7;
    const R=shockR(t,s);o.ring.scale.setScalar(R);o.ring.material.opacity=clamp(.6*(1-R/60000),0,.6)*fade;o.ring.visible=R<60000;
    if(o.live){for(const j of jets){if(j.remote||!j.alive||j.gone||o.hit.has(j))continue;const d=j.pos.distanceTo(o.G.position);if(d>R)continue;o.hit.add(j);
      const dmg=shockDmg(d,o.Rk);if(dmg<6)continue;j.lastWeapon='NUCLEAR BLAST';
      if(j===player){const dir=new V3().subVectors(j.pos,o.G.position).normalize();j.vel.addScaledVector(dir,Math.min(45,dmg/3));flash('SHOCKWAVE',1600);}
      j.damage(dmg,null);}}
    if(t>340){scene.remove(o.G);o.G.traverse(c=>{if(c.geometry)c.geometry.dispose();if(c.material)c.material.dispose();});NFX.splice(i,1);}}}
let last=performance.now();
(function loop(){requestAnimationFrame(loop);const now=performance.now();let dt=Math.min(.1,(now-last)/1000);last=now;
  if((NK.length||NFX.length)&&!game.paused){try{stepNK(dt);stepFx(dt);}catch(e){warn('fx',e);}}})();

// co-op: the host announces the detonation, everyone else shows it
{const _c=net.connect;net.connect=async function(){const ok=await _c.apply(this,arguments);
  if(ok&&net.r)net.unsub.push(net.r.on('nuke',m=>{if(net.isHost||m.sameTab||!m.data)return;fx(fin(m.data.x),fin(m.data.z),clamp(fin(m.data.kt,80),10,300),true);}));return ok;};}

/* ---------------------------------------------------------------------------------------------- campaign panel and map */
document.head.insertAdjacentHTML('beforeend','<style>#cmEsc .bar{height:7px;border-radius:3px;background:linear-gradient(90deg,#3c8a5a 0,#c9a93a 45%,#d9602e 75%,#e8331f 100%);position:relative;margin:4px 0 7px}#cmEsc .bar i{position:absolute;top:-3px;width:3px;height:13px;background:#fff;box-shadow:0 0 4px #000}'+
 '#cmEsc .st{font-size:11px;color:var(--dm,#8a9a92)}#cmEsc .st b{color:var(--tx,#e8f0ec)}#cmEsc .wr{color:#ff8a70;font-weight:700;font-size:11px;margin:4px 0;letter-spacing:.04em}#cmEsc .seg{margin-top:4px}</style>');
function panel(){const st=CAMP.st;if(!st)return'';const E=Eo(),def=E.seq?1:5-stageOf(E.v),nm=E.seq?'NUCLEAR STRIKE UNDER WAY':STG[stageOf(E.v)];
  const seg=[[0,'OFF'],[1,'RARE'],[2,'LIKELY']].map(([v,l])=>'<button data-x="nuc" data-v="'+v+'" aria-pressed="'+(E.nuc===v)+'">'+l+'</button>').join('');
  return'<div class="pl-sec" id="cmEsc"><h3>STRATEGIC ALERT <span class="cm-sub">DEFCON '+def+'</span></h3><div class="bar"><i style="left:calc('+Math.round(E.v)+'% - 1px)"></i></div>'+
    '<div class="st"><b>'+nm+'</b>'+(E.nk?' · <b>'+E.nk+'</b> nuclear detonation'+(E.nk>1?'s':''):'')+'</div>'+
    (E.seq?'<div class="wr">'+(E.seq.side?'RED':'OUR')+' NUCLEAR-ARMED BOMBERS '+(E.seq.stage==='warn'?'BEING READIED':'IN THE AIR')+' · TARGET '+esc(E.seq.what)+'</div>':'')+
    '<div class="fld"><span class="lb">NUCLEAR ESCALATION</span><div class="seg" role="group">'+seg+'</div></div></div>';}
{const _r=CMPUI.renderSide;CMPUI.renderSide=function(){_r.apply(this,arguments);
  try{const el=this.side;if(!el||!CAMP.st||this.confirm)return;const old=el.querySelector('#cmEsc');if(old)old.remove();
    const a=el.querySelector('#cmObj')||el.querySelector('.cm-hd');if(a)a.insertAdjacentHTML('afterend',panel());}catch(e){warn('panel',e);}};}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#cmEsc [data-x="nuc"]');if(!b)return;
  if(net.on&&!net.isHost){flash('ONLY THE HOST CAN CHANGE THIS',1500);return;}const E=Eo();E.nuc=+b.dataset.v;CAMP.save();CMPUI.renderSide(true);});
{const _d=CMPUI.draw;CMPUI.draw=function(){_d.apply(this,arguments);
  try{const st=CAMP.st,c=this.cx;if(!st||!st.nukes||!st.nukes.length||!c)return;c.save();c.setTransform(this.dpr,0,0,this.dpr,0,0);
    for(const n of st.nukes){const[sx,sy]=this.w2s(n.x,n.z),r=Math.max(7,6000/this.mpp);c.beginPath();c.arc(sx,sy,r,0,7);c.fillStyle='rgba(255,90,40,.28)';c.fill();c.strokeStyle='#ffcf5a';c.lineWidth=1.5;c.stroke();
      c.font='700 '+Math.round(Math.max(11,r*1.2))+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#ffcf5a';c.fillText('☢',sx,sy);}
    c.restore();}catch(e){warn('map',e);}};}

window.VIPER_STRAT={step:dt=>{stepNK(dt);stepFx(dt);},launchBomber,boom,fx,Eo,escTick,raid,tension,startSeq,launchSeq,checkSeq,NK,NFX,BF,panel,stageOf};
})();
