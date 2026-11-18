/* =====================================================================================================================
   v337 — after the war: reconstruction, memorials and the epilogue (spec v49 ch.14 the end of the war and the long
   aftermath). Runs only once the player chooses CONTINUE POSTWAR (st.post). Gameplay-level rules, abstract events.
   * RECONSTRUCTION (daily, every country that fought): infrastructure, transport, energy and industry recover toward
     normal (about 0.4 % of the gap a day x stability x economy); the displaced return (1 % a day); public support
     and stability recover slowly. Aid from the richest neutral and allied countries speeds it up (x1.3).
   * MEMORIALS: 30 days after the end, each country that fought dedicates a memorial to its fallen (event).
   * EPILOGUE: notes at 3 months, 1 year and 5 years after the end, summing up recovery, the displaced still away
     and the cost, from the war's own records. The war is a fictional scenario; the people in it are fictional.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR)return;
const W=WWAR,R={rate:.004,ret:.01,aid:1.3};
const fought=st=>Object.values(st.c).filter(p=>p.side&&(p.lostAir>0||p.lostGnd>0||p.al==='CORE'));
const P=()=>W.st.pw||(W.st.pw={done:{},mem:0});
function daily(){const st=W.st;if(!st||!st.over||!st.post)return;const pw=P(),days=(st.t-st.over.t)/24,L=fought(st);
  for(const p of L){const k=R.rate*Math.max(.2,(p.stab??.8))*Math.max(.3,(p.econ??1))*(L.length<Object.keys(st.c).length/2?R.aid:1);
    if(p.ecn)for(const f of['infra','trans','energy','ind','food'])if(p.ecn[f]!=null)p.ecn[f]=Math.min(1,p.ecn[f]+(1-p.ecn[f])*k*5);
    if(p.econ!=null)p.econ=Math.min(1,p.econ+(1-p.econ)*k);if(p.disp)p.disp=Math.max(0,Math.round(p.disp*(1-R.ret)));
    if(p.stab!=null)p.stab=Math.min(1,p.stab+.002);if(p.sup!=null)p.sup=Math.min(1,p.sup+(.6-p.sup)*.01);}
  if(days>=30&&!pw.mem){pw.mem=1;for(const p of L.slice(0,12))W.emit('MEMORIAL',{e:[p.a3],txt:p.n+' dedicates a memorial to its fallen of the war: '+Math.round(p.lostAir)+' aircraft and the crews lost with them, and the soldiers of its ground forces.'});}
  for(const[d,lbl]of[[90,'Three months on'],[365,'One year on'],[365*5,'Five years on']])if(days>=d&&!pw.done[d]){pw.done[d]=1;
    const ecn=L.map(p=>p.ecn&&p.ecn.infra).filter(v=>v!=null),inf=ecn.length?ecn.reduce((a,b)=>a+b,0)/ecn.length:1,disp=L.reduce((t,p)=>t+(p.disp||0),0);
    W.emit('EPILOGUE',{e:L.map(p=>p.a3).slice(0,6),cf:'ESTIMATED',txt:lbl+' from the '+(st.over.kind||'end').toLowerCase()+': infrastructure in the countries that fought is back to about '+Math.round(inf*100)+' % of its pre-war state; about '+
      (disp>=1e6?(disp/1e6).toFixed(1)+' million':Math.round(disp/1e3)*1000)+' people are still away from home. Estimates by rule.'});}}
W.daily.push(daily);
W.postwar={R,daily};
})();
