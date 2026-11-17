#!/usr/bin/env node
/* Builds assets/world/elev-4096.png: global elevation and bathymetry, 4096 x 2048 equirectangular (about 10 km per
   cell), from AWS Open Data Terrain Tiles (Terrarium, zoom 5: SRTM, GMTED2010, ETOPO1 and others; see SOURCES.md),
   Terrarium-encoded (R*256 + G - 32768 m). The world map shades it; flight keeps the 2048 grid and streamed tiles.
   Usage: node scripts/build-elev-map.js [cacheDir]   (needs pngjs; downloads 1,024 tiles once into the cache) */
const fs=require('fs'),path=require('path'),https=require('https');
const root=path.join(__dirname,'..'),CACHE=process.argv[2]||path.join(root,'.world-cache');
let PNG;for(const m of['pngjs',path.join(CACHE,'node_modules/pngjs')]){try{PNG=require(m).PNG;break;}catch(e){}}if(!PNG){console.error('pngjs not found');process.exit(2);}
const get=(u,f)=>new Promise((res,rej)=>{if(fs.existsSync(f))return res(fs.readFileSync(f));https.get(u,r=>{if(r.statusCode!==200){rej(new Error(u+' '+r.statusCode));return;}const b=[];r.on('data',d=>b.push(d));r.on('end',()=>{const x=Buffer.concat(b);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,x);res(x);});}).on('error',rej);});
(async()=>{const Z=5,N=1<<Z,TS=256,WPX=N*TS,tiles={};const jobs=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)jobs.push([x,y]);
  let k=0;const work=async()=>{while(k<jobs.length){const[x,y]=jobs[k++];const b=await get('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+Z+'/'+x+'/'+y+'.png',path.join(CACHE,'tiles5',x+'_'+y+'.png'));
    const im=PNG.sync.read(b),h=new Float32Array(TS*TS);for(let i=0;i<TS*TS;i++)h[i]=im.data[i*4]*256+im.data[i*4+1]+im.data[i*4+2]/256-32768;tiles[x+','+y]=h;}};
  await Promise.all(Array.from({length:12},work));console.log('tiles',Object.keys(tiles).length);
  const mH=(px,py)=>{px=((px%WPX)+WPX)%WPX;py=Math.max(0,Math.min(WPX-1,py));const tx=(px/TS)|0,ty=(py/TS)|0;return tiles[tx+','+ty][((py|0)%TS)*TS+((px|0)%TS)];};
  const W=4096,H=2048,out=new PNG({width:W,height:H,colorType:2,inputHasAlpha:false});
  for(let j=0;j<H;j++){const lat=90-(j+.5)*180/H,la=Math.max(-85.05,Math.min(85.05,lat))*Math.PI/180,py=(1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*WPX;
    for(let i=0;i<W;i++){const lon=-180+(i+.5)*360/W,px=(lon+180)/360*WPX;let s=0,n=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){s+=mH(px+a*(WPX/W)/3,py+b*(WPX/W)/3);n++;}
      let h=Math.round(s/n);if(lat<-85)h=Math.max(h,2000);const v=Math.max(0,Math.min(65535,h+32768)),o=(j*W+i)*4;out.data[o]=v>>8;out.data[o+1]=v&255;out.data[o+2]=0;out.data[o+3]=255;}}
  fs.writeFileSync(path.join(root,'assets/world/elev-4096.png'),PNG.sync.write(out,{colorType:2,deflateLevel:9}));console.log('elev-4096.png',W+'x'+H);})().catch(e=>{console.error(e);process.exit(1);});
