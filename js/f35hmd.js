"use strict";
/* v315 — F-35 helmet-mounted display symbology. The F-35 has no HUD; the visor carries the whole picture. Everything the jet knows is drawn where it is in the world:
   hostile tracks (own sensors, red square, range and closure), datalink-only tracks (same square, dashed, no closure), flight members and friendlies (green circle with
   callsign), enemy missiles seen by the DAS/MAWS (red triangle, time to impact) and missiles in flight from this jet (white diamond, time of flight left),
   the radar lock (corner brackets, range, closure) and the helmet-acquisition circle while the radar is slaved to the head (ACM HMD). */
(function(){
if(typeof drawHUD==='undefined'||typeof DL==='undefined'||typeof proj==='undefined'){console.warn('[f35hmd] core missing');return;}
const D=Math.PI/180;
function sq(c,x,y,r,dash){c.save();if(dash)c.setLineDash([3,3]);c.strokeRect(x-r,y-r,r*2,r*2);c.restore();}
function tri(c,x,y,r){c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.9,y+r*.7);c.lineTo(x-r*.9,y+r*.7);c.closePath();c.stroke();}
function brk(c,x,y,r){const k=r*.55;c.beginPath();for(const[sx,sy]of[[-1,-1],[1,-1],[1,1],[-1,1]]){c.moveTo(x+sx*r,y+sy*(r-k));c.lineTo(x+sx*r,y+sy*r);c.lineTo(x+sx*(r-k),y+sy*r);}c.stroke();}
function overlay(){const P=player;if(!P||!P.alive||P.type!=='F-35A'||view!=='cockpit'||P.gloc>0)return;
  const poly=hudPoly();if(!poly)return;const S=window.F35PIT&&F35PIT.S2,br=S?Math.max(.15,S.hmdBrt):.7,c=hx,now=performance.now()/1000;
  c.save();c.beginPath();poly.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip();
  c.globalAlpha=br;c.lineWidth=1.6;c.font='700 12px "B612 Mono",ui-monospace,monospace';c.textBaseline='middle';c.textAlign='left';c.shadowBlur=3;
  const RED='#ff5a4a',GRN='#59ff9f',WHT='#f2f6f2',CYN='#7de8ff';
  // flight members and friendlies
  c.strokeStyle=c.fillStyle=GRN;c.shadowColor=GRN;
  for(const m of DL.flight()){const s=proj(m.j.pos);if(!s)continue;c.beginPath();c.arc(s.x,s.y,7,0,7);c.stroke();c.fillText(m.j.callsign||('F'+m.n),s.x+10,s.y-9);}
  for(const j of jets){if(j===P||!j.alive||j.side!==P.side||j.wingman)continue;if(P.pos.distanceTo(j.pos)>40000)continue;const s=proj(j.pos);if(!s)continue;
    c.beginPath();c.arc(s.x,s.y,4,0,7);c.stroke();}
  // hostile picture: own tracks solid, datalink only dashed
  let list=[];try{list=DL.contacts();}catch(e){}
  for(const t of list){const s=proj(t.pos);if(!s)continue;const lk=t.src==='LNK',locked=radar.mode==='STT'&&radar.lock===t.j;
    c.strokeStyle=c.fillStyle=lk?CYN:RED;c.shadowColor=c.strokeStyle;const d=t.pos.distanceTo(P.pos);
    sq(c,s.x,s.y,locked?9:7,lk);
    c.fillText((d/1852).toFixed(0)+(lk?' L':'')+(t.id?' '+t.id:''),s.x+11,s.y-9);
    if(!lk){const cl=-t.vel.clone().sub(P.vel).dot(t.pos.clone().sub(P.pos).normalize());c.fillText((cl>0?'+':'')+Math.round(cl*1.944),s.x+11,s.y+7);}}
  // radar lock
  if(radar.mode==='STT'&&radar.lock&&radar.lock.alive){const L=radar.lock,s=proj(L.pos);
    if(s){c.strokeStyle=c.fillStyle=RED;c.shadowColor=RED;brk(c,s.x,s.y,15);const d=L.pos.distanceTo(P.pos),cl=-L.vel.clone().sub(P.vel).dot(L.pos.clone().sub(P.pos).normalize());
      c.fillText('TD '+(d/1852).toFixed(1)+' NM',s.x+19,s.y-7);c.fillText((cl>0?'+':'')+Math.round(cl*1.944)+' KT',s.x+19,s.y+8);}}
  // helmet acquisition: the radar follows the head, the circle is where it looks
  if(radar.mode==='ACM'&&radar.acm==='HMD'&&radar.on()){const b=proj(P.pos.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5000)));
    if(b){c.strokeStyle=c.fillStyle=WHT;c.shadowColor=WHT;c.save();c.setLineDash([4,4]);c.beginPath();c.arc(b.x,b.y,KPX*D*2.5,0,7);c.stroke();c.restore();c.fillText('HMD ACQ',b.x+KPX*D*2.5+6,b.y);}}
  // enemy missiles seen by the warning system, and the jet's own missiles
  c.strokeStyle=c.fillStyle=RED;c.shadowColor=RED;
  const seen=new Set();try{if(window.MSS)for(const w of MSS.warned)if(w.m)seen.add(w.m);}catch(e){}
  for(const m of missiles){if(!m.alive)continue;const s=proj(m.pos);if(!s)continue;
    if(m.sh===P){c.strokeStyle=c.fillStyle=WHT;c.shadowColor=WHT;diamond(s.x,s.y,6);c.fillText('M'+Math.max(0,Math.round((m.tti!=null?m.tti:0))),s.x+10,s.y);}
    else if(seen.has(m)){c.strokeStyle=c.fillStyle=RED;c.shadowColor=RED;tri(c,s.x,s.y,8);c.fillText('MSL '+(m.pos.distanceTo(P.pos)/1852).toFixed(1),s.x+11,s.y);
      if(now%.6<.35)c.fillText('!',s.x-3,s.y-14);}}
  c.restore();}
const _h=drawHUD;drawHUD=function(){_h.apply(this,arguments);try{overlay();}catch(e){if(!overlay.w){overlay.w=1;console.warn('[f35hmd]',e);}}};
window.F35HMD={overlay};
})();
