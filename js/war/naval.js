/* =====================================================================================================================
   v335 — the war at sea (spec v49 ch.06 naval forces, carriers, maritime operations; ch.11 ports, shipping, maritime
   trade). Strategic layer (aggregate fleets, sea control per maritime theatre) and the ships you meet on a sortie.

   FLEETS (labelled ESTIMATES): every coastal country at war has carriers, surface combatants, submarines and amphibious
   ships. Carrier counts are the publicly known order of magnitude (a small table, approximate); the rest is estimated
   from GDP by a stated rule. "Coastal" = one of its places lies within 0.3 deg of open sea on the global grid.
   MARITIME THEATRES (10 boxes): North Atlantic, Norwegian & Barents Seas, Baltic Sea, Mediterranean, Black Sea, Sea of
   Japan, East China Sea, South China Sea, Philippine Sea & Western Pacific, Arabian Sea & Indian Ocean. A belligerent
   commits ships to the theatres its coast touches; a principal power also sends carriers and escorts to every theatre
   where its side fights (power projection).
   DAILY: square-law attrition per theatre (submarines and surface ships; carriers add strength while escorted), sea
   control from -1 (REDFOR) to +1 (BLUEFOR). Losses are events by ship type. A side that holds the sea (> 0.4) next
   to an enemy country cuts that country's seaborne imports (blockade: fuel and economy suffer, economy.js); amphibious
   ships let a side holding the sea push the nearest front a little (a landing threat ties down defenders).
   ON A SORTIE: if the base is near a maritime theatre where the enemy has ships, an enemy surface group (destroyers /
   frigates for BLUEFOR, a cruiser and missile boats for REDFOR, the game's anti-ship ships with their air defences) is
   at sea 70-140 km away and an anti-ship tasking is called; every ship sunk comes off that country's fleet there.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,G=WGEO,P=WWAR.diplo,rn=Math.random;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const SEAS=[{id:'NAT',name:'North Atlantic',lat:[40,66],lon:[-45,-5]},{id:'NOR',name:'Norwegian & Barents Seas',lat:[62,80],lon:[-5,60]},{id:'BAL',name:'Baltic Sea',lat:[53,66],lon:[9,31]},
  {id:'MED',name:'Mediterranean',lat:[30,46],lon:[-6,36]},{id:'BLK',name:'Black Sea',lat:[40,47.5],lon:[27,42]},{id:'SOJ',name:'Sea of Japan',lat:[33,52],lon:[127,142]},
  {id:'ECS',name:'East China Sea',lat:[24,34],lon:[119,131]},{id:'SCS',name:'South China Sea',lat:[2,24],lon:[105,121]},{id:'WPC',name:'Philippine Sea & Western Pacific',lat:[5,40],lon:[125,155]},
  {id:'IND',name:'Arabian Sea & Indian Ocean',lat:[-10,25],lon:[50,95]}];
const CARRIERS={USA:11,CHN:3,GBR:2,ITA:2,FRA:1,RUS:1,ESP:1,JPN:2,KOR:0,AUS:0,TUR:1};   // approximate, public order of magnitude (includes large deck aviation ships)
const inSea=(S,lat,lon)=>lat>=S.lat[0]&&lat<=S.lat[1]&&lon>=S.lon[0]&&lon<=S.lon[1];
function coastal(p){const pl=G.places.filter(q=>q.a3===p.a3).slice(0,40);for(const q of pl)for(const[a,b]of[[.3,0],[-.3,0],[0,.3],[0,-.3]])if(G.coarse(q.lat+a,q.lon+b)<-20)return true;return false;}
function fleet(p){if(p.nav!==undefined)return p.nav;if(!coastal(p))return p.nav=null;const g=Math.max(1,p.gdp/1000);
  const sur=Math.round(.9*Math.pow(g,.5)),sub=Math.round(.45*Math.pow(g,.45)),amp=Math.round(.2*Math.pow(g,.4)),cv=CARRIERS[p.a3]||0;
  return p.nav={cv,sur,sub,amp,cv0:cv,sur0:sur,sub0:sub,amp0:amp,lost:{cv:0,sur:0,sub:0,amp:0}};}
// which seas a country's coast touches
const seasOf=p=>{const c=G.byA3.get(p.a3);if(!c)return[];return SEAS.filter(S=>G.places.some(q=>q.a3===p.a3&&inSea({lat:[S.lat[0]-1,S.lat[1]+1],lon:[S.lon[0]-1,S.lon[1]+1]},q.lat,q.lon)));};
const N=()=>W.st.navy||(W.st.navy={th:{},seen:{}});   /* st.sea is the seasons record (seasons.js) */
function commit(){const st=W.st,n=N();for(const S of SEAS)n.th[S.id]=n.th[S.id]||{sup:0,f:{}};
  const sideSeas={B:new Set(),R:new Set()};
  for(const p of Object.values(st.c))if(bel(p)&&fleet(p))for(const S of seasOf(p))sideSeas[p.side].add(S.id);
  for(const S of SEAS){const t=n.th[S.id];t.f={};}
  for(const p of Object.values(st.c)){if(!bel(p)||!fleet(p))continue;const own=seasOf(p),fight=SEAS.filter(S=>sideSeas[p.side==='B'?'R':'B'].has(S.id)||own.some(o=>o.id===S.id));
    for(const S of own)n.th[S.id].f[p.a3]=(n.th[S.id].f[p.a3]||0)+.8/Math.max(1,own.length);
    // power projection by a principal power: weaker the further the sea is from home (halved at 3,000 km)
    const c=G.byA3.get(p.a3);if(p.al==='CORE'&&c)for(const S of fight){const d=G.dist(c.ly,c.lx,(S.lat[0]+S.lat[1])/2,(S.lon[0]+S.lon[1])/2)/1000;n.th[S.id].f[p.a3]=(n.th[S.id].f[p.a3]||0)+.25/Math.max(1,fight.length)/(1+d/3000);}}}
const power=(p,share)=>{const f=p.nav;return share*(f.sur*1+f.sub*1.3+f.cv*6*Math.min(1,f.sur/4)+f.amp*.4);};
function battle(){const st=W.st,n=N();
  for(const S of SEAS){const t=n.th[S.id],side={B:0,R:0};for(const a3 in t.f){const p=st.c[a3];if(!bel(p)||!p.nav)continue;side[p.side]+=power(p,t.f[a3]);}
    if(side.B<1||side.R<1){t.sup=side.B>side.R?(side.B>0?1:0):side.R>0?-1:0;continue;}
    t.sup=(side.B-side.R)/(side.B+side.R);const k=.004*(W.airWx?1:1);
    for(const a3 in t.f){const p=st.c[a3];if(!bel(p)||!p.nav)continue;const f=p.nav,opp=p.side==='B'?side.R:side.B,mine=p.side==='B'?side.B:side.R,loss=k*opp*Math.min(1,opp/mine)*t.f[a3];
      // losses fall on ship types in proportion to how many are at sea, carriers last
      const pool=[['sub',f.sub],['sur',f.sur],['amp',f.amp]],tot=pool.reduce((s,x)=>s+x[1],0);if(tot<=0)continue;
      for(const[k2,cnt]of pool){const exp=loss*cnt/tot;let whole=Math.floor(exp)+(rn()<exp%1?1:0);whole=Math.min(whole,f[k2]);if(whole>0){f[k2]-=whole;f.lost[k2]+=whole;
          W.emit('NAVAL',{e:[a3],cf:'REPORTED',txt:p.n+' loses '+whole+' '+{sub:'submarine',sur:'surface combatant',amp:'amphibious ship'}[k2]+(whole>1?'s':'')+' in the '+S.name+'.'});}}
      if(f.cv>0&&f.sur<3&&rn()<.01){f.cv--;f.lost.cv++;W.emit('NAVAL',{e:[a3],cf:'REPORTED',txt:p.n+' loses an aircraft carrier in the '+S.name+', its escorts too few to protect it. The human cost is heavy.'});}}
    const k3=S.id+':'+(t.sup>.4?'B':t.sup<-.4?'R':'C');if(!n.seen[k3]){n.seen[k3]=1;if(t.sup>.4||t.sup<-.4)W.emit('SEA',{txt:(t.sup>0?'BLUEFOR':'REDFOR')+' takes control of the '+S.name+'.'});}}}
// blockade and landings
function effects(){const st=W.st,n=N();
  for(const p of Object.values(st.c)){if(!bel(p)||!p.ecn)continue;let cut=0;for(const S of seasOf(p)){const t=n.th[S.id];if(!t)continue;const enemyHold=p.side==='B'?-t.sup:t.sup;if(enemyHold>.4)cut=Math.max(cut,enemyHold);}
    p.blockade=cut;if(cut>0){p.ecn.fuel=Math.max(0,p.ecn.fuel-.35*cut);if(p.econ!=null)p.econ=Math.max(.5,p.econ-.0015*cut);
      const k='blk'+p.a3;if(!n.seen[k]){n.seen[k]=1;W.emit('SEA',{e:[p.a3],txt:p.n+' is under blockade: seaborne imports of fuel and goods are cut.'});}}}
  for(const f of st.fronts){if(f.cf)continue;const s0=f.sec[0],S=SEAS.find(q=>inSea({lat:[q.lat[0]-3,q.lat[1]+3],lon:[q.lon[0]-3,q.lon[1]+3]},s0.lat,s0.lon));if(!S)continue;const t=n.th[S.id];
    for(const[a3,sg]of[[f.a,1],[f.b,-1]]){const p=st.c[a3];if(!p.nav||p.nav.amp<1)continue;const hold=p.side==='B'?t.sup:-t.sup;if(hold>.5)for(const s of f.sec)s.off+=sg*.15;}}}   // landing threat: a little ground each day
W.daily.push(()=>{if(!W.st||W.st.over)return;commit();battle();effects();});
W.sea={SEAS,fleet,N,seasOf,CARRIERS};
/* ------------------------------------------------------------------ ships on your sortie */
if(window.WSORTIE&&typeof GND!=='undefined'){const _s=WSORTIE.start;WSORTIE.start=async function(){const r=await _s.apply(this,arguments);try{shipsNear();}catch(e){console.warn('[naval]',e);}return r;};}
function shipsNear(){const WS=WSORTIE.WS;if(!WS.on||!W.st)return;const st=W.st,me=st.c[WS.me],n=N();
  const S=SEAS.find(q=>inSea({lat:[q.lat[0]-2,q.lat[1]+2],lon:[q.lon[0]-3,q.lon[1]+3]},WS.base.lat,WS.base.lon));if(!S||!n.th[S.id])return;
  const ens=Object.keys(n.th[S.id].f).map(a=>st.c[a]).filter(p=>bel(p)&&p.side!==me.side&&p.nav&&p.nav.sur>0);if(!ens.length)return;const th=n.th[S.id],en=ens.sort((a,b)=>th.f[b.a3]*b.nav.sur-th.f[a.a3]*a.nav.sur)[0];   /* whoever has the most ships committed to this sea */
  // the nearest open water 70-140 km from the base, toward the theatre's centre
  let spot=null;
  // the deepest water 40-160 km from the base, searched all the way round (coasts and gulfs vary)
  let best=-5;for(const km of[40,70,100,130,160])for(let a=0;a<360;a+=30){const r=a*Math.PI/180,lat=WS.base.lat+Math.cos(r)*km/111.2,lon=WS.base.lon+Math.sin(r)*km/(111.2*Math.cos(WS.base.lat*Math.PI/180)),h=G.heightLL(lat,lon);
    if(h<best){best=h;spot={lat,lon};}}
  if(!spot)return;
  const ks=en.side==='B'?['DDGB','DDGB','FFGB']:['CGR','FACR','FACR'],c=G.ll2xz(spot.lat,spot.lon);WS.fleet={a3:en.a3,sea:S.id,ships:[]};
  ks.forEach((k,i)=>{const x=c.x+(i-1)*1800,z=c.z+(i%2)*1500;const u=GND.add(k,1,x,z,rn()*360);u.spd=k==='FACR'?15:8.5;u.pos.y=0;u.mesh.position.y=0;u._ws=en.a3;u._ship=1;u.callsign=GTY[k].n+' ('+en.n+')';
    if(typeof ASM!=='undefined')ASM.ships.push(u);WS.fleet.ships.push(u);if(WS.ground)WS.ground.push(u);});
  if(!WS.task||WS.task.k==='CAP'){WS.task={k:'ANTISHIP',x:c.x,z:c.z,l:'anti-ship strike on a '+en.n+' surface group in the '+S.name};}
  setTimeout(()=>{if(WS.on&&typeof player!=='undefined'&&player)radio('Surface contact: '+en.n+' surface group in the '+S.name+', '+String(Math.round(brgTo(player.pos.x,player.pos.z,c.x,c.z))).padStart(3,'0')+' for '+Math.round(cd2(player.pos.x,player.pos.z,c.x,c.z)/NM)+' miles. Expect ship-launched SAMs.');},7000);}
// a ship sunk on a sortie comes off that country's fleet (not off its ground forces)
if(typeof GUnit!=='undefined'){const _k=GUnit.prototype.kill;GUnit.prototype.kill=function(src){const ship=this._ship&&this.alive,a3=this._ws;if(ship)this._ws=null;const r=_k.apply(this,arguments);
  if(ship&&W.st){const p=W.st.c[a3];if(p&&p.nav&&p.nav.sur>0){p.nav.sur--;p.nav.lost.sur++;W.emit('NAVAL',{e:[a3],txt:p.n+' loses a '+(this.T&&this.T.n||'warship')+(src===player?' to your strike':'')+'.'});}if(src===player&&window.WSORTIE)WSORTIE.WS.kills.gnd++;}
  return r;};}
})();
