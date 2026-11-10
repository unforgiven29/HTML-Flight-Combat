/* =====================================================================================================================
   v248 — F-8E Crusader AN/APQ-94 indicator: azimuth-range indicator IP-626/APQ-94 (NATOPS "Radar displays" figure), with the
   ALR-23 IRST added to the same indicator.  Draws the whole instrument face (portrait, CRT window plus lamps) onto a canvas.
     Lamps: extended range (top left), T lock-on (left), in-envelope (bottom left), J home-on-jamming and IR (right).
     SEARCH       full-width B scan; bright vertical line = antenna azimuth; AH bar (artificial horizon, rolls with the aircraft) with its
                  < > ends; tilt mark on the right edge = antenna tilt; the acquisition bar sits at the cursor range.
     ACQUISITION  (cursor over a contact) narrow B scan; the range strobe sits beside the target.
     TRACK        narrow B scan centred on the target; aiming circle; calibrated vertical (D max / R) with the range-rate gap;
                  missile range (R max) mark; T lamp.
     ATTACK       target inside R max: in-envelope lamp, aiming dot inside the circle, range strobe superimposed on the target.
     BREAKAWAY    target inside minimum range: the big X.
     IRST         the same indicator drawn azimuth +/-30 deg by elevation (-15..+45 deg); contacts are heat blobs; the IR lamp is lit.
   ===================================================================================================================== */
(function(){
'use strict';
const W=260,H=380,NMm=1852,CX0=44,CX1=216,CY0=30,CY1=352,G='#8dffb4',GD='rgba(141,255,180,.30)',GB='#e8ffd8';
const wx=(CX0+CX1)/2,wy=(CY0+CY1)/2,ww=CX1-CX0,wh=CY1-CY0;
function lamp(c,x,y,lbl,on,col,round=true){c.save();c.fillStyle=on?col:'#1a1f1a';c.strokeStyle='#4a4f4a';c.lineWidth=2;c.beginPath();c.arc(x,y,12,0,7);c.fill();c.stroke();
  c.fillStyle=on?'#06130a':'#586058';c.font='700 14px "B612 Mono",monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(lbl,x,y+1);c.restore();}
function draw(c,P){
  c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#07090a';c.fillRect(0,0,W,H);
  // CRT window with rounded corners
  c.save();c.beginPath();c.roundRect?c.roundRect(CX0,CY0,ww,wh,10):c.rect(CX0,CY0,ww,wh);c.fillStyle='#021208';c.fill();c.clip();
  const on=radar.on&&radar.on(),irst=radar.sensor==='IRST';
  let tOn=false,env=false,jOn=false,erOn=false;
  if(P&&P.alive&&radar.power!=='OFF'){
    c.textBaseline='middle';c.font='700 12px "B612 Mono",monospace';
    if(!on&&!irst){c.fillStyle=G;c.globalAlpha=.55;c.textAlign='center';c.fillText(radar.power==='ON'?'WARM '+Math.ceil(radar.warm||0):'STBY',wx,wy);c.globalAlpha=1;}
    else if(irst)({tOn,env}=drawIR(c,P));
    else ({tOn,env,jOn}=drawRDR(c,P));
    erOn=!irst&&radar.ri===radar.ranges.length-1&&radar.ranges.length>1;
    if(radar.sensor!=='IRST'&&radar.strobes&&radar.strobes.size)jOn=true;
  }
  c.restore();
  // bezel: window frame, tick scales, lamps
  c.strokeStyle='#3a3f3a';c.lineWidth=2;c.beginPath();c.roundRect?c.roundRect(CX0-1,CY0-1,ww+2,wh+2,11):c.rect(CX0-1,CY0-1,ww+2,wh+2);c.stroke();
  lamp(c,22,46,'↑',erOn,'#ffc84a');lamp(c,22,wy-6,'T',tOn,'#ffe9a0');lamp(c,22,CY1-34,'◉',env,'#a8ffb4');
  lamp(c,238,wy-30,'J',jOn,'#ff8a5a');lamp(c,238,wy+30,'IR',irst&&radar.power!=='OFF',GB);
  c.fillStyle='#8a908a';c.font='700 9px "B612 Mono",monospace';c.textAlign='center';c.fillText('IP-626/APQ-94',130,H-8);
}
// ---------------- radar picture ----------------
function drawRDR(c,P){
  const now=performance.now()/1000,rng=radar.rngM,gim=radar.gimbal?radar.gimbal():60*D2R,stt=radar.mode==='STT',tws=radar.mode==='TWS';
  let tOn=false,env=false,jOn=false;
  const Y=d=>CY1-clamp(d/rng,0,1)*wh;
  // edge range ticks
  c.strokeStyle=GD;c.lineWidth=1.4;for(let i=1;i<10;i++){const y=CY1-i*wh/10,l=i===5?14:8;c.beginPath();c.moveTo(CX0,y);c.lineTo(CX0+l,y);c.moveTo(CX1,y);c.lineTo(CX1-l,y);c.stroke();}
  const L=stt?radar.lock:null,locked=!!(L&&L.alive);
  // azimuth scale: whole width = +/-60 deg (search); narrow B scan = +/-10 deg around the target
  const nar=locked||(radar.mode==='ACM'&&radar.acmBest);
  const X=az=>nar?wx+clamp((az-(locked&&radar.lock?radar.ang(L.pos).az:radar.cur.az))/(10*D2R),-1,1)*(ww*.17):wx+clamp(az/(60*D2R),-1,1)*(ww/2-4);
  if(nar){c.fillStyle='rgba(141,255,180,.10)';c.fillRect(wx-ww*.17,CY0,ww*.34,wh);}
  // AH bar: artificial horizon, rolls with the aircraft; vertical position follows pitch
  {const ay=clamp(CY0+wh*.42+P.pitch*R2D*3.2,CY0+16,CY1-16);c.save();c.translate(wx,ay);c.rotate(-P.bank);c.strokeStyle=G;c.lineWidth=2;
    c.beginPath();c.moveTo(-ww/2+6,0);c.lineTo(-ww/2+30,0);c.moveTo(ww/2-6,0);c.lineTo(ww/2-30,0);c.moveTo(-ww/2+14,-5);c.lineTo(-ww/2+6,0);c.lineTo(-ww/2+14,5);c.moveTo(ww/2-14,-5);c.lineTo(ww/2-6,0);c.lineTo(ww/2-14,5);c.stroke();c.restore();
    // tilt mark on the right edge: antenna elevation against the horizon bar
    const ty=clamp(ay-radar.antEl*R2D*3.2,CY0+6,CY1-6);c.strokeStyle=G;c.lineWidth=3;c.beginPath();c.moveTo(CX1-14,ty);c.lineTo(CX1-3,ty);c.stroke();}
  // search: bright vertical line at the antenna azimuth
  if(!nar){const x=X(radar.antAz);c.strokeStyle='rgba(141,255,180,.55)';c.lineWidth=3;c.beginPath();c.moveTo(x,CY0);c.lineTo(x,CY1);c.stroke();}
  // contacts
  const blip=(x,y,a,hot)=>{c.globalAlpha=a;const g=c.createRadialGradient(x,y,0,x,y,9);g.addColorStop(0,hot?'#ffffff':GB);g.addColorStop(1,'rgba(141,255,180,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,9,0,7);c.fill();c.globalAlpha=1;};
  for(const [j,tk] of radar.tracks){if(!j.alive||tk.d>rng||tk.hoj)continue;if(stt&&j!==L)continue;const age=now-tk.t;
    let az=tk.az,d=tk.d;if(locked&&j===L){const q=radar.ang(j.pos);az=q.az;d=q.d;}
    const x=X(az),y=Y(d);if(Math.abs(x-wx)>ww/2)continue;blip(x,y,clamp(1-age/9,.2,1),locked&&j===L);}
  // acquisition bar / range strobe at the cursor range
  {const sy=Y(radar.cur.r*rng),sx=X(radar.cur.az);c.strokeStyle=GB;c.lineWidth=3;c.beginPath();
    if(!locked){c.moveTo(sx-9,sy);c.lineTo(sx+9,sy);}c.stroke();}
  if(locked){
    const q=radar.ang(L.pos),d=q.d,wp=game.wsel,md=typeof MSL!=='undefined'?MSL[wp]:null;let rmax=0,rmin=450;
    try{if(md&&typeof dlzGet==='function'){const z=dlzGet(wp,L);rmax=z.rmax||0;rmin=z.rmin||450;}}catch(e){}
    if(!rmax)rmax=900;                                   // guns: the pipper range
    env=d<=rmax&&d>rmin;const brk=d<rmin;tOn=true;
    const tx=X(q.az),ty=Y(d);
    // R max mark and range strobe superimposed on the target
    c.strokeStyle=GB;c.lineWidth=3;c.beginPath();const ry=Y(rmax);c.moveTo(wx-10,ry);c.lineTo(wx+10,ry);c.stroke();
    c.lineWidth=2.5;c.beginPath();c.moveTo(tx-10,ty+5);c.lineTo(tx+10,ty+5);c.stroke();
    // aiming circle with its calibrated vertical (D max / R) and the range-rate gap
    const cy=CY0+wh*.42,rr=13;c.strokeStyle=G;c.lineWidth=2;
    if(!brk){c.beginPath();c.arc(wx,cy,rr,0,7);c.stroke();
      const rrate=clamp((player.vel.clone().sub(L.vel).dot(L.pos.clone().sub(player.pos).normalize()))/400,-1,1),gp=cy-rr-6-18*(1-Math.abs(rrate));
      c.beginPath();c.moveTo(wx,CY1-30);c.lineTo(wx,cy+rr);c.stroke();c.beginPath();c.moveTo(wx,cy-rr);c.lineTo(wx,gp+9);c.moveTo(wx,gp-9);c.lineTo(wx,CY0+10);c.stroke();
      c.beginPath();c.moveTo(wx-rr-24,cy);c.lineTo(wx-rr,cy);c.moveTo(wx+rr,cy);c.lineTo(wx+rr+24,cy);c.stroke();}
    if(env||brk){// aiming dot: where the target is against the boresight (inside the circle when it is on the nose)
      const bz=clamp(q.baz/(10*D2R),-1.4,1.4)*rr,be=clamp(q.bel/(10*D2R),-1.4,1.4)*rr;c.fillStyle=GB;c.beginPath();c.arc(wx+bz,cy-be,3.2,0,7);c.fill();}
    if(brk){c.strokeStyle=GB;c.lineWidth=2.5;c.beginPath();c.moveTo(wx-70,cy-110);c.lineTo(wx+70,cy+110);c.moveTo(wx+70,cy-110);c.lineTo(wx-70,cy+110);c.stroke();
      c.moveTo(wx-50,cy);c.lineTo(wx+50,cy);c.stroke();}
    if(radar.hoj)jOn=true;}
  return{tOn,env,jOn};
}
// ---------------- IRST picture: azimuth +/-30, elevation -15..+45 ----------------
function drawIR(c,P){
  const now=performance.now()/1000,stt=radar.mode==='STT',L=stt?radar.lock:null,locked=!!(L&&L.alive);
  const X=a=>wx+clamp(a/(30*D2R),-1,1)*(ww/2-6),Y=e=>CY1-clamp((e*R2D+15)/60,0,1)*wh;
  c.strokeStyle=GD;c.lineWidth=1;c.strokeRect(CX0+6,CY0+6,ww-12,wh-12);
  [-20,-10,0,10,20,30,40].forEach(e=>{const y=Y(e*D2R);c.beginPath();c.moveTo(CX0+6,y);c.lineTo(CX0+(e===0?26:14),y);c.moveTo(CX1-6,y);c.lineTo(CX1-(e===0?26:14),y);c.stroke();});
  [-20,-10,0,10,20].forEach(a=>{const x=X(a*D2R);c.beginPath();c.moveTo(x,CY1-6);c.lineTo(x,CY1-14);c.moveTo(x,CY0+6);c.lineTo(x,CY0+14);c.stroke();});
  c.fillStyle=G;c.font='700 12px "B612 Mono",monospace';c.textAlign='left';c.fillText('IR',CX0+10,CY0+20);
  // 6 bars of 7.5 deg, the search pattern of the ALR-23
  c.strokeStyle='rgba(141,255,180,.16)';for(let i=0;i<6;i++){const y=Y((-15+7.5*(i+.5))*D2R);c.beginPath();c.moveTo(CX0+8,y);c.lineTo(CX1-8,y);c.stroke();}
  {const x=X(radar.antAz),y=Y(radar.antEl);c.strokeStyle='rgba(141,255,180,.6)';c.lineWidth=2;c.beginPath();c.moveTo(x-7,y);c.lineTo(x+7,y);c.moveTo(x,y-7);c.lineTo(x,y+7);c.stroke();}
  // heat blobs
  for(const [j,tk] of radar.tracks){if(!j.alive||stt&&j!==L)continue;const q=radar.ang(j.pos),x=X(q.az),y=Y(q.el),a=clamp(1-(now-tk.t)/9,.2,1);
    c.globalAlpha=a;const g=c.createRadialGradient(x,y,0,x,y,8);g.addColorStop(0,'#fff');g.addColorStop(1,'rgba(141,255,180,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,8,0,7);c.fill();c.globalAlpha=1;}
  // cursor / lock
  if(locked){const q=radar.ang(L.pos),x=X(q.az),y=Y(q.el);c.strokeStyle=GB;c.lineWidth=2;c.beginPath();c.arc(x,y,13,0,7);c.stroke();
    c.font='700 11px "B612 Mono",monospace';c.textAlign='center';c.fillStyle=GB;const r=radar.rngShown?radar.rngShown(q.d):null;c.fillText(r==null?'RNG --':(r/NMm).toFixed(1),wx,CY1-22);}
  else{const x=X(radar.cur.az),y=Y(radar.cur.el||0);c.strokeStyle=G;c.lineWidth=2;c.beginPath();c.moveTo(x-9,y-9);c.lineTo(x-9,y+9);c.moveTo(x+9,y-9);c.lineTo(x+9,y+9);c.stroke();}
  return{tOn:locked,env:false};
}
window.F8IP626={W,H,draw};
})();
