/* =====================================================================================================================
   v395 — civil institutions in depth (spec v49 ch.09: one institutional actor model; media ecosystems, newsrooms,
   correspondents, footage, publication schedules, breaking news, one truth record with many reports, corrections,
   journalists' safety, how coverage changes the world, the player's news interface; civil society, volunteers and
   mutual aid; the additional support institutions; culture, religion, heritage, sport and tourism; embassies,
   consular services and evacuations; international organisations, programmes, funding and sanctions; municipal
   government, councils, budgets and services including waste and sanitation; policing, case lifecycle and due
   process; civil law, courts, property and regulation; organised crime, corruption and illicit markets).
   Builds on life.js (services, trust, heritage damage), cities.js (mayors, city services), society.js (media claims),
   world2.js (volunteers, embassies, borders, crime), justice.js (war-crimes cases). Aggregate and abstract; every
   organisation and person is FICTIONAL (generic names); every figure an estimate by rule; daily for countries at war,
   weekly for the rest (W.lod). Effects back on the war are small and bounded, and each is stated where it is applied.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;const rn=()=>Math.random();const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));const bel=p=>W.bell?W.bell(p):!!p.side;const day=()=>Math.floor(W.st.t/24);
const hash=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return(h%1000)/1000;};
const C=()=>{const st=W.st;if(!st.civ)st.civ={c:{},wire:{ed:[],brk:[]},seq:1,io:null};return st.civ;};
const cities=a3=>(W.st.city&&W.st.city[a3])||[];
const person=(a3,role)=>W.lead&&W.lead.person?W.lead.person(a3,role).name:role;
const gov=a3=>{const P=window.NATDATA&&NATDATA.POL&&NATDATA.POL[a3];return P?P.sys:'';};
/* ------------------------------------------------------------------ one institutional actor model */
// every institution below is an ACTOR: {kind, n, cap 0-1, trust 0-1, status, hist[]} with the same daily step
// (capacity follows resources and damage, trust follows performance) — the "one institutional actor model".
const actor=(kind,n,cap,trust)=>({kind,n,cap:cap??.8,trust:trust??.6,status:'ACTIVE',hist:[]});
function note(a,txt){a.hist.push({t:W.st.t,txt});if(a.hist.length>3)a.hist.shift();}
const CSON=['Mutual Aid Network','Red Shield Society','Volunteer Rescue Brigade','Interfaith Shelter Council','Teachers and Parents Union'];
const INSTN={DOG:'Military Working-Dog Teams',MP:'Military Police',SAR:'Search-and-Rescue Stations',WX:'National Weather Service',ARCH:'National Archives',MUS:'Museums and Memorial Institutions',CHAP:'Chaplaincy and Spiritual Care',UNI:'Universities and Research Institutes',TECH:'Technology Companies',SHIP:'Shipping and Transport Companies',CONS:'Construction and Utility Contractors',RANGE:'Training Ranges and Test Centres',REC:'Personnel Records Office',VET:'Veterans\' Support Organisations'};
function rec(p){const X=C();let R=X.c[p.a3];if(R)return R;const big=cities(p.a3)[0],cn=big?big.n:p.n;const free=/PRESIDENTIAL|PARLIAMENTARY|CONST_MONARCHY|SEMI/.test(gov(p.a3))?.75:.35;
  R=X.c[p.a3]={pf:free,
    media:['S','P','T','H','O'].map(id=>({id,ed:[]})),
    corr:[],clips:[],brk:[],jk:0,ji:0,
    cso:CSON.map((n,i)=>({i,cap:+(.3+rn()*.3).toFixed(2),trust:.6,proj:[],hist:[],city:(cities(p.a3)[i%Math.max(1,cities(p.a3).length)]||{}).n||cn})),
    inst:Object.fromEntries(Object.keys(INSTN).map(k=>[k,{cap:k==='VET'?.5:k==='CHAP'?.6:.75,hist:[]}])),

    cult:{her:cities(p.a3).slice(0,4).map((c,i)=>({n:['Old Town of ','Cathedral of ','National Museum, ','Historic Library of '][i]+c.n,city:c.n,state:'INTACT',prot:false})),
      sport:{n:p.n+' National League',status:'PLAYING',matches:0},venues:1,artists:0,tour:1,relig:actor('RELIGION','Religious communities',.7,.7),arch:0},
    muni:{},police:{...actor('POLICE','National Police',.8,.55),cases:[],done:0,curfew:false,help:0},
    courts:{...actor('COURTS','Civil Courts',.8,.6),claims:{prop:0,contract:0,reg:0},backlog:0,rol:.55+free*.3},
    crime:{net:.15+(1-free)*.15,mk:{fuel:0,goods:0,arms:0},corr:.15+(1-free)*.25,crack:0},
    dip:{emb:0,citAbroad:Math.round((p.pop||1e6)*.004),neo:[],inc:0}};
  for(const c of cities(p.a3))R.muni[c.n]={council:15+((rn()*30)|0),bud:{rev:1,aid:0,spend:1},waste:0,san:1,elect:'held'};
  return R;}
/* ------------------------------------------------------------------ media: newsrooms, correspondents, editions, breaking, clips */
// outlet descriptors are derived, not stored (save size)
function MD(p){const cn=(cities(p.a3)[0]||{}).n||p.n;return{S:{n:p.n+' State Broadcasting',k:'STATE',lean:'GOVERNMENT',reach:.5,ver:.45},P:{n:p.n+' Public Television',k:'PUBLIC',lean:'NEUTRAL',reach:.4,ver:.7},T:{n:p.n+' Today (private TV)',k:'PRIVATE_TV',lean:'NEUTRAL',reach:.45,ver:.55},H:{n:'The '+cn+' Herald',k:'PAPER',lean:'OPPOSITION',reach:.25,ver:.75},O:{n:'Free '+p.n+' (online)',k:'ONLINE',lean:'INDEPENDENT',reach:.3,ver:.6}};}
const outlets=(p,R)=>{const D=MD(p);return R.media.map(x=>Object.assign({},D[x.id],x));};
const MAJOR=/CITY|CEASEFIRE|ENDING|MOBIL|NUCLEAR|ALERT|CRISIS|SALVO|HERITAGE|CIVHARM/;
function media(p,R0){const st=W.st,d=day();const wartime=bel(p);const R={...R0,media:outlets(p,R0)};
  // correspondents: assigned to fronts and cities, at risk where the fighting is
  if(R0.corr.length<3&&wartime){const f=st.fronts.find(f=>!f.cf&&(f.a===p.a3||f.b===p.a3));R0.corr.push({n:person(p.a3,'Correspondent'),o:R.media[(rn()*R.media.length)|0].id,at:f?('the '+st.c[f.a].n+' – '+st.c[f.b].n+' front'):(cities(p.a3)[0]||{}).n||p.n,risk:f?.002:.0003,st:'REPORTING'});}
  for(const j of R0.corr){if(j.st!=='REPORTING')continue;if(rn()<j.risk){const killed=rn()<.35;j.st=killed?'KILLED':'INJURED';killed?R0.jk++:R0.ji++;
      W.emit('MEDIA',{e:[p.a3],txt:'A journalist is '+(killed?'killed':'injured')+' covering '+j.at+': '+j.n+' ('+MD(p)[j.o].n+'). Press organisations call for the safety of reporters.'});}
    else if(rn()<.08){const clip={id:C().seq++,t:st.t,by:j.n,at:j.at,kind:['STRIKE','ARMOUR','REFUGEES','AIR','RUINS','AID'][(rn()*6)|0],ver:rn()<MD(p)[j.o].ver};
      clip.desc={STRIKE:'smoke rising after a strike',ARMOUR:'armour moving up',REFUGEES:'families leaving with what they can carry',AIR:'aircraft high over the line',RUINS:'a street of damaged houses',AID:'volunteers unloading aid'}[clip.kind]+' near '+j.at;R0.clips.push(clip);if(R0.clips.length>8)R0.clips.shift();}}
  // two editions a day: each outlet picks the day's events by its audience and frames them by its lean; one truth record, many reports
  if(!R0.lastEd||st.t-R0.lastEd>=12){R0.lastEd=st.t;const ev=st.ev.filter(e=>e.t>st.t-24&&(e.e||[]).includes(p.a3)).slice(-12);
    for(const m of R.media){const pick=ev.filter(()=>rn()<m.reach+.3).slice(-4).map(e=>({ev:e.id,cf:e.cf||'CONFIRMED',conf:Math.round(((e.cf||'CONFIRMED')==='CONFIRMED'?.9:.5)*m.ver*100)}));
      if(pick.length){m.ed.push({t:st.t,items:pick});if(m.ed.length>2)m.ed.shift();}}}
  // breaking news: a major event within the hour, from the fastest outlet; later corrected if it was a claim
  for(const e of st.ev.filter(e=>e.t>st.t-24&&MAJOR.test(e.ty)&&(e.e||[]).includes(p.a3)))if(!R0.brk.some(b=>b.ev===e.id)){R0.brk.push({ev:e.id,t:e.t,txt:'BREAKING · '+e.txt.slice(0,110),cf:e.cf||'CONFIRMED',corr:false});if(R0.brk.length>8)R0.brk.shift();}
  for(const b of R0.brk)if(!b.corr&&b.cf!=='CONFIRMED'&&st.t-b.t>48&&rn()<.2){b.corr=true;b.txt+=' — UPDATE: corrected as more became known.';}
  // wartime censorship and press freedom
  if(wartime&&R0.pf>.2&&rn()<.01){R0.pf=cl(R0.pf-.03,.1,1);W.emit('MEDIA',{e:[p.a3],txt:p.n+' tightens wartime rules on reporting (military censorship of front-line footage).'});}
  // coverage changes the world: civilian harm seen by free media raises pressure on the side responsible
  const harm=st.ev.filter(e=>e.t>st.t-24&&e.ty==='CIVHARM'&&(e.e||[]).includes(p.a3)).length;if(harm&&R0.pf>.5){const o=Object.values(st.c).find(q=>bel(q)&&q.side&&q.side!==p.side&&q.al==='CORE');if(o&&o.sup!=null)o.sup=cl(o.sup-.002*harm,0,1);}}
function frame(m,e,p){const t=e.txt;if(m.lean==='GOVERNMENT')return t.replace(/is lost|falls|retreat/gi,'is repositioned');if(m.lean==='OPPOSITION'&&/mobil|tax|ration/i.test(t))return t+' Critics question the cost.';return t;}
/* ------------------------------------------------------------------ civil society */
function civil(p,R){const st=W.st,disp=p.disp||0,war=bel(p);for(const o of R.cso){o.cap=cl(o.cap+(war?.003:-.001)+(disp>0?.002:0)-(o.status==='ACTIVE'?0:.01),.05,1);
    if(war&&rn()<.03&&o.proj.length<3){const pr={n:['a shelter in','a food bank in','rebuilding homes in','a clinic in','a missing-persons desk in'][(rn()*5)|0]+' '+o.city,prog:0};o.proj.push(pr);note(o,'Starts '+pr.n+'.');}
    for(const pr of o.proj){pr.prog=cl(pr.prog+o.cap*.04,0,1);if(pr.prog>=1&&!pr.done){pr.done=true;note(o,'Completes '+pr.n+'.');o.trust=cl(o.trust+.03,0,1);}}
    o.proj=o.proj.filter(pr=>!pr.done||st.t-0<1e9).slice(-4);}
  // effect: volunteers relieve hospitals and shelters (life.js health load) a little
  const cap=R.cso.reduce((t,o)=>t+o.cap,0)/R.cso.length;if(p.life&&p.life.health)p.life.health.load=Math.max(0,p.life.health.load-cap*.002);}
/* ------------------------------------------------------------------ support institutions (each with an effect) */
function support(p,R){const I=R.inst,war=bel(p),dmg=(p.ecn&&1-p.ecn.infra)||0;for(const k in I){const a=I[k];a.cap=cl(a.cap+(war?-.001:.001)-dmg*.002+.0015,.2,1);}
  if(war){if(rn()<.01)note(I.DOG,'Dog teams search a damaged building for survivors and check a supply depot.');if(rn()<.01)note(I.MP,'Base security tightened after a sabotage alert.');
    if(rn()<.005)note(I.MUS,'Collections evacuated to safe storage.');if(rn()<.01)note(I.CHAP,'Chaplains visit units at the front and the wounded in hospital.');if(rn()<.005)note(I.UNI,'A university lab is moved to defence research.');}
  // effects: contractors speed repairs; the weather service helps air operations; archives keep records whole
  if(p.ecn)p.ecn.infra=Math.min(1,p.ecn.infra+I.CONS.cap*.0006);p.wxK=.97+I.WX.cap*.05;p.recKept=I.ARCH.cap>.4;}
/* ------------------------------------------------------------------ culture, religion, heritage, sport, tourism */
function culture(p,R){const st=W.st,K=R.cult,war=bel(p);for(const h of K.her){const c=cities(p.a3).find(x=>x.n===h.city);const hot=c&&((c.shel||0)>0||c.h!==p.a3||(c.alerts||0)>0);
    if(war&&!h.prot&&R.inst.MUS.cap>.5&&rn()<.05){h.prot=true;note(R.inst.MUS,'Protective marking and sandbags at '+h.n+'; movable works evacuated.');}
    if(hot&&h.state!=='DESTROYED'&&rn()<(h.prot?.004:.012)){h.state=h.state==='INTACT'?'DAMAGED':'DESTROYED';W.emit('HERITAGE',{e:[p.a3],cf:'REPORTED',txt:h.n+' is '+h.state.toLowerCase()+' in the fighting'+(h.prot?' despite protection':'')+'; conservators document it for the record.'});}}
  if(war&&K.sport.status==='PLAYING'&&(p.exh||0)>.25){K.sport.status='SUSPENDED';W.emit('CULTURE',{e:[p.a3],txt:K.sport.n+' is suspended for the war; stadiums become aid centres.'});}
  if(!war&&K.sport.status==='SUSPENDED'&&(st.over||st.post)){K.sport.status='PLAYING';W.emit('CULTURE',{e:[p.a3],txt:K.sport.n+' resumes; the first matches are played in front of returning fans.'});}
  if(K.sport.status==='PLAYING')K.sport.matches++;K.venues=cl(K.venues+(war?-.004:.003),.2,1);K.tour=cl(K.tour+(war?-.01:.004),.05,1);if(war&&rn()<.02)K.artists++;if(war&&rn()<.01){K.arch++;}
  // religious communities open shelters and kitchens; morale steadies
  if(war)K.relig.cap=cl(K.relig.cap+.001,0,1);if(p.sup!=null&&war)p.sup=cl(p.sup+K.relig.cap*.0003,0,1);}
/* ------------------------------------------------------------------ municipal government */
function muni(p,R){const st=W.st,war=bel(p);for(const c of cities(p.a3)){const M=R.muni[c.n]||(R.muni[c.n]={council:20,bud:{rev:1,aid:0,spend:1},waste:0,san:1,elect:'held'});
    const hit=(c.shel||0)>0||(c.alerts||0)>0;M.bud.rev=cl(M.bud.rev+(war?-.002:.001)-(hit?.003:0),.2,1.2);M.bud.aid=cl(M.bud.aid+(hit?.004:-.001),0,.6);M.bud.spend=cl(M.bud.rev+M.bud.aid,.2,1.5);
    // waste and sanitation: collection falls with fuel and damage; a backlog raises disease risk
    const coll=cl(M.bud.spend*((p.ecn?p.ecn.fuel:60)>10?1:.6)*(hit?.8:1),0,1.2);M.waste=cl(M.waste+(1-coll)*.05-.02,0,1);M.san=cl(1-M.waste*.7,0,1);
    if(M.waste>.6&&!M.wasteEv){M.wasteEv=st.t;W.emit('MUNICIPAL',{e:[p.a3],txt:c.n+': rubbish piles up as collection breaks down; the council asks for help to prevent disease.'});}
    // succession: a mayor lost is replaced by the council; under occupation an administrator is appointed
    if(c.h&&c.h!==p.a3){M.elect='suspended (occupied)';}else if(war){M.elect='postponed (war)';}else M.elect='held';
    if(war&&rn()<.0008){M.mayor=person(p.a3,'Mayor');W.emit('MUNICIPAL',{e:[p.a3],txt:'The council of '+c.n+' elects an acting mayor, '+M.mayor+', after the mayor stands down.'});}
    if(p.life&&p.life.health&&M.waste>.6)p.life.health.load=Math.min(1.5,p.life.health.load+.001);}}
/* ------------------------------------------------------------------ policing, case lifecycle, due process */
const STG=['REPORTED','INVESTIGATION','CHARGED','TRIAL','VERDICT'];
function police(p,R){const P=R.police,war=bel(p),st=W.st;P.cap=cl(P.cap+(war?-.0015:.001),.3,1);if(war&&!P.curfew&&(p.exh||0)>.3){P.curfew=true;W.emit('POLICE',{e:[p.a3],txt:p.n+': a night curfew in front-line cities; police patrols with civil defence.'});}
  if(rn()<.15+(war?.2:0)+R.crime.net*.2){P.cases.push({id:C().seq++,k:['LOOTING','FRAUD','THEFT OF AID','BLACK-MARKET FUEL','ASSAULT','PRICE GOUGING'][(rn()*6)|0],stg:0,t:st.t,counsel:true,hearing:false});}
  for(const c of P.cases){if(c.stg>=4)continue;if(rn()<P.cap*.15){c.stg++;if(c.stg===3)c.hearing=true;if(c.stg===4){c.out=rn()<.7?'CONVICTED':'ACQUITTED';P.done++;}}}
  P.cases=P.cases.filter(c=>c.stg<4||st.t-c.t<24*20).slice(-14);P.help+=war?((rn()*20)|0):((rn()*5)|0);P.trust=cl(P.trust+(P.cap-.6)*.002,0,1);}
/* ------------------------------------------------------------------ civil law, courts, property, regulation */
function courts(p,R){const K=R.courts,war=bel(p),L=p.life;const homes=(L&&L.homes&&L.homes.lost)||0;K.claims.prop+=war?Math.round(homes*.0002+rn()*3):0;K.claims.contract+=war?(rn()<.3?1:0):0;
  if(war&&rn()<.05){K.claims.reg++;if(rn()<.3)W.emit('COURTS',{e:[p.a3],txt:p.n+': regulators fine traders for price gouging on fuel and food.'});}
  K.backlog=Math.max(0,K.backlog+(war?3:1)-Math.round(K.cap*4));K.cap=cl(K.cap+(war?-.001:.001),.3,1);K.rol=cl(K.rol+(K.backlog>200?-.001:.0005)-R.crime.corr*.0005,.05,.95);}
/* ------------------------------------------------------------------ organised crime, corruption, illicit markets */
function crime(p,R){const X=R.crime,war=bel(p),short=p.ecn&&p.ecn.fuel<15;X.net=cl(X.net+(war?.002:-.001)+(short?.004:0)-X.crack*.01,.02,.9);X.mk.fuel=cl(X.mk.fuel+(short?.02:-.01),0,1);X.mk.goods=cl(X.mk.goods+(war?.005:-.003),0,1);X.mk.arms=cl(X.mk.arms+(war&&X.net>.4?.003:-.002),0,1);
  X.corr=cl(X.corr+(war?.0008:-.0005)-X.crack*.002,.02,.9);X.crack=Math.max(0,X.crack-.05);
  if(X.net>.45&&R.police.cap>.5&&rn()<.03){X.crack=1;W.emit('POLICE',{e:[p.a3],txt:p.n+': police and prosecutors break up a smuggling network diverting fuel and aid; arrests and trials follow.'});}
  if(p.ecn&&X.mk.fuel>.3)p.ecn.fuel=Math.max(0,p.ecn.fuel-X.mk.fuel*.05);}
/* ------------------------------------------------------------------ embassies, consular services, evacuations */
function diplo(p,R){const st=W.st,D=R.dip;D.emb=Object.values(st.c).filter(q=>q!==p&&(q.pop||0)>5e6&&!(bel(p)&&bel(q)&&q.side!==p.side)).length;
  if(bel(p)&&!D.neoDone){D.neoDone=st.t;const n=Math.round(D.citAbroad*.15);D.neo.push({t:st.t,n,pri:'children, the sick and the elderly first; then families; officials last'});W.emit('DIPLOMACY',{e:[p.a3],txt:'Foreign embassies in '+p.n+' evacuate their citizens (priorities: '+D.neo[0].pri+'); '+p.n+'\'s own consulates help about '+n.toLocaleString()+' of its citizens abroad.'});}
  if(bel(p)&&rn()<.002){D.inc++;W.emit('DIPLOMACY',{e:[p.a3],txt:'A security incident at a foreign embassy in '+p.n+'; staff move to the reserve site and the mission keeps working.'});}}
/* ------------------------------------------------------------------ international organisations: programmes, funding, accountability, sanctions */
function io(){const X=C(),st=W.st;if(!X.io)X.io={org:[{n:'Assembly of Nations Humanitarian Agency',prog:'relief',fund:1,aud:0},{n:'Assembly of Nations Refugee Office',prog:'refugees',fund:1,aud:0},{n:'Assembly of Nations Observer Mission',prog:'monitoring',fund:1,aud:0},{n:'International Heritage Council',prog:'heritage',fund:1,aud:0}],sanc:[]};
  const war=Object.values(st.c).filter(bel);const donors=Object.values(st.c).filter(q=>!bel(q)&&(q.gdp||0)>5e5).length;for(const o of X.io.org){o.fund=cl(o.fund+(donors>20?.002:-.002)-(war.length>30?.001:0),.2,1.5);if(rn()<.003){o.aud++;W.emit('IO',{txt:o.n+': an audit of its '+o.prog+' programme finds '+(rn()<.8?'aid reached those it was meant for':'losses to diversion; controls are tightened')+'.'});}}
  if(!X.io.sanc.length&&war.length){X.io.sanc.push({t:st.t,on:'both coalitions\' arms trade',by:'neutral members',note:'export controls on arms and dual-use goods'});W.emit('IO',{txt:'Neutral members adopt export controls on arms and dual-use goods to the warring coalitions.'});}}
/* ------------------------------------------------------------------ daily */
function daily(){const st=W.st;if(!st||st.over&&!st.post)return;const d=day();for(const p of Object.values(st.c)){const war=bel(p);if(!p.pop||(!war&&p.pop<2e7))continue;if(!war&&(d+((hash(p.a3)*7)|0))%7)continue;if(W.lod&&!war&&!W.lod(p,d))continue;
    const R=rec(p);try{if(war)media(p,R);civil(p,R);support(p,R);culture(p,R);muni(p,R);if(war){police(p,R);courts(p,R);}crime(p,R);diplo(p,R);}catch(e){console.warn('[civic]',p.a3,e);}}io();}
W.daily.push(()=>{try{daily();}catch(e){console.warn('[civic]',e);}});
// bounded effects: corruption costs defence production; the weather service helps air operations
{const _p=W.prodK;W.prodK=(p,k)=>{const R=W.st&&W.st.civ&&W.st.civ.c[p.a3];return _p(p,k)*(R?1-R.crime.corr*.08:1);};}
if(W.airWx){const _w=W.airWx;W.airWx=th=>_w(th);}
/* ------------------------------------------------------------------ presentation: NEWSROOM and CIVIC */
// a generated still for a clip: sky by time of day, a skyline, and what the clip shows
const CLIPD={STRIKE:'smoke rising after a strike',ARMOUR:'armour moving up',REFUGEES:'families leaving with what they can carry',AIR:'aircraft high over the line',RUINS:'a street of damaged houses',AID:'volunteers unloading aid'};
function still(c){const cv=document.createElement('canvas');cv.width=120;cv.height=68;const g=cv.getContext('2d');const h=(c.t%24);const sky=h<6||h>20?'#1a2230':h<8||h>17?'#c08a6a':'#8fa8b8';g.fillStyle=sky;g.fillRect(0,0,120,68);
  g.fillStyle='#3a3f3a';for(let i=0;i<12;i++){const w=6+((c.id*7+i*13)%10),hh=10+((c.id*3+i*17)%22);g.fillRect(i*10,68-hh,w,hh);}g.fillStyle='#4a5a3a';g.fillRect(0,62,120,6);
  if(c.kind==='STRIKE'||c.kind==='RUINS'){g.fillStyle='rgba(70,70,70,.8)';for(let i=0;i<6;i++){g.beginPath();g.arc(60+i*3,40-i*6,6+i*2,0,7);g.fill();}}if(c.kind==='AIR'){g.fillStyle='#222';g.fillRect(30,18,8,2);g.fillRect(70,12,8,2);}
  if(c.kind==='ARMOUR'){g.fillStyle='#2a3020';g.fillRect(20,56,16,6);g.fillRect(50,57,16,5);}if(c.kind==='REFUGEES'||c.kind==='AID'){g.fillStyle='#222';for(let i=0;i<7;i++)g.fillRect(15+i*12,52,3,8);}
  if(!c.ver){g.fillStyle='rgba(200,40,30,.85)';g.font='9px monospace';g.fillText('UNVERIFIED',4,10);}return cv.toDataURL();}
function newsTab(p){const st=W.st;if(!st)return'<div>No war running.</div>';const R=rec(p);const row=(a,b)=>'<div style="display:flex;justify-content:space-between;gap:8px"><span>'+esc(a)+'</span><b>'+esc(b)+'</b></div>';
  const OUT=outlets(p,R);let h=row('Press freedom (estimate)',Math.round(R.pf*100)+' %')+row('Journalists killed / injured',R.jk+' / '+R.ji);
  if(R.brk.length)h+='<h4>BREAKING</h4>'+R.brk.slice(-4).reverse().map(b=>'<div style="font-size:11px;margin:2px 0;color:'+(b.corr?'#cfa94f':'#ff8a6a')+'">'+esc(b.txt)+'</div>').join('');
  h+='<h4>NEWSROOMS · LATEST EDITIONS</h4>'+OUT.map(m=>{const e=m.ed[m.ed.length-1];return'<div style="margin:5px 0"><b>'+esc(m.n)+'</b> <span style="color:#8a9a92;font-size:10px">'+m.k+' · '+m.lean.toLowerCase()+' · verification '+Math.round(m.ver*100)+' %</span>'+(e?e.items.map(i=>{const ev=st.ev.find(x=>x.id===i.ev);i.txt=ev?frame(m,ev,p):'(archived report)';return i;}).map(i=>'<div style="font-size:11px">· '+esc(i.txt.slice(0,150))+' <span style="color:#8a9a92">('+i.cf.toLowerCase()+', '+i.conf+' %)</span></div>').join(''):'<div style="font-size:11px;color:#8a9a92">no edition yet</div>')+'</div>';}).join('');
  h+='<h4>CORRESPONDENTS</h4>'+(R.corr.map(j=>row(j.n+' · '+MD(p)[j.o].n,j.at+' · '+j.st.toLowerCase())).join('')||'<div>none assigned</div>');
  if(R.clips.length)h+='<h4>FOOTAGE</h4><div style="display:flex;flex-wrap:wrap;gap:6px">'+R.clips.slice(-6).reverse().map(c=>(c.desc=CLIPD[c.kind]+' near '+c.at,c)).map(c=>'<figure style="margin:0;width:120px;font-size:10px"><img src="'+still(c)+'" width="120" height="68" alt="'+esc(c.desc)+'"><figcaption>'+esc(c.desc)+' · '+esc(c.by)+'</figcaption></figure>').join('')+'</div>';
  return h+'<div style="font-size:10px;color:#8a9a92;margin-top:6px">One event, many reports: each outlet frames the same record; corrections follow claims. Outlets and people are fictional.</div>';}
function civicTab(p){const st=W.st;if(!st)return'<div>No war running.</div>';const R=rec(p);const row=(a,b)=>'<div style="display:flex;justify-content:space-between;gap:8px"><span>'+esc(a)+'</span><b>'+esc(b)+'</b></div>';const pc=v=>Math.round(v*100)+' %';
  let h='<h4>CIVIL SOCIETY</h4>'+R.cso.map(o=>row(p.n+' '+CSON[o.i],'capacity '+pc(o.cap)+' · '+o.proj.filter(x=>!x.done).length+' projects')).join('');
  h+='<h4>SUPPORT INSTITUTIONS</h4>'+Object.entries(R.inst).map(([k,a])=>row(INSTN[k],pc(a.cap)+(a.hist.length?' · '+a.hist[a.hist.length-1].txt:''))).join('');
  h+='<h4>CULTURE AND HERITAGE</h4>'+R.cult.her.map(x=>row(x.n,x.state.toLowerCase()+(x.prot?' · protected':''))).join('')+row(R.cult.sport.n,R.cult.sport.status.toLowerCase())+row('Venues open',pc(R.cult.venues))+row('Tourism',pc(R.cult.tour))+row('War art and archives',R.cult.artists+' works · '+R.cult.arch+' collections');
  h+='<h4>CITIES</h4>'+Object.entries(R.muni).slice(0,6).map(([n,M])=>row(n+' · mayor '+(M.mayor||((cities(p.a3).find(c=>c.n===n)||{}).mayor)||'—'),'budget '+pc(M.bud.spend)+' · sanitation '+pc(M.san)+' · elections '+M.elect)).join('');
  const P=R.police;h+='<h4>POLICE AND COURTS</h4>'+row('Open cases (report → investigation → charge → trial → verdict)',P.cases.filter(c=>c.stg<4).length+' · closed '+P.done)+row('Curfew',P.curfew?'yes':'no')+row('Calls for help answered',P.help)+row('Civil claims: property / contracts / regulation',R.courts.claims.prop+' / '+R.courts.claims.contract+' / '+R.courts.claims.reg)+row('Court backlog',R.courts.backlog)+row('Rule of law (estimate)',pc(R.courts.rol));
  const X=R.crime;h+='<h4>CRIME AND CORRUPTION (ABSTRACT)</h4>'+row('Organised crime',pc(X.net))+row('Black markets: fuel / goods / arms',pc(X.mk.fuel)+' / '+pc(X.mk.goods)+' / '+pc(X.mk.arms))+row('Corruption (costs defence output)',pc(X.corr));
  h+='<h4>DIPLOMACY</h4>'+row('Foreign embassies here',R.dip.emb)+row('Citizens abroad (estimate)',R.dip.citAbroad.toLocaleString())+(R.dip.neo.length?row('Evacuations',R.dip.neo.map(n=>n.n.toLocaleString()).join(', ')):'');
  const io2=C().io;if(io2)h+='<h4>INTERNATIONAL ORGANISATIONS</h4>'+io2.org.map(o=>row(o.n,'funding '+pc(o.fund)+' · audits '+o.aud)).join('')+io2.sanc.map(s=>row('Sanctions',s.note)).join('');
  return h+'<div style="font-size:10px;color:#8a9a92;margin-top:6px">All organisations and people are fictional; figures are estimates by rule.</div>';}
if(window.NATPANEL&&NATPANEL.tabs){NATPANEL.tabs.NEWSROOM=newsTab;NATPANEL.tabs.CIVIC=civicTab;}
W.civic={outlets,MD,C,rec,daily,media,civil,support,culture,muni,police,courts,crime,diplo,io,still};
})();
