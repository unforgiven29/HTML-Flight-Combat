/* =====================================================================================================================
   v332 — seasons, time and weather in the world war (spec v49 ch.04 world clock, ch.12 weather and climate).
   * The war clock is a real calendar (WWAR.date). Season by hemisphere and latitude: winter / spring / summer / autumn
     outside the tropics; wet / dry inside them (April-October wet north of the equator, the reverse south of it).
   * Weather is drawn once a day per air theatre from the season (CLEAR, CLOUD, RAIN, STORM, SNOW), so a theatre has a
     run of days, not a flicker. Flying weather scales air attrition (fewer sorties, fewer losses): CLEAR 1, CLOUD .85,
     RAIN .6, SNOW .5, STORM .3.
   * Ground mobility per front sector: the spring thaw (March-April) and autumn rains (October-November) between 45 and
     65 degrees turn roads to mud (x0.5); deep snow x0.7; a rainy or snowy day in the theatre x0.8. Mud and winter are
     events in the war diary.
   * World flight: the time of day is the local solar time at the airfield (war clock if a war is running, otherwise the
     real UTC clock), the weather is that theatre's weather, and winter whitens the ground in the north.
   Gameplay-level climate model, not a forecast.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WWAR)return;
const W=WWAR;
const WX={CLEAR:1,CLOUD:.85,RAIN:.6,SNOW:.5,STORM:.3};
const month=t=>new Date(Date.parse(W.st.start)+t*3600e3).getUTCMonth();
// season at a latitude in a month (0 = January)
function season(lat,m){const a=Math.abs(lat);if(a<23){const wet=lat>=0?(m>=3&&m<=9):(m<=3||m>=9);return wet?'WET':'DRY';}
  const n=lat>=0?m:(m+6)%12;return n===11||n<=1?'WINTER':n<=4?'SPRING':n<=7?'SUMMER':'AUTUMN';}
const midLat=T=>(T.lat[0]+T.lat[1])/2;
function draw(T,m,prev){const s=season(midLat(T),m),cold=Math.abs(midLat(T))>45;
  const P={WINTER:cold?{CLEAR:.25,CLOUD:.3,SNOW:.3,STORM:.15}:{CLEAR:.3,CLOUD:.35,RAIN:.25,STORM:.1},SPRING:{CLEAR:.35,CLOUD:.3,RAIN:.3,STORM:.05},SUMMER:{CLEAR:.55,CLOUD:.25,RAIN:.12,STORM:.08},
    AUTUMN:{CLEAR:.3,CLOUD:.3,RAIN:.3,STORM:.1},WET:{CLEAR:.2,CLOUD:.3,RAIN:.35,STORM:.15},DRY:{CLEAR:.6,CLOUD:.3,RAIN:.08,STORM:.02}}[s];
  if(prev&&P[prev]!=null&&Math.random()<.45)return prev;let r=Math.random();for(const k in P){r-=P[k];if(r<=0)return k;}return'CLEAR';}
function daily(){const st=W.st,m=month(st.t);st.sea=st.sea||{seen:{}};
  for(const th of st.th){const T=W.THEATRES.find(q=>q.id===th.id);th.wx=draw(T,m,th.wx);th.season=season(midLat(T),m);
    const k=th.id+':'+th.season+':'+Math.floor(st.t/24/60);
    if(!st.sea.seen[th.id+th.season+new Date(Date.parse(st.start)+st.t*3600e3).getUTCFullYear()]){st.sea.seen[th.id+th.season+new Date(Date.parse(st.start)+st.t*3600e3).getUTCFullYear()]=1;
      const txt={WINTER:Math.abs(midLat(T))>45?'winter: snow, short days, frozen ground':'winter',SPRING:Math.abs(midLat(T))>45?'spring: the thaw turns roads and fields to mud':'spring',SUMMER:'summer: long days, firm ground',AUTUMN:Math.abs(midLat(T))>45?'autumn: rains slow movement off the roads':'autumn',WET:'the wet season: rain and low cloud',DRY:'the dry season'}[th.season];
      W.emit('SEASON',{txt:T.name+': '+txt+'.'});}
    if(th.wx==='STORM')W.emit('WEATHER',{txt:T.name+': storms ground most flying today.'});}}
W.daily.unshift(()=>{if(W.st&&!W.st.over)daily();});
W.airWx=th=>WX[th.wx]||1;
W.mob=s=>{const st=W.st;if(!st)return 1;const m=month(st.t),a=Math.abs(s.lat);let f=1;const se=season(s.lat,m),n=s.lat>=0?m:(m+6)%12;
  if(a>=45&&a<=65&&(n===2||n===3||n===9||n===10))f*=.5;else if(se==='WINTER'&&a>50)f*=.7;
  const th=st.th.find(t=>{const T=W.THEATRES.find(q=>q.id===t.id);return s.lat>=T.lat[0]&&s.lat<=T.lat[1]&&s.lon>=T.lon[0]&&s.lon<=T.lon[1];});
  if(th&&(th.wx==='RAIN'||th.wx==='SNOW'||th.wx==='STORM'))f*=.8;return f;};
W.season=season;W.month=month;

/* ------------------------------------------------------------------ world flight: local time, theatre weather, winter ground */
if(window.WF&&window.WGEO){const _s=WF.start;WF.start=async function(ap){const r=await _s.apply(this,arguments);
  try{if(!WF.on)return r;const t=W.st?Date.parse(W.st.start)+W.st.t*3600e3:Date.now(),d=new Date(t),utc=d.getUTCHours()+d.getUTCMinutes()/60;
    ENV.tod=((utc+ap.lon/15)%24+24)%24;ENV.rate=0;
    let wx=null;if(W.st)for(const th of W.st.th){const T=W.THEATRES.find(q=>q.id===th.id);if(ap.lat>=T.lat[0]&&ap.lat<=T.lat[1]&&ap.lon>=T.lon[0]&&ap.lon<=T.lon[1]){wx=th.wx;break;}}
    const map={CLEAR:'CLEAR',CLOUD:'SCATTERED',RAIN:'OVERCAST',SNOW:'OVERCAST',STORM:'STORM'};if(wx&&map[wx])ENV.wx=map[wx];
    const se=season(ap.lat,d.getUTCMonth());if(se==='WINTER'&&Math.abs(ap.lat)>40){TERRU.uWin.value=Math.max(TERRU.uWin.value,Math.min(.9,(Math.abs(ap.lat)-40)/20));TERRU.uSnowA.value=Math.min(TERRU.uSnowA.value,Math.max(0,1600-(Math.abs(ap.lat)-40)*80));ENV.snow=true;}
    ENV.setup();ENV.step(0,true);
    flash('LOCAL TIME '+String(Math.floor(ENV.tod)).padStart(2,'0')+':'+String(Math.floor(ENV.tod%1*60)).padStart(2,'0')+' · '+se.toLowerCase()+(wx?' · '+wx.toLowerCase():''),3500);}catch(e){console.warn('[seasons]',e);}
  return r;};}
})();
