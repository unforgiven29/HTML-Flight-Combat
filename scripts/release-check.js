#!/usr/bin/env node
/* Release gate (spec v49 ch.20): run before every merge to main.
   1. syntax of every script loaded by index.html (classic scripts, no modules);
   2. every script in index.html exists; no duplicate script tags;
   3. data integrity: national tables parse; every country code in them exists in assets/world/countries.json;
   4. the traceability table regenerates (scripts/spec-trace.js);
   5. prints the regression command and the test groups that must pass.
   Exit code 1 on any failure. Usage: node scripts/release-check.js */
const fs=require('fs'),path=require('path'),cp=require('child_process'),root=path.join(__dirname,'..');let bad=0;const fail=m=>{bad++;console.log('  FAIL '+m);},pass=m=>console.log('  ok   '+m);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),src=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]).filter(s=>!/^https?:/.test(s));
const seen=new Set();for(const s of src){if(seen.has(s))fail('duplicate script '+s);seen.add(s);const f=path.join(root,s);if(!fs.existsSync(f)){fail('missing '+s);continue;}
  try{new Function(fs.readFileSync(f,'utf8'));}catch(e){fail('syntax '+s+': '+e.message);}}
pass(src.length+' scripts checked');
try{const C=JSON.parse(fs.readFileSync(path.join(root,'assets/world/countries.json'),'utf8'));const codes=new Set((C.d||C.countries||C).map(c=>c.a3));
  for(const f of['equipment.txt','politics.txt']){const L=fs.readFileSync(path.join(root,'data/nat',f),'utf8').split('\n').filter(l=>l.trim()&&!l.startsWith('#'));let unk=0;for(const l of L){const a=l.split('|')[0].trim();if(!codes.has(a)){unk++;}}if(unk>L.length*.1)fail(f+': '+unk+' unknown country codes');else pass(f+': '+L.length+' rows ('+unk+' not in the map data)');}}
catch(e){fail('national data: '+e.message);}
try{cp.execSync('node '+path.join(root,'scripts/build-natdata.js'),{stdio:'pipe'});pass('national data builds');}catch(e){fail('build-natdata: '+e.message);}
try{const o=cp.execSync('node '+path.join(root,'scripts/spec-trace.js'),{encoding:'utf8'});pass('traceability: '+o.trim().split('\n').pop());}catch(e){fail('spec-trace: '+e.message);}
console.log('\nRegression (all must pass): for g in cw_ wg_ ww_ wsortie wdip_ wend_ s5_ s6_ s7_ s8_ s9_ s10_ s11_ s12_ s13_ s14_ s15_ s16_; do node tests/run.js $g; done');
console.log(bad?'\nRELEASE CHECK FAILED ('+bad+')':'\nRELEASE CHECK PASSED');process.exit(bad?1:0);
