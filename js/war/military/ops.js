/* =====================================================================================================================
   v345 — operations above the units (spec v49 ch.06 logistics as a network, fuel distribution, ground-force behaviour,
   air-defence formations, air operations planning, special operations and irregular warfare; ch.15 dynamic air
   operations and air-defence AI, emergent crises). Gameplay-level rules; abstract; daily.
   * SUPPLY NETWORK: each country supplies each of its fronts along one route from its capital: capacity from transport
     (economy), bridges cut on that front (supply.js), distance and enemy air over it (interdiction). Throughput is
     shared by priority (the player can mark a PRIORITY front for their countries); a front below 60 % of its need is
     a bottleneck (event once) and fights at x(0.75 + 0.25 x supplied share). Fuel follows the same route.
   * GROUND POSTURE per front: ADVANCE / HOLD / WITHDRAW. A side badly outmatched in a sector withdraws in order
     (losses halved, ground given), then holds; units under pressure REQUEST AIR SUPPORT (events, and a CAS tasking on
     your next sortie if it is your side).
   * AIR-DEFENCE NETWORK per country: strength from its surface-to-air stocks and launchers (forces.js), degraded by
     enemy air superiority (suppression) and rebuilt by industry; a strong network makes enemy air attacks costlier.
   * AIR TASKING per side and theatre, every day: shares for defensive counter-air, offensive counter-air, close air
     support and interdiction, from the commander's intent; close air support adds to the front, interdiction cuts
     the other side's supply.
   * SPECIAL OPERATIONS and IRREGULAR WARFARE: raids on headquarters and depots (military targets; abstract), and
     resistance in occupied cities (the occupier's front power there falls; counter-insurgency events).
   * EMERGENT CRISES (ch.15): a refugee crisis at a border, a nuclear-safety concern near a front (observers request
     access; a protected zone), a shipping crisis in a contested sea — each generated from the war's own state, with
     the reason stated.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.mil)return;
const W=WWAR,G=WGEO,rn=Math.random;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const O=()=>W.st.ops||(W.st.ops={sup:{},post:{},ad:{},ato:{},prio:{},seen:{},cas:[]});
/* ------------------------------------------------------------------ supply network */
function supply(){const st=W.st,o=O();
  for(const p of Object.values(st.c)){if(!bel(p))continue;const F=st.fronts.filter(f=>(f.a===p.a3||f.b===p.a3)&&!f.cf);if(!F.length)continue;const c=G.byA3.get(p.a3);if(!c)continue;
    const e=p.ecn,cap=(e?e.trans*.7+e.fuel/60*.3:1)*(1+.15*((st.frc&&st.frc.pmc||[]).filter(x=>x.a3===p.a3&&x.role==='logistics').length));
    const need=F.map(f=>{const s=f.sec[(f.sec.length/2)|0],d=G.dist(c.ly,c.lx,s.lat,s.lon)/1000;const th=(st.th||[]).find(t=>t.f&&t.f[p.a3]);const inter=th?Math.max(0,p.side==='B'?-th.sup:th.sup):0;
      const cut=W.supply?W.supply.cutOn(p.a3,f.id):0;return{f,w:(o.prio[p.a3]===f.id?2:1),loss:Math.min(.6,d/4000+inter*.25+cut*.08)};});
    const W0=need.reduce((t,n)=>t+n.w,0);for(const n of need){const share=cap*n.w/W0*need.length*(1-n.loss);const k=p.a3+':'+n.f.id;const v=cl(share,0,1.2);o.sup[k]=v;
      if(v<.6&&!o.seen['b'+k]){o.seen['b'+k]=1;W.emit('LOGISTICS',{e:[p.a3],txt:'Supply bottleneck: '+p.n+'\'s forces on the front with '+st.c[n.f.a===p.a3?n.f.b:n.f.a].n+' receive about '+Math.round(v*100)+' % of what they need (distance, interdiction, cut bridges).'});}
      if(v>.8)delete o.seen['b'+k];}}}
/* ------------------------------------------------------------------ ground posture and support requests */
function posture(){const st=W.st,o=O(),me=(typeof game!=='undefined'&&game.team==='RED')?'R':'B';
  for(const f of st.fronts){if(f.cf)continue;const A=st.c[f.a],B=st.c[f.b];const r=(A.gnd*W.mod(A,f,f.sec[0]))/Math.max(.1,B.gnd*W.mod(B,f,f.sec[0]));
    const pa=r>1.4?'ADVANCE':r<.55?'WITHDRAW':'HOLD',pb=r<.71?'ADVANCE':r>1.8?'WITHDRAW':'HOLD';const was=o.post[f.id]||{};o.post[f.id]={[f.a]:pa,[f.b]:pb};
    for(const[a3,ps]of[[f.a,pa],[f.b,pb]])if(ps==='WITHDRAW'&&was[a3]!=='WITHDRAW')W.emit('GROUND',{e:[a3],txt:st.c[a3].n+'\'s forces on the front with '+st.c[a3===f.a?f.b:f.a].n+' withdraw in order to new positions to save their units.'});
    for(const[a3,ps]of[[f.a,pa],[f.b,pb]])if(ps!=='ADVANCE'&&rn()<.05){const p=st.c[a3];o.cas.unshift({t:st.t,a3,f:f.id});o.cas.length=Math.min(o.cas.length,20);
      if(p.side===me)W.emit('SUPPORT',{e:[a3],txt:'Request for close air support: '+p.n+'\'s forces under pressure on the front with '+st.c[a3===f.a?f.b:f.a].n+'.'});}}}
/* ------------------------------------------------------------------ air-defence networks */
function airDef(){const st=W.st,o=O();for(const p of Object.values(st.c)){if(!bel(p))continue;const F=st.frc&&st.frc.c&&st.frc.c[p.a3],m=st.mil&&st.mil[p.a3];
  const base=F?Math.min(1,((F.inv.SHORAD||0)+(F.inv.MRSAM||0)*4+(F.inv.LRSAM||0)*8)/120):.4,stock=m?Math.min(1,m.mun.SAM/15):1;
  const th=(st.th||[]).find(t=>t.f&&t.f[p.a3]),sead=th?Math.max(0,p.side==='B'?-th.sup:th.sup):0;const v=o.ad[p.a3]??base;o.ad[p.a3]=cl(v+(base*stock*(1-.4*sead)-v)*.1,0,1);}}
// a strong enemy air-defence network makes the attacker's air force less effective over it
{const _r=W.rdy;W.rdy=p=>{let v=_r(p);const o=W.st&&W.st.ops;if(!o||!p.side)return v;const opp=Object.values(W.st.c).filter(q=>q.side&&q.side!==p.side&&bel(q));if(!opp.length)return v;
  const ad=opp.reduce((t,q)=>t+(o.ad[q.a3]||0)*q.air,0)/Math.max(1,opp.reduce((t,q)=>t+q.air,0));return v*(1-.08*ad);};}
/* ------------------------------------------------------------------ air tasking */
function ato(){const st=W.st,o=O();for(const th of st.th||[])for(const s of['B','R']){const sup=s==='B'?th.sup:-th.sup;const L=Object.keys(th.f).map(a=>st.c[a]).filter(p=>p&&p.side===s);if(!L.length)continue;
  const attack=L.some(p=>{const m=st.mil&&st.mil[p.a3];return m&&Object.values(m.intent).includes('ATTACK');});
  const dca=cl(.45-.3*sup,.15,.6),oca=cl(.15+.2*sup,.05,.35),cas=cl((attack?.3:.2)+.1*sup,.1,.4),inter=Math.max(.05,1-dca-oca-cas);o.ato[th.id+':'+s]={dca,oca,cas,inter};}}
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);const o=W.st&&W.st.ops;if(!o||!p.side)return k;
  const sup=o.sup[p.a3+':'+f.id];if(sup!=null)k*=.75+.25*Math.min(1,sup);
  const th=(W.st.th||[]).find(t=>t.f&&t.f[p.a3]);if(th){const a=o.ato[th.id+':'+p.side],b=o.ato[th.id+':'+(p.side==='B'?'R':'B')];const sup2=p.side==='B'?th.sup:-th.sup;
    if(a)k*=1+.06*a.cas*Math.max(0,sup2+.3);if(b)k*=1-.04*b.inter*Math.max(0,-sup2+.3);}
  const post=o.post[f.id]&&o.post[f.id][p.a3];if(post==='WITHDRAW')k*=1.15;   // a withdrawal in order loses fewer units
  const res=o.res&&o.res[p.a3+':'+f.id];if(res)k*=1-res;return k;};}
/* ------------------------------------------------------------------ special operations and resistance */
function irregular(){const st=W.st,o=O();o.res=o.res||{};if(st.over)return;
  for(const p of Object.values(st.c)){if(!bel(p)||p.gdp<2e5||rn()>.01)continue;const f=st.fronts.find(q=>(q.a===p.a3||q.b===p.a3)&&!q.cf);if(!f)continue;const e=st.c[f.a===p.a3?f.b:f.a],me=st.mil&&st.mil[e.a3];
    const ok=rn()<.5;if(ok&&me){me.mun.ART=Math.max(0,me.mun.ART-1.5);}W.emit('SPECOPS',{e:[p.a3,e.a3],cf:'REPORTED',txt:p.n+'\'s special forces raid a military '+(rn()<.5?'supply depot':'command post')+' behind '+e.n+'\'s lines'+(ok?'; supplies are destroyed':'; the raid is repelled')+'.'});}
  // resistance in occupied cities: the occupier's front power there falls; counter-insurgency events
  const occ={};for(const v of Object.values(st.cities||{}))if(v.h!==v.own)(occ[v.h+'|'+v.own]=(occ[v.h+'|'+v.own]||0)+v.pop);
  for(const k in o.res)o.res[k]*=.97;
  for(const[k,pop]of Object.entries(occ)){const[h,own]=k.split('|');const f=st.fronts.find(q=>(q.a===h&&q.b===own)||(q.a===own&&q.b===h));if(!f)continue;const r=Math.min(.12,pop/2e7);o.res[h+':'+f.id]=Math.max(o.res[h+':'+f.id]||0,r);
    if(rn()<.01)W.emit('RESISTANCE',{e:[h,own],cf:'REPORTED',txt:'Resistance in areas of '+st.c[own].n+' held by '+st.c[h].n+': attacks on supply convoys; '+st.c[h].n+' answers with counter-insurgency operations. Observers warn that civilians must be protected.'});}}
/* ------------------------------------------------------------------ emergent crises */
function crises(){const st=W.st,o=O();if(st.over)return;
  for(const p of Object.values(st.c)){if(!p.ref||p.ref<p.pop*.01)continue;const k='ref:'+p.a3;if(o.seen[k])continue;o.seen[k]=1;
    W.emit('CRISIS',{e:[p.a3],txt:'A refugee crisis on '+p.n+'\'s borders: about '+Math.round(p.ref/1e3)+',000 people have fled (reason: the fighting and the loss of services). Neighbours open reception centres; aid agencies appeal for funds.'});}
  for(const f of st.fronts){if(f.cf)continue;const k='nuc:'+f.id;if(o.seen[k]||rn()>.002)continue;const A=st.c[f.a],B=st.c[f.b];if(A.gdp+B.gdp<6e5)continue;o.seen[k]=1;
    W.emit('CRISIS',{e:[f.a,f.b],txt:'A nuclear-safety concern near the '+A.n+' / '+B.n+' front (reason: fighting close to a power station). International inspectors request access; both sides are urged to keep a protected zone around the plant.'});}
  if(st.navy)for(const[id,t]of Object.entries(st.navy.th||{})){if(Math.abs(t.sup)>.3||rn()>.004)continue;const k='sea:'+id;if(o.seen[k])continue;o.seen[k]=1;W.emit('CRISIS',{txt:'A shipping crisis in a contested sea (reason: neither side controls it): insurers withdraw cover, merchant ships wait in port, prices of goods rise.'});}}
W.daily.push(()=>{if(!W.st||W.st.over)return;supply();posture();airDef();ato();irregular();crises();});
/* ------------------------------------------------------------------ OPERATIONS tab */
const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>',esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function tab(p){const st=W.st,o=O(),me=(typeof game!=='undefined'&&game.team==='RED')?'R':'B',mine=p.side===me&&bel(p);const F=st.fronts.filter(f=>f.a===p.a3||f.b===p.a3);
  let h='<h4>FRONTS: SUPPLY AND POSTURE</h4>'+(F.length?F.map(f=>{const s=o.sup[p.a3+':'+f.id],ps=o.post[f.id]&&o.post[f.id][p.a3];return row('Front with '+esc(st.c[f.a===p.a3?f.b:f.a].n)+(o.prio[p.a3]===f.id?' ★':''),(s!=null?'supply '+Math.round(s*100)+' %':'—')+(ps?' · '+ps.toLowerCase():'')+(f.cf?' · ceasefire':''))+
    (mine&&!f.cf?'<div class="tc"><button data-prio="'+f.id+'" data-a3="'+p.a3+'" aria-pressed="'+(o.prio[p.a3]===f.id)+'">'+(o.prio[p.a3]===f.id?'PRIORITY FRONT':'MAKE PRIORITY')+'</button></div>':'');}).join(''):'<div>No fronts.</div>');
  h+='<h4>AIR DEFENCE AND AIR TASKING</h4>'+row('Air-defence network',o.ad[p.a3]!=null?Math.round(o.ad[p.a3]*100)+' %':'—');
  const th=(st.th||[]).find(t=>t.f&&t.f[p.a3]);if(th&&p.side){const a=o.ato[th.id+':'+p.side];if(a)h+=row(esc(th.name)+' tasking','DCA '+Math.round(a.dca*100)+' · OCA '+Math.round(a.oca*100)+' · CAS '+Math.round(a.cas*100)+' · AI '+Math.round(a.inter*100)+' %');}
  const C=o.cas.filter(c=>c.a3===p.a3).slice(0,3);if(C.length)h+='<h4>REQUESTS FOR AIR SUPPORT</h4>'+C.map(c=>'<div>'+W.date(c.t).slice(0,10)+' · front with '+esc(st.c[(st.fronts.find(f=>f.id===c.f)||{}).a===p.a3?(st.fronts.find(f=>f.id===c.f)||{}).b:(st.fronts.find(f=>f.id===c.f)||{}).a]?st.c[(st.fronts.find(f=>f.id===c.f)||{}).a===p.a3?(st.fronts.find(f=>f.id===c.f)||{}).b:(st.fronts.find(f=>f.id===c.f)||{}).a].n:'')+'</div>').join('');
  return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.OPERATIONS=tab;
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-prio]');if(!b||!W.st)return;const o=O();o.prio[b.dataset.a3]=o.prio[b.dataset.a3]===b.dataset.prio?null:b.dataset.prio;WARMAP.panel();});
W.ops={O,supply,posture,airDef,ato,irregular,crises,tab};
})();
