/* v312 — Shkval-V: built-in nose TV sight for the Ka-50, Su-25T and Su-25SM3.
   * It is a plain television channel: no thermal imager, no WHOT / BHOT polarity, so the picture follows daylight, cloud and rain
     (the pod video code already dims a TV picture at night). A laser ranger-designator rides with it: ЛАЗЕР (N) arms it and the
     Vikhr / Kh-25ML / laser bombs follow the spot, exactly as with a Litening on a Western jet.
   * Game-level figures (fields of view, ranges), not published data. */
(function(){
'use strict';
if(typeof SNS==='undefined'||!window.V121||!window.V121.PODS){console.warn('[shkval] game missing');return;}
const OWN=new Set(['Ka-50','Su-25T','Su-25SM3']);
window.V121.PODS.SHKVAL={nm:'SHKVAL-V',fovs:[3.5,1],fn:['ШИР','УЗК'],tv:1,tvOnly:1,res:192,lrf:10000,lockR:9000};
const has=P=>!!P&&OWN.has(P.type);
{const _k=SNS.podKind;SNS.podKind=function(P){return has(P)?'SHKVAL':_k.call(this,P);};}
{const _p=SNS.podPos;SNS.podPos=function(P){if(!has(P))return _p.call(this,P);
  return P.pos.clone().addScaledVector(P.fwd(new V3()),P.type==='Ka-50'?3.2:4).addScaledVector(P.up(new V3()),P.type==='Ka-50'?-.9:-.8);};}
// TV only: the polarity cycle has nothing to offer
{const _v=SNS.vmodeFor;SNS.vmodeFor=function(pod){const p=pod&&this.podSpec();return p&&p.tvOnly?'TV':_v.call(this,pod);};}
{const _s=SNS.sensKey;SNS.sensKey=function(){if(this.wk()!=='agm'){const p=this.podSpec();if(p&&p.tvOnly){flash('SHKVAL · TV ONLY · NO THERMAL',1100);return;}}return _s.call(this);};}
})();
