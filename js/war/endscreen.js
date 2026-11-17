/* =====================================================================================================================
   v340/v346 — the end of the war (spec v49 ch.14: unified end-of-war epilogue in fifteen chapters, the medal-burning
   ceremony, outcomes for the player's side winning, losing or neither, responsibility review, award archive).
   A full-screen, navigable final chapter (not a popup) that opens once when the war ends and can be reopened from the
   diplomacy report. Chapters: 1 The last day · 2 The war in time · 3 The medals and the record (the ceremony) ·
   4 The scale of destruction · 5 The people · 6 Families and interrupted lives · 7 Places that endured · 8 What was
   spent · 9 Accountability · 10 The work of peace · 11 Names and places · 12 The environment and future · 13 The
   unfinished world · 14 A final quotation · 15 After the ending.
   Rules kept from the spec: all sides combined first; estimates labelled with their rule; no score, no fanfare, the same
   grey for every side; no invented awards (only those in the career record); no fabricated testimony or biographies;
   names only for the fictional people the campaign itself created; the physical decorations are burned, the record is
   kept (award archive, citations, service history, investigations); one quotation from a short verified archive with
   author, occasion, date and source; pause (chapters advance only when you choose), replay, reduced motion, text size
   (tools.js ACCESS), keyboard navigation (← → Esc).
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR)return;
const W=WWAR;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+' million':n>=1e4?Math.round(n/1e3)+',000':String(Math.round(n||0));
const KIND={ARMISTICE:'An armistice',NEGOTIATED_PEACE:'A negotiated peace treaty',MUTUAL_EXHAUSTION:'A peace of mutual exhaustion',DECISIVE_VICTORY:'A military decision',COALITION_COLLAPSE:'The collapse of a coalition',
  STALEMATE:'An unresolved stalemate',REGIME_CHANGE:'A change of government',WITHDRAWAL:'A withdrawal to the prewar borders',NUCLEAR_CATASTROPHE:'A nuclear catastrophe',PARTIAL:'A partial settlement'};
// the verified quotation archive: author, occasion, date, source — public-domain, checked wording
const QUOTES=[{q:'Every gun that is made, every warship launched, every rocket fired signifies, in the final sense, a theft from those who hunger and are not fed, those who are cold and are not clothed.',
  a:'Dwight D. Eisenhower',w:'"The Chance for Peace" address to the American Society of Newspaper Editors',d:'16 April 1953',s:'Public Papers of the Presidents of the United States: Dwight D. Eisenhower, 1953'}];
let page=0,burnt=false;
function css(){if(document.getElementById('wwEndCss'))return;const s=document.createElement('style');s.id='wwEndCss';s.textContent=
 '#wwEnd{position:fixed;inset:0;z-index:9999;background:#0e1011;color:#d9dcd8;overflow:auto;font:14px/1.6 Georgia,serif;opacity:0;transition:opacity 2s}#wwEnd.on{opacity:1}'+
 '#wwEnd .w{max-width:760px;margin:0 auto;padding:36px 20px 90px}#wwEnd h1{font-weight:normal;letter-spacing:.2em;font-size:20px;color:#e8e8e2;text-align:center}#wwEnd h2{font-weight:normal;letter-spacing:.14em;font-size:13px;color:#9aa19c}'+
 '#wwEnd .nav{position:sticky;top:0;background:rgba(14,16,17,.95);display:flex;flex-wrap:wrap;gap:3px;padding:6px 0;border-bottom:1px solid #333}#wwEnd .nav button{font-size:11px;padding:3px 7px}'+
 '#wwEnd .wall{columns:2;column-gap:28px;font-size:13px}#wwEnd .wall div{break-inside:avoid;padding:2px 0;border-bottom:1px dotted #2c2c2c}#wwEnd .q{font-style:italic;color:#b8bcb6;text-align:center;margin:22px 0}'+
 '#wwEnd button{background:#2a2d2c;color:#ddd;border:1px solid #555;padding:7px 14px;margin:4px;font:inherit;cursor:pointer}#wwEnd button[aria-pressed=true]{border-color:#bbb}#wwEnd .est{color:#a99d6e;font-size:11px}'+
 '#wwEnd .medal{display:inline-block;border:1px solid #6b6b5f;border-radius:4px;padding:6px 10px;margin:4px;transition:opacity 6s,filter 6s}#wwEnd .medal.burn{opacity:.12;filter:sepia(1) brightness(.4)}'+
 '#wwEnd .fire{height:6px;margin:10px auto;width:60%;background:linear-gradient(90deg,transparent,#8a4b20,#b06a2a,#8a4b20,transparent);opacity:.6}'+
 '@media (prefers-reduced-motion:reduce){#wwEnd,#wwEnd .medal{transition:none}}@media (max-width:560px){#wwEnd .wall{columns:1}}';document.head.appendChild(s);}
/* ------------------------------------------------------------------ facts from the war's own records */
function outcome(){const st=W.st,me=(typeof game!=='undefined'&&game.team==='RED')?'R':'B';let gainB=0,gainR=0;
  for(const v of Object.values(st.cities||{})){if(v.h===v.own)continue;const h=st.c[v.h];if(!h)continue;if(h.side==='B')gainB+=v.pop;else if(h.side==='R')gainR+=v.pop;}
  const neg=/NEGOTIATED|MUTUAL|ARMISTICE|STALEMATE|PARTIAL|NUCLEAR/.test(st.over.kind);if(neg||Math.abs(gainB-gainR)<5e5)return'NEITHER';return (gainB>gainR?'B':'R')===me?'WIN':'LOSE';}
function facts(){const st=W.st,r=st.report||W.diplo.report(),L=Object.values(st.c);const sum=k=>L.reduce((t,p)=>t+(p[k]||0),0);
  const life=L.map(p=>p.life).filter(Boolean),mil=Object.values(st.mil||{});
  return{r,disp:sum('disp'),ref:sum('ref'),air:r.air.B+r.air.R,gnd:r.gnd.B+r.gnd.R,uxo:mil.reduce((t,m)=>t+(m.harm||0),0),homes:life.reduce((t,l)=>t+l.house.lost,0),school:life.reduce((t,l)=>t+l.edu.lost,0),
    her:life.reduce((t,l)=>t+l.heritage.dmg,0),pol:life.length?life.reduce((t,l)=>t+l.env.pol,0)/life.length:0,debt:life.length?life.reduce((t,l)=>t+l.fin.debt,0)/life.length:0,
    called:mil.reduce((t,m)=>t+(m.called||0),0),crews:mil.reduce((t,m)=>t+(m.lostCrews||0),0),mun:mil.reduce((t,m)=>t+Object.values(R0(m)).reduce((a,b)=>a+b,0),0),
    ships:L.reduce((t,p)=>t+(p.nav&&p.nav.lost?p.nav.lost.sur+p.nav.lost.sub+p.nav.lost.amp+p.nav.lost.cv:0),0),pow:st.csar?st.csar.pow:{B:0,R:0}};}
const R0=m=>{const u={};for(const k in m.mun)u[k]=Math.max(0,30-m.mun[k]);return u;};   // munitions spent beyond prewar stocks, in days of supply (rule)
const EST='<div class="est">Estimates by rule from the campaign\'s records, not real figures. The simulation does not count people one by one.</div>';
function career(){const st=W.st;return st.lead&&st.lead.career||null;}
const CH=[
 ['The last day',(F,st)=>{const o=st.over,oc=outcome();return '<h1>THE WAR IS OVER</h1><div class="q">'+esc((KIND[o.kind]||o.kind)+' · '+W.date(o.t)+' · after '+F.r.days+' days')+'</div><div>'+esc(F.r.txt||o.txt)+'</div>'+
   '<p>'+(st.fronts.every(f=>f.cf)?'The fighting stops on every front.':'Fighting continues in isolated places.')+(/STALEMATE/.test(o.kind)?' The conflict is unresolved.':'')+'</p>'+
   '<p>'+({WIN:'Your side prevails. Victory is the end of the fighting, not the end of what the fighting did.',LOSE:'Your side is defeated. Defeat is borne first by the people who had no say in the war.',NEITHER:'Neither side prevails. What was settled was settled at the table; what was lost is lost on both sides.'}[oc])+'</p>';}],
 ['The war in time',(F,st)=>{const K=/^(ENTRY|EXIT|MOBILIZATION|CITY|CEASEFIRE|DIPLO|END|CRISIS|OCCUPATION)$/;const E=st.ev.filter(e=>K.test(e.ty));const pick=E.filter((e,i)=>i%Math.max(1,Math.ceil(E.length/24))===0).slice(-24);
   return pick.length?pick.map(e=>'<div>'+esc(W.date(e.t).slice(0,10))+' — '+esc(e.txt)+'</div>').join(''):'<div>The record holds no major turning points.</div>';}],
 ['The medals and the record',(F,st)=>{const c=career(),A=c&&c.awards||[];
   if(!A.length)return '<div>You received no decorations in this war. Others did, and others received none for what they did. The record of your service remains: '+(c?c.sorties+' sorties':'no sorties')+'.</div>';
   return '<div>Your decorations, with their citations:</div><div id="wwMedals">'+A.map(a=>{const D=(W.lead&&W.lead.AWARDS||[]).find(x=>x[0]===a[0]);return '<div class="medal'+(burnt?' burn':'')+'"><b>'+esc(a[1])+'</b><br><span class="est">'+esc(W.date(a[2]).slice(0,10))+' · '+esc(D?D[2]:'')+'</span></div>';}).join('')+'</div>'+
     '<p>Set against them: '+fmt(F.air)+' aircraft and '+fmt(F.gnd)+' brigades destroyed on all sides, about '+fmt(F.disp)+' people driven from their homes, '+fmt(F.homes)+' homes lost, schools closed for an estimated '+fmt(F.school)+' country-days.</p>'+
     (burnt?'<div class="fire"></div><p class="q">The decorations have been burned. The record remains: every award, citation and sortie is kept in the archive.</p>':'<div style="text-align:center"><button data-we="burn">PLACE THE DECORATIONS IN THE FIRE</button></div>');}],
 ['The scale of destruction',(F)=>'<div>All sides combined. Combat aircraft: about '+fmt(F.air)+'. Ground brigade-equivalents: about '+fmt(F.gnd)+'. Warships: about '+fmt(F.ships)+'. Heritage sites damaged: '+F.her+'.</div>'+EST],
 ['The people',(F,st)=>{const T=W.cemetery?W.cemetery.totals(null):{kM:0,mM:0,kC:0};return '<div>Recorded in the memorial archive: '+T.kM+' military dead, '+T.mM+' missing whose fate is not known, '+T.kC+' civilians killed — every one a person the campaign accounted for. Deaths among forces worn down far from your flights were not resolved person by person; the campaign does not estimate them.</div><div>People displaced inside their countries: about '+fmt(F.disp)+'. Refugees abroad: about '+fmt(F.ref)+' (estimates of displacement, not of deaths).</div><p>No testimony is invented here.</p>';}],
 ['Families and interrupted lives',(F)=>'<div>About '+fmt(F.called)+' people were called up, leaving work, study and families. Schools were closed for an estimated '+fmt(F.school)+' country-days. Households displaced will take years to settle.</div>'+EST],
 ['Places that endured',(F,st)=>{const C=Object.entries(st.cities||{}).filter(([k,v])=>v.h!==v.own).slice(0,24);return '<div>Places that changed hands:</div><div class="wall">'+(C.map(([k,v])=>'<div>'+esc(k.split('|')[0])+' — '+esc(st.c[v.own]?st.c[v.own].n:'')+'</div>').join('')||'<div>none</div>')+'</div><div>Homes destroyed or uninhabitable: about '+fmt(F.homes)+'.</div>'+EST;}],
 ['What was spent',(F)=>'<canvas id="ammoCv" class="ammo2" role="img" aria-label="the munitions used in the war, lined up by kind"></canvas><div>Munitions spent beyond prewar stocks: about '+Math.round(F.mun)+' country-days of combat supply. Public debt in the countries that fought: about '+Math.round(F.debt*100)+' % of output on average. What was not built instead: schools, clinics, homes, railways.</div>'+EST+'<p>No financial total here is a measure of a human life.</p>'],
 ['Accountability',(F,st)=>{const J=(st.law&&st.law.cases)||[];const ev=st.ev.filter(e=>/JUSTICE|COURT|CASE|ALLEGATION|INQUIRY/.test(e.ty)).slice(-10);
   const c=career(),inq=c&&c.inq||[];return (J.length?'<div>'+J.length+' cases were opened into the conduct of the war.</div>':'<div>No case was opened. That is not the same as nothing having happened.</div>')+ev.map(e=>'<div>· '+esc(e.txt)+(e.cf?' <span class="est">['+esc(e.cf)+']</span>':'')+'</div>').join('')+
     '<h2>YOUR RESPONSIBILITY REVIEW</h2>'+(inq.length?inq.map(x=>'<div>· '+esc(typeof x==='string'?x:JSON.stringify(x))+'</div>').join(''):'<div>No investigation concerns your own conduct.</div>')+'<p class="est">Responsibility is individual and supported by evidence; there is no collective guilt.</p>';}],
 ['The work of peace',(F,st)=>'<div>Ceasefire monitoring, prisoner exchanges, the search for the missing, clearance of unexploded ordnance, restoration of power and water, reopening of schools and hospitals, and the slow return of the displaced.</div>'+(st.post?'<div>Postwar reconstruction is under way in the campaign.</div>':'<div>Choose CONTINUE POSTWAR to take part in it.</div>')],
 ['Names and places',(F,st)=>{const R=st.frc&&st.frc.roster;const gone=R?R.ppl.filter(q=>q.st!=='ACTIVE'):[];const fell=Object.values(st.c).filter(p=>p.lostAir>0||p.lostGnd>0).sort((a,b)=>(b.lostAir+b.lostGnd*50)-(a.lostAir+a.lostGnd*50));
   return (R?(gone.length?'<div>From your squadron (fictional people of this campaign):</div><div class="wall">'+gone.map(q=>'<div>'+esc(q.rank+' '+q.name)+' — “'+esc(q.cs)+'”, '+esc(q.st.toLowerCase())+'</div>').join('')+'</div>':'<div>Everyone in your squadron came home. Others did not.</div>'):'')+
     '<div style="margin-top:12px">The countries that fought remember their dead:</div><div class="wall">'+fell.slice(0,40).map(p=>'<div>'+esc(p.n)+' — '+fmt(p.lostAir)+' aircraft and their crews, '+fmt(p.lostGnd)+' brigade-equivalents</div>').join('')+'</div>';}],
 ['The environment and future',(F)=>'<div>Pollution from the fighting remains in former battle areas (index '+Math.round(F.pol*100)+'); unexploded ordnance will be cleared field by field. Children who missed school, people who lost work, and veterans with lasting injuries carry the war forward.</div>'+EST],
 ['The unfinished world',(F,st)=>{const L=Object.values(st.c).filter(p=>p.life&&(p.life.house.lost>0||p.disp>0)).sort((a,b)=>(b.disp||0)-(a.disp||0)).slice(0,8);return '<div>Not everything ends with the war. Still displaced, still rebuilding:</div>'+L.map(p=>'<div>· '+esc(p.n)+': about '+fmt(p.disp||0)+' people away from home</div>').join('')+EST;}],
 ['A final quotation',()=>{const q=QUOTES[0];return '<div class="q">“'+esc(q.q)+'”</div><div style="text-align:center">— '+esc(q.a)+', '+esc(q.w)+', '+esc(q.d)+'<br><span class="est">Source: '+esc(q.s)+'</span></div><p class="est" style="text-align:center">A reflection, not a verdict on you.</p>';}],
 ['After the ending',(F,st)=>'<div>The campaign history, award archive, memorial, investigations and your flight records remain open in the war panel (NOTES, DEBRIEF, ARSENAL, JUSTICE).</div><div style="text-align:center;margin-top:20px">'+(st.post?'':'<button data-we="post">CONTINUE POSTWAR</button>')+'<button data-we="close">CLOSE</button></div>']];
function view(){const st=W.st,d=document.getElementById('wwEnd');if(!d||!st||!st.over)return;const F=facts();const[t,f]=CH[page];style2();
  d.innerHTML='<div class="w2"><header class="hd2"><div class="tt2">THE END OF THE WAR</div><nav class="nav2" role="navigation" aria-label="chapters">'+CH.map((c,i)=>'<button data-wp="'+i+'" aria-current="'+(i===page?'page':'false')+'" title="'+esc(c[0])+'"><span>'+(i+1)+'</span></button>').join('')+'</nav>'+
    '<div class="pb2"><i style="width:'+Math.round((page+1)/CH.length*100)+'%"></i></div></header>'+
    '<article class="card2"><div class="no2">CHAPTER '+(page+1)+' OF '+CH.length+'</div><h1 class="h12">'+esc(t)+'</h1><div class="body2">'+f(F,st)+'</div></article>'+
    '<footer class="ft2">'+(page>0?'<button data-wp="'+(page-1)+'">← '+esc(CH[page-1][0])+'</button>':'<span></span>')+(page<CH.length-1?'<button class="nx2" data-wp="'+(page+1)+'">'+esc(CH[page+1][0])+' →</button>':'')+'</footer></div>';
  requestAnimationFrame(()=>{const c=d.querySelector('.card2');if(c)c.classList.add('in');const cv=d.querySelector('#ammoCv');if(cv)drawAmmo(cv);});}
function style2(){if(document.getElementById('wwEnd2Css'))return;const s=document.createElement('style');s.id='wwEnd2Css';s.textContent=
 '#wwEnd{background:radial-gradient(ellipse at 50% 0%,#1b2124 0%,#0b0d0e 70%) !important}#wwEnd .w2{max-width:860px;margin:0 auto;padding:22px 22px 60px;min-height:100%;display:flex;flex-direction:column}'+
 '#wwEnd .hd2{position:sticky;top:0;padding:10px 0 8px;background:linear-gradient(#0d1011,rgba(13,16,17,.9));z-index:2}#wwEnd .tt2{text-align:center;letter-spacing:.42em;font-size:12px;color:#8f978f;margin-bottom:8px}'+
 '#wwEnd .nav2{display:flex;justify-content:center;gap:4px;flex-wrap:wrap}#wwEnd .nav2 button{width:30px;height:30px;padding:0;margin:0;border-radius:50%;background:transparent;border:1px solid #3a403c;color:#8f978f;font:12px Georgia,serif}'+
 '#wwEnd .nav2 button[aria-current=page]{background:#d9dcd8;color:#111;border-color:#d9dcd8}#wwEnd .pb2{height:2px;background:#24292a;margin-top:10px}#wwEnd .pb2 i{display:block;height:100%;background:#a9b0a8;transition:width .6s}'+
 '#wwEnd .card2{margin-top:26px;padding:34px 38px;background:rgba(255,255,255,.025);border:1px solid #262b2c;border-radius:4px;opacity:0;transform:translateY(8px);transition:opacity 1.1s,transform 1.1s}#wwEnd .card2.in{opacity:1;transform:none}'+
 '#wwEnd .no2{font-size:11px;letter-spacing:.3em;color:#7d857e}#wwEnd .h12{font-family:Georgia,serif !important;text-shadow:none !important;text-align:left;font-weight:normal;font-size:30px;margin:6px 0 18px;color:#eceee9;letter-spacing:.02em}#wwEnd .body2{font-size:16px;line-height:1.75;color:#cfd3cd}'+
 '#wwEnd .body2 h1{font-family:Georgia,serif !important;text-shadow:none !important;font-size:34px;letter-spacing:.24em;text-align:center;margin:8px 0 14px}#wwEnd .body2 h2{font-size:12px;letter-spacing:.2em;color:#8f978f;margin-top:26px}'+
 '#wwEnd .ft2{display:flex;justify-content:space-between;margin-top:22px;gap:10px}#wwEnd .ft2 button{background:transparent;border:1px solid #3a403c;color:#cfd3cd;padding:10px 16px;font:14px Georgia,serif}#wwEnd .ft2 .nx2{border-color:#a9b0a8;color:#fff}'+
 '#wwEnd .ammo2{width:100%;background:#0f1213;border:1px solid #262b2c;border-radius:3px;margin:12px 0}'+
 '@media (max-width:560px){#wwEnd .card2{padding:20px 16px}#wwEnd .h12{font-size:23px}}@media (prefers-reduced-motion:reduce){#wwEnd .card2{transition:none;opacity:1;transform:none}}';document.head.appendChild(s);}
/* the ammunition used, drawn lined up: each icon stands for a number of rounds; rows by kind (from the munitions ledger) */
function ammoTotals(){const M=(W.st.census&&W.st.census.mun)||{},T={};for(const m of Object.values(M))for(const[k,v]of Object.entries(m)){const c=/artillery/.test(k)?'Artillery shells':/gun rounds/.test(k)?'Gun rounds':/air-to-air|AIM|R-7|PL-|MICA|Meteor|IRIS/.test(k)?'Air-to-air missiles':/surface-to-air|interceptor/.test(k)?'Surface-to-air missiles and interceptors':/long-range/.test(k)?'Long-range missiles':/precision|GBU|KAB|AGM|Kh-|Maverick|JDAM/.test(k)?'Precision weapons':/Mk-|FAB|bomb/i.test(k)?'Bombs':'Other munitions';T[c]=(T[c]||0)+v;}return Object.entries(T).sort((a,b)=>b[1]-a[1]);}
function drawAmmo(cv){const c=cv.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1),W0=cv.clientWidth||760,rows=ammoTotals();const H=Math.max(140,rows.length*92+30);cv.width=W0*dpr;cv.height=H*dpr;cv.style.height=H+'px';c.scale(dpr,dpr);
  c.fillStyle='#0f1213';c.fillRect(0,0,W0,H);if(!rows.length){c.fillStyle='#8f978f';c.font='14px Georgia';c.fillText('No munitions were recorded.',20,40);return;}
  const icon=(k,x,y)=>{c.save();c.translate(x,y);c.fillStyle='#b8a46a';c.strokeStyle='#6d6142';
    if(/Artillery/.test(k)){c.fillRect(-3,-9,6,14);c.beginPath();c.moveTo(-3,-9);c.lineTo(0,-15);c.lineTo(3,-9);c.fill();c.fillStyle='#8d7a4a';c.fillRect(-3.4,3,6.8,2);}
    else if(/Gun/.test(k)){c.fillRect(-1.5,-8,3,11);c.beginPath();c.moveTo(-1.5,-8);c.lineTo(0,-12);c.lineTo(1.5,-8);c.fill();}
    else if(/Bombs/.test(k)){c.fillStyle='#6f7564';c.beginPath();c.ellipse(0,-2,5,10,0,0,7);c.fill();c.fillRect(-5,7,10,3);}
    else{c.fillStyle='#d8d8cc';c.fillRect(-2.2,-16,4.4,26);c.beginPath();c.moveTo(-2.2,-16);c.lineTo(0,-21);c.lineTo(2.2,-16);c.fill();c.fillStyle='#8a8f86';c.fillRect(-5,6,10,2);c.fillRect(-4,-4,8,1.5);}
    c.restore();};
  rows.forEach(([k,v],ri)=>{const y=ri*92+26;const per=Math.max(1,Math.pow(10,Math.max(0,Math.floor(Math.log10(v))-1)));const n=Math.min(60,Math.ceil(v/per));
    c.fillStyle='#e6e8e3';c.font='14px Georgia';c.fillText(k,16,y);c.fillStyle='#8f978f';c.font='12px Georgia';const lbl=Math.round(v).toLocaleString('en')+'  ·  each mark = '+per.toLocaleString('en');c.fillText(lbl,W0-16-c.measureText(lbl).width,y);
    const step=Math.max(9,(W0-40)/Math.max(n,30));for(let i=0;i<n;i++)icon(k,24+i*step,y+46);});}
function open(){const st=W.st;if(!st||!st.over)return;css();close();burnt=!!st.medalsBurnt;page=0;const d=document.createElement('div');d.id='wwEnd';d.setAttribute('role','dialog');d.setAttribute('aria-label','The end of the war');document.body.appendChild(d);view();requestAnimationFrame(()=>d.classList.add('on'));st.endSeen=st.over.t;}
function close(){const d=document.getElementById('wwEnd');if(d)d.remove();}
function burn(){const st=W.st;burnt=true;st.medalsBurnt=st.t;W.emit('CEREMONY',{txt:'At the end of the war the pilot\'s decorations are placed in the fire. The physical medals are gone; the record of every award and citation remains.'});
  document.querySelectorAll('#wwMedals .medal').forEach(m=>m.classList.add('burn'));setTimeout(view,matchMedia('(prefers-reduced-motion: reduce)').matches?0:6500);}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wwEnd [data-we],#wwEnd [data-wp]');if(b){if(b.dataset.wp!=null){page=+b.dataset.wp;view();return;}
    if(b.dataset.we==='burn'){burn();return;}if(b.dataset.we==='post'&&W.st){W.st.post=true;W.emit('POSTWAR',{txt:'Postwar: the lines are frozen where they stood; the clock keeps running.'});}close();if(window.WARMAP)WARMAP.panel();return;}
  const o=e.target.closest&&e.target.closest('[data-we-open]');if(o)open();});
document.addEventListener('keydown',e=>{if(!document.getElementById('wwEnd'))return;if(e.key==='Escape')close();else if(e.key==='ArrowRight'&&page<CH.length-1){page++;view();}else if(e.key==='ArrowLeft'&&page>0){page--;view();}});
setInterval(()=>{const st=W.st;if(st&&st.over&&st.endSeen!==st.over.t&&document.getElementById('wmWar'))open();},1500);
if(window.WARMAP&&WARMAP.after)WARMAP.after.push(()=>{const el=document.querySelector('#wsDip .rep');if(el&&!el.querySelector('[data-we-open]'))el.insertAdjacentHTML('beforeend','<div class="tc"><button data-we-open="1">THE END OF THE WAR</button></div>');});
W.endscreen={drawAmmo,ammoTotals,open,close,CH,outcome,facts,burn,QUOTES,go:i=>{page=i;view();}};
})();
