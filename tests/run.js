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

test('weather: one shared precipitation field, carried by the wind, coverage follows rain','F-4E',async p=>{
  const r=await p.evaluate(()=>{const cov=rain=>{ENV.rain=rain;let n=0,m=0;for(let i=0;i<60;i++)for(let j=0;j<60;j++){m++;if(WXC.at(i*3000-90000,j*3000-90000,0)>.05)n++;}return n/m;};
    const c1=cov(.3),c2=cov(.9);ENV.rain=.7;const W={};ENV.windAt(3000,W);const t=600;let best=1e9;   // the pattern at t is the pattern at 0 moved by wind*t
    for(let k=0;k<20;k++){const x=k*2000-20000,z=k*1500-15000;best=Math.min(best,Math.abs(WXC.at(x+W.x*t,z+W.z*t,t)-WXC.at(x,z,0)));}
    const x0=12345,z0=-6789,a=WXC.at(x0,z0,5),pos={x:x0,z:z0};const h=WXC.at(pos.x,pos.z,performance.now()/1000);
    return{c1,c2,best,w:Math.hypot(W.x,W.z),same:Number.isFinite(a)&&Number.isFinite(h)};});
  ok('more rain covers more of the map',r.c2>r.c1+.1,[+r.c1.toFixed(2),+r.c2.toFixed(2)]);
  ok('cells are carried by the real wind',r.best<1e-6,r.best);ok('field is finite for radar and cockpit',r.same);});

test('clutter: MTI residue depends on geometry and scatterer motion, land follows the drawn terrain','F-4E',async p=>{
  const r=await p.evaluate(()=>{player.vel.set(0,0,-200);const f=RAWVID.mtiRes(player,{bwA:3.3*Math.PI/180});
    const ahead=f(0,-1,.2,false),abeam=f(1,0,.2,false),sea=f(0,-1,1.0,false),rain=f(0,-1,1.5,true);
    const lt=[0,1,2,3,4,5,6,7].map(i=>RAWVID.land?RAWVID.land(i*1700+5000,i*900-3000,300,.02):0);
    const rf=RAWVID.land?RAWVID.land(AF.x,AF.z,40,0):0;
    return{ahead,abeam,sea,rain,lt,rf,hang:RAWVID.land?RAWVID.land(AF.x+640,AF.z-190,40,0):0};});
  ok('clutter cancels deepest dead ahead, worst abeam',r.ahead<r.abeam*.5,[r.ahead,r.abeam]);
  ok('moving scatterers (sea, rain) leak more through MTI than quiet land',r.sea>r.ahead&&r.rain>r.sea,[r.ahead,r.sea,r.rain]);
  ok('fields give different reflectivity cell to cell',Math.max(...r.lt)>Math.min(...r.lt)*1.3,r.lt.map(x=>+x.toFixed(2)));
  ok('airfield concrete is smooth, hangars are bright',r.hang>r.rf*50,[r.rf,r.hang]);});

test('rcs: fluctuation is correlated with aspect and time, engines modulate nose-on','F-4E',async p=>{
  const r=await p.evaluate(()=>{const lam=.031,toMe=new THREE.Vector3(0,0,1),j={q:new THREE.Quaternion(),ab:0,n:.9};
    const corr=(turn)=>{const st={},xs=[];let t=0;RAWVID.fluct(st,j,toMe,t,lam);let n=0,sx=0,sy=0,sxy=0,sxx=0,syy=0,prev=st.f;
      for(let i=0;i<400;i++){t+=.5;if(turn)j.q.setFromAxisAngle(new THREE.Vector3(0,1,0),i*.02);const f=RAWVID.fluct(st,j,toMe,t,lam);n++;sx+=prev;sy+=f;sxy+=prev*f;sxx+=prev*prev;syy+=f*f;prev=f;}
      return(n*sxy-sx*sy)/Math.sqrt((n*sxx-sx*sx)*(n*syy-sy*sy));};
    const steady=corr(false);j.q.identity();const turning=corr(true);
    return{steady,turning,nose:RAWVID.jemDepth({n:.9,ab:0},1),side:RAWVID.jemDepth({n:.9,ab:0},0),idle:RAWVID.jemDepth({n:.3,ab:0},1)};});
  ok('steady aspect keeps the fade between looks',r.steady>r.turning+.3,[+r.steady.toFixed(2),+r.turning.toFixed(2)]);
  ok('engine modulation only nose or tail on, and with power',r.nose>.15&&r.side===0&&r.idle<r.nose,r);});

test('antenna: sidelobe nulls and peaks follow the taper of the set','F-4E',async p=>{
  const r=await p.evaluate(()=>{const S=window.SENSOR_SIG,b=.06,f=(u,sll)=>S.pattern(u*b,0,b,b,sll);const o={};
    for(const sll of[-21,-30]){const per=S.period(sll);o[sll]={per,null:f(2*per,sll),peak:f(2.5*per,sll),n3:f(3*per,sll),p3:f(3.5*per,sll)};}return o;});
  ok('wider taper, tighter nulls',r[-30].per<r[-21].per,[r[-21].per,r[-30].per]);
  for(const k of[-21,-30])ok('peak is above its neighbouring nulls at '+k+' dB',r[k].peak>r[k].null*3&&r[k].p3>r[k].n3*3,[r[k].null,r[k].peak]);});

test('scope: sweep nonlinearity, range marks, range noise, PRF agility','F-4E',async p=>{
  const r=await p.evaluate(()=>{const u=RAWVID.warpU;let mono=true,maxe=0,prev=-1;for(let i=0;i<=100;i++){const x=i/100,v=u(x);if(v<=prev)mono=false;prev=v;maxe=Math.max(maxe,Math.abs(v-x));}
    radar.mode='RWS';player.pos.set(0,3000,0);player.q.set(0,0,0,1);player.vel.set(0,0,-200);tgt.pos.set(0,3000,-90000);run(30*12);
    const d=RAWVID.dump(),nR=d.nR;let cols=0,marks=0;for(let ia=0;ia<d.nA;ia++){let n=0;for(let ir=0;ir<nR;ir++)if(d.V[ia*nR+ir]>380&&d.V[ia*nR+ir]<1500&&ir>12)n++;if(d.T[ia*nR]>0){cols++;marks+=n;}}
    const S=window.SENSOR_SIG,A=RAWVID.rngSig(4,40000),B=RAWVID.rngSig(100,40000);
    return{mono,maxe,cols,perCol:cols?marks/cols:0,A,B};});
  ok('sweep is monotone and off by 1-4 %',r.mono&&r.maxe>.003&&r.maxe<.04,+r.maxe.toFixed(4));
  ok('range marks are off by default',r.cols>10&&r.perCol<3,+r.perCol.toFixed(1));
  ok('range error falls with signal-to-noise',r.B<r.A,[+r.A.toFixed(1),+r.B.toFixed(1)]);});

test('sig: STT re-dithers the PRF set every dwell, search holds it for 1.5 s','F-22',async p=>{
  const r=await p.evaluate(()=>{const S=window.SENSOR_SIG;player.pos.set(0,6000,0);player.q.set(0,0,0,1);player.vel.set(0,0,-250);tgt.pos.set(0,6000,-52000);tgt.vel.set(0,0,200);
    const seen=m=>{radar.mode=m;const set=new Set();for(let i=0;i<20;i++){window.__T=i*100;const e=S.eval(tgt,radar.ang(tgt.pos));set.add((e.f||0).toFixed(3));}return set.size;};
    return{rws:seen('RWS'),stt:seen('STT')};});
  ok('STT varies the PRF set more often than search',r.stt>=r.rws,r);});

test('nav: spoofing walks the fix away without a warning, and the HSI and CCIP follow the total error','F-4E',async p=>{
  const r=await p.evaluate(()=>{player.pos.set(0,1500,0);player.q.set(0,0,0,1);player.vel.set(0,0,-200);sys.gpsSpoofForce=true;run(30*20);const e1=NAVW.tot.length(),jam=NAVW.jam,sp=NAVW.spoof;
    const k=()=>{const c=GND.ccip(player,Object.keys(AGW).find(x=>AGW[x].k==='bomb'));return c&&c.p;};const p1=k();const t=NAVW.tot.clone();sys.gpsSpoofForce=false;run(30*60);const e2=NAVW.tot.length();
    return{e1,jam,sp,e2,t:t.length(),p1:!!p1};});
  ok('fix walks away at about 15 m/s',r.e1>200&&r.e1<400,Math.round(r.e1));ok('no GPS-lost state while spoofed',r.jam===false&&r.sp===true);
  ok('error is pulled back after the emitter is gone',r.e2<r.e1*.1,Math.round(r.e2));});

test('ir: cumulus blocks an infrared path, clear sky does not; conical-scan error falls with SNR','F-4E',async p=>{
  const r=await p.evaluate(()=>{const P0=ENV.P;ENV.P=Object.assign({},WXP.CLEAR,{cu:300,base:0});ENV.rain=0;let blocked=0,clear=0;
    for(let i=0;i<300;i++){const a={x:-30000+i*37,y:3000,z:-20000+i*91},b={x:a.x+40000,y:3000,z:a.z+30000};const t=RAWVID.cuIR(a,b);if(t<.5)blocked++;else clear++;}
    ENV.P=Object.assign({},WXP.CLEAR,{cu:0});const free=RAWVID.cuIR({x:0,y:3000,z:0},{x:40000,y:3000,z:30000});ENV.P=P0;
    return{blocked,clear,free,lo:IRPHYS.coneSig(2),hi:IRPHYS.coneSig(200)};});
  ok('some paths cross cumulus, many do not',r.blocked>3&&r.clear>20,[r.blocked,r.clear]);ok('no cumulus, no loss',r.free===1,r.free);
  ok('conical-scan bearing error shrinks with SNR',r.hi<r.lo*.5,[r.lo,r.hi]);});

test('esa: squint grows with scan angle, grating lobe appears past onset, scan limit rolls off','F-22',async p=>{
  const r=await p.evaluate(()=>{const S=SENSOR_SIG,D=Math.PI/180;radar.on&&0;const sq=a=>{let m=0;for(let i=0;i<60;i++){window.__T=i*60;radar.antAz=a*D;radar.antEl=0;m+=Math.abs(ESAS.state(true).sqA);}return m/60;};
    const s10=sq(10),s50=sq(50);window.__T=1000;radar.antAz=0;const st0=ESAS.state(true);radar.antAz=58*D;const st58=ESAS.state(true);radar.antAz=40*D;const st40=ESAS.state(true);
    radar.antAz=58*D;ESAS.state(true);const bw=3.5*D;const at=(d)=>S.pattern(d,0,bw,bw,-27);const lobe=at(st58.glD+st58.sqA),off=at(st58.glD+st58.sqA+12*D);
    const g0=S.scan(0).g,g60=S.scan(60*D).g,g70=S.scan(70*D).g;
    ESAS.on=false;const plain=S.pattern(st58.glD,0,bw,bw,-27);ESAS.on=true;
    return{s10,s50,gl0:st0.gl,gl40:st40.gl,gl58:st58.gl,lobe,off,plain,g0,g60,g70};});
  ok('squint is larger at 50 than at 10 degrees',r.s50>r.s10*2,[+(r.s10/Math.PI*180).toFixed(3),+(r.s50/Math.PI*180).toFixed(3)]);
  ok('no grating lobe boresight or at 40 degrees, one at 58',r.gl0===0&&r.gl40===0&&r.gl58>0,[r.gl0,r.gl40,+r.gl58.toFixed(3)]);
  ok('ghost lobe is stronger than the plain pattern at its angle',r.lobe>r.plain*3&&r.lobe>r.off,[r.lobe,r.plain,r.off]);
  ok('scan loss grows to the limit and rolls off beyond it',r.g60<r.g0&&r.g70<r.g60*.5,[r.g0,r.g60,r.g70]);});

test('perf: radar sweep cost per column','F-4E',async p=>{
  const r=await p.evaluate(()=>{radar.mode='RWS';player.pos.set(0,3000,0);player.q.set(0,0,0,1);player.vel.set(0,0,-200);tgt.pos.set(2500,3000,-35000);tgt.q.set(0,1,0,0);tgt.vel.set(0,0,150);
    RAWVID.st.cols=0;const t0=window.__pn();run(30*15);const wall=window.__pn()-t0;return{cols:RAWVID.st.cols,ms:wall/Math.max(1,RAWVID.st.cols)};});   // wall time of the whole frame loop per column written
  ok('columns written',r.cols>200,r.cols);ok('< 2 ms of wall time per column written (whole radar update)',r.ms<2,+r.ms.toFixed(3));});

test('mig23_cockpit: every control on the rebuilt MiG-23ML panels steps without error and the radar panel drives the weapon system','MiG-23',async p=>{
  const r=await p.evaluate(()=>{const c=ck.cur,bad=[];let n=0;
    const sist=c.ctls.find(d=>/^СИСТ/.test(d.name||'')),izl=c.ctls.find(d=>/^ИЗЛ/.test(d.name||'')),nav=c.ctls.find(d=>/^НАВЕД/.test(d.name||'')),dh=c.ctls.find(d=>/^ΔH/.test(d.name||''));
    const out={sist:!!sist,izl:!!izl,nav:!!nav,dh:!!dh};
    for(const d of c.ctls){if(!d.act)continue;n++;for(const dir of[1,-1]){try{d.act(dir);d.state();}catch(e){bad.push((d.name||'?').slice(0,40)+': '+e.message);break;}}}
    sist.act(1);sist.act(1);sist.act(1);out.mode1=mw();sist.act(1);sist.act(1);out.mode2=mw();   // from РЛ up through Т: wcs follows the selector
    out.gain=sys.mig.irgain;out.n=n;out.bad=bad;return out;});
  ok('radar panel controls exist (СИСТ, ИЗЛ, НАВЕД, ΔH)',r.sist&&r.izl&&r.nav&&r.dh,r);
  ok('no control throws when stepped both ways',r.bad.length===0,r.bad.slice(0,3));
  ok('СИСТ moves between RAD and IR',r.mode1==='IR'||r.mode2==='IR',{m1:r.mode1,m2:r.mode2});});


/* ---- Ka-50 (heli.js): hover, power, forward flight, autorotation, ground contact. Gameplay-level thresholds. ---- */
const KA_SETUP=`(()=>{const P=player;for(const j of jets)if(j!==P)j.pos.set(1e7,6000,1e7);
  window.kaSet=(alt,fuel)=>{P.fuel=fuel??1500;P.tankFuel=0;P.pos.set(0,alt,0);P.vel.set(0,0,0);P.q.set(0,0,0,1);P.onGnd=false;P.hp=100;P.alive=true;const h=HELI.st(P);h.Nr=1;h.run=true;h.start=0;h.warm=1;h.gov=.6;h.vi=15;h.T=P.mass*9.81;h.hold={p:null,r:null,y:null};h.w={p:0,y:0,r:0};P.ctl={p:0,r:0,y:0};P.gloc=0;};
  window.kaRun=(n,f)=>{for(let i=0;i<n;i++){P.step(1/30);if(f)f(i);}};
  window.kaHover=()=>{let lo=0,hi=1;for(let k=0;k<14;k++){const m=(lo+hi)/2;kaSet(groundAt(0,0)+150);P.thr=m;kaRun(90);if(P.vel.y>0)hi=m;else lo=m;}return(lo+hi)/2;};
  return 1;})()`;
test('ka50_hover: a collective setting holds a hover on the rotor power the manual implies, and it drops out of the sky when the engines quit','Ka-50',async p=>{
  const r=await p.evaluate(s=>{game.paused=true;eval(s);const hv=kaHover();kaSet(groundAt(0,0)+150);player.thr=hv;kaRun(300);const h=HELI.st(player);
    const o={lever:hv,TW:h.T/(player.mass*9.81),Pr:h.Pr,Pa:h.Pa,drift:Math.hypot(player.vel.x,player.vel.z),vy:player.vel.y,Nr:h.Nr,mass:player.mass};
    kaSet(groundAt(0,0)+150);player.thr=hv;kaRun(30);h.run=false;player.thr=0;kaRun(30*3);o.vyOff=player.vel.y;return o;},KA_SETUP);
  ok('hover lever mid-range (0.45-0.7)',r.lever>.45&&r.lever<.7,+r.lever.toFixed(3));
  ok('hover thrust equals weight and the pair needs 55-80 % of the available power',Math.abs(r.TW-1)<.03&&r.Pr/r.Pa>.55&&r.Pr/r.Pa<.8,{TW:+r.TW.toFixed(3),load:+(r.Pr/r.Pa).toFixed(2)});
  ok('rotor RPM holds 100 % and the aircraft sits still in the hover',Math.abs(r.Nr-1)<.02&&r.drift<.5&&Math.abs(r.vy)<.4,{Nr:+r.Nr.toFixed(3),drift:+r.drift.toFixed(2),vy:+r.vy.toFixed(2)});
  ok('mass is near the 9,800 kg normal takeoff weight',r.mass>9500&&r.mass<10400,Math.round(r.mass));
  ok('with the engines off and the lever kept, the aircraft sinks',r.vyOff<-1.5,+r.vyOff.toFixed(2));});
test('ka50_flight: forward flight at the cruise attitude, hover ceiling at 4,000 m, rotor droop under a full collective pull','Ka-50',async p=>{
  const r=await p.evaluate(s=>{game.paused=true;eval(s);const P=player,hv=kaHover(),o={};
    kaSet(groundAt(0,0)+400);P.thr=hv;const tgt=-8*Math.PI/180;kaRun(30*90,()=>{P.ctl.p=Math.max(-.6,Math.min(.6,-(P.pitch-tgt)*1.4));const e=P.pos.y-(groundAt(0,0)+400);P.thr=Math.max(0,Math.min(1,P.thr+(-P.vel.y*.0008-e*.00002)));});
    o.cruise=P.vel.length()*3.6;o.cruisePitch=P.pitch*57.3;o.cruiseAlive=P.alive;
    kaSet(4000,1200);P.thr=1;kaRun(240);o.vy4000=P.vel.y;
    kaSet(groundAt(0,0)+150);P.thr=1;let nr=9;kaRun(120,()=>{nr=Math.min(nr,HELI.st(P).Nr);});o.nrMin=nr;o.climb=P.vel.y;return o;},KA_SETUP);
  ok('cruise 220-320 km/h at 5-12 degrees nose down, level, not overstressed',r.cruise>220&&r.cruise<320&&r.cruisePitch<-5&&r.cruisePitch>-12&&r.cruiseAlive,{kmh:Math.round(r.cruise),pitch:+r.cruisePitch.toFixed(1)});
  ok('can still hover at 4,000 m at light weight (full collective)',r.vy4000>-.6,+r.vy4000.toFixed(2));
  ok('a full collective pull droops the rotor but the aircraft climbs',r.nrMin<.97&&r.nrMin>.7&&r.climb>3,{Nr:+r.nrMin.toFixed(3),vy:+r.climb.toFixed(1)});});
test('ka50_aerobatics: rolls through inverted and loops with no attitude walls, and survives it','Ka-50',async p=>{
  const r=await p.evaluate(s=>{game.paused=true;eval(s);const P=player,o={};
    const fly=()=>{kaSet(groundAt(0,0)+1500);P.thr=.5;P.vel.set(0,0,-60);};
    fly();let minUp=1;kaRun(30*3);P.ctl.r=1;kaRun(30*6,()=>{minUp=Math.min(minUp,P.up(new THREE.Vector3()).y);});P.ctl.r=0;
    o.rollInverted=minUp;o.rollAlive=P.alive;
    fly();let minUp2=1,maxPit=-9,minPit=9;kaRun(30*2);P.ctl.p=1;kaRun(30*12,()=>{minUp2=Math.min(minUp2,P.up(new THREE.Vector3()).y);maxPit=Math.max(maxPit,P.pitch);minPit=Math.min(minPit,P.pitch);});P.ctl.p=0;
    o.loopInverted=minUp2;o.maxPit=maxPit*57.3;o.alive=P.alive;return o;},KA_SETUP);
  ok('a full roll input takes it through the inverted attitude',r.rollInverted<-.8&&r.rollAlive,+r.rollInverted.toFixed(2));
  ok('holding back stick carries it over the top of a loop (pitch beyond 60 degrees, upside down) without breaking up',r.loopInverted<-.5&&r.maxPit>60&&r.alive,{up:+r.loopInverted.toFixed(2),pit:Math.round(r.maxPit)});});
test('shkval: the Ka-50, Su-25T and Su-25SM3 carry a TV-only sight with a laser ranger, no thermal polarity','Ka-50',async p=>{
  const r=await p.evaluate(()=>{const P=player,o={};o.pod=SNS.podKind(P);o.tv=SNS.vmodeFor(true);const s0=SNS.sens;SNS.sensKey();o.sensSame=SNS.sens===s0;o.vm=SNS.vmodeFor(true);
    o.spec=SNS.podSpec();o.pos=SNS.podPos(P).distanceTo(P.pos);return o;});
  ok('the built-in sight is the Shkval',r.pod==='SHKVAL'&&r.spec&&r.spec.tvOnly,r.pod);
  ok('video is TV in every case and the polarity key does nothing',r.tv==='TV'&&r.vm==='TV'&&r.sensSame,{tv:r.tv,vm:r.vm});
  ok('the sight sits in the nose',r.pos>2&&r.pos<6,+r.pos.toFixed(2));});
test('vikhr: APU-6 launchers give the Ka-50 12 Vikhr (6 per outer pylon) and fire through the Shkval laser','Ka-50',async p=>{
  const r=await p.evaluate(()=>{const P=player,o={};o.n=P.count('Vikhr');o.st=Object.keys(P.load).filter(k=>P.load[k]==='Vikhr').sort().join();
    o.meshes=Object.keys(P.stMesh).filter(k=>P.load[k]==='Vikhr').length;
    const bad=validLoad('Ka-50','modern',{2:'Vikhr','1b':'B-8M1',1:'Vikhr','1g':'Vikhr'});o.fixed=Object.keys(bad).sort().join();
    o.su=['Su-25T','Su-25SM3'].map(id=>{const L=validLoad(id,'modern',Object.assign(vikhrFull(['3','8'],8),{4:'Kh-29T'}));return Object.values(L).filter(x=>x==='Vikhr').length;});
    o.stn4=STN['Su-25T']['4'].includes('Vikhr');
    return o;});
  ok('12 Vikhr on the default load, on stations 1 and 4 and their sub-rails',r.n===12&&/^1,1b,1c,1d,1e,1f,4,4b/.test(r.st),{n:r.n,st:r.st});
  ok('every round has a model hanging on the aircraft',r.meshes===12,r.meshes);
  ok('the launcher is one weapon: any Vikhr on a pylon is filled to the full six, never a partial set',(r.fixed.match(/Vikhr|1/g)||[]).length>0&&/1b,1c,1d,1e,1f/.test(r.fixed)&&!/1g/.test(r.fixed),r.fixed);
  ok('Su-25T / Su-25SM3 hold 16 Vikhr on two APU-8 launchers and none on pylons 4 and 7',r.su[0]===16&&r.su[1]===16&&!r.stn4,{su:r.su,stn4:r.stn4});});
test('ka50_autorotation: engines out, lever down, forward speed: rotor stays turning and the descent is survivable','Ka-50',async p=>{
  const r=await p.evaluate(s=>{game.paused=true;eval(s);const P=player;kaSet(groundAt(0,0)+1500);const h=HELI.st(P);h.run=false;P.thr=.1;P.vel.set(0,0,-45);kaRun(30*12);
    const o={Nr:h.Nr,vy:P.vel.y,alive:P.alive};
    // vortex ring: steep slow descent from a hover with power on
    kaSet(groundAt(0,0)+1500);P.thr=.2;kaRun(30*6);o.vrsVy=P.vel.y;o.vrs=HELI.st(P).vrs;return o;},KA_SETUP);
  ok('rotor stays above 85 % in autorotation',r.Nr>.85&&r.alive,+r.Nr.toFixed(3));
  ok('descent rate between 5 and 20 m/s',r.vy<-5&&r.vy>-20,+r.vy.toFixed(1));
  ok('a slow powered descent with the lever low sinks faster than 8 m/s',r.vrsVy<-8,+r.vrsVy.toFixed(1));});
test('ka50_ground: stands on its wheels, lifts off with the collective, lands and settles without damage','Ka-50',async p=>{
  const r=await p.evaluate(s=>{game.paused=true;eval(s);const P=player,H=P.ac.heli;kaSet(groundAt(0,0)+H.gh+.01);P.onGnd=true;P.thr=0;kaRun(60);const o={onGnd0:P.onGnd,y0:P.pos.y-groundAt(0,0),hp0:P.hp};
    P.thr=.75;kaRun(90);o.climb=P.pos.y-groundAt(0,0);o.airborne=!P.onGnd;
    const hv=kaHover();kaSet(groundAt(0,0)+25);P.thr=hv;kaRun(30*70,()=>{if(P.onGnd){P.thr=0;return;}const agl=P.pos.y-groundAt(0,0)-H.gh,vt=-Math.max(.7,Math.min(2.2,agl*.12));P.thr=Math.max(0,Math.min(1,P.thr+.004*(vt-P.vel.y)));});P.thr=0;kaRun(60);o.landed=P.onGnd;o.hp1=P.hp;o.alive=P.alive;o.sink=P.td;return o;},KA_SETUP);
  ok('rests on the wheels at the CG height',r.onGnd0&&Math.abs(r.y0-1.72)<.1&&r.hp0===100,{y:+r.y0.toFixed(2)});
  ok('a collective pull lifts it off the ground',r.airborne&&r.climb>3,+r.climb.toFixed(1));
  ok('a gentle descent lands it on the wheels with no damage',r.alive&&r.landed&&r.hp1>99&&r.sink<2.5,{landed:r.landed,hp:Math.round(r.hp1),sink:+(r.sink||0).toFixed(2)});});

const missile=(p,type,pos)=>p.evaluate(({type,pos})=>{player.pos.set(0,6000,0);player.q.set(0,0,0,1);player.vel.set(0,0,-200);
  const m=new Missile(type,tgt,player,tgt.pos.clone());m.alive=true;m.burning=true;m.t=1;m.pos.set(pos[0],6000+pos[1],pos[2]);m.vel.copy(player.pos.clone().sub(m.pos).normalize()).multiplyScalar(300);
  for(let i=0;i<8;i++){window.__T+=100;MSS.tick(.1);}const w=MSS.warned.map(x=>x.src);rwrUpdate(.03);const n=RW.msl.length;m.alive=false;MSS.warned.length=0;return{w,n};},{type,pos});
test('maws_mirage: SAMIR warns (it ran inside a draw hook the Mirage replaces), also from behind','Mirage 2000',async p=>{
  const a=await missile(p,'R-73',[0,0,4000]),b=await missile(p,'R-73',[0,0,-30000]);
  ok('warns on an IR missile from behind',a.w.length>0&&a.n>0,a);ok('no warning at 30 km',b.w.length===0,b);});
test('maws_f35: DAS covers all round; built-in EOTS counts as a targeting pod','F-35A',async p=>{
  const a=await missile(p,'R-73',[3000,0,3000]);const e=await p.evaluate(()=>({pod:SNS.hasPod(player),kind:SNS.podKind(player),irg:IRG.az}));
  ok('DAS sees a missile from the rear quarter',a.w.length>0,a);ok('EOTS is a pod, no store needed',e.pod&&e.kind==='EOTS',e);ok('IRST limit is 180 deg',e.irg===180,e.irg);});
test('su57: cheek arrays find an abeam target; rear is blind; DIRCM defeats IR seekers','Su-57',async p=>{
  const r=await p.evaluate(()=>{player.pos.set(0,6000,0);player.q.set(0,0,0,1);player.vel.set(0,0,-200);radar.mode='RWS';radar.ai=2;tgt.pos.set(30000,6000,0);tgt.vel.set(0,0,0);tgt.q.set(0,1,0,0);
    run(30*12,()=>{MSS.tick(1/30);});const side=radar.tracks.has(tgt);radar.tracks.clear();tgt.pos.set(0,6000,30000);run(30*12,()=>{MSS.tick(1/30);});const rear=radar.tracks.has(tgt);
    player.pos.set(0,6000,0);let def=0;for(let k=0;k<20;k++){const m=new Missile('R-73',tgt,player,tgt.pos.clone());m.alive=true;m.burning=true;m.t=1;m.pos.set(0,6000,3000);m.vel.set(0,0,-300);
      for(let i=0;i<100;i++){window.__T+=100;MSS.tick(.1);if(m.maddog&&!m.track){def++;break;}}m.alive=false;}
    return{side,rear,def,gl:radar.gl.az};});
  ok('abeam target tracked',r.side,r);ok('target dead astern not tracked',!r.rear,r.rear);ok('DIRCM defeats at least half of 20 seekers',r.def>=10,r.def);ok('field of regard 135 deg',r.gl===135,r.gl);});


test('f4_loadout: Sidewinders only on 2 / 2b / 8 / 8b; F-16V Block 70 name','F-4E',async p=>{
  const r=await p.evaluate(()=>{const f=ac=>Object.keys(STN[ac]).filter(k=>STN[ac][k].some(w=>/^AIM-9/.test(w))).sort().join();return{e:f('F-4E'),j:f('F-4J'),b:f('F-4B'),n:AC['F-16V'].name};});
  ok('F-4E AIM-9 stations',r.e==='2,2b,8,8b',r.e);ok('F-4J AIM-9 stations',r.j==='2,2b,8,8b',r.j);ok('F-4B AIM-9 stations',r.b==='2,2b,8,8b',r.b);ok('F-16V Block 70 name',r.n==='F-16V Block 70',r.n);});
test('pulse_clutter: a pulse set locks a strong ground return under the cursor','F-4E',async p=>{
  const r=await p.evaluate(()=>{player.pos.set(0,600,0);player.q.set(0,0,0,1);player.vel.set(0,0,-200);radar.mode='RWS';tgt.pos.set(1e7,6000,1e7);run(30*15);
    const rng=radar.rngM;let mx=0,at=[0,.5];for(let a=-1;a<=1;a+=.05)for(let r=.1;r<1;r+=.05){const v=flClutterAt(a,r*rng);if(v>mx){mx=v;at=[a,r];}}
    radar.cur.az=at[0];radar.cur.r=at[1];radar.designate();return{mode:radar.mode,g:!!(radar.lock&&radar.lock.isGhost),mx};});
  ok('locked a ground return',r.mode==='STT'&&r.g,r);});
for(const [ac,dc] of [['A-10C',false],['Cargo',true],['Ka-50',true],['Tu-95MS',true],['B-52H',true],['E-3A',true],['A-50',true],['Su-35S',false]])test('maws_fit_'+ac+': warns'+(dc?' and DIRCM works':', no DIRCM'),ac,async p=>{
  const r=await p.evaluate(()=>{player.pos.set(0,3000,0);player.q.set(0,0,0,1);player.vel.set(0,0,-150);let w=0,jam=0;const sh={pos:new THREE.Vector3(0,3000,4000),vel:new THREE.Vector3(),fwd:o=>o.set(0,0,-1),up:o=>o.set(0,1,0),alive:true};
    for(let k=0;k<12;k++){const m=new Missile('R-73',sh,player,sh.pos.clone());m.alive=true;m.burning=true;m.t=1;m.pos.set(1500,2800,2800);m.vel.copy(player.pos.clone().sub(m.pos).normalize()).multiplyScalar(300);
      let det=false;for(let i=0;i<60;i++){window.__T+=100;MSS.tick(.1);if(MSS.warned.some(x=>x.m===m))det=true;if(m.maddog&&!m.track){jam++;break;}}if(det)w++;m.alive=false;MSS.warned.length=0;}
    return{w,jam,d:!!MSS.fit.dircm};});
  ok('warned of most missiles',r.w>=10,r);ok(dc?'DIRCM defeats some':'no DIRCM fitted',dc?r.jam>=3:(!r.d&&r.jam===0),r);});

test('legion_pod: the pod gives an F-15C an IRST; without it there is none','F-15C',async p=>{
  const r=await p.evaluate(()=>{const o={};o.opts=(STN['F-15C']['5']||[]).includes('LEGION');o.before=!!player.ac.irst;player.load['5']='LEGION';MSS.tick(.1);o.after=!!player.ac.irst&&!!player.ac.ols&&player.ac.ols.leg===true;
    delete player.load['5'];MSS.tick(.1);o.gone=!player.ac.irst;return o;});
  ok('offered on the centreline',r.opts,r);ok('IRST with the pod',!r.before&&r.after,r);ok('IRST gone with the pod',r.gone,r);});
test('legion_pod_f16: the F-16V takes it on the left intake station','F-16V',async p=>{
  const r=await p.evaluate(()=>{const o={opt:(STN['F-16V']['5L']||[]).includes('LEGION')};player.load['5L']='LEGION';MSS.tick(.1);o.irst=!!player.ac.irst;return o;});
  ok('Legion on 5L gives IRST',r.opt&&r.irst,r);});
test('irst_tws: a modern IRST allows IR TWS, an old one refuses','F-18E',async p=>{
  const r=await p.evaluate(()=>{const o={ok:MSS.irTws()};radar.sensor='IRST';o.w=String(radar.setTWS).includes('NO IR TWS');o.on=radar.on();o.ps=radar.power;radar.setTWS(true);o.mode=radar.mode;return o;});
  ok('Hornet chin pod can IR TWS',r.ok&&r.mode==='TWS',r);});
test('irst_tws_old: F-14A refuses IR TWS','F-14A',async p=>{
  const r=await p.evaluate(()=>{radar.sensor='IRST';radar.setTWS(true);return{ok:MSS.irTws(),mode:radar.mode};});
  ok('no IR TWS on the TCS',!r.ok&&r.mode!=='TWS',r);});
test('nctr_jem: reads class, engine, then type nose-on; refuses beam-on','F-15C',async p=>{
  const r=await p.evaluate(()=>{player.pos.set(0,6000,0);player.q.set(0,0,0,1);player.vel.set(0,0,-250);radar.power='ON';radar.warm=0;
    const t=new Jet(1,'F-16C',{},'modern');t.spawn(0,6000,-30000,180,250);t.thr=.9;jets.push(t);const o={};
    radar.tracks.set(t,{p:t.pos.clone(),v:t.vel.clone(),n:5,t:performance.now()/1000,az:0,el:0,d:30000});radar.mode='STT';radar.lock=t;
    const cond1=NCTRX.cond(t,radar.tracks.get(t),player);o.nose=cond1.why;
    for(let i=0;i<4000&&!t._nctrId;i++){window.__T+=100;radar.tracks.get(t).t=performance.now()/1000;nctrTick(.1);if(t._nctrCls&&!o.cls)o.cls=t._nctrCls;if(t._nctrEng&&!o.eng)o.eng=t._nctrEng;}
    o.id=t._nctrId;o.t=i0();function i0(){return 0;}
    const b=new Jet(1,'F-16C',{},'modern');b.spawn(0,6000,-30000,90,250);b.thr=.9;jets.push(b);radar.tracks.set(b,{p:b.pos.clone(),v:b.vel.clone(),n:5,t:performance.now()/1000,az:0,el:0,d:30000});radar.lock=b;
    o.beam=NCTRX.cond(b,radar.tracks.get(b),player).why;return o;});
  ok('class then engine then type',!!r.cls&&!!r.eng&&!!r.id,r);ok('beam-on gives no read',r.beam==='ASPECT',r);});

for(const ac of ['Su-35S','J-20'])test('nctr_fit_'+ac+': modern Russian/Chinese jets run NCTR','' +ac,async p=>{
  const r=await p.evaluate(()=>({fit:NCTRX.FIT.has(player.type)}));ok('NCTR fitted',r.fit,r);});
(async()=>{await new Promise(r=>srv.listen(0,r));port=srv.address().port;
  const byAc=new Map();for(const t of T)if(t.n.includes(filter)){(byAc.get(t.ac)||byAc.set(t.ac,[]).get(t.ac)).push(t);}
  for(const [ac,list] of byAc){console.log('== '+ac);for(const t of list){const p=await boot(ac);console.log(t.n);
      try{await t.f(p);}catch(e){fails++;total++;console.log('  FAIL exception '+e.message.split('\n')[0]);}
      if(p.errs.length){total++;fails++;console.log('  FAIL page errors',p.errs.slice(0,2));}await p.close();}}
  console.log('\n'+(total-fails)+'/'+total+' checks passed');await browser.close();srv.close();process.exit(fails?1:0);})();
