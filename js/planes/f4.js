"use strict";
/* =====================================================================================================================
   F-4E Phantom II — everything that belongs to this jet family, split out of game.js (v258).
   Loaded BEFORE game.js (after js/planes/registry.js). Nothing here runs against game.js state at load time:
     * top-level declarations below are pure data (station layouts, store lists) or functions (model builder, cockpit/MFD code);
     * `tables` are thunks. game.js calls PLANES.apply('<TABLE>',<TABLE>) right after it declares each table, which merges
       these entries in at the same point the old inline literal used to be evaluated;
     * `hooks` are the one-off statements that used to sit inline in game.js (variants, cockpit builders, HUD/MFD patches).
       game.js calls PLANES.run('f4','<tag>') at the exact spot each one was cut from, so execution order is unchanged.
   Type ids in this file: F-4E
   ===================================================================================================================== */
const F4ST={1:[-4.55,-.28,1.7],2:[-2.55,-.74,.7],3:[-.7,-.98,-2.3],4:[-.7,-.98,1.6],C:[0,-1.2,.6],6:[.7,-.98,1.6],7:[.7,-.98,-2.3],8:[2.55,-.74,.7],9:[4.55,-.28,1.7]};
function makeF4(){
  // F-4E Phantom II: 19.2 m long, 11.7 m span, 49.2 m² wing swept 45°, outer panels cranked up 12°, stabilators drooped 23°, big square-cut intakes with
  // boundary-layer splitters, tandem cockpit under two canopies, long drooping radome over the M61A1 nose, twin J79 nozzles, fin with a slab-sided rudder
  const grp=new THREE.Group(),mat=SKIN(0x7a8272),dk=SKIN(0x5f675a),lt=SKIN(0x949c8c),blk=SKIN(0x1c1f22,10),rad=SKIN(0x8e9486,20),met=SKIN(0x5a5550,60);
  grp.add(new THREE.Mesh(sloft([[-9.6,.02,.0,.02,2],[-9.2,.2,-.03,.2,2],[-8.3,.42,-.02,.42,2.1],[-7.0,.6,.02,.6,2.2],[-5.6,.72,.08,.72,2.4],[-4.3,.84,.1,.8,2.6],
    [-2.5,.98,.08,.84,3],[-.5,1.02,.04,.82,3.2],[2,.98,0,.78,3.2],[4.5,.94,-.05,.72,3],[6.8,.96,-.1,.66,2.6],[8.6,.9,-.1,.6,2.2]]),mat));
  grp.add(new THREE.Mesh(loft([[-9.62,.022,.0,.022,2],[-9.2,.205,-.03,.205,2],[-8.3,.425,-.02,.425,2.1],[-7.5,.5,0,.5,2.15]],40,false,false),rad));
  rim(grp,.5,.02,dk,0,0,-7.5);
  rod(grp,[0,.06,-9.55],[0,.06,-10.5],.025,met,1,[0,1,0],8);ball(grp,.04,met,0,.06,-10.5);// pitot boom
  pod(grp,.7,.07,dk,0,-.36,-8.2,1,1);// M61A1 muzzle fairing
  // intakes: square-cut lips with the stand-off splitter plate and a boundary-layer bleed gap
  for(const sd of[-1,1]){const it=new THREE.Mesh(sloft([[-4.4,.4,-.08,.64,6],[-2.6,.44,-.1,.66,5],[0,.46,-.1,.64,4],[2.4,.36,-.1,.56,3]],28,false,true),mat);it.position.x=sd*1.22;grp.add(it);
    intake(grp,sd*1.22,-.08,-4.42,.4,.62,mat,blk,false);
    const sp=finShape([[-4.5,-.62],[-4.5,.62],[-3.0,.6],[-3.0,-.6]],.03,dk);sp.position.x=sd*.78;grp.add(sp);
    nozzle(grp,sd*.58,-.08,9.2,.5,.44,1.2,met,dk);
    // stabilator, drooped 23 degrees
    const sg=new THREE.Group();sg.position.set(sd*.82,-.12,0);sg.rotation.z=-sd*.4;grp.add(sg);
    const st=planform([[0,6.1],[2.5,8.2],[2.5,9.05],[0,9.1]],.1,false,mat);st.scale.x=sd;sg.add(st);
    // wing: inner panel flat, outer panel cranked up 12 degrees at the fold
    const wi=planform([[.9,-2.0],[3.6,.7],[3.6,4.7],[.9,5.4]],.15,false,mat);wi.scale.x=sd;wi.position.y=-.34;grp.add(wi);
    const wp=new THREE.Group();wp.position.set(sd*3.6,-.34,0);wp.rotation.z=sd*.21;grp.add(wp);
    const wo=planform([[0,.7],[2.25,2.95],[2.25,4.65],[0,4.7]],.1,false,mat);wo.scale.x=sd;wp.add(wo);
    rod(wp,[sd*.3,0,3.3],[sd*2.0,0,3.5],.09,dk,.5);navLight(sd<0?0xff2a1a:0x22ff55,sd*2.25,0,3.8,wp);}
  // fin and its slab rudder, dorsal spine fairing, tail hook fairing
  grp.add(finShape([[2.6,.66],[6.0,3.1],[7.6,3.1],[8.4,.6]],.14,mat));
  pod(grp,1.4,.1,dk,0,3.15,7.0);
  pod(grp,7.5,.3,mat,0,.82,2.2,1,.5,14);
  pod(grp,1.8,.14,dk,0,-.45,9.3);
  // tandem canopies: pilot in front, WSO behind and slightly higher
  canopy(grp,0x6a7880,.46,.46,1.25,.74,-5.5,dk);
  canopy(grp,0x6a7880,.46,.52,1.5,.78,-3.5,dk);
  const ab=new THREE.Group();[-.58,.58].forEach(x=>{const c=abPlume(5.2,.44);c.position.set(x,-.08,9.9);ab.add(c);});grp.add(ab);grp.userData.ab=ab;
  pylons(grp,F4ST,['3','4','6','7'],SKIN(0x6e7668),x=>Math.abs(x)<1?-.76:Math.abs(x)<3?-.5:-.34);
  return bake(grp,[ab]);}
// F-15C HUD (AN/AVQ-20 style, after T.O. 1F-15C-34-1-1 A/A symbology): heading scale across the top, "W" waterline at the
// boresight, velocity vector, 5° pitch ladder, airspeed scale on the left (rising downward) with the AOA scale inside it,
// altitude scale on the right (rising upward), bank scale at the bottom, Mach / G / weapon status lower left, steering or
// target data lower right. SYM REJ 1 drops the bank scale and nav block, REJ 2 also the AOA scale and heading caret box.

// F-4E: no HUD. The pilot looks through the ASG-26 lead-computing optical sight (LCOSS): a floating reticle with a 100 mil ring. In gun mode the reticle is
// displaced by the gyro (own turn rate) and a range from the radar lock, or a fixed 900 m when there is none; in missile modes it is a fixed cross.
// Beside it sit the AoA indexer (chevrons / donut, 19.2 units on speed) and a DSCG-style repeat of radar range and closure.
function drawPhantomSight(P,fs,lh){
  const bs=hb(0,0),ppd=KPX*D2R,RED='#ff5a4a',L=radar.mode==='STT'?radar.lock:null,w=game.wsel,wd=MSL[w],gun=w==='GUN',lk=L&&!radar.noRng;
  const T=(s,a,e,al='left')=>{const p=hb(a,e);if(p)txt(s,p.x,p.y,al);return p;};
  const dist=L?L.pos.distanceTo(P.pos):0;let vc=0;if(L){const los=L.pos.clone().sub(P.pos).normalize();vc=P.vel.dot(los)-L.vel.dot(los);}
  const R=lk?clamp(dist,150,1800):900,sp=gun?proj(gunFun(P,R)):bs;
  if(sp){hx.beginPath();hx.arc(sp.x,sp.y,2.2,0,7);hx.fill();circ(sp.x,sp.y,ppd*2.86);
    for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,c=Math.cos(a),s2=Math.sin(a);line(sp.x+c*ppd*2.86,sp.y+s2*ppd*2.86,sp.x+c*(ppd*2.86+7),sp.y+s2*(ppd*2.86+7));}
    if(!gun){line(sp.x-ppd*.9,sp.y,sp.x-ppd*.3,sp.y);line(sp.x+ppd*.3,sp.y,sp.x+ppd*.9,sp.y);line(sp.x,sp.y-ppd*.9,sp.x,sp.y-ppd*.3);line(sp.x,sp.y+ppd*.3,sp.x,sp.y+ppd*.9);}
    if(gun&&lk){hx.lineWidth=3;hx.beginPath();hx.arc(sp.x,sp.y,ppd*2.86-6,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(dist/1800,0,1));hx.stroke();hx.lineWidth=1.4;}}
  // AoA indexer: units run about 1.25x the geometric angle; on speed is 19.2, fast edge 17.4, slow edge 20.6
  if(view!=='cockpit'&&P.ac.pit==='phantom'){const u=P.alpha*R2D*1.25,x=-10.2,y0=2.6,ax=hb(x,y0),bx=hb(x,y0-2.2),cx=hb(x,y0-4.4);
    const fast=u<17.4&&P.pos.y>5,slow=u>20.6,on=u>=17.4&&u<=20.6,dot=(q,lit,col)=>{if(!q)return;hx.save();hx.fillStyle=hx.strokeStyle=col;hx.globalAlpha*=lit?1:.18;hx.beginPath();return;};
    const chev=(q,up,lit,col)=>{if(!q)return;hx.save();hx.strokeStyle=hx.fillStyle=col;hx.globalAlpha*=lit?1:.15;hx.lineWidth=3;hx.beginPath();const d=up?1:-1;
      hx.moveTo(q.x-12,q.y+d*7);hx.lineTo(q.x,q.y-d*7);hx.lineTo(q.x+12,q.y+d*7);hx.stroke();hx.restore();};
    chev(ax,false,slow,RED);                                                          // top, point down: too slow, lower the nose
    if(bx){hx.save();hx.strokeStyle='#59ff9f';hx.lineWidth=3;hx.globalAlpha*=on?1:.15;circ(bx.x,bx.y,8);hx.restore();}
    chev(cx,true,fast&&P.alpha>0,'#ffbf47');                                          // bottom, point up: fast
    if(ax)txt(u.toFixed(1),ax.x+18,bx?bx.y:ax.y+30,'left');}
  // weapon line and DSCG repeat
  T((gun?P.ac.gun.name:SN[w]||w)+' '+(gun?P.gun.ammo:P.count(w))+(game.arm?'':'  SAFE'),0,-8.4,'center');
  if(L){T(radar.hoj?'HOJ':RS(P,dist)+'  '+(vc>=0?'-':'+')+U.vc(P,Math.abs(vc))+(P.ac.units==='met'?' KMH':' KT'),0,-9.6,'center');
    if(!gun&&wd&&wd.seek!=='IR'&&!radar.noRng){const d=dlzGet(w,L);if(dist<d.rmin)cue('BREAK X');else if(dist<=d.rmax&&(dist<d.rne||blink))cue('IN RNG');}
    if(gun&&lk&&dist<900)cue('SHOOT');}
  if(wd&&wd.seek==='IR'&&game.arm&&irTarget(w)){const q=bs;if(q)circ(q.x,q.y,ppd*1.1);}
  if(P.ac.pit==='phantom'&&P.alpha*R2D*1.25>23&&blink)T('STICK SHAKER',0,5.2,'center');}
// DSCG front scope: a green B-scope (azimuth across, range up) repeating the APQ-120 picture; same geometry as the F-16 FCR so clicks map the same way
function drawPhScope(P){const c=phScopeC.getContext('2d'),S=360,FB_=P.ac.pit==='fishbed',col=FB_?'#ffd84a':'#8dffb4',x0=62,x1=298,y0=58,y1=298;
  c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle=(FB_?`rgb(${8+Math.round((1-sys.fcr.con)*14)},${6+Math.round((1-sys.fcr.con)*10)},0)`:`rgb(1,${6+Math.round((1-sys.fcr.con)*14)},4)`);c.fillRect(0,0,S,S);
  if(!P||!P.alive)return;
  c.textBaseline='middle';c.textAlign='center';c.font='700 15px "B612 Mono",monospace';
  if(!radar.on()){if(radar.power!=='OFF'){c.fillStyle=col;c.globalAlpha=.55;c.fillText(radar.power==='ON'?'WARM-UP '+Math.ceil(radar.warm):'STBY',S/2,S/2);c.globalAlpha=1;}return;}
  const gim=radar.gimbal(),X=a=>x0+(a*R2D+60)/120*(x1-x0),rng=radar.rngM,Y=d=>y1-clamp(d/rng,0,1)*(y1-y0),now=performance.now()/1000,stt=radar.mode==='STT';
  c.strokeStyle=(FB_?'rgba(255,216,74,.3)':'rgba(141,255,180,.3)');c.lineWidth=1;c.fillStyle=col;c.strokeRect(x0,y0,x1-x0,y1-y0);
  for(let i=1;i<4;i++){const y=y0+(y1-y0)*i/4;c.beginPath();c.moveTo(x0,y);c.lineTo(x1,y);c.stroke();}
  for(let a=-30;a<=30;a+=30){const x=X(a*D2R);c.beginPath();c.moveTo(x,y0);c.lineTo(x,y1);c.stroke();}
  c.textAlign='left';c.font='700 12px "B612 Mono",monospace';for(let i=1;i<=4;i++)c.fillText(String(Math.round(rng/(P.ac.units==='met'?1000:NM)*i/4)),x0+4,y1-(y1-y0)*i/4-7);
  if(radar.mode==='RWS'){const W=Math.min(radar.azs[radar.ai]*D2R,gim,9);c.setLineDash([4,6]);[radar.scanC-W,radar.scanC+W].forEach(a=>{const x=X(a);c.beginPath();c.moveTo(x,y0);c.lineTo(x,y1);c.stroke();});c.setLineDash([]);}
  // the APQ-120 is a pulse radar: raw video, ground clutter in look-down and smeared echoes, painted by the same routine as the other pulse sets
  if(P.ac.pulse&&radar.mode==='RWS'){c.strokeStyle=col;c.fillStyle=col;flPaint(c,(u,v)=>({x:X(u*flClutter.AZ),y:Y(v*rng)}),1.4,.9);c.globalAlpha=1;c.fillStyle=col;}
  for(const [j,tk] of radar.tracks){if(!j.alive||tk.d>rng)continue;const Lk=stt&&j===radar.lock;if(stt&&!Lk||tk.hoj)continue;
    const x=X(tk.az),y=Y(tk.d);c.globalAlpha=Lk?1:clamp(1-(now-tk.t)/10,.15,1);c.fillStyle=Lk?'#ffffff':col;
    {// raw video: a fat, smeared echo built from a few short range-sweep dashes that shimmer, the same for an aircraft and for a hard ground return
      const sd=Math.floor(now*6),k0=Math.floor(x*.37)+Math.floor(y*.53),st=clamp((tk.snr||5)/9,.55,1.2),a0=c.globalAlpha;c.strokeStyle=Lk?'#ffffff':col;c.lineCap='round';
      for(let q=-1;q<=1;q++){const h1=hash(k0+q*7,sd+q),h2=hash(k0*3+q,sd*5+q),w=(3.2+h1*3.4)*st,yy=y+q*2.6+(h2-.5)*1.6;c.globalAlpha=a0*(q?.62:.95)*(.75+.25*h2);c.lineWidth=2.6+st;
        c.beginPath();c.moveTo(x-w+(h2-.5)*3,yy);c.lineTo(x+w+(h1-.5)*3,yy);c.stroke();}c.globalAlpha=a0;c.lineCap='butt';}
    if(Lk){c.strokeStyle='#ffffff';c.lineWidth=1.5;c.strokeRect(x-12,y-12,24,24);c.textAlign='left';c.font='700 12px "B612 Mono",monospace';c.fillText(U.kalt(P,tk.alt),x+15,y+15);}}
  c.globalAlpha=1;
  for(const [j,s] of radar.strobes){if(Math.abs(s.az)>62*D2R)continue;const x=X(s.az);c.globalAlpha=clamp(1-(now-s.t)/4.5,.2,1);c.strokeStyle=c.fillStyle=col;c.lineWidth=1.4;c.setLineDash([2,3]);c.beginPath();c.moveTo(x,y1);c.lineTo(x,y0);c.stroke();c.setLineDash([]);}
  c.globalAlpha=1;c.fillStyle=col;c.strokeStyle=col;c.fillRect(X(radar.antAz)-1,y1+3,2,9);
  if(!stt){const cx=X(radar.cur.az),cy=y1-radar.cur.r*(y1-y0);c.lineWidth=2;c.beginPath();c.moveTo(cx-5,cy-10);c.lineTo(cx-5,cy+10);c.moveTo(cx+5,cy-10);c.lineTo(cx+5,cy+10);c.stroke();}
  c.textAlign='left';c.font='700 13px "B612 Mono",monospace';c.fillText(radar.mode,x0+6,y0+14);c.textAlign='right';c.fillText(Math.round(rng/(P.ac.units==='met'?1000:NM))+(P.ac.units==='met'?' KM':' NM'),x1-6,y0+14);
  if(stt&&radar.tgt()){const L=radar.tgt();c.textAlign='center';c.fillText(radar.hoj?'HOJ':U.rng(P,L.pos.distanceTo(P.pos))+(P.ac.units==='met'?' KM':' NM'),(x0+x1)/2,y0+14);}

  c.textAlign='left';c.fillStyle=col;c.fillText(String(Math.round(P.hdg)).padStart(3,'0')+'°',x0+6,y1-12);}
/* ---- put the page up when a HARM / Shrike is selected, put the old page back afterwards; F-4E follows the weapon too ---- */
function padAuto(){const P=player;if(!P||!P.alive)return;const w=game.wsel;if(P!==PHS.lastP){PHS.lastP=P;PHS.lastW=null;}if(w===PHS.lastW)return;PHS.lastW=w;
  const aw=AGW[w],isA=!!(aw&&aw.k==='arm'),isM=!!(aw&&aw.k==='agm');
  if(P.ac.pit==='hornet'){if(isA){if(!['L','R','C'].some(k=>!HDDI.menu[k]&&HDDI[k]==='HAD')){HDDI._prevR=HDDI.R;HDDI.R='HAD';HDDI.menu.R=0;}}
    else if(HDDI._prevR&&HDDI.R==='HAD'){HDDI.R=HDDI._prevR;HDDI._prevR=null;}}
  if(P.type==='F-4E')PHS.wpn=isM;}
/* ---- F-4E: the DSCG scope shows either the radar (RDR) or the weapon video (WPN: Maverick seeker, Shrike / HARM page) ---- */
function phWpnDraw(P){const c=phScopeC.getContext('2d'),S=360,col='#8dffb4',a=AGW[game.wsel];c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#000';c.fillRect(0,0,S,S);
  if(a&&a.k==='agm'){SNS.drawPage(c,S,'WPN',30);c.globalCompositeOperation='multiply';c.fillStyle='#38e878';c.fillRect(30,30,S-60,S-60);c.globalCompositeOperation='source-over';}
  else{c.font='700 15px "B612 Mono",monospace';c.fillStyle=col;c.textAlign='center';c.textBaseline='middle';c.fillText('NO WEAPON',S/2,S/2-12);c.font='700 12px "B612 Mono",monospace';c.fillText('SELECT AN AGM-65',S/2,S/2+14);}
  c.restore();}
function phChip(P){const c=phScopeC.getContext('2d');c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.font='700 13px "B612 Mono",monospace';c.textAlign='center';c.textBaseline='middle';
  [['RDR',122,!PHS.wpn],['WPN',182,PHS.wpn]].forEach(([t,x,on])=>{c.fillStyle=on?'#8dffb4':'rgba(0,0,0,.75)';c.fillRect(x,324,56,18);c.strokeStyle='#8dffb4';c.lineWidth=1;c.strokeRect(x+.5,324.5,55,17);c.fillStyle=on?'#000':'#8dffb4';c.fillText(t,x+28,333.5);});c.restore();}

PLANES.add('f4',{
 ids:["F-4E"],
 tables:{
  AC:()=>({
    // F-4E Phantom II: 2x J79-GE-17 (52.9 kN dry / 79.4 kN AB each, slow to spool, smoky), 49.2 m² wing swept 45°, slatted, no FBW (hydraulic boost, no
      // artificial stability, mechanical aileron-rudder interconnect, stick shaker and adverse yaw that bites past ~20 units of AoA), AN/APQ-120 pulse radar
      'F-4E':{name:'F-4E Phantom II',model:makeF4,st:F4ST,empty:13757,fuel:5880,tank:1090,ptb:1770,S:49.2,CLa:3.5,cd0:.0245,k:.15,mil:105800,ab:158800,spool:4.5,abLight:.9,smoky:.35,adv:.5,rio:true,wso:true,
        clt:[[-20,-.9],[-10,-.5],[0,.04],[5,.31],[10,.6],[15,.9],[20,1.17],[25,1.37],[30,1.42],[35,1.38],[40,1.25],[50,1.0],[60,.8],[90,0]],
        abM:[[0,1],[.5,1.195],[1,1.36],[1.5,1.495],[2,2.2091],[2.5,2.9092],[3,3.4474]],cdm:[[0,0],[.8,0],[.9,.007],[1,.027],[1.1,.038],[1.3,.038],[1.6,.0237],[2,.0214],[2.5,.0162],[3,.0131]],dW:19000,tkG:[5.5,6.5],dep:{a:27,rock:1.3,spin:3.4},
        ff:[.3,2.7,8.5],gLim:7.33,aoaLim:26,roll:3.9,fbw:false,noLimiter:true,rcs:6,irs:1.35,cockpit:'viper',pit:'phantom',eye:[5.15,1.4],units:'imp',
        radar:{name:'APQ-120',R0:27*NM,ranges:[10,20,40,80],unit:NM,ul:'NM',ecc:.1},irst:false,pulse:true,
        gun:{name:'M61A1',rate:100,v:1050,dmg:9,ammo:639,spread:.0024},rel:[1,9,2,8,3,7,4,6],keepJ:['1','9','3','4','6','7'],rwr:'4',spo:0,tankName:'Drop tank'}
  }),
  ENG_SUP:()=>({
    'F-4E Phantom II':.073
  }),
  FOE:()=>({
    'F-4E':'MiG-21'
  }),
  LOAD:()=>({
    cold:{
      'F-4E':{1:'AIM-9J',2:'TK',3:'AIM-7E-2',4:'AIM-7E-2',C:'PTB',6:'AIM-7E-2',7:'AIM-7E-2',8:'TK',9:'AIM-9J'}
    },
    modern:{
      'F-4E':{1:'AIM-9L',2:'TK',3:'AIM-7F',4:'AIM-7F',C:'PTB',6:'AIM-7F',7:'AIM-7F',8:'TK',9:'AIM-9L'}
    },
    guns:{
      'F-4E':{C:'PTB'}
    }
  }),
  CMS:()=>({
    cold:{
      'F-4E':[30,30]
    },
    modern:{
      'F-4E':[60,30]
    }
  }),
  ECM_FIT:()=>({
    'F-4E':{cold:{n:'ALQ-119(V)',jp:.7,dec:.5,kg:290,cd:.0012,warm:20},modern:{n:'ALQ-131(V)',jp:1,dec:.62,kg:300,cd:.0012,warm:20}}
  }),
  RWR_OF:()=>({
    'F-4E':'ALR-46'
  }),
  NCTR_ID:()=>({
    'F-4E':'F-4'
  }),
  STN:()=>({
    'F-4E':{1:F4W,2:['TK',...F4W],3:F4S,4:F4S,6:F4S,7:F4S,8:['TK',...F4W],9:F4W,C:['PTB']}
  }),
  ACROLE:()=>({
    'F-4E':'US · MULTIROLE'
  }),
  FV:()=>({
    'F-4E':{hw:6.1,y1:5,span:'11.71 m',d:()=>one([[-.12,.6],[-.06,4.9],[.06,4.9],[.12,.6]],'sk-body')+bth([[-1,-.05],[-3.75,-1.35],[-3.75,-1.47],[-1,-.25]],'sk-wing')+bth([[-1,-.25],[-3.7,-.28],[-3.7,-.42],[-1,-.52]],'sk-wing')+bth([[-3.7,-.28],[-5.85,.4],[-5.85,.28],[-3.7,-.42]],'sk-wing')+ell(0,.05,.88,.74,'sk-body')+bth([[-.7,.35],[-1.55,.35],[-1.55,-.7],[-.7,-.7]],'sk-body')+bth([[-.8,.25],[-1.45,.25],[-1.45,-.6],[-.8,-.6]],'sk-dark')+ell(0,.8,.42,.36,'sk-can')}
  }),
  CALLS:()=>({
    'F-4E':'GHOST'
  }),
  FLAPSW:()=>({
    'F-4E':'f4flap'
  }),
  STALL:()=>({
    'F-4E':{s:.25,twin:1}
  }),
  STRIKE_LOAD:()=>({
    'F-4E':{1:'AIM-9J',9:'AIM-9J',2:'LAU-10',8:'LAU-10',3:'AIM-7E-2',4:'AIM-7E-2',C:'PTB'}
  }),
  RACKS:()=>({
    'F-4E': {st:['2','8'],subs:{b:[-.32,.2,0],c:[.32,.2,0]},cats:[{t:['Mk-82'],n:3,rack:'TER'}]}
  }),
  ENGN:()=>({
    'F-4E':'2× J79-GE-17'
  }),
  CREW:()=>({
    'F-4E':'WSO'
  })
 },
 hooks:{
  /* game.js line 11656 */
  L11656(){
    {const _t=ARM.tick.bind(ARM);ARM.tick=function(dt){_t(dt);padAuto();};}
    {const _p=drawPhScope;drawPhScope=function(P){if(P&&P.type==='F-4E'){if(PHS.wpn)phWpnDraw(P);else _p(P);return;}return _p(P);};}
    {const _m=mfdClick;mfdClick=function(id,x,y){const P=player;
      if(id==='phscope'&&P&&P.type==='F-4E'){
        if(PHS.wpn){if(SNS.active())SNS.tms();sfx.click();return;}}
      return _m(id,x,y);};}
    addEventListener('keydown',e=>{if(e.code!=='KeyY'||!game.running||!$('#menu').hidden||e.repeat||e.ctrlKey||e.metaKey||e.altKey||!player||player.type!=='F-4E')return;
      PHS.wpn=!PHS.wpn;sfx.click();flash(PHS.wpn?'SCOPE · WEAPONS':'SCOPE · RADAR',800);});
    // 3-D lever on the scope housing is added where the F-4E cockpit is built (PHS_LEVER)
    {const kl=[...document.querySelectorAll('.keys div')].find(d=>/Pod \/ Maverick/.test(d.textContent));
      if(kl){const d=document.createElement('div');d.innerHTML='F-4E back scope: radar / weapons (Maverick, Shrike)<kbd>Y</kbd>';kl.after(d);}}
    /* ---- F-4E Shrike: no display in the Phantom, the seeker head only growls in the headset: pitch climbs as the radar comes onto the nose ---- */
    sfx.shrike=function(off,lk){if(!this.ctx)return;if(!this.shO){const x=this.ctx;this.shO=x.createOscillator();this.shO.type='sawtooth';this.shF=x.createBiquadFilter();this.shF.type='lowpass';this.shF.frequency.value=1800;this.shG=x.createGain();this.shG.gain.value=0;this.shO.connect(this.shF).connect(this.shG).connect(this.m);this.shO.start();}
      const t=this.now();if(off==null){this.shG.gain.setTargetAtTime(0,t,.03);return;}
      const on=lk||(((GND.t||0)*9)%1)<.6;this.shO.frequency.setTargetAtTime(380+900*Math.max(0,1-off/(14*D2R)),t,.02);this.shG.gain.setTargetAtTime(on?.09*SET.tone/75*(sys.au.thr||1):0,t,.01);};
    {const _t=ARM.tick.bind(ARM);ARM.tick=function(dt){_t(dt);const P=player,a=this.w();
      if(P&&P.alive&&P.type==='F-4E'&&a&&a.shrike&&!game.paused){let best=null;for(const e of this.list){const o=Math.hypot(e.az,e.el);if(!best||o<best.o)best={o,lk:e.lk};}
        if(best!==this._shB||!best){this._shB=best;}sfx.shrike(best?best.o:null,best&&best.o<2*D2R);if(best&&!this._shT){this._shT=1;flash('SHRIKE · TONE',700);}if(!best)this._shT=0;}
      else if(sfx.shG&&this._shOn){sfx.shrike(null);}this._shOn=!!(P&&P.type==='F-4E'&&a&&a.shrike);};}
  },
  /* game.js line 13524 */
  L13524(){
    /* ===== v205: F-4E optical sight (AN/ASG-26 lead-computing sight): a red reticle only. The pipper, the 50-mil ring with its four ticks and the
       range bar unwinding around the ring when the radar gives range; no target boxes, no text, no cues on the combiner. ===== */
    {const _ph=drawPhantomSight;drawPhantomSight=function(P,fs,lh){if(P.ac.pit!=='phantom')return _ph(P,fs,lh);
      const ppd=KPX*D2R,RED='#ff3a2a',L=radar.mode==='STT'?radar.lock:null,lk=L&&!radar.noRng,gun=game.wsel==='GUN',bs=hb(0,0);
      const dist=L?L.pos.distanceTo(P.pos):0,sp=gun?proj(gunFun(P,lk?clamp(dist,150,1800):900)):bs;if(!sp)return;
      hx.save();hx.strokeStyle=hx.fillStyle=RED;hx.shadowColor='rgba(255,60,30,.9)';hx.shadowBlur=9;hx.lineWidth=2.8;const R=ppd*2.86;
      hx.beginPath();hx.arc(sp.x,sp.y,3.6,0,7);hx.fill();circ(sp.x,sp.y,R);
      for(let i=0;i<4;i++){const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a);line(sp.x+c*R,sp.y+s*R,sp.x+c*(R+10),sp.y+s*(R+10));}
      if(lk&&dist<1800){hx.lineWidth=3;hx.beginPath();hx.arc(sp.x,sp.y,R-6,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(dist/1800,0,1));hx.stroke();}
      hx.restore();};}
  }
 }
});
