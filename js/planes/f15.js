"use strict";
/* =====================================================================================================================
   F-15C / F-15E Strike Eagle — everything that belongs to this jet family, split out of game.js (v258).
   Loaded BEFORE game.js (after js/planes/registry.js). Nothing here runs against game.js state at load time:
     * top-level declarations below are pure data (station layouts, store lists) or functions (model builder, cockpit/MFD code);
     * `tables` are thunks. game.js calls PLANES.apply('<TABLE>',<TABLE>) right after it declares each table, which merges
       these entries in at the same point the old inline literal used to be evaluated;
     * `hooks` are the one-off statements that used to sit inline in game.js (variants, cockpit builders, HUD/MFD patches).
       game.js calls PLANES.run('f15','<tag>') at the exact spot each one was cut from, so execution order is unchanged.
   Type ids in this file: F-15C, F-15E
   ===================================================================================================================== */
const F15ST={'2A':[-3.92,-.42,1.5],'2':[-3.62,-.92,1.1],'2B':[-3.32,-.42,1.5],3:[-1.48,-.82,-2.2],4:[-1.38,-.82,3.2],5:[0,-1.0,.6],
  6:[1.38,-.82,3.2],7:[1.48,-.82,-2.2],'8B':[3.32,-.42,1.5],8:[3.62,-.92,1.1],'8A':[3.92,-.42,1.5]};
function makeF15(){
  // F-15C Eagle: 19.4 m long, 13.05 m span, 45° wing, side intakes with hinged ramps, twin fins and close-set nozzles
  const grp=new THREE.Group(),mat=SKIN(0x7f8996),dk=SKIN(0x687280),blk=SKIN(0x1c1f22,10),rad=SKIN(0x8b939c,20),met=SKIN(0x5a5550,60);
  grp.add(new THREE.Mesh(sloft([[-9.72,.02,.16,.02,2],[-9.2,.24,.16,.24,2],[-8.2,.44,.18,.44,2.1],[-7.0,.58,.25,.57,2.2],[-5.6,.66,.32,.64,2.4],[-4.2,.72,.36,.69,2.6],
    [-2.5,.72,.42,.5,2.8],[0,.6,.5,.28,2.6],[3,.46,.52,.18,2.2],[6,.34,.48,.12,2],[8.2,.12,.42,.06,2]]),mat));
  grp.add(new THREE.Mesh(loft([[-9.74,.022,.16,.022,2],[-9.2,.245,.16,.245,2],[-8.2,.445,.18,.445,2.1],[-7.6,.52,.21,.51,2.15]],40,false,false),rad));
  rim(grp,.515,.024,dk,0,.21,-7.6,1,.98);
  // centre body carrying the intake trunks and engines
  grp.add(new THREE.Mesh(sloft([[-4.3,.78,-.05,.6,2.6],[-3.7,1.72,-.1,.66,5],[-1.2,1.88,-.08,.64,6],[2.8,1.8,-.05,.6,6],[6.2,1.5,-.02,.56,5],[8.5,1.22,0,.55,4]],36,false,true),mat));
  for(const sd of[-1,1]){intake(grp,sd*1.32,-.1,-3.75,.47,.57,mat,blk);
    pod(grp,1.4,.5,dk,sd*1.32,.52,-3.3,1.04,.1);// hinged variable ramp
    nozzle(grp,sd*.64,-.05,9.0,.55,.46,1.2,met,dk);
    const f=finShape([[5.2,.48],[7.8,3.35],[8.85,3.35],[9.35,.45]],.12,mat);f.position.set(sd*1.62,.05,0);grp.add(f);
    pod(grp,.9,.07,dk,sd*1.62,3.4,8.4);// fin-tip ECM / antenna pods
    const st=planform([[1.2,6.7],[4.3,8.9],[4.35,9.95],[1.2,10.1]],.09,false,mat);st.scale.x=sd;st.position.y=-.02;grp.add(st);}
  const wing=planform([[1.55,-2.1],[6.52,2.85],[6.52,4.35],[1.55,5.1]],.14,true,mat);wing.position.y=.05;grp.add(wing);
  // bubble canopy set high, dorsal speed brake
  canopy(grp,0x6a7880,.56,.62,2.0,.98,-5.3,dk);
  pod(grp,2.2,.5,dk,0,.62,-.4,1,.12);
  rod(grp,[0,.16,-9.6],[0,.16,-10.3],.022,met,1,[0,1,0],8);ball(grp,.035,met,0,.16,-10.3);
  navLight(0xff2a1a,-6.5,.06,3.6,grp);navLight(0x22ff55,6.5,.06,3.6,grp);
  const ab=new THREE.Group();[-.64,.64].forEach(x=>{const c=abPlume(5,.46);c.position.set(x,-.05,9.55);ab.add(c);});grp.add(ab);grp.userData.ab=ab;
  pylons(grp,F15ST,['2A','2B','8A','8B','3','4','5','6','7'],SKIN(0x76808c),x=>.0);
  return bake(grp,[ab]);}
const isEagle=()=>!!player&&player.ac.pit==='eagle';

PLANES.add('f15',{
 ids:["F-15C","F-15E"],
 tables:{
  AC:()=>({
    // F-15C: 2x F100-PW-220 (64.9 / 105.7 kN), 56.5 m² wing, no hard AoA limiter (CAS only), APG-63
      'F-15C':{name:'F-15C',model:makeF15,st:F15ST,empty:12700,fuel:6100,tank:1850,S:56.5,CLa:3.9,cd0:.021,k:.13,mil:129800,ab:211400,spool:1.5,
        clt:[[-20,-.95],[-10,-.55],[0,.02],[5,.33],[10,.66],[15,.96],[20,1.2],[25,1.38],[30,1.5],[35,1.53],[40,1.48],[50,1.3],[60,1.02],[90,0]],
        abM:[[0,1],[.5,1.195],[1,1.36],[1.5,1.495],[2,1.8738],[2.5,2.205],[3,2.4415]],cdm:[[0,0],[.8,0],[.9,.005],[1,.022],[1.1,.03],[1.3,.029],[1.6,.0222],[2,.0198],[2.5,.015],[3,.0122]],dW:20000,tkG:[6,7.33],dep:{a:33,rock:.8,spin:2.6},
        ff:[.3,3.2,14.6],gLim:9,aoaLim:30,roll:4.4,fbw:false,noLimiter:true,rcs:12,irs:1.3,cockpit:'viper',pit:'eagle',eye:[5.15,1.4],units:'imp',
        radar:{name:'APG-63',R0:52*NM,ranges:[10,20,40,80],unit:NM,ul:'NM',ecc:.6},irst:false,
        gun:{name:'M61A1',rate:100,v:1050,dmg:9,ammo:940,spread:.0022},rel:['2A','8A','2B','8B',3,7,4,6],keepJ:['2A','2B','8A','8B','3','4','6','7'],rwr:'15',spo:0,tankName:'610 gal tank'}
  }),
  ENG_SUP:()=>({
    'F-15C':.08,
    'F-15E Strike Eagle':0
  }),
  FOE:()=>({
    'F-15C':'Su-27'
  }),
  LOAD:()=>({
    cold:{
      'F-15C':{'2A':'AIM-9M','2B':'AIM-9M',3:'AIM-7M',4:'AIM-7M',5:'TK',6:'AIM-7M',7:'AIM-7M','8B':'AIM-9M','8A':'AIM-9M'}
    },
    modern:{
      'F-15C':{'2A':'AIM-9X','2B':'AIM-120C',3:'AIM-120C',4:'AIM-120C',5:'TK',6:'AIM-120C',7:'AIM-120C','8B':'AIM-120C','8A':'AIM-9X'}
    },
    guns:{
      'F-15C':{5:'TK'}
    }
  }),
  CMS:()=>({
    cold:{
      'F-15C':[30,60]
    },
    modern:{
      'F-15C':[60,60]
    }
  }),
  ECM_FIT:()=>({
    'F-15C':{cold:{n:'ALQ-135(V)',jp:2,dec:.7,kg:0,cd:0,warm:25},modern:{n:'ALQ-135(V)',jp:2.2,dec:.8,kg:0,cd:0,warm:25}}
  }),
  RWR_OF:()=>({
    'F-15C':'ALR-56C',
    'F-15E':'ALR-56C'
  }),
  NCTR_ID:()=>({
    'F-15C':'F-15'
  }),
  STN:()=>({
    'F-15C':{'2A':['AIM-9L','AIM-9M','AIM-9X','AIM-120C'],'2B':['AIM-9L','AIM-9M','AIM-9X','AIM-120C'],2:['TK'],3:['AIM-7F','AIM-7M','AIM-7P','AIM-120C'],4:['AIM-7F','AIM-7M','AIM-7P','AIM-120C'],5:['TK'],
               6:['AIM-7F','AIM-7M','AIM-7P','AIM-120C'],7:['AIM-7F','AIM-7M','AIM-7P','AIM-120C'],8:['TK'],'8B':['AIM-9L','AIM-9M','AIM-9X','AIM-120C'],'8A':['AIM-9L','AIM-9M','AIM-9X','AIM-120C']}
  }),
  ACROLE:()=>({
    'F-15C':'US · AIR SUPERIORITY'
  }),
  FV:()=>({
    'F-15C':{hw:6.9,y1:3.5,span:'13.05 m',d:()=>bth([[-1,.65],[-1.32,.65],[-2.25,3.4],[-2,3.4]],'sk-body')+bth([[-1.4,-.05],[-3.85,-.1],[-3.85,-.22],[-1.4,-.3]],'sk-wing')+bth([[-1.6,-.1],[-6.5,0],[-6.5,-.11],[-1.6,-.45]],'sk-wing')+ell(0,0,.95,.6,'sk-body')+bth([[-.35,.5],[-1.65,.5],[-1.65,-.72],[-.35,-.72]],'sk-body')+bth([[-.5,.36],[-1.5,.36],[-1.5,-.58],[-.5,-.58]],'sk-dark')+ell(0,.62,.42,.42,'sk-can')}
  }),
  CALLS:()=>({
    'F-15C':'EAGLE'
  }),
  FLAPSW:()=>({
    'F-15C':'eflap'
  }),
  STALL:()=>({
    'F-15C':{s:.45,twin:1}
  }),
  ENGN:()=>({
    'F-15C':'2× F100-PW-220',
    'F-15E':'2× F100-PW-229'
  }),
  CREW:()=>({
    'F-15E':'WSO'
  })
 },
 hooks:{
  /* game.js line 3892 */
  L3892(){
    {const _sp=radar.setPower.bind(radar);radar.setPower=function(p,force){if(SE.emisOn&&!force&&p==='ON'&&player&&player.type==='F-15E')return;return _sp(p);};}
  },
  /* game.js line 6543 */
  L6543(){
    {const _s=selectCockpit;selectCockpit=function(kind,pit){if(pit==='eagle'&&player&&player.type==='F-15E')pit='strike';return _s(kind,pit);};}
  },
  /* game.js line 10699 */
  L10699(){
    /* ============ v124: Link-16 situation display (SIT) ============
       After the F-15E SIT(P) / SIT(W) description (MPCD, colour: green friendlies / PPLI, cyan flight members with their number, red hostile hats,
       yellow unknown half-boxes, orange SAMs with threat rings, white ownship), the F-15C MSIP JTIDS MPCD format (NET / S NET / ID / H SAM down the left,
       RELN / COR / ROUTE / MENU down the right, MODE / SELF / EXP along the bottom, range top right, Zulu time top left) and the later F-15E format
       (DAT / SRV / TGT / SAM / SHP declutter on the left, RLN / LNE / RTE on the right, weapon inventory A4C M2M S2M G900P bottom left,
       countermeasures and master mode bottom right, bullseye bearing-range of ownship top right). Ownship sits low in the display (decentred, track up
       or north up) inside a small compass rose, the dashed outer ring is the selected range; the radar's scan limits are drawn from the ownship. */
    {
    DL_FIT.add('F-15E');
    const C={fr:'#46e070',fl:'#4fd8ff',hs:'#ff4a3a',un:'#ffd040',sam:'#ff9a30',own:'#f2f5f0',dim:'rgba(200,220,210,.55)',txt:'#e8f0e8',lg:'#46e070'};
    const SIT={dec:{DAT:1,SRV:1,TGT:1,SAM:1,SHP:1,LNE:0,RTE:0},ri:2,nu:0,
      rngs:[10,20,40,80,160],rng(){return this.rngs[this.ri]*1852;},
      wpnBlock(P){const n={},add=(k,c)=>n[k]=(n[k]||0)+c;for(const s of Object.values(P.load)){if(!MSL[s])continue;const m=s.match(/AIM-(\d+)([A-Z])/);if(!m)continue;
          const f=m[1]==='120'?'A':m[1]==='7'?'M':m[1]==='9'?'S':m[1]==='54'?'P':'X';add(f+'|'+m[2],1);}
        const out=Object.entries(n).map(([k,c])=>{const[f,v]=k.split('|');return f+c+v;});out.push('G'+P.gun.ammo+'P');return out;},
      draw(c,S,P,v){const E=v==='E',L=E?{1:'DAT',2:'SRV',3:'TGT',4:'SAM',5:'SHP'}:null;c.save();c.fillStyle='#010304';c.fillRect(0,0,S,S);
        const ox=180,oy=E?222:212,R=E?150:140,rng=this.rng(),k=R/rng,hd=this.nu?0:P.hdg*D2R;
        const xy=p=>{const dx=p.x-P.pos.x,dz=p.z-P.pos.z,b=Math.atan2(dx,-dz)-hd,d=Math.hypot(dx,dz);return[ox+Math.sin(b)*d*k,oy-Math.cos(b)*d*k,d];};
        c.beginPath();c.rect(22,26,S-44,S-56);c.clip();
        // outer dashed range ring, inner compass rose around the ownship
        c.strokeStyle=C.dim;c.lineWidth=1.4;c.setLineDash([7,6]);c.beginPath();c.arc(ox,oy,R,0,7);c.stroke();c.setLineDash([]);
        const rr=R*.42;c.font='700 12px "B612 Mono",monospace';c.textAlign='center';c.textBaseline='middle';
        for(let a=0;a<360;a+=10){const b=a*D2R-hd,big=a%30===0,s=Math.sin(b),co=-Math.cos(b);c.strokeStyle=C.dim;c.beginPath();c.moveTo(ox+s*rr,oy+co*rr);c.lineTo(ox+s*(rr-(big?8:4)),oy+co*(rr-(big?8:4)));c.stroke();
          if(big){c.fillStyle=a===0||a===90||a===180||a===270?C.txt:C.dim;c.fillText({0:'N',90:'E',180:'S',270:'W'}[a]||String(a/10),ox+s*(rr+11),oy+co*(rr+11));}}
        // radar scan limits
        if(radar.on&&radar.on()){const hw=Math.min((radar.azs?radar.azs[radar.ai]:60),65)*D2R,b0=(this.nu?P.hdg*D2R:0);c.strokeStyle='rgba(70,224,112,.65)';
          [-hw,hw].forEach(a=>{c.beginPath();c.moveTo(ox,oy);c.lineTo(ox+Math.sin(a+b0)*R*1.4,oy-Math.cos(a+b0)*R*1.4);c.stroke();});}
        // bullseye
        const bu=(typeof GCI!=='undefined'&&GCI.bull)||{x:0,z:0},bp=xy(new V3(bu.x,0,bu.z));c.strokeStyle=C.un;c.fillStyle=C.un;c.beginPath();c.arc(bp[0],bp[1],7,0,7);c.stroke();c.beginPath();c.arc(bp[0],bp[1],1.8,0,7);c.fill();
        // SAM sites and ground targets
        for(const u of GND.units){if(!u.alive||u.side===P.side)continue;const sam=u.T&&u.T.R0;if(sam?!this.dec.SAM:!this.dec.TGT)continue;if(u.nv!=null&&!this.dec.SHP)continue;
          const[x,y,d]=xy(u.pos);if(d>rng*1.6)continue;
          if(sam){c.strokeStyle=C.sam;c.beginPath();c.moveTo(x,y-9);c.lineTo(x+8,y+6);c.lineTo(x-8,y+6);c.closePath();c.stroke();c.setLineDash([3,4]);c.beginPath();c.arc(x,y,Math.max(6,u.T.R0*.35*k),0,7);c.stroke();c.setLineDash([]);
            if(this.dec.DAT){c.fillStyle=C.sam;c.font='700 10px "B612 Mono",monospace';c.fillText(String(u.type||'SAM').split(' ')[0].slice(0,6),x,y+16);}}
          else if(u===(window.V122&&V122.WSOAG.tg)||u===SNS.unit){c.strokeStyle=C.hs;c.strokeRect(x-6,y-6,12,12);c.beginPath();c.moveTo(x-6,y-6);c.lineTo(x+6,y+6);c.moveTo(x+6,y-6);c.lineTo(x-6,y+6);c.stroke();}
          else{c.fillStyle=C.hs;c.fillRect(x-2.5,y-2.5,5,5);}}
        if(SNS.spi&&AGW[game.wsel]){const[x,y]=xy(SNS.spi);c.strokeStyle=C.own;c.beginPath();c.moveTo(x,y-7);c.lineTo(x+7,y);c.lineTo(x,y+7);c.lineTo(x-7,y);c.closePath();c.stroke();}
        // air tracks: own radar, link (SRV declutter), flight, PPLI friendlies
        const lead=(x,y,vel)=>{if(!vel)return;const b=Math.atan2(vel.x,-vel.z)-hd,l=8+Math.min(18,vel.length()/25);c.beginPath();c.moveTo(x+Math.sin(b)*8,y-Math.cos(b)*8);c.lineTo(x+Math.sin(b)*(8+l),y-Math.cos(b)*(8+l));c.stroke();};
        const alt=(x,y,h,col)=>{if(!this.dec.DAT)return;c.fillStyle=col;c.font='700 10px "B612 Mono",monospace';c.fillText(String(Math.round(h*FT/1000)),x,y+15);};
        let nT=0;for(const t of DL.contacts()){if(t.src!=='OWN'&&!this.dec.SRV)continue;const[x,y,d]=xy(t.pos);if(d>rng*1.6)continue;nT++;
          const hostile=!!t.id||t.src==='GCI'||(rio&&rio.seen&&rio.seen.has&&rio.seen.has(t.j)),col=hostile?C.hs:C.un;c.strokeStyle=col;c.lineWidth=1.8;
          if(hostile){c.beginPath();c.moveTo(x-7,y+4);c.lineTo(x,y-7);c.lineTo(x+7,y+4);c.stroke();}else{c.beginPath();c.moveTo(x-7,y+5);c.lineTo(x-7,y-6);c.lineTo(x+7,y-6);c.lineTo(x+7,y+5);c.stroke();}
          if(t.src!=='OWN'){c.setLineDash([2,3]);c.strokeRect(x-10,y-10,20,20);c.setLineDash([]);}
          lead(x,y,t.vel);alt(x,y,t.pos.y,col);if(t.id&&this.dec.DAT){c.fillStyle=col;c.font='700 10px "B612 Mono",monospace';c.fillText(t.id,x,y-14);}
          if(radar.mode==='STT'&&radar.lock===t.j){c.strokeStyle=C.own;c.beginPath();c.moveTo(x,y-13);c.lineTo(x+13,y);c.lineTo(x,y+13);c.lineTo(x-13,y);c.closePath();c.stroke();}}
        const fl=DL.flight();for(const f of fl){const[x,y,d]=xy(f.j.pos);if(d>rng*1.6)continue;c.strokeStyle=C.fl;c.lineWidth=1.8;c.beginPath();c.arc(x,y,8,0,7);c.stroke();lead(x,y,f.j.vel);
          c.fillStyle=C.fl;c.font='700 11px "B612 Mono",monospace';c.fillText(f.n,x,y+.5);alt(x,y,f.j.pos.y,C.fl);}
        for(const j of jets){if(j===P||!j.alive||j.side!==P.side||fl.some(f=>f.j===j))continue;const[x,y,d]=xy(j.pos);if(d>rng*1.6)continue;c.strokeStyle=C.fr;c.lineWidth=1.6;
          c.beginPath();c.arc(x,y+2,7,Math.PI,0);c.stroke();lead(x,y,j.vel);alt(x,y,j.pos.y,C.fr);}
        // ownship
        c.strokeStyle=C.own;c.lineWidth=2;c.save();c.translate(ox,oy);if(this.nu)c.rotate(P.hdg*D2R);c.beginPath();c.moveTo(0,-10);c.lineTo(0,9);c.moveTo(-9,-1);c.lineTo(9,-1);c.moveTo(-4,7);c.lineTo(4,7);c.stroke();c.restore();
        c.restore();c.save();
        // data blocks
        const tx=(s,x,y,al,col=C.txt,f='700 13px "B612 Mono",monospace')=>{c.font=f;c.textAlign=al;c.textBaseline='middle';c.fillStyle=col;c.fillText(s,x,y);};
        const d=new Date(),z=[d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds()].map(v=>String(v).padStart(2,'0')).join(':')+'Z';
        const bb=Math.round((Math.atan2(P.pos.x-bu.x,-(P.pos.z-bu.z))*R2D+360)%360),br=Math.round(Math.hypot(P.pos.x-bu.x,P.pos.z-bu.z)/1852);
        if(E){tx(z,34,40,'left');tx('PQ 13',34,56,'left');tx(String(this.rngs[this.ri]),330,40,'right',C.txt,'700 18px "B612 Mono",monospace');tx(String(bb).padStart(3,'0')+'-'+String(br).padStart(3,'0'),330,58,'right');
          this.wpnBlock(P).forEach((s,i)=>tx(s,56,268+i*15,'left',C.txt,'700 12px "B612 Mono",monospace'));
          tx('C '+(P.chaff|0),296,268,'left',C.txt,'700 12px "B612 Mono",monospace');tx('F '+(P.flares|0),296,283,'left',C.txt,'700 12px "B612 Mono",monospace');
          tx(nT+' TRK',296,298,'left',C.txt,'700 12px "B612 Mono",monospace');tx(AGW[game.wsel]?'A/G':'A/A',296,314,'left',C.lg,'700 12px "B612 Mono",monospace');}
        else{tx(z,30,40,'left');tx(String(this.rngs[this.ri]),330,40,'right',C.txt,'700 16px "B612 Mono",monospace');tx(String(bb).padStart(3,'0')+'-'+String(br).padStart(3,'0'),330,56,'right',C.txt,'700 12px "B612 Mono",monospace');
          tx('M4',30,300,'left',C.txt,'700 12px "B612 Mono",monospace');tx('S3',30,314,'left',C.txt,'700 12px "B612 Mono",monospace');}
        c.restore();return{nT};}};
    window.SIT=SIT;
    // F-15E: SIT and JTIDS pages, own legends (the SIT is a colour page — it belongs on the MPCD)
    {const E=window.EMPD,_pg=E.page.bind(E),_lg=E.legends.bind(E),_pr=E.press.bind(E),vert=s=>s.split('').join('\n');
      E.page=function(c,D,P,sd){if(D.pg==='SIT'||D.pg==='JTIDS'){SIT.draw(c,360,P,'E');return;}return _pg(c,D,P,sd);};
      E.legends=function(sd){const D=this.d[sd];if(D.pg==='SIT'||D.pg==='JTIDS'){const L={11:'M'},dc=SIT.dec;['DAT','SRV','TGT','SAM','SHP'].forEach((k,i)=>L[i+1]=vert(k));
          L[15]=vert('RLN');L[14]=vert('LNE');L[13]=vert('RTE');L[16]=SIT.nu?'N-UP':'TRK';L[8]='RNG';L[7]='▼';L[9]='▲';return L;}return _lg(sd);};
      E.press=function(sd,n){const D=this.d[sd];if((D.pg==='SIT'||D.pg==='JTIDS')&&n!==11){sfx.click();const ks=['DAT','SRV','TGT','SAM','SHP'];
          if(n>=1&&n<=5)SIT.dec[ks[n-1]]^=1;else if(n===14)SIT.dec.LNE^=1;else if(n===13)SIT.dec.RTE^=1;else if(n===16)SIT.nu^=1;else if(n===9||n===8)SIT.ri=Math.min(4,SIT.ri+1);else if(n===7)SIT.ri=Math.max(0,SIT.ri-1);return;}
        return _pr(sd,n);};
      // boxed legends show which declutter classes are on
      const _fr=E.frame.bind(E);E.frame=function(c,sd){_fr(c,sd);const D=this.d[sd];if(D.pg!=='SIT'&&D.pg!=='JTIDS')return;c.strokeStyle='#8dff9e';c.lineWidth=1.2;
        ['DAT','SRV','TGT','SAM','SHP'].forEach((k,i)=>{if(!SIT.dec[k])return;const y=180+(i-2)*64,h=k.length*13+4;c.strokeRect(4,y-h/2,14,h);});};
      // standard placement: SIT on the MPCD
      const _rs=E.reset.bind(E);E.reset=function(){_rs();this.d.C={pg:'SIT',m:0,t:'SIT'};};}
    // F-15C: the MPCD HSD becomes the MSIP JTIDS situation format
    drawEagleHSD=function(c,S,P){SIT.ri=clamp(sys.dl.ri,0,4);SIT.nu=sys.dl.north?1:0;SIT.draw(c,S,P,'C');const G='#59ff9f';c.font=MFONT;
      [['NET',60],['S NET',120],['ID',180],['H SAM',240]].forEach(([t,y])=>osb(c,t,8,y,t==='H SAM'&&SIT.dec.SAM,'left'));
      [['RELN',180],['COR',220],['ROUTE',260],['MENU',300]].forEach(([t,y])=>osb(c,t,352,y,false,'right'));
      osb(c,sys.dl.north?'NORTH':'HDG',120,18,false);osb(c,'LINK',180,18,!!sys.dl.lk);osb(c,'▲',342,60,false,'right');osb(c,'▼',342,120,false,'right');
      osb(c,'EXP',300,344,false);eagleMPLabels(c);};
    }
  }
 }
});
