/* =====================================================================================================================
   INFRA — chapter 11 in more depth (spec v49 ch.11): networks as assets that deliver services.
     * ONE ASSET MODEL: every network keeps assets (condition 0-1, age, maintenance debt) apart from the service they
       deliver (share of demand met); damage, repair, maintenance backlog and capital plans move assets, service follows.
     * WATER: sources (river, groundwater, reservoir, desalination), treatment, pipes; water balance (supply vs demand),
       quality incidents and boil-water notices, allocation priorities (hospitals, homes, industry, farms), shared rivers.
     * FOOD: a seasonal production cycle (planting, growing, harvest), livestock and fisheries, processing and cold chain,
       retail, food-security index; mined fields and blocked ports cut output.
     * SPACE: satellites by service (navigation, communications, earth observation, weather) for countries with
       programmes, ground stations, launches to replace losses, outages from interference.
     * AVIATION: airports from the world data, area control centres, flight plans and clearances (counted), airline
       routes and closures of airspace over war zones, emergency and humanitarian flights.
     * MARITIME: ports with throughput, merchant ships under each flag, lanes, rescues at sea; RAIL: network, strategic
       rail moves for the army, passenger services; PUBLIC TRANSPORT: ridership, fares, strikes.
     * CITIES: districts by land use with housing, damage and rebuilding; urban growth and decline.
     * NEXUS: food, water, energy and land compete (irrigation vs drinking water, power for pumps) — trade-offs are
       events with the choice made.
   Aggregate; ESTIMATES by rule; operators fictional.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));const bel=p=>W.bell?W.bell(p):!!p.side;const rn=()=>Math.random();const pk=a=>a[Math.floor(rn()*a.length)];const pct=x=>Math.round((x||0)*100)+'%';const r3=x=>Math.round(x*1000)/1000;
const S=()=>{const st=W.st;if(!st.inf)st.inf={c:{}};return st.inf;};
const NET=['water','power','roads','rail','ports','airports','telecom','food chain'];
const WSRC=['river intakes','groundwater wells','reservoirs','desalination'];const PRIO=['hospitals','homes','industry','farms'];
const SAT={nav:'navigation',com:'communications',eo:'earth observation',wx:'weather'};
const SPACE={USA:40,CHN:30,RUS:20,FRA:6,GBR:4,DEU:4,ITA:4,JPN:8,IND:8,ISR:4,KOR:3,ESP:2,CAN:2,BRA:2,TUR:2,IRN:1,ARE:2,SAU:1,AUS:2,UKR:1,PAK:1};
const DIST=['old town','residential','industrial','commercial','port and rail','suburbs'];
/* ------------------------------------------------------------------ record */
function rec(p){const X=S();let R=X.c[p.a3];if(R)return R;const t=cl(Math.log10(Math.max(1e3,p.gdp*1e6/Math.max(1,p.pop)))/5,0,1);
  const ap=window.WGEO&&WGEO.airports?WGEO.airports.filter(a=>a.iso2&&WGEO.byA2&&WGEO.byA2.get(a.iso2)&&WGEO.byA2.get(a.iso2).a3===p.a3).length:0;
  R=X.c[p.a3]={net:Object.fromEntries(NET.map(k=>[k,{c:.85+t*.1,age:20+Math.round(rn()*25),debt:r3(.1+(1-t)*.3),svc:1}])),
    wat:{src:WSRC.map((k,i)=>[k,i===3?(p.a3==='SAU'||p.a3==='ARE'||p.a3==='ISR'?.3:0):[.4,.3,.3][i]]),bal:1.1,q:0,boil:0,prio:PRIO.slice(),shared:rn()<.4},
    food:{ph:'',out:1,live:1,fish:1,cold:1,ret:1,sec:.8+t*.15},sp:SPACE[p.a3]?{n:SPACE[p.a3],svc:Object.fromEntries(Object.keys(SAT).map(k=>[k,1])),gs:Math.max(1,Math.round(SPACE[p.a3]/5)),lau:0,lost:0}:null,
    av:{ap,acc:Math.max(1,Math.round(ap/60)),fp:0,closed:false,routes:Math.round(p.gdp/2e4),hum:0,emg:0},
    sea:{ports:Math.max(0,Math.round(p.gdp/2e5)),thr:1,ships:Math.round(p.gdp/1e4),resc:0},rail:{km:Math.round(p.pop/2500),mil:0,pass:1},pt:{ride:1,fare:1,strike:0},
    dist:{},nex:0};
  for(const c of ((W.st.city&&W.st.city[p.a3])||[]).slice(0,3))R.dist[c.n]=DIST.map(d=>[d,1]);return R;}
/* ------------------------------------------------------------------ daily */
function season(){const d=typeof W.date==='function'?W.date():null;const m=d&&d.getMonth?d.getMonth():(Math.floor(W.st.t/24/30)%12);return m>=2&&m<=4?'planting':m>=5&&m<=7?'growing':m>=8&&m<=9?'harvest':'winter';}
function step(p,R){const st=W.st,war=bel(p)&&!st.over,e=p.ecn||{infra:1,energy:1,trans:1,food:1};
  for(const k of NET){const n=R.net[k];n.c=r3(cl(n.c-(war?(1-e.infra)*.004:0)-n.debt*.0004+(st.over?.004:.0015)*(p.econ??1),.1,1));n.debt=r3(cl(n.debt+(war?.0006:-.0004),0,1));
    n.svc=r3(cl(n.c*(k==='water'?(.5+.5*e.energy):k==='rail'||k==='roads'?(.5+.5*e.trans):1),0,1));}
  const Wt=R.wat;Wt.bal=r3(cl(1.1*R.net.water.svc-(war?.05:0),0,1.5));if(Wt.bal<.85&&!Wt.boil&&rn()<.05){Wt.boil=10;Wt.q++;W.emit('UTILITIES',{e:[p.a3],txt:'A boil-water notice in parts of '+p.n+' after damage to the treatment plants; water goes first to '+Wt.prio.slice(0,2).join(' and ')+'; tankers serve the districts cut off.'});}if(Wt.boil>0)Wt.boil--;
  let ss="winter";try{ss=season();}catch(x){}const F=R.food;if(F.ph!==ss){F.ph=ss;if(ss==='harvest'&&war)W.emit('FOOD',{e:[p.a3],cf:'ESTIMATED',txt:'Harvest in '+p.n+': about '+pct(F.out)+' of a normal year, with fields near the front unharvested or mined. Grain moves to silos away from the fighting.'});}
  F.out=r3(cl(F.out+(war?-.0006:.0006)-(1-e.food)*.001,.3,1.1));F.live=r3(cl(F.live+(war?-.0004:.0004),.4,1.1));F.fish=r3(cl(F.fish-((p.blockade||0)>.3?.003:-.002),.2,1.1));F.cold=r3(cl(e.energy*.9+.1,0,1));F.ret=r3(cl((e.trans+e.food)/2,0,1));F.sec=r3(cl(F.out*.4+F.ret*.4+F.cold*.2,0,1));
  if(R.sp){const P=R.sp;for(const k in P.svc)P.svc[k]=r3(cl(P.svc[k]+(war&&rn()<.01?-.1:.01),.4,1));if(war&&rn()<.004){P.lost++;W.emit('SPACE',{e:[p.a3],txt:'A '+pick2(Object.values(SAT))+' satellite of '+p.n+' stops answering after interference; ground stations switch users to backups.'});}if(P.lost>P.lau&&rn()<.01){P.lau++;W.emit('SPACE',{e:[p.a3],txt:p.n+' launches a replacement satellite.'});}}
  const A=R.av;A.closed=war;A.fp+=Math.round(A.routes*(war?.2:1));if(war&&rn()<.03){A.hum++;}if(rn()<.01)A.emg++;
  if(war&&!R._av){R._av=1;W.emit('AVIATION',{e:[p.a3],txt:'Civil airspace over '+p.n+' closes near the fighting; airlines reroute, area control centres handle military and humanitarian flights only in the restricted zones.'});}
  const M=R.sea;M.thr=r3(cl(1-(p.blockade||0)*.8-(war?.1:0),.05,1.1));if(rn()<.01)M.resc++;
  const Rl=R.rail;Rl.mil=war?Math.round(Rl.mil+1+rn()*3):Rl.mil;Rl.pass=r3(cl(R.net.rail.svc*(war?.8:1),0,1));
  const T=R.pt;T.ride=r3(cl((R.net.roads.svc+R.net.power.svc)/2*(war?.85:1),0,1.1));if(T.strike>0)T.strike--;else if(rn()<.002){T.strike=3;W.emit('TRANSPORT',{e:[p.a3],txt:'Bus and metro drivers in '+p.n+' strike for safety rules during air alerts; a minimum service runs.'});}
  for(const cn in R.dist){const c=((W.st.city&&W.st.city[p.a3])||[]).find(x=>x.n===cn);const hot=c&&(c.shel||0)>0;for(const d of R.dist[cn])d[1]=r3(cl(d[1]+(hot?-.01*rn():.003),.1,1));}
  // nexus: in a dry summer with damaged power, pumps for irrigation compete with drinking water
  if(war&&ss==='growing'&&Wt.bal<1&&R.net.power.svc<.8&&rn()<.02){R.nex++;W.emit('UTILITIES',{e:[p.a3],txt:'Trade-off in '+p.n+': with power short, pumping stations serve drinking water first and irrigation gets night hours only; harvest estimates fall a little.'});F.out=r3(F.out-.02);}}
const pick2=a=>a[Math.floor(rn()*a.length)];
function daily(){const st=W.st;if(!st)return;for(const p of Object.values(st.c)){if(!p.pop||!(bel(p)||p.gdp>1e6))continue;try{step(p,rec(p));}catch(e){console.warn('[infra]',p.a3,e);}}}
W.daily.push(daily);
/* ------------------------------------------------------------------ NETWORKS tab */
const row=(a,b)=>'<div style="display:flex;justify-content:space-between;gap:8px"><span>'+a+'</span><b>'+b+'</b></div>';
function tab(p){const st=W.st;if(!st)return'<div>No war running.</div>';if(!(bel(p)||p.gdp>1e6))return'<div>Networks are followed for countries at war and large economies.</div>';const R=rec(p);
  let h='<div style="color:#8a9a92;font-size:10px">Assets (condition, age, maintenance debt) are kept apart from the service they deliver. Estimates by rule.</div><h4>NETWORKS</h4>'+NET.map(k=>{const n=R.net[k];return row(k,'assets '+pct(n.c)+' · service '+pct(n.svc)+' · age '+n.age+' y · maintenance debt '+pct(n.debt));}).join('');
  const Wt=R.wat;h+='<h4>WATER</h4>'+row('sources',Wt.src.filter(s=>s[1]>0).map(s=>s[0]+' '+pct(s[1])).join(' · '))+row('balance (supply / demand)',Wt.bal.toFixed(2))+row('quality incidents · boil-water notice',Wt.q+' · '+(Wt.boil?Wt.boil+' days':'none'))+row('priority',Wt.prio.join(' > '))+(Wt.shared?row('shared river','basin commission (fictional)'):'');
  const F=R.food;h+='<h4>FOOD</h4>'+row('season',F.ph)+row('crops · livestock · fisheries',F.out.toFixed(2)+' · '+F.live.toFixed(2)+' · '+F.fish.toFixed(2))+row('cold chain · retail · food security',pct(F.cold)+' · '+pct(F.ret)+' · '+pct(F.sec));
  if(R.sp)h+='<h4>SPACE</h4>'+row('satellites · ground stations',R.sp.n+' · '+R.sp.gs)+Object.keys(SAT).map(k=>row(SAT[k],pct(R.sp.svc[k]))).join('')+row('lost · replaced',R.sp.lost+' · '+R.sp.lau);
  const A=R.av;h+='<h4>AVIATION</h4>'+row('airports · area control centres',A.ap+' · '+A.acc)+row('flight plans cleared · airline routes',A.fp+' · '+A.routes)+row('airspace',A.closed?'closed near the fighting':'open')+row('humanitarian · emergency flights',A.hum+' · '+A.emg);
  h+='<h4>SEA, RAIL, PUBLIC TRANSPORT</h4>'+row('ports · throughput · merchant ships · rescues',R.sea.ports+' · '+pct(R.sea.thr)+' · '+R.sea.ships+' · '+R.sea.resc)+row('rail network · military trains · passenger service',R.rail.km+' km · '+R.rail.mil+' · '+pct(R.rail.pass))+row('bus and metro ridership',pct(R.pt.ride)+(R.pt.strike?' · STRIKE':''));
  for(const cn in R.dist)h+='<div style="font-size:10px"><b>'+esc(cn)+'</b>: '+R.dist[cn].map(d=>d[0]+' '+pct(d[1])).join(' · ')+'</div>';return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.NETWORKS=tab;
W.infra={S,rec,daily,tab,NET};
})();
