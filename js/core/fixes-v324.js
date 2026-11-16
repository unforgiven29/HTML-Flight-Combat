"use strict";
/* =====================================================================================================================
   v324 — bug pass from the 11/14 list. Data-level fixes that touch tables built by several earlier files, so they run last.
   Each block is wrapped on its own: one failing block must not stop the others.
   Parameters are gameplay-level estimates, not published data.
   ===================================================================================================================== */
(function(){
const blk=(n,f)=>{try{f();}catch(e){console.warn('[fixes-v324] '+n,e);}};
const has=k=>typeof AC!=='undefined'&&AC[k];

// 37: the modern Flankers carry two AKU-170 pairs of R-77 on the centreline tunnel (5 / 5B and 6 / 6B). The stations existed but the default loadouts
// left 5B / 6B (and on the MKM, 5 / 6 as well) empty, so the jets left the hangar with half the rounds.
blk('flanker R-77 pairs',()=>{
  const want={'Su-30SM':'R-77-1','Su-30MKI':'R-77','Su-30MKM':'R-77','Su-30MK2':'R-77','Su-35S':'R-77-1','Su-27SM':'R-77'};
  for(const [id,w] of Object.entries(want)){
    if(!has(id)||!LOAD.modern)continue;const L=LOAD.modern[id]||(LOAD.modern[id]={});
    const ok=k=>(STN[id]&&STN[id][k]||[]).includes(w);
    if(!ok(5)||!ok('5B'))continue;
    const m=(L[5]&&String(L[5]).startsWith('R-77'))?L[5]:w;
    L[5]=m;L['5B']=m;L[6]=(L[6]&&String(L[6]).startsWith('R-77'))?L[6]:w;L['6B']=L[6];}
});

// 28: IRCCM classes. The table had five seeker architectures and only 18 rounds mapped; the rest fell back on a guess from the ccm number (PL-8, Python 4, AAM-3,
// AIM-9H and the SAM rounds were all lumped into the cheap classes). Added a rosette-scan two-band head and mapped every IR round explicitly.
blk('IRCCM classes',()=>{
  const I=window.SENSOR_IR;if(!I||!I.ARCH||!I.MAP)return;
  I.ARCH.ROS={n:'rosette scan, two-band',spec:.5,kin:.5,int:.55,spat:0,bands:2,Rimg:0,sun:.3,cloud:.3,ground:.3,bloom:0,plume:.12,ifov:.35};
  const set=(cls,list)=>list.forEach(k=>{if(MSL[k])I.MAP[k]=cls;});
  set('SPIN',['AIM-9B','R-3S','R-40TD','Firestreak','AIM-4D','AIM-4G','R-98T','R-4T','PL-2','R-8MT','Shafrir 1','Red Top','Rb 24']);
  set('COOL',['AIM-9D','AIM-9E','AIM-9G','AIM-9J','R-24T','R-13M','Rb 28','Rb 24J','Magic 1','Shafrir 2','AIM-9H','Tien Chien I','9M32M','FIM-43C']);
  set('CON',['AIM-9P','AIM-9L','R-60M','Rb 74','PL-5E','Python 3','9M36','FIM-92A']);
  set('CON2',['AIM-9M','R-27T','R-27ET']);
  set('ROS',['R-73','R-74M','PL-8','AAM-3','Magic 2','9M342','FIM-92J']);
  set('IIR',['AIM-9X','AIM-9X-II','R-74M2','IRIS-T','ASRAAM','Python 4','Python 5','AAM-5','PL-10','MICA IR','MICA NG IR','A-Darter']);
});

// 35: ranging-only radars (ASG-17, APG-30, SRD-1M, Klen-PS, Fon-1400, Kaira, LRMTS, ARBS, EL/M-2001B ...) were flagged noRdr and the scope said NO RADAR even though the set
// ranges the boresight for the gunsight and the A/G delivery. They now get a RANGING page: set name, mode and the range to whatever is inside the boresight cone.
blk('ranging radar page',()=>{
  const isRng=P=>!!(P&&P.ac&&P.ac.noRdr&&!P.ac.tvScope&&P.ac.radar&&/rang|ARBS|LRMTS|laser|EL\/M|APG-40|PS-431|MA-2|S7B/i.test(P.ac.radar.name||'')&&!/^none|^no radar/i.test(P.ac.radar.name||''));
  window.isRangingSet=isRng;
  const D=Math.PI/180;
  function page(c,S,col){const P=player;c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#020604';c.fillRect(0,0,S,S);
    const R=P.ac.radar,lim=Math.max(R.R0||3000,1000);let best=null,bd=1e12;
    for(const j of jets){if(j===P||!j.alive||(typeof IFF!=='undefined'&&IFF.hide(j)))continue;const a=radar.ang(j.pos);if(a.off<4*D&&a.d<lim&&a.d<bd&&terrLOS(P.pos,j.pos)){bd=a.d;best=j;}}
    c.font='700 15px "B612 Mono",monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle=col;c.globalAlpha=.9;
    c.fillText('RANGING RADAR',S/2,S/2-46);c.globalAlpha=.6;c.font='700 12px "B612 Mono",monospace';c.fillText(R.name,S/2,S/2-24);
    c.fillText('BORESIGHT · MAX '+(R.unit===NM?(lim/NM).toFixed(1)+' NM':(lim/1000).toFixed(1)+' KM'),S/2,S/2-6);
    c.globalAlpha=1;c.font='700 22px "B612 Mono",monospace';
    c.fillText(best?(R.unit===NM?(bd/NM).toFixed(2)+' NM':(bd/1000).toFixed(2)+' KM'):'NO RANGE',S/2,S/2+34);
    c.globalAlpha=.5;c.font='700 11px "B612 Mono",monospace';c.fillText('no search picture · range feeds the gunsight',S/2,S/2+64);c.globalAlpha=1;}
  if(typeof drawFCR==='function'){const _f=drawFCR;drawFCR=function(){const r=_f.apply(this,arguments);try{if(isRng(player))page(fcr,360,isMig()?'#8dffb4':MF);}catch(e){}return r;};}
  if(typeof drawPhScope==='function'){const _p=drawPhScope;drawPhScope=function(P){const r=_p.apply(this,arguments);try{if(isRng(P)){const c=phScopeC.getContext('2d');page(c,360,'#8dffb4');}}catch(e){}return r;};}
});

// 42: a pulse radar in ACM can only lock aircraft. Never let a ground return take the lock from the ACM scan, and never carry one over from before the mode change.
blk('ACM ground guard',()=>{
  const _s=radar.stt;radar.stt=function(j){if(j&&j.isGhost&&this.mode==='ACM')return;return _s.apply(this,arguments);};
  const _a=radar.setACM;radar.setACM=function(){if(this.lock&&this.lock.isGhost){this.lock.alive=false;this.lock=null;}return _a.apply(this,arguments);};
});

// 10 / 34 / 18: RWR realism. Carrier frequencies per radar (public-source estimates, X-band mostly; MiG-29 and Su-27 families share one), band coverage per
// warner (out-of-band emitters are heard at much shorter range), warners matched to the airframe's real nationality and era, jets that carried none get none,
// and the Patriot hops its frequency while it is engaging. Same-frequency emitters cannot be told apart by the warner's library (27 vs 29).
blk('RWR realism',()=>{
  const F29=9.35,FSU=9.35;                                   // N019 / N001 families: one shared X-band frequency
  const RF=window.RADAR_FREQ={'APG-66(V)1':9.4,'APG-68(V)5':9.4,'APG-68(V)9':9.4,'APG-63':9.6,'APG-63(V)1':9.6,'APG-70':9.6,'APG-70I':9.6,'APG-73':9.6,'APG-79':9.8,'APG-77(V)1':10.0,'APG-82(V)1':9.8,'APG-81':9.9,'APG-80':9.8,'APG-83 SABR':9.8,
    'AWG-9':9.5,'APG-71':9.6,'AWG-10':9.3,'AWG-12':9.3,'APQ-120':9.2,'APQ-72':9.2,'APQ-126':9.4,'APQ-156':9.4,'APQ-159':9.4,'APG-53A':9.3,'APG-67(V)':9.4,
    'N019':F29,'N019M':F29,'Zhuk-ME':F29,'Zhuk-AE':9.5,'Zhuk':9.4,'N001':FSU,'N001V':FSU,'N001VEP':FSU,'N011M':9.6,'Irbis-E':9.6,'N036 Byelka':9.8,'Sh141':9.6,
    'Sapfir-23ML':9.1,'Sapfir-25':9.0,'Zaslon':9.2,'Zaslon-M':9.2,'RP-22SM':9.2,'RP-22':9.2,'RP-5 Izumrud':9.3,'TsD-30':9.3,'TsD-30T':9.3,'Taifun-M':9.2,'RP-S Smerch':9.2,'Oryol-D':9.1,
    'Cyrano I':9.4,'Cyrano II':9.4,'Cyrano IV':9.4,'RDI':9.8,'RDY':9.8,'Antilope 5':9.8,'RBE2-AA':9.9,'CAPTOR-M':9.6,'PS-05/A':9.4,'ES-05 Raven':9.8,'PS-01/A':9.4,'PS-46/A':9.5,'AI.23B Airpass':9.3,'AI.24 Foxhunter':9.5,'AI.17':9.3,'AI.18':9.3,'Blue Fox':9.0,'Blue Vixen':9.8,'Blue Parrot':9.3,'Agave':9.4,
    'Type 1492':9.4,'Type 1474':9.4,'Type 1475':9.9,'Type 232H':9.4,'KLJ-7A':9.8,'KLJ-3':9.4,'KLJ-6E':9.3,'JL-10A':9.5,'GD-53 Golden Dragon':9.5,'EL/M-2001B':9.4,'EL/M-2032':9.4,'EL/M-2052':9.8,'Grifo-M346':9.5,'J/APG-1':9.8,'KF-21 AESA':9.8,'J-16 AESA':9.8,'J-15 AESA':9.8,'J-35 AESA':9.8,
    'R21G/M1':9.4,'MA-1':9.3,'MG-13':9.3,'MG-10':9.3,'R-14A':9.4,'NASARR F15A-41B':9.4,'APG-51':9.3,'APQ-94':9.3,'APG-30 ranging':9.5,'AN/APG-30 ranging (ACM)':9.5,'APQ-144 / Pave Tack':9.5,'PS-37/A':9.5,'MG-13':9.3};
  const GF={'6':6.0,'A':15.9,'10':9.0,'P':5.5,'15':14.5,'19':15.0,'22':3.0,'S':3.3};      // SA-6 1S91, Gun Dish, S-300 30N6, Patriot MPQ-53, Tor, Tunguska, Pantsir, ship search / fire control
  const BAND=n=>n<1?'L':n<2?'L':n<4?'S':n<8?'C':n<12?'X':n<18?'Ku':'K';
  window.rwrBandOf=BAND;
  // carrier frequency into the radar registry of the player's jet (the link budget and the Doppler maths read it)
  if(window.SENSOR_FUSE&&SENSOR_FUSE.onSeed)SENSOR_FUSE.onSeed.push(function(r,j){const n=(j.ac.radar&&j.ac.radar.name)||'';const f=RF[n]||RF[n.split('/')[0].trim()];if(f)r.carrierFrequencyGHz=f;});
  // emitter record: carrier, band, agility
  const _re=window.rwrEmit;
  window.rwrEmit=function(j){const fresh=!j._rw,e=_re(j);if(fresh){
      if(e.g){e.f=GF[e.sym]||9.0;e.agile=e.sym==='P'?1:e.sym==='10'?.5:e.sym==='15'?.3:0;e.fb=e.f;}
      else{const n=(j.ac&&j.ac.radar&&j.ac.radar.name)||'';e.f=RF[n]||RF[n.replace(/\/.*$/,'').trim()]||9.5;e.agile=e.aesa?1:(j.ac&&j.ac.radar&&j.ac.radar.pesa)?.5:0;e.fb=e.f;}
      e.band=BAND(e.f);
      // frequency-library ambiguity: same-carrier families cannot be separated by frequency alone (a warner with a perfect library still falls back on PRF / scan)
      const t=j.type||'';const fam=e.sym==='27'||e.sym==='29';if(fam&&!e.g){const sw=(typeof Math.random==='function'&&((j.id||0)*2654435761>>>0)%100<35);e.altSym=sw?(e.sym==='27'?'29':'27'):null;}}
    if(e.g&&e.agile&&e.sym==='P'){const eng=j.engaging||j.lockT>0||j.tgt;const step=Math.floor((typeof RW!=='undefined'?RW.clk:0)/(eng?1.2:20));e.f=e.fb+(((Math.sin(step*12.9898+(j.id||1)*78.233)*43758.5453)%1+1)%1-.5)*.6;}
    return e;};
  // band coverage of each warner (GHz)
  const COV={'ALR-45/50':[6,18],'ALR-46':[4,18],'ALR-69':[4,18],'APR-39':[4,18],'ALR-56C':[2,18],'ALR-56M':[2,18],'ALR-67(V)1':[2,18],'ALR-67(V)2':[2,18],'ALR-67(V)3':[2,18],'SPO-15LM':[7.5,17.5],'SPO-10':[8,12.4],'L-150':[1.2,18],'Serval':[2,18],'BF':[6,18]};
  window.RWR_COV=COV;
  const oc=RWRX.rangeMul;RWRX.rangeMul=function(j,e,d,a,lk,P){let m=oc.apply(this,arguments);const c=COV[RWRX.nm]||COV[(RW.sy&&RW.sy.nm)||''];if(c&&e&&e.f){const out=e.f<c[0]?Math.log2(c[0]/e.f):e.f>c[1]?Math.log2(e.f/c[1]):0;if(out>0)m*=Math.pow(10,-Math.min(15,4+10*out)/20);}return m;};
  // agile emitters blur the intercept probability and a hop breaks a lock the warner was holding
  const oph=RWRX.pHit;RWRX.pHit=function(rc,sy){let p=oph.apply(this,arguments);if(rc.e&&rc.e.agile)p*=1-.22*rc.e.agile*(1-(sy.lpi||0)*.5);return p;};
  // new warners
  const mk=(n,base,o)=>{if(!RWRF[n]&&RWRF[base])RWRF[n]=Object.assign({},RWRF[base],o);COV[n]=COV[base]||[2,18];};
  mk('ALR-94','ALR-67(V)3',{k:4.6,sd:1.2,lpi:1,arh:20000,mem:7});mk('ASQ-239','ALR-67(V)3',{k:4.4,sd:1.5,lpi:1,arh:20000,mem:7});
  mk('EuroDASS','ALR-67(V)3',{k:3.8,sd:2,lpi:.9,arh:15000});mk('SPECTRA','ALR-67(V)3',{k:3.8,sd:2,lpi:.9,arh:15000});mk('EWS-39','ALR-67(V)3',{k:3.5,sd:2.5,lpi:.8,arh:12000});
  mk('J/APR-4','ALR-56M',{k:3.3,sd:3.5});mk('KF-21 RWR','ALR-67(V)3',{k:3.4,sd:3,lpi:.8});mk('Tarang','ALR-67(V)2',{k:3.0,sd:5,lpi:.55});mk('ALR-95','ALR-69',{k:2.6,sd:8});
  mk('PRC-RWR','ALR-56C',{k:3.0,sd:5,lpi:.55,id:.85});mk('PRC-RWR-2','ALR-67(V)2',{k:3.3,sd:3.5,lpi:.75,id:.92});
  for(const n of Object.keys(COV)){}
  const set=(n,list)=>{for(const k of list)if(AC[k])RWR_OF[k]=n;};
  set('ALR-94',['F-22']);set('ASQ-239',['F-35A','F-35B','F-35C']);set('EuroDASS',['EF-2000']);set('SPECTRA',['Rafale','Rafale M']);set('EWS-39',['JAS-39C','JAS-39D','JAS-39E']);
  set('J/APR-4',['F-2A']);set('KF-21 RWR',['KF-21']);set('Tarang',['Tejas Mk1A']);set('ALR-95',['FA-50','M-346FA','F-CK-1']);set('ALR-69',['A-10C']);
  set('PRC-RWR',['J-10A','J-10C','J-11B','J-8F','JH-7','JH-7A','JF-17','J-7G']);set('PRC-RWR-2',['J-15T','J-16','J-20','J-35']);set('L-150',['MiG-35']);
  // no warner fitted: early Cold War types, trainers, transports and the F-117
  for(const k of['MiG-15','MiG-17F','MiG-19','J-6','Q-5','F-86F','F-100A','Hunter F.6','Lightning F.6','Javelin FAW.9','Sea Vixen FAW.2','F3H-2','F-8E','F-102A','F-101B','F-106A','F-104G','Su-7BMK','Su-9','Su-11','Tu-128','Yak-28P','Yak-130','F-117A','A-37B','F-5A','Mirage 5','Mirage III','Mirage IIIC','Cargo','E-3A','A-50'])RWR_NONE.add(k);
});

// 14 / 13: the F-22 inherited the F-16's departure angle (32 deg) from its source airframe although it flies at 60 deg with vectored thrust; the other
// vectoring / 5th-generation jets get matching figures. AI pilots now back off the stick before they reach the departure AoA and use the stick forward to
// recover (the old AI held full back-stick through the departure and spun).
blk('departure',()=>{
  const D={'F-22':{a:62,rock:.25,spin:1.0},'Su-57':{a:58,rock:.3,spin:1.2},'Su-35S':{a:52,rock:.4,spin:1.4},'Su-30MKI':{a:50,rock:.45,spin:1.5},'Su-30MKM':{a:50,rock:.45,spin:1.5},'J-20':{a:45,rock:.5,spin:1.6},'F-35A':{a:50,rock:.4,spin:1.4},'F-35B':{a:50,rock:.4,spin:1.4},'F-35C':{a:50,rock:.4,spin:1.4},'MiG-35':{a:50,rock:.45,spin:1.5}};
  for(const k in D)if(AC[k])AC[k].dep=Object.assign({},AC[k].dep||{},D[k]);
  const _st=Jet.prototype.step;
  Jet.prototype.step=function(dt){
    if(this.ai&&this!==player&&this.alive&&this.ac&&this.ac.dep&&!this.remote){const lim=this.ac.dep.a,ad=(this.alpha||0)*180/Math.PI,c=this.ctl,dp=this.dep||0;
      if(dp>.05||ad>lim*.82){c.p=Math.min(c.p,dp>.3?-.3:ad>lim*.92?0:.25);if(dp>.05){c.r*=.3;c.y=0;}}}
    return _st.apply(this,arguments);};
});

// 43: the EGT redline sat BELOW the engine's own afterburner steady-state at altitude / Mach (the model adds the ram and altitude terms on top of the
// military + AB figures), so every engine class overheated and wore out in sustained AB. The redline is now the steady-state maximum plus a margin; only damage,
// stalls, fires and abuse push an engine past it.
blk('engine redline',()=>{const EC=window.ENGSYS&&ENGSYS._EC;if(!EC)return;for(const k in EC){const e=EC[k].egt;e[3]=Math.max(e[3],Math.round((e[1]+e[2]+25*1.5+30*1.3+30)/5)*5);EC[k].oilM=Math.max(EC[k].oilM,Math.round(EC[k].oilT*1.4));}});

// 46: fuel starvation. Gravity-fed and non-inverted fuel systems run dry of pickup fuel under sustained negative or near-zero G; the engine surges and cuts
// until positive G returns. Tolerance depends on the engine / fuel-system generation.
blk('fuel starvation',()=>{
  const _st=Jet.prototype.step;
  Jet.prototype.step=function(dt){const r=_st.apply(this,arguments);if(!this.alive||this.remote||this.gnd||this.onGnd||this.ac.heli||this.ac.rotor||this.ac.vstol&&this.vtHook&&this.mach<.2)return r;
    let tol=this._fsTol;if(tol===undefined){const pr=window.ENGSYS&&ENGSYS.prof&&ENGSYS.prof(this),n=pr&&pr.c&&pr.c.n||'';tol=/centrifugal|early axial|turbojet$/.test(n)?8:/TF30|turbojet \/ fan|analog/.test(n)?18:35;if(this.ac.invFuel!=null)tol=this.ac.invFuel;this._fsTol=tol;}
    const low=this.nz<.25&&this.pos.y>groundAt(this.pos.x,this.pos.z)+60;this._fsT=Math.max(0,(this._fsT||0)+(low?dt:-dt*2.5));
    const k=clamp((this._fsT-tol)/3,0,1);this.fuelStarve=k;
    if(k>0){this.n*=1-k*Math.min(1,dt*3);if(this===player&&Math.random()<dt*1.5)flash('FUEL PRESSURE · NEGATIVE G · UNLOAD THE JET',800);}
    return r;};
});

// 39: F-4 engine variants. Only the E / B / J had engine-system rows; the C and D (J79-GE-15), the G (GE-17) and the Spey-powered FGR.2 fell back to the generic
// profile. The Spey is a turbofan with a deeper surge margin than any J79.
blk('F-4 engines',()=>{const T=window.ENGSYS&&ENGSYS._T;if(!T)return;const a=T['F-4B']||T['F-4E'];if(!a)return;
  for(const k of['F-4C','F-4D'])if(!T[k])T[k]=a.slice();if(!T['F-4G']&&T['F-4E'])T['F-4G']=T['F-4E'].slice();
  if(!T['Phantom FGR.2'])T['Phantom FGR.2']=['axB',1.15,.5,{mg:.19,fc:.35}];});

// 5: every F-35 variant uses the A cockpit. The B and C were cloned from the A before the dedicated pit was installed on it and kept the F-16 pit.
blk('F-35 cockpit',()=>{const A=AC['F-35A'];if(!A)return;for(const k of['F-35B','F-35C'])if(AC[k])for(const f of['cockpit','pit','hmdHud','cwPit','eye'])if(A[f]!==undefined)AC[k][f]=A[f];});

// 4: MICA NG, EM and IR. Public information: new dual-pulse motor and a longer-range / more jam-resistant seeker, imaging-IR (dual-band) for the IR round, same 160 mm airframe,
// somewhat heavier. Values are gameplay-level estimates (EM roughly +45 % reach on the MICA EM, IR +30 %).
blk('MICA NG',()=>{
  const mk=(k,base,over,sn,name)=>{if(MSL[k]||!MSL[base])return;const d=Object.assign({},MSL[base],over);delete d.ph;delete d.spec;
    const dia=MDIA[base]||.16,S=Math.PI*dia*dia/4,dv=d.acc*d.burn,mbo=d.mass*Math.exp(-dv/2350),mp=d.mass-mbo,I=mp*2350,tb=d.burn;
    d.ph={S,dia,m0:d.mass,mp,mbo,tb,ts:0,gap:0,Tb:I/tb,Ts:0,mdB:mp/tb,mdS:0,cd0:2.38*d.cd*mbo/S,cnMax:.004*mbo/S*(d.cnK||1)};d.ph.cna=d.ph.cnMax/.38;d.burnT=tb;
    // dual pulse: 62 % of the impulse in a 4.5 s boost, the rest in a 7 s sustain pulse after a short coast gap
    const f=.62,tb2=4.5,ts=7;d.ph.tb=tb2;d.ph.ts=ts;d.ph.gap=1.2;d.ph.Tb=f*I/tb2;d.ph.Ts=(1-f)*I/ts;d.ph.mdB=f*mp/tb2;d.ph.mdS=(1-f)*mp/ts;d.burnT=tb2+ts+1.2;d.burn=d.burnT;
    d.rcs=MSL[base].rcs;d.irsB=MSL[base].irsB;d.irsC=MSL[base].irsC;MSL[k]=d;SHAPE[k]=SHAPE[base];MDIA[k]=dia;if(!MSL_KEYS.includes(k))MSL_KEYS.push(k);SN[k]=sn;WNAME[k]=name;MODERN_ONLY.add(k);};
  mk('MICA NG EM','MICA EM',{mass:115,acc:150,burn:8,aiR:35000,life:75,trk:.92,ccm:.85,res:.9,ecc:.8,hoj:1},'MICA NG','MICA NG EM · active radar (new seeker), dual-pulse, TVC');
  mk('MICA NG IR','MICA IR',{mass:114,acc:150,burn:8,irR:26000,aiR:26000,life:70,trk:1.7,ccm:.92},'MICA NG IR','MICA NG IR · imaging IR (dual band), dual-pulse, TVC');
  if(window.SENSOR_IR&&SENSOR_IR.MAP&&MSL['MICA NG IR'])SENSOR_IR.MAP['MICA NG IR']='IIR';
  for(const id in STN){const sn=STN[id];if(!sn)continue;for(const k in sn){const l=sn[k];if(!Array.isArray(l))continue;
    if(l.includes('MICA EM')&&!l.includes('MICA NG EM'))l.splice(l.indexOf('MICA EM')+1,0,'MICA NG EM');if(l.includes('MICA IR')&&!l.includes('MICA NG IR'))l.splice(l.indexOf('MICA IR')+1,0,'MICA NG IR');}}
});

// 3: loadouts. An audit of every default loadout against the stores each station offers found the F-14D's cold-era defaults carrying AIM-54C (modern-only, not offered in that era),
// which the hangar then silently dropped. They fall back to the AIM-54A. (The empty cold loads of modern-only jets and the Vikhr rack sub-stations are by design.)
blk('loadout audit',()=>{const L=LOAD&&LOAD.cold&&LOAD.cold['F-14D'];if(!L)return;for(const k in L)if(L[k]==='AIM-54C'&&!(STN['F-14D'][k]||[]).length)continue;else if(L[k]==='AIM-54C'&&!(typeof stOpts==='function'?stOpts('F-14D','cold',k):[]).includes('AIM-54C'))L[k]='AIM-54A';});

// 2: wrong hangar front views. Cloned jets inherited their source airframe's drawing: the F-35B, Rafale M, EF-2000 prototypes, Gripen A and A-10A showed the F-16, the J-10A / B the MiG-29.
// They now take the drawing of their own family, with the real span in the caption.
blk('front views',()=>{if(typeof FV==='undefined')return;
  const al=(id,src,span)=>{if(AC[id]&&FV[src]&&FV[id]!==FV[src]||AC[id]&&FV[id]===FV['F-16']&&FV[src]&&src!=='F-16'){const o=FV[src];FV[id]=Object.assign({},o,span?{span,hw:parseFloat(span)/2}:{});}};
  al('F-35B','F-35A','10.70 m');al('Rafale M','Rafale','10.90 m');al('EF-2000 T1','EF-2000');al('EF-2000 T3','EF-2000');al('Gripen A','JAS-39C');al('A-10A','A-10C');
  for(const k of['J-10A','J-10B'])if(AC[k]&&FV['J-10C']&&FV[k]!==FV['J-10C'])FV[k]=Object.assign({},FV['J-10C'],{span:'9.75 m',hw:4.875});});

// 48: TGP / seeker slew over terrain. The point of interest is only ever updated when the new line of sight hits ground within 60 km. Slewing up past a ridge line towards the horizon (a ray that clears every hill)
// found no ground, so the point simply stayed put and the view could not be raised above mountains and hills. A ray that finds no ground now moves the point out along the ray (sky / horizon), and
// the next slew continues from that line of sight instead of snapping back.
blk('TGP slew over terrain',()=>{if(typeof SNS==='undefined')return;
  SNS.slew=function(cs,cr,dt){const P=player;this.ensure(P);if(this.mode==='POINT'||this.mav){if(cs||cr){this.mode='AREA';this.unit=null;this.mav=null;}}
    const e=this.eye(P),l=this.spi.clone().sub(e).normalize(),r=this.fov()*D2R*.45*dt;
    const az=Math.atan2(l.x,-l.z)+cs*r,el=Math.asin(clamp(l.y,-1,1))+cr*r,nl=new V3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el));
    const f=P.fwd(new V3()),an=Math.acos(clamp(nl.dot(f),-1,1)),ac=Math.acos(clamp(l.dot(f),-1,1));
    if(an>this.lim()&&an>=ac){this.glim=1;return;}
    const g=this.ground(e,nl);this.sky=!g;this.spi=g||e.clone().addScaledVector(nl,60000);};
  const _lim=SNS.clampSpi;SNS.clampSpi=function(P){if(this.sky)return;return _lim.apply(this,arguments);};
});
})();
