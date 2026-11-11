// docs/rwr_registry.txt -> js/rwrreg.js  (node scripts/gen-rwr-registry.js)
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
const L=fs.readFileSync(path.join(root,'docs/rwr_registry.txt'),'utf8').split('\n');const S=[];let cur=null;
for(const l of L){let m=l.match(/^\[(\d+)\.\s*(.+)\]\s*$/);if(m){cur={id:+m[1],title:m[2],params:[]};S.push(cur);continue;}
  m=l.match(/^([A-Za-z][A-Za-z0-9_]*)\s*\/\/\s*([A-Za-z0-9]+)(?::\s*(.*))?$/);if(m&&cur)cur.params.push([m[1],m[2],m[3]||'']);}
const n=S.reduce((a,s)=>a+s.params.length,0);
const out=`// Viper Sortie RWR realism registry v1.0.0 (generated from docs/rwr_registry.txt by scripts/gen-rwr-registry.js — edit the doc, then regenerate).
// ${S.length} sections, ${n} parameters.
window.RWR_REG=(function(){const sections=${JSON.stringify(S)};
const idx=new Map();for(const s of sections)for(const p of s.params)idx.set(p[0],p);
function enumOptions(n){const p=idx.get(n);if(!p||p[1]!=='Enum')return null;const m=(p[2]||'').match(/^\\s*([A-Za-z0-9_\\/ ,]+?)(?:\\s*\\(|\\s*$)/);return m?m[1].split(',').map(x=>x.trim()).filter(Boolean):null;}
function dflt(p){switch(p[1]){case'number':case'int':return 0;case'boolean':return false;case'string':return '';case'Enum':{const o=enumOptions(p[0]);return o&&o.length?o[0]:'';}case'Vec2':return[0,0];case'Vec3':return[0,0,0];default:return[];}}
return{sections,names:()=>[...idx.keys()],has:n=>idx.has(n),typeOf:n=>idx.has(n)?idx.get(n)[1]:null,enumOptions,
  create(){const o={};for(const [n,p] of idx)o[n]=dflt(p);return o;},
  validate(n,v){const t=this.typeOf(n);if(!t)return false;if(t==='number')return typeof v==='number'&&isFinite(v);if(t==='int')return Number.isInteger(v);if(t==='boolean')return typeof v==='boolean';if(t==='string')return typeof v==='string';
    if(t==='Enum'){const o=enumOptions(n);return typeof v==='string'&&(!o||o.includes(v));}return Array.isArray(v);}};})();
`;
fs.writeFileSync(path.join(root,'js/rwrreg.js'),out);console.log(S.length,'sections',n,'params');
