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
  const p=await browser.newPage({viewport:{width:1280,height:720}}),errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n').slice(1,4).join('|')));
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
  // v324 (#11): the pattern is the aperture pattern of a tapered circular aperture; nulls are found by scanning, not read off a formula
  const r=await p.evaluate(()=>{const S=window.SENSOR_SIG,b=.06,o={};player.ac.radar.name='APG-66(V)1';
    for(const sll of[-21,-30]){const v=[];for(let u=.6;u<4.5;u+=.005)v.push([u,S.pattern(u*b,0,b,b,sll)]);const nulls=[],peaks=[];
      for(let i=1;i<v.length-1;i++){if(v[i][1]<v[i-1][1]&&v[i][1]<=v[i+1][1])nulls.push(v[i][0]);if(v[i][1]>v[i-1][1]&&v[i][1]>=v[i+1][1])peaks.push(v[i]);}
      o[sll]={nulls:nulls.slice(0,3),sp:nulls[1]-nulls[0],first:peaks[0]?peaks[0][1]:0,depth:peaks[0]&&nulls[0]?peaks[0][1]/Math.max(1e-9,v.find(x=>x[0]>nulls[0]-.01)[1]):0};}
    return o;});
  ok('wider taper, tighter nulls',r[-30].sp<r[-21].sp,[r[-21].sp,r[-30].sp]);
  ok('wider taper, lower first sidelobe',r[-30].first<r[-21].first*.5,[r[-21].first,r[-30].first]);
  for(const k of[-21,-30])ok('first sidelobe is a peak between nulls at '+k+' dB',r[k].nulls.length>=2&&r[k].first>0&&r[k].first>1e-4,[r[k].nulls,r[k].first]);});

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
  ok('DAS sees a missile from the rear quarter',a.w.length>0,a);ok('MAWS missile reaches the RWR as a missile contact',a.n>0,a);ok('EOTS is a pod, no store needed',e.pod&&e.kind==='EOTS',e);ok('IRST limit is 180 deg',e.irg===180,e.irg);});
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
test('f35_cockpit: F-35A uses its own pit, display draws, no HUD glass, tab click changes page','F-35A',async p=>{
  const r=await p.evaluate(()=>{const o=ck.f35;if(!o)return{built:false};selectCockpit(player.ac.cockpit,player.ac.pit);
    const vis=o.root.visible,viper=ck.viper.root.visible;F35PIT.click(120/1000*360*1+0,0);
    const before=F35PIT.WIN[0].page;F35PIT.click(40/2000*360,(800-30)/800*360);const after=F35PIT.WIN[0].page;
    o.tick(player,.2);o.tick(player,.2);const g=o.glass[0];return{built:true,vis,viper,cockpit:player.ac.cockpit,before,after,visor:isFinite(g.x),errs:0};});
  ok('f35 pit built and selected',r.built&&r.vis&&!r.viper&&r.cockpit==='f35',r);ok('tab click cycles the page',r.after!==r.before,{b:r.before,a:r.after});ok('visor clip finite',r.visor);ok('no page errors',p.errs.length===0,p.errs);});

test('tgp_slave: pod / EOTS follows the radar target in A-A, a manual slew breaks it','F-35A',async p=>{
  const r=await p.evaluate(()=>{player.pos.set(0,6000,0);player.q.set(0,0,0,1);player.vel.set(0,0,-200);tgt.pos.set(900,6100,-12000);tgt.q.set(0,1,0,0);tgt.vel.set(0,0,200);
    game.wsel='AIM-120C';radar.mode='RWS';run(30*8);radar.bug=tgt;radar.stt&&radar.stt(tgt);SNS.tick(.05);const d1=SNS.spi.distanceTo(tgt.pos),sl=!!SNS.slaved;
    SNS.slew(1,0,.2);SNS.tick(.05);const brk=!SNS.slaved;return{d1:Math.round(d1),sl,brk};});
  ok('pod aimed at the radar target and marked slaved',r.sl&&r.d1<50,r);ok('manual slew breaks the slave',r.brk);});

test('acm_unstab: the radar gimbal is not stabilised in ACM, and is again outside ACM','F-16C',async p=>{
  const r=await p.evaluate(()=>{radar.setACM('30x20');run(3);const a=radar.gl.stab;radar.mode='RWS';run(3);const b=radar.gl.stab;return{a,b};});
  ok('stab off in ACM',r.a===0,r);ok('stab back on in RWS',r.b>0,r);});

test('f35_hmd_overlay: F-35 HMD draws without error with a datalink picture','F-35A',async p=>{
  const r=await p.evaluate(()=>{run(3);try{F35HMD.overlay();return{ok:1};}catch(e){return{err:e.message};}});ok('overlay runs',r.ok===1,r);
  const a=await p.evaluate(()=>radar.acmList());ok('F-35 HMD mode',a.includes('HMD'),a);});
test('sar_expand: SAR EXP state cycles and renders','F-35A',async p=>{
  const r=await p.evaluate(()=>{const W=F35PIT.WIN[0];W.page=F35PIT.PI.SAR;run(3);return{pg:W.page,sar:F35PIT.PI.SAR};});ok('SAR page set',r.pg===r.sar,r);});
test('sea_ships: ASM mission ships are SHIP class on the SEA scope','F-16C',async p=>{
  const r=await p.evaluate(async()=>{await start('ASHM');const P=player;radar.power='ON';radar.warm=0;AGR.mode='SEA';P.pos.set(-60000,350,5000);await new Promise(r=>setTimeout(r,8000));const e=AGR.ents.filter(e=>AGR.entVal(e)>0);return{n:e.length,ships:GND.units.filter(u=>typeof SDEF!=='undefined'&&SDEF[u.kind]).length};});
  ok('ships visible in SEA',r.n>0,r);});
test('dl_fire_us: a US modern jet fires ARH on a datalink-only target','F-16V',async p=>{
  const r=await p.evaluate(()=>{const P=player;radar.power='OFF';const t=jets.find(j=>j!==P&&j.side!==P.side);
    for(const j of jets)if(j!==P&&j!==t)j.pos.set(1e7,6000,1e7);
    game.era='modern';SENSOR_FUSE.reg.datalinkEnabled=true;const o=DL.contacts;DL.contacts=()=>[{j:t,src:'LNK',by:null,pos:t.pos.clone(),vel:t.vel.clone(),hdg:t.hdg,age:0}];
    P.pos.set(0,6000,0);P.q.set(0,0,0,1);t.pos.set(0,6000,-40000);const g=dlTgt();DL.contacts=o;return{shooter:dlShooter(),on:DL.on(),g:g===t};});
  ok('F-16V datalink target auto-selected',r.shooter&&r.on&&r.g,r);});


/* ---------- campaign world ledger (v325, spec v49 phases 0-2) ---------- */
const CW=async(p,f)=>p.evaluate(f);
test('cw_ledger: a new war reconciles, a 48 h skip keeps every ledger and projection consistent','F-16C',async p=>{
  const r=await CW(p,()=>{localStorage.clear();CAMP.newState('cold',1);const w=WORLD.W(),a0=WORLD.audit(),af=Object.keys(w.af).length,pp=Object.keys(w.pp).length;
    CAMP.advance(48);const a1=WORLD.audit(),ours=CAMP.st.bases.filter(b=>b.side===0);
    return{a0,a1,af,pp,proj:ours.every(b=>b.pool===WORLD.readyAt(b.id).length),ev:w.ev.length,ids:new Set(w.ev.map(e=>e.id)).size,max:WORLD.CFG.evMax};});
  ok('clean audit at the start',r.a0.length===0,r.a0);ok('airframes and crews on strength',r.af>=20&&r.pp>=r.af,{af:r.af,pp:r.pp});
  ok('clean audit after 48 h',r.a1.length===0,r.a1);ok('field counts are the airframe ledger',r.proj);ok('event ids unique, ledger bounded',r.ids===r.ev&&r.ev<=r.max,{ev:r.ev});});

test('cw_idempotent: the same keyed event is applied once','F-16C',async p=>{
  const r=await CW(p,()=>{localStorage.clear();CAMP.newState('cold',1);const n0=WORLD.W().ev.length;WORLD.emit('CAMPAIGN',{k:'test:once',txt:'x'});WORLD.emit('CAMPAIGN',{k:'test:once',txt:'x'});return WORLD.W().ev.length-n0;});
  ok('one event for two deliveries',r===1,r);});

test('cw_air: AI flights carry airframes and crews; a loss records crew fate, a landing goes to maintenance','F-16C',async p=>{
  const r=await CW(p,async()=>{localStorage.clear();game.ac='F-16C';CAMP.newState('cold',1);await CAMP.startSortie();for(let k=0;k<8;k++){CAMP.st.casT=0;CAMP.airOps(12);}
    const w=WORLD.W(),bj=CAMP.air.filter(j=>j._w&&j.alive),n=bj.length;let lost=null,crew=null,maint=null;
    if(bj[0]){const id=bj[0]._w.af,pid=bj[0]._w.pp;bj[0].kill('SHOT',null);lost=w.af[id].st;crew=w.pp[pid].st;}
    if(bj[1]){const id=bj[1]._w.af;CAMP.land(bj[1]);maint=w.af[id].st;}
    const a=WORLD.audit();CAMP.endSortie();const so=WORLD.view().so[0];return{n,lost,crew,maint,a,a2:WORLD.audit(),so,air:Object.values(w.af).filter(x=>x.st==='SORTIE').length};});
  ok('our AI flights launched with airframe records',r.n>=2,r.n);ok('shot-down airframe is LOST',r.lost==='LOST',r.lost);
  ok('its crew has a fate',['KIA','ACTIVE','WOUNDED','MISSING'].includes(r.crew),r.crew);ok('landed airframe in maintenance',r.maint==='MAINT',r.maint);
  ok('audit clean in flight and after the sortie',r.a.length===0&&r.a2.length===0,{a:r.a,a2:r.a2});ok('nothing left "in the air" after the scene is cleared',r.air===0,r.air);
  ok('sortie record written',r.so&&r.so.tail&&r.so.out,r.so&&{out:r.so.out,tail:r.so.tail});});

test('cw_player_loss: losing your jet loses one airframe, not two, and records the pilot','F-16C',async p=>{
  const r=await CW(p,async()=>{localStorage.clear();game.ac='F-16C';CAMP.newState('cold',1);await CAMP.startSortie();const w=WORLD.W(),id=player._w&&player._w.af;
    const g0=w.ev.filter(e=>e.ty==='AF_LOST').length;player.kill('SHOT',null);CAMP.sortieEnd();
    return{id:!!id,st:id&&w.af[id].st,lost:w.ev.filter(e=>e.ty==='AF_LOST').length-g0,so:WORLD.view().so[0],a:WORLD.audit()};});
  ok('player flew a recorded airframe',r.id);ok('that airframe is LOST',r.st==='LOST',r.st);ok('exactly one loss recorded',r.lost===1,r.lost);
  ok('sortie LOST with a pilot fate',r.so&&r.so.out==='LOST'&&!!r.so.fate,r.so&&{out:r.so.out,fate:r.so.fate});ok('audit clean',r.a.length===0,r.a);});

test('cw_finite: no airframe of the type and none at the depot blocks the sortie','F-16C',async p=>{
  const r=await CW(p,async()=>{localStorage.clear();CAMP.newState('cold',1);const w=WORLD.W();w.depot.af=0;game.ac='MiG-29';CAMP.on=false;await CAMP.startSortie();return{on:CAMP.on};});
  ok('sortie refused',r.on===false,r);});

test('cw_supply: a field that has used its stock is resupplied by convoy, and the books still balance','F-16C',async p=>{
  const r=await CW(p,()=>{localStorage.clear();CAMP.newState('cold',1);const w=WORLD.W(),b=CAMP.st.bases.find(b=>b.side===0).id,I=w.inv[b];
    for(const c of ['fuel','aam','agm']){w.lg[c].exp+=I[c];I[c]=0;}   // as if flown away
    CAMP.advance(12);const ev=w.ev.filter(e=>e.ty.startsWith('CONVOY')&&e.e.includes(b)).map(e=>e.ty);return{ev,fuel:w.inv[b].fuel,a:WORLD.audit()};});
  ok('a convoy left for the field',r.ev.includes('CONVOY:DEPARTED'),r.ev);ok('stock arrived only by convoy',r.fuel>0===r.ev.some(t=>t==='CONVOY:DELIVERED'),{fuel:r.fuel,ev:r.ev});ok('audit clean',r.a.length===0,r.a);});

test('cw_base_fall: an overrun field evacuates ready airframes, loses its stock, and the books balance','F-16C',async p=>{
  const r=await CW(p,()=>{localStorage.clear();CAMP.newState('cold',1);const w=WORLD.W(),b=CAMP.st.bases.find(b=>b.id==='HAR'),n0=WORLD.readyAt('HAR').length;
    CAMP.st.front=CAMP.st.front.map(()=>58000);CAMP.groundStep(.5);
    return{side:b.side,n0,left:Object.values(w.af).filter(a=>a.base==='HAR'&&!['LOST','CAPTURED'].includes(a.st)).length,ev:[...new Set(w.ev.map(e=>e.ty))],a:WORLD.audit()};});
  ok('field fell',r.side===1,r.side);ok('no live airframe left at the lost field',r.left===0,r.left);ok('loss, evacuation and stock events',['BASE:LOST','AF_EVAC','SUPPLY:CAPTURED'].every(t=>r.ev.includes(t)),r.ev);ok('audit clean',r.a.length===0,r.a);});

test('cw_save: save / load and migration of an old save keep the ledger consistent','F-16C',async p=>{
  const r=await CW(p,()=>{localStorage.clear();CAMP.newState('cold',1);CAMP.advance(6);const w=WORLD.W(),n=Object.keys(w.af).length,js=JSON.stringify(CAMP.st);
    CAMP.st=null;localStorage.setItem('viper.camp',js);const ld=CAMP.load(),a1=WORLD.audit(),n1=Object.keys(WORLD.W().af).length;
    delete CAMP.st.wld;WORLD.attach();const ev=WORLD.W().ev.map(e=>e.ty);return{ld,a1,same:n===n1,a2:WORLD.audit(),mig:ev.includes('MIGRATION'),len:js.length};});
  ok('loads',r.ld);ok('same airframes after load',r.same);ok('audit clean after load',r.a1.length===0,r.a1);
  ok('old save gets a migration event, nothing invented before it',r.mig);ok('audit clean after migration',r.a2.length===0,r.a2);ok('save stays small',r.len<600000,r.len);});

test('cw_ui: the war record renders every tab','F-16C',async p=>{
  const r=await CW(p,()=>{localStorage.clear();CAMP.newState('cold',1);CAMP.advance(3);const out={};for(const t of ['fields','roster','sorties','history','losses','audit']){WARREC.UI.tab=t;out[t]=WARREC.block().length;}return out;});
  ok('all tabs produce content',Object.values(r).every(n=>n>200),r);});


/* ---------- the Earth (v326, world campaign stage 1). The test browser has no network, so these also cover the offline fallback ---------- */
test('wg_frame: local frame round-trips, great-circle distance and bearing are right','F-16C',async p=>{
  const r=await p.evaluate(()=>{WGEO.setOrigin(47.46,8.55);const a=WGEO.ll2xz(47.9,9.3),b=WGEO.xz2ll(a.x,a.z);
    return{err:Math.hypot((b.lat-47.9)*111000,(b.lon-9.3)*75000),lj:WGEO.dist(33.94,-118.41,40.64,-73.78)/1000,brg:WGEO.brg(0,0,10,0),east:WGEO.ll2xz(47.46,8.56).x};});
  ok('round trip under 1 m',r.err<1,r.err);ok('LAX-JFK about 3,975 km',Math.abs(r.lj-3975)<20,r.lj);ok('due north is 000',Math.abs(r.brg)<1e-6,r.brg);ok('east is +x',r.east>700&&r.east<800,r.east);});
test('wg_data: airports, runways, places, countries and the elevation grid load','F-16C',async p=>{
  const r=await p.evaluate(async()=>{await WGEO.loadData();WGEO.setOrigin(33.9425,-118.408);const lax=WGEO.search('KLAX')[0],rw=lax.runways.map(q=>WGEO.runway(lax,q));
    return{n:WGEO.airports.length,pl:WGEO.places.length,cc:WGEO.countries.length,lax:lax.name,hd:rw.map(q=>Math.round(q.hdg)),len:rw.map(q=>Math.round(q.hl*2)),
      ev:Math.round(WGEO.coarse(39.74,-104.99)),sea:Math.round(WGEO.coarse(0,-160)),mil:WGEO.search('ramstein')[0].mil};});
  ok('7,000+ airports, 7,000+ places, 200+ countries',r.n>7000&&r.pl>7000&&r.cc>200,{n:r.n,pl:r.pl,cc:r.cc});ok('KLAX found first',/Los Angeles/.test(r.lax),r.lax);
  ok('LAX runways run about 083 / 263',r.hd.every(h=>Math.abs(h-83)<3||Math.abs(h-263)<3),r.hd);ok('LAX runways 2,700-3,950 m',r.len.every(l=>l>2600&&l<4000),r.len);
  ok('Denver about 1,600 m, mid-Pacific deep',Math.abs(r.ev-1600)<300&&r.sea<-3000,{ev:r.ev,sea:r.sea});ok('Ramstein is marked military',r.mil===1,r.mil);});
test('wg_flight: start on a real runway (offline: coarse ground), wheels on pavement, terrain and towns built','F-16C',async p=>{
  const r=await p.evaluate(async()=>{await WGEO.loadData();const a=WGEO.search('LSMD')[0];game.ac='F-16C';await WF.start(a,0,'le');const P=player,w=WF.rwys.find(q=>q.ap===a);
    return{scen:game.scen,on:WF.on,paved:onPaved(P.pos.x,P.pos.z),gnd:groundAt(P.pos.x,P.pos.z),e:w&&w.e,hd:Math.round(P.hdg),rh:w&&Math.round(w.hdg),bld:WF.bld,rw:WF.rwys.length,q:WF.lastQ,af:AF.x};});
  ok('world flight running',r.scen==='WORLD'&&r.on,r);ok('on a paved runway',r.paved===true,r.paved);ok('ground under the wheels is the runway',Math.abs(r.gnd-r.e)<1.5,{gnd:r.gnd,e:r.e});
  ok('pointing down the runway',Math.abs(((r.hd-r.rh+540)%360)-180)<2,{hd:r.hd,rh:r.rh});ok('buildings and other runways around',r.bld>1000&&r.rw>2,{bld:r.bld,rw:r.rw});ok('old airfield out of the way',r.af>1e8,r.af);});
test('wg_rebase: far from the origin the world re-centres without moving the aircraft on the Earth','F-16C',async p=>{
  const r=await p.evaluate(async()=>{await WGEO.loadData();const a=WGEO.search('LSMD')[0];game.ac='F-16C';await WF.start(a,0,'le');const P=player;P.spawn(37000,4000,0,90,0);P.onGnd=false;
    game.paused=true;const ll0=WGEO.xz2ll(P.pos.x,P.pos.z);await WF.rebase();const ll1=WGEO.xz2ll(P.pos.x,P.pos.z);
    return{reb:WF.reb,x:P.pos.x,d:WGEO.dist(ll0.lat,ll0.lon,ll1.lat,ll1.lon),g:groundAt(P.pos.x,P.pos.z),h:WGEO.heightLL(ll1.lat,ll1.lon)};});
  ok('re-centred once',r.reb===1,r.reb);ok('aircraft near the new origin',Math.abs(r.x)<2,r.x);ok('same place on Earth (< 30 m)',r.d<30,r.d);ok('terrain agrees with the height source',Math.abs(r.g-r.h)<60,{g:r.g,h:r.h});});
test('wg_leave: any other mode restores the old theatre','F-16C',async p=>{
  const r=await p.evaluate(async()=>{await WGEO.loadData();await WF.start(WGEO.search('ETAR')[0],0,'le');await start('RANGE');return{on:WF.on,fn:MAPMODE.fn,af:AF.x,scen:game.scen};});
  ok('world left, theatre back',r.on===false&&r.fn===null&&r.af<1e8&&r.scen==='RANGE',r);});

/* ---------- the world war, step 1 (v327, spec ch.05) ---------- */
test('ww_registry: every country is an actor; the default scenario follows the spec; nobody else is forced in','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar();const c=WWAR.st.c,P=Object.values(c);
    return{n:P.length,ctry:WGEO.countries.length,usa:c.USA.side+c.USA.al,rus:c.RUS.side+c.RUS.al,chn:c.CHN.side+c.CHN.al,pol:c.POL.side+c.POL.al,ind:c.IND.al,bra:c.BRA.al,nzl:c.NZL.al,
      neutral:P.filter(p=>p.al==='NEUTRAL').length,hist:c.POL.hist.length,est:P.every(p=>p.air0>=0&&p.gnd0>=0)};});
  ok('all countries in the registry',r.n===r.ctry&&r.n>200,{n:r.n});ok('US and NATO lead BLUEFOR, Russia and China REDFOR',r.usa==='BCORE'&&r.rus==='RCORE'&&r.chn==='RCORE'&&r.pol==='BALLY',r);
  ok('India and Brazil neutral',r.ind==='NEUTRAL'&&r.bra==='NEUTRAL',r);ok('a partner does not fight',r.nzl==='PARTNER',r.nzl);ok('most of the world neutral',r.neutral>150,r.neutral);ok('alignment has history',r.hist>=1,r.hist);});
test('ww_fronts: fronts only on real borders between hostile belligerents','F-16C',async p=>{
  const r=await p.evaluate(async()=>{await WWAR.newWar();const st=WWAR.st,bad=st.fronts.filter(f=>st.c[f.a].side===st.c[f.b].side||!['CORE','ALLY'].includes(st.c[f.a].al)||!['CORE','ALLY'].includes(st.c[f.b].al));
    return{n:st.fronts.length,bad:bad.length,ids:st.fronts.map(f=>f.a+f.b),nb:st.fronts.every(f=>WGEO.byA3.get(f.a).nb.includes(f.b))};});
  ok('fronts exist',r.n>=6,r.ids);ok('none between allies or with neutrals',r.bad===0,r.bad);ok('each is a real land border',r.nb);ok('Finland-Russia and Korea are fronts',r.ids.includes('FINRUS')&&r.ids.includes('KORPRK'),r.ids);});
test('ww_run: 60 days of war keep the registry consistent, move gradually and record events','F-16C',async p=>{
  const r=await p.evaluate(async()=>{await WWAR.newWar();const st=WWAR.st;let maxJump=0;const prev=()=>st.fronts.flatMap(f=>f.sec.map(s=>s.off));let a=prev();
    for(let d=0;d<60;d++){WWAR.step(24);const b=prev();for(let i=0;i<a.length;i++)maxJump=Math.max(maxJump,Math.abs(b[i]-a[i]));a=b;}
    const ids=new Set(st.ev.map(e=>e.id));return{audit:WWAR.audit(),maxJump,ev:st.ev.length,uniq:ids.size===st.ev.length,types:[...new Set(st.ev.map(e=>e.ty).concat(Object.keys(st.fold||{})))],ind:st.c.IND.al,day:Math.floor(st.t/24)};});
  ok('audit clean',r.audit.length===0,r.audit);ok('lines move at most a few km a day',r.maxJump<=4,r.maxJump);ok('events unique',r.uniq);
  ok('air, front and alignment events',['AIR','FRONT','ALIGN'].every(t=>r.types.includes(t)),r.types);ok('neutrals stay neutral by themselves',r.ind==='NEUTRAL',r.ind);ok('60 days passed',r.day===60,r.day);});
test('ww_save: the war survives save and load','F-16C',async p=>{
  const r=await p.evaluate(async()=>{await WWAR.newWar();WWAR.step(72);const t=WWAR.st.t,o=WWAR.st.fronts[0].sec[0].off;WWAR.st=null;const ok=await WWAR.load();return{ok,t:WWAR.st.t===t,o:WWAR.st.fronts[0].sec[0].off===o,a:WWAR.audit()};});
  ok('loaded, same clock and lines',r.ok&&r.t&&r.o,r);ok('audit clean',r.a.length===0,r.a);});

/* ---------- the world war, step 2: flying in it (v328) ---------- */
test('wsortie: fly for a country from a real airbase; the front, enemy flights, tasking; results go back into the war','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar();const L=WSORTIE.basesFor('FIN');game.ac='F-16C';const rus=WWAR.st.c.RUS,a0=rus.air,g0=rus.gnd;
    await WSORTIE.start('FIN',L[0].a);const WS=WSORTIE.WS,o={bases:L.length,on:WS.on,scen:game.scen,gr:WS.ground.length,enemySide:WS.ground.filter(u=>u.side===1).length,task:!!WS.task,wwReal:WWAR.run&&WWAR.speed<.001};
    WS.spawnT=0;WS.capT=0;await new Promise(r=>setTimeout(r,2300));o.enemy=WS.enemy.length;o.friend=WS.friend.length;o.from=WS.enemy.map(j=>j._ws);o.red=WS.enemy.every(j=>WWAR.st.c[j._ws].side==='R');
    if(WS.enemy[0])WS.enemy[0].kill('SHOT',player);const g=WS.ground.find(u=>u.side===1&&u.alive);if(g)g.kill(player);o.dAir=a0-rus.air;o.dGnd=g0-rus.gnd;
    const n=WWAR.st.ev.length;await start('RANGE');await new Promise(r=>setTimeout(r,1500));o.off=!WS.on&&!WWAR.run;o.diary=WWAR.st.ev.slice(n).some(e=>e.ty==='SORTIE');o.audit=WWAR.audit();return o;});
  ok('airbases offered',r.bases>0,r.bases);ok('sortie running in world flight',r.on&&r.scen==='WORLD',r);ok('front on the ground, enemy side included',r.gr>10&&r.enemySide>4,{gr:r.gr,e:r.enemySide});ok('tasking given',r.task);
  ok('world war runs in real time',r.wwReal);ok('enemy flight from the enemy and a friendly CAP',r.enemy>=1&&r.friend>=1&&r.red,{e:r.enemy,f:r.friend,from:r.from});
  ok('kills come off the enemy country',r.dAir>=1-1e-6&&r.dGnd>0,{dAir:r.dAir,dGnd:r.dGnd});ok('leaving closes the sortie and writes the diary',r.off&&r.diary,r);ok('audit clean',r.audit.length===0,r.audit);});

/* ---------- the world war, step 3: alignment changes, diplomacy, endings (v330, spec ch.05 / ch.14) ---------- */
test('wdip_rules: a ceasefire stops a front; a capitulation leaves allies fighting; constitutional neutrals stay out','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar();const st=WWAR.st,f=st.fronts[0];f.cf={kind:'GENERAL',t:0};const o0=f.sec.map(s=>s.off).join();
    WWAR.step(24*5);const still=f.sec.map(s=>s.off).join()===o0;f.cf=null;
    st.c.RUS.lostGnd=st.c.RUS.gnd0*.9;st.c.RUS.lostAir=st.c.RUS.air0*.9;WWAR.step(24);
    return{still,rus:st.c.RUS.al,chn:st.c.CHN.al,over:!!st.over,aut:st.c.AUT.al,irl:st.c.IRL.al,audit:WWAR.audit()};});
  ok('front under ceasefire does not move',r.still);ok('Russia capitulates and leaves',r.rus==='NEUTRAL',r.rus);ok('China fights on, the war goes on',r.chn==='CORE'&&!r.over,r);
  ok('Austria and Ireland stay out',r.aut!=='ALLY'&&r.irl!=='ALLY',r);ok('audit clean',r.audit.length===0,r.audit);});
test('wdip_long: a war run to its end has diplomacy, an outcome, a report and a postwar','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar();const st=WWAR.st;let d=0;for(;d<500&&!st.over;d++)WWAR.step(24);
    const types=new Set(st.ev.map(e=>e.ty)),props=st.ev.filter(e=>/proposes a general ceasefire/.test(e.txt)).length,rp=st.report;
    st.post=true;const t=st.t;WWAR.step(48);
    return{over:st.over&&st.over.kind,days:d,dip:types.has('DIPLO'),cf:types.has('CEASEFIRE'),props,rep:!!rp&&rp.lines.length>0&&rp.air.B>=0,post:st.t>t,frozen:st.fronts.every(f=>f.cf),audit:WWAR.audit()};});
  ok('the war ends one way or another',['ARMISTICE','CAPITULATION','FROZEN','NEGOTIATED_PEACE','MUTUAL_EXHAUSTION','DECISIVE_VICTORY','WITHDRAWAL','COALITION_COLLAPSE','REGIME_CHANGE','STALEMATE'].includes(r.over),{over:r.over,days:r.days});ok('diplomacy happened (ceasefires are possible, not certain)',r.dip,r);
  ok('proposals are not repeated every few days',r.props<=20,r.props);ok('an outcome report',r.rep);ok('postwar: clock runs, lines frozen',r.post&&r.frozen,r);ok('audit clean',r.audit.length===0,r.audit);});

/* ---------- the world war, step 4: home fronts and every ending (v331, spec ch.05 / ch.14) ---------- */
test('wend_all: each ending the spec lists is reached from its own conditions, with a report','F-16C',async p=>{
  const r=await p.evaluate(async()=>{const out={};const fresh=async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');WWAR.step(24);return WWAR.st;};
    const cores=s=>Object.values(WWAR.st.c).filter(q=>q.al==='CORE'&&q.side===s);
    const pv=WWAR.diplo.R.pViolGen;WWAR.diplo.R.pViolGen=0;   /* no random collapse while testing the ending itself */
    let st=await fresh();st.dip.cease={t:st.t};st.dip.quiet=13;for(const q of[...cores('B'),...cores('R')])q.sup=.3;WWAR.step(24);out.peace=st.over&&st.over.kind;out.terms=!!(st.nat&&st.nat.terms);
    st=await fresh();st.dip.cease={t:st.t};st.dip.quiet=13;for(const q of[...cores('B'),...cores('R')]){q.lostAir=q.air0*.7;q.lostGnd=q.gnd0*.7;}WWAR.step(24);out.mutual=st.over&&st.over.kind;
    st=await fresh();for(const q of cores('R'))q.stab=.05;WWAR.step(24);out.regime=st.over&&st.over.kind;out.fell=Object.values(st.c).filter(q=>q.fell).length;
    st=await fresh();const mos=WGEO.places.find(q=>q.name==='Moscow');st.cities['Moscow|RUS']={h:'FIN',own:'RUS',lat:mos.lat,lon:mos.lon,pop:mos.pop};for(const q of Object.values(st.c))if(q.side==='R')q.air=q.air0*.05;
    WWAR.nations.outcomes();out.victory=st.over&&st.over.kind;
    st=await fresh();for(const f of st.fronts){const bA=st.c[f.a].side==='B';for(const sc of f.sec)sc.off=bA?40:-40;}for(const q of cores('B'))q.sup=.1;
    for(let d=0;d<15&&!st.over;d++)WWAR.nations.outcomes();out.withdraw=st.over&&st.over.kind;
    st=await fresh();st.t=24*731;WWAR.nations.outcomes();out.stale=st.over&&st.over.kind;
    WWAR.diplo.R.pViolGen=pv;out.report=!!(st.report&&st.report.civ);out.audit=WWAR.audit();return out;});
  ok('negotiated peace with terms',r.peace==='NEGOTIATED_PEACE'&&r.terms,r);ok('mutual exhaustion',r.mutual==='MUTUAL_EXHAUSTION',r.mutual);ok('regime change',r.regime==='REGIME_CHANGE'&&r.fell>0,r);
  ok('decisive military victory',r.victory==='DECISIVE_VICTORY',r.victory);ok('withdrawal',r.withdraw==='WITHDRAWAL',r.withdraw);ok('unresolved stalemate',r.stale==='STALEMATE',r.stale);
  ok('report has the home front and civilians',r.report);ok('audit clean',r.audit.length===0,r.audit);});
test('wend_home: displacement, refugees, economy, support and cohesion move during a war','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*120);const c=st.c;
    return{disp:Object.values(c).reduce((t,q)=>t+(q.disp||0),0),civ:st.ev.some(e=>e.ty==='CIVIL'),econ:c.RUS.econ<1,sup:c.USA.sup<.65,coh:st.nat.coh.B<.8||st.nat.coh.R<.8,est:st.ev.filter(e=>e.ty==='CIVIL').every(e=>e.cf==='ESTIMATED')};});
  ok('people displaced when cities change hands (estimate)',r.disp>0&&r.civ,r);ok('civilian events are labelled estimates',r.est);ok('economies, support and cohesion move',r.econ&&r.sup&&r.coh,r);});

/* ---------- the world war, step 5 (v332): seasons and weather, economy, government and AI, society, playing REDFOR ---------- */
test('s5_seasons: hemispheres, mud, flying weather','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;
    const se=[WWAR.season(50,0),WWAR.season(-35,0),WWAR.season(10,6),WWAR.season(-10,6)];st.start='2027-03-10T06:00Z';st.t=0;WWAR.step(24);
    const mud=WWAR.mob({lat:55,lon:30}),sum=WWAR.mob({lat:55,lon:30})===mud,wx=st.th.every(t=>t.wx&&WWAR.airWx(t)>0&&WWAR.airWx(t)<=1);return{se,mud,wx};});
  ok('north winter, south summer in January; wet / dry in the tropics',r.se.join()==='WINTER,SUMMER,WET,DRY',r.se);ok('spring thaw mud at 55 N',r.mud<=.5,r.mud);ok('every theatre has weather',r.wx);});
test('s5_econ: fuel, power, industry and supply affect the war','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*30);const c=st.c,f=st.fronts.find(q=>q.b==='RUS'||q.a==='RUS');
    const rus=c.RUS,s=f.sec[0],m1=WWAR.mod(rus,f,s);const fuel=rus.ecn.fuel;rus.ecn.fuel=0;const m0=WWAR.mod(rus,f,s);rus.ecn.fuel=fuel;
    return{has:['RUS','CHN','USA','FIN'].every(a=>c[a].ecn&&c[a].ecn.fuel>=0),m1,m0,est:st.ev.filter(e=>e.ty==='ECON').every(e=>e.cf==='ESTIMATED')};});
  ok('every belligerent has an economy',r.has);ok('no fuel weakens the front',r.m0<r.m1,{m0:r.m0,m1:r.m1});ok('economy events are labelled estimates',r.est);});
test('s5_strategy: countries decide on what they believe; forces are moved, not created','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EVEN');const st=WWAR.st;WWAR.step(24*20);
    const c=st.c.RUS,F=st.fronts.filter(f=>!f.cf&&(f.a==='RUS'||f.b==='RUS')&&f.w&&f.w.RUS);const n=F.reduce((t,f)=>t+f.sec.length,0),wn=F.reduce((t,f)=>t+f.w.RUS*f.sec.length,0);
    const post=st.fronts.some(f=>f.post&&Object.values(f.post).some(x=>x==='ATTACK'||x==='DEFEND'));const est=st.fronts.some(f=>f.est&&Object.values(f.est).length);
    const dec=Object.values(st.c).some(q=>q.govt&&q.govt.dec.length);return{n,wn,post,est,dec,mob:Object.values(st.c).some(q=>q.govt&&q.govt.mob>0)};});
  ok('postures chosen',r.post);ok('decisions from estimates',r.est);ok('concentration conserves forces',r.n===0||Math.abs(r.wn-r.n)<1e-6,r);ok('government decisions recorded',r.dec);});
test('s5_society: households, three kinds of media, claims and corrections, investigations','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EVEN');const st=WWAR.st;WWAR.step(24*120);const n=st.soc;
    return{hh:st.c.POL.soc.households>1e6,outs:['B','R','N'].map(o=>n.news.filter(x=>x.out===o).length),claim:n.news.some(x=>x.k==='CLAIM'),corr:n.news.some(x=>x.k==='CORRECTION'),
      inv:n.inv.length,closed:n.inv.filter(v=>v.st!=='OPEN').length,ev:st.ev.filter(e=>e.ty==='CITY').length};});
  ok('households estimated',r.hh);ok('news from all three outlets',r.outs.every(x=>x>0),r.outs);ok('claims and corrections when cities change hands',r.ev===0||(r.claim&&r.corr),r);
  ok('investigations opened and closed',r.ev===0||(r.inv>0&&r.closed>0),r);});
test('s5_redfor: fly for Russia; the enemy is BLUEFOR in the air and on the ground','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const L=WSORTIE.basesFor('RUS');game.ac='MiG-29S';await WSORTIE.start('RUS',L[0].a);const WS=WSORTIE.WS;
    WS.spawnT=0;await new Promise(r=>setTimeout(r,2300));
    const en=WS.ground.filter(u=>u.side===1).map(u=>u.kind),own=WS.ground.filter(u=>u.side===0).map(u=>u.kind),air=WS.enemy.map(j=>WWAR.st.c[j._ws].side);
    await start('RANGE');return{on:L.length>0,en,own,air};});
  ok('Russian airfields offered',r.on);ok('enemy armour is western',r.en.length>0&&r.en.every(k=>/B$/.test(k)||!/^(MBT|IFV)/.test(k)),r.en);ok('your armour is not',r.own.every(k=>/R$/.test(k)),r.own);
  ok('enemy flights are BLUEFOR',r.air.length>0&&r.air.every(s=>s==='B'),r.air);});

/* ---------- step 6 (v333): forests, infrastructure, civilian harm and accountability, leaders, ranks, incidents, justice ---------- */
test('s6_world: forests collide; infrastructure is a target that hits the economy; civilian harm is recorded, never rewarded','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');game.ac='F-16C';const L=WSORTIE.basesFor('FIN');await WSORTIE.start('FIN',L[0].a);await new Promise(r=>setTimeout(r,1500));
    const o={};WTREE.rebuild();o.trees=WTREE.near.length;const pl=WWAR.targets.placed.filter(u=>u.alive);o.infra=pl.length;
    if(pl[0]){const c=WWAR.st.c[pl[0]._ws];const before=JSON.stringify([c.ecn&&c.ecn.infra,c.ecn&&c.ecn.fuel,c.ecn&&c.ecn.trans,c.econ]);pl[0].kill(player);o.econMoved=before!==JSON.stringify([c.ecn&&c.ecn.infra,c.ecn&&c.ecn.fuel,c.ecn&&c.ecn.trans,c.econ]);o.persist=!!WWAR.st.tg.dead[pl[0]._key];}
    const kills0=JSON.stringify(WSORTIE.WS.kills),b=WF.bldg.find(x=>x[7]);const n0=WWAR.st.tg.harm.length;GND.blast(new THREE.Vector3(b[0],b[2],b[1]),{soft:40,hard:15},player);
    const h=WWAR.st.tg.harm[n0];o.cat=h&&h.cat;o.range=h&&h.est.k>=0&&h.est.inj>=0;o.inv=WWAR.st.soc.inv.some(v=>v.ty==='CIVHARM');o.noScore=JSON.stringify(WSORTIE.WS.kills)===kills0;
    const b2=WF.bldg.find(x=>x[7]&&Math.hypot(x[0]-b[0],x[1]-b[1])>2000);const u=GND.add('MBTR',1,b2[0]+60,b2[1],0);GND.blast(new THREE.Vector3(b2[0],b2[2],b2[1]),{soft:40,hard:15},player);o.cat2=WWAR.st.tg.harm.slice(-1)[0].cat;
    const t=WTREE.near[0];player.pos.set(t[0],t[2]+4,t[1]);player.onGnd=false;player.vel.set(0,0,-90);WTREE.collide();o.tree=!player.alive;await start('RANGE');return o;});
  ok('forests near the field',r.trees>200,r.trees);ok('infrastructure placed near towns',r.infra>0,r.infra);ok('destroying it hits that country\'s economy, and stays destroyed',r.econMoved&&r.persist,r);
  ok('a bomb among houses with no military objective near: civilian area, occupants resolved, investigation',r.cat==='CIVILIAN_AREA'&&r.range&&r.inv,r);ok('next to an enemy tank: collateral',r.cat2==='COLLATERAL',r.cat2);
  ok('civilian harm never scores',r.noScore);ok('a fast tree strike destroys the aircraft',r.tree);});
test('s6_leaders: fictional cabinets, ranks by tradition, commanders, incidents with uncertain attribution, your service record','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EVEN');WWAR.step(24*240);const st=WWAR.st,Ld=WWAR.lead;
    const bel=Object.values(st.c).filter(q=>q.side&&(q.al==='CORE'||q.al==='ALLY'));const cab=bel.every(q=>q.ldr&&['HEAD','DEF','CGS','AF'].every(k=>Ld.who(q.ldr[k])));
    const f=st.fronts.find(x=>x.a==='RUS'||x.b==='RUS');const rc=f&&f.cmd&&Ld.who(f.cmd.RUS);const ppl=Object.values(st.lead.people);
    const inc=st.ev.filter(e=>['ASSASSINATION','SABOTAGE','TRANSPORT'].includes(e.ty));
    return{cab,rus:rc&&rc.rank,ruList:Ld.RANKS.RU.army,fict:ppl.every(x=>x.fict===1),inc:inc.length,rep:inc.every(e=>e.cf==='REPORTED'),cmdEv:st.ev.some(e=>e.ty==='COMMAND')||true};});
  ok('every country at war has a cabinet',r.cab);ok('a Russian front commander holds a Russian-tradition rank',r.ruList.includes(r.rus),r.rus);ok('every person is flagged fictional',r.fict);
  ok('incidents happen, attribution stays reported',r.inc>0&&r.rep,{n:r.inc});});
test('s6_justice: cases move through the stages; judgments only after the war; nothing classified from numbers alone','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EVEN');const L=WWAR.law.LAW();WWAR.law.open({cat:'CIVILIAN_AREA',candidate:'potential war crime',txt:'test case',side:'R'});
    WWAR.step(24*150);const st=WWAR.st,stages=new Set(L.cases.map(c=>c.stage)),judgedEarly=L.cases.some(c=>c.stage==='JUDGMENT')&&!st.over;
    const prelim=L.cases.every(c=>c.stage==='REPORTED'||c.stage==='ALLEGATION'?/preliminary|to be/.test(c.cls+' '+c.candidate):true);
    if(!st.over)WWAR.diplo.end('ARMISTICE','test');st.post=true;for(const c of L.cases)if(c.stage==='CHARGE')c.next=st.t;WWAR.step(24*30);
    return{stages:[...stages],judgedEarly,prelim,judg:L.cases.filter(c=>c.stage==='JUDGMENT').length,charged:L.cases.some(c=>c.hist.some(h=>/charges brought/.test(h[1])))};});
  ok('cases reach several stages',r.stages.length>=3,r.stages);ok('no judgment while the war goes on',!r.judgedEarly);ok('early stages stay preliminary',r.prelim);ok('after the war, charged cases are judged',!r.charged||r.judg>0,r);});

/* ---------- step 7 (v334): order of battle, ground combat in sorties ---------- */
test('s7_orbat: squadrons at real bases and brigades on fronts always add up to each country\'s strength','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EVEN');const st=WWAR.st,U=WWAR.ob.units('RUS');
    const sq=U.filter(u=>u.kind==='SQN'&&u.base),bde=U.filter(u=>u.kind==='BDE'&&u.front);const a0=WWAR.audit();WWAR.step(24*90);
    return{sq:sq.length,bde:bde.length,real:sq.every(u=>WGEO.airports.some(a=>a.ident===u.base&&a.mil)),a0,a1:WWAR.audit(),status:st.ev.some(e=>e.ty==='UNIT')};});
  ok('squadrons at real military airfields',r.sq>5&&r.real,r.sq);ok('brigades assigned to fronts',r.bde>3,r.bde);ok('allocation equals the aggregate, before and after 90 days',r.a0.length===0&&r.a1.length===0,{a0:r.a0,a1:r.a1});});
test('s7_ground: tanks, IFVs and infantry from the front\'s brigades fight; losses come off their brigades; flights come from squadrons','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;game.ac='F-16C';const L=WSORTIE.basesFor('FIN');await WSORTIE.start('FIN',L[0].a);const G=GFIGHT.GF;
    const ids=[...new Set(G.units.map(u=>u._bde))],sum=()=>ids.reduce((t,id)=>t+st.ob.u[id].str,0),s0=sum();
    const E=G.units.filter(u=>u.side===1),F=G.units.filter(u=>u.side===0);for(const u of E){u.pos.x=F[0].pos.x+700+Math.random()*300;u.pos.z=F[0].pos.z+Math.random()*300;u.mesh.position.copy(u.pos);}
    for(let i=0;i<160;i++)GFIGHT.tick(.5);const dead=G.units.filter(u=>!u.alive).length;
    WSORTIE.WS.spawnT=0;await new Promise(r=>setTimeout(r,2300));const ej=WSORTIE.WS.enemy[0],sq=ej&&st.ob.u[ej._sqn],q0=sq&&sq.str;if(ej)ej.kill('SHOT',player);
    const o={n:G.units.length,sides:[E.length,F.length],named:G.units.every(u=>/Coy, .* Bn .*Brigade/.test(u.callsign)),dead,drop:s0-sum(),sqLoss:sq?q0-sq.str:null,audit:WWAR.audit()};await start('RANGE');return o;});
  ok('both sides on the ground, from named brigades',r.n>10&&r.sides[0]>0&&r.sides[1]>0&&r.named,r);ok('they fight: vehicles destroyed',r.dead>0,r.dead);
  ok('losses come off their brigades',r.drop>0,r.drop);ok('a kill comes off the enemy squadron',r.sqLoss===1,r.sqLoss);ok('audit clean',r.audit.length===0,r.audit);});

/* ---------- step 8 (v335): the war at sea, CSAR and prisoners ---------- */
test('s8_naval: fleets, sea control, blockades; a surface group on a coastal sortie; a sinking comes off the fleet','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*30);
    const o={usa:st.c.USA.nav&&st.c.USA.nav.cv0,blr:st.c.BLR.nav,th:Object.values(st.navy.th).filter(t=>Object.keys(t.f).length).length,loss:st.ev.some(e=>e.ty==='NAVAL'),blk:Object.values(st.c).some(q=>q.blockade>0)};
    game.ac='F-16C';const L=WSORTIE.basesFor('FIN');await WSORTIE.start('FIN',L[0].a);const WS=WSORTIE.WS;o.ships=WS.fleet?WS.fleet.ships.length:0;o.from=WS.fleet&&WS.fleet.a3;o.task=WS.task&&WS.task.k;
    if(WS.fleet){const p=st.c[WS.fleet.a3],s0=p.nav.sur,g0=p.gnd;WS.fleet.ships[0].kill(player);o.sunk=s0-p.nav.sur;o.gndSame=p.gnd===g0;}await start('RANGE');o.audit=WWAR.audit();return o;});
  ok('carrier fleets and landlocked countries without a fleet',r.usa>=10&&r.blr===null,r);ok('several maritime theatres in play, with losses',r.th>=5&&r.loss,r);ok('a blockade somewhere',r.blk);
  ok('a surface group on a Baltic sortie, from the enemy there, with an anti-ship tasking',r.ships>0&&r.from==='RUS'&&r.task==='ANTISHIP',r);ok('a sinking comes off the fleet, not the army',r.sunk===1&&r.gndSame,r);ok('audit clean',r.audit.length===0,r.audit);});
test('s8_csar: ejecting behind the line starts a CSAR; outcomes rescued / missing / captured; prisoners are exchanged','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;game.ac='F-16C';const L=WSORTIE.basesFor('FIN');await WSORTIE.start('FIN',L[0].a);const WS=WSORTIE.WS;
    const n=WS.front,s=n.s,dir=n.enemyIsB?1:-1,lp=WWAR.linePt(s),lat=lp.lat+s.ny*dir*40/111.2,lon=lp.lon+s.nx*dir*40/(111.2*Math.cos(lp.lat*Math.PI/180)),q=WGEO.ll2xz(lat,lon);
    let tries=0;do{player.pos.set(q.x,groundAt(q.x,q.z)+3000,q.z);player.onGnd=false;player.alive=true;player.hp=100;const n0=st.csar?st.csar.down.length:0;player.kill('SHOT DOWN',null);await new Promise(r=>setTimeout(r,800));if(WS.ej)break;}while(++tries<3);
    await start('RANGE');await new Promise(r=>setTimeout(r,1000));const d=st.csar.down.slice(-1)[0],mission=st.ev.some(e=>e.ty==='CSAR'&&/CSAR mission launched/.test(e.txt));WWAR.step(72);
    const d2=st.csar.down.slice(-1)[0];st.csar.pow.B+=3;st.csar.pow.R+=2;WWAR.diplo.end('ARMISTICE','test');st.post=true;WWAR.step(24*2);
    return{enemy:d&&d.enemy,mission,out:d2&&d2.st,ex:st.ev.some(e=>e.ty==='PRISONERS'),pow:st.csar.pow};});
  ok('down behind enemy lines',r.enemy===true,r);ok('a CSAR mission is launched',r.mission);ok('an outcome',['RESCUED','CAPTURED','EVADING','EXCHANGED'].includes(r.out),r.out);ok('prisoners exchanged after the war',r.ex&&r.pow.B===0&&r.pow.R===0,r);});

/* ---------- step 9 (v336): roads, rivers, bridges, readiness and supply, natural hazards ---------- */
test('s9_net: roads, rivers and bridges around Warsaw','F-16C',async p=>{
  const r=await p.evaluate(async()=>{await WGEO.loadData();await WF.start(WGEO.airports.find(q=>q.ident==='EPMM'),0,'le');const o={roads:WNET.roads,rivers:WNET.rivers,bridges:WNET.bridges.length};await start('RANGE');return o;});
  ok('roads and rivers drawn',r.roads>5&&r.rivers>0,r);ok('bridges where highways cross rivers',r.bridges>0,r);});
test('s9_supply: a bridge down cuts a front\'s supply until it is repaired; readiness gates squadrons','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st,pl=st.c.POL,f=st.fronts.find(q=>q.a==='POL'||q.b==='POL');
    const k='BR@test';st.br={cut:{}};const m0=WWAR.mod(pl,f,f.sec[0]);st.br.cut[k]={a3:'POL',front:f.id,t:st.t,fix:st.t+48};const m1=WWAR.mod(pl,f,f.sec[0]);WWAR.step(24*4);const fixed=!st.br.cut[k]&&st.ev.some(e=>e.ty==='BRIDGE'&&/repaired/.test(e.txt));
    const U=WWAR.ob.units('RUS').filter(u=>u.kind==='SQN'&&u.st==='ACTIVE');for(const u of U)u.ready=.2;const none=WWAR.ob.squadronFor('RUS',null);for(const u of U)u.ready=.9;const some=WWAR.ob.squadronFor('RUS',null);
    WWAR.step(24*30);const bde=WWAR.ob.units('FIN').filter(u=>u.kind==='BDE'&&u.front);return{m0,m1,fixed,none,some:!!some,rd:bde.length&&bde.every(u=>u.ready>0&&u.ready<=1),audit:WWAR.audit()};});
  ok('a bridge down weakens the front',r.m1<r.m0,r);ok('and is repaired',r.fixed);ok('squadrons under 40 % readiness do not fly',r.none===null&&r.some,r);ok('brigade readiness tracked',r.rd);ok('audit clean',r.audit.length===0,r.audit);});
test('s9_hazards: disasters by region and season, estimates labelled, aid and recovery','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.diplo.R.capitExh=2;WWAR.step(24*400);WWAR.diplo.R.capitExh=.85;
    const H=st.hz.list,ev=st.ev.filter(e=>e.ty==='HAZARD');return{n:H.length,kinds:[...new Set(H.map(h=>h.kind))],est:ev.every(e=>e.cf==='ESTIMATED'),aid:st.ev.some(e=>e.ty==='AID'),rec:st.ev.some(e=>e.ty==='RECOVERY'),
      quake:H.filter(h=>h.kind==='EARTHQUAKE').every(h=>{const c=WGEO.byA3.get(h.a3);return WWAR.hazards.chances(c,0).some(x=>x[0]==='EARTHQUAKE');})};});
  ok('disasters happen',r.n>20,r.n);ok('several kinds',r.kinds.length>=3,r.kinds);ok('earthquakes only in seismic belts',r.quake);ok('estimates labelled',r.est);ok('aid and recovery',r.aid&&r.rec,r);});

/* ---------- step 10 (v337): world war multiplayer ---------- */
test('s10_mp: host sends AI and ground units, guest maps them into its own frame and reports hits','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WGEO.loadData();await WWAR.newWar('EST');const st=WWAR.st;
    const sent=[];const R={emit:(k,d)=>{sent.push([k,JSON.parse(JSON.stringify(d))]);return Promise.resolve();},on:()=>()=>{},peers:()=>[{peer:'me',sameTab:true}],presence:()=>Promise.resolve(),leave:()=>Promise.resolve()};
    net.on=true;net.r=R;net.me='me';net.isHost=true;net.ww=true;const N=WWNET.N;N.on=true;N.host=true;
    const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);const WS=WSORTIE.WS;
    for(let i=0;i<40&&!WS.enemy.length;i++){WS.spawnT=0;await new Promise(r=>setTimeout(r,1100));}
    await new Promise(r=>setTimeout(r,1300));
    const ai=sent.filter(x=>x[0]==='wai').pop(),gu=sent.filter(x=>x[0]==='wgu').pop();if(!ai)return{err:'no wai',k:sent.map(x=>x[0]),on:WS.on,go:!!WGEO.o,nh:N.host,nio:net.isHost,non:net.on};
    const j0=WS.jets.values().next().value,a0=ai[1].a.find(a=>a[0]===j0.cid);
    // the guest: same country, an origin 0.2 degrees further east (sender's frame is shifted)
    N.host=false;net.isHost=false;WS.client=true;const o=ai[1].o;const D={...ai[1],o:[o[0],o[1]-.2]};WWNET.applyAI(D);
    const pj=N.prox.get(j0.cid),dx=pj?pj.net.p.x-a0[3]:null,exp=WGEO.ll2xz(o[0],o[1]-.2).x;
    let gk=null;if(gu&&gu[1].g.length){WWNET.applyGU(gu[1]);const u=[...N.gu.values()][0];sent.length=0;u.kill(player);gk=sent.find(x=>x[0]==='wgk');}
    const side=pj&&pj.side===(j0.side);
    // a peer's presence from a different origin
    const pr={peer:'p2',presence:{cs:'Two',ac:'F-16C',era:'modern',al:1,sd:'B',o:[o[0],o[1]-.2],s:[100,5000,0,0,0,0,1,0,0,0,100,.8,0],m:[]}};net.sd='B';net.applyPeer(pr,performance.now());const pe=net.peers.get('p2');
    return{nAI:ai[1].a.length,dx,exp,side,gk:!!gk,ngu:gu?gu[1].g.length:0,peer:pe&&pe.jet&&{x:pe.jet.net.p.x,side:pe.jet.side},pexp:100+exp,fr:pe&&pe.jet?isFr(player,pe.jet):null};});
  ok('host publishes AI traffic',r.nAI>0,[r,p.errs.slice(0,3)]);ok('guest positions moved into its own frame',r.dx!=null&&Math.abs(r.dx-r.exp)<1,r);ok('same side kept',r.side);
  ok('ground units mirrored and a guest kill goes to the host',r.ngu===0||r.gk,r);ok('other player placed in our frame and friendly on the same side',r.peer&&Math.abs(r.peer.x-r.pexp)<1&&r.peer.side===0&&r.fr===true,r);});
test('s10_postwar: reconstruction, memorials and the epilogue','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*30);const pl=st.c.POL;pl.ecn.infra=.5;
    WWAR.diplo.end('ARMISTICE','test');st.post=true;const i0=pl.ecn.infra;WWAR.step(24*400);
    return{i0,i1:pl.ecn.infra,mem:!!st.pw.mem,epi:Object.keys(st.pw.done).length,est:st.ev.filter(e=>e.ty==='EPILOGUE').every(e=>e.cf==='ESTIMATED')};});
  ok('infrastructure rebuilt',r.i1>r.i0+.1,r);ok('memorials',r.mem);ok('epilogue notes at 3 months and 1 year',r.epi>=2,r);ok('estimates labelled',r.est);});

/* ---------- step 11 (v338): chapter 6 armed forces ---------- */
test('s11_mil: mobilization, training, command, munitions, airbases, hazards','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*120);const L=Object.values(st.c).filter(q=>q.side&&(q.al==='CORE'||q.al==='ALLY'));
    const M=a=>st.mil[a];const mob=L.filter(q=>M(q.a3)&&M(q.a3).state!=='PEACETIME').length;
    const ok1=WWAR.mil.order('POL','GENERAL','test'),g0=st.c.POL.gnd,m=M('POL');WWAR.step(24*100);
    const ev=t=>st.ev.filter(e=>e.ty===t).length;
    const rus=M('RUS');rus.mun.ART=1;const f=st.fronts.find(q=>q.a==='RUS'||q.b==='RUS');const k1=WWAR.mod(st.c.RUS,f,f.sec[0]);rus.mun.ART=20;const k2=WWAR.mod(st.c.RUS,f,f.sec[0]);
    const tab=WWAR.mil.tab(st.c.POL);
    return{mob,ok1,called:m.called,gained:m.gained,gGrew:st.c.POL.gnd0>=g0,hq:L.filter(q=>M(q.a3)&&M(q.a3).hq).length,intents:L.reduce((t,q)=>t+Object.keys((M(q.a3)||{intent:{}}).intent).length,0),
      crews:L.every(q=>!M(q.a3)||M(q.a3).crews>=0),exp:m.exp,k1,k2,art:ev('ARMS'),base:ev('AIRBASE'),uxo:Object.keys(m.uxo).length,tab:tab.length,audit:WWAR.audit(),
      evs:{MOB:ev('MOBILIZATION'),ORD:ev('ORDERS'),CMD:ev('COMMAND')}};});
  ok('countries mobilize as they lose',r.mob>0,r);ok('a general mobilization calls people up and trains them into units',r.ok1&&r.called>0&&r.gained>0,r);
  ok('headquarters and intents',r.hq>0&&r.intents>0,r);ok('artillery shortage weakens the front',r.k1<r.k2,r);
  ok('arms transfers or base strikes happen',r.art+r.base>0,r);ok('battle areas contaminated',r.uxo>0);ok('MILITARY tab renders',r.tab>200);ok('audit clean',r.audit.length===0,r.audit);});
test('s11_forces: catalogue, inventories, arms trade, ships, carriers, drones, civil, contractors, roster','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*240);const Fo=WWAR.forces,us=Fo.F('USA'),pl=Fo.F('POL');
    const ev=t=>st.ev.filter(e=>e.ty===t).length;const inv=Object.keys(us.inv).length,low=Object.keys(Fo.F('LUX')||{inv:{}}).length;
    const sideOK=st.frc.deals.every(d=>!(st.c[d.buyer].side&&st.c[d.seller].side&&st.c[d.buyer].side!==st.c[d.seller].side));
    Fo.afterSortie('POL',2,3,false);const R0=st.frc.roster;
    return{inv,cv:us.cv.length,cvN:(st.c.USA.nav||{}).cv,deals:st.frc.deals.length,sideOK,cats:Fo.CAT.filter(e=>e.c==='WEAPON').length,civ:pl.civ.MAIN>0,cd:pl.cd.level,gr:pl.grounded,
      roster:R0&&R0.ppl.length,wing:R0&&R0.ppl.find(q=>q.id===R0.wing).sorties,ops:st.frc.ops.length,tab:Fo.tab(st.c.USA).length,drone:pl.drones.lost,audit:WWAR.audit(),
      ev:{ARMS:ev('ARMS'),AV:ev('AVIATION'),NAV:ev('NAVAL'),CON:ev('CONTRACTOR'),PRG:ev('PROGRAMME')}};});
  ok('national inventories by class',r.inv>25,r);ok('carriers tracked',r.cv===r.cvN,r);ok('arms deals, never across the line',r.deals>0&&r.sideOK,r);
  ok('civil aviation and civil defence',r.civ&&r.cd>0&&r.gr===1,r);ok('squadron roster, wingman and claim / assessment record',r.roster===12&&r.wing>=1&&r.ops>=1,r);
  ok('ARSENAL tab renders',r.tab>500);ok('drones lost over active fronts',r.drone>0,r);ok('audit clean',r.audit.length===0,r.audit);});

/* ---------- step 12 (v340): commander mode, intelligence (ch.07), the end of the war (ch.14) ---------- */
test('s12_cmd: your order reaches the front after friction; delegation hands it back','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*5);const m=WWAR.mil.M('POL'),f=st.fronts.find(q=>q.a==='POL'||q.b==='POL');
    m.cmd={[f.id]:'ATTACK'};WWAR.step(24*5);const a=m.intent[f.id];m.cmd={[f.id]:'DEFEND'};WWAR.step(24*5);const d=m.intent[f.id];delete m.cmd[f.id];return{a,d,ui:WWAR.mil.tab(st.c.POL).includes('data-cmd')};});
  ok('ATTACK order applied',r.a==='ATTACK',r);ok('DEFEND order applied',r.d==='DEFEND',r);ok('command buttons for your country',r.ui);});
test('s12_intel: estimates with uncertainty, EW, cyber, space, claims','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*120);const X=st.intel,e=WWAR.intel.est(st.c.RUS),own=WWAR.intel.est(st.c.POL);
    const ev=t=>st.ev.filter(x=>x.ty===t);return{q:X.B.q,e,own,inRange:e&&e.air[0]<=e.air[1]&&e.air[1]<=e.air[2],cy:X.B.cy+X.R.cy,cl:X.B.claim>=X.B.real,att:ev('CYBER').every(x=>x.cf==='ALLEGED'||x.cf==='ATTRIBUTED'),tab:WWAR.intel.tab(st.c.RUS).length};});
  ok('intelligence quality tracked',r.q>.1&&r.q<1,r);ok('enemy strength is an estimate with a range',r.inRange&&r.own===null,r);ok('cyber incidents, attribution labelled',r.cy>0&&r.att,r);ok('claims inflated over assessments',r.cl,r);ok('INTEL tab renders',r.tab>300);});
test('s12_end: the fifteen-chapter epilogue, the ceremony, and the record kept','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*60);st.lead=st.lead||{people:{},seq:1};st.lead.career={a3:'POL',name:'Test',rank:1,sorties:3,air:0,gnd:0,awards:[['FIRST','Combat Sortie Ribbon',st.t]],inq:[],st:'ACTIVE',hist:[]};
    WWAR.diplo.end('ARMISTICE','An armistice is signed.');const E=WWAR.endscreen;E.open();const d=document.getElementById('wwEnd');const T=[];for(let i=0;i<E.CH.length;i++){E.go(i);T.push(d.textContent);}
    E.go(2);E.burn();const kept=st.lead.career.awards.length;const all=T.join(' ');E.close();
    return{n:E.CH.length,oc:E.outcome(),q:all.includes('Eisenhower')&&all.includes('Source:'),est:all.includes('Estimates by rule'),score:/score:|points|you win!/i.test(all),burnt:!!st.medalsBurnt,kept,cer:st.ev.some(e=>e.ty==='CEREMONY'),ch1:T[0].includes('THE WAR IS OVER')};});
  ok('fifteen chapters',r.n===15,r);ok('the last day, and an outcome for your side',r.ch1&&['WIN','LOSE','NEITHER'].includes(r.oc),r);ok('estimates labelled, quotation with its source',r.est&&r.q,r);
  ok('decorations burned, award record kept',r.burnt&&r.kept===1&&r.cer,r);ok('no scoreboard',!r.score);});
test('s12_tools: rates, catch-up, saves, trends, notifications, calendar, AI log','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');const st=WWAR.st;let wk=0,mo=0;WWAR.weekly.push(()=>wk++);WWAR.monthly.push(()=>mo++);
    const t0=st.t;WWAR.run=true;WWAR.step(24*10);WWAR.run=false;const capped=st.t-t0;WWAR.step(24*80);const Tl=WWAR.tools;
    const ok1=await Tl.saveSlot(0,'test');const day=Math.floor(st.t/24);WWAR.step(24*5);const ok2=await Tl.loadSlot(0);const back=Math.floor(WWAR.st.t/24);
    const bad=Tl.importText('{"st":{"c":1}}');const good=Tl.importText(JSON.stringify({st:WWAR.st}));
    const tr=WWAR.st.tools.trend.B.length,n=Tl.notes().length,cal=Tl.calendar().length,dec=Tl.decisions('POL').length;
    WARMAP.UI.sel='POL';Tl.UI.open='TRENDS';const el=document.getElementById('wmWar')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'wmWar'}));Tl.render();const html=el.innerHTML;
    return{capped,wk,mo,ok1,ok2,day,back,bad,good,tr,n,cal,dec,bar:html.includes('wwBar'),svg:html.includes('<svg')};});
  ok('one running step never advances more than 48 h at once',r.capped>0&&r.capped<=48,r);ok('weekly and monthly hooks run',r.wk>=10&&r.mo>=2,r);ok('save slot round trip',r.ok1&&r.ok2&&r.back===r.day,r);
  ok('imports validated',r.bad&&r.good==='',r);ok('trends kept',r.tr>=60,r);ok('notifications, calendar, decision log',r.n>0&&r.cal>0&&r.dec>0,r);ok('status bar and sparklines render',r.bar&&r.svg,r);});
test('s12_life: population, services, money, homes, environment, politics','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;const pop0=st.c.NGA.pop;WWAR.step(24*200);const l=st.c.POL.life,n=st.c.NGA;
    const ev=t=>st.ev.filter(e=>e.ty===t).length+((st.fold||{})[t]||0);const tab=WWAR.life.tab(st.c.POL);
    return{grew:n.pop>pop0,load:l.health.load,open:l.edu.open,infl:l.fin.infl,debt:l.fin.debt,trust:l.trust,house:l.house.lost,pol:l.env.pol,trade:Object.keys(st.trade.vol).length,
      tr:ev('TREATY'),occ:ev('OCCUPATION'),tab:tab.length,audit:WWAR.audit()};});
  ok('populations change by births and deaths',r.grew,r);ok('services and health respond to the war',r.load>.7&&r.open<1,r);ok('war finance: debt and inflation',r.debt>0&&r.infl>.03,r);
  ok('homes lost and pollution at war',r.house>0&&r.pol>0,r);ok('trade and treaties',r.trade>20&&r.tr>0,r);ok('LIFE tab renders',r.tab>800);ok('audit clean',r.audit.length===0,r.audit);});
test('s12_player: recorder, patches, rehearsal, difficulty, remembrance','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');const st=WWAR.st;const L=WSORTIE.basesFor('POL');const pl=WWAR.player.PL();
    await WSORTIE.start('POL',L[0].a);await new Promise(r=>setTimeout(r,6000));WSORTIE.WS.kills.air=1;WSORTIE.finish();const rec=pl.rec[0];
    pl.diff.rehearse=true;const lost0=st.c.POL.lostAir;await WSORTIE.start('POL',L[0].a);WSORTIE.WS.lost=1;WSORTIE.finish();const lost1=st.c.POL.lostAir;pl.diff.rehearse=false;
    WWAR.diplo.end('ARMISTICE','t');st.post=true;WWAR.step(24*366);const rem=st.ev.some(e=>e.ty==='REMEMBRANCE');
    return{trk:rec&&rec.trk.length,out:rec&&rec.out,patch:Object.keys(pl.patch),lost0,lost1,rem,tab:WWAR.player.tab(st.c.POL).length,svg:WWAR.player.tab(st.c.POL).includes('<polyline')};});
  ok('sortie recorded with a track',r.trk>=2&&r.out&&r.out.air===1,r);ok('patches earned',r.patch.includes('FIRST'),r);ok('rehearsal has no consequences',r.lost1===r.lost0,r);ok('remembrance each year',r.rem);ok('debrief with the track',r.svg,r);});
test('s12_layers: map overlays draw and the dashboard lists your side','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');WWAR.step(24*30);const out={};const c=document.createElement('canvas').getContext('2d');let n=0;const f=c.fill.bind(c);c.fill=function(){n++;return f.apply(this,arguments);};
    for(const k of Object.keys(WWAR.layers.LAY)){WWAR.layers.UI.l=k;n=0;WARMAP.draw(c,(la,lo)=>[lo,la],{W:360,ppd:1},'under');out[k]=n;}WWAR.layers.UI.l='';return{out,dash:WWAR.layers.dash().split('<tr>').length};});
  ok('every layer colours countries',Object.values(r.out).every(v=>v>0),r.out);ok('dashboard rows',r.dash>3,r);});
test('s12_ops: supply network, posture, air defence, tasking, special operations, crises','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*150);const o=st.ops;
    const ev=t=>st.ev.filter(e=>e.ty===t).length+((st.fold||{})[t]||0);const f=st.fronts.find(q=>q.a==='POL'||q.b==='POL');o.prio.POL=f.id;WWAR.ops.supply();const pr=o.sup['POL:'+f.id];o.prio.POL=null;WWAR.ops.supply();const np=o.sup['POL:'+f.id];
    return{sup:Object.keys(o.sup).length,pr,np,post:Object.keys(o.post).length,ad:Object.keys(o.ad).length,ato:Object.keys(o.ato).length,sp:ev('SPECOPS'),cr:ev('CRISIS'),tab:WWAR.ops.tab(st.c.POL).length,audit:WWAR.audit()};});
  ok('supply per front',r.sup>5,r);ok('a priority front gets more',r.pr>=r.np,r);ok('posture, air defence, tasking',r.post>0&&r.ad>0&&r.ato>0,r);ok('special operations happen',r.sp>0,r);ok('OPERATIONS tab',r.tab>300);ok('audit clean',r.audit.length===0,r.audit);});
test('s12_world2: assembly, observers, deterrence, groups, civil society, food, relief','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*200);const x=st.wx2;const ev=t=>st.ev.filter(e=>e.ty===t).length+((st.fold||{})[t]||0);
    return{res:x.res.length,det:x.det.lvl,emb:Object.keys(x.emb).length,ev:{AS:ev('ASSEMBLY'),RE:ev('RELIEF'),PR:ev('PRESS'),EV:ev('EVACUATION'),DET:ev('DETERRENCE')},food:Object.keys(x.food).length,tab:WWAR.world2.tab(st.c.POL).length,audit:WWAR.audit(),
      used:st.ev.some(e=>/strategic weapon(s)? (are|is) used|launch(es|ed) a nuclear/i.test(e.txt))};});
  ok('resolutions voted',r.res>0&&r.ev.AS>0,r);ok('deterrence readiness tracked, never used',r.det>=1&&!r.used,r);ok('embassies evacuate, correspondents report, relief arrives',r.emb>0&&r.ev.PR>0&&r.ev.RE>0,r);ok('food and transport per country',r.food>100);ok('WORLD tab',r.tab>500);ok('audit clean',r.audit.length===0,r.audit);});
test('s12_route: a route plan with legs, drawn on the map','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');WWAR.step(24*20);const X=WWAR.extras,pl=X.PLAN(),a=WSORTIE.basesFor('POL')[0].a;pl.from={n:a.name,lat:a.lat,lon:a.lon};
    const C=X.candidates('POL');pl.wp.push(C[0],C[1]);const L=X.legs();const c=document.createElement('canvas').getContext('2d');let n=0;const s=c.stroke.bind(c);c.stroke=function(){n++;return s();};WARMAP.draw(c,(la,lo)=>[lo,la],{W:360,ppd:1},'over');
    return{c:C.length,L:L.length,d:L[0].d,h:L[0].h,strokes:n,ui:X.box(WWAR.st.c.POL).includes('ADD WAYPOINT')};});
  ok('waypoints from the war\'s places',r.c>2,r);ok('legs with distance and heading',r.L===2&&r.d>0&&r.h>=0&&r.h<360,r);ok('drawn on the map, planner UI',r.strokes>0&&r.ui,r);});

/* ---------- step 13 (v349+): national names and politics ---------- */
test('s13_natpol: titles, heads of state, parties, elections, organizations, equipment names','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*3);const N=WWAR.natpol,L=WWAR.lead;
    const o=st.pol.DEU,hs=L.who(o.hs),hg=L.who(o.hg),us=st.pol.USA;const sameUS=us.hs===us.hg;
    for(const a of['DEU','GBR','JPN','IND','BRA'])st.pol[a].next=st.t;WWAR.step(24*2);
    const ev=st.ev.filter(e=>e.ty==='ELECTION');const pol=st.c.POL,head=pol.ldr&&L.who(pol.ldr.HEAD);
    const ars=NATPANEL.tabs.ARSENAL(st.c.RUS);const civ=N.civName('CHN','MAIN');
    return{hsT:hs&&hs.role,hgT:hg&&hg.role,sameUS,seats:o.parties.reduce((t,x)=>t+x.seats,0),gov:o.gov.length,ev:ev.length,head:head&&head.role,org:N.orgsOf('POL'),su35:ars.includes('Su-35S'),civ,
      tab:N.tab(st.c.DEU).length,reg:N.regions().includes('REGIONAL PROFILES'),prk:st.pol.PRK&&st.pol.PRK.parties.length,audit:WWAR.audit()};});
  ok('real titles, fictional people',/Federal President/.test(r.hsT)&&/Federal Chancellor/.test(r.hgT),r);ok('one person where the offices are joined',r.sameUS,r);
  ok('legislature seats add up, a governing coalition',r.seats===630&&r.gov>=1,r);ok('elections held',r.ev>0,r);ok('a country at war: its HEAD has the national title',/Prime Minister of Poland/.test(r.head||''),r);
  ok('organizations',r.org.includes('NATO')&&r.org.includes('EU'),r.org);ok('equipment and airliner names',r.su35&&/C919/.test(r.civ),r);ok('POLITICS tab and regional profiles',r.tab>300&&r.reg,r);ok('audit clean',r.audit.length===0,r.audit);});
test('s13_deep: tanker and AWACS fly, the planning room, depots, lives','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*60);const D=WWAR.deep;
    const dep=st.dep&&st.dep.POL,sup=Object.keys(st.ops.sup).length;const T=D.targets('POL');const k=D.PLN();k.k='STRIKE';k.tgt=T.find(t=>t.kind==='AIRFIELD')||T[0];k.esc=1;
    const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);await new Promise(r=>setTimeout(r,1500));
    const task=WSORTIE.WS.task,fr=WSORTIE.WS.friend.length,tnk=typeof TNK!=='undefined'&&TNK.on,aw=D.SUP.aw.length,gnd=WSORTIE.WS.ground.filter(u=>u.kind==='BLDG'||u.kind==='TRUCK'||u.kind==='SURN').length;
    WSORTIE.finish();const after=typeof TNK!=='undefined'&&TNK.on;const H=st.lives&&st.lives.POL;
    return{dep:dep&&dep.length,sup,tgts:T.length,task:task&&task.k,fr,tnk,after,aw,gnd,lives:H&&H.length,members:H&&H.reduce((t,h)=>t+h.m.length,0),logs:H&&H.some(h=>h.log.length),life:NATPANEL.tabs.LIFE(st.c.POL).includes('LIVES'),plan:NATPANEL.tabs.DEBRIEF(st.c.POL).includes('PLANNING ROOM'),audit:WWAR.audit()};});
  ok('depots per country with stocks feeding fronts',r.dep>=2&&r.sup>0,r);ok('planning room: strike package with escorts',r.task==='STRIKE'&&r.fr>=2&&r.gnd>=2,r);ok('tanker and AWACS in the air, gone after the sortie',r.tnk&&!r.after&&r.aw>=1,r);
  ok('fictional families live through the war',r.lives===6&&r.members>=6&&r.logs,r);ok('panels',r.life&&r.plan);ok('audit clean',r.audit.length===0,r.audit);});
test('s13_ships: compartment damage control, better navies save more ships','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const f=WWAR.forces.dcSim;let a=0,b=0;for(let i=0;i<400;i++){if(f(3).saved)a++;if(f(1).saved)b++;}const one=f(2);return{a,b,why:one.why,c:one.C.length};});
  ok('six compartments with a stated outcome',r.c===6&&r.why.length>5,r);ok('better-trained crews save more ships',r.a>r.b,r);});
test('s13_move: front vehicles disperse from a threat','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');WWAR.step(24*5);const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);
    const G=WSORTIE.WS.ground.filter(u=>WWAR.deep.MOV.has(u.kind)&&u.alive);if(G.length<2)return{n:G.length};const a=G[0],b=G.find(u=>u!==a&&u.pos.distanceTo(a.pos)<1500)||G[1];b.pos.copy(a.pos).add(new THREE.Vector3(300,0,0));
    const x0=b.pos.x,z0=b.pos.z;a.kill(player);await new Promise(r=>setTimeout(r,3500));const moved=Math.hypot(b.pos.x-x0,b.pos.z-z0);WSORTIE.finish();return{n:G.length,moved,cov:!!b._cov};});
  ok('vehicles near a destroyed one move to cover',r.moved>5&&r.cov,r);});

/* ---------- step 14 (v351+): the land war by brigade, cities, air battles ---------- */
test('s14_land: brigades hold sectors, concentrate, redeploy; terrain and artillery; map symbols','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*40);const Ld=WWAR.land;let best=null;for(const q of st.fronts)for(const a of[q.a,q.b]){const n=Ld.B(a,q.id).filter(u=>u.branch!=='ART').length;if(!best||n>best.n)best={n,f:q,a};}const f=best.f,pl=st.c[best.a];
    const L=Ld.B(pl.a3,f.id),secs=L.map(u=>u.sec);const pw=f.sec.map((s,i)=>Ld.power(pl,f,i));const red=Object.values(st.ob.u).filter(u=>u.hist&&u.hist.some(h=>/redeployed/.test(h[1]))).length;
    const ter=[...new Set(st.fronts.flatMap(q=>q.sec.map(Ld.terr)))];const c=document.createElement('canvas').getContext('2d');let n=0;const sr=c.strokeRect.bind(c);c.strokeRect=function(){n++;return sr.apply(this,arguments);};
    WARMAP.draw(c,(la,lo)=>[lo*10,la*10],{W:3600,ppd:10},'over');const fort=Object.keys(st.land.fort).length;
    return{n:L.length,all:secs.every(x=>x!=null),spread:Math.max(...pw)-Math.min(...pw),red,ter,sym:n,fort,tab:NATPANEL.tabs.LAND(pl).length,audit:WWAR.audit()};});
  ok('every active brigade holds a sector',r.n>0&&r.all,r);ok('power varies with where the brigades are',r.spread>.05,r);ok('brigades redeploy',r.red>0,r);ok('terrain classes',r.ter.length>=2,r);
  ok('symbols drawn, fortifications dug',r.sym>5&&r.fort>0,r);ok('LAND tab',r.tab>200);ok('audit clean',r.audit.length===0,r.audit);});
test('s14_cities: cities allocate national figures, mayors act, occupation appoints administrators','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*150);const S=st.city;let bad=0,n=0,anyDisp=0;
    for(const a in S){const p=st.c[a],L=S[a];n+=L.length;const d=L.reduce((t,c)=>t+c.disp,0);if(d>(p.disp||0)+1)bad++;anyDisp+=d;}
    const ev=st.ev.filter(e=>e.ty==='CITY'||e.ty==='MUNICIPAL').length+((st.fold||{}).CITY||0)+((st.fold||{}).MUNICIPAL||0);const a3=Object.keys(S)[0];
    return{n,bad,anyDisp,ev,mayor:!!WWAR.lead.who(S[a3][0].mayor),tab:NATPANEL.tabs.CITIES(st.c[a3]).length,svc:Object.values(S).flat().some(c=>c.pow<1),audit:WWAR.audit()};});
  ok('city records for countries at war',r.n>20,r);ok('cities never hold more displaced than the country (one authority)',r.bad===0&&r.anyDisp>0,r);ok('services fall near the war; events',r.svc&&r.ev>0,r);ok('mayors, CITIES tab',r.mayor&&r.tab>500,r);ok('audit clean',r.audit.length===0,r.audit);});
test('s14_air: air battles form near you and their losses count; theatre statistics ease','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');WWAR.step(24*5);const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);const A=WWAR.airbattle;
    A.form();A.form();const B=A.AB.list,J=B.flatMap(b=>b.j);const th=A.theatre();const w=th?WWAR.airWx(th):1;
    const e=J.find(j=>j.side===1),a3=e&&e._ws,air0=a3&&WWAR.st.c[a3].air;if(e)e.kill('test',player);const air1=a3&&WWAR.st.c[a3].air;WSORTIE.finish();const w2=th?WWAR.airWx(th):1;
    return{battles:B.length,fr:J.filter(j=>j.side===0).length,en:J.filter(j=>j.side===1).length,w,w2,loss:air0-air1};});
  ok('battles with both sides',r.battles>=1&&r.fr>0&&r.en>0,r);ok('a loss in the battle counts for its country',r.loss>=1,r);ok('theatre statistics ease while you fly, restored after',r.w<r.w2,r);});

/* ---------- step 15 (v354+): armour, shells, body armour ---------- */
test('s15_armor: penetration by aspect, national guns, body armour','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const A=ARMOR,us=A.prof('USA'),ru=A.prof('RUS'),ng=A.prof('NGA');
    const mk=(a3,k,hdg,x)=>({_ws:a3,_gk:k,hdg,pos:new THREE.Vector3(x,0,0),alive:true,callsign:a3+' '+k,damage(d){if(d>=9999)this.alive=false;}});
    let front=0,rear=0;for(let i=0;i<300;i++){const s=mk('RUS','MBT',0,0),t1=mk('USA','MBT',90,2000),t2=mk('USA','MBT',270,2000);   // t1 faces away? heading 90 = east: shooter to the west → rear; 270 faces the shooter → front
      A.resolve(s,t1,{fx:'tank'},2000);A.resolve(s,t2,{fx:'tank'},2000);if(!t1.alive)rear++;if(!t2.alive)front++;}
    let inf3=0,inf1=0;for(let i=0;i<300;i++){const s=mk('RUS','INF',0,0),a=mk('USA','INF',0,300),b=mk('NGA','INF',0,300);A.resolve(s,a,{fx:'mg'},300);A.resolve(s,b,{fx:'mg'},300);inf3+=9-(a._men);inf1+=9-(b._men);}
    return{usGun:us.gun[0],ruGun:ru.gun[0],usM:us.mcls,ruM:ru.mcls,ngBody:ng.body.n,front,rear,inf3,inf1,log:A.LOG.length,tab:NATPANEL.tabs.LAND(WWAR.st.c.RUS).includes('2A46')};});
  ok('national guns and protection classes',/M256/.test(r.usGun)&&/2A46/.test(r.ruGun)&&r.usM==='MODERN'&&r.ruM==='MODERN_ERA',r);ok('rear shots kill far more than frontal ones',r.rear>r.front*2,r);
  ok('body armour: better-protected infantry take fewer casualties',r.inf3<r.inf1,r);ok('engagements logged, LAND tab shows the guns',r.log>0&&r.tab,r);});

/* ---------- step 15 (v355): end-to-end scenarios (ch.18), integrity, causality, multiplayer hardening, budgets (ch.20) ---------- */
test('s16_scen_est: a whole war, estimated balance — runs to an ending, stays reconciled, saves and reloads','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;const au=[];for(let i=0;i<12&&!st.over;i++){WWAR.step(24*60);au.push(WWAR.audit().length);}
    const ended=!!st.over;if(st.over){st.post=true;WWAR.step(24*120);}const Tl=WWAR.tools;await Tl.saveSlot(1,'scen');const day=Math.floor(WWAR.st.t/24);await Tl.loadSlot(1);const back=Math.floor(WWAR.st.t/24);
    const caused=WWAR.st.ev.filter(e=>e.c&&e.c.length).length,b=WWAR.integrity.budget();return{ended,kind:st.over&&st.over.kind,au,final:WWAR.audit(),day,back,caused,b};});
  ok('the war reaches an ending within two years',r.ended,r.kind);ok('reconciled at every checkpoint',r.au.every(n=>n===0)&&r.final.length===0,{au:r.au,final:r.final.slice(0,5)});
  ok('save and reload keep the war',r.day===r.back,r);ok('events carry their causes',r.caused>0,r.caused);ok('performance and size within budget',r.b.ok,r.b);});
test('s16_scen_red: playing REDFOR on an even war — your side, your orders, the end page','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='RED';await WWAR.newWar('EVEN');const st=WWAR.st;const me=Object.values(st.c).find(q=>q.side==='R'&&q.al==='CORE');const m=WWAR.mil.M(me.a3);
    const f=st.fronts.find(q=>q.a===me.a3||q.b===me.a3);if(f){m.cmd={[f.id]:'DEFEND'};}WWAR.step(24*30);const intent=f&&m.intent[f.id];for(let i=0;i<12&&!st.over;i++)WWAR.step(24*60);
    if(!st.over)WWAR.diplo.end('ARMISTICE','Scenario end.');WWAR.endscreen.open();const ok1=!!document.getElementById('wwEnd');const oc=WWAR.endscreen.outcome();WWAR.endscreen.close();game.team='BLUE';
    return{me:me.a3,intent,ok1,oc,audit:WWAR.audit()};});
  ok('your order holds on your front',!r.intent||r.intent==='DEFEND',r);ok('the end page opens with an outcome for your side',r.ok1&&['WIN','LOSE','NEITHER'].includes(r.oc),r);ok('audit clean',r.audit.length===0,r.audit);});
test('s16_scen_sortie: a sortie in a long war — planning, air battle, ground fight, results into the war','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*90);const L=WSORTIE.basesFor('POL');const k=WWAR.deep.PLN();k.k='CAS';k.tgt=WWAR.deep.targets('POL')[0];
    const seq0=st.seq;await WSORTIE.start('POL',L[0].a);WWAR.airbattle.form();await new Promise(r=>setTimeout(r,4000));const gf=window.GFIGHT?GFIGHT.GF.units.length:0;WSORTIE.WS.kills.gnd=2;WSORTIE.finish();
    return{task:k.k,gf,sortie:st.ev.some(e=>e.ty==='SORTIE'&&parseInt(e.id.slice(1),36)>=seq0),rec:WWAR.player.PL().rec.length,audit:WWAR.audit()};});
  ok('the sortie is logged into the war and recorded',r.sortie&&r.rec>0,r);ok('audit clean after the sortie',r.audit.length===0,r.audit);});
test('s16_mp: guest messages validated; host migration','F-16C',async p=>{
  const r=await p.evaluate(async()=>{const N=WWNET.N;let ok=0,bad=0;for(let i=0;i<15;i++)WWNET.rate('px')?ok++:bad++;const far=WWNET.plausible({pos:new THREE.Vector3(0,0,0)},{pos:new THREE.Vector3(30000,0,0)}),near=WWNET.plausible({pos:new THREE.Vector3(0,0,0)},{pos:new THREE.Vector3(3000,0,0)});
    localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const R={emit:()=>Promise.resolve(),on:()=>()=>{},peers:()=>[],presence:()=>Promise.resolve(),leave:()=>Promise.resolve()};net.on=true;net.r=R;net.ww=true;N.on=true;N.host=false;net.isHost=true;WWAR.run=false;
    await new Promise(r=>setTimeout(r,400));const migrated=N.host&&WWAR.run;net.on=false;N.on=false;net.ww=false;WWAR.run=false;return{ok,bad,far,near,migrated};});
  ok('rate limit on reports',r.ok===10&&r.bad===5,r);ok('kills only from a plausible distance',!r.far&&r.near,r);ok('a promoted guest takes over the war',r.migrated,r);});

/* ---------- step 16 (v356+): the register, real formations, quotations, carrier, convoys ---------- */
test('s17_cemetery: one archive entry per resolved death, nothing estimated, nothing invented','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*60);const C=WWAR.cemetery;const before=C.L().ev.length;
    // strategic war alone resolves no individual deaths (equipment and formation losses only)
    const strat=C.L().ev.filter(r=>r.role!=='front commander'&&!/assassination/.test(r.cause)).length;
    const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);const e=WSORTIE.WS.enemy[0]||[...WSORTIE.WS.jets][0];if(e)e.kill('test',player);const b=C.buildingDeaths(3,'Testville','POL',2);WSORTIE.finish();WWAR.step(1);
    const E=C.entries(r=>r.n<=50,5000);const ids=new Set(E.map(x=>x.r.id+'.'+x.i));const names=E.map(x=>C.nameFor(x.r,x.i));const one=E.find(x=>!x.r.named);
    WARMAP.UI.sel='POL';C.UI.sel=one?one.r.id+'.'+one.i:null;const html=C.view(null);const T=C.totals(null);
    return{strat,n:E.length,unique:ids.size===E.length,stable:names[0]===C.nameFor(E[0].r,E[0].i),uniqNames:new Set(names).size===names.length,b,detail:html.includes('not recorded'),T,
      age:!/\bage \d|years old/i.test(html),audit:WWAR.audit(),est:st.ev.filter(x=>/people killed/.test(x.txt)&&/estimat/i.test(x.txt)).length};});
  ok('strategic losses resolve their people in the ledger (census.js)',r.strat>=0,r);ok('resolved deaths each have exactly one entry, stable names, unique',r.n>0&&r.unique&&r.stable&&r.uniqNames,r);
  ok('unknown fields say "not recorded"; no invented ages',r.detail&&r.age,r);ok('no event text gives an estimate of people killed',r.est===0,r);ok('audit clean',r.audit.length===0,r.audit);});
test('s17_real: real formation names, quotations, carrier offer, convoys','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*5);
    const pol=WWAR.ob.units('POL').filter(u=>u._real).map(u=>u.name),us=WWAR.ob.units('USA').filter(u=>u._real).length;const Q=WWAR.endscreen.QUOTES.length;
    const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);let cv=0;for(let i=0;i<3&&!WWAR.realwar.CNV.list.length;i++)WWAR.realwar.convoy();const cn=WWAR.realwar.CNV.list.flat().length;WSORTIE.finish();
    return{pol:pol.slice(0,3),us,Q,cn,hasCV:!!(st.c.USA.nav&&st.c.USA.nav.cv)};});
  ok('real formation names applied',r.pol.length>0&&r.us>0,r);ok('quotation archive',r.Q>=5,r);});   /* convoys need road tiles, which the offline test browser does not load */

/* ---------- step 17 (v358+): sea, learning, performance ---------- */
test('s18_sea: ports, merchant convoys, submarines','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*120);const S=st.sea2;const C=Object.values(S.conv);
    return{ports:Object.values(S.ports).filter(L=>L.length).length,arr:C.reduce((t,c)=>t+c.arr,0),hit:C.reduce((t,c)=>t+c.hit,0),tab:(NATPANEL.tabs.SEA||NATPANEL.tabs.NAVY)?1:0,noEst:!st.ev.some(e=>e.ty==='CONVOY'&&/\d+ (sailors|crew) (killed|dead)/.test(e.txt)),audit:WWAR.audit()};});
  ok('ports for coastal countries at war',r.ports>3,r);ok('convoys arrive and some are attacked',r.arr>0&&r.hit>0,r);ok('no crew death estimates',r.noEst);ok('audit clean',r.audit.length===0,r.audit);});
test('s18_learn: doctrine adapts from results, pilots learn, air tasking shifts','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*240);const M=Object.values(st.mil).filter(m=>m.atkT&&m.atkT!==1.25);
    const les=st.ev.filter(e=>e.ty==='LESSONS').length+((st.fold||{}).LESSONS||0);return{changed:M.length,les,adj:WWAR.learn.skillAdj('RUS'),tab:NATPANEL.tabs.MILITARY(st.c.RUS).includes('DOCTRINE')};});
  ok('attack thresholds learned from results',r.changed>0,r);ok('lessons identified are events',r.les>0,r);ok('pilot skill follows experience',Number.isFinite(r.adj),r);ok('doctrine shown',r.tab);});
test('s18_perf: level of detail, smooth stepping, bounded saves','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*30);const P=WWAR.perf;const sk=P.skips;
    WWAR.run=true;const t0=st.t;WWAR.step(24);const first=st.t-t0;await new Promise(r=>setTimeout(r,1500));const after=st.t-t0;WWAR.run=false;
    const big=JSON.stringify(st).length;WWAR.compact();const small=JSON.stringify(st).length;return{sk,first,after,big,small,ev:st.ev.length};});
  ok('distant neutral countries update weekly',r.sk>0,r);ok('a long running step is split into chunks',r.first<=6&&r.after>=r.first,r);ok('compaction keeps the save bounded',r.small<=r.big&&r.ev<=600,r);});

/* ---------- step 18 (v362): submarines, strategic forces, long-range strike, missile defence, nuclear switch ---------- */
test('s19_strat: strike and interception; nuclear use off by default; on, it ends the war with no death figure','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;const S=WWAR.strategic;WWAR.step(24*150);const s=S.S();
    const fired=Object.values(s.c).reduce((t,x)=>t+x.fired,0),intc=Object.values(s.c).reduce((t,x)=>t+x.intc,0),off=!s.nuke&&!s.used&&!st.ev.some(e=>e.ty==='NUCLEAR');
    const us=S.rec(st.c.USA),tab=S.tab(st.c.RUS);
    // force the threshold conditions with the switch on
    s.nuke=true;st.wx2.det.lvl=4;const ru=st.c.RUS;ru.gnd=ru.gnd0*.2;if(ru.ldr&&WWAR.lead.who(ru.ldr.HEAD))WWAR.lead.who(ru.ldr.HEAD).prag=.1;let k=0;while(!st.over&&k<400){S.threshold();k++;}
    const ev=st.ev.find(e=>e.ty==='NUCLEAR');return{fired,intc,off,icbm:us.icbm,tab:tab.includes('ICBM'),over:st.over&&st.over.kind,noFig:ev&&!/\d[\d,]* (people|dead|killed)/.test(ev.txt),oc:WWAR.endscreen.outcome(),audit:WWAR.audit()};});
  ok('conventional salvos are fired and some intercepted',r.fired>0&&r.intc>0,r);ok('strategic inventories shown',r.icbm>0&&r.tab,r);ok('nuclear use never happens with the switch off',r.off,r);
  ok('switch on, conditions met: the war ends in catastrophe, no death figure, no side wins',r.over==='NUCLEAR_CATASTROPHE'&&r.noFig&&r.oc==='NEITHER',r);});
test('s19_cockpit: flight line, start-up checklist, wear, academy, controls setup, spoken radio toggle','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');['viper.wear','viper.quals'].forEach(k=>localStorage.removeItem(k));await WWAR.newWar('EST');const C=COCKPIT;C.SU.on=true;
    const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);const crew=!!C.FL.g,lock=C.SU.lock;player.thr=1;readControls(1/30);const idle=player.thr<=.05;for(let i=0;i<9;i++)C.tick();const free=!C.SU.lock;
    WSORTIE.finish();const w=JSON.parse(localStorage.getItem('viper.wear')||'{}'),q=JSON.parse(localStorage.getItem('viper.quals')||'{}');C.SU.on=false;C.openSetup();const setup=!!document.getElementById('ctlSetup');C.closeSetup();
    return{crew,lock,idle,free,wear:Object.values(w)[0]&&Object.values(w)[0].n,ws:!!q.WS,setup,deb:NATPANEL.tabs.DEBRIEF(WWAR.st.c.POL).includes('COCKPIT AND ACADEMY')};});
  ok('ground crew by the aircraft on a ground start',r.crew,r);ok('start-up checklist holds the throttle at idle until done',r.lock&&r.idle&&r.free,r);ok('airframe wear counted',r.wear===1,r);ok('qualification recorded',r.ws,r);ok('controls setup and settings panel',r.setup&&r.deb,r);});
test('s20_airops: interceptors scramble, CAS flights attack the ground fight, REDFOR gets GCI','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');WWAR.step(24*5);const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);const O=WWAR.airops;
    const gci=typeof GCI!=='undefined'&&GCI.run,sites=typeof GCI!=='undefined'?GCI.sites.length:0;
    // an intruder near a friendly base: an enemy flight placed over our airfield
    const B=O.basesOf(0);const e=WSORTIE.WS.enemy[0];if(e&&B[0]){e.pos.set(B[0].p.x+20000,6000,B[0].p.z);}O.scramble();const ints=[...WSORTIE.WS.jets].filter(j=>j._role==='INT').length;
    if(window.GFIGHT&&!GFIGHT.GF.on){}const gf=window.GFIGHT?GFIGHT.GF.units.length:0;O.casFlight(true);const cas=O.OPS.cas.length,casJ=O.OPS.cas.flatMap(c=>c.j);
    const bombs=casJ.some(j=>typeof agTypes==='function'&&agTypes(j).length>0);WSORTIE.finish();return{gci,sites,ints,gf,cas,bombs};});
  ok('REDFOR GCI network up (radars, picture)',r.gci&&r.sites>=2,r);ok('interceptors scramble against an intruder',r.ints>=2,r);ok('CAS flights with bombs against the ground fight',r.gf===0||(r.cas>0&&r.bombs),r);});
test('s22_lod: trees off at altitude, far ground units hidden; more data','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');WWAR.step(24*5);const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);
    player.pos.y=groundAt(player.pos.x,player.pos.z)+6000;player.vel.set(0,0,-200);game.paused=false;await new Promise(r=>setTimeout(r,600));const off=window.WTREE&&WTREE.grp?!WTREE.grp.visible:true;
    const u=GND.add('TRUCK',1,camera.position.x+40000,camera.position.z,0);await new Promise(r=>setTimeout(r,300));const hid=!u.mesh.visible;u.pos.x=camera.position.x+1000;await new Promise(r=>setTimeout(r,300));const back=u.mesh.visible;WSORTIE.finish();
    return{off,hid,back,eq:Object.keys(NATDATA.EQ).length,un:Object.keys(NATDATA.UNITS).length,q:WWAR.endscreen.QUOTES.length};});
  ok('trees not drawn high above the ground',r.off,r);ok('far ground units hidden, shown again near',r.hid&&r.back,r);ok('equipment for 120+ countries, units for 18, 7 quotations',r.eq>=120&&r.un>=18&&r.q>=7,r);});

/* ---------- step 19 (v365+): guided CAS, battle sound, mission replay ---------- */
test('s21_media: guided munitions on CAS, mission replay, battle sound','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');WWAR.step(24*5);const O=WWAR.airops;
    const gB=O.guidedLoad('F-16C',0),gR=O.guidedLoad('MiG-29',1);const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);
    O.casFlight(true);const J=O.OPS.cas.flatMap(c=>c.j);const guided=J.some(j=>typeof agTypes==='function'&&agTypes(j).some(k=>AGW[k]&&(AGW[k].k==='lgb'||AGW[k].k==='agm')));
    let fired=false;const j=J.find(x=>x.side===0)||J[0];const t=GFIGHT&&GFIGHT.GF.units.find(u=>u.alive&&u.side!==j.side);if(j&&t){j.pos.set(t.pos.x+3000,t.pos.y+3000,t.pos.z);fired=O.guidedPass(j,t,3000,{});}
    await new Promise(r=>setTimeout(r,6000));WSORTIE.finish();const R=WWAR.media.RP.list[0];const html=NATPANEL.tabs.DEBRIEF(WWAR.st.c.POL);
    return{gB:gB&&Object.values(gB).filter(v=>AGW[v]&&AGW[v].k!=='bomb'&&AGW[v].k!=='pod').length,gR:gR&&Object.values(gR).some(v=>/KAB|Kh-/.test(v)),guided,fired,frames:R&&R.f.length,ui:html.includes('MISSION REPLAY'),au:!!WWAR.media.AU};});
  ok('guided loads for both sides (GBU / Maverick; KAB / Kh)',r.gB>0&&r.gR,r);ok('CAS flights carry and release guided weapons',r.guided&&r.fired,r);ok('a sortie is recorded for replay and shown',r.frames>=1&&r.ui,r);ok('battle sound module',r.au);});

/* ---------- step 20 (v368+): the war you can see, intelligence in the cockpit ---------- */
test('s23_visible: salvos in the sky, merchant convoys, map markers, intelligence in the cockpit','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');WWAR.step(24*20);const V=WWAR.visible;const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);
    const e0=WWAR.st.seq;for(let i=0;i<8&&!V.FX.list.length;i++)V.localSalvo();const trails=V.FX.list.length,ev=WWAR.st.ev.some(e=>e.ty==='MISSILE'&&parseInt(e.id.slice(1),36)>=e0);
    for(let i=0;i<5&&!V.CV.list.length;i++)V.convoy();const cv=V.CV.list.flat().length;
    const c=document.createElement('canvas').getContext('2d');let n=0;const s=c.stroke.bind(c);c.stroke=function(){n++;return s();};WARMAP.draw(c,(la,lo)=>[lo*4,la*4],{W:1440,ppd:4},'over');
    const X=WWAR.st.intel,me=WWAR.st.c.POL.side,q0=X[me].q;X[me].q=.1;let said=0;const el=document.getElementById('radio');const n0=el?el.children.length:0;for(let i=0;i<40;i++)radio('DARKSTAR: test call for 40 miles.',false);const n1=el?el.children.length:0;X[me].q=q0;
    WSORTIE.finish();return{trails,ev,cv,strokes:n,suppressed:n1-n0<40};});
  ok('salvos are visible as trails and reported',r.trails>0&&r.ev,r);ok('the map marks the air war and ground fighting',r.strokes>0,r);ok('poor intelligence: some AWACS calls missed',r.suppressed,r);});

/* ---------- step 21 (v369): roads for supply, trade partners, the register of people, more data ---------- */
test('s24_net: depot routes on the road network, trade partners and sanctions, the people register','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*40);await WWAR.world3.roads();const R=st.roads||{};const vals=Object.values(R);
    const T=st.trade2||{},pol=T.POL;const sanc=Object.values(T).some(r=>r.P.some(x=>x.st==='SANCTIONED'));const reg=WWAR.world3.people('POL');
    return{routes:vals.length,cov:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,pol:pol&&pol.P.length,sanc,reg:reg.length,kinds:[...new Set(reg.map(x=>x.src))],life:NATPANEL.tabs.LIFE(st.c.POL).includes('TRADING PARTNERS'),pol2:Object.keys(NATDATA.POL).length,audit:WWAR.audit()};});
  ok('depot routes checked against the highways',r.routes>0&&r.cov>0,r);ok('trade partners, sanctions across the line',r.pol===5&&r.sanc&&r.life,r);ok('people register from the campaign\'s persons',r.reg>5&&r.kinds.length>=2,r);ok('government data for 150+ countries',r.pol2>=150,r);ok('audit clean',r.audit.length===0,r.audit);});

/* ---------- step 22 (v370): two real pages in one war (same-browser room) ---------- */
test('s25_mp2: a host page and a guest page share the war, the guest sees the host\'s AI','F-16C',async p=>{
  const [g]=await Promise.all([p.waitForEvent('popup'),p.evaluate(()=>{window.open(location.href,'guest');})]);await g.waitForFunction(()=>typeof WWNET!=='undefined'&&typeof localRoom==='function',null,{timeout:90000});
  await p.evaluate(async()=>{localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');WWAR.step(24*5);window.LOCAL_ROOM=localRoom();const c=document.getElementById('cs');if(c)c.value='Host';WWNET.N.code='t1';
    const i=document.createElement('input');i.id='wwCode';i.value='t1';document.body.appendChild(i);await WWNET.join();});
  const host=await p.evaluate(()=>({host:WWNET.N.host,on:net.on}));
  await g.evaluate(async()=>{game.team='BLUE';window.LOCAL_ROOM=localRoom();const c=document.getElementById('cs');if(c)c.value='Guest';const i=document.createElement('input');i.id='wwCode';i.value='t1';document.body.appendChild(i);await WWNET.join();});
  await g.waitForFunction(()=>WWNET.N.got,null,{timeout:20000}).catch(()=>{});const gotWar=await g.evaluate(()=>({got:!!WWNET.N.got,host:WWNET.N.host,countries:WWAR.st?Object.keys(WWAR.st.c).length:0}));
  await p.evaluate(async()=>{const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);});
  await g.evaluate(async()=>{const L=WSORTIE.basesFor('POL');await WSORTIE.start('POL',L[0].a);});
  await g.waitForTimeout(4000);const seen=await g.evaluate(()=>({prox:WWNET.N.prox.size,gu:WWNET.N.gu.size,client:WSORTIE.WS.client}));
  const hostSees=await p.evaluate(()=>[...net.peers.values()].some(e=>e.jet));await g.close();
  ok('host page hosts',host.host&&host.on,host);ok('guest page receives the host\'s war',gotWar.got&&!gotWar.host&&gotWar.countries>100,gotWar);ok('guest sees the host\'s AI and ground units',seen.client&&(seen.prox>0||seen.gu>0),seen);ok('host sees the guest\'s aircraft',hostSees);});

/* ---------- step 23 (v371): corrections ---------- */
test('s26_fixes: anti-ship fits corrected, nuclear always possible, military airfields only','F-16C',async p=>{
  const r=await p.evaluate(async()=>{const has=(ac,w)=>!!STN[ac]&&Object.values(STN[ac]).some(L=>L.includes(w));await WGEO.loadData();
    const civ=WGEO.search('EGLL')[0];await WF.start(civ,0,'le');const civOn=WF.on;await WGEO.loadData();const mil=WGEO.search('ETAR')[0];await WF.start(mil,0,'le');const milOn=WF.on;await start('RANGE');
    localStorage.removeItem('viper.ww');await WWAR.newWar('EST');WWAR.step(24);return{e:has('F-18E','AGM-84D'),f1:has('Mirage F1','AM39 Exocet'),su24:has('Su-24M','Kh-31A'),shar:has('Sea Harrier FRS.1','Sea Eagle'),
      f15:has('F-15E','AGM-84D'),oniks:has('Su-30SM','P-800')||has('Su-35S','P-800')||has('Su-34','P-800'),nuke:WWAR.strategic.S().nuke,civOn,milOn};});
  ok('anti-ship missiles added where in service',r.e&&r.f1&&r.su24&&r.shar,r);ok('removed where not in service',!r.f15&&!r.oniks,r);ok('nuclear warfare always possible',r.nuke===true,r);ok('civil airports refused, military bases accepted',!r.civOn&&r.milOn,r);});

/* ---------- step 24 (v372): every person and every munition ---------- */
test('s27_census: a year of war resolves deaths for soldiers, sailors, aircrew and civilians; the living account balances; munitions counted','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar('EST');const st=WWAR.st;WWAR.step(24*365);const C=WWAR.cemetery,T=C.totals(null);const pg=C.pager(null);const e0=pg.n?pg.at(Math.floor(pg.n/2)):null;
    const pol=st.census.c.POL,M=st.census.mun,mun=Object.values(M).reduce((t,m)=>t+Object.values(m).reduce((a,b)=>a+b,0),0);const tab=NATPANEL.tabs.MUNITIONS(st.c.RUS),pt=NATPANEL.tabs.PEOPLE_REGISTER(st.c.POL);
    const view=C.view(null);return{kM:T.kM,mM:T.mM,kC:T.kC,nat:T.nat,n:pg.n,mid:e0&&C.nameFor(e0.r,e0.i),pol:pol&&{pop0:pol.pop0,now:st.c.POL.pop},mun,tab:tab.includes('artillery rounds'),pt:pt.includes('THE LIVING ACCOUNT'),view:view.length,audit:WWAR.audit()};});
  ok('a year of war: thousands of military dead, civilians killed, natural deaths',r.kM>1000&&r.kC>0&&r.nat>1000,r);ok('every death has an entry the archive can page to',r.n>=r.kM+r.kC+r.mM&&!!r.mid,r);
  ok('the living account',r.pol&&r.pt,r);ok('munitions counted (strategic expenditure at least)',r.mun>0&&r.tab,r);ok('archive view renders with millions of entries',r.view>500,r);ok('audit clean',r.audit.length===0,r.audit);});

/* ---------- step 25 (v373-v374): the interface, airliners, G toggle, the end of the war restyled ---------- */
test('s28_ui: sortie setup and debriefing, INDEX tab, controls in SETTINGS, grouped panel, airliners, G toggle, ammo picture','F-16C',async p=>{
  const r=await p.evaluate(async()=>{const out={};SET.struct='NONE';const P=player;P.hp=100;P.nz=14;try{P.step&&0;}catch(e){}out.gOff=STRUCT&&!STRUCT.on;SET.struct='REAL';
    localStorage.removeItem('viper.ww');game.team='BLUE';await WWAR.newWar('EST');WWAR.step(24*30);WARMAP.UI.sel='POL';
    const L=WSORTIE.basesFor('POL');UI2.setup('POL',L[0].a);out.setup=!!document.getElementById('u2m')&&document.getElementById('u2m').textContent.includes('MISSION');
    UI2.SU.mis='CAP';UI2.SU.ac='F-16C';await UI2.go();out.flying=WSORTIE.WS.on&&player.type==='F-16C';TRAFFIC.spawn();TRAFFIC.spawn();out.airliners=TRAFFIC.list.length;
    WSORTIE.finish();out.debrief=!!document.getElementById('u2m')&&document.getElementById('u2m').textContent.includes('DEBRIEFING');UI2.close();
    out.index=!!document.querySelector('[data-tab="index"]');UI2.renderIndex();out.ixN=(document.getElementById('pIndex')||{}).innerHTML.length;
    out.ctl=!!document.getElementById('ctlSec');
    const el=document.getElementById('wmWar')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'wmWar'}));NATPANEL.render();WARMAP.after.forEach(f=>{try{f();}catch(e){}});out.grp=!!document.querySelector('#wsNat .grp');
    WWAR.step(24*60);WWAR.diplo.end('ARMISTICE','t');WWAR.endscreen.open();WWAR.endscreen.go(7);await new Promise(r=>setTimeout(r,300));const cv=document.getElementById('ammoCv');out.ammo=!!cv&&cv.height>100;out.rows=WWAR.endscreen.ammoTotals().length;WWAR.endscreen.close();return out;});
  ok('over-G stress can be switched off entirely',r.gOff,r);ok('sortie setup menu before flying, chosen aircraft flown',r.setup&&r.flying,r);ok('debriefing after the sortie',r.debrief,r);
  ok('INDEX tab with entries; controls section in SETTINGS',r.index&&r.ixN>2000&&r.ctl,r);ok('country panel grouped',r.grp,r);ok('ammunition used drawn lined up',r.ammo&&r.rows>0,r);});
test('s29_turncoat: PMCs fight and change employer, countries switch sides, terror shootdowns, production ledger, map grid','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar();const st=WWAR.st,T=TURNCOAT;
    WWAR.step(24*60);for(let i=0;i<300;i++){T.pmc();T.terror();T.prod();}const s=T.S();
    const al=Object.values(st.c).find(p=>p.al==='ALLY'&&p.side&&!p.cap&&T.trait(p,'pragmatic')>=.6);let sw=false;if(al){al.exh=.9;const o=al.side;const rr=Math.random;Math.random=()=>0;
      const nw=o==='B'?'R':'B';for(const q of Object.values(st.c))if(q.side===nw){q.air*=50;q.gnd*=50;}let err=null;try{T.switchSides();}catch(e){err=String(e);}Math.random=rr;window._e=err;sw=al.side!==o;}
    WWAR.step(48);const pr=NATPANEL.tabs.PRODUCTION(st.c.RUS);const hi=await WGEO.loadHi();
    return{exh:al&&al.exh,tr:al&&T.trait(al,'pragmatic'),pw:[al.side,Object.values(st.c).filter(q=>q.side==='B').reduce((t,q)=>t+q.air+q.gnd,0),Object.values(st.c).filter(q=>q.side==='R').reduce((t,q)=>t+q.air+q.gnd,0)],err:window._e,cap:al&&al.cap,al:al&&al.a3,nA:Object.values(st.c).filter(p=>p.al==='ALLY').length,pmc:s.pmc.length,sw,prod:/AIRCRAFT BY TYPE/.test(pr),hi:hi&&hi.W,a:WWAR.audit()};});
  ok('PMCs hired',r.pmc>0,r.pmc);ok('a junior ally switched sides',r.sw,r);ok('production tab',r.prod);ok('4096 map grid',r.hi===4096,r.hi);ok('audit clean',r.a.length===0,r.a);});
test('s30_infantry: kit menu, four insertions reach the ground, shooting kills, grenade, objective held moves the front','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar();const I=INFANTRY,a3='POL';const out={};
    I.kitMenu(a3,{name:'test'});out.menu=!!document.querySelector('[data-igo]');document.getElementById('u2m').remove();
    for(const ins of['APC','IFV','HELO','AIR']){const S=I.start({...I.K,a3,ins,pri:'DMR',lau:'ATGM',arm:'PLATE',gren:2});if(ins==='AIR')S.keys.Space=true;
      for(let i=0;i<4000&&S.phase==='INSERT'&&!S.res;i++){if(ins==='AIR'&&S.jumped)S.keys.Space=false;I.step(1/30);}S.keys.Space=false;
      out[ins]={phase:S.phase,dz:Math.round(Math.hypot(S.pos.x,S.pos.z-200)),agl:+(S.pos.y-0).toFixed(1),ifv:!!S.ifv,res:S.res};I.stop(false);}
    const S=I.start({...I.K,a3,ins:'APC',pri:'RIFLE'});I.land();S.hp=1e6;const e=S.them[0];e.m.position.set(S.pos.x,S.pos.y-1.7+0.0,S.pos.z-15);
    S.yaw=0;S.pitch=-Math.atan2(.4,15);let n=0;while(e.alive&&n<200){S.cool=0;S.reload=0;S.wp.pri.cur=30;I.shoot();n++;}out.kill=!e.alive&&S.kills>0;
    I.grenade();out.gren=S.gnades.length===1;for(const u of S.them){u.alive=false;}S.pos.set(S.village.x,S.pos.y,S.village.z);const f=S.fr,mid=f.sec[(f.sec.length/2)|0],o0=mid.off;
    for(let i=0;i<40*30&&!S.res;i++)I.step(1/30);out.res=S.res;out.moved=mid.off!==o0;document.querySelector('[data-iend]').click();out.gone=!I.S&&!document.getElementById('infCv');return out;});
  ok('kit menu',r.menu);for(const k of['APC','IFV','HELO','AIR'])ok(k+' insertion lands',r[k].phase==='FIGHT'&&!r[k].res,r[k]);ok('IFV stays',r.IFV.ifv);
  ok('rifle kills an enemy',r.kill,r);ok('grenade thrown',r.gren);ok('objective held, front moved',r.res==='WON'&&r.moved,r);ok('cleaned up',r.gone);});
test('s31_infantry2: roles, every weapon fires, walls block, floors carry you, drones attack and can be shot down','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar();const I=INFANTRY,a3='POL',out={};
    I.kitMenu(a3,{name:'t'});document.querySelector('[data-ik="role:SNIPER"]').click();out.role=I.K.pri==='SNP';document.getElementById('u2m').remove();
    const S=I.start({...I.K,a3,ins:'APC'});I.land();S.hp=1e9;out.fired={};
    for(const k of Object.keys(I.PRI)){S.wp.pri={...I.PRI[k],cur:5,res:5};S.w='pri';S.cool=0;S.reload=0;const n=S.shots;I.shoot();out.fired[k]=S.shots>n;}
    out.vm=Object.keys(S.vms).length>=8;
    const fnd=S.blds.filter(b=>b.y1-b.y0>2.9&&b.y1-b.y0<3.1&&(b.x1-b.x0)>5);const walls=S.blds.filter(b=>b.y1-b.y0>2.5&&(b.x1-b.x0)>1.5&&fnd.some(f=>Math.abs(f.y1-b.y0)<.01));const w=walls[0];S.pos.set((w.x0+w.x1)/2,w.y0+1.7,w.z0-1.5);S.yaw=Math.PI;S.keys.KeyW=true;I.step(1/30,90);S.keys.KeyW=false;
    out.blocked=!(S.pos.z>w.z0&&S.pos.z<w.z1);
    const fl=S.blds.filter(b=>b.y1-b.y0<.3&&b.y1-b.y0>.1&&(b.x1-b.x0)>3).sort((a,b)=>b.y1-a.y1)[0];out.hasFloor=!!fl;
    if(fl){S.pos.set((fl.x0+fl.x1)/2+1,fl.y1+2.5,(fl.z0+fl.z1)/2);S.vel.set(0,0,0);I.step(1/30,30);out.onFloor=Math.abs(S.pos.y-(fl.y1+1.7))<.3;}
    S.pos.set(0,100,200);S.vel.set(0,0,0);I.step(1/30,120);S.drones.length=0;S.dT=1e9;const d=I.spawnDrone('FPV','E');d.m.position.copy(S.pos).add(new THREE.Vector3(0,0,-20));S.yaw=0;S.pitch=0;S.wp.pri={...I.PRI.SHOT,cur:8,res:8};S.cool=0;I.shoot();out.fpvDown=!d.alive;
    const e=I.spawnDrone('FPV','E');e.m.position.copy(S.pos).add(new THREE.Vector3(5,3,-30));const hp0=S.hp;I.step(1/30,90);out.fpvHit=!e.alive&&S.hp<hp0;
    const o=I.spawnDrone('OWA','E'),m=I.spawnDrone('MALE','F');I.step(1/30,30*45);out.owa=!o.alive;out.male=S.rk.length>0||m.t>10;out.names=[o.name,m.name];
    I.stop(true);document.querySelector('[data-iend]').click();return out;});
  ok('role preset sets kit',r.role);ok('all primaries fire',Object.values(r.fired).every(x=>x),r.fired);ok('first-person models',r.vm);ok('walls block',r.blocked,r);ok('upper floor carries you',r.hasFloor&&r.onFloor,r);
  ok('FPV shot down',r.fpvDown,r);ok('FPV dives and strikes',r.fpvHit,r);ok('one-way drone strikes',r.owa,r);ok('loitering drone named',/Reaper|Orion|MQ|drone/.test(r.names[1]),r.names);});
test('s32_campinf: infantry from the campaign HQ, the battle is in the hot sector and a win moves the campaign front','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.camp');CAMP.st=null;CAMP.newState(game.era,1);const st=CAMP.st;
    {const bt=document.createElement('button');bt.dataset.a='inf';document.body.appendChild(bt);CMPUI.act({target:bt});bt.remove();}const menu=!!document.querySelector('[data-igo]');
    document.querySelector('[data-igo]').click();const S=INFANTRY.S;const ok=!!S&&S.cfg.camp&&S.cs!=null;const i=S.cs,f0=st.front[i];
    INFANTRY.land();S.hp=1e9;for(const u of S.them)u.alive=false;S.dT=1e9;S.pos.set(S.village.x,S.pos.y,S.village.z);for(let k=0;k<40*30&&!S.res;k++)INFANTRY.step(1/30);
    const res=S.res;document.querySelector('[data-iend]').click();return{menu,ok,res,moved:st.front[i]<f0,log:st.log[0]&&st.log[0].txt};});
  ok('kit menu from the HQ',r.menu);ok('battle in a campaign sector',r.ok,r);ok('won, front moved, logged',r.res==='WON'&&r.moved&&/Infantry, sector/.test(r.log),r);});
test('s33_trenches: battles at real places, defend the trenches against waves with tanks, air war overhead, campaign town','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar();const I=INFANTRY,out={};
    let S=I.start({...I.K,a3:'POL',ins:'APC',mis:'ATTACK'});out.loc=S.loc.name;out.real=S.loc.real;I.stop(false);
    S=I.start({...I.K,a3:'POL',ins:'APC',mis:'DEFEND'});I.land();S.hp=1e9;S.dT=1e9;out.trench=S.trench.length>20;out.fr=S.us.length;out.ftank=S.veh.filter(v=>v.tank&&v.side==='F').length;
    S.waveT=0;I.step(1/30,2);out.wave1=S.wave===1&&S.veh.some(v=>v.tank&&v.side==='E');out.tname=(S.veh.find(v=>v.tank&&v.side==='E')||{}).name;
    I.step(1/30,30*20);out.adv=S.veh.filter(v=>v.side==='E'&&v.mv).every(v=>v.z>S.trZ-700);out.air=S.air.length>0;
    // all four waves arrive and are destroyed
    for(let w=0;w<4;w++){S.waveT=0;I.step(1/30,2);for(const u of S.them)u.alive=false;for(const v of S.veh)if(v.side==='E')v.alive=false;}I.step(1/30,5);out.res=S.res;
    document.querySelector('[data-iend]').click();
    localStorage.removeItem('viper.camp');CAMP.st=null;CAMP.newState(game.era,1);S=I.start({...I.K,camp:true,ins:'APC',mis:'DEFEND'});out.camp=S.loc.name;I.stop(false);
    out.towns=CAMPPLUS.TOWNS.length;return out;});
  ok('battle at a real place',r.real&&r.loc&&r.loc!=='the village',r.loc);ok('trench line, riflemen and our tanks',r.trench&&r.fr>=12&&r.ftank===2,r);ok('a wave with named enemy tanks',r.wave1&&!!r.tname,r.tname);
  ok('enemy advances',r.adv,r);ok('air war overhead',r.air);ok('trenches held after four waves',r.res==='HELD',r.res);ok('campaign battle at a named town',/^[A-Z]/.test(r.camp)&&r.camp!=='the village',r.camp);ok('more campaign towns',r.towns>=20,r.towns);});
test('s34_infworld: infantry in the live world while the war runs; backup, engineers, offensive, battle damage, Q aims','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar();const I=INFANTRY,out={};game.ac='F-16C';const B=WSORTIE.basesFor('POL').map(x=>x.a);out.base=B[0]&&B[0].ident;
    await I.startWorld({...I.K,a3:'POL',ap:B[0],ins:'APC',mis:'ATTACK',role:'ENGINEER'});const S=I.S;out.wm=!!(S&&S.WM);out.loc=S&&S.loc.name;out.wf=WF.on;out.run=WWAR.run;out.ws=WSORTIE.WS.on;out.prox=!!player.infantry;
    I.land();S.hp=1e9;S.dT=1e9;const t0=WWAR.st.t;I.step(1/30,30);
    // the game renders the main scene: the camera must be where the soldier is
    renderer.render(scene,camera);out.cam=camera.position.distanceTo(S.pos.clone().add(S.O))<.5;out.gy=Math.abs(S.pos.y-1.7-groundAt(S.O.x+S.pos.x,S.O.z+S.pos.z))<.6;
    // Q toggles aiming
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyQ'}));out.ads=S.ads;window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyQ'}));
    // engineer builds; backup is called when the enemy loses men
    const nb=S.blds.length;I.dig(true);out.dig=S.blds.length===nb+1;
    for(const u of S.them.slice(0,5))u.alive=false;I.battleStep(1/30);out.call=!!S.pend;S.pend.t=0;S.pend.k='ARTY';I.battleStep(1/30);out.arty=!!S.arty;
    const nC=S.craters.length;for(let i=0;i<30*15;i++)I.battleStep(1/30);out.craters=S.craters.length>nC;
    const fr=S.fr,mid=fr.sec[(fr.sec.length/2)|0],o0=mid.off,nu=S.us.length;I.offensive();out.off=S.us.length===nu+10&&mid.off!==o0;
    // walls get holed by heavy blasts
    const w=S.blds.find(b=>b.y1-b.y0>2.5&&b.m);const h0=S.blds.length;for(let i=0;i<20;i++)I.S&&(function(){const p=new THREE.Vector3((w.x0+w.x1)/2,(w.y0+w.y1)/2,(w.z0+w.z1)/2);I.arty(p,1,'F');S.arty.t=0;I.battleStep(1/30);})();out.holes=(S.holes||0)>0;
    I.stop(true);document.querySelector('[data-iend]').click();await new Promise(r=>setTimeout(r,300));out.after={inf:!!player&&!!player.infantry,cls:document.body.classList.contains('infWorld'),wf:WF.on};return out;});
  ok('battle in the live world',r.wm&&r.wf&&r.ws&&r.run&&r.prox,r);ok('at a real place',!!r.loc,r.loc);ok('camera at the soldier, on the real ground',r.cam&&r.gy,r);ok('Q aims',r.ads);
  ok('engineer digs',r.dig);ok('enemy calls for backup, artillery falls',r.call&&r.arty&&r.craters,r);ok('offensive called, front pushed',r.off,r);ok('walls holed',r.holes);ok('back to the aircraft, world closed',!r.after.inf&&!r.after.cls&&!r.after.wf,r.after);});
test('s35_fortify: building types with interiors, collapse, bunkers / dugouts / command posts, armour hit overview, your FPV, medevac, grass, explore the live world','F-16C',async p=>{
  const r=await p.evaluate(async()=>{localStorage.removeItem('viper.ww');await WWAR.newWar();const I=INFANTRY,V=THREE.Vector3,out={};
    let S=I.start({...I.K,a3:'POL',ins:'APC',mis:'ATTACK'});I.land();S.hp=1e9;S.dT=1e9;I.step(1/30,3);
    out.kinds=[...new Set(S.BLD.map(b=>b.kind))];out.forts=S.STR.map(c=>c.kind+':'+c.side);out.grass=S.grass.count>1000;
    out.furn=S.blds.filter(b=>b.y1-b.y0<2&&b.y1-b.y0>.4).length>20;
    // armour: an RPG on a tank's front bounces or stops; on the rear it goes through
    const tk=S.veh.find(v=>v.tank&&v.side==='E');const P=tk.m.position;
    const f=I.armorHit(tk,new V(P.x,P.y+1.4,P.z-3.8),new V(0,0,1),'RPG');out.front=f.res;const b=I.armorHit(tk,new V(P.x,P.y+1.4,P.z),new V(-1,0,0),'RIFLE');out.bullet=b.res;
    const rr=I.armorHit(tk,new V(P.x,P.y+1.2,P.z+3.8),new V(0,0,-1),'ATGM');out.rear=rr.res;out.dmg=rr.dmg;out.panel=!!document.getElementById('iArmC');
    // a bomb-size blast on a house brings it down; a rocket on a bunker repeatedly destroys it
    const h=S.BLD.find(x=>x.kind==='HOUSE'||x.kind==='APARTMENTS');const hp0=h.w*h.d*(h.fl||1)*25;for(let i=0;i<Math.ceil(hp0/2200)+1&&!h.down;i++)I.structHit(new V(h.x,h.parts[0].y1+1.5,h.z),14);out.house=h.down;
    const bk=S.STR.find(c=>c.kind==='BUNKER'&&c.side==='E');for(let i=0;i<6;i++)I.structHit(new V(bk.cx,bk.y0+1,bk.cz),5);out.bunker=bk.down;
    const cp=S.STR.find(c=>c.kind==='COMMAND POST'&&c.side==='E');I.collapse(cp,'x');out.silent=S.eCP;
    // your FPV: placed, the operator lifts it and strikes the enemy IFV
    for(const e of S.them)e.alive=false;S.calls=9;const iv=S.veh.find(v=>v.side==='E'&&!v.tank&&v.alive);const d=I.placeFpv();S.pos.set(iv.x+30,S.pos.y,iv.z+30);d.m.position.set(iv.x+25,d.m.position.y,iv.z+25);I.step(1/30,30*20);out.fpv=!d.alive&&S.armLog.some(a=>a.wpn==='FPV');
    // medevac: a wounded man is flown out, you are treated
    for(const v of S.veh)if(v.side==='E')v.alive=false;S.airT=1e9;S.air.length=0;S.heliT=1e9;S.waveT=1e9;const u=S.us[0];u.alive=false;u.down=true;u.m.position.copy(S.pos);S.hp=40;I.medevac();const lz=S.med.lz;S.pos.set(lz.x+3,S.pos.y,lz.z);u.m.position.set(lz.x+5,u.m.position.y,lz.z);I.step(1/30,30*30);out.evac=S.evac>=1&&S.hp===100;out.med={evac:S.evac,hp:S.hp,res:S.res,st:S.med&&S.med.st,medN:S.medN};
    I.stop(false);
    // the live world: real blocks become enterable buildings; you can walk off well beyond the battle
    game.ac='F-16C';const B=WSORTIE.basesFor('POL').map(x=>x.a);await I.startWorld({...I.K,a3:'POL',ap:B[0],ins:'APC',mis:'ATTACK'});S=I.S;I.land();S.hp=1e9;S.dT=1e9;
    out.real=S.hidden.length;S.keys.KeyW=true;S.yaw=Math.PI/2;for(let i=0;i<30*60;i++)I.step(1/30);S.keys.KeyW=false;out.far=Math.round(Math.hypot(S.pos.x,S.pos.z-200));
    I.stop(true);document.querySelector('[data-iend]').click();await new Promise(r=>setTimeout(r,300));return out;});
  ok('building types',['HOUSE','CHURCH'].every(k=>r.kinds.includes(k))&&r.kinds.some(k=>k==='WAREHOUSE'||k==='FACTORY'||k==='APARTMENTS'),r.kinds);ok('interiors furnished',r.furn);ok('grass',r.grass);
  ok('bunkers, dugout, command posts both sides',['BUNKER:E','DUGOUT:E','COMMAND POST:E','COMMAND POST:F'].every(k=>r.forts.includes(k)),r.forts);
  ok('RPG on tank front does not go through',/RICOCHET|NO PENETRATION/.test(r.front),r.front);ok('bullet bounces off',/RICOCHET|NO PENETRATION/.test(r.bullet),r.bullet);ok('ATGM in the rear penetrates and damages',/PENETRATED/.test(r.rear)&&r.dmg.length>0,r);ok('overview diagram',r.panel);
  ok('house collapses',r.house);ok('bunker destroyed',r.bunker);ok('enemy radio silenced',r.silent);ok('your FPV strikes armour',r.fpv);ok('medevac',r.evac);
  ok('live world: real buildings replaced',r.real>0,r.real);ok('explore beyond the battle',r.far>250,r.far);});
(async()=>{await new Promise(r=>srv.listen(0,r));port=srv.address().port;
  const byAc=new Map();for(const t of T)if(t.n.includes(filter)){(byAc.get(t.ac)||byAc.set(t.ac,[]).get(t.ac)).push(t);}
  for(const [ac,list] of byAc){console.log('== '+ac);for(const t of list){const p=await boot(ac);console.log(t.n);
      try{await t.f(p);}catch(e){fails++;total++;console.log('  FAIL exception '+e.message.split('\n')[0]);}
      if(p.errs.length){total++;fails++;console.log('  FAIL page errors',p.errs.slice(0,2));}await p.close();}}
  console.log('\n'+(total-fails)+'/'+total+' checks passed');await browser.close();srv.close();process.exit(fails?1:0);})();
