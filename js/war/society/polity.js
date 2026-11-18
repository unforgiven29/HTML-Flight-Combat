/* =====================================================================================================================
   POLITY — chapter 05 in more depth (spec v49 ch.05): what governments, coalitions and the law do between the big events.
     * GOVERNMENT AT WORK: cabinet ministers with priorities who disagree (policy friction), legislative votes on war
       measures and emergency powers (pass / amend / fail), relocation of government to a reserve seat when the capital
       is threatened (continuity of operations), demonstrations and strikes with their causes, regional government.
     * COALITIONS: national caveats (approvals per mission type), host-nation and basing agreements, intelligence-
       sharing tiers, equipment / language interoperability friction, cost sharing, disagreement and exit risk.
     * REGIONAL INSTITUTIONS: shared grids, rivers, air traffic and fisheries bodies (fictional), obligations, resilience.
     * ARMS CONTROL: agreements (abstract) with obligations, declarations, verification visits, crisis hotlines,
       breakdown and restoration — strategic weapons stay abstract.
     * PRE-WAR QUICK REACTION ALERT: intercepts of unidentified aircraft (identification uncertainty, outcomes).
     * OCCUPATION in five independent dimensions (military control, administration, legal status, recognition,
       population consent), transition phases, services, local representation, policing, property claims, access.
     * CEASEFIRE MONITORING: demilitarized zones, monitors, verification uncertainty, withdrawals, violations, frozen lines.
     * ACCOUNTABILITY around incidents: rules-of-engagement reviews, command responsibility (needs evidence),
       compensation, detainee standards; survivor support; digital identity and privacy rules.
   Abstract and gameplay-level; people and organisations fictional; no methods. Numbers are estimates by rule.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));const bel=p=>W.bell?W.bell(p):!!p.side;const rn=()=>Math.random();const pk=a=>a[Math.floor(rn()*a.length)];const pct=x=>Math.round((x||0)*100)+'%';const r2=x=>Math.round(x*1000)/1000;
const S=()=>{const st=W.st;if(!st.pol2)st.pol2={c:{},coal:{},reg:null,arms:null,occ:{},cfm:{zones:0,mon:0,viol:0,ver:0,wd:0},qra:{n:0,id:0,esc:0},inv:{roe:0,comp:0,det:0,sup:0}};return st.pol2;};
const nm=a3=>W.people&&W.people.name?W.people.name(a3,Math.random):'a minister';
const MIN=[['DEF','Defence','win on the battlefield'],['FIN','Finance','keep the budget and currency stable'],['FOR','Foreign Affairs','keep allies and open talks'],['INT','Interior','public order and the home front'],['HLT','Health','protect hospitals and the wounded'],['IND','Industry','keep factories running']];
const MEAS=['extending martial law','a war budget','extending the call-up age','price controls on fuel and bread','a law on alternative civilian service','emergency powers for the defence council','funding for reconstruction of damaged towns'];
const PROT=[['the cost of living','prices'],['the call-up','conscription'],['power cuts','blackouts'],['corruption in procurement','corruption'],['peace talks','peace'],['support for the troops','solidarity']];
const CAV=['no strikes on the enemy\'s home territory','air defence only','no ground troops','training and logistics only','national approval for each strike mission'];
const TIER=['FULL (shared at source)','RELEASABLE (summaries)','LIMITED (warnings only)'];
const REG=[['Northern Grid Compact','power grid'],['River Basin Commission','shared river'],['Regional Air Traffic Agency','air traffic'],['Fisheries Council','fisheries'],['Cross-Border Rail Union','rail']];
const ARMS=[['Strategic Restraint Treaty','limits on deployed strategic launchers (abstract)'],['Missile Notification Agreement','advance notice of test launches'],['Incidents at Sea Agreement','rules for ships and aircraft near each other'],['Open Skies Arrangement','observation flights']];
const DIM=['military control','administration','legal status','recognition','population consent'];const PH=['COMBAT','STABILISATION','MILITARY ADMINISTRATION','TRANSITIONAL ADMINISTRATION','SETTLED'];
/* ------------------------------------------------------------------ government at work */
function gov(p){const X=S();let G=X.c[p.a3];if(!G){G=X.c[p.a3]={cab:MIN.map(m=>({k:m[0],n:nm(p.a3),pri:m[2],agree:.6+rn()*.3})),votes:[],coop:'CAPITAL',prot:[],fr:0,emerg:0};}return G;}
function govDaily(p,G){const st=W.st,war=bel(p)&&!st.over,sup=p.sup??.6,ex=p.exh||0;
  for(const m of G.cab){m.agree=r2(cl(m.agree+(m.k==='FIN'?-(1-(p.econ??1))*.004:0)+(m.k==='DEF'&&ex>.4?-.003:0)+(m.k==='FOR'&&ex>.5?-.003:0)+.001,.1,1));}
  G.fr=r2(1-G.cab.reduce((t,m)=>t+m.agree,0)/G.cab.length);
  if(G.fr>.45&&rn()<.01){const m=G.cab.reduce((a,b)=>a.agree<b.agree?a:b);W.emit('POLITICS',{e:[p.a3],txt:'Cabinet split in '+p.n+': the minister of '+MIN.find(x=>x[0]===m.k)[1].toLowerCase()+', '+m.n+', argues the priority must be to '+m.pri+'. '+(m.agree<.2?'The minister resigns and is replaced.':'The head of government sides with the majority.')});if(m.agree<.2){m.n=nm(p.a3);m.agree=.6;}}
  if(war&&rn()<.02){const ms=pk(MEAS),r=sup+rn()*.3-.15;const o=r>.6?'PASSED':r>.45?'PASSED WITH AMENDMENTS':'FAILED';G.votes.unshift({t:st.t,ms,o});G.votes.length=Math.min(G.votes.length,5);if(/emergency|martial/.test(ms)&&o!=='FAILED')G.emerg=1;
    W.emit('POLITICS',{e:[p.a3],txt:'The legislature of '+p.n+' votes on '+ms+': '+o.toLowerCase()+'.'+(o==='FAILED'?' The government must find another way.':'')});}
  const cap=Object.entries(st.cities||{}).find(([k,v])=>v.own===p.a3&&v.pop===Math.max(...Object.values(st.cities).filter(x=>x.own===p.a3).map(x=>x.pop)));
  const thr=cap&&st.fronts.some(f=>(f.a===p.a3||f.b===p.a3)&&!f.cf&&f.sec&&f.sec.some(s=>Math.hypot(s.lat-cap[1].lat,s.lon-cap[1].lon)<1.5));
  if(war&&thr&&G.coop==='CAPITAL'){G.coop='RESERVE SEAT';W.emit('POLITICS',{e:[p.a3],txt:'With fighting near the capital, parts of the government of '+p.n+' move to a reserve seat; ministries keep working from backup offices and the legislature meets in a protected hall.'});}
  if(G.coop!=='CAPITAL'&&(!thr||st.over)){G.coop='CAPITAL';W.emit('POLITICS',{e:[p.a3],txt:'The government of '+p.n+' returns to the capital.'});}
  const cause=(1-(p.econ??1))>.2?PROT[0]:ex>.4?PROT[1]:(p.ecn&&p.ecn.energy<.7)?PROT[2]:ex>.6?PROT[4]:PROT[5];
  if(war&&rn()<.01+(1-sup)*.02){G.prot.unshift({t:st.t,c:cause[1],n:Math.round(p.pop*(.0002+rn()*.001))});G.prot.length=Math.min(G.prot.length,4);
    W.emit('SOCIETY',{e:[p.a3],cf:'ESTIMATED',txt:'About '+Math.round(G.prot[0].n/1000)+',000 people demonstrate in '+p.n+' over '+cause[0]+'. '+(G.emerg?'Under emergency rules the march is limited to one square; it passes peacefully.':'Police keep the route open; it ends peacefully.')});}}
/* ------------------------------------------------------------------ coalitions */
function coal(side){const X=S();let C=X.coal[side];if(!C)C=X.coal[side]={cav:{},tier:{},hn:[],cost:{},fric:.1,exit:{}};return C;}
function coalDaily(){const st=W.st;for(const side of['B','R']){const C=coal(side);const M=Object.values(st.c).filter(q=>q.side===side&&(q.al==='CORE'||q.al==='ALLY'));const core=M.find(q=>q.al==='CORE');if(!core)continue;
    for(const q of M){if(q===core)continue;if(!C.cav[q.a3])C.cav[q.a3]=rn()<.5?pk(CAV):'none';if(C.tier[q.a3]==null)C.tier[q.a3]=q.gdp>1e6?0:q.gdp>2e5?1:2;
      C.cost[q.a3]=r2((C.cost[q.a3]||0)+q.gdp*1e-6*(.5+rn()));C.exit[q.a3]=r2(cl((q.exh||0)*.8+(C.cav[q.a3]!=='none'?.05:0)-(q.sup??.6)*.3,0,1));
      if(C.exit[q.a3]>.5&&rn()<.005)W.emit('COALITION',{e:[q.a3,core.a3],txt:q.n+' warns its partners it may leave the coalition unless the burden is shared more fairly; '+core.n+' offers more air defence and a larger share of the costs.'});}
    if(!C.hn.length){const hosts=M.filter(q=>q!==core).slice(0,3);for(const q of hosts){C.hn.push({a3:q.a3,k:pk(['airbase access','port access','overflight and transit','logistics hub'])});}
      if(C.hn.length)W.emit('COALITION',{e:[core.a3],txt:'Host-nation agreements for the '+(side==='B'?'BLUEFOR':'REDFOR')+' coalition: '+C.hn.map(h=>st.c[h.a3].n+' ('+h.k+')').join(', ')+'. Each host keeps a say on how its bases are used.'});}
    C.fric=r2(cl(.05+M.length*.01+Object.values(C.cav).filter(x=>x!=='none').length*.02,0,.4));}}
// coalition friction costs a little combined power (bounded)
{const _m=W.mod;W.mod=function(p){const v=_m.apply(this,arguments);const C=p&&W.st&&W.st.pol2&&W.st.pol2.coal[p.side];return C&&p.al==='ALLY'?v*(1-C.fric*.1):v;};}
/* ------------------------------------------------------------------ regional institutions and arms control */
function regDaily(){const X=S(),st=W.st;if(!X.reg)X.reg=REG.map(r=>({n:r[0],k:r[1],res:.9,st:'WORKING'}));if(!X.arms)X.arms=ARMS.map(a=>({n:a[0],k:a[1],st:'IN FORCE',ver:0,hot:0}));
  const war=st.fronts.some(f=>!f.cf)&&!st.over;for(const r of X.reg){r.res=r2(cl(r.res+(war?-.002:.003),.2,1));const s=r.res<.4?'SUSPENDED':r.res<.7?'STRAINED':'WORKING';if(s!==r.st){r.st=s;W.emit('REGIONAL',{txt:'The '+r.n+' (fictional; '+r.k+') is now '+s.toLowerCase()+(s==='SUSPENDED'?': each country runs its share alone until talks resume.':'.')});}}
  for(const a of X.arms){if(war&&a.st==='IN FORCE'&&rn()<.004){a.st='SUSPENDED';W.emit('ARMS CONTROL',{txt:'The '+a.n+' is suspended by one side; the other keeps its declarations and asks for the hotline to stay open.'});}
    else if(a.st==='SUSPENDED'&&(st.over||!war)&&rn()<.02){a.st='RESTORED';W.emit('ARMS CONTROL',{txt:'The '+a.n+' is restored; inspectors return and data exchanges resume.'});}
    if(a.st!=='SUSPENDED'&&rn()<.01)a.ver++;if(rn()<.005)a.hot++;}}
/* ------------------------------------------------------------------ pre-war quick reaction alert */
function qraDaily(){const st=W.st,Q=S().qra;if(st.t>24*30&&st.fronts.some(f=>!f.cf))return;if(rn()<.15){Q.n++;const r=rn();const o=r<.6?'identified as a reconnaissance aircraft and escorted out of the zone':r<.85?'a civilian aircraft with its transponder off; radio contact made':r<.97?'an unsafe close pass; a protest is lodged':'warning shots near an aircraft that will not answer';if(r>=.6&&r<.85)Q.id++;if(r>=.85)Q.esc++;
  if(Q.n<=3||r>=.85)W.emit('QRA',{txt:'Quick reaction alert: fighters scramble to an unidentified track near the border — '+o+'.'});}}
/* ------------------------------------------------------------------ occupation in five dimensions */
function occDaily(){const st=W.st,O=S().occ;for(const[k,v]of Object.entries(st.cities||{})){if(v.pop<1e5)continue;let o=O[k];
    if(v.h!==v.own){if(!o){o=O[k]={d:[1,.2,0,0,.1],ph:0,svc:.4,rep:0,pol:.3,cl:0,acc:0,t:st.t};}
      // military control is immediate; the other dimensions move slowly and independently
      o.ph=Math.min(3,o.ph+(rn()<.03?1:0));o.d[1]=r2(cl(o.d[1]+.01,0,1));o.d[2]=0;o.d[3]=r2(cl(o.d[3]+(rn()<.01?.1:0),0,.3));o.d[4]=r2(cl(o.d[4]+(o.svc-.5)*.005-.001,0,1));
      o.svc=r2(cl(o.svc+.004,0,.9));o.rep=Math.min(5,o.rep+(rn()<.02?1:0));o.pol=r2(cl(o.pol+.005,0,1));o.cl+=Math.round(v.pop*1e-5*rn());o.acc=o.acc||(rn()<.02?1:0);}
    else if(o){o.ph=4;o.d=[1,1,1,1,r2(cl(o.d[4]+.3,0,1))];}}
  const K=Object.keys(O);if(K.length>40)for(const k of K.slice(0,K.length-40))delete O[k];}
/* ------------------------------------------------------------------ ceasefire monitoring and accountability */
function cfDaily(){const st=W.st,M=S().cfm,I=S().inv;const cf=st.fronts.filter(f=>f.cf);M.zones=cf.length;M.mon=cf.length*(20+((st.t/24)|0)%10);
  if(cf.length){if(rn()<.05){M.viol++;M.ver+=rn()<.6?1:0;}if(rn()<.03)M.wd++;}
  // accountability around incidents: reviews, compensation, detainee visits, survivor support
  const ev=(st.ev||[]).slice(0,20);if(ev.some(e=>/COLLATERAL|CIVILIAN|AIRLINER|FRIENDLY/.test(e.ty||''))&&rn()<.2){I.roe++;if(rn()<.5){I.comp++;W.emit('JUSTICE',{txt:'A rules-of-engagement review into a recent incident finds procedures were not followed; compensation is offered to the families affected and the findings are published. Command responsibility is assessed only on evidence.'});}}
  if(rn()<.02)I.det++;if(rn()<.02)I.sup++;}
/* ------------------------------------------------------------------ daily */
function daily(){const st=W.st;if(!st)return;try{for(const p of Object.values(st.c)){if(!p.pop||!(bel(p)||p.pop>5e7))continue;govDaily(p,gov(p));}coalDaily();regDaily();qraDaily();occDaily();cfDaily();}catch(e){console.warn('[polity]',e);}}
W.daily.push(daily);
/* ------------------------------------------------------------------ STATE tab */
const row=(a,b)=>'<div style="display:flex;justify-content:space-between;gap:8px"><span>'+a+'</span><b>'+b+'</b></div>';
function tab(p){const st=W.st;if(!st)return'<div>No war running.</div>';const G=gov(p),X=S();let h='<div style="color:#8a9a92;font-size:10px">Fictional people and organisations; abstract rules. Privacy: individuals in these records are fictional; no real personal data is stored or shared.</div>';
  h+='<h4>CABINET</h4>'+G.cab.map(m=>row(MIN.find(x=>x[0]===m.k)[1]+' — '+esc(m.n),'agrees '+pct(m.agree)+' · priority: '+m.pri)).join('')+row('policy friction',pct(G.fr))+row('seat of government',G.coop.toLowerCase()+(G.emerg?' · emergency powers':''));
  h+='<h4>LEGISLATURE</h4>'+(G.votes.map(v=>row('day '+Math.floor(v.t/24)+': '+v.ms,v.o.toLowerCase())).join('')||'<div>no war measures voted yet</div>');
  h+='<h4>DEMONSTRATIONS AND STRIKES</h4>'+(G.prot.map(x=>row('day '+Math.floor(x.t/24)+': over '+x.c,'~'+Math.round(x.n/1000)+',000')).join('')||'<div>none</div>');
  const C=p.side&&X.coal[p.side];if(C){h+='<h4>COALITION ('+(p.side==='B'?'BLUEFOR':'REDFOR')+')</h4>'+row('interoperability friction',pct(C.fric))+Object.keys(C.cav).map(a=>row(esc(st.c[a].n),'caveat: '+C.cav[a]+' · intel '+TIER[C.tier[a]].split(' ')[0].toLowerCase()+' · cost '+C.cost[a].toFixed(1)+' · exit risk '+pct(C.exit[a]))).join('')+(C.hn.length?'<div style="font-size:10px">Host nations: '+C.hn.map(x=>esc(st.c[x.a3].n)+' ('+x.k+')').join(', ')+'</div>':'');}
  h+='<h4>REGIONAL INSTITUTIONS</h4>'+(X.reg||[]).map(r=>row(r.n+' ('+r.k+')',r.st.toLowerCase()+' · resilience '+pct(r.res))).join('');
  h+='<h4>ARMS CONTROL (ABSTRACT)</h4>'+(X.arms||[]).map(a=>row(a.n+' — '+a.k,a.st.toLowerCase()+' · '+a.ver+' verification visits · '+a.hot+' hotline calls')).join('');
  h+='<h4>QUICK REACTION ALERT (BEFORE THE WAR)</h4>'+row('scrambles · civilian aircraft identified · escalations',X.qra.n+' · '+X.qra.id+' · '+X.qra.esc);
  const occ=Object.entries(X.occ).filter(([k])=>k.endsWith('|'+p.a3)).slice(0,6);h+='<h4>OCCUPIED OR RETURNED CITIES</h4>'+(occ.map(([k,o])=>'<div><b>'+esc(k.split('|')[0])+'</b> · '+PH[o.ph].toLowerCase()+'</div>'+row(DIM.map((d,i)=>d+' '+pct(o.d[i])).join(' · '),'')+row('services · local representatives · policing',pct(o.svc)+' · '+o.rep+' · '+pct(o.pol))+row('property claims · observer access',o.cl+' · '+(o.acc?'granted':'requested'))).join('')||'<div>none</div>');
  const M=X.cfm,I=X.inv;h+='<h4>CEASEFIRE MONITORING</h4>'+row('ceasefire lines · monitors',M.zones+' · '+M.mon)+row('violations reported · verified · withdrawals',M.viol+' · '+M.ver+' · '+M.wd);
  h+='<h4>ACCOUNTABILITY</h4>'+row('ROE reviews · compensation · detainee visits · survivor support',I.roe+' · '+I.comp+' · '+I.det+' · '+I.sup);return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.STATE=tab;
W.polity={S,gov,coal,daily,tab,DIM,PH};
})();
