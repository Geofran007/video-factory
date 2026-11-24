// Escenas 3D "¿De dónde sacan su peso los árboles?" (arb_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow, tr } = K;

  K.addEN({
    '¿del suelo?': 'from the soil?', 'sauce: +74 kg': 'willow: +74 kg', 'tierra: −57 g': 'soil: −57 g', '5 años': '5 years',
    'CO₂ del aire': 'CO₂ from the air', 'estomas': 'stomata', 'luz + agua + CO₂': 'light + water + CO₂', 'azúcar + O₂': 'sugar + O₂',
    'carbono del aire': 'carbon from the air', 'agua de las raíces': 'water from the roots', '1 anillo = 1 año': '1 ring = 1 year',
    'Hyperion: ~116 m': 'Hyperion: ~116 m', 'edificio de 35 pisos': '35-story building',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  function tree(scene, { h = 3, seed = 1, leaf = 0x3f9a4c } = {}) {
    const g = new T.Group(); scene.add(g);
    const bark = new T.MeshStandardMaterial({ color: 0x6b4a2c, flatShading: true, roughness: 1 });
    const trunk = new T.Mesh(new T.CylinderGeometry(0.18 * h / 3, 0.3 * h / 3, h * 0.55, 8), bark); trunk.position.y = h * 0.275; g.add(trunk);
    const r = rng(seed); const leaves = new T.MeshStandardMaterial({ color: leaf, flatShading: true, roughness: 0.9 });
    const crown = new T.Group(); crown.position.y = h * 0.62; g.add(crown);
    for (let i = 0; i < 9; i++) { const b = new T.Mesh(new T.IcosahedronGeometry(h * (0.18 + r() * 0.12), 1), leaves); b.position.set((r() - 0.5) * h * 0.5, (r() - 0.2) * h * 0.35, (r() - 0.5) * h * 0.4); crown.add(b); }
    return { g, trunk, crown, leaves };
  }

  function meadow(scene) {
    const geo = new T.PlaneGeometry(60, 60, 40, 40); geo.rotateX(-PI / 2); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, (noise2(p.getX(i) * 0.1, p.getZ(i) * 0.1) - 0.5) * 1.2);
    geo.computeVertexNormals(); scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0x5a9a4a, flatShading: true })));
  }

  function treeScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x5fa0e0, fog: [0xa8d0f0, 20, 60], stars: false, focus: 0.37, hemi: 1.0, moon: 1.2 });
    const { scene, camera } = st;
    meadow(scene);
    const Tr = tree(scene, { h: 5, seed: 3 });
    const sun = glowSprite(0xfff2c0, 5, 1); sun.position.set(8, 12, -20); scene.add(sun);
    const parts = [];
    if (variant === 'carbon' || variant === 'water') {
      const r = rng(4);
      for (let i = 0; i < 40; i++) { const s = glowSprite(variant === 'carbon' ? 0x3a3a3a : 0x4aa3ff, 0.25, 1); scene.add(s); parts.push({ s, ph: r(), x: (r() - 0.5) * 6, z: (r() - 0.5) * 4 }); }
      st.label({ text: variant === 'carbon' ? 'carbono del aire' : 'agua de las raíces', screen: [540, 1000], t0: (d) => d * 0.3, color: variant === 'carbon' ? COL.white : COL.blue, size: 46 });
    }
    if (variant === 'question') st.label({ text: '¿del suelo?', p: [0, 0.1, 1.5], t0: (d) => d * 0.35, color: COL.gold, size: 50, dy: -150 });
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      Tr.crown.rotation.y = Math.sin(lt * 0.4) * 0.04;
      parts.forEach((o) => {
        const f = (lt * 0.3 + o.ph) % 1;
        if (variant === 'carbon') o.s.position.set(lerp(o.x, 0, f), lerp(6 + o.ph, 3.0, f), lerp(o.z, 0, f));
        else o.s.position.set(Math.sin(o.ph * 20) * 0.12, lerp(-0.2, 3.4, f), Math.cos(o.ph * 20) * 0.12 + 0.45);
        o.s.material.opacity = Math.sin(f * PI);
      });
      if (variant === 'water') Tr.trunk.material.transparent = true, Tr.trunk.material.opacity = 0.55;
      camera.position.set(lerp(-2, 1, k), 3.0, lerp(18, 16.5, k)); camera.lookAt(0, 3.2, 0);
      st.draw(lt, dur);
    };
  }

  // Experimento de van Helmont: el sauce crece mucho, la tierra casi no cambia.
  function potScene(canvas) {
    const st = stage(canvas, { bg: 0x2a2018, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const pot = new T.Mesh(new T.CylinderGeometry(1.4, 1.0, 1.6, 24), new T.MeshStandardMaterial({ color: 0xb8643a, flatShading: true })); pot.position.y = -1.6; scene.add(pot);
    const soil = new T.Mesh(new T.CircleGeometry(1.35, 24), new T.MeshStandardMaterial({ color: 0x4a3020 })); soil.rotation.x = -PI / 2; soil.position.y = -0.82; scene.add(soil);
    const Tr = tree(scene, { h: 4, seed: 7, leaf: 0x6ab84a }); Tr.g.position.y = -0.82;
    st.label({ text: 'sauce: +74 kg', p: [0.8, 2.6, 0], t0: (d) => d * 0.45, color: COL.green, size: 44 });
    st.label({ text: 'tierra: −57 g', p: [0, -1.2, 1.4], t0: (d) => d * 0.6, color: COL.orange, size: 42, dy: -150 });
    st.overlay = (ctx, lt, dur, FONT) => { const y = Math.floor(5 * clamp(lt / (dur * 0.6))); ctx.save(); ctx.font = `900 64px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`${y}/5`, 870, 520); ctx.font = `800 28px ${FONT}`; ctx.fillText(tr('5 años'), 870, 560); ctx.restore(); };
    return (lt, dur) => {
      const g = smooth(clamp(lt / (dur * 0.6))); Tr.g.scale.setScalar(Math.max(0.05, lerp(0.12, 1, g)));
      camera.position.set(0, 1.2, 10); camera.lookAt(0, 0.6, 0);
      st.draw(lt, dur);
    };
  }

  // Hoja de cerca: el CO₂ entra por los estomas; fotosíntesis.
  function leafScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0e2a18, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const shape = new T.Shape(); shape.moveTo(0, -2.6); shape.quadraticCurveTo(2.2, -0.6, 0, 2.6); shape.quadraticCurveTo(-2.2, -0.6, 0, -2.6);
    const leaf = new T.Mesh(new T.ShapeGeometry(shape, 24), new T.MeshStandardMaterial({ color: 0x3f9a4c, side: T.DoubleSide, roughness: 0.6 })); scene.add(leaf);
    const vein = new T.Mesh(new T.BoxGeometry(0.06, 5.0, 0.02), new T.MeshStandardMaterial({ color: 0x8acb6a })); vein.position.z = 0.01; scene.add(vein);
    const r = rng(5); const stomata = [];
    for (let i = 0; i < 12; i++) { const m = new T.Mesh(new T.TorusGeometry(0.1, 0.03, 6, 16), new T.MeshStandardMaterial({ color: 0x1f6a2c })); m.position.set((r() - 0.5) * 1.8, (r() - 0.5) * 3.6, 0.02); m.scale.y = 1.6; scene.add(m); stomata.push(m); }
    const co2 = []; for (let i = 0; i < 16; i++) { const g = new T.Group(); const c = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), new T.MeshStandardMaterial({ color: 0x3a3a3a })); g.add(c); [-1, 1].forEach((s) => { const o = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), new T.MeshStandardMaterial({ color: 0xe84a3a })); o.position.x = s * 0.17; g.add(o); }); scene.add(g); co2.push({ g, t: stomata[i % stomata.length], ph: r() }); }
    const o2 = []; for (let i = 0; i < 10; i++) { const s = glowSprite(0x8fd0ff, 0.3, 1); scene.add(s); o2.push({ s, ph: r(), x: (r() - 0.5) * 1.6 }); }
    const sunl = glowSprite(0xfff2c0, 3, 0.9); sunl.position.set(2.4, 3.2, 1); scene.add(sunl);
    if (variant === 'leaf') { st.label({ text: 'CO₂ del aire', p: () => co2[0].g.position.toArray(), t0: 0.4, color: COL.white, size: 40 }); st.label({ text: 'estomas', p: () => stomata[2].position.toArray(), t0: (d) => d * 0.45, color: COL.green, size: 40, dy: -150 }); }
    if (variant === 'photo') { st.label({ text: 'luz + agua + CO₂', screen: [540, 470], t0: 0.3, color: COL.gold, size: 42 }); st.label({ text: 'azúcar + O₂', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.green, size: 46 }); }
    return (lt, dur) => {
      co2.forEach((o) => { const f = (lt * 0.3 + o.ph) % 1; const tgt = o.t.position; o.g.position.set(tgt.x + (1 - f) * 1.5, tgt.y + (1 - f) * 1.2, (1 - f) * 2.2 + 0.05); o.g.rotation.z = lt; o.g.visible = f < 0.97; });
      o2.forEach((o) => { const f = (lt * 0.35 + o.ph) % 1; o.s.position.set(o.x - f * 1.5, -1 + f * 3, 0.3 + f * 2); o.s.material.opacity = variant === 'photo' ? Math.sin(f * PI) : 0; });
      leaf.rotation.y = Math.sin(lt * 0.5) * 0.15;
      camera.position.set(0, 0, 8.5); camera.lookAt(0, 0.1, 0);
      st.draw(lt, dur);
    };
  }

  // Corte de tronco con anillos.
  function ringsScene(canvas) {
    const st = stage(canvas, { bg: 0x2a2018, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#d8b07a'; g.fillRect(0, 0, 512, 512);
    for (let i = 1; i < 30; i++) { g.strokeStyle = i % 2 ? 'rgba(120,70,30,.75)' : 'rgba(150,95,45,.5)'; g.lineWidth = 3; g.beginPath(); for (let a = 0; a <= PI * 2.01; a += 0.05) { const rr = i * 8 + (noise2(Math.cos(a) * 2 + i * 0.1, Math.sin(a) * 2) - 0.5) * 8; const x = 256 + Math.cos(a) * rr, y = 256 + Math.sin(a) * rr; a === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    const log = new T.Mesh(new T.CylinderGeometry(2.4, 2.4, 1.6, 48), [new T.MeshStandardMaterial({ color: 0x5a3a22, flatShading: true }), new T.MeshStandardMaterial({ map: new T.CanvasTexture(c) }), new T.MeshStandardMaterial({ color: 0x5a3a22 })]);
    log.rotation.x = PI / 2.4; scene.add(log);
    const hi = onGlow(new T.Mesh(new T.RingGeometry(0.62, 0.7, 64), new T.MeshBasicMaterial({ color: 0xffc94a, transparent: true, side: T.DoubleSide }))); hi.rotation.x = -PI / 2; hi.position.y = 0.81; log.add(hi);
    st.label({ text: '1 anillo = 1 año', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 50 });
    return (lt, dur) => {
      const s = 0.5 + ((lt * 0.8) % 1) * 3.2; hi.scale.setScalar(s); hi.material.opacity = 0.9;
      log.rotation.z = Math.sin(lt * 0.3) * 0.1;
      camera.position.set(0, 1, 9); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Hyperion (~116 m) junto a un edificio de unos 35 pisos.
  function hyperionScene(canvas) {
    const st = stage(canvas, { bg: 0x5fa0e0, fog: [0xa8d0f0, 60, 200], stars: false, focus: 0.37, hemi: 1.0, moon: 1.2 });
    const { scene, camera } = st;
    meadow(scene);
    const Tr = tree(scene, { h: 116 / 6, seed: 9, leaf: 0x2f7a3c }); Tr.g.position.x = -4;
    const bld = new T.Mesh(new T.BoxGeometry(5, 105 / 6, 5), new T.MeshStandardMaterial({ color: 0x8a96a8, flatShading: true })); bld.position.set(6, 105 / 12, 0); scene.add(bld);
    const person = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.3, 6), new T.MeshStandardMaterial({ color: 0xffc94a })); person.position.set(1, 0.15, 3); scene.add(person);
    st.label({ text: 'Hyperion: ~116 m', p: [-4, 116 / 6, 0], t0: 0.3, color: COL.green, size: 44 });
    st.label({ text: 'edificio de 35 pisos', p: [6, 105 / 6, 0], t0: (d) => d * 0.4, color: COL.white, size: 38 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      camera.position.set(0, lerp(6, 12, k), lerp(44, 50, k)); camera.lookAt(0, lerp(10, 11, k), 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'question', 'carbon', 'water', 'outro'].forEach((v) => reg(`arb_${v}`, (c) => treeScene(c, v)));
  reg('arb_pot', (c) => potScene(c));
  ['leaf', 'photo'].forEach((v) => reg(`arb_${v}`, (c) => leafScene(c, v)));
  reg('arb_rings', (c) => ringsScene(c));
  reg('arb_hyperion', (c) => hyperionScene(c));
})();
