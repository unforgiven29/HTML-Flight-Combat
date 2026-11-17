/* =====================================================================================================================
   v330 — world war, step 3: alignment changes, diplomacy, ceasefires, the end of the war and after it.
   Spec v49 ch.05 ("Neutral countries, diplomatic pressure", "Negotiations and diplomacy that can actually end the war",
   "War termination, ceasefires, surrender, armistices, frozen conflicts") and ch.14 ("End-of-war outcomes": war status
   separate from victory, an outcome report that counts the cost, postwar continuation).
   Runs once per war day (WWAR.daily). Every rule reads the war state, never a nationality; every change is an event
   with its reason. Gameplay-level rules; the probabilities are documented constants (R below).
   * Neutrals: fighting within 300 km makes a country DEBATE (undecided). Countries with an existing partnership (LEAN,
     a documented scenario table) may then support (partner) and later enter (ally) that side. Others act only after
     repeated border incidents on their own territory, against the side blamed (attribution reported, not verified).
     Constitutionally neutral states never join. A principal power that capitulates leaves; its allies decide for themselves.
   * Allies may leave: exhaustion over 60 % and their own cities lost -> a separate settlement; their fronts go quiet.
   * Local ceasefires on fronts that have stalled for 3 days between exhausted countries; they can be renewed, lapse or
     be violated. General ceasefire proposals from the side with less leverage once a principal power is 35 % exhausted;
     the other side accepts only if it is tired too and neither side holds a clear advantage, and says why it refuses.
     Fourteen quiet days of general ceasefire -> armistice. A principal power at 85 % exhaustion capitulates.
     A year in, with the lines unmoved for 60 days, the war freezes.
   * The end: a report of what the war cost and where the lines stand (labelled estimates), then CONTINUE POSTWAR
     (lines frozen, the clock runs) or a new war.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.WGEO)return;
const W=WWAR,G=WGEO,D=Math.PI/180;
const R={debate:1,support:3,enter:6,pSupport:.15,pEnter:.08,settleExh:.6,pSettle:.05,localStall:3,localExh:.25,pLocal:.1,localHours:72,pRenew:.5,pViolLocal:.05,
  proposeExh:.35,proposeEvery:5,acceptExh:.3,acceptLev:3,quietDays:14,pViolGen:.03,capitExh:.85,frozenDay:365,frozenQuiet:60};
const side=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY')?p.side:null;
const other=s=>s==='B'?'R':'B',sName=s=>s==='B'?'BLUEFOR':'REDFOR';
const day=()=>Math.floor(W.st.t/24);
const D_=()=>W.st.dip||(W.st.dip={cease:null,lastProp:-99,quiet:0,moved:{},lastMove:{}});

/* ------------------------------------------------------------------ neutral countries
   Scenario input (spec ch.05: "alignment is a scenario input"), documented, editable here only:
   LEAN: countries with existing partnership agreements with one side; they may support or join that side when fighting
   reaches their region, and never join against it. NEUTRAL_ALWAYS: constitutional or long-standing neutrality.
   Everyone else stays out unless fighting spills onto its own territory (border incidents), and then turns against the
   side blamed for them (attribution reported, not verified). */
const LEAN={B:['UKR','MDA','GEO','ISR','TWN','SGP'],R:['IRN','VEN','CUB','NIC']};
const NEUTRAL_ALWAYS=['IRL','AUT','CHE','MLT','LIE','VAT'];
const leanOf=a3=>LEAN.B.includes(a3)?'B':LEAN.R.includes(a3)?'R':null;
// fighting near a neutral: advanced sectors within 300 km of its label point, per advancing side
function pressure(n){const st=W.st,c=G.byA3.get(n.a3);if(!c)return{B:0,R:0};const out={B:0,R:0};
  for(const f of st.fronts){if(f.cf)continue;for(const s of f.sec){if(Math.abs(s.off)<20)continue;const adv=s.off>0?f.a:f.b,sd=side(st.c[adv]);if(!sd)continue;
    const p=W.linePt(s);if(G.dist(c.ly,c.lx,p.lat,p.lon)<300e3)out[sd]+=.5;}}
  return out;}
function neutrals(){const st=W.st;
  for(const p of Object.values(st.c)){if(!['NEUTRAL','UNDECIDED','PARTNER'].includes(p.al)||p.cap||NEUTRAL_ALWAYS.includes(p.a3))continue;if(p.al==='PARTNER'&&!p.pr&&W.SCEN[p.side]&&W.SCEN[p.side].PARTNER.includes(p.a3))continue;
    const pr=pressure(p),near=pr.B+pr.R;if(near<R.debate)continue;
    if(p.al==='NEUTRAL'){p.al='UNDECIDED';p.hist.push([st.t,'UNDECIDED',null,'fighting near its borders']);W.emit('ALIGN',{e:[p.a3],txt:p.n+' debates its position as fighting nears its borders.'});continue;}
    // border incidents: the side fighting nearer causes them more often
    p.inc=p.inc||{B:0,R:0};for(const sd of['B','R'])if(pr[sd]>0&&Math.random()<.02*pr[sd]){p.inc[sd]++;
      W.emit('INCIDENT',{e:[p.a3],cf:'REPORTED',txt:'Border incident: '+p.n+' reports shells and debris falling on its territory from fighting nearby, and blames '+(sd==='B'?'BLUEFOR':'REDFOR')+'. The other side disputes it.'});}
    const lean=leanOf(p.a3),against=p.inc.B>p.inc.R?'B':p.inc.R>p.inc.B?'R':null;
    const join=lean&&near>=R.support?lean:(against&&p.inc[against]>=2?other(against):null);if(!join||(lean&&join!==lean))continue;
    const why=lean===join?'existing partnership with '+sName(join)+' as the war reaches its region':'repeated incidents on its territory blamed on '+sName(against);
    if(p.al==='UNDECIDED'&&Math.random()<R.pSupport){p.pr=1;W.setAl(p,'PARTNER',join,why);}
    else if(p.al==='PARTNER'&&p.side===join&&(near>=R.enter||(against&&p.inc[against]>=4))&&Math.random()<R.pEnter){p.pr=1;W.setAl(p,'ALLY',join,why);W.rebuild();}}}
/* ------------------------------------------------------------------ allies leaving */
function settlements(){const st=W.st;
  for(const p of Object.values(st.c)){if(p.al!=='ALLY'||p.exh<R.settleExh)continue;const lost=Object.values(st.cities).filter(v=>v.own===p.a3&&v.h!==p.a3).length;if(!lost||Math.random()>=R.pSettle)continue;
    const was=p.side;W.setAl(p,'NEUTRAL',null,'separate settlement: exhausted ('+Math.round(p.exh*100)+' %) with '+lost+' of its cities held by the enemy');
    for(const f of st.fronts)if(f.a===p.a3||f.b===p.a3)f.cf={kind:'SETTLEMENT',t:st.t};
    W.emit('DIPLO',{e:[p.a3],txt:p.n+' leaves '+sName(was)+'. Its fronts fall quiet; the lines stay where they are.'});}}
/* ------------------------------------------------------------------ ceasefires */
function fronts(){const st=W.st,d=D_();
  for(const f of st.fronts){const sum=f.sec.reduce((t,s)=>t+s.off,0),was=d.moved[f.id];d.moved[f.id]=sum;if(was==null||Math.abs(sum-was)>2*f.sec.length)d.lastMove[f.id]=day();
    if(f.cf&&f.cf.kind==='LOCAL'){
      if(Math.random()<R.pViolLocal){f.cf=null;W.emit('CEASEFIRE',{e:[f.a,f.b],cf:'REPORTED',txt:'Local ceasefire on the '+st.c[f.a].n+' / '+st.c[f.b].n+' front violated; each side blames the other. Fighting resumes.'});continue;}
      if(st.t>=f.cf.until){if(Math.random()<R.pRenew){f.cf.until=st.t+R.localHours;W.emit('CEASEFIRE',{e:[f.a,f.b],txt:'Local ceasefire on the '+st.c[f.a].n+' / '+st.c[f.b].n+' front renewed for three days.'});}
        else{f.cf=null;W.emit('CEASEFIRE',{e:[f.a,f.b],txt:'Local ceasefire on the '+st.c[f.a].n+' / '+st.c[f.b].n+' front lapses.'});}}continue;}
    if(f.cf)continue;const A=st.c[f.a],B=st.c[f.b];
    if(day()-(d.lastMove[f.id]??day())>=R.localStall&&A.exh>R.localExh&&B.exh>R.localExh&&Math.random()<R.pLocal){f.cf={kind:'LOCAL',t:st.t,until:st.t+R.localHours};
      W.emit('CEASEFIRE',{e:[f.a,f.b],txt:'Local ceasefire agreed on the stalled '+A.n+' / '+B.n+' front for three days: wounded evacuated, the dead recovered.'});}}}
/* ------------------------------------------------------------------ the general ceasefire and the end */
const cores=s=>Object.values(W.st.c).filter(p=>p.al==='CORE'&&p.side===s);
function leverage(s){const st=W.st;let L=0;for(const v of Object.values(st.cities)){if(v.h===v.own)continue;const h=side(st.c[v.h]),o=side(st.c[v.own]);if(h===s)L++;if(o===s)L--;}
  let sup=0;for(const th of st.th)sup+=th.sup;sup/=Math.max(1,st.th.length);L+=(s==='B'?sup:-sup)*3;const C=cores(s);L-=5*C.reduce((t,p)=>t+p.exh,0)/Math.max(1,C.length);return L;}
function general(){const st=W.st,d=D_();
  if(d.cease){if(Math.random()<R.pViolGen){d.cease=null;for(const f of st.fronts)if(f.cf&&f.cf.kind==='GENERAL')f.cf=null;W.emit('CEASEFIRE',{cf:'REPORTED',txt:'The general ceasefire collapses after an attack each side attributes to the other. The war resumes on every front.'});return;}
    d.quiet++;if(d.quiet>=R.quietDays){if(W.nations&&W.nations.settle())return;end('ARMISTICE','Fourteen days without a major violation: an armistice is signed. The lines become the armistice lines; no peace treaty has been agreed.');}return;}
  // a principal power at the end of its strength capitulates; its allies may fight on; the war ends when a side has no principal power left
  for(const s of['B','R'])for(const p of cores(s))if(p.exh>=R.capitExh){p.cap=1;W.setAl(p,'NEUTRAL',null,'capitulation: forces exhausted ('+Math.round(p.exh*100)+' %)');
    for(const f of st.fronts)if(f.a===p.a3||f.b===p.a3)f.cf={kind:'END',t:st.t};W.emit('END',{e:[p.a3],txt:p.n+' capitulates. Its fronts fall silent where the lines stand; its allies decide for themselves whether to fight on.'});
    if(!cores(s).length){end('CAPITULATION','With '+p.n+' gone, '+sName(s)+' has no principal power left and asks for terms. The war ends.',p.a3);return;}}
  if(day()>=R.frozenDay&&st.fronts.every(f=>day()-(d.lastMove[f.id]??0)>=R.frozenQuiet)){end('FROZEN','The lines have not moved for two months. Neither side can advance or will concede: the conflict freezes without an agreement.');return;}
  const maxExh=Math.max(...['B','R'].flatMap(s=>cores(s).map(p=>p.exh)),0);if(maxExh<R.proposeExh||day()-d.lastProp<(d.gap||R.proposeEvery))return;d.lastProp=day();
  const LB=leverage('B'),LR=leverage('R'),prop=LB<LR?'B':'R',acc=other(prop),accExh=Math.max(...cores(acc).map(p=>p.exh),0),gap=Math.abs(LB-LR);
  W.emit('DIPLO',{txt:sName(prop)+' proposes a general ceasefire on the current lines, with prisoner exchanges and neutral observers.'});
  const prag=W.pragK?cores(acc).reduce((t,q)=>t+W.pragK(q),0)/Math.max(1,cores(acc).length):1;   // leaders.js: pragmatic governments accept sooner
  if(accExh>=R.acceptExh*prag&&gap<R.acceptLev){d.cease={t:st.t};d.quiet=0;for(const f of st.fronts)if(!f.cf)f.cf={kind:'GENERAL',t:st.t};
    W.emit('CEASEFIRE',{txt:sName(acc)+' accepts. A general ceasefire holds on every front from '+W.date(st.t)+'; neutral observers deploy, prisoner exchanges begin.'});}
  else{d.gap=Math.min(60,(d.gap||R.proposeEvery)*2);   /* no identical proposal every few days: the wait doubles after each refusal */
    W.emit('DIPLO',{txt:sName(acc)+' rejects the proposal: '+(accExh<R.acceptExh?'it believes it can still fight on':'it holds the advantage and will not accept the current lines')+'.'});}}
function end(kind,txt,by){const st=W.st;if(st.over)return;st.over={kind,t:st.t,txt,by:by||null};for(const f of st.fronts)f.cf=f.cf||{kind:'END',t:st.t};W.run=false;
  W.emit('END',{txt:txt});st.report=W.diplo.report();}   /* through W.diplo so nations.js can add the home front */
/* ------------------------------------------------------------------ the report (ch.14: the cost, not a scoreboard) */
function report(){const st=W.st,P=Object.values(st.c),S=s=>P.filter(p=>(p.side===s||p.hist.some(x=>x[2]===s&&(x[1]==='CORE'||x[1]==='ALLY')))&&(p.lostAir>0||p.lostGnd>0));   // everyone who fought for the side, including those who left
  const sum=(L,k)=>Math.round(L.reduce((t,p)=>t+p[k],0));
  const lines=st.fronts.map(f=>{const avg=f.sec.reduce((t,s)=>t+s.off,0)/f.sec.length;return{a:st.c[f.a].n,b:st.c[f.b].n,km:Math.round(Math.abs(avg)),into:avg>0?st.c[f.b].n:st.c[f.a].n};});
  const cities=Object.entries(st.cities).filter(([k,v])=>v.h!==v.own).map(([k,v])=>({n:k.split('|')[0],own:st.c[v.own].n,h:st.c[v.h].n,pop:v.pop}));
  const changed=P.filter(p=>p.hist.length>1||p.pr).map(p=>({n:p.n,al:p.al,h:p.hist.map(x=>x[1]+' ('+x[3]+')')}));
  return{kind:st.over.kind,days:Math.round(st.t/24),txt:st.over.txt,air:{B:sum(S('B'),'lostAir'),R:sum(S('R'),'lostAir')},gnd:{B:sum(S('B'),'lostGnd'),R:sum(S('R'),'lostGnd')},lines,cities,changed,
    pop:cities.reduce((t,c)=>t+c.pop,0)};}
W.daily.push(()=>{if(!W.st||W.st.over)return;neutrals();settlements();fronts();general();});
W.diplo={R,pressure,leverage,end,report,cores,side,sName,other};
})();
