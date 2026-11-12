/* =====================================================================================================================
   v233 — jammer and ELINT pods as real stores, and missile approach warning (MAWS).
   * ECM pods (ALQ-119, ALQ-131, ALQ-184, Sky Shadow) are no longer an invisible fit: they hang on a station like the TGP, take its
     place, weigh and drag as a store, and the jammer only works while the pod is loaded. Internal jammers are unchanged.
   * The L-080 Fantasmagoria ELINT pod is a station store too: it gives Soviet / Russian jets the pod-based emitter location
     (HAD-like) the HTS gives the F-16C.
   * MAWS: Su-24M Mak-UL (IR, dorsal), Mirage 2000 DDM SAMIR (IR, a pod on the Magic II wingtip pylons, stations 1P / 9P,
     carried alongside the missiles). A missile coming at you with its motor burning inside the sensor's range lights the launch warning, sounds
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
  // L-005S Sorbtsiya-S: one pod on each wingtip rail (stations 1 and 10), in place of the R-73s. Size and weight are gameplay estimates.
  'L-005S':{k:'ecm',mass:45,L:2.9,R:.1,col:0x7d857a},
  // DDM SAMIR: passive IR missile-approach sensor on the Magic II wingtip pylons (own pseudo-stations 1P / 9P, so it sits beside the missile). Size, weight and RCS are estimates.
  'DDM SAMIR':{k:'ecm',mass:14,L:.9,R:.07,col:0x5e666b,maws:1},
  'L-080':{k:'hts',mass:300,L:3.6,R:.19,col:0x7f8a86}});
// the signature table in game.js was filled before these stores existed, so without this the jet's RCS (own RCS + stores) came out NaN with a pod loaded
for(const k of['ALQ-119','ALQ-131','ALQ-184','Sky Shadow','L-005S','DDM SAMIR','L-080']){const a=AGW[k];if(a&&a.rcs==null){a.rcs=k==='L-005S'?.12:k==='DDM SAMIR'?.04:.35;a.irsB=a.irsC=.02;}}
Object.assign(SN,{'ALQ-119':'Q119','ALQ-131':'Q131','ALQ-184':'Q184','Sky Shadow':'SKYSH','L-005S':'L005S','DDM SAMIR':'SAMIR','L-080':'L080'});
Object.assign(STORE_NAME,{'ALQ-119':'AN/ALQ-119(V) jammer pod','ALQ-131':'AN/ALQ-131(V) jammer pod','ALQ-184':'AN/ALQ-184(V) jammer pod',
  'Sky Shadow':'Sky Shadow jammer pod','L-005S':'L-005S Sorbtsiya-S jammer pod (wingtip)','DDM SAMIR':'DDM SAMIR missile approach warning pod (wingtip)','L-080':'L-080 Fantasmagoria ELINT pod'});
try{MODERN_ONLY.add('ALQ-184');}catch(e){}
// jets whose jammer is a pod: type -> {era: pod}; preferred stations (left side first)
const POD={'F-16':{cold:'ALQ-131',modern:'ALQ-184',st:['5']},'F-16C':{cold:'ALQ-131',modern:'ALQ-184',st:['5']},
  'F-4E':{cold:'ALQ-119',modern:'ALQ-131',st:['3']},'A-7D':{cold:'ALQ-119',modern:'ALQ-131',st:['8','1']},
  'Tornado GR.4':{cold:'Sky Shadow',modern:'Sky Shadow',st:['1','9']}};
// Su-27 family: the jammer is the pair of L-005S wingtip pods, loaded on stations 1 / 10 instead of the R-73s; weight and drag come from the stores
for(const t of['Su-27','Su-27SM','Su-33','Su-30SM','Su-35S','Su-30MK2','J-11']){const S=STN[t];if(!S)continue;
  for(const k of['1','10'])if(Array.isArray(S[k]))S[k]=[...new Set([...S[k],'L-005S'])];
  for(const era of['cold','modern']){const f=ECM_FIT[t]&&ECM_FIT[t][era];if(f){f.kg=0;f.cd=0;f.pod='L-005S';}}}
// Mirage 2000: SAMIR pods on their own pylons beside the Magic II rails; they stay on when stores are jettisoned, like the missiles
try{for(const o of[typeof M2KST!=='undefined'?M2KST:null,AC['Mirage 2000']&&AC['Mirage 2000'].st])if(o){o['1P']=[-3.3,-.52,1.9];o['9P']=[3.3,-.52,1.9];}
  const m=STN['Mirage 2000'];if(m){m['1P']=['DDM SAMIR'];m['9P']=['DDM SAMIR'];}
  for(const k of Object.keys(LOAD))if(LOAD[k]&&LOAD[k]['Mirage 2000'])Object.assign(LOAD[k]['Mirage 2000'],{'1P':'DDM SAMIR','9P':'DDM SAMIR'});
  if(STRIKE_LOAD['Mirage 2000'])Object.assign(STRIKE_LOAD['Mirage 2000'],{'1P':'DDM SAMIR','9P':'DDM SAMIR'});
  const ac=(typeof AC!=='undefined'&&AC['Mirage 2000'])||null;if(ac){ac.keepJ=[...new Set([...(ac.keepJ||[]),'1P','9P'])];ac.rel=ac.rel||[];}}catch(e){console.warn('[pods] M2K SAMIR',e);}
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
// The warning logic itself moved to js/sensorsuite.js (MSS): it runs every frame from the aircraft step instead of from inside drawRWR,
// which the Mirage's own VCM display replaces (that is why the SAMIR never warned), and it covers DAS / UV / IR / AESA / IRST sensors.
// MAWS_FIT stays here as the table of pod-dependent fits that MSS reads.
window.MAWS_FIT={'Su-24M':{n:'Mak-UL',r:9000,cov:Math.PI},
  'Mirage 2000':{n:'DDM SAMIR',r:7000,cov:Math.PI*.85,need:P=>['1P','9P'].some(k=>P.load[k]==='DDM SAMIR')}};
})();
