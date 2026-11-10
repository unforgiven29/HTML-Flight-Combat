"use strict";
/* =====================================================================================================================
   Plane registry (v258). Loaded first; every js/planes/<jet>.js registers itself here, then game.js pulls the data in.
     PLANES.add(fam,{ids,tables,hooks})  called by each plane file at load
     PLANES.apply('AC',AC)               called by game.js right after it declares a keyed table: merges every plane's entries
     PLANES.run(fam,tag)                 called by game.js where an inline block used to be: runs that plane's hook in place
   ===================================================================================================================== */
window.PLANES=(function(){
  const fams=[],by={};
  const plain=o=>o&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype;
  const merge=(dst,src)=>{for(const k of Object.keys(src)){if(plain(src[k])&&plain(dst[k]))merge(dst[k],src[k]);else dst[k]=src[k];}return dst;};
  return{
    add(fam,def){if(by[fam])throw new Error('[planes] duplicate '+fam);by[fam]=def;fams.push(fam);},
    apply(name,target){for(const f of fams){const t=by[f].tables&&by[f].tables[name];if(t)merge(target,t());}return target;},
    run(fam,tag){const d=by[fam],h=d&&d.hooks&&d.hooks[tag];if(!h)throw new Error('[planes] missing hook '+fam+'/'+tag);return h.call(window);},
    list(){return fams.slice();},get(f){return by[f];}
  };
})();
