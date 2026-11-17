/* =====================================================================================================================
   v334 — order of battle: squadrons, brigades and battalions for every country at war (spec v49 ch.06: force structure,
   formations, readiness, personnel; ch.02: "Expanding detail must materialize from existing aggregate state without
   duplicating population, equipment, finances, or military units").

   ONE AUTHORITY: each country's air and ground strength stays WWAR's aggregate (p.air aircraft, p.gnd brigade-
   equivalents). The order of battle is the DETAILED ALLOCATION of that aggregate: the strengths of a country's units
   always add up to it exactly (audited). Strategic losses and replacements are spread over the units that are fighting
   (or the weakest, for replacements); losses that happen to a known unit (a squadron's jet shot down, a battalion's
   tanks destroyed in your sortie) come off that unit and the aggregate together.

   * AIR: squadrons of about 18 aircraft at the country's real military airfields (the ones nearest its fronts and
     theatres first), each flying one of the country's types (the same table as world-war sorties). At most 40
     squadrons per country; anything beyond is one "Training and reserve units" record.
   * GROUND: brigades (armoured, mechanised, infantry, artillery; one brigade-equivalent each at full strength) assigned
     to the country's fronts in proportion to sectors, at most 40 per country, the rest in a "Strategic reserve".
     Each brigade has battalions (tank / mechanised / infantry / artillery) for the sortie view, a commander with a
     national rank, readiness, and a history. A brigade under 30 % is COMBAT INEFFECTIVE, withdrawn to rebuild (event);
     it returns at 70 %.
   Names are generic and numbered by national convention; no real unit is represented. Strength figures inherit the
   world war's labelled estimates.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,G=WGEO,rn=Math.random;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const ord=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th');
const TR=a=>W.lead?W.lead.TRAD(a):'GEN';
const BDE={US:{ARM:'Armored Brigade Combat Team',MECH:'Stryker Brigade Combat Team',INF:'Infantry Brigade Combat Team',ART:'Field Artillery Brigade'},UK:{ARM:'Armoured Brigade',MECH:'Mechanised Brigade',INF:'Infantry Brigade',ART:'Artillery Brigade'},
  RU:{ARM:'Tank Brigade',MECH:'Motor Rifle Brigade',INF:'Rifle Brigade',ART:'Artillery Brigade'},CN:{ARM:'Heavy Combined Arms Brigade',MECH:'Medium Combined Arms Brigade',INF:'Light Combined Arms Brigade',ART:'Artillery Brigade'},
  KO:{ARM:'Armored Brigade',MECH:'Mechanized Infantry Brigade',INF:'Infantry Brigade',ART:'Artillery Brigade'},GEN:{ARM:'Armoured Brigade',MECH:'Mechanised Brigade',INF:'Infantry Brigade',ART:'Artillery Brigade'}};
const SQN={US:'Fighter Squadron',UK:'Squadron',RU:'Fighter Aviation Squadron',CN:'Air Brigade squadron',KO:'Fighter Squadron',GEN:'Squadron'};
const MIX=['ARM','MECH','MECH','INF','ART'];
const OB=()=>W.st.ob||(W.st.ob={u:{},seq:1,by:{}});
function add(u){const o=OB();u.id='U'+(o.seq++).toString(36).toUpperCase();u.hist=[[W.st.t,'formed']];o.u[u.id]=u;(o.by[u.a3]||(o.by[u.a3]=[])).push(u.id);return u;}
const units=a3=>(OB().by[a3]||[]).map(id=>OB().u[id]);
/* ------------------------------------------------------------------ build a country's order of battle from its aggregate */
function build(p){if(OB().by[p.a3])return;OB().by[p.a3]=[];const tr=TR(p.a3),st=W.st;
  // air
  const bases=(W.milBases().get(p.a3)||[]).filter(a=>a.runways.some(r=>r.paved&&r.len_m>=1800)),types=(window.WSORTIE?WSORTIE.typesOf(p.a3,p.side):[])||[];
  const near=b=>{let d=1e12;for(const f of st.fronts)for(const s of f.sec){if(f.a!==p.a3&&f.b!==p.a3)continue;d=Math.min(d,G.dist(b.lat,b.lon,s.lat,s.lon));}return d;};
  bases.sort((x,y)=>near(x)-near(y));let left=p.air,n=0;
  while(left>=6&&n<40&&bases.length){const sz=Math.min(left,18),b=bases[n%bases.length];n++;
    const cmd=W.lead?W.lead.person(p.a3,'Commander, '+ord(n)+' '+SQN[tr],W.lead.rank(p.a3,'air',4)):null;
    add({a3:p.a3,kind:'SQN',branch:'AIR',num:n,name:ord(n)+' '+SQN[tr],equip:types.length?types[(n-1)%types.length]:'fighters',str:sz,str0:sz,ready:.8,base:b.ident,baseName:b.name,cmd:cmd&&cmd.id,st:'ACTIVE'});left-=sz;}
  if(left>0)add({a3:p.a3,kind:'SQN',branch:'AIR',num:0,name:'Training and reserve units',equip:'mixed',str:left,str0:left,ready:.5,base:null,st:'RESERVE'});
  // ground
  const fr=st.fronts.filter(f=>f.a===p.a3||f.b===p.a3),secs=fr.reduce((t,f)=>t+f.sec.length,0);let gl=p.gnd,k=0;const cnt={};
  while(gl>=.6&&k<40){const br=MIX[k%MIX.length];cnt[br]=(cnt[br]||0)+1;k++;const sz=Math.min(1,gl);let front=null;
    if(secs){let r=rn()*secs;for(const f of fr){r-=f.sec.length;if(r<=0){front=f.id;break;}}front=front||fr[0].id;}
    const cmd=W.lead?W.lead.person(p.a3,'Commander, '+ord(cnt[br])+' '+BDE[tr][br],W.lead.rank(p.a3,'army',1)):null;
    add({a3:p.a3,kind:'BDE',branch:br,num:cnt[br],name:ord(cnt[br])+' '+BDE[tr][br],str:sz,str0:1,ready:.8,front,cmd:cmd&&cmd.id,st:front?'ACTIVE':'RESERVE',
      bns:br==='ARM'?['TANK','TANK','MECH']:br==='MECH'?['MECH','MECH','TANK']:br==='INF'?['INF','INF','MECH']:['ART','ART']});gl-=sz;}
  if(gl>1e-6)add({a3:p.a3,kind:'BDE',branch:'MIX',num:0,name:'Strategic reserve',str:gl,str0:gl,ready:.6,front:null,st:'RESERVE',bns:[]});}
/* ------------------------------------------------------------------ keep the allocation equal to the aggregate */
function reconcile(p){const U=units(p.a3);if(!U.length)return;
  for(const[kind,key]of[['SQN','air'],['BDE','gnd']]){const L=U.filter(u=>u.kind===kind),sum=L.reduce((t,u)=>t+u.str,0),d=p[key]-sum;if(Math.abs(d)<1e-9)continue;
    if(d<0){// losses: units in action first (squadrons at bases nearest a front, brigades on fronts not under ceasefire), in proportion to strength
      const live=L.filter(u=>u.st==='ACTIVE'&&(kind==='SQN'||(u.front&&!W.st.fronts.find(f=>f.id===u.front&&f.cf)))),pool=live.length?live:L;let need=-d;
      for(let pass=0;pass<3&&need>1e-9;pass++){const tot=pool.reduce((t,u)=>t+u.str,0);if(tot<=0)break;for(const u of pool){const take=Math.min(u.str,need*u.str/tot);u.str-=take;}need=p[key]-L.reduce((t,u)=>t+u.str,0);need=-need;}
      if(need>1e-9){for(const u of L){const take=Math.min(u.str,need);u.str-=take;need-=take;if(need<=1e-9)break;}}}
    else{// replacements: the weakest (relative to establishment) first
      let give=d;const S=L.slice().sort((a,b)=>a.str/a.str0-b.str/b.str0);for(const u of S){const room=Math.max(0,u.str0*1.1-u.str);const g=Math.min(room,give);u.str+=g;give-=g;if(give<=1e-9)break;}
      if(give>1e-9){const r=L.find(u=>u.num===0)||L[0];r.str+=give;}}}}
function status(p){for(const u of units(p.a3)){if(u.kind!=='BDE'||u.num===0)continue;const r=u.str/u.str0;
  if(u.st==='ACTIVE'&&r<.3){u.st='WITHDRAWN';u.hist.push([W.st.t,'withdrawn: combat ineffective']);W.emit('UNIT',{e:[p.a3],txt:p.n+': the '+u.name+' is withdrawn from the line, combat ineffective at '+Math.round(r*100)+' % strength.'});}
  else if(u.st==='WITHDRAWN'&&r>=.7){u.st='ACTIVE';u.hist.push([W.st.t,'returned to the line']);W.emit('UNIT',{e:[p.a3],txt:p.n+': the '+u.name+' returns to the line, rebuilt to '+Math.round(r*100)+' %.'});}}}
// a loss to a known unit (sorties): the unit and the aggregate together
W.unitLoss=(u,amount)=>{if(!u||!W.st)return;const p=W.st.c[u.a3];const a=Math.min(amount,u.str);u.str-=a;if(u.kind==='SQN'){p.air=Math.max(0,p.air-a);p.lostAir+=a;}else{p.gnd=Math.max(0,p.gnd-a);p.lostGnd+=a;}};
W.ob={OB,units,build,reconcile,ord,
  audit(){const out=[];if(!W.st||!W.st.ob)return out;for(const a3 in W.st.ob.by){const p=W.st.c[a3],U=units(a3);for(const[k,key]of[['SQN','air'],['BDE','gnd']]){const s=U.filter(u=>u.kind===k).reduce((t,u)=>t+u.str,0);if(Math.abs(s-p[key])>1e-6)out.push('order of battle off for '+a3+' '+key+': '+s.toFixed(3)+' vs '+p[key].toFixed(3));}
    if(U.some(u=>u.str<-1e-9))out.push('negative unit strength '+a3);}return out;},
  squadronFor(a3,ident){const L=units(a3).filter(u=>u.kind==='SQN'&&u.st==='ACTIVE'&&u.str>=1);return L.find(u=>u.base===ident)||L.sort((a,b)=>b.str-a.str)[0]||null;},
  brigadesAt(a3,frontId){return units(a3).filter(u=>u.kind==='BDE'&&u.front===frontId&&u.st==='ACTIVE');}};
// daily: build for new belligerents, reconcile, status. Also reconcile at the end of every step so the audit always holds
W.daily.push(()=>{if(!W.st)return;for(const p of Object.values(W.st.c))if(bel(p))build(p);for(const p of Object.values(W.st.c))if(OB().by[p.a3]){reconcile(p);status(p);}});
{const _s=W.step;W.step=function(){const r=_s.apply(this,arguments);try{if(W.st&&W.st.ob)for(const a3 in W.st.ob.by)reconcile(W.st.c[a3]);}catch(e){console.warn('[orbat]',e);}return r;};}
{const _a=W.audit;W.audit=function(){return _a.apply(this,arguments).concat(W.ob.audit());};}
{const _n=W.newWar;W.newWar=async function(){const r=await _n.apply(this,arguments);for(const p of Object.values(W.st.c))if(bel(p))build(p);return r;};}
})();
