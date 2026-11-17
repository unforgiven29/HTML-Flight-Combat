/* =====================================================================================================================
   v356 — the register of the dead and missing, for every country (spec v49 ch.14 death ledger reconciliation with
   person records, aggregated deaths where named records do not exist, names and places, cemetery and memorial).
   FICTIONAL PEOPLE: every name comes from the regional name pools; no real person is represented. Each record keeps
   who the person was (civilian occupation or military rank, unit and role), their age and home town, when and where
   they died or went missing, and how — in plain words, without injuries described.
   ONE AUTHORITY: deaths come only from the war's own losses, as ESTIMATES BY RULE:
     aircrew: each combat aircraft lost costs about 1.3 crew, of whom about 60 % are killed or missing (the rest are
       rescued or captured, csar.js);
     ground forces: each brigade-equivalent lost is about 4,000 soldiers, of whom about 12 % are killed or missing;
     navies: about 60 sailors for each ship lost;
     civilians: shelling and air raids on exposed cities (cities.js), unexploded ordnance (military.js), illness in
       displacement shelters, and disasters (hazards.js) — each at a stated rate.
   NAMED RECORDS: up to 400 military and 400 civilian named records per country; beyond that, deaths are counted in the
   register's totals ("and N more, recorded as numbers"). The CEMETERY tab lists, filters and searches them; the
   epilogue's "Names and places" reads from it.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.lead)return;
const W=WWAR,G=WGEO,rn=Math.random,Ld=W.lead;
const pick=a=>a[(rn()*a.length)|0];
const CAP=400;
const JOBS=['a teacher at a primary school','a nurse at the city hospital','a farmer','a university student','a bus driver','a civil engineer','a shopkeeper','a retired railway worker','a doctor at a district clinic','a baker',
  'an electrician with the power company','a local journalist','a volunteer with the Red Cross society','a firefighter','a schoolchild','a pensioner','a factory worker','a social worker','a librarian','a water-utility technician',
  'a lorry driver delivering food','a pharmacist','a carpenter','a musician','a fisherman','a postal worker','a kindergarten teacher','a cook at a school canteen','a mechanic','a priest of the local parish'];
const C=()=>W.st.cem||(W.st.cem={});
function reg(a3){const S=C();return S[a3]||(S[a3]={mil:{n:0,L:[]},civ:{n:0,L:[]},last:{air:null,gnd:null,nav:null,uxo:0},seq:1});}
function nm(a3){const x=Ld.person(a3,'civilian',null);const n=x.name;if(W.st.lead&&W.st.lead.people)delete W.st.lead.people[x.id];return n;}
function town(p){const L=G.places.filter(q=>q.a3===p.a3);return L.length?pick(L.slice(0,60)).name:p.n;}
function add(p,kind,rec,count){const r=reg(p.a3),b=kind==='MIL'?r.mil:r.civ;b.n+=count;const named=Math.min(count,Math.max(0,CAP-b.L.length),kind==='MIL'?6:6);
  for(let i=0;i<named;i++){const x=Object.assign({id:p.a3+'-'+(r.seq++),t:W.st.t,kind},rec(i));b.L.push(x);}}
function nearCity(p,f){const s=f&&f.sec[(f.sec.length/2)|0];if(!s)return p.n;let best=null,bd=1e12;for(const q of G.places){if(q.a3!==p.a3&&f&&q.a3!==f.a&&q.a3!==f.b)continue;const d=G.dist(q.lat,q.lon,s.lat,s.lon);if(d<bd){bd=d;best=q;}}return best?best.name:p.n;}
function daily(){const st=W.st;
  for(const p of Object.values(st.c)){if(!p.side&&!st.cem?.[p.a3])continue;const r=reg(p.a3),L=r.last;
    // aircrew
    if(L.air==null)L.air=p.lostAir;const da=p.lostAir-L.air;L.air=p.lostAir;
    if(da>0){const n=Math.round(da*1.3*.6+rn()*.5);if(n>0){const th=(st.th||[]).find(t=>t.f&&t.f[p.a3]);const S=W.ob&&W.ob.units?W.ob.units(p.a3).filter(u=>u.kind==='SQN'&&u.num):[];
      add(p,'MIL',()=>{const u=S.length?pick(S):null,miss=rn()<.3;return{n:nm(p.a3),age:22+((rn()*20)|0),home:town(p),role:(W.lead.rank(p.a3,'air',(rn()*4)|0))+', '+(rn()<.6?'pilot':'weapons systems officer')+(u?', '+u.name:''),
        place:th?th.name:'over the front',how:miss?'missing after their aircraft was lost'+(th?' over '+th.name:''):'killed when their aircraft was shot down'+(th?' over '+th.name:''),st:miss?'MISSING':'DEAD'};},n);}}
    // ground forces
    if(L.gnd==null)L.gnd=p.lostGnd;const dg=p.lostGnd-L.gnd;L.gnd=p.lostGnd;
    if(dg>0){const n=Math.round(dg*4000*.12);if(n>0){const F=st.fronts.filter(f=>f.a===p.a3||f.b===p.a3);const f=F.length?pick(F):null;const B=f&&W.ob?W.land?W.land.B(p.a3,f.id):[]:[];const city=nearCity(p,f);
      const HOW=['killed in action during fighting near '+city,'died of wounds at a field hospital behind the line near '+city,'killed by artillery fire near '+city,'missing in action near '+city+', presumed dead','killed while evacuating wounded comrades near '+city];
      add(p,'MIL',()=>{const u=B.length?pick(B):null,h=pick(HOW);return{n:nm(p.a3),age:19+((rn()*26)|0),home:town(p),role:pick(['Private','Corporal','Sergeant','Lieutenant','Private','Private'])+', '+pick(['rifleman','tank crew','combat engineer','medic','artillery crew','driver','signaller'])+(u?', '+u.name:''),
        place:f?'front with '+st.c[f.a===p.a3?f.b:f.a].n:p.n,how:h,st:/missing/.test(h)?'MISSING':'DEAD'};},n);}}
    // navies
    if(p.nav&&p.nav.lost){const tot=p.nav.lost.sur+p.nav.lost.sub+p.nav.lost.amp+p.nav.lost.cv*20;if(L.nav==null)L.nav=tot;const dn=tot-L.nav;L.nav=tot;
      if(dn>0)add(p,'MIL',()=>({n:nm(p.a3),age:19+((rn()*25)|0),home:town(p),role:pick(['Seaman','Petty Officer','Lieutenant','Chief Petty Officer'])+', '+pick(['engine room','damage control','deck','galley','radar'])+' crew',place:'at sea',how:rn()<.5?'lost at sea when their ship was sunk':'missing at sea after their ship was hit',st:rn()<.5?'DEAD':'MISSING'}),Math.round(dn*60));}
    // civilians (estimates by rule)
    if(!(p.side&&(p.al==='CORE'||p.al==='ALLY')))continue;const cities=(st.city&&st.city[p.a3])||[];let n=0,where=[];
    for(const c of cities){if(c.exp<.9)continue;const k=c.pop*2e-6*c.exp;const m=Math.floor(k)+(rn()<k%1?1:0);if(m>0){n+=m;where.push([c,m]);}}
    for(const[c,m]of where)add(p,'CIV',()=>({n:nm(p.a3),age:(rn()<.15?3+((rn()*14)|0):18+((rn()*70)|0)),home:c.n,role:pick(JOBS),place:c.n,how:pick(['killed when shelling struck '+c.n,'killed in an air raid on '+c.n,'killed when their apartment building in '+c.n+' was hit','died when the shelter they reached in '+c.n+' was damaged']),st:'DEAD'}),m);
    const m=st.mil&&st.mil[p.a3];if(m){const du=(m.harm||0)-(L.uxo||0);L.uxo=m.harm||0;const k=Math.round(Math.max(0,du)*.3);if(k>0){const c=cities[0];add(p,'CIV',()=>({n:nm(p.a3),age:8+((rn()*60)|0),home:c?c.n:p.n,role:pick(JOBS),place:'a former battle area',how:'killed by unexploded ordnance in a former battle area',st:'DEAD'}),k);}}
    if((p.disp||0)>p.pop*.02&&rn()<.05){const c=cities.length?pick(cities):null;add(p,'CIV',()=>({n:nm(p.a3),age:rn()<.5?1+((rn()*10)|0):65+((rn()*25)|0),home:c?c.n:p.n,role:pick(JOBS),place:'a displacement shelter',how:'died of illness in a displacement shelter',st:'DEAD'}),1);}}}
W.daily.push(()=>{if(W.st)daily();});
// disasters: their estimated deaths go into the register of the country hit
W.listeners.push(e=>{if(!W.st||e.ty!=='HAZARD')return;const a3=(e.e||[])[0],p=a3&&W.st.c[a3];if(!p)return;const m=/(\d+)-(\d+) people killed/.exec(e.txt);if(!m)return;const k=Math.round((+m[1]+ +m[2])/2);if(k<=0)return;
  const kind=(/^(An earthquake|Floods|A tropical cyclone|Wildfires|A severe winter storm|A heatwave)/.exec(e.txt)||[,'a disaster'])[1].toLowerCase();add(p,'CIV',()=>({n:nm(a3),age:5+((rn()*85)|0),home:town(p),role:pick(JOBS),place:p.n,how:'died in '+kind.replace(/^an? /,'the ').replace('the floods','the floods'),st:'DEAD'}),k);});
/* ------------------------------------------------------------------ CEMETERY tab */
const UI={f:'ALL',q:''};const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function tab(p){const r=C()[p.a3];if(!r)return'<div>No one from '+esc(p.n)+' is recorded in the register.</div>';const all=(UI.f!=='CIV'?r.mil.L:[]).concat(UI.f!=='MIL'?r.civ.L:[]).sort((a,b)=>b.t-a.t);
  const q=UI.q.toLowerCase(),L=q?all.filter(x=>(x.n+' '+x.home+' '+x.role+' '+x.how).toLowerCase().includes(q)):all;
  return '<div style="font-size:10px;color:#8a9a92">The people named here are fictional. Totals are estimates by rule from the war\'s losses. No injuries are described.</div>'+
    '<div class="row"><span>Military dead and missing</span><b>~'+r.mil.n.toLocaleString('en')+' ('+r.mil.L.length+' named)</b></div><div class="row"><span>Civilians killed</span><b>~'+r.civ.n.toLocaleString('en')+' ('+r.civ.L.length+' named)</b></div>'+
    '<div class="tc">'+['ALL','MIL','CIV'].map(k=>'<button data-cm="'+k+'" aria-pressed="'+(UI.f===k)+'">'+{ALL:'ALL',MIL:'MILITARY',CIV:'CIVILIAN'}[k]+'</button>').join(' ')+' <input id="cmQ" value="'+esc(UI.q)+'" placeholder="search a name or town" style="width:130px"> <button data-cm="q">FIND</button></div>'+
    L.slice(0,40).map(x=>'<div style="border-bottom:1px dotted #333;padding:2px 0"><b>'+esc(x.n)+'</b>, '+x.age+', of '+esc(x.home)+(x.st==='MISSING'?' — <i>missing</i>':'')+'<br><span style="font-size:10px;color:#9aa19c">'+esc(x.role)+'. '+esc(W.date(x.t).slice(0,10))+': '+esc(x.how)+'.</span></div>').join('')+
    (L.length>40?'<div style="font-size:10px">… and '+(L.length-40)+' more named here</div>':'')+((r.mil.n+r.civ.n)>(r.mil.L.length+r.civ.L.length)?'<div style="font-size:10px">and about '+((r.mil.n+r.civ.n)-(r.mil.L.length+r.civ.L.length)).toLocaleString('en')+' more, recorded as numbers</div>':'');}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.CEMETERY=tab;
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-cm]');if(!b)return;if(b.dataset.cm==='q'){const i=document.getElementById('cmQ');UI.q=i?i.value:'';}else UI.f=b.dataset.cm;WARMAP.panel();});
// the epilogue's "Names and places" reads from the register
if(W.endscreen&&W.endscreen.CH){const ch=W.endscreen.CH.find(c=>c[0]==='Names and places');if(ch){const _f=ch[1];ch[1]=(F,st)=>{const S=C(),all=Object.entries(S);const tm=all.reduce((t,[a,r])=>t+r.mil.n,0),tc=all.reduce((t,[a,r])=>t+r.civ.n,0);
  const some=all.flatMap(([a,r])=>r.mil.L.slice(0,3).concat(r.civ.L.slice(0,3))).slice(0,30);
  return _f(F,st)+'<h2>THE REGISTER</h2><div>About '+tm.toLocaleString('en')+' soldiers, sailors and aircrew and about '+tc.toLocaleString('en')+' civilians are recorded as killed or missing (estimates by rule; fictional names).</div><div class="wall">'+
    some.map(x=>'<div>'+esc(x.n)+', '+x.age+', '+esc(x.home)+' — '+esc(x.how)+'</div>').join('')+'</div>';};}}
W.cemetery={C,reg,daily,tab,UI};
})();
