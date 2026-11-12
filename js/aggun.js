/* v314 — AIR-TO-GROUND CANNON MODE. The game remembers the last master mode: with an A/G store (or the pod) selected, cycling to GUN gives the A/G gun mode; cycling to a missile gives A/A again.
   In A/G gun the HUD shows a strafe pipper where the rounds will meet the ground (flown the way updateBullets flies them: gravity, drag, muzzle velocity on top of the aircraft's),
   its slant range and time of flight, a pull-up cue when the pipper is close ahead and the aircraft is still diving at it, and the air-to-air gun funnel is removed.
   Helicopters with a slaved gun (Ka-50, AH-64A) show the pipper along the turret line. Fixed-reticle jets (NO_CCIP: F-4E, MiG-21 ...) keep their fixed sight. */
(function(){
'use strict';
if(typeof agHud!=='function'||typeof gunFun!=='function'||typeof gunSol!=='function'||typeof GND==='undefined'){console.warn('[aggun] game missing');return;}
const on=()=>!!(game.active&&game.wsel==='GUN'&&game.agMM&&player&&player.alive);
// master-mode memory: any A/G store or the pod selects A/G, any missile selects A/A; the gun keeps whichever was last
setInterval(()=>{if(!game.active)return;const w=game.wsel;if(AGW[w])game.agMM=true;else if(MSL[w])game.agMM=false;
  if(on()!==!!game._agGunShown){game._agGunShown=on();if(game._agGunShown&&player&&!NO_CCIP.has(player.type))flash('A/G GUN · STRAFE',1100);}},100);
{const _m=setMM;setMM=function(m){const r=_m.apply(this,arguments);if(m==='AA')game.agMM=false;return r;};}
// the air-to-air funnel and pipper are taken out of sight (a point far behind the aircraft does not project)
const behind=P=>P.pos.clone().addScaledVector(P.fwd(new V3()),-1e5);
{const _f=gunFun;gunFun=function(P){if(P===player&&on()&&!NO_CCIP.has(P.type))return behind(P);return _f.apply(this,arguments);};}
{const _s=gunSol;gunSol=function(P,L){if(P===player&&on()&&!NO_CCIP.has(P.type)){return{t:0,aim:behind(P),miss:1e9};}return _s.apply(this,arguments);};}
// where the rounds meet the ground
const _P=new V3(),_V=new V3(),_D=new V3();
function impact(P){const g=P.gun;let dir;
  if(P.ac.heli&&P._gm){const S=P._gm,d=Math.PI/180;dir=_D.set(Math.sin(S.az*d)*Math.cos(S.el*d),Math.sin(S.el*d),-Math.cos(S.az*d)*Math.cos(S.el*d)).applyQuaternion(P.q).normalize();}
  else dir=P.fwd(_D);
  _P.copy(P.pos).addScaledVector(dir,7);_V.copy(P.vel).addScaledVector(dir,g.v);
  const dt=.02;let t=0;
  for(let i=0;i<400;i++){_V.y-=G*dt;_V.multiplyScalar(1-rho(_P.y)*.06*dt);_P.addScaledVector(_V,dt);t+=dt;
    const h=groundAt(_P.x,_P.z);if(_P.y<=h){_P.y=h;return{p:_P.clone(),t,rng:_P.distanceTo(P.pos)};}}
  return null;}
const _ah=agHud;
agHud=function(P,fs){if(!on()||NO_CCIP.has(P.type))return _ah.apply(this,arguments);
  const ru=P.ac.cockpit==='fulcrum'||P.ac.pit==='flanker'||P.ac.pit==='flogger'||P.ac.pit==='fishbed'||P.ac.pit==='foxbat',k=KPX*D2R,c=impact(P);
  hx.save();hx.lineWidth=1.6;
  {const p=hb(0,-11.6);if(p)txt((ru?'ПУШКА ЗЕМЛЯ ':'A/G GUN ')+P.gun.name+' '+P.gun.ammo+(game.arm?'':(ru?' ОТКЛ':' SAFE')),p.x,p.y,'center');}
  if(!c){const p=hb(0,-10.6);if(p)txt(ru?'НЕТ ТОЧКИ':'NO IMPACT',p.x,p.y,'center');hx.restore();return;}
  const sp=proj(c.p),fpm=projDir(_gwA.copy(P.vel).normalize()),lo=hb(0,-13.5);let clip=false,q=sp;
  if(!sp||(lo&&sp.y>lo.y)){clip=true;if(fpm&&lo)q={x:fpm.x,y:lo.y};}
  if(q){if(clip)hx.setLineDash([4,4]);
    // strafe pipper: a ring with four ticks and a centre dot
    circ(q.x,q.y,k*1.3);hx.setLineDash([]);hx.beginPath();hx.arc(q.x,q.y,2,0,7);hx.fill();
    for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,cx=Math.cos(a),cy=Math.sin(a);line(q.x+cx*k*1.3,q.y+cy*k*1.3,q.x+cx*(k*1.3+7),q.y+cy*(k*1.3+7));}
    if(fpm&&!clip)line(fpm.x,fpm.y,q.x,q.y-k*1.3);}
  {const p=hb(0,-9.6);if(p)txt((c.rng/1000).toFixed(1)+(ru?' КМ  ':' KM  ')+(ru?'T ':'TOF ')+c.t.toFixed(1),p.x,p.y,'center');}
  // pull-up: the rounds are about to land close ahead and the flight path is still pointing at the ground
  const agl=P.pos.y-groundAt(P.pos.x,P.pos.z),sink=-P.vel.y,tti=sink>2?agl/sink:99;
  if((c.rng<650||tti<(P.ac.heli?2:3.2))&&sink>5&&blink){const p=hb(0,-7);if(p){hx.save();hx.font=hfont(Math.round(fs*1.5));txt(ru?'ВВЕРХ':'PULL UP',p.x,p.y,'center');hx.restore();}}
  hx.restore();};
window.AGGUN={on,impact};
})();
