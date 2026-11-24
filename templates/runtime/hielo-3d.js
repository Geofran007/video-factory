// Escenas 3D "¿Por qué el hielo flota?" (hie_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow } = K;

  K.addEN({
    'casi todo: el sólido se hunde': 'almost everything: the solid sinks', 'el agua: el hielo flota': 'water: the ice floats',
    'H₂O': 'H₂O', 'líquida: moléculas apretadas': 'liquid: molecules packed tight', 'hielo: red hexagonal con huecos': 'ice: hexagonal net with gaps',
    '+9 % de volumen': '+9% volume', '~90 % bajo el agua': '~90% underwater', 'hielo': 'ice', 'agua a 4 °C': 'water at 4 °C',
    '¡crac!': 'crack!', '6 brazos': '6 arms',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };
  const ICE = 0xdff2ff;
  const iceMat = () => new T.MeshStandardMaterial({ color: ICE, transparent: true, opacity: 0.82, roughness: 0.08, flatShading: true, emissive: 0x2a4a6a, emissiveIntensity: 0.2 });

  function glass(scene, x, level = 1.4) {
    const g = new T.Group(); g.position.x = x; scene.add(g);
    g.add(new T.Mesh(new T.CylinderGeometry(1, 0.9, 3, 32, 1, true), new T.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false })));
    const w = new T.Mesh(new T.CylinderGeometry(0.96, 0.88, level, 32), new T.MeshStandardMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.45, depthWrite: false }));
    w.position.y = -1.5 + level / 2; g.add(w);
    return { g, top: -1.5 + level };
  }

  function glassScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x10202e, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const table = new T.Mesh(new T.BoxGeometry(9, 0.2, 3), new T.MeshStandardMaterial({ color: 0x6b4a2c })); table.position.y = -1.6; scene.add(table);
    const cubes = [];
    if (variant === 'compare') {
      const a = glass(scene, -1.6), b = glass(scene, 1.6);
      const solid = new T.Mesh(new T.BoxGeometry(0.6, 0.6, 0.6), new T.MeshStandardMaterial({ color: 0xc8a060, flatShading: true })); solid.position.set(-1.6, 0.6, 0); scene.add(solid);
      const ice = new T.Mesh(new T.BoxGeometry(0.7, 0.7, 0.7), iceMat()); ice.position.set(1.6, 0.6, 0); scene.add(ice);
      cubes.push({ m: solid, from: 0.9, to: -1.2 }, { m: ice, from: 0.9, to: b.top + 0.06 });
      st.label({ text: 'casi todo: el sólido se hunde', p: [-1.6, 1.6, 0], t0: 0.3, color: COL.orange, size: 34 });
      st.label({ text: 'el agua: el hielo flota', p: [1.6, 1.6, 0], t0: (d) => d * 0.45, color: COL.blue, size: 34, dy: 220 });
    } else {
      const a = glass(scene, 0);
      for (let i = 0; i < 3; i++) { const m = new T.Mesh(new T.BoxGeometry(0.6, 0.6, 0.6), iceMat()); m.position.set(-0.3 + i * 0.32, 1.5, (i - 1) * 0.25); m.rotation.set(i, i * 0.7, 0); scene.add(m); cubes.push({ m, from: 1.8 + i * 0.4, to: a.top + 0.08 }); }
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      cubes.forEach((o, i) => { const p = outBack(prog(lt, 0.3 + i * 0.3, 1.0)); o.m.position.y = lerp(o.from, o.to, clamp(p)) + (p >= 1 ? Math.sin(lt * 2 + i) * 0.03 : 0); o.m.rotation.y += 0.002; });
      camera.position.set(lerp(-0.6, 0.6, k), 1.6, lerp(variant === 'compare' ? 9.5 : 7, variant === 'compare' ? 9 : 6.4, k)); camera.lookAt(0, -0.1, 0);
      st.draw(lt, dur);
    };
  }

  // Molécula de agua: O rojo con dos H blancos a 104,5°.
  function molecule(scene) {
    const g = new T.Group();
    const O = new T.Mesh(new T.SphereGeometry(0.22, 16, 12), new T.MeshStandardMaterial({ color: 0xe84a3a }));
    g.add(O);
    [-1, 1].forEach((s) => { const h = new T.Mesh(new T.SphereGeometry(0.13, 12, 8), new T.MeshStandardMaterial({ color: 0xf4f4f4 })); const a = s * 52.25 * PI / 180; h.position.set(Math.sin(a) * 0.3, -Math.cos(a) * 0.3, 0); g.add(h); });
    scene.add(g); return g;
  }

  function moleculeScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const N = variant === 'molecule' ? 1 : 42;
    const mols = []; const r = rng(4);
    // Red hexagonal (vista de "capas" de hielo): posiciones de un panal 2D en z = 0.
    const lattice = []; const a = 0.95;
    for (let row = -3; row <= 3; row++) for (let col = -3; col <= 3; col++) { const x = col * a * 1.5, y = row * a * 1.732 + (col % 2 ? a * 0.866 : 0); lattice.push(new T.Vector3(x, y, 0)); }
    for (let i = 0; i < N; i++) {
      const m = molecule(scene); if (variant === 'molecule') m.scale.setScalar(3.2);
      const liquid = new T.Vector3((r() - 0.5) * 3.6, (r() - 0.5) * 4.4, (r() - 0.5) * 1.2);
      mols.push({ m, liquid, solid: lattice[i % lattice.length].clone(), ph: r() * 6, sp: 0.6 + r() });
    }
    const bonds = [];
    if (variant === 'lattice') {
      for (let i = 0; i < lattice.length; i++) for (let j = i + 1; j < lattice.length; j++) if (lattice[i].distanceTo(lattice[j]) < a * 1.1) {
        const l = new T.Line(new T.BufferGeometry().setFromPoints([lattice[i], lattice[j]]), new T.LineDashedMaterial({ color: 0x8fd0ff, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0 }));
        l.computeLineDistances(); scene.add(l); bonds.push(l);
      }
    }
    if (variant === 'molecule') st.label({ text: 'H₂O', screen: [540, 470], t0: 0.3, color: COL.white, size: 60 });
    if (variant === 'liquid') st.label({ text: 'líquida: moléculas apretadas', screen: [540, 1000], t0: 0.3, color: COL.blue, size: 42 });
    if (variant === 'lattice') st.label({ text: 'hielo: red hexagonal con huecos', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.white, size: 40 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const freeze = variant === 'lattice' ? smooth(prog(lt, 0.3, dur * 0.6)) : 0;
      mols.forEach((o) => {
        if (variant === 'molecule') { o.m.position.set(0, 0.2, 0); o.m.rotation.set(Math.sin(lt * 0.5) * 0.3, lt * 0.6, 0); return; }
        const jit = new T.Vector3(Math.sin(lt * o.sp + o.ph), Math.cos(lt * o.sp * 1.3 + o.ph), Math.sin(lt * o.sp * 0.7)).multiplyScalar(0.35 * (1 - freeze) + 0.03);
        const liq = o.liquid.clone().multiplyScalar(0.7);
        o.m.position.copy(liq.lerp(o.solid, freeze)).add(jit);
        o.m.rotation.set(lt * o.sp * (1 - freeze), lt * o.sp * 0.7 * (1 - freeze), 0);
      });
      bonds.forEach((b) => { b.material.opacity = freeze * 0.8; });
      camera.position.set(lerp(-0.4, 0.4, k), 0.3, lerp(10, 9.2, k)); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  function expandScene(canvas) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const water = new T.Mesh(new T.BoxGeometry(1.6, 1.6, 1.6), new T.MeshStandardMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.6 })); water.position.x = -1.4; scene.add(water);
    const ice = new T.Mesh(new T.BoxGeometry(1.6, 1.6, 1.6), iceMat()); ice.position.x = 1.4; scene.add(ice);
    const s = Math.cbrt(1.09);
    st.label({ text: '+9 % de volumen', p: [1.4, 1.0, 0], t0: (d) => d * 0.45, color: COL.gold, size: 44 });
    return (lt, dur) => {
      const g = lerp(1, s * 1.06, smooth(prog(lt, 0.4, dur * 0.5)));  // exagerado ligeramente para que se note
      ice.scale.setScalar(g); ice.rotation.y = lt * 0.3; water.rotation.y = lt * 0.3;
      const k = smooth(clamp(lt / dur));
      camera.position.set(0, 2, lerp(10.5, 9.8, k)); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  function icebergScene(canvas) {
    const st = stage(canvas, { bg: 0x2a5a8a, fog: null, stars: false, focus: 0.36, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const geo = new T.IcosahedronGeometry(1.6, 2); const p = geo.attributes.position; const r = rng(5);
    for (let i = 0; i < p.count; i++) { const k = 0.8 + r() * 0.4; p.setXYZ(i, p.getX(i) * k * 1.2, p.getY(i) * k * 1.5, p.getZ(i) * k); }
    geo.computeVertexNormals();
    const berg = new T.Mesh(geo, iceMat()); berg.material.opacity = 0.95; berg.position.y = -1.5; scene.add(berg);
    const water = new T.Mesh(new T.BoxGeometry(9, 5, 4), new T.MeshStandardMaterial({ color: 0x1f5f9a, transparent: true, opacity: 0.55, depthWrite: false })); water.position.y = -2.5; scene.add(water);
    const surf = new T.Mesh(new T.PlaneGeometry(9, 4), new T.MeshStandardMaterial({ color: 0x4a9be0, transparent: true, opacity: 0.5, side: T.DoubleSide })); surf.rotation.x = -PI / 2; scene.add(surf);
    st.label({ text: '~90 % bajo el agua', p: [0, -2.2, 1.5], t0: (d) => d * 0.35, color: COL.white, size: 44, dy: -150 });
    return (lt, dur) => {
      berg.position.y = -1.6 + Math.sin(lt) * 0.05; berg.rotation.y = lt * 0.1;
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.5, 0.5, k), 0.6, 10); camera.lookAt(0, -1.1, 0);
      st.draw(lt, dur);
    };
  }

  function lakeScene(canvas) {
    const st = stage(canvas, { bg: 0x1a2a3a, fog: null, stars: false, focus: 0.38, hemi: 0.9, moon: 1.0 });
    const { scene, camera } = st;
    const BX = 3.2;
    const water = new T.Mesh(new T.BoxGeometry(BX * 2, 3, 2), new T.MeshStandardMaterial({ color: 0x1f5f9a, transparent: true, opacity: 0.6 })); water.position.y = -1.5; scene.add(water);
    const ice = new T.Mesh(new T.BoxGeometry(BX * 2, 0.4, 2), iceMat()); scene.add(ice);
    const bank = new T.Mesh(new T.BoxGeometry(1.5, 3.6, 2.2), new T.MeshStandardMaterial({ color: 0xeef2f8, flatShading: true })); bank.position.set(BX + 0.75, -1.2, 0); scene.add(bank);
    const fish = [];
    for (let i = 0; i < 3; i++) { const f = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(0.22, 12, 8), new T.MeshStandardMaterial({ color: 0xff9a3c })); b.scale.set(1.6, 0.8, 0.5); const t = new T.Mesh(new T.ConeGeometry(0.15, 0.3, 4), b.material); t.rotation.z = PI / 2; t.position.x = -0.42; f.add(b, t); scene.add(f); fish.push({ f, ph: i * 2, y: -1.6 - i * 0.6 }); }
    st.label({ text: 'hielo', p: [-2, 0.2, 1], t0: 0.3, color: COL.white, size: 40 });
    st.label({ text: 'agua a 4 °C', p: [-1.5, -2.6, 1], t0: (d) => d * 0.45, color: COL.blue, size: 40, dy: -120 });
    return (lt, dur) => {
      const th = lerp(0.05, 0.4, smooth(prog(lt, 0.2, dur * 0.5))); ice.scale.y = th / 0.4; ice.position.y = -th / 2 + 0.02;
      fish.forEach((o) => { const x = Math.sin(lt * 0.5 + o.ph) * 2.2; o.f.position.set(x, o.y, 0.3); o.f.rotation.y = Math.cos(lt * 0.5 + o.ph) > 0 ? 0 : PI; });
      camera.position.set(0, 0.6, 9.5); camera.lookAt(0, -1.2, 0);
      st.draw(lt, dur);
    };
  }

  function bottleScene(canvas) {
    const st = stage(canvas, { bg: 0x0b1a2a, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const body = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 2.6, 24), new T.MeshStandardMaterial({ color: 0x6ab86a, transparent: true, opacity: 0.4 })); scene.add(body);
    const neck = new T.Mesh(new T.CylinderGeometry(0.22, 0.6, 0.8, 20), body.material); neck.position.y = 1.7; scene.add(neck);
    const core = new T.Mesh(new T.CylinderGeometry(0.66, 0.66, 2.4, 24), iceMat()); scene.add(core);
    const shards = []; const r = rng(3);
    for (let i = 0; i < 18; i++) { const s = new T.Mesh(new T.TetrahedronGeometry(0.15 + r() * 0.15), body.material); scene.add(s); shards.push({ s, d: new T.Vector3(r() - 0.5, r() - 0.3, r() - 0.5).normalize() }); }
    const frost = glowSprite(0xbfe8ff, 6, 0.25); scene.add(frost);
    st.label({ text: '¡crac!', p: [0.7, 0.3, 0], t0: (d) => d * 0.55, color: '#ff8a7a', size: 56 });
    return (lt, dur) => {
      const t0 = dur * 0.55; const g = smooth(prog(lt, 0.3, t0 - 0.3)); core.scale.set(1 + g * 0.05, 1, 1 + g * 0.05);
      const b = clamp((lt - t0) / 1.2);
      body.visible = lt < t0; neck.visible = lt < t0;
      shards.forEach((o) => { o.s.visible = lt >= t0; o.s.position.copy(o.d).multiplyScalar(0.8 + b * 1.8); o.s.rotation.set(lt * 3, lt * 2, 0); });
      camera.position.set(0, 0.8, 7); camera.lookAt(0, 0.2, 0);
      st.draw(lt, dur);
    };
  }

  function snowScene(canvas) {
    const st = stage(canvas, { bg: 0x0b1a2e, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const flake = new T.Group(); scene.add(flake);
    const m = onGlow(new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0xdff2ff })));
    for (let i = 0; i < 6; i++) {
      const arm = new T.Group(); arm.rotation.z = i * PI / 3; flake.add(arm);
      const stem = m.clone(); stem.scale.set(0.12, 2.2, 0.06); stem.position.y = 1.1; arm.add(stem);
      [0.7, 1.2, 1.7].forEach((y, j) => [-1, 1].forEach((s) => { const b = m.clone(); const L = 0.7 - j * 0.15; b.scale.set(0.08, L, 0.05); b.position.set(s * Math.sin(PI / 3) * L / 2, y + Math.cos(PI / 3) * L / 2, 0); b.rotation.z = -s * PI / 3; arm.add(b); }));
    }
    const glow = glowSprite(0x8fd0ff, 7, 0.35); scene.add(glow);
    st.label({ text: '6 brazos', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.blue, size: 50 });
    return (lt, dur) => {
      const p = outBack(prog(lt, 0.2, 1.2)); flake.scale.setScalar(Math.max(0.001, p * 0.9));
      flake.rotation.set(Math.sin(lt * 0.4) * 0.3, Math.sin(lt * 0.3) * 0.4, lt * 0.2);
      camera.position.set(0, 0, 9); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'compare', 'outro'].forEach((v) => reg(`hie_${v}`, (c) => glassScene(c, v)));
  ['molecule', 'liquid', 'lattice'].forEach((v) => reg(`hie_${v}`, (c) => moleculeScene(c, v)));
  reg('hie_expand', (c) => expandScene(c));
  reg('hie_iceberg', (c) => icebergScene(c));
  reg('hie_lake', (c) => lakeScene(c));
  reg('hie_bottle', (c) => bottleScene(c));
  reg('hie_snow', (c) => snowScene(c));
})();
