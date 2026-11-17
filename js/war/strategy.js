/* =====================================================================================================================
   v332 — national governments and strategic AI in the world war (spec v49 ch.05 government and institutional continuity,
   ch.15 autonomous AI: decisions from information, authority, capacity and resources; no omniscient faction brain).
   Each country at war decides for itself once a day. Its decisions read what it KNOWS, not the truth: enemy strength on
   each front is seen through an intelligence error that air superiority over that front reduces (spec: "AI must respect
   information"). Every decision is an event with its reason.

   GOVERNMENT (p.govt): head of government (a title; no real person is named), legitimacy (follows stability), emergency
   powers (taken when the country first loses a city: event), mobilisation level 0-3, a decision log.
   STRATEGY, per front the country fights on:
   * estimate the force ratio (own ground power per sector / perceived enemy power per sector);
   * posture: ATTACK when it believes it is 25 % stronger, has public support and fuel; DEFEND (dig in, +12 % in
     defence) when it believes it is 15 % weaker; otherwise HOLD;
   * concentration: forces shift toward attacked and attacking fronts (weights 1.25 / 1.15 / 0.8, renormalised so the
     total is conserved: nothing is created, only moved).
   * mobilisation: with territory lost or fronts on the defensive, enough support (>40 %) and economy (>65 %): one level
     (+15 % ground forces over the prewar estimate; costs 3 % of the economy and 4 % of support); 30 days between levels.
   * call for help: a principal power on the defensive asks its allies without fronts to send more (their share to the
     coalition pool rises from 20 % to 30 %).
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,P=WWAR.diplo,G=WGEO;
const S={attack:1.25,defend:.85,wA:1.25,wD:1.15,wH:.8,dug:1.12,mobGnd:.15,mobEcon:.03,mobSup:.04,mobGap:30,help:.3};
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY'),day=()=>Math.floor(W.st.t/24);
function govt(p){return p.govt||(p.govt={title:'Head of government of '+p.n,leg:.8,emerg:false,mob:0,mobT:-99,dec:[],help:false});}
function decide(p,txt,ty){const g=govt(p);g.dec.push([W.st.t,txt]);if(g.dec.length>12)g.dec.shift();W.emit(ty||'DECISION',{e:[p.a3],txt:p.n+': '+txt});}
const gauss=()=>{let u=0;for(let i=0;i<6;i++)u+=Math.random();return(u-3)/1.5;};
function supOver(s){for(const th of W.st.th){const T=W.THEATRES.find(q=>q.id===th.id);if(s.lat>=T.lat[0]&&s.lat<=T.lat[1]&&s.lon>=T.lon[0]&&s.lon<=T.lon[1])return th.sup;}return 0;}
function daily(){const st=W.st,secs=new Map();
  for(const f of st.fronts)if(!f.cf)for(const a of[f.a,f.b])secs.set(a,(secs.get(a)||0)+f.sec.length);
  for(const p of Object.values(st.c)){if(!bel(p))continue;const g=govt(p);g.leg=p.stab??.8;
    const lost=Object.values(st.cities).some(v=>v.own===p.a3&&v.h!==p.a3);
    if(lost&&!g.emerg){g.emerg=true;decide(p,'the government takes emergency powers after losing territory.','GOV');}
    const mine=st.fronts.filter(f=>!f.cf&&(f.a===p.a3||f.b===p.a3));if(!mine.length)continue;
    const own=p.gnd/Math.max(1,secs.get(p.a3)),defs=[];
    for(const f of mine){const en=st.c[f.a===p.a3?f.b:f.a],truth=en.gnd/Math.max(1,secs.get(en.a3));
      const sup=f.sec.reduce((t,s)=>t+supOver(s),0)/f.sec.length,mySup=p.side==='B'?sup:-sup,err=Math.max(.08,.35-.25*Math.max(0,mySup));
      const est=truth*Math.max(.3,1+gauss()*err);f.est=f.est||{};f.est[p.a3]=est;const ratio=own/Math.max(1e-3,est);
      const fuel=p.ecn?p.ecn.fuel:60,post=ratio>S.attack&&(p.sup??1)>.3&&fuel>15?'ATTACK':ratio<S.defend?'DEFEND':'HOLD';
      f.post=f.post||{};const was=f.post[p.a3];f.post[p.a3]=post;if(post==='DEFEND')defs.push(f);
      if(was&&was!==post)decide(p,(post==='ATTACK'?'goes on the offensive':post==='DEFEND'?'digs in':'holds its positions')+' on the front with '+en.n+' (believes the force ratio is '+ratio.toFixed(2)+').');}
    // concentration, conserved across this country's fronts
    const raw=mine.map(f=>({f,w:f.post[p.a3]==='ATTACK'?S.wA:f.post[p.a3]==='DEFEND'?S.wD:S.wH,n:f.sec.length})),tot=raw.reduce((t,x)=>t+x.w*x.n,0),n=raw.reduce((t,x)=>t+x.n,0);
    for(const x of raw){x.f.w=x.f.w||{};x.f.w[p.a3]=x.w*n/Math.max(1e-6,tot);}
    // mobilisation
    if((lost||defs.length)&&(p.sup??1)>.4&&(p.econ??1)>.65&&g.mob<3&&day()-g.mobT>=S.mobGap){g.mob++;g.mobT=day();const add=p.gnd0*S.mobGnd;p.gnd+=add;p.gnd0+=add;
      if(p.econ!=null)p.econ-=S.mobEcon;if(p.sup!=null)p.sup-=S.mobSup;decide(p,['','orders a partial mobilisation','extends mobilisation to the reserves','orders general mobilisation'][g.mob]+' ('+(lost?'territory lost':'fronts on the defensive')+').','GOV');}
    // a principal power on the defensive asks its allies for help
    if(p.al==='CORE'&&defs.length&&!g.help){g.help=true;const allies=Object.values(st.c).filter(q=>bel(q)&&q.side===p.side&&q!==p&&!secs.get(q.a3));
      for(const q of allies)q.exp=S.help;if(allies.length)decide(p,'asks its allies for help; '+allies.length+' of them send more of their forces to the coalition.');}}}
W.daily.push(()=>{if(W.st&&!W.st.over)daily();});
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);if(f.w&&f.w[p.a3])k*=f.w[p.a3];if(f.post&&f.post[p.a3]==='DEFEND')k*=S.dug;return k;};}
W.strategy={S,govt,daily};
})();
