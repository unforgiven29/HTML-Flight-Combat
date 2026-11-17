/* =====================================================================================================================
   v370 — a same-browser room for multiplayer (spec v49 ch.16 multiplayer; ch.20 tests). The game's rooms normally go
   over PeerJS (WebRTC) between computers. This room links pages of the same browser through a BroadcastChannel with
   the same interface (peers, onPeers, on, emit, presence, leave, role), so two tabs can play the same war — and the
   test suite can run a real host and a real guest in two pages. Used when the address has ?room=local (or when
   window.LOCAL_ROOM is set before connecting). The first page in a room is the host; when it leaves, the oldest
   remaining page is promoted (host migration in warnet.js).
   ===================================================================================================================== */
(()=>{
'use strict';
function localRoom(){return{async join(name){
  const me='l'+Math.random().toString(36).slice(2,10),bc=new BroadcastChannel('viper-room-'+name),peers=new Map(),pcb=[],ev={},born=Date.now(),seen=new Map([[me,born]]);let up=true,role='';
  const self=()=>({peer:me,sameTab:true,isMe:true,presence:peers.get(me)||{}});const fire=ch=>pcb.forEach(f=>f(Object.assign({peers:room.peers(),joined:[],updated:[],left:[]},ch)));
  const post=m=>{try{bc.postMessage(m);}catch(e){}};
  bc.onmessage=e=>{const m=e.data;if(!m||m.peer===me)return;if(m.t==='hello'){seen.set(m.peer,m.born);post({t:'here',peer:me,born,role});return;}if(m.t==='here'){seen.set(m.peer,m.born);return;}
    if(m.t==='pres'){const had=peers.has(m.peer);peers.set(m.peer,m.data);seen.set(m.peer,m.born||seen.get(m.peer)||0);fire(had?{updated:[{peer:m.peer,presence:m.data,sameTab:false}]}:{joined:[{peer:m.peer,presence:m.data,sameTab:false}]});}
    else if(m.t==='left'){peers.delete(m.peer);seen.delete(m.peer);fire({left:[{peer:m.peer}]});if(role!=='host'&&[...seen.entries()].sort((a,b)=>a[1]-b[1])[0][0]===me){role='host';room.role='host';try{if(typeof net!=='undefined'&&net.r===room)net.isHost=true;}catch(e){}}}
    else if(m.t==='ev')(ev[m.topic]||[]).forEach(f=>f({peer:m.peer,data:m.data,sameTab:false,isMe:false}));};
  const room={peers:()=>[self(),...[...peers.keys()].map(k=>({peer:k,presence:peers.get(k),sameTab:false,isMe:false}))],
    onPeers(f){pcb.push(f);return()=>{const i=pcb.indexOf(f);if(i>=0)pcb.splice(i,1);};},on(t,f){(ev[t]=ev[t]||[]).push(f);return()=>{const a=ev[t],i=a.indexOf(f);if(i>=0)a.splice(i,1);};},
    presence:d=>{peers.set(me,d);post({t:'pres',peer:me,born,data:d});return Promise.resolve();},emit:(topic,data)=>{post({t:'ev',peer:me,topic,data});(ev[topic]||[]).forEach(f=>f({peer:me,data,sameTab:true,isMe:true}));return Promise.resolve();},
    connected:()=>up,async leave(){if(up)post({t:'left',peer:me});up=false;bc.close();},role:''};
  post({t:'hello',peer:me,born});await new Promise(r=>setTimeout(r,350));role=[...seen.values()].some(b=>b<born)?'guest':'host';room.role=role;return room;}};}
window.localRoom=localRoom;if(/[?&]room=local\b/.test(location.search))window.LOCAL_ROOM=localRoom();
})();
