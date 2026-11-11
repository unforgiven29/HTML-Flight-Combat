"use strict";
/* =====================================================================================================================
   MiG-23ML — everything that belongs to this jet family, split out of game.js (v258).
   Loaded BEFORE game.js (after js/planes/registry.js). Nothing here runs against game.js state at load time:
     * top-level declarations below are pure data (station layouts, store lists) or functions (model builder, cockpit/MFD code);
     * `tables` are thunks. game.js calls PLANES.apply('<TABLE>',<TABLE>) right after it declares each table, which merges
       these entries in at the same point the old inline literal used to be evaluated;
     * `hooks` are the one-off statements that used to sit inline in game.js (variants, cockpit builders, HUD/MFD patches).
       game.js calls PLANES.run('mig23','<tag>') at the exact spot each one was cut from, so execution order is unchanged.
   Type ids in this file: MiG-23
   ===================================================================================================================== */
const MIG23ST={1:[-2.05,-.36,.2],2:[-.62,-1.02,-.7],3:[.62,-1.02,-.7],4:[2.05,-.36,.2],C:[0,-1.12,1.1]};
function makeMiG23(){
  // MiG-23ML 'Flogger-G': 16.7 m long, span 13.97 m at 16° / 7.78 m at 72°. Shoulder-mounted fixed gloves carry the pivots; the outer
  // panels swing 16° / 45° / 72°. Side intakes with splitter plates, long dorsal fillet into the tall fin, all-moving
  // stabilators, a ventral fin that folds for landing, TP-23M IRST blister under the nose, single R-35-300 nozzle.
  const grp=new THREE.Group(),mat=SKIN(0x8a9a86),dk=SKIN(0x6c7a68),lt=SKIN(0xa4b2a0),blk=SKIN(0x1c1f22,10),met=SKIN(0x5a5550,60),rad=SKIN(0xc8cec2,20);
  grp.add(new THREE.Mesh(sloft([[-8.25,.02,.05,.02,2],[-7.6,.21,.05,.21,2],[-6.8,.36,.07,.36,2],[-6.0,.45,.1,.46,2.1],[-5.2,.5,.16,.56,2.3],[-4.2,.55,.2,.62,2.6],
    [-2.5,.6,.2,.64,3],[0,.66,.16,.64,3.2],[2.5,.68,.12,.62,3.2],[5,.64,.1,.6,3],[6.8,.58,.08,.58,2.6],[8.0,.54,.05,.54,2.2]]),mat));
  grp.add(new THREE.Mesh(loft([[-8.27,.022,.05,.022,2],[-7.6,.215,.05,.215,2],[-6.8,.365,.07,.365,2],[-6.4,.41,.085,.41,2.05]],40,false,false),rad));
  rim(grp,.41,.02,dk,0,.085,-6.4);
  rod(grp,[0,.05,-8.2],[0,.05,-9.6],.025,met,1,[0,1,0],8);ball(grp,.04,met,0,.05,-9.6);
  // TP-23M IRST blister under the nose
  ball(grp,.16,SKIN(0x2a3438,90),0,-.4,-5.9,1,.8,2.2);
  // side intakes with rounded lips and splitter plates, ducts fairing into the fuselage
  for(const sd of[-1,1]){const it=new THREE.Mesh(sloft([[-4.35,.36,-.05,.52,6],[-3.0,.38,-.06,.54,6],[-.5,.36,-.06,.52,5],[1.8,.24,-.04,.42,3.5]],28,false,true),mat);
    it.position.x=sd*.92;grp.add(it);
    intake(grp,sd*.92,-.05,-4.38,.34,.5,mat,blk);
    const sp=finShape([[-4.75,-.55],[-4.75,.55],[-3.3,.5],[-3.3,-.5]],.03,dk);sp.position.x=sd*.54;grp.add(sp);
    // fixed glove (shoulder) with its pivot fairing
    const gl=planform([[.55,-4.4],[2.32,-.35],[2.32,1.75],[.55,2.3]],.14,false,mat);gl.scale.x=sd;gl.position.y=.22;grp.add(gl);
    const pv=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.16,20),dk);pv.position.set(sd*2.15,.22,.55);grp.add(pv);
    const cl=new THREE.Mesh(new THREE.TorusGeometry(.16,.03,8,24),dk);cl.rotation.x=Math.PI/2;cl.position.set(sd*2.15,.3,.55);grp.add(cl);
    // stabilators (anhedral)
    const st=planform([[.55,5.0],[2.85,6.95],[2.9,7.75],[.55,7.95]],.08,false,mat);st.scale.x=sd;st.position.y=.02;st.rotation.z=sd*.05;grp.add(st);}
  // outer wing panels on pivots: rotation set from the jet's sweep in sync()
  grp.userData.wings=[];const piv=[];
  for(const sd of[-1,1]){const pv=new THREE.Group();pv.position.set(sd*2.15,.21,.55);grp.add(pv);piv.push(pv);
    const w=planform([[0,-1.18],[4.85,.22],[4.85,1.42],[0,2.22]],.11,false,mat);w.scale.x=sd;pv.add(w);
    rod(pv,[sd*.6,0,1.65],[sd*4.4,0,1.65],.27,dk,.07);// flap
    navLight(sd<0?0xff2a1a:0x22ff55,sd*4.85,0,.8,pv);grp.userData.wings.push({g:pv,sd});}
  grp.add(finShape([[-1.6,.62],[1.6,.82],[4.9,3.55],[6.55,3.62],[7.5,.62]],.13,mat));
  pod(grp,1.4,.09,dk,0,3.6,5.8);// fin-cap antenna fairing
  grp.add(new THREE.Mesh(sloft([[-1.6,.02,.7,.02,2],[0,.22,.72,.1,2],[3.5,.2,.7,.1,2],[5.5,.06,.66,.05,2]],16),lt));
  grp.add(finShape([[5.2,-.55],[6.1,-1.5],[7.25,-1.5],[7.6,-.55]],.06,dk));
  // canopy: hinged hood, faired into the spine
  canopy(grp,0x557080,.44,.46,1.45,.66,-5.0,dk);
  nozzle(grp,0,0,8.4,.56,.5,.9,met,dk);
  for(const sd of[-1,1])pod(grp,.9,.25,dk,sd*.67,-.2,6.2,.12,1);
  const ab=abPlume(5.0,.5);ab.position.z=8.85;grp.add(ab);grp.userData.ab=ab;
  pylons(grp,MIG23ST,['C'],SKIN(0x76857a),x=>Math.abs(x)<1?-.62:.16);
  return bake(grp,[ab,...piv]);}

PLANES.add('mig23',{
 ids:["MiG-23"],
 tables:{
  AC:()=>({
    'MiG-23':{name:'MiG-23ML',model:makeMiG23,st:MIG23ST,empty:10200,fuel:3800,tank:640,S:35.5,CLa:4.0,cd0:.021,k:.12,mil:83800,ab:127500,spool:2.4,
        clt:[[-20,-.95],[-10,-.6],[0,.03],[5,.37],[10,.72],[15,1.02],[20,1.22],[25,1.3],[30,1.27],[35,1.2],[40,1.12],[50,.98],[60,.85],[90,0]],
        cdm:[[0,0],[.8,0],[.9,.006],[1,.026],[1.1,.034],[1.3,.032],[2,.028]],gHi:7,dW:14500,tkG:[5,7],dep:{a:29,rock:.8,spin:2.6},
        ff:[.25,2.3,7.2],gLim:8.5,aoaLim:24,roll:3.0,fbw:false,rcs:6,irs:1.2,ols:{tail:9000,head:3500,lrf:0,rot:1},cockpit:'fulcrum',pit:'flogger',units:'met',eye:[5.15,.95],
        radar:{name:'Sapfir-23ML',R0:62000,ranges:[10,15,30,60],unit:1000,ul:'KM',ecc:.2},irst:true,pulse:true,
        gun:{name:'GSh-23L',rate:57,v:715,dmg:12,ammo:200,spread:.0032},rel:[1,4,2,3],migRel:['2','3','1','4'],rwr:'23',spo:4,tankName:'PTB-800',
        swing:{a:[16,45,72],rate:5.5,S:[37.35,35.5,34.16],CLa:[5.0,4.0,2.9],cd0:[.024,.021,.0185],k:[.07,.12,.22],aoaLim:[22,24,24],gLim:[7.5,8.5,7.5],roll:[2.4,3.0,2.2],
          vne:[900,1250,1470],dep:[{a:27,rock:1.0,spin:2.8},{a:29,rock:.8,spin:2.6},{a:26,rock:.9,spin:2.4}],
          clt:[[-1,-.75,.05,.48,.9,1.2,1.32,1.25,1.12,1.05,1.0,.9,.8,0],
               [-.95,-.6,.03,.37,.72,1.02,1.22,1.3,1.27,1.2,1.12,.98,.85,0],
               [-.8,-.45,.02,.26,.52,.76,.96,1.08,1.14,1.12,1.06,.92,.8,0]],
          cdm:[[[0,0],[.7,0],[.8,.006],[.9,.03],[1,.06],[1.2,.07],[2,.065]],
               [[0,0],[.8,0],[.9,.006],[1,.026],[1.1,.034],[1.3,.032],[2,.028]],
               [[0,0],[.85,0],[.95,.004],[1,.016],[1.1,.021],[1.3,.019],[1.6,.015],[2,.013],[2.5,.0099],[3,.008]]]}}
  }),
  ENG_SUP:()=>({
    'MiG-23ML':.065
  }),
  FOE:()=>({
    'MiG-23':'F-16'
  }),
  LOAD:()=>({
    cold:{
      'MiG-23':{1:'R-24R',2:'R-60M',3:'R-60M',4:'R-24T',C:'PTB'}
    },
    modern:{
      'MiG-23':{1:'R-24R',2:'R-60M',3:'R-60M',4:'R-24R',C:'PTB'}
    },
    guns:{
      'MiG-23':{C:'PTB'}
    }
  }),
  CMS:()=>({
    cold:{
      'MiG-23':[30,30]
    },
    modern:{
      'MiG-23':[30,30]
    }
  }),
  RWR_OF:()=>({
    'MiG-23':'SPO-10'
  }),
  NCTR_ID:()=>({
    'MiG-23':'MIG-23'
  }),
  STN:()=>({
    'MiG-23':{1:['R-24R','R-24T','R-60M'],2:['R-60M'],3:['R-60M'],4:['R-24R','R-24T','R-60M'],C:['PTB']}
  }),
  ACROLE:()=>({
    'MiG-23':'USSR · SWING WING'
  }),
  FV:()=>({
    'MiG-23':{hw:5.4,y1:4.6,span:'13.97 m spread',d:()=>one([[-.1,.6],[-.05,4.5],[.05,4.5],[.1,.6]],'sk-body')+bth([[-.9,-.12],[-3.1,-.4],[-3.1,-.52],[-.9,-.38]],'sk-wing')+bth([[-.9,-.12],[-5,-.05],[-5,-.17],[-.9,-.45]],'sk-wing')+one([[-.05,-.9],[-.05,-1.4],[.05,-1.4],[.05,-.9]],'sk-body')+ell(0,.02,.85,.7,'sk-body')+ell(0,-.62,.7,.36,'sk-dark')+ell(0,.02,.52,.5,'sk-body')+ell(0,.68,.34,.3,'sk-can')}
  }),
  CALLS:()=>({
    'MiG-23':'FLOGGER'
  }),
  FLAPSW:()=>({
    'MiG-23':'fl23'
  }),
  STALL:()=>({
    'MiG-23':{s:.5,twin:0}
  }),
  STRIKE_LOAD:()=>({
    'MiG-23':{1:'B-8M1',4:'B-8M1',2:'FAB-250',3:'FAB-250',C:'PTB'}
  }),
  ENGN:()=>({
    'MiG-23':'R-35-300'
  }),
  IRSTN:()=>({
    'MiG-23':'TP-23M'
  })
 },
 hooks:{
  /* game.js line 12885 */
  L12885(){
    // ===== v197: MiG-23ML Sapfir-23ML indicator after the manual pictures: range scale on the left (scale number on top) with the X
    // launch-range mark and the target-range bar, antenna-elevation / height-difference scale on the right with its X, broken horizon line that
    // rolls and pitches, cross-shaped aiming mark, TP-23 field-of-view corner brackets, locking strobes; in a lock the strobes stay around the
    // target, a lead circle shows its angular movement, ТП when the IRST is the tracking sensor, "=" after a friendly IFF reply =====
    try{
    const _fs=drawFlogScope;const LR={az:0,el:0,t:0,la:0,le:0};
    drawFlogScope=function(c,S){const P=player;if(!P||P.ac.pit!=='flogger')return _fs(c,S);
      c.setTransform(1,0,0,1,0,0);c.fillStyle='#03100a';c.fillRect(0,0,S,S);if(!P.alive)return;
      const x0=56,x1=S-56,y0=S-40,y1=40,m=(u,v)=>({x:lerp(x0,x1,(u+1)/2),y:lerp(y0,y1,v)}),b=.25+.75*sys.mig.hdd,cx=(x0+x1)/2,cy=(y0+y1)/2,on=radar.on(),irst=radar.sensor==='IRST',ru=SET.hudlang!=='EN';
      c.save();c.strokeStyle=c.fillStyle='#62ffa8';c.shadowColor='rgba(98,255,168,.6)';c.shadowBlur=4;c.globalAlpha=b;c.lineWidth=2.4;c.lineCap='square';
      // raw video first (targets as blobs, clutter / noise speckle)
      c.save();c.beginPath();c.rect(x0,y1,x1-x0,y0-y1);c.clip();
      if(on&&radar.sensor==='RDR'&&radar.mode==='RWS'){flPaint(c,m,1.6,b);jamPaint(c,m,b);}
      if(irst&&radar.mode==='RWS'){irC(c,m,1.6,b,30*D2R,-30,30,false);irTracksC(c,m,b,30*D2R,-30,30,1.6);}
      c.restore();c.globalAlpha=b;c.lineWidth=2.4;
      // ---- left scale: range ----
      const LX=24,RX=S-24,sy0=y0+4,sy1=y1-4,sc=v=>lerp(sy0,sy1,v);
      const bracket=(x,d)=>{c.beginPath();c.moveTo(x+d*8,sy1);c.lineTo(x,sy1);c.lineTo(x,sy0);c.lineTo(x+d*8,sy0);c.stroke();for(let i=1;i<8;i++){const y=sc(i/8);c.beginPath();c.moveTo(x,y);c.lineTo(x+d*(i%2?6:9),y);c.stroke();}};
      bracket(LX,1);bracket(RX,-1);
      c.font='700 17px "B612 Mono",monospace';c.textBaseline='middle';c.textAlign='center';
      c.fillText(String(radar.ranges[radar.ri]),LX+6,sy1-14);c.fillText('15',RX-6,sy1-14);
      const X=(x,y)=>{c.beginPath();c.moveTo(x-7,y-7);c.lineTo(x+7,y+7);c.moveTo(x-7,y+7);c.lineTo(x+7,y-7);c.stroke();};
      const L=radar.mode==='STT'?radar.lock:null,w=game.wsel,wd=MSL[w];
      // X on the range scale: max launch range of the selected missile
      {const rr=wd&&(wd.aiR||wd.irR);if(rr)X(LX,sc(clamp(rr*1.4/radar.rngM,0,1)));}
      // X on the right scale: antenna elevation (±15°) while searching; bar = height difference to the locked target
      X(RX,sc(clamp(((radar.antEl||0)*R2D+15)/30,0,1)));
      if(L){const a=radar.ang(L.pos),y=sc(clamp(a.d/radar.rngM,0,1));c.fillRect(LX+2,y-2.5,20,5);if(L.ai&&L.ai.friend){c.fillRect(LX+26,y-6,10,2.5);c.fillRect(LX+26,y+3.5,10,2.5);}
        const dh=(L.pos.y-P.pos.y)/1000,yh=sc(clamp((dh+15)/30,0,1));c.fillRect(RX-22,yh-2.5,20,5);}
      // ---- horizon line: two segments with a gap, rolled and pitched ----
      {const bk=P.bank||0,pt=(P.pitch||0)*R2D,off=clamp(pt*2.4,-(cy-y1-10),(y0-cy-10));c.save();c.translate(cx,cy+off);c.rotate(-bk);
        c.beginPath();c.moveTo(-(x1-x0)*.36,0);c.lineTo(-(x1-x0)*.1,0);c.moveTo((x1-x0)*.1,0);c.lineTo((x1-x0)*.36,0);c.stroke();c.restore();}
      // ---- aiming cross (fixed) ----
      {const s=5;c.beginPath();c.rect(cx-s,cy-3*s,2*s,6*s);c.rect(cx-3*s,cy-s,6*s,2*s);c.globalAlpha=b*.9;c.stroke();c.globalAlpha=b;}
      // ---- TP-23 field-of-view brackets ----
      if(irst||sys.mig.wcs!=null&&MWCS[sys.mig.wcs]==='IR'){const bx0=x0+18,bx1=x1-18,by0=y1+22,by1=y0-22,k=12;c.lineWidth=3;
        [[bx0,by0,1,1],[bx1,by0,-1,1],[bx0,by1,1,-1],[bx1,by1,-1,-1]].forEach(([x,y,dx,dy])=>{c.beginPath();c.moveTo(x,y+dy*k);c.lineTo(x,y);c.lineTo(x+dx*k,y);c.stroke();});c.lineWidth=2.4;}
      // ---- search: locking strobes (two short vertical bars) and the antenna mark at the bottom ----
      if(radar.mode==='RWS'&&on){const p=m(radar.cur.az/(30*D2R),irst?((radar.cur.el||0)*R2D+30)/60:radar.cur.r);{const sv=c.globalAlpha;c.globalAlpha=sv*(performance.now()/1000<(radar.curMan||0)?.95:.45);c.lineWidth=1.6;[-6,6].forEach(d=>{c.beginPath();c.moveTo(p.x+d,p.y-10);c.lineTo(p.x+d,p.y+10);c.stroke();});c.globalAlpha=sv;}c.lineWidth=2.4;
        const an=m(radar.antAz/(30*D2R),0).x;c.beginPath();c.moveTo(an,y0+6);c.lineTo(an,y0+16);c.stroke();}
      // ---- lock: strobes around the target, lead circle from the line-of-sight rate ----
      if(L){const a=radar.ang(L.pos),p=m(clamp(a.az/(30*D2R),-1,1),clamp(a.d/radar.rngM,0,1)),now=performance.now()/1000;
        c.beginPath();c.arc(p.x,p.y,5,0,7);c.fill();c.lineWidth=4;[-11,11].forEach(d=>{c.beginPath();c.moveTo(p.x+d,p.y-10);c.lineTo(p.x+d,p.y+10);c.stroke();});c.lineWidth=2.4;
        const el=a.el!=null?a.el:0,dt=now-LR.t;if(dt>.05){const wa=(a.az-LR.az)/dt,we=(el-LR.el)/dt;if(dt<1){LR.la=lerp(LR.la,wa,.3);LR.le=lerp(LR.le,we,.3);}LR.az=a.az;LR.el=el;LR.t=now;}
        const k=(x1-x0)*3,lx=cx+clamp(LR.la*k,-(x1-x0)*.4,(x1-x0)*.4),ly=cy-clamp(LR.le*k,-(y0-y1)*.4,(y0-y1)*.4);c.beginPath();c.arc(lx,ly,22,0,7);c.stroke();
        if(irst){c.font='700 18px "B612 Mono",monospace';c.textAlign='center';c.fillText(ru?'ТП':'IR',cx,y1-18);}}
      // bottom: missile pair / station count, MTI
      c.font='700 16px "B612 Mono",monospace';c.textAlign='center';if(wd)c.fillText(String(P.count(w)),cx,y0+24);
      c.textAlign='left';c.font='700 13px "B612 Mono",monospace';if(sys.mig.mti)c.fillText(ru?'СДЦ':'MTI',x0+4,y0+24);
      if(!on&&!irst){c.textAlign='center';c.font='700 22px "B612 Mono",monospace';c.fillText(radar.power==='OFF'?(ru?'ВЫКЛ':'OFF'):radar.warm>0?(ru?'ПОДГ ':'WARMUP ')+Math.ceil(radar.warm):(ru?'ЭКВ':'DUMMY'),cx,cy+40);}
      c.restore();c.fillStyle='rgba(2,10,5,.22)';for(let y=0;y<S;y+=3)c.fillRect(0,y,S,1);};
    }catch(e){console.warn('v197 MiG-23 scope',e);}
    // ===== v198: MiG-23ML СТРОБ probing-pulse switch: the search scan collapses to a ~13° azimuth strobe around the cursor, to pick a target out
    // of a group or out of jamming (Sapfir-23 manual: probing pulses of 10-16° in azimuth). SDC / MTI after the Sapfir-23E description: the
    // clutter-referenced canceller drops targets with low radial speed, ~8% blind speeds survive the PRF stagger, and well above the ground it
    // loses its clutter reference and becomes unreliable. Shift+P toggles СТРОБ =====
    try{
    sys.mig.strob=0;
    addEventListener('keydown',e=>{if(e.code!=='KeyP'||!e.shiftKey||e.ctrlKey||e.metaKey||e.altKey||e.repeat||!player||player.ac.pit!=='flogger'||!game.running||!$('#menu').hidden)return;
      const tg=e.target&&e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT')return;e.preventDefault();e.stopImmediatePropagation();
      sys.mig.strob=sys.mig.strob?0:1;sfx.click();flash(SET.hudlang==='EN'?(sys.mig.strob?'PROBE ON':'PROBE OFF'):(sys.mig.strob?'СТРОБ':'СТРОБ ВЫКЛ'),900);},true);
    {const _f=drawFlogScope;drawFlogScope=function(c,S){_f(c,S);const P=player;if(!P||P.ac.pit!=='flogger'||!sys.mig.strob||!radar.on()||radar.sensor!=='RDR'||radar.mode!=='RWS')return;
      const x0=56,x1=S-56,y0=S-40,ax=a=>lerp(x0,x1,(a/(30*D2R)+1)/2),l=ax(radar.scanC-6.5*D2R),r=ax(radar.scanC+6.5*D2R),b=.25+.75*sys.mig.hdd;
      c.save();c.globalAlpha=b;c.strokeStyle=c.fillStyle='#62ffa8';c.lineWidth=2.4;c.beginPath();c.moveTo(l,y0+4);c.lineTo(l,y0+12);c.lineTo(r,y0+12);c.lineTo(r,y0+4);c.stroke();
      c.font='700 13px "B612 Mono",monospace';c.textAlign='right';c.textBaseline='middle';c.fillText(SET.hudlang==='EN'?'PROBE':'СТРОБ',x1-4,y0+24);c.restore();};}
    }catch(e){console.warn('v198 СТРОБ',e);}
  }
 }
});
