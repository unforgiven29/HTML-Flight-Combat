/* =====================================================================================================================
   SERVICE — chapter 06, third part (spec v49 ch.06): what keeps the forces running and how service is recorded.
     * AIRBASES AS INSTALLATIONS: class, facilities with their own condition, ground crews on shifts, parking and
       turnaround, base services and emergencies, quick-reaction alert, security, basing rights, construction, history.
     * SPARE PARTS AND COMPONENTS: component health and service life, repair levels (unit / intermediate / depot),
       stocks and demand, cannibalization, maintenance workforce, repair priorities, reliability learned over time.
     * PERSONNEL ADMINISTRATION AND HEADQUARTERS: specialties, vacancies and assignment matching, retention,
       promotion boards and appeals (fair process), headquarters types and staff branches, training facilities.
     * ENGINEERING PROJECTS (materials, progress, inspection, civil-military coordination) and EXPLOSIVE ORDNANCE
       DISPOSAL (hazard categories, EOD teams, clearance missions — abstract, no methods).
     * PROCUREMENT PROGRAMMES (requirement → competition → contract → development → production → fielding; risks,
       fictional suppliers; delivery and acceptance ceremonies; end-use conditions; training packages; licensed
       production) and CIVILIAN-FOUNDED PMCs (founder, registration, growth stages, staff, contracts, reputation,
       oversight, failure or merger) — fictional companies, separate from the combat PMCs of turncoat.js.
     * THE PLAYER'S SQUADRON: ground-crew contributions and recognition, pilot certificates and currency, aircraft
       release documents, weathering and repaint history of your airframe, a daily notice board.
     * NAMED ROSTERS (public knowledge): civilian aircraft models and fictional airlines; infantry weapon packages by
       national tradition; special-operations units; counter-drone, uncrewed ground and maritime systems.
   Numbers are ESTIMATES by rule. People and companies are fictional. Daily for countries at war.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));const bel=p=>W.bell?W.bell(p):!!p.side;const rn=()=>Math.random();const day=()=>Math.floor(W.st.t/24);
const pk=a=>a[Math.floor(rn()*a.length)];const pct=x=>Math.round((x||0)*100)+'%';const r2=x=>Math.round(x*1000)/1000;
const S=()=>{const st=W.st;if(!st.svc)st.svc={c:{},sq:null,seq:1};return st.svc;};
const nm=a3=>W.people&&W.people.name?W.people.name(a3,Math.random):(W.lead?W.lead.person(a3,'officer').name:'an officer');
/* ------------------------------------------------------------------ tables */
const FAC={rwy:'runway and taxiways',fuel:'fuel farm',ammo:'munitions storage',hgr:'hangars and workshops',shel:'hardened shelters',twr:'control tower',rad:'approach radar',med:'medical centre',fire:'fire and rescue'};
const COMP={ENG:['engines',900],RAD:['radars',1500],AV:['avionics',1200],HYD:['hydraulics',700],LG:['landing gear',800],SEAT:['ejection seats',2000],TRK:['tank tracks and road wheels',500],TRANS:['transmissions',1100],BRL:['gun barrels',600]};
const LVL=['UNIT (on the flight line)','INTERMEDIATE (base workshop)','DEPOT (industrial overhaul)'];
const SPEC=['pilot','weapons systems officer','aircraft technician','armourer','tank crewman','infantryman','artillery specialist','signaller','medic','engineer','logistician','intelligence analyst','air-defence operator','cyber specialist'];
const HQT=['Joint Headquarters','Theatre Command','Air Component Command','Land Component Command','Maritime Component Command','Corps Headquarters','Logistics Command'];
const STAFF=['J1 personnel','J2 intelligence','J3 operations','J4 logistics','J5 plans','J6 communications','J7 training and doctrine','J8 resources','J9 civil-military cooperation'];
const SCHOOL=['Flight Training School','Armour and Mechanised School','Artillery School','Infantry Training Centre','Engineer School','NCO Academy','Staff College','Live-Fire Ranges','Simulator Centre'];
const PROJ=['bridge repair','road repair','airfield runway repair','fortification belt','field water point','power line repair','pontoon crossing','helicopter landing site','field hospital','ammunition bunker'];
const HAZ={UXO:'unexploded ordnance',MINE:'mines',CLUST:'cluster submunition remnants',AMMO:'abandoned ammunition',IED:'improvised devices'};
const STG=['REQUIREMENT','COMPETITION','CONTRACT','DEVELOPMENT','PRODUCTION','FIELDING','COMPLETE'];
const FIRM=['Halvard Dynamics','Corvane Systems','Meridian Defence Works','Ostrava Heavy Industries','Kestrel Aerospace','Nordline Arms','Tarsis Electronics','Vellmark Shipyards'];
const NEED=['air-defence battery','armoured vehicle','artillery system','transport aircraft','reconnaissance drone','counter-drone system','frigate','radar network','training aircraft','tank upgrade'];
const PMCST=['STARTUP','LICENSED','ESTABLISHED','MAJOR'];const PMCSV=['site security','convoy escort','logistics support','training','demining','medical support','aviation maintenance'];
const CERT=[['TYPE','type rating'],['IFR','instrument rating'],['NVG','night / night-vision qualification'],['AAR','air-to-air refuelling'],['CQ','carrier qualification'],['FL','flight-lead qualification']];
const CREWR=['crew chief','avionics technician','armourer','engine technician','life-support technician','fuel specialist'];
const BULL=['Duty roster posted: alert crews change at 06:00.','Hydration and rest reminder from the flight surgeon.','Foreign-object walk on the main taxiway after breakfast.','Mail call at the squadron building at 17:00.','Weapons safety brief for all armourers on Thursday.','Simulator slots open for instrument currency.','Lost and found: a flight glove, left hand.','Chaplain available in the briefing room after the evening meal.'];
const CIVAC={'Mainline airliners — Airbus':['A220','A320neo','A321neo','A330-900','A350-900','A380'],'Mainline airliners — Boeing':['737-800','737 MAX 8','767-300ER','777-300ER','787-9','747-8'],
  'Legacy and other mainline':['MD-80','Tu-204','Il-96','Comac C919','Sukhoi Superjet 100'],'Regional':['Embraer E175','Embraer E195-E2','ATR 72-600','Dash 8-400','CRJ900'],'Cargo':['747-8F','777F','A330-200F','767-300F','An-124','Il-76TD'],
  'Business jets':['Gulfstream G650','Bombardier Global 7500','Dassault Falcon 8X','Cessna Citation Latitude','Embraer Phenom 300'],'Piston and light':['Cessna 172','Piper PA-28','Cirrus SR22','Diamond DA40'],
  'Turboprop and utility':['Cessna 208 Caravan','Pilatus PC-12','DHC-6 Twin Otter','Beechcraft King Air 350'],'Medical and public service':['Learjet 45 air ambulance','King Air air ambulance','Bombardier 415 water bomber','AW139 rescue helicopter']};
const AIRL=['Skyreach','Aurora Air','Bluecrest','Northwind','Coastline Express','Meridian Airways','Polar Cargo','Sunline'];
const TRAD={WEST:{mg:'FN Minimi / M249, FN MAG',pis:'Glock 17, SIG Sauer P320',snp:'Barrett M82, Accuracy International AXMC',gl:'M320, HK GLM',rl:'Carl Gustaf M4, AT4',sof:'special forces group'},
  SOV:{mg:'PKM / PKP Pecheneg, RPK-74',pis:'Makarov PM, Yarygin PYa',snp:'SVD Dragunov, ORSIS T-5000',gl:'GP-25 / GP-34',rl:'RPG-7V2, RPG-26',sof:'special purpose (spetsnaz) brigade'},
  CHN:{mg:'QJY-88, QJB-201',pis:'QSZ-92',snp:'QBU-88, QBU-10',gl:'QLZ-87',rl:'PF-98',sof:'special operations brigade'}};
const SOF={USA:'Delta Force, Navy SEALs, Green Berets, 75th Ranger Regiment',GBR:'SAS, SBS, Special Reconnaissance Regiment',FRA:'1er RPIMa, Commandos Marine, GIGN',DEU:'KSK, KSM',POL:'JW GROM, JW Komandosów, JW Formoza',
  NOR:'FSK, MJK',SWE:'SOG',FIN:'Utti Jaeger Regiment special forces',DNK:'Jægerkorpset, Frømandskorpset',CAN:'JTF 2, CSOR',AUS:'SASR, 2nd Commando Regiment',JPN:'Special Forces Group (JGSDF)',KOR:'707th Special Mission Group',
  RUS:'KSSO, GRU spetsnaz brigades',CHN:'Siberian Tiger, Oriental Sword (PLA special operations)',BLR:'5th Spetsnaz Brigade',IRN:'Quds Force (abstracted), Saberin unit',PRK:'Special Operations Forces (Light Infantry Training Guidance Bureau)',
  UKR:'SSO (Special Operations Forces)',ISR:'Sayeret Matkal, Shayetet 13',TUR:'Special Forces Command (ÖKK)',ITA:'9° Col Moschin, COMSUBIN',ESP:'MOE, FGNE',NLD:'KCT, MARSOF'};
const CUAS=['jammers (rifle-style and vehicle)','interceptor drones','gun-based point defence (e.g. Gepard, Pantsir, Skynex)','directed energy (trials)','detection radars and acoustic sensors'];
const UGV={WEST:'THeMIS, TRX, MUTT, Mission Master',SOV:'Uran-9, Uran-6 (mine clearance), Marker',CHN:'Sharp Claw 1, CETC UGVs'};const USV={WEST:'MANTAS T-12, Sea Baby, Orca XLUUV',SOV:'Poseidon (strategic, abstract), Galtel',CHN:'JARI USV, HSU001 UUV'};
const trad=a3=>{const n=window.NATDATA&&NATDATA.EQ[a3];const r=n&&n.RIFLE||'';return /QBZ|QBZ-|Type 0|Type 95|Type 56/.test(r)?'CHN':/AK|AKM|AKS|Kalash/.test(r)?'SOV':'WEST';};
/* ------------------------------------------------------------------ country record */
function rec(p){const X=S();let R=X.c[p.a3];if(R)return R;const big=p.gdp>1e6,mid=p.gdp>2e5;
  const m=W.st.mil&&W.st.mil[p.a3];const idents=m?Object.keys(m.bases).slice(0,3):[];
  R=X.c[p.a3]={inst:idents.map((id,i)=>({id,n:m.bases[id].n,cls:i===0?'MAIN OPERATING BASE':i===1?'FORWARD OPERATING BASE':'DISPERSAL FIELD',f:Object.fromEntries(Object.keys(FAC).map(k=>[k,1])),
      cmd:nm(p.a3),sh:3,fat:.2,qra:i===0?2:0,sec:'NORMAL',park:i===0?36:18,turn:45,host:'NATIONAL',proj:null,h:[]})),
    comp:Object.fromEntries(Object.keys(COMP).map(k=>[k,{stk:big?60:mid?30:12,cond:.85,q:[0,0,0],can:0,mtbf:COMP[k][1]}])),wk:{tech:big?9000:mid?3000:800,qual:.7},prio:'front-line fighters and air defence first',
    per:{vac:Object.fromEntries(SPEC.map(s=>[s,0])),ret:.92,boards:0,appeals:0,upheld:0},
    hq:HQT.slice(0,big?7:mid?5:3).map(n=>({n,cmd:nm(p.a3)})),sch:SCHOOL.slice(0,big?9:mid?6:4).map(n=>({n,cap:1,thr:0})),
    eng:{teams:big?40:mid?15:5,proj:[],done:0,insp:0},eod:{teams:big?30:mid?10:3,haz:Object.fromEntries(Object.keys(HAZ).map(k=>[k,0])),clr:0,mis:0},
    prog:[],pmc:[],ac:{fleet:{},air:[pk(AIRL)+' '+(p.n.split(' ')[0]),pk(AIRL)]}};
  for(const g in CIVAC)R.ac.fleet[g]=Math.round((p.gdp/1e5)*(g.includes('Mainline')?3:g.includes('light')?8:1)*(.5+rn()));
  return R;}
/* ------------------------------------------------------------------ daily steps */
function bases(p,R){const st=W.st,war=bel(p)&&!st.over,m=st.mil&&st.mil[p.a3];if(!m)return;let wint=false;try{const d=typeof W.date==='function'?W.date():null;wint=!!(d&&d.getMonth&&[11,0,1].includes(d.getMonth()));}catch(e){}
  for(const b of R.inst){const c=(m.bases[b.id]||{c:1}).c;
    // a hit on the base shows up in its facilities; engineers repair them one at a time
    if(c<.95){const k=pk(Object.keys(FAC));b.f[k]=r2(Math.min(b.f[k],c+rn()*.1));}for(const k in b.f)if(b.f[k]<1)b.f[k]=r2(Math.min(1,b.f[k]+.02*m.eng));
    b.turn=Math.round(45/Math.max(.3,(b.f.fuel+b.f.ammo+b.f.hgr)/3)*(1+b.fat*.5)*(wint?1.15:1));b.fat=r2(cl(b.fat+(war?.01:-.02)-(b.sh>=3?.005:0),0,1));
    if(b.fat>.7&&b.sh<4){b.sh++;note(b,'A fourth shift is added for the ground crews.');}
    b.sec=war&&c<.8?'HIGH':war?'ELEVATED':'NORMAL';b.qra=war&&b.cls!=='DISPERSAL FIELD'?4:b.cls==='MAIN OPERATING BASE'?2:0;
    if(war&&rn()<.004){const e=pk(['a fuel fire at the hydrant pit','a hot-brake fire after a heavy landing','a bird strike on take-off','a suspicious drone over the perimeter']);note(b,'Emergency: '+e+'; fire and rescue respond, no one is hurt.');W.emit('AIRBASE',{e:[p.a3],txt:'At '+b.n+' ('+p.n+'): '+e+'. The base fire and rescue crew responds; flying resumes within the hour.'});}
    if(wint&&rn()<.01)note(b,'Snow clearance and de-icing crews on standby through the night.');
    if(war&&!b.proj&&b.f.shel<1.01&&rn()<.004){b.proj={k:'more hardened shelters',d:60+Math.round(rn()*60)};note(b,'Construction begins: '+b.proj.k+'.');}
    if(b.proj&&--b.proj.d<=0){note(b,'Construction finished: '+b.proj.k+'.');b.park+=6;b.proj=null;}}}
function note(o,t){o.h.push([W.st.t,t]);if(o.h.length>4)o.h.shift();}
function spares(p,R){const war=bel(p)&&!W.st.over;const tempo=war?1:.25;let short=0;
  for(const k in R.comp){const c=R.comp[k];const fail=tempo*(5000/c.mtbf)*(.5+rn());c.cond=r2(cl(c.cond-fail*.002+.0015*(c.stk>0?1:0),.2,1));
    const need=Math.round(fail);if(c.stk>=need){c.stk-=need;c.q[0]+=need;}else{c.can+=need-c.stk;c.q[1]+=need-c.stk;c.stk=0;short++;}
    // repair levels: unit returns quickly, intermediate slower, depot slowest; output limited by qualified technicians
    const cap=R.wk.tech*R.wk.qual/1500;const a=Math.min(c.q[0],cap),b=Math.min(c.q[1],cap*.5),d=Math.min(c.q[2],cap*.2);c.q[0]-=a;c.q[1]-=b;c.q[2]+=Math.round(b*.3);c.q[2]-=d;c.stk+=Math.round(a*.9+b*.7+d);
    for(const i in c.q)c.q[i]=Math.round(c.q[i]);c.stk=Math.round(c.stk+(p.gdp>4e5?1:0));c.mtbf=Math.round(c.mtbf*(1+.0003));}   // reliability learned from maintenance data
  R.wk.qual=r2(cl(R.wk.qual+(war?-.0005:.001),.4,.95));R.short=short;
  if(short>=3&&!R._sp){R._sp=1;W.emit('MAINTENANCE',{e:[p.a3],cf:'ESTIMATED',txt:'Spare parts run short in '+p.n+': '+short+' component groups out of stock. Maintainers cannibalize grounded airframes and vehicles; the defence ministry orders depot overhauls and asks allies for parts.'});}}
function personnel(p,R){const war=bel(p)&&!W.st.over,P=R.per;const m=W.st.mil&&W.st.mil[p.a3];
  for(const s of SPEC)P.vac[s]=Math.round(cl(P.vac[s]+(war?rn()*20:-5)-(m?m.called*1e-6:0)*5,0,5000));P.ret=r2(cl(P.ret+(war?-.0003:.0002),.6,.98));
  if(rn()<.05){P.boards++;if(rn()<.15){P.appeals++;if(rn()<.4)P.upheld++;}}
  for(const s of R.sch){s.cap=r2(cl(s.cap-(war?.0005:-.001),.4,1.2));s.thr=Math.round(s.thr+s.cap*(war?3:1));}}
function engineering(p,R){const war=bel(p)&&!W.st.over,E=R.eng;if(war&&E.proj.length<4&&rn()<.05)E.proj.push({k:pk(PROJ),mat:Math.round(50+rn()*400),pr:0,civ:rn()<.4});
  for(const j of E.proj)j.pr=r2(Math.min(1,j.pr+E.teams/400*(.5+rn())));const fin=E.proj.filter(j=>j.pr>=1);for(const j of fin){E.done++;E.insp++;if(E.done<=2)W.emit('ENGINEERING',{e:[p.a3],txt:'Engineers in '+p.n+' finish a '+j.k+(j.civ?' with the civil roads authority':'')+'; inspectors sign it off for use.'});}
  E.proj=E.proj.filter(j=>j.pr<1);
  const D=R.eod;if(war){const act=W.st.fronts.filter(f=>(f.a===p.a3||f.b===p.a3)&&!f.cf).length||1;/* at war there is always some contamination */for(const k in D.haz)D.haz[k]+=Math.round(act*(k==='UXO'?40:k==='MINE'?25:k==='CLUST'?10:5)*rn());}
  const c=Math.round(D.teams*(war?2:6)*rn());let left=c;for(const k in D.haz){const x=Math.min(D.haz[k],left);D.haz[k]-=x;left-=x;}D.clr+=c-left;D.mis+=c>0?1:0;}
function procurement(p,R){const st=W.st,war=bel(p)&&!st.over;if(R.prog.length<3&&p.gdp>1e5&&rn()<(war?.02:.004)){const f=[pk(FIRM),pk(FIRM)].filter((x,i,a)=>a.indexOf(x)===i);
    R.prog.push({n:pk(NEED),stg:0,sup:f,win:null,cost:1,del:0,qty:Math.round(6+rn()*40),dlv:0,lic:rn()<.3,eu:rn()<.5,trn:true});}
  for(const g of R.prog){if(g.stg>=6)continue;if(rn()<.03){g.stg++;if(g.stg===2){g.win=pk(g.sup);W.emit('PROCUREMENT',{e:[p.a3],txt:p.n+' awards the '+g.n+' contract to '+g.win+' (fictional) after a competition'+(g.sup.length>1?' with '+g.sup.filter(x=>x!==g.win).join(', '):'')+(g.lic?'; part of it built under licence at home':'')+'.'});}}
    if(rn()<.01){g.cost=r2(g.cost*(1+rn()*.1));g.del+=Math.round(rn()*60);}
    if(g.stg===5&&g.dlv<g.qty){const n=Math.min(g.qty-g.dlv,1+Math.round(rn()*3));g.dlv+=n;if(g.dlv===n)W.emit('CEREMONY',{e:[p.a3],txt:'At an acceptance ceremony in '+p.n+', the first '+g.n+(n>1?'s are':' is')+' handed over by '+g.win+'; crews finished the supplier\'s training package last month.'});if(g.dlv>=g.qty)g.stg=6;}}
  R.prog=R.prog.filter(g=>g.stg<6||rn()>.01).slice(0,4);}
function pmcs(p,R){const st=W.st,war=bel(p)&&!st.over;if(war&&R.pmc.length<2&&rn()<.004){const f=nm(p.a3);R.pmc.push({n:pk(['Ironwood','Bastion','Greywatch','Sentinel','Harbor Shield','Arclight'])+' '+pk(['Security','Services','Solutions','Group']),fd:f,stg:0,cash:1,staff:12,rep:.5,lic:'PENDING',svc:pk(PMCSV),con:0,st:'ACTIVE'});
    W.emit('PMC',{e:[p.a3],txt:f+', a former soldier, registers a private security company in '+p.n+' offering '+R.pmc[R.pmc.length-1].svc+'; the licence is under review by the interior ministry (fictional).'});}
  for(const c of R.pmc){if(c.st!=='ACTIVE')continue;if(c.lic==='PENDING'&&rn()<.05)c.lic=rn()<.85?'GRANTED':'REFUSED';if(c.lic==='REFUSED'){c.st='CLOSED';continue;}
    if(rn()<.03){c.con++;c.cash=r2(c.cash+.3);c.staff+=Math.round(5+rn()*20);}c.cash=r2(c.cash-c.staff*.0004);c.rep=r2(cl(c.rep+(rn()-.48)*.02,0,1));
    if(c.staff>60&&c.stg<1)c.stg=1;if(c.staff>200&&c.stg<2)c.stg=2;if(c.staff>600&&c.stg<3)c.stg=3;
    if(c.cash<0){c.st=rn()<.5?'BANKRUPT':'MERGED';W.emit('PMC',{e:[p.a3],txt:c.n+' (fictional) '+(c.st==='BANKRUPT'?'goes bankrupt; its staff are paid from a wage-guarantee fund':'merges with a larger company')+'.'});}
    if(c.rep<.25&&!c.inv){c.inv=1;W.emit('PMC',{e:[p.a3],txt:'Inspectors in '+p.n+' open an inquiry into '+c.n+' after complaints from its employees; its licence is suspended pending the review.'});}}}
/* ------------------------------------------------------------------ the player's squadron: crew, certificates, airframe, bulletin */
function sq(){const X=S();if(X.sq)return X.sq;const st=W.st;const me=Object.values(st.c).find(q=>q.side===st.me&&q.al==='CORE')||Object.values(st.c).find(q=>q.al==='CORE');const a3=me?me.a3:'USA';
  return X.sq={a3,crew:CREWR.map(r=>({r,n:nm(a3),pts:0,aw:null})),cert:CERT.map(c=>({k:c[0],cur:c[0]==='CQ'?0:60})),air:{tail:(a3.slice(0,2)+'-'+(100+Math.floor(rn()*800))),wear:.1,paint:[[st.t,'factory finish']],rel:'RELEASED TO SERVICE'},board:[]};}
function sqDaily(){const Q=sq();for(const c of Q.cert)c.cur=Math.max(0,c.cur-1);Q.air.wear=r2(Math.min(1,Q.air.wear+.002));if(Q.air.wear>.7&&rn()<.05){Q.air.paint.push([W.st.t,'repainted (worn camouflage renewed)']);if(Q.air.paint.length>4)Q.air.paint.splice(1,1);Q.air.wear=.15;}
  Q.board=[pk(BULL),pk(BULL)].filter((x,i,a)=>a.indexOf(x)===i);const P=W.people&&W.st.ppl&&W.st.ppl.c[Q.a3];if(P&&P.ppl[0])Q.board.push('Happy birthday wishes this week to '+P.ppl[0].n+'\'s family from the squadron.');
  const lap=Q.cert.filter(c=>c.cur===0&&c.k!=='CQ');if(lap.length)Q.board.push('Currency lapsed: '+lap.map(c=>CERT.find(x=>x[0]===c.k)[1]).join(', ')+' — book a sortie or simulator slot.');}
function afterSortie(){const Q=sq();for(const c of Q.cert)if(c.k!=='CQ')c.cur=Math.min(90,c.cur+30);Q.air.wear=r2(Math.min(1,Q.air.wear+.03));
  const c=pk(Q.crew);c.pts++;if(c.pts===5&&!c.aw){c.aw='Commendation for maintenance excellence';W.emit('AWARD',{e:[Q.a3],txt:c.n+', '+c.r+' in the player\'s squadron (fictional), receives a commendation: five sorties turned on time without a fault.'});}}
if(window.WSORTIE&&WSORTIE.finish){const _f=WSORTIE.finish;WSORTIE.finish=function(){const r=_f.apply(this,arguments);try{if(W.st)afterSortie();}catch(e){}return r;};}
/* ------------------------------------------------------------------ the daily loop and a bounded effect */
function daily(){const st=W.st;if(!st||st.over&&!st.post)return;for(const p of Object.values(st.c)){if(!p.pop||!bel(p))continue;const R=rec(p);
    try{bases(p,R);spares(p,R);personnel(p,R);engineering(p,R);procurement(p,R);pmcs(p,R);}catch(e){console.warn('[service]',p.a3,e);}}try{sqDaily();}catch(e){}}
W.daily.push(()=>{try{daily();}catch(e){console.warn('[service]',e);}});
// component health shows in readiness: a force short of parts flies and drives less (bounded to -8 %)
{const _r=W.rdy;W.rdy=function(p){const v=_r.apply(this,arguments);const R=p&&W.st&&W.st.svc&&W.st.svc.c[p.a3];if(!R)return v;const c=Object.values(R.comp).reduce((t,x)=>t+x.cond,0)/Object.keys(R.comp).length;return v*(1-Math.max(0,.85-c)*.25);};}
/* ------------------------------------------------------------------ SERVICE tab */
const row=(a,b)=>'<div style="display:flex;justify-content:space-between;gap:8px"><span>'+a+'</span><b>'+b+'</b></div>';
function tab(p){const st=W.st;if(!st)return'<div>No war running.</div>';if(!bel(p))return'<div>'+esc(p.n)+' is not at war: the service records are kept for countries at war.</div>';const R=rec(p),t=trad(p.a3);
  let h='<div style="color:#8a9a92;font-size:10px">Estimates by rule. People and companies fictional; named equipment is public knowledge.</div><h4>AIRBASES</h4>';
  for(const b of R.inst)h+='<div><b>'+esc(b.n)+'</b> · '+b.cls.toLowerCase()+' · commander '+esc(b.cmd)+' · '+b.host.toLowerCase()+'</div>'+row('facilities',Object.entries(b.f).map(([k,v])=>FAC[k].split(' ')[0]+' '+pct(v)).join(' · '))+
    row('crews · fatigue · turnaround',b.sh+' shifts · '+pct(b.fat)+' · '+b.turn+' min')+row('parking · alert aircraft · security',b.park+' · '+b.qra+' on QRA · '+b.sec.toLowerCase())+(b.proj?row('construction',b.proj.k+' ('+b.proj.d+' days)'):'')+
    b.h.map(x=>'<div style="font-size:10px;color:#9ab">day '+Math.floor(x[0]/24)+' — '+esc(x[1])+'</div>').join('');
  h+='<h4>SPARE PARTS AND COMPONENTS</h4>'+Object.entries(R.comp).map(([k,c])=>row(COMP[k][0],'health '+pct(c.cond)+' · stock '+c.stk+' · queue '+c.q.join('/')+' · cannibalized '+c.can+' · MTBF '+c.mtbf+' h')).join('')+
    row('technicians · qualified',R.wk.tech+' · '+pct(R.wk.qual))+row('repair priority',R.prio)+'<div style="font-size:10px">Queues: '+LVL.join(' / ')+'</div>';
  const P=R.per;h+='<h4>PERSONNEL ADMINISTRATION</h4>'+row('retention',pct(P.ret))+row('promotion boards · appeals · upheld',P.boards+' · '+P.appeals+' · '+P.upheld)+'<div style="font-size:10px">Vacancies: '+SPEC.filter(s=>P.vac[s]).map(s=>s+' '+P.vac[s]).join(' · ')+'</div>';
  h+='<h4>HEADQUARTERS AND STAFF</h4>'+R.hq.map(x=>row(x.n,esc(x.cmd))).join('')+'<div style="font-size:10px">Staff branches: '+STAFF.join(' · ')+'</div>';
  h+='<h4>TRAINING FACILITIES</h4>'+R.sch.map(s=>row(s.n,'capacity '+pct(s.cap)+' · '+s.thr+' trained')).join('');
  const E=R.eng,D=R.eod;h+='<h4>ENGINEERING</h4>'+row('teams · done · inspected',E.teams+' · '+E.done+' · '+E.insp)+E.proj.map(j=>row(j.k+(j.civ?' (with civil authorities)':''),pct(j.pr)+' · '+j.mat+' t materials')).join('');
  h+='<h4>EXPLOSIVE ORDNANCE DISPOSAL</h4>'+row('EOD teams · missions · items cleared',D.teams+' · '+D.mis+' · '+D.clr)+Object.keys(HAZ).map(k=>row(HAZ[k]+' (estimated)',D.haz[k])).join('');
  h+='<h4>PROCUREMENT PROGRAMMES</h4>'+(R.prog.map(g=>row(g.n+' ×'+g.qty,STG[g.stg].toLowerCase()+(g.win?' · '+esc(g.win):'')+' · cost ×'+g.cost.toFixed(2)+(g.del?' · '+g.del+' days late':'')+' · delivered '+g.dlv+(g.eu?' · end-use conditions':'')+(g.lic?' · licensed production':''))).join('')||'<div>none open</div>');
  h+='<h4>PRIVATE COMPANIES FOUNDED BY CIVILIANS</h4>'+(R.pmc.map(c=>row(esc(c.n)+' (founder '+esc(c.fd)+')',(c.st==='ACTIVE'?PMCST[c.stg].toLowerCase():c.st.toLowerCase())+' · '+c.svc+' · staff '+c.staff+' · licence '+c.lic.toLowerCase()+' · reputation '+pct(c.rep))).join('')||'<div>none yet</div>');
  h+='<h4>INFANTRY PACKAGE ('+t+' pattern)</h4>'+row('rifle',esc((window.NATDATA&&NATDATA.EQ[p.a3]||{}).RIFLE||'—'))+row('machine guns',TRAD[t].mg)+row('pistols',TRAD[t].pis)+row('sniper rifles',TRAD[t].snp)+row('grenade launchers',TRAD[t].gl)+row('rockets',TRAD[t].rl)+
    row('special operations',esc(SOF[p.a3]||'national '+TRAD[t].sof))+row('uncrewed ground · maritime',UGV[t]+' · '+USV[t])+'<div style="font-size:10px">Counter-drone: '+CUAS.join(' · ')+'</div>';
  h+='<h4>CIVIL AVIATION</h4>'+row('airlines (fictional)',R.ac.air.map(esc).join(', '))+Object.entries(R.ac.fleet).map(([g,n])=>row(g,n+' aircraft · '+CIVAC[g].slice(0,4).join(', '))).join('');
  const Q=sq();if(Q.a3===p.a3){h+='<h4>YOUR SQUADRON</h4>'+row('airframe '+Q.air.tail,Q.air.rel.toLowerCase()+' · wear '+pct(Q.air.wear))+'<div style="font-size:10px">Paint history: '+Q.air.paint.map(x=>'day '+Math.floor(x[0]/24)+' '+x[1]).join(' · ')+'</div>'+
    '<div style="border:1px solid #6a7;padding:4px;margin:4px 0;font-size:10px"><b>CERTIFICATES</b>'+Q.cert.map(c=>'<div>'+CERT.find(x=>x[0]===c.k)[1]+' — '+(c.cur?'current, '+c.cur+' days left':'not current')+'</div>').join('')+'</div>'+
    '<b>GROUND CREW</b>'+Q.crew.map(c=>row(esc(c.n)+', '+c.r,c.pts+' sorties turned'+(c.aw?' · '+c.aw:''))).join('')+'<b>NOTICE BOARD</b>'+Q.board.map(x=>'<div style="font-size:10px">📌 '+esc(x)+'</div>').join('');}
  return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.SERVICE=tab;
W.service={S,rec,daily,tab,sq,afterSortie,COMP,FAC,HAZ,STG,CIVAC,TRAD,SOF,trad};
})();
