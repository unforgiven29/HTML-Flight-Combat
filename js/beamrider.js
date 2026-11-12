/* v314 — beam-riding laser missiles (9K121 Vikhr, Kh-25ML) with the targeting pod / Shkval.
   * With one of these selected the pod stays in charge (pod view, 100 deg field of regard, lock anything or stabilise on the ground): no separate missile seeker, no lock required.
   * Pickle starts the laser by itself and sends the missile down the beam: it flies to wherever the laser spot is, follows the spot when you slew it, and goes ballistic if the
     laser is lost for 1.5 s (masked, out of range, or switched off). The laser stays on until the last missile has hit.
   Game-level behaviour, not published data. */
(function(){
'use strict';
if(typeof SNS==='undefined'||typeof GND==='undefined'||typeof AGW==='undefined'){console.warn('[beamrider] game missing');return;}
for(const k of['Vikhr','Kh-25ML'])if(AGW[k])AGW[k].beam=1;
const isBeam=w=>{const a=AGW[w];return!!(a&&a.beam);};
// the pod, not a missile seeker, is the sensor while a beam rider is selected
{const _w=SNS.wk;SNS.wk=function(){const k=_w.call(this);if(k==='agm'&&isBeam(game.wsel)&&this.hasPod(player))return'lgb';return k;};}
{const _p=agPickle;agPickle=function(w){if(!isBeam(w)||!SNS.hasPod(player))return _p(w);
  const P=player;if(game.pickleCd>0)return;if(!game.arm){flash('MASTER ARM SIM',1200);return;}
  const ps=SNS.podSpec(),a=AGW[w],e=SNS.podPos(P);SNS.ensure(P);const rp=e.distanceTo(SNS.spi);
  if(SNS.masked){flash('POD MASKED · NO LASER PATH',1300);return;}
  if(rp>ps.lrf){flash('SPOT BEYOND LASER RANGE '+(ps.lrf/1852).toFixed(1)+' NM',1500);return;}
  if(rp>a.range*1.15){flash('OUT OF RANGE',1000);return;}
  const p=P.release(w);if(!p){flash('NO '+SN[w],1000);return;}
  GND.launchMav(w,P,p,null);const k=GND.mavs[GND.mavs.length-1];if(k){k.beam=1;k.t=0;}
  if(!SNS.laseMan){SNS.laseMan=true;SNS._auto=true;}game.pickleCd=1;sfx.click();if(SET.calls==='ON')radio('Rifle.');};}
// the laser spot is the target: a proxy that always reads the current spot, until the beam is lost
const spot={get pos(){return SNS.spi;},alive:true,T:{r:0}};
{const _f=GND.flyMavs;GND.flyMavs=function(dt){for(const k of this.mavs){if(!k.beam||k.beamDead)continue;
      if(k.tgt===spot)k.had=1;else if(k.had){k.beamDead=1;continue;}   // the base code dropped it after 1.5 s without a spot: it stays dropped
      if(SNS.lase&&SNS.spi){k.tgt=spot;k.lostL=0;}}
    return _f.call(this,dt);};}
// the laser comes on with the first launch and goes off again after the last impact (unless the pilot armed it by hand)
{const _t=SNS.tick;SNS.tick=function(dt){_t.call(this,dt);if(this._auto){let any=false;for(const m of GND.mavs)if(m.beam)any=true;if(!any){this._auto=false;this.laseMan=false;}}};}
})();
