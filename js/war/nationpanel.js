/* =====================================================================================================================
   v332 — the world-war panel, part 2 (presentation only): play as BLUEFOR or REDFOR, theatre weather and seasons, and for
   the selected country: PEOPLE (population, households, mobilised, unemployment, hospitals, displaced), ECONOMY (energy,
   fuel, industry, transport, food, infrastructure), GOVERNMENT (legitimacy, emergency powers, mobilisation, decisions),
   STRATEGY (posture per front, what it believes about the enemy, force concentration), and NEWS AND COURTS (what each
   side's media and the neutral wire are saying, investigations and findings). Figures are labelled estimates.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WARMAP)return;
const W=WWAR,esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const UI={tab:'PEOPLE',out:'N'};
const pct=v=>v==null?'—':Math.round(v*100)+' %',M=v=>v>=1e6?(v/1e6).toFixed(1)+' M':v>=1e3?Math.round(v/1e3)+' k':String(Math.round(v||0));
document.head.insertAdjacentHTML('beforeend','<style>#wsNat,#wsSide{border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:6px;display:grid;gap:3px;font-size:10.5px}#wsNat .tabs{display:flex;flex-wrap:wrap;gap:3px}'+
 '#wsNat .tabs button,#wsSide button{all:unset;cursor:pointer;padding:2px 6px;border:1px solid rgba(255,255,255,.2);border-radius:3px;font-weight:700;font-size:9.5px;letter-spacing:.08em}#wsNat .tabs button[aria-pressed=true],#wsSide button[aria-pressed=true]{background:#5be1ff;color:#07131b}'+
 '#wsNat .nw{max-height:20vh;overflow:auto;display:grid;gap:2px}#wsNat em{font-style:normal;color:#8a9a92;margin-right:4px}#wsNat .k{color:#ffcf5a;font-size:9px;margin-right:4px}</style>');
const row=(a,b)=>'<div class="row"><span>'+a+'</span><span>'+b+'</span></div>';
function people(p){const s=W.society&&W.society.soc(p);if(!s)return'';
  return row('Population (NE est.)',M(p.pop))+row('Households (est., '+s.hh.toFixed(1)+' per household)',M(s.households))+row('Children · working age · elderly (est.)',pct(s.child)+' · '+pct(1-s.child-s.old)+' · '+pct(s.old))+
    row('Mobilised (est.)',M(s.mob)+(s.mobShare?' · '+pct(s.mobShare)+' of working age':''))+row('Unemployment (est.)',pct(s.unemp))+row('Hospital load (1 = full)',(s.hosp||.7).toFixed(2))+
    row('Displaced (est.)',M(p.disp)+' · '+M(s.dispHH)+' households')+(p.ref?row('Refugees received (est.)',M(p.ref)):'');}
function economy(p){const e=p.ecn;if(!e)return'<div>Not at war: no wartime economy recorded.</div>';
  return row('Economy (prewar = 100 %)',pct(p.econ))+row('Energy / power grid',pct(e.energy))+row('Fuel stocks (est.)',Math.round(e.fuel)+' days')+row('Defence industry',pct(e.ind))+row('Transport',pct(e.trans))+row('Food supply',pct(e.food))+row('Infrastructure condition',pct(e.infra));}
function government(p){const g=p.govt;if(!g)return'<div>No wartime government decisions recorded.</div>';
  return row(esc(g.title),'legitimacy '+pct(g.leg))+row('Emergency powers',g.emerg?'in force':'no')+row('Mobilisation',['none','partial','reserves','general'][g.mob])+row('Public support',pct(p.sup))+row('Stability',pct(p.stab))+
    (g.dec.length?'<div class="nw">'+g.dec.slice().reverse().map(d=>'<div><em>'+esc(W.date(d[0]).slice(0,10))+'</em>'+esc(d[1])+'</div>').join('')+'</div>':'');}
function strategy(p){const st=W.st,F=st.fronts.filter(f=>f.a===p.a3||f.b===p.a3);if(!F.length)return'<div>No front.</div>';
  return F.map(f=>{const en=st.c[f.a===p.a3?f.b:f.a],post=f.post&&f.post[p.a3]||'—',w=f.w&&f.w[p.a3],est=f.est&&f.est[p.a3],tr=en.gnd;
    return row('vs '+esc(en.n),(f.cf?'ceasefire':post)+(w?' · forces x'+w.toFixed(2):'')+(est!=null?' · believes enemy at '+est.toFixed(2)+' (true '+(tr/Math.max(1,F.length)).toFixed(2)+')':''));}).join('')+'<div style="color:#8a9a92">The true value is shown for you, not for the country: it decides on its estimate.</div>';}
function leaders(p){const Ld=W.lead;if(!Ld||!p.ldr)return'<div>No wartime government appointed (not at war).</div>';
  let h=[['HEAD','Head of Government'],['DEF','Defence'],['CGS','General Staff'],['AF','Air Force']].map(([k,l])=>{const x=Ld.who(p.ldr[k]);return x?row(esc(l),(x.rank?esc(x.rank)+' ':'')+esc(x.name)+' · resolve '+pct(x.resolve)+' · caution '+pct(x.caution)+' · pragmatism '+pct(x.prag)):'';}).join('');
  const F=W.st.fronts.filter(f=>f.cmd&&f.cmd[p.a3]);h+=F.map(f=>{const x=Ld.who(f.cmd[p.a3]);return x?row('Front vs '+esc(W.st.c[f.a===p.a3?f.b:f.a].n),esc(x.rank)+' '+esc(x.name)+' · skill '+x.skill.toFixed(2)):'';}).join('');
  const past=Object.values(W.st.lead.people).filter(x=>x.a3===p.a3&&x.st!=='IN OFFICE').slice(-5);if(past.length)h+='<div style="color:#8a9a92">FORMER</div>'+past.map(x=>'<div>'+esc((x.rank?x.rank+' ':'')+x.name)+': '+esc(x.st.toLowerCase())+'</div>').join('');
  return h+'<div style="color:#8a9a92">All names are fictional.</div>';}
function orbat(p){if(!W.ob||!W.st.ob||!W.st.ob.by[p.a3])return'<div>No order of battle (not at war).</div>';const U=W.ob.units(p.a3),Ld=W.lead,fr=id=>{const f=W.st.fronts.find(q=>q.id===id);return f?'vs '+W.st.c[f.a===p.a3?f.b:f.a].n:'reserve';};
  const S=U.filter(u=>u.kind==='SQN'),B=U.filter(u=>u.kind==='BDE');
  return'<div style="color:#8a9a92">SQUADRONS · '+Math.round(p.air)+' aircraft (est.)</div><div class="nw">'+S.map(u=>'<div>'+esc(u.name)+' · '+esc(u.equip)+' · '+Math.round(u.str)+'/'+u.str0+(u.baseName?' · '+esc(u.baseName):'')+(u.st!=='ACTIVE'?' · '+u.st.toLowerCase():'')+'</div>').join('')+'</div>'+
    '<div style="color:#8a9a92">BRIGADES · '+p.gnd.toFixed(1)+' brigade-equivalents (est.)</div><div class="nw">'+B.map(u=>{const c=u.cmd&&Ld&&Ld.who(u.cmd);return'<div>'+esc(u.name)+' · '+esc(fr(u.front))+' · '+Math.round(u.str/u.str0*100)+' %'+(u.st!=='ACTIVE'?' · <span class="k">'+u.st+'</span>':'')+(c?' · '+esc(c.rank+' '+c.name):'')+'</div>';}).join('')+'</div>'+
    '<div style="color:#8a9a92">Unit strengths always add up to the country\'s totals. Names are generic and fictional.</div>';}
function navy(p){const f=p.nav;if(!f)return'<div>'+esc(p.n)+' has no fleet in the war (not coastal, or not at war).</div>';const S=W.sea,n=W.st.navy;
  return row('Aircraft carriers',f.cv+' / '+f.cv0)+row('Surface combatants',f.sur+' / '+f.sur0)+row('Submarines',f.sub+' / '+f.sub0)+row('Amphibious ships',f.amp+' / '+f.amp0)+(p.blockade?row('Blockade','imports cut ('+Math.round(p.blockade*100)+' %)'):'')+
    (n?'<div style="color:#8a9a92">SEA CONTROL</div>'+S.SEAS.filter(q=>n.th[q.id]&&Object.keys(n.th[q.id].f).length).map(q=>row(esc(q.name),Math.abs(n.th[q.id].sup)<.1?'contested':n.th[q.id].sup>0?'BLUEFOR '+Math.round(n.th[q.id].sup*100)+' %':'REDFOR '+Math.round(-n.th[q.id].sup*100)+' %')).join(''):'')+
    '<div style="color:#8a9a92">Fleet sizes are estimates (carriers: approximate public numbers).</div>';}
function justice(){const L=W.st.law,tg=W.st.tg;let h='';
  if(tg&&tg.tot.bld)h+=row('Civilian buildings destroyed in flight (all sides)',tg.tot.bld)+row('People killed (est. range)',tg.tot.kLo+'-'+tg.tot.kHi)+row('People injured (est. range)',tg.tot.iLo+'-'+tg.tot.iHi);
  if(!L||!L.cases.length)return h+'<div>No cases opened.</div>';
  return h+'<div class="nw">'+L.cases.slice(-14).reverse().map(c=>'<div><em>'+esc(c.id)+'</em><span class="k">'+esc(c.stage)+'</span>'+esc(c.cls)+(c.judgment?' · '+esc(c.judgment):'')+' · '+esc(c.txt.slice(0,110))+'</div>').join('')+'</div><div style="color:#8a9a92">'+esc(L.framework)+'. Classifications stay preliminary until the evidence supports them.</div>';}
function careerBox(){const c=W.st.lead&&W.st.lead.career;if(!c)return'';const nm=W.lead.rank(c.a3,'air',c.rank);
  return'<div id="wsCar" style="border:1px solid rgba(125,255,160,.3);border-radius:4px;padding:6px;font-size:10.5px;display:grid;gap:2px"><b>YOUR SERVICE RECORD · '+esc(W.st.c[c.a3].n.toUpperCase())+'</b>'+row(esc(nm)+' '+esc(c.name),c.st)+row('Sorties · aircraft · ground targets',c.sorties+' · '+c.air+' · '+c.gnd)+
    (c.awards.length?row('Awards',c.awards.map(a=>esc(a[1])).join(', ')):'')+(c.inq.length?row('Inquiries',c.inq.map(q=>q.cat.toLowerCase()+' ('+q.st.toLowerCase()+')').join(', ')):'')+'</div>';}
function newsTab(){const n=W.st.soc;if(!n)return'';const L=n.news.filter(x=>x.out===UI.out).slice(-14).reverse();
  return'<div class="tabs">'+[['N','NEUTRAL WIRE'],['B','BLUEFOR MEDIA'],['R','REDFOR MEDIA']].map(([k,l])=>'<button data-nw="'+k+'" aria-pressed="'+(UI.out===k)+'">'+l+'</button>').join('')+'</div>'+
    '<div class="nw">'+(L.map(x=>'<div><em>'+esc(W.date(x.t).slice(5,16))+'</em>'+(x.k!=='REPORT'?'<span class="k">'+x.k+'</span>':'')+esc(x.txt)+'</div>').join('')||'<div>No reports yet.</div>')+'</div>'+
    '<div style="color:#8a9a92;margin-top:3px">INVESTIGATIONS</div><div class="nw">'+(n.inv.slice(-8).reverse().map(v=>'<div><em>'+v.id+'</em>'+(v.st==='OPEN'?'open: '+esc(v.txt.slice(0,90)):esc(v.find))+'</div>').join('')||'<div>None opened.</div>')+'</div>';}
const XT={};   /* extra tabs from later modules (military.js) */
function render(){const el=document.getElementById('wmWar'),st=W.st;if(!el||!st)return;for(const id of['wsNat','wsSide','wsCar'])el.querySelector('#'+id)&&el.querySelector('#'+id).remove();
  const team=(typeof game!=='undefined'&&game.team==='RED')?'R':'B',mine=Object.values(st.c).filter(p=>p.side===team&&(p.al==='CORE'||p.al==='ALLY'));
  let h='<div id="wsSide"><div class="row"><span>YOU FLY FOR</span><span><button data-tm="BLUE" aria-pressed="'+(team==='B')+'">BLUEFOR</button> <button data-tm="RED" aria-pressed="'+(team==='R')+'">REDFOR</button></span></div>'+
    '<div class="tabs" style="display:flex;flex-wrap:wrap;gap:3px">'+mine.filter(p=>st.fronts.some(f=>f.a===p.a3||f.b===p.a3)||p.al==='CORE').slice(0,12).map(p=>'<button data-sel="'+p.a3+'" aria-pressed="'+(WARMAP.UI.sel===p.a3)+'">'+esc(p.n)+'</button>').join('')+'</div>'+
    '<div style="color:#8a9a92">Pick a country, then an airfield under FLY FOR.</div>'+
    '<div style="color:#8a9a92;margin-top:3px">WEATHER</div>'+st.th.map(th=>row(esc(th.name),esc((th.season||'').toLowerCase())+(th.wx?' · '+th.wx.toLowerCase():''))).join('')+'</div>';
  const p=WARMAP.UI.sel&&st.c[WARMAP.UI.sel];
  if(p){h+='<div id="wsNat"><b>'+esc(p.n)+'</b><div class="tabs">'+['PEOPLE','ECONOMY','GOVERNMENT','LEADERS','FORCES','NAVY','STRATEGY','NEWS','JUSTICE',...Object.keys(XT)].map(k=>'<button data-nt="'+k+'" aria-pressed="'+(UI.tab===k)+'">'+(k==='NEWS'?'NEWS & COURTS':k)+'</button>').join('')+'</div>'+
    (({PEOPLE:people,ECONOMY:economy,GOVERNMENT:government,LEADERS:leaders,FORCES:orbat,NAVY:navy,STRATEGY:strategy,NEWS:newsTab,JUSTICE:justice,...XT})[UI.tab]||people)(p)+'</div>';}
  h=careerBox()+h;el.insertAdjacentHTML('afterbegin',h);}
WARMAP.after.push(render);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-nt],#wsNat [data-nw],#wsSide [data-tm],#wsSide [data-sel]');if(!b)return;
  if(b.dataset.nt)UI.tab=b.dataset.nt;else if(b.dataset.nw)UI.out=b.dataset.nw;
  else if(b.dataset.tm){const t=document.querySelector('.seg[data-k="team"] button[data-v="'+b.dataset.tm+'"]');if(t)t.click();else game.team=b.dataset.tm;WARMAP.UI.sel=null;}   // the game's own side switch (it checks the hangar jet fits the side)
  else if(b.dataset.sel)WARMAP.UI.sel=b.dataset.sel;WARMAP.panel();if(window.WMAP)WMAP.draw();});
window.NATPANEL={UI,render,tabs:XT};
})();
