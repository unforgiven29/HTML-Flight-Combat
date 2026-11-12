"use strict";
/* v294 - ramjet data for the air-to-ground rounds that fly on the same sustainer model as the Kh-31PD (flyMavs / armStep: after the booster the
   ramjet holds a Mach limit for `sus` seconds). Loaded last so the per-weapon entries are final when this runs. */
(function(){
if(typeof AGW==='undefined')return;
const R={'Kh-31A':{sus:60,mach:2.8},'Kh-31AD':{sus:110,mach:3.0}};
for(const k of Object.keys(R))if(AGW[k])Object.assign(AGW[k],{ramjet:1},R[k]);
})();
