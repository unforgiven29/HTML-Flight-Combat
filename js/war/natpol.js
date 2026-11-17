/* =====================================================================================================================
   v349 — national names and politics (spec v49 ch.05 national identity, governments, regional cooperation, regional
   profiles; ch.06 national rosters and equipment; ch.11 civil aircraft by manufacturer).
   DATA (js/war/natdata.js, generated from data/nat/*.txt): equipment type names in service or on order for 69
   countries, and for 121 countries the system of government, the titles of the head of state and head of government,
   the legislature, its seats, the term and whether elections are competitive. Public-knowledge approximations,
   labelled in the panels; countries not in the tables keep generic classes and a generic government.
   PEOPLE stay fictional: names come from the leaders module's regional pools; only TITLES are real.
   * HEAD OF STATE and HEAD OF GOVERNMENT for every country in the table (one person where the offices are joined,
     e.g. a presidential republic). For countries at war the head of government is the leaders module's HEAD.
   * LEGISLATURE with generic, fictional parties (blocs such as "Centre-Right Alliance"), seats and a governing
     coalition (the largest party plus partners to a majority).
   * ELECTIONS on the national term where elections are competitive: the governing parties gain or lose with public
     support and the economy; seats by proportional allocation; coalition talks; a new head of government when the
     government changes; presidential races where the president is elected. In war, elections can be POSTPONED under
     martial law (event). Where elections are not competitive the vote is held and the leadership stays; one-party
     states hold a party congress; monarchies change the head of state only by succession; military governments promise
     a transition. Nothing here judges a country; it follows the table.
   * REGIONAL ORGANIZATIONS (public membership lists): NATO, EU, CSTO, SCO, ASEAN, GCC, African Union, OAS, Arab League.
     Members on the same side gain coalition cohesion; the EU coordinates sanctions; organizations send disaster aid.
   * REGIONAL PROFILES: per continent, how many countries elect their governments, monarchies, one-party states, etc.
   * EQUIPMENT NAMES: the ARSENAL tab names each class for countries in the table (e.g. "Multirole fighter: Su-35S,
     Su-30SM"); civil aircraft categories name their usual types by manufacturer.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.NATDATA||!WWAR.lead)return;
const W=WWAR,D=NATDATA,rn=Math.random,Ld=W.lead;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const SYS={PRESIDENTIAL:'Presidential republic',SEMI_PRESIDENTIAL:'Semi-presidential republic',PARLIAMENTARY:'Parliamentary republic',PARLIAMENTARY_EXEC_PRESIDENT:'Parliamentary republic with an executive president',
  CONST_MONARCHY:'Constitutional monarchy',CONST_MONARCHY_STRONG:'Constitutional monarchy (strong monarch)',CONST_MONARCHY_DOMINANT:'Constitutional monarchy (dominant party)',ABSOLUTE_MONARCHY:'Absolute monarchy',FEDERAL_MONARCHY:'Federation of monarchies',
  ONE_PARTY:'One-party state',PRESIDENTIAL_AUTH:'Presidential system (elections not competitive)',SEMI_PRESIDENTIAL_AUTH:'Semi-presidential system (elections not competitive)',THEOCRATIC_REPUBLIC:'Theocratic republic',THEOCRATIC_EMIRATE:'Theocratic emirate',
  MILITARY:'Military government',DIRECTORIAL:'Directorial federal republic',DIVIDED:'Divided government'};
const joined=P=>!P.hg;   // head of state is also head of government
const MON=s=>/MONARCHY/.test(s);
const ORG={NATO:'USA CAN GBR FRA DEU ITA ESP PRT NLD BEL LUX NOR DNK ISL TUR GRC POL CZE SVK HUN ROU BGR EST LVA LTU SVN HRV ALB MNE MKD FIN SWE',EU:'AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE',
  CSTO:'RUS BLR KAZ KGZ TJK ARM',SCO:'CHN RUS KAZ KGZ TJK UZB IND PAK IRN BLR',ASEAN:'BRN KHM IDN LAO MYS MMR PHL SGP THA VNM',GCC:'SAU ARE QAT KWT BHR OMN',
  'Arab League':'DZA BHR COM DJI EGY IRQ JOR KWT LBN LBY MRT MAR OMN PSE QAT SAU SOM SDN SYR TUN ARE YEM'};
const orgsOf=a3=>{const o=Object.entries(ORG).filter(([k,v])=>v.split(' ').includes(a3)).map(x=>x[0]);const c=WGEO.byA3.get(a3);if(c&&c.cont==='Africa')o.push('African Union');if(c&&/America/.test(c.cont||''))o.push('OAS');return o;};
const PARTY=['Centre-Right Alliance','Social Democrats','Liberal Party','Greens','National Conservatives','Regional Union','Workers\' Party','Christian Democrats','Civic Platform','People\'s Movement'];
const S=()=>W.st.pol||(W.st.pol={});
const title=(a3,k)=>{const P=D.POL[a3];if(!P)return k==='HS'?'Head of State':'Head of Government';return k==='HS'?P.hs:(P.hg||P.hs);};
/* ------------------------------------------------------------------ setting up a country's offices and legislature */
function init(p){const s=S();if(s[p.a3])return s[p.a3];const P=D.POL[p.a3],o=s[p.a3]={sys:P?P.sys:'UNSPECIFIED',hs:null,hg:null,parties:[],gov:[],next:0,pres:0,post:0,hist:[]};
  const mk=(k)=>Ld.person(p.a3,title(p.a3,k)+' of '+p.n,null).id;
  o.hs=mk('HS');o.hg=P&&!joined(P)?mk('HG'):o.hs;
  if(P&&P.seats){const n=P.el?4+((rn()*3)|0):1+((rn()*2)|0);let w=Array.from({length:n},()=>rn()+.2);if(!P.el)w[0]+=n*2;const t=w.reduce((a,b)=>a+b,0);const names=PARTY.slice().sort(()=>rn()-.5);
    o.parties=w.map((x,i)=>({n:P.el?names[i]:(i?names[i]:'Ruling party'),share:x/t,seats:0}));seats(o,P.seats);form(o);}
  o.next=W.st.t+24*365*(P?P.term:5)*(.2+rn()*.8);o.pres=P&&(/PRESIDENTIAL|SEMI/.test(P.sys))&&P.el?W.st.t+24*365*P.term*(.2+rn()*.8):0;return o;}
function seats(o,n){let left=n;const q=o.parties.map(x=>({x,v:x.share*n}));for(const e of q){e.x.seats=Math.floor(e.v);left-=e.x.seats;}q.sort((a,b)=>(b.v%1)-(a.v%1));for(let i=0;i<left;i++)q[i%q.length].x.seats++;}
function form(o){const P=o.parties.slice().sort((a,b)=>b.seats-a.seats),tot=P.reduce((t,x)=>t+x.seats,0);const g=[P[0]];let s=P[0].seats;for(const x of P.slice(1)){if(s>tot/2)break;g.push(x);s+=x.seats;}o.gov=g.map(x=>x.n);}
/* ------------------------------------------------------------------ the head of government of a country at war is the leaders module's HEAD */
function sync(p,o){if(!p.ldr)return;if(p.ldr.HEAD&&p.ldr.HEAD!==o.hg){const h=Ld.who(p.ldr.HEAD);if(h&&o._synced)o.hg=p.ldr.HEAD;else{if(W.st.lead&&W.st.lead.people)delete W.st.lead.people[p.ldr.HEAD];p.ldr.HEAD=o.hg;}   /* the generic head created by leaders.js is replaced by the titled one */}o._synced=1;if(joined(D.POL[p.a3]||{hg:''}))o.hs=o.hg;
  const hg=Ld.who(o.hg);if(hg&&!/ of /.test(hg.role||''))hg.role=title(p.a3,'HG')+' of '+p.n;}
function newHG(p,o,why){const n=Ld.person(p.a3,title(p.a3,'HG')+' of '+p.n,null);const old=Ld.who(o.hg);if(old){old.st=why;old.hist.push([W.st.t,why]);}o.hg=n.id;if(joined(D.POL[p.a3]||{hg:''}))o.hs=n.id;if(p.ldr)p.ldr.HEAD=n.id;return n;}
/* ------------------------------------------------------------------ elections and other transitions */
function elect(p,o){const st=W.st,P=D.POL[p.a3];if(!P)return;const war=bel(p)&&!st.over;
  if(war&&P.el&&((p.stab??.8)<.7||st.fronts.some(f=>(f.a===p.a3||f.b===p.a3)&&!f.cf&&f.sec.some(s=>s.off*(f.a===p.a3?-1:1)>5)))){o.next=st.t+24*180;o.post++;
    W.emit('ELECTION',{e:[p.a3],txt:p.n+' postpones its '+P.leg+' election under martial law; the vote will be held when conditions allow.'});return;}
  if(!P.el){o.next=st.t+24*365*P.term;const what=P.sys==='ONE_PARTY'?'The ruling party holds its congress':MON(P.sys)?'Consultative bodies meet':P.sys==='MILITARY'?'The military government renews its mandate and repeats a promise of transition':'An election is held; it is not competitive, and the leadership stays';
    W.emit('POLITICS',{e:[p.a3],txt:p.n+': '+what+'.'});return;}
  // competitive: governing parties move with public support, the economy and inflation
  const sup=p.sup??.6,ec=p.econ??1,inf=p.life?p.life.fin.infl:.03,swing=(sup-.55)*.35+(ec-1)*.4-inf*.3+(rn()-.5)*.12;
  for(const x of o.parties){x.share=Math.max(.01,x.share*(1+(o.gov.includes(x.n)?swing:-swing*.6)+(rn()-.5)*.15));}const t=o.parties.reduce((a,x)=>a+x.share,0);for(const x of o.parties)x.share/=t;
  const old=o.gov.slice();seats(o,P.seats);form(o);const changed=o.gov[0]!==old[0];o.next=st.t+24*365*P.term;
  const lead=o.parties.find(x=>x.n===o.gov[0]);let txt=p.n+' votes for the '+P.leg+'. '+o.parties.slice().sort((a,b)=>b.seats-a.seats).slice(0,3).map(x=>x.n+' '+x.seats).join(', ')+' seats. ';
  if(!joined(P)||P.sys==='PARLIAMENTARY_EXEC_PRESIDENT'){if(changed){const n=newHG(p,o,'left office after an election');txt+='A new government is formed by the '+o.gov.join(' and ')+'; '+n.name+' becomes '+title(p.a3,'HG')+'.';}else txt+='The '+o.gov.join(' and ')+' keep their majority.';}
  else txt+='The president\'s party '+(changed?'loses its majority in the legislature.':'keeps its majority.');
  o.hist.unshift([st.t,'LEG',o.gov.slice()]);o.hist.length=Math.min(o.hist.length,12);W.emit('ELECTION',{e:[p.a3],txt});}
function presidential(p,o){const st=W.st,P=D.POL[p.a3];if(!o.pres||st.t<o.pres)return;o.pres=st.t+24*365*P.term;const war=bel(p)&&!st.over;
  if(war&&(p.stab??.8)<.7){o.pres=st.t+24*180;W.emit('ELECTION',{e:[p.a3],txt:p.n+' postpones its presidential election under martial law.'});return;}
  const keep=rn()<cl(.35+((p.sup??.6)-.5)*1.2+((p.econ??1)-1)*.6,.1,.9);const hsOld=Ld.who(o.hs);
  if(keep){W.emit('ELECTION',{e:[p.a3],txt:p.n+' elects its '+P.hs+': '+(hsOld?hsOld.name:'the incumbent')+' wins another term.'});return;}
  const n=Ld.person(p.a3,P.hs+' of '+p.n,null);if(hsOld){hsOld.st='left office after an election';hsOld.hist.push([st.t,'lost the election']);}o.hs=n.id;if(joined(P)){o.hg=n.id;if(p.ldr)p.ldr.HEAD=n.id;}
  W.emit('ELECTION',{e:[p.a3],txt:p.n+' elects a new '+P.hs+': '+n.name+' (fictional) takes office'+(war?' in wartime':'')+'.'});}
function succession(p,o){const P=D.POL[p.a3];if(!P||!MON(P.sys)||rn()>1/(365*35))return;const old=Ld.who(o.hs);const n=Ld.person(p.a3,P.hs+' of '+p.n,null);if(old){old.st='died; succeeded by the heir';}o.hs=n.id;if(joined(P)){o.hg=n.id;if(p.ldr)p.ldr.HEAD=n.id;}
  W.emit('SUCCESSION',{e:[p.a3],txt:'The '+P.hs.toLowerCase()+' of '+p.n+' dies; '+n.name+' (fictional) succeeds under the rules of succession.'});}
W.daily.push(()=>{const st=W.st;if(!st)return;for(const p of Object.values(st.c)){if(!D.POL[p.a3])continue;const o=init(p);sync(p,o);if(st.t>=o.next)elect(p,o);presidential(p,o);succession(p,o);}});
/* ------------------------------------------------------------------ regional organizations */
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);if(!p.side)return k;const mine=orgsOf(p.a3);if(!mine.length)return k;const allies=Object.values(W.st.c).filter(q=>q!==p&&q.side===p.side&&bel(q)&&orgsOf(q.a3).some(o=>mine.includes(o)));return k*(1+Math.min(.04,allies.length*.004));};}
/* ------------------------------------------------------------------ equipment and airliner names */
const EQN=(a3,k)=>{const e=D.EQ[a3];return e&&e[k]||null;};
const AIRLINER={MAIN:'Airbus A320neo / A350, Boeing 737 MAX / 787',REG:'Embraer E-Jets, ATR 72, De Havilland Dash 8',CARGO:'Boeing 777F / 767F, Airbus A330F',BIZ:'Gulfstream, Bombardier Global, Dassault Falcon, Cessna Citation',GA:'Cessna 172, Piper PA-28, Cirrus SR22',MED:'Pilatus PC-12, Beechcraft King Air, Airbus H145'};
const AIRLINER_X={RUS:{MAIN:'Irkut MC-21, Sukhoi Superjet 100, older Airbus / Boeing',REG:'Sukhoi Superjet 100'},CHN:{MAIN:'Comac C919, Airbus A320 / A350, Boeing 737 / 787',REG:'Comac C909 (ARJ21)'},IRN:{MAIN:'older Airbus A300 / A310, Boeing 747, Fokker 100'}};
const civName=(a3,k)=>(AIRLINER_X[a3]&&AIRLINER_X[a3][k])||AIRLINER[k];
if(window.NATPANEL&&NATPANEL.tabs&&NATPANEL.tabs.ARSENAL&&W.forces){const _t=NATPANEL.tabs.ARSENAL;NATPANEL.tabs.ARSENAL=p=>{let h=_t(p);const e=D.EQ[p.a3];
  if(e){for(const c of W.forces.CAT){const n=e[c.k];if(!n)continue;h=h.replace('<span>'+c.n+'</span>','<span>'+c.n+': <i>'+n.replace(/[&<>]/g,'')+'</i></span>');}
    const inf=['RIFLE','MANPADS','ATGM'].filter(k=>e[k]).map(k=>({RIFLE:'Service rifle',MANPADS:'Portable air defence',ATGM:'Anti-tank guided missile'}[k]+': '+e[k])).join(' · ');
    const wpn=['AAM_IR','AAM_RF','PGM_B','PGM_C','ASM'].filter(k=>e[k]).map(k=>W.forces.CAT.find(c=>c.k===k).n+': '+e[k]).join(' · ');
    h='<div style="font-size:10px;color:#c9b46b">Type names: public-knowledge approximation (in service or on order), not an official inventory.</div>'+h+(wpn?'<h4>WEAPON TYPES</h4><div>'+wpn+'</div>':'')+(inf?'<h4>INFANTRY</h4><div>'+inf+'</div>':'');}
  else h='<div style="font-size:10px;color:#8a9a92">No type names in the national table for this country: generic classes only.</div>'+h;
  h+='<h4>CIVIL AIRCRAFT TYPES</h4>'+Object.keys(AIRLINER).map(k=>'<div class="row"><span>'+({MAIN:'Airliners',REG:'Regional',CARGO:'Cargo',BIZ:'Business jets',GA:'General aviation',MED:'Medical / utility'}[k])+'</span><b>'+civName(p.a3,k)+'</b></div>').join('');return h;};}
/* ------------------------------------------------------------------ the GOVERNMENT panel additions */
const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>',esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function tab(p){const st=W.st,P=D.POL[p.a3];if(!P)return'<div>This country is not in the national politics table: its government stays generic.</div>'+regions();const o=init(p),hs=Ld.who(o.hs),hg=Ld.who(o.hg);
  let h='<div style="font-size:10px;color:#c9b46b">System and titles: public-knowledge approximation. All people named are fictional.</div>'+row('System',SYS[P.sys]||P.sys)+row(esc(P.hs),hs?esc(hs.name):'—')+(P.hg?row(esc(P.hg),hg?esc(hg.name):'—'):'')+
    row('Legislature',esc(P.leg)+(P.seats?' · '+P.seats+' seats':''))+row('Term',P.term+' years')+row('Competitive elections',P.el?'yes':'no')+row('Next vote',W.date(o.next).slice(0,7))+(o.post?row('Postponed by war',o.post+' time'+(o.post>1?'s':'')):'')+
    (o.parties.length?'<h4>PARTIES (FICTIONAL)</h4>'+o.parties.slice().sort((a,b)=>b.seats-a.seats).map(x=>row(esc(x.n)+(o.gov.includes(x.n)?' (governing)':''),x.seats+' seats')).join(''):'')+
    row('Member of',orgsOf(p.a3).join(', ')||'—');
  return h+regions();}
function regions(){const st=W.st,R={};for(const c of WGEO.countries){const P=D.POL[c.a3];if(!P)continue;const k=c.cont||'Other';const r=R[k]||(R[k]={n:0,el:0,mon:0,one:0,mil:0});r.n++;if(P.el)r.el++;if(MON(P.sys))r.mon++;if(P.sys==='ONE_PARTY')r.one++;if(P.sys==='MILITARY')r.mil++;}
  return '<h4>REGIONAL PROFILES</h4>'+Object.entries(R).map(([k,r])=>row(esc(k),r.n+' in table · '+r.el+' competitive elections · '+r.mon+' monarchies'+(r.one?' · '+r.one+' one-party':'')+(r.mil?' · '+r.mil+' military':''))).join('');}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.POLITICS=tab;
W.natpol={S,init,elect,presidential,title,orgsOf,EQN,civName,tab,regions,SYS};
})();
