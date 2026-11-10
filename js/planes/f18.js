"use strict";
/* =====================================================================================================================
   F/A-18C Hornet / F/A-18E Super Hornet — everything that belongs to this jet family, split out of game.js (v258).
   Loaded BEFORE game.js (after js/planes/registry.js). Nothing here runs against game.js state at load time:
     * top-level declarations below are pure data (station layouts, store lists) or functions (model builder, cockpit/MFD code);
     * `tables` are thunks. game.js calls PLANES.apply('<TABLE>',<TABLE>) right after it declares each table, which merges
       these entries in at the same point the old inline literal used to be evaluated;
     * `hooks` are the one-off statements that used to sit inline in game.js (variants, cockpit builders, HUD/MFD patches).
       game.js calls PLANES.run('f18','<tag>') at the exact spot each one was cut from, so execution order is unchanged.
   Type ids in this file: F-18C, F-18E
   ===================================================================================================================== */
// F/A-18C stations: 1 / 9 wingtip AIM-9 rails, 2 / 8 outboard and 3 / 7 inboard wing pylons, 4 / 6 fuselage (semi-recessed AIM-7 / AIM-120), 5 centreline
const F18ST={1:[-5.95,.12,.5],2:[-4.5,-.38,.4],3:[-3.0,-.44,.3],4:[-1.0,-.78,-1.5],5:[0,-.9,1.0],6:[1.0,-.78,-1.5],7:[3.0,-.44,.3],8:[4.5,-.38,.4],9:[5.95,.12,.5]};
function makeF18(){
  // F/A-18C Hornet: 17.07 m long, 11.43 m span (12.3 m over the AIM-9 rails), 37.16 m² wing with 20° leading-edge sweep and drooping flaperons, huge LERX,
  // two F404s under a broad flat-bottomed fuselage, square-lipped inlets under the LERX, twin fins canted 20° outward, all-moving slab tailplanes
  const grp=new THREE.Group(),mat=SKIN(0x7a8189),dk=SKIN(0x5c636a),blk=SKIN(0x1c1f22,10),rad=SKIN(0x70777e,20),met=SKIN(0x5a5550,60);
  grp.add(new THREE.Mesh(sloft([[-9.8,.02,.1,.02,2],[-9.4,.2,.1,.2,2],[-8.7,.38,.12,.36,2.1],[-7.8,.5,.16,.48,2.2],[-6.8,.58,.22,.55,2.4],[-5.8,.63,.3,.58,2.6],
    [-4.6,.66,.34,.6,2.8],[-3.2,.72,.3,.58,3.1],[-1.6,.8,.26,.54,3.3],[.2,.82,.24,.5,3.3],[2.2,.78,.2,.46,3.1],[4.2,.72,.2,.44,2.9],[6,.66,.2,.42,2.7],[7.4,.58,.2,.4,2.4],[8.0,.5,.2,.36,2.2]]),mat));
  grp.add(new THREE.Mesh(loft([[-9.82,.022,.1,.022,2],[-9.4,.205,.1,.205,2],[-8.7,.385,.12,.365,2.1],[-8.0,.49,.15,.47,2.15]],40,false,false),rad));
  rim(grp,.495,.024,dk,0,.15,-7.99,1,.96);
  // engine nacelles with D-shaped inlets under the LERX, splitter plates and boundary-layer bleed
  for(const sd of[-1,1]){const nc=new THREE.Mesh(sloft([[-3.7,.44,-.12,.46,3.7],[-2.4,.5,-.1,.5,3.6],[.5,.5,-.04,.48,3.4],[3.2,.47,-.02,.44,3.0],[6.4,.42,0,.38,2.4],[7.6,.4,0,.36,2.2]],32,false,false),mat);nc.position.x=sd*.72;grp.add(nc);
    intake(grp,sd*.72,-.12,-3.72,.42,.46,mat,blk,false);
    rod(grp,[sd*.34,-.12,-3.7],[sd*.34,-.12,-3.0],.02,dk,.3,[0,1,0],6);
    nozzle(grp,sd*.62,0,8.3,.4,.34,1.0,met,dk);
    const st=planform([[.7,4.6],[3.4,6.1],[3.45,7.1],[.7,7.4]],.08,false,mat);st.scale.x=sd;st.position.y=-.03;st.rotation.z=sd*-.04;grp.add(st);
    const f=finShape([[2.3,.5],[3.6,.6],[6.0,3.1],[7.0,3.12],[7.4,.55],[7.3,.45]],.12,mat);f.position.set(sd*.86,.05,0);f.rotation.z=-sd*.36;grp.add(f);
    pod(grp,.9,.06,dk,sd*(.86+3.1*Math.sin(.36)),.05+3.1*Math.cos(.36),6.55,1,1);// fin-tip ECM / antenna fairings
    pod(grp,1.8,.14,dk,sd*.86,.62,-1.4,1,.4);}// LERX-root bleed fairing
  const wing=planform([[.6,-6.2],[.9,-5.2],[1.25,-3.6],[1.62,-2.0],[5.95,.1],[5.98,2.3],[1.5,3.7],[.6,3.8]],.12,true,mat);wing.position.y=.0;grp.add(wing);
  // trailing-edge flaperon line, wing-fold hinge and leading-edge flap seam
  for(const sd of[-1,1]){rod(grp,[sd*1.7,.075,3.15],[sd*5.9,.075,1.95],.012,dk,.4,[0,1,0],6);rod(grp,[sd*3.6,.075,-.85],[sd*3.6,.075,2.9],.012,dk,.4,[0,1,0],6);}
  // canopy: big frameless bubble, blue-grey tint
  canopy(grp,0x6d8089,.52,.52,2.3,.8,-5.0,dk);
  pod(grp,2.0,.12,dk,0,.82,-.3,1,.4);// dorsal speed brake between the fins
  rod(grp,[0,.1,-9.7],[0,.1,-10.5],.022,met,1,[0,1,0],8);ball(grp,.035,met,0,.1,-10.5);
  rod(grp,[0,-.38,5.4],[0,-.42,8.4],.04,dk,.5,[0,1,0],8);// arresting hook
  rod(grp,[.52,.96,-6.9],[.52,1.02,-6.4],.03,dk,.35,[1,0,0],6);// IFR probe door
  navLight(0xff2a1a,-5.98,.1,1.6,grp);navLight(0x22ff55,5.98,.1,1.6,grp);
  const ab=new THREE.Group();[-.62,.62].forEach(x=>{const c=abPlume(4.4,.4);c.position.set(x,0,8.85);ab.add(c);});grp.add(ab);grp.userData.ab=ab;
  pylons(grp,F18ST,[],SKIN(0x727a82),x=>Math.abs(x)<1.5?-.38:-.04);
  return bake(grp,[ab]);}
/* ============ F/A-18C: DDIs, AMPCD, UFC and IFEI ============ */
// The two Digital Display Indicators and the AMPCD share one page system: MENU (OSB 18) opens a page list, every page has 20 option select buttons numbered
// clockwise from the top left (1-5 top, 6-10 right going down, 11-15 bottom going left, 16-20 left going up). RDR is the attack radar, SMS the stores page.
const isHornet=()=>player&&player.ac.pit==='hornet';
const HDDI={L:'SMS',R:'RDR',C:'HSI',menu:{L:0,R:0,C:0}},HPAGES=['RDR','SMS','HSI','SA','FCS','ENG','FUEL','EW','BLANK'];
const hornOsbPos=n=>n<=5?[60+(n-1)*60,18]:n<=10?[342,60+(n-6)*60]:n<=15?[300-(n-11)*60,342]:[18,300-(n-16)*60];
function hornOsbAt(x,y){
  if(y<40&&x>30&&x<330)return 1+clamp(Math.round((x-60)/60),0,4);
  if(x>320&&y>30&&y<330)return 6+clamp(Math.round((y-60)/60),0,4);
  if(y>320&&x>30&&x<330)return 11+clamp(Math.round((300-x)/60),0,4);
  if(x<40&&y>30&&y<330)return 16+clamp(Math.round((300-y)/60),0,4);return 0;}
function hornOsb(c,n,txt,on,dim){const[x,y]=hornOsbPos(n),R=n>=6&&n<=10,Lf=n>=16;c.save();c.font='700 15px "B612 Mono",monospace';c.textBaseline='middle';c.fillStyle=dim?MFD:MF;
  const ls=String(txt).split('\n'),tx=R?354:Lf?6:x;c.textAlign=R?'right':Lf?'left':'center';ls.forEach((t,i)=>c.fillText(t,tx,y+(i-(ls.length-1)/2)*16));
  if(on){const w=Math.max(...ls.map(t=>t.length))*9.4+8,h=ls.length*16+6,bx=R?tx-w+3:Lf?tx-4:tx-w/2;c.strokeStyle=MF;c.lineWidth=1.5;c.strokeRect(bx,y-h/2,w,h);}c.restore();}
function hornOsbList(pg,id){const P=player,L=[];
  if(pg==='MENU'){HPAGES.forEach((q,i)=>L.push({n:[2,3,4,5,6,7,8,9,10][i],t:q,on:HDDI[id]===q,act:()=>{HDDI[id]=q;HDDI.menu[id]=0;}}));L.push({n:1,t:'MENU',on:true});return L;}
  if(pg==='RDR'){const m=radar.mode;
    L.push({n:1,t:m==='ACM'?({'30x20':'ACM 20',VERT:'ACM 60',BORE:'BORE'}[radar.acm]||'ACM'):m,on:true,act:'mode'});
    L.push({n:2,t:'A'+radar.azs[radar.ai]/10,act:'az'});L.push({n:3,t:radar.barsL[radar.bi]+'B',act:'bars'});
    L.push({n:4,t:radar.power==='ON'?'OPR':radar.power==='STBY'?'STBY':'OFF',on:radar.power!=='ON',act:()=>radar.setPower(radar.power==='ON'?'STBY':'ON')});
    L.push({n:5,t:'NCTR',on:!!NCTR.on,act:()=>{NCTR.on=NCTR.on?0:1;NCTR.p=0;NCTR.j=null;flash('NCTR '+(NCTR.on?'ON':'OFF'),700);}});L.push({n:7,t:'CNCL',act:()=>{if(radar.mode!=='RWS'&&radar.mode!=='TWS'||radar.lock)radar.drop();}});
    L.push({n:20,t:'▲',act:'rup'});L.push({n:19,t:'▼',act:'rdn'});L.push({n:12,t:'SEL\nSMS',dim:true});
    if(P&&P.type==='F-18E'&&P.ac.irst){L.push({n:8,t:'IRST',on:radar.sensor==='IRST',act:()=>radar.toggleSensor()});L.push({n:9,t:'FUSE',on:!!sys.v.fuse,act:()=>fuseToggle()});}}
  else if(pg==='SMS'){const w=game.wsel,ty=P?P.missileTypes():[],slot=[2,3,4,7,8];
    L.push({n:1,t:'A/A',on:true});ty.slice(0,5).forEach((t,i)=>L.push({n:slot[i],t:SN[t]||t,on:w===t,act:()=>{game.wsel=t;}}));
    L.push({n:5,t:'GUN',on:w==='GUN',act:()=>{game.wsel='GUN';}});
    L.push({n:6,t:'MSTR\n'+['ARM','SAFE','SIM'][game.armPos],on:game.armPos===0,act:()=>setArm(game.armPos===0?1:0)});
    L.push({n:11,t:'S-J',act:()=>jettison()});}
  else if(pg==='HSI'){L.push({n:1,t:'HSI',on:true});L.push({n:2,t:'LINK\n'+(sys.dl.hsi?'ON':'OFF'),on:!!sys.dl.hsi,act:()=>{sys.dl.hsi^=1;}});L.push({n:20,t:'RNG\n'+(radar.ranges[radar.ri]),dim:true});}
  else if(pg==='SA'){L.push({n:1,t:'SA',on:true});L.push({n:2,t:sys.dl.north?'NORTH\nUP':'HDG\nUP',act:()=>{sys.dl.north^=1;}});
    L.push({n:3,t:'LINK\n'+(sys.dl.lk?'ON':'OFF'),on:!!sys.dl.lk,act:()=>{sys.dl.lk^=1;}});L.push({n:4,t:'TGT\n'+(dlTgt()?'SET':'---'),on:!!dlTgt(),act:()=>dlCycle()});L.push({n:20,t:'▲',act:()=>DL.step(1)});L.push({n:19,t:'▼',act:()=>DL.step(-1)});}
  else if(pg==='FCS'){L.push({n:1,t:'FCS',on:true});L.push({n:11,t:'RESET',act:()=>{if(player)player.maxNz=1;}});}
  else if(pg==='ENG'){L.push({n:1,t:'ENG',on:true});}
  else if(pg==='FUEL'){L.push({n:1,t:'FUEL',on:true});L.push({n:11,t:'INTL\nTK',dim:true});}
  else if(pg==='EW'){L.push({n:1,t:'EW',on:true});if(P&&P.ecm&&ecmFitted(P))L.push({n:6,t:'ECM\n'+ecmTxt(P),dim:true});}
  if(pg!=='MENU')L.push({n:18,t:'MENU',act:()=>{HDDI.menu[id]=1;}});return L;}
function hornOsbs(c,pg,id){for(const o of hornOsbList(pg,id))hornOsb(c,o.n,o.t,o.on,o.dim);
  if(pg==='RDR'){c.save();c.font='700 15px "B612 Mono",monospace';c.fillStyle=MF;c.textAlign='left';c.textBaseline='middle';c.fillText(String(radar.ranges[radar.ri]),6,92);c.restore();}
  if(pg==='SA'){c.save();c.font='700 15px "B612 Mono",monospace';c.fillStyle=MF;c.textAlign='left';c.textBaseline='middle';c.fillText(DL.rLabel(),6,92);c.restore();}}
function fuseToggle(){const P=player;if(!P||P.type!=='F-18E'){return;}if(!P.ac.irst){flash('NO IRST21 · FUSE UNAVAILABLE',1400);return;}sys.v.fuse=!sys.v.fuse;radar.tracks.clear();flash(sys.v.fuse?'FUSE · RADAR + IRST':'FUSE OFF',1200);sfx.click();}
const hornAct=a=>typeof a==='string'?osbAct(a):a&&a();
function hornPageClick(id,x,y){const pg=id==='fcr'?'RDR':'SMS',n=hornOsbAt(x,y);
  if(n){const o=hornOsbList(pg,'L').find(o=>o.n===n);if(o&&!o.dim&&o.act)hornAct(o.act);sfx.click();return;}
  if(pg==='RDR'){if(rdrLinkClick(x,y))return;if(x>46&&x<314&&y>44&&y<306){radar.cur.az=((x-46)/268*120-60)*D2R;radar.cur.r=(306-y)/262;radar.designate();}return;}
  const rows=player.missileTypes().concat(['GUN']),i=Math.round((y-212)/21);if(y>200&&i>=0&&i<rows.length){game.wsel=rows[i];sfx.click();}}
function hornDDIClick(id,x,y){const m=HDDI.menu[id],pg=m?'MENU':HDDI[id],n=hornOsbAt(x,y);
  if(n===18&&!m&&pg!=='BLANK'){HDDI.menu[id]=1;sfx.click();return;}
  if(pg==='BLANK'){if(n===18||!n){HDDI.menu[id]=1;sfx.click();}return;}
  if(!m&&(pg==='RDR'||pg==='SMS')){hornPageClick(pg==='RDR'?'fcr':'sms',x,y);return;}
  if(!n&&pg==='SA'&&!m&&saClick(x,y))return;
  if(n){const o=hornOsbList(pg,id).find(o=>o.n===n);if(o&&!o.dim&&o.act)hornAct(o.act);sfx.click();}}
const hornT=(c,s,x,y,al='left',f=16,col=MF)=>{c.font=`700 ${f}px "B612 Mono",monospace`;c.fillStyle=col;c.textAlign=al;c.textBaseline='middle';c.fillText(s,x,y);};
function hornHSI(c,S,P){const cx=180,cy=186,R=112,hd=P.hdg*D2R;c.save();c.strokeStyle=MF;c.fillStyle=MF;c.lineWidth=1.5;
  c.beginPath();c.arc(cx,cy,R,0,7);c.stroke();
  for(let d=0;d<360;d+=5){const a=d*D2R-hd,sn=Math.sin(a),co=-Math.cos(a),l=d%10?6:12;c.beginPath();c.moveTo(cx+sn*R,cy+co*R);c.lineTo(cx+sn*(R-l),cy+co*(R-l));c.stroke();
    if(d%30===0)hornT(c,d===0?'N':d===90?'E':d===180?'S':d===270?'W':String(d/10),cx+sn*(R-26),cy+co*(R-26),'center',14);}
  // contacts from the radar, heading up, scaled to the selected range
  const k=(R-8)/radar.rngM;c.strokeStyle=MR;c.lineWidth=1.6;
  for(const[j,t]of radar.tracks){if(!j.alive||t.hoj||t.d>radar.rngM)continue;const x=cx+Math.sin(t.az)*t.d*k,y=cy-Math.cos(t.az)*t.d*k,L=radar.mode==='STT'&&j===radar.lock;
    c.strokeStyle=L?MA:MR;c.strokeRect(x-5,y-5,10,10);const rh=(t.hdg-P.hdg)*D2R;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(rh)*14,y-Math.cos(rh)*14);c.stroke();}
  hornHsiLink(c,cx,cy,R,k,P);
  // ownship, heading bug, bearing to the field
  c.strokeStyle=MF;c.lineWidth=2;c.beginPath();c.moveTo(cx,cy-14);c.lineTo(cx-9,cy+9);c.lineTo(cx,cy+3);c.lineTo(cx+9,cy+9);c.closePath();c.stroke();
  {const a=sys.hsi.hdg*D2R-hd;c.beginPath();c.moveTo(cx+Math.sin(a-.07)*(R+2),cy-Math.cos(a-.07)*(R+2));c.lineTo(cx+Math.sin(a)*(R-12),cy-Math.cos(a)*(R-12));c.lineTo(cx+Math.sin(a+.07)*(R+2),cy-Math.cos(a+.07)*(R+2));c.stroke();}
  const dx=-P.pos.x,dz=-P.pos.z,brg=(Math.atan2(dx,-dz)*R2D+360)%360,rg=Math.hypot(dx,dz)/NM;
  {const a=brg*D2R-hd;c.beginPath();c.moveTo(cx+Math.sin(a)*R,cy-Math.cos(a)*R);c.lineTo(cx+Math.sin(a)*(R-30),cy-Math.cos(a)*(R-30));c.stroke();c.beginPath();c.arc(cx+Math.sin(a)*(R-38),cy-Math.cos(a)*(R-38),5,0,7);c.stroke();}
  c.restore();
  hornT(c,'HDG '+String(Math.round(P.hdg)%360).padStart(3,'0'),70,64,'left',16);hornT(c,'GS '+Math.round(Math.hypot(P.vel.x,P.vel.z)*KT),70,82,'left',14);
  hornT(c,'0 BASE',S-70,64,'right',16);hornT(c,String(Math.round(brg)).padStart(3,'0')+'° / '+rg.toFixed(1),S-70,82,'right',14);
  hornT(c,'MAG',cx,cy+R+22,'center',14,MFD);}
function hornFCS(c,S,P){const V=sys.v,fl=P.flapCmd??0;hornT(c,'FCS',S/2,52,'center',20);
  const rows=[['FLAPS',fl<.25?'AUTO':fl<.75?'HALF':'FULL'],['GEAR',V.gear?(performance.now()/1000<(V.gearT||0)?'TRANSIT':'DOWN'):'UP'],['HOOK',V.hook?'DOWN':'UP'],['SPD BRK',P.sb>.05?Math.round(P.sb*100)+'%':'IN'],
    ['AOA',(P.alpha*R2D).toFixed(1)+'°'],['G',P.nz.toFixed(1)+'  MAX '+P.maxNz.toFixed(1)],['G LIM','+'+P.ac.gLim.toFixed(1)+' / -3.0'],['AOA LIM','35°'],['FCS',P.hp<15?'DEGRADED':'NORM']];
  rows.forEach(([a,b],i)=>{hornT(c,a,56,100+i*24,'left',15,MFD);hornT(c,b,S-56,100+i*24,'right',16,b==='DEGRADED'?MR:MF);});}
function hornENG(c,S,P){const run=P.totalFuel>0,n=run?64+36*P.n:30*P.n,tit=run?440+P.n*420+P.ab*130:200,ff=vff(P)/2,noz=P.ab>.02?20+P.ab*80:(1-P.n)*75+4,oil=run?24+P.n*22:0;
  hornT(c,'ENG',S/2,50,'center',20);hornT(c,'L',130,86,'center',16);hornT(c,'R',250,86,'center',16);
  [['RPM %',Math.round(n)],['TEMP °C',Math.round(tit)],['FF PPH',Math.round(ff/10)*10],['NOZ %',Math.round(noz)],['OIL PSI',Math.round(oil)]].forEach(([a,v],i)=>{
    const y=122+i*36;hornT(c,a,30,y,'left',13,MFD);hornT(c,String(v),156,y,'right',17);hornT(c,String(v),278,y,'right',17);});
  hornT(c,'HYD  L 3000   R 3000',S/2,314,'center',14,MFD);}
function hornFUEL(c,S,P){const lb=v=>Math.round(v*2.2046/10)*10,int=P.fuel,ext=P.tankFuel;hornT(c,'FUEL',S/2,50,'center',20);
  c.strokeStyle=MF;c.lineWidth=2;c.strokeRect(100,84,160,92);hornT(c,'INT',180,100,'center',14,MFD);hornT(c,String(lb(int)),180,128,'center',26);
  hornT(c,'L/R FEED  '+lb(int*.45),180,158,'center',13,MFD);
  const nt=Object.values(P.load).filter(isTank).length;
  c.strokeRect(100,196,160,64);hornT(c,'EXT  ('+nt+')',180,212,'center',14,MFD);hornT(c,nt?String(lb(ext)):'---',180,238,'center',24);
  hornT(c,'TOTAL '+lb(P.totalFuel),64,292,'left',17);hornT(c,'FF '+Math.round(vff(P)/20)*10,S-64,292,'right',17);
  hornT(c,'BINGO '+(sys.v.hBingo??2000),180,318,'center',14,MFD);}
function hornEW(c,S,P){hornT(c,'EW',S/2,50,'center',20);c.drawImage(rwrC,90,70,180,180);
  hornT(c,'CHAFF '+P.chaff,50,296,'left',16);hornT(c,'FLARE '+P.flares,S-50,296,'right',16);hornT(c,'CMDS '+['OFF','STBY','SEMI','MAN','AUTO'][clamp(sys.cm.mode,0,4)],S/2,320,'center',14,MFD);}
function hornMenu(c,S){hornT(c,'MENU',S/2,S/2,'center',24);}
function hornDDIdraw(id,cv){const c=cv.getContext('2d'),S=360,P=player,m=HDDI.menu[id],pg=m?'MENU':HDDI[id];
  if(!P||!P.alive){c.fillStyle='#020604';c.fillRect(0,0,S,S);return;}
  if(!m&&pg==='RDR'){c.drawImage(fcrC,0,0);return;}
  if(!m&&pg==='SMS'){c.drawImage(smsC,0,0);return;}
  c.fillStyle=`rgb(2,${6+Math.round((1-sys.fcr.con)*16)},4)`;c.fillRect(0,0,S,S);c.globalAlpha=.35+.65*sys.fcr.sym;
  ({MENU:hornMenu,HSI:hornHSI,SA:hornSA,FCS:hornFCS,ENG:hornENG,FUEL:hornFUEL,EW:hornEW,BLANK:()=>{}})[pg](c,S,P);
  c.globalAlpha=1;if(pg==='BLANK'){hornT(c,'MENU',60,342,'center',15,MFD);}else hornOsbs(c,pg,id);}
// IFEI (DCS guide fig 4): left / right RPM %, TEMP, FF (x100 pph), NOZ and OIL on the left, fuel quantity (T / I, FL / FR or XL / XR by QTY), BINGO, time (ZONE) and elapsed time on the right
function drawIFEI(P){const c=ifeiC.getContext('2d'),W=320,H=256,V=sys.v,run=P.totalFuel>0,n=run?64+36*P.n:30*P.n,tit=run?440+P.n*420+P.ab*130:200,ff=vff(P)/2,noz=P.ab>.02?20+P.ab*80:(1-P.n)*75+4,oil=run?24+P.n*22:0;
  const br=.35+.65*(V.ifB??.8);c.fillStyle='#040504';c.fillRect(0,0,W,H);
  const A=`rgb(${Math.round(255*br)},${Math.round(182*br)},${Math.round(64*br)})`,G='#cfd4cf',D='#7a6a40',lb=v=>Math.round(v*2.2046/10)*10;
  c.strokeStyle='#2e2a1e';c.lineWidth=1;c.beginPath();c.moveTo(208,8);c.lineTo(208,248);c.stroke();
  hornT(c,'L',58,14,'center',13,G);hornT(c,'ENGINE',118,14,'center',11,D);hornT(c,'R',178,14,'center',13,G);
  const row=(lbl,l,r,y)=>{hornT(c,String(l),88,y,'right',28,A);hornT(c,lbl,118,y,'center',12,G);hornT(c,String(r),148,y,'left',28,A);};
  row('RPM',Math.round(n),Math.round(n),44);row('TEMP',Math.round(tit),Math.round(tit),88);row('FF',(ff/100).toFixed(1),(ff/100).toFixed(1),132);
  row('NOZ',Math.round(noz/10)*10,Math.round(noz/10)*10,176);row('OIL',Math.round(oil/5)*5,Math.round(oil/5)*5,220);
  // nozzle position bars between the two numbers
  for(const[x0,s]of[[104,0],[126,1]]){c.fillStyle='#2a2519';c.fillRect(x0,190,8,10);c.fillStyle=A;c.fillRect(x0,200-10*clamp(noz/100,0,1),8,10*clamp(noz/100,0,1));}
  const q=V.ifQty||0,tot=P.totalFuel,int=P.fuel,ext=P.tankFuel;
  hornT(c,'FUEL',264,14,'center',11,D);
  const fl=[[['T',tot],['I',int]],[['FL',int*.5],['FR',int*.5]],[['XL',ext*.5],['XR',ext*.5]]][q];
  fl.forEach(([t,v],i)=>{hornT(c,t,218,44+i*40,'left',13,G);hornT(c,String(lb(v)),312,44+i*40,'right',26,A);});
  hornT(c,'BINGO',218,126,'left',12,G);hornT(c,String(q?lb(tot):(V.hBingo??2000)),312,126,'right',24,A);
  const d=new Date(),z=!!V.ifZ,h=z?d.getUTCHours():d.getHours(),m=z?d.getUTCMinutes():d.getMinutes(),s=z?d.getUTCSeconds():d.getSeconds(),p2=v=>String(v).padStart(2,'0');
  hornT(c,'TIME',218,160,'left',12,G);hornT(c,z?'Z':'L',312,160,'right',12,D);hornT(c,p2(h)+':'+p2(m)+':'+p2(s),312,184,'right',22,A);
  const et=Math.floor(((V.etAcc||0)+(V.etRun?performance.now()-V.etS:0))/1000);hornT(c,'ET',218,222,'left',12,G);hornT(c,p2(Math.floor(et/60)%100)+':'+p2(et%60),312,222,'right',22,A);
  if(!q&&lb(tot)<(V.hBingo??2000)&&performance.now()%800<500)hornT(c,'BINGO',264,244,'center',11,MR);}
// UFC (DCS guide fig 6 and 7): scratchpad, COMM 1 / COMM 2 channel windows, five option cueing windows with their select buttons, keypad, function row
const UFCF={'':['GRCV','SQCH','CPHR','AM','MENU'],'A/P':['ATTH','HSEL','BALT','RALT','CPL'],'IFF':['M1','M2','M3','M4','MENU'],'TCN':['T/R','RCV','A/A','X','Y'],'ILS':['','','','','ON'],'D/L':['','','','','ON'],'BCN':['','','','','ON']};
function drawUFC(P){const c=ufcC.getContext('2d'),W=520,H=300,V=sys.v,fn=V.ufcFn||'',on=V.ufcOn||{},b=V.ufcBrt??.9,off=V.ufcOff;
  c.fillStyle='#17191b';c.fillRect(0,0,W,H);c.strokeStyle='#070808';c.lineWidth=6;c.strokeRect(3,3,W-6,H-6);
  const lit=b>.12?`rgb(${Math.round(70+60*b)},${Math.round(170+85*b)},${Math.round(100+60*b)})`:'#26402e',txt='#d9ddd9';
  const win=(x,y,w,h)=>{c.fillStyle='#030504';c.fillRect(x,y,w,h);c.strokeStyle='#0c0d0e';c.lineWidth=2;c.strokeRect(x,y,w,h);};
  const knob=(x,y,r,t)=>{c.fillStyle='#0c0d0e';c.beginPath();c.arc(x,y,r,0,7);c.fill();c.strokeStyle='#4b5155';c.lineWidth=2;c.stroke();c.fillStyle='#d4d8d4';c.fillRect(x-1.5,y-r+2,3,r*.7);if(t)hornT(c,t,x,y+r+9,'center',9,txt);};
  // scratchpad: two alphanumeric characters and seven digits
  win(70,12,300,52);const tag={'A/P':'AP','IFF':'IF','TCN':'TC','ILS':'IL','D/L':'DL','BCN':'BC'}[fn]||'',pad=(tag.padEnd(2,' ')+String(V.ufcPad||'').padStart(7,' ')).split('');
  if(!off)pad.forEach((ch,i)=>{if(ch!==' ')hornT(c,ch,92+i*31,40,'center',38,lit);});
  // left column: ADF switch, COMM 1 volume, channel window and selector
  knob(36,36,12,'ADF');knob(36,94,12,'VOL');win(10,138,52,34);if(!off)hornT(c,String(V.uch||1),36,156,'center',26,lit);hornT(c,'COMM 1',36,186,'center',9,txt);knob(36,216,16,'');
  // keypad
  const kb=[['1','2','3'],['4','5','6'],['7','8','9'],['CLR','0','ENT']],sub={'2':'N','4':'W','6':'E','8':'S'};
  kb.forEach((r,i)=>r.forEach((k,j)=>{const x=100+j*62,y=75+i*44;c.fillStyle='#2b2f33';c.fillRect(x,y,54,38);c.fillStyle='#3a3f43';c.fillRect(x,y,54,3);c.fillStyle='#0b0c0d';c.fillRect(x,y+35,54,3);
    hornT(c,k,x+27,y+20,'center',k.length>1?14:20,'#eef0ee');if(sub[k])hornT(c,sub[k],x+45,y+10,'center',9,'#9aa09c');}));
  // option select buttons and the five option display windows
  const ow=V.emcon?['E','M','C','O','N']:UFCF[fn]||UFCF[''];
  for(let i=0;i<5;i++){const y=82+i*40;c.fillStyle='#0c0d0e';c.beginPath();c.arc(292,y,12,0,7);c.fill();c.strokeStyle='#596066';c.lineWidth=2;c.stroke();c.fillStyle='#252a2d';c.beginPath();c.arc(292,y,7,0,7);c.fill();
    win(316,y-17,124,34);const t=ow[i]||'';if(!off&&t)hornT(c,V.emcon?t:(on[fn+i]?':':' ')+t,V.emcon?378:326,y,V.emcon?'center':'left',26,lit);}
  // right column: EMCON, BRT / DIM, COMM 2 volume, channel window
  c.fillStyle=V.emcon?'#3b4b40':'#2b2f33';c.fillRect(460,64,48,36);hornT(c,'EMCON',484,82,'center',11,'#eef0ee');knob(484,128,12,'BRT');knob(484,176,12,'VOL');win(458,198,50,34);if(!off)hornT(c,String((V.uch||1)%20+1),484,216,'center',26,lit);hornT(c,'COMM 2',484,246,'center',9,txt);
  // function row with a knob at each end
  ['A/P','IFF','TCN','ILS','D/L','BCN','ON/OFF'].forEach((f,i)=>{const x=70+i*58,sel=fn===f;c.fillStyle=sel?'#44514a':'#2b2f33';c.fillRect(x,258,52,30);c.fillStyle=sel?'#5d6e65':'#3a3f43';c.fillRect(x,258,52,3);
    if(f==='ON/OFF'){hornT(c,'ON',x+26,267,'center',10,'#eef0ee');hornT(c,'OFF',x+26,279,'center',10,'#eef0ee');}else hornT(c,f,x+26,273,'center',13,sel?'#ffffff':'#d9ddd9');});
  c.fillStyle='#0c0d0e';[34,496].forEach(x=>{c.beginPath();c.arc(x,273,13,0,7);c.fill();c.strokeStyle='#4b5155';c.lineWidth=2;c.stroke();});}
// caution / advisory panel (kept for reference; the real jet carries its lights as the left / right warning arrays above the DDIs)
const HCAU=[['L GEN','R GEN','FCS'],['L BAR','R BAR','HYD'],['FUEL LO','FUEL HI','CK FLAPS'],['CANOPY','OBOGS','ENG FIRE'],['LOW OXY','L ENG','R ENG'],['STORES','ADC','RADAR']];
function drawHCaut(P){const c=hcauC.getContext('2d'),V=sys.v,run=P.totalFuel>0,hp=P.hp,lt=performance.now()/1000<(V.lampT||0);c.fillStyle='#16191b';c.fillRect(0,0,260,200);
  const on=[[0,0,hp<35],[0,0,hp<45],[P.totalFuel*2.2046<(V.hBingo??2000),0,0],[0,0,hp<25],[0,hp<30||!run,hp<30||!run],[0,0,!radar.on()&&radar.power!=='OFF']];
  HCAU.forEach((r,i)=>r.forEach((s,j)=>{const x=6+j*83,y=6+i*31,lit=lt||on[i][j];c.fillStyle=lit?(s==='ENG FIRE'?'#ff3a20':'#ffb21a'):'#2d302f';c.fillRect(x,y,78,26);
    hornT(c,s,x+39,y+14,'center',11,lit?'#1d1204':'#7b807d');}));}
function drawHornetG(P){if(P.ac.pit!=='hornet')return;
  drawIFEI(P);drawUFC(P);{const agl=Math.min(5000,Math.max(0,(P.pos.y-groundAt(P.pos.x,P.pos.z))*FT));vdial(hRaltC.getContext('2d'),{v:agl,min:0,max:5000,a0:-150,a1:150,major:1000,minor:250,fmt:v=>v/1000,lbl:'RADAR ALT'});vdial(hBrkC.getContext('2d'),{v:3000,min:0,max:4000,a0:-135,a1:135,major:1000,fmt:v=>v/1000,lbl:'BRAKE'});}
  hornDDIdraw('L',ddiLC);hornDDIdraw('R',ddiRC);hornDDIdraw('C',mpcdC);}

PLANES.add('f18',{
 ids:["F-18C","F-18E"],
 tables:{
  AC:()=>({
    // F/A-18C Hornet (Lot 20, night attack): 2x F404-GE-402 EPE (11,000 lbf dry / 17,700 lbf AB class each = 97.8 / 157.4 kN), empty 10,455 kg (23,050 lb), internal fuel 4,926 kg
      // (10,860 lb), 330 gal tanks (1,018 kg) on 3 / 5 / 7, 37.16 m² wing, digital FCS with a +7.5 g limiter and ~35° AoA ceiling that gives way to the LEX vortex at
      // very high AoA (departure past ~46°), APG-73 (Raid) with 5 / 10 / 20 / 40 / 80 / 160 NM scales, M61A1 with 578 rds
      'F-18C':{name:'F/A-18C Hornet',model:makeF18,st:F18ST,empty:10455,fuel:4926,tank:1018,S:37.16,CLa:4.2,cd0:.0215,k:.12,mil:97800,ab:157400,spool:1.5,
        clt:[[-20,-1],[-10,-.6],[0,.08],[5,.45],[10,.82],[15,1.18],[20,1.44],[25,1.6],[30,1.7],[35,1.74],[40,1.72],[50,1.55],[60,1.2],[90,0]],
        abM:[[0,1],[.5,1.195],[1,1.36],[1.5,1.495],[2,1.2029],[2.5,.796],[3,.4286]],cdm:[[0,0],[.8,0],[.9,.005],[1,.021],[1.1,.03],[1.3,.029],[1.6,.0269],[2,.024],[2.5,.0181],[3,.0147]],dW:16650,tkG:[6.5,7.5],dep:{a:46,rock:.7,spin:2.4},
        ff:[.28,2.3,8],gLim:7.5,aoaLim:35,roll:4.4,fbw:true,rcs:2,irs:1.15,cockpit:'viper',pit:'hornet',eye:[5.0,1.25],units:'imp',
        radar:{name:'APG-73',R0:48*NM,ranges:[5,10,20,40,80,160],unit:NM,ul:'NM',ecc:.65},irst:false,
        gun:{name:'M61A1',rate:100,v:1050,dmg:9,ammo:578,spread:.0022},rel:[1,9,2,8,4,6,3,7],keepJ:['1','2','4','6','8','9'],rwr:'18',spo:4,tankName:'330 gal tank'}
  }),
  ENG_SUP:()=>({
    'F/A-18C Hornet':.166,
    'F/A-18E Super Hornet':-.193
  }),
  FOE:()=>({
    'F-18C':'MiG-29'
  }),
  LOAD:()=>({
    cold:{
      'F-18C':{1:'AIM-9M',2:'AIM-7M',3:'TK',4:'AIM-7M',6:'AIM-7M',7:'TK',8:'AIM-7M',9:'AIM-9M'}
    },
    modern:{
      'F-18C':{1:'AIM-9X',2:'AIM-120C',3:'TK',4:'AIM-120C',6:'AIM-120C',7:'TK',8:'AIM-120C',9:'AIM-9X'}
    },
    guns:{
      'F-18C':{3:'TK',7:'TK'}
    }
  }),
  CMS:()=>({
    cold:{
      'F-18C':[60,30]
    },
    modern:{
      'F-18C':[60,60]
    }
  }),
  ECM_FIT:()=>({
    // F-14A: internal deception jammers, ALQ-100 in the early jets, ALQ-126 later
      // F/A-18C: internal AN/ALQ-126B deception jammer in the early jets, AN/ALQ-165 ASPJ later
      'F-18C':{cold:{n:'ALQ-126B',jp:1,dec:.68,kg:0,cd:0,warm:20},modern:{n:'ALQ-165 ASPJ',jp:1.8,dec:.78,kg:0,cd:0,warm:15}}
  }),
  RWR_OF:()=>({
    'F-18C':'ALR-67(V)2',
    'F-18E':'ALR-67(V)3'
  }),
  NCTR_ID:()=>({
    'F-18C':'F/A-18'
  }),
  STN:()=>({
    'F-18C':{1:H18W,2:[...H18W,...H18M],3:['TK',...H18W,...H18M],4:H18M,5:['TK'],6:H18M,7:['TK',...H18W,...H18M],8:[...H18W,...H18M],9:H18W}
  }),
  ACROLE:()=>({
    'F-18C':'US · FLEET MULTIROLE'
  }),
  FV:()=>({
    'F-18C':{hw:6.4,y1:3.3,span:'11.43 m',d:()=>bth([[-.8,.55],[-1.15,.55],[-2.05,2.95],[-1.85,2.95]],'sk-body')+bth([[-1,.02],[-3.2,-.18],[-3.2,-.3],[-1,-.3]],'sk-wing')+bth([[-1.4,.0],[-5.7,.12],[-5.7,0],[-1.4,-.3]],'sk-wing')+bth([[-5.7,.15],[-6.1,.15],[-6.1,.02],[-5.7,.02]],'sk-body')+ell(0,.05,1.0,.7,'sk-body')+bth([[-.3,.4],[-1.2,.4],[-1.2,-.55],[-.3,-.55]],'sk-body')+bth([[-.4,.3],[-1.1,.3],[-1.1,-.45],[-.4,-.45]],'sk-dark')+ell(0,.74,.4,.4,'sk-can')}
  }),
  CALLS:()=>({
    'F-18C':'HORNET'
  }),
  FLAPSW:()=>({
    'F-18C':'hflap'
  }),
  STRIKE_LOAD:()=>({
    'F-18C':{1:'AIM-9M',9:'AIM-9M',2:'LAU-10',8:'LAU-10',3:'Mk-82',7:'Mk-82',4:'Mk-82',6:'Mk-82',5:'TK'}
  }),
  RACKS:()=>({
    'F-18C':{st:['2','3','7','8'],subs:{b:[.44,.06,0]},cats:[{t:AAMS,n:2,rack:'LAU-115 + 2 LAU-127'},{t:['Mk-82','GBU-12'],n:2,rack:'BRU-33'}]}
  }),
  ENGN:()=>({
    'F-18C':'2× F404-GE-402',
    'F-18E':'2× F414-GE-400'
  }),
  IRSTN:()=>({
    'F-18E':'IRST21 pod'
  })
 },
 hooks:{
  /* game.js line 2777 */
  L2777(){
    ddiLC=mk(360,360),ddiRC=mk(360,360),mpcdC=mk(360,360),ifeiC=mk(320,256),ufcC=mk(520,300),hcauC=mk(260,200),hRaltC=mk(192,192),hBrkC=mk(192,192);
  },
  /* game.js line 11739 */
  L11739(){
/* ============ v135: F/A-18E Super Hornet — APG-79 AESA, 11 stations, F414-GE-400, AIM-174B Gunslinger, AIM-260A JATM ============
   F/A-18E: 18.31 m long, 13.62 m span, 46.45 m² wing, empty ~14,550 kg, internal fuel ~6,780 kg, 2x F414-GE-400 (62.3 kN dry / 97.9 kN AB each),
   Mach 1.6, 7.5 g, high-AoA capable; eleven stations: wingtips 1 / 11, three wing pylons a side (2-4, 8-10, outboard pylons canted 4°), two
   nacelle stations 5 / 7 for AAMs and the ATFLIR pod, centreline 6; 480 gal tanks on 3 / 4 / 6 / 8 / 9. M61A2 with 412 rounds.
   AN/APG-79 AESA: ~1,100 transmit / receive modules, ~50% more detection range than the APG-73, electronic beam steering (no antenna to sweep,
   so a frame is covered several times faster), better ECCM; fixed array, so the field of regard is about ±70°.
   AIM-174B Gunslinger: air-launched SM-6 without the booster, ~860 kg, 4.7 m, Mach 3.5, 130 NM confirmed, inertial + active / semi-active terminal.
   AIM-260A JATM: AMRAAM-sized, faster and longer-ranged (≥200 km class, Mach 5 class), first seen live on a VX-31 Super Hornet in 2026. */
{
// ---- missiles ----
addMsl('AIM-174B','174B',{hoj:1,ecc:.8,trk:.9,ccm:.78,loft:.72,loftCap:32000,seek:'ARH',ign:.6,burn:24,acc:52,cd:1.9e-5,maxG:30,gimbal:70*D2R,fuse:20,life:300,pit:26000,N:4,res:.8,rmin:6000,stop:330,search:16*D2R,smoke:.45,mass:860,aiR:150000,aiOff:20*D2R,apn:1},{b:4,s:20,f:.55},.343,4.7);
addMsl('AIM-260A','260A',{hoj:1,ecc:.88,trk:1.0,ccm:.88,loft:.58,loftCap:27000,seek:'ARH',ign:.35,burn:10,acc:150,cd:3.0e-5,maxG:45,gimbal:70*D2R,fuse:14,life:170,pit:20000,N:4.2,res:.86,rmin:1500,stop:300,search:16*D2R,smoke:.12,mass:165,aiR:85000,aiOff:25*D2R,apn:1},{b:3,s:7,f:.68},.178,3.66);
SHAPE['AIM-174B']={L:4.7,R:.17,f:[[.25,.62,.45],[2.6,.28,1.8]]};
SHAPE['AIM-260A']={L:3.66,R:.09,f:[[.15,.36,.22]]};
Object.assign(SN,{'AIM-174B':'174B','AIM-260A':'260A'});
Object.assign(WNAME,{'AIM-174B':'Gunslinger · SM-6 ER · Mach 3.5 · 130+ NM','AIM-260A':'JATM · 2026 · Mach 5 class'});
MODERN_ONLY.add('AIM-174B');MODERN_ONLY.add('AIM-260A');

// ---- airframe ----
const F18EST={1:[-6.6,.13,.55],2:[-5.0,-.42,.45],3:[-3.65,-.46,.35],4:[-2.3,-.5,.25],5:[-1.07,-.84,-1.6],6:[0,-.96,1.07],
  7:[1.07,-.84,-1.6],8:[2.3,-.5,.25],9:[3.65,-.46,.35],10:[5.0,-.42,.45],11:[6.6,.13,.55]};
window.F18EST=F18EST;
const makeF18E=new Function('return ('+makeF18.toString()
  .replace('function makeF18(','function makeF18E(')
  .replace('pylons(grp,F18ST,','for(const c of grp.children){c.position.x*=1.107;c.position.z*=1.073;c.scale.x*=1.107;c.scale.z*=1.073;}pylons(grp,F18EST,')+')')();
AC['F-18E']=Object.assign({},AC['F-18C'],{name:'F/A-18E Super Hornet',model:makeF18E,st:F18EST,empty:14550,fuel:6780,tank:1450,S:46.45,
  cd0:.0228,k:.115,mil:124600,ab:195800,spool:1.4,dW:21300,gLim:7.5,aoaLim:45,roll:4.0,rcs:1.2,irs:1.2,
  dep:{a:55,rock:.5,spin:1.8},
  radar:{name:'APG-79',R0:72*NM,ranges:[5,10,20,40,80,160],unit:NM,ul:'NM',ecc:.92,aesa:1,beam:3.0*D2R},
  gun:{name:'M61A2',rate:100,v:1050,dmg:9,ammo:412,spread:.0022},
  rel:[1,11,2,10,5,7,3,9,4,8,6],keepJ:['1','2','5','7','10','11'],tankName:'480 gal tank'});
RGIM['APG-79']=[70,60,60,1];
// AESA: the beam moves electronically, so a scan frame is covered far faster than a mechanical dish can sweep
{const _r=radar.reset;radar.reset=function(ac){const o=_r.apply(this,arguments);this.aesa=!!(ac&&ac.radar&&ac.radar.aesa);this.rate=this.aesa?720*D2R:65*D2R;return o;};}

// ---- what each station takes ----
{const has=w=>!!(AGW[w]||MSL[w]||w==='TK'||w==='IRST');const U=(...l)=>[...new Set(l.flat())].filter(has);
  const IR=['AIM-9L','AIM-9M','AIM-9X'],RF=['AIM-7M','AIM-7P','AIM-120A','AIM-120B','AIM-120C','AIM-120D','AIM-260A'];
  const LITE=['Mk-82','Mk-82AIR','Mk-20','GBU-12','GBU-38','GBU-54','AGM-65E','AGM-65F','LAU-10','CBU-87','CBU-97'];
  const HEAVY=['Mk-83','Mk-84','GBU-10','GBU-16','GBU-24','GBU-31','GBU-32','AGM-154A','AGM-88B','AGM-88C','CBU-103','CBU-105'];
  STN['F-18E']={1:U(IR),11:U(IR),
    2:U(IR,RF,LITE),10:U(IR,RF,LITE),
    3:U('TK',IR,RF,'AIM-174B',LITE,HEAVY),9:U('TK',IR,RF,'AIM-174B',LITE,HEAVY),
    4:U('TK',RF,'AIM-174B',LITE,HEAVY),8:U('TK',RF,'AIM-174B',LITE,HEAVY),
    5:U(RF,'ATFLIR'),7:U(RF,'ATFLIR'),
    6:U('TK','IRST','Mk-83','Mk-84','GBU-31','GBU-32','GBU-10','GBU-16','Mk-82','GBU-12','GBU-38')};
  MODERN_AC['F-18E']=[];
  // dual carriage: LAU-115 with two LAU-127 rails for AMRAAM / AIM-260 / Sidewinder, BRU-55 / BRU-33 for pairs of 500 lb stores on 3 / 4 / 8 / 9
  const DUAL_AAM=['AIM-120A','AIM-120B','AIM-120C','AIM-120D','AIM-260A','AIM-9L','AIM-9M','AIM-9X'],DUAL_AG=['Mk-82','GBU-12','GBU-38','GBU-54'];
  RACKS['F-18E']={st:['3','4','8','9'],subs:{b:[.44,.06,0]},cats:[{t:DUAL_AAM,n:2,rack:'LAU-115 + 2 LAU-127'},{t:DUAL_AG,n:2,rack:'BRU-55'}]};
  for(const k of RACKS['F-18E'].st){const p=F18EST[k],side=Math.sign(p[0])||1;F18EST[k+'b']=[p[0]+.44*side,p[1]+.06,p[2]];
    STN['F-18E'][k+'b']=[...new Set(RACKS['F-18E'].cats.flatMap(c=>c.t))].filter(has);}}

// ---- default loads ----
LOAD.modern['F-18E']={1:'AIM-9X',11:'AIM-9X',2:'AIM-120D',10:'AIM-120D',3:'AIM-260A','3b':'AIM-260A',9:'AIM-260A','9b':'AIM-260A',4:'AIM-174B',8:'AIM-174B',5:'AIM-120D',7:'AIM-120D',6:'IRST'};
LOAD.cold['F-18E']={1:'AIM-9M',11:'AIM-9M',2:'AIM-9M',10:'AIM-9M',5:'AIM-7M',7:'AIM-7M',4:'AIM-7M',8:'AIM-7M',6:'TK'};
if(LOAD.guns)LOAD.guns['F-18E']={6:'TK'};
STRIKE_LOAD['F-18E']={1:'AIM-9X',11:'AIM-9X',2:'AIM-120D',10:'AIM-120D',3:'GBU-31',9:'GBU-31',4:'GBU-12','4b':'GBU-12',8:'GBU-12','8b':'GBU-12',5:'ATFLIR',7:'AIM-120D',6:'TK'};
if(window.SEAD_LOAD){SEAD_LOAD.modern['F-18E']={1:'AIM-9X',11:'AIM-9X',2:'AIM-120D',10:'AIM-120D',3:'AGM-88C',9:'AGM-88C',4:'AGM-88C',8:'AGM-88C',5:'AIM-120D',7:'AIM-120D',6:'TK'};
  SEAD_LOAD.cold['F-18E']=Object.assign({},SEAD_LOAD.modern['F-18E']);}
for(const era of Object.keys(CMS))CMS[era]['F-18E']=[60,60];
ECM_FIT['F-18E']={cold:{n:'ALQ-214 IDECM',jp:1.6,dec:.78,kg:0,cd:0,warm:15},modern:{n:'ALQ-214(V)4 IDECM + ALE-55 towed decoy',jp:2,dec:.86,kg:0,cd:0,warm:12}};
FOE['F-18E']='Su-27';NCTR_ID['F-18E']='F/A-18E';CALLS['F-18E']='RHINO';ACROLE['F-18E']='US · FLEET STRIKE FIGHTER · AESA';
FV['F-18E']=Object.assign({},FV['F-18C'],{hw:7.1,span:'13.62 m',d:()=>`<g transform="scale(1.107,1)">${FV['F-18C'].d()}</g>`});
if(typeof FLAPSW!=='undefined')FLAPSW['F-18E']=FLAPSW['F-18C'];
DL_FIT.add('F-18E');for(const n of['CV_AC','PROBE_AC'])try{const S=eval(n);S.add('F-18E');}catch(e){}try{if(!AG_ACS.includes('F-18E'))AG_ACS.push('F-18E');}catch(e){}
{const i=ACS.indexOf('F-18C');if(!ACS.includes('F-18E'))ACS.splice(i+1,0,'F-18E');}
}
// ===== v138: IRST21 pod (FPU-12 tank, stn 6) + Super Hornet cockpit variant =====
SN['IRST']='IRST21';
MODERN_ONLY.add('IRST');
{const E=AC['F-18E'],has=()=>!!(player&&player.type==='F-18E'&&Object.values(player.load||{}).includes('IRST'));
 // IRST21 spec: 70x70 deg FOR, LWIR; ~100 mi (160 km) only in ideal conditions (tail-on, afterburner, high alt, clear air)
 Object.defineProperty(E,'irst',{get:has,configurable:true,enumerable:true});
 Object.defineProperty(E,'ols',{get:()=>has()?{tail:84000,head:28000,lrf:0}:{tail:12000,head:5000,lrf:0},configurable:true,enumerable:true});
 const _ir=radar.irRange;radar.irRange=function(j,a,c){if(player.type==='F-18E'&&(Math.abs(a.baz)>35*D2R||Math.abs(a.bel)>35*D2R))return 0;return Math.min(_ir.call(this,j,a,c),160934);};
 const _mp2=makePlayer;makePlayer=function(){const r=_mp2.apply(this,arguments);if(radar.sensor==='IRST'&&!has())radar.toggleSensor();return r;};
 setInterval(()=>{try{if(radar.sensor==='IRST'&&player&&!player.ac.irst){radar.sensor='RDR';radar.drop();radar.tracks.clear();}}catch(e){}},500);
}
// Super Hornet cockpit: big 8x8 colour MPCD and green-on-black UFCD grid
{const _sc=selectCockpit;selectCockpit=function(kind,pit){const r=_sc(kind,pit);const o=ck.viper;if(!o||!o._mpg)return r;
  const e=!!(player&&player.type==='F-18E'&&pit==='hornet');
  // Block II Super Hornet: 8x8 MPCD low in the centre, EFD under the left DDI, standby instruments and ALR-67 under the right DDI
  o._mpg.scale.set(e?1.42:1,e?1.42:1,1);o._mpg.position.y=e?-.28:-.31;
  const put=(g,x,y,k,z)=>{if(!g)return;const p=g.userData.p0;g.position.set(e?x:p[0],e?y:p[1],e?(z||0):0);g.scale.setScalar(e?k:1);};
  put(o._efd,-.31,-.27,.85);put(o._stby,.335,-.26,.85);
  if(o._mk){put(o._mk[0],-.158,-.12,1,.007);put(o._mk[1],-.158,-.44,1,.007);put(o._mk[2],.158,-.44,1,.007);}
  return r;};}
{const _du=drawUFC;drawUFC=function(P){if(!(P&&P.type==='F-18E'))return _du.apply(this,arguments);
  // Super Hornet UFCD: touch-sensitive monochrome-green LCD in place of the legacy keypad; COMM 1 / COMM 2 channel and volume knobs, ADF and BRT on the bezel
  const c=ufcC.getContext('2d'),W=520,H=300,V=sys.v,fn=V.ufcFn||'',on=V.ufcOn||{},b=V.ufcBrt??.9,off=V.ufcOff;
  const g=a=>`rgba(${Math.round(60+40*b)},${Math.round(150+105*b)},${Math.round(80+40*b)},${a})`,G=g(1),Gd=g(.55),T='#cfd4d0';
  c.fillStyle='#1a1d1f';c.fillRect(0,0,W,H);c.strokeStyle='#0a0b0c';c.lineWidth=6;c.strokeRect(3,3,W-6,H-6);
  const knob=(x,y,r,t)=>{c.fillStyle='#0c0d0e';c.beginPath();c.arc(x,y,r,0,7);c.fill();c.strokeStyle='#4b5155';c.lineWidth=2;c.stroke();if(t)hornT(c,t,x,y+r+9,'center',9,T);};
  knob(36,36,12,'ADF');knob(36,94,12,'VOL');hornT(c,'COMM 1',36,186,'center',9,T);knob(36,216,16,'');
  c.fillStyle=V.emcon?'#3b4b40':'#2b2f33';c.fillRect(460,64,48,36);hornT(c,'EMCON',484,82,'center',11,'#eef0ee');knob(484,128,12,'BRT');knob(484,176,12,'VOL');hornT(c,'COMM 2',484,246,'center',9,T);knob(484,216,16,'');knob(36,273,11,'');knob(484,273,11,'');
  // the LCD
  c.fillStyle='#000';c.fillRect(64,8,412,284);c.fillStyle='#030a05';c.fillRect(66,10,408,280);
  if(off){hornT(c,'UFCD OFF',270,150,'center',14,Gd);return;}
  const cell=(x,y,w,h,t,sel,sz,al='center')=>{c.lineWidth=2;c.strokeStyle=sel?G:Gd;if(sel){c.fillStyle=G;c.fillRect(x,y,w,h);}c.strokeRect(x+1,y+1,w-2,h-2);
    if(t)hornT(c,t,al==='left'?x+8:x+w/2,y+h/2+1,al,sz||16,sel?'#021006':G);};
  // scratchpad: function tag, COMM channels left / right
  const tag={'A/P':'AP','IFF':'IF','TCN':'TC','ILS':'IL','D/L':'DL','BCN':'BC'}[fn]||'';c.strokeStyle=Gd;c.lineWidth=2;c.strokeRect(72,14,396,48);
  hornT(c,tag,90,40,'left',26,G);hornT(c,String(V.ufcPad||''),452,40,'right',30,G);
  hornT(c,'C1 '+String(V.uch||1).padStart(2,' '),190,40,'center',13,Gd);hornT(c,'C2 '+String((V.uch||1)%20+1).padStart(2,' '),300,40,'center',13,Gd);
  // keypad (touch cells)
  const kb=[['1','2','3'],['4','5','6'],['7','8','9'],['CLR','0','ENT']],sub={'2':'N','4':'W','6':'E','8':'S'};
  kb.forEach((r,i)=>r.forEach((k,j)=>{const x=100+j*62,y=75+i*44;cell(x,y,54,38,k,false,k.length>1?14:22);if(sub[k])hornT(c,sub[k],x+46,y+10,'center',9,Gd);}));
  // option cells (touch anywhere on the cell; ':' cue when selected)
  const ow=V.emcon?['E','M','C','O','N']:UFCF[fn]||UFCF[''];
  for(let i=0;i<5;i++){const y=82+i*40,t=ow[i]||'',sl=!V.emcon&&on[fn+i];cell(280,y-17,166,34,t?(sl?':':'')+t:'',!!sl,20,'left');}
  // function cells along the bottom
  ['A/P','IFF','TCN','ILS','D/L','BCN','ON/OFF'].forEach((f,i)=>cell(70+i*58,258,52,30,f,fn===f,f.length>4?11:13));};}
  }
 }
});
