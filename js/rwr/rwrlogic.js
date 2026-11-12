/* v271 — more RWR logic fed by the registry (western warners; the SPO-15 has its own hardwired priority in rwrspo15.js):
   - threat scoring from mode, range, signal, emitter type, time in track and bearing rate, smoothed so ranks do not flip each frame
   - priority-mode filters: All, Priority_Only, Top_N, Closest, Most_Lethal, Unknown_Only, with a hand-off delay before the top threat changes
   - constant-bearing (collision course) alert, spurious launch alerts, own-radar symbol suppression, intermittent-emitter memory */
(function(){
'use strict';
const X=window.RWRX;if(!X||typeof RWR_REG==='undefined'){console.warn('[rwrlogic] RWRX missing');return;}
const r=X.r,cl=(v,a,b)=>Math.max(a,Math.min(b,v)),R2=180/Math.PI;
const _seed=X.seed;X.seed=function(sy,nm,P){_seed.call(X,sy,nm,P);Object.assign(r,{thrScoreWeights:[.4,.25,.15,.1,.05],thrScoreHysteresis:1.2,thrScoreUpdateRateHz:10,thrPriorityModeSelect:sy.fam==='W'?'All':'All',thrPriorityTopN:5,thrPriorityHandoffDelayS:.8,thrBearingRateAlert:sy.fam==='W',thrBearingRateThresholdDegS:.4,thrMissileLaunchFalseAlarm:sy.fam==='W'?.25:0,thrBurstEmitterHandling:'Flag_Intermittent',thrIntermittentEmitterMemoryS:sy.mem,selfRadarSymbolSuppress:true,selfFalseAlarmsFromRadar:0});X.lg={top:null,topT:0,fa:0};};
const TYPE_W={AI:.9,SAM:.75,AAA:.5,SHIP:.35,U:.5};
const post0=X.post;
X.post=function(list,sy,P){post0.call(X,list,sy,P);if(sy.fam!=='W'||!list.length)return;const dt=X.dt||.033,clk=RW.clk,w=r.thrScoreWeights,L=X.lg||(X.lg={top:null,topT:0,fa:0});
  const a=1-Math.exp(-dt/Math.max(r.thrScoreHysteresis,.05));
  for(const t of list){if(t.ghost)continue;const rc=RW.recs.get(t.j);if(!rc)continue;const e=t.e;
    const sMode=t.mode==='L'?1:t.mode==='T'?.66:.2,sRng=cl(1-t.dEst/Math.max(e.lethal*2,1),0,1),sSig=t.pwr==null?.5:t.pwr,sType=e.g?(e.R0>60000?TYPE_W.SAM:TYPE_W.AAA):(TYPE_W.AI),
      tIn=t.mode!=='S'?cl((clk-(rc.lk0===undefined?clk:rc.lk0))/20,0,1):0;
    // bearing rate: a contact whose bearing does not drift while it gets closer is on a collision course
    const b=t.a,db=rc.pb===undefined?0:Math.atan2(Math.sin(b-rc.pb),Math.cos(b-rc.pb))/Math.max(clk-(rc.pbT||clk-dt),dt),cl_=rc.pd!==undefined&&t.d<rc.pd;rc.pb=b;rc.pbT=clk;rc.pd=t.d;rc.br=rc.br===undefined?db:rc.br+(db-rc.br)*a;
    t.cc=!!(r.thrBearingRateAlert&&cl_&&Math.abs(rc.br)*R2<r.thrBearingRateThresholdDegS&&t.d<e.lethal*1.5);
    const sBr=t.cc?1:cl(1-Math.abs(rc.br)*R2/6,0,1)*.5;r.thrScoreClosure=sBr;r.thrScoreTimeInTrack=tIn;
    const raw=w[0]*sMode+w[1]*sRng+w[2]*sSig+w[3]*sType+w[4]*Math.max(tIn,sBr);rc.sc=rc.sc===undefined?raw:rc.sc+(raw-rc.sc)*a;t.sc=rc.sc;
    t.score=(t.mode==='L'?3000:t.mode==='T'?2000:0)+rc.sc*1000;}
  list.sort((x,y)=>y.score-x.score);
  // mode filters
  const md=r.thrPriorityModeSelect;if(md==='Closest')list.sort((x,y)=>x.dEst-y.dEst);else if(md==='Most_Lethal')list.sort((x,y)=>(x.dEst/x.e.lethal)-(y.dEst/y.e.lethal));
  if(md==='Priority_Only')list.length=1;else if(md==='Top_N')list.length=Math.min(list.length,r.thrPriorityTopN);else if(md==='Unknown_Only'){for(let i=list.length-1;i>=0;i--)if(list[i].sym!=='U')list.splice(i,1);}
  // the top threat only changes after the new leader has been ahead for the hand-off delay
  const cand=list[0];if(cand){if(L.top&&L.top!==cand.j&&list.some(x=>x.j===L.top)){if(L.cand!==cand.j){L.cand=cand.j;L.candT=clk;}
      if(clk-L.candT<r.thrPriorityHandoffDelayS&&cand.mode!=='L'){const i=list.findIndex(x=>x.j===L.top);const keep=list[i];list.splice(i,1);list.unshift(keep);}else{L.top=cand.j;}}else{L.top=cand.j;L.cand=null;}}
  // spurious launch alerts: a rare false positive while the radar is processing
  if(r.thrMissileLaunchFalseAlarm>0&&Math.random()<r.thrMissileLaunchFalseAlarm/3600*dt&&typeof rwrState!=='undefined'){rwrState.launchT=2;RW.tLaunch=0;if(typeof flash==='function')flash('RWR · LAUNCH (UNCONFIRMED)',1200);}
  // own radar emission recognised and hidden: otherwise a strong close return of your own radar shows as a threat
  if(!r.selfRadarSymbolSuppress&&typeof radar!=='undefined'&&radar.on&&radar.on()&&Math.random()<.002)r.selfFalseAlarmsFromRadar++;
};
console.info('[rwrlogic] scoring, priority modes, bearing-rate alert wired');
})();
