/* ======================================================================================================================
   v286 — Anti-ship missiles that behave like anti-ship missiles, and an anti-ship mission.

   Before this every anti-ship round was a TV Maverick clone: it needed a ground lock, flew a ballistic arc and had no idea
   what a ship was. Now (everything with `as:1` in AGW):
     * RADAR DESIGNATION   Pickle needs no TV lock. The jet's surface-search radar picks the ship nearest the nose (or the one
                           you designated with ENTER), inside the radar horizon, the missile's range and a 70 deg cone.
     * INERTIAL MIDCOURSE  The missile flies to where the ship was predicted to be (position error grows with range, target
                           speed estimate is off by up to 10 %), at its own cruise height: sea-skimming 5-20 m, or a high-low
                           profile for the ramjet rounds (BrahMos, Kh-31AD) that dive onto the sea 40-50 km out.
     * ACTIVE SEEKER       Switches on short of the predicted position. It sees only inside its own acquisition range (scaled by
                           ship size), inside the seeker cone, and only as far as the radar horizon of a 5-15 m missile allows
                           (about 25-35 km against a destroyer). It locks the ship nearest the predicted position, else the
                           best return in the beam, so a second ship or a lost target can be taken instead. The ASM-2 has an
                           imaging IR seeker: no chaff, but shorter range.
     * TERMINAL            Drops to terminal height (3-5 m for the subsonic rounds) and rams the hull. Ship damage comes from
                           the published warhead, so one or two Harpoons mission-kill a destroyer, a patrol boat dies to one.
     * SHIP DEFENCES       Area SAM (SM-2 / SM-1 / S-300F), CIWS (Phalanx / AK-630) and chaff, per ship class. Supersonic
                           skimmers are much harder to engage. Debris from an intercept very close in can still damage a ship.
   Plus: AGM-84D Harpoon for the US jets, the ANTI-SHIP mission (a task group under way), a loadout category, and ships that
   sink. Figures are from published open sources; seeker and defence numbers are modelled estimates.
   ====================================================================================================================== */
(function(){
'use strict';
if(typeof AGW==='undefined'||typeof GND==='undefined'||typeof SN==='undefined')return;
const D=Math.PI/180,sq=Math.sqrt;
const sea=(x,z)=>Math.max(0,groundAt(x,z));
const hor=(h1,h2)=>4120*(sq(Math.max(h1,1))+sq(Math.max(h2,1)));          // 4/3-earth radar horizon, metres

/* ---- the missiles: cruise speed, heights, seeker, warhead damage (game units ~ warhead kg x 1.35) ---- */
// v cruise m/s · skim / term heights (m) · seekR acquisition range on a destroyer · fov seeker half-cone (deg) · maxG
// eccm: chance the seeker ignores chaff · hi:{alt,desc} high-low profile, descend this far out · burn smoke
const ASP={
  'AGM-84D':   {v:290,skim:15,term:4, seekR:24000,fov:45,maxG:5, eccm:.35,dmg:300,range:124000,name:'Harpoon'},
  'Kh-35U':    {v:270,skim:12,term:4, seekR:20000,fov:40,maxG:6, eccm:.3, dmg:196,range:130000,name:'Kh-35U'},
  'Kh-35D':    {v:270,skim:12,term:4, seekR:20000,fov:40,maxG:6, eccm:.3, dmg:196,range:130000,name:'Kh-35'},
  'AM39 Exocet':{v:315,skim:15,term:3,seekR:18000,fov:35,maxG:6, eccm:.4, dmg:223,range:50000, name:'Exocet'},
  'Rb 04E':    {v:290,skim:15,term:4, seekR:16000,fov:40,maxG:5, eccm:.2, dmg:405,range:32000, name:'Rb 04E'},
  'Rb 15F':    {v:270,skim:12,term:4, seekR:20000,fov:40,maxG:6, eccm:.35,dmg:270,range:70000, name:'Rb 15F'},
  'YJ-82':     {v:290,skim:20,term:5, seekR:18000,fov:40,maxG:5, eccm:.25,dmg:223,range:42000, name:'YJ-82'},
  'YJ-83K':    {v:300,skim:20,term:5, seekR:20000,fov:40,maxG:5, eccm:.3, dmg:223,range:180000,name:'YJ-83K'},
  'ASM-2':     {v:285,skim:10,term:4, seekR:14000,fov:30,maxG:6, eccm:1,  dmg:200,range:150000,name:'ASM-2',ir:1},
  'Sea Eagle': {v:300,skim:5, term:3, seekR:22000,fov:45,maxG:6, eccm:.45,dmg:310,range:110000,name:'Sea Eagle'},
  'Kh-31A':    {v:850,skim:5, term:4, seekR:18000,fov:30,maxG:8, eccm:.4, dmg:300,range:50000, name:'Kh-31A',sup:1},
  'Kh-31AD':   {v:900,skim:5, term:4, seekR:18000,fov:30,maxG:8, eccm:.4, dmg:300,range:110000,name:'Kh-31AD',sup:1,hi:{alt:12000,desc:45000}},
  'P-800':     {v:700,skim:14,term:6, seekR:30000,fov:35,maxG:8, eccm:.5, dmg:520,range:120000,name:'Oniks',sup:1},
  'BrahMos-A': {v:850,skim:10,term:5, seekR:40000,fov:30,maxG:8, eccm:.5, dmg:560,range:290000,name:'BrahMos',sup:1,hi:{alt:14000,desc:50000}}
};
// the AGM-84D Harpoon (Block 1C: 526 kg, 221 kg WDU-18, 124 km) is new; the rest already exist as Maverick-shaped placeholders
if(!AGW['AGM-84D']&&AGW['Kh-35U']){AGW['AGM-84D']=Object.assign({},AGW['Kh-35U'],{mass:526,L:3.84,R:.17,col:0xd7dadc,range:124000});
  SN['AGM-84D']='HARP';if(typeof STORE_NAME!=='undefined')STORE_NAME['AGM-84D']='AGM-84D Harpoon · anti-ship';}
for(const [k,p] of Object.entries(ASP)){const a=AGW[k];if(!a)continue;a.as=1;a.range=p.range;a.dmg=p.dmg;a.soft=a.soft||30;a.hard=a.hard||12;a.seek=p.ir?'IIR':'ARH';a.lockR=p.seekR;}

/* ---- ship defences by class: SAM (min/max range m, pk, gap s), CIWS (range, pk), chaff (chance per missile) ---- */
const SDEF={
  DDGB:{sam:{min:3000,max:22000,pk:.38,gap:7},ciws:{r:1800,pk:.45},chaff:.35,nm:'SM-2'},
  FFGB:{sam:{min:3000,max:15000,pk:.3,gap:9},ciws:{r:1800,pk:.45},chaff:.3,nm:'SM-1'},
  CGR: {sam:{min:4000,max:18000,pk:.33,gap:7},ciws:{r:2500,pk:.4},chaff:.3,nm:'S-300F'},
  FACR:{sam:null,ciws:{r:2500,pk:.2},chaff:.1,nm:'AK-630'}};
const isShip=u=>u&&u.gnd&&u.alive&&(u.nv!=null||!!SDEF[u.kind]);

const ASM={list:[],ships:[],log:[],sel:null,selT:0};
window.ASM=ASM;

/* ---- picking the target the way the radar would ---- */
ASM.pick=function(P,a){
  const fw=P.fwd(new THREE.Vector3()),out={t:null,why:'NO SHIP TRACK'};let best=1e9;
  const des=(typeof SNS!=='undefined'&&SNS.mav&&isShip(SNS.mav)&&SNS.mav.side!==P.side)?SNS.mav:null;
  for(const u of GND.units){if(!isShip(u)||u.side===P.side)continue;
    const rel=new THREE.Vector3().subVectors(u.pos,P.pos),d=rel.length();if(d>hor(Math.max(P.pos.y,5),22))continue;
    const off=Math.acos(Math.max(-1,Math.min(1,rel.clone().normalize().dot(fw))))/D;if(off>70)continue;
    const sc=(u===des?-1e6:0)+off*1e3+d*.01;if(sc<best){best=sc;out.t=u;out.d=d;out.off=off;}}
  if(out.t){if(out.d>a.range)out.why='OUT OF RANGE · '+Math.round(a.range/1000)+' KM';else if(out.d<4000)out.why='TOO CLOSE';else out.why='';}
  return out;};

/* ---- launch ---- */
ASM.fire=function(w,P,pos,tgt){
  const a=AGW[w],p=ASP[w]||{v:280,skim:15,term:4,seekR:20000,fov:40,maxG:5,eccm:.3,dmg:a.dmg,range:a.range,name:w};
  const m=makeStore(w);scene.add(m);
  const d0=tgt.pos.distanceTo(P.pos),rng=Math.max(d0,1);
  // targeting solution from the radar: position error grows with range, speed estimate within 10 %
  const sg=120+rng*.004,est=tgt.pos.clone().add(new THREE.Vector3((Math.random()-.5)*2*sg,0,(Math.random()-.5)*2*sg)).setY(0);
  const ve=tgt.vel.clone().multiplyScalar(1+(Math.random()-.5)*.2);
  const k={w,a,P:p,p:pos.clone().addScaledVector(P.up(new THREE.Vector3()),-.7),v:P.vel.clone(),t:0,mesh:m,src:P,tgtShip:tgt,aim:est,ve,
    tgt:null,seek:false,lost:0,nolock:false,s:Math.max(P.vel.length(),150),psi:Math.atan2(P.vel.x,-P.vel.z),vy:0,path:0,cw:{},sam:{},kill:null,trail:0,seekOn:Math.min(p.seekR*.85,hor(p.skim,25)*.8),phase:'boost'};
  ASM.list.push(k);game.stats.shots++;return k;};

/* ---- one step of one missile ---- */
function stepK(k,h){
  const p=k.P,a=k.a;k.t+=h;
  if(k.t<.6){k.v.y-=G*h;k.p.addScaledVector(k.v,h);k.mesh.position.copy(k.p);k.s=k.v.length();k.psi=Math.atan2(k.v.x,-k.v.z);k.vy=k.v.y;return;}
  // speed: booster then sustainer
  k.s+=(p.v-k.s)*Math.min(1,h*(k.t<4?1.6:.7));
  const ter=sea(k.p.x,k.p.z),hAGL=k.p.y-ter;
  // INS dead-reckoning of the target until the seeker owns it
  if(!k.tgt)k.aim.addScaledVector(k.ve,h);
  const tp=k.tgt?k.tgt.pos:k.aim,dx=tp.x-k.p.x,dz=tp.z-k.p.z,dh=Math.hypot(dx,dz);
  // lead on the ship in the terminal phase
  let ax=dx,az=dz;if(k.tgt){const tt=dh/Math.max(k.s,50);ax+=k.tgt.vel.x*tt;az+=k.tgt.vel.z*tt;}
  const psiD=Math.atan2(ax,-az);let dpsi=psiD-k.psi;dpsi=Math.atan2(Math.sin(dpsi),Math.cos(dpsi));
  const wmax=p.maxG*G/Math.max(k.s,60);k.psi+=Math.max(-wmax*h,Math.min(wmax*h,dpsi*Math.min(1,3*h)*6));
  // height: cruise, high-low profile, terminal
  let hd=p.skim;if(p.hi&&dh>p.hi.desc&&!k.tgt)hd=p.hi.alt;if(k.tgt||k.seek)hd=p.term;
  if(k.t<3)hd=Math.max(hd,40);                                   // clear the aircraft and the water after release
  const eh=hd-hAGL,vmx=eh<0?.3*k.s:.22*k.s,vyd=Math.sign(eh)*Math.min(vmx,sq(2*3*G*Math.abs(eh)),Math.abs(eh)*1.2),dv=Math.max(-4*G*h,Math.min(4*G*h,vyd-k.vy));k.vy+=dv;
  const sh=sq(Math.max(k.s*k.s-k.vy*k.vy,0));
  const prev=k.p.clone();k.v.set(Math.sin(k.psi)*sh,k.vy,-Math.cos(k.psi)*sh);k.p.addScaledVector(k.v,h);k.path+=k.s*h;
  k.mesh.position.copy(k.p);k.mesh.quaternion.setFromUnitVectors(_Z,k.v.clone().normalize());
  // smoke trail
  k.trail-=h;if(k.trail<=0){k.trail=k.t<3?.03:.12;if(k.t<3){smoke.emit(k.p,null,rnd(1.4,2.4),1.4,7,.9,.9,.88,.45,.3);glow.emit(k.p,null,.05,2,1.4,1,.8,.4,1);}
    else smoke.emit(k.p,null,rnd(.7,1.2),1.5,5,.82,.82,.82,p.sup?.3:.14,.3);}
  // seeker
  const dA=Math.hypot(k.aim.x-k.p.x,k.aim.z-k.p.z);
  if(!k.seek&&!k.nolock&&dA<k.seekOn&&k.t>3){k.seek=true;k.phase='seek';}
  if(k.seek&&!k.tgt&&!k.nolock){k.sc=(k.sc||0)-h;if(k.sc<=0){k.sc=.25;
      let best=null,bs=1e12;const hz=hor(Math.max(hAGL,3),22);
      for(const u of GND.units){if(!isShip(u)||u.side===k.src.side)continue;
        const rel=new THREE.Vector3().subVectors(u.pos,k.p),r=rel.length(),detR=Math.min(p.seekR*sq((u.T.r||30)/40),hz);if(r>detR)continue;
        const off=Math.acos(Math.max(-1,Math.min(1,rel.clone().normalize().dot(k.v.clone().normalize()))))/D;if(off>p.fov)continue;
        const g=Math.hypot(u.pos.x-k.aim.x,u.pos.z-k.aim.z),sc=(g<2500?0:1e6)+g+r*.1;if(sc<bs){bs=sc;best=u;}}
      if(best){k.tgt=best;k.phase='term';if(k.src===player&&typeof flash==='function')flash(p.name.toUpperCase()+' · SEEKER LOCK · '+best.callsign,1600);}}}
  if(k.seek&&!k.tgt&&dA<1500&&((k.p.x-k.aim.x)*k.ve.x+(k.p.z-k.aim.z)*k.ve.z>=0||k.path>a.range*1.02)){/* flew through the gate empty */}
  defend(k,h);
  // end of the flight
  if(k.kill&&k.t>=k.kill.t){return die(k,k.kill.why);}
  // impact
  let hit=null;for(const u of GND.units){if(!u.gnd||!u.alive||u.side===k.src.side||(u.nv==null&&!SDEF[u.kind]))continue;
    const c=new THREE.Vector3(u.pos.x,u.pos.y+8,u.pos.z);if(segPtD(prev,k.p,c)<Math.max(16,(u.T.r||30)*.55)){hit=u;break;}}
  if(hit)return impact(k,hit);
  if(k.p.y<=ter+.6)return die(k,'sea');
  if(k.path>a.range*1.05||k.t>420)return die(k,'fuel');
  if(k.seek&&!k.tgt&&dA>6000&&k.t>20&&Math.hypot(k.aim.x-k.p.x,k.aim.z-k.p.z)>dA)return die(k,'lost');
  return false;}
function segPtD(a,b,c){const ab=b.clone().sub(a),l=ab.lengthSq();let t=l>0?c.clone().sub(a).dot(ab)/l:0;t=Math.max(0,Math.min(1,t));return a.clone().addScaledVector(ab,t).distanceTo(c);}

/* ---- ship defences ---- */
function intercept(k,u,why,when){if(!k.kill||when<k.kill.t)k.kill={t:when,why,by:u};}
function defend(k,h){
  if(k.kill)return;const p=k.P,sup=!!p.sup;
  for(const u of GND.units){if(!isShip(u)||u.side===k.src.side)continue;const def=SDEF[u.kind];if(!def)continue;
    const dx=u.pos.x-k.p.x,dz=u.pos.z-k.p.z,dy=k.p.y-u.pos.y-20,d=sq(dx*dx+dz*dz+dy*dy);if(d>22500)continue;
    // the ship's radar sees a 5-15 m skimmer only out to its horizon
    const seen=d<hor(25,Math.max(k.p.y,3));if(!seen)continue;
    // is it coming for this ship? (inside 40 deg of its own line to the ship)
    const vh=Math.hypot(k.v.x,k.v.z)||1,cosA=(k.v.x*dx+k.v.z*dz)/(vh*Math.max(Math.hypot(dx,dz),1));if(cosA<.75)continue;
    const T=GND.t||0,eng=(k.tgt&&k.tgt!==u)?.0:1;
    // area SAM
    if(def.sam&&d>def.sam.min&&d<def.sam.max&&(u._samT||0)<=k.t+1e-3&&!k.sam[u.id]){k.sam[u.id]=1;u._samT=k.t+def.sam.gap;
      const pk=def.sam.pk*(sup?.45:1)*(p.ir?1:1);
      if(Math.random()<pk)intercept(k,u,def.nm,k.t+Math.max(.6,(d-1500)/(900+k.s)));}
    // soft kill: chaff / ECM seduction (imaging IR seekers don't care)
    if(d<6500&&d>1200&&k.tgt===u&&!k.cw['c'+u.id]){k.cw['c'+u.id]=1;
      if(!p.ir&&Math.random()<def.chaff*(sup?.6:1)*(1-p.eccm)){k.tgt=null;k.seek=true;k.nolock=Math.random()<.75;
        k.aim=new THREE.Vector3(u.pos.x+(Math.random()-.5)*900,0,u.pos.z+(Math.random()-.5)*900);k.ve=new THREE.Vector3();
        if(k.src===player&&typeof flash==='function')flash(p.name.toUpperCase()+' · SEDUCED BY CHAFF',1800);}}
    // CIWS
    if(def.ciws&&d<def.ciws.r&&!k.cw['w'+u.id]){k.cw['w'+u.id]=1;
      if(Math.random()<def.ciws.pk*(sup?.5:1))intercept(k,u,def.nm==='AK-630'?'AK-630':'CIWS',k.t+Math.max(.15,(d-500)/k.s));}}}

function die(k,why){
  const sup=k.P.sup;
  if(why==='sea'||why==='fuel'||why==='lost'){for(let i=0;i<6;i++)smoke.emit(k.p,GV.set(rnd(-4,4),rnd(4,14),rnd(-4,4)),rnd(3,6),3,14,.8,.85,.9,.55,.4);
    if(k.src===player&&typeof flash==='function')flash(k.P.name.toUpperCase()+' · '+(why==='lost'?'SEEKER NEVER ACQUIRED':why==='fuel'?'OUT OF FUEL':'IMPACT · NO HIT'),2200);}
  else{explode(k.p.clone(),false);
    // debris from a very close intercept can still hurt a big missile's target
    const u=k.kill&&k.kill.by;if(u&&u.alive&&(sup||k.a.dmg>400)&&u.pos.distanceTo(k.p)<700&&k.tgt===u)u.damage(k.a.dmg*.22,k.src);
    if(k.src===player&&typeof flash==='function')flash(k.P.name.toUpperCase()+' · SHOT DOWN BY '+why,2200);}
  scene.remove(k.mesh);return true;}

function impact(k,u){
  const dm=k.a.dmg*(.9+Math.random()*.2);u.damage(dm,k.src);
  if(k.src===player)game.stats.hits++;
  GND.blast(k.p.clone(),{soft:k.a.soft,hard:k.a.hard},k.src);
  if(k.src===player&&typeof flash==='function'&&u.alive)flash(k.P.name.toUpperCase()+' HIT · '+u.callsign+' '+Math.max(0,Math.round(u.hp/u.T.hp*100))+'% LEFT',2400);
  if(typeof radio==='function'&&k.src===player&&SET.calls==='ON')radio(u.alive?'Good hit.':'Splash one '+u.T.n+'.');
  scene.remove(k.mesh);return true;}

/* ---- tick ---- */
ASM.tick=function(dt){
  // task-group ships steam, sink when dead
  for(let i=ASM.ships.length-1;i>=0;i--){const u=ASM.ships[i];
    if(u.alive){u.pos.x+=u.aim.x*u.spd*dt;u.pos.z+=u.aim.z*u.spd*dt;u.vel.set(u.aim.x*u.spd,0,u.aim.z*u.spd);const t=performance.now()/1000;
      u.mesh.position.set(u.pos.x,Math.sin(t*.7+i)*.3,u.pos.z);u.mesh.rotation.z=Math.sin(t*.5+i*2)*.02;}
    else{u.vel.set(0,0,0);u._sink=(u._sink||0)+dt;u.pos.y=Math.max(-45,u.pos.y-dt*.45);u.mesh.rotation.z=Math.min(.55,(u.mesh.rotation.z||0)+dt*.012);u.mesh.position.y=u.pos.y;
      if(u.pos.y<=-44){u.mesh.visible=false;ASM.ships.splice(i,1);}}}
  if(!ASM.list.length)return;
  const n=Math.max(1,Math.ceil(dt/.025)),h=dt/n;
  for(let s=0;s<n;s++)for(let i=ASM.list.length-1;i>=0;i--)if(stepK(ASM.list[i],h))ASM.list.splice(i,1);};
{const _t=GND.tick;GND.tick=function(dt){_t.call(this,dt);try{ASM.tick(dt);}catch(e){console.warn('[asm]',e);}};}
{const _c=GND.clear;GND.clear=function(){_c.call(this);for(const k of ASM.list)scene.remove(k.mesh);ASM.list.length=0;ASM.ships.length=0;ASM.sel=null;};}

/* ---- firing and the HUD ---- */
{const _p=agPickle;agPickle=function(w){const a=AGW[w];if(!a||!a.as)return _p(w);
    const P=player;if(game.pickleCd>0)return;if(!game.arm){flash('MASTER ARM SIM',1200);return;}
    const s=ASM.pick(P,a);if(!s.t){flash('NO SHIP TRACK · SEA SEARCH',1400);return;}if(s.why){flash(s.why,1400);return;}
    const pos=P.release(w);if(!pos){flash('NO '+SN[w],1000);return;}
    ASM.fire(w,P,pos,s.t);game.pickleCd=1.5;sfx.click();if(SET.calls==='ON')radio((ASP[w]?ASP[w].name:w)+' away.');};}
{const _h=agHud;agHud=function(P,fs){const a=AGW[game.wsel];if(!a||!a.as||!P.alive)return _h(P,fs);
    hx.save();hx.lineWidth=1.6;const T=(s,az,el,al='center')=>{const p=hb(az,el);if(p)txt(s,p.x,p.y,al);return p;},k=KPX*D2R;
    const s=ASM.pick(P,a),pr=ASP[game.wsel]||{};
    if(s.t){const sp=proj(new THREE.Vector3(s.t.pos.x,s.t.pos.y+10,s.t.pos.z));if(sp){hx.strokeRect(sp.x-k*.9,sp.y-k*.55,k*1.8,k*1.1);txt(Math.round(s.d/1852)+' NM',sp.x,sp.y+k*1.1+10,'center');}}
    T('ASM '+SN[game.wsel]+' '+P.count(game.wsel)+(game.arm?'':' SAFE'),0,-11.6);
    T(s.t?(s.why||'RDY · '+s.t.callsign+' · '+Math.round(s.d/1000)+' KM'):'NO SHIP TRACK',0,-13);
    const mine=ASM.list.filter(m=>m.src===P);if(mine.length){const m=mine[mine.length-1],rem=Math.max(0,(m.a.range-m.path)/Math.max(m.s,1));
      T(mine.length+' IN FLIGHT · '+(m.tgt?'TERMINAL':m.seek?'SEEKER ON':'INS')+' · '+Math.round(Math.max(0,(Math.hypot(m.aim.x-m.p.x,m.aim.z-m.p.z))/Math.max(m.s,1)))+' S',0,-14.4);}
    hx.restore();};}

/* ---- loadout screen: its own category and description ---- */
try{if(Array.isArray(STORE_CATS)&&!STORE_CATS.includes('ANTI-SHIP MISSILES'))STORE_CATS.splice(STORE_CATS.indexOf('AIR-TO-GROUND MISSILES')+1,0,'ANTI-SHIP MISSILES');}catch(e){}
try{const _sc=storeCat;storeCat=function(s){const a=AGW[s];if(a&&a.as)return'ANTI-SHIP MISSILES';return _sc(s);};}catch(e){}

/* ---- who carries the Harpoon: every wing station that already takes a Maverick on the US / Israeli / Korean F-16s, Hornets, Strike Eagles, Intruder ---- */
for(const ac of ['F-16C','F-16V','F-16E','F-16I','F-18C','F-18F','F-15E','F-15I','F-15EX','A-6E']){const T=STN[ac];if(!T)continue;
  for(const k of Object.keys(T))if(T[k].includes('AGM-65D')||T[k].includes('Mk-84'))if(!T[k].includes('AGM-84D')&&Math.abs((AC[ac].st[k]||[0])[0])>1.8)T[k].push('AGM-84D');}

/* ---- the mission: a task group under way, Harpoon / Exocet / Sea Eagle on the wings ---- */
const best=(ac,era,k)=>stOpts(ac,era,k).filter(s=>AGW[s]&&AGW[s].as).sort((x,y)=>AGW[y].range-AGW[x].range)[0];
const ASHM_AC=()=>ACS.filter(t=>{const era=game.era;return Object.keys(AC[t].st).some(k=>best(t,era,k));});
ASM.load=function(type,era){const A=AC[type],L=Object.assign({},getLoad(era,type)),ks=Object.keys(A.st).filter(k=>best(type,era,k));
  if(!ks.length)return null;ks.sort((a,b)=>Math.abs(A.st[a][0])-Math.abs(A.st[b][0]));
  const want=ks.length>=4?4:2;let n=0;const done=new Set();
  for(const k of ks){if(n>=want)break;if(done.has(k))continue;L[k]=best(type,era,k);done.add(k);n++;
    const o=stPair(type,k);if(o&&!done.has(o)&&best(type,era,o)){L[o]=best(type,era,o);done.add(o);n++;}}
  return validLoad(type,era,L);};
function ashmSetup(P){
  const C={x:-62000,z:-8000},fl=[['DDGB',0,0],['DDGB',2600,1800],['FFGB',-2800,1500],['CGR',1500,-3200],['FACR',-1000,-2500]];
  GND.clear();
  for(const [k,dx,dz] of fl){let x=C.x+dx,z=C.z+dz;for(let tr=0;tr<8&&groundAt(x,z)>1;tr++)x-=3000;
    const u=GND.add(k,1,x,z,0);u.spd=k==='FACR'?15:8.5;u.pos.y=0;u.mesh.position.y=0;ASM.ships.push(u);}
  game.total=GND.targets;
  P.spawn(-60000,350,52000,0,240);
  const ag=agTypes(P);game.wsel=ag.find(w=>AGW[w]&&AGW[w].as)||ag[0]||game.wsel;
  setTimeout(()=>flash('ANTI-SHIP · SINK '+GND.targets+' SHIPS · SEA SEARCH · PICKLE TO FIRE',5000),200);
  setTimeout(()=>{try{radio('Hawkeye: surface picture — a task group about 55 km ahead, speed 15 knots. Harpoons are cleared. Expect SAMs inside 20 km and chaff.');}catch(e){}},900);}
{const _s0=start0;start0=async function(scen){
  if(scen==='ASHM'){const _sl=strikeLoad;let swapped=null;const era=game.era;
    if(!ACS.some(t=>t===game.ac&&Object.keys(AC[t].st).some(k=>best(t,era,k)))){swapped=game.ac;game.ac=ACS.find(t=>Object.keys(AC[t].st).some(k=>best(t,era,k)))||'F-18C';setTimeout(()=>flash('NO ANTI-SHIP MISSILE ON THIS JET · FLYING THE '+AC[game.ac].name.toUpperCase(),3500),300);}
    strikeLoad=function(type,e){return ASM.load(type,e)||_sl(type,e);};
    try{await _s0('STRIKE');}finally{strikeLoad=_sl;}
    if(!player||game.scen!=='STRIKE')return;game.sub='ASHM';ashmSetup(player);return;}
  return _s0(scen);};}
{const after=document.getElementById('sSEAD')||document.getElementById('sSTRK');
  if(after){const b=document.createElement('button');b.className='qm';b.id='sASHM';
    b.innerHTML='<i>ASuW</i><b>ANTI-SHIP · TASK GROUP</b><span>Sink a destroyer group under way with Harpoon / Exocet / Sea Eagle / Kh-35. Radar-designated, sea-skimming, SAM and chaff defences.</span><em>FLY</em>';
    after.after(b);b.onclick=()=>start('ASHM');}}
console.info('[antiship] '+Object.keys(ASP).filter(k=>AGW[k]).length+' anti-ship missiles');
})();
