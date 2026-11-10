/* =====================================================================================================================
   v230 — simple cockpits for the 33 Cold War jets (v229). Needs game.js, coldwar.js, coldwar-jets.js.
   Each jet gets its own board instead of the borrowed one: panel colour of the real pit, its own instrument set (basic T,
   one or two engine stacks, metric / imperial scales, labels in the jet's own language), the right kind of sight (fixed
   reflector gunsight glass or a wide HUD combiner), its radar scope where it had one, the RWR, a stores / gear / caution
   block, side consoles. The borrowed jet's stick, throttle and pedals stay (they drive the controls). The flight, radar,
   HUD and weapon logic are unchanged: the scope and RWR faces show the same canvases the borrowed pit draws.
   ===================================================================================================================== */
(function(){
'use strict';
if(typeof ck==='undefined'||!ck.viper){console.warn('[cwpit] cockpits missing');return;}
// ---------- per-jet board ----------
// pc panel colour, cc console colour, u units, l labels, e engines, s sight ('gun' reflector / 'hud' combiner), sc scope ('ph' round CRT,
// 'fcr' square display, 0 none), m2 second display ('sms'), fc dial face colour
const GRY=0x33383b,BLK=0x1f2224,TQ=0x4f9c98,TQ2=0x6c9fa6;
const PIT={
 'A-4E':{pc:GRY,u:'imp',l:'en',e:1,s:'gun',sc:'ph'},
 'A-7D':{pc:GRY,u:'imp',l:'en',e:1,s:'hud',sc:'ph'},
 'AV-8B':{pc:0x2c3033,u:'imp',l:'en',e:1,s:'hud',sc:'fcr',m2:'sms'},
 'Alpha Jet':{pc:0x2e3236,u:'met',l:'fr',e:2,s:'hud',sc:0},
 'Super Etendard':{pc:0x2e3236,u:'met',l:'fr',e:1,s:'gun',sc:'ph'},
 'F-100A':{pc:BLK,u:'imp',l:'en',e:1,s:'gun',sc:0},
 'F-104S':{pc:GRY,u:'imp',l:'en',e:1,s:'gun',sc:'ph'},
 'F-106A':{pc:GRY,u:'imp',l:'en',e:1,s:'gun',sc:'ph'},
 'F-111F':{pc:GRY,u:'imp',l:'en',e:2,s:'hud',sc:'ph',wide:1},
 'F-20':{pc:0x2c3033,u:'imp',l:'en',e:1,s:'hud',sc:'fcr',m2:'sms'},
 'F-5E':{pc:GRY,u:'imp',l:'en',e:2,s:'gun',sc:'ph'},
 'F-86F':{pc:BLK,u:'imp',l:'en',e:1,s:'gun',sc:0},
 'F-8E':{pc:GRY,u:'imp',l:'en',e:1,s:'gun',sc:'ph'},
 'J 35F':{pc:0x3a3f44,u:'met',l:'sv',e:1,s:'gun',sc:'ph'},
 'AJS-37':{pc:0x2b2f33,u:'met',l:'sv',e:1,s:'hud',sc:'ph'},
 'AMX':{pc:0x2c3033,u:'imp',l:'en',e:1,s:'hud',sc:'fcr'},
 'Lightning F.6':{pc:BLK,u:'imp',l:'en',e:2,s:'gun',sc:'ph'},
 'Mirage III':{pc:0x2e3236,u:'met',l:'fr',e:1,s:'gun',sc:'ph'},
 'Mirage F1':{pc:0x2e3236,u:'met',l:'fr',e:1,s:'gun',sc:'ph'},
 'Mirage 2000':{pc:0x2a2e31,u:'met',l:'fr',e:1,s:'hud',sc:'fcr'},
 'Jaguar':{pc:BLK,u:'imp',l:'en',e:2,s:'hud',sc:0},
 'Tornado GR.4':{pc:BLK,u:'imp',l:'en',e:2,s:'hud',sc:'ph',m2:'sms',wide:1},
 'Su-25':{pc:TQ,u:'met',l:'ru',e:2,s:'gun',sc:0},
 'Su-24M':{pc:TQ,u:'met',l:'ru',e:2,s:'hud',sc:'fcr',wide:1},
 'Su-22M4':{pc:TQ,u:'met',l:'ru',e:1,s:'gun',sc:0},
 'MiG-27K':{pc:TQ,u:'met',l:'ru',e:1,s:'hud',sc:0},
 'MiG-15':{pc:0x262826,u:'met',l:'ru',e:1,s:'gun',sc:0},
 'MiG-19':{pc:0x262826,u:'met',l:'ru',e:2,s:'gun',sc:'ph'},
 'Yak-38':{pc:TQ,u:'met',l:'ru',e:1,s:'gun',sc:0},
 'Yak-141':{pc:0x5f8f96,u:'met',l:'ru',e:1,s:'hud',sc:'fcr'},
 'J-11':{pc:TQ2,u:'met',l:'zh',e:2,s:'hud',sc:'fcr'},
 'J-8F':{pc:0x5d7480,u:'met',l:'zh',e:2,s:'hud',sc:'fcr'},
 'JH-7':{pc:0x55606a,u:'met',l:'zh',e:2,s:'hud',sc:'fcr',wide:1}};
const LB={
 en:{ias:'AIRSPEED',alt:'ALT',vvi:'VERT VEL',aoa:'AOA',g:'G',rpm:'RPM %',egt:'EGT',fuel:'FUEL',ff:'FUEL FLOW',clk:'',arm:'MASTER ARM',safe:'SAFE',gear:'GEAR',fire:'FIRE',hyd:'HYD',low:'FUEL LOW',eng:'ENGINE',wpn:'WEAPON',kt:'KNOTS',ft:'FEET',ab:'A/B'},
 fr:{ias:'VITESSE',alt:'ALTITUDE',vvi:'VARIO',aoa:'INCIDENCE',g:'G',rpm:'N %',egt:'T4',fuel:'CARBURANT',ff:'DEBIT',clk:'',arm:'ARMT',safe:'SECU',gear:'TRAIN',fire:'FEU',hyd:'HYD',low:'BINGO',eng:'MOTEUR',wpn:'ARME',kt:'KM/H',ft:'M',ab:'PC'},
 sv:{ias:'FART',alt:'HÖJD',vvi:'STIG',aoa:'ALFA',g:'G',rpm:'VARV %',egt:'TEMP',fuel:'BRÄNSLE',ff:'FLÖDE',clk:'',arm:'HUVUDSÄKR',safe:'SÄKRAD',gear:'STÄLL',fire:'BRAND',hyd:'HYDR',low:'BRÄNSLE',eng:'MOTOR',wpn:'VAPEN',kt:'KM/H',ft:'M',ab:'EBK'},
 ru:{ias:'СКОРОСТЬ',alt:'ВЫСОТА',vvi:'ВАР',aoa:'α',g:'Ny',rpm:'ОБ %',egt:'Т°',fuel:'ТОПЛИВО',ff:'РАСХОД',clk:'',arm:'ГЛАВН ВКЛ',safe:'ВЫКЛ',gear:'ШАССИ',fire:'ПОЖАР',hyd:'ГИДРО',low:'ОСТАТОК',eng:'ДВИГ',wpn:'ОРУЖИЕ',kt:'КМ/Ч',ft:'М',ab:'ФОРС'},
 zh:{ias:'空速',alt:'高度',vvi:'升降',aoa:'攻角',g:'过载',rpm:'转速 %',egt:'排温',fuel:'燃油',ff:'油耗',clk:'',arm:'总电门',safe:'保险',gear:'起落架',fire:'火警',hyd:'液压',low:'余油',eng:'发动机',wpn:'武器',kt:'公里/时',ft:'米',ab:'加力'}};


// ======================= accurate layouts, batch 1 (1950s–60s gun-sight fighters) =======================
// positions are canvas px on the 1024×512 main-panel face; dial keys: ias alt vvi aoa acc mach adi hsi turn cmp clk rpm rpm2 egt egt2 noz noz2
// fuel fpr oil hyd oxy apc lamp_*; plates [x,y,w,h,title,[switches]]; cau [x,y,cols,rows,cw,ch,[legends]]; gearH [x,y]; arm [x,y,w]
Object.assign(PIT['F-86F'],{pc:0x1d1f20,gs:'a4',stk:'a1',thr:1,lay:{rwr:null,
  dial:{acc:[70,100,44],ias:[190,105,62],hsi:[340,105,62],adi:[500,105,70],alt:[660,105,62],cmp:[190,250,56],turn:[340,250,56],vvi:[500,255,60],oxy:[660,250,46],
    rpm:[800,100,58],egt:[930,100,52],fpr:[800,240,46],oil:[930,232,42],hyd:[800,360,44],fuel:[930,352,54],clk:[660,370,40],lamp_fire:[580,330,10]},
  gearH:[70,250],arm:[150,410,300],plates:[[480,410,210,70,'BOMB-ROCKET-TANK',['SEL','ARM','JETT']]],txt:[['FIRE',580,350,9]]},
  con:{L:[['ENGINE',['MASTER','IGNITION','EMER FUEL']],['THROTTLE QUADRANT',['SPD BRK','MIC']],['AN/ARC-27 UHF',['CHAN','VOL','TONE']],['TRIM / FLAPS',['RUD','FLAP','T/O TRIM']]],
       R:[['ELECTRICAL',['BATT','GEN','INVERTER']],['LIGHTS',['POS','FUS','INST']],['A-4 GUNSIGHT',['FILTER','CAGE','RANGE']],['OXYGEN / CB',['DILUTER','EMER','CB']]]}});
Object.assign(PIT['MiG-15'],{pc:0x232523,gs:'asp',stk:'a1',thr:1,lay:{rwr:null,
  dial:{mach:[215,105,48],ias:[350,105,62],adi:[512,110,74],turn:[660,105,56],rpm:[800,105,58],egt:[930,105,50],
    oxy:[215,250,46],alt:[350,260,62],vvi:[512,265,58],cmp:[660,260,58],fuel:[800,255,56],fpr:[930,240,44],oil:[930,352,40],clk:[800,385,38],lamp_mach:[275,40,9],lamp_fire:[930,440,10]},
  gearH:[80,170],arm:[40,400,250],plates:[[330,355,360,78,'ВООРУЖЕНИЕ',['Н-37Д','НР-23','БОМБЫ','ФКП']]],
  txt:[['М 0.92',275,62,9],['ПОЖАР',930,462,9]]},
  con:{L:[['РУД / ВК-1',['ЗАПУСК','СТОП']],['ЗАКРЫЛКИ',['20°','55°']],['РСИУ-3М',['КАНАЛ','ГРОМК']],['ЭЛ. ЩИТОК',['АККУМ','ГЕН','ПО-750']]],
       R:[['ЩИТОК АЗС',['АРК','ПРИЦЕЛ','ФОТО']],['АВАРИЙН',['ШАССИ','ЗАКРЫЛ','ТОРМ']],['КИСЛОРОД КП-14',['ПОДАЧА','АВАР']],['ОСВЕЩЕНИЕ',['УФО','ФАРА']]]}});
Object.assign(PIT['MiG-19'],{pc:0x232523,gs:'asp',stk:'a1',thr:2,lay:{rwr:null,scope:[890,115,92],
  dial:{mach:[90,110,46],ias:[230,110,60],adi:[390,118,70],turn:[540,110,52],rpm:[690,105,50],
    oxy:[90,250,44],alt:[230,255,60],vvi:[390,265,56],cmp:[540,255,56],rpm2:[690,232,50],
    egt:[800,300,46],egt2:[920,300,46],fuel:[690,365,50],oil:[800,410,36],fpr:[920,410,36],lamp_fire:[540,345,10]},
  gearH:[90,370],arm:[150,410,230],plates:[[395,360,240,72,'ВООРУЖЕНИЕ',['НР-30','РС','БОМБЫ','ФКП']]],txt:[['ПОЖАР',540,365,9],['РП-5',890,222,10]]},
  con:{L:[['РУД ×2 / РД-9Б',['ЗАПУСК Л','ЗАПУСК П','ФОРСАЖ']],['ЗАКРЫЛКИ / ЩИТКИ',['ЗАКР','ЩИТКИ']],['РСИУ-4',['КАНАЛ','ГРОМК']],['ТРИММЕР',['СТАБ','ЭЛЕР']]],
       R:[['ЩИТОК АЗС',['РЛС','ПРИЦЕЛ','АРК']],['РАДИОЛОКАТОР РП-5',['ВКЛ','ДАЛЬН','ЯРК']],['КИСЛОРОД',['ПОДАЧА','АВАР']],['ОСВЕЩЕНИЕ',['УФО','АНО']]]}});
Object.assign(PIT['F-104S'],{pc:0x2a2d2f,gs:'opt',stk:'b8',thr:1,lay:{rwr:[90,95,56],scope:[512,118,98],
  // F-104S: scope top centre, airspeed-Mach / altimeter / VVI column left of the ADI and BDHI, the APC (automatic pitch control) AOA
  // indicator heading the engine group (tach, EGT, nozzle, oil), fuel / flow, both hydraulic systems, cabin altitude; APC switch + shaker /
  // kicker lights in the caution block
  dial:{ias:[330,100,60],alt:[330,232,60],vvi:[330,358,50],adi:[512,300,66],hsi:[512,445,56],turn:[612,452,24],
    apc:[690,95,50],rpm:[820,95,56],egt:[940,95,48],acc:[690,225,46],noz:[820,225,46],fuel:[940,225,52],clk:[690,340,34],oil:[790,340,34],hyd_1:[875,340,32],hyd_2:[960,340,32],
    ff:[230,452,30],cab:[100,440,30]},
  gearH:[80,250],arm:[150,380,200],plates:[[160,180,140,60,'APC',['APC','SHAKER TEST']]],
  cau:[680,392,4,3,84,26,['FIRE','HYD','FUEL LOW','GEN','OIL','PITCH','CANOPY','TIP TANK','SHAKER','KICKER','APC OFF','MSTR CAUT']],txt:[['R21G/M1',512,232,10],['HYD 1',875,384,8],['HYD 2',960,384,8]]},
  con:{L:[['THROTTLE / J79',['START','IGN','A/B']],['APC / STAB',['APC','PITCH DAMP','YAW DAMP']],['FLAPS / BLC',['T.O.','LAND','BLC']],['AN/ARC-552 UHF',['UHF','CHAN','VOL']],['ARMAMENT',['MASTER ARM','SPARROW','RKT']],['FUEL',['TIP XFER','PYL XFER','BOOST']]],
       R:[['R21G RADAR',['RADAR','RANGE','GAIN']],['ELECTRICAL',['BATT','GEN','INV']],['NAV / TACAN',['TACAN','MODE']],['IFF / SIF',['IFF','MODE 3']],['LIGHTS / OXY',['INST','POS','O2']],['ANTI-ICE / PITOT',['PITOT','ENG A/I']]]}});
Object.assign(PIT['F-5E'],{pc:0x30353a,gs:'opt',stk:'b8',thr:2,lay:{rwr:[80,90,50],scope:[512,95,82],
  dial:{aoa:[190,90,46],ias:[345,120,62],adi:[512,262,72],alt:[680,120,62],acc:[360,290,50],hsi:[512,430,62],vvi:[680,270,56],oil:[680,410,40],
    rpm:[810,90,46],rpm2:[920,90,46],egt:[810,200,44],egt2:[920,200,44],noz:[810,305,40],noz2:[920,305,40],fuel:[865,422,54]},
  gearH:[80,250],arm:[140,415,240],cau:[130,170,2,4,90,26,['L GEN','R GEN','HYD','FUEL LOW','L FIRE','R FIRE','OXY','CANOPY']],txt:[['APQ-159',512,190,9]]},
  con:{L:[['THROTTLES / ENGINE',['L START','R START','IGN']],['ARMAMENT',['ARM','GUNS','MSL']],['FUEL',['BOOST L','BOOST R','XFEED']],['FLAPS / TRIM',['AUTO','RUD','AIL']]],
       R:[['RADAR APQ-159',['MODE','RANGE','GAIN']],['ELECTRICAL',['BATT','L GEN','R GEN']],['UHF / TACAN',['CHAN','VOL','MODE']],['LIGHTS / OXY',['INST','FORM','O2']]]}});

// ======================= accurate layouts, batches 2–6 (remaining 28 jets) =======================
const CON=(l,a,b)=>({L:a.map(x=>Array.isArray(x)?x:[x,l==='ru'?['ВКЛ','ВЫКЛ']:l==='fr'?['MARCHE','ARRET']:l==='sv'?['TILL','FRÅN']:l==='zh'?['开','关']:['ON','OFF']]),R:b.map(x=>Array.isArray(x)?x:[x,l==='ru'?['ВКЛ','ВЫКЛ']:l==='fr'?['MARCHE','ARRET']:l==='sv'?['TILL','FRÅN']:l==='zh'?['开','关']:['ON','OFF']])});
const SET=(id,o)=>{if(PIT[id])Object.assign(PIT[id],o);};
// --- US Navy / USAF ---
SET('A-4E',{gs:'opt',stk:'b8',thr:1,lay:{rwr:[85,90,48],scope:[512,92,78],
  dial:{aoa:[190,92,44],ias:[340,112,60],alt:[684,112,60],adi:[512,255,72],acc:[340,262,50],vvi:[684,262,54],hsi:[512,425,64],
    rpm:[830,92,52],egt:[945,92,46],fpr:[830,215,42],oil:[945,215,40],fuel:[880,345,56],clk:[684,400,38]},
  gearH:[80,250],arm:[140,420,250],plates:[[150,170,140,60,'LABS',['MODE','TIMER']]],cau:[760,440,3,2,80,26,['FIRE','OIL','FUEL LOW','HYD','GEN','SPD BRK']],txt:[['APG-53A',512,182,9]]},
  con:CON('en',[['ENGINE / FUEL',['MASTER','DROP TK','START']],'AN/ARC-51 UHF',['ARMAMENT',['STA 1','STA 2','STA 3']],'TRIM / FLAPS'],[['RADAR APG-53A',['MODE','GAIN','TILT']],'ELECTRICAL','TACAN','LIGHTS / OXY'])});
SET('A-7D',{gs:'hud',stk:'b8',thr:1,lay:{rwr:[90,92,52],scope:[860,120,92],
  dial:{aoa:[230,92,44],ias:[340,100,56],adi:[512,110,74],alt:[680,100,56],vvi:[680,230,46],acc:[340,230,46],map:[512,355,110],
    rpm:[810,300,46],egt:[920,300,44],fuel:[865,425,52],oil:[700,400,36],clk:[700,470,30]},
  gearH:[80,260],arm:[140,425,240],cau:[150,170,2,3,90,26,['FIRE','HYD','FUEL LOW','GEN','OIL','NAV']],txt:[['PMDS',512,478,9],['APQ-126',860,226,9]]},
  con:CON('en',['ENGINE / FUEL',['ARMAMENT',['MASTER','A/G','GUN']],'UHF / IFF','TRIM'],[['NAV / INS',['MODE','ALIGN','UPDT']],'RADAR APQ-126','ELECTRICAL','LIGHTS / OXY'])});
SET('AV-8B',{gs:'hud',stk:'b8',thr:1,lay:{rwr:null,m2:[240,170,118],scope:[784,170,118],
  dial:{adi:[440,400,48],ias:[440,300,40],alt:[584,300,40],vvi:[584,400,40],rpm:[930,360,42],egt:[930,450,40],fuel:[120,380,50]},
  arm:[30,450,190],gearH:[320,430],plates:[[400,20,224,120,'UFC',['1','2','3','4','5']]],cau:[260,315,1,4,100,24,['FIRE','HYD','FUEL LOW','WATER']],txt:[['NOZZLE',930,415,9],['LEFT MPCD',240,300,9],['RIGHT MPCD',784,300,9]]},
  con:CON('en',[['NOZZLE / THROTTLE',['NOZ','STO STOP','PARK']],['FUEL',['PROP','DUMP','WATER']],'V/UHF',['FLAPS',['CRUISE','AUTO','STOL']]],[['ELECTRICAL',['BATT','GEN','APU']],'INS / NAV','LIGHTS','ECS / OXY'])});
SET('F-100A',{pc:0x1d1f20,gs:'a4',stk:'a1',thr:1,lay:{rwr:null,
  dial:{mach:[70,100,42],ias:[195,105,60],adi:[512,110,74],alt:[690,105,60],acc:[70,240,42],hsi:[345,110,58],turn:[345,255,52],vvi:[512,265,58],cmp:[195,255,54],oxy:[690,250,44],
    rpm:[830,100,56],egt:[945,100,48],noz:[830,232,44],fpr:[945,232,42],oil:[830,350,40],hyd:[945,350,40],fuel:[690,385,50],clk:[945,450,32],lamp_fire:[580,350,10]},
  gearH:[70,370],arm:[140,420,280],plates:[[440,410,200,68,'ARMAMENT',['GUNS','RKT','BOMB']]],txt:[['FIRE',580,370,9]]},
  con:CON('en',[['ENGINE / A/B',['MASTER','IGN','A/B']],'AN/ARC-34 UHF','TRIM / FLAPS','SPEED BRAKE'],[['ELECTRICAL',['BATT','GEN','INV']],['A-4 GUNSIGHT',['FILTER','CAGE','RANGE']],'LIGHTS','OXYGEN'])});
SET('F-106A',{gs:'gun',stk:'b8',thr:1,lay:{rwr:[85,440,46],scope:[512,135,120],
  dial:{tapeS:[300,150,110],tapeA:[724,150,110],adi:[330,385,62],map:[512,390,96],hsi:[694,385,62],aoa:[150,110,44],acc:[150,240,42],
    rpm:[860,90,46],egt:[960,90,40],noz:[860,200,40],fuel:[910,320,52],oil:[960,200,36],clk:[860,440,32]},
  gearH:[150,390],cau:[860,380,2,2,72,24,['FIRE','HYD','FUEL LOW','GEN']],arm:[220,470,200],txt:[['MA-1',512,270,10],['TSD',512,494,8]]},
  con:CON('en',[['ENGINE',['MASTER','IGN','A/B']],['ARMAMENT',['MISSILE','GENIE','ARM']],'UHF / DATA LINK','TRIM'],[['MA-1 FIRE CONTROL',['MODE','SCAN','RANGE']],'ELECTRICAL','TACAN','LIGHTS / OXY'])});
SET('F-111F',{gs:'hud',stk:'b8',thr:2,lay:{rwr:[90,95,50],scope:[880,140,100],
  dial:{tapeS:[215,170,90],adi:[390,120,70],tapeA:[565,170,90],aoa:[90,240,42],hsi:[390,300,62],vvi:[565,330,46],acc:[90,350,40],
    rpm:[690,110,40],rpm2:[760,110,40],egt:[690,210,38],egt2:[760,210,38],noz:[690,300,34],noz2:[760,300,34],fuel:[880,350,54],oil:[725,390,32],clk:[880,465,28]},
  gearH:[240,410],arm:[320,450,240],cau:[600,420,3,2,72,26,['FIRE','HYD','FUEL','GEN','TFR','OIL']],txt:[['APQ-144',880,256,9],['WING SWEEP',725,450,9]]},
  con:CON('en',[['THROTTLES',['L A/B','R A/B','SPD BRK']],['WING SWEEP',['16°','26°','72.5°']],['TFR',['MODE','RIDE','CLR']],'FLAPS / SLATS'],[['ELECTRICAL',['BATT','L GEN','R GEN']],'AUTOPILOT','UHF / IFF','LIGHTS / O2'])});
SET('F-20',{gs:'hud',stk:'b8',thr:1,lay:{rwr:[512,450,46],m2:[250,175,115],scope:[774,175,115],
  dial:{adi:[440,385,46],ias:[440,295,36],alt:[584,295,36],vvi:[584,385,36],aoa:[100,60,34],rpm:[930,330,40],egt:[930,420,38],fuel:[100,330,48]},
  gearH:[100,440],arm:[160,450,170],plates:[[396,20,232,120,'UFC',['A/A','A/G','NAV','IFF']]],cau:[690,310,2,3,80,26,['FIRE','HYD','FUEL','GEN','OIL','CANOPY']]},
  con:CON('en',[['THROTTLE / ENGINE',['START','JFS','A/B']],'FUEL','UHF / TACAN','FLAPS / TRIM'],[['ELECTRICAL',['BATT','GEN','EMER']],'APG-67 RADAR','INS','LIGHTS / O2'])});
SET('F-8E',{gs:'opt',stk:'b8',thr:1,lay:{rwr:null,scope:[512,96,80],
  // F-8E instrument board, NAVAIR 01-45HHD-1 figure 1-3 sheet 2: engine stack far left (tach / EPR / EGT), AOA-VVI-accel column,
  // radar altimeter over airspeed-Mach over altimeter, APQ-94 scope top centre over the attitude indicator, course indicator over the
  // BDHI right of centre, clock / UHF channel, fuel group (flow, transfer, main, LOX) and three hydraulic gauges far right
  dial:{rpm:[130,200,36],epr:[130,292,36],egt:[130,386,36],aoa:[220,190,34],vvi:[220,290,36],acc:[220,388,34],oil:[218,98,26],
    ralt:[318,104,40],ias:[320,238,46],alt:[320,358,46],adi:[512,286,64],trim:[566,396,18],droop:[458,396,18],
    crs:[614,128,36],hsi:[620,258,48],clk:[706,190,28],uhf:[782,190,30],ff:[704,298,30],xfr:[784,292,32],fuel:[716,392,38],lox:[808,392,30],
    hyd_1:[880,250,19],hyd_2:[880,298,19],hyd_3:[880,346,19],turn:[620,396,26],
    gi_n:[36,206,10],gi_l:[20,232,10],gi_r:[52,232,10],lamp_fire:[392,40,11],lamp_fuel:[600,36,9],lamp_oxy:[850,140,8],lamp_hydw:[880,398,9]},
  arm:[400,432,220],cau:[8,262,1,4,58,22,['RUD TRIM','AIL TRIM','SPD BRK','PROBE']],
  plates:[[150,40,50,38,'PROBE',['EXT']],[660,30,110,44,'FUEL',['DUMP','XFER']],[6,160,62,22,'WNG-WHL-DRP',[]]],
  txt:[['APQ-94',512,186,9],['FIRE',392,62,9],['FUEL LOW',600,54,8],['O2',850,158,8],['OIL/HYD',880,416,8],['DROOP',458,420,8],['TRIM',566,420,8],['HYD PRESS',880,226,8]]},
  con:{L:[['ENGINE',['MASTER','FUEL CTL','IGN']],['WING INCIDENCE',['HANDLE','RELEASE','DOWNLOCK']],['STAB AUG',['YAW STAB','ROLL STAB','EMER TRIM']],['AUTOPILOT',['MASTER','HDG HOLD']],
         ['THROTTLE',['SPD BRK','CRUISE DRP','CAT GRIP']],['APC',['ENGAGE','STBY']],['RADAR APQ-94',['RADAR','RANGE','GAIN']],['FIRE CONTROL',['SIDEWINDER','GUNS','RKT']]],
       R:[['ARRESTING GEAR',['HOOK']],['ANTI-ICE / PITOT',['ENG A/I','PITOT']],['EMERG GEN',['EMER GEN','MSTR GEN']],['AIR COND',['MODE','TEMP']],
         ['TACAN',['TACAN','CHAN']],['EXT LIGHTS',['POS','ANTI-COL']],['WINGFOLD',['FOLD']],['UHF / IFF',['UHF','IFF','CODER']]]}});
// --- British / French / Swedish / Italian ---
SET('Lightning F.6',{gs:'gun',stk:'a1',thr:2,lay:{rwr:null,scope:[512,105,94],
  dial:{ias:[170,100,52],mach:[60,100,40],alt:[170,240,52],adi:[335,215,76],hsi:[690,215,76],vvi:[360,385,48],acc:[60,240,38],turn:[200,395,46],
    rpm:[830,90,46],rpm2:[940,90,46],egt:[830,205,42],egt2:[940,205,42],noz:[830,310,38],noz2:[940,310,38],fuel:[664,385,52],oil:[885,400,34],clk:[885,470,26]},
  gearH:[70,410],arm:[440,440,220],cau:[440,320,2,2,72,26,['FIRE 1','FIRE 2','HYD','FUEL']],txt:[['AI.23B',512,212,9],['OR946',512,300,10]]},
  con:CON('en',[['ENGINES',['START 1','START 2','REHEAT']],'UHF / STANDBY','FLAPS / TRIM','ARMAMENT'],[['AI.23B RADAR',['MODE','SCAN','GAIN']],'ELECTRICAL','AUTOPILOT','LIGHTS / O2'])});
SET('Mirage III',{gs:'gun',stk:'b8',thr:1,lay:{rwr:[85,90,46],scope:[512,100,92],
  dial:{ias:[345,105,58],mach:[200,105,44],alt:[680,105,58],adi:[512,272,74],vvi:[680,255,50],acc:[345,255,46],hsi:[512,440,56],
    rpm:[830,92,50],egt:[945,92,44],fuel:[880,240,54],noz:[830,360,38],oil:[945,360,34],clk:[200,240,34]},
  gearH:[80,330],arm:[150,440,250],cau:[730,420,3,2,80,26,['FEU','HYD','CARBU','GEN','HUILE','PC']],txt:[['CYRANO II',512,208,9]]},
  con:CON('fr',[['MOTEUR ATAR',['DEMAR','PC','CARBU']],'UHF','ARMEMENT',['VOLETS / COMPENS',['TRIM','PARACH']]],[['RADAR CYRANO',['MODE','DIST','GAIN']],'ELECTRIQUE','NAVIGATION','ECLAIRAGE / O2'])});
SET('Mirage F1',{gs:'gun',stk:'b8',thr:1,lay:{rwr:[85,90,46],scope:[512,100,92],
  dial:{ias:[345,105,58],alt:[680,105,58],aoa:[200,105,42],adi:[512,272,72],acc:[345,255,46],vvi:[680,255,50],hsi:[512,440,56],
    rpm:[830,92,50],egt:[945,92,44],fuel:[880,240,54],noz:[830,360,38],oil:[945,360,34],clk:[200,240,34]},
  gearH:[80,330],arm:[150,440,250],cau:[730,420,3,2,80,26,['FEU','HYD','CARBU','ALTER','HUILE','BECS']],txt:[['CYRANO IV',512,208,9]]},
  con:CON('fr',[['MOTEUR ATAR 9K50',['DEMAR','PC','CARBU']],'V/UHF','ARMEMENT','BECS / VOLETS'],[['RADAR CYRANO IV',['MODE','DIST','GAIN']],'ELECTRIQUE','CENTRALE / NAV','ECLAIRAGE / O2'])});
SET('Mirage 2000',{gs:'hud',stk:'b8',thr:1,lay:{rwr:[790,90,48],scope:[512,175,118],
  dial:{adi:[250,170,62],ias:[120,130,44],alt:[120,260,44],hsi:[250,330,56],vvi:[120,385,40],
    rpm:[790,230,44],egt:[905,230,40],fuel:[850,370,52],clk:[905,100,32]},
  arm:[400,440,224],gearH:[330,450],cau:[690,430,4,2,72,26,['FEU','HYD','CARBU','ALTER','HUILE','PC','DIRAV','CANOP']],txt:[['VTB',512,306,9],['PCA',512,20,10]]},
  con:CON('fr',[['MOTEUR M53',['DEMAR','PC','CARBU']],['ARMEMENT',['MASTER','CANON','MISS']],'V/UHF','CDVE'],[['RADAR RDI',['MODE','PORTEE','SITE']],'ELECTRIQUE','CENTRALE INERTIELLE','ECLAIRAGE / O2'])});
SET('Super Etendard',{gs:'gun',stk:'b8',thr:1,lay:{rwr:[85,90,46],scope:[512,100,88],
  dial:{ias:[345,105,58],alt:[680,105,58],aoa:[200,100,42],adi:[512,272,72],acc:[345,255,46],vvi:[680,255,50],hsi:[512,440,56],
    rpm:[830,92,50],egt:[945,92,44],fuel:[880,240,54],oil:[830,360,36],hyd:[945,360,36]},
  gearH:[80,330],arm:[150,440,250],cau:[730,420,3,2,80,26,['FEU','HYD','CARBU','GEN','HUILE','CROSSE']],txt:[['AGAVE',512,202,9]]},
  con:CON('fr',[['MOTEUR ATAR 8K50',['DEMAR','CARBU']],'UHF','ARMEMENT / EXOCET','CROSSE / VOLETS'],[['RADAR AGAVE',['MODE','DIST','GAIN']],'ELECTRIQUE','CENTRALE ETNA','ECLAIRAGE / O2'])});
SET('Alpha Jet',{gs:'hud',stk:'b8',thr:2,lay:{rwr:null,
  dial:{ias:[330,110,60],adi:[512,120,78],alt:[694,110,60],aoa:[190,100,42],acc:[330,260,48],hsi:[512,330,72],vvi:[694,260,52],
    rpm:[830,95,46],rpm2:[940,95,46],egt:[830,210,42],egt2:[940,210,42],fuel:[885,340,52],oil:[694,390,34],clk:[190,240,32]},
  gearH:[80,300],arm:[140,440,250],cau:[620,430,4,2,80,26,['FEU G','FEU D','HYD','CARBU','GEN','HUILE','ANTI-G','VERR']]},
  con:CON('fr',[['MOTEURS LARZAC',['DEMAR G','DEMAR D']],'UHF / VHF','ARMEMENT','VOLETS / COMPENS'],[['ELECTRIQUE',['BATT','GEN G','GEN D']],'NAVIGATION','ECLAIRAGE','OXYGENE'])});
SET('Jaguar',{gs:'hud',stk:'b8',thr:2,lay:{rwr:[90,92,48],
  dial:{ias:[250,110,56],adi:[420,110,68],alt:[590,110,56],aoa:[100,240,40],acc:[250,250,44],map:[420,340,108],vvi:[590,250,48],
    rpm:[760,95,44],rpm2:[870,95,44],egt:[760,200,40],egt2:[870,200,40],noz:[760,300,34],noz2:[870,300,34],fuel:[815,405,52],clk:[960,95,30]},
  gearH:[100,390],arm:[600,440,140],cau:[160,450,2,1,80,26,['FIRE','HYD']],txt:[['NAVWASS PMD',420,494,9]]},
  con:CON('en',[['THROTTLES / ADOUR',['START 1','START 2','REHEAT']],'UHF','WEAPONS','FLAPS / TRIM'],[['NAVWASS',['MODE','STORE','FIX']],'ELECTRICAL','LASER RANGER','LIGHTS / O2'])});
SET('Tornado GR.4',{gs:'hud',stk:'b8',thr:2,lay:{rwr:[90,92,48],m2:[220,250,100],scope:[512,330,120],
  dial:{adi:[512,110,70],ias:[350,100,50],alt:[674,100,50],vvi:[674,215,40],aoa:[350,215,40],
    rpm:[800,90,40],rpm2:[900,90,40],egt:[800,190,36],egt2:[900,190,36],fuel:[850,320,50],clk:[960,440,26]},
  gearH:[80,420],arm:[700,430,200],cau:[700,370,4,2,60,26,['FIRE','HYD','FUEL','GEN','TFR','SPILS','WING','CSAS']],txt:[['CRPMD',512,466,9],['TV-TAB',220,366,9]]},
  con:CON('en',[['THROTTLES / RB199',['START','REHEAT','REV']],['WING SWEEP',['25°','45°','67°']],'TFR','FLAPS / SLATS'],[['ELECTRICAL',['BATT','GEN 1','GEN 2']],'AUTOPILOT / TFR','NAV / TACAN','LIGHTS / O2'])});
SET('AMX',{gs:'hud',stk:'b8',thr:1,lay:{rwr:[90,92,48],scope:[700,180,110],
  dial:{adi:[400,130,72],ias:[250,110,50],alt:[250,240,50],hsi:[400,320,64],vvi:[250,360,40],rpm:[900,110,42],egt:[900,215,40],fuel:[900,350,50]},
  gearH:[90,250],arm:[100,440,230],plates:[[540,20,180,40,'UFC',['NAV','A/G','A/A']]],cau:[620,420,4,2,70,26,['FIRE','HYD','FUEL','GEN','OIL','ECS','FCS','CANOPY']],txt:[['MFD',700,306,9]]},
  con:CON('en',[['THROTTLE / SPEY',['START','IGN']],'V/UHF','STORES',['FLAPS / TRIM',['AUTO','RUD']]],[['ELECTRICAL',['BATT','GEN','EMER']],'INS / NAV','EW',['LIGHTS / O2',['INST','NVG','O2']]])});
SET('J 35F',{gs:'gun',stk:'b8',thr:1,lay:{rwr:null,scope:[512,120,110],
  dial:{ias:[290,110,58],mach:[160,110,42],alt:[734,110,58],adi:[512,350,78],acc:[160,250,40],vvi:[734,255,50],hsi:[330,350,58],aoa:[290,250,42],
    rpm:[870,95,46],egt:[960,180,38],noz:[870,210,38],fuel:[870,340,50],oil:[960,280,32],clk:[960,440,26]},
  gearH:[100,390],arm:[600,440,220],cau:[680,330,2,3,80,26,['BRAND','HYDR','BRÄNSLE','GEN','EBK','KABIN']],txt:[['PS-01',512,246,10]]},
  con:CON('sv',[['MOTOR RM6C',['START','EBK']],'RADIO FR 21','BEVÄPNING','TRIM / KLAFF'],[['RADAR PS-01',['MOD','AVST','FÖRST']],'ELSYSTEM','NAVIGATION','BELYSNING / SYRE'])});
SET('AJS-37',{gs:'hud',stk:'b8',thr:1,lay:{rwr:[90,92,48],scope:[512,130,112],
  dial:{tapeS:[300,150,100],tapeA:[724,150,100],adi:[512,350,70],hsi:[330,370,58],aoa:[160,260,42],acc:[160,370,38],vvi:[694,370,48],
    rpm:[870,95,44],egt:[960,180,36],fuel:[870,250,48],noz:[960,290,32],clk:[960,440,26]},
  gearH:[860,400],arm:[100,440,200],cau:[300,460,4,1,70,26,['BRAND','HYDR','BRÄNSLE','REV']],txt:[['CI',512,256,10]]},
  con:CON('sv',[['MOTOR RM8B',['START','EBK','REVERS']],'RADIO FR 22','BEVÄPNING / RB',['TRIM',['TIPP','ROLL']]],[['RADAR PS-37',['MOD','AVST','HÖJD']],'ELSYSTEM','CK37 NAVIGATION','BELYSNING / SYRE'])});
// --- Soviet ---
const RUC=(e)=>CON('ru',[['РУД / ДВИГАТЕЛЬ',e===2?['ЗАПУСК Л','ЗАПУСК П','ФОРСАЖ']:['ЗАПУСК','ФОРСАЖ']],'Р-862 / РСБН',['ЗАКРЫЛКИ',['ВЗЛЕТ','ПОСАДКА']],['ВООРУЖЕНИЕ',['ГЛАВН','ВЫБОР','СБРОС']]],[['ЩИТОК АЗС',['ГЕН','АККУМ','ПТ']],'СОИ / РЛС','КИСЛОРОД','ОСВЕЩЕНИЕ']);
SET('Su-25',{gs:'asp',stk:'ru',thr:2,lay:{rwr:[90,92,48],
  dial:{ias:[240,110,58],adi:[420,115,72],alt:[600,110,58],aoa:[100,240,42],acc:[240,255,44],hsi:[420,315,72],vvi:[600,255,48],
    rpm:[760,95,44],rpm2:[870,95,44],egt:[760,205,40],egt2:[870,205,40],fuel:[815,330,52],oil:[600,375,34],clk:[960,95,30]},
  gearH:[100,390],arm:[200,440,240],cau:[700,420,4,2,70,26,['ПОЖАР Л','ПОЖАР П','ГИДРО','ОСТАТОК','ГЕН','МАСЛО','ШАССИ','ФОНАРЬ']],txt:[['АСП-17',420,30,9]]},con:RUC(2)});
SET('Su-24M',{gs:'hood',stk:'ru',thr:2,sbs:1,sc:0,lay:{rwr:[560,96,40],
  dial:{adi:[110,175,74],hsi:[110,365,74],ias:[262,250,48],alt:[262,385,52],aoa:[262,135,40],
    vbar_fuel:[400,345,95],vbar_rpm:[448,345,95],vbar_egt:[496,345,95],adi2:[600,250,58],vvi:[600,380,46],acc:[700,380,40],rpm:[700,265,40],rpm2:[790,265,40],egt:[790,380,40],fuel:[890,380,44],clk:[960,470,24]},
  plates:[[330,8,280,150,'ПУЛЬТ ПРИЦЕЛА',['РЕЖИМ','ЯРК','ДАЛЬН','СЕТКА']],[160,8,160,70,'ПОДВЕСКИ',['ЛЕВ','ЦЕНТР','ПРАВ']]],
  gearH:[960,180],arm:[650,440,220],cau:[650,10,6,4,60,26,['ПОЖАР Л','ПОЖАР П','ГИДРО 1','ГИДРО 2','ОСТАТОК','ГЕН Л','ГЕН П','СТРЕЛОВ','ПРНК','ЗАКРЫЛ','ШАССИ','ФОНАРЬ','ОПАСН ВЫС','РАЗВОРОТ','МАСЛО Л','МАСЛО П','СПО','ТОПЛ','АВТОМАТ','ВОЗДУХ','КИСЛОР','ЛАМПЫ','ТОРМОЗ','РЕЗЕРВ']],
  txt:[['ТОПЛИВО',448,236,10],['КРЫЛО',890,320,9]]},
  con:CON('ru',[['РУД ×2 / АЛ-21Ф-3',['ЗАПУСК Л','ЗАПУСК П','ФОРСАЖ']],['КРЫЛО',['16°','35°','45°','69°']],'Р-862',['ЗАКРЫЛКИ',['ВЗЛЕТ','ПОСАД']]],[['ЩИТОК АЗС',['ГЕН','АККУМ','ПТ']],'ПНС-24М','РЕЛЬЕФ','ОСВЕЩЕНИЕ'])});
SET('Su-22M4',{gs:'hud',stk:'ru',thr:1,lay:{rwr:[90,92,48],
  dial:{ias:[260,110,58],adi:[440,115,74],alt:[620,110,58],aoa:[110,240,42],acc:[260,255,44],hsi:[440,320,72],vvi:[620,255,48],
    rpm:[790,95,48],egt:[910,95,42],noz:[790,210,38],fuel:[870,320,52],oil:[910,205,34],clk:[960,440,26]},
  gearH:[100,390],arm:[200,440,240],cau:[680,430,4,2,70,26,['ПОЖАР','ГИДРО','ОСТАТОК','ГЕН','МАСЛО','КРЫЛО','ШАССИ','ФОНАРЬ']],txt:[['КЛЕН-ПС',440,30,9]]},con:RUC(1)});
SET('MiG-27K',{gs:'hud',stk:'ru',thr:1,lay:{rwr:[90,92,48],scope:[870,150,96],
  dial:{ias:[250,110,56],adi:[420,115,72],alt:[590,110,56],aoa:[100,240,42],acc:[250,255,44],hsi:[420,320,70],vvi:[590,255,48],
    rpm:[720,330,44],egt:[820,410,38],fuel:[920,360,48],noz:[720,430,34],clk:[960,470,24]},
  gearH:[100,390],arm:[200,440,240],cau:[480,440,2,1,72,26,['ПОЖАР','ГИДРО']],txt:[['КАЙРА ТВ',870,262,9]]},con:RUC(1)});
SET('Yak-38',{gs:'gun',stk:'ru',thr:1,lay:{rwr:[90,92,48],
  dial:{ias:[260,110,58],adi:[440,115,74],alt:[620,110,58],aoa:[110,240,42],acc:[260,255,44],hsi:[440,320,72],vvi:[620,255,48],
    rpm:[790,95,46],rpm2:[910,95,42],egt:[790,210,40],egt2:[910,210,38],noz:[790,320,36],fuel:[900,330,48],clk:[960,440,26]},
  gearH:[100,390],arm:[200,440,240],cau:[640,430,4,2,72,26,['ПОЖАР','ГИДРО','ОСТАТОК','ГЕН','ПД','ВОДА','ШАССИ','ФОНАРЬ']],txt:[['ПОДЪЁМН ДВ',910,150,8]]},
  con:CON('ru',[['РУД / СОПЛО',['СОПЛО','ПД','ЗАПУСК']],'Р-802',['ВООРУЖЕНИЕ',['ГЛАВН','ВЫБОР']],'ТРИММЕР'],[['ЩИТОК АЗС',['ГЕН','АККУМ']],'САУ / СК-ЭМ','КИСЛОРОД','ОСВЕЩЕНИЕ'])});
SET('Yak-141',{gs:'hud',stk:'ru',thr:1,lay:{rwr:[100,92,46],scope:[512,200,118],m2:null,
  dial:{adi:[260,180,58],ias:[120,180,40],alt:[260,320,44],hsi:[120,320,44],vvi:[260,430,34],rpm:[790,200,44],egt:[910,200,40],noz:[790,310,36],fuel:[880,400,48]},
  gearH:[100,440],arm:[360,440,180],plates:[[380,30,264,40,'ПУЛЬТ',['РЕЖ','НАВ','ОРУЖ']]],cau:[690,60,4,1,70,26,['ПОЖАР','ГИДРО','ОСТАТОК','ПД']],txt:[['ИЛС / МФИ',512,334,9]]},
  con:CON('ru',[['РУД / СОПЛО Р-79',['СОПЛО','ПД','ФОРСАЖ']],'Р-862',['ВООРУЖЕНИЕ',['ГЛАВН','ВЫБОР']],'ТРИММЕР'],[['ЩИТОК АЗС',['ГЕН','АККУМ']],'РЛС / СУВ','КИСЛОРОД','ОСВЕЩЕНИЕ'])});
// --- Chinese ---
const ZC=(e,r)=>CON('zh',[['油门 / 发动机',e===2?['左起动','右起动','加力']:['起动','加力']],'电台',['襟翼',['起飞','着陆']],['武器',['总电门','选择','投放']]],[['电源',['发电机','电瓶']],r||'雷达','导航','照明 / 氧气']);
SET('J-11',{gs:'hud',stk:'ru',thr:2,lay:{rwr:[110,100,50],scope:[860,130,92],
  dial:{ias:[270,110,56],adi:[440,115,72],alt:[610,110,56],aoa:[110,240,42],acc:[270,255,44],hsi:[440,320,72],vvi:[610,255,48],
    rpm:[760,300,38],rpm2:[860,300,38],egt:[760,390,34],egt2:[860,390,34],fuel:[950,350,44],clk:[960,470,22]},
  gearH:[110,390],arm:[200,440,240],cau:[480,440,3,1,80,26,['火警','液压','余油']],txt:[['显示器',860,236,9]]},con:ZC(2,'雷达 / 光电')});
SET('J-8F',{gs:'hud',stk:'ru',thr:2,lay:{rwr:[90,92,48],scope:[512,100,90],
  dial:{ias:[345,110,58],alt:[680,110,58],aoa:[200,100,42],adi:[512,270,72],acc:[345,255,46],vvi:[680,255,50],hsi:[512,435,60],
    rpm:[820,90,44],rpm2:[930,90,44],egt:[820,195,40],egt2:[930,195,40],fuel:[875,320,52],clk:[200,240,30]},
  gearH:[80,330],arm:[140,440,250],cau:[740,420,3,2,80,26,['火警','液压','余油','发电','滑油','座舱盖']],txt:[['1492 雷达',512,206,9]]},con:ZC(2,'1492 雷达')});
SET('JH-7',{gs:'hud',stk:'b8',thr:2,lay:{rwr:[90,92,48],scope:[512,130,110],
  dial:{ias:[290,110,56],alt:[734,110,56],adi:[512,350,70],hsi:[340,370,58],aoa:[150,250,40],acc:[290,250,42],vvi:[684,370,46],
    rpm:[860,250,40],rpm2:[960,250,40],egt:[860,345,36],egt2:[960,345,36],fuel:[910,440,46]},
  gearH:[90,400],arm:[150,450,180],cau:[600,460,4,1,60,24,['火警','液压','余油','发电']],txt:[['雷达 / 显示',512,256,9]]},con:ZC(2,'雷达 / 地形')});

// ---------- v238: console switch state + actions ----------
// get(jet, switch, panel) -> on/off; flip() toggles and runs the game action bound to it (radar power / range, master arm, gear, flaps,
// speed brake, wing incidence or sweep, APC, A/B is display only). Unbound switches keep their own state for the session.
const CW_SW=window.CW_SW={st:{},redraw:[],
  key:(id,w,ti)=>id+'|'+(ti||'')+'|'+w,
  fn(w,ti){const T=(ti||'').toUpperCase(),W=w.toUpperCase();
    if(/RADAR|РЛС|APQ|APG|CYRANO|AGAVE|PS-|AI\.23|雷达|R21G|RP-5|ORION|KLEN/.test(T)){if(/^(RADAR|MODE|РЕЖ|MOD|ВКЛ|MARCHE|TILL|开)$/.test(W))return'radar';if(/RANGE|DIST|ДАЛЬН|PORTEE|AVST|DALN/.test(W))return'range';}
    if(/^(MASTER ARM|ARM|ARMT|ГЛАВН|HUVUDSÄKR|总电门)$/.test(W)||/ARMAMENT|ВООРУЖ|ARMEMENT|BEVÄPN|武器/.test(T)&&/^(ARM|MASTER|ГЛАВН|总电门)$/.test(W))return'arm';
    if(/^(GEAR|ШАССИ|TRAIN|STÄLL|起落架)$/.test(W))return'gear';
    if(/FLAP|ЗАКРЫЛ|VOLETS|KLAFF|襟翼/.test(T)&&j0(W))return'flap';
    if(/^(SPD BRK|ЩИТКИ|AEROF)$/.test(W))return'sb';
    if(/WING INCIDENCE/.test(T)&&W==='HANDLE')return'winc';
    if(/WING SWEEP|КРЫЛО/.test(T))return'sweep';
    if(W==='APC'||(T==='APC'&&W==='ENGAGE'))return'apc';
    if(W==='CRUISE DRP')return'droop';
    return null;},
  get(id,w,ti){const k=this.key(id,w,ti),f=this.fn(w,ti),P=(typeof player!=='undefined'?player:null);
    try{if(P&&P.type===id){if(f==='radar')return radar.power!=='OFF';if(f==='arm')return game.armPos===0;if(f==='gear')return !!sys.v.gear;if(f==='flap'||f==='winc')return (P.flapCmd||0)>.5;if(f==='sb')return !!keys.has('KeyB');}}catch(e){}
    if(f==='apc'){const v=this.st[id+'|APC'];return v===undefined?true:v;}
    if(id&&w==='APC'&&ti===undefined){const v=this.st[id+'|APC'];return v===undefined?true:v;}
    const v=this.st[k];return v===undefined?/^(MASTER|BATT|GEN|INV|BOOST|IGN|PITCH DAMP|YAW DAMP|YAW STAB|ROLL STAB|MSTR GEN|UHF|IFF|TACAN|POS|INST|O2|PITOT|RADAR|ГЕН|АККУМ|BATT)$/.test(w.toUpperCase()):v;},
  label(id,w,ti){const f=this.fn(w,ti);if(f==='range')return'RANGE '+(radar.ranges[radar.ri]||'');if(f==='winc')return this.get(id,w,ti)?'WING UP (7°)':'WING DOWN';return this.get(id,w,ti)?'ON':'OFF';},
  flip(id,w,ti){const f=this.fn(w,ti),P=(typeof player!=='undefined'?player:null),on=!this.get(id,w,ti);
    try{if(f==='radar')radar.power=on?'ON':'OFF',radar.warm=on?Math.max(radar.warm||0,3):0;
      else if(f==='range')radar.ri=(radar.ri+1)%radar.ranges.length;
      else if(f==='arm')setArm(on?0:1);
      else if(f==='gear'&&CTL.map.KeyG)CTL.map.KeyG.fn();
      else if(f==='flap')flapKey();
      else if(f==='sb'){if(on)keys.add('KeyB');else keys.delete('KeyB');}
      else if(f==='winc'&&window.CW_SYS)CW_SYS.wingInc();
      else if(f==='sweep')sweepStep(on?1:-1);
      else if(f==='apc')this.st[id+'|APC']=on;
      else this.st[this.key(id,w,ti)]=on;}catch(e){console.warn('[cwpit] switch',e);}
    if(f!=='apc'&&f!=='radar'&&f!=='arm'&&f!=='gear'&&f!=='flap'&&f!=='winc'&&f!=='sb')this.st[this.key(id,w,ti)]=on;
    this.redraw.forEach(d=>{try{d();}catch(e){}});}};
function j0(W){return/^(T\.O\.|AUTO|ЗАКР|ВЗЛЕТ|起飞|ON|UP|ВКЛ)$/.test(W);}
// repaint console tops a few times a second so levers follow keyboard changes too
setInterval(()=>{if((typeof player!=='undefined'?player:null)&&PIT[player.type])CW_SW.redraw.forEach(d=>{try{d();}catch(e){}});},500);

// ---------- geometry helpers ----------
const LM=(c,sh=10)=>new THREE.MeshPhongMaterial({color:c,shininess:sh,specular:0x1c1c1c});
const box=(par,w,h,d,m,x,y,z,rx=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.rotation.x=rx;par.add(o);return o;};
const PW=.88,PH=.44,CW=1024,CH=Math.round(CW*PH/PW),PX=PW/CW;// panel metres, canvas px
const lx=x=>(x-CW/2)*PX,ly=y=>(CH/2-y)*PX;
function liveTex(kind,canvas){const o=ck[kind];if(!o._cwT)o._cwT=new Map();if(o._cwT.has(canvas))return o._cwT.get(canvas);
  const t=new THREE.CanvasTexture(canvas);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;o.tex.push(t);o._cwT.set(canvas,t);return t;}
const scopeOf=s=>s==='ph'?(typeof phScopeC!=='undefined'?phScopeC:null):s==='fcr'?fcrC:s==='sms'?smsC:null;

function build(id,kind){const S=PIT[id],o=ck[kind],root=o.root,g=new THREE.Group();g.visible=false;root.add(g);
  const pm=LM(S.pc),dk=LM(0x16191b,6),cm=LM(S.cc||S.pc,8),blk=LM(0x0d0f10,4);
  // glare shield and sight head
  box(g,.92,.03,.42,dk,0,-.262,-.95);box(g,.62,.026,.05,dk,0,-.272,-.735);
  const hud=S.s==='hud',gw=hud?(S.wide?.24:.21):.15,gh=hud?.19:.13,gy=hud?-.075:-.1,gz=-.615;
  box(g,hud?.24:.17,.06,.13,blk,0,-.225,-.81);
  const gmat=new THREE.MeshBasicMaterial({color:0x9effd0,transparent:true,opacity:.07,depthWrite:false,side:THREE.DoubleSide});
  const gl=new THREE.Mesh(new THREE.PlaneGeometry(gw,gh),gmat);gl.position.set(0,gy,gz);gl.rotation.x=-.08;g.add(gl);
  const fr=new THREE.MeshBasicMaterial({color:0x121415});
  if(hud){[-1,1].forEach(sd=>box(g,.012,gh+.06,.016,blk,sd*(gw/2+.006),gy-.02,gz-.005,-.08));box(g,gw+.024,.012,.016,blk,0,gy+gh/2+.006,gz-.003,-.08);}
  else{// reflector gunsight: glass plate in a thin frame on a centre post
    [[0,gh/2],[0,-gh/2]].forEach(([x,y])=>box(g,gw,.005,.005,fr,x,gy+y,gz));[-1,1].forEach(sd=>box(g,.005,gh,.005,fr,sd*gw/2,gy,gz));
    box(g,.016,.09,.016,blk,0,-.18,-.66);}
  // period gunsight bodies (the glass and symbology stay as above)
  if(S.gs==='a4'){box(g,.15,.1,.18,LM(0x1b1d1e),0,-.2,-.82);box(g,.11,.05,.08,LM(0x26292b),0,-.15,-.76);box(g,.04,.03,.03,LM(0x3a3d40),.06,-.13,-.76);}
  else if(S.gs==='asp'){box(g,.13,.13,.2,LM(0x22252a),0,-.19,-.83);box(g,.09,.06,.1,LM(0x2c3036),0,-.13,-.75);const ring=new THREE.Mesh(new THREE.TorusGeometry(.03,.006,8,24),LM(0x111));ring.position.set(0,-.17,-.59);g.add(ring);}
  else if(S.gs==='hood'){box(g,.22,.1,.24,LM(0x111214,8),0,-.21,-.8);const hd=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.26,20,1,true,0,Math.PI),LM(0x1a1b1c,6));hd.rotation.z=Math.PI/2;hd.rotation.y=Math.PI/2;hd.position.set(0,-.2,-.75);hd.material.side=THREE.DoubleSide;g.add(hd);}
  else if(S.gs==='opt'){box(g,.12,.07,.14,LM(0x17191a),0,-.215,-.82);box(g,.06,.04,.05,LM(0x2a2d30),-.07,-.21,-.77);}
  gl.updateMatrixWorld(true);
  const glass=[[-gw/2,gh/2],[gw/2,gh/2],[gw/2,-gh/2],[-gw/2,-gh/2]].map(([x,y])=>new V3(x,y,0).applyMatrix4(gl.matrixWorld));
  // main panel: shaped body, painted face (one canvas), scope / RWR / second display set into it
  const pp=new THREE.Group();pp.position.set(0,-.472,-.668);pp.rotation.x=-.28;g.add(pp);
  box(pp,PW+.03,PH+.03,.03,pm,0,-.03,-.018);box(pp,PW+.2,.2,.03,pm,0,-.33,-.03,0);
  const cv=document.createElement('canvas');cv.width=CW;cv.height=CH;const tx=new THREE.CanvasTexture(cv);tx.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());o.tex.push(tx);
  const faceM=new THREE.MeshBasicMaterial({map:tx,toneMapped:false});const fm=new THREE.Mesh(new THREE.PlaneGeometry(PW,PH),faceM);fm.position.set(0,-.03,0);pp.add(fm);o.faces.push(faceM);
  const L=layout(S);
  {const bz=LM(0x101214,40),gls=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.1,shininess:120,specular:0x888888,depthWrite:false});
    const ring=(x,y,r,sq,wd)=>{const xm=lx(x),ym=ly(y)-.03,R=r*PX;
      if(sq&&wd){const Wm=wd*PX/2;box(pp,2*Wm+.012,.008,.012,bz,xm,ym+R+.004,.006);box(pp,2*Wm+.012,.008,.012,bz,xm,ym-R-.004,.006);box(pp,.008,2*R+.012,.012,bz,xm-Wm-.004,ym,.006);box(pp,.008,2*R+.012,.012,bz,xm+Wm+.004,ym,.006);return;}
      if(sq){[[0,R+.004,2*R+.012,.008],[0,-R-.004,2*R+.012,.008]].forEach(([dx,dy,w,h])=>box(pp,w,h,.012,bz,xm+dx,ym+dy,.006));[[-R-.004,0],[R+.004,0]].forEach(([dx])=>box(pp,.008,2*R+.012,.012,bz,xm+dx,ym,.006));return;}
      const t=new THREE.Mesh(new THREE.TorusGeometry(R+.0035,.0045,8,40),bz);t.position.set(xm,ym,.004);pp.add(t);
      const cup=new THREE.Mesh(new THREE.CylinderGeometry(R+.006,R+.006,.012,36,1,true),bz);cup.rotation.x=Math.PI/2;cup.position.set(xm,ym,.002);pp.add(cup);
      const gl=new THREE.Mesh(new THREE.CircleGeometry(R+.001,36),gls);gl.position.set(xm,ym,.0075);pp.add(gl);
      for(const a of[.8,3.9]){const sc=new THREE.Mesh(new THREE.CylinderGeometry(.0028,.0028,.004,8),LM(0x3a3d40,60));sc.rotation.x=Math.PI/2;sc.position.set(xm+Math.cos(a)*(R+.012),ym+Math.sin(a)*(R+.012),.004);pp.add(sc);}};
    for(const k of Object.keys(L.dial||{})){const[x,y,r]=L.dial[k],t=k.replace(/_.*$/,'');if(t==='lamp'){const lm=new THREE.Mesh(new THREE.SphereGeometry(r*PX,12,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhongMaterial({color:0x661a14,transparent:true,opacity:.35,shininess:90}));lm.rotation.x=Math.PI/2;lm.position.set(lx(x),ly(y)-.03,.0);pp.add(lm);continue;}
      if(t==='vbar'){const w=Math.max(26,r*.34)+14;ring(x,y,r+8,true,w);continue;}ring(x,y,t==='tapeS'||t==='tapeA'?r:r+5,t==='tapeS'||t==='tapeA');}
    // switch plates, annunciators, gear handle get raised frames
    for(const pl of L.plates||[]){const[x,y,w,h]=pl;box(pp,w*PX,h*PX,.006,LM(0x1a1c1e,10),lx(x+w/2),ly(y+h/2)-.03,-.001);}
    if(L.gearH){const[x,y]=L.gearH;const hd=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.02,16),LM(S.l==='ru'?0xc02a1a:0xe8e8e8,40));hd.rotation.x=Math.PI/2;hd.position.set(lx(x),ly(y+44)-.03,.02);pp.add(hd);}}
  const scr=(canvas,shape,cx,cy,r,id)=>{if(!canvas)return;const cxm=lx(cx),cym=ly(cy)-.03;
    if(shape==='round'){const h=new THREE.Mesh(new THREE.CylinderGeometry(r*PX+.012,r*PX+.016,.03,40),blk);h.rotation.x=Math.PI/2;h.position.set(cxm,cym,.012);pp.add(h);}else box(pp,2*r*PX+.03,2*r*PX+.03,.03,blk,cxm,cym,.012);
    const geo=shape==='round'?new THREE.CircleGeometry(r*PX,48):new THREE.PlaneGeometry(2*r*PX,2*r*PX);
    const m=new THREE.MeshBasicMaterial({map:liveTex(kind,canvas),toneMapped:false});const ms=new THREE.Mesh(geo,m);ms.position.set(cxm,cym,.0285);ms.userData.cwFx=0;if(id)ms.userData.screen=id;pp.add(ms);o.faces.push(m);};
  if(L.scope)scr(scopeOf(S.sc),S.sc==='ph'?'round':'sq',L.scope[0],L.scope[1],L.scope[2],S.sc==='ph'?'phscope':'fcr');
  if(L.m2)scr(scopeOf(S.m2),'sq',L.m2[0],L.m2[1],L.m2[2],S.m2);
  if(L.rwr)scr(rwrC,'round',L.rwr[0],L.rwr[1],L.rwr[2],null);
  // side consoles and sills
  [-1,1].forEach(sd=>{if(S.sbs&&sd>0)return;box(g,.2,.09,.95,cm,sd*.43,-.66,-.16);box(g,.05,.16,1.3,dk,sd*.55,-.48,-.2);
    if(!S.con)for(let i=0;i<4;i++)box(g,.14,.006,.16,LM(0x24282a),sd*.43,-.612,-.5+i*.2);});
  box(g,.3,.25,.3,dk,0,-.98,-.55);// pedestal under the panel
  // console tops: painted switch panels per jet  S.con={L:[[title,[switches]],..],R:[..]}
  // console tops: painted switch panels per jet S.con={L:[[title,[switches]],..],R:[..]}. v238: every switch is a clickable control
  // (state shown on the lever, tooltip with ON/OFF); switches that have a game function call it (see CW_SW.act)
  if(S.con)['L','R'].forEach((sd,si)=>{const list=S.con[sd]||[];const cc=document.createElement('canvas');cc.width=256;cc.height=1024;const x=cc.getContext('2d');
    const t=new THREE.CanvasTexture(cc);const ph=1024/Math.max(1,list.length);
    const draw=()=>{x.fillStyle='#'+(S.cc||S.pc).toString(16).padStart(6,'0');x.fillRect(0,0,256,1024);
      list.forEach(([ti,sw],i)=>{const y=i*ph;x.fillStyle='rgba(0,0,0,.3)';x.fillRect(8,y+6,240,ph-12);x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=2;x.strokeRect(8,y+6,240,ph-12);
        x.font='bold 15px Arial';x.textAlign='center';x.fillStyle='#e8e8e0';x.fillText(ti,128,y+24);
        (sw||[]).forEach((w,j)=>{const cols=Math.min(3,sw.length),sx=40+(j%cols)*88,sy=y+Math.min(60,ph*.48)+Math.floor(j/cols)*54,on=CW_SW.get(id,w,ti);
          x.fillStyle='#4a4a4a';x.beginPath();x.arc(sx,sy,10,0,7);x.fill();x.fillStyle=on?'#f0f0e8':'#9a9a92';x.fillRect(sx-3,on?sy-20:sy+2,6,18);
          x.fillStyle=on?'#56ff7a':'#3a2a20';x.beginPath();x.arc(sx+16,sy-12,3.5,0,7);x.fill();
          x.font='11px Arial';x.fillStyle='#c8c8c0';x.fillText(w,sx,sy+Math.min(26,ph*.2));});});t.needsUpdate=true;};
    draw();CW_SW.redraw.push(draw);
    const m=new THREE.MeshBasicMaterial({map:t,toneMapped:false});o.faces.push(m);const pl=new THREE.Mesh(new THREE.PlaneGeometry(.19,.94),m);pl.rotation.x=-Math.PI/2;
    const cx=(si?1:-1)*.43+(si&&S.sbs?.78:0);pl.position.set(cx,-.613,-.16);g.add(pl);
    const hm=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
    list.forEach(([ti,sw],i)=>{(sw||[]).forEach((w,j)=>{const cols=Math.min(3,sw.length),sx=40+(j%cols)*88,sy=i*ph+Math.min(60,ph*.48)+Math.floor(j/cols)*54;
      const hb=new THREE.Mesh(new THREE.BoxGeometry(.03,.02,.03),hm);hb.position.set(cx+(sx/256-.5)*.19,-.6,-.16+(sy/1024-.5)*.94);hb.userData.cwFx=1;
      const def={meshes:[hb],name:ti+' · '+w,state:()=>CW_SW.label(id,w,ti),act:()=>{CW_SW.flip(id,w,ti);try{sfx.click();}catch(e){}}};hb.userData.ctl=def;g.add(hb);
      const lv=box(g,.006,.022,.006,LM(0xcccccc,40),cx+(sx/256-.5)*.19,-.6,-.16+(sy/1024-.5)*.94,-.4);lv.userData.cwFx=1;});});});
  // v239: START / ELECTRICAL panel at the front of the right console (every jet), main-panel plate switches and caution-lamp test are clickable
  {const SL={en:['BATT','EXT PWR','FUEL MSTR','SRC','ENG SEL','START','GEN','START / ELEC'],ru:['АККУМ','АЭР ПИТ','ПЦН','ВСУ','ВЫБОР ДВ','ЗАПУСК','ГЕН','ЗАПУСК / ЭЛЕКТРО'],
      fr:['BATT','PARC','BP','GROUPE','MOTEUR','DEMAR','ALT','DEMARRAGE'],sv:['BATT','YTTRE','LT-KRAN','AGG','MOTOR','START','GEN','START / EL'],zh:['电瓶','地面电源','燃油','起动源','选发','起动','发电','起动 / 电源']}[S.l]||null;
    const lab=SL||['BATT','EXT PWR','FUEL MSTR','SRC','ENG SEL','START','GEN','START / ELEC'],acts=['batt','ext','fm','src','sel','starter','gen'];
    const cv2=document.createElement('canvas');cv2.width=512;cv2.height=200;const x2=cv2.getContext('2d'),t2=new THREE.CanvasTexture(cv2);
    const st=k=>{const P=typeof player!=='undefined'?player:null;const E=P&&P.type===id&&P.eng;if(!E)return k==='src'?false:k==='sel'?false:k==='starter'?false:true;
      const e=E.e[E.sel];return k==='batt'?E.batt:k==='ext'?E.ext:k==='fm'?E.fm:k==='src'?(E.sp.src==='AIR'?E.air:E.aux>0):k==='sel'?E.sel===1:k==='starter'?e.st:E.gen;};
    const draw2=()=>{x2.fillStyle='#'+(S.cc||S.pc).toString(16).padStart(6,'0');x2.fillRect(0,0,512,200);x2.strokeStyle='rgba(255,255,255,.3)';x2.lineWidth=3;x2.strokeRect(6,6,500,188);
      x2.font='bold 20px Arial';x2.textAlign='center';x2.fillStyle='#eee';x2.fillText(lab[7],256,30);
      acts.forEach((a,i)=>{const sx=40+i*72,sy=110,on=st(a);
        if(a==='starter'){x2.fillStyle=on?'#ff8040':'#7a1a12';x2.beginPath();x2.arc(sx,sy,18,0,7);x2.fill();x2.strokeStyle='#222';x2.stroke();}
        else{x2.fillStyle='#3a3a3a';x2.beginPath();x2.arc(sx,sy,13,0,7);x2.fill();x2.fillStyle=on?'#f2f2ea':'#999';x2.fillRect(sx-4,on?sy-34:sy+4,8,30);}
        x2.fillStyle=on?'#56ff7a':'#2a2a22';x2.beginPath();x2.arc(sx,sy-48,6,0,7);x2.fill();
        x2.font='bold 13px Arial';x2.fillStyle='#ddd';x2.fillText(a==='sel'?(on?lab[4]+' R':lab[4]+' L'):lab[i],sx,sy+62);});t2.needsUpdate=true;};
    draw2();CW_SW.redraw.push(draw2);
    const sp=new THREE.Group();sp.position.set(S.sbs?1.29:.52,-.46,-.42);sp.rotation.set(0,-Math.PI/2,0);sp.rotation.order='YXZ';sp.rotation.x=-.25;sp.scale.setScalar(1.55);g.add(sp);
    box(sp,.21,.09,.02,cm,0,0,-.012);const m2=new THREE.MeshBasicMaterial({map:t2,toneMapped:false});o.faces.push(m2);const pl2=new THREE.Mesh(new THREE.PlaneGeometry(.2,.078),m2);pl2.userData.cwFx=1;sp.add(pl2);
    const hm=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
    acts.forEach((a,i)=>{const hb=new THREE.Mesh(new THREE.BoxGeometry(.024,.04,.02),hm);hb.position.set((40+i*72)/512*.2-.1,.003,.004);hb.userData.cwFx=1;
      hb.userData.ctl={meshes:[hb],name:lab[7]+' · '+lab[i],state:()=>{const P=typeof player!=='undefined'?player:null;if(!P||!P.eng)return'ENGINES RUNNING';return a==='sel'?(st(a)?'RIGHT':'LEFT'):st(a)?'ON':'OFF';},
        act:()=>{try{if(window.START){START[a]();}sfx.click();}catch(e){}draw2();}};sp.add(hb);});}
  {const L0=layout(S),hm=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
    for(const pl of L0.plates||[]){const[px,py,pw,ph,ti,sw]=pl;(sw||[]).forEach((w,i)=>{const sx=px+pw*(i+.5)/sw.length,sy=py+ph*.58;
      const hb=new THREE.Mesh(new THREE.BoxGeometry(18*PX,24*PX,.02),hm);hb.position.set(lx(sx),ly(sy)-.03,.012);hb.userData.cwFx=1;
      hb.userData.ctl={meshes:[hb],name:ti+' · '+w,state:()=>CW_SW.label(id,w,ti),act:()=>{CW_SW.flip(id,w,ti);try{sfx.click();}catch(e){}}};pp.add(hb);});}
    if(L0.cau){const[cx0,cy0,cols,rows,cw,ch]=L0.cau;const hb=new THREE.Mesh(new THREE.BoxGeometry(cols*cw*PX,rows*ch*PX,.02),hm);hb.position.set(lx(cx0+cols*cw/2),ly(cy0+rows*ch/2)-.03,.012);hb.userData.cwFx=1;
      hb.userData.ctl={meshes:[hb],name:'WARNING LIGHTS · PRESS TO TEST',state:()=>'TEST',act:()=>{window._cwLT=performance.now()+2500;try{sfx.click();}catch(e){}}};pp.add(hb);}}
  // side-by-side: the navigator / WSO station to the right — panel continuation, hooded Orion-A / PNS-24 radar display turned to his seat,
  // the pedestal with the PNS-24M keyboard between the seats, his stick, his seat with him in it, and the centre canopy frame
  if(S.sbs){const W=new THREE.Group();W.position.set(.78,0,0);g.add(W);
    const wp=new THREE.Group();wp.position.set(-.02,-.47,-.68);wp.rotation.x=-.28;W.add(wp);box(wp,.7,.5,.03,pm,0,-.03,-.018);
    const wcv=document.createElement('canvas');wcv.width=512;wcv.height=360;const wc=wcv.getContext('2d');wc.fillStyle='#'+S.pc.toString(16).padStart(6,'0');wc.fillRect(0,0,512,360);
    const dl=(x,y,r,t)=>{wc.fillStyle='#050606';wc.beginPath();wc.arc(x,y,r+5,0,7);wc.fill();wc.fillStyle='#0e1212';wc.beginPath();wc.arc(x,y,r,0,7);wc.fill();wc.strokeStyle='#ddd';wc.lineWidth=2;for(let i=0;i<12;i++){const a=i*Math.PI/6;wc.beginPath();wc.moveTo(Math.cos(a)*r*.8+x,Math.sin(a)*r*.8+y);wc.lineTo(Math.cos(a)*r*.95+x,Math.sin(a)*r*.95+y);wc.stroke();}wc.fillStyle='#bbb';wc.font='bold 11px Arial';wc.textAlign='center';wc.fillText(t,x,y+r*.45);};
    dl(60,280,40,'ВЫСОТА');dl(150,290,36,'СКОРОСТЬ');dl(452,280,40,'ПНП');dl(452,190,34,'ЧАСЫ');
    wc.fillStyle='rgba(0,0,0,.35)';wc.fillRect(20,20,180,90);wc.fillStyle='#ddd';wc.font='bold 13px Arial';wc.fillText('ПУЛЬТ ОРИОН-А',110,40);
    for(let i=0;i<6;i++){wc.fillStyle=['#2a6','#d43','#da3','#2a6','#39d','#d43'][i];wc.beginPath();wc.arc(40+i*28,75,9,0,7);wc.fill();}
    const wt=new THREE.CanvasTexture(wcv),wm=new THREE.MeshBasicMaterial({map:wt,toneMapped:false});o.faces.push(wm);const wf=new THREE.Mesh(new THREE.PlaneGeometry(.68,.48),wm);wf.position.set(0,-.03,0);wp.add(wf);
    // the hooded radar display: a long black rubber visor, screen at its far end, turned toward the WSO's eye
    const hood=new THREE.Group();hood.position.set(.02,-.27,-.6);hood.rotation.set(-.2,0,0);W.add(hood);const rub=LM(0x0c0c0d,4);rub.side=THREE.DoubleSide;
    box(hood,.3,.012,.34,rub,0,.13,0);box(hood,.012,.26,.34,rub,-.15,0,0);box(hood,.012,.26,.34,rub,.15,0,0);box(hood,.3,.012,.14,rub,0,-.13,-.1);
    for(let i=0;i<4;i++){const z=-.12+i*.08;box(hood,.32,.018,.018,rub,0,.135,z);box(hood,.018,.27,.018,rub,-.155,0,z);box(hood,.018,.27,.018,rub,.155,0,z);}
    const sm2=new THREE.MeshBasicMaterial({map:liveTex(kind,fcrC),toneMapped:false});o.faces.push(sm2);const scn=new THREE.Mesh(new THREE.PlaneGeometry(.27,.23),sm2);scn.position.set(0,0,-.17);scn.userData.screen='fcr';hood.add(scn);
    // pedestal between the seats with the PNS-24M navigation keyboard
    const kcv=document.createElement('canvas');kcv.width=256;kcv.height=512;const kc=kcv.getContext('2d');kc.fillStyle='#'+S.pc.toString(16).padStart(6,'0');kc.fillRect(0,0,256,512);
    kc.fillStyle='#111';kc.fillRect(30,30,196,200);for(let r=0;r<5;r++)for(let q=0;q<4;q++){kc.fillStyle='#d8d8d0';kc.fillRect(40+q*46,42+r*36,38,28);kc.fillStyle='#222';kc.font='bold 14px Arial';kc.textAlign='center';kc.fillText(String((r*4+q)%10),59+q*46,61+r*36);}
    kc.fillStyle='#000';kc.fillRect(30,250,196,40);kc.fillStyle='#ff7a30';kc.font='bold 20px monospace';kc.fillText('ПНС 24М  0451',128,277);
    for(let i=0;i<6;i++){kc.fillStyle='#c33';kc.fillRect(40+(i%3)*64,320+Math.floor(i/3)*70,44,40);}
    const km=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(kcv),toneMapped:false});o.faces.push(km);const kp=new THREE.Mesh(new THREE.PlaneGeometry(.2,.4),km);kp.rotation.x=-1.1;kp.position.set(-.39,-.66,-.5);W.add(kp);
    box(W,.22,.3,.42,pm,-.39,-.83,-.45);
    // WSO stick and throttle-less side, his seat and him
    const ws=new THREE.Group();ws.position.set(0,-.95,-.28);W.add(ws);box(ws,.025,.33,.025,LM(0x9aa3a5,30),0,.17,0);box(ws,.045,.1,.05,LM(0xb8bfc0,30),0,.37,0,-.2);box(ws,.014,.02,.014,LM(0xc02020),.0,.43,.01);
    const seat=LM(0x2c3a46,8);box(W,.5,.1,.5,LM(0x9a2a2a,10),0,-1.0,.25);box(W,.5,.75,.12,seat,0,-.6,.55);box(W,.36,.2,.1,LM(0x7a2222,10),0,-.18,.52);
    const suit=LM(0x4d5a3f,12),hel=LM(0xd8d8d0,40);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.17,.19,.55,12),suit);body.position.set(0,-.6,.38);W.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),hel);head.position.set(0,-.18,.36);W.add(head);
    const vis=new THREE.Mesh(new THREE.SphereGeometry(.132,16,12,-Math.PI*.35,Math.PI*.7,Math.PI*.35,Math.PI*.3),LM(0x202a30,90));vis.position.copy(head.position);W.add(vis);
    for(const sd of[-1,1]){const arm=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.42,8),suit);arm.position.set(sd*.2,-.62,.18);arm.rotation.x=1.1;W.add(arm);}
    // canopy: the centre frame between the two hatches
    box(g,.05,.04,1.6,LM(0x2c3236,20),.39,.2,-.2);box(g,.03,.36,.03,LM(0x2c3236,20),.39,.02,-.95);
    // right console for the WSO
    box(W,.2,.09,.95,cm,.43,-.66,-.16);}
  // own stick and throttle; they copy the borrowed ones' motion each frame
  const stkG=new THREE.Group(),thrG=new THREE.Group();g.add(stkG);g.add(thrG);const sm=LM(0x1a1a1a,30),gm=LM(0x2b2b2b,20),bt=LM(0xb02020,30);
  const st=S.stk||'b8';
  box(stkG,.025,.34,.025,sm,0,.17,0);
  if(st==='ru'){const ring=new THREE.Mesh(new THREE.TorusGeometry(.045,.008,8,20,Math.PI*1.3),gm);ring.position.set(0,.36,0);ring.rotation.z=-Math.PI*.15;stkG.add(ring);box(stkG,.03,.07,.03,gm,0,.34,0);box(stkG,.012,.02,.012,bt,.02,.38,-.01);}
  else if(st==='a1'){box(stkG,.035,.1,.04,gm,0,.38,0,-.2);box(stkG,.012,.025,.012,bt,0,.43,.005);box(stkG,.006,.03,.02,LM(0x888888),0,.36,-.025);}
  else{box(stkG,.04,.12,.045,gm,0,.39,-.005,-.25);box(stkG,.016,.018,.016,LM(0x777777),0,.455,.005);box(stkG,.012,.02,.012,bt,-.018,.43,.0);box(stkG,.006,.03,.02,LM(0x888888),0,.37,-.03);}
  const nt=S.thr||1;for(let i=0;i<nt;i++){const lv=new THREE.Group();lv.position.x=(i-(nt-1)/2)*.035;box(lv,.012,.16,.012,sm,0,.08,0);box(lv,nt>1?.03:.05,.05,.05,gm,0,.17,0);thrG.add(lv);}
  return{g,cv,tx,S,L,glass,lb:LB[S.l]||LB.en,t:0,stkG,thrG};}

// panel layout in canvas px: [x, y, r]
function layout(S){if(S.lay){const L=JSON.parse(JSON.stringify(S.lay));if(!L.scope)L.scope=null;L.dial=L.dial||{};if(!L.rwr)L.rwr=null;return L;}
  const sc=!!S.sc,two=!!S.m2,L={dial:{}};
  L.rwr=[88,92,58];L.dial.ias=[222,104,70];L.dial.aoa=[88,232,54];L.dial.vvi=[222,248,60];
  L.dial.alt=[800,104,70];L.dial.clk=[940,90,46];
  if(S.e===2){L.dial.rpm=[800,240,56];L.dial.rpm2=[940,214,50];}else{L.dial.rpm=[800,240,56];L.dial.ff=[940,214,46];}
  L.dial.egt=[800,372,54];L.dial.fuel=[940,350,58];
  if(sc&&two){L.scope=[420,124,92];L.m2=[606,124,92];L.dial.adi=[430,370,74];L.dial.hsi=[600,370,74];}
  else if(sc){L.scope=[512,130,112];L.dial.adi=[420,372,74];L.dial.hsi=[604,372,74];}
  else{L.dial.adi=[512,138,96];L.dial.hsi=[512,365,82];L.dial.g=[380,130,46];}
  L.box=[22,312,312,170];return L;}

// ---------- painting ----------
function paint(B,P){const c=B.cv.getContext('2d'),S=B.S,lb=B.lb,ru=S.l==='ru'||S.l==='zh',imp=S.u==='imp';
  const col='#'+S.pc.toString(16).padStart(6,'0');c.fillStyle=col;c.fillRect(0,0,CW,CH);
  // panel screws and engraved separators
  c.fillStyle='rgba(0,0,0,.25)';c.fillRect(326,6,2,CH-12);c.fillRect(696,6,2,CH-12);
  c.fillStyle='rgba(255,255,255,.18)';for(const[x,y]of[[10,10],[CW-10,10],[10,CH-10],[CW-10,CH-10],[512,8]]){c.beginPath();c.arc(x,y,4,0,7);c.fill();}
  const face=ru&&S.pc!==0x262826?'#0e1212':'#0c0d0e',ink='#eef0ea',dimInk='#aab0a8';
  const T=(s,x,y,sz=13,cl=ink,al='center')=>{c.font=`bold ${sz}px Arial, "Noto Sans", sans-serif`;c.textAlign=al;c.textBaseline='middle';c.fillStyle=cl;c.fillText(s,x,y);};
  const dial=(k,draw)=>{const d=B.L.dial[k];if(!d)return;const[x,y,r]=d;c.save();c.translate(x,y);
    c.fillStyle='#050606';c.beginPath();c.arc(0,0,r+6,0,7);c.fill();const gr=c.createRadialGradient(0,-r*.2,r*.1,0,0,r);gr.addColorStop(0,'#191b1c');gr.addColorStop(1,face);c.fillStyle=gr;c.beginPath();c.arc(0,0,r,0,7);c.fill();
    c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=1;c.beginPath();c.arc(0,0,r*.98,0,7);c.stroke();draw(r);const sh=c.createRadialGradient(0,0,r*.8,0,0,r);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=sh;c.beginPath();c.arc(0,0,r,0,7);c.fill();c.restore();};
  const ticks=(r,a0,a1,n,maj=1)=>{c.strokeStyle=ink;for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n-90)*D2R,M=i%maj===0;c.lineWidth=M?2.5:1.2;c.beginPath();c.moveTo(Math.cos(a)*r*(M?.78:.86),Math.sin(a)*r*(M?.78:.86));c.lineTo(Math.cos(a)*r*.96,Math.sin(a)*r*.96);c.stroke();}};
  const nums=(r,a0,a1,vals)=>vals.forEach((v,i)=>{const a=(a0+(a1-a0)*i/(vals.length-1)-90)*D2R;T(String(v),Math.cos(a)*r*.6,Math.sin(a)*r*.6,Math.max(10,r*.2));});
  const ndl=(r,deg,len=.82,cl=ink,w=4)=>{c.save();c.rotate(deg*D2R);c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=4;c.shadowOffsetX=2;c.shadowOffsetY=3;c.fillStyle=cl;c.beginPath();c.moveTo(-w*.6,r*.14);c.lineTo(-w*.45,-r*len*.8);c.lineTo(0,-r*len);c.lineTo(w*.45,-r*len*.8);c.lineTo(w*.6,r*.14);c.closePath();c.fill();c.shadowColor='transparent';c.fillStyle='#2a2a2a';c.beginPath();c.arc(0,0,r*.08,0,7);c.fill();c.fillStyle='#777';c.beginPath();c.arc(0,0,r*.03,0,7);c.fill();c.restore();};
  if(!P)return;
  const run=P.totalFuel>0&&!(P.eng&&!P.eng.done&&!P.eng.e.some(e=>e.lit)),n=clamp(P.n||0,0,1.1),ab=P.ab||0;
  // airspeed
  dial('ias',r=>{const v=imp?(P.cas||0):(P.cas||0)*1.852,mx=imp?800:1400,a=-150+300*clamp(v/mx,0,1);
    ticks(r,-150,150,16,2);nums(r,-150,150,imp?[0,200,400,600,800]:[0,350,700,1050,1400]);ndl(r,a);T(lb.ias,0,r*.3,10,dimInk);T('M '+(P.mach||0).toFixed(2),0,-r*.28,12);});
  // altimeter: hundreds / thousands needles, digital window
  dial('alt',r=>{const h=imp?P.pos.y*3.2808:P.pos.y,u=imp?1000:1000;ticks(r,0,360,50,5);nums(r,0,324,[0,1,2,3,4,5,6,7,8,9]);
    ndl(r,360*((h%u)/u),.85);ndl(r,360*((h/(u*10))%1),.5,'#e8c040',6);c.fillStyle='#000';c.fillRect(-r*.42,r*.22,r*.84,r*.3);T(String(Math.max(0,Math.round(h/10)*10)),0,r*.37,12,'#fff');T(lb.alt+' '+(imp?'FT':lb.ft),0,-r*.35,9,dimInk);});
  dial('vvi',r=>{ticks(r,-170,-10,8,2);ticks(r,10,170,8,2);const vs=(P.vel?P.vel.y:0),k=imp?vs*196.85/6000:vs/100;ndl(r,-90+clamp(k,-1,1)*80);T(lb.vvi,r*.25,0,9,dimInk,'left');T(imp?'×1000 FPM':S.l==='ru'?'М/С':'M/S',r*.25,r*.25,8,dimInk,'left');});
  dial('aoa',r=>{ticks(r,-140,-20,6);ticks(r,20,140,6);ndl(r,-140+120*clamp(((P.alpha||0)*R2D+5)/35,0,1),.8);ndl(r,140-120*clamp(((P.nz||1)+2)/11,0,1),.8,'#e8c040',3);T(lb.aoa,-r*.32,r*.45,10,dimInk);T(lb.g,r*.32,r*.45,10,'#e8c040');});
  dial('g',r=>{ticks(r,-150,150,15,5);ndl(r,-150+300*clamp(((P.nz||1)+5)/15,0,1));ndl(r,-150+300*clamp(((P.maxNz||1)+5)/15,0,1),.7,'#e05040',2);T(lb.g,0,r*.4,11,dimInk);});
  dial('clk',r=>{const d=new Date();ticks(r,0,330,11,3);ndl(r,360*((d.getHours()%12)+d.getMinutes()/60)/12,.5);ndl(r,360*d.getMinutes()/60,.8,ink,3);ndl(r,6*d.getSeconds(),.85,'#e05040',1.5);});
  const rpm=k=>dial(k,r=>{const E=P.eng,ei=k==='rpm2'?1:0,v=E&&!E.done&&E.e[Math.min(ei,E.e.length-1)]?E.e[Math.min(ei,E.e.length-1)].rpm/100:run?(.62+.38*(k==='rpm2'?n*.995:n)):0;ticks(r,-135,135,11,2);nums(r,-135,135,[0,20,40,60,80,100]);ndl(r,-135+270*clamp(v/1.1,0,1));T(lb.rpm,0,r*.42,9,dimInk);T(String(Math.round(v*100)),0,-r*.3,11);if(ab>.02){T(lb.ab,0,r*.66,9,'#ffb030');}});
  rpm('rpm');rpm('rpm2');
  dial('ff',r=>{ticks(r,-135,135,10,2);ndl(r,-135+270*clamp(run?(.12+n*.55+ab*.33):0,0,1));T(lb.ff,0,r*.42,8,dimInk);});
  dial('egt',r=>{ticks(r,-135,135,9,3);const E=P.eng,e=k=>E&&!E.done?clamp(E.e[0].egt+k,0,1):clamp(run?.25+n*.55+ab*.15+k:0,0,1);ndl(r,-135+270*e(0));if(S.e===2)ndl(r,-135+270*e(-.012),.62,'#e8c040',3);T(lb.egt+(S.l==='en'?' °C':''),0,r*.42,9,dimInk);});
  dial('fuel',r=>{const f=P.totalFuel||0,mx=Math.max(1,(P.ac.fuel||3000)+(P.ac.tank||0)*2),v=imp?f*2.2046:f;ticks(r,-135,135,10,2);ndl(r,-135+270*clamp(f/mx,0,1));
    c.fillStyle='#000';c.fillRect(-r*.48,r*.18,r*.96,r*.32);T(String(Math.round(v/10)*10),0,r*.34,12,'#fff');T(lb.fuel+(imp?' LB':' KG'),0,-r*.35,9,dimInk);});
  // ADI
  dial('adi',r=>{c.save();c.beginPath();c.arc(0,0,r,0,7);c.clip();c.rotate(-(P.bank||0));const po=(P.pitch||0)*R2D*r/45;
    c.fillStyle=ru?'#4f86b8':'#9aa3a8';c.fillRect(-r*2,-r*2+po,r*4,r*2);c.fillStyle=ru?'#6b4a2a':'#1a1a1a';c.fillRect(-r*2,po,r*4,r*2);
    c.strokeStyle=ru?'#fff':'#fff';c.lineWidth=2;c.beginPath();c.moveTo(-r*2,po);c.lineTo(r*2,po);for(let q=-60;q<=60;q+=10){if(!q)continue;const yy=po-q*r/45,w=q%30?r*.18:r*.36;c.moveTo(-w,yy);c.lineTo(w,yy);}c.stroke();c.restore();
    c.strokeStyle='#ffb21a';c.lineWidth=5;c.beginPath();c.moveTo(-r*.6,0);c.lineTo(-r*.18,0);c.lineTo(-r*.1,r*.1);c.moveTo(r*.6,0);c.lineTo(r*.18,0);c.lineTo(r*.1,r*.1);c.stroke();ticks(r,-60,60,8,2);});
  // HSI / compass card
  dial('hsi',r=>{c.save();c.rotate(-(P.hdg||0)*D2R);c.strokeStyle=ink;c.lineWidth=2;for(let i=0;i<72;i++){const a=i*5*D2R,l=i%2?.9:.82;c.beginPath();c.moveTo(Math.sin(a)*r*l,-Math.cos(a)*r*l);c.lineTo(Math.sin(a)*r*.97,-Math.cos(a)*r*.97);c.stroke();}
    const card=S.l==='ru'?['С','В','Ю','З']:S.l==='zh'?['北','东','南','西']:S.l==='fr'||S.l==='sv'?['N','E','S',S.l==='fr'?'O':'V']:['N','E','S','W'];
    card.forEach((s,i)=>{c.save();c.rotate(i*Math.PI/2);T(s,0,-r*.65,Math.round(r*.22),'#fff');c.restore();});[3,6,12,15,21,24,30,33].forEach(v=>{c.save();c.rotate(v*10*D2R);T(String(v),0,-r*.66,Math.round(r*.16),dimInk);c.restore();});c.restore();
    c.fillStyle='#ffb21a';c.beginPath();c.moveTo(0,-r);c.lineTo(-7,-r+14);c.lineTo(7,-r+14);c.closePath();c.fill();c.strokeStyle='#ffb21a';c.lineWidth=3;c.beginPath();c.moveTo(0,-r*.3);c.lineTo(0,r*.3);c.moveTo(-r*.22,0);c.lineTo(r*.22,0);c.stroke();
    T(String(Math.round(P.hdg||0)).padStart(3,'0'),0,r*.55,12,'#fff');});
  // stores / gear / caution block
  if(!B.L.box){return extra(B,P,c,T,dial,ticks,nums,ndl,ink,dimInk);}
  const[bx,by,bw,bh]=B.L.box;c.fillStyle='rgba(0,0,0,.35)';c.fillRect(bx,by,bw,bh);c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=2;c.strokeRect(bx,by,bw,bh);
  const armed=game.armPos===0,w=game.wsel||'GUN';
  T(lb.arm,bx+14,by+20,12,ink,'left');c.fillStyle=armed?'#ff4a2a':'#3a1612';c.fillRect(bx+170,by+9,62,22);T(armed?'ARM':lb.safe,bx+201,by+20,11,armed?'#fff':'#a08070');
  let cnt='';try{cnt=w==='GUN'?String(P.gun.ammo):String(P.count(w));}catch(e){}
  T(lb.wpn,bx+14,by+50,12,ink,'left');c.fillStyle='#000';c.fillRect(bx+100,by+38,bw-112,24);T(((typeof SN!=='undefined'&&SN[w])||w)+'  '+cnt,bx+108,by+50,13,'#7dffa0','left');
  // gear: three lamps (green down and locked, red in transit)
  let gd=false;try{gd=P.ac.cockpit==='fulcrum'?!!sys.mig.gear:!!sys.v.gear;}catch(e){}const tr=(P.gearPos!=null)&&P.gearPos>.05&&P.gearPos<.95;
  T(lb.gear,bx+14,by+92,12,ink,'left');[[bx+150,by+80],[bx+125,by+104],[bx+175,by+104]].forEach(([x,y])=>{c.fillStyle=tr?'#ff3a2a':gd?'#46ff6a':'#123a1a';c.beginPath();c.arc(x,y,10,0,7);c.fill();});
  // caution lamps
  const lowF=P.totalFuel<(P.ac.fuel||3000)*.15,cau=[[lb.fire,P.fire>0||P.hp<25],[lb.hyd,P.hp<45],[lb.low,lowF],[lb.eng,!run]];
  cau.forEach(([s,on],i)=>{const x=bx+214+(i%2)*46,y=by+78+Math.floor(i/2)*34;c.fillStyle=on?(i===0?'#ff3a2a':'#ffb21a'):'#2a2416';c.fillRect(x-21,y-13,42,26);T(s,x,y,s.length>6?7:9,on?'#200':'#7a6a40');});
  // scope / display labels under the screens
  if(B.L.scope){const[x,y,r]=B.L.scope;T(S.sc==='ph'?(S.l==='ru'?'РЛС':S.l==='zh'?'雷达':'RADAR'):'',x,y+r+18,11,dimInk);}
  if(B.L.rwr)T(B.S.l==='ru'?'СПО':S.l==='zh'?'告警':'RWR',B.L.rwr[0],B.L.rwr[1]+B.L.rwr[2]+15,10,dimInk);
  extra(B,P,c,T,dial,ticks,nums,ndl,ink,dimInk);}


// ---------- extra instruments, sub-panels, annunciators, gear handle (per-jet layouts) ----------
function extra(B,P,c,T,dial,ticks,nums,ndl,ink,dimInk){const S=B.S,L=B.L,lb=B.lb,ru=S.l==='ru',run=P.totalFuel>0&&!(P.eng&&!P.eng.done&&!P.eng.e.some(e=>e.lit)),n=clamp(P.n||0,0,1.1),ab=P.ab||0;
  const lab=(r,s,y=.42)=>T(s,0,r*y,Math.max(8,Math.round(r*.15)),dimInk);
  const gauge=(k,v,txt,a0=-135,a1=135,nn=10)=>dial(k,r=>{ticks(r,a0,a1,nn,2);ndl(r,a0+(a1-a0)*clamp(v,0,1));lab(r,txt);});
  for(const k of Object.keys(L.dial)){const t=k.replace(/_.*$/,'');
    if(t==='oil')gauge(k,run?.35+n*.4:0,ru?'МАСЛО':'OIL PSI');
    else if(t==='hyd')gauge(k,run?.75+.02*Math.sin(performance.now()/900):0,ru?'ГИДРО':'HYD PSI');
    else if(t==='noz'||t==='noz2')gauge(k,ab>.02?.85:clamp(1-n,0,1)*.4,ru?'СОПЛО':'NOZ POS %');
    else if(t==='egt2')dial(k,r=>{ticks(r,-135,135,9,3);ndl(r,-135+270*clamp(run?.25+n*.55+ab*.15-.012:0,0,1));lab(r,lb.egt);});
    else if(t==='fpr')gauge(k,run?.3+n*.5:0,ru?'ДАВЛ ТОПЛ':'FUEL PRESS');
    else if(t==='oxy')gauge(k,.82,ru?'КИСЛОРОД':'OXYGEN');
    else if(t==='cab')gauge(k,clamp(P.pos.y/15000,0,1)*.6,ru?'ВЫСОТА КАБ':'CABIN ALT');
    else if(t==='lox')gauge(k,.7,ru?'КИСЛОРОД':'LOX');
    else if(t==='acc')dial(k,r=>{ticks(r,-150,150,15,5);nums(r,-150,150,[-5,0,5,10]);ndl(r,-150+300*clamp(((P.nz||1)+5)/15,0,1));ndl(r,-150+300*clamp(((P.maxNz||1)+5)/15,0,1),.7,'#e05040',2);lab(r,ru?'ПЕРЕГРУЗКА':'ACCEL G',.4);});
    else if(t==='mach')dial(k,r=>{ticks(r,-150,150,12,2);nums(r,-150,150,ru?['.5','.6','.7','.8','.9','1.0']:['.4','.8','1.2','1.6','2.0','2.4']);
      const m=P.mach||0,v=ru?(m-.5)/.5:(m-.4)/2;ndl(r,-150+300*clamp(v,0,1));lab(r,ru?'М':'MACH');});
    else if(t==='turn')dial(k,r=>{const rr=(P.yawRate!=null?P.yawRate:(P.angVel?P.angVel.y:0));ndl(r,clamp(-rr*R2D*12,-60,60),.8);
      c.fillStyle='#222';c.fillRect(-r*.55,r*.42,r*1.1,r*.22);c.fillStyle='#fff';c.beginPath();c.arc(clamp((P.beta||0)*R2D*-4,-r*.45,r*.45),r*.53,r*.09,0,7);c.fill();lab(r,ru?'ЭУП':'TURN',-.45);});
    else if(t==='cmp')dial(k,r=>{c.save();c.rotate(-(P.hdg||0)*D2R);for(let i=0;i<36;i++){c.save();c.rotate(i*10*D2R);c.fillStyle=ink;c.fillRect(-1,-r*.95,2,i%3?r*.08:r*.15);if(i%9===0)T(ru?['С','В','Ю','З'][i/9]:['N','E','S','W'][i/9],0,-r*.68,Math.round(r*.2));c.restore();}c.restore();
      let br=0;try{const tg=jets.find(j=>j!==P&&j.alive&&j.side!==P.side);if(tg)br=Math.atan2(tg.pos.x-P.pos.x,-(tg.pos.z-P.pos.z))*R2D-(P.hdg||0);}catch(e){}ndl(r,br,.85,'#e8c040',3);lab(r,ru?'АРК':'RADIO COMP',.35);});
    else if(t==='apc')dial(k,r=>{ticks(r,-120,120,8,2);ndl(r,-120+240*clamp(((P.alpha||0)*R2D)/25,0,1));c.strokeStyle='#e03030';c.lineWidth=5;c.beginPath();c.arc(0,0,r*.9,(-90+60)*D2R,(-90+120)*D2R);c.stroke();lab(r,'APC / AOA');});
    else if(t==='tapeS'||t==='tapeA'){const[x,y,r]=L.dial[k],w=r*.62;c.save();c.translate(x,y);c.fillStyle='#08090a';c.fillRect(-w/2-5,-r-5,w+10,2*r+10);c.fillStyle='#0c0d0e';c.fillRect(-w/2,-r,w,2*r);
      c.beginPath();c.rect(-w/2,-r,w,2*r);c.clip();const imp=S.u==='imp',v=t==='tapeS'?(imp?(P.cas||0):(P.cas||0)*1.852):(imp?P.pos.y*3.2808:P.pos.y),step=t==='tapeS'?(imp?20:50):(imp?500:200),px=r/3/step;
      c.strokeStyle=ink;c.lineWidth=2;for(let q=Math.floor((v-3.5*step)/step)*step;q<v+3.5*step;q+=step){const yy=(v-q)*px*3/ (1);const Y=(v-q)*r/(3*step)*1;c.beginPath();c.moveTo(-w/2,Y);c.lineTo(-w/2+12,Y);c.stroke();T(String(Math.round(q)),4,Y,11,ink);}
      c.restore();c.fillStyle='#ffb21a';c.fillRect(x-w/2-8,y-2,w+16,4);c.fillStyle='#000';c.fillRect(x-w/2,y+r+8,w,18);T(t==='tapeS'?'M '+(P.mach||0).toFixed(2):String(Math.round((P.vel?P.vel.y:0)*(imp?196.85:1))),x,y+r+17,10,'#fff');T(t==='tapeS'?(lb.ias):(lb.alt),x,y-r-14,9,dimInk);}
    else if(t==='map')dial(k,r=>{c.fillStyle='#1d2a1a';c.beginPath();c.arc(0,0,r,0,7);c.fill();c.save();c.rotate(-(P.hdg||0)*D2R);c.strokeStyle='rgba(160,190,120,.35)';c.lineWidth=1;for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(i*r/4,-r);c.lineTo(i*r/4,r);c.moveTo(-r,i*r/4);c.lineTo(r,i*r/4);c.stroke();}
      try{for(const j of jets){if(j===P||!j.alive)continue;const dx=(j.pos.x-P.pos.x)/20000*r,dz=(j.pos.z-P.pos.z)/20000*r;if(dx*dx+dz*dz>r*r)continue;c.fillStyle=j.side===P.side?'#6af':'#f55';c.fillRect(dx-3,dz-3,6,6);}}catch(e){}
      c.restore();c.fillStyle='#ffe060';c.beginPath();c.moveTo(0,-9);c.lineTo(-6,7);c.lineTo(6,7);c.closePath();c.fill();lab(r,S.l==='ru'?'КАРТА':S.l==='fr'?'CARTE':S.l==='sv'?'KARTA':S.l==='zh'?'地图':'MAP',.8);});
    else if(t==='vbar'){const[x,y,r]=L.dial[k],w=Math.max(26,r*.34),kind=k.split('_')[1];const v=kind==='fuel'?clamp((P.totalFuel||0)/Math.max(1,(P.ac.fuel||3000)+(P.ac.tank||0)),0,1):kind==='rpm'?(run?n/1.1:0):clamp(run?.25+n*.55+ab*.15:0,0,1);
      const col=kind==='fuel'?'#e8c040':kind==='rpm'?'#5fa8e8':'#e89040';c.fillStyle='#050606';c.fillRect(x-w/2-6,y-r-6,w+12,2*r+12);c.strokeStyle=col;c.lineWidth=3;c.strokeRect(x-w/2-4,y-r-4,w+8,2*r+8);
      c.fillStyle='#101214';c.fillRect(x-w/2,y-r,w,2*r);for(let i=0;i<=10;i++){c.fillStyle=ink;c.fillRect(x-w/2,y+r-i*r/5,i%5?6:12,2);}
      const g2=c.createLinearGradient(0,y+r,0,y+r-2*r*v);g2.addColorStop(0,col);g2.addColorStop(1,'#fff8');c.fillStyle=g2;c.fillRect(x-w/2+8,y+r-2*r*v,w-12,2*r*v);
      T(kind==='fuel'?'Т':kind==='rpm'?'ОБ':'Т°',x,y+r+16,10,dimInk);}
    else if(t==='adi2')dial(k,r=>{c.save();c.beginPath();c.arc(0,0,r,0,7);c.clip();c.rotate(-(P.bank||0));const po=(P.pitch||0)*R2D*r/40;
      for(let i=-12;i<12;i++){c.fillStyle=i%2?'#d9d2b8':'#222';c.fillRect(-r*1.5,po+i*r*.18,r*3,r*.18);}c.restore();
      c.strokeStyle='#ff9020';c.lineWidth=4;c.beginPath();c.moveTo(-r*.6,0);c.lineTo(r*.6,0);c.stroke();lab(r,'ИКВ',.82);});
    else if(t==='trim')dial(k,r=>{ticks(r,-60,60,6,2);ndl(r,clamp((P.trim||P.ctl&&P.ctl.p*.3||0)*60,-60,60),.8);lab(r,'NOSE',-.4);});
    else if(t==='epr')dial(k,r=>{ticks(r,-135,135,10,2);nums(r,-135,135,['1.0','1.5','2.0','2.5','3.0','3.5']);ndl(r,-135+270*clamp(run?(.12+n*.6+ab*.15):0,0,1));lab(r,'EPR');});
    else if(t==='ralt')dial(k,r=>{const h=Math.max(0,(P.pos.y-groundAt(P.pos.x,P.pos.z))*3.2808),v=h<5000?h/5000:1;ticks(r,-150,150,10,2);nums(r,-150,150,[0,1,2,3,4,5]);
      if(h<5000)ndl(r,-150+300*v);else{c.fillStyle='#d23';c.fillRect(-r*.35,-r*.15,r*.7,r*.3);T('OFF',0,0,Math.round(r*.2),'#fff');}lab(r,'RADAR ALT ×1000',.48);});
    else if(t==='xfr')gauge(k,clamp(((P.totalFuel||0)-(P.ac.fuel||3000)*.55)/((P.ac.fuel||3000)*.45),0,1),'TRANSFER LB');
    else if(t==='uhf')dial(k,r=>{c.fillStyle='#000';c.fillRect(-r*.55,-r*.3,r*1.1,r*.6);T(String(((Math.floor((P.id||0))%18)+1)).padStart(2,'0'),0,0,Math.round(r*.45),'#fff');lab(r,'UHF CHAN',.62);});
    else if(t==='crs')dial(k,r=>{c.save();c.rotate(-(P.hdg||0)*D2R);ticks(r,0,350,35,3);c.restore();c.strokeStyle='#e8c040';c.lineWidth=3;c.beginPath();c.moveTo(0,-r*.8);c.lineTo(0,r*.8);c.stroke();lab(r,'COURSE',.5);});
    else if(t==='droop'){const[x,y,r]=L.dial[k];const fl=(P.flapCmd||0)>.5,tr=P._wingT>0;c.fillStyle='#050606';c.beginPath();c.arc(x,y,r+4,0,7);c.fill();
      if(tr){for(let i=-3;i<4;i++){c.fillStyle=i%2?'#eee':'#222';c.save();c.beginPath();c.arc(x,y,r,0,7);c.clip();c.translate(x,y);c.rotate(.8);c.fillRect(i*r*.3,-r,r*.3,2*r);c.restore();}}
      else{c.fillStyle='#111';c.beginPath();c.arc(x,y,r,0,7);c.fill();T(fl?'DN':'UP',x,y,Math.round(r*.7),'#fff');}}
    else if(t==='gi'){const[x,y,r]=L.dial[k];let gd=false;try{gd=!!sys.v.gear;}catch(e){}const tr=(P.gearPos!=null)&&P.gearPos>.05&&P.gearPos<.95;c.fillStyle='#050606';c.beginPath();c.arc(x,y,r+3,0,7);c.fill();
      c.save();c.beginPath();c.arc(x,y,r,0,7);c.clip();if(tr){for(let i=-4;i<5;i++){c.fillStyle=i%2?'#eee':'#222';c.save();c.translate(x,y);c.rotate(.8);c.fillRect(i*r*.3,-r*2,r*.3,4*r);c.restore();}}
      else if(gd){c.fillStyle='#ddd';c.fillRect(x-r,y-r,2*r,2*r);c.fillStyle='#222';c.beginPath();c.arc(x,y,r*.55,0,7);c.fill();}else{c.fillStyle='#222';c.fillRect(x-r,y-r,2*r,2*r);T('UP',x,y,Math.round(r*.8),'#fff');}c.restore();}
    else if(t==='lamp'){const[x,y,r]=L.dial[k];const on=(window._cwLT>performance.now())||k.includes('mach')?(P.mach||0)>.92:k.includes('fire')?(P.fire>0):k.includes('fuel')?P.totalFuel<(P.ac.fuel||3000)*.15:k.includes('hydw')?P.hp<45:false;c.fillStyle='#090909';c.beginPath();c.arc(x,y,r+4,0,7);c.fill();c.fillStyle=on?'#ff3a2a':'#4a1410';c.beginPath();c.arc(x,y,r,0,7);c.fill();}}
  // sub-panels with switches: [x,y,w,h,title,[switch labels]]
  for(const pl of L.plates||[]){const[x,y,w,h,ti,sw]=pl;c.fillStyle='rgba(0,0,0,.28)';c.fillRect(x,y,w,h);c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=2;c.strokeRect(x,y,w,h);
    T(ti,x+w/2,y+11,10,ink);(sw||[]).forEach((s,i)=>{const n2=sw.length,sx=x+w*(i+.5)/n2,sy=y+h*.58,on=CW_SW.get(P.type,s,ti);c.fillStyle='#555';c.beginPath();c.arc(sx,sy,7,0,7);c.fill();c.fillStyle=on?'#f2f2ea':'#999';c.fillRect(sx-2,on?sy-15:sy+1,4,14);T(s,sx,y+h-9,8,dimInk);});}
  // annunciator / caution grid: [x,y,cols,rows,cw,ch,[labels]]
  if(L.cau){const[x,y,cols,rows,cw,ch,items]=L.cau,lowF=P.totalFuel<(P.ac.fuel||3000)*.15;
    const lit=s=>(window._cwLT>performance.now())||/SHAKER/.test(s)?!!P._shk:/KICKER/.test(s)?!!P._kick:/APC OFF/.test(s)?(window.CW_SW&&CW_SW.get(P.type,'APC')===false):/MSTR CAUT/.test(s)?(P.hp<45||P.totalFuel<(P.ac.fuel||3000)*.15||!!P._kick):/FIRE|ПОЖАР/.test(s)?P.fire>0||P.hp<25:/HYD|ГИДР/.test(s)?P.hp<45:/FUEL|ТОПЛ|ОСТАТ|BINGO/.test(s)?lowF:/GEN|ГЕН/.test(s)?!run:/OIL|МАСЛ/.test(s)?!run:false;
    items.forEach((s,i)=>{const cx=x+(i%cols)*cw,cy=y+Math.floor(i/cols)*ch,on=lit(s),red=/FIRE|ПОЖАР/.test(s);c.fillStyle=on?(red?'#ff3a2a':'#ffb21a'):'#2a2416';c.fillRect(cx+2,cy+2,cw-4,ch-4);T(s,cx+cw/2,cy+ch/2,s.length>8?7:9,on?'#200':'#7a6a40');});}
  // landing-gear handle with three lights: [x,y]
  if(L.gearH){const[x,y]=L.gearH;let gd=false;try{gd=P.ac.cockpit==='fulcrum'?!!sys.mig.gear:!!sys.v.gear;}catch(e){}
    c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x-40,y-50,80,112);c.fillStyle='#999';c.fillRect(x-4,y+(gd?0:-40),8,48);c.fillStyle=ru?'#d23a2a':'#e8e8e8';c.beginPath();c.arc(x,y+(gd?44:4),11,0,7);c.fill();
    [[x-24,y+56],[x,y+56],[x+24,y+56]].forEach(([a,b])=>{c.fillStyle=gd?'#46ff6a':'#123a1a';c.beginPath();c.arc(a,b-10,6,0,7);c.fill();});T(lb.gear,x,y-40,9,ink);}
  // armament block (master arm + selected weapon): [x,y,w]
  if(L.arm){const[x,y,w]=L.arm,armed=game.armPos===0,wn=game.wsel||'GUN';let cnt='';try{cnt=wn==='GUN'?String(P.gun.ammo):String(P.count(wn));}catch(e){}
    c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x,y,w,58);T(lb.arm,x+8,y+14,10,ink,'left');c.fillStyle=armed?'#ff4a2a':'#3a1612';c.fillRect(x+w-62,y+4,56,20);T(armed?'ARM':lb.safe,x+w-34,y+14,10,armed?'#fff':'#a08070');
    c.fillStyle='#000';c.fillRect(x+6,y+30,w-12,22);T(((typeof SN!=='undefined'&&SN[wn])||wn)+'  '+cnt,x+12,y+41,12,'#7dffa0','left');}
  // painted placards
  for(const[tx,x,y,sz,cl]of L.txt||[])T(tx,x,y,sz||10,cl||dimInk);}


// ---------- every cockpit: close see-through surfaces, give flat gauge faces a rim and glass ----------
const _pol=new WeakSet(),_gls=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.09,shininess:140,specular:0x9a9a9a,depthWrite:false}),_bz=new THREE.MeshPhongMaterial({color:0x111315,shininess:45,specular:0x2a2a2a});
function polish(root){const add=[];root.traverse(m=>{if(!m.isMesh||_pol.has(m))return;_pol.add(m);const mats=Array.isArray(m.material)?m.material:[m.material];
    for(const mt of mats){if(mt&&!mt.transparent&&mt.side===THREE.FrontSide&&!m.userData.cwFx){mt.side=THREE.DoubleSide;mt.needsUpdate=true;}}
    const g=m.geometry,mt=mats[0];if(!g||!mt||!mt.map||m.userData.cwFx)return;
    if(g.type==='CircleGeometry'){const r=g.parameters.radius;if(r<.008||r>.2)return;add.push([m,'c',r]);}
    else if(g.type==='PlaneGeometry'&&mt.map.isCanvasTexture){const w=g.parameters.width,h=g.parameters.height;if(w<.04||w>.3||h>.3)return;add.push([m,'p',w,h]);}});
  for(const[m,k,a,b]of add){const gl=new THREE.Mesh(k==='c'?new THREE.CircleGeometry(a*1.01,40):new THREE.PlaneGeometry(a,b),_gls);gl.userData.cwFx=1;gl.position.z=.0035;gl.renderOrder=2;m.add(gl);
    if(k==='c'){const t=new THREE.Mesh(new THREE.TorusGeometry(a+.0025,.0032,8,40),_bz);t.userData.cwFx=1;t.position.z=.0015;m.add(t);}}}

// ---------- switching ----------
const boards={};let cur=null;const _sc=new THREE.Vector3();
// keep only the borrowed stick, throttle, pedals: walk down from the root and hide every branch that holds none of them
function keepObjs(o){const k=[o.stk,o.thr,o.eBoot];for(const pk of['pedV','pedE','pedR'])if(o[pk]&&o[pk].g)k.push(o[pk].g);return new Set(k.filter(Boolean));}
function sweep(o,B,hid){const keep=keepObjs(o),anc=new Set();for(const k of keep)for(let p=k.parent;p&&p!==o.root;p=p.parent)anc.add(p);
  const walk=n=>{for(const ch of n.children){if(ch===B.g||keep.has(ch))continue;if(anc.has(ch)){walk(ch);continue;}if(ch.visible){ch.visible=false;if(!hid.includes(ch))hid.push(ch);}}};walk(o.root);}
function deactivate(){if(!cur)return;cur.B.g.visible=false;for(const x of cur.hid)x.visible=true;const o=ck[cur.kind];if(cur.glass0)o.glass=cur.glass0;cur=null;}
function activate(id,kind){const o=ck[kind];if(!o)return;let B=boards[id];if(!B){try{B=boards[id]=build(id,kind);}catch(e){console.warn('[cwpit] build',id,e);return;}}
  const hid=[];sweep(o,B,hid);B.g.visible=true;o._ltN=0;o._lt=null;cur={id,kind,B,hid,glass0:o.glass};o.glass=B.glass;}
const _sel=selectCockpit;
selectCockpit=function(kind,pit){deactivate();const r=_sel(kind,pit);try{for(const k of['viper','fulcrum'])if(ck[k])polish(ck[k].root);}catch(e){console.warn('[cwpit] polish',e);}try{if(player&&PIT[player.type])activate(player.type,kind);}catch(e){console.warn('[cwpit]',e);}return r;};
// keep the borrowed board hidden (other modules may toggle their groups) and repaint the face ~20 Hz
for(const kind of['viper','fulcrum']){const o=ck[kind];if(!o||!o.anims)continue;
  o.anims.push(()=>{if(!cur||cur.kind!==kind||!player)return;if(!PIT[player.type]||cur.id!==player.type){deactivate();return;}
    sweep(o,cur.B,cur.hid);
    {const B=cur.B,cp=(src,dst)=>{if(!src)return;src.updateMatrixWorld(true);src.matrixWorld.decompose(dst.position,dst.quaternion,_sc);if(src.visible){src.visible=false;if(!cur.hid.includes(src))cur.hid.push(src);}};
      cp(o.stk,B.stkG);cp(o.thr,B.thrG);}
    if(!cur.B.g.visible)cur.B.g.visible=true;o.glass=cur.B.glass;
    const B=cur.B;if((B.t^=1))return;try{paint(B,player);B.tx.needsUpdate=true;}catch(e){}});}
window.CW_PIT=PIT;
})();
