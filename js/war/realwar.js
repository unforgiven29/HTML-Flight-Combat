/* =====================================================================================================================
   v357 — real formations, more quotations, the carrier in the world war, convoys on the roads.
   * REAL FORMATION NAMES (data/nat/units.txt; public, well known): the order of battle of 18 countries (USA, UK,
     France, Germany, Poland, Ukraine, Russia, China, South Korea, Japan, Taiwan, India, Turkey, Israel, Italy, Spain,
     Australia, Canada) uses real squadron, wing,
     regiment, brigade and division names in order. Their positions, strengths, commanders and fate in this war are
     fictional. Other countries keep generic numbered names. Labelled in the FORCES tab.
   * QUOTATION ARCHIVE: four more verified anti-war quotations with author, occasion, date and source; the epilogue
     picks one per war.
   * THE CARRIER (ch.06 carrier as a moving airbase; ch.13): a country at war with carriers offers FLY FROM THE
     CARRIER (for carrier-capable aircraft): the world loads at the country's base nearest open sea, the carrier is
     placed on a long straight leg of open water, you launch from catapult 1 and recover with the game's own carrier
     systems (hook, arresting wires, LSO). The carrier stays in place across floating-origin shifts.
   * CONVOYS ON THE ROADS (ch.06 logistics as a network; ch.11 transport): during a world sortie, enemy supply
     convoys (six lorries) drive along the real highways of the loaded region behind their line; each lorry destroyed
     takes stock from the enemy depot that feeds that front (deep.js). The depot network's links are cut for real
     when a destroyed bridge (supply.js) lies within 20 km of the route.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WSORTIE)return;
const W=WWAR,G=WGEO,WS=WSORTIE.WS,rn=Math.random;
/* ------------------------------------------------------------------ real formation names */
const UN=(window.NATDATA&&NATDATA.UNITS)||{};
function rename(){const st=W.st;if(!st||!st.ob)return;for(const[a3,K]of Object.entries(UN)){if(!st.ob.by[a3])continue;const U=W.ob.units(a3);
  for(const[kind,names]of Object.entries(K)){const L=U.filter(u=>u.kind===kind&&u.num);let i=0;for(const u of L){if(u._real)continue;const used=new Set(L.filter(x=>x._real).map(x=>x.name));while(i<names.length&&used.has(names[i]))i++;if(i>=names.length)break;
    u.genName=u.name;u.name=names[i++];u._real=1;u.hist.push([st.t,'identified as '+u.name]);}}}}
W.daily.push(()=>{try{rename();}catch(e){}});
if(window.NATPANEL&&NATPANEL.tabs){const nt=NATPANEL;const add=(p,h)=>UN[p.a3]?'<div style="font-size:10px;color:#c9b46b">Real formation names (public); their positions, strengths, commanders and fate in this war are fictional.</div>'+h:h;
  if(nt.tabs.LAND){const _l=nt.tabs.LAND;nt.tabs.LAND=p=>add(p,_l(p));}}
/* ------------------------------------------------------------------ quotations */
if(W.endscreen&&W.endscreen.QUOTES){const Q=W.endscreen.QUOTES;Q.push(
  {q:'I hate war as only a soldier who has lived it can, only as one who has seen its brutality, its futility, its stupidity.',a:'Dwight D. Eisenhower',w:'Address in Ottawa, Canada',d:'10 January 1946',s:'Eisenhower Presidential Library, speeches collection'},
  {q:'Mankind must put an end to war — or war will put an end to mankind.',a:'John F. Kennedy',w:'Address before the General Assembly of the United Nations',d:'25 September 1961',s:'Public Papers of the Presidents: John F. Kennedy, 1961'},
  {q:'The world has achieved brilliance without wisdom, power without conscience. Ours is a world of nuclear giants and ethical infants.',a:'Omar N. Bradley',w:'Armistice Day address, Boston',d:'10 November 1948',s:'Collected Writings of General Omar N. Bradley'},
  {q:'I have seen war. I have seen war on land and sea. … I hate war.',a:'Franklin D. Roosevelt',w:'Address at Chautauqua, New York',d:'14 August 1936',s:'Public Papers and Addresses of Franklin D. Roosevelt, 1936'},
  {q:'My first wish is to see this plague of mankind, war, banished from the earth.',a:'George Washington',w:'Letter to David Humphreys',d:'25 July 1785',s:'The Papers of George Washington, Confederation Series, vol. 3'},
  {q:'Older men declare war. But it is the youth that must fight and die.',a:'Herbert Hoover',w:'Address to the Republican National Convention, Chicago',d:'27 June 1944',s:'Addresses upon the American Road, 1941-1945'});
  const ch=W.endscreen.CH.find(c=>c[0]==='A final quotation');if(ch)ch[1]=()=>{const st=W.st,q=Q[Math.abs((st.seq||0)+Math.floor((st.over&&st.over.t)||0))%Q.length];
    const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    return '<div class="q">“'+esc(q.q)+'”</div><div style="text-align:center">— '+esc(q.a)+', '+esc(q.w)+', '+esc(q.d)+'<br><span class="est">Source: '+esc(q.s)+'</span></div><p class="est" style="text-align:center">A reflection, not a verdict on you.</p>';};}
/* ------------------------------------------------------------------ the carrier */
const CVC={on:false,ll:null};
async function fromCarrier(a3){const p=W.st.c[a3];if(!p||!p.nav||!p.nav.cv||typeof CV==='undefined')return false;if(window.CV_AC&&!CV_AC.has(game.ac)){flash('PICK A CARRIER AIRCRAFT IN THE HANGAR (F/A-18, F-14, Su-33…)',3500);return false;}
  const L=WSORTIE.basesFor(a3).slice(0,4);for(const x of L){await WSORTIE.start(a3,x.a);if(!WS.on)return false;
    // open water within the loaded region, a long straight leg
    let site=null;for(let R=25000;R<=75000&&!site;R+=5000)for(let ang=0;ang<360&&!site;ang+=15){const sx=Math.sin(ang*Math.PI/180)*R,sz=-Math.cos(ang*Math.PI/180)*R;if(groundAt(sx,sz)>-15)continue;
      for(let h=0;h<360;h+=30){const fx=Math.sin(h*Math.PI/180),fz=-Math.cos(h*Math.PI/180);let ok=true;for(let s=-4000;s<=22000;s+=2000)if(groundAt(sx+fx*s,sz+fz*s)>-15){ok=false;break;}if(ok){site={x:sx,z:sz,h};break;}}}
    if(!site){WSORTIE.finish();continue;}
    CV._tm=(x,z)=>groundAt(x,z);const _site=CV.site;CV.site=()=>site;CV.setup();CV.site=_site;CV.name=(p.a3==='RUS'?'Admiral Kuznetsov':p.a3==='CHN'?'Shandong':p.a3==='FRA'?'Charles de Gaulle':p.a3==='GBR'?'HMS Queen Elizabeth':p.a3==='IND'?'INS Vikrant':'CVN')+' ('+p.n+')';
    try{CV.spotCat(player,0);}catch(e){}CVC.on=true;CVC.ll=G.xz2ll(CV.pos.x,CV.pos.z);if(typeof radio==='function')radio(CV.name+' · cat 1 · run up to MIL to launch. Recover with gear, flaps and hook down, Case I.');return true;}
  flash('NO OPEN SEA NEAR '+p.n.toUpperCase()+'\'S BASES',3000);return false;}
if(window.WF){const _r=WF.rebase;WF.rebase=async function(){const on=CVC.on&&typeof CV!=='undefined'&&CV.on,ll=on?G.xz2ll(CV.pos.x,CV.pos.z):null;const r=await _r.apply(this,arguments);if(on&&CV.on){const q=G.ll2xz(ll.lat,ll.lon);CV.pos.x=q.x;CV.pos.z=q.z;CV.sync();}return r;};}
{const _f=WSORTIE.finish;WSORTIE.finish=function(){const r=_f.apply(this,arguments);if(CVC.on&&typeof CV!=='undefined'){CV.clear();CVC.on=false;}return r;};}
if(window.WARMAP&&WARMAP.after)WARMAP.after.push(()=>{const box=document.getElementById('wsFly');if(!box||box.querySelector('[data-cvs]'))return;const a3=WARMAP.UI.sel,p=a3&&W.st.c[a3];if(!p||!p.nav||!p.nav.cv)return;
  box.insertAdjacentHTML('beforeend','<div class="tc" style="margin-top:4px"><button data-cvs="'+a3+'">FLY FROM THE CARRIER ('+p.nav.cv+' in service)</button></div>');});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cvs]');if(b)fromCarrier(b.dataset.cvs);});
/* ------------------------------------------------------------------ convoys on the roads */
const CNV={list:[],t:60};
function convoy(){if(!WS.on||!WS.front||!window.WNET||!player)return;const n=WS.front,enemyA3=n.enemyIsB?n.f.b:n.f.a,sg=n.enemyIsB?1:-1;
  // a highway in the loaded region on the enemy's side of the line, 10-70 km from you
  const R=[];for(const[k,c]of (WF.cells||new Map())){for(const r of c.r||[]){const pts=[];for(let i=1;i<r.length;i+=2)pts.push(G.ll2xz(r[i+1]/1000,r[i]/1000));if(pts.length<4)continue;const m=pts[(pts.length/2)|0],ll=G.xz2ll(m.x,m.z),side=((ll.lat-n.p.lat)*n.s.ny+(ll.lon-n.p.lon)*n.s.nx)*sg;
    const d=Math.hypot(m.x-player.pos.x,m.z-player.pos.z);if(side>0&&d>10000&&d<70000&&groundAt(m.x,m.z)>2)R.push(pts);}}
  if(!R.length)return;const pts=R[(rn()*R.length)|0],L=[];
  for(let i=0;i<6;i++){if(typeof GTY==='undefined'||!GTY.TRUCK)break;const p=pts[0];const u=GND.add('TRUCK',1,p.x-i*40,p.z,0);u._ws=enemyA3;u._depot=(W.st.dep&&W.st.dep[enemyA3]&&W.st.dep[enemyA3][1]||{}).n;u._route=pts;u._k=0;u._off=-i*40;u.callsign='Supply convoy ('+W.st.c[enemyA3].n+')';WS.ground.push(u);L.push(u);}
  CNV.list.push(L);const m=pts[(pts.length/2)|0];if(typeof radio==='function')radio('DARKSTAR: enemy supply convoy on the highway, '+String(Math.round(brgTo(player.pos.x,player.pos.z,m.x,m.z))).padStart(3,'0')+' for '+Math.round(cd2(player.pos.x,player.pos.z,m.x,m.z)/NM)+' miles.',false);}
setInterval(()=>{if(!WS.on||typeof game==='undefined'||!game.active){CNV.list=[];CNV.t=60;return;}CNV.t-=1;if(CNV.t<=0){CNV.t=300+rn()*300;try{convoy();}catch(e){console.warn('[convoy]',e);}}
  for(const L of CNV.list)for(const u of L){if(!u.alive||!u._route)continue;const P=u._route;let k=u._k;if(k>=P.length-1)continue;const a=P[k],b=P[k+1],dx=b.x-u.pos.x,dz=b.z-u.pos.z,d=Math.hypot(dx,dz);
    if(d<15){u._k++;continue;}const v=Math.min(12,d);u.pos.x+=dx/d*v;u.pos.z+=dz/d*v;u.pos.y=groundAt(u.pos.x,u.pos.z);u.hdg=(Math.atan2(dx,-dz)*180/Math.PI+360)%360;if(u.mesh){u.mesh.position.copy(u.pos);u.mesh.rotation.y=-u.hdg*Math.PI/180;}}},1000);
// depot links: a destroyed bridge within 20 km of a route cuts it for real
if(W.deep&&W.deep.network){const _n=W.deep.network;W.deep.network=function(){const st=W.st,cut=Object.keys((st.br&&st.br.cut)||{}).map(k=>{const m=/BR@(-?[\d.]+),(-?[\d.]+)/.exec(k);return m?{lat:+m[1],lon:+m[2]}:null;}).filter(Boolean);
  if(cut.length&&st.dep)for(const[a3,L]of Object.entries(st.dep)){const cap=L[0];for(const d of L.slice(1)){const near=cut.some(b=>{for(let t=0;t<=1;t+=.1){if(G.dist(cap.lat+(d.lat-cap.lat)*t,cap.lon+(d.lon-cap.lon)*t,b.lat,b.lon)<20e3)return true;}return false;});d.cutRoute=near;}}
  return _n.apply(this,arguments);};}
W.realwar={rename,fromCarrier,convoy,CVC,CNV};
})();
