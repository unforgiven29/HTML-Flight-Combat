/* =====================================================================================================================
   v330 — diplomacy and the end of the war on the world-war panel (presentation only; diplomacy.js and WWAR own state).
   War status (at war / general ceasefire / ended and how), active ceasefires, the latest diplomacy, and when the war ends
   the report spec ch.14 asks for: how it ended, how long it lasted, what it cost (labelled estimates), where the lines
   stand, the cities that changed hands and the people living in them, who changed sides and why. Then CONTINUE POSTWAR.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WARMAP||!WWAR.diplo)return;
const W=WWAR,esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KIND={ARMISTICE:'ARMISTICE',CAPITULATION:'CAPITULATION',FROZEN:'FROZEN CONFLICT',NEGOTIATED_PEACE:'NEGOTIATED PEACE',MUTUAL_EXHAUSTION:'MUTUAL EXHAUSTION',DECISIVE_VICTORY:'DECISIVE MILITARY VICTORY',WITHDRAWAL:'WITHDRAWAL',COALITION_COLLAPSE:'COALITION COLLAPSE',REGIME_CHANGE:'REGIME CHANGE',STALEMATE:'UNRESOLVED STALEMATE'};
document.head.insertAdjacentHTML('beforeend','<style>#wsDip{border:1px solid rgba(255,207,90,.35);border-radius:4px;padding:6px;display:grid;gap:3px;font-size:10.5px}#wsDip b{color:#ffcf5a}#wsDip .rep{display:grid;gap:3px}#wsDip h4{margin:4px 0 0;font:700 10px "B612 Mono",monospace;letter-spacing:.12em;color:#8a9a92}</style>');
function render(){const el=document.getElementById('wmWar'),st=W.st;if(!el||!st)return;let box=el.querySelector('#wsDip');if(box)box.remove();
  const d=st.dip||{},cf=st.fronts.filter(f=>f.cf),dip=st.ev.filter(e=>e.ty==='DIPLO'||e.ty==='CEASEFIRE'||e.ty==='ALIGN').slice(-4).reverse();
  let h='<div id="wsDip"><div class="row"><span>STATUS</span><b>'+(st.over?(KIND[st.over.kind]||st.over.kind)+(st.post?' · POSTWAR':''):d.cease?'GENERAL CEASEFIRE · DAY '+(d.quiet+1)+' OF 14':'AT WAR')+'</b></div>';
  const n=st.nat;if(n&&!st.over)h+='<div class="row"><span>Coalition cohesion</span><span><b style="color:#5be1ff">'+Math.round(n.coh.B*100)+' %</b> · <b style="color:#ff7a68">'+Math.round(n.coh.R*100)+' %</b></span></div>';
  const sp=WARMAP.UI.sel&&st.c[WARMAP.UI.sel];if(sp&&sp.sup!=null)h+='<div class="row"><span>'+esc(sp.n)+' home front</span><span>support '+Math.round(sp.sup*100)+' % · stability '+Math.round(sp.stab*100)+' % · economy '+Math.round(sp.econ*100)+' %'+(sp.disp?' · '+(sp.disp/1e6).toFixed(2)+' M displaced (est.)':'')+'</span></div>';
  if(cf.length&&!st.over)h+='<div>Ceasefires: '+cf.map(f=>esc(st.c[f.a].n)+' / '+esc(st.c[f.b].n)+' ('+f.cf.kind.toLowerCase()+')').join(', ')+'</div>';
  if(!st.over)h+=dip.map(e=>'<div>· '+esc(e.txt)+'</div>').join('');
  const r=st.report;if(st.over&&r){h+='<div class="rep"><h4>HOW IT ENDED</h4><div>'+esc(r.txt)+' After '+r.days+' days.</div>'+
    '<h4>WHAT IT COST (ESTIMATES)</h4><div>Combat aircraft lost: about '+r.air.B+' BLUEFOR, '+r.air.R+' REDFOR. Ground brigade-equivalents destroyed: about '+r.gnd.B+' BLUEFOR, '+r.gnd.R+' REDFOR. Behind each of these numbers are crews and soldiers; the simulation does not count them one by one, and these are not real figures.</div>'+
    '<h4>WHERE THE LINES STAND</h4>'+r.lines.map(l=>'<div>'+esc(l.a)+' / '+esc(l.b)+': '+(l.km<3?'at the old border':l.km+' km into '+esc(l.into))+'</div>').join('')+
    (r.cities.length?'<h4>CITIES UNDER ANOTHER COUNTRY\'S CONTROL</h4><div>'+r.cities.map(c=>esc(c.n)+' ('+esc(c.own)+', held by '+esc(c.h)+')').join(', ')+'. About '+(r.pop/1e6).toFixed(1)+' million people live in them.</div>':'')+
    (r.civ?'<h4>PEOPLE AND HOME FRONTS (ESTIMATES)</h4><div>About '+(r.civ.disp/1e6).toFixed(1)+' million people were displaced from their homes (30 % of the population of each city that changed hands: a rule, not a count); about '+(r.civ.ref/1e6).toFixed(2)+' million crossed into neutral countries.'+(r.civ.gov.length?' Governments that fell: '+r.civ.gov.map(esc).join(', ')+'.':'')+'</div>'+(r.civ.econ.length?'<div>Economies at the end (share of prewar): '+r.civ.econ.map(e=>esc(e.n)+' '+e.e+' %').join(', ')+'.</div>':'')+(r.civ.terms?'<div>Terms: '+esc(r.civ.terms)+'.</div>':''):'')+
    (r.changed.length?'<h4>COUNTRIES THAT CHANGED POSITION</h4>'+r.changed.slice(0,12).map(c=>'<div>'+esc(c.n)+': '+esc(c.h.slice(-1)[0])+'</div>').join(''):'')+
    '<div class="tc" style="margin-top:4px">'+(st.post?'':'<button data-dp="post">CONTINUE POSTWAR</button>')+'</div></div>';}
  h+='</div>';const at=el.querySelector('.row');if(at)at.insertAdjacentHTML('afterend',h);else el.insertAdjacentHTML('beforeend',h);}
WARMAP.after.push(render);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsDip [data-dp]');if(!b||!W.st)return;
  if(b.dataset.dp==='post'){W.st.post=true;W.emit('POSTWAR',{txt:'Postwar: the lines are frozen where they stood; the clock keeps running.'});WARMAP.panel();}});
})();
