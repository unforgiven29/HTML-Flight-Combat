/* =====================================================================================================================
   v333 — leaders, commanders, ranks, assassinations and other abstract incidents, and your service record.
   Spec v49 ch.05 (leaders: name, role, rank, personality, priorities, relationships, reputation, decision history;
   succession; government continuity), ch.06 (ranks, command, relief and promotion), ch.02 line ~1059 ("abstract events
   such as ... assassinations ... sabotage ... attacks on transport ... resolved at the campaign level through
   probabilities ... Do not implement actionable real-world attack procedures"; uncertain outcomes, conflicting claims),
   ch.13 / ch.14 (player career, awards, accountability).

   * EVERY NAME IS FICTIONAL, generated from regional name pools; no real person is represented. Offices are generic
     (Head of Government, Minister of Defence, Chief of the General Staff, Air Force Commander, front commanders).
   * Personality (0-1): resolve, caution, pragmatism. Caution raises the force ratio a country wants before it attacks;
     resolve lowers it; pragmatism makes a government accept a ceasefire sooner (diplomacy reads it).
   * Ranks follow the country's tradition (US / Commonwealth, Russian / CIS, Chinese, Korean, generic NATO / other).
     Front commanders have a skill (0.85-1.15) that multiplies their side's power on that front. A commander whose
     front falls back 40 km in ten days is relieved; one who gains 40 km is promoted; one can be killed (rare);
     each change is an event with the successor named.
   * Abstract incidents, at a low daily rate per country at war: an assassination attempt on a leader, sabotage of
     infrastructure, an attack on transport. Outcomes: prevented, disrupted, failed, partly successful, or (rarely) the
     leader killed; claims of responsibility conflict and attribution stays REPORTED. Consequences: succession, a
     public rally or instability, lost infrastructure or transport, coalition and diplomatic effects. No method,
     target selection or procedure is ever described.
   * Your service record (world-war sorties): rank in your country's air force, sorties, kills, promotions, awards for
     service (never for civilian harm), and inquiries when your weapons harm civilians (a finding can ground you).
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!WWAR.diplo)return;
const W=WWAR,P=WWAR.diplo,G=WGEO;
const bel=p=>p&&p.side&&(p.al==='CORE'||p.al==='ALLY'),day=()=>Math.floor(W.st.t/24),rn=Math.random,pick=a=>a[(rn()*a.length)|0];
/* ------------------------------------------------------------------ fictional names by region */
const POOL={
 EN:[['James','Mary','Robert','Linda','Michael','Sarah','David','Karen','Daniel','Laura','Thomas','Anne'],['Harlow','Whitfield','Brennan','Calder','Ashby','Morrow','Kettering','Lyle','Dunmore','Pryce','Selwyn','Hale']],
 FR:[['Jean','Claire','Luc','Sophie','Marc','Elise','Paul','Nadia','Henri','Camille'],['Durand','Leclerc','Moreau','Garnier','Fabre','Rouvier','Delmas','Marchetti','Vidal','Bonnet']],
 IB:[['Carlos','Lucia','Miguel','Ines','Javier','Marta','Pedro','Ana','Rafael','Elena'],['Ortega','Salazar','Ferreira','Navarro','Coutinho','Iglesias','Moura','Valdés','Cabral','Rey']],
 IT:[['Marco','Giulia','Luca','Chiara','Paolo','Sara','Andrea','Elena'],['Ferrante','Rinaldi','Lombardo','Caruso','Gallo','Moretti','Vitale','Serra']],
 DE:[['Lukas','Anna','Jonas','Lena','Stefan','Katrin','Matthias','Julia','Pieter','Sanne'],['Brandt','Hoffmann','Keller','Vogel','Lindqvist','Van Dijk','Berger','Krause','Janssen','Albers']],
 NO:[['Erik','Ingrid','Lars','Sigrid','Mikko','Aino','Olav','Kaisa','Jukka','Astrid'],['Halvorsen','Lindgren','Virtanen','Dahl','Korhonen','Berg','Nyström','Laine','Strand','Holm']],
 RU:[['Ivan','Olga','Dmitri','Irina','Pavel','Natalia','Sergei','Elena','Andrei','Marina','Alexei','Tatiana'],['Volkov','Orlov','Sokolov','Zhukov','Lebedev','Morozov','Gromov','Antonov','Kuznetsov','Belov','Fedorov','Vinogradov']],
 UA:[['Oleksandr','Tetiana','Mykola','Oksana','Taras','Iryna','Bohdan','Nataliia','Andrii','Olena','Yurii','Halyna'],['Kovalenko','Shevchuk','Petrenko','Bondarenko','Tkachenko','Rybak','Melnyk','Kravchenko','Lysenko','Moroz','Savchenko','Hnatiuk']],
 PL:[['Tomasz','Agnieszka','Piotr','Katarzyna','Jan','Petra','Marek','Zuzana'],['Nowak','Kowalska','Wiśniewski','Hrabal','Novotný','Dvořák','Horváthová','Zieliński']],
 SS:[['Marko','Ana','Nikola','Ivana','Stefan','Maja','Dragan','Elena'],['Petrović','Horvat','Jovanović','Kovačević','Popov','Georgiev','Novak','Ilić']],
 RO:[['Andrei','Ioana','Mihai','Elena','Radu','Ana'],['Popescu','Ionescu','Dumitru','Stan','Rusu','Munteanu']],
 GR:[['Nikos','Eleni','Giorgos','Maria','Kostas','Sofia'],['Papadopoulos','Nikolaou','Georgiou','Konstantinou','Dimitriou','Christodoulou']],
 HU:[['László','Katalin','Zoltán','Eszter','Gábor','Anna'],['Nagy','Kovács','Tóth','Szabó','Horváth','Varga']],
 BA:[['Janis','Ilze','Tomas','Ruta','Andres','Kadri','Mindaugas','Liga'],['Ozols','Kazlauskas','Tamm','Berzina','Petraitis','Saar','Kalnins','Rebane']],
 CN:[['Wei','Li','Jun','Mei','Hao','Xin','Bo','Lan','Gang','Yan'],['Zhao','Liu','Chen','Huang','Sun','Ma','Zhou','Gao','Lin','He']],
 KO:[['Min-jun','Seo-yeon','Ji-ho','Ha-eun','Hyun-woo','Ji-woo','Sung-min','Eun-ji'],['Kim','Park','Choi','Jung','Kang','Yoon','Jang','Lim']],
 JP:[['Haruto','Yui','Kenji','Aiko','Takeshi','Emi','Shun','Naomi'],['Sato','Takahashi','Watanabe','Ito','Nakamura','Kobayashi','Kato','Yamada']],
 AR:[['Omar','Leila','Karim','Nadia','Yusuf','Samira','Hassan','Rania'],['Haddad','Mansour','Khalil','Nasser','Saleh','Rahman','Farouk','Aziz']],
 TR:[['Emre','Ayse','Murat','Elif','Kemal','Zeynep','Arman','Aylin'],['Yilmaz','Kaya','Demir','Aksoy','Celik','Arslan','Aliyev','Sarkisyan']],
 SA:[['Arjun','Priya','Imran','Ayesha','Rohan','Sunita','Bilal','Kavya'],['Sharma','Khan','Iyer','Qureshi','Rao','Malik','Bose','Hussain']],
 SE:[['Anh','Somchai','Siti','Rizal','Mai','Arief','Lin','Dewi'],['Nguyen','Santos','Wijaya','Tan','Reyes','Pham','Lim','Saetang']],
 AF:[['Kwame','Amara','Tunde','Zawadi','Kofi','Nia','Sipho','Ayo'],['Mensah','Okafor','Mwangi','Diallo','Ndlovu','Kamau','Traore','Banda']],
 LA:[['Diego','Camila','Mateo','Valentina','Andres','Sofia','Joaquin','Lucia'],['Rojas','Vargas','Castillo','Mendoza','Herrera','Silva','Morales','Pereira']]};
const REG=a=>{const c=G.byA3.get(a)||{};const sub=c.sub||'',cont=c.cont||'';
  if(['USA','GBR','CAN','AUS','NZL','IRL'].includes(a))return'EN';if(['FRA','BEL','LUX','CHE'].includes(a))return'FR';if(['ESP','PRT','BRA'].includes(a))return a==='BRA'?'LA':'IB';if(['ITA','MLT'].includes(a))return'IT';
  if(['DEU','AUT','NLD'].includes(a))return'DE';if(['NOR','SWE','DNK','FIN','ISL'].includes(a))return'NO';if(['EST','LVA','LTU'].includes(a))return'BA';if(['CHN','TWN','HKG','SGP'].includes(a))return a==='SGP'?'SE':'CN';
  if(['KOR','PRK'].includes(a))return'KO';if(a==='JPN')return'JP';if(['TUR','AZE','ARM','GEO','KAZ','UZB','TKM','KGZ'].includes(a))return'TR';if(a==='UKR')return'UA';if(['RUS','BLR'].includes(a))return'RU';if(['POL','CZE','SVK'].includes(a))return'PL';if(['SRB','HRV','BIH','SVN','MKD','MNE','BGR','KOS','ALB'].includes(a))return'SS';if(['ROU','MDA'].includes(a))return'RO';if(['GRC','CYP'].includes(a))return'GR';if(a==='HUN')return'HU';
  if(/Eastern Europe|Southern Europe/.test(sub)&&cont==='Europe')return'RU';
  if(/Western Asia|Northern Africa/.test(sub))return'AR';if(/Southern Asia/.test(sub))return'SA';if(/South-Eastern Asia/.test(sub))return'SE';if(cont==='Africa')return'AF';if(/America/.test(cont)||/Caribbean|Central America/.test(sub))return'LA';return'EN';};
const fname=a3=>{const P=POOL[REG(a3)];return pick(P[0])+' '+pick(P[1]);};
/* ------------------------------------------------------------------ ranks by tradition */
const RANKS={
 US:{army:['Colonel','Brigadier General','Major General','Lieutenant General','General'],air:['Second Lieutenant','First Lieutenant','Captain','Major','Lieutenant Colonel','Colonel']},
 UK:{army:['Colonel','Brigadier','Major General','Lieutenant General','General'],air:['Pilot Officer','Flying Officer','Flight Lieutenant','Squadron Leader','Wing Commander','Group Captain']},
 RU:{army:['Colonel','Major General','Lieutenant General','Colonel General','General of the Army'],air:['Lieutenant','Senior Lieutenant','Captain','Major','Lieutenant Colonel','Colonel']},
 CN:{army:['Senior Colonel','Major General','Lieutenant General','General','General'],air:['Second Lieutenant','First Lieutenant','Captain','Major','Lieutenant Colonel','Colonel']},
 KO:{army:['Colonel','Brigadier General','Major General','Lieutenant General','General'],air:['Second Lieutenant','First Lieutenant','Captain','Major','Lieutenant Colonel','Colonel']},
 GEN:{army:['Colonel','Brigadier General','Major General','Lieutenant General','General'],air:['Lieutenant','First Lieutenant','Captain','Major','Lieutenant Colonel','Colonel']}};
const TRAD=a=>['USA'].includes(a)?'US':['GBR','CAN','AUS','NZL'].includes(a)?'UK':['RUS','BLR','KAZ','ARM','KGZ','TJK','UZB','AZE'].includes(a)?'RU':a==='CHN'?'CN':['KOR','PRK'].includes(a)?'KO':'GEN';
const R_=(a3,kind,i)=>{const L=RANKS[TRAD(a3)][kind];return L[Math.max(0,Math.min(L.length-1,i))];};
/* ------------------------------------------------------------------ people */
const L=()=>W.st.lead||(W.st.lead={people:{},seq:1,career:null});
function person(a3,role,rank){const s=L(),id='L'+(s.seq++);const p={id,a3,name:fname(a3),role,rank:rank||null,resolve:.3+rn()*.6,caution:.2+rn()*.6,prag:.2+rn()*.6,skill:.85+rn()*.3,st:'IN OFFICE',since:W.st.t,hist:[[W.st.t,'appointed '+role]],fict:1};s.people[id]=p;return p;}
const CABINET=[['HEAD','Head of Government'],['DEF','Minister of Defence'],['CGS','Chief of the General Staff'],['AF','Air Force Commander']];
function staff(c){if(c.ldr)return c.ldr;const o={};for(const[k,role]of CABINET)o[k]=person(c.a3,role+' of '+c.n,k==='CGS'?R_(c.a3,'army',4):k==='AF'?R_(c.a3,'army',3):null).id;c.ldr=o;return o;}
const who=id=>L().people[id];
function replace(c,k,why){const old=who(c.ldr[k]);old.st=why;old.hist.push([W.st.t,why]);const role=CABINET.find(x=>x[0]===k)[1]+' of '+c.n;
  const nw=k==='HEAD'?who(c.ldr.DEF)&&who(c.ldr.DEF).st==='IN OFFICE'?who(c.ldr.DEF):null:null;let n;
  if(nw){n=nw;n.role=role;n.hist.push([W.st.t,'succeeds as '+role]);c.ldr.DEF=person(c.a3,'Minister of Defence of '+c.n).id;}else n=person(c.a3,role,old.rank);c.ldr[k]=n.id;
  return n;}
/* ------------------------------------------------------------------ front commanders */
function commanders(){const st=W.st,s=L();
  for(const f of st.fronts){f.cmd=f.cmd||{};f.hist=f.hist||[];for(const a3 of[f.a,f.b]){if(!f.cmd[a3]){const c=person(a3,'Commander, '+st.c[f.a===a3?f.b:f.a].n+' front ('+st.c[a3].n+')',R_(a3,'army',3));f.cmd[a3]=c.id;}}
    const avg=f.sec.reduce((t,x)=>t+x.off,0)/f.sec.length;f.hist.push(avg);if(f.hist.length>11)f.hist.shift();if(f.hist.length<11||f.cf)continue;const d=avg-f.hist[0];
    for(const[a3,sg]of[[f.a,1],[f.b,-1]]){const c=who(f.cmd[a3]);if(!c||c.st!=='IN OFFICE')continue;const gain=d*sg;
      if(gain<=-40){c.st='RELIEVED';c.hist.push([st.t,'relieved after losing ground']);const n=person(a3,c.role,c.rank);f.cmd[a3]=n.id;f.hist=[avg];
        W.emit('COMMAND',{e:[a3],txt:st.c[a3].n+': '+c.rank+' '+c.name+' is relieved of command of the '+st.c[f.a===a3?f.b:f.a].n+' front after a 40 km retreat; '+n.rank+' '+n.name+' takes over.'});}
      else if(gain>=40){const i=RANKS[TRAD(a3)].army.indexOf(c.rank);if(i>=0&&i<RANKS[TRAD(a3)].army.length-1){c.rank=RANKS[TRAD(a3)].army[i+1];c.hist.push([st.t,'promoted to '+c.rank]);f.hist=[avg];
        W.emit('COMMAND',{e:[a3],txt:st.c[a3].n+': '+c.name+', commanding the '+st.c[f.a===a3?f.b:f.a].n+' front, is promoted to '+c.rank+'.'});}}
      if(rn()<.0015){c.st='KILLED';c.hist.push([st.t,'killed']);const n=person(a3,c.role,c.rank);f.cmd[a3]=n.id;
        W.emit('COMMAND',{e:[a3],cf:'REPORTED',txt:st.c[a3].n+' reports that '+c.rank+' '+c.name+', commanding the '+st.c[f.a===a3?f.b:f.a].n+' front, has been killed; '+n.rank+' '+n.name+' takes command.'});}}}}
/* ------------------------------------------------------------------ abstract incidents (no method, no procedure) */
function incidents(){const st=W.st;
  for(const c of Object.values(st.c)){if(!bel(c))continue;staff(c);const sd=c.side,en=sd==='B'?'REDFOR':'BLUEFOR';
    if(rn()<.0012){const h=who(c.ldr.HEAD),r=rn();let txt,out;
      if(r<.5)out='PREVENTED',txt='Security services in '+c.n+' say they prevented a plot against '+h.name+', '+h.role+'.';
      else if(r<.8)out='FAILED',txt='An attempt on the life of '+h.name+', '+h.role+', fails; '+h.name+' is unhurt.';
      else if(r<.92){out='WOUNDED';h.hist.push([st.t,'wounded in an assassination attempt']);txt=h.name+', '+h.role+', is wounded in an assassination attempt and is expected to recover.';}
      else{out='KILLED';const n=replace(c,'HEAD','killed in an assassination');txt=h.name+', '+h.role+', is killed in an assassination. '+n.name+' takes over as '+n.role+' under the succession rules.';
        if(c.sup!=null){if(rn()<.6)c.sup=Math.min(1,c.sup+.08);else if(c.stab!=null)c.stab=Math.max(0,c.stab-.12);}}
      const claim=rn()<.5?en+' is blamed by the government; '+en+' denies involvement.':'Several groups claim responsibility; none of the claims is verified.';
      W.emit('ASSASSINATION',{e:[c.a3],cf:'REPORTED',txt:txt+' '+claim});if(out!=='PREVENTED'&&st.nat)st.nat.coh[sd]=Math.min(1,st.nat.coh[sd]+.01);}
    if(rn()<.004&&c.ecn){const part=rn()<.6,what=rn()<.5?'a power substation':'a fuel pipeline';c.ecn.infra=Math.max(.2,c.ecn.infra-(part?.02:.005));
      W.emit('SABOTAGE',{e:[c.a3],cf:'REPORTED',txt:'Sabotage at '+what+' in '+c.n+(part?': partly successful, supply interrupted for days':': disrupted before serious damage')+'. Responsibility is disputed.'});}
    if(rn()<.003&&c.ecn){c.ecn.trans=Math.max(.2,c.ecn.trans-.03);if(c.sup!=null)c.sup=Math.max(0,c.sup-.01);
      W.emit('TRANSPORT',{e:[c.a3],cf:'REPORTED',txt:'An attack on a rail line in '+c.n+' halts freight and passenger services; repairs and investigations under way.'});}}}
/* ------------------------------------------------------------------ personality into decisions */
{const _m=W.mod;W.mod=(p,f,s)=>{let k=_m(p,f,s);const c=f.cmd&&who(f.cmd[p.a3]);if(c&&c.st==='IN OFFICE')k*=c.skill;return k;};}
W.atkK=p=>{const h=p.ldr&&who(p.ldr.HEAD);return h?1+.3*(h.caution-.5)-.2*(h.resolve-.5):1;};
W.pragK=p=>{const h=p.ldr&&who(p.ldr.HEAD);return h?1-.4*(h.prag-.5):1;};
/* ------------------------------------------------------------------ your service record */
const AWARDS=[['FIRST','Combat Sortie Ribbon','for a first combat sortie'],['ACE5','Air Combat Medal','for five aerial victories'],['GND10','Ground Support Medal','for ten ground targets in support of troops'],['S25','Long Service Clasp','for twenty-five sorties'],['RESCUE','Recovery Badge','for returning to duty after an ejection']];
function career(){const s=L();const WS=window.WSORTIE&&WSORTIE.WS;if(!WS||!WS.me)return null;const a3=WS.me;
  if(!s.career||s.career.a3!==a3)s.career={a3,name:((typeof $!=='undefined'&&$('#cs')&&$('#cs').value)||'Pilot').trim().slice(0,16),rank:1,sorties:0,air:0,gnd:0,awards:[],inq:[],st:'ACTIVE',hist:[]};return s.career;}
W.listeners.push(e=>{if(!W.st)return;const s=L();
  if(e.ty==='SORTIE'){const c=career();if(!c)return;const WS=WSORTIE.WS;c.sorties++;c.air+=WS.kills.air;c.gnd+=WS.kills.gnd;const nm=R_(c.a3,'air',c.rank);
    const award=(k)=>{if(c.awards.some(a=>a[0]===k))return;const A=AWARDS.find(a=>a[0]===k);c.awards.push([k,A[1],W.st.t]);c.hist.push([W.st.t,'awarded the '+A[1]+' '+A[2]]);W.emit('AWARD',{e:[c.a3],txt:nm+' '+c.name+' is awarded the '+A[1]+' '+A[2]+'.'});};
    if(c.sorties===1)award('FIRST');if(c.air>=5)award('ACE5');if(c.gnd>=10)award('GND10');if(c.sorties>=25)award('S25');if(WS.lost&&c.st==='ACTIVE'&&c.sorties>1)award('RESCUE');
    const need=[0,3,8,16,30,50][c.rank+0]||1e9;if(c.st==='ACTIVE'&&c.sorties>=need&&c.rank<5&&!c.inq.some(q=>q.st==='OPEN')){c.rank++;c.hist.push([W.st.t,'promoted to '+R_(c.a3,'air',c.rank)]);W.emit('PROMOTION',{e:[c.a3],txt:c.name+' is promoted to '+R_(c.a3,'air',c.rank)+'.'});}}
  if(e.ty==='PLAYER_HARM'){const c=career();if(!c)return;c.inq.push({t:W.st.t,cat:e.rec.cat,n:e.rec.n,st:'OPEN',due:W.st.t+24*7});c.hist.push([W.st.t,'inquiry opened into civilian harm ('+e.rec.cat.toLowerCase()+')']);}});
function inquiries(){const c=L().career;if(!c)return;for(const q of c.inq){if(q.st!=='OPEN'||W.st.t<q.due)continue;
  if(q.cat==='CIVILIAN_AREA'){q.st='FINDING';c.st='GROUNDED';c.hist.push([W.st.t,'grounded: the inquiry finds weapons released on a civilian area with no military objective']);
    W.emit('INQUIRY',{e:[c.a3],txt:c.name+'\'s inquiry finds weapons were released on a civilian area with no military objective nearby. The pilot is grounded pending a court-martial.'});}
  else{q.st='CLEARED';c.hist.push([W.st.t,'inquiry: the strike was on a military objective; the harm is recorded and the targeting procedure reviewed']);
    W.emit('INQUIRY',{e:[c.a3],txt:c.name+'\'s inquiry finds the strike was aimed at a military objective; the civilian harm stays on record and the procedure is reviewed.'});}}}
W.daily.push(()=>{if(!W.st||W.st.over)return;for(const c of Object.values(W.st.c))if(bel(c))staff(c);commanders();incidents();inquiries();});
if(window.WSORTIE){const _s=WSORTIE.start;WSORTIE.start=async function(){const c=W.st&&W.st.lead&&W.st.lead.career;if(c&&c.st==='GROUNDED'&&c.a3===arguments[0]){flash('YOU ARE GROUNDED PENDING A COURT-MARTIAL',3500);return;}return _s.apply(this,arguments);};}
W.lead={REG,POOL,RANKS,TRAD,rank:R_,person,staff,who,career,commanders,incidents,AWARDS};
})();
