/* =====================================================================================================================
   v342 — the life of countries around the war (spec v49 ch.08 population, demographics, health, education, migration;
   ch.09 public services, local administration, culture and heritage, institutional trust; ch.10 trade, finance,
   labour, consumption, resources; ch.11 housing, water, utilities; ch.12 climate, ecology, humanitarian corridors;
   ch.05 political cycle, occupation administration, treaties, legitimacy). Aggregate (tier D), daily or monthly,
   for every country. Every figure is an ESTIMATE from a stated rule (labelled), never a count of real people.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,rn=Math.random;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+' million':n>=1e4?Math.round(n/1e3)+',000':String(Math.round(n||0));
const L=p=>{if(p.life)return p.life;const gpc=p.gdp*1e6/Math.max(1,p.pop),t=cl(Math.log10(Math.max(500,gpc)/1000)/1.7,0,1);
  return p.life={
   dem:{birth:.035-.026*t,death:.011-.003*t+.006*t*t,urban:.35+.5*t,life:62+20*t},       // per year; urban share; life expectancy
   health:{beds:1+5*t,load:.7,outbreak:0},edu:{open:1,lost:0},mig:{inner:0,out:0,back:0},
   svc:{schools:1,hosp:1,police:1,water:1,power:1,admin:1},trust:.55+.25*t,heritage:{dmg:0,list:[]},
   fin:{debt:.4+.5*t,infl:.03,cur:1,bonds:0,aid:0},lab:{part:.6,wage:1,strike:0},cons:{ration:0,index:1},res:{crit:t>.6?.4:.8},
   house:{stock:Math.round(p.pop/((p.soc&&p.soc.hh)||3.5)),lost:0},water:1,
   env:{pol:0,forest:0},corr:[],
   pol:{next:24*365*(2+rn()*4),leg:.6+.2*t,cycles:0},treat:[]};};
/* ------------------------------------------------------------------ ch.08 population */
function people(p,l,day){const st=W.st,war=bel(p)&&!st.over,e=p.ecn;
  // demography: yearly rates applied daily (estimates); war raises deaths a little and lowers births
  const g=(l.dem.birth*(war?.85:1)-l.dem.death*(war?1.08:1))/365;p.pop=Math.max(1e4,Math.round(p.pop*(1+g)));
  // health: hospital load from displacement, blackouts, the wounded (from ground losses), outbreaks in crowded shelter
  const disp=(p.disp||0)/Math.max(1,p.pop);l.health.load=cl(.7+disp*4+(e?(1-e.energy)*.3+(1-e.food)*.3:0)+(war?.15:0),.5,1.8);
  if(war&&disp>.02&&l.health.outbreak<=0&&rn()<.004){l.health.outbreak=30;W.emit('HEALTH',{e:[p.a3],cf:'ESTIMATED',txt:'An outbreak of infectious disease in crowded shelters in '+p.n+': health teams vaccinate and set up isolation wards; an estimated '+Math.round(disp*p.pop*.002)+' people fall ill.'});}
  if(l.health.outbreak>0)l.health.outbreak--;
  // education: schools close near fronts and under air threat; lost school days accumulate
  l.edu.open=cl(war?1-disp*5-(e?1-e.infra:0)*.8-.1:Math.min(1,l.edu.open+.01),.2,1);l.edu.lost+=1-l.edu.open;
  // migration: inside the country (the displaced), abroad (refugees), and returns in peace
  l.mig.inner=p.disp||0;l.mig.out=p.ref||0;if(!war&&p.ref>0){const r=Math.round(p.ref*.004);p.ref-=r;l.mig.back+=r;}
  if(day%365===0&&!war)l.dem.urban=Math.min(.95,l.dem.urban+.002);}
/* ------------------------------------------------------------------ ch.09 institutions */
function institutions(p,l){const st=W.st,war=bel(p)&&!st.over,e=p.ecn,s=l.svc;const f=(x,k)=>cl(x+(k-x)*.05,0,1);
  s.power=f(s.power,e?e.energy:1);s.water=f(s.water,e?(e.energy*.5+e.infra*.5):1);s.hosp=f(s.hosp,cl(1.3-l.health.load*.5,.2,1));s.schools=l.edu.open;
  s.police=f(s.police,(p.stab??.8));s.admin=f(s.admin,war?.85*(p.stab??.8):1);l.water=s.water;
  const avg=(s.power+s.water+s.hosp+s.schools+s.police+s.admin)/6;l.trust=cl(l.trust+(avg-.75)*.004+((p.sup??.6)-.5)*.002,.05,.95);}
// occupied cities: an occupation administration; heritage damage when cities change hands (abstract)
const HER=['old town','cathedral','museum','library','historic bridge','theatre','university','market hall','mosque','synagogue','temple','monastery'];
W.listeners.push(e=>{if(!W.st||e.ty!=='CITY')return;const a3=(e.e||[])[0],p=a3&&W.st.c[a3];if(!p)return;const l=L(p);if(rn()<.35){const h=HER[(rn()*HER.length)|0];l.heritage.dmg++;l.heritage.list.push(h);if(l.heritage.list.length>12)l.heritage.list.shift();
  W.emit('HERITAGE',{e:[a3],cf:'REPORTED',txt:'Cultural heritage damaged in the fighting: a '+h+' in '+p.n+'. Conservators document the damage; the case is noted for the record.'});}});
function occupation(){const st=W.st,O=st.occ||(st.occ={});for(const[k,v]of Object.entries(st.cities||{})){if(v.h===v.own){delete O[k];continue;}if(O[k]===v.h)continue;O[k]=v.h;const o=st.c[v.own],h=st.c[v.h];if(!o||!h)continue;
  if(v.pop>2e5)W.emit('OCCUPATION',{e:[v.h,v.own],txt:h.n+' sets up a military administration in '+k.split('|')[0]+' ('+o.n+'). Under the law of occupation, it must maintain public order, services and the existing law; international observers ask for access.'});}}
/* ------------------------------------------------------------------ ch.10 economy */
function economy(p,l,month){const st=W.st,war=bel(p)&&!st.over,f=l.fin,e=p.ecn;
  // finance: deficits at war become debt; inflation from shortages and money printing; the currency follows
  const def=war?.004+.004*(1-(p.econ??1)):-.0005;f.debt=cl(f.debt+def/30,0,4);f.infl=cl(f.infl+((war?.002:0)+(e?(1-e.food)*.004+(1-e.energy)*.003:0)-(f.infl-.03)*.02)/3,-.02,1.5);
  f.cur=cl(f.cur*(1-f.infl/365)*(war?1-.0003:1+.0001),.1,1.5);if(war&&month)f.bonds+=Math.round(p.gdp*.003);
  // labour: participation rises at war (work replaces the mobilized), wages lag inflation, strikes when real wages fall
  l.lab.part=cl(l.lab.part+(war?.0005:-.0002),.5,.8);l.lab.wage=cl(l.lab.wage*(1+(f.infl*.6)/365),.5,3);const real=l.lab.wage/Math.pow(1+f.infl,1);
  if(month&&real<.9&&rn()<.25){l.lab.strike++;W.emit('LABOUR',{e:[p.a3],txt:'Workers in '+p.n+' strike over wages that no longer keep up with prices; talks with the government open.'});}
  // consumption and rationing: rationing when food or fuel run short
  const ration=e&&(e.food<.75||e.fuel<12)?1:0;if(ration!==l.cons.ration){l.cons.ration=ration;W.emit('RATIONING',{e:[p.a3],txt:ration?p.n+' introduces rationing of food and fuel; queues form; prices are capped for basic goods.':'Rationing ends in '+p.n+'.'});}
  l.cons.index=cl((p.econ??1)*(1-f.infl*.3)*(ration?.85:1),.2,1.3);
  if(month&&f.infl>.2&&rn()<.3)W.emit('FINANCE',{e:[p.a3],cf:'ESTIMATED',txt:'Inflation in '+p.n+' reaches an estimated '+Math.round(f.infl*100)+' % a year; the central bank raises rates; savings lose value.'});}
// trade: flows between countries by GDP; none across the line (sanctions); neutrals trade with both
function trade(){const st=W.st,T=st.trade||(st.trade={vol:{},sanc:0});const L=Object.values(st.c).filter(p=>p.gdp>2e5);let s=0;
  for(const p of L){let v=0;for(const q of L){if(p===q)continue;const across=p.side&&q.side&&p.side!==q.side&&bel(p)&&bel(q);if(across){s++;continue;}v+=Math.sqrt(p.gdp*q.gdp)/1e6;}T.vol[p.a3]=Math.round(v);}T.sanc=s;}
// critical resources: dependence on imports; cut off by blockade (naval) or sanctions
function resources(p,l){const e=p.ecn;if(!e||!bel(p))return;if(l.res.crit<.5&&e.trans<.6&&rn()<.01)W.emit('RESOURCES',{e:[p.a3],txt:p.n+'\'s industry runs short of imported components and critical minerals; production lines slow.'});}
/* ------------------------------------------------------------------ ch.11 housing and utilities */
function housing(p,l){const st=W.st,dmg=p.ecn?1-p.ecn.infra:0;const lost=Math.round(l.house.stock*dmg*.02/30);if(bel(p)&&!st.over){l.house.lost+=lost;}else l.house.lost=Math.max(0,l.house.lost-Math.round(l.house.stock*.0003));}
/* ------------------------------------------------------------------ ch.12 environment and humanitarian corridors */
function environment(p,l){const st=W.st,war=bel(p)&&!st.over;const act=st.fronts.filter(f=>(f.a===p.a3||f.b===p.a3)&&!f.cf).length;
  l.env.pol=cl(l.env.pol+(war?.0006*act:-.0004),0,1);l.env.forest=cl(l.env.forest+(war?.0002*act:-.0001),0,1);
  if(war&&act&&(p.disp||0)>p.pop*.01&&!l.corr.length&&rn()<.02){const f=st.fronts.find(q=>(q.a===p.a3||q.b===p.a3)&&!q.cf);if(f){l.corr.push({f:f.id,until:st.t+24*5});W.emit('CORRIDOR',{e:[f.a,f.b],txt:'A humanitarian corridor opens on the '+st.c[f.a].n+' / '+st.c[f.b].n+' front for five days: civilians leave, aid convoys enter under observer escort.'});}}
  l.corr=l.corr.filter(c=>c.until>st.t);}
W.climate=W.climate||{trend:.02};   // degrees per year, a scenario constant; seasons.js could read it for long campaigns
/* ------------------------------------------------------------------ ch.05 politics, legitimacy, treaties */
function politics(p,l){const st=W.st,o=l.pol;o.leg=cl(o.leg+((p.sup??.6)-.5)*.002+(l.trust-.5)*.001,.05,1);
  return;   /* elections, renewals and successions: natpol.js (v349) */
  if(st.t<o.next)return;o.next=st.t+24*365*(4+rn()*2);o.cycles++;const war=bel(p)&&!st.over;
  // a leadership renewal: the scenario does not specify each country's form of government, so this is generic
  const keep=o.leg>.45||(war&&rn()<.6);W.emit('POLITICS',{e:[p.a3],txt:'Leadership renewal in '+p.n+' (as its constitution provides): '+(keep?'the government is returned':'a new government takes office')+(war?' during the war':'')+'.'});
  if(!keep&&p.ldr&&W.lead){/* the leaders module appoints the new head the next time it runs */p.ldr.HEAD=null;}}
const TREATY=['a mutual defence pact','an arms-control agreement','a non-aggression pact','a basing agreement','a trade agreement','a prisoner-exchange agreement'];
function treaties(){const st=W.st;if(rn()>.01)return;const C=Object.values(st.c).filter(p=>p.gdp>3e5);const a=C[(rn()*C.length)|0],b=C[(rn()*C.length)|0];if(!a||!b||a===b)return;
  if(a.side&&b.side&&a.side!==b.side&&bel(a)&&bel(b)){if(st.over&&rn()<.5){W.emit('TREATY',{e:[a.a3,b.a3],txt:a.n+' and '+b.n+' sign a prisoner-exchange agreement.'});}return;}
  const k=TREATY[(rn()*(a.side&&a.side===b.side?TREATY.length:3))|0];const la=L(a);la.treat.push({w:b.a3,k,t:st.t});if(la.treat.length>10)la.treat.shift();W.emit('TREATY',{e:[a.a3,b.a3],txt:a.n+' and '+b.n+' sign '+k+'.'});}
/* ------------------------------------------------------------------ daily */
W.daily.push(()=>{const st=W.st;if(!st)return;const day=Math.floor(st.t/24),month=day%30===0;
  for(const p of Object.values(st.c)){if(W.lod&&!W.lod(p,day))continue;const l=L(p);people(p,l,day);institutions(p,l);economy(p,l,month);resources(p,l);housing(p,l);environment(p,l);politics(p,l);}
  occupation();treaties();if(month)trade();});
// effects back on the war: trust and public services steady public support; inflation and rationing wear it down
W.daily.push(()=>{const st=W.st;if(!st)return;for(const p of Object.values(st.c)){const l=p.life;if(!l||p.sup==null)continue;p.sup=cl(p.sup+(l.trust-.5)*.001-l.fin.infl*.002-(l.cons.ration?.001:0),0,1);}});
/* ------------------------------------------------------------------ LIFE tab */
const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>',est=x=>'<span title="estimate by rule" style="color:#c9b46b">~'+x+'</span>',pc=v=>Math.round(v*100)+' %';
function tab(p){const l=L(p),st=W.st;let h='<div style="color:#8a9a92;font-size:10px">Estimates by rule (~), not real statistics.</div>';
  h+='<h4>PEOPLE</h4>'+row('Population',est(fmt(p.pop)))+row('Births / deaths per 1,000 a year',est(Math.round(l.dem.birth*1000)+' / '+Math.round(l.dem.death*1000)))+row('Living in cities',est(pc(l.dem.urban)))+row('Displaced at home / abroad / returned',est(fmt(l.mig.inner)+' / '+fmt(l.mig.out)+' / '+fmt(l.mig.back)))+
    row('Hospital load',est(pc(l.health.load))+(l.health.outbreak?' · outbreak':''))+row('Schools open',pc(l.edu.open))+row('School days lost (country-days)',est(Math.round(l.edu.lost)));
  h+='<h4>PUBLIC SERVICES AND INSTITUTIONS</h4>'+Object.entries(l.svc).map(([k,v])=>row({schools:'Schools',hosp:'Hospitals',police:'Police',water:'Water',power:'Power',admin:'Local administration'}[k],pc(v))).join('')+row('Trust in institutions',pc(l.trust))+(l.heritage.dmg?row('Heritage sites damaged',l.heritage.dmg+' ('+l.heritage.list.slice(-3).join(', ')+')'):'');
  h+='<h4>MONEY AND WORK</h4>'+row('Public debt',est(pc(l.fin.debt)+' of GDP'))+row('Inflation',est(pc(l.fin.infl)+' a year'))+row('Currency (prewar = 100)',est(Math.round(l.fin.cur*100)))+(l.fin.bonds?row('War bonds sold',est('$'+fmt(l.fin.bonds)+'M')):'')+
    row('Labour participation',est(pc(l.lab.part)))+row('Real wages (prewar = 100)',est(Math.round(l.lab.wage/(1+l.fin.infl)*100)))+row('Consumption (prewar = 100)',est(Math.round(l.cons.index*100)))+(l.cons.ration?row('Rationing','in force'):'')+row('Trade volume (index)',est((st.trade&&st.trade.vol[p.a3])||'—'));
  h+='<h4>HOMES AND ENVIRONMENT</h4>'+row('Homes',est(fmt(l.house.stock)))+row('Homes destroyed or uninhabitable',est(fmt(l.house.lost)))+row('Water supply',pc(l.water))+row('Pollution from the fighting (index)',Math.round(l.env.pol*100))+(l.corr.length?row('Humanitarian corridor','open'):'');
  h+='<h4>POLITICS</h4>'+row('Legitimacy',pc(l.pol.leg))+(l.treat.length?row('Treaties',l.treat.slice(-4).map(t=>t.k+' with '+(st.c[t.w]?st.c[t.w].n:t.w)).join('; ')):'')+
    '<div style="font-size:10px;color:#8a9a92">Government, elections and parliament: POLITICS tab.</div>';
  return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.LIFE=tab;
W.life={L,tab,trade,occupation};
})();
