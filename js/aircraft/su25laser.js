/* v254 — Su-25: Klen-PS nose laser designator / ranger (no screen) + SPO-15 «Beryoza» controls.
   * The laser looks along a fixed line in the nose (boresight depressed 2.5°). Where that line meets the ground is the spot: a "+" on the HUD
     with the slant range; ЛАЗЕР switch (or N with a laser store selected) turns it on. Laser bombs and Kh-25ML / Kh-29L ride the spot.
   * Kh-25ML / Kh-29L: pickle fires them at the vehicle under the spot (needs the laser on, ≤ 8 km, line of sight).
   * SPO-15 panel switches (ПИТАНИЕ / ПОИСК) drive sys.rwr.pwr / srch like the Fulcrum's. */
(function(){
'use strict';
if(typeof SNS==='undefined'||typeof agHud==='undefined'){console.warn('[su25laser] game missing');return;}
const ID='Su-25',DEP=2.5*Math.PI/180,RNG=8000;
const is=P=>P&&P.type===ID;
const axis=P=>P.fwd(new V3()).addScaledVector(P.up(new V3()),-Math.tan(DEP)).normalize();
const eye=P=>P.pos.clone().addScaledVector(P.fwd(new V3()),4).addScaledVector(P.up(new V3()),-.8);
SNS.__hp=SNS.hasPod;SNS.hasPod=function(P){return is(P)?true:SNS.__hp.call(this,P);};
{const _a=SNS.active;SNS.active=function(){return is(player)?false:_a.call(this);};}
{const _t=SNS.tick;SNS.tick=function(dt){const P=player;if(!is(P)||!P.alive)return _t.call(this,dt);
  const e=eye(P),d=axis(P),g=this.ground(e,d,RNG*1.4);
  this.spi=g||e.clone().addScaledVector(d,RNG*1.4);this.unit=null;this.mav=null;this.mode='AREA';this.glim=0;this.masked=false;
  const rp=e.distanceTo(this.spi),los=!!g&&rp<RNG&&terrLOS(e,_gsA.copy(this.spi).setY(this.spi.y+1.5));
  this._rng=g?rp:0;this.lase=!!(this.laseMan&&los);this.rsrc='LRF';this.rerr=3;};}
SNS.laserKey=(_k=>function(){if(!is(player))return _k.call(this);const a=AGW[game.wsel];if(!a||!(a.k==='lgb'||a.seek==='LASER')){flash('SELECT A LASER STORE',1000);return;}
  this.laseMan=!this.laseMan;sfx.click();flash(this.laseMan?'ЛАЗЕР ВКЛ':'ЛАЗЕР ВЫКЛ',1000);})(SNS.laserKey);
addEventListener('keydown',e=>{if(e.code!=='KeyN'||e.repeat||!is(player)||!game.running||e.ctrlKey||e.metaKey||e.altKey)return;const tg=e.target&&e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT')return;
  e.stopImmediatePropagation();e.preventDefault();SNS.laserKey();},true);
// laser missiles go for the vehicle sitting on the spot
{const _p=agPickle;agPickle=function(w){const a=AGW[w],P=player;if(!is(P)||!a||a.k!=='agm'||a.seek!=='LASER')return _p(w);
  if(!SNS.lase||!SNS.spi){flash('NO LASER SPOT · ЛАЗЕР',1300);return;}
  let best=null,bd=90;for(const u of GND.units){if(!u.alive)continue;const dd=u.pos.distanceTo(SNS.spi);if(dd<bd){bd=dd;best=u;}}
  if(!best){flash('NO TARGET ON SPOT',1200);return;}SNS.unit=best;SNS.mav=best;SNS.mode='POINT';const r=_p(w);return r;};}
// HUD: the "+" where the laser points, slant range under it, state legend
{const _h=agHud;agHud=function(P,fs){const a0=AGW[game.wsel],ownHud=is(P)&&a0&&(a0.k==='agm'||a0.k==='lgb');if(!ownHud)_h(P,fs);if(!is(P)||!P.alive||!SNS.spi)return;try{
  const s=proj(SNS.spi);const on=SNS.lase,arm=SNS.laseMan,k=KPX*D2R,a=AGW[game.wsel],ru=SET.hudlang!=='EN';
  hx.save();hx.lineWidth=on?2.4:1.6;hx.globalAlpha=on?1:.75;
  if(s){const r=on?k*1.1:k*.8;line(s.x-r,s.y,s.x+r,s.y);line(s.x,s.y-r,s.x,s.y+r);if(on){circ(s.x,s.y,k*1.7);}
    if(SNS._rng>0)txt((ru?'Д ':'R ')+(SNS._rng/1000).toFixed(1),s.x+r+6,s.y+4,'left');}
  if(ownHud){const W=hb(-7,-9.4);if(W)txt((SN[game.wsel]||game.wsel)+' '+P.count(game.wsel)+(game.arm?'':' SAFE'),W.x,W.y,'left');}
  const L=hb(-7,ownHud?-10.8:-9.4);if(L)txt(arm?(on?(ru?'ЛАЗЕР ИЗЛУЧ':'LASER ON'):(ru?'ЛАЗЕР ГОТОВ':'LASER ARM')):(ru?'ЛАЗЕР ВЫКЛ':'LASER SAFE'),L.x,L.y,'left');
  hx.restore();}catch(e){}};}
// cockpit switches
if(window.CW_SW){const S=CW_SW,_g=S.get.bind(S),_f=S.flip.bind(S),isL=(id,w,ti)=>id===ID&&/КЛЕН/.test(ti||'')&&w==='ЛАЗЕР',isR=(id,w,ti)=>id===ID&&/СПО-15/.test(ti||'')&&(w==='ПИТАНИЕ'||w==='ПОИСК');
  S.get=function(id,w,ti){if(isL(id,w,ti))return!!SNS.laseMan;if(isR(id,w,ti)&&typeof sys!=='undefined'&&sys.rwr)return w==='ПИТАНИЕ'?!!sys.rwr.pwr:!!sys.rwr.srch;return _g(id,w,ti);};
  S.flip=function(id,w,ti){if(isL(id,w,ti)){SNS.laserKey();S.redraw.forEach(d=>{try{d();}catch(e){}});return;}
    if(isR(id,w,ti)&&typeof sys!=='undefined'&&sys.rwr){if(w==='ПИТАНИЕ')sys.rwr.pwr=sys.rwr.pwr?0:1;else sys.rwr.srch=sys.rwr.srch?0:1;S.redraw.forEach(d=>{try{d();}catch(e){}});return;}return _f(id,w,ti);};}
})();
