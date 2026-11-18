/* =====================================================================================================================
   v363 — the cockpit and the flight line (spec v49 ch.13: advanced HOTAS / joystick / rudder pedal multi-device input,
   interactive preflight and start-up checklist, local ground-service activity, flight academy and qualifications;
   ch.17 radio and world audio; ch.06 aircraft weathering, service wear and repaint history).
   * CONTROLS SETUP (Shift+F9): every connected game controller (stick, throttle quadrant, pedals) is listed; assign
     ROLL, PITCH, RUDDER and THROTTLE to any device's axis by moving the control ("move it now" detection), with invert
     and dead zone; saved in this browser. Roll and pitch reach the game through a remapped virtual controller (so the
     game's own curves and buttons still apply); rudder and throttle are applied after the game reads its controls.
   * SPOKEN RADIO (Shift+V): radio calls are also spoken by the browser's speech voice (urgent calls faster), off by
     default; captions stay on screen.
   * FLIGHT LINE: a world sortie that starts on the ground starts with a crew chief, two ground crew, a tow tractor and a
     fuel truck by your aircraft; they clear away when you add power or after a minute.
   * WEAR AND REPAINT: each airframe type you fly for a country gathers wear with every sortie (paint darkens and
     dulls, up to a limit); after 40 sorties it goes for maintenance and a repaint (event); the history is kept.
   * REALISTIC START-UP (option, off by default): before a ground start, a start-up checklist (battery, APU, engine,
     generators, avionics, IFF, lights, canopy, master arm safe) — tick each item (click or Enter); the throttle stays
     at idle until it is complete.
   * FLIGHT ACADEMY: qualifications earned in the training modes — air combat (GUN), strike (STRIKE), air-to-air
     refuelling (fuel taken from the tanker), carrier landing (an arrested landing), world sortie (a sortie flown and
     recovered) — listed with dates in the DEBRIEF tab and Shift+F10.
   ===================================================================================================================== */
(()=>{
'use strict';
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
/* ------------------------------------------------------------------ controls setup */
const MAP=LS.get('viper.axes',{});   // {roll:{d:id,a:index,inv:0},pitch:..,rud:..,thr:..}
const _gg=navigator.getGamepads?navigator.getGamepads.bind(navigator):null;
const pads=()=>_gg?[..._gg()].filter(Boolean):[];
const ax=(m)=>{if(!m)return null;const g=pads().find(p=>p.id===m.d)||pads()[m.i||0];if(!g||g.axes[m.a]==null)return null;const v=g.axes[m.a]*(m.inv?-1:1);return Math.abs(v)<(MAP.dz||.05)?0:v;};
if(_gg&&(MAP.roll||MAP.pitch)){navigator.getGamepads=function(){const L=_gg();const base=[...L].find(Boolean);if(!base)return L;
  const axes=base.axes.slice();const r=ax(MAP.roll),p=ax(MAP.pitch);if(r!=null)axes[0]=r;if(p!=null)axes[1]=p;
  const v={id:base.id,index:base.index,connected:true,buttons:base.buttons,axes,mapping:base.mapping,timestamp:base.timestamp};return[v];};}
if(typeof readControls==='function'){const _rc=readControls;readControls=function(dt){_rc.apply(this,arguments);const P=typeof player!=='undefined'&&player;if(!P)return;
  const t=ax(MAP.thr);if(t!=null)P.thr=Math.max(0,Math.min(1,(1-t)/2));const y=ax(MAP.rud);if(y!=null)P.ctl.y+=(y-P.ctl.y)*Math.min(1,dt*6);
  if(SU.lock)P.thr=Math.min(P.thr,.05);};}
let setup=null;
function openSetup(){closeSetup();const d=document.createElement('div');d.id='ctlSetup';d.style.cssText='position:fixed;inset:10% 20%;z-index:9998;background:#101416;color:#dde;border:1px solid #556;padding:14px;font:13px "B612 Mono",monospace;overflow:auto';
  document.body.appendChild(d);setup={d,learn:null,base:null};drawSetup();}
function closeSetup(){const d=document.getElementById('ctlSetup');if(d)d.remove();setup=null;}
function drawSetup(){if(!setup)return;const P=pads();setup.d.innerHTML='<b>CONTROLS SETUP</b> <span style="float:right"><button data-cs="close">CLOSE</button></span><div style="font-size:11px;color:#8a9">Devices: '+(P.length?P.map(g=>g.index+': '+g.id.slice(0,40)).join(' · '):'none connected — move a control to wake it')+'</div>'+
  ['roll','pitch','rud','thr'].map(k=>{const m=MAP[k];return '<div style="margin:6px 0">'+({roll:'ROLL',pitch:'PITCH',rud:'RUDDER',thr:'THROTTLE'}[k])+': '+(m?'device '+(P.findIndex(g=>g.id===m.d))+' axis '+m.a+(m.inv?' (inverted)':''):'game default')+' <button data-cs="learn" data-k="'+k+'">'+(setup.learn===k?'MOVE IT NOW…':'ASSIGN')+'</button> <button data-cs="inv" data-k="'+k+'">INVERT</button> <button data-cs="clr" data-k="'+k+'">CLEAR</button></div>';}).join('')+
  '<div>Dead zone: <button data-cs="dz" data-v=".02">2 %</button> <button data-cs="dz" data-v=".05">5 %</button> <button data-cs="dz" data-v=".1">10 %</button> (now '+Math.round((MAP.dz||.05)*100)+' %)</div><div style="font-size:11px;color:#8a9">Saved in this browser. Reload the page after assigning roll or pitch.</div>';}
setInterval(()=>{if(!setup||!setup.learn)return;const P=pads();if(!setup.base){setup.base=P.map(g=>g.axes.slice());return;}
  let best=null,bd=.35;P.forEach((g,i)=>g.axes.forEach((v,a)=>{const d=Math.abs(v-((setup.base[i]||[])[a]||0));if(d>bd){bd=d;best={d:g.id,i,a,inv:0};}}));
  if(best){MAP[setup.learn]=best;LS.set('viper.axes',MAP);setup.learn=null;setup.base=null;drawSetup();}},100);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#ctlSetup [data-cs]');if(!b)return;const k=b.dataset.k;
  if(b.dataset.cs==='close')return closeSetup();if(b.dataset.cs==='learn'){setup.learn=k;setup.base=null;}else if(b.dataset.cs==='inv'&&MAP[k]){MAP[k].inv=MAP[k].inv?0:1;}else if(b.dataset.cs==='clr')delete MAP[k];else if(b.dataset.cs==='dz')MAP.dz=+b.dataset.v;LS.set('viper.axes',MAP);drawSetup();});
/* ------------------------------------------------------------------ spoken radio */
const VO={on:LS.get('viper.voice',false)};
if(typeof radio==='function'){const _r=radio;radio=function(txt,urgent){const r=_r.apply(this,arguments);if(VO.on&&window.speechSynthesis&&typeof game!=='undefined'&&game.active)try{const u=new SpeechSynthesisUtterance(String(txt).replace(/·/g,',').slice(0,220));u.rate=urgent?1.25:1.05;u.pitch=.9;u.volume=.8;speechSynthesis.speak(u);}catch(e){}return r;};}
/* ------------------------------------------------------------------ flight line */
const FL={g:null,t:0};
function crew(P){clearCrew();if(typeof THREE==='undefined'||!P)return;const g=new THREE.Group(),f=P.fwd(new THREE.Vector3()),r=new THREE.Vector3(-f.z,0,f.x),base=P.pos.clone();base.y=groundAt(base.x,base.z);
  const box=(w,h,d,c,x,z,y=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));m.position.copy(base).addScaledVector(r,x).addScaledVector(f,z);m.position.y=base.y+h/2+y;m.lookAt(m.position.clone().add(f));g.add(m);return m;};
  for(const[x,z,c]of[[6,4,0xd8c23a],[-6,2,0x3a6ad8],[3,10,0x2a8a3a]]){box(.5,1.75,.35,c,x,z);box(.32,.32,.32,0xd8b8a0,x,z,1.85);}   // crew chief (yellow), ground crew
  box(2.2,1.3,3.4,0x6a6a2a,0,14);box(2.4,2.6,6.5,0xb0b0b0,-12,-6);   // tow tractor, fuel truck
  g.userData={f:f.clone(),r:r.clone()};scene.add(g);FL.g=g;FL.t=0;}
function clearCrew(){if(FL.g){scene.remove(FL.g);FL.g=null;}}
setInterval(()=>{if(!FL.g)return;FL.t+=.1;const P=typeof player!=='undefined'&&player;if(!P||!P.alive){clearCrew();return;}
  if(P.thr>.55||FL.t>60||P.vel.length()>8){const u=FL.g.userData;FL.g.children.forEach((m,i)=>{m.position.addScaledVector(u.r,(i%2?1:-1)*.6);});if(FL.t>75||P.vel.length()>20)clearCrew();FL.t=Math.max(FL.t,60.1);}},100);
/* ------------------------------------------------------------------ wear and repaint */
const WEAR=()=>LS.get('viper.wear',{});
function applyWear(P,key){const w=WEAR()[key];if(!w||!P||!P.mesh)return;const k=Math.min(.35,w.n*.009);if(k<=0)return;
  P.mesh.traverse(o=>{if(o.isMesh&&o.material&&o.material.color&&!o.userData._worn){o.material=o.material.clone();const c=o.material.color;const l=(c.r+c.g+c.b)/3;c.setRGB(c.r*(1-k)+l*k*.6,c.g*(1-k)+l*k*.6,c.b*(1-k)+l*k*.6);o.userData._worn=1;}});}
function wearUp(key,a3,type){const W_=WEAR(),w=W_[key]||(W_[key]={n:0,rep:[]});w.n++;if(w.n>=40){w.rep.push(Date.now());w.n=0;if(window.WWAR&&WWAR.st)WWAR.emit('MAINT',{e:[a3],txt:'Your '+type+' goes into the depot for maintenance and a full repaint after forty sorties.'});}LS.set('viper.wear',W_);}
/* ------------------------------------------------------------------ realistic start-up */
const SU={on:LS.get('viper.startup',false),lock:false,i:0,items:['BATTERY — ON','APU — START','ENGINE — START, IDLE','GENERATORS — ON','AVIONICS — ON','IFF — NORMAL','EXTERIOR LIGHTS — SET','CANOPY — CLOSED, LOCKED','MASTER ARM — SAFE']};
function startup(){if(!SU.on)return;SU.lock=true;SU.i=0;let d=document.getElementById('suChk');if(!d){d=document.createElement('div');d.id='suChk';d.style.cssText='position:fixed;left:16px;top:120px;z-index:9997;background:rgba(10,14,16,.92);color:#cfe;border:1px solid #4a6;padding:10px;font:12px "B612 Mono",monospace;max-width:320px';document.body.appendChild(d);}drawSU();}
function drawSU(){const d=document.getElementById('suChk');if(!d)return;if(!SU.lock){d.remove();return;}d.innerHTML='<b>START-UP CHECKLIST</b><div style="font-size:10px;color:#8a9">Click or press Enter for the highlighted item. Throttle at idle until complete.</div>'+SU.items.map((t,i)=>'<div data-su="'+i+'" style="cursor:pointer;'+(i===SU.i?'color:#fff;font-weight:bold':i<SU.i?'color:#6a8;text-decoration:line-through':'color:#789')+'">'+(i<SU.i?'✓ ':'· ')+t+'</div>').join('');}
function tick(){SU.i++;if(SU.i>=SU.items.length){SU.lock=false;if(typeof radio==='function')radio('Start-up complete. Ready to taxi.');}drawSU();}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#suChk [data-su]');if(b&&+b.dataset.su===SU.i)tick();});
/* ------------------------------------------------------------------ academy */
const AC=()=>LS.get('viper.quals',{});const qual=(k,n)=>{const Q=AC();if(Q[k])return;Q[k]={n,t:Date.now()};LS.set('viper.quals',Q);if(typeof flash==='function')flash('QUALIFIED · '+n.toUpperCase(),3000);};
if(typeof endGame==='function'){const _e=endGame;endGame=function(){const r=_e.apply(this,arguments);try{const ok=/WIN|VICTORY|MISSION COMPLETE|SPLASH/i.test(String(game.result||''))||game.won;if(ok&&game.scen==='GUN')qual('GUN','Air combat (guns)');if(ok&&game.scen==='STRIKE')qual('STRIKE','Strike');}catch(e){}return r;};}
setInterval(()=>{try{if(typeof TNK!=='undefined'&&TNK.on&&TNK.given>200)qual('AAR','Air-to-air refuelling');if(typeof CV!=='undefined'&&CV.on&&CV.trap&&CV.trap.caught)qual('CV','Carrier landing');}catch(e){}},2000);
/* ------------------------------------------------------------------ hooks into the world sortie */
if(window.WSORTIE){const WS=WSORTIE.WS;const _s=WSORTIE.start;WSORTIE.start=async function(a3,ap){const r=await _s.apply(this,arguments);if(WS.on&&typeof player!=='undefined'&&player){const key=a3+':'+player.type;applyWear(player,key);
    if(player.onGnd||player.pos.y-groundAt(player.pos.x,player.pos.z)<5){crew(player);startup();}WS._wearKey=key;}return r;};
  const _f=WSORTIE.finish;WSORTIE.finish=function(){const was=WS.on,key=WS._wearKey,a3=WS.me,type=typeof player!=='undefined'&&player?player.type:'';const r=_f.apply(this,arguments);if(was&&key){wearUp(key,a3,type);if(!WS.lost)qual('WS','World sortie flown and recovered');}clearCrew();SU.lock=false;drawSU();return r;};}
document.addEventListener('keydown',e=>{if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;
  if(e.shiftKey&&e.key==='F9'){e.preventDefault();setup?closeSetup():openSetup();}
  else if(e.shiftKey&&(e.key==='V'||e.key==='v')){VO.on=!VO.on;LS.set('viper.voice',VO.on);if(typeof flash==='function')flash('SPOKEN RADIO '+(VO.on?'ON':'OFF'),1500);}
  else if(e.shiftKey&&e.key==='F10'){e.preventDefault();const Q=AC();alert('FLIGHT ACADEMY\n\n'+(Object.values(Q).map(q=>'✓ '+q.n+' — '+new Date(q.t).toISOString().slice(0,10)).join('\n')||'No qualifications yet. Fly GUN, STRIKE, air refuelling and carrier landing in Quick Flight, and a world sortie.'));}
  else if(e.key==='Enter'&&SU.lock){tick();}});
// the DEBRIEF tab shows settings and qualifications
if(window.NATPANEL&&NATPANEL.tabs&&NATPANEL.tabs.DEBRIEF){const _t=NATPANEL.tabs.DEBRIEF;NATPANEL.tabs.DEBRIEF=p=>{const Q=AC(),Wr=WEAR();return _t(p)+'<h4>COCKPIT AND ACADEMY</h4>'+
  '<div class="row"><span>Realistic start-up</span><button data-ck="su" aria-pressed="'+SU.on+'">'+(SU.on?'ON':'OFF')+'</button></div><div class="row"><span>Spoken radio (Shift+V)</span><button data-ck="vo" aria-pressed="'+VO.on+'">'+(VO.on?'ON':'OFF')+'</button></div><div class="row"><span>Controllers (Shift+F9)</span><button data-ck="cs">SET UP</button></div>'+
  '<div style="font-size:10px;margin-top:4px">Qualifications: '+(Object.values(Q).map(q=>q.n).join(' · ')||'none yet')+'</div>'+
  Object.entries(Wr).filter(([k])=>k.startsWith(p.a3+':')).map(([k,w])=>'<div class="row"><span>'+k.split(':')[1]+' airframe wear</span><b>'+w.n+' sorties since repaint'+(w.rep.length?' · '+w.rep.length+' repaint'+(w.rep.length>1?'s':''):'')+'</b></div>').join('');};}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-ck]');if(!b)return;const k=b.dataset.ck;if(k==='su'){SU.on=!SU.on;LS.set('viper.startup',SU.on);}else if(k==='vo'){VO.on=!VO.on;LS.set('viper.voice',VO.on);}else openSetup();if(window.WARMAP)WARMAP.panel();});
window.COCKPIT={MAP,VO,SU,FL,crew,clearCrew,applyWear,wearUp,qual,AC,openSetup,closeSetup,startup,tick};
})();
