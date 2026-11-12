/* v312 — 9K121 Vikhr launchers: APU-6 (6 rounds) on the Ka-50's outer pylons, APU-8 (8 rounds) on the Su-25T / Su-25SM3 pylons 3 and 8.
   Built on the multiple-carriage sub-rail system (a lower-case key is the next round on the same pylon: 1, 1b ... 1f). Game-level figures. */
(function(){
'use strict';
if(typeof RACKS==='undefined'||typeof AC==='undefined'||!AGW.Vikhr){console.warn('[vikhr] game missing');return;}
const VK={};
window.vikhrRack=function(id,stations,n){const A=AC[id];if(!A||!STN[id])return false;
  const subs={},r=n>6?.34:.28;
  for(let i=1;i<n;i++){const a=(i-1)/(n-1)*Math.PI*2-Math.PI/2;subs[String.fromCharCode(97+i)]=[r*Math.cos(a),r*Math.sin(a),0];}
  RACKS[id]={st:stations.slice(),subs,cats:[{t:['Vikhr'],n,st:stations.slice(),rack:n>6?'APU-8':'APU-6'}]};
  for(const k of stations){const p=A.st[k];if(!p)continue;const side=Math.sign(p[0])||1;
    if(!STN[id][k].includes('Vikhr'))STN[id][k].unshift('Vikhr');
    for(const [sx,[dx,dy,dz]] of Object.entries(subs)){A.st[k+sx]=[p[0]+dx*side,p[1]+dy,p[2]+dz];STN[id][k+sx]=[];}}
  // one weapon, not a choice of rounds: the launcher always carries its full set, so the loadout screen only shows the pylon
  const vs=Object.assign({},A.st);for(const k of stations)for(const sx of Object.keys(subs))delete vs[k+sx];A.vst=vs;
  (VK[id]=VK[id]||{n,st:stations.slice()});
  return true;};
const full=(st,n)=>{const o={};for(const k of st){o[k]='Vikhr';for(let i=1;i<n;i++)o[k+String.fromCharCode(97+i)]='Vikhr';}return o;};
window.vikhrFull=full;
{const _v=validLoad;validLoad=function(ac,era,o){const L=_v.call(this,ac,era,o),v=VK[ac];if(!v)return L;
  for(const k of v.st)if(L[k]==='Vikhr')for(let i=1;i<v.n;i++)L[k+String.fromCharCode(97+i)]='Vikhr';return L;};}
for(const id of['Su-25T','Su-25SM3']){if(!AC[id])continue;vikhrRack(id,['3','8'],8);
  for(const era of['cold','modern']){const L=LOAD[era]&&LOAD[era][id];if(L&&id==='Su-25T'){Object.assign(L,full(['3','8'],8));}}}
})();
