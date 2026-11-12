/* =====================================================================================================================
   v242 — A-7D avionics after T.O. 1A-7D-1: AN/AVQ-7(V) head-up display and the AN/APQ-126(V) forward looking radar.
   * HUD: figure 1-106 sheets 1-4 (symbology) and the HUD text on pages 1-231 to 1-235. Symbols are drawn as in the figures: flightpath
     marker (circle, wings, tail), horizon and flightpath-angle lines every 5° (positive solid, negative dashed, numbered at the outer
     end with a tick toward the horizon, centred on the flightpath marker and rolled with the aircraft), heading scale (two-digit
     numbers every 10° with dots, centre index), airspeed scale (left, digit = hundreds of knots) and altitude scale (right, digit =
     thousands of feet) with the vertical-velocity caret and the radar-altitude index mark, angle-of-attack bracket (17.5 units on
     speed), flight director / landing director, pullup command and the hatched warning indicator.
     Attack (VISUAL NORM ATTK, figure sheet 2): aiming symbol (diamond with a dot) at the computed impact point, bombfall line, upper and
     lower solution cues, pullup anticipation cue; guns and rockets: aiming symbol with the in-range cue. SCALES switch on the HUD control
     panel turns the airspeed / altitude / heading scales on and off. Symbology follows the attack master function switches.
   * Radar: APQ-126 is an air-to-ground set. It never detects or locks aircraft. Modes on the RADAR control panel and PgUp / PgDn:
     GND MAP PENCIL, GND MAP SPOILED, TERRAIN AVOIDANCE, TERRAIN FOLLOWING (profile), AIR-TO-GROUND RANGING, BEACON. The picture is a
     sector PPI (apex at the bottom) like figure 1-105. The terrain returns come from the shared A/G radar model (AGR in game.js).
   Needs game.js (AGR exposed), a7pit.js.
   ===================================================================================================================== */
(function(){
'use strict';
const ID='A-7D';
if(typeof window.AGR==='undefined'){console.warn('[a7avionics] AGR missing');return;}
const AGR=window.AGR;
const isA7=P=>!!P&&P.type===ID;
const pit=()=>window.A7PIT||{amode:()=>0,scales:()=>1,ldg:()=>1,tf:()=>0,clr:()=>1000};

/* ================================ APQ-126: air-to-ground only ================================ */
// no air targets: detection range 0 for every aircraft (search, lock, HOJ strobes, COOP all go through rdet)
{const _r=radar.rdet;radar.rdet=function(j,a){if(isA7(player)&&this.sensor!=='IRST')return 0;return _r.call(this,j,a);};}
// any air lock carried over from another jet is dropped
{const _d=radar.designate;radar.designate=function(){if(isA7(player)&&!AGR.active()){flash('APQ-126 · A/G ONLY',900);return;}return _d.apply(this,arguments);};}
const A7M=['GMP','GMS','TA','TF','AGR','BCN'];
const A7L={GMP:'GND MAP PENCIL',GMS:'GND MAP SPOILED',TA:'TERRAIN AVOIDANCE',TF:'TERRAIN FOLLOWING',AGR:'AIR-GND RANGING',BCN:'BEACON'};
{const _a=AGR.active,_m=AGR.modesFor,_l=AGR.label;
  AGR.active=function(){const P=player;
    if(isA7(P)){if(!A7M.includes(this.mode))this.mode='GMP';return P.alive&&game.active&&radar.on()&&radar.sensor==='RDR';}
    if(P&&A7M.includes(this.mode)&&!['AGR'].includes(this.mode))this.mode='GM';
    return _a.call(this);};
  AGR.modesFor=function(P){return isA7(P)?A7M:_m.call(this,P);};
  AGR.label=function(P){return isA7(P)?A7L[this.mode]||this.mode:_l.call(this,P);};}
// mode-specific returns on top of the shared ground-map column: spoiled beam smears in range, TA shows only terrain that reaches the
// clearance plane, beacon mode shows no ground at all
{const _c=AGR.colCompute;AGR.colCompute=function(P,c,now){_c.call(this,P,c,now);if(!isA7(P))return;const m=this.mode;if(m==='GMP'||m==='TF'||m==='AGR')return;
  const N=this.NB,base=c*N,val=this.val;
  if(m==='BCN'){for(let i=0;i<N;i++)val[base+i]=0;return;}
  if(m==='GMS'){let p=val[base];for(let i=0;i<N;i++){const v=val[base+i];val[base+i]=Math.min(1,(p*.55+v*.45)*1.1+.06*(1-i/N));p=val[base+i];}return;}
  if(m==='TA'){const sp=this.spec,dAz=(sp.az1-sp.az0)/this.NC,b=this.h+sp.az0+(c+.5)*dAz,sx=Math.sin(b),sz=-Math.cos(b),dg=(sp.g1-sp.g0)/N,plane=P.pos.y-pit().clr()/3.281;
    for(let i=0;i<N;i++){const g=sp.g0+(i+.5)*dg,h=groundAt(P.pos.x+sx*g,P.pos.z+sz*g);val[base+i]=h>=plane&&val[base+i]>.05?Math.min(1,.55+(h-plane)/300):0;}}};}
// sector PPI, apex at the bottom centre (figure 1-105); TF draws the terrain profile ahead instead
const S=360,AX=S/2,AY=S*.9,RR=S*.8,GIM=60*D2R;
const ppi=(az,g)=>{const r=clamp(g/radar.rngM,0,1)*RR;return{x:AX+Math.sin(az)*r,y:AY-Math.cos(az)*r};};
function a7Draw(P){const c=phScopeC.getContext('2d'),now=performance.now()/1000,col='#8dffb4',m=AGR.mode;
  c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#010603';c.fillRect(0,0,S,S);
  if(!P||!P.alive)return;
  c.font='700 13px "B612 Mono",monospace';c.textBaseline='middle';c.fillStyle=c.strokeStyle=col;
  if(!radar.on()){if(radar.power!=='OFF'){c.globalAlpha=.55;c.textAlign='center';c.fillText(radar.power==='ON'?'WARM-UP '+Math.ceil(radar.warm):'STBY',S/2,S/2);}return;}
  AGR.step(P);
  if(m==='TF'){tfDraw(c,P,col);return;}
  // map image from the shared column buffer, painted as wedges
  if(m!=='AGR'&&AGR.val&&AGR.spec){const NC=AGR.NC,NB=AGR.NB,id=AGR.img.data,val=AGR.val;
    for(let k=0;k<NC;k++){const age=now-AGR.colT[k],al=Math.pow(clamp(1-age/AGR.PERS,0,1),.7);
      for(let i=0;i<NB;i++){let v=val[k*NB+i];const l=k>0?val[(k-1)*NB+i]:v,r=k<NC-1?val[(k+1)*NB+i]:v;v=clamp((l+2*v+r)*.25*al,0,1);const p=((NB-1-i)*NC+k)*4;id[p]=v*70;id[p+1]=v*255;id[p+2]=v*130;id[p+3]=255;}}
    AGR.ictx.putImageData(AGR.img,0,0);c.imageSmoothingEnabled=true;const sp=AGR.spec,dA=(sp.az1-sp.az0)/NC;
    for(let k=0;k<NC;k++){const a=sp.az0+(k+.5)*dA;c.save();c.translate(AX,AY);c.rotate(a);c.drawImage(AGR.cv,k,0,1,NB,-RR*dA*.62,-RR,RR*dA*1.24,RR);c.restore();}}
  // beacon: coded return (two arcs) at the field
  if(m==='BCN'){const dx=AF.x-P.pos.x,dz=AF.z-P.pos.z,g=Math.hypot(dx,dz),az=Math.atan2(Math.sin(Math.atan2(dx,-dz)-AGR.h),Math.cos(Math.atan2(dx,-dz)-AGR.h));
    if(g<radar.rngM&&Math.abs(az)<GIM){c.lineWidth=3;for(let k=0;k<2;k++){const r=clamp((g+k*600)/radar.rngM,0,1)*RR;c.beginPath();c.arc(AX,AY,r,-Math.PI/2+az-.03,-Math.PI/2+az+.03);c.stroke();}c.lineWidth=1;}}
  // range marks and azimuth lines
  c.globalAlpha=.4;c.lineWidth=1;for(const q of[.25,.5,.75,1]){c.beginPath();c.arc(AX,AY,RR*q,-Math.PI/2-GIM,-Math.PI/2+GIM);c.stroke();}
  for(const a of[-60,-30,0,30,60]){const p=ppi(a*D2R,radar.rngM);c.beginPath();c.moveTo(AX,AY);c.lineTo(p.x,p.y);c.stroke();}c.globalAlpha=1;
  // antenna position (sweep) — the column being painted
  if(m!=='AGR'&&AGR.spec){const a=AGR.spec.az0+(AGR.hc+.5)*(AGR.spec.az1-AGR.spec.az0)/AGR.NC,p=ppi(a,radar.rngM);c.globalAlpha=.25;c.lineWidth=2;c.beginPath();c.moveTo(AX,AY);c.lineTo(p.x,p.y);c.stroke();c.globalAlpha=1;c.lineWidth=1;}
  // SPI and cursor (cross)
  if(SNS.spi){const dx=SNS.spi.x-P.pos.x,dz=SNS.spi.z-P.pos.z,az=Math.atan2(Math.sin(Math.atan2(dx,-dz)-AGR.h),Math.cos(Math.atan2(dx,-dz)-AGR.h)),g=Math.hypot(dx,dz);
    if(g<radar.rngM&&Math.abs(az)<GIM){const q=ppi(az,g);c.strokeStyle='#ffbf47';c.beginPath();c.moveTo(q.x,q.y-7);c.lineTo(q.x+7,q.y);c.lineTo(q.x,q.y+7);c.lineTo(q.x-7,q.y);c.closePath();c.stroke();c.strokeStyle=col;}}
  {const q=ppi(radar.cur.az,radar.cur.r*radar.rngM);c.lineWidth=2;c.strokeStyle='#ffbf47';c.beginPath();c.moveTo(q.x-9,q.y);c.lineTo(q.x+9,q.y);c.moveTo(q.x,q.y-9);c.lineTo(q.x,q.y+9);c.stroke();c.lineWidth=1;c.strokeStyle=col;}
  // legends
  const rngNM=radar.ranges[radar.ri];c.textAlign='left';c.fillText(A7L[m],8,16);c.textAlign='right';c.fillText(rngNM+' NM',S-8,16);
  {const g=radar.cur.r*radar.rngM,b=AGR.h+radar.cur.az,x=P.pos.x+Math.sin(b)*g,z=P.pos.z-Math.cos(b)*g,el=groundAt(x,z),sl=Math.hypot(g,P.pos.y-el);
    c.textAlign='left';c.fillText('CURSOR '+(g/1852).toFixed(1)+' NM',8,S-14);
    if(m==='AGR'){const r=aimRange(P);c.font='700 22px "B612 Mono",monospace';c.textAlign='center';c.fillText(r?'RANGE '+(r/1852).toFixed(2)+' NM':'NO RETURN',S/2,S*.45);
      c.font='700 13px "B612 Mono",monospace';c.fillText('SLANT RANGE TO HUD AIMING POINT',S/2,S*.45+26);}
    if(m==='TA'){c.textAlign='right';c.fillText('CLR '+pit().clr()+' FT',S-8,S-14);}}}
// terrain-following profile: terrain ahead along the flightpath against the set clearance, with the climb / dive command
function tfDraw(c,P,col){const R=Math.min(radar.rngM,10*1852),f=P.vel.clone();f.y=0;if(f.lengthSq()<1)P.fwd(f);f.y=0;f.normalize();
  const agl0=Math.max(30,P.pos.y-groundAt(P.pos.x,P.pos.z)),x0=30,x1=S-20,yA=S*.4,ky=(S*.45)/Math.max(agl0*1.3,pit().clr()/3.281*3),X=g=>x0+g/R*(x1-x0),Y=dh=>clamp(yA-dh*ky,20,S-30),clr=pit().clr()/3.281;
  c.globalAlpha=.35;c.beginPath();c.moveTo(x0,yA);c.lineTo(x1,yA);c.stroke();c.globalAlpha=1;c.textAlign='left';c.fillText('TF  '+pit().clr()+' FT',8,16);c.textAlign='right';c.fillText((R/1852).toFixed(0)+' NM',S-8,16);
  let worst=-1e9;c.lineWidth=2;c.beginPath();for(let i=0;i<=80;i++){const g=i/80*R,h=groundAt(P.pos.x+f.x*g,P.pos.z+f.z*g)-P.pos.y;if(i>2)worst=Math.max(worst,Math.atan2(h+clr,g));i?c.lineTo(X(g),Y(h)):c.moveTo(X(g),Y(h));}c.stroke();
  // ski-toe template: clearance line below the aircraft
  c.setLineDash([6,5]);c.beginPath();c.moveTo(x0,Y(-clr));c.lineTo(x1,Y(-clr));c.stroke();c.setLineDash([]);c.lineWidth=1;
  const cmd=worst*R2D-Math.atan2(P.vel.y,Math.hypot(P.vel.x,P.vel.z))*R2D;c.textAlign='center';c.font='700 16px "B612 Mono",monospace';c.fillText(cmd>1?'CLIMB '+cmd.toFixed(0)+'°':cmd<-3?'DIVE':'ON PROFILE',S/2,S-18);
  c.beginPath();c.moveTo(x0-8,yA-6);c.lineTo(x0,yA);c.lineTo(x0-8,yA+6);c.closePath();c.fill();}
{const _p=drawPhScope;drawPhScope=function(P){if(isA7(P)){a7Draw(P);return;}return _p.apply(this,arguments);};}

/* ================================ AVQ-7 HUD ================================ */
const _v1=new V3(),_v2=new V3(),_v3=new V3(),Yup=new V3(0,1,0);
// slant range from the aircraft to the ground along the HUD aiming line (APQ-126 AGR)
function groundHit(P,dir,maxR=20000){let lo=0,hi=0,step=60;for(let r=step;r<=maxR;r+=step,step*=1.06){const x=P.pos.x+dir.x*r,y=P.pos.y+dir.y*r,z=P.pos.z+dir.z*r;if(y<=groundAt(x,z)){hi=r;break;}lo=r;}
  if(!hi)return 0;for(let k=0;k<12;k++){const m=(lo+hi)/2,x=P.pos.x+dir.x*m,y=P.pos.y+dir.y*m,z=P.pos.z+dir.z*m;if(y<=groundAt(x,z))hi=m;else lo=m;}return hi;}
function aimRange(P){try{const w=game.wsel;if(AGW[w]){const s=GND.ccip(P,w);if(s&&s.p)return s.p.distanceTo(P.pos);}}catch(e){}return groundHit(P,P.fwd(_v1).clone().applyAxisAngle(P.right(_v2),-3*D2R));}
function hudMode(P){if(pit().ldg()&&((()=>{try{return sys.v.gear;}catch(e){return false;}})()))return'LDG';const am=pit().amode(),w=game.wsel;
  if(am===3||w==='GUN')return'GUN';if(AGW[w]&&(am===1||am===2))return AGW[w].k==='pod'?'RKT':'BOMB';if(MSL[w]&&MSL[w].seek==='IR'&&am!==0)return'AIM9';return'NAV';}
function drawA7Hud(P,fs){
  const k=KPX*D2R,T=(s,a,e,al='left')=>{const p=hb(a,e);if(p)txt(s,p.x,p.y,al);return p;},seg=(a1,e1,a2,e2)=>{const p=hb(a1,e1),q=hb(a2,e2);if(p&&q)line(p.x,p.y,q.x,q.y);},
    small=hfont(Math.round(fs*.8)),big=hfont(Math.round(fs*1.05));hx.lineWidth=1.6;const mode=hudMode(P),sc=pit().scales();
  const vn=P.vel.clone();if(vn.lengthSq()<1)P.fwd(vn);vn.normalize();const fpm=projDir(vn);
  // ---------- horizon and flightpath-angle lines (centred on the flightpath marker, every 5°) ----------
  {const hz=_v1.set(vn.x,0,vn.z);if(hz.lengthSq()<1e-6){P.fwd(hz);hz.y=0;}hz.normalize();const hr=_v2.set(-hz.z,0,hz.x);const gam=Math.asin(clamp(vn.y,-1,1))*R2D;
    const pt=(e,a)=>{const d=_v3.copy(hz).multiplyScalar(Math.cos(e*D2R)).addScaledVector(Yup,Math.sin(e*D2R)).addScaledVector(hr,Math.tan(a*D2R));return projDir(d.normalize());};
    for(let e=Math.ceil((gam-14)/5)*5;e<=gam+14;e+=5){if(e<-90||e>90)continue;hx.save();if(e<0)hx.setLineDash([7,6]);
      const segs=e===0?[[2,8.6]]:[[2,5.6]];for(const[i0,i1]of segs)for(const s of[-1,1]){const a=pt(e,s*i0),b=pt(e,s*i1);if(a&&b)line(a.x,a.y,b.x,b.y);}
      hx.setLineDash([]);if(e!==0){for(const s of[-1,1]){const a=pt(e,s*5.6),b=pt(e-Math.sign(e)*.7,s*5.6);if(a&&b)line(a.x,a.y,b.x,b.y);const n=pt(e-Math.sign(e)*.35,s*6.8);if(n){hx.font=small;txt(String(e),n.x,n.y,'center');}}}hx.restore();}}
  // ---------- flightpath marker: circle, wings, tail ----------
  if(fpm){circ(fpm.x,fpm.y,5.5);line(fpm.x-16,fpm.y,fpm.x-5.5,fpm.y);line(fpm.x+5.5,fpm.y,fpm.x+16,fpm.y);line(fpm.x,fpm.y-5.5,fpm.x,fpm.y-12);}
  // ---------- scales (SCALES switch) ----------
  hx.font=big;
  if(sc){// heading scale: two-digit tens every 10°, dots every 5°, centre index
    const hd=P.hdg,E=6.2,K=.3;for(let h=Math.ceil((hd-15)/5)*5;h<=hd+15;h+=5){const a=(h-hd)*K,p=hb(a,E);if(!p)continue;const hh=((h%360)+360)%360;
      hx.beginPath();hx.arc(p.x,p.y+fs*.9,1.8,0,7);hx.fill();if(hh%10===0)txt(String(hh/10).padStart(2,'0'),p.x,p.y,'center');}
    seg(0,E-1.2,0,E-2.4);
    // airspeed (left) and altitude (right): ten-step dot columns, bar = value within the hundred / thousand, digit below
    const col=(a,frac,digit,label)=>{const e0=-6.4,e1=-.8;for(let i=0;i<=10;i++){const e=e0+(e1-e0)*i/10,p=hb(a,e);if(!p)continue;if(i%5===0){const q=hb(a+.7,e);if(q)line(p.x,p.y,q.x,q.y);}else{hx.beginPath();hx.arc(p.x+k*.35,p.y,1.6,0,7);hx.fill();}}
      const pb=hb(a-.45,e0),pt2=hb(a-.45,e0+(e1-e0)*clamp(frac,0,1));if(pb&&pt2){hx.lineWidth=3;line(pb.x,pb.y,pt2.x,pt2.y);hx.lineWidth=1.6;}seg(a-.9,e0,a+.2,e0);T(digit,a,e0-1.3,'center');};
    const ias=P.cas||0,alt=Math.max(0,P.pos.y*3.2808);
    col(-8.2,(ias%100)/100,String(Math.floor(ias/100)));col(7.8,(alt%1000)/1000,String(Math.floor(alt/1000)));
    // vertical velocity caret beside the altitude scale (±2000 ft/min across the scale)
    {const vv=P.vel.y*196.85,e=-3.6+clamp(vv/2000,-1,1)*2.8,p=hb(9,e);if(p){hx.beginPath();hx.moveTo(p.x-6,p.y);hx.lineTo(p.x+5,p.y-5);hx.lineTo(p.x+5,p.y+5);hx.closePath();hx.stroke();line(p.x-6,p.y,p.x-14,p.y);}}
    // radar-altitude index mark: low altitude set on the radar altimeter, bracket on the altitude column
    {const ra=(P.pos.y-groundAt(P.pos.x,P.pos.z))*3.2808;if(ra<5000){const e=-6.4+clamp(ra/1000,0,1)*5.6,p=hb(7.8,e);if(p){line(p.x+4,p.y,p.x+10,p.y);line(p.x+10,p.y,p.x+10,p.y+5);}}}}
  // ---------- flight director (NAV): steering to the field; TF adds the vertical command ----------
  if(mode==='NAV'&&fpm){const brg=(Math.atan2(AF.x-P.pos.x,-(AF.z-P.pos.z))*R2D+360)%360,err=((brg-P.hdg+540)%360)-180;let dv=0;
    if(pit().tf()){const g=P.pos.y-groundAt(P.pos.x,P.pos.z);dv=clamp((pit().clr()/3.281-g)/150,-1,1)*3;}
    const q={x:fpm.x+clamp(err/12,-1,1)*k*5,y:fpm.y-dv*k};hx.beginPath();hx.arc(q.x,q.y,3.2,0,7);hx.fill();line(q.x,q.y,q.x,q.y+12);}
  // ---------- landing: AOA bracket (17.5 units centred on the FPM), landing director, perspective lines ----------
  if(mode==='LDG'&&fpm){const u=(P.alpha||0)*R2D*1.12+3,d=clamp((u-17.5)*.35,-3,3);const top=fpm.y-(1.6-d)*k,bot=fpm.y+(1.6+d)*k,x=fpm.x-3*k;
    line(x,top,x,bot);line(x,top,x+8,top);line(x,bot,x+8,bot);
    // landing director: glide-slope and localizer errors against a 3° path to the nearer runway end
    const end=Math.abs(P.pos.z-(AF.z+AF.hz))<Math.abs(P.pos.z-(AF.z-AF.hz))?AF.z+AF.hz:AF.z-AF.hz,dx=AF.x-P.pos.x,dz=end-P.pos.z,dist=Math.hypot(dx,dz),
      gsErr=Math.atan2(P.pos.y-AF.H,Math.max(dist,50))*R2D-3,brg=(Math.atan2(dx,-dz)*R2D+360)%360,locErr=((brg-P.hdg+540)%360)-180;
    const q={x:fpm.x+clamp(locErr/6,-1,1)*k*4,y:fpm.y+clamp(gsErr,-1.5,1.5)*k*2.5};circ(q.x,q.y,3.5);line(q.x,q.y-9,q.x,q.y+9);line(q.x-7,q.y+5,q.x+7,q.y+5);
    // perspective (runway) lines: two lines from the runway threshold toward the far end
    for(const sx of[-1,1]){const a=projDir(_v1.set(AF.x+sx*AF.W/2-P.pos.x,AF.H-P.pos.y,end-P.pos.z).normalize()),b=projDir(_v1.set(AF.x+sx*AF.W/2-P.pos.x,AF.H-P.pos.y,(end===AF.z+AF.hz?AF.z-AF.hz:AF.z+AF.hz)-P.pos.z).normalize());if(a&&b)line(a.x,a.y,b.x,b.y);}}
  // ---------- pullup command and warning indicator (ground impact predicted along the flightpath) ----------
  {let warn=false;if(!P.onGnd){for(let t=1;t<=6;t+=.5){const x=P.pos.x+P.vel.x*t,y=P.pos.y+P.vel.y*t,z=P.pos.z+P.vel.z*t;if(y<groundAt(x,z)+60){warn=true;break;}}}
    if(warn&&fpm&&blink){for(let i=-2;i<=2;i++){const x=fpm.x+i*k*1.4;line(x-k*.5,fpm.y+k*4.6,x+k*.5,fpm.y+k*2.6);}T('PULL UP',0,-8.6,'center');}}
  // ---------- attack ----------
  hx.font=small;
  if(mode==='BOMB'||mode==='RKT')drawAttack(P,fpm,k,mode);
  else if(mode==='GUN')drawGuns(P,fpm,k);
  else if(mode==='AIM9'){const b=hb(0,-1);if(b){circ(b.x,b.y,k*1.5);}T('AIM-9 '+P.count(game.wsel)+(game.arm?'':'  SAFE'),0,-9.4,'center');}
  // mode legend and standby reticle text
  T(mode==='NAV'?(pit().tf()?'NAV · TF':'NAV'):mode==='LDG'?'LDG':mode==='GUN'?'GUN '+P.gun.ammo+(game.arm?'':'  SAFE'):'',-8.6,6.6,'left');}
function drawAttack(P,fpm,k,mode){const w=game.wsel;let s=null;try{s=GND.ccip(P,w);}catch(e){}
  const lbl=(SN[w]||w)+' '+(typeof agLeft==='function'?agLeft(P,w):P.count(w))+(game.arm?'':'  SAFE');{const p=hb(0,-9.4);if(p)txt(lbl,p.x,p.y,'center');}
  if(!s||!s.p){const p=hb(0,-8.6);if(p)txt('NO SOLN',p.x,p.y,'center');return;}
  let ap=proj(s.p);const lo=hb(0,-10);let clip=false;if(!ap||(lo&&ap.y>lo.y)){clip=true;if(fpm&&lo)ap={x:fpm.x,y:lo.y};}
  if(!ap)return;
  // aiming symbol: diamond with a centre dot
  if(clip)hx.setLineDash([4,4]);diamond(ap.x,ap.y,k*1.1);hx.setLineDash([]);hx.beginPath();hx.arc(ap.x,ap.y,1.8,0,7);hx.fill();
  if(mode==='BOMB'&&fpm){// bombfall line: from the aiming symbol up through the flightpath marker's column to the top of the field
    const top={x:fpm.x+(fpm.x-ap.x)*.6,y:fpm.y-k*9};line(ap.x,ap.y-k*1.1,top.x,top.y);
    // solution cues: the upper cue rides down the line as time-to-release shrinks; release when it reaches the flightpath marker
    const tr=s.t!=null?clamp(s.t,0,30):10,f=clamp(tr/12,0,1),ux=fpm.x+(top.x-fpm.x)*f,uy=fpm.y+(top.y-fpm.y)*f;hx.lineWidth=3;line(ux-k*1.2,uy,ux+k*1.2,uy);
    const lx=fpm.x+(top.x-fpm.x)*f*.55,ly=fpm.y+(top.y-fpm.y)*f*.55;line(lx-k*.8,ly,lx+k*.8,ly);hx.lineWidth=1.6;}
  if(mode==='RKT'){const ok=s.rng==null||s.rng<=(s.max||4000);if(ok){hx.lineWidth=3;line(ap.x-k*1.2,ap.y-k*1.8,ap.x+k*1.2,ap.y-k*1.8);hx.lineWidth=1.6;}}
  pullupCue(P,fpm,k);}
// pullup anticipation cue: rides up toward the FPM as the dive approaches the minimum recovery altitude
function pullupCue(P,fpm,k){if(!fpm)return;const agl=P.pos.y-groundAt(P.pos.x,P.pos.z),vs=-P.vel.y;if(vs<=2)return;const t=(agl-450)/vs,d=clamp(t/6,0,1)*5+.5,y=fpm.y+d*k;
  line(fpm.x-k*1.6,y-k*.9,fpm.x-k*1.6,y);line(fpm.x-k*1.6,y,fpm.x+k*1.6,y);line(fpm.x+k*1.6,y,fpm.x+k*1.6,y-k*.9);}
function drawGuns(P,fpm,k){let R=0;const nose=P.fwd(_v1).clone();R=groundHit(P,nose.applyAxisAngle(P.right(_v2),-2*D2R),4500);const air=!R;if(air)R=600;
  const sp=proj(gunFun(P,clamp(R,250,4000)));if(sp){diamond(sp.x,sp.y,k*1.1);hx.beginPath();hx.arc(sp.x,sp.y,1.8,0,7);hx.fill();
    if(!air&&R<=2400){hx.lineWidth=3;line(sp.x-k*1.2,sp.y-k*1.8,sp.x+k*1.2,sp.y-k*1.8);hx.lineWidth=1.6;}}
  if(!air)pullupCue(P,fpm,k);}
{const _h=drawHudSym;drawHudSym=function(P,fs,lh){if(isA7(P)){drawA7Hud(P,fs);return;}return _h.apply(this,arguments);};}
{const _a=agHud;agHud=function(P,fs){if(isA7(P))return;return _a.apply(this,arguments);};}
console.info('[a7avionics] AVQ-7 HUD and APQ-126 A/G radar active');
})();
