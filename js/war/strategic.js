/* =====================================================================================================================
   v362 — submarines, strategic forces, long-range conventional strike and missile defence (spec v49 ch.05 strategic
   weapons, missile forces, warning and defence; strategic weapons governance; ch.06 naval warfare and submarines).
   Abstract and gameplay-level. Numbers are public, rounded orders of magnitude (labelled). No technical detail.
   * STRATEGIC FORCES per nuclear-armed country (scenario list): land-based ICBMs, submarine-launched missiles on
     ballistic-missile submarines (SSBNs) on patrol, and bombers that can carry nuclear bombs. They exist as deterrent
     inventories with readiness (world2.js deterrence level).
   * CONVENTIONAL LONG-RANGE STRIKE: countries at war fire conventional (non-nuclear) ballistic, hypersonic and cruise
     missiles at the other side's airbases, depots and command posts, from a stock that industry replenishes slowly.
     A salvo against a country meets its MISSILE DEFENCE: interceptors (GMD, SM-3, THAAD, Patriot, Arrow, David's Sling,
     S-400 / S-500, A-235 and others, by country) with a stock and a success chance; missiles that get through damage
     airbases (military.js) or depots (deep.js). Events report salvos, intercepts and damage — not casualty figures.
   * SUBMARINES: attack submarines on patrol per sea (naval.js / sea2.js), and in your world sorties near the sea an
     enemy submarine may be found surfaced or at periscope depth — a target for anti-ship weapons and guns; losing it
     costs its country a submarine.
   * NUCLEAR USE is a SCENARIO SWITCH, OFF by default (WORLD tab). Off: strategic weapons are never used. On: a
     nuclear-armed country facing the collapse of its forces or the loss of its capital, with its deterrence at the
     highest level and leaders who are not pragmatic, may cross the threshold. The game then shows it as one abstract
     catastrophe: the war ends at once in a NUCLEAR CATASTROPHE ending; no number of dead is given (it cannot be
     known); the world economy, the environment and every country's public are struck; the epilogue says what it is.
     No targeting, yields or effects are described.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,G=WGEO,rn=Math.random;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
// strategic inventories (public, rounded orders of magnitude): ICBM launchers, SSBNs, nuclear-capable bombers
const STRAT={USA:{icbm:400,icbmN:'LGM-30G Minuteman III',ssbn:14,slbm:'Trident II D5',bmr:66,bmrN:'B-52H, B-2A',bomb:'B61, B83'},RUS:{icbm:320,icbmN:'RS-24 Yars, Sarmat (entering)',ssbn:11,slbm:'Bulava, Sineva',bmr:60,bmrN:'Tu-95MS, Tu-160',bomb:'gravity bombs'},
  CHN:{icbm:350,icbmN:'DF-41, DF-31AG, DF-5',ssbn:6,slbm:'JL-3',bmr:20,bmrN:'H-6N',bomb:'gravity bombs'},GBR:{icbm:0,ssbn:4,slbm:'Trident II D5',bmr:0},FRA:{icbm:0,ssbn:4,slbm:'M51',bmr:40,bmrN:'Rafale B (ASMPA)',bomb:'air-launched missile'},
  IND:{icbm:10,icbmN:'Agni-V',ssbn:2,slbm:'K-4',bmr:30,bmrN:'Mirage 2000, Jaguar',bomb:'gravity bombs'},PAK:{icbm:0,icbmN:'Shaheen-III (medium range)',ssbn:0,bmr:20,bmrN:'F-16, Mirage',bomb:'gravity bombs'},PRK:{icbm:10,icbmN:'Hwasong-17, Hwasong-18',ssbn:0,bmr:0},ISR:{icbm:0,icbmN:'Jericho (undeclared)',ssbn:0,bmr:0}};
// conventional long-range strike missiles and missile defence (names public; stocks are game estimates)
const CONV={USA:'Tomahawk, JASSM-ER, PrSM, Dark Eagle (entering)',RUS:'Iskander-M, Kalibr, Kh-101, Kinzhal, Zircon',CHN:'DF-15, DF-16, DF-17, DF-21D, DF-26',IRN:'Fateh-110, Shahab-3, Kheibar Shekan',PRK:'KN-23, KN-24',IND:'BrahMos, Prithvi, Agni-I',PAK:'Fatah, Babur',ISR:'LORA',TUR:'Tayfun',KOR:'Hyunmoo-2, Hyunmoo-4',FRA:'SCALP, MdCN',GBR:'Storm Shadow, Tomahawk',UKR:'Neptune, ATACMS (supplied)',SAU:'DF-21 (reported)',TWN:'Hsiung Feng IIE'};
const ABM={USA:'GMD, SM-3, THAAD, Patriot PAC-3',RUS:'A-235, S-500, S-400',CHN:'HQ-19, HQ-9',ISR:'Arrow 2/3, David\'s Sling, Iron Dome',JPN:'SM-3 (Aegis), Patriot PAC-3',KOR:'Patriot PAC-3, L-SAM (entering), KM-SAM',IND:'PAD/AAD (BMD Phase I), S-400',DEU:'Patriot, Arrow 3 (entering)',POL:'Patriot (Wisła)',SAU:'Patriot, THAAD',ARE:'THAAD, Patriot',FRA:'SAMP/T',ITA:'SAMP/T',GBR:'Sea Viper (Type 45)',UKR:'Patriot, SAMP/T, NASAMS',TWN:'Patriot PAC-3, Tien Kung III',ROU:'Aegis Ashore, Patriot',ESP:'Patriot',NLD:'Patriot',GRC:'Patriot'};
const S=()=>W.st.strat||(W.st.strat={c:{},nuke:false,used:null,log:[]});
function rec(p){const s=S();if(s.c[p.a3])return s.c[p.a3];const big=p.gdp>1e6,mid=p.gdp>3e5;const Z=STRAT[p.a3]||{};
  return s.c[p.a3]={icbm:Z.icbm||0,ssbn:Z.ssbn||0,bmr:Z.bmr||0,conv:CONV[p.a3]?Math.round((big?600:mid?200:60)*(STRAT[p.a3]?1.5:1)):(big?80:0),abm:ABM[p.a3]?(big?400:mid?160:60):(mid?20:0),
    fired:0,hit:0,intc:0,lostSsbn:0};}
/* ------------------------------------------------------------------ conventional long-range strike and missile defence */
function salvos(){const st=W.st,s=S();if(st.over)return;
  for(const p of Object.values(st.c)){if(!bel(p))continue;const r=rec(p);if(r.conv<5||rn()>.06)continue;
    const F=st.fronts.filter(f=>(f.a===p.a3||f.b===p.a3)&&!f.cf);if(!F.length)continue;const f=F[(rn()*F.length)|0],q=st.c[f.a===p.a3?f.b:f.a],rq=rec(q);
    const n=Math.min(r.conv,4+((rn()*12)|0));r.conv-=n;r.fired+=n;const tryI=Math.min(rq.abm,n*2),pk=.7*(rq.abm>0?1:0);let through=0,intc=0;
    for(let i=0;i<n;i++){const shots=Math.min(2,Math.floor(tryI/n)+(i<tryI%n?1:0));let ok=false;for(let k=0;k<shots;k++){rq.abm--;if(rn()<pk){ok=true;break;}}if(ok)intc++;else through++;}
    rq.intc+=intc;r.hit+=through;
    // what gets hit: an airbase or a depot
    let what='';const m=st.mil&&st.mil[q.a3];if(through&&m&&Object.keys(m.bases).length&&rn()<.6){const b=Object.values(m.bases)[(rn()*Object.keys(m.bases).length)|0];b.c=Math.max(0,b.c-.08*through);what='the airbase at '+b.n;}
    else if(through&&st.dep&&st.dep[q.a3]&&st.dep[q.a3].length){const d=st.dep[q.a3][(rn()*st.dep[q.a3].length)|0];d.stock=Math.max(0,d.stock-1.5*through);what='the supply depot at '+d.n;}
    W.emit('MISSILE',{e:[p.a3,q.a3],cf:'REPORTED',txt:p.n+' fires '+n+' conventional long-range missiles ('+(CONV[p.a3]||'cruise and ballistic missiles')+') at '+q.n+'. '+(rq.abm>0||intc?q.n+'\'s missile defence ('+(ABM[q.a3]||'air defence')+') intercepts '+intc+'. ':'')+(through?through+' get through'+(what?' and strike '+what:'')+'.':'None get through.')});}
  // industry replenishes slowly
  for(const p of Object.values(st.c)){const r=S().c[p.a3];if(!r)continue;const ind=p.ecn?p.ecn.ind:1;if(CONV[p.a3])r.conv+=.6*ind;if(ABM[p.a3])r.abm+=.8*ind;}}
/* ------------------------------------------------------------------ strategic submarines */
function boomers(){const st=W.st;for(const p of Object.values(st.c)){const r=S().c[p.a3];if(!r||!r.ssbn||!bel(p)||st.over)continue;const n=st.navy&&st.navy.th;let enemyHold=0;
  for(const t of Object.values(n||{}))if(t.f&&t.f[p.a3])enemyHold=Math.max(enemyHold,p.side==='B'?-t.sup:t.sup);
  if(enemyHold>.6&&rn()<.002){r.ssbn--;r.lostSsbn++;W.emit('NAVAL',{e:[p.a3],cf:'REPORTED',txt:'A '+p.n+' ballistic-missile submarine is reported lost at sea in contested waters. Deterrence readiness rises sharply on both sides.'});const x=st.wx2;if(x&&x.det)x.det.lvl=Math.min(4,x.det.lvl+1);}}}
/* ------------------------------------------------------------------ nuclear use: a scenario switch, off by default */
function threshold(){const st=W.st,s=S();if(!s.nuke||st.over||s.used)return;const x=st.wx2;if(!x||!x.det||x.det.lvl<4)return;
  for(const a3 of Object.keys(STRAT)){const p=st.c[a3];if(!bel(p))continue;const cap=(G.places.filter(q=>q.a3===a3).sort((a,b)=>(b.pop||0)-(a.pop||0))[0]||{}).name;
    const lostCap=cap&&Object.entries(st.cities||{}).some(([k,v])=>k.split('|')[0]===cap&&v.h!==a3),collapse=p.gnd<p.gnd0*.25;if(!lostCap&&!collapse)continue;
    const h=p.ldr&&W.lead&&W.lead.who(p.ldr.HEAD);if(h&&h.prag>.55)continue;if(rn()>.02)continue;
    s.used={by:a3,t:st.t};W.emit('NUCLEAR',{e:[a3],cf:'CONFIRMED',txt:p.n+', facing '+(lostCap?'the loss of its capital':'the collapse of its forces')+', uses a nuclear weapon. The number of dead cannot be known. Every government, every army and every family in the world is now living in a different world.'});
    for(const q of Object.values(st.c)){if(q.econ!=null)q.econ=Math.max(.3,q.econ*.8);if(q.sup!=null)q.sup=Math.max(0,q.sup-.15);}if(st.life)for(const q of Object.values(st.c))if(q.life)q.life.env.pol=1;
    W.diplo.end('NUCLEAR_CATASTROPHE','A nuclear weapon has been used. The fighting stops everywhere as the world recoils; no side wins anything that the war set out to take.',a3);return;}}
W.daily.push(()=>{if(!W.st)return;for(const p of Object.values(W.st.c))if(p.side)rec(p);salvos();boomers();threshold();});
// the epilogue knows this ending
if(W.endscreen&&W.endscreen.CH){const ch=W.endscreen.CH[0];const _f=ch[1];ch[1]=(F,st)=>{let h=_f(F,st);if(st.over&&st.over.kind==='NUCLEAR_CATASTROPHE')h=h.replace(/<p>Your side prevails[^<]*<\/p>|<p>Your side is defeated[^<]*<\/p>|<p>Neither side prevails[^<]*<\/p>/,'<p>A nuclear weapon was used. There is no outcome to name for any side.</p>');return h;};}
/* ------------------------------------------------------------------ submarines at sea in your sortie */
if(window.CMESH&&typeof GTY!=='undefined'){const M=new THREE.MeshLambertMaterial({color:0x1d2124});CMESH.SUB=function(){const g=new THREE.Group();const hull=new THREE.Mesh(new THREE.CylinderGeometry(4.5,4.5,90,14),M);hull.rotation.x=Math.PI/2;hull.position.y=0.8;g.add(hull);
    const sail=new THREE.Mesh(new THREE.BoxGeometry(2.6,6,12),M);sail.position.set(0,5.5,-12);g.add(sail);return g;};GTY.SUB={n:'Submarine',hp:300,arm:1,r:40,tgt:1};}
if(window.WSORTIE){const WS=WSORTIE.WS;let t=120;setInterval(()=>{if(!WS.on||typeof game==='undefined'||!game.active||!player||!WS.front){t=120;return;}t-=5;if(t>0)return;t=400+rn()*400;
  const enemy=WS.front.enemyIsB?WS.front.f.b:WS.front.f.a,q=W.st.c[enemy];if(!q||!q.nav||q.nav.sub<1||typeof GTY==='undefined'||!GTY.SUB)return;
  for(let k=0;k<30;k++){const a=rn()*Math.PI*2,R=15000+rn()*45000,x=player.pos.x+Math.sin(a)*R,z=player.pos.z-Math.cos(a)*R;if(groundAt(x,z)>-40)continue;
    const u=GND.add('SUB',1,x,z,rn()*360);u.pos.y=0;if(u.mesh)u.mesh.position.y=0;u._ws=enemy;u._sub=1;u.callsign=q.n+' submarine';WS.ground.push(u);
    if(typeof radio==='function')radio('Maritime patrol: possible submarine at periscope depth, '+String(Math.round(brgTo(player.pos.x,player.pos.z,x,z))).padStart(3,'0')+' for '+Math.round(cd2(player.pos.x,player.pos.z,x,z)/NM)+' miles.',false);break;}},5000);
  if(typeof GUnit!=='undefined'){const _k=GUnit.prototype.kill;GUnit.prototype.kill=function(src){const was=this.alive&&this._sub;const r=_k.apply(this,arguments);if(was&&!this.alive&&W.st){const q=W.st.c[this._ws];if(q&&q.nav&&q.nav.sub>0){q.nav.sub--;q.nav.lost.sub++;}W.emit('NAVAL',{e:[this._ws],cf:'REPORTED',txt:'A '+(q?q.n:'')+' submarine is sunk'+(src===player?' by your attack':'')+'.'});}return r;};}}
/* ------------------------------------------------------------------ panel: STRATEGIC tab, and the scenario switch in WORLD */
const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>',esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function tab(p){const r=rec(p),Z=STRAT[p.a3],s=S();let h='<div style="font-size:10px;color:#c9b46b">Public, rounded orders of magnitude; stocks of conventional missiles and interceptors are game estimates.</div>';
  if(Z)h+='<h4>STRATEGIC FORCES (DETERRENT)</h4>'+row('ICBM launchers','~'+r.icbm+(Z.icbmN?' ('+esc(Z.icbmN)+')':''))+row('Ballistic-missile submarines','~'+r.ssbn+(Z.slbm?' ('+esc(Z.slbm)+')':'')+(r.lostSsbn?' · '+r.lostSsbn+' lost':''))+row('Nuclear-capable bombers','~'+r.bmr+(Z.bmrN?' ('+esc(Z.bmrN)+')':''))+
    row('Nuclear use',s.nuke?'possible under the scenario switch':'never, under this scenario');
  h+='<h4>LONG-RANGE CONVENTIONAL STRIKE</h4>'+row('Missiles','~'+Math.round(r.conv)+(CONV[p.a3]?' ('+esc(CONV[p.a3])+')':''))+row('Fired / got through',r.fired+' / '+r.hit);
  h+='<h4>MISSILE DEFENCE</h4>'+row('Interceptors','~'+Math.round(r.abm)+(ABM[p.a3]?' ('+esc(ABM[p.a3])+')':''))+row('Missiles intercepted',r.intc);
  if(p.nav)h+='<h4>SUBMARINES</h4>'+row('Attack submarines',p.nav.sub+(p.nav.lost&&p.nav.lost.sub?' · '+p.nav.lost.sub+' lost':''));return h;}
if(window.NATPANEL&&NATPANEL.tabs){NATPANEL.tabs.STRATEGIC=tab;if(NATPANEL.tabs.WORLD){const _w=NATPANEL.tabs.WORLD;NATPANEL.tabs.WORLD=p=>{const s=S();return _w(p)+'<h4>SCENARIO: NUCLEAR USE</h4><div style="font-size:10px;color:#8a9a92">Off: strategic weapons are deterrents only. On: a nuclear-armed country facing collapse may use one; the war then ends in catastrophe. Shown abstractly; no number of dead is given.</div><div class="tc"><button data-nk="1" aria-pressed="'+s.nuke+'">'+(s.nuke?'ON':'OFF')+'</button></div>';};}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wsNat [data-nk]');if(!b||!W.st)return;const s=S();if(!s.nuke&&!confirm('Allow nuclear use in this war? It is shown abstractly and ends the war in catastrophe.'))return;s.nuke=!s.nuke;WARMAP.panel();});
W.strategic={S,rec,salvos,threshold,STRAT,CONV,ABM,tab};
})();
