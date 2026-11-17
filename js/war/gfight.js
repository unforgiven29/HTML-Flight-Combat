/* =====================================================================================================================
   v334 — the ground war you fly over (world-war sorties): tanks, infantry fighting vehicles, infantry and artillery from
   the brigades that are actually at that front (orbat.js), and they fight each other.
   * Each side: up to two brigades at that front (the ones the order of battle assigns there). Each battalion puts a
     company on the ground at its own point along the line: a tank company = 4 tanks; mechanised = 3 IFVs + 1 infantry
     squad; infantry = 3 squads + 1 IFV; artillery = 2 guns 8 km back. Callsigns name company, battalion, brigade, country.
   * Combat (every half second, gameplay-level): each unit engages the nearest enemy in reach. Tank gun 2,500 m;
     IFV cannon 1,500 m and anti-tank missile 3,500 m; infantry rifles 500 m and anti-tank rockets 400 m; artillery up to
     15 km at whatever the line holds. Hit chance falls with range and at night; damage by weapon against armour or soft
     targets. Muzzle flashes, tracers, impacts.
   * Movement: when its country's posture on that front is ATTACK (strategy.js), a unit with no enemy in reach moves
     toward the enemy line at walking / driving pace; defenders hold.
   * Every vehicle lost comes off its own brigade, and so off the country's strength in the world war (about 1 % of a
     brigade per vehicle). You can help with close air support; you can also hit your own side (friendly fire is
     recorded by the game as before).
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WSORTIE)return;
const W=WWAR,G=WGEO,D=Math.PI/180,rr=(a,b)=>a+Math.random()*(b-a);
const WPN={MBT:[{r:2500,rof:8,p:.4,arm:70,soft:45,fx:'tank'}],IFV:[{r:1500,rof:3,p:.3,arm:12,soft:30,fx:'can'},{r:3500,rof:25,p:.5,arm:90,soft:30,fx:'atgm',armOnly:1}],
  INF:[{r:500,rof:3,p:.3,arm:0,soft:22,fx:'mg',softOnly:1},{r:400,rof:14,p:.35,arm:60,soft:20,fx:'rpg',armOnly:1}],ART:[{r:15000,rof:20,p:.15,arm:40,soft:60,fx:'art'}]};
const CO={TANK:['MBT','MBT','MBT','MBT'],MECH:['IFV','IFV','IFV','INF'],INF:['INF','INF','INF','IFV'],ART:['ART','ART']};
const CL=['A','B','C','D'];
const GF={units:[],t:0,on:false};
const kindOf=(base,side)=>base+(side==='R'?'R':'B');   // the model of the side that owns it
const armoured=u=>!/^INF/.test(u.kind);
function spawn(n,sg,tx,ty){const st=W.st,WS=WSORTIE.WS;if(!W.ob)return false;GF.units=[];
  const enemyA3=n.enemyIsB?n.f.b:n.f.a,friendA3=n.enemyIsB?n.f.a:n.f.b,s=n.s,out=[];
  for(const[a3,gside,dir]of[[enemyA3,1,sg],[friendA3,0,-sg]]){const p=st.c[a3];if(!p||!p.side)continue;const B=W.ob.brigadesAt(a3,n.f.id).slice(0,2);if(!B.length)continue;let slot=0;
    for(const bd of B)for(let bi=0;bi<bd.bns.length;bi++){const bn=bd.bns[bi],along=(slot-2)*2.6+rr(-.4,.4);slot++;const back=bn==='ART'?8:1.4+rr(0,1.2);
      const lat0=n.p.lat+ty*along/111.2+s.ny*dir*back/111.2,lon0=n.p.lon+(tx*along+s.nx*dir*back)/(111.2*Math.cos(n.p.lat*D));
      CO[bn].forEach((k,i)=>{const lat=lat0+(i-1.5)*.0025,lon=lon0+(i%2)*.003,q=G.ll2xz(lat,lon);if(groundAt(q.x,q.z)<2)return;
        const hd=(Math.atan2(-s.nx*dir,s.ny*dir)/D+180+360)%360,u=GND.add(kindOf(k,p.side),gside,q.x,q.z,hd);
        u._ws=a3;u._bde=bd.id;u._gk=k;u.callsign=CL[bi%4]+' Coy, '+W.ob.ord(bi+1)+' Bn ('+bn.toLowerCase()+'), '+bd.name+' ('+p.n+')';u._rl=WPN[k].map(()=>rr(0,6));u._dir={x:s.nx*-dir,z:-s.ny*-dir};
        GF.units.push(u);out.push(u);if(WS.ground)WS.ground.push(u);});}}
  GF.on=out.length>0;return out.length>0;}
function fx(a,b,kind,hit){if(kind==='art'){const p=b.clone();p.x+=rr(-60,60);p.z+=rr(-60,60);p.y=groundAt(p.x,p.z)+1;glow.emit(p,null,.3,14,16,1,.7,.35,1);for(let k=0;k<5;k++)smoke.emit(p,new THREE.Vector3(rr(-6,6),rr(6,14),rr(-6,6)),rr(5,9),7,30,.32,.29,.25,.6,.35);return;}
  glow.emit(a,null,.12,kind==='tank'?8:3,6,1,.8,.45,1);if(kind==='tank')smoke.emit(a,null,3,3,12,.75,.72,.66,.5,.3);
  const n=6;for(let i=1;i<=n;i++){const p=a.clone().lerp(b,i/n);glow.emit(p,null,.05+i*.01,kind==='atgm'||kind==='rpg'?2.5:1.4,1.2,1,.8,.4,1);}
  if(hit)glow.emit(b,null,.25,kind==='tank'||kind==='atgm'?9:4,10,1,.7,.35,1);}
function tick(dt){const WS=WSORTIE.WS;if(!WS.on||!GF.on||!game.active)return;const st=W.st,night=typeof ENV!=='undefined'&&ENV.nightK>.5;
  const L=GF.units.filter(u=>u.alive),enemy=u=>L.filter(v=>v.side!==u.side);
  for(const u of L){const W_=WPN[u._gk];for(let i=0;i<u._rl.length;i++)u._rl[i]-=dt;
    let best=null,bd=1e12;for(const v of enemy(u)){const d=Math.hypot(v.pos.x-u.pos.x,v.pos.z-u.pos.z);if(d<bd){bd=d;best=v;}}
    if(best&&bd<=Math.max(...W_.map(w=>w.r))){const arm=armoured(best);
      for(let i=0;i<W_.length;i++){const w=W_[i];if(u._rl[i]>0||bd>w.r||(w.armOnly&&!arm)||(w.softOnly&&arm))continue;u._rl[i]=w.rof*rr(.7,1.3);
        const p=w.p*(1-.55*bd/w.r)*(night?.7:1),hit=Math.random()<p;const a=u.pos.clone();a.y+=2;const b=best.pos.clone();b.y+=1.5;
        if(Math.hypot(a.x-camera.position.x,a.z-camera.position.z)<20000)fx(a,b,w.fx,hit);if(hit)best.damage(arm?w.arm:w.soft,null);break;}}
    else if(u._gk!=='ART'){// no enemy in reach: attackers move up, defenders hold
      const f=st.fronts.find(q=>q.id===WS.front.f.id),post=f&&f.post&&f.post[u._ws];if(post==='ATTACK'){const sp=u._gk==='INF'?1.2:3;u.pos.x+=u._dir.x*sp*dt;u.pos.z+=u._dir.z*sp*dt;u.pos.y=groundAt(u.pos.x,u.pos.z);u.mesh.position.copy(u.pos);}}}}
let last=performance.now();setInterval(()=>{const n=performance.now(),dt=Math.min(1,(n-last)/1000);last=n;try{tick(dt);}catch(e){console.warn('[gfight]',e);}},500);
window.GFIGHT={spawn,tick,GF,WPN,CO};
})();
