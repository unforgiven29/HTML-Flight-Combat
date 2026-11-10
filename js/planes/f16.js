"use strict";
/* =====================================================================================================================
   F-16A ADF / F-16C Block 50 — everything that belongs to this jet family, split out of game.js (v258).
   Loaded BEFORE game.js (after js/planes/registry.js). Nothing here runs against game.js state at load time:
     * top-level declarations below are pure data (station layouts, store lists) or functions (model builder, cockpit/MFD code);
     * `tables` are thunks. game.js calls PLANES.apply('<TABLE>',<TABLE>) right after it declares each table, which merges
       these entries in at the same point the old inline literal used to be evaluated;
     * `hooks` are the one-off statements that used to sit inline in game.js (variants, cockpit builders, HUD/MFD patches).
       game.js calls PLANES.run('f16','<tag>') at the exact spot each one was cut from, so execution order is unchanged.
   Type ids in this file: F-16, F-16C
   ===================================================================================================================== */
// station positions [x, y, z]
const F16ST={1:[-5.05,0,2.5],2:[-4.2,-.34,2.3],3:[-3.3,-.34,2.0],4:[-2.3,-.78,1.0],6:[2.3,-.78,1.0],7:[3.3,-.34,2.0],8:[4.2,-.34,2.3],9:[5.05,0,2.5]};
function makeF16(){
  const grp=new THREE.Group(),mat=SKIN(0x838b93),dk=SKIN(0x666e76),blk=SKIN(0x1c1f22,10),rad=SKIN(0x7a8189,20),met=SKIN(0x5a5550,60);
  // fuselage: radome, cockpit, spine and tail cone
  grp.add(new THREE.Mesh(sloft([[-9.35,.02,.06,.02,2],[-9.0,.2,.06,.19,2],[-8.4,.37,.07,.35,2.1],[-7.6,.5,.1,.48,2.2],[-6.6,.6,.14,.6,2.3],[-5.6,.65,.18,.66,2.5],
    [-4.6,.68,.18,.7,2.6],[-3.5,.72,.13,.72,2.9],[-2.2,.8,.08,.72,3.2],[-.8,.86,.06,.72,3.4],[1.2,.87,.06,.7,3.4],[3.2,.84,.08,.66,3.2],[4.6,.77,.1,.6,2.9],[5.8,.68,.12,.56,2.5],[6.9,.6,.13,.55,2.1],[7.2,.57,.13,.54,2]]),mat));
  grp.add(new THREE.Mesh(loft([[-9.37,.022,.06,.022,2],[-9.0,.205,.06,.195,2],[-8.4,.375,.07,.355,2.1],[-7.75,.485,.095,.47,2.2]],40,false,false),rad));
  rim(grp,.488,.025,dk,0,.095,-7.74,1,.97);
  // chin intake: rounded duct, torus lip around the smile-shaped mouth
  grp.add(new THREE.Mesh(sloft([[-3.85,.5,-.88,.33,2.7],[-3.2,.53,-.86,.35,2.7],[-1.6,.52,-.8,.32,2.9],[.4,.48,-.68,.26,3],[2.2,.4,-.52,.18,3]],32,false,true),mat));
  intake(grp,0,-.88,-3.86,.48,.31,mat,blk);
  // LERX + wing as one blended planform, horizontal stabs (slight anhedral), fin, ventral fins
  const wing=planform([[.55,-5.6],[.8,-4.2],[1.02,-2.4],[1.3,-1.05],[4.9,2.2],[4.95,3.35],[.75,3.75]],.13,true,mat);wing.position.y=-.02;grp.add(wing);
  for(const sd of[-1,1]){const st=planform([[.5,4.5],[3.05,6.5],[3.1,7.35],[.5,7.45]],.08,false,mat);st.scale.x=sd;st.position.y=-.06;st.rotation.z=sd*-.1;grp.add(st);}
  grp.add(finShape([[1.6,.72],[2.9,.86],[5.9,3.6],[7.0,3.62],[7.25,1.0],[7.15,.7]],.14,mat));
  pod(grp,1.3,.09,dk,0,3.58,6.45,1,1);// fin-tip antenna fairing
  pod(grp,2.6,.2,mat,0,.86,6.0,.8,.6);// drag-chute / ECM housing at the fin root
  grp.add(new THREE.Mesh(sloft([[2.6,.02,.82,.02,2],[3.4,.16,.8,.1,2],[6.2,.16,.8,.1,2],[7.2,.1,.78,.06,2]],16),mat));
  for(const sd of[-1,1]){const v=finShape([[4.0,-.45],[5.4,-1.05],[5.85,-1.05],[5.6,-.45]],.05,mat);v.position.x=sd*.42;v.rotation.z=sd*.32;grp.add(v);}
  // canopy: gold-tinted bubble, bow frame and sill rails
  canopy(grp,0x8a7a40,.52,.5,2.15,.84,-4.25,dk);
  // nozzle, speed brakes, nose probe, blade antennas, nav lights
  nozzle(grp,0,0,7.75,.55,.47,1.15,met,dk);
  for(const sd of[-1,1])pod(grp,1.3,.45,dk,sd*.68,.13,6.9,.14,1);
  rod(grp,[0,.06,-9.3],[0,.06,-10.1],.022,met,1,[0,1,0],8);ball(grp,.035,met,0,.06,-10.1);
  rod(grp,[0,.94,-1.4],[0,1.12,-1.1],.05,dk,.35,[1,0,0],8);rod(grp,[0,-.62,-2.0],[0,-.78,-1.75],.04,dk,.35,[1,0,0],8);
  navLight(0xff2a1a,-4.95,0,1.0,grp);navLight(0x22ff55,4.95,0,1.0,grp);
  const ab=abPlume(5.2,.48);ab.position.z=8.25;grp.add(ab);grp.userData.ab=ab;
  pylons(grp,F16ST,[],SKIN(0x7c848c),x=>-.06);
  return bake(grp,[ab]);}
const isViperFam=()=>!!player&&(player.type==='F-16'||player.type==='F-16C');
/* ---- the F-16C airframe: the A's aerodynamics and calibrated drag, Block 50 engine, weights, radar and stations ---- */
const F16CST=Object.assign({},F16ST,{'5R':[.62,-1.0,-1.6]});
/* ---- F-16C MFDs ---- */
const F16M={L:{pages:['FCR','TGP','TEST'],sel:0},R:{pages:['SMS','HSD','WPN'],sel:0},last:null};
// OSB numbering as on the jet: 1-5 top (left to right), 6-10 right (top to bottom), 11-15 bottom (right to left), 16-20 left (bottom to top)
const osbXY=n=>{const o=i=>66+i*57;if(n<=5)return[o(n-1),14];if(n<=10)return[346,o(n-6)];if(n<=15)return[o(15-n),346];return[14,o(20-n)];};
function f16Osb(c,n,t,on){const[x,y]=osbXY(n);c.font='700 15px "B612 Mono",monospace';c.textAlign='center';c.textBaseline='middle';const lines=String(t).split('\n');
  lines.forEach((s,i)=>{const yy=y+(n>5&&n<11||n>15?(i-(lines.length-1)/2)*16:(n<=5?i*16:-i*16));if(on){const w=c.measureText(s).width+8;c.fillStyle=MF;c.fillRect(x-w/2,yy-9,w,18);c.fillStyle='#000';}else c.fillStyle=MF;c.fillText(s,x,yy);});}
function f16Page(side){const M=F16M[side];return M.pages[M.sel];}
function f16MfdDraw(side,cv){const c=cv.getContext('2d'),S=360,P=player,pg=f16Page(side);c.save();
  if(!P||!P.alive){c.fillStyle='#000';c.fillRect(0,0,S,S);c.restore();return;}
  if(pg==='FCR'){c.drawImage(fcrC,0,0,S,S);}
  else if(pg==='SMS'){c.drawImage(smsC,0,0,S,S);}
  else if(pg==='TGP'||pg==='WPN'){SNS.drawPage(c,S,pg,30);}
  else{c.fillStyle='#020604';c.fillRect(0,0,S,S);if(pg==='HSD'){c.globalAlpha=.9;hornHSI(c,S,P);c.globalAlpha=1;}else{c.font='700 20px "B612 Mono",monospace';c.fillStyle=MF;c.textAlign='center';c.fillText(pg==='TEST'?'BIT1  BIT2  CLR':'DTE  LOAD',S/2,S/2);}}
  // OSB legends: page row at the bottom, page controls on top
  if(pg!=='FCR'&&pg!=='SMS'){c.fillStyle='rgba(0,0,0,.55)';c.fillRect(0,330,S,30);}
  const M=F16M[side];f16Osb(c,15,'SWAP');M.pages.forEach((q,i)=>f16Osb(c,14-i,q,i===M.sel));f16Osb(c,11,'DCLT');
  if(pg==='TGP'){f16Osb(c,1,'A-G');f16Osb(c,2,SNS.mode);f16Osb(c,3,SNS.nar?'NARO':'WIDE');f16Osb(c,6,SNS.laseMan?'LSR\nARM':'LSR\nSAFE',SNS.laseMan);f16Osb(c,20,'TV');}
  if(pg==='WPN'){const a=AGW[game.wsel];f16Osb(c,1,'A-G');f16Osb(c,2,SNS.mav?'TRK':'SLEW');f16Osb(c,3,SNS.nar?'NARO':'WIDE');f16Osb(c,4,'BORE');f16Osb(c,20,a&&a.k==='agm'?SN[game.wsel]:'--');}
  c.restore();}
function f16MfdClick(id,x,y){const side=id==='f16L'?'L':'R',M=F16M[side];let n=0,bd=1e9;for(let i=1;i<=20;i++){const[ox,oy]=osbXY(i),d=Math.hypot(ox-x,oy-y);if(d<bd){bd=d;n=i;}}if(bd>34)return;sfx.click();
  if(n===15){const t=F16M.L;F16M.L=F16M.R;F16M.R=t;return;}
  if(n>=12&&n<=14){const i=14-n;if(M.sel===i){// pressing the selected page again opens the page menu: cycle what that slot shows
      const all=['FCR','TGP','WPN','SMS','HSD','TEST','DTE'],cur=M.pages[i];M.pages[i]=all[(all.indexOf(cur)+1)%all.length];}else M.sel=i;return;}
  const pg=f16Page(side);
  if((pg==='TGP'||pg==='WPN')&&n===3)SNS.nar=!SNS.nar;if(pg==='TGP'&&n===6)SNS.laserKey();if((pg==='TGP'||pg==='WPN')&&n===2)SNS.tms();if(pg==='WPN'&&n===4)SNS.bore();}
// ICP (static key layout from the jet) and DED (UHF / VHF, steerpoint, time, master mode, TACAN)
function f16IcpDraw(c){const W=384,H=232;c.fillStyle='#1d2125';c.fillRect(0,0,W,H);c.strokeStyle='#3a4248';c.lineWidth=3;c.strokeRect(2,2,W-4,H-4);
  const key=(x,y,w,h,t,round)=>{c.fillStyle='#c9ccc4';if(round){c.beginPath();c.arc(x+w/2,y+h/2,w/2,0,7);c.fill();}else c.fillRect(x,y,w,h);c.fillStyle='#14171a';c.font='700 15px "B612",sans-serif';c.textAlign='center';c.textBaseline='middle';
    String(t).split('\n').forEach((s,i,a)=>c.fillText(s,x+w/2,y+h/2+(i-(a.length-1)/2)*15));};
  ['COM\n1','COM\n2','IFF','LIST','A-A','A-G'].forEach((t,i)=>key(22+i*58,10,42,42,t,true));
  [['T-ILS\n1','ALOW\n2','3'],['STPT\n4','CRUS\n5','TIME\n6'],['MARK\n7','FIX\n8','A-CAL\n9']].forEach((r,j)=>r.forEach((t,i)=>key(92+i*62,64+j*52,50,42,t)));
  [['RCL',300,64],['ENTR',300,116],['M-SEL\n0',154,220]].slice(0,2).forEach(([t,x,y])=>key(x,y,56,42,t));
  c.fillStyle='#e6e8e2';c.font='700 13px "B612",sans-serif';c.textAlign='center';['SYM','BRT'].forEach((t,i)=>c.fillText(t,40,96+i*70));c.fillText('DRIFT C/O',330,190);c.fillText('WARN RESET',330,212);}
function f16DedDraw(c){const W=320,H=96,P=player;c.fillStyle='#071108';c.fillRect(0,0,W,H);c.fillStyle='#62ff7a';c.font='700 20px "B612 Mono",monospace';c.textAlign='left';c.textBaseline='middle';
  const d=new Date(),t=[d.getHours(),d.getMinutes(),d.getSeconds()].map(x=>String(x).padStart(2,'0')).join(':');
  const ag=AGW[game.wsel]&&AGW[game.wsel].k!=='tgp';c.fillText('UHF  305.00  STPT  1',10,18);c.fillText('VHF  127.00  '+t,10,48);c.fillText((ag?'A-G':'NAV')+'  M 4 1337   T 1X',10,78);}
function f16cDraw(){const P=player,V5=window.F16CV;if(!P||P.type!=='F-16C'||!V5)return;
  // master-mode reconfiguration: a guided A-G store puts its sensor page up on the right display
  const want=SNS.ckPage();if(want&&want!==F16M.last){const R=F16M.R;let i=R.pages.indexOf(want);if(i<0){R.pages[2]=want;i=2;}R.sel=i;}F16M.last=want;
  f16MfdDraw('L',V5.L);f16MfdDraw('R',V5.R);if(!V5._icp){f16IcpDraw(V5.icp.getContext('2d'));V5._icp=1;}f16DedDraw(V5.ded.getContext('2d'));
  for(const cv of[V5.L,V5.R,V5.ded])cv._ver=(cv._ver||0)+1;}
// show / hide the Block 50 panel against the A's parts
function F16Ck(){const V5=window.F16CV;if(!V5)return;const c=!!player&&player.type==='F-16C';for(const o of V5.only)o.visible=c;if(c||(player&&!player.ac.pit))for(const o of V5.hide)o.visible=!c;}
// Block 50 VVI: vertical tape, thousands of ft/min, fixed index; LASER ARM gates the pod's laser
function f16VviDraw(c){const P=player,W=64,H=256;c.fillStyle='#101214';c.fillRect(0,0,W,H);if(!P)return;const fpm=P.vel.y*196.85,px=H/10;c.save();c.translate(0,H/2);
  c.fillStyle='#e8eae4';c.strokeStyle='#e8eae4';c.font='700 16px "B612",sans-serif';c.textAlign='left';c.textBaseline='middle';
  for(let v=-60;v<=60;v+=5){const y=(v/10-fpm/1000)*-px;if(Math.abs(y)>H/2)continue;c.lineWidth=2;c.beginPath();c.moveTo(4,y);c.lineTo(v%10?16:24,y);c.stroke();if(v%10===0)c.fillText(String(Math.abs(v/10)),30,y);}
  c.fillStyle='#ffb020';c.beginPath();c.moveTo(W-2,0);c.lineTo(W-16,-7);c.lineTo(W-16,7);c.closePath();c.fill();c.fillRect(0,-1,W-16,2);c.restore();}
/* ============ F-16C MFD formats, after the DCS F-16C guide (Multi-Function Displays, FCR, TGP, WPN, SMS, HSD chapters) ============
   OSB 1-5 top (left→right), 6-10 right (top→bottom), 11-15 bottom (right→left), 16-20 left (bottom→top).
   Bottom row: OSB 15 SWAP, OSB 14 / 13 / 12 format select, OSB 11 DCLT. Pressing the selected format button again opens the Master Menu:
   OSB 1 BLANK, 2 HAD, 4 RCCE, 5 RESET MENU; left 20 FCR, 19 TGP, 18 WPN, 17 TFR, 16 FLIR; right 6 SMS, 7 HSD, 8 DTE, 9 TEST, 10 FLCS.
   Legends are white; an enabled option is shown in inverse video. Rockers: GAIN, SYM, BRT, CON. */
const MFDW='#e8ece6',MFDG='#ffffff';
const F16M2={L:{slots:['FCR','TGP','TEST'],sel:0,menu:false,dclt:false,brt:1,sym:1,con:1,gain:1,cntl:false,tmode:null},
  R:{slots:['SMS','HSD','WPN'],sel:0,menu:false,dclt:false,brt:1,sym:1,con:1,gain:1,cntl:false,tmode:null},last:null,tgpSens:'TV',tgpOvrd:false,wpnMode:'PRE',fcrExp:false,fcrOvrd:false,hsdRng:3,hsdDep:true};
const MENU_MAP={1:'BLANK',2:'HAD',4:'RCCE',5:'RESET',20:'FCR',19:'TGP',18:'WPN',17:'TFR',16:'FLIR',6:'SMS',7:'HSD',8:'DTE',9:'TEST',10:'FLCS'};
const slotOsb=[14,13,12];
function m2leg(c,n,t,inv,col=MFDW){const[x,y]=osbXY(n);c.font='700 15px "B612 Mono",monospace';c.textAlign='center';c.textBaseline='middle';
  const lines=String(t).split('\n'),side=n>5&&n<11?1:n>15?-1:0,base=side?x+side*-8:x;
  lines.forEach((s,i)=>{const yy=y+(side?(i-(lines.length-1)/2)*16:(n<=5?4+i*16:-4-i*16)),xx=side===1?x-6:side===-1?x+6:x,al=side===1?'right':side===-1?'left':'center';c.textAlign=al;
    const w=c.measureText(s).width+6,bx=al==='right'?xx-w+3:al==='left'?xx-3:xx-w/2;
    if(inv){c.fillStyle=col;c.fillRect(bx,yy-9,w,18);c.fillStyle='#000';}else c.fillStyle=col;c.fillText(s,xx,yy);});}
const m2pg=s=>{const M=F16M2[s];return M.slots[M.sel];};
function m2edge(c){c.fillStyle='#000';c.fillRect(0,0,360,34);c.fillRect(0,326,360,34);c.fillRect(0,0,34,360);c.fillRect(326,0,34,360);}
function m2bottom(c,s){const M=F16M2[s];m2leg(c,15,'SWAP');M.slots.forEach((q,i)=>m2leg(c,slotOsb[i],q==='BLANK'?'':q,i===M.sel));m2leg(c,11,'DCLT',M.dclt);}
// ---- formats ----
function m2FCR(c,S,s){const M=F16M2[s];c.drawImage(fcrC,0,0,S,S);m2edge(c);
  const acm=radar.mode==='ACM',sub=acm?({'30x20':'20',VERT:'60',BORE:'BORE'}[radar.acm]||'20'):radar.mode==='TWS'?'TWS':'RWS';
  m2leg(c,1,acm?'ACM':'CRM');m2leg(c,2,sub);m2leg(c,3,F16M2.fcrExp?'EXP':'NORM');m2leg(c,4,'OVRD',F16M2.fcrOvrd||radar.power!=='ON');m2leg(c,5,'CNTL',M.cntl);
  if(!M.dclt){const rn=radar.ranges[radar.ri];c.fillStyle=MFDW;c.font='700 16px "B612 Mono",monospace';c.textAlign='left';
    // range scale between the arrows (OSB 20 up, OSB 19 down), azimuth (OSB 18) and bars (OSB 17)
    const[ax,ay]=osbXY(20),[bx,by]=osbXY(19);c.beginPath();c.moveTo(ax+4,ay+6);c.lineTo(ax+12,ay-6);c.lineTo(ax+20,ay+6);c.closePath();c.fill();c.beginPath();c.moveTo(bx+4,by-6);c.lineTo(bx+12,by+6);c.lineTo(bx+20,by-6);c.closePath();c.fill();
    c.fillText(String(rn),ax+2,(ay+by)/2);m2leg(c,18,'A'+radar.azs[radar.ai]/10);m2leg(c,17,radar.barsL[radar.bi]+'B');}
  if(M.cntl){c.fillStyle='rgba(0,0,0,.85)';c.fillRect(40,40,280,240);c.fillStyle=MFDW;c.font='700 16px "B612 Mono",monospace';c.textAlign='left';
    ['FCR CONTROL','PRF   '+radar.prf,'GAIN  '+Math.round(sys.fcr.gain*100),'TGT HIS  1','CH    4'].forEach((t,i)=>c.fillText(t,60,70+i*26));}}
function m2SMS(c,S,s){const P=player,M=F16M2[s];c.fillStyle='#000';c.fillRect(0,0,S,S);const w=game.wsel,ag=AGW[w],cat=w==='GUN'?'GUN':ag?'A-G':'AAM';
  m2leg(c,1,cat);m2leg(c,4,'INV',M.cntl);m2leg(c,5,'S-J');
  const types=[...P.missileTypes(),...agTypes(P)];const L=[20,19,18,17,16];types.slice(0,5).forEach((t,i)=>m2leg(c,L[i],(t===w?'':'')+SN[t]+' '+(AGW[t]?agLeft(P,t):P.count(t)),t===w));
  m2leg(c,6,game.arm?'ARM':'SIM',game.arm);
  // station inventory (top view numbering 1-9)
  c.fillStyle=MFDW;c.font='700 15px "B612 Mono",monospace';c.textAlign='center';const st=Object.keys(P.ac.st).filter(k=>!/[a-z]$/.test(k)).sort((a,b)=>P.ac.st[a][0]-P.ac.st[b][0]);
  st.forEach((k,i)=>{const x=60+i*(240/Math.max(1,st.length-1)),t=P.load[k];if(t===w){c.fillStyle=MFDW;c.fillRect(x-14,137,28,26);c.fillStyle='#000';}else c.fillStyle=MFDW;c.fillText(k,x,150);c.fillStyle=MFDW;const n=t?1+['b','c'].filter(s2=>P.load[k+s2]===t).length:0;c.fillText(t?(n>1?n+' ':'')+(SN[t]||t):'—',x,176);});
  c.fillStyle=MFDW;c.fillText(w==='GUN'?'GUN  '+P.gun.ammo:SN[w]+'  '+(AGW[w]?agLeft(P,w):P.count(w))+' RDY',S/2,240);if(!game.arm)c.fillText('MASTER ARM OFF',S/2,268);}
function m2HSD(c,S,s){const M=F16M2[s];c.fillStyle='#020604';c.fillRect(0,0,S,S);c.save();if(!F16M2.hsdDep){c.translate(0,-50);}hornHSI(c,S,player);c.restore();m2edge(c);
  m2leg(c,1,F16M2.hsdDep?'DEP':'CEN');m2leg(c,3,'NORM');m2leg(c,5,'CNTL',M.cntl);
  const r=[5,10,20,40,80,160][F16M2.hsdRng];const[ax,ay]=osbXY(20),[bx,by]=osbXY(19);c.fillStyle=MFDW;c.beginPath();c.moveTo(ax+4,ay+6);c.lineTo(ax+12,ay-6);c.lineTo(ax+20,ay+6);c.closePath();c.fill();c.beginPath();c.moveTo(bx+4,by-6);c.lineTo(bx+12,by+6);c.lineTo(bx+20,by-6);c.closePath();c.fill();
  c.font='700 16px "B612 Mono",monospace';c.textAlign='left';c.fillText(String(r),ax+2,(ay+by)/2);}
function m2TGP(c,S,s){const M=F16M2[s];if(F16M2.tgpOvrd||!SNS.hasPod(player)){c.fillStyle='#000';c.fillRect(0,0,S,S);c.fillStyle=MFDW;c.font='700 18px "B612 Mono",monospace';c.textAlign='center';c.fillText(SNS.hasPod(player)?'STBY':'NOT TIMED OUT',S/2,S/2);}
  else{SNS.drawPage(c,S,'TGP',30);if(F16M2.tgpSens!=='TV'){/* white-hot / black-hot: invert the grey video for black-hot */if(F16M2.tgpSens==='BHOT'){const d=c.getImageData(30,30,S-60,S-60);for(let i=0;i<d.data.length;i+=4){d.data[i]=d.data[i+1]=d.data[i+2]=255-d.data[i];}c.putImageData(d,30,30);}}}
  m2edge(c);const mode=M.tmode||'A-G';m2leg(c,1,M.tmode==='menu'?'A-G':mode);m2leg(c,2,F16M2.tgpSens);m2leg(c,3,SNS.nar?'NARO':'WIDE');m2leg(c,4,'OVRD',F16M2.tgpOvrd);m2leg(c,5,'CNTL',M.cntl);
  if(!M.dclt){const P=player,sp=SNS.spi;if(sp){const lat=36+sp.z/-111000,lon=-115+sp.x/89000,fm=v=>{const a=Math.abs(v),d=Math.floor(a),m=(a-d)*60;return d+'°'+m.toFixed(3)+"'";};
      c.fillStyle=MFDW;c.font='700 13px "B612 Mono",monospace';c.textAlign='right';c.fillText('N '+fm(lat),322,62);c.fillText('W '+fm(lon),322,78);c.fillText(Math.round(sp.y*3.281)+"'",322,94);c.fillText(SNS.mode==='POINT'?'HQ':'MQ',322,112);
      c.fillText(Math.round((P.pos.y-groundAt(P.pos.x,P.pos.z))*3.281)+'R',322,300);}
    if(SNS.lase&&blink){c.fillStyle=MFDW;c.font='700 18px "B612 Mono",monospace';c.textAlign='center';c.fillText('L',S/2,56);}else if(player.type==='F-16C'&&!sys.v.larm){c.fillStyle=MFDW;c.font='700 13px "B612 Mono",monospace';c.textAlign='center';c.fillText('LASER OFF',S/2,56);}}
  if(M.tmode==='menu'){c.fillStyle='rgba(0,0,0,.8)';c.fillRect(34,34,292,292);m2leg(c,20,'A-A');m2leg(c,6,'A-G',true);m2leg(c,8,'STBY');}
  if(M.cntl){c.fillStyle='rgba(0,0,0,.85)';c.fillRect(40,60,280,200);c.fillStyle=MFDW;c.font='700 15px "B612 Mono",monospace';c.textAlign='left';
    ['TGP CONTROL','LSR CODE  1688','LSR ST TIME  '+(15),'LASER  '+(sys.v.larm?'ARM':'SAFE'),'TV  ON   XR  OFF'].forEach((t,i)=>c.fillText(t,56,90+i*28));}}
function m2WPN(c,S,s){const M=F16M2[s],a=AGW[game.wsel];if(!a||a.k!=='agm'){c.fillStyle='#000';c.fillRect(0,0,S,S);m2leg(c,1,'STBY');c.fillStyle=MFDW;c.font='700 18px "B612 Mono",monospace';c.textAlign='center';c.fillText('NO WPN',S/2,S/2);return;}
  SNS.drawPage(c,S,'WPN',30);m2edge(c);m2leg(c,1,'OPER');m2leg(c,2,F16M2.wpnMode);m2leg(c,3,SNS.nar?'NARO':'WIDE');m2leg(c,4,'BORE');m2leg(c,5,'CNTL',M.cntl);m2leg(c,20,'RIPL\n1');}
function m2Text(c,S,pg){c.fillStyle='#000';c.fillRect(0,0,S,S);if(pg==='BLANK')return;c.fillStyle=MFDW;c.font='700 16px "B612 Mono",monospace';c.textAlign='center';
  const T={TEST:['MFL','BIT1 BIT2  CLR','NO FAULTS'],DTE:['DTE','LOAD','MPD  COMM  NAV'],FLCS:['FLCS','PFL  NONE','R/G  OK'],HAD:['HAD','NO HTS POD'],TFR:['TFR','NOT INSTALLED'],FLIR:['FLIR','NOT INSTALLED'],RCCE:['RCCE','NOT INSTALLED'],RESET:['RESET MENU','SBRT DFLT','MBRT DFLT']}[pg]||[pg];
  T.forEach((t,i)=>c.fillText(t,S/2,130+i*30));}
function m2Menu(c,S,s){c.fillStyle='#000';c.fillRect(0,0,S,S);const cur=m2pg(s);for(const [n,f] of Object.entries(MENU_MAP))m2leg(c,+n,f==='RESET'?'RESET\nMENU':f,f===cur);}

PLANES.add('f16',{
 ids:["F-16","F-16C"],
 tables:{
  AC:()=>({
    'F-16':{name:'F-16A ADF',model:makeF16,st:F16ST,empty:7600,fuel:3160,tank:1130,S:27.87,CLa:4.4,cd0:.0175,k:.117,mil:64900,ab:105700,spool:1.6,
        // CL vs AoA (deg) with LEF scheduled, after NASA TP-1538 F-16 simulator data; wave-drag rise vs Mach
        clt:[[-20,-1],[-10,-.6],[0,.05],[5,.41],[10,.78],[15,1.1],[20,1.34],[25,1.49],[30,1.56],[35,1.58],[40,1.52],[50,1.3],[60,1.05],[90,0]],
        cdm:[[0,0],[.8,0],[.9,.004],[1,.019],[1.1,.027],[1.3,.026],[2,.021]],dW:12000,tkG:[7,7.3],dep:{a:32,rock:.9,spin:2.8},
        ff:[.15,1.6,7.3],gLim:9,aoaLim:25,roll:5.2,fbw:true,rcs:1.5,irs:1,cockpit:'viper',units:'imp',
        radar:{name:'APG-66(V)1',R0:38*NM,ranges:[10,20,40,80],unit:NM,ul:'NM',ecc:.6},irst:false,
        gun:{name:'M61A1',rate:100,v:1050,dmg:9,ammo:510,spread:.0022},rel:[1,9,2,8,3,7],keepJ:['1','9'],rwr:'16',spo:4,tankName:'370 gal tank'}
  }),
  ENG_SUP:()=>({
    'F-16A ADF':.092,
    'F-16C Block 50':.091
  }),
  FOE:()=>({
    'F-16':'MiG-29'
  }),
  LOAD:()=>({
    cold:{
      'F-16':{1:'AIM-9M',2:'AIM-9M',3:'AIM-7M',4:'TK',6:'TK',7:'AIM-7M',8:'AIM-9M',9:'AIM-9M'}
    },
    modern:{
      'F-16':{1:'AIM-9X',2:'AIM-120C',3:'AIM-120C',4:'TK',6:'TK',7:'AIM-120C',8:'AIM-120C',9:'AIM-9X'}
    },
    guns:{
      'F-16':{4:'TK',6:'TK'}
    }
  }),
  CMS:()=>({
    cold:{
      'F-16':[30,30]
    },
    modern:{
      'F-16':[60,60]
    }
  }),
  ECM_FIT:()=>({
    'F-16':{cold:{n:'ALQ-131(V)',jp:1,dec:.62,kg:300,cd:.0012,warm:20},modern:{n:'ALQ-184(V)',jp:1.5,dec:.8,kg:260,cd:.0011,warm:15}}
  }),
  RWR_OF:()=>({
    'F-16':'ALR-69',
    'F-16C':'ALR-56M'
  }),
  NCTR_ID:()=>({
    'F-16':'F-16'
  }),
  STN:()=>({
    'F-16':{1:['AIM-9L','AIM-9M','AIM-9X','AIM-120C'],2:['AIM-9L','AIM-9M','AIM-9X','AIM-120C'],3:['AIM-9L','AIM-9M','AIM-9X','AIM-7F','AIM-7M','AIM-7P','AIM-120C'],4:['TK'],
                       6:['TK'],7:['AIM-9L','AIM-9M','AIM-9X','AIM-7F','AIM-7M','AIM-7P','AIM-120C'],8:['AIM-9L','AIM-9M','AIM-9X','AIM-120C'],9:['AIM-9L','AIM-9M','AIM-9X','AIM-120C']}
  }),
  ACROLE:()=>({
    'F-16':'US · LIGHTWEIGHT'
  }),
  FV:()=>({
    'F-16':{hw:5.7,y1:3.4,span:'9.45 m',d:()=>one([[-.1,.5],[-.06,3.1],[.06,3.1],[.1,.5]],'sk-body')+bth([[-1,.02],[-2.85,-.02],[-2.85,-.14],[-1,-.22]],'sk-wing')+bth([[-.7,-.12],[-4.7,0],[-4.7,-.12],[-.7,-.45]],'sk-wing')+bth([[-4.7,.05],[-5.2,.05],[-5.2,-.08],[-4.7,-.08]],'sk-body')+ell(0,.08,.74,.72,'sk-body')+ell(0,-.56,.62,.44,'sk-dark')+ell(0,.66,.34,.4,'sk-can')}
  }),
  CALLS:()=>({
    'F-16':'VIPER'
  }),
  STRIKE_LOAD:()=>({
    'F-16':{1:'AIM-9M',9:'AIM-9M',3:'Mk-82',4:'Mk-82',6:'Mk-82',7:'Mk-82',2:'AIM-9M',8:'AIM-9M'}
  }),
  RACKS:()=>({
    'F-16': {st:['3','4','6','7'],subs:{b:[-.3,.2,0],c:[.3,.2,0]},cats:[{t:['Mk-82'],n:3,rack:'TER-9'},{t:['AGM-65D'],n:3,st:['3','7'],rack:'LAU-88'}]},
    'F-16C':{st:['3','4','6','7'],subs:{b:[-.3,.2,0],c:[.3,.2,0]},cats:[{t:['Mk-82'],n:3,rack:'TER-9'},{t:['GBU-12'],n:2,rack:'TER-9 (slant)'},{t:['AGM-65D'],n:3,st:['3','7'],rack:'LAU-88'}]}
  }),
  ENGN:()=>({
    'F-16':'F100-PW-200',
    'F-16C':'F110-GE-129'
  })
 },
 hooks:{
  /* game.js line 8518 */
  L8518(){
    AC['F-16C']=Object.assign({},AC['F-16'],{name:'F-16C Block 50',st:F16CST,empty:8570,fuel:3175,mil:76300,ab:131600,spool:1.5,rcs:1.6,
      radar:Object.assign({},AC['F-16'].radar,{name:'APG-68(V)5',R0:46*NM}),rel:[1,9,2,8,3,7,4,6],
      // the fixed normal-shock inlet, not the engine, sets the F-16's top speed (about Mach 2.05): ram thrust falls away past Mach 1.5
      abM:[[0,1],[.5,1.195],[1,1.36],[1.5,1.495],[2,1.3095],[2.5,1.02],[3,.7486]],cdm:[[0,0],[.8,0],[.9,.004],[1,.019],[1.1,.027],[1.3,.026],[1.6,.0239],[2,.021],[2.5,.0159],[3,.0129]]});
    for(const era of['cold','modern'])if(LOAD[era])LOAD[era]['F-16C']=era==='modern'?{1:'AIM-120C',9:'AIM-120C',2:'AIM-9X',8:'AIM-9X',3:'AIM-120C',7:'AIM-120C',4:'TK',6:'TK'}:{1:'AIM-9M',9:'AIM-9M',2:'AIM-9M',8:'AIM-9M',4:'TK',6:'TK'};
    if(LOAD.guns)LOAD.guns['F-16C']={4:'TK',6:'TK'};
    for(const era of Object.keys(CMS))if(CMS[era]['F-16'])CMS[era]['F-16C']=CMS[era]['F-16'].slice();
    FOE['F-16C']='MiG-29';
    NCTR_ID['F-16C']='F-16';
    CALLS['F-16C']='VIPER';
    ACROLE['F-16C']='US · MULTIROLE · BLOCK 50';
    FV['F-16C']=FV['F-16'];
    if(ECM_FIT['F-16'])ECM_FIT['F-16C']=ECM_FIT['F-16'];
    {const i=ACS.indexOf('F-16');if(!ACS.includes('F-16C'))ACS.splice(i+1,0,'F-16C');}
    {const W=['AIM-9L','AIM-9M','AIM-9X','AIM-120A','AIM-120B','AIM-120C'],AG=['Mk-82','GBU-12','AGM-65D'];
      STN['F-16C']={1:W,9:W,2:W,8:W,3:[...W,...AG],7:[...W,...AG],4:['TK',...AG],6:['TK',...AG],'5R':['TGP']};}
  },
  /* game.js line 8540 */
  L8540(){
    // F-16A ADF: the AMRAAM integration it got was the AIM-120A only; it also gets the LAU-88 three-round Maverick launcher on 3 / 7
    for(const k of Object.keys(STN['F-16']))STN['F-16'][k]=STN['F-16'][k].filter(t=>t!=='AIM-120B'&&t!=='AIM-120C');
    for(const k of['3','7'])if(!STN['F-16'][k].includes('AGM-65D'))STN['F-16'][k].push('AGM-65D');
    for(const era of Object.keys(LOAD))if(LOAD[era]&&LOAD[era]['F-16'])for(const k of Object.keys(LOAD[era]['F-16']))if(/^AIM-120[BC]$/.test(LOAD[era]['F-16'][k]))LOAD[era]['F-16'][k]='AIM-120A';
  },
  /* game.js line 8747 */
  L8747(){
    /* ---- F-16A ADF: Maverick video on the radar / electro-optical display ---- */
    {const _f=drawFCR;drawFCR=function(){const P=player;if(P&&P.type==='F-16'&&SNS.ckPage()==='WPN'){SNS.drawPage(fcr,360,'WPN',0);return;}return _f();};}
  },
  /* game.js line 8758 */
  L8758(){
{const _m=mfdClick;mfdClick=function(id,x,y){if(id==='f16L'||id==='f16R'){f16MfdClick(id,x,y);return;}if(id==='f16icp'){const cx=x/360*384,cy=y/360*232;if(cy>8&&cy<54){if(cx>252&&cx<298)setMM('AA');else if(cx>310&&cx<356)setMM('AG');}return;}return _m(id,x,y);};}
{const _v=drawViper;drawViper=function(){_v();f16cDraw();};}
{const _d=f16cDraw;f16cDraw=function(){_d();const V5=window.F16CV;if(V5&&player&&player.type==='F-16C'){f16VviDraw(V5.vvi.getContext('2d'));V5.vvi._ver=(V5.vvi._ver||0)+1;}};}
{const _t=SNS.tick.bind(SNS);SNS.tick=function(dt){_t(dt);const P=player;if(P&&P.type==='F-16C'&&!sys.v.larm){if(this.lase&&!this._lw){flash('LASER ARM OFF',1500);this._lw=1;}this.lase=false;}else this._lw=0;};}
f16MfdDraw=function(side,cv){const c=cv.getContext('2d'),S=360,P=player,M=F16M2[side];c.save();c.globalAlpha=1;
  if(!P||!P.alive){c.fillStyle='#000';c.fillRect(0,0,S,S);c.restore();return;}
  if(M.menu)m2Menu(c,S,side);else{const pg=m2pg(side);({FCR:m2FCR,SMS:m2SMS,HSD:m2HSD,TGP:m2TGP,WPN:m2WPN})[pg]?({FCR:m2FCR,SMS:m2SMS,HSD:m2HSD,TGP:m2TGP,WPN:m2WPN})[pg](c,S,side):m2Text(c,S,pg);}
  m2bottom(c,side);
  // BRT / CON rockers dim the whole picture; SYM is applied to the legends by the BRT overlay approximation
  if(M.brt<1){c.fillStyle=`rgba(0,0,0,${1-M.brt})`;c.fillRect(0,0,S,S);}c.restore();};
// ---- buttons ----
window.F16OSB=function(side,n){const M=F16M2[side],P=player;if(!P)return;sfx.click();
  if(n===15){const t=F16M2.L;F16M2.L=F16M2.R;F16M2.R=t;return;}
  if(n===11){M.dclt=!M.dclt;return;}
  if(M.menu){const f=MENU_MAP[n];if(f){M.slots[M.sel]=f;M.menu=false;}else if(slotOsb.includes(n))M.menu=false;return;}
  const si=slotOsb.indexOf(n);if(si>=0){if(M.sel===si)M.menu=true;else{M.sel=si;M.cntl=false;}return;}
  const pg=m2pg(side);
  if(pg==='FCR'){if(n===1){if(radar.mode==='ACM')radar.drop();else radar.bore();}
    else if(n===2){if(radar.mode==='ACM')radar.acm={'30x20':'VERT',VERT:'BORE',BORE:'30x20'}[radar.acm]||'30x20';else if(radar.mode==='RWS')radar.setTWS(true);else{radar.drop();radar.mode='RWS';}}
    else if(n===3)F16M2.fcrExp=!F16M2.fcrExp;else if(n===4){F16M2.fcrOvrd=!F16M2.fcrOvrd;radar.setPower(F16M2.fcrOvrd?'STBY':'ON');}else if(n===5)M.cntl=!M.cntl;
    else if(n===20)radar.ri=Math.min(radar.ranges.length-1,radar.ri+1);else if(n===19)radar.ri=Math.max(0,radar.ri-1);else if(n===18)radar.ai=(radar.ai+1)%3;else if(n===17)radar.bi=(radar.bi+1)%3;return;}
  if(pg==='SMS'){if(n===1){const k=AGW[game.wsel]?1:game.wsel==='GUN'?0:2;cycleW(k===2?4:k===1?1:0);}else if(n===4)M.cntl=!M.cntl;else if(n===6)setArm(game.armPos===0?1:0);
    else{const L=[20,19,18,17,16],i=L.indexOf(n),types=[...P.missileTypes(),...agTypes(P)];if(i>=0&&types[i])game.wsel=types[i];}return;}
  if(pg==='HSD'){if(n===1)F16M2.hsdDep=!F16M2.hsdDep;else if(n===5)M.cntl=!M.cntl;else if(n===20)F16M2.hsdRng=Math.min(5,F16M2.hsdRng+1);else if(n===19)F16M2.hsdRng=Math.max(0,F16M2.hsdRng-1);return;}
  if(pg==='TGP'){if(M.tmode==='menu'){if(n===20||n===6||n===8)M.tmode=n===20?'A-A':n===6?'A-G':'STBY';F16M2.tgpOvrd=M.tmode==='STBY';return;}
    if(n===1)M.tmode='menu';else if(n===2)F16M2.tgpSens={TV:'WHOT',WHOT:'BHOT',BHOT:'TV'}[F16M2.tgpSens];else if(n===3)SNS.nar=!SNS.nar;else if(n===4)F16M2.tgpOvrd=!F16M2.tgpOvrd;else if(n===5)M.cntl=!M.cntl;return;}
  if(pg==='WPN'){if(n===2)F16M2.wpnMode={PRE:'VIS',VIS:'BORE',BORE:'PRE'}[F16M2.wpnMode];else if(n===3)SNS.nar=!SNS.nar;else if(n===4)SNS.bore();else if(n===5)M.cntl=!M.cntl;return;}};
window.F16ROCK=function(side,kind,d){const M=F16M2[side];sfx.click();if(kind==='BRT'||kind==='CON')M.brt=clamp(M.brt+d*.12,.25,1);else if(kind==='SYM')M.sym=clamp(M.sym+d*.12,.2,1);else M.gain=clamp(M.gain+d*.12,.3,1.6);};
// clicks on the glass map to the nearest OSB too
f16MfdClick=function(id,x,y){const side=id==='f16L'?'L':'R';let n=0,bd=1e9;for(let i=1;i<=20;i++){const[ox,oy]=osbXY(i),d=Math.hypot(ox-x,oy-y);if(d<bd){bd=d;n=i;}}if(bd<34)window.F16OSB(side,n);};
// master-mode reconfiguration: a guided A-G store puts its sensor format up on the right MFD
{const _d=f16cDraw;f16cDraw=function(){const P=player;if(P&&P.type==='F-16C'){const want=SNS.ckPage();if(want&&want!==F16M2.last){const R=F16M2.R;let i=R.slots.indexOf(want);if(i<0){R.slots[2]=want;i=2;}R.sel=i;R.menu=false;}F16M2.last=want;}_d();};}
  }
 }
});
