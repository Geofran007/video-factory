// Escenas 3D "¿Cómo se forman las cuevas y las estalactitas?" (cue_*). Diseño propio con Three.js r149.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow } = K;

  K.addEN({
    'lluvia + CO₂ = ácido suave': 'rain + CO₂ = weak acid', 'roca caliza': 'limestone', 'disuelve las grietas': 'it dissolves the cracks',
    'miles de años': 'thousands of years', 'calcita': 'calcite', 'estalactita': 'stalactite', 'estalagmita': 'stalagmite', 'columna': 'column',
    '~1–2 cm por siglo': '~1–2 cm per century', 'rascacielos de 40 pisos': '40-story skyscraper', 'Son Doong, Vietnam': 'Son Doong, Vietnam',
    'selva propia': 'its own jungle',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };
  const STONE = 0xd8c8a8;

  // Estalactita / estalagmita cónica con anillos de crecimiento.
  function spike(h, r, down = true, seed = 1) {
    const geo = new T.ConeGeometry(r, h, 9, 6); geo.translate(0, h / 2, 0);
    const p = geo.attributes.position; const rr = rng(seed);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0.01 && y < h - 0.01) { const k = 1 + (rr() - 0.5) * 0.25; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } }
    if (down) geo.rotateX(PI);
    geo.computeVertexNormals();
    return new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xe8dcc0, flatShading: true, roughness: 0.6 }));
  }

  function caveRoom(scene, seed = 4) {
    const shell = new T.Mesh(new T.SphereGeometry(9, 32, 20), new T.MeshStandardMaterial({ color: 0x8a7a62, flatShading: true, side: T.BackSide, roughness: 1 }));
    const p = shell.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (noise2(p.getX(i) * 0.4, p.getY(i) * 0.4 + p.getZ(i) * 0.3) - 0.5) * 0.35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.55, p.getZ(i) * k); }
    shell.geometry.computeVertexNormals(); scene.add(shell);
    const floor = new T.Mesh(new T.CircleGeometry(9, 40), new T.MeshStandardMaterial({ color: 0x6a5a48, roughness: 1 })); floor.rotation.x = -PI / 2; floor.position.y = -2.5; scene.add(floor);
    const pool = new T.Mesh(new T.CircleGeometry(2.2, 32), new T.MeshStandardMaterial({ color: 0x2a6a8a, roughness: 0.1, metalness: 0.2 })); pool.rotation.x = -PI / 2; pool.position.set(1.5, -2.48, -1.5); scene.add(pool);
    const r = rng(seed);
    for (let i = 0; i < 40; i++) { const h = 0.6 + r() * 2.2; const s = spike(h, 0.12 + h * 0.08, true, i); s.position.set((r() - 0.5) * 12, 4.2 - r() * 0.6, -r() * 7 + 1); scene.add(s); }
    for (let i = 0; i < 22; i++) { const h = 0.4 + r() * 1.6; const s = spike(h, 0.18 + h * 0.12, false, i + 50); s.position.set((r() - 0.5) * 12, -2.5, -r() * 7 + 1); scene.add(s); }
    const lamp = new T.PointLight(0xffc880, 1.6, 18); lamp.position.set(-1.5, 0.5, 3); scene.add(lamp);
    const lg = glowSprite(0xffc880, 1.4, 0.8); lg.position.copy(lamp.position); scene.add(lg);
    return lamp;
  }

  function insideScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0a0806, fog: [0x0a0806, 6, 20], stars: false, focus: 0.37, hemi: 0.35, moon: 0.3 });
    const { scene, camera } = st;
    caveRoom(scene);
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-1.5, 1.0, k), 0.2, lerp(6, 4.5, k)); camera.lookAt(0, 0.6, -3);
      st.draw(lt, dur);
    };
  }

  // Corte de una colina de caliza: lluvia que se filtra por grietas y agranda la cueva con el tiempo.
  function hillScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x2a4a6a, fog: null, stars: false, focus: 0.38, hemi: 0.9, moon: 1.0 });
    const { scene, camera } = st;
    const BX = 3.2, BZ = 1.2, TOP = 1.6, BOT = -2.6;
    const rock = new T.Mesh(new T.BoxGeometry(BX * 2, TOP - BOT, BZ * 2), new T.MeshStandardMaterial({ color: STONE, flatShading: true, transparent: true, opacity: 0.92 }));
    rock.position.y = (TOP + BOT) / 2; scene.add(rock);
    const soil = new T.Mesh(new T.BoxGeometry(BX * 2, 0.25, BZ * 2), new T.MeshStandardMaterial({ color: 0x4a8a3c, flatShading: true })); soil.position.y = TOP + 0.12; scene.add(soil);
    // Grietas en la cara frontal
    const cracks = [];
    const r = rng(6);
    for (let i = 0; i < 6; i++) {
      const pts = []; let x = -2.4 + i * 0.95, y = TOP;
      while (y > -0.8) { pts.push(new T.Vector3(x, y, BZ + 0.01)); x += (r() - 0.5) * 0.35; y -= 0.25; }
      const l = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x5a4a38 })); scene.add(l); cracks.push(pts);
    }
    // Cueva: elipse oscura que crece
    const cave = new T.Mesh(new T.CircleGeometry(1, 40), new T.MeshBasicMaterial({ color: 0x1a120a })); cave.position.set(0, -1.2, BZ + 0.02); scene.add(cave);
    const drops = [];
    for (let i = 0; i < 70; i++) { const s = glowSprite(0x6ab8ff, 0.18, 1); scene.add(s); drops.push({ s, c: cracks[i % cracks.length], ph: r() }); }
    const rain = [];
    const rm = new T.LineBasicMaterial({ color: 0x9fc8ff, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 60; i++) { const l = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, -0.3, 0)]), rm); scene.add(l); rain.push({ l, x: (r() - 0.5) * 6, z: (r() - 0.5) * 2, ph: r() }); }
    if (variant === 'rain') st.label({ text: 'lluvia + CO₂ = ácido suave', screen: [540, 470], t0: 0.3, color: COL.blue, size: 40 });
    if (variant === 'rain' || variant === 'acid') st.label({ text: 'roca caliza', p: [2.2, 0, BZ], t0: 0.6, color: COL.white, size: 38, dy: -120 });
    if (variant === 'acid') st.label({ text: 'disuelve las grietas', p: [-0.5, 0.4, BZ], t0: (d) => d * 0.35, color: COL.gold, size: 40 });
    if (variant === 'carve') st.label({ text: 'miles de años', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 48 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      rain.forEach((o) => { const f = (lt * 1.2 + o.ph) % 1; o.l.position.set(o.x, 5 - f * 3.2, o.z); o.l.visible = variant !== 'carve' || f < 2; });
      const inflow = variant === 'rain' ? smooth(prog(lt, dur * 0.4, dur * 0.4)) : 1;
      drops.forEach((o) => { const f = (lt * 0.3 + o.ph) % 1; const idx = Math.min(o.c.length - 1, Math.floor(f * o.c.length)); o.s.position.copy(o.c[idx]); o.s.position.z += 0.05; o.s.material.opacity = inflow; });
      const size = variant === 'carve' ? lerp(0.3, 1.6, smooth(prog(lt, 0.2, dur * 0.8))) : variant === 'acid' ? 0.3 + 0.15 * k : 0.2;
      cave.scale.set(size * 1.4, size * 0.8, 1);
      camera.position.set(lerp(-0.6, 0.6, k), 1.2, lerp(11, 10, k)); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Gota en el techo que deja calcita: crecen estalactita y estalagmita hasta unirse en una columna.
  function dripScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0a0806, fog: null, stars: false, focus: 0.38, hemi: 0.45, moon: 0.4 });
    const { scene, camera } = st;
    const ceil = new T.Mesh(new T.BoxGeometry(8, 0.6, 4), new T.MeshStandardMaterial({ color: 0x8a7a62, flatShading: true })); ceil.position.y = 2.6; scene.add(ceil);
    const floor = new T.Mesh(new T.BoxGeometry(8, 0.6, 4), new T.MeshStandardMaterial({ color: 0x6a5a48, flatShading: true })); floor.position.y = -2.6; scene.add(floor);
    const lamp = new T.PointLight(0xffc880, 1.6, 14); lamp.position.set(-2, 0.5, 3); scene.add(lamp);
    const GAP = 4.6;
    const tite = spike(1, 0.3, true, 3); tite.position.y = 2.3; scene.add(tite);
    const mite = spike(1, 0.45, false, 7); mite.position.y = -2.3; scene.add(mite);
    const drop = onGlow(new T.Mesh(new T.SphereGeometry(0.09, 12, 8), new T.MeshStandardMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.9 }))); scene.add(drop);
    const ring = onGlow(new T.Mesh(new T.TorusGeometry(0.12, 0.025, 6, 20), new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true }))); ring.rotation.x = PI / 2; scene.add(ring);
    const grow = { drip: [0.05, 0.08, 0.02], stalactite: [0.1, 0.55, 0.05], stalagmite: [0.55, 0.6, 0.1], column: [0.6, 1, 1], slow: [0.2, 0.7, 0.4] }[variant];
    if (variant === 'drip') st.label({ text: 'calcita', p: [0, 2.25, 0], t0: (d) => d * 0.4, color: COL.gold, size: 42, dx: 140 });
    if (variant === 'stalactite') st.label({ text: 'estalactita', p: () => [0, 2.3 - tite.scale.y * 0.6, 0], t0: (d) => d * 0.4, color: COL.white, size: 42, dx: 150 });
    if (variant === 'stalagmite') st.label({ text: 'estalagmita', p: () => [0, -2.3 + mite.scale.y * 0.6, 0], t0: (d) => d * 0.4, color: COL.white, size: 42, dx: 150, dy: -120 });
    if (variant === 'column') st.label({ text: 'columna', p: [0, 0, 0], t0: (d) => d * 0.65, color: COL.gold, size: 46, dx: 150 });
    if (variant === 'slow') st.label({ text: '~1–2 cm por siglo', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 48 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const [a0, b0] = [grow[0], grow[0] + (grow[1] - grow[0]) * k];
      const ht = lerp(0.15, GAP * 0.55, Math.min(1, b0 / 0.6 + 0.05)), hm = variant === 'stalactite' || variant === 'drip' ? 0.05 : lerp(0.15, GAP * 0.45, clamp((b0 - 0.4) / 0.6));
      tite.scale.set(1, Math.max(0.05, ht), 1); mite.scale.set(1, Math.max(0.05, hm), 1);
      const tipY = 2.3 - ht, baseY = -2.3 + hm;
      const join = variant === 'column' && tipY - baseY < 0.15;
      const f = (lt * 0.7) % 1;
      drop.visible = !join; drop.position.set(0, lerp(tipY - 0.05, baseY + 0.05, f < 0.35 ? 0 : (f - 0.35) / 0.65), 0); drop.scale.setScalar(f < 0.35 ? 0.4 + f * 1.7 : 1);
      ring.position.set(0, tipY + 0.02, 0); ring.material.opacity = variant === 'drip' ? 0.5 + 0.5 * Math.sin(lt * 4) : 0;
      if (variant === 'column') { tite.scale.y = Math.max(0.05, Math.min(GAP * 0.55, ht)); mite.scale.y = Math.min(GAP - tite.scale.y, mite.scale.y + (k > 0.6 ? (k - 0.6) * 4 : 0)); }
      camera.position.set(lerp(-1, 1, k), 0.0, 9); camera.lookAt(0, -1.3, 0);
      st.draw(lt, dur);
    };
  }

  // Cueva gigante (estilo Son Doong) con un rascacielos de 40 pisos dentro y su propia selva.
  function giantScene(canvas) {
    const st = stage(canvas, { bg: 0x0e0c08, fog: [0x2a2a22, 20, 80], stars: false, focus: 0.37, hemi: 0.6, moon: 0.6 });
    const { scene, camera } = st;
    const shell = new T.Mesh(new T.CylinderGeometry(30, 30, 120, 24, 8, true), new T.MeshStandardMaterial({ color: 0x6a5e4a, flatShading: true, side: T.BackSide }));
    shell.rotation.z = PI / 2; shell.scale.set(1, 1, 0.75); scene.add(shell);
    const p = shell.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (noise2(p.getX(i) * 0.08, p.getY(i) * 0.08 + p.getZ(i) * 0.05) - 0.5) * 0.3; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
    shell.geometry.computeVertexNormals();
    const shaft = new T.SpotLight(0xfff2d0, 3.5, 120, 0.35, 0.6); shaft.position.set(6, 40, -10); shaft.target.position.set(4, -18, -12); scene.add(shaft, shaft.target);
    const beam = new T.Mesh(new T.CylinderGeometry(3, 9, 50, 24, 1, true), new T.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.08, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    beam.position.set(5, 6, -11); scene.add(beam);
    const r = rng(3);
    for (let i = 0; i < 40; i++) { const t = new T.Mesh(new T.IcosahedronGeometry(1 + r() * 1.5, 0), new T.MeshStandardMaterial({ color: 0x2f7a34, flatShading: true })); t.position.set(2 + (r() - 0.5) * 14, -18 + r() * 2, -12 + (r() - 0.5) * 10); scene.add(t); }
    const bld = new T.Group(); bld.position.set(-8, -20, -6); scene.add(bld);
    const H40 = 26;
    const bm = new T.Mesh(new T.BoxGeometry(5, H40, 5), new T.MeshStandardMaterial({ color: 0x8a96a8, flatShading: true })); bm.position.y = H40 / 2; bld.add(bm);
    const win = new T.MeshBasicMaterial({ color: 0xffe0a0 });
    for (let f = 0; f < 40; f++) for (let w = 0; w < 5; w++) { const m = new T.Mesh(new T.PlaneGeometry(0.6, 0.3), win); m.position.set(-2 + w, 0.4 + f * (H40 - 0.8) / 40, 2.51); bld.add(m); }
    st.label({ text: 'rascacielos de 40 pisos', p: [-8, -20 + H40, -6], t0: (d) => d * 0.35, color: COL.white, size: 38 });
    st.label({ text: 'selva propia', p: [3, -17, -12], t0: (d) => d * 0.55, color: COL.green, size: 38, dy: -120 });
    st.label({ text: 'Son Doong, Vietnam', screen: [540, 1000], t0: 0.3, color: COL.gold, size: 46 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(28, 24, k), 4, lerp(26, 22, k)); camera.lookAt(-3, -5, -8);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  reg('cue_hook', (c) => insideScene(c, 'hook'));
  reg('cue_outro', (c) => insideScene(c, 'outro'));
  ['rain', 'acid', 'carve'].forEach((v) => reg(`cue_${v}`, (c) => hillScene(c, v)));
  ['drip', 'stalactite', 'stalagmite', 'column', 'slow'].forEach((v) => reg(`cue_${v}`, (c) => dripScene(c, v)));
  reg('cue_giant', (c) => giantScene(c));
})();
