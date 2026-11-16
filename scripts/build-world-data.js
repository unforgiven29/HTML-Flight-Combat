#!/usr/bin/env node
/* Builds the bundled world data in assets/world/ (stage 1 of the world campaign: the Earth itself).
   Sources (all public domain or open; see assets/world/SOURCES.md, written by this script):
     * Natural Earth 1:10m populated places (cities and towns), 1:50m admin-0 countries  — public domain
     * OurAirports airports.csv / runways.csv (large and medium airports, real runway ends and headings) — public domain
     * AWS Open Data "Terrain Tiles" (Terrarium encoding, zoom 4) resampled to a 2048 x 1024 equirectangular grid — open,
       attribution required (SRTM, GMTED2010, ETOPO1 and others; see the SOURCES file)
   Usage:  node scripts/build-world-data.js [cacheDir]      needs: pngjs (npm i pngjs) on NODE_PATH or in cacheDir/node_modules
   Downloads are cached in cacheDir (default ./.world-cache, git-ignored). */
const fs=require('fs'),path=require('path'),https=require('https'),zlib=require('zlib');
const root=path.join(__dirname,'..'),OUT=path.join(root,'assets/world'),CACHE=path.resolve(process.argv[2]||path.join(root,'.world-cache'));
let PNG;for(const m of ['pngjs',path.join(CACHE,'node_modules/pngjs')]){try{PNG=require(m).PNG;break;}catch(e){}}
if(!PNG){console.error('pngjs not found: npm i --prefix '+CACHE+' pngjs');process.exit(2);}
fs.mkdirSync(OUT,{recursive:true});fs.mkdirSync(path.join(CACHE,'tiles'),{recursive:true});
const get=(url,file)=>new Promise((res,rej)=>{if(fs.existsSync(file)&&fs.statSync(file).size>0)return res(fs.readFileSync(file));
  const go=(u,n)=>https.get(u,r=>{if(r.statusCode>=300&&r.statusCode<400&&r.headers.location&&n<5)return go(r.headers.location,n+1);
    if(r.statusCode!==200){rej(new Error(u+' '+r.statusCode));r.resume();return;}const b=[];r.on('data',d=>b.push(d));r.on('end',()=>{const d=Buffer.concat(b);fs.writeFileSync(file,d);res(d);});}).on('error',rej);go(url,0);});
const NE='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/',OA='https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/';
const csv=t=>{const rows=[];let row=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
  else if(c==='"')q=true;else if(c===','){row.push(f);f='';}else if(c==='\n'){row.push(f);rows.push(row);row=[];f='';}else if(c!=='\r')f+=c;}
  if(f||row.length){row.push(f);rows.push(row);}const h=rows.shift();return rows.map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));};
const r4=v=>Math.round(v*1e4)/1e4;

(async()=>{
/* ---------------- cities and towns ---------------- */
const pp=JSON.parse(await get(NE+'ne_10m_populated_places_simple.geojson',path.join(CACHE,'places.geojson')));
const places=pp.features.map(f=>{const p=f.properties,[lon,lat]=f.geometry.coordinates;
  const cap=/Admin-0 capital/.test(p.featurecla)?2:/Admin-1 capital/.test(p.featurecla)?1:0;
  return[p.nameascii||p.name,r4(lat),r4(lon),Math.max(0,Math.round(p.pop_max||0)),p.adm0_a3||p.sov_a3||'',cap];})
  .filter(p=>isFinite(p[1])&&isFinite(p[2])).sort((a,b)=>b[3]-a[3]);
fs.writeFileSync(path.join(OUT,'places.json'),JSON.stringify({f:['name','lat','lon','pop','a3','cap'],d:places}));
console.log('places',places.length);

/* ---------------- airports and runways ---------------- */
const A=csv((await get(OA+'airports.csv',path.join(CACHE,'airports.csv'))).toString());
const R=csv((await get(OA+'runways.csv',path.join(CACHE,'runways.csv'))).toString());
const rw=new Map();const ft=v=>+v*0.3048;
for(const r of R){if(r.closed==='1')continue;const L=ft(r.length_ft);if(!(L>=600))continue;
  const paved=/ASP|CON|PEM|BIT|TAR|PAV|ASF|BET/i.test(r.surface||'')?1:0;let la=+r.le_latitude_deg,lo=+r.le_longitude_deg,lb=+r.he_latitude_deg,lob=+r.he_longitude_deg;
  let hd=+r.le_heading_degT;if(!isFinite(hd)||r.le_heading_degT===''){const m=/^(\d\d)/.exec(r.le_ident||'');hd=m?(+m[1])*10:NaN;}
  const ends=isFinite(la)&&isFinite(lo)&&isFinite(lb)&&isFinite(lob)&&r.le_latitude_deg!==''&&r.he_latitude_deg!=='';
  const o=[Math.round(L),Math.round(ft(r.width_ft)||45),paved,ends?r4(la):null,ends?r4(lo):null,ends?r4(lb):null,ends?r4(lob):null,isFinite(hd)?Math.round(hd*10)/10:null,r.le_ident||'',r.he_ident||''];
  (rw.get(r.airport_ref)||rw.set(r.airport_ref,[]).get(r.airport_ref)).push(o);}
const MIL=/air ?base|\bAB\b|air force|\bRAF\b|naval air|\bNAS\b|military|\bAFB\b|army air|\bJASDF\b|aviation base/i;
const aps=[];for(const a of A){if(!['large_airport','medium_airport','small_airport'].includes(a.type))continue;const runs=rw.get(a.id)||[];if(!runs.length)continue;
  const mil=MIL.test(a.name+' '+(a.keywords||''))?1:0;const best=Math.max(...runs.map(r=>r[0]*(r[2]?1:.5)));
  // small fields only when paved and at least 1,500 m (fighters can use them); everything large / medium
  if(a.type==='small_airport'&&!(mil||runs.some(r=>r[2]&&r[0]>=1500)))continue;
  aps.push([a.ident,a.iata_code||'',a.name,a.type==='large_airport'?'L':a.type==='medium_airport'?'M':'S',r4(+a.latitude_deg),r4(+a.longitude_deg),Math.round(ft(a.elevation_ft||0)),a.iso_country||'',a.municipality||'',mil,runs]);}
aps.sort((a,b)=>'LMS'.indexOf(a[3])-'LMS'.indexOf(b[3]));
fs.writeFileSync(path.join(OUT,'airports.json'),JSON.stringify({f:['ident','iata','name','size','lat','lon','elev_m','iso2','city','mil','runways'],rf:['len_m','wid_m','paved','le_lat','le_lon','he_lat','he_lon','le_hdg_true','le_id','he_id'],d:aps}));
console.log('airports',aps.length,'(L',aps.filter(a=>a[3]==='L').length,'M',aps.filter(a=>a[3]==='M').length,'S',aps.filter(a=>a[3]==='S').length,'mil',aps.filter(a=>a[9]).length+')');

/* ---------------- countries (simplified, quantised to 0.01 deg) ---------------- */
const cc=JSON.parse(await get(NE+'ne_50m_admin_0_countries.geojson',path.join(CACHE,'countries.geojson')));
const dp=(pts,eps)=>{if(pts.length<4)return pts;const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;const st=[[0,pts.length-1]];
  while(st.length){const[a,b]=st.pop();let md=0,mi=-1;const[ax,ay]=pts[a],[bx,by]=pts[b],dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy)||1e-9;
    for(let i=a+1;i<b;i++){const d=Math.abs((pts[i][0]-ax)*dy-(pts[i][1]-ay)*dx)/L;if(d>md){md=d;mi=i;}}if(md>eps&&mi>0){keep[mi]=1;st.push([a,mi],[mi,b]);}}
  return pts.filter((_,i)=>keep[i]);};
const countries=cc.features.map(f=>{const p=f.properties,g=f.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;const rings=[];
  for(const poly of polys){const ring=poly[0],m=ring.length>>1,r=dp(ring.slice(0,m+1),.04).concat(dp(ring.slice(m),.04).slice(1));/* a closed ring: two open halves */if(r.length<4)continue;const q=[];let px=null,py=null;for(const[x,y]of r){const X=Math.round(x*100),Y=Math.round(y*100);if(X===px&&Y===py)continue;q.push(X,Y);px=X;py=Y;}if(q.length>=8)rings.push(q);}
  return{n:p.NAME||p.ADMIN,a3:p.ADM0_A3||p.ISO_A3,a2:p.ISO_A2_EH||p.ISO_A2,r:rings};}).filter(c=>c.r.length);
fs.writeFileSync(path.join(OUT,'countries.json'),JSON.stringify({q:100,d:countries}));
console.log('countries',countries.length);

/* ---------------- elevation: Terrarium z4 (Web Mercator) -> 2048 x 1024 equirectangular ---------------- */
const Z=4,N=1<<Z,TS=256,WPX=N*TS,tiles={};
for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=await get('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+Z+'/'+x+'/'+y+'.png',path.join(CACHE,'tiles',Z+'_'+x+'_'+y+'.png'));
  const im=PNG.sync.read(b),h=new Float32Array(TS*TS);for(let i=0;i<TS*TS;i++)h[i]=im.data[i*4]*256+im.data[i*4+1]+im.data[i*4+2]/256-32768;tiles[x+','+y]=h;}
const mH=(px,py)=>{px=((px%WPX)+WPX)%WPX;py=Math.max(0,Math.min(WPX-1,py));const tx=(px/TS)|0,ty=(py/TS)|0;return tiles[tx+','+ty][((py|0)%TS)*TS+((px|0)%TS)];};
const W=2048,H=1024,out=new PNG({width:W,height:H,colorType:2,inputHasAlpha:false});
for(let j=0;j<H;j++){const lat=90-(j+.5)*180/H,la=Math.max(-85.05,Math.min(85.05,lat))*Math.PI/180,py=(1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*WPX;
  for(let i=0;i<W;i++){const lon=-180+(i+.5)*360/W,px=(lon+180)/360*WPX;
    // average a few samples: the grid cell covers several mercator pixels
    let s=0,n=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){s+=mH(px+a*(WPX/W)/3,py+b*(WPX/W)/3);n++;}
    let h=Math.round(s/n);if(lat<-85)h=Math.max(h,2000);         // Antarctic plateau beyond the mercator limit
    const v=Math.max(0,Math.min(65535,h+32768)),o=(j*W+i)*4;out.data[o]=v>>8;out.data[o+1]=v&255;out.data[o+2]=0;out.data[o+3]=255;}}
fs.writeFileSync(path.join(OUT,'elev-2048.png'),PNG.sync.write(out,{colorType:2,deflateLevel:9}));
console.log('elevation grid',W+'x'+H);

fs.writeFileSync(path.join(OUT,'SOURCES.md'),`# World data — sources, licences, dates

Built by \`node scripts/build-world-data.js\` on ${new Date().toISOString().slice(0,10)}. Do not edit the data files by hand.

| File | Content | Source | Licence | Accuracy |
|---|---|---|---|---|
| places.json | ${places.length} cities and towns: name, position, population (pop_max), country, capital flag | Natural Earth 1:10m Populated Places (simple), naturalearthdata.com | Public domain | Positions to about 1 km; populations are Natural Earth estimates, not census counts |
| airports.json | ${aps.length} airports (large, medium, and paved small fields of 1,500 m or more) with runway ends, headings, length, width, surface | OurAirports (ourairports.com, data mirror github.com/davidmegginson/ourairports-data) | Public domain | Community-maintained; runway ends missing for some fields (placed from the heading instead). Military flag inferred from the name |
| countries.json | ${countries.length} country outlines, simplified (0.04 deg) and quantised to 0.01 deg | Natural Earth 1:50m Admin 0 Countries | Public domain | Map display only; boundaries as Natural Earth draws them (de facto), not a statement on any dispute |
| elev-2048.png | Global elevation and bathymetry, 2048 x 1024 equirectangular (about 20 km per cell), Terrarium encoding (R*256 + G - 32768 m) | AWS Open Data Terrain Tiles, zoom 4 | Open; attribution: SRTM (NASA), GMTED2010 (USGS), ETOPO1 (NOAA), and others listed at github.com/tilezen/joerd/blob/master/docs/attribution.md | Coarse: world map and offline fallback only |

At run time the flight terrain streams the same Terrain Tiles at zoom 10 (about 150 m per pixel) from elevation-tiles-prod.s3.amazonaws.com (CORS enabled). Offline, the coarse grid plus procedural detail is used, and the game says so.
`);
console.log('done');})().catch(e=>{console.error(e);process.exit(1);});
