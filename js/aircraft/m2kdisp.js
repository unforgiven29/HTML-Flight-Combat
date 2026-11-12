/* =====================================================================================================================
   v246 — Mirage 2000C RDI radar display (VTB) and SERVAL warner (VCM), after the RAZBAM DCS M-2000C flight manual (FM p.112-120)
   and Chuck's guide (CG part 8 radar, part 10 RWR).  Needs game.js and m2000c.js (which carries the radar behaviour: PRF, scan, gimbal).
   VTB (Visualisation Tete Basse), green monochrome:
     * two display modes: PPI (polar, apex at the aircraft) and B-scope (azimuth across, range up); knob "DISPLAY MODE (34)"
     * ranges 10 / 20 / 40 / 80 / 160 / 320 NM; the 320 NM setting draws no radar image (it is for DO designation tracks)
     * top left range, top right PRF (HFR / ENT / BFR), bottom left bar count (lignes 4 / 2 / 1), bottom right PSID / PSIC pre-selection
     * contacts are a V (range closing) or an inverted V (opening) with the closing speed in Mach beside it, short bars show which bar
       painted it; BFR has no Doppler so it draws plain returns with no V and no speed
     * TDC '+' with the altitudes (x1000 ft) of the top and bottom of the beam at the cursor
     * P blinking = warm-up (the radar needs 3 minutes), SIL = standby / not emitting, B = jammed, antenna elevation scale with the horizon
     * PSID = track-while-scan: designated track boxed, data on the upper line.  PSIC = single target track, data on the upper line
     * close combat: BORE, VERT, HUD (SVI), BAH (HFR) / BA2 (medium PRF), RRAS
   SERVAL (VCM): top view of the electromagnetic picture, aircraft at the centre; ONE symbol per emitter with its category (airborne,
   ground, missile) and a three-letter code (UNK when not identified).  Closer to the centre = more dangerous.  Critical (high threat) zone =
   a lock or guidance signal; low threat zone = a radar in search.  Up to 8 radar threats plus 2 launch warnings at once.
   The "+" is the operation indicator, PCM shows when the Sabre jammer is emitting.  Symbols are drawn from the manual's three categories; the
   exact glyph shapes are in figures the text export does not carry, so they follow the description.
   ===================================================================================================================== */
(function(){
'use strict';
const ID='Mirage 2000';
if(typeof AC==='undefined'||!AC[ID]||typeof drawFCR==='undefined'||typeof drawRWR==='undefined'){console.warn('[m2kdisp] needs Mirage 2000C and game.js');return;}
const isM=()=>!!player&&player.type===ID;
const NMm=1852,G='#79ffa0',GD='rgba(121,255,160,.32)',GA='#ffe27a',RD='#ff5a46';
const sv=(k,d)=>{try{const v=window.M2KPIT?window.M2KPIT.sv(k):undefined;return v!=null?v:d;}catch(e){return d;}};

/* ranges: 10 / 20 / 40 / 80 / 160 / 320 NM */
try{AC[ID].radar.ranges=[10,20,40,80,160,320];}catch(e){}
{const _r=radar.reset;radar.reset=function(ac){const o=_r.apply(this,arguments);if(ac&&ac.radar&&ac.radar.name==='RDI'){this.ranges=[10,20,40,80,160,320];if(this.ri>=this.ranges.length)this.ri=2;}return o;};}

/* ---------------- RDI display (VTB) ---------------- */
const MACH=340;
function drawVTB(){
  const c=fcr,S=360,P=player,now=performance.now()/1000,blink=performance.now()%700<420;
  c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#010a04';c.fillRect(0,0,S,S);if(!P)return;
  if(radar.power==='OFF')return;
  const dim=.4+.6*(sys.fcr&&sys.fcr.sym!=null?sys.fcr.sym:1);c.globalAlpha=dim;
  c.textBaseline='middle';c.font='700 15px "B612 Mono",monospace';c.fillStyle=G;c.strokeStyle=G;c.lineWidth=1.4;
  const ppi=sv('rdisp',0)===0,nm=radar.rngM/NMm,rngNm=Math.round(nm),gim=radar.gimbal(),emit=radar.on(),big=rngNm>=320;
  // geometry: PPI apex bottom centre, B-scope a rectangle
  const AX=180,AY=332,RR=205,bx0=44,bx1=316,by0=92,by1=330;
  const pos=(az,d)=>{const f=clamp(d/radar.rngM,0,1.02);return ppi?[AX+Math.sin(az)*f*RR,AY-Math.cos(az)*f*RR]:[bx0+(az*R2D+60)/120*(bx1-bx0),by1-f*(by1-by0)];};
  // frame and range marks
  c.strokeStyle=GD;
  if(ppi){c.beginPath();c.moveTo(AX,AY);c.lineTo(...pos(-60*D2R,radar.rngM));c.arc(AX,AY,RR,-Math.PI/2-60*D2R,-Math.PI/2+60*D2R);c.lineTo(AX,AY);c.stroke();
    [.25,.5,.75].forEach(k=>{c.beginPath();c.arc(AX,AY,RR*k,-Math.PI/2-60*D2R,-Math.PI/2+60*D2R);c.stroke();});
    [-30,0,30].forEach(a=>{c.beginPath();c.moveTo(AX,AY);c.lineTo(...pos(a*D2R,radar.rngM));c.stroke();});}
  else{c.strokeRect(bx0,by0,bx1-bx0,by1-by0);[-30,0,30].forEach(a=>{const x=pos(a*D2R,0)[0];c.beginPath();c.moveTo(x,by0);c.lineTo(x,by0+8);c.moveTo(x,by1);c.lineTo(x,by1-8);c.stroke();});
    [.25,.5,.75].forEach(k=>{const y=by1-k*(by1-by0);c.beginPath();c.moveTo(bx0,y);c.lineTo(bx0+8,y);c.moveTo(bx1,y);c.lineTo(bx1-8,y);c.stroke();});}
  // own aircraft symbol
  c.strokeStyle=G;{const [x,y]=ppi?[AX,AY]:[(bx0+bx1)/2,by1];c.beginPath();c.moveTo(x,y-9);c.lineTo(x+7,y+2);c.lineTo(x-7,y+2);c.closePath();c.stroke();}
  // top line: range, PRF
  c.textAlign='left';c.fillText(String(rngNm),8,16);
  const PRFN={A:'HFR',AUTO:'ENT',B:'BFR'},prf=radar.mode==='ACM'?'A':radar.prf,pn=PRFN[prf]||'ENT';
  c.textAlign='right';c.fillText(pn,S-8,16);
  // status: warm-up P, standby SIL
  c.textAlign='center';
  if(radar.power==='ON'&&radar.warm>0){if(blink)c.fillText('P',S/2,16);}
  else if(radar.power!=='ON'||radar.stby)c.fillText('SIL',S/2,16);
  // horizon and elevation scale (left): 1 = 10 deg, centred on the aircraft reference line, horizon tilts with roll and slides with pitch
  {const ex=22,ey0=118,ey1=300,em=(ey0+ey1)/2,k=(ey1-ey0)/2/60;c.strokeStyle=GD;c.beginPath();c.moveTo(ex,ey0);c.lineTo(ex,ey1);c.stroke();c.font='700 11px "B612 Mono",monospace';c.textAlign='left';
    for(let a=-50;a<=50;a+=10){const y=em-a*k;c.beginPath();c.moveTo(ex,y);c.lineTo(ex+(a%30===0?8:5),y);c.stroke();if(a%30===0&&a)c.fillText(String(Math.abs(a)/10),ex+11,y);}
    const el=clamp(radar.antEl*R2D,-55,55),y=em-el*k;c.strokeStyle=G;c.fillStyle=G;c.beginPath();c.moveTo(ex-1,y);c.lineTo(ex-10,y-5);c.lineTo(ex-10,y+5);c.closePath();c.fill();
    const hy=em+clamp(P.pitch*R2D,-58,58)*k,hr=-P.bank;c.save();c.beginPath();c.rect(ex+14,ey0,56,ey1-ey0);c.clip();c.translate(ex+42,clamp(hy,ey0,ey1));c.rotate(hr);c.strokeStyle=GD;c.beginPath();c.moveTo(-26,0);c.lineTo(26,0);c.stroke();c.restore();
    c.font='700 15px "B612 Mono",monospace';}
  // scan cone / antenna
  const aw=radar.azs[radar.ai]*D2R,sc=radar.scanC||0,stt=radar.mode==='STT',tws=radar.mode==='TWS',acm=radar.mode==='ACM';
  c.strokeStyle=GD;c.setLineDash([4,5]);
  if(!stt){let lo=sc-aw,hi=sc+aw;if(acm){const w={BORE:3,VERT:6,'30x20':30,HUD:10}[radar.acm]||3;lo=sc-w*D2R;hi=sc+w*D2R;}
    [lo,hi].forEach(a=>{a=clamp(a,-gim,gim);c.beginPath();c.moveTo(...(ppi?[AX,AY]:pos(a,0)));c.lineTo(...pos(a,radar.rngM));c.stroke();});}
  c.setLineDash([]);
  {const [x,y]=pos(clamp(radar.antAz,-60*D2R,60*D2R),0);c.strokeStyle=G;c.beginPath();c.moveTo(x,y+(ppi?0:3));c.lineTo(x,y+(ppi?-12:10));c.stroke();}
  // contacts
  const nb=radar.barsL[radar.bi],doppler=prf!=='B',cnt=radar.tracks.size;let shown=0;
  const vcOf=j=>{const rel=j.pos.clone().sub(P.pos),d=Math.max(rel.length(),1),los=rel.multiplyScalar(1/d);return (P.vel.dot(los)-j.vel.dot(los));};
  const barMarks=(x,y,j)=>{if(nb<2)return;const q=radar.ang(j.pos),off=q.bel-radar.antEl,span=nb*3.3*D2R,idx=clamp(Math.floor((off+span/2)/span*nb),0,nb-1);
    const up=idx>=nb/2,n=up?idx-Math.floor(nb/2)+1:Math.floor(nb/2)-idx;for(let i=0;i<n;i++){const yy=y+(up?-9-i*3:9+i*3);c.beginPath();c.moveTo(x-4,yy);c.lineTo(x+4,yy);c.stroke();}};
  const contact=(x,y,j,tk,al,box,hot)=>{c.globalAlpha=dim*al;c.strokeStyle=c.fillStyle=hot?GA:G;c.lineWidth=1.6;
    if(doppler&&!acm||doppler){const vc=vcOf(j),cl=vc>0;c.beginPath();if(cl){c.moveTo(x-6,y-6);c.lineTo(x,y+5);c.lineTo(x+6,y-6);}else{c.moveTo(x-6,y+6);c.lineTo(x,y-5);c.lineTo(x+6,y+6);}c.stroke();
      c.font='700 11px "B612 Mono",monospace';c.textAlign='left';c.fillText((Math.abs(vc)/MACH).toFixed(1),x+9,y-2);c.font='700 15px "B612 Mono",monospace';}
    else{c.fillRect(x-4,y-2.5,8,5);}
    barMarks(x,y,j);
    if(box){c.strokeRect(x-11,y-11,22,22);}c.lineWidth=1.4;};
  if(emit&&!big){
    const bug=tws?radar.bug:null;
    for(const [j,tk] of radar.tracks){if(!j.alive||tk.d>radar.rngM||tk.hoj)continue;const L=stt&&j===radar.lock;if(stt&&!L)continue;
      let az=tk.az,d=tk.d,al=clamp(1-(now-tk.t)/(tws?7:10),.15,1);
      if(tws){const q=radar.ang(radar.trkPos(j,tk,now));az=q.az;d=q.d;al=clamp(1.15-(now-tk.t)/7,.3,1);}
      if(Math.abs(az)>62*D2R||d>radar.rngM)continue;const [x,y]=pos(az,d);shown++;
      if(L){c.globalAlpha=dim;c.strokeStyle=c.fillStyle=GA;c.lineWidth=2;const rh=(j.hdg-P.hdg)*D2R;c.strokeRect(x-9,y-9,18,18);c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(rh)*24,y-Math.cos(rh)*24);c.stroke();c.lineWidth=1.4;}
      else contact(x,y,j,tk,al,tws&&j===bug,tws&&j===bug);}
    // jam strobes: a bearing line the whole way out, with B for brouillage
    for(const [j,s] of radar.strobes){if(Math.abs(s.az)>62*D2R)continue;c.globalAlpha=dim*clamp(1-(now-s.t)/4.5,.2,1);c.strokeStyle=c.fillStyle=G;c.setLineDash([2,4]);
      c.beginPath();c.moveTo(...(ppi?[AX,AY]:pos(s.az,0)));c.lineTo(...pos(s.az,radar.rngM));c.stroke();c.setLineDash([]);const [x,y]=pos(s.az,radar.rngM*.96);c.textAlign='center';c.fillText('B',x,y+8);}
    c.globalAlpha=dim;
    // own missiles
    for(const m of missiles){if(!m.alive||m.sh!==P||m.def.seek==='IR')continue;const a=radar.ang(m.pos);if(a.d>radar.rngM||Math.abs(a.az)>60*D2R)continue;const [x,y]=pos(a.az,a.d);c.strokeStyle=G;c.beginPath();c.arc(x,y,3.5,0,7);c.stroke();}
  }
  // B on the top line when the locked contact is jamming us out
  if(radar.hoj){c.textAlign='left';c.fillStyle=G;c.fillText('B',8,34);}
  // TDC with beam altitude numbers (thousands of feet) at the cursor
  if(!stt){c.globalAlpha=dim;const [cx,cy]=pos(radar.cur.az,radar.cur.r*radar.rngM),[lo,hi]=radar.covers(),R=radar.cur.r*radar.rngM;c.strokeStyle=c.fillStyle=G;c.lineWidth=1.6;
    c.beginPath();c.moveTo(cx-8,cy);c.lineTo(cx+8,cy);c.moveTo(cx,cy-8);c.lineTo(cx,cy+8);c.stroke();c.lineWidth=1.4;
    c.font='700 12px "B612 Mono",monospace';c.textAlign='left';const kf=h=>Math.round((P.pos.y+R*Math.tan(h))*3.2808/1000);
    c.fillText(String(kf(hi)),cx+11,cy-9);c.fillText(String(kf(lo)),cx+11,cy+9);c.font='700 15px "B612 Mono",monospace';}
  // mode / data line
  c.globalAlpha=dim;c.fillStyle=G;c.textAlign='center';
  if(acm){const m=radar.acm==='BORE'?'BORE':radar.acm==='VERT'?'VERT':radar.acm==='HUD'?'HUD':(prf==='A'?'BAH':'BA2');c.fillText(m,S/2,38);}
  if(stt||tws&&radar.bugOK&&radar.bugOK()){const L=radar.tgt();if(L){const vc=vcOf(L),d=L.pos.distanceTo(P.pos)/NMm,alt=Math.round(L.pos.y*3.2808/100);
      c.fillStyle=GA;c.font='700 13px "B612 Mono",monospace';c.fillText(radar.hoj?'D ---   B':'D '+d.toFixed(1)+'   VC '+Math.round(vc*1.9438)+'   A '+alt,S/2,58);
      const toMe=P.pos.clone().sub(L.pos),lf=L.fwd(new V3()),asp=180-lf.angleTo(toMe)*R2D;c.fillText(String(Math.round(L.hdg)).padStart(3,'0')+'°  ASP '+Math.round(asp),S/2,76);c.font='700 15px "B612 Mono",monospace';}}
  // bottom line: bars (lignes), azimuth, PSID / PSIC pre-selection
  c.fillStyle=G;c.textAlign='left';c.fillText(String(nb)+'L',8,S-10);c.textAlign='center';c.fillText(String(Math.round(aw*R2D)),S/2,S-10);
  c.textAlign='right';c.fillText(stt?'PSIC':tws?'PSID':(sv('rpsic',0)?'PIC':'PID'),S-8,S-10);
  if(big){c.textAlign='center';c.fillStyle=GD;c.fillText('DO',S/2,(by0+by1)/2);}
  c.globalAlpha=1;
}
{const _f=drawFCR;drawFCR=function(){if(!isM())return _f.apply(this,arguments);drawVTB();};}

/* ---------------- SERVAL warner (VCM) ---------------- */
// receiver: six antennas, 360 deg azimuth, +/-60 deg elevation; eight radar symbols and two launch warnings at a time
if(typeof RWRF!=='undefined'){RWRF['Serval']=Object.assign({},RWRF['ALR-69']||RWRF['ALR-56C'],{k:3,sd:5,pd:.9,lpi:.55,id:.9,mem:5,arh:9000,sarh:1,sam:1,lim:[8,8],ring:'serval',dia:0,tone:'N'});}
if(typeof RWR_OF!=='undefined')RWR_OF[ID]='Serval';
// three-letter codes (manual table; the manual notes they are not final).  Airborne first, ground second
const AIR={'29':'M29','27':'S27','25':'M25','23':'M23','21':'M21','31':'M31','16':'F16','15':'F15','14':'F14','18':'F18','4':'F4','F5':'F5','F4':'F4','F1':'F1','A4':'A4','A7':'A7','86':'F86','38':'F5','37':'S34','M2':'2KC','M3':'2KC','TOR':'IDS','AV8':'AV8','JAG':'JAG','AMX':'AMX','F8':'F8','LTN':'LTN','J8':'J8','JH7':'JH7','AJ':'AJ'};
const GND={'6':'SA6','4':'SA4','10':'S10','15':'S15','19':'S19','22':'S22','P':'PAT','RO':'ROL','NS':'NAS','A':'AAA','S':'SA','GP':'GP','HK':'HAW','SEM':'SEM'};
const codeOf=t=>{if(!t.idOk||t.sym==='U')return'UNK';return (t.gnd?GND[t.sym]:AIR[t.sym])||String(t.sym).slice(0,3);};
// where a symbol sits: critical (lock / guidance) inside the high threat zone, searching radars in the outer band; stronger / closer toward the centre
const ZONE=.44;
function ring(t){const x=clamp(t.dEst/Math.max(t.e.R0*RW.sy.k,1),0,1);
  if(t.mode!=='S')return .17+.2*(1-t.pwr);
  return ZONE+.1+.4*x;}
function glyph(c,cat,x,y,on){c.strokeStyle=c.fillStyle=on;c.lineWidth=2;
  if(cat==='air'){c.beginPath();c.moveTo(x-10,y-1);c.lineTo(x,y-11);c.lineTo(x+10,y-1);c.stroke();}                       // chevron: airborne radar
  else if(cat==='gnd'){c.beginPath();c.arc(x,y-1,9,Math.PI,0);c.lineTo(x+9,y-1);c.stroke();c.beginPath();c.moveTo(x-9,y-1);c.lineTo(x+9,y-1);c.stroke();} // dome: ground radar
  else{c.beginPath();c.moveTo(x,y-12);c.lineTo(x+10,y-1);c.lineTo(x,y+10);c.lineTo(x-10,y-1);c.closePath();c.stroke();}    // diamond: missile radar
  c.lineWidth=1.4;}
function drawVCM(dt){
  const c=rwc,S=240,P=player,cx=S/2,cy=S/2,NOW=performance.now()/1000,bl=performance.now()%420<250;
  c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#010a04';c.fillRect(0,0,S,S);if(!P)return;
  if(!sys.rwr.pwr)return;
  rwrUpdate(dt||0);const th=RW.list.slice(0,8),msl=RW.msl.slice(0,2),test=NOW<sys.rwr.testT;
  c.globalAlpha=.4+.6*(sys.rwr.brt!=null?sys.rwr.brt:1);c.textAlign='center';c.textBaseline='middle';
  // zones: critical (inner) and low threat (outer)
  c.strokeStyle=GD;c.lineWidth=1;c.beginPath();c.arc(cx,cy,ZONE*S/2,0,7);c.stroke();c.beginPath();c.arc(cx,cy,.97*S/2,0,7);c.stroke();
  // operation indicator + (powered), PCM (Sabre emitting / inciting)
  c.fillStyle=G;c.font='700 18px "B612 Mono",monospace';c.fillText('+',cx,cy);
  const e=P.ecm,pcm=e&&e.mode>0&&e.on;c.font='700 11px "B612 Mono",monospace';
  if(pcm||test)c.fillText('PCM',cx+S*.34,cy-S*.4);
  if(test){c.fillStyle=G;c.font='700 11px "B612 Mono",monospace';
    [[0,.3],[.9,.7],[-.9,.7],[2.2,.7],[-2.2,.7]].forEach(([a,r])=>{const x=cx+Math.sin(a)*r*S/2,y=cy-Math.cos(a)*r*S/2;glyph(c,'air',x,y,G);c.fillText('TST',x,y+13);});return;}
  // threats, nudged apart when two sit on top of each other
  const placed=[];
  for(const t of th){const a=t.a,r=ring(t)*S/2;let x=cx+Math.sin(a)*r,y=cy-Math.cos(a)*r;
    for(let k=0;k<4;k++){const hit=placed.find(p=>Math.hypot(p[0]-x,p[1]-y)<24);if(!hit)break;const ra=a+(k%2?-1:1)*(.14+k*.05);x=cx+Math.sin(ra)*r;y=cy-Math.cos(ra)*r;}
    placed.push([x,y]);
    const cat=t.gnd?'gnd':'air',hot=t.mode!=='S',flash=t.mode==='L'?bl:true,newc=RW.clk-t.newT<1.2;
    if(!flash||(newc&&!bl&&t.mode==='S'))continue;
    const col=t.mode==='L'?RD:hot?GA:G;glyph(c,cat,x,y,col);c.fillStyle=col;c.font='700 11px "B612 Mono",monospace';c.fillText(codeOf(t),x,y+13);}
  // D2M launch warnings: missile symbol close to the centre, flashing
  for(const q of msl){if(!bl)continue;const r=.2*S/2,x=cx+Math.sin(q.a)*r,y=cy-Math.cos(q.a)*r;glyph(c,'msl',x,y,RD);c.fillStyle=RD;c.font='700 11px "B612 Mono",monospace';c.fillText('MSL',x,y+13);}
  c.globalAlpha=1;
}
{const _d=drawRWR;drawRWR=function(dt){if(!isM())return _d.apply(this,arguments);drawVCM(dt);};}
window.M2KDISP={drawVTB,drawVCM,codeOf};
})();
