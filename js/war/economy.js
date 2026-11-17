/* =====================================================================================================================
   v332 — national economy and infrastructure in the world war (spec v49 ch.10 economy, energy, industry, trade; ch.11
   infrastructure, utilities, transport, food). Aggregate (tier D): one record per country at war, updated daily.
   All levels are indices (1 = prewar) except fuel, in days of wartime consumption. Starting stocks and production
   rates are ESTIMATES set by documented rules from GDP and region (no national energy data is used); labelled as such.

   p.ecn = { energy, fuel (days), ind (defence industry), trans (rail / road / ports), food, infra (condition) }
   * Infrastructure is damaged by enemy air power over the country (strategic strikes, scaled by the enemy's superiority
     in the theatres that cover it) and by fronts on its soil; it is repaired each day in proportion to the economy.
   * Energy follows infrastructure; transport follows infrastructure and fuel; the defence industry follows economy,
     energy and infrastructure; food follows transport and the share of population in occupied cities.
   * Fuel: about 60 days of wartime stocks at the start; each war day burns one day; domestic output and imports (cut by
     sanctions between the sides, kept from neutral trade) refill it. Under 10 days: a fuel crisis.
   * Effects: front power (WWAR.mod) falls with fuel and transport (supply); war production is scaled through the
     economy index; blackouts and food shortages wear down public support. Shortages and recoveries are events.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,G=WGEO,P=WWAR.diplo;
const E={strike:.004,frontDmg:.0015,repair:.004,fuel0:60,burn:1,crisis:10};
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
// domestic fuel output as a share of wartime burn: an ESTIMATE from region (major producing regions higher); 0.4-1.1
const OUT={RUS:1.1,SAU:1.1,USA:.9,CAN:1,NOR:1,IRN:1,KAZ:1,ARE:1,KWT:1,IRQ:1,VEN:1,NGA:.9,DZA:.9,LBY:.9,QAT:1,OMN:.9,AZE:.9,MEX:.7,BRA:.7,CHN:.55,GBR:.55};
function init(p){if(p.ecn)return;p.ecn={energy:1,fuel:E.fuel0,ind:1,trans:1,food:1,infra:1,out:OUT[p.a3]||(.4+.3*Math.min(1,p.gdp/2e6)),flags:{}};}
const theatresOver=c=>W.st.th.filter(th=>{const T=W.THEATRES.find(q=>q.id===th.id);return c.ly>=T.lat[0]&&c.ly<=T.lat[1]&&c.lx>=T.lon[0]&&c.lx<=T.lon[1];});
function daily(){const st=W.st;
  for(const p of Object.values(st.c)){if(!bel(p)&&!p.ecn)continue;init(p);const e=p.ecn,c=G.byA3.get(p.a3);if(!c)continue;
    // strategic strikes: enemy air superiority over the theatres covering this country
    let enemySup=0;for(const th of theatresOver(c))enemySup=Math.max(enemySup,p.side==='B'?-th.sup:th.sup);
    const fronts=st.fronts.filter(f=>!f.cf&&(f.a===p.a3||f.b===p.a3)).length;
    e.infra=Math.max(.2,Math.min(1,e.infra-(bel(p)?E.strike*Math.max(0,enemySup)+E.frontDmg*Math.min(1,fronts):0)+E.repair*(p.econ??1)*(1-e.infra+.05)));
    e.energy=Math.max(.2,Math.min(1,.15+.85*e.infra));
    const sanctions=bel(p)?.25:0,imports=.35*(1-sanctions);   // trade with the other side is cut; neutral trade continues
    e.fuel=Math.max(0,Math.min(90,e.fuel-(bel(p)?E.burn:0)+E.burn*(e.out*e.infra+imports)*.95));
    e.trans=Math.max(.2,Math.min(1,.3+.5*e.infra+.2*Math.min(1,e.fuel/20)));
    e.ind=Math.max(.2,Math.min(1,(p.econ??1)*(.5+.5*e.energy)*(.6+.4*e.infra)));
    const occ=Object.values(st.cities).filter(v=>v.own===p.a3&&v.h!==p.a3).reduce((t,v)=>t+v.pop,0)/Math.max(1,p.pop);
    e.food=Math.max(.3,Math.min(1,1-.4*(1-e.trans)-occ*.8));
    // consequences that persist: lost energy and industry wear the economy; shortages wear support
    if(p.econ!=null)p.econ=Math.max(.5,p.econ-.002*(1-e.energy)-.001*(1-e.ind));
    if(p.sup!=null)p.sup=Math.max(0,p.sup-.002*(1-e.food)-.0015*(1-e.energy));
    const flag=(k,on,txtOn,txtOff)=>{if(on&&!e.flags[k]){e.flags[k]=1;W.emit('ECON',{e:[p.a3],cf:'ESTIMATED',txt:p.n+': '+txtOn});}else if(!on&&e.flags[k]){e.flags[k]=0;W.emit('ECON',{e:[p.a3],cf:'ESTIMATED',txt:p.n+': '+txtOff});}};
    flag('fuel',e.fuel<E.crisis,'fuel crisis, under '+E.crisis+' days of stocks: rationing for civilians, flying hours cut.','fuel stocks recover.');
    flag('power',e.energy<.55,'rolling blackouts after strikes on the power grid.','power restored across most of the country.');
    flag('food',e.food<.7,'food shortages in the cities; rationing begins.','food supplies recover.');}}
W.daily.push(()=>{if(W.st&&!W.st.over)daily();});
// supply at the front: fuel and transport
{const _m=W.mod;W.mod=(p,f,s)=>{const e=p.ecn;let k=_m(p,f,s);if(e)k*=(.55+.45*Math.min(1,e.fuel/20))*(.7+.3*e.trans);return k;};}
W.econ={E,init,daily};
})();
