/* =====================================================================================================================
   v377 — PLAYABLE INFANTRY (owner request). From the sortie setup, GO AS INFANTRY opens the KIT menu:
   * ROLE presets (assault, sniper, marksman, anti-tank, air defence, machine gunner, close quarters, breacher) set
     the kit; each item can still be changed.
   * PRIMARY: carbine, submachine gun, combat shotgun, service rifle, light machine gun, designated marksman rifle or
     sniper rifle (with a scope view); your country's service rifle is named from its equipment table. Each has its
     own first-person model.
   * LAUNCHER: anti-tank rocket, anti-tank guided missile or portable air-defence missile (named from the table), or none.
   * BODY ARMOUR: none, soft, plates, heavy plates — more protection, slower movement.
   * GRENADES and sidearm.
   * INSERTION: APC, IFV (stays and supports you with its cannon), helicopter, or airdrop by parachute (steer it down).
   A TOWN on a street grid: hollow houses of one to three storeys with doors, windows you can see and shoot through,
   floors and stairs; walls collide for you and every soldier.
   DRONES: FPV attack drones dive on soldiers, vehicles and you (shoot them down); one-way attack drones (Shahed-136 /
   Geran-2 type for REDFOR) fly over and strike the rear; armed loitering drones (MQ-9 Reaper type, or the side's own)
   circle high and fire missiles. Both sides use them; your air-defence missile locks them.
   You then fight on foot near the front: take and hold the objective with your squad against the enemy's infantry, a
   vehicle and, at times, a helicopter. A win pushes that front sector forward a little; losses are reported.
   First person, its own scene and renderer (the flight game is paused underneath).
   Keys: WASD move · mouse look (click to capture) · Shift sprint · C crouch · Space jump / open parachute / skip ·
   LMB fire · RMB aim · R reload · 1 primary · 2 launcher · 3 sidearm · G grenade · Esc leave.
   Abstract and game-like: no technical weapon data beyond class behaviour.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR||{st:null,emit(){}};if(typeof THREE==='undefined')return;
const rn=()=>Math.random(),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EQ=a3=>(window.NATDATA&&NATDATA.EQ&&NATDATA.EQ[a3])||{};const first=v=>v?String(v).split(/,\s*/)[0]:null;
/* ------------------------------------------------------------------ kit */
const PRI={CARB:{n:'Carbine',rpm:750,dmg:30,mag:30,res:210,spr:.016,ads:1.5,rl:2,auto:1,vm:'carb'},
           SMG:{n:'Submachine gun',rpm:900,dmg:22,mag:30,res:240,spr:.026,ads:1.3,rl:1.8,auto:1,fast:1.08,vm:'smg'},
           SHOT:{n:'Combat shotgun',rpm:110,dmg:16,pel:9,mag:8,res:40,spr:.07,ads:1.2,rl:3.4,auto:0,vm:'shot'},
           RIFLE:{n:'Service rifle',rpm:700,dmg:34,mag:30,res:210,spr:.012,ads:1.6,rl:2.2,auto:1,vm:'rifle'},
           LMG:{n:'Light machine gun',rpm:780,dmg:34,mag:100,res:300,spr:.02,ads:1.4,rl:5,auto:1,slow:.9,vm:'lmg'},
           DMR:{n:'Designated marksman rifle',rpm:260,dmg:62,mag:20,res:120,spr:.004,ads:3.5,rl:2.6,auto:0,vm:'dmr'},
           SNP:{n:'Sniper rifle',rpm:50,dmg:140,mag:5,res:40,spr:.0015,ads:7,rl:3.2,auto:0,vm:'snp',scope:1}};
// roles set a sensible kit; each item can still be changed
const ROLE={ASSAULT:{n:'Assault',pri:'RIFLE',lau:'NONE',arm:'PLATE',gren:4},SNIPER:{n:'Sniper',pri:'SNP',lau:'NONE',arm:'SOFT',gren:0},MARKSMAN:{n:'Marksman',pri:'DMR',lau:'NONE',arm:'PLATE',gren:2},
  AT:{n:'Anti-tank',pri:'CARB',lau:'ATGM',arm:'PLATE',gren:2},AA:{n:'Air defence',pri:'CARB',lau:'MANPADS',arm:'SOFT',gren:2},MG:{n:'Machine gunner',pri:'LMG',lau:'NONE',arm:'HEAVY',gren:2},
  CQB:{n:'Close quarters',pri:'SMG',lau:'NONE',arm:'HEAVY',gren:4},BREACH:{n:'Breacher',pri:'SHOT',lau:'RPG',arm:'HEAVY',gren:4}};
const LAU={NONE:{n:'None'},RPG:{n:'Anti-tank rocket',mag:1,res:2,spd:120,dmg:400,rl:3.5},ATGM:{n:'Anti-tank guided missile',mag:1,res:1,spd:90,dmg:700,rl:5,guided:1},
           MANPADS:{n:'Portable air-defence missile',mag:1,res:0,spd:400,dmg:600,rl:6,air:1}};
const ARM={NONE:{n:'None',k:1,spd:1},SOFT:{n:'Soft armour vest',k:.8,spd:.97},PLATE:{n:'Armour plates',k:.55,spd:.9},HEAVY:{n:'Heavy plates and helmet',k:.4,spd:.8}};
const INS={APC:'Armoured personnel carrier',IFV:'Infantry fighting vehicle',HELO:'Helicopter',AIR:'Airdrop'};
const SIDE={n:'Sidearm',rpm:400,dmg:24,mag:15,res:45,spr:.02,ads:1.2,rl:1.6,auto:0,vm:'pistol'};
const K={mis:'ATTACK',role:'ASSAULT',pri:'RIFLE',lau:'RPG',arm:'PLATE',ins:'IFV',gren:2,a3:null,ap:null};
function names(a3){const E=EQ(a3);return{MBT:first(E.MBT),FTR:first(E.FTR4),ATK:first(E.ATK),RIFLE:first(E.RIFLE),RPG:null,ATGM:first(E.ATGM),MANPADS:first(E.MANPADS),APC:first(E.APC),IFV:first(E.IFV),HELO:first(E.UH)||first(E.HEL),AIR:first(E.TRN)};}
// v378: the classic campaign (CAMP) has no country registry: BLUEFOR fights as the USA, REDFOR as Russia; the battle is
// in the campaign's hottest sector and its result moves that sector of the campaign front.
const campCtx=()=>{const red=typeof game!=='undefined'&&game.team==='RED';return{camp:true,a3:red?'RUS':'USA',en:red?'USA':'RUS',side:red?'R':'B',n:red?'Russia':'United States',enN:red?'United States':'Russia'};};
const country=(cfg)=>cfg.camp?{n:campCtx().n,side:campCtx().side,gnd:1}:W.st.c[cfg.a3];
function kitMenu(a3,ap,camp){if(!camp&&!W.st)return;K.camp=!!camp;if(camp)a3=campCtx().a3;K.a3=a3;K.ap=ap;const p=country(K),N=names(a3);if(window.UI2)UI2.close();
  const b=(g,k,lab)=>'<button data-ik="'+g+':'+k+'" aria-pressed="'+(K[g]===k)+'">'+esc(lab)+'</button>';
  const h='<h2>INFANTRY — '+esc(p.n.toUpperCase())+'</h2><div class="muted">Your kit and how you get to the front.</div>'+
   '<h3>MISSION</h3><div class="grid">'+b('mis','ATTACK','ATTACK — take the town')+b('mis','DEFEND','DEFEND — hold the trenches')+'</div>'+
   '<h3>ROLE</h3><div class="grid">'+Object.keys(ROLE).map(k=>b('role',k,ROLE[k].n)).join('')+'</div>'+
   '<h3>PRIMARY WEAPON</h3><div class="grid">'+Object.keys(PRI).map(k=>b('pri',k,(k==='RIFLE'&&N.RIFLE?N.RIFLE+' (rifle)':PRI[k].n))).join('')+'</div>'+
   '<h3>LAUNCHER</h3><div class="grid">'+Object.keys(LAU).map(k=>b('lau',k,(N[k]?N[k]+' — ':'')+LAU[k].n)).join('')+'</div>'+
   '<h3>BODY ARMOUR</h3><div class="grid">'+Object.keys(ARM).map(k=>b('arm',k,ARM[k].n)).join('')+'</div>'+
   '<h3>GRENADES</h3><div class="grid">'+[0,2,4].map(n=>b('gren',n,String(n))).join('')+'</div>'+
   '<h3>INSERTION</h3><div class="grid">'+Object.keys(INS).map(k=>b('ins',k,INS[k]+(N[k]?' · '+N[k]:''))).join('')+'</div>'+
   '<div class="muted" style="margin-top:8px">Sidearm always carried. Heavier armour protects more and slows you. The IFV stays and fires in support; the APC and helicopter drop you and leave.</div>'+
   '<div style="margin-top:16px;display:flex;justify-content:space-between"><button data-ix="1">BACK</button><button class="go" data-igo="1">DEPLOY</button></div>';
  const d=document.createElement('div');d.className='u2m';d.id='u2m';d.innerHTML='<div class="bx">'+h+'</div>';document.body.appendChild(d);}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-inf],[data-ik],[data-ix],[data-igo]');if(!t)return;const d=t.dataset;
  if(d.inf&&window.UI2){kitMenu(UI2.SU.a3,UI2.SU.ap);}
  else if(d.ik){const[g,k]=d.ik.split(':');K[g]=g==='gren'?+k:k;if(g==='role')Object.assign(K,{pri:ROLE[k].pri,lau:ROLE[k].lau,arm:ROLE[k].arm,gren:ROLE[k].gren});const m=document.getElementById('u2m');if(m)m.remove();kitMenu(K.a3,K.ap,K.camp);}
  else if(d.ix){const m=document.getElementById('u2m');if(m)m.remove();if(!K.camp&&window.UI2)UI2.setup(K.a3,K.ap);}
  else if(d.igo){const m=document.getElementById('u2m');if(m)m.remove();start({...K});}});

/* ------------------------------------------------------------------ the battle */
const V3=THREE.Vector3;let S=null;
function noise(x,z){return Math.sin(x*.011)*6+Math.cos(z*.013)*5+Math.sin((x+z)*.031)*1.6+Math.cos((x-z)*.047)*.9;}
let HF=noise;const H=(x,z)=>HF(x,z);
function soldier(col){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:col}),sk=new THREE.MeshLambertMaterial({color:0x8a6a50});
  const leg=new THREE.Mesh(new THREE.BoxGeometry(.36,.85,.24),m);leg.position.y=.43;g.add(leg);const tor=new THREE.Mesh(new THREE.BoxGeometry(.48,.62,.28),m);tor.position.y=1.17;g.add(tor);
  const hd=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),sk);hd.position.y=1.62;g.add(hd);const hm=new THREE.Mesh(new THREE.SphereGeometry(.15,8,6,0,7,0,1.5),m);hm.position.y=1.66;g.add(hm);
  const gun=new THREE.Mesh(new THREE.BoxGeometry(.06,.08,.8),new THREE.MeshLambertMaterial({color:0x222222}));gun.position.set(.2,1.25,-.35);g.add(gun);
  tor.userData.part='body';leg.userData.part='legs';hd.userData.part='head';hm.userData.part='head';return g;}
function vehicle(kind,col){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:col}),dk=new THREE.MeshLambertMaterial({color:0x1d1f1c});
  const hull=new THREE.Mesh(new THREE.BoxGeometry(3.1,1.7,6.6),m);hull.position.y=1.5;g.add(hull);
  if(kind==='IFV'||kind==='EIFV'){const t=new THREE.Mesh(new THREE.BoxGeometry(1.8,.7,2.2),m);t.position.set(0,2.7,.3);g.add(t);const b=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,2.6,6),dk);b.rotation.x=Math.PI/2;b.position.set(0,2.75,-1.9);g.add(b);g.userData.gun=b;
    for(const s of[-1,1]){const tr=new THREE.Mesh(new THREE.BoxGeometry(.6,1,6.8),dk);tr.position.set(s*1.7,.6,0);g.add(tr);}}
  else for(const s of[-1,1])for(const z of[-2.3,-.8,.8,2.3]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.45,10),dk);w.rotation.z=Math.PI/2;w.position.set(s*1.6,.55,z);g.add(w);}
  return g;}
function helo(col){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:col});const b=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,7),m);b.position.y=1.6;g.add(b);
  const tb=new THREE.Mesh(new THREE.BoxGeometry(.5,.6,7),m);tb.position.set(0,2.2,-6.5);g.add(tb);const r=new THREE.Mesh(new THREE.BoxGeometry(15,.08,.5),new THREE.MeshLambertMaterial({color:0x111111}));r.position.y=3.2;g.add(r);g.userData.rotor=r;return g;}
function plane(){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:0x5a6458});const f=new THREE.Mesh(new THREE.CylinderGeometry(2,2,30,10),m);f.rotation.x=Math.PI/2;g.add(f);
  const w=new THREE.Mesh(new THREE.BoxGeometry(40,.6,4),m);w.position.y=1.5;g.add(w);const t=new THREE.Mesh(new THREE.BoxGeometry(.5,7,4),m);t.position.set(0,4,14);g.add(t);return g;}

function build(cfg){const LOC=cfg.loc||{pop:3000};const GR=LOC.pop>5e5?4:LOC.pop>5e4?4:LOC.pop>5e3?3:2,FLMAX=LOC.pop>5e5?6:LOC.pop>5e4?4:3;const cv=document.createElement('canvas');cv.id='infCv';cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:9980;cursor:crosshair';document.body.appendChild(cv);
  const hud=document.createElement('div');hud.id='infHud';hud.style.cssText='position:fixed;inset:0;z-index:9981;pointer-events:none;font:13px/1.4 "B612 Mono",monospace;color:#e2efe6;text-shadow:0 1px 2px #000';
  hud.innerHTML='<div id="iX" style="position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px;border:1px solid rgba(255,255,255,.7);border-radius:50%"></div>'+
   '<div id="iHit" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:20px;color:#fff;opacity:0">✕</div>'+
   '<div id="iTop" style="position:absolute;top:10px;left:50%;transform:translateX(-50%);text-align:center"></div><div id="iBL" style="position:absolute;left:16px;bottom:14px"></div>'+
   '<div id="iBR" style="position:absolute;right:16px;bottom:14px;text-align:right"></div><div id="iMsg" style="position:absolute;top:30%;width:100%;text-align:center;font-size:18px;letter-spacing:.1em"></div>'+
   '<div id="iScope" style="display:none;position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,transparent 0 33vh,#000 33.3vh);"><div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:#000"></div><div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#000"></div></div>'+
   '<div id="iDmg" style="position:absolute;inset:0;background:radial-gradient(transparent 50%,rgba(160,0,0,.6));opacity:0"></div>';document.body.appendChild(hud);
  let R=null;try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true});R.setPixelRatio(Math.min(2,devicePixelRatio||1));R.setSize(innerWidth,innerHeight,false);}catch(e){R=null;}
  const sc=new THREE.Scene();sc.background=new THREE.Color(0x9fb8c8);sc.fog=new THREE.Fog(0x9fb8c8,250,900);sc.add(new THREE.HemisphereLight(0xdfeeff,0x4a5038,.85));const sun=new THREE.DirectionalLight(0xffffff,.7);sun.position.set(200,400,100);sc.add(sun);
  const cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,3000);
  const tg=new THREE.PlaneGeometry(2400,2400,200,200);tg.rotateX(-Math.PI/2);const pa=tg.attributes.position;for(let i=0;i<pa.count;i++)pa.setY(i,H(pa.getX(i),pa.getZ(i)));tg.computeVertexNormals();
  const ter=new THREE.Mesh(tg,new THREE.MeshLambertMaterial({color:0x5e7442}));sc.add(ter);
  const solid=[ter],bm=new THREE.MeshLambertMaterial({color:0xa49a86});
  const village=new V3(0,0,-260);const boxes=[];
  // a town on a street grid: houses of one to three storeys, hollow, with doors, windows, floors and stairs
  const wallM=[0xa49a86,0x9a8a74,0xb6aa92,0x8c8478].map(c=>new THREE.MeshLambertMaterial({color:c})),flM=new THREE.MeshLambertMaterial({color:0x6e6253}),rfM=new THREE.MeshLambertMaterial({color:0x7a3a2e});
  const box=(x0,y0,z0,x1,y1,z1,m)=>{const g=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0),m);g.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);sc.add(g);solid.push(g);boxes.push({x0,y0,z0,x1,y1,z1});return g;};
  function house(cx,cz,w,d,fl,mat){const T=.3,SH=3,y0=Math.max(H(cx-w/2,cz-d/2),H(cx+w/2,cz-d/2),H(cx-w/2,cz+d/2),H(cx+w/2,cz+d/2),H(cx,cz))+.15,x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2;
    box(x0,y0-3,z0,x1,y0,z1,flM);// foundation and ground floor
    // a wall along x (at z) or along z (at x) with windows, and a door on the ground floor of the front (z1) wall
    const wall=(along,fixed,a0,a1,f,door)=>{const yb=y0+f*SH,L=a1-a0,n=Math.max(1,Math.floor(L/3.2)),seg=L/n;
      const put=(p0,p1,q0,q1)=>along==='x'?box(a0+p0,yb+q0,fixed-T/2,a0+p1,yb+q1,fixed+T/2,mat):box(fixed-T/2,yb+q0,a0+p0,fixed+T/2,yb+q1,a0+p1,mat);
      for(let i=0;i<n;i++){const s0=i*seg,s1=s0+seg,m=(s0+s1)/2,isDoor=door&&i===(n>>1),hw=isDoor?.65:.6;
        put(s0,m-hw,0,SH);put(m+hw,s1,0,SH);if(isDoor)put(m-hw,m+hw,2.2,SH);else{put(m-hw,m+hw,0,1);put(m-hw,m+hw,2.1,SH);}}};
    for(let f=0;f<fl;f++){wall('x',z1,x0,x1,f,f===0);wall('x',z0,x0,x1,f,f===0&&fl>1);wall('z',x0,z0+T/2,z1-T/2,f,false);wall('z',x1,z0+T/2,z1-T/2,f,false);
      if(f>0){// upper floor with a stair opening along the x0 wall
        box(x0+1.4,y0+f*SH-.2,z0,x1,y0+f*SH,z1,flM);if(d>6.8)box(x0,y0+f*SH-.2,z0,x0+1.4,y0+f*SH,z1-6.4,flM);}}
    // stairs: steps along the x0 wall up to each floor
    for(let f=1;f<fl;f++){const n=12,sd=6/n;for(let i=0;i<n;i++){const zz=z1-.4-(i+1)*sd;box(x0+.2,y0+(f-1)*SH,zz,x0+1.4,y0+(f-1)*SH+(i+1)*SH/n,zz+sd,flM);}}
    box(x0-.3,y0+fl*SH,z0-.3,x1+.3,y0+fl*SH+.3,z1+.3,rfM);return{x0,z0,x1,z1};}
  const lots=[];for(let gx=-GR;gx<=GR;gx++)for(let gz=-GR;gz<=GR;gz++){if(rn()<.18)continue;const cx=village.x+gx*30+(rn()-.5)*4,cz=village.z+gz*30+(rn()-.5)*4;if(Math.abs(gx)<1&&Math.abs(gz)<1)continue;
    const cen=1-Math.max(Math.abs(gx),Math.abs(gz))/(GR+1),w=8+rn()*6+(FLMAX>4?cen*6:0),d=8+rn()*6+(FLMAX>4?cen*6:0),fl=1+((rn()*Math.max(1,FLMAX*cen+1))|0);lots.push(house(cx,cz,Math.round(w),Math.max(8,Math.round(d)),fl,wallM[(rn()*4)|0]));}
  // streets
  const stM=new THREE.MeshLambertMaterial({color:0x55524c});for(let k=-GR;k<=GR;k++){for(const ax of['x','z']){const g=new THREE.Mesh(new THREE.PlaneGeometry(ax==='x'?GR*60+30:5,ax==='x'?5:GR*60+30),stM);g.rotation.x=-Math.PI/2;g.position.set(village.x+(ax==='z'?k*30+15:0),H(village.x,village.z)+.05,village.z+(ax==='x'?k*30+15:0));}}
  const blds=boxes;
  const trm=new THREE.MeshLambertMaterial({color:0x2f4a26});for(let i=0;i<700;i++){const x=(rn()-.5)*2200,z=(rn()-.5)*2200;if(Math.hypot(x-village.x,z-village.z)<GR*32+40||(cfg.mis==='DEFEND'&&Math.abs(z+470)<40&&Math.abs(x)<200))continue;const t=new THREE.Mesh(new THREE.ConeGeometry(2.5,8,6),trm);t.position.set(x,H(x,z)+4,z);sc.add(t);}
  // DEFEND: a zig-zag trench line north of the town: earth parapet (stops rounds), sandbags, rear wall, dugouts
  const trench=[];if(cfg.mis==='DEFEND'){const earth=new THREE.MeshLambertMaterial({color:0x5a4630}),bag=new THREE.MeshLambertMaterial({color:0x8c7d5a}),TZ=-470;
    for(let x=-170;x<170;x+=10){const z0=TZ+((x/10)&1?3:-3),z1=TZ+(((x+10)/10)&1?3:-3),zm=Math.min(z0,z1),g=Math.min(H(x,zm),H(x+10,zm));
      box(x,g-.5,zm-2.6,x+10,g+1.35,zm-1.2,earth);if(((x/10)|0)%3)box(x+1,g+1.35,zm-2.4,x+9,g+1.65,zm-1.6,bag);box(x,g-.5,zm+1.3,x+10,g+.6,zm+2.2,earth);
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(10,2.5),new THREE.MeshLambertMaterial({color:0x3e3122}));fl.rotation.x=-Math.PI/2;fl.position.set(x+5,g+.04,zm);sc.add(fl);trench.push(new V3(x+5,g,zm));}
    for(const dx of[-120,0,120]){const g=H(dx,TZ+8);box(dx-3,g-.5,TZ+5,dx+3,g+2.2,TZ+5.4,earth);box(dx-3,g+2.2,TZ+5,dx+3,g+2.6,TZ+10,earth);}}
  village.y=H(village.x,village.z);const flag=new THREE.Mesh(new THREE.CylinderGeometry(25,25,.3,32,1,true),new THREE.MeshBasicMaterial({color:0xffe14a,transparent:true,opacity:.25,side:THREE.DoubleSide}));flag.position.copy(village).setY(village.y+.4);sc.add(flag);
  // first-person weapons held in view, one model per kind
  const gm=new THREE.MeshLambertMaterial({color:0x26282a}),gm2=new THREE.MeshLambertMaterial({color:0x4a4232}),vms={};
  const mk=(parts)=>{const g=new THREE.Group();for(const[w,h,d,x,y,z,m,cyl]of parts){const o=cyl?new THREE.Mesh(new THREE.CylinderGeometry(w,w,d,8),m||gm):new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||gm);if(cyl)o.rotation.x=Math.PI/2;o.position.set(x,y,z);g.add(o);}g.visible=false;g.scale.setScalar(.7);cam.add(g);return g;};
  vms.rifle=mk([[.07,.11,.62,0,0,0],[.015,0,.4,0,.02,-.5,0,1],[.05,.16,.08,0,-.12,-.08],[.06,.1,.25,0,-.02,.4],[.03,.05,.12,0,.08,-.05]]);
  vms.carb=mk([[.07,.11,.5,0,0,0],[.015,0,.25,0,.02,-.37,0,1],[.05,.15,.08,0,-.12,-.05],[.05,.08,.22,0,-.02,.34]]);
  vms.smg=mk([[.07,.1,.38,0,0,0],[.014,0,.16,0,.02,-.27,0,1],[.04,.2,.06,0,-.14,-.05],[.04,.05,.2,0,0,.27]]);
  vms.shot=mk([[.07,.1,.55,0,0,0],[.024,0,.5,0,.02,-.5,0,1],[.03,0,.3,0,-.05,-.45,gm2,1],[.06,.12,.28,0,-.05,.4,gm2]]);
  vms.lmg=mk([[.09,.13,.7,0,0,0],[.018,0,.5,0,.02,-.58,0,1],[.12,.14,.14,-.07,-.1,-.05,gm2],[.07,.11,.26,0,-.02,.45],[.01,.2,.01,.05,-.12,-.75]]);
  vms.dmr=mk([[.07,.11,.7,0,0,0],[.016,0,.5,0,.02,-.58,0,1],[.03,0,.24,0,.1,-.05,0,1],[.05,.15,.08,0,-.12,-.08],[.06,.12,.28,0,-.02,.45,gm2]]);
  vms.snp=mk([[.07,.1,.8,0,0,0,gm2],[.016,0,.6,0,.02,-.68,0,1],[.035,0,.34,0,.11,-.05,0,1],[.06,.14,.3,0,-.03,.5,gm2]]);
  vms.pistol=mk([[.04,.08,.2,0,0,-.05],[.035,.12,.05,0,-.08,.03]]);
  vms.tube=mk([[.06,0,1,0,.02,0,gm2,1],[.04,.12,.05,0,-.08,.1],[.08,0,.2,0,.02,-.55,gm2,1]]);
  const vm=new THREE.Group();sc.add(cam);
  return{cv,hud,R,sc,cam,ter,solid,blds,village,flag,vm,vms,trench};}

function start(cfg){if(S)stop(false);const st=cfg.camp?null:W.st;if(!st&&!cfg.camp)return;if(cfg.camp){const c=campCtx();cfg.a3=c.a3;}const p=country(cfg);const me=p.side,en=me==='B'?'R':'B';
  const fr=st?(st.fronts.find(f=>!f.cf&&(f.a===cfg.a3||f.b===cfg.a3))||st.fronts.find(f=>!f.cf&&(st.c[f.a].side===me||st.c[f.b].side===me))):null;
  const enA3=cfg.camp?campCtx().en:fr?(fr.a===cfg.a3||st.c[fr.a].side===me?fr.b:fr.a):null,N=names(cfg.a3),EN=names(enA3||'');
  const cs=cfg.camp&&typeof CAMP!=='undefined'&&CAMP.st?(CAMP.st.hot&&CAMP.st.hot.length?CAMP.st.hot[0]:(CAMP.st.front.length>>1)):null;
  if(typeof game!=='undefined'){S0.paused=game.paused;game.paused=true;}
  const LOC=resolveLoc(cfg,fr,cs);cfg.loc=LOC;HF=LOC.H;cfg.mis=cfg.mis||'ATTACK';
  const B=build(cfg);const pri={...PRI[cfg.pri]},lau={...LAU[cfg.lau]},sd={...SIDE};pri.cur=pri.mag;sd.cur=sd.mag;if(lau.mag)lau.cur=lau.mag;
  S={cfg,cs,loc:LOC,mission:cfg.mis,trZ:-470,wave:0,air:[],airT:8,me,en,fr,enA3,N,EN,...B,t:0,phase:'INSERT',ins:cfg.ins,pos:new V3(0,0,250),vel:new V3(),yaw:0,pitch:0,hp:100,arm:ARM[cfg.arm],crouch:false,ads:false,w:'pri',wp:{pri,lau,side:sd},gren:cfg.gren,
    reload:0,cool:0,fire:false,keys:{},drones:[],dT:20,us:[],them:[],veh:[],gnades:[],rk:[],kills:0,lost:0,hold:0,res:null,ifv:null,eheli:null,shots:0,hits:0,heliT:60+rn()*60,waveT:70,msg:'',msgT:0};
  // squads: yours (6) and theirs (scaled by the enemy's ground strength on that front)
  const ePow=cfg.camp?campPow(cs):enA3&&st?Math.min(1.6,Math.max(.6,(st.c[enA3].gnd/Math.max(1,p.gnd))||1)):1;
  for(let i=0;i<6;i++)S.us.push(man(true,(rn()-.5)*30,230+rn()*20));
  S.ePow=ePow;
  if(S.mission==='DEFEND'){// your squad and more riflemen hold the trench; two of your tanks stand behind it
    for(let i=0;i<6;i++)S.us.push(man(true,0,0));for(let i=0;i<6;i++){const u=man(true,0,0);S.us.push(u);}
    S.us.forEach((u,i)=>{const t=S.trench[Math.round((i+.5)*S.trench.length/S.us.length)%S.trench.length];u.slot=t.clone();u.m.position.set(t.x,H(t.x,t.z),t.z);});
    for(const x of[-70,70]){const z=S.trZ+70;const m=tank(S.me,0x4e5a3c);m.position.set(x,H(x,z),z);S.sc.add(m);S.veh.push({m,hp:1100,side:'F',x,z,cool:3,alive:true,tank:1,name:S.N.MBT||'main battle tank'});}}
  else{for(let i=0;i<Math.round(10*ePow);i++)S.them.push(man(false,S.village.x+(rn()-.5)*110,S.village.z+(rn()-.5)*110));
    {const v=vehicle('EIFV',0x6a5a3a);const x=S.village.x+40,z=S.village.z-30;v.position.set(x,H(x,z),z);S.sc.add(v);S.veh.push({m:v,hp:600,side:'E',x,z,cool:3,alive:true});}
    {const m=tank(S.en,0x6a5a3a);const x=S.village.x-50,z=S.village.z-60;m.position.set(x,H(x,z),z);S.sc.add(m);S.veh.push({m,hp:1100,side:'E',x,z,cool:4,alive:true,tank:1,name:S.EN.MBT||'main battle tank'});}}
  for(const u of S.us)u.m.visible=false;insertion();bind();loop.last=performance.now();if(!loop.on){loop.on=true;requestAnimationFrame(loop);}
  const dtx='You deploy as infantry with '+p.n+' ('+(cfg.pri==='RIFLE'&&N.RIFLE?N.RIFLE:PRI[cfg.pri].n)+', '+ARM[cfg.arm].n.toLowerCase()+') by '+INS[cfg.ins].toLowerCase()+(S.mission==='DEFEND'?' to hold the trenches before '+LOC.name:' to take '+LOC.name)+(fr?' on the front with '+st.c[enA3].n:cs!=null?' (sector '+(cs+1)+')':'')+'.';
  if(cfg.camp){if(typeof CAMP!=='undefined'&&CAMP.st)CAMP.log(dtx,'b');}else W.emit('INFANTRY',{e:[cfg.a3],txt:dtx});return S;}
// enemy strength in a campaign sector against yours (unit values by hit points)
function campPow(i){if(typeof CAMP==='undefined'||!CAMP.st||i==null)return 1;const st=CAMP.st,ms=0;let o=0,e=0;for(const u of st.units){if(u.dead||u.i!==i)continue;const v=(u.hp||100)/100;if(u.s===ms)o+=v;else e+=v;}return Math.min(1.6,Math.max(.6,(e+1)/(o+1)));}
const S0={paused:false};
/* ------------------------------------------------------------------ v379: where the battle is */
// World war: the real town or city (GeoNames / Natural Earth places) nearest the middle of your front, its size from its
// population, the ground from the real elevation grid. Campaign: the campaign town nearest the hot sector, on the
// campaign's own terrain. The town is laid out around its centre; the objective is its centre.
const CTN=['Velden','Korsk','Marnow','Ostbrück','Hadley Cross','Pirna','Lesk','Drovna','Altheim','Brenno','Sakra','Tolvi','Rusk','Elmsted','Gorzan','Vira'];
function resolveLoc(cfg,fr,cs){
  if(cfg.camp&&typeof CAMP!=='undefined'&&CAMP.st&&window.CAMPPLUS&&typeof cmpRaw==='function'){const st=CAMP.st,i=cs??(st.front.length>>1),fx=typeof CFX!=='undefined'?CFX[i]:0,fz=st.front[i];
    let bi=0,bd=1e18;CAMPPLUS.TOWNS.forEach((t,k)=>{const d=(t.x-fx)**2+(t.z-fz)**2;if(d<bd){bd=d;bi=k;}});const T=CAMPPLUS.TOWNS[bi];
    const h0=cmpRaw(T.x,T.z);return{name:T.nm||CTN[bi%CTN.length],pop:T.big?60000:T.n*120,real:false,H:(x,z)=>Math.max(-6,Math.min(60,(cmpRaw(T.x+x,T.z+z+260)-h0)*.8))+noise(x,z)*.15};}
  const G=window.WGEO;if(fr&&G&&G.places&&W.linePt){const mid=fr.sec[(fr.sec.length/2)|0],ll=W.linePt(mid);let best=null,bd=1e18;
    for(const pl of G.places){const d=(pl.lat-ll.lat)**2+((pl.lon-ll.lon)*Math.cos(ll.lat*Math.PI/180))**2;if(d<bd){bd=d;best=pl;}}
    if(best&&bd<1.2){const lat0=best.lat,lon0=best.lon,cl=Math.cos(lat0*Math.PI/180),h0=G.coarse?G.coarse(lat0,lon0):0;
      return{name:best.name,pop:best.pop||5000,real:true,H:(x,z)=>(G.coarse?Math.max(-8,Math.min(80,(G.coarse(lat0-(z+260)/111200,lon0+x/(111200*cl))-h0))):0)+noise(x,z)*.35};}}
  return{name:'the village',pop:3000,real:false,H:noise};}

function man(friend,x,z){const m=soldier(friend?0x4f6a3a:0x7a6a44);m.position.set(x,H(x,z),z);S.sc.add(m);return{m,friend,hp:100,alive:true,cool:1+rn()*2,tgt:null,goal:null,crouch:false,mv:0,sup:0};}

/* ------------------------------------------------------------------ insertion */
function insertion(){const k=S.ins;S.ins_t=0;
  if(k==='APC'||k==='IFV'){const v=vehicle(k,0x4e5a3c);S.sc.add(v);S.carrier={m:v,from:new V3(0,0,700),to:new V3(0,0,170),dur:16};}
  else if(k==='HELO'){const h=helo(0x46503f);S.sc.add(h);S.carrier={m:h,from:new V3(-500,90,700),to:new V3(0,0,170),dur:18};}
  else{const a=plane();S.sc.add(a);S.carrier={m:a,from:new V3(-900,600,250),to:new V3(900,600,250),dur:20,jump:.5};S.chute=null;}
  say(INS[k].toUpperCase()+(S.N[k]?' · '+S.N[k]:'')+(k==='AIR'?' · SPACE TO JUMP':' · SPACE TO SKIP'),5);}
function insertStep(dt){const C=S.carrier,k=S.ins;S.ins_t+=dt;const u=Math.min(1,S.ins_t/C.dur);
  if(k==='AIR'){if(!S.jumped){const p=C.from.clone().lerp(C.to,u);C.m.position.copy(p);C.m.rotation.y=-Math.PI/2;S.pos.copy(p).add(new V3(0,-3,0));S.yaw=-Math.PI/2;
      if(u>=C.jump&&S.keys.Space||u>=.75){S.jumped=true;S.jt=0;S.vel.set(55,0,0);say('JUMP · SPACE OPENS THE PARACHUTE',3);}return;}
    C.m.position.x+=60*dt;S.jt+=dt;
    const g=H(S.pos.x,S.pos.z);if(!S.chute&&(S.keys.Space&&S.jt>2&&S.pos.y-g<520||S.pos.y-g<220)){S.chute=true;const c=new THREE.Mesh(new THREE.SphereGeometry(4,12,6,0,7,0,1.3),new THREE.MeshLambertMaterial({color:0x56603c}));S.sc.add(c);S.chuteM=c;say('CANOPY · STEER WITH WASD',3);}
    if(S.chute){S.vel.y+=(-5.5-S.vel.y)*Math.min(1,dt*2);const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw)),r=new V3(-f.z,0,f.x);let tx=0,tz=0;if(S.keys.KeyW){tx+=f.x*9;tz+=f.z*9;}if(S.keys.KeyS){tx-=f.x*3;tz-=f.z*3;}if(S.keys.KeyA){tx-=r.x*6;tz-=r.z*6;}if(S.keys.KeyD){tx+=r.x*6;tz+=r.z*6;}
      // drift toward your squad's landing area if nothing is pressed
      if(!tx&&!tz){const d=new V3(0-S.pos.x,0,200-S.pos.z);const L=d.length();if(L>5){tx=d.x/L*6;tz=d.z/L*6;}}
      S.vel.x+=(tx-S.vel.x)*Math.min(1,dt);S.vel.z+=(tz-S.vel.z)*Math.min(1,dt);S.chuteM.position.copy(S.pos).add(new V3(0,7,0));}
    else{S.vel.y-=9.81*dt;S.vel.y=Math.max(S.vel.y,-55);S.vel.x*=1-dt*.4;}
    S.pos.addScaledVector(S.vel,dt);if(S.pos.y<=g+1.7){S.pos.y=g+1.7;if(!S.chute&&S.vel.y<-15){hurt(200,'fall');}land();}return;}
  // vehicles and helicopter: ride in the back, look around
  const e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2,p=C.from.clone().lerp(C.to,e);if(k==='HELO'){const g=H(p.x,p.z);p.y=Math.max(g,g+C.from.y*(1-Math.min(1,Math.max(0,(u-.6)/.4))));C.m.userData.rotor.rotation.y+=dt*30;}
  else p.y=H(p.x,p.z);C.m.position.copy(p);C.m.rotation.y=0;S.pos.copy(p).add(new V3(k==='HELO'?1.6:0,k==='HELO'?2:2.2,k==='HELO'?0:1.5));
  // incoming fire near the end
  if(u>.7&&rn()<dt*.6)fx(S.pos.clone().add(new V3((rn()-.5)*20,0,-10-rn()*20)),.6);
  if(u>=1||S.keys.Space&&S.ins_t>1.5){C.m.position.copy(C.to).setY(H(C.to.x,C.to.z));land();}}
function land(){if(S.res)return;S.phase='FIGHT';const C=S.carrier;S.pos.y=H(S.pos.x,S.pos.z)+1.7;if(S.ins!=='AIR'){S.pos.set(C.m.position.x+1.5,0,C.m.position.z+5);S.pos.y=H(S.pos.x,S.pos.z)+1.7;S.yaw=0;}
  S.vel.set(0,0,0);if(S.chuteM){S.sc.remove(S.chuteM);S.chuteM=null;}
  if(S.mission==='DEFEND'){const t=S.trench[(S.trench.length/2)|0];S.pos.set(t.x+2,H(t.x+2,t.z)+1.7,t.z);S.yaw=0;S.us.forEach(u=>u.m.visible=true);S.waveT=12;}
  else S.us.forEach((u,i)=>{const x=S.pos.x+((i%3)-1)*3,z=S.pos.z+3+Math.floor(i/3)*3;u.m.position.set(x,H(x,z),z);u.m.visible=true;});
  if(S.ins==='IFV'){S.ifv={m:C.m,hp:800,side:'F',x:C.m.position.x,z:C.m.position.z,cool:2,alive:true};S.veh.push(S.ifv);}
  else S.leave=C;say(S.mission==='DEFEND'?'HOLD THE TRENCHES BEFORE '+S.loc.name.toUpperCase():'TAKE AND HOLD '+S.loc.name.toUpperCase(),4);}

/* ------------------------------------------------------------------ input */
function bind(){const c=S.cv;c.addEventListener('click',()=>{if(document.pointerLockElement!==c&&c.requestPointerLock)c.requestPointerLock();});
  S.onK=e=>{if(!S)return;S.keys[e.code]=e.type==='keydown';if(e.type!=='keydown')return;e.stopPropagation();
    if(e.code==='Escape'){stop(true,'LEFT');}if(e.code==='KeyR')reload();if(e.code==='KeyC')S.crouch=!S.crouch;if(e.code==='Digit1')swap('pri');if(e.code==='Digit2'&&S.wp.lau.mag)swap('lau');if(e.code==='Digit3')swap('side');if(e.code==='KeyG')grenade();};
  S.onM=e=>{if(!S||document.pointerLockElement!==S.cv)return;const k=S.ads?1/(S.wp[S.w].ads||1):1;S.yaw-=e.movementX*.0022*k;S.pitch=Math.max(-1.45,Math.min(1.45,S.pitch-e.movementY*.0022*k));};
  S.onD=e=>{if(!S)return;if(e.button===0)S.fire=e.type==='mousedown';if(e.button===2)S.ads=e.type==='mousedown';};S.onC=e=>{if(S)e.preventDefault();};S.onR=()=>{if(!S)return;S.cam.aspect=innerWidth/innerHeight;S.cam.updateProjectionMatrix();S.R&&S.R.setSize(innerWidth,innerHeight,false);};
  addEventListener('keydown',S.onK,true);addEventListener('keyup',S.onK,true);addEventListener('mousemove',S.onM);S.cv.addEventListener('mousedown',S.onD);addEventListener('mouseup',S.onD);S.cv.addEventListener('contextmenu',S.onC);addEventListener('resize',S.onR);}
function unbind(){removeEventListener('keydown',S.onK,true);removeEventListener('keyup',S.onK,true);removeEventListener('mousemove',S.onM);removeEventListener('mouseup',S.onD);removeEventListener('resize',S.onR);if(document.pointerLockElement)document.exitPointerLock();}
function swap(w){if(S.w===w)return;S.w=w;S.reload=0;S.cool=.6;}
function reload(){const g=S.wp[S.w];if(S.reload>0||!g.mag||g.cur>=g.mag||g.res<=0)return;S.reload=g.rl;}
function say(t,s){S.msg=t;S.msgT=s||3;}

/* ------------------------------------------------------------------ combat */
const ray=new THREE.Raycaster();
function aimDir(spr){const d=new V3(0,0,-1).applyEuler(new THREE.Euler(S.pitch,S.yaw,0,'YXZ'));if(spr){d.x+=(rn()-.5)*spr;d.y+=(rn()-.5)*spr;d.z+=(rn()-.5)*spr;d.normalize();}return d;}
function shoot(){const g=S.wp[S.w];if(S.reload>0||S.cool>0)return;if(g.cur<=0){reload();return;}g.cur--;S.shots++;
  if(S.w==='lau'){S.cool=1;const d=aimDir(.004);const air=g.air?(S.eheli&&S.eheli.alive?S.eheli:S.drones.filter(x=>x.alive&&x.side==='E'&&x.k!=='FPV').sort((a,b)=>a.m.position.distanceTo(S.pos)-b.m.position.distanceTo(S.pos))[0]):null;
  S.rk.push({p:S.pos.clone().add(d.clone().multiplyScalar(1)),v:d.multiplyScalar(g.spd),t:0,g,own:true,tgt:g.air?air:(g.guided?pickVeh():null)});if(g.cur<=0)reload();return;}
  S.cool=60/g.rpm;if(!g.auto)S.fire=false;const mv=S.vel.length()>2?1.8:1,spr=g.spr*(S.ads?.35:1)*(S.crouch?.7:1)*mv;let r=null;for(let i=0;i<(g.pel||1);i++)r=hitscan(S.pos,aimDir(g.pel?g.spr:spr),g.dmg,true)||r;
  S.kick=(S.kick||0)+(g.dmg>60?.03:.008);if(g.cur<=0)reload();return r;}
function pickVeh(){let b=null,bd=1e9;for(const v of S.veh)if(v.alive&&v.side==='E'){const d=Math.hypot(v.x-S.pos.x,v.z-S.pos.z);if(d<bd){bd=d;b=v;}}return b;}
function hitscan(o,d,dmg,own){S.sc.updateMatrixWorld();ray.set(o,d);ray.far=900;const targets=[...S.solid];const owner=new Map();
  for(const u of[...S.us,...S.them])if(u.alive)u.m.traverse(x=>{if(x.isMesh&&x.userData.part){targets.push(x);owner.set(x,u);}});
  if(own)for(const dr of S.drones){if(!dr.alive)continue;const c=dr.m.position,t=c.clone().sub(o).dot(d);if(t<0||t>900)continue;const cl=o.clone().addScaledVector(d,t);
    if(cl.distanceTo(c)<(dr.k==='FPV'?.6:dr.k==='OWA'?1.8:4)){const wall=ray.intersectObjects(S.solid,false)[0];if(!wall||wall.distance>t){hitDrone(dr,dmg,true);S.hits++;mark(false);return dr;}}}
  const hs=ray.intersectObjects(targets,false);if(!hs.length)return null;const h=hs[0],u=owner.get(h.object);
  if(!u){fx(h.point,.15);return null;}
  const part=h.object.userData.part,k=part==='head'?2.6:part==='legs'?.7:1;hitMan(u,dmg*k,own);if(own){S.hits++;mark(part==='head');}return u;}
function hitMan(u,dmg,own){if(!u.alive)return;u.hp-=dmg;u.sup=2;if(u.hp<=0){u.alive=false;u.m.rotation.x=-Math.PI/2;u.m.position.y+=.3;if(u.friend){S.lost++;if(own){say('FRIENDLY FIRE',3);S.ff=(S.ff||0)+1;}}else if(own)S.kills++;}}
function mark(hd){const e=document.getElementById('iHit');if(e){e.style.color=hd?'#ff5a4a':'#fff';e.style.opacity=1;clearTimeout(mark.t);mark.t=setTimeout(()=>e.style.opacity=0,120);}}
function hurt(d,why){const torso=why==='bullet';S.hp-=d*(torso?S.arm.k:1);const e=document.getElementById('iDmg');if(e){e.style.opacity=.8;setTimeout(()=>e.style.opacity=0,250);}if(S.hp<=0)end('KIA');}
function grenade(){if(S.gren<=0||S.phase!=='FIGHT')return;S.gren--;const d=aimDir(0);S.gnades.push({p:S.pos.clone(),v:d.multiplyScalar(18).add(new V3(0,4,0)),t:0,own:true});}
function blast(p,r,dmg,own){fx(p,1.4);for(const u of[...S.us,...S.them]){if(!u.alive)continue;const d=u.m.position.distanceTo(p);if(d<r)hitMan(u,dmg*(1-d/r),own);}
  for(const v of S.veh){if(!v.alive)continue;const d=Math.hypot(v.x-p.x,v.z-p.z);if(d<4)hitVeh(v,dmg,own);}
  const d=S.pos.distanceTo(p);if(d<r)hurt(dmg*(1-d/r)*.8,'blast');}
function hitVeh(v,dmg,own){v.hp-=dmg;if(v.hp<=0&&v.alive){v.alive=false;fx(v.m.position.clone().setY(v.m.position.y+2),3);v.m.traverse(x=>{if(x.isMesh)x.material=new THREE.MeshLambertMaterial({color:0x222018});});if(own&&v.side==='E'){S.kills++;S.vk=(S.vk||0)+1;say('VEHICLE DESTROYED',2);}}}
const fxL=[];function fx(p,s){const m=new THREE.Mesh(new THREE.SphereGeometry(s,8,6),new THREE.MeshBasicMaterial({color:0xffb050,transparent:true,opacity:.9}));m.position.copy(p);S.sc.add(m);fxL.push({m,t:0});}

function ai(u,dt,foes){if(!u.alive)return;u.cool-=dt;
  if(u.cool<=0)for(const dr of S.drones){if(!dr.alive||(dr.side==='F')===u.friend||dr.k==='MALE')continue;if(dr.m.position.distanceTo(u.m.position)<60){u.cool=.4;if(rn()<.12)hitDrone(dr,30,false);break;}}u.sup=Math.max(0,u.sup-dt);const P=u.m.position;
  // target: nearest live foe in 320 m (the player counts as a friendly)
  if(!u.tgt||!u.tgt.alive||rn()<dt*.3){let b=null,bd=320;for(const f of foes){if(!f.alive)continue;const d=f.m.position.distanceTo(P);if(d<bd){bd=d;b=f;}}
    if(!u.friend&&S.phase==='FIGHT'){const d=S.pos.distanceTo(P);if(d<bd*1.1)b={alive:true,player:true,m:{position:S.pos}};}u.tgt=b;}
  const goal=S.mission==='DEFEND'?(u.friend?u.slot:new V3((u.ox??=(rn()-.5)*300),0,S.trZ)):u.friend?(S.phase==='FIGHT'?S.village.clone().add(new V3((u.ox??=(rn()-.5)*30),0,(u.oz??=(rn()-.5)*30)+(S.hold>0?0:40))):null):S.village.clone().add(new V3((u.ox??=(rn()-.5)*80),0,(u.oz??=(rn()-.5)*80)));
  let mv=0;if(goal&&(!u.tgt||u.sup>0&&u.friend)){const d=goal.clone().sub(P).setY(0);if(d.length()>3){d.normalize();P.x+=d.x*2.6*dt;P.z+=d.z*2.6*dt;mv=1;u.m.rotation.y=Math.atan2(-d.x,-d.z);}}
  if(u.tgt){const tp=u.tgt.m.position,d=tp.clone().sub(P);u.m.rotation.y=Math.atan2(-d.x,-d.z);const L=d.length();
    if(L>60&&!mv&&u.friend&&S.phase==='FIGHT'&&S.mission!=='DEFEND'){d.setY(0).normalize();P.x+=d.x*2*dt;P.z+=d.z*2*dt;}
    if(u.cool<=0){u.cool=.5+rn()*1.2;const o=P.clone().setY(P.y+1.5);
      const acc=Math.max(.04,.55-L/500)*(u.sup>0?.5:1)*(u.tgt.player?(S.crouch?.6:1)*(S.vel.length()>3?.6:1):1);
      if(los(o,tp.clone().setY(tp.y+(u.tgt.player?0:1.3)))){if(rn()<acc){if(u.tgt.player)hurt(14+rn()*10,'bullet');else hitMan(u.tgt,22+rn()*14,false);}
        else if(u.tgt.player&&L<120)S.near=.3;}}}
  const gy=H(P.x,P.z),top=collide(P,P.y,P.y+1.7,.35);P.y=Math.max(gy,top>-1e8?top:gy);}
function collide(P,feet,head,r){let top=-1e9;for(const b of S.blds){if(P.x<b.x0-r||P.x>b.x1+r||P.z<b.z0-r||P.z>b.z1+r)continue;
    if(b.y1<=feet+.45){if(P.x>b.x0-.05&&P.x<b.x1+.05&&P.z>b.z0-.05&&P.z<b.z1+.05)top=Math.max(top,b.y1);continue;}if(b.y0>=head)continue;
    const dx0=P.x-(b.x0-r),dx1=(b.x1+r)-P.x,dz0=P.z-(b.z0-r),dz1=(b.z1+r)-P.z,m=Math.min(dx0,dx1,dz0,dz1);if(m===dx0)P.x=b.x0-r;else if(m===dx1)P.x=b.x1+r;else if(m===dz0)P.z=b.z0-r;else P.z=b.z1+r;}return top;}
function los(a,b){const d=b.clone().sub(a),L=d.length();ray.set(a,d.normalize());ray.far=L;return ray.intersectObjects(S.solid,false).length===0;}

function step(dt){if(!S||S.res)return;S.t+=dt;S.msgT-=dt;S.sc.updateMatrixWorld();
  if(S.phase==='INSERT'){insertStep(dt);}
  else{// player movement
    const g=S.wp[S.w],f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw)),r=new V3(-f.z,0,f.x);let sp=(S.keys.ShiftLeft&&!S.ads?6.2:3.4)*(S.crouch?.5:1)*S.arm.spd*(g.slow||1)*(S.ads?.6:1);
    const w=new V3();if(S.keys.KeyW)w.add(f);if(S.keys.KeyS)w.sub(f);if(S.keys.KeyD)w.add(r);if(S.keys.KeyA)w.sub(r);if(w.lengthSq())w.normalize().multiplyScalar(sp);
    S.vel.x=w.x;S.vel.z=w.z;const gr=H(S.pos.x,S.pos.z),eye=S.crouch?1.1:1.7;if(S.vel.y===0&&S.keys.Space&&!S.crouch)S.vel.y=4.2;S.vel.y-=9.81*dt;S.pos.addScaledVector(S.vel,dt);
    {const feet=S.pos.y-eye,top=collide(S.pos,feet,S.pos.y+.1,.3),fl=Math.max(gr,top);if(S.pos.y<fl+eye){S.pos.y=Math.min(fl+eye,S.pos.y+Math.max(.0,fl+eye-S.pos.y));S.vel.y=0;}}
    S.pos.x=Math.max(-1150,Math.min(1150,S.pos.x));S.pos.z=Math.max(-1150,Math.min(1150,S.pos.z));
    S.cool-=dt;if(S.reload>0){S.reload-=dt;if(S.reload<=0){const n=Math.min(g.mag-g.cur,g.res);g.cur+=n;g.res-=n;}}if(S.fire)shoot();S.kick=Math.max(0,(S.kick||0)-dt*.25);
    if(S.leave){const C=S.leave;C.t=(C.t||0)+dt;if(S.ins==='HELO'){C.m.position.y+=dt*12;C.m.position.z+=dt*30*Math.min(1,C.t/4);C.m.userData.rotor.rotation.y+=dt*30;}else C.m.position.z+=dt*9;if(C.t>30){S.sc.remove(C.m);S.leave=null;}}
    // objective: hold the village with no enemy close
    if(S.mission==='DEFEND')defendStep(dt);else{const inZone=Math.hypot(S.pos.x-S.village.x,S.pos.z-S.village.z)<25,enemyNear=S.them.some(u=>u.alive&&u.m.position.distanceTo(S.village)<45);
    if(inZone&&!enemyNear){S.hold+=dt;if(S.hold>=30)end('WON');}else S.hold=Math.max(0,S.hold-dt*.5);
    S.waveT-=dt;if(S.waveT<=0&&S.them.filter(u=>u.alive).length<6){S.waveT=80;const n=4;for(let i=0;i<n;i++)S.them.push(man(false,S.village.x+(rn()-.5)*60,S.village.z-160-rn()*40));say('ENEMY REINFORCEMENTS FROM THE NORTH',3);}}
    S.heliT-=dt;if(S.heliT<=0&&!S.eheli){const h=helo(0x6a5a3a);h.position.set(400,80,-500);S.sc.add(h);S.eheli={m:h,hp:500,alive:true,cool:3,t:0};say('ENEMY HELICOPTER',3);S.heliT=1e9;}}
  droneStep(dt);airStep(dt);vehStep(dt);
  // AI
  const all=[...S.us,...S.them];for(const u of S.us)ai(u,dt,S.them);for(const u of S.them)ai(u,dt,S.us);
  for(const v of S.veh){if(!v.alive)continue;v.cool-=dt;const foes=v.side==='F'?S.them:S.us;let b=null,bd=500;for(const f of foes){if(!f.alive)continue;const d=f.m.position.distanceTo(v.m.position);if(d<bd){bd=d;b=f.m.position;}}
    if(v.side==='E'&&S.phase==='FIGHT'&&S.pos.distanceTo(v.m.position)<bd)b=S.pos;
    if(b&&v.cool<=0){v.cool=v.side==='F'?1.2:2.5;const o=v.m.position.clone().setY(v.m.position.y+2.8);if(los(o,b.clone().setY(b.y+.8))){const hp=b.clone().add(new V3((rn()-.5)*6,0,(rn()-.5)*6));blast(hp,4,90,false);}}}
  if(S.eheli&&S.eheli.alive){const h=S.eheli;h.t+=dt;h.m.userData.rotor.rotation.y+=dt*30;const c=S.village;h.m.position.set(c.x+Math.cos(h.t*.15)*220,H(c.x,c.z)+70,c.z+Math.sin(h.t*.15)*220);h.cool-=dt;
    if(h.cool<=0&&S.phase==='FIGHT'){h.cool=4;const tg=rn()<.4?S.pos.clone():(S.us.find(u=>u.alive)||{m:{position:S.pos}}).m.position.clone();blast(tg.add(new V3((rn()-.5)*12,0,(rn()-.5)*12)),6,110,false);}}
  // projectiles
  for(let i=S.rk.length-1;i>=0;i--){const k=S.rk[i];k.t+=dt;if(k.tgtP&&!k.tgt){const d=k.tgtP.clone().sub(k.p).normalize().multiplyScalar(k.g.spd);k.v.lerp(d,Math.min(1,dt*4));}
    if(k.tgt&&k.tgt.alive){const tp=k.tgt.m.position.clone().setY(k.tgt.m.position.y+1.5),d=tp.sub(k.p).normalize().multiplyScalar(k.g.spd);k.v.lerp(d,Math.min(1,dt*3));}
    else k.v.y-=(k.g.air?0:3)*dt;k.p.addScaledVector(k.v,dt);let hit=null;
    for(const v of S.veh)if(v.alive&&Math.hypot(v.x-k.p.x,v.z-k.p.z)<3.5&&k.p.y<v.m.position.y+3.5){hitVeh(v,k.g.dmg,k.own);hit=1;}
    for(const dr of S.drones)if(dr.alive&&k.own&&k.p.distanceTo(dr.m.position)<(dr.k==='MALE'?10:5)){hitDrone(dr,k.g.dmg,true);hit=1;}
    if(S.eheli&&S.eheli.alive&&k.p.distanceTo(S.eheli.m.position)<6){S.eheli.hp-=k.g.dmg;hit=1;if(S.eheli.hp<=0){S.eheli.alive=false;fx(S.eheli.m.position,4);S.sc.remove(S.eheli.m);if(k.own){S.kills++;say('HELICOPTER DOWN',3);}}}
    if(hit||k.p.y<H(k.p.x,k.p.z)||k.t>8){blast(k.p,5,hit?0:120,k.own);S.rk.splice(i,1);}}
  for(let i=S.gnades.length-1;i>=0;i--){const n=S.gnades[i];n.t+=dt;n.v.y-=9.81*dt;n.p.addScaledVector(n.v,dt);const g=H(n.p.x,n.p.z);if(n.p.y<g+.1){n.p.y=g+.1;n.v.multiplyScalar(.3);n.v.y=Math.abs(n.v.y);}if(n.t>3.5){blast(n.p,9,160,n.own);S.gnades.splice(i,1);}}
  for(let i=fxL.length-1;i>=0;i--){const e=fxL[i];e.t+=dt;e.m.scale.setScalar(1+e.t*3);e.m.material.opacity=Math.max(0,.9-e.t*2);if(e.t>.5){S.sc.remove(e.m);fxL.splice(i,1);}}
  if(S.us.every(u=>!u.alive)&&S.phase==='FIGHT'&&S.t>5&&rn()<dt*.05)say('YOUR SQUAD IS DOWN · YOU ARE ALONE',3);}

function draw(){if(!S||!S.R)return;S.cam.position.copy(S.pos);S.cam.rotation.set(S.pitch+(S.kick||0),S.yaw,0,'YXZ');const g=S.wp[S.w];const fov=S.ads&&S.phase==='FIGHT'?70/(g.ads||1):70;if(Math.abs(S.cam.fov-fov)>.1){S.cam.fov+=(fov-S.cam.fov)*.3;S.cam.updateProjectionMatrix();}
  const vk=S.w==='lau'?'tube':g.vm||'rifle',scoped=g.scope&&S.ads&&S.phase==='FIGHT';for(const k in S.vms){const m=S.vms[k];m.visible=k===vk&&S.phase==='FIGHT'&&!scoped;}const cur=S.vms[vk];if(cur)cur.position.set(S.ads?0:.2,S.ads?-.12:-.2,-.45+(S.kick||0)*2+(S.reload>0?.15:0));if(cur)cur.rotation.x=S.reload>0?-.6:0;
  {const sc2=document.getElementById('iScope');if(sc2)sc2.style.display=scoped?'block':'none';}S.flag.material.color.set(S.hold>0?0x5be1ff:0xffe14a);S.R.render(S.sc,S.cam);
  const $=id=>document.getElementById(id);const live=S.us.filter(u=>u.alive).length,elive=S.them.filter(u=>u.alive).length,dv=Math.round(Math.hypot(S.pos.x-S.village.x,S.pos.z-S.village.z));
  const nm=S.w==='pri'?(S.cfg.pri==='RIFLE'&&S.N.RIFLE?S.N.RIFLE:g.n):S.w==='lau'?((S.N[S.cfg.lau]||'')+' '+g.n):g.n;
  const brg=((Math.atan2(S.village.x-S.pos.x,-(S.village.z-S.pos.z))*180/Math.PI+360)%360),hd=((-S.yaw*180/Math.PI)%360+360)%360;
  $('iTop').innerHTML=S.phase==='INSERT'?esc(INS[S.ins].toUpperCase()+' · '+S.loc.name.toUpperCase()):S.mission==='DEFEND'?'HOLD THE TRENCHES · '+esc(S.loc.name.toUpperCase())+' · WAVE '+S.wave+'/4'+(S.wave<4?' · NEXT IN '+Math.max(0,Math.round(S.waveT))+' s':'')+' · HDG '+Math.round(hd)+'°<br><span style="font-size:11px;color:#9fb">DEFENDERS '+live+'/'+S.us.length+' · ENEMY '+elive+' · ARMOUR '+S.veh.filter(v=>v.alive&&v.side==='E').length+' · KILLS '+S.kills+'</span>':esc(S.loc.name.toUpperCase())+' · OBJECTIVE '+dv+' m · '+Math.round(brg)+'° · HDG '+Math.round(hd)+'°'+(S.hold>0?' · HOLDING '+Math.round(S.hold)+'/30 s':'')+'<br><span style="font-size:11px;color:#9fb">SQUAD '+live+'/'+S.us.length+' · ENEMY SEEN '+elive+' · KILLS '+S.kills+'</span>';
  $('iBL').innerHTML='HEALTH '+Math.max(0,Math.round(S.hp))+'<br><span style="font-size:11px">'+esc(S.arm.n)+(S.crouch?' · CROUCHED':'')+'</span>';
  $('iBR').innerHTML=esc(nm)+'<br><b style="font-size:18px">'+(g.mag?(S.reload>0?'RELOADING':g.cur+' / '+g.res):'—')+'</b><br><span style="font-size:11px">GRENADES '+S.gren+'</span>';
  $('iMsg').textContent=S.msgT>0?S.msg:'';$('iX').style.display=S.phase==='FIGHT'&&!S.ads?'block':'none';}
function loop(){if(!S){loop.on=false;return;}requestAnimationFrame(loop);const n=performance.now(),dt=Math.min(.05,Math.max(0,(n-loop.last)/1000));loop.last=n;if(dt>0)step(dt);draw();}

/* ------------------------------------------------------------------ v379: tanks, the trench fight, the air war overhead */
// a main battle tank, named from the side's equipment table; Western turrets boxy, Russian / Soviet-pattern low and round
function tank(side,col){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:col}),dk=new THREE.MeshLambertMaterial({color:0x1d1f1c}),red=side==='R';
  const hull=new THREE.Mesh(new THREE.BoxGeometry(3.6,1.3,7.6),m);hull.position.y=1.2;g.add(hull);for(const s of[-1,1]){const tr=new THREE.Mesh(new THREE.BoxGeometry(.7,1.1,8),dk);tr.position.set(s*1.9,.6,0);g.add(tr);}
  const tu=red?new THREE.Mesh(new THREE.SphereGeometry(1.6,12,6,0,6.3,0,1.3),m):new THREE.Mesh(new THREE.BoxGeometry(3,1,4.2),m);tu.position.set(0,red?1.85:2.35,red?.4:.6);g.add(tu);
  const gun=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,5.6,8),dk);gun.rotation.x=Math.PI/2;gun.position.set(0,2.45,-3.6);g.add(gun);g.userData.tu=tu;g.userData.gun=gun;return g;}
function wave(){S.wave++;const n=Math.round((6+S.wave*2)*S.ePow);for(let i=0;i<n;i++){const u=man(false,(rn()-.5)*320,S.trZ-520-rn()*120);S.them.push(u);}
  const nt=Math.min(3,1+(S.wave>>1));for(let i=0;i<nt;i++){const x=(rn()-.5)*240,z=S.trZ-600-rn()*80,m=tank(S.en,0x6a5a3a);m.position.set(x,H(x,z),z);S.sc.add(m);S.veh.push({m,hp:1100,side:'E',x,z,cool:5,alive:true,tank:1,mv:1,stop:S.trZ-150-rn()*80,name:S.EN.MBT||'main battle tank'});}
  {const x=(rn()-.5)*200,z=S.trZ-650,v=vehicle('EIFV',0x6a5a3a);v.position.set(x,H(x,z),z);S.sc.add(v);S.veh.push({m:v,hp:600,side:'E',x,z,cool:3,alive:true,mv:1,stop:S.trZ-220});}
  say('WAVE '+S.wave+' · '+n+' INFANTRY, '+nt+' '+(S.EN.MBT||'TANKS').toUpperCase()+(nt>1?' TANKS':''),4);}
function defendStep(dt){S.waveT-=dt;if(S.waveT<=0&&S.wave<4){wave();S.waveT=75;}
  const eAlive=S.them.filter(u=>u.alive).length+S.veh.filter(v=>v.alive&&v.side==='E').length;
  // the trench is lost when enemy infantry stand in it and none of yours do
  const inT=u=>Math.abs(u.m.position.z-S.trZ)<6&&Math.abs(u.m.position.x)<175;const eIn=S.them.filter(u=>u.alive&&inT(u)).length,fIn=S.us.filter(u=>u.alive&&inT(u)).length+(Math.abs(S.pos.z-S.trZ)<6?1:0);
  if(eIn>=3&&fIn===0)end('LOST');if(S.wave>=4&&eAlive===0)end('HELD');S.hold=S.wave;}
function vehStep(dt){for(const v of S.veh){if(!v.alive)continue;if(v.mv&&v.z<v.stop){v.z+=3.2*dt;v.m.position.set(v.x,H(v.x,v.z),v.z);}
    if(v.tank&&v.m.userData.tu){const tg=v.side==='E'?S.pos:(pickVeh()||{m:{position:new V3(0,0,S.trZ-400)}}).m.position;v.m.userData.tu.rotation.y=Math.atan2(-(tg.x-v.x),-(tg.z-v.z))-v.m.rotation.y;}
    // tank guns: anti-armour against vehicles, high explosive against men and trenches
    if(v.tank&&v.cool<=.05){const foes=S.veh.filter(o=>o.alive&&o.side!==v.side);if(foes.length&&rn()<.6){const o=foes[(rn()*foes.length)|0];if(los(v.m.position.clone().setY(v.m.position.y+2.5),o.m.position.clone().setY(o.m.position.y+1.5))){if(rn()<.45)hitVeh(o,380,false);else fx(o.m.position.clone().add(new V3((rn()-.5)*8,1,(rn()-.5)*8)),1);v.cool=6;}}}}}
// fighters and attack aircraft of both sides over the battle: pairs that turn and fight, shootdowns, close air support
function jet(side){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:side==='F'?0x7b8790:0x8f8a78});const f=new THREE.Mesh(new THREE.ConeGeometry(.9,16,8),m);f.rotation.x=-Math.PI/2;g.add(f);
  const w=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new V3(0,0,-3),new V3(-6,0,4),new V3(6,0,4)]),m);w.material.side=THREE.DoubleSide;g.add(w);const t=new THREE.Mesh(new THREE.BoxGeometry(.2,3,3),m);t.position.set(0,1.5,6.5);g.add(t);S.sc.add(g);return g;}
function airStep(dt){if(S.phase!=='FIGHT')return;S.airT-=dt;const c=S.village;
  if(S.airT<=0&&S.air.filter(a=>a.alive).length<6){S.airT=10+rn()*14;for(const side of['F','E']){if(rn()<.75){const m=jet(side);const a={m,side,alive:true,t:rn()*6,r:900+rn()*900,y:1200+rn()*1600,w:(.05+rn()*.05)*(rn()<.5?-1:1),cx:c.x+(rn()-.5)*800,cz:c.z+(rn()-.5)*800,name:side==='F'?(S.N.FTR||'fighter'):(S.EN.FTR||'fighter')};S.air.push(a);}}}
  for(let i=S.air.length-1;i>=0;i--){const a=S.air[i];a.t+=dt;const P=a.m.position;
    if(a.alive){const th=a.t*a.w*6;P.set(a.cx+Math.cos(th)*a.r,H(a.cx,a.cz)+a.y+Math.sin(a.t*.7)*120,a.cz+Math.sin(th)*a.r);a.m.rotation.set(0,-th+(a.w>0?Math.PI:0),a.w>0?-.6:.6);
      if(a.cas&&a.t>a.cas.t){a.cas=null;}
      // a fight: now and then one side downs the other
      if(rn()<dt*.02){const foes=S.air.filter(b=>b.alive&&b.side!==a.side);if(foes.length){const b=foes[0];b.alive=false;b.vy=0;S.kills+=0;say((b.side==='E'?'ENEMY ':'OUR ')+b.name.toUpperCase()+' SHOT DOWN OVERHEAD',2.5);}}
      // close air support: our attack aircraft on enemy armour, theirs on our trench
      if(rn()<dt*.012){const tg=a.side==='F'?S.veh.find(v=>v.alive&&v.side==='E'):(S.mission==='DEFEND'?{m:{position:S.trench[(rn()*S.trench.length)|0]}}:S.us.find(u=>u.alive));
        if(tg){const tp=tg.m.position.clone();blast(tp.clone().add(new V3((rn()-.5)*10,0,(rn()-.5)*10)),14,a.side==='F'?0:180,a.side==='F');if(a.side==='F'&&tg.hp!=null)hitVeh(tg,700,false);
          say((a.side==='F'?'CLOSE AIR SUPPORT · '+(S.N.ATK||'our attack aircraft'):'ENEMY AIR STRIKE · '+(S.EN.ATK||'attack aircraft')).toUpperCase(),2.5);}}
      if(a.t>90){S.sc.remove(a.m);S.air.splice(i,1);}}
    else{a.vy=(a.vy||0)-9.8*dt;P.y+=a.vy*dt*3;a.m.rotation.x+=dt;if(rn()<.5)fx(P.clone(),2.5);if(P.y<H(P.x,P.z)){fx(new V3(P.x,H(P.x,P.z)+5,P.z),12);S.sc.remove(a.m);S.air.splice(i,1);}}}}

/* ------------------------------------------------------------------ drones */
// FPV: small quadcopters that dive on almost anything (soldiers, vehicles, you); shoot them down.
// One-way attack drones (Shahed-136 / Geran-2 type for REDFOR): slow, loud, fly over toward the rear and strike.
// Loitering armed drones (MQ-9 Reaper type, or the side's own, from its equipment table): circle high, strike with a missile.
function dName(side,k){const a3=side==='F'?S.cfg.a3:S.enA3,E=EQ(a3||''),red=(side==='F'?S.me:S.en)==='R';
  return k==='FPV'?'FPV attack drone':k==='OWA'?(red?'Shahed-136 / Geran-2 type one-way attack drone':'one-way attack drone'):(first(E.UAVA)||(red?'Orion':'MQ-9 Reaper'))+' armed drone';}
function dMesh(k,col){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:col});
  if(k==='FPV'){const b=new THREE.Mesh(new THREE.BoxGeometry(.25,.08,.25),m);g.add(b);for(const[x,z]of[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]]){const r=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.01,8),new THREE.MeshBasicMaterial({color:0x111111}));r.position.set(x,.05,z);g.add(r);}}
  else if(k==='OWA'){const b=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,3.5,8),m);b.rotation.x=Math.PI/2;g.add(b);const w=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new V3(0,0,-1.6),new V3(-1.25,0,1.4),new V3(1.25,0,1.4)]),m);w.material.side=THREE.DoubleSide;g.add(w);}
  else{const b=new THREE.Mesh(new THREE.CylinderGeometry(.5,.35,11,8),m);b.rotation.x=Math.PI/2;g.add(b);const w=new THREE.Mesh(new THREE.BoxGeometry(20,.15,1),m);g.add(w);const t=new THREE.Mesh(new THREE.BoxGeometry(3,.1,.6),m);t.position.set(0,.6,5);t.rotation.z=.7;g.add(t);}
  g.traverse(o=>{if(o.isMesh)o.userData.part='drone';});S.sc.add(g);return g;}
function spawnDrone(k,side){const red=(side==='F'?S.me:S.en)==='R',col=k==='FPV'?0x333333:red?0x8a8a7a:0x9aa0a6;const m=dMesh(k,col);const v=S.village;
  const from=side==='E'?new V3(v.x+(rn()-.5)*300,0,v.z-500):new V3((rn()-.5)*200,0,500);
  from.y=H(from.x,from.z)+(k==='FPV'?40:k==='OWA'?150:1500);m.position.copy(from);
  const d={k,side,m,hp:k==='FPV'?10:k==='OWA'?60:300,alive:true,t:0,cool:k==='MALE'?12:0,name:dName(side,k),spd:k==='FPV'?32:k==='OWA'?50:45};S.drones.push(d);
  if(side==='E')say((k==='FPV'?'FPV DRONE INBOUND':k==='OWA'?'ONE-WAY ATTACK DRONE OVERHEAD':'ARMED DRONE OVERHEAD').toUpperCase(),2.5);return d;}
function droneTarget(d){const foes=d.side==='E'?S.us.filter(u=>u.alive).map(u=>u.m.position):S.them.filter(u=>u.alive).map(u=>u.m.position);
  for(const v of S.veh)if(v.alive&&v.side!==d.side)foes.push(v.m.position);if(d.side==='E'&&S.phase==='FIGHT')foes.push(S.pos);if(!foes.length)return null;
  let b=null,bd=1e12;for(const f of foes){const x=f.distanceTo(d.m.position)*(f===S.pos?.7:1);if(x<bd){bd=x;b=f;}}return b;}
function droneStep(dt){if(S.phase!=='FIGHT')return;S.dT-=dt;
  if(S.dT<=0){S.dT=14+rn()*16;const r=rn();spawnDrone(r<.6?'FPV':r<.85?'OWA':'MALE',rn()<.72?'E':'F');}
  for(let i=S.drones.length-1;i>=0;i--){const d=S.drones[i],P=d.m.position;d.t+=dt;if(!d.alive){S.sc.remove(d.m);S.drones.splice(i,1);continue;}
    if(d.k==='FPV'){const tg=droneTarget(d);if(!tg){d.alive=false;continue;}const dir=tg.clone().add(new V3(0,tg===S.pos?-.6:1,0)).sub(P),L=dir.length();
      // weave on the approach, then dive
      dir.normalize();if(L>30)dir.x+=Math.sin(d.t*3)*.3;P.addScaledVector(dir.normalize(),d.spd*dt);d.m.lookAt(tg);if(L<2.2){blast(P.clone(),7,170,d.side==='F');d.alive=false;}}
    else if(d.k==='OWA'){const tz=d.side==='E'?700:-900;P.z+=(tz>P.z?1:-1)*d.spd*dt;P.y=Math.max(P.y-dt*4,H(P.x,P.z)+60);d.m.rotation.y=tz>P.z?Math.PI:0;
      if(Math.abs(P.z-tz)<20||d.t>40){blast(new V3(P.x,H(P.x,P.z),P.z),12,250,false);fx(new V3(P.x,H(P.x,P.z)+3,P.z),5);d.alive=false;}}
    else{const c=S.village;P.set(c.x+Math.cos(d.t*.05)*900,H(c.x,c.z)+1500,c.z+Math.sin(d.t*.05)*900);d.m.rotation.y=-d.t*.05;d.cool-=dt;
      if(d.cool<=0){d.cool=18+rn()*8;const tg=droneTarget(d);if(tg){const tp=tg.clone();S.rk.push({p:P.clone(),v:tp.clone().sub(P).normalize().multiplyScalar(280),t:0,g:{spd:280,dmg:500,guided:1},own:d.side==='F',tgtP:tp});if(d.side==='E')say('MISSILE LAUNCH FROM ARMED DRONE',2);}}
      if(d.t>200)d.alive=false;}}}
function hitDrone(d,dmg,own){d.hp-=dmg;if(d.hp<=0&&d.alive){d.alive=false;fx(d.m.position.clone(),d.k==='FPV'?1:3);if(own&&d.side==='E'){S.dk=(S.dk||0)+1;say(d.name.toUpperCase()+' DOWN',2);}}}

/* ------------------------------------------------------------------ end */
const TTL=r=>({WON:'OBJECTIVE HELD',HELD:'TRENCHES HELD',LOST:'TRENCHES LOST',KIA:'KILLED IN ACTION'}[r]||'WITHDRAWN');
function end(r){if(!S||S.res)return;S.res=r;const st=S.cfg.camp?null:W.st,p=S.cfg.camp?country(S.cfg):st&&st.c[S.cfg.a3];let txt='';
  if((r==='WON'||r==='HELD')&&S.fr){const f=S.fr,mid=f.sec[(f.sec.length/2)|0],mine=st.c[f.a].side===S.me;mid.off+=mine?.6:-.6;}
  txt=(r==='WON'?'Your squad takes and holds '+S.loc.name+'.':r==='HELD'?'The trenches before '+S.loc.name+' hold against '+S.wave+' waves.':r==='LOST'?'The enemy takes the trenches before '+S.loc.name+'.':r==='KIA'?'You are killed in action.':'You withdraw from the fight.')+' Enemy killed by you: '+S.kills+(S.vk?' (vehicles '+S.vk+')':'')+'; your squad lost '+S.lost+' of 6.'+(S.ff?' Friendly fire: '+S.ff+'.':'')+(S.dk?' Drones you shot down: '+S.dk+'.':'');
  if(st)W.emit('INFANTRY',{e:[S.cfg.a3],txt:(p?p.n+': ':'')+txt});
  if(S.cfg.camp&&typeof CAMP!=='undefined'&&CAMP.st&&S.cs!=null){const C=CAMP.st,i=S.cs,ms=0;   // side 0 is always the player's side in the campaign
    // a win pushes the sector toward the enemy (the player's side advances toward -z) and wears down its units there; a loss the other way
    if(r==='WON'||r==='HELD'){C.front[i]-=r==='HELD'?800:1500;for(const u of C.units)if(!u.dead&&u.i===i&&u.s!==ms)u.hp=Math.max(5,(u.hp||100)-15);}
    else if(r==='KIA'){for(const u of C.units)if(!u.dead&&u.i===i&&u.s===ms){u.hp=Math.max(5,(u.hp||100)-5);break;}}
    CAMP.log('Infantry, sector '+(i+1)+': '+txt,(r==='WON'||r==='HELD')?'b':'r');try{CAMP.save();}catch(e){}}
  const ws=window.WSORTIE&&WSORTIE.WS;if(ws&&ws.kills)ws.kills.gnd+=S.kills;say(TTL(r),4);
  const d=document.createElement('div');d.className='u2m';d.id='u2m';d.style.zIndex=9995;d.innerHTML='<div class="bx"><h2>INFANTRY DEBRIEF — '+TTL(r)+'</h2><div>'+esc(txt)+'</div>'+
    '<div class="row"><span>Shots / hits</span><b>'+S.shots+' / '+S.hits+'</b></div><div class="row"><span>Insertion</span><b>'+esc(INS[S.ins])+'</b></div><div class="row"><span>Time</span><b>'+Math.round(S.t)+' s</b></div>'+
    (r==='WON'&&(S.fr||S.cfg.camp)?'<div class="muted">The front line in this sector moves forward a little.</div>':'')+'<div style="margin-top:14px;text-align:right"><button class="go" data-iend="1">CONTINUE</button></div></div>';document.body.appendChild(d);
  d.querySelector('[data-iend]').onclick=()=>{d.remove();stop(false);};if(document.pointerLockElement)document.exitPointerLock();}
function stop(early,why){if(!S)return;if(early&&!S.res){end(why||'LEFT');return;}unbind();S.cv.remove();S.hud.remove();try{S.R&&S.R.dispose();}catch(e){}if(typeof game!=='undefined')game.paused=S0.paused;S=null;}
window.INFANTRY={ROLE,spawnDrone,K,PRI,LAU,ARM,INS,kitMenu,start,step:(dt,n)=>{for(let i=0;i<(n||1);i++)step(dt);},get S(){return S;},stop,end,shoot,grenade,land,v:377};
})();
