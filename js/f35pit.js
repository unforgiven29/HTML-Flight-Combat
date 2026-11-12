/* =====================================================================================================================
   f35pit.js — F-35A Lightning II cockpit (first dedicated modern cockpit; the F-35A no longer borrows the F-16C pit).
   Built from reference photographs of the production cockpit (annotated walk-round photo, canopy-open overview and the simulator
   recreation):
   * ONE panoramic display (20 x 8 in) = left + right PCD, no HUD glass: the Gen III helmet display is the HUD. Symbology is clipped to a
     helmet-sized visor field that follows the head (40 x 30 deg), not to a combiner on the glareshield.
   * Under the display: the helmet / screen brightness strip (HMD BRT / VIDEO BRT / VIDEO CONT, night-day), the master arm panel, the
     standby flight display (blue / brown ADI), and the instrument control panel (blank in service aircraft).
   * Left console: jettison (guarded rotary), landing gear handle, parking brake, emergency gear. Right console: auto-recovery guarded switch,
     B/U battery, flight test aid, CM doors. Side stick (right console) and single throttle (left console), yellow / black ejection handle between
     the knees, black fabric seat, canopy bow.
   * Display windows (touch): four windows across the screen, each with a page chosen from the tab bar below it:
       TSD  tactical situation: radar tracks (diamonds with heading vector, lock / bug marks), own-ship, range rings, datalink flight
       HSI  attitude, airspeed, altitude, Mach, G, heading tape, vertical speed, gear and flap cues
       SMS  stores by station with counts, master arm state, selected weapon, gun rounds
       EW   threat display: emitters on a ring by bearing, missile alerts (RWR / MAWS), countermeasure count
       EOTS electro-optical targeting page (uses the targeting-pod renderer)
       ENG / FUEL / GEAR  engine, fuel and landing gear / door status
   Top strip: ICAWS caution messages, AP / AT annunciators, MENU. All numbers come from the same simulation as the other cockpits.
   Gameplay-level layout from photographs, not a drawing-office copy; page contents are generic F-35 style, not the real software.
   Needs game.js, modern-jets.js.
   ===================================================================================================================== */
(function(){'use strict';
if(typeof ck==='undefined'||typeof ckScene==='undefined'||typeof AC==='undefined'||!AC['F-35A']){console.warn('[f35pit] missing');return;}
const D=Math.PI/180,PL=()=>typeof player!=='undefined'?player:null;
const out={root:new THREE.Group(),tex:[],lamps:[],anims:[],redraw:[],stat:[],faces:[],ctls:[]};
ckScene.add(out.root);const root=out.root;root.visible=false;
const L=(c,sh=10)=>new THREE.MeshPhongMaterial({color:c,shininess:sh,specular:0x151515});
const grey=L(0x4d535a),dgrey=L(0x2c3036),black=L(0x0d0e10),panelM=L(0x34383d),consM=L(0x4a5057),fabric=L(0x16171a,2),hood=L(0x101113,6),alu=L(0xa6abb0,50),redM=L(0xb01c14,30),yel=L(0xd8b418,20),leather=L(0x0e0e10,25);
const add=(geo,mat,x,y,z,par=root,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);par.add(m);return m;};
const box=(w,h,d,mat,x,y,z,par,rx,ry,rz)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,par,rx,ry,rz);
const mkCv=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const mkTex=cv=>{const t=new THREE.CanvasTexture(cv);t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;out.tex.push(t);return t;};
const FONT='"B612 Mono","B612",monospace';
const hitM=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
const reg=(meshes,def)=>{def.meshes=meshes;for(const m of meshes)m.userData.ctl=def;out.ctls.push(def);return def;};
const plate=(par,x,y,w,h,cw,draw,z=.001,mat)=>{const ch=Math.round(cw*h/w),cv=mkCv(cw,ch),rd=()=>{const c=cv.getContext('2d');c.setTransform(1,0,0,1,0,0);draw(c,cw,ch);t.needsUpdate=true;},t=mkTex(cv);
  const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});out.faces.push(m);add(new THREE.PlaneGeometry(w,h),m,x,y,z,par);rd();out.redraw.push(rd);return{cv,rd,t};};
const txt=(c,s,x,y,sz,col='#d8dcd8',al='center',w='700')=>{c.font=`${w} ${sz}px ${FONT}`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;c.fillText(s,x,y);};
const ARM=()=>typeof game!=='undefined'?game.armPos:1;

/* ---------------- shell ---------------- */
// instrument panel group: tilted back so the screen faces the eye
const pnl=new THREE.Group();pnl.position.set(0,-.43,-.56);pnl.rotation.x=-.3;pnl.scale.setScalar(1.4);root.add(pnl);
box(.78,.27,.05,hood,0,.02,-.045,pnl);                                       // panel body behind the screen
box(.55,.25,.03,black,0,.045,-.012,pnl);                                    // bezel round the screen
box(.62,.02,.1,hood,0,.16,-.08,pnl);box(.92,1.2,.05,hood,0,-.45,-.07,pnl);                                  // glareshield / hood above the display

// panoramic display
const PW=2000,PH=800,pcv=mkCv(PW,PH),ptex=mkTex(pcv),pmat=new THREE.MeshBasicMaterial({map:ptex,toneMapped:false});out.faces.push(pmat);
const scr=add(new THREE.PlaneGeometry(.508,.203),pmat,0,.045,.006,pnl);scr.userData.screen='f35pcd';
// below the screen: control strip, master arm + standby display, instrument control panel
const strip=new THREE.Group();strip.position.set(0,-.115,0);pnl.add(strip);box(.26,.046,.024,dgrey,0,0,.004,strip);
// center pedestal (recessed lower block under the screen)
const ped0=new THREE.Group();ped0.position.set(0,-.3,.02);ped0.rotation.x=.18;pnl.add(ped0);box(.27,.2,.05,consM,0,-.06,-.02,ped0);

/* switch / button / knob helpers: click and wheel work through the game's userData.ctl hook */
const tog=(par,x,y,name,get,set,o={})=>{const g=new THREE.Group();g.position.set(x,y,.012);par.add(g);add(new THREE.CylinderGeometry(.011,.012,.01,12),alu,0,0,0,g,Math.PI/2);
  const lev=new THREE.Group();g.add(lev);box(.006,.03,.006,alu,0,.015,0,lev);add(new THREE.SphereGeometry(.006,8,6),alu,0,.03,0,lev);
  if(o.guard)box(.034,.044,.004,L(0xb59a18),0,.0,.014,g);
  const hb=box(.04,.05,.03,hitM,0,.0,.01,g);let v=get()?1:0;lev.rotation.x=v?-.5:.5;out.anims.push(dt=>{const t=(get()?1:0)?-.5:.5;lev.rotation.x+=(t-lev.rotation.x)*Math.min(1,dt*16);});
  return reg([hb,lev],{name,state:()=>get()?(o.on||'ON'):(o.off||'OFF'),act:()=>{set(!get());sfx.click();}});};
const dial=(par,x,y,r,name,get,set,n,o={})=>{const g=new THREE.Group();g.position.set(x,y,.012);par.add(g);const b=add(new THREE.CylinderGeometry(r,r*1.1,.014,16),black,0,0,0,g,Math.PI/2);
  const pt=box(.004,r*.9,.003,L(0xe0e0e0),0,r*.45,.008,g);const a=()=>-1.9+3.8*get()/Math.max(1,n-1);g.rotation.z=-a();out.anims.push(dt=>{g.rotation.z+=(-a()-g.rotation.z)*Math.min(1,dt*14);});
  return reg([b,pt],{name,wheel:true,state:()=>o.label?o.label(get()):String(get()),act:d=>{set(Math.max(0,Math.min(n-1,get()+d)));sfx.click();}});};
const pbtn=(par,x,y,w,h,name,act,col=0x23272b)=>{const m=box(w,h,.008,L(col),x,y,.012,par);return reg([m],{name,state:()=>'',act:()=>{act();sfx.click();m.position.z=.009;setTimeout(()=>m.position.z=.012,110);}});};
const S2={hmdBrt:.7,vidBrt:.8,vidCon:.5,night:0,aut:0,bub:1,fta:0,cmd:1,park:1};
// HMD / screen control strip
plate(strip,0,0,.25,.04,500,(c,w,h)=>{c.fillStyle='#0b0c0d';c.fillRect(0,0,w,h);txt(c,'HMD',w*.17,h*.1,h*.15,'#cfd3d0');txt(c,'MFD',w*.83,h*.1,h*.15,'#cfd3d0');txt(c,'BRT',w*.12,h*.88,h*.13);txt(c,'VIDEO BRT',w*.33,h*.88,h*.13);txt(c,'VIDEO CONT',w*.64,h*.88,h*.13);txt(c,'BRT',w*.9,h*.88,h*.13);},.0135);
dial(strip,-.085,.0,.009,'HMD BRT',()=>Math.round(S2.hmdBrt*9),v=>{S2.hmdBrt=v/9;},10,{label:v=>Math.round(v/9*100)+'%'});
dial(strip,-.025,.0,.009,'HMD VIDEO BRT',()=>Math.round(S2.vidBrt*9),v=>{S2.vidBrt=v/9;},10,{label:v=>Math.round(v/9*100)+'%'});
dial(strip,.03,.0,.009,'MFD VIDEO CONTRAST',()=>Math.round(S2.vidCon*9),v=>{S2.vidCon=v/9;},10,{label:v=>Math.round(v/9*100)+'%'});
dial(strip,.088,.0,.009,'MFD BRT',()=>Math.round((typeof sys!=='undefined'?sys.lt.inst:1)*9),v=>{if(typeof sys!=='undefined')sys.lt.inst=v/9;},10,{label:v=>Math.round(v/9*100)+'%'});
tog(strip,-.058,-.0,'HMD DAY / NIGHT',()=>S2.night,v=>{S2.night=v?1:0;},{on:'NIGHT',off:'DAY'});
// master arm panel + standby flight display
{const ma=new THREE.Group();ma.position.set(-.06,-.215,0);pnl.add(ma);box(.1,.12,.02,L(0x3a3f45),0,0,.003,ma);
  plate(ma,0,.0,.095,.115,300,(c,w,h)=>{c.fillStyle='#202327';c.fillRect(0,0,w,h);txt(c,'MASTER ARM',w*.5,h*.1,h*.07,'#d4d8d4');txt(c,'ARM',w*.78,h*.3,h*.06);txt(c,'SAFE',w*.78,h*.55,h*.06);
    for(let i=0;i<4;i++){c.fillStyle='#14161a';c.fillRect(w*(.08+i*.22),h*.72,w*.17,h*.12);}for(let i=0;i<3;i++)txt(c,['SIM','AUTO','TEST'][i],w*(.18+i*.3),h*.92,h*.05);},.0125);
  tog(ma,-.025,.0,'MASTER ARM',()=>ARM()===0,v=>{setArm(v?0:1);},{on:'ARM',off:'SAFE'});
  const lamp=box(.02,.012,.006,L(0x20262a),.03,.018,.0125,ma);out.anims.push(()=>lamp.material.emissive.setHex(ARM()===0?0xff6a10:0));
  lamp.material=L(0x44280c);
  // standby flight display: blue / brown ADI with speed and altitude strips
  const sb=new THREE.Group();sb.position.set(.065,-.215,0);pnl.add(sb);box(.1,.115,.022,black,0,0,.003,sb);
  const sc=mkCv(256,256),st=mkTex(sc),sm=new THREE.MeshBasicMaterial({map:st,toneMapped:false});out.faces.push(sm);add(new THREE.PlaneGeometry(.082,.082),sm,0,.006,.0145,sb);
  out.sbyDraw=()=>{const P=PL();const c=sc.getContext('2d');c.setTransform(1,0,0,1,0,0);c.fillStyle='#000';c.fillRect(0,0,256,256);if(!P)return;
    c.save();c.beginPath();c.rect(52,26,152,204);c.clip();c.translate(128,128);c.rotate(-(P.bank||0));const po=(P.pitch||0)/D*2.6;
    c.fillStyle='#2f78d8';c.fillRect(-200,-400+po,400,400);c.fillStyle='#7a4a24';c.fillRect(-200,po,400,400);c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(-200,po);c.lineTo(200,po);c.stroke();
    for(let a=-30;a<=30;a+=10){if(!a)continue;const y=po-a*2.6,w=a%20?16:30;c.beginPath();c.moveTo(-w,y);c.lineTo(w,y);c.stroke();}c.restore();
    c.strokeStyle='#ffd24a';c.lineWidth=3;c.beginPath();c.moveTo(88,128);c.lineTo(116,128);c.lineTo(128,138);c.lineTo(140,128);c.lineTo(168,128);c.stroke();
    c.fillStyle='#0a0a0a';c.fillRect(0,26,50,204);c.fillRect(206,26,50,204);c.font=`700 20px ${FONT}`;c.fillStyle='#fff';c.textAlign='center';
    c.fillText(String(Math.round((P.cas||0)*1.944)),26,128);c.fillText(String(Math.round(P.pos.y*3.281/10)*10),231,128);c.font=`700 12px ${FONT}`;c.fillStyle='#8fd';c.fillText('KT',26,50);c.fillText('FT',231,50);
    c.fillStyle='#fff';c.font=`700 16px ${FONT}`;c.fillText(String(Math.round((P.hdg%360+360)%360)).padStart(3,'0'),128,246);st.needsUpdate=true;};
  out.redraw.push(out.sbyDraw);
  // instrument control panel (blank in service) + maintenance connector port
  box(.2,.1,.02,L(0x30353a),0,-.355,.0,pnl);for(let i=0;i<9;i++)box(.034,.026,.006,black,-.065+(i%3)*.04,-.33-Math.floor(i/3)*.032,.012,pnl);
  add(new THREE.CylinderGeometry(.016,.016,.01,16),black,.0,-.41,.012,pnl,Math.PI/2);}

/* ---------------- side consoles ---------------- */
{const lc=new THREE.Group();lc.position.set(-.5,-.5,-.3);lc.rotation.set(-.15,.55,0);lc.scale.setScalar(.8);root.add(lc);box(.19,.38,.04,consM,0,0,-.02,lc);
  plate(lc,0,.02,.18,.36,300,(c,w,h)=>{c.fillStyle='#33383d';c.fillRect(0,0,w,h);c.fillStyle='#c9a516';c.fillRect(w*.08,h*.08,w*.36,h*.2);c.fillStyle='#111';for(let i=0;i<5;i++){c.beginPath();c.moveTo(w*(.08+i*.08),h*.08);c.lineTo(w*(.02+i*.08+.14),h*.28);c.lineTo(w*(.02+i*.08+.1),h*.28);c.lineTo(w*(.08+i*.08-.04),h*.08);c.fill();}
    txt(c,'JETTISON',w*.26,h*.04,h*.03);txt(c,'LDG GEAR',w*.7,h*.32,h*.03);txt(c,'PARKING',w*.26,h*.46,h*.026);txt(c,'BRAKE',w*.26,h*.49,h*.026);txt(c,'EMER LDG',w*.26,h*.7,h*.026);txt(c,'GEAR DEPLOY',w*.26,h*.73,h*.026);txt(c,'REMAINING',w*.2,h*.36,h*.022);},.0005);
  // jettison rotary under a hazard-striped guard
  dial(lc,-.045,.12,.015,'JETTISON (STATION SELECT)',()=>0,v=>{},1,{label:()=>'SAFE'});
  box(.065,.06,.006,yel,-.045,.12,.014,lc);
  // landing gear handle
  const gh=new THREE.Group();gh.position.set(.04,.06,.012);lc.add(gh);box(.022,.05,.016,black,0,0,0,gh);box(.026,.02,.02,redM,0,.026,.004,gh);
  const gb=box(.05,.07,.03,hitM,.04,.06,.02,lc);reg([gb,gh.children[0],gh.children[1]],{name:'LANDING GEAR HANDLE',state:()=>sys.v.gear?'DOWN':'UP',act:()=>{sys.v.gear=sys.v.gear?0:1;sfx.click();}});
  out.anims.push(dt=>{gh.position.y+=((sys.v.gear?.045:.075)-gh.position.y)*Math.min(1,dt*10);});
  tog(lc,-.04,-.045,'PARKING BRAKE',()=>S2.park,v=>{S2.park=v?1:0;},{on:'SET',off:'OFF'});
  box(.05,.05,.01,L(0xb01c14),-.045,-.115,.012,lc);
  // seat height and life support block below (visual)
  box(.14,.03,.01,black,0,-.16,.012,lc);}
{const rc=new THREE.Group();rc.position.set(.5,-.5,-.3);rc.rotation.set(-.15,-.55,0);rc.scale.setScalar(.8);root.add(rc);box(.19,.38,.04,consM,0,0,-.02,rc);
  plate(rc,0,.02,.18,.36,300,(c,w,h)=>{c.fillStyle='#33383d';c.fillRect(0,0,w,h);txt(c,'AUTO RECOVERY',w*.5,h*.04,h*.03);c.fillStyle='#c9a516';c.fillRect(w*.1,h*.07,w*.8,h*.18);c.fillStyle='#111';for(let i=0;i<9;i++){c.beginPath();c.moveTo(w*(.1+i*.09),h*.07);c.lineTo(w*(.1+i*.09+.06),h*.07);c.lineTo(w*(.1+i*.09-.04+.06),h*.25);c.lineTo(w*(.1+i*.09-.1+.06),h*.25);c.fill();}
    c.fillStyle='#d05010';c.fillRect(w*.08,h*.34,w*.84,h*.32);txt(c,'B/U BATT',w*.3,h*.37,h*.03,'#111');txt(c,'FTA',w*.7,h*.37,h*.03,'#111');txt(c,'CM DOORS',w*.7,h*.6,h*.03,'#111');},.0005);
  tog(rc,-.0,.115,'AUTO RECOVERY (GCAS / AUTO-GCAS)',()=>S2.aut,v=>{S2.aut=v?1:0;},{guard:1,on:'ARMED',off:'OFF'});
  tog(rc,-.04,-.0,'B/U BATT',()=>S2.bub,v=>{S2.bub=v?1:0;},{on:'ON',off:'OFF'});
  tog(rc,.045,-.0,'FLIGHT TEST AID',()=>S2.fta,v=>{S2.fta=v?1:0;},{on:'ON',off:'OFF'});
  tog(rc,.045,-.075,'CM DOORS',()=>S2.cmd,v=>{S2.cmd=v?1:0;},{on:'OPEN',off:'CLOSED'});}
/* ---------------- stick, throttle, ejection handle, seat, canopy ---------------- */
const stick=new THREE.Group();stick.position.set(.31,-.62,-.2);root.add(stick);
add(new THREE.CylinderGeometry(.03,.045,.06,14),black,0,0,0,stick);add(new THREE.CylinderGeometry(.012,.015,.17,10),L(0x1a1c1f),0,.1,0,stick);
{const gp=new THREE.Group();gp.position.set(0,.2,0);gp.rotation.x=-.18;gp.rotation.z=.12;stick.add(gp);box(.044,.115,.056,L(0x151618,30),0,.03,0,gp);
  add(new THREE.CylinderGeometry(.007,.007,.012,10),redM,-.012,.085,-.02,gp,Math.PI/2);add(new THREE.CylinderGeometry(.007,.007,.012,10),L(0x303236),.012,.085,-.02,gp,Math.PI/2);
  box(.012,.03,.012,L(0x2a2c30),0,.062,.03,gp);add(new THREE.SphereGeometry(.009,8,6),redM,-.004,.04,-.03,gp);}
const thr=new THREE.Group();thr.position.set(-.385,-.58,-.04);root.add(thr);box(.1,.012,.34,L(0x1a1c1f),0,-.04,-.05,root.children.length?thr:thr);
add(new THREE.CylinderGeometry(.013,.016,.24,10),L(0x1a1c1f),0,.02,.12,thr,Math.PI/2);
{const g=new THREE.Group();g.position.set(0,.03,.26);thr.add(g);box(.052,.1,.07,L(0x151618,30),0,.02,0,g);add(new THREE.SphereGeometry(.008,8,6),L(0x303236),.012,.07,.0,g);}
// ejection handle: yellow / black loop between the knees
{const t=mkCv(128,32),c=t.getContext('2d');c.fillStyle='#e0b616';c.fillRect(0,0,128,32);c.fillStyle='#161616';for(let i=-2;i<12;i++){c.beginPath();c.moveTo(i*12,0);c.lineTo(i*12+8,0);c.lineTo(i*12+20,32);c.lineTo(i*12+12,32);c.fill();}
  const tx=new THREE.CanvasTexture(t);tx.wrapS=THREE.RepeatWrapping;tx.repeat.set(3,1);const m=new THREE.MeshPhongMaterial({map:tx,shininess:30});
  const tor=add(new THREE.TorusGeometry(.065,.012,10,26,Math.PI*1.35),m,0,-.55,-.2,root,-.15,0,Math.PI*.82);tor.userData.eject=1;add(new THREE.CylinderGeometry(.03,.034,.03,14),black,0,-.64,-.2);}
// seat: black fabric cushion and back, harness, right armrest
box(.52,.08,.46,fabric,0,-.7,.17,root,-.03);box(.5,.62,.09,fabric,0,-.4,.5,root,-.12);box(.07,.5,.06,black,-.23,-.45,.43,root);box(.07,.5,.06,black,.23,-.45,.43,root);
box(.09,.05,.3,leather,.42,-.59,.15,root);box(.04,.22,.06,dgrey,.44,-.7,.12,root);
// harness box (push-button release) in front of the seat
add(new THREE.CylinderGeometry(.034,.034,.018,18),L(0x16181b),0,-.66,-.02,root,0,0,0);
// floor, tubs, canopy bow and rails
box(1.1,.04,1.6,dgrey,0,-.9,-.1,root);box(.12,.3,1.0,dgrey,-.47,-.72,.0,root);box(.12,.3,1.0,dgrey,.47,-.72,.0,root);
box(.5,.18,1.0,dgrey,.0,-.82,-.2,root);
// cockpit tub: low side walls up to the canopy sill (as in the side-view photo), flush with the rails, plus rear bulkhead
box(.06,.62,1.5,dgrey,-.6,-.6,-.05,root);box(.06,.62,1.5,dgrey,.6,-.6,-.05,root);box(1.2,.7,.06,dgrey,0,-.6,.78,root);
// canopy bow and windscreen arch (front frame above the display)
{const bow=add(new THREE.TorusGeometry(.56,.026,8,30,Math.PI),hood,0,-.1,-.8,root,0,0,0);bow.scale.set(1.15,1.1,1);}
box(.04,.5,.05,black,-.55,.18,-.7,root,0,0,.18);box(.04,.5,.05,black,.55,.18,-.7,root,0,0,-.18);
for(const sx of[-1,1]){box(.05,.04,1.4,black,sx*.58,.0,-.05,root);box(.04,.5,.04,L(0x090a0b),sx*.6,-.25,.35,root);}


/* ---------------- HMD visor field: the HUD clip polygon follows the head ---------------- */
out.glass0=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
const _f=new THREE.Vector3(),_r=new THREE.Vector3(),_u=new THREE.Vector3();
function visor(){const e=ckCam.matrixWorld.elements;_r.set(e[0],e[1],e[2]);_u.set(e[4],e[5],e[6]);_f.set(-e[8],-e[9],-e[10]);
  const hw=Math.tan(20*D),hh=Math.tan(15*D),g=out.glass0,p=ckCam.position;
  g[0].copy(p).add(_f).addScaledVector(_r,-hw).addScaledVector(_u,hh);g[1].copy(p).add(_f).addScaledVector(_r,hw).addScaledVector(_u,hh);
  g[2].copy(p).add(_f).addScaledVector(_r,hw).addScaledVector(_u,-hh);g[3].copy(p).add(_f).addScaledVector(_r,-hw).addScaledVector(_u,-hh);}

/* ---------------- PCD pages ---------------- */
const G='#47f58a',GD='rgba(71,245,138,.35)',CY='#4ad8ff',WH='#e9efe9',AM='#ffc23a',RD='#ff4a3a',BG='#010504';
const PAGES=['TSD','HSI','SMS','EW','EOTS','ENG','FUEL','GEAR'];
const WIN=[{x:14,w:488,page:0},{x:512,w:484,page:1},{x:1004,w:484,page:5},{x:1498,w:488,page:2}];
const WY=84,WH_=PH-84-74;
const TS={rng:2,rngs:[10,20,40,80,160]};
const nm=m=>m/1852,ft=m=>m*3.28084,kt=m=>m*1.94384;
const ptr=(c,x,y,a,r,col)=>{c.save();c.translate(x,y);c.rotate(a);c.strokeStyle=col;c.beginPath();c.moveTo(0,-r);c.lineTo(r*.6,r*.7);c.lineTo(0,r*.35);c.lineTo(-r*.6,r*.7);c.closePath();c.stroke();c.restore();};
function pgTSD(c,w,h,P){const cx=w/2,cy=h*.86,R=h*.78,rng=TS.rngs[TS.rng]*1852,k=R/rng;c.lineWidth=2;
  c.strokeStyle=GD;for(let i=1;i<=3;i++){c.beginPath();c.arc(cx,cy,R*i/3,Math.PI*1.12,Math.PI*1.88);c.stroke();}
  c.beginPath();c.moveTo(cx,cy);for(const a of[-60,0,60]){c.moveTo(cx,cy);c.lineTo(cx+Math.sin(a*D)*R,cy-Math.cos(a*D)*R);}c.stroke();
  txt(c,String(TS.rngs[TS.rng]),w*.88,26,24,G);txt(c,'RNG',w*.88,52,16,GD);
  txt(c,(radar.sensor==='IRST'?'IR ':'')+(radar.mode==='TWS'?'TWS':radar.mode==='STT'?'STT':'RWS'),w*.12,26,24,G);
  c.strokeStyle=G;c.fillStyle=G;ptr(c,cx,cy,0,16,WH);
  const tk=[...radar.tracks.entries()].filter(([j,t])=>j.alive&&t.p);const now=performance.now()/1000;
  for(const [j,t] of tk){const rel=t.p.clone().sub(P.pos).applyQuaternion(P.q.clone().invert());const az=Math.atan2(rel.x,-rel.z),d=Math.hypot(rel.x,rel.z);if(d>rng||Math.abs(az)>1.25)continue;
    const x=cx+Math.sin(az)*d*k,y=cy-Math.cos(az)*d*k,lk=radar.mode==='STT'&&j===radar.lock,bg=j===radar.bug,fr=j.side===P.side;
    c.strokeStyle=c.fillStyle=fr?CY:lk?RD:AM;c.lineWidth=lk?3.4:2.4;c.globalAlpha=Math.max(.35,1-(now-t.t)/9);
    c.beginPath();c.moveTo(x,y-11);c.lineTo(x+11,y);c.lineTo(x,y+11);c.lineTo(x-11,y);c.closePath();c.stroke();
    const hd=((t.hdg!=null?t.hdg:j.hdg)-P.hdg)*D;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(hd)*30,y-Math.cos(hd)*30);c.stroke();
    if(bg||lk){c.strokeRect(x-17,y-17,34,34);c.font=`700 18px ${FONT}`;c.textAlign='left';c.fillStyle=WH;c.fillText(String(Math.round(ft(t.p.y)/1000)),x+20,y-14);if(j._nctrId)c.fillText(j._nctrId,x+20,y+10);}
    c.globalAlpha=1;}
  try{for(const m of(DL.flight?DL.flight():[])){const rel=m.j.pos.clone().sub(P.pos).applyQuaternion(P.q.clone().invert());const az=Math.atan2(rel.x,-rel.z),d=Math.hypot(rel.x,rel.z);if(d>rng)continue;c.strokeStyle=CY;c.beginPath();c.arc(cx+Math.sin(az)*d*k,cy-Math.cos(az)*d*k,9,0,7);c.stroke();txt(c,m.n,cx+Math.sin(az)*d*k+22,cy-Math.cos(az)*d*k-8,16,CY);}}catch(e){}
  txt(c,'+',w*.9,h*.12,30,G);txt(c,'-',w*.9,h*.2,30,G);}
function pgHSI(c,w,h,P){const cx=w/2,cy=h*.42,R=Math.min(w*.34,h*.3);const hd=((P.hdg%360)+360)%360;
  c.save();c.beginPath();c.arc(cx,cy,R,0,7);c.clip();c.translate(cx,cy);c.rotate(-(P.bank||0));const po=(P.pitch||0)/D*(R/22);c.fillStyle='#0f3a78';c.fillRect(-R*2,-R*3+po,R*4,R*3);c.fillStyle='#5a3a1c';c.fillRect(-R*2,po,R*4,R*3);
  c.strokeStyle=WH;c.lineWidth=2;c.beginPath();c.moveTo(-R*2,po);c.lineTo(R*2,po);c.stroke();for(let a=-30;a<=30;a+=10){if(!a)continue;const y=po-a*(R/22),ww=a%20?R*.15:R*.3;c.beginPath();c.moveTo(-ww,y);c.lineTo(ww,y);c.stroke();txt(c,String(Math.abs(a)),ww+22,y,14,WH);}c.restore();
  c.strokeStyle=AM;c.lineWidth=4;c.beginPath();c.moveTo(cx-R*.5,cy);c.lineTo(cx-R*.12,cy);c.lineTo(cx,cy+R*.1);c.lineTo(cx+R*.12,cy);c.lineTo(cx+R*.5,cy);c.stroke();c.strokeStyle=WH;c.lineWidth=2;c.beginPath();c.arc(cx,cy,R,0,7);c.stroke();
  // speed / altitude tapes
  const cas=kt(P.cas||P.vel.length()),alt=ft(P.pos.y),tape=(x,val,step,fmt)=>{c.save();c.beginPath();c.rect(x-48,cy-R,96,2*R);c.clip();c.fillStyle='rgba(0,0,0,.5)';c.fillRect(x-48,cy-R,96,2*R);c.strokeStyle=G;c.fillStyle=G;c.lineWidth=2;c.font=`700 18px ${FONT}`;c.textAlign='center';
    for(let i=-6;i<=6;i++){const v=Math.round(val/step)*step+i*step,y=cy-(v-val)/step*(R/3.2);c.beginPath();c.moveTo(x-48,y);c.lineTo(x-38,y);c.stroke();if(i%2===0)c.fillText(fmt(v),x,y);}c.restore();c.strokeStyle=WH;c.strokeRect(x-48,cy-16,96,32);txt(c,fmt(val),x,cy,22,WH);};
  tape(cx-R-62,cas,10,v=>String(Math.max(0,Math.round(v))));tape(cx+R+62,alt,100,v=>String(Math.round(v)));
  txt(c,'M '+(P.mach||0).toFixed(2),cx-R-62,cy+R+22,22,G);txt(c,'G '+(P.nz||1).toFixed(1),cx-R-62,cy+R+48,22,G);txt(c,'AOA '+((P.alpha||0)/D).toFixed(1),cx-R-62,cy+R+74,20,G);
  txt(c,'VS '+Math.round(ft(P.vel.y)*60/100)*100,cx+R+62,cy+R+22,22,G);txt(c,'RALT '+Math.round(ft(P.pos.y-groundAt(P.pos.x,P.pos.z))),cx+R+62,cy+R+48,20,G);
  // heading tape
  const hy=h*.78;c.strokeStyle=G;c.lineWidth=2;c.beginPath();c.moveTo(20,hy);c.lineTo(w-20,hy);c.stroke();c.font=`700 20px ${FONT}`;c.fillStyle=G;c.textAlign='center';
  for(let a=-40;a<=40;a+=5){const v=Math.round(hd/5)*5+a,x=cx+(v-hd)*(w/90),r=((v%360)+360)%360;c.beginPath();c.moveTo(x,hy);c.lineTo(x,hy+(r%10?10:18));c.stroke();if(r%10===0)c.fillText(String(r/10).padStart(2,'0'),x,hy+40);}
  c.strokeStyle=AM;c.beginPath();c.moveTo(cx,hy-4);c.lineTo(cx-9,hy-20);c.lineTo(cx+9,hy-20);c.closePath();c.stroke();txt(c,String(Math.round(hd)).padStart(3,'0'),cx,hy-40,26,WH);
  txt(c,sys.v.gear?'GEAR DOWN':'',cx,h*.95,20,G);}
function stationList(P){const o=[];const keys=Object.keys(P.ac.st||{});for(const k of keys){const w=P.load&&P.load[k];if(w)o.push([k,w]);}return o;}
function pgSMS(c,w,h,P){const cx=w/2;txt(c,['MASTER ARM ARM','MASTER ARM SAFE','MASTER ARM SIM'][ARM()],cx,26,24,ARM()===0?AM:G);
  const w0=game.wsel;txt(c,w0==='GUN'?'GUN '+P.gun.ammo:(SN[w0]||w0)+' '+P.count(w0),cx,60,24,WH);
  const sl=stationList(P);c.strokeStyle=GD;c.lineWidth=2;c.beginPath();c.moveTo(cx,120);c.lineTo(cx,330);c.moveTo(cx-120,230);c.lineTo(cx+120,230);c.moveTo(cx-34,330);c.lineTo(cx-60,340);c.lineTo(cx+60,340);c.lineTo(cx+34,330);c.stroke();
  const xs={1:-190,2:-150,3:-110,4:-52,5:0,6:52,7:110,8:150,9:190},rows=[];
  for(const [k,wn] of sl){const key=String(k).replace(/[bc]$/,'');const x=cx+(xs[key]!==undefined?xs[key]:0),sel=wn===w0;rows.push([key,wn]);
    const ws=P.load&&wn;const y=150+(key==='5'?170:0)+(String(k).endsWith('b')?44:String(k).endsWith('c')?88:0);
    c.strokeStyle=sel?AM:G;c.lineWidth=sel?3:2;c.strokeRect(x-22,y,44,34);txt(c,(SN[wn]||String(wn)).slice(0,5),x,y+17,13,sel?AM:WH);txt(c,String(key),x,y-12,13,GD);}
  // weapons inventory list
  const inv={};for(const [,wn] of sl)inv[wn]=(inv[wn]||0)+1;let y=420;for(const [wn,n] of Object.entries(inv)){const sel=wn===w0;txt(c,(sel?'> ':'  ')+(SN[wn]||wn)+'  '+P.count(wn),38,y,22,sel?AM:G,'left');y+=32;if(y>h-30)break;}
  txt(c,'GUN '+P.gun.ammo,w*.78,420,22,G,'left');txt(c,'CMD '+((P.cm&&P.cm.chaff)||'')+'',w*.78,452,18,GD,'left');}
function pgEW(c,w,h,P){const cx=w/2,cy=h*.5,R=Math.min(w,h)*.38;c.strokeStyle=GD;c.lineWidth=2;for(const r of[.35,.7,1]){c.beginPath();c.arc(cx,cy,R*r,0,7);c.stroke();}c.beginPath();c.moveTo(cx,cy-R);c.lineTo(cx,cy+R);c.moveTo(cx-R,cy);c.lineTo(cx+R,cy);c.stroke();
  txt(c,'EW',w*.12,26,24,G);ptr(c,cx,cy,0,16,WH);const hd=P.hdg*D;
  for(const t of RW.list.slice(0,16)){const a=(t.a||0),rr=R*Math.max(.3,Math.min(1,t.dEst?t.dEst/60000:.7));const x=cx+Math.sin(a)*rr,y=cy-Math.cos(a)*rr,col=t.mode==='L'?RD:t.lk?AM:G;c.strokeStyle=col;c.lineWidth=2.4;c.strokeRect(x-17,y-17,34,34);txt(c,t.sym||'?',x,y,24,col);if(t.mode==='L')txt(c,'LAUNCH',x,y-30,14,RD);}
  for(const m of RW.msl){const a=m.az!=null?m.az:(m.a||0);const x=cx+Math.sin(a)*R*.55,y=cy-Math.cos(a)*R*.55;c.strokeStyle=RD;c.lineWidth=3;c.beginPath();c.moveTo(x,y-20);c.lineTo(x+16,y+14);c.lineTo(x-16,y+14);c.closePath();c.stroke();txt(c,'M',x,y+2,18,RD);}
  try{if(window.MSS&&MSS.warned.length)txt(c,'MAWS '+MSS.warned.length,w*.5,h-30,24,RD);const st=MSS&&MSS.dir&&MSS.dir.state;if(st&&st!=='OFF')txt(c,'DIRCM '+st,w*.5,h-60,20,AM);}catch(e){}
  txt(c,'CMD',w*.14,h-40,18,GD);}
const _eo=mkCv(360,360);
function pgEOTS(c,w,h,P){let ok=false;try{if(SNS.hasPod(P)){SNS.drawPage(_eo.getContext('2d'),360,'TGP',30);ok=true;}}catch(e){}
  if(!ok){txt(c,'EOTS',w/2,h/2-14,30,G);txt(c,'NOT AVAILABLE',w/2,h/2+24,20,GD);return;}
  const s=Math.min(w-20,h-20);c.drawImage(_eo,(w-s)/2,(h-s)/2,s,s);}
function pgENG(c,w,h,P){const e=P.eng&&!P.eng.done?P.eng.e[0]:null,n=e?e.rpm:(P.n||0)*100,egt=e?e.egt*700:400+300*(P.n||0);
  const dial=(x,y,r,v,mx,lab,u)=>{c.strokeStyle=GD;c.lineWidth=6;c.beginPath();c.arc(x,y,r,Math.PI*.75,Math.PI*2.25);c.stroke();c.strokeStyle=G;c.beginPath();c.arc(x,y,r,Math.PI*.75,Math.PI*.75+Math.PI*1.5*Math.min(1,v/mx));c.stroke();txt(c,String(Math.round(v)),x,y,30,WH);txt(c,lab,x,y-r-18,20,G);txt(c,u,x,y+r*.55,16,GD);};
  dial(w*.3,h*.2,w*.17,n,110,'N2','%');dial(w*.72,h*.2,w*.17,egt,1000,'EGT','C');dial(w*.3,h*.52,w*.17,(P.thr||0)*100,100,'THRUST','%');dial(w*.72,h*.52,w*.17,P.ab?P.ab*100:0,100,'A/B','%');
  txt(c,'FF '+Math.round((P.ff||0)*3600)+' KG/H',w*.5,h*.82,22,G);txt(c,P.hp<35?'ENG DAMAGE':'',w*.5,h*.9,22,RD);}
function pgFUEL(c,w,h,P){const tot=P.totalFuel||0,cap=(P.ac.fuel||8000)+((P.tankFuel&&P.tankFuel>0)?P.tankFuel:0)+1,pct=Math.max(0,Math.min(1,tot/cap));
  txt(c,'FUEL',w*.5,26,26,G);txt(c,Math.round(tot*2.2046)+' LB',w*.5,70,34,WH);txt(c,Math.round(pct*100)+'%',w*.5,108,24,G);
  c.strokeStyle=G;c.lineWidth=3;c.strokeRect(w*.2,150,w*.6,330);c.fillStyle='rgba(71,245,138,.55)';c.fillRect(w*.2,150+330*(1-pct),w*.6,330*pct);
  const bj=(P.ff||0)>0?(tot/Math.max(.01,P.ff))/60:0;txt(c,'ENDURANCE '+(bj>0&&isFinite(bj)?Math.round(bj)+' MIN':'--'),w*.5,520,22,WH);txt(c,'FF '+Math.round((P.ff||0)*3600*2.2046)+' LB/H',w*.5,556,20,G);
  if(pct<.15)txt(c,'FUEL LOW',w*.5,600,28,RD);}
function pgGEAR(c,w,h,P){const gp=P.gearPos||0,dn=sys.v.gear;txt(c,'LANDING GEAR',w*.5,26,26,G);
  const g=(x,y,l)=>{const col=gp>.95?G:gp<.05?GD:AM;c.strokeStyle=col;c.lineWidth=4;c.strokeRect(x-34,y-34,68,68);txt(c,gp>.95?'DN':gp<.05?'UP':'TR',x,y,26,col);txt(c,l,x,y+54,18,GD);};
  g(w*.5,150,'NOSE');g(w*.3,290,'L MAIN');g(w*.7,290,'R MAIN');txt(c,'HANDLE '+(dn?'DOWN':'UP'),w*.5,420,24,WH);
  txt(c,'PARK BRK '+(S2.park?'SET':'OFF'),w*.5,460,22,G);txt(c,'WEIGHT ON WHEELS '+(P.onGnd?'YES':'NO'),w*.5,496,22,P.onGnd?AM:G);
  txt(c,'WEAPONS BAY DOORS '+(ARM()===0&&P.count&&String(game.wsel).startsWith('AIM')?'OPEN':'CLOSED'),w*.5,540,20,GD);}
// TSD / SMS / EW show the game's own FCR, SMS and RWR renderers (same canvases the other cockpits use), fitted to the window; own drawers stay as fallback
const live=(cv,fb)=>(c,w,h,P)=>{try{if(cv()&&cv().width){const k=Math.min(w/cv().width,(h-8)/cv().height),dw=cv().width*k,dh=cv().height*k;c.drawImage(cv(),(w-dw)/2,4,dw,dh);return;}}catch(e){}fb(c,w,h,P);};
const DRAW={TSD:live(()=>fcrC,pgTSD),HSI:pgHSI,SMS:live(()=>smsC,pgSMS),EW:live(()=>rwrC,pgEW),EOTS:pgEOTS,ENG:pgENG,FUEL:pgFUEL,GEAR:pgGEAR};
// ICAWS messages
function icaws(P){const m=[];if(!P)return m;if(P.hp<35)m.push(['DAMAGE',RD]);if(P.totalFuel<(P.ac.fuel||8000)*.15)m.push(['FUEL LOW',AM]);if(window.MSS&&MSS.warned.length)m.push(['MISSILE',RD]);if(RW.list.some(t=>t.mode==='L'))m.push(['LAUNCH',RD]);
  if(!sys.v.gear&&P.cas<95&&ft(P.pos.y-groundAt(P.pos.x,P.pos.z))<1500)m.push(['GEAR',AM]);if(P.gAllow&&P.nz>P.gAllow*.95)m.push(['OVERG',AM]);return m;}
function drawPCD(){const P=PL(),c=pcv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.fillStyle=BG;c.fillRect(0,0,PW,PH);if(!P||!P.alive)return;
  const k=S2.night?.55:1;c.globalAlpha=1;
  // top strip
  c.fillStyle='#04100a';c.fillRect(0,0,PW,74);const ms=icaws(P);txt(c,'ICAWS',70,24,22,G,'left');ms.slice(0,2).forEach(([t,col],i)=>txt(c,t,70+i*170,52,22,col,'left'));
  txt(c,'AP',PW*.5-70,24,24,sys.mig&&sys.mig.ap&&(sys.mig.ap.alt||sys.mig.ap.att)?G:GD);txt(c,'AT',PW*.5-70,54,24,GD);
  c.strokeStyle=G;c.lineWidth=2;c.strokeRect(PW*.5-30,10,60,52);txt(c,String(Math.round((P.hdg%360+360)%360)).padStart(3,'0'),PW*.5,36,22,WH);
  const tabs=['COM','NAV','IFF','MENU'];tabs.forEach((t,i)=>{const x=PW-130-(3-i)*140;c.strokeStyle=GD;c.strokeRect(x-52,16,104,42);txt(c,t,x,38,22,G);});
  WIN.forEach((W,i)=>{c.save();c.translate(W.x,WY);c.beginPath();c.rect(0,0,W.w,WH_);c.clip();c.strokeStyle='rgba(71,245,138,.5)';c.lineWidth=2;c.strokeRect(1,1,W.w-2,WH_-2);
    try{DRAW[PAGES[W.page]](c,W.w,WH_,P);}catch(e){if(!W.err){W.err=1;console.warn('[f35pit] page',PAGES[W.page],e);}txt(c,PAGES[W.page]+' ERR',W.w/2,WH_/2,24,RD);}c.restore();
    // tab bar: previous | current | next
    const ty=PH-66,tw=W.w/3;for(let j=0;j<3;j++){const pi=(W.page+j-1+PAGES.length)%PAGES.length,cur=j===1;c.strokeStyle=cur?G:GD;c.lineWidth=cur?3:1.5;c.beginPath();c.moveTo(W.x+j*tw+10,ty+54);c.lineTo(W.x+j*tw+22,ty+6);c.lineTo(W.x+(j+1)*tw-22,ty+6);c.lineTo(W.x+(j+1)*tw-10,ty+54);c.closePath();c.stroke();
      txt(c,PAGES[pi],W.x+j*tw+tw/2,ty+31,cur?24:20,cur?WH:G);}});
  if(k<1){c.globalAlpha=1-k;c.fillStyle='#000';c.fillRect(0,0,PW,PH);c.globalAlpha=1;}}
out.redraw.push(()=>{drawPCD();ptex.needsUpdate=true;});
// touch: click a tab to change that window's page; click the +/- of the TSD to change range; MENU cycles all windows
window.F35PIT={S2,WIN,PAGES,TS,click(x,y){const px=x/360*PW,py=y/360*PH;   // the generic screen hit gives 0..360 coordinates
  if(py>=PH-66){for(const W of WIN)if(px>=W.x&&px<W.x+W.w){const j=Math.floor((px-W.x)/(W.w/3));W.page=(W.page+(j-1)+PAGES.length)%PAGES.length;sfx.click();return true;}}
  for(const W of WIN)if(py>WY&&py<WY+WH_&&px>=W.x&&px<W.x+W.w&&(PAGES[W.page]==='TSD'||PAGES[W.page]==='SMS')){const cv=PAGES[W.page]==='TSD'?fcrC:smsC,k=Math.min(W.w/cv.width,(WH_-8)/cv.height),dw=cv.width*k,dh=cv.height*k,lx=(px-W.x-(W.w-dw)/2)/k,ly=(py-WY-4)/k;
    if(lx>=0&&ly>=0&&lx<cv.width&&ly<cv.height){mfdClick(PAGES[W.page]==='TSD'?'fcr':'sms',lx,ly);return true;}}
  for(const W of WIN)if(py>WY&&py<WY+WH_&&px>=W.x&&px<W.x+W.w&&PAGES[W.page]==='TSD'){const lx=(px-W.x)/W.w,ly=(py-WY)/WH_;if(lx>.8&&ly>.08&&ly<.14)TS.rng=Math.min(TS.rngs.length-1,TS.rng+1);else if(lx>.8&&ly>.16&&ly<.24)TS.rng=Math.max(0,TS.rng-1);else if(lx<.3&&ly<.09){radar.setTWS(radar.mode!=='TWS');}else continue;sfx.click();return true;}
  if(py<74&&px>PW-130){WIN.forEach(W=>W.page=(W.page+1)%PAGES.length);sfx.click();return true;}return false;}};
// hit-test uses the plane's own UV (0..1 -> 0..360 in the generic handler), so remap through the game's mfdClick hook
{const _m=mfdClick;mfdClick=function(id,x,y){if(id==='f35pcd'){F35PIT.click(x,y);return;}return _m(id,x,y);};}
{const _t=screenTip;screenTip=function(id,x,y){if(id==='f35pcd')return'PCD · tap a tab to change page · TSD: + / - range, top-left toggles TWS · top-right menu cycles pages';return _t(id,x,y);};}

/* ---------------- required members for the cockpit system ---------------- */
out.stk=stick;out.thr=thr;out.sg=.14;out.panelMats=[panelM,consM,grey];out.panel0=[panelM.color.getHex(),consM.color.getHex(),grey.color.getHex()];
out.vars={f35:{stk:stick,thr:thr,sg:.14,on:[],off:[]}};out.glass=out.glass0;
let gt=0,pt=0;
out.tick=(P,dt)=>{visor();gt+=dt;pt+=dt;if(gt>=.1){gt=0;try{out.sbyDraw();}catch(e){}}
  if(pt>=.14){pt=0;try{drawPCD();ptex.needsUpdate=true;}catch(e){if(!out.err){out.err=1;console.warn('[f35pit] pcd',e);}}}};
out.redrawAll=()=>{for(const f of out.redraw)try{f();}catch(e){}};
root.traverse(o=>{if(!o.isMesh)return;const m=o.material,tr=m.transparent||m.opacity<1;o.castShadow=!tr&&!m.isMeshBasicMaterial;o.receiveShadow=!m.isMeshBasicMaterial;});
ck.f35=out;
// the F-35A uses this pit and has no HUD glass
{const A=AC['F-35A'];A.cockpit='f35';A.pit='f35';A.hmdHud=true;A.cwPit='F-35A cockpit built from reference photographs: panoramic display, helmet-mounted HUD.';A.eye=A.eye;}
out.redrawAll();
console.info('[f35pit] cockpit built');
})();
