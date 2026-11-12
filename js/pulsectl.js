/* =====================================================================================================================
   v327 — Radar set control for every pulse radar (F-4 APQ-100/109/120, MiG-21/23, Mirage, Lightning, ...).
   After the F-4E radar set control panel (Heatblur manual, "Radar interface"): POWER · RANGE · POLAR · MANEUVER · SCAN · ASPECT · RCVR GAIN (fine / coarse)
   · TRACK · DISPLAY · MAN Vc · PULSE · MODE. The panel is a click-through overlay (toggle with F9), and in a two-seater the RIO / WSO works it:
   he sets the scan, gain, polarization, maneuver and display from the picture and says what he did on the ICS; any hand change on the panel keeps him off for 25 s.
   What each control does here:
     POWER     OFF / TEST / STBY (warm-up) / OPR / EMER (skips the warm-up)
     RANGE     steps the scope range (AI up to 50 NM; the long scales are spotlight)
     POLAR     LIN best against aircraft in the clear and in ground clutter; CIR 1 / CIR 2 cut rain, cloud and chaff return at a few dB cost on the target
     MANEUVER  LOW G: the track loop ignores big accelerations (hard to spoof, loses a jinking target); HI G follows anything (spoofable, holds a jinking target)
     SCAN      1 / 2 / 4 BAR (more bars = more elevation coverage, slower frame; 1 bar only in MAP)
     ASPECT    sets the readout in track (closure / altitude / aspect / heading) and the speed gate on lock-on: WIDE any; NOSE closure = own TAS + 450 kt +-150; FWD TAS + 240; AFT TAS - 240; TAIL 0, all +-150 kt
     RCVR GAIN fine + coarse: more gain = more range on small targets and more clutter and noise; too much floods the scope
     TRACK     AUTO (home-on-jam when jammed), AOJ OUT (home-on-jam off: a jammer breaks the lock), MAN (range rate from MAN Vc)
     DISPLAY   B-scope / PPI (plan view) on the F-4 scope, and NARrow (+-30) / WIDE (+-60) azimuth sweep
     MAN Vc    12 positions: 1, 2 = opening 100 / 200 kt, 0 - 9 = closing 0 - 900 kt
     PULSE     SHORT: good resolution, short min range; LONG: more energy (range) and coarser resolution
     MODE      RDR · BST (boresight) · MAP (ground picture, 1 bar) · AIR-GRD (antenna on the boresight, ground ranging) · BCN (transponder replies only: friendly jets, field beacon)
   WHO HAS WHAT: FULL (APQ-120: every control) · STD (Cyrano / AI.23B / MA-1 / APQ-94 / PS-01 / PS-37 style sets: power, range, gain, bars, boresight) · MIN (everything else: power, range, gain).
   Sets with no radar (ranging-only) get no panel. The tier of each set is an estimate from public data.
   Figures are gameplay estimates after the manual. ===================================================================================================================== */
(function(){'use strict';
if(typeof radar==='undefined'||typeof rio==='undefined'){console.warn('[pulsectl] radar / rio missing');return;}
const NM_=typeof NM==='number'?NM:1852,D=Math.PI/180;
const clamp_=(v,a,b)=>Math.max(a,Math.min(b,v));
const PRC=window.PRC={show:false,pwr:3,pol:0,man:0,scan:2,asp:0,gF:.5,gC:.5,trk:0,disp:0,dw:1,vc:0,pulse:0,mode:0,hold:0,auto:true,log:[],
  POWER:['OFF','TEST','STBY','OPR','EMER'],POLAR:['LIN','CIR 1','CIR 2'],MAN:['LOW G','HI G'],ASP:['WIDE','NOSE','FWD','AFT','TAIL'],TRK:['AUTO','AOJ OUT','MANUAL'],
  DISP:['B-SCOPE','PPI'],DW:['NAR','WIDE'],PULSE:['SHORT','LONG'],MODE:['RDR','BST','MAP','AIR-GRD','BCN'],
  VC:['OPEN 100','OPEN 200','0','100','200','300','400','500','600','700','800','900']};   // MAN Vc knob: index 0,1 opening, 2..11 closing 0..900 kt
const FULL=['APQ-120'],STD=['Cyrano IV','Cyrano II','AI.23B Airpass','MA-1','APQ-94','PS-01/A','PS-37/A','APG-53A'];
const CAPS={FULL:{pwr:1,rng:1,pol:1,man:1,scan:[1,2,4],asp:1,gain:1,trk:1,disp:1,dw:1,vc:1,pulse:1,mode:[0,1,2,3,4]},
  STD:{pwr:1,rng:1,gain:1,scan:[1,2,4],mode:[0,1]},MIN:{pwr:1,rng:1,gain:1}};
const tier=()=>{const n=player&&player.ac&&player.ac.radar?player.ac.radar.name:'';return FULL.includes(n)?'FULL':STD.includes(n)?'STD':'MIN';};
PRC.tier=tier;PRC.has=k=>{if(!player||!player.ac||!player.ac.pulse)return false;const c=CAPS[tier()];return !!(c&&c[k]);};
PRC.opts=k=>{const c=CAPS[tier()];return c&&c[k]&&Array.isArray(c[k])?c[k]:null;};
const fitted=()=>!!(player&&player.alive&&player.ac&&player.ac.pulse&&!player.ac.noRdr);
const twoSeat=()=>!!(player&&player.ac&&player.ac.rio);
const gainK=()=>.55+.9*(.7*PRC.gC+.3*PRC.gF);          // 0.55 .. 1.45
function applyScan(){const idx=radar.barsL.indexOf(PRC.has('mode')&&PRC.mode===2?1:PRC.scan);if(idx>=0)radar.bi=idx;}
function applyDw(){const idx=radar.azs.indexOf(PRC.dw===0?30:60);if(idx>=0)radar.ai=idx;}
// ----- power -----
function applyPower(){const p=PRC.POWER[PRC.pwr];
  if(p==='OFF')radar.setPower('OFF');
  else if(p==='OPR'||p==='EMER'){const was=radar.power;radar.setPower('ON');if(p==='EMER'&&radar.warm>0)radar.warm=0;if(was==='OFF'&&radar.warm<8)radar.warm=Math.max(radar.warm,p==='EMER'?0:8);}
  else radar.setPower('STBY');}
// ----- the effects: wrap the range model and the track loop -----
const _rdet=radar.rdet;
radar.rdet=function(j,a){let R=_rdet.call(this,j,a);if(!R||!fitted()||this.sensor!=='RDR')return R;
  R*=Math.pow(PRC.has('gain')?gainK():1,.5);                                    // gain: fourth-root of power -> range
  if(PRC.has('pulse')&&PRC.pulse===1)R*=1.1;                                    // long pulse: more energy on target
  const rain=(typeof ENV!=='undefined'&&ENV.P&&ENV.P.rain)?ENV.P.rain:0;
  if(PRC.has('pol')&&PRC.pol>0)R*=.93;                                        // circular polarization costs a few dB on the aircraft return
  if(rain>0&&PRC.has('pol')&&PRC.pol===0)R*=1-Math.min(.4,rain*.35);          // rain eats a linear-polarized set
  if(PRC.has('gain')&&PRC.gC>.8)R*=1-(PRC.gC-.8)*.9;                           // gain run up high: the receiver floods and small targets vanish into noise
  if(PRC.has('mode')&&PRC.mode===2&&a.el<-2*D)R*=.8;
  return R;};
const _snr1=radar.snr1;
radar.snr1=function(j,a,loss){let s=_snr1.call(this,j,a,loss);if(!s||!fitted())return s;
  if(PRC.has('pol')&&PRC.pol===0&&a.el<-1*D)s*=.9;                            // linear polarization sees more ground return in look-down
  return s;};
const _upd=radar.update;
radar.update=function(dt){
  if(fitted()){
    // maneuver: HI G follows any acceleration, LOW G ignores big ones (and so loses a jinking target sooner)
    const L=this.lock;let g=0;if(L&&L.alive){const dv=L._pcV?L.vel.distanceTo(L._pcV)/Math.max(dt,.001):0;g=dv/9.81;L._pcV=L.vel.clone();}
    if(PRC.has('man'))this.lostG=PRC.man===1?1.7:(g>5?.7:1.2);
    // scan bars
    // display sweep width
    // power knob follows the radar's own state so the in-cockpit switches and this panel agree
    if(radar.power==='OFF'&&PRC.pwr>0&&PRC.pwr!==1)PRC.pwr=0;else if(radar.power==='ON'&&PRC.pwr<3)PRC.pwr=3;else if(radar.power==='STBY'&&PRC.pwr>=3)PRC.pwr=2;
    // TRACK: AOJ OUT = home-on-jam is off, a lock that was riding a jammer breaks; MANUAL = range follows the Vc knob
    if(this.mode==='STT'&&this.lock&&this.lock.alive){
      if(PRC.has('trk')&&this.hoj&&PRC.trk===1){this._pcJ=(this._pcJ||0)+dt;if(this._pcJ>1.5){this._pcJ=0;this.drop('JAM');}}else this._pcJ=0;
      if(PRC.has('trk')&&PRC.trk===2){const r=this.lock.pos.clone().sub(player.pos),d=r.length(),vcA=-r.dot(this.lock.vel.clone().sub(player.vel))/Math.max(d,1);
        const set=PRC.vc<2?-(PRC.vc===0?100:200)*.5144:(PRC.vc-2)*100*.5144;this._pcE=(this._pcE||0)+(vcA-set)*dt;
        this.rngErr=clamp_(this._pcE,-3000,3000);if(Math.abs(this._pcE)>1800){this._pcE=0;this.drop('LOST');}}
      else this._pcE=0;}
    else{this._pcE=0;this._pcJ=0;}
    PRC.hold=Math.max(0,PRC.hold-dt);
  }
  return _upd.apply(this,arguments);};
// ----- lock-on: the ASPECT speed gate and BEACON (no skin track) -----
const _stt=radar.stt;
radar.stt=function(j){if(fitted()&&this.sensor==='RDR'&&j&&j.alive){
    if(PRC.has('mode')&&PRC.mode===4){try{flash('BEACON · NO SKIN TRACK',1000);}catch(e){}return;}
    if(PRC.has('asp')&&PRC.asp>0){const r=j.pos.clone().sub(player.pos),d=Math.max(r.length(),1),vc=-r.dot(j.vel.clone().sub(player.vel))/d*1.944,tas=player.vel.length()*1.944;
      const centre=PRC.asp===4?0:(PRC.asp===3?tas-240:PRC.asp===2?tas+240:tas+450);if(Math.abs(vc-centre)>150){try{flash('OUT OF SPEED GATE · '+PRC.ASP[PRC.asp],1100);}catch(e){}return;}}}
  return _stt.apply(this,arguments);};
// ----- scope range step shared by the panel and the RIO -----
const RNG_LBL=()=>radar.ranges.map(v=>v+' '+radar.ul);
function stepRange(d){const n=radar.ri+d;if(n>=0&&n<radar.ranges.length){radar.ri=n;return true;}return false;}
// ----- the RIO / WSO works the set -----
const say=(s,k,cd)=>{try{rio.say(s,k,cd);}catch(e){}};
function crew(dt){const T=tier();if(!fitted()||!twoSeat()||!PRC.auto||!rio.active()||PRC.hold>0||PRC.pwr<3||!radar.on())return;
  crew.acc=(crew.acc||0)+dt;if(crew.acc<1.2)return;crew.acc=0;
  const rain=(typeof ENV!=='undefined'&&ENV.P&&ENV.P.rain)?ENV.P.rain:0,stt=radar.mode==='STT',L=radar.lock;
  // polarization: circular in rain, linear otherwise
  const wantPol=rain>.15?1:0;if(PRC.has('pol')&&PRC.pol!==wantPol){PRC.pol=wantPol;say(wantPol?'Circular polarization, rain.':'Back to linear.','prc-pol',15);}
  // scan: 2 bar for search, 1 bar when he has a track on the pilot's side and when mapping
  const wide=radar.ranges[radar.ri]*(radar.unit/NM_)>=40,want=!PRC.opts('scan')?PRC.scan:stt?1:(PRC.has('mode')&&PRC.mode===2)?1:(wide&&PRC.dw===1?4:2);if(PRC.opts('scan')&&PRC.scan!==want){PRC.scan=want;applyScan();if(!stt)say(want===4?'Four bar.':want===2?'Two bar.':'One bar.','prc-scan',12);}
  // maneuver: HI G in a fight (close, STT), LOW G when he is being jammed or at long range
  if(stt&&L){const d=L.pos.distanceTo(player.pos),j=radar.hoj,wm=d<12*NM_&&!j?1:0;if(PRC.has('man')&&PRC.man!==wm){PRC.man=wm;say(wm?'High G.':'Low G.','prc-man',12);}
    // track: AOJ OUT only if home-on-jam is false-alarming (he lets it ride when the jammer is real); the RIO leaves it on AUTO
    if(PRC.trk!==0){PRC.trk=0;}
    // aspect switch to match the target
    const rel=L.pos.clone().sub(player.pos).normalize(),jf=L.fwd?L.fwd(new V3()):null;
    if(jf&&PRC.has('asp')){const asp=-jf.dot(rel),wa=asp>.75?1:asp>.35?2:asp<-.75?4:asp<-.35?3:0;if(PRC.asp!==wa)PRC.asp=wa;}}
  else{if(PRC.has('man')&&PRC.man!==0)PRC.man=0;if(PRC.asp!==0)PRC.asp=0;if(PRC.trk!==0)PRC.trk=0;}
  // display and sweep: narrow when he has a priority target, wide otherwise
  const wdw=(rio.prio&&!stt)?0:1;if(PRC.has('dw')&&PRC.dw!==wdw&&!stt){PRC.dw=wdw;applyDw();say(wdw?'Wide sweep.':'Narrow sweep.','prc-dw',20);}
  // gain: back it off if the picture is full of ground clutter (look-down at low level), raise it at range
  if(PRC.has('gain')){const alt=player.pos.y*3.281,wg=(radar.antEl<-3*D&&alt<12000)?.35:.5;PRC.gC+=clamp_(wg-PRC.gC,-.05,.05);if(Math.abs(wg-PRC.gC)>.06)say(wg<.4?'Gain down, clutter.':'Gain up.','prc-g',20);}
  // long pulse for long range search, short pulse inside 20 miles
  if(PRC.has('pulse')){const wp=radar.ranges[radar.ri]*(radar.unit/NM_)>30?1:0;if(PRC.pulse!==wp)PRC.pulse=wp;}}
const _rup=rio.update;rio.update=function(dt){_rup.apply(this,arguments);try{crew(dt);}catch(e){}};
// ----- readout: what the set shows in track for the ASPECT position -----
PRC.readout=function(){const L=radar.lock;if(!L||!L.alive||radar.mode!=='STT')return null;const P=player,rel=L.pos.clone().sub(P.pos),d=rel.length(),
  vc=-rel.dot(L.vel.clone().sub(P.vel))/Math.max(d,1),tas=P.vel.length(),k=1.944,pos=PRC.asp;
  const a=PRC.ASP[pos];if(a==='WIDE')return'Vc '+Math.round(vc*k)+' kt';if(a==='NOSE')return'ALT '+Math.round(L.pos.y*3.281/100)/10+' k';
  const jf=L.fwd?L.fwd(new V3()):null,asp=jf?Math.round(Math.acos(clamp_(-jf.dot(rel.clone().normalize()),-1,1))/D):0;
  if(a==='FWD')return'ASP '+asp+'°';if(a==='AFT')return'Vc '+Math.round(vc*k)+' kt';return'HDG '+Math.round(L.hdg||0)+'°';};
// ----- the panel -----
let root=null;
const css=`#prc{position:fixed;left:14px;top:90px;z-index:60;width:292px;background:#14181a;border:2px solid #3a4246;border-radius:6px;color:#cfe;font:11px 'B612 Mono',monospace;padding:8px;display:none;user-select:none}
#prc h4{margin:0 0 6px;font-size:11px;letter-spacing:.1em;color:#9fd}#prc .g{display:grid;grid-template-columns:1fr 1fr;gap:6px}#prc .c{background:#0d1011;border:1px solid #2c3438;border-radius:4px;padding:4px}
#prc .c b{display:block;font-weight:400;color:#8a9;font-size:9px;margin-bottom:3px}#prc button{background:#222a2d;color:#cde;border:1px solid #3a4448;border-radius:3px;font:inherit;padding:2px 5px;margin:1px;cursor:pointer}
#prc button.on{background:#2f6b3a;color:#fff;border-color:#5c9}#prc input[type=range]{width:100%}#prc .r{grid-column:1/3}#prc small{color:#789}`;
function build(){if(root)return;const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);root=document.createElement('div');root.id='prc';document.body.appendChild(root);
  root.addEventListener('mousedown',e=>e.stopPropagation());root.addEventListener('click',e=>e.stopPropagation());}
const btns=(key,list,fn)=>list.map((l,i)=>`<button data-k="${key}" data-v="${i}" class="${PRC[key]===i?'on':''}">${l}</button>`).join('');
function render(){if(!root)return;const ok=fitted();root.style.display=PRC.show&&ok?'block':'none';if(!PRC.show||!ok)return;
  const ro=PRC.readout(),h=k=>PRC.has(k),cell=(t,b,w)=>`<div class="c${w?' r':''}"><b>${t}</b>${b}</div>`,sc=PRC.opts('scan'),mo=PRC.opts('mode');
  const parts=[];
  if(h('pwr'))parts.push(cell('POWER',btns('pwr',PRC.POWER)));
  if(h('rng'))parts.push(cell('RANGE',`<button data-a="rm">−</button> ${RNG_LBL()[radar.ri]} <button data-a="rp">+</button>`));
  if(h('pol'))parts.push(cell('POLAR',btns('pol',PRC.POLAR)));
  if(h('man'))parts.push(cell('MANEUVER',btns('man',PRC.MAN)));
  if(sc)parts.push(cell('SCAN',sc.map(n=>`<button data-k="scan" data-v="${n}" class="${PRC.scan===n?'on':''}">${n} BAR</button>`).join('')));
  if(h('asp'))parts.push(cell('ASPECT',btns('asp',PRC.ASP)));
  if(h('trk'))parts.push(cell('TRACK',btns('trk',PRC.TRK)));
  if(h('disp'))parts.push(cell('DISPLAY',btns('disp',PRC.DISP)+btns('dw',PRC.DW)));
  if(h('gain'))parts.push(cell(`RCVR GAIN · coarse ${Math.round(PRC.gC*100)} / fine ${Math.round(PRC.gF*100)}`,`<input type="range" min="0" max="100" value="${Math.round(PRC.gC*100)}" data-s="gC"><input type="range" min="0" max="100" value="${Math.round(PRC.gF*100)}" data-s="gF">`,1));
  if(h('vc'))parts.push(cell('MAN Vc',`${PRC.VC[PRC.vc]} kt<input type="range" min="0" max="11" value="${PRC.vc}" data-s="vc" data-i="1">`));
  if(h('pulse'))parts.push(cell('PULSE',btns('pulse',PRC.PULSE)));
  if(mo)parts.push(cell('MODE',mo.map(i=>`<button data-k="mode" data-v="${i}" class="${PRC.mode===i?'on':''}">${PRC.MODE[i]}</button>`).join(''),1));
  root.innerHTML=`<h4>RADAR SET CONTROL · ${player.ac.radar&&player.ac.radar.name||''} · ${PRC.tier()}${twoSeat()?` · <span style="color:${PRC.auto?'#fc6':'#8a9'}">${PRC.auto?'RIO':'MAN'}</span>`:''}</h4><div class="g">${parts.join('')}
  <div class="r"><small>${ro?'TRACK · '+ro+' · '+(radar.hoj?'HOJ':'SKIN TRK'):'no track'}${twoSeat()?`  ·  <button data-a="auto">${PRC.auto?'TAKE OVER':'GIVE TO RIO'}</button>`:''}</small></div></div>`;}
function onClick(e){const t=e.target;if(!t.dataset)return;if(t.dataset.k){const k=t.dataset.k,v=+t.dataset.v;PRC[k]=v;PRC.hold=25;if(k==='pwr')applyPower();if(k==='scan'||k==='mode')applyScan();if(k==='dw')applyDw();if(k==='mode'){if(v===1&&radar.mode!=='STT'){radar.fromACM=false;radar.mode='ACM';radar.acm='BORE';flashMsg('BORESIGHT');}else if(v!==1&&radar.mode==='ACM'&&radar.acm==='BORE')radar.mode='RWS';}}
  else if(t.dataset.a==='rp'){stepRange(1);PRC.hold=25;}else if(t.dataset.a==='rm'){stepRange(-1);PRC.hold=25;}
  else if(t.dataset.a==='auto'){PRC.auto=!PRC.auto;PRC.hold=0;}render();}
function onInput(e){const t=e.target;if(!t.dataset||!t.dataset.s)return;const v=+t.value;PRC.hold=25;if(t.dataset.i)PRC[t.dataset.s]=v;else PRC[t.dataset.s]=v/100;}
const flashMsg=s=>{try{flash(s,900);}catch(e){}};
document.addEventListener('DOMContentLoaded',()=>{build();root.addEventListener('click',onClick);root.addEventListener('input',onInput);});
if(document.readyState!=='loading'){build();root.addEventListener('click',onClick);root.addEventListener('input',onInput);}
addEventListener('keydown',e=>{if(e.code==='F9'&&!e.repeat&&fitted()){PRC.show=!PRC.show;render();e.preventDefault();}});
setInterval(()=>{try{render();}catch(e){}},250);
console.log('[pulsectl] radar set control ready');
})();
