/* =====================================================================================================================
   v332 — population and households, media, and courts in the world war (spec v49 ch.08 population, households,
   employment, health; ch.09 media, justice and investigations; ch.02 "an event is not a report about an event").
   Aggregate (tier D). Every figure is an ESTIMATE from a stated rule, never a count of real people, and is labelled.

   POPULATION (p.soc), every country:
   * cohorts and household size from GDP per head (Natural Earth): children 16-40 %, elderly 5-20 %, household 2.4-4.5
     people (rule, interpolated); households = population / household size.
   * at war: people mobilised (each brigade-equivalent above the prewar estimate ~ 4,000 people), unemployment (from the
     economy index), hospital load (displacement, blackouts, food shortages), households displaced (displaced / size).
   MEDIA: every major event becomes reports, a few hours later, from three kinds of outlet: BLUEFOR media, REDFOR media
     and a neutral wire. The side that gained reports it as a gain; the side that lost first plays it down or disputes
     it (a CLAIM) and corrects itself about two days later (a CORRECTION); the neutral wire reports it as unverified,
     then confirmed. The event itself is never changed by what is reported about it.
   COURTS: every border incident and every city taken opens an investigation by international observers. Ten to forty
     days later: a finding (moderate confidence) or "inconclusive". A finding against a side lowers its coalition's
     cohesion and the investigation's record stays in the war's history.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,P=WWAR.diplo,G=WGEO;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const lerp=(a,b,t)=>a+(b-a)*Math.max(0,Math.min(1,t));
function soc(p){if(p.soc)return p.soc;const gpc=p.gdp*1e6/Math.max(1,p.pop),t=Math.log10(Math.max(500,gpc)/1000)/1.7;   // 0 at $1,000 per head, 1 at about $50,000
  const hh=lerp(4.5,2.4,t);return p.soc={child:lerp(.4,.16,t),old:lerp(.05,.2,t),hh,households:Math.round(p.pop/hh),mob:0,unemp:.05,hosp:.7,dispHH:0};}
function popDaily(){for(const p of Object.values(W.st.c)){const s=soc(p);if(!bel(p)&&!p.disp)continue;
  const work=p.pop*(1-s.child-s.old);s.mob=Math.round(Math.max(0,p.gnd0-(p.gnd00||(p.gnd00=p.gnd0)))*4000);   // extra brigades over the prewar estimate
  s.unemp=Math.min(.5,.05+(1-(p.econ??1))*.6);const e=p.ecn;
  s.hosp=Math.min(1.5,.7+(p.disp||0)/Math.max(1,p.pop)*4+(e?(1-e.energy)*.25+(1-e.food)*.3:0));s.dispHH=Math.round((p.disp||0)/s.hh);s.mobShare=s.mob/Math.max(1,work);}}
/* ------------------------------------------------------------------ media */
const KEEP=new Set(['CITY','CEASEFIRE','END','REGIME','INCIDENT','WITHDRAW','DIPLO','ALIGN','GOV','PARTIAL','DECISION','ECON','COURT','SEASON']);
function news(){const st=W.st;return st.soc||(st.soc={news:[],q:[],inv:[],leg:{B:1,R:1},seen:0});}
function frame(e,out){const st=W.st,txt=e.txt;
  if(e.ty==='CITY'){const[h,own]=e.e,hs=P.side(st.c[h])||(st.c[h]&&st.c[h].side),os=P.side(st.c[own])||(st.c[own]&&st.c[own].side),name=txt.split(' (')[0];
    if(out==='N')return[['REPORT','Unverified reports say '+txt.replace(/\.$/,'')+'.'],['CONFIRM',name+': control confirmed by satellite imagery and observers.',30]];
    if(out===hs)return[['REPORT',(h===own?'Our forces liberate ':'Our forces secure ')+name+'.']];
    if(out===os&&h!==own)return[['CLAIM','Heavy fighting continues around '+name+'; enemy claims of its fall are propaganda.'],['CORRECTION','The ministry acknowledges that our forces have withdrawn from '+name+'.',48]];
    return null;}
  if(e.ty==='INCIDENT')return out==='N'?[['REPORT',txt]]:[['REPORT',out==='B'?'Fighting near a neutral border: '+txt.replace(/^Border incident: /,''):'Western media report an incident; '+txt.replace(/^Border incident: /,'')]];
  if(out==='N')return[['REPORT',txt]];
  // a side's media carries official news about its own countries
  if(e.e&&e.e.some(a=>{const q=st.c[a];return q&&(P.side(q)===out);}))return[['REPORT','Official: '+txt]];
  return null;}   // other events: the neutral wire carries them; the sides report what concerns them
W.listeners.push(e=>{if(!W.st||!KEEP.has(e.ty))return;const n=news();
  for(const out of['B','R','N']){const fr=frame(e,out);if(!fr)continue;for(const[k,t,dh]of fr)n.q.push({at:e.t+(dh||(2+Math.random()*16)),out,k,txt:t,ev:e.id});}
  if(e.ty==='INCIDENT'||(e.ty==='CITY'&&e.e[0]!==e.e[1]))n.inv.push({id:'INV'+(n.inv.length+1),ev:e.id,ty:e.ty,txt:e.txt,opened:e.t,due:e.t+24*(10+Math.random()*30),st:'OPEN',
    blamed:e.ty==='INCIDENT'?(/blames BLUEFOR/.test(e.txt)?'B':'R'):(P.side(W.st.c[e.e[0]])||null)});});
function mediaTick(){const st=W.st,n=news();n.q.sort((a,b)=>a.at-b.at);
  while(n.q.length&&n.q[0].at<=st.t){const r=n.q.shift();n.news.push({t:r.at,out:r.out,k:r.k,txt:r.txt,ev:r.ev});}if(n.news.length>250)n.news.splice(0,n.news.length-250);}
/* ------------------------------------------------------------------ courts and investigations */
function courts(){const st=W.st,n=news();
  for(const v of n.inv){if(v.st!=='OPEN'||st.t<v.due)continue;const found=Math.random()<.7&&v.blamed;
    v.st=found?'FINDING':'INCONCLUSIVE';v.closed=st.t;
    v.find=found?(v.ty==='INCIDENT'?'the incident is attributed to '+P.sName(v.blamed)+' fire (moderate confidence)':'civilians were displaced in the fighting; '+P.sName(v.blamed)+' forces are asked to account for the treatment of the population (moderate confidence)'):'the evidence does not allow a finding';
    W.emit('COURT',{cf:found?'ESTIMATED':'REPORTED',txt:'International investigation '+v.id+': '+v.find+'.'});
    if(found){n.leg[v.blamed]=Math.max(0,n.leg[v.blamed]-.03);if(st.nat)st.nat.coh[v.blamed]=Math.max(0,st.nat.coh[v.blamed]-.01);}}}
W.daily.push(()=>{if(!W.st)return;popDaily();courts();});
setInterval(()=>{try{if(W.st)mediaTick();}catch(e){}},1000);
{const _s=W.step;W.step=function(){const r=_s.apply(this,arguments);try{if(W.st)mediaTick();}catch(e){}return r;};}
W.society={soc,news,popDaily,mediaTick,courts};
})();
