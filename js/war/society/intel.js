/* =====================================================================================================================
   v340 — chapter 7 at campaign level: intelligence and uncertainty, electronic warfare, communications, cyber, space,
   and information integrity (spec v49 ch.07). The cockpit sensors (radar, RWR, IRST, jamming) already exist in the
   flight game; this is the campaign layer above them. Abstract and gameplay-level; no methods are described.
   * INTELLIGENCE PICTURE per side (B, R): quality 0-1 from sources — reconnaissance drones (forces.js), airborne early
     warning (military.js), satellites (space), signals (EW capacity), human sources (slow, steady). What a side KNOWS
     about an enemy country is an ESTIMATE: the true strength x (1 + error), error shrinking with quality. The panel
     shows only the estimate for the other side, with a range. Better intelligence: front power x(0.95-1.08).
   * ELECTRONIC WARFARE: capacity per side from tier and economy; the side with the edge loses fewer aircraft (its
     readiness x up to 1.06) and degrades the other side's communications (orders delay +1 day when badly outmatched).
   * COMMUNICATIONS: a side's network health (0-1) falls with cyber incidents and EW and recovers daily.
   * CYBER: incidents against the other side's infrastructure or networks (abstract: "a cyber incident disrupts ...");
     effects on energy, transport or command networks for days; attribution is uncertain (ALLEGED / ATTRIBUTED).
   * SPACE: satellites per side (estimates for countries with space programmes); counter-space incidents are
     REVERSIBLE (jamming of satellite links), reducing intelligence for days. No destruction of satellites is modelled
     (debris is out of scope by policy).
   * INFORMATION INTEGRITY: each side's public claims (losses inflicted) are inflated relative to the assessed record;
     the panel shows claim and assessed estimate side by side, and the news marks claims as CLAIMED.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.mil)return;
const W=WWAR,rn=Math.random;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const SPACE={USA:120,CHN:80,RUS:60,FRA:12,GBR:6,IND:12,JPN:10,ISR:6,DEU:6,ITA:5,KOR:4,ESP:3,TUR:3,IRN:2,PRK:1,BRA:2,ARE:2};   // military / dual-use satellites: rough estimates by rule
const I=()=>{const st=W.st;if(!st.intel){st.intel={B:{q:.5,net:1,ew:0,sat:0,cy:0,claim:0,jam:0},R:{q:.5,net:1,ew:0,sat:0,cy:0,claim:0,jam:0},err:{},log:[]};}return st.intel;};
const other=s=>s==='B'?'R':'B';
function picture(){const st=W.st,X=I();
  for(const s of['B','R']){const L=Object.values(st.c).filter(p=>p.side===s&&bel(p));const S=X[s];
    S.sat=L.reduce((t,p)=>t+(SPACE[p.a3]||0),0);S.ew=L.reduce((t,p)=>t+p.air*(p.gdp>2e6?1:p.gdp>4e5?.6:.3),0);
    const F=st.frc&&st.frc.c||{},M=st.mil||{};const drones=L.reduce((t,p)=>t+((F[p.a3]&&F[p.a3].inv.UAVR)||0),0),aew=L.reduce((t,p)=>t+((M[p.a3]&&M[p.a3].aew)||0),0);
    const src=Math.min(1,drones/400)*.3+Math.min(1,aew/20)*.2+Math.min(1,S.sat/(S.jam>0?400:150))*.3+.15;S.q=Math.max(.15,Math.min(.95,S.q+(src-S.q)*.2));if(S.jam>0)S.jam--;
    S.net=Math.min(1,S.net+.05);}
  // estimates of each enemy country (what the other side believes)
  for(const p of Object.values(st.c)){if(!bel(p))continue;const q=X[other(p.side)].q,e=X.err[p.a3]||(X.err[p.a3]={air:0,gnd:0});
    for(const k of['air','gnd']){const sd=(1-q)*.5;e[k]=e[k]*.8+(rn()*2-1)*sd*.2+(rn()<.03?(rn()*2-1)*sd:0);e[k]=Math.max(-.6,Math.min(.8,e[k]));}}}
function ew(){const st=W.st,X=I(),B=X.B.ew,R=X.R.ew;if(B+R<1)return;const edge=(B-R)/(B+R);X.edge=edge;
  const lose=edge>.3?'R':edge<-.3?'B':null;if(lose)X[lose].net=Math.max(.3,X[lose].net-.03);}
function cyber(){const st=W.st,X=I();if(st.over)return;
  for(const s of['B','R']){const tgt=other(s),L=Object.values(st.c).filter(p=>p.side===tgt&&bel(p)&&p.ecn);if(!L.length||rn()>.03)continue;const p=L[(rn()*L.length)|0];
    const kind=['energy','transport','command'][(rn()*3)|0];X[tgt].cy++;
    if(kind==='energy')p.ecn.energy=Math.max(.3,p.ecn.energy-.04);else if(kind==='transport')p.ecn.trans=Math.max(.3,p.ecn.trans-.04);else X[tgt].net=Math.max(.3,X[tgt].net-.15);
    const att=rn()<.4;W.emit('CYBER',{e:[p.a3],cf:att?'ATTRIBUTED':'ALLEGED',txt:'A cyber incident disrupts '+({energy:'parts of the power grid',transport:'rail and port scheduling systems',command:'military communications networks'}[kind])+' in '+p.n+'. '+(att?'Officials attribute it to '+(s==='B'?'BLUEFOR':'REDFOR')+' state actors.':'Attribution is not yet established.')+' Services are being restored.'});}
  // counter-space: reversible jamming of satellite links
  for(const s of['B','R']){if(X[s].sat<5||rn()>.006)continue;const t=other(s);if(X[t].sat<1)continue;X[t].jam=10;W.emit('SPACE',{cf:'REPORTED',txt:(s==='B'?'BLUEFOR':'REDFOR')+' jams '+(t==='B'?'BLUEFOR':'REDFOR')+' satellite communication and imaging links for several days (reversible interference; no satellites destroyed).'});}}
function claims(){const st=W.st,X=I();for(const s of['B','R']){const L=Object.values(st.c).filter(p=>p.side===other(s));const real=L.reduce((t,p)=>t+p.lostAir,0);X[s].real=real;X[s].claim=Math.round(real*(1.25+.35*rn()));}
  if(Math.floor(st.t/24)%30===0&&!st.over)for(const s of['B','R'])W.emit('CLAIM',{cf:'CLAIMED',txt:(s==='B'?'BLUEFOR':'REDFOR')+' spokespeople claim '+X[s].claim+' enemy aircraft destroyed since the war began. Independent assessments put the figure lower.'});}
W.daily.push(()=>{if(!W.st)return;picture();ew();cyber();claims();});
// effects
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);const X=W.st.intel;if(!X||!p.side)return k;const S=X[p.side];return k*(.95+.13*S.q)*(.9+.1*S.net);};}
{const _r=W.rdy;W.rdy=p=>{let v=_r(p);const X=W.st&&W.st.intel;if(!X||!p.side||X.edge==null)return v;return v*(1+.06*(p.side==='B'?X.edge:-X.edge));};}
// what your side believes about a country (an estimate with a range)
function est(p){const X=W.st.intel;if(!X)return null;const mine=(typeof game!=='undefined'&&game.team==='RED')?'R':'B';if(p.side===mine||!p.side)return null;const e=X.err[p.a3]||{air:0,gnd:0},q=X[mine].q,sd=(1-q)*.5;
  const f=(v,er)=>[Math.max(0,Math.round(v*(1+er-sd))),Math.round(v*(1+er)),Math.round(v*(1+er+sd))];return{q,air:f(p.air,e.air),gnd:f(p.gnd,e.gnd)};}
const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>';
function tab(p){const st=W.st,X=I(),mine=(typeof game!=='undefined'&&game.team==='RED')?'R':'B',S=X[mine],e=est(p);
  let h='<div style="color:#8a9a92;font-size:10px">What your side knows. Enemy figures are intelligence estimates with a range; quality depends on drones, early warning, satellites and signals.</div>';
  h+='<h4>YOUR SIDE\'S PICTURE</h4>'+row('Intelligence quality',Math.round(S.q*100)+' %')+row('Network health',Math.round(S.net*100)+' %')+row('Satellites (estimate)','~'+S.sat+(S.jam?' · links jammed':''))+row('Electronic-warfare edge',X.edge==null?'—':(X.edge*(mine==='B'?1:-1)>0?'yours':'theirs')+' ('+Math.round(Math.abs(X.edge)*100)+' %)')+row('Cyber incidents suffered',S.cy);
  if(e)h+='<h4>ESTIMATE OF '+String(p.n).toUpperCase()+'</h4>'+row('Combat aircraft','~'+e.air[1]+' (range '+e.air[0]+'-'+e.air[2]+')')+row('Ground brigade-equivalents','~'+e.gnd[1]+' (range '+e.gnd[0]+'-'+e.gnd[2]+')');
  else if(p.side===mine)h+='<div>'+p.n+' is on your side: figures elsewhere in this panel are its own reports.</div>';
  h+='<h4>CLAIMS AND ASSESSMENTS</h4>'+row('Your side claims enemy aircraft destroyed',S.claim||0)+row('Assessed',Math.round(S.real||0));
  return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.INTEL=tab;
W.intel={I,est,tab,SPACE};
})();
