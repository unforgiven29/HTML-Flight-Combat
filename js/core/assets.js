/* =====================================================================
   Viper Sortie — asset layer
   Loads the custom 3D models and audio listed in assets/assets.config.js
   and hooks them into the game. Anything not configured (or that fails to
   load) falls back to the built-in procedural model / synthesized sound.
   Loaded after js/game.js, so it can wrap AC[...].model and sfx.*.
   ===================================================================== */
(function () {
  'use strict';
  const CFG = window.ASSET_CONFIG || { models: {}, audio: {} };
  const D2R_ = Math.PI / 180;
  const ASSETS = (window.ASSETS = { models: {}, audioRaw: {}, audio: {}, ready: null });

  /* ------------------------------------------------------------------ models */
  const loader = THREE.GLTFLoader ? new THREE.GLTFLoader() : null;

  function loadModel(key, c) {
    return new Promise((res) => {
      if (!loader) { console.warn('[assets] GLTFLoader missing'); return res(); }
      loader.load(c.src, (gltf) => {
        const root = gltf.scene || gltf.scenes[0];
        root.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = o.receiveShadow = true;
            if (o.material && o.material.map) o.material.map.encoding = THREE.sRGBEncoding;
          }
        });
        ASSETS.models[key] = root;
        console.info('[assets] model', key, '←', c.src);
        res();
      }, undefined, (e) => { console.warn('[assets] model failed', key, c.src, e); res(); });
    });
  }

  // parts that stay procedural on top of a custom model: AB plumes, flames, weapon rails
  const KEEP_KEYS = ['ab', 'flame', 'rail'];
  function referenced(grp, extra) {
    const keep = new Set(), keys = KEEP_KEYS.concat(extra || []);
    const add = (v) => {
      if (!v) return;
      if (v.isObject3D) v.traverse((o) => keep.add(o));
      else if (Array.isArray(v)) v.forEach(add);
    };
    grp.traverse((o) => keys.forEach((k) => add(o.userData && o.userData[k])));
    return keep;
  }

  function applyModel(type, grp) {
    const c = CFG.models[type], src = ASSETS.models[type];
    if (!c || !src || !grp || !grp.isObject3D) return grp;
    try {
      if (c.hideProcedural !== false) {
        const keep = referenced(grp, c.keepParts);
        grp.traverse((o) => {
          if (!o.isMesh || keep.has(o)) return;
          if (o.material && o.material.transparent && o !== grp.userData.canopy) return; // plumes, glow
          o.visible = false;
        });
        if (c.hideCanopy === false && grp.userData.canopy) grp.userData.canopy.visible = true;
      }
      const m = src.clone(true);
      const s = c.scale ?? 1;
      Array.isArray(s) ? m.scale.set(s[0], s[1], s[2]) : m.scale.setScalar(s);
      const r = c.rot || [0, 0, 0];
      m.rotation.set(r[0] * D2R_, r[1] * D2R_, r[2] * D2R_);
      const p = c.offset || [0, 0, 0];
      m.position.set(p[0], p[1], p[2]);
      m.name = 'customModel';
      grp.add(m);
      grp.userData.custom = m;
    } catch (e) { console.warn('[assets] applyModel', type, e); }
    return grp;
  }

  function hookModels() {
    if (typeof AC === 'undefined') return;
    for (const type of Object.keys(AC)) {
      const ac = AC[type];
      if (!ac || typeof ac.model !== 'function' || ac.model.__assetHook) continue;
      const orig = ac.model;
      const wrapped = function () { return applyModel(type, orig.apply(this, arguments)); };
      wrapped.__assetHook = true;
      ac.model = wrapped;
    }
  }

  /* ------------------------------------------------------------------- audio */
  function fetchAudio(key, c) {
    return fetch(c.src)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((b) => { ASSETS.audioRaw[key] = b; })
      .catch((e) => console.warn('[assets] audio failed', key, c.src, e));
  }

  function decodeAll(ctx) {
    return Promise.all(Object.entries(ASSETS.audioRaw).map(([k, buf]) => {
      if (ASSETS.audio[k]) return;
      return new Promise((res) => ctx.decodeAudioData(buf.slice(0), (d) => { ASSETS.audio[k] = d; res(); }, () => { console.warn('[assets] decode failed', k); res(); }));
    }));
  }

  const has = (k) => !!ASSETS.audio[k];
  const vol = (k) => (CFG.audio[k] && CFG.audio[k].vol) ?? 1;
  const S = (n, d) => { try { return typeof SET !== 'undefined' && SET[n] != null ? SET[n] : d; } catch (e) { return d; } };

  // one-shot through the game's master bus
  function play(k, gain = 1, rate = 1) {
    if (!sfx.ctx || !sfx.m || !has(k)) return false;
    const x = sfx.ctx, s = x.createBufferSource(), g = x.createGain();
    s.buffer = ASSETS.audio[k]; s.playbackRate.value = rate;
    g.gain.value = gain * vol(k);
    s.connect(g).connect(sfx.m); s.start();
    return true;
  }

  // persistent looped voice
  const loops = {};
  function loop(k) {
    if (loops[k]) return loops[k];
    if (!sfx.ctx || !sfx.m || !has(k)) return null;
    const x = sfx.ctx, s = x.createBufferSource(), g = x.createGain();
    s.buffer = ASSETS.audio[k]; s.loop = true; g.gain.value = 0;
    s.connect(g).connect(sfx.m); s.start();
    return (loops[k] = { s, g });
  }
  function setLoop(k, gain, rate, tc = 0.08) {
    const L = loop(k); if (!L) return false;
    const t = sfx.ctx.currentTime;
    L.g.gain.setTargetAtTime(Math.max(0, gain * vol(k)), t, tc);
    if (rate != null) L.s.playbackRate.setTargetAtTime(rate, t, 0.15);
    return true;
  }
  const silence = (param) => { const t = sfx.ctx.currentTime; param.cancelScheduledValues(t); param.setTargetAtTime(0, t, 0.02); };

  function hookAudio() {
    if (typeof sfx === 'undefined') return;
    ASSETS.play = play;

    const _init = sfx.init.bind(sfx);
    sfx.init = function () { _init(); if (this.ctx) decodeAll(this.ctx); };

    const _engine = sfx.engine.bind(sfx);
    sfx.engine = function (n, ab, on) {
      _engine(n, ab, on);
      if (!this.ctx) return;
      const e = CFG.audio.engine || {};
      if (has('engine')) {
        silence(this.eG.gain);
        const pMin = e.pitchMin ?? 0.6, pMax = e.pitchMax ?? 1.4;
        setLoop('engine', on ? (0.25 + n * 0.75) * S('eng', 80) / 80 : 0, pMin + (pMax - pMin) * n, 0.2);
      }
      if (has('afterburner')) setLoop('afterburner', on ? ab * S('eng', 80) / 80 : 0, null, 0.25);
    };

    const _gun = sfx.gun.bind(sfx);
    sfx.gun = function (on) {
      if (!has('gun')) return _gun(on);
      if (!this.ctx || this.gunOn === on) return;
      this.gunOn = on;
      silence(this.gG.gain);
      setLoop('gun', on ? S('eng', 80) / 80 : 0, null, 0.01);
    };

    const _tone = sfx.tone.bind(sfx);
    sfx.tone = function (l) {
      if (!has('irGrowl') && !has('irLock')) return _tone(l);
      if (!this.ctx || this.lastTone === l) return;
      _tone(l);
      const k = l === 2 ? 'irLock' : l === 1 ? 'irGrowl' : null;
      let au = 1; try { au = sys.au.msl; } catch (e) {}
      const v = au * S('tone', 75) / 75;
      if (k && has(k)) silence(this.tG.gain);
      setLoop('irGrowl', k === 'irGrowl' ? v : 0, null, 0.03);
      setLoop('irLock', k === 'irLock' ? v : 0, null, 0.03);
    };

    const _rwr = sfx.rwr.bind(sfx);
    sfx.rwr = function (type) {
      const k = type === 'new' ? 'rwrNew' : type === 'lock' ? 'rwrLock' : 'rwrLaunch';
      try { if (!sys.rwr.pwr) return; } catch (e) {}
      if (has(k)) { let v = 1; try { v = sys.au.thr * 1.25; } catch (e) {} play(k, v * S('tone', 75) / 75); return; }
      _rwr(type);
    };

    const _click = sfx.click.bind(sfx);
    sfx.click = function () { if (!play('click', S('tone', 75) / 75)) _click(); };

    if (sfx.thunder) {
      const _th = sfx.thunder.bind(sfx);
      sfx.thunder = function () { if (!play('thunder')) _th(); };
    }

    // player missile launches
    if (typeof fireMissile === 'function') {
      const _fm = fireMissile;
      window.fireMissile = fireMissile = function (type, sh) {
        const r = _fm.apply(this, arguments);
        try { if (sh === player) play('missileLaunch'); } catch (e) {}
        return r;
      };
    }

    // positional explosions (falls through to the game's own visual + synth handling)
    if (typeof explode === 'function') {
      const _ex = explode;
      window.explode = explode = function (p, big) {
        const r = _ex.apply(this, arguments);
        try {
          if (has('explosion') && player && p) {
            const md = (CFG.audio.explosion && CFG.audio.explosion.maxDist) || 12000;
            const d = player.pos.distanceTo(p);
            if (d < md) play('explosion', (big ? 1 : 0.6) * Math.pow(1 - d / md, 2), big ? 0.85 : 1);
          }
        } catch (e) {}
        return r;
      };
    }
  }

  /* -------------------------------------------------------------------- boot */
  hookModels();
  hookAudio();

  const jobs = [];
  for (const [k, c] of Object.entries(CFG.models || {})) if (c && c.src) jobs.push(loadModel(k, c));
  for (const [k, c] of Object.entries(CFG.audio || {})) if (c && c.src) jobs.push(fetchAudio(k, c));
  ASSETS.ready = Promise.all(jobs).then(() => {
    hookModels(); // catch any aircraft registered late
    if (typeof sfx !== 'undefined' && sfx.ctx) decodeAll(sfx.ctx);
    if (jobs.length) console.info('[assets] ready:', Object.keys(ASSETS.models).length, 'models,', Object.keys(ASSETS.audioRaw).length, 'sounds');
  });
})();
