/* =====================================================================================================================
   ECON2 — chapter 10 in more depth (spec v49 ch.10): the economy below the national indices of economy.js / life.js.
     * SECTORS AND ENTERPRISES: eight sectors with output indices; a registry of fictional enterprises (state-owned,
       private, cooperative) with a lifecycle (founded → growing → stable → distressed → bankrupt / merged / rebuilt).
       Small businesses and the informal economy as counts and shares.
     * MONEY: a central bank (policy rate, inflation target, reserves, exchange rate), commercial banks (credit,
       bad loans, deposit runs), insurers (claims, war-risk exclusions, reinsurance), public finance (taxes, spending,
       deficit, debt, statistics release), development aid programmes (pledged → disbursed → audited).
     * RESOURCES AND ENERGY: deposits (oil, gas, coal, iron, copper, lithium, rare earths) with production and
       depletion; refineries with capacity and condition; a power portfolio (coal, gas, nuclear, hydro, wind, solar),
       grid load and outages; oil trade (imports, exports, sanctions, price); energy policy and rationing.
     * INDUSTRY AND KNOWLEDGE: construction firms and their projects, recycling of rubble and scrap, research
       programmes (basic → applied → prototype → production, can fail), standards and certification, tourism.
     * SHOCKS: a shock (port, energy, health supply, workforce) propagates along stated chains with buffers and limits;
       each step is an event so the causal chain can be read.
   Aggregate; indices 1 = prewar; ESTIMATES by rule. Names of enterprises and people are fictional.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));const bel=p=>W.bell?W.bell(p):!!p.side;const rn=()=>Math.random();const pk=a=>a[Math.floor(rn()*a.length)];const pct=x=>Math.round((x||0)*100)+'%';const r3=x=>Math.round(x*1000)/1000;
const S=()=>{const st=W.st;if(!st.ec2)st.ec2={c:{},oil:{px:80,hist:[]},seq:1};return st.ec2;};
const SEC=['agriculture','mining','energy','manufacturing','construction','trade and transport','services','tourism'];
const ENT=['Steelworks','Rail Freight','Power Company','Grain Cooperative','Shipyard','Telecom','Bank','Chemical Works','Machine Plant','Construction Group','Pharmaceuticals','Retail Chain'];
const PFX=['National','United','Northern','Central','Eastern','Western','Riverside','Highland'];
const LIFE=['FOUNDED','GROWING','STABLE','DISTRESSED','BANKRUPT','MERGED','REBUILT'];
const DEP=[['oil',1],['gas',1],['coal',1],['iron ore',1],['copper',.6],['lithium',.4],['rare earths',.3]];
const PWR=['coal','gas','nuclear','hydro','wind','solar'];
const RD=['BASIC','APPLIED','PROTOTYPE','TESTING','PRODUCTION','FAILED'];const RDK=['drone autonomy','battery chemistry','air-defence radar','armour materials','field medicine','grid resilience','satellite links','crop varieties'];
const CHAIN={PORT:['port closure','fewer imports of parts','assembly lines slow','vehicle deliveries late'],ENERGY:['power-plant damage','rolling blackouts','factories cut shifts','household heating rationed'],
  HEALTH:['medicine import delay','hospital stocks fall','elective surgery postponed','aid airlift requested'],WORK:['call-up of skilled workers','vacancies in plants','overtime and retraining','output recovers partly']};
/* ------------------------------------------------------------------ record */
function rec(p){const X=S();let R=X.c[p.a3];if(R)return R;const g=p.gdp,t=cl(Math.log10(Math.max(1e3,g*1e6/Math.max(1,p.pop)))/5,0,1);
  const res=(window.WWAR&&p.ecn&&p.ecn.out)||.5;const rr=(a3,k)=>((a3.charCodeAt(0)*7+a3.charCodeAt(2)*13+k*31)%100)/100;
  R=X.c[p.a3]={sec:Object.fromEntries(SEC.map(s=>[s,1])),ent:[],sme:{n:Math.round(p.pop/40),cl:0,inf:.15+.25*(1-t)},
    cb:{rate:.03+.05*(1-t),tgt:.02+.02*(1-t),res:Math.round(g*.15/1e3),fx:1,infl:.03},bank:{cred:1,npl:.03,run:0},ins:{claims:0,excl:0,re:1},
    fis:{tax:.25+.1*t,sp:.3+.1*t,def:.03,debt:.4+.5*t,stat:0},aid:[],
    dep:DEP.filter((d,i)=>rr(p.a3,i)<d[1]*(.4+res*.5)).map(d=>({k:d[0],res:Math.round(50+rr(p.a3,3)*500),out:1,inv:0})),
    ref:{cap:Math.round(g/2e3),cond:1},pwr:Object.fromEntries(PWR.map((k,i)=>[k,[.3,.25,.1,.15,.1,.1][i]*(.6+rr(p.a3,i+5)*.8)])),grid:{load:.8,out:0},oil:{imp:0,exp:0},rat:0,
    con:{firms:Math.max(3,Math.round(g/5e4)),proj:0,done:0},rec:{rubble:0,recov:0},rd:[],std:{cert:0,rej:0},tour:{arr:1,season:1},rural:{gap:.3-.15*t,inv:.5},shock:[]};
  const ps=Object.values(R.pwr).reduce((a,b)=>a+b,0);for(const k in R.pwr)R.pwr[k]=r3(R.pwr[k]/ps);
  for(let i=0;i<5;i++)R.ent.push(firm(p));return R;}
function firm(p){return{n:pk(PFX)+' '+pk(ENT),own:pk(['state-owned','private','cooperative','listed']),st:0,h:.7+rn()*.25,emp:Math.round(500+rn()*20000)};}
/* ------------------------------------------------------------------ daily */
function step(p,R){const st=W.st,war=bel(p)&&!st.over,e=p.ecn||{energy:1,trans:1,ind:1,food:1,infra:1,fuel:60},L=p.life||{};
  // sectors follow the national indices
  const S0=R.sec;S0.energy=r3(e.energy);S0.manufacturing=r3((e.ind+e.energy)/2);S0['trade and transport']=r3(e.trans);S0.agriculture=r3(e.food);S0.construction=r3(cl(S0.construction+(war?-.001:.002)+(1-e.infra)*.003,.5,1.6));
  S0.services=r3(cl((p.econ??1)*(.9+.1*e.energy),.3,1.2));S0.mining=r3(cl(S0.mining+(war?-.0005:.0005),.5,1.2));S0.tourism=r3(cl(S0.tourism+(war?-.01:.004),.05,1.1));R.tour.arr=S0.tourism;
  // enterprises
  for(const f of R.ent){if(f.st>=4)continue;f.h=r3(cl(f.h+((p.econ??1)-.85)*.01+(rn()-.5)*.01,0,1));const ns=f.h>.8?(f.st===0?1:2):f.h>.5?2:f.h>.25?3:4;
    if(ns===4&&f.st!==4){f.st=rn()<.5?4:5;W.emit('BUSINESS',{e:[p.a3],txt:f.n+' ('+f.own+', fictional) '+(f.st===4?'files for bankruptcy; '+Math.round(f.emp/1000*10)/10+' thousand jobs at risk, a court-appointed administrator keeps essential lines running':'is merged into a larger company to save its plants')+'.'});}
    else f.st=ns;}
  if(R.ent.filter(f=>f.st<4).length<4&&rn()<.05)R.ent.push(firm(p));R.ent=R.ent.slice(-7);
  R.sme.cl+=war?Math.round(R.sme.n*.0004*rn()):0;R.sme.inf=r3(cl(R.sme.inf+(war?.0004:-.0002),.05,.6));
  // central bank, banks, insurers, public finance
  const C=R.cb;C.infl=r3(cl(C.infl+((L.fin&&L.fin.infl)||C.infl-.0)*.0+(war?.0003:-.0002)+(1-e.energy)*.0004,-.01,.6));if((st.t/24|0)%30===0){const old=C.rate;C.rate=r3(cl(C.rate+(C.infl-C.tgt)*.25,0,.4));if(Math.abs(C.rate-old)>.004)W.emit('FINANCE',{e:[p.a3],txt:'The central bank of '+p.n+' '+(C.rate>old?'raises':'cuts')+' its policy rate to '+(C.rate*100).toFixed(1)+' % (inflation '+(C.infl*100).toFixed(1)+' %).'});}
  C.fx=r3(cl(C.fx*(1-(war?.0004:0)-(C.infl-C.tgt)*.001),.2,1.3));C.res=Math.max(0,Math.round(C.res*(war?.999:1.0005)));
  const B=R.bank;B.npl=r3(cl(B.npl+(war?.0004:-.0002)+R.sme.cl*1e-8,.01,.4));B.cred=r3(cl(B.cred-(B.npl-.05)*.002,.4,1.2));if(B.npl>.15&&!B.run&&rn()<.01){B.run=1;W.emit('FINANCE',{e:[p.a3],txt:'Depositors queue at banks in '+p.n+'; the central bank guarantees deposits and lends to the banks against collateral. The run stops within days.'});}
  const I=R.ins;if(war){I.claims+=Math.round(rn()*50);I.excl+=rn()<.3?1:0;}I.re=r3(cl(I.re-(war?.0005:-.001),.4,1));
  const F=R.fis;F.sp=r3(cl(F.sp+(war?.0004:-.0002),.2,.7));F.tax=r3(cl(F.tax*(.9998+.0002*(p.econ??1)),.15,.5));F.def=r3(F.sp-F.tax);F.debt=r3(cl(F.debt+F.def/365,0,3));if((st.t/24|0)%30===0)F.stat++;
  // aid programmes
  if(war&&R.aid.length<3&&rn()<.01){const q=Object.values(st.c).find(x=>x.side===p.side&&x!==p&&x.gdp>p.gdp)||Object.values(st.c).find(x=>!x.side&&x.gdp>1e6);if(q)R.aid.push({d:q.a3,k:pk(['budget support','reconstruction','humanitarian','energy equipment']),amt:Math.round(p.gdp*.01/1e3),st:'PLEDGED'});}
  for(const a of R.aid){if(a.st==='PLEDGED'&&rn()<.05)a.st='DISBURSED';else if(a.st==='DISBURSED'&&rn()<.02){a.st='AUDITED';W.emit('AID',{e:[p.a3,a.d],txt:st.c[a.d].n+'\'s '+a.k+' programme in '+p.n+' passes an audit: about '+a.amt+' bn reached its purpose; a small share is under review.'});}}
  // resources, refining, power, oil
  for(const d of R.dep){d.out=r3(cl(d.out*(war?.9995:1)*(.98+e.infra*.02),.2,1.2));d.res=Math.max(0,d.res-d.out*.01);if(war&&d.k==='oil'&&rn()<.002)W.emit('ENERGY',{e:[p.a3],txt:'Oil fields in '+p.n+' cut output after a strike on a pumping station; crews repair it within a week.'});}
  R.ref.cond=r3(cl(R.ref.cond+(war?-(1-e.infra)*.004:.003)+.001,.1,1));R.grid.load=r3(cl(.75+(1-e.energy)*.3,.5,1.2));R.grid.out=r3(cl(1-e.energy,0,1));
  if(R.grid.out>.2&&!R.rat){R.rat=1;W.emit('ENERGY',{e:[p.a3],txt:p.n+' introduces energy rationing: rolling blackouts by district on a published schedule; hospitals, water and defence plants exempt.'});}if(R.rat&&R.grid.out<.08){R.rat=0;}
  const oilD=R.dep.find(d=>d.k==='oil');const need=p.gdp/1e4;R.oil.exp=r3(oilD?oilD.out*oilD.res/50:0);R.oil.imp=r3(Math.max(0,need-R.oil.exp));
  // construction, recycling, R&D, standards, rural
  const K=R.con;if(war&&(1-e.infra)>.05)K.proj+=rn()<.2?1:0;if(K.proj>0&&rn()<.1){K.proj--;K.done++;}R.rec.rubble+=Math.round((1-e.infra)*1000*(war?1:0));const rc=Math.round(R.rec.rubble*.01);R.rec.rubble-=rc;R.rec.recov+=rc;
  if(R.rd.length<3&&p.gdp>2e5&&rn()<.01)R.rd.push({k:pk(RDK),s:0});for(const r of R.rd){if(r.s>=4)continue;if(rn()<.01){if(rn()<.12){r.s=5;}else{r.s++;if(r.s===4)W.emit('RESEARCH',{e:[p.a3],txt:'A research programme on '+r.k+' in '+p.n+' reaches production; the first units go to the forces and a civilian version is licensed.'});}}}
  if(rn()<.1){R.std.cert++;if(rn()<.08)R.std.rej++;}R.rural.gap=r3(cl(R.rural.gap+(war?.0002:-.0001),.05,.6));
  // shocks: each step of a chain is an event a few days apart, with buffers that can stop it
  if(war&&!R.shock.length&&rn()<.004){const k=pk(Object.keys(CHAIN));R.shock.push({k,i:0,t:st.t});}
  for(const s of R.shock){if(st.t-s.t<24*3)continue;s.t=st.t;if(rn()<.25){W.emit('ECONOMY',{e:[p.a3],txt:'In '+p.n+', reserves and substitution stop the '+CHAIN[s.k][0]+' chain at "'+CHAIN[s.k][s.i]+'".'});s.i=9;continue;}
    W.emit('ECONOMY',{e:[p.a3],cf:'ESTIMATED',txt:'Chain of effects in '+p.n+': '+CHAIN[s.k].slice(0,s.i+1).join(' → ')+'.'});s.i++;}
  R.shock=R.shock.filter(s=>s.i<CHAIN[s.k].length);}
function oilMarket(){const X=S(),st=W.st;const war=st.fronts.some(f=>!f.cf)&&!st.over;const sanc=(st.trade&&st.trade.sanc)||0;X.oil.px=Math.round(cl(X.oil.px+(war?.15:-.1)+(rn()-.5)*2+sanc*.1,40,180));
  if((st.t/24|0)%7===0){X.oil.hist.push(X.oil.px);if(X.oil.hist.length>26)X.oil.hist.shift();}}
function daily(){const st=W.st;if(!st)return;try{oilMarket();for(const p of Object.values(st.c)){if(!p.pop||!(bel(p)||p.gdp>1e6))continue;step(p,rec(p));}}catch(e){console.warn('[econ2]',e);}}
W.daily.push(daily);
/* ------------------------------------------------------------------ MARKETS tab */
const row=(a,b)=>'<div style="display:flex;justify-content:space-between;gap:8px"><span>'+a+'</span><b>'+b+'</b></div>';
function tab(p){const st=W.st;if(!st)return'<div>No war running.</div>';if(!(bel(p)||p.gdp>1e6))return'<div>Detailed accounts are kept for countries at war and large economies.</div>';const R=rec(p),X=S();
  let h='<div style="color:#8a9a92;font-size:10px">Indices (1 = prewar) and estimates by rule; enterprises fictional. Physical and financial flows are kept apart.</div>';
  h+='<h4>SECTORS</h4>'+SEC.map(s=>row(s,R.sec[s].toFixed(2))).join('');
  h+='<h4>ENTERPRISES</h4>'+R.ent.map(f=>row(esc(f.n)+' ('+f.own+')',LIFE[f.st].toLowerCase()+' · health '+pct(f.h)+' · '+f.emp+' staff')).join('')+row('small businesses · closed · informal share',R.sme.n+' · '+R.sme.cl+' · '+pct(R.sme.inf));
  const C=R.cb,B=R.bank,F=R.fis;h+='<h4>MONEY AND PUBLIC FINANCE</h4>'+row('policy rate · inflation · target',(C.rate*100).toFixed(1)+'% · '+(C.infl*100).toFixed(1)+'% · '+(C.tgt*100).toFixed(1)+'%')+row('exchange rate · reserves',C.fx.toFixed(2)+' · '+C.res+' bn')+
    row('bank credit · bad loans',B.cred.toFixed(2)+' · '+pct(B.npl))+row('insurance claims · war-risk exclusions · reinsurance',R.ins.claims+' · '+R.ins.excl+' · '+pct(R.ins.re))+row('taxes · spending · deficit · debt (of GDP)',pct(F.tax)+' · '+pct(F.sp)+' · '+pct(F.def)+' · '+pct(F.debt))+row('statistics releases',F.stat);
  h+='<h4>AID PROGRAMMES</h4>'+(R.aid.map(a=>row(esc(st.c[a.d].n)+' — '+a.k,a.amt+' bn · '+a.st.toLowerCase())).join('')||'<div>none</div>');
  h+='<h4>RESOURCES AND ENERGY</h4>'+(R.dep.map(d=>row(d.k,'output '+d.out.toFixed(2)+' · reserves '+Math.round(d.res))).join('')||'<div>no major deposits</div>')+row('refining capacity · condition',R.ref.cap+' kb/d · '+pct(R.ref.cond))+
    '<div style="font-size:10px">Power mix: '+PWR.map(k=>k+' '+pct(R.pwr[k])).join(' · ')+'</div>'+row('grid load · outage',pct(R.grid.load)+' · '+pct(R.grid.out)+(R.rat?' · RATIONING':''))+row('oil exports · imports · world price',R.oil.exp+' · '+R.oil.imp+' · $'+X.oil.px);
  h+='<h4>INDUSTRY, KNOWLEDGE, VISITORS</h4>'+row('construction firms · projects · done',R.con.firms+' · '+R.con.proj+' · '+R.con.done)+row('rubble (kt) · recovered for reuse',R.rec.rubble+' · '+R.rec.recov)+
    R.rd.map(r=>row('research: '+r.k,RD[r.s].toLowerCase())).join('')+row('certifications · rejected',R.std.cert+' · '+R.std.rej)+row('tourism arrivals',pct(R.tour.arr))+row('rural-urban gap',pct(R.rural.gap));
  if(R.shock.length)h+='<h4>SHOCK IN PROGRESS</h4>'+R.shock.map(s=>'<div>'+CHAIN[s.k].slice(0,s.i+1).join(' → ')+'</div>').join('');return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.MARKETS=tab;
W.econ2={S,rec,daily,tab,CHAIN};
})();
