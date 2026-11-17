/* =====================================================================================================================
   v333 — war crimes and accountability (spec v49 ch.05 "Law, justice, investigations, and accountability" and its
   offence-specific classification section; ch.14 enemy-driven civilian intimidation, strict implementation boundary).

   CASES move through the stages the spec keeps distinct: REPORTED -> ALLEGATION -> FINDING (verified facts) ->
   ASSESSMENT (legal) -> CHARGE -> JUDGMENT. Each case records: conduct, place and time, armed-conflict context, the
   scenario's legal framework (a configurable label, not legal advice), the candidate category (potential war crime,
   disciplinary violation, non-criminal incident, ...), which elements are supported / disputed / unknown, the
   institution (an international commission during the war, a tribunal after it), the confidence, and who is accused.
   * Classification is never automatic: a casualty number, a nationality, a rank or a unit never establishes guilt;
     command responsibility needs evidence of knowledge and failure to act (a case can stay "undetermined").
   * Sources of cases: civilian harm in world flight (targets.js: COLLATERAL -> proportionality assessment; CIVILIAN_AREA
     -> potential violation), border incidents, and abstract allegations in occupied cities (pillage, enforced
     disappearances, use of human shields, attacks on protected facilities) reported at a low rate. Allegations are
     non-graphic records with uncertainty; many are not substantiated.
   * Enemy intimidation policy (spec ch.14): scenario setting (ON by default, rare by conditions). Only a principal power
     whose head of government has very high resolve and little caution, that is over 55 % exhausted and has lost cities,
     may adopt it (an event, with condemnation). While adopted, about every ten days an abstract event: a deliberate
     attack on a civilian area of an enemy city near the war. No method, weapon, route or aim point is represented; the
     player is never offered civilians as targets. Consequences: people displaced, an estimated harm range, a case,
     the perpetrator's legitimacy and cohesion fall, neighbouring neutrals hold it against that side, the victim
     coalition's resolve rises, and (when you fly near) a protective tasking: air cover for the city's evacuation.
   * After the war: charged cases go to a tribunal; judgments over the following days (conviction, acquittal, or
     proceedings ended for lack of evidence), each with its reasons recorded.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,P=WWAR.diplo,G=WGEO,rn=Math.random,pick=a=>a[(rn()*a.length)|0];
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const LAW=()=>W.st.law||(W.st.law={cases:[],seq:1,intim:'ON',policy:{},framework:'Scenario ruleset: law of armed conflict (configurable label)'});
const ALLEG=[['PILLAGE','pillage of property in occupied'],['DISAPPEAR','enforced disappearances of residents of occupied'],['SHIELDS','use of civilians as human shields around military positions near'],['PROTECTED','an attack on a hospital in']];
function open(o){const L=LAW(),c=Object.assign({id:'CASE-'+(L.seq++),stage:'REPORTED',opened:W.st.t,next:W.st.t+24*(4+rn()*8),framework:L.framework,elements:{conduct:'unknown',context:'supported (armed conflict)',intent:'unknown',responsibility:'unknown'},
  cls:'preliminary',accused:'not identified',inst:'International commission of inquiry',hist:[[W.st.t,'reported']]},o);L.cases.push(c);if(L.cases.length>400)L.cases.shift();return c;}
const step=(c,stage,txt)=>{c.stage=stage;c.hist.push([W.st.t,txt]);c.next=W.st.t+24*(5+rn()*15);};
// sources: civilian harm and incidents (events), allegations in occupied cities
W.listeners.push(e=>{if(!W.st)return;
  if(e.ty==='CIVHARM'){const area=/^Attack on a civilian area/.test(e.txt);open({src:e.id,cat:area?'CIVILIAN_AREA':'COLLATERAL',candidate:area?'potential war crime (attack on civilians or civilian objects)':'proportionality assessment (incidental civilian harm)',txt:e.txt,side:/BLUEFOR\.$/.test(e.txt)?'B':/REDFOR\.$/.test(e.txt)?'R':null});}
  if(e.ty==='INCIDENT')open({src:e.id,cat:'BORDER',candidate:'non-criminal incident or violation of neutral territory (to be assessed)',txt:e.txt,side:/blames BLUEFOR/.test(e.txt)?'B':'R'});});
function allegations(){const st=W.st;for(const[k,v]of Object.entries(st.cities)){if(v.h===v.own||rn()>.004)continue;const[a,b]=pick(ALLEG),city=k.split('|')[0],side=P.side(st.c[v.h]);
  const c=open({cat:a,candidate:'to be classified (preliminary)',txt:'Allegation: '+b+' '+city+' ('+st.c[v.own].n+'), held by '+st.c[v.h].n+' forces.',side});
  W.emit('ALLEGATION',{e:[v.own,v.h],cf:'REPORTED',txt:c.txt+' Investigators request access; the allegation is not verified.'});}}
// the lifecycle: most allegations are not substantiated; findings need evidence; charges name the responsible level only on evidence
function cases(){const st=W.st,L=LAW();
  for(const c of L.cases){if(st.t<c.next||c.stage==='JUDGMENT'||c.stage==='CLOSED')continue;
    if(c.stage==='REPORTED'){step(c,'ALLEGATION','recorded as an allegation; evidence collection begins');continue;}
    if(c.stage==='ALLEGATION'){const sub=rn()<(c.cat==='CIVILIAN_AREA'?.8:c.cat==='COLLATERAL'?.9:.45);
      if(!sub){c.stage='CLOSED';c.cls='not substantiated';c.hist.push([st.t,'closed: the evidence does not substantiate the allegation']);W.emit('CASE',{txt:c.id+': '+c.txt.slice(0,80)+'… not substantiated; closed.'});continue;}
      c.elements.conduct='supported';step(c,'FINDING','facts verified (moderate confidence)');continue;}
    if(c.stage==='FINDING'){let cls;
      if(c.cat==='COLLATERAL'){const disp=rn()<.3;cls=disp?'potential war crime (disproportionate incidental harm)':'no violation found (harm within proportionality as assessed)';c.elements.intent=disp?'disputed':'not applicable';}
      else if(c.cat==='BORDER')cls=rn()<.5?'violation of neutral territory (state responsibility)':'non-criminal incident';
      else{cls='potential war crime ('+c.cat.toLowerCase()+')';c.elements.intent=rn()<.5?'supported':'disputed';}
      c.cls=cls;step(c,'ASSESSMENT','legal assessment: '+cls);if(/no violation|non-criminal/.test(cls)){c.stage='CLOSED';c.hist.push([st.t,'closed after legal assessment']);}
      W.emit('CASE',{cf:'ESTIMATED',txt:c.id+': legal assessment, '+cls+'.'});continue;}
    if(c.stage==='ASSESSMENT'){const ev=rn();c.elements.responsibility=ev<.55?'supported for the unit responsible':ev<.75?'supported for its commanders (knowledge and failure to act evidenced)':'undetermined';
      if(c.elements.responsibility==='undetermined'){c.stage='CLOSED';c.hist.push([st.t,'closed: responsibility could not be established']);W.emit('CASE',{txt:c.id+': responsibility could not be established on the evidence; no charge.'});continue;}
      c.accused=(c.side?(c.side==='B'?'BLUEFOR':'REDFOR'):'a')+' '+(/commanders/.test(c.elements.responsibility)?'command responsible':'unit responsible')+' (identified by the commission)';
      step(c,'CHARGE','charges brought against the '+c.accused);W.emit('CASE',{txt:c.id+': charges brought against the '+c.accused+'. Rank or nationality alone is not the basis; the evidence is.'});
      if(c.side&&st.soc){st.soc.leg[c.side]=Math.max(0,st.soc.leg[c.side]-.02);if(st.nat)st.nat.coh[c.side]=Math.max(0,st.nat.coh[c.side]-.01);}continue;}
    if(c.stage==='CHARGE'&&st.over){c.inst='Postwar international tribunal';const r=rn(),out=r<.6?'convicted':r<.85?'acquitted (reasonable doubt)':'proceedings ended (evidence lost or inadmissible)';
      c.stage='JUDGMENT';c.judgment=out;c.hist.push([st.t,'judgment: '+out]);W.emit('JUDGMENT',{txt:c.id+' before the tribunal: the '+c.accused+' '+out+'. Victims and families are heard; reparations are part of the judgment where a conviction stands.'});}}}
/* ------------------------------------------------------------------ enemy intimidation policy (abstract) */
function intimidation(){const st=W.st,L=LAW();if(L.intim!=='ON')return;
  for(const p of Object.values(st.c)){if(p.al!=='CORE'||!p.ldr||!W.lead)continue;const h=W.lead.who(p.ldr.HEAD),lost=Object.values(st.cities).filter(v=>v.own===p.a3&&v.h!==p.a3).length;
    if(!L.policy[p.a3]&&h&&h.resolve>.75&&h.caution<.35&&p.exh>.55&&lost>=2){L.policy[p.a3]={t:st.t,next:st.t+24*3};
      W.emit('POLICY',{e:[p.a3],txt:'Reports that the leadership of '+p.n+' has ordered attacks intended to terrorise the enemy\'s civilian population. Governments, the UN and humanitarian organisations condemn it; neutral states demand it stop.'});}
    const pol=L.policy[p.a3];if(!pol||st.t<pol.next)continue;pol.next=st.t+24*(7+rn()*7);
    const en=p.side==='B'?'R':'B',cand=G.places.filter(pl=>pl.pop>2e5&&st.c[pl.a3]&&P.side(st.c[pl.a3])===en&&st.fronts.some(f=>f.sec.some(s=>G.dist(pl.lat,pl.lon,s.lat,s.lon)<600e3)));if(!cand.length)continue;
    const city=pick(cand),v=st.c[city.a3],n=Math.round(city.pop*.05),kLo=Math.round(city.pop*1e-5),kHi=Math.round(city.pop*6e-5);v.disp=(v.disp||0)+n;
    const e=W.emit('INTIMIDATION',{e:[city.a3,p.a3],cf:'REPORTED',loc:[city.lat,city.lon],txt:'Deliberate attack on a civilian area of '+city.name+' ('+v.n+'), attributed to '+p.n+'. Early estimates: '+kLo+'-'+kHi+' people killed; about '+n+' leave the city. Rescue and medical teams are working; shelters are open.'});
    open({src:e&&e.id,cat:'INTIMIDATION',candidate:'potential war crime (deliberate attack on civilians)',txt:e.txt,side:p.side});
    if(st.soc)st.soc.leg[p.side]=Math.max(0,st.soc.leg[p.side]-.05);if(st.nat){st.nat.coh[p.side]=Math.max(0,st.nat.coh[p.side]-.03);st.nat.coh[en]=Math.min(1,st.nat.coh[en]+.03);}
    for(const a of(G.byA3.get(city.a3)||{nb:[]}).nb){const q=st.c[a];if(q&&!bel(q)){q.inc=q.inc||{B:0,R:0};q.inc[p.side]++;}}
    L.last={city,t:st.t};}}
// a protective tasking when you fly near a city that has just been attacked
if(window.WSORTIE){const _s=WSORTIE.start;WSORTIE.start=async function(){const r=await _s.apply(this,arguments);try{const L=W.st&&W.st.law,WS=WSORTIE.WS;
  if(WS.on&&L&&L.last&&W.st.t-L.last.t<72&&G.dist(WS.base.lat,WS.base.lon,L.last.city.lat,L.last.city.lon)<250e3){const p=G.ll2xz(L.last.city.lat,L.last.city.lon);WS.task={k:'PROTECT',x:p.x,z:p.z,l:'Air cover for the evacuation of '+L.last.city.name};
    setTimeout(()=>{if(WS.on)radio('Tasking change: air cover for the evacuation of '+L.last.city.name+'. Keep enemy aircraft away from the evacuation routes.');},5000);}}catch(e){console.warn('[justice]',e);}return r;};}
W.daily.push(()=>{if(!W.st)return;if(!W.st.over){allegations();intimidation();}cases();});
W.law={LAW,open,cases,ALLEG};
})();
