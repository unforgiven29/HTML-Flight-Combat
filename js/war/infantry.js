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
   F place an FPV drone (an operator at base flies it) · V its feed · H medevac ·
   LMB fire · RMB or Q aim (iron sights) · R reload · 1 primary · 2 launcher · 3 sidearm · G grenade · B build a
   sandbag wall · O call an offensive · Esc leave.
   v380: from a world-war sortie the battle is IN THE LIVE WORLD (real terrain and towns, real AI flights, the war's
   clock running); enemy troops call for backup; engineers dig in; offensives; craters and holed walls build up.
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
  ENGINEER:{n:'Engineer',pri:'CARB',lau:'RPG',arm:'PLATE',gren:2},CQB:{n:'Close quarters',pri:'SMG',lau:'NONE',arm:'HEAVY',gren:4},BREACH:{n:'Breacher',pri:'SHOT',lau:'RPG',arm:'HEAVY',gren:4}};
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
const INSB={APC:'Drops you and leaves.',IFV:'Stays and supports you with its cannon.',HELO:'Drops you and leaves.',AIR:'Parachute: steer it down.'};
const MISD={ATTACK:['ATTACK','Take the town.'],DEFEND:['DEFEND','Hold the trenches.']};
function kitMenu(a3,ap,camp){if(!camp&&!W.st)return;K.camp=!!camp;if(camp)a3=campCtx().a3;K.a3=a3;K.ap=ap;const p=country(K),N=names(a3);const sn=window.UI2&&UI2.snap?UI2.snap():null;if(window.UI2)UI2.close();
  // one choice button: group g, key k; the data-ik attribute is what the click handler below reads
  const o=(g,k,nm,sub)=>'<button class="opt" data-ik="'+g+':'+k+'" aria-pressed="'+(K[g]===k)+'"><b>'+esc(nm)+'</b>'+(sub?'<span>'+esc(sub)+'</span>':'')+'</button>';
  const sec=(t,body,em)=>'<section class="sec"><h3>'+t+(em?'<em>'+em+'</em>':'')+'</h3>'+body+'</section>';
  const priSub=(k)=>{const q=PRI[k];return(k==='RIFLE'&&N.RIFLE?'Service rifle · ':'')+q.mag+' rd · '+q.rpm+' rpm'+(q.pel?' · '+q.pel+' pellets':'')+(q.scope?' · scoped':'');};
  const lauSub=(k)=>k==='NONE'?'':(N[k]?N[k]+' · ':'')+(LAU[k].air?'air defence':LAU[k].guided?'guided':'unguided')+' · '+(LAU[k].mag+LAU[k].res)+' rd';
  const armSub=(k)=>k==='NONE'?'No protection.':Math.round((1-ARM[k].k)*100)+'% protection · '+Math.round((1-ARM[k].spd)*100)+'% slower';
  const bar=(lab,v,txt)=>'<div class="st"><span>'+lab+'</span><u><i style="width:'+Math.round(Math.max(.04,Math.min(1,v))*100)+'%"></i></u><em>'+txt+'</em></div>';
  const R=ROLE[K.role],pr=PRI[K.pri],la=LAU[K.lau],ar=ARM[K.arm];
  const mod=R&&(R.pri!==K.pri||R.lau!==K.lau||R.arm!==K.arm||R.gren!==K.gren);
  const ln=(l,v)=>'<div class="ln"><span>'+l+'</span><b>'+esc(v)+'</b></div>';
  const card='<aside class="ks" aria-label="Loadout"><div class="sb">LOADOUT'+(mod?' · MODIFIED':'')+'</div><div class="rl">'+esc(R?R.n:K.role)+'</div>'+
    ln('OBJECTIVE',MISD[K.mis]?MISD[K.mis][0]+' — '+MISD[K.mis][1]:K.mis)+ln('PRIMARY',K.pri==='RIFLE'&&N.RIFLE?N.RIFLE:pr.n)+ln('LAUNCHER',K.lau==='NONE'?'None':(N[K.lau]?N[K.lau]+' — ':'')+la.n)+ln('SIDEARM',SIDE.n)+ln('ARMOUR',ar.n)+ln('GRENADES',String(K.gren))+ln('INSERTION',INS[K.ins]+(N[K.ins]?' · '+N[K.ins]:''))+
    '<div class="br">'+bar('DAMAGE',pr.dmg/140,pr.dmg+(pr.pel?' ×'+pr.pel:''))+bar('FIRE RATE',pr.rpm/900,String(pr.rpm))+bar('MAGAZINE',pr.mag/100,String(pr.mag))+bar('ACCURACY',1-pr.spr/.07,Math.round((1-pr.spr/.07)*100)+'%')+bar('PROTECTION',(1-ar.k)/.6,Math.round((1-ar.k)*100)+'%')+bar('MOBILITY',ar.spd,Math.round(ar.spd*100)+'%')+'</div>'+
    '<div class="fine">'+esc(INSB[K.ins])+' Abstract game values, not published data.</div></aside>';
  const keys=[['WASD','move'],['MOUSE','look'],['Q','aim (or right mouse)'],['B','sandbag wall'],['O','offensive'],['F','place FPV drone'],['V','its feed'],['H','medevac'],['G','grenade'],['Esc','leave']];
  const h='<header class="mh"><div class="mk">INFANTRY · KIT AND INSERTION</div><h2 id="u2t">INFANTRY — '+esc(p.n.toUpperCase())+'</h2><div class="ms"><span>Your kit and how you get to the front</span></div></header>'+
   '<div class="mb"><div class="kit"><div class="col">'+
   sec('MISSION','<div class="opts c2">'+Object.keys(MISD).map(k=>o('mis',k,MISD[k][0],MISD[k][1]).replace('class="opt"','class="opt big"')).join('')+'</div>')+
   sec('ROLE','<div class="opts c3">'+Object.keys(ROLE).map(k=>o('role',k,ROLE[k].n,PRI[ROLE[k].pri].n)).join('')+'</div>','sets the kit, each item can still be changed')+
   sec('PRIMARY WEAPON','<div class="opts">'+Object.keys(PRI).map(k=>o('pri',k,(k==='RIFLE'&&N.RIFLE?N.RIFLE+' (rifle)':PRI[k].n),priSub(k))).join('')+'</div>')+
   sec('LAUNCHER','<div class="opts">'+Object.keys(LAU).map(k=>o('lau',k,(N[k]?N[k]+' — ':'')+LAU[k].n,lauSub(k))).join('')+'</div>')+
   sec('BODY ARMOUR','<div class="opts">'+Object.keys(ARM).map(k=>o('arm',k,ARM[k].n,armSub(k))).join('')+'</div>','heavier protects more and slows you')+
   sec('GRENADES','<div class="seg">'+[0,2,4].map(n=>'<button data-ik="gren:'+n+'" aria-pressed="'+(K.gren===n)+'">'+n+'</button>').join('')+'</div><div class="note">A sidearm is always carried.</div>')+
   sec('INSERTION','<div class="opts">'+Object.keys(INS).map(k=>o('ins',k,INS[k],(N[k]?N[k]+' · ':'')+INSB[k])).join('')+'</div>')+
   '</div>'+card+'</div>'+
   sec('CONTROLS','<div class="keys">'+keys.map(([k,t])=>'<span><kbd>'+k+'</kbd>'+t+'</span>').join('')+'</div><div class="note">In the world war you fight in the live world while the war goes on.</div>')+
   '</div>'+
   '<footer class="mf"><button class="ghost" data-ix="1">'+(K.camp?'CANCEL':'BACK')+'</button><div class="r"><button class="go" data-igo="1">DEPLOY ▸</button></div></footer>';
  const d=document.createElement('div');d.className='u2m';d.id='u2m';d.dataset.k='kit';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','u2t');d.innerHTML='<div class="bx wide">'+h+'</div>';document.body.appendChild(d);
  if(sn&&UI2.restore)UI2.restore(d,sn,'kit');}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-inf],[data-ik],[data-ix],[data-igo]');if(!t)return;const d=t.dataset;
  if(d.inf&&window.UI2){kitMenu(UI2.SU.a3,UI2.SU.ap);}
  else if(d.ik){const[g,k]=d.ik.split(':');K[g]=g==='gren'?+k:k;if(g==='role')Object.assign(K,{pri:ROLE[k].pri,lau:ROLE[k].lau,arm:ROLE[k].arm,gren:ROLE[k].gren});kitMenu(K.a3,K.ap,K.camp);}
  else if(d.ix){const m=document.getElementById('u2m');if(m)m.remove();if(!K.camp&&window.UI2)UI2.setup(K.a3,K.ap);}
  else if(d.igo){const m=document.getElementById('u2m');if(m)m.remove();if(!K.camp&&K.ap&&K.ap.runways&&window.WSORTIE)startWorld({...K});else start({...K});}});

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
  const WM=!!cfg.world;let R=null,sc,cam,ter=null;
  if(WM){cv.style.background='transparent';sc=new THREE.Group();sc.position.copy(cfg.O);scene.add(sc);cam=camera;}
  else{try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true});R.setPixelRatio(Math.min(1.25,devicePixelRatio||1));R.setSize(innerWidth,innerHeight,false);}catch(e){R=null;}
  sc=new THREE.Scene();sc.background=new THREE.Color(0x9fb8c8);sc.fog=new THREE.Fog(0x9fb8c8,250,900);sc.add(new THREE.HemisphereLight(0xdfeeff,0x4a5038,.85));const sun=new THREE.DirectionalLight(0xffffff,.7);sun.position.set(200,400,100);sc.add(sun);
  cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,3000);
  const tg=new THREE.PlaneGeometry(2400,2400,200,200);tg.rotateX(-Math.PI/2);const pa=tg.attributes.position;for(let i=0;i<pa.count;i++)pa.setY(i,H(pa.getX(i),pa.getZ(i)));tg.computeVertexNormals();
  ter=new THREE.Mesh(tg,new THREE.MeshLambertMaterial({color:0x5e7442}));sc.add(ter);}
  const solid=ter?[ter]:[],bm=new THREE.MeshLambertMaterial({color:0xa49a86});
  const village=new V3(0,0,-260);const boxes=[];
  // a town on a street grid: houses of one to three storeys, hollow, with doors, windows, floors and stairs
  const wallM=[0xa49a86,0x9a8a74,0xb6aa92,0x8c8478].map(c=>new THREE.MeshLambertMaterial({color:c})),flM=new THREE.MeshLambertMaterial({color:0x6e6253}),rfM=new THREE.MeshLambertMaterial({color:0x7a3a2e});
  let CB=null;const BLD=[],STR=[];
  const box=(x0,y0,z0,x1,y1,z1,m,nos)=>{const g=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0),m);g.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);if(!CB){sc.add(g);solid.push(g);}const b={x0,y0,z0,x1,y1,z1,m:g,bid:CB?CB.id:null};boxes.push(b);if(CB){CB.parts.push(b);if(y1-y0>2.4&&!nos)CB.walls++;}return g;};
  const begin=(kind,x,z,w,d,fl)=>{CB={id:BLD.length,kind,x,z,w,d,fl,parts:[],walls:0,lost:0,down:false,sc,meshes:[]};BLD.push(CB);return CB;},done=()=>{const c=CB;CB=null;mergeB(c);return c;};
  const fuM=new THREE.MeshLambertMaterial({color:0x5a4a38}),fuM2=new THREE.MeshLambertMaterial({color:0x7a7468});
  // furniture on a floor: a table, a bed or sofa, shelves; kept clear of the door and the stairs
  const furnish=(x0,z0,x1,z1,y)=>{if(x1-x0<5||z1-z0<5)return;const cx=(x0+x1)/2+.7,cz=(z0+z1)/2;box(cx-.6,y,cz-.4,cx+.6,y+.75,cz+.4,fuM,1);
    box(x1-1.1,y,z0+.5,x1-.3,y+.5,z0+2.4,fuM2,1);box(x1-.6,y,cz+.6,x1-.25,y+1.8,cz+1.8,fuM,1);if(rn()<.5)box(cx-1.6,y,z0+.4,cx-.2,y+.9,z0+.9,fuM2,1);};
  function house(cx,cz,w,d,fl,mat,kind){begin(kind||(fl>3?'APARTMENTS':'HOUSE'),cx,cz,w,d,fl);const T=.3,SH=3,y0=Math.max(H(cx-w/2,cz-d/2),H(cx+w/2,cz-d/2),H(cx-w/2,cz+d/2),H(cx+w/2,cz+d/2),H(cx,cz))+.15,x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2;
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
    for(let f=0;f<fl;f++)furnish(x0+1.5,z0+.4,x1-.4,z1-.4,y0+f*SH);
    box(x0-.3,y0+fl*SH,z0-.3,x1+.3,y0+fl*SH+.3,z1+.3,rfM);done();return{x0,z0,x1,z1};}
  // a hall: warehouse, factory or church — one tall open room with columns, big doors, high windows; a church has a tower
  function hall(cx,cz,w,d,h,kind,mat){begin(kind,cx,cz,w,d,1);const T=.4,y0=Math.max(H(cx-w/2,cz-d/2),H(cx+w/2,cz+d/2),H(cx,cz))+.15,x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2;box(x0,y0-3,z0,x1,y0,z1,flM);
    const seg=(along,fixed,a0,a1,door)=>{const L=a1-a0,n=Math.max(1,Math.floor(L/5)),sl=L/n;for(let i=0;i<n;i++){const s0=a0+i*sl,s1=s0+sl,m=(s0+s1)/2,dr=door&&i===(n>>1),hw=dr?2:1;
      const put=(p0,p1,q0,q1)=>along==='x'?box(p0,y0+q0,fixed-T/2,p1,y0+q1,fixed+T/2,mat):box(fixed-T/2,y0+q0,p0,fixed+T/2,y0+q1,p1,mat);
      put(s0,m-hw,0,h);put(m+hw,s1,0,h);if(dr)put(m-hw,m+hw,4,h);else{put(m-hw,m+hw,0,h*.55);put(m-hw,m+hw,h*.8,h);}}};
    seg('x',z1,x0,x1,true);seg('x',z0,x0,x1,kind!=='CHURCH');seg('z',x0,z0+T/2,z1-T/2,false);seg('z',x1,z0+T/2,z1-T/2,false);
    for(let x=x0+5;x<x1-3;x+=6)for(let z=z0+5;z<z1-3;z+=6)box(x-.2,y0,z-.2,x+.2,y0+h,z+.2,flM,1);
    if(kind==='FACTORY')for(let i=0;i<3;i++){const x=x0+3+i*(w-6)/2;box(x-1,y0,cz-1.5,x+1,y0+1.6,cz+1.5,fuM2,1);}
    if(kind==='WAREHOUSE')for(let i=0;i<4;i++){const x=x0+3+i*(w-6)/3;box(x-.6,y0,z0+2,x+.6,y0+2.2,z0+5,fuM,1);}
    if(kind==='CHURCH'){for(let i=0;i<5;i++){const z=z0+3+i*2;box(cx-3,y0,z,cx-.6,y0+.6,z+.5,fuM,1);box(cx+.6,y0,z,cx+3,y0+.6,z+.5,fuM,1);}box(x0+1,y0,z0-5,x0+5,y0+h*2.2,z0,mat);}
    box(x0-.4,y0+h,z0-.4,x1+.4,y0+h+.4,z1+.4,rfM);done();}
  // fortifications: bunker (concrete, firing slits facing 'face' = -1 north / +1 south, door at the back), dugout
  // (earth walls, log roof, half sunk), command post (sandbagged hut, radio mast, map table)
  const conc=new THREE.MeshLambertMaterial({color:0x8a8a84}),earthM=new THREE.MeshLambertMaterial({color:0x5a4630}),logM=new THREE.MeshLambertMaterial({color:0x4a3a26}),sbM=new THREE.MeshLambertMaterial({color:0x8c7d5a});
  function bunker(cx,cz,face,side){const c=begin('BUNKER',cx,cz,6,5,1),y0=H(cx,cz)-.6,x0=cx-3,x1=cx+3,z0=cz-2.5,z1=cz+2.5,T=.8,fz=face<0?z0:z1,bz=face<0?z1:z0;
    box(x0,y0-1,z0,x1,y0,z1,conc);box(x0,y0,fz-T/2,x0+1.2,y0+2.4,fz+T/2,conc);box(x1-1.2,y0,fz-T/2,x1,y0+2.4,fz+T/2,conc);box(x0+1.2,y0,fz-T/2,x1-1.2,y0+1.3,fz+T/2,conc);box(x0+1.2,y0+1.7,fz-T/2,x1-1.2,y0+2.4,fz+T/2,conc);
    box(x0-T/2,y0,z0,x0+T/2,y0+2.4,z1,conc);box(x1-T/2,y0,z0,x1+T/2,y0+2.4,z1,conc);box(x0,y0,bz-T/2,cx-.6,y0+2.4,bz+T/2,conc);box(cx+.6,y0,bz-T/2,x1,y0+2.4,bz+T/2,conc);box(cx-.6,y0+2,bz-T/2,cx+.6,y0+2.4,bz+T/2,conc);
    box(x0-.4,y0+2.4,z0-.4,x1+.4,y0+3,z1+.4,conc);c.hp=2400;c.side=side;c.cx=cx;c.cz=cz;c.y0=y0;STR.push(c);done();return c;}
  function dugout(cx,cz,side){const c=begin('DUGOUT',cx,cz,5,4,1),y0=H(cx,cz)-1.2,x0=cx-2.5,x1=cx+2.5,z0=cz-2,z1=cz+2;
    box(x0,y0-.5,z0,x1,y0,z1,earthM);box(x0-.6,y0,z0-.6,x0,y0+2.3,z1,earthM);box(x1,y0,z0-.6,x1+.6,y0+2.3,z1,earthM);box(x0,y0,z0-.6,x1,y0+2.3,z0,earthM);box(x0,y0,z1,cx-.7,y0+2.3,z1+.6,earthM);box(cx+.7,y0,z1,x1,y0+2.3,z1+.6,earthM);
    for(let i=0;i<6;i++){const x=x0-.6+i*1.03;box(x,y0+2.3,z0-.6,x+.9,y0+2.6,z1+.6,logM,1);}box(x0-.8,y0+2.6,z0-.8,x1+.8,y0+3,z1+.8,earthM,1);box(cx-.6,y0,z0+.2,cx+.6,y0+.8,z0+.8,fuM,1);
    c.hp=1500;c.side=side;c.cx=cx;c.cz=cz;c.y0=y0;STR.push(c);done();return c;}
  function cpost(cx,cz,side){const c=begin('COMMAND POST',cx,cz,7,6,1),y0=H(cx,cz),x0=cx-3.5,x1=cx+3.5,z0=cz-3,z1=cz+3;
    box(x0,y0-.5,z0,x1,y0,z1,flM);box(x0,y0,z0,x1,y0+2.2,z0+.8,sbM);box(x0,y0,z0,x0+.8,y0+2.2,z1,sbM);box(x1-.8,y0,z0,x1,y0+2.2,z1,sbM);box(x0,y0,z1-.8,cx-.8,y0+2.2,z1,sbM);box(cx+.8,y0,z1-.8,x1,y0+2.2,z1,sbM);
    box(x0-.3,y0+2.2,z0-.3,x1+.3,y0+2.5,z1+.3,new THREE.MeshLambertMaterial({color:0x4d5a3a}));box(cx-1.2,y0,cz-.6,cx+1.2,y0+.8,cz+.6,fuM,1);box(x1-1.6,y0,z0+1,x1-.9,y0+1.1,z0+1.8,fuM2,1);
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.04,.06,9,5),new THREE.MeshLambertMaterial({color:0x333333}));mast.position.set(x1-1,y0+4.5,z0+1);sc.add(mast);
    c.hp=1600;c.side=side;c.cx=cx;c.cz=cz;c.y0=y0;c.mast=mast;STR.push(c);done();return c;}
  // v381: in the live world the town's real buildings near the battle (the flight world's blocks) are replaced by ones you
  // can enter, of the same footprint and height: houses, apartment blocks and towers, warehouses and factories
  let REAL=0;const hidden=[];
  if(WM&&window.WF&&WF.bldg&&WF.townMesh){const M0=new THREE.Matrix4(),Z=new THREE.Matrix4().makeScale(0,0,0),near=WF.bldg.filter(b=>b[7]&&Math.hypot(b[0]-cfg.O.x,b[1]-(cfg.O.z-260))<420).sort((a,b)=>Math.hypot(a[0]-cfg.O.x,a[1]-cfg.O.z+260)-Math.hypot(b[0]-cfg.O.x,b[1]-cfg.O.z+260)).slice(0,60);
    for(const b of near){WF.townMesh.getMatrixAt(b[6],M0);hidden.push([b,M0.clone()]);WF.townMesh.setMatrixAt(b[6],Z);const x=b[0]-cfg.O.x,z=b[1]-cfg.O.z,w=Math.max(7,Math.min(40,b[3])),d=Math.max(7,Math.min(40,b[4])),h=b[5];
      if(w*d>350&&h<12)hall(x,z,w,d,Math.max(6,h),rn()<.5?'WAREHOUSE':'FACTORY',wallM[3]);else house(x,z,Math.round(w),Math.round(d),Math.max(1,Math.min(8,Math.round(h/3))),wallM[(rn()*4)|0],h>15?'APARTMENTS':'HOUSE');REAL++;}
    WF.townMesh.instanceMatrix.needsUpdate=true;if(REAL<8)REAL=0;}
  const lots=[];for(let gx=-GR;gx<=GR;gx++)for(let gz=-GR;gz<=GR;gz++){if(rn()<.18&&!(gx===GR&&gz===-GR))continue;const cx=village.x+gx*30+(rn()-.5)*4,cz=village.z+gz*30+(rn()-.5)*4;if(Math.abs(gx)<1&&Math.abs(gz)<1)continue;
    const cen=1-Math.max(Math.abs(gx),Math.abs(gz))/(GR+1),w=8+rn()*6+(FLMAX>4?cen*6:0),d=8+rn()*6+(FLMAX>4?cen*6:0),fl=1+((rn()*Math.max(1,FLMAX*cen+1))|0);if(gx===GR&&gz===-GR&&!REAL)hall(cx,cz,16,24,7,'CHURCH',wallM[2]);else if(Math.abs(gx)===GR&&rn()<.35&&!REAL)hall(cx,cz,18,22,8,rn()<.5?'WAREHOUSE':'FACTORY',wallM[3]);else if(!REAL)lots.push(house(cx,cz,Math.round(w),Math.max(8,Math.round(d)),fl,wallM[(rn()*4)|0]));}
  // streets
  const stM=new THREE.MeshLambertMaterial({color:0x55524c});for(let k=-GR;k<=GR;k++){for(const ax of['x','z']){const g=new THREE.Mesh(new THREE.PlaneGeometry(ax==='x'?GR*60+30:5,ax==='x'?5:GR*60+30),stM);g.rotation.x=-Math.PI/2;g.position.set(village.x+(ax==='z'?k*30+15:0),H(village.x,village.z)+.05,village.z+(ax==='x'?k*30+15:0));}}
  const blds=boxes;
  const trm=new THREE.MeshLambertMaterial({color:0x2f4a26});for(let i=0;i<(WM?0:700);i++){const x=(rn()-.5)*2200,z=(rn()-.5)*2200;if(Math.hypot(x-village.x,z-village.z)<GR*32+40||(cfg.mis==='DEFEND'&&Math.abs(z+470)<40&&Math.abs(x)<200))continue;const t=new THREE.Mesh(new THREE.ConeGeometry(2.5,8,6),trm);t.position.set(x,H(x,z)+4,z);sc.add(t);}
  // DEFEND: a zig-zag trench line north of the town: earth parapet (stops rounds), sandbags, rear wall, dugouts
  const trench=[];if(cfg.mis==='DEFEND'){const earth=new THREE.MeshLambertMaterial({color:0x5a4630}),bag=new THREE.MeshLambertMaterial({color:0x8c7d5a}),TZ=-470;
    for(let x=-170;x<170;x+=10){const z0=TZ+((x/10)&1?3:-3),z1=TZ+(((x+10)/10)&1?3:-3),zm=Math.min(z0,z1),g=Math.min(H(x,zm),H(x+10,zm));
      box(x,g-.5,zm-2.6,x+10,g+1.35,zm-1.2,earth);if(((x/10)|0)%3)box(x+1,g+1.35,zm-2.4,x+9,g+1.65,zm-1.6,bag);box(x,g-.5,zm+1.3,x+10,g+.6,zm+2.2,earth);
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(10,2.5),new THREE.MeshLambertMaterial({color:0x3e3122}));fl.rotation.x=-Math.PI/2;fl.position.set(x+5,g+.04,zm);sc.add(fl);trench.push(new V3(x+5,g,zm));}
    for(const dx of[-120,0,120]){const g=H(dx,TZ+8);box(dx-3,g-.5,TZ+5,dx+3,g+2.2,TZ+5.4,earth);box(dx-3,g+2.2,TZ+5,dx+3,g+2.6,TZ+10,earth);}}
  // strongholds: the enemy's around the objective (attack) or behind their lines (defend); yours along the trench
  if(cfg.mis==='DEFEND'){bunker(-90,-472,-1,'F');bunker(90,-472,-1,'F');dugout(-40,-462,'F');dugout(40,-462,'F');cpost(0,-420,'F');cpost(30,-1050,'E');bunker(-60,-1020,1,'E');}
  else{const c=village;for(let a=0;a<8;a++){const an=a*Math.PI/4,x=c.x+Math.cos(an)*38,z=c.z+Math.sin(an)*38;if(Math.abs(Math.sin(an))>.5){box(x-4,H(x,z)-.3,z-.5,x+4,H(x,z)+1.3,z+.5,sbM);}else box(x-.5,H(x,z)-.3,z-4,x+.5,H(x,z)+1.3,z+4,sbM);}
    bunker(c.x-25,c.z+30,1,'E');bunker(c.x+28,c.z+28,1,'E');dugout(c.x+8,c.z-30,'E');cpost(c.x-8,c.z-14,'E');cpost(0,300,'F');}
  // vegetation: bushes across the field (instanced), grass tufts around you (re-centred as you move, see grassStep)
  const inB=(x,z)=>boxes.some(b=>x>b.x0-1&&x<b.x1+1&&z>b.z0-1&&z<b.z1+1);
  const bush=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshLambertMaterial({color:0x35552a}),900);bush.count=0;sc.add(bush);
  const gq=new THREE.PlaneGeometry(.22,.5);gq.translate(0,.25,0);const grM=new THREE.MeshLambertMaterial({color:0x5f7d3a,emissive:0x1c2a10,side:THREE.DoubleSide});const grass=new THREE.InstancedMesh(gq,grM,4500);grass.frustumCulled=false;sc.add(grass);grass.count=0;
  village.y=H(village.x,village.z);const flag=new THREE.Mesh(new THREE.CylinderGeometry(25,25,.3,32,1,true),new THREE.MeshBasicMaterial({color:0xffe14a,transparent:true,opacity:.25,side:THREE.DoubleSide}));flag.position.copy(village).setY(village.y+.4);sc.add(flag);
  // first-person weapons held in view, one model per kind
  const vmRoot=new THREE.Group();(WM?scene:sc).add(vmRoot);
  const gm=new THREE.MeshLambertMaterial({color:0x26282a}),gm2=new THREE.MeshLambertMaterial({color:0x4a4232}),vms={};
  const mk=(parts)=>{const g=new THREE.Group();for(const[w,h,d,x,y,z,m,cyl]of parts){const o=cyl?new THREE.Mesh(new THREE.CylinderGeometry(w,w,d,8),m||gm):new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||gm);if(cyl)o.rotation.x=Math.PI/2;o.position.set(x,y,z);g.add(o);}g.visible=false;g.scale.setScalar(.7);vmRoot.add(g);return g;};
  vms.rifle=mk([[.07,.11,.62,0,0,0],[.015,0,.4,0,.02,-.5,0,1],[.05,.16,.08,0,-.12,-.08],[.06,.1,.25,0,-.02,.4]]);
  vms.carb=mk([[.07,.11,.5,0,0,0],[.015,0,.25,0,.02,-.37,0,1],[.05,.15,.08,0,-.12,-.05],[.05,.08,.22,0,-.02,.34]]);
  vms.smg=mk([[.07,.1,.38,0,0,0],[.014,0,.16,0,.02,-.27,0,1],[.04,.2,.06,0,-.14,-.05],[.04,.05,.2,0,0,.27]]);
  vms.shot=mk([[.07,.1,.55,0,0,0],[.024,0,.5,0,.02,-.5,0,1],[.03,0,.3,0,-.05,-.45,gm2,1],[.06,.12,.28,0,-.05,.4,gm2]]);
  vms.lmg=mk([[.09,.13,.7,0,0,0],[.018,0,.5,0,.02,-.58,0,1],[.12,.14,.14,-.07,-.1,-.05,gm2],[.07,.11,.26,0,-.02,.45],[.01,.2,.01,.05,-.12,-.75]]);
  vms.dmr=mk([[.07,.11,.7,0,0,0],[.016,0,.5,0,.02,-.58,0,1],[.03,0,.24,0,.1,-.05,0,1],[.05,.15,.08,0,-.12,-.08],[.06,.12,.28,0,-.02,.45,gm2]]);
  vms.snp=mk([[.07,.1,.8,0,0,0,gm2],[.016,0,.6,0,.02,-.68,0,1],[.035,0,.34,0,.11,-.05,0,1],[.06,.14,.3,0,-.03,.5,gm2]]);
  vms.pistol=mk([[.04,.08,.2,0,0,-.05],[.035,.12,.05,0,-.08,.03]]);
  vms.tube=mk([[.06,0,1,0,.02,0,gm2,1],[.04,.12,.05,0,-.08,.1],[.08,0,.2,0,.02,-.55,gm2,1]]);
  // iron sights: rear aperture posts and a front post; aiming lines them up on the centre of the view
  const sm=new THREE.MeshBasicMaterial({color:0x101010});const sights=(g,fz,y)=>{for(const x of[-.014,.014]){const r=new THREE.Mesh(new THREE.BoxGeometry(.008,.03,.012),sm);r.position.set(x,y,.12);g.add(r);}
    const f=new THREE.Mesh(new THREE.BoxGeometry(.005,.026,.006),sm);f.position.set(0,y-.002,fz);g.add(f);const h=new THREE.Mesh(new THREE.BoxGeometry(.04,.006,.01),sm);h.position.set(0,y-.014,.12);g.add(h);g.userData.sy=y;};
  sights(vms.rifle,-.66,.085);sights(vms.carb,-.48,.083);sights(vms.smg,-.33,.078);sights(vms.shot,-.72,.07);sights(vms.lmg,-.8,.095);sights(vms.pistol,-.14,.055);vms.dmr.userData.sy=.1;vms.tube.userData.sy=.09;
  const vm=new THREE.Group();
  return{cv,hud,R,sc,cam,ter,solid,blds,village,flag,vm,vms,trench,vmRoot,WM,BLD,STR,hidden,grass,inB,bush,townR:REAL?0:GR*30+22};}

function start(cfg){if(S)stop(false);const st=cfg.camp?null:W.st;if(!st&&!cfg.camp)return;if(cfg.camp){const c=campCtx();cfg.a3=c.a3;}const p=country(cfg);const me=p.side,en=me==='B'?'R':'B';
  const fr=st?(st.fronts.find(f=>!f.cf&&(f.a===cfg.a3||f.b===cfg.a3))||st.fronts.find(f=>!f.cf&&(st.c[f.a].side===me||st.c[f.b].side===me))):null;
  const enA3=cfg.camp?campCtx().en:fr?(fr.a===cfg.a3||st.c[fr.a].side===me?fr.b:fr.a):null,N=names(cfg.a3),EN=names(enA3||'');
  const cs=cfg.camp&&typeof CAMP!=='undefined'&&CAMP.st?(CAMP.st.hot&&CAMP.st.hot.length?CAMP.st.hot[0]:(CAMP.st.front.length>>1)):null;
  if(typeof game!=='undefined'&&!cfg.world){S0.paused=game.paused;game.paused=true;}
  const LOC=cfg.world?cfg.loc:resolveLoc(cfg,fr,cs);cfg.loc=LOC;HF=cfg.world?((x,z)=>groundAt(cfg.O.x+x,cfg.O.z+z)):LOC.H;cfg.mis=cfg.mis||'ATTACK';
  const B=build(cfg);const pri={...PRI[cfg.pri]},lau={...LAU[cfg.lau]},sd={...SIDE};pri.cur=pri.mag;sd.cur=sd.mag;if(lau.mag)lau.cur=lau.mag;
  S={fpvKit:cfg.role==='AT'||cfg.role==='ENGINEER'?3:2,myFpv:[],feed:null,med:null,medN:0,wia:0,evac:0,armLog:[],O:cfg.world?cfg.O.clone():new V3(),smk:[],craters:[],fires:[],calls:0,callDead:0,pend:null,arty:null,offN:0,bags:cfg.role==='ENGINEER'?8:2,dug:0,cfg,cs,loc:LOC,mission:cfg.mis,trZ:-470,wave:0,air:[],airT:8,me,en,fr,enA3,N,EN,...B,t:0,phase:'INSERT',ins:cfg.ins,pos:new V3(0,0,250),vel:new V3(),yaw:0,pitch:0,hp:100,arm:ARM[cfg.arm],crouch:false,ads:false,w:'pri',wp:{pri,lau,side:sd},gren:cfg.gren,
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
  gridBuild();layGreen();S.us.slice(0,2).forEach(u=>u.eng=true);S.them.slice(0,2).forEach(u=>u.eng=true);
  if(S.WM)worldOn();
  {const eb=S.STR.filter(c=>c.side==='E'&&c.kind!=='COMMAND POST');const al=S.them.filter(u=>u.alive);eb.forEach((c,i)=>{const u=al[i];if(!u)return;u.m.position.set(c.cx,c.y0,c.cz);u.ox=c.cx-S.village.x;u.oz=c.cz-S.village.z;u.bunk=c;});}
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
      return{name:best.name,pop:best.pop||5000,real:true,lat:best.lat,lon:best.lon,H:(x,z)=>(G.coarse?Math.max(-8,Math.min(80,(G.coarse(lat0-(z+260)/111200,lon0+x/(111200*cl))-h0))):0)+noise(x,z)*.35};}}
  return{name:'the village',pop:3000,real:false,H:noise};}

function man(friend,x,z){const m=soldier(friend?0x4f6a3a:0x7a6a44);m.position.set(x,H(x,z),z);S.sc.add(m);return{m,friend,hp:100,alive:true,cool:1+rn()*2,tgt:null,goal:null,crouch:false,mv:0,sup:0};}

/* ------------------------------------------------------------------ insertion */
function insertion(){const k=S.ins;S.ins_t=0;
  if(k==='APC'||k==='IFV'){const v=vehicle(k,0x4e5a3c);S.sc.add(v);S.carrier={m:v,from:new V3(0,0,700),to:new V3(0,0,170),dur:16};}
  else if(k==='HELO'){const h=helo(0x46503f);S.sc.add(h);S.carrier={m:h,from:new V3(-500,90,700),to:new V3(0,0,170),dur:18};}
  else{const a=plane();S.sc.add(a);S.carrier={m:a,from:new V3(-900,600,250),to:new V3(900,600,250),dur:20,jump:.5};S.chute=null;}
  say(INS[k].toUpperCase()+(S.N[k]?' · '+S.N[k]:'')+(k==='AIR'?' · SPACE TO JUMP':' · SPACE TO SKIP'),5);}
function insertStep(dt){const C=S.carrier,k=S.ins;S.ins_t+=dt;const u=Math.min(1,S.ins_t/C.dur);
  if(k==='AIR'){if(!S.jumped){const p=C.from.clone().lerp(C.to,u);C.m.position.copy(p);C.m.rotation.y=-Math.PI/2;S.pos.copy(p).add(new V3(-15.6,-.6,0));if(!S.rampLook){S.yaw=Math.PI/2;S.rampLook=1;}
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
  else p.y=H(p.x,p.z);C.m.position.copy(p);C.m.rotation.y=0;S.pos.copy(p).add(new V3(k==='HELO'?1.6:0,k==='HELO'?2:3.4,k==='HELO'?0:1.2));
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
    if(e.code==='Escape'){stop(true,'LEFT');}if(e.code==='KeyR')reload();if(e.code==='KeyC')S.crouch=!S.crouch;if(e.code==='Digit1')swap('pri');if(e.code==='Digit2'&&S.wp.lau.mag)swap('lau');if(e.code==='Digit3')swap('side');if(e.code==='KeyG')grenade();if(e.code==='KeyQ')S.ads=!S.ads;if(e.code==='KeyB')dig(true);if(e.code==='KeyO')offensive();if(e.code==='KeyF')placeFpv();if(e.code==='KeyV')feedView();if(e.code==='KeyH')medevac();};
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
function hitscan(o,d,dmg,own){S.sc.updateMatrixWorld();const tS=rayWorld(o,d,900);ray.set(o.clone().add(S.O),d);ray.far=Math.min(900,tS);const targets=[];const owner=new Map();
  for(const u of[...S.us,...S.them])if(u.alive)u.m.traverse(x=>{if(x.isMesh&&x.userData.part){targets.push(x);owner.set(x,u);}});
  const vown=new Map();if(own)for(const v of S.veh)if(v.alive)v.m.traverse(x=>{if(x.isMesh){targets.push(x);vown.set(x,v);}});
  if(own)for(const dr of S.drones){if(!dr.alive)continue;const c=dr.m.position,t=c.clone().sub(o).dot(d);if(t<0||t>900)continue;const cl=o.clone().addScaledVector(d,t);
    if(cl.distanceTo(c)<(dr.k==='FPV'?.6:dr.k==='OWA'?1.8:4)){if(tS>t){hitDrone(dr,dmg,true);S.hits++;mark(false);return dr;}}}
  const hs=ray.intersectObjects(targets,false);if(!hs.length){if(tS<900)fx(o.clone().addScaledVector(d,tS),.15);return null;}const h=hs[0],u=owner.get(h.object);
  {const v=vown.get(h.object);if(v){if(v.side==='E')armorHit(v,h.point.clone().sub(S.O),d.clone(),S.w==='side'?'PISTOL':S.cfg.pri);fx(h.point.clone().sub(S.O),.1);return null;}}
  if(!u){fx(h.point.clone().sub(S.O),.15);return null;}
  const part=h.object.userData.part,k=part==='head'?2.6:part==='legs'?.7:1;hitMan(u,dmg*k,own);if(own){S.hits++;mark(part==='head');}return u;}
function hitMan(u,dmg,own){if(!u.alive)return;u.hp-=dmg;u.sup=2;if(u.hp<=0){u.alive=false;u.m.rotation.x=-Math.PI/2;u.m.position.y+=.3;if(u.friend&&rn()<.6&&dmg<200){u.down=true;S.wia++;}else if(u.friend){S.lost++;if(own){say('FRIENDLY FIRE',3);S.ff=(S.ff||0)+1;}}else if(own)S.kills++;}}
function mark(hd){const e=document.getElementById('iHit');if(e){e.style.color=hd?'#ff5a4a':'#fff';e.style.opacity=1;clearTimeout(mark.t);mark.t=setTimeout(()=>e.style.opacity=0,120);}}
function hurt(d,why){const torso=why==='bullet';S.hp-=d*(torso?S.arm.k:1);const e=document.getElementById('iDmg');if(e){e.style.opacity=.8;setTimeout(()=>e.style.opacity=0,250);}if(S.hp<=0)end('KIA');}
function grenade(){if(S.gren<=0||S.phase!=='FIGHT')return;S.gren--;const d=aimDir(0);S.gnades.push({p:S.pos.clone(),v:d.multiplyScalar(18).add(new V3(0,4,0)),t:0,own:true});}
function blast(p,r,dmg,own){fx(p,1.4);if(r>=5)scar(p,r);for(const u of[...S.us,...S.them]){if(!u.alive)continue;const d=u.m.position.distanceTo(p);if(d<r)hitMan(u,dmg*(1-d/r),own);}
  for(const v of S.veh){if(!v.alive)continue;const d=Math.hypot(v.x-p.x,v.z-p.z);if(d<4)hitVeh(v,dmg,own);}
  const d=S.pos.distanceTo(p);if(d<r)hurt(dmg*(1-d/r)*.8,'blast');}
function hitVeh(v,dmg,own){v.hp-=dmg;if(v.hp<=0&&v.alive){v.alive=false;S.fires.push({p:v.m.position.clone().setY(v.m.position.y+2.5),t:0});fx(v.m.position.clone().setY(v.m.position.y+2),3);v.m.traverse(x=>{if(x.isMesh)x.material=new THREE.MeshLambertMaterial({color:0x222018});});if(own&&v.side==='E'){S.kills++;S.vk=(S.vk||0)+1;say('VEHICLE DESTROYED',2);}}}
const fxL=[];function fx(p,s){const m=new THREE.Mesh(new THREE.SphereGeometry(s,8,6),new THREE.MeshBasicMaterial({color:0xffb050,transparent:true,opacity:.9}));m.position.copy(p);S.sc.add(m);fxL.push({m,t:0});}

function ai(u,dt,foes){if(!u.alive)return;u.cool-=dt;
  if(u.cool<=0)for(const dr of S.drones){if(!dr.alive||(dr.side==='F')===u.friend||dr.k==='MALE')continue;if(dr.m.position.distanceTo(u.m.position)<60){u.cool=.4;if(rn()<.12)hitDrone(dr,30,false);break;}}u.sup=Math.max(0,u.sup-dt);const P=u.m.position;
  // target: nearest live foe in 320 m (the player counts as a friendly)
  if(!u.tgt||!u.tgt.alive||rn()<dt*.3){let b=null,bd=320;for(const f of foes){if(!f.alive)continue;const d=f.m.position.distanceTo(P);if(d<bd){bd=d;b=f;}}
    if(!u.friend&&S.phase==='FIGHT'){const d=S.pos.distanceTo(P);if(d<bd*1.1)b={alive:true,player:true,m:{position:S.pos}};}u.tgt=b;}
  const goal=u.off?new V3((u.ox??=(rn()-.5)*120),0,S.mission==='DEFEND'?S.trZ-350:S.village.z+(u.oz??=(rn()-.5)*40)):S.mission==='DEFEND'?(u.friend?u.slot:new V3((u.ox??=(rn()-.5)*300),0,S.trZ)):u.friend?(S.phase==='FIGHT'?S.village.clone().add(new V3((u.ox??=(rn()-.5)*30),0,(u.oz??=(rn()-.5)*30)+(S.hold>0?0:40))):null):S.village.clone().add(new V3((u.ox??=(rn()-.5)*80),0,(u.oz??=(rn()-.5)*80)));
  let mv=0;if(goal&&(!u.tgt||u.sup>0&&u.friend)){const d=goal.clone().sub(P).setY(0);if(d.length()>3){d.normalize();P.x+=d.x*2.6*dt;P.z+=d.z*2.6*dt;mv=1;u.m.rotation.y=Math.atan2(-d.x,-d.z);}}
  if(u.tgt){const tp=u.tgt.m.position,d=tp.clone().sub(P);u.m.rotation.y=Math.atan2(-d.x,-d.z);const L=d.length();
    if(L>60&&!mv&&u.friend&&S.phase==='FIGHT'&&S.mission!=='DEFEND'){d.setY(0).normalize();P.x+=d.x*2*dt;P.z+=d.z*2*dt;}
    if(u.cool<=0){u.cool=.5+rn()*1.2;const o=P.clone().setY(P.y+1.5);
      const acc=Math.max(.04,.55-L/500)*(u.sup>0?.5:1)*(u.tgt.player?(S.crouch?.6:1)*(S.vel.length()>3?.6:1):1);
      if(los(o,tp.clone().setY(tp.y+(u.tgt.player?0:1.3)))){if(rn()<acc){if(u.tgt.player)hurt(14+rn()*10,'bullet');else hitMan(u.tgt,22+rn()*14,false);}
        else if(u.tgt.player&&L<120)S.near=.3;}}}
  const gy=H(P.x,P.z),top=collide(P,P.y,P.y+1.7,.35);P.y=Math.max(gy,top>-1e8?top:gy);}
function collide(P,feet,head,r){let top=-1e9;for(const b of near(P.x-r-1,P.z-r-1,P.x+r+1,P.z+r+1,_nb)){if(P.x<b.x0-r||P.x>b.x1+r||P.z<b.z0-r||P.z>b.z1+r)continue;
    if(b.y1<=feet+.45){if(P.x>b.x0-.05&&P.x<b.x1+.05&&P.z>b.z0-.05&&P.z<b.z1+.05)top=Math.max(top,b.y1);continue;}if(b.y0>=head)continue;
    const dx0=P.x-(b.x0-r),dx1=(b.x1+r)-P.x,dz0=P.z-(b.z0-r),dz1=(b.z1+r)-P.z,m=Math.min(dx0,dx1,dz0,dz1);if(m===dx0)P.x=b.x0-r;else if(m===dx1)P.x=b.x1+r;else if(m===dz0)P.z=b.z0-r;else P.z=b.z1+r;}return top;}
function los(a,b){const d=b.clone().sub(a),L=d.length();if(L<.5)return true;d.divideScalar(L);return rayWorld(a,d,L-.4)>=L-.4;}

function step(dt){if(!S||S.res)return;S.t+=dt;S.msgT-=dt;S.sc.updateMatrixWorld();
  if(S.phase==='INSERT'){insertStep(dt);}
  else{// player movement
    const g=S.wp[S.w],f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw)),r=new V3(-f.z,0,f.x);let sp=(S.keys.ShiftLeft&&!S.ads?6.2:3.4)*(S.crouch?.5:1)*S.arm.spd*(g.slow||1)*(S.ads?.6:1);
    const w=new V3();if(S.keys.KeyW)w.add(f);if(S.keys.KeyS)w.sub(f);if(S.keys.KeyD)w.add(r);if(S.keys.KeyA)w.sub(r);if(w.lengthSq())w.normalize().multiplyScalar(sp);
    S.vel.x=w.x;S.vel.z=w.z;const gr=H(S.pos.x,S.pos.z),eye=S.crouch?1.1:1.7;if(S.vel.y===0&&S.keys.Space&&!S.crouch)S.vel.y=4.2;S.vel.y-=9.81*dt;S.pos.addScaledVector(S.vel,dt);
    {const feet=S.pos.y-eye,top=collide(S.pos,feet,S.pos.y+.1,.3),fl=Math.max(gr,top);if(S.pos.y<fl+eye){S.pos.y=Math.min(fl+eye,S.pos.y+Math.max(.0,fl+eye-S.pos.y));S.vel.y=0;}}
    if(!S.WM){S.pos.x=Math.max(-1150,Math.min(1150,S.pos.x));S.pos.z=Math.max(-1150,Math.min(1150,S.pos.z));}
    S.cool-=dt;if(S.reload>0){S.reload-=dt;if(S.reload<=0){const n=Math.min(g.mag-g.cur,g.res);g.cur+=n;g.res-=n;}}if(S.fire)shoot();S.kick=Math.max(0,(S.kick||0)-dt*.25);
    if(S.leave){const C=S.leave;C.t=(C.t||0)+dt;if(S.ins==='HELO'){C.m.position.y+=dt*12;C.m.position.z+=dt*30*Math.min(1,C.t/4);C.m.userData.rotor.rotation.y+=dt*30;}else C.m.position.z+=dt*9;if(C.t>30){S.sc.remove(C.m);S.leave=null;}}
    // objective: hold the village with no enemy close
    if(S.mission==='DEFEND')defendStep(dt);else{const inZone=Math.hypot(S.pos.x-S.village.x,S.pos.z-S.village.z)<25,enemyNear=S.them.some(u=>u.alive&&u.m.position.distanceTo(S.village)<45);
    if(inZone&&!enemyNear){S.hold+=dt;if(S.hold>=30)end('WON');}else S.hold=Math.max(0,S.hold-dt*.5);
    S.waveT-=dt;if(S.waveT<=0&&S.them.filter(u=>u.alive).length<6){S.waveT=80;const n=4;for(let i=0;i<n;i++)S.them.push(man(false,S.village.x+(rn()-.5)*60,S.village.z-160-rn()*40));say('ENEMY REINFORCEMENTS FROM THE NORTH',3);}}
    S.heliT-=dt;if(S.heliT<=0&&!S.eheli){const h=helo(0x6a5a3a);h.position.set(400,80,-500);S.sc.add(h);S.eheli={m:h,hp:500,alive:true,cool:3,t:0};say('ENEMY HELICOPTER',3);S.heliT=1e9;}}
  droneStep(dt);if(!S.WM)airStep(dt);vehStep(dt);battleStep(dt);v381Step(dt);if(S.dirtyB&&S.dirtyB.size){for(const c of S.dirtyB)mergeB(c);S.dirtyB.clear();}
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
    for(const v of S.veh)if(v.alive&&Math.hypot(v.x-k.p.x,v.z-k.p.z)<3.5&&k.p.y<v.m.position.y+3.5){if(k.own&&v.side==='E')armorHit(v,k.p.clone(),k.v.clone().normalize(),k.g.guided?'ATGM':'RPG');else hitVeh(v,k.g.dmg,k.own);hit=1;}
    for(const dr of S.drones)if(dr.alive&&k.own&&k.p.distanceTo(dr.m.position)<(dr.k==='MALE'?10:5)){hitDrone(dr,k.g.dmg,true);hit=1;}
    if(S.eheli&&S.eheli.alive&&k.p.distanceTo(S.eheli.m.position)<6){S.eheli.hp-=k.g.dmg;hit=1;if(S.eheli.hp<=0){S.eheli.alive=false;fx(S.eheli.m.position,4);S.sc.remove(S.eheli.m);if(k.own){S.kills++;say('HELICOPTER DOWN',3);}}}
    if(hit||k.p.y<H(k.p.x,k.p.z)||k.t>8){blast(k.p,5,hit?0:120,k.own);S.rk.splice(i,1);}}
  for(let i=S.gnades.length-1;i>=0;i--){const n=S.gnades[i];n.t+=dt;n.v.y-=9.81*dt;n.p.addScaledVector(n.v,dt);const g=H(n.p.x,n.p.z);if(n.p.y<g+.1){n.p.y=g+.1;n.v.multiplyScalar(.3);n.v.y=Math.abs(n.v.y);}if(n.t>3.5){blast(n.p,9,160,n.own);S.gnades.splice(i,1);}}
  for(let i=fxL.length-1;i>=0;i--){const e=fxL[i];e.t+=dt;e.m.scale.setScalar(1+e.t*3);e.m.material.opacity=Math.max(0,.9-e.t*2);if(e.t>.5){S.sc.remove(e.m);fxL.splice(i,1);}}
  if(S.us.every(u=>!u.alive)&&S.phase==='FIGHT'&&S.t>5&&rn()<dt*.05)say('YOUR SQUAD IS DOWN · YOU ARE ALONE',3);}

function pose(){const c=S.cam;if(S.feed&&S.feed.alive){c.position.copy(S.feed.m.position).add(S.O);c.up.set(0,1,0);c.quaternion.copy(S.feed.m.quaternion);c.rotateY(Math.PI);c.fov=90;c.updateProjectionMatrix();c.updateMatrixWorld();S.vmRoot.visible=false;return;}S.vmRoot.visible=true;c.position.copy(S.pos).add(S.O);c.up.set(0,1,0);c.rotation.set(S.pitch+(S.kick||0),S.yaw,0,'YXZ');const g=S.wp[S.w];const fov=S.ads&&S.phase==='FIGHT'?70/(g.ads||1):70;
  S.fov=(S.fov||70)+(fov-(S.fov||70))*.3;if(S.WM){c.near=.05;}c.fov=S.fov;c.updateProjectionMatrix();c.updateMatrixWorld();S.vmRoot.position.copy(c.position);S.vmRoot.quaternion.copy(c.quaternion);}
// in the live world the game draws the frame: the camera is put where you are just before it does
if(typeof renderer!=='undefined'&&renderer.render&&!renderer._inf){const _r=renderer.render.bind(renderer);renderer.render=function(sc0,c0){if(S&&S.WM&&sc0===scene&&c0===camera){try{pose();}catch(e){}}return _r(sc0,c0);};renderer._inf=1;}
function draw(){if(!S)return;if(!S.WM&&!S.R)return;if(!S.WM)pose();const g=S.wp[S.w];
  const vk=S.w==='lau'?'tube':g.vm||'rifle',scoped=g.scope&&S.ads&&S.phase==='FIGHT';for(const k in S.vms){const m=S.vms[k];m.visible=k===vk&&S.phase==='FIGHT'&&!scoped;}const cur=S.vms[vk];if(cur){const sy=(cur.userData.sy||.085)*.7;cur.position.set(S.ads?0:.2,S.ads?-sy:-.2,(S.ads?-.32:-.45)+(S.kick||0)*2+(S.reload>0?.15:0));}if(cur)cur.rotation.x=S.reload>0?-.6:0;
  {const sc2=document.getElementById('iScope');if(sc2)sc2.style.display=scoped?'block':'none';}S.flag.material.color.set(S.hold>0?0x5be1ff:0xffe14a);if(!S.WM)S.R.render(S.sc,S.cam);else if((S.hf=(S.hf||0)+1)%30===1)hideFlight();
  const $=id=>document.getElementById(id);const live=S.us.filter(u=>u.alive).length,elive=S.them.filter(u=>u.alive).length,dv=Math.round(Math.hypot(S.pos.x-S.village.x,S.pos.z-S.village.z));
  const nm=S.w==='pri'?(S.cfg.pri==='RIFLE'&&S.N.RIFLE?S.N.RIFLE:g.n):S.w==='lau'?((S.N[S.cfg.lau]||'')+' '+g.n):g.n;
  const brg=((Math.atan2(S.village.x-S.pos.x,-(S.village.z-S.pos.z))*180/Math.PI+360)%360),hd=((-S.yaw*180/Math.PI)%360+360)%360;
  $('iTop').innerHTML=S.phase==='INSERT'?esc(INS[S.ins].toUpperCase()+' · '+S.loc.name.toUpperCase()):S.mission==='DEFEND'?'HOLD THE TRENCHES · '+esc(S.loc.name.toUpperCase())+' · WAVE '+S.wave+'/4'+(S.wave<4?' · NEXT IN '+Math.max(0,Math.round(S.waveT))+' s':'')+' · HDG '+Math.round(hd)+'°<br><span style="font-size:11px;color:#9fb">DEFENDERS '+live+'/'+S.us.length+' · ENEMY '+elive+' · ARMOUR '+S.veh.filter(v=>v.alive&&v.side==='E').length+' · KILLS '+S.kills+'</span>':esc(S.loc.name.toUpperCase())+' · OBJECTIVE '+dv+' m · '+Math.round(brg)+'° · HDG '+Math.round(hd)+'°'+(S.hold>0?' · HOLDING '+Math.round(S.hold)+'/30 s':'')+'<br><span style="font-size:11px;color:#9fb">SQUAD '+live+'/'+S.us.length+' · ENEMY SEEN '+elive+' · KILLS '+S.kills+'</span>';
  $('iBL').innerHTML='HEALTH '+Math.max(0,Math.round(S.hp))+'<br><span style="font-size:11px">'+esc(S.arm.n)+(S.crouch?' · CROUCHED':'')+'</span>';
  $('iBR').innerHTML=esc(nm)+'<br><b style="font-size:18px">'+(g.mag?(S.reload>0?'RELOADING':g.cur+' / '+g.res):'—')+'</b><br><span style="font-size:11px">GRENADES '+S.gren+' · FPV '+S.fpvKit+' (F) · SANDBAGS '+S.bags+' (B) · MEDEVAC (H) '+(3-S.medN)+'</span>';
  $('iMsg').textContent=S.msgT>0?S.msg:'';{let f=$('iFeed');if(!f){f=document.createElement('div');f.id='iFeed';f.style.cssText='position:absolute;inset:0;pointer-events:none;border:2px solid rgba(255,255,255,.35);display:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 2px,transparent 2px 4px)';S.hud.appendChild(f);}f.style.display=S.feed?'block':'none';if(S.feed)f.innerHTML='<div style="position:absolute;left:14px;top:60px;color:#fff">FPV FEED · OPERATOR AT BASE · '+Math.round(S.feed.m.position.distanceTo(S.pos))+' m FROM YOU · V TO RETURN</div>';}$('iX').style.display=S.phase==='FIGHT'&&!S.ads?'block':'none';}
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
function vehStep(dt){for(const v of S.veh){if(!v.alive)continue;if(v.mv&&Math.abs(v.stop-v.z)>2){v.z+=Math.sign(v.stop-v.z)*3.2*dt;v.m.position.set(v.x,H(v.x,v.z),v.z);if(v.stop<v.z)v.m.rotation.y=Math.PI;}
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

/* ------------------------------------------------------------------ v380: in the live world */
// From a world-war sortie the battle is fought in the game's own world: the flight sortie starts as usual, the world
// moves to the battle site on the front (real terrain, real towns around it), and you fight on foot while the flight
// simulation keeps running: real AI flights of both sides, missiles and the war's clock go on around you. Your
// aircraft waits out of the way (hidden, untouchable) until the battle ends; then the sortie closes.
if(typeof Jet!=='undefined'){const _s=Jet.prototype.step,_d=Jet.prototype.damage;
  Jet.prototype.step=function(h){if(this.infantry&&S&&S.WM){this.pos.copy(S.pos).add(S.O);this.pos.y+=60;this.vel.set(0,0,0);if(this.mesh)this.mesh.visible=false;return;}if(this.infantry&&!S){if(this.mesh)this.mesh.visible=false;this.vel.set(0,0,0);return;}return _s.apply(this,arguments);};
  if(_d)Jet.prototype.damage=function(){if(this.infantry&&S&&S.WM)return;return _d.apply(this,arguments);};}
function worldOn(){S.view0=typeof view!=='undefined'?view:null;try{view='chase';}catch(e){}if(player){player.infantry=true;if(player.mesh)player.mesh.visible=false;}S.near0=camera.near;S.fov0=camera.fov;document.body.classList.add('infWorld');
  if(!document.getElementById('infWCss')){const st=document.createElement('style');st.id='infWCss';st.textContent='body.infWorld #hud,body.infWorld #iffbar,body.infWorld #dmg,body.infWorld .mfd,body.infWorld #rwrBox,body.infWorld #touch{display:none!important}';document.head.appendChild(st);}}
const KEEP=new Set(['view','radio','msg','infCv','infHud','u2m','menu']);
function hideFlight(){const v=document.getElementById('view');if(v)for(const el of v.children){if(el.id==='gl'||el.dataset.infhid)continue;el.dataset.infhid='1';el.style.setProperty('display','none','important');}
  for(const el of document.body.children){if(KEEP.has(el.id)||el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.dataset.infhid)continue;if(getComputedStyle(el).display==='none')continue;el.dataset.infhid='1';el.style.setProperty('display','none','important');}}
function showFlight(){for(const el of document.querySelectorAll('[data-infhid]')){el.style.removeProperty('display');delete el.dataset.infhid;}}
function worldOff(){showFlight();if(S.hidden&&window.WF&&WF.townMesh){for(const[b,M]of S.hidden)if(b[7])WF.townMesh.setMatrixAt(b[6],M);WF.townMesh.instanceMatrix.needsUpdate=true;}try{if(S.view0)view=S.view0;}catch(e){}if(player){player.infantry=false;if(player.mesh)player.mesh.visible=true;}camera.near=S.near0||camera.near;camera.fov=S.fov0||camera.fov;camera.updateProjectionMatrix();
  document.body.classList.remove('infWorld');scene.remove(S.sc);scene.remove(S.vmRoot);if(window.WF&&WF.on&&WF.leave)setTimeout(()=>{try{WF.leave();}catch(e){}},50);}
async function startWorld(cfg){const G=window.WGEO;if(!window.WSORTIE||!window.WF||!G||!W.st){return start(cfg);}
  const st=W.st,p=st.c[cfg.a3],me=p.side;const fr=st.fronts.find(f=>!f.cf&&(f.a===cfg.a3||f.b===cfg.a3))||st.fronts.find(f=>!f.cf&&(st.c[f.a].side===me||st.c[f.b].side===me));
  const loc=resolveLoc(cfg,fr,null);if(!loc.real){return start(cfg);}
  // a loading screen covers the move: you do not see your aircraft on the runway, at the site, or under unloaded ground
  const cov=document.createElement('div');cov.id='infLoad';cov.style.cssText='position:fixed;inset:0;z-index:9999;background:#0b0f0d;color:#cfe3d6;display:flex;align-items:center;justify-content:center;font:14px "B612 Mono",monospace;letter-spacing:.14em';
  cov.textContent='MOVING TO THE FRONT · '+loc.name.toUpperCase()+' …';document.body.appendChild(cov);const unc=()=>cov.remove();
  try{
  await WSORTIE.start(cfg.a3,cfg.ap);for(let i=0;i<200&&!(WF.on&&player);i++)await new Promise(r=>setTimeout(r,100));if(!WF.on||!player)return start(cfg);
  if(player.mesh)player.mesh.visible=false;player.infantry=true;
  const q=G.ll2xz(loc.lat,loc.lon);player.pos.set(q.x,groundAt(q.x,q.z)+60,q.z);player.vel.set(0,0,0);try{await WF.rebase();}catch(e){}
  // wait for the ground at the site to be loaded (its height settles)
  {const q1=G.ll2xz(loc.lat,loc.lon);let h0=groundAt(q1.x,q1.z);for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,100));const h=groundAt(q1.x,q1.z);if(Math.abs(h-h0)<.05&&i>3)break;h0=h;}}
  const q2=G.ll2xz(loc.lat,loc.lon);cfg.world=true;cfg.loc=loc;cfg.O=new V3(q2.x,0,q2.z+260);const r=start(cfg);unc();return r;}
  catch(e){unc();console.warn('[infantry] world start',e);return start(cfg);}}

if(window.WF&&WF.shift&&!WF._inf){const _sh=WF.shift;WF.shift=function(dx,dz){const r=_sh.apply(this,arguments);if(S&&S.WM){S.O.x-=dx;S.O.z-=dz;S.sc.position.copy(S.O);}return r;};WF._inf=1;}

/* ------------------------------------------------------------------ v380: backup, engineers, offensives, battle damage */
// Enemy troops radio for backup when they lose men: reinforcements with a vehicle, an artillery strike, or drones.
// Engineers (two in each squad, and you with the ENGINEER role) dig trench sections and sandbag walls where it is quiet.
// You can call an OFFENSIVE (O, twice a battle): a preparatory barrage on the enemy and a fresh assault group with a tank;
// it also pushes that sector of the front in the war (or the campaign). The ground scars as the fight goes on: craters,
// holed and collapsed walls, burning wrecks.
function arty(c,n,side){S.arty={c:c.clone(),n,t:1.5,side};}
function battleStep(dt){if(S.phase!=='FIGHT')return;
  const dead=S.them.filter(u=>!u.alive).length;
  if(!S.pend&&!S.eCP&&S.calls<4&&dead-S.callDead>=4){S.callDead=dead;S.calls++;const k=['REINF','ARTY','DRONES'][(rn()*3)|0];S.pend={k,t:15+rn()*10};say('ENEMY RADIO · THEY ARE CALLING FOR '+(k==='REINF'?'REINFORCEMENTS':k==='ARTY'?'ARTILLERY':'DRONES'),3);}
  if(S.pend){S.pend.t-=dt;if(S.pend.t<=0){const k=S.pend.k;S.pend=null;
    if(k==='REINF'){const bz=S.mission==='DEFEND'?S.trZ-560:S.village.z-200;for(let i=0;i<6;i++)S.them.push(man(false,(rn()-.5)*160,bz-rn()*60));const x=(rn()-.5)*100,z=bz-80,v=vehicle('EIFV',0x6a5a3a);v.position.set(x,H(x,z),z);S.sc.add(v);S.veh.push({m:v,hp:600,side:'E',x,z,cool:3,alive:true,mv:1,stop:S.mission==='DEFEND'?S.trZ-200:S.village.z-40});say('ENEMY REINFORCEMENTS ARRIVE',3);}
    else if(k==='ARTY'){const al=S.us.filter(u=>u.alive);const c=al.length?al[(rn()*al.length)|0].m.position:S.pos;arty(c,8,'E');say('INCOMING ARTILLERY',3);}
    else{spawnDrone('FPV','E');spawnDrone('FPV','E');}}}
  if(S.arty){S.arty.t-=dt;if(S.arty.t<=0){S.arty.t=1+rn()*.8;S.arty.n--;const a=S.arty,p=a.c.clone().add(new V3((rn()-.5)*50,0,(rn()-.5)*50));p.y=H(p.x,p.z);blast(p,11,a.side==='F'?0:150,false);if(a.side==='F')for(const u of S.them)if(u.alive&&u.m.position.distanceTo(p)<11)hitMan(u,150,false);if(a.n<=0)S.arty=null;}}
  // engineers dig in where no enemy is near
  for(const u of[...S.us,...S.them]){if(!u.alive||!u.eng)continue;u.dg=(u.dg||0)+dt;const foes=u.friend?S.them:S.us;if(foes.some(f=>f.alive&&f.m.position.distanceTo(u.m.position)<90))continue;
    if(u.dg>12&&S.dug<24){u.dg=0;const P=u.m.position;dig(false,P,u.friend?-1:1);}}
  // fires and smoke from wrecks
  for(const f of S.fires){f.t+=dt;if(f.t<120&&rn()<dt*4)smoke(f.p);}
  for(let i=S.smk.length-1;i>=0;i--){const m=S.smk[i];m.userData.t+=dt;m.position.y+=dt*2.5;m.scale.setScalar(1+m.userData.t*.8);m.material.opacity=Math.max(0,.5-m.userData.t*.08);if(m.userData.t>6){S.sc.remove(m);S.smk.splice(i,1);}}}
function smoke(p){S.smk=S.smk||[];if(S.smk.length>80)return;const m=new THREE.Mesh(new THREE.SphereGeometry(1.4,6,5),new THREE.MeshBasicMaterial({color:0x3a3a3a,transparent:true,opacity:.5,depthWrite:false}));m.position.copy(p).add(new V3((rn()-.5)*1.5,0,(rn()-.5)*1.5));m.userData.t=0;S.sc.add(m);S.smk.push(m);}
// a trench section with an earth parapet facing the enemy (dir -1: the enemy is to the north, -z)
function dig(mine,at,dir){if(mine){if(S.bags<=0||S.phase!=='FIGHT'){say('NO SANDBAGS LEFT',1.5);return;}S.bags--;}
  const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw));const P=at?at.clone():S.pos.clone().addScaledVector(f,1.8);let ax=Math.abs(f.x)>Math.abs(f.z)&&mine;const sg=mine?(ax?Math.sign(f.x):Math.sign(f.z)):(dir||-1);
  const g=H(P.x,P.z),earth=new THREE.MeshLambertMaterial({color:mine?0x8c7d5a:0x5a4630});const w=4,t=.9,h=1.3;let b;
  if(ax)b={x0:P.x+sg*.2,x1:P.x+sg*.2+sg*t,z0:P.z-w/2,z1:P.z+w/2};else b={x0:P.x-w/2,x1:P.x+w/2,z0:P.z+sg*.2,z1:P.z+sg*.2+sg*t};
  const x0=Math.min(b.x0,b.x1),x1=Math.max(b.x0,b.x1),z0=Math.min(b.z0,b.z1),z1=Math.max(b.z0,b.z1);
  const m=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,h+.4,z1-z0),earth);m.position.set((x0+x1)/2,g+h/2-.2,(z0+z1)/2);S.sc.add(m);S.solid.push(m);{const bb={x0,y0:g-.4,z0,x1,y1:g+h,z1,m};S.blds.push(bb);gridAdd(bb);}S.dug++;
  if(mine)say('SANDBAG WALL BUILT · '+S.bags+' LEFT',1.5);return m;}
function offensive(){if(S.phase!=='FIGHT')return;if(S.fCP){say('OUR COMMAND POST IS GONE · NO OFFENSIVES',2);return;}if(S.offN>=2){say('NO MORE OFFENSIVES THIS BATTLE',2);return;}S.offN++;
  const tgt=S.mission==='DEFEND'?new V3(0,0,S.trZ-300):S.village.clone();arty(tgt,10,'F');
  const z0=S.mission==='DEFEND'?S.trZ+150:300;for(let i=0;i<10;i++){const u=man(true,(rn()-.5)*80,z0+rn()*40);u.off=true;S.us.push(u);}
  const m=tank(S.me,0x4e5a3c),x=(rn()-.5)*60;m.position.set(x,H(x,z0+60),z0+60);S.sc.add(m);S.veh.push({m,hp:1100,side:'F',x,z:z0+60,cool:3,alive:true,tank:1,mv:1,stop:S.mission==='DEFEND'?S.trZ-150:S.village.z+80,name:S.N.MBT||'main battle tank'});
  // the war: a local push on this sector
  let note='';const st=S.cfg.camp?null:W.st;if(st&&S.fr){const mid=S.fr.sec[(S.fr.sec.length/2)|0],mine=st.c[S.fr.a].side===S.me;mid.off+=mine?.3:-.3;const p=st.c[S.cfg.a3];if(p)p.gnd*=.995;W.emit('OFFENSIVE',{e:[S.cfg.a3],txt:(p?p.n:'')+' opens a local offensive at '+S.loc.name+'.'});note=' · THE FRONT PUSHES';}
  if(S.cfg.camp&&typeof CAMP!=='undefined'&&CAMP.st&&S.cs!=null){CAMP.st.front[S.cs]-=400;CAMP.log('Local offensive at '+S.loc.name+', sector '+(S.cs+1)+'.','b');note=' · SECTOR '+(S.cs+1)+' PUSHES';}
  say('OFFENSIVE · BARRAGE, '+(S.N.MBT||'TANK').toUpperCase()+' AND TEN RIFLEMEN'+note,4);}
// craters and holed walls
function scar(p,r){structHit(p,r);const g=H(p.x,p.z),cm=new THREE.Mesh(new THREE.CircleGeometry(r*.35,10),new THREE.MeshLambertMaterial({color:0x2b241c,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));cm.rotation.x=-Math.PI/2;cm.position.set(p.x,g+.07,p.z);S.sc.add(cm);S.craters.push(cm);
  if(S.craters.length>300)S.sc.remove(S.craters.shift());
  if(S.ter&&S.craters.length%10===0){const c=S.ter.material.color;c.lerp(new THREE.Color(0x4a4636),.04);}
  for(let i=S.blds.length-1;i>=0;i--){const b=S.blds[i];if(b.y1-b.y0<2||!b.m)continue;const cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,cy=(b.y0+b.y1)/2;if(Math.hypot(cx-p.x,cz-p.z,cy-p.y)>r*.45||rn()<.4)continue;
    removeBox(b);S.holes=(S.holes||0)+1;
    const rb=new THREE.Mesh(new THREE.BoxGeometry(b.x1-b.x0+.6,.5,b.z1-b.z0+.6),new THREE.MeshLambertMaterial({color:0x6d665a}));rb.position.set(cx,b.y0+.25,cz);S.sc.add(rb);}}

/* ------------------------------------------------------------------ v382: performance */
// A building is drawn as one merged mesh per material (not dozens of boxes), rebuilt when a wall is blown out. Walls and
// floors are found through a 20 m grid; rays (shots, line of sight, drones) are tested against their boxes by plain
// slab maths and against the ground by sampling its height, instead of raycasting thousands of meshes and the terrain.
function mergeB(c){for(const m of c.meshes){c.sc.remove(m);m.geometry.dispose();}c.meshes=[];const by=new Map();
  for(const q of c.parts){if(q.gone)continue;const mat=q.m.material;let L=by.get(mat);if(!L){L={p:[],n:[]};by.set(mat,L);}const g=q.m.geometry.index?q.m.geometry.toNonIndexed():q.m.geometry;
    const P=g.attributes.position.array,N=g.attributes.normal.array,o=q.m.position;for(let i=0;i<P.length;i+=3){L.p.push(P[i]+o.x,P[i+1]+o.y,P[i+2]+o.z);L.n.push(N[i],N[i+1],N[i+2]);}}
  for(const[mat,L]of by){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(L.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(L.n,3));g.computeBoundingSphere();
    const m=new THREE.Mesh(g,mat);m.matrixAutoUpdate=false;m.updateMatrix();c.sc.add(m);c.meshes.push(m);}}
const GC=20,gk=(i,j)=>i*100003+j;
function gridAdd(b){const G=S.grid;for(let i=Math.floor(b.x0/GC);i<=Math.floor(b.x1/GC);i++)for(let j=Math.floor(b.z0/GC);j<=Math.floor(b.z1/GC);j++){const k=gk(i,j);let L=G.get(k);if(!L){L=[];G.set(k,L);}L.push(b);}}
function gridBuild(){S.grid=new Map();for(const b of S.blds)gridAdd(b);}
// v383: where grass and bushes may grow (local x, z): not in a town's built-up area (the battlefield's own town square;
// in the live world, the real urban footprints), not within a few metres of any wall, not in the trench or on streets.
const _gb=[];
function green(x,z,pad){const v=S.village;if(S.townR&&Math.abs(x-v.x)<S.townR&&Math.abs(z-v.z)<S.townR)return false;
  if(S.mission==='DEFEND'&&Math.abs(z-S.trZ)<10&&Math.abs(x)<185)return false;
  if(S.urb){const wx=x+S.O.x,wz=z+S.O.z;for(const u of S.urb){if(wx<u.x0||wx>u.x1||wz<u.z0||wz>u.z1)continue;let c=false;const X=u.xs,Z=u.zs;for(let i=0,j=X.length-1;i<X.length;j=i++)if((Z[i]>wz)!==(Z[j]>wz)&&wx<(X[j]-X[i])*(wz-Z[i])/(Z[j]-Z[i])+X[i])c=!c;if(c)return false;}}
  const r=pad||3;return near(x-r,z-r,x+r,z+r,_gb).length===0;}
function layGreen(){// the real urban footprints near the battle (world coordinates; they move with the world's origin, as S.O does)
  S.urb=S.WM&&window.WF&&WF.urbanPolys?WF.urbanPolys.filter(u=>u.x1>S.O.x-3000&&u.x0<S.O.x+3000&&u.z1>S.O.z-3000&&u.z0<S.O.z+3000):null;
  const M=new THREE.Matrix4();let n=0;for(let i=0;i<2400&&n<900;i++){const x=(rn()-.5)*1400,z=(rn()-.5)*1400-200;if(!green(x,z,4))continue;const k=.6+rn()*1.4;M.makeScale(k*1.3,k,k*1.3).setPosition(x,H(x,z)+k*.5,z);S.bush.setMatrixAt(n++,M);}
  S.bush.count=n;S.bush.instanceMatrix.needsUpdate=true;}
function near(x0,z0,x1,z1,out){const G=S.grid;out.length=0;const seen=near.seen||(near.seen=new Set());seen.clear();
  for(let i=Math.floor(x0/GC);i<=Math.floor(x1/GC);i++)for(let j=Math.floor(z0/GC);j<=Math.floor(z1/GC);j++){const L=G.get(gk(i,j));if(!L)continue;for(const b of L)if(!b.gone&&!seen.has(b)){seen.add(b);out.push(b);}}return out;}
const _nb=[];
// the nearest box a ray meets within far (local coordinates), or Infinity
function rayBoxes(o,d,far){const seen=rayBoxes.seen||(rayBoxes.seen=new Set());seen.clear();let best=Infinity;const st=Math.max(4,far/200);
  for(let t=0;t<=far+st;t+=st){const x=o.x+d.x*t,z=o.z+d.z*t;const L=S.grid.get(gk(Math.floor(x/GC),Math.floor(z/GC)));if(!L)continue;
    for(const b of L){if(b.gone||seen.has(b))continue;seen.add(b);let t0=0,t1=far;
      const sl=(oa,da,lo,hi)=>{if(Math.abs(da)<1e-9){if(oa<lo||oa>hi){t0=1e9;}return;}let a=(lo-oa)/da,c=(hi-oa)/da;if(a>c){const q=a;a=c;c=q;}if(a>t0)t0=a;if(c<t1)t1=c;};
      sl(o.x,d.x,b.x0,b.x1);sl(o.y,d.y,b.y0,b.y1);sl(o.z,d.z,b.z0,b.z1);if(t0<=t1&&t0<best&&t0<=far)best=t0;}
    if(best<t)break;}
  return best;}
// where a ray first goes under the ground (sampled), or Infinity
function rayGround(o,d,far){let t=0,prev=0;while(t<far){const st=t<60?2:t<300?6:15;t=Math.min(far,t+st);const x=o.x+d.x*t,y=o.y+d.y*t,z=o.z+d.z*t;if(y<H(x,z)-.05)return prev+(t-prev)*.5;prev=t;}return Infinity;}
function rayWorld(o,d,far){return Math.min(rayBoxes(o,d,far),rayGround(o,d,far));}

/* ------------------------------------------------------------------ v381 */
// STRUCTURAL DAMAGE: every heavy blast (rocket, grenade, FPV, artillery, one-way drone, bomb) hits bunkers, dugouts and
// command posts by their strength; a building that loses enough of its walls collapses (upper floors and roof come down
// as rubble). The enemy's command post destroyed or taken silences their calls for backup.
const SDMG=r=>r>=14?2200:r>=11?900:r>=9?140:r>=7?300:500;
function structHit(p,r){const sd=SDMG(r);
  for(const c of S.STR){if(c.down)continue;const d=Math.hypot(c.cx-p.x,c.cz-p.z);if(d>r+3.5)continue;c.hp-=sd*(d<3.5?1:.5);if(c.hp<=0)collapse(c,c.kind+(c.side==='E'?' (enemy)':' (yours)')+' destroyed');}
  for(const b of S.BLD){if(b.down||!b.walls||b.kind==='BUNKER'||b.kind==='DUGOUT'||b.kind==='COMMAND POST')continue;const near=Math.abs(p.x-b.x)<b.w/2+3&&Math.abs(p.z-b.z)<b.d/2+3;if(!near)continue;
    // each building has a strength from its size and storeys; heavy blasts on or by it use it up, and walls blown out weaken it
    b.hp=b.hp??b.w*b.d*(b.fl||1)*25;b.hp-=sd;const lost=b.parts.filter(q=>q.gone&&q.y1-q.y0>2.4).length;if(b.hp<=0||lost/b.walls>.42)collapse(b,b.kind.toLowerCase()+' collapses');}}
function removeBox(q){if(q.gone)return;q.gone=true;S.sc.remove(q.m);const k=S.solid.indexOf(q.m);if(k>=0)S.solid.splice(k,1);const j=S.blds.indexOf(q);if(j>=0)S.blds.splice(j,1);if(q.bid!=null&&S.BLD[q.bid])(S.dirtyB||(S.dirtyB=new Set())).add(S.BLD[q.bid]);}
function collapse(c,why){if(c.down)return;c.down=true;const ys=c.parts.map(q=>q.y0),y0=Math.min(...ys);
  for(const q of c.parts)if(q.y0>y0+.5||c.kind==='BUNKER'||c.kind==='DUGOUT'||c.kind==='COMMAND POST')removeBox(q);
  mergeB(c);if(S.dirtyB)S.dirtyB.delete(c);const h=Math.min(3.5,1+(c.fl||1)*.6),rb=new THREE.Mesh(new THREE.BoxGeometry(c.w*.9,h,c.d*.9),new THREE.MeshLambertMaterial({color:0x6d665a}));rb.position.set(c.x,y0+h/2,c.z);rb.rotation.y=(rn()-.5)*.3;S.sc.add(rb);
  smoke(new V3(c.x,y0+2,c.z));for(let i=0;i<6;i++)smoke(new V3(c.x+(rn()-.5)*c.w,y0+3,c.z+(rn()-.5)*c.d));
  for(const u of[...S.us,...S.them])if(u.alive&&Math.abs(u.m.position.x-c.x)<c.w/2+.5&&Math.abs(u.m.position.z-c.z)<c.d/2+.5)hitMan(u,400,false);
  if(Math.abs(S.pos.x-c.x)<c.w/2&&Math.abs(S.pos.z-c.z)<c.d/2)hurt(120,'blast');
  if(c.kind==='COMMAND POST'){if(c.mast)S.sc.remove(c.mast);if(c.side==='E'){S.eCP=true;S.pend=null;say('ENEMY COMMAND POST DESTROYED · THEIR RADIO IS SILENT',4);}else{S.fCP=true;say('OUR COMMAND POST IS DESTROYED · NO MORE OFFENSIVES',4);}}
  else say(why.toUpperCase(),2.5);S.collapsed=(S.collapsed||0)+1;}

// ARMOUR: a hit on an armoured vehicle is worked out by where it struck (hull or turret; front, side, rear, top; tracks),
// the plate there and the angle it met, against the weapon's penetration (game values by class, not data for any real
// vehicle or round). It bounces (ricochet), stops in the armour, or penetrates and damages what is behind: crew,
// engine, transmission, tracks, gun, optics, fuel, ammunition. The overview shows it on a diagram.
const PEN={RPG:420,ATGM:780,FPV:300,TANK:650,RIFLE:8,CARB:7,SMG:4,SHOT:3,LMG:8,DMR:12,SNP:22,PISTOL:3};
const ARMT={MBT:{hull:{front:550,side:90,rear:45,top:30},turret:{front:680,side:230,rear:70,top:40},dim:[3.6,2.6,7.6],tz:2.0},IFV:{hull:{front:45,side:28,rear:20,top:16},turret:{front:40,side:25,rear:20,top:15},dim:[3.1,2.9,6.6],tz:2.3},APC:{hull:{front:16,side:11,rear:9,top:8},turret:{front:10,side:10,rear:10,top:8},dim:[3.1,2.4,6.6],tz:9}};
const COMP={front:['driver','transmission','gun breech','gunner sight'],side:['ammunition','fuel tank','crew','road wheels'],rear:['engine','fuel tank','transmission'],top:['commander','gunner','ammunition','optics'],tracks:['track']};
function vkind(v){return v.tank?'MBT':v.m.userData.gun?'IFV':'APC';}
function armorHit(v,pt,dir,wpn){const k=vkind(v),A=ARMT[k],P=v.m.position,ry=v.m.rotation.y,c=Math.cos(-ry),s2=Math.sin(-ry);
  const dx=pt.x-P.x,dz=pt.z-P.z,lx=dx*c-dz*s2,lz=dx*s2+dz*c,ly=pt.y-P.y,ldx=dir.x*c-dir.z*s2,ldz=dir.x*s2+dir.z*c;
  const turret=ly>A.tz&&Math.abs(lz)<A.dim[2]*.35,part=turret?'turret':'hull';let face,n;
  if(dir.y<-.55&&(wpn==='ATGM'||wpn==='FPV')){face='top';n=new V3(0,1,0);}else{const ax=Math.abs(lx)/(A.dim[0]/2),az=Math.abs(lz)/(A.dim[2]/2);if(az>=ax){face=lz<0?'front':'rear';n=new V3(0,0,lz<0?-1:1);}else{face='side';n=new V3(Math.sign(lx)||1,0,0);}}
  const tracks=face==='side'&&!turret&&ly<.95;const t=A[part][face]*(tracks?.5:1);const cos=Math.abs(n.x*ldx+n.y*dir.y+n.z*ldz),ang=Math.round(Math.acos(Math.min(1,cos))*180/Math.PI);
  const eff=t/Math.max(.18,cos),pen=(PEN[wpn]||8)*(.9+rn()*.2);let res,dmg=[];
  if(cos<.34&&pen<eff*1.4)res='RICOCHET';else if(pen<eff)res='NO PENETRATION';else res='PENETRATED';
  if(res==='PENETRATED'){const L=tracks?COMP.tracks.slice():COMP[face].slice();const n2=1+((rn()*Math.min(3,1+(pen-eff)/150))|0);for(let i=0;i<n2&&L.length;i++)dmg.push(L.splice((rn()*L.length)|0,1)[0]);
    v.crew=v.crew??(k==='MBT'?(S.en==='R'?3:4):3);
    for(const d of dmg){if(/driver|crew|commander|gunner$/.test(d))v.crew--;if(/engine|transmission|track|road wheels/.test(d))v.immob=true;if(/gun breech|gunner sight|optics/.test(d))v.nofire=true;}
    const cook=dmg.includes('ammunition')&&rn()<(k==='MBT'&&S.en==='R'?.75:.4),fire=dmg.includes('fuel tank')&&rn()<.4;
    const st=cook?'DESTROYED · AMMUNITION DETONATED':fire?'DESTROYED · FIRE':v.crew<=1?'KNOCKED OUT · CREW ABANDONS':v.immob&&v.nofire?'MOBILITY AND FIREPOWER KILL':v.immob?'MOBILITY KILL':v.nofire?'FIREPOWER KILL':'DAMAGED';
    if(/DESTROYED|KNOCKED/.test(st)){hitVeh(v,1e6,true);if(cook&&v.m.userData.tu){v.m.userData.tu.position.y+=1.5;v.m.userData.tu.rotation.z=.8;}}res+=' · '+st;}
  else if(wpn==='RPG'||wpn==='ATGM'||wpn==='FPV')hitVeh(v,40,true);
  const rec={name:v.name||({MBT:'main battle tank',IFV:'infantry fighting vehicle',APC:'armoured personnel carrier'}[k]),k,part,face:tracks?'tracks':face,ang,t:Math.round(t),eff:Math.round(eff),pen:Math.round(pen),res,dmg,lx,lz,ly,wpn};S.armLog.push(rec);showArm(rec);return rec;}
function showArm(r){let el=document.getElementById('iArm');if(!el){el=document.createElement('div');el.id='iArm';el.style.cssText='position:absolute;right:16px;top:70px;width:250px;background:rgba(10,14,12,.82);border:1px solid #4a5e52;padding:8px;font-size:11px;line-height:1.45;transition:opacity .4s';S.hud.appendChild(el);}
  const ok=/PENETRATED/.test(r.res);el.innerHTML='<b style="color:#9fe0b8">HIT · '+esc(r.name.toUpperCase())+'</b><canvas id="iArmC" width="230" height="96" style="display:block;margin:5px 0"></canvas>'+
   esc(r.wpn)+' → '+r.part.toUpperCase()+' '+r.face.toUpperCase()+' · '+r.ang+'° off normal<br>Armour '+r.t+' mm · effective '+r.eff+' mm · penetration '+r.pen+' mm<br><b style="color:'+(ok?'#ff8a6a':'#ffe14a')+'">'+esc(r.res)+'</b>'+(r.dmg.length?'<br>Damaged: '+esc(r.dmg.join(', ')):'');
  const c=document.getElementById('iArmC').getContext('2d'),A=ARMT[r.k];c.clearRect(0,0,230,96);c.strokeStyle='#9fb8a8';c.lineWidth=1;c.font='9px monospace';
  const k=10,tw=A.dim[0]*k,tl=A.dim[2]*k;c.strokeRect(55-tw/2,48-tl/2,tw,tl);if(r.k!=='APC')c.strokeRect(55-tw*.35,48-tl*.2,tw*.7,tl*.4);c.fillStyle='#9fb8a8';c.fillText('TOP · FRONT ↑',4,10);
  const sl=A.dim[2]*13,sh=A.dim[1]*10;c.strokeRect(120,74-sh*.6,sl,sh*.6);if(r.k!=='APC')c.strokeRect(120+sl*.3,74-sh,sl*.4,sh*.4);c.fillText('SIDE · FRONT ←',120,10);
  c.fillStyle=ok?'#ff5a4a':'#ffe14a';c.beginPath();c.arc(55+r.lx*k,48+r.lz*k,3.5,0,7);c.fill();c.beginPath();c.arc(120+(r.lz/A.dim[2]+.5)*sl,74-Math.min(sh,r.ly*10),3.5,0,7);c.fill();
  el.style.opacity=1;clearTimeout(showArm.t);showArm.t=setTimeout(()=>{if(el)el.style.opacity=0;},7000);}

// FPV YOU PLACE: F puts a drone on the ground in front of you; an operator back at base takes it over, lifts it and
// flies it into the best target it finds (armour first). V shows its video feed until it strikes.
function placeFpv(){if(S.phase!=='FIGHT')return;if(S.fpvKit<=0){say('NO FPV DRONES LEFT',1.5);return;}S.fpvKit--;const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw)),p=S.pos.clone().addScaledVector(f,1.5);p.y=H(p.x,p.z)+.15;
  const m=dMesh('FPV',0x2b2f2b);m.position.copy(p);const d={k:'FPV',side:'F',m,hp:10,alive:true,t:0,cool:0,name:'FPV attack drone (yours)',spd:32,mine:true,wait:4};S.drones.push(d);S.myFpv.push(d);
  say('FPV PLACED · OPERATOR AT BASE TAKING CONTROL'+(S.fpvKit?' · '+S.fpvKit+' LEFT':''),3);return d;}
function feedView(){const d=S.myFpv.find(x=>x.alive&&x.wait<=0);if(!d){S.feed=null;say('NO DRONE IN THE AIR',1.5);return;}S.feed=S.feed===d?null:d;}
// MEDEVAC: H calls a helicopter to a landing zone near you; the wounded near it are flown out, and you are treated if you
// stand by it. One at a time, three a battle.
function medevac(){if(S.phase!=='FIGHT'||S.med)return;if(S.medN>=3){say('NO MORE MEDEVAC THIS BATTLE',2);return;}const wounded=S.us.filter(u=>u.down&&!u.evac).length;if(!wounded&&S.hp>=99){say('NO CASUALTIES TO EVACUATE',2);return;}
  S.medN++;const f=new V3(-Math.sin(S.yaw),0,-Math.cos(S.yaw));const lz=S.pos.clone().addScaledVector(f,-22);lz.y=H(lz.x,lz.z);const h=helo(0x46503f);h.position.set(lz.x-600,lz.y+120,lz.z+600);S.sc.add(h);
  const cross=new THREE.Mesh(new THREE.PlaneGeometry(2,6),new THREE.MeshBasicMaterial({color:0xd03030}));cross.rotation.x=-Math.PI/2;h.add(cross);cross.position.set(0,2.85,0);
  S.med={h,lz,t:0,st:'IN',from:h.position.clone()};say('MEDEVAC INBOUND · LANDING ZONE 20 M BEHIND YOU · ABOUT 25 S',3);}
const grassStep={M:new THREE.Matrix4(),q:new THREE.Quaternion(),e:new THREE.Euler(),s:new V3(),v:new V3()};
function v381Step(dt){
  if(S.grass){if(!S.gj&&(!S.gp||S.gp.distanceTo(S.pos)>14)){S.gp=S.pos.clone();S.gj={c:S.pos.clone(),n:0,i:0};}
    const J=S.gj;if(J){const M=grassStep.M,q=grassStep.q,e=grassStep.e,sc3=grassStep.s,v=grassStep.v;const lim=Math.min(J.i+900,6000);
      for(;J.i<lim&&J.n<3600;J.i++){const a=rn()*6.283,r=Math.sqrt(rn())*48,x=J.c.x+Math.cos(a)*r,z=J.c.z+Math.sin(a)*r;if(!green(x,z,1.2))continue;e.set(0,rn()*3.14,0);q.setFromEuler(e);const k=.6+rn()*.9;sc3.set(k,k*(.7+rn()*.8),k);v.set(x,H(x,z)-.02,z);M.compose(v,q,sc3);S.grass.setMatrixAt(J.n++,M);}
      S.grass.instanceMatrix.needsUpdate=true;if(J.i>=6000||J.n>=3600){S.grass.count=J.n;S.gj=null;}else S.grass.count=Math.max(S.grass.count,J.n);}}
  for(const d of S.myFpv){if(!d.alive)continue;if(d.wait>0){d.wait-=dt;if(d.wait<=0)say('OPERATOR: DRONE UP · LOOKING FOR A TARGET (V FOR THE FEED)',2.5);continue;}
    if(!d.dive){d.m.position.y+=8*dt;if(d.m.position.y>H(d.m.position.x,d.m.position.z)+25)d.dive=true;}}
  if(S.feed&&!S.feed.alive){S.feed=null;say('FEED LOST · DRONE STRUCK',2);}
  const M=S.med;if(M){M.t+=dt;const P=M.h.position;M.h.userData.rotor.rotation.y+=dt*30;
    if(M.st==='IN'){const u=Math.min(1,M.t/22);P.lerpVectors(M.from,new V3(M.lz.x,M.lz.y+(u>.8?(1-u)*200:40),M.lz.z),u);if(u>=1){P.copy(M.lz);M.st='DOWN';M.t=0;say('MEDEVAC ON THE GROUND · WOUNDED BEING LOADED',3);}}
    else if(M.st==='DOWN'){for(const u of S.us)if(u.down&&!u.evac&&u.m.position.distanceTo(M.lz)<70){u.evac=true;S.evac++;u.m.visible=false;}
      if(S.pos.distanceTo(P)<12&&S.hp<100){S.hp=100;say('TREATED BY THE MEDEVAC CREW · HEALTH RESTORED',2.5);}if(M.t>20){M.st='OUT';M.t=0;say('MEDEVAC LIFTING · '+S.evac+' EVACUATED SO FAR',2.5);}}
    else{P.y+=dt*15;P.x+=dt*40;if(M.t>15){S.sc.remove(M.h);S.med=null;}}}
  for(const c of S.STR)if(c.kind==='COMMAND POST'&&c.side==='E'&&!c.down&&!c.taken&&Math.abs(S.pos.x-c.cx)<3.5&&Math.abs(S.pos.z-c.cz)<3&&!S.them.some(u=>u.alive&&Math.hypot(u.m.position.x-c.cx,u.m.position.z-c.cz)<30)){c.taken=true;S.eCP=true;S.pend=null;say('ENEMY COMMAND POST TAKEN · THEIR RADIO IS SILENT',4);}
  if(S.eCP)S.pend=null;}

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
    if(d.k==='FPV'){if(d.mine&&!d.dive)continue;const mv=d.mine?S.veh.filter(v=>v.alive&&v.side==='E').sort((a,b)=>a.m.position.distanceTo(P)-b.m.position.distanceTo(P))[0]:null;const tg=mv?mv.m.position.clone().setY(mv.m.position.y+2.6):droneTarget(d);if(!tg){d.alive=false;continue;}const dir=tg.clone().add(new V3(0,tg===S.pos?-.6:1,0)).sub(P),L=dir.length();
      // weave on the approach, then dive
      dir.normalize();if(L>30)dir.x+=Math.sin(d.t*3)*.3;P.addScaledVector(dir.normalize(),d.spd*dt);d.m.lookAt(tg);if(L<2.2){if(d.mine){const v=S.veh.find(v=>v.alive&&v.side==='E'&&v.m.position.distanceTo(P)<5);if(v)armorHit(v,P.clone(),dir.clone(),'FPV');}blast(P.clone(),7,170,d.side==='F');d.alive=false;}}
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
  txt=(r==='WON'?'Your squad takes and holds '+S.loc.name+'.':r==='HELD'?'The trenches before '+S.loc.name+' hold against '+S.wave+' waves.':r==='LOST'?'The enemy takes the trenches before '+S.loc.name+'.':r==='KIA'?'You are killed in action.':'You withdraw from the fight.')+' Enemy killed by you: '+S.kills+(S.vk?' (vehicles '+S.vk+')':'')+'; your squad lost '+S.lost+' of 6.'+(S.ff?' Friendly fire: '+S.ff+'.':'')+(S.dk?' Drones you shot down: '+S.dk+'.':'')+(S.wia?' Wounded '+S.wia+', evacuated '+S.evac+'.':'')+(S.armLog.length?' Hits on armour: '+S.armLog.length+' ('+S.armLog.filter(a=>/PENETRATED/.test(a.res)).length+' penetrated).':'')+(S.collapsed?' Structures destroyed: '+S.collapsed+'.':'');
  if(st)W.emit('INFANTRY',{e:[S.cfg.a3],txt:(p?p.n+': ':'')+txt});
  if(S.cfg.camp&&typeof CAMP!=='undefined'&&CAMP.st&&S.cs!=null){const C=CAMP.st,i=S.cs,ms=0;   // side 0 is always the player's side in the campaign
    // a win pushes the sector toward the enemy (the player's side advances toward -z) and wears down its units there; a loss the other way
    if(r==='WON'||r==='HELD'){C.front[i]-=r==='HELD'?800:1500;for(const u of C.units)if(!u.dead&&u.i===i&&u.s!==ms)u.hp=Math.max(5,(u.hp||100)-15);}
    else if(r==='KIA'){for(const u of C.units)if(!u.dead&&u.i===i&&u.s===ms){u.hp=Math.max(5,(u.hp||100)-5);break;}}
    CAMP.log('Infantry, sector '+(i+1)+': '+txt,(r==='WON'||r==='HELD')?'b':'r');try{CAMP.save();}catch(e){}}
  const ws=window.WSORTIE&&WSORTIE.WS;if(ws&&ws.kills)ws.kills.gnd+=S.kills;say(TTL(r),4);
  const good=r==='WON'||r==='HELD';
  const d=document.createElement('div');d.className='u2m';d.id='u2m';d.dataset.k='idebrief';d.style.zIndex=9995;d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','u2t');
  d.innerHTML='<div class="bx" style="border-top-color:'+(good?'#8fae6a':r==='KIA'||r==='LOST'?'#c4432e':'#cfa94f')+'"><header class="mh"><div class="mk">INFANTRY · AFTER ACTION</div><h2 id="u2t">INFANTRY DEBRIEF — '+TTL(r)+'</h2></header>'+
    '<div class="mb"><section class="sec"><h3>OUTCOME</h3><div class="verdict">'+esc(txt)+'</div></section>'+
    '<section class="sec"><h3>RESULTS</h3><div class="kpis"><div class="kp"><b>'+(S.kills|0)+'</b><span>Kills</span></div><div class="kp"><b>'+S.shots+' / '+S.hits+'</b><span>Shots / hits</span></div><div class="kp"><b>'+Math.round(S.t)+' s</b><span>Time</span></div></div>'+
    '<div class="row" style="margin-top:8px"><span>Insertion</span><b>'+esc(INS[S.ins])+'</b></div></section>'+
    (r==='WON'&&(S.fr||S.cfg.camp)?'<div class="note">The front line in this sector moves forward a little.</div>':'')+'</div>'+
    '<footer class="mf"><span></span><div class="r"><button class="go" data-iend="1">CONTINUE</button></div></footer></div>';document.body.appendChild(d);
  d.querySelector('[data-iend]').onclick=()=>{d.remove();stop(false);};if(document.pointerLockElement)document.exitPointerLock();}
function stop(early,why){if(!S)return;if(early&&!S.res){end(why||'LEFT');return;}unbind();if(S.WM)worldOff();S.cv.remove();S.hud.remove();try{S.R&&S.R.dispose();}catch(e){}if(typeof game!=='undefined')game.paused=S0.paused;S=null;}
window.INFANTRY={armorHit,placeFpv,feedView,medevac,structHit,collapse,PEN,ARMT,startWorld,dig,offensive,arty,battleStep,ROLE,spawnDrone,K,PRI,LAU,ARM,INS,kitMenu,start,step:(dt,n)=>{for(let i=0;i<(n||1);i++)step(dt);},get S(){return S;},stop,end,shoot,grenade,land,v:377};
})();
