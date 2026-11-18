/* =====================================================================================================================
   CHRONICLE — chapters 02, 03 and 07 in more depth.
   CH.02 (shared entities, events, causality, accounting, history)
     * RELATIONSHIPS AS RECORDS: derived registry of who belongs to what (country → coalition, unit → country,
       person → office / unit, city → holder) with since-times; identity kept apart from location, allegiance, status.
     * COMMANDS VERSUS EVENTS: orders and decisions (commands) are logged separately from what happened (events); the
       outcome of a command links back to it.
     * CORRECTIONS AND REVERSALS: a reported claim that later proves wrong gets a correction record (never a silent edit).
     * INVARIANTS with severity and repair: counters that must hold (no negative strength, totals equal sums, every city
       has a holder); a violation is logged with severity; minor ones are repaired and reported.
     * YEARBOOK AND MULTI-PERSPECTIVE HISTORY: monthly summaries written from each side's view, and public memory of
       major events that fades or is disputed (plural memory).
     * LIVE COUNTERS: personnel strength and human status per side (serving, wounded, missing, captured, killed).
   CH.03 (geography, navigation): navigation sources per side (satellite, inertial, radio aids, map and compass) with a
     degraded state under jamming (infowar.js), data freshness, coverage tiers of country detail (honest coverage).
   CH.07 (information integrity, civilian resilience): population resilience to panic and misinformation in two
     separate dimensions (emotional resilience, information resilience); fear, grief, anger and confusion tracked
     apart; public alerts and their trust; support and recovery; responses to shocks such as an airliner shootdown;
     counterintelligence (insider-risk cases, abstract).
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));const bel=p=>W.bell?W.bell(p):!!p.side;const rn=()=>Math.random();const pct=x=>Math.round((x||0)*100)+'%';const r3=x=>Math.round(x*1000)/1000;
const S=()=>{const st=W.st;if(!st.chr)st.chr={rel:{},cmd:[],cor:[],inv:{log:[],rep:0},yb:[],mem:[],res:{},nav:{B:null,R:null},ci:0,seen:0};return st.chr;};
const CMD=/ORDER|DECISION|MOBILIZATION|PROCUREMENT|POLITICS/;const CLAIM=/REPORTED|CLAIMED/;
/* ------------------------------------------------------------------ relationships */
function rel(){const st=W.st,X=S(),R=X.rel;for(const p of Object.values(st.c)){const k='C:'+p.a3;const v=p.side?(p.side+':'+(p.al||'')):'NEUTRAL';if(!R[k]||R[k][0]!==v)R[k]=[v,st.t];}
  const C=Object.entries(st.cities||{}).slice(0,400);for(const[k,v]of C){const kk='T:'+k;if(!R[kk]||R[kk][0]!==v.h)R[kk]=[v.h,st.t];}}
/* ------------------------------------------------------------------ commands, corrections, memory (from the event stream) */
{const _e=W.emit;W.emit=function(ty,o){const r=_e.apply(this,arguments);try{const st=W.st;if(!st||!o)return r;const X=S();
  if(CMD.test(ty)){X.cmd.unshift([st.t,ty,String(o.txt||'').slice(0,90)]);if(X.cmd.length>40)X.cmd.length=40;}
  if(o.cf&&CLAIM.test(o.cf)&&rn()<.08){X.pend=X.pend||[];X.pend.push([st.t,String(o.txt||'').slice(0,80)]);if(X.pend.length>10)X.pend.shift();}
  if(/END|CEASEFIRE|CAPITUL|ARMISTICE|AIRLINER|CITY/.test(ty)&&o.txt&&X.mem.length<30)X.mem.push({t:st.t,txt:String(o.txt).slice(0,100),sal:1,B:'',R:''});}catch(e){}return r;};}
function corrections(){const X=S(),st=W.st;if(!X.pend||!X.pend.length)return;const c=X.pend[0];if(st.t-c[0]>24*5){X.pend.shift();if(rn()<.4){X.cor.unshift({t:st.t,of:c[0],txt:c[1],note:'later evidence does not support the claim; the record keeps both'});if(X.cor.length>20)X.cor.length=20;
  W.emit('CORRECTION',{txt:'Correction to an earlier report (day '+Math.floor(c[0]/24)+'): "'+c[1]+'…" — later evidence does not support it. The original stays in the record, marked as corrected.'});}}}
function memory(){const X=S();for(const m of X.mem){m.sal=r3(Math.max(.05,m.sal*.995));if(!m.B){m.B=pick(['remembered as a turning point','remembered as a costly mistake','a day of mourning']);m.R=pick(['remembered as a necessary step','called a provocation','rarely mentioned']);}}}
const pick=a=>a[Math.floor(rn()*a.length)];
/* ------------------------------------------------------------------ invariants */
function invariants(){const st=W.st,X=S().inv;const bad=[];for(const p of Object.values(st.c)){for(const k of['air','gnd','pop']){if(typeof p[k]==='number'&&p[k]<0){bad.push(['HIGH',p.a3+'.'+k+' negative']);p[k]=0;X.rep++;}}}
  for(const[k,v]of Object.entries(st.cities||{}))if(!st.c[v.h]){bad.push(['MEDIUM','city '+k.split('|')[0]+' held by an unknown country']);v.h=v.own;X.rep++;}
  for(const b of bad){X.log.unshift([st.t,b[0],b[1],'repaired']);}if(X.log.length>20)X.log.length=20;}
/* ------------------------------------------------------------------ yearbook */
function yearbook(){const st=W.st,X=S();const d=Math.floor(st.t/24);if(d<30||d%30)return;if(X.yb.length&&X.yb[0].d===d)return;
  const side=s=>Object.values(st.c).filter(p=>p.side===s);const sum=s=>side(s).reduce((t,p)=>t+(p.lostAir||0),0);const lostC=s=>Object.values(st.cities||{}).filter(v=>st.c[v.own]&&st.c[v.own].side===s&&v.h!==v.own).length;
  X.yb.unshift({d,B:'BLUEFOR view: '+lostC('B')+' of our cities under enemy control; '+Math.round(sum('B'))+' aircraft lost so far. "We hold."',R:'REDFOR view: '+lostC('R')+' of our cities under enemy control; '+Math.round(sum('R'))+' aircraft lost so far. "We advance where it matters."'});if(X.yb.length>12)X.yb.length=12;}
/* ------------------------------------------------------------------ navigation (ch.03) */
function nav(){const st=W.st,X=S();const iw=st.iw||{};for(const s of['B','R']){const jam=(iw.gps&&iw.gps[s])||(iw.jam&&iw.jam[s])||0;X.nav[s]={sat:r3(cl(1-jam,0,1)),ins:1,aids:r3(cl(.9-jam*.4,0,1)),map:1,fresh:Math.floor(st.t/24)%14,state:jam>.4?'DEGRADED':'NORMAL'};}}
/* ------------------------------------------------------------------ civilian resilience (ch.07) */
function res(p){const X=S();let R=X.res[p.a3];if(!R){const t=cl((p.life&&p.life.trust)||.6,0,1);R=X.res[p.a3]={emo:r3(.5+t*.3),info:r3(.4+t*.4),fear:.1,grief:0,anger:.05,conf:.1,alert:.8,sup:.3};}return R;}
function resStep(p){const st=W.st,war=bel(p)&&!st.over,R=res(p);const loss=(p.lostGnd||0)/Math.max(1,p.gnd0||1);
  R.fear=r3(cl(R.fear+(war?.004:-.006)-R.emo*.003,0,1));R.grief=r3(cl(R.grief+loss*.002-.001,0,1));R.anger=r3(cl(R.anger+(war?.002:-.004),0,1));R.conf=r3(cl(R.conf+(st.iw&&st.iw.prop?.003:0)-R.info*.004+(war?.001:0),0,1));
  R.sup=r3(cl(R.sup+((p.life&&p.life.svc&&p.life.svc.health)||.8)*.002-.001,0,1));R.emo=r3(cl(R.emo+R.sup*.0006-R.fear*.0005,.1,1));R.info=r3(cl(R.info+.0004-(R.conf>.4?.001:0),.1,1));R.alert=r3(cl(R.alert-(st.iw&&st.iw.falseN?.0:0)+.0002,.2,1));}
{const _e=W.emit;W.emit=function(ty,o){const r=_e.apply(this,arguments);try{if(W.st&&ty==='AIRLINER'||(o&&/airliner/i.test(o.txt||'')&&/shot down|downed/i.test(o.txt||''))){for(const a3 of(o.e||[])){const p=W.st.c[a3];if(!p)continue;const R=res(p);R.grief=r3(cl(R.grief+.1,0,1));R.anger=r3(cl(R.anger+.08,0,1));R.conf=r3(cl(R.conf+.05,0,1));}}
  if(W.st&&o&&/false (missile|nuclear)? ?alarm|alert was false/i.test(o.txt||''))for(const p of Object.values(W.st.c)){const R=W.st.chr&&W.st.chr.res[p.a3];if(R)R.alert=r3(cl(R.alert-.1,0,1));}}catch(e){}return r;};}
function ci(){const st=W.st,X=S();if(rn()<.004&&st.fronts.some(f=>!f.cf)){X.ci++;W.emit('SECURITY',{txt:'Counterintelligence opens an insider-risk case at a defence ministry (fictional): access is suspended while it is reviewed; most such cases close without charges.'});}}
/* ------------------------------------------------------------------ daily */
function daily(){const st=W.st;if(!st)return;try{rel();corrections();memory();invariants();yearbook();nav();ci();for(const p of Object.values(st.c))if(p.pop&&bel(p))resStep(p);}catch(e){console.warn('[chronicle]',e);}}
W.daily.push(daily);
function counters(){const st=W.st,o={};for(const s of['B','R']){const L=Object.values(st.c).filter(p=>p.side===s);const m=st.mil||{};const dl=st.dl?st.dl.ev:[];
  const by=(k,stt)=>dl.filter(e=>{const p=st.c[e.a3];return p&&p.side===s&&(e.kind||'MIL')===k&&(e.st||'KILLED')===stt;}).reduce((t,e)=>t+(e.n||1),0);
  o[s]={serving:Math.round(L.reduce((t,p)=>t+(p.gnd||0)*4000+(p.air||0)*1.3,0)),called:L.reduce((t,p)=>t+((m[p.a3]&&m[p.a3].called)||0),0),killed:by('MIL','KILLED'),missing:by('MIL','MISSING'),captured:by('MIL','CAPTURED')};}return o;}
const row=(a,b)=>'<div style="display:flex;justify-content:space-between;gap:8px"><span>'+a+'</span><b>'+b+'</b></div>';
function tab(p){const st=W.st;if(!st)return'<div>No war running.</div>';const X=S();const C=counters();
  let h='<h4>LIVE COUNTERS</h4>'+['B','R'].map(s=>row(s==='B'?'BLUEFOR':'REDFOR','serving ~'+C[s].serving+' · called up '+C[s].called+' · killed '+C[s].killed+' · missing '+C[s].missing+' · captured '+C[s].captured)).join('')+'<div style="font-size:10px">Killed / missing / captured are counted from resolved records (cemetery ledger); serving is an estimate from brigades and crews.</div>';
  h+='<h4>YEARBOOK (EACH SIDE\'S VIEW)</h4>'+(X.yb.map(y=>'<div style="font-size:10px">day '+y.d+'<br>'+esc(y.B)+'<br>'+esc(y.R)+'</div>').join('')||'<div>first entry after a month</div>');
  h+='<h4>PUBLIC MEMORY</h4>'+(X.mem.slice(-6).map(m=>'<div style="font-size:10px">'+esc(m.txt)+' — BLUEFOR: '+m.B+'; REDFOR: '+m.R+' · salience '+pct(m.sal)+'</div>').join('')||'<div>none yet</div>');
  h+='<h4>COMMANDS (ORDERS AND DECISIONS)</h4>'+X.cmd.slice(0,6).map(c=>'<div style="font-size:10px">day '+Math.floor(c[0]/24)+' · '+c[1].toLowerCase()+' · '+esc(c[2])+'</div>').join('');
  h+='<h4>CORRECTIONS</h4>'+(X.cor.slice(0,5).map(c=>'<div style="font-size:10px">day '+Math.floor(c.t/24)+': “'+esc(c.txt)+'…” — '+c.note+'</div>').join('')||'<div>none</div>');
  h+='<h4>INTEGRITY</h4>'+row('invariant violations repaired',X.inv.rep)+X.inv.log.slice(0,4).map(l=>'<div style="font-size:10px">'+l[1]+': '+esc(l[2])+' ('+l[3]+')</div>').join('')+row('relationship records',Object.keys(X.rel).length);
  const N=X.nav[p.side||'B'];if(N)h+='<h4>NAVIGATION ('+(p.side==='R'?'REDFOR':'BLUEFOR')+')</h4>'+row('satellite · inertial · radio aids · map',pct(N.sat)+' · '+pct(N.ins)+' · '+pct(N.aids)+' · '+pct(N.map))+row('state · navigation data age',N.state.toLowerCase()+' · '+N.fresh+' days');
  if(bel(p)){const R=res(p);h+='<h4>CIVILIAN RESILIENCE</h4>'+row('emotional resilience · information resilience',pct(R.emo)+' · '+pct(R.info))+row('fear · grief · anger · confusion',pct(R.fear)+' · '+pct(R.grief)+' · '+pct(R.anger)+' · '+pct(R.conf))+row('trust in public alerts · support networks',pct(R.alert)+' · '+pct(R.sup));}
  h+=row('counterintelligence cases',X.ci);return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.CHRONICLE=tab;
W.chronicle={S,daily,tab,counters,res};
})();
