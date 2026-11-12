/* v314 — helicopter systems for the Ka-50 and AH-64A: two engines each with gas-generator speed, turbine gas temperature, torque and their own damage; single-engine
   performance; engine fires; main-transmission oil pressure and temperature with a leak and a seizure countdown; tail-rotor damage on the AH-64A (loss of anti-torque spins the
   nose round with the engine torque); hydraulics through the existing damage zones; a TADS failure; vibration that grows towards Vne and with blade damage; cautions and a status
   readout on the HUD. Figures are gameplay-level estimates from public data (T700-GE-701: 1,690 shp, TV3-117VMA: 2,200 shp), not published model data. */
(function(){
'use strict';
if(!window.HELI||typeof SNS==='undefined'){console.warn('[helisys] heli base missing');return;}
const DEG=Math.PI/180,rnd=Math.random;
const FIT={'Ka-50':{eng:'TV3-117VMA',tgtMax:990,tgtCont:950,tr:false,gbox:'VR-80'},'AH-64A':{eng:'T700-GE-701',tgtMax:875,tgtCont:850,tr:true,gbox:'MGB'}};
const S=j=>j.hs||(j.hs={e:[{ok:1,hp:100,n1:0,tgt:20,trq:0,fire:0,fireT:0},{ok:1,hp:100,n1:0,tgt:20,trq:0,fire:0,fireT:0}],oil:100,temp:20,leak:0,seize:0,tr:100,tads:1,vib:0,last:j.hp,lastEng:j.dm?j.dm.eng:100,msg:{},tt:0,pwF:1});
const say=(j,k,txt,cd=8)=>{if(j!==player)return;const s=S(j),now=performance.now()/1000;if((s.msg[k]||0)>now)return;s.msg[k]=now+cd;try{flash(txt,1300);}catch(e){}};

function pre(j,h,H,dt){const F=FIT[j.type];if(!F||!j.alive)return;const s=S(j);s.tt+=dt;
  // ---- damage ingest: hits lower hp; some of every hit lands in a system ----
  const dHp=s.last-j.hp;s.last=j.hp;
  if(dHp>1.2){const w=Math.min(40,dHp);
    if(rnd()<w*.022){const e=s.e[rnd()<.5?0:1];e.hp=Math.max(0,e.hp-w*(.8+rnd()*2.4));if(e.hp<35&&!e.fire&&rnd()<.55){e.fire=1;e.fireT=0;}if(e.hp<=0){e.ok=0;}}
    if(rnd()<w*.012)s.leak=Math.max(s.leak,.4+rnd()*.8);
    if(F.tr&&rnd()<w*.014)s.tr=Math.max(0,s.tr-w*(1+rnd()*3));
    if(rnd()<w*.006)s.tads=0;
    if(rnd()<w*.01&&j.dm)j.dm.hyd=Math.max(0,j.dm.hyd-w*2);}
  // the older damage zones also feed the engines (a drop in dm.eng is a hit on one of them)
  if(j.dm){const d=s.lastEng-j.dm.eng;s.lastEng=j.dm.eng;if(d>0){const e=s.e[rnd()<.5?0:1];e.hp=Math.max(0,e.hp-d);if(e.hp<=0)e.ok=0;}}
  // ---- engines ----
  const run=h.run&&j.totalFuel>0&&h.start<=0,nOn=s.e.filter(e=>e.ok&&e.hp>0&&run).length;
  let pw=0;for(const e of s.e)if(e.ok&&e.hp>0)pw+=.5*(.4+.6*e.hp/100);
  s.pwF=h.pwF=run?Math.max(0,pw):0;
  const frac=Math.min(1.2,(h.Pe||0)/Math.max(h.Pa||1,1)),perTrq=nOn?Math.min(1.3,(h.Pe||0)/Math.max((h.Pa||1)/2,1)/nOn):0;
  const oat=15-6.5*Math.min(j.pos.y,6000)/1000;
  for(let i=0;i<2;i++){const e=s.e[i],live=e.ok&&e.hp>0&&run;
    const n1t=live?(h.start>0?20:62+38*Math.min(1,.35+perTrq*.7)):0;e.n1+=(n1t-e.n1)*Math.min(1,dt*(live?.8:.25));
    e.trq=live?perTrq*100:0;
    const tgtT=oat+(live?330+560*Math.min(1.0,perTrq)*(1+.0009*Math.max(0,oat-15)):0);e.tgt+=(tgtT-e.tgt)*Math.min(1,dt*.5);
    if(e.tgt>F.tgtMax&&live){e.hp-=(e.tgt-F.tgtMax)*.05*dt;say(j,'ot'+i,'ENG '+(i+1)+' TGT OVERTEMP',3);}
    if(e.hp<=0&&e.ok){e.ok=0;}
    if(!e.ok||e.hp<=0){if(!e.failed){e.failed=1;say(j,'ef'+i,'ENG '+(i+1)+' FAIL',2);}}
    if(e.fire){e.fireT+=dt;j.hp-=2.2*dt;say(j,'fi'+i,'ENG '+(i+1)+' FIRE',2.5);
      // the fire bottle goes off about 8 s after the engine is shut down (the failed engine is isolated by the crew)
      if(!e.ok&&e.fireT>8){e.fire=0;if(j===player)flash('ENG '+(i+1)+' FIRE · EXTINGUISHED',1500);}}}
  if(nOn===1&&run)say(j,'oei','SINGLE ENGINE',10);
  // ---- main transmission ----
  const trq=Math.min(1.3,(h.Pe||0)/Math.max(h.Pa||1,1)),rpm=Math.min(1.1,h.Nr||0);
  s.oil=Math.max(0,s.oil-s.leak*(.55*dt)*(rpm>.3?1:.2));
  const heat=18+75*trq*rpm+(100-s.oil)*.9,tT=oat+heat*(rpm>.3?1:.1);s.temp+=(tT-s.temp)*Math.min(1,dt*.04);
  if(s.oil<30)say(j,'gop','GBOX OIL PRESS',6);if(s.temp>140)say(j,'gt','GBOX OIL TEMP',6);
  if(s.oil<=0&&rpm>.3||s.temp>175){s.seize+=dt;if(s.seize>(s.oil<=0?70:25)){if(j.alive)j.kill('TRANSMISSION SEIZURE');return;}}else s.seize=Math.max(0,s.seize-dt*.5);
  // ---- vibration: speed, retreating-blade stall near Vne, effective translational lift, damage ----
  const V=j.vel.length(),vk=V/(H.vne/3.6);s.vib=Math.min(1,.04+Math.pow(Math.max(0,vk-.55),2)*2.2+(s.tr<60?.15:0)+(1-Math.min(1,j.hp/100))*.25+Math.max(0,1-Math.abs(V-11)/4)*.08*(j.onGnd?0:1));
  if(j.shake!==undefined)j.shake=Math.max(j.shake,s.vib*.5);
  // ---- gun / sensor: a hit TADS is gone ----
  if(!s.tads&&j===player)say(j,'tads','TADS FAIL',12);
}
// anti-torque: with the tail rotor damaged the main rotor torque turns the nose; a coaxial machine has no such coupling
function yaw(j,h,H){const F=FIT[j.type];if(!F||!F.tr||j.onGnd)return 0;const s=S(j),lost=1-Math.max(0,Math.min(100,s.tr))/100;if(lost<.02)return 0;
  const trq=Math.min(1.3,(h.Pe||0)/Math.max(h.Pa||1,1));const spd=Math.min(1,j.vel.length()/45);return lost*trq*50*DEG*(1-.7*spd);}
{const _p=SNS.podKind;SNS.podKind=function(P){if(P&&P.type==='AH-64A'&&P.hs&&!P.hs.tads)return null;return _p.call(this,P);};}

// ---- HUD readout: shown while anything is degraded (and always on the ground for the engine start) ----
function lines(P){const s=S(P),F=FIT[P.type],o=[],tx=(a,b)=>a+' '+b;
  s.e.forEach((e,i)=>{if(!e.ok||e.hp<=0||e.fire||e.hp<70||e.tgt>F.tgtCont)o.push(['ENG'+(i+1)+(e.fire?' FIRE':!e.ok||e.hp<=0?' FAIL':e.tgt>F.tgtCont?' HOT':' DMG')+'  N1 '+Math.round(e.n1)+'  TGT '+Math.round(e.tgt)+'  TRQ '+Math.round(e.trq),!e.ok||e.fire]);});
  if(s.oil<75||s.temp>130)o.push(['GBOX OIL '+Math.round(s.oil)+'%  '+Math.round(s.temp)+'C'+(s.seize>0?'  SEIZE '+Math.max(0,Math.round((s.oil<=0?70:25)-s.seize))+'S':''),s.oil<30||s.temp>140]);
  if(F.tr&&s.tr<95)o.push(['TAIL ROTOR '+Math.round(s.tr)+'%',s.tr<50]);
  if(!s.tads&&P.type==='AH-64A')o.push(['TADS FAIL',true]);
  if(s.vib>.45)o.push(['VIB '+Math.round(s.vib*100),s.vib>.75]);
  return o;}
{const _a=agHud;agHud=function(P,fs){_a.apply(this,arguments);if(!P||!P.alive||!P.ac||!P.ac.heli||!P.hs)return;
  const o=lines(P);if(!o.length)return;hx.save();hx.font=hfont(Math.round(fs*.85));
  o.slice(0,5).forEach((r,i)=>{const p=hb(-9.4,-4.4+(-i*.8));if(p){hx.fillStyle=r[1]&&blink?'#ff6a55':hx.fillStyle;txt(r[0],p.x,p.y,'left');}});hx.restore();};}
// repair: a new sortie starts with healthy systems (the state lives on the aircraft object, which is rebuilt)
window.HELISYS={pre,yaw,lines,S,FIT};
})();
