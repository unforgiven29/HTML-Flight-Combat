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
   v305: spoofing (a hostile emitter with a spoof radius, or sys.gpsSpoofForce, walks the fix away quietly: no GPS-lost warning) and the total nav
   error (INS + spoof, NAVW.tot) now reaches the HSI / waypoint distance and bearing, and a held SNS ground designation (not one tracked in the
   video) moves with the error in the nav frame.
   Gameplay-level estimates, not published data. Switch: NAVW.on.
   ====================================================================================================================== */
(function(){'use strict';
if(typeof GND==='undefined'||typeof radar==='undefined'||typeof sys==='undefined')return;
const N=window.NAVW={on:true,E:new THREE.Vector3(),tot:new THREE.Vector3(),mag:0,jam:false,dir:0,k:1,sp:0,spDir:0,spoof:false,st:{lost:0,ccip:0,spoof:0}};const _pt=new THREE.Vector3();
const jamR=T=>T.gpsj!=null?T.gpsj:T.kind==='SURN'||T.n&&/SURN/.test(T.n)?35000:T.R0>=40000?35000:T.R0>=15000?6000:0;
const spoofR=T=>T.spoof!=null?T.spoof:T.kind==='SURN'||T.n&&/SURN/.test(T.n)?0:T.R0>=40000?20000:0;
function spoofed(P){if(sys.gpsSpoofForce)return true;if(!GND.units)return false;
  for(const u of GND.units){if(!u.alive||!u.T||!u.T.emit||u.side===P.side)continue;const r=spoofR(u.T);if(r>0&&u.pos.distanceTo(P.pos)<r)return true;}return false;}
function jammed(P){if(sys.gpsJamForce)return true;if(!GND.units)return false;
  for(const u of GND.units){if(!u.alive||!u.T||!u.T.emit||u.side===P.side)continue;const r=jamR(u.T);if(r>0&&u.pos.distanceTo(P.pos)<r)return true;}return false;}
const _t=radar.update;radar.update=function(dt){const r=_t.apply(this,arguments);try{N.tick(dt);}catch(e){N.err=String(e&&e.message||e);}return r;};
N.tick=function(dt){const P=player;if(!N.on||!P||!P.alive){N.mag=0;return;}
  const j=jammed(P),was=N.jam;N.jam=j;sys.gpsJam=j;
  const rate=((typeof SENSOR_FUSE!=='undefined'&&SENSOR_FUSE.reg&&SENSOR_FUSE.reg.ownInsDriftNmPerHour)||.8)*1852/3600*N.k;
  if(j&&!was){N.dir=Math.random()*Math.PI*2;N.st.lost++;if(typeof flash==='function'&&!P.ac.noNav)flash('GPS LOST · INS',1800);}
  if(!j&&was&&typeof flash==='function'&&N.mag>20)flash('GPS RECOVERED',1200);
  N.mag=j?N.mag+rate*dt:N.mag*Math.exp(-dt/15);if(!j&&N.mag<.05)N.mag=0;
  const sp=!j&&spoofed(P),wasS=N.spoof;N.spoof=sp;if(sp&&!wasS){N.spDir=Math.random()*Math.PI*2;N.st.spoof++;}
  N.sp=sp?Math.min(N.sp+15*dt,1500):N.sp*Math.exp(-dt/6);if(!sp&&N.sp<.5)N.sp=0;                      // walks away at 15 m/s with no warning; once the emitter is behind you the fix is pulled back in over seconds
  _pt.copy(N.tot);N.E.set(Math.sin(N.dir)*N.mag,0,-Math.cos(N.dir)*N.mag);
  N.tot.set(N.E.x+Math.sin(N.spDir)*N.sp,0,N.E.z-Math.cos(N.spDir)*N.sp);
  if(typeof SNS!=='undefined'&&SNS.spi&&!SNS.unit&&!SNS.mav){SNS.spi.x+=N.tot.x-_pt.x;SNS.spi.z+=N.tot.z-_pt.z;}};      // a point held by the pod in nav coordinates drifts with the error; a video-tracked one does not
{const _c=GND.ccip;GND.ccip=function(P,kind){const r=_c.apply(this,arguments);if(r&&r.p&&P===player&&N.on&&(N.mag>1||N.sp>1)){r.p=r.p.clone().add(N.tot);N.st.ccip++;}return r;};}   // the pipper is drawn where the INS thinks the bomb lands, so the real impact is displaced by the error
console.info('[navphys] v302 GPS jamming and INS drift');
})();
