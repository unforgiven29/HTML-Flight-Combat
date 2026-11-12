/* v309 — airframe fixes loaded after the jet files.
   * F-4B / F-4J / F-4E: AIM-9s ride only on the inboard wing pylons (stations 2 and 8, the ones that also take the AGM-65 rack), two per side, four in all.
     The third sub-station of each pylon (2c / 8c) takes no Sidewinder. */
(function(){'use strict';
if(typeof STN==='undefined')return;
const aam9=t=>/^AIM-9/.test(t);
for(const ac of['F-4E','F-4J','F-4B']){const S=STN[ac];if(!S)continue;
  for(const k of['2c','8c'])if(Array.isArray(S[k]))S[k]=S[k].filter(t=>!aam9(t));
  for(const k of['1','9'])if(Array.isArray(S[k]))S[k]=S[k].filter(t=>!aam9(t));
  const strip=L=>{if(!L||!L[ac])return;for(const k of['1','9','2c','8c'])if(L[ac][k]&&aam9(L[ac][k]))delete L[ac][k];};
  try{for(const era of Object.keys(LOAD))strip(LOAD[era]);strip(typeof STRIKE_LOAD!=='undefined'?STRIKE_LOAD:null);}catch(e){}}
// the loadout validator keeps four at most even if a saved loadout asks for more
try{const _v=validLoad;validLoad=function(ac,era,o){const out=_v.apply(this,arguments);
  if(ac==='F-4E'||ac==='F-4J'||ac==='F-4B'){let n=0;for(const k of['2','2b','8','8b'])if(out[k]&&aam9(out[k]))n++;
    for(const k of Object.keys(out))if(aam9(out[k])&&!['2','2b','8','8b'].includes(k))delete out[k];}
  return out;};}catch(e){}
console.info('[jetfixes] F-4 Sidewinders on 2 / 2b / 8 / 8b only');
})();
