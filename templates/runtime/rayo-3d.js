// Escenas 3D "¿Qué es un rayo?" (ray_*). Diseño propio con Three.js r149, usando el kit de galapagos-3d.js.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow } = K;

  K.addEN({
    'cristales de hielo': 'ice crystals', 'granizo blando': 'soft hail', 'corriente ↑': 'updraft ↑',
    'carga positiva': 'positive charge', 'carga negativa': 'negative charge', 'suelo: positivo': 'ground: positive',
    'baja a saltos': 'comes down in steps', 'chispa desde el suelo': 'spark from the ground',
    'rayo ≈ 30.000 °C': 'lightning ≈ 30,000 °C', 'Sol ≈ 5.500 °C': 'Sun ≈ 5,500 °C', 'el aire explota': 'the air explodes',
    '3 s ≈ 1 km': '3 s ≈ 1 km', '≈ 20 rayos al año': '≈ 20 strikes a year',
  });

  // Textura de signo + / − para las cargas.
  const signCache = {};
  function signTex(ch, color) {
    const key = ch + color; if (signCache[key]) return signCache[key];
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = color; g.beginPath(); g.arc(32, 32, 28, 0, PI * 2); g.fill();
    g.fillStyle = '#fff'; g.fillRect(14, 28, 36, 8); if (ch === '+') g.fillRect(28, 14, 8, 36);
    return (signCache[key] = new T.CanvasTexture(c));
  }
  function signSprite(ch) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: signTex(ch, ch === '+' ? '#e0483a' : '#2f7fe0'), transparent: true, depthWrite: false }));
    s.scale.setScalar(0.55); return s;
  }

  // Nube de tormenta (cumulonimbo) hecha de bolitas low-poly.
  function stormCloud(scene, seed = 2) {
    const g = new T.Group(); scene.add(g);
    const mat = new T.MeshStandardMaterial({ color: 0x8a90a0, flatShading: true, roughness: 1, emissive: 0xbfd4ff, emissiveIntensity: 0 });
    const r = rng(seed);
    const puff = (x, y, z, s, sy = 1) => { const m = new T.Mesh(new T.IcosahedronGeometry(s, 1), mat); m.position.set(x, y, z); m.scale.y = sy; g.add(m); };
    for (let i = 0; i < 16; i++) { const a = r() * PI * 2, d = r() * 3.2; puff(Math.cos(a) * d, 5.2 + r() * 0.6, Math.sin(a) * d * 0.6, 1.1 + r() * 0.6, 0.7); }
    for (let i = 0; i < 12; i++) puff((r() - 0.5) * 2.4, 6 + i * 0.28, (r() - 0.5) * 1.2, 1.2 + r() * 0.5);
    for (let i = 0; i < 14; i++) { const a = r() * PI * 2, d = 1 + r() * 4; puff(Math.cos(a) * d, 9.3 + r() * 0.4, Math.sin(a) * d * 0.5, 1.0 + r() * 0.4, 0.45); }
    return { g, mat };
  }

  // Rayo en zigzag (tubo brillante) desde 'from' hasta 'to', con ramas.
  function bolt(scene, from, to, seed, radius = 0.06, branches = 3) {
    const r = rng(seed);
    const pts = [new T.Vector3(...from)]; const end = new T.Vector3(...to);
    let p = pts[0].clone();
    const n = 18;
    for (let i = 1; i < n; i++) {
      const t = i / n; const target = new T.Vector3().lerpVectors(pts[0], end, t);
      p = target.add(new T.Vector3((r() - 0.5) * 1.0, (r() - 0.5) * 0.25, (r() - 0.5) * 0.6));
      pts.push(p.clone());
    }
    pts.push(end.clone());
    const mk = (list, rad) => {
      const path = new T.CurvePath(); for (let i = 1; i < list.length; i++) path.add(new T.LineCurve3(list[i - 1], list[i]));
      const geo = new T.TubeGeometry(path, list.length * 4, rad, 6, false);
      const m = onGlow(new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xeaf2ff, transparent: true })));
      scene.add(m); return { m, geo, total: geo.index.count };
    };
    const main = mk(pts, radius);
    const br = [];
    for (let b = 0; b < branches; b++) {
      const i0 = 3 + Math.floor(r() * (n - 8)); const list = [pts[i0].clone()]; let q = pts[i0].clone();
      const dir = r() > 0.5 ? 1 : -1;
      for (let k = 0; k < 5; k++) { q = q.clone().add(new T.Vector3(dir * (0.3 + r() * 0.4), -(0.3 + r() * 0.3), (r() - 0.5) * 0.3)); list.push(q); }
      br.push({ ...mk(list, radius * 0.55), at: i0 / n });
    }
    const glow = glowSprite(0xbfd8ff, 3, 0); scene.add(glow); glow.position.copy(end);
    return {
      pts,
      // p: fracción revelada (0..1); a: opacidad (destello)
      set(p, a = 1) {
        const show = (o, q) => { o.m.visible = q > 0.002 && a > 0.01; o.geo.setDrawRange(0, Math.floor(o.total * clamp(q) / 6) * 6); o.m.material.opacity = a; };
        show(main, p); br.forEach((o) => show(o, (p - o.at) * 3));
        glow.material.opacity = p >= 0.999 ? a * 0.9 : 0;
      },
      tip: (p) => { const i = Math.min(pts.length - 1, Math.floor(clamp(p) * (pts.length - 1))); return pts[i].toArray(); },
    };
  }

  // Destellos a intervalos irregulares, deterministas.
  const flashAt = (lt, times) => {
    let f = 0; for (const t of times) { const d = lt - t; if (d >= 0 && d < 0.35) f = Math.max(f, (1 - d / 0.35) * (0.6 + 0.4 * Math.abs(Math.sin(d * 60)))); }
    return f;
  };

  function ground(scene) {
    const geo = new T.PlaneGeometry(80, 60, 60, 40); geo.rotateX(-PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, (noise2(p.getX(i) * 0.2, p.getZ(i) * 0.2) - 0.5) * 0.8 - 0.2);
    scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0x1f3a26, flatShading: true, roughness: 1 })));
    const r = rng(9);
    for (let k = 0; k < 26; k++) {
      const t = new T.Group();
      const top = new T.Mesh(new T.ConeGeometry(0.45, 1.3, 7), new T.MeshStandardMaterial({ color: 0x1d4a2a, flatShading: true }));
      top.position.y = 0.9; t.add(top);
      t.position.set((r() - 0.5) * 30, 0, -r() * 14 + 4); if (Math.abs(t.position.x - 2.6) < 1.2) t.position.x += 3; scene.add(t);
    }
  }

  function tower(scene, x, z, h) {
    const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
    const mat = new T.MeshStandardMaterial({ color: 0x8c8f9a, flatShading: true });
    let y = 0; [[0.9, h * 0.6], [0.7, h * 0.22], [0.45, h * 0.12]].forEach(([w, hh]) => { const b = new T.Mesh(new T.BoxGeometry(w, hh, w), mat); b.position.y = y + hh / 2; g.add(b); y += hh; });
    const ant = new T.Mesh(new T.CylinderGeometry(0.03, 0.05, h * 0.18, 6), mat); ant.position.y = y + h * 0.09; g.add(ant);
    const win = new T.MeshBasicMaterial({ color: 0xffd98a });
    const r = rng(4);
    for (let i = 0; i < 40; i++) { const w = new T.Mesh(new T.PlaneGeometry(0.08, 0.1), win); w.position.set((r() - 0.5) * 0.7, 0.3 + r() * h * 0.55, 0.451); g.add(w); }
    return [x, y + h * 0.18, z];
  }

  function stormScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x070b16, fog: [0x0a1020, 30, 70], focus: 0.36, hemi: 0.55, moon: 0.4 });
    const { scene, camera } = st;
    ground(scene);
    const cloud = stormCloud(scene);
    const flashL = new T.PointLight(0xcfe0ff, 0, 60, 1.2); flashL.position.set(0, 6, 4); scene.add(flashL);
    const top = variant === 'tower' ? tower(scene, 1.8, 0, 6.2) : tower(scene, 2.6, 0.5, 1.6);
    const b1 = bolt(scene, [-0.6, 4.6, 0], top, 3), b2 = bolt(scene, [1.5, 4.6, -0.5], [-3.5, 0, -2], 8), b3 = bolt(scene, [0.5, 4.7, 0.3], [4.5, 0, -3], 13);
    const charges = [];
    if (variant === 'charges') {
      const r = rng(5);
      for (let i = 0; i < 16; i++) { const s = signSprite('+'); s.position.set((r() - 0.5) * 6, 9 + r() * 0.9, 1.6 + r() * 0.4); scene.add(s); charges.push({ s, t: 0.2 + i * 0.03 }); }
      for (let i = 0; i < 16; i++) { const s = signSprite('−'); s.position.set((r() - 0.5) * 6, 4.8 + r() * 0.8, 1.6 + r() * 0.4); scene.add(s); charges.push({ s, t: 1.0 + i * 0.03 }); }
      for (let i = 0; i < 14; i++) { const s = signSprite('+'); s.scale.setScalar(0.45); s.position.set((r() - 0.5) * 9, 0.5, 1 + r() * 2); scene.add(s); charges.push({ s, t: 2.0 + i * 0.04 }); }
      st.label({ text: 'carga positiva', p: [2.5, 9.6, 1.8], t0: 0.5, color: '#ff8a7a', size: 38, dy: 60 });
      st.label({ text: 'carga negativa', p: [-2.6, 5.0, 1.8], t0: 1.3, color: COL.blue, size: 38, dy: -110 });
      st.label({ text: 'suelo: positivo', p: [3, 0.5, 2], t0: (d) => Math.min(d * 0.6, 2.5), color: '#ff8a7a', size: 38, dy: 90 });
    }
    let streamer = null;
    if (variant === 'strike') streamer = bolt(scene, top, [top[0] - 0.4, top[1] + 1.4, top[2]], 21, 0.05, 0);
    const rings = [];
    if (variant === 'thunder' || variant === 'count') {
      for (let i = 0; i < 4; i++) {
        const m = new T.Mesh(new T.TorusGeometry(1, 0.04, 6, 64), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
        if (variant === 'count') { m.rotation.x = PI / 2; m.position.set(-3.5, 0.15, -2); } else { m.position.set(top[0], 2.2, top[2]); m.rotation.x = PI / 2; }
        scene.add(m); rings.push({ m, ph: i / 4 });
      }
    }
    let person = null;
    if (variant === 'count') {
      person = new T.Group();
      const body = new T.Mesh(new T.CylinderGeometry(0.18, 0.22, 0.7, 10), new T.MeshStandardMaterial({ color: 0xffc94a }));
      const head = new T.Mesh(new T.SphereGeometry(0.18, 12, 8), new T.MeshStandardMaterial({ color: 0xf1c7a0 }));
      body.position.y = 0.35; head.position.y = 0.9; person.add(body, head); person.position.set(1.5, 0, 6); scene.add(person);
      st.label({ text: '3 s ≈ 1 km', screen: [540, 1000], t0: (d) => d * 0.55, color: COL.gold, size: 60 });
    }
    if (variant === 'leader') st.label({ text: 'baja a saltos', p: () => b1.tip(Math.floor(prog(lt0, 0.3, dur0 * 0.75) * 7) / 7), t0: 0.6, color: COL.blue, size: 40, dx: -180, dy: 0 });
    if (variant === 'strike') st.label({ text: 'chispa desde el suelo', p: () => streamer.tip(1), t0: (d) => d * 0.25, t1: (d) => d * 0.6, color: COL.gold, size: 38, dy: 120, dx: -120 });
    if (variant === 'thunder') st.label({ text: 'el aire explota', p: [top[0], 2.2, top[2]], t0: (d) => d * 0.3, color: COL.white, size: 44, dx: -200, dy: 80 });
    if (variant === 'tower') st.label({ text: '≈ 20 rayos al año', p: top, t0: (d) => d * 0.4, color: COL.gold, size: 44, dx: -170, dy: 40 });
    if (variant === 'outro') {
      st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); };
    }
    let lt0 = 0, dur0 = 1, flashNow = 0;
    const baseOverlay = st.overlay;
    st.overlay = (ctx, lt, dur, FONT) => {
      if (flashNow > 0.01) { ctx.fillStyle = `rgba(220,232,255,${(flashNow * 0.35).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      if (variant === 'count') {
        const s = prog(lt, dur * 0.12, dur * 0.7) * 3;
        if (s > 0 && s < 3.4) { ctx.font = `900 120px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(String(Math.min(3, Math.floor(s) + 1)), 860, 560); }
      }
      if (baseOverlay) baseOverlay(ctx, lt, dur, FONT);
    };

    return (lt, dur) => {
      lt0 = lt; dur0 = dur;
      const k = smooth(clamp(lt / dur));
      let f = 0;
      b1.set(0); b2.set(0); b3.set(0); if (streamer) streamer.set(0);
      if (variant === 'hook' || variant === 'outro') {
        f = flashAt(lt, [0.5, 1.6, 2.4, 3.6, 4.6]);
        b1.set(1, flashAt(lt, [0.5, 2.4, 4.6])); b2.set(1, flashAt(lt, [1.6])); b3.set(1, flashAt(lt, [3.6]));
      }
      if (variant === 'leader') b1.set(Math.floor(prog(lt, 0.3, dur * 0.75) * 7) / 7 * 0.93, 0.7);
      if (variant === 'strike') {
        const meet = dur * 0.55;
        b1.set(lerp(0.85, 0.93, prog(lt, 0, meet)), 0.7); streamer.set(prog(lt, dur * 0.2, meet - dur * 0.2), 0.8);
        if (lt > meet) { b1.set(1, flashAt(lt, [meet, meet + 0.5, meet + 0.9])); streamer.set(0); f = flashAt(lt, [meet, meet + 0.5, meet + 0.9]); }
      }
      if (variant === 'thunder') { b1.set(1, 0.3 + flashAt(lt, [0.2, 1.4])); f = flashAt(lt, [0.2]) * 0.6; }
      if (variant === 'count') { const t = dur * 0.1; b2.set(1, flashAt(lt, [t, t + 0.3])); f = flashAt(lt, [t]); }
      if (variant === 'tower') { const ts = [0.4, 1.5, 2.6, 3.7, 4.8]; b1.set(1, flashAt(lt, ts)); f = flashAt(lt, ts) * 0.7; }
      flashNow = f;
      cloud.mat.emissiveIntensity = f * 0.9; flashL.intensity = f * 3;
      charges.forEach((c) => { const p = outBack(prog(lt, c.t, 0.4)); c.s.visible = p > 0.01; c.s.material.opacity = clamp(p); });
      rings.forEach((o) => {
        const start = variant === 'count' ? dur * 0.15 : 0.25;
        const q = lt > start ? ((lt - start) * (variant === 'count' ? 0.35 : 0.6) + o.ph) % 1 : -1;
        o.m.visible = q >= 0; const R = variant === 'count' ? 0.5 + q * 9 : 0.3 + q * 3; o.m.scale.setScalar(Math.max(0.01, R)); o.m.material.opacity = (1 - q) * 0.7;
      });
      if (variant === 'charges') { camera.position.set(0, 5, lerp(22, 20, k)); camera.lookAt(0, 5.2, 0); }
      else if (variant === 'leader' || variant === 'strike') { camera.position.set(lerp(-3, -2, k), 3.4, lerp(15, 13.5, k)); camera.lookAt(0.8, 3.2, 0); }
      else if (variant === 'thunder') { camera.position.set(-3, 2.8, 10); camera.lookAt(top[0], 2.6, top[2]); }
      else if (variant === 'tower') { camera.position.set(-4.5, 3.8, 15); camera.lookAt(1.0, 4.6, 0); }
      else if (variant === 'count') { camera.position.set(1.0, 2.6, 13); camera.lookAt(-0.5, 3.0, 0); }
      else if (variant === 'outro') { camera.position.set(0, lerp(4, 6, k), lerp(25, 34, k)); camera.lookAt(0, 5, 0); }
      else { camera.position.set(lerp(-1.5, 0.5, k), 4, lerp(26, 24, k)); camera.lookAt(0, 5, 0); }
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ dentro de la nube
  function insideCloud(canvas) {
    const st = stage(canvas, { bg: 0x2a3344, fog: [0x2a3344, 4, 16], stars: false, focus: 0.37, hemi: 0.9 });
    const { scene, camera } = st;
    const r = rng(17); const ice = [], hail = [];
    const iceMat = new T.MeshStandardMaterial({ color: 0xe8f4ff, emissive: 0x6688aa, flatShading: true });
    const hailMat = new T.MeshStandardMaterial({ color: 0xbfc6d2, flatShading: true, roughness: 0.8 });
    for (let i = 0; i < 70; i++) { const m = new T.Mesh(new T.OctahedronGeometry(0.07, 0), iceMat); scene.add(m); ice.push({ m, x: (r() - 0.5) * 6, z: (r() - 0.5) * 4, ph: r(), sp: 0.35 + r() * 0.2 }); }
    for (let i = 0; i < 22; i++) { const m = new T.Mesh(new T.IcosahedronGeometry(0.18, 0), hailMat); scene.add(m); hail.push({ m, x: (r() - 0.5) * 5, z: (r() - 0.5) * 3, ph: r(), sp: 0.08 + r() * 0.05 }); }
    const sparks = []; for (let i = 0; i < 10; i++) { const s = glowSprite(0xffffff, 0.5, 1); scene.add(s); sparks.push({ s, ph: r() }); }
    const shp = new T.Shape(); shp.moveTo(-0.2, 0); shp.lineTo(0, 0.3); shp.lineTo(0.2, 0); shp.lineTo(0.08, 0); shp.lineTo(0.08, -0.4); shp.lineTo(-0.08, -0.4); shp.lineTo(-0.08, 0);
    const arrows = []; for (let i = 0; i < 4; i++) { const m = onGlow(new T.Mesh(new T.ShapeGeometry(shp), new T.MeshBasicMaterial({ color: 0xffc94a, transparent: true }))); m.position.set(-2.4 + (i % 2) * 4.8, 0, 1 - (i >> 1) * 1.5); scene.add(m); arrows.push({ m, ph: i * 0.25 }); }
    st.label({ text: 'cristales de hielo', p: () => ice[3].m.position.toArray(), t0: 0.4, color: COL.blue, size: 40 });
    st.label({ text: 'granizo blando', p: () => hail[2].m.position.toArray(), t0: (d) => d * 0.35, color: COL.white, size: 40, dy: -150 });
    st.label({ text: 'corriente ↑', screen: [190, 900], t0: (d) => d * 0.55, color: COL.gold, size: 40 });
    return (lt, dur) => {
      ice.forEach((o) => { const f = (lt * o.sp + o.ph) % 1; o.m.position.set(o.x + Math.sin(lt + o.ph * 9) * 0.1, -3 + f * 7, o.z); o.m.rotation.set(lt * 2, lt * 3, 0); });
      hail.forEach((o) => { const f = (lt * o.sp + o.ph) % 1; o.m.position.set(o.x, 3 - f * 6, o.z); o.m.rotation.y = lt; });
      sparks.forEach((o, i) => { const h = hail[i]; const f = (lt * 1.5 + o.ph) % 1; o.s.position.copy(h.m.position); o.s.material.opacity = f < 0.2 ? 1 - f * 5 : 0; });
      arrows.forEach((o) => { const f = (lt * 0.5 + o.ph) % 1; o.m.position.y = -2.5 + f * 5; o.m.material.opacity = Math.sin(f * PI); });
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.4, 0.4, k), 0.3, lerp(7.5, 6.5, k)); camera.lookAt(0, 0.2, 0);
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ temperatura
  function heatScene(canvas) {
    const st = stage(canvas, { fog: null, focus: 0.38 });
    const { scene, camera } = st;
    const b = bolt(scene, [-1.6, 6.2, 0], [-1.2, -0.2, 0], 31, 0.09, 2);
    const bar = (x, h, color, emiss) => {
      const m = new T.Mesh(new T.BoxGeometry(0.9, 1, 0.9), new T.MeshStandardMaterial({ color, emissive: emiss, emissiveIntensity: 0.6, flatShading: true }));
      m.position.x = x; scene.add(m); return { m, h };
    };
    const sun = bar(0.6, 6 * 5500 / 30000, 0xffb347, 0xff7a00), ray = bar(2.0, 6, 0xdfeaff, 0x7aa6ff);
    onGlow(ray.m);
    const floor = new T.Mesh(new T.BoxGeometry(3.2, 0.08, 1.4), new T.MeshStandardMaterial({ color: 0x2a3044 })); floor.position.set(1.3, -0.04, 0); scene.add(floor);
    st.label({ text: 'Sol ≈ 5.500 °C', p: () => [0.6, sun.h, 0], t0: (d) => d * 0.2, color: COL.orange, size: 38, dy: 90, dx: -60 });
    st.label({ text: 'rayo ≈ 30.000 °C', p: () => [2.0, ray.h * ray.m.scale.y / ray.h, 0], t0: (d) => d * 0.5, color: COL.blue, size: 42, dy: 70 });
    return (lt, dur) => {
      b.set(1, 0.75 + 0.25 * Math.sin(lt * 30));
      [[sun, 0.2], [ray, dur * 0.45]].forEach(([o, t]) => { const p = smooth(prog(lt, t, 0.9)); const h = Math.max(0.001, o.h * p); o.m.scale.y = h; o.m.position.y = h / 2; });
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.4, 0.4, k), 3.2, lerp(12.5, 11.5, k)); camera.lookAt(0.4, 2.7, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'charges', 'leader', 'strike', 'thunder', 'count', 'tower', 'outro'].forEach((v) => reg(`ray_${v}`, (c) => stormScene(c, v)));
  reg('ray_cloud', (c) => insideCloud(c));
  reg('ray_heat', (c) => heatScene(c));
})();
