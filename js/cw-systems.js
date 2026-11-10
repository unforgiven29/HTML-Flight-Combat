/* =====================================================================================================================
   v238 — aircraft systems behind the new cockpit controls. Needs game.js, coldwar-jets.js, cwpit.js.

   F-8E variable-incidence wing (NAVAIR 01-45HHD-1, figure 1-43 and "Two-position wing controls"):
     * Wing UP = landing condition: wing raised 7°, land droop (leading edge 25° / 27°), ailerons drooped 20°, aileron throw 15° up / 45° down,
       rudder stops out (17°), autopilot disengaged. Wing DOWN = clean / cruise droop.
     * Limit: wing up, gear down 220 KIAS. The wing takes a few seconds to travel; the droop indicator shows barberpole in transit.
     * The flaps key (O) and the WING INCIDENCE handle on the left console both work the wing.
   F-104S APC (automatic pitch control): the F-104 has no AoA limiter; the T-tail pitches up past the stall. The APC shakes the stick
   near the limit and the kicker pushes the stick forward at the pitch-up boundary. APC switch OFF (APC / STAB panel or the binds
   menu) removes both: pull past ~16° and the jet pitches up on its own.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof AC==='undefined'){console.warn('[cwsys] game core missing');return;}
const is=t=>!!(typeof player!=='undefined'?player:null)&&player.alive&&player.type===t;

/* ---------------- F-8E wing incidence ---------------- */
const F8='F-8E',WING_T=4.5;
const CW_SYS=window.CW_SYS={
  wingInc(){const P=player;if(!is(F8))return;if(P._wingT>0)return;const up=!((P.flapCmd||0)>.5);
    if(up&&P.cas>220){try{radio('WING · TOO FAST TO RAISE (220 KIAS)',true);}catch(e){}return;}
    P._wingT=WING_T;P._wingTo=up;try{sfx.click();radio(up?'WING · RAISING':'WING · LOWERING');}catch(e){}},
  apcOn(type){const s=window.CW_SW;if(!s)return true;const v=s.st[type+'|APC'];return v===undefined?true:v;},
  apcToggle(){const P=player;if(!P)return;const s=window.CW_SW;if(!s)return;const k=P.type+'|APC';s.st[k]=!this.apcOn(P.type);try{flash('APC '+(s.st[k]?'ON':'OFF'),1000);sfx.click();}catch(e){}s.redraw.forEach(d=>{try{d();}catch(e){}});}};
{const _fk=flapKey;flapKey=function(){if(is(F8))return CW_SYS.wingInc();return _fk.apply(this,arguments);};}
{const pr=Jet.prototype,_fl=pr.flapLim;pr.flapLim=function(){if(this.type===F8)return(this.flapCmd||0)>.5?220:290;return _fl.call(this);};}

/* ---------------- F-104S: no limiter, APC shaker / kicker ---------------- */
try{AC['F-104S'].noLimiter=true;}catch(e){}
const SHK=12.5,KICK=15,PITCHUP=16.5;
{const _rc=readControls;readControls=function(dt){const r=_rc.apply(this,arguments);const P=player;if(!P||!P.alive)return r;
  // F-8E wing travel
  if(P.type===F8&&P._wingT>0){P._wingT-=dt;if(P._wingT<=0){P._wingT=0;P.flapCmd=P._wingTo?1:0;try{radio(P._wingTo?'WING UP · LAND DROOP':'WING DOWN · LOCKED');}catch(e){}}}
  if(P.type!=='F-104S'||P.onGnd){P._shk=P._kick=0;return r;}
  const a=(P.alpha||0)*R2D,on=CW_SYS.apcOn('F-104S');
  if(on){const shk=a>SHK;if(shk&&!P._shk){try{flash('APC · SHAKER',700);}catch(e){}}P._shk=shk?1:0;
    if(a>KICK&&!(P._kickT>0)){P._kickT=.7;try{flash('APC · KICKER',900);}catch(e){}}
    if(P._kickT>0){P._kickT-=dt;P._kick=1;P.ctl.p=Math.min(P.ctl.p,-.45);}else P._kick=0;}
  else{P._shk=P._kick=0;if(a>PITCHUP)P.ctl.p=Math.min(1,P.ctl.p+.6*Math.min(1,(a-PITCHUP)/4)+.25);}   // T-tail pitch-up: the nose keeps coming
  if(P._shk&&typeof head!=='undefined'){head.yaw+=(Math.random()-.5)*.004;head.pitch+=(Math.random()-.5)*.004;}
  return r;};}

console.info('[cwsys] F-8E wing incidence / F-104S APC active');
})();
