/* ======================================================================================================================
   v302 — Navigation errors that matter (js/navphys.js, window.NAVW)

   sensorphys2.js already worked out an inertial-navigation drift figure and a GPS-jammed flag, but nothing set the flag and nothing read
   the error. Now:
   * GPS jamming: hostile ground radar sites carry jammers (1S91 SURN site 35 km, ZSU 6 km, other emitters scaled by their range). Inside a
     jammed area the GPS lock is lost; the receiver falls back to the INS (sys.gpsJam is what sensorphys2 reads).
   * INS drift: with GPS lost the position error grows at the INS drift rate (ownInsDriftNmPerHour, 0.8 NM/h default) in a fixed random
     direction. When GPS comes back the error is pulled out with a ~15 s time constant.
   * What it moves: the CCIP pipper (an unguided bomb or rocket released on a pipper over the target lands that far off). A HUD message
     marks GPS loss and recovery. sys.gpsJamForce = true forces jamming (scenarios, tests).
   Not done: spoofing (a sudden position jump), INS error in waypoint / HSI steering, SNS designations.
   Gameplay-level estimates, not published data. Switch: NAVW.on.
   ====================================================================================================================== */
(function(){'use strict';
if(typeof GND==='undefined'||typeof radar==='undefined'||typeof sys==='undefined')return;
const N=window.NAVW={on:true,E:new THREE.Vector3(),mag:0,jam:false,dir:0,k:1,st:{lost:0,ccip:0}};
const jamR=T=>T.gpsj!=null?T.gpsj:T.kind==='SURN'||T.n&&/SURN/.test(T.n)?35000:T.R0>=40000?35000:T.R0>=15000?6000:0;
function jammed(P){if(sys.gpsJamForce)return true;if(!GND.units)return false;
  for(const u of GND.units){if(!u.alive||!u.T||!u.T.emit||u.side===P.side)continue;const r=jamR(u.T);if(r>0&&u.pos.distanceTo(P.pos)<r)return true;}return false;}
const _t=radar.update;radar.update=function(dt){const r=_t.apply(this,arguments);try{N.tick(dt);}catch(e){N.err=String(e&&e.message||e);}return r;};
N.tick=function(dt){const P=player;if(!N.on||!P||!P.alive){N.mag=0;return;}
  const j=jammed(P),was=N.jam;N.jam=j;sys.gpsJam=j;
  const rate=((typeof SENSOR_FUSE!=='undefined'&&SENSOR_FUSE.reg&&SENSOR_FUSE.reg.ownInsDriftNmPerHour)||.8)*1852/3600*N.k;
  if(j&&!was){N.dir=Math.random()*Math.PI*2;N.st.lost++;if(typeof flash==='function'&&!P.ac.noNav)flash('GPS LOST · INS',1800);}
  if(!j&&was&&typeof flash==='function'&&N.mag>20)flash('GPS RECOVERED',1200);
  N.mag=j?N.mag+rate*dt:N.mag*Math.exp(-dt/15);if(!j&&N.mag<.05)N.mag=0;
  N.E.set(Math.sin(N.dir)*N.mag,0,-Math.cos(N.dir)*N.mag);};
{const _c=GND.ccip;GND.ccip=function(P,kind){const r=_c.apply(this,arguments);if(r&&r.p&&P===player&&N.on&&N.mag>1){r.p=r.p.clone().add(N.E);N.st.ccip++;}return r;};}   // the pipper is drawn where the INS thinks the bomb lands, so the real impact is displaced by the error
console.info('[navphys] v302 GPS jamming and INS drift');
})();
