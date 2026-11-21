// Escenas 3D "¿Por qué el mar es salado?" (sal_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, ocean, glowSprite, onGlow } = K;

  K.addEN({
    'lluvia un poco ácida': 'slightly acidic rain', 'sodio': 'sodium', 'cloro': 'chlorine', 'río: muy poca sal': 'river: very little salt',
    'el agua se evapora': 'the water evaporates', 'la sal se queda': 'the salt stays', 'millones de años': 'millions of years',
    'fuente hidrotermal': 'hydrothermal vent', '1 litro': '1 liter', '≈ 35 g de sal': '≈ 35 g of salt',
    '≈ 150 m de sal': '≈ 150 m of salt', 'edificio de 40 pisos': '40-story building', 'mar': 'sea',
  });

  const NA = 0xffa040, CL = 0x6ee08a;
  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  // Diorama: montaña a la izquierda, río que baja, mar a la derecha.
  const SEA_X = 1.3;
  const relief = (x, z) => {
    const m = 2.6 * Math.exp(-(((x + 2.4) / 1.6) ** 2)) * (1 - 0.3 * Math.abs(z) / 2);
    const slope = x < SEA_X ? 0.15 + (SEA_X - x) * 0.08 : -0.6;
    const river = Math.exp(-((z / 0.35) ** 2)) * 0.35 * (x < SEA_X ? 1 : 0);
    return Math.max(slope, m + slope) - river + (noise2(x * 2, z * 2) - 0.5) * 0.25;
  };
  const riverPt = (t) => { const x = lerp(-2.3, SEA_X + 0.3, t); return [x, relief(x, 0) + 0.07, Math.sin(t * 5) * 0.08]; };

  function diorama(canvas, variant) {
    const st = stage(canvas, { fog: null, focus: 0.37, hemi: 0.9 });
    const { scene, camera } = st;
    const geo = new T.PlaneGeometry(8, 4, 80, 40); geo.rotateX(-PI / 2);
    const p = geo.attributes.position; const cols = new Float32Array(p.count * 3); const c = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = relief(x, z); p.setY(i, y);
      if (x >= SEA_X) c.set(0xc9b47e); else if (y > 1.4) c.set(0x7d7480); else if (y > 0.7) c.set(0x6b5a4c); else c.set(0x4c8a3c);
      c.offsetHSL(0, 0, (noise2(x * 5, z * 5) - 0.5) * 0.08); cols.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })));
    const sea = new T.Mesh(new T.BoxGeometry(4 - SEA_X, 0.9, 4), new T.MeshStandardMaterial({ color: 0x2f7fd0, transparent: true, opacity: 0.8, roughness: 0.2 }));
    sea.position.set((4 + SEA_X) / 2, -0.4, 0); scene.add(sea);
    const seaColor = new T.Color(0x2f7fd0), salty = new T.Color(0x3fa0c8);
    const rcurve = new T.CatmullRomCurve3(Array.from({ length: 20 }, (_, i) => new T.Vector3(...riverPt(i / 19))));
    scene.add(new T.Mesh(new T.TubeGeometry(rcurve, 80, 0.09, 6, false), new T.MeshStandardMaterial({ color: 0x4aa3ff, roughness: 0.2 })));
    // Nube y lluvia
    const cloud = new T.Group(); const cm = new T.MeshStandardMaterial({ color: 0xdfe4ee, flatShading: true });
    for (let i = 0; i < 6; i++) { const b = new T.Mesh(new T.IcosahedronGeometry(0.5 + (i % 3) * 0.12, 1), cm); b.position.set(-3 + i * 0.4, 4.3 + (i % 2) * 0.2, (i % 3 - 1) * 0.3); cloud.add(b); }
    scene.add(cloud);
    const r = rng(4); const drops = [];
    const dm = new T.LineBasicMaterial({ color: 0x9fc8ff, transparent: true, opacity: 0.7 });
    if (variant === 'rain' || variant === 'cycle') for (let i = 0; i < 60; i++) {
      const l = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, -0.25, 0)]), dm); scene.add(l);
      drops.push({ l, x: -3.2 + r() * 2.2, z: (r() - 0.5) * 2, ph: r() });
    }
    // Iones
    const ions = [];
    const nIons = variant === 'rocks' ? 30 : variant === 'rain' ? 10 : 26;
    for (let i = 0; i < nIons; i++) { const s = glowSprite(i % 2 ? CL : NA, 0.26, 1); scene.add(s); ions.push({ s, ph: r(), x: -3 + r() * 1.8, z: (r() - 0.5) * 1.6 }); }
    const seaSalt = [];
    if (variant === 'evap' || variant === 'cycle') for (let i = 0; i < 60; i++) { const s = glowSprite(i % 2 ? CL : NA, 0.2, 1); s.position.set(SEA_X + 0.3 + r() * 2.4, -0.1 - r() * 0.7, (r() - 0.5) * 3.6); scene.add(s); seaSalt.push({ s, t: r() }); }
    const vapor = [];
    if (variant === 'evap' || variant === 'cycle') for (let i = 0; i < 24; i++) { const s = glowSprite(0xffffff, 0.35, 0.5); scene.add(s); vapor.push({ s, x: SEA_X + 0.3 + r() * 2.4, z: (r() - 0.5) * 3, ph: r() }); }
    const sun = glowSprite(0xfff0b0, 2.2, 1); sun.position.set(3.2, 4.6, -1); sun.visible = variant === 'evap' || variant === 'cycle'; scene.add(sun);

    if (variant === 'rain') st.label({ text: 'lluvia un poco ácida', p: [-2.2, 3.8, 0], t0: 0.4, color: COL.blue, size: 40, dx: 160, dy: 40 });
    if (variant === 'rocks') {
      st.label({ text: 'sodio', p: () => ions[0].s.position.toArray(), t0: 0.6, color: COL.orange, size: 40 });
      st.label({ text: 'cloro', p: () => ions[1].s.position.toArray(), t0: (d) => d * 0.4, color: COL.green, size: 40, dy: -150 });
    }
    if (variant === 'rivers') st.label({ text: 'río: muy poca sal', p: riverPt(0.55), t0: (d) => d * 0.3, color: COL.blue, size: 40, dy: 150 });
    if (variant === 'evap') {
      st.label({ text: 'el agua se evapora', p: [2.6, 2.2, 0], t0: 0.4, color: COL.white, size: 38 });
      st.label({ text: 'la sal se queda', p: [2.6, -0.3, 1.5], t0: (d) => d * 0.5, color: COL.gold, size: 40, dy: -160 });
    }
    if (variant === 'cycle') st.label({ text: 'millones de años', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 50 });

    return (lt, dur) => {
      const speed = variant === 'cycle' ? 2.2 : 1;
      drops.forEach((o) => { const f = (lt * 1.3 * speed + o.ph) % 1; o.l.position.set(o.x, 4 - f * 3.5, o.z); });
      ions.forEach((o, i) => {
        if (variant === 'rocks' || variant === 'rain') {
          const f = clamp((lt - 0.3 - o.ph * dur * 0.5) / 1.2);
          const y = relief(o.x, o.z); o.s.position.set(o.x, y + 0.1 + Math.sin(f * PI) * 0.5, o.z);
          o.s.visible = f > 0; o.s.material.opacity = 1;
        } else if (variant === 'rivers' || variant === 'cycle') {
          const f = (lt * 0.18 * speed + o.ph) % 1; const q = riverPt(f); o.s.position.set(q[0], q[1] + 0.08, q[2] + (o.ph - 0.5) * 0.12);
          o.s.visible = true;
        } else o.s.visible = false;
      });
      const salt = variant === 'cycle' ? smooth(prog(lt, 0.2, dur * 0.8)) : variant === 'evap' ? smooth(prog(lt, dur * 0.3, dur * 0.6)) * 0.5 : 0;
      seaSalt.forEach((o) => { o.s.visible = o.t < salt + (variant === 'evap' ? 0.3 : 0.05); });
      sea.material.color.copy(seaColor).lerp(salty, salt);
      vapor.forEach((o) => { const f = (lt * 0.4 * speed + o.ph) % 1; o.s.position.set(o.x, 0.1 + f * 3.8, o.z); o.s.material.opacity = 0.5 * Math.sin(f * PI); });
      const k = smooth(clamp(lt / dur));
      if (variant === 'rocks') { camera.position.set(lerp(-4.2, -3.4, k), 4.6, 7.2); camera.lookAt(-2.2, 1.2, 0); }
      else { camera.position.set(lerp(-0.6, 0.2, k), 6.8, lerp(13.5, 12.8, k)); camera.lookAt(0.2, 1.1, 0); }
      st.draw(lt, dur);
    };
  }

  function hookScene(canvas, variant) {
    const st = stage(canvas, { fog: [0x0b1628, 14, 40], focus: 0.36 });
    const { scene, camera } = st;
    const sea = ocean(scene);
    const crystals = new T.Group(); scene.add(crystals);
    const mat = new T.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.25, emissive: 0x6a88b0, emissiveIntensity: 0.25, flatShading: true });
    const r = rng(2);
    for (let i = 0; i < 18; i++) { const b = new T.Mesh(new T.BoxGeometry(1, 1, 1), mat); const s = 0.3 + r() * 0.5; b.scale.setScalar(s); b.position.set((r() - 0.5) * 1.6, r() * 1.4, (r() - 0.5) * 1.2); b.rotation.set(r(), r(), r()); crystals.add(b); }
    const g = glowSprite(0xdfeaff, 4, 0.5); g.position.y = 0.8; crystals.add(g);
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      sea(lt);
      const k = smooth(clamp(lt / dur));
      crystals.position.y = variant === 'hook' ? lerp(-2, 0.1, outBack(prog(lt, 0.2, dur * 0.6))) : lerp(0.1, -2.2, k);
      crystals.rotation.y = lt * 0.3;
      camera.position.set(Math.sin(lt * 0.1) * 0.5, 2.6, lerp(8.5, 7.5, k)); camera.lookAt(0, 0.8, 0);
      st.draw(lt, dur);
    };
  }

  function ventScene(canvas) {
    const st = stage(canvas, { bg: 0x03142a, fog: [0x072a4c, 6, 22], stars: false, focus: 0.37, hemi: 0.7 });
    const { scene, camera } = st;
    const floor = new T.Mesh(new T.PlaneGeometry(30, 30, 30, 30), new T.MeshStandardMaterial({ color: 0x24384a, flatShading: true }));
    floor.rotation.x = -PI / 2; const fp = floor.geometry.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setZ(i, (noise2(fp.getX(i) * 0.5, fp.getY(i) * 0.5) - 0.5) * 0.6);
    floor.geometry.computeVertexNormals(); scene.add(floor);
    const chim = new T.Mesh(new T.CylinderGeometry(0.25, 0.6, 2.2, 9, 4), new T.MeshStandardMaterial({ color: 0x2a2228, flatShading: true }));
    chim.position.y = 1.1; scene.add(chim);
    const lip = onGlow(new T.Mesh(new T.CircleGeometry(0.2, 10), new T.MeshBasicMaterial({ color: 0xff7a22 }))); lip.rotation.x = -PI / 2; lip.position.y = 2.21; scene.add(lip);
    const r = rng(7); const smokeP = [], ions = [];
    const sm = new T.SpriteMaterial({ color: 0x1a1a1f, transparent: true, opacity: 0.6, depthWrite: false });
    for (let i = 0; i < 26; i++) { const s = new T.Sprite(sm.clone()); scene.add(s); smokeP.push({ s, ph: r(), dx: (r() - 0.5) * 0.6 }); }
    for (let i = 0; i < 20; i++) { const s = glowSprite(i % 2 ? CL : NA, 0.22, 1); scene.add(s); ions.push({ s, ph: r(), dx: (r() - 0.5) * 1.6 }); }
    st.label({ text: 'fuente hidrotermal', p: [0, 1.6, 0.4], t0: 0.4, color: COL.orange, size: 40, dx: -160, dy: 40 });
    return (lt, dur) => {
      smokeP.forEach((o) => { const f = (lt * 0.3 + o.ph) % 1; o.s.position.set(o.dx * f, 2.3 + f * 4, 0); o.s.scale.setScalar(0.4 + f * 1.4); o.s.material.opacity = 0.6 * (1 - f); });
      ions.forEach((o) => { const f = (lt * 0.25 + o.ph) % 1; o.s.position.set(o.dx * f * 2, 2.3 + f * 4, Math.sin(o.ph * 9) * f); o.s.material.opacity = 1 - f; });
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-1.5, 1.5, k), 2.2, 8); camera.lookAt(0, 2.6, 0);
      st.draw(lt, dur);
    };
  }

  function glassScene(canvas) {
    const st = stage(canvas, { fog: null, focus: 0.38, hemi: 0.9 });
    const { scene, camera } = st;
    const table = new T.Mesh(new T.BoxGeometry(6, 0.2, 3), new T.MeshStandardMaterial({ color: 0x6b4a2c })); table.position.y = -0.1; scene.add(table);
    const glass = new T.Mesh(new T.CylinderGeometry(0.8, 0.7, 2.4, 32, 1, true), new T.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.25, side: T.DoubleSide, depthWrite: false }));
    glass.position.set(-1.2, 1.2, 0); scene.add(glass);
    const water = new T.Mesh(new T.CylinderGeometry(0.76, 0.69, 2.1, 32), new T.MeshStandardMaterial({ color: 0x2f7fd0, transparent: true, opacity: 0.7 }));
    water.position.set(-1.2, 1.05, 0); scene.add(water);
    const pile = new T.Mesh(new T.ConeGeometry(0.75, 0.75, 14, 3), new T.MeshStandardMaterial({ color: 0xf4f6fa, flatShading: true, roughness: 0.6 }));
    pile.position.set(1.3, 0.37, 0); scene.add(pile);
    const spoon = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 1.6, 8), new T.MeshStandardMaterial({ color: 0xbfc4cc, metalness: 0.6 }));
    spoon.rotation.z = 1.1; spoon.position.set(1.9, 0.5, 0.4); scene.add(spoon);
    st.label({ text: '1 litro', p: [-1.2, 2.4, 0], t0: 0.3, color: COL.blue, size: 42 });
    st.label({ text: '≈ 35 g de sal', p: [1.3, 0.75, 0], t0: (d) => d * 0.35, color: COL.gold, size: 44 });
    return (lt, dur) => {
      const p = outBack(prog(lt, dur * 0.3, 0.6)); pile.scale.setScalar(Math.max(0.001, p)); pile.visible = p > 0.01;
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.6, 0.6, k), 2.8, lerp(8, 7.2, k)); camera.lookAt(0, 1.0, 0);
      st.draw(lt, dur);
    };
  }

  function layerScene(canvas) {
    const st = stage(canvas, { fog: [0x0b1628, 20, 50], focus: 0.38, hemi: 0.9 });
    const { scene, camera } = st;
    const ground = new T.Mesh(new T.BoxGeometry(14, 0.4, 8), new T.MeshStandardMaterial({ color: 0x4c8a3c, flatShading: true })); ground.position.y = -0.2; scene.add(ground);
    const salt = new T.Mesh(new T.BoxGeometry(7, 1, 7.6), new T.MeshStandardMaterial({ color: 0xf2f4f8, flatShading: true, roughness: 0.7 })); salt.position.x = -3.2; scene.add(salt);
    const bld = new T.Group(); bld.position.set(2.5, 0, 0); scene.add(bld);
    const H40 = 4.0;
    const bm = new T.Mesh(new T.BoxGeometry(1.4, H40, 1.4), new T.MeshStandardMaterial({ color: 0x5b6470, flatShading: true })); bm.position.y = H40 / 2; bld.add(bm);
    const win = new T.MeshBasicMaterial({ color: 0xffd98a });
    for (let f = 0; f < 40; f++) for (let w = 0; w < 4; w++) { const m = new T.Mesh(new T.PlaneGeometry(0.18, 0.06), win); m.position.set(-0.45 + w * 0.3, 0.1 + f * (H40 - 0.2) / 40, 0.701); bld.add(m); }
    st.label({ text: '≈ 150 m de sal', p: () => [-3.2, salt.scale.y, 3.8], t0: (d) => d * 0.4, color: COL.white, size: 46 });
    st.label({ text: 'edificio de 40 pisos', p: [2.5, H40, 0.7], t0: 0.3, color: COL.gold, size: 38, dx: 60 });
    return (lt, dur) => {
      const h = Math.max(0.01, H40 * smooth(prog(lt, 0.4, dur * 0.6)));
      salt.scale.y = h; salt.position.y = h / 2;
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-2, -0.5, k), 4.5, lerp(13.5, 12.5, k)); camera.lookAt(-0.3, 2.0, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  reg('sal_hook', (c) => hookScene(c, 'hook'));
  reg('sal_outro', (c) => hookScene(c, 'outro'));
  ['rain', 'rocks', 'rivers', 'evap', 'cycle'].forEach((v) => reg(`sal_${v}`, (c) => diorama(c, v)));
  reg('sal_vents', (c) => ventScene(c));
  reg('sal_glass', (c) => glassScene(c));
  reg('sal_layer', (c) => layerScene(c));
})();
