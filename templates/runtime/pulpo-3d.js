// Escenas 3D "El pulpo: 3 corazones y sangre azul" (pul_*). Pulpo low-poly de diseño propio con Three.js r149.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow } = K;

  K.addEN({
    '3 corazones': '3 hearts', 'corazón principal': 'main heart', 'branquias': 'gills', 'sangre azul (cobre)': 'blue blood (copper)',
    'al nadar, se detiene': 'it stops while swimming', '2/3 de sus neuronas\nestán en los brazos': '2/3 of its neurons\nare in its arms',
    'camuflaje en segundos': 'camouflage in seconds', 'sin huesos': 'no bones', 'tinta': 'ink', 'ventosas que saborean': 'suckers that taste',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  // Pulpo: manto + 8 brazos (tubos que ondulan). setColor cambia el color de la piel.
  function octopus(scene, color = 0xd8603a) {
    const g = new T.Group(); scene.add(g);
    const skin = new T.MeshStandardMaterial({ color, roughness: 0.55, flatShading: true });
    const mantle = new T.Mesh(new T.SphereGeometry(0.75, 20, 14), skin); mantle.scale.set(0.9, 1.25, 0.9); mantle.position.y = 0.9; g.add(mantle);
    const headB = new T.Mesh(new T.SphereGeometry(0.55, 18, 12), skin); headB.position.y = 0.05; g.add(headB);
    [-1, 1].forEach((s) => {
      const eye = new T.Mesh(new T.SphereGeometry(0.14, 12, 8), new T.MeshStandardMaterial({ color: 0xf6e8c0 })); eye.position.set(s * 0.3, 0.2, 0.42); g.add(eye);
      const pupil = new T.Mesh(new T.BoxGeometry(0.12, 0.04, 0.02), new T.MeshBasicMaterial({ color: 0x101010 })); pupil.position.set(s * 0.3, 0.2, 0.555); g.add(pupil);
    });
    const arms = [];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * PI * 2 + PI / 8;
      const pts = Array.from({ length: 10 }, (_, j) => new T.Vector3(0, -j * 0.1, 0));
      const curve = new T.CatmullRomCurve3(pts);
      const mesh = new T.Mesh(new T.TubeGeometry(curve, 30, 0.12, 6, false), skin); g.add(mesh);
      arms.push({ a, pts, curve, mesh });
    }
    const update = (lt, mode = 'idle') => {
      arms.forEach((o, i) => {
        for (let j = 0; j < o.pts.length; j++) {
          const t = j / (o.pts.length - 1);
          const swim = mode === 'swim';
          const reach = swim ? 0.5 + t * 2.4 : 0.4 + t * 1.9;
          const wave = Math.sin(lt * (swim ? 5 : 2) - t * 4 + i) * (0.15 + t * 0.35);
          const down = swim ? -0.2 - t * 0.6 : -0.15 - t * 0.9 + t * t * 0.6;
          o.pts[j].set(Math.cos(o.a) * reach * (swim ? 0.25 : 1) + Math.cos(o.a + PI / 2) * wave * 0.5, down * (swim ? 3 : 1), Math.sin(o.a) * reach * (swim ? 0.25 : 1) + Math.sin(o.a + PI / 2) * wave * 0.5);
        }
        o.mesh.geometry.dispose();
        const taper = new T.TubeGeometry(o.curve, 30, 0.12, 6, false);
        const p = taper.attributes.position; const seg = 31, rad = 7;
        for (let s = 0; s < seg; s++) { const k = 1 - s / seg * 0.85; for (let r = 0; r < rad; r++) { const idx = s * rad + r; const c = o.curve.getPointAt(s / (seg - 1)); p.setXYZ(idx, c.x + (p.getX(idx) - c.x) * k, c.y + (p.getY(idx) - c.y) * k, c.z + (p.getZ(idx) - c.z) * k); } }
        o.mesh.geometry = taper;
      });
    };
    return { g, skin, mantle, arms, update };
  }

  function seabed(scene, seed = 3) {
    const geo = new T.PlaneGeometry(40, 40, 40, 40); geo.rotateX(-PI / 2);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, (noise2(p.getX(i) * 0.3, p.getZ(i) * 0.3) - 0.5) * 0.8);
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xc8b088, flatShading: true })); m.position.y = -2.2; scene.add(m);
    const r = rng(seed); const rocks = [];
    for (let i = 0; i < 14; i++) { const k = new T.Mesh(new T.IcosahedronGeometry(0.5 + r() * 0.9, 0), new T.MeshStandardMaterial({ color: [0x6a6a72, 0x8a7a5a, 0x5a6a5a][i % 3], flatShading: true })); k.position.set((r() - 0.5) * 14, -2.1, -2 - r() * 8); scene.add(k); rocks.push(k); }
    return rocks;
  }

  function underwater(canvas) {
    return stage(canvas, { bg: 0x053a5a, fog: [0x064a6a, 6, 26], stars: false, focus: 0.37, hemi: 0.9, moon: 1.0 });
  }

  function octoScene(canvas, variant) {
    const st = underwater(canvas);
    const { scene, camera } = st;
    const rocks = seabed(scene);
    const O = octopus(scene);
    const hearts = [];
    if (variant === 'hearts' || variant === 'swim') {
      O.skin.transparent = true; O.skin.opacity = 0.45; O.skin.depthWrite = false;
      [[-0.32, 0.55, 0.1, 0.16], [0.32, 0.55, 0.1, 0.16], [0, 0.85, -0.05, 0.24]].forEach(([x, y, z, r], i) => {
        const h = onGlow(new T.Mesh(new T.SphereGeometry(r, 16, 12), new T.MeshBasicMaterial({ color: i === 2 ? 0xff4a6a : 0x4a8aff }))); h.position.set(x, y, z); O.g.add(h); hearts.push(h);
      });
      if (variant === 'hearts') {
        st.label({ text: '3 corazones', screen: [540, 470], t0: 0.3, color: COL.white, size: 44 });
        st.label({ text: 'corazón principal', p: () => { const v = new T.Vector3(); hearts[2].getWorldPosition(v); return v.toArray(); }, t0: (d) => d * 0.4, color: '#ff8a9a', size: 36, dx: 160 });
        st.label({ text: 'branquias', p: () => { const v = new T.Vector3(); hearts[0].getWorldPosition(v); return v.toArray(); }, t0: (d) => d * 0.6, color: COL.blue, size: 36, dx: -160, dy: -120 });
      } else st.label({ text: 'al nadar, se detiene', screen: [540, 1000], t0: (d) => d * 0.35, color: '#ff8a9a', size: 46 });
    }
    const blood = [];
    if (variant === 'blue') {
      const curve = new T.CatmullRomCurve3([[0, 0.9, 0], [1.2, 0.4, 0.4], [1.8, -0.8, 0.2], [0.4, -1.2, -0.3], [-1.6, -0.6, 0.3], [-1.2, 0.6, 0.2], [0, 0.9, 0]].map((q) => new T.Vector3(...q)), true);
      for (let i = 0; i < 26; i++) { const s = glowSprite(0x3a8aff, 0.3, 1); scene.add(s); blood.push({ s, curve, ph: i / 26 }); }
      O.skin.transparent = true; O.skin.opacity = 0.55; O.skin.depthWrite = false;
      st.label({ text: 'sangre azul (cobre)', screen: [540, 1000], t0: 0.4, color: COL.blue, size: 46 });
    }
    const neurons = [];
    if (variant === 'brain') {
      const r = rng(4);
      for (let i = 0; i < 60; i++) { const s = glowSprite(0xffe08a, 0.22, 1); scene.add(s); neurons.push({ s, arm: i % 8, t: 0.15 + r() * 0.8, ph: r() }); }
      const brain = glowSprite(0xffe08a, 0.9, 0.9); brain.position.y = 0.3; O.g.add(brain);
      st.label({ text: '2/3 de sus neuronas\nestán en los brazos', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 40 });
    }
    if (variant === 'camo') st.label({ text: 'camuflaje en segundos', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.green, size: 46 });
    let wall = null;
    if (variant === 'squeeze') {
      wall = new T.Mesh(new T.BoxGeometry(6, 5, 0.6), new T.MeshStandardMaterial({ color: 0x6a6a72, flatShading: true })); wall.position.set(0, 0, -1.2); scene.add(wall);
      const hole = new T.Mesh(new T.CircleGeometry(0.35, 20), new T.MeshBasicMaterial({ color: 0x020a12 })); hole.position.set(0, 0, -0.89); scene.add(hole);
      st.label({ text: 'sin huesos', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.white, size: 46 });
    }
    const ink = [];
    if (variant === 'ink') {
      const r = rng(9);
      for (let i = 0; i < 40; i++) { const s = new T.Sprite(new T.SpriteMaterial({ color: 0x0a0a14, transparent: true, opacity: 0, depthWrite: false })); scene.add(s); ink.push({ s, d: new T.Vector3(r() - 0.5, r() - 0.3, r() - 0.5).normalize(), ph: r() * 0.3 }); }
      st.label({ text: 'tinta', p: [0, 0.5, 0.5], t0: (d) => d * 0.25, color: COL.white, size: 44, dy: -170 });
    }
    const suckers = [];
    if (variant === 'taste') {
      const r = rng(2);
      for (let i = 0; i < 14; i++) { const s = glowSprite(0x8fffb0, 0.25, 0); scene.add(s); suckers.push({ s, arm: i % 3, t: 0.3 + (i / 14) * 0.6 }); }
      st.label({ text: 'ventosas que saborean', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.green, size: 46 });
    }
    if (variant === 'outro') fade(st);
    const camoCols = [0xd8603a, 0x6a6a72, 0x8a7a5a, 0xc8b088, 0xd8603a];
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const swim = variant === 'swim' || variant === 'hook' || variant === 'ink' || variant === 'outro';
      O.update(lt, swim ? 'swim' : 'idle');
      let x = 0, y = 0, z = 0;
      if (swim) { y = Math.sin(lt * 1.3) * 0.25 + (variant === 'ink' ? smooth(prog(lt, dur * 0.3, dur * 0.6)) * 2 : 0); x = variant === 'hook' ? lerp(-2, 1, k) : 0; z = variant === 'ink' ? -smooth(prog(lt, dur * 0.3, dur * 0.6)) * 5 : 0; O.g.rotation.x = -0.9; }
      else { O.g.rotation.x = 0; y = -1.0; }
      if (variant === 'squeeze') { const p = smooth(prog(lt, 0.3, dur * 0.8)); z = lerp(1.5, -1.6, p); y = 0; O.g.rotation.x = -PI / 2; const sq = Math.exp(-(((z + 1.0) / 0.5) ** 2)); O.g.scale.set(lerp(1, 0.35, sq), 1, lerp(1, 0.35, sq)); }
      O.g.position.set(x, y, z);
      hearts.forEach((h, i) => { const beat = variant === 'swim' && i === 2 ? (lt > dur * 0.35 ? 0 : 1) : 1; h.scale.setScalar(1 + 0.25 * beat * Math.max(0, Math.sin(lt * 6 + i))); h.material.color.set(variant === 'swim' && i === 2 && lt > dur * 0.35 ? 0x6a2a3a : (i === 2 ? 0xff4a6a : 0x4a8aff)); });
      blood.forEach((o) => { const f = (lt * 0.15 + o.ph) % 1; const p = o.curve.getPointAt(f); o.s.position.copy(p).add(O.g.position); });
      neurons.forEach((o) => { const arm = O.arms[o.arm]; const p = arm.curve.getPointAt(o.t); const v = O.g.localToWorld(p.clone()); o.s.position.copy(v); o.s.material.opacity = 0.5 + 0.5 * Math.sin(lt * 6 + o.ph * 9); });
      if (variant === 'camo') {
        const f = clamp(lt / dur) * (camoCols.length - 1); const i = Math.floor(f); const c = new T.Color(camoCols[i]).lerp(new T.Color(camoCols[Math.min(i + 1, camoCols.length - 1)]), smooth(f - i));
        O.skin.color.copy(c);
      }
      ink.forEach((o) => { const f = clamp((lt - dur * 0.25 - o.ph) / 1.5); o.s.position.copy(o.d).multiplyScalar(f * 2.2).add(new T.Vector3(0, 0, 0.4)); o.s.scale.setScalar(0.4 + f * 2.4); o.s.material.opacity = f > 0 ? 0.85 * (1 - f * 0.4) : 0; });
      suckers.forEach((o) => { const p = O.arms[o.arm].curve.getPointAt(o.t); o.s.position.copy(O.g.localToWorld(p.clone())); o.s.material.opacity = Math.max(0, Math.sin(lt * 4 - o.t * 8)); });
      if (variant === 'squeeze') { camera.position.set(4, 1.2, 4); camera.lookAt(0, 0, -0.6); }
      else if (variant === 'hearts' || variant === 'blue' || variant === 'brain' || variant === 'taste') { camera.position.set(0, 1.2, lerp(6.8, 6.2, k)); camera.lookAt(0, -0.4, 0); }
      else { camera.position.set(lerp(-1, 1, k), 1.0, 8.5); camera.lookAt(0, 0, -1); }
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'hearts', 'blue', 'swim', 'brain', 'camo', 'squeeze', 'ink', 'taste', 'outro'].forEach((v) => reg(`pul_${v}`, (c) => octoScene(c, v)));
})();
