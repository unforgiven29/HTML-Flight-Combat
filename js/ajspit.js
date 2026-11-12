/* =====================================================================================================================
   v310 - AJS 37 Viggen cockpit rebuilt from the manuals instead of the generic Cold War board.
   Sources: DCS AJS-37 Viggen Guide part 3 (cockpit photographs and component lists) and the Swedish SFI part 1.
   * Instrument panel as in the cockpit photograph: airspeed indicator (km/h x100 with Mach window) far left, attitude indicator
     above the course indicator, the round central indicator (CI) with its data table in the middle, the right-hand column of
     round instruments (accelerometer, angle of attack, vertical speed, backup altimeter, N2, EPR, EGT, fuel), clock, backup
     artificial horizon. There are NO speed / altitude tapes on the panel (the old board had them; those are on the HUD).
   * Two tilted map indicators on either side of the stick, left and right warning panels with the real Swedish legends,
     destination indicator, master caution, autopilot (SPAK / ATT / HOJD) and autothrottle (AFK) buttons.
   * Left console: engine, fuel, radar (A0-A3), landing gear and airbrake handles; right console: CK37 navigation panel, FR22
     radio, lights, oxygen.
   Dial identities in the right-hand column are placed from the photograph and the order of the guide's component list, not from
   a dimensioned drawing. Gameplay-level layout, not a drawing-office copy.
   Needs game.js, cwpit.js, cw-systems.js, startup.js.
   ===================================================================================================================== */
(function(){
'use strict';
const PIT=window.CW_PIT;if(!PIT||!PIT['AJS-37']){console.warn('[ajspit] cwpit missing');return;}
const ID='AJS-37',K=.00113,OX=640,OY=340;
const PL=()=>typeof player!=='undefined'?player:null;
const bx=x=>(x-OX)*K,by=y=>(OY-y)*K;
const now=()=>performance.now()/1000;
let STV=0,lampTest=0,mcAck=false;
const ST=new Proxy({},{set(t,k,v){t[k]=v;STV++;return true;}});
const sv=(k,d)=>ST[k]===undefined?d:ST[k];

/* ---------------- engine / aircraft readouts (Volvo RM8B, 3-stage afterburner) ---------------- */
const E0=P=>P.eng&&!P.eng.done?P.eng.e[0]:null;
const running=P=>{const e=E0(P);return e?e.lit:P.totalFuel>0&&!(P.dm&&P.dm.eng<=0);};
const rpm=P=>{const e=E0(P);return e?e.rpm:running(P)?58+42*clamp(P.n||0,0,1.02):0;};
const egt=P=>{const e=E0(P);return e?e.egt*700:window.ENGSYS&&window.ENGSYS.on?ENGSYS.egt(P,0):running(P)?380+330*clamp(P.n||0,0,1):20;};
const powered=P=>window.START&&P.eng?START.powered(P):running(P);
const gearDn=()=>{try{return!!sys.v.gear;}catch(e){return false;}};
const fuelPct=P=>clamp((P.totalFuel||0)/((P.ac.fuel||4500)+(P.ac.ptb||0)+1)*100,0,100);
const KMH=3.6;

/* ---------------- 2D faces ---------------- */
const INK='#eceae2',DIM='#a9aca6',FACE='#0c0d0e',R=110;
function face(c,S){c.setTransform(1,0,0,1,0,0);c.fillStyle=FACE;c.fillRect(0,0,S,S);c.translate(S/2,S/2);}
function T(c,s,x,y,sz,col=INK,al='center'){c.font=`bold ${sz}px Arial, Helvetica, sans-serif`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;c.fillText(s,x,y);}
function ticks(c,r,a0,a1,n,maj,lbls,lr=.66,sz=17){c.strokeStyle=INK;for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n-90)*D2R,M=i%maj===0;c.lineWidth=M?3.2:1.6;
  c.beginPath();c.moveTo(Math.cos(a)*r*(M?.78:.87),Math.sin(a)*r*(M?.78:.87));c.lineTo(Math.cos(a)*r*.97,Math.sin(a)*r*.97);c.stroke();}
  if(lbls)lbls.forEach((v,i)=>{if(v==='')return;const a=(a0+(a1-a0)*i/(lbls.length-1)-90)*D2R;T(c,String(v),Math.cos(a)*r*lr,Math.sin(a)*r*lr,sz);});}
function arc(c,r,a0,a1,col,w=7){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.arc(0,0,r,(a0-90)*D2R,(a1-90)*D2R);c.stroke();}
function needle(c,r,deg,len=.84,w=7,col=INK,tail=.18){c.save();c.rotate(deg*D2R);c.shadowColor='rgba(0,0,0,.8)';c.shadowBlur=6;c.shadowOffsetX=3;c.shadowOffsetY=4;
  c.fillStyle=col;c.beginPath();c.moveTo(-w*.5,r*tail);c.lineTo(-w*.4,-r*len*.75);c.lineTo(0,-r*len);c.lineTo(w*.4,-r*len*.75);c.lineTo(w*.5,r*tail);c.closePath();c.fill();c.restore();
  c.fillStyle='#222';c.beginPath();c.arc(0,0,w*1.1,0,7);c.fill();c.fillStyle='#555';c.beginPath();c.arc(0,0,w*.5,0,7);c.fill();}
function win(c,x,y,w,h,s,sz,col='#fff'){c.fillStyle='#000';c.fillRect(x-w/2,y-h/2,w,h);c.strokeStyle='#444';c.lineWidth=2;c.strokeRect(x-w/2,y-h/2,w,h);T(c,s,x,y+1,sz,col);}
function flag(c,s,x,y){c.fillStyle='#c22';c.fillRect(x-R*.2,y-R*.1,R*.4,R*.2);T(c,s,x,y,13,'#fff');}
const lin=(v,a,b)=>clamp((v-a)/(b-a),0,1);

const F={
 // airspeed, km/h x 100 (0-1500 non-linear low end), Mach window
 fart:(c,P)=>{const v=(P.cas||0)*KMH,a=t=>-150+Math.pow(lin(t,0,1500),.72)*300;c.strokeStyle=INK;
   for(let t=100;t<=1500;t+=50){const q=(a(t)-90)*D2R,M=t%100===0;c.lineWidth=M?3:1.5;c.beginPath();c.moveTo(Math.cos(q)*R*(M?.78:.87),Math.sin(q)*R*(M?.78:.87));c.lineTo(Math.cos(q)*R*.97,Math.sin(q)*R*.97);c.stroke();
     if(M&&(t<=1000||t%200===0))T(c,String(t/100),Math.cos(q)*R*.64,Math.sin(q)*R*.64,t>=1000?14:17);}
   T(c,'FART',0,-R*.34,12,DIM);T(c,'KM/H X 100',0,R*.52,10,DIM);win(c,0,R*.22,R*.5,R*.22,'M '+(P.mach||0).toFixed(2),14);needle(c,R,a(Math.max(0,v)));},
 // angle of attack, degrees (0-30, index 15.5 for autothrottle mode 3)
 alfa:(c,P)=>{const u=clamp((P.alpha||0)*R2D,-5,30);ticks(c,R,-130,130,35,5,['0','5','10','15','20','25','30','35'].slice(0,7),.66,16);
   arc(c,R*.9,-130+260*15.5/35,-130+260*16.5/35,'#3c3',6);T(c,'ALFA',0,R*.38,15,DIM);T(c,'GRADER',0,R*.54,10,DIM);needle(c,R,-130+260*clamp((u+0)/35,0,1));},
 acc:(c,P)=>{P._minNz=Math.min(P._minNz==null?1:P._minNz,P.nz||1);ticks(c,R,-150,150,14,2,[-4,-2,0,2,4,6,8,10],.64,17);T(c,'G',0,R*.4,16,DIM);
   const a=g=>-150+300*clamp((g+4)/14,0,1);needle(c,R,a(P.maxNz||1),.78,4,'#cfcfc8');needle(c,R,a(P._minNz),.78,4,'#cfcfc8');needle(c,R,a(P.nz||1));},
 // vertical speed, m/s
 vvi:(c,P)=>{const v=(P.vel?P.vel.y:0),f=x=>Math.sign(x)*Math.pow(Math.min(1,Math.abs(x)/50),.5);ticks(c,R,-165,-15,6,1,['','','','','','',''],.6,15);ticks(c,R,15,165,6,1,['','','','','','',''],.6,15);
   for(const[m,l]of[[5,'5'],[10,'10'],[20,'20'],[50,'50']])for(const sg of[-1,1]){const a=(-90+sg*0)*D2R;const ang=(sg>0?-90+f(m)*85:-90-f(m)*85)*D2R;T(c,l,Math.cos(ang)*R*.58,Math.sin(ang)*R*.58,13);}
   T(c,'M/S',0,R*.5,13,DIM);T(c,'+',-R*.55,-R*.2,18);T(c,'-',-R*.55,R*.25,18);needle(c,R,-90+f(clamp(v,-50,50))*85);},
 // backup altimeter, thin needle x100 m, thick needle x1000 m, QFE window
 hoj:(c,P)=>{const h=Math.max(0,P.pos.y);ticks(c,R,0,360,50,5,null);for(let d=0;d<10;d++){const q=(d*36-90)*D2R;T(c,String(d),Math.cos(q)*R*.66,Math.sin(q)*R*.66,19);}
   T(c,'HOJD',0,-R*.4,13,DIM);win(c,R*.45,0,R*.46,R*.24,String(sv('qfe',1013)),12);needle(c,R,(h%1000)/1000*360,.9,4,INK);needle(c,R,(h%10000)/10000*360,.55,9,'#ddd');},
 // N2 rpm percent
 rpm:(c,P)=>{const r=rpm(P);ticks(c,R,-150,150,22,2,['0','10','20','30','40','50','60','70','80','90','100','110'],.68,14);arc(c,R*.93,-150+300*100/110,150,'#d33');
   T(c,'N2',0,-R*.3,16,INK);T(c,'VARV %',0,R*.5,11,DIM);needle(c,R,-150+300*clamp(r/110,0,1));},
 // engine pressure ratio
 epr:(c,P)=>{const r=rpm(P),p=r<30?1:1+lin(r,55,100)*2.2;ticks(c,R,-140,140,12,2,['1.0','1.5','2.0','2.5','3.0','3.5'],.62,14);T(c,'EPR',0,-R*.34,16);needle(c,R,-140+280*clamp((p-1)/2.5,0,1));},
 // exhaust gas temperature, C x 100
 egt:(c,P)=>{const t=egt(P);ticks(c,R,-150,150,20,2,[0,1,2,3,4,5,6,7,8,9,10],.64,14);T(c,'EGT',0,-R*.34,15);T(c,'C X 100',0,R*.5,10,DIM);needle(c,R,-150+300*clamp(t/1000,0,1));},
 // fuel: long needle quantity %, striped needle = needed for planned route
 fuel:(c,P)=>{ticks(c,R,-140,140,20,2,[0,10,20,30,40,50,60,70,80,90,100],.66,13);T(c,'BRANSLE',0,-R*.3,13,DIM);T(c,'%',0,R*.5,13,DIM);
   needle(c,R,-140+280*.35,.7,5,'#e8c040');needle(c,R,-140+280*fuelPct(P)/100,.86,8);},
 clk:(c,P)=>{const d=new Date();ticks(c,R,0,330,59,5,[12,1,2,3,4,5,6,7,8,9,10,11],.68,20);needle(c,R,((d.getHours()%12)+d.getMinutes()/60)*30,.5,8);needle(c,R,d.getMinutes()*6,.8,6);needle(c,R,d.getSeconds()*6,.88,2.5,'#e33');},
 // course indicator (magnetic heading card, bearing pointer to the selected destination)
 hsi:(c,P)=>{const hd=P.hdg||0,brg=brgField(P);c.save();c.rotate(-hd*D2R);for(let i=0;i<72;i++){const a=i*5*D2R;c.strokeStyle=INK;c.lineWidth=i%2?1.5:3;c.beginPath();c.moveTo(Math.sin(a)*R*(i%2?.86:.8),-Math.cos(a)*R*(i%2?.86:.8));c.lineTo(Math.sin(a)*R*.95,-Math.cos(a)*R*.95);c.stroke();}
   ['N','3','6','O','12','15','S','21','24','V','30','33'].forEach((s,i)=>{c.save();c.rotate(i*30*D2R);T(c,s,0,-R*.68,s.length>1?16:19);c.restore();});
   c.save();c.rotate(brg*D2R);c.strokeStyle='#e8e8e0';c.lineWidth=3;c.beginPath();c.moveTo(0,-R*.62);c.lineTo(0,R*.62);c.stroke();c.fillStyle='#e8e8e0';c.beginPath();c.moveTo(0,-R*.78);c.lineTo(-10,-R*.58);c.lineTo(10,-R*.58);c.closePath();c.fill();c.restore();c.restore();
   c.fillStyle='#ffb21a';c.beginPath();c.moveTo(0,-R);c.lineTo(-7,-R+14);c.lineTo(7,-R+14);c.fill();c.strokeStyle='#ffb21a';c.lineWidth=4;c.beginPath();c.moveTo(-R*.2,0);c.lineTo(R*.2,0);c.moveTo(0,-R*.18);c.lineTo(0,R*.18);c.stroke();},
 adi:(c,P)=>{c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();c.rotate(-(P.bank||0));const k=R/48,po=(P.pitch||0)*R2D*k;
   c.fillStyle='#8aa8c0';c.fillRect(-R*2,-R*4+po,R*4,R*4);c.fillStyle='#4a3a2c';c.fillRect(-R*2,po,R*4,R*4);
   c.lineWidth=2;for(let q=5;q<=90;q+=5){for(const s of[-1,1]){const y=po-s*q*k,w=q%10?R*.1:R*.26;c.strokeStyle='#fff';c.beginPath();c.moveTo(-w,y);c.lineTo(w,y);c.stroke();if(q%10===0)T(c,String(q),w+14,y,12,'#fff');}}
   c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-R*2,po);c.lineTo(R*2,po);c.stroke();c.restore();
   c.strokeStyle=INK;c.lineWidth=2;for(const b of[-60,-45,-30,-20,-10,0,10,20,30,45,60]){const q=(b-90)*D2R;c.beginPath();c.moveTo(Math.cos(q)*R*(b%30?.9:.84),Math.sin(q)*R*(b%30?.9:.84));c.lineTo(Math.cos(q)*R*.98,Math.sin(q)*R*.98);c.stroke();}
   c.save();c.rotate(-(P.bank||0));c.fillStyle=INK;c.beginPath();c.moveTo(0,-R*.82);c.lineTo(-7,-R*.7);c.lineTo(7,-R*.7);c.closePath();c.fill();c.restore();
   c.strokeStyle='#ffb21a';c.lineWidth=6;c.beginPath();c.moveTo(-R*.55,0);c.lineTo(-R*.18,0);c.lineTo(0,R*.1);c.lineTo(R*.18,0);c.lineTo(R*.55,0);c.stroke();
   c.fillStyle='#111';c.fillRect(-R*.42,R*.78,R*.84,R*.14);c.fillStyle='#ddd';c.beginPath();c.arc(clamp(-(P.beta||0)*R2D*6,-R*.36,R*.36),R*.85,R*.065,0,7);c.fill();
   if(!powered(P))flag(c,'OFF',-R*.6,-R*.55);},
 sby:(c,P)=>{c.save();c.beginPath();c.arc(0,0,R,0,7);c.clip();c.rotate(-(P.bank||0));const k=R/40,po=(P.pitch||0)*R2D*k;c.fillStyle='#e8e8e0';c.fillRect(-R*2,-R*4+po,R*4,R*4);c.fillStyle='#1b1b1b';c.fillRect(-R*2,po,R*4,R*4);
   c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-R*2,po);c.lineTo(R*2,po);c.stroke();c.restore();c.strokeStyle='#ff8a1a';c.lineWidth=7;c.beginPath();c.moveTo(-R*.55,0);c.lineTo(-R*.15,0);c.lineTo(0,R*.12);c.lineTo(R*.15,0);c.lineTo(R*.55,0);c.stroke();},
 nozzle:(c,P)=>{const n=P.ab?Math.min(3,1+Math.round((P.ab||0)*2.5)):0;ticks(c,R,-110,110,6,1,['0','1','2','3','',''],.62,18);T(c,'MUNSTYCKE',0,R*.45,10,DIM);needle(c,R,-110+220*clamp((running(P)?.12:0)+n/3*.8,0,1));},
 o2:(c,P)=>{ticks(c,R,-130,130,10,2,['0','2','4','6','8','10'],.64,16);T(c,'SYRGAS',0,R*.4,12,DIM);T(c,'KP/CM2',0,R*.55,10,DIM);needle(c,R,-130+260*.8);},
 cab:(c,P)=>{const h=P.pos.y,ca=h<2400?h:Math.max(2400,h*.45);ticks(c,R,-150,150,10,2,['0','5','10','15','20','25'],.64,16);T(c,'KABINHOJD',0,R*.4,10,DIM);T(c,'KM',0,R*.55,12,DIM);needle(c,R,-150+300*clamp(ca/25000,0,1));},
 brk:(c,P)=>{ticks(c,R,-130,130,10,2,['0','2','4','6','8','10'],.64,16);T(c,'BROMS',0,R*.4,12,DIM);needle(c,R,-130+260*(P.onGnd?.7:0));},
 dest:(c,P)=>{const S=c.canvas.width;c.setTransform(1,0,0,1,0,0);c.fillStyle='#050505';c.fillRect(0,0,S,S);const d=distField(P);T(c,'MAL',S*.5,S*.14,S*.1,DIM);T(c,'L'+String(sv('dest',1)),S*.5,S*.38,S*.2,'#e8f8c8');
   T(c,d<999?d.toFixed(d<100?1:0):'---',S*.5,S*.66,S*.2,'#e8f8c8');T(c,'KM',S*.5,S*.88,S*.1,DIM);}
};
function brgField(P){try{return(Math.atan2(AF.x-P.pos.x,-(AF.z-P.pos.z))*R2D+360)%360;}catch(e){return 0;}}
function distField(P){try{return Math.hypot(AF.x-P.pos.x,AF.z-P.pos.z)/1000;}catch(e){return 999;}}

// [key, x, y, half-size (board px), draw fn, square?]
const INST=[
 ['fart',319,344,52,F.fart],['adi',426,292,56,F.adi],['hsi',440,432,58,F.hsi],['dest',326,446,34,F.dest,1],
 ['clk',790,198,26,F.clk],['sby',862,224,34,F.sby],
 ['acc',790,304,38,F.acc],['alfa',862,322,34,F.alfa],['vvi',790,396,36,F.vvi],['hoj',862,402,36,F.hoj],
 ['rpm',960,342,56,F.rpm],['fuel',960,456,52,F.fuel],['epr',790,466,38,F.epr],['egt',862,470,34,F.egt]];
// warning lamps [key,x,y,w,h,legend,colour,lit(P)]
const LAMPS=[
 ['brand',560,170,64,26,'BRAND','#f42',P=>(P.fire||0)>0],['hyd1',628,170,64,26,'HYDR-TR 1','#fb3',P=>!running(P)||rpm(P)<40],
 ['hyd2',696,170,64,26,'HYDR-TR 2','#fb3',P=>!running(P)||rpm(P)<40],['lst',764,170,64,26,'LANDSTALL','#3d3',P=>gearDn()&&P.gearPos>.9],
 ['olj',560,200,64,26,'OLJETRYCK','#fb3',P=>running(P)&&rpm(P)<45],['bra',628,200,64,26,'BRA UPPF','#fb3',P=>(P.totalFuel||0)<150],
 ['elfel',696,200,64,26,'ELFEL','#fb3',P=>!(P.eng&&!P.eng.done?P.eng.gen:running(P))],['afkf',764,200,64,26,'AFK FEL','#fb3',P=>false],
 ['ar',320,196,70,24,'REV AVDR','#fb3',P=>false],['fl',400,196,70,24,'FALLD LAST','#fb3',P=>false],
 ['hv',700,238,60,24,'HUVUDVARN','#f42',P=>!mcAck&&(!running(P)||(P.fire||0)>0||(P.totalFuel||0)<150)],
 ['hojw',640,238,50,24,'HOJD','#f42',P=>!P.onGnd&&P.pos.y<sv('minH',100)&&gearDn()===false]];
function cautions(P){const L=[];if(!running(P))L.push('MOTOR');if((P.totalFuel||0)<150)L.push('BRANSLE');if(running(P)&&rpm(P)<45)L.push('OLJETRYCK');if((P.fire||0)>0)L.push('BRAND');return L;}

/* ---------------- build ---------------- */
function build(ctx){const{g,box,LM,liveTex}=ctx;const ctls=[],upd=[],lamps=[];
  const hit=new THREE.MeshBasicMaterial({visible:false});
  const PC=0x34373a,pm=LM(PC,12),dk=LM(0x17191a,8),blk=LM(0x0b0c0d,4),bz=LM(0x141618,40),met=LM(0x9aa0a4,60);
  const board=new THREE.Group();board.position.set(0,-.53,-.74);board.rotation.x=-.2;g.add(board);
  // outline from the photograph: sloped shoulders either side of the central indicator, wide lower pedestal for the map indicators
  const OUT=[[262,560],[262,330],[300,230],[380,170],[525,150],[640,138],[755,150],[900,170],[985,200],[1020,330],[1020,560],[790,560],[790,640],[490,640],[490,560]];
  const sh=new THREE.Shape();OUT.forEach(([x,y],i)=>i?sh.lineTo(bx(x),by(y)):sh.moveTo(bx(x),by(y)));
  const X0=250,Y0=130,W0=790,H0=520,bg=document.createElement('canvas');bg.width=1580;bg.height=1040;const SX=bg.width/W0,SY=bg.height/H0,fx=x=>(x-X0)*SX,fy=y=>(y-Y0)*SY;
  {const c=bg.getContext('2d');c.fillStyle='#2b2e30';c.fillRect(0,0,bg.width,bg.height);
    const lab=(s,x,y,sz=11,al='center',col='#e9e9e2')=>{c.font=`bold ${sz*SX}px Arial`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;s.split('\n').forEach((l,i,a)=>c.fillText(l,fx(x),fy(y)+(i-(a.length-1)/2)*(sz+2)*SY));};
    const box2=(x0,y0,x1,y1,col='#141516')=>{c.fillStyle=col;c.fillRect(fx(x0),fy(y0),(x1-x0)*SX,(y1-y0)*SY);};
    box2(535,140,745,300,'#0c0d0e');           // central indicator housing
    box2(538,330,744,556,'#1a1c1d');           // data table below the CI
    lab('PLATSLISTA / DATA',641,342,8);for(let r=0;r<9;r++){c.fillStyle='rgba(235,235,225,.5)';c.fillRect(fx(555),fy(360+r*20),150*SX,1.5);}
    box2(548,160,735,222,'#101112');
    // warning panels (left upper, right upper) and legends
    box2(552,160,860,236,'#17191a');
    lab('VARNING',590,150,8);lab('MOTOR / HYDRAULIK',700,150,8);
    // flight data plates
    box2(300,162,520,214,'#17191a');lab('SIKTE / HUD',410,152,8);
    c.fillStyle='rgba(255,255,255,.22)';for(const [x,y] of[[272,340],[1010,340],[272,545],[1010,545],[640,150],[640,560]]){c.beginPath();c.arc(fx(x),fy(y),5,0,7);c.fill();}}
  const bgT=new THREE.CanvasTexture(bg);bgT.anisotropy=8;ctx.o.tex.push(bgT);
  const geo=new THREE.ShapeGeometry(sh);{const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i)/K+OX,y=OY-p.getY(i)/K;uv.setXY(i,(x-X0)/W0,1-(y-Y0)/H0);}uv.needsUpdate=true;}
  const faceM=new THREE.MeshBasicMaterial({map:bgT,toneMapped:false});ctx.o.faces.push(faceM);const bm=new THREE.Mesh(geo,faceM);bm.userData.cwFx=1;board.add(bm);
  {const eg=new THREE.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:false});const e=new THREE.Mesh(eg,pm);e.position.z=-.031;e.userData.cwFx=1;board.add(e);}
  // central indicator: big round CRT in a square bezel with the radar picture
  box(board,230*K,230*K,.03,dk,bx(640),by(300),.012);
  {const scC=typeof phScopeC!=='undefined'?phScopeC:null;if(scC){const m=new THREE.MeshBasicMaterial({map:liveTex(ctx.kind,scC),toneMapped:false});ctx.o.faces.push(m);const sc=new THREE.Mesh(new THREE.CircleGeometry(104*K,48),m);sc.position.set(bx(640),by(300),.03);sc.userData.cwFx=1;board.add(sc);}}
  try{if(window.WPNSCOPE&&WPNSCOPE.can(ID))WPNSCOPE.mount(board,{cx:bx(640),cy:by(300),R:104*K,px:bx(640+120),py:by(300+120),z:.0245});}catch(e){console.warn('[ajspit] scope switch',e);}
  const glsM=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.08,shininess:140,specular:0x8a8a8a,depthWrite:false});
  function inst(k,x,y,hs,draw,sq){const S=k==='adi'||k==='hsi'||k==='sby'?256:hs<40?128:192,cv=document.createElement('canvas');cv.width=cv.height=S;const t=new THREE.CanvasTexture(cv);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;t.anisotropy=4;ctx.o.tex.push(t);
    const c=cv.getContext('2d'),r=hs*K;
    if(sq)box(board,2*r*1.04,2*r*1.04,.03,bz,bx(x),by(y),.008);else{const cs=new THREE.Mesh(new THREE.CylinderGeometry(r*1.03,r*1.08,.03,36),bz);cs.rotation.x=Math.PI/2;cs.position.set(bx(x),by(y),.008);cs.userData.cwFx=1;board.add(cs);}
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const fm=new THREE.Mesh(sq?new THREE.PlaneGeometry(r*1.8,r*1.8):new THREE.CircleGeometry(r*.9,48),m);fm.position.set(bx(x),by(y),.0245);fm.userData.cwFx=1;board.add(fm);
    if(!sq){const gl=new THREE.Mesh(new THREE.CircleGeometry(r*.92,40),glsM);gl.position.set(bx(x),by(y),.026);gl.userData.cwFx=1;gl.renderOrder=2;board.add(gl);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.92,r*.05,8,40),LM(0x0a0a0a,30));ring.position.set(bx(x),by(y),.0245);ring.userData.cwFx=1;board.add(ring);}
    let last=-1,lt=0;upd.push(P=>{const tn=now();if(tn-lt<(k==='adi'||k==='hsi'||k==='fart'||k==='sby'?.025:.1))return;lt=tn;if(k!=='dest'){face(c,S);c.scale(S/256,S/256);}draw(c,P);t.needsUpdate=true;});}
  INST.forEach(([k,x,y,hs,d,sq])=>inst(k,x,y,hs,d,sq));
  function lampAt(par,x,y,z,w,h,lg,col,lit,ww,hh){const cv=document.createElement('canvas');cv.width=128;cv.height=Math.max(32,Math.round(128*hh/ww));const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const lm=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);lm.position.set(x,y,z);lm.userData.cwFx=1;par.add(lm);let last=null;
    lamps.push(P=>{const on=lampTest>now()||!!lit(P);if(on===last)return;last=on;c.fillStyle=on?col:'#1c1a14';c.fillRect(0,0,cv.width,cv.height);c.font=`bold ${Math.round(cv.height*.34)}px Arial`;c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=on?'#200':'#6a6454';c.fillText(lg,64,cv.height/2);t.needsUpdate=true;});return lm;}
  LAMPS.forEach(([k,x,y,w,h,lg,col,lit])=>{lampAt(board,bx(x),by(y),.016,w*K,h*K,lg,col,lit,w,h);box(board,w*K+.004,h*K+.004,.012,blk,bx(x),by(y),.009);});

  /* ---------- tilted map indicators either side of the stick ---------- */
  function mapInd(cx,cy,w,h,side){const cv=document.createElement('canvas');cv.width=256;cv.height=330;const c=cv.getContext('2d'),t=new THREE.CanvasTexture(cv);ctx.o.tex.push(t);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);const grp=new THREE.Group();grp.position.set(cx,cy,-.42);grp.rotation.set(-.95,0,side*.08);g.add(grp);
    box(grp,w+.014,h+.014,.012,blk,0,0,-.007);const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);pl.userData.cwFx=1;grp.add(pl);let lt=0;
    upd.push(P=>{const tn=now();if(tn-lt<.5)return;lt=tn;c.fillStyle='#bfd6a2';c.fillRect(0,0,256,330);c.fillStyle='#8fb7d8';c.fillRect(0,0,256,80);c.strokeStyle='rgba(60,70,50,.45)';c.lineWidth=1;
      const ox=-(P.pos.x/4000)%32,oy=-(P.pos.z/4000)%32;for(let i=-1;i<10;i++){c.beginPath();c.moveTo(i*32+ox,0);c.lineTo(i*32+ox,330);c.stroke();c.beginPath();c.moveTo(0,i*32+oy);c.lineTo(256,i*32+oy);c.stroke();}
      c.save();c.translate(128,215);c.rotate(0);c.fillStyle='#111';c.beginPath();c.moveTo(0,-12);c.lineTo(-8,10);c.lineTo(8,10);c.closePath();c.fill();c.restore();
      try{const dx=(AF.x-P.pos.x)/4000,dz=(AF.z-P.pos.z)/4000,hd=-(P.hdg||0)*0,ax=128+dx,az=215+dz;if(ax>0&&ax<256&&az>0&&az<330){c.fillStyle='#c22';c.fillRect(ax-4,az-4,8,8);}}catch(e){}
      c.fillStyle='#222';c.font='bold 13px Arial';c.textAlign='center';c.fillText('KARTA',128,320);t.needsUpdate=true;});}
  mapInd(-.16,-.62,.2,.26,-1);mapInd(.18,-.62,.2,.26,1);

  /* ---------- clickable controls ---------- */
  function reg(mesh,name,state,act){mesh.userData.ctl={meshes:[mesh],name,state,act:(d)=>{try{act(d);}catch(e){console.warn('[ajspit]',name,e);}try{sfx.click();}catch(e){}}};ctls.push(mesh.userData.ctl);}
  function toggle(par,x,y,z,name,pos,get,set,o={}){const gq=new THREE.Group();gq.position.set(x,y,z);if(o.rx)gq.rotation.x=o.rx;par.add(gq);
    const nut=new THREE.Mesh(new THREE.CylinderGeometry(.0065,.0065,.004,12),met);nut.rotation.x=Math.PI/2;gq.add(nut);
    const lv=new THREE.Group();gq.add(lv);const st=new THREE.Mesh(new THREE.CylinderGeometry(.0022,.0028,.022,8),LM(o.col||0xd8d8d0,50));st.position.y=.011;lv.add(st);
    const h=new THREE.Mesh(new THREE.BoxGeometry(.026,.03,.03),hit);h.userData.cwFx=1;gq.add(h);const n=pos.length;let cur=-1;
    upd.push(()=>{const i=clamp(get(),0,n-1);if(i===cur)return;cur=i;lv.rotation.x=n===2?(i?-.55:.55):(i-1)*-.6;});
    reg(h,name,()=>pos[clamp(get(),0,n-1)],d=>{const i=get();set(n===2?1-i:(i+(d<0?-1:1)+n)%n);});return gq;}
  function button(par,x,y,z,r,name,col,act,state){const b=new THREE.Mesh(new THREE.CylinderGeometry(r,r,r*.8,14),LM(col,40));b.rotation.x=Math.PI/2;b.position.set(x,y,z);par.add(b);
    const h=new THREE.Mesh(new THREE.BoxGeometry(r*3,r*3,r*3),hit);h.position.set(x,y,z);h.userData.cwFx=1;par.add(h);reg(h,name,state||(()=>'PUSH'),act);return b;}
  const BZ=.02;
  // autopilot buttons (SPAK / ATT / HOJD), autothrottle AFK, master caution reset, indicator test
  [['SPAK (main damping)','spak',1,380],['ATT (attitude hold)','att',0,410],['HOJD (altitude hold)','hojd',0,440]].forEach(([n,k,d,x])=>{
    const b=button(board,bx(x),by(536),BZ,9*K,'AUTOPILOT '+n,0x3a4a3a,()=>{ST[k]=sv(k,d)?0:1;},()=>sv(k,d)?'ON':'OFF');upd.push(()=>{b.material.color.set(sv(k,d)?0x58d058:0x3a4a3a);});});
  [['AFK (autothrottle)','afk',640],['AFK MODE 3 · ALFA 15.5','afk3',680]].forEach(([n,k,x])=>{const b=button(board,bx(x),by(536),BZ,9*K,n,0x4a4a3a,()=>{ST[k]=sv(k,0)?0:1;},()=>sv(k,0)?'ON':'OFF');upd.push(()=>{b.material.color.set(sv(k,0)?0xe0c040:0x4a4a3a);});});
  button(board,bx(760),by(262),BZ,10*K,'MASTER CAUTION RESET (HUVUDVARNING)',0x883322,()=>{mcAck=true;});
  button(board,bx(335),by(530),BZ,9*K,'INDICATOR / LAMP TEST',0x777777,()=>{lampTest=now()+3;});
  toggle(board,bx(800),by(536),BZ,'HUD/SI SLAVE · F / T',['F','T'],()=>sv('hudsl',1),v=>{ST.hudsl=v;});
  toggle(board,bx(900),by(536),BZ,'ALTITUDE SOURCE · RHM / LD',['RHM','LD'],()=>sv('hsrc',0),v=>{ST.hsrc=v;});
  // gear lever (left of the stick) and airbrake
  {const gh=new THREE.Group();gh.position.set(bx(300),by(500),.03);board.add(gh);box(gh,.008,.008,.04,met,0,0,.02);const wh=new THREE.Mesh(new THREE.SphereGeometry(.014,14,10),LM(0xe8e8e8,40));wh.position.z=.045;gh.add(wh);
    const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.06),hit);hb.position.z=.03;hb.userData.cwFx=1;gh.add(hb);reg(hb,'LANDING GEAR LEVER (LANDSTALL)',()=>gearDn()?'DOWN':'UP',()=>{try{uiKey('Digit7');}catch(e){}});upd.push(()=>{gh.position.z=.03+(gearDn()?0:.012);});}

  /* ---------- consoles ---------- */
  const CY=-.64,CW=.2,CZ0=-.54,CZ1=.3;
  function cpanel(side,u0,u1,z0,z1,title,draw){const w=CW*(u1-u0),xo=side*(.43+CW/2)-side*CW*((u0+u1)/2),d=z1-z0,cv=document.createElement('canvas');cv.width=Math.max(64,Math.round(w*1500));cv.height=Math.max(48,Math.round(d*1500));const c=cv.getContext('2d');
    c.fillStyle='#c9ccc8';c.fillRect(0,0,cv.width,cv.height);c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=3;c.strokeRect(3,3,cv.width-6,cv.height-6);
    c.font='bold 15px Arial';c.textAlign='center';c.fillStyle='#161616';if(title)c.fillText(title,cv.width/2,19);if(draw)draw(c,cv.width,cv.height);
    const t=new THREE.CanvasTexture(cv);t.anisotropy=4;ctx.o.tex.push(t);const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});ctx.o.faces.push(m);
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);pl.rotation.x=-Math.PI/2;pl.position.set(xo,CY+.001,(z0+z1)/2);pl.userData.cwFx=1;g.add(pl);
    return{at:(u,v,h=.004)=>[xo-w/2+u*w,CY+h,z0+v*d],lab:(s,u,v,sz=11)=>{c.font=`bold ${sz}px Arial`;c.textAlign='center';c.fillStyle='#161616';c.fillText(s,u*cv.width,v*cv.height);t.needsUpdate=true;}};}
  const tg=(p,u,v,name,pos,get,set,o={})=>{const[x,y,z]=p.at(u,v);return toggle(g,x,y,z,name,pos,get,set,Object.assign({rx:-Math.PI/2},o));};
  const lbl=(p,u,v,s)=>p.lab(s,u,v-.14,10);
  box(g,.18,.34,.22,dk,0,-1.0,-.68);
  [-1,1].forEach(sd=>{box(g,.22,.1,.98,LM(0x2a2d30,8),sd*.43,CY-.052,-.15);box(g,.05,.1,1.3,LM(0x25282a,8),sd*.555,-.55,-.2);});
  {const sk=LM(0x1c1f21,6);box(g,1.14,.02,1.5,sk,0,-1.23,-.1);[-1,1].forEach(sd=>box(g,.03,.66,1.3,sk,sd*.565,-.93,-.2));box(g,1.1,.5,.03,sk,0,-1.0,-.86);}
  // left console (forward = smaller z): engine, radar, fuel, radio, oxygen
  {const p=cpanel(-1,.3,1,-.5,-.3,'MOTOR / ELSYSTEM',null);
   tg(p,.2,.55,'HIGH-PRESSURE FUEL VALVE · OFF / ON',['AV','PA'],()=>sv('hpv',1),v=>{ST.hpv=v;});lbl(p,.2,.55,'HTRYCK');
   tg(p,.5,.55,'IGNITION SYSTEM · MAN / AUT',['MAN','AUT'],()=>sv('ign',1),v=>{ST.ign=v;});lbl(p,.5,.55,'TANDSYST');
   button(g,...p.at(.8,.55,.006),.007,'ENGINE RESTART (ATERSTART)',0x2a2a2a,()=>{const P=PL();if(P&&P.eng&&!P.eng.done&&window.START)START.src();});lbl(p,.8,.55,'ATERSTART');}
  {const p=cpanel(-1,.3,1,-.28,-.05,'RADAR',null);
   tg(p,.2,.55,'RADAR MODE · A0 OFF / A1 SEARCH / A2 TRACK',['A0','A1','A2'],()=>({OFF:0,STBY:1,ON:2})[radar.power]??2,v=>{radar.power=['OFF','STBY','ON'][v];if(v===2)radar.warm=Math.max(radar.warm||0,3);});lbl(p,.2,.55,'RADAR');
   tg(p,.55,.55,'RADAR PULSE LENGTH · NORMAL / KORT',['NORMAL','KORT'],()=>sv('plen',0),v=>{ST.plen=v;});lbl(p,.55,.55,'PULS');
   tg(p,.85,.55,'TERRAIN AVOIDANCE · OFF / ON',['AV','PA'],()=>sv('tfr',0),v=>{ST.tfr=v;});lbl(p,.85,.55,'TERRANG');}
  {const p=cpanel(-1,.3,1,-.03,.2,'RADIO FR22',null);
   tg(p,.25,.5,'FR22 · OFF / ON',['AV','PA'],()=>sv('fr22',1),v=>{ST.fr22=v;});lbl(p,.25,.5,'FR22');}
  // right console: CK37 navigation panel and lights
  {const p=cpanel(1,0,.7,-.5,-.1,'CK37 NAVIGATION',(c,w,h)=>{c.fillStyle='#050505';c.fillRect(w*.1,h*.2,w*.8,h*.2);c.fillStyle='#e8f8c8';c.font='bold 18px monospace';c.textAlign='center';c.fillText('00000000',w/2,h*.34);});
   tg(p,.25,.7,'NAVIGATION INPUT / OUTPUT · IN / UT',['IN','UT'],()=>sv('nio',1),v=>{ST.nio=v;});lbl(p,.25,.7,'IN/UT');
   tg(p,.7,.7,'NAVIGATION DATA SELECTOR',['AKT POS','REF LOLA','BANA','VIND','TID','TAKT'].slice(0,3),()=>sv('nds',0),v=>{ST.nds=v;});lbl(p,.7,.7,'DATA');}
  {const p=cpanel(1,0,.7,-.08,.2,'BELYSNING · SYRGAS',null);
   tg(p,.2,.5,'POSITION LIGHTS · LEDLJUS',['AV','PA'],()=>sv('pos',0),v=>{ST.pos=v;});lbl(p,.2,.5,'LEDLJUS');
   tg(p,.55,.5,'LANDING / TAXI LIGHT · STRALKAST',['AV','PA'],()=>sv('lt',0),v=>{ST.lt=v;});lbl(p,.55,.5,'STRALK.');
   tg(p,.88,.5,'OXYGEN LEVER · TILL / FRAN',['FRAN','TILL'],()=>sv('o2',1),v=>{ST.o2=v;});lbl(p,.88,.5,'SYRGAS');}

  // control stick and throttle follow the borrowed ones (they drive the controls)
  const stkG=new THREE.Group(),thrG=new THREE.Group();g.add(stkG);g.add(thrG);thrG.visible=false;
  box(stkG,.026,.34,.026,LM(0x1a1a1a,30),0,.17,0);box(stkG,.04,.11,.044,LM(0x232323,20),0,.39,-.004,-.25);box(stkG,.012,.02,.012,LM(0xb02020,30),-.016,.43,0);
  let t=0;
  return{stkG,thrG,ctls,upd:(P)=>{if(!P)return;if(!cautions(P).length)mcAck=false;for(const l of lamps)l(P);const tn=now();if(tn-t<.04)return;t=tn;
    for(let i=0;i<upd.length;i++){try{upd[i](P);}catch(e){}}}};}

PIT[ID].custom=build;
console.info('[ajspit] AJS 37 Viggen cockpit active');
})();
