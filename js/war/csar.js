/* =====================================================================================================================
   v335 — combat search and rescue, prisoners, and exchanges in the world war (spec v49 ch.06 "Pilot down, search and
   rescue, combat search and rescue, and player pilot recovery"; ch.13 player pilot recovery, capture and return;
   ch.05 prisoner exchanges as partial agreements).
   * When you eject on a world-war sortie (the existing ejection seat decides whether you get out), where you land is
     worked out against the front line where the war has it now:
       - over your own side's ground: recovered within hours;
       - over the sea: a rescue at sea; the chance rises with your side's sea control there;
       - behind enemy lines: a CSAR mission (helicopter and escort from your nearest friendly field, event). The chance
         falls with distance behind the line and with enemy air superiority (gameplay rule); otherwise you evade
         for a while (resolved later) or are captured.
   * Captured: you are a prisoner of war. Your service record says so and you cannot fly for that country until you are
     exchanged. Prisoner exchanges happen during general ceasefires, at the end of the war, and occasionally as a
     humanitarian agreement while the war goes on.
   * Enemy aircrew who eject over your side are counted as prisoners of your side (and the reverse), from the same
     ejection model; exchanges release them in both directions.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WSORTIE)return;
const W=WWAR,G=WGEO,P=WWAR.diplo,rn=Math.random;
const C=()=>W.st.csar||(W.st.csar={down:[],pow:{B:0,R:0}});
// whose ground a point is on: the line where the war has it, near a front; otherwise the country under it
function owner(lat,lon,mySide){const n=WSORTIE.nearestSector(lat,lon,mySide);
  if(n&&n.d<300e3){const s=n.s,lp=W.linePt(s),d=((lon-lp.lon)*Math.cos(lp.lat*Math.PI/180)*s.nx+(lat-lp.lat)*s.ny)*111.2;const enemyHere=n.enemyIsB?d>0:d<0;return{enemy:enemyHere,depth:Math.abs(d),sea:G.heightLL(lat,lon)<-10};}
  const c=G.countryAt(lat,lon),q=c&&W.st.c[c.a3];return{enemy:!!(q&&q.side&&q.side!==mySide&&(q.al==='CORE'||q.al==='ALLY')),depth:100,sea:!c&&G.heightLL(lat,lon)<-10};}
// the ejection itself: the seat (addons-v324) adds a parachute to PILOTS when it fires
{const _k=Jet.prototype.kill;Jet.prototype.kill=function(why,src){const was=this.alive,n0=window.PILOTS?PILOTS.length:0,pos=this.pos.clone();const r=_k.apply(this,arguments);
  try{const WS=WSORTIE.WS;if(was&&!this.alive&&WS.on&&W.st&&window.PILOTS&&PILOTS.length>n0){const ll=G.xz2ll(pos.x,pos.z),me=W.st.c[WS.me].side;
      if(this===player)WS.ej={lat:ll.lat,lon:ll.lon};
      else if(this._ws){const s=W.st.c[this._ws].side,o=owner(ll.lat,ll.lon,s);if(o.enemy&&!o.sea){C().pow[s==='B'?'R':'B']++;}}}}catch(e){console.warn('[csar]',e);}
  return r;};}
const rescueBase=(lat,lon,a3)=>{const L=(W.milBases().get(a3)||[]).slice().sort((x,y)=>G.dist(lat,lon,x.lat,x.lon)-G.dist(lat,lon,y.lat,y.lon));return L[0];};
function supOver(lat,lon){for(const th of W.st.th){const T=W.THEATRES.find(q=>q.id===th.id);if(lat>=T.lat[0]&&lat<=T.lat[1]&&lon>=T.lon[0]&&lon<=T.lon[1])return th.sup;}return 0;}
W.listeners.push(e=>{if(!W.st||e.ty!=='SORTIE')return;const WS=WSORTIE.WS;if(!WS.lost||!WS.ej)return;const ej=WS.ej;WS.ej=null;
  const me=W.st.c[WS.me],o=owner(ej.lat,ej.lon,me.side),c=W.lead&&W.lead.career(),heli=me.side==='R'?'Mi-8 helicopter':'HH-60 helicopter';
  const d={t:W.st.t,lat:ej.lat,lon:ej.lon,a3:WS.me,side:me.side,depth:o.depth,sea:o.sea,enemy:o.enemy,st:'DOWN',due:W.st.t+(o.enemy?2+rn()*10:1+rn()*3)};C().down.push(d);
  if(c){c.st='DOWN';c.hist.push([W.st.t,'ejected'+(o.enemy?' behind enemy lines':o.sea?' over the sea':' over friendly ground')]);}
  if(o.enemy){const b=rescueBase(ej.lat,ej.lon,WS.me);d.base=b&&b.name;
    W.emit('CSAR',{e:[WS.me],txt:'CSAR mission launched for a downed '+me.n+' pilot '+Math.round(o.depth)+' km behind enemy lines: a '+heli+' with fighter escort'+(b?' from '+b.name:'')+'.'});}
  else W.emit('CSAR',{e:[WS.me],txt:'A downed '+me.n+' pilot is down '+(o.sea?'at sea':'over friendly ground')+'; '+(o.sea?'a rescue at sea is under way':'a recovery team is on the way')+'.'});});
function resolve(){const st=W.st,c=W.lead&&W.lead.career();
  for(const d of C().down){if(d.st!=='DOWN'&&d.st!=='EVADING')continue;if(st.t<d.due)continue;
    let pr;if(!d.enemy&&!d.sea)pr=.97;else if(d.sea){const S=W.sea&&W.sea.SEAS.find(q=>d.lat>=q.lat[0]-2&&d.lat<=q.lat[1]+2&&d.lon>=q.lon[0]-3&&d.lon<=q.lon[1]+3),t=S&&st.navy&&st.navy.th[S.id];const hold=t?(d.side==='B'?t.sup:-t.sup):0;pr=Math.max(.2,Math.min(.95,.65+.3*hold));}
    else{const sup=supOver(d.lat,d.lon),mine=d.side==='B'?sup:-sup;pr=Math.max(.05,Math.min(.9,.75-d.depth/150+.25*mine))*(d.st==='EVADING'?.6:1);}
    if(rn()<pr){d.st='RESCUED';if(c&&c.a3===d.a3){c.st='ACTIVE';c.hist.push([st.t,'rescued and returned to duty']);}
      W.emit('CSAR',{e:[d.a3],txt:'The downed '+st.c[d.a3].n+' pilot has been '+(d.enemy?'rescued from behind enemy lines':d.sea?'picked up at sea':'recovered')+' and is returning to the squadron.'});}
    else if(d.enemy&&d.st==='DOWN'&&rn()<.3){d.st='EVADING';d.due=st.t+12+rn()*36;if(c&&c.a3===d.a3)c.st='MISSING';W.emit('CSAR',{e:[d.a3],cf:'REPORTED',txt:'The rescue could not reach the downed '+st.c[d.a3].n+' pilot, who is missing, believed to be evading capture.'});}
    else{d.st='CAPTURED';C().pow[d.side==='B'?'R':'B']++;if(c&&c.a3===d.a3){c.st='POW';c.hist.push([st.t,'captured: prisoner of war']);}
      W.emit('CSAR',{e:[d.a3],cf:'REPORTED',txt:'The downed '+st.c[d.a3].n+' pilot has been captured and is held as a prisoner of war. The ICRC asks for access.'});}}}
// prisoner exchanges: during a general ceasefire, at the end, and sometimes as a humanitarian agreement
function exchanges(){const st=W.st,cs=C(),c=W.lead&&W.lead.career(),cease=st.dip&&st.dip.cease;
  const go=st.over||(cease&&rn()<.2)||(Math.floor(st.t/24)%30===0&&rn()<.25);if(!go||(cs.pow.B+cs.pow.R===0&&!(c&&c.st==='POW')))return;
  const nB=cs.pow.B,nR=cs.pow.R;cs.pow={B:0,R:0};for(const d of cs.down)if(d.st==='CAPTURED')d.st='EXCHANGED';
  if(c&&c.st==='POW'){c.st='ACTIVE';c.hist.push([st.t,'released in a prisoner exchange']);}
  W.emit('PRISONERS',{txt:'Prisoner exchange'+(st.over?' after the war':cease?' under the ceasefire':' agreed on humanitarian grounds')+': '+nB+' held by BLUEFOR and '+nR+' held by REDFOR go home'+(c&&c.hist.slice(-1)[0][1].includes('released')?', you among them':'')+'.'});}
{const _s=W.step;W.step=function(){const r=_s.apply(this,arguments);try{if(W.st)resolve();}catch(e){console.warn('[csar]',e);}return r;};}
W.daily.push(()=>{if(W.st)exchanges();});
// a pilot who is down, missing or a prisoner cannot fly for that country
{const _s=WSORTIE.start;WSORTIE.start=async function(a3){const c=W.st&&W.st.lead&&W.st.lead.career;if(c&&c.a3===a3&&['POW','MISSING','DOWN'].includes(c.st)){flash(c.st==='POW'?'YOU ARE A PRISONER OF WAR · WAIT FOR AN EXCHANGE':'YOU ARE '+c.st+' · WAIT FOR THE RESCUE',3500);return;}return _s.apply(this,arguments);};}
W.csar={C,owner,resolve,exchanges};
})();
