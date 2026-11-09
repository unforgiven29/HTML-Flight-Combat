# Viper Sortie — HTML Flight Combat

Play: https://unforgiven29.github.io/HTML-Flight-Combat/

## Layout
```
index.html               page shell + UI markup
css/game.css             all game styles
js/game.js               the sim (flight model, avionics, AI, campaign, MP)
js/assets.js             loads custom models/audio and hooks them into the game
assets/assets.config.js  ← edit this to add your own models and sounds
assets/models/           .glb / .gltf files
assets/audio/            .ogg / .mp3 / .wav files
vendor/                  three.js r128, GLTFLoader, PeerJS
```

## Custom 3D models
1. Export a `.glb` (metres, +Y up, nose pointing **-Z**).
2. Put it in `assets/models/`.
3. In `assets/assets.config.js` set e.g.
   `'F-16': { src: 'assets/models/f16.glb', scale: 1, rot: [0, 180, 0], offset: [0, 0, 0] }`
   (`rot` in degrees fixes models that face +Z or +X.)

The procedural airframe is hidden; afterburner plumes, gear, rails and weapons stay. Use `keepParts: ['wings']` on swing-wing jets if you want the built-in moving wings kept.

## Custom audio
Put files in `assets/audio/` and set `src` for any of: `engine`, `afterburner`, `gun`, `irGrowl`, `irLock`, `rwrNew`, `rwrLock`, `rwrLaunch`, `missileLaunch`, `explosion`, `click`, `thunder`. Unset sounds keep the built-in synth. Loops should be seamless.

## Running locally
Browsers block `fetch` from `file://`, so serve the folder: `python -m http.server` then open http://localhost:8000.
