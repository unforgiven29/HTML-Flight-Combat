/* =====================================================================================================================
   v359 — the war at sea in more depth (spec v49 ch.06 naval warfare, submarines, ports and maritime logistics; ch.11
   global maritime war, trade routes, undersea operations). Builds on naval.js (fleets, sea control, blockade).
   * PORTS: every coastal country at war has its main ports (its largest coastal cities, from the elevation data) with
     a capacity 0-1. Where the enemy holds the air or the sea, ports are struck (events); repair by engineers. Port
     capacity scales the country's seaborne imports (fuel and goods) and its fleet's repairs.
   * MERCHANT CONVOYS: each coastal country at war receives convoys (fuel and goods) every few days on the sea routes
     of its coasts; escorts are drawn from its surface combatants. A convoy arrives (fuel and economy up, by port
     capacity) or is attacked: by enemy submarines in that sea (chance by enemy submarines against escorts and the
     country's anti-submarine strength) or aircraft where the enemy holds the air. Ships lost are equipment losses;
     the crews are not resolved individually (no death estimate is made).
   * SUBMARINE WARFARE: each side's submarines in a sea patrol, attack convoys and warships, and are hunted by the other
     side's anti-submarine forces (surface combatants and maritime patrol); submarines lost and warships hit are
     resolved in naval.js's counts.
   SEA tab additions (NAVY tab): ports, convoys arrived / attacked, submarines on patrol and lost.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,G=WGEO,rn=Math.random;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const S=()=>W.st.sea2||(W.st.sea2={ports:{},conv:{},log:[]});
function ports(p){const s=S();if(s.ports[p.a3])return s.ports[p.a3];const L=G.places.filter(q=>q.a3===p.a3).sort((a,b)=>(b.pop||0)-(a.pop||0)).slice(0,40);const out=[];
  for(const q of L){let sea=false;for(const[a,b]of[[.15,0],[-.15,0],[0,.15],[0,-.15]])if(G.coarse(q.lat+a,q.lon+b)<-10){sea=true;break;}if(sea)out.push({n:q.name,lat:q.lat,lon:q.lon,cap:1});if(out.length>=3)break;}
  return s.ports[p.a3]=out;}
const cap=p=>{const L=ports(p);return L.length?L.reduce((t,x)=>t+x.cap,0)/L.length:0;};
function daily(){const st=W.st,s=S(),n=st.navy;if(!n)return;
  for(const p of Object.values(st.c)){if(!bel(p)||!p.nav||st.over)continue;const L=ports(p);if(!L.length)continue;const c=s.conv[p.a3]||(s.conv[p.a3]={arr:0,hit:0,sunk:0,next:st.t+24*(2+rn()*4),subLost:0});
    const th=(st.th||[]).find(t=>t.f&&t.f[p.a3]),air=th?Math.max(0,p.side==='B'?-th.sup:th.sup):0;
    // ports struck and repaired
    for(const x of L){if(air>.4&&rn()<.02*air){const d=.15+rn()*.25;x.cap=Math.max(.1,x.cap-d);W.emit('PORT',{e:[p.a3],txt:'Enemy aircraft strike the port of '+x.n+' ('+p.n+'): cranes and berths are damaged; capacity is reduced.'});}
      else x.cap=Math.min(1,x.cap+.02*((st.mil&&st.mil[p.a3]&&st.mil[p.a3].eng)||.5));}
    // convoys
    if(st.t>=c.next){c.next=st.t+24*(3+rn()*4);let enemySub=0;for(const[id,t]of Object.entries(n.th||{})){if(!t.f||!t.f[p.a3])continue;for(const a in t.f){const q=st.c[a];if(q&&q.side&&q.side!==p.side&&q.nav)enemySub+=q.nav.sub*t.f[a];}}
      const esc=p.nav.sur*.3,asw=esc+(p.air>200?3:1);const risk=Math.min(.6,(enemySub*.08)/(1+asw*.15)+air*.15);
      if(rn()<risk){c.hit++;const lost=1+((rn()*3)|0);c.sunk+=lost;const by=enemySub>0&&rn()<.7?'submarines':'aircraft';W.emit('CONVOY',{e:[p.a3],cf:'REPORTED',txt:'A merchant convoy bound for '+p.n+' is attacked by enemy '+by+': '+lost+' merchant ship'+(lost>1?'s':'')+' sunk; the rest reach port. Crew losses are not yet known.'});
        if(p.ecn)p.ecn.fuel+=.5*cap(p);
        // escorts fight back: a submarine may be lost
        if(by==='submarines'&&rn()<Math.min(.5,asw*.05)){const q=Object.values(st.c).find(q=>q.side&&q.side!==p.side&&q.nav&&q.nav.sub>0);if(q){q.nav.sub--;q.nav.lost.sub++;c.subLost++;W.emit('NAVAL',{e:[q.a3],cf:'REPORTED',txt:p.n+'\'s convoy escorts sink a '+q.n+' submarine.'});}}}
      else{c.arr++;if(p.ecn)p.ecn.fuel+=2*cap(p);if(p.econ!=null)p.econ=Math.min(1,p.econ+.002*cap(p));if(rn()<.15)W.emit('CONVOY',{e:[p.a3],txt:'A merchant convoy reaches '+(pick(L)||{n:p.n}).n+' ('+p.n+') with fuel and goods.'});}}}}
const pick=a=>a&&a.length?a[(rn()*a.length)|0]:null;
W.daily.push(()=>{if(W.st)daily();});
// blockaded imports and repairs scale with port capacity (naval.js reads p.blockade; ports reduce the rest)
if(window.NATPANEL&&NATPANEL.tabs){const nt=NATPANEL.tabs;const add=p=>{const s=W.st&&W.st.sea2;if(!s)return'';const L=s.ports[p.a3],c=s.conv[p.a3];if(!L&&!c)return'';
    return '<h4>PORTS AND CONVOYS</h4>'+(L||[]).map(x=>'<div class="row"><span>Port of '+x.n+'</span><b>'+Math.round(x.cap*100)+' %</b></div>').join('')+(c?'<div class="row"><span>Convoys arrived / attacked</span><b>'+c.arr+' / '+c.hit+'</b></div><div class="row"><span>Merchant ships sunk</span><b>'+c.sunk+'</b></div><div class="row"><span>Enemy submarines sunk by escorts</span><b>'+c.subLost+'</b></div>':'');};
  const k=Object.keys(nt).find(x=>x==='NAVY');if(k){const _n=nt.NAVY;nt.NAVY=p=>_n(p)+add(p);}else nt.SEA=add;}
W.sea2={S,ports,cap,daily};
})();
