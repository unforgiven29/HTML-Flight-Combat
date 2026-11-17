/* =====================================================================================================================
   v328 — world war, step 2: FLY IN THE WAR. Pick a country at war on the WORLD MAP and one of its real military
   airfields; you take off there (world flight: real terrain, runways, towns) into the war the world-war state describes:
   * the nearest front is placed on the ground where WWAR says the line stands now: armour and infantry carriers on both
     sides of it, a SAM battery and anti-aircraft guns behind the enemy line;
   * enemy flights come in from that enemy's real military airfields (types by country), as often as its air strength in
     the theatre allows; a friendly CAP holds over the front;
   * tasking: CAS on the enemy armour at the front, SEAD on the battery, or CAP, called on the radio with bearing and range;
   * everything you do goes back into the world war: aircraft and vehicles you destroy come off that country's strength,
     losing your jet comes off yours, and the war diary records the sortie. The world war runs in real time while you fly.
   Presentation and wiring only: WWAR owns the war state, WF the world flight, GND / Jet / AI the tactical simulation.
   Gameplay-level model; the force figures it reads are the world war's labelled estimates.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WF||!window.WARMAP)return;
const W=WWAR,G=WGEO,D=Math.PI/180,esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rr=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
// fighter types by operator (filtered to what the hangar has); the side default when a country has none in the game
const TYPES={USA:['F-15C','F-16C','F-22','F-35A','F-18E','F-15E'],GBR:['EF-2000','F-35B'],DEU:['EF-2000'],ITA:['EF-2000','F-35A'],ESP:['EF-2000','F-18C'],FRA:['Rafale','Mirage 2000-5'],
  POL:['F-16C','F-35A'],NOR:['F-35A','F-16C'],DNK:['F-35A','F-16C'],NLD:['F-35A','F-16C'],BEL:['F-16C'],FIN:['F-18C','F-35A'],SWE:['JAS-39C'],TUR:['F-16C'],GRC:['F-16C','Mirage 2000-5'],
  ROU:['F-16C'],CZE:['JAS-39C'],HUN:['JAS-39C'],CAN:['F-18C'],JPN:['F-15J','F-35A','F-2A'],KOR:['F-15K','KF-21','F-16C'],AUS:['F-18F','F-35A'],PHL:['FA-50'],
  RUS:['Su-35S','Su-30SM','MiG-31','Su-27','MiG-29S'],CHN:['J-10C','J-16','J-11B','J-20'],BLR:['MiG-29S','Su-30SM'],PRK:['MiG-29','MiG-23','MiG-21']};
const DEF={B:['F-16C','F-15C','F-18C'],R:['MiG-29S','Su-27','Su-30SM']};
const typesOf=(a3,side)=>{const L=(TYPES[a3]||[]).filter(t=>typeof AC!=='undefined'&&AC[t]);return L.length?L:DEF[side].filter(t=>AC[t]);};
const WS={on:false,me:null,base:null,front:null,enemy:[],friend:[],ground:[],kills:{air:0,gnd:0},spawnT:0,capT:0,task:null,jets:new Set()};

/* ------------------------------------------------------------------ choosing where to fly from */
function nearestSector(lat,lon,side){const st=W.st;let best=null,bd=1e12;
  for(const f of st.fronts){const A=st.c[f.a],B=st.c[f.b];if(A.side!==side&&B.side!==side)continue;
    for(const s of f.sec){const p=W.linePt(s),d=G.dist(lat,lon,p.lat,p.lon);if(d<bd){bd=d;best={f,s,d,p,enemyIsB:A.side===side};}}}
  return best;}
function basesFor(a3){const p=W.st.c[a3],L=(W.milBases().get(a3)||[]).filter(a=>a.runways.some(r=>r.paved&&r.len_m>=1800));
  return L.map(a=>({a,n:nearestSector(a.lat,a.lon,p.side)})).filter(x=>x.n).sort((x,y)=>x.n.d-y.n.d).slice(0,10);}
function panelExtra(){const el=document.getElementById('wmWar');if(!el||!W.st)return;const sel=WARMAP.UI.sel,p=sel&&W.st.c[sel];
  let box=el.querySelector('#wsFly');if(box)box.remove();if(!p||!W.bell(p))return;
  const L=basesFor(p.a3);const h='<div id="wsFly" class="prof"><b>FLY FOR '+esc(p.n.toUpperCase())+'</b><div style="font-size:10px;color:#8a9a92">Military airfields, nearest to the front first. Your aircraft is the one picked in the hangar.</div>'+
    (L.length?L.map(x=>'<div class="tc" style="margin-top:3px"><button data-ws="'+esc(x.a.ident)+'">'+esc(x.a.name)+' · '+Math.round(x.n.d/1000)+' km from the front</button></div>').join(''):'<div style="font-size:10px">No military airfield with a long enough paved runway in the data.</div>')+'</div>';
  el.insertAdjacentHTML('afterbegin',h);}
WARMAP.after.push(panelExtra);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsFly [data-ws]');if(!b)return;const a=G.airports.find(q=>q.ident===b.dataset.ws);if(a)WSORTIE.start(WARMAP.UI.sel,a);});   /* through WSORTIE so leaders.js can refuse a grounded pilot */

/* ------------------------------------------------------------------ the war around you */
const xz=(lat,lon)=>G.ll2xz(lat,lon);
function placeFront(){const n=WS.front;if(!n)return;const sg=n.enemyIsB?1:-1,s=n.s;
  // along the line: three points 8 km apart; the enemy holds the side the normal points to when it is country b
  const tx=-s.ny,ty=s.nx;   // tangent (km frame: east, north)
  for(const k of[-1,0,1]){const base={lat:n.p.lat+ty*k*8/111.2,lon:n.p.lon+tx*k*8/(111.2*Math.cos(n.p.lat*D))};
    // vehicles look like the side that owns them: flying for REDFOR, the enemy armour is western and yours is not
    const red=W.st.c[WS.me].side==='R',eK=red?['MBTB','MBTB','IFVB','IFVB']:['MBTR','MBTR','IFVR','IFVR'],fK=red?['MBTR','IFVR','IFVR']:['MBTB','IFVB','IFVB'];
    for(const[side,off,kinds]of[[1,1.6*sg,eK],[0,-1.6*sg,fK]]){
      for(let i=0;i<kinds.length;i++){const lat=base.lat+s.ny*(off+rr(-.3,.3))/111.2,lon=base.lon+s.nx*(off+rr(-.3,.3))/(111.2*Math.cos(base.lat*D))+tx*(i-1.5)*.35/(111.2*Math.cos(base.lat*D));
        const p=xz(lat,lon);if(groundAt(p.x,p.z)<2)continue;const hd=(Math.atan2(-s.nx*sg*(side?-1:1),s.ny*sg*(side?-1:1))/D+360)%360;const u=GND.add(kinds[i],side,p.x,p.z,hd);u._ws=side?(n.enemyIsB?n.f.b:n.f.a):WS.me;WS.ground.push(u);}}}
  // a SAM battery 18 km behind the enemy line and two gun systems 4 km behind it
  const sp=(km,along)=>{const lat=n.p.lat+s.ny*km*sg/111.2+ty*along/111.2,lon=n.p.lon+(s.nx*km*sg+tx*along)/(111.2*Math.cos(n.p.lat*D));return xz(lat,lon);};
  // first dry, fairly flat spot 15-25 km behind the enemy line (lakes and coast are common at fronts)
  let c=null;for(const km of[18,15,22,25])for(const al of[0,-6,6,-12,12]){const q=sp(km,al);const h=groundAt(q.x,q.z);if(h>2&&Math.abs(groundAt(q.x+300,q.z)-h)<30&&Math.abs(groundAt(q.x,q.z+300)-h)<30){c=q;break;}}if(!c)c=sp(18,0);
  const hd=(Math.atan2(-s.nx*sg,s.ny*sg)/D+180+360)%360;
  if(groundAt(c.x,c.z)>2){const su=GND.add('SURN',1,c.x,c.z,hd),tels=[];for(const[dx,dz]of[[220,0],[-220,0],[0,220]]){const t=GND.add('TEL',1,c.x+dx,c.z+dz,hd);t.n=3;tels.push(t);}
    const S={surn:su,tels,st:'search',det:0,trk:null,salvo:0,nextL:0,sweep:0,notchT:0,msl:[],lostT:0};GND.sites.push(S);WS.site={x:c.x,z:c.z};for(const u of[su,...tels]){u._ws=n.enemyIsB?n.f.b:n.f.a;WS.ground.push(u);}}
  for(const al of[-5,5]){const z=sp(4,al);if(groundAt(z.x,z.z)<2)continue;const g=GND.add('ZSU',1,z.x,z.z,hd);GND.zsus.push(g);g._ws=n.enemyIsB?n.f.b:n.f.a;WS.ground.push(g);}}
function enemyBases(){const me=W.st.c[WS.me],out=[],B=W.milBases();
  for(const[a3,L]of B){const p=W.st.c[a3];if(!W.bell(p)||p.side===me.side||p.air<2)continue;for(const a of L){const d=G.dist(WS.base.lat,WS.base.lon,a.lat,a.lon);if(d<1100e3)out.push({a,a3,d});}}
  return out.sort((x,y)=>x.d-y.d).slice(0,12);}
function spawnFlight(side,a3,from,toLat,toLon,role){const types=typesOf(a3,W.st.c[a3].side);if(!types.length)return[];const type=pick(types),era='modern';
  // already airborne on the way in: placed at most 110 km from where it is going, on the line from its airfield
  const dTot=G.dist(from.lat,from.lon,toLat,toLon),f=Math.max(0,1-110e3/Math.max(1,dTot)),lat=from.lat+(toLat-from.lat)*f,lon=from.lon+(toLon-from.lon)*f;
  const p=xz(lat,lon),t=xz(toLat,toLon),hd=(Math.atan2(t.x-p.x,-(t.z-p.z))/D+360)%360,out=[];
  for(let i=0;i<2;i++){let j;try{j=new Jet(side,type,side?foeLoad(type,era):getLoad(era,type),era);}catch(e){return out;}
    j.spawn(p.x+(i?400:0),Math.max(groundAt(p.x,p.z)+1500,role==='CAP'?7500:6000)+i*100,p.z+(i?300:0),hd,230);j.ai=new AI(j);j.ai.skill(side?+SET.skill:1);
    j.ai.route=role==='CAP'?[{x:t.x-9000,z:t.z,alt:7500},{x:t.x+9000,z:t.z,alt:7500}]:[{x:t.x,z:t.z,alt:6000}];j.ai.wi=0;j.ai.engaged=false;j.ai.det=role==='CAP'?60000:90000;
    j.callsign=(side?'BANDIT ':'')+(G.byA3.get(a3)?G.byA3.get(a3).a2:a3)+' '+type;j._ws=a3;WS.jets.add(j);(side?WS.enemy:WS.friend).push(j);out.push(j);}
  return out;}
function airTick(dt){if(!WS.on||!player||!game.active)return;const me=W.st.c[WS.me];WS.spawnT-=dt;WS.capT-=dt;
  const alive=L=>L.filter(j=>j.alive).length,th=W.st.th.filter(t=>{const T=W.THEATRES.find(q=>q.id===t.id);return WS.base.lat>=T.lat[0]&&WS.base.lat<=T.lat[1];})[0];
  const enemyShare=th?(me.side==='B'?(1-th.sup)/2:(1+th.sup)/2):.5;   // more enemy flights where the enemy holds the air
  if(WS.spawnT<=0&&alive(WS.enemy)<8){WS.spawnT=rr(150,330)/(.4+enemyShare);const E=enemyBases();if(E.length){const e=pick(E.slice(0,6)),tgt=WS.front?WS.front.p:WS.base;
      const f=spawnFlight(1,e.a3,e.a,tgt.lat+rr(-.15,.15),tgt.lon+rr(-.2,.2),'SWEEP');if(f.length&&SET.calls==='ON')radio('DARKSTAR: two '+f[0].type+' of '+W.st.c[e.a3].n+' inbound from '+e.a.name+', '+Math.round(cd2(player.pos.x,player.pos.z,f[0].pos.x,f[0].pos.z)/NM)+' miles.',true);}}
  if(WS.capT<=0&&alive(WS.friend)<2&&WS.front){WS.capT=300;const tgt=WS.front.p,back={lat:tgt.lat-WS.front.s.ny*(WS.front.enemyIsB?1:-1)*.25,lon:tgt.lon};spawnFlight(0,WS.me,WS.base,back.lat,back.lon,'CAP');}}

/* ------------------------------------------------------------------ tasking */
function tasking(){const P=player,n=WS.front;if(!P)return;const opts=[];
  if(n){const p=xz(n.p.lat,n.p.lon);opts.push({k:'CAS',x:p.x,z:p.z,l:'CAS on the enemy armour at the '+W.st.c[n.f.a].n+' / '+W.st.c[n.f.b].n+' front'});}
  if(WS.site)opts.push({k:'SEAD',x:WS.site.x,z:WS.site.z,l:'SEAD on the SAM battery behind the enemy line'});
  if(n){const p=xz(n.p.lat,n.p.lon);opts.push({k:'CAP',x:p.x,z:p.z,l:'CAP over the front'});}
  const ag=typeof agTypes==='function'&&agTypes(P).length>0,t=opts.find(o=>ag?o.k!=='CAP':o.k==='CAP')||opts[0];WS.task=t;
  if(t){const b=String(Math.round(brgTo(P.pos.x,P.pos.z,t.x,t.z))).padStart(3,'0'),r=Math.round(cd2(P.pos.x,P.pos.z,t.x,t.z)/NM);setTimeout(()=>{if(WS.on)radio('Tasking: '+t.l+'. '+b+' for '+r+' miles.');},2500);}}

/* ------------------------------------------------------------------ results into the world war */
function credit(a3,kind,what){const p=W.st&&W.st.c[a3];if(!p)return;
  if(kind==='air'){p.air=Math.max(0,p.air-1);p.lostAir+=1;}else{const v=what==='SITE'?.15:.03;p.gnd=Math.max(0,p.gnd-v);p.lostGnd+=v;   // a vehicle is a small share of a brigade
    if(WS.front&&W.st.c[WS.me]){const s=WS.front.s;s.off+=(a3===WS.front.f.a?-1:1)*.05;}}}   // a few dozen metres of ground for the side that won the fight
{const _k=Jet.prototype.kill;Jet.prototype.kill=function(why,src){const was=this.alive,r=_k.apply(this,arguments);
  if(was&&!this.alive&&WS.on&&W.st)try{if(this===player){credit(WS.me,'air');WS.lost=1;}else if(this._ws){credit(this._ws,'air');if(src===player)WS.kills.air++;}}catch(e){console.warn('[ws]',e);}return r;};}
if(typeof GUnit!=='undefined'){const _k=GUnit.prototype.kill;GUnit.prototype.kill=function(src){const was=this.alive,r=_k.apply(this,arguments);
  if(was&&!this.alive&&WS.on&&this._ws&&W.st)try{credit(this._ws,'gnd',this.kind==='SURN'||this.kind==='TEL'?'SITE':'');if(src===player)WS.kills.gnd++;}catch(e){console.warn('[ws]',e);}return r;};}
function finish(){if(!WS.on)return;WS.on=false;W.run=false;W.speed=WS.speed0||6;const me=W.st&&W.st.c[WS.me];
  if(me)W.emit('SORTIE',{e:[WS.me],txt:'A '+me.n+' '+(player&&player.type||'')+' sortie from '+WS.base.name+': '+WS.kills.air+' aircraft and '+WS.kills.gnd+' ground targets destroyed'+(WS.lost?'; the aircraft was lost':'')+(WS.task?' · tasking: '+WS.task.k:'')+'.'});
  try{localStorage.setItem('viper.ww',JSON.stringify(W.st));}catch(e){}WS.enemy=[];WS.friend=[];WS.ground=[];WS.jets.clear();}

async function start(a3,ap){const p=W.st.c[a3];if(!W.bell(p))return;WS.me=a3;WS.base=ap;WS.kills={air:0,gnd:0};WS.lost=0;WS.site=null;WS.enemy=[];WS.friend=[];WS.ground=[];
  WS.front=nearestSector(ap.lat,ap.lon,p.side);
  let rw=0,bl=-1;ap.runways.forEach((r,i)=>{if(r.paved&&r.len_m>bl){bl=r.len_m;rw=i;}});
  await WF.start(ap,rw,'le');if(game.scen!=='WORLD'||!WF.on)return;
  WS.on=true;WS.speed0=W.speed;W.speed=1/3600;W.run=true;WS.spawnT=rr(60,140);WS.capT=20;
  if(WS.front&&WS.front.d<260e3)placeFront();tasking();
  if(window.WMAP)WMAP.close();
  flash('FLYING FOR '+p.n.toUpperCase()+(WS.front?' · FRONT '+Math.round(WS.front.d/1000)+' KM':''),4000);}
// the world-flight tick: AI traffic; ending the sortie or leaving the world closes it
{let last=performance.now();setInterval(()=>{const n=performance.now(),dt=Math.min(2,(n-last)/1000);last=n;try{airTick(dt);}catch(e){console.warn('[ws]',e);}
  if(WS.on&&(!WF.on||game.scen!=='WORLD'||!game.active))finish();},1000);}
window.WSORTIE={WS,start,finish,basesFor,nearestSector,typesOf};
})();
