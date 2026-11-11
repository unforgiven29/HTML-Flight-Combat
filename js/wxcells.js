/* Shared precipitation cells (v303): one field that the radar and the cockpit rain both read, so a storm on the scope is a storm outside.
   The pattern is fixed to the world and carried along by the real wind at storm height (ENV.windAt), instead of the old made-up 6 m/s drift.
   Coverage follows ENV.rain; gameplay-level estimate, not meteorological data. */
(function(){
const H=(i,j)=>{let h=(i*374761393+j*668265263)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967295;};
const S=q=>q*q*(3-2*q);
function noise(u,v){const i=Math.floor(u),j=Math.floor(v),fu=S(u-i),fv=S(v-j),a=H(i,j),b=H(i+1,j),c=H(i,j+1),d=H(i+1,j+1);return a+(b-a)*fu+(c-a)*fv+(a-b-c+d)*fu*fv;}
const W={x:0,z:0,y:0};
const WXC=window.WXC={on:true,cell:7000,
  /* rain intensity 0..1 at world x,z and time t (s) */
  at(x,z,t){const E=typeof ENV!=="undefined"?ENV:null;if(!E||!(E.rain>.02))return 0;
    if(!WXC.on)return 1;
    E.windAt(3000,W);const u=(x-W.x*t)/WXC.cell,v=(z-W.z*t)/WXC.cell;
    const n=.65*noise(u,v)+.35*noise(u*2.7+11,v*2.7-5);          // large cells with smaller towers inside
    const th=1-.62*Math.min(1,E.rain*2.2);                       // heavier weather covers more of the map
    return Math.max(0,Math.min(1,(n-th)/(1-th)*1.6));},
  here(pos){return WXC.at(pos.x,pos.z,performance.now()/1000);}};
})();
