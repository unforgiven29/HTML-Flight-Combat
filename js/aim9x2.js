/* v325: AIM-9X Block II and lock-on-after-launch (LOAL).
   Block II: the Block I seeker and airframe with a better head (range, tracking rate) and a wider LOAL search cone; the real round's datalink is not modelled. Figures are gameplay estimates.
   LOAL: a missile with d.loal can be fired without a seeker lock; the head is uncaged at the end of the motor-stabilisation delay and takes the nearest hot target in its search cone. */
(function(){'use strict';
const M=window.MJ;if(!M||typeof MSL==='undefined'){console.warn('[aim9x2] helpers missing');return;}
const D=D2R;
M.aam('AIM-9X-II','AIM-9X',{mass:86,acc:175,irR:18000,aiR:16000,trk:1.8,ccm:.9,maxG:60},null,.127,'9X2','Sidewinder · AIM-9X Block II · imaging IR, LOAL');
// which rounds can be launched before the seeker has a lock (search cone in radians around the velocity vector)
const LOAL={'AIM-9X-II':55,'AIM-9X':60,'IRIS-T':60,'ASRAAM':50,'Python 5':55,'AAM-5':40,'R-74M2':40,'MICA IR':40,'PL-10':45};
for(const k of Object.keys(LOAL))if(MSL[k]){MSL[k].loal=true;MSL[k].search=LOAL[k]*D;}
// the Block II goes wherever the Block I hangs
// modern active-radar rounds with a datalink: fire with no lock and they are flown at a track / search after launch
const DLK=/^(AIM-120|Meteor|PL-1[25]|R-77|MICA[ -]?EM|Derby|I-Derby|Astra|AIM-260|SD-10|AAM-4|Sky ?Sword|TK-?[12])/;
for(const k of Object.keys(MSL))if(MSL[k].seek==='ARH'&&DLK.test(k)){MSL[k].dlk=true;if(!MSL[k].search)MSL[k].search=45*D;}
if(typeof STN!=='undefined')for(const id of Object.keys(STN))for(const k of Object.keys(STN[id])){const l=STN[id][k];if(Array.isArray(l)&&l.includes('AIM-9X')&&!l.includes('AIM-9X-II'))l.push('AIM-9X-II');}
console.log('[aim9x2] AIM-9X Block II + LOAL ready');
})();
