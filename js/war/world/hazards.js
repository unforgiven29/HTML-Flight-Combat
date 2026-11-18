/* =====================================================================================================================
   v336 — natural hazards, emergencies and humanitarian response (spec v49 ch.12 hazards, emergencies, humanitarian
   response and recovery). Every country, at war or not. Abstract campaign events, not a disaster forecast.
   * Daily chance per country by hazard, region and season (gameplay-level priors):
       EARTHQUAKE  in the major seismic belts (Pacific rim, Himalaya-Alpine belt, Andes, Caribbean, East Africa rift);
       FLOOD       wet season in the tropics, spring thaw and autumn rains elsewhere, more with big rivers;
       CYCLONE     tropical seas in their season (western Pacific, Indian Ocean, Caribbean / Gulf);
       WILDFIRE    dry summers (Mediterranean, Australia, western North America, Siberia);
       WINTER STORM / HEATWAVE  by season and latitude.
   * Severity 1-3. Consequences (ESTIMATES by rule, labelled): people displaced, an estimated harm range, damage to
     infrastructure, power and transport, the economy, public support; hospitals strained.
   * Emergency response: the country's capacity (stability x economy; reduced at war); neutral and allied countries send
     aid (event); a disaster in a country at war can bring a humanitarian pause on its fronts (local ceasefire for a few
     days, if the leaders are pragmatic enough), or, if response fails, unrest.
   * Recovery over weeks: displaced people return as infrastructure is repaired.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR)return;
const W=WWAR,G=WGEO,rn=Math.random,pick=a=>a[(rn()*a.length)|0];
const box=(lat,lon,L)=>L.some(([a,b,c,d])=>lat>=a&&lat<=b&&lon>=c&&lon<=d);
const SEIS=[[30,46,125,146],[-10,20,95,128],[-47,-30,165,180],[-56,12,-82,-66],[10,22,-95,-60],[25,45,60,100],[34,42,20,45],[36,46,6,20],[-12,14,28,42],[32,42,-125,-114],[50,62,150,180],[-25,-15,-75,-68]];
const CYC=[[5,35,110,160],[5,25,55,95],[10,32,-98,-60],[-25,-8,40,60],[-25,-10,110,155]],FIRE=[[33,45,-10,36],[-40,-10,113,154],[32,49,-125,-104],[50,68,85,140]];
const H=()=>W.st.hz||(W.st.hz={list:[],seen:{}});
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+' million':n>=1e3?Math.round(n/1e3)+',000':String(n);
function chances(c,m){const lat=c.ly,lon=c.lx,a=Math.abs(lat),north=lat>=0,se=W.season?W.season(lat,m):'SUMMER',out=[];
  if(box(lat,lon,SEIS))out.push(['EARTHQUAKE',.0009]);
  out.push(['FLOOD',se==='WET'?.004:(se==='SPRING'||se==='AUTUMN')?.0016:.0005]);
  const n=north?m:(m+6)%12;if(box(lat,lon,CYC)&&n>=6&&n<=10)out.push(['CYCLONE',.004]);
  if(box(lat,lon,FIRE)&&se==='SUMMER')out.push(['WILDFIRE',.004]);
  if(a>40&&se==='WINTER')out.push(['WINTER STORM',.002]);if(a<45&&se==='SUMMER')out.push(['HEATWAVE',.0015]);return out;}
const WORDS={EARTHQUAKE:['An earthquake strikes','buildings collapse; rescuers search the rubble'],FLOOD:['Floods hit','rivers burst their banks; towns are cut off'],CYCLONE:['A tropical cyclone makes landfall in','storm surge and winds destroy homes along the coast'],
  WILDFIRE:['Wildfires spread in','villages are evacuated as the fires advance'],'WINTER STORM':['A severe winter storm hits','power lines are down and roads are closed'],HEATWAVE:['A heatwave grips','hospitals fill with heat illness; the grid strains']};
function daily(){const st=W.st,m=W.month?W.month(st.t):0,h=H();
  for(const c of G.countries){const p=st.c[c.a3];if(!p||p.pop<2e5)continue;
    for(const[kind,pr]of chances(c,m)){if(rn()>=pr*Math.min(3,Math.max(.3,Math.log10(p.pop)-5)))continue;
      const sev=rn()<.65?1:rn()<.8?2:3,places=G.places.filter(q=>q.a3===c.a3),where=places.length?pick(places.slice(0,Math.min(12,places.length))).name:c.n;
      const disp=Math.round(Math.min(p.pop*.05,[2e3,3e4,3e5][sev-1]*(.5+rn()))),kLo=Math.round([2,40,400][sev-1]*rn()),kHi=Math.round(kLo*2.5+[5,60,800][sev-1]);
      const atWar=p.side&&(p.al==='CORE'||p.al==='ALLY'),cap=Math.max(.1,(p.stab??.8)*(p.econ??1)*(atWar?.7:1)),ok=rn()<cap+.2;
      p.disp=(p.disp||0)+disp;if(p.ecn){p.ecn.infra=Math.max(.2,p.ecn.infra-.01*sev);p.ecn.trans=Math.max(.2,p.ecn.trans-.01*sev);}if(p.econ!=null)p.econ=Math.max(.5,p.econ-.003*sev);
      const ev={id:'HZ'+(h.list.length+1),t:st.t,kind,sev,a3:c.a3,where,disp,kLo,kHi,ok,back:st.t+24*(10+20*sev)};h.list.push(ev);if(h.list.length>200)h.list.shift();
      W.emit('HAZARD',{e:[c.a3],cf:'ESTIMATED',txt:WORDS[kind][0]+' '+where+' ('+c.n+'): '+WORDS[kind][1]+'. The number of victims is not yet known; about '+fmt(disp)+' people are displaced (estimate). '+(ok?'Emergency services are coping with the response.':'The response is overwhelmed'+(atWar?' by the demands of the war':'')+'.')});
      if(sev>=2){const donors=Object.values(st.c).filter(q=>q!==p&&q.gdp>5e5&&(!atWar||!q.side||q.side===p.side)).slice(0,3);if(donors.length)W.emit('AID',{e:[c.a3],txt:donors.map(q=>q.n).join(', ')+' send emergency aid, rescue teams and field hospitals to '+c.n+'.'});}
      if(atWar&&sev>=2&&W.st.fronts){const f=W.st.fronts.find(q=>(q.a===c.a3||q.b===c.a3)&&!q.cf);const ld=p.ldr&&W.lead&&W.lead.who(p.ldr.HEAD);
        if(f&&ld&&ld.prag>.45&&rn()<.5){f.cf={kind:'LOCAL',t:st.t,until:st.t+72};W.emit('CEASEFIRE',{e:[f.a,f.b],txt:'A humanitarian pause on the '+st.c[f.a].n+' / '+st.c[f.b].n+' front after the disaster in '+c.n+': three days for rescue and relief.'});}}
      if(!ok&&p.sup!=null){p.sup=Math.max(0,p.sup-.03*sev);if(p.stab!=null)p.stab=Math.max(0,p.stab-.02*sev);}}}
  // recovery: people return when the time is up
  for(const ev of h.list){if(ev.done||st.t<ev.back)continue;ev.done=1;const p=st.c[ev.a3];if(p)p.disp=Math.max(0,(p.disp||0)-Math.round(ev.disp*.8));
    if(ev.sev>=2)W.emit('RECOVERY',{e:[ev.a3],txt:'Recovery in '+ev.where+' ('+(p?p.n:ev.a3)+'): most of those displaced by the '+ev.kind.toLowerCase()+' have returned; rebuilding continues.'});}}
W.daily.push(()=>{if(W.st)daily();});
W.hazards={H,chances,daily};
})();
