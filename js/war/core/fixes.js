/* =====================================================================================================================
   v371 — corrections the owner asked for.
   * ANTI-SHIP MISSILES BY AIRCRAFT (public service fits): added — F/A-18E Harpoon; Mirage F1 AM39 Exocet; Su-24M and
     MiG-29SMT Kh-31A; Sea Harrier FRS.1 / FA2 Sea Eagle. Removed — Harpoon from the F-15E and F-15EX (not in USAF
     Strike Eagle service); the air-launched P-800 Oniks from the Su-30SM, Su-35S and Su-34 (not a fielded aircraft
     weapon). Added on the pylons that already take heavy air-to-ground stores.
   * NUCLEAR WARFARE IS ALWAYS POSSIBLE: no scenario switch; a nuclear-armed country may cross the threshold under the
     conditions in strategic.js (still abstract: no targets, yields or numbers of dead are shown).
   * SPAWN ONLY FROM MILITARY BASES: world flight can only start at airfields flagged military in the airport data
     (OurAirports); the map says so when a civil airport is picked.
   ===================================================================================================================== */
(()=>{
'use strict';
/* ------------------------------------------------------------------ anti-ship fits */
if(typeof STN!=='undefined'&&typeof AGW!=='undefined'){
  const heavy=L=>L.some(w=>AGW[w]&&AGW[w].mass>=200&&AGW[w].k!=='pod');
  const add=(ac,w)=>{if(!STN[ac]||!AGW[w])return;for(const k of Object.keys(STN[ac])){const L=STN[ac][k];if(heavy(L)&&!L.includes(w))STN[ac][k]=[...L,w];}};
  const del=(ac,w)=>{if(!STN[ac])return;for(const k of Object.keys(STN[ac]))STN[ac][k]=STN[ac][k].filter(x=>x!==w);};
  add('F-18E','AGM-84D');add('Mirage F1','AM39 Exocet');add('Su-24M','Kh-31A');add('MiG-29SMT','Kh-31A');add('Sea Harrier FRS.1','Sea Eagle');add('Sea Harrier FA2','Sea Eagle');
  del('F-15E','AGM-84D');del('F-15EX','AGM-84D');del('Su-30SM','P-800');del('Su-35S','P-800');del('Su-34','P-800');
  // saved loadouts that still name a removed store are cleaned by the game's own validLoad when used
}
/* ------------------------------------------------------------------ nuclear warfare always possible */
if(window.WWAR&&WWAR.strategic){const S=WWAR.strategic.S;const _d=WWAR.daily;WWAR.daily.unshift(()=>{if(WWAR.st){const s=S();s.nuke=true;}});
  if(window.NATPANEL&&NATPANEL.tabs&&NATPANEL.tabs.WORLD){const _w=NATPANEL.tabs.WORLD;NATPANEL.tabs.WORLD=p=>_w(p).replace(/<h4>SCENARIO: NUCLEAR USE<\/h4>[\s\S]*?<\/button><\/div>/,'<h4>NUCLEAR WARFARE</h4><div style="font-size:10px;color:#8a9a92">Always possible: a nuclear-armed country facing collapse or the loss of its capital, at the highest deterrence level and with an unyielding leader, may use one. The war then ends in catastrophe; shown abstractly, with no number of dead.</div>');}
  if(window.NATPANEL&&NATPANEL.tabs&&NATPANEL.tabs.STRATEGIC){const _t=NATPANEL.tabs.STRATEGIC;NATPANEL.tabs.STRATEGIC=p=>_t(p).replace('never, under this scenario','possible').replace('possible under the scenario switch','possible');}}
/* ------------------------------------------------------------------ military bases only */
if(window.WF){const _s=WF.start;WF.start=async function(ap){if(ap&&!ap.mil){if(typeof flash==='function')flash('MILITARY AIRFIELDS ONLY · '+String(ap.name||ap.ident).toUpperCase()+' IS A CIVIL AIRPORT',3500);const el=document.getElementById('wmStatus');if(el)el.textContent='Pick a military airfield: civil airports cannot be used as a starting point.';return;}return _s.apply(this,arguments);};}

/* ------------------------------------------------------------------ wingmen lined up on the real runway */
// spawnWingmen() places runway wingmen by the classic airfield (heading 0). In world flight the runway is real and has its
// own heading: the wingmen are put on that runway behind and beside you, pointing down it, wheels on the surface.
if(typeof spawnWingmen==='function'){const _w=spawnWingmen;spawnWingmen=function(n,runway){const r=_w.apply(this,arguments);
  try{if(window.WF&&WF.on&&runway&&typeof player!=='undefined'&&player&&typeof WING!=='undefined'){const P=player,hd=P.hdg,f=new THREE.Vector3(Math.sin(hd*Math.PI/180),0,-Math.cos(hd*Math.PI/180)),rr=new THREE.Vector3(-f.z,0,f.x);
    WING.list.forEach((w,i)=>{const sx=[-18,18,0][i%3],sz=[30,30,75][i%3]+60*Math.floor(i/3);const x=P.pos.x+rr.x*sx-f.x*sz,z=P.pos.z+rr.z*sx-f.z*sz,y=groundAt(x,z);
      w.spawn(x,y+GH,z,hd,0);w.gHdg=hd;w.onGnd=true;w.thr=0;w.gearPos=1;w.gearCmd=1;if(w.ai){w.ai.tx=x;w.ai.tz=z;w.ai.rwHdg=hd;}});}}catch(e){console.warn('[fixes] wingmen',e);}return r;};}
/* ------------------------------------------------------------------ you and friendlies on the war map */
if(window.WARMAP&&WARMAP.draw){const _d=WARMAP.draw;WARMAP.draw=function(c,w2s,M,phase){const r=_d.apply(this,arguments);if(phase!=='over')return r;
  try{const G=window.WGEO,dot=(lat,lon,col,sz,lab)=>{const[x,y]=w2s(lat,lon);c.fillStyle=col;c.strokeStyle='#000';c.lineWidth=1;c.beginPath();c.arc(x,y,sz,0,7);c.fill();c.stroke();if(lab){c.font='bold 10px monospace';c.fillStyle=col;c.fillText(lab,x+sz+3,y+3);}};
    const WS=window.WSORTIE&&WSORTIE.WS;
    if(WS&&G){for(const j of (WS.friend||[])){const p=j.pos||(j.p&&j.p.pos);if(!p||j.dead)continue;const ll=G.xz2ll(p.x,p.z);dot(ll.lat,ll.lon,'#5be1ff',3);}}
    if(window.WF&&WF.on&&G&&typeof player!=='undefined'&&player){const ll=G.xz2ll(player.pos.x,player.pos.z),[x,y]=w2s(ll.lat,ll.lon),h=(player.hdg||0)*Math.PI/180;
      c.save();c.translate(x,y);c.rotate(h);c.fillStyle='#ffe14a';c.strokeStyle='#000';c.beginPath();c.moveTo(0,-9);c.lineTo(6,7);c.lineTo(0,3);c.lineTo(-6,7);c.closePath();c.fill();c.stroke();c.restore();
      c.font='bold 11px monospace';c.fillStyle='#ffe14a';c.fillText('YOU',x+10,y+4);}}catch(e){}return r;};}
window.FIXES={v:375};
})();
