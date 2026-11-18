/* =====================================================================================================================
   v336 — bridges as war targets, and unit maintenance and supply (spec v49 ch.06 readiness, maintenance and
   sustainment; ch.11 "a damaged bridge is one infrastructure asset" whose condition changes military supply).
   BRIDGES (world flight, wnet.js finds them): in a country at war each bridge is a ground target (BRIDGE). Destroyed:
     the country loses transport (economy.js), and if within 150 km of one of its fronts its units on that front lose
     supply until repaired (~10 war days, sooner with a strong economy): front power x0.85 per bridge down, at most x0.6.
     Destroyed bridges stay destroyed until repaired (keyed by position). Events for the cut and the repair.
   READINESS (every unit in the order of battle, daily):
     squadrons: fall with operations in an active air theatre (-1 % a day) and with fuel or industry shortages; rise
       with rest and spares (+2 % a day x supply); under 40 % a squadron does not fly (no flights from it on sorties).
     brigades: drift toward their supply level (fuel days, transport, bridges cut on their front); fall while in
       action (-1 % a day). Front power is scaled by the readiness of that country's brigades there (x ready / 0.8).
   Gameplay-level rules; all rates are constants in R.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.ob)return;
const W=WWAR,G=WGEO,P=WWAR.diplo,rn=Math.random;
const R={bridge:.85,bridgeMin:.6,repairDays:10,sqUse:.01,sqRest:.02,sqMin:.4,bdeAct:.01,bdeDrift:.05};
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const B=()=>W.st.br||(W.st.br={cut:{}});
/* ------------------------------------------------------------------ bridges as targets */
{const M=new THREE.MeshLambertMaterial({color:0x8a877e});
 if(window.CMESH)CMESH.BRIDGE=function(){const g=new THREE.Group();const d=new THREE.Mesh(new THREE.BoxGeometry(14,2,1),M);d.position.y=9;g.add(d);g.userData.deck=d;return g;};
 if(typeof GTY!=='undefined')GTY.BRIDGE={n:'Bridge',hp:260,arm:1,r:20,tgt:1};}
const key=(lat,lon)=>'BR@'+lat.toFixed(3)+','+lon.toFixed(3);
function placeBridges(){if(!window.WNET||!W.st||!WF.on)return;const st=W.st,me=window.WSORTIE&&WSORTIE.WS.on?st.c[WSORTIE.WS.me].side:(game.team==='RED'?'R':'B');
  for(const b of WNET.bridges){const ll=G.xz2ll(b.x,b.z),c=G.countryAt(ll.lat,ll.lon);if(!c)continue;const p=st.c[c.a3];if(!bel(p))continue;const k=key(ll.lat,ll.lon),cut=B().cut[k];
    const u=GND.add('BRIDGE',p.side===me?0:1,b.x,b.z,b.hd);const deck=u.mesh.userData.deck;if(deck){deck.scale.set(1,1,b.span);}u.mesh.position.y=groundAt(b.x,b.z);
    u._ws=c.a3;u._bridge=k;u.callsign='Bridge ('+p.n+')';if(cut){u.alive=false;u.hp=0;u.mesh.visible=false;}}}
if(window.WNET)WNET.after=placeBridges;
if(typeof GUnit!=='undefined'){const _k=GUnit.prototype.kill;GUnit.prototype.kill=function(src){const br=this._bridge&&this.alive,a3=this._ws;if(br)this._ws=null;const r=_k.apply(this,arguments);
  if(br&&W.st)try{const st=W.st,p=st.c[a3],ll=G.xz2ll(this.pos.x,this.pos.z);let front=null,bd=150e3;for(const f of st.fronts){if(f.a!==a3&&f.b!==a3)continue;for(const s of f.sec){const d=G.dist(ll.lat,ll.lon,s.lat,s.lon);if(d<bd){bd=d;front=f.id;}}}
    B().cut[this._bridge]={a3,front,t:st.t,fix:st.t+24*R.repairDays*(1.4-.6*(p.econ??1))};if(p.ecn)p.ecn.trans=Math.max(.2,p.ecn.trans-.03);this.mesh.visible=false;
    W.emit('BRIDGE',{e:[a3],txt:'A bridge in '+p.n+' is destroyed'+(src===player?' by your strike':'')+(front?': supply to its forces on the front with '+st.c[st.fronts.find(f=>f.id===front)[st.fronts.find(f=>f.id===front).a===a3?'b':'a']].n+' is cut until it is repaired':'')+'. Civilian traffic is cut too.'});
    if(src===player&&window.WSORTIE)WSORTIE.WS.kills.gnd++;}catch(e){console.warn('[supply]',e);}
  return r;};}
const cutOn=(a3,fid)=>Object.values(B().cut).filter(c=>c.a3===a3&&c.front===fid).length;
/* ------------------------------------------------------------------ readiness */
function supplyLevel(p,fid){const e=p.ecn;const s=e?Math.min(1,e.fuel/20)*(.5+.5*e.trans):1;return Math.max(.2,s*Math.max(R.bridgeMin,Math.pow(R.bridge,cutOn(p.a3,fid))));}
function daily(){const st=W.st;
  for(const[k,c]of Object.entries(B().cut))if(st.t>=c.fix){delete B().cut[k];W.emit('BRIDGE',{e:[c.a3],txt:'Engineers in '+st.c[c.a3].n+' have repaired a destroyed bridge; traffic resumes.'});}
  for(const a3 in (st.ob&&st.ob.by)||{}){const p=st.c[a3];const U=W.ob.units(a3),e=p.ecn,sup=e?Math.min(1,e.fuel/20)*(.6+.4*e.ind):1;
    const air=st.th.some(th=>Object.keys(th.f).includes(a3)&&Math.abs(th.sup)<.95);
    for(const u of U){if(u.kind==='SQN'){u.ready=Math.max(.1,Math.min(1,u.ready-(air&&u.st==='ACTIVE'?R.sqUse:0)+R.sqRest*sup*(1-u.ready)));}
      else{const f=u.front&&st.fronts.find(q=>q.id===u.front),act=f&&!f.cf;const tgt=f?supplyLevel(p,f.id):sup;u.ready=Math.max(.1,Math.min(1,u.ready+(tgt-u.ready)*R.bdeDrift-(act?R.bdeAct:0)));}}}}
W.daily.push(()=>{if(W.st&&!W.st.over)daily();});
// front power from the readiness of the brigades there (and supply cut by bridges); 0.8 is the baseline
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);const L=W.ob.brigadesAt(p.a3,f.id);if(L.length){const r=L.reduce((t,u)=>t+u.ready*u.str,0)/Math.max(1e-6,L.reduce((t,u)=>t+u.str,0));k*=Math.max(.4,r/.8);}
  const c=cutOn(p.a3,f.id);if(c)k*=Math.max(R.bridgeMin,Math.pow(R.bridge,c));return k;};}
// a squadron under 40 % readiness does not fly
{const _q=W.ob.squadronFor;W.ob.squadronFor=function(a3,ident){const L=W.ob.units(a3).filter(u=>u.kind==='SQN'&&u.st==='ACTIVE'&&u.str>=1&&u.ready>=R.sqMin);return L.find(u=>u.base===ident)||L.sort((a,b)=>b.str*b.ready-a.str*a.ready)[0]||null;};}
W.supply={R,B,cutOn,daily,placeBridges};
})();
