/* v330: IRST fit audit. A jet only has an IRST when the real aircraft carries one built in; the rest get it from a pod (the Legion / IRST21 on the F-15 and F-16 family,
   see sensorsuite.js) or have none.
   Taken off (no internal IRST on the real aircraft): F-16E Block 60 (Legion pod station instead), KF-21 Block I (IRST is a later block), Su-15TM, Tu-128, Yak-28P.
   Kept (per the user: F-101B, F-8E, F-14A, J-10C, J-15T; confirmed for the type): F-106A and F-102A (retrofit IRST sight), J 35F (infrared sight), the Su-27 / MiG-29 / MiG-31 / Su-30 / Su-35 / Su-57 families,
   Rafale (OSF), Typhoon (PIRATE), Gripen E, F-35 (EOTS), J-11 / J-16 / J-20 / J-35, F-14D. */
(function(){'use strict';
if(typeof AC==='undefined')return;
for(const k of ['F-16E','KF-21','Su-15TM','Tu-128','Yak-28P'])if(AC[k]&&AC[k].irst){AC[k].irst=false;delete AC[k].ols;}
})();
