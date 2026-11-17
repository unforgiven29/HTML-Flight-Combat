/* =====================================================================================================================
   v354 — armour, shells and body armour for the ground war you fly over (spec v49 ch.06 armoured vehicles and
   direct-fire units, infantry weapons, ammunition classes; gfight.js combat).
   GAMEPLAY-LEVEL APPROXIMATIONS: armour and penetration are rounded public estimates in millimetres of rolled
   homogeneous armour equivalent (RHA), grouped into protection classes; they are not data on real vehicles' protection
   and they describe nothing beyond what game damage needs. Labelled in the panel.
   * VEHICLE PROTECTION by class (front / side / rear / top, against kinetic KE and chemical-energy CE rounds), the class
     chosen from the country's main battle tank and infantry fighting vehicle names (natdata.js): modern composite
     (Abrams, Leopard 2, Challenger, Leclerc, K2, Merkava, Type 10, Altay), modern with reactive armour (T-90, T-72B3,
     T-80, Type 99), older composite / reactive (T-72, T-64, Type 96, Al-Khalid, PT-91, VT4), older steel (M60,
     Leopard 1, TAM, Olifant, T-55, Chonma), heavy IFV (Puma, CV90, Namer, Lynx, Bradley), light IFV (BMP, ZBD, BTR).
   * NATIONAL GUNS AND SHELLS: each country's tank gun and its kinetic round (APFSDS) and HEAT round, its IFV cannon
     round, its anti-tank guided missile (top attack or tandem front attack) and its anti-tank rocket.
   * A HIT: the aspect (front / side / rear from the target's heading, top for top-attack missiles and artillery),
     penetration with range falloff and spread against the protection there. Outcomes: NO PENETRATION, MOBILITY KILL
     (stops moving), FIREPOWER KILL (stops firing), CATASTROPHIC (destroyed); crew fates resolved in the memorial archive (cemetery.js).
   * INFANTRY: a squad of nine with BODY ARMOUR by the country's tier — soft armour and helmet, rifle plates, heavy
     plates — reducing wounds from rifle fire and fragments; each soldier hit is resolved as WOUNDED or KILLED; a squad with
     three or fewer able is combat-ineffective and withdraws with its wounded (counted as lost to the brigade).
   * Records: the last engagements (shooter weapon, round, aspect, result) in the LAND tab, and a summary of each
     country's guns and protection.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR||!window.GFIGHT)return;
const W=WWAR,rn=Math.random;
const D=window.NATDATA?NATDATA.EQ:{};
// protection classes: [front, side, rear, top] for KE and CE (mm RHA equivalent, rounded gameplay values)
const PROT={
 MODERN:{n:'modern composite',KE:[800,110,50,40],CE:[1200,300,70,60]},MODERN_ERA:{n:'modern with reactive armour',KE:[720,90,45,40],CE:[1100,420,60,70]},
 OLD_ERA:{n:'older composite / reactive',KE:[520,80,45,35],CE:[850,330,55,55]},STEEL:{n:'older steel',KE:[300,70,40,30],CE:[350,80,45,35]},
 IFV_H:{n:'heavy infantry fighting vehicle',KE:[100,45,30,25],CE:[300,120,35,30]},IFV_L:{n:'light infantry fighting vehicle',KE:[35,18,12,12],CE:[60,25,15,15]},SOFT:{n:'unarmoured',KE:[5,5,5,5],CE:[5,5,5,5]}};
const MBTCLS=[[/Abrams|Leopard 2|Challenger|Leclerc|K2|Merkava|Type 10|Altay|Strv 122/i,'MODERN'],[/T-90|T-72B3|T-80|Type 99|T-72SIM/i,'MODERN_ERA'],[/T-72|T-64|Type 96|Al-Khalid|PT-91|VT4|M-84|Zulfiqar|Arjun|Oplot|T-84|Type 90/i,'OLD_ERA'],[/M60|Leopard 1|TAM|Olifant|T-55|T-54|Chonma|Pokpung|Ariete|TR-85|Sabrah|Challenger 1/i,'STEEL']];
const IFVCLS=[[/Puma|CV90|Namer|Lynx|Bradley|K21|Redback|ASCOD|Warrior|Dardo|VBCI|Borsuk|Hunter|Strf/i,'IFV_H'],[/BMP|ZBD|BTR|YPR|VTT|MLI|BVP|Marder|Pizarro|Ratel|M113|LAV|Stryker|Boxer|Patria|Rosomak|Pandur|Piranha/i,'IFV_L']];
// guns and rounds: penetration at 2,000 m (KE) or fixed (CE), mm RHA, rounded
const GUN={
 'Abrams':['120 mm M256','M829A4 APFSDS',800,'M830A1 HEAT',600],'Leopard 2A6':['120 mm L/55','DM63 APFSDS',760,'DM12 HEAT',600],'Leopard 2A7':['120 mm L/55','DM63 APFSDS',760,'DM11 HE',300],
 'Leopard 2':['120 mm L/44','DM53 APFSDS',680,'DM12 HEAT',600],'Challenger':['120 mm L30A1 (rifled)','L27A1 APFSDS',600,'HESH',200],'Leclerc':['120 mm CN120-26','OFL 120 F2 APFSDS',650,'OECC HEAT',600],
 'K2':['120 mm L/55','K279 APFSDS',720,'K280 HEAT',600],'Merkava':['120 mm MG253','M338 APFSDS',650,'M339 HE-MP',450],'Type 10':['120 mm L/44','Type 10 APFSDS',650,'JM12A1 HEAT',600],'Altay':['120 mm L/55','MKE APFSDS',650,'HEAT-MP',600],
 'T-90':['125 mm 2A46M-5','3BM60 APFSDS',650,'3BK31 HEAT',750],'T-72B3':['125 mm 2A46M-5','3BM59 APFSDS',600,'3BK29 HEAT',700],'T-80':['125 mm 2A46M-4','3BM42 APFSDS',500,'3BK21 HEAT',600],
 'T-72':['125 mm 2A46M','3BM42 APFSDS',500,'3BK21 HEAT',600],'T-64':['125 mm 2A46M','3BM42 APFSDS',500,'3BK21 HEAT',600],'Type 99':['125 mm ZPT-98','DTW-125 II APFSDS',680,'HEAT',650],
 'Type 96':['125 mm ZPT-98','DTW-125 APFSDS',560,'HEAT',600],'Al-Khalid':['125 mm','APFSDS',520,'HEAT',600],'VT4':['125 mm','APFSDS',600,'HEAT',650],'PT-91':['125 mm 2A46MS','APFSDS',500,'HEAT',600],
 'Arjun':['120 mm (rifled)','FSAPDS',550,'HESH',200],'M60':['105 mm M68','M833 APFSDS',480,'M456 HEAT',400],'Leopard 1':['105 mm L7','DM33 APFSDS',420,'HEAT',400],'Olifant':['105 mm GT3','APFSDS',420,'HEAT',400],
 'TAM':['105 mm','APFSDS',400,'HEAT',400],'Ariete':['120 mm L/44','APFSDS',620,'HEAT',600],'T-55':['100 mm D-10T','3BM8 APDS',280,'HEAT',380],'Chonma':['115 mm','APFSDS',330,'HEAT',420],'Pokpung':['125 mm','APFSDS',480,'HEAT',600]};
const CANNON=[[/Bradley|LAV|Stryker/i,'25 mm M242','M919 APFSDS-T',60],[/CV90/i,'30-40 mm Bofors','APFSDS',110],[/Puma|Lynx/i,'30-35 mm','APFSDS',100],[/Warrior|Ajax/i,'30-40 mm','APFSDS',90],[/K21|Redback|Borsuk|ASCOD|Boxer|Rosomak|Patria|Hunter/i,'30-40 mm','APFSDS',90],
  [/BMP-3/i,'30 mm 2A72 + 100 mm','3UBR8 APDS',55],[/BMP|BTR/i,'30 mm 2A42','3UBR8 APDS',55],[/ZBD|ZSL/i,'30 mm ZPT-99','APDS',55],[/.*/,'20-30 mm','APDS',45]];
const ATGM=[[/Javelin|NLAW|TOW|MMP|Spike|HJ-12|LMAT|Hyungung|OMTAS/i,'top'],[/.*/,'front']];   // top attack or tandem front attack
const ATGM_PEN={Javelin:750,Kornet:1100,'Spike':700,'TOW':800,'NLAW':500,'MMP':900,'HJ-12':1100,'Stugna-P':800,'Konkurs':700,'Toophan':650,Nag:800,'Baktar-Shikan':600,OMTAS:800,LMAT:600,Hyungung:800};
const BODY={3:{n:'heavy rifle plates and helmet',rifle:.85,frag:.45},2:{n:'rifle plates and helmet',rifle:.65,frag:.35},1:{n:'soft armour and helmet',rifle:.15,frag:.25}};
const tier=p=>p.gdp>2e6?3:p.gdp>4e5?2:1;
const first=s=>String(s||'').split(',')[0].trim();
function profile(a3){const e=D[a3]||{},p=W.st.c[a3]||{gdp:0},mbt=first(e.MBT),ifv=first(e.IFV);
  const mc=(MBTCLS.find(([re])=>re.test(mbt))||[0,tier(p)>=3?'MODERN':tier(p)===2?'OLD_ERA':'STEEL'])[1],ic=(IFVCLS.find(([re])=>re.test(ifv))||[0,tier(p)>=3?'IFV_H':'IFV_L'])[1];
  const gk=Object.keys(GUN).find(k=>mbt.toLowerCase().includes(k.toLowerCase()))||(mc==='MODERN'?'Leopard 2':mc==='MODERN_ERA'?'T-72B3':mc==='OLD_ERA'?'T-72':'M60');
  const cn=CANNON.find(([re])=>re.test(ifv)),at=first(e.ATGM)||(tier(p)>=2?'Spike':'Konkurs'),ak=Object.keys(ATGM_PEN).find(k=>at.includes(k));
  return{mbt:mbt||'(generic tank)',ifv:ifv||'(generic IFV)',mcls:mc,icls:ic,gun:GUN[gk],cannon:cn,atgm:at,atgmPen:ak?ATGM_PEN[ak]:650,atgmMode:(ATGM.find(([re])=>re.test(at))||[0,'front'])[1],rpg:tier(p)>=2?'Carl Gustaf / AT4 class':'RPG-7 class',rpgPen:tier(p)>=2?500:550,
    rifle:first(e.RIFLE)||'service rifle',body:BODY[tier(p)]};}
const PF={};const prof=a3=>PF[a3]||(PF[a3]=profile(a3));
const LOG=[];
/* ------------------------------------------------------------------ resolving one hit */
function aspect(u,v){const dx=u.pos.x-v.pos.x,dz=u.pos.z-v.pos.z,b=(Math.atan2(dx,-dz)*180/Math.PI+360)%360,rel=Math.abs(((b-(v.hdg||0))+540)%360-180);return rel<45?0:rel<135?1:2;}
function resolve(u,v,w,dist){const a=prof(u._ws),t=prof(v._ws);const k=v._gk;
  // infantry target
  if(k==='INF'){v._men=v._men??9;v._wia=v._wia||0;const frag=w.fx==='art'||w.fx==='tank'||w.fx==='can'||w.fx==='atgm'||w.fx==='rpg',shots=w.fx==='mg'?3:w.fx==='art'?4:2;let kia=0,wia=0;
    for(let i=0;i<shots&&v._men>0;i++){const stop=frag?t.body.frag:t.body.rifle;if(rn()<stop)continue;if(rn()<.35){kia++;}else wia++;v._men--;}
    v._wia+=wia;v._kiaLast=kia;log(u,v,w.fx==='mg'?a.rifle:w.fx,'infantry',kia||wia?kia+' killed, '+wia+' wounded':'stopped by '+t.body.n);
    if(v._men<=3&&v.alive){v.damage(9999,null);log(u,v,'','infantry','squad combat-ineffective; withdraws with its wounded');}return;}
  // vehicle target
  const cls=k==='MBT'?t.mcls:k==='IFV'?t.icls:'SOFT',P=PROT[cls];let asp=aspect(u,v);let pen,ce=false,rd;
  if(w.fx==='tank'){const ke=rn()<.8||k!=='MBT';if(ke){pen=a.gun[2]*(1-.08*Math.max(0,dist-2000)/1000);rd=a.gun[1];}else{pen=a.gun[4];ce=true;rd=a.gun[3];}}
  else if(w.fx==='can'){pen=(a.cannon?a.cannon[3]:45)*(1-.25*dist/1500);rd=a.cannon?a.cannon[2]:'cannon';}
  else if(w.fx==='atgm'){pen=a.atgmPen;ce=true;rd=a.atgm;if(a.atgmMode==='top')asp=3;}
  else if(w.fx==='rpg'){pen=a.rpgPen;ce=true;rd=a.rpg;}
  else if(w.fx==='art'){pen=60;ce=false;asp=3;rd='155 / 152 mm HE';}
  else{pen=12;rd='machine gun';}
  const arm=(ce?P.CE:P.KE)[asp]*(.85+rn()*.3),ratio=pen*(.85+rn()*.3)/Math.max(1,arm);
  let res;if(ratio<1){res=ratio>.85&&rn()<.25?'MOBILITY KILL':'NO PENETRATION';}else{const r=rn()*ratio;res=r>1.3?'CATASTROPHIC':r>.9?(rn()<.5?'FIREPOWER KILL':'MOBILITY KILL'):(rn()<.5?'MOBILITY KILL':'FIREPOWER KILL');}
  if(res==='MOBILITY KILL')v._mob=1;if(res==='FIREPOWER KILL')v._fp=1;if(res==='CATASTROPHIC'||(v._mob&&v._fp))v.damage(9999,null);
  const crew=res==='CATASTROPHIC'?'vehicle destroyed':res==='NO PENETRATION'?'crew unhurt':'crew shaken, vehicle damaged';
  log(u,v,rd,['front','side','rear','top'][asp],res.toLowerCase()+' · '+crew);}
function log(u,v,rd,asp,res){LOG.unshift({t:Date.now(),by:u.callsign||u.kind,to:v.callsign||v.kind,rd,asp,res});LOG.length=Math.min(LOG.length,30);}
/* ------------------------------------------------------------------ the LAND tab: guns and protection */
if(window.NATPANEL&&NATPANEL.tabs&&NATPANEL.tabs.LAND){const _t=NATPANEL.tabs.LAND,esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  NATPANEL.tabs.LAND=p=>{const a=prof(p.a3);let h='<h4>GROUND WEAPONS AND PROTECTION</h4><div style="font-size:10px;color:#c9b46b">Gameplay approximations in mm RHA, rounded; protection classes, not data on real vehicles.</div>'+
    '<div class="row"><span>Tank</span><b>'+esc(a.mbt)+' · '+PROT[a.mcls].n+'</b></div><div class="row"><span>Main gun</span><b>'+esc(a.gun[0])+' · '+esc(a.gun[1])+' (~'+a.gun[2]+') / '+esc(a.gun[3])+'</b></div>'+
    '<div class="row"><span>Infantry fighting vehicle</span><b>'+esc(a.ifv)+' · '+PROT[a.icls].n+'</b></div><div class="row"><span>Cannon</span><b>'+(a.cannon?esc(a.cannon[1])+' · '+esc(a.cannon[2])+' (~'+a.cannon[3]+')':'—')+'</b></div>'+
    '<div class="row"><span>Anti-tank missile</span><b>'+esc(a.atgm)+' · '+(a.atgmMode==='top'?'top attack':'tandem, front attack')+' (~'+a.atgmPen+')</b></div><div class="row"><span>Anti-tank rocket</span><b>'+a.rpg+'</b></div>'+
    '<div class="row"><span>Infantry</span><b>'+esc(a.rifle)+' · '+a.body.n+'</b></div>';
    if(LOG.length)h+='<h4>LAST ENGAGEMENTS (YOUR SORTIE)</h4>'+LOG.slice(0,8).map(l=>'<div style="font-size:10px">'+esc(String(l.by).split(',')[0])+' → '+esc(String(l.to).split(',')[0])+' · '+esc(l.rd)+' · '+l.asp+' · '+esc(l.res)+'</div>').join('');
    return h+_t(p);};}
window.ARMOR={PROT,GUN,BODY,prof,resolve,LOG,aspect};
})();
