/* =====================================================================================================================
   v338 — chapter 6: armed forces, command, personnel, readiness, operations and sustainment (spec v49 ch.06).
   One record per country, st.mil[a3], built from WWAR's aggregates (no unit or person is counted twice). Daily, for
   every country (at war or not). Gameplay-level rules and LABELLED ESTIMATES; all rates are constants in R.

   MOBILIZATION AND THE DRAFT  (ch.06 mobilization states, draft law, call-ups, exemptions, resistance, demobilization)
     state PEACETIME / PARTIAL / GENERAL. Draft law from the country's profile (an estimate, labelled; conscription is
     common, a volunteer force otherwise). The government (AI, or you for a country on your side) decides: partial after
     two weeks of fighting on its own fronts or when the ground force has lost a quarter, general at a half; never without a draft law unless support is high.
     Call-up: reservists report in 30 days, draftees train 90 days; graduates become brigade-equivalents (a full general mobilization adds
     about 60 % of the prewar ground force). Exemptions (students, essential workers, health: about 30 % of those called) and non-compliance (rising as
     support falls) are counted, never targeted. The economy loses workers (econ x (1 - 3 x share of workforce called));
     public support falls with each call-up. After the war: demobilization over about six months, workers return.
   PERSONNEL AND TRAINING  (training pipeline, capacity, exercises, lessons learned, retention)
     aircrew: about 1.3 crews per combat aircraft. Air losses cost crews (60 %; the rest are rescued or captured, csar).
     Flight schools graduate crews monthly by capacity (economy x size); in peacetime, exercises raise experience.
     Experience (0-1) sets readiness; a force short of crews flies fewer aircraft (production slows, readiness falls).
     Lessons learned: heavy losses in a month raise experience slowly afterwards (the force adapts) — an event.
   COMMAND  (headquarters, commanders, orders and intent, friction, succession)
     every country at war has a theatre headquarters with a commander (fictional, national rank). The headquarters
     chooses an intent per front by the force ratio: ATTACK (+8 % offensive power, more losses), HOLD, or DEFEND
     (+10 % defending, fortifications build up to +15 %). Orders take 1-3 days to reach the front (friction). Heavy
     fighting can strike a headquarters; the deputy takes over (succession; 5 days at -10 %).
   MUNITIONS  (ammunition classes, stockpiles, production, allocation, transfers)
     stocks in DAYS OF COMBAT SUPPLY for four classes: air-to-air, surface-to-air, precision strike, artillery. Use per
     day of fighting, production by industry, transfers from allied producers (with a 2-4 week lead time; an event).
     Artillery under 5 days: front power falls (to x0.7); air-to-air or surface-to-air short: readiness falls.
   AIRBASES  (airfield condition, attack, repair, dispersal)
     each country's military airfields have a condition (0-1). Where the enemy holds the air, bases are struck (events);
     engineers repair them (faster with a strong economy). A force flying from damaged bases loses readiness; under
     50 % a base disperses its aircraft (readiness x0.9). Your sortie base shows its condition on take-off.
   ENGINEERING AND FORTIFICATION: engineering capacity per country speeds base and bridge repair; fronts on DEFEND
     dig in (fortification 0-1).
   SUPPORT AIRCRAFT: airborne early warning and tankers per country (estimates by economy: none for small air forces),
     losses in contested theatres; a side with airborne early warning counts its air force at +5 %.
   POST-BATTLE HAZARDS: unexploded ordnance where the fronts were active (contamination per front), estimated harm to
     civilians each month, clearance after the war (events). Abstract, no methods.
   The people here are fictional; the war is a fictional scenario. Not modelled: individual weapon catalogues per
   country, ship compartments and damage control, carrier deck cycles, private military companies.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.ob)return;
const W=WWAR,G=WGEO,rn=Math.random;
const R={bde:4000,reservDays:30,draftDays:90,exempt:.3,econK:3,crew:1.3,crewLoss:.6,sch:.0016,expEx:.0015,
  atk:1.08,def:1.1,fort:.15,fortRate:.004,friction:[1,3],hqHit:.004,succDays:5,
  mun:{AAM:30,SAM:30,PGM:25,ART:30},use:{AAM:.7,SAM:.6,PGM:.7,ART:.8},prod:{AAM:.5,SAM:.5,PGM:.45,ART:.8},lead:[14,28],
  baseHit:.25,baseFix:.05,aew:1.05,uxo:.02};
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const M=a3=>{const st=W.st;st.mil=st.mil||{};let m=st.mil[a3];if(m)return m;const p=st.c[a3];if(!p)return null;
  const big=p.gdp>1e6,mid=p.gdp>2e5;
  m=st.mil[a3]={a3,state:'PEACETIME',law:draftLaw(p),called:0,exempt:0,evade:0,trn:[],gained:0,demob:0,
    crews:Math.round(p.air*R.crew),crew0:Math.round(p.air*R.crew),exp:.55+.2*Math.min(1,p.gdp/3e6)+(rn()-.5)*.1,lostCrews:0,lossM:0,lastLess:-1e9,
    hq:null,intent:{},pend:[],fort:{},succ:0,
    mun:{...R.mun},inb:[],
    bases:{},eng:big?1:mid?.7:.4,
    aew:p.air>300?Math.round(p.air/120):p.air>120?2:0,tnk:p.air>300?Math.round(p.air/50):p.air>150?3:0,
    uxo:{},harm:0};
  return m;};
// draft law (an ESTIMATE from the country profile; the scenario can override st.mil[a3].law)
const VOL=new Set(['USA','GBR','CAN','AUS','NZL','JPN','FRA','DEU','ITA','ESP','NLD','BEL','PRT','IRL','POL','CZE','SVK','HUN','ROU','BGR','HRV','SVN','SRB','IND','PAK','BGD','ZAF','ARG','CHL','PER','PHL','MYS','IDN','NGA','KEN','SAU','ARE']);
function draftLaw(p){return VOL.has(p.a3)?'VOLUNTEER (reserve call-up only)':'CONSCRIPTION';}
const lbl=x=>'<span title="estimate by rule" style="color:#c9b46b">~'+x+'</span>';

/* ------------------------------------------------------------------ mobilization */
function order(a3,state,by){const st=W.st,p=st.c[a3],m=M(a3);if(!p||!m||m.state===state)return false;const was=m.state;m.state=state;
  if(state==='DEMOBILIZED'){W.emit('MOBILIZATION',{e:[a3],txt:p.n+' begins demobilization'+(by?' ('+by+')':'')+': about '+fmt(m.called)+' people will return to civilian life over the coming months.'});return true;}
  const pool=p.pop*(state==='GENERAL'?.035:.012)*(m.law==='CONSCRIPTION'?1:.45),called=Math.round(Math.max(0,pool-m.called));if(called<=0)return true;
  const ex=Math.round(called*R.exempt),ev=Math.round(called*Math.max(.02,.35-.4*(p.sup??.6))),go=called-ex-ev;
  m.called+=called;m.exempt+=ex;m.evade+=ev;
  const res=Math.round(go*(m.law==='CONSCRIPTION'?.45:.8));m.trn.push({n:res,t:st.t+24*R.reservDays,k:'RESERVISTS'},{n:go-res,t:st.t+24*R.draftDays,k:'DRAFTEES'});
  if(p.sup!=null)p.sup=Math.max(0,p.sup-(state==='GENERAL'?.06:.03));
  W.emit('MOBILIZATION',{e:[a3],cf:'ESTIMATED',txt:p.n+(state==='GENERAL'?' declares general mobilization':' orders a partial mobilization')+(by?' ('+by+')':'')+': about '+fmt(called)+' people called up ('+m.law.toLowerCase()+'). About '+fmt(ex)+' are exempt or deferred (studies, essential work, health); about '+fmt(ev)+' do not report.'});
  if(ev>called*.15)W.emit('JUSTICE',{e:[a3],txt:'Courts in '+p.n+' hear cases of people who did not report for service; appeals and alternative service are available.'});
  return true;}
function mobilize(p,m){const st=W.st;
  // graduates join the ground force; the economy loses the workers who are away
  for(let i=m.trn.length-1;i>=0;i--){const c=m.trn[i];if(st.t<c.t)continue;m.trn.splice(i,1);const b=c.n/Math.max(1,p.pop*.035)*.6*Math.max(1,p.gnd0);   /* a full general mobilization adds about 60 % of the prewar ground force */m.gained+=b;p.gnd+=b;p.gnd0=Math.max(p.gnd0,p.gnd);
    if(c.n>2000)W.emit('MOBILIZATION',{e:[p.a3],txt:'In '+p.n+', about '+fmt(c.n)+' '+c.k.toLowerCase()+' complete training and join their units (about '+b.toFixed(1)+' brigade-equivalents).'});}
  if(m.state==='DEMOBILIZED'&&m.called>0){const r=Math.max(1,Math.round(m.called*.012));m.called=Math.max(0,m.called-r);m.demob+=r;p.gnd=Math.max(0,p.gnd-Math.min(p.gnd*.004,r/R.bde));}
  // AI decision (the player decides for their own countries through the panel; the AI still acts if they do nothing for 30 days)
  if(!bel(p)||st.over)return;const lost=1-p.gnd/Math.max(1,p.gnd0);const mine=isMine(p.a3)&&m.manual&&st.t-m.manual<24*30;
  const fr=st.fronts.some(f=>(f.a===p.a3||f.b===p.a3)&&!f.cf);if(fr&&m.warT==null)m.warT=st.t;
  if(!mine){if(m.state==='PEACETIME'&&(lost>.25||(fr&&st.t-m.warT>24*14)))order(p.a3,'PARTIAL');else if(m.state==='PARTIAL'&&lost>.5&&(m.law==='CONSCRIPTION'||(p.sup??.6)>.55))order(p.a3,'GENERAL');}}
const isMine=a3=>{const p=W.st.c[a3];return p&&p.side===((typeof game!=='undefined'&&game.team==='RED')?'R':'B');};
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+' million':n>=1e3?Math.round(n/1e3)+',000':String(Math.round(n));

/* ------------------------------------------------------------------ personnel and training */
function personnel(p,m,dayOfMonth){const st=W.st;
  const lostA=p.lostAir-(m._la??p.lostAir);m._la=p.lostAir;if(lostA>0){const c=lostA*R.crewLoss;m.crews=Math.max(0,m.crews-c);m.lostCrews+=c;m.lossM+=lostA;m.exp=Math.max(.2,m.exp-.0005*lostA);}
  const cap=Math.max(.5,p.gdp/1e6*6)*Math.min(1.2,p.econ??1)*(p.ecn?p.ecn.ind:1);m.crews=Math.min(m.crew0*1.3,m.crews+cap*R.sch*30/30);   // a flight school's yearly output, by the day
  if(!bel(p)||st.over)m.exp=Math.min(.95,m.exp+R.expEx*(1-m.exp));   // exercises and training in peacetime
  if(dayOfMonth===0){if(m.lossM>p.air0*.08&&st.t-m.lastLess>24*60){m.lastLess=st.t;m.less=(m.less||0)+1;W.emit('LESSONS',{e:[p.a3],txt:p.n+'\'s air force studies a month of heavy losses: tactics and training are revised (lessons learned).'});}m.lossM=0;}
  if(m.less&&st.t-m.lastLess<24*90)m.exp=Math.min(.95,m.exp+.0008);}
const crewRatio=(p,m)=>Math.min(1,m.crews/Math.max(1,p.air*R.crew));

/* ------------------------------------------------------------------ command */
function command(p,m){const st=W.st;if(!bel(p)||st.over)return;
  if(!m.hq){const c=W.lead?W.lead.person(p.a3,'Theatre commander, '+p.n,W.lead.rank(p.a3,'army',3)):{name:'Commander',skill:1};m.hq={id:c.id,name:c.name,skill:c.skill||1,deputy:null};}
  if(m.succ>0)m.succ--;
  for(const f of st.fronts){if(f.a!==p.a3&&f.b!==p.a3)continue;const o=st.c[f.a===p.a3?f.b:f.a],ratio=p.gnd/Math.max(1,o.gnd)*(m.mun.ART>5?1:.7);
    const want=(m.cmd&&m.cmd[f.id])||(ratio>1.25?'ATTACK':ratio<.8?'DEFEND':'HOLD');   /* commander mode: your order for this front, else the headquarters decides */const cur=m.intent[f.id];
    if(cur!==want&&!m.pend.some(q=>q.f===f.id&&q.i===want)){m.pend=m.pend.filter(q=>q.f!==f.id);m.pend.push({f:f.id,i:want,why:m.cmd&&m.cmd[f.id]?'your order':'force ratio '+ratio.toFixed(2)+(m.mun.ART<=5?', artillery short':'')+(ratio>1.25?' favours an attack':ratio<.8?' calls for defence':' calls for holding'),t:st.t+24*(R.friction[0]+rn()*(R.friction[1]-R.friction[0]))});}
    if(m.intent[f.id]==='DEFEND'&&!f.cf)m.fort[f.id]=Math.min(1,(m.fort[f.id]||0)+R.fortRate*m.eng);
    if(!f.cf&&rn()<R.hqHit&&!m.succ){m.succ=R.succDays;W.emit('COMMAND',{e:[p.a3],txt:p.n+'\'s forward headquarters on the front with '+o.n+' is hit; the deputy commander takes over (command disrupted for a few days).'});}}
  for(let i=m.pend.length-1;i>=0;i--){const q=m.pend[i];if(st.t<q.t)continue;m.pend.splice(i,1);const was=m.intent[q.f];m.intent[q.f]=q.i;const f=st.fronts.find(x=>x.id===q.f);
    if(f&&was&&was!==q.i)W.emit('ORDERS',{e:[p.a3],txt:m.hq.name+' ('+p.n+') orders the forces on the front with '+st.c[f.a===p.a3?f.b:f.a].n+' to '+q.i.toLowerCase()+(q.why?' (reason: '+q.why+')':'')+'.'});}}

/* ------------------------------------------------------------------ munitions */
const PRODUCERS=['USA','RUS','CHN','FRA','GBR','DEU','ITA','KOR','JPN','ISR','TUR','IND','SWE','IRN'];
function munitions(p,m,act){const st=W.st,e=p.ecn,ind=e?e.ind:1;
  for(const k in R.mun){const use=act*R.use[k]*(k==='AAM'||k==='SAM'?Math.min(1,(st.th||[]).filter(t=>t.f&&t.f[p.a3]).length):1);
    const prod=R.prod[k]*ind*Math.min(1.5,.4+p.gdp/2e6)*(PRODUCERS.includes(p.a3)?1:.5);m.mun[k]=Math.max(0,Math.min(R.mun[k]*1.5,m.mun[k]-use+prod));}
  // transfers from allied producers
  for(let i=m.inb.length-1;i>=0;i--){const d=m.inb[i];if(st.t<d.t)continue;m.inb.splice(i,1);m.mun[d.k]+=d.n;W.emit('ARMS',{e:[p.a3,d.from],txt:'A delivery of '+NAME[d.k]+' from '+st.c[d.from].n+' arrives in '+p.n+' (about '+d.n+' days of supply).'});}
  if(bel(p)&&!st.over)for(const k in m.mun)if(m.mun[k]<6&&!m.inb.some(d=>d.k===k)){const from=PRODUCERS.map(a=>st.c[a]).find(q=>q&&q!==p&&q.side===p.side&&bel(q)&&M(q.a3).mun[k]>15);
    if(from){const n=Math.round(15+rn()*10);M(from.a3).mun[k]-=n*.4;m.inb.push({k,n,from:from.a3,t:st.t+24*(R.lead[0]+rn()*(R.lead[1]-R.lead[0]))});W.emit('ARMS',{e:[from.a3,p.a3],txt:from.n+' agrees to transfer '+NAME[k]+' to '+p.n+'; delivery in two to four weeks.'});}}}
const NAME={AAM:'air-to-air missiles',SAM:'surface-to-air missiles',PGM:'precision strike weapons',ART:'artillery ammunition'};

/* ------------------------------------------------------------------ airbases */
function airbases(p,m,sup){const st=W.st,L=(W.milBases().get(p.a3)||[]).slice(0,20);
  for(const a of L){const b=m.bases[a.ident]||(m.bases[a.ident]={c:1,n:a.name});const hit=bel(p)&&!st.over&&sup>.3&&rn()<R.baseHit*sup*.15;
    if(hit){const d=.15+rn()*.35;b.c=Math.max(0,b.c-d);if(d>.3)W.emit('AIRBASE',{e:[p.a3],txt:'Enemy aircraft strike '+a.name+' ('+p.n+'): runway and shelters damaged; '+(b.c<.5?'aircraft disperse to other fields':'repairs under way')+'.'});}
    else b.c=Math.min(1,b.c+R.baseFix*m.eng*(p.econ??1));}}
const baseCond=(p,m)=>{const v=Object.values(m.bases);return v.length?v.reduce((t,b)=>t+b.c,0)/v.length:1;};

/* ------------------------------------------------------------------ post-battle hazards */
function hazards(p,m,dayOfMonth){const st=W.st;
  for(const f of st.fronts){if(f.a!==p.a3&&f.b!==p.a3)continue;if(!f.cf&&!st.over)m.uxo[f.id]=Math.min(1,(m.uxo[f.id]||0)+R.uxo*.1);else if(st.over&&st.post)m.uxo[f.id]=Math.max(0,(m.uxo[f.id]||0)-.004*m.eng);}
  if(dayOfMonth===0){const u=Object.values(m.uxo).reduce((t,v)=>t+v,0);if(u>.2){const lo=Math.round(u*3),hi=Math.round(u*12)+2;m.harm+=(lo+hi)/2;
      W.emit('UXO',{e:[p.a3],cf:'ESTIMATED',txt:'Unexploded ordnance in former battle areas of '+p.n+': an estimated '+lo+'-'+hi+' civilians hurt this month. '+(st.over?'Clearance teams are working through the areas.':'Areas are marked and fenced where possible.')});}}}

/* ------------------------------------------------------------------ the daily step */
function daily(){const st=W.st;if(!st)return;const dom=Math.floor(st.t/24)%30;
  for(const p of Object.values(st.c)){const m=M(p.a3);if(!m)continue;
    const th=(st.th||[]).filter(t=>t.f&&t.f[p.a3]),sup=th.length?Math.max(0,...th.map(t=>p.side==='B'?-t.sup:t.sup)):0;   // how much the enemy holds the air over this country
    const act=bel(p)&&!st.over?Math.min(1,st.fronts.filter(f=>(f.a===p.a3||f.b===p.a3)&&!f.cf).length/2):0;
    mobilize(p,m);personnel(p,m,dom);command(p,m);munitions(p,m,act);airbases(p,m,sup);hazards(p,m,dom);
    if(m.aew&&th.length&&sup>.4&&rn()<.004*sup){m.aew--;W.emit('AIR',{e:[p.a3],txt:'An airborne early-warning aircraft of '+p.n+' is lost; the others pull back from the front.'});}}
  if(st.over)for(const p of Object.values(st.c)){const m=st.mil[p.a3];if(m&&m.called>0&&m.state!=='DEMOBILIZED'&&st.post)order(p.a3,'DEMOBILIZED');}}
W.daily.push(daily);

/* ------------------------------------------------------------------ effects through the war's hooks */
// economy: workers away (applied to the economy the economy module computes; 1 - 3 x share of the workforce called up)
{const _p=W.prodK;W.prodK=(p,k)=>{let v=_p(p,k);const m=W.st&&W.st.mil&&W.st.mil[p.a3];if(!m)return v;
  if(k==='air')v*=crewRatio(p,m)<.8?.5:1;           // aircraft without crews are not replaced as fast
  if(k==='cap')v*=1+Math.min(.5,m.gained/Math.max(1,p.gnd0));
  return v;};}
{const _r=W.rdy;W.rdy=p=>{let v=_r(p);const m=W.st&&W.st.mil&&W.st.mil[p.a3];if(!m)return v;
  v*=.75+.45*m.exp;v*=.6+.4*crewRatio(p,m);v*=Math.min(1,.6+.4*Math.min(m.mun.AAM,m.mun.SAM)/8);const b=baseCond(p,m);v*=(.7+.3*b)*(b<.5?.9:1);if(m.aew)v*=R.aew;return Math.min(1.25,v);};}
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);const m=W.st.mil&&W.st.mil[p.a3];if(!m)return k;const o=W.st.c[f.a===p.a3?f.b:f.a],mo=W.st.mil[o.a3];
  const i=m.intent[f.id];if(i==='ATTACK')k*=R.atk;else if(i==='DEFEND')k*=R.def;
  if(mo&&mo.fort[f.id])k/=1+R.fort*mo.fort[f.id];            // attacking into the other side's fortifications
  if(m.mun.ART<5)k*=.7+.06*m.mun.ART;if(m.succ>0)k*=.9;
  if(m.hq)k*=.95+.1*Math.min(1.15,m.hq.skill||1)-.05;return k;};}
// the economy: workers away (econ eased toward 1 - 3 x share called, never below .6 from this alone)
W.daily.push(()=>{const st=W.st;if(!st||!st.mil)return;for(const p of Object.values(st.c)){const m=st.mil[p.a3];if(!m||!m.called||p.econ==null)continue;const s=m.called/Math.max(1,p.pop*.5);p.econ=Math.max(.5,p.econ-Math.min(.01,s*R.econK*.02));}});

/* ------------------------------------------------------------------ your sortie base */
if(window.WSORTIE){const _s=WSORTIE.start;WSORTIE.start=async function(a3,ap){const r=await _s.apply(this,arguments);try{const m=W.st.mil&&W.st.mil[a3],b=m&&ap&&m.bases[ap.ident];
  if(b&&b.c<.95)flash('BASE CONDITION '+Math.round(b.c*100)+' %'+(b.c<.5?' · DISPERSED OPERATIONS':' · RUNWAY REPAIRS UNDER WAY'),4000);
  if(m&&m.mun.AAM<5)flash('AIR-TO-AIR MISSILE SHORTAGE · '+Math.round(m.mun.AAM)+' DAYS OF SUPPLY',4000);}catch(e){}return r;};}

/* ------------------------------------------------------------------ MILITARY tab */
const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>',esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function tab(p){const st=W.st,m=M(p.a3);if(!m)return'';const mine=isMine(p.a3)&&bel(p)&&!st.over;
  let h='<div style="color:#8a9a92;font-size:10px">Estimates by rule (marked ~). Fictional people; a fictional scenario.</div><h4>MOBILIZATION</h4>'+row('State',m.state)+row('Service law',m.law)+
    row('Called up',lbl(fmt(m.called)))+row('Exempt or deferred',lbl(fmt(m.exempt)))+row('Did not report',lbl(fmt(m.evade)))+row('In training',lbl(fmt(m.trn.reduce((t,c)=>t+c.n,0))))+
    row('Joined units',lbl(m.gained.toFixed(1)+' brigade-eq.'))+(m.demob?row('Demobilized',lbl(fmt(m.demob))):'');
  if(mine)h+='<div class="tc">'+['PARTIAL','GENERAL'].map(s=>'<button data-mil="'+s+'" data-a3="'+p.a3+'"'+(m.state===s||m.state==='GENERAL'?' disabled':'')+'>ORDER '+s+' MOBILIZATION</button>').join(' ')+'</div>';
  h+='<h4>PERSONNEL AND TRAINING</h4>'+row('Aircrews',lbl(Math.round(m.crews)+' for '+Math.round(p.air)+' aircraft'))+row('Experience',Math.round(m.exp*100)+' %')+row('Aircrew lost',lbl(Math.round(m.lostCrews)))+(m.less?row('Lessons learned',m.less+' revision'+(m.less>1?'s':'')):'');
  h+='<h4>COMMAND</h4>'+(m.hq?row('Theatre commander',esc(m.hq.name))+(m.succ?row('Headquarters','disrupted ('+m.succ+' days)'):''):'<div>No wartime headquarters.</div>')+
    st.fronts.filter(f=>f.a===p.a3||f.b===p.a3).map(f=>row('Front with '+esc(st.c[f.a===p.a3?f.b:f.a].n),(m.intent[f.id]||'—')+(m.pend.some(q=>q.f===f.id)?' (new orders on the way)':'')+(m.fort[f.id]?' · dug in '+Math.round(m.fort[f.id]*100)+' %':''))+
      (mine?'<div class="tc">COMMAND: '+['ATTACK','HOLD','DEFEND','AUTO'].map(i=>'<button data-cmd="'+i+'" data-f="'+f.id+'" data-a3="'+p.a3+'" aria-pressed="'+((m.cmd&&m.cmd[f.id]||'AUTO')===i)+'">'+(i==='AUTO'?'DELEGATE':i)+'</button>').join(' ')+'</div>':'')).join('')+
    (mine?'<div style="font-size:10px;color:#8a9a92">Commander mode: your orders reach the front in 1-3 days (friction). DELEGATE hands the front back to the headquarters.</div>':'');
  h+='<h4>MUNITIONS (DAYS OF COMBAT SUPPLY)</h4>'+Object.keys(R.mun).map(k=>row(NAME[k],lbl(Math.round(m.mun[k]))+(m.mun[k]<8?' <span style="color:#e07a5f">LOW</span>':''))).join('')+
    (m.inb.length?'<div>Deliveries on the way: '+m.inb.map(d=>NAME[d.k]+' from '+esc(st.c[d.from].n)).join('; ')+'</div>':'');
  const bs=Object.values(m.bases);h+='<h4>AIRBASES</h4>'+row('Average condition',Math.round(baseCond(p,m)*100)+' %')+bs.filter(b=>b.c<.9).slice(0,6).map(b=>row(esc(b.n),Math.round(b.c*100)+' %'+(b.c<.5?' · dispersed':''))).join('')+
    row('Engineering capacity',Math.round(m.eng*100)+' %')+row('Airborne early warning / tankers',lbl(m.aew+' / '+m.tnk));
  const u=Object.values(m.uxo).reduce((t,v)=>t+v,0);if(u>0)h+='<h4>POST-BATTLE HAZARDS</h4>'+row('Contaminated former battle areas',Math.round(u*100)+' (index)')+row('Civilians hurt (estimate)',lbl(Math.round(m.harm)));
  return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.MILITARY=tab;
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-cmd]');if(!b||!W.st)return;const m=M(b.dataset.a3);m.cmd=m.cmd||{};const i=b.dataset.cmd;if(i==='AUTO')delete m.cmd[b.dataset.f];else m.cmd[b.dataset.f]=i;
  const f=W.st.fronts.find(q=>q.id===b.dataset.f);W.emit('ORDERS',{e:[b.dataset.a3],txt:'Your order to the '+W.st.c[b.dataset.a3].n+' forces on the front with '+(f?W.st.c[f.a===b.dataset.a3?f.b:f.a].n:'the enemy')+': '+(i==='AUTO'?'command delegated to the theatre headquarters':i.toLowerCase())+'.'});WARMAP.panel();});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-mil]');if(!b||!W.st)return;const m=M(b.dataset.a3);if(order(b.dataset.a3,b.dataset.mil,'your decision')){m.manual=W.st.t;}WARMAP.panel();});
W.mil={R,M,order,daily,tab,crewRatio,baseCond};
})();
