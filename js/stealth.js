/* ======================================================================================================================
   v288 — Stealth properties.

   Three classes, each with its own all-aspect radar-signature shape (multiplier on the jet's frontal RCS) and IR trim:
     VLO  very low observable     F-22, F-35A, J-20, J-35        nose-on lowest, beam / tail spikes (edge alignment, nozzles, canards and
                                                                  fins on the Chinese jets), small planform return, internal bays
     LO   low observable          Su-57                          same idea, less clean (engine faces, LEVCONs, bigger spikes)
     RED  reduced signature       F/A-18E/F, EA-18G, F-15EX, Rafale, Typhoon, Gripen C/E, KF-21, J-10C, MiG-35, F-2A
                                  RAM coatings and shaping: the beam and tail returns of the 4th generation are cut, the nose is unchanged
   * Radar: the player radar's detection range follows the class's own aspect curve (nose / beam / tail / top-bottom).
   * Internal bays (VLO and LO): stores in a bay add NO radar signature and are hidden on the model until the doors open. A launch opens
     the bay for 2.5 s: the stores show and the door cavities add their own return (a few hundred times the clean RCS on the F-22). Stores
     on external pylons (tanks, pods, anything on the wing stations) add their full RCS, which is what ends the stealth.
   * IR: nozzle shaping / cooling trims the IR signature a little (VLO / LO) and slightly (RED).
   * Loadout screen: a SIGNATURE row, and the internal-bay stations sit in the belly / side bays in the front view.
   The detection formulas elsewhere (SAM radars, AI radars) use the jet's live RCS (frontal + stores + open bay); the aspect curve is applied to the
   player's radar.
   ====================================================================================================================== */
(function(){
'use strict';
if(typeof Jet==='undefined'||typeof radar==='undefined'||typeof AC==='undefined')return;
const D=Math.PI/180,cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const sm=t=>{t=cl(t,0,1);return t*t*(3-2*t);};
const curve=(t,x)=>{if(x<=t[0][0])return t[0][1];for(let i=1;i<t.length;i++)if(x<=t[i][0]){const a=t[i-1],b=t[i];return a[1]+(b[1]-a[1])*sm((x-a[0])/(b[0]-a[0]));}return t[t.length-1][1];};
// the generic profile every other jet uses (realism.js)
const NOSE=(c,s)=>{const th=Math.acos(cl(c,-1,1))*180/Math.PI;let k;
  if(th<20)k=1;else if(th<60)k=1+.5*sm((th-20)/40);else if(th<80)k=1.5+2.5*sm((th-60)/20);else if(th<100)k=4+Math.cos((th-90)/10*Math.PI/2)*1.5;
  else if(th<160)k=2.2-.4*sm((th-100)/60);else k=1.8+.9*sm((th-160)/20);return k*(1+5*s);};

/* ---- the classes ---- */
const CLS={
  VLO:{nm:'VLO',asp:[[0,1],[30,1],[60,4],[90,12],[120,4],[150,7],[180,10]],el:2,irs:.8},
  LO: {nm:'LO', asp:[[0,1],[30,1.1],[60,3.5],[90,9],[120,3.5],[150,4.5],[180,5.5]],el:3,irs:.85},
  RED:{nm:'REDUCED',red:[[0,1],[40,.95],[70,.75],[90,.6],[120,.7],[150,.8],[180,.85]],irs:.92}};
// per jet: class, internal-bay stations, door-cavity RCS (m2) while the bay is open, optional aspect tweaks, station moves into the bays
const J={
  'F-22':  {c:'VLO',bay:['1','2','3','4','6','7','8','9'],open:.02,
            mv:{1:[-1.5,-.55],9:[1.5,-.55],2:[-.55,-1.05],3:[-.55,-.8],4:[-.55,-.55],8:[.55,-1.05],7:[.55,-.8],6:[.55,-.55]}},
  'F-35A': {c:'VLO',bay:['3','4','6','7'],open:.03,irs:.9,mv:{3:[-.5,-.9],4:[-.5,-.55],6:[.5,-.55],7:[.5,-.9]}},
  'J-20':  {c:'VLO',bay:['1','10','5','6','5B','6B'],open:.25,beam:18,irs:1.0,mv:{1:[-1.6,-.5],10:[1.6,-.5]}},
  'J-35':  {c:'VLO',bay:['1','10','5','6','5B','6B'],open:.2,beam:14,irs:.95,mv:{1:[-1.6,-.5],10:[1.6,-.5]}},
  'Su-57': {c:'LO', bay:['1','10','4','5','6','7','5B','6B'],open:.6,irs:1.1,mv:{1:[-1.7,-.5],10:[1.7,-.5]}},
  'F-18F':{c:'RED'},'EA-18G':{c:'RED'},'F-15EX':{c:'RED'},'Rafale':{c:'RED'},'EF-2000':{c:'RED'},'JAS-39C':{c:'RED'},'JAS-39E':{c:'RED'},
  'KF-21':{c:'RED',k:.85},'J-10C':{c:'RED'},'MiG-35':{c:'RED'},'F-2A':{c:'RED'}};
const STEALTH={};window.STEALTH=STEALTH;
for(const [id,s] of Object.entries(J)){const A=AC[id];if(!A)continue;
  STEALTH[id]=Object.assign({cls:CLS[s.c]},s);A.stealth={cls:s.c,bay:s.bay||[]};
  if(s.mv)for(const [k,p] of Object.entries(s.mv))if(A.st[k]){A.st[k]=[p[0],p[1],A.st[k][2]];}
  A.irs=+(s.irs!=null?s.irs:A.irs*CLS[s.c].irs).toFixed(2);}
const spec=j=>j&&STEALTH[j.type];

/* ---- radar: the class's own aspect curve ---- */
{const _d=radar.rdet;radar.rdet=function(j,a){let R=_d.call(this,j,a);const S=spec(j);if(!S||!R||this.sensor!=='RDR'||!j.fwd||!j.up||typeof player==='undefined'||!player)return R;
  const to=player.pos.clone().sub(j.pos).normalize(),c=j.fwd(new V3()).dot(to),s=Math.abs(j.up(new V3()).dot(to)),th=Math.acos(cl(c,-1,1))/D;
  const RZ=window.REALISM,real=RZ&&RZ.on&&RZ.rcs,old=.62+.38*Math.max(0,c),tail=.85+.15*Math.max(0,c);
  let kNew;if(S.cls.asp){let m=curve(S.cls.asp,th);if(S.beam&&th>60&&th<120)m*=1+(S.beam/12-1)*sm(1-Math.abs(th-90)/30);kNew=m*(1+S.cls.el*s);}
  else{kNew=NOSE(c,s)*(1-(1-curve(S.cls.red,th))*(S.k||1));}
  if(real)return R*Math.pow(kNew/NOSE(c,s),.25);
  return R/old*Math.pow(kNew,.25)*tail;};}

/* ---- internal bays ---- */
const isBay=(j,k)=>{const S=spec(j);return !!(S&&S.bay&&S.bay.includes(String(k)));};
const baseSt=Jet.prototype.storeRcs;
for(const k of ['AIM-174B','AIM-260A','MIM-23B','Roland'])if(MSL[k]&&!(MSL[k].rcs>0))MSL[k].rcs=({'AIM-174B':.12,'AIM-260A':.05,'MIM-23B':.08,'Roland':.06})[k];
// bay stores add nothing to the signature; the open doors add their own cavity return; tanks / pods always count
Jet.prototype.storeRcs=function(){const S=spec(this);if(!S||!S.bay)return baseSt.call(this);
  let r=0;for(const [k,s] of Object.entries(this.load||{})){const t=MSL[s]||AGW[s];if(isBay(this,k)&&!(s==='TK'||s==='PTB'))continue;
    r+=t?t.rcs*2.2:(s==='TK'||s==='PTB')?.6:0;}
  if(this._bay>0)r+=S.open;return r;};
const showBay=(j,on)=>{const S=spec(j);if(!S||!S.bay||!j.stMesh)return;for(const k of S.bay){const m=j.stMesh[k];if(m){const s=j.load&&j.load[k];const v=on||s==='TK'||s==='PTB';if(m.visible!==v)m.visible=v;}}};
{const _r=Jet.prototype.release;Jet.prototype.release=function(type){const S=spec(this);
    if(S&&S.bay&&this.load){const rel=(this===player&&this.ac.migRel&&typeof sys!=='undefined'&&sys.mig&&sys.mig.stores===0)?this.ac.migRel:this.ac.rel.map(String);
      const st=rel.concat(Object.keys(this.load)).find(k=>this.load[k]===type);
      if(st!==undefined&&isBay(this,st)&&!(type==='TK'||type==='PTB')){if(!(this._bay>0)&&this===player&&typeof flash==='function')flash('WEAPON BAY OPEN',900);this._bay=2.5;}}
    return _r.call(this,type);};}
{const _s=Jet.prototype.step;Jet.prototype.step=function(dt){const S=spec(this);if(S&&S.bay){if(this._bay>0){this._bay-=dt;if(this._bay<0)this._bay=0;}showBay(this,this._bay>0);}return _s.call(this,dt);};}

/* ---- loadout screen ---- */
if(typeof acPerfRows==='function'){const _p=acPerfRows;acPerfRows=function(t){const rows=_p(t),S=STEALTH[t],A=AC[t];if(!S||!A)return rows;
  const db=Math.round(10*Math.log10(Math.max(A.rcs,1e-5))),n=(S.bay||[]).length;
  rows.push(['SIGNATURE',S.cls.nm+' · nose '+db+' dBsm ('+A.rcs+' m²)'+(S.bay?' · internal bays '+n+' stations · doors open 2.5 s per launch':' · RAM / shaping: beam and tail returns cut '+Math.round((1-curve(S.cls.red,90)*(S.k||1))*100)+' %')]);
  if(S.bay)rows.push(['STORES','Bay stores add no RCS; tanks, pods and anything on an external pylon do']);
  return rows;};}
console.info('[stealth] '+Object.keys(STEALTH).length+' jets: '+Object.values(STEALTH).map(s=>s.cls.nm).filter((v,i,a)=>a.indexOf(v)===i).join(' / '));
})();
