/* =====================================================================================================================
   v358 — the Campaign Cemetery / Memorial Archive (spec v49 ch.14: "Every confirmed death during the campaign must have
   exactly one persistent memorial entry"; "Do not fabricate personal biographies, exact ages, occupations, family
   relations, precise locations, or detailed circumstances when the source does not contain those facts. Display 'not
   recorded' or 'unknown' instead"; "Where a casualty count is still an estimate ... keep it in a separate
   estimated/aggregate-loss display. Do not present an estimate as a list of confirmed named deaths"; "The cemetery is
   a read model over these records"; virtualised list, search, filters, detail page).
   THE DEATH LEDGER (st.dl): one record per RESOLVED death event — never a rate or an estimate. Sources, each resolved by
   the simulation person by person:
     * an aircraft destroyed in a world sortie: each crew member (1 or 2 seats by type) either ejects (then MISSING,
       until search and rescue resolves the fate) or is killed;
     * a vehicle destroyed in the ground fight (armor.js): each crew member's fate resolved on a catastrophic or
       penetrating hit; infantry killed as resolved there;
     * a building destroyed in a world sortie (targets.js): its occupants at that hour are resolved one by one (the
       hour's occupancy of that building, then whether each person reached shelter);
     * a named leader or commander killed (leaders.js); a squadron pilot missing (forces.js).
     Strategic losses (aircraft, brigades, ships worn down far from the player) are equipment and formation losses; the
     campaign does not resolve the people in them, so it shows NO death figures for them (no estimate is made).
   MEMORIAL ENTRIES are materialised lazily from the ledger with deterministic ids (event id + person number) and stable
   names from the regional naming service, collision-checked. Fields the source does not contain show "not recorded".
   Status: KILLED, MISSING (fate unknown), and later RESCUED / CAPTURED corrections keep the history.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.lead)return;
const W=WWAR,G=WGEO,Ld=W.lead;
const L=()=>W.st.dl||(W.st.dl={seq:1,ev:[],names:{}});
const TWO=new Set(['F-15E','F-14A','F-14B','Su-34','Su-30','Su-30SM','Tornado','F-4E','EA-18G','Su-24','J-16','F-18F','F/A-18F']);
const NR='not recorded';
/* ------------------------------------------------------------------ recording (one record per resolved event) */
function record(o){const l=L(),id='D'+(l.seq++).toString(36).toUpperCase(),t=W.st.t;const r=Object.assign({id,t,n:1,st:'KILLED',kind:'MIL',a3:null,role:NR,unit:NR,place:NR,cause:NR,src:null,named:null},o);
  if(r.n<1)return null;l.ev.push(r);return r;}
// a stable, culturally appropriate name per person slot, collision-checked across the archive
function rng(seed){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619);}return()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return((h>>>0)%1e6)/1e6;};}
function nameFor(r,i){if(r.named&&r.named[i])return r.named[i];const l=L(),k=r.id+'.'+i;if(r.n<=50&&l.names[k])return l.names[k];const P=Ld.POOL[Ld.REG(r.a3)]||Ld.POOL.EN,R=rng(k);
  if(r.n>50){const f=P[0][(R()*P[0].length)|0],g=P[1][(R()*P[1].length)|0];return f+' '+String.fromCharCode(65+((R()*26)|0))+'. '+g;}   // large cohorts: a stable name derived from the record id and person number (not cached); the archive id keeps it unique
  for(let tries=0;tries<20;tries++){const n=P[0][(R()*P[0].length)|0]+' '+P[1][(R()*P[1].length)|0]+(tries>5?' '+String.fromCharCode(65+((R()*26)|0))+'.':'');if(!l.used||!l.used[n]){(l.used||(l.used={}))[n]=1;return l.names[k]=n;}}return l.names[k]=r.id+'-'+i;}
function entries(f,max){const out=[];for(const r of L().ev){if(f&&!f(r))continue;for(let i=0;i<r.n;i++){out.push({r,i});if(max&&out.length>=max)return out;}}return out;}
// lazy paging over every entry (millions): records sorted by time, cumulative counts, entry k -> (record, person)
function pager(f){const R=L().ev.filter(r=>!f||f(r)).sort((a,b)=>a.t-b.t);const cum=[];let c=0;for(const r of R){c+=r.n;cum.push(c);}return{n:c,at(k){let lo=0,hi=cum.length-1;while(lo<hi){const m=(lo+hi)>>1;if(cum[m]>k)hi=m;else lo=m+1;}const r=R[lo];return{r,i:k-(lo?cum[lo-1]:0)};}};}
/* ------------------------------------------------------------------ sources */
const srcEv=()=>{const e=W.st.ev[W.st.ev.length-1];return e&&e.id;};
// aircraft destroyed in a world sortie
if(typeof Jet!=='undefined'){const _k=Jet.prototype.kill;Jet.prototype.kill=function(){const was=this.alive&&this!==player&&!this.remote&&this._ws&&W.st&&window.WSORTIE&&WSORTIE.WS.on;const r=_k.apply(this,arguments);
  if(was&&!this.alive){const crew=TWO.has(this.type)?2:1,sq=this._sqn&&W.st.ob&&W.st.ob.u[this._sqn];const th=window.WWAR.airbattle?W.airbattle.theatre():null;let k=0,m=0;
    for(let i=0;i<crew;i++){if(Math.random()<.45)m++;else k++;}   // each crew member: ejected (fate then unknown) or not
    const base={kind:'MIL',a3:this._ws,role:'aircrew ('+this.type+')',unit:sq?sq.name:NR,place:th?th.name:NR,src:srcEv()};
    if(k)record(Object.assign({},base,{n:k,st:'KILLED',cause:'killed in an aircraft loss'}));if(m)record(Object.assign({},base,{n:m,st:'MISSING',cause:'ejected from a destroyed aircraft; fate not yet known'}));}
  return r;};}
// ground fight: crews and infantry resolved in armor.js
if(window.ARMOR){const _r=ARMOR.resolve;ARMOR.resolve=function(u,v,w,dist){const men0=v._men,alive0=v.alive;const r=_r.apply(this,arguments);if(!W.st||!v._ws)return r;
  const unit=v._bde&&W.st.ob&&W.st.ob.u[v._bde]?W.st.ob.u[v._bde].name:NR,ll=G.xz2ll(v.pos.x,v.pos.z),place='near '+ll.lat.toFixed(2)+', '+ll.lon.toFixed(2);
  if(v._gk==='INF'){const k=v._kiaLast|0;if(k>0)record({kind:'MIL',a3:v._ws,role:'infantry',unit,place,cause:'killed in action',n:k,src:srcEv()});}
  else if(alive0&&!v.alive){const crew=v._gk==='MBT'?(/T-|Type 9|Al-Khalid|VT4/.test((ARMOR.prof(v._ws)||{}).mbt||'')?3:4):3;let k=0;for(let i=0;i<crew;i++)if(Math.random()<.7)k++;
    if(k)record({kind:'MIL',a3:v._ws,role:(v._gk==='MBT'?'tank':'armoured vehicle')+' crew',unit,place,cause:'killed when their vehicle was destroyed',n:k,src:srcEv()});}
  return r;};}
// civilians in buildings destroyed in a world sortie (targets.js asks for the resolution)
function buildingDeaths(n,where,a3,hr){let occ=0,k=0,inj=0;for(let b=0;b<n;b++){const people=Math.round((hr<6||hr>21?2.2:1.1)*(.5+Math.random()));occ+=people;for(let i=0;i<people;i++){const x=Math.random();if(x<.3)k++;else if(x<.65)inj++;}}
  if(k)record({kind:'CIV',a3,role:NR,unit:NR,place:where||NR,cause:'killed when the building they were in was destroyed',n:k,src:srcEv()});return{occ,k,inj};}
// named leaders and commanders
W.listeners.push(e=>{if(!W.st)return;if(e.ty==='COMMAND'&&/has been killed/.test(e.txt)){const m=/that (.+?), commanding/.exec(e.txt);if(m)record({kind:'MIL',a3:(e.e||[])[0],role:'front commander',place:NR,cause:'killed in the line of duty',named:[m[1]],src:e.id});}
  if(/is killed in an assassination/.test(e.txt)){const m=/^(.+?), (.+?), is killed/.exec(e.txt);if(m)record({kind:'CIV',a3:(e.e||[])[0],role:m[2],place:NR,cause:'killed in an assassination',named:[m[1]],src:e.id});}
  if(e.ty==='SQUADRON'&&/missing after a mission/.test(e.txt)){const m=/mourns (.+?) \((.+?)\), missing/.exec(e.txt);if(m)record({kind:'MIL',a3:(e.e||[])[0],role:'pilot, '+m[1],st:'MISSING',cause:'missing after a mission',named:[m[2]],src:e.id});}});
/* ------------------------------------------------------------------ totals (read model) */
function totals(a3){const T={kM:0,mM:0,kC:0,nat:0};for(const r of L().ev){if(a3&&r.a3!==a3)continue;if(r.nat){T.nat+=r.n;continue;}if(r.kind==='MIL'){if(r.st==='KILLED')T.kM+=r.n;else T.mM+=r.n;}else T.kC+=r.n;}return T;}
/* ------------------------------------------------------------------ the archive view: paged, searchable, filterable, detail page */
const UI={f:'WAR',q:'',pg:0,sel:null,a3:null};const PG=20;const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function view(a3){const st=W.st,T=totals(a3);const flt=r=>(!a3||r.a3===a3)&&(UI.f==='ALL'||(UI.f==='WAR'&&!r.nat)||(UI.f==='MIL'&&r.kind==='MIL'&&r.st==='KILLED')||(UI.f==='CIV'&&r.kind==='CIV'&&!r.nat)||(UI.f==='MISSING'&&r.st==='MISSING'));
  const q=UI.q.toLowerCase();let PGR;
  if(q){const recHit=r=>(r.unit+' '+r.role+' '+r.place+' '+r.cause+' '+(r.named||[]).join(' ')).toLowerCase().includes(q);let E=[];for(const r of L().ev.filter(flt).sort((a,b)=>a.t-b.t)){if(recHit(r)){for(let i=0;i<r.n&&E.length<20000;i++)E.push({r,i});}else if(r.n<=5000){for(let i=0;i<r.n;i++)if(nameFor(r,i).toLowerCase().includes(q))E.push({r,i});}if(E.length>=20000)break;}PGR={n:E.length,at:k=>E[k]};}
  else PGR=pager(flt);
  const E={length:PGR.n};const pages=Math.max(1,Math.ceil(PGR.n/PG));UI.pg=Math.min(UI.pg,pages-1);const S=[];for(let k=UI.pg*PG;k<Math.min(PGR.n,UI.pg*PG+PG);k++)S.push(PGR.at(k));
  let h='<div style="font-size:10px;color:#8a9a92">Every death the campaign has resolved has one entry here. Names are assigned by the archive (fictional people). Fields the record does not contain say “not recorded”. Losses of aircraft, formations and ships far from your flights are recorded as equipment losses: the people in them are not resolved one by one, and no death figure is estimated for them.</div>'+
    '<div class="row"><span>Military killed</span><b>'+T.kM.toLocaleString('en')+'</b></div>'+(T.nat?'<div class="row"><span>Deaths from natural causes (not war-related; included under ALL)</span><b>'+T.nat.toLocaleString('en')+'</b></div>':'')+'<div class="row"><span>Military missing (fate unknown)</span><b>'+T.mM.toLocaleString('en')+'</b></div><div class="row"><span>Civilians killed</span><b>'+T.kC.toLocaleString('en')+'</b></div>'+
    '<div class="tc">'+['WAR','MIL','CIV','MISSING','ALL'].map(k=>'<button data-cm="'+k+'" aria-pressed="'+(UI.f===k)+'">'+{WAR:'WAR DEAD',ALL:'ALL DEATHS',MIL:'MILITARY',CIV:'CIVILIANS',MISSING:'MISSING'}[k]+'</button>').join(' ')+'</div>'+
    '<div><input id="cmQ" aria-label="search the archive" value="'+esc(UI.q)+'" placeholder="name, unit, place" style="width:140px"> <button data-cm="q">FIND</button> <button data-cm="clr">CLEAR</button> · '+E.length+' entr'+(E.length===1?'y':'ies')+' · chronological</div>';
  if(UI.sel){const[rid,i]=UI.sel.split('.');const r=L().ev.find(x=>x.id===rid);if(r){const src=st.ev.find(e=>e.id===r.src);
    h+='<div style="border:1px solid #444;padding:6px;margin:4px 0"><b>'+esc(nameFor(r,+i))+'</b><br>'+[['Status',r.st==='KILLED'?'killed':'missing — fate not yet known'],['Role',r.role],['Unit or organisation',r.unit],['Country',st.c[r.a3]?st.c[r.a3].n:NR],['Date',W.date(r.t)],['Place',r.place],['How',r.cause],['Age',NR],['Home town',NR],['Identification',r.named?'confirmed name':'name assigned by the archive'],['Record',r.st==='MISSING'?'unresolved':'confirmed by the campaign\'s own record'],['Source event',src?src.txt.slice(0,140):(r.src||NR)]].map(([a,b])=>'<div class="row"><span>'+a+'</span><b>'+esc(b)+'</b></div>').join('')+'<button data-cm="back">BACK TO THE LIST</button></div>';}}
  h+=S.map(x=>'<div role="button" tabindex="0" data-cme="'+x.r.id+'.'+x.i+'" style="border-bottom:1px dotted #333;padding:2px 0;cursor:pointer"><b>'+esc(nameFor(x.r,x.i))+'</b> — '+esc(W.date(x.r.t).slice(0,10))+' · '+esc(x.r.role)+(x.r.unit!==NR?', '+esc(x.r.unit):'')+' · '+esc(x.r.cause)+(x.r.st==='MISSING'?' [missing]':'')+'</div>').join('')+
    (pages>1?'<div class="tc">'+(UI.pg>0?'<button data-cm="prev">← PREVIOUS</button>':'')+' page '+(UI.pg+1)+' of '+pages+' '+(UI.pg<pages-1?'<button data-cm="next">NEXT →</button>':'')+'</div>':'');
  return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.CEMETERY=p=>view(p.a3);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cm],[data-cme]');if(!b||!W.st)return;const d=b.dataset;
  if(d.cme)UI.sel=d.cme;else if(d.cm==='q'){const i=document.getElementById('cmQ');UI.q=i?i.value:'';UI.pg=0;}else if(d.cm==='clr'){UI.q='';UI.f='WAR';UI.pg=0;}else if(d.cm==='back')UI.sel=null;else if(d.cm==='prev')UI.pg--;else if(d.cm==='next')UI.pg++;else{UI.f=d.cm;UI.pg=0;}
  if(document.getElementById('wwEnd')&&W.endscreen)W.endscreen.go(10);else WARMAP.panel();});
// the epilogue's "Names and places": the archive itself
if(W.endscreen&&W.endscreen.CH){const ch=W.endscreen.CH.find(c=>c[0]==='Names and places');if(ch){const _f=ch[1];ch[1]=(F,st)=>_f(F,st)+'<h2>THE MEMORIAL ARCHIVE</h2>'+view(null);}}
W.cemetery={L,record,entries,pager,nameFor,totals,view,buildingDeaths,UI};
})();
