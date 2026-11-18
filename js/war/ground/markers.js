/* =====================================================================================================================
   MARKERS — units on the campaign map, with fog of war (v411).
   Your side's brigades (at their front, spread along it) and squadrons (at their airfields) are always shown with their
   strength. Enemy units are shown only when your side has DETECTED them: each day, each enemy unit is found with a
   chance from your intelligence quality (intel.js), higher near the front and lower deep behind it; a unit found
   stays marked for a few days with the age of the report, then fades. Symbols in the NATO style: a framed box for
   ground units (X infantry, oval armour, dot artillery), a wing for squadrons. Blue friendly, red enemy, grey stale.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W||!window.WARMAP)return;
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0)/4294967296;};
const D=Math.PI/180;
const me=()=>typeof game!=='undefined'&&game.team==='RED'?'R':'B';   // the side you fly and fight for
let apIdx=null;const ap=id=>{if(!apIdx&&window.WGEO&&WGEO.airports){apIdx=new Map();for(const a of WGEO.airports)apIdx.set(a.ident,a);}return apIdx&&apIdx.get(id);};
function pos(u){const st=W.st;if(u.kind==='SQN'){const a=u.base&&ap(u.base);return a?{lat:a.lat,lon:a.lon}:null;}
  const f=u.front&&st.fronts.find(x=>x.id===u.front);if(!f||!f.sec.length)return null;const i=Math.min(f.sec.length-1,Math.floor(hash(u.id)*f.sec.length));const s=f.sec[i];
  // our side's brigades sit on our side of the line, a few km back; the enemy's on theirs
  const side=st.c[u.a3]&&st.c[u.a3].side;const aSide=st.c[f.a].side;const k=(side===aSide?-1:1)*(6+hash(u.id+'d')*14);const off=s.off+k;
  return{lat:s.lat+s.ny*off/111.2,lon:s.lon+s.nx*off/(111.2*Math.cos(s.lat*D))};}
function seen(u,day){const st=W.st,I=st.intel&&st.intel[me()];const q=I?I.q:.5;const deep=u.kind==='SQN'?.55:u.front?1:.3;
  for(let d=0;d<4;d++){if(hash(u.id+':'+(day-d))<q*deep*.8)return d;}return -1;}
function glyph(c,x,y,u,col,stale){c.save();c.globalAlpha=stale?.55:1;c.strokeStyle=col;c.fillStyle='rgba(6,14,18,.75)';c.lineWidth=1.6;
  if(u.kind==='SQN'){c.beginPath();c.moveTo(x-8,y+3);c.lineTo(x,y-5);c.lineTo(x+8,y+3);c.lineTo(x,y);c.closePath();c.fill();c.stroke();}
  else{c.fillRect(x-8,y-5,16,10);c.strokeRect(x-8,y-5,16,10);c.beginPath();if(u.branch==='ARM'){c.ellipse(x,y,5,2.6,0,0,7);}else if(u.branch==='ART'){c.arc(x,y,1.8,0,7);c.fillStyle=col;c.fill();}else{c.moveTo(x-8,y-5);c.lineTo(x+8,y+5);c.moveTo(x+8,y-5);c.lineTo(x-8,y+5);}c.stroke();}
  c.restore();}
const _d=WARMAP.draw;WARMAP.draw=function(c,w2s,M,phase){const r=_d.apply(this,arguments);try{if(phase!=='over'||!W.st||!W.ob)return r;
  // v412: dug-in fronts: trench hatching along the line, denser as the front wears
  {const st=W.st,Wr=st.wear||{};for(const f of st.fronts){const w=Wr[f.id]||0;if(w<.15||M.ppd<3)continue;c.strokeStyle='rgba(205,170,110,'+(.35+w*.5)+')';c.lineWidth=1.2;const step=w>.6?1:2;
    for(let i=0;i<f.sec.length;i+=step){const s=f.sec[i];for(const side of[-1,1]){const o=s.off+side*4;const a={lat:s.lat+s.ny*o/111.2,lon:s.lon+s.nx*o/(111.2*Math.cos(s.lat*D))},b={lat:s.lat+s.ny*(o+side*6)/111.2,lon:s.lon+s.nx*(o+side*6)/(111.2*Math.cos(s.lat*D))};const[x0,y0]=w2s(a.lat,a.lon),[x1,y1]=w2s(b.lat,b.lon);c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();}}}}
  if(M.ppd<6)return r;const st=W.st,day=Math.floor(st.t/24),my=me();const used=new Set();
  for(const p of Object.values(st.c)){if(!p.side)continue;const mine=p.side===my;for(const u of W.ob.units(p.a3)){if(!u||u.st==='RESERVE'||u.st==='DESTROYED'||!u.str)continue;const q=pos(u);if(!q)continue;
      const age=mine?0:seen(u,day);if(age<0)continue;const[x,y]=w2s(q.lat,q.lon);if(x<-10||y<-10||x>c.canvas.width+10||y>c.canvas.height+10)continue;const ck=(mine?'m':'e')+Math.round(x/22)+':'+Math.round(y/22);if(used.has(ck))continue;used.add(ck);
      glyph(c,x,y,u,mine?'#5be1ff':age>1?'#9aa4a8':'#ff5a4a',age>1);
      if(M.ppd>=40){c.fillStyle=mine?'#bfefff':'#ffd0c8';c.font='600 9px "B612 Mono",monospace';c.fillText((u.name||'').slice(0,22)+(mine?' · '+Math.round((u.str/(u.str0||u.str))*100)+'%':(age?' · '+age+'d old':' · seen today')),x+11,y+3);}}}}
  catch(e){}return r;};
W.markers={pos,seen};
})();
