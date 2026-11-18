/* =====================================================================================================================
   v392 — the information war (spec v49 ch.07: electronic warfare and emission behaviour, communications and command
   networks, intelligence / deception, camouflage / decoys, information integrity, propaganda and disinformation, panic
   and resilience, public alerts). Campaign level, abstract and gameplay-level; no methods are described.
   * RADIO SECURITY AND SIGNALS INTELLIGENCE: each side has a crypto level (tier, economy, network health) and a signals-
     intelligence capacity (EW capacity from intel.js). When one side's capacity beats the other's crypto it READS the
     other's radio: intercepts appear in the war diary (INTERCEPT), warn of the other's attacks a day ahead (the defender
     on that front gets x1.05) and leak into battles (infantry.js: what you call over the radio may be heard; you may
     hear theirs). A side that learns it is read moves to secure traffic for a while (orders slower).
   * JAMMING: per side and front, radio and satellite-navigation jamming levels from EW capacity: slower orders, guided
     weapons and drones less reliable on that side of the line (infantry.js reads W.infowar.jam(side)).
   * DECEPTION: decoys (inflatable armour, mock air-defence sites, dummy headquarters) and camouflage per side; the
     other side's estimates are inflated by decoys and strikes are sometimes wasted on them; camouflage hides real units
     from the other side's estimate; feints draw the other side's reserves to the wrong front. Exposure when the enemy's
     intelligence is good.
   * PROPAGANDA AND DISINFORMATION: each side's government and media issue claims (victories, enemy losses, allied
     defections, shortages, unsafe corridors) with an underlying truth status (TRUE, FALSE, MISLEADING, UNVERIFIED,
     DISPUTED, PARTLY SUPPORTED), a claimed and an actual origin, and an exposure; most false claims are corrected later
     (CORRECTION event). Effects are bounded: domestic morale (exhaustion x0.99 - x1.01), allied trust, neutrals' lean;
     a population's resilience (education, free media, prior corrections) blunts them. The claim is never the truth
     because it is repeated.
   * FALSE MISSILE ALARMS: rare public alerts of an incoming ballistic missile that turn out false (a warning-system
     fault, a misread exercise, or a hoax alert spread by disinformation), more likely when deterrence levels are high.
     Panic in the affected cities, a correction within hours, lower trust in alerts afterwards. Shown abstractly; an
     alarm does not by itself cause escalation (leaders verify through other channels).
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;const rn=()=>Math.random();const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SN=s=>s==='B'?'BLUEFOR':'REDFOR',OT=s=>s==='B'?'R':'B';
const IW=()=>{const st=W.st;if(!st.iw)st.iw={B:{crypto:.5,sig:.5,reads:0,secure:0,jam:0,gps:0,decoy:0,camo:0,trust:1,res:.6},R:{crypto:.5,sig:.5,reads:0,secure:0,jam:0,gps:0,decoy:0,camo:0,trust:1,res:.5},claims:[],alarms:[],seq:1,feint:null};return st.iw;};
const sideCountries=s=>Object.values(W.st.c).filter(p=>p.side===s&&(p.al==='CORE'||p.al==='ALLY'));
function capacity(s){const P=sideCountries(s);const g=P.reduce((t,p)=>t+(p.gdp||0),0),T=P.reduce((t,p)=>t+(p.mil&&p.mil.tier||0),0)/Math.max(1,P.length);return{g,T};}
// ------------------------------------------------------------------ daily
function daily(){const st=W.st;if(!st||st.over)return;const X=IW(),I=st.intel||{B:{ew:.5,net:1},R:{ew:.5,net:1}};const day=Math.floor(st.t/24);
  for(const s of['B','R']){const S=X[s],c=capacity(s),gB=capacity('B').g,gR=capacity('R').g,share=c.g/Math.max(1,gB+gR);
    S.crypto=Math.max(.2,Math.min(.95,.35+share*.5+(S.secure>0?.25:0)-((I[s]&&I[s].net!=null)?(1-I[s].net)*.2:0)));S.sig=Math.max(.2,Math.min(.95,.3+share*.5+((I[s]&&I[s].ew)||0)*.2));
    if(S.secure>0)S.secure--;S.jam=Math.max(0,S.jam*.8+(rn()<.15?.3+share*.4:0));S.gps=Math.max(0,S.gps*.8+(rn()<.1?.3+share*.3:0));
    // deception assets grow with the economy, are found by the other side's intelligence
    S.decoy=Math.max(0,Math.min(1,S.decoy+.02*share-(((st.intel&&st.intel[OT(s)]&&st.intel[OT(s)].q)||.5)*.015)));S.camo=Math.max(0,Math.min(1,S.camo+.015*share-.008));
    S.res=Math.max(.2,Math.min(.95,S.res+(X.claims.filter(k=>k.to===s&&k.corr&&k.t>st.t-24*14).length?.004:-.001)));}
  // who reads whom
  for(const s of['B','R']){const t=OT(s),S=X[s],T=X[t];const was=S.reads;S.reads=S.sig>T.crypto+.05&&rn()<.8?1:0;
    if(S.reads&&!was)W.emit('INTERCEPT',{cf:'REPORTED',txt:SN(s)+' signals intelligence is reading '+SN(t)+' radio traffic on parts of the front.'});
    if(S.reads&&rn()<.25){const f=W.st.fronts.filter(f=>!f.cf)[(rn()*W.st.fronts.filter(f=>!f.cf).length)|0];if(f){const A=st.c[f.a],B=st.c[f.b];const atk=A.side===t?A:B,def=atk===A?B:A;
        W.emit('INTERCEPT',{e:[def.a3],cf:'REPORTED',txt:'Intercepted '+SN(t)+' radio: '+atk.n+' is preparing an attack on the '+A.n+' – '+B.n+' front. '+def.n+' reinforces it in time.'});f.warn={side:def.side,until:st.t+30};}}
    if(S.reads&&rn()<.08){T.secure=6+((rn()*6)|0);W.emit('INTERCEPT',{cf:'REPORTED',txt:SN(t)+' suspects its radio is being read and moves to secure traffic; orders run slower for a few days.'});}}
  // deception events
  for(const s of['B','R']){const S=X[s],t=OT(s);
    if(S.decoy>.2&&rn()<.06*S.decoy){const f=sideCountries(s)[(rn()*sideCountries(s).length)|0];if(f)W.emit('DECEPTION',{e:[f.a3],cf:'ESTIMATED',txt:SN(t)+' strikes hit decoys near '+f.n+' (inflatable armour and mock air-defence sites): munitions spent, nothing destroyed.'});}
    if(S.decoy>.4&&!X.feint&&rn()<.03){const fr=W.st.fronts.filter(f=>!f.cf);const f=fr[(rn()*fr.length)|0];if(f){X.feint={side:s,f:f.id,until:st.t+72};W.emit('DECEPTION',{cf:'ESTIMATED',txt:'A '+SN(s)+' feint draws '+SN(t)+' reserves toward the '+st.c[f.a].n+' – '+st.c[f.b].n+' front.'});}}}
  if(X.feint&&st.t>X.feint.until)X.feint=null;
  // the other side's estimate of a country: decoys make it see more armour, camouflage hides some of what is there (intel.js error table)
  if(st.intel&&st.intel.err)for(const s of['B','R'])for(const p of sideCountries(s)){const e=st.intel.err[p.a3];if(e){e.gnd=Math.max(-.5,Math.min(.6,e.gnd+(X[s].decoy*.03-X[s].camo*.02)*rn()));}}
  // propaganda and disinformation
  for(const s of['B','R']){if(rn()<.3)propaganda(s);}
  for(const k of X.claims)if(!k.corr&&(k.truth==='FALSE'||k.truth==='MISLEADING')&&st.t-k.t>24*(2+rn()*6)&&rn()<.35){k.corr=st.t;W.emit('CORRECTION',{cf:'CONFIRMED',txt:'Correction: the claim "'+k.txt+'" ('+k.by+') is '+(k.truth==='FALSE'?'false':'misleading')+(k.truth==='FALSE'&&k.alleged?'; it was put out by '+SN(k.alleged)+' sources':'')+'.'});}
  if(X.claims.length>200)X.claims.splice(0,X.claims.length-200);
  // false missile alarms: rare, more likely when deterrence is high
  const lvl=(st.wx2&&st.wx2.det&&st.wx2.det.lvl)||1;if(rn()<.004*lvl)falseAlarm();
  for(const a of X.alarms)if(!a.done&&st.t>=a.t+a.dur){a.done=true;W.emit('ALERT',{e:[a.a3],cf:'CONFIRMED',txt:'All clear in '+a.city+': the missile alert was a false alarm ('+a.cause+'). Officials apologise; trust in public alerts falls.'});const S=X[a.side];if(S)S.trust=Math.max(.3,S.trust-.08);}}
// a claim with truth status, origin, exposure
const TEMPL={own:[['Our forces have taken key positions on the {front} front.','TRUE',.4],['Enemy losses on the {front} front are far heavier than ours.','MISLEADING',.4],['The enemy offensive near {city} has collapsed.','UNVERIFIED',.2]],
  enemy:[['{ally} is about to abandon the coalition.','FALSE',.5],['Fuel and food shortages loom in {city}.','MISLEADING',.3],['The evacuation corridor from {city} is no longer safe.','FALSE',.2],['The government has lost control of {city}.','FALSE',.2],['A forged ministry statement announces a general mobilisation.','FALSE',.15]]};
function propaganda(s){const st=W.st,X=IW(),P=sideCountries(s),E=sideCountries(OT(s));if(!P.length||!E.length)return;const own=rn()<.5,pool=own?TEMPL.own:TEMPL.enemy,[tx,truth]=pool[(rn()*pool.length)|0];
  const fr=st.fronts.filter(f=>!f.cf);const f=fr[(rn()*fr.length)|0];const tgt=own?P:E;const cp=tgt[(rn()*tgt.length)|0];const ally=E.filter(q=>q.al==='ALLY')[0]||E[0];
  const city=(st.city&&st.city[cp.a3]&&st.city[cp.a3][0]&&st.city[cp.a3][0].n)||cp.n;const txt=tx.replace('{front}',f?st.c[f.a].n+' – '+st.c[f.b].n:'eastern').replace('{city}',city).replace('{ally}',ally.n);
  const covert=!own&&rn()<.6;const by=covert?'anonymous accounts and a "local" news site':P[0].n+(own?' state media':' official channels');
  const k={id:X.seq++,t:st.t,side:s,to:own?s:OT(s),txt,truth,by,alleged:covert?s:null,exp:Math.round(10+rn()*90)};X.claims.push(k);
  W.emit(own?'PROPAGANDA':'DISINFO',{e:[cp.a3],cf:'CLAIMED',txt:'Claim ('+by+'): "'+txt+'" · status '+(truth==='TRUE'?'unverified at the time':'unverified')+'.'});
  // bounded effects, blunted by resilience
  const R=X[k.to].res;const eff=(1-R)*.01;if(!own){for(const q of E)q.exh=Math.min(1,(q.exh||0)+eff*(truth==='FALSE'?1:.5));if(/abandon/.test(txt))X[OT(s)].trust=Math.max(.4,X[OT(s)].trust-eff*2);}else for(const q of P)q.exh=Math.max(0,(q.exh||0)-eff*.5);}
function falseAlarm(){const st=W.st,X=IW();const nuc=Object.values(st.c).filter(p=>p.side&&(p.al==='CORE'||p.al==='ALLY'));if(!nuc.length)return;const p=nuc[(rn()*nuc.length)|0];
  const city=(st.city&&st.city[p.a3]&&st.city[p.a3][0]&&st.city[p.a3][0].n)||p.n;const cause=['a warning-system fault','an exercise message sent as real','a hoax alert spread by disinformation'][(rn()*3)|0];
  const a={a3:p.a3,side:p.side,city,cause,t:st.t,dur:1+rn()*3,done:false};X.alarms.push(a);if(X.alarms.length>30)X.alarms.shift();
  W.emit('ALERT',{e:[p.a3],cf:'REPORTED',txt:'Public alert in '+city+': incoming ballistic missile, take shelter. People crowd shelters and roads; phone networks overload.'});W.lastAlarm=a;}
W.daily.push(()=>{try{daily();}catch(e){console.warn('[infowar]',e);}});
// front power: a warned defender, a feint
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);if(!W.st||!W.st.iw||!f)return k;if(f.warn&&f.warn.until>W.st.t&&p.side===f.warn.side)k*=1.05;const F=W.st.iw.feint;if(F&&F.f!==f.id&&p.side!==F.side)k*=.98;return k;};}
// estimates: the other side sees decoys as strength and misses what is camouflaged

W.infowar={IW,jam:s=>{const X=W.st&&W.st.iw;return X?Math.min(1,X[OT(s)].jam):0;},gps:s=>{const X=W.st&&W.st.iw;return X?Math.min(1,X[OT(s)].gps):0;},
  readBy:s=>{const X=W.st&&W.st.iw;return X?!!X[OT(s)].reads:false;},reads:s=>{const X=W.st&&W.st.iw;return X?!!X[s].reads:false;},decoy:s=>{const X=W.st&&W.st.iw;return X?X[s].decoy:0;},daily,falseAlarm,propaganda};
// panel
function tab(p){const st=W.st;if(!st)return'<div>No war running.</div>';const X=IW(),s=p.side||'B',S=X[s],T=X[OT(s)];const row=(a,b)=>'<div style="display:flex;justify-content:space-between"><span>'+esc(a)+'</span><b>'+esc(b)+'</b></div>';
  let h='<h4>RADIO AND SIGNALS ('+SN(s)+')</h4>'+row('Radio security',Math.round(S.crypto*100)+' %'+(S.secure?' · secure traffic':''))+row('Signals intelligence',Math.round(S.sig*100)+' %')+row('We read their radio',S.reads?'yes, in part':'no')+row('They read ours',T.reads?'yes, in part (suspected)':'not known');
  h+='<h4>JAMMING</h4>'+row('Their radio jamming on our side',Math.round(T.jam*100)+' %')+row('Their navigation jamming',Math.round(T.gps*100)+' %');
  h+='<h4>DECEPTION</h4>'+row('Our decoys',Math.round(S.decoy*100)+' %')+row('Our camouflage',Math.round(S.camo*100)+' %')+(X.feint?row('Feint',X.feint.side===s?'ours, under way':'theirs (suspected)'):'');
  h+='<h4>INFORMATION</h4>'+row('Population resilience',Math.round(S.res*100)+' %')+row('Trust in public alerts',Math.round(S.trust*100)+' %');
  const C=X.claims.slice(-8).reverse();h+='<h4>RECENT CLAIMS</h4>'+(C.map(k=>'<div style="font-size:11px;margin:3px 0">'+esc(k.txt)+'<br><span style="color:#8a9a92">'+esc(k.by)+' · actual status '+k.truth+(k.corr?' · corrected':'')+'</span></div>').join('')||'<div>none yet</div>');
  const A=X.alarms.slice(-4).reverse();if(A.length)h+='<h4>MISSILE ALERTS</h4>'+A.map(a=>row(a.city,a.done?'false alarm ('+a.cause+')':'alert in force')).join('');
  return h+'<div style="font-size:10px;color:#8a9a92;margin-top:6px">Claims carry their actual status; repetition does not make them true. Abstract model.</div>';}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.INFOWAR=tab;
})();
