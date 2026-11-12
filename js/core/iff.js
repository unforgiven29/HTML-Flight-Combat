/* ============ IFF: Mk XII-style transponders + interrogator + rules of engagement ============
   Modes: 1 (2-digit, mission), 2 (4-digit, unit), 3/A (4-digit, squawk), C (altitude), 4 (crypto, key A/B/Z, HOLD zeroises).
   Interrogator: beam is slaved to the radar bug / lock / nose, +/-14 deg cone, 110 km, line-of-sight, 3 cycles (~1.5 s) per answer.
   Result per contact:  FRIEND (Mode 4 valid)  |  POSS FRIEND (M1/M2/M3 valid)  |  NO REPLY (interrogated, silent)  |  UNKNOWN (never interrogated).
   ROE: FREE (anything not identified friend), TIGHT (NO REPLY only), HOLD (no weapons release). Unknown friendlies are not safe. */
const IFF=(function(){
  const DAY={m1:'31',m2:'5124',m3:'4321',key:'A'};            // the day's code table, shared by every friendly flight
  const st={pwr:'NORM',m1:true,m2:true,m3a:true,mc:true,m4:true,
    c1:DAY.m1,c2:DAY.m2,c3:'1200',key:'A',crypt:'NORM',ident:0,mon:true,auto:true,roe:'TIGHT',reply:0,test:0,t:0};
  const tab=new Map();                  // jet -> {s:'UNK'|'FRIEND'|'POSS'|'NOREPLY', t:time, prog:0..1, since:time}
  let lastMsg=0,sweepT=0;
  // AN/APX-80 Combat Tree (F-4D/E): triggers the Soviet SRO-2 'Odd Rods' transponder. Only these types carry a set it can trigger.
  const CT_SET=new Set(['MiG-15','MiG-19','MiG-21']);st.ct=true;
  const hasCT=()=>player&&player.type==='F-4E';
  const now=()=>performance.now()/1000;
  const E=j=>{let e=tab.get(j);if(!e){e={s:'UNK',t:0,prog:0,since:0};tab.set(j,e);}return e;};
  const on=()=>st.pwr!=='OFF'&&st.pwr!=='STBY';

  /* ----- transponder of any jet: what it will answer ----- */
  function xp(j){
    if(j===player)return {on:st.pwr==='NORM'||st.pwr==='EMER'||st.pwr==='LOW',emer:st.pwr==='EMER',low:st.pwr==='LOW',
      m1:st.m1&&st.c1,m2:st.m2&&st.c2,m3:st.m3a&&st.c3,mc:st.mc,m4:st.m4&&st.crypt!=='ZERO'&&st.crypt!=='HOLD'&&st.key,ident:st.ident>0};
    if(!j._xp){// AI jet: friendlies carry the correct set unless a fault is dealt at start-up
      const f=!!j.ai&&j.ai.friend||j.side===player.side;
      const x={on:true,m1:DAY.m1,m2:DAY.m2,m3:'2'+(1000+Math.floor(Math.random()*900)),m4:DAY.key,mc:true,ident:false,fault:''};
      if(f){const r=Math.random();
        if(r<.10){x.m4=false;x.fault='M4 ZEROISED';}
        else if(r<.17){x.m3='7700';x.m1='00';x.fault='WRONG CODES';}
        else if(r<.21){x.on=false;x.fault='XPDR FAIL';}
        else x.m3=DAY.m3;}
      else{x.on=Math.random()<.04;x.m4=false;x.m1=Math.random()<.5?DAY.m1:'12';x.m2='0000';x.m3=Math.random()<.04?DAY.m3:'7000';}// hostile: silent, rare spoof
      j._xp=x;}
    return j._xp;
  }
  const keyOK=k=>k===DAY.key||k==='Z'&&false;
  /* does transponder x answer an interrogation with modes m? returns 'FRIEND' | 'POSS' | null */
  function answer(x,modes){
    if(!x||!x.on)return null;
    if(modes.m4&&x.m4&&keyOK(x.m4))return 'FRIEND';
    if(modes.m1&&x.m1===DAY.m1||modes.m2&&x.m2===DAY.m2||modes.m3&&x.m3===DAY.m3)return 'POSS';
    return null;
  }
  const myModes=()=>({m1:st.m1,m2:st.m2,m3:st.m3a,m4:st.m4&&st.crypt!=='ZERO'});

  /* ----- queries used by the rest of the game ----- */
  const status=j=>{const e=tab.get(j);return e?e.s:'UNK';};
  const known=j=>{const s=status(j);return s==='FRIEND'||s==='POSS';};
  // radar filter: only positively identified friends are suppressed from the scope; everyone else is a contact
  const hide=j=>(!net.on||!!net.coop)&&j.side===player.side&&known(j);
  // a gun round / non-guided hit may strike a friendly the shooter did not identify
  function hitSkip(sh,j){if(!isFr(j,sh))return false;if(sh!==player)return !IFF.badFor(sh,j);return false;}   // v331: the player's rounds hit what they hit; IFF only advises
  // missiles: a seeker skips friends unless the shooter has no positive ID, or it's the intended target
  function mslSkip(m,j){if(!isFr(j,m.sh))return false;if(j===m.track)return false;return m.sh!==player||known(j);}
  // AI/SAM treat a friend as hostile when it has been squawking wrong for long enough under ROE FREE
  function badFor(o,j){const x=xp(j);return !x.on||(!answer(x,{m1:1,m2:1,m3:1,m4:1}));}
  function roeCheck(tg){// -> null if permitted, else the reason string
    if(st.roe==='HOLD')return 'ROE HOLD';
    if(!tg)return null;
    const s=status(tg);
    if(s==='FRIEND'||s==='POSS')return 'FRIENDLY · '+(s==='FRIEND'?'M4':'M1/2/3');
    if(st.roe==='TIGHT'&&s==='UNK')return 'ROE TIGHT · ID REQD';
    return null;
  }
  function label(j){const s=status(j);return s==='FRIEND'?'FRIEND':s==='POSS'?'POSS FRD':s==='NOREPLY'?'NO REPLY':s==='CT'?'CT·'+(j.type||'').toUpperCase():'UNKNOWN';}
  function sam(P,R){// friendly SAM battery R treats the player as a target if he stays NO REPLY while ROE is FREE
    if(!P||P.side!==R.side||st.roe!=='FREE')return false;const x=xp(P);return !answer(x,{m1:1,m2:1,m3:1,m4:1})&&performance.now()/1000-(st.badSince||1e9)>20;}

  /* ----- interrogator ----- */
  const CONE=14*Math.PI/180,RNG=110000;
  const _a=new THREE.Vector3(),_b=new THREE.Vector3();
  function beamDir(){
    try{if(radar&&radar.sensor==='RDR'&&radar.on()){const t=radar.mode==='STT'?radar.lock:radar.mode==='TWS'?radar.bug:null;if(t&&t.alive)return _a.copy(t.pos).sub(player.pos).normalize();}}catch(e){}
    return player.fwd(_a);}
  function inBeam(j,dir){_b.copy(j.pos).sub(player.pos);const d=_b.length();if(d>RNG||d<50)return false;
    if(Math.acos(Math.max(-1,Math.min(1,_b.normalize().dot(dir))))>CONE)return false;
    return typeof terrLOS!=='function'||terrLOS(player.pos,j.pos);}
  function interrogate(manual){
    if(!on()){flash('IFF · XPDR '+st.pwr,900);return;}
    if(!st.m1&&!st.m2&&!st.m3a&&!st.m4){flash('IFF · NO MODES',900);return;}
    st.test=manual?1:0;st.sweepOn=now()+(manual?2:0);st.manual=manual?now()+2.5:0;
    if(manual)flash('IFF · INTERROGATE',800);
  }
  // read the cockpit switches (sys.v) into the engine; only keys the player has touched override the defaults
  function sync(){const V=(typeof sys!=='undefined'&&sys.v)||{},T=player.type||'';
    const def=(k,d)=>V[k]===undefined?d:V[k];
    let pwr='NORM';
    if(V.eiff!==undefined)pwr=PW[V.eiff]||'NORM';
    if(V.iffm===0)pwr='EMER';
    if(T==='MiG-21'||/^MiG-21/.test(T)){const k=def('f21iff',2);pwr=['OFF','STBY','NORM','EMER'][k]||'NORM';if(def('f21io',0)===1&&pwr!=='OFF')pwr='STBY';if(def('f21ie',1)===0&&pwr!=='OFF')pwr='EMER';}
    st.pwr=pwr;
    st.m1=def('em1',0)===0;st.m2=def('em2',0)===0;st.m3a=def('em3',0)===0;st.mc=def('emc',0)===0;
    if(V.crypt!==undefined){st.crypt=['HOLD','NORM','ZERO'][V.crypt];}
    st.m4=!/^(MiG|Su)/.test(T)&&st.crypt==='NORM'&&def('m4',1)!==2;   // Soviet SRO-2 has no Western Mode 4
  }
  const page=()=>[['M1',st.c1],['M2',st.c2],['M3/A',st.c3],['M4',st.m4?st.key+'  ON':st.crypt==='ZERO'?'ZEROISED':st.crypt==='HOLD'?'HOLD':'OFF'],['MC',st.mc?'ON':'OFF'],['MODE',st.pwr+(st.ident>0?' IDENT':'')]];
  function update(dt){
    try{sync();}catch(e){}
    if(typeof player==='undefined'||!player||!player.alive||!game.running)return;
    const t=now();st.t=t;if(st.ident>0)st.ident-=dt;try{hud();}catch(e){}
    // player's own state as seen by friendly AI
    const px=xp(player),pOK=answer(px,{m1:1,m2:1,m3:1,m4:1});
    if(pOK)st.badSince=0;else if(!st.badSince)st.badSince=t;
    // interrogate: AUTO cycles on the bug/lock/nose cone, MANUAL forces a full-cone sweep for 2.5 s
    const dir=beamDir(),modes=myModes(),manual=st.manual&&t<st.manual;
    for(const j of jets){if(j===player||!j.alive)continue;const e=E(j);
      if(j.remote){e.s=j.side===player.side?'FRIEND':'NOREPLY';continue;}
      const lit=(on()&&(st.auto||manual)&&inBeam(j,dir))||(manual&&on()&&_b.copy(j.pos).sub(player.pos).length()<RNG&&terrLOS(player.pos,j.pos)&&Math.acos(Math.max(-1,Math.min(1,_b.normalize().dot(player.fwd(_a)))))<CONE*2.5);
      if(lit){e.prog+=dt/1.5;if(e.prog>=1){e.prog=0;const a=(j.side===player.side||Math.random()<.04)?answer(xp(j),modes):answer(xp(j),modes);
          let ns=a==='FRIEND'?'FRIEND':a==='POSS'?'POSS':'NOREPLY';
          if(ns==='NOREPLY'&&hasCT()&&st.ct&&j.side!==player.side&&CT_SET.has(j.type)){
            if(j._ctOn===undefined)j._ctOn=Math.random()<.85;      // set may be switched off / unserviceable
            if(j._ctOn){ns='CT';if(e.s!=='CT'&&SET.calls==='ON')radio('Combat Tree, '+j.type+' transponder, bearing '+Math.round(((Math.atan2(j.pos.x-player.pos.x,-(j.pos.z-player.pos.z))*57.3)+360)%360)+'.');}}
          if(e.s!==ns){if(ns==='NOREPLY'&&e.s==='UNK')e.since=t;if(ns==='FRIEND'&&e.s!=='FRIEND'&&j.callsign&&SET.calls==='ON'&&j.ai&&j.ai.friend&&t-lastMsg>6){lastMsg=t;}}
          e.s=ns;e.t=t;}}
      else if(e.prog>0)e.prog=Math.max(0,e.prog-dt*.5);
      if(e.s!=='UNK'&&t-e.t>25&&e.s!=='NOREPLY'&&e.s!=='CT')e.s='UNK';
      if(e.s==='CT'&&t-e.t>8)e.s='UNK';       // a stale ID decays: the beam has to come back
      if(e.s==='NOREPLY'&&t-e.t>40)e.s='UNK';
      // Mode 4 REPLY lamp
      if(lit&&e.s==='FRIEND')st.reply=t+.4;
    }
    // friendly AI looks at the player and at each other
    if(typeof WING!=='undefined')for(const w of WING.list){if(!w.alive||!w.ai)continue;
      const wx=xp(w);
      // a wingman whose Mode 4 is zeroised fails to show friend to the others; lead notices after a while
      if(wx.fault&&!w._faultSaid&&t>25){w._faultSaid=1;if(SET.calls==='ON')radio(w.callsign+', IFF fault, '+wx.fault.toLowerCase()+'.');}
      // fratricide: a friend squawking nothing valid stays UNKNOWN to the flight; under ROE FREE it is engaged
      if(st.roe==='FREE'&&!w._ffire){
        const bad=[];if(!pOK&&st.badSince&&t-st.badSince>20)bad.push(player);
        for(const o of WING.list)if(o!==w&&o.alive&&!answer(xp(o),{m1:1,m2:1,m3:1,m4:1})&&t>50)bad.push(o);
        for(const f of bad){if(f.pos.distanceTo(w.pos)>40000)continue;
          if(!w._warn||t-w._warn>40){w._warn=t;if(SET.calls==='ON')radio(w.callsign+', unknown contact, no IFF, bearing '+Math.round(((Math.atan2(f.pos.x-w.pos.x,-(f.pos.z-w.pos.z))*57.3)+360)%360)+'.');}
          else if(t-w._warn>12&&w.ai){w._warn=t+1e3;w.ai.t=f;w.ai.tT=4;w._ffire=t;if(SET.calls==='ON')radio(w.callsign+', no reply, engaging.',true);}}}
      if(w._ffire&&t-w._ffire>20)w._ffire=0;}
  }
  /* ----- player controls ----- */
  const PW=['OFF','STBY','LOW','NORM','EMER'];
  const ctl={
    pwr(v){st.pwr=typeof v==='number'?PW[v]:v;},
    ident(){if(st.pwr==='OFF'||st.pwr==='STBY'){flash('IFF · XPDR '+st.pwr,900);return;}st.ident=15;flash('IFF · IDENT',1200);},
    cycleRoe(){st.roe=st.roe==='TIGHT'?'FREE':st.roe==='FREE'?'HOLD':'TIGHT';flash('ROE · '+st.roe,1400);radio('Weapons '+st.roe.toLowerCase()+'.');},
    key(k){st.key=k;},
    crypt(v){st.crypt=v;if(v==='ZERO'){st.m4=false;flash('IFF · M4 ZEROISED',1500);}else if(v==='NORM'||v==='HOLD')st.m4=v==='NORM';},
    code3(v){st.c3=String(v).replace(/[^0-7]/g,'').padStart(4,'0').slice(-4);},
  };
  // single-line status for HUD/overlay
  function hudLine(){
    if(!on())return 'IFF '+st.pwr;
    const m=[st.m1?'1':'',st.m2?'2':'',st.m3a?'3A':'',st.mc?'C':'',st.m4&&st.crypt==='NORM'?'4':''].filter(Boolean).join('/');
    return 'IFF '+m+(st.ident>0?' IDENT':'')+(hasCT()?' · CT '+(st.ct?'ON':'OFF'):'')+' · M3 '+st.c3+' · ROE '+st.roe;}
  let bar=null,barTxt='';
  function hud(){
    if(!bar){bar=document.createElement('div');bar.id='iffbar';bar.style.cssText='position:fixed;left:10px;bottom:10px;z-index:20;font:11px/1.35 ui-monospace,Menlo,monospace;color:#9fe3a8;background:rgba(0,0,0,.45);padding:3px 7px;border-radius:3px;pointer-events:none;white-space:pre';document.body.appendChild(bar);}
    let tg=null;try{tg=radar.mode==='STT'?radar.lock:radar.mode==='TWS'?radar.bug:null;}catch(e){}
    let t=hudLine()+(st.reply>now()?'  M4 REPLY':'');
    if(tg&&tg.alive)t+='\nTGT '+label(tg)+(E(tg).prog>0?' …':'');
    if(t!==barTxt){barTxt=t;bar.textContent=t;}
    bar.style.display=game.running?'block':'none';}
  function install(){
    if(typeof CTL==='undefined')return;
    CTL.map['+Digit8']={fn:()=>interrogate(true)};
    CTL.map['+Digit9']={fn:()=>ctl.ident()};
    CTL.map['+Digit7']={fn:()=>{if(!hasCT()){flash('NO COMBAT TREE',900);return;}st.ct=!st.ct;flash('COMBAT TREE '+(st.ct?'ON':'OFF'),1000);}};
    CTL.map['+Digit0']={fn:()=>ctl.cycleRoe()};
  }
  return {page,sync,st,tab,xp,answer,status,known,hide,hitSkip,mslSkip,badFor,roeCheck,label,sam,interrogate,update,ctl,hudLine,install,DAY,on,E};
})();
