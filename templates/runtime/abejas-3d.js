// Escenas 3D "¿Por qué los panales son hexágonos?" (abe_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, rng, stage, glowSprite, onGlow, tr } = K;

  K.addEN({
    'cera': 'wax', '~6–8 kg de miel\npor 1 kg de cera': '~6–8 kg of honey\nper 1 kg of wax', 'huecos': 'gaps', 'sin huecos': 'no gaps',
    'triángulo': 'triangle', 'cuadrado': 'square', 'hexágono': 'hexagon', 'borde (misma área)': 'border (same area)',
    'menos cera': 'less wax', '1999: Thomas Hales lo demuestra': '1999: Thomas Hales proves it', 'miel': 'honey', 'crías': 'larvae',
    'dos capas, espalda con espalda': 'two layers, back to back', '1/12 de cucharadita': '1/12 of a teaspoon', 'en toda su vida': 'in its whole life',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };
  const WAX = 0xe8b84a, HONEY = 0xffa020;

  function bee(scene) {
    const g = new T.Group(); scene.add(g);
    const y = new T.MeshStandardMaterial({ color: 0xf2c23a, roughness: 0.6 }), b = new T.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
    for (let i = 0; i < 5; i++) { const s = new T.Mesh(new T.SphereGeometry(0.22 - Math.abs(i - 2) * 0.03, 12, 8), i % 2 ? b : y); s.scale.set(0.55, 1, 1); s.position.x = -0.12 * i; g.add(s); }
    const head = new T.Mesh(new T.SphereGeometry(0.15, 10, 8), b); head.position.x = 0.2; g.add(head);
    const wm = new T.MeshStandardMaterial({ color: 0xdfeaff, transparent: true, opacity: 0.55, side: T.DoubleSide });
    const wings = [-1, 1].map((s) => { const p = new T.Group(); p.position.set(-0.05, 0.18, s * 0.08); g.add(p); const w = new T.Mesh(new T.CircleGeometry(0.28, 12), wm); w.scale.set(1.4, 0.6, 1); w.rotation.x = PI / 2; w.position.set(-0.15, 0, s * 0.25); p.add(w); return { p, s }; });
    return { g, flap: (lt) => wings.forEach(({ p, s }) => { p.rotation.x = s * (0.4 + 0.5 * Math.sin(lt * 40)); }) };
  }

  // Panal: celdas hexagonales (tubos de 6 lados), algunas con miel o crías.
  function comb(scene, { cols = 13, rows = 15, r = 0.36, depth = 0.9, seed = 2, fill = 0.4, larvae = 0, z = 0 } = {}) {
    const g = new T.Group(); g.position.z = z; scene.add(g);
    const cell = new T.CylinderGeometry(r, r, depth, 6, 1, true); cell.rotateX(PI / 2); cell.rotateZ(PI / 6);
    const n = cols * rows;
    const walls = new T.InstancedMesh(cell, new T.MeshStandardMaterial({ color: WAX, flatShading: true, roughness: 0.5, side: T.DoubleSide }), n);
    const cap = new T.CylinderGeometry(r * 0.92, r * 0.92, 0.05, 6); cap.rotateX(PI / 2); cap.rotateZ(PI / 6);
    const honey = new T.InstancedMesh(cap, new T.MeshStandardMaterial({ color: HONEY, emissive: 0xa05000, emissiveIntensity: 0.12, roughness: 0.35 }), n);
    const grub = new T.SphereGeometry(r * 0.55, 10, 8);
    const kids = new T.InstancedMesh(grub, new T.MeshStandardMaterial({ color: 0xf6f0e0 }), n);
    const m = new T.Matrix4(); const r2 = rng(seed); let hc = 0, kc = 0;
    const dx = r * Math.sqrt(3), dy = r * 1.5;
    let i = 0;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = (col - cols / 2) * dx + (row % 2) * dx / 2, y = (row - rows / 2) * dy;
      m.makeTranslation(x, y, 0); walls.setMatrixAt(i++, m);
      const q = r2();
      if (q < fill) { m.makeTranslation(x, y, depth * (0.1 + r2() * 0.3)); honey.setMatrixAt(hc++, m); }
      else if (q < fill + larvae) { m.makeTranslation(x, y, depth * 0.1); kids.setMatrixAt(kc++, m); }
    }
    honey.count = hc; kids.count = kc;
    g.add(walls, honey, kids);
    return { g, honey, kids };
  }

  function combScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x2a1a08, fog: [0x2a1a08, 8, 24], stars: false, focus: 0.37, hemi: 0.9, moon: 1.2 });
    const { scene, camera } = st;
    const warm = new T.PointLight(0xffb040, 0.7, 20); warm.position.set(2, 2, 5); scene.add(warm);
    const C = comb(scene, { fill: variant === 'uses' ? 0.35 : 0.45, larvae: variant === 'uses' ? 0.25 : 0 });
    const bees = [0, 1, 2].map(() => bee(scene));
    if (variant === 'uses') {
      st.label({ text: 'miel', p: [-1.2, 0.5, 0.6], t0: 0.4, color: COL.gold, size: 42 });
      st.label({ text: 'crías', p: [1.2, -0.6, 0.6], t0: (d) => d * 0.4, color: COL.white, size: 42, dy: -150 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      bees.forEach((b, i) => { const a = lt * (0.6 + i * 0.2) + i * 2; b.g.position.set(Math.cos(a) * (1.5 + i * 0.6), Math.sin(a * 1.3) * 1.2, 1.4 + i * 0.3); b.g.rotation.y = -a; b.flap(lt + i); });
      camera.position.set(lerp(-1.5, 1.0, k), lerp(0.8, 0.3, k), lerp(9.5, 8.5, k)); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Figuras planas: círculos con huecos; triángulos, cuadrados y hexágonos sin huecos; borde comparado.
  function shapesScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x1a1208, fog: null, stars: false, focus: 0.38, hemi: 1.0 });
    const { scene, camera } = st;
    const mat = (c) => new T.MeshStandardMaterial({ color: c, flatShading: true, side: T.DoubleSide });
    const edge = new T.LineBasicMaterial({ color: 0x3a2408 });
    const tile = (geo, x, y, c, rot = 0) => { const m = new T.Mesh(geo, mat(c)); m.position.set(x, y, 0); m.rotation.z = rot; scene.add(m); const e = new T.LineSegments(new T.EdgesGeometry(geo), edge); e.position.copy(m.position); e.rotation.z = rot; scene.add(e); return [m, e]; };
    const groups = [];
    if (variant === 'circles') {
      const r = 0.45; const items = [];
      const bg = new T.Mesh(new T.PlaneGeometry(6, 6), mat(0xd84a3a)); bg.position.z = -0.01; scene.add(bg);
      for (let row = -3; row <= 3; row++) for (let col = -3; col <= 3; col++) items.push(...tile(new T.CircleGeometry(r, 32), col * 0.9, row * 0.9, WAX));
      groups.push(items);
      st.label({ text: 'huecos', p: [0.45, 0.45, 0], t0: (d) => d * 0.4, color: '#ff8a7a', size: 46 });
    } else {
      // Tres mosaicos de igual área por pieza, uno debajo del otro.
      const A = 0.5;
      const triS = Math.sqrt(4 * A / Math.sqrt(3)), sqS = Math.sqrt(A), hexR = Math.sqrt(2 * A / (3 * Math.sqrt(3)));
      const rowsY = [2.2, 0, -2.2], names = ['triángulo', 'cuadrado', 'hexágono'], perims = [3 * triS, 4 * sqS, 6 * hexR];
      const g0 = [], g1 = [], g2 = [];
      for (let i = -5; i <= 5; i++) for (let j = 0; j < 2; j++) {
        const x = i * triS / 2, y = rowsY[0] + (j - 0.5) * triS * 0.866, up = (i + j) % 2 === 0;
        g0.push(...tile(new T.CircleGeometry(triS / Math.sqrt(3), 3), x, y + (up ? -0.12 : 0.12), 0xd8a03a, up ? PI / 2 : -PI / 2));
      }
      for (let i = -4; i <= 4; i++) for (let j = 0; j < 2; j++) g1.push(...tile(new T.PlaneGeometry(sqS, sqS), i * sqS, rowsY[1] + (j - 0.5) * sqS, 0xe0b048));
      for (let i = -3; i <= 3; i++) for (let j = 0; j < 2; j++) g2.push(...tile(new T.CircleGeometry(hexR, 6), i * hexR * 1.5, rowsY[2] + (j - 0.5) * hexR * 1.732 + (i % 2 ? hexR * 0.866 : 0), WAX, 0));
      groups.push(g0, g1, g2);
      names.forEach((n, i) => st.label({ text: n, p: [-2.9, rowsY[i], 0], t0: 0.3 + i * 0.5, color: COL.white, size: 34, dy: 0, dx: 0 }));
      if (variant === 'shapes') st.label({ text: 'sin huecos', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.green, size: 48 });
      if (variant === 'less' || variant === 'proof') {
        const bars = perims.map((p, i) => { const b = onGlow(new T.Mesh(new T.BoxGeometry(1, 0.28, 0.1), new T.MeshBasicMaterial({ color: i === 2 ? 0x6ee08a : 0xff8a5a }))); b.position.set(2.8, rowsY[i], 0.2); scene.add(b); return { b, p }; });
        groups.push(bars);
        st.label({ text: 'borde (misma área)', screen: [760, 470], t0: 0.3, color: COL.white, size: 32 });
        st.label({ text: variant === 'proof' ? '1999: Thomas Hales lo demuestra' : 'menos cera', p: [2.8, rowsY[2], 0.2], t0: (d) => d * 0.45, color: COL.green, size: 40, dy: -150, dx: -120 });
      }
    }
    return (lt, dur) => {
      groups.forEach((g, gi) => g.forEach((o, i) => {
        if (o.b) { const p = smooth(prog(lt, 0.4 + gi * 0.1, 0.8)); o.b.scale.x = Math.max(0.001, o.p * 0.6 * p); o.b.position.x = 1.9 + o.p * 0.3 * p; return; }
        const p = outBack(prog(lt, 0.1 + gi * 0.5 + (i % 24) * 0.02, 0.4)); o.scale.setScalar(Math.max(0.001, p));
      }));
      camera.position.set(0, 0, 9.5); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  function waxScene(canvas) {
    const st = stage(canvas, { bg: 0x2a1a08, fog: null, stars: false, focus: 0.37, hemi: 0.9, moon: 1.2 });
    const { scene, camera } = st;
    const B = bee(scene); B.g.scale.setScalar(3); B.g.rotation.y = 0.5;
    const flakes = [];
    for (let i = 0; i < 6; i++) { const f = onGlow(new T.Mesh(new T.CircleGeometry(0.12, 6), new T.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0x806020, side: T.DoubleSide }))); scene.add(f); flakes.push({ f, ph: i / 6 }); }
    st.label({ text: 'cera', p: [-0.8, -0.8, 0.5], t0: 0.4, color: COL.gold, size: 44, dy: -150 });
    st.label({ text: '~6–8 kg de miel\npor 1 kg de cera', screen: [540, 470], t0: (d) => d * 0.45, color: COL.white, size: 40 });
    return (lt, dur) => {
      B.flap(lt); B.g.position.y = Math.sin(lt * 2) * 0.08;
      flakes.forEach((o, i) => { const f = (lt * 0.4 + o.ph) % 1; o.f.position.set(-0.4 - i * 0.12, -0.5 - f * 1.2, 0.4); o.f.material.opacity = 1; o.f.rotation.set(lt + i, lt * 1.3, 0); });
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.6, 0.6, k), 0.6, lerp(8.5, 7.8, k)); camera.lookAt(-0.3, -0.3, 0);
      st.draw(lt, dur);
    };
  }

  function doubleScene(canvas) {
    const st = stage(canvas, { bg: 0x2a1a08, fog: null, stars: false, focus: 0.37, hemi: 0.9, moon: 1.2 });
    const { scene, camera } = st;
    const a = comb(scene, { cols: 7, rows: 9, fill: 0.5, z: 0.48 }), b = comb(scene, { cols: 7, rows: 9, fill: 0.5, z: -0.48, seed: 7 });
    b.g.rotation.y = PI; b.g.position.x = 0.31;
    const mid = new T.Mesh(new T.PlaneGeometry(6, 7), new T.MeshStandardMaterial({ color: 0xc8942a, side: T.DoubleSide })); scene.add(mid);
    st.label({ text: 'dos capas, espalda con espalda', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 42 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const ang = lerp(0.2, 1.35, k);
      camera.position.set(Math.sin(ang) * 9, 1.2, Math.cos(ang) * 9); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  function spoonScene(canvas) {
    const st = stage(canvas, { bg: 0x2a1a08, fog: null, stars: false, focus: 0.37, hemi: 0.9, moon: 1.2 });
    const { scene, camera } = st;
    const metal = new T.MeshStandardMaterial({ color: 0xd8dde6, metalness: 0.7, roughness: 0.25 });
    const bowl = new T.Mesh(new T.SphereGeometry(0.8, 24, 12, 0, PI * 2, PI / 2, PI / 2), metal); bowl.scale.set(1, 0.35, 0.65); scene.add(bowl);
    const handle = new T.Mesh(new T.BoxGeometry(2.6, 0.06, 0.2), metal); handle.position.set(-2.0, 0.15, 0); handle.rotation.z = 0.08; scene.add(handle);
    const drop = onGlow(new T.Mesh(new T.SphereGeometry(0.2, 16, 12), new T.MeshStandardMaterial({ color: HONEY, emissive: 0xa05000, emissiveIntensity: 0.5, roughness: 0.1 })));
    drop.scale.set(1, 0.45, 1); drop.position.set(0.15, -0.12, 0); scene.add(drop);
    const B = bee(scene); B.g.scale.setScalar(1.6); B.g.position.set(1.2, 1.2, 0.4); B.g.rotation.y = 2.6;
    st.label({ text: '1/12 de cucharadita', p: [0.15, 0, 0], t0: (d) => d * 0.3, color: COL.gold, size: 44, dy: -170 });
    st.label({ text: 'en toda su vida', screen: [540, 470], t0: (d) => d * 0.55, color: COL.white, size: 42 });
    return (lt, dur) => {
      B.flap(lt); B.g.position.y = 1.2 + Math.sin(lt * 2) * 0.1;
      const p = outBack(prog(lt, 0.3, 0.8)); drop.scale.set(p, 0.45 * p, p); drop.visible = p > 0.01;
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.5, 0.5, k), 1.6, lerp(4.4, 3.9, k)); camera.lookAt(0, 0.1, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'uses', 'outro'].forEach((v) => reg(`abe_${v}`, (c) => combScene(c, v)));
  ['circles', 'shapes', 'less', 'proof'].forEach((v) => reg(`abe_${v}`, (c) => shapesScene(c, v)));
  reg('abe_wax', (c) => waxScene(c));
  reg('abe_double', (c) => doubleScene(c));
  reg('abe_spoon', (c) => spoonScene(c));
})();
