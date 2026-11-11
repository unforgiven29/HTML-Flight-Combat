/* ======================================================================================================================
   v287 — Flight-model calibration for the 70 added jets.

   The existing jets have `ENG_SUP` (reheat trim) solved so the clean, half-fuel airframe tops out at its published maximum Mach at
   11 km. The added jets had inherited their parent's trim, so e.g. the F-101B reached M3.0, the Tornado F.3 M3.1, the A-10 M1.0
   and the JA 37 only M1.3. This pass solves each one against its published maximum Mach (open sources: manufacturer / operator
   data, Jane's-class figures, clean aircraft at altitude):
     1. reheated jets: bisect the supersonic reheat trim (ENG_SUP) between -0.95 and +1.6;
     2. still too fast (dry jets, or trim at its floor): add a wave-drag rise that begins at 90 % of the published Mach;
     3. still too slow with the trim at its ceiling: scale the wave-drag table down.
   Reheated jets with no Mach limit of their own get one 0.15 above published (engine overheat past it, same mechanic as the older jets).
   The check itself is `acPerf()` — the same drag and thrust code the flight model runs.
   ====================================================================================================================== */
(function(){
'use strict';
if(typeof acPerf==='undefined'||typeof ENG_SUP==='undefined'||typeof PERF==='undefined')return;
// published maximum Mach, clean, at altitude
const PUB={
 'F-15EX':2.5,'F-18F':1.7,'EA-18G':1.6,'F-22':2.25,'F-35A':1.6,'A-10C':.68,'F-2A':2.0,'EF-2000':2.0,'Rafale':1.8,'Mirage 2000-5':2.2,
 'JAS-39C':2.0,'JAS-39E':2.0,'KF-21':1.8,'MiG-35':2.25,'Su-30MKI':2.0,'Su-30MKM':2.0,'Su-34':1.8,'Su-57':2.0,'J-10C':2.0,'J-16':2.0,
 'J-15T':2.2,'J-20':2.0,'JF-17':1.6,'Yak-130':.86,
 'F-4J':2.2,'F-4B':2.2,'F-101B':1.72,'F-102A':1.25,'F-105D':2.08,'F-104G':2.0,'F-5A':1.4,'A-6E':.88,'A-37B':.75,'Hunter F.6':.94,
 'Harrier GR.3':1.0,'Sea Harrier FRS.1':1.0,'Buccaneer S.2B':.88,'Tornado F.3':2.2,'JA 37':2.0,'Mirage 5':2.0,'Kfir C2':2.3,
 'MiG-17F':.93,'MiG-21MF':2.05,'Su-7BMK':1.6,'Su-15TM':2.1,'Tu-128':1.65,'Yak-28P':1.88,'J-6':1.3,'Q-5':1.12,
 'F-16V':2.0,'F-16E':2.0,'F-16I':2.0,'F-15I':2.5,'Tornado ECR':2.2,'Mirage 2000D':2.2,'Sea Harrier FA2':1.0,'Harrier GR.9':1.0,
 'Tejas Mk1A':1.6,'FA-50':1.5,'M-346FA':.95,'F-CK-1':1.8,'Kfir Block 60':2.0,'MiG-29K':2.25,'MiG-31BM':2.83,'Su-25SM3':.82,'Su-25T':.82,
 'J-11B':2.2,'J-35':1.8,'JH-7A':1.75,'J-7G':2.0};
const rise=(t,c,M0)=>{const o=[];for(let i=0;i<=72;i++){const M=+(i*.05).toFixed(2);o.push([M,tab(t,M)+c*Math.pow(Math.max(0,M-M0),2)]);}return o;};
const scale=(t,f)=>t.map(([m,v])=>[m,v*f]);
const vhi=id=>{delete PERF[id];const p=acPerf(id);return p?p.vHi:0;};
const out={};
for(const [id,tgt] of Object.entries(PUB)){const A=AC[id];if(!A||A.cargo)continue;try{
  const base={cdm:A.cdm,sw:A.swing?A.swing.cdm.map(t=>t):null,sup:ENG_SUP[A.name]||0};
  const setCdm=f=>{A.cdm=f(base.cdm);if(A.swing){A.swing.cdm=base.sw.map(f);A.swing.cache={};}};
  const v0=vhi(id);let note='';
  const ok=v=>Math.abs(v-tgt)<=tgt*.02;
  if(!ok(v0)){
    const ab=A.ab>A.mil*1.05;
    if(ab){let lo=-.95,hi=1.6;ENG_SUP[A.name]=hi;const vh=vhi(id);ENG_SUP[A.name]=lo;const vl=vhi(id);
      if(tgt>vh){ENG_SUP[A.name]=hi;let a=.15,b=1;for(let i=0;i<16;i++){const f=(a+b)/2;setCdm(t=>scale(t,f));if(vhi(id)<tgt)b=f;else a=f;}setCdm(t=>scale(t,(a+b)/2));note='trim max + drag x'+((a+b)/2).toFixed(2);}
      else if(tgt>=vl){for(let i=0;i<18;i++){const m=(lo+hi)/2;ENG_SUP[A.name]=m;if(vhi(id)<tgt)lo=m;else hi=m;}ENG_SUP[A.name]=hi;note='trim '+hi.toFixed(2);}
      else{ENG_SUP[A.name]=lo;note='trim floor';}}
    if(vhi(id)>tgt*1.02){let a=0,b=60;for(let i=0;i<20;i++){const c=(a+b)/2;setCdm(t=>rise(t,c,tgt*.9));if(vhi(id)>tgt)a=c;else b=c;}setCdm(t=>rise(t,(a+b)/2,tgt*.9));note+=(note?' + ':'')+'drag rise '+((a+b)/2).toFixed(1);}
  }
  if(tgt>1.05&&A.ab>A.mil*1.05&&A.mlim==null)A.mlim=+(tgt+.15).toFixed(2);
  const v1=vhi(id);out[id]={pub:tgt,before:+v0.toFixed(2),after:+v1.toFixed(2),note};
}catch(e){console.warn('[fmcal] '+id,e);}}
// small stat corrections found while checking guns / stores against published data
try{const f3=AC['Tornado F.3'],ecr=AC['Tornado ECR'];if(ecr&&f3&&(!ecr.gun||ecr.gun.ammo===0)){ecr.gun=Object.assign({},f3.gun,{ammo:180});}
  if(AC['JF-17']&&AC['JF-17'].gun)AC['JF-17'].gun.ammo=250;}catch(e){}
window.FMCAL=out;
console.info('[fmcal] calibrated '+Object.keys(out).length+' jets to published max Mach');
})();
