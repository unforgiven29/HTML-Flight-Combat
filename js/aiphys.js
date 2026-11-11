/* ======================================================================================================================
   v301 — The same physics for everybody else's radar (js/aiphys.js, window.AIP)

   Until now only the player's pulse radar read the real echo environment (rawvideo.js). Everyone else detected with a range law plus dice:
   AI fighters, SAM / GCI sites and radar missile seekers did not care about ground clutter, rain, chaff clouds or the radar band.

   1  AI jets          AIP.k(): signal-to-background factor in the target's own cell (terrain clutter by the radar equation, rain, chaff,
                       two-way rain attenuation) from RAWVID.bgAny. Used by the AI radar lock, the Russian AI "knows" check and SAM canSee.
   2  Missile seekers  AIP.seeker(): active / semi-active heads compare the echo with the same background; clutter, rain and a chaff cloud
                       in the cell make them lose the target (it then falls into the existing memory / reacquire logic).
   3  RWR hearing      the player's radar is heard by AI warners at several times its own range (one way), at a lower range for AESA / PD
                       (LPI): a search sweep alerts a patrol, a lock (STT) makes the AI dispense chaff.
   4  Radar band       stealth shaping is tuned for X-band: AIP.band() scales the RCS seen by long-wave early-warning radars (L / S / UHF).
   5  EA on the lock A-scope: see RAWVID.lockPaint (range-gate walk-off, noise, chaff clouds).
   6  Ground radars    GCI / early-warning sites get the background, the band effect and a duct-extended horizon over the sea.
   Gameplay-level estimates, not published data. Switch: AIP.on.
   ====================================================================================================================== */
(function(){'use strict';
if(typeof RAWVID==='undefined'||!RAWVID.bgAny||typeof AI==='undefined'||typeof radar==='undefined')return;
const D=Math.PI/180,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const A=window.AIP={on:true,hear:true,band:true,tactics:true,st:{k:0,seek:0,spike:0,lose:0,pump:0,hide:0,err:null}};
const cache=new WeakMap();

/* 1 + 6: signal-to-background multiplier (<= 1): the echo is divided by what else is in the target's cell */
A.k=function(key,opos,tgt,R0){if(!A.on||!RAWVID.on||!tgt||!tgt.pos||!key)return 1;
  const now=performance.now()/1000;let m=cache.get(key);if(!m){m=new Map();cache.set(key,m);}
  const c=m.get(tgt);if(c&&now-c.t<.35)return c.k;
  let k=1;try{const r=RAWVID.bgAny(opos,tgt.pos,R0);k=cl(r.att/r.bg,1e-4,1);}catch(e){A.st.err=String(e&&e.message||e);}
  m.set(tgt,{t:now,k:k});A.st.k++;return k;};

/* 4: stealth is shaped for X-band; a long-wave radar sees it much better. Returns the RCS multiplier (range goes with its fourth root). */
A.bandMul=function(t,fGHz){if(!A.band||fGHz>=8||!window.STEALTH)return 1;const S=STEALTH[t.type];if(!S||!S.cls)return 1;
  const e=S.cls.nm==='VLO'?1.6:S.cls.nm==='LO'?1.25:.5;return Math.min(300,Math.pow(9.7/fGHz,e));};
A.siteGHz=a=>a.k==='awacs'?3.1:(a.T&&a.T.R0>120000)?.8:3.1;      // airborne early warning S-band; long-range ground early warning UHF; others S-band
A.bandR=function(t,a){return Math.pow(A.bandMul(t,A.siteGHz(a)),.25);};
A.horMul=function(rp){if(!A.on||terrMesh(rp.x,rp.z)>=1)return 1;return Math.sqrt(RAWVID.ductK({pos:{y:Math.max(rp.y,5)}})/(4/3));};   // sea sites: a calm surface duct stretches the horizon

/* 2: radar-missile seekers read the same echo. true = the head loses the target this step. */
A.seeker=function(m,d,tgt,dt){if(!A.on||!RAWVID.on||!tgt||tgt.isDecoy||!m||!m.pos)return false;
  let op=m.pos,R0=d.seekR0||16000,dd=m.pos.distanceTo(tgt.pos);
  if(d.seek==='SARH'){const sh=m.sh;if(!sh||!sh.pos)return false;op=sh.pos;R0=(sh.ac&&sh.ac.radar&&sh.ac.radar.R0)||(sh.T&&sh.T.R0)||40000;dd=sh.pos.distanceTo(tgt.pos);}
  const k=A.k(m,op,tgt,R0);if(k>.5)return false;
  const s=SNR50*Math.pow(R0*Math.pow(((tgt.ac&&tgt.ac.rcs)||5)/5,.25)/Math.max(dd,200),4)*k;A.st.seek++;
  if(Math.random()<dt*1.5*Math.pow(1-pdOf(8*s),2)){A.st.lose++;return true;}return false;};

/* 3: what an AI warner hears of the player's radar */
A.heard=function(j){if(!A.hear||!radar.on()||radar.sensor!=='RDR'||!player||!player.alive)return 0;
  const P=player,d=j.pos.distanceTo(P.pos),aesa=!!(P.ac.radar&&P.ac.radar.aesa),pd=!P.ac.pulse,Rh=radar.R0*2.4*(aesa?.35:1)*(pd?.8:1);
  if(d>Rh||!terrLOS(P.pos,j.pos))return 0;
  if(radar.mode==='STT'&&radar.lock===j)return 2;
  const a=radar.ang(j.pos),half=Math.max(radar.beam||3.3*D,(radar.azs&&radar.azs[radar.ai]!=null?radar.azs[radar.ai]*D:60*D)*(radar.mode==='RWS'||radar.mode==='TWS'?1:.3));
  return Math.abs(Math.atan2(Math.sin(a.az-radar.antAz),Math.cos(a.az-radar.antAz)))<half+(radar.beam||3.3*D)/2?1:0;};
{const _u=AI.prototype.update;AI.prototype.update=function(dt){
  try{const j=this.j;if(j&&j.alive&&!this.friend&&!j.remote&&j!==player){const h=A.heard(j);this.spike=h;
    if(h){A.st.spike++;this.spikeT=performance.now()/1000;
      if(h===1&&this.route&&!this.engaged&&Math.random()<dt*.35)this.engaged=true;                                  // a patrol hears a radar sweeping over it and wakes up
      if(h===2&&this.cmCd<=0&&j.dispense&&j.pos.distanceTo(player.pos)<45000&&Math.random()<dt*(.9-.3*(this.sk||1)*.5)){j.dispense('chaff');this.cmCd=(1.8+Math.random()*1.4)*(this.cm||1);}}}}
  catch(e){A.st.err=String(e&&e.message||e);}
  try{A.tacSelect(this,dt);}catch(e){A.st.err=String(e&&e.message||e);}
  return _u.apply(this,arguments);};}

/* AI tactics that use the radar physics: PUMP (turn away or to the beam to break a lock without a missile in the air) and HIDE (approach low,
   along the heading that puts a ridge between the radar and the aircraft, so the echo is lost in clutter and the terrain mask) */
const _v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_v3=new THREE.Vector3(),_Y=new THREE.Vector3(0,1,0);
A.tacSelect=function(ai,dt){const j=ai.j,P=player,now=performance.now()/1000;ai.tacT=(ai.tacT||0)-dt;ai.pumpCd=(ai.pumpCd||0)-dt;
  if(!A.tactics||ai.friend||ai.sk===0||!P||!P.alive||j.remote||ai.dumb){ai.tac=null;return;}
  const d=j.pos.distanceTo(P.pos),hit=missiles.some(m=>m.alive&&m.track===j);
  if(ai.tac==='PUMP'){if(ai.tacT<=0||hit||d<12000)ai.tac=null;return;}
  if(!hit&&ai.spike===2&&d>16000&&d<60000&&ai.pumpCd<=0&&!(ai.coldT>0)){ai.tac='PUMP';ai.tacT=4+Math.random()*2.5;ai.pumpCd=10+Math.random()*8;ai.pumpSide=Math.random()<.5?1:-1;A.st.pump++;return;}
  const painted=ai.spikeT!=null&&now-ai.spikeT<8;
  if(painted&&!hit&&d>22000&&d<90000&&!(ai.coldT>0)){if(ai.tac!=='HIDE')A.st.hide++;ai.tac='HIDE';}else if(ai.tac==='HIDE'&&(!painted||hit||d<20000))ai.tac=null;};
A.tacDir=function(ai,dir){const j=ai.j,P=player;
  if(ai.tac==='PUMP'){const h=_v1.copy(P.pos).sub(j.pos).setY(0).normalize(),lookdown=j.pos.y>P.pos.y+500;
    if(lookdown)dir.set(-h.z*ai.pumpSide,-.12,h.x*ai.pumpSide);else dir.copy(h).negate();dir.normalize();return;}                       // beam the radar in look-down clutter, otherwise turn cold
  if(ai.tac==='HIDE'){const now=performance.now()/1000;
    if(!ai._hd||now-ai._hd.t>.6){const base=_v1.copy(dir).setY(0).normalize(),offs=[0,-12,12,-25,25,-40,40];let pick=0,found=false;
      for(const o of offs){const c=_v2.copy(base).applyAxisAngle(_Y,o*D),x=j.pos.x+c.x*7000,z=j.pos.z+c.z*7000,q=_v3.set(x,Math.max(0,terrMesh(x,z))+350,z);
        if(!terrLOS(P.pos,q)){pick=o;found=true;break;}}
      ai._hd={t:now,a:found?pick:0,f:found};}
    const base=_v1.copy(dir).setY(0).normalize().applyAxisAngle(_Y,ai._hd.a*D);let g=0;for(const s of[0,3,6]){g=Math.max(g,groundAt(j.pos.x+j.vel.x*s,j.pos.z+j.vel.z*s));}
    dir.set(base.x,clamp((g+380-j.pos.y)/2500,-.35,.25),base.z).normalize();}};
{const _s=AI.prototype.steer;AI.prototype.steer=function(dir){if(this.tac){try{A.tacDir(this,dir);}catch(e){A.st.err=String(e&&e.message||e);}}return _s.apply(this,arguments);};}
console.info('[aiphys] v301 shared echo physics for AI radars, SAM / GCI sites and missile seekers');
})();
