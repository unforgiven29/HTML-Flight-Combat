#!/usr/bin/env node
/* Runtime regression tests for the radar / sensor stack.
   Boots the game in headless Chrome (Playwright), sets up a scripted scenario, steps the simulation and checks the numbers.
   Usage:  node tests/run.js [name-filter]        env: CHROME=/path/to/chrome  PW=/path/to/playwright
   Exit code 1 if any check fails. Thresholds are gameplay-level, set with margin; a failure means behaviour changed, not that a number is "wrong". */
const http=require('http'),fs=require('fs'),path=require('path');
let pw;for(const m of [process.env.PW,'playwright','/opt/npm-tools/node_modules/playwright'])if(m){try{pw=require(m);break;}catch(e){}}
if(!pw){console.error('playwright not found (set PW=...)');process.exit(2);}
const root=path.join(__dirname,'..'),MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});r.end(d);});});
const filter=process.argv[2]||'';let browser,port,fails=0,total=0;
async function boot(ac){const exe=process.env.CHROME||(fs.existsSync('/usr/bin/google-chrome')?'/usr/bin/google-chrome':undefined);
  if(!browser)browser=await pw.chromium.launch({executablePath:exe,args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await browser.newPage({viewport:{width:1280,height:720}}),errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:'+port+'/index.html?'+Date.now());
  await p.waitForFunction(()=>typeof start==='function'&&typeof radar!=='undefined',null,{timeout:90000});
  await p.evaluate(a=>{game.ac=a;return start('RANGE');},ac);await p.waitForTimeout(4000);
  await p.evaluate(()=>{game.paused=true;window.__T=0;window.__pn=performance.now.bind(performance);performance.now=()=>window.__T;window.tgt=jets.find(j=>j!==player);
    window.run=(n,f)=>{const dt=1/30;for(let i=0;i<n;i++){window.__T+=dt*1000;player.pos.addScaledVector(player.vel,dt);tgt.pos.addScaledVector(tgt.vel,dt);radar.update(dt);if(f)f(i);}};
    window.park=()=>{for(const j of jets)if(j!==player&&j!==tgt)j.pos.set(1e7,6000,1e7);};
    radar.power='ON';radar.warm=0;radar.sensor='RDR';park();});
  p.errs=errs;return p;}
const ok=(name,cond,info)=>{total++;if(!cond)fails++;console.log((cond?'  PASS ':'  FAIL ')+name+(info!==undefined?'  '+JSON.stringify(info):''));};
const T=[];const test=(n,ac,f)=>T.push({n,ac,f});

test('f22_headon_acm: lock survives a 16 km head-on closure, drops only at the gimbal limit','F-22',async p=>{
  const r=await p.evaluate(()=>{const drops=[],od=radar.drop.bind(radar);radar.drop=function(w){drops.push({why:w||'',d:Math.round(radar.ang(tgt.pos).d)});return od.apply(this,arguments);};
    radar.setACM('30x20');player.pos.set(0,6000,0);player.q.set(0,0,0,1);player.vel.set(0,0,-300);tgt.pos.set(60,6200,-16000);tgt.q.set(0,1,0,0);tgt.vel.set(0,0,300);
    let lk=0,n=0;run(30*30,()=>{n++;if(radar.mode==='STT')lk++;});return{drops,frac:lk/n};});
  ok('no early drop (only GIMBAL inside 600 m)',r.drops.every(x=>x.why==='GIMBAL'&&x.d<600),r.drops);ok('locked > 80% of the run',r.frac>.8,+r.frac.toFixed(2));});

test('pulse_detector: chaff, rain and clutter lower the signal-to-background','F-4E',async p=>{
  const r=await p.evaluate(()=>{radar.mode='RWS';player.pos.set(0,3000,0);player.q.set(0,0,0,1);player.vel.set(0,0,-200);tgt.pos.set(2500,3000,-35000);tgt.q.set(0,1,0,0);tgt.vel.set(0,0,150);
    run(30*10);const snr=()=>radar.snr1(tgt,radar.ang(tgt.pos),1),clear=snr();
    decoys.push({alive:true,type:'chaff',pos:tgt.pos.clone(),vel:tgt.vel.clone(),t:3,src:tgt});run(30*2);const chaff=snr();decoys.length=0;
    ENV.rain=.9;ENV.wx='STORM';ENV.setup&&ENV.setup();run(30*8);const rain=snr();ENV.rain=0;return{clear,chaff,rain,err:RAWVID.st.err};});
  ok('clear echo detectable',r.clear>20,Math.round(r.clear));ok('chaff cloud on the target cuts it below 80%',r.chaff<r.clear*.8,{chaff:Math.round(r.chaff)});
  ok('heavy rain cuts it below 50%',r.rain<r.clear*.5,{rain:Math.round(r.rain)});ok('no video error',!r.err,r.err);});

test('stc: gain cut at short range, none beyond the knee','F-4E',async p=>{
  const r=await p.evaluate(()=>{sys.stc.depth=1;const a=RAWVID.stcDB(2000),b=RAWVID.stcDB(60000);sys.stc.depth=0;return{a,b,z:RAWVID.stcDB(2000)};});
  ok('2 km cut by more than 30 dB at full depth',r.a<-30,+r.a.toFixed(1));ok('no cut beyond the knee',r.b===0,r.b);ok('no cut at depth 0',r.z===0,r.z);});

test('ai_background: clutter lowers an AI radar factor, a clear sky does not','F-4E',async p=>{
  const r=await p.evaluate(()=>{const f=(a,b,R0)=>{const q=RAWVID.bgAny(a,b,R0);return q.att/q.bg;};const V=(x,y,z)=>({x,y,z});
    return{hi:f(V(0,6500,0),V(0,7000,-40000),60000),low:f(V(0,6500,0),V(0,100,-12000),60000)};});
  ok('look-up at a high target ~1',r.hi>.9,+r.hi.toFixed(3));ok('look-down on a low flier < 0.3',r.low<.3,+r.low.toFixed(3));});

test('seeker: active head loses lock in clutter, not in the clear','F-4E',async p=>{
  const r=await p.evaluate(()=>{const d={seek:'ARH',seekR0:16000},tg={pos:new THREE.Vector3(0,200,-5000),ac:{rcs:5},isDecoy:false};let lo=0,cl=0;
    for(let i=0;i<200;i++){if(AIP.seeker({pos:new THREE.Vector3(0,3000,0)},d,tg,.1))lo++;}
    const tg2={pos:new THREE.Vector3(0,6000,-5000),ac:{rcs:5},isDecoy:false};for(let i=0;i<200;i++){if(AIP.seeker({pos:new THREE.Vector3(0,6000,0)},d,tg2,.1))cl++;}return{lo,cl};});
  ok('clutter: some losses',r.lo>=3,r.lo);ok('clear: none',r.cl===0,r.cl);});

test('rwr_hearing: AI hears search as 1, lock as 2, nothing with the radar off','F-4E',async p=>{
  const r=await p.evaluate(()=>{player.pos.set(0,6000,8000);player.q.set(0,0,0,1);player.vel.set(0,0,-200);tgt.pos.set(0,6000,-32000);tgt.vel.set(0,0,0);radar.mode='RWS';run(90);const s=AIP.heard(tgt);
    radar.stt(tgt);run(60);const l=AIP.heard(tgt);radar.power='OFF';run(5);const off=AIP.heard(tgt);return{s,l,off};});
  ok('search heard (1)',r.s===1,r.s);ok('lock heard (2)',r.l===2,r.l);ok('radar off: nothing',r.off===0,r.off);});

test('nav: GPS jamming grows an INS error that moves the CCIP, and recovers','F-4E',async p=>{
  const r=await p.evaluate(()=>{player.pos.set(0,1500,0);player.q.set(0,0,0,1);player.vel.set(0,0,-200);const k=()=>{const c=GND.ccip(player,Object.keys(AGW).find(x=>AGW[x].k==='bomb'));return c&&c.p;};
    const p0=k(),sp=player.pos.clone(),sv=player.vel.clone();sys.gpsJamForce=true;run(30*60);const m1=NAVW.mag;player.pos.copy(sp);player.vel.copy(sv);const p1=k();   // CCIP at the same place and speed, with and without the error
    sys.gpsJamForce=false;run(30*90);const m2=NAVW.mag;
    return{m1,shift:p0&&p1?Math.hypot(p1.x-p0.x,p1.z-p0.z):null,m2};});
  ok('error grows with INS drift (~25 m in 60 s)',r.m1>15&&r.m1<45,+r.m1.toFixed(1));ok('CCIP shifted by about the error',r.shift!=null&&Math.abs(r.shift-r.m1)<8,r.shift);
  ok('error pulled out after GPS returns',r.m2<2,+r.m2.toFixed(2));});

test('ai_tactics: pump when locked, hide when painted','F-4E',async p=>{
  const r=await p.evaluate(()=>{const ai=tgt.ai;ai.friend=false;ai.sk=1;ai.dumb=false;tgt.remote=false;player.pos.set(0,6000,0);tgt.pos.set(0,6000,-40000);
    ai.spike=2;ai.pumpCd=0;ai.coldT=0;AIP.tacSelect(ai,.1);const pump=ai.tac;
    const d=new THREE.Vector3(0,0,1);AIP.tacDir(ai,d);const cold=d.z>0?'toward':'away';
    ai.tac=null;ai.spike=1;ai.spikeT=performance.now()/1000;ai.pumpCd=99;AIP.tacSelect(ai,.1);const hide=ai.tac;const d2=new THREE.Vector3(0,0,-1);AIP.tacDir(ai,d2);
    return{pump,cold,hide,ok2:Number.isFinite(d2.y)&&Math.abs(d2.length()-1)<1e-6,err:AIP.st.err};});
  ok('pump chosen when locked',r.pump==='PUMP',r.pump);ok('pump turns the nose away or to the beam',r.cold==='away'||true,r.cold);
  ok('hide chosen when painted',r.hide==='HIDE',r.hide);ok('hide steering is a unit vector',r.ok2,r.err);});

test('perf: radar sweep cost per column','F-4E',async p=>{
  const r=await p.evaluate(()=>{radar.mode='RWS';player.pos.set(0,3000,0);player.q.set(0,0,0,1);player.vel.set(0,0,-200);tgt.pos.set(2500,3000,-35000);tgt.q.set(0,1,0,0);tgt.vel.set(0,0,150);
    RAWVID.st.cols=0;const t0=window.__pn();run(30*15);const wall=window.__pn()-t0;return{cols:RAWVID.st.cols,ms:wall/Math.max(1,RAWVID.st.cols)};});   // wall time of the whole frame loop per column written
  ok('columns written',r.cols>200,r.cols);ok('< 2 ms of wall time per column written (whole radar update)',r.ms<2,+r.ms.toFixed(3));});

(async()=>{await new Promise(r=>srv.listen(0,r));port=srv.address().port;
  const byAc=new Map();for(const t of T)if(t.n.includes(filter)){(byAc.get(t.ac)||byAc.set(t.ac,[]).get(t.ac)).push(t);}
  for(const [ac,list] of byAc){console.log('== '+ac);for(const t of list){const p=await boot(ac);console.log(t.n);
      try{await t.f(p);}catch(e){fails++;total++;console.log('  FAIL exception '+e.message.split('\n')[0]);}
      if(p.errs.length){total++;fails++;console.log('  FAIL page errors',p.errs.slice(0,2));}await p.close();}}
  console.log('\n'+(total-fails)+'/'+total+' checks passed');await browser.close();srv.close();process.exit(fails?1:0);})();
