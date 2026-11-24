// Escenas 3D "¿Cómo se forma un diamante?" (dia_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow, space, sphere } = K;

  K.addEN({
    'solo carbono': 'just carbon', 'grafito (lápiz)': 'graphite (pencil)', 'diamante': 'diamond', 'capas que resbalan': 'sliding layers',
    'red 3D muy firme': 'rock-solid 3D network', '~150 km de profundidad': '~150 km deep', 'presión enorme + ~1.000 °C': 'huge pressure + ~1,000 °C',
    '1.000 a 3.500 millones de años': '1 to 3.5 billion years old', 'erupción profunda (kimberlita)': 'deep eruption (kimberlite)',
    'raya casi todo': 'scratches almost anything', 'estrella enana blanca': 'white dwarf star', 'núcleo de carbono cristalizado': 'crystallized carbon core',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  function gem(scene, r = 1) {
    const geo = new T.CylinderGeometry(r * 0.62, r, r * 0.35, 8, 1); geo.translate(0, r * 0.18, 0);
    const pav = new T.ConeGeometry(r, r * 0.95, 8); pav.rotateX(PI); pav.translate(0, -r * 0.47, 0);
    const mat = new T.MeshPhysicalMaterial ? new T.MeshPhysicalMaterial({ color: 0xe8f6ff, metalness: 0.1, roughness: 0.02, transparent: true, opacity: 0.82, flatShading: true, emissive: 0x3a5a7a, emissiveIntensity: 0.3 }) : new T.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.82, flatShading: true });
    const g = new T.Group(); g.add(new T.Mesh(geo, mat)); g.add(new T.Mesh(pav, mat)); scene.add(g);
    const sparks = []; for (let i = 0; i < 6; i++) { const s = glowSprite(0xffffff, r * 0.8, 0); g.add(s); sparks.push({ s, ph: i * 1.1, p: new T.Vector3(Math.cos(i) * r * 0.6, r * 0.3, Math.sin(i) * r * 0.6) }); }
    return { g, twinkle: (lt) => sparks.forEach((o) => { o.s.position.copy(o.p); o.s.material.opacity = Math.max(0, Math.sin(lt * 3 + o.ph)) ** 6; }) };
  }

  function gemScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0a0e18, fog: null, stars: false, focus: 0.37, hemi: 0.9, moon: 1.2 });
    const { scene, camera } = st;
    const spot = new T.PointLight(0xffffff, 2.5, 20); spot.position.set(2, 4, 4); scene.add(spot);
    const G = gem(scene, 1.4);
    let glass = null, scratch = null;
    if (variant === 'hard') {
      G.g.scale.setScalar(0.5);
      glass = new T.Mesh(new T.BoxGeometry(4, 0.1, 2.4), new T.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35 })); glass.position.y = -0.8; scene.add(glass);
      scratch = onGlow(new T.Mesh(new T.BoxGeometry(1, 0.02, 0.03), new T.MeshBasicMaterial({ color: 0xffffff }))); scratch.position.y = -0.74; scene.add(scratch);
      st.label({ text: 'raya casi todo', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.blue, size: 46 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      G.twinkle(lt); G.g.rotation.y = lt * 0.5;
      if (variant === 'hard') { const f = smooth(prog(lt, 0.4, dur * 0.6)); G.g.position.set(lerp(-1.6, 1.6, f), -0.45, 0); G.g.rotation.x = PI; scratch.scale.x = Math.max(0.01, f * 3.2); scratch.position.x = lerp(-1.6, 0, f); }
      camera.position.set(0, 1.2, lerp(9.5, 8.5, k)); camera.lookAt(0, -0.2, 0);
      st.draw(lt, dur);
    };
  }

  // Átomos: grafito en capas vs. diamante en red 3D.
  function atomsScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const atom = (p, c = 0x3a3a42) => { const m = new T.Mesh(new T.SphereGeometry(0.16, 14, 10), new T.MeshStandardMaterial({ color: c, roughness: 0.4 })); m.position.copy(p); return m; };
    const bond = (a, b, col = 0x8fd0ff) => { const l = new T.Line(new T.BufferGeometry().setFromPoints([a, b]), new T.LineBasicMaterial({ color: col })); return l; };
    const graphite = new T.Group(), diamond = new T.Group(); scene.add(graphite, diamond);
    // Grafito: 3 capas de hexágonos
    for (let L = 0; L < 3; L++) { const y = L * 0.7; const pts = []; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const x = i * 0.6 + (j % 2) * 0.3, z = j * 0.52; pts.push(new T.Vector3(x, y, z)); } pts.forEach((p) => graphite.add(atom(p))); for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (pts[i].distanceTo(pts[j]) < 0.62) graphite.add(bond(pts[i], pts[j])); }
    // Diamante: red cúbica tipo diamante
    const dp = []; const base = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0], [0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) base.forEach(([x, y, z]) => dp.push(new T.Vector3((x + a) * 1.2 - 1.2, (y + b) * 1.2 - 1.2, (z + c) * 1.2 - 1.2)));
    dp.forEach((p) => diamond.add(atom(p, 0x8fd0ff)));
    for (let i = 0; i < dp.length; i++) for (let j = i + 1; j < dp.length; j++) if (dp[i].distanceTo(dp[j]) < 0.55) diamond.add(bond(dp[i], dp[j], 0xffffff));
    if (variant === 'carbon') { graphite.visible = false; diamond.position.x = 0; st.label({ text: 'solo carbono', screen: [540, 1000], t0: 0.3, color: COL.white, size: 48 }); }
    else { graphite.position.set(-1.7, -0.6, 0); diamond.position.set(1.7, 0, 0); diamond.scale.setScalar(0.75); graphite.scale.setScalar(0.75);
      st.label({ text: 'grafito (lápiz)', p: [-1.7, 1.4, 0], t0: 0.3, color: COL.white, size: 36 }); st.label({ text: 'diamante', p: [1.7, 1.4, 0], t0: 0.6, color: COL.blue, size: 36 });
      st.label({ text: 'capas que resbalan', p: [-1.7, -0.8, 0], t0: (d) => d * 0.4, color: COL.white, size: 32, dy: -140 }); st.label({ text: 'red 3D muy firme', p: [1.7, -1.0, 0], t0: (d) => d * 0.55, color: COL.blue, size: 32, dy: -140 }); }
    return (lt, dur) => {
      diamond.rotation.set(0.4, lt * 0.4, 0); graphite.rotation.set(0.3, lt * 0.3, 0);
      graphite.children.forEach((c, i) => { if (c.isMesh && variant === 'graphite') c.position.x += Math.sin(lt * 2 + Math.floor(c.position.y / 0.7)) * 0.002; });
      camera.position.set(0, 0.8, 8); camera.lookAt(0, 0.2, 0);
      st.draw(lt, dur);
    };
  }

  // Corte de la Tierra: el diamante se forma a ~150 km y sube en una erupción profunda.
  function deepScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, stars: false, focus: 0.38, hemi: 0.9, moon: 1.0 });
    const { scene, camera } = st;
    const layer = (y0, y1, c) => { const m = new T.Mesh(new T.BoxGeometry(7, y1 - y0, 2), new T.MeshStandardMaterial({ color: c, flatShading: true })); m.position.y = (y0 + y1) / 2; scene.add(m); return m; };
    layer(-0.3, 0, 0x5a9a4a); layer(-1.8, -0.3, 0x8a6a4a); layer(-4.6, -1.8, 0xb0502a);
    const glowM = glowSprite(0xff6a2a, 6, 0.4); glowM.position.set(0, -3.6, 1); scene.add(glowM);
    const g = gem(scene, 0.3); g.g.position.set(0, -3.6, 1.1);
    const arrows = [];
    if (variant === 'pressure') for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; const ar = new T.ArrowHelper(new T.Vector3(-Math.cos(a), -Math.sin(a), 0), new T.Vector3(Math.cos(a) * 1.4, -3.6 + Math.sin(a) * 1.4, 1.1), 0.9, 0xffc94a, 0.3, 0.2); onGlow(ar); scene.add(ar); arrows.push(ar); }
    let pipe = null;
    if (variant === 'pipe') { pipe = onGlow(new T.Mesh(new T.CylinderGeometry(0.3, 0.6, 4.6, 16), new T.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.7 }))); pipe.position.set(0, -2.3, 1.05); scene.add(pipe); st.label({ text: 'erupción profunda (kimberlita)', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.orange, size: 40 }); }
    if (variant === 'deep') st.label({ text: '~150 km de profundidad', p: [0, -3.6, 1.1], t0: (d) => d * 0.35, color: COL.white, size: 42, dx: 180 });
    if (variant === 'pressure') st.label({ text: 'presión enorme + ~1.000 °C', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 42 });
    if (variant === 'age') st.label({ text: '1.000 a 3.500 millones de años', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 40 });
    return (lt, dur) => {
      g.twinkle(lt); g.g.rotation.y = lt;
      arrows.forEach((a, i) => { const p = 0.5 + 0.5 * Math.sin(lt * 4 + i); a.scale.setScalar(0.7 + 0.3 * p); });
      if (variant === 'pipe') { const f = smooth(prog(lt, 0.4, dur * 0.6)); g.g.position.y = lerp(-3.6, 0.2, f); pipe.material.opacity = 0.7 * (1 - f * 0.6); }
      camera.position.set(0, -2.4, 10.5); camera.lookAt(0, -3.0, 0);
      st.draw(lt, dur);
    };
  }

  // Enana blanca con núcleo de carbono cristalizado (BPM 37093, apodada "Lucy").
  function starScene(canvas) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const star = onGlow(new T.Mesh(new T.SphereGeometry(1.6, 40, 24), new T.MeshBasicMaterial({ color: 0xe8f2ff, transparent: true, opacity: 0.55 }))); scene.add(star);
    scene.add(glowSprite(0xbfd8ff, 7, 0.6));
    const g = gem(scene, 0.8);
    st.label({ text: 'estrella enana blanca', screen: [540, 470], t0: 0.3, color: COL.white, size: 42 });
    st.label({ text: 'núcleo de carbono cristalizado', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.blue, size: 40 });
    return (lt, dur) => {
      g.twinkle(lt); g.g.rotation.y = lt * 0.6; star.material.opacity = lerp(0.85, 0.35, smooth(prog(lt, dur * 0.3, dur * 0.4)));
      camera.position.set(0, 0.5, lerp(9, 7.5, smooth(clamp(lt / dur)))); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'hard', 'outro'].forEach((v) => reg(`dia_${v}`, (c) => gemScene(c, v)));
  ['carbon', 'graphite'].forEach((v) => reg(`dia_${v}`, (c) => atomsScene(c, v)));
  ['deep', 'pressure', 'age', 'pipe'].forEach((v) => reg(`dia_${v}`, (c) => deepScene(c, v)));
  reg('dia_star', (c) => starScene(c));
})();
