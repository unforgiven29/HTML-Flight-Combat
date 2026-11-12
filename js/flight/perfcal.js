/* v2 — top-speed calibration. Scales each jet's transonic / supersonic drag rise (cdm) so its clean, full-afterburner level top speed at 11 km
   in this sim lands on the published maximum Mach. The factors were fitted by flying each jet in the full sim (every drag / thrust layer included):
   tools fit the Mach where level acceleration reaches zero. Subsonic drag, lift, thrust and handling are untouched. Swing-wing jets: full-sweep table.
   too slow: the whole drag rise above M0.9 is lowered; too fast: only the drag from M0 up is raised, so the transonic hump is left alone.
   Targets and results: docs/CALIBRATION.md. */
(function(){'use strict';
if(typeof AC==='undefined'){console.warn('[perfcal] AC missing');return;}
// jet: [target Mach at 11 km, drag factor, M0]
const FIT=window.PERFCAL_FIT||{"F-16V":[2.0,0.655,1.2],"F-16E":[2.0,0.655,1.2],"F-16I":[2.0,0.708,1.2],"F-15C":[2.5,0.479,1.2],"F-15EX":[2.5,0.931,1.2],"F-15I":[2.5,0.895,1.2],"F-18C":[1.8,0.479,1.2],"F-18E":[1.6,0.35,1.2],"F-18F":[1.6,0.655,1.2],"F-4E":[2.23,0.611,1.12],"F-4J":[2.2,0.538,1.11],"F-4B":[2.2,0.605,1.09],"MiG-29":[2.25,0.479,1.2],"MiG-29S":[2.25,0.479,1.2],"MiG-29SMT":[2.25,0.479,1.2],"MiG-29K":[2.0,1.089,1.75],"MiG-35":[2.25,0.861,1.2],"Su-27":[2.35,0.479,1.2],"Su-27SM":[2.35,0.479,1.2],"J-11":[2.35,0.479,1.2],"J-11B":[2.35,0.655,1.2],"Su-33":[2.17,0.409,1.2],"Su-30SM":[2.0,0.796,1.2],"Su-30MK2":[2.0,0.968,1.2],"Su-30MKI":[2.0,0.766,1.2],"Su-30MKM":[2.0,0.766,1.2],"Su-35S":[2.25,0.861,1.2],"Su-34":[1.8,1.047,1.55],"Su-57":[2.0,1.007,1.75],"F-22":[2.25,1.047,2],"F-35A":[1.6,1.047,1.35],"EF-2000":[2.0,0.968,1.2],"Rafale":[1.8,1.047,1.55],"Mirage 2000-5":[2.2,0.655,1.2],"JAS-39C":[2.0,0.895,1.2],"JAS-39E":[2.0,0.655,1.2],"KF-21":[1.81,0.766,1.2],"F-2A":[2.0,0.708,1.2],"J-10C":[1.8,1.225,1.55],"J-16":[2.0,1.047,1.75],"J-20":[2.0,1.047,1.75],"J-35":[1.8,1.047,1.55],"JF-17":[1.6,1.047,1.35],"Tejas Mk1A":[1.6,1.007,1.35],"FA-50":[1.5,1.047,1.25],"F-CK-1":[1.8,0.895,1.2],"Kfir C2":[2.3,0.605,1.08],"Yak-141":[1.7,1.377,1.45],"J-7G":[2.0,0.498,1.2],"F-20":[2.0,0.708,1.2],"F-5E":[1.6,0.488,1.06],"F-5A":[1.4,0.655,1.02],"F-104S":[2.2,1.611,1.95],"F-104G":[2.0,0.668,1.2],"F-102A":[1.25,0.715,0.9],"F-101B":[1.72,0.655,1.2],"F-105D":[2.08,0.498,1.14],"F-100A":[1.3,0.324,0.9],"F-8E":[1.86,0.409,1.01],"AJS-37":[2.0,0.46,1.04],"JA 37":[2.0,0.708,1.1],"Lightning F.6":[2.0,1.111,1.75],"Mirage F1":[2.2,0.394,1.08],"Tornado GR.4":[2.2,2.478,1.95],"Tornado ECR":[2.2,0.56,1.2],"F-111F":[2.5,1.225,2.25],"Su-24M":[1.56,1.225,1.31],"Su-22M4":[1.7,0.35,1.14],"Su-7BMK":[1.74,0.518,1.0],"MiG-27K":[1.7,0.655,1.2],"Tu-128":[1.6,0.736,1.16],"Mirage 2000":[2.2,0.5,0.9],"Mirage 2000D":[2.2,0.5,0.9],"Kfir Block 60":[2.3,0.5,0.9],"JH-7A":[1.75,0.5,0.9],"Mirage 5":[2.2,0.5,0.9],"MiG-19":[1.35,0.5,0.9],"J-6":[1.35,0.5,0.9],"F-106A":[2.3,0.3,0.9],"J 35F":[2.0,0.3,0.9],"Mirage III":[2.2,0.3,0.9],"Jaguar":[1.6,0.3,0.9]};
const ORIG={};
function scaled(c,f,M0){return c.map(([m,v])=>[m,m>=M0?v*Math.pow(f,Math.min(1,(m-M0)/.2)):v]);}
function apply(k,f,M0){const a=AC[k];if(!a)return;
  if(!ORIG[k])ORIG[k]=a.swing&&a.swing.cdm?{sw:a.swing.cdm.map(c=>c.map(p=>p.slice()))}:{c:a.cdm.map(p=>p.slice())};
  const o=ORIG[k];if(o.sw){a.swing.cdm=o.sw.map(c=>scaled(c,f,M0));a.swing.cache={};}else a.cdm=scaled(o.c.concat(o.c[o.c.length-1][0]<3?[[3.4,o.c[o.c.length-1][1]]]:[]),f,M0);}
// thrust-limited jets: the afterburner ram-recovery term above M1.2 is raised (inlet / nozzle schedule the generic engine model lacks)
const TB=window.PERFCAL_TB||{"F-16":0.469,"F-16C":0.406,"F-15E":0.281,"EA-18G":0.813,"MiG-21":0.281,"MiG-21MF":0.281,"F-14A":0.469,"F-14B":0.438,"F-14D":0.438,"MiG-23":0.25,"Kfir Block 60":4,"J-8F":0.563,"JH-7":0.688,"JH-7A":0.219,"Tornado F.3":0.375,"Su-15TM":0.594,"Yak-28P":0.109,"Mirage 2000":0.625,"Mirage 2000D":0.25,"Mirage 5":0.5,"F-106A":0.25,"J 35F":0.648,"Mirage III":0.477,"Jaguar":0.191};
if(typeof engRatio==='function'){const _r=engRatio;window.engRatio=function(ac,M,h){const r=_r(ac,M,h),b=ac&&ac.perfTB;if(!b||M<=1.2)return r;const k=1+b*Math.min(1,(M-1.2)/.8);return[r[0],r[1],r[2]*k];};}
function setTB(k,b){const a=AC[k];if(a)a.perfTB=b;}
window.PERFCAL={apply,setTB,FIT,TB};
for(const k of Object.keys(TB))setTB(k,TB[k]);
for(const k of Object.keys(FIT)){const [,f,M0]=FIT[k];apply(k,f,M0);}
console.log('[perfcal] top speeds fitted: '+Object.keys(FIT).length);
})();
