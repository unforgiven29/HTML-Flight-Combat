/* =====================================================================================================================
   v372 — every person accounted for, and every munition counted (spec v49 ch.08 explicit birth, death, migration flows
   and cohort accounting; ch.14 "every confirmed death ... one memorial entry", aggregate cohorts with memorial
   slots; ch.02 accounting, counters, losses and ledgers; ch.06 ammunition and expenditure ledgers).
   PERSONNEL IN FORMATIONS: every loss of strength is people. Each day the simulation RESOLVES the fates of the
   people in what was lost (draws, not a fixed percentage; parameters in R):
     ground forces — 4,000 people per brigade-equivalent lost: killed, missing, wounded (wounded are not deaths; a few
       die of wounds later, recorded on that later day);
     aircrew — 1.3 per combat aircraft lost: killed, missing, or rescued / captured;
     navies — the crew of each ship lost (destroyers and frigates 220, submarines 90, amphibious 300, carriers 3,000):
       killed, missing, rescued.
   Losses already resolved person by person in your sorties (cemetery.js) are not drawn again.
   CIVILIANS: people in cities within reach of the fighting (cities.js exposure), displaced people in shelters when
   health services are overloaded, and occupied cities: each person-day carries a hazard (R); deaths are drawn and
   recorded per city and cause. NATURAL DEATHS: each month, by the country's death rate (life.js), recorded as
   not war-related. Every recorded death is subtracted from the living population and has a memorial entry.
   LIVING ACCOUNT per country (PEOPLE tab): population at the start, births, natural deaths, war deaths (military /
   civilian), displaced, refugees, alive now.
   MUNITIONS LEDGER: every weapon fired in your sorties (missiles, bombs, rockets, gun rounds) counted by type and
   country; strategic expenditure by class (conventional long-range missiles and interceptors as counts; artillery
   rounds, air-to-air and surface-to-air missiles and precision weapons from the days of combat supply used, at R's
   rounds-per-day rule, labelled). MUNITIONS tab; the epilogue draws them lined up.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.cemetery)return;
const W=WWAR,G=WGEO,C=W.cemetery,rn=Math.random;
const R={bde:4000,kia:.22,mia:.08,wia:.70,dow:.03,crew:1.3,aKia:.4,aMia:.15,ship:{sur:220,sub:90,amp:300,cv:3000},sKia:.35,sMia:.1,
  shell:1.5e-6,shelter:5e-6,shelterBad:2e-5,occupied:4e-7,
  perDay:{ART:2500,AAM:12,SAM:20,PGM:30}};   // rounds per country per day of combat supply used, per brigade-front (rule, labelled)
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
function draw(n,p){if(n<=0||p<=0)return 0;const m=n*p,sd=Math.sqrt(Math.max(0,n*p*(1-p)));let x=Math.round(m+sd*gauss());if(n<30){x=0;for(let i=0;i<n;i++)if(rn()<p)x++;}return Math.max(0,Math.min(n,x));}
function gauss(){let u=0,v=0;while(u===0)u=rn();while(v===0)v=rn();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const S=()=>W.st.census||(W.st.census={c:{},acc:{},mun:{},dow:[]});
function acct(p){const s=S();return s.c[p.a3]||(s.c[p.a3]={pop0:p.pop,births:0,nat:0,warM:0,warC:0,lastAir:p.lostAir,lastGnd:p.lostGnd,lastNav:null});}
function rec(p,o){const r=C.record(Object.assign({a3:p.a3,src:null},o));if(!r)return;const a=acct(p);if(o.nat)a.nat+=o.n;else if(o.kind==='MIL'&&o.st!=='MISSING')a.warM+=o.n;else if(o.kind==='CIV')a.warC+=o.n;if(!o.nat)p.pop=Math.max(1e4,p.pop-(o.st==='MISSING'?0:o.n));}   /* natural deaths are already in life.js's growth rate */
// what the sorties already resolved person by person: aircraft and vehicles (cemetery.js records count here)
if(typeof Jet!=='undefined'){const _k=Jet.prototype.kill;Jet.prototype.kill=function(){const was=this.alive&&this._ws&&W.st&&window.WSORTIE&&WSORTIE.WS.on&&this!==player;const r=_k.apply(this,arguments);if(was&&!this.alive){const a=S().acc;a[this._ws]=a[this._ws]||{air:0,gnd:0};a[this._ws].air++;}return r;};}
if(typeof GUnit!=='undefined'){const _k=GUnit.prototype.kill;GUnit.prototype.kill=function(){const was=this.alive&&this._ws&&W.st&&this._bde;const r=_k.apply(this,arguments);if(was&&!this.alive){const a=S().acc;a[this._ws]=a[this._ws]||{air:0,gnd:0};a[this._ws].gnd+=.01;}return r;};}
function front(p){const f=W.st.fronts.find(q=>(q.a===p.a3||q.b===p.a3)&&!q.cf);return f?'front with '+W.st.c[f.a===p.a3?f.b:f.a].n:'not recorded';}
function daily(){const st=W.st,s=S(),day=Math.floor(st.t/24);
  for(const p of Object.values(st.c)){if(!p.side&&!s.c[p.a3]&&!p.disp)continue;const a=acct(p),acc=s.acc[p.a3]||{air:0,gnd:0};
    // ground forces
    let dg=p.lostGnd-a.lastGnd-acc.gnd;a.lastGnd=p.lostGnd;acc.gnd=0;if(dg>0){const N=Math.round(dg*R.bde);const k=draw(N,R.kia),m=draw(N-k,R.mia/(1-R.kia)),w=N-k-m;
      if(k)rec(p,{kind:'MIL',role:'soldier',unit:'not recorded',place:front(p),cause:'killed in action',n:k,st:'KILLED'});if(m)rec(p,{kind:'MIL',role:'soldier',unit:'not recorded',place:front(p),cause:'missing in action',n:m,st:'MISSING'});
      const d=draw(w,R.dow);if(d)s.dow.push({a3:p.a3,n:d,t:st.t+24*(2+((rn()*20)|0)),place:front(p)});}
    // aircrew
    let da=p.lostAir-a.lastAir-acc.air;a.lastAir=p.lostAir;acc.air=0;if(da>0){const N=Math.round(da*R.crew);const k=draw(N,R.aKia),m=draw(N-k,R.aMia/(1-R.aKia));const th=(st.th||[]).find(t=>t.f&&t.f[p.a3]);
      if(k)rec(p,{kind:'MIL',role:'aircrew',unit:'not recorded',place:th?th.name:'not recorded',cause:'killed in an aircraft loss',n:k,st:'KILLED'});if(m)rec(p,{kind:'MIL',role:'aircrew',unit:'not recorded',place:th?th.name:'not recorded',cause:'missing after an aircraft loss',n:m,st:'MISSING'});}
    // navies
    if(p.nav&&p.nav.lost){const L=p.nav.lost,prev=a.lastNav||{sur:L.sur,sub:L.sub,amp:L.amp,cv:L.cv};for(const k of['sur','sub','amp','cv']){const n=(L[k]-prev[k])*R.ship[k];if(n>0){const kk=draw(n,R.sKia),mm=draw(n-kk,R.sMia/(1-R.sKia));
        if(kk)rec(p,{kind:'MIL',role:'sailor',unit:'not recorded',place:'at sea',cause:'lost at sea when their ship was sunk',n:kk,st:'KILLED'});if(mm)rec(p,{kind:'MIL',role:'sailor',unit:'not recorded',place:'at sea',cause:'missing at sea',n:mm,st:'MISSING'});}}
      a.lastNav={sur:L.sur,sub:L.sub,amp:L.amp,cv:L.cv};}
    // civilians in cities under fire, in shelters, under occupation
    const cities=(st.city&&st.city[p.a3])||[];for(const c of cities){if(c.exp<.5)continue;const n=draw(c.pop,R.shell*c.exp);if(n)rec(p,{kind:'CIV',role:'civilian',place:c.n,cause:c.exp>1.5?'killed in the fighting in '+c.n:'killed when shelling and air attacks struck '+c.n,n,st:'KILLED'});
      if(c.held&&c.held!==p.a3){const o=draw(c.pop,R.occupied);if(o)rec(p,{kind:'CIV',role:'civilian',place:c.n,cause:'killed in '+c.n+' under occupation',n:o,st:'KILLED'});}}
    if(p.disp>0){const l=p.life,bad=l&&l.health.load>1.2;const n=draw(Math.round(p.disp),bad?R.shelterBad:R.shelter);if(n)rec(p,{kind:'CIV',role:'displaced civilian',place:'displacement shelters',cause:'died of illness while displaced',n,st:'KILLED'});}
    // natural deaths and births, monthly
    if(day%30===0&&p.life){const nd=draw(Math.round(p.pop),p.life.dem.death/12);if(nd)rec(p,{kind:'CIV',role:'resident',place:p.n,cause:'died of natural causes',n:nd,st:'KILLED',nat:true});a.births+=Math.round(p.pop*p.life.dem.birth/12);}}
  // deaths of wounds, on their own day
  for(let i=s.dow.length-1;i>=0;i--){const d=s.dow[i];if(st.t<d.t)continue;s.dow.splice(i,1);const p=st.c[d.a3];if(p)rec(p,{kind:'MIL',role:'soldier',place:d.place,cause:'died of wounds after evacuation',n:d.n,st:'KILLED'});}
  munDaily();}
W.daily.push(()=>{if(W.st)daily();});
/* ------------------------------------------------------------------ munitions ledger */
const M=()=>S().mun;
function addMun(a3,type,n){if(!a3||!type||!n)return;const m=M();const r=m[a3]||(m[a3]={});r[type]=(r[type]||0)+n;}
const ownerOf=j=>j===player?(window.WSORTIE&&WSORTIE.WS.me)||'PLAYER':j&&j._ws;
if(typeof missiles!=='undefined'){const _p=missiles.push.bind(missiles);missiles.push=function(...a){for(const m of a)try{if(m&&!m.remote&&m.sh&&W.st&&window.WSORTIE&&WSORTIE.WS.on)addMun(ownerOf(m.sh),m.type,1);}catch(e){}return _p(...a);};}
if(typeof GND!=='undefined'){const _d=GND.drop.bind(GND);GND.drop=function(kind,P){try{if(W.st&&window.WSORTIE&&WSORTIE.WS.on)addMun(ownerOf(P),kind,1);}catch(e){}return _d.apply(GND,arguments);};
  if(GND.launchMav){const _l=GND.launchMav.bind(GND);GND.launchMav=function(w,P){try{if(W.st&&window.WSORTIE&&WSORTIE.WS.on)addMun(ownerOf(P),w,1);}catch(e){}return _l.apply(GND,arguments);};}}
// gun rounds: counted at the end of each sortie from every jet's ammunition used
if(window.WSORTIE){const _s=WSORTIE.start;WSORTIE.start=async function(){const r=await _s.apply(this,arguments);try{if(player&&player.gun)player._ammo0=player.gun.ammo;}catch(e){}return r;};
  const _f=WSORTIE.finish;WSORTIE.finish=function(){try{if(WSORTIE.WS.on&&player&&player.gun&&player._ammo0!=null)addMun(WSORTIE.WS.me,'gun rounds ('+(player.ac.gun&&player.ac.gun.n||player.type)+')',Math.max(0,player._ammo0-player.gun.ammo));
    for(const j of WSORTIE.WS.jets)if(j.gun&&j._ammo0!=null)addMun(j._ws,'gun rounds',Math.max(0,j._ammo0-j.gun.ammo));}catch(e){}return _f.apply(this,arguments);};
  setInterval(()=>{if(!WSORTIE.WS.on)return;for(const j of WSORTIE.WS.jets)if(j.gun&&j._ammo0==null)j._ammo0=j.gun.ammo;},2000);}
// strategic expenditure: days of supply used per class, at R.perDay rounds per brigade on active fronts; long-range missiles and interceptors as counts
function munDaily(){const st=W.st;for(const p of Object.values(st.c)){const m=st.mil&&st.mil[p.a3];if(!m)continue;const last=m._lastMun||{...m.mun};m._lastMun={...m.mun};
    const B=W.ob&&st.ob&&st.ob.by[p.a3]?W.ob.units(p.a3).filter(u=>u.kind==='BDE'&&u.front&&u.st==='ACTIVE').length:0;
    for(const k of Object.keys(R.perDay)){const used=Math.max(0,(last[k]||0)-(m.mun[k]||0));if(used>0)addMun(p.a3,{ART:'artillery rounds',AAM:'air-to-air missiles',SAM:'surface-to-air missiles',PGM:'precision-guided weapons'}[k],Math.round(used*R.perDay[k]*Math.max(1,k==='ART'?B:B/4)));}
    const r=st.strat&&st.strat.c[p.a3];if(r){const f0=m._lastFired||0,i0=m._lastIntc||0;if(r.fired>f0)addMun(p.a3,'long-range missiles',r.fired-f0);m._lastFired=r.fired;}}}
/* ------------------------------------------------------------------ the PEOPLE and MUNITIONS tabs */
const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>',f=n=>Math.round(n||0).toLocaleString('en');
function people(p){const a=S().c[p.a3];if(!a)return'<div>No accounting yet.</div>';const T=C.totals(p.a3);
  return '<h4>THE LIVING ACCOUNT</h4><div style="font-size:10px;color:#8a9a92">Every recorded death has a memorial entry (CEMETERY). War deaths are resolved by the simulation from losses and exposure; natural deaths and births by the country\'s rates.</div>'+
    row('Population at the start',f(a.pop0))+row('Births',f(a.births))+row('Deaths from natural causes',f(a.nat))+row('Military killed',f(T.kM))+row('Military missing',f(T.mM))+row('Civilians killed in the war',f(T.kC))+row('Displaced at home',f(p.disp))+row('Refugees abroad',f(p.ref))+row('Alive now',f(p.pop));}
function munitions(p){const m=M()[p.a3];if(!m)return'<div>No munitions recorded yet.</div>';const L=Object.entries(m).sort((a,b)=>b[1]-a[1]);
  return '<h4>MUNITIONS USED</h4><div style="font-size:10px;color:#8a9a92">Counted round by round in your sorties; strategic expenditure from the days of combat supply used (rounds-per-day rule) and long-range missiles fired.</div>'+L.map(([k,v])=>row(k,f(v))).join('')+'<div class="row"><span>Total</span><b>'+f(L.reduce((t,x)=>t+x[1],0))+'</b></div>';}
if(window.NATPANEL&&NATPANEL.tabs){NATPANEL.tabs.MUNITIONS=munitions;const _p=NATPANEL.tabs.PEOPLE_REGISTER;NATPANEL.tabs.PEOPLE_REGISTER=p=>people(p)+(_p?_p(p):'');}
W.census={R,S,daily,addMun,people,munitions,draw};
})();
