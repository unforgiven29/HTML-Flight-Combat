/* =====================================================================================================================
   aerodepth.js — transonic pitch authority, high-q aeroelastic roll loss, and an energy-state (Ps) tracker.
   Loads last. Wraps Jet.prototype.storeG / fx0 / step; per-jet data (AC tables) is unchanged. All numbers are tunable in AERO.

   TRANSONIC PITCH AUTHORITY (non-FBW jets)
     The aerodynamic centre moves aft through M1 (Mach tuck): the tail has to cancel a nose-down moment, so less of its
     travel is left to pull G. The available G dips by AERO.tuck (default 18 %) around M1.02, ±0.12 M wide, and recovers
     above M1.25. A jet with a fly-by-wire flight computer trims it out and loses only a few percent. Swept-wing jets
     (swing wing, delta) get the full effect, straight-wing subsonic jets none.
   AEROELASTIC ROLL LOSS
     Wing twist under aileron load takes away roll power as dynamic pressure rises (the F-4, F-104, MiG-21 lose a lot;
     the F-16 and F-18 schedule the flight computer around it). Roll rate multiplier = 1 - loss * smoothstep((q - q0)/dq).
   ENERGY STATE
     j.ps = specific excess power (m/s) from the rate of change of energy height h + V²/2g, low-pass filtered
     (about 2 s). j.eh = energy height (m). Read AERO.ps(j) in feet per second for a HUD / debug display.
   ===================================================================================================================== */
(function(){'use strict';
if(typeof Jet==='undefined')return;
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),sm=t=>{t=cl(t,0,1);return t*t*(3-2*t);};
const AERO=window.AERO={on:true,tuck:.18,tuckFbw:.04,rollLoss:.38,rollLossFbw:.12,q0:28000,dq:110000,
  ps:j=>Math.round((j.ps||0)*3.281),                       // ft/s
  bump:M=>Math.exp(-Math.pow((M-1.02)/.12,2))   // peaks at 1 near M1.02, ~0 by M1.3
};
// which jets have a transonic pitch problem: not straight-wing subsonic (mcap<1 or no afterburner)
// supersonic-capable? solved from the same thrust/drag code the flight model runs (max Mach at 11 km, clean, half fuel), cached per airframe
const _ss=new WeakMap();
const hasTuck=ac=>{if(!ac)return false;let v=_ss.get(ac);if(v!==undefined)return v;v=false;
  try{if(ac.ab&&ac.S&&typeof engThrust==='function'){const h=11000,W=(ac.empty+ac.fuel*.5+400)*9.81;
    for(let M=.5;M<1.6;M+=.02){const V=M*sos(h),q=.5*rho(h)*V*V,CL=W/(q*ac.S),CD=ac.cd0+ac.k*CL*CL+tab(ac.cdm,M);if(engThrust(ac,1,1,M,h)>=q*ac.S*CD)v=M>1.05;}}}catch(e){}
  _ss.set(ac,v);return v;};

{const sg=Jet.prototype.storeG;Jet.prototype.storeG=function(){const g=sg.call(this);
  if(!AERO.on||this.remote)return g;const ac=this.acx||this.ac;if(!ac||!hasTuck(ac))return g;
  const k=(ac.fbw?AERO.tuckFbw:AERO.tuck)*AERO.bump(this.mach||0);return k>.001?g*(1-k):g;};}

{const fx=Jet.prototype.fx0;Jet.prototype.fx0=function(base){const o=fx.call(this,base);
  if(!AERO.on||!o||!o.roll||this.remote)return o;
  const V=this.vel.length(),q=.5*(window.rho?rho(this.pos.y):1.225)*V*V;if(q<AERO.q0)return o;
  const loss=(o.fbw?AERO.rollLossFbw:AERO.rollLoss)*sm((q-AERO.q0)/AERO.dq);if(loss<.005)return o;
  // cache per (ac object, 5 % loss step) so we do not allocate every frame
  const kq=Math.round(loss*20),c=this._adC;if(c&&c.o===o&&c.k===kq)return c.r;
  const r=Object.assign({},o);r.roll=o.roll*(1-kq/20);this._adC={o:o,k:kq,r:r};return r;};}

{const st=Jet.prototype.step;Jet.prototype.step=function(dt){const r=st.call(this,dt);
  if(this.alive&&!this.remote&&dt>0){const eh=this.pos.y+this.vel.lengthSq()/19.62;
    if(this.eh===undefined){this.eh=eh;this.ps=0;}
    else{const raw=(eh-this.eh)/dt;this.ps+=(raw-this.ps)*(1-Math.exp(-dt/2));this.eh=eh;}}
  return r;};}
})();
