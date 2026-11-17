/* =====================================================================================================================
   v347 — the wider world around the war (spec v49 ch.05 pre-war tension, international organizations and observers,
   strategic deterrence governance, non-state actors and proxies, surrender terms, ceasefire monitoring, data privacy;
   ch.09 civil society and volunteers, embassies and evacuations, borders and customs, municipal government, policing
   and organized crime, war correspondents; ch.11 agriculture and fisheries, water across borders, air traffic and
   aviation safety investigations, undersea cables and pipelines, passenger transport, orbital services; ch.12 ecology
   and biodiversity, humanitarian supply chains, CBRN civil protection). Abstract and gameplay-level; no methods.
   * TENSION (before and outside the war): a tension index per pair of rival countries rises with incidents and falls
     with talks; at the top the war's existing escalation applies (diplomacy.js); a HOTLINE call can lower it.
   * INTERNATIONAL ORGANIZATIONS: a fictional "Assembly of Nations" with a security council, observers, a humanitarian
     agency and an atomic-safety agency: resolutions (adopted or blocked by a veto from either side), observer missions
     on ceasefire lines (violations reported), agency access requests.
   * STRATEGIC DETERRENCE: the countries with strategic forces (scenario list) keep them on a readiness level; the war
     raises it; alerts and false warnings are possible and are always resolved by verification and the hotline. This
     campaign never models the use of strategic weapons (a fixed scenario rule, stated in the panel).
   * NON-STATE ACTORS: militias, proxies and armed groups (fictional) appear in fragile countries near the war; state
     sponsorship is recorded as ALLEGED or ATTRIBUTED; groups can spoil or join peace talks.
   * SURRENDER AND MONITORING: surrender terms for units cut off (recorded with prisoner treatment under the scenario's
     law); after a ceasefire, monitors report violations weekly.
   * CIVIL SOCIETY: volunteers and mutual aid grow in countries at war; embassies evacuate their citizens from countries
     entering the war; borders tighten (customs, refugee reception); city mayors keep services; organized crime and
     corruption grow with shortages (cases); war correspondents report from the fronts (the media layer cites them).
   * FOOD, WATER, AVIATION, SEA FLOOR, SPACE: harvests by season (war cuts them), fisheries closed in contested seas,
     shared rivers under strain; civil air traffic control and safety investigations of civil incidents; damage to
     undersea cables and pipelines in contested seas (attribution uncertain); passenger rail and bus service levels;
     orbital services (navigation, weather, communications) degraded by jamming (intel.js).
   * ECOLOGY: biodiversity index per country falls with pollution and wildfires and recovers slowly; humanitarian
     supply chains deliver relief by road, rail, air and sea into the countries that need it.
   * PRIVACY: personal data in the campaign belongs only to fictional people; nothing is sent anywhere; saves stay in
     this browser unless the player exports them.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,rn=Math.random;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const STRAT=['USA','RUS','CHN','GBR','FRA','IND','PAK','PRK','ISR'];   // scenario list: countries with strategic forces (public knowledge)
const X=()=>W.st.wx2||(W.st.wx2={ten:{},res:[],obs:{},det:{lvl:1},grp:[],cs:{},emb:{},crime:{},food:{},cable:0,bio:{},relief:0,corr:0,surr:0,seq:1});
const sides=st=>({B:Object.values(st.c).filter(p=>p.side==='B'&&bel(p)),R:Object.values(st.c).filter(p=>p.side==='R'&&bel(p))});
/* ------------------------------------------------------------------ tension and the hotline */
function tension(){const st=W.st,x=X();for(const f of st.fronts){const k=f.a+'|'+f.b;const v=x.ten[k]??.3;const act=!f.cf;x.ten[k]=cl(v+(act?.004:-.01)+(rn()<.02?.05:0),0,1);
  if(x.ten[k]>.85&&!x['hl'+k]&&rn()<.2){x['hl'+k]=st.t;x.ten[k]-=.2;W.emit('DIPLO',{e:[f.a,f.b],txt:'The leaders of '+st.c[f.a].n+' and '+st.c[f.b].n+' speak on the hotline to keep the war from widening.'});}}}
/* ------------------------------------------------------------------ the Assembly of Nations */
function assembly(){const st=W.st,x=X();if(st.over?rn()>.01:rn()>.02)return;const S=sides(st);if(!S.B.length||!S.R.length)return;
  const topic=['a humanitarian ceasefire','safe access for aid','the protection of civilians','the release of prisoners','a ban on attacks on power stations'][(rn()*5)|0];
  const veto=rn()<.55;const r={id:'R'+(x.seq++),t:st.t,topic,ok:!veto};x.res.unshift(r);x.res.length=Math.min(x.res.length,20);
  W.emit('ASSEMBLY',{txt:'The Assembly of Nations (fictional) votes on a resolution calling for '+topic+': '+(veto?'blocked by a veto in the security council.':'adopted. Implementation depends on the parties.')});
  if(!veto&&topic==='safe access for aid')x.relief+=1;}
function observers(){const st=W.st,x=X();for(const f of st.fronts){if(!f.cf){delete x.obs[f.id];continue;}if(!x.obs[f.id]){x.obs[f.id]={t:st.t,v:0};W.emit('OBSERVERS',{e:[f.a,f.b],txt:'Observers of the Assembly of Nations deploy along the '+st.c[f.a].n+' / '+st.c[f.b].n+' ceasefire line.'});}
  if(Math.floor(st.t/24)%7===0&&rn()<.3){x.obs[f.id].v++;W.emit('OBSERVERS',{e:[f.a,f.b],cf:'REPORTED',txt:'Ceasefire monitors report violations on the '+st.c[f.a].n+' / '+st.c[f.b].n+' line this week; both sides are urged to restrain their forces.'});}}}
/* ------------------------------------------------------------------ strategic deterrence (never used in this campaign) */
function deterrence(){const st=W.st,x=X(),d=x.det;const war=st.fronts.some(f=>!f.cf&&(STRAT.includes(f.a)||STRAT.includes(f.b)));const want=st.over?1:war?3:1;
  if(d.lvl<want&&rn()<.05){d.lvl++;W.emit('DETERRENCE',{txt:'Strategic forces of the nuclear-armed powers move to a higher readiness level ('+d.lvl+' of 4). Diplomats warn against any escalation.'});}
  if(d.lvl>want&&rn()<.05){d.lvl--;W.emit('DETERRENCE',{txt:'Strategic readiness is lowered ('+d.lvl+' of 4).'});}
  if(d.lvl>=3&&rn()<.002)W.emit('DETERRENCE',{cf:'REPORTED',txt:'An early-warning alert is found to be a false indication after verification; the hotline is used and forces stand down from the alert.'});}
/* ------------------------------------------------------------------ non-state groups */
const GN=['Northern Front','Free Valley Movement','Sons of the River','People\'s Defence Committees','Mountain Brigades','Coastal Guard Militia','Western Union of Fighters','Plains Self-Defence'];
function groups(){const st=W.st,x=X();if(st.over||rn()>.008)return;const L=Object.values(st.c).filter(p=>!p.side&&p.gdp<2e5&&(p.stab??.8)<.75&&st.fronts.some(f=>{const c=WGEO.byA3.get(p.a3),s=f.sec[0];return c&&WGEO.dist(c.ly,c.lx,s.lat,s.lon)<1.5e6;}));if(!L.length)return;
  const p=L[(rn()*L.length)|0];if(x.grp.filter(g=>g.a3===p.a3).length>=2)return;const sp=sides(st)[rn()<.5?'B':'R'],spo=sp.length?sp[(rn()*sp.length)|0]:null;
  const g={id:'G'+(x.seq++),n:GN[(rn()*GN.length)|0],a3:p.a3,kind:['militia','armed group','proxy force'][(rn()*3)|0],spon:spo&&spo.a3,t:st.t};x.grp.push(g);
  W.emit('GROUP',{e:[p.a3].concat(spo?[spo.a3]:[]),cf:spo?'ALLEGED':'REPORTED',txt:'A '+g.kind+' calling itself the '+g.n+' (fictional) is active in '+p.n+'.'+(spo?' Reports allege support from '+spo.n+'.':'')+' '+p.n+'\'s government declares a state of emergency in the region.'});
  if(p.stab!=null)p.stab=Math.max(.2,p.stab-.03);}
/* ------------------------------------------------------------------ civil society, embassies, borders, cities, crime, correspondents */
function civil(){const st=W.st,x=X();for(const p of Object.values(st.c)){const war=bel(p)&&!st.over;const c=x.cs[p.a3]||(x.cs[p.a3]={vol:0,mayor:1,border:0,crime:0});
  c.vol=cl(c.vol+(war?.01:-.003),0,1);c.mayor=cl(c.mayor+(war?-.002:.004),.4,1);c.border=cl(c.border+(war?.02:-.01),0,1);
  const short=p.ecn?(1-p.ecn.food)+(1-p.ecn.fuel/60):0;c.crime=cl(c.crime+short*.004-.002,0,1);
  if(war&&!x.emb[p.a3]){x.emb[p.a3]=st.t;W.emit('EVACUATION',{e:[p.a3],txt:'Embassies in '+p.n+' reduce their staff and help their citizens leave by road, rail and charter flights while borders are still open.'});}
  if(c.crime>.4&&rn()<.004)W.emit('JUSTICE',{e:[p.a3],txt:'Police in '+p.n+' break up a ring selling stolen fuel and food aid on the black market; officials are among those charged with corruption.'});
  if(war&&c.vol>.3&&rn()<.003)W.emit('CIVIL',{e:[p.a3],txt:'Volunteers in '+p.n+' run shelters, field kitchens and transport for the displaced; mutual-aid networks link towns across the country.'});}
  if(!st.over&&rn()<.02){const f=st.fronts.find(q=>!q.cf);if(f){x.corr++;W.emit('PRESS',{e:[f.a,f.b],cf:'REPORTED',txt:'A war correspondent (fictional) reports from near the '+st.c[f.a].n+' / '+st.c[f.b].n+' front: damaged villages, a field hospital, soldiers waiting. Journalists are civilians and must be protected.'});}}}
/* ------------------------------------------------------------------ surrender of cut-off units */
function surrender(){const st=W.st,x=X();if(st.over)return;for(const f of st.fronts){if(f.cf||rn()>.004)continue;const A=st.c[f.a],B=st.c[f.b];const weak=A.gnd<B.gnd*.5?A:B.gnd<A.gnd*.5?B:null;if(!weak)continue;const o=weak===A?B:A;x.surr++;
  if(st.csar)st.csar.pow[o.side]=(st.csar.pow[o.side]||0)+Math.round(50+rn()*300);
  W.emit('SURRENDER',{e:[weak.a3,o.a3],cf:'REPORTED',txt:'A cut-off '+weak.n+' battalion surrenders to '+o.n+'\'s forces after its positions are surrounded. The prisoners are registered with the international humanitarian agency; under the law of armed conflict they must be protected.'});}}
/* ------------------------------------------------------------------ food, water, sea floor, aviation, transport, space */
function resources(){const st=W.st,x=X(),m=W.month?W.month(st.t):0;
  for(const p of Object.values(st.c)){const f=x.food[p.a3]||(x.food[p.a3]={harvest:1,fish:1,river:1,rail:1,atc:1});const war=bel(p)&&!st.over,e=p.ecn;
    f.harvest=cl(f.harvest+((war?(e?e.trans*.5+.4:.9):1)-f.harvest)*.02,.3,1.1);f.rail=cl(e?e.trans*(e.energy*.5+.5):1,.1,1);f.atc=war?.5:Math.min(1,f.atc+.02);
    if(e&&f.harvest<.75)e.food=Math.max(.3,e.food-.002);}
  if(st.navy)for(const[id,t]of Object.entries(st.navy.th||{})){if(Math.abs(t.sup)<.9&&!st.over&&rn()<.003){x.cable++;W.emit('SEABED',{cf:'ALLEGED',txt:'An undersea communications cable is damaged in a contested sea; repair ships are dispatched. The cause is under investigation and has not been attributed.'});}}
  if(rn()<.002&&!st.over){const L=Object.values(st.c).filter(p=>!p.side&&p.gdp>1e5);if(L.length){const p=L[(rn()*L.length)|0];W.emit('AVIATION',{e:[p.a3],txt:'A civil aircraft incident in '+p.n+': the national safety board opens an investigation; findings and safety recommendations will follow. Airspace near the war is avoided by airlines.'});}}}
/* ------------------------------------------------------------------ ecology and relief */
function ecology(){const st=W.st,x=X();for(const p of Object.values(st.c)){const l=p.life;const b=x.bio[p.a3]??1;x.bio[p.a3]=cl(b-(l?l.env.pol*.0008:0)+(1-b)*.0005,.3,1);}
  const need=Object.values(st.c).filter(p=>(p.disp||0)>p.pop*.01);if(need.length&&rn()<.05){const p=need[(rn()*need.length)|0];const by=['road','rail','air','sea'][(rn()*4)|0];x.relief++;
    if(p.ecn)p.ecn.food=Math.min(1,p.ecn.food+.01);W.emit('RELIEF',{e:[p.a3],txt:'A humanitarian convoy by '+by+' brings food, medicine and shelter material into '+p.n+' under the agreed access arrangements.'});}}
W.daily.push(()=>{if(!W.st)return;tension();assembly();observers();deterrence();groups();civil();surrender();resources();ecology();});
/* ------------------------------------------------------------------ WORLD tab */
const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>',esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function tab(p){const st=W.st,x=X(),c=x.cs[p.a3]||{},f=x.food[p.a3]||{},pc=v=>v==null?'—':Math.round(v*100)+' %';
  let h='<h4>INTERNATIONAL</h4>'+row('Strategic readiness (world)',x.det.lvl+' of 4')+(STRAT.includes(p.a3)?row('Strategic forces','yes (deterrent; never used in this campaign)'):'')+
    x.res.slice(0,3).map(r=>'<div>· Resolution on '+esc(r.topic)+': '+(r.ok?'adopted':'vetoed')+'</div>').join('')+
    x.grp.filter(g=>g.a3===p.a3||g.spon===p.a3).map(g=>'<div>· '+esc(g.n)+' ('+g.kind+', fictional)'+(g.spon?' — support from '+esc(st.c[g.spon].n)+' alleged':'')+'</div>').join('');
  h+='<h4>SOCIETY</h4>'+row('Volunteer networks',pc(c.vol))+row('City services kept by mayors',pc(c.mayor))+row('Border controls',pc(c.border))+row('Organized crime and corruption',pc(c.crime))+(x.emb[p.a3]?row('Embassies','evacuated'):'');
  h+='<h4>FOOD, TRANSPORT, NATURE</h4>'+row('Harvest',pc(f.harvest))+row('Passenger rail and buses',pc(f.rail))+row('Air traffic control',pc(f.atc))+row('Biodiversity (index)',pc(x.bio[p.a3]));
  h+='<div style="font-size:10px;color:#8a9a92;margin-top:4px">Organizations and groups named here are fictional. Personal data in this campaign belongs only to fictional people and stays in this browser.</div>';return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.WORLD=tab;
W.world2={X,tab,STRAT};
})();
