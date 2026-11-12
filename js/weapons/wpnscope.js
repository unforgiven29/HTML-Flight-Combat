/* =====================================================================================================================
   v257 — RADAR ⇄ WEAPON scope switch for every jet that has a single radar scope and carries a Maverick or other TV / IIR / laser-
   seeker store.  The F-4E already had this (PHS.wpn, key Y); this generalises it to the rest of the single-scope jets:
     Phantom-style round scope (phScopeC):  A-4E, A-7D, F-5E, Super Etendard, AJS-37, Mirage III, Mirage F1  (and the F-4E)
     Square FCR-style display (fcr):        AV-8B, F-20, AMX, Yak-141, JH-7
   Jets with MFDs / MFIs (F-16, F/A-18, F-15E, Flankers) already carry the seeker on their own pages; the MiG-27K has its own Kaira
   TV tube; jets with no scope in the cockpit (Jaguar, Su-25, Su-22M4, Su-24M) have nowhere to show it.
     * WEAPON position: the scope shows the seeker video of the selected store (SNS 'WPN' page: gate, lock quality, range, NARO/WIDE);
       clicking the scope = TMS (track), I J K L slew the seeker, B / Shift+B boresight, U break lock, ' zoom — as on the F-4E.
     * RADAR position: the jet's own radar picture, untouched.
     * Switch: a toggle beside the scope in the cockpit, the RDR / WPN tabs at the foot of the scope (click), the "Scope" bind
       (Settings ▸ Key & button binds ▸ WEAPONS), and it follows the store selector (selecting a Maverick / TV store puts the video up,
       selecting anything else puts the radar back).
   Needs game.js (PHS, SNS, AGW, AGR) and loads after every module that wraps drawPhScope / drawFCR, so its wrapper is the outermost.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof PHS==='undefined'||typeof SNS==='undefined'||typeof AGW==='undefined'||typeof drawPhScope==='undefined'||typeof drawFCR==='undefined'||typeof mfdClick==='undefined'){console.warn('[wpnscope] core missing');return;}
const plr=()=>typeof player!=='undefined'?player:null;
const cache={};

/* ---------------- which jets have the switch ---------------- */
// the scope a jet shows in its cockpit: 'ph' (round, phScopeC) / 'fcr' (square, fcr) / null
function scopeKind(t){
  if(t==='F-4E')return 'ph';
  const p=window.CW_PIT&&CW_PIT[t];if(!p)return null;
  const has=p.lay?!!p.lay.scope:!!p.sc;
  return has&&(p.sc==='ph'||p.sc==='fcr')?p.sc:null;}
function carriesSeeker(t){
  const st=typeof STN!=='undefined'?STN[t]:null;if(!st)return false;
  for(const k of Object.keys(st))for(const w of st[k]||[])if(AGW[w]&&AGW[w].k==='agm')return true;
  return false;}
function can(t){if(!t)return false;if(cache[t]===undefined)cache[t]=!!(scopeKind(t)&&carriesSeeker(t));return cache[t];}
const W=window.WPNSCOPE={can,scopeKind,levers:[],
  on(P){return !!(P&&P.alive&&can(P.type)&&PHS.wpn);},
  set(v,quiet){const P=plr();if(!P||!can(P.type))return;PHS.wpn=!!v;if(!quiet){try{sfx.click();flash(PHS.wpn?'SCOPE · WEAPON VIDEO':'SCOPE · RADAR',800);}catch(e){}}},
  toggle(){const P=plr();if(!P||!P.alive||!can(P.type)){try{flash('NO WEAPON SCOPE ON THIS JET',900);}catch(e){}return;}W.set(!PHS.wpn);}};

/* ---------------- the picture ---------------- */
const G='#8dffb4';
function chip(c,S){c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.font='700 13px "B612 Mono",monospace';c.textAlign='center';c.textBaseline='middle';
  [['RDR',122,!PHS.wpn],['WPN',182,PHS.wpn]].forEach(([t,x,on])=>{c.fillStyle=on?G:'rgba(0,0,0,.8)';c.fillRect(x,324,56,18);c.strokeStyle=G;c.lineWidth=1;c.strokeRect(x+.5,324.5,55,17);c.fillStyle=on?'#000':G;c.fillText(t,x+28,333.5);});c.restore();}
function wpnPicture(c,S,tint){
  c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.fillStyle='#000';c.fillRect(0,0,S,S);
  const a=AGW[game.wsel];
  if(a&&a.k==='agm'){
    try{SNS.drawPage(c,S,'WPN',tint?30:0);}catch(e){c.fillStyle=G;c.font='700 14px "B612 Mono",monospace';c.textAlign='center';c.textBaseline='middle';c.fillText('SEEKER VIDEO FAIL',S/2,S/2);}
    if(tint){c.globalCompositeOperation='multiply';c.fillStyle='#38e878';c.fillRect(30,30,S-60,S-60);c.globalCompositeOperation='source-over';}}
  else{c.font='700 15px "B612 Mono",monospace';c.fillStyle=G;c.textAlign='center';c.textBaseline='middle';c.fillText('NO WEAPON VIDEO',S/2,S/2-12);c.font='700 12px "B612 Mono",monospace';c.fillText('SELECT A MAVERICK / TV STORE',S/2,S/2+14);}
  c.restore();chip(c,S);}

{const _p=drawPhScope;drawPhScope=function(P){
  if(P&&W.on(P)&&scopeKind(P.type)==='ph'){wpnPicture(phScopeC.getContext('2d'),360,true);return;}
  _p.apply(this,arguments);
  // RDR / WPN tabs on the radar picture too, so the switch is visible from either side
  if(P&&P.alive&&can(P.type)&&scopeKind(P.type)==='ph')chip(phScopeC.getContext('2d'),360);};}
{const _f=drawFCR;drawFCR=function(){const P=plr();
  if(P&&W.on(P)&&scopeKind(P.type)==='fcr'){wpnPicture(fcr,360,false);return;}
  const r=_f.apply(this,arguments);
  if(P&&P.alive&&can(P.type)&&scopeKind(P.type)==='fcr')chip(fcr,360);
  return r;};}

/* ---------------- clicks on the scope ---------------- */
{const _m=mfdClick;mfdClick=function(id,x,y){const P=plr();
  if(P&&P.alive&&can(P.type)){const k=scopeKind(P.type);
    if((id==='phscope'&&k==='ph')||(id==='fcr'&&k==='fcr')){
      if(y>=322&&y<=344&&x>=118&&x<=240){W.set(x>=180);return;}                // the RDR / WPN tabs
      if(PHS.wpn){if(SNS.active())SNS.tms();else sfx.click();return;}}}          // weapon video: a click is TMS (track what is in the gate)
  return _m.apply(this,arguments);};}

/* ---------------- sensor keys follow the picture ---------------- */
// With the video up, I J K L slew the seeker (the A/G radar would otherwise own them unless Shift is held, as on the F-16)
if(typeof AGR!=='undefined'&&AGR.active){const _a=AGR.active;AGR.active=function(){const P=plr();if(P&&W.on(P)&&SNS.active())return false;return _a.apply(this,arguments);};}
// which cockpit display carries the sensor (the floating sensor box stays hidden in the cockpit view)
{const _ck=SNS.ckPage;SNS.ckPage=function(){const r=_ck.apply(this,arguments),P=plr();if(r||!P)return r;if(P.type!=='F-4E'&&W.on(P)&&this.active())return 'WPN';return null;};}

/* ---------------- the store selector drives the switch (the F-4E has its own in game.js) ---------------- */
{let lastP=null,lastW;
  setInterval(()=>{const P=plr();if(!P||!P.alive||!game.running||P.type==='F-4E'||!can(P.type)){lastP=null;return;}
    if(P!==lastP){lastP=P;lastW=undefined;}
    const w=game.wsel;if(w===lastW)return;lastW=w;const a=AGW[w];PHS.wpn=!!(a&&a.k==='agm');},200);}

/* ---------------- the 3-D toggle in the cockpit (cwpit.js calls this when it builds a board) ---------------- */
// pp: the panel group; g = {cx,cy,R}: scope centre and radius in panel metres (z of the face is 0)
W.mount=function(pp,g){
  const hm=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  const metal=new THREE.MeshPhongMaterial({color:0xb9bcbd,shininess:70,specular:0x555555}),dark=new THREE.MeshPhongMaterial({color:0x151719,shininess:20});
  // lower right of the bezel, outside the glass
  const d=g.R+.034,px=g.px!=null?g.px:g.cx+d*.78,py=g.py!=null?g.py:g.cy-d*.78,grp=new THREE.Group();grp.position.set(px,py,g.z!=null?g.z:.006);grp.userData.cwFx=1;pp.add(grp);
  const plate=new THREE.Mesh(new THREE.BoxGeometry(.05,.044,.006),dark);plate.userData.cwFx=1;plate.position.z=-.001;grp.add(plate);
  const nut=new THREE.Mesh(new THREE.CylinderGeometry(.0075,.0075,.006,14),metal);nut.rotation.x=Math.PI/2;nut.position.z=.004;nut.userData.cwFx=1;grp.add(nut);
  const lev=new THREE.Group();lev.position.z=.004;lev.userData.cwFx=1;grp.add(lev);
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(.0024,.003,.026,10),metal);arm.rotation.x=Math.PI/2;arm.position.z=.013;arm.userData.cwFx=1;lev.add(arm);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.0042,10,8),metal);tip.position.z=.027;tip.userData.cwFx=1;lev.add(tip);
  // legend
  const cv=document.createElement('canvas');cv.width=128;cv.height=96;const x=cv.getContext('2d');
  x.fillStyle='rgba(0,0,0,0)';x.clearRect(0,0,128,96);x.font='700 26px Arial';x.textAlign='center';x.fillStyle='#e6e6dc';x.fillText('WPN',64,28);x.fillText('RDR',64,84);
  x.font='700 16px Arial';x.fillStyle='#a8a89c';x.fillText('SCOPE',64,56);
  const tex=new THREE.CanvasTexture(cv);tex.generateMipmaps=false;tex.minFilter=THREE.LinearFilter;
  const lg=new THREE.Mesh(new THREE.PlaneGeometry(.05,.0375),new THREE.MeshBasicMaterial({map:tex,transparent:true,toneMapped:false,depthWrite:false}));lg.position.set(0,0,.0025);lg.userData.cwFx=1;grp.add(lg);
  const hb=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.04),hm);hb.position.set(0,0,.012);hb.userData.cwFx=1;
  hb.userData.ctl={meshes:[hb],name:'SCOPE · RADAR / WEAPON VIDEO',state:()=>PHS.wpn?'WEAPON (Maverick / TV)':'RADAR',act:()=>{W.toggle();}};grp.add(hb);
  W.levers.push(lev);return grp;};
// toggle lever: up = WEAPON, down = RADAR
setInterval(()=>{const up=PHS.wpn?.55:-.55;for(const l of W.levers)if(l&&l.rotation.x!==up)l.rotation.x=up;},120);

console.info('[wpnscope] radar / weapon scope switch active');
})();
