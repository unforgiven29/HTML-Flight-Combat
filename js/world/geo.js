/* =====================================================================================================================
   v326 — WGEO: the Earth under the game (world campaign, stage 1). Loads after game.js; owns nothing in the old theatre.

   FRAME
   * Geographic positions are latitude / longitude (degrees, WGS84 sphere R = 6,371 km). The game still flies in flat local
     metres: x east, z SOUTH (north is -z, as everywhere in game.js), y up. WGEO.o is the origin of that local frame.
     Local projection: equirectangular about the origin (x = R cos(lat0) dlon, z = -R dlat). It is accurate to well under 1 %
     inside the 170 km terrain mesh; world flight re-centres the origin on the aircraft every ~35 km (worldflight.js), so
     the error never grows and Three.js float32 rendering stays precise anywhere on the planet.

   HEIGHTS (metres above sea level; the sea is anything at or below 0)
   * Streamed: AWS Terrain Tiles (Terrarium PNG), zoom 10 (about 150 m per pixel at the equator), fetched around the aircraft,
     kept in memory (LRU) and in the browser Cache Storage, so a place flown once works offline.
   * Bundled fallback: assets/world/elev-2048.png, a 2048 x 1024 global grid (about 20 km per cell) plus procedural detail.
     Used when a tile is not loaded or the network is down; WGEO.quality() says which.
   * Places, airports and countries load from assets/world/*.json (see assets/world/SOURCES.md for provenance and licences).
   ===================================================================================================================== */
(()=>{
'use strict';
const R=6371008.8,D=Math.PI/180;
const TZ=10,TS=256,TILE_URL='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/';
const MAXT=220;   // tiles kept in memory (each 256 KB as float32)
const warnOnce=(k,e)=>{if(!warnOnce[k]){warnOnce[k]=1;console.warn('[geo] '+k,e);}};

const G={R,o:{lat:0,lon:0},cosO:1,ready:false,online:true,fails:0,stat:{fetched:0,cached:0,failed:0},
  tiles:new Map(),pend:new Map(),grid:null,places:null,airports:null,countries:null};

/* ------------------------------------------------------------------ frame */
G.setOrigin=(lat,lon)=>{G.o={lat:+lat,lon:((+lon+540)%360)-180};G.cosO=Math.cos(G.o.lat*D);};
G.ll2xz=(lat,lon)=>{let dl=lon-G.o.lon;if(dl>180)dl-=360;if(dl<-180)dl+=360;return{x:R*G.cosO*dl*D,z:-R*(lat-G.o.lat)*D};};
G.xz2ll=(x,z)=>{const lat=G.o.lat-z/(R*D);let lon=G.o.lon+x/(R*G.cosO*D);lon=((lon+540)%360)-180;return{lat:Math.max(-89.9,Math.min(89.9,lat)),lon};};
// great-circle distance (m) and initial true bearing (deg)
G.dist=(a,b,c,d)=>{const p1=a*D,p2=c*D,dp=(c-a)*D,dl=(d-b)*D,h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));};
G.brg=(a,b,c,d)=>{const p1=a*D,p2=c*D,dl=(d-b)*D;return(Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))/D+360)%360;};

/* ------------------------------------------------------------------ PNG -> pixels without colour management */
let cvs=null,cx=null;
async function pixels(blob,w,h){const bmp=await createImageBitmap(blob,{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  if(!cvs||cvs.width!==w||cvs.height!==h){cvs=document.createElement('canvas');cvs.width=w;cvs.height=h;cx=cvs.getContext('2d',{willReadFrequently:true});}
  cx.clearRect(0,0,w,h);cx.drawImage(bmp,0,0);bmp.close&&bmp.close();return cx.getImageData(0,0,w,h).data;}

/* ------------------------------------------------------------------ bundled global grid */
G.loadGrid=async()=>{if(G.grid)return G.grid;
  const b=await (await fetch('assets/world/elev-2048.png')).blob(),W=2048,H=1024,d=await pixels(b,W,H),g=new Float32Array(W*H);
  for(let i=0;i<W*H;i++)g[i]=d[i*4]*256+d[i*4+1]-32768;G.grid={W,H,g};return G.grid;};
G.coarse=(lat,lon)=>{const q=G.grid;if(!q)return 0;const u=(lon+180)/360*q.W-.5,v=(90-lat)/180*q.H-.5;
  let i0=Math.floor(u),j0=Math.floor(v);const fu=u-i0,fv=v-j0;const at=(i,j)=>{i=((i%q.W)+q.W)%q.W;j=Math.max(0,Math.min(q.H-1,j));return q.g[j*q.W+i];};
  return(at(i0,j0)*(1-fu)+at(i0+1,j0)*fu)*(1-fv)+(at(i0,j0+1)*(1-fu)+at(i0+1,j0+1)*fu)*fv;};

/* ------------------------------------------------------------------ streamed tiles (Web Mercator, zoom TZ) */
const N=1<<TZ;
const merc=(lat,lon)=>{const la=Math.max(-85.0511,Math.min(85.0511,lat))*D;return{x:(lon+180)/360*N*TS,y:(1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*N*TS};};
const key=(x,y)=>x+'/'+y;
let tick=0;
// a request that neither answers nor fails (a network that silently drops) must not hold the game: 8 s per tile
const tfetch=(url)=>{const ac=typeof AbortController!=='undefined'?new AbortController():null,t=ac&&setTimeout(()=>ac.abort(),8000);return fetch(url,{mode:'cors',signal:ac&&ac.signal}).finally(()=>t&&clearTimeout(t));};
async function loadTile(x,y){const k=key(x,y);if(G.tiles.has(k)||G.pend.has(k))return G.pend.get(k);
  const p=(async()=>{const url=TILE_URL+TZ+'/'+x+'/'+y+'.png';let blob=null;const net=G.online;
    try{if(window.caches){const c=await caches.open('viper-terrain-v1'),r=await c.match(url);if(r){blob=await r.blob();G.stat.cached++;}
        if(!blob){if(!net)throw new Error('offline');const r2=await tfetch(url);if(!r2.ok)throw new Error('HTTP '+r2.status);c.put(url,r2.clone()).catch(()=>{});blob=await r2.blob();G.stat.fetched++;}}
      else{const r2=await tfetch(url);if(!r2.ok)throw new Error('HTTP '+r2.status);blob=await r2.blob();G.stat.fetched++;}
      const d=await pixels(blob,TS,TS),h=new Float32Array(TS*TS);for(let i=0;i<TS*TS;i++)h[i]=d[i*4]*256+d[i*4+1]+d[i*4+2]/256-32768;
      G.tiles.set(k,{h,t:++tick});G.fails=0;G.online=true;
      if(G.tiles.size>MAXT){let old=null,ot=1e18;for(const[kk,v]of G.tiles)if(v.t<ot&&!v.pin){ot=v.t;old=kk;}if(old)G.tiles.delete(old);}}
    catch(e){G.stat.failed++;if(++G.fails>=4)G.online=false;warnOnce('tile '+e.message,e);}
    finally{G.pend.delete(k);}})();
  G.pend.set(k,p);return p;}
// every tile covering a square of half-size r metres around a lat / lon
G.tilesAround=(lat,lon,r)=>{const dlat=r/(R*D),dlon=r/(R*Math.max(.05,Math.cos(lat*D))*D),a=merc(lat+dlat,lon-dlon),b=merc(lat-dlat,lon+dlon),out=[];
  for(let ty=Math.floor(a.y/TS);ty<=Math.floor(b.y/TS);ty++)for(let tx=Math.floor(a.x/TS);tx<=Math.floor(b.x/TS);tx++)out.push([((tx%N)+N)%N,Math.max(0,Math.min(N-1,ty))]);return out;};
// fetch them, at most 6 at a time; resolves when all are in (or failed), with a time limit
G.prefetch=async(lat,lon,r,onProg,limitMs=25000)=>{const T=G.tilesAround(lat,lon,r);G.online=true;G.fails=0;   // every new region tries the network again
  let done=0;const q=T.slice(),t0=performance.now();
  const worker=async()=>{while(q.length){if(performance.now()-t0>limitMs)return;const[x,y]=q.shift();await loadTile(x,y);done++;onProg&&onProg(done,T.length);}};
  await Promise.race([Promise.all(Array.from({length:6},worker)),new Promise(r=>setTimeout(r,limitMs+500))]);
  for(const[x,y]of T){const v=G.tiles.get(key(x,y));if(v)v.t=++tick;}
  return{need:T.length,have:T.filter(([x,y])=>G.tiles.has(key(x,y))).length};};
G.pin=(lat,lon,r,on)=>{for(const[x,y]of G.tilesAround(lat,lon,r)){const v=G.tiles.get(key(x,y));if(v)v.pin=on;}};
// height from loaded tiles, or null when one of the four pixels is missing
function tileH(lat,lon){const m=merc(lat,lon),px=m.x-.5,py=m.y-.5,x0=Math.floor(px),y0=Math.floor(py),fx=px-x0,fy=py-y0,W=N*TS;
  const at=(X,Y)=>{X=((X%W)+W)%W;Y=Math.max(0,Math.min(W-1,Y));const t=G.tiles.get(key((X/TS)|0,(Y/TS)|0));return t?t.h[(Y%TS)*TS+(X%TS)]:NaN;};
  const a=at(x0,y0),b=at(x0+1,y0),c=at(x0,y0+1),d=at(x0+1,y0+1);if(a!==a||b!==b||c!==c||d!==d)return null;
  return(a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;}
// fallback: the coarse grid plus noise that only roughens land (keeps coastlines where the grid puts them)
function fallbackH(lat,lon,x,z){const h=G.coarse(lat,lon);if(h<=0||typeof vnoise!=='function')return h;
  let n=0,a=1,f=1/9000;for(let i=0;i<4;i++){n+=a*vnoise(x*f+i*7.3,z*f-i*3.1);a*=.5;f*=2.03;}
  return Math.max(1,h+n*Math.min(500,40+h*.25));}
G.heightLL=(lat,lon)=>{const t=tileH(lat,lon);if(t!=null)return t;const p=G.ll2xz(lat,lon);return fallbackH(lat,lon,p.x,p.z);};
G.height=(x,z)=>{const ll=G.xz2ll(x,z),t=tileH(ll.lat,ll.lon);return t!=null?t:fallbackH(ll.lat,ll.lon,x,z);};
G.quality=(lat,lon,r)=>{const T=G.tilesAround(lat,lon,r||20000);const have=T.filter(([x,y])=>G.tiles.has(key(x,y))).length;return have===T.length?'TERRAIN 150 M':have?'TERRAIN PARTIAL':'TERRAIN COARSE (OFFLINE)';};

/* ------------------------------------------------------------------ places, airports, countries */
const unpack=o=>o.d.map(r=>Object.fromEntries(o.f.map((k,i)=>[k,r[i]])));
G.loadData=async()=>{if(G.ready)return;
  const[pl,ap,cc]=await Promise.all(['places','airports','countries'].map(n=>fetch('assets/world/'+n+'.json').then(r=>r.json())));
  G.places=unpack(pl);
  G.airports=ap.d.map(r=>{const a=Object.fromEntries(ap.f.map((k,i)=>[k,r[i]]));a.runways=a.runways.map(q=>Object.fromEntries(ap.rf.map((k,i)=>[k,q[i]])));return a;});
  G.countries=cc.d.map(c=>Object.assign({},c,{r:c.r.map(q=>Float32Array.from(q,v=>v/cc.q))}));
  for(const c of G.countries){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const r of c.r)for(let i=0;i<r.length;i+=2){x0=Math.min(x0,r[i]);x1=Math.max(x1,r[i]);y0=Math.min(y0,r[i+1]);y1=Math.max(y1,r[i+1]);}c.bb=[x0,x1,y0,y1];}
  G.byA3=new Map(G.countries.map(c=>[c.a3,c]));G.byA2=new Map(G.countries.filter(c=>c.a2&&c.a2!=='-99').map(c=>[c.a2,c]));
  try{const b=await (await fetch('assets/world/borders.json')).json();G.borders=b.d.map(x=>({a:x.a,b:x.b,l:x.l.map(q=>Float32Array.from(q,v=>v/b.q))}));}catch(e){G.borders=[];}
  await G.loadGrid();G.ready=true;};
// nearest / within radius, cheap filters (data are small enough for linear scans)
// which country a point is in (simplified outlines: near a border it can be wrong by a few km)
G.countryAt=(lat,lon)=>{for(const c of G.countries){const b=c.bb;if(lon<b[0]||lon>b[1]||lat<b[2]||lat>b[3])continue;
  for(const r of c.r){let ins=false;for(let i=0,j=r.length-2;i<r.length;j=i,i+=2)if((r[i+1]>lat)!==(r[j+1]>lat)&&lon<(r[j]-r[i])*(lat-r[i+1])/(r[j+1]-r[i+1])+r[i])ins=!ins;if(ins)return c;}}return null;};
G.near=(list,lat,lon,r)=>list.filter(p=>Math.abs(p.lat-lat)<r/111000+.01&&G.dist(lat,lon,p.lat,p.lon)<r);
G.search=(q,n=40)=>{q=String(q||'').trim().toLowerCase();if(!q||!G.airports)return[];const out=[];
  for(const a of G.airports){const s=(a.ident+' '+a.iata+' '+a.name+' '+a.city+' '+a.iso2).toLowerCase();if(a.ident.toLowerCase()===q||a.iata.toLowerCase()===q)out.unshift(a);else if(s.includes(q))out.push(a);if(out.length>=n*3)break;}
  return out.slice(0,n);};
// runway geometry in the local frame: centre, half-length, half-width, unit axis along the runway (le -> he), true heading
G.runway=(a,r)=>{let le,he;
  if(r.le_lat!=null&&r.he_lat!=null){le=G.ll2xz(r.le_lat,r.le_lon);he=G.ll2xz(r.he_lat,r.he_lon);}
  else{const c=G.ll2xz(a.lat,a.lon),h=(r.le_hdg_true!=null?r.le_hdg_true:0)*D,L=r.len_m/2;le={x:c.x-Math.sin(h)*L,z:c.z+Math.cos(h)*L};he={x:c.x+Math.sin(h)*L,z:c.z-Math.cos(h)*L};}
  const dx=he.x-le.x,dz=he.z-le.z,L=Math.hypot(dx,dz)||r.len_m;
  return{cx:(le.x+he.x)/2,cz:(le.z+he.z)/2,hl:Math.max(L,r.len_m*.9)/2,hw:Math.max(15,r.wid_m||45)/2,ux:dx/L,uz:dz/L,hdg:(Math.atan2(dx,-dz)/D+360)%360,le,he,paved:!!r.paved,len:r.len_m,id:r.le_id+'/'+r.he_id};};

window.WGEO=G;
})();
