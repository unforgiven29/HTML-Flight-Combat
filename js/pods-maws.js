/* =====================================================================================================================
   v233 — jammer and ELINT pods as real stores, and missile approach warning (MAWS).
   * ECM pods (ALQ-119, ALQ-131, ALQ-184, Sky Shadow) are no longer an invisible fit: they hang on a station like the TGP, take its
     place, weigh and drag as a store, and the jammer only works while the pod is loaded. Internal jammers are unchanged.
   * The L-080 Fantasmagoria ELINT pod is a station store too: it gives Soviet / Russian jets the pod-based emitter location
     (HAD-like) the HTS gives the F-16C.
   * MAWS: Su-24M Mak-UL (IR, dorsal), Mirage 2000 DDM SAMIR (IR, in the Magic 2 launch rails — only with Magic 2 on the
     wingtip rails). A missile coming at you with its motor burning inside the sensor's range lights the launch warning, sounds
     the tone and shows its bearing on the RWR scope, IR missiles included (which the RWR can never see).
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof AGW==='undefined'||typeof STN==='undefined'){console.warn('[pods] game not ready');return;}
// ---------------- stores ----------------
Object.assign(AGW,{
  'ALQ-119':{k:'ecm',mass:270,L:3.9,R:.2,col:0x6f7a70},
  'ALQ-131':{k:'ecm',mass:300,L:2.8,R:.21,col:0x8a9096},
  'ALQ-184':{k:'ecm',mass:260,L:3.95,R:.2,col:0x8a9096},
  'Sky Shadow':{k:'ecm',mass:250,L:3.4,R:.2,col:0x6c766c},
  'L-080':{k:'hts',mass:300,L:3.6,R:.19,col:0x7f8a86}});
Object.assign(SN,{'ALQ-119':'Q119','ALQ-131':'Q131','ALQ-184':'Q184','Sky Shadow':'SKYSH','L-080':'L080'});
Object.assign(STORE_NAME,{'ALQ-119':'AN/ALQ-119(V) jammer pod','ALQ-131':'AN/ALQ-131(V) jammer pod','ALQ-184':'AN/ALQ-184(V) jammer pod',
  'Sky Shadow':'Sky Shadow jammer pod','L-080':'L-080 Fantasmagoria ELINT pod'});
try{MODERN_ONLY.add('ALQ-184');}catch(e){}
// jets whose jammer is a pod: type -> {era: pod}; preferred stations (left side first)
const POD={'F-16':{cold:'ALQ-131',modern:'ALQ-184',st:['5']},'F-16C':{cold:'ALQ-131',modern:'ALQ-184',st:['5']},
  'F-4E':{cold:'ALQ-119',modern:'ALQ-131',st:['3']},'A-7D':{cold:'ALQ-119',modern:'ALQ-131',st:['8','1']},
  'Tornado GR.4':{cold:'Sky Shadow',modern:'Sky Shadow',st:['1','9']}};
const PODN=new Set(Object.keys(AGW).filter(k=>AGW[k].k==='ecm'));
// station geometry for the new pylons
try{if(typeof F16ST!=='undefined'&&!F16ST[5])F16ST[5]=[0,-.92,.9];}catch(e){}
try{if(typeof TORST!=='undefined'){if(!TORST[1])TORST[1]=[-3.75,-.2,1.1];if(!TORST[9])TORST[9]=[3.75,-.2,1.1];}}catch(e){}
for(const[t,p]of Object.entries(POD)){const S=STN[t];if(!S)continue;const pods=[...new Set([p.cold,p.modern])];
  for(const k of p.st){S[k]=[...new Set([...(S[k]||[]),...pods])];}
  // the jammer's own weight / drag now come from the store, not the fit
  for(const era of['cold','modern']){const f=ECM_FIT[t]&&ECM_FIT[t][era];if(f){f.kg=0;f.cd=0;f.pod=p[era];}}}
// fixed fits declared in coldwar-jets (A-7D, Tornado) live on the jet entry; patch those too
try{for(const t of['A-7D','Tornado GR.4']){const f=ECM_FIT[t];if(f)for(const era of['cold','modern'])if(f[era]){f[era].kg=0;f[era].cd=0;f[era].pod=POD[t][era];}}}catch(e){}
// ELINT pod on every jet that can carry the Kh-31P / Kh-58U anti-radiation missiles: on the first fuselage / inner station that takes them
for(const[t,S]of Object.entries(STN)){if(!S||typeof S!=='object')continue;const ks=Object.keys(S).filter(k=>Array.isArray(S[k])&&S[k].some(w=>w==='Kh-31P'||w==='Kh-58U'));
  if(!ks.length)continue;const pick=['C','3','4','5','2','6','8'].find(k=>ks.includes(k))||ks[0];S[pick]=[...new Set([...S[pick],'L-080'])];}
// default loads get the pod on a free preferred station so the AI keeps its jammer
const putPod=(L,t,era)=>{if(!L)return;const p=POD[t];if(!p)return;const pod=p[era]||p.cold;if(Object.values(L).some(s=>PODN.has(s)))return;
  for(const k of p.st){if(!L[k]){L[k]=pod;return;}}};
// strike configurations carry the jammer in place of a store
try{if(STRIKE_LOAD['F-4E'])STRIKE_LOAD['F-4E'][3]='ALQ-119';if(STRIKE_LOAD['A-7D'])STRIKE_LOAD['A-7D'][8]='ALQ-119';}catch(e){}
for(const t of Object.keys(POD)){for(const era of['cold','modern'])putPod(LOAD[era]&&LOAD[era][t],t,era);putPod(STRIKE_LOAD[t],t,'cold');}
// jammer only with its pod hanging
// pods are not weapons
{const _t=agTypes;agTypes=function(P){return _t(P).filter(t=>AGW[t].k!=='ecm');};}
{const _c=storeCat;storeCat=function(s){const a=AGW[s];if(a&&a.k==='ecm')return'PODS';return _c(s);};}
// L-080 counts as an emitter-location pod for the HAD-style mode
try{const _h=ARM.hts.bind(ARM);ARM.hts=function(P){return _h(P)||(!!P&&Object.values(P.load).includes('L-080'));};}catch(e){}
// pod meshes
{const _b=buildAG;buildAG=function(kind){const a=AGW[kind];if(!a||a.k!=='ecm'&&kind!=='L-080')return _b(kind);
  const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:a.col,roughness:.6,metalness:.25}),dk=new THREE.MeshStandardMaterial({color:0x2e3236,roughness:.7});
  const L=a.L,R=a.R,cyl=(r1,r2,l,mat,z)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,l,16),mat);c.rotation.x=Math.PI/2;c.position.z=z;g.add(c);return c;};
  cyl(R,R,L*.7,m,0);cyl(R*.35,R,L*.15,dk,-L*.43);cyl(R,R*.35,L*.15,dk,L*.43);
  // antenna fairings / radomes
  for(const z of[-L*.3,L*.3]){const f=new THREE.Mesh(new THREE.BoxGeometry(R*.7,R*.5,L*.12),dk);f.position.set(0,-R*.95,z);g.add(f);}
  return g;};}
// ---------------- MAWS ----------------
const MAWS={'Su-24M':{n:'Mak-UL',r:9000,cov:Math.PI},
  'Mirage 2000':{n:'DDM SAMIR',r:7000,cov:Math.PI*.85,need:P=>['1','9'].some(k=>P.load[k]==='Magic 2')}};
window.MAWS_FIT=MAWS;
const seen=new Map();let warnT=0;const warned=[];
function mawsOn(P){const f=MAWS[P.type];return!!f&&(!f.need||f.need(P));}
function mawsTick(dt){const P=player;warned.length=0;if(!P||!P.alive||!mawsOn(P))return;const f=MAWS[P.type],now=performance.now()/1000;
  const fw=P.fwd(new V3());
  for(const m of missiles){if(!m.alive||m.sh===P)continue;const d=m.pos.distanceTo(P.pos);if(d>f.r)continue;
    const to=m.vel.clone().normalize(),rel=P.pos.clone().sub(m.pos).normalize();if(to.dot(rel)<.6)continue;// not coming at us
    const burning=m.burning||(!(m.def&&m.def.ph&&m.def.ph.gap)&&m.t<((m.def&&m.def.burn)||3)+.5);if(!burning&&d>f.r*.35)continue;// plume detection, or very close
    warned.push(m);if(!seen.has(m.id)){seen.set(m.id,now);try{sfx.rwr('launch');}catch(e){}warnT=now+2;}}
  if(warned.length){try{sys.rwr.lampT=now+.6;rwrState.launchT=Math.max(rwrState.launchT,.6);}catch(e){}}
  for(const[id,t]of seen)if(now-t>60)seen.delete(id);}
// draw: red M at the missile bearing on the RWR scope, and a MAWS legend
{const _d=drawRWR;drawRWR=function(dt){_d(dt);try{mawsTick(dt);const P=player;if(!P||!mawsOn(P))return;const c=rwc,S=240,cx=S/2,cy=S/2,qi=P.q.clone().invert(),bl=performance.now()%300<170;
  c.save();c.font='700 11px "B612 Mono",monospace';c.textAlign='left';c.fillStyle=warned.length?'#ff4030':'rgba(160,200,170,.6)';c.fillText(MAWS[P.type].n,6,S-8);
  for(const m of warned){const r=m.pos.clone().sub(P.pos).applyQuaternion(qi),a=Math.atan2(r.x,-r.z),rr=S*.36;
    const x=cx+Math.sin(a)*rr,y=cy-Math.cos(a)*rr;c.strokeStyle=c.fillStyle='#ff3a24';c.lineWidth=2;
    c.beginPath();c.moveTo(x,y-11);c.lineTo(x+11,y);c.lineTo(x,y+11);c.lineTo(x-11,y);c.closePath();bl?c.fill():c.stroke();
    c.fillStyle=bl?'#000':'#ff3a24';c.font='700 12px "B612 Mono",monospace';c.textAlign='center';c.textBaseline='middle';c.fillText('M',x,y+1);}
  c.restore();}catch(e){}};}
// HUD cue: blinking MISSILE with a bearing caret at the top of the screen
{const _h=drawHUD;drawHUD=function(){_h.apply(this,arguments);try{const P=player;if(!P||!warned.length||!mawsOn(P))return;const cv=document.getElementById('hud');if(!cv)return;const c=cv.getContext('2d');
  if(performance.now()%400>250)return;c.save();c.setTransform(1,0,0,1,0,0);c.font='700 22px "B612 Mono",monospace';c.textAlign='center';c.fillStyle='#ff3a24';c.fillText('MISSILE',cv.width/2,cv.height*.16);
  const qi=P.q.clone().invert(),m=warned[0],r=m.pos.clone().sub(P.pos).applyQuaternion(qi),clk=Math.round(((Math.atan2(r.x,-r.z)*180/Math.PI+360)%360)/30)||12;
  c.font='700 16px "B612 Mono",monospace';c.fillText(clk+' O\'CLOCK',cv.width/2,cv.height*.16+22);c.restore();}catch(e){}};}
})();
