/* =====================================================================================================================
   SQUAD — your infantry squad as people who stay together through the war (v413), the way the air squadron's roster
   and wingman work (forces.js). Fictional, unique names from the war's pools.
     * ROSTER per country you fight for: eight men and women (squad leader, team leaders, machine gunner, grenadier,
       medic, marksman, rifleman), each with a home town, a trait, a habit, morale and a short history.
     * RELATIONSHIPS: trust between every pair and toward you (0-1). Fighting side by side and coming back raises it;
       a medic who saved someone is trusted more; losing a friend brings grief; friendly fire or a reckless order
       lowers trust in you. New men start as strangers.
     * THE WAR REACHES THEM: losses come off the roster (the dead are remembered by name, in the death ledger and here),
       the wounded go to hospital and come back, replacements arrive green.
     * THE RIDE TO THE FRONT: talk in the back of the APC — about home, the front, the day of the war, the news, the
       dead, the new guy, each other — generated from the roster and the war's own record.
   ===================================================================================================================== */
(()=>{
'use strict';
const W=window.WWAR;if(!W)return;
const rn=()=>Math.random(),pk=a=>a[Math.floor(rn()*a.length)],cl=(v,a,b)=>Math.max(a,Math.min(b,v)),r2=x=>Math.round(x*100)/100;
const ROLES=['squad leader','team leader','team leader','machine gunner','grenadier','medic','marksman','rifleman'];
const TRAIT=['steady','quiet','joker','devout','hot-headed','careful','cheerful','fatalist','bookish','homesick'];
const HABIT=['writes letters every night','keeps a photo of his daughter in his helmet','hums the same song','counts his magazines twice','shares his cigarettes','never eats the biscuits','cleans his rifle when nervous','reads the same paperback'];
const sq=()=>{const st=W.st;if(!st)return null;return st.sq2||(st.sq2={by:{},seq:1});};
function name(a3){return W.people&&W.people.name?W.people.name(a3,Math.random):'Soldier '+(sq().seq);}
function home(a3){const c=(W.st.city&&W.st.city[a3])||[];const p=c.length?pk(c.slice(0,12)).n:(W.st.c[a3]?W.st.c[a3].n:'home');return p;}
function member(a3,role){const S0=sq();const id='M'+(S0.seq++);const RU=W.st.c[a3]&&W.st.c[a3].side==='R';const ER=RU?['Ryadovoy','Yefreytor','Ml. Serzhant','Serzhant']:['Pvt.','Cpl.','Sgt.','SSgt.'];const rk=ER[role==='squad leader'?3:role==='team leader'?2:/gunner|medic|marksman/.test(role)?1:0];
  return{id,n:name(a3),rk,role,home:home(a3),trait:pk(TRAIT),habit:pk(HABIT),mor:r2(.6+rn()*.25),st:'FIT',days:0,joined:W.st.t,hist:[]};}
function roster(a3){const S0=sq();if(!S0)return null;let R=S0.by[a3];if(R)return R;R=S0.by[a3]={a3,m:ROLES.map(r=>member(a3,r)),tr:{},you:{},lost:[],battles:0};
  for(const a of R.m){R.you[a.id]=r2(.45+rn()*.2);for(const b of R.m)if(a!==b)R.tr[a.id+'|'+b.id]=r2(.4+rn()*.35);}return R;}
const tr=(R,a,b)=>R.tr[a.id+'|'+b.id]??.4;const adj=(R,a,b,d)=>{R.tr[a.id+'|'+b.id]=r2(cl(tr(R,a,b)+d,0,1));R.tr[b.id+'|'+a.id]=r2(cl(tr(R,b,a)+d,0,1));};
const fit=R=>R.m.filter(x=>x.st==='FIT');
// the first men of a battle are your squad: name and rank from the roster
function take(a3,i){const R=roster(a3);if(!R)return null;const F=fit(R);return F[i]||null;}
function note(x,t){x.hist.push([W.st.t,t]);if(x.hist.length>5)x.hist.shift();}
// after a battle: who came back, who did not, what it did to them
function after(a3,res){const R=roster(a3);if(!R)return;R.battles++;const st=W.st,dead=new Set(res.dead||[]),wnd=new Set(res.wounded||[]);
  for(const x of R.m){if(x.st!=='FIT')continue;x.days++;if(dead.has(x.id)){x.st='KILLED';R.lost.push({id:x.id,n:x.n,rk:x.rk,role:x.role,t:st.t,where:res.place});note(x,'killed in action at '+res.place);continue;}
    if(wnd.has(x.id)){x.st='WOUNDED';x.back=st.t+24*(7+Math.floor(rn()*30));note(x,'wounded at '+res.place+', evacuated');}else note(x,'came back from '+res.place);}
  const alive=fit(R);for(const a of alive){for(const b of alive)if(a!==b&&a.id<b.id)adj(R,a,b,res.won?.05:.03);R.you[a.id]=r2(cl((R.you[a.id]||.5)+(res.won?.04:.01)-(res.ff?.15:0),0,1));
    a.mor=r2(cl(a.mor+(res.won?.05:-.04)-dead.size*.04,0,1));for(const d of R.m)if(dead.has(d.id)&&tr(R,a,d)>.6){a.mor=r2(cl(a.mor-.08,0,1));note(a,'lost '+d.n+', a close friend');}}
  if(res.saved)for(const[m,by]of res.saved){const A=R.m.find(x=>x.id===by),B=R.m.find(x=>x.id===m);if(A&&B)adj(R,A,B,.15);}
  // replacements arrive green, strangers to everyone
  for(let i=0;i<R.m.length;i++){const x=R.m[i];if(x.st==='KILLED'){const n=member(a3,x.role);n.green=1;R.m[i]=n;R.you[n.id]=.35;for(const b of R.m)if(b!==n){R.tr[n.id+'|'+b.id]=.25;R.tr[b.id+'|'+n.id]=.25;}note(n,'joined the squad as a replacement for '+x.n);}}
  W.emit('SQUAD',{e:[a3],txt:'Your squad after '+res.place+': '+(dead.size?dead.size+' killed ('+R.m.filter(x=>x.green&&x.joined===W.st.t).length+' replacements arrive), ':'')+(wnd.size?wnd.size+' wounded, ':'')+'morale '+Math.round(alive.reduce((t,x)=>t+x.mor,0)/Math.max(1,alive.length)*100)+'%.'});}
function daily(){const S0=W.st&&W.st.sq2;if(!S0)return;for(const R of Object.values(S0.by))for(const x of R.m){if(x.st==='WOUNDED'&&W.st.t>=x.back){x.st='FIT';note(x,'back from hospital');}if(x.st==='FIT'&&x.green&&x.days>3)x.green=0;}}
W.daily&&W.daily.push(daily);
/* ------------------------------------------------------------------ talk in the back of the APC */
function talk(a3,ctx){const R=roster(a3);if(!R)return[];const F=fit(R);if(F.length<2)return[];const st=W.st,p=st.c[a3],day=Math.floor(st.t/24),L=[];const say=(x,t)=>L.push([x.rk?x.rk+' '+x.n.split(' ').pop():x.n,t]);
  const A=pk(F),B=pk(F.filter(x=>x!==A))||A;const best=[...F].sort((x,y)=>tr(R,y,A)-tr(R,x,A))[1]||B;const en=ctx.enemy||'the enemy';
  const ev=(st.ev||[]).slice(-40).reverse().find(e=>/CITY|CEASEFIRE|MOBILIZATION|AIR|LOSS|ARMS|HEALTH/.test(e.ty||'')&&e.txt);
  const pool=[
    ()=>say(A,'Day '+day+'. Feels like a year.'),
    ()=>say(A,'My mother writes from '+A.home+'. '+(p&&p.ecn&&p.ecn.energy<.8?'Power cuts every evening now.':'She says the bakery is still open.')),
    ()=>ev&&say(B,'Heard on the radio: '+ev.txt.split('.')[0]+'.'),
    ()=>say(B,A.n.split(' ')[0]+', you '+A.habit.replace(/^(\w+)s\b/,'$1')+' again?'),
    ()=>R.lost.length&&say(A,'I keep looking for '+R.lost[R.lost.length-1].n.split(' ')[0]+' on this bench.'),
    ()=>{const g=F.find(x=>x.green);if(g){say(best,'New guy. Stay behind me and do what I do.');say(g,'Copy that.');}},
    ()=>say(A,(tr(R,A,best)>.7?best.n.split(' ')[0]+' has my back. Always has.':'Don\'t know if I trust '+best.n.split(' ')[0]+' yet.')),
    ()=>say(B,'They say '+en+' dug in deep at '+(ctx.place||'the line')+'. Drones all night.'),
    ()=>say(A,A.trait==='joker'?'If I die, tell them it was heroic. Not the beans.':A.trait==='devout'?'Say one for us, whoever\'s listening.':A.trait==='fatalist'?'It finds you or it doesn\'t.':'Keep your head down at the crossing, the spotters see everything.'),
    ()=>say(B,'When this is over I\'m going back to '+B.home+' and sleeping a week.'),
    ()=>{const med=F.find(x=>x.role==='medic');if(med)say(med,'Tourniquets high and tight. Check each other before we get out.');},
    ()=>say(A,'Morale\'s '+(A.mor>.65?'fine. We\'ve been through worse.':A.mor>.45?'thin. Everybody\'s tired.':'gone, honestly. I just want to get through today.'))];
  // v422: longer talk: back-and-forth exchanges between two or three of them, not just single remarks
  const fn=x=>x.n.split(' ')[0],C=pk(F.filter(x=>x!==A&&x!==B))||A,ld=F.find(x=>x.role==='squad leader')||A,mg=F.find(x=>x.role==='machine gunner'),med=F.find(x=>x.role==='medic'),g=F.find(x=>x.green);
  const lost=R.lost[R.lost.length-1],ev2=(st.ev||[]).slice(-60).reverse().filter(e=>e.txt&&/CITY|FRONT|OFFENSIVE|AIR|STRIKE|CEASEFIRE|PROTEST|MEDIA|MOBILIZATION/.test(e.ty||''));
  const conv=[
    ()=>{say(A,'You hear from home, '+fn(B)+'?');say(B,'Letter last week. '+B.home+' is quiet, they say. Queues for bread, but quiet.');say(A,'Quiet is good.');say(B,'Quiet is good.')},
    ()=>{say(B,'What are we walking into?');say(ld,'Trench line in front of '+(ctx.place||'the town')+'. We take over from a company that has been there nine days.');say(B,'Nine days.');say(ld,'They will be glad to see us. Check your water.')},
    ()=>{say(C,'Anyone got a light?');say(A,'Not in here. Wait till the ramp drops and you are behind something.');say(C,'Yes, mum.')},
    ()=>{if(!mg)return;say(mg,'If they come across the open ground I want a clear arc. Nobody stands in front of the gun.');say(B,'Nobody wants to stand in front of the gun, '+fn(mg)+'.');say(mg,'Then we understand each other.')},
    ()=>{if(!med)return;say(med,'Show me your tourniquets. Right now. Top pocket, left side, everyone.');say(C,'It is there, doc.');say(med,'I did not ask if it was there. I asked to see it.')},
    ()=>{if(!lost)return;say(A,fn(lost)+' used to sit right there.');say(B,'I know.');say(A,'He owed me money. Isn\'t that stupid? That is what I keep thinking about.');say(B,'It is not stupid.')},
    ()=>{if(!g)return;say(A,'First time up, '+fn(g)+'?');say(g,'Yes.');say(A,'Stay low, stay with your team leader, drink water. The noise is the worst part, you get used to it.');say(g,'Does anyone get used to it?');say(A,'No. But you stop noticing.')},
    ()=>{const e=ev2[0];if(!e)return;say(B,'Radio said: '+e.txt.split('.')[0]+'.');say(C,'Radio says a lot of things.');say(B,'Still. Somebody is having a worse day than us.')},
    ()=>{const e=ev2[1];if(!e)return;say(C,'Did you see this? '+e.txt.split('.')[0]+'.');say(A,'Do not believe anything until you see it with your own eyes.')},
    ()=>{say(A,'When this is done I am opening a little place in '+A.home+'. Coffee, pastries.');say(B,'You cannot cook.');say(A,'I will hire someone who can. I will sit in the window.');say(C,'I will come. I will pay, even.')},
    ()=>{say(B,'Drones were bad last night. You could hear them all night, that whine.');say(C,'Jammer on the command post works, mostly.');say(B,'Mostly.')},
    ()=>{say(C,(C.trait==='devout'?'I pray every time the ramp goes down.':C.trait==='joker'?'I have a plan. I am going to be very, very small.':C.trait==='fatalist'?'Whatever is coming is already on its way.':'Just do the job and go home.'));say(A,'Works as well as anything.')},
    ()=>{say(ld,'Listen in. We dismount, we go left to the communication trench, single file, five metres apart.');say(ld,'If the drones come, freeze under cover, do not run. Running is what they see.');say(B,'Copy.');say(C,'Copy.')},
    ()=>{say(A,'My kid drew me a tank. It has six guns and a cat on top.');say(B,'Why a cat?');say(A,'I asked. She said tanks are lonely.')},
    ()=>{say(B,A.habit.replace(/^(\w+)s\b/,'$1').replace(/^/,fn(A)+', do you always ')+'?');say(A,'Every time. It keeps my hands busy.')},
    ()=>{say(C,'How long is this ride?');say(A,'Long enough to sleep.');say(C,'Nobody sleeps in here.');say(A,(A.trait==='quiet'?'I do.':'Watch me.'))},
    ()=>{say(B,'They say '+en+' brought in fresh units. Young guys.');say(A,'Young guys like us.');say(B,'Yes. That is what I mean.')}];
  const n=16+Math.floor(rn()*7),used=new Set();
  for(let i=0;i<80&&L.length<n;i++){const two=rn()<.6;const P2=two?conv:pool;const k=Math.floor(rn()*P2.length),key=(two?'c':'p')+k;if(used.has(key))continue;used.add(key);try{P2[k]();}catch(e){}}return L;}
/* ------------------------------------------------------------------ SQUAD tab */
function tab(p){if(!W.st)return'<div>No war running.</div>';const R=roster(p.a3);const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const pct=x=>Math.round(x*100)+'%';
  let h='<div style="color:#8a9a92;font-size:10px">Fictional people. Trust and morale move with what happens to them together.</div><h4>YOUR SQUAD · '+R.battles+' battles</h4>';
  h+=R.m.map(x=>'<div style="margin:3px 0"><b>'+esc((x.rk?x.rk+' ':'')+x.n)+'</b> · '+x.role+(x.green?' · new':'')+' · '+x.st.toLowerCase()+'<br><span style="font-size:10px;color:#9ab">from '+esc(x.home)+' · '+x.trait+' · '+esc(x.habit)+' · morale '+pct(x.mor)+' · trusts you '+pct(R.you[x.id]||.5)+(x.hist.length?' · '+esc(x.hist[x.hist.length-1][1]):'')+'</span></div>').join('');
  const F=R.m;let pairs=[];for(const a of F)for(const b of F)if(a.id<b.id)pairs.push([a,b,(tr(R,a,b)+tr(R,b,a))/2]);pairs.sort((x,y)=>y[2]-x[2]);
  h+='<h4>CLOSEST</h4>'+pairs.slice(0,3).map(([a,b,t])=>'<div style="font-size:10px">'+esc(a.n)+' & '+esc(b.n)+' · '+pct(t)+'</div>').join('')+'<h4>STRAINED</h4>'+pairs.slice(-2).map(([a,b,t])=>'<div style="font-size:10px">'+esc(a.n)+' & '+esc(b.n)+' · '+pct(t)+'</div>').join('');
  if(R.lost.length)h+='<h4>REMEMBERED</h4>'+R.lost.slice(-8).map(x=>'<div style="font-size:10px">'+esc((x.rk?x.rk+' ':'')+x.n)+', '+x.role+' · day '+Math.floor(x.t/24)+' · '+esc(x.where||'')+'</div>').join('');
  return h;}
if(window.NATPANEL&&NATPANEL.tabs)NATPANEL.tabs.SQUAD=tab;
W.squad={roster,take,after,talk,tab,tr};
})();
