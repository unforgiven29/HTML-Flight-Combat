/* =====================================================================================================================
   v327 — WWAR: the world war, step 1 (spec v49 chapter 05: "Global World War framework and coalition structure",
   "Expanded global country registry", "A persistent war that keeps moving"). Strategic layer only (spec tier C):
   no aircraft are flown here; the war runs in the background and on the world map. Flying in it is step 2.

   * FICTIONAL SCENARIO. Built from public country data; it is not a prediction of what any country would do.
   * Every country in the registry (Natural Earth, 237 entries) is a distinct actor with a profile and an alignment.
     Default scenario as the spec gives it: China and Russia lead REDFOR; the United States and NATO lead BLUEFOR.
     Formal treaty allies join their side; every other country starts neutral (nobody is forced into a coalition).
     REDFOR / BLUEFOR are campaign labels, not nationalities: each country keeps its own forces, losses and history.
   * Alignment states: CORE (core belligerent), ALLY (formal ally, belligerent), PARTNER (supports, does not fight),
     NEUTRAL, UNDECIDED. Every change is an event with a time and a reason.
   * National profile (strategic package): population and GDP (Natural Earth estimates), military airfields (OurAirports),
     and ESTIMATED combat aircraft and ground brigades derived from those (formulas below). No public order-of-battle
     data is used: the figures are labelled estimates everywhere, never presented as real force counts.
   * Fronts: every land border between hostile belligerents (Natural Earth boundary lines), cut into sectors about 50 km
     long. Each sector holds the line's offset in km (positive: into the second country). Lines move gradually with the
     ratio of ground power, air superiority over the sector and readiness; nothing flips a whole country at once.
   * Air theatres: regional boxes; each belligerent commits air power there in proportion to its military airfields
     inside the box. Hourly attrition (square-law), air superiority from -1 (RED) to +1 (BLUE).
   * Cities over 200,000 near a front change hands when the line passes them (event).
   * Production refills air and ground strength from GDP; war exhaustion grows with losses.
   Owner of the world-war state (docs/campaign/OWNERSHIP.md). Gameplay-level model; every rate is a documented constant.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WGEO)return;
const G=WGEO,D=Math.PI/180,KEY='viper.ww',V=1;
const NATO=['ALB','BEL','BGR','CAN','HRV','CZE','DNK','EST','FIN','FRA','DEU','GRC','HUN','ISL','ITA','LVA','LTU','LUX','MNE','NLD','MKD','NOR','POL','PRT','ROU','SVK','SVN','ESP','SWE','TUR','GBR','USA'];
// default scenario (spec ch.05): side B = BLUEFOR, R = REDFOR
const SCEN={name:'GLOBAL CONFLICT (fictional scenario)',
  B:{CORE:['USA'],ALLY:NATO.filter(a=>a!=='USA').concat(['JPN','KOR','AUS','PHL']),PARTNER:['NZL']},
  R:{CORE:['RUS','CHN'],ALLY:['BLR','PRK'],PARTNER:[]}};
const C={airTheatreK:.00015,airDef:1.3,gndDef:1.4,gndAdvKmh:.12,gndLossK:.00035,prodAir:.0007,prodGnd:.0005,secKm:50,cityPop:2e5,maxOff:450,maxFronts:3};
const THEATRES=[
  {id:'NEU',name:'Northern Europe & Baltic',lat:[52,72],lon:[4,45]},
  {id:'CEU',name:'Central Europe & Black Sea',lat:[40,52],lon:[8,45]},
  {id:'ARC',name:'Arctic & North Atlantic',lat:[60,85],lon:[-70,70]},
  {id:'KOR',name:'Korean Peninsula & Sea of Japan',lat:[32,46],lon:[122,145]},
  {id:'WPC',name:'East & South China Seas',lat:[5,32],lon:[105,135]},
  {id:'NPC',name:'North Pacific',lat:[42,72],lon:[145,200]},
];
const inBox=(T,lat,lon)=>{let lo=lon;if(T.lon[1]>180&&lo<0)lo+=360;return lat>=T.lat[0]&&lat<=T.lat[1]&&lo>=T.lon[0]&&lo<=T.lon[1];};
const W={st:null,run:false,speed:6,listeners:[]};
const warn=(k,e)=>{if(!warn[k]){warn[k]=1;console.warn('[war] '+k,e);}};

/* ------------------------------------------------------------------ events (same contract as the campaign ledger) */
function emit(ty,o){const st=W.st,cz=W._cz;const e={id:'W'+(st.seq++).toString(36).toUpperCase(),v:1,ty,dm:o.dm||'war',t:st.t,e:o.e||[],c:o.c||(cz&&cz.length?[cz[cz.length-1]]:[]),cf:o.cf||'CONFIRMED',txt:o.txt};   /* c: the events that caused this one (an event emitted while another is being handled is caused by it; ch.02 causality) */
  if(o.loc)e.loc=o.loc;st.ev.push(e);if(st.ev.length>900){const n=st.ev.length-900;for(const x of st.ev.splice(0,n))st.fold[x.ty]=(st.fold[x.ty]||0)+1;st.folded+=n;}
  (W._cz||(W._cz=[])).push(e.id);for(const f of W.listeners)try{f(e);}catch(_){}W._cz.pop();return e;}

/* ------------------------------------------------------------------ national profiles */
function milBases(){const m=new Map();for(const a of G.airports){if(!a.mil)continue;const c=G.byA2.get(a.iso2);if(!c)continue;(m.get(c.a3)||m.set(c.a3,[]).get(c.a3)).push(a);}return m;}
// ESTIMATES (not orders of battle): combat aircraft from economy and military airfields; ground brigade-equivalents from population and economy
const estAir=(c,nb)=>Math.round(2.5*Math.pow(Math.max(1,c.gdp/1000),.6)+8*nb);
const estGnd=(c)=>Math.round(1.5*Math.sqrt(Math.max(.05,c.pop/1e6))+.4*Math.pow(Math.max(1,c.gdp/1000),.4));
function profile(c,MB){const nb=(MB.get(c.a3)||[]).length,air=estAir(c,nb),gnd=estGnd(c);
  return{a3:c.a3,n:c.n,al:'NEUTRAL',side:null,pop:c.pop,gdp:c.gdp,mb:nb,air,air0:air,gnd,gnd0:gnd,lostAir:0,lostGnd:0,exh:0,ready:.75,hist:[]};}
const bell=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
function setAl(p,al,side,why){p.al=al;p.side=side;p.hist.push([W.st.t,al,side,why]);
  emit('ALIGN',{e:[p.a3],txt:p.n+(al==='NEUTRAL'?' declares neutrality':al==='PARTNER'?' supports '+(side==='B'?'BLUEFOR':'REDFOR')+' without fighting':' enters the war as '+(al==='CORE'?'a principal power of ':'an ally of ')+(side==='B'?'BLUEFOR':'REDFOR'))+' · '+why});}

/* ------------------------------------------------------------------ fronts on real borders */
function buildFronts(){const st=W.st,F=[];
  for(const B of G.borders){const pa=st.c[B.a],pb=st.c[B.b];if(!bell(pa)||!bell(pb)||pa.side===pb.side)continue;
    const fr={id:'F'+B.a+B.b,a:B.a,b:B.b,sec:[]};
    for(const L of B.l){let acc=1e9;for(let i=0;i<L.length-2;i+=2){const x0=L[i],y0=L[i+1],x1=L[i+2],y1=L[i+3],km=G.dist(y0,x0,y1,x1)/1000;acc+=km;
        if(acc<C.secKm)continue;acc=0;const mx=(x0+x1)/2,my=(y0+y1)/2,dx=(x1-x0)*Math.cos(my*D),dy=y1-y0,d=Math.hypot(dx,dy)||1;
        // unit normal (in km space) pointing into country b
        let nx=-dy/d,ny=dx/d;const test=G.countryAt(my+ny*.12,mx+nx*.12/Math.cos(my*D));if(test&&test.a3===B.a){nx=-nx;ny=-ny;}
        fr.sec.push({lon:mx,lat:my,nx,ny,off:0});}}
    if(fr.sec.length)F.push(fr);}
  // v412: the war is fought on a few long fronts — the principal powers' fronts first, then the longest; other
  // borders between enemies stay quiet (guarded, not fought over). C.maxFronts sets how many (default 3).
  const core=f=>(st.c[f.a].al==='CORE'?2:0)+(st.c[f.b].al==='CORE'?2:0)+(st.c[f.a].al==='ALLY'?1:0)+(st.c[f.b].al==='ALLY'?1:0);
  F.sort((x,y)=>core(y)-core(x)||y.sec.length-x.sec.length);
  // one front per principal enemy pairing first (the longest), so each theatre keeps its war; then fill up to the cap
  const keep=[],pair=new Set();for(const f of F){const A=st.c[f.a],B=st.c[f.b];const cs=[A,B].filter(q=>q.al==='CORE').map(q=>q.a3);const k=(cs.length?cs:[A.a3,B.a3]).sort().join('|');if(!pair.has(k)){pair.add(k);keep.push(f);}}
  for(const f of F){if(keep.length>=Math.max(C.maxFronts||3,pair.size))break;if(!keep.includes(f))keep.push(f);}
  st.fronts=keep;st.quiet=F.filter(f=>!keep.includes(f)).map(f=>f.id);}
const secPt=(s,km)=>({lat:s.lat+s.ny*km/111.2,lon:s.lon+s.nx*km/(111.2*Math.cos(s.lat*D))});

/* ------------------------------------------------------------------ new war */
W.newWar=async(bal)=>{await G.loadData();const MB=milBases();
  W.st={v:V,name:SCEN.name,t:0,start:'2026-11-16T06:00Z',seq:1,ev:[],fold:{},folded:0,c:{},fronts:[],th:[],cities:{},over:null};
  for(const c of G.countries)W.st.c[c.a3]=profile(c,MB);
  emit('SCENARIO',{txt:'Fictional scenario '+SCEN.name+'. Countries, borders, cities and airfields are real; the war, its alignments and every force figure are invented for the game.'});
  for(const side of['R','B'])for(const al of['CORE','ALLY','PARTNER'])for(const a3 of SCEN[side][al]){const p=W.st.c[a3];if(p)setAl(p,al,side,al==='CORE'?'scenario principal power':al==='ALLY'?'treaty obligation (scenario)':'scenario partner');}
  // BALANCE (player's choice at the start): ESTIMATES keeps the force estimates as they are; EVEN scales REDFOR's forces so
  // the coalitions start roughly equal (+/-15 %), a game setting, recorded in the war diary
  W.st.bal=bal==='EVEN'?'EVEN':'EST';
  if(W.st.bal==='EVEN'){const P=Object.values(W.st.c),sum=(s,k)=>P.filter(p=>bell(p)&&p.side===s).reduce((t,p)=>t+p[k],0);
    for(const k of['air','gnd']){const f=sum('B',k)/Math.max(1,sum('R',k))*(.85+Math.random()*.3);for(const p of P)if(bell(p)&&p.side==='R'){p[k]=Math.round(p[k]*f);p[k+'0']=p[k];}}
    emit('SCENARIO',{txt:'Balance: EVEN SIDES. REDFOR forces scaled so the coalitions start roughly equal (a game setting, not an estimate).'});}
  buildFronts();
  W.st.th=THEATRES.map(T=>({id:T.id,name:T.name,sup:0,f:{}}));assignAir();cityScan(true);save();return W.st;};

/* ------------------------------------------------------------------ air theatres */
function assignAir(){const st=W.st,MB=milBases();
  for(const th of st.th){const T=THEATRES.find(q=>q.id===th.id);th.f={};
    for(const p of Object.values(st.c)){if(!bell(p))continue;const L=MB.get(p.a3)||[];const k=L.filter(a=>inBox(T,a.lat,a.lon)).length;
      // a principal power also commits part of its air force to every theatre where its side fights (power projection)
      const share=L.length?k/L.length:0,proj=p.al==='CORE'?.12:0;if(share>0||proj>0)th.f[p.a3]=Math.min(1,share+proj);}}}
const sideAir=(th,side)=>{let s=0;for(const a3 in th.f){const p=W.st.c[a3];if(p.side===side)s+=p.air*th.f[a3]*p.ready;}return s;};
function airStep(dh){const st=W.st;
  for(const th of st.th){const B0=sideAir(th,'B'),R0=sideAir(th,'R');if(B0<1||R0<1){th.sup=B0>R0?1:R0>B0?-1:0;continue;}
    // the weaker side fights over its own air defences and close to its bases: it counts airDef times
    const B=B0<R0?B0*C.airDef:B0,R=R0<B0?R0*C.airDef:R0;
    const wx=W.airWx(th),lB=C.airTheatreK*R*dh*Math.min(1,R/B)*wx,lR=C.airTheatreK*B*dh*Math.min(1,B/R)*wx;   /* W.airWx: flying weather (seasons.js) */   // square-law: the bigger force loses less per unit
    for(const a3 in th.f){const p=st.c[a3],w=p.air*th.f[a3]*p.ready,L=(p.side==='B'?lB*w/B0:lR*w/R0);const l=Math.min(p.air,L);p.air-=l;p.lostAir+=l;th.lB=(th.lB||0)+(p.side==='B'?l:0);th.lR=(th.lR||0)+(p.side==='R'?l:0);}
    th.sup=(B-R)/(B+R);}}
const supAt=(lat,lon)=>{let s=0,n=0;for(const th of W.st.th){const T=THEATRES.find(q=>q.id===th.id);if(inBox(T,lat,lon)){s+=th.sup;n++;}}return n?s/n:0;};

/* ------------------------------------------------------------------ ground */
function gndStep(dh){const st=W.st,secs=new Map();
  for(const f of st.fronts)for(const a3 of[f.a,f.b])secs.set(a3,(secs.get(a3)||0)+f.sec.length);
  // coalition pool: each belligerent without its own front sends 20 % of its ground forces, shared over all its side's sectors
  const pool={B:0,R:0},tot={B:0,R:0};for(const p of Object.values(st.c))if(bell(p)&&!secs.get(p.a3))pool[p.side]+=p.gnd*(p.exp??.2);   /* p.exp: share sent to the coalition, raised when an ally asks for help (strategy.js) */
  for(const f of st.fronts){tot[st.c[f.a].side]+=f.sec.length;tot[st.c[f.b].side]+=f.sec.length;}
  for(const f of st.fronts){if(f.cf)continue;   /* a front under ceasefire does not move (diplomacy.js) */const A=st.c[f.a],B=st.c[f.b];
    for(const s of f.sec){const sup=supAt(s.lat,s.lon),aSup=A.side==='B'?sup:-sup;
      // W.mod: national strategy (posture, where forces are concentrated), infrastructure and supply (strategy.js, economy.js); 1 when absent
      const pa=(A.gnd/Math.max(1,secs.get(A.a3))+pool[A.side]/Math.max(1,tot[A.side]))*A.ready*(1+.6*aSup)*W.mod(A,f,s),pb=(B.gnd/Math.max(1,secs.get(B.a3))+pool[B.side]/Math.max(1,tot[B.side]))*B.ready*(1-.6*aSup)*W.mod(B,f,s);
      // supply: the deeper a side is past the border, the weaker it is at the front (halved at 150 km)
      const sa=1/(1+Math.max(0,s.off)/150),sb=1/(1+Math.max(0,-s.off)/150);
      const r=Math.log(Math.max(1e-3,pa*sa)/Math.max(1e-3,pb*sb)),before=s.off,ra=Math.abs(r)-Math.log(C.gndDef);   // the attacker must beat the defender's advantage
      if(ra>0)s.off=Math.max(-C.maxOff,Math.min(C.maxOff,s.off+Math.sign(r)*C.gndAdvKmh*Math.tanh(ra*1.2)*dh*W.mob(s)));   /* W.mob: mud, snow, weather (seasons.js) */
      const eng=Math.min(pa,pb)*C.gndLossK*dh,la=eng*(1+Math.max(0,-r)),lb=eng*(1+Math.max(0,r));
      A.gnd=Math.max(0,A.gnd-la);B.gnd=Math.max(0,B.gnd-lb);A.lostGnd+=la;B.lostGnd+=lb;
      if(Math.floor(before/25)!==Math.floor(s.off/25))s.mv=1;}}}
// big cities near the fronts: which side holds them now
function cityScan(init){const st=W.st,secs=[];
  for(const f of st.fronts)for(const s of f.sec)secs.push([f,s]);if(!secs.length)return;
  for(const pl of G.places){if(pl.pop<C.cityPop)continue;let best=null,bd=1e9;
    for(const[f,s]of secs){if(pl.a3!==f.a&&pl.a3!==f.b)continue;const d=G.dist(pl.lat,pl.lon,s.lat,s.lon);if(d<bd){bd=d;best=[f,s];}}
    if(!best||bd>C.maxOff*1000)continue;const[f,s]=best,kmN=((pl.lon-s.lon)*Math.cos(s.lat*D)*s.nx+(pl.lat-s.lat)*s.ny)*111.2;   // signed distance into b
    const k=pl.name+'|'+pl.a3,was=st.cities[k],m=was&&!init?5:0;   // 5 km hysteresis
    const holder=kmN>0?(s.off>kmN+m?f.a:s.off<kmN-m?f.b:(was?was.h:f.b)):(s.off<kmN-m?f.b:s.off>kmN+m?f.a:(was?was.h:f.a));
    st.cities[k]={h:holder,own:pl.a3,lat:pl.lat,lon:pl.lon,pop:pl.pop};
    if(!init&&was&&was.h!==holder)emit('CITY',{e:[holder,pl.a3],loc:[pl.lat,pl.lon],txt:pl.name+' ('+st.c[pl.a3].n+') '+(holder===pl.a3?'retaken by '+st.c[holder].n:'falls to '+st.c[holder].n+' forces')+'.'});}}
function prodStep(dh){for(const p of Object.values(W.st.c)){if(!bell(p))continue;const g=Math.pow(Math.max(1,p.gdp/1000),.6)*(p.econ==null?1:p.econ);   /* p.econ: the war economy index (nations.js) */
  p.air=Math.min(p.air0*1.2,p.air+C.prodAir*g*dh*(1-p.exh)*W.prodK(p,'air'));p.gnd=Math.min(p.gnd0*1.2*W.prodK(p,'cap'),p.gnd+C.prodGnd*g*dh*(1-p.exh)*W.prodK(p,'gnd'));   /* W.prodK: pilots, mobilization (military.js) */
  p.exh=Math.min(1,.5*p.lostAir/Math.max(1,p.air0)+.5*p.lostGnd/Math.max(1,p.gnd0));p.ready=Math.max(.2,Math.max(.35,.8-.4*p.exh)*W.rdy(p));}}

/* ------------------------------------------------------------------ the clock */
W.step=(hours)=>{const st=W.st;if(!st||(st.over&&!st.post))return;let left=hours;
  while(left>1e-9){const dh=Math.min(1,left);left-=dh;const d0=Math.floor(st.t/24);st.t+=dh;airStep(dh);gndStep(dh);prodStep(dh);
    if(Math.floor(st.t/24)!==d0){cityScan(false);daily();}}   /* cities checked every war day, not only at the end of a long step */
  for(const f of st.fronts){const m=f.sec.filter(s=>s.mv);if(m.length){for(const s of m)s.mv=0;const avg=f.sec.reduce((t,s)=>t+s.off,0)/f.sec.length;
      emit('FRONT',{e:[f.a,f.b],cf:'REPORTED',txt:'Front '+st.c[f.a].n+' / '+st.c[f.b].n+': '+(Math.abs(avg)<5?'holding near the border':(avg>0?st.c[f.a].n:st.c[f.b].n)+' forces '+Math.round(Math.abs(avg))+' km beyond the border on average')+'.'});}}
  cityScan(false);const n=performance.now();if(!W._sv||n-W._sv>10000||hours>=1){W._sv=n;save();}};
function daily(){const st=W.st;for(const f of W.daily)try{f();}catch(e){warn('daily',e);}for(const th of st.th){if((th.lB||0)+(th.lR||0)<.5)continue;
  emit('AIR',{cf:'ESTIMATED',txt:th.name+', day '+Math.floor(st.t/24)+': about '+Math.round(th.lB||0)+' BLUEFOR and '+Math.round(th.lR||0)+' REDFOR aircraft lost · air '+(Math.abs(th.sup)<.1?'contested':(th.sup>0?'BLUEFOR':'REDFOR')+' advantage')+'.'});th.lB=th.lR=0;}}
W.date=t=>{const d=new Date(Date.parse(W.st.start)+t*3600e3);return d.toISOString().slice(0,16).replace('T',' ')+'Z';};

/* ------------------------------------------------------------------ save */
function save(){try{let s=JSON.stringify(W.st);if(W.compact&&s.length>4.5e6){W.compact();s=JSON.stringify(W.st);}localStorage.setItem(KEY,s);}catch(e){try{localStorage.removeItem(KEY);}catch(x){}if(W.store)W.store.autosave();else warn('save',e);}}   /* too large for localStorage: IndexedDB (store.js) carries it */   /* W.compact: perf.js */
W.load=async()=>{try{const o=JSON.parse(localStorage.getItem(KEY)||'null');if(o&&o.v===V&&o.c){await G.loadData();W.st=o;return true;}}catch(e){warn('load',e);}return false;};
W.audit=()=>{const st=W.st,out=[];if(!st)return['no war'];
  for(const a3 in st.c){const p=st.c[a3];if(!G.byA3.has(a3))out.push('unknown country '+a3);if(p.air<-1e-6||p.gnd<-1e-6)out.push('negative force '+a3);if(p.side&&!['B','R'].includes(p.side))out.push('bad side '+a3);}
  for(const f of st.fronts){if(st.c[f.a].side===st.c[f.b].side)out.push('front between allies '+f.id);for(const s of f.sec)if(!isFinite(s.off))out.push('bad sector '+f.id);}
  if(G.countries.some(c=>!st.c[c.a3]))out.push('country missing from the registry');return out;};
// background running: one campaign hour per real second x speed while the map is open, real time in world flight
let last=performance.now();
setInterval(()=>{const n=performance.now(),dt=(n-last)/1000;last=n;if(!W.st||!W.run)return;try{W.step(dt*W.speed);}catch(e){warn('step',e);}},1000);
window.WWAR=W;W.C=C;W.SCEN=SCEN;W.THEATRES=THEATRES;W.daily=[];W.prodK=()=>1;W.rdy=()=>1;W.mod=()=>1;W.mob=()=>1;W.airWx=()=>1;W.setAl=(p,al,side,why)=>setAl(p,al,side,why);W.rebuild=()=>{const old=new Map(W.st.fronts.map(f=>[f.id,f]));buildFronts();W.st.fronts=W.st.fronts.map(f=>old.get(f.id)||f);assignAir();};W.emit=(t,o)=>W.st?emit(t,o):null;W.linePt=(s)=>({lat:s.lat+s.ny*s.off/111.2,lon:s.lon+s.nx*s.off/(111.2*Math.cos(s.lat*D))});W.milBases=milBases;W.bell=bell;
})();
