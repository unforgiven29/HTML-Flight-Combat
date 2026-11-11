/* =====================================================================================================================
   v237 — Cold War interceptor systems pass: MiG-19P (RP-5 Izumrud), F-106A (Hughes MA-1 + AIR-2A Genie),
   Lightning F.6 (Ferranti AI.23B Airpass), J 35F (PS-01/A, Rb 28). Needs game.js, coldwar.js, coldwar-jets.js.

   Sources used:
   * RP-5 Izumrud: two dishes — search (two-way raster ±60° az, −10…+20° el, ~1.33 s frame, 12 km display, ~8 km sure detection)
     and a separate tracking dish (cone ±7°, lock window ≈4 km). The scope goes blank on lock; range goes to the sight's range
     gauge (DCS MiG-19P manual / Chuck's guide, RAZBAM forum notes, MiG-17P RP-1 ground-check text).
   * MA-1: non-Doppler set — low targets hide in ground clutter (f-106deltadart.com). The trigger is a consent: the MA-1
     computer fires the round when the solution is met (F-106 crew accounts). Steering-dot attack display. AIR-2A Genie:
     unguided, MA-1 computes range and timed detonation, 1.5 kt (≈300 m lethal radius). Usual load 2× AIM-4F, 2× AIM-4G + 1 Genie.
   * AI.23B: monopulse X-band set; on the B model the whole attack is flown head-down on the CRT (steering dot + range circle),
     the missile seeker is slaved to the radar line of sight (Lightning pilot's notes summary, AIRPASS history).
   * Rb 28 (HM-58 Falcon): direct-hit only, no proximity fuze; Rb 27 proximity fuze 9 m (Ängelholm flygmuseum armament list).
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof AC==='undefined'||typeof radar==='undefined'){console.warn('[intc] game core missing');return;}
const D=D2R,KMm=1000;
const rn=()=>player&&player.ac&&player.ac.radar?player.ac.radar.name:'';
const is=n=>!!player&&player.alive&&rn()===n;
const offBore=p=>{const b=p.clone().sub(player.pos).applyQuaternion(player.q.clone().invert());return{az:Math.atan2(b.x,-b.z),el:Math.atan2(b.y,Math.hypot(b.x,b.z)),d:b.length()};};

/* ---------------- Rb 28: contact fuze only ---------------- */
if(MSL['Rb 28'])Object.assign(MSL['Rb 28'],{contact:1,fuse:0});

/* ---------------- AIR-2A Genie (F-106A) ---------------- */
if(!MSL['AIR-2A']&&MSL['AIM-4F']){
  const d=Object.assign({},MSL['AIM-4F'],{seek:'SARH',N:0,apn:0,gimbal:60*D,mass:373,acc:300,burn:2,cd:7.5e-5,maxG:0,fuse:300,contact:0,life:12,rmin:2500,aiR:9500,aiOff:6*D,hoj:0,genie:1});
  delete d.ph;const dia=.44,S=Math.PI*dia*dia/4,dv=d.acc*d.burn,mbo=d.mass*Math.exp(-dv/2350),mp=d.mass-mbo,tb=d.burn;
  d.ph={S,dia,m0:d.mass,mp,mbo,tb,ts:0,gap:0,Tb:mp*2350/tb,Ts:0,mdB:mp/tb,mdS:0,cd0:2.38*d.cd*mbo/S,cnMax:.0001};d.ph.cna=d.ph.cnMax/.38;d.burnT=tb;
  d.rcs=.25;d.irsB=2.4;d.irsC=.03;
  MSL['AIR-2A']=d;SHAPE['AIR-2A']={L:2.95,R:.22,f:[[2.5,.5,.4]]};MDIA['AIR-2A']=dia;if(!MSL_KEYS.includes('AIR-2A'))MSL_KEYS.push('AIR-2A');
  SN['AIR-2A']='GENIE';WNAME['AIR-2A']='AIR-2A Genie · unguided nuclear rocket';
  // centre of the bay, between the forward and aft Falcon pairs
  try{const A=AC['F-106A'];if(A&&A.st){A.st.G=[0,-1.05,-.5];if(A.rel&&!A.rel.includes('G'))A.rel.push('G');}
    if(STN['F-106A'])STN['F-106A'].G=['AIR-2A'];
    for(const era of['cold','modern'])if(LOAD[era]&&LOAD[era]['F-106A'])LOAD[era]['F-106A'].G='AIR-2A';}catch(e){console.warn('[intc] genie station',e);}
}

/* ---------------- gimbals ---------------- */
RGIM['RP-5 Izumrud']=[60,20,10,0];RGIM['MA-1']=[70,60,60,1];RGIM['AI.23B Airpass']=[60,50,50,1];RGIM['PS-01/A']=[60,50,50,1];
// RP-5: one fixed 12 km display, sure detection ~8 km on a fighter
try{const r=AC['MiG-19'].radar;r.ranges=[12];r.R0=10000;}catch(e){}

/* ---------------- detection ---------------- */
{const _d=radar.rdet;radar.rdet=function(j,a){let R=_d.call(this,j,a);if(!player||this.sensor!=='RDR'||!R)return R;const n=rn(),h=player.pos.y-groundAt(player.pos.x,player.pos.z);
  if(n==='MA-1'&&a.el<-2*D)R*=lerp(.3,.65,clamp(h/9000,0,1));          // no Doppler: a low target sits in the clutter
  if(n==='RP-5 Izumrud'){if(a.el<-10*D||a.el>20*D)return 0;if(a.el<-2*D)R*=.35;R=Math.min(R,12*KMm);}
  if(n==='AI.23B Airpass'&&a.el<-2*D)R*=lerp(.35,.6,clamp(h/9000,0,1));
  return R;};}

/* ---------------- lock rules ---------------- */
{const _s=radar.stt;radar.stt=function(j){
  if(j&&is('RP-5 Izumrud')){const o=offBore(j.pos);
    if(o.d>4*KMm){try{flash('ИЗУМРУД · ЗАХВАТ ≤ 4 КМ',1100);}catch(_){}return;}
    if(Math.hypot(o.az,o.el)>7*D){try{flash('ИЗУМРУД · ЦЕЛЬ ВНЕ КОНУСА ±7°',1100);}catch(_){}return;}}
  return _s.apply(this,arguments);};}

/* ---------------- MA-1 fire consent: the trigger arms, the computer fires ---------------- */
const MA1W=/^(AIM-4F|AIM-4G|AIR-2A)$/;let consent=null;
{const _p=pickle;pickle=function(force){
  if(is('MA-1')&&!game.paused&&MA1W.test(game.wsel)&&!force){const w=game.wsel;
    if(consent){consent=null;try{flash('MA-1 · CONSENT WITHDRAWN',900);}catch(_){}return;}
    if(radar.mode!=='STT'||!radar.lock){try{flash('MA-1 · LOCK REQUIRED',1100);}catch(_){}return;}
    if(!game.arm||player.count(w)<=0)return _p.apply(this,arguments);
    consent={w,t:radar.lock};try{flash('MA-1 · FIRE CONSENT · '+SN[w],1200);}catch(_){}return;}
  return _p.apply(this,arguments);};}
function ma1Window(w,j){const d=MSL[w],o=offBore(j.pos),cl=-j.vel.clone().sub(player.vel).dot(j.pos.clone().sub(player.pos).normalize());
  const rmax=(d.aiR||9000)*(w==='AIR-2A'?1:clamp(.75+cl/1200,.6,1.25));
  return{ok:o.d>(d.rmin||1000)&&o.d<rmax&&Math.hypot(o.az,o.el)<(w==='AIR-2A'?4:10)*D,d:o.d,rmax};}

/* ---------------- per-frame rules ---------------- */
{const _st=Jet.prototype.step;Jet.prototype.step=function(dt){const r=_st.call(this,dt);if(this!==player)return r;
  // RP-5 tracking dish: ±7° cone, the lock drops outside it
  if(is('RP-5 Izumrud')&&radar.mode==='STT'&&radar.lock){const o=offBore(radar.lock.pos);if(Math.hypot(o.az,o.el)>7.5*D||o.d>5*KMm){radar.drop&&radar.drop();try{flash('ИЗУМРУД · СРЫВ СОПРОВОЖДЕНИЯ',1000);}catch(_){}}}
  // MA-1 consent → automatic launch when the solution is met
  if(consent){if(!is('MA-1')||radar.mode!=='STT'||radar.lock!==consent.t||!consent.t.alive||player.count(consent.w)<=0||!game.arm){consent=null;}
    else if(ma1Window(consent.w,consent.t).ok){const w=consent.w;consent=null;const sv=game.wsel;game.wsel=w;try{pickle(true);}finally{game.wsel=sv;}
      try{flash('MA-1 · FIRE · '+SN[w]+(w==='AIR-2A'?' · BREAK AWAY':''),1500);}catch(_){}}}
  return r;};}

/* ---------------- scopes ---------------- */
const _ph=drawPhScope;
function frame(c,S,col){c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='rgb(1,7,4)';c.fillRect(0,0,S,S);c.strokeStyle=col;c.fillStyle=col;c.textBaseline='middle';}
// Steering-dot attack display (Hughes MA-1 / Ferranti AI.23B): fly the dot into the centre; the range circle shrinks to the
// launch range; in range the circle flashes (MA-1) or the attack square appears (AI.23B)
function attack(c,S,col,ttl){const L=radar.lock,P=player;if(!L)return false;const o=offBore(L.pos),cx=S/2,cy=S/2,k=(S*.42)/(30*D);
  c.lineWidth=1.4;c.globalAlpha=.45;c.beginPath();c.arc(cx,cy,S*.42,0,7);c.stroke();c.beginPath();c.moveTo(cx-10,cy);c.lineTo(cx+10,cy);c.moveTo(cx,cy-10);c.lineTo(cx,cy+10);c.stroke();c.globalAlpha=1;
  const w=MSL[game.wsel]?game.wsel:null,d=w?MSL[w]:null,rmax=d?(rn()==='MA-1'&&MA1W.test(w)?ma1Window(w,L).rmax:(d.aiR||8000)):8000,inR=d&&o.d<rmax&&o.d>(d.rmin||800);
  const rr=clamp(o.d/Math.max(rmax*2,1),.08,1)*S*.4,now=performance.now()/1000;
  if(!(inR&&rn()==='MA-1'&&now%0.5<.25)){c.lineWidth=2;c.beginPath();c.arc(cx,cy,rr,0,7);c.stroke();}
  const dx=cx+clamp(o.az*k,-S*.45,S*.45),dy=cy-clamp(o.el*k,-S*.45,S*.45);c.beginPath();c.arc(dx,dy,6,0,7);c.fill();
  c.font='700 13px "B612 Mono",monospace';c.textAlign='left';c.fillText(ttl,10,16);c.textAlign='right';c.fillText((o.d/(P.ac.units==='met'?1000:NM)).toFixed(1)+(P.ac.units==='met'?' KM':' NM'),S-10,16);
  const cl=-L.vel.clone().sub(P.vel).dot(L.pos.clone().sub(P.pos).normalize());c.fillText('Vc '+Math.round(cl*1.944),S-10,S-14);
  c.textAlign='left';if(d)c.fillText(SN[w],10,S-14);
  if(rn()==='AI.23B Airpass'){if(d&&game.arm){c.font='700 18px "B612 Mono",monospace';c.fillText('A',18,S-44);}if(inR){c.lineWidth=2.5;c.strokeRect(S-46,S-62,24,24);}}
  if(rn()==='MA-1'&&consent){c.textAlign='center';c.fillText('CONSENT',cx,S-34);}
  return true;}
drawPhScope=function(P){const n=P&&P.ac&&P.ac.radar?P.ac.radar.name:'';
  if(!P||!P.alive||!(n==='RP-5 Izumrud'||n==='MA-1'||n==='AI.23B Airpass'))return _ph.apply(this,arguments);
  if((n==='MA-1'||n==='AI.23B Airpass')&&radar.on()&&radar.mode==='STT'&&radar.lock){const c=phScopeC.getContext('2d');frame(c,360,'#8dffb4');attack(c,360,'#8dffb4',n==='MA-1'?'MA-1 ATTACK':'AI.23B ATTACK');return;}
  if(n!=='RP-5 Izumrud')return _ph.apply(this,arguments);
  // RP-5 Izumrud: ±60° × 0-12 km, 2 km range lines; blank on lock
  const c=phScopeC.getContext('2d'),S=360,col='#9dffc0';frame(c,S,col);if(!radar.on())return;
  const x0=40,x1=320,y0=40,y1=320,X=a=>x0+(clamp(a*R2D,-60,60)+60)/120*(x1-x0),Y=d=>y1-clamp(d/12000,0,1)*(y1-y0),now=performance.now()/1000;
  if(radar.mode==='STT'&&radar.lock){c.globalAlpha=.8;c.font='700 16px "B612 Mono",monospace';c.textAlign='center';c.fillText('ЗАХВАТ',S/2,S-22);
    const o=offBore(radar.lock.pos);c.fillText((o.d/1000).toFixed(1)+' КМ',S/2,22);return;}
  c.globalAlpha=.3;c.lineWidth=1;for(let k=2;k<=12;k+=2){const y=Y(k*1000);c.beginPath();c.moveTo(x0,y);c.lineTo(x1,y);c.stroke();}
  for(const a of[-60,-30,0,30,60]){const x=X(a*D);c.beginPath();c.moveTo(x,y0);c.lineTo(x,y1);c.stroke();}
  // 4 km lock line, solid
  c.globalAlpha=.8;c.setLineDash([6,4]);c.beginPath();c.moveTo(X(-7*D),Y(4000));c.lineTo(X(7*D),Y(4000));c.stroke();c.setLineDash([]);
  c.globalAlpha=1;c.font='700 12px "B612 Mono",monospace';c.textAlign='left';for(let k=4;k<=12;k+=4)c.fillText(String(k),x1+6,Y(k*1000));
  // sweep: two-way raster, 1.33 s frame
  const ph=(now%1.33)/1.33,sw=ph<.5?ph*2:2-ph*2,sx=x0+sw*(x1-x0);c.globalAlpha=.55;c.lineWidth=2;c.beginPath();c.moveTo(sx,y0);c.lineTo(sx,y1);c.stroke();
  const rawv=window.RAWVID&&RAWVID.on&&radar.on()&&radar.sensor==='RDR'&&radar.mode==='RWS'&&window.flPaint;
  if(rawv){c.save();c.beginPath();c.rect(x0,y0,x1-x0,y1-y0);c.clip();                                  // the scope is a fixed 12 km; the video is built for the selected range, so it is stretched and clipped, never drawn outside the tube
    c.strokeStyle=col;flPaint(c,(u,v)=>({x:x0+(u+1)/2*(x1-x0),y:y1-(v*radar.rngM/12000)*(y1-y0)}),1.2,.8);c.restore();}
  else for(const [j,tk] of radar.tracks){if(!j.alive||tk.d>12000)continue;const x=X(tk.az),y=Y(tk.d);c.globalAlpha=clamp(1-(now-tk.t)/2.6,.1,1);c.lineWidth=3;c.beginPath();c.moveTo(x-6,y);c.lineTo(x+6,y);c.stroke();}
  c.globalAlpha=1;c.font='700 13px "B612 Mono",monospace';c.textAlign='left';c.fillText('ОБЗОР',x0,20);};

console.info('[intc] RP-5 / MA-1 / Genie / AI.23B / Rb 28 rules active');
})();
