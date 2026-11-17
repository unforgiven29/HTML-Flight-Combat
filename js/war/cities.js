/* =====================================================================================================================
   v352 — cities as places with people (spec v49 ch.08 population by place; ch.09 municipal government, mayors, local
   councils, city services; ch.11 cities, housing and utilities; ch.12 civil protection).
   For every country at war, its ten largest cities (GeoNames / Natural Earth populations) each get a record:
   population, people displaced FROM the city, homes damaged, power, water, hospital and school service levels,
   shelter places, air-raid alerts, who holds it, and a mayor (fictional; under occupation, an appointed administrator).
   ONE AUTHORITY: national figures stay the source; cities are their geographic allocation, so nothing is counted twice:
   * displaced: the country's displaced people (p.disp) are allocated to cities by exposure (distance to the nearest
     active front, enemy air over the country, occupation);
   * homes damaged: the country's homes lost (life.js) allocated the same way;
   * services: the national level (life.js) lowered near the fronts and in occupied cities, raised where the mayor
     prioritises repairs.
   Each day: cities within 40 km of an active front come under shelling (abstract; event once, services fall); where
   the enemy holds the air, air-raid alerts sound (people to shelters; no harm modelled from an alert itself); mayors
   open shelters, organise evacuations and prioritise repairs (events once each). The CITIES tab lists them; the war
   map marks damaged cities (ring size by damage) when zoomed in.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.lead||!window.WARMAP)return;
const W=WWAR,G=WGEO,rn=Math.random,Ld=W.lead;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+' million':n>=1e4?Math.round(n/1e3)+',000':String(Math.round(n||0));
const C=()=>W.st.city||(W.st.city={});
function init(p){const S=C();if(S[p.a3])return S[p.a3];const L=G.places.filter(q=>q.a3===p.a3&&q.pop).sort((a,b)=>b.pop-a.pop).slice(0,10);
  return S[p.a3]=L.map(q=>({n:q.name,lat:q.lat,lon:q.lon,pop:q.pop,disp:0,dmg:0,pow:1,wat:1,hosp:1,sch:1,shel:0,alerts:0,held:p.a3,mayor:Ld.person(p.a3,'Mayor of '+q.name,null).id,said:{},exp:0}));}
function frontDist(p,c){let d=1e12;for(const f of W.st.fronts){if(f.cf||(f.a!==p.a3&&f.b!==p.a3))continue;for(const s of f.sec){const q=W.linePt(s);d=Math.min(d,G.dist(c.lat,c.lon,q.lat,q.lon));}}return d;}
function daily(){const st=W.st;
  for(const p of Object.values(st.c)){if(!bel(p)&&!C()[p.a3])continue;const L=init(p),l=p.life;if(!L.length)continue;
    const th=(st.th||[]).find(t=>t.f&&t.f[p.a3]),air=th?Math.max(0,p.side==='B'?-th.sup:th.sup):0;
    // who holds each city (worldwar.js tracks captured cities by name)
    for(const c of L){const k=Object.keys(st.cities||{}).find(x=>x.split('|')[0]===c.n);const h=k?st.cities[k].h:p.a3;
      if(h!==c.held){c.held=h;if(h!==p.a3){const a=Ld.person(h,'Administrator of '+c.n,null);c.adm=a.id;W.emit('CITY',{e:[h,p.a3],txt:c.n+' ('+p.n+') comes under '+st.c[h].n+'\'s control; an administrator is appointed and the elected mayor is removed from office.'});}else{c.adm=null;W.emit('CITY',{e:[p.a3],txt:c.n+' returns to '+p.n+'\'s control; the mayor resumes office.'});}}
      const fd=frontDist(p,c)/1000;c.exp=cl((fd<40?1:fd<150?.5:fd<400?.15:.03)+air*.3+(c.held!==p.a3?.8:0),0,2);}
    // allocate the national figures by exposure x population (one authority: these are shares)
    const W0=L.reduce((t,c)=>t+c.exp*c.pop,0)||1,urban=l?l.dem.urban:.6,cityShare=L.reduce((t,c)=>t+c.pop,0)/Math.max(1,p.pop*urban);
    for(const c of L){const w=c.exp*c.pop/W0;c.disp=Math.min(c.pop*.9,Math.round((p.disp||0)*cl(cityShare,.2,.9)*w));c.dmg=Math.min(Math.round(c.pop/2.8),Math.round((l?l.house.lost:0)*cl(cityShare,.2,.9)*w));
      const nat=l?l.svc:{power:1,water:1,hosp:1,schools:1},hit=cl(c.exp*.25,0,.6),fix=c.fix?.1:0;
      c.pow=cl(nat.power-hit+fix,.05,1);c.wat=cl(nat.water-hit*.8+fix,.05,1);c.hosp=cl(nat.hosp-hit*.6+fix*.5,.05,1);c.sch=cl(nat.schools-hit,.0,1);
      // events and the mayor's decisions (once each)
      const war=bel(p)&&!st.over;if(!war)continue;const say=(k,txt)=>{if(c.said[k])return;c.said[k]=st.t;W.emit('MUNICIPAL',{e:[p.a3],txt});};   /* CITY is for control changes (media, investigations) */const m=Ld.who(c.held===p.a3?c.mayor:c.adm);
      if(frontDist(p,c)<40e3)say('shell',c.n+' ('+p.n+') is within range of the fighting: shelling damages homes, power and water lines; residents shelter in basements.');
      if(air>.35&&rn()<.05*air){c.alerts++;c.shel=Math.round(c.pop*cl(.1+(st.city&&p.life?p.life.trust*.2:0),.05,.4));say('raid','Air-raid alerts sound in '+c.n+' ('+p.n+'); shelters open for about '+fmt(c.shel)+' people.');}
      if(c.exp>.9&&m)say('evac',(c.held===p.a3?'Mayor ':'Administrator ')+m.name+' orders the evacuation of children, the elderly and the sick from '+c.n+'; buses and trains take them to safer cities.');
      if(c.pow<.6&&m&&!c.fix){c.fix=1;say('fix',(c.held===p.a3?'Mayor ':'Administrator ')+m.name+' makes repairs to power and water in '+c.n+' the city\'s first priority; repair crews work in shifts.');}}}}
W.daily.push(()=>{if(W.st)daily();});
/* ------------------------------------------------------------------ map and panel */
{const _d=WARMAP.draw;WARMAP.draw=function(c,w2s,M,phase){const r=_d.apply(this,arguments);if(phase!=='over'||!W.st||!W.st.city||M.ppd<4)return r;
  for(const L of Object.values(W.st.city))for(const t of L){const v=t.dmg/Math.max(1,t.pop/2.8)+t.disp/Math.max(1,t.pop);if(v<.01)continue;const[x,y]=w2s(t.lat,t.lon);c.strokeStyle='rgba(255,190,110,.8)';c.lineWidth=1.2;c.beginPath();c.arc(x,y,3+Math.min(9,v*30),0,7);c.stroke();}return r;};}
if(window.NATPANEL&&NATPANEL.tabs){const pc=v=>Math.round(v*100)+'%',esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  NATPANEL.tabs.CITIES=p=>{const L=C()[p.a3];if(!L)return'<div>City records start when a country goes to war.</div>';
    return '<div style="font-size:10px;color:#8a9a92">Estimates: the country\'s displaced people and damaged homes allocated to its cities by exposure. Mayors and administrators are fictional.</div>'+
      '<table style="width:100%;font-size:10px;border-collapse:collapse"><tr><th align="left">CITY</th><th>POP</th><th>DISPL.</th><th>HOMES DMG</th><th>POWER</th><th>WATER</th><th>HOSP</th><th>SCHOOL</th></tr>'+
      L.map(c=>{const m=Ld.who(c.held===p.a3?c.mayor:c.adm);return '<tr title="'+esc((c.held===p.a3?'Mayor ':'Administrator ')+(m?m.name:''))+'"><td>'+esc(c.n)+(c.held!==p.a3?' ⚑':'')+'</td><td align="center">'+fmt(c.pop)+'</td><td align="center">'+fmt(c.disp)+'</td><td align="center">'+fmt(c.dmg)+'</td><td align="center">'+pc(c.pow)+'</td><td align="center">'+pc(c.wat)+'</td><td align="center">'+pc(c.hosp)+'</td><td align="center">'+pc(c.sch)+'</td></tr>';}).join('')+'</table>'+
      '<div style="font-size:10px">⚑ held by another country. Hover a row for its mayor or administrator.</div>';};}
W.cities={C,init,daily,frontDist};
})();
