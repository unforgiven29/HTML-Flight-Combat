/* =====================================================================================================================
   v325 — campaign world ledger (spec v49, phases 0-2). Loads LAST (after addons-v324.js): it wraps CAMP, the campaign
   layers (campmp / strategic / campplus) and Jet.prototype.kill as the outermost layer.

   WHAT IT OWNS (see docs/campaign/OWNERSHIP.md)
   * the campaign event ledger: every consequential change is one event with an id, schema version, type, domain, campaign
     time, actor, affected entity ids, cause ids, confidence and an idempotency key. Bounded: the newest CFG.evMax events are
     kept in full, older ones are folded into per-type counts (never silently: the fold is counted).
   * identities on the player's side: airframes (tail numbers), aircrew (named, clearly fictional), squadrons.
     Identity is not location or status: an airframe keeps its id through ferry, maintenance, base evacuation and loss.
   * finite supply: fuel (kg), air-to-air missiles, air-to-ground stores, spares at each friendly base, a rear depot with a
     documented production rate, and convoys (shipments) between them. Delivered stock exists only after a convoy arrives.
   * the supply ledger: per commodity, initial + produced == depot + bases + in transit + on board + expended + lost.
     WORLD.audit() checks it, together with orphan references, negative stock and pool / airframe mismatches.
   * sortie and mission records, pilot fate (killed / missing / captured / wounded / medically withdrawn are distinct states).
   * the opposing side stays aggregate (spec allows aggregates where individual detail is unnecessary): its airframe reserve is
     finite with a production rate, and its aircrew losses are counted from the simulated ejections.

   WHAT IT DOES NOT OWN: the front, ground units, air defences, weather, the clock (CAMP.st.t stays the one clock; this file
   only reads it). CAMP base `pool` stays the number the AI launch code reads, but on our side it is now a projection of the
   airframe ledger (READY airframes at that base), recomputed after every legacy writer runs.
   Figures are gameplay-level estimates, not published data.
   ===================================================================================================================== */
(()=>{
'use strict';
if(typeof CAMP==='undefined'||typeof CBASE==='undefined'||typeof Jet==='undefined'){console.warn('[world] campaign missing');return;}
const W_V=1;   // schema version of st.wld
const CFG={
  evMax:700,soMax:40,
  base0:{fuel:120000,aam:40,agm:60,spares:20},            // stock at each of our fields when a war starts
  target:{fuel:100000,aam:30,agm:44,spares:14},           // the depot tops a field back up toward this
  depot0:{fuel:600000,aam:160,agm:240,spares:80,af:18,pp:12},
  prod:{fuel:8000,aam:1.5,agm:2.5,spares:.6,af:1/16,pp:1/12},   // per campaign hour, national industry and training (abstraction)
  convoy:{every:3,cap:{fuel:40000,aam:16,agm:24,spares:6},kmh:45},
  redAf0:50,redProd:1/3,                                   // opposing side: aggregate airframe reserve and production per hour
  crewRest:1.5,maintH:[2,4],dmgMaintH:[6,30],
  minAf:6,                                                 // a field below this many airframes asks the depot for a ferry
};
const COM=['fuel','aam','agm','spares'];
const rr=(a,b)=>a+Math.random()*(b-a),pickA=a=>a[(Math.random()*a.length)|0];
const fin=(v,d=0)=>Number.isFinite(v)?v:d;
const warnOnce=(k,e)=>{if(!warnOnce[k]){warnOnce[k]=1;console.warn('[world] '+k,e);}};
const safe=(k,f)=>{try{return f();}catch(e){warnOnce(k,e);}};
const H=()=>CAMP.st?CAMP.st.t:0;
const ourSide=0;                                           // side 0 is always the player's faction (team RED swaps the names, not the side)
const isRedFaction=()=>typeof redSide==='function'&&redSide(0);
// game.js declares these with let / const: they are global bindings, not window properties
const PL=()=>typeof player!=='undefined'?player:null;
const WL=()=>typeof WING!=='undefined'&&WING&&WING.list?WING.list:[];

/* ------------------------------------------------------------------------------------------ names (clearly fictional) */
const NM_W={f:['A.','B.','C.','D.','E.','J.','K.','L.','M.','N.','P.','R.','S.','T.','W.'],
  l:['HALVERSEN','OKAFOR','MARQUETTE','DELACROIX','BRANDT','KOWALCZYK','ASHWORTH','RENNER','CALLOWAY','MORENO','LINDQVIST','HARTLEY','PRUITT','OYELARAN','VANCE','TORRES','KINCAID','WEBER','NAKAMURA','SULLIVAN','DUBOIS','ELLERY','FONTAINE','GRAYSON']};
const NM_E={f:['A.','B.','V.','G.','D.','YE.','I.','K.','M.','N.','O.','P.','R.','S.','YU.'],
  l:['VOLKOV','SOKOLOV','ZAITSEV','BELOUSOV','KRYLOV','ORLOV','LEBEDEV','GROMOV','SAVIN','TITOV','MOROZOV','PANIN','RUDENKO','YEGOROV','KOVALEV','SHUBIN','FILATOV','DROZDOV','NIKITIN','POLYAKOV','ROMANOV','SEDOV','USTINOV','ZUBOV']};
const RANKS_W=['1LT','CAPT','CAPT','MAJ'],RANKS_E=['ST.LT','KAPITAN','KAPITAN','MAJOR'];

/* ------------------------------------------------------------------------------------------ state */
const W=()=>CAMP.st&&CAMP.st.wld;
const nid=(p)=>{const w=W();return p+(w.seq++).toString(36).toUpperCase();};
let KEYS=new Set();                                         // idempotency keys of the events still in the ledger (rebuilt on attach)

function fresh(st){
  const w={v:W_V,seq:1,ev:[],fold:{},folded:0,sq:{},af:{},pp:{},inv:{},depot:Object.assign({},CFG.depot0),sh:{},so:{},soL:[],ms:{},onb:{},
    lg:{},red:{af:CFG.redAf0,prod:0,lost:0,crewK:0,crewC:0,crewR:0,pool:{}},gl:{own:{kia:0,wia:0,est:1},opp:{kia:0,wia:0,est:1}}   /* ground forces only, an estimate */,
    conv:{next:0},fer:{next:0},player:null,born:st.t,migrated:false,audit:{t:-1,n:0,last:[]}};
  for(const c of COM)w.lg[c]={init:CFG.depot0[c],prod:0,exp:0,lost:0,cap:0};
  return w;}

/* ------------------------------------------------------------------------------------------ events */
const DOM={SORTIE:'air',LAUNCH:'air',RECOVER:'air',AF_LOST:'air',AF_MAINT:'maint',AF_READY:'maint',AF_FERRY:'air',AF_EVAC:'air',AF_CAPTURED:'air',
  PILOT:'personnel',CONVOY:'logistics',SUPPLY:'logistics',PROD:'logistics',BASE:'base',MISSION:'mission',OPP_LOSS:'air',GROUND_LOSS:'ground',
  CAMPAIGN:'campaign',MIGRATION:'campaign',AUDIT:'campaign',CORRECTION:'campaign'};
function emit(ty,o){const w=W();if(!w||CAMP.client)return null;o=o||{};
  if(o.k&&KEYS.has(o.k))return null;                        // idempotent: the same fact is never applied twice
  const e={id:nid('E'),v:1,ty,dm:o.dm||DOM[ty.split(':')[0]]||'campaign',t:fin(o.t,H()),a:o.a||null,e:o.e||[],c:o.c||[],cf:o.cf||'CONFIRMED',txt:o.txt||ty,d:o.d||null};
  if(o.loc)e.loc=[Math.round(o.loc[0]),Math.round(o.loc[1])];if(o.k){e.k=o.k;KEYS.add(o.k);}
  w.ev.push(e);
  if(w.ev.length>CFG.evMax){const n=w.ev.length-CFG.evMax,old=w.ev.splice(0,n);for(const x of old){w.fold[x.ty]=(w.fold[x.ty]||0)+1;if(x.k)KEYS.delete(x.k);}w.folded+=n;}
  return e;}
const evId=e=>e?e.id:null;

/* ------------------------------------------------------------------------------------------ entities */
function tail(){const w=W(),used=new Set(Object.values(w.af).map(a=>a.tail));let t;
  do{t=isRedFaction()?String(10+((Math.random()*89)|0))+' '+pickA(['RED','BLUE','YELLOW','WHITE']):(CAMP.st.era==='modern'?pickA(['91','92','96','01','04','08']):pickA(['77','78','79','80','81','82']))+'-0'+String(100+((Math.random()*899)|0));}
  while(used.has(t));return t;}
function newAf(type,sq,base,state,cause){const w=W(),a={id:nid('A'),tail:tail(),type,sq,base,st:state||'READY',until:0,hrs:0,so:0,dmg:0,born:H()};w.af[a.id]=a;
  emit('AF_FERRY:IN',{a:'DEPOT',e:[a.id,base],c:cause?[cause]:[],txt:a.type+' '+a.tail+' assigned to '+bName(base),d:{type,base}});return a;}
function newPilot(sq,base,o){const w=W(),N=isRedFaction()?NM_E:NM_W,R=isRedFaction()?RANKS_E:RANKS_W;
  const p=Object.assign({id:nid('P'),name:pickA(N.f)+' '+pickA(N.l),rank:pickA(R),sq,base,st:'ACTIVE',until:0,so:0,ak:0,gk:0,fict:1,born:H(),hist:[]},o||{});w.pp[p.id]=p;return p;}
function pnote(p,txt,ev){p.hist.push([Math.round(H()*100)/100,txt,ev||null]);if(p.hist.length>24)p.hist.splice(0,p.hist.length-24);}
const bName=id=>{const d=typeof cbDef==='function'&&cbDef(id);return d?d.name:(id==='DEPOT'?'the depot':String(id));};
const baseRec=id=>CAMP.st.bases.find(b=>b.id===id);
const ourBases=()=>CAMP.st.bases.filter(b=>b.side===ourSide);
const sqOf=base=>{const w=W();let s=Object.values(w.sq).find(q=>q.base===base);if(!s){s={id:nid('S'),name:bName(base)+' SQN',base,side:ourSide};w.sq[s.id]=s;}return s;};
const roleTypes=role=>{const st=CAMP.st,L=(CTYPES[st.era]||CTYPES.cold)[isRedFaction()?1:0];return (L&&L[role]||[]).filter(t=>AC[t]);};

function seedBase(b,i){const w=W(),sq=sqOf(b.id),n=Math.max(0,Math.round(fin(b.pool,9))),cap=roleTypes('CAP'),stk=roleTypes('STK');
  for(let k=0;k<n;k++){const L=k<Math.ceil(n*.55)?cap:stk,t=L.length?L[(i+(k&1))%L.length]:(cap[0]||'F-16');
    const a={id:nid('A'),tail:tail(),type:t,sq:sq.id,base:b.id,st:'READY',until:0,hrs:0,so:0,dmg:0,born:H()};w.af[a.id]=a;}
  for(let k=0;k<Math.round(n*1.25);k++)newPilot(sq.id,b.id);
  w.inv[b.id]=Object.assign({},CFG.base0);for(const c of COM)w.lg[c].init+=CFG.base0[c];}

/* ------------------------------------------------------------------------------------------ attach / migrate */
function attach(){const st=CAMP.st;if(!st||CAMP.client)return;
  if(!st.wld||typeof st.wld!=='object'){KEYS=new Set();                    // a save from before v325: build the ledger from what the save holds
    const mig=st.t>0.01;st.wld=fresh(st);const w=st.wld;w.migrated=mig;ourBases().forEach((b,i)=>seedBase(b,i));
    for(const b of CAMP.st.bases)if(b.side!==ourSide)w.red.pool[b.id]=fin(b.pool,0);
    w.conv.next=st.t+.5;w.fer.next=st.t+1;
    if(mig)emit('MIGRATION',{txt:'War record opened on day '+(CAMP.clock().day+1)+'. Nothing before this point was recorded; airframes, crews and stock were counted from the save as it stood.',cf:'CONFIRMED',k:'mig:'+st.name});
    else emit('CAMPAIGN',{txt:'Operation '+st.name+' begins. '+Object.keys(w.af).length+' airframes and '+Object.keys(w.pp).length+' aircrew on strength.',k:'born:'+st.name+':'+Math.round(st.t*1e3)});}
  const w=st.wld;
  if(w.v>W_V){warnOnce('newer save schema '+w.v,'');}
  // fields that later versions add go here (v1 is the first)
  KEYS=new Set(w.ev.filter(e=>e.k).map(e=>e.k));
  // crash safety: a save taken mid-sortie has aircraft "in the air" that no longer exist. Bring them back on the averages.
  if(!CAMP.on)recoverAll('the session ended while the aircraft was airborne; outcome resolved on the averages');
  syncPools();}

/* ------------------------------------------------------------------------------------------ supply ledger */
const inv=b=>{const w=W();return w.inv[b]||(w.inv[b]={fuel:0,aam:0,agm:0,spares:0});};
function storesOf(j){const o={aam:0,agm:0};for(const s of Object.values(j.load||{})){if(isMsl(s))o.aam++;else if(isAG(s)&&AGW[s].k!=='pod')o.agm++;}return o;}
// strip what the field cannot supply (AG stores first, then missiles), then issue the rest
function issue(j,base,carrier){const w=W(),I=inv(base),need=storesOf(j);let fuel=fin(j.totalFuel);
  if(need.agm>I.agm||need.aam>I.aam){let dA=need.agm-Math.max(0,Math.floor(I.agm)),dM=need.aam-Math.max(0,Math.floor(I.aam));
    for(const k of Object.keys(j.load)){const s=j.load[k];if(dA>0&&isAG(s)&&AGW[s].k!=='pod'){delete j.load[k];dA--;}else if(dM>0&&isMsl(s)){delete j.load[k];dM--;}}
    safe('buildStores',()=>j.buildStores&&j.buildStores());}
  const got=storesOf(j);
  if(fuel>I.fuel){const k=Math.max(0,I.fuel)/Math.max(1,fuel);j.fuel*=k;j.tankFuel=(j.tankFuel||0)*k;fuel=fin(j.totalFuel);}
  const iss={fuel:Math.max(0,fuel),aam:got.aam,agm:got.agm};
  I.fuel-=iss.fuel;I.aam-=iss.aam;I.agm-=iss.agm;w.onb[carrier]={fuel:iss.fuel,aam:iss.aam,agm:iss.agm,base};
  return{iss,short:need.aam>got.aam||need.agm>got.agm};}
// what comes back to a field, what was used, what was lost with the aircraft
function settle(carrier,toBase,j,how){const w=W(),o=w.onb[carrier];if(!o)return null;delete w.onb[carrier];
  const res={fuel:0,aam:0,agm:0},exp={fuel:0,aam:0,agm:0},lost={fuel:0,aam:0,agm:0};
  if(how==='LOST'){for(const c of ['fuel','aam','agm']){const left=j&&c!=='fuel'?Math.min(o[c],storesOf(j)[c]):j&&c==='fuel'?Math.min(o.fuel,fin(j.totalFuel)):o[c]*.5;lost[c]=left;exp[c]=o[c]-left;}}
  else{const now=j?{fuel:Math.min(o.fuel,fin(j.totalFuel)),...(()=>{const s=storesOf(j);return{aam:Math.min(o.aam,s.aam),agm:Math.min(o.agm,s.agm)};})()}
                  :{fuel:o.fuel*.35,aam:o.aam,agm:Math.round(o.agm*.4)};   // off-screen: fuel mostly burnt, some bombs dropped
    const I=inv(toBase||o.base);for(const c of ['fuel','aam','agm']){res[c]=now[c];exp[c]=o[c]-now[c];I[c]+=now[c];}}
  for(const c of ['fuel','aam','agm']){w.lg[c].exp+=exp[c];w.lg[c].lost+=lost[c];}
  return{iss:{fuel:o.fuel,aam:o.aam,agm:o.agm},ret:res,exp,lost};}

/* ------------------------------------------------------------------------------------------ airframes and crews */
const readyAt=(base,type)=>Object.values(W().af).filter(a=>a.base===base&&a.st==='READY'&&(!type||a.type===type));
const pilotsAt=base=>Object.values(W().pp).filter(p=>p.base===base&&p.st==='ACTIVE'&&!(p.until>H())&&!p.fly);
function freePilot(base,excl){return pilotsAt(base).filter(p=>p.id!==excl&&p.id!==W().player).sort((a,b)=>a.so-b.so)[0]||null;}
// one airframe for a sortie: a ready one of the type, else a ferry from the depot (instant: an abstraction for player choice)
function acquire(base,type,cause){const w=W();let a=readyAt(base,type)[0];if(a)return a;
  if(w.depot.af>=1&&AC[type]){w.depot.af--;a=newAf(type,sqOf(base).id,base,'READY',cause);return a;}return null;}
function toMaint(a,hrs,why,cause){a.st='MAINT';a.until=H()+hrs;emit('AF_MAINT',{e:[a.id,a.base],c:cause?[cause]:[],txt:a.type+' '+a.tail+' in maintenance at '+bName(a.base)+' ('+why+', about '+Math.round(hrs)+' h)',d:{hrs}});}
function rest(p,hrs){p.fly=0;p.until=Math.max(p.until||0,H()+hrs);}
// what happens to the crew of a lost aircraft. Rules (gameplay-level): no ejection = killed; ejection over our side = recovered
// (30 % wounded); over the enemy side = missing, resolved later (rescue near the line is likelier, otherwise capture).
function crewFate(p,j,ej,cause){if(!p)return;const x=j?j.pos.x:0,z=j?j.pos.z:0,fz=CAMP.frontZ(x),own=z>fz+2000,P=p.id===W().player;p.fly=0;
  let st,txt;
  if(!ej){st='KIA';txt=rankName(p)+' was killed when '+(P?'their':'the')+' aircraft went down.';}
  else if(own){if(Math.random()<.3){st='WOUNDED';p.until=H()+rr(24,96);p.sev=Math.random()<.2?2:1;txt=rankName(p)+' ejected over friendly territory and was recovered wounded.';}
    else{st='ACTIVE';p.until=H()+6;txt=rankName(p)+' ejected over friendly territory and was recovered.';}}
  else{st='MISSING';p.until=H()+rr(6,36);p.mx=Math.abs(z-fz);txt=rankName(p)+' ejected over enemy territory and is missing.';}
  p.st=st;const e=emit('PILOT:'+st,{e:[p.id],c:cause?[cause]:[],loc:[x,z],txt,d:{ej:!!ej,own}});pnote(p,txt,evId(e));return e;}
const rankName=p=>p.rank+' '+p.name+(p.cs?' "'+p.cs+'"':'');

/* ------------------------------------------------------------------------------------------ the AI air war on our side */
function blueLaunchPre(role,baseId,n){const w=W();if(!w)return null;
  const pref=roleTypes(role),R=readyAt(baseId);if(R.length<n)return null;
  const byT={};for(const a of R)(byT[a.type]=byT[a.type]||[]).push(a);
  let t=pref.find(t=>(byT[t]||[]).length>=n)||Object.keys(byT).find(t=>byT[t].length>=n);if(!t)return null;
  const P=pilotsAt(baseId).filter(p=>p.id!==w.player).sort((a,b)=>a.so-b.so);if(P.length<n)return null;
  if(inv(baseId).fuel<n*3000)return null;
  return{type:t,af:byT[t].slice(0,n),pp:P.slice(0,n)};}
function bindJet(j,a,p,base,role,cause){const w=W(),r=issue(j,base,a.id);a.st='SORTIE';a.so++;p.fly=1;p.so++;
  j._w={af:a.id,pp:p.id,base,t0:H(),role};
  const e=emit('LAUNCH',{a:p.id,e:[a.id,p.id,base],c:cause?[cause]:[],loc:[j.pos.x,j.pos.z],txt:(j===PL()?'You':j.callsign||role)+': '+a.type+' '+a.tail+' flown by '+rankName(p)+' launches from '+bName(base)+(role?' ('+role+')':'')+(r.short?' · stores short at the field':''),d:{role,iss:r.iss}});
  j._w.ev=evId(e);return e;}
function recoverJet(j,base,how){const w=W(),c=j._w;if(!c||c.done)return;c.done=1;const a=w.af[c.af],p=w.pp[c.pp];
  const b=ourBases().find(q=>q.id===base)?base:(ourBases()[0]||{}).id;
  if(a){a.base=b||a.base;a.hrs+=Math.max(0,H()-c.t0);const s=settle(a.id,a.base,how==='OFF'?null:j,'RTB');
    const dmg=j&&j.hp<90?100-j.hp:0;toMaint(a,dmg?rr(CFG.dmgMaintH[0],CFG.dmgMaintH[1])*dmg/60:rr(CFG.maintH[0],CFG.maintH[1]),dmg?'battle damage':'post-flight',c.ev);if(dmg)useSpares(a.base,Math.ceil(dmg/25));
    emit('RECOVER',{e:[a.id,c.pp,a.base],c:[c.ev],txt:(j&&j.callsign?j.callsign+': ':'')+a.type+' '+a.tail+(how==='OFF'?' recovered to ':' landed at ')+bName(a.base)+(how==='OFF'?' (resolved off-screen)':''),d:{how,exp:s&&s.exp},cf:how==='OFF'?'ESTIMATED':'CONFIRMED'});}
  if(p){p.base=b||p.base;rest(p,CFG.crewRest);}}
function useSpares(base,n){const I=inv(base),u=Math.min(n,Math.max(0,I.spares));I.spares-=u;W().lg.spares.exp+=u;return u;}
function lostJet(j,ej,src){const w=W(),c=j._w;if(!c||c.done)return;c.done=1;const a=w.af[c.af],p=w.pp[c.pp];
  const e=emit('AF_LOST',{e:[c.af,c.pp],c:[c.ev],loc:[j.pos.x,j.pos.z],txt:(j.callsign?j.callsign+': ':'')+(a?a.type+' '+a.tail:'aircraft')+' lost'+(src&&src.type?' to a '+src.type:''),d:{by:src&&src.type||null}});
  if(a){a.st='LOST';a.until=0;a.lostT=H();settle(a.id,null,j,'LOST');}
  crewFate(p,j,ej,evId(e));}
// at a sortie restart / end the scene is cleared: aircraft still flying are resolved on the averages, never deleted
function recoverAll(why){const w=W();if(!w)return;
  for(const j of (CAMP.air||[]).concat(WL()))if(j&&j._w&&!j._w.done){if(j.alive)recoverJet(j,j._w.base,'OFF');else lostJet(j,!!j._ej,null);}
  for(const a of Object.values(w.af))if(a.st==='SORTIE'&&!(PL()&&PL()._w&&player._w.af===a.id&&CAMP.on)){
    const live=[...(CAMP.air||[]),...(WL())].some(j=>j._w&&j._w.af===a.id&&!j._w.done);if(live)continue;
    settle(a.id,a.base,null,'RTB');toMaint(a,rr(2,4),'recovered after interruption');emit('RECOVER',{e:[a.id],txt:a.type+' '+a.tail+' accounted for at '+bName(a.base)+' · '+why,cf:'ESTIMATED'});}
  for(const p of Object.values(w.pp))if(p.fly&&!(CAMP.on&&PL()&&PL()._w&&player._w.pp===p.id))p.fly=0;}

/* ------------------------------------------------------------------------------------------ the opposing side (aggregate) */
function redPoolGate(before){const w=W();for(const b of CAMP.st.bases){if(b.side===ourSide)continue;const was=fin(before[b.id],b.pool),d=b.pool-was;
  if(d>0){const g=Math.min(d,Math.max(0,w.red.af));b.pool=was+g;w.red.af-=g;}}}
function oppLoss(j,ej,src){const w=W(),x=j.pos.x,z=j.pos.z,fz=CAMP.frontZ(x),overUs=z>fz+2000;w.red.lost++;
  const crew=j.ac&&j.ac.crew||(/Tu-|B-52|Su-24|Su-34|F-111|F-14|F-15E|F-4|Tornado|EA-6/.test(j.type)?2:1);
  let fate;if(!ej){w.red.crewK+=crew;fate='crew killed';}else if(overUs){w.red.crewC+=crew;fate='crew ejected, captured';}else{w.red.crewR+=crew;fate='crew ejected over their lines';}
  emit('OPP_LOSS',{e:[],loc:[x,z],txt:'Enemy '+j.type+' shot down'+(src&&(src===PL())?' by you':src&&src.callsign?' by '+src.callsign:'')+' · '+fate+'.',d:{type:j.type,ej:!!ej,crew}});}
// personnel in destroyed ground vehicles: an ESTIMATE (rule, not a count): crew size per kind, about 40 % killed and 45 % wounded
const CREW={MBT:[4,3],IFV:[3,3],APC:[2,2],INF:[9,9],ART:[5,5],MRL:[3,3]};
function groundLoss(u){const w=W(),c=(CREW[u.k]||[3,3])[u.s?1:0],g=u.s===ourSide?w.gl.own:w.gl.opp,k=Math.round(c*.4),wd=Math.round(c*.45);g.kia+=k;g.wia+=wd;
  const A=w.gacc||(w.gacc={t0:H(),s:[{n:0,k:0,w:0,sec:{}},{n:0,k:0,w:0,sec:{}}]}),q=A.s[u.s===ourSide?0:1];q.n++;q.k+=k;q.w+=wd;q.sec[u.i+1]=1;}
// one summary event per campaign hour, not one per vehicle: the ledger stays readable and bounded
function flushGround(force){const w=W(),A=w&&w.gacc;if(!A||(!force&&H()-A.t0<1))return;w.gacc=null;
  for(const [i,who] of [[0,'Our'],[1,'Enemy']]){const q=A.s[i];if(!q.n)continue;
    emit('GROUND_LOSS',{cf:'ESTIMATED',txt:who+' ground forces lost '+q.n+' vehicle'+(q.n===1?'':'s')+' or squad'+(q.n===1?'':'s')+' in sector'+(Object.keys(q.sec).length>1?'s ':' ')+Object.keys(q.sec).join(', ')+' since '+fmtT(A.t0)+' · personnel casualties estimated '+q.k+' killed, '+q.w+' wounded.',d:{side:i,n:q.n,kia:q.k,wia:q.w}});}}
/* ------------------------------------------------------------------------------------------ the field projection */
// CAMP.bases()[].pool on our side is what the legacy AI and UI read. It is recomputed from the airframe ledger; any loss a legacy
// writer made (abstract raids during time skips, hangar hits) becomes a recorded airframe loss, and unexplained gains are discarded.
// Legacy writers lower pool by fractions (a bomb near the hangars: -0.35); that expected value accumulates per field and every
// whole 1.0 becomes one recorded airframe loss. Heavy bombers are drawn from pool by strategic.js and are not squadron airframes: exempt.
// A legacy drop is measured against the value this projection last wrote (w.ps), never against the ready count: airframes
// coming out of maintenance or arriving by ferry raise the ready count and must not read as losses.
function syncPools(reason,ex0){const w=W();if(!w||CAMP.client)return;w.gd=w.gd||{};w.ps=w.ps||{};const ex=Object.assign({},ex0||{});
  for(const j of CAMP.air||[])if(j.side===ourSide&&j.ai&&j.ai.camp&&j.ai.camp.bmb&&!j._hvx){j._hvx=1;ex[j.ai.camp.home]=(ex[j.ai.camp.home]||0)+1;}
  for(const b of CAMP.st.bases){if(b.side!==ourSide){delete w.ps[b.id];continue;}const last=w.ps[b.id],d=last==null?0:last-fin(b.pool,last)-(ex[b.id]||0);
    if(d>1e-6){w.gd[b.id]=(w.gd[b.id]||0)+d;const why=reason||'enemy action at the field';
      while(w.gd[b.id]>=1-1e-9){w.gd[b.id]-=1;const L=readyAt(b.id),a=L[L.length-1];if(!a){w.gd[b.id]=0;break;}a.st='LOST';a.lostT=H();
        emit('AF_LOST',{e:[a.id,b.id],cf:'ESTIMATED',txt:a.type+' '+a.tail+' destroyed on the ground at '+bName(b.id)+' ('+why+')',d:{ground:1,why}});}}
    b.pool=w.ps[b.id]=readyAt(b.id).length;}}
// a field lost to the advancing front: ready airframes fly out, the rest and the stock are captured, crews escape
function baseFell(b){const w=W(),to=ourBases().filter(q=>q.id!==b.id).map(q=>Object.assign({},cbDef(q.id),q)).sort((p,q)=>Math.hypot(p.x-cbDef(b.id).x,p.z-cbDef(b.id).z)-Math.hypot(q.x-cbDef(b.id).x,q.z-cbDef(b.id).z))[0];
  const e=emit('BASE:LOST',{e:[b.id],loc:[cbDef(b.id).x,cbDef(b.id).z],txt:bName(b.id)+' overrun.'});
  for(const a of Object.values(w.af)){if(a.base!==b.id||a.st==='LOST'||a.st==='CAPTURED')continue;
    if(a.st==='READY'&&to){a.base=to.id;emit('AF_EVAC',{e:[a.id,b.id,to.id],c:[evId(e)],txt:a.type+' '+a.tail+' evacuated to '+bName(to.id)});}
    else if(a.st!=='SORTIE'){a.st='CAPTURED';a.lostT=H();emit('AF_CAPTURED',{e:[a.id,b.id],c:[evId(e)],txt:a.type+' '+a.tail+' could not be flown out and was abandoned at '+bName(b.id)});}}
  for(const p of Object.values(w.pp))if(p.base===b.id&&to)p.base=to.id;
  const I=w.inv[b.id];if(I){for(const c of COM){w.lg[c].cap+=Math.max(0,I[c]);I[c]=0;}emit('SUPPLY:CAPTURED',{e:[b.id],c:[evId(e)],txt:'Stock at '+bName(b.id)+' lost with the field.'});}
  for(const s of Object.values(w.sh))if(s.st==='ENROUTE'&&s.to===b.id&&to){s.to=to.id;s.eta=Math.max(s.eta,H()+.5);emit('CONVOY:DIVERTED',{e:[s.id,to.id],c:[evId(e)],txt:'Convoy '+s.id+' diverted to '+bName(to.id)});}}

/* ------------------------------------------------------------------------------------------ time: production, convoys, maintenance, crews */
const DEPOT={x:8000,z:118000};
function step(dh){const w=W();if(!w||CAMP.client||!(dh>0))return;const t=H(),D=w.depot;
  for(const c of COM){const q=CFG.prod[c]*dh;D[c]+=q;w.lg[c].prod+=q;}D.af+=CFG.prod.af*dh;D.pp+=CFG.prod.pp*dh;
  w.red.af+=CFG.redProd*dh;w.red.prod+=CFG.redProd*dh;
  for(const a of Object.values(w.af))if(a.st==='MAINT'&&a.until<=t){a.st='READY';a.until=0;}
  for(const a of Object.values(w.af))if(a.st==='FERRY'&&a.until<=t){a.st='READY';a.until=0;emit('AF_FERRY:ARRIVED',{e:[a.id,a.base],txt:a.type+' '+a.tail+' arrived at '+bName(a.base),t:a.until||t});}
  for(const p of Object.values(w.pp)){if(p.until>t)continue;
    if(p.st==='WOUNDED'){if(p.sev===2){p.st='MEDWD';const e=emit('PILOT:MEDWD',{e:[p.id],txt:rankName(p)+' has been medically withdrawn from flying and reassigned to ground duties.'});pnote(p,'medically withdrawn from flying',evId(e));}
      else{p.st='ACTIVE';const e=emit('PILOT:RTD',{e:[p.id],txt:rankName(p)+' has returned to flying duty.'});pnote(p,'returned to duty',evId(e));}}
    else if(p.st==='MISSING'){const pr=p.mx<6000?.55:.25;
      if(Math.random()<pr){p.st=Math.random()<.5?'WOUNDED':'ACTIVE';p.until=t+(p.st==='WOUNDED'?rr(24,72):12);p.sev=1;const e=emit('PILOT:RESCUED',{e:[p.id],txt:rankName(p)+', missing since '+fmtT(p.hist.length?p.hist[p.hist.length-1][0]:t)+', has been recovered by friendly forces.'});pnote(p,'recovered from behind the lines',evId(e));}
      else{p.st='CAPTURED';const e=emit('PILOT:CAPTURED',{e:[p.id],txt:rankName(p)+' is reported to be a prisoner of war.',cf:'REPORTED'});pnote(p,'held as a prisoner of war',evId(e));}}}
  // replacement crews and airframes to the fields that are short
  while(w.fer.next<=t){const at=w.fer.next;w.fer.next+=2;
    for(const b of ourBases()){const hold=Object.values(w.af).filter(a=>a.base===b.id&&['READY','MAINT','FERRY','SORTIE'].includes(a.st)).length;
      if(hold<CFG.minAf&&D.af>=1){D.af--;const types=roleTypes(hold%2?'STK':'CAP'),a=newAf(types[0]||'F-16',sqOf(b.id).id,b.id,'FERRY');a.until=at+1;}
      const crew=Object.values(w.pp).filter(p=>p.base===b.id&&['ACTIVE','WOUNDED'].includes(p.st)).length;
      if(crew<Math.ceil(hold*1.2)&&D.pp>=1){D.pp--;const p=newPilot(sqOf(b.id).id,b.id);const e=emit('PILOT:JOINED',{e:[p.id,b.id],txt:rankName(p)+' joined '+sqOf(b.id).name+' from the training pipeline.',t:at});pnote(p,'joined the squadron',evId(e));}}}
  // convoys: dispatch on a schedule, arrive at their ETA, run a risk on the road
  while(w.conv.next<=t){const at=w.conv.next;w.conv.next+=CFG.convoy.every;
    for(const b of ourBases()){if(Object.values(w.sh).some(s=>s.st==='ENROUTE'&&s.to===b.id))continue;const I=inv(b.id),cg={};let any=0;
      for(const c of COM){const want=Math.max(0,CFG.target[c]-I[c]),q=Math.min(want,CFG.convoy.cap[c],Math.max(0,D[c]));cg[c]=c==='fuel'?Math.round(q):Math.floor(q);if(cg[c]>0)any=1;}
      if(!any)continue;for(const c of COM)D[c]-=cg[c];const d=cbDef(b.id),km=Math.hypot(d.x-DEPOT.x,d.z-DEPOT.z)/1000;
      const s={id:nid('C'),from:'DEPOT',to:b.id,cg,dep:at,eta:at+km/CFG.convoy.kmh,st:'ENROUTE'};w.sh[s.id]=s;
      const e=emit('CONVOY:DEPARTED',{e:[s.id,b.id],t:at,txt:'Convoy '+s.id+' left the depot for '+bName(b.id)+' with '+cargoTxt(cg)+'; due in '+(km/CFG.convoy.kmh).toFixed(1)+' h.'});s.ev=evId(e);}}
  for(const s of Object.values(w.sh)){if(s.st!=='ENROUTE')continue;const d=cbDef(s.to),fz=CAMP.frontZ(d.x),near=Math.exp(-Math.max(0,d.z-fz)/30000);
    const seg=Math.min(dh,Math.max(0,Math.min(t,s.eta)-(s.lt||s.dep)));s.lt=Math.min(t,s.eta);
    if(seg>0&&Math.random()<1-Math.exp(-(0.015+0.06*near)*seg)){const f=rr(.3,1),L={};for(const c of COM){L[c]=c==='fuel'?Math.round(s.cg[c]*f):Math.floor(s.cg[c]*f);s.cg[c]-=L[c];w.lg[c].lost+=L[c];}
      const all=COM.every(c=>s.cg[c]<=0);if(all)s.st='LOST';emit('CONVOY:ATTACKED',{e:[s.id,s.to],c:[s.ev],cf:'REPORTED',txt:'Convoy '+s.id+' to '+bName(s.to)+' was hit from the air: '+(all?'cargo destroyed':cargoTxt(L)+' lost, the rest pressing on')+'.',d:{L}});}
    if(s.st==='ENROUTE'&&s.eta<=t){const I=inv(s.to);if(baseRec(s.to)&&baseRec(s.to).side===ourSide){for(const c of COM)I[c]+=s.cg[c];s.st='DELIVERED';s.at=s.eta;
        emit('CONVOY:DELIVERED',{e:[s.id,s.to],c:[s.ev],t:s.eta,txt:'Convoy '+s.id+' delivered '+cargoTxt(s.cg)+' to '+bName(s.to)+'.'});}}}
  flushGround(false);
  // keep finished shipments for a day, then fold them away (their events stay in the ledger)
  for(const [k,s] of Object.entries(w.sh))if(s.st!=='ENROUTE'&&t-(s.at||s.eta)>24)delete w.sh[k];
  syncPools();
  if(t-w.audit.t>1/6){w.audit.t=t;const r=audit();w.audit.n=r.length;w.audit.last=r.slice(0,8);if(r.length)warnOnce('audit '+r[0],r);}}
const cargoTxt=cg=>[cg.fuel>0?Math.round(cg.fuel/1000)+' t fuel':'',cg.aam>0?cg.aam+' AAM':'',cg.agm>0?cg.agm+' A/G':'',cg.spares>0?cg.spares+' spares':''].filter(Boolean).join(', ')||'nothing';
const fmtT=h=>{if(!CAMP.st)return'';const hh=CAMP.st.h0+h,d=Math.floor(hh/24),m=hh-d*24;return'D'+(d+1)+' '+String(Math.floor(m)).padStart(2,'0')+String(Math.floor((m%1)*60)).padStart(2,'0');};

/* ------------------------------------------------------------------------------------------ audit */
function audit(){const w=W(),out=[];if(!w)return['no ledger'];const st=CAMP.st;
  // supply: everything that ever entered the system is somewhere, or accounted as used / lost / captured
  for(const c of COM){const L=w.lg[c];let held=w.depot[c];for(const k in w.inv)held+=w.inv[k][c];
    for(const s of Object.values(w.sh))if(s.st==='ENROUTE')held+=s.cg[c];if(c!=='spares')for(const o of Object.values(w.onb))held+=o[c];
    const lhs=L.init+L.prod,rhs=held+L.exp+L.lost+L.cap,tol=Math.max(1e-3,Math.abs(lhs)*1e-7);if(Math.abs(lhs-rhs)>tol)out.push(c+' ledger off by '+(lhs-rhs).toFixed(3));
    if(w.depot[c]<-1e-6)out.push('negative depot '+c);for(const k in w.inv)if(w.inv[k][c]<-1e-6)out.push('negative '+c+' at '+k);}
  const tails=new Set();for(const a of Object.values(w.af)){if(tails.has(a.tail))out.push('duplicate tail '+a.tail);tails.add(a.tail);
    if(!['READY','SORTIE','MAINT','FERRY','LOST','CAPTURED'].includes(a.st))out.push('bad airframe state '+a.id);
    if(a.st!=='LOST'&&a.st!=='CAPTURED'&&a.st!=='SORTIE'){const b=baseRec(a.base);if(!b||b.side!==ourSide)out.push(a.tail+' at a field we do not hold');}
    if(a.st==='SORTIE'&&!w.onb[a.id])out.push(a.tail+' flying with nothing issued');if(!w.sq[a.sq])out.push(a.tail+' orphan squadron');}
  for(const k in w.onb)if(!w.af[k]||w.af[k].st!=='SORTIE')out.push('stores on board a grounded airframe '+k);
  for(const p of Object.values(w.pp))if(!['ACTIVE','WOUNDED','MISSING','CAPTURED','KIA','MEDWD'].includes(p.st))out.push('bad crew state '+p.id);
  for(const b of st.bases)if(b.side===ourSide&&Math.abs(b.pool-readyAt(b.id).length)>1e-6)out.push('pool projection stale at '+b.id);
  for(const s of Object.values(w.sh))if(!cbDef(s.to))out.push('convoy to unknown field '+s.id);
  if(w.player&&!w.pp[w.player])out.push('player pilot missing');
  const ids=new Set();for(const e of w.ev){if(ids.has(e.id))out.push('duplicate event '+e.id);ids.add(e.id);}
  return out;}

/* ------------------------------------------------------------------------------------------ the player's sortie */
function playerPilot(base){const w=W();let p=w.pp[w.player];const cs=(($('#cs')&&$('#cs').value)||'').trim().slice(0,16)||'Pilot';
  if(!p){p=newPilot(sqOf(base).id,base,{cs,player:1,rank:isRedFaction()?'KAPITAN':'CAPT'});w.player=p.id;const e=emit('PILOT:JOINED',{e:[p.id,base],txt:rankName(p)+' (you) joined '+sqOf(base).name+'.'});pnote(p,'joined the squadron',evId(e));}
  if(p.cs!==cs)p.cs=cs;
  if(['KIA','MEDWD','CAPTURED'].includes(p.st)){const nx=freePilot(base);if(!nx)return{p:null,why:rankName(p)+' is '+stWord(p)+' and no other pilot is free at '+bName(base)};
    p.player=0;nx.player=1;nx.cs=cs;w.player=nx.id;const e=emit('PILOT:SUCCESSION',{e:[p.id,nx.id],txt:rankName(p)+' is '+stWord(p)+'. You now fly as '+rankName(nx)+'.'});pnote(nx,'took over as the player pilot',evId(e));
    return{p:nx,stand:1,why:'You now fly as '+rankName(nx)};}
  const ok=p.st==='ACTIVE'&&!(p.until>H());
  if(!ok){const alt=freePilot(base);if(!alt)return{p:null,why:rankName(p)+' is '+stWord(p)+' and no other pilot is free at '+bName(base)};
    return{p:alt,stand:1,why:rankName(p)+' is '+stWord(p)+'; you fly as '+rankName(alt)};}
  p.base=base;return{p};}
const stWord=p=>({KIA:'dead',WOUNDED:'wounded',MISSING:'missing',CAPTURED:'a prisoner',MEDWD:'off flying duty',ACTIVE:p.until>H()?'resting':'available'})[p.st]||p.st.toLowerCase();
function startPlayer(base){const w=W(),P=PL();if(!w||!P||CAMP.client)return;
  const pc=playerPilot(base);if(!pc.p)return;const a=acquire(base,P.type);if(!a)return;
  const t=CAMP.task,m={id:nid('M'),kind:t?t.kind:'FREE',label:t?t.label:'Free hunt',x:t?t.x:null,z:t?t.z:null,st:'ACTIVE',t0:H(),so:[]};w.ms[m.id]=m;
  const me=emit('MISSION:ASSIGNED',{e:[m.id],a:'COMMAND',loc:t?[t.x,t.z]:null,txt:'Mission '+m.id+': '+m.label});
  const e=bindJet(P,a,pc.p,base,m.kind,evId(me));if(pc.stand)pnote(pc.p,'flew in place of the player pilot',evId(e));
  const so={id:nid('R'),pilot:pc.p.id,af:a.id,type:a.type,tail:a.tail,base,ms:m.id,t0:H(),t1:null,land:null,out:'AIRBORNE',ak:0,gk:0,iss:w.onb[a.id]?Object.assign({},w.onb[a.id]):null,ev:[evId(me),evId(e)]};
  w.so[so.id]=so;w.soL.unshift(so.id);m.so.push(so.id);P._w.so=so.id;P._w.ms=m.id;
  while(w.soL.length>CFG.soMax){const k=w.soL.pop();delete w.so[k];}
  for(const j of (WL()).slice()){const wa=acquire(base,j.type),wp=freePilot(base,pc.p.id);
    if(!wa||!wp){j.alive=false;j.gone=true;scene.remove(j.mesh);const i=jets.indexOf(j);if(i>=0)jets.splice(i,1);WING.list.splice(WING.list.indexOf(j),1);
      flash('WINGMAN GROUNDED · '+(!wa?'NO '+j.type+' AVAILABLE':'NO CREW AVAILABLE'),2500);continue;}
    bindJet(j,wa,wp,base,'WING',evId(me));}
  syncPools();}
function endPlayer(o){const w=W(),P=PL();if(!w||!P||!P._w||P._w.done||CAMP.client)return;const c=P._w,so=w.so[c.so],m=w.ms[c.ms];
  if(o.dead)lostJet(P,!!P._ej,null);else recoverJet(P,o.base||c.base,o.abs?'OFF':'LAND');
  if(so){so.t1=H();so.land=o.dead?null:(o.base||c.base);so.out=o.dead?'LOST':o.abs?'RTB (not flown home)':'LANDED';so.ak=o.ak|0;so.gk=o.gk|0;
    const p=w.pp[so.pilot];if(p){p.ak+=so.ak;p.gk+=so.gk;so.fate=p.st;}const a=w.af[so.af];if(a)so.afst=a.st;
    so.exp=null;const last=w.ev.slice(-6).reverse().find(e=>(e.ty==='RECOVER'||e.ty==='AF_LOST')&&e.e[0]===so.af);if(last){so.ev.push(last.id);if(last.d&&last.d.exp)so.exp=last.d.exp;}}
  if(m){const g=CAMP._lastGrade;m.st=!g?(m.kind==='FREE'?'FLOWN':'NO RESULT'):g.state==='DONE'?'COMPLETE':g.state==='PART'?'PARTIAL':'NOT COMPLETED';m.res=g?g.txt:null;m.t1=H();
    const e=emit('MISSION:'+m.st.replace(/ /g,'_'),{e:[m.id,so&&so.id],c:so?so.ev.slice(0,1):[],txt:'Mission '+m.id+' ('+m.label+'): '+m.st.toLowerCase()+(m.res?' · '+m.res:'')});if(so)so.ev.push(evId(e));}
  for(const j of (WL()))if(j._w&&!j._w.done){if(j.alive)recoverJet(j,o.base||c.base,'OFF');else lostJet(j,!!j._ej,null);}
  syncPools();}

/* ------------------------------------------------------------------------------------------ wrappers (outermost layer) */
// ejection is decided inside Jet.kill (addons-v324); read it from the parachute list it fills
{const _k=Jet.prototype.kill;Jet.prototype.kill=function(why,src){const was=this.alive,n0=window.PILOTS?PILOTS.length:0;const r=_k.apply(this,arguments);
  if(was&&!this.alive&&CAMP.st&&W()&&!CAMP.client)safe('kill',()=>{this._ej=!!(window.PILOTS&&PILOTS.length>n0);
    if(this._w&&this!==PL())lostJet(this,this._ej,src);
    else if(!this._w&&this.side!==ourSide&&this.ai&&this.ai.camp)oppLoss(this,this._ej,src);
    else if(!this._w&&this.side===ourSide&&this.ai&&this.ai.camp&&this.ai.camp.bmb)emit('AF_LOST',{loc:[this.pos.x,this.pos.z],txt:(this.callsign?this.callsign+': ':'')+this.type+' lost (strategic bomber force, not tracked by tail)',d:{heavy:1,ej:this._ej}});});
  return r;};}
{const _l=CAMP.launch;CAMP.launch=function(side,role,baseId,n,o){if(side!==ourSide||!W()||this.client)return _l.apply(this,arguments);
  const pre=safe('launchPre',()=>blueLaunchPre(role,baseId,n));if(!pre)return null;
  const L=(CTYPES[this.st.era]||CTYPES.cold)[isRedFaction()?1:0],keep=L[role];L[role]=[pre.type];let out;try{out=_l.apply(this,arguments);}finally{L[role]=keep;}
  if(out)safe('launchBind',()=>out.forEach((j,i)=>bindJet(j,pre.af[i],pre.pp[i],baseId,role,null)));syncPools(null,out?{[baseId]:out.length}:null);return out;};}
{const _l=CAMP.land;CAMP.land=function(j){if(j&&j._w&&W()&&!this.client){const c=j.ai&&j.ai.camp;safe('land',()=>recoverJet(j,c?c.home:j._w.base,'LAND'));const r=_l.apply(this,arguments);syncPools();return r;}
  return _l.apply(this,arguments);};}
{const _d=CAMP.despawn;CAMP.despawn=function(j){if(j&&j._w&&!j._w.done&&j.alive&&W()&&!this.client)safe('despawn',()=>recoverJet(j,j._w.base,'OFF'));return _d.apply(this,arguments);};}
{const _g=CAMP.groundStep;CAMP.groundStep=function(dt){if(!W()||this.client)return _g.apply(this,arguments);
  const pools={},sides={};for(const b of this.st.bases){pools[b.id]=b.pool;sides[b.id]=b.side;}
  const r=_g.apply(this,arguments);
  safe('groundStep',()=>{for(const b of this.st.bases)if(sides[b.id]===ourSide&&b.side!==ourSide){baseFell(b);b.pool=0;}else if(sides[b.id]!==ourSide&&b.side===ourSide){inv(b.id);sqOf(b.id);emit('BASE:TAKEN',{e:[b.id],txt:bName(b.id)+' taken. The field is ours, empty of stock until the depot supplies it.'});}
    redPoolGate(pools);syncPools();});
  return r;};}
{const _d=CAMP.dmgUnit;CAMP.dmgUnit=function(u,d,src){const was=u&&u.dead;const r=_d.apply(this,arguments);if(u&&!was&&u.dead&&W()&&!this.client)safe('gloss',()=>groundLoss(u));return r;};}
{const _a=CAMP.airAbstract;CAMP.airAbstract=function(h){const r=_a.apply(this,arguments);if(W()&&!this.client)safe('abs',()=>syncPools('enemy action during the time skip'));return r;};}
{const _a=CAMP.adKilled;CAMP.adKilled=function(g,src){const r=_a.apply(this,arguments);if(W()&&!this.client)safe('adk',()=>syncPools('hangar destroyed'));return r;};}
{let acc=0;const _t=CAMP.tick;CAMP.tick=function(dt){const r=_t.apply(this,arguments);if(this.st&&W()&&!this.client){acc+=dt;if(acc>=1){const a=acc;acc=0;safe('step',()=>{step(a/3600);syncPools();});}}return r;};}
{const _a=CAMP.advance;CAMP.advance=function(hours){const w=W(),t0=this.st?this.st.t:0;const r=_a.apply(this,arguments);
  if(this.st&&W()&&!this.client)safe('advance',()=>{const dh=this.st.t-t0;for(let k=0;k<Math.ceil(dh/.25);k++){const s=Math.min(.25,dh-k*.25);this.st.t=t0+k*.25+s;step(s);}this.st.t=t0+dh;syncPools();this.save();});
  return r;};}
{const _n=CAMP.newState;CAMP.newState=function(){const st=_n.apply(this,arguments);try{delete st.wld;attach();this.save();}catch(e){warnOnce('newState',e);}return st;};}
{const _ld=CAMP.load;CAMP.load=function(){const ok=_ld.apply(this,arguments);if(ok)safe('attach',attach);return ok;};}
{const _s=CAMP.startSortie;CAMP.startSortie=async function(){
  if(this.st&&W()&&!this.client){safe('pre',()=>recoverAll('the previous sortie ended with the aircraft in the air'));
    const b=this.homeBase&&this.homeBase();
    if(b&&!this.st.over){const pc=safe('pp',()=>playerPilot(b.id));if(pc&&!pc.p){flash(pc.why.toUpperCase(),3500);return;}
      if(inv(b.id).fuel<2500){flash('NO FUEL AT '+bName(b.id)+' · WAIT FOR A CONVOY OR PICK ANOTHER FIELD',3500);return;}
      const ok=readyAt(b.id,game.ac).length||W().depot.af>=1;if(!ok){flash('NO '+game.ac+' AVAILABLE AT '+bName(b.id)+' · NONE LEFT AT THE DEPOT',3500);return;}
      if(pc&&pc.stand)setTimeout(()=>flash(pc.why.toUpperCase(),3500),1200);}}
  const r=await _s.apply(this,arguments);
  if(this.on&&this.st&&W()&&!this.client){const b=this.sortie&&this.sortie.base;safe('startPlayer',()=>startPlayer(b));
    const P=PL();if(P&&!P._w)flash('NO AIRFRAME RECORD FOR THIS SORTIE',2000);}
  return r;};}
{const _r=CAMP.respawn;CAMP.respawn=function(){const P=PL();if(P&&P._w&&!P._w.done&&W()&&!this.client)safe('respawnEnd',()=>endPlayer({dead:!P.alive,ak:0,gk:0}));
  const r=_r.apply(this,arguments);if(W()&&!this.client&&this.sortie)safe('respawnStart',()=>startPlayer(this.sortie.base));return r;};}
{const _e=CAMP.sortieEnd;CAMP.sortieEnd=function(){const P=PL(),s=this.sortie?Object.assign({},this.sortie):null;let o=null;
  if(P&&P._w&&!P._w.done&&W()&&!this.client){const m=/^LANDED AT (.+)$/.exec(game.result||''),lb=m&&CBASE.find(b=>b.name===m[1]);
    o={dead:!P.alive,base:lb?lb.id:null,abs:P.alive&&!lb&&!(P.onGnd&&P.vel.length()<6),ak:s?s.ak:0,gk:s?s.gk:0};
    if(P.alive&&!lb&&P.onGnd&&P.vel.length()<6){const nb=ourBases().map(b=>Object.assign({},cbDef(b.id),b)).find(b=>Math.hypot(b.x-P.pos.x,b.z-P.pos.z)<3200);o.base=nb?nb.id:null;o.abs=!nb;}}
  this._lastGrade=null;const pb={};for(const b of this.st?this.st.bases:[])pb[b.id]=b.pool;const r=_e.apply(this,arguments);
  if(W()&&!this.client)for(const b of this.st.bases)if(b.side===ourSide&&pb[b.id]!=null)b.pool=pb[b.id];   // the ledger records the player's loss itself
  if(o)safe('endPlayer',()=>endPlayer(o));if(W()&&!this.client){safe('post',()=>recoverAll('the sortie ended with the aircraft in the air'));syncPools();this.save();}
  return r;};}
// co-op: the host sends the read model a few times a minute; clients render it, they never write the ledger
{const _p=CAMP.publish;CAMP.publish=function(){const r=_p.apply(this,arguments);if((this.pubN||0)%40===0&&W())safe('pub',()=>net.r.emit('wrv',view()).catch(()=>{}));return r;};
 const _h=CAMP.netHooks;CAMP.netHooks=function(){const r=_h.apply(this,arguments);try{net.unsub.push(net.r.on('wrv',m=>{if(net.isHost||!this.client||!m||!m.data)return;CAMP._wrv=m.data;}));}catch(e){warnOnce('wrv',e);}return r;};}

/* ------------------------------------------------------------------------------------------ read model (UI and co-op) */
function view(){const w=W();if(!w||CAMP.client)return CAMP._wrv||null;const t=H();
  const bases=ourBases().map(b=>{const A=Object.values(w.af).filter(a=>a.base===b.id),P=Object.values(w.pp).filter(p=>p.base===b.id);
    return{id:b.id,name:bName(b.id),inv:Object.assign({},inv(b.id)),ready:A.filter(a=>a.st==='READY').length,maint:A.filter(a=>a.st==='MAINT').length,air:A.filter(a=>a.st==='SORTIE').length,ferry:A.filter(a=>a.st==='FERRY').length,
      crew:P.filter(p=>p.st==='ACTIVE'&&!(p.until>t)).length,rest:P.filter(p=>p.st==='ACTIVE'&&p.until>t).length,
      inb:Object.values(w.sh).filter(s=>s.st==='ENROUTE'&&s.to===b.id).map(s=>({id:s.id,eta:+(s.eta-t).toFixed(1),cg:s.cg}))};});
  const af=Object.values(w.af).map(a=>({tail:a.tail,type:a.type,base:bName(a.base),st:a.st,eta:a.until>t?+(a.until-t).toFixed(1):0,so:a.so,hrs:+a.hrs.toFixed(1)}));
  const pp=Object.values(w.pp).map(p=>({id:p.id,n:rankName(p),st:p.st,me:p.id===w.player,base:bName(p.base),so:p.so,ak:p.ak,gk:p.gk,rest:p.until>t&&p.st==='ACTIVE',h:p.hist.slice(-3)}));
  const so=w.soL.map(k=>w.so[k]).filter(Boolean).slice(0,10).map(s=>({id:s.id,tail:s.tail,type:s.type,pilot:w.pp[s.pilot]?rankName(w.pp[s.pilot]):'?',from:bName(s.base),land:s.land?bName(s.land):null,t0:fmtT(s.t0),t1:s.t1!=null?fmtT(s.t1):null,
    out:s.out,ak:s.ak,gk:s.gk,iss:s.iss,exp:s.exp,fate:s.fate,ms:w.ms[s.ms]?{label:w.ms[s.ms].label,st:w.ms[s.ms].st,res:w.ms[s.ms].res}:null,ev:s.ev}));
  const ev=w.ev.slice(-60).reverse().map(e=>({id:e.id,t:fmtT(e.t),ty:e.ty,dm:e.dm,cf:e.cf,txt:e.txt,c:e.c}));
  const own=Object.values(w.pp),cnt=s=>own.filter(p=>p.st===s).length;
  const lostAf=Object.values(w.af).filter(a=>a.st==='LOST').length,capAf=Object.values(w.af).filter(a=>a.st==='CAPTURED').length;
  const fallen=own.filter(p=>p.st==='KIA').map(p=>({n:rankName(p),sq:w.sq[p.sq]?w.sq[p.sq].name:'',h:(p.hist[p.hist.length-1]||[])[0]})).slice(-30);
  return{t:fmtT(t),bases,af,pp,so,ev,fold:w.folded,depot:{fuel:Math.round(w.depot.fuel),aam:Math.floor(w.depot.aam),agm:Math.floor(w.depot.agm),spares:Math.floor(w.depot.spares),af:Math.floor(w.depot.af),pp:Math.floor(w.depot.pp)},
    loss:{own:{af:lostAf,afCap:capAf,kia:cnt('KIA'),mia:cnt('MISSING'),pow:cnt('CAPTURED'),wia:cnt('WOUNDED'),medwd:cnt('MEDWD'),gKia:w.gl.own.kia,gWia:w.gl.own.wia},
      opp:{af:w.red.lost,crewK:w.red.crewK,crewC:w.red.crewC,crewR:w.red.crewR,gKia:w.gl.opp.kia,gWia:w.gl.opp.wia,reserve:Math.floor(w.red.af)}},
    fallen,audit:{n:w.audit.n,last:w.audit.last},migrated:w.migrated};}

window.WORLD={CFG,W,emit,audit,view,step,syncPools,attach,recoverAll,readyAt,inv,storesOf,fmtT,
  explain(id){const w=W();if(!w)return[];const by=new Map(w.ev.map(e=>[e.id,e])),out=[],seen=new Set();const go=(i,d)=>{if(!i||seen.has(i)||d>12)return;seen.add(i);const e=by.get(i);if(!e){out.push({id:i,d,txt:'(older than the ledger keeps)'});return;}out.push({id:i,d,t:fmtT(e.t),txt:e.txt});for(const c of e.c||[])go(c,d+1);};go(id,0);return out;}};
if(CAMP.st)safe('init',()=>{attach();CAMP.save();});
})();
