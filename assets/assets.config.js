/* =====================================================================
   Viper Sortie — custom asset config
   ---------------------------------------------------------------------
   Drop files into assets/models/ and assets/audio/, then point to them
   here. Anything left as null keeps the built-in procedural model /
   synthesized sound, so you can replace things one at a time.
   ===================================================================== */
window.ASSET_CONFIG = {

  /* ---------- 3D MODELS (.glb / .gltf) ----------
     Model orientation the game expects (adjust with rot/offset if yours differs):
       • units  = metres
       • +Y     = up
       • -Z     = nose (forward)
     Fields:
       src            path to .glb / .gltf (null = keep procedural jet)
       scale          uniform scale (or [x,y,z])
       rot            [x,y,z] rotation in DEGREES applied to the model
       offset         [x,y,z] position offset in metres
       hideProcedural hide the built-in airframe (default true). Afterburner
                      plumes, landing gear, rails and hung stores stay procedural.
       hideCanopy     hide the procedural canopy bubble (default true)
       keepParts      extra userData parts to keep visible, e.g. ['wings']
                      for the F-14 / MiG-23 swing wings
  */
  models: {
    'F-16':   { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'F-15C':  { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'F-15E':  { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'F-18C':  { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'F-18E':  { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'F-14A':  { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'F-4E':   { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'MiG-21': { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'MiG-23': { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'MiG-25': { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'MiG-29': { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'Su-27':  { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'F-16C':  { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'F-14B':  { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'MiG-29S':{ src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'Su-27SM':{ src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'Su-30SM':{ src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    'Su-33':  { src: null, scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },
    // example:
    // 'F-16': { src: 'assets/models/f16.glb', scale: 1, rot: [0, 180, 0], offset: [0, 0, 0] },
  },

  /* ---------- AUDIO (.ogg / .mp3 / .wav) ----------
     null = keep the synthesized sound.
       loop sounds: engine, afterburner, gun, irGrowl, irLock, windRush
       one-shots:   everything else
     vol is a per-sound multiplier (1 = default). Master/engine/tone
     sliders in the in-game settings still apply on top.
  */
  audio: {
    engine:        { src: null, vol: 1,  pitchMin: 0.6, pitchMax: 1.4 }, // loop, pitch follows RPM
    afterburner:   { src: null, vol: 1 },   // loop, fades in with AB
    gun:           { src: null, vol: 1 },   // loop while trigger held
    irGrowl:       { src: null, vol: 1 },   // loop, IR seeker searching tone
    irLock:        { src: null, vol: 1 },   // loop, IR seeker locked tone
    rwrNew:        { src: null, vol: 1 },   // RWR new contact
    rwrLock:       { src: null, vol: 1 },   // RWR spike / lock
    rwrLaunch:     { src: null, vol: 1 },   // RWR missile launch
    missileLaunch: { src: null, vol: 1 },   // player missile off the rail
    explosion:     { src: null, vol: 1, maxDist: 12000 }, // positional falloff
    click:         { src: null, vol: 1 },   // UI / cockpit switch click
    thunder:       { src: null, vol: 1 },
    // example:
    // engine: { src: 'assets/audio/engine.ogg', vol: 1, pitchMin: 0.6, pitchMax: 1.4 },
  },
};
