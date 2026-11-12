/* =====================================================================================================================
   riocrew.js — the WSO / EWO / RIO works the radar set in two-seaters that have no set panel of their own (F-15E, Su-30,
   Tornado, F-111, Typhoon-class, ...). F-14A/B (awg9ctl.js) and the pulse sets (pulsectl.js) have their own crews.
   What he does, from the picture, and says on the ICS: RANGE (smallest scale that holds the nearest contact), AZIMUTH sweep
   (narrow with a priority target, wide otherwise), BARS (more at long range / wide, fewer in TWS and with a close contact),
   and RWS <-> TWS (TWS with two or more contacts inside 80 NM unless a jammer strobe is up, back to RWS when the picture thins).
   He leaves the set alone in STT / ACM, when the radar is off, and for 25 s after the pilot changes range, mode or bars.
   ===================================================================================================================== */
(function(){'use strict';
if(typeof radar==='undefined'||typeof rio==='undefined'){console.warn('[riocrew] missing');return;}
const NM_=typeof NM==='number'?NM:1852,say=(s,k,cd)=>{try{rio.say(s,k,cd);}catch(e){}};
const RC=window.RIOCREW={on:true,hold:0,acc:0,mt:0,rt:0,last:''};
const mine=()=>!!(player&&player.alive&&player.ac&&player.ac.rio&&!player.ac.pulse&&!player.ac.noRdr&&!(player.ac.radar&&player.ac.radar.name==='AWG-9')&&radar.sensor==='RDR');
// the pilot touching the set keeps him off for 25 s
for(const f of['setTWS','cycleRange','nextRange','prevRange']){if(typeof radar[f]==='function'){const o=radar[f];radar[f]=function(){if(!radar._rcBusy)RC.hold=25;return o.apply(this,arguments);};}}
const _rup=rio.update;
rio.update=function(dt){_rup.apply(this,arguments);try{
  RC.hold=Math.max(0,RC.hold-dt);RC.mt-=dt;RC.rt-=dt;RC.acc+=dt;
  if(!RC.on||!mine()||!rio.active()||RC.hold>0||radar.power!=='ON'||radar.warm>0||RC.acc<1.5)return;RC.acc=0;
  if(radar.mode==='STT'||radar.mode==='ACM')return;
  const hs=[];for(const[j,tk]of radar.tracks){if(!j.alive||tk.hoj||!rio.hostile(j))continue;hs.push(player.pos.distanceTo(j.pos)/NM_);}
  hs.sort((a,b)=>a-b);const near=hs[0],jam=radar.hoj||radar.strobes.size>0,pr=rio.prio&&rio.prio.alive;
  radar._rcBusy=true;
  // range
  const want=near*1.25;let ri=radar.ranges.findIndex(v=>v*(radar.unit/NM_)>=want);if(ri<0)ri=radar.ranges.length-1;
  if(near!=null&&ri!==radar.ri&&RC.rt<=0){RC.rt=8;radar.ri=ri;const n=Math.round(radar.ranges[ri]*(radar.unit/NM_));say('Range '+n+'.','rc-ri',12);RC.last='range '+n;}
  // azimuth sweep
  if(radar.azs){const wa=radar.azs.indexOf(pr?30:60);if(wa>=0&&radar.ai!==wa&&RC.mt<=0){radar.ai=wa;say(pr?'Narrow sweep.':'Wide sweep.','rc-az',20);RC.last=pr?'narrow':'wide';}}
  // bars
  if(radar.barsL){const nb=radar.mode==='TWS'?2:(near!=null&&near<15)?2:ri>=3?4:2,bi=radar.barsL.indexOf(nb);if(bi>=0&&radar.bi!==bi&&RC.mt<=0){radar.bi=bi;say(nb+' bar.','rc-bar',15);RC.last=nb+' bar';}}
  // RWS <-> TWS
  const n80=hs.filter(d=>d<80).length,tws=n80>=2&&!jam;
  if(RC.mt<=0&&typeof radar.setTWS==='function'&&(tws&&radar.mode==='RWS'||!tws&&radar.mode==='TWS')){RC.mt=15;radar.setTWS(tws);say(tws?'TWS.':'Range while search.','rc-tws',15);RC.last=tws?'TWS':'RWS';}
  radar._rcBusy=false;}catch(e){window.__rcErr=e.stack;radar._rcBusy=false;}};
console.log('[riocrew] WSO / RIO set crew ready');
})();
