"use strict";
/* =====================================================================================================================
   v324 add-ons from the 11/14 list (everything here is new; fixes live in fixes-v324.js). Each block is wrapped on its own.
   Figures are gameplay-level estimates, not published data.
     #7  electrical model (generators per engine, battery, bus load, load shedding)        #8  extra damage: generators and avionics
     #6  debug menu (F6)                                                                    #20 aircraft / weapon / ground index (F8)
     #21 ASC direct-control switch for the Flanker family (Alt+G)                           #23 country-specific TGPs with their own values
     #24 ejected pilots and parachutes                                                      #17 crash codes
     #9  AESA jam resistance and radar power levels (Alt+P)
   ===================================================================================================================== */
(function(){
const blk=(n,f)=>{try{f();}catch(e){console.warn('[addons-v324] '+n,e);}};
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),D=Math.PI/180;
const now=()=>performance.now()/1000;
const say=(t,ms)=>{try{flash(t,ms||1400);}catch(e){}};
const typing=e=>{const t=e.target&&e.target.tagName;return t==='INPUT'||t==='TEXTAREA'||t==='SELECT';};

/* ---------------- #7 + #8: electrical model and generator / avionics damage ---------------- */
blk('electrical',()=>{
  const EL=window.ELEC={on:true,cap:30};
  const st=j=>j._el||(j._el={batt:1,gens:[],supply:0,load:0,busV:28,shed:0,note:'',flag:{}});
  EL.state=j=>st(j||player);
  const _step=Jet.prototype.step;
  Jet.prototype.step=function(dt){const r=_step.apply(this,arguments);if(this!==player||!this.alive||this.remote||!EL.on||!this.dm)return r;
    const dm=this.dm,s=st(this);if(dm.gen==null){dm.gen=100;dm.avi=100;}
    // hits: a drop in hit points can knock out a generator or the avionics bay
    const h=this.hp;if(this._ehp==null)this._ehp=h;if(h<this._ehp-3){const d=this._ehp-h;if(Math.random()<Math.min(.6,d/30)){if(Math.random()<.5)dm.gen=Math.max(0,dm.gen-d*2.2);else dm.avi=Math.max(0,dm.avi-d*2.6);say(dm.gen<=0?'GENERATOR FAIL':'ELECTRICAL DAMAGE',1200);}}this._ehp=h;
    // supply: one generator per engine, each driven from the gearbox, full output above about half the engine speed
    const es=window.ENGSYS&&ENGSYS.get&&ENGSYS.get(this),nE=es?es.e.map(e=>e.nE):[this.n||0,this.n||0];const nG=Math.max(1,es?es.n:(this.ac.twin?2:1));
    s.gens=[];let sup=0;for(let i=0;i<nG;i++){const rpm=nE[Math.min(i,nE.length-1)]||0,o=cl(rpm/.5,0,1)*EL.cap*(dm.gen/100)*(nG>1?1:1.25);s.gens.push(o);sup+=o;}
    // load
    const radOn=typeof radar!=='undefined'&&radar.on&&radar.on()&&radar.sensor==='RDR',rdW=window.SENSOR_FUSE&&SENSOR_FUSE.reg?SENSOR_FUSE.reg.electricalPowerDrawWatts||3000:3000;
    const ecm=!!(this.ecm&&this.ecm.on),rwr=!!(sys&&sys.rwr&&sys.rwr.pwr),pod=typeof SNS!=='undefined'&&SNS.hasPod&&SNS.hasPod(this)&&SNS.active&&SNS.active();
    const load=2.2+(radOn?rdW/1000*(SENSOR_FUSE&&SENSOR_FUSE.reg?cl(SENSOR_FUSE.reg.powerLevelCurrent||1,.3,1.5):1):0)+(ecm?3:0)+(rwr?.4:0)+(pod?.9:0)+(this.gearPos>.1?.6:0);
    s.load=load;s.supply=sup;
    const dEl=sup-load;
    if(dEl>=0)s.batt=Math.min(1,s.batt+Math.min(dEl,3)/.9/3600*6*dt);else s.batt=Math.max(0,s.batt+dEl/.9/3600*dt);
    s.busV=sup>=load?28.2:(s.batt>0?22+6*s.batt:0);
    // load shedding when the batteries run down: ECM first, then the radar, then the warner
    const lvl=sup>=load?0:s.batt<=.04?3:s.batt<=.12?2:s.batt<=.25?1:0;
    if(lvl>=1&&this.ecm&&this.ecm.on){this.ecm.on=false;s.flag.ecm=1;say('ELEC · ECM SHED',1500);}
    if(lvl>=2&&radOn){radar.power='OFF';s.flag.rdr=1;say('ELEC · RADAR SHED',1500);}
    if(lvl>=3&&sys.rwr.pwr){sys.rwr.pwr=0;s.flag.rwr=1;say('ELEC · RWR SHED',1500);}
    if(lvl===0&&s.batt>.3){if(s.flag.rdr){radar.power='ON';radar.warm=Math.max(radar.warm||0,6);s.flag.rdr=0;say('ELEC · RADAR RESTORED',1500);}if(s.flag.rwr){sys.rwr.pwr=1;s.flag.rwr=0;}s.flag.ecm=0;}
    s.shed=lvl;s.note=sup<=0?'BATTERY ONLY':lvl?'LOAD SHED '+lvl:dm.gen<=0?'GEN FAIL':'NORMAL';
    if(sup<=0&&!s.warned){s.warned=1;say('BOTH GENERATORS OUT · BATTERY ONLY',2200);}else if(sup>0)s.warned=0;
    // avionics bay damage: the warner and the pod drop out at random
    if(dm.avi<40&&Math.random()<dt*(.06*(1-dm.avi/40))){if(sys.rwr.pwr){sys.rwr.pwr=0;s.flag.rwr=1;setTimeout(()=>{if(sys.rwr)sys.rwr.pwr=1;},4000);}say('AVIONICS FAULT',1200);}
    return r;};
});

/* ---------------- #17: crash codes ---------------- */
blk('crash codes',()=>{
  const CAT=[[/GEAR|HARD LANDING|BELLY|OFF AIRFIELD|CRASH|TERRAIN|GROUND/i,'C'],[/ENGINE|FLAME|OVERHEAT|SEIZ|COMPRESSOR/i,'E'],[/WING|STRUCT|AIRFRAME|OVER-?G|OVERSPEED/i,'S'],[/FIRE|BURN/i,'F'],[/SHOT|MISSILE|GUN|SAM|KILLED/i,'M'],[/FUEL|STARV/i,'U'],[/ELEC|GENERATOR|BATTERY/i,'L'],[/GLOC|G-LOC/i,'G']];
  const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;};
  window.crashCode=(why,P)=>{const c=(CAT.find(([r])=>r.test(why))||[0,'X'])[1],ph=P&&P.pos?(P.pos.y-groundAt(P.pos.x,P.pos.z)<30?'G':P.vel&&P.vel.y<-60?'D':'A'):'A';
    return c+'-'+String(hash(why)%900+100)+ph;};   // letter = system (C ground, E engine, S structure, F fire, M weapon, U fuel, L electrical, G pilot, X other); suffix = phase (G ground, D dive, A airborne)
  const _d=window.onPlayerDead;if(typeof _d==='function')window.onPlayerDead=function(why,src){const P=player,code=crashCode(why,P);
    try{game.crash={code,why,t:now(),spd:Math.round(P.vel.length()*1.944),agl:Math.round(P.pos.y-groundAt(P.pos.x,P.pos.z)),nz:+(P.nz||1).toFixed(1),fuel:Math.round(P.totalFuel||0),by:src&&(src.callsign||src.type)||'',
      eng:window.ENGSYS&&ENGSYS.get&&ENGSYS.get(P)?ENGSYS.get(P).e.map(e=>Math.round(e.h*100)+'%').join('/'):'',batt:P._el?Math.round(P._el.batt*100):null};}catch(e){}
    return _d.call(this,why+' ['+code+']',src);};
});

/* ---------------- #24: ejected pilots and parachutes ---------------- */
blk('ejection',()=>{
  const pil=[];const mat=(c)=>new THREE.MeshLambertMaterial({color:c});
  function make(){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.45,.9,.35),mat(0x556b3a));body.position.y=-.5;g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),mat(0xe8e2d0));head.position.y=.12;g.add(head);
    const can=new THREE.Mesh(new THREE.SphereGeometry(4.6,16,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshLambertMaterial({color:0xe8812a,side:THREE.DoubleSide}));can.position.y=3.6;can.visible=false;g.add(can);
    const ln=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xdddddd}));const pts=[];for(let i=0;i<8;i++){const a=i/8*Math.PI*2;pts.push(0,0,0,Math.cos(a)*4.2,3.6,Math.sin(a)*4.2);}
    ln.geometry.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));ln.visible=false;g.add(ln);g.userData={can,ln};return g;}
  const _k=Jet.prototype.kill;
  Jet.prototype.kill=function(why,src){const was=this.alive,pos=this.pos.clone(),vel=this.vel.clone(),up=this.up(new THREE.Vector3()),mesh=this.mesh&&this.mesh.visible;
    const r=_k.apply(this,arguments);
    if(was&&!this.gnd&&!this.ac.heli&&this.ac.name&&!/Shahed|MiG-1[57]/.test(this.type)&&!this.shahed){
      const agl=pos.y-groundAt(pos.x,pos.z),crash=/LANDING|CRASH|TERRAIN|GEAR|BELLY/i.test(why||'');
      // the seat needs height: no ejection at very low level unless it is a ground-level departure, and a catastrophic hit leaves no time
      const p=this===player?(agl>60&&!/GLOC|G-LOC|STRUCT/i.test(why||'')?.95:0):(agl>80?(/SHOT/i.test(why||'')?.4:.6):0);
      if(!crash&&Math.random()<p){const g=make();g.position.copy(pos).addScaledVector(up,1.5);scene.add(g);
        pil.push({g,pos:g.position,vel:vel.clone().multiplyScalar(.7).addScaledVector(up,16),t:0,open:false,side:this.side,pl:this===player,landed:false,lt:0});
        if(this===player)say('EJECTED',2500);}}
    return r;};
  let last=now();
  const tick=()=>{const t=now(),dt=Math.min(.1,Math.max(0,t-last));last=t;
    if(!(typeof game!=='undefined'&&game.paused))for(let i=pil.length-1;i>=0;i--){const p=pil[i];p.t+=dt;
      if(!p.landed){const gh=groundAt(p.pos.x,p.pos.z);
        if(!p.open){p.vel.y-=9.81*dt;p.vel.multiplyScalar(1-.45*dt);if(p.t>1.8&&p.vel.y<2){p.open=true;p.g.userData.can.visible=p.g.userData.ln.visible=true;}}
        else{const ws=(typeof ENV!=='undefined'&&ENV.windKt?ENV.windKt:6)*.514,wd=((typeof ENV!=='undefined'&&ENV.windDirFrom!=null?ENV.windDirFrom:270)+180)*D;
          p.vel.x+=(Math.sin(wd)*ws-p.vel.x)*Math.min(1,dt*.6);p.vel.z+=(-Math.cos(wd)*ws-p.vel.z)*Math.min(1,dt*.6);p.vel.y+=(-5.5-p.vel.y)*Math.min(1,dt*1.8);   // canopy: about 5.5 m/s down, drifting with the wind
          p.g.rotation.z=Math.sin(p.t*1.7)*.12;}
        p.pos.addScaledVector(p.vel,dt);
        if(p.pos.y<=gh+.2){p.pos.y=gh+.2;p.landed=true;p.lt=0;p.g.userData.can.position.y=.3;p.g.userData.can.scale.set(1,.2,1);p.g.userData.ln.visible=false;p.g.rotation.z=Math.PI/2;if(p.pl)say('PILOT DOWN · '+(p.side===player.side?'FRIENDLY':'HOSTILE')+' TERRITORY',2500);}}
      else{p.lt+=dt;if(p.lt>60){scene.remove(p.g);pil.splice(i,1);}}}
    requestAnimationFrame(tick);};
  requestAnimationFrame(tick);window.PILOTS=pil;
});

/* ---------------- #21: ASC direct-control switch (Su-27 / Su-33 / J-11 family) ---------------- */
blk('ASC',()=>{
  const FAM=['Su-27','Su-27UB','Su-27P','Su-27SM','Su-33','J-11','J-11B','J-15T'];for(const k of FAM)if(AC[k])AC[k].asc=true;
  window.ASC={on:false};
  addEventListener('keydown',e=>{if(!(e.altKey&&e.code==='KeyG')||e.ctrlKey||typing(e))return;e.preventDefault();const P=player;if(!P||!P.alive||!P.ac.asc){say('NO ASC SWITCH ON THIS AIRCRAFT',1200);return;}
    P._asc=!P._asc;ASC.on=P._asc;say(P._asc?'АСК · DIRECT · FLY-BY-WIRE BYPASSED — NO AoA / G LIMITER':'АСК · FBW NORMAL',2200);});
  // direct mode: the limiter is gone (structural limit only), the jet is statically unstable at subsonic speed and departs earlier
  const _step=Jet.prototype.step;
  Jet.prototype.step=function(dt){if(!this._asc||!this.ac.asc||this!==player)return _step.apply(this,arguments);
    const ac=this.ac,sv={aoaLim:ac.aoaLim,gLim:ac.gLim,gHi:ac.gHi,dep:ac.dep},c=this.ctl,sub=cl(1-(this.mach||0),0,1),a=Math.abs(this.alpha||0)*180/Math.PI,bias=.05*Math.sin(now()*1.9)*sub*cl(a/8,0,2.2);
    ac.aoaLim=Math.max(ac.aoaLim,36);ac.gLim=Math.min(11,ac.gLim+1.8);if(ac.gHi)ac.gHi=Math.min(11,ac.gHi+1.8);if(ac.dep)ac.dep=Object.assign({},ac.dep,{a:ac.dep.a-6,rock:ac.dep.rock*1.4});
    c.p=cl(c.p+bias,-1,1);
    try{return _step.apply(this,arguments);}finally{c.p=cl(c.p-bias,-1,1);ac.aoaLim=sv.aoaLim;ac.gLim=sv.gLim;ac.gHi=sv.gHi;ac.dep=sv.dep;}};
});

/* ---------------- #23: TGP types by country, each with its own values ---------------- */
blk('TGP types',()=>{
  const T={LITENING:{n:'LITENING',wide:4,nar:1,lim:100},'LITENING III':{n:'LITENING III',wide:3.5,nar:.9,lim:110},'SNIPER XR':{n:'SNIPER XR',wide:3.5,nar:.8,lim:150},LANTIRN:{n:'LANTIRN AAQ-14',wide:6,nar:1.7,lim:90},
    DAMOCLES:{n:'DAMOCLES',wide:4,nar:.9,lim:100},ATLIS:{n:'ATLIS II',wide:4,nar:1.5,lim:90},'WMD-7':{n:'WMD-7',wide:5,nar:1.5,lim:90},'SAPSAN-E':{n:'SAPSAN-E',wide:5,nar:1.3,lim:90}};
  const grp=(n,ids)=>ids.forEach(k=>M[k]=n),M={};
  grp('WMD-7',['J-10A','J-10B','J-10C','J-11B','J-16','J-15T','J-35','JH-7','JH-7A','JF-17','J-7G','F-CK-1']);
  grp('SAPSAN-E',['Su-30SM','Su-30MK2','Su-30MKI','Su-30MKM','Su-34','Su-35S','Su-27SM','Su-57','MiG-35','MiG-29SMT','Su-24M','Su-25SM3','Su-25T','Su-39']);
  grp('DAMOCLES',['Rafale','Rafale M','Mirage 2000-5','Mirage 2000-9']);grp('ATLIS',['Mirage 2000D','Mirage F1CT','Mirage F1CR','Jaguar','Super Etendard']);
  grp('SNIPER XR',['F-16','F-16C','F-16V','F-16E','F-16I','F-15E','F-15K','F-15I','F-15EX','F-15C','A-10C','F-22','F-2A']);
  grp('LANTIRN',['F-14A','F-14B','F-14D','F-15J']);grp('LITENING III',['EF-2000','Tornado GR.4','Tornado ECR','JAS-39C','JAS-39D','JAS-39E','Harrier GR.9','FA-50','KF-21','Tejas Mk1A','F-18E','F-18F','EA-18G']);
  window.tgpOf=id=>T[M[id]||'LITENING']||T.LITENING;window.tgpName=id=>tgpOf(id).n;window.TGP_TYPES=T;
  try{Object.defineProperty(SN,'TGP',{get(){return tgpOf(typeof player!=='undefined'&&player?player.type:'').n;},set(v){},configurable:true,enumerable:true});}catch(e){}
  const _f=SNS.fov;SNS.fov=function(){const a=AGW[game.wsel];if(a&&a.k==='agm')return _f.apply(this,arguments);const t=tgpOf(player&&player.type);return this.nar?t.nar:t.wide;};
  const _l=SNS.lim;SNS.lim=function(){if(this.wk()==='agm')return _l.apply(this,arguments);return tgpOf(player&&player.type).lim*D;};
});

/* ---------------- #9: AESA jam resistance, radar power levels ---------------- */
blk('AESA',()=>{
  if(typeof radar==='undefined')return;
  // an AESA spreads its energy over many pulses and frequencies (wide bandwidth, agile carrier, adaptive nulling): noise jamming has to be stronger to hide a target, i.e. it burns through farther out
  const _j=radar.jam;if(typeof _j==='function')radar.jam=function(){const J=_j.apply(this,arguments);const rd=player&&player.ac&&player.ac.radar;if(J&&J.noise&&J.bt!=null&&rd&&rd.aesa)return Object.assign({},J,{bt:J.bt*1.7});return J;};
});

/* ---------------- #6: debug menu (F6) ---------------- */
blk('debug menu',()=>{
  let el=null,tab='FLIGHT',timer=0;const TABS=['FLIGHT','AIRFOIL','ENGINE','ELEC','HYD','DAMAGE','RADAR','RWR','WEAPON'];
  const f=(v,d=2)=>typeof v==='number'?(isFinite(v)?+v.toFixed(d):'—'):(v==null?'—':String(v));
  const rows={
    FLIGHT:P=>[['alt m',f(P.pos.y,0)],['AGL m',f(P.pos.y-groundAt(P.pos.x,P.pos.z),0)],['CAS kt',f(P.cas,0)],['TAS kt',f(P.vel.length()*1.944,0)],['Mach',f(P.mach)],['alpha °',f(P.alpha*57.3,1)],['beta °',f(P.beta*57.3,1)],['Nz g',f(P.nz,2)],['bank °',f(P.bank*57.3,0)],['pitch °',f(P.pitch*57.3,0)],
      ['throttle',f(P.thr)],['spool n',f(P.n)],['afterburner',f(P.ab)],['departure',f(P.dep||0)],['fuel kg',f(P.totalFuel,0)],['mass kg',f(P.mass,0)],['gear',f(P.gearPos)],['flaps',f(P.flapPos)],['airbrake',f(P.sb)],['ASC direct',P._asc?'ON':'off'],['fuel pressure',P.fuelStarve?f(1-P.fuelStarve):'OK']],
    AIRFOIL:P=>{const a=P.ac,t=a.clt||[],mx=t.reduce((m,x)=>x[1]>m[1]?x:m,[0,0]);return[['wing area m²',f(a.S,1)],['CL alpha /rad',f(a.CLa)],['CL max',f(mx[1])],['alpha CLmax °',f(mx[0],0)],['cd0',f(a.cd0,4)],['induced k',f(a.k,3)],['alpha limiter °',f(a.aoaLim,0)],['G limit',f(a.gLim,1)],['departure °',a.dep?f(a.dep.a,0):'—'],['roll rate',f(a.roll)],['empty kg',f(a.empty,0)],['mil thrust N',f(a.mil,0)],['AB thrust N',f(a.ab,0)],['spool s',f(a.spool)],['swing sweep °',P.sweep!=null?f(P.sweep,0):'—'],['fly-by-wire',a.fbw?'yes':'no']];},
    ENGINE:P=>{const es=window.ENGSYS&&ENGSYS.get&&ENGSYS.get(P);if(!es)return[['no engine-system data','']];const o=[['class',es.p&&es.p.c?es.p.c.n:'—'],['stall state',P.cs?P.cs.st:0]];es.e.forEach((e,i)=>o.push(['E'+(i+1)+' rpm% · egt · health',f(e.nE*100,0)+' · '+f(e.egt,0)+'°C · '+f(e.h*100,0)+'%'],['E'+(i+1)+' oil T · P · qty',f(e.oilT,0)+'°C · '+f(e.oilP,0)+' psi · '+f(e.oilQ*100,0)+'%'],['E'+(i+1)+' vib · seize',f(e.vib)+' · '+(e.seize?'YES':'no')]));return o;},
    ELEC:P=>{const s=window.ELEC&&ELEC.state(P);if(!s)return[['—','']];return[['bus',s.note],['bus V',f(s.busV,1)],['battery %',f(s.batt*100,0)],['supply kW',f(s.supply,1)],['load kW',f(s.load,1)],...s.gens.map((g,i)=>['gen '+(i+1)+' kW',f(g,1)]),['gen damage %',P.dm?f(100-(P.dm.gen==null?100:P.dm.gen),0):'—'],['avionics damage %',P.dm?f(100-(P.dm.avi==null?100:P.dm.avi),0):'—'],['shed level',s.shed]];},
    HYD:P=>{const es=window.ENGSYS&&ENGSYS.get&&ENGSYS.get(P);if(!es||!es.hyd)return[['no hydraulic data',''],['dm.hyd',P.dm?f(P.dm.hyd,0):'—']];return['A','B'].map(k=>['system '+k+' psi · leak',f(es.hyd[k].p,0)+' · '+f(es.hyd[k].leak,3)]).concat([['dm.hyd %',f(P.dm.hyd,0)],['EPU',es.epuOn?'ON':'off']]);},
    DAMAGE:P=>{const d=P.dm||{};return[['hit points',f(P.hp,0)],...Object.keys(d).map(k=>['dm.'+k,f(d[k],0)]),['fire',f(P.fire)],['fuel leak',f(P.leak)],['fuel damage',f(P.fuelDmg)],['crash',game.crash?game.crash.code+' '+game.crash.why:'—']];},
    RADAR:P=>{const r=window.SENSOR_FUSE&&SENSOR_FUSE.reg;if(!r)return[['no radar registry','']];return[['radar',r.radarModelName],['antenna',r.antennaType],['carrier GHz',f(r.carrierFrequencyGHz)],['peak W',f(r.peakPowerWatts,0)],['power level',f(r.powerLevelCurrent)],['PRF lo/med/hi',[r.prfLowHz,r.prfMediumHz,r.prfHighHz].map(v=>f(v,0)).join(' / ')],['gimbal az/el °',f(r.gimbalAzLimitDeg,0)+' / '+f(r.gimbalElLimitDeg,0)],['beam °',f(radar.beam*57.3,1)],['antenna az °',f(radar.antAz*57.3,1)],['mode',radar.mode+' / '+radar.xm],['tracks',radar.tracks.size],['freq agility',r.frequencyAgilityEnabled?'on':'off'],['draw W',f(r.electricalPowerDrawWatts,0)]];},
    RWR:P=>{const x=window.RWRX;if(!x)return[['no RWR','']];return[['warner',x.nm||'—'],['power state',x.r&&x.r.rwrPowerState],['pulse load',f(x.load)],['blanking',f(x.blank)],['contacts',RW.list.length],['missiles',RW.msl.length],['fault',x.flt?x.flt.mode:'none'],['fitted',typeof RWR_NONE!=='undefined'&&RWR_NONE.has(P.type)?'NO':'yes']];},
    WEAPON:P=>{const w=game.wsel,d=MSL[w],a=AGW[w];if(d)return[['store',w+' · '+(SN[w]||'')],['seeker',d.seek],['mass kg',f(d.mass,0)],['AI range km',f(d.aiR/1000,0)],['max G',f(d.maxG,0)],['burn s',f(d.burnT,1)],['boost N',d.ph?f(d.ph.Tb,0):'—'],['sustain N',d.ph?f(d.ph.Ts,0):'—'],['rounds',P.count?P.count(w):'—'],['gimbal °',d.gimbal?f(d.gimbal*57.3,0):'—'],['ECCM',f(d.ccm)]];
      if(a)return[['store',w],['class',a.k],['mass kg',f(a.mass,0)],['range m',f(a.range,0)],['seeker',a.seek||'—']];return[['no weapon selected','']];}};
  const draw=()=>{if(!el||el.style.display==='none')return;const P=player;let h='';
    h+='<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px">'+TABS.map(t=>`<button data-t="${t}" style="all:unset;cursor:pointer;padding:2px 6px;border:1px solid #3a5;${t===tab?'background:#3a5;color:#000':'color:#7f9'}">${t}</button>`).join('')+'</div>';
    try{if(!P||!P.alive)h+='no live aircraft';else h+='<table style="border-collapse:collapse">'+rows[tab](P).map(([a,b])=>`<tr><td style="color:#9ab;padding:0 10px 0 0">${a}</td><td>${b}</td></tr>`).join('')+'</table>';}catch(e){h+='error: '+e.message;}
    h+='<div style="margin-top:6px;color:#678">F6 close</div>';el.innerHTML=h;el.querySelectorAll('button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;draw();});};
  addEventListener('keydown',e=>{if(e.code!=='F6'||typing(e))return;e.preventDefault();
    if(!el){el=document.createElement('div');el.id='dbgm';el.style.cssText='position:fixed;right:8px;top:8px;z-index:99999;background:rgba(0,12,6,.88);color:#cfe;font:11px/1.35 monospace;padding:8px 10px;border:1px solid #3a5;max-width:360px;max-height:92vh;overflow:auto;display:none';document.body.appendChild(el);}
    const show=el.style.display==='none';el.style.display=show?'block':'none';clearInterval(timer);if(show){draw();timer=setInterval(draw,250);}});
  window.DBGM={rows,draw,tabs:TABS};
});

/* ---------------- #20: index of aircraft, weapons and ground units (F8) ---------------- */
blk('index',()=>{
  let el=null,tab='AIRCRAFT',q='';
  const cnt=L=>{const n={};for(const k in L||{}){const s=L[k];if(s&&!/^(TK|PTB|TGP)$/.test(s))n[s]=(n[s]||0)+1;}return Object.entries(n).map(([s,c])=>c+'× '+(SN[s]||s)).join(', ')||'—';};
  const air=()=>Object.keys(AC).filter(k=>!q||(k+' '+AC[k].name+' '+(ACROLE[k]||'')).toLowerCase().includes(q)).map(k=>{const a=AC[k];
    return`<tr><td><b>${AC[k].name||k}</b></td><td>${(a.side||'')}</td><td>${ACROLE[k]||''}</td><td>${ENGN[k]||''}</td><td>${a.radar?a.radar.name:'none'}</td><td>${a.gun&&a.gun.name||''}</td><td>${cnt((LOAD.modern||{})[k]||(LOAD.cold||{})[k])}</td></tr>`;}).join('');
  const wpn=()=>MSL_KEYS.concat(Object.keys(AGW)).filter((k,i,a)=>a.indexOf(k)===i).filter(k=>!q||(k+' '+(WNAME[k]||'')).toLowerCase().includes(q)).map(k=>{const d=MSL[k],g=AGW[k];
    return`<tr><td><b>${SN[k]||k}</b></td><td>${WNAME[k]||STORE_NAME&&STORE_NAME[k]||''}</td><td>${d?d.seek:(g&&g.k)}</td><td>${d?Math.round(d.mass):g&&Math.round(g.mass||0)} kg</td><td>${d?Math.round(d.aiR/1000)+' km':g&&g.range?Math.round(g.range/1000)+' km':''}</td><td>${d?Math.round(d.maxG)+' g':''}</td></tr>`;}).join('');
  const gnd=()=>Object.keys(GTY).filter(k=>!q||(k+' '+GTY[k].n).toLowerCase().includes(q)).map(k=>{const t=GTY[k];return`<tr><td><b>${t.n}</b></td><td>${t.emit?'radar '+(t.R0?Math.round(t.R0/1000)+' km':''):'no radar'}</td><td>${t.arm?'armed':'unarmed'}</td><td>${t.hp} hp</td><td>${t.tgt?'target':''}</td></tr>`;}).join('');
  const heads={AIRCRAFT:'<tr><th>aircraft<th>side<th>role<th>engines<th>radar<th>gun<th>default load</tr>',WEAPONS:'<tr><th>store<th>name<th>seeker / class<th>mass<th>range<th>max g</tr>',GROUND:'<tr><th>unit<th>sensors<th>weapons<th>durability<th>role</tr>'};
  const draw=()=>{if(!el)return;const body=tab==='AIRCRAFT'?air():tab==='WEAPONS'?wpn():gnd();
    el.innerHTML='<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">'+['AIRCRAFT','WEAPONS','GROUND'].map(t=>`<button data-t="${t}" style="all:unset;cursor:pointer;padding:2px 8px;border:1px solid #6af;${t===tab?'background:#6af;color:#000':'color:#9cf'}">${t}</button>`).join('')+`<input id="idxq" value="${q}" placeholder="search" style="background:#012;color:#cfe;border:1px solid #356;padding:2px 6px"><span style="margin-left:auto;color:#678">F8 close</span></div><table style="border-collapse:collapse;width:100%">${heads[tab]}${body}</table>`;
    el.querySelectorAll('button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;draw();});const i=el.querySelector('#idxq');i.oninput=()=>{q=i.value.toLowerCase();draw();el.querySelector('#idxq').focus();};};
  addEventListener('keydown',e=>{if(e.code!=='F8'||(typing(e)&&e.target.id!=='idxq'))return;e.preventDefault();
    if(!el){el=document.createElement('div');el.id='idxm';el.style.cssText='position:fixed;inset:4% 6%;z-index:99998;background:rgba(2,10,20,.95);color:#cfe;font:12px/1.35 system-ui,sans-serif;padding:12px;border:1px solid #6af;overflow:auto;display:none';
      const st=document.createElement('style');st.textContent='#idxm td,#idxm th{padding:2px 8px;border-bottom:1px solid #123;text-align:left;vertical-align:top}#idxm th{color:#9cf;position:sticky;top:0;background:#02101e}';document.head.appendChild(st);document.body.appendChild(el);}
    const show=el.style.display==='none';el.style.display=show?'block':'none';if(show)draw();});
  window.INDEXM={air,wpn,gnd};
});

/* ---------------- #9 (rest): AESA: T/R modules, chirp, multi-direction looks, automatic power and band ---------------- */
blk('AESA2',()=>{
  const F=window.SENSOR_FUSE;if(!F||typeof radar==='undefined'||!radar.esaPar||!radar.esaSearch)return;
  const C=299792458,X=window.AESAX={on:true,act:false,pw:'AUTO',bd:'AUTO',trm:{n:0,alive:0,dead:0,g:1,lossDb:0},chirp:{tau:0,bw:0,ratio:0,resM:0,minRngM:0},pwr:1,band:'MID',fGHz:0,hops:0,lpi:1,looks:{share:0,az2:0,dir2:1,n:0,cells:0,flank:1},why:''};
  // number of transmit / receive modules (public figures where there are any, otherwise a gameplay-level estimate)
  const TRM=[[/APG-77/,1956],[/APG-81/,1676],[/APG-82/,1676],[/APG-79/,1100],[/APG-83/,1000],[/APG-63/,1100],[/APG-85/,1500],[/RBE2/,1000],[/CAPTOR|Captor/,1400],[/N036|Byelka|BYELKA/,1514],[/ZHUK|Zhuk/,1010],[/KLJ|Type 14|Type 15|JL-/,1000],[/ES-05|RAVEN|Raven/,1000]];
  const nOf=n=>{for(const [re,k] of TRM)if(re.test(n||''))return k;return 1000;};
  // waveform per mode: [pulse width us, chirp bandwidth MHz]. A long pulse gives energy, a wide chirp gives range resolution (and spreads the emission).
  const WF={RWS:[12,5],TWS:[8,8],STT:[20,200],ACM:[2,150],GM:[10,300]};
  const BAND={LOW:.94,MID:1,HIGH:1.06};
  const near=()=>{let d=1e9;for(const [j,tk] of radar.tracks)if(j.alive&&tk.d<d)d=tk.d;return d;};
  F.mod('aesax',10,(r,c,dt)=>{
    if(!X.on||r.antennaType!=='AESA'){X.act=false;return;}X.act=true;const P=c.P;
    if(!r._x){r._x={loss:r.systemLossesDb,sl:r.sideLobeLevelDb,f:r.carrierFrequencyGHz,rd:P.dm?P.dm.rdr:100,hop:0,p:r.powerLevelCurrent||1,pcr:r.pulseCompressionRatio||13};X.trm.n=nOf(r.radarModelName);X.trm.dead=0;X.hops=0;}
    const x=r._x,T=X.trm;
    // ---- T/R modules: heat and hits kill them for good; the set degrades gracefully (power x gain x gain ~ N^3)
    if(r.radarHeatCurrent>r.radarOverheatThreshold*.85)T.dead+=T.n*.0004*dt;
    if(P.dm&&P.dm.rdr<x.rd){T.dead+=(x.rd-P.dm.rdr)/100*T.n*.7;}if(P.dm)x.rd=P.dm.rdr;
    T.dead=cl(T.dead,0,T.n);T.alive=Math.round(T.n-T.dead);T.g=Math.max(.001,T.alive/T.n);T.lossDb=-30*Math.log10(T.g);
    r.sideLobeLevelDb=x.sl+(1-T.g)*10;
    // ---- chirp: the waveform follows the mode; the pulse is shortened so the nearest track never sits in the blind range (c*tau/2)
    const gm=window.W&&W.mode&&/GM|SEA/.test(W.mode),key=gm?'GM':(WF[radar.mode]?radar.mode:'RWS'),[t0,bw]=WF[key],dn=near();let tau=t0;if(dn<1e8)tau=Math.min(t0,Math.max(.4,1.6*dn/C*1e6));
    const ratio=13*cl(Math.pow(bw*tau/100,.25),.5,3);
    r.pulseWidthMicroseconds=tau;r.chirpBandwidthMhz=bw;r.pulseCompressionRatio=ratio;r.pulseCompressionEnabled=true;
    X.chirp={tau,bw,ratio,resM:C/(2*bw*1e6),minRngM:C*tau*1e-6/2,key};
    r.systemLossesDb=x.loss+T.lossDb;
    // ---- automatic power: the least that still gives a margin on what the set is working (low probability of intercept), more when jammed or threatened
    const hot=r.radarHeatCurrent>r.radarOverheatThreshold;let want=X.pwr,why='';
    if(X.pw==='AUTO'){const stt=radar.mode==='STT'&&radar.lock&&radar.lock.alive,L=stt?radar.lock:null,jam=radar.strobes&&radar.strobes.size>0,thr=window.RW&&RW.msl&&RW.msl.length>0;
      if(thr){want=1.2;why='THREAT';}else if(jam){want=1.4;why='BURN-THROUGH';}
      else if(L){const a=radar.ang(L.pos),rd=Math.max(1,radar.rdet(L,a)),k=(r.powerLevelCurrent||1);want=cl(k*2.2*Math.pow(a.d/rd,4),.3,1);why='STT MARGIN';}
      else if(radar.tracks.size){let m=.35;for(const [j,tk] of radar.tracks)if(j.alive){const a=radar.ang(j.pos),rd=Math.max(1,radar.rdet(j,a));m=Math.max(m,(r.powerLevelCurrent||1)*2*Math.pow(tk.d/rd,4));}want=cl(m,.55,1);why='TRACK MARGIN';}
      else{want=.55;why='LPI SEARCH';}}
    else{want={LOW:.4,NORMAL:1,HIGH:1.5}[X.pw]||1;why='MANUAL';}
    if(hot)want=Math.min(want,.5);X.pwr+=(want-X.pwr)*Math.min(1,dt*2.5);if(Math.abs(X.pwr-want)<.01)X.pwr=want;X.why=why;r.powerLevelCurrent=X.pwr;r._autoPwr=X.pwr;
    // ---- automatic band: low band to search far, high band for resolution at close range, hopping across all three when it is being jammed
    let b=X.band;
    if(X.bd==='AUTO'){const jam=radar.strobes&&radar.strobes.size>0;x.hop-=dt;
      if(jam){if(x.hop<=0){x.hop=.8;const o=['LOW','MID','HIGH'].filter(q=>q!==X.band);b=o[Math.floor(Math.random()*o.length)];X.hops++;}}
      else b=(radar.mode==='STT'||radar.mode==='ACM'||dn<20000)?'HIGH':(dn<60000?'MID':'LOW');}
    else b=X.bd;
    X.band=b;X.fGHz=x.f*BAND[b];r.carrierFrequencyGHz=X.fGHz;
    // ---- emission as an enemy warner sees it: power, spread of the chirp, agility
    const spread=1/(1+Math.log10(Math.max(bw,5)/5)*.35);X.lpi=cl(Math.sqrt(X.pwr)*spread*.9/.9*(1),.35,1.1);
  });
  // an enemy RWR hears the player's set at a range that follows the above
  if(window.RWRX&&RWRX.rangeMul){const o=RWRX.rangeMul;RWRX.rangeMul=function(j){let m=o.apply(this,arguments);if(j===player&&X.act&&X.on)m*=X.lpi;return m;};}
  // jam resistance: a hopping set with a wide chirp is harder to cover
  {const _j=radar.jam;if(typeof _j==='function'&&!radar._x2){radar._x2=1;radar.jam=function(){const J=_j.apply(this,arguments);if(J&&J.noise&&J.bt!=null&&X.act&&X.bd==='AUTO'&&X.hops>0)return Object.assign({},J,{bt:J.bt*1.25});return J;};}}
  // ---- multi-direction looks: the scheduler interleaves a second search volume with the main raster (time-shared, so each gets a share of the frame)
  {const _es=radar.esaSearch;radar.esaSearch=function(dt,lo,hi,gim,now,trk){const L=X.looks;
      if(!(X.on&&X.act&&this.esa==='A'&&(this.mode==='RWS'||this.mode==='TWS'))){L.share=0;return _es.apply(this,arguments);}
      let share=this.tracks.size?.22:.16;if(window.RW&&RW.msl&&RW.msl.length)share=.3;share*=X.trm.g;L.share=share;
      const o=_es.call(this,dt*(1-share),lo,hi,gim,now,trk);
      try{const q=this.esaPar(),st=this.beam*.6,hw=15*D,lim=Math.max(0,gim-2*D);
        let c2=(lo+hi)/2+L.flank*((hi-lo)/2+hw+2*D);if(Math.abs(c2)>lim-hw){L.flank*=-1;c2=(lo+hi)/2+L.flank*((hi-lo)/2+hw+2*D);}c2=cl(c2,-lim+hw,lim-hw);
        const lo2=c2-hw,hi2=c2+hw,el=this.antEl;let bud=(L._b||0)+dt*share,n=0;if(L.az2<lo2||L.az2>hi2)L.az2=L.dir2>0?lo2:hi2;
        while(bud>=q.dw&&n<200){bud-=q.dw;n++;L.az2+=L.dir2*st;if(L.az2>hi2){L.az2=hi2;L.dir2=-1;if(Math.random()<.5)L.flank*=-1;}else if(L.az2<lo2){L.az2=lo2;L.dir2=1;if(Math.random()<.5)L.flank*=-1;}this.esaCell(L.az2,el,now,lo2,hi2);}
        L._b=bud;L.cells+=n;L.n=n;}catch(e){}
      return o;};}
  // manual overrides: Alt+P power (AUTO > LOW > NORMAL > HIGH), Alt+; band (AUTO > LOW > MID > HIGH)
  const cyc=(a,v)=>a[(a.indexOf(v)+1)%a.length];
  addEventListener('keydown',e=>{if(!e.altKey||e.ctrlKey||typing(e))return;
    if(e.code==='KeyP'){e.preventDefault();X.pw=cyc(['AUTO','LOW','NORMAL','HIGH'],X.pw);say('RADAR POWER · '+X.pw+(X.pw==='AUTO'?' (LPI / MARGIN)':''),1600);}
    else if(e.code==='Semicolon'){e.preventDefault();X.bd=cyc(['AUTO','LOW','MID','HIGH'],X.bd);say('RADAR BAND · '+X.bd,1600);}});
  // debug menu rows
  if(window.DBGM&&DBGM.rows&&DBGM.rows.RADAR){const o=DBGM.rows.RADAR;DBGM.rows.RADAR=P=>{const R=o(P);if(!X.act)return R;return R.concat([['— AESA —',''],['T/R modules',X.trm.alive+' / '+X.trm.n+'  ('+f2(X.trm.lossDb)+' dB)'],['chirp',f2(X.chirp.tau)+' us · '+f2(X.chirp.bw)+' MHz · res '+f2(X.chirp.resM)+' m · blind '+Math.round(X.chirp.minRngM)+' m'],['power (auto)',f2(X.pwr)+' '+X.pw+' · '+X.why],['band',X.band+' '+f2(X.fGHz)+' GHz '+X.bd+' · hops '+X.hops],['LPI factor',f2(X.lpi)],['second look',f2(X.looks.share*100)+' % · cells '+X.looks.cells]]);};}
  const f2=v=>typeof v==='number'&&isFinite(v)?+v.toFixed(2):v;
});

/* ---------------- #41: compressor stalls, more of the physics ----------------
   On top of the intake-based model (engsys.js): 1) a rotating-stall precursor as the margin runs out (roughness, rpm / EGT hunting, vibration), well before the stall itself;
   2) two kinds of stall: a surge (violent pulsing, bangs) and, more often on a slow hydromechanical control, a quiet rotating stall that sits at about 45 % thrust, hangs and
   does not clear by itself; 3) a stall that is left hanging eats the compressor (blade rub and over-temperature) and costs engine health. */
blk('stalls',()=>{
  const ES=window.ENGSYS;if(!ES||!ES.get||!Jet.prototype.stallStart||!Jet.prototype.stallTick)return;
  const _st=Jet.prototype.stallStart;
  Jet.prototype.stallStart=function(why){const cs=this.cs,was=cs.st;_st.apply(this,arguments);if(!(cs.st===1&&!was))return;const es=ES.get(this);if(!es)return;
    const fc=es.p.fc,rot=Math.random()<.12+.5*(1-fc)*(/DISTORTION|OVER-TEMP|STARVED/.test(why||'')?1.3:.7);es.rot=rot;es.preT=0;
    if(rot){es.mild=false;es.auto=false;if(this===player)try{say('ENGINE · ROTATING STALL · RETARD THROTTLE',1800);}catch(e){}}};
  const _tk=Jet.prototype.stallTick;
  Jet.prototype.stallTick=function(dt){_tk.apply(this,arguments);const es=ES.get(this),cs=this.cs;if(!es||!cs||this.remote||!this.alive)return;
    const L=es.load,twin=cs.twin,tot=x=>twin&&!cs.both?.5+.5*x:x,mine=i=>!cs.twin||cs.both||(i===(cs.side<0?0:1));
    if(cs.st===0&&L){const pre=cl((L.r-.42)/.2,0,1);es.pre=pre;
      if(pre>0){es.e.forEach(e=>{e.vib=Math.max(e.vib||0,pre*.45);e.egt+=pre*14*dt*(.6+.4*Math.sin(performance.now()/180));});
        if(this===player){this.shake=Math.max(this.shake||0,.12*pre);es.preT=(es.preT||0)-dt;if(pre>.5&&es.preT<=0){es.preT=18;try{say('ENGINE ROUGH · EASE THE THROTTLE / REDUCE AoA',1500);}catch(e){}}}
        // thrust ripple: the compressor is hunting
        cs.thr=Math.min(cs.thr,1-.035*pre*(.5+.5*Math.sin(performance.now()/90)));}}
    if(cs.st===1&&es.rot){cs.x=.45+.05*Math.sin(cs.t*7);cs.thr=tot(cs.x);if(this===player)this.shake=Math.min(this.shake||0,.5);}
    if(cs.st===2&&cs.hang>4){es.e.forEach((e,i)=>{if(!mine(i))return;e.comp=Math.min(1,(e.comp||0)+dt*.02);e.h=Math.max(.05,e.h-dt*.0025);e.egt+=dt*10;});}
  };
});
})();
