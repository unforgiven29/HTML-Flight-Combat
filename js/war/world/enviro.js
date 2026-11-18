/* =====================================================================================================================
   ENVIRO — chapter 12 in more depth (spec v49 ch.12): climate, ecology, environment and the emergency system around
   the hazards of hazards.js and the weather of seasons.js.
     * CLIMATE (separate from weather): indicators per country (temperature anomaly, rainfall anomaly, sea level,
       drought index), exposure, adaptation plans (flood defences, heat plans, water storage) and climate policy;
       slow trends over years, never a forecast.
     * GEOLOGICAL HAZARDS with uncertainty: volcanic ash, tsunami warnings after quakes, landslides after rain — each
       with a confidence, warning lead time, cascading effects and preparedness.
     * MULTI-CRISIS: concurrent incidents compete for the same responders; responder fatigue; mutual aid between
       regions; coordination failures are possible and reported; lessons learned raise readiness.
     * ENVIRONMENT: domains (air, water, soil, coast), incident types (oil spill, industrial fire, dam damage, ammunition
       depot fire, contaminated rubble), a monitoring network, exposure, clean-up and restoration, liability claims.
     * ECOSYSTEMS: forests, wetlands, rivers, coasts and protected areas with condition, pressures and restoration.
     * EMERGENCY AGENCIES: readiness, incident lifecycle (alert → response → stabilise → recover → review),
       humanitarian principles (humanity, neutrality, impartiality, independence) and the relief pipeline.
     * CATASTROPHIC RISK FRAMING: outcome levels are tracked only as risk indicators that prevention lowers; this
       campaign never simulates a civilisation-ending outcome (a fixed rule, stated in the panel).
   Abstract; ESTIMATES by rule; non-graphic.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));const bel=p=>W.bell?W.bell(p):!!p.side;const rn=()=>Math.random();const pk=a=>a[Math.floor(rn()*a.length)];const pct=x=>Math.round((x||0)*100)+'%';const r3=x=>Math.round(x*1000)/1000;
const S=()=>{const st=W.st;if(!st.env2)st.env2={c:{},risk:{esc:.05,prev:0},inc:[],aid:0};return st.env2;};
const ECO=['forests','wetlands','rivers','coasts','protected areas'];const DOM=['air','water','soil','coast'];
const INC=[['oil spill from a damaged terminal','coast'],['industrial fire at a chemical plant','air'],['damage to a dam spillway','water'],['fire at an ammunition depot','air'],['contaminated rubble from shelled factories','soil'],['fuel leak at a rail yard','soil']];
const GEO=[['volcanic ash cloud','air routes closed for days'],['tsunami warning after an offshore earthquake','coast evacuated, warning lifted after hours'],['landslide after heavy rain','road and rail cut, villages cut off']];
const PH=['ALERT','RESPONSE','STABILISE','RECOVER','REVIEW'];
const PRIN='humanity, neutrality, impartiality and independence';
function rec(p){const X=S();let R=X.c[p.a3];if(R)return R;const t=cl(Math.log10(Math.max(1e3,p.gdp*1e6/Math.max(1,p.pop)))/5,0,1);
  R=X.c[p.a3]={cli:{dT:r3(1+rn()*.4),dP:r3((rn()-.5)*.2),sea:r3(.18+rn()*.05),dry:r3(rn()*.4),exp:r3(.3+rn()*.4),ad:[],pol:t>.6?'net-zero target':'adaptation first'},
    eco:Object.fromEntries(ECO.map(k=>[k,{c:r3(.6+rn()*.3),pr:0,rest:0}])),mon:{st:Math.round(20+t*200),cov:r3(.4+t*.5)},dom:Object.fromEntries(DOM.map(k=>[k,1])),
    ag:{ready:r3(.5+t*.4),fat:0,act:0,mut:0,fail:0,less:0},cleanup:0,claims:0};return R;}
function step(p,R){const st=W.st,war=bel(p)&&!st.over,d=Math.floor(st.t/24);const X=S();
  // climate: slow drift; adaptation plans every few years of game time
  if(d%30===0){R.cli.dT=r3(R.cli.dT+.002);R.cli.sea=r3(R.cli.sea+.0003);R.cli.dry=r3(cl(R.cli.dry+(rn()-.48)*.02,0,1));}
  if(R.cli.ad.length<3&&rn()<.002){const a=pk(['flood defences','urban heat plan','water storage','drought-resistant seed programme','coastal setback rules']);if(!R.cli.ad.includes(a)){R.cli.ad.push(a);if(!war)W.emit('CLIMATE',{e:[p.a3],txt:p.n+' adopts an adaptation plan: '+a+'.'});}}
  // environment incidents from the war; monitoring and clean-up
  if(war&&rn()<.01*(1-(p.ecn?p.ecn.infra:1)+.3)){const i=pk(INC);R.dom[i[1]]=r3(cl(R.dom[i[1]]-.08,0,1));R.ag.act++;X.inc.unshift({t:st.t,a3:p.a3,k:i[0],ph:0,conf:r3(.5+R.mon.cov*.4)});X.inc.length=Math.min(X.inc.length,20);
    W.emit('ENVIRONMENT',{e:[p.a3],cf:'ESTIMATED',txt:'Environmental incident in '+p.n+': '+i[0]+'. Monitoring stations ('+pct(R.mon.cov)+' coverage) track the '+i[1]+'; residents nearby are advised to stay indoors; clean-up crews wait for a safe window.'});}
  for(const k of DOM)R.dom[k]=r3(cl(R.dom[k]+(war?.0005:.002),0,1));R.cleanup+=war?0:1;if(rn()<.003&&R.ag.act>0)R.claims++;
  for(const k of ECO){const e=R.eco[k];e.pr=r3(cl((war?.3:.1)+(1-R.dom.water)*.3,0,1));e.c=r3(cl(e.c-e.pr*.0006+(st.over?.001:0)+e.rest*.0002,.1,1));if(st.over&&rn()<.01)e.rest++;}
  // geological hazards with uncertainty
  if(rn()<.0006){const g=pk(GEO),conf=r3(.4+rn()*.5);W.emit('HAZARD',{e:[p.a3],cf:conf>.7?'CONFIRMED':'ESTIMATED',txt:'In '+p.n+': '+g[0]+' — '+g[1]+'. Confidence in the assessment '+pct(conf)+'; the warning came '+(1+Math.round(rn()*12))+' hours ahead.'});R.ag.act++;}
  // agencies: concurrent incidents compete for responders; fatigue; mutual aid; failures; lessons
  const A=R.ag;A.fat=r3(cl(A.fat+A.act*.01-.008,0,1));if(A.act>0&&rn()<.1){A.act--;if(A.fat>.6&&rn()<.3){A.fail++;W.emit('EMERGENCY',{e:[p.a3],txt:'Coordination failure in '+p.n+': two incidents at once and tired crews — a district waits hours for help. A review is ordered.'});}
    if(A.fat>.4&&rn()<.3){A.mut++;}A.less++;A.ready=r3(cl(A.ready+.01,0,1));}
  for(const i of X.inc)if(i.a3===p.a3&&i.ph<4&&rn()<.05)i.ph++;}
function risk(){const X=S(),st=W.st;const war=st.fronts.filter(f=>!f.cf).length;const dl=(st.wd&&st.wd.lvl)||0;X.risk.esc=r3(cl(.02+war*.005+dl*.05-X.risk.prev*.01,0,.6));if(rn()<.01)X.risk.prev++;}
function daily(){const st=W.st;if(!st)return;risk();for(const p of Object.values(st.c)){if(!p.pop||!(bel(p)||p.gdp>1e6))continue;try{step(p,rec(p));}catch(e){console.warn('[enviro]',p.a3,e);}}}
W.daily.push(daily);
const row=(a,b)=>'<div style="display:flex;justify-content:space-between;gap:8px"><span>'+a+'</span><b>'+b+'</b></div>';
function tab(p){const st=W.st;if(!st)return'<div>No war running.</div>';if(!(bel(p)||p.gdp>1e6))return'<div>Followed for countries at war and large economies.</div>';const R=rec(p),X=S();
  let h='<div style="color:#8a9a92;font-size:10px">Climate is kept apart from weather. Estimates by rule. This campaign never simulates a civilisation-ending outcome; catastrophic risk is shown only as an indicator that prevention lowers.</div>';
  const C=R.cli;h+='<h4>CLIMATE</h4>'+row('temperature anomaly · rainfall anomaly','+'+C.dT+' °C · '+(C.dP*100).toFixed(0)+'%')+row('sea level rise · drought index',C.sea+' m · '+pct(C.dry))+row('exposure · policy',pct(C.exp)+' · '+C.pol)+row('adaptation plans',C.ad.join(', ')||'—');
  h+='<h4>ENVIRONMENT</h4>'+DOM.map(k=>row(k+' quality',pct(R.dom[k]))).join('')+row('monitoring stations · coverage',R.mon.st+' · '+pct(R.mon.cov))+row('clean-up days · liability claims',R.cleanup+' · '+R.claims)+
    X.inc.filter(i=>i.a3===p.a3).slice(0,4).map(i=>row(i.k,PH[i.ph].toLowerCase()+' · confidence '+pct(i.conf))).join('');
  h+='<h4>ECOSYSTEMS</h4>'+ECO.map(k=>row(k,'condition '+pct(R.eco[k].c)+' · pressure '+pct(R.eco[k].pr)+' · restoration projects '+R.eco[k].rest)).join('');
  const A=R.ag;h+='<h4>EMERGENCY AGENCIES</h4>'+row('readiness · fatigue',pct(A.ready)+' · '+pct(A.fat))+row('active incidents · mutual aid · coordination failures · lessons',A.act+' · '+A.mut+' · '+A.fail+' · '+A.less)+'<div style="font-size:10px">Relief follows the humanitarian principles: '+PRIN+'.</div>';
  h+='<h4>RISK INDICATORS</h4>'+row('escalation risk (indicator)',pct(X.risk.esc))+row('prevention measures in place',X.risk.prev);return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.ENVIRONMENT=tab;
W.enviro={S,rec,daily,tab};
})();
