/* =====================================================================================================================
   v325 — WAR RECORD panel on the CAMPAIGN tab. Presentation only: it renders WORLD.view() (the read model of the campaign
   ledger in world.js; on a co-op client, the copy the host sends) and never writes campaign state.
   Tabs: FIELDS (stock, airframes, crews, convoys) · ROSTER · SORTIES (debriefs) · HISTORY (event ledger, "why" chains)
         LOSSES (both sides, estimates labelled, the fallen by name) · AUDIT (ledger consistency).
   ===================================================================================================================== */
(()=>{
'use strict';
if(typeof CMPUI==='undefined'||!window.WORLD)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const UI={tab:'fields',open:false,dm:'all',why:null,so:null};
try{const o=JSON.parse(localStorage.getItem('viper.wr')||'null');if(o){if(typeof o.tab==='string')UI.tab=o.tab;UI.open=!!o.open;}}catch(e){}
const keep=()=>{try{localStorage.setItem('viper.wr',JSON.stringify({tab:UI.tab,open:UI.open}));}catch(e){}};

document.head.insertAdjacentHTML('beforeend','<style>'+
 '#cmWr{margin:8px 0;border:1px solid rgba(255,255,255,.1);border-radius:4px;background:rgba(6,12,10,.35);font:11px/1.45 "B612 Mono",monospace;color:var(--tx,#e8f0ec)}'+
 '#cmWr>summary{cursor:pointer;padding:6px 8px;font:700 11px var(--f1,"B612 Mono",monospace);letter-spacing:.14em;color:var(--cy,#5be1ff);list-style:none;display:flex;justify-content:space-between}'+
 '#cmWr>summary::-webkit-details-marker{display:none}#cmWr>summary i{font-style:normal;color:var(--dm,#8a9a92);letter-spacing:.04em;font-weight:400}'+
 '#cmWr .wt{display:flex;flex-wrap:wrap;gap:4px;padding:0 8px 6px}#cmWr .wt button,#cmWr .wf button,#cmWr .wbtn{all:unset;cursor:pointer;font:700 9.5px "B612 Mono",monospace;letter-spacing:.1em;padding:2px 6px;border:1px solid rgba(255,255,255,.18);border-radius:3px;color:var(--dm,#8a9a92)}'+
 '#cmWr .wt button[aria-pressed=true],#cmWr .wf button[aria-pressed=true]{color:#0b1a24;background:var(--cy,#5be1ff);border-color:var(--cy,#5be1ff)}#cmWr .wbtn{color:var(--cy,#5be1ff);border-color:currentColor}'+
 '#cmWr .wb{padding:0 8px 8px;max-height:46vh;overflow:auto}#cmWr h4{margin:8px 0 3px;font:700 10px "B612 Mono",monospace;letter-spacing:.14em;color:var(--dm,#8a9a92)}'+
 '#cmWr .fld{border-top:1px solid rgba(255,255,255,.07);padding:5px 0}#cmWr .fld b{color:#e8f0ec}#cmWr .row{display:flex;justify-content:space-between;gap:8px}#cmWr .row span{color:var(--dm,#8a9a92)}'+
 '#cmWr .bar{height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;margin:1px 0 3px}#cmWr .bar i{display:block;height:100%;background:#5be1ff}#cmWr .bar i.lo{background:#ffcf5a}#cmWr .bar i.no{background:#ff6a58}'+
 '#cmWr table{width:100%;border-collapse:collapse;font-size:10.5px}#cmWr td,#cmWr th{padding:2px 4px;text-align:left;border-bottom:1px solid rgba(255,255,255,.05)}#cmWr th{color:var(--dm,#8a9a92);font-weight:400;font-size:9.5px;letter-spacing:.08em}'+
 '#cmWr .me{color:#7dffa0}#cmWr .s-READY,#cmWr .s-ACTIVE{color:#7dffa0}#cmWr .s-MAINT,#cmWr .s-FERRY,#cmWr .s-WOUNDED,#cmWr .s-SORTIE{color:#ffcf5a}#cmWr .s-LOST,#cmWr .s-KIA,#cmWr .s-CAPTURED,#cmWr .s-MISSING{color:#ff9a88}#cmWr .s-MEDWD{color:#b8c4d0}'+
 '#cmWr .ev{padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer}#cmWr .ev em{font-style:normal;color:var(--dm,#8a9a92);margin-right:6px}#cmWr .cf{font-size:9px;letter-spacing:.08em;color:#ffcf5a;margin-left:4px}'+
 '#cmWr .why{margin:2px 0 4px 10px;padding-left:6px;border-left:2px solid #5be1ff;color:#cfe2ea}#cmWr .card{border-top:1px solid rgba(255,255,255,.08);padding:5px 0;cursor:pointer}#cmWr .ok{color:#7dffa0}#cmWr .pt{color:#ffcf5a}#cmWr .no{color:#ff9a88}'+
 '#cmWr .note{color:var(--dm,#8a9a92);font-size:10px;margin:4px 0}#cmWr .mem{color:#d8e0e6;padding:2px 0}#cmWr .wf{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px}'+
 '</style>');

const TABS=[['fields','FIELDS'],['roster','ROSTER'],['sorties','SORTIES'],['history','HISTORY'],['losses','LOSSES'],['audit','AUDIT']];
const T=v=>v>=10000?Math.round(v/1000)+' t':(v/1000).toFixed(1)+' t';
const bar=(v,max)=>{const f=Math.max(0,Math.min(1,v/Math.max(1,max)));return'<div class="bar"><i class="'+(f<.15?'no':f<.4?'lo':'')+'" style="width:'+Math.round(f*100)+'%"></i></div>';};
const TGT=()=>WORLD.CFG.target;
const stCls=s=>'s-'+String(s).split(' ')[0];

function fields(v){let h='';for(const b of v.bases){const I=b.inv,G=TGT();
  h+='<div class="fld"><div class="row"><b>'+esc(b.name)+'</b><span>'+b.ready+' ready · '+b.maint+' maint'+(b.air?' · '+b.air+' flying':'')+(b.ferry?' · '+b.ferry+' ferrying':'')+'</span></div>'+
    '<div class="row"><span>Crews</span><span>'+b.crew+' available'+(b.rest?' · '+b.rest+' resting':'')+'</span></div>'+
    '<div class="row"><span>Fuel</span><span>'+T(I.fuel)+'</span></div>'+bar(I.fuel,G.fuel)+
    '<div class="row"><span>Air-to-air missiles</span><span>'+Math.floor(I.aam)+'</span></div>'+bar(I.aam,G.aam)+
    '<div class="row"><span>Air-to-ground stores</span><span>'+Math.floor(I.agm)+'</span></div>'+bar(I.agm,G.agm)+
    '<div class="row"><span>Spares</span><span>'+Math.floor(I.spares)+'</span></div>'+
    (b.inb.length?b.inb.map(s=>'<div class="row"><span>Convoy '+esc(s.id)+' due</span><span>'+Math.max(0,s.eta).toFixed(1)+' h</span></div>').join(''):'<div class="note">No convoy on the road.</div>')+'</div>';}
  const D=v.depot;h+='<h4>REAR DEPOT</h4><div class="row"><span>Stock</span><span>'+T(D.fuel)+' · '+D.aam+' AAM · '+D.agm+' A/G · '+D.spares+' spares</span></div>'+
    '<div class="row"><span>Replacements</span><span>'+D.af+' airframes · '+D.pp+' crews</span></div><div class="note">Industry and training add to the depot every hour; convoys leave every 3 h for any field below its target stock. A convoy near the front can be hit from the air.</div>';
  return h;}
function roster(v){let h='<h4>AIRFRAMES</h4><table><tr><th>TAIL</th><th>TYPE</th><th>FIELD</th><th>STATE</th><th>SORTIES</th></tr>';
  const o={READY:0,SORTIE:1,MAINT:2,FERRY:3,LOST:4,CAPTURED:5};
  for(const a of v.af.slice().sort((p,q)=>(o[p.st]-o[q.st])||p.base.localeCompare(q.base)))h+='<tr><td>'+esc(a.tail)+'</td><td>'+esc(a.type)+'</td><td>'+esc(a.base)+'</td><td class="'+stCls(a.st)+'">'+a.st+(a.eta?' '+a.eta+' h':'')+'</td><td>'+a.so+'</td></tr>';
  h+='</table><h4>AIRCREW</h4><table><tr><th>NAME</th><th>FIELD</th><th>STATUS</th><th>SORTIES</th><th>A/A · A/G</th></tr>';
  const po={ACTIVE:0,WOUNDED:1,MISSING:2,CAPTURED:3,MEDWD:4,KIA:5};
  for(const p of v.pp.slice().sort((a,b)=>(b.me-a.me)||(po[a.st]-po[b.st])||b.so-a.so))h+='<tr><td class="'+(p.me?'me':'')+'">'+esc(p.n)+(p.me?' · YOU':'')+'</td><td>'+esc(p.base)+'</td><td class="'+stCls(p.st)+'">'+(p.st==='MEDWD'?'GROUND DUTY':p.rest?'RESTING':p.st)+'</td><td>'+p.so+'</td><td>'+p.ak+' · '+p.gk+'</td></tr>';
  return h+'</table><div class="note">Names are fictional and generated for this campaign.</div>';}
function sorties(v){if(!v.so.length)return'<div class="note">No sorties flown since the war record opened.</div>';let h='';
  for(const s of v.so){const m=s.ms,cl=m&&m.st==='COMPLETE'?'ok':m&&m.st==='PARTIAL'?'pt':m&&m.st==='NOT COMPLETED'?'no':'';
    const f=x=>x?T(x.fuel)+' fuel · '+x.aam+' AAM · '+x.agm+' A/G':'—';
    h+='<div class="card" data-wso="'+esc(s.id)+'"><div class="row"><b>'+esc(s.id)+' · '+esc(s.type)+' '+esc(s.tail)+'</b><span>'+esc(s.t0)+(s.t1?' → '+esc(s.t1):'')+'</span></div>'+
      '<div>'+esc(s.pilot)+' · from '+esc(s.from)+' · <span class="'+(s.out==='LOST'?'no':'')+'">'+esc(s.out)+(s.land&&s.out!=='LOST'?' at '+esc(s.land):'')+'</span></div>'+
      (m?'<div class="'+cl+'">'+esc(m.label)+': '+esc(m.st)+(m.res?' · '+esc(m.res):'')+'</div>':'')+
      '<div class="row"><span>'+s.ak+' air / '+s.gk+' ground kills</span><span>'+(s.fate&&s.fate!=='ACTIVE'?'pilot '+esc(s.fate.toLowerCase()):'')+'</span></div>';
    if(UI.so===s.id)h+='<div class="why">Issued: '+f(s.iss)+'<br>Used: '+f(s.exp)+(s.ev&&s.ev.length?'<br>Ledger: '+s.ev.map(esc).join(' · '):'')+'</div>';
    h+='</div>';}
  return h;}
function history(v){const D=[['all','ALL'],['air','AIR'],['personnel','CREWS'],['logistics','SUPPLY'],['mission','MISSIONS'],['base','FIELDS'],['ground','GROUND'],['campaign','CAMPAIGN']];
  let h='<div class="wf">'+D.map(([k,l])=>'<button data-wdm="'+k+'" aria-pressed="'+(UI.dm===k)+'">'+l+'</button>').join('')+'</div>';
  const L=v.ev.filter(e=>UI.dm==='all'||e.dm===UI.dm);if(!L.length)h+='<div class="note">Nothing recorded here yet.</div>';
  for(const e of L){h+='<div class="ev" data-wev="'+esc(e.id)+'"><em>'+esc(e.t)+'</em>'+esc(e.txt)+(e.cf!=='CONFIRMED'?'<span class="cf">'+esc(e.cf)+'</span>':'')+'</div>';
    if(UI.why===e.id){const ch=window.WORLD&&WORLD.W()?WORLD.explain(e.id):[];h+='<div class="why">'+(ch.length>1?ch.map(c=>'·'.repeat(c.d)+' '+esc(c.t||'')+' '+esc(c.txt)).join('<br>'):'No recorded cause before this event.')+'</div>';}}
  if(v.fold)h+='<div class="note">'+v.fold+' older entries are kept only as counts.</div>';return h;}
function losses(v){const o=v.loss.own,e=v.loss.opp,r=(l,x)=>'<div class="row"><span>'+l+'</span><span>'+x+'</span></div>';
  let h='<h4>OUR SIDE</h4>'+r('Aircraft lost',o.af+(o.afCap?' (+'+o.afCap+' abandoned)':''))+r('Aircrew killed',o.kia)+r('Aircrew missing',o.mia)+r('Aircrew held as prisoners',o.pow)+r('Aircrew wounded (now)',o.wia)+r('Medically withdrawn',o.medwd)+
    r('Ground forces killed / wounded (est.)',o.gKia+' / '+o.gWia);
  h+='<h4>THEIR SIDE</h4>'+r('Aircraft lost',e.af)+r('Aircrew killed',e.crewK)+r('Aircrew taken prisoner by us',e.crewC)+r('Aircrew who ejected over their lines',e.crewR)+r('Ground forces killed / wounded (est.)',e.gKia+' / '+e.gWia)+
    r('Airframes in their reserve',e.reserve);
  h+='<div class="note">Aircrew figures are counted from the simulation. Ground casualty figures are estimates from vehicle crew sizes, not counts of people. Enemy figures are the simulation record, not what our intelligence would know.</div>';
  h+='<h4>THE FALLEN</h4>'+(v.fallen.length?v.fallen.map(f=>'<div class="mem">'+esc(f.n)+' · '+esc(f.sq)+'</div>').join(''):'<div class="note">No one from our squadrons has been killed.</div>');
  return h;}
function auditT(v){const a=v.audit||{n:0,last:[]};let h='<div class="row"><span>Issues at the last check</span><b class="'+(a.n?'no':'ok')+'">'+a.n+'</b></div>';
  if(a.last&&a.last.length)h+='<div class="why">'+a.last.map(esc).join('<br>')+'</div>';
  h+='<div class="note">The ledger checks itself every 10 campaign minutes: supply that cannot be accounted for, airframes in two places, crews in impossible states, a field count that does not match its airframes.</div>';
  if(window.WORLD&&WORLD.W()&&!CAMP.client)h+='<button class="wbtn" data-wx="audit">RUN CHECK NOW</button>';if(v.migrated)h+='<div class="note">This war started before the record existed: nothing before the record opened was reconstructed.</div>';return h;}

function block(){if(!CAMP.st)return'';const v=WORLD.view();
  if(!v)return'<details id="cmWr"><summary>WAR RECORD <i>kept by the host</i></summary></details>';
  const B={fields,roster,sorties,history,losses,audit:auditT}[UI.tab]||fields,cnt=v.bases.reduce((m,b)=>m+b.ready,0);
  return'<details id="cmWr"'+(UI.open?' open':'')+'><summary>WAR RECORD <i>'+cnt+' ready · '+esc(v.t)+(v.audit&&v.audit.n?' · ⚠ '+v.audit.n:'')+'</i></summary>'+
    '<div class="wt">'+TABS.map(([k,l])=>'<button data-wt="'+k+'" aria-pressed="'+(UI.tab===k)+'">'+l+'</button>').join('')+'</div><div class="wb">'+B(v)+'</div></details>';}

function mount(el){const old=el.querySelector('#cmWr');const sc=old&&old.querySelector('.wb')?old.querySelector('.wb').scrollTop:0;if(old)old.remove();
  const at=el.querySelector('#cmObj')||el.querySelector('.cm-hd');const html=block();if(!html)return;
  if(at)at.insertAdjacentHTML('afterend',html);else el.insertAdjacentHTML('afterbegin',html);
  const n=el.querySelector('#cmWr');if(n){const wb=n.querySelector('.wb');if(wb)wb.scrollTop=sc;n.addEventListener('toggle',()=>{UI.open=n.open;keep();});}}
{const _r=CMPUI.renderSide;CMPUI.renderSide=function(){_r.apply(this,arguments);try{const el=this.side;if(!el||this.confirm)return;mount(el);}catch(e){if(!mount._w){mount._w=1;console.warn('[warrecord]',e);}}};}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#cmWr [data-wt],#cmWr [data-wdm],#cmWr [data-wev],#cmWr [data-wso],#cmWr [data-wx]');if(!t)return;
  if(t.dataset.wt){UI.tab=t.dataset.wt;keep();}else if(t.dataset.wdm)UI.dm=t.dataset.wdm;else if(t.dataset.wev)UI.why=UI.why===t.dataset.wev?null:t.dataset.wev;
  else if(t.dataset.wso)UI.so=UI.so===t.dataset.wso?null:t.dataset.wso;
  else if(t.dataset.wx==='audit'&&WORLD.W()){const r=WORLD.audit(),w=WORLD.W();w.audit.n=r.length;w.audit.last=r.slice(0,8);w.audit.t=CAMP.st.t;}
  CMPUI.renderSide(false);});
window.WARREC={UI,block};
})();
