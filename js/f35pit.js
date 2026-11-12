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
const S2={rcsLow:0,hmdBrt:.7,vidBrt:.8,vidCon:.5,night:0,aut:0,bub:1,fta:0,cmd:1,park:1};
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
const G='#47f58a',GD='rgba(71,245,138,.35)',CY='#4ad8ff',MN='#27d6dc',WH='#e9efe9',AM='#ffc23a',RD='#ff4a3a',MG='#c45cff',BG='#010504';
const PAGES=['EFI','TSD','VSD','RCS','FCR','SAR','SMS','FCS','ENG','FUEL','DAS','EOTS','GEAR','EW','MENU'];
const PI={};PAGES.forEach((n,i)=>PI[n]=i);
const WIN=[{x:14,w:488,page:PI.EFI},{x:512,w:484,page:PI.SMS},{x:1004,w:484,page:PI.ENG},{x:1498,w:488,page:PI.TSD}];
const WY=84,WH_=PH-84-74;
const TS={rng:3,rngs:[10,20,40,80,160]};
const nm=m=>m/1852,ft=m=>m*3.28084,kt=m=>m*1.94384,lb=k=>k*2.20462;
const NS=(c,s,x,y,sz,col=G,al='left')=>txt(c,s,x,y,sz,col,al);
const body=(P,v)=>v.clone().sub(P.pos).applyQuaternion(P.q.clone().invert());         // world point -> own-ship body frame (x right, y up, -z nose)
// page header the way the real software does it: page name + mode on the left, CNTL> on the right
const hdr=(c,w,a,b,cn)=>{NS(c,a,10,20,20,G);NS(c,b,10,44,18,GD);if(cn)NS(c,'CNTL>',w-10,20,20,G,'right');};
// top-view F-35 outline (nose up); s = half-span in pixels
const jet=(c,x,y,s,col,fill)=>{const p=[[0,-1.1],[.06,-.8],[.1,-.45],[.62,.12],[.62,.28],[.16,.3],[.22,.66],[.22,.78],[.07,.72],[0,.84]];c.beginPath();p.forEach(([a,b],i)=>c[i?'lineTo':'moveTo'](x+a*s,y+b*s));for(let i=p.length-2;i>0;i--)c.lineTo(x-p[i][0]*s,y+p[i][1]*s);c.closePath();if(fill){c.fillStyle=fill;c.fill();}c.strokeStyle=col;c.lineWidth=2;c.stroke();};
const dialG=(c,x,y,r,v,mx,lab,col=G,fmt)=>{c.lineWidth=4;c.strokeStyle=col;c.beginPath();c.arc(x,y,r,0,7);c.stroke();const a=Math.PI*.75+Math.PI*1.5*Math.max(0,Math.min(1,v/mx));c.strokeStyle='#ff4a3a';c.beginPath();c.moveTo(x+Math.cos(Math.PI*.75)*r*.78,y+Math.sin(Math.PI*.75)*r*.78);c.lineTo(x+Math.cos(Math.PI*.75)*r,y+Math.sin(Math.PI*.75)*r);c.stroke();
  c.strokeStyle=col;c.lineWidth=4;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*r*.82,y+Math.sin(a)*r*.82);c.stroke();NS(c,fmt?fmt(v):String(Math.round(v)),x,y-r-16,22,col,'center');NS(c,lab,x,y+r+24,20,col,'center');};
const stationList=P=>{const o=[];for(const k of Object.keys(P.ac.st||{})){const w=P.load&&P.load[k];if(w)o.push([k,w]);}return o;};
const cls=w=>/AIM-9|R-73|R-60|R-3S|R-13/.test(w)?'SRM':/AIM-120|AIM-7|AIM-54|R-27|R-77|R-24|R-40/.test(w)?'MRM':'BOMB';
const extStores=P=>stationList(P).filter(([k,w])=>!isTank(w)&&!/^[4-6]b?$/.test(String(k))).length+stationList(P).filter(([,w])=>isTank(w)).length;
/* ---- RCS: how an observer sees your radar signature, by aspect (nose up, 0 = nose-on). Stealth shaping: low nose / tail cone, spikes where wing and
   tail leading edges are normal to the beam, big return abeam and above / below; external stores (pylons, tanks) raise everything. */
function rcsAt(P,az,el){const a=Math.abs(((az+540)%360)-180)||0,d=Math.min(a,360-a),g=(x,m,s)=>Math.exp(-Math.pow((x-m)/s,2)),ex=1+.55*extStores(P);
  let r=.06+.08*g(d,0,28)+.8*g(d,90,15)+.42*g(d,62,6)+.42*g(d,118,6)+.3*g(d,180,26);r+=.3*Math.abs(Math.sin(el*D))*(.5+.5*g(d,90,60));return Math.min(1.6,r*ex*Math.sqrt((P.ac.rcs||.02)/.02));}
const rcsM2=r=>Math.max(.0008,r*r*.0045*(r>.8?1.6:1));
const rcsCol=r=>r<.2?'rgba(60,220,110,.85)':r<.45?'rgba(235,215,70,.85)':'rgba(255,80,60,.85)';
function pgRCS(c,w,h,P){hdr(c,w,'RCS',S2.rcsLow?'LOWER':'UPPER',1);const cx=w/2,cy=h*.47,R=Math.min(w*.44,h*.4);
  for(let y=-R;y<R;y+=7)for(let x=-R;x<R;x+=7){const r=Math.hypot(x+3.5,y+3.5);if(r>R)continue;const az=Math.atan2(x+3.5,-(y+3.5))/D,el=Math.acos(Math.min(1,r/R))/D*(S2.rcsLow?-1:1);c.fillStyle=rcsCol(rcsAt(P,az,el));c.fillRect(cx+x,cy+y,7,7);}
  c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=2;for(const f of[.33,.66,1]){c.beginPath();c.arc(cx,cy,R*f,0,7);c.stroke();}for(let a=0;a<180;a+=30){c.beginPath();c.moveTo(cx+Math.sin(a*D)*R,cy-Math.cos(a*D)*R);c.lineTo(cx-Math.sin(a*D)*R,cy+Math.cos(a*D)*R);c.stroke();}
  c.strokeStyle=G;c.lineWidth=3;c.beginPath();c.arc(cx,cy,R,0,7);c.stroke();jet(c,cx,cy,R*.2,WH,'rgba(0,0,0,.5)');
  // observers: every radar track and every RWR emitter, placed where they see you
  const mk=(az,el,txt2,col)=>{const r=R*Math.cos(Math.min(1.45,Math.abs(el)*D)),x=cx+Math.sin(az*D)*r,y=cy-Math.cos(az*D)*r;if((el<0)!==!!S2.rcsLow)c.globalAlpha=.45;c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.arc(x,y,13,0,7);c.stroke();c.fillStyle=col;c.fillRect(x-3,y-3,6,6);NS(c,txt2,x+18,y-6,18,WH);c.globalAlpha=1;};
  let n=0;for(const [j,t] of radar.tracks.entries()){if(!j.alive||!t.p||j.side===P.side||n>5)continue;const b=body(P,j.pos),az=Math.atan2(b.x,-b.z)/D,el=Math.atan2(b.y,Math.hypot(b.x,b.z))/D;
    const rr=rcsAt(P,az+180,0);mk(az,el,(rcsM2(rcsAt(P,az,el))).toFixed(3)+' M2',AM);n++;}
  for(const t of RW.list.slice(0,6))mk((t.a||0)/D,0,'RWR',RD);
  const here=rcsAt(P,0,0);NS(c,'NOSE '+rcsM2(here).toFixed(3)+' M2',w*.5,h*.9,22,WH,'center');NS(c,'STORES '+extStores(P)+(extStores(P)?' · SIGNATURE UP':' · CLEAN'),w*.5,h*.95,18,extStores(P)?AM:G,'center');
  const lg=[['LOW','rgba(60,220,110,.85)'],['MED','rgba(235,215,70,.85)'],['HIGH','rgba(255,80,60,.85)']];lg.forEach(([t,col],i)=>{c.fillStyle=col;c.fillRect(14,h*.2+i*40,22,22);NS(c,t,44,h*.2+i*40+11,18,G);});}
/* ---- TSD (HSD view): own-ship at the bottom of a half-scope, range rings, radar tracks, datalink flight */
function pgTSD(c,w,h,P){hdr(c,w,'TSD1','NAV',1);NS(c,'VIEW',10,74,20,G);NS(c,'HSD',10,98,20,G);NS(c,'F-ALL',10,128,18,GD);
  const cx=w/2,cy=h*.84,R=h*.74,rng=TS.rngs[TS.rng]*1852,k=R/rng;
  c.lineWidth=2;c.strokeStyle=G;c.fillStyle=G;c.beginPath();c.arc(cx,cy,R*1.0,Math.PI*1.05,Math.PI*1.95);c.stroke();
  for(let i=1;i<=3;i++){c.strokeStyle='rgba(71,245,138,.6)';c.beginPath();c.arc(cx,cy,R*i/3.0*.999,Math.PI*1.1,Math.PI*1.9);c.stroke();NS(c,String(Math.round(TS.rngs[TS.rng]*i/3)),cx+Math.sin(.5)*R*i/3+22,cy-Math.cos(.5)*R*i/3-6,20,G,'center');}
  const hd=(P.hdg%360+360)%360;for(let a=-60;a<=60;a+=5){const v=Math.round(hd/5)*5+a,t=(v-hd)*D,r0=R*1.0,r1=r0+(v%10?6:14);c.strokeStyle=G;c.beginPath();c.moveTo(cx+Math.sin(t)*r0,cy-Math.cos(t)*r0);c.lineTo(cx+Math.sin(t)*r1,cy-Math.cos(t)*r1);c.stroke();if(v%30===0)NS(c,String(((v%360)+360)%360/10).padStart(2,'0'),cx+Math.sin(t)*(r1+16),cy-Math.cos(t)*(r1+16),16,G,'center');}
  c.strokeStyle='rgba(71,245,138,.8)';c.beginPath();c.moveTo(cx,cy);c.lineTo(cx,cy-R);c.stroke();                                // ownship track line
  jet(c,cx,cy,16,WH);
  // radar FOV wedge
  const sc=(radar.cur&&radar.cur.az)||0,W=(radar.azs?radar.azs[radar.ai]:60)*D;c.strokeStyle='rgba(71,245,138,.45)';c.setLineDash([10,8]);c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.sin(sc-W)*R,cy-Math.cos(sc-W)*R);c.moveTo(cx,cy);c.lineTo(cx+Math.sin(sc+W)*R,cy-Math.cos(sc+W)*R);c.stroke();c.setLineDash([]);
  const now=performance.now()/1000,place=(p)=>{const b=body(P,p),az=Math.atan2(b.x,-b.z),d=Math.hypot(b.x,b.z);return d>rng?null:[cx+Math.sin(az)*d*k,cy-Math.cos(az)*d*k,az];};
  for(const [j,t] of radar.tracks.entries()){if(!j.alive||!t.p)continue;const q=place(t.p);if(!q)continue;const [x,y]=q,fr=j.side===P.side,lk=radar.mode==='STT'&&j===radar.lock,bg=j===radar.bug;c.globalAlpha=Math.max(.35,1-(now-t.t)/9);
    c.lineWidth=3;if(fr){c.strokeStyle=CY;c.beginPath();c.arc(x,y,11,0,7);c.stroke();}else{c.strokeStyle=lk?WH:RD;c.beginPath();c.moveTo(x,y-14);c.lineTo(x+13,y+10);c.lineTo(x-13,y+10);c.closePath();c.stroke();c.fillStyle=lk?WH:RD;c.beginPath();c.arc(x,y+1,3,0,7);c.fill();}
    const h2=(((t.hdg!=null?t.hdg:j.hdg)||0)-P.hdg)*D;c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(h2)*30,y-Math.cos(h2)*30);c.stroke();if(bg||lk){c.strokeStyle=WH;c.strokeRect(x-18,y-18,36,36);NS(c,String(Math.round(ft(t.p.y)/1000)),x+22,y-14,18,WH);}c.globalAlpha=1;}
  try{for(const m of(DL.flight?DL.flight():[])){const q=place(m.j.pos);if(!q)continue;c.strokeStyle=CY;c.lineWidth=3;c.beginPath();c.arc(q[0],q[1],11,0,7);c.stroke();NS(c,m.n,q[0]+16,q[1]-14,16,CY);}}catch(e){}
  // range arrows + EMC + OSB column
  c.fillStyle=G;c.beginPath();c.moveTo(24,196);c.lineTo(46,232);c.lineTo(2,232);c.fill();NS(c,String(TS.rngs[TS.rng]),30,262,22,G,'center');c.beginPath();c.moveTo(24,310);c.lineTo(46,276);c.lineTo(2,276);c.closePath();c.save();c.translate(0,30);c.beginPath();c.moveTo(2,276);c.lineTo(46,276);c.lineTo(24,310);c.fill();c.restore();
  NS(c,'EMC',10,h*.56,18,G);NS(c,'EMC4',10,h*.56+22,18,G);NS(c,'BLOB',10,h*.72,18,G);
  {const bj=radar.bug||radar.lock,t=bj&&radar.tracks.get(bj);if(bj&&t&&t.p){const b=body(P,t.p),az=Math.round(Math.atan2(b.x,-b.z)/D),d=Math.hypot(b.x,b.z);c.strokeStyle=G;c.lineWidth=2;c.strokeRect(w-176,h-98,166,84);NS(c,'A-A NTS',w-168,h-84,16,G);NS(c,'BRG '+String(((az+Math.round(P.hdg))%360+360)%360).padStart(3,'0')+'/'+nm(d).toFixed(1),w-168,h-62,15,WH);NS(c,'ALT '+Math.round(ft(t.p.y)),w-168,h-42,15,WH);NS(c,'HDG '+String(Math.round(((t.hdg!=null?t.hdg:bj.hdg)||0)%360)).padStart(3,'0'),w-168,h-22,15,WH);}}
  ['NORM','DEP','MK','ASGN>','DCLT>'].forEach((t,i)=>NS(c,t,w-8,h*.18+i*h*.12,18,G,'right'));NS(c,(radar.sensor==='IRST'?'IR ':'')+radar.mode,w*.5,20,20,G,'center');}
/* ---- VSD: side view, range ahead vs altitude */
function pgVSD(c,w,h,P){hdr(c,w,'TSD1','NAV',1);NS(c,'VIEW',10,74,20,G);NS(c,'VSD',10,98,20,G);const L=70,B=h*.88,T=h*.22,rng=TS.rngs[TS.rng]*1852,mx=Math.max(20000,Math.ceil(ft(P.pos.y)/10000+1)*10000),ay=a=>B-(B-T)*Math.min(1,a/mx);
  c.strokeStyle=GD;c.lineWidth=1.5;for(let a=0;a<=mx;a+=10000){c.beginPath();c.moveTo(L,ay(a));c.lineTo(w-10,ay(a));c.stroke();NS(c,String(a/1000),L-8,ay(a),18,G,'right');}for(let i=1;i<=4;i++){const x=L+(w-L-10)*i/4;c.beginPath();c.moveTo(x,T);c.lineTo(x,B);c.stroke();NS(c,String(Math.round(TS.rngs[TS.rng]*i/4)),x,B+18,16,G,'center');}
  const g=ft(groundAt(P.pos.x,P.pos.z));c.strokeStyle=AM;c.lineWidth=3;c.beginPath();c.moveTo(L,ay(g));c.lineTo(w-10,ay(g));c.stroke();NS(c,'GND',w-14,ay(g)-12,16,AM,'right');
  const X=d=>L+(w-L-10)*d/rng;jet(c,L+10,ay(ft(P.pos.y)),12,WH);c.strokeStyle='rgba(71,245,138,.6)';c.setLineDash([8,6]);c.beginPath();c.moveTo(L+22,ay(ft(P.pos.y)));c.lineTo(w-10,ay(ft(P.pos.y)));c.stroke();c.setLineDash([]);
  for(const [j,t] of radar.tracks.entries()){if(!j.alive||!t.p)continue;const b=body(P,t.p),d=-b.z;if(d<0||d>rng||Math.abs(b.x)>d*1.2)continue;const x=X(d),y=ay(ft(t.p.y)),fr=j.side===P.side;c.strokeStyle=fr?CY:RD;c.lineWidth=3;if(fr){c.beginPath();c.arc(x,y,10,0,7);c.stroke();}else{c.beginPath();c.moveTo(x,y-13);c.lineTo(x+12,y+9);c.lineTo(x-12,y+9);c.closePath();c.stroke();}NS(c,String(Math.round(ft(t.p.y)/1000)),x+16,y-12,16,WH);}
  NS(c,'ALT '+Math.round(ft(P.pos.y)),w-10,h*.06,20,G,'right');}
// FCS: control-system page, aircraft outline, surfaces, g and AOA
function pgFCS(c,w,h,P){hdr(c,w,'FCS','NAV',0);const cx=w/2,cy=h*.46,s=Math.min(w*.4,h*.32);jet(c,cx,cy,s,G);
  const dfl=(P.in&&P.in.p||0),rl=(P.in&&P.in.r||0),bar=(x,y,v)=>{c.fillStyle=G;c.fillRect(x-9,y-14,18,28);c.fillStyle=BG;c.fillRect(x-7,y-12+14*(1-Math.max(-1,Math.min(1,v)))*.5-0,14,12);};
  [[-.62*s,.22*s,rl],[.62*s,.22*s,-rl],[-.2*s,.74*s,dfl],[.2*s,.74*s,dfl],[-.4*s,-.1*s,dfl*.5],[.4*s,-.1*s,dfl*.5]].forEach(([x,y,v])=>bar(cx+x,cy+y,v));
  NS(c,'G '+(P.nz||1).toFixed(1),14,h*.78,22,G);NS(c,'AOA '+((P.alpha||0)/D).toFixed(1),14,h*.84,22,G);NS(c,'ALT',w-14,h*.78,20,G,'right');NS(c,'PA',w-14,h*.84,20,G,'right');NS(c,'INTEG',14,h*.34,18,G);NS(c,'FCS',14,h*.37,18,G);NS(c,'FADEC',14,h*.40,18,G);NS(c,'TRIM',w-14,h*.34,18,G,'right');NS(c,'RESET',w-14,h*.38,18,G,'right');
  NS(c,'CG 23',cx,h*.8,22,G,'center');NS(c,'G-LIM '+(P.ac.gLim||9),cx,h*.86,18,GD,'center');}
// SMS: store diagram with the selected weapon
function pgSMS(c,w,h,P){hdr(c,w,'SMS','AA2',1);const cx=w/2,cy=h*.38,s=Math.min(w*.46,h*.3);jet(c,cx,cy,s,GD);const w0=game.wsel,sl=stationList(P),xs={1:-.95,2:-.7,3:-.45,4:-.22,5:0,6:.22,7:.45,8:.7,9:.95};
  for(const [k,wn] of sl){const key=String(k).replace(/[bc]$/,''),xx=cx+(xs[key]||0)*s*.9,sel=wn===w0,yy=cy-s*.35+(String(k).endsWith('b')?s*.55:0);c.fillStyle=sel?G:'#d9ddd6';c.strokeStyle=c.fillStyle;if(isTank(wn)){c.beginPath();c.ellipse(xx,yy+s*.3,10,s*.4,0,0,7);c.fill();}else{c.beginPath();c.moveTo(xx,yy-s*.18);c.lineTo(xx+7,yy);c.lineTo(xx+7,yy+s*.55);c.lineTo(xx-7,yy+s*.55);c.lineTo(xx-7,yy);c.closePath();c.fill();}NS(c,String(key),xx,yy-s*.26,15,GD,'center');}
  const lab=w0==='GUN'?'GUN '+P.gun.ammo+' RDY':(w0?(SN[w0]||w0)+' - '+(P.count(w0)?'RDY':'EMPTY'):'NO WPN SELECTED');c.strokeStyle=G;c.lineWidth=3;c.strokeRect(w*.12,h*.67,w*.76,56);NS(c,'STA '+((sl.find(x=>x[1]===w0)||[''])[0]||'-')+'  '+lab,cx,h*.67+28,21,ARM()===0?AM:G,'center');
  const cm=P.cm||{};c.strokeStyle=G;c.lineWidth=2;c.strokeRect(w*.3,h*.78,w*.4,66);NS(c,'CHAFF '+(cm.chaff!=null?cm.chaff:cm.ch!=null?cm.ch:'--'),cx,h*.78+22,19,WH,'center');NS(c,'FLARE '+(cm.flare!=null?cm.flare:cm.fl!=null?cm.fl:'--'),cx,h*.78+48,19,WH,'center');
  NS(c,'MASTER ARM '+(ARM()===0?'ARM':'SAFE'),w*.5,h*.94,20,ARM()===0?AM:G,'center');NS(c,'GUN '+P.gun.ammo,w-10,h*.67-14,18,G,'right');}
// EFI: attitude with bracket pitch ladder, flight director, heading rose
function pgEFI(c,w,h,P){NS(c,'EFI',10,20,20,G);NS(c,'NAV',10,44,18,GD);NS(c,'JPALS',w*.38,20,19,G,'center');NS(c,'ILS',w*.62,20,19,G,'center');NS(c,'CNTL>',w-10,20,20,G,'right');
  const ax=0,ay0=56,aw=w,ah=h*.5,cx=w/2,cy=ay0+ah/2;c.save();c.beginPath();c.rect(ax,ay0,aw,ah);c.clip();c.translate(cx,cy);c.rotate(-(P.bank||0));const po=(P.pitch||0)/D*(ah/48);c.fillStyle='#1c63c4';c.fillRect(-w,-ah*3+po,w*2,ah*3);c.fillStyle='#5a2e22';c.fillRect(-w,po,w*2,ah*3);c.fillStyle=WH;c.fillRect(-w,po-1.5,w*2,3);
  for(let a=-30;a<=30;a+=5){if(!a)continue;const y=po-a*(ah/48),ww=a%10?22:48;c.strokeStyle=WH;c.lineWidth=2;c.beginPath();c.moveTo(-ww-40,y);c.lineTo(-40,y);c.moveTo(40,y);c.lineTo(ww+40,y);if(a<0){c.moveTo(-ww-40,y);c.lineTo(-ww-40,y-8);c.moveTo(ww+40,y);c.lineTo(ww+40,y-8);}else{c.moveTo(-ww-40,y);c.lineTo(-ww-40,y+8);c.moveTo(ww+40,y);c.lineTo(ww+40,y+8);}c.stroke();if(a%10===0){NS(c,String(Math.abs(a)),-ww-70,y,16,WH,'center');}}c.restore();
  c.strokeStyle=AM;c.lineWidth=4;c.beginPath();c.moveTo(cx-60,cy);c.lineTo(cx-22,cy);c.lineTo(cx,cy+16);c.lineTo(cx+22,cy);c.lineTo(cx+60,cy);c.stroke();
  NS(c,'FD',w-10,ay0+ah+18,18,G,'right');NS(c,'ON',w-10,ay0+ah+38,18,G,'right');
  const cas=Math.round(kt(P.cas||P.vel.length())),al=Math.round(ft(P.pos.y));NS(c,'CAS '+cas,14,ay0+ah+22,22,WH);NS(c,'ALT '+al,w-14,ay0+ah+70,22,WH,'right');NS(c,'M '+(P.mach||0).toFixed(2),14,ay0+ah+50,20,G);NS(c,'G '+(P.nz||1).toFixed(1),14,ay0+ah+76,20,G);
  const rx=w/2,ry=h*.8,rr=Math.min(w*.3,h*.15),hd=(P.hdg%360+360)%360;c.strokeStyle=WH;c.lineWidth=2;c.beginPath();c.arc(rx,ry,rr,0,7);c.stroke();for(let a=0;a<360;a+=10){const t=(a-hd)*D,r1=rr-(a%30?6:14);c.beginPath();c.moveTo(rx+Math.sin(t)*rr,ry-Math.cos(t)*rr);c.lineTo(rx+Math.sin(t)*r1,ry-Math.cos(t)*r1);c.stroke();if(a%30===0)NS(c,a===0?'N':a===90?'E':a===180?'S':a===270?'W':String(a/10),rx+Math.sin(t)*(rr-28),ry-Math.cos(t)*(rr-28),17,WH,'center');}
  c.strokeStyle=WH;c.lineWidth=3;c.beginPath();c.moveTo(rx,ry-18);c.lineTo(rx,ry+18);c.moveTo(rx-14,ry);c.lineTo(rx+14,ry);c.stroke();c.fillStyle=AM;c.beginPath();c.moveTo(rx,ry-rr-4);c.lineTo(rx-8,ry-rr-18);c.lineTo(rx+8,ry-rr-18);c.fill();NS(c,'HDG '+String(Math.round(hd)).padStart(3,'0'),14,h*.76,20,G);NS(c,'VS '+Math.round(ft(P.vel.y)*60/100)*100,w-14,h*.76,18,G,'right');NS(c,'RALT '+Math.round(ft(P.pos.y-groundAt(P.pos.x,P.pos.z))),w-14,h*.82,18,G,'right');NS(c,sys.v.gear?'GEAR DOWN':'',14,h*.82,18,AM);}
// ENG: three-over-three dial layout, FF and hydraulics
function pgENG(c,w,h,P){hdr(c,w,'ENG','NAV',0);NS(c,'A-ICE',w-10,20,19,G,'right');NS(c,'AUTO',w-10,44,17,GD,'right');const e=P.eng&&P.eng.e&&P.eng.e[0],n2=e?e.rpm:(P.n||0)*100,egt=e?e.egt*700:400+300*(P.n||0),thr=(P.thr||0)*100;
  dialG(c,w*.2,h*.2,w*.1,thr,100,'THRUST');dialG(c,w*.5,h*.2,w*.1,egt,1000,'EGT');dialG(c,w*.8,h*.2,w*.1,P.ab?P.ab*100:thr>85?60:20,100,'NOZZLE');
  NS(c,'FF',14,h*.46,20,G);c.strokeStyle=G;c.lineWidth=2;c.strokeRect(54,h*.46-16,86,32);NS(c,String(Math.round(lb((P.ff||0)*3600))),97,h*.46,20,G,'center');NS(c,'HYD A',w*.4,h*.46,20,G);c.strokeRect(w*.55,h*.46-16,86,32);NS(c,'2850',w*.55+43,h*.46,20,G,'center');NS(c,'B',w*.8,h*.46,20,G);c.strokeRect(w*.84,h*.46-16,80,32);NS(c,'2860',w*.84+40,h*.46,20,G,'center');
  dialG(c,w*.2,h*.7,w*.1,n2*.8,100,'N1 RPM');dialG(c,w*.5,h*.7,w*.1,n2,110,'N2 RPM');dialG(c,w*.8,h*.7,w*.1,50+n2*.15,100,'OIL');NS(c,P.hp<35?'ENG DAMAGE':'',w*.5,h*.95,22,RD,'center');}
// FUEL: tank map, joker / bingo
function pgFUEL(c,w,h,P){NS(c,'FUEL',10,20,20,G);NS(c,'REFUEL',90,20,18,GD);const tot=P.totalFuel||0,int=P.fuel||0,ext=P.tankFuel||0,fr=[['F1',.36,.35,.12,.3],['F2L',.1,.3,.34,.16],['F2R',.1,.5,.34,.16],['F3L',.12,.3,.52,.16],['F3R',.12,.5,.52,.16],['F4L',.07,.3,.7,.12],['F4R',.07,.5,.7,.12],['F5',.06,.4,.84,.08]];
  NS(c,'TOT '+(lb(tot)/1000).toFixed(1),w-10,40,20,G,'right');NS(c,'INT '+(lb(int)/1000).toFixed(1),w-10,66,18,G,'right');NS(c,'EXT '+(lb(ext)/1000).toFixed(1),w-10,90,18,G,'right');
  const cap=((P.ac.fuel||8000)+ext+1)||1;for(const [n,f,x,y,hh] of fr){const v=lb(tot*f),X=w*x,Y=h*y,ww=w*.2,H=h*hh;c.fillStyle='#7a2fa8';c.fillRect(X,Y,ww,H);c.strokeStyle=WH;c.lineWidth=2;c.strokeRect(X,Y,ww,H);NS(c,n,X+8,Y+14,15,WH);NS(c,String(Math.round(v/10)*10),X+ww/2,Y+H/2+4,20,WH,'center');}
  const jk=lb(tot)/1000;NS(c,'JOKER',14,h*.8,18,G);NS(c,'4.5',14,h*.84,22,jk<4.5?AM:G);NS(c,'BINGO',14,h*.9,18,G);NS(c,'3.0',14,h*.94,22,jk<3?RD:G);const bj=(P.ff||0)>0?tot/Math.max(.01,P.ff)/60:0;NS(c,'ENDUR '+(bj>0&&isFinite(bj)?Math.round(bj)+' MIN':'--'),w-10,h*.9,18,G,'right');if(tot/cap<.15)NS(c,'FUEL LOW',w*.5,h*.97,22,RD,'center');}
// DAS: spherical missile / aircraft warning
function pgDAS(c,w,h,P){hdr(c,w,'DAS','NAV',1);const cx=w/2,cy=h*.5,R=Math.min(w*.44,h*.4);c.strokeStyle=GD;c.lineWidth=2;for(const f of[.35,.7,1]){c.beginPath();c.arc(cx,cy,R*f,0,7);c.stroke();}c.beginPath();c.moveTo(cx,cy-R);c.lineTo(cx,cy+R);c.moveTo(cx-R,cy);c.lineTo(cx+R,cy);c.stroke();jet(c,cx,cy,R*.14,WH);
  const mk=(az,el,col,t)=>{const r=R*Math.cos(Math.min(1.45,Math.abs(el))),x=cx+Math.sin(az)*r,y=cy-Math.cos(az)*r;c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.moveTo(x,y-16);c.lineTo(x+14,y+11);c.lineTo(x-14,y+11);c.closePath();c.stroke();NS(c,t,x,y+34,16,col,'center');};
  for(const m of RW.msl)mk(m.a,0,RD,'MSL '+Math.round(nm(m.d||0))+'NM');try{for(const m of MSS.warned){const b=body(P,m.pos||m.m&&m.m.pos||P.pos),az=Math.atan2(b.x,-b.z),el=Math.atan2(b.y,Math.hypot(b.x,b.z));mk(az,el,RD,'MAWS');}}catch(e){}
  for(const [j,t] of radar.tracks.entries()){if(!j.alive||!t.p||j.side===P.side)continue;const b=body(P,t.p);const az=Math.atan2(b.x,-b.z);c.strokeStyle=AM;c.lineWidth=2;c.beginPath();c.arc(cx+Math.sin(az)*R*.9,cy-Math.cos(az)*R*.9,9,0,7);c.stroke();}
  NS(c,'DAS '+(MSS.warned.length||RW.msl.length?'ALERT':'OK'),w*.5,h*.92,22,MSS.warned.length||RW.msl.length?RD:G,'center');try{const st=MSS.dir&&MSS.dir.state;if(st&&st!=='OFF')NS(c,'DIRCM '+st,w*.5,h*.97,18,AM,'center');}catch(e){}}
// EOTS / TFLIR
const _eo=mkCv(360,360);
function pgEOTS(c,w,h,P){hdr(c,w,'TFLIR','NAV',1);let ok=false;try{if(SNS.hasPod(P)){SNS.drawPage(_eo.getContext('2d'),360,'TGP',30);ok=true;}}catch(e){}
  if(!ok){NS(c,'EOTS',w/2,h/2-14,30,G,'center');NS(c,'NOT AVAILABLE',w/2,h/2+24,20,GD,'center');return;}const s=Math.min(w-10,h-90);c.drawImage(_eo,(w-s)/2,60,s,s);c.strokeStyle=MG;c.lineWidth=3;c.beginPath();c.arc(w/2,60+s/2,s*.42,0,7);c.stroke();NS(c,'SLAVE',w/2,60+s+20,22,G,'center');NS(c,'SPNT TGT',14,h*.8,18,G);NS(c,'WHOT',w-14,h*.8,18,G,'right');}
function pgGEAR(c,w,h,P){hdr(c,w,'GEAR','NAV',0);const gp=P.gearPos||0,dn=sys.v.gear;const g=(x,y,l)=>{const col=gp>.95?G:gp<.05?GD:AM;c.strokeStyle=col;c.lineWidth=4;c.strokeRect(x-34,y-34,68,68);NS(c,gp>.95?'DN':gp<.05?'UP':'TR',x,y,26,col,'center');NS(c,l,x,y+54,18,GD,'center');};
  g(w*.5,150,'NOSE');g(w*.3,290,'L MAIN');g(w*.7,290,'R MAIN');NS(c,'HANDLE '+(dn?'DOWN':'UP'),w*.5,420,24,WH,'center');NS(c,'PARK BRK '+(S2.park?'SET':'OFF'),w*.5,460,22,G,'center');NS(c,'WEIGHT ON WHEELS '+(P.onGnd?'YES':'NO'),w*.5,496,22,P.onGnd?AM:G,'center');}
function pgEW(c,w,h,P){hdr(c,w,'EW','NAV',0);const cx=w/2,cy=h*.5,R=Math.min(w,h)*.38;c.strokeStyle=GD;c.lineWidth=2;for(const r of[.35,.7,1]){c.beginPath();c.arc(cx,cy,R*r,0,7);c.stroke();}c.beginPath();c.moveTo(cx,cy-R);c.lineTo(cx,cy+R);c.moveTo(cx-R,cy);c.lineTo(cx+R,cy);c.stroke();jet(c,cx,cy,16,WH);
  for(const t of RW.list.slice(0,16)){const a=(t.a||0),rr=R*Math.max(.3,Math.min(1,t.dEst?t.dEst/60000:.7));const x=cx+Math.sin(a)*rr,y=cy-Math.cos(a)*rr,col=t.mode==='L'?RD:t.lk?AM:G;c.strokeStyle=col;c.lineWidth=2.4;c.strokeRect(x-17,y-17,34,34);NS(c,t.sym||'?',x,y,24,col,'center');if(t.mode==='L')NS(c,'LAUNCH',x,y-30,14,RD,'center');}
  for(const m of RW.msl){const a=m.a||0;const x=cx+Math.sin(a)*R*.55,y=cy-Math.cos(a)*R*.55;c.strokeStyle=RD;c.lineWidth=3;c.beginPath();c.moveTo(x,y-20);c.lineTo(x+16,y+14);c.lineTo(x-16,y+14);c.closePath();c.stroke();NS(c,'M',x,y+2,18,RD,'center');}}
function pgMENU(c,w,h,P){const W=WIN.find(x=>x.menu);NS(c,'MENU',10,20,20,MN);const cols=4,rows=Math.ceil((PAGES.length)/cols),cw=(w-20)/cols,ch=Math.min(100,(h-70)/6);c.strokeStyle=MN;c.lineWidth=2;
  for(let r=0;r<7;r++)for(let q=0;q<cols;q++){c.strokeRect(10+q*cw,50+r*ch,cw,ch);}PAGES.forEach((n,i)=>{if(n==='MENU')return;const q=i%cols,r=Math.floor(i/cols);NS(c,n,10+q*cw+cw/2,50+r*ch+ch/2,24,MN,'center');});NS(c,'TAP A PAGE',w/2,h-20,18,GD,'center');}
/* ---- SAR: synthetic-aperture ground map ahead (heading up). Built from the game's terrain: grey by slope against a low sun, water dark. Refreshes once a second. */
const _sar=mkCv(112,112);let _sarT=-9,_sarR=0;
function pgSAR(c,w,h,P){hdr(c,w,'SAR1','NAV',1);const rng=TS.rngs[TS.rng]*1852*.5,now=performance.now()/1000;
  if(now-_sarT>1||_sarR!==rng){_sarT=now;_sarR=rng;const g=_sar.getContext('2d'),N=112,im=g.createImageData(N,N),hd=P.hdg*D,sx=Math.sin(hd),sz=-Math.cos(hd),rx=Math.cos(hd),rz=Math.sin(hd),st=rng/N,hh=(x,z)=>groundAt(x,z);
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const f=(N-1-j)*st,l=(i-N/2)*st,X=P.pos.x+sx*f+rx*l,Z=P.pos.z+sz*f+rz*l,y=hh(X,Z),dx=hh(X+st,Z)-hh(X-st,Z),dz=hh(X,Z+st)-hh(X,Z-st),sh=Math.max(0,Math.min(1,.5+(dx*.6-dz*.4)/(st*1.6))),v=y<=.5?14:Math.round(40+sh*150+Math.min(40,y/30)),o=(j*N+i)*4;im.data[o]=v;im.data[o+1]=v;im.data[o+2]=v;im.data[o+3]=255;}g.putImageData(im,0,0);}
  const s=Math.min(w-20,h-130),x0=(w-s)/2,y0=60;c.imageSmoothingEnabled=true;c.drawImage(_sar,x0,y0,s,s);c.strokeStyle=G;c.lineWidth=2;c.strokeRect(x0,y0,s,s);
  for(let i=1;i<4;i++){c.strokeStyle='rgba(71,245,138,.55)';c.beginPath();c.arc(x0+s/2,y0+s,s*i/4,Math.PI*1.2,Math.PI*1.8);c.stroke();NS(c,String(Math.round(rng/1852*i/4)),x0+s/2+4,y0+s-s*i/4+16,16,G);}
  c.strokeStyle=WH;c.lineWidth=2;c.beginPath();c.moveTo(x0+s/2,y0+s);c.lineTo(x0+s/2,y0);c.stroke();jet(c,x0+s/2,y0+s-14,12,WH);
  NS(c,'MODE SAR',14,h*.9,19,G);NS(c,'RNG '+Math.round(rng/1852)+' NM',14,h*.95,18,G);NS(c,'HDG '+String(Math.round((P.hdg%360+360)%360)).padStart(3,'0'),w-14,h*.9,19,G,'right');NS(c,'ALT '+Math.round(ft(P.pos.y)),w-14,h*.95,18,G,'right');}
const live=(cv,fb)=>(c,w,h,P)=>{try{if(cv()&&cv().width){hdr(c,w,'FCR','NAV',1);const k=Math.min(w/cv().width,(h-60)/cv().height),dw=cv().width*k,dh=cv().height*k;c.drawImage(cv(),(w-dw)/2,56,dw,dh);return;}}catch(e){}fb(c,w,h,P);};
const DRAW={EFI:pgEFI,TSD:pgTSD,VSD:pgVSD,RCS:pgRCS,FCR:live(()=>fcrC,pgTSD),SAR:pgSAR,SMS:pgSMS,FCS:pgFCS,ENG:pgENG,FUEL:pgFUEL,DAS:pgDAS,EOTS:pgEOTS,GEAR:pgGEAR,EW:pgEW,MENU:pgMENU};
function icaws(P){const m=[];if(!P)return m;if(P.hp<35)m.push(['DAMAGE',RD]);if(P.totalFuel<(P.ac.fuel||8000)*.15)m.push(['FUEL LOW',AM]);if(window.MSS&&MSS.warned.length)m.push(['MISSILE',RD]);if(RW.list.some(t=>t.mode==='L'))m.push(['LAUNCH',RD]);
  if(!sys.v.gear&&P.cas<95&&ft(P.pos.y-groundAt(P.pos.x,P.pos.z))<1500)m.push(['GEAR',AM]);if(P.gAllow&&P.nz>P.gAllow*.95)m.push(['OVERG',AM]);return m;}
function drawPCD(){const P=PL(),c=pcv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.fillStyle=BG;c.fillRect(0,0,PW,PH);if(!P||!P.alive)return;
  const k=S2.night?.55:1;c.globalAlpha=1;
  // top strip: fuel, stores, aircraft icon, ICAWS, AP/AT, comm, record, MENU, IFF
  c.fillStyle='#030a07';c.fillRect(0,0,PW,74);const ms=icaws(P),cn={MRM:0,SRM:0,BOMB:0};for(const [,wn] of stationList(P))if(!isTank(wn))cn[cls(wn)]++;
  c.strokeStyle=G;c.lineWidth=3;c.beginPath();c.arc(54,36,26,0,7);c.stroke();NS(c,String(Math.round(nm(1)*0+(P.nz||1)*10)/10),54,36,18,G,'center');
  [['G',lb(P.totalFuel||0)/1000],['I',lb(P.fuel||0)/1000],['E',lb(P.tankFuel||0)/1000]].forEach(([l,v],i)=>NS(c,l+' '+v.toFixed(1),100,14+i*20,17,i?MG:G));
  [[cn.MRM,'MRM'],[cn.SRM,'SRM'],[P.gun.ammo,'GUN'],[cn.BOMB,'BOMB']].forEach(([v,l],i)=>NS(c,v+' '+l,230,12+i*17,16,G));jet(c,420,38,24,G);
  NS(c,'ICAWS',PW*.27,28,28,CY,'center');ms.slice(0,3).forEach(([t,col],i)=>NS(c,t,PW*.27-140+i*150,58,20,col));
  NS(c,'AP',PW*.47,22,22,GD,'center');NS(c,'AT',PW*.47,52,22,GD,'center');c.strokeStyle=G;c.lineWidth=2;c.beginPath();c.moveTo(PW*.51,38);c.lineTo(PW*.54,18);c.lineTo(PW*.54,58);c.closePath();c.stroke();c.beginPath();c.moveTo(PW*.57,38);c.lineTo(PW*.54,18);c.lineTo(PW*.54,58);c.stroke();
  [['A','123.700'],['B','124.850'],['C','124.850']].forEach(([a,f],i)=>NS(c,a+' V '+f,PW*.6,14+i*20,16,G));NS(c,'RECORD',PW*.72,16,16,G);NS(c,'0:00:00',PW*.72,40,16,G);
  c.strokeStyle=G;c.strokeRect(PW*.79,6,110,62);for(let i=1;i<5;i++){c.beginPath();c.moveTo(PW*.79+i*22,6);c.lineTo(PW*.79+i*22,68);c.stroke();}for(let i=1;i<3;i++){c.beginPath();c.moveTo(PW*.79,6+i*20);c.lineTo(PW*.79+110,6+i*20);c.stroke();}NS(c,'MENU',PW*.79+55,37,22,WH,'center');
  NS(c,'IFF 12',PW*.875,14,15,G);NS(c,'CAB '+Math.round(ft(P.pos.y)/10)*10*0+'8000',PW*.875,32,15,G);NS(c,'GCAS '+(S2.aut?'AUTO':'OFF'),PW*.875,50,15,G);NS(c,'WIND '+Math.round((P.hdg%360+360)%360)+'/ 0',PW*.94,32,15,G);
  WIN.forEach((W,i)=>{c.save();c.translate(W.x,WY);c.beginPath();c.rect(0,0,W.w,WH_);c.clip();c.strokeStyle='rgba(71,245,138,.5)';c.lineWidth=2;c.strokeRect(1,1,W.w-2,WH_-2);
    try{DRAW[PAGES[W.page]](c,W.w,WH_,P);}catch(e){if(!W.err){W.err=1;console.warn('[f35pit] page',PAGES[W.page],e);}NS(c,PAGES[W.page]+' ERR',W.w/2,WH_/2,24,RD,'center');}c.restore();
    // tab bar: previous | current (tap = MENU) | next
    const ty=PH-66,tw=W.w/3;for(let j=0;j<3;j++){const pi=(W.page+j-1+PAGES.length)%PAGES.length,cur=j===1;c.strokeStyle=cur?G:GD;c.lineWidth=cur?3:1.5;c.beginPath();c.moveTo(W.x+j*tw+10,ty+54);c.lineTo(W.x+j*tw+22,ty+6);c.lineTo(W.x+(j+1)*tw-22,ty+6);c.lineTo(W.x+(j+1)*tw-10,ty+54);c.closePath();c.stroke();
      NS(c,PAGES[pi],W.x+j*tw+tw/2,ty+31,cur?24:20,cur?WH:G,'center');}});
  if(k<1){c.globalAlpha=1-k;c.fillStyle='#000';c.fillRect(0,0,PW,PH);c.globalAlpha=1;}}
out.redraw.push(()=>{drawPCD();ptex.needsUpdate=true;});
// touch: side tabs step pages, centre tab opens the MENU for that window; TSD / VSD arrows change range; FCR click locks; RCS toggles upper / lower hemisphere
window.F35PIT={S2,WIN,PAGES,PI,TS,click(x,y){const px=x/360*PW,py=y/360*PH;
  if(py>=PH-66){for(const W of WIN)if(px>=W.x&&px<W.x+W.w){const j=Math.floor((px-W.x)/(W.w/3));if(j===1){if(PAGES[W.page]==='MENU'){W.page=W.prev!=null?W.prev:0;W.menu=0;}else{W.prev=W.page;W.page=PI.MENU;W.menu=1;}}else W.page=(W.page+(j-1)+PAGES.length)%PAGES.length;sfx.click();return true;}}
  if(py<74){if(px>PW*.79&&px<PW*.79+110){const W=WIN[3];W.prev=W.page;W.page=PI.MENU;W.menu=1;sfx.click();return true;}return false;}
  for(const W of WIN){if(!(py>WY&&py<WY+WH_&&px>=W.x&&px<W.x+W.w))continue;const lx=px-W.x,ly=py-WY,pg=PAGES[W.page];
    if(pg==='MENU'){const cols=4,cw=(W.w-20)/cols,ch=Math.min(100,(WH_-70)/6),q=Math.floor((lx-10)/cw),r=Math.floor((ly-50)/ch),i=r*cols+q;if(q>=0&&q<cols&&r>=0&&PAGES[i]&&PAGES[i]!=='MENU'){W.page=i;W.menu=0;sfx.click();return true;}return false;}
    if(pg==='TSD'||pg==='VSD'){if(lx<50&&ly>190&&ly<235){TS.rng=Math.min(TS.rngs.length-1,TS.rng+1);sfx.click();return true;}if(lx<50&&ly>=240&&ly<320){TS.rng=Math.max(0,TS.rng-1);sfx.click();return true;}if(lx<W.w*.2&&ly<56){radar.setTWS&&radar.setTWS(radar.mode!=='TWS');sfx.click();return true;}if(lx>W.w-90&&ly>WH_*.14&&ly<WH_*.26){W.page=W.page===PI.TSD?PI.VSD:PI.TSD;sfx.click();return true;}}
    if(pg==='RCS'){S2.rcsLow=S2.rcsLow?0:1;sfx.click();return true;}
    if(pg==='FCR'){const cv=fcrC,k=Math.min(W.w/cv.width,(WH_-60)/cv.height),dw=cv.width*k,dh=cv.height*k,fx=(lx-(W.w-dw)/2)/k,fy=(ly-56)/k;if(fx>=0&&fy>=0&&fx<cv.width&&fy<cv.height){mfdClick('fcr',fx,fy);return true;}}
  }
  return false;}};
// hit-test uses the plane's own UV (0..1 -> 0..360 in the generic handler), so remap through the game's mfdClick hook
{const _m=mfdClick;mfdClick=function(id,x,y){if(id==='f35pcd'){F35PIT.click(x,y);return;}return _m(id,x,y);};}
{const _t=screenTip;screenTip=function(id,x,y){if(id==='f35pcd')return'PCD · side tabs step pages, centre tab opens MENU · TSD/VSD: arrows set range · RCS: tap to flip upper/lower · FCR: tap a contact to lock';return _t(id,x,y);};}

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
