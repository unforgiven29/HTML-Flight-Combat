/* =====================================================================================================================
   v229 — the Cold War hangar: every jet from "Viper Sortie Docs/planes/Cold War" that the game did not have yet.
   Loaded after game.js; uses its global tables (AC, ACS, STN, LOAD, MSL, AGW …) and cloneType() to register each type.
   Each jet: flight data from its flight manual / published figures, its own sensors, gun, stations and stores, side,
   campaign roles, NATO/AWACS call, RWR, chaff/flares, a procedural airframe and a front-view menu icon.
   Cockpits re-use the nearest existing pit family (see CHANGELOG v229 for which one each jet borrows).
   ===================================================================================================================== */
(function(){
'use strict';
const W=window;
const log=(...a)=>console.warn('[coldwar]',...a);
const D=D2R;

/* ------------------------------------------------------------------------------------------------------------------
   1. generic aerodynamic tables
   ------------------------------------------------------------------------------------------------------------------ */
// CL vs AoA on the game's standard AoA grid from a lift slope (per rad), CLmax and the AoA it is reached at
const SWA=[-20,-10,0,5,10,15,20,25,30,35,40,50,60,90];
function clRow(cla,clmax,amax,cl0=.03,fall=.62){return SWA.map(a=>{if(a<=0)return Math.max(-clmax*.65,cl0+cla*a*D*.92);
  const lin=cl0+cla*a*D*(1-.18*Math.pow(a/amax,2));if(a<=amax)return Math.min(lin,clmax*(1-.08*Math.pow(1-a/amax,3))+0*lin);
  if(a>=90)return 0;const t=(a-amax)/(90-amax);return clmax*(1-(1-fall)*Math.min(1,t*2.2))*(1-Math.pow(t,3));});}
const clt=(cla,clmax,amax,cl0)=>{const r=clRow(cla,clmax,amax,cl0);let m=-9;return SWA.map((a,i)=>{let v=r[i];if(a<=amax){v=Math.max(v,m);m=v;}return[a,+v.toFixed(3)];});};
// wave drag rise: subsonic types (mdd ≈ .78-.85) get a steep wall, supersonic types the usual transonic hump
function cdm(peak,mdd=.85,sup=true){const r=[[0,0],[mdd-.08,0],[mdd,peak*.18],[mdd+.08,peak*.6],[1,peak],[1.1,peak*1.25]];
  if(sup)r.push([1.3,peak*1.2],[1.6,peak*.95],[2,peak*.85],[2.5,peak*.66],[3,peak*.54]);else r.push([1.3,peak*2.2],[2,peak*3]);return r;}
const cdmRow=(peak,mdd,sup)=>cdm(peak,mdd,sup);

/* ------------------------------------------------------------------------------------------------------------------
   2. procedural airframe builder (same kit as the built-in jets: lofts, planforms, fins, nozzles, canopies)
   nose toward -Z, +Y up, +X right; planform points are [x, z] for the right side and mirrored
   ------------------------------------------------------------------------------------------------------------------ */
function tipPylons(grp,st,mat,wy,tipX){for(const [k,[x,y,z]] of Object.entries(st)){if(/[a-z]$/.test(k))continue;
  if(tipX&&Math.abs(x)>=tipX){pod(grp,2.6,.065,mat,x,y,z+.15,1,1.2,12);ball(grp,.055,mat,x,y,z-1.15,1,1,2.2);continue;}
  const top=wy(x,z),h=Math.max(.08,top-(y+.12));pod(grp,1.4,.2,mat,x,y+.12+h/2,z+.1,.045/.2,(h/2+.03)/.2,12);}}
function mkJet(p){
  const grp=new THREE.Group(),mat=SKIN(p.c||0x8a949a),dk=SKIN(p.dk||0x5f686e),lt=SKIN(p.lt||0xa9b2b7),blk=SKIN(0x1c1f22,10),met=SKIN(0x5a5550,60),
    rad=SKIN(p.rad||0x9ea5a0,20),M={mat,dk,lt,blk,met,rad},wingM=p.wingCol?SKIN(p.wingCol):mat;M.wing=wingM;
  grp.add(new THREE.Mesh(sloft(p.body,40,!p.noseOpen,!p.tailOpen),mat));
  if(p.radome)grp.add(new THREE.Mesh(loft(p.radome,40,true,false),rad));
  if(p.probe){const [z0,z1,y=0]=p.probe;rod(grp,[0,y,z0],[0,y,z1],.025,met,1,[0,1,0],8);ball(grp,.035,met,0,y,z1);}
  if(p.noseInt){const n=p.noseInt;rim(grp,n.r,.045,dk,0,n.y||0,n.z,n.sx||1,n.sy||1);
    const d=new THREE.Mesh(new THREE.CircleGeometry(n.r*.93,28),blk);d.scale.set(n.sx||1,n.sy||1,1);d.position.set(0,n.y||0,n.z+.07);d.rotation.y=Math.PI;grp.add(d);
    if(n.cone)tube(grp,.03,n.cone,n.coneL||1,rad,0,n.y||0,n.z-(n.coneL||1)/2+.25);}
  for(const it of p.intakes||[])for(const sd of it.one?[1]:[-1,1]){const x=sd*it.x;
    if(it.duct){const dm=new THREE.Mesh(sloft(it.duct,24,false,true),mat);dm.position.x=x;grp.add(dm);}
    intake(grp,x,it.y,it.z,it.w,it.h,mat,blk,it.round!==false);
    if(it.split){const sp=finShape(it.split,.03,dk);sp.position.x=x-sd*(it.w+.1);grp.add(sp);}}
  if(p.spine)grp.add(new THREE.Mesh(sloft(p.spine,18),lt));
  const piv=[];
  for(const sd of[-1,1]){
    if(p.wing){const w=p.wing,wi=planform(w.pts,w.th||.12,false,wingM);wi.scale.x=sd;wi.position.set(0,w.y||0,0);wi.rotation.z=sd*(w.dih||0);grp.add(wi);
      if(w.nav)navLight(sd<0?0xff2a1a:0x22ff55,sd*w.nav[0],(w.y||0)+w.nav[0]*Math.sin(w.dih||0),w.nav[1],grp);
      if(w.fence)for(const f of w.fence){const fe=finShape([[f[1],0],[f[1]+f[2],.18],[f[1]+f[2]+.15,0]],.02,dk,false);fe.position.set(sd*f[0],(w.y||0)+f[0]*Math.sin(w.dih||0)+.03,0);grp.add(fe);}}
    if(p.glove){const gl=planform(p.glove.pts,p.glove.th||.14,false,mat);gl.scale.x=sd;gl.position.y=p.glove.y||0;grp.add(gl);}
    if(p.tail){const t=p.tail,tp=planform(t.pts,t.th||.07,false,mat);tp.scale.x=sd;tp.position.set(0,t.y||0,0);tp.rotation.z=sd*(t.dih||0);grp.add(tp);}
    if(p.canard){const t=p.canard,tp=planform(t.pts,t.th||.06,false,mat);tp.scale.x=sd;tp.position.set(0,t.y||0,0);tp.rotation.z=sd*(t.dih||0);grp.add(tp);}}
  if(p.swing){const s=p.swing;grp.userData.wings=[];grp.userData.wingBase=s.base;
    for(const sd of[-1,1]){const pv=new THREE.Group();pv.position.set(sd*s.piv[0],s.piv[1],s.piv[2]);grp.add(pv);piv.push(pv);
      const w=planform(s.pts,s.th||.11,false,wingM);w.scale.x=sd;pv.add(w);
      if(s.nav)navLight(sd<0?0xff2a1a:0x22ff55,sd*s.nav[0],0,s.nav[1],pv);grp.userData.wings.push({g:pv,sd});
      const pc=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.18,18),dk);pc.position.set(sd*s.piv[0],s.piv[1],s.piv[2]);grp.add(pc);}}
  for(const f of p.fins||[]){const xs=f.x?[-f.x,f.x]:[0];for(const x of xs){const fn=finShape(f.pts,f.th||.12,mat);fn.position.x=x;if(f.cant)fn.rotation.z=(x<0?1:-1)*f.cant;if(f.y)fn.position.y=f.y;grp.add(fn);}}
  for(const f of p.ventral||[]){const xs=f.x?[-f.x,f.x]:[0];for(const x of xs){const fn=finShape(f.pts,f.th||.06,dk);fn.position.x=x;if(f.cant)fn.rotation.z=(x<0?-1:1)*f.cant;grp.add(fn);}}
  for(const n of p.nozzles||[])nozzle(grp,n[0],n[1],n[2],n[3],n[4],n[5],met,dk);
  const ab=new THREE.Group();grp.add(ab);grp.userData.ab=ab;
  if(p.ab)for(const n of p.nozzles||[]){const pl=abPlume(p.ab*(n[3]/.5),n[4]*.95);pl.position.set(n[0],n[1],n[2]+n[5]/2);ab.add(pl);}
  for(const c of p.canopy||[])canopy(grp,c[5]||0x557080,c[0],c[1],c[2],c[3],c[4],dk);
  if(p.extra)p.extra(grp,M);
  if(p.st)tipPylons(grp,p.st,SKIN(p.pyl||0x7b858a),p.wy||(()=>-.3),p.tipX||0);
  return bake(grp,[ab,...piv]);}

/* ------------------------------------------------------------------------------------------------------------------
   3. menu icon (head-on view) generated from a few numbers
   ------------------------------------------------------------------------------------------------------------------ */
// f: {hw half-span, y1 top of fin, fus [rx,ry,y], wing [y at root, y at tip, root x], fins [[x, y0, y1, cant]], tail [x tip, y], eng [[x,y,r]], can [y, rx, ry], tank}
function fvMake(f){return{hw:f.hw,y1:f.y1,span:f.span,d:()=>{let s='';
  for(const fn of f.fins||[[0,.5,f.y1]]){const [x,y0,y1,c=0]=fn,tx=x+c*(y1-y0);const P=[[x-.1,y0],[tx-.05,y1],[tx+.05,y1],[x+.1,y0]];s+=x?bth(P.map(([a,b])=>[-a,b]),'sk-body'):one(P,'sk-body');}
  if(f.tail){const [tx,ty,r=.6]=f.tail;s+=bth([[-r,ty+.06],[-tx,ty+.08],[-tx,ty-.04],[-r,ty-.1]],'sk-wing');}
  const [wy0,wy1,wr=.6]=f.wing;s+=bth([[-wr,wy0+.06],[-f.hw+.25,wy1+.04],[-f.hw+.25,wy1-.08],[-wr,wy0-.16]],'sk-wing');
  for(const [x,y] of f.tips||[])s+=bth([[-x+.07,y+.08],[-x-.07,y+.08],[-x-.07,y-.08],[-x+.07,y-.08]],'sk-body');
  const [rx,ry,fy=0]=f.fus;s+=ell(0,fy,rx,ry,'sk-body');
  for(const [x,y,r] of f.eng||[]){s+=ell(x,y,r,r*(f.engSy||1),'sk-dark');if(x)s+=ell(-x,y,r,r*(f.engSy||1),'sk-dark');}
  if(f.nose)s+=ell(0,f.nose[0],f.nose[1],f.nose[1],'sk-dark')+(f.nose[2]?ell(0,f.nose[0],f.nose[2],f.nose[2],'sk-body'):'');
  const [cy,cx,cr]=f.can;s+=ell(0,cy,cx,cr,'sk-can');return s;}};}

/* ------------------------------------------------------------------------------------------------------------------
   4. new air-to-air missiles (cloned from the closest existing round, motor recomputed from mass / burn / acceleration)
   ------------------------------------------------------------------------------------------------------------------ */
const IRN=new Set();
function aam(k,base,over,shape,dia,sn,name,ru){if(MSL[k])return;const d=Object.assign({},MSL[base],over);delete d.ph;delete d.apn;
  if(over.apn)d.apn=1;
  const S=Math.PI*dia*dia/4,dv=d.acc*d.burn,mbo=d.mass*Math.exp(-dv/2350),mp=d.mass-mbo,I=mp*2350,tb=d.burn;
  d.ph={S,dia,m0:d.mass,mp,mbo,tb,ts:0,gap:0,Tb:I/tb,Ts:0,mdB:mp/tb,mdS:0,cd0:2.38*d.cd*mbo/S,cnMax:.004*mbo/S*(d.cnK||1)};d.ph.cna=d.ph.cnMax/.38;d.burnT=tb;
  if(d.trk==null)d.trk=d.seek==='IR'?.6:.5;
  if(d.rcs==null)d.rcs=+Math.max(.02,Math.min(.25,.015+d.mass/3500)).toFixed(3);if(d.irsB==null)d.irsB=+Math.max(.4,Math.min(2.4,.4+d.mass/400)).toFixed(2);if(d.irsC==null)d.irsC=.03;
  MSL[k]=d;SHAPE[k]=shape;MDIA[k]=dia;if(!MSL_KEYS.includes(k))MSL_KEYS.push(k);SN[k]=sn;WNAME[k]=name;if(ru)try{RU_WPN[k]=ru;}catch(e){}
  if(d.seek==='IR')IRN.add(k);}
function addAAMs(){
  // AIM-4 Falcon family (F-106A, and the Swedish Rb 27 / Rb 28 licence rounds on the J 35F): small, no proximity fuze (contact only), poor manoeuvre
  aam('AIM-4F','AIM-7E',{seek:'SARH',ecc:.08,trk:.4,burn:4,acc:150,mass:68,cd:6.8e-5,maxG:12,gimbal:40*D,fuse:0,contact:1,life:30,N:3,res:.42,rmin:1200,aiR:9000,aiOff:15*D},
    {L:2.18,R:.084,f:[[.2,.5,.6]]},.168,'4F','Super Falcon · SARH');
  aam('AIM-4G','AIM-9E',{seek:'IR',trk:.3,ccm:0,burn:4,acc:150,mass:66,cd:7e-5,maxG:12,gimbal:30*D,fuse:0,contact:1,life:30,N:3,res:.38,rmin:1000,irR:8000,front:.05,aiR:7000,aiOff:12*D},
    {L:2.06,R:.084,f:[[.2,.5,.6]]},.168,'4G','Super Falcon · IR');
  aam('Rb 27','AIM-4F',{contact:0,fuse:9,mass:119,acc:140,burn:5,life:38,aiR:11000},{L:2.13,R:.084,f:[[.2,.5,.6]]},.168,'R27','HM-55S Falcon · SARH');
  aam('Rb 28','AIM-4G',{contact:0,fuse:7,mass:64,irR:8500},{L:1.98,R:.084,f:[[.2,.5,.6]]},.168,'R28','HM-58 Falcon · IR');
  // licence Sidewinders: Rb 24 (AIM-9B), Rb 24J (AIM-9J), Rb 74 (AIM-9L)
  aam('Rb 24','AIM-9B',{},SHAPE['AIM-9B'],.127,'R24','AIM-9B · Swedish');
  aam('Rb 24J','AIM-9J',{},SHAPE['AIM-9J'],.127,'R24J','AIM-9J · Swedish');
  aam('Rb 74','AIM-9L',{},SHAPE['AIM-9L'],.127,'R74','AIM-9L · Swedish');
  // de Havilland Firestreak (tail-chase IR, 136 kg) and Red Top (improved seeker, limited head-on, 154 kg)
  aam('Firestreak','AIM-9B',{mass:136,acc:120,burn:2.4,cd:8.6e-5,maxG:12,gimbal:20*D,fuse:8,life:22,irR:6500,front:.02,aiR:5500,aiOff:10*D,rmin:1100},
    {L:3.19,R:.11,f:[[.2,.38,.25],[1.6,.24,.2]]},.223,'FSTK','Firestreak · tail IR');
  aam('Red Top','AIM-9D',{mass:154,acc:125,burn:3,cd:7.8e-5,maxG:16,gimbal:30*D,fuse:9,life:28,irR:9500,front:.2,aiR:8500,aiOff:15*D,rmin:1000},
    {L:3.32,R:.11,f:[[.15,.6,.4],[2.4,.34,.15]]},.222,'RTOP','Red Top · IR, limited head-on');
  // Matra: R530 (SARH, 195 kg), Super 530F (SARH, 245 kg, Mach 4.5), Super 530D (CW doppler look-down, 270 kg), R550 Magic 1 / Magic 2
  aam('R530','AIM-7E',{mass:195,acc:115,burn:2.7,cd:5.8e-5,maxG:14,gimbal:40*D,fuse:12,life:36,ecc:.08,res:.4,rmin:1500,aiR:12000},
    {L:3.28,R:.131,f:[[.2,1.1,.55],[2.0,.5,.25]]},.263,'530','Matra R530 · SARH');
  aam('Super 530F','AIM-7F',{mass:245,acc:150,burn:6,cd:4.6e-5,maxG:25,gimbal:55*D,ecc:.25,res:.62,rmin:1600,aiR:21000,loft:.3},
    {L:3.54,R:.131,f:[[.2,.64,.6]]},.263,'530F','Super 530F · SARH');
  aam('Super 530D','AIM-7F',{hoj:1,mass:270,acc:155,burn:6.5,cd:4.4e-5,maxG:27,gimbal:60*D,ecc:.45,res:.7,rmin:1500,aiR:26000,loft:.35,apn:1},
    {L:3.8,R:.131,f:[[.2,.64,.6]]},.263,'530D','Super 530D · SARH look-down');
  aam('Magic 1','AIM-9J',{mass:89,acc:155,burn:2,trk:.55,gimbal:40*D,maxG:30,irR:8000,front:.1,aiR:6500,aiOff:25*D,rmin:300},
    {L:2.72,R:.079,f:[[.18,.45,.25],[2.35,.4,.12],[2.5,.26,.08]]},.157,'MAG1','R550 Magic 1 · IR');
  aam('Magic 2','AIM-9L',{mass:89,acc:155,burn:2.2,trk:.8,ccm:.2,gimbal:50*D,maxG:35,irR:12000,front:.45,aiR:9500,aiOff:30*D,rmin:300},
    {L:2.75,R:.079,f:[[.18,.45,.25],[2.35,.4,.12],[2.5,.26,.08]]},.157,'MAG2','R550 Magic 2 · all-aspect IR');
  // Selenia Aspide (Italian Sparrow derivative, monopulse) and its Chinese copy PL-11; PL-5E, PL-8 (Python 3), PL-12 (active radar)
  aam('Aspide','AIM-7F',{mass:220,ecc:.35,res:.66,aiR:23000,acc:125},SHAPE['AIM-7F'],.203,'ASP','Aspide 1A · monopulse SARH');
  aam('PL-11','Aspide',{},SHAPE['AIM-7F'],.203,'PL11','PL-11 · SARH');
  aam('PL-5E','AIM-9P',{mass:83,irR:9500,front:.25,gimbal:40*D},{L:2.89,R:.064,f:[[.2,.45,.28],[2.5,.32,.12]]},.127,'PL5','PL-5E · IR');
  aam('PL-8','AIM-9L',{mass:115,trk:.8,ccm:.25,gimbal:45*D,maxG:35,irR:13000,front:.45,aiR:11000,aiOff:30*D},{L:2.99,R:.08,f:[[.25,.35,.22],[2.6,.64,.4]]},.16,'PL8','PL-8 · all-aspect IR');
  aam('PL-12','R-77',{mass:180,cd:4e-5,aiR:30000},{L:3.85,R:.1,f:[[.15,.62,.3],[2.1,.28,.4]]},.203,'PL12','PL-12 · active radar');
  MODERN_ONLY.add('PL-12');
  // R-55: the MiG-19PM's Grushin beam rider re-engineered as a SARH-free IR round (here only used by the MiG-19P menu as an option, R-3S is the norm)
}

/* ------------------------------------------------------------------------------------------------------------------
   5. new air-to-ground stores (cloned from the closest existing entry)
   ------------------------------------------------------------------------------------------------------------------ */
function ag(k,base,over,sn,name){if(AGW[k]||!AGW[base])return;AGW[k]=Object.assign({},AGW[base],over||{});SN[k]=sn;STORE_NAME[k]=name;}
function addAGs(){
  ag('AS-37 Martel','AGM-45A',{mass:550,L:4.18,R:.2,dv:440,burn:3,maxG:12,dmg:300,soft:24,hard:12,r0:30,r1:1.6,cone:30},'MRTL','AS-37 Martel · anti-radiation');
  ag('AS-30L','AGM-65E',{mass:520,L:3.65,R:.17,dmg:300,soft:30,hard:10,dv:450,burn:2,range:11000,lockR:11000},'AS30','AS-30L · laser');
  ag('AM39 Exocet','Kh-35U',{mass:655,L:4.7,R:.175,range:50000,dv:280,burn:150},'EXO','AM39 Exocet · anti-ship');
  ag('Rb 75','AGM-65A',{},'R75','Rb 75 (AGM-65A) · TV');
  ag('Rb 04E','Kh-35U',{mass:616,L:4.45,R:.25,range:32000,dv:250,burn:40},'R04','Rb 04E · anti-ship, active radar');
  ag('Rb 15F','Kh-35U',{mass:600,L:4.35,R:.25,range:70000},'R15','Rb 15F · anti-ship');
  ag('m/71','Mk-82',{mass:120,L:1.95,R:.13,soft:30,hard:5},'M71','Bomb m/71 · 120 kg');
  ag('BL755','Mk-20',{mass:264,L:2.45,R:.21},'BL755','BL755 · cluster');
  ag('Belouga','Mk-20',{mass:305,L:3.3,R:.18,pat:150},'BLG','BLG-66 Belouga · cluster');
  ag('SAMP 250','Mk-82',{mass:250,L:2.98,R:.163},'S250','SAMP 250 kg bomb');
  ag('SAMP 400','Mk-83',{mass:400,L:3.6,R:.21},'S400','SAMP 400 kg bomb');
  ag('Matra F1','LAU-10',{cap:36,rk:'SNEB',mass:340,L:2.7,R:.24},'SNEB','Matra F1 · 36 SNEB 68 mm');
  ag('ARAK 135','LAU-10',{cap:6,rk:'ARAK',mass:250,L:2.4,R:.25},'ARAK','ARAK 70 · 6× 135 mm');
  ag('UB-16','B-8M1',{cap:16,rk:'S-5',mass:140,L:1.8,R:.19},'S-5','UB-16-57 · 16 S-5');
  ag('UB-32','B-8M1',{cap:32,rk:'S-5',mass:255,L:2.1,R:.24},'S-5','UB-32 · 32 S-5');
  ag('ORO-57K','B-8M1',{cap:8,rk:'S-5',mass:60,L:1.6,R:.13},'S-5','ORO-57K · 8 S-5');
  ag('S-24B','S-25O',{mass:235,L:2.33,R:.12},'S24','S-24B · 240 mm rocket');
  ag('Kh-25ML','AGM-65E',{mass:299,L:3.7,R:.138,dmg:200,soft:20,hard:6,range:10000,lockR:10000},'Kh25','Kh-25ML · laser');
  ag('Kh-58U','AGM-88B',{mass:640,L:4.8,R:.19,dv:600,dmg:300,soft:30,hard:14},'Kh58','Kh-58U · anti-radiation');
  ag('YJ-82','Kh-35U',{mass:715,L:5.81,R:.18,range:42000},'YJ82','YJ-82 (C-801K) · anti-ship');
  ag('KD-88','Kh-29TD',{mass:600,L:4.78,R:.18,range:40000},'KD88','KD-88 · TV');
  ag('LS-500J','GBU-12',{mass:500,L:3.9,R:.19,soft:60,hard:16},'LS500','LS-500J · laser-guided');
  if(!RKT['SNEB'])RKT['SNEB']=Object.assign({},RKT['S-8'],{m:6.2,dv:560,soft:5,range:3500});
  if(!RKT['ARAK'])RKT['ARAK']=Object.assign({},RKT['S-13']||RKT['ZUNI'],{m:41});
  if(!RKT['S-5'])RKT['S-5']=Object.assign({},RKT['S-8'],{m:3.9,dv:620,soft:3.5,range:3000});
}

W.CW_HELP={clt,cdm:cdmRow,mkJet,fvMake,tipPylons,addAAMs,addAGs,IRN};
})();
