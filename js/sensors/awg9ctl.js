/* =====================================================================================================================
   v1 — AN/AWG-9 set control for the F-14A (pulse AND pulse-Doppler). After the Heatblur F-14 manual, "Radar interface" (DDD, sensor control panel, HCU, TID).
   The panel is a click-through overlay (F9) and in the back seat the RIO works it: he sets the scan, rate window, scale and target size from the picture and
   says what he did on the ICS. Any hand change keeps him off for 25 s; "TAKE OVER" gives the set to you.
   Controls and what they do here:
     WCS XMT   OFF / STBY (warm-up) / ON
     RANGE     5 / 10 / 20 / 50 / 100 / 200 NM. At 20 NM and up the pulse modes use pulse compression (full range); inside 20 NM the short pulse is less sensitive
     MODE      PD SRCH · RWS · TWS AUTO · TWS MAN · PULSE SRCH; STT is PD STT or P STT (a pulse lock has no rate gate but fights ground clutter in look-down)
     TGTS      SMALL / NORM / LARGE expected target size: sets the Phoenix active-terminal (ATC) range to 6 / 10 / 13 NM on a round you launch
     MLC       main-lobe clutter suppression in PD: OUT / IN / AUTO (on when the antenna looks up less than 3 deg). Off in look-down, clutter swamps the return
     AGC       PD gain time constant: NORM / FAST. Fast gives up some sensitivity (the real switch was never wired in the DCS set either)
     PARAMP    OFF costs about 35 % of detection range
     Vc        PD search rate scale: X-4 (800 kt opening to 4000 closing) / NORM (200 to 1000) / VID (50 to 250). A target off the scale is not shown. The narrower scales
               give a finer filter: a few per cent more range
     ASPECT    PD rate window: NOSE (600 opening to 1800 closing) / BEAM (+-1200) / TAIL (1800 opening to 600 closing). Also the speed gate for a PD STT lock-on
     AZ SCAN   +-10 / 20 / 40 / 65 deg      EL BARS   1 / 2 / 4 / 8 bars (about 2.3 / 3.6 / 6.3 / 11.5 deg of elevation coverage)
     STAB      IN: scan stabilised to the horizon, OUT: to the armament datum line (the antenna rolls with the aircraft)
     PULSE GAIN  fully clockwise = the WCS sets it (neutral). Turned down it is a manual gain: low loses small targets, high floods. It is the set's own gain knob
     PD THRLD  CLEAR (upper half, look-up) and CLUTTER (lower half, look-down) detection threshold: high = quiet scope and less range, low = more range and false alarms
     TRACK HOLD  TWS files kept 2 min instead of 14 s
     ACM       PAL · VSL HIGH · VSL LOW · PLM (boresight)
   Display-only knobs (PULSE VIDEO, BRIGHT, ERASE, frequency, missile channel, IR AUDIO, JAM/JET, ACM THRLD, the three CCM buttons) are not modelled; the real ones did nothing in the sim either.
   Figures are gameplay estimates after the manual. ===================================================================================================================== */
(function(){'use strict';
if(typeof radar==='undefined'||typeof rio==='undefined'||typeof Missile==='undefined'){console.warn('[awg9ctl] radar / rio / Missile missing');return;}
const NM_=typeof NM==='number'?NM:1852,D=Math.PI/180,KT=1.944;
const clamp_=(v,a,b)=>Math.max(a,Math.min(b,v));
const AWG=window.AWG={show:false,auto:true,hold:0,pwr:2,rm:1,sttp:0,tgts:1,mlc:2,agc:0,paramp:1,vc:0,asp:0,az:40,bars:4,stab:1,gA:true,thC:.5,thL:.5,trkHold:0,
  TGTS:['SMALL','NORM','LARGE'],MLC:['OUT','IN','AUTO'],AGC:['NORM','FAST'],PARAMP:['OFF','ON'],VC:['X-4','NORM','VID'],ASP:['NOSE','BEAM','TAIL'],STAB:['OUT','IN'],
  MODE:['PD SRCH','RWS','TWS AUTO','TWS MAN','PULSE SRCH'],STT:['PD STT','P STT'],XMT:['OFF','STBY','ON'],HOLD:['OFF','ON'],AZS:[10,20,40,65],BARS:[1,2,4,8],ACM:[['PAL','PAL'],['VSLH','VSL HI'],['VSLL','VSL LO'],['PLM','PLM']]};
const VCS=[[-800,4000],[-200,1000],[-50,250]],ASPW=[[-600,1800],[-1200,1200],[-1800,600]],ATC=[6,10,13];
const fitted=()=>!!(player&&player.alive&&player.ac&&player.ac.radar&&player.ac.radar.name==='AWG-9');
const twoSeat=()=>!!(player&&player.ac&&player.ac.rio);
const _a=new V3(),_b=new V3();
const closure=j=>{_a.copy(j.pos).sub(player.pos);const d=Math.max(_a.length(),1);return -_a.dot(_b.copy(j.vel).sub(player.vel))/d*KT;};   // kt, closing positive
const inWindow=vc=>vc>=Math.max(VCS[AWG.vc][0],ASPW[AWG.asp][0])&&vc<=Math.min(VCS[AWG.vc][1],ASPW[AWG.asp][1]);
const isPulse=()=>radar.mode==='STT'?AWG.sttp===1:AWG.rm===4;
// ----- scan geometry -----
function applyScan(){const i=radar.barsL.indexOf(AWG.bars);if(i>=0)radar.bi=i;radar.awgAz=AWG.az*D;}
function applyMode(){const m=AWG.rm;
  if(m===2||m===3){if(radar.mode!=='TWS'){radar.lock=null;radar.bug=null;radar.fromACM=radar.fromTWS=false;radar.mode='TWS';}radar.bugMan=m===3;}
  else if(radar.mode==='TWS'||radar.mode==='ACM'||radar.mode==='STT'){radar.lock=null;radar.bug=null;radar.fromACM=radar.fromTWS=false;radar.mode='RWS';}}
function applyPower(){radar.setPower(['OFF','STBY','ON'][AWG.pwr]);}
const _reset=radar.reset;
radar.reset=function(ac){const o=_reset.apply(this,arguments);
  if(ac&&ac.radar&&ac.radar.name==='AWG-9'){this.barsL=[8,4,2,1];AWG.bars=4;this.bi=1;AWG.az=40;this.awgAz=40*D;this.ri=Math.min(4,this.ranges.length-1);this.awgHold=false;AWG.rm=1;AWG.sttp=0;AWG.hold=0;AWG.gA=true;AWG.trkHold=0;}
  else{this.barsL=[4,2,1];if(this.bi>2)this.bi=0;this.awgAz=null;this.awgHold=false;}
  return o;};
// ----- effects -----
const _rdet=radar.rdet;
radar.rdet=function(j,a){let R=_rdet.call(this,j,a);if(!R||!fitted()||this.sensor!=='RDR')return R;
  const vc=closure(j),nm=this.ranges[this.ri]*(this.unit/NM_),down=a.el<-1.5*D,pulse=isPulse();
  if(!AWG.paramp)R*=.65;
  if(AWG.agc===1)R*=.95;
  if(pulse){R*=this.mode==='STT'?49/90:(nm>=20?60/90:.55);if(down)R*=.55;}   // manual: pulse search 60 NM, P STT 49 NM (RWS 90)                       // no doppler to pull the target out of the ground return
  else{
    if(this.mode!=='STT'&&!inWindow(vc))return 0;                  // outside the rate scale / aspect window: no detection
    R*=[1,1.04,1.08][AWG.vc];if(AWG.rm===0)R*=110/90;   // PD search 110 NM vs RWS 90
    const mlcOn=AWG.mlc===1||AWG.mlc===2&&this.antEl<3*D;
    if(down)R*=mlcOn?1:.7;else if(AWG.mlc===1)R*=.95;
    const th=down?AWG.thL:AWG.thC;R*=th>.5?1-(th-.5)*.5:th<.25?.85:1+(.5-th)*.16;}
  if(!AWG.gA){const g=sys.fcr.gain;R*=.7+.3*Math.min(g,1);if(g>.85)R*=1-(g-.85)*1.2;}
  return R;};
const _upd=radar.update;
radar.update=function(dt){
  if(fitted()){
    this.gl.stab=AWG.stab?1:0;this.awgHold=!!AWG.trkHold;if(this.awgAz==null)this.awgAz=AWG.az*D;
    AWG.hold=Math.max(0,AWG.hold-dt);
    // follow the radar when the keys or the RIO changed the mode / power
    if(radar.mode==='TWS'&&AWG.rm<2)AWG.rm=2;else if(radar.mode==='RWS'&&(AWG.rm===2||AWG.rm===3))AWG.rm=1;
    if(radar.power==='OFF')AWG.pwr=0;else if(radar.power==='STBY'&&AWG.pwr===2)AWG.pwr=1;else if(radar.power==='ON'&&AWG.pwr<2)AWG.pwr=2;
    // the cockpit gain knob was turned: manual gain; back to full clockwise: the WCS has it again
    if(AWG._gw==null)AWG._gw=sys.fcr.gain;else if(Math.abs(sys.fcr.gain-AWG._gw)>.001){AWG._gw=sys.fcr.gain;AWG.gA=sys.fcr.gain>=.99;}
  }
  return _upd.apply(this,arguments);};
// PD STT needs the target inside the rate window; a pulse lock needs nothing but fights clutter
const _stt=radar.stt;
radar.stt=function(j){if(fitted()&&this.sensor==='RDR'&&j&&j.alive){const vc=closure(j);
    if(AWG.auto&&twoSeat()&&rio.active()&&AWG.hold<=0){const want=Math.abs(vc)<120?1:0;if(AWG.sttp!==want){AWG.sttp=want;try{rio.say(want?'Pulse STT.':'PD STT.','awg-stt',8);}catch(e){}}}
    if(AWG.sttp===0&&!inWindow(vc)){try{flash('OUT OF RATE GATE · '+AWG.VC[AWG.vc]+' / '+AWG.ASP[AWG.asp],1100);}catch(e){}return;}}
  return _stt.apply(this,arguments);};
// TGTS sets how far out the Phoenix goes active
const _mu=Missile.prototype.update;
Missile.prototype.update=function(){if(!this._atc&&this.sh===player&&fitted()&&/AIM-54/.test(this.type)){this._atc=1;this.def=Object.assign({},this.def,{pit:ATC[AWG.tgts]*NM_});}return _mu.apply(this,arguments);};
// ----- the RIO works the set -----
const say=(s,k,cd)=>{try{rio.say(s,k,cd);}catch(e){}};
function crew(dt){if(!fitted()||!twoSeat()||!AWG.auto||!rio.active()||AWG.hold>0||AWG.pwr<2||!radar.on())return;
  crew.acc=(crew.acc||0)+dt;if(crew.acc<1.5)return;crew.acc=0;
  const stt=radar.mode==='STT',L=radar.lock,pr=rio.prio&&rio.prio.alive?rio.prio:null,t=L&&L.alive?L:pr,nm=radar.ranges[radar.ri]*(radar.unit/NM_);
  // scan: narrow on a priority target, wide otherwise; bars follow the scale and the mode
  if(!stt){const wa=pr?20:40;if(AWG.az!==wa){AWG.az=wa;say(wa===20?'Narrow scan.':'Wide scan.','awg-az',20);}
    const wb=radar.mode==='TWS'?(AWG.az===20?4:2):nm>=100?2:nm>=50?4:8;if(AWG.bars!==wb){AWG.bars=wb;say(wb+' bar.','awg-bars',15);}applyScan();}
  // rate scale and aspect window follow the target
  let wv=0,wa=0,wt=1;
  if(t){const vc=closure(t),rel=_a.copy(t.pos).sub(player.pos).normalize(),jf=t.fwd?t.fwd(_b):null,asp=jf?-jf.dot(rel):0;
    wv=Math.abs(vc)<250?2:(vc>-200&&vc<1000)?1:0;wa=asp>.55?0:asp<-.55?2:1;const r=t.ac&&t.ac.rcs;wt=r!=null?(r<3?0:r>=20?2:1):1;}
  if(AWG.vc!==wv){AWG.vc=wv;say('Vc '+AWG.VC[wv]+'.','awg-vc',15);}
  if(AWG.asp!==wa){AWG.asp=wa;say('Aspect '+AWG.ASP[wa].toLowerCase()+'.','awg-asp',15);}
  if(AWG.tgts!==wt){AWG.tgts=wt;say('Targets '+AWG.TGTS[wt].toLowerCase()+'.','awg-tgts',20);}
  if(AWG.mlc!==2)AWG.mlc=2;if(!AWG.paramp)AWG.paramp=1;if(!AWG.stab)AWG.stab=1;
  const jam=radar.hoj||radar.strobes.size>0,wg=jam?1:0;if(AWG.agc!==wg){AWG.agc=wg;if(wg)say('Fast AGC, jamming.','awg-agc',20);}}
const _rup=rio.update;rio.update=function(dt){_rup.apply(this,arguments);try{crew(dt);}catch(e){}};
// ----- the panel -----
let root=null;
const css=`#awg{position:fixed;left:14px;top:90px;z-index:60;width:340px;max-height:86vh;overflow:auto;background:#14181a;border:2px solid #3a4246;border-radius:6px;color:#cfe;font:11px 'B612 Mono',monospace;padding:8px;display:none;user-select:none}
#awg h4{margin:0 0 6px;font-size:11px;letter-spacing:.1em;color:#9fd}#awg .g{display:grid;grid-template-columns:1fr 1fr;gap:6px}#awg .c{background:#0d1011;border:1px solid #2c3438;border-radius:4px;padding:4px}
#awg .c b{display:block;font-weight:400;color:#8a9;font-size:9px;margin-bottom:3px}#awg button{background:#222a2d;color:#cde;border:1px solid #3a4448;border-radius:3px;font:inherit;padding:2px 5px;margin:1px;cursor:pointer}
#awg button.on{background:#2f6b3a;color:#fff;border-color:#5c9}#awg input[type=range]{width:100%}#awg .r{grid-column:1/3}#awg small{color:#789}#awg i{font-style:normal;color:#fc6}`;
function build(){if(root)return;const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);root=document.createElement('div');root.id='awg';document.body.appendChild(root);
  root.addEventListener('mousedown',e=>e.stopPropagation());root.addEventListener('click',onClick);root.addEventListener('input',onInput);}
const btns=(key,list,cur)=>list.map((l,i)=>`<button data-k="${key}" data-v="${i}" class="${(cur==null?AWG[key]:cur)===i?'on':''}">${l}</button>`).join('');
const nums=(key,list)=>list.map(n=>`<button data-k="${key}" data-n="${n}" class="${AWG[key]===n?'on':''}">${n}</button>`).join('');
function drum(){if(radar.mode==='ACM')return radar.acm==='PAL'?'PAL':radar.acm==='VSLH'||radar.acm==='VSLL'?'VSL':'PLM';if(radar.mode==='STT')return AWG.STT[AWG.sttp];if(radar.mode==='TWS')return AWG.rm===3?'TWS MAN':'TWS AUTO';return AWG.MODE[AWG.rm];}
function render(){if(!root)return;const ok=fitted();root.style.display=AWG.show&&ok?'block':'none';if(!AWG.show||!ok)return;
  const cell=(t,b,w)=>`<div class="c${w?' r':''}"><b>${t}</b>${b}</div>`,stt=radar.mode==='STT',nm=radar.ranges[radar.ri]*(radar.unit/NM_),pulse=isPulse();
  const rb=radar.ranges.map((v,i)=>`<button data-k="ri" data-v="${i}" class="${radar.ri===i?'on':''}">${v}</button>`).join('');
  const p=[];
  p.push(cell('WCS XMT',btns('pwr',AWG.XMT)));
  p.push(cell('RANGE · NM',rb));
  p.push(cell('RADAR MODE',AWG.MODE.map((l,i)=>`<button data-k="rm" data-v="${i}" class="${!stt&&radar.mode!=='ACM'&&AWG.rm===i?'on':''}">${l}</button>`).join('')+AWG.STT.map((l,i)=>`<button data-k="sttp" data-v="${i}" class="${stt&&AWG.sttp===i?'on':''}">${l}</button>`).join(''),1));
  p.push(cell('ACM',AWG.ACM.map(([k,l])=>`<button data-a="acm" data-v="${k}" class="${radar.mode==='ACM'&&radar.acm===k?'on':''}">${l}</button>`).join('')));
  p.push(cell('TGTS',btns('tgts',AWG.TGTS)));
  p.push(cell('MLC',btns('mlc',AWG.MLC)));
  p.push(cell('AGC',btns('agc',AWG.AGC)));
  p.push(cell('PARAMP',btns('paramp',AWG.PARAMP)));
  p.push(cell('Vc',btns('vc',AWG.VC)));
  p.push(cell('ASPECT',btns('asp',AWG.ASP)));
  p.push(cell('AZ SCAN ±',nums('az',AWG.AZS)));
  p.push(cell('EL BARS',nums('bars',AWG.BARS)));
  p.push(cell('STAB',btns('stab',AWG.STAB)));
  p.push(cell('TRACK HOLD',btns('trkHold',AWG.HOLD)));
  p.push(cell(`PULSE GAIN · ${AWG.gA?'AUTO (WCS)':Math.round(sys.fcr.gain*100)}`,`<input type="range" min="0" max="100" value="${Math.round(sys.fcr.gain*100)}" data-s="gain">`,1));
  p.push(cell(`PD THRLD · CLEAR ${Math.round(AWG.thC*100)} / CLUTTER ${Math.round(AWG.thL*100)}`,`<input type="range" min="0" max="100" value="${Math.round(AWG.thC*100)}" data-s="thC"><input type="range" min="0" max="100" value="${Math.round(AWG.thL*100)}" data-s="thL">`,1));
  const L=radar.lock,ind=stt&&L?`<i>ANT TRK</i> ${radar.hoj?'<i>JAT</i>':'<i>RDROT</i>'}`:'no track';
  root.innerHTML=`<h4>AN/AWG-9 · ${drum()}${pulse&&!stt&&nm>=20?' · PULSE COMPRESSION':''}${twoSeat()?` · <span style="color:${AWG.auto?'#fc6':'#8a9'}">${AWG.auto?'RIO':'MAN'}</span>`:''}</h4><div class="g">${p.join('')}
  <div class="r"><small>${ind}  ·  ${AWG.VC[AWG.vc]} Vc / ${AWG.ASP[AWG.asp]} window ${Math.max(VCS[AWG.vc][0],ASPW[AWG.asp][0])}..${Math.min(VCS[AWG.vc][1],ASPW[AWG.asp][1])} kt${twoSeat()?`  ·  <button data-a="auto">${AWG.auto?'TAKE OVER':'GIVE TO RIO'}</button>`:''}</small></div></div>`;}
function onClick(e){e.stopPropagation();const t=e.target;if(!t.dataset)return;const d=t.dataset;
  if(d.a==='auto'){AWG.auto=!AWG.auto;AWG.hold=0;render();return;}
  if(d.a==='acm'){if(radar.mode==='ACM'&&radar.acm===d.v)radar.mode='RWS';else radar.setACM(d.v);AWG.hold=25;render();return;}
  if(!d.k)return;AWG.hold=25;
  if(d.k==='ri'){radar.ri=+d.v;}
  else if(d.n!=null){AWG[d.k]=+d.n;applyScan();}
  else{const v=+d.v;AWG[d.k]=v;if(d.k==='pwr')applyPower();else if(d.k==='rm'){if(radar.mode==='STT')radar.drop();applyMode();}}
  render();}
function onInput(e){const t=e.target;if(!t.dataset||!t.dataset.s)return;const v=+t.value/100;AWG.hold=25;
  if(t.dataset.s==='gain'){sys.fcr.gain=v;sys.mig.fgain=v;AWG._gw=v;AWG.gA=v>=.99;}else AWG[t.dataset.s]=v;}
document.addEventListener('DOMContentLoaded',build);if(document.readyState!=='loading')build();
addEventListener('keydown',e=>{if(e.code==='F9'&&!e.repeat&&fitted()){AWG.show=!AWG.show;render();e.preventDefault();}});
setInterval(()=>{try{render();}catch(e){}},250);
console.log('[awg9ctl] AWG-9 set control ready');
})();
