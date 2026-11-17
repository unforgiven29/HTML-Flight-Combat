/* =====================================================================================================================
   v333 — infrastructure that can be attacked, and civilian harm, in world flight (spec v49 ch.11 infrastructure;
   ch.14 "Civilian harm is never a reward or spectacle", incident categories kept distinct; ch.05 law and accountability).

   INFRASTRUCTURE: near the biggest towns of the flight region, for each country at war: a power station, a fuel depot,
   a rail yard or a factory (generated positions near the real town, labelled; one to two per town, at most 14 in a
   region). They are real ground objects (GND) with hit points. Destroyed ones stay destroyed for that war (keyed by
   position). Destroying one comes off that country's economy in the world war: power station -> grid condition, fuel
   depot -> days of fuel, rail yard -> transport, factory -> economy. Power and fuel are dual-use: the attack is legal
   only against a country at war, and the civilian consequence (blackouts, shortages) is recorded with it.

   CIVILIAN HARM: town buildings are physical. A bomb or missile that bursts among them destroys them, whoever fired it.
   Each such blast is recorded as civilian harm: buildings destroyed, people killed and injured, resolved person by person (cemetery.js)
   (occupancy rule by time of day; not a count), the country harmed and the side responsible, and a category:
     COLLATERAL      an enemy military objective (unit or infrastructure) within 400 m: harm in an attack on a military
                     objective; the investigation weighs proportionality;
     CIVILIAN_AREA   no military objective within 1 km: an attack on a civilian area, a possible violation.
   Both open an international investigation (society.js). There are no points, kills or rewards for it, ever; it lowers
   the responsible side's legitimacy and coalition cohesion. Civilians are never offered as targets: no tasking, no
   marker, no lock. If you cause it, your service record has an inquiry (leaders.js).
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WF||!window.WWAR||typeof GND==='undefined')return;
const W=WWAR,G=WGEO,D=Math.PI/180;
const KINDS={PWR:{n:'Power station',hp:320,eff:'power'},FUELD:{n:'Fuel depot',hp:200,eff:'fuel'},RAILY:{n:'Rail yard',hp:260,eff:'trans'},FACT:{n:'Factory',hp:300,eff:'ind'}};
/* ------------------------------------------------------------------ models */
{const M={},mat=c=>M[c]||(M[c]=new THREE.MeshLambertMaterial({color:c}));
 const bx=(g,w,h,l,c,x,y,z)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),mat(c));b.position.set(x,y+h/2,z);g.add(b);return b;};
 const cy=(g,r,h,c,x,y,z)=>{const b=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,14),mat(c));b.position.set(x,y+h/2,z);g.add(b);return b;};
 const B={PWR(){const g=new THREE.Group();bx(g,60,26,40,0x8d8a82,0,0,0);for(const x of[-18,0,18])cy(g,3.5,70,0x9b9890,x,0,30);for(const x of[-30,30])cy(g,14,34,0xb8b5ad,x+(x>0?40:-40),0,-30);return g;},
  FUELD(){const g=new THREE.Group();for(let i=0;i<6;i++)cy(g,11,13,0xd8d6cf,(i%3-1)*30,0,(i<3?-1:1)*16);bx(g,20,6,12,0x7d7a70,55,0,0);return g;},
  RAILY(){const g=new THREE.Group();for(let i=0;i<5;i++)bx(g,4,4,140,i%2?0x6b4a3a:0x55606a,(i-2)*7,0,0);bx(g,30,12,50,0x8a8678,30,0,-20);return g;},
  FACT(){const g=new THREE.Group();bx(g,90,16,60,0x9a968c,0,0,0);for(const x of[-30,-10,10,30])bx(g,14,6,60,0x7f7b72,x,16,0);cy(g,3,40,0x6e6b64,40,0,25);return g;}};
 if(window.CMESH)Object.assign(CMESH,B);else window.CMESH=B;
 if(typeof GTY!=='undefined')for(const k in KINDS)GTY[k]={n:KINDS[k].n,hp:KINDS[k].hp,arm:0,r:k==='RAILY'?40:k==='FACT'?45:35,tgt:1};
 if(typeof gMesh==='function'){const _g=gMesh;try{gMesh=function(kind){return B[kind]?B[kind]():_g(kind);};}catch(e){}}}
const S=()=>{const st=W.st;if(!st)return null;return st.tg||(st.tg={dead:{},harm:[],tot:{bld:0,kLo:0,kHi:0,iLo:0,iHi:0}});};
const key=(lat,lon)=>lat.toFixed(3)+','+lon.toFixed(3);
const sideOf=a3=>{const p=W.st&&W.st.c[a3];return p&&p.side&&(p.al==='CORE'||p.al==='ALLY')?p.side:null;};
const mySide=()=>{const WS=window.WSORTIE&&WSORTIE.WS;if(WS&&WS.on&&W.st)return W.st.c[WS.me].side;return(typeof game!=='undefined'&&game.team==='RED')?'R':'B';};
/* ------------------------------------------------------------------ placing infrastructure in the region */
const placed=[];
function place(){for(const u of placed.splice(0))u._gone=1;const st=W.st;if(!WF.on||!st||!WF.towns)return;const s=S(),me=mySide(),order=['PWR','FUELD','RAILY','FACT'];let n=0;
  for(const t of WF.towns.slice(0,40)){if(n>=14)break;if(t.pop<40000)continue;const ll=G.xz2ll(t.x,t.z),c=G.countryAt(ll.lat,ll.lon);if(!c)continue;const sd=sideOf(c.a3);if(!sd)continue;
    let hs=0;for(const ch of t.name)hs=(hs*31+ch.charCodeAt(0))>>>0;const k=order[(hs+n)%4],ks=[k];if(t.pop>400000)ks.push(order[(order.indexOf(k)+2)%4]);
    for(const kind of ks){let best=null;for(const a of[0,1.3,2.6,3.9,5.2])for(const r of[2200,3200,4200]){const x=t.x+Math.cos(a)*r,z=t.z+Math.sin(a)*r,h=groundAt(x,z);
        if(h<3||(WF.nearRunway&&WF.nearRunway(x,z)))continue;if(Math.abs(groundAt(x+80,z)-h)>8||Math.abs(groundAt(x,z+80)-h)>8)continue;best={x,z};break;}
      if(!best)continue;const bl=G.xz2ll(best.x,best.z),kk=kind+'@'+key(bl.lat,bl.lon);
      const u=GND.add(kind,sd===me?0:1,best.x,best.z,(a=>a)(Math.round(ll.lon*37)%360));u._ws=c.a3;u._infra=kind;u._key=kk;u.callsign=KINDS[kind].n+' · '+t.name;placed.push(u);n++;
      if(s.dead[kk]&&u.alive){u.hp=0;u.alive=false;u.mesh.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.multiplyScalar(.25);}});}}}}
// worldflight.js calls its own build() internally: hook the public entry points that rebuild the region
for(const k of['start','rebase']){const _f=WF[k];WF[k]=async function(){const r=await _f.apply(this,arguments);try{if(WF.on&&W.st)place();}catch(e){console.warn('[targets]',e);}return r;};}
/* ------------------------------------------------------------------ destroyed infrastructure -> the world war */
if(typeof GUnit!=='undefined'){const _k=GUnit.prototype.kill;GUnit.prototype.kill=function(src){const was=this.alive,r=_k.apply(this,arguments);
  if(was&&!this.alive&&this._infra&&W.st)try{const s=S(),p=W.st.c[this._ws];s.dead[this._key]=1;if(p){const e=p.ecn||(W.econ&&W.econ.init(p),p.ecn);
      if(e){if(this._infra==='PWR'){e.infra=Math.max(.2,e.infra-.03);}else if(this._infra==='FUELD'){e.fuel=Math.max(0,e.fuel-3);}else if(this._infra==='RAILY'){e.infra=Math.max(.2,e.infra-.02);e.trans=Math.max(.2,e.trans-.05);}else if(this._infra==='FACT'&&p.econ!=null){p.econ=Math.max(.5,p.econ-.01);}}
      const by=src===player?'your aircraft':src&&src.side!=null?(src.side===0?'friendly':'enemy')+' aircraft':'an unknown attacker';
      W.emit('INFRA',{e:[p.a3],cf:'CONFIRMED',txt:this.callsign+' ('+p.n+') destroyed by '+by+'.'+(this._infra==='PWR'?' Power cuts follow for the people it served.':this._infra==='FUELD'?' Fuel for the military and for civilians is lost.':'')});}}catch(e){console.warn('[targets]',e);}
  return r;};}
/* ------------------------------------------------------------------ civilian harm */
function military(x,z,side,R){for(const u of GND.units){if(!u.T||!u.T.tgt||u.side===side||u._gone)continue;const dx=u.pos.x-x,dz=u.pos.z-z;if(dx*dx+dz*dz<R*R)return u;}return null;}
function blastHarm(p,w,src){if(!WF.on||!WF.bldg||!WF.townMesh||!W.st)return;const Rb=Math.max(15,(w&&w.soft||15)*1.3);let n=0,hit=[];
  for(const b of WF.bldg){if(!b[7])continue;const dx=b[0]-p.x,dz=b[1]-p.z;if(dx*dx+dz*dz>(Rb+Math.max(b[3],b[4])/2)**2)continue;b[7]=0;n++;hit.push(b);}
  if(!n)return;const M=new THREE.Matrix4().makeScale(0,0,0);for(const b of hit){WF.townMesh.setMatrixAt(b[6],M);smoke.emit(new THREE.Vector3(b[0],b[2]+4,b[1]),null,20,14,40,.22,.2,.18,.7,.3);}
  WF.townMesh.instanceMatrix.needsUpdate=true;
  // who and what: the side whose weapon it was; an enemy military objective nearby or not
  const srcSide=src&&src.side!=null?src.side:null,me=mySide(),side=srcSide===0?me:srcSide===1?(me==='B'?'R':'B'):null;
  const mil=srcSide!=null?military(p.x,p.z,srcSide,400):null,far=srcSide!=null?military(p.x,p.z,srcSide,1000):null;
  const cat=mil?'COLLATERAL':far?'COLLATERAL':'CIVILIAN_AREA';
  const ll=G.xz2ll(p.x,p.z),c=G.countryAt(ll.lat,ll.lon),hr=((typeof ENV!=='undefined'?ENV.tod:12)+24)%24,occ=(hr<6||hr>21?.85:.45)*2.6;
  const town0=(WF.towns||[]).reduce((a,t)=>{const d=Math.hypot(t.x-p.x,t.z-p.z);return!a||d<a.d?{t,d}:a;},null);
  const res=W.cemetery?W.cemetery.buildingDeaths(n,town0?town0.t.name:(c?c.n:null),c&&c.a3,hr):{occ:0,k:0,inj:0},est={k:res.k,inj:res.inj};   /* occupants resolved one by one (cemetery.js); no estimate */
  const s=S();s.tot.bld+=n;s.tot.k=(s.tot.k||0)+res.k;s.tot.inj=(s.tot.inj||0)+res.inj;
  const town=(WF.towns||[]).reduce((a,t)=>{const d=Math.hypot(t.x-p.x,t.z-p.z);return!a||d<a.d?{t,d}:a;},null);
  const rec={t:W.st.t,cat,n,est,side,by:src===player?'PLAYER':src&&src.callsign||'unknown',country:c&&c.a3,town:town&&town.t.name,mil:mil&&mil.callsign};s.harm.push(rec);if(s.harm.length>300)s.harm.shift();
  const txt=(cat==='COLLATERAL'?'Civilian harm in an attack on a military objective'+(mil?' ('+mil.callsign+')':'')+': ':'Attack on a civilian area: ')+n+' building'+(n>1?'s':'')+' destroyed in '+(town?town.t.name:'a town')+(c?' ('+c.n+')':'')+
    '; '+(est.k?est.k+' '+(est.k>1?'people':'person')+' killed':'no one killed')+(est.inj?' and '+est.inj+' injured':'')+'. Responsibility: '+(side?(side==='B'?'BLUEFOR':'REDFOR'):'unknown')+'.';
  const e=W.emit('CIVHARM',{e:c?[c.a3]:[],cf:'REPORTED',loc:[ll.lat,ll.lon],txt});
  if(W.society){const N=W.society.news();N.inv.push({id:'INV'+(N.inv.length+1),ev:e&&e.id,ty:'CIVHARM',cat,txt,opened:W.st.t,due:W.st.t+24*(10+Math.random()*25),st:'OPEN',blamed:side});}
  if(side&&W.st.soc){W.st.soc.leg[side]=Math.max(0,W.st.soc.leg[side]-.005*n*(cat==='CIVILIAN_AREA'?2:1));if(W.st.nat)W.st.nat.coh[side]=Math.max(0,W.st.nat.coh[side]-.002*n*(cat==='CIVILIAN_AREA'?2:1));}
  if(src===player){flash(cat==='CIVILIAN_AREA'?'CIVILIAN AREA HIT · AN INVESTIGATION WILL FOLLOW':'CIVILIAN BUILDINGS HIT · CIVILIAN HARM RECORDED',3500);W.listeners.forEach(f=>{try{f({ty:'PLAYER_HARM',rec});}catch(_){}});}}
{const _b=GND.blast.bind(GND);GND.blast=function(p,w,src){const r=_b(p,w,src);try{blastHarm(p,w,src);}catch(e){console.warn('[targets]',e);}return r;};}
W.targets={KINDS,place,blastHarm,S,placed};
})();
