"use strict";
/* =====================================================================================================================
   v268 — radar debug overlay. F4 toggles it (F3 is the performance panel).
   Panel (right, under F3): the player's radar as the simulation sees it (SENSOR_FUSE.reg, the fused sensor registry): power / failure / heat /
   EMCON, link-budget range scale, beam and gimbal, scan, PRF, the lock (SNR, Pd, detection range, why it broke, jamming, ECCM)
   and every track file with its age and quality.
   Below it a plan view, heading up, to the radar's selected range: gimbal limits (dashed), scan sector, the beam, range rings,
   every real aircraft in the sky with the radar's verdict on it, and the radar's own track files. A contact is drawn in the colour
   of its verdict and labelled with the reason it is not seen:
     SEEN (green)  GIMBAL (outside the antenna's travel)  RANGE (beyond the detection range for this target, shown as a number)
     NOTCH (look-down Doppler notch / clutter)  TERRAIN (no line of sight)  HORIZON (below the Earth's curve)  JAM (noise jamming)
     OFF (the radar is not transmitting)  Hollow diamonds are track files (where the radar thinks the target is), joined to the
     real aircraft by a line, so the measurement error and a coasting file are visible.
   Console: RADARDBG.show(true|false), .ids (labels), .all (include aircraft beyond 1.5x the scale), .hz (update rate). Loaded after sensorfuse.js.
   ===================================================================================================================== */
(function(){
if(typeof radar==='undefined'||typeof jets==='undefined'||typeof player==='undefined'){console.warn('[radardbg] core missing');return;}
const RD=window.RADARDBG={on:false,ids:true,all:false,hz:10};
const D=Math.PI/180,R2=180/Math.PI,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),f=(v,n=0)=>Number.isFinite(v)?v.toFixed(n):'-';

const box=document.createElement('div');box.id='radardbg';box.hidden=true;
box.style.cssText='position:fixed;top:118px;right:6px;z-index:60;pointer-events:none;font:600 11px/1.3 "B612 Mono",monospace;color:#cfe8d4;'+
  'background:rgba(8,12,10,.78);border:1px solid rgba(140,200,150,.35);border-radius:4px;padding:5px 8px;white-space:pre;max-width:360px;';
const cv=document.createElement('canvas');cv.width=cv.height=300;
cv.style.cssText='position:fixed;right:6px;z-index:60;pointer-events:none;background:rgba(8,12,10,.78);border:1px solid rgba(140,200,150,.35);border-radius:4px;';
cv.hidden=true;document.body.appendChild(box);document.body.appendChild(cv);
const g=cv.getContext('2d');

function verdict(j,a){
  const F=window.SENSOR_FUSE,reg=F&&F.reg;
  if(radar.sensor==='RDR'&&F&&reg&&!F.radiating)return['OFF',0];
  if(!radar.on())return['OFF',0];
  if(a.off>radar.gimbal())return['GIMBAL',0];
  const R=radar.rdet(j,a);
  if(a.d>R)return['RANGE',R];
  if(typeof terrLOS==='function'&&!terrLOS(player.pos,j.pos))return['TERRAIN',R];
  if(F&&F.horizon&&radar.sensor==='RDR'&&a.d>F.horizon(player.pos.y,j.pos.y))return['HORIZON',R];
  if(radar.notch(j,a))return['NOTCH',R];
  const J=radar.jam(j);if(J&&J.noise&&a.d>J.bt)return['JAM',R];
  return['SEEN',R];}
const COL={SEEN:'#6dff8a',GIMBAL:'#8a8a8a',RANGE:'#ffb347',NOTCH:'#ff6b6b',TERRAIN:'#c58cff',HORIZON:'#c58cff',JAM:'#ff4fd8',OFF:'#666'};

let acc=0;
function rows(){const F=window.SENSOR_FUSE,r=F&&F.reg,now=performance.now()/1000,L=[];
  const rn=player&&player.ac&&player.ac.radar?player.ac.radar.name:'-';
  L.push(`RADAR  ${rn}   sensor ${radar.sensor}  mode ${radar.mode}${radar.mode==='ACM'?' '+radar.acm:''}`);
  L.push(`power  ${radar.power}  warm ${f(radar.warm,0)}s  on ${radar.on()?'YES':'NO'}`);
  if(r){L.push(`state  ${r.radarPowerState}  fail ${r.radarFailureMode}  health ${f(r.radarHealth*100)}%  bus ${r.electricalBusAvailable?'ok':'OFF'}`);
    L.push(`heat   ${f(r.radarHeatCurrent)}/${f(r.radarOverheatThreshold)}  cool ${f(r.radarCoolingLevel*100)}%  pwr ${f(r.powerLevelCurrent*100)}%`);
    L.push(`EMCON  ${r.emconState}  radiating ${F.radiating?'YES':'NO'}  Tx ${f(r.peakPowerWatts/1000,1)} kW  ${f(r.carrierFrequencyGHz,1)} GHz`);
    L.push(`link   x${f(F.kLB,3)} range  R0 ${f(radar.R0/1852,1)} NM  gain ${f(r.antennaMaxGainDb,1)} dB  NF ${f(r.receiverNoiseFigureDb,1)} dB`);
    L.push(`beam   ${f(radar.beam*R2,2)}° az ${f(r.antennaBeamwidthElDeg,2)}° el  ${r.antennaType}`);
    L.push(`prf    ${r.prfMode} ${f(r.pulseRepetitionFrequencyHz)} Hz  Ru ${f(r.maxUnambiguousRangeM/1852,1)} NM  duty ${f(r.dutyCycle*100,2)}%`);}
  L.push(`scan   az ${f(radar.antAz*R2,1)}°  el ${f(radar.antEl*R2,1)}°  bar ${radar.bar+1}/${radar.nb()}  gimbal ±${f(radar.gimbal()*R2)}°  ±${f(radar.azs[radar.ai])}°`);
  L.push(`scale  ${radar.ranges[radar.ri]} ${radar.ul}  hoj ${radar.hoj?'YES':'no'}  notched ${radar.notched>0?'YES':'no'}  lost ${radar.lostWhy||'-'}`);
  const T=radar.tgt?radar.tgt():null,Lk=radar.lock;
  if(Lk&&Lk.alive){const a=radar.ang(Lk.pos),sn=radar.snr(Lk,a),Rd=radar.rdet(Lk,a);
    L.push('');L.push(`LOCK   ${Lk.type||'?'}#${Lk.id||0}  ${radar.mode}  lostT ${f(radar.lostT,1)}s`);
    L.push(`       rng ${f(a.d/1852,1)} NM / det ${f(Rd/1852,1)} NM   off ${f(a.off*R2,1)}°`);
    L.push(`       SNR ${f(10*Math.log10(Math.max(sn,1e-9)),1)} dB  Pd ${typeof pdOf==='function'?f(pdOf(sn)*100):'-'}%  closure ${f(r?r.lockedTargetClosureMS:0)} m/s`);
    if(r)L.push(`       ECM ${r.ecmNoiseJammerActive?'NOISE ':''}${r.ecmDeceptionType!=='None'?r.ecmDeceptionType+' ':''}${!r.ecmNoiseJammerActive&&r.ecmDeceptionType==='None'?'-':''} J/S ${f(r.ecmJamToSignalRatioDb,1)} dB  burn-through ${f(r.ecmBurnThroughRangeM/1852,1)} NM  ${r.eccmAlertTextToHud||''}`);}
  else if(T)L.push('','TGT    '+(T.type||'?'));
  else L.push('','LOCK   none');
  L.push('');L.push(`TRACKS ${radar.tracks.size}${radar.mode==='TWS'&&radar.bug?'   bug '+(radar.bug.type||'?'):''}`);
  let n=0;const arr=[...radar.tracks].sort((p,q)=>p[1].d-q[1].d);
  for(const [j,tk] of arr){if(n++>=8){L.push(`  … ${arr.length-8} more`);break;}
    const err=tk.p&&j.pos?tk.p.distanceTo(j.pos):0;
    L.push(`${j===radar.lock?'*':j===radar.bug?'b':' '} ${String(j.type||'?').padEnd(8).slice(0,8)} ${f(tk.d/1852,1).padStart(5)}NM az${f(tk.az*R2).padStart(4)}° hit ${f(now-tk.t,1)}s n${tk.n||0} err ${f(err)}m${tk.hoj?' HOJ':''}${j.alive?'':' DEAD'}`);}
  try{if(RD.extraRows)for(const x of RD.extraRows())L.push(x);}catch(e){}return L.join('\n');}

function plan(){const W=cv.width,H=cv.height,cx=W/2,cy=H-28,rng=radar.ranges[radar.ri]*radar.unit,s=(H-48)/rng,gim=radar.gimbal();
  const rel=(p)=>{const r=p.clone().sub(player.pos).applyQuaternion(player.q.clone().invert());return{x:r.x,fw:-r.z,y:r.y};};
  g.clearRect(0,0,W,H);g.font='600 10px "B612 Mono",monospace';g.textBaseline='middle';
  // range rings
  g.strokeStyle='rgba(140,200,150,.25)';g.lineWidth=1;g.fillStyle='rgba(140,200,150,.6)';
  for(let i=1;i<=4;i++){const rr=rng*i/4*s;g.beginPath();g.arc(cx,cy,rr,-Math.PI+.001,-.001);g.stroke();g.fillText(f(rng*i/4/radar.unit,radar.unit===1852?0:0)+radar.ul,cx+3,cy-rr+8);}
  // gimbal limits and the scan sector
  const ray=(az,len)=>{g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.sin(az)*len,cy-Math.cos(az)*len);g.stroke();};
  g.setLineDash([4,4]);g.strokeStyle='rgba(255,200,90,.7)';ray(-gim,rng*s);ray(gim,rng*s);g.setLineDash([]);
  const Wd=Math.min(radar.azs[radar.ai]*D,gim),c=radar.scanC||0;
  g.strokeStyle='rgba(120,200,255,.55)';ray(c-Wd,rng*s);ray(c+Wd,rng*s);
  g.fillStyle='rgba(120,200,255,.07)';g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,rng*s,-Math.PI/2+c-Wd,-Math.PI/2+c+Wd);g.closePath();g.fill();
  // the beam
  g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,rng*s,-Math.PI/2+radar.antAz-radar.beam/2,-Math.PI/2+radar.antAz+radar.beam/2);g.closePath();g.fill();
  g.strokeStyle='#fff';g.lineWidth=1.3;ray(radar.antAz,rng*s);g.lineWidth=1;
  // own aircraft
  g.fillStyle='#cfe8d4';g.beginPath();g.moveTo(cx,cy-7);g.lineTo(cx-5,cy+5);g.lineTo(cx+5,cy+5);g.closePath();g.fill();
  // real aircraft with their verdicts
  const counts={};
  for(const j of jets){if(j===player||!j.alive)continue;const a=radar.ang(j.pos);if(!RD.all&&a.d>rng*1.5)continue;
    let v;try{v=verdict(j,a);}catch(e){v=['?',0];}counts[v[0]]=(counts[v[0]]||0)+1;
    const r=rel(j.pos),x=cx+r.x*s,y=cy-r.fw*s;if(x<-20||x>W+20||y<-20||y>H+20)continue;
    const col=COL[v[0]]||'#fff';g.strokeStyle=col;g.fillStyle=col;
    // detection range circle, only for the locked target
    if(j===radar.lock&&v[1]){g.globalAlpha=.4;g.beginPath();g.arc(cx,cy,v[1]*s,-Math.PI+.001,-.001);g.stroke();g.globalAlpha=1;}
    g.beginPath();g.arc(x,y,3.2,0,6.283);g.fill();
    if(j.vel){const vx=j.vel.clone().applyQuaternion(player.q.clone().invert()),k=6;g.beginPath();g.moveTo(x,y);g.lineTo(x+vx.x*.01*k,y+vx.z*.01*k);g.stroke();}
    if(j===radar.lock){g.beginPath();g.arc(x,y,7,0,6.283);g.stroke();}
    if(RD.ids)g.fillText((j.type||'?')+' '+v[0]+(v[0]==='RANGE'?' '+f(v[1]/1852,0)+'NM':''),x+6,y-5);}
  // the radar's own track files, joined to the real aircraft
  g.lineWidth=1;
  for(const [j,tk] of radar.tracks){if(!tk.p||!j.pos)continue;const p=tk.v?tk.p.clone().addScaledVector(tk.v,Math.min(performance.now()/1000-tk.t,6)):tk.p,r=rel(p),x=cx+r.x*s,y=cy-r.fw*s,q=rel(j.pos);
    if(x<-20||x>W+20||y<-20||y>H+20)continue;g.strokeStyle=j===radar.lock?'#ffffff':'#7fd4ff';
    if(j.alive){g.globalAlpha=.5;g.beginPath();g.moveTo(x,y);g.lineTo(cx+q.x*s,cy-q.fw*s);g.stroke();g.globalAlpha=1;}
    g.beginPath();g.moveTo(x,y-5);g.lineTo(x+5,y);g.lineTo(x,y+5);g.lineTo(x-5,y);g.closePath();g.stroke();}
  // legend
  g.textBaseline='top';let lx=4;g.fillStyle='rgba(140,200,150,.6)';g.fillText('PLAN  heading up  '+radar.ranges[radar.ri]+radar.ul,4,3);
  let ly=16;for(const k of Object.keys(counts)){g.fillStyle=COL[k]||'#fff';g.fillText(k+' '+counts[k],lx,ly);ly+=11;}}

function tick(t){requestAnimationFrame(tick);if(!RD.on||!player||!player.alive)return;
  acc+=1;if(t-(tick.l||0)<1000/RD.hz)return;tick.l=t;
  try{box.textContent=rows();cv.style.top=(box.offsetHeight+124)+'px';plan();}catch(e){box.textContent='[radardbg] '+e.message;}}
requestAnimationFrame(tick);

function setOn(v){RD.on=v;box.hidden=cv.hidden=!v;if(v){box.textContent='…';}}
addEventListener('keydown',e=>{if(e.code!=='F4'||e.repeat)return;e.preventDefault();setOn(!RD.on);},true);
Object.defineProperty(RD,'show',{value:setOn});

try{const k=document.querySelector('.keys');if(k&&!/Radar debug overlay/.test(k.textContent)){const d=document.createElement('div'),b=document.createElement('kbd');
  d.textContent='Radar debug overlay (track files, verdicts, lock)';b.textContent='F4';d.appendChild(b);k.appendChild(d);}}catch(e){}
console.info('[radardbg] F4: radar debug overlay');
})();
