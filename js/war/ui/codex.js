/* =====================================================================================================================
   CODEX — the INDEX tab of the main menu (v426): every aircraft, weapon, piece of kit, vehicle and country in the game,
   each with a description and a specs table.
     * Categories down the left (aircraft; air-to-air missiles; air-to-ground weapons; aircraft guns; infantry weapons;
       sidearms; launchers; attachments; body armour; armoured vehicles; countries), search across all of them.
     * Inside a category, groups (role, seeker, kind, class...) are drop-downs; every entry is a drop-down too: a short
       description written from the item's own values, then its specs.
   The values are the game's own (abstract game values, not published data); descriptions are generated from them.
   ===================================================================================================================== */
(()=>{
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const r0=x=>Math.round(x),r1=x=>Math.round(x*10)/10,km=m=>m>=1000?r1(m/1000)+' km':r0(m)+' m',deg=r=>r0(r*180/Math.PI)+'°';
const I=()=>window.INFANTRY||{};
const UI={k:'AIRCRAFT',q:'',open:new Set()};
/* ------------------------------------------------------------------ aircraft */
const ROLE=[[/E-3|A-50|E-2|KJ-|Cargo|C-130|Il-76|KC-|tank/i,'Support'],[/MiG-25|MiG-31|F-106|Lightning|J 35|Su-15|F-102|Yak-28P/i,'Interceptor'],
  [/A-10|Su-25|A-4|A-7|AV-8|Harrier|Su-24|Su-22|Su-17|MiG-27|Jaguar|Tornado|AMX|JH-7|F-111|Super Etendard|AJS|Su-34|F-117|A-6|Q-5|Yak-38|Kfir C2/i,'Attack'],
  [/Alpha Jet|L-39|Hawk|T-38|MB-339|Yak-130|K-8|L-159|FA-50|T-50|M-346|Hongdu/i,'Trainer / light combat'],[/Tu-|B-1|B-52|B-2|H-6/i,'Bomber'],
  [/MiG-15|MiG-17|MiG-19|F-86|F-100|Hunter|Mystere|Sabre|Meteor|MiG-21|F-104|F-8E|Mirage III|J-7/i,'Early jet fighter']];
const acRole=(t,a)=>a.heli?'Helicopter':(ROLE.find(([re])=>re.test(t+' '+(a.name||'')))||[0,(a.radar&&a.radar.R0>60000?'Multirole fighter':'Fighter')])[1];
function weaponsOf(t){const S=typeof STN!=='undefined'&&STN[t];return S?[...new Set(Object.values(S).flat())]:[];}
function acEntry(t,a){const role=acRole(t,a),g=a.gun||{},rd=a.radar||{},W=weaponsOf(t),m=(a.empty||0)+(a.fuel||0)*.5,tw=a.ab&&m?a.ab/(m*9.81):0,wl=a.S&&m?m/a.S:0;
  const gd=g.name&&typeof GUNDB!=='undefined'?GUNDB[g.name]:null;const aam=W.filter(w=>typeof MSL!=='undefined'&&MSL[w]),agw=W.filter(w=>typeof AGW!=='undefined'&&AGW[w]);
  const noun={Attack:'attack aircraft',Support:'support aircraft','Trainer / light combat':'trainer and light combat aircraft'}[role]||role.toLowerCase();const d=(a.name||t)+' is a'+(/^[aeiou]/.test(noun)?'n ':' ')+noun+'. '+
    (tw?'With afterburner its thrust is about '+r1(tw)+' times its weight at half fuel'+(tw>1?', enough to climb vertically':'')+', and its wing loading is '+r0(wl)+' kg/m² ('+(wl<350?'a light wing that turns well':wl<500?'a balanced wing':'a heavily loaded wing, built for speed more than turning')+'). ':'')+
    'The airframe is limited to '+(a.gLim||'?')+' g and rolls at about '+r0((a.roll||0)*57.3)+'°/s. '+
    (rd.name&&rd.R0>5000?'Its '+rd.name+' radar sees a fighter-sized target at roughly '+km(rd.R0)+'. ':'It has no air-search radar'+(rd.name?' ('+rd.name+')':'')+'. ')+(a.irst?'An infrared search-and-track sensor finds targets without emitting. ':'')+
    (g.name?'The gun is the '+g.name+(gd?' ('+gd.cal+' mm, '+gd.rpm+' rounds a minute)':'')+' with '+g.ammo+' rounds. ':'It carries no internal gun. ')+
    (W.length?'In the hangar it can carry '+(aam.length?aam.length+' air-to-air missile type'+(aam.length>1?'s':''):'')+(aam.length&&agw.length?' and ':'')+(agw.length?agw.length+' air-to-ground store'+(agw.length>1?'s':''):'')+'.':'');
  const sp=[['Role',role],['Empty mass',r0(a.empty||0)+' kg'],['Internal fuel',r0(a.fuel||0)+' kg'],a.tank?['Drop tank',r0(a.tank)+' kg'+(a.tankName?' ('+a.tankName+')':'')]:null,['Wing area',a.S+' m²'],['Wing loading (half fuel)',r0(wl)+' kg/m²'],
    ['Thrust dry / afterburner',r1((a.mil||0)/1000)+' / '+r1((a.ab||0)/1000)+' kN'],['Thrust-to-weight (half fuel)',r1(tw)],['G limit',a.gLim+' g'],['Roll rate',r0((a.roll||0)*57.3)+'°/s'],
    ['Radar',rd.name?rd.name+(rd.R0>5000?' · '+km(rd.R0):''):'none'],['IRST',a.irst?'yes':'no'],['Gun',g.name?g.name+' · '+g.ammo+' rds':'none'],['RWR',a.rwr?'type '+a.rwr:'—'],
    ['Radar cross-section',a.rcs+' m²'],['IR signature',a.irs!=null?r0(a.irs*100)+'%':'—'],['Air-to-air missiles',aam.join(', ')||'—'],['Air-to-ground stores',agw.join(', ')||'—']];
  return{g:role,n:a.name||t,id:t,sub:role+(rd.name?' · '+rd.name:''),d,sp:sp.filter(Boolean)};}
/* ------------------------------------------------------------------ missiles */
function aamEntry(k,m){const seek={IR:'Infrared homing',ARH:'Active radar homing',SARH:'Semi-active radar homing',RF:'Active radar homing',CLOS:'Command guidance'}[m.seek]||m.seek||'guided';const R=m.aiR||m.irR||0;
  const cls=R<15000?'short-range':R<60000?'medium-range':'long-range';const g=seek+' · '+cls;
  const d=k+' is a '+cls+' air-to-air missile with '+seek.toLowerCase()+'. '+(m.burn?'Its motor burns for '+r1(m.burn)+' s, ':'')+'it pulls up to '+(m.maxG||'?')+' g and flies for about '+r0(m.life||0)+' s. '+
    (R?'Pilots in this game launch it from about '+km(R)+' ('+km(m.rmin||0)+' minimum). ':'')+(m.seek==='IR'?'The seeker sees '+deg(m.gimbal||0)+' off the nose and needs the target\'s heat — flares can decoy it ('+r0((1-(m.ccm||0))*100)+'% susceptible).':'Chaff and jamming can break the lock ('+r0((1-(m.ccm||0))*100)+'% susceptible).');
  return{g:cls[0].toUpperCase()+cls.slice(1)+' · '+(m.seek==='IR'?'infrared':'radar'),n:k,id:k,sub:g,d,
    sp:[['Guidance',seek],['Class',cls],['Launch mass',(m.mass||'?')+' kg'],['Motor burn',r1(m.burn||0)+' s'],['Max load factor',(m.maxG||'?')+' g'],['Seeker field of view',deg(m.gimbal||0)],['Typical launch range',R?km(R):'—'],['Minimum range',km(m.rmin||0)],
      ['Proximity fuse',(m.fuse||'?')+' m'],['Flight time',r0(m.life||0)+' s'],['Countermeasure resistance',r0((m.ccm||0)*100)+'%'],['Radar cross-section',(m.rcs||0)+' m²']]};}
const AGK={bomb:'Unguided bomb',lgb:'Guided bomb',agm:'Air-to-ground missile',arm:'Anti-radiation missile',pod:'Rocket pod',tgp:'Targeting pod',cbu:'Cluster bomb',jdam:'Satellite-guided bomb'};
function agwEntry(k,a){const kind=AGK[a.k]||a.k;const g=a.as?'Anti-ship missile':kind;
  const d=k+' is '+(/^[AEIOU]/i.test(g)?'an ':'a ')+g.toLowerCase()+'. '+(a.mass?'It weighs '+a.mass+' kg':'')+(a.L?' and is '+a.L+' m long':'')+'. '+
    (a.soft?'Against people, trucks and light vehicles it is lethal to about '+a.soft+' m; against hardened targets to about '+(a.hard||0)+' m. ':'')+
    (a.range?'It is released from up to '+km(a.range)+' away. ':a.k==='bomb'?'It falls on a ballistic path: aim with the CCIP or CCRP cue. ':'')+
    (a.k==='tgp'?'The pod lases and tracks targets for guided bombs and missiles; it is not a weapon itself.':a.k==='arm'?'It homes on the emissions of air-defence radars.':'');
  return{g,n:k,id:k,sub:g+(a.mass?' · '+a.mass+' kg':''),d,sp:[['Type',g],['Mass',(a.mass||'—')+' kg'],['Length',(a.L||'—')+' m'],['Diameter',a.R?r0(a.R*2000)+' mm':'—'],['Lethal radius (soft)',(a.soft||'—')+' m'],['Lethal radius (hard)',(a.hard||'—')+' m'],['Range',a.range?km(a.range):'—'],['Radar cross-section',(a.rcs||'—')+' m²']]};}
function gunEntry(k,g){const d=k+' is a '+g.cal+' mm aircraft cannon with '+(g.barrels||1)+' barrel'+((g.barrels||1)>1?'s (rotary)':'')+', firing '+g.rpm+' rounds a minute'+(g.rpmLo?' ('+g.rpmLo+' in low rate)':'')+'. It weighs '+g.mass+' kg, is '+(g.drive||'')+'-driven with '+(g.feed||'')+' feed'+(g.spin?' and takes '+g.spin+' s to spin up':'')+'. Belt: '+(g.belt||[]).map(b=>b[0]).join(', ')+'.';
  return{g:(g.barrels||1)>1?'Rotary cannon':'Revolver / single-barrel cannon',n:k,id:k,sub:g.cal+' mm · '+g.rpm+' rpm',d,sp:[['Calibre',g.cal+' mm'],['Barrels',g.barrels||1],['Rate of fire',g.rpm+' rpm'+(g.rpmLo?' / '+g.rpmLo:'')],['Mass',g.mass+' kg'],['Drive',g.drive||'—'],['Feed',g.feed||'—'],['Spin-up',g.spin?g.spin+' s':'—'],['Rounds',(g.belt||[]).map(b=>b[0]+' ('+b[3]+' m/s)').join('; ')]]};}
/* ------------------------------------------------------------------ infantry kit */
const CLS={CARB:'Carbine',RIFLE:'Assault rifle',SMG:'Submachine gun',SHOT:'Shotgun',LMG:'Light machine gun',DMR:'Designated marksman rifle',SNP:'Sniper rifle',PISTOL:'Pistol'};
const CLSD={CARB:'short and handy, good in trenches and buildings',RIFLE:'the standard weapon of the rifleman, good at every range a squad fights at',SMG:'fast-firing and light, at its best inside a few dozen metres',SHOT:'devastating close up and useless far away',LMG:'belt-fed suppression for the squad, heavy and slow to aim',DMR:'accurate semi-automatic fire out to several hundred metres',SNP:'one precise shot at long range, slow to work',PISTOL:'a last-resort sidearm'};
function infEntry(id,g,side){const c=side?'PISTOL':g.cls;const d=g.n+' is '+(side?'a sidearm':'a'+(/^[AEIOU]/.test(CLS[c]||'')?'n ':' ')+(CLS[c]||c).toLowerCase())+': '+(CLSD[c]||'')+'. '+
    (g.rpm?'It fires '+g.rpm+' rounds a minute'+(g.burst?' in three-round bursts':'')+', ':'')+'each hit does '+g.dmg+' damage'+(g.pel?' (×'+g.pel+' pellets)':'')+', from a '+g.mag+'-round magazine.'+(g.am?' Anti-materiel: it goes through light cover and soft vehicles.':'')+(g.auto?' It fires fully automatic.':'');
  return{g:side?'Sidearms':CLS[c]||c,n:g.n,id,sub:(side?'Sidearm':CLS[c]||c)+' · '+g.mag+' rds',d,sp:[['Class',side?'Pistol':CLS[c]||c],['Damage per hit',g.dmg+(g.pel?' × '+g.pel:'')],['Rate of fire',g.rpm?g.rpm+' rpm':'semi-automatic'],['Magazine',g.mag+' rounds'],['Mode',g.burst?'3-round burst':g.auto||g.rpm>300?'automatic':'semi-automatic'],g.am?['Anti-materiel','yes']:null].filter(Boolean)};}
function lauEntry(k,l){if(k==='NONE')return null;const d=l.n+' is the squad\'s answer to armour and bunkers. '+(l.dmg?'Its warhead does '+l.dmg+' damage':'')+(l.pen?' and penetrates about '+l.pen+' mm of armour':'')+'. '+(l.guided?'It is guided all the way to the target.':'It flies straight: lead a moving target.')+(l.aa?' It is a shoulder-fired anti-aircraft missile.':'');
  const sp=[['Type',l.aa?'MANPADS':l.guided?'Guided anti-tank missile':'Rocket launcher']];for(const[a,b,u]of[['dmg','Damage',''],['pen','Penetration',' mm'],['mag','Rounds',''],['rng','Range',' m'],['spd','Speed',' m/s']])if(l[a]!=null)sp.push([b,l[a]+u]);
  return{g:sp[0][1],n:l.n,id:k,sub:sp[0][1],d,sp};}
function attEntries(){const A=I().ATT;if(!A)return[];const L=[];const SL={optic:'Optics',muzzle:'Muzzle devices',under:'Underbarrel',laser:'Lasers and lights',stock:'Stocks',mag:'Magazines'};
  for(const sl in A)for(const k in A[sl]){const a=A[sl][k];if(/NONE|IRON|STD/.test(k))continue;const sp=[['Slot',SL[sl]||sl]];for(const[x,y]of Object.entries(a))if(x!=='n'&&typeof y!=='object')sp.push([({mag:'Magnification',ret:'Reticle',scope:'Full scope',vari:'Variable zoom',low:'Low power',therm:'Thermal',rec:'Recoil',spr:'Spread',ads:'Aim speed',snd:'Sound',kg:'Mass (kg)'}[x]||x),y===1||y===true?'yes':y]);
    const d=a.n+' — '+(sl==='optic'?(a.scope?'a magnified scope ('+a.mag+'×'+(a.vari?', variable from '+a.low+'×':'')+(a.therm?', thermal':'')+'): you look through it, the world beyond the tube is hidden.':'an open sight ('+a.mag+'×): the dot sits on the glass and you keep both eyes on the battlefield.'):sl==='muzzle'?'changes how the shot sounds and how the rifle climbs.':sl==='under'?'mounted under the barrel.':sl==='laser'?'a beam or light for aiming and seeing in the dark.':'a fitting for the rifle.');
    L.push({g:SL[sl]||sl,n:a.n,id:sl+k,sub:SL[sl]||sl,d,sp});}return L;}
function armEntries(){const X=I();const L=[];for(const[grp,O,zone]of[['Helmets',X.HELM,'the head'],['Body armour',X.VEST,'the torso'],['Limb protection',X.EXTRA,'the arms and legs']]){if(!O)continue;for(const[k,a]of Object.entries(O)){if(k==='NONE')continue;
  const p=r0((1-a.k)*100);L.push({g:grp,n:a.n,id:grp+k,sub:p+'% · '+a.kg+' kg',d:a.n+' protects '+zone+': it stops about '+p+'% of the damage of a hit there, and adds '+a.kg+' kg to what you carry (heavier kit slows you down).',sp:[['Protects',zone],['Damage stopped',p+'%'],['Mass',a.kg+' kg']]});}}return L;}
function vehEntries(){const X=I(),V=X.VC,A=X.ARMT;if(!V)return[];const C={MBT:'Main battle tank',IFV:'Infantry fighting vehicle',APC:'Armoured personnel carrier',SPG:'Self-propelled gun',AA:'Air-defence vehicle'};const F={SOV:'Soviet / Russian school',NATO:'Western school'};
  return Object.entries(V).map(([k,v])=>{const a=A&&A[v.cls]||null;const c=C[v.cls]||v.cls;
    const d=k+' is a '+c.toLowerCase()+' of the '+(F[v.fam]||v.fam||'')+' design'+(v.crew?', with a crew of '+v.crew:'')+'. '+(v.lay?'Its gun is fed by '+(v.lay==='carousel'?'an autoloader carousel under the turret (fast, but the ammunition sits in the crew compartment)':v.lay==='bustle'?'a loader from a bustle magazine with blow-out panels':v.lay)+'. ':'')+(v.era?'It wears '+v.era+' explosive reactive armour. ':'')+(a?'Its turret front is worth about '+a.turret.front+' mm against kinetic rounds; the sides are much thinner ('+a.hull.side+' mm on the hull).':'');
    const sp=[['Type',c],['Design school',F[v.fam]||v.fam||'—'],['Crew',v.crew||'—'],['Loading',v.lay||'—'],['Reactive armour',v.era||'none'],['Armour factor',v.arm!=null?v.arm:'—']];
    if(a){for(const p of['hull','turret'])for(const f of['front','side','rear','top'])sp.push([p[0].toUpperCase()+p.slice(1)+' '+f,a[p][f]+' mm']);}
    return{g:c,n:k,id:k,sub:c+(v.crew?' · crew '+v.crew:''),d,sp};});}
function countryEntries(){if(!window.WGEO||!WGEO.countries)return[];const W=window.WWAR,st=W&&W.st;return WGEO.countries.map(c=>{const P=window.NATDATA&&NATDATA.POL[c.a3],E=(window.NATDATA&&NATDATA.EQ[c.a3])||{},p=st&&st.c[c.a3];
  const side=p&&p.side?(p.side==='B'?'BLUEFOR':'REDFOR'):'Not at war';const g=p&&p.side?side+' · '+(p.al||'').toLowerCase():'Not at war';
  const d=c.n+(P?' is governed as a '+P.sys.replace(/_/g,' ').toLowerCase()+(P.hs?', head of state '+P.hs:'')+'.':'.')+(E.FTR4||E.MBT?' Its forces field '+[E.FTR4&&('fighters: '+E.FTR4),E.MBT&&('tanks: '+E.MBT),E.IFV&&('IFVs: '+E.IFV)].filter(Boolean).join('; ')+'.':'')+(p&&p.side?' In the war it fights for '+side+' with about '+r0(p.air)+' combat aircraft and '+p.gnd.toFixed(1)+' brigades.':'');
  const sp=[['In the war',side]];if(P){sp.push(['System',P.sys.replace(/_/g,' ').toLowerCase()]);if(P.hs)sp.push(['Head of state',P.hs]);if(P.hg)sp.push(['Head of government',P.hg]);}
  for(const[k,l]of[['FTR4','Fighters'],['FTR5','5th-gen fighters'],['ATK','Attack aircraft'],['HEL','Attack helicopters'],['MBT','Tanks'],['IFV','IFVs'],['APC','APCs'],['SPG','Artillery'],['MLRS','Rocket artillery'],['LRSAM','Long-range SAM']])if(E[k])sp.push([l,E[k]]);
  if(p&&p.pop)sp.push(['Population',(p.pop/1e6).toFixed(1)+' million']);
  return{g:g,n:c.n,id:c.a3,sub:side,d,sp};});}
/* ------------------------------------------------------------------ air defence */
const PR=()=>typeof PROF!=='undefined'?PROF:{};
function samSet(){const S=new Set(Object.values(PR()).map(p=>p.msl).filter(Boolean));if(typeof MSL!=='undefined')for(const k of Object.keys(MSL))if(/^FIM-|^9M3(2|6|42)\b|^9M342|^9M36|^9M32/.test(k))S.add(k);return S;}
function adEntry(k,p){const rmax=p.rmax||0,cls=p.am===6||rmax<=12000?'Short range':rmax<=45000?'Medium range':'Long range';const ship=/^(DDGB|FFGB|CGR)$/.test(k);
  const parts=typeof GTY!=='undefined'?Object.values(GTY).filter(g=>g.n&&g.n.includes('('+p.nm+')')).map(g=>g.n.replace(/ \(.*\)$/,'')):[];const m=typeof MSL!=='undefined'&&MSL[p.msl];
  const d=p.nm+' is a'+(cls[0]==='S'?' ':' ')+cls.toLowerCase()+' surface-to-air missile system'+(ship?' carried by warships':p.self?' on a single vehicle that finds, tracks and fires on its own':' made of a radar, a command post and launchers')+'. '+
    'Its radar picks up aircraft at about '+km(p.R0||0)+'; it engages from '+km(p.rmin||0)+' out to '+km(rmax)+', between '+km(p.amin||0)+' and '+km(p.amax||0)+' of altitude. '+
    'It fires '+(p.salvo||1)+'-missile salvoes '+(p.gap?p.gap+' s apart ':'')+'and can guide against '+(p.maxAir||1)+' target'+((p.maxAir||1)>1?'s':'')+' at once; reloading takes about '+(p.reload||'?')+' s. '+(p.acq?'From first detection it needs about '+p.acq+' s to lock and launch — fly low and fast to shrink that window. ':'')+(p.floor?'Below '+p.floor+' m it cannot see you.':'');
  const sp=[['Class',cls+(ship?' · naval':'')],['Missile',p.msl+(m&&m.mass?' ('+m.mass+' kg)':'')],['Search radar range',km(p.R0||0)],['Engagement range',km(p.rmin||0)+' – '+km(rmax)],['Altitude band',km(p.amin||0)+' – '+km(p.amax||0)],['Radar floor',(p.floor||0)+' m'],
    ['Time to launch',(p.acq||'—')+' s'],['Salvo',(p.salvo||1)+' missiles'+(p.gap?', '+p.gap+' s apart':'')],['Targets at once',p.maxAir||1],['Reload',(p.reload||'—')+' s'],['Self-contained vehicle',p.self?'yes':'no']];if(parts.length)sp.push(['Site vehicles',parts.join('; ')]);
  return{g:ship?'Naval':cls,n:p.nm,id:k,sub:cls+' · '+p.msl,d,sp};}
function samEntry(k,m){const sys=Object.values(PR()).filter(p=>p.msl===k).map(p=>p.nm);const man=/^FIM-|^9M3(2|6|42)/.test(k)&&!sys.length;const R=m.aiR||m.irR||0;
  const seek={IR:'infrared homing',ARH:'active radar homing',SARH:'semi-active radar homing',RF:'radar homing',CLOS:'command guidance'}[m.seek]||String(m.seek||'guided').toLowerCase();
  const d=k+' is '+(man?'a shoulder-fired (MANPADS) missile':'the missile of '+(sys.join(' / ')||'a surface-to-air system'))+', with '+seek+'. It weighs '+(m.mass||'?')+' kg'+(m.burn?', its motor burns '+r1(m.burn)+' s':'')+', it pulls up to '+(m.maxG||'?')+' g and flies for about '+r0(m.life||0)+' s'+(R?'; its effective reach is about '+km(R):'')+'. '+(m.seek==='IR'?'Flares can decoy it.':'Chaff, jamming and hard turns at the right moment can defeat it.');
  return{g:man?'Shoulder-fired (MANPADS)':(R>60000?'Long range':R>15000?'Medium range':'Short range'),n:k,id:k,sub:(man?'MANPADS':sys.join(' / '))+' · '+seek,d,
    sp:[['Fired by',man?'infantry (shoulder-fired)':sys.join(', ')||'—'],['Guidance',seek],['Launch mass',(m.mass||'?')+' kg'],['Motor burn',r1(m.burn||0)+' s'],['Max load factor',(m.maxG||'?')+' g'],['Flight time',r0(m.life||0)+' s'],['Effective range',R?km(R):'—'],['Minimum range',km(m.rmin||0)],['Proximity fuse',(m.fuse||'?')+' m']]};}
/* ------------------------------------------------------------------ categories */
const CATS=[
 ['AIRCRAFT','Every flyable aircraft: role, performance, sensors, gun and what it carries.',()=>Object.entries(typeof AC!=='undefined'?AC:{}).filter(([t,a])=>a.model&&!a.gnd&&!a.sam).map(([t,a])=>acEntry(t,a))],
 ['AIR-TO-AIR MISSILES','Missiles for air combat, by range and seeker.',()=>{if(typeof MSL==='undefined')return[];const SS=samSet();return Object.entries(MSL).filter(([k])=>!SS.has(k)).map(([k,m])=>aamEntry(k,m));}],
 ['AIR DEFENCE SYSTEMS','Surface-to-air missile systems on land and at sea: radars, envelopes, salvoes.',()=>Object.entries(PR()).map(([k,p])=>adEntry(k,p))],
 ['SURFACE-TO-AIR MISSILES','The missiles those systems fire, and shoulder-fired missiles.',()=>{if(typeof MSL==='undefined')return[];const SS=samSet();return [...SS].filter(k=>MSL[k]).map(k=>samEntry(k,MSL[k]));}],
 ['AIR-TO-GROUND','Bombs, missiles, rockets and pods for ground and sea targets.',()=>typeof AGW!=='undefined'?Object.entries(AGW).map(([k,a])=>agwEntry(k,a)):[]],
 ['AIRCRAFT GUNS','Internal cannon of the aircraft.',()=>typeof GUNDB!=='undefined'?Object.entries(GUNDB).map(([k,g])=>gunEntry(k,g)):[]],
 ['INFANTRY WEAPONS','Rifles, carbines, machine guns and more, by class.',()=>Object.entries(I().GUNS||{}).map(([k,g])=>infEntry(k,g,false))],
 ['SIDEARMS','Pistols carried by every soldier.',()=>Object.entries(I().SIDES||{}).map(([k,g])=>infEntry(k,g,true))],
 ['LAUNCHERS','Anti-tank and anti-aircraft weapons of the squad.',()=>Object.entries(I().LAU||{}).map(([k,l])=>lauEntry(k,l)).filter(Boolean)],
 ['ATTACHMENTS','Optics, muzzle devices, grips, lasers.',attEntries],
 ['BODY ARMOUR','Helmets, plates and limb protection.',armEntries],
 ['ARMOURED VEHICLES','Tanks and fighting vehicles: crew, loading, armour.',vehEntries],
 ['COUNTRIES','Government, equipment and their place in the war.',countryEntries]];
const cache={};const list=k=>cache[k]||(cache[k]=(()=>{try{return CATS.find(c=>c[0]===k)[2]();}catch(e){console.warn('[codex]',k,e);return[];}})());
function entry(x,k){const id=k+'|'+x.id,op=UI.open.has(id)||!!UI.q&&UI.q.length>2;
  return'<details class="cx-e" data-cxe="'+esc(id)+'"'+(op?' open':'')+'><summary><b>'+esc(x.n)+'</b><span>'+esc(x.sub||'')+'</span></summary><p>'+esc(x.d)+'</p><table>'+x.sp.map(r=>'<tr><th>'+esc(r[0])+'</th><td>'+esc(r[1])+'</td></tr>').join('')+'</table></details>';}
function render(){const el=document.getElementById('pIndex');if(!el)return;const q=UI.q.toLowerCase();
  const cats=CATS.map(c=>{const L=list(c[0]);return[c,q?L.filter(x=>(x.n+' '+x.sub+' '+x.d).toLowerCase().includes(q)).length:L.length];});
  const cur=CATS.find(c=>c[0]===UI.k);let L=list(UI.k);if(q)L=L.filter(x=>(x.n+' '+x.sub+' '+x.d).toLowerCase().includes(q));
  const G=new Map();for(const x of L.sort((a,b)=>String(a.n).localeCompare(String(b.n)))){if(!G.has(x.g))G.set(x.g,[]);G.get(x.g).push(x);}
  const gs=[...G.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  el.innerHTML='<div class="cx"><nav class="cx-nav" aria-label="Index categories">'+cats.map(([c,n])=>'<button data-cxk="'+c[0]+'" aria-pressed="'+(UI.k===c[0])+'"><b>'+c[0]+'</b><em>'+n+'</em></button>').join('')+'</nav>'+
    '<div class="cx-main"><header class="cx-h"><div><div class="cx-mk">INDEX</div><h2>'+esc(cur[0])+'</h2><div class="cx-ds">'+esc(cur[1])+'</div></div><input id="cxQ" type="search" placeholder="SEARCH ALL CATEGORIES" value="'+esc(UI.q)+'" aria-label="Search the index"></header>'+
    '<div class="cx-list">'+(gs.length?gs.map(([g,xs])=>{const gid='G|'+UI.k+'|'+g,op=UI.open.has(gid)||gs.length===1||!!q;return'<details class="cx-g" data-cxg="'+esc(gid)+'"'+(op?' open':'')+'><summary><span>'+esc(g)+'</span><em>'+xs.length+'</em></summary>'+xs.slice(0,250).map(x=>entry(x,UI.k)).join('')+(xs.length>250?'<div class="cx-more">… '+(xs.length-250)+' more: refine the search</div>':'')+'</details>';}).join(''):'<div class="cx-more">Nothing matches “'+esc(UI.q)+'” here'+(q?' — the counts on the left show where it is':'')+'.</div>')+
    '</div><div class="cx-fine">Abstract game values used by the simulation, not published data. Descriptions are written from those values.</div></div></div>';}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#pIndex [data-cxk]');if(b){UI.k=b.dataset.cxk;render();const m=document.querySelector('#pIndex .cx-list');if(m)m.scrollTop=0;}});
document.addEventListener('toggle',e=>{const d=e.target;if(!d||!d.closest||!d.closest('#pIndex'))return;const id=d.dataset.cxe||d.dataset.cxg;if(!id)return;if(d.open)UI.open.add(id);else UI.open.delete(id);},true);
document.addEventListener('input',e=>{if(e.target.id!=='cxQ')return;UI.q=e.target.value;clearTimeout(UI.t);UI.t=setTimeout(()=>{render();const i=document.getElementById('cxQ');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},180);});
window.CODEX={render,list,CATS,UI};
})();
