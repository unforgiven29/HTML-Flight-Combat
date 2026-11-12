/* =====================================================================================================================
   v313 — non-cooperative target recognition (NCTR), rebuilt as a jet-engine-modulation (JEM) classifier   (js/nctr.js, window.NCTRX)

   The old NCTR was a timer: point at a target nose-on or tail-on and a name appeared after a few seconds. This one reads the engine:
   * What it hears is the compressor face (nose-on) or the turbine / nozzle (tail-on): the blade count and spool speed of the engine. A beam
     view shows neither, so the aspect window is about +-40 deg off the nose or the tail (a weaker 40-60 deg shoulder). A bank that turns the
     target beam-on stops the read. Idle engines give a feeble modulation (it needs power); an afterburner helps tail-on.
   * The radar has to dwell on that one target. STT is a continuous dwell; a bugged TWS track gets about 40 % duty (the beam keeps leaving);
     in RWS only the track under the cursor gets a thin share. Jamming, the look-down notch and a lost track stop the read.
   * It resolves in stages, as the integrated confidence climbs: CLASS (engine count and kind: single/twin fighter, large jet, turboprop,
     rotor) -> ENGINE FAMILY (F100/F110 class, AL-31/AL-41 class ...) -> AIRCRAFT TYPE. Two types on the same engine family are separate library
     entries and can be confused (F-15 / F-16, F-18 / Gripen, Su-27 / Su-35 ...): a late, weak read can report the sibling.
   * The library is finite. The newest types are not in it (they read as UNKNOWN + class + engine family).
   * A name stays with the track only while the track lives: lose it for 20 s and the next look starts again.
   * Range: radar range against the target x (RCS)^(1/4); the dwell grows with the square of range over that limit.
   Fitted jets: F/A-18C/E (switched on its radar page, OSB 5), F-15C/E/EX, F-16C/E/V, F-22, F-35, EF-2000, Rafale,
   F/A-18F, EA-18G run it automatically on the track they are working. Also modern Su/MiG/J- jets (by request). No NCTR on the F-14, older MiGs/Sus and other jets. Gameplay-level numbers.
   Switches: NCTRX.on
   ===================================================================================================================== */
(function(){'use strict';
if(typeof NCTR==='undefined'||typeof radar==='undefined'||typeof nctrTick==='undefined'){console.warn('[nctr] core missing');return;}
const D=Math.PI/180,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const X=window.NCTRX={on:true,st:{reads:0,sib:0,unk:0}};
// Only radars with a documented NCTR mode: APG-63(V)1/(V)2/(V)3 and APG-70 (F-15C/E), APG-65/73/79 (Hornets), APG-77 (F-22), APG-81 (F-35),
// APG-68(V)5 / APG-80 / APG-83 (F-16), CAPTOR (Typhoon, range-profile NCTR), RBE2 (Rafale). The modern Russian and Chinese jets are added by
// request (their sets have no public NCTR description, so that part is a gameplay choice); the F-14 never had it.
const FIT=new Set(['F-15C','F-15E','F-15EX','F-16C','F-16E','F-16V','F-22','F-35A','EF-2000','Rafale','EA-18G','F-18F',
  // by request: the modern Russian and Chinese fighters (no public NCTR description exists for these sets; same engine-signature model)
  'Su-35S','Su-57','Su-30SM','Su-30MKM','MiG-35','MiG-31BM','Su-34','J-20','J-10C','J-16','J-11B','J-15T','J-35']);
X.FIT=FIT;
// types the library does not know (newest / least collected)
const NOLIB=new Set(['Su-57','J-20','J-35','J-15T','J-16','KF-21','F-22','F-35A']);
const famOf=s=>{s=String(s||'').replace(/^\d\s*[×x]\s*/,'');const m=s.match(/(F1\d\d|F4\d\d|F119|F135|AL-?\d\d|RD-?\d\d|EJ200|M88|M53|WS-?\d+|D-30|J79|J85|J57|J52|TF\d+|Atar|Adour|RB199|R-\d+|AI-\d+|TV3|Larzac|Spey|Pegasus|RM\d+|TF34|Avon|VK-1)/i);return m?m[1].toUpperCase().replace(/^AL(\d)/,'AL-$1').replace(/^RD(\d)/,'RD-$1'):s.split(/[ -]/)[0].toUpperCase();};
const GROUP={F100:'EAG',F110:'EAG','F404':'HOR','F414':'HOR','AL-31':'FLK','AL-41':'FLK','RD-33':'FUL','RD-93':'FUL','WS-10':'WS','WS-19':'WS'};
const grp=f=>GROUP[f]||f;
function engOf(j){const raw=(typeof ENGN!=='undefined'&&ENGN[j.type])||'';const n=/^\s*(\d)/.test(raw)?+RegExp.$1:1,fam=famOf(raw);return{raw,n,fam,grp:grp(fam)};}
function clsOf(j,e){const t=j.type||'';if(/^(Cargo|E-3A|A-50|Tu-95|B-52)/.test(t))return e.n>=4||/Tu-95/.test(t)?'LARGE TURBOPROP':'LARGE JET';
  if(j.ac&&j.ac.heli||/^Ka-/.test(t))return'ROTARY WING';return e.n>=2?'TWIN-ENGINE FIGHTER':'SINGLE-ENGINE FIGHTER';}
// the library: every other type in the game with its engine family (built lazily once the game tables exist)
let LIB=null;
function lib(){if(LIB)return LIB;LIB=[];for(const k of Object.keys(AC)){if(NOLIB.has(k))continue;const raw=(typeof ENGN!=='undefined'&&ENGN[k])||'';if(!raw)continue;
  LIB.push({k,n:/^\s*(\d)/.test(raw)?+RegExp.$1:1,fam:famOf(raw)});}return LIB;}
function pickId(j,e,q){const L=lib(),own=L.find(l=>l.k===j.type);
  if(!own)return{id:null,unk:true};
  // a weak read of a type that shares its engine family with another library entry can come back as the sibling
  const sib=L.filter(l=>l.k!==j.type&&l.n===e.n&&grp(l.fam)===e.grp);
  if(sib.length&&Math.random()<.2*(1-q)+.04){const s=sib[Math.floor(Math.random()*sib.length)];X.st.sib++;return{id:(NCTR_ID[s.k]||AC[s.k].name),sib:true};}
  return{id:NCTR_ID[j.type]||j.ac.name};}

const isH=()=>typeof isHornet==='function'&&isHornet();
const capable=()=>{const P=player;return !!P&&(isH()||FIT.has(P.type));};
let lossT=new Map();
X.cond=function(j,tk,P){   // -> {why, f}  f: signal factor 0..1
  const now=performance.now()/1000,rel=j.pos.clone().sub(P.pos),d=rel.length(),toMe=rel.clone().negate().normalize(),
    asp=Math.acos(cl(j.fwd(new THREE.Vector3()).dot(toMe),-1,1))/D,
    Rmax=P.ac.radar.R0*.7*Math.pow(j.ac.rcs/5,.25),
    off=Math.min(asp,180-asp);                                         // 0 = looking straight down its nose or tail
  if(!tk||(radar.mode!=='STT'&&now-tk.t>5))return{why:'NO TRK',f:0};
  if(radar.sensor!=='RDR')return{why:'NO RAD',f:0};
  if(d>Rmax)return{why:'RANGE',f:0,d:d,Rmax:Rmax};
  const af=off<40?1:off<60?(60-off)/20*.6:0;if(af<=0)return{why:'ASPECT',f:0};
  const J=radar.jam(j);if(J&&J.noise&&d>J.bt)return{why:'JAM',f:0};
  if(radar.notch&&radar.notch(j,radar.ang(j.pos)))return{why:'NOTCH',f:0};
  const thr=j.thr==null?.85:j.thr,tf=Math.pow(cl((thr+(asp>90?.25*(j.ab||0):0)-.25)/.55,0,1),.7);   // idle: almost nothing; tail-on afterburner helps
  if(tf<.05)return{why:'LOW PWR',f:0};
  const duty=radar.mode==='STT'?1:radar.mode==='TWS'?(radar.bugOK&&radar.bugOK()&&radar.bug===j?.4:.12):.15;
  return{why:'',f:af*tf*duty,d,Rmax};};

nctrTick=function(dt){const P=player;
  if(!X.on||!P||!P.alive||!capable()||!radar.on()){NCTR.j=null;NCTR.p=0;NCTR.why=(NCTR.on&&P&&isH()&&!radar.on())?'NO RAD':'';return;}
  const auto=!isH();if(auto)NCTR.on=1;if(!NCTR.on){NCTR.j=null;NCTR.p=0;NCTR.why='';return;}
  const now=performance.now()/1000;
  // names expire with the track
  for(const j of jets){if(!j._nctrId&&!j._nctrCls)continue;if(radar.tracks.has(j)&&j.alive){lossT.delete(j);continue;}
    const t0=lossT.get(j);if(t0==null)lossT.set(j,now);else if(now-t0>20){j._nctrId=j._nctrCls=j._nctrEng=null;j._nctrP=0;lossT.delete(j);}}
  const j=nctrPick();if(j!==NCTR.j){NCTR.j=j;NCTR.p=j?(j._nctrP||0):0;NCTR.why='';}
  if(!j){NCTR.why='NO TGT';return;}
  if(j.side===P.side){NCTR.why='';return;}
  if(j._nctrId){NCTR.p=1;NCTR.why='';return;}
  const tk=radar.tracks.get(j),c=X.cond(j,tk,P),e=engOf(j);
  NCTR.why=c.why;let p=j._nctrP||0;
  if(!c.why){const T=4+10*Math.pow(cl(c.d/c.Rmax,0,1),2);p=Math.min(1,p+dt*c.f/T);}
  else p=Math.max(0,p-dt*.12);
  j._nctrP=p;NCTR.p=p;
  if(p>=.3&&!j._nctrCls){j._nctrCls=clsOf(j,e);flash('NCTR · '+j._nctrCls,1100);sfx.click();}
  if(p>=.65&&!j._nctrEng){j._nctrEng=e.n+'× '+e.fam+'-CLASS';flash('NCTR · '+j._nctrEng,1100);}
  if(p>=1){const r=pickId(j,e,.5);X.st.reads++;
    if(r.unk||!r.id){X.st.unk++;j._nctrId='UNKNOWN';flash('NCTR · UNKNOWN · '+(j._nctrEng||j._nctrCls),1800);}
    else{j._nctrId=r.id;flash('NCTR · '+r.id,1600);}
    j._nctrT=now;NCTR.p=1;NCTR.why='';sfx.click();}};

// HUD read-out for the jets that have no NCTR page of their own
{const _h=drawHUD;drawHUD=function(){_h.apply(this,arguments);try{const P=player;if(!X.on||!P||!P.alive||isH()||!FIT.has(P.type)||!NCTR.on)return;const cv=document.getElementById('hud');if(!cv)return;
  const j=NCTR.j,c=cv.getContext('2d');if(!j)return;c.save();c.setTransform(1,0,0,1,0,0);c.font='700 15px "B612 Mono",monospace';c.textAlign='left';
  const x=cv.width*.72,y=cv.height*.22;c.fillStyle=j._nctrId?'#e8ffd8':NCTR.why?'#ffd24a':'#8dffb4';
  const l1=j._nctrId?'NCTR  '+j._nctrId:NCTR.why?'NCTR  '+NCTR.why:'NCTR  '+Math.round(NCTR.p*100)+'%';c.fillText(l1,x,y);
  c.font='700 12px "B612 Mono",monospace';if(j._nctrCls)c.fillText(j._nctrCls,x,y+16);if(j._nctrEng)c.fillText(j._nctrEng,x,y+30);
  c.restore();}catch(e){}};}
})();
