/* =====================================================================================================================
   v266 — ACM-only ranging radars for the first-generation gun fighters: MiG-15bis (SRD-1M "Radal-M"), F-86F (AN/APG-30) and
   F-100A (AN/ASG-17), after T.O. 1F-100A-1 section IV "A-4 sight / sight ranging radar".
     * These sets are not search radars. They are range-only sets slaved to the sight: the beam is fixed along the sight line (boresight),
       there is no scan, no scope, no TWS, no range scales and no look-up / look-down picture.
     * Inside the range window the set locks on by itself (A-4: "automatically locks on and tracks targets within these ranges", search
       range 2000-9000 ft). Outside the window nothing is seen and nothing stays locked.
     * Radar reject button (stick grip; the "bore" key here) breaks the lock and the range sweep starts again from minimum range.
     * Radar range sweep rheostat (MIN..MAX) limits how far the sweep goes (ground returns below about 6000 ft make long sweeps erratic).
     * Radar lock-on light on the sight (F-100A / F-86F A-4 sight), lit while the set tracks a target.
   Needs game.js, coldwar-jets.js.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof radar==='undefined'||typeof Jet==='undefined'){console.warn('[acmradar] game missing');return;}
const FT=.3048;
// min / max sweep range in metres; beam = full cone angle of the nutating beam in degrees
const SPEC={
  'F-100A':{name:'AN/ASG-17',min:700*FT,max:9000*FT,beam:5},           // manual: search 2000-9000 ft, track 700-9000 ft depending on the set
  'F-86F':{name:'AN/APG-30',min:150,max:2740,beam:5},                  // 3000 yd ranging radar
  'MiG-15':{name:'SRD-1M',min:150,max:1500,beam:6}};                   // radar rangefinder on the MiG-15bis
const ACMR=window.ACMR={spec:SPEC,sweep:1,                              // sweep: rheostat 0..1 (fraction of the maximum range)
  me:P=>{P=P||(typeof player!=='undefined'?player:null);return P&&SPEC[P.type]?SPEC[P.type]:null;},
  maxR(P){const s=this.me(P);return s?Math.max(s.min*1.5,s.max*(.35+.65*this.sweep)):0;},
  locked(){return radar.mode==='STT'&&!!radar.lock;}};
const isMe=()=>!!ACMR.me();
// gimbal limits [az, up, down, stabilised]: the beam only follows the sight line a few degrees
if(typeof RGIM!=='undefined'){RGIM['AN/ASG-17 ranging (ACM)']=[12,12,12,0];RGIM['AN/APG-30 ranging (ACM)']=[12,12,12,0];RGIM['SRD-1M ranging (ACM)']=[12,12,12,0];}

// the reset puts the set straight into boresight ACM; nothing else is selectable
const specFor=ac=>{if(!ac||!ac.name)return null;const k=Object.keys(SPEC).find(k=>ac.name.indexOf(k)===0);return k?SPEC[k]:null;};
{const _r=radar.reset;radar.reset=function(ac){const o=_r.apply(this,arguments);const sp=specFor(ac);
  if(sp){this.mode='ACM';this.acm='BORE';this.beam=sp.beam*Math.PI/180;this.ri=0;this.sensor='RDR';ACMR.sweep=1;}
  return o;};}
{const _l=radar.acmList;radar.acmList=function(){return isMe()?['BORE']:_l.apply(this,arguments);};}
// the bore / reject key: break the lock, sweep restarts at minimum range
{const _b=radar.bore;radar.bore=function(){if(!isMe())return _b.apply(this,arguments);
  if(this.lock)this.drop();this.setACM('BORE');try{flash((ACMR.me().name)+' · REJECT',700);}catch(e){}};}
// designate / next: the lock comes by itself; pressing designate only forces a sweep restart
{const _d=radar.designate;radar.designate=function(){if(!isMe())return _d.apply(this,arguments);if(radar.mode==='ACM'){if(this.acmBest&&this.acmBest.alive)this.stt(this.acmBest);else sfx.click();}return;};}
{const _n=radar.next;radar.next=function(){if(!isMe())return _n.apply(this,arguments);try{sfx.click();}catch(e){}};}
{const _t=radar.setTWS;if(_t)radar.setTWS=function(){if(!isMe())return _t.apply(this,arguments);try{flash('NO SCAN MODES',700);}catch(e){}};}
{const _s=radar.slew;radar.slew=function(){if(!isMe())return _s.apply(this,arguments);};}
// detection: only inside the sweep window, ground / air alike; inside it the return is strong enough to lock every time
{const _d=radar.rdet;radar.rdet=function(j,a){const R=_d.call(this,j,a);if(!isMe()||this.sensor==='IRST')return R;
  const d=a&&a.d!=null?a.d:j.pos.distanceTo(player.pos),s=ACMR.me(),mx=ACMR.maxR();
  // a target low over the ground returns clutter: the set sees it, but beyond ~900 m the range gate is erratic
  if(d<s.min||d>mx)return 0;
  const h=player.pos.y-(typeof groundAt==='function'?groundAt(player.pos.x,player.pos.z):0);
  let q=Math.max(R,d*1.8);if(h<1800&&d>900&&j.pos.y-(typeof groundAt==='function'?groundAt(j.pos.x,j.pos.z):0)<400)q*=.55;
  return q;};}
// every frame: a search mode other than boresight ACM or a lock cannot exist on these sets; a lock outside the window drops
{const _st=Jet.prototype.step;Jet.prototype.step=function(dt){const r=_st.call(this,dt);
  if(this===player&&isMe()){
    if(radar.mode!=='ACM'&&radar.mode!=='STT'){radar.mode='ACM';radar.acm='BORE';radar.tracks&&radar.tracks.clear();radar.fromACM=false;}
    if(radar.mode==='ACM'&&radar.acm!=='BORE')radar.acm='BORE';
    if(radar.sensor==='IRST')radar.sensor='RDR';
    if(radar.mode==='STT'&&radar.lock){const d=radar.lock.pos.distanceTo(player.pos),s=ACMR.me();
      if(d>ACMR.maxR()*1.04||d<s.min*.5){radar.fromACM=true;radar.drop('LOST');radar.mode='ACM';radar.acm='BORE';}
      else radar.fromACM=true;}}
  return r;};}
console.info('[acmradar] ACM-only ranging radars: '+Object.keys(SPEC).join(', '));
})();
