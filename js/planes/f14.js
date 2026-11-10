"use strict";
/* =====================================================================================================================
   F-14A / F-14B / F-14D Tomcat — everything that belongs to this jet family, split out of game.js (v258).
   Loaded BEFORE game.js (after js/planes/registry.js). Nothing here runs against game.js state at load time:
     * top-level declarations below are pure data (station layouts, store lists) or functions (model builder, cockpit/MFD code);
     * `tables` are thunks. game.js calls PLANES.apply('<TABLE>',<TABLE>) right after it declares each table, which merges
       these entries in at the same point the old inline literal used to be evaluated;
     * `hooks` are the one-off statements that used to sit inline in game.js (variants, cockpit builders, HUD/MFD patches).
       game.js calls PLANES.run('f14','<tag>') at the exact spot each one was cut from, so execution order is unchanged.
   Type ids in this file: F-14A, F-14B, F-14D
   ===================================================================================================================== */
// F-14A stations (NATOPS numbering): 1A / 8A glove pylons (AIM-54 or AIM-7), 1B / 8B glove shoulder rails (AIM-9), 2 / 7 under the nacelles
// (267 gal tanks), 3-6 in the tunnel between the nacelles (AIM-54 on pallets or semi-recessed AIM-7): 3 / 6 forward, 4 / 5 aft
const F14ST={'1A':[-2.3,-.44,-.6],'1B':[-2.7,-.26,-.95],'2':[-1.38,-1.0,.7],'3':[-.52,-.62,-1.7],'4':[-.52,-.62,2.9],
  '5':[.52,-.62,2.9],'6':[.52,-.62,-1.7],'7':[1.38,-1.0,.7],'8B':[2.7,-.26,-.95],'8A':[2.3,-.44,-.6]};
function makeF14(){
  // F-14A Tomcat: 19.1 m long, span 19.55 m at 20° / 11.65 m at 68°. Wide flat "pancake" centre body between two widely spaced TF30 nacelles with
  // raked two-dimensional intakes, fixed gloves with sharp 67° leading edges carrying the pivots, outer panels swinging 20-68°, twin canted fins,
  // big stabilators on the nacelle sides, ventral fins, the "beaver tail" speed brake between the nozzles, one long bubble canopy over pilot and RIO,
  // and on the early A the AN/ALR-23 infra-red search and track pod under the nose, with the M61A1 on the left side of the nose
  const grp=new THREE.Group(),mat=SKIN(0x9aa3a8),dk=SKIN(0x7f888e),lt=SKIN(0xb2babe),blk=SKIN(0x1c1f22,10),met=SKIN(0x5a5550,60),rad=SKIN(0xc4c9c6,20),glz=SKIN(0x283640,110);
  // forward fuselage: radome, cockpit section, widening into the centre body
  grp.add(new THREE.Mesh(sloft([[-9.55,.02,-.02,.02,2],[-9.1,.24,-.04,.24,2],[-8.3,.45,-.04,.46,2.05],[-7.4,.57,-.02,.6,2.2],[-6.6,.62,.04,.72,2.4],
    [-5.6,.66,.08,.78,2.6],[-4.6,.73,.08,.77,2.9],[-3.6,.82,.06,.7,3.3],[-2.6,.95,.04,.6,3.7],[-1.4,1.15,.06,.52,4.2]]),mat));
  grp.add(new THREE.Mesh(loft([[-9.57,.022,-.02,.022,2],[-9.1,.245,-.04,.245,2],[-8.3,.455,-.04,.465,2.05],[-7.75,.53,-.03,.55,2.15]],40,false,false),rad));
  rim(grp,.54,.02,dk,0,-.03,-7.75,1,1.03);
  rod(grp,[0,0,-9.5],[0,0,-10.3],.022,met,1,[0,1,0],8);ball(grp,.035,met,0,0,-10.3);// pitot on the radome tip
  // flat centre body ("pancake") bridging the nacelles, tapering into the beaver tail
  grp.add(new THREE.Mesh(sloft([[-1.5,1.15,.06,.5,4.2],[.5,1.38,.1,.46,4.6],[3,1.45,.1,.42,4.8],[5.5,1.4,.1,.38,4.6],[7.2,1.15,.1,.3,4],[8.4,.8,.1,.18,3]]),mat));
  // the AN/ALR-23 IRST pod under the chin: slim fairing with a dark window on its nose
  pod(grp,1.15,.13,dk,0,-.62,-7.75,1,.9);ball(grp,.1,glz,0,-.62,-8.28,1,.9,.8);
  // gun: muzzle blast fairing and ports low on the left side of the nose
  pod(grp,1.0,.07,dk,-.52,-.18,-6.6,1,.8);[0,1].forEach(i=>ball(grp,.03,blk,-.56,-.16-i*.06,-7.05));
  // nacelles with raked rectangular intakes and the splitter plates standing off the fuselage
  for(const sd of[-1,1]){const nc=new THREE.Mesh(sloft([[-3.9,.5,-.2,.62,6],[-2.4,.55,-.18,.64,5],[0,.56,-.15,.6,4],[3,.54,-.12,.56,3.2],[6,.5,-.1,.52,2.6],[7.9,.46,-.1,.48,2.2]],28,false,true),mat);
    nc.position.x=sd*1.38;grp.add(nc);
    intake(grp,sd*1.38,-.18,-3.95,.46,.58,mat,blk,false);
    rod(grp,[sd*1.38-.46,.42,-4.25],[sd*1.38+.46,.42,-4.25],.05,mat,.5);// raked upper lip
    const sp=finShape([[-4.1,-.7],[-4.1,.5],[-2.6,.5],[-2.6,-.7]],.03,dk);sp.position.x=sd*.84;grp.add(sp);
    nozzle(grp,sd*1.38,-.1,8.55,.5,.44,1.3,met,dk);
    // fixed glove: sharp leading edge from the canopy back to the pivot fairing
    const gl=planform([[.8,-6.3],[2.9,-1.3],[3.0,.3],[2.95,2.3],[1.7,3.2],[.8,2.9]],.16,false,mat);gl.scale.x=sd;gl.position.y=.16;grp.add(gl);
    const pv=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.18,20),dk);pv.position.set(sd*2.78,.16,.5);grp.add(pv);
    // stabilator on the nacelle side
    const st=planform([[1.8,5.6],[4.95,7.95],[4.95,8.7],[1.8,9.05]],.1,false,mat);st.scale.x=sd;st.position.y=-.06;st.rotation.z=sd*.03;grp.add(st);
    // twin fins on the nacelles, canted out 5°, and the ventral fins below
    const fn=finShape([[4.0,.4],[6.55,3.1],[7.7,3.15],[8.8,.4]],.13,mat);fn.position.set(sd*1.55,0,0);fn.rotation.z=-sd*.087;grp.add(fn);
    pod(fn,1.2,.08,dk,0,3.12,7.6);
    const vf=finShape([[5.4,-.6],[6.4,-1.25],[7.35,-1.25],[7.75,-.6]],.06,dk);vf.position.x=sd*1.15;vf.rotation.z=sd*.3;grp.add(vf);
    // Phoenix pallets in the tunnel (fitted whenever the jet flies with AIM-54s)
    for(const z of[-1.7,2.9])pod(grp,1.6,.09,dk,sd*.52,-.4,z,1.4,.7);}
  // outer wing panels on the pivots: modelled at 20° and turned in sync() by the current sweep
  grp.userData.wings=[];grp.userData.wingBase=20;const piv=[];
  for(const sd of[-1,1]){const pv=new THREE.Group();pv.position.set(sd*2.78,.15,.5);grp.add(pv);piv.push(pv);
    const w=planform([[0,-1.3],[6.85,1.19],[6.85,2.64],[0,2.35]],.13,false,mat);w.scale.x=sd;pv.add(w);
    rod(pv,[sd*.5,0,2.15],[sd*6.3,0,2.5],.25,dk,.06);// flaps and spoilers
    rod(pv,[sd*.5,.005,-1.1],[sd*6.4,.005,1.25],.16,lt,.08);// slats
    navLight(sd<0?0xff2a1a:0x22ff55,sd*6.85,0,1.9,pv);grp.userData.wings.push({g:pv,sd});}
  // beaver tail speed brake between the nozzles, with the fuel dump mast
  grp.add(planform([[-.62,7.6],[.62,7.6],[.42,9.7],[-.42,9.7]],.08,false,mat));
  rod(grp,[0,.1,9.6],[0,.1,9.95],.04,met);
  pod(grp,1.0,.06,dk,0,-.25,8.6);// arresting hook stowed
  // dorsal spine behind the canopy and the long bubble canopy over both seats
  grp.add(new THREE.Mesh(sloft([[-3.3,.42,.66,.12,2],[-1,.6,.56,.12,2],[2,.7,.48,.1,2],[5,.4,.42,.08,2]],18),lt));
  canopy(grp,0x6a7880,.5,.55,2.05,.6,-5.0,dk);
  const ab=new THREE.Group();[-1.38,1.38].forEach(x=>{const c=abPlume(5.6,.46);c.position.set(x,-.1,9.25);ab.add(c);});grp.add(ab);grp.userData.ab=ab;
  pylons(grp,F14ST,['3','4','5','6'],SKIN(0x8a9296),x=>Math.abs(x)>2?.08:-.72);
  return bake(grp,[ab,...piv]);}
/* ============ F-14A Tomcat: wing-sweep program, AWG-9 helpers, the AI RIO, and the pilot's displays (HUD, VDI, HSD with the TID repeat, gauges) ============ */
// CADC wing-sweep program: the most-forward wing position allowed at the current Mach (NATOPS schedule: 20° to M0.4, 25° at 0.7, 50° at 0.8, 60° at 0.9,
// 68° from M1.0). In AUTO the wings follow it; the pilot's manual command can only sweep them further aft, never forward of the program.
const F14_PROG=[[0,20],[.4,20],[.7,25],[.8,50],[.9,60],[1,68],[3,68]];
function f14Prog(M){return tab(F14_PROG,M);}

PLANES.add('f14',{
 ids:["F-14A","F-14B","F-14D"],
 tables:{
  AC:()=>({
// MiG-23ML 'Flogger-G' (izd. 23-12): R-35-300 (8,550 / 13,000 kgf = 83.8 / 127.5 kN), empty 10,200 kg, internal fuel ~3,800 kg (ML lost the rear
  // fuselage tank), PTB-800 ventral tank, Sapfir-23ML (N003) pulse radar 65 km vs fighter / ~25 km look-down, TP-23M IRST, ASP-17ML sight, SPO-10 warner, no head-down display, GSh-23L 200 rds.
  // Conventional (non-FBW) controls: differential stabilators + spoilers for roll, SOS-3 AoA limiter that warns and pushes but can be pulled through.
  // The base numbers are the 45° (combat) wing; `swing` holds the 16° / 45° / 72° sets the flight model blends between as the wing moves.
  // F-14A Tomcat (early production, with the AN/ALR-23 IRST chin pod): 2x TF30-P-414A (54.9 kN dry / 93 kN in zone 5 each, slow to spool and stall-prone at
  // high AoA), empty 18,190 kg, internal fuel 7,348 kg (16,200 lb), two 267 gal (810 kg) tanks under the nacelles, 52.5 m² reference wing area, 7.5 g
  // symmetric (6.5 g at heavy weights), no AoA limiter (hydromechanical controls with SAS, adverse yaw from the spoilers at high AoA), AN/AWG-9
  // pulse-Doppler WCS (90 NM RWS / 110 NM PDS against a 5 m² target, TWS with 24 track files and six simultaneous Phoenix shots), M61A1 with 675 rds.
  // Variable sweep 20°-68° under the CADC program; `swing` holds the 20° / 45° / 68° sets the flight model blends between.
  'F-14A':{name:'F-14A Tomcat',model:makeF14,st:F14ST,empty:18190,fuel:7348,tank:810,S:52.5,CLa:4.4,cd0:.0215,k:.11,mil:109800,ab:186000,spool:3.4,abLight:.75,adv:.35,
    clt:[[-20,-.95],[-10,-.56],[0,.04],[5,.4],[10,.76],[15,1.08],[20,1.32],[25,1.46],[30,1.5],[35,1.45],[40,1.36],[50,1.15],[60,.95],[90,0]],
    abM:[[0,1],[.5,1.195],[1,1.36],[1.5,1.495],[2,1.6347],[2.5,1.7028],[3,1.724]],cdm:[[0,0],[.8,0],[.9,.006],[1,.026],[1.1,.034],[1.3,.032],[2,.028]],dW:22470,tkG:[6,6.5],dep:{a:31,rock:.9,spin:3.0},
    ff:[.35,2.1,14.5],gLim:7.5,aoaLim:30,roll:3.4,fbw:false,noLimiter:true,rcs:14,irs:1.35,ols:{tail:19800,head:9240,lrf:0,spin:1},cockpit:'viper',pit:'tomcat',eye:[6.1,1.0],units:'imp',
    radar:{name:'AWG-9',R0:62*NM,ranges:[25,50,100,200],unit:NM,ul:'NM',ecc:.45,awg:true,beam:2.3*D2R},irst:true,rio:true,
    gun:{name:'M61A1',rate:100,v:1030,dmg:9,ammo:675,spread:.0024},rel:['1A','8A','4','5','3','6','1B','8B'],keepJ:['1B','8B'],rwr:'14',spo:0,tankName:'267 gal tank',
    swing:{a:[20,45,68],rate:9,auto:true,S:[54.5,52.5,49.5],CLa:[5.3,4.4,3.1],cd0:[.0235,.0215,.0195],k:[.075,.11,.2],aoaLim:[30,30,26],gLim:[6.5,7.5,7.5],roll:[3.6,3.4,2.4],
      vne:[800,1300,1480],dep:[{a:30,rock:1.0,spin:3.2},{a:31,rock:.9,spin:3.0},{a:27,rock:.9,spin:2.6}],
      clt:[[-1,-.62,.06,.5,.94,1.3,1.52,1.62,1.6,1.52,1.42,1.2,.98,0],
           [-.95,-.56,.04,.4,.76,1.08,1.32,1.46,1.5,1.45,1.36,1.15,.95,0],
           [-.8,-.45,.02,.27,.53,.78,.98,1.12,1.18,1.16,1.1,.95,.8,0]],
      cdm:[[[0,0],[.7,0],[.8,.008],[.9,.035],[1,.065],[1.2,.075],[2,.07]],
           [[0,0],[.8,0],[.9,.006],[1,.026],[1.1,.034],[1.3,.032],[2,.028]],
           [[0,0],[.85,0],[.95,.004],[1,.017],[1.1,.023],[1.3,.021],[1.6,.0156],[2,.0138],[2.5,.0104],[3,.0084]]]}}
  }),
  ENG_SUP:()=>({
    'F-14A Tomcat':.089,
    'F-14B Tomcat':-.099
  }),
  FOE:()=>({
    'F-14A':'MiG-23'
  }),
  LOAD:()=>({
    cold:{
      'F-14A':{'1A':'AIM-54A','1B':'AIM-9L',2:'TK',3:'AIM-7F',4:'AIM-54A',5:'AIM-54A',6:'AIM-7F',7:'TK','8B':'AIM-9L','8A':'AIM-54A'}
    },
    modern:{
      'F-14A':{'1A':'AIM-54C','1B':'AIM-9M',2:'TK',3:'AIM-7M',4:'AIM-54C',5:'AIM-54C',6:'AIM-7M',7:'TK','8B':'AIM-9M','8A':'AIM-54C'}
    },
    guns:{
      'F-14A':{2:'TK',7:'TK'}
    }
  }),
  CMS:()=>({
    cold:{
      'F-14A':[30,30]
    },
    modern:{
      'F-14A':[30,30]
    }
  }),
  ECM_FIT:()=>({
    'F-14A':{cold:{n:'ALQ-100',jp:.8,dec:.55,kg:0,cd:0,warm:20},modern:{n:'ALQ-126',jp:1,dec:.68,kg:0,cd:0,warm:20}}
  }),
  RWR_OF:()=>({
    'F-14A':'ALR-45/50',
    'F-14B':'ALR-67(V)1'
  }),
  NCTR_ID:()=>({
    'F-14A':'F-14'
  }),
  STN:()=>({
    'F-14A':{'1A':F14P,'1B':F14W,2:['TK'],3:F14P,4:F14P,5:F14P,6:F14P,7:['TK'],'8B':F14W,'8A':F14P}
  }),
  ACROLE:()=>({
    'F-14A':'US · FLEET DEFENCE'
  }),
  FV:()=>({
    'F-14A':{hw:10.2,y1:3.7,span:'19.55 m spread',d:()=>bth([[-1.7,.5],[-2,.5],[-2.3,3.6],[-2.05,3.6]],'sk-body')+bth([[-1.4,-.35],[-3.9,-.55],[-3.9,-.7],[-1.4,-.7]],'sk-wing')+bth([[-2.3,.05],[-9.8,.08],[-9.8,-.07],[-2.3,-.32]],'sk-wing')+bth([[-.55,.15],[-2.15,.15],[-2.15,-.95],[-.55,-.95]],'sk-body')+bth([[-.7,0],[-2,0],[-2,-.82],[-.7,-.82]],'sk-dark')+ell(0,.28,1.05,.5,'sk-body')+ell(0,.05,.5,.5,'sk-body')+ell(0,-.42,.22,.12,'sk-dark')+ell(0,.8,.5,.4,'sk-can')}
  }),
  CALLS:()=>({
    'F-14A':'TOMCAT'
  }),
  FLAPSW:()=>({
    'F-14A':'tFlap'
  }),
  STALL:()=>({
    'F-14A':{s:1,twin:1}
  }),
  ENGN:()=>({
    'F-14A':'2× TF30-P-414A',
    'F-14B':'2× F110-GE-400'
  }),
  IRSTN:()=>({
    'F-14A':'AN/ALR-23'
  }),
  CREW:()=>({
    'F-14A':'RIO',
    'F-14B':'RIO',
    'F-14D':'RIO'
  })
 },
 hooks:{
  /* game.js line 10882 */
  L10882(){
    /* ============ v126: WSO terrain masking, Tab to step ground targets, WSO on the A/G radar, F-14B ============
       - The back seat only keeps or picks a ground target he can actually see: a fine line-of-sight march (every ~120 m, aircraft / pod to the target)
         instead of the coarse one, re-checked every half second; a target that goes behind a ridge is dropped after two seconds ("Lost him behind the ridge").
       - Tab with an A/G store selected and the back seat on AUTO: he steps to the next target (nearest first, then round the list).
       - F-15E: the WSO works the APG-70 — real-beam map to search, then a high-resolution (HRM) patch centred on the target he picks, with the radar
         range scale set so it fits; without a pod those radar coordinates are what the JDAM gets. The left MPD goes to A/G RDR when he starts.
       - F-14B (F-14B Upgrade, late 1990s on): F110-GE-400s (71.2 kN dry / 120.1 kN AB each, faster spool, no TF30 stalls), no IRST — the chin pod
         is the TCS only — LANTIRN on the right glove pylon in both eras, Mk 80-series and Paveways, JDAM (GBU-31 / -38) in the modern era. */
    {
    const AGR=window.V121.AGR,W=window.V122.WSOAG;
    // fine line of sight: march the segment against the terrain
    const fineLOS=(a,b)=>{const d=a.distanceTo(b),n=Math.min(400,Math.max(8,Math.ceil(d/120)));for(let i=1;i<n;i++){const t=i/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;if(y<groundAt(x,z)+1)return false;}return true;};
    window.fineLOS=fineLOS;
    const eyeOf=P=>SNS.hasPod(P)?SNS.podPos(P):P.pos;
    const vis=(P,u)=>fineLOS(eyeOf(P),new V3().copy(u.pos).setY(u.pos.y+2));
    // candidates, best first
    W.cands=function(P){const pod=SNS.hasPod(P),e=eyeOf(P),f=P.fwd(new V3()),ps=SNS.podSpec(),maxR=pod&&ps?Math.max(ps.lockR*1.7,22000):26000,out=[];
      for(const u of GND.units){if(!u.alive||u.side===P.side)continue;const d=u.pos.distanceTo(P.pos);if(d>maxR)continue;
        const l=new V3().copy(u.pos).sub(e).normalize(),off=Math.acos(clamp(l.dot(f),-1,1));if(off>65*D2R)continue;if(!vis(P,u))continue;
        out.push({u,s:d*(1+off*1.6)*(u.T&&u.T.tgt?.6:1)});}
      return out.sort((a,b)=>a.s-b.s).map(c=>c.u);};
    W.pick=function(P){return this.cands(P)[0]||null;};
    // re-check the current target every tick; drop it if it has been masked for two seconds
    {const _t=W.tick.bind(W);W.tick=function(dt){const P=player;if(this.tg&&this.tg.alive){if(vis(P,this.tg))this.mask=0;else{this.mask=(this.mask||0)+dt;
          if(this.mask>2){rio.say('Lost him behind the ridge.','mask',4);this.tg=null;SNS.brk();this.mask=0;this.t=0;}}}
        _t(dt);if(P&&P.type==='F-15E')this.radar(P);};}
    // Tab: next target
    W.next=function(){const P=player;if(!P)return;const l=this.cands(P);if(!l.length){rio.say('No other targets I can see.','nx',1);return;}
      const i=l.indexOf(this.tg),u=l[(i+1)%l.length];if(u===this.tg){rio.say('That\'s the only one.','nx',1);return;}
      this.tg=u;SNS.brk();this.t=0;this.mask=0;const d=P.pos.distanceTo(u.pos);rio.say('Next target, '+this.name(u)+', '+clockOf(P,u.pos)+' o\'clock, '+(d/1852).toFixed(0)+' miles.','nx2',.3);sfx.click();};
    addEventListener('keydown',e=>{if(e.code!=='Tab'||!game.running||!$('#menu').hidden||!W.want())return;e.preventDefault();e.stopImmediatePropagation();W.next();},true);
    // F-15E: the WSO runs the A/G radar for the search and the patch map
    W.radar=function(P){if(!this.want())return;if(radar.power!=='ON'&&!(window.SE&&SE.emisOn))radar.setPower('ON');
      if(window.EMPD&&!this._pg){const D=EMPD.d.L;if(D.pg==='AAR')D.pg='AGR';this._pg=1;}
      const u=this.tg&&this.tg.alive?this.tg:null,m=AGR.modesFor(P);
      if(!u){if(AGR.mode!=='GM'){AGR.mode='GM';AGR.sig='';}return;}
      const rel=new V3().copy(u.pos).sub(P.pos),g=Math.hypot(rel.x,rel.z),az=Math.atan2(Math.sin(Math.atan2(rel.x,-rel.z)-P.hdg*D2R),Math.cos(Math.atan2(rel.x,-rel.z)-P.hdg*D2R));
      // range scale that holds the target with room beyond it
      if(radar.rngM<g*1.25||radar.rngM>g*4){for(let i=0;i<radar.ranges.length;i++){radar.ri=i;if(radar.rngM>=g*1.25)break;}AGR.sig='';}
      radar.cur.az=clamp(az,-60*D2R,60*D2R);radar.cur.r=clamp(g/radar.rngM,0,1);
      const want=Math.abs(az)>8*D2R&&m.includes('EXP')?'EXP':'GM';if(AGR.mode!==want&&AGR.mode!=='GMT'&&AGR.mode!=='SEA'){AGR.mode=want;AGR.lvl=g<15000?3:g<30000?2:1;AGR.sig='';}};
    {const _r=W.reset.bind(W);W.reset=function(){_r();this._pg=0;this.mask=0;};}
    // the SAM / radar map pick without a pod must also see the target over the terrain from the aircraft (radar shadow): vis() above uses the aircraft then

    /* ---------------- F-14B ---------------- */
    AC['F-14B']=Object.assign({},AC['F-14A'],{name:'F-14B Tomcat',mil:142400,ab:240200,spool:1.9,abLight:.6,irst:false,rcs:14,
      swing:Object.assign({},AC['F-14A'].swing)});
    STN['F-14B']=JSON.parse(JSON.stringify(STN['F-14A']));
    {const add=(k,l)=>{for(const t of l)if(!STN['F-14B'][k].includes(t))STN['F-14B'][k].push(t);};['3','4','5','6'].forEach(k=>add(k,['GBU-31','GBU-38']));add('8B',['LANTIRN']);}
    MODERN_AC['F-14B']=['GBU-31','GBU-38'];
    for(const era of Object.keys(LOAD))if(LOAD[era]&&LOAD[era]['F-14A'])LOAD[era]['F-14B']=Object.assign({},LOAD[era]['F-14A']);
    STRIKE_LOAD['F-14B']={'1A':'AIM-54C','1B':'AIM-9M',2:'TK',7:'TK',3:'GBU-12',4:'GBU-12',5:'GBU-12',6:'GBU-12','8A':'AIM-7M','8B':'LANTIRN'};
    for(const era of Object.keys(CMS))if(CMS[era]['F-14A'])CMS[era]['F-14B']=CMS[era]['F-14A'].slice();
    if(ECM_FIT['F-14A'])ECM_FIT['F-14B']=ECM_FIT['F-14A'];
    FOE['F-14B']=FOE['F-14A'];NCTR_ID['F-14B']='F-14';CALLS['F-14B']='TOMCAT';ACROLE['F-14B']='US · FLEET DEFENCE · F110 · LANTIRN';FV['F-14B']=FV['F-14A'];DL_FIT.add('F-14B');
    {const i=ACS.indexOf('F-14A');if(!ACS.includes('F-14B'))ACS.splice(i+1,0,'F-14B');}
    // the TCS rides on both Tomcats
    {const T=window.TCS;T.avail=function(){const P=player;return !!(P&&P.alive&&(P.type==='F-14A'||P.type==='F-14B'));};}
    // keep the F-14B's IRST off whatever the era hook does to the A
    {const _mp=makePlayer;makePlayer=function(){const r=_mp.apply(this,arguments);AC['F-14B'].irst=false;if(player&&player.type==='F-14B'&&radar.sensor==='IRST')radar.toggleSensor();return r;};}
    window.V126={fineLOS};
    }
    /* ---- v127: in the cockpit the sensor picture lives on the jet's own displays: no picture-in-picture pod / Maverick / TCS window in first person ---- */
    {const _r=SNS.render;SNS.render=function(){if(view==='cockpit'){this.mount&&this.mount();if(this.box){this.box.style.display='none';this.shown=false;}try{window.TCS&&TCS.render();}catch(e){}return;}return _r.call(this);};
     const T=window.TCS,_t=T.render.bind(T);T.render=function(){if(view==='cockpit'){this.mount();this.box.style.display='none';
       // keep the video current for the VDI
       if(this.avail()&&this.los){const now=performance.now();if(!this._t||now-this._t>90){this._t=now;this.capture();}}return;}return _t();};}
    /* ---- v128: F-14 displays control panel wired: VDI TV shows the TCS, or the LANTIRN with an A/G store; HSD MODE NAV / TID / ECM ---- */
    {const _v=drawTcVdi;
     // source on the VDI: with the AI RIO he takes the pod when an A/G store is selected and the TCS otherwise; on manual the switch decides
     TCS.tgp=false;TCS.useTgp=function(P){return rio.active()?!!(SNS.hasPod(P)&&AGW[game.wsel]&&AGW[game.wsel].k!=='tgp'):this.tgp;};
     drawTcVdi=function(P){if(P&&window.TCS&&TCS.vdi&&TCS.avail()&&TCS.useTgp(P)){const c=tcVdiC.getContext('2d');c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;try{SNS.drawPage(c,360,'TGP',20);}catch(e){}
         c.fillStyle='#9cffbe';c.font='700 16px "B612 Mono",monospace';c.textAlign='left';c.textBaseline='top';c.fillText('TGP',26,24);return;}
       _v(P);};
     const _h=drawTcHsd;drawTcHsd=function(P){const ml=P&&P.type==='F-14A'&&(sys.v.tEo??1)===0&&missiles.some(m=>m.alive&&m.threat),m=ml?2:(sys.v.tHm??1),c=tcHsdC.getContext('2d');
       if(!P||m===1)return _h(P);
       c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#020503';c.fillRect(0,0,512,512);c.font='700 20px "B612 Mono",monospace';c.fillStyle='#8dff9e';c.textAlign='center';c.textBaseline='middle';
       if(m===0){c.drawImage(hsiC,46,46,420,420);c.fillText('NAV',256,24);return;}
       if(P.type==='F-14A'){drawALR45(c,512,P);}else{c.fillText('ECM',256,230);c.font='700 15px "B612 Mono",monospace';c.fillText('NO ALR-45 / 50 ON THIS JET',256,262);}};}
  },
  /* game.js line 14193 */
  L14193(){
    // ---------- F-14D Super Tomcat ----------
    // F110-GE-400 like the B, empty 19,838 kg; AN/APG-71 (the AWG-9's digital successor: same antenna and transmitter, APG-70 processing, better
    // ECCM and look-down); the dual chin pod carries the AN/AAS-42 IRST beside the TCS; AIM-54C / AIM-7M / AIM-9M, LANTIRN and JDAM in the modern era.
    try{
      const B=AC['F-14B'];
      cloneType('F-14B','F-14D',{name:'F-14D Super Tomcat',empty:19838,irst:true,ols:{tail:60000,head:28000,lrf:0,spin:1},
        radar:Object.assign({},B.radar,{name:'APG-71',R0:70*NM,ecc:.72})});
      RGIM['APG-71']=RGIM['AWG-9'];IRSTN['F-14D']='AN/AAS-42';ENGN['F-14D']='2× F110-GE-400';NCTR_ID['F-14D']='F-14';CALLS['F-14D']='TOMCAT';
      ACROLE['F-14D']='US · FLEET DEFENCE · APG-71 · AAS-42 IRST + TCS · LANTIRN / JDAM';RWR_OF['F-14D']='ALR-67(V)3';
      for(const era of Object.keys(LOAD))if(LOAD[era]['F-14D'])for(const k of Object.keys(LOAD[era]['F-14D'])){const w=LOAD[era]['F-14D'][k];if(w==='AIM-54A')LOAD[era]['F-14D'][k]='AIM-54C';if(w==='AIM-7F')LOAD[era]['F-14D'][k]='AIM-7M';if(w==='AIM-9L'||w==='AIM-9G')LOAD[era]['F-14D'][k]='AIM-9M';}
      {const T=window.TCS,_a=T.avail;T.avail=function(){const P=player;return !!(P&&P.alive&&P.type==='F-14D')||_a.call(this);};}
      // the B loses its IRST in makePlayer; the D keeps the AAS-42
      {const _mp=makePlayer;makePlayer=function(){AC['F-14D'].irst=true;return _mp.apply(this,arguments);};}
    }catch(e){console.warn('v215 F-14D',e);}
  },
  /* game.js line 14389 */
  L14389(){
    // ---------------- F-14D: pilot cockpit after NAVAIR 01-F14AAD-1 (2004) FO-3, section 2.33 (MFDs) and figures 2-95 / 2-100 (HUD) ----------------
    // v223. The D is not an A with screens bolted on. What FO-3 shows, and what this builds:
    //   main instrument panel: MFD 1 (left) and MFD 2 (right) side by side under the glare shield, each with 20 bezel push-buttons (PB1 lower left,
    //     counted clockwise), a NIGHT / OFF / AUTO / DAY power knob on top and BRT / CONT knobs in the bottom corners. No VDI or HSD CRTs, no third display.
    //   left of MFD 1: LANDING checklist plate, VVI and airspeed over the barometric and radar altimeters, standby attitude over the BDHI; AOA indicator outboard.
    //   right of MFD 2: radio frequency indicator (VHF/UHF-1, VHF/UHF-2, JTIDS-2), wing-sweep indicator outboard.
    //   centre panel: multistatus indicator (stations 1A 1B 3 4 5 6 8B 8A), clock, HDG / CRS knobs, brake pressure. Knee panels as before.
    // MFD formats (2.33.4): MENU1 legends DATA NAV - TSD VDI / - CTVS OBC CHKLST - / HUD PTID DD TCS IRST / HSD ECM MENU SMS -. Every non-repeat format
    //   keeps SMS - MENU - ECM along the bottom. A repeat (PTID) has no legends; any push returns MENU1. HSD, PTID and ECM come from one display
    //   processor channel here, so (like the TSD rule in the manual) one of them can be up on only one MFD at a time. A request the mission computer
    //   does not answer (formats not modelled) gets the dashed box, which then drops away, as the manual describes.
    // HUD (fig 2-95 / 2-100): heading scale on top (numbered every 10° in TLN, every 20° in A/A) under a fixed pointer, analog dot dials for airspeed
    //   (left, a dot per 10 kt) and altitude (right, a dot per 100 ft) round the digital readouts, VVI under the altitude dial, radar altitude above it
    //   below 5000 ft / 45° bank, α / M / G / peak G block lower left, flight-path ladder with the bars bent toward the horizon by half the flight-path
    //   angle, FPM with AOA bracket and potential flight path marker, bank scale (0, 10, 20, 30, 45) at the bottom, warnings in the middle, nav source /
    //   ZTOD lower right. A/A adds the weapon legend (PH# SP# SW# G#), target designator, RNG / closure / target altitude, SHOOT cue, seeker circle,
    //   gun reticle. A/G hands over to the strike symbology the jet already had.
    try{
    const V=ck.viper,tg=V.vars.tomcat.on[0],tp=V.tVdi.parent,SV=sys.v,isD=()=>!!player&&player.type==='F-14D';
    const cvs=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
    const T=(c,s,x,y,col,sz,al)=>{c.fillStyle=col||'#9cffbe';c.font='700 '+(sz||15)+'px "B612 Mono",monospace';c.textAlign=al||'center';c.textBaseline='middle';c.fillText(s,x,y);};
    const Ph=(c,s=12)=>new THREE.MeshPhongMaterial({color:c,shininess:s});
    const pnl=Ph(0x7c8286,8),dk=Ph(0x1b1e20,6),blk=Ph(0x0e1011,6),ob=Ph(0x3e4447,6),knb=Ph(0x2a2d2f,20),red=Ph(0xa0261a),yel=Ph(0xd8b020);
    const box=(par,w,h,d,m,x,y,z)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);par.add(b);return b;};
    const cyl=(par,r,d,m,x,y,z)=>{const b=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d,24),m);b.rotation.x=Math.PI/2;b.position.set(x,y,z);par.add(b);return b;};
    const ctl=(m,name,state,act)=>{const def={meshes:[m],name,state,act:()=>{try{act();}catch(e){console.warn(e);}sfx.click();}};m.userData.ctl=def;(V.ctls||[]).push(def);return def;};
    // canvases shared with the A/B pit: upload only when their version moves
    const feeds=[];const feed=(par,cv,w,h,x,y,z,round)=>{const t=new THREE.CanvasTexture(cv);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;
      const m=new THREE.Mesh(round?new THREE.CircleGeometry(w/2,36):new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));m.position.set(x,y,z);par.add(m);feeds.push({cv,t,v:-1});return m;};
    const gauge=(par,cv,r,x,y)=>{box(par,r*2+.014,r*2+.014,.012,blk,x,y,.006);cyl(par,r+.002,.006,dk,x,y,.012);feed(par,cv,r*2,0,x,y,.0155,true);};

    // ---- which A/B parts the D drops: the centre VDI / HSD column and the left / right instrument panels; the AVG-12's round glass tint ----
    const hideA=[];
    tp.children.forEach(o=>{const p=o.position;
      if(o.isGroup&&Math.abs(Math.abs(p.x)-.3)<.01&&Math.abs(p.y-.02)<.01)hideA.push(o);                       // left / right instrument panels
      else if(Math.abs(p.x)<.14&&p.y<.14&&p.y>-.33&&p.z>.004)hideA.push(o);});                                  // VDI, HSD, their knobs and lower column
    tg.children.forEach(o=>{if(o.isMesh&&o.geometry&&o.geometry.type==='CircleGeometry'&&Math.abs(o.position.z+.748)<.002)hideA.push(o);});

    const DG=new THREE.Group();DG.visible=false;tp.add(DG);const DH=new THREE.Group();DH.visible=false;tg.add(DH);
    // main instrument panel: flat centre section carrying both MFDs, the two outboard sections angled in toward the pilot like the A's
    const CW=.205;box(DG,CW*2,.25,.02,pnl,0,.015,.006);box(DG,CW*2,.25,.05,dk,0,.015,-.03);
    const wing=sd=>{const g=new THREE.Group();g.position.set(sd*CW,0,.006);g.rotation.y=-sd*.32;DG.add(g);box(g,.235,.25,.02,pnl,sd*.1175,.015,0);box(g,.235,.25,.05,dk,sd*.1175,.015,-.036);return g;};
    const LW=wing(-1),RW_=wing(1);

    // ---- MFDs ----
    const F=window.F14D={fmt:['VDI','HSD'],pend:[null,null],pwr:[2,2],msg:['','']};
    const PWR=['OFF','NIGHT','AUTO','DAY'];
    const MENU1=[null,'DATA','NAV',null,'TSD','VDI',null,'CTVS','OBC','CHKLST',null,'HUD','PTID','DD','TCS','IRST','HSD','ECM','MENU','SMS',null];
    const BOT={17:'ECM',18:'MENU',19:'SMS'};
    const LIVE=new Set(['DATA','VDI','HSD','PTID','ECM','SMS','TCS']),FAM={HSD:0,PTID:1,ECM:2};
    const legend=(n,pb)=>{const f=F.fmt[n];if(f==='PTID')return null;if(f==='MENU')return MENU1[pb];return BOT[pb]||null;};
    function pick(n,pb){const f=F.fmt[n];
      if(f==='PTID'){F.fmt[n]='MENU';return;}                               // repeat: any push returns MENU1
      const s=legend(n,pb);if(!s)return;
      if(s==='MENU'){F.fmt[n]='MENU';return;}
      if(!LIVE.has(s)){F.pend[n]={pb,t:performance.now()+700};return;}      // not answered by the MC: dashed box, then nothing
      if(s in FAM){const o=1-n;if(F.fmt[o] in FAM)F.fmt[o]='MENU';SV.tHm=FAM[s];}
      F.fmt[n]=s;}
    // button positions on a .19 bezel: PB1-5 left side bottom to top, 6-10 top left to right, 11-15 right top to bottom, 16-20 bottom right to left
    const S=.142,BZ=.198,PBo=(pb)=>{const st=S*.82/4,i=(pb-1)%5;if(pb<=5)return[-BZ/2+.011,-S*.41+i*st];if(pb<=10)return[-S*.41+i*st,BZ/2-.011];if(pb<=15)return[BZ/2-.011,S*.41-i*st];return[S*.41-i*st,-BZ/2+.011];};
    const mfdCv=[cvs(420,420),cvs(420,420)],mfdTx=[];
    [-1,1].forEach((sd,n)=>{const X=sd*.1,Y=.015,g=new THREE.Group();g.position.set(X,Y,.016);DG.add(g);
      // bezel: chamfered top corners as in figure 2-91, the screen sunk into it
      const sh=new THREE.Shape(),h=BZ/2,c=.03;sh.moveTo(-h,-h);sh.lineTo(h,-h);sh.lineTo(h,h-c);sh.lineTo(h-c,h);sh.lineTo(-h+c,h);sh.lineTo(-h,h-c);sh.closePath();
      const bg=new THREE.ExtrudeGeometry(sh,{depth:.014,bevelEnabled:false});const bm=new THREE.Mesh(bg,dk);bm.position.z=-.004;g.add(bm);
      const t=new THREE.CanvasTexture(mfdCv[n]);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;mfdTx.push(t);
      const scr=new THREE.Mesh(new THREE.PlaneGeometry(S,S),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));scr.position.z=.0105;g.add(scr);
      for(let pb=1;pb<=20;pb++){const[x,y]=PBo(pb),v=pb<=5||(pb>10&&pb<=15),b=box(g,v?.009:.016,v?.016:.009,.009,ob,x,y,.014);
        ctl(b,'MFD '+(n+1)+' · PB'+pb,()=>legend(n,pb)||(F.fmt[n]==='PTID'?'→ MENU':'—'),()=>pick(n,pb));}
      const pk=cyl(g,.0085,.012,knb,0,h+.004,.012);ctl(pk,'MFD '+(n+1)+' · power NIGHT / OFF / AUTO / DAY',()=>PWR[F.pwr[n]],()=>{F.pwr[n]=(F.pwr[n]+1)%4;});
      const bk=cyl(g,.0075,.012,knb,-h+.012,-h+.012,.014);ctl(bk,'MFD '+(n+1)+' · BRT',()=>Math.round(sys.fcr.int*100)+'%',()=>{sys.fcr.int=sys.fcr.int>=.95?.3:Math.min(1,sys.fcr.int+.175);});
      const ck2=cyl(g,.0075,.012,knb,h-.012,-h+.012,.014);ctl(ck2,'MFD '+(n+1)+' · CONT',()=>Math.round(sys.fcr.con*100)+'%',()=>{sys.fcr.con=sys.fcr.con>=.95?.3:Math.min(1,sys.fcr.con+.175);});});

    const smsAbbr=w=>{const d=MSL[w];if(!w||w==='TK')return w==='TK'?'TK':'--';if(d&&d.seek)return{ARH:'PH',SARH:'SP',IR:'SW'}[d.seek]||'MS';if(w==='LANTIRN')return'LTN';return(typeof SN!=='undefined'&&SN[w])||w;};
    function paintMFD(n,P){const c=mfdCv[n].getContext('2d'),W=420,col='#9cffbe',dim='rgba(156,255,190,.45)',f=F.fmt[n],now=performance.now();
      c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#020503';c.fillRect(0,0,W,W);if(!F.pwr[n]||!P)return;
      const A=34,B=W-A,IN=B-A;   // legend margin, picture area A..B
      const pic=(src)=>{c.drawImage(src,A,A,IN,IN);};
      if(f==='VDI')pic(tcVdiC);
      else if(f in FAM){if((SV.tHm??0)!==FAM[f])SV.tHm=FAM[f];pic(tcHsdC);}
      else if(f==='TCS'){if(window.TCS&&TCS.los&&TCS.sc){c.save();c.translate(A,A);c.scale(IN/360,IN/360);try{TCS.paint(c,360,360);}catch(e){}c.restore();}else{T(c,'TCS',210,180,col,22);T(c,'NO VIDEO',210,214,dim,16);}}
      else if(f==='SMS'){T(c,'SMS',210,52,col,18);const w=game.wsel;c.strokeStyle=col;c.lineWidth=2;
        // planform, stations placed like the jet's (glove 1A/1B, nacelles 2/7, tunnel 3-6, glove 8B/8A)
        c.beginPath();c.moveTo(210,80);c.lineTo(190,130);c.lineTo(80,200);c.lineTo(80,222);c.lineTo(190,200);c.lineTo(185,300);c.lineTo(235,300);c.lineTo(230,200);c.lineTo(340,222);c.lineTo(340,200);c.lineTo(230,130);c.closePath();c.stroke();
        const SP={'1A':[118,236],'1B':[118,262],'2':[160,288],'3':[190,236],'4':[190,262],'5':[230,262],'6':[230,236],'7':[260,288],'8B':[302,262],'8A':[302,236]};
        for(const[k,[x,y]]of Object.entries(SP)){const v=P.load[k];if(!(k in(P.ac.st||{})))continue;const on=v&&v===w;T(c,smsAbbr(v),x,y,on?'#fff':v?col:dim,14);if(on){c.strokeStyle='#fff';c.lineWidth=1.5;c.strokeRect(x-20,y-10,40,20);}}
        T(c,(w==='GUN'?'GUN':smsAbbr(w))+' '+(w==='GUN'?(P.gun?P.gun.ammo:0):P.count?P.count(w):''),70,330,col,16,'left');T(c,game.armPos===0?'ARM':'SAFE',350,330,game.armPos===0?'#fff':col,16,'right');
        T(c,'RNDS '+(P.gun?P.gun.ammo:0),70,354,dim,14,'left');T(c,'CHF '+(P.chaff||0)+'  FLR '+(P.flares||0),350,354,dim,14,'right');}
      else if(f==='DATA'){T(c,'OWN A/C',210,52,col,18);const ft=P.pos.y*FT,rows=[['HDG',String(Math.round(((P.hdg%360)+360)%360)).padStart(3,'0')],['CAS',Math.round(P.cas)+' KT'],['MACH',P.mach.toFixed(2)],['ALT',fmtN(Math.round(ft/10)*10)+' FT'],
          ['FUEL',fmtN(Math.round(P.totalFuel*2.2046/10)*10)+' LB'],['GW',fmtN(Math.round((P.mass||0)*2.2046/10)*10)+' LB'],['WING',Math.round(P.sweep||20)+'°'],['G MAX',P.maxNz.toFixed(1)]];
        rows.forEach(([k,v],i)=>{T(c,k,80,100+i*30,dim,16,'left');T(c,v,340,100+i*30,'#fff',17,'right');});}
      else if(f==='MENU'){T(c,'MENU1',210,210,col,20);}
      // legends round the edge, in the picture border
      if(f!=='PTID')for(let pb=1;pb<=20;pb++){const s=legend(n,pb);if(!s)continue;const st=IN*.82/4,i=(pb-1)%5;let x,y,al='center';
        if(pb<=5){x=6;y=W/2+IN*.41-i*st;al='left';}else if(pb<=10){x=W/2-IN*.41+i*st;y=16;}else if(pb<=15){x=W-6;y=W/2-IN*.41+i*st;al='right';}else{x=W/2+IN*.41-i*st;y=W-16;}
        c.fillStyle='rgba(2,5,3,.85)';const tw=s.length*11+8,bx0=al==='left'?x-2:al==='right'?x-tw+2:x-tw/2;c.fillRect(bx0,y-10,tw,20);
        T(c,s,x,y,LIVE.has(s)||s==='MENU'?col:dim,17,al);
        const pd=F.pend[n];if(pd&&pd.pb===pb&&now<pd.t){c.setLineDash([4,3]);c.strokeStyle=col;c.lineWidth=1.5;c.strokeRect(bx0,y-11,tw,22);c.setLineDash([]);}
        if(s===f||(f==='MENU'&&s===F.fmt[n])){c.strokeStyle='#fff';c.lineWidth=1.5;c.strokeRect(bx0,y-11,tw,22);}}
      if(F.pend[n]&&now>F.pend[n].t)F.pend[n]=null;
      // brightness / night limit
      const k=(.3+.7*sys.fcr.int)*(F.pwr[n]===1?.45:1);if(k<.999){c.globalAlpha=1-k;c.fillStyle='#000';c.fillRect(0,0,W,W);c.globalAlpha=1;}}

    // ---- left section: AOA indicator outboard, LANDING plate, VVI / airspeed over baro / radar altimeters, standby attitude over the BDHI ----
    {const g=LW;
      const pl=cvs(256,96),x=pl.getContext('2d');x.fillStyle='#1d2023';x.fillRect(0,0,256,96);T(x,'LANDING',128,14,'#e8e8e2',15);
      [['WINGS','HOOK'],['WHEELS','HARNESS'],['SAS','SPEED BRAKES'],['FLAPS','BRAKES'],['DLC','FUEL']].forEach(([a,b],i)=>{T(x,a,40,32+i*13,'#e8e8e2',11,'left');T(x,b,140,32+i*13,'#e8e8e2',11,'left');});
      {const t=new THREE.CanvasTexture(pl);const m=new THREE.Mesh(new THREE.PlaneGeometry(.1,.0375),new THREE.MeshBasicMaterial({map:t}));m.position.set(-.155,.112,.011);g.add(m);}
      gauge(g,TC.vvi,.03,-.19,.05);gauge(g,TC.as,.03,-.12,.05);gauge(g,TC.alt,.03,-.19,-.025);gauge(g,TC.ralt,.03,-.12,-.025);
      gauge(g,TC.sai,.032,-.045,.07);gauge(g,TC.bdhi,.038,-.045,-.022);
      box(g,.03,.112,.012,blk,-.222,-.02,.008);feed(g,tcAoaC,.022,.088,-.222,-.02,.0145);
      // left fuel shutoff / fire extinguisher handle over the panel's top edge
      box(g,.05,.018,.02,red,-.07,.128,.016);box(g,.012,.02,.01,yel,-.07,.128,.028);}
    // ---- right section: radio frequency indicator, wing-sweep indicator outboard, right fuel shutoff ----
    const rfC=cvs(256,240);
    {const g=RW_;box(g,.088,.083,.012,blk,.07,-.005,.008);const t=feed(g,rfC,.08,.075,.07,-.005,.0145);
      box(g,.036,.12,.012,blk,.2,.01,.008);feed(g,tcSwpC,.028,.093,.2,.01,.0145);
      box(g,.05,.018,.02,red,.07,.128,.016);box(g,.012,.02,.01,yel,.07,.128,.028);}
    function paintRF(){const x=rfC.getContext('2d');x.fillStyle='#d4d6d2';x.fillRect(0,0,256,240);x.fillStyle='#0b0c0c';x.fillRect(10,10,236,220);
      const row=(lbl,val,y)=>{T(x,lbl,128,y,'#e8e8e2',15);x.fillStyle='#1b1f1c';x.fillRect(26,y+12,204,32);T(x,val,128,y+29,'#ffb547',22);};
      row('VHF / UHF - 1','C225.000T',26);row('VHF / UHF - 2','PA30.300R',96);row('I - JTIDS - 2','000T  127R',166);}
    paintRF();

    // ---- centre panel under the MFDs: multistatus indicator, clock, HDG / CRS knobs, brake pressure ----
    const msC=cvs(512,96);
    {const g=new THREE.Group();g.position.set(0,-.2,.006);DG.add(g);box(g,.25,.17,.02,pnl,0,0,0);box(g,.25,.17,.05,dk,0,0,-.035);
      box(g,.236,.048,.012,blk,0,.055,.012);feed(g,msC,.228,.043,0,.055,.0185);
      gauge(g,TC.clk,.03,.06,-.005);gauge(g,TC.brk,.026,.07,-.065);
      const hp=new THREE.Group();hp.position.set(-.055,-.05,.012);g.add(hp);box(hp,.1,.05,.006,Ph(0x2a2e31),0,0,0);
      const kH=cyl(hp,.011,.014,knb,-.024,-.004,.008),kC=cyl(hp,.011,.014,knb,.024,-.004,.008);
      ctl(kH,'HDG · command heading on the HSD',()=>String(Math.round(SV.hdgSel??0)).padStart(3,'0'),()=>{SV.hdgSel=(((SV.hdgSel??0)+10)%360);});
      ctl(kC,'CRS · selected course on the HSD',()=>String(Math.round(SV.crsSel??0)).padStart(3,'0'),()=>{SV.crsSel=(((SV.crsSel??0)+10)%360);});
      const lb=cvs(256,128),q=lb.getContext('2d');q.fillStyle='#2a2e31';q.fillRect(0,0,256,128);T(q,'HDG',64,18,'#e8e8e2',18);T(q,'CRS',192,18,'#e8e8e2',18);
      const m=new THREE.Mesh(new THREE.PlaneGeometry(.1,.05),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(lb)}));m.position.z=.0035;hp.add(m);}
    const MST=['1A','1B','3','4','5','6','8B','8A'];
    function paintMS(P){const x=msC.getContext('2d');x.fillStyle='#0b0c0c';x.fillRect(0,0,512,96);const w=game.wsel;
      MST.forEach((k,i)=>{const cx=32+i*64,v=P.load[k],ab=v&&v!=='TK'?smsAbbr(v):'--',sel=v&&v===w;
        x.fillStyle='#151816';x.fillRect(cx-28,6,56,56);T(x,ab==='--'?'':ab,cx,22,'#e8e8e2',16);
        // status flag: ◄► ready on the selected type with MASTER ARM on, [] selected, II loaded, -- empty
        T(x,!v||v==='TK'?'--':sel?(game.armPos===0?'◄►':'[ ]'):'I I',cx,46,sel&&game.armPos===0?'#7dff8a':'#e8e8e2',15);
        x.fillStyle='#d4d6d2';x.fillRect(cx-28,70,56,20);T(x,k,cx,80,'#111',14);});}

    // ---- HUD combiner: the D's HUD is a framed combiner with the cockpit TV sensor (CCTVS) on top; ~20° wide field ----
    const dGlass=[[-.1,.07],[.1,.07],[.13,.03],[.13,-.17],[-.13,-.17],[-.13,.03]].map(([x,y])=>new V3(x,y,-.75));
    {const fr=Ph(0x121416,10);for(const sd of[-1,1])box(DH,.012,.25,.016,fr,sd*.137,-.05,-.75);box(DH,.21,.01,.016,fr,0,.076,-.75);
      box(DH,.05,.03,.04,fr,0,.098,-.75);cyl(DH,.009,.01,Ph(0x050607,60),0,.098,-.728);
      const gl=new THREE.Mesh(new THREE.PlaneGeometry(.262,.24),new THREE.MeshBasicMaterial({color:0x9fd8c0,transparent:true,opacity:.05,depthWrite:false}));gl.position.set(0,-.05,-.749);DH.add(gl);}

    // ---- HUD symbology ----
    const pk={g:1};
    function drawF14DHud(P,fs,lh){
      const w=game.wsel,wd=MSL[w],gun=w==='GUN',ag=!!(typeof AGW!=='undefined'&&AGW[w]),arm=game.armPos===0,L=radar.tgt?radar.tgt():null;
      if(ag&&arm)return drawHornetHud(P,fs,lh);
      const AA=arm||!!L,ppd=KPX*D2R,bs=hb(0,0),f=P.fwd(new V3()),rt=P.right(new V3()),gear=!!SV.gear;
      const Tt=(s,a,e,al='left')=>{const p=hb(a,e);if(p)txt(s,p.x,p.y,al);return p;};
      const seg=(a1,e1,a2,e2)=>{const p=hb(a1,e1),q=hb(a2,e2);if(p&&q)line(p.x,p.y,q.x,q.y);};
      const fpm=projDir(P.vel.clone().normalize()),fpa=Math.asin(clamp(P.vel.y/Math.max(1,P.vel.length()),-1,1))*R2D;
      // waterline when the FPM is pegged or the gear is down
      if(bs&&(gear||!fpm)){line(bs.x-22,bs.y,bs.x-11,bs.y);line(bs.x-11,bs.y,bs.x-5,bs.y+6);line(bs.x-5,bs.y+6,bs.x,bs.y);line(bs.x,bs.y,bs.x+5,bs.y+6);line(bs.x+5,bs.y+6,bs.x+11,bs.y);line(bs.x+11,bs.y,bs.x+22,bs.y);}
      // flight path marker, AOA bracket on its left wing (gear down), potential flight path marker (">" off the right wing, acceleration along the path)
      if(fpm){circ(fpm.x,fpm.y,5);line(fpm.x-15,fpm.y,fpm.x-5,fpm.y);line(fpm.x+5,fpm.y,fpm.x+15,fpm.y);line(fpm.x,fpm.y-5,fpm.x,fpm.y-11);
        const acc=(P._dD14!==undefined?(P.vel.length()-P._dD14):0);P._dD14=P.vel.length();const pf=clamp(acc/(1/60)/9.81*R2D*.6,-8,8),py=fpm.y-pf*ppd;
        line(fpm.x+22,py-5,fpm.x+28,py);line(fpm.x+28,py,fpm.x+22,py+5);
        if(gear){const u=tcUnits(P),by=fpm.y+(u-15)*ppd*.45,bx=fpm.x-24;line(bx+6,by-11,bx,by-11);line(bx,by-11,bx,by+11);line(bx,by+11,bx+6,by+11);}}
      // flight path ladder: every 5°, solid above / dashed below, bars bent toward the horizon by half the flight-path angle
      {const hz=new V3(f.x,0,f.z);if(hz.lengthSq()<1e-6){const u=P.up();hz.set(-u.x,0,-u.z);}hz.normalize();const hr=new V3(-hz.z,0,hz.x);
       for(let p=-85;p<=85;p+=5){const pr=p*D2R,d=hz.clone().multiplyScalar(Math.cos(pr)).setY(Math.sin(pr));if(!projDir(d))continue;const e=k=>projDir(d.clone().addScaledVector(hr,k).normalize());
         const wo=p===0?.34:.12,wi=p===0?.06:.04,a1=e(-wo),a2=e(-wi),b1=e(wi),b2=e(wo);if(!a1||!a2||!b1||!b2)continue;
         if(p===0){line(a1.x,a1.y,a2.x,a2.y);line(b1.x,b1.y,b2.x,b2.y);continue;}
         const bend=-Math.sign(p)*Math.abs(p)/2*D2R,rot=(o,q,s)=>{const dx=q.x-o.x,dy=q.y-o.y,cs=Math.cos(s*bend),sn=Math.sin(s*bend);return{x:o.x+dx*cs-dy*sn,y:o.y+dx*sn+dy*cs};};
         const A2=rot(a2,a1,1),B2=rot(b1,b2,-1);hx.setLineDash(p<0?[6,5]:[]);line(A2.x,A2.y,a2.x,a2.y);line(b1.x,b1.y,B2.x,B2.y);hx.setLineDash([]);
         const tk=p>0?7:-7;line(a2.x,a2.y,a2.x,a2.y+tk);line(b1.x,b1.y,b1.x,b1.y+tk);
         if(p%10===0||Math.abs(p)===5){const s=p===90?'UP':p===-90?'DOWN':String(Math.abs(p));txt(s,A2.x-12,A2.y,'right');txt(s,B2.x+12,B2.y,'left');}}
       // -3° marks
       {const d=hz.clone().multiplyScalar(Math.cos(-3*D2R)).setY(Math.sin(-3*D2R)),e=k=>projDir(d.clone().addScaledVector(hr,k).normalize()),a=e(-.09),b=e(.09);if(a&&b){line(a.x-4,a.y,a.x+4,a.y);line(b.x-4,b.y,b.x+4,b.y);}}}
      // heading scale on top, fixed pointer above it
      {const hdg=((P.hdg%360)+360)%360,E=4.1,K=.5,step=AA?20:10;
       for(let d=Math.ceil((hdg-16)/5)*5;d<=hdg+16;d+=5){const off=(d-hdg)*K;if(Math.abs(off)>7.5)continue;const big=((d%step)+step)%step===0;seg(off,E,off,E-(big?.7:.35));
         if(big)Tt(String((((d%360)+360)%360)/10).padStart(2,'0'),off,E-1.4,'center');}
       const pp=hb(0,E+.35);if(pp){hx.beginPath();hx.moveTo(pp.x,pp.y);hx.lineTo(pp.x-6,pp.y-10);hx.lineTo(pp.x+6,pp.y-10);hx.closePath();hx.stroke();}}
      // analog dials: ten dots, pointer, digital readout in the middle
      const dial=(az,el,val,unit,s)=>{const c=hb(az,el);if(!c)return;const R=ppd*1.7;hx.save();
        for(let i=0;i<10;i++){const a=i/10*Math.PI*2-Math.PI/2;hx.beginPath();hx.arc(c.x+Math.cos(a)*R,c.y+Math.sin(a)*R,1.8,0,7);hx.fill();}
        const a=((val%unit)/unit)*Math.PI*2-Math.PI/2;line(c.x+Math.cos(a)*R*.62,c.y+Math.sin(a)*R*.62,c.x+Math.cos(a)*R*.92,c.y+Math.sin(a)*R*.92);
        hx.textBaseline='middle';txt(s,c.x,c.y,'center');hx.textBaseline='alphabetic';hx.restore();};
      const ft=P.pos.y*FT,agl=Math.max(0,(P.pos.y-groundAt(P.pos.x,P.pos.z))*FT),raOK=agl<5000&&Math.abs(P.bank*R2D)<45,rdr=SV.tHudAlt===1;
      dial(-7.4,-.8,P.cas,100,String(Math.round(P.cas)));
      const altS=(rdr&&raOK?fmtN(Math.round(agl/10)*10):fmtN(Math.round(ft/10)*10));dial(7.4,-.8,rdr&&raOK?agl:ft,1000,altS);
      if(rdr&&raOK)Tt('R',9.4,-.8,'left');else if(rdr&&!raOK&&blink)Tt('B',9.4,-.8,'left');
      if(!rdr&&raOK)Tt(fmtN(Math.round(agl/10)*10)+'R',7.4,1.6,'center');
      {const vs=Math.round(P.vel.y*196.85/10)*10;Tt(vs>32999?'XXXX':vs<-9999?'-XXXX':String(vs),7.4,-3.3,'center');}
      // α (units), Mach, g, peak g
      if(!(gear&&tcUnits(P)>14&&tcUnits(P)<16))Tt('α '+tcUnits(P).toFixed(1),-9.3,-3.6);
      if(!gear)Tt('M '+P.mach.toFixed(2),-9.3,-4.6);
      const n=P.nz,show=gear?(n<.5||n>1.5):(n<-2||n>4.5);if(show)Tt('G '+n.toFixed(1),-9.3,gear?-4.6:-5.6);
      if(gear?(P.maxNz>2):(P.maxNz>4.5))Tt('  '+P.maxNz.toFixed(1),-9.3,gear?-5.6:-6.6);
      // bank scale and pointer at the bottom
      {const C=hb(0,-3.4),R=ppd*6.4;if(C){[0,10,20,30,45].forEach(b=>[1,-1].forEach(s=>{if(!b&&s<0)return;const a=Math.PI/2+s*b*D2R,l=b===30?11:b===0?0:7,x=C.x+Math.cos(a)*R,y=C.y+Math.sin(a)*R;
          if(b)line(x,y,x+Math.cos(a)*l,y+Math.sin(a)*l);else{line(x,y+2,x,y+12);}}));
        const bk=clamp(P.bank*R2D,-50,50),pegged=Math.abs(P.bank*R2D)>45;if(!pegged||blink){const a=Math.PI/2-bk*D2R,x=C.x+Math.cos(a)*(R-4),y=C.y+Math.sin(a)*(R-4),ux=Math.cos(a),uy=Math.sin(a),px=-uy,py=ux;
          hx.beginPath();hx.moveTo(x,y);hx.lineTo(x-ux*10+px*5,y-uy*10+py*5);hx.lineTo(x-ux*10-px*5,y-uy*10-py*5);hx.closePath();hx.stroke();}}}
      // warnings (two at a time, scrolling)
      {const W=[];if(P.hp<25)W.push('L FIRE');if(P.hp<22)W.push('R FIRE');if(tcUnits(P)>24&&P.cas<180)W.push('L STALL','R STALL');if(gear&&P.cas>280)W.push('RDC SPEED');
       if(W.length){const k=W.length>2?Math.floor(performance.now()/1000)%W.length:0;for(let i=0;i<Math.min(2,W.length);i++)Tt(W[(k+i)%W.length],0,-5.6-i*1.05,'center');}}
      // nav source and ZTOD clock, lower right
      {const d=new Date(),p2=v=>String(v).padStart(2,'0');Tt('ZTOD '+p2(d.getUTCHours())+':'+p2(d.getUTCMinutes())+':'+p2(d.getUTCSeconds()),2.4,-9.9);
       const wp=typeof NAV!=='undefined'&&NAV.wp?NAV.wp():null;if(wp)Tt('WPT '+(wp.n||1)+'  '+(wp.d/NM).toFixed(1),2.4,-8.9);}
      if(window.TCS&&TCS.los&&TCS.los.trk){const s=proj(TCS.los.p);if(s){hx.setLineDash([3,3]);circ(s.x,s.y,9);hx.setLineDash([]);}}
      if(!AA)return;
      // ---- A/A ----
      const leg=gun?'G'+(P.gun?P.gun.ammo:0):wd?({ARH:'PH',SARH:'SP',IR:'SW'}[wd.seek]||'')+P.count(w):'A/A';Tt(leg,-9.3,-8.9);if(!arm){const p=hb(-9.3,-8.9);if(p){line(p.x-4,p.y-14,p.x+40,p.y+6);line(p.x-4,p.y+6,p.x+40,p.y-14);}}
      if(L){const dist=L.pos.distanceTo(P.pos),los=L.pos.clone().sub(P.pos).normalize(),vc=P.vel.dot(los)-L.vel.dot(los),s=proj(L.pos);
        if(s)hx.strokeRect(s.x-9,s.y-9,18,18);else if(bs){const cm=pcam||camera,rel=L.pos.clone().sub(cm.position).applyQuaternion(qInv(cm.quaternion)),an=Math.atan2(-rel.y,rel.x);line(bs.x,bs.y,bs.x+Math.cos(an)*60,bs.y+Math.sin(an)*60);}
        if(!radar.noRng){Tt('RNG '+(dist/NM).toFixed(1),7.4,-5.0,'center');Tt(String(Math.round(vc*KT))+'Vc',7.4,-6.0,'center');}
        Tt(Math.round(L.pos.y*FT/1000)+'K',7.4,-7.0,'center');{const id=L.type&&typeof NCTR_ID!=='undefined'?NCTR_ID[L.type]:'';if(id&&radar.mode==='STT')Tt(id,7.4,-8.0,'center');}
        if(wd&&wd.seek!=='IR'&&bs&&!radar.noRng){const z=dlzGet(w,L),r=dist+radar.rngErr;if(r<z.rmin)cue('BREAK X');else if(r<=z.rmax&&arm)cue('SHOOT');}
        if(radar.hoj)Tt('HOJ',0,-7.8,'center');}
      if(wd&&wd.seek==='IR'){const Tg=irTarget(w),s=Tg?proj(Tg.pos):bs;if(s){circ(s.x,s.y,ppd*1.4);}if(Tg&&arm&&L&&L.pos.distanceTo(P.pos)<dlzGet(w,L).rmax)cue('SHOOT');}
      if(gun){const dist=L?L.pos.distanceTo(P.pos):0;
        if(L&&dist<3000&&!radar.noRng){const s=proj(gunSol(P,L).aim);if(s){circ(s.x,s.y,22);hx.beginPath();hx.arc(s.x,s.y,2,0,7);hx.fill();hx.lineWidth=3;hx.beginPath();hx.arc(s.x,s.y,18,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(dist/3658,0,1));hx.stroke();hx.lineWidth=1.4;}if(dist<1200)cue('SHOOT');}
        else{const hw=WSPAN[sys.hud.ws]*.1524,lp=[],rp=[];for(let rr=200;rr<=1300;rr+=110){const pt=gunFun(P,rr);const a=proj(pt.clone().addScaledVector(rt,-hw)),b=proj(pt.clone().addScaledVector(rt,hw));if(a&&b){lp.push(a);rp.push(b);}}
          [lp,rp].forEach(arr=>{if(arr.length<2)return;hx.beginPath();arr.forEach((p,i)=>i?hx.lineTo(p.x,p.y):hx.moveTo(p.x,p.y));hx.stroke();});}}
    }
    {const _t=drawTomcatHud;drawTomcatHud=function(P,fs,lh){if(P&&P.type==='F-14D'){try{return drawF14DHud(P,fs,lh);}catch(e){console.warn('F-14D HUD',e);}}return _t.apply(this,arguments);};}
    window.drawF14DHud=drawF14DHud;

    // ---- per-frame work and the cockpit switch ----
    (V.anims||[]).push(()=>{if(!DG.visible||!player)return;try{const P=player;paintMFD(0,P);paintMFD(1,P);mfdTx[0].needsUpdate=mfdTx[1].needsUpdate=true;paintMS(P);
      for(const q of feeds){const v=q.cv._ver;if(v===undefined||v!==q.v){q.v=v;q.t.needsUpdate=true;}}}catch(e){}});
    {const _sc=selectCockpit;selectCockpit=function(kind,pit){const r=_sc.apply(this,arguments);try{const on=kind==='viper'&&isD();DG.visible=DH.visible=on;for(const o of hideA)o.visible=!on&&o.userData._v!==false;
      if(on){V.glass=dGlass;if(!(F.fmt[0]in FAM)&&!(F.fmt[1]in FAM)){}SV.tHm=FAM[F.fmt[1]]??FAM[F.fmt[0]]??0;}}catch(e){}return r;};}
    ACROLE['F-14D']='US · FLEET DEFENCE · APG-71 · AAS-42 IRST + TCS · DIGITAL HUD · 2 MFDs';
    }catch(e){console.warn('v223 F-14D',e);}
  }
 }
});
