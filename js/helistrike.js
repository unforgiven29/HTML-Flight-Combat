/* v314 — HELICOPTER STRIKE: the STRIKE mission (depot, trucks and tanks behind an SA-6 battery and two Shilkas) flown in a helicopter (the Ka-50, or the AH-64A if you picked it) that starts about 15 km short of the target,
   low and already at cruise, so the fight begins in a minute instead of after a long transit. Vikhr beam riders and B-8M1 rockets. Distances and speeds are gameplay-level choices. */
(function(){
'use strict';
if(typeof start0!=='function'||typeof GND==='undefined'||typeof AC==='undefined'){console.warn('[helistrike] game missing');return;}
const HELI=()=>AC['Ka-50']?'Ka-50':Object.keys(AC).find(t=>AC[t]&&AC[t].heli);
const _s=start0;
start0=async function(scen){
  if(scen!=='HELISTK')return _s(scen);
  const ht=AC[game.ac]&&AC[game.ac].heli?game.ac:HELI();if(!ht){return _s('STRIKE');}
  const old=game.ac;game.ac=ht;
  try{await _s('STRIKE');}finally{game.ac=old;}   // the hangar selection is left as it was
  if(!player||game.scen!=='STRIKE')return;
  game.sub='HELI';
  const C=GND.center;if(C){const d=15000,hd=player.hdg*Math.PI/180,x=C.x-Math.sin(hd)*d,z=C.z+Math.cos(hd)*d,h=groundAt(x,z);
    player.spawn(x,h+110,z,player.hdg,48);}
  const ag=agTypes(player);game.wsel=ag.find(w=>w==='Vikhr')||ag[0]||game.wsel;
  setTimeout(()=>flash('HELI STRIKE · '+GND.targets+' TARGETS · ~15 KM AHEAD · STAY LOW · VIKHR FOLLOWS THE LASER',5500),200);
  setTimeout(()=>{try{radio('Control: depot, trucks and armour about fifteen kilometres ahead, SA-6 and Shilkas in support. Stay behind the terrain until you are ready to shoot.');}catch(e){}},900);
};
const after=document.getElementById('sSTRK');
if(after){const b=document.createElement('button');b.className='qm';b.id='sHSTK';
  b.innerHTML='<i>A-G</i><b>HELI STRIKE · KA-50</b><span>Same targets as STRIKE, but you start 15 km out, low, in a Ka-50 with Vikhr and rockets. No long transit.</span><em>FLY</em>';
  after.after(b);b.onclick=()=>start('HELISTK');}
})();
