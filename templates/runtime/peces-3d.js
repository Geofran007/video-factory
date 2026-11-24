// Escenas 3D "¿Cómo respiran los peces?" (pez_*). Pez y branquias de diseño propio con Three.js r149.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow } = K;

  K.addEN({
    'oxígeno disuelto': 'dissolved oxygen', '~30 veces menos que el aire': '~30 times less than air', 'entra por la boca': 'in through the mouth',
    'sale por las branquias': 'out through the gills', 'branquias': 'gills', 'láminas finísimas': 'ultra-thin plates', 'sangre': 'blood', 'agua': 'water',
    'contracorriente: hasta ~80 %': 'countercurrent: up to ~80%', 'sale CO₂': 'CO₂ out', 'fuera del agua se pegan': 'out of water they collapse',
    'nadar para respirar': 'swim to breathe',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  function fish(scene, color = 0x3a9ad8, shark = false) {
    const g = new T.Group(); scene.add(g);
    const mat = new T.MeshStandardMaterial({ color, flatShading: true, roughness: 0.5, metalness: 0.15 });
    const body = new T.Mesh(new T.SphereGeometry(1, 20, 14), mat); body.scale.set(shark ? 2.4 : 1.6, shark ? 0.6 : 0.8, shark ? 0.6 : 0.45); g.add(body);
    const tailP = new T.Group(); tailP.position.x = shark ? -2.2 : -1.5; g.add(tailP);
    const tail = new T.Mesh(new T.ConeGeometry(0.6, 1.0, 4), mat); tail.rotation.z = PI / 2; tail.scale.z = 0.15; tail.position.x = -0.4; tailP.add(tail);
    const fin = new T.Mesh(new T.ConeGeometry(shark ? 0.5 : 0.3, shark ? 1.0 : 0.6, 3), mat); fin.position.set(shark ? 0.2 : 0, shark ? 0.8 : 0.75, 0); fin.scale.z = 0.15; g.add(fin);
    const eye = new T.Mesh(new T.SphereGeometry(0.12, 10, 8), new T.MeshBasicMaterial({ color: 0x0a0a0a })); eye.position.set(shark ? 1.8 : 1.15, 0.2, shark ? 0.42 : 0.32); g.add(eye);
    const eye2 = eye.clone(); eye2.position.z *= -1; g.add(eye2);
    const gill = new T.Mesh(new T.TorusGeometry(0.4, 0.04, 6, 20, PI * 0.8), new T.MeshStandardMaterial({ color: 0xb8302a })); gill.position.set(shark ? 1.1 : 0.7, 0, shark ? 0.5 : 0.38); gill.rotation.z = -PI * 0.4; g.add(gill);
    return { g, tailP, gill, update: (lt, sp = 1) => { tailP.rotation.y = Math.sin(lt * 6 * sp) * 0.45; g.rotation.y = Math.sin(lt * 6 * sp + 1) * 0.05; } };
  }

  function water(canvas) { return stage(canvas, { bg: 0x064a6a, fog: [0x064a6a, 6, 24], stars: false, focus: 0.37, hemi: 0.95, moon: 1.1 }); }

  function bubbles(scene, n, seed, area = 6) {
    const r = rng(seed); const list = [];
    for (let i = 0; i < n; i++) { const s = glowSprite(0xdff2ff, 0.12 + r() * 0.1, 0.8); scene.add(s); list.push({ s, x: (r() - 0.5) * area, z: (r() - 0.5) * 3, ph: r() }); }
    return (lt) => list.forEach((o) => { const f = (lt * 0.15 + o.ph) % 1; o.s.position.set(o.x + Math.sin(f * 9 + o.ph * 7) * 0.1, -3 + f * 6, o.z); });
  }

  function fishScene(canvas, variant) {
    const st = water(canvas);
    const { scene, camera } = st;
    const bub = bubbles(scene, 40, 3);
    const F = fish(scene);
    const flow = [];
    if (variant === 'mouth') {
      for (let i = 0; i < 18; i++) { const s = glowSprite(0x8fd0ff, 0.25, 1); scene.add(s); flow.push({ s, ph: i / 18 }); }
      st.label({ text: 'entra por la boca', p: [1.7, 0, 0.3], t0: 0.3, color: COL.blue, size: 38, dx: 80 });
      st.label({ text: 'sale por las branquias', p: [0.7, -0.3, 0.5], t0: (d) => d * 0.4, color: COL.gold, size: 38, dy: -170 });
    }
    let ground = null;
    if (variant === 'air') {
      scene.background.set(0x8ab8e0); scene.fog = null;
      ground = new T.Mesh(new T.BoxGeometry(8, 0.3, 4), new T.MeshStandardMaterial({ color: 0x8a6a4a })); ground.position.y = -1.0; scene.add(ground);
      st.label({ text: 'fuera del agua se pegan', p: [0.7, 0, 0.4], t0: (d) => d * 0.35, color: '#ff8a7a', size: 40 });
    }
    if (variant === 'oxygen') {
      const o2 = []; const r = rng(7);
      for (let i = 0; i < 26; i++) { const g = new T.Group(); [-0.09, 0.09].forEach((x) => { const s = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), new T.MeshStandardMaterial({ color: 0xff5a4a, emissive: 0x401010 })); s.position.x = x; g.add(s); }); g.position.set((r() - 0.5) * 6, (r() - 0.5) * 5, (r() - 0.5) * 2); scene.add(g); o2.push(g); }
      F.g.visible = false;
      st.label({ text: 'oxígeno disuelto', p: () => o2[3].position.toArray(), t0: 0.4, color: '#ff8a7a', size: 40 });
      st.label({ text: '~30 veces menos que el aire', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.white, size: 40 });
      F.extra = o2;
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      bub(lt);
      if (F.extra) F.extra.forEach((g, i) => { g.rotation.set(lt + i, lt * 0.7, 0); g.position.y += Math.sin(lt + i) * 0.002; });
      if (variant === 'air') {
        F.g.position.set(0, -0.4, 0); F.g.rotation.set(0, 0, 0.1 * Math.sin(lt * 7)); F.tailP.rotation.y = Math.sin(lt * 8) * 0.3;
        F.gill.scale.setScalar(lerp(1, 0.4, smooth(prog(lt, 0.3, dur * 0.5))));
        camera.position.set(0.5, 1.4, 9); camera.lookAt(0, -0.3, 0);
      } else {
        F.update(lt); F.g.position.set(variant === 'hook' ? lerp(-3, 2, k) : 0, Math.sin(lt) * 0.15, 0);
        F.gill.rotation.y = Math.sin(lt * 3) * 0.25;
        flow.forEach((o) => { const f = (lt * 0.5 + o.ph) % 1; const x = f < 0.5 ? lerp(3.2, 1.3, f * 2) : lerp(0.75, 0.6, (f - 0.5) * 2); const z = f < 0.5 ? 0.1 : lerp(0.4, 1.6, (f - 0.5) * 2); o.s.position.set(x, -0.05 + Math.sin(f * 20) * 0.03, z); o.s.material.opacity = Math.sin(f * PI); });
        camera.position.set(lerp(-0.5, 0.5, k), 0.8, variant === 'mouth' ? 8 : 11); camera.lookAt(0.3, 0, 0);
      }
      st.draw(lt, dur);
    };
  }

  // Branquias de cerca: arcos con filamentos y láminas; flujo a contracorriente.
  function gillScene(canvas, variant) {
    const st = water(canvas);
    const { scene, camera } = st;
    const red = new T.MeshStandardMaterial({ color: 0xc8303a, flatShading: true, roughness: 0.6 });
    const arches = [];
    for (let a = 0; a < 4; a++) {
      const g = new T.Group(); g.position.set(0, 0, -1.2 + a * 0.8); scene.add(g); arches.push(g);
      const arch = new T.Mesh(new T.TorusGeometry(1.8, 0.08, 6, 40, PI * 0.8), new T.MeshStandardMaterial({ color: 0xf0e0d0 })); arch.rotation.z = PI * 0.1; g.add(arch);
      for (let i = 0; i < 24; i++) { const t = 0.1 * PI + (i / 23) * PI * 0.8; const f = new T.Mesh(new T.BoxGeometry(0.06, 0.9, 0.05), red); f.position.set(Math.cos(t) * 1.8, Math.sin(t) * 1.8, 0); f.rotation.z = t - PI / 2; f.translateY(-0.45); g.add(f); }
    }
    const water1 = [], blood = [];
    if (variant === 'counter' || variant === 'lamellae' || variant === 'co2') {
      for (let i = 0; i < 14; i++) { const s = glowSprite(0x8fd0ff, 0.22, 1); scene.add(s); water1.push({ s, ph: i / 14 }); }
      for (let i = 0; i < 14; i++) { const s = glowSprite(0xff5a5a, 0.22, 1); scene.add(s); blood.push({ s, ph: i / 14 }); }
    }
    const co2 = [];
    if (variant === 'co2') for (let i = 0; i < 10; i++) { const s = glowSprite(0xb8b8c0, 0.3, 1); scene.add(s); co2.push({ s, ph: i / 10 }); }
    if (variant === 'gills') st.label({ text: 'branquias', p: [0, 1.8, 0], t0: 0.3, color: '#ff8a7a', size: 42 });
    if (variant === 'lamellae') st.label({ text: 'láminas finísimas', screen: [540, 470], t0: 0.3, color: COL.white, size: 40 });
    if (variant === 'counter') {
      st.label({ text: 'agua', p: [-2.4, 0.3, 1.2], t0: 0.3, color: COL.blue, size: 38 });
      st.label({ text: 'sangre', p: [2.4, -0.3, 1.2], t0: 0.6, color: '#ff8a7a', size: 38, dy: -120 });
      st.label({ text: 'contracorriente: hasta ~80 %', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.gold, size: 40 });
    }
    if (variant === 'co2') st.label({ text: 'sale CO₂', p: [1.5, 1.2, 1.2], t0: (d) => d * 0.35, color: COL.white, size: 42 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      arches.forEach((g, i) => { g.rotation.y = Math.sin(lt * 1.5 + i * 0.3) * 0.08; });
      water1.forEach((o) => { const f = (lt * 0.35 + o.ph) % 1; o.s.position.set(lerp(-3, 3, f), 0.25, 1.2); });
      blood.forEach((o) => { const f = (lt * 0.35 + o.ph) % 1; o.s.position.set(lerp(3, -3, f), -0.25, 1.2); const c = new T.Color(0x8a3a6a).lerp(new T.Color(0xff3a3a), f); o.s.material.color.copy(c); });
      co2.forEach((o) => { const f = (lt * 0.4 + o.ph) % 1; o.s.position.set(lerp(-1, 1, o.ph), -0.25 + f * 1.8, 1.2); o.s.material.opacity = 1 - f; });
      if (variant === 'gills') { camera.position.set(lerp(-3, -1.5, k), 1.4, 9); camera.lookAt(0, 0.9, 0); }
      else { camera.position.set(0, 0.6, lerp(8, 7.4, k)); camera.lookAt(0, 0.7, 0); }
      st.draw(lt, dur);
    };
  }

  function sharkScene(canvas) {
    const st = water(canvas);
    const { scene, camera } = st;
    const bub = bubbles(scene, 30, 9, 10);
    const S = fish(scene, 0x7a8a9a, true);
    const flow = []; for (let i = 0; i < 16; i++) { const s = glowSprite(0x8fd0ff, 0.25, 1); scene.add(s); flow.push({ s, ph: i / 16 }); }
    st.label({ text: 'nadar para respirar', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 46 });
    return (lt, dur) => {
      bub(lt); S.update(lt, 0.6);
      S.g.position.set(Math.sin(lt * 0.4) * 1.5, Math.sin(lt * 0.6) * 0.3, 0);
      flow.forEach((o) => { const f = (lt * 0.6 + o.ph) % 1; o.s.position.set(S.g.position.x + lerp(3.5, 0.8, f), S.g.position.y + Math.sin(f * 15) * 0.05, f > 0.8 ? lerp(0.1, 1.2, (f - 0.8) * 5) : 0.1); o.s.material.opacity = Math.sin(f * PI); });
      camera.position.set(0, 1, 12); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'oxygen', 'mouth', 'air', 'outro'].forEach((v) => reg(`pez_${v}`, (c) => fishScene(c, v)));
  ['gills', 'lamellae', 'counter', 'co2'].forEach((v) => reg(`pez_${v}`, (c) => gillScene(c, v)));
  reg('pez_shark', (c) => sharkScene(c));
})();
