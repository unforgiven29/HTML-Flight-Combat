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
function newsTab(){const n=W.st.soc;if(!n)return'';const L=n.news.filter(x=>x.out===UI.out).slice(-14).reverse();
  return'<div class="tabs">'+[['N','NEUTRAL WIRE'],['B','BLUEFOR MEDIA'],['R','REDFOR MEDIA']].map(([k,l])=>'<button data-nw="'+k+'" aria-pressed="'+(UI.out===k)+'">'+l+'</button>').join('')+'</div>'+
    '<div class="nw">'+(L.map(x=>'<div><em>'+esc(W.date(x.t).slice(5,16))+'</em>'+(x.k!=='REPORT'?'<span class="k">'+x.k+'</span>':'')+esc(x.txt)+'</div>').join('')||'<div>No reports yet.</div>')+'</div>'+
    '<div style="color:#8a9a92;margin-top:3px">INVESTIGATIONS</div><div class="nw">'+(n.inv.slice(-8).reverse().map(v=>'<div><em>'+v.id+'</em>'+(v.st==='OPEN'?'open: '+esc(v.txt.slice(0,90)):esc(v.find))+'</div>').join('')||'<div>None opened.</div>')+'</div>';}
function render(){const el=document.getElementById('wmWar'),st=W.st;if(!el||!st)return;for(const id of['wsNat','wsSide'])el.querySelector('#'+id)&&el.querySelector('#'+id).remove();
  const team=(typeof game!=='undefined'&&game.team==='RED')?'R':'B',mine=Object.values(st.c).filter(p=>p.side===team&&(p.al==='CORE'||p.al==='ALLY'));
  let h='<div id="wsSide"><div class="row"><span>YOU FLY FOR</span><span><button data-tm="BLUE" aria-pressed="'+(team==='B')+'">BLUEFOR</button> <button data-tm="RED" aria-pressed="'+(team==='R')+'">REDFOR</button></span></div>'+
    '<div class="tabs" style="display:flex;flex-wrap:wrap;gap:3px">'+mine.filter(p=>st.fronts.some(f=>f.a===p.a3||f.b===p.a3)||p.al==='CORE').slice(0,12).map(p=>'<button data-sel="'+p.a3+'" aria-pressed="'+(WARMAP.UI.sel===p.a3)+'">'+esc(p.n)+'</button>').join('')+'</div>'+
    '<div style="color:#8a9a92">Pick a country, then an airfield under FLY FOR.</div>'+
    '<div style="color:#8a9a92;margin-top:3px">WEATHER</div>'+st.th.map(th=>row(esc(th.name),esc((th.season||'').toLowerCase())+(th.wx?' · '+th.wx.toLowerCase():''))).join('')+'</div>';
  const p=WARMAP.UI.sel&&st.c[WARMAP.UI.sel];
  if(p){h+='<div id="wsNat"><b>'+esc(p.n)+'</b><div class="tabs">'+['PEOPLE','ECONOMY','GOVERNMENT','STRATEGY','NEWS'].map(k=>'<button data-nt="'+k+'" aria-pressed="'+(UI.tab===k)+'">'+(k==='NEWS'?'NEWS & COURTS':k)+'</button>').join('')+'</div>'+
    ({PEOPLE:people,ECONOMY:economy,GOVERNMENT:government,STRATEGY:strategy,NEWS:newsTab}[UI.tab])(p)+'</div>';}
  el.insertAdjacentHTML('afterbegin',h);}
WARMAP.after.push(render);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-nt],#wsNat [data-nw],#wsSide [data-tm],#wsSide [data-sel]');if(!b)return;
  if(b.dataset.nt)UI.tab=b.dataset.nt;else if(b.dataset.nw)UI.out=b.dataset.nw;
  else if(b.dataset.tm){const t=document.querySelector('.seg[data-k="team"] button[data-v="'+b.dataset.tm+'"]');if(t)t.click();else game.team=b.dataset.tm;WARMAP.UI.sel=null;}   // the game's own side switch (it checks the hangar jet fits the side)
  else if(b.dataset.sel)WARMAP.UI.sel=b.dataset.sel;WARMAP.panel();if(window.WMAP)WMAP.draw();});
window.NATPANEL={UI,render};
})();
