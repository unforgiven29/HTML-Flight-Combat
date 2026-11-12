# RIO / WSO lines

Every line the back-seater can say, taken from the source (`js/core/game.js` rio object, `js/core/crewvoice.js`, `js/sensors/*`). Lines are shown without the `{...}` fill-ins resolved: `{cs}` = his callsign, `{k}` kills, `{pct}` fuel percent, `{c}` clock position, `{side}` break direction, `{cm}` flares or chaff, `{ctx}` extra context (weapon type, range, seconds).

Each call has a cooldown key, so the same call does not repeat until its timer runs out. `CREWV.off = true` in the console turns the personality layer off and gives the plain stock lines.

## Part 1 - The radar and weapons calls (stock text, before the personality layer)

These are what the RIO says about the radar, contacts, locks and shots. On a jet with a personality layer (any two-seater), the lines marked (V) are replaced by the nation and temperament lines in Part 3.

- **Contacts**: "Contact, {bearing} for {range}, angels {alt}, {aspect}." / "New contact, ..." (each new radar track, 2.5 s cooldown)
- **Radar power**: "Radar coming up." (V)
- **Priority target**: "Priority on the {n} mile contact." (pilot cycles to the next target) · "Next target, {bearing}, {o'clock}, ..." (F-14) · "That's the only one." · "No other targets I can see."
- **Locking**: "Locked, {n} miles." · "Home-on-jam, no range." · "Nothing to lock." (V) · "Can't get a lock on him." (V) · "Dropping lock, back to search."
- **Losing a lock**: "Lost him, he's notching." · "Lost lock, he's jamming." · "Lost him off the side." · "Lost lock." · "Lost him behind the ridge." (F-14)
- **TWS**: "Going TWS." · "Back to RWS." · "No track-while-scan on this set." · "TWS, {n} tracks, Phoenix priority set."
- **Jamming**: "Strobe at {bearing}, he's jamming. Going home-on-jam."
- **IRST**: "Back on the radar." (V) · "Nothing on the IRST, back to radar." · plus the reason he goes passive (IR shot, spiked, jammed or notched, close fight)
- **Shot calls**: "He's in the no-escape zone, shoot!" · "In range, shoot!" · "Good tone, take the shot." (V)
- **Our missiles**: "Phoenix away, time to impact {n}." / "Sparrow away, ..." / "Sidewinder away." · "Phoenix is active."
- **Threats**: "Missile, {c} o'clock! Break {side}, {chaff or flares}!" (V) · "Spiked, {c} o'clock." (V)
- **Results and fuel**: "Splash! Good kill." (V) · "Bingo fuel, time to go home." (V)
- **Bombs and lasers**: "Impact." · "Laser on."
- **Engine**: "{Left/Right} stall! Pull the power back!" (compressor stall, only when the stall is not mild; mild ones just name the side)

### EWO / WSO electronic-warfare calls (`js/sensors/ewo.js`)

- "ESM, {radar name} {radar|airborne}, {bearing}{, about N miles}." · "{Radar|Airborne radar} {bearing}{, about N miles}."
- "{radar name} is tracking us, {bearing}."
- "No jammer on the aircraft. Pods go on the wing stations."
- "Jammer standing by." · "I have the jammer." · "Your jammer."
- "Cueing the {ARM name}, {bearing} for {range}."
- About 35 % of these get a nation lead-in (see `lead` in Part 3).

## Part 2 - Set-handling calls

What the RIO says when he works the radar controls himself (only while the panel is set to RIO and the pilot has not touched the set in the last 25 s).

### F-14A/B, AN/AWG-9 panel (`js/sensors/awg9ctl.js`)

- Search mode: "PD search." · "Range while search." · "TWS auto." · "TWS manual." · "Pulse search."
- Lock type: "Pulse STT." · "PD STT."
- Scan: "Narrow scan." · "Wide scan." · "{1/2/4/8} bar."
- Range: "Range {n}."
- Rate and aspect windows: "Vc X-4." / "Vc norm." / "Vc vid." · "Aspect nose." / "Aspect beam." / "Aspect tail."
- Target size: "Targets small." / "Targets norm." / "Targets large."
- Track hold: "Track hold on." · "Track hold off."
- Jamming: "Fast AGC, jamming."

### F-4 and other pulse-radar jets (`js/sensors/pulsectl.js`)

- Polarization: "Circular polarization, rain." · "Back to linear."
- Bars: "Four bar." · "Two bar." · "One bar."
- Maneuver: "High G." · "Low G."
- Track: "Manual track, jammer." · "Auto track."
- Sweep: "Wide sweep." · "Narrow sweep."
- Gain: "Gain down, clutter." · "Gain up."
- Range: "Range {n}."
- Mode: "Ground map." · "Air mode."

### Other two-seaters: F-15E, Su-30, Tornado and similar (`js/sensors/riocrew.js`)

- "Range {n}." · "Narrow sweep." · "Wide sweep." · "{2/4} bar." · "TWS." · "Range while search."

## Part 3 - Personality lines by nation and temperament

Temperament is picked from the airframe, so the same jet always has the same crewman: **d** dry, **c** cocky, **n** nervous, **v** veteran. A line with no letter can come from anyone. He prefers lines that match his temperament and falls back to any line of that category.

### United States (RIO)

**Intro (once, a few seconds into the sortie)**

- (dry) {cs} in the back. Radar's warm, comms are good, coffee is not.
- (cocky) {cs} here. Let's go make some noise.
- (nervous) {cs}, checking in. Please nobody die today. Me especially.
- (veteran) {cs} up. Nice and easy, we've done this before.

**Kill (replaces "Splash! Good kill.")**

- (cocky) Splash one! Put it on the board.
- (dry) Good kill. Calling that one self-defence.
- (nervous) He's down, he's down! Tell me that's real.
- (veteran) Splash. Next.

**Kill streak (every 3rd kill; {k} = kills)**

- (dry) That's {k}. You know what the next one makes? A very awkward debrief.
- (cocky) {k} kills. I'm having a jersey made.
- (nervous) {k}?! My hands are shaking and I'm not even flying.
- (veteran) {k}. Don't get sloppy now.

**Bingo fuel (replaces the stock bingo call)**

- (dry) Bingo fuel. The tanker's not coming to us, we go home.
- (cocky) Bingo. Remember, the ground is the one thing we can't out-turn.
- (nervous) Bingo fuel, bingo fuel, can we please go home?
- (veteran) Bingo. Time to leave the party.

**Joker fuel (about half fuel, once; {pct} = fuel %)**

- (veteran) Joker fuel, {pct}% left. Plan the way home.
- (dry) Half a tank. Optimistic is still free.
- (nervous) Joker. Fuel's getting thin, skipper.
- (cocky) Joker. I can do this all day, the jet can't.

**Hit (HP below 70 %, once)**

- (dry) We're hit! Everything's fine, that's what the master caution is for.
- (cocky) Took one! Still flying, still handsome.
- (nervous) We're hit! We're hit!
- (veteran) Hit. Systems check, then back to work.

**Hurt (HP below 40 %, once)**

- (dry) We're hurt. Those lights are not Christmas decorations.
- (veteran) Damage is piling up, let's finish this quick.
- (nervous) That's a lot of red lights! A LOT of red lights!
- (cocky) Hurt, but I've had worse Mondays.

**Dying (HP below 18 %, once)**

- (dry) Skipper, I'd like to discuss the ejection handle.
- (nervous) Eject, eject, eject if she quits on you!
- (veteran) She's not gonna hold. Your call, I'm ready.
- (cocky) If this is the end, I want it noted I called it first.

**Too low (under 130 m AGL above 200 m/s, 50 s cooldown)**

- (dry) Altitude! I like the ground from a distance.
- (cocky) Low! That's a hell of a way to save fuel.
- (nervous) Pull up pull up pull up!
- (veteran) Watch your altitude, you're below the tree line.

**High G (over 8 G, 55 s cooldown)**

- (dry) Easy on the stick, I'd like to see the end of this fight with my eyes open.
- (cocky) Nine G! Beautiful. Please stop.
- (nervous) I'm greying out, I'm greying out!
- (veteran) Pulling hard. Breathe, strain, hold it.

**Outnumbered (4 or more hostiles, once)**

- (dry) That's a lot of bandits. Is it too late to ask for a transfer?
- (cocky) Outnumbered? Good. Fewer to share the glory with.
- (nervous) There's so many of them!
- (veteran) Numbers against us. Stay fast, stay smart.

**Idle banter (no hostiles, HP over 55 %, every 110-230 s)**

- (dry) Quiet out there. I don't trust quiet.
- (cocky) I bet I could land this thing. Don't ask me to prove it.
- (nervous) Everything okay up there? Everything's okay, right?
- (veteran) Quiet is good. Quiet gets you home.
- (dry) You know my wife thinks I have a desk job.
- (cocky) Radar's clean. Time to think about lunch.

**Missile warning ({c} clock, {side}, {cm}, {ctx} = weapon, range, time)**

- Missile! {c} o'clock, break {side}, {cm}!{ctx}

**Radar spike ({c} clock, {ctx} = aircraft type and range)**

- Spike! {c} o'clock.{ctx}

**Wave off (landing)**

- (dry) Wave off, wave off! Not this time.
- (nervous) Wave off! Do NOT put it on the deck.

**Good tone (replaces the stock IR tone call)**

- (veteran) Good tone. Take the shot.
- (cocky) Tone's good, send it.

**Radar up (replaces "Radar coming up." / "Back on the radar.")**

- Radar's up. Looking.
- I have the radar.

**No lock (replaces "Nothing to lock." / "Can't get a lock on him.")**

- No lock. He's slippery.
- Can't get a lock on him.

**Lead-in added to ESM / EWO calls about 35 % of the time**

- Heads up:
- Skipper,
- FYI,

### Russia (WSO)

**Intro (once, a few seconds into the sortie)**

- (dry) {cs} in the back seat. Radar is on. Everything works, which is suspicious.
- (cocky) {cs}. Let us fly. The NATO jets have nicer cupholders, we have better pilots.
- (nervous) {cs} here. I have checked the straps three times.
- (veteran) {cs}. Calm and quiet. Fly the airplane.

**Kill (replaces "Splash! Good kill.")**

- (veteran) Target destroyed. Very good.
- (dry) One fewer. I will not tell his mother.
- (cocky) He is down! Davai, davai!
- (nervous) Destroyed? Really destroyed? Good, good.

**Kill streak (every 3rd kill; {k} = kills)**

- (dry) {k} targets. Command will say it was the jet.
- (cocky) {k} kills! Today I drink for you.
- (veteran) {k}. We keep calm.
- (nervous) {k}... please do not tempt luck.

**Bingo fuel (replaces the stock bingo call)**

- (dry) Bingo fuel. The airfield is far and the fuel is not a good friend.
- (cocky) Bingo. We go home or we walk, and it is a long walk.
- (nervous) Bingo, bingo! Please, home!
- (veteran) Bingo fuel. Time to turn back.

**Joker fuel (about half fuel, once; {pct} = fuel %)**

- (dry) Half the fuel. Half the plan.
- (veteran) Joker, {pct} percent. Think about the way home.
- (nervous) Fuel is half. I am counting it twice.
- (cocky) Half tank. Still plenty for one more.

**Hit (HP below 70 %, once)**

- (dry) We are hit. It is nothing, it is only burning a little.
- (cocky) Hit! The jet is Russian, it will survive.
- (nervous) We are hit! We are hit!
- (veteran) Hit. Checking systems.

**Hurt (HP below 40 %, once)**

- (dry) Damage is serious. The jet complains, like my mother-in-law.
- (veteran) We are badly hurt. Finish and go home.
- (nervous) Many lights on, many many lights!
- (cocky) Hurt, but still flying. The seat is Zvezda, I am not worried.

**Dying (HP below 18 %, once)**

- (dry) Commander, the Zvezda seat is the best in the world. I suggest we test it.
- (nervous) Eject! Eject if she dies!
- (veteran) It will not hold. Your decision.
- (cocky) Do not die in the jet, it is bad for the paperwork.

**Too low (under 130 m AGL above 200 m/s, 50 s cooldown)**

- (dry) Altitude! The ground is hard and not Russian.
- (cocky) Low! We are not a tank!
- (nervous) Pull up! Pull up!
- (veteran) Watch the altitude.

**High G (over 8 G, 55 s cooldown)**

- (dry) Easy! I am not made of iron like the airplane.
- (veteran) Heavy G. Good. Do not black out.
- (nervous) The blood leaves my head!
- (cocky) Pull! Hold! Ha!

**Outnumbered (4 or more hostiles, once)**

- (dry) Many of them. At least it is a fair fight for them.
- (cocky) Many targets. Many chances.
- (nervous) So many! Command, there are so many!
- (veteran) Numbers are against us. Stay low and stay fast.

**Idle banter (no hostiles, HP over 55 %, every 110-230 s)**

- (dry) Quiet. In my experience the quiet is the plan of the enemy.
- (cocky) I have tea in the thermos. Do not turn upside down.
- (nervous) Everything works? Everything works. Strange.
- (veteran) Radar clean. Watch the horizon.
- (dry) In the academy they said the jet is simple. They did not say for whom.

**Missile warning ({c} clock, {side}, {cm}, {ctx} = weapon, range, time)**

- Missile! {c} o'clock! Break {side}, {cm}!{ctx}

**Radar spike ({c} clock, {ctx} = aircraft type and range)**

- Radar on us! {c} o'clock.{ctx}

**Wave off (landing)**

- (nervous) Go around! Do not land, do not land!
- (dry) Wave off. The runway can wait.

**Good tone (replaces the stock IR tone call)**

- (veteran) Good capture. Launch.
- (cocky) Capture! Launch it!

**Radar up (replaces "Radar coming up." / "Back on the radar.")**

- Radar is on. I am looking.
- I have the radar.

**No lock (replaces "Nothing to lock." / "Can't get a lock on him.")**

- No capture. He is hiding.
- Cannot capture him.

**Lead-in added to ESM / EWO calls about 35 % of the time**

- Attention:
- Pilot,
- Note:

### China (WSO)

**Intro (once, a few seconds into the sortie)**

- (veteran) {cs} here. Radar is up and all systems report normal. Proceeding as planned.
- (dry) {cs}. We will complete the mission and then drink tea.
- (nervous) {cs} ready. The jet is new, the training was long. We can do this.
- (cocky) {cs}. Let's show them what we have.

**Kill (replaces "Splash! Good kill.")**

- (veteran) Target destroyed. As planned.
- (dry) One down. The training was worth it.
- (cocky) Target down! Excellent!
- (nervous) Is it down? It is down. Good.

**Kill streak (every 3rd kill; {k} = kills)**

- (dry) {k} targets. This will look excellent on the report.
- (veteran) {k} kills. We are ahead of schedule.
- (cocky) {k}! The squadron will be proud.
- (nervous) {k}... please keep concentrating.

**Bingo fuel (replaces the stock bingo call)**

- (veteran) Bingo fuel. Return to base, as the plan requires.
- (dry) Bingo. The tea will be cold, but the fuel is colder.
- (nervous) Bingo fuel! Please return!
- (cocky) Bingo. Let's finish and go home.

**Joker fuel (about half fuel, once; {pct} = fuel %)**

- (veteran) Joker fuel. {pct} percent. Prepare the return.
- (dry) Half tank. Time to be efficient.
- (nervous) Fuel is half. I am watching it closely.
- (cocky) Joker. Still enough for one more pass.

**Hit (HP below 70 %, once)**

- (veteran) We are hit. Damage control, please.
- (dry) Hit. This is not in the training manual.
- (nervous) We're hit!
- (cocky) Hit! Still fighting!

**Hurt (HP below 40 %, once)**

- (veteran) Damage is heavy. Consider returning.
- (dry) Several systems degraded. The simulator was kinder.
- (nervous) Many warnings! Many warnings!
- (cocky) Hurt, but not finished.

**Dying (HP below 18 %, once)**

- (dry) Please consider ejection. I would rather report you alive.
- (veteran) Eject if she fails. That is an order from the back seat.
- (nervous) The aircraft cannot hold! Eject!
- (cocky) If we go, we go with style.

**Too low (under 130 m AGL above 200 m/s, 50 s cooldown)**

- (veteran) Altitude low. Pull up, please.
- (dry) Low altitude. The ground has no sense of humour.
- (nervous) Too low! Too low!
- (cocky) Low! Very bold, comrade.

**High G (over 8 G, 55 s cooldown)**

- (dry) High G. Please be gentle with the airframe, and with me.
- (veteran) Maintain the strain. Breathe.
- (nervous) I cannot see! I cannot see!
- (cocky) Pull harder! Show them!

**Outnumbered (4 or more hostiles, once)**

- (veteran) Many contacts. We will use the training.
- (dry) They brought many friends. We have only me.
- (nervous) So many! It is too many!
- (cocky) Many targets. Many chances.

**Idle banter (no hostiles, HP over 55 %, every 110-230 s)**

- (veteran) Quiet. Good time to check the fuel and the plan.
- (dry) I have a thermos of tea. It is the real weapon system.
- (nervous) Everything normal? It is too normal.
- (cocky) Nothing on the screen. A pity.

**Missile warning ({c} clock, {side}, {cm}, {ctx} = weapon, range, time)**

- Missile warning! {c} o'clock! Break {side}, {cm}!{ctx}

**Radar spike ({c} clock, {ctx} = aircraft type and range)**

- Radar lock warning, {c} o'clock.{ctx}

**Wave off (landing)**

- (veteran) Abort landing. Go around.
- (nervous) Wave off! Not safe!

**Good tone (replaces the stock IR tone call)**

- (veteran) Lock is stable. Fire.
- (cocky) Good lock. Launch!

**Radar up (replaces "Radar coming up." / "Back on the radar.")**

- Radar active. Searching.
- Radar is mine.

**No lock (replaces "Nothing to lock." / "Can't get a lock on him.")**

- No lock. Target is evading.
- Cannot lock.

**Lead-in added to ESM / EWO calls about 35 % of the time**

- Reminder:
- Pilot,
- Report:

### Britain (NAV)

**Intro (once, a few seconds into the sortie)**

- (dry) {cs} in the back. Radar's warm, kettle's on, shall we begin?
- (cocky) {cs}. Let's give the opposition something to write home about.
- (nervous) {cs}. Oh, I do hope this goes well.
- (veteran) {cs}. Steady as she goes.

**Kill (replaces "Splash! Good kill.")**

- (dry) Splash. Rather good, that.
- (cocky) He's down! Jolly good shooting!
- (nervous) Is he down? He's down. Oh, thank goodness.
- (veteran) Splash one. Carry on.

**Kill streak (every 3rd kill; {k} = kills)**

- (dry) That's {k}. I shall be mentioning it in the mess.
- (cocky) {k} kills! Drinks are on someone else.
- (veteran) {k}. Don't get cocky now.
- (nervous) {k}... best not to say it out loud.

**Bingo fuel (replaces the stock bingo call)**

- (dry) Bingo fuel. Time to go home before the engines start to sulk.
- (cocky) Bingo. I shan't be pushing a Tornado home.
- (nervous) Bingo fuel, please let's go home!
- (veteran) Bingo fuel. Time to recover.

**Joker fuel (about half fuel, once; {pct} = fuel %)**

- (veteran) Joker, {pct} per cent. A touch under half.
- (dry) Half a tank. Glass half full, I suppose.
- (nervous) Joker fuel. I'm watching it like a hawk.
- (cocky) Half fuel. Plenty for one more.

**Hit (HP below 70 %, once)**

- (dry) We've been hit. Still, mustn't grumble.
- (cocky) Hit! Rather rude of him.
- (nervous) We're hit! We're hit!
- (veteran) Hit. Checking the systems.

**Hurt (HP below 40 %, once)**

- (dry) Damage is mounting. Frankly, I'd like to go home.
- (cocky) Lots of caution lights. Almost festive.
- (nervous) Everything's gone red!
- (veteran) Hurt, but she'll get us home.

**Dying (HP below 18 %, once)**

- (dry) I'd suggest we consider the Martin-Baker. It has an excellent reputation.
- (nervous) Eject! Eject if she goes!
- (veteran) She won't hold. Your call, skipper.
- (cocky) Well, it's been a lovely flight.

**Too low (under 130 m AGL above 200 m/s, 50 s cooldown)**

- (dry) Altitude! The ground is awfully hard in this country.
- (cocky) Low! Marvellous, if you're a hedgehog.
- (nervous) Pull up, pull up!
- (veteran) Mind your height.

**High G (over 8 G, 55 s cooldown)**

- (dry) Gently, old thing, I've only just had breakfast.
- (cocky) Nine G, nice. Now let go.
- (nervous) I can't see, I can't see!
- (veteran) Pulling hard. Strain and breathe.

**Outnumbered (4 or more hostiles, once)**

- (dry) Rather a lot of them. Typical, they never queue.
- (cocky) Outnumbered? Good odds, I say.
- (nervous) There are far too many!
- (veteran) Numbers against us. Keep your head.

**Idle banter (no hostiles, HP over 55 %, every 110-230 s)**

- (dry) Quiet. Almost peaceful. Suspiciously so.
- (dry) I'm told this jet was designed by a committee. It shows.
- (cocky) Fancy a cup of tea after this?
- (nervous) Everything is quite alright, isn't it?
- (veteran) Quiet sky. Never trust it.

**Missile warning ({c} clock, {side}, {cm}, {ctx} = weapon, range, time)**

- Missile! {c} o'clock! Break {side}, {cm}!{ctx}

**Radar spike ({c} clock, {ctx} = aircraft type and range)**

- We're being painted, {c} o'clock.{ctx}

**Wave off (landing)**

- (dry) Wave off! Do go around.
- (nervous) Wave off! Not today.

**Good tone (replaces the stock IR tone call)**

- (veteran) Good tone, take the shot.
- (cocky) Tone's good, off you go.

**Radar up (replaces "Radar coming up." / "Back on the radar.")**

- Radar's up. Having a look.
- I have the radar.

**No lock (replaces "Nothing to lock." / "Can't get a lock on him.")**

- Can't get a lock on him. Slippery chap.
- No lock.

**Lead-in added to ESM / EWO calls about 35 % of the time**

- Just so you know:
- Skipper,
- I say,

### France (WSO)

**Intro (once, a few seconds into the sortie)**

- (dry) {cs} ici. Radar is up. Please, no heroics before lunch.
- (cocky) {cs}. Let's fly with panache, non?
- (nervous) {cs}. I will check the straps again, merci.
- (veteran) {cs}. Calme. We do it properly.

**Kill (replaces "Splash! Good kill.")**

- (dry) Splash. C'est propre.
- (cocky) He is down! Magnifique!
- (nervous) He is down? Oui. Oh, merci.
- (veteran) Splash. On continue.

**Kill streak (every 3rd kill; {k} = kills)**

- (dry) {k} kills. I will tell this story at dinner.
- (cocky) {k}! Champagne!
- (veteran) {k}. Do not lose concentration.
- (nervous) {k}... do not say it too loud.

**Bingo fuel (replaces the stock bingo call)**

- (dry) Bingo fuel. The tanker is on strike, I assume.
- (cocky) Bingo. We go home, there is wine waiting.
- (nervous) Bingo fuel! Please let us go home!
- (veteran) Bingo fuel. Time to recover.

**Joker fuel (about half fuel, once; {pct} = fuel %)**

- (veteran) Joker fuel, {pct} percent. We plan the return.
- (dry) Half a tank. Half full or half empty, who knows.
- (nervous) Joker fuel. I do not like it.
- (cocky) Half fuel. Enough for one more, non?

**Hit (HP below 70 %, once)**

- (dry) We are hit. Merde. Minor merde, let's hope.
- (cocky) Hit! He will pay for that.
- (nervous) We are hit! We are hit!
- (veteran) Hit. Checking the systems.

**Hurt (HP below 40 %, once)**

- (dry) The damage is large. Too large for lunch.
- (cocky) Many lights, we are a Christmas tree.
- (nervous) Everything is red! Everything!
- (veteran) Hurt, but she is a good airplane.

**Dying (HP below 18 %, once)**

- (dry) I suggest we use the Martin-Baker. It is very French, despite the name.
- (nervous) Eject, eject!
- (veteran) She will not hold. Your decision.
- (cocky) If we go, we go with style.

**Too low (under 130 m AGL above 200 m/s, 50 s cooldown)**

- (dry) Altitude! The ground is not negotiable.
- (cocky) Low! Superb view, no?
- (nervous) Pull up! Pull up!
- (veteran) Watch the altitude.

**High G (over 8 G, 55 s cooldown)**

- (dry) Gently, please. I am delicate in the morning.
- (cocky) Nine G! Ooh la la!
- (nervous) I cannot see anything!
- (veteran) Hard turn. Strain, breathe.

**Outnumbered (4 or more hostiles, once)**

- (dry) Many of them. A strike is perhaps coming, they hesitate to queue.
- (cocky) Many? Bon, more fun.
- (nervous) There are so many!
- (veteran) Numbers against us. Keep calm.

**Idle banter (no hostiles, HP over 55 %, every 110-230 s)**

- (dry) Quiet. I am hungry.
- (cocky) We should have a croissant after this.
- (nervous) All is well? All is well. I think.
- (veteran) Quiet. We stay alert.

**Missile warning ({c} clock, {side}, {cm}, {ctx} = weapon, range, time)**

- Missile! {c} o'clock! Break {side}, {cm}!{ctx}

**Radar spike ({c} clock, {ctx} = aircraft type and range)**

- Radar on us, {c} o'clock.{ctx}

**Wave off (landing)**

- (nervous) Wave off! Go around!
- (dry) Wave off. Next time.

**Good tone (replaces the stock IR tone call)**

- (veteran) Good tone, fire.
- (cocky) Tone, tir!

**Radar up (replaces "Radar coming up." / "Back on the radar.")**

- Radar up. Searching.
- I have the radar.

**No lock (replaces "Nothing to lock." / "Can't get a lock on him.")**

- No lock. Slippery.
- Cannot lock.

**Lead-in added to ESM / EWO calls about 35 % of the time**

- Attention:
- Pilot,
- Bon,

### Sweden (OBS)

**Intro (once, a few seconds into the sortie)**

- (dry) {cs} i baksätet. Radar warm, coffee warmer.
- (cocky) {cs}. Let's do this fast and fika after.
- (nervous) {cs}. Please be careful, the jet is expensive.
- (veteran) {cs}. Quiet and efficient.

**Kill (replaces "Splash! Good kill.")**

- (dry) Splash. Lagom.
- (cocky) He's down! Bra jobbat!
- (nervous) Is it down? It is. Phew.
- (veteran) Splash. Next.

**Kill streak (every 3rd kill; {k} = kills)**

- (dry) {k} kills. I'll say it was a team effort.
- (cocky) {k}! Fika is on you!
- (veteran) {k}. Keep focus.
- (nervous) {k}... don't jinx it.

**Bingo fuel (replaces the stock bingo call)**

- (dry) Bingo fuel. Time to go home, the road base is calling.
- (cocky) Bingo. We land on the highway, I assume.
- (nervous) Bingo fuel, please home!
- (veteran) Bingo fuel. Recover.

**Joker fuel (about half fuel, once; {pct} = fuel %)**

- (veteran) Joker fuel, {pct} percent.
- (dry) Half a tank. Lagom.
- (nervous) Joker. I don't like the numbers.
- (cocky) Half tank. One more pass.

**Hit (HP below 70 %, once)**

- (dry) We're hit. It's fine. It's fine.
- (cocky) Hit! He'll regret that.
- (nervous) We're hit!
- (veteran) Hit. Checking.

**Hurt (HP below 40 %, once)**

- (dry) Damage mounting. Might be time for the road base.
- (cocky) Lots of lights.
- (nervous) Everything's red!
- (veteran) Hurt but flying.

**Dying (HP below 18 %, once)**

- (dry) I suggest we eject. The seat was assembled with Swedish care.
- (nervous) Eject, eject!
- (veteran) She won't hold. Your call.
- (cocky) Well, it's been fun.

**Too low (under 130 m AGL above 200 m/s, 50 s cooldown)**

- (dry) Altitude. The forest is taller than it looks.
- (cocky) Low! Very low!
- (nervous) Pull up!
- (veteran) Mind the trees.

**High G (over 8 G, 55 s cooldown)**

- (dry) Gently, please.
- (cocky) Nine G! Skål.
- (nervous) I can't see!
- (veteran) Hard pull. Strain.

**Outnumbered (4 or more hostiles, once)**

- (dry) Many of them. Typical, no queue.
- (cocky) Outnumbered? Good.
- (nervous) There are too many!
- (veteran) Numbers against us. Stay calm.

**Idle banter (no hostiles, HP over 55 %, every 110-230 s)**

- (dry) Quiet. Good time for coffee.
- (cocky) No flat-pack assembly required for this one.
- (nervous) Everything okay up there?
- (veteran) Quiet. We stay alert.

**Missile warning ({c} clock, {side}, {cm}, {ctx} = weapon, range, time)**

- Missile! {c} o'clock! Break {side}, {cm}!{ctx}

**Radar spike ({c} clock, {ctx} = aircraft type and range)**

- Radar on us, {c} o'clock.{ctx}

**Wave off (landing)**

- (nervous) Wave off! Go around!
- (dry) Wave off.

**Good tone (replaces the stock IR tone call)**

- (veteran) Good tone, fire.
- (cocky) Tone, send it.

**Radar up (replaces "Radar coming up." / "Back on the radar.")**

- Radar up. Searching.
- I have the radar.

**No lock (replaces "Nothing to lock." / "Can't get a lock on him.")**

- No lock.
- Cannot lock.

**Lead-in added to ESM / EWO calls about 35 % of the time**

- Heads up:
- Pilot,
- Note:

## Sterile cockpit (combat runs)

A combat run is on while a hostile is within 40 NM, the radar is in STT, or one of our missiles or a missile at us is in the air. During one, the crew says only what the pilot needs:

- **Kept, in plain words:** "Splash." · "Bingo." · "Joker." · "Hit." · "Damage." · "Eject, eject." · "Altitude." · "Multiple bandits." · "Tone." · "Wave off." · "Radar." · "No lock." · missile and spike warnings (with weapon, range and time) · contact, lock, lost-lock and shot calls · engine stall calls · EWO/ESM calls without the lead-in.
- **Dropped:** the intro, kill-streak talk, idle banter, high-G chatter, and all radar housekeeping calls ("Narrow scan", "Range 80", "Four bar", "TWS", "Vc norm", polarization, gain and so on). The action still happens silently.
- **Switch:** `CREWV.sterileOff = true` in the console turns the rule off.
