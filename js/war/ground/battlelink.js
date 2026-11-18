/* =====================================================================================================================
   BATTLELINK — the ground battle feeds the whole campaign (v418). infantry.js hands its result here at the end (and logs a BATTLE event);
   the rest of the war answers it, using the spec's chapters:
     * MEDIA (ch.10): each outlet reports by its lean; the enemy claims more than happened (marked CLAIMED).
     * FAMILIES (ch.08): the families of the squad's dead are notified — by name, fictional, nothing invented beyond that.
     * HEALTH (ch.08): the wounded raise hospital load in the home country.
     * POLITY (ch.07): heavy losses or harm to civilians bring protests and questions in parliament.
     * SERVICE RECORD: your own infantry record — battles, wounds, citations, inquiries — with promotions by merit.
   Civilians are never targets; a civilian harmed by the player's fire is always an inquiry, never a reward.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rn=()=>Math.random(),pk=a=>a[Math.floor(rn()*a.length)],cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const RK=['Private','Corporal','Sergeant','Staff Sergeant','Lieutenant','Captain'];
const X=()=>{const st=W.st;return st.bl2||(st.bl2={rec:{},log:[]});};
function rec(a3){const B=X();return B.rec[a3]||(B.rec[a3]={b:0,won:0,wnd:0,kills:0,cit:[],inq:0,rk:0,civ:0});}
const WIN=/WON|HELD|BREAK/;
function onBattle(e){const b=e&&e.battle;if(!b||!W.st)return;const st=W.st,p=st.c[b.a3],en=b.en&&st.c[b.en];if(!p)return;const won=WIN.test(b.res);
  const B=X();B.log.unshift({t:st.t,...b});B.log.length=Math.min(B.log.length,30);
  // media by lean, enemy claim
  const fr=(won?'holds at ':'pulls back from ')+b.place;
  W.emit('MEDIA',{e:[b.a3],txt:'State-aligned press: "Our soldiers '+(won?'stand firm':'regroup in good order')+' at '+b.place+'." Independent outlets: '+b.lost+' of ours reported lost as the line '+fr+'.'});
  if(en)W.emit('MEDIA',{e:[b.en],cf:'CLAIMED',txt:en.n+' claims '+Math.round((b.lost+3)*(1.5+rn()*2))+' enemy soldiers killed at '+b.place+' (CLAIMED, not verified).'});
  // families
  for(const n of(b.names||[]).slice(0,6))W.emit('FAMILY',{e:[b.a3],txt:'The family of '+n+' in '+p.n+' is notified: killed in action at '+b.place+'. The unit chaplain and a casualty officer visit.'});
  // hospitals
  const wia=(b.wia||0)+(b.hp<=0?1:0);if(wia&&p.life&&p.life.health)p.life.health.load=cl((p.life.health.load||0)+wia*.004,0,1);
  // polity: losses and civilian harm
  if(b.lost>=8||b.civ){const I=st.pol2&&st.pol2.inv;if(I)I.prot=(I.prot||0)+1;W.emit('PROTEST',{e:[b.a3],txt:b.civ?'Questions in '+p.n+'\'s parliament after civilians were harmed in the battle for '+b.place+'. The defence ministry promises an inquiry.':'Families gather outside the defence ministry in '+p.n+' after heavy losses at '+b.place+'.'});}
  // your service record
  const R=rec(b.a3);R.b++;if(won)R.won++;R.kills+=b.kills||0;if(b.hp<=0||/EVAC/.test(b.res))R.wnd++;
  const cite=t=>{R.cit.push([st.t,t,b.place]);W.emit('AWARD',{e:[b.a3],txt:'You are cited: '+t+' ('+b.place+').'});};
  if(R.b===1)cite('first action');if(/EVAC/.test(b.res))cite('wounded in action');if(b.res==='BREAK')cite('courage under fire — the breakthrough');
  if(b.civ){R.civ+=b.civ;R.inq++;}else if(won&&b.kills>0&&R.b%3===0)cite('fire discipline — no civilian harm in three actions');
  const want=Math.min(RK.length-1,Math.floor((R.won*2+R.cit.length)/5)-(R.inq?1:0));if(want>R.rk){R.rk=want;W.emit('AWARD',{e:[b.a3],txt:'You are promoted to '+RK[R.rk]+'.'});}}
function tab(p){if(!W.st)return'<div>No war running.</div>';const R=rec(p.a3),B=X();
  let h='<div style="color:#8a9a92;font-size:10px">Your infantry service. Civilian harm is always an inquiry.</div><h4>SERVICE RECORD · '+RK[R.rk]+'</h4>';
  h+='<div>battles '+R.b+' · won or held '+R.won+' · wounded '+R.wnd+' · inquiries '+R.inq+'</div>';
  h+='<h4>CITATIONS</h4>'+(R.cit.slice(-8).map(c=>'<div style="font-size:10px">day '+Math.floor(c[0]/24)+' · '+esc(c[1])+' · '+esc(c[2])+'</div>').join('')||'<div>—</div>');
  h+='<h4>BATTLES</h4>'+(B.log.filter(x=>x.a3===p.a3).slice(0,8).map(x=>'<div style="font-size:10px">day '+Math.floor(x.t/24)+' · '+esc(x.place)+' · '+esc(x.res.toLowerCase())+' · lost '+x.lost+(x.civ?' · civilian harm':'')+'</div>').join('')||'<div>—</div>');return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.SERVICE=tab;
W.battlelink={onBattle,rec,tab};
})();
