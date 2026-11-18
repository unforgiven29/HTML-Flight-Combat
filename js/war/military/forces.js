/* =====================================================================================================================
   v339 — chapter 6, second part (spec v49 ch.06): equipment catalogues and national inventories, infantry issue,
   civilian aircraft rosters, procurement and the arms trade, uncrewed systems, ships (damage control, repair) and
   carriers (deck cycle, air wing, sea state), the player's squadron roster and wingman, private military companies,
   civil defence, and the operational record (event / claim / assessment, briefings and debriefs).
   Gameplay-level rules; numbers are ESTIMATES by rule and labelled. Catalogue entries are GENERIC CLASSES with a
   technology tier, not specific national products: no source for national inventories is reachable from the build,
   and guessing named products per country would misstate them. A scenario table can name products per class later
   (CAT[*].names). All people and companies are fictional; the war is a fictional scenario.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.mil)return;
const W=WWAR,rn=Math.random,MIL=W.mil;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY');
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+' million':n>=1e4?Math.round(n/1e3)+',000':String(Math.round(n));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const row=(a,b)=>'<div class="row"><span>'+a+'</span><b>'+b+'</b></div>',lbl=x=>'<span title="estimate by rule" style="color:#c9b46b">~'+x+'</span>';
const tier=p=>p.gdp>2e6?3:p.gdp>4e5?2:1;   // technology tier from the economy (an estimate)

/* ------------------------------------------------------------------ the catalogue: one authoritative record per class */
// k: id · c: category (PLATFORM or WEAPON, kept apart) · role · t: lowest tier that fields it · per: how many per unit
const CAT=[
 ['FTR4','PLATFORM','air','Multirole fighter (4th gen)',1],['FTR5','PLATFORM','air','Stealth fighter (5th gen)',3],['ATK','PLATFORM','air','Attack aircraft',1],['BMR','PLATFORM','air','Long-range bomber',3],
 ['AEW','PLATFORM','air','Airborne early warning',2],['TNK','PLATFORM','air','Tanker',2],['TRN','PLATFORM','air','Transport aircraft',1],['HEL','PLATFORM','air','Attack helicopter',1],['UH','PLATFORM','air','Utility helicopter',1],
 ['MBT','PLATFORM','ground','Main battle tank',1],['IFV','PLATFORM','ground','Infantry fighting vehicle',1],['APC','PLATFORM','ground','Armoured personnel carrier',1],['SPG','PLATFORM','ground','Self-propelled artillery',1],['MLRS','PLATFORM','ground','Rocket artillery',2],
 ['SHORAD','PLATFORM','ad','Short-range air defence',1],['MRSAM','PLATFORM','ad','Medium-range air defence',2],['LRSAM','PLATFORM','ad','Long-range air defence',2],['EWR','PLATFORM','ad','Early-warning radar',1],
 ['DDG','PLATFORM','sea','Destroyer',2],['FFG','PLATFORM','sea','Frigate',1],['SSK','PLATFORM','sea','Diesel submarine',2],['SSN','PLATFORM','sea','Nuclear submarine',3],['CV','PLATFORM','sea','Aircraft carrier',3],['LHD','PLATFORM','sea','Amphibious ship',2],
 ['UAVR','PLATFORM','unc','Reconnaissance drone',1],['UAVA','PLATFORM','unc','Armed drone',2],['UGV','PLATFORM','unc','Uncrewed ground vehicle',2],['USV','PLATFORM','unc','Uncrewed surface vessel',2],
 ['AAM_IR','WEAPON','AAM','Short-range air-to-air missile (IR)',1],['AAM_RF','WEAPON','AAM','Medium-range air-to-air missile (radar)',2],['SAM_S','WEAPON','SAM','Short-range surface-to-air missile',1],['SAM_L','WEAPON','SAM','Long-range surface-to-air missile',2],
 ['PGM_B','WEAPON','PGM','Guided bomb',2],['PGM_C','WEAPON','PGM','Cruise missile',3],['ASM','WEAPON','PGM','Anti-ship missile',2],['ART155','WEAPON','ART','Artillery shell (155 / 152 mm class)',1],['RKT','WEAPON','ART','Artillery rocket',1]].map(([k,c,role,n,t])=>({k,c,role,n,t,names:null}));
// infantry issue profile per brigade type: weapon classes, per 100 soldiers (generic; the civilian / police classes are separate and never military issue)
const INF={classes:{RIFLE:'Service rifle',LMG:'Light machine gun',GPMG:'General-purpose machine gun',DMR:'Designated marksman rifle',SNP:'Sniper rifle',GL:'Grenade launcher',MOR:'Mortar',ATGM:'Anti-tank guided missile',RPG:'Anti-tank rocket',MANPADS:'Portable air-defence missile',NVG:'Night vision',RAD:'Radio'},
  issue:{INF:{RIFLE:85,LMG:9,GPMG:3,DMR:3,SNP:1,GL:9,MOR:2,ATGM:2,RPG:6,MANPADS:1,NVG:40,RAD:15},MECH:{RIFLE:80,LMG:8,GPMG:5,DMR:2,SNP:1,GL:8,MOR:2,ATGM:4,RPG:5,MANPADS:1,NVG:50,RAD:25},ARM:{RIFLE:60,LMG:4,GPMG:6,DMR:1,SNP:0,GL:4,MOR:1,ATGM:2,RPG:3,MANPADS:1,NVG:60,RAD:40},ART:{RIFLE:70,LMG:3,GPMG:4,DMR:0,SNP:0,GL:2,MOR:0,ATGM:1,RPG:2,MANPADS:2,NVG:30,RAD:30}},
  civil:['Sporting rifle','Shotgun','Police pistol','Police carbine']};   // civilian and law-enforcement classes: never counted as military, never a target class
const F=a3=>{const st=W.st;st.frc=st.frc||{seq:1,pmc:[],deals:[],prog:[],roster:null,ops:[]};const s=st.frc;s.c=s.c||{};let r=s.c[a3];if(r)return r;const p=st.c[a3];if(!p)return null;
  const t=tier(p),inv={};for(const e of CAT){if(e.t>t)continue;inv[e.k]=0;}
  // national inventory (ESTIMATES): split the aggregates over the classes the tier fields
  const A=p.air,Gd=p.gnd,nav=p.nav||{sur:0,sub:0,cv:0,amp:0};
  if(inv.FTR5!=null){inv.FTR5=Math.round(A*.15);}inv.FTR4=Math.round(A*(inv.FTR5!=null?.55:.7));inv.ATK=Math.round(A*.15);if(inv.BMR!=null)inv.BMR=Math.round(A*.05);
  if(inv.AEW!=null)inv.AEW=Math.round(A/120);if(inv.TNK!=null)inv.TNK=Math.round(A/50);inv.TRN=Math.round(A*.12+3);inv.HEL=Math.round(Gd*1.2);inv.UH=Math.round(Gd*3);
  inv.MBT=Math.round(Gd*30);inv.IFV=Math.round(Gd*45);inv.APC=Math.round(Gd*35);inv.SPG=Math.round(Gd*12);if(inv.MLRS!=null)inv.MLRS=Math.round(Gd*4);
  inv.SHORAD=Math.round(Gd*4+5);if(inv.MRSAM!=null)inv.MRSAM=Math.round(Gd*.8+2);if(inv.LRSAM!=null)inv.LRSAM=Math.round(Gd*.3+1);inv.EWR=Math.round(Gd*.5+4);
  if(inv.DDG!=null)inv.DDG=Math.round(nav.sur*.4);inv.FFG=Math.round(nav.sur*(inv.DDG!=null?.6:1));if(inv.SSN!=null)inv.SSN=Math.round(nav.sub*.5);if(inv.SSK!=null)inv.SSK=Math.round(nav.sub*(inv.SSN!=null?.5:1));if(inv.CV!=null)inv.CV=nav.cv||0;if(inv.LHD!=null)inv.LHD=nav.amp||0;
  inv.UAVR=Math.round(A*.3+Gd*2);if(inv.UAVA!=null)inv.UAVA=Math.round(A*.08);if(inv.UGV!=null)inv.UGV=Math.round(Gd*2);if(inv.USV!=null)inv.USV=Math.round((nav.sur||0)*1.5);
  // civilian aircraft roster (categories; estimates from the economy)
  const g=p.gdp/1e6;const civ={MAIN:Math.round(g*90+4),REG:Math.round(g*40+3),CARGO:Math.round(g*18+1),BIZ:Math.round(g*120),GA:Math.round(g*900+20),MED:Math.round(g*30+2)};
  r=s.c[a3]={a3,t,inv,inv0:{...inv},civ,ground:0,drones:{lost:0,recon:0},cd:{level:0,shel:0,alerts:0},ships:{dmg:[],dc:{ok:0,lost:0},rep:0},cv:[],pmc:null};
  for(let i=0;i<(nav.cv||0);i++)r.cv.push({id:a3+'-CV'+(i+1),deck:'READY',wing:Math.round(30+rn()*30),ready:.8,seaLim:0,cyc:0});
  return r;};

/* ------------------------------------------------------------------ inventories follow the aggregates (no double counting) */
function sync(p,r){const A=p.air,Gd=p.gnd,i=r.inv,i0=r.inv0;const ka=A/Math.max(1,p.air0),kg=Gd/Math.max(1,p.gnd0);
  for(const k of['FTR4','FTR5','ATK','BMR'])if(i[k]!=null)i[k]=Math.round(i0[k]*ka);for(const k of['MBT','IFV','APC','SPG','MLRS','HEL','UH','SHORAD'])if(i[k]!=null)i[k]=Math.round(i0[k]*kg);
  const m=MIL.M(p.a3);if(m){if(i.AEW!=null)i.AEW=m.aew;if(i.TNK!=null)i.TNK=m.tnk;}if(p.nav){if(i.CV!=null)i.CV=p.nav.cv;if(i.LHD!=null)i.LHD=p.nav.amp;}}

/* ------------------------------------------------------------------ procurement and the arms trade */
const SELL=['USA','FRA','DEU','GBR','ITA','KOR','ISR','SWE','TUR','RUS','CHN','IND','BRA','ESP'];
function trade(){const st=W.st,s=st.frc;
  // buyers: countries at war short of something, or tension buyers; sellers on their side (or neutral ones without an embargo)
  for(const p of Object.values(st.c)){if(!bel(p)||st.over||rn()>.003)continue;const m=MIL.M(p.a3);const need=Object.entries(m.mun).sort((a,b)=>a[1]-b[1])[0];const k=need[0];
    const sel=SELL.map(a=>st.c[a]).filter(q=>q&&q!==p&&(q.side===p.side||(!q.side&&!embargo(q,p))));if(!sel.length)continue;const q=sel[(rn()*sel.length)|0];
    const kind=q.side===p.side&&bel(q)?(rn()<.5?'DONATION':'SALE'):'SALE',lic=tier(p)>=2&&rn()<.15;
    const d={id:'D'+(s.seq++),buyer:p.a3,seller:q.a3,k,kind,lic,n:Math.round(10+rn()*20),t0:st.t,due:st.t+24*(30+rn()*90),pkg:rn()<.6,st:'AGREED'};s.deals.push(d);if(s.deals.length>120)s.deals.shift();
    W.emit('ARMS',{e:[p.a3,q.a3],txt:(kind==='DONATION'?q.n+' donates ':q.n+' agrees to sell ')+NAME(k)+' to '+p.n+(lic?' with a licence to produce them locally':'')+(d.pkg?', with training and support':'')+'; first deliveries in one to four months. End-use conditions apply.'});}
  for(const d of s.deals){if(d.st!=='AGREED'||st.t<d.due)continue;const p=st.c[d.buyer],m=MIL.M(d.buyer);
    if(rn()<.1){d.st='DELAYED';d.due=st.t+24*60;W.emit('ARMS',{e:[d.buyer,d.seller],txt:'Deliveries of '+NAME(d.k)+' from '+st.c[d.seller].n+' to '+p.n+' are delayed: production problems and cost overruns. Parliamentary questions follow.'});continue;}
    d.st='DELIVERED';m.mun[d.k]+=d.n;if(d.lic){const F0=F(d.buyer);F0.licence=(F0.licence||0)+1;}W.emit('ARMS',{e:[d.buyer,d.seller],txt:'Delivery accepted: '+NAME(d.k)+' from '+st.c[d.seller].n+' to '+p.n+' (about '+d.n+' days of supply).'});
    if(rn()<.03)W.emit('JUSTICE',{e:[d.buyer],cf:'ALLEGED',txt:'Investigators in '+p.n+' look into reports that part of a weapons delivery was diverted from its recorded units. An audit of the chain of custody is ordered.'});}
  for(const d of s.deals)if(d.st==='DELAYED'&&st.t>=d.due)d.st='AGREED';
  // development programmes (major powers): risks and fielding
  if(rn()<.004){const P=['USA','CHN','RUS','FRA','GBR','IND','JPN','KOR','DEU','TUR'].map(a=>st.c[a]).filter(Boolean);const p=P[(rn()*P.length)|0];const c=CAT.filter(e=>e.t<=tier(p))[(rn()*20)|0];if(c){
    const g={id:'P'+(s.seq++),a3:p.a3,k:c.k,n:'Next-generation '+c.n.toLowerCase(),t0:st.t,due:st.t+24*(365*(2+rn()*5)),risk:rn(),st:'DEVELOPMENT'};s.prog.push(g);if(s.prog.length>40)s.prog.shift();
    W.emit('PROGRAMME',{e:[p.a3],txt:p.n+' launches a development programme: '+g.n+'. Fielding planned in '+Math.round((g.due-st.t)/24/365)+' years.'});}}
  for(const g of s.prog){if(g.st!=='DEVELOPMENT'||st.t<g.due)continue;if(g.risk>.75){g.st='CANCELLED';W.emit('PROGRAMME',{e:[g.a3],txt:st.c[g.a3].n+' cancels '+g.n.toLowerCase()+' after delays and cost overruns.'});}else{g.st='FIELDED';W.emit('PROGRAMME',{e:[g.a3],txt:st.c[g.a3].n+' fields '+g.n.toLowerCase()+'.'});const p=st.c[g.a3];p.ready=Math.min(1,p.ready+.01);}}}
const embargo=(seller,buyer)=>buyer.side&&seller.side!==buyer.side&&!!seller.side;   // no sales across the line; neutrals sell under end-use conditions
const NAME=k=>({AAM:'air-to-air missiles',SAM:'surface-to-air missiles',PGM:'precision strike weapons',ART:'artillery ammunition'}[k]||k);

/* ------------------------------------------------------------------ ships: damage control and repair; carriers */
// a ship hit: six compartments (bow, forward, midships, engine room, magazine, stern), fire and flooding spreading
// hour by hour, damage-control teams (more and better trained with the country's tier) fighting them; the ship is
// saved when the fires are out and flooding is stopped before buoyancy or the magazine are lost
const CMP=['bow','forward','midships','engine room','magazine','stern'];
function dcSim(t){const C=CMP.map(n=>({n,fire:0,flood:0}));const hit=(rn()*6)|0;C[hit].fire=.7+rn()*.3;C[hit].flood=.4+rn()*.9;const nb=C[hit+(hit<5?1:-1)];nb.fire=Math.max(nb.fire,rn()*.6);nb.flood=Math.max(nb.flood,rn()*.6);const teams=1+t,skill=.12+.07*t;let log=[];
  for(let h=0;h<12;h++){for(let i=0;i<6;i++){const c=C[i];if(c.fire>.4){for(const j of[i-1,i+1])if(C[j]&&rn()<.35)C[j].fire=Math.max(C[j].fire,.45);}if(c.flood>.5){c.flood=Math.min(1.2,c.flood+.06);for(const j of[i-1,i+1])if(C[j]&&rn()<.25)C[j].flood=Math.max(C[j].flood,.35);}}
    const work=C.slice().sort((a,b)=>(b.fire+b.flood)-(a.fire+a.flood)).slice(0,teams);for(const c of work){c.fire=Math.max(0,c.fire-skill*.35);c.flood=Math.max(0,c.flood-skill*.25);}
    if(C[4].fire>.8){log.push('magazine fire');return{saved:false,why:'a fire reaches the magazine',h,C};}
    const fl=C.reduce((t,c)=>t+c.flood,0);if(fl>2.4)return{saved:false,why:'flooding cannot be stopped',h,C};
    if(C.every(c=>c.fire<.05&&c.flood<.3))return{saved:true,why:'fires out and flooding stopped after '+(h+1)+' hours',h,C};}
  return{saved:C.reduce((t,c)=>t+c.flood,0)<1.6,why:'towed with flooding contained',h:12,C};}
function ships(p,r){const st=W.st,n=p.nav;if(!n)return;const lost=(n.lost?n.lost.sur+n.lost.sub+n.lost.amp:0),prev=r.ships._l??lost;r.ships._l=lost;
  // for every ship lost in battle about as many more are hit and survive: damage control decides
  for(let i=0;i<lost-prev;i++){if(rn()<.5)continue;const dc=dcSim(tier(p));const ok=dc.saved;r.ships.last=dc;if(ok&&n.sur>0){n.sur--;r.ships.dmg.push({t:st.t,back:st.t+24*(20+rn()*70)});r.ships.dc.ok++;
      W.emit('NAVAL',{e:[p.a3],cf:'REPORTED',txt:'A '+p.n+' warship is hit in the '+dc.C.filter(c=>c.fire>0||c.flood>0).map(c=>c.n).slice(0,3).join(', ')+'; damage-control teams save it ('+dc.why+'). It is towed to port for repair. Casualties among the crew are reported.'});}
    else{r.ships.dc.lost++;W.emit('NAVAL',{e:[p.a3],cf:'REPORTED',txt:'A damaged '+p.n+' warship cannot be saved ('+dc.why+'); the crew abandon ship and rescue ships pick up the survivors.'});}}
  for(let i=r.ships.dmg.length-1;i>=0;i--){const d=r.ships.dmg[i];if(st.t<d.back)continue;r.ships.dmg.splice(i,1);n.sur++;r.ships.rep++;if(rn()<.3)W.emit('NAVAL',{e:[p.a3],txt:'A repaired '+p.n+' warship returns to the fleet.'});}
  // carriers: deck cycle by sea state (theatre weather) and the wing's state
  while(r.cv.length>n.cv)r.cv.pop();while(r.cv.length<n.cv)r.cv.push({id:p.a3+'-CV'+(r.cv.length+1),deck:'READY',wing:40,ready:.8,seaLim:0,cyc:0});
  const rough=(st.th||[]).some(t=>t.f&&t.f[p.a3]&&/STORM|SNOW/.test(t.wx||''));
  for(const c of r.cv){c.seaLim=rough?1:0;c.deck=rough?'SUSPENDED (sea state)':bel(p)&&!st.over?'FLIGHT OPERATIONS':'READY';if(!rough&&bel(p))c.cyc+=2;c.ready=Math.max(.4,Math.min(.95,c.ready+(bel(p)&&!rough?-.003:.01)));
    if(bel(p)&&!st.over&&rn()<.002){c.wing=Math.max(0,c.wing-1);W.emit('NAVAL',{e:[p.a3],txt:'An aircraft is lost in a deck accident aboard a '+p.n+' carrier; the crew is recovered.'});}}}

/* ------------------------------------------------------------------ uncrewed systems */
function drones(p,r){const st=W.st,i=r.inv;if(!bel(p)||st.over)return;const act=st.fronts.filter(f=>(f.a===p.a3||f.b===p.a3)&&!f.cf).length;if(!act)return;
  const l=Math.min(i.UAVR||0,Math.round(rn()*act*.6));i.UAVR-=l;r.drones.lost+=l;r.drones.recon=Math.min(1,(i.UAVR||0)/Math.max(1,r.inv0.UAVR||1));
  i.UAVR=Math.min(r.inv0.UAVR*1.5,i.UAVR+Math.max(.2,p.gdp/2e6)*(p.ecn?p.ecn.ind:1));}
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);const r=W.st.frc&&W.st.frc.c&&W.st.frc.c[p.a3];if(r&&r.inv0.UAVR)k*=.97+.06*r.drones.recon;return k;};}   // reconnaissance: seeing the other side

/* ------------------------------------------------------------------ civil defence and civilian aviation */
function civil(p,r){const st=W.st;const war=bel(p)&&!st.over;
  r.cd.level=war?Math.min(1,r.cd.level+.02*(p.stab??.8)):Math.max(0,r.cd.level-.005);r.cd.shel=Math.round(p.pop*(.05+.25*r.cd.level)*(p.econ??1));
  if(war&&!r.grounded){r.grounded=1;W.emit('AVIATION',{e:[p.a3],txt:'Civil aviation in '+p.n+': airspace near the fronts is closed; airlines reroute; medical and humanitarian flights continue under coordination.'});}
  if(!war&&r.grounded){r.grounded=0;W.emit('AVIATION',{e:[p.a3],txt:'Airspace over '+p.n+' reopens to civil aviation.'});}
  if(war&&rn()<.02*Math.max(0,1-(p.ecn?p.ecn.energy:1)+.2)){r.cd.alerts++;}}

/* ------------------------------------------------------------------ private military companies */
function pmc(){const st=W.st,s=st.frc;if(st.over||rn()>.003)return;const L=Object.values(st.c).filter(q=>bel(q)&&q.gdp>3e5);if(!L.length)return;const p=L[(rn()*L.length)|0];
  if(s.pmc.filter(c=>c.a3===p.a3).length>=2)return;const nm=['Meridian','Halvard','Stonebridge','Corvane','Aldmere','Pellucid','Tarrant','Ostrava','Kestrel','Vantor'][(rn()*10)|0]+' '+['Logistics','Support Services','Security Group','Aviation Services','Field Services'][(rn()*5)|0];
  const c={id:'C'+(s.seq++),n:nm,a3:p.a3,role:['logistics','base security','aircraft maintenance','training','transport'][(rn()*5)|0],t:st.t,st:'CONTRACTED',staff:Math.round(200+rn()*2000)};s.pmc.push(c);
  W.emit('CONTRACTOR',{e:[p.a3],txt:p.n+' contracts '+c.n+' (a fictional private company, not part of its armed forces) for '+c.role+'; about '+c.staff+' staff. Contractors are civilians under the law of the country that hires them.'});
  if(rn()<.08)setTimeout(()=>{},0),W.emit('JUSTICE',{e:[p.a3],cf:'ALLEGED',txt:'A parliamentary inquiry in '+p.n+' examines the oversight of '+c.n+'\'s contract after complaints about conduct; the contract is under review.'});}
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);const n=W.st.frc&&W.st.frc.pmc?W.st.frc.pmc.filter(c=>c.a3===p.a3&&c.role==='logistics').length:0;return k*(1+.01*n);};}

/* ------------------------------------------------------------------ the player's squadron: roster, wingman, records */
const CS=['VIPER','ROOK','HAWK','JESTER','RAVEN','SABRE','NOMAD','LANCE','ORCA','FLINT','GHOST','MAVERICK'.slice(0,0)+'BOLT','TALON','DUSK','SPARROW','KITE'];
function roster(a3){const st=W.st,s=st.frc;if(s.roster&&s.roster.a3===a3)return s.roster;const L=W.lead;
  const ppl=[];for(let i=0;i<12;i++){const x=L?L.person(a3,'Squadron pilot',L.rank(a3,'air',1+(i<2?3:i<5?2:i<9?1:0))):{name:'Pilot '+(i+1),id:'X'+i};ppl.push({id:x.id,name:x.name,rank:x.rank||'',cs:CS[i%CS.length],sorties:0,kills:0,trust:.5,st:'ACTIVE',cur:1});}
  s.roster={a3,ppl,wing:ppl[1].id,t:st.t,log:[]};W.emit('SQUADRON',{e:[a3],txt:'You join a '+st.c[a3].n+' squadron (fictional). Your wingman: '+ppl[1].cs+' ('+ppl[1].name+').'});return s.roster;}
function afterSortie(a3,kAir,kGnd,lost){const st=W.st,R0=roster(a3),w=R0.ppl.find(q=>q.id===R0.wing);
  if(w){w.sorties++;w.trust=Math.min(1,w.trust+.05);w.cur=1;if(rn()<.15*kAir)w.kills++;}
  for(const q of R0.ppl)if(q!==w&&q.st==='ACTIVE'){if(rn()<.5)q.sorties++;q.cur=Math.max(0,q.cur-.02);if(rn()<.02&&bel(st.c[a3])){q.st='MISSING';R0.log.unshift([st.t,q.cs+' did not return from a mission.']);W.emit('SQUADRON',{e:[a3],txt:'Your squadron mourns '+q.cs+' ('+q.name+'), missing after a mission.'});}}
  R0.log.unshift([st.t,'Sortie: '+kAir+' air, '+kGnd+' ground'+(lost?' · aircraft lost':'')]);R0.log.length=Math.min(R0.log.length,20);
  if(w&&w.st!=='ACTIVE'){const nw=R0.ppl.find(q=>q.st==='ACTIVE'&&q!==w);if(nw){R0.wing=nw.id;W.emit('SQUADRON',{e:[a3],txt:'New wingman: '+nw.cs+'.'});}}
  // the operational record: event, claim and assessment kept apart
  st.frc.ops.unshift({t:st.t,a3,claim:{air:kAir,gnd:kGnd},assessed:{air:Math.max(0,kAir-(rn()<.2?1:0)),gnd:Math.round(kGnd*(.7+rn()*.3))},lost:!!lost});st.frc.ops.length=Math.min(st.frc.ops.length,40);}
if(window.WSORTIE){const _f=WSORTIE.finish;WSORTIE.finish=function(){const WS=WSORTIE.WS,was=WS.on,a3=WS.me,k={...(WS.kills||{})},l=WS.lost;const r=_f.apply(this,arguments);
  if(was&&W.st&&a3)try{afterSortie(a3,k.air|0,k.gnd|0,l);}catch(e){console.warn('[forces]',e);}return r;};
 const _s=WSORTIE.start;WSORTIE.start=async function(a3,ap){const r=await _s.apply(this,arguments);try{if(WSORTIE.WS.on){const R0=roster(a3),w=R0.ppl.find(q=>q.id===R0.wing),m=MIL.M(a3);
   const brief='BRIEFING · '+(WSORTIE.WS.task?WSORTIE.WS.task.l||WSORTIE.WS.task.k:'patrol the front')+' · WINGMAN '+(w?w.cs:'NONE')+' · AAM STOCK '+Math.round(m.mun.AAM)+' DAYS';
   if(typeof radio==='function')radio(brief,false);}}catch(e){}return r;};}

/* ------------------------------------------------------------------ daily */
W.daily.push(()=>{const st=W.st;if(!st)return;for(const p of Object.values(st.c)){if(W.lod&&!W.lod(p,Math.floor(st.t/24)))continue;const r=F(p.a3);if(!r)continue;sync(p,r);ships(p,r);drones(p,r);civil(p,r);}trade();pmc();});

/* ------------------------------------------------------------------ ARSENAL tab */
function tab(p){const st=W.st,r=F(p.a3);if(!r)return'';const s=st.frc;
  let h='<div style="color:#8a9a92;font-size:10px">Generic equipment classes by technology tier (tier '+r.t+'), not named national products. Counts are estimates (~) split from the war\'s aggregates.</div>';
  for(const[grp,nm]of[['air','AIR'],['ground','GROUND'],['ad','AIR DEFENCE'],['sea','NAVAL'],['unc','UNCREWED']]){const L=CAT.filter(e=>e.role===grp&&r.inv[e.k]!=null);if(!L.length)continue;h+='<h4>'+nm+'</h4>'+L.map(e=>row(esc(e.n),lbl(r.inv[e.k]))).join('');}
  h+='<h4>WEAPON CLASSES IN SERVICE</h4><div>'+CAT.filter(e=>e.c==='WEAPON'&&e.t<=r.t).map(e=>esc(e.n)).join(' · ')+'</div>';
  h+='<h4>INFANTRY ISSUE (PER 100, MECHANISED)</h4><div>'+Object.entries(INF.issue.MECH).filter(x=>x[1]).map(([k,v])=>esc(INF.classes[k])+' '+v).join(' · ')+'</div><div style="font-size:10px;color:#8a9a92">Civilian and police weapons are a separate register and never military targets.</div>';
  if(r.cv.length)h+='<h4>CARRIERS</h4>'+r.cv.map(c=>row(esc(c.id),esc(c.deck)+' · wing '+c.wing+' · '+Math.round(c.ready*100)+' %')).join('');
  if(p.nav)h+=row('Ships under repair',r.ships.dmg.length)+row('Saved by damage control / lost',r.ships.dc.ok+' / '+r.ships.dc.lost);
  const D=s.deals.filter(d=>d.buyer===p.a3||d.seller===p.a3).slice(-6);if(D.length)h+='<h4>ARMS TRADE</h4>'+D.map(d=>'<div>'+esc(d.kind.toLowerCase())+': '+NAME(d.k)+' · '+esc(st.c[d.seller].n)+' → '+esc(st.c[d.buyer].n)+' · '+d.st.toLowerCase()+(d.lic?' · licensed production':'')+'</div>').join('');
  const P=s.prog.filter(g=>g.a3===p.a3);if(P.length)h+='<h4>PROGRAMMES</h4>'+P.map(g=>row(esc(g.n),g.st.toLowerCase())).join('');
  const C=s.pmc.filter(c=>c.a3===p.a3);if(C.length)h+='<h4>CONTRACTORS (FICTIONAL)</h4>'+C.map(c=>row(esc(c.n),esc(c.role)+' · '+lbl(c.staff)+' staff')).join('');
  h+='<h4>CIVIL</h4>'+row('Civil aircraft (airliners / regional / cargo / business / general / medical)',lbl([r.civ.MAIN,r.civ.REG,r.civ.CARGO,r.civ.BIZ,r.civ.GA,r.civ.MED].join(' / ')))+row('Civil defence readiness',Math.round(r.cd.level*100)+' %')+row('Shelter places',lbl(fmt(r.cd.shel)))+(r.grounded?row('Airspace','restricted near the fronts'):'');
  const R0=s.roster;if(R0&&R0.a3===p.a3){h+='<h4>YOUR SQUADRON</h4>'+R0.ppl.map(q=>row(esc(q.cs)+' · '+esc(q.rank)+' '+esc(q.name)+(q.id===R0.wing?' (your wingman)':''),q.st==='ACTIVE'?q.sorties+' sorties · trust '+Math.round(q.trust*100)+' %'+(q.cur<.7?' · currency lapsed':''):q.st)).join('');
    const O=s.ops.filter(o=>o.a3===p.a3).slice(0,5);if(O.length)h+='<h4>OPERATIONAL RECORD (CLAIM / ASSESSED)</h4>'+O.map(o=>row(W.date(o.t).slice(0,10),'air '+o.claim.air+' / '+o.assessed.air+' · ground '+o.claim.gnd+' / '+o.assessed.gnd+(o.lost?' · aircraft lost':''))).join('');}
  return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.ARSENAL=tab;

/* ------------------------------------------------------------------ retirement and final disposition (peacetime, yearly) */
W.daily.push(()=>{const st=W.st;if(!st||Math.floor(st.t/24)%365!==200)return;for(const p of Object.values(st.c)){if(bel(p)||p.air<40)continue;const n=Math.max(1,Math.round(p.air*.03));
  if(rn()<.3)W.emit('RETIREMENT',{e:[p.a3],txt:p.n+' retires about '+n+' older aircraft: most go into storage, some are scrapped for parts, one goes to a museum. Replacements are on order.'});}});
/* ------------------------------------------------------------------ deployment album: a picture at the end of each sortie (kept in this browser) */
function snap(){try{if(typeof renderer==='undefined'||typeof scene==='undefined'||!camera)return null;renderer.render(scene,camera);const c=document.createElement('canvas');c.width=192;c.height=108;
  c.getContext('2d').drawImage(renderer.domElement,0,0,192,108);return c.toDataURL('image/jpeg',.7);}catch(e){return null;}}
function album(){try{return JSON.parse(localStorage.getItem('viper.album')||'[]');}catch(e){return[];}}
if(window.WSORTIE){const _f=WSORTIE.finish;WSORTIE.finish=function(){const WS=WSORTIE.WS,was=WS.on&&game.active,a3=WS.me;const img=was?snap():null;const r=_f.apply(this,arguments);
  if(img&&W.st)try{const A=album();A.unshift({img,t:W.st.t,a3,ac:player&&player.type||''});A.length=Math.min(A.length,12);localStorage.setItem('viper.album',JSON.stringify(A));}catch(e){}return r;};}
{const _t=tab;NATPANEL&&NATPANEL.tabs&&(NATPANEL.tabs.ARSENAL=p=>{const A=album().filter(x=>x.a3===p.a3);return _t(p)+(A.length?'<h4>DEPLOYMENT ALBUM</h4><div style="display:flex;flex-wrap:wrap;gap:3px">'+A.map(x=>'<img src="'+x.img+'" width="96" height="54" title="'+esc(x.ac+' · '+W.date(x.t).slice(0,10))+'">').join('')+'</div>':'');});}
W.forces={dcSim,snap,album,CAT,INF,F,roster,afterSortie,tab,trade,embargo};
})();
