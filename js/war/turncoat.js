/* =====================================================================================================================
   v376 — owner requests:
   * AIRLINERS CAN BE SHOT DOWN. Your rounds and missiles hit airliners in world flight; it is recorded as an attack on
     civilians (a potential war crime, justice.js opens a case) and costs your side legitimacy. Some governments use it
     as terror: a belligerent with a ruthless regime may down an airliner to spread fear; the event is reported, the
     dead are counted in the census as civilians, and the world turns against that side.
   * FRIENDLY FIRE: your missiles can hit a friendly you locked; your guns already hit what they hit. A friendly kill is
     logged (fratricide) and your squadron's trust drops.
   * PRIVATE MILITARY COMPANIES (fictional names) that fight: hired by a rich belligerent, they add aircraft or
     ground combat strength; unpaid or outbid, they walk out or change employer.
   * COUNTRIES SWITCH SIDES mid war: a junior ally facing defeat, with a pragmatic leader, may defect to the other side
     (fronts rebuilt). Joining mid war already happens through diplomacy.js.
   * PRODUCTION LEDGER: daily air and ground vehicle output by type (aircraft and armoured vehicles named from the
     country's equipment table), shown in the PRODUCTION tab.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;const rn=()=>Math.random(),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const S=()=>{const st=W.st;st.tc=st.tc||{pmc:[],seq:1,prod:{},sw:[],terror:[],ff:0,civAir:0};return st.tc;};
const bel=p=>W.bell?W.bell(p):!!p.side;const sn=s=>s==='B'?'BLUEFOR':'REDFOR';
const hash=s=>{let h=7;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h;};
// a stable regime trait: how ruthless / how pragmatic a government is (politics data where present)
const trait=(p,k)=>{const P=W.pol&&W.pol[p.a3];if(P&&P[k]!=null)return P[k];return(hash(p.a3+k)%100)/100;};

/* ------------------------------------------------------------------ airliners: shootable */
const T=window.TRAFFIC;
if(T&&typeof bullets!=='undefined'){const _v=new THREE.Vector3();
  function down(r,by){const st=W.st,pax=r.d>600e3?(180+((rn()*200)|0)):(90+((rn()*90)|0));if(typeof explode==='function')explode(r.m.position.clone(),true);scene.remove(r.m);T.list.splice(T.list.indexOf(r),1);
    if(typeof flash==='function')flash('CIVILIAN AIRLINER DOWN · '+r.name.toUpperCase(),5000);
    if(st){const s=S();s.civAir++;const side=typeof player!=='undefined'&&player&&player.side===1?'R':'B';
      W.emit('CIVHARM',{txt:'Attack on a civilian area: airliner '+r.name+' shot down, '+pax+' on board, by '+(by==='player'?'you, flying for ':'')+sn(side)+'.',dead:pax});
}}
  const _t=T.spawn;setInterval(()=>{if(!T.list.length)return;for(const r of T.list.slice()){if(!r.m.visible)continue;const p=r.m.position;
    for(const b of bullets){if(b.o!==player)continue;if(b.p.distanceToSquared(p)<1600){down(r,'player');break;}}
    if(!T.list.includes(r))continue;for(const m of missiles){if(!m.alive||m.sh!==player)continue;if(m.pos.distanceToSquared(p)<900){m.alive=false;down(r,'player');break;}}}},33);
  T.down=down;}

/* ------------------------------------------------------------------ terror shootdowns by governments */
function terror(){const st=W.st,s=S();for(const p of Object.values(st.c)){if(!bel(p)||p.al!=='CORE')continue;if(trait(p,'ruthless')<.8||rn()>.004)continue;
  const pax=100+((rn()*250)|0);s.terror.push({a3:p.a3,t:st.t,pax});
  W.emit('CIVHARM',{e:[p.a3],txt:'Attack on a civilian area: a civilian airliner shot down over the war zone; the '+p.n+' government is blamed for using it to spread fear. '+pax+' on board. Attributed to '+sn(p.side)+'.',dead:pax});
  // the world reacts: neutrals lean to the other side, the culprit's allies waver
  for(const q of Object.values(st.c)){if(q.al==='NEUTRAL'||q.al==='UNDECIDED'){q.inc=q.inc||{};const o=p.side==='B'?'R':'B';q.inc[o]=(q.inc[o]||0)+.5;}if(q.side===p.side&&q.al==='ALLY')q.exh=Math.min(1,q.exh+.02);}}}

/* ------------------------------------------------------------------ friendly fire */
if(typeof Jet!=='undefined'&&Jet.prototype&&Jet.prototype.kill){const _k=Jet.prototype.kill;Jet.prototype.kill=function(why,src){const by=this.alive?(src||this.lastHitBy):null;
  try{if(by===player&&this!==player&&this.side===player.side&&!this.remote){const s=W.st&&S();if(s)s.ff++;if(typeof flash==='function')flash('FRATRICIDE · YOU SHOT DOWN A FRIENDLY '+(this.type||''),5000);
    if(W.st)W.emit('FRATRICIDE',{txt:'Friendly fire: a '+(this.type||'friendly aircraft')+' shot down by its own side (you).'});
    const R=W.st&&W.st.frc&&W.st.frc.roster;if(R)for(const q of R.ppl)q.trust=Math.max(0,q.trust-.15);}}catch(e){}
  return _k.apply(this,arguments);};}

/* ------------------------------------------------------------------ combat PMCs */
const PN=['Greywater','Valkan','Northmark','Argent Spear','Iron Meridian','Blackthorn','Sable Vector','Corsair Group','Halcyon Arms','Redline'];
function pmc(){const st=W.st,s=S();
  for(const c of s.pmc){if(c.st!=='HIRED')continue;const p=st.c[c.a3];
    if(!p||!bel(p)){c.st='RELEASED';W.emit('PMC',{txt:c.n+' (PMC, fictional) leaves '+(p?p.n:c.a3)+': its employer is out of the war.'});continue;}
    // pay from GDP; poor or exhausted employers get outbid
    const rival=Object.values(st.c).filter(q=>bel(q)&&q.side!==p.side&&q.gdp>p.gdp*1.5);
    if((p.exh>.6&&rn()<.05)||(rival.length&&rn()<.01)){const q=rival.length?rival[(rn()*rival.length)|0]:null;
      if(q){W.emit('PMC',{e:[q.a3],txt:c.n+' (PMC) changes employer: it walks out on '+p.n+' and signs with '+q.n+' ('+sn(q.side)+').'});p[c.k]=Math.max(0,p[c.k]-c.str);c.a3=q.a3;q[c.k]+=c.str;}
      else{c.st='WALKED OUT';p[c.k]=Math.max(0,p[c.k]-c.str);W.emit('PMC',{e:[p.a3],txt:c.n+' (PMC) walks out on '+p.n+': unpaid.'});}}}
  if(rn()>.02||s.pmc.filter(c=>c.st==='HIRED').length>=8)return;const L=Object.values(st.c).filter(q=>bel(q)&&q.gdp>2e5);if(!L.length)return;const p=L[(rn()*L.length)|0];
  const k=rn()<.35?'air':'gnd',str=Math.max(1,Math.round(p[k]*(.03+rn()*.05))),c={id:'P'+(s.seq++),n:PN[(rn()*PN.length)|0]+(rn()<.5?' Security':' Tactical'),a3:p.a3,k,str,t:st.t,st:'HIRED'};
  s.pmc.push(c);p[k]+=str;W.emit('PMC',{e:[p.a3],txt:p.n+' hires '+c.n+' (PMC, fictional): '+str+' '+(k==='air'?'combat aircraft with contract pilots':'ground combat units')+'.'});}

/* ------------------------------------------------------------------ switching sides */
function switchSides(){const st=W.st,s=S();for(const p of Object.values(st.c)){if(p.al!=='ALLY'||!p.side||p.cap)continue;
  if(p.exh<.45||trait(p,'pragmatic')<.6||rn()>.003)continue;const old=p.side,nw=old==='B'?'R':'B';
  // switch only when the other side is winning
  const pw=x=>Object.values(st.c).filter(q=>q.side===x).reduce((t,q)=>t+q.air+q.gnd,0);if(pw(nw)<pw(old)*1.1)continue;
  s.sw.push({a3:p.a3,t:st.t,from:old,to:nw});W.setAl(p,'ALLY',nw,'switches sides: exhausted ('+Math.round(p.exh*100)+' %) and betting on the stronger coalition');p.exh*=.6;
  W.emit('DEFECTION',{e:[p.a3],txt:p.n+' switches sides mid war: it leaves '+sn(old)+' and joins '+sn(nw)+'.'});W.rebuild();}}

/* ------------------------------------------------------------------ production ledger */
const eq=a3=>{const E=window.NATDATA&&NATDATA.EQ&&NATDATA.EQ[a3];return E||null;};const spl=v=>v?String(v).split(/,\s*/):[];
function prod(){const st=W.st,s=S(),day=Math.floor(st.t/24);for(const p of Object.values(st.c)){if(!bel(p))continue;const r=s.prod[p.a3]=s.prod[p.a3]||{air:{},gnd:{},la:p.air,lg:p.gnd,tot:{air:0,gnd:0}};
  const da=Math.max(0,p.air-r.la),dg=Math.max(0,p.gnd-r.lg);r.la=p.air;r.lg=p.gnd;const E=eq(p.a3);
  let A=E?[...spl(E.FTR4),...spl(E.FTR5),...spl(E.ATK)]:[],Gv=E?[...spl(E.MBT),...spl(E.IFV),...spl(E.APC),...spl(E.SPG)]:[];if(!A.length)A=['combat aircraft'];if(!Gv.length)Gv=['armoured vehicles'];
  const air=Math.round(da),veh=Math.round(dg*12);
  if(air){const n=A[day%A.length];r.air[n]=(r.air[n]||0)+air;r.tot.air+=air;}if(veh){const n=Gv[day%Gv.length];r.gnd[n]=(r.gnd[n]||0)+veh;r.tot.gnd+=veh;}}}

W.daily.push(()=>{if(!W.st||W.st.over)return;try{terror();pmc();switchSides();prod();}catch(e){console.warn('[turncoat]',e);}});

if(window.NATPANEL&&NATPANEL.tabs){NATPANEL.tabs.PRODUCTION=p=>{const st=W.st;if(!st)return'<div>No war running.</div>';const s=S(),r=s.prod[p.a3];
  const row=(a,b)=>'<div style="display:flex;justify-content:space-between"><span>'+esc(a)+'</span><b>'+b+'</b></div>';let h='<h4>PRODUCTION SINCE THE WAR BEGAN</h4>';
  if(!r)h+='<div style="color:#8a9a92">Not at war: no wartime production recorded.</div>';else{h+=row('Aircraft delivered',r.tot.air)+row('Ground vehicles delivered',r.tot.gnd);
    h+='<h4>AIRCRAFT BY TYPE</h4>'+(Object.entries(r.air).map(([k,v])=>row(k,v)).join('')||'<div>none yet</div>');h+='<h4>GROUND VEHICLES BY TYPE</h4>'+(Object.entries(r.gnd).map(([k,v])=>row(k,v)).join('')||'<div>none yet</div>');}
  const C=s.pmc.filter(c=>c.a3===p.a3);if(C.length)h+='<h4>PRIVATE MILITARY COMPANIES (FICTIONAL)</h4>'+C.map(c=>row(c.n+' · '+c.st,c.str+(c.k==='air'?' aircraft':' units'))).join('');
  const sw=s.sw.filter(x=>x.a3===p.a3);if(sw.length)h+='<h4>CHANGED SIDES</h4>'+sw.map(x=>row('Day '+Math.floor(x.t/24),sn(x.from)+' → '+sn(x.to))).join('');
  h+='<h4>WAR TOTALS</h4>'+row('Airliners shot down by you',s.civAir)+row('Terror shootdowns by governments',s.terror.length)+row('Friendly aircraft you shot down',s.ff);return h;};}
window.TURNCOAT={S,trait,terror,pmc,switchSides,prod,v:376};
})();
