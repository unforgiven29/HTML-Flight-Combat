/* =====================================================================================================================
   v331 — world war, step 4: home fronts, coalitions, civilians, and every way the war can end.
   Spec v49 ch.05 (national profile: public support, war exhaustion, internal stability, economy; coalition cohesion;
   "multiple outcomes"; war status separate from victory) and ch.14 ("Support multiple endings: decisive military victory,
   negotiated peace, mutual exhaustion, withdrawal, national capitulation, coalition collapse, armistice, frozen conflict,
   regime change, partial settlement, or unresolved stalemate"; an outcome report with civilian consequences).
   Aggregate (spec tier D): one record per country, updated once per war day. Every rule is a documented constant (N),
   every change an event. Civilian figures are ESTIMATES from a stated rule, never presented as counts of real people.

   PER COUNTRY (belligerents)
   * econ  war-economy index (1 = prewar): falls with population living in cities the enemy holds, with sanctions between
           the sides (about 1.5 % a month, recovering toward 0.6 at worst) and with exhaustion; it scales war production.
   * sup   public support for the war (0-1): a rally when the country is attacked or loses a city early, then erosion by
           losses (exhaustion), length of war, economic hardship and displacement; a ceasefire gives a little back.
   * stab  government stability: follows support and the economy. Below N.regime the government falls (REGIME CHANGE):
           the new government seeks peace; a principal power whose government falls leaves the war.
   * disp  people displaced (estimate): 30 % of the population of each city that changes hands (rule, not a count);
           a share crosses into neutral neighbours as refugees (event).
   PER SIDE: cohesion (0-1): falls when allies leave, when exhaustion is very unequal inside the coalition, and when a
           principal power's support is low; rises when the coalition retakes cities. Below N.collapse with allies
           leaving: COALITION COLLAPSE.
   ENDINGS (besides armistice, capitulation and frozen conflict in diplomacy.js)
   * NEGOTIATED PEACE: a general ceasefire that held 14 days between governments whose support has fallen below 50 %:
     a treaty with terms set by leverage (lines become borders / withdrawal to the prewar borders / mutual withdrawal
     with a demilitarised zone), prisoner exchange, observers.
   * MUTUAL EXHAUSTION: the same, when every principal power is over 60 % exhausted.
   * DECISIVE MILITARY VICTORY: a side holds an enemy capital and the enemy's air forces are under 15 % of prewar.
   * WITHDRAWAL: a side whose principal powers' support is under 25 % pulls back from the territory it holds; when it
     holds nothing beyond its borders and asks for a ceasefire, the war ends by withdrawal.
   * PARTIAL SETTLEMENT (not an ending): one region's fronts all fall silent while others fight on (event).
   * UNRESOLVED STALEMATE: two years with no ending.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,G=WGEO,P=WWAR.diplo;
const N={sanction:.015/30,econFloor:.6,dispRule:.3,refugeeShare:.25,rally:.08,lossErosion:.35,timeErosion:.0006,hardship:.25,regime:.15,collapse:.2,
  peaceSup:.5,mutualExh:.6,victoryAir:.15,withdrawSup:.25,withdrawKmDay:6,stalemateDay:730};
const day=()=>Math.floor(W.st.t/24),bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
function init(){const st=W.st;if(st.nat)return;st.nat={coh:{B:.8,R:.8},left:{B:0,R:0},seen:{},regions:{}};
  // resolve: how hard this country's public opinion is to wear down, rolled per war (0.7-1.3): scenario variation, so wars end differently
  for(const p of Object.values(st.c)){p.econ=1;p.sup=bel(p)?.65:.5;p.stab=.8;p.disp=0;p.ref=0;p.gov=1;p.res=.7+Math.random()*.6;}}

/* ------------------------------------------------------------------ cities changing hands: displacement and refugees */
W.listeners.push(e=>{if(!W.st||!W.st.nat||e.ty!=='CITY')return;const st=W.st,[holder,own]=e.e,p=st.c[own];if(!p)return;
  const k=e.txt.split(' (')[0]+'|'+own,v=st.cities[k];if(!v)return;const n=Math.round(v.pop*N.dispRule);
  if(holder!==own){p.disp+=n;const ref=Math.round(n*N.refugeeShare),nb=(G.byA3.get(own)||{nb:[]}).nb.map(a=>st.c[a]).filter(q=>q&&!bel(q));
    if(nb.length&&ref>0){const to=nb[(Math.random()*nb.length)|0];to.ref+=ref;
      W.emit('CIVIL',{e:[own,to.a3],cf:'ESTIMATED',txt:'About '+fmt(n)+' people are estimated to have fled '+k.split('|')[0]+'; some '+fmt(ref)+' have crossed into '+to.n+'.'});}
    else W.emit('CIVIL',{e:[own],cf:'ESTIMATED',txt:'About '+fmt(n)+' people are estimated to have fled '+k.split('|')[0]+' as the fighting reached it.'});
    if(day()<60)p.sup=Math.min(1,p.sup+N.rally*.5);}           // early losses harden opinion; later they wear it down
  else{p.disp=Math.max(0,p.disp-Math.round(n*.5));W.emit('CIVIL',{e:[own],cf:'ESTIMATED',txt:'People begin to return to '+k.split('|')[0]+'; homes, water and power need repair first.'});
    const s=P.side(p);if(s)st.nat.coh[s]=Math.min(1,st.nat.coh[s]+.02);}});
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+' million':n>=1e3?Math.round(n/1e3)+',000':String(n);

/* ------------------------------------------------------------------ the home front, daily */
function homeFront(){const st=W.st;
  for(const p of Object.values(st.c)){if(!bel(p)&&!p.cap)continue;
    const held=Object.values(st.cities).filter(v=>v.own===p.a3&&v.h!==p.a3).reduce((t,v)=>t+v.pop,0),occ=Math.min(.6,held/Math.max(1,p.pop));
    // the economy: occupied population, sanctions between the sides, exhaustion
    p.econ=Math.max(N.econFloor,Math.min(1,p.econ-N.sanction-occ*.004+(.0005*(1-p.exh))));
    // public support: losses, time, hardship, displacement; a ceasefire gives a little back
    const cf=st.fronts.some(f=>f.cf&&(f.a===p.a3||f.b===p.a3));
    p.sup=Math.max(0,Math.min(1,p.sup-(N.lossErosion*p.exh/90+N.timeErosion+N.hardship*(1-p.econ)/90)/(p.res||1)-Math.min(.002,p.disp/Math.max(1,p.pop)*.05)+(cf?.002:0)));
    p.stab=Math.max(0,Math.min(1,p.stab+((.4+.6*p.sup)*(.5+.5*p.econ)-p.stab)*.05));
    if(p.stab<N.regime&&bel(p)&&!p.fell){p.fell=1;p.gov++;p.sup=.35;p.stab=.4;
      W.emit('REGIME',{e:[p.a3],txt:'The government of '+p.n+' falls after months of war: '+Math.round(p.exh*100)+' % exhausted, the economy at '+Math.round(p.econ*100)+' % of prewar. The new government says it will seek peace.'});
      if(p.al==='CORE'){const s=p.side;W.setAl(p,'NEUTRAL',null,'regime change: the new government leaves the war');p.cap=1;for(const f of st.fronts)if(f.a===p.a3||f.b===p.a3)f.cf={kind:'END',t:st.t};
        if(!P.cores(s).length){P.end('REGIME_CHANGE','A change of government in '+p.n+' ends '+P.sName(s)+'\'s war: the new leaders accept a ceasefire on the current lines.',p.a3);return;}}
      else{W.setAl(p,'NEUTRAL',null,'regime change: the new government makes a separate peace');for(const f of st.fronts)if(f.a===p.a3||f.b===p.a3)f.cf={kind:'SETTLEMENT',t:st.t};}}}}
/* ------------------------------------------------------------------ coalitions */
function coalitions(){const st=W.st,n=st.nat;
  for(const s of['B','R']){const M=Object.values(st.c).filter(p=>p.side===s&&bel(p)),left=Object.values(st.c).filter(p=>p.hist.some(x=>x[2]===s&&(x[1]==='ALLY'||x[1]==='CORE'))&&!bel(p)).length;
    if(left>n.left[s]){n.coh[s]-=.05*(left-n.left[s]);n.left[s]=left;}
    if(M.length>1){const ex=M.map(p=>p.exh),spread=Math.max(...ex)-Math.min(...ex);n.coh[s]-=spread*.0015;}
    const C=P.cores(s);if(C.length&&C.some(p=>p.sup<.3))n.coh[s]-=.003;n.coh[s]=Math.max(0,Math.min(1,n.coh[s]+.0005));
    if(n.coh[s]<N.collapse&&left>=3&&C.some(p=>p.sup<.35)&&!st.over){   // a collapse needs departures AND a principal power whose public has turned
      for(const p of M)if(p.al==='ALLY'){W.setAl(p,'NEUTRAL',null,'the coalition breaks apart');for(const f of st.fronts)if(f.a===p.a3||f.b===p.a3)f.cf={kind:'SETTLEMENT',t:st.t};}
      P.end('COALITION_COLLAPSE',P.sName(s)+' breaks apart: its allies make their own peace, and its principal powers accept a ceasefire on the current lines.');return;}}}
/* ------------------------------------------------------------------ withdrawal, decisive victory, partial settlement, stalemate */
function capitals(){const L=[];for(const pl of G.places)if(pl.cap===2)L.push(pl);return L;}
let CAPS=null;
function outcomes(){const st=W.st;if(st.over)return;
  // decisive victory: an enemy capital held and the enemy's air forces broken
  CAPS=CAPS||capitals();
  for(const s of['B','R']){const o=P.other(s);const enemy=Object.values(st.c).filter(p=>p.side===o&&bel(p)),air0=enemy.reduce((t,p)=>t+p.air0,0),air=enemy.reduce((t,p)=>t+p.air,0);
    const cap=CAPS.find(c=>{const v=st.cities[c.name+'|'+c.a3];return v&&v.h!==v.own&&P.side(st.c[v.h])===s&&st.c[c.a3]&&st.c[c.a3].al==='CORE';});
    if(cap&&air0>0&&air/air0<N.victoryAir){P.end('DECISIVE_VICTORY',P.sName(s)+' takes '+cap.name+' and '+P.sName(o)+'\'s air forces are broken. '+P.sName(o)+' accepts terms. A military decision; the cost is in the report below.');return;}}
  // withdrawal: a side whose leaders have lost public support pulls back
  for(const s of['B','R']){const C=P.cores(s);if(!C.length||!C.every(p=>p.sup<N.withdrawSup))continue;let beyond=0;const key='wd'+s;
    // only a side that holds enemy ground can withdraw from it
    if(!st.nat.seen[key]){let held=0;for(const f of st.fronts){if(f.cf)continue;const aIs=P.side(st.c[f.a])===s;for(const sc of f.sec)if((aIs?sc.off:-sc.off)>5)held++;}if(!held)continue;}
    for(const f of st.fronts){if(f.cf)continue;const aIs=P.side(st.c[f.a])===s;for(const sc of f.sec){const out=aIs?sc.off:-sc.off;if(out>0){beyond++;sc.off+=(aIs?-1:1)*Math.min(out,N.withdrawKmDay);}}}
    if(!st.nat.seen[key]){st.nat.seen[key]=1;W.emit('WITHDRAW',{txt:P.sName(s)+'\'s governments, with public support gone, order a withdrawal to the prewar borders.'});}
    if(!beyond){P.end('WITHDRAWAL',P.sName(s)+' has withdrawn to its prewar borders and asks for a ceasefire, which is accepted. Nothing was gained that the war set out to take.');return;}}
  // a region fallen silent while others fight on
  const reg={};for(const f of st.fronts){const r=W.THEATRES.find(T=>{const s0=f.sec[0];return s0.lat>=T.lat[0]&&s0.lat<=T.lat[1]&&s0.lon>=T.lon[0]&&s0.lon<=T.lon[1];});const k=r?r.id:'X';(reg[k]=reg[k]||[]).push(f);}
  const live=Object.values(reg).filter(L=>L.some(f=>!f.cf)).length;
  for(const[k,L]of Object.entries(reg))if(L.every(f=>f.cf)&&live>0&&!st.nat.regions[k]){st.nat.regions[k]=1;const T=W.THEATRES.find(q=>q.id===k);
    W.emit('PARTIAL',{txt:'Partial settlement: the fighting in '+(T?T.name:'one region')+' has stopped while the war goes on elsewhere.'});}
  if(day()>=N.stalemateDay)P.end('STALEMATE','Two years of war and no decision, no armistice, no agreement. The war is unresolved; the fighting dies down without ending.');}
/* ------------------------------------------------------------------ negotiated peace / mutual exhaustion (called when a general ceasefire has held) */
function settle(){const st=W.st,C=[...P.cores('B'),...P.cores('R')];if(!C.length)return false;
  const mutual=C.every(p=>p.exh>N.mutualExh),tired=C.every(p=>p.sup<N.peaceSup);if(!mutual&&!tired)return false;
  const LB=P.leverage('B'),LR=P.leverage('R'),gap=LB-LR;let terms;
  if(Math.abs(gap)<1){terms='both sides withdraw 10 km behind the current lines into a demilitarised zone under international observers';for(const f of st.fronts)for(const s of f.sec)s.dmz=1;}
  else if(gap>0&&LB>0)terms='the current lines become the new borders, pending a final treaty';
  else terms='forces withdraw to the prewar borders; the territory taken is returned';
  if(/prewar borders/.test(terms))for(const f of st.fronts)for(const s of f.sec)s.off=0;
  st.nat.terms=terms;
  P.end(mutual?'MUTUAL_EXHAUSTION':'NEGOTIATED_PEACE',(mutual?'Both sides, exhausted, sign a peace treaty: ':'A peace treaty is signed after the ceasefire held: ')+terms+'. Prisoners are exchanged; observers monitor the borders.');return true;}
/* ------------------------------------------------------------------ the report: the home front and civilians (estimates) */
{const _r=P.report;P.report=function(){const r=_r.apply(this,arguments),st=W.st,L=Object.values(st.c);
  r.civ={disp:L.reduce((t,p)=>t+(p.disp||0),0),ref:L.reduce((t,p)=>t+(p.ref||0),0),gov:L.filter(p=>p.fell).map(p=>p.n),econ:L.filter(p=>p.econ!=null&&p.hist.some(x=>x[1]==='CORE'||x[1]==='ALLY')).map(p=>({n:p.n,e:Math.round(p.econ*100),s:Math.round(p.sup*100)})).sort((a,b)=>a.e-b.e).slice(0,8),
    coh:st.nat&&st.nat.coh,terms:st.nat&&st.nat.terms};return r;};}
W.daily.push(()=>{if(!W.st)return;init();if(W.st.over)return;homeFront();if(!W.st.over)coalitions();if(!W.st.over)outcomes();});
{const _n=W.newWar;W.newWar=async function(){const r=await _n.apply(this,arguments);init();return r;};}
W.nations={N,settle,init,homeFront,coalitions,outcomes};
})();
