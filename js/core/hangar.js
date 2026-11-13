"use strict";
/* =====================================================================================================================
   v292 — Hangar aircraft index.
   The old picker was one horizontal strip with every variant of every jet in it (75 cards per side). This replaces it with a
   vertical index: search, nation and role filters, jets grouped under their family (F-16 FALCON, SU-27 FLANKER ...) with the
   variants listed under the family, one line each. The family of the selected jet is open; searching or filtering opens every
   family that has a match. Same selection logic as before (own jet / bandit, AUTO for the bandit, team filter).
   ===================================================================================================================== */
(function(){
if(typeof EDS==='undefined'||typeof ACS==='undefined'||typeof teamOK!=='function'){console.warn('[hangar] core missing');return;}
// family, nation of the family (US / RU / CN / EU / OT = other allied), members in service order
const FAMS=[
 ['F-16 FALCON','US',['F-16','F-16C','F-16V','F-16E','F-16I']],
 ['F-15 EAGLE','US',['F-15C','F-15E','F-15I','F-15EX']],
 ['F-14 TOMCAT','US',['F-14A','F-14B','F-14D']],
 ['F/A-18 HORNET','US',['F-18C','F-18E','F-18F','EA-18G']],
 ['F-4 PHANTOM II','US',['F-4B','F-4J','F-4E']],
 ['F-22 / F-35','US',['F-22','F-35A']],
 ['F-5 / F-20','US',['F-5A','F-5E','F-20']],
 ['CENTURY SERIES','US',['F-100A','F-101B','F-102A','F-104G','F-104S','F-105D','F-106A']],
 ['F-86 / F-8','US',['F-86F','F-8E']],
 ['ATTACK','US',['A-4E','A-6E','A-7D','A-10C','A-37B','F-111F']],
 ['HARRIER','EU',['Harrier GR.3','Harrier GR.9','Sea Harrier FRS.1','Sea Harrier FA2','AV-8B']],
 ['TORNADO','EU',['Tornado GR.4','Tornado ECR','Tornado F.3']],
 ['BRITISH COLD WAR','EU',['Hunter F.6','Lightning F.6','Buccaneer S.2B','Jaguar']],
 ['DASSAULT','EU',['Mirage III','Mirage 5','Mirage F1','Mirage 2000','Mirage 2000-5','Mirage 2000D','Super Etendard','Rafale']],
 ['SAAB','EU',['J 35F','AJS-37','JA 37','JAS-39C','JAS-39E']],
 ['EUROPEAN JOINT','EU',['EF-2000','Alpha Jet','AMX','M-346FA']],
 ['KFIR','OT',['Kfir C2','Kfir Block 60']],
 ['ASIA-PACIFIC','OT',['F-2A','KF-21','FA-50','Tejas Mk1A','F-CK-1']],
 ['SU-27 FLANKER','RU',['Su-27','Su-27SM','Su-30SM','Su-30MK2','Su-30MKI','Su-30MKM','Su-33','Su-35S','Su-34']],
 ['SU-57','RU',['Su-57']],
 ['MIG-29 FULCRUM','RU',['MiG-29','MiG-29S','MiG-29SMT','MiG-29K','MiG-35']],
 ['MIG-25 / 31','RU',['MiG-25','MiG-31','MiG-31BM']],
 ['MIG-21 / 23 / 27','RU',['MiG-21','MiG-21MF','MiG-23','MiG-27K']],
 ['MIG-15 / 17 / 19','RU',['MiG-15','MiG-17F','MiG-19']],
 ['SU-25 FROGFOOT','RU',['Su-25','Su-25T','Su-25SM3']],
 ['SU-24 / 22 / 7','RU',['Su-24M','Su-22M4','Su-7BMK']],
 ['PVO INTERCEPTORS','RU',['Su-15TM','Yak-28P','Tu-128']],
 ['YAKOVLEV','RU',['Yak-38','Yak-141','Yak-130']],
 ['ROTORCRAFT · KAMOV','RU',['Ka-50']],
 ['ROTORCRAFT · APACHE','US',['AH-64A']],
 ['J-11 / J-15 / J-16','CN',['J-11','J-11B','J-15T','J-16']],
 ['J-20 / J-35','CN',['J-20','J-35']],
 ['J-10 / JF-17','CN',['J-10C','JF-17']],
 ['J-7 / J-8 / J-6','CN',['J-7G','J-8F','J-6']],
 ['JH-7 / Q-5','CN',['JH-7','JH-7A','Q-5']]];
// role: AS air superiority · MR multirole · ST strike · CS close support · IN interceptor · EW electronic attack · LT light fighter / trainer
const ROLE={'F-16':'AS','F-16C':'MR','F-16V':'MR','F-16E':'MR','F-16I':'MR','F-15C':'AS','F-15E':'ST','F-15I':'ST','F-15EX':'MR','F-14A':'AS','F-14B':'AS','F-14D':'AS',
 'F-18C':'MR','F-18E':'MR','F-18F':'MR','EA-18G':'EW','F-4B':'AS','F-4J':'AS','F-4E':'MR','F-22':'AS','F-35A':'MR','F-5A':'LT','F-5E':'LT','F-20':'LT',
 'F-100A':'AS','F-101B':'IN','F-102A':'IN','F-104G':'ST','F-104S':'IN','F-105D':'ST','F-106A':'IN','F-86F':'AS','F-8E':'AS',
 'A-4E':'ST','A-6E':'ST','A-7D':'ST','A-10C':'CS','A-37B':'CS','F-111F':'ST','Harrier GR.3':'ST','Harrier GR.9':'ST','Sea Harrier FRS.1':'MR','Sea Harrier FA2':'MR','AV-8B':'ST',
 'Tornado GR.4':'ST','Tornado ECR':'EW','Tornado F.3':'IN','Hunter F.6':'AS','Lightning F.6':'IN','Buccaneer S.2B':'ST','Jaguar':'ST',
 'Mirage III':'MR','Mirage 5':'ST','Mirage F1':'AS','Mirage 2000':'AS','Mirage 2000-5':'MR','Mirage 2000D':'ST','Super Etendard':'ST','Rafale':'MR',
 'J 35F':'IN','AJS-37':'ST','JA 37':'IN','JAS-39C':'MR','JAS-39E':'MR','EF-2000':'MR','Alpha Jet':'LT','AMX':'ST','M-346FA':'LT',
 'Kfir C2':'MR','Kfir Block 60':'MR','F-2A':'MR','KF-21':'MR','FA-50':'LT','Tejas Mk1A':'MR','F-CK-1':'MR',
 'Su-27':'AS','Su-27SM':'AS','Su-30SM':'MR','Su-30MK2':'MR','Su-30MKI':'MR','Su-30MKM':'MR','Su-33':'AS','Su-35S':'MR','Su-34':'ST','Su-57':'MR',
 'MiG-29':'AS','MiG-29S':'AS','MiG-29SMT':'MR','MiG-29K':'MR','MiG-35':'MR','MiG-25':'IN','MiG-31':'IN','MiG-31BM':'IN',
 'MiG-21':'AS','MiG-21MF':'AS','MiG-23':'AS','MiG-27K':'ST','MiG-15':'AS','MiG-17F':'AS','MiG-19':'AS','Su-25':'CS','Su-25T':'CS','Su-25SM3':'CS',
 'Su-24M':'ST','Su-22M4':'ST','Su-7BMK':'ST','Su-15TM':'IN','Yak-28P':'IN','Tu-128':'IN','Yak-38':'ST','Yak-141':'MR','Yak-130':'LT','Ka-50':'HC','AH-64A':'HC',
 'J-11':'AS','J-11B':'AS','J-15T':'MR','J-16':'MR','J-20':'AS','J-35':'MR','J-10C':'MR','JF-17':'MR','J-7G':'AS','J-8F':'IN','J-6':'AS','JH-7':'ST','JH-7A':'ST','Q-5':'CS'};
const ROLES=[['AS','AIR SUPERIORITY'],['MR','MULTIROLE'],['ST','STRIKE'],['CS','CLOSE SUPPORT'],['IN','INTERCEPTOR'],['EW','ELECTRONIC ATTACK'],['LT','LIGHT / TRAINER'],['HC','ATTACK HELICOPTER']];
const NATS=[['US','US'],['EU','EUROPE'],['RU','RUSSIA'],['CN','CHINA'],['OT','OTHER']];
// v320 — jets added by the hangar batches (MJ.NEW) join their parent's family and role unless FAMFIX moves them
const FAMFIX={'F-117A':'F-22 / F-35','Il-28':'LIGHT BOMBERS','Lavi':'KFIR','Nesher':'KFIR','Kaan':'ASIA-PACIFIC','Marut':'ASIA-PACIFIC','Hurjet':'ASIA-PACIFIC','Tejas Mk2':'ASIA-PACIFIC','F-2B':'ASIA-PACIFIC',
 'Saab 29':'SAAB','Saab 32':'SAAB','Saab 105':'SAAB','G.91':'EUROPEAN JOINT','J-22 Orao':'EUROPEAN JOINT','CF-105':'CANADIAN','CF-100':'CANADIAN',
 'Javelin FAW.9':'BRITISH COLD WAR','Sea Vixen FAW.2':'BRITISH COLD WAR','Sea Venom':'BRITISH COLD WAR','Swift F.7':'BRITISH COLD WAR','Gnat F.1':'BRITISH COLD WAR','Vampire FB.5':'BRITISH COLD WAR','Meteor F.8':'BRITISH COLD WAR',
 'Phantom FGR.2':'F-4 PHANTOM II','Vautour IIN':'DASSAULT','Mystere IVA':'DASSAULT','Super Mystere':'DASSAULT','Mirage IV':'DASSAULT','Mirage 4000':'DASSAULT',
 'F-89J':'F-86 / F-8','F-94C':'F-86 / F-8','F9F-2':'F-86 / F-8','F9F-8':'F-86 / F-8','F-84F':'F-86 / F-8','F3H-2':'F-86 / F-8','F-8J':'F-86 / F-8','EA-6B':'ATTACK','Su-39':'SU-25 FROGFOOT'};
const FAMROLE={'EA-6B':'EW','EF-111A':'EW','F-4G':'EW','F-105G':'EW','Il-28':'ST','Canberra':'ST','Su-24MR':'ST','RF-4C':'ST','Mirage F1CR':'ST','Hurjet':'LT','Saab 105':'LT','CF-100':'IN','CF-105':'IN','F-89J':'IN','F-94C':'IN','Javelin FAW.9':'IN','Sea Vixen FAW.2':'IN','Su-9':'IN','Su-11':'IN','Yak-25':'IN','Lightning F.1':'IN','F-106B':'IN','F-101A':'ST','F-104C':'ST','A-10A':'CS','Su-25UB':'CS','Su-39':'CS'};
try{const fam=n=>FAMS.find(f=>f[0]===n);
  if(!fam('LIGHT BOMBERS'))FAMS.push(['LIGHT BOMBERS','RU',[]]);if(!fam('CANADIAN'))FAMS.push(['CANADIAN','OT',[]]);
  for(const sp of (window.MJ&&window.MJ.NEW)||[]){const id=sp.id;if(FAMS.some(f=>f[2].includes(id)))continue;
    const f=fam(FAMFIX[id])||FAMS.find(f=>f[2].includes(sp.src));if(f)f[2].push(id);
    if(!ROLE[id])ROLE[id]=FAMROLE[id]||ROLE[sp.src]||'MR';}
}catch(e){console.warn('[hangar] families',e);}
const FAMOF={},NATOF={};for(const [n,c,l] of FAMS)for(const t of l){FAMOF[t]=n;NATOF[t]=c;}

const S={own:{q:'',nat:'',role:'',open:new Set()},foe:{q:'',nat:'',role:'',open:new Set()}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function build(E){const st=S[E.side],root=E.root;let ix=root.querySelector('.ix');
  const cur=E.side==='own'?game.ac:game.foe,own=E.side==='own';
  let list=own?ACS.filter(teamOK):ACS.filter(t=>!teamOK(t));
  const total=list.length,q=st.q.trim().toLowerCase();
  const match=t=>{if(st.nat&&(NATOF[t]||'OT')!==st.nat)return false;if(st.role&&(ROLE[t]||'')!==st.role)return false;
    if(q){const hay=(t+' '+AC[t].name+' '+(FAMOF[t]||'')).toLowerCase();if(!q.split(/\s+/).every(w=>hay.includes(w)))return false;}return true;};
  const shown=list.filter(match);
  if(!ix){ix=document.createElement('div');ix.className='ix';root.insertBefore(ix,root.firstChild);
    ix.innerHTML='<div class="ix-h"><b>AIRCRAFT INDEX</b><span class="ix-n"></span></div><input type="text" class="ix-q" placeholder="SEARCH  ·  F-16, FLANKER, MIG-29K" autocomplete="off" spellcheck="false" aria-label="Search aircraft">'
      +'<div class="ix-f ix-nat"></div><div class="ix-f ix-role"></div><div class="ix-l" role="listbox" aria-label="Aircraft"></div>';
    const qi=ix.querySelector('.ix-q');qi.addEventListener('input',()=>{st.q=qi.value;build(E);});qi.addEventListener('keydown',e=>{e.stopPropagation();
      if(e.key==='Enter'){const f=ix.querySelector('.ix-r:not(.off)');if(f)f.click();}if(e.key==='Escape'){qi.value='';st.q='';build(E);}});
    qi.addEventListener('keyup',e=>e.stopPropagation());}
  ix.querySelector('.ix-n').textContent=(shown.length===total?total:shown.length+' / '+total)+' AIRCRAFT';
  const chips=(box,items,key,all)=>{box.textContent='';const mk=(v,l,t)=>{const b=document.createElement('button');b.textContent=l;if(t)b.title=t;b.className=st[key]===v?'on':'';b.onclick=()=>{st[key]=st[key]===v&&v?'':v;build(E);};box.append(b);};
    mk('',all);for(const [v,l] of items)mk(v,key==='role'?v:l,key==='role'?l:'');};
  chips(ix.querySelector('.ix-nat'),NATS,'nat','ALL');chips(ix.querySelector('.ix-role'),ROLES,'role','ANY ROLE');
  const L=ix.querySelector('.ix-l');L.textContent='';
  const row=(t,label,sub,on)=>{const b=document.createElement('button');b.className='ix-r'+(on?' on':'');b.setAttribute('role','option');b.setAttribute('aria-selected',on?'true':'false');
    b.innerHTML='<span class="ix-nm">'+esc(label)+'</span><span class="ix-rl">'+esc(sub)+'</span>';
    b.onclick=()=>{if(own)game.ac=t;else game.foe=t;E.sel=null;hqPersist();hqRefresh();};return b;};
  if(!own&&!q&&!st.nat&&!st.role){const a=row('AUTO','AUTO · MATCH TO YOUR JET',(FOE[game.ac]&&AC[FOE[game.ac]]?AC[FOE[game.ac]].name.split(' ')[0]:''),game.foe==='AUTO');a.classList.add('auto');L.append(a);}
  const filtering=!!(q||st.nat||st.role),inShown=new Set(shown);let selFam=FAMOF[cur]||'OTHER';
  if(st.__last!==cur){st.open.add(selFam);st.__last=cur;}
  const groups=FAMS.map(([n,c,l])=>[n,c,l.filter(t=>list.includes(t))]);
  const known=new Set(FAMS.flatMap(f=>f[2])),rest=list.filter(t=>!known.has(t));if(rest.length)groups.push(['OTHER','OT',rest]);
  for(const [n,c,l] of groups){const sub=l.filter(match);if(!sub.length)continue;
    const open=filtering||st.open.has(n),h=document.createElement('button');h.className='ix-g'+(open?' open':'')+(l.includes(cur)?' has':'');
    h.innerHTML='<i></i><span>'+esc(n)+'</span><u>'+(filtering?sub.length+'/':'')+l.length+'</u>';
    if(!filtering)h.onclick=()=>{if(st.open.has(n))st.open.delete(n);else st.open.add(n);build(E);};else h.style.cursor='default';
    L.append(h);if(!open)continue;
    for(const t of sub)L.append(row(t,AC[t].name.replace(/ (ADF|Phantom II)$/,''),ROLE[t]||'',t===cur));}
  if(!L.children.length){const p=document.createElement('p');p.className='ix-none';p.textContent='NO AIRCRAFT MATCH';L.append(p);}
  const on=L.querySelector('.ix-r.on');if(on&&!build._noScroll){const lt=L.getBoundingClientRect(),ot=on.getBoundingClientRect();if(ot.top<lt.top||ot.bottom>lt.bottom)L.scrollTop+=ot.top-lt.top-lt.height/3;}
}
for(const side of Object.keys(EDS)){const E=EDS[side],r=E.render;
  E.render=function(){r.apply(this,arguments);try{build(E);}catch(err){console.warn('[hangar]',err);}};}
// make sure the first draw already has the index
try{for(const side of Object.keys(EDS))EDS[side].render();}catch(e){}
window.HANGAR={FAMS,ROLE,S};
console.info('[hangar] index ready');
})();
