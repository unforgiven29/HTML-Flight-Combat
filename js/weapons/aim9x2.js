/* v325: AIM-9X Block II and lock-on-after-launch (LOAL).
   Block II: the Block I seeker and airframe with a better head (range, tracking rate) and a wider LOAL search cone; the real round's datalink is not modelled. Figures are gameplay estimates.
   LOAL: a missile with d.loal can be fired without a seeker lock; the head is uncaged at the end of the motor-stabilisation delay and takes the nearest hot target in its search cone. */
(function(){'use strict';
const M=window.MJ;if(!M||typeof MSL==='undefined'){console.warn('[aim9x2] helpers missing');return;}
const D=D2R;
M.aam('AIM-9X-II','AIM-9X',{mass:86,acc:175,irR:18000,aiR:16000,trk:1.8,ccm:.9,maxG:60},null,.127,'9X2','Sidewinder · AIM-9X Block II · imaging IR, LOAL');
// which rounds can be launched before the seeker has a lock (search cone in radians around the velocity vector)
const LOAL={'AIM-9X-II':55,'AIM-9X':60,'IRIS-T':60,'ASRAAM':50,'Python 5':55,'AAM-5':40,'R-74M2':40,'MICA IR':40,'PL-10':45};
// blind-shot acquisition: the instantaneous field of view of the head, NOT its off-boresight gimbal. A round fired with no lock only picks up a target that sits almost dead ahead of it (degrees off the nose).
const ACQ={'AIM-9X-II':3,'AIM-9X':3,'IRIS-T':3,'ASRAAM':3,'Python 5':3,'AAM-5':3,'MICA IR':3,'PL-10':3.5,'R-74M2':4};
for(const k of Object.keys(LOAL))if(MSL[k]){MSL[k].loal=true;MSL[k].search=LOAL[k]*D;MSL[k].acq=(ACQ[k]||4)*D;}
// the Block II goes wherever the Block I hangs
// modern active-radar rounds with a datalink: fire with no lock and they are flown at a track / search after launch
const DLK=/^(AIM-120|Meteor|PL-1[25]|R-77|MICA[ -]?EM|Derby|I-Derby|Astra|AIM-260|SD-10|AAM-4|Sky ?Sword|TK-?[12])/;
for(const k of Object.keys(MSL))if(MSL[k].seek==='ARH'&&DLK.test(k)){MSL[k].dlk=true;if(!MSL[k].search)MSL[k].search=45*D;}
if(typeof STN!=='undefined')for(const id of Object.keys(STN))for(const k of Object.keys(STN[id])){const l=STN[id][k];if(Array.isArray(l)&&l.includes('AIM-9X')&&!l.includes('AIM-9X-II'))l.push('AIM-9X-II');}

/* LOAL cue (v334). Every lock-on-after-launch round is fired at a cue: the STT lock, the TWS bugged target, else the nearest radar / link track inside the round's
   LOAL cone. It flies at the cue, the head - slewed to it - takes the target once the target is inside its range and within 3 km of where the cue says it is.
   AIM-9X Block II (dlir) gets the launch aircraft's track updates in flight (datalink); the others fly at the cue as it stood at launch, extrapolated at the track's
   velocity, so a target that jinks away from the cue is missed. With no track to cue from, the round falls back to the narrow blind-shot cone above. */
if(MSL['AIM-9X-II'])MSL['AIM-9X-II'].dlir=true;
const _fm=window.fireMissile;
if(typeof _fm==='function'){window.fireMissile=function(type,sh,tg,st){const m=_fm.apply(this,arguments);
  try{const d=MSL[type];if(m&&!tg&&d&&d.loal&&sh===player&&radar.sensor==='RDR'){
    let cue=null,bd=1e9;const lk=radar.mode==='STT'?radar.lock:radar.mode==='TWS'&&radar.bugOK()?radar.bug:null;
    if(lk&&lk.alive&&dlLinkEst(lk)){cue=lk;bd=lk.pos.distanceTo(player.pos);}
    else{const f=player.fwd(new V3()),cone=Math.min(d.search||1,75*D);for(const [j,tk] of radar.tracks){if(!j.alive||tk.hoj||j.side===player.side)continue;const r=j.pos.clone().sub(player.pos),dd=r.length();
      if(f.angleTo(r)<cone&&dd<bd&&dlLinkEst(j)){bd=dd;cue=j;}}}
    if(cue){const e=dlLinkEst(cue);m.dlTgt=cue;m.dlE={p:e.p.clone(),v:e.v.clone(),t:m.t};flash(type+' \u00b7 LOAL \u00b7 '+(d.dlir?'DATALINK ':'CUE ')+Math.round(bd/NM)+' NM',1200);}}}catch(e){}
  return m;};}
const _mu=Missile.prototype.update;
Missile.prototype.update=function(dt){
  const tg=this.dlTgt;
  if(tg&&!this.track&&this.t>.3){
    if(tg.alive){let e=null;
      if(this.def.dlir){e=dlLinkEst(tg);if(e){this.dlE.p.copy(e.p);this.dlE.v.copy(e.v);this.dlE.t=this.t;}else this.maddog=true;}   // link lost: back to the blind cone
      else e={p:this.dlE.p.clone().addScaledVector(this.dlE.v,this.t-this.dlE.t),v:this.dlE.v};
      if(e){this.lastP.copy(e.p);this.lastV.copy(e.v);this.memT=0;this.maddog=false;
        const r=tg.pos.clone().sub(this.pos),dd=r.length(),vd=this.vel.clone().normalize();
        if(this.t-this.def.ign>.6&&!(this.noReacq>this.t)&&dd<irLockRange(this.def,tg,this.pos)&&tg.pos.distanceTo(e.p)<3000&&vd.angleTo(r)<this.def.gimbal*.9){
          this.track=tg;this.target=tg;this.lastP.copy(tg.pos);this.lastV.copy(tg.vel);this.dlTgt=null;if(tg===player)rwrEvent('active');}}}
    else this.dlTgt=null;}
  return _mu.apply(this,arguments);};
console.log('[aim9x2] AIM-9X Block II + LOAL ready');
})();
