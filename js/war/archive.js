/* =====================================================================================================================
   ARCHIVE — chapter 14 in more depth (spec v49 ch.14): the verified quotation archive and recognition without glory.
     * QUOTATION ARCHIVE (data/quotes.json): each entry has a stable id, exact text, author, work, date, source,
       verification status, rights note, context and themes; a "never attribute" list carries the spec's
       misattribution safeguards. New entries need no code change. The ending uses the signature quotation
       (Hemingway, as the spec recommends) and picks others by theme (victory, defeat, ceasefire, peace).
     * AWARDS FOR RESTRAINT, PROTECTION AND SUPPORT: commendations that do not count kills — sorties flown without
       harm to civilians, sorties that protected friendly troops, recovery of a downed crew, technical service.
       Each award has eligibility, the evidence it rests on and a citation; an open inquiry holds every award back;
       awards never erase consequences (the service record keeps both).
     * CONSEQUENCE RECORD (summary): one view over the human, destruction and expenditure ledgers that already exist
       (census.js, cemetery.js, endscreen.js), with definitions and coverage notes next to the figures.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const A={q:[],never:[],ok:false};
async function load(){try{const r=await fetch('data/quotes.json');if(!r.ok)return;const j=await r.json();A.q=j.quotes||[];A.never=j.never||[];A.ok=true;merge();}catch(e){}}
function merge(){const E=W.endscreen;if(!E||!E.QUOTES)return;for(const x of A.q){if(E.QUOTES.some(y=>y.q===x.q))continue;E.QUOTES.push({q:x.q,a:x.a,w:x.w,d:x.d,s:x.src+(x.ver!=='VERIFIED'?' ('+x.ver.toLowerCase()+')':''),id:x.id,themes:x.themes});}
  const i=E.QUOTES.findIndex(y=>y.id&&A.q.find(z=>z.id===y.id&&z.sig));if(i>0){const s=E.QUOTES.splice(i,1)[0];E.QUOTES.unshift(s);}}
const byTheme=t=>A.q.filter(x=>(x.themes||[]).includes(t));
// the ending: a quotation by theme beside the signature one
function forEnding(kind){const t=/WIN|VICTORY/.test(kind)?'victory':/LOSE|CAPIT/.test(kind)?'defeat':/CEASE|ARMIST|FROZEN/.test(kind)?'ceasefire':'peace';const L=byTheme(t);return L[0]||A.q[0];}
function safe(text){return!A.never.some(n=>String(text).includes(n.q));}
/* ------------------------------------------------------------------ awards without a kill count */
const AW=[['PROTECT','Protection of Civilians Commendation','for ten sorties flown without harm to civilians','career record: no civilian-harm inquiry in ten sorties'],
  ['SUPPORT','Troops in Contact Commendation','for sorties flown in support of friendly troops under attack','sortie reports: ground targets engaged over a front your side was defending'],
  ['RECOVER','Recovery Commendation','for returning to duty after being shot down','rescue record and medical release'],
  ['RESTRAINT','Commendation for Restraint','for holding fire when identification was uncertain','weapons record: sorties with weapons carried but not released']];
if(W.lead&&W.lead.AWARDS)for(const a of AW)if(!W.lead.AWARDS.some(x=>x[0]===a[0]))W.lead.AWARDS.push([a[0],a[1],a[2]]);
if(W.listeners)W.listeners.push(e=>{if(!W.st||e.ty!=='SORTIE'||!W.lead)return;const s=W.st.lead,c=s&&s.career;if(!c)return;const WS=window.WSORTIE&&WSORTIE.WS;
  c.clean=(c.clean||0)+1;if((c.inq||[]).some(q=>q.st==='OPEN')){c.clean=0;return;}   // an open inquiry holds every award back
  const give=k=>{if(c.awards.some(a=>a[0]===k))return;const a=AW.find(x=>x[0]===k);c.awards.push([k,a[1],W.st.t]);c.hist.push([W.st.t,'awarded the '+a[1]+' '+a[2]+' (evidence: '+a[3]+')']);
    W.emit('AWARD',{e:[c.a3],txt:c.name+' receives the '+a[1]+' '+a[2]+'. Citation evidence: '+a[3]+'. The record of the war is unchanged by it.'});};
  if(c.clean>=10)give('PROTECT');if(WS&&WS.kills&&WS.kills.gnd>0&&W.st.fronts.some(f=>(f.a===c.a3||f.b===c.a3)&&f.posture&&/DEF/.test(f.posture[c.a3]||'')))give('SUPPORT');
  if(WS&&WS.lost&&c.sorties>1)give('RECOVER');if(WS&&WS.kills&&WS.kills.air===0&&WS.kills.gnd===0&&c.sorties>=3)give('RESTRAINT');});
/* ------------------------------------------------------------------ the QUOTATIONS / RECORD tab */
function tab(p){let h='<div style="color:#8a9a92;font-size:10px">The verified quotation archive (text and sources as recorded; rights to be reviewed before distribution). Never attributed: '+A.never.map(n=>'“'+esc(n.q)+'” ('+esc(n.why)+')').join('; ')+'.</div>';
  h+=A.q.map(x=>'<div style="margin:6px 0"><div>“'+esc(x.q)+'”</div><div style="font-size:10px;color:#9ab">— '+esc(x.a)+', <i>'+esc(x.w)+'</i>, '+esc(x.d)+' · '+esc(x.ver.toLowerCase())+' · '+esc(x.src)+'<br>'+esc(x.ctx)+'</div></div>').join('');
  const E=W.endscreen;if(W.st&&E&&E.ammoTotals){try{const t=E.ammoTotals();h+='<h4>THE RECORD SO FAR</h4><div style="font-size:10px">Fired, launched, hit and destroyed are counted separately; figures are the campaign\'s own ledgers, never estimates of real events.</div>'+Object.entries(t).slice(0,8).map(([k,v])=>'<div style="display:flex;justify-content:space-between"><span>'+esc(k)+'</span><b>'+esc(typeof v==='object'?JSON.stringify(v):v)+'</b></div>').join('');}catch(e){}}
  return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.QUOTES=tab;
load();
W.archive={A,load,merge,forEnding,byTheme,safe,AW,tab};
})();
