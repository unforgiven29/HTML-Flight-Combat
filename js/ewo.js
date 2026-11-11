"use strict";
/* =====================================================================================================================
   v289 — the back-seater runs the electronic warfare (EA-18G EWO, Su-34 WSO, and every other two-seater with a jammer).

   Two tiers:
     EA      EA-18G Growler: ALQ-218 wingtip receivers (precision emitter location), ALQ-99 / NGJ stand-off jamming, HARM cueing.
     STRIKE  Su-34 and the other two-seaters (F-15E, F-18F, Tornado, F-111, Su-24M, JH-7 ...): SPO-32 / ALR-type threat calls with
             bearing only, self-protection jammer management.
   What he does (EWO AUTO, Shift+5 hands the jammer over / takes it back; pressing 5 yourself keeps it for 25 s):
     * keeps the jammer warm (STBY) and picks the technique from the threat:
         radar missile in the air at you / a fighter radar locked on you  -> DECM (deception breaks the lock, one on one)
         a jamming-capable escort job (a friendly inside a hostile radar's coverage, EA tier)  -> NOISE (screens the whole package)
         a search radar sweeping you  -> AUTO (the jammer goes to deception on its own when a lock appears)
     * calls new emitters: type, bearing, range (EA: from the ESM fix; STRIKE: bearing and a rough range) and when they go to track
     * EA tier: cues the ARM. With a HARM selected and nothing designated he designates the most dangerous emitter in the seeker field
       (a SAM tracking radar first, then search radars) and calls it; U, or a manual pick, keeps him off for 15 s.
   ESM range is a multiple of the emitter's own detection range (a receiver hears a radar long before the radar sees you), limited by the
   radar horizon. Only emitters that are actually radiating are heard: an emitter on EMCON is silent.
   ===================================================================================================================== */
(function(){
if(typeof ecmUpdate!=='function'||typeof rio==='undefined'||typeof GND==='undefined'||typeof ecmFitted!=='function'){console.warn('[ewo] core missing');return;}
const nowS=()=>performance.now()/1000;
const EWO=window.EWO={on:true,hold:0,armHold:0,calls:[],last:{},seen:new Map(),esm:[],acc:0,arm:0,mode:-1};
const tier=P=>!P||!P.alive||P.remote||!P.ac||!P.ac.rio||!P.ecm?null:(P.type==='EA-18G'?'EA':'STRIKE');
EWO.tier=tier;
EWO.active=()=>!!(tier(player)&&EWO.on);
const say=(s,key,cd=8)=>{if(window.CREWV&&CREWV.rewrite){const r=CREWV.rewrite(s);if(r)s=r;}const t=nowS();if(key){if((EWO.last[key]||0)>t)return;EWO.last[key]=t+cd;}EWO.calls.push({s,t});if(EWO.calls.length>3)EWO.calls.shift();};
EWO.say=say;
const who=P=>P.type==='EA-18G'?'EWO':(window.CREWV&&CREWV.label?CREWV.label():(P.ac.wso?'WSO':'RIO'));
const brg=(P,p)=>(Math.atan2(p.x-P.pos.x,-(p.z-P.pos.z))*180/Math.PI+360)%360;
const b3=b=>String(Math.round(b)%360).padStart(3,'0');
const hor=(h1,h2)=>4120*(Math.sqrt(Math.max(h1,1))+Math.sqrt(Math.max(h2,1)));
const SIDE=u=>u.side;

// ---------- ESM: every radiating hostile emitter the receiver can hear
function esmScan(P,t){
  const ea=t==='EA',mul=ea?4.5:2.4,out=[];
  const hear=(o,R0,name,kind,lk)=>{const d=o.pos.distanceTo(P.pos);if(d>Math.min(R0*mul,hor(P.pos.y-groundAt(P.pos.x,P.pos.z),(o.T&&o.T.ant)||(o.pos.y-groundAt(o.pos.x,o.pos.z))+8)+20000))return;
    out.push({o,d,b:brg(P,o.pos),name,kind,lk,R0,rngOK:ea||d<R0*1.2});};
  for(const u of GND.units){if(!u.alive||!u.T||!u.T.emit||u.side===P.side||(typeof emitOn==='function'&&!emitOn(u)))continue;
    const nm=(window.ARM&&ARM.name?ARM.name(u):String(u.T.n)),trk=!!(u.T.trk||/SAM|TR|ENGAGE/i.test(String(u.T.n)));
    hear(u,u.T.R0||30000,nm,'gnd',!!(u.lock||u.tgt===P||u.track===P));}
  for(const j of jets){if(j===P||!j.alive||!j.ai||j.ai.friend||j.gciA||j.side===P.side)continue;const R0=(j.ac.radar&&j.ac.radar.R0)||40000;
    hear(j,R0,j.ac.nctr||j.type,'air',!!(j.ai.radarLock&&j.ai.t===P));}
  out.sort((a,b)=>(b.lk-a.lk)||(a.d-b.d));return out;}
EWO.scan=esmScan;

function manage(P,t,dt){
  EWO.acc-=dt;if(EWO.acc>0)return;EWO.acc=.25;
  const e=P.ecm,fit=ecmFitted(P);EWO.esm=esmScan(P,t);
  // ---- calls
  const seen=EWO.seen,now=nowS();
  for(const m of EWO.esm){let r=seen.get(m.o);
    if(!r){r={t:now,lk:false};seen.set(m.o,r);
      const rng=m.rngOK?' for '+Math.round(m.d/NM):'';
      say(t==='EA'?`ESM, ${m.name} ${m.kind==='gnd'?'radar':'airborne'}, ${b3(m.b)}${rng}.`:`${m.kind==='gnd'?'Radar':'Airborne radar'} ${b3(m.b)}${m.rngOK?', about '+Math.round(m.d/NM/5)*5+' miles':''}.`,'n'+(m.o.id||m.name),20);}
    if(m.lk&&!r.lk){r.lk=true;say(`${m.name} is tracking us, ${b3(m.b)}.`,'l'+(m.o.id||m.name),12);}else if(!m.lk)r.lk=false;}
  for(const [o,r] of seen)if(!o.alive||now-r.t>600)seen.delete(o);
  if(!fit){say('No jammer on the aircraft. Pods go on the wing stations.','nofit',40);return;}
  if(!EWO.on)return;
  if(EWO.hold>now)return;
  // ---- technique
  let want=1,why='';
  const inbound=missiles.some(m=>m.alive&&m.track===P&&m.def.seek!=='IR'&&(m.def.seek==='SARH'?m.dl:m.active));
  const lock=EWO.esm.some(m=>m.lk&&m.kind==='air')||(typeof ecmThreat==='function'&&ecmThreat(P));
  if(inbound){want=4;why='Missile in the air, jamming.';}
  else if(lock||EWO.esm.some(m=>m.lk)){want=4;why='Locked up, deception on.';}
  else if(t==='EA'){
    // stand-off / escort: a friendly strike aircraft inside a hostile radar's coverage and inside our jamming reach
    const esc=EWO.esm.some(m=>jets.some(f=>f!==P&&f.alive&&f.side===P.side&&f.pos.distanceTo(P.pos)<45000&&f.pos.distanceTo(m.o.pos)<m.R0*1.1));
    if(esc){want=3;why='Noise on, covering the package.';}
  }
  if(want===1&&EWO.esm.some(m=>m.d<m.R0*1.15)){want=2;why='Radar on us, jammer auto.';}
  if(e.mode!==want){e.mode=want;if(why)say(why,'m'+want,10);else if(want===1)say('Jammer standing by.','m1',30);}
  // ---- ARM cueing (EA tier)
  if(t==='EA'&&window.ARM&&ARM.w()&&now>EWO.armHold){
    ARM.fixMode(P);ARM.scan(P);
    if(!ARM.sel&&ARM.list.length){const L=ARM.list.slice().sort((a,b)=>(b.lk-a.lk)||(a.d-b.d));const x=L[0];
      ARM.sel={u:x.u,pos:x.u.pos.clone(),src:ARM.mode};
      say(`Cueing the ${ARM.name(x.u)}, ${b3(brg(P,x.u.pos))} for ${Math.round(x.d/NM)}.`,'arm',6);}}
}
{const _e=ecmUpdate;ecmUpdate=function(j,dt){if(j===player){const t=tier(j);if(t)try{manage(j,t,dt);}catch(err){console.warn('[ewo]',err);}}return _e(j,dt);};}

// ---------- pilot input: pressing 5 keeps the jammer for 25 s; Shift+5 hands it over / takes it back; U keeps the EWO off the ARM
{const _c=cycleECM;cycleECM=function(){const P=player;if(tier(P)&&EWO.on){EWO.hold=nowS()+25;say('Your jammer.','hand',3);}return _c.apply(this,arguments);};}
addEventListener('keydown',e=>{if(!game.running||!$('#menu').hidden||e.repeat||e.ctrlKey||e.metaKey||e.altKey||!tier(player))return;
  if(e.code==='Digit5'&&e.shiftKey){e.preventDefault();e.stopImmediatePropagation();EWO.on=!EWO.on;EWO.hold=0;EWO.calls=[];say(EWO.on?'I have the jammer.':'Your jammer.',null);sfx.click();}
  else if(e.code==='KeyU')EWO.armHold=nowS()+15;},true);

// ---------- HUD: calls (amber, above the RIO's) and a status chip
{const _d=drawRIO;drawRIO=function(){_d.apply(this,arguments);const P=player;if(!P||mcam.m)return;const t=tier(P);if(!t)return;
  const now=nowS(),fs=Math.round(clamp(Math.min(W,H)*.019,11,15));hx.save();hx.shadowBlur=0;hx.font=`600 ${fs}px "B612",sans-serif`;hx.textBaseline='middle';hx.textAlign='left';
  let y=H-(isTouch?190:92)-fs*1.9*Math.max(1,rio.calls.filter(c=>now-c.t<=7).length)-6;
  const chip=`${who(P)} EW ${EWO.on?'AUTO':'MAN'} · ${ecmTxt(P)||'N/F'}${EWO.esm.length?' · ESM '+EWO.esm.length:''}`;
  hx.globalAlpha=.55;hx.fillStyle='#0b0f0d';hx.fillRect(14,y-fs*.8,hx.measureText(chip).width+16,fs*1.6);hx.globalAlpha=.95;hx.fillStyle=EWO.on?'#9ee9ff':'#c9c9c9';hx.fillText(chip,22,y);y-=fs*1.9;
  for(let i=EWO.calls.length-1;i>=0;i--){const c=EWO.calls[i],age=now-c.t;if(age>7)continue;const a=clamp(1.5-age/4.7,0,1),w=hx.measureText(c.s).width;
    hx.globalAlpha=a*.5;hx.fillStyle='#0b0f0d';hx.fillRect(14,y-fs*.8,w+54,fs*1.6);hx.globalAlpha=a;hx.fillStyle='#9ee9ff';hx.fillText(who(P),22,y);hx.fillStyle='#eef2ec';hx.fillText(c.s,22+fs*2.6,y);y-=fs*1.9;}
  hx.restore();};}

// ---------- reset with the mission, loadout screen row
{const _c=GND.clear.bind(GND);GND.clear=function(){_c();EWO.calls=[];EWO.seen.clear();EWO.last={};EWO.hold=0;EWO.armHold=0;EWO.esm=[];EWO.on=true;};}
if(typeof acPerfRows==='function'){const _p=acPerfRows;acPerfRows=function(tp){const rows=_p(tp),A=AC[tp];if(!A||!A.rio||!ECM_FIT[tp])return rows;
  const ea=tp==='EA-18G';rows.push(['EW STATION',(ea?'EWO: ALQ-218 ESM fix, noise / deception, HARM cueing, stand-off jamming':(A.wso?'WSO':'RIO')+': threat calls (bearing), jammer management')+' · Shift+5 takes the jammer']);return rows;};}
console.info('[ewo] ready');
})();
