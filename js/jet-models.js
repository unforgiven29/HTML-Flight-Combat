/* =====================================================================================================================
   v283 — Own 3D airframes for every jet added in modern-jets.js and more-jets.js.
   Each jet is built procedurally (mkJet from coldwar.js) from its real dimensions: length, span, fuselage width / depth,
   wing root / tip chord and leading-edge sweep, wing position (low / mid / shoulder), tailplane (conventional, T-tail, none),
   single or twin fins with cant, canards, engine count and nozzle size, intake layout (nose, side, chin, belly, pods),
   canopy position and seats, paint. Stations are re-placed onto the new wing / fuselage, and the menu icon is redrawn.
   Spec: [L, span, W, H, wingRoot, wingTip, LEsweep°, wingRootLE (fraction of L), wingY (fraction of H), extra{...}]
   extra: tail:[span,root,tip,sweep,zFrac,y?,T?] · fin:[h,root,tip,sweep,n,cant,x] · can:[span,root,sweep,zFrac,y] · eng · nr · inl · cz · seats · col · dih · tdih · swing · pods
   ===================================================================================================================== */
(function(){
'use strict';
const H_=window.CW_HELP;if(!H_||!H_.mkJet){console.warn('[models] mkJet missing');return;}
const {mkJet,fvMake}=H_,D=Math.PI/180,T=Math.tan;
const G={c:0x8a949b},S=(L,b,W,H,wr,wt,sw,wz,wy,x)=>Object.assign({L,b,W,H,wr,wt,sw,wz,wy},x);
const F16=(x)=>S(15.06,9.45,1.0,.95,4.9,1.1,40,.47,0,Object.assign({tail:[5.6,2,.8,40,.88],fin:[3.0,2.6,1,47,1],eng:1,nr:.55,inl:'chin',cz:.2},x));
const FLK=(x)=>S(21.9,14.7,1.6,1.0,6.0,1.4,42,.45,.2,Object.assign({tail:[9.9,2.9,1,45,.9],fin:[4.1,3,1.2,45,2,0,1.6],eng:2,nr:.6,inl:'belly',cz:.17},x));
const FUL=(x)=>S(17.3,12.0,1.4,.85,5.5,1.4,42,.45,.1,Object.assign({tail:[7.8,2.6,1,45,.88],fin:[3.0,2.4,1,48,2,.1,1.3],eng:2,nr:.5,inl:'belly',cz:.2},x));
const HAR=(x)=>S(13.9,7.7,1.0,1.0,3.6,1.0,35,.45,.6,Object.assign({dih:-.2,tail:[4.2,1.4,.7,35,.9,0,0,-.2],fin:[2.0,2.0,1,45,1],eng:1,nr:.32,inl:'side',cz:.2},x));
const SPEC={
  // ----- modern BLUE -----
  'F-15EX':S(19.43,13.05,1.5,.9,6.0,1.7,45,.45,.35,{tail:[8.6,2.6,1,50,.86],fin:[3.0,2.6,1,40,2,.03,1.4],eng:2,nr:.55,inl:'side',cz:.2,seats:2,col:0x5f6870}),
  'F-18F':S(18.3,13.6,1.2,.9,4.6,1.6,28,.45,0,{tail:[6.7,2.3,.9,45,.86],fin:[3.0,2.2,1,35,2,.35,.9],eng:2,nr:.5,inl:'side',cz:.2,seats:2,col:0x8c969e,lerx:1}),
  'EA-18G':S(18.3,13.6,1.2,.9,4.6,1.6,28,.45,0,{tail:[6.7,2.3,.9,45,.86],fin:[3.0,2.2,1,35,2,.35,.9],eng:2,nr:.5,inl:'side',cz:.2,seats:2,col:0x6d777f,lerx:1}),
  'F-22':S(18.9,13.56,1.8,.9,7.5,1.5,42,.45,.2,{tail:[8.8,3,1,42,.9],fin:[2.6,2.8,1,22,2,.48,1.5],eng:2,nr:.6,inl:'side',cz:.2,col:0x7f8a90,flatNoz:1}),
  'F-35A':S(15.7,10.7,1.6,1.0,5.6,1.6,34,.45,.25,{tail:[6.8,2.4,.9,34,.88],fin:[2.2,2.3,1,34,2,.4,1.0],eng:1,nr:.6,inl:'side',cz:.2,col:0x6f7980}),
  'A-10C':S(16.26,17.53,.8,.9,3.0,1.5,0,.42,-.4,{tail:[5.6,1.8,1.4,0,.9,.3],fin:[2.4,1.6,1.2,5,2,0,2.8],eng:2,nr:.45,inl:'pod',cz:.12,col:0x7a8084}),
  'F-2A':F16({L:15.52,b:11.13,wr:5.2,wt:1.4,sw:33,col:0x3d5a7a}),
  'EF-2000':S(15.96,10.95,1.0,.9,6.5,1.0,53,.5,-.1,{tail:0,fin:[3.2,3.2,1,48,1],can:[3.6,1.0,45,.2,.2],eng:2,nr:.45,inl:'chin',cz:.17,col:0x8a949b}),
  'Rafale':S(15.27,10.9,1.0,.9,6.5,1.0,48,.5,-.05,{tail:0,fin:[3.1,3.2,1,48,1],can:[3.0,1.2,45,.3,.3],eng:2,nr:.42,inl:'side',cz:.17,col:0x5f6870}),
  'Mirage 2000-5':S(14.36,9.13,.95,.9,7,.6,58,.42,-.1,{tail:0,fin:[3.0,3.6,1,55,1],eng:1,nr:.5,inl:'side',cz:.2,col:0x7c8790}),
  'JAS-39C':S(14.1,8.4,.9,.85,5.5,.9,45,.5,0,{tail:0,fin:[2.6,2.6,.9,45,1],can:[2.6,1.1,43,.32,.3],eng:1,nr:.45,inl:'side',cz:.18,col:0x7d868c}),
  'JAS-39E':S(15.2,8.6,.95,.88,5.7,.9,45,.5,0,{tail:0,fin:[2.6,2.6,.9,45,1],can:[2.7,1.1,43,.32,.3],eng:1,nr:.48,inl:'side',cz:.18,col:0x6f797f}),
  'KF-21':S(16.9,11.2,1.5,.95,5.8,1.5,40,.45,.2,{tail:[7.0,2.4,.9,40,.88],fin:[2.6,2.6,1,38,2,.4,1.1],eng:2,nr:.5,inl:'side',cz:.18,col:0x6a747c}),
  // ----- modern RED -----
  'MiG-35':FUL({col:0x8ea2ae}),
  'Su-30MKI':FLK({can:[6.4,1,50,.25,.4],seats:2,col:0x5c6872}),
  'Su-30MKM':FLK({can:[6.4,1,50,.25,.4],seats:2,col:0x7a8a70}),
  'Su-34':FLK({L:23.3,W:1.8,H:1.1,can:[6.4,1,50,.22,.4],seats:2,wide:1,col:0x7e93a6}),
  'Su-57':S(20.1,14.1,2.0,.9,8,1.4,48,.45,.2,{tail:[10,3.2,1,45,.88],fin:[2.6,3,1,40,2,.45,1.6],eng:2,nr:.6,inl:'belly',cz:.17,col:0x6b7b88}),
  'J-10C':S(16.9,9.75,1.0,.95,6.5,.8,55,.48,0,{tail:0,fin:[3.4,3.4,1.1,50,1],can:[5.4,1.3,50,.3,.4],eng:1,nr:.55,inl:'chin',cz:.18,col:0x9aa4ac}),
  'J-16':FLK({seats:2,col:0x8a96a0}),
  'J-15T':FLK({L:21.9,can:[6.4,1,50,.25,.4],col:0x7d8890}),
  'J-20':S(20.4,13.0,1.8,.9,8,1,48,.5,.1,{tail:0,fin:[2.6,2.8,1,48,2,.4,1.6],can:[6.0,1.6,48,.3,.4],eng:2,nr:.6,inl:'side',cz:.17,col:0x4a5560}),
  'JF-17':S(14.93,9.45,1.0,.9,4.6,1.2,38,.48,0,{tail:[5.6,2,.8,45,.88],fin:[3.0,2.6,1,45,1],eng:1,nr:.5,inl:'side',cz:.2,col:0x8a949a}),
  'Yak-130':S(11.49,9.84,.8,.9,2.8,1.2,31,.5,.1,{tail:[4.8,1.6,.8,35,.88],fin:[2.4,2.2,1,40,1],eng:2,nr:.3,inl:'side',cz:.22,seats:2,col:0xd8dcd8}),
  // ----- Cold War BLUE -----
  'F-4J':S(17.76,11.7,1.3,.95,5.4,2.0,51,.48,-.1,{tail:[5.4,2.0,1,40,.9,.6,0,-.4],fin:[3.0,3.5,1,55,1],eng:2,nr:.5,inl:'side',cz:.2,seats:2,col:0xb5b9b3,probe:1}),
  'F-4B':S(17.76,11.7,1.3,.95,5.4,2.0,51,.48,-.1,{tail:[5.4,2.0,1,40,.9,.6,0,-.4],fin:[3.0,3.5,1,55,1],eng:2,nr:.5,inl:'side',cz:.2,seats:2,col:0xbdc0ba,probe:1}),
  'F-101B':S(20.55,12.09,1.1,1.0,4.5,1.6,36,.45,-.1,{tail:[6.0,1.8,1,40,.9,0,1],fin:[3.5,3.4,1.4,50,1],eng:2,nr:.5,inl:'side',cz:.15,seats:2,col:0xb7bcbc}),
  'F-102A':S(20.84,11.62,1.1,1.0,9,.5,60,.4,-.1,{tail:0,fin:[4.0,4,1,60,1],eng:1,nr:.55,inl:'side',cz:.17,col:0xb0b4b4}),
  'F-105D':S(19.63,10.65,1.1,1.1,4.8,1.5,45,.45,0,{tail:[5.4,2,.8,45,.9],fin:[3.4,3.2,1.2,50,1],eng:1,nr:.55,inl:'side',cz:.15,col:0x8d8f6a}),
  'F-104G':S(16.66,6.36,.8,.8,2.9,1.6,20,.5,-.1,{dih:-.17,tail:[3.6,1.5,.9,30,.88,0,1],fin:[2.6,2.8,1.4,40,1],eng:1,nr:.5,inl:'side',cz:.17,col:0x9aa0a0}),
  'F-5A':S(14.38,7.7,.8,.75,3.6,1.0,32,.48,-.2,{tail:[4.3,1.4,.6,35,.88],fin:[2.4,2.4,1,45,1],eng:2,nr:.3,inl:'side',cz:.2,col:0xbac0bd}),
  'A-6E':S(16.69,16.15,1.4,1.1,4.0,1.4,25,.42,.1,{tail:[6.2,2,1,30,.9],fin:[3.2,3,1.4,40,1],eng:2,nr:.4,inl:'side',cz:.12,seats:2,wide:1,col:0xbcbfb8,probe:1}),
  'A-37B':S(8.62,10.93,.8,.8,2.2,1.2,0,.45,-.2,{tail:[4.2,1.2,.8,10,.88],fin:[2.0,1.6,.8,35,1],eng:2,nr:.25,inl:'side',cz:.2,seats:2,wide:1,col:0x6f7a5c}),
  'Hunter F.6':S(13.98,10.26,.8,.9,4.5,1.6,40,.45,0,{tail:[5.0,1.6,.8,40,.86,.9],fin:[2.6,2.4,1.1,45,1],eng:1,nr:.4,inl:'side',cz:.25,col:0x6e7a66}),
  'Harrier GR.3':HAR({col:0x6a7560}),
  'Sea Harrier FRS.1':HAR({L:14.17,col:0x5f6b77}),
  'Buccaneer S.2B':S(19.33,13.41,1.1,1.0,4,2,40,.45,-.1,{tail:[4.3,1.8,1,40,.9,0,1],fin:[3.0,3.2,1.6,50,1],eng:2,nr:.4,inl:'side',cz:.15,seats:2,col:0x5c6a62}),
  'JA 37':S(16.4,10.6,1.0,.95,6.5,1,50,.55,0,{tail:0,fin:[3.2,3.5,1,50,1],can:[5.4,2.0,45,.33,.3],eng:1,nr:.55,inl:'side',cz:.17,col:0x6b7a5f}),
  'Mirage 5':S(15.55,8.22,.9,.9,7.3,.5,60,.42,-.1,{tail:0,fin:[3.0,3.4,1,55,1],eng:1,nr:.5,inl:'side',cz:.22,col:0x8f8a70}),
  'Kfir C2':S(15.65,8.22,.9,.9,7.3,.5,60,.42,-.1,{tail:0,fin:[3.0,3.4,1,55,1],can:[3.8,.8,50,.4,.4],eng:1,nr:.5,inl:'side',cz:.22,col:0x9a8a68}),
  // ----- Cold War RED -----
  'MiG-17F':S(11.26,9.63,.75,.8,3.0,1.2,45,.42,0,{tail:[3.2,1.3,.7,45,.9,.9],fin:[2.3,2.6,1,55,1],eng:1,nr:.35,inl:'nose',cz:.3,col:0xb8bdbd}),
  'MiG-21MF':S(14.7,7.15,.75,.85,5.8,.5,57,.45,0,{tail:[3.7,1.4,.5,55,.88],fin:[2.6,2.8,1,60,1],eng:1,nr:.42,inl:'nose',cz:.3,col:0xa9b0b0}),
  'Su-7BMK':S(16.8,9.31,.85,.9,4.6,1.4,60,.45,0,{tail:[4.6,1.8,.8,55,.9],fin:[2.8,3,1,60,1],eng:1,nr:.5,inl:'nose',cz:.33,col:0x9aa09d}),
  'Su-15TM':S(19.56,9.34,1.0,.9,6.2,1.4,60,.45,0,{tail:[5.8,2,.8,55,.9],fin:[3.2,3.4,1,60,1],eng:2,nr:.45,inl:'side',cz:.3,col:0xb0b6b6}),
  'Tu-128':S(30.06,17.53,1.4,1.3,7.5,2.5,55,.48,0,{tail:[8.5,3.2,1.2,50,.9],fin:[4.4,5,2,55,1],eng:2,nr:.6,inl:'side',cz:.17,seats:2,col:0xbfc4c4}),
  'Yak-28P':S(21.6,12.5,.9,.9,4.5,1.6,45,.45,.6,{tail:[5.8,2,1,45,.9,.9],fin:[3.4,3.2,1.4,50,1],eng:2,nr:.45,inl:'pod',podX:.24,cz:.2,seats:2,col:0xb5bab8}),
  'J-6':S(12.6,9.0,.8,.85,3.6,1.2,55,.45,0,{tail:[4.6,1.5,.6,55,.9],fin:[2.6,2.8,1,55,1],eng:2,nr:.35,inl:'nose',cz:.3,col:0xb6bbbb}),
  'Q-5':S(15.65,9.68,.85,.9,3.8,1.2,52,.45,0,{tail:[4.8,1.6,.6,55,.9],fin:[2.8,2.8,1,55,1],eng:2,nr:.35,inl:'side',cz:.25,col:0x9aa38a}),
  // ----- more modern -----
  'F-16V':F16({col:0x7d878e}),'F-16E':F16({cft:1,col:0xa69a7c}),'F-16I':F16({cft:1,seats:2,col:0x8f8565}),
  'F-15I':S(19.43,13.05,1.5,.9,6.0,1.7,45,.45,.35,{tail:[8.6,2.6,1,50,.86],fin:[3.0,2.6,1,40,2,.03,1.4],eng:2,nr:.55,inl:'side',cz:.2,seats:2,col:0x8a7a5e}),
  'Mirage 2000D':S(14.55,9.13,.95,.9,7,.6,58,.42,-.1,{tail:0,fin:[3.0,3.6,1,55,1],eng:1,nr:.5,inl:'side',cz:.2,seats:2,col:0x6a7477}),
  'Sea Harrier FA2':HAR({L:14.17,col:0x6f7880}),'Harrier GR.9':HAR({L:14.36,b:9.25,wr:4,col:0x6a7480}),
  'Tejas Mk1A':S(13.2,8.2,.95,.85,7,.5,58,.42,0,{tail:0,fin:[3.1,3.2,1,50,1],eng:1,nr:.45,inl:'side',cz:.2,col:0x9aa4aa}),
  'FA-50':S(13.14,9.45,.9,.85,3.7,1.1,33,.5,0,{tail:[5.1,1.8,.7,40,.88],fin:[2.6,2.4,1,45,1],eng:1,nr:.45,inl:'side',cz:.2,seats:2,col:0x8e979c}),
  'M-346FA':S(11.49,9.72,.8,.9,2.8,1.2,31,.5,.1,{tail:[4.8,1.6,.8,35,.88],fin:[2.4,2.2,1,40,1],eng:2,nr:.3,inl:'side',cz:.22,seats:2,col:0x87918c}),
  'F-CK-1':S(14.21,9.46,1.1,.85,4.4,1.1,40,.47,0,{tail:[5.6,1.9,.7,40,.88],fin:[2.8,2.5,1,45,1],eng:2,nr:.35,inl:'side',cz:.2,col:0x8c969c}),
  'Kfir Block 60':S(15.65,8.22,.9,.9,7.3,.5,60,.42,-.1,{tail:0,fin:[3.0,3.4,1,55,1],can:[3.8,.8,50,.4,.4],eng:1,nr:.5,inl:'side',cz:.22,col:0x7d8790}),
  'MiG-29K':FUL({b:11.99,col:0x6f8291,probe:1}),
  'MiG-31BM':S(22.69,13.46,1.7,1.0,6.2,1.8,41,.5,.6,{tail:[8.8,3,1.2,45,.9],fin:[3.6,3.4,1.4,50,2,.1,1.5],eng:2,nr:.65,inl:'side',cz:.17,seats:2,col:0xa9b0b4}),
  'Su-25SM3':S(15.53,14.36,.9,1.0,3.4,1.6,20,.45,.4,{tail:[4.6,1.8,1,35,.9,1.4],fin:[3.0,2.8,1.4,40,1],eng:2,nr:.45,inl:'side',cz:.2,col:0x7a8a8e}),
  'Su-25T':S(15.53,14.36,.9,1.0,3.4,1.6,20,.45,.4,{tail:[4.6,1.8,1,35,.9,1.4],fin:[3.0,2.8,1.4,40,1],eng:2,nr:.45,inl:'side',cz:.2,col:0x8a8a6a}),
  'J-11B':FLK({col:0x9aa7b2}),
  'J-35':S(17.3,11.5,1.6,.9,6,1.5,40,.45,.2,{tail:[7.0,2.5,.9,40,.88],fin:[2.6,2.6,1,38,2,.45,1.2],eng:2,nr:.5,inl:'side',cz:.18,col:0x5f6a74}),
  'JH-7A':S(22.33,12.8,1.2,1.1,5,1.6,45,.45,.6,{tail:[7,2.4,1,45,.9,0,0,-.1],fin:[3.6,3.6,1.4,50,1],eng:2,nr:.5,inl:'side',cz:.17,seats:2,col:0x8a9480}),
  'J-7G':S(14.9,8.32,.75,.85,5.9,.5,57,.45,0,{tail:[3.7,1.4,.5,55,.88],fin:[2.6,2.8,1,60,1],eng:1,nr:.42,inl:'nose',cz:.3,col:0x9fa8ad}),
};
const shade=(c,f)=>{const r=Math.min(255,((c>>16)&255)*f),g=Math.min(255,((c>>8)&255)*f),b=Math.min(255,(c&255)*f);return (r<<16)|(g<<8)|b;};

function build(s){
  const L=s.L,hl=L/2,W=s.W,H=s.H,b2=s.b/2,x0=W*.8,wingY=(s.wy||0)*H,cft=s.cft?1.25:1,wide=s.wide?1.35:1;
  const zN=-hl,zW=-hl+s.wz*L,zT=hl,Wt=s.eng>1?W*.92:Math.max(s.nr+.1,W*.62);
  const nose=s.inl==='nose';
  const body=[[zN,nose?W*.55:.02,0,nose?H*.55:.02,2],[zN+.06*L,W*.5*wide,0,H*.5,2.1],[zN+.15*L,W*.78*wide,.05,H*.78,2.3],[zN+.3*L,W*wide,0,H,2.6],
    [zN+.55*L,W*cft,0,H*.95*cft,2.8],[zN+.82*L,Wt,0,H*.72,2.6],[zT-.02*L,Wt*.95,0,H*.62,2.4]];
  const radome=nose?null:[[zN,.02,0,.02,2],[zN+.06*L,W*.5*wide,0,H*.5,2.1],[zN+.1*L,W*.66*wide,.02,H*.66,2.2]];
  const p={c:s.col||G.c,dk:shade(s.col||G.c,.75),lt:shade(s.col||G.c,1.15),rad:shade(s.col||G.c,.55),body,radome,noseOpen:nose,
    wy:()=>wingY-.1,tipX:b2*.96};
  // wing (left half drawn as +x, mirrored)
  const wLE=x=>zW+(x-x0)*T(s.sw*D),wCh=x=>s.wr+(s.wt-s.wr)*(x-x0)/(b2-x0);
  if(!s.swing)p.wing={pts:[[x0,zW],[b2,wLE(b2)],[b2,wLE(b2)+s.wt],[x0,zW+s.wr]],y:wingY,th:Math.max(.08,s.wr*.03),dih:s.dih||0,nav:[b2-.05,wLE(b2)+s.wt*.5]};
  else{const k=L/18.7,sw=s.swing;p.swing={base:sw.base,piv:[sw.piv[0]*W/1.2,wingY,sw.piv[2]*k],pts:sw.pts.map(([x,z])=>[x*b2/4.3/1.6,z]),th:sw.th,nav:[sw.nav[0]*b2/4.3/1.6,sw.nav[1]]};
    p.glove={pts:[[x0,zW-1],[W+1.2,zW+.8],[W+1.2,zW+3.4],[x0,zW+3.4]],y:wingY,th:.16};}
  if(s.lerx)p.glove={pts:[[x0*.6,zN+.22*L],[x0+.5,zW+.6],[x0,zW+1.5]],y:wingY+.05,th:.1};
  // tailplane
  if(s.tail){const [ts,rc,tc,sw,zf,ty=.1,TT,tdih]=s.tail,tb=ts/2,z1=zN+zf*L-rc*.6,tx0=Wt*.8,y=TT?H*.6+(s.fin?s.fin[0]:2.5)*.95:ty*H;
    p.tail={pts:[[tx0,z1],[tb,z1+(tb-tx0)*T(sw*D)],[tb,z1+(tb-tx0)*T(sw*D)+tc],[tx0,z1+rc]],y,th:.07,dih:tdih||0};}
  // canards
  if(s.can){const [cs,crc,csw,czf,cy=.3]=s.can,cb=cs/2,z1=zN+czf*L,cx0=W*.85;
    p.canard={pts:[[cx0,z1],[cb,z1+(cb-cx0)*T(csw*D)],[cb,z1+(cb-cx0)*T(csw*D)+crc*.35],[cx0,z1+crc]],y:cy*H,th:.06};}
  // fins
  if(s.fin){const [h,rc,tc,sw,n=1,cant=0,fx=0]=s.fin,zf=zT-rc-.25-(s.L>20?.4:0),y0=H*.55;
    p.fins=[{pts:[[zf,y0],[zf+h*T(sw*D),y0+h],[zf+h*T(sw*D)+tc,y0+h],[zf+rc,y0]],th:.1,x:n>1?fx:0,cant:n>1?cant:0}];}
  // engines / nozzles
  const nz=s.flatNoz?.55:.85;
  if(s.inl==='pod'){const px=s.podX?b2*s.podX*2:W+.55,py=s.podX?wingY-.5:H*.75,pz=s.podX?zW+s.wr*.2:hl*.35,pl=s.podX?5:3.6;
    p.extra=(g,M)=>{for(const sd of[-1,1]){const m=new THREE.Mesh(loftG([[pz-pl/2,s.nr+.12,0,s.nr+.12,2],[pz,s.nr+.18,0,s.nr+.18,2],[pz+pl/2,s.nr+.05,0,s.nr+.05,2]]),M.mat);m.position.set(sd*px,py,0);g.add(m);}};
    p.nozzles=[-1,1].map(sd=>[sd*px,py,pz+pl/2+.25,s.nr*1.05,s.nr*.95,.5]);}
  else p.nozzles=s.eng>1?[-1,1].map(sd=>[sd*(Wt*.55),0,zT+.25,s.nr*1.05,s.nr*nz,.75]):[[0,0,zT+.25,s.nr*1.05,s.nr*nz,.8]];
  p.ab=s.noAB?0:1;
  // intakes
  const iz=zN+.3*L;
  if(s.inl==='side')p.intakes=[{x:W+.18,y:-.05*H,z:iz,w:.26,h:H*.55,duct:[[iz,.28,0,H*.5,3],[iz+2.5,.3,0,H*.48,3],[zW+s.wr*.6,.18,0,H*.3,3]]}];
  else if(s.inl==='chin')p.intakes=[{one:1,x:0,y:-H-.28,z:zN+.33*L,w:W*.6,h:.38,round:false,duct:[[zN+.33*L,W*.6,-H-.25,.36,3],[zW+1,W*.5,-H-.1,.3,3],[zW+s.wr*.6,W*.3,-H*.6,.2,3]]}];
  else if(s.inl==='belly')p.intakes=[{x:W*.62,y:-H-.32,z:zW-.4,w:.5,h:.42,round:false,duct:[[zW-.4,.5,-H-.3,.42,3],[zW+2.5,.55,-H-.2,.42,3],[zT-1.5,.5,-H*.5,.3,3]]}];
  else if(s.inl==='nose')p.noseInt={r:W*.52,sx:1,sy:H/W,z:zN,cone:W*.3,coneL:1.2};
  // canopy
  const cz=zN+(s.cz||.2)*L,sz=s.seats>1?(s.wide?1.2:2.3):1.25;
  p.canopy=[[W*.55*wide,H*.62,sz,H*.72,cz+sz*.6,0x5a7488]];
  if(s.probe)p.probe=[zN+.25*L,zN-.2,H*.7];
  return p;}
function loftG(st){const pos=[],idx=[],n=st.length,seg=20;st.forEach(([z,w,yc,h,pw=2])=>{for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,c=Math.cos(a),sn=Math.sin(a);
  pos.push(Math.sign(c)*Math.pow(Math.abs(c),2/pw)*w,yc+Math.sign(sn)*Math.pow(Math.abs(sn),2/pw)*h,z);}});
  for(let k=0;k<n-1;k++)for(let i=0;i<seg;i++){const a=k*seg+i,b=k*seg+(i+1)%seg,c=a+seg,d=b+seg;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}

// put the parent's stations onto the new airframe: same order out from the centreline, scaled to the new span / length
function restation(s,st){const L=s.L,b2=s.b/2,W=s.W,H=s.H,x0=W*.8,zW=-L/2+s.wz*L,wingY=(s.wy||0)*H;
  const xs=Object.values(st).map(v=>Math.abs(v[0])),mx=Math.max(.5,...xs),k=(b2*.92)/mx,zs=Object.values(st).map(v=>v[2]),zr=Math.max(1,...zs.map(Math.abs));
  const o={};for(const [key,[x,y,z]] of Object.entries(st)){let X=x*k;
    if(Math.abs(X)<W*1.05||Math.abs(x)<.6){o[key]=[Math.sign(x)*Math.min(Math.abs(X),W*.7),-s.H-.2,z*L/18*1.0];continue;}
    const ax=Math.min(Math.abs(X),b2),zle=zW+(ax-x0)*Math.tan(s.sw*D),ch=s.wr+(s.wt-s.wr)*(ax-x0)/Math.max(.1,b2-x0);
    o[key]=[Math.sign(X)*ax,(ax>=b2*.96?wingY:wingY-.3),zle+ch*.35+(z-(st[key][2]))];}
  return o;}

let n=0;
for(const [id,s] of Object.entries(SPEC)){const A=AC[id];if(!A)continue;try{
  const st=restation(s,A.st),p=build(s);p.st=st;
  // drop pylons that can carry nothing in either era (inherited from the parent airframe) so the loadout screen only shows real stations
  try{const T=STN[id]||{};for(const k of Object.keys(st))if(!(T[k]&&T[k].length))delete st[k];}catch(e){}
  const prm=Object.assign({},p);A.model=()=>mkJet(prm);A.st=st;A.vst=undefined;A.mdl=id;
  // eye point follows the new canopy
  A.eye=[s.L/2-(s.cz||.2)*s.L-.2,s.H*.95];
  try{FV[id]=fvMake({hw:s.b/2,y1:s.H*.55+(s.fin?s.fin[0]:2),span:s.b.toFixed(2)+' m',fus:[s.W,s.H,0],wing:[(s.wy||0)*s.H,(s.wy||0)*s.H+(s.dih||0)*s.b/2,s.W*.8],
    tail:s.tail?[s.tail[0]/2,s.tail[5]?s.tail[5]*s.H:.1,.2]:undefined,eng:s.eng>1?[[s.W*.55,0,s.nr]]:[[0,0,s.nr]],engSy:2,can:[s.H*.72,s.W*.55,s.H*.55],
    fins:s.fin?(s.fin[4]>1?[[s.fin[6],s.H*.55,s.H*.55+s.fin[0],s.fin[5]]]:[[0,s.H*.55,s.H*.55+s.fin[0]]]):[]});}catch(e){}
  n++;}catch(e){console.warn('[models] '+id,e);}}
try{for(const k of Object.keys(GBB))if(SPEC[k])delete GBB[k];}catch(e){}
console.info('[models] built '+n+' airframes');
})();
