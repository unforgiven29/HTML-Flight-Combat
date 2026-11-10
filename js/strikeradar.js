/* =====================================================================================================================
   v251 — Air-to-ground radars for the strike jets: Tornado GR.4 (GMR), F-111F (APQ-144), Su-24M (Orion-A), AJS-37 (PS-37/A),
   JH-7 (Type 232H), Super Etendard (Agave) and A-4E (APG-53A).  They use the shared ground-map radar (AGR: sector ground map and
   air-to-ground ranging) the F-16 / F-18 / F-4E / A-7D already use.
     * Tornado, F-111F, Su-24M: ground radars only.  The A/G picture is up whatever store is selected and no air target is ever detected or locked.
     * AJS-37, JH-7, Super Etendard, A-4E: also a short-range air-to-air ranging mode.  With a gun or missile selected the set is an air
       ranging radar that sees (and locks) a target only inside its limit (AJS-37 10 km, JH-7 15 km, Super Etendard 12 km, A-4E 9 km);
       with a ground store selected it is the ground radar.
   Needs game.js (AGR) and a7avionics.js.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof window.AGR==='undefined'){console.warn('[strikeradar] AGR missing');return;}
const AGR=window.AGR;
const CFG={'Tornado GR.4':{aa:0,ph:1},'F-111F':{aa:0,ph:1},'Su-24M':{aa:0},'AJS-37':{aa:10000,ph:1},'JH-7':{aa:15000},'Super Etendard':{aa:12000,ph:1},'A-4E':{aa:9000,ph:1}};
const me=P=>P&&CFG[P.type];
const gOnly=P=>me(P)&&CFG[P.type].aa===0;
// active: ground-only sets always show the ground picture; the others when an A/G store is selected (default rule)
{const _a=AGR.active;AGR.active=function(){const P=player;
  if(P&&P.ac&&P.ac.noRdr&&!P.ac.tvScope)return false;
  if(gOnly(P))return !!(P.alive&&game.active&&radar.on()&&radar.sensor==='RDR');
  return _a.call(this);};}
// air targets: none for the ground-only sets, a short ranging limit for the others when the A/G picture is not up
{const _r=radar.rdet;radar.rdet=function(j,a){const P=player,c=me(P);
  if(c&&this.sensor!=='IRST'){if(c.aa===0)return 0;const R=_r.call(this,j,a);return AGR.active()?0:Math.min(R,c.aa);}
  return _r.call(this,j,a);};}
{const _d=radar.designate;radar.designate=function(){const P=player;
  if(gOnly(P)&&radar.sensor!=='IRST'&&!(radar.mode==='STT')){flash((P.ac.radar&&P.ac.radar.name||'RADAR')+' · A/G ONLY',900);return;}
  return _d.apply(this,arguments);};}
// the phantom-style scope sits in phScopeC: draw the ground picture there and use the phantom scope geometry
{const _g=AGR.geo;AGR.geo=function(P){return P&&me(P)&&CFG[P.type].ph?{x0:62,x1:298,y0:58,y1:298}:_g.call(this,P);};}
{const _p=drawPhScope;drawPhScope=function(P){if(P&&P.ac&&P.ac.noRdr&&!P.ac.tvScope){_p(P);const c=phScopeC.getContext('2d');c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#010604';c.fillRect(0,0,360,360);c.fillStyle='#8dffb4';c.globalAlpha=.5;c.font='700 15px "B612 Mono",monospace';c.textAlign='center';c.textBaseline='middle';c.fillText('NO RADAR',180,180);c.globalAlpha=1;return;}if(P&&me(P)&&CFG[P.type].ph&&AGR.active()){AGR.drawPh(P);return;}return _p(P);};}
})();
