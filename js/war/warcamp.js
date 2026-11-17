/* =====================================================================================================================
   v329 — the world war on the CAMPAIGN tab. A switch at the top of the tab: WORLD WAR (default) shows the world map with
   the war panel inside the campaign screen (start / load the war, run the clock, fronts, theatres, country profiles,
   FLY FOR <country>); THEATRE shows the original 300 km theatre campaign as before. The QUICK FLIGHT world map card still
   opens the same map full screen for free flight.
   Presentation only: WWAR owns the war, WMAP / WARMAP draw it.
   ===================================================================================================================== */
(()=>{
'use strict';
if(!window.WMAP||!window.WWAR)return;
let mode='WAR';try{const v=localStorage.getItem('viper.cmode');if(v==='WAR'||v==='THEATRE')mode=v;}catch(e){}
document.head.insertAdjacentHTML('beforeend','<style>'+
 '#wmap{grid-template-rows:minmax(0,1fr)}#wmap>div:first-child{height:100%}#wmap.embed{position:absolute;inset:0;z-index:6;height:100%}#wmap.embed #wmX{display:none}'+
 '#cmMode{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:8;display:flex;gap:0;border:1px solid rgba(255,255,255,.25);border-radius:4px;overflow:hidden;background:rgba(6,14,18,.9)}'+
 '#cmMode button{all:unset;cursor:pointer;padding:6px 14px;font:700 11px "B612 Mono",monospace;letter-spacing:.14em;color:#b9c6c0}#cmMode button[aria-pressed=true]{background:#ffcf5a;color:#07131b}'+
 '#wmap.embed .side{padding-top:46px}'+
 '</style>');
const pane=()=>document.getElementById('pCamp');
function sw(){const p=pane();if(!p||document.getElementById('cmMode'))return;
  p.insertAdjacentHTML('beforeend','<div id="cmMode" role="group" aria-label="Campaign"><button data-m="WAR">WORLD WAR</button><button data-m="THEATRE">THEATRE</button></div>');
  p.querySelector('#cmMode').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;mode=b.dataset.m;try{localStorage.setItem('viper.cmode',mode);}catch(_){}apply();});}
let framed=false;
async function embed(on){if(on){await WMAP.open();if(!framed){framed=true;const M=WMAP.M;M.lat=48;M.lon=60;M.ppd=Math.max(M.ppd,4);}/* open on the fronts, Europe to the western Pacific */const el=WMAP.M.el;if(!el)return;if(el.parentNode!==pane())pane().appendChild(el);el.classList.add('embed');el.hidden=false;WMAP.M.el.dispatchEvent(new Event('resize'));setTimeout(()=>{window.dispatchEvent(new Event('resize'));},30);}
  else{const el=WMAP.M.el;if(el&&el.classList.contains('embed'))el.hidden=true;}}
function apply(){sw();const b=document.querySelectorAll('#cmMode button');b.forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===mode?'true':'false'));
  const onCamp=document.getElementById('menu')&&!document.getElementById('menu').hidden&&document.getElementById('menu').dataset.tab==='camp';
  embed(onCamp&&mode==='WAR').catch(e=>console.warn('[warcamp]',e));}
// follow the menu: campaign tab shown / hidden, menu opened / closed
const menu=document.getElementById('menu');if(menu)new MutationObserver(apply).observe(menu,{attributes:true,attributeFilter:['data-tab','hidden']});
// the QUICK FLIGHT card opens the map full screen again
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#sWORLD')){const el=WMAP.M.el;if(el){el.classList.remove('embed');document.body.appendChild(el);}}},true);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',apply);else apply();
window.WARCAMP={apply,get mode(){return mode;},set mode(v){mode=v;apply();}};
})();
