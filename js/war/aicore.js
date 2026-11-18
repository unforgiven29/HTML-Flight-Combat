/* =====================================================================================================================
   v394 — institutional AI (spec v49 ch.15: shared decision framework, decision record, bounded autonomy, institutions
   that behave differently, planning horizons, command intent, high-pressure behaviour, policy trade-offs, explainability,
   after-action review, organisational memory, learning safeguards, counter-adaptation, doctrine and training revisions,
   coordination and conflict, AI reporting, a rare-event director with preconditions and fairness, city / institutional /
   corporate histories, naval auxiliaries, emission control). Gameplay-level and abstract; every rule is a constant in
   A below; every decision and change is an event with its reason. It sits on top of strategy.js (postures), learn.js
   (attack doctrine), ops.js (air tasking, air defence), military.js (mobilisation) and never replaces them.

   INSTITUTIONS (every country at war): GOV government · GS general staff · AF air force · NAVY (coastal) · LOG logistics
   command · INT intelligence service · MFA foreign ministry · FIN finance ministry · CD civil defence. Each has a
   PROFILE — mandate, priorities over the shared objectives (territory, force preservation, civilian protection,
   economy, alliance, deterrence), risk appetite, planning horizon and decision cycle in days, and an AUTHORITY list of
   the decisions it may take alone. Personality comes from the country's leaders (leaders.js) where they exist.

   ONE DECISION FRAMEWORK: an institution's turn lists options, each with expected gains per objective, cost and risk;
   the utility is the profile's priorities x gains - cost - risk x (1 - risk appetite) + what its memory says about
   that kind of choice. Information quality (intel.js) widens the uncertainty and lowers confidence. The record keeps
   the intent, the options with their scores, the choice, the deciding factor, the confidence and the expectation, and
   a review date at the end of the planning horizon. Decisions outside an institution's authority go to the government
   (bounded autonomy); refusals and disagreements between institutions are recorded and arbitrated by the government's
   priorities. Front commanders act within the general staff's intent and may deviate only when the local force ratio
   moves past a threshold — and report it.

   REVIEW AND LEARNING: at the review date the outcome is measured from what that side could observe (its own losses,
   ground gained, the intelligence-filtered estimate of the enemy — never the hidden truth); the after-action review
   becomes a lesson for that kind of decision. Safeguards: at least two reviews before a lesson changes behaviour, each
   change bounded (±0.12), a change reverted if the next reviews go worse, a learning rate from the leaders' pragmatism.
   Memory decays 2 % a month and loses a third when the institution's head is replaced. The other side counter-adapts
   to the lessons it can see in the fighting. Monthly, enough confident lessons become a DOCTRINE REVISION (the attack
   doctrine of learn.js, training priorities for readiness).

   RARE EVENTS (the director): coup attempts, mutinies, desertion waves, epidemics, industrial accidents, spy scandals,
   a leader's illness, a general's defection — each with preconditions in the war state, a stated cause, a per-country
   cooldown, at most one rare event in the world every five days, and never aimed at the player.

   HISTORIES: every event that names a city goes into that city's history; institutions keep their decision histories;
   three fictional defence companies per country keep theirs (contracts, output, strikes on their plants, labour
   shortages). The HISTORY tab shows them; the DECISIONS tab shows institutions, records, lessons and doctrine.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;const rn=()=>Math.random();const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const A={recMax:160,lessonStep:.12,lessonMin:2,decay:.02,forget:.33,dirGap:5,dirCool:60,devRatio:.3,aarDays:{GOV:60,GS:14,AF:5,NAVY:14,LOG:7,INT:7,MFA:30,FIN:30,CD:5}};
const OBJ=['ter','force','civ','econ','ally','det'];
const PROF={GOV:{n:'Government',mand:'national survival and the war aims',pri:{ter:.25,force:.15,civ:.2,econ:.15,ally:.15,det:.1},risk:.4,hor:90,cyc:7,auth:['policy','mobilise','relocate','arbitrate','talks']},
  GS:{n:'General Staff',mand:'winning the land war',pri:{ter:.45,force:.35,civ:.05,econ:.05,ally:.05,det:.05},risk:.55,hor:14,cyc:3,auth:['intent','reserve','deviation']},
  AF:{n:'Air Force',mand:'the air war',pri:{ter:.2,force:.45,civ:.1,econ:.05,ally:.1,det:.1},risk:.5,hor:5,cyc:2,auth:['airfocus','disperse','emcon']},
  NAVY:{n:'Navy',mand:'the sea lanes',pri:{ter:.1,force:.4,civ:.1,econ:.25,ally:.1,det:.05},risk:.45,hor:14,cyc:5,auth:['aux']},
  LOG:{n:'Logistics Command',mand:'supply',pri:{ter:.25,force:.35,civ:.1,econ:.25,ally:0,det:.05},risk:.3,hor:7,cyc:2,auth:['priority']},
  INT:{n:'Intelligence Service',mand:'knowing the enemy',pri:{ter:.2,force:.3,civ:.1,econ:.1,ally:.2,det:.1},risk:.35,hor:7,cyc:3,auth:['collect']},
  MFA:{n:'Foreign Ministry',mand:'allies and talks',pri:{ter:.05,force:.1,civ:.2,econ:.15,ally:.45,det:.05},risk:.3,hor:30,cyc:7,auth:['outreach']},
  FIN:{n:'Finance Ministry',mand:'paying for the war',pri:{ter:0,force:.1,civ:.15,econ:.65,ally:.05,det:.05},risk:.2,hor:30,cyc:7,auth:['budget']},
  CD:{n:'Civil Defence',mand:'protecting the population',pri:{ter:0,force:0,civ:.8,econ:.15,ally:0,det:.05},risk:.25,hor:5,cyc:2,auth:['shelter']}};
const bel=p=>W.bell?W.bell(p):!!p.side;const day=()=>Math.floor(W.st.t/24);
const AC=()=>{const st=W.st;if(!st.aic)st.aic={inst:{},rec:[],seq:1,mem:{},doc:{},hist:{city:{},inst:{},corp:{}},corp:{},dir:{last:-99,cool:{}},aar:[],dis:[]};return st.aic;};
const hash=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return(h%1000)/1000;};
// the leaders' temperament where leaders.js has them; a stable per-country default otherwise
function temper(p){const L=W.st.lead&&W.st.lead[p.a3];const h=L&&(L.head||L.HEAD);const ps=h&&h.pers;return{res:ps?ps.res:.3+hash(p.a3+'r')*.5,cau:ps?ps.cau:.3+hash(p.a3+'c')*.5,prag:ps?ps.prag:.3+hash(p.a3+'p')*.5};}
function insts(p){const X=AC();let I=X.inst[p.a3];if(I)return I;I={};const T=temper(p),coast=!!(p.nav&&(p.nav.dd+p.nav.ff+p.nav.ss+(p.nav.cv||0))>0);
  for(const k of Object.keys(PROF)){if(k==='NAVY'&&!coast)continue;const P=PROF[k];I[k]={k,n:P.n,mand:P.mand,pri:{...P.pri},risk:Math.max(.05,Math.min(.95,P.risk+(T.res-T.cau)*.3)),hor:P.hor,cyc:P.cyc,next:0,auth:P.auth,lr:.4+T.prag*.6,head:(W.lead&&W.lead.person)?W.lead.person(p.a3,P.n+' chief').name:P.n+' chief'};}
  X.inst[p.a3]=I;return I;}
const infoQ=p=>{const I=W.st.intel;return(I&&I[p.side]&&I[p.side].q)||.5;};
const mem=(a3,key)=>{const X=AC();return(X.mem[a3]&&X.mem[a3][key])||{adj:0,n:0,last:0,hist:[]};};
// THE DECISION FRAMEWORK
function decide(p,ik,kind,intent,opts,ctx){const I=insts(p)[ik];if(!I)return null;const X=AC(),q=infoQ(p);
  if(!I.auth.includes(kind)&&ik!=='GOV'){return refer(p,ik,kind,intent,opts,ctx);}
  const sc=opts.map(o=>{let u=0,why=[];for(const k of OBJ){const v=(o.g&&o.g[k]||0)*I.pri[k];u+=v;if(Math.abs(v)>.02)why.push([k,v]);}u-=(o.cost||0)*.5;u-=(o.risk||0)*(1-I.risk);const m=mem(p.a3,kind+':'+o.id);u+=m.adj;u+=(rn()-.5)*(1-q)*.15;
    why.sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));return{id:o.id,label:o.label,u:+u.toFixed(3),why:why.slice(0,2).map(w=>w[0]),mem:m.adj?+m.adj.toFixed(2):0,exp:o.exp};}).sort((a,b)=>b.u-a.u);
  const ch=sc[0];const conf=Math.max(.15,Math.min(.95,q*.7+(sc.length>1?Math.min(.3,(sc[0].u-sc[1].u)*2):.3)));
  const r={id:X.seq++,t:W.st.t,a3:p.a3,ik,inst:I.n,kind,intent,opts:sc,ch:ch.id,label:ch.label,why:ch.why,conf:+conf.toFixed(2),exp:ch.exp||null,rev:W.st.t+24*A.aarDays[ik],ctx:ctx||{},out:null};
  X.rec.push(r);if(X.rec.length>A.recMax)X.rec.splice(0,X.rec.length-A.recMax);hist('inst',p.a3+':'+ik,r.label);
  const lk=p.a3+':'+ik+':'+kind+':'+((ctx&&ctx.f)||'');X.last=X.last||{};const changed=X.last[lk]!==ch.id;X.last[lk]=ch.id;
  if(changed)W.emit('DECISION',{e:[p.a3],txt:p.n+' — '+I.n+': '+r.label+' (intent: '+intent+'; deciding factor: '+(ch.why.map(w=>({ter:'ground',force:'preserving the force',civ:'protecting civilians',econ:'the economy',ally:'the alliance',det:'deterrence'}[w])).join(' and ')||'balance')+'; confidence '+Math.round(conf*100)+' %).'});
  return r;}
// outside its authority: the government decides; a refusal is a recorded disagreement
function refer(p,ik,kind,intent,opts,ctx){const G=insts(p).GOV;const X=AC();const best=opts.slice().sort((a,b)=>{const ua=OBJ.reduce((t,k)=>t+(a.g&&a.g[k]||0)*G.pri[k],0)-(a.cost||0)*.5,ub=OBJ.reduce((t,k)=>t+(b.g&&b.g[k]||0)*G.pri[k],0)-(b.cost||0)*.5;return ub-ua;})[0];
  const wanted=opts[0];const agree=best.id===wanted.id;const d={t:W.st.t,a3:p.a3,from:ik,kind,wanted:wanted.label,got:best.label,agree};X.dis.push(d);if(X.dis.length>200)X.dis.shift();
  W.emit(agree?'DECISION':'DISAGREE',{e:[p.a3],txt:p.n+': the '+PROF[ik].n+' asks the government to '+wanted.label.toLowerCase()+(agree?' — approved.':' — the government decides instead to '+best.label.toLowerCase()+' (its priorities weigh '+(G.pri.civ>G.pri.ter?'civilian protection':'the economy')+' more).')});
  return decide(p,'GOV',kind,intent+' (referred by the '+PROF[ik].n+')',[best],ctx);}
// HISTORIES
function hist(kind,key,txt){const X=AC();const H=X.hist[kind];const L=H[key]||(H[key]=[]);L.push({t:W.st.t,txt});if(L.length>14)L.shift();}
{const _e=W.emit;W.emit=function(ty,o){const r=_e.apply(this,arguments);try{if(W.st&&W.st.city&&o&&o.txt&&ty!=='DECISION'){const X=AC();for(const a3 of(o.e||[]))for(const c of(W.st.city[a3]||[]))if(o.txt.includes(c.n))hist('city',a3+':'+c.n,ty+': '+o.txt.slice(0,160));}}catch(e){}return r;};}
// INSTITUTION TURNS
function turn(p){const I=insts(p),st=W.st,X=AC(),d=day();const fronts=st.fronts.filter(f=>!f.cf&&(f.a===p.a3||f.b===p.a3));
  for(const ik of Object.keys(I)){const S=I[ik];if(d<S.next)continue;S.next=d+S.cyc;try{TURN[ik]&&TURN[ik](p,S,fronts);}catch(e){console.warn('[aicore]',ik,e);}}}
const TURN={
  // general staff: an intent per front, the strategic reserve, and the commanders' bounded deviation
  GS(p,S,fronts){const st=W.st;for(const f of fronts){const own=f.post&&f.post[p.a3],est=f.est&&f.est[p.a3]||1,mine=p.gnd/Math.max(1,fronts.reduce((t,x)=>t+x.sec.length,0)),ratio=mine/Math.max(.01,est);
      const r=decide(p,'GS','intent','the '+st.c[f.a===p.a3?f.b:f.a].n+' front',[{id:'ATK',label:'Take ground on the '+st.c[f.a===p.a3?f.b:f.a].n+' front',g:{ter:.8*Math.min(1.5,ratio),force:-.4},risk:Math.max(0,1.3-ratio),exp:{km:10}},
        {id:'HOLD',label:'Hold the line against '+st.c[f.a===p.a3?f.b:f.a].n,g:{ter:.2,force:.3},exp:{km:0}},{id:'ELASTIC',label:'Elastic defence: trade ground for time against '+st.c[f.a===p.a3?f.b:f.a].n,g:{ter:-.2,force:.7},exp:{km:-5}}],{f:f.id,r0:ratio,off0:offOf(f,p)});
      f.intent=f.intent||{};f.intent[p.a3]={id:r.ch,t:st.t,r0:ratio};
      // commander's deviation within intent: only past the threshold, and reported
      if(f.intent[p.a3].id==='ATK'&&own==='ATTACK'&&ratio<f.intent[p.a3].r0*(1-A.devRatio)){f.post[p.a3]='HOLD';W.emit('DECISION',{e:[p.a3],txt:p.n+': the front commander halts the attack on the '+st.c[f.a===p.a3?f.b:f.a].n+' front — the balance has turned against it since the intent was set (reported to the General Staff).'});}}
    // high pressure: a front that gave more than 15 km in three days gets the emergency reserve
    for(const f of fronts){const o=offOf(f,p),h=(f.offh=f.offh||{})[p.a3]||(f.offh[p.a3]=[]);h.push(o);if(h.length>4)h.shift();if(h.length>=4&&h[0]-o>15&&(p.res??0)>=0&&!f.emerg){f.emerg=st.t;const add=Math.min(p.gnd0*.04,2);p.gnd+=add;W.emit('CRISIS',{e:[p.a3],txt:p.n+': a breakthrough on the '+st.c[f.a===p.a3?f.b:f.a].n+' front — the General Staff commits its emergency reserve.'});}}},
  // government: policy trade-offs, relocation under threat, talks
  GOV(p,S){const st=W.st;const ex=p.exh||0,sup=p.sup??.7;
    const r=decide(p,'GOV','policy','the war economy',[{id:'GUNS',label:'Put the economy on a war footing (guns over butter)',g:{force:.6,econ:-.4,civ:-.2},cost:.2},{id:'BUTTER',label:'Protect living standards (butter over guns)',g:{econ:.4,civ:.4,force:-.3}},
      {id:'CITIES',label:'Move air defence to protect the cities',g:{civ:.7,force:-.3,ter:-.1}},{id:'BAL',label:'Keep the present balance',g:{econ:.1,force:.1,civ:.1}}],{ex,sup});
    if(r.ch==='GUNS'){p.econ=Math.max(.3,(p.econ??1)-.01);p.prodX=Math.min(1.3,(p.prodX||1)+.05);}else if(r.ch==='BUTTER'){p.sup=Math.min(1,sup+.01);p.prodX=Math.max(.8,(p.prodX||1)-.04);}else if(r.ch==='CITIES'){p.cityAD=Math.min(1,(p.cityAD||0)+.2);}
    // the capital threatened: the government moves
    const cap=st.city&&st.city[p.a3]&&st.city[p.a3][0];const near=cap&&st.fronts.some(f=>!f.cf&&(f.a===p.a3||f.b===p.a3)&&f.sec.some(s=>Math.hypot(s.lat-cap.lat,s.lon-cap.lon)<1));
    if(near&&!p.relocated){p.relocated=st.t;W.emit('CRISIS',{e:[p.a3],txt:p.n+': with the front near '+cap.n+', the government moves to a reserve seat of government; ministries keep working (continuity of government).'});}},
  AF(p,S){const st=W.st;const struck=(st.mil&&st.mil[p.a3]&&st.mil[p.a3].baseDmg)||0;const sead=(()=>{const o=st.c[Object.keys(st.c).find(k=>st.c[k].side&&st.c[k].side!==p.side&&bel(st.c[k]))]||{};return(o.air||0)/Math.max(1,p.air||1);})();
    const r=decide(p,'AF','airfocus','the air war',[{id:'DCA',label:'Defend our airspace first',g:{force:.5,civ:.3,ter:.1}},{id:'OCA',label:'Strike their air force on the ground',g:{force:.3,ter:.3},risk:.4},{id:'CAS',label:'Support the troops at the front',g:{ter:.6,force:-.1}}],{lost0:p.lostAir||0});
    p.airFocus=r.ch;
    if(struck>.3&&!p.dispersed){p.dispersed=st.t;decide(p,'AF','disperse','survive strikes on our bases',[{id:'DISP',label:'Disperse aircraft to road strips and reserve fields',g:{force:.6},cost:.1}],{});}
    // emission control: under heavy suppression the air-defence radars go cold, then pop up
    if(sead>1.6&&!p.emcon){p.emcon=st.t;decide(p,'AF','emcon','keep the air defence alive',[{id:'COLD',label:'Air defence goes cold (radars off, pop-up engagements)',g:{force:.6,civ:-.1}}],{});}else if(p.emcon&&sead<1.2){p.emcon=0;}},
  NAVY(p,S){const r=decide(p,'NAVY','aux','fleet endurance',[{id:'REPL',label:'Keep replenishment ships with the fleet (longer patrols)',g:{force:.3,econ:.1}},{id:'MINE',label:'Sweep the approaches to our ports',g:{econ:.4,civ:.2}},{id:'HOSP',label:'Hospital ship to the main base',g:{civ:.5}}],{});
    if(r.ch==='MINE'&&W.st.ports&&W.st.ports[p.a3])for(const pt of W.st.ports[p.a3])pt.cap=Math.min(1,(pt.cap||1)+.03);p.navAux=r.ch;},
  LOG(p,S,fronts){if(!fronts.length)return;const st=W.st;const need=fronts.map(f=>({f,n:(f.post&&f.post[p.a3]==='ATTACK'?1.3:1)*(f.emerg?1.4:1)})).sort((a,b)=>b.n-a.n);
    const r=decide(p,'LOG','priority','supply',need.slice(0,3).map(x=>({id:x.f.id,label:'Supply priority to the '+st.c[x.f.a===p.a3?x.f.b:x.f.a].n+' front',g:{ter:.3*x.n,force:.3}})),{});p.logPri=r.ch;},
  INT(p,S,fronts){if(!fronts.length)return;const st=W.st;const r=decide(p,'INT','collect','know the enemy',fronts.slice(0,4).map(f=>({id:f.id,label:'Collection focus on the '+st.c[f.a===p.a3?f.b:f.a].n+' front',g:{force:.3,ter:.2}})),{});p.intFocus=r.ch;
    // the situation report: as good as the side's intelligence, coloured by the commander's temperament
    const q=infoQ(p),T=temper(p),f=st.fronts.find(x=>x.id===r.ch);if(f){const en=st.c[f.a===p.a3?f.b:f.a],truth=en.gnd,rep=truth*(1+(rn()-.5)*(1-q)*.8)*(1-(T.res-T.cau)*.15);
      if(p.al==='CORE')W.emit('SITREP',{e:[p.a3],cf:'ESTIMATED',txt:p.n+' situation report, '+en.n+' front: enemy strength assessed at about '+rep.toFixed(1)+' brigade-equivalents (confidence '+Math.round(q*100)+' %)'+((T.res-T.cau)>.2?'; the commander is confident':'')+'.'});}},
  MFA(p){const st=W.st;const r=decide(p,'MFA','outreach','allies and talks',[{id:'AID',label:'Ask partners for aid',g:{ally:.6,econ:.2}},{id:'NEUT',label:'Court the neutrals',g:{ally:.5}},{id:'TALK',label:'Sound out the enemy about talks',g:{civ:.5,ter:-.2},risk:.2}],{});
    if(r.ch==='AID')p.econ=Math.min(1.1,(p.econ??1)+.005);},
  FIN(p){const r=decide(p,'FIN','budget','paying for the war',[{id:'BONDS',label:'Pay with war bonds',g:{econ:.3,civ:.1}},{id:'PRINT',label:'Print money (inflation later)',g:{econ:.2,force:.2},risk:.3},{id:'TAX',label:'Raise taxes',g:{econ:.4,civ:-.3}}],{});
    if(r.ch==='PRINT')p.infl=(p.infl||0)+.01;if(r.ch==='TAX'&&p.sup!=null)p.sup=Math.max(0,p.sup-.005);
    // the general staff wants more; finance wants less: the government arbitrates
    if(p.prodX>1.15&&r.ch!=='PRINT')refer(p,'FIN','spending','the defence budget',[{id:'CUT',label:'Cut defence spending',g:{econ:.6,force:-.4}},{id:'KEEP',label:'Keep defence spending high',g:{force:.5,econ:-.3}}],{});},
  CD(p){const st=W.st;const L=(st.city&&st.city[p.a3])||[];const hot=L.filter(c=>(c.alerts||0)>0||c.h!==p.a3).length;if(!L.length)return;
    decide(p,'CD','shelter','protect the people',[{id:'SHEL',label:'Open more public shelters in the cities under threat',g:{civ:.7,econ:-.1}},{id:'EVAC',label:'Evacuate children and the elderly from the front cities',g:{civ:.8,econ:-.2},cost:hot?0:.4}],{hot});}};
const offOf=(f,p)=>{const k=f.a===p.a3?1:-1;return k*f.sec.reduce((t,s)=>t+s.off,0)/Math.max(1,f.sec.length);};
// AFTER-ACTION REVIEW AND LEARNING (observable outcomes only), safeguards, counter-adaptation
function review(){const X=AC(),st=W.st;for(const r of X.rec){if(r.out||st.t<r.rev)continue;const p=st.c[r.a3];if(!p){r.out={n:'n/a'};continue;}let score=0,txt='';
    if(r.kind==='intent'){const f=st.fronts.find(x=>x.id===r.ctx.f);if(!f){r.out={n:'front gone'};continue;}const km=offOf(f,p)-(r.ctx.off0||0),exp=(r.exp&&r.exp.km)||0;score=Math.max(-1,Math.min(1,(km-exp)/15));txt=Math.round(km)+' km against '+exp+' expected';}
    else if(r.kind==='policy'){score=(p.sup??.7)-.6+((p.econ??1)-.8);txt='support '+Math.round((p.sup??.7)*100)+' %, economy '+Math.round((p.econ??1)*100)+' %';}
    else if(r.kind==='airfocus'){const lr=(p.lostAir||0)-(r.ctx.lost0||0);score=lr<2?.3:-.3;txt='aircraft lost in the period '+Math.round(lr);}
    else{score=(rn()-.45)*.4;txt='mixed results';}
    r.out={score:+score.toFixed(2),txt};X.aar.push({t:st.t,a3:r.a3,ik:r.ik,label:r.label,score:r.out.score,txt});if(X.aar.length>200)X.aar.shift();learn(p,r,score);}}
function learn(p,r,score){const X=AC(),I=insts(p)[r.ik];const key=r.kind+':'+r.ch;const M=(X.mem[p.a3]=X.mem[p.a3]||{});const m=M[key]||(M[key]={adj:0,n:0,last:0,hist:[]});m.n++;m.hist.push(score);if(m.hist.length>6)m.hist.shift();
  if(m.n<A.lessonMin)return;   // safeguard: not on one result
  const avg=m.hist.reduce((t,v)=>t+v,0)/m.hist.length,step=Math.max(-A.lessonStep,Math.min(A.lessonStep,avg*.15*(I?I.lr:.6)));
  const before=m.adj;m.adj=Math.max(-.4,Math.min(.4,m.adj+step));
  // safeguard: revert the last change if the results since it are worse
  if(m.lastAvg!=null&&avg<m.lastAvg-.25&&Math.sign(m.lastStep||0)===Math.sign(step)){m.adj=before-(m.lastStep||0);W.emit('LESSON',{e:[p.a3],txt:p.n+' — '+(I?I.n:r.ik)+': the last adjustment to "'+r.label+'" made things worse; reverted.'});}
  else if(Math.abs(step)>.03)W.emit('LESSON',{e:[p.a3],txt:p.n+' — '+(I?I.n:r.ik)+' lesson identified: "'+r.label+'" '+(step>0?'pays':'does not pay')+' ('+r.out.txt+'); its weight in future decisions '+(step>0?'rises':'falls')+'.'});
  m.lastAvg=avg;m.lastStep=step;
  // the other side sees the effect in the fighting and counter-adapts
  if(r.kind==='intent'&&r.ch==='ATK'&&step>.05){for(const q of Object.values(W.st.c))if(bel(q)&&q.side!==p.side){const MM=(X.mem[q.a3]=X.mem[q.a3]||{});const k2='intent:ELASTIC';const mm=MM[k2]||(MM[k2]={adj:0,n:0,last:0,hist:[]});mm.adj=Math.min(.3,mm.adj+.03);}
    W.emit('LESSON',{txt:'The other side reads '+p.n+'\'s successful attacks and counter-adapts: more defence in depth.'});}}
function monthly(){const X=AC(),st=W.st;for(const a3 of Object.keys(X.mem)){const M=X.mem[a3];for(const k in M)M[k].adj*=1-A.decay;   // memory fades
    const p=st.c[a3];if(!p||!bel(p))continue;const strong=Object.entries(M).filter(([k,m])=>Math.abs(m.adj)>.12&&m.n>=3);
    if(strong.length>=2){const D=(X.doc[a3]=X.doc[a3]||{rev:0,atk:1,train:0});D.rev++;const atk=M['intent:ATK'];if(atk)D.atk=Math.max(.85,Math.min(1.15,D.atk*(1-atk.adj*.15)));D.train=Math.min(.1,D.train+.02);
      W.emit('DOCTRINE',{e:[a3],txt:p.n+' revises its doctrine (revision '+D.rev+') from '+strong.length+' lessons: '+(atk?(atk.adj>0?'attacks are favoured':'attacks need better odds'):'methods adjusted')+'; training priorities follow (readiness).'});}}}
// leadership change erases part of an institution's memory
{const _e=W.emit;W.emit=function(ty,o){const r=_e.apply(this,arguments);try{if(W.st&&W.st.aic&&o&&o.txt&&/relieved|replaced|new government|is killed|dies/.test(o.txt))for(const a3 of(o.e||[])){const M=W.st.aic.mem[a3];if(M)for(const k in M)M[k].adj*=1-A.forget;}}catch(e){}return r;};}
// THE RARE-EVENT DIRECTOR: preconditions, a stated cause, cooldowns, never aimed at the player
const RARE=[{k:'COUP',pre:p=>(p.stab??1)<.35&&(p.exh||0)>.5,w:.5,txt:p=>'A coup attempt in '+p.n+' (government stability '+Math.round((p.stab??0)*100)+' %, the army exhausted). Loyal units put it down; the government is weakened.',fx:p=>{p.stab=Math.max(0,(p.stab??.5)-.05);}},
  {k:'MUTINY',pre:p=>(p.exh||0)>.6&&(p.sup??1)<.4,w:.6,txt:p=>'A mutiny in a '+p.n+' unit at the front after months without rotation; it is contained and the unit is relieved.',fx:p=>{p.gnd=Math.max(0,p.gnd*.995);}},
  {k:'DESERT',pre:p=>(p.exh||0)>.5,w:.7,txt:p=>'Desertions rise in '+p.n+'\'s army as exhaustion bites; patrols and amnesty offers follow.',fx:p=>{p.gnd=Math.max(0,p.gnd*.997);}},
  {k:'EPIDEMIC',pre:p=>(p.disp||0)>p.pop*.03&&(p.soc&&p.soc.hosp>.8||p.life&&p.life.health<.6),w:.5,txt:p=>'An outbreak of disease among the displaced in '+p.n+' (crowded shelters, strained hospitals); health services respond.',fx:p=>{if(p.sup!=null)p.sup-=.01;}},
  {k:'ACCIDENT',pre:p=>(p.prodX||1)>1.05,w:.4,txt:p=>'An industrial accident at a '+p.n+' munitions plant working round the clock; output falls for weeks.',fx:p=>{p.prodX=Math.max(.8,(p.prodX||1)-.08);}},
  {k:'SPY',pre:p=>bel(p),w:.3,txt:p=>'A spy scandal in '+p.n+': an official is accused of passing secrets; the intelligence service tightens security.',fx:p=>{}},
  {k:'ILL',pre:p=>bel(p),w:.2,txt:p=>p.n+'\'s head of government falls ill; a deputy runs the government for some weeks.',fx:p=>{}},
  {k:'DEFECT',pre:p=>(p.exh||0)>.55&&(p.stab??1)<.5,w:.3,txt:p=>'A '+p.n+' general defects to the other side with plans and maps; plans are changed in haste.',fx:p=>{}}];
function director(){const X=AC(),st=W.st,d=day();if(d-X.dir.last<A.dirGap)return;const C=[];
  for(const p of Object.values(st.c)){if(!bel(p))continue;for(const R of RARE){const ck=p.a3+':'+R.k;if((X.dir.cool[ck]||-999)>d-A.dirCool)continue;if(!R.pre(p))continue;C.push({p,R,ck});}}
  if(!C.length||rn()>.25)return;const pick=C[(rn()*C.length)|0];X.dir.last=d;X.dir.cool[pick.ck]=d;pick.R.fx(pick.p);W.emit('CRISIS',{e:[pick.p.a3],cf:'REPORTED',txt:pick.R.txt(pick.p)});}
// CORPORATE HISTORIES: three fictional defence companies per country at war
const CN=['Northgate','Arrowmark','Halvern','Calder','Brightwater','Ostrand','Meridian','Kestrel','Vantor','Stonebridge','Corvane','Pellucid'];
function corps(p){const X=AC();let L=X.corp[p.a3];if(L)return L;const h=hash(p.a3);L=['Aerospace','Armour Works','Munitions'].map((k,i)=>({n:CN[((h*1000)|0+i*5)%CN.length]+' '+k,k,out:0,t:W.st.t}));X.corp[p.a3]=L;for(const c of L)hist('corp',p.a3+':'+c.n,'Founded long before the war; on a war contract from day '+day()+'.');return L;}
function corpDaily(p){const L=corps(p);for(const c of L){c.out+=(p.prodX||1)*(p.econ??1);if(rn()<.01)hist('corp',p.a3+':'+c.n,['A new production line opens.','Strikes by the enemy damage a plant; repairs take weeks.','Labour shortages as workers are called up.','A government contract is extended.'][(rn()*4)|0]);}}
// daily
function daily(){const st=W.st;if(!st||st.over)return;for(const p of Object.values(st.c)){if(!bel(p))continue;turn(p);corpDaily(p);}review();director();if(day()%30===0)monthly();}
W.daily.push(()=>{try{daily();}catch(e){console.warn('[aicore]',e);}});
// effects on the fighting, bounded: intent agreeing with posture, logistics priority, emission control, production, doctrine
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);if(!f||!W.st||!W.st.aic)return k;const I=f.intent&&f.intent[p.a3];if(I&&f.post&&((I.id==='ATK'&&f.post[p.a3]==='ATTACK')||(I.id!=='ATK'&&f.post[p.a3]!=='ATTACK')))k*=1.02;if(p.logPri===f.id)k*=1.03;if(p.intFocus===f.id)k*=1.01;const D=W.st.aic.doc[p.a3];if(D)k*=1+D.train*.3;return k;};}
if(W.atkK){const _a=W.atkK;W.atkK=p=>{const D=W.st&&W.st.aic&&W.st.aic.doc[p.a3];return _a(p)*(D?D.atk:1);};}
{const _p=W.prodK;W.prodK=(p,k)=>_p(p,k)*(p.prodX||1);}
// presentation
function decTab(p){const st=W.st;if(!st)return'<div>No war running.</div>';const X=AC(),I=bel(p)?insts(p):null;const row=(a,b)=>'<div style="display:flex;justify-content:space-between;gap:8px"><span>'+esc(a)+'</span><b>'+esc(b)+'</b></div>';
  if(!I)return'<div>Not at war: no wartime institutions in action.</div>';let h='<h4>INSTITUTIONS</h4>';for(const k in I){const S=I[k];h+=row(S.n+' · '+S.head,'horizon '+S.hor+' d · risk '+Math.round(S.risk*100)+' % · learns '+Math.round(S.lr*100)+' %');}
  h+='<h4>RECENT DECISIONS</h4>'+X.rec.filter(r=>r.a3===p.a3).slice(-8).reverse().map(r=>'<div style="font-size:11px;margin:4px 0"><b>'+esc(r.inst)+'</b> · '+esc(r.label)+' <span style="color:#8a9a92">(confidence '+Math.round(r.conf*100)+' %)</span><br><span style="color:#8a9a92">options: '+r.opts.map(o=>esc(o.label.split(' ').slice(0,4).join(' '))+' '+o.u).join(' · ')+(r.out?' · review: '+esc(r.out.txt||'')+' ('+r.out.score+')':'')+'</span></div>').join('');
  const M=X.mem[p.a3]||{};const ls=Object.entries(M).filter(([k,m])=>Math.abs(m.adj)>.02).slice(0,8);h+='<h4>LESSONS (MEMORY)</h4>'+(ls.map(([k,m])=>row(k,(m.adj>0?'+':'')+m.adj.toFixed(2)+' after '+m.n+' reviews')).join('')||'<div>none yet</div>');
  const D=X.doc[p.a3];if(D)h+=row('Doctrine revisions',D.rev);const ds=X.dis.filter(d=>d.a3===p.a3&&!d.agree).slice(-3);if(ds.length)h+='<h4>DISAGREEMENTS</h4>'+ds.map(d=>'<div style="font-size:11px">'+esc(PROF[d.from].n)+' wanted to '+esc(d.wanted.toLowerCase())+'; the government chose to '+esc(d.got.toLowerCase())+'.</div>').join('');
  return h+'<div style="font-size:10px;color:#8a9a92;margin-top:6px">Decisions use what each side knows (intelligence-filtered), not the hidden truth.</div>';}
function histTab(p){const X=AC();const row=(t,x)=>'<div style="font-size:11px;margin:2px 0"><span style="color:#8a9a92">day '+Math.floor(t/24)+'</span> '+esc(x)+'</div>';let h='<h4>CITIES</h4>';
  const cs=Object.entries(X.hist.city).filter(([k])=>k.startsWith(p.a3+':')).slice(0,6);h+=cs.map(([k,L])=>'<b>'+esc(k.split(':')[1])+'</b>'+L.slice(-4).map(e=>row(e.t,e.txt)).join('')).join('')||'<div>no city history yet</div>';
  h+='<h4>INSTITUTIONS</h4>'+(Object.entries(X.hist.inst).filter(([k])=>k.startsWith(p.a3+':')).map(([k,L])=>'<b>'+esc(PROF[k.split(':')[1]]?PROF[k.split(':')[1]].n:k)+'</b>'+L.slice(-3).map(e=>row(e.t,e.txt)).join('')).join('')||'<div>none yet</div>');
  h+='<h4>DEFENCE INDUSTRY (FICTIONAL COMPANIES)</h4>'+((X.corp[p.a3]||[]).map(c=>'<b>'+esc(c.n)+'</b>'+((X.hist.corp[p.a3+':'+c.n]||[]).slice(-3).map(e=>row(e.t,e.txt)).join(''))).join('')||'<div>none</div>');return h;}
if(window.NATPANEL&&NATPANEL.tabs){NATPANEL.tabs.DECISIONS=decTab;NATPANEL.tabs.HISTORY=histTab;}
W.aicore={A,PROF,AC,insts,decide,refer,turn,review,learn,monthly,director,RARE,corps,daily,temper,hist};
})();
