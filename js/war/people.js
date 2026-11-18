/* =====================================================================================================================
   PEOPLE — chapter 08 (population, demographics, migration and social structure; individuals, identity, personality and
   daily life; families, households and community; health, injury, disability, care and veterans; education and skills).
   Builds on life.js (demography, services, housing), society.js (cohorts, households), military.js (the draft),
   deep.js (families followed in LIFE), census.js and cemetery.js (accounting of the dead), leaders.js (fictional name
   pools), infantry.js (wounds). Two layers:
     1. AGGREGATE, per country at war (and weekly for large neutrals): migration by category and legal status, coalition
        totals, attitudes, welfare and pensions, labour market and unions, inequality and mobility, languages and
        interpreters, health network and outbreaks, pilot medicine, psychological health, disability, education.
        Every figure is an ESTIMATE from a stated rule, never a count of real people.
     2. SAMPLED INDIVIDUALS: a few FICTIONAL people per country at war, each with ONE identity record. Personality,
        appearance, voice, interests, values and languages are DERIVED from a stored seed (never stored as strings),
        so the record stays small and stable across saves. Each person has a household, a job, goals, a network,
        a short life log, health, and possessions. Names are unique across the campaign.
   Sensitive matters (suicide, disability, children) are handled as aggregates or with respectful, non-graphic text;
   nobody is ever blamed as a group; content can be hidden in settings (W.people.opt.sensitive).
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));const bel=p=>W.bell?W.bell(p):!!p.side;const day=()=>Math.floor(W.st.t/24);const rn=()=>Math.random();
const hash=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h;};
const R32=seed=>{let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};};   // xorshift: stable per seed
const fmt=n=>{n=Math.round(n||0);return n>=1e6?(n/1e6).toFixed(1)+' M':n>=1e4?Math.round(n/1e3)+'k':String(n);};
const pct=x=>Math.round((x||0)*100)+'%';
const S=()=>{const st=W.st;if(!st.ppl)st.ppl={c:{},names:{},seq:1,host:{}};return st.ppl;};
const cities=a3=>(W.st.city&&W.st.city[a3])||[];
const opt={sensitive:true};
/* ------------------------------------------------------------------ static tables (descriptors are derived, not stored) */
const MIG=['IDP','REFUGEE','ASYLUM','LABOUR','RETURNEE','EVACUEE','STUDENT'];
const LEGAL={IDP:'citizen, displaced at home',REFUGEE:'temporary protection abroad',ASYLUM:'asylum claim pending',LABOUR:'work visa',RETURNEE:'citizen, returned',EVACUEE:'evacuated under an agreement',STUDENT:'student visa'};
const DRIVERS=['fighting near home','loss of housing','loss of work','family reunification','fear of conscription','education abroad'];
const TRAITS=['openness','conscientiousness','extraversion','agreeableness','steadiness'];   // five dimensions, 0-1, none is "good"
const EMO=['calm under stress','quick to worry','slow to anger','wears feelings openly','private about feelings'];
const SOCI=['keeps a few close friends','knows everyone on the street','prefers working alone','natural organiser','listens more than talks'];
const THINK=['plans carefully','decides fast','asks for advice','trusts experience over rules','reads everything first'];
const WORK=['takes pride in craft','driven by duty','works for the family','restless, likes change','steady and reliable'];
const ORIENT=['rooted in the neighbourhood','faith community','sports club','volunteers locally','keeps to the family'];
const HOBBY=['football','chess','fishing','gardening','music','cooking','reading','hiking','woodwork','photography','cycling','card games','painting','radio and electronics'];
const VALUES=['family first','honesty','fairness','faith','freedom','security','learning','community','independence'];
const GOALS=['finish a degree','keep the family together','rebuild the house','start a small business','see a child through school','return home','find steady work','retire near family','learn a trade','emigrate after the war'];
const JOBS=['teacher','nurse','electrician','farmer','shopkeeper','driver','engineer','clerk','mechanic','doctor','builder','student','retired','soldier','pilot','volunteer medic','factory worker','software developer'];
const HAIR=['black','dark brown','brown','light brown','fair','red','grey'];const EYES=['brown','hazel','green','blue','grey'];const BUILD=['slight','average','stocky','tall and lean','broad'];
const CLOTH={soldier:'field uniform, worn boots',pilot:'flight suit and squadron patch',nurse:'scrubs under a winter coat',doctor:'white coat over a jumper',farmer:'work jacket and rubber boots',student:'hoodie and a backpack',retired:'a good coat kept for years'};
const VOICE=['low and slow','quick and bright','soft-spoken','gravelly','precise, a little formal','warm, with a regional accent'];
const PETS=['dog','cat','two cats','a parrot','chickens','a goat'];
const LANG={EUROPE_E:['national language','Russian','English'],EUROPE_W:['national language','English','French'],ASIA_E:['national language','English'],MIDEAST:['Arabic','English','French'],DEFAULT:['national language','English']};
const HOLI=[[1,'New Year'],[60,'Spring Festival'],[128,'Remembrance Day'],[180,'Midsummer'],[244,'Harvest Festival'],[268,'National Day'],[305,'Day of the Dead'],[358,'Winter Holiday']];
const DIS={PHYS:'physical / mobility',SENS:'sensory (sight, hearing)',COG:'cognitive / neurological (head injury)',PSY:'psychological (post-traumatic stress, depression)'};
const DEVICES={PHYS:'prosthesis, wheelchair, adapted home',SENS:'hearing aids, screen reader, guide dog',COG:'memory aids, structured routine',PSY:'counselling, peer group'};
const WITHDRAW=['TEMPORARILY UNFIT','LIGHT DUTY','REASSIGNED','MEDICAL DISCHARGE','RETURNED TO DUTY'];
const STAGES=a=>a<5?'early childhood':a<13?'childhood':a<18?'adolescence':a<26?'young adult':a<45?'adult':a<65?'middle age':'older age';
const region=a3=>{const r=W.lead&&W.lead.REG?W.lead.REG(a3):'';return /SLAV|RUS|EAST/.test(r)?'EUROPE_E':/EUR|WEST|NORD/.test(r)?'EUROPE_W':/ASIA|CJK|JAP|KOR|CHI/.test(r)?'ASIA_E':/ARAB|MENA|MID/.test(r)?'MIDEAST':'DEFAULT';};
/* ------------------------------------------------------------------ names: one authoritative record, unique campaign-wide */
function taken(n){const X=S();if(X.names[n])return true;const L=W.st.lead&&W.st.lead.people;if(L)for(const k in L)if(L[k].name===n)return true;return false;}
function name(a3,rnd){const P=W.lead&&W.lead.POOL&&W.lead.REG?W.lead.POOL[W.lead.REG(a3)]:null;const G=P?P[0]:['Alex','Sam','Mira','Dan','Lena','Ivo','Nora','Teo'],F=P?P[1]:['Novak','Marin','Kalder','Brenn','Osten','Varga'];
  const pk=a=>a[Math.floor(rnd()*a.length)];let n=pk(G)+' '+pk(F);
  // a duplicate is resolved naturally: another given name, then another family name, then a middle initial — never "Name 2"
  for(let i=0;i<12&&taken(n);i++)n=(i<6?pk(G)+' '+n.split(' ').pop():pk(G)+' '+pk(F));
  for(let i=0;taken(n);i++){const p=n.split(' ');n=p[0]+' '+'ABCDEFGHJKLMNPRSTVW'[Math.floor(rnd()*19)]+'. '+p[p.length-1];if(i>40)n=pk(G)+' '+pk(F)+'-'+pk(F);}
  S().names[n]=1;return n;}
/* ------------------------------------------------------------------ a person: stored minimum + derived profile */
// stored: {id,a3,n,s(seed),by(birth year),sx,job,hh,st,h:{w,dis,wd},log:[[t,k,txt]],net:[ids],g,par,kids}
function make(a3,o){const X=S(),id='P'+(X.seq++),s=(hash(a3+id+W.st.t)^(o&&o.s||0))>>>0,r=R32(s);const age=o&&o.age!=null?o.age:Math.floor(4+r()*80);
  const job=o&&o.job||(age<18?'student':age>66?'retired':JOBS[Math.floor(r()*JOBS.length)]);
  const P={id,a3,n:name(a3,r),s,by:2026-age,sx:r()<.5?'F':'M',job,hh:o&&o.hh||id,st:'HOME',h:{w:.6+r()*.3,dis:null,wd:null},log:[],net:[],g:Math.floor(r()*GOALS.length),par:o&&o.par||null,kids:[]};
  note(P,'BIO','Born '+P.by+'; '+STAGES(age)+'; '+job+'.');return P;}
function prof(P){const r=R32(P.s);const pk=a=>a[Math.floor(r()*a.length)];const tr={};for(const t of TRAITS)tr[t]=Math.round(r()*100)/100;
  const age=2026+Math.floor(W.st.t/24/365)-P.by;return{age,stage:STAGES(age),tr,emo:pk(EMO),soc:pk(SOCI),think:pk(THINK),work:pk(WORK),orient:pk(ORIENT),
    hob:[pk(HOBBY),pk(HOBBY)].filter((x,i,a)=>a.indexOf(x)===i),val:[pk(VALUES),pk(VALUES)].filter((x,i,a)=>a.indexOf(x)===i),
    // contradictions are allowed: a cautious planner may still be quick to anger
    look:{hair:age>60?'grey':pk(HAIR),eyes:pk(EYES),build:pk(BUILD),h:Math.round((P.sx==='F'?158:170)+r()*22)},cloth:CLOTH[P.job]||'everyday clothes, layered for the season',
    voice:pk(VOICE),langs:LANG[region(P.a3)].slice(0,1+Math.floor(r()*LANG[region(P.a3)].length)).map((l,i)=>[l,i?['basic','conversational','fluent'][Math.floor(r()*3)]:'native']),
    pet:r()<.45?pk(PETS):null,home:pk(['rented flat','owned flat','family house','farmhouse','room in a shared house']),car:r()<.55?pk(['old hatchback','family estate car','pickup','motorbike']):null,nw:Math.round(8+r()*90),bday:1+Math.floor(r()*365),goal:GOALS[P.g]};}
function note(P,k,txt){P.log.push([W.st?W.st.t:0,k,txt]);if(P.log.length>5)P.log.splice(1,1);}   // the birth entry is kept; the rest is a rolling window
/* ------------------------------------------------------------------ a country record */
function rec(p){const X=S();let R=X.c[p.a3];if(R)return R;
  R=X.c[p.a3]={mig:{IDP:0,REFUGEE:0,ASYLUM:0,LABOUR:Math.round(p.pop*.02),RETURNEE:0,EVACUEE:0,STUDENT:Math.round(p.pop*.002)},drv:[0,0,0,0,0,0],remit:0,integ:.7,
    att:{sup:.6,weary:.25,opp:.15},
    dem:{med:30+(p.gdp/Math.max(1,p.pop)*1e3>.02?12:0),dep:.5,fert:2},pen:{fund:1,arr:0,idx:1},wel:{rec:Math.round(p.pop*.06),pay:1,hh:3},
    lab:{wf:Math.round(p.pop*.47),un:.06,vac:0,wage:1,real:1,cond:.7,union:.2,strike:0,short:{}},soc:{gini:.32,hdi:.75,mob:.5,trust:.6},
    lng:{interp:Math.round(p.pop/2e5),req:0,met:0},
    hl:{hosp:Math.max(3,Math.round(p.pop/1.5e5)),mob:0,beds:1,supply:30,surv:.7,out:null,vac:0,rehab:0,ltc:0,fin:1},
    pil:{fat:.2,gs:0,eject:0,rescued:0,review:0,ret:0,grounded:0},
    psy:{distress:.1,support:.5,line:0,prog:0,loss:0},
    dis:{PHYS:0,SENS:0,COG:0,PSY:0,dev:0,rehab:0},wd:{TEMPORARILY_UNFIT:0,LIGHT_DUTY:0,REASSIGNED:0,MEDICAL_DISCHARGE:0,RETURNED:0},
    edu:{schools:Math.round(p.pop/1200),open:1,remote:0,uni:Math.max(1,Math.round(p.pop/1e6)),voc:Math.max(1,Math.round(p.pop/4e5)),def:0,drain:0,part:[]},
    pets:{n:Math.round(p.pop*.12),shel:Math.max(2,Math.round(p.pop/1e6)),res:0,lost:0},
    hhf:{save:4,cons:{food:.3,housing:.25,energy:.1,transport:.1,health:.06,edu:.04,other:.15},stand:1},
    cal:{last:-1},ppl:[],fam:[]};
  if(bel(p)){const n=p.al==='CORE'?10:3;for(let i=0;i<n;i++){const P=make(p.a3);R.ppl.push(P);}
    // households and family trees: pair adults, give them children and parents from the same record
    const A=R.ppl.filter(P=>prof(P).age>=25&&prof(P).age<=60).slice(0,p.al==='CORE'?2:1);for(const a of A){const k=make(p.a3,{age:Math.max(4,prof(a).age-28),hh:a.id,par:a.id});a.kids.push(k.id);R.ppl.push(k);}
    for(const P of R.ppl){const o=R.ppl.filter(q=>q!==P);P.net=o.sort((x,y)=>(x.s%97)-(y.s%97)).slice(0,3).map(q=>q.id);}}
  return R;}
/* ------------------------------------------------------------------ daily steps (aggregate) */
function migration(p,R){const war=bel(p),d=p.disp||0,M=R.mig;M.IDP=Math.round(d*.75);const outF=war?d*.002:0;M.REFUGEE+=Math.round(outF*.7);M.ASYLUM+=Math.round(outF*.3);
  if(!war||W.st.over){const back=Math.round((M.REFUGEE+M.IDP)*.003);M.RETURNEE+=back;M.REFUGEE=Math.max(0,M.REFUGEE-back);}
  if(war&&rn()<.01)M.EVACUEE+=Math.round(p.pop*1e-4);
  // asylum claims are decided over time (legal status changes)
  const dec=Math.round(M.ASYLUM*.01);M.ASYLUM-=dec;M.REFUGEE+=dec;
  const e=p.ecn;R.drv=[d,(p.life&&p.life.house&&p.life.house.lost)||0,R.lab.un*R.lab.wf,M.REFUGEE*.1,((W.st.mil&&W.st.mil[p.a3]||{}).evade)||0,M.STUDENT].map(Math.round);
  // hosts: the nearest non-belligerent large countries receive refugees; integration capacity falls as numbers rise
  const H=S().host;if(M.REFUGEE>0){H[p.a3]=M.REFUGEE;}const ab=M.REFUGEE+M.ASYLUM+M.LABOUR;R.integ=cl(.9-ab/Math.max(1,p.pop)*3,.2,.9);
  R.remit=Math.round(M.LABOUR*.35*R.lab.wage*400/1e6*30);   // M$ a month: labour migrants send about a third of a modest wage
  if(war&&M.REFUGEE+M.IDP>p.pop*.002&&!R._mig1){R._mig1=1;W.emit('MIGRATION',{e:[p.a3],cf:'ESTIMATED',txt:'About '+fmt(M.REFUGEE)+' people from '+p.n+' have crossed into neighbouring countries; host towns open reception centres, schools take children, and work permits are fast-tracked. Integration capacity: '+pct(R.integ)+'.'});}}
function totals(){const st=W.st,T={};for(const p of Object.values(st.c)){if(!p.side||!p.pop)continue;const k=p.side+':'+(p.al||'?');const t=T[k]||(T[k]={res:0,disp:0,abroad:0,mob:0,n:0});const R=S().c[p.a3];
    t.res+=p.pop;t.disp+=p.disp||0;t.abroad+=R?R.mig.REFUGEE+R.mig.ASYLUM:0;t.mob+=((st.mil&&st.mil[p.a3]||{}).called)||0;t.n++;}return T;}
function attitudes(p,R){const s=p.sup??.6,ex=p.exh||0;R.att.sup=cl(s,0,1);R.att.opp=cl(.08+ex*.3+(1-s)*.25,0,.6);R.att.weary=cl(1-R.att.sup-R.att.opp,0,1);}
function welfare(p,R){const war=bel(p),L=p.life||{},e=p.ecn;const f=L.fin||{infl:.03};
  R.dem.fert=cl((L.dem?L.dem.birth*1000/14:2)*(war?.85:1),.9,5);R.dem.dep=cl(.45+(R.dem.med-30)*.008+((W.st.mil&&W.st.mil[p.a3]||{}).called||0)/Math.max(1,p.pop)*2,.3,1);
  R.pen.fund=cl(R.pen.fund-(war?.0006:-.0002)-R.dem.dep*.0002,.2,1.2);R.pen.idx=cl(R.pen.idx+(f.infl||0)/365-(war?.0003:0),.6,2);R.pen.arr=R.pen.fund<.5?Math.round(p.pop*.003):0;
  R.wel.rec=Math.round(p.pop*(.06+(p.disp||0)/Math.max(1,p.pop)*.8+R.lab.un*.3));R.wel.pay=cl(R.pen.fund+.1,.4,1);
  R.hhf.save=cl(R.hhf.save+(war?-.01:.005)-(f.infl||0)*.02,0,8);R.hhf.stand=cl(R.lab.real*(e?(e.food+e.energy)/2:1),.3,1.2);
  R.hhf.cons.energy=cl(.1+(e?(1-e.energy)*.15:0),.05,.3);R.hhf.cons.food=cl(.3+(e?(1-e.food)*.2:0),.2,.55);
  if(R.pen.arr&&!R._pen){R._pen=1;W.emit('WELFARE',{e:[p.a3],cf:'ESTIMATED',txt:'Pension payments in '+p.n+' run late as the fund falls to '+pct(R.pen.fund)+' of its prewar level; the government borrows to pay arrears and raises the minimum pension for displaced people.'});}
  if(war&&R.dem.fert<1.3&&!R._pol){R._pol=1;W.emit('WELFARE',{e:[p.a3],txt:p.n+' announces a demographic policy: a birth grant, longer parental leave and free kindergartens for families who lost their homes.'});}}
function labour(p,R){const war=bel(p),m=(W.st.mil&&W.st.mil[p.a3])||{called:0},e=p.ecn,L=R.lab;
  const away=m.called||0;L.vac=Math.round(away*.6);L.un=cl(.06+(war?(1-(p.econ??1))*.2:0)+(p.disp||0)/Math.max(1,p.pop)*.5-away/Math.max(1,L.wf)*.8,.02,.35);
  L.short={'skilled trades':cl(away/Math.max(1,L.wf)*6,0,1),'health care':cl(R.hl.mob*.5+(war?.1:0),0,1),'drivers and logistics':cl(away/Math.max(1,L.wf)*4,0,1),'teachers':cl(1-R.edu.open,0,1)};
  L.wage=cl(L.wage+(L.vac>L.un*L.wf*.2?.0004:-.0001),.8,1.6);const inf=(p.life&&p.life.fin&&p.life.fin.infl)||.03;L.real=cl(L.real+(L.wage-1)*.0003-inf/365,.4,1.3);
  L.cond=cl(L.cond-(war?.0006:-.0004),.3,.9);L.union=cl(L.union+(L.real<.85?.0003:0),.05,.6);
  if(war&&L.short['skilled trades']>.05&&!R._lab){R._lab=1;W.emit('LABOUR',{e:[p.a3],cf:'ESTIMATED',txt:'Factories in '+p.n+' report shortages of welders, electricians and drivers as workers are called up; women, older workers and displaced people are retrained in short courses, and the employers\' federation asks for deferments for key trades.'});}
  if(L.real<.8&&L.union>.2&&!L.strike&&rn()<.01){L.strike=7;W.emit('LABOUR',{e:[p.a3],txt:'Unions in '+p.n+' strike for wages indexed to prices; essential services keep a minimum crew. Talks with the employers\' federation begin.'});}
  if(L.strike>0&&--L.strike===0){L.wage+=.04;W.emit('LABOUR',{e:[p.a3],txt:'A collective agreement in '+p.n+' ends the strike: wages rise about 4 % and night-shift safety rules are restored.'});}}
function cohesion(p,R){const X=R.soc,war=bel(p);X.gini=cl(X.gini+(war?.00008:-.00004)+(R.hhf.save<1?.00005:0),.22,.6);X.hdi=cl(X.hdi-(war?.00006:-.00003)-(1-R.edu.open)*.00004,.3,.95);
  X.mob=cl(X.mob-(war?.0002:-.0001)+(R.edu.open-.8)*.0001,.1,.9);X.trust=(p.life&&p.life.trust)||.6;}
function language(p,R){const war=bel(p),M=R.mig;R.lng.req=Math.round((M.REFUGEE+M.ASYLUM)/400+(war?120:10));R.lng.met=Math.min(R.lng.req,R.lng.interp);if(R.lng.req>R.lng.interp&&rn()<.02)R.lng.interp+=Math.round(R.lng.interp*.05+5);}
function health(p,R){const st=W.st,war=bel(p),H=R.hl,L=p.life&&p.life.health;const load=L?L.load:1;H.beds=cl(1.4-load*.6,.05,1);H.mob=war?Math.min(H.hosp,Math.round(H.hosp*.15)+1):0;
  H.supply=cl(H.supply+(war?-.15:.1)+(R._aid?.3:0),2,45);H.surv=cl(H.surv+(war?-.0005:.0005),.3,.95);H.fin=cl(H.fin-(war?.0004:-.0002),.4,1.2);
  if(L&&L.outbreak>0&&!H.out){H.out={d:L.outbreak,k:['cholera','measles','influenza'][Math.floor(rn()*3)]};H.vac+=Math.round(p.pop*.002);}if(H.out&&--H.out.d<=0)H.out=null;
  if(H.supply<7&&!R._aid){R._aid=1;W.emit('HEALTH',{e:[p.a3],cf:'ESTIMATED',txt:'Hospitals in '+p.n+' hold about '+Math.round(H.supply)+' days of essential medicines; the health ministry asks the public to keep chronic prescriptions short, and an international medicines airlift begins.'});}
  const cas=((p.gndLoss||0)+(p.casK||0));H.rehab=Math.round(H.rehab*.995+(war?p.pop*2e-6:0));H.ltc=Math.round(H.ltc*.999+H.rehab*.002);}
function pilots(p,R){const war=bel(p),P=R.pil;const sort=((W.st.air&&W.st.air[p.a3])||{}).sor||0;P.fat=cl(P.fat+(war?.004:-.01)+sort*1e-5,0,1);P.gs+=war?Math.round(rn()*3):0;
  // ejections come from aircraft lost in the war; survivors go through rescue, medical review, and either return or are reassigned
  if(war&&rn()<.03){P.eject++;if(rn()<.75){P.rescued++;P.review++;}}if(P.review>0&&rn()<.05){P.review--;if(rn()<.7)P.ret++;else P.grounded++;}
  if(P.fat>.7&&!R._fat){R._fat=1;W.emit('AIR',{e:[p.a3],txt:'Flight surgeons in '+p.n+' order crew rest: fatigue in the fighter squadrons is high, and two-day stand-downs rotate through the wings.'});}}
function psych(p,R,H){const war=bel(p),X=R.psy;const loss=(p.life&&p.life.house&&p.life.house.lost)||0;X.distress=cl(X.distress+(war?.0015:-.002)+(p.disp||0)/Math.max(1,p.pop)*.01-X.support*.0015,.03,.7);
  X.support=cl(X.support+(X.prog?.002:0)-(war?.0005:0),.1,.95);if(war&&X.distress>.25&&!X.prog){X.prog=1;X.line=1;W.emit('HEALTH',{e:[p.a3],txt:p.n+' opens a national mental-health support line and trains peer supporters in every brigade and shelter; chaplains and counsellors visit units after hard fighting.'});}
  // deaths by suicide: a rare aggregate ESTIMATE only, reported without detail; prevention lowers it
  X.loss+=war&&rn()<X.distress*.02*(1-X.support*.6)?1:0;}
function disability(p,R){const war=bel(p),D=R.dis,w=R.wd;if(!war)return;const k=['PHYS','SENS','COG','PSY'][Math.floor(rn()*4)];const n=Math.round(p.pop*1e-6*(1+rn()*3));D[k]+=n;
  D.dev=Math.round((D.PHYS+D.SENS)*.8);D.rehab=Math.round((D.PHYS+D.COG+D.PSY)*.6);
  // medical withdrawal pathways for service members (fitness is separate from membership)
  const m=Math.round(n*.5);w.TEMPORARILY_UNFIT+=m;const mv=Math.round(w.TEMPORARILY_UNFIT*.05);w.TEMPORARILY_UNFIT-=mv;w.RETURNED+=Math.round(mv*.5);w.LIGHT_DUTY+=Math.round(mv*.2);w.REASSIGNED+=Math.round(mv*.15);w.MEDICAL_DISCHARGE+=mv-Math.round(mv*.5)-Math.round(mv*.2)-Math.round(mv*.15);}
function education(p,R){const war=bel(p),E=R.edu,c=cities(p.a3);const hot=c.filter(x=>(x.shel||0)>0).length/Math.max(1,c.length);
  E.open=cl(1-hot*.8-(war?.05:0),.1,1);E.remote=cl(war?1-E.open:0,0,.9);const m=(W.st.mil&&W.st.mil[p.a3])||{};E.def=Math.round((m.called||0)*.04);
  E.drain=Math.round(E.drain+(war?R.mig.REFUGEE*1e-4:-E.drain*.002));
  if(war&&E.open<.7&&!R._edu){R._edu=1;W.emit('EDUCATION',{e:[p.a3],txt:'Schools near the front in '+p.n+' move lessons underground or online; teachers record classes for children in shelters, and exams are postponed rather than cancelled.'});}
  if(E.part.length<3&&rn()<.004){const q=Object.values(W.st.c).find(x=>x.side===p.side&&x!==p&&x.gdp>p.gdp);if(q){E.part.push(q.a3);W.emit('EDUCATION',{e:[p.a3,q.a3],txt:'Universities in '+q.n+' host displaced students and researchers from '+p.n+' under a partnership agreement; credits transfer both ways.'});}}}
function animals(p,R){const war=bel(p),A=R.pets;if(!war)return;const d=(p.disp||0)*.12;A.lost=Math.round(d*.1);A.res+=rn()<.1?Math.round(5+rn()*40):0;
  if(A.res>200&&!R._pets){R._pets=1;W.emit('SOCIETY',{e:[p.a3],txt:'Animal-rescue volunteers in '+p.n+' have evacuated about '+A.res+' pets and farm animals from front-line villages; vets treat them free at '+A.shel+' shelters.'});}}
function calendar(p,R){const d=day(),dy=d%365,h=HOLI.find(x=>x[0]===dy);if(h&&R.cal.last!==d){R.cal.last=d;const war=bel(p);
  W.emit('CALENDAR',{e:[p.a3],txt:p.n+' marks '+h[1]+(war?': quieter than usual — families gather where they can, and soldiers on the line get a hot meal and calls home.':'.')});}}
/* ------------------------------------------------------------------ sampled individuals: a day in a life */
const WHERE={HOME:'at home',DISPLACED:'in a shelter away from home',SERVING:'with a unit',WOUNDED:'in hospital',ABROAD:'abroad',MISSING:'missing',CAPTURED:'held as a prisoner',DIED:'died'};
function lives(p,R){const st=W.st,war=bel(p),d=day();for(const P of R.ppl){if(P.st==='DIED')continue;const pr=prof(P),r=R32(P.s+d);
    // birthdays and life stages
    if(d%365===pr.bday%365)note(P,'MILESTONE','Turned '+pr.age+(pr.age===18?' — now an adult; registered for service where the law requires it':'')+'.');
    if(!war)continue;
    // displacement follows the country's: a share of people leave home
    if(P.st==='HOME'&&r()<(p.disp||0)/Math.max(1,p.pop)*.05){P.st=r()<.2?'ABROAD':'DISPLACED';regoal(P,P.st==='ABROAD'?'find steady work':'return home','left home');note(P,'MOVE',P.st==='ABROAD'?'Left the country with the family; legal status: temporary protection.':'Left home for a shelter in a safer town; the house is locked up with a neighbour\'s key.');}
    // service: adults of conscription age may be called up; students may defer
    const m=st.mil&&st.mil[p.a3];if(P.st==='HOME'&&pr.age>=18&&pr.age<=55&&m&&m.state!=='PEACETIME'&&r()<.004&&P.job!=='student'){P.st='SERVING';P.job2=P.job;P.job='soldier';note(P,'SERVICE','Called up; reported to the training centre. Former job held open by law.');}
    if(P.st==='SERVING'){const x=r();if(x<.004){P.st='WOUNDED';P.h.w=cl(P.h.w-.2,0,1);const k=['PHYS','SENS','COG','PSY'][Math.floor(r()*4)];P.h.dis=r()<.35?k:null;note(P,'MEDICAL','Wounded and evacuated by the medics'+(P.h.dis?'; a lasting '+DIS[P.h.dis]+' impairment':'')+'.');}
      else if(x<.0045){P.st='MISSING';note(P,'MISSING','Reported missing after an attack; the family is notified and tracing begins.');}
      else if(x<.0049){P.st='CAPTURED';note(P,'CAPTURED','Captured; the family is told through the Red Shield tracing service. Exchange lists include the name.');}
      else if(x<.0052){P.st='DIED';note(P,'DIED','Killed in action. Buried with honours; the family receives support'+(P.kids.length?'; the estate passes to the children':'')+'.');for(const id of P.net){const q=R.ppl.find(z=>z.id===id);if(q){q.h.w=cl(q.h.w-.15,0,1);note(q,'LOSS','Lost '+P.n+', a close friend; leaned on family and the unit chaplain.');}}}}
    else if(P.st==='WOUNDED'&&r()<.02){P.h.wd=P.h.dis?(r()<.5?'MEDICAL DISCHARGE':'REASSIGNED'):'RETURNED TO DUTY';P.st=P.h.wd==='RETURNED TO DUTY'?'SERVING':'HOME';if(P.st==='HOME'&&P.job2){P.job=P.job2;}
      if(P.h.dis)regoal(P,'learn a trade','after the injury');note(P,'MEDICAL','Medical board: '+P.h.wd.toLowerCase()+(P.h.dis?'. Rehabilitation and '+DEVICES[P.h.dis]+'.':'.'));}
    else if((P.st==='MISSING'||P.st==='CAPTURED')&&r()<.01){const was=P.st;P.st='SERVING';note(P,'RETURN',was==='CAPTURED'?'Released in an exchange.':'Found alive; returned through the lines.');}
    else if(P.st==='DISPLACED'&&st.over&&r()<.02){P.st='HOME';note(P,'MOVE','Returned home; repairs begin.');}
    // wellbeing: stress from danger and loss, buffered by relationships, routine, faith or community
    P.h.w=cl(P.h.w+(P.st==='HOME'?.002:-.003)+(pr.orient==='faith community'||pr.orient==='volunteers locally'?.001:0)+(R.psy.prog?.001:0),0,1);
    if(r()<.02)note(P,'DAY',day1(P,pr));}}
function day1(P,pr){const where=WHERE[P.st];const h=pr.hob[0];
  const L={HOME:['Worked a shift as '+P.job+'; queued for bread; '+h+' in the evening.','Helped a neighbour tape windows; called relatives abroad.','Took the child to school by the long road; air-raid alert at noon.'],
    DISPLACED:['Registered with the shelter office; looked for work as '+(P.job2||P.job)+'.','Volunteered in the shelter kitchen; '+h+' with other families in the evening.'],
    SERVING:['Dug in with the platoon; wrote a letter home.','Guard duty, then sleep in the dugout; '+h+' on the phone during a quiet hour.'],WOUNDED:['Physiotherapy in the morning; visitors in the afternoon.'],ABROAD:['Language class, then a job interview.','Sent money home; a video call with family.']};
  const a=L[P.st]||['A quiet day '+where+'.'];return a[Math.floor(R32(P.s+W.st.t)()*a.length)];}
// goals change with life: displacement, wounds and loss reshape what people want (a constrained choice, not a script)
function regoal(P,g,why){const i=GOALS.indexOf(g);if(i<0||P.g===i)return;P.g=i;note(P,'GOAL','New goal: '+g+' ('+why+').');}
/* ------------------------------------------------------------------ the daily loop */
function rnd4(o){for(const k in o){const v=o[k];if(typeof v==='number'&&!Number.isInteger(v))o[k]=Math.round(v*1e4)/1e4;else if(v&&typeof v==='object'&&k!=='ppl')rnd4(v);}for(const P of o.ppl||[])P.h.w=Math.round(P.h.w*1e3)/1e3;}   // save size
function daily(){const st=W.st;if(!st||st.over&&!st.post)return;const d=day();for(const p of Object.values(st.c)){const war=bel(p);if(!p.pop||(!war&&p.pop<5e7))continue;
    if(!war&&(d+(hash(p.a3)%7))%7)continue;if(W.lod&&!war&&!W.lod(p,d))continue;const R=rec(p);
    try{migration(p,R);attitudes(p,R);welfare(p,R);labour(p,R);cohesion(p,R);language(p,R);health(p,R);pilots(p,R);psych(p,R);disability(p,R);education(p,R);animals(p,R);calendar(p,R);lives(p,R);rnd4(R);}catch(e){console.warn('[people]',p.a3,e);}}}
W.daily.push(()=>{try{daily();}catch(e){console.warn('[people]',e);}});
// bounded effects on the war: labour shortages and a strike cost a little defence production; pilot fatigue a little readiness
{const _p=W.prodK;W.prodK=(p,k)=>{const R=W.st&&W.st.ppl&&W.st.ppl.c[p.a3];if(!R)return _p(p,k);const s=R.lab.short['skilled trades']||0;return _p(p,k)*(1-s*.06)*(R.lab.strike>0?.96:1);};}
{const _r=W.rdy;W.rdy=function(p){const v=_r.apply(this,arguments);const R=p&&W.st&&W.st.ppl&&W.st.ppl.c[p.a3];return R?v*(1-Math.max(0,R.pil.fat-.6)*.15):v;};}
/* ------------------------------------------------------------------ presentation: POPULATION and LIVES tabs */
const row=(a,b)=>'<div style="display:flex;justify-content:space-between;gap:8px"><span>'+a+'</span><b>'+b+'</b></div>';
const bar=x=>'<span style="display:inline-block;width:60px;height:6px;background:#233;vertical-align:middle"><span style="display:block;height:6px;width:'+Math.round(cl(x,0,1)*60)+'px;background:#6fa"></span></span>';
function popTab(p){const st=W.st;if(!st)return'<div>No war running.</div>';const R=rec(p);const T=totals();
  let h='<div style="color:#8a9a92;font-size:10px">Estimates by rule (not counts of real people). Residence, citizenship, allegiance and displacement are separate fields. Nobody is blamed as a group.</div>';
  h+='<h4>COALITION TOTALS</h4>'+Object.entries(T).sort().map(([k,t])=>row(k.replace(':',' · '),fmt(t.res)+' residents · '+fmt(t.disp)+' displaced · '+fmt(t.abroad)+' abroad · '+fmt(t.mob)+' called up')).join('');
  h+='<h4>MIGRATION (BY CATEGORY · LEGAL STATUS)</h4>'+MIG.map(k=>row(k.toLowerCase()+' <span style="color:#8a9a92">('+LEGAL[k]+')</span>',fmt(R.mig[k]))).join('')+row('integration capacity in host towns',bar(R.integ))+row('remittances home','~'+R.remit+' M$/month');
  h+='<div style="font-size:10px">Drivers: '+DRIVERS.map((x,i)=>x+' '+fmt(R.drv[i])).join(' · ')+'</div>';
  h+='<h4>PUBLIC ATTITUDES</h4>'+row('support the war effort',bar(R.att.sup)+' '+pct(R.att.sup))+row('weary, want talks',pct(R.att.weary))+row('opposed',pct(R.att.opp));
  h+='<h4>DEMOGRAPHY, PENSIONS, WELFARE</h4>'+row('median age · dependency ratio · fertility',R.dem.med+' · '+R.dem.dep.toFixed(2)+' · '+R.dem.fert.toFixed(2))+row('pension fund · indexation',pct(R.pen.fund)+' · '+R.pen.idx.toFixed(2)+(R.pen.arr?' · '+fmt(R.pen.arr)+' in arrears':''))+row('people on benefits',fmt(R.wel.rec))+row('household savings (months)',R.hhf.save.toFixed(1))+row('living standard',bar(R.hhf.stand))+'<div style="font-size:10px">Household spending: '+Object.entries(R.hhf.cons).map(([k,v])=>k+' '+pct(v)).join(' · ')+'</div>';
  const L=R.lab;h+='<h4>LABOUR</h4>'+row('workforce · unemployment · vacancies',fmt(L.wf)+' · '+pct(L.un)+' · '+fmt(L.vac))+row('wage index · real wage',L.wage.toFixed(2)+' · '+L.real.toFixed(2))+row('conditions · union density',pct(L.cond)+' · '+pct(L.union)+(L.strike?' · ON STRIKE':''))+'<div style="font-size:10px">Shortages: '+Object.entries(L.short).map(([k,v])=>k+' '+pct(v)).join(' · ')+'</div>';
  h+='<h4>COHESION AND MOBILITY</h4>'+row('inequality (Gini) · human development',R.soc.gini.toFixed(2)+' · '+R.soc.hdi.toFixed(2))+row('social mobility · trust',pct(R.soc.mob)+' · '+pct(R.soc.trust))+'<div style="font-size:10px">By city: '+cities(p.a3).slice(0,5).map(c=>esc(c.n)+' '+((c.shel||0)>0?'under fire':'stable')).join(' · ')+'</div>';
  h+='<h4>LANGUAGE ACCESS</h4>'+row('interpreters · requests met',fmt(R.lng.interp)+' · '+fmt(R.lng.met)+'/'+fmt(R.lng.req));
  const H=R.hl;h+='<h4>HEALTH</h4>'+row('hospitals · mobile teams · bed availability',H.hosp+' · '+H.mob+' · '+pct(H.beds))+row('medicine stocks (days) · surveillance',Math.round(H.supply)+' · '+pct(H.surv))+row('outbreak',H.out?H.out.k+' ('+H.out.d+' days left; '+fmt(H.vac)+' vaccinated)':'none')+row('in rehabilitation · long-term care',fmt(H.rehab)+' · '+fmt(H.ltc))+row('health finance',pct(H.fin));
  const P=R.pil;h+='<h4>AIRCREW MEDICINE</h4>'+row('fatigue',bar(P.fat))+row('high-G events · ejections · rescued',P.gs+' · '+P.eject+' · '+P.rescued)+row('in medical review · returned to flying · grounded',P.review+' · '+P.ret+' · '+P.grounded);
  h+='<h4>PSYCHOLOGICAL HEALTH</h4>'+row('distress (estimate)',bar(R.psy.distress))+row('support and protective factors',bar(R.psy.support))+row('support line · peer programme',R.psy.line?'open':'—')+(opt.sensitive?row('deaths by suicide (estimate)',String(R.psy.loss)):'')+'<div style="font-size:10px">If you or someone you know is struggling, please reach out to a local crisis line or someone you trust.</div>';
  const D=R.dis;h+='<h4>DISABILITY AND MEDICAL WITHDRAWAL</h4>'+Object.keys(DIS).map(k=>row(DIS[k],fmt(D[k])+' <span style="color:#8a9a92">('+DEVICES[k]+')</span>')).join('')+row('with assistive devices · in rehabilitation',fmt(D.dev)+' · '+fmt(D.rehab))+'<div style="font-size:10px">'+Object.entries(R.wd).map(([k,v])=>k.replace(/_/g,' ').toLowerCase()+' '+fmt(v)).join(' · ')+'</div>';
  const E=R.edu;h+='<h4>EDUCATION</h4>'+row('schools · universities · vocational colleges',fmt(E.schools)+' · '+E.uni+' · '+E.voc)+row('in-person · remote',pct(E.open)+' · '+pct(E.remote))+row('students deferred from service · brain drain',fmt(E.def)+' · '+fmt(E.drain))+row('partner universities',E.part.map(a=>esc(W.st.c[a].n)).join(', ')||'—');
  h+='<h4>ANIMALS</h4>'+row('pets · shelters · rescued',fmt(R.pets.n)+' · '+R.pets.shel+' · '+R.pets.res);
  return h;}
const UI={sel:null};
function livesTab(p){const st=W.st;if(!st)return'<div>No war running.</div>';const R=rec(p);if(!R.ppl.length)return'<div>No individual lives are followed for '+esc(p.n)+' (only for countries at war).</div>';
  let h='<div style="color:#8a9a92;font-size:10px">Fictional people. Personality describes tendencies, not fate or worth. Click a name.</div>';
  h+=R.ppl.map(P=>{const pr=prof(P);return'<div class="row" data-pv="'+P.id+'" style="cursor:pointer"><span>'+esc(P.n)+' <span style="color:#8a9a92">'+pr.age+', '+esc(P.job)+'</span></span><b>'+esc(WHERE[P.st])+'</b></div>';}).join('');
  const P=R.ppl.find(x=>x.id===UI.sel)||R.ppl[0];const pr=prof(P);const nm=id=>{const q=R.ppl.find(z=>z.id===id);return q?esc(q.n):'';};
  h+='<h4>'+esc(P.n)+'</h4>'+row('born · life stage',P.by+' · '+pr.stage)+row('appearance',pr.look.h+' cm, '+pr.look.build+', '+pr.look.hair+' hair, '+pr.look.eyes+' eyes')+row('clothing · voice',esc(pr.cloth)+' · '+pr.voice)
    +row('temperament',TRAITS.map(t=>t.slice(0,4)+' '+Math.round(pr.tr[t]*10)).join(' '))+row('style',pr.emo+'; '+pr.soc+'; '+pr.think+'; '+pr.work)+row('community',pr.orient)+row('interests · values',pr.hob.join(', ')+' · '+pr.val.join(', '))
    +row('languages',pr.langs.map(x=>x[0]+' ('+x[1]+')').join(', '))+row('goal',pr.goal)+row('wellbeing',bar(P.h.w))+(P.h.dis?row('impairment',DIS[P.h.dis]+' · '+DEVICES[P.h.dis]):'')+(P.h.wd?row('medical board',P.h.wd.toLowerCase()):'')
    +row('family',(P.par?'parent '+nm(P.par):'')+(P.kids.length?' children '+P.kids.map(nm).join(', '):'')||'—')+row('close to',P.net.map(nm).join(', '))+row('home · vehicle · net worth',pr.home+(P.st==='DISPLACED'||P.st==='ABROAD'?' (left behind)':'')+' · '+(pr.car||'none')+' · ~'+pr.nw+'k')+(pr.pet?row('pet',pr.pet):'')
    +'<div style="font-size:10px">'+P.log.slice().reverse().map(e=>'<div>day '+Math.floor(e[0]/24)+' · '+e[1].toLowerCase()+' — '+esc(e[2])+'</div>').join('')+'</div>';
  return h;}
if(window.NATPANEL&&NATPANEL.tabs){NATPANEL.tabs.POPULATION=popTab;NATPANEL.tabs.LIVES=livesTab;
  const _r=NATPANEL.tabs.PEOPLE_REGISTER;NATPANEL.tabs.PEOPLE_REGISTER=p=>{const R=W.st&&S().c[p.a3];const x=R&&R.ppl.length?'<h4>FOLLOWED LIVES</h4>'+R.ppl.map(P=>'<div class="row"><span>'+esc(P.n)+'</span><b>'+esc(P.job)+' · '+esc(WHERE[P.st])+'</b></div>').join(''):'';return(_r?_r(p):'')+x;};}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-pv]');if(!t)return;UI.sel=t.dataset.pv;if(window.NATPANEL&&NATPANEL.render)NATPANEL.render();});
W.people={S,rec,make,prof,name,taken,totals,daily,lives,popTab,livesTab,opt,MIG,LEGAL,DIS,WITHDRAW};
})();
