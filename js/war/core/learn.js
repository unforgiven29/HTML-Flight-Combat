/* =====================================================================================================================
   v360 — AI that learns over the war (spec v49 ch.15 AI personality, doctrine, learning and military adaptation;
   lessons identified and adaptation over time; differences between countries and commanders).
   * ATTACK DOCTRINE per country: each headquarters order to ATTACK is scored after 10 war days by kilometres gained per
     brigade-strength lost on that front. Attacks that paid raise the confidence to attack (the force ratio needed falls
     toward 1.1); attacks that bled the force for nothing raise it (toward 1.6). Defensive stands that held lower the
     ratio at which a country chooses to DEFEND. Each adaptation is an event with its reason (a lesson identified).
   * COMMANDER STYLE: each theatre commander drifts toward BOLD or CAUTIOUS with their own record; the style changes the
     attack threshold a little more (x0.95 / x1.05) and shows in the MILITARY and AI LOG views.
   * PILOTS LEARN: a country's AI pilots in world sorties fly with skill that grows with its air force's experience
     (military.js) and with the kills its pilots have scored against you and your side (up to +1 skill level), and
     falls when its experienced crews are lost.
   * AIR TASKING LEARNS: a side that loses aircraft faster than the other for a month shifts its tasking toward
     defensive counter-air (ops.js shares) and says why.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.mil)return;
const W=WWAR,rn=Math.random;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const LS=()=>W.st.learn||(W.st.learn={pend:[],kills:{},seen:{},month:{}});
// record every ATTACK / DEFEND order when it takes effect, score it 10 days later
W.listeners.push(e=>{if(!W.st||e.ty!=='ORDERS')return;const a3=(e.e||[])[0],m=W.st.mil&&W.st.mil[a3];if(!m)return;const st=W.st;
  for(const f of st.fronts){if(f.a!==a3&&f.b!==a3)continue;const i=m.intent[f.id];if(i!=='ATTACK'&&i!=='DEFEND')continue;if(LS().pend.some(q=>q.a3===a3&&q.f===f.id))continue;
    const avg=f.sec.reduce((t,s)=>t+s.off,0)/f.sec.length,p=st.c[a3];LS().pend.push({a3,f:f.id,i,t:st.t,off:avg*(f.a===a3?1:-1),gnd:p.lostGnd});}});
function score(){const st=W.st,L=LS();
  for(let k=L.pend.length-1;k>=0;k--){const q=L.pend[k];if(st.t-q.t<24*10)continue;L.pend.splice(k,1);const f=st.fronts.find(x=>x.id===q.f),p=st.c[q.a3],m=st.mil&&st.mil[q.a3];if(!f||!p||!m)continue;
    const avg=f.sec.reduce((t,s)=>t+s.off,0)/f.sec.length*(f.a===q.a3?1:-1),km=avg-q.off,lost=Math.max(.05,p.lostGnd-q.gnd);const hq=m.hq;
    if(q.i==='ATTACK'){const pay=km/lost;const was=m.atkT||1.25;if(pay>15){m.atkT=cl(was-.03,1.1,1.6);if(hq)hq.style=cl((hq.style||0)+.1,-1,1);}else if(pay<3){m.atkT=cl(was+.04,1.1,1.6);if(hq)hq.style=cl((hq.style||0)-.1,-1,1);}
      if(Math.abs((m.atkT||1.25)-was)>.001)W.emit('LESSONS',{e:[q.a3],txt:p.n+'\'s staff review the last attack on the front with '+st.c[f.a===q.a3?f.b:f.a].n+': '+km.toFixed(0)+' km for '+lost.toFixed(1)+' brigade-strength lost. '+(m.atkT<was?'They will attack sooner where they hold the advantage.':'They will wait for a larger advantage before attacking again.')});}
    else{const held=km>-3;const was=m.defT||.8;m.defT=cl(was+(held?-.02:.03),.6,.95);}}
  // commander style shifts the threshold a little
  for(const m of Object.values(st.mil||{})){if(!m.hq)continue;const s=m.hq.style||0;m.atkT=cl((m.atkT||1.25)*(1-s*.002),1.1,1.6);}}
// air tasking adapts after a bad month (ops.js reads the bias)
function airMonth(){const st=W.st,L=LS();if(Math.floor(st.t/24)%30!==0)return;for(const s of['B','R']){const loss=Object.values(st.c).filter(p=>p.side===s).reduce((t,p)=>t+p.lostAir,0),prev=L.month[s]??loss;L.month[s+'d']=loss-prev;L.month[s]=loss;}
  const b=L.month.Bd||0,r=L.month.Rd||0;for(const[s,mine,theirs]of[['B',b,r],['R',r,b]]){const o=W.st.ops;if(!o)continue;o.bias=o.bias||{};const was=o.bias[s]||0;o.bias[s]=mine>theirs*1.4?Math.min(.15,was+.05):Math.max(0,was-.03);
    if(o.bias[s]>was)W.emit('LESSONS',{txt:(s==='B'?'BLUEFOR':'REDFOR')+' lost '+Math.round(mine)+' aircraft this month against '+Math.round(theirs)+': its air staffs shift more sorties to defensive counter-air.'});}}
if(W.ops){const _a=W.ops.ato;W.ops.ato=function(){const r=_a.apply(this,arguments);const o=W.st.ops;if(o&&o.bias)for(const[k,a]of Object.entries(o.ato)){const s=k.split(':')[1],b=o.bias[s]||0;if(!b)continue;a.dca=Math.min(.75,a.dca+b);a.cas=Math.max(.05,a.cas-b/2);a.oca=Math.max(.03,a.oca-b/2);}return r;};}
// pilots learn
function skillAdj(a3){const m=W.st&&W.st.mil&&W.st.mil[a3];if(!m)return 0;const k=(LS().kills[a3]||0);return cl((m.exp-.6)*2+Math.min(.5,k*.05),-.5,1);}
if(typeof Jet!=='undefined'){const _k=Jet.prototype.kill;Jet.prototype.kill=function(why,src){const was=this.alive;const r=_k.apply(this,arguments);if(was&&!this.alive&&W.st&&src&&src._ws&&src!==this&&window.WSORTIE&&WSORTIE.WS.on){const L=LS();L.kills[src._ws]=(L.kills[src._ws]||0)+1;}return r;};}
W.daily.push(()=>{if(W.st&&!W.st.over){score();airMonth();}});
if(window.NATPANEL&&NATPANEL.tabs&&NATPANEL.tabs.MILITARY){const _t=NATPANEL.tabs.MILITARY;NATPANEL.tabs.MILITARY=p=>{const m=W.st.mil&&W.st.mil[p.a3];let h=_t(p);if(!m)return h;const s=m.hq&&m.hq.style||0;
  return h+'<h4>DOCTRINE (LEARNED)</h4><div class="row"><span>Force ratio needed to attack</span><b>'+(m.atkT||1.25).toFixed(2)+'</b></div><div class="row"><span>Ratio at which it defends</span><b>'+(m.defT||.8).toFixed(2)+'</b></div><div class="row"><span>Commander\'s style</span><b>'+(s>.2?'bold':s<-.2?'cautious':'balanced')+'</b></div><div class="row"><span>AI pilot skill adjustment</span><b>'+(skillAdj(p.a3)>=0?'+':'')+skillAdj(p.a3).toFixed(2)+'</b></div>';};}
W.learn={LS,score,skillAdj,airMonth};
})();
