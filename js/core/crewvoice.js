"use strict";
/* =====================================================================================================================
   v290 — the back-seater has a personality.

   Who he is depends on the jet: nation (US / Russia / China / Britain / France / Sweden) and one of four temperaments, picked from the
   airframe so each jet's crew always sounds like the same person: DRY (deadpan), COCKY, NERVOUS, VETERAN. Name and callsign too.
   What changes
   * The stock calls (kills, bingo, missile, spike, wave-off, good tone, ...) keep their facts but are said in his voice, and the missile
     and spike calls now carry context: what is shooting, how far, how long you have (from the real missile / radar state).
   * He talks about the flight: fuel states (joker at half), hard G, too low, being outnumbered, taking hits, kill streaks, and, when
     nothing is happening, the odd bit of banter. Rare, on cooldowns, never during a missile or spike call.
   * EWO / WSO electronic-warfare calls (ewo.js) get the same treatment.
   Lines are light-hearted and about the job, not about people. CREWV.off = true turns all of it back to the stock lines.
   ===================================================================================================================== */
(function(){
if(typeof rio==='undefined'||typeof player==='undefined'){console.warn('[crewvoice] core missing');return;}
const CV=window.CREWV={off:false,nat:'US',pers:'d',name:'',cs:'',last:{},t0:0,key:null,streak:0,kills:0,stage:{}};
const nowS=()=>performance.now()/1000,rnd=a=>a[Math.floor(Math.random()*a.length)];
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const natOf=t=>/^(J-|JH-|JF-|FC-)/.test(t)?'CN':/^(Su-|MiG-|Yak-|Tu-)/.test(t)?'RU':/Rafale|Mirage|Etendard/.test(t)?'FR':/^(JAS|AJS|J 35)/.test(t)?'SE':/Tornado|Lightning|Jaguar|EF-2000|Typhoon|Harrier/.test(t)?'GB':'US';
const PERS=['d','c','n','v'];
const NAMES={US:[['Ice','Mitchell'],['Goose','Bradshaw'],['Slider','Kerner'],['Hollywood','Wilson'],['Merlin','Guiness'],['Sundown','Mills'],['Jester','Jones'],['Viper','Nash']],
  RU:[['Medved','Sokolov'],['Volk','Orlov'],['Yastreb','Petrov'],['Sokol','Vasiliev'],['Lis','Kuznetsov'],['Zhuk','Morozov']],
  CN:[['Qingniao','Li'],['Hongying','Zhang'],['Yinhe','Wang'],['Fengbao','Chen'],['Longwei','Liu']],
  GB:[['Biggles','Hargreaves'],['Nobby','Clarke'],['Spanner','Hughes'],['Tinker','Ashworth'],['Chalky','White']],
  FR:[['Pierrot','Marchand'],['Fanfan','Lefevre'],['Gaston','Duval'],['Tintin','Moreau']],
  SE:[['Lasse','Svensson'],['Fika','Berg'],['Bjorn','Lindqvist']]};
const LAB={US:'RIO',RU:'WSO',CN:'WSO',GB:'NAV',FR:'WSO',SE:'OBS'};

/* ---- the lines. [text, temperament] — no temperament = anybody. {n} {c} {ctx} {k} {pct} fill in at the call ---- */
const V={
US:{
 intro:[["{cs} in the back. Radar's warm, comms are good, coffee is not.",'d'],["{cs} here. Let's go make some noise.",'c'],["{cs}, checking in. Please nobody die today. Me especially.",'n'],["{cs} up. Nice and easy, we've done this before.",'v']],
 kill:[["Splash one! Put it on the board.",'c'],["Good kill. Calling that one self-defence.",'d'],["He's down, he's down! Tell me that's real.",'n'],["Splash. Next.",'v']],
 streak:[["That's {k}. You know what the next one makes? A very awkward debrief.",'d'],["{k} kills. I'm having a jersey made.",'c'],["{k}?! My hands are shaking and I'm not even flying.",'n'],["{k}. Don't get sloppy now.",'v']],
 bingo:[["Bingo fuel. The tanker's not coming to us, we go home.",'d'],["Bingo. Remember, the ground is the one thing we can't out-turn.",'c'],["Bingo fuel, bingo fuel, can we please go home?",'n'],["Bingo. Time to leave the party.",'v']],
 joker:[["Joker fuel, {pct}% left. Plan the way home.",'v'],["Half a tank. Optimistic is still free.",'d'],["Joker. Fuel's getting thin, skipper.",'n'],["Joker. I can do this all day, the jet can't.",'c']],
 hit:[["We're hit! Everything's fine, that's what the master caution is for.",'d'],["Took one! Still flying, still handsome.",'c'],["We're hit! We're hit!",'n'],["Hit. Systems check, then back to work.",'v']],
 hurt:[["We're hurt. Those lights are not Christmas decorations.",'d'],["Damage is piling up, let's finish this quick.",'v'],["That's a lot of red lights! A LOT of red lights!",'n'],["Hurt, but I've had worse Mondays.",'c']],
 dying:[["Skipper, I'd like to discuss the ejection handle.",'d'],["Eject, eject, eject if she quits on you!",'n'],["She's not gonna hold. Your call, I'm ready.",'v'],["If this is the end, I want it noted I called it first.",'c']],
 lowalt:[["Altitude! I like the ground from a distance.",'d'],["Low! That's a hell of a way to save fuel.",'c'],["Pull up pull up pull up!",'n'],["Watch your altitude, you're below the tree line.",'v']],
 hiG:[["Easy on the stick, I'd like to see the end of this fight with my eyes open.",'d'],["Nine G! Beautiful. Please stop.",'c'],["I'm greying out, I'm greying out!",'n'],["Pulling hard. Breathe, strain, hold it.",'v']],
 outn:[["That's a lot of bandits. Is it too late to ask for a transfer?",'d'],["Outnumbered? Good. Fewer to share the glory with.",'c'],["There's so many of them!",'n'],["Numbers against us. Stay fast, stay smart.",'v']],
 idle:[["Quiet out there. I don't trust quiet.",'d'],["I bet I could land this thing. Don't ask me to prove it.",'c'],["Everything okay up there? Everything's okay, right?",'n'],["Quiet is good. Quiet gets you home.",'v'],["You know my wife thinks I have a desk job.",'d'],["Radar's clean. Time to think about lunch.",'c']],
 miss:["Missile! {c} o'clock, break {side}, {cm}!{ctx}"],spike:["Spike! {c} o'clock.{ctx}"],
 waveoff:[["Wave off, wave off! Not this time.",'d'],["Wave off! Do NOT put it on the deck.",'n']],tone:[["Good tone. Take the shot.",'v'],["Tone's good, send it.",'c']],
 radarup:["Radar's up. Looking.","I have the radar."],nolock:["No lock. He's slippery.","Can't get a lock on him."],lead:["Heads up:","Skipper,","FYI,"]},
RU:{
 intro:[["{cs} in the back seat. Radar is on. Everything works, which is suspicious.",'d'],["{cs}. Let us fly. The NATO jets have nicer cupholders, we have better pilots.",'c'],["{cs} here. I have checked the straps three times.",'n'],["{cs}. Calm and quiet. Fly the airplane.",'v']],
 kill:[["Target destroyed. Very good.",'v'],["One fewer. I will not tell his mother.",'d'],["He is down! Davai, davai!",'c'],["Destroyed? Really destroyed? Good, good.",'n']],
 streak:[["{k} targets. Command will say it was the jet.",'d'],["{k} kills! Today I drink for you.",'c'],["{k}. We keep calm.",'v'],["{k}... please do not tempt luck.",'n']],
 bingo:[["Bingo fuel. The airfield is far and the fuel is not a good friend.",'d'],["Bingo. We go home or we walk, and it is a long walk.",'c'],["Bingo, bingo! Please, home!",'n'],["Bingo fuel. Time to turn back.",'v']],
 joker:[["Half the fuel. Half the plan.",'d'],["Joker, {pct} percent. Think about the way home.",'v'],["Fuel is half. I am counting it twice.",'n'],["Half tank. Still plenty for one more.",'c']],
 hit:[["We are hit. It is nothing, it is only burning a little.",'d'],["Hit! The jet is Russian, it will survive.",'c'],["We are hit! We are hit!",'n'],["Hit. Checking systems.",'v']],
 hurt:[["Damage is serious. The jet complains, like my mother-in-law.",'d'],["We are badly hurt. Finish and go home.",'v'],["Many lights on, many many lights!",'n'],["Hurt, but still flying. The seat is Zvezda, I am not worried.",'c']],
 dying:[["Commander, the Zvezda seat is the best in the world. I suggest we test it.",'d'],["Eject! Eject if she dies!",'n'],["It will not hold. Your decision.",'v'],["Do not die in the jet, it is bad for the paperwork.",'c']],
 lowalt:[["Altitude! The ground is hard and not Russian.",'d'],["Low! We are not a tank!",'c'],["Pull up! Pull up!",'n'],["Watch the altitude.",'v']],
 hiG:[["Easy! I am not made of iron like the airplane.",'d'],["Heavy G. Good. Do not black out.",'v'],["The blood leaves my head!",'n'],["Pull! Hold! Ha!",'c']],
 outn:[["Many of them. At least it is a fair fight for them.",'d'],["Many targets. Many chances.",'c'],["So many! Command, there are so many!",'n'],["Numbers are against us. Stay low and stay fast.",'v']],
 idle:[["Quiet. In my experience the quiet is the plan of the enemy.",'d'],["I have tea in the thermos. Do not turn upside down.",'c'],["Everything works? Everything works. Strange.",'n'],["Radar clean. Watch the horizon.",'v'],["In the academy they said the jet is simple. They did not say for whom.",'d']],
 miss:["Missile! {c} o'clock! Break {side}, {cm}!{ctx}"],spike:["Radar on us! {c} o'clock.{ctx}"],
 waveoff:[["Go around! Do not land, do not land!",'n'],["Wave off. The runway can wait.",'d']],tone:[["Good capture. Launch.",'v'],["Capture! Launch it!",'c']],
 radarup:["Radar is on. I am looking.","I have the radar."],nolock:["No capture. He is hiding.","Cannot capture him."],lead:["Attention:","Pilot,","Note:"]},
CN:{
 intro:[["{cs} here. Radar is up and all systems report normal. Proceeding as planned.",'v'],["{cs}. We will complete the mission and then drink tea.",'d'],["{cs} ready. The jet is new, the training was long. We can do this.",'n'],["{cs}. Let's show them what we have.",'c']],
 kill:[["Target destroyed. As planned.",'v'],["One down. The training was worth it.",'d'],["Target down! Excellent!",'c'],["Is it down? It is down. Good.",'n']],
 streak:[["{k} targets. This will look excellent on the report.",'d'],["{k} kills. We are ahead of schedule.",'v'],["{k}! The squadron will be proud.",'c'],["{k}... please keep concentrating.",'n']],
 bingo:[["Bingo fuel. Return to base, as the plan requires.",'v'],["Bingo. The tea will be cold, but the fuel is colder.",'d'],["Bingo fuel! Please return!",'n'],["Bingo. Let's finish and go home.",'c']],
 joker:[["Joker fuel. {pct} percent. Prepare the return.",'v'],["Half tank. Time to be efficient.",'d'],["Fuel is half. I am watching it closely.",'n'],["Joker. Still enough for one more pass.",'c']],
 hit:[["We are hit. Damage control, please.",'v'],["Hit. This is not in the training manual.",'d'],["We're hit!",'n'],["Hit! Still fighting!",'c']],
 hurt:[["Damage is heavy. Consider returning.",'v'],["Several systems degraded. The simulator was kinder.",'d'],["Many warnings! Many warnings!",'n'],["Hurt, but not finished.",'c']],
 dying:[["Please consider ejection. I would rather report you alive.",'d'],["Eject if she fails. That is an order from the back seat.",'v'],["The aircraft cannot hold! Eject!",'n'],["If we go, we go with style.",'c']],
 lowalt:[["Altitude low. Pull up, please.",'v'],["Low altitude. The ground has no sense of humour.",'d'],["Too low! Too low!",'n'],["Low! Very bold, comrade.",'c']],
 hiG:[["High G. Please be gentle with the airframe, and with me.",'d'],["Maintain the strain. Breathe.",'v'],["I cannot see! I cannot see!",'n'],["Pull harder! Show them!",'c']],
 outn:[["Many contacts. We will use the training.",'v'],["They brought many friends. We have only me.",'d'],["So many! It is too many!",'n'],["Many targets. Many chances.",'c']],
 idle:[["Quiet. Good time to check the fuel and the plan.",'v'],["I have a thermos of tea. It is the real weapon system.",'d'],["Everything normal? It is too normal.",'n'],["Nothing on the screen. A pity.",'c']],
 miss:["Missile warning! {c} o'clock! Break {side}, {cm}!{ctx}"],spike:["Radar lock warning, {c} o'clock.{ctx}"],
 waveoff:[["Abort landing. Go around.",'v'],["Wave off! Not safe!",'n']],tone:[["Lock is stable. Fire.",'v'],["Good lock. Launch!",'c']],
 radarup:["Radar active. Searching.","Radar is mine."],nolock:["No lock. Target is evading.","Cannot lock."],lead:["Reminder:","Pilot,","Report:"]},
GB:{
 intro:[["{cs} in the back. Radar's warm, kettle's on, shall we begin?",'d'],["{cs}. Let's give the opposition something to write home about.",'c'],["{cs}. Oh, I do hope this goes well.",'n'],["{cs}. Steady as she goes.",'v']],
 kill:[["Splash. Rather good, that.",'d'],["He's down! Jolly good shooting!",'c'],["Is he down? He's down. Oh, thank goodness.",'n'],["Splash one. Carry on.",'v']],
 streak:[["That's {k}. I shall be mentioning it in the mess.",'d'],["{k} kills! Drinks are on someone else.",'c'],["{k}. Don't get cocky now.",'v'],["{k}... best not to say it out loud.",'n']],
 bingo:[["Bingo fuel. Time to go home before the engines start to sulk.",'d'],["Bingo. I shan't be pushing a Tornado home.",'c'],["Bingo fuel, please let's go home!",'n'],["Bingo fuel. Time to recover.",'v']],
 joker:[["Joker, {pct} per cent. A touch under half.",'v'],["Half a tank. Glass half full, I suppose.",'d'],["Joker fuel. I'm watching it like a hawk.",'n'],["Half fuel. Plenty for one more.",'c']],
 hit:[["We've been hit. Still, mustn't grumble.",'d'],["Hit! Rather rude of him.",'c'],["We're hit! We're hit!",'n'],["Hit. Checking the systems.",'v']],
 hurt:[["Damage is mounting. Frankly, I'd like to go home.",'d'],["Lots of caution lights. Almost festive.",'c'],["Everything's gone red!",'n'],["Hurt, but she'll get us home.",'v']],
 dying:[["I'd suggest we consider the Martin-Baker. It has an excellent reputation.",'d'],["Eject! Eject if she goes!",'n'],["She won't hold. Your call, skipper.",'v'],["Well, it's been a lovely flight.",'c']],
 lowalt:[["Altitude! The ground is awfully hard in this country.",'d'],["Low! Marvellous, if you're a hedgehog.",'c'],["Pull up, pull up!",'n'],["Mind your height.",'v']],
 hiG:[["Gently, old thing, I've only just had breakfast.",'d'],["Nine G, nice. Now let go.",'c'],["I can't see, I can't see!",'n'],["Pulling hard. Strain and breathe.",'v']],
 outn:[["Rather a lot of them. Typical, they never queue.",'d'],["Outnumbered? Good odds, I say.",'c'],["There are far too many!",'n'],["Numbers against us. Keep your head.",'v']],
 idle:[["Quiet. Almost peaceful. Suspiciously so.",'d'],["I'm told this jet was designed by a committee. It shows.",'d'],["Fancy a cup of tea after this?",'c'],["Everything is quite alright, isn't it?",'n'],["Quiet sky. Never trust it.",'v']],
 miss:["Missile! {c} o'clock! Break {side}, {cm}!{ctx}"],spike:["We're being painted, {c} o'clock.{ctx}"],
 waveoff:[["Wave off! Do go around.",'d'],["Wave off! Not today.",'n']],tone:[["Good tone, take the shot.",'v'],["Tone's good, off you go.",'c']],
 radarup:["Radar's up. Having a look.","I have the radar."],nolock:["Can't get a lock on him. Slippery chap.","No lock."],lead:["Just so you know:","Skipper,","I say,"]},
FR:{
 intro:[["{cs} ici. Radar is up. Please, no heroics before lunch.",'d'],["{cs}. Let's fly with panache, non?",'c'],["{cs}. I will check the straps again, merci.",'n'],["{cs}. Calme. We do it properly.",'v']],
 kill:[["Splash. C'est propre.",'d'],["He is down! Magnifique!",'c'],["He is down? Oui. Oh, merci.",'n'],["Splash. On continue.",'v']],
 streak:[["{k} kills. I will tell this story at dinner.",'d'],["{k}! Champagne!",'c'],["{k}. Do not lose concentration.",'v'],["{k}... do not say it too loud.",'n']],
 bingo:[["Bingo fuel. The tanker is on strike, I assume.",'d'],["Bingo. We go home, there is wine waiting.",'c'],["Bingo fuel! Please let us go home!",'n'],["Bingo fuel. Time to recover.",'v']],
 joker:[["Joker fuel, {pct} percent. We plan the return.",'v'],["Half a tank. Half full or half empty, who knows.",'d'],["Joker fuel. I do not like it.",'n'],["Half fuel. Enough for one more, non?",'c']],
 hit:[["We are hit. Merde. Minor merde, let's hope.",'d'],["Hit! He will pay for that.",'c'],["We are hit! We are hit!",'n'],["Hit. Checking the systems.",'v']],
 hurt:[["The damage is large. Too large for lunch.",'d'],["Many lights, we are a Christmas tree.",'c'],["Everything is red! Everything!",'n'],["Hurt, but she is a good airplane.",'v']],
 dying:[["I suggest we use the Martin-Baker. It is very French, despite the name.",'d'],["Eject, eject!",'n'],["She will not hold. Your decision.",'v'],["If we go, we go with style.",'c']],
 lowalt:[["Altitude! The ground is not negotiable.",'d'],["Low! Superb view, no?",'c'],["Pull up! Pull up!",'n'],["Watch the altitude.",'v']],
 hiG:[["Gently, please. I am delicate in the morning.",'d'],["Nine G! Ooh la la!",'c'],["I cannot see anything!",'n'],["Hard turn. Strain, breathe.",'v']],
 outn:[["Many of them. A strike is perhaps coming, they hesitate to queue.",'d'],["Many? Bon, more fun.",'c'],["There are so many!",'n'],["Numbers against us. Keep calm.",'v']],
 idle:[["Quiet. I am hungry.",'d'],["We should have a croissant after this.",'c'],["All is well? All is well. I think.",'n'],["Quiet. We stay alert.",'v']],
 miss:["Missile! {c} o'clock! Break {side}, {cm}!{ctx}"],spike:["Radar on us, {c} o'clock.{ctx}"],
 waveoff:[["Wave off! Go around!",'n'],["Wave off. Next time.",'d']],tone:[["Good tone, fire.",'v'],["Tone, tir!",'c']],
 radarup:["Radar up. Searching.","I have the radar."],nolock:["No lock. Slippery.","Cannot lock."],lead:["Attention:","Pilot,","Bon,"]},
SE:{
 intro:[["{cs} i baksätet. Radar warm, coffee warmer.",'d'],["{cs}. Let's do this fast and fika after.",'c'],["{cs}. Please be careful, the jet is expensive.",'n'],["{cs}. Quiet and efficient.",'v']],
 kill:[["Splash. Lagom.",'d'],["He's down! Bra jobbat!",'c'],["Is it down? It is. Phew.",'n'],["Splash. Next.",'v']],
 streak:[["{k} kills. I'll say it was a team effort.",'d'],["{k}! Fika is on you!",'c'],["{k}. Keep focus.",'v'],["{k}... don't jinx it.",'n']],
 bingo:[["Bingo fuel. Time to go home, the road base is calling.",'d'],["Bingo. We land on the highway, I assume.",'c'],["Bingo fuel, please home!",'n'],["Bingo fuel. Recover.",'v']],
 joker:[["Joker fuel, {pct} percent.",'v'],["Half a tank. Lagom.",'d'],["Joker. I don't like the numbers.",'n'],["Half tank. One more pass.",'c']],
 hit:[["We're hit. It's fine. It's fine.",'d'],["Hit! He'll regret that.",'c'],["We're hit!",'n'],["Hit. Checking.",'v']],
 hurt:[["Damage mounting. Might be time for the road base.",'d'],["Lots of lights.",'c'],["Everything's red!",'n'],["Hurt but flying.",'v']],
 dying:[["I suggest we eject. The seat was assembled with Swedish care.",'d'],["Eject, eject!",'n'],["She won't hold. Your call.",'v'],["Well, it's been fun.",'c']],
 lowalt:[["Altitude. The forest is taller than it looks.",'d'],["Low! Very low!",'c'],["Pull up!",'n'],["Mind the trees.",'v']],
 hiG:[["Gently, please.",'d'],["Nine G! Skål.",'c'],["I can't see!",'n'],["Hard pull. Strain.",'v']],
 outn:[["Many of them. Typical, no queue.",'d'],["Outnumbered? Good.",'c'],["There are too many!",'n'],["Numbers against us. Stay calm.",'v']],
 idle:[["Quiet. Good time for coffee.",'d'],["No flat-pack assembly required for this one.",'c'],["Everything okay up there?",'n'],["Quiet. We stay alert.",'v']],
 miss:["Missile! {c} o'clock! Break {side}, {cm}!{ctx}"],spike:["Radar on us, {c} o'clock.{ctx}"],
 waveoff:[["Wave off! Go around!",'n'],["Wave off.",'d']],tone:[["Good tone, fire.",'v'],["Tone, send it.",'c']],
 radarup:["Radar up. Searching.","I have the radar."],nolock:["No lock.","Cannot lock."],lead:["Heads up:","Pilot,","Note:"]}};

function setup(P){
  const nat=natOf(P.type),h=hash(P.type),pool=NAMES[nat];
  CV.nat=nat;CV.pers=PERS[h%4];const n=pool[hash(P.type+'#')%pool.length];CV.name=n[1];CV.cs=n[0];CV.t0=nowS();CV.kills=0;CV.streak=0;CV.stage={};CV.last={};CV.key=P;
  CV.idleT=nowS()+60+Math.random()*60;CV.tank0=P.tankFuel||0;
}
const L=(cat,sub)=>{const V1=V[CV.nat][cat]||V.US[cat];if(!V1)return null;
  const same=V1.filter(e=>Array.isArray(e)&&e[1]===CV.pers);const e=same.length?rnd(same):rnd(V1);return Array.isArray(e)?e[0]:e;};
const fill=(s,o)=>s.replace(/\{k\}([.!?…])/g,'{k} kills$1').replace(/\{(\w+)\}/g,(m,k)=>o[k]!=null?o[k]:'');
const say=(cat,o={},key,cd=25)=>{if(CV.off)return;const s=L(cat);if(!s)return;const t=nowS();if((CV.last[key||cat]||0)>t)return;CV.last[key||cat]=t+cd;
  rio.say(fill(s,Object.assign({cs:CV.cs},o)),null);};

// ---------- context for missile / spike calls
function mslCtx(P){let best=null,bd=1e9;for(const m of (typeof missiles!=='undefined'?missiles:[]))if(m.alive&&m.track===P){const d=m.pos.distanceTo(P.pos);if(d<bd){bd=d;best=m;}}
  if(!best)return'';const v=best.vel?best.vel.length():600,clo=Math.max(200,v+P.vel.length()*.2),tti=Math.round(bd/clo);
  const nm=(best.type||'').replace(/^AIM-/,'AIM-'),seek=best.def&&best.def.seek;
  return ` ${nm}${seek==='IR'?', heat-seeker':seek==='SARH'?', semi-active, keep him off the radar':', active radar'}, ${bd>=3000?(bd/NM).toFixed(0)+' miles':Math.round(bd/100)*100+' metres'}, about ${tti} seconds.`;}
function spkCtx(P){let best=null,bd=1e9;for(const j of jets)if(j!==P&&j.alive&&j.ai&&!j.ai.friend&&j.ai.radarLock&&j.ai.t===P){const d=j.pos.distanceTo(P.pos);if(d<bd){bd=d;best=j;}}
  return best?` It's a ${best.ac.nctr||best.type}, ${(bd/NM).toFixed(0)} miles.`:'';}

// ---------- rewrite the stock lines
function rewrite(s){if(CV.off||!player||!player.ac.rio)return s;const V1=V[CV.nat]||V.US,P=player;let m;
  if(/^Splash! Good kill\.$/.test(s)){CV.kills++;return CV.kills>=3&&CV.kills%3===0?fill(L('streak'),{k:CV.kills}):fill(L('kill'),{});}
  if(/^Bingo fuel, time to go home\.$/.test(s))return fill(L('bingo'),{});
  if(m=s.match(/^Missile, (\d+) o'clock! Break (\w+), (flares|chaff)!$/)){const t=(V1.miss||V.US.miss)[0];return fill(t,{c:m[1],side:m[2],cm:m[3],ctx:mslCtx(P)});}
  if(m=s.match(/^Spiked, (\d+) o'clock\.$/)){const t=(V1.spike||V.US.spike)[0];return fill(t,{c:m[1],ctx:spkCtx(P)});}
  if(/^Wave off, wave off!$/.test(s))return L('waveoff');
  if(/^Good tone, take the shot\.$/.test(s))return L('tone');
  if(/^(Radar coming up\.|Back on the radar\.)$/.test(s))return rnd(V1.radarup||V.US.radarup);
  if(/^(Can't get a lock on him\.|Nothing to lock\.)$/.test(s))return rnd(V1.nolock||V.US.nolock);
  if(/^(ESM|Radar|Airborne radar|[\w\- ]+ is tracking us)/.test(s)&&Math.random()<.35)return rnd(V1.lead||V.US.lead)+' '+(/^[A-Z][a-z]/.test(s)?s.charAt(0).toLowerCase():s.charAt(0))+s.slice(1);
  return s;}
CV.rewrite=rewrite;
{const _s=rio.say;rio.say=function(s,key,cd){if(typeof s==='string'){const r=rewrite(s);if(r)s=r;}return _s.call(this,s,key,cd);};}
// the crew name replaces the generic tag on the HUD
CV.label=()=>LAB[CV.nat]||'RIO';

// ---------- the flight itself
function tick(){const P=player;if(!P||!P.alive||!P.ac||!P.ac.rio||P.remote||typeof game==='undefined'||!game.running){return;}
  if(CV.key!==P)setup(P);const t=nowS();if(CV.intro!==P&&t-CV.t0>3){CV.intro=P;say('intro',{},'intro',9999);}
  const hostiles=jets.filter(j=>j!==P&&j.alive&&j.ai&&!j.ai.friend&&j.pos.distanceTo(P.pos)<60000);
  const danger=missiles.some(m=>m.alive&&m.track===P)||hostiles.some(j=>j.ai.radarLock&&j.ai.t===P);
  const agl=P.pos.y-groundAt(P.pos.x,P.pos.z),fr=P.ac.fuel?(P.fuel+P.tankFuel)/(P.ac.fuel+(CV.tank0||0)):1;
  if(danger){CV.idleT=t+90;return;}
  if(P.nz>8&&!P.onGnd)say('hiG',{},'hiG',55);
  if(agl<130&&P.vel.length()>200&&!P.onGnd&&t-CV.t0>30)say('lowalt',{},'lowalt',50);
  if(fr<.52&&!CV.stage.j){CV.stage.j=1;say('joker',{pct:Math.round(fr*100)},'joker',9999);}
  if(P.hp<70&&!CV.stage.h){CV.stage.h=1;say('hit',{},'hit',9999);}
  if(P.hp<40&&!CV.stage.u){CV.stage.u=1;say('hurt',{},'hurt',9999);}
  if(P.hp<18&&!CV.stage.d){CV.stage.d=1;say('dying',{},'dying',9999);}
  if(hostiles.length>=4&&!CV.stage.o){CV.stage.o=1;say('outn',{},'outn',9999);}
  if(hostiles.length<2)CV.stage.o=0;
  if(t>CV.idleT&&hostiles.length===0&&P.hp>55){CV.idleT=t+110+Math.random()*120;say('idle',{},'idle',60);}}
setInterval(()=>{try{tick();}catch(e){}},1000);
console.info('[crewvoice] ready');
})();
