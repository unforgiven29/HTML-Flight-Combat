/* =====================================================================================================================
   v366 — adaptive battle sound and full mission replay (spec v49 ch.12 / ch.17 adaptive audio, radio presentation and
   sound environment; ch.13 flight recorder, telemetry and mission replay).
   * BATTLE SOUND: during a world sortie, a sound bed that follows what is around you, through the game's own audio
     output (master volume applies): distant artillery rumble when the ground fight is within 25 km (louder nearer),
     explosions' low thuds when bombs and missiles impact within 15 km, an air-raid siren wail over a city under alert
     (cities.js) when you are within 10 km, and radio static under radio calls. Synthesised (noise and oscillators),
     no recordings. Off with the game's sound or Shift+N.
   * MISSION REPLAY: every world sortie records all aircraft (yours, AI, other players), ground units and weapons at
     2 Hz in local coordinates with the sortie's origin. The DEBRIEF tab replays it as a top-down map — play / pause,
     speed x1 / x4 / x16, scrub — with your track, friendly and enemy aircraft, ground units and impacts. The last 3
     sorties are kept in memory (not saved).
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WSORTIE)return;
const W=WWAR,WS=WSORTIE.WS,rn=Math.random;
/* ------------------------------------------------------------------ battle sound */
const AU={on:true,ready:false,art:null,thud:null,siren:null,stat:null};
function build(){if(AU.ready||typeof sfx==='undefined'||!sfx.ctx||!sfx.m)return;const x=sfx.ctx;const noise=()=>{const b=x.createBuffer(1,x.sampleRate*2,x.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=x.createBufferSource();s.buffer=b;s.loop=true;s.start();return s;};
  const art=x.createBiquadFilter();art.type='lowpass';art.frequency.value=90;const ag=x.createGain();ag.gain.value=0;noise().connect(art).connect(ag).connect(sfx.m);AU.art=ag;
  const sir=x.createOscillator();sir.type='sawtooth';sir.frequency.value=420;const sg=x.createGain();sg.gain.value=0;const lf=x.createOscillator();lf.frequency.value=.15;const lg=x.createGain();lg.gain.value=180;lf.connect(lg).connect(sir.frequency);sir.connect(sg).connect(sfx.m);sir.start();lf.start();AU.siren=sg;
  const st=x.createBiquadFilter();st.type='bandpass';st.frequency.value=2200;st.Q.value=.7;const tg=x.createGain();tg.gain.value=0;noise().connect(st).connect(tg).connect(sfx.m);AU.stat=tg;AU.ready=true;}
function thud(dist){if(!AU.ready||!AU.on)return;const x=sfx.ctx,o=x.createOscillator(),g=x.createGain();o.type='sine';o.frequency.setValueAtTime(70,x.currentTime);o.frequency.exponentialRampToValueAtTime(28,x.currentTime+.8);
  const v=Math.max(0,.5*(1-dist/15000));g.gain.setValueAtTime(v,x.currentTime);g.gain.exponentialRampToValueAtTime(.001,x.currentTime+1.2);o.connect(g).connect(sfx.m);o.start();o.stop(x.currentTime+1.3);}
setInterval(()=>{if(typeof sfx==='undefined'||!sfx.ctx)return;build();if(!AU.ready)return;const t=sfx.ctx.currentTime,on=AU.on&&WS.on&&typeof game!=='undefined'&&game.active&&player;
  let art=0,sir=0;if(on){const G=window.GFIGHT&&GFIGHT.GF.on?GFIGHT.GF.units.filter(u=>u.alive):[];let d=1e9;for(const u of G)d=Math.min(d,Math.hypot(u.pos.x-camera.position.x,u.pos.z-camera.position.z));if(d<25000)art=.18*(1-d/25000);
    const C=W.st&&W.st.city&&W.st.city[WS.me];if(C&&window.WGEO){for(const c of C){if(!c.alerts||c.exp<.3)continue;const q=WGEO.ll2xz(c.lat,c.lon);if(Math.hypot(q.x-camera.position.x,q.z-camera.position.z)<10000)sir=.05;}}}
  AU.art.gain.setTargetAtTime(art,t,.8);AU.siren.gain.setTargetAtTime(sir,t,1.5);AU.stat.gain.setTargetAtTime(Math.max(0,AU.stat.gain.value*.85),t,.2);},500);
if(typeof radio==='function'){const _r=radio;radio=function(){const r=_r.apply(this,arguments);if(AU.ready&&AU.on&&WS.on){AU.stat.gain.setTargetAtTime(.02,sfx.ctx.currentTime,.05);}return r;};}
if(typeof GND!=='undefined'&&GND.blast0){const _b=GND.blast0.bind(GND);GND.blast0=function(p){const r=_b.apply(this,arguments);try{if(WS.on&&p&&camera)thud(Math.hypot(p.x-camera.position.x,p.z-camera.position.z));}catch(e){}return r;};}
document.addEventListener('keydown',e=>{if(e.shiftKey&&(e.key==='N'||e.key==='n')&&!(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))){AU.on=!AU.on;if(typeof flash==='function')flash('BATTLE SOUND '+(AU.on?'ON':'OFF'),1500);}});
/* ------------------------------------------------------------------ mission replay */
const RP={list:[],cur:null,view:{i:0,play:false,spd:4,k:0}};
setInterval(()=>{if(!WS.on||typeof game==='undefined'||!game.active||!player)return;if(!RP.cur){RP.cur={t0:Date.now(),a3:WS.me,f:[],o:window.WGEO?[WGEO.o.lat,WGEO.o.lon]:null};}
  const r=v=>Math.round(v),F={me:[r(player.pos.x),r(player.pos.z),player.alive?1:0],a:[],g:[],w:[]};const o=WGEO.o,off=RP.cur.o?WGEO.ll2xz(RP.cur.o[0],RP.cur.o[1]):{x:0,z:0};   // positions kept in the first frame's coordinates across origin shifts
  const P=(x,z)=>[r(x-off.x),r(z-off.z)];F.me=[...P(player.pos.x,player.pos.z),player.alive?1:0];
  for(const j of jets){if(j===player||!j.alive||j.gone)continue;F.a.push([...P(j.pos.x,j.pos.z),j.side]);}
  for(const u of (typeof GND!=='undefined'?GND.units:[]))if(u.alive)F.g.push([...P(u.pos.x,u.pos.z),u.side]);
  for(const m of (typeof missiles!=='undefined'?missiles:[]))if(m.alive)F.w.push(P(m.pos.x,m.pos.z));
  RP.cur.f.push(F);if(RP.cur.f.length>7200)RP.cur.f.shift();},500);
{const _f=WSORTIE.finish;WSORTIE.finish=function(){const r=_f.apply(this,arguments);if(RP.cur&&RP.cur.f.length>=1){RP.list.unshift(RP.cur);RP.list.length=Math.min(3,RP.list.length);}RP.cur=null;RP.view.i=0;RP.view.k=0;return r;};}
function draw(cv,rec,k){const c=cv.getContext('2d'),w=cv.width,h=cv.height;c.fillStyle='#0d1211';c.fillRect(0,0,w,h);if(!rec||!rec.f.length)return;
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const F of rec.f){x0=Math.min(x0,F.me[0]);x1=Math.max(x1,F.me[0]);z0=Math.min(z0,F.me[1]);z1=Math.max(z1,F.me[1]);}const pad=30000;x0-=pad;x1+=pad;z0-=pad;z1+=pad;
  const s=Math.min(w/(x1-x0),h/(z1-z0)),X=x=>(x-x0)*s,Z=z=>(z-z0)*s;const F=rec.f[Math.min(k,rec.f.length-1)];
  c.strokeStyle='rgba(127,209,160,.5)';c.beginPath();rec.f.slice(0,k+1).forEach((f,i)=>{i?c.lineTo(X(f.me[0]),Z(f.me[1])):c.moveTo(X(f.me[0]),Z(f.me[1]));});c.stroke();
  for(const g of F.g){c.fillStyle=g[2]?'#e07a6a':'#6aa9e0';c.fillRect(X(g[0])-1.5,Z(g[1])-1.5,3,3);}
  for(const a of F.a){c.fillStyle=a[2]?'#ff5a4a':'#5be1ff';c.beginPath();c.arc(X(a[0]),Z(a[1]),3,0,7);c.fill();}
  for(const m of F.w){c.fillStyle='#ffd23a';c.fillRect(X(m[0])-1,Z(m[1])-1,2,2);}
  c.fillStyle=F.me[2]?'#7fd1a0':'#888';c.beginPath();c.arc(X(F.me[0]),Z(F.me[1]),4.5,0,7);c.fill();
  c.fillStyle='#cfd';c.font='11px "B612 Mono",monospace';c.fillText('T+'+Math.round(k/2)+' s',8,14);}
setInterval(()=>{const v=RP.view;if(!v.play)return;const rec=RP.list[v.i];if(!rec){v.play=false;return;}v.k=Math.min(rec.f.length-1,v.k+v.spd);if(v.k>=rec.f.length-1)v.play=false;const cv=document.getElementById('rpCv');if(cv)draw(cv,rec,v.k);const sl=document.getElementById('rpSl');if(sl)sl.value=v.k;},500);
if(window.NATPANEL&&NATPANEL.tabs&&NATPANEL.tabs.DEBRIEF){const _t=NATPANEL.tabs.DEBRIEF;NATPANEL.tabs.DEBRIEF=p=>{const v=RP.view,rec=RP.list[v.i];
  const h='<h4>MISSION REPLAY</h4>'+(RP.list.length?'<div class="tc">'+RP.list.map((r,i)=>'<button data-rp2="sel" data-i="'+i+'" aria-pressed="'+(v.i===i)+'">SORTIE '+(i+1)+(i===0?' (LAST)':'')+'</button>').join(' ')+'</div>'+
    '<canvas id="rpCv" width="300" height="220" style="width:100%;max-width:300px;border:1px solid #333" aria-label="mission replay map"></canvas><div class="tc"><button data-rp2="play">'+(v.play?'PAUSE':'PLAY')+'</button> '+[1,4,16].map(x=>'<button data-rp2="spd" data-v="'+x+'" aria-pressed="'+(v.spd===x)+'">x'+x+'</button>').join(' ')+
    ' <input id="rpSl" type="range" min="0" max="'+((rec?rec.f.length:1)-1)+'" value="'+v.k+'" style="width:120px" aria-label="replay time"></div><div style="font-size:10px;color:#8a9a92">Green: you · cyan / blue: friendly aircraft / units · red: enemy · yellow: weapons in flight.</div>':'<div>Fly a world sortie to record a replay.</div>');
  setTimeout(()=>{const cv=document.getElementById('rpCv');if(cv&&rec)draw(cv,rec,v.k);},0);return _t(p)+h;};}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-rp2]');if(!b)return;const v=RP.view,d=b.dataset;if(d.rp2==='sel'){v.i=+d.i;v.k=0;v.play=false;}else if(d.rp2==='play')v.play=!v.play;else if(d.rp2==='spd')v.spd=+d.v;if(window.WARMAP)WARMAP.panel();});
document.addEventListener('input',e=>{if(e.target.id!=='rpSl')return;RP.view.k=+e.target.value;const cv=document.getElementById('rpCv');if(cv)draw(cv,RP.list[RP.view.i],RP.view.k);});
W.media={AU,RP,draw,thud};
})();
