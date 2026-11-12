/* Crash guard: when the game throws, loses its WebGL context or stops drawing frames, the sim is paused and a report with a short error code is put on the screen
   (copyable). The code is a hash of the failing message and top stack frame, so the same bug always gives the same code. Loads last. */
(function(){
const NOISE=/ResizeObserver loop|^Script error\.?$|play\(\) request|The play\(\)|AbortError|NotAllowedError|The user aborted|Non-Error promise rejection/i;
const G=()=>{try{return typeof game!=='undefined'?game:null;}catch(e){return null;}},PL=()=>{try{return typeof player!=='undefined'?player:null;}catch(e){return null;}},SF=()=>{try{return typeof sfx!=='undefined'?sfx:null;}catch(e){return null;}};
const S={shown:false,n:0,log:[],crashed:false,lastFrame:performance.now(),hidden:document.hidden,armed:false};
const hash=t=>{let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16).toUpperCase().padStart(8,'0');};
const ver=()=>{const s=document.querySelector('script[src*="game.js"]');const m=s&&/v=(\d+)/.exec(s.src);return m?m[1]:'0';};
const top=st=>String(st||'').split('\n').slice(0,6).map(x=>x.trim().replace(/https?:\/\/[^/]+\//,'')).join('\n');
function ctx(){try{const P=PL(),g=G();return'aircraft '+(P&&P.type||'-')+' · scenario '+(g&&g.scen||'-')+' · '+(P&&P.pos?'pos '+[P.pos.x,P.pos.y,P.pos.z].map(v=>Math.round(v)).join(','):'no player')+' · frame '+S.n;}catch(e){return'context unavailable';}}
function ui(){
  if(S.el)return S.el;const d=document.createElement('div');d.id='crashGuard';
  d.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(6,8,10,.88);color:#e8f0ea;font:14px/1.45 "B612 Mono",ui-monospace,monospace;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
  d.innerHTML='<div style="max-width:760px;width:100%;background:#101417;border:2px solid #ff5a4a;padding:18px;box-sizing:border-box">'+
   '<div style="color:#ff5a4a;font-size:20px;letter-spacing:.08em">SIMULATION PAUSED · <span id="cgKind"></span></div>'+
   '<div style="margin:8px 0 4px;color:#9fb3a6">Send this code, or copy the full report:</div>'+
   '<div id="cgCode" style="font-size:30px;letter-spacing:.12em;color:#ffd27a;user-select:all"></div>'+
   '<textarea id="cgText" readonly spellcheck="false" style="width:100%;height:190px;margin-top:10px;background:#07090a;color:#cfe6d6;border:1px solid #33433a;font:12px/1.4 ui-monospace,monospace;padding:8px;box-sizing:border-box;resize:vertical"></textarea>'+
   '<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">'+
   '<button id="cgCopy">COPY REPORT</button><button id="cgCopyCode">COPY CODE</button><button id="cgRes">RESUME ANYWAY</button><button id="cgReload">RELOAD GAME</button></div>'+
   '<div id="cgMsg" style="margin-top:8px;color:#47f58a;min-height:1.3em"></div></div>';
  document.body.appendChild(d);
  d.querySelectorAll('button').forEach(b=>b.style.cssText='background:#1c2a22;color:#e8f0ea;border:1px solid #47f58a;padding:9px 14px;font:inherit;cursor:pointer');
  const msg=t=>{d.querySelector('#cgMsg').textContent=t;};
  const copy=async txt=>{try{await navigator.clipboard.writeText(txt);msg('Copied.');}catch(e){const ta=d.querySelector('#cgText');ta.value=txt;ta.focus();ta.select();try{document.execCommand('copy');msg('Copied.');}catch(_){msg('Press Ctrl+C to copy the selected text.');}}};
  d.querySelector('#cgCopy').onclick=()=>copy(S.report);d.querySelector('#cgCopyCode').onclick=()=>copy(S.code);
  d.querySelector('#cgRes').onclick=()=>{d.style.display='none';S.shown=false;S.crashed=false;S.lastFrame=performance.now();try{const g=G();if(g&&g.active&&$('#menu').hidden)resume();}catch(e){}};
  d.querySelector('#cgReload').onclick=()=>location.reload();
  // keys must not reach the game while the report is open
  d.addEventListener('keydown',e=>e.stopPropagation(),true);d.addEventListener('keyup',e=>e.stopPropagation(),true);
  return S.el=d;}
function show(kind,msg,stack){
  const sig=kind+'|'+String(msg).slice(0,160)+'|'+top(stack).split('\n')[0];
  if(S.shown){S.log.push(kind+': '+String(msg).slice(0,200));if(S.log.length>12)S.log.shift();const t=S.el&&S.el.querySelector('#cgText');if(t&&S.report)t.value=S.report+'\n\nFURTHER ERRORS WHILE OPEN\n'+S.log.join('\n');return;}
  S.shown=true;S.crashed=true;S.log=[];
  try{const g=G(),f=SF();if(g)g.paused=true;if(f&&f.mute)f.mute(true);}catch(e){}
  const code='HFC-'+ver()+'-'+hash(sig).slice(0,6);S.code=code;
  S.report=['HTML FLIGHT COMBAT · CRASH REPORT','CODE '+code,'TYPE '+kind,'MESSAGE '+msg,'',ctx(),'BUILD v'+ver()+' · '+new Date().toISOString(),'UA '+navigator.userAgent,'','STACK',top(stack)||'(none)'].join('\n');
  const d=ui();d.querySelector('#cgKind').textContent=kind;d.querySelector('#cgCode').textContent=code;d.querySelector('#cgText').value=S.report;d.querySelector('#cgMsg').textContent='';d.style.display='flex';
  try{console.error('[crashguard] '+code,msg);}catch(e){}}
window.addEventListener('error',e=>{if(!e.message||NOISE.test(e.message))return;if(e.target&&e.target!==window)return;show('ERROR',e.message+(e.filename?' ('+e.filename.replace(/.*\//,'')+':'+e.lineno+')':''),e.error&&e.error.stack);});
window.addEventListener('unhandledrejection',e=>{const r=e.reason,m=r&&r.message||String(r);if(NOISE.test(m)||NOISE.test(String(r&&r.name)))return;show('PROMISE',m,r&&r.stack);});
window.addEventListener('webglcontextlost',e=>{show('GPU CONTEXT LOST','The browser lost the WebGL context (GPU reset or out of memory).','');},true);
document.addEventListener('visibilitychange',()=>{S.hidden=document.hidden;S.lastFrame=performance.now();});
// the render loop is wrapped: an exception in a frame pauses the sim and stops that frame body running again until the player resumes; a gap of several seconds between frames while the tab is visible is reported as a freeze
const FREEZE=4000;
const o=window.frame;
if(typeof o==='function'){window.frame=function(tm){const now=performance.now();
    if(S.crashed)return window.requestAnimationFrame(window.frame);
    const g=G(),act=!!(g&&g.active);let gap=now-S.lastFrame;if(act&&!S.wasAct)gap=0;S.wasAct=act;S.lastFrame=now;
    if(S.armed&&!S.hidden&&gap>FREEZE&&g&&g.active&&!g.paused){show('FREEZE','No frame was drawn for '+(gap/1000).toFixed(1)+' s (the main thread was blocked).','');}
    S.n++;if(act)S.armed=true;
    try{return o.apply(this,arguments);}catch(e){show('FRAME ERROR',e&&e.message||String(e),e&&e.stack);}};}
// a loop that has stopped scheduling frames while the tab is visible and a game is running
setInterval(()=>{const g=G();if(S.shown||S.hidden||!S.armed||!g||!g.active||g.paused)return;const gap=performance.now()-S.lastFrame;if(gap>FREEZE*2)show('FREEZE','The render loop has not run for '+(gap/1000).toFixed(1)+' s.','');},2000);
window.CRASHGUARD={show,state:S};
})();
