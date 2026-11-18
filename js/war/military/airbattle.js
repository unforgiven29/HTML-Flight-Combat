/* =====================================================================================================================
   v353 — air battles that actually fly around you (spec v49 ch.06 global air war and theatre campaign behaviour;
   ch.15 dynamic air-operation AI). During a world sortie the theatre's air war is no longer only a statistic far away:
   * Every few minutes an AIR BATTLE forms within about 60-110 km of you along the front: a friendly flight and an
     enemy flight (two to four aircraft each, sized by who holds the air in this theatre) are put on converging
     routes so they meet and fight with the game's own AI — missiles, guns, countermeasures. You can join, watch
     (observer camera, O) or stay on your task. AWACS calls the merge.
   * Results count: each aircraft lost is a real loss to its country (the same accounting as your own kills,
     warsortie.js), on squadrons where known.
   * No double counting: while you fly in a theatre, its statistical air losses run at 70 % (W.airWx), because part
     of that theatre's fighting is now flown for real around you.
   * At most three battles at once; survivors return to base at bingo fuel (player.js).
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WSORTIE)return;
const W=WWAR,G=WGEO,WS=WSORTIE.WS,rn=Math.random;
const AB={list:[],t:120,n:0};
function theatre(){if(!W.st||!WS.base)return null;return(W.st.th||[]).find(t=>{const T=W.THEATRES.find(q=>q.id===t.id);return T&&WS.base.lat>=T.lat[0]&&WS.base.lat<=T.lat[1];})||null;}
function enemyBase(){const me=W.st.c[WS.me];for(const[a3,L]of W.milBases()){const q=W.st.c[a3];if(!q||!q.side||q.side===me.side||!W.bell(q)||q.air<2)continue;const a=L.find(b=>G.dist(b.lat,b.lon,WS.base.lat,WS.base.lon)<1.2e6);if(a)return{a3,a};}return null;}
function friendBase(){const me=W.st.c[WS.me];for(const p of [me,...Object.values(W.st.c).filter(q=>q.side===me.side&&W.bell(q)&&q!==me)]){const L=W.milBases().get(p.a3)||[];const a=L.find(b=>G.dist(b.lat,b.lon,WS.base.lat,WS.base.lon)<1.2e6);if(a)return{a3:p.a3,a};}return null;}
function form(){if(!WS.on||!WS.front||!player||!W.st)return;AB.list=AB.list.filter(b=>b.j.some(j=>j.alive&&!j.gone));if(AB.list.length>=3)return;
  const th=theatre(),me=W.st.c[WS.me],sup=th?(me.side==='B'?th.sup:-th.sup):0,E=enemyBase(),F=friendBase();if(!E||!F)return;
  // a meeting point on the front within reach of you
  const n=WS.front,pp=G.xz2ll(player.pos.x,player.pos.z),ang=rn()*Math.PI*2,d=(60+rn()*50)/111.2;let lat=pp.lat+Math.sin(ang)*d*.5,lon=pp.lon+Math.cos(ang)*d/Math.cos(pp.lat*Math.PI/180)*.5;
  lat=(lat+n.p.lat)/2;lon=(lon+n.p.lon)/2;
  const nf=Math.max(1,Math.round(1+(1+sup))),ne=Math.max(1,Math.round(1+(1-sup)));   // flights of two: more for whoever holds the air
  const J=[];for(let i=0;i<Math.min(2,nf);i++)J.push(...WSORTIE.spawnFlight(0,F.a3,F.a,lat+(rn()-.5)*.1,lon+(rn()-.5)*.1,'CAP'));
  for(let i=0;i<Math.min(2,ne);i++)J.push(...WSORTIE.spawnFlight(1,E.a3,E.a,lat+(rn()-.5)*.1,lon+(rn()-.5)*.1,'SWEEP'));
  if(!J.length)return;for(const j of J){j._ab=++AB.n;if(j.ai){j.ai.det=Math.max(j.ai.det||0,90000);}}AB.list.push({t:Date.now(),lat,lon,j:J});
  const q=G.ll2xz(lat,lon),br=String(Math.round(brgTo(player.pos.x,player.pos.z,q.x,q.z))).padStart(3,'0'),rg=Math.round(cd2(player.pos.x,player.pos.z,q.x,q.z)/NM);
  if(typeof radio==='function'&&(typeof SET==='undefined'||SET.calls==='ON'))radio('DARKSTAR: friendlies and bandits converging, bullseye '+br+' for '+rg+' — '+J.filter(j=>j.side===0).length+' friendly, '+J.filter(j=>j.side===1).length+' hostile.',true);}
setInterval(()=>{if(!WS.on||typeof game==='undefined'||!game.active){AB.list=[];AB.t=90;return;}AB.t-=5;if(AB.t<=0){AB.t=200+rn()*220;try{form();}catch(e){console.warn('[airbattle]',e);}}},5000);
// while you fly in a theatre, its statistical air losses run at 70 %
{const _w=W.airWx;W.airWx=th=>{const v=_w(th);if(!WS.on)return v;const t=theatre();return t&&t.id===th.id?v*.7:v;};}
W.airbattle={AB,form,theatre};
})();
