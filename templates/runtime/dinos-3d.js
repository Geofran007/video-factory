// Escenas 3D "¿Qué acabó con los dinosaurios?" (din_*). Dinosaurio low-poly de diseño propio con Three.js r149.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow, space, sphere } = K;

  K.addEN({
    'hace 66 millones de años': '66 million years ago', 'asteroide de ~10 km': '~10 km asteroid', 'Yucatán, México': 'Yucatán, Mexico',
    'cráter de ~180 km': '~180 km crater', 'polvo y hollín tapan el Sol': 'dust and soot block the Sun', 'frío y oscuridad': 'cold and darkness',
    '~75 % de las especies': '~75% of species', 'pequeños mamíferos': 'small mammals', 'las aves son dinosaurios': 'birds are dinosaurs',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  // Tiranosaurio estilizado (cabeza hacia +x).
  function trex(scene, color = 0x5a8a3a) {
    const g = new T.Group(); scene.add(g);
    const m = new T.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 });
    const body = new T.Mesh(new T.SphereGeometry(1, 12, 10), m); body.scale.set(1.5, 0.9, 0.8); body.position.y = 2.2; g.add(body);
    const neck = new T.Mesh(new T.CylinderGeometry(0.45, 0.6, 1, 8), m); neck.rotation.z = -0.9; neck.position.set(1.3, 2.9, 0); g.add(neck);
    const head = new T.Mesh(new T.BoxGeometry(1.4, 0.7, 0.7), m); head.position.set(2.1, 3.4, 0); g.add(head);
    const jaw = new T.Mesh(new T.BoxGeometry(1.2, 0.25, 0.6), m); jaw.position.set(2.1, 2.95, 0); g.add(jaw);
    const eye = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), new T.MeshBasicMaterial({ color: 0xffd040 })); eye.position.set(2.3, 3.6, 0.36); g.add(eye);
    const tail = new T.Mesh(new T.ConeGeometry(0.6, 3, 8), m); tail.rotation.z = PI / 2 + 0.2; tail.position.set(-2.6, 2.3, 0); g.add(tail);
    const legs = [-1, 1].map((s) => { const p = new T.Group(); p.position.set(-0.2, 2.0, s * 0.5); g.add(p); const th = new T.Mesh(new T.CylinderGeometry(0.35, 0.25, 1.4, 8), m); th.position.y = -0.7; p.add(th); const sh = new T.Mesh(new T.CylinderGeometry(0.18, 0.15, 1.0, 6), m); sh.position.set(0.2, -1.6, 0); p.add(sh); const ft = new T.Mesh(new T.BoxGeometry(0.6, 0.15, 0.35), m); ft.position.set(0.35, -2.1, 0); p.add(ft); return p; });
    [-1, 1].forEach((s) => { const arm = new T.Mesh(new T.CylinderGeometry(0.08, 0.06, 0.5, 6), m); arm.rotation.z = 1.2; arm.position.set(1.1, 2.3, s * 0.45); g.add(arm); });
    return { g, legs, walk: (lt) => legs.forEach((p, i) => { p.rotation.z = Math.sin(lt * 3 + i * PI) * 0.4; }) };
  }

  function prehistoric(scene, burnt = 0) {
    const geo = new T.PlaneGeometry(80, 80, 50, 50); geo.rotateX(-PI / 2); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, (noise2(p.getX(i) * 0.08, p.getZ(i) * 0.08) - 0.5) * 3);
    geo.computeVertexNormals();
    const ground = new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0x6a8a3a, flatShading: true })); scene.add(ground);
    const r = rng(6); const plants = [];
    for (let i = 0; i < 26; i++) { const f = new T.Group(); const tr = new T.Mesh(new T.CylinderGeometry(0.15, 0.22, 3, 6), new T.MeshStandardMaterial({ color: 0x6a4a2a })); tr.position.y = 1.5; f.add(tr); for (let j = 0; j < 6; j++) { const l = new T.Mesh(new T.ConeGeometry(0.3, 2.2, 4), new T.MeshStandardMaterial({ color: 0x3a8a3a, flatShading: true })); l.position.y = 3; l.rotation.set(1.1, j * PI / 3, 0); l.translateY(1); f.add(l); } f.position.set((r() - 0.5) * 40, 0, -6 - r() * 25); scene.add(f); plants.push(f); }
    const volcano = new T.Mesh(new T.ConeGeometry(8, 9, 10), new T.MeshStandardMaterial({ color: 0x4a3a32, flatShading: true })); volcano.position.set(14, 3, -35); scene.add(volcano);
    return { ground, plants };
  }

  function landScene(canvas, variant) {
    const dark = variant === 'cold';
    const st = stage(canvas, { bg: dark ? 0x2a2420 : 0xe0a060, fog: dark ? [0x2a2420, 6, 30] : [0xe8b880, 25, 80], stars: false, focus: 0.37, hemi: dark ? 0.4 : 1.0, moon: dark ? 0.2 : 1.2 });
    const { scene, camera } = st;
    const land = prehistoric(scene);
    const D = trex(scene); D.g.scale.setScalar(0.9);
    let rock = null, trail = null;
    if (variant === 'hook') {
      rock = new T.Group(); const core = new T.Mesh(new T.IcosahedronGeometry(1.2, 1), new T.MeshStandardMaterial({ color: 0x5a4a40, flatShading: true })); rock.add(core); rock.add(glowSprite(0xff8a2a, 6, 0.9)); scene.add(rock);
      st.label({ text: 'hace 66 millones de años', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 44 });
    }
    const flakes = [];
    if (dark) {
      land.ground.material.color.set(0x5a5a52); land.plants.forEach((p) => p.traverse((o) => { if (o.material && o.material.color.getHex() === 0x3a8a3a) o.material.color.set(0x6a5a3a); }));
      const r = rng(4); for (let i = 0; i < 80; i++) { const s = glowSprite(0xb8b0a8, 0.15, 0.6); scene.add(s); flakes.push({ s, x: (r() - 0.5) * 20, z: (r() - 0.5) * 10, ph: r() }); }
      st.label({ text: 'frío y oscuridad', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.blue, size: 46 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      D.walk(variant === 'cold' ? lt * 0.3 : lt); D.g.position.set(variant === 'cold' ? -1 : lerp(-4, 1, k), 0, 0); D.g.rotation.y = 0.3;
      if (variant === 'cold') D.g.rotation.z = smooth(prog(lt, dur * 0.4, dur * 0.5)) * 0.15;
      if (rock) { const f = smooth(prog(lt, 0, dur * 0.95)); rock.position.set(lerp(-30, 6, f), lerp(40, 10, f), lerp(-60, -30, f)); }
      flakes.forEach((o) => { const f = (lt * 0.08 + o.ph) % 1; o.s.position.set(o.x + Math.sin(f * 6) * 0.3, 10 - f * 10, o.z); });
      camera.position.set(lerp(-3, 1, k), 4.0, 19); camera.lookAt(0, 3.6, -4);
      st.draw(lt, dur);
    };
  }

  function globeScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff4e0, 2.0); light.position.set(-6, 3, 8); scene.add(light);
    const R = 2.2;
    const earth = sphere(R, 'earth', 6, 5); scene.add(earth);
    const site = new T.Vector3(Math.sin(-0.4) * Math.cos(0.36), Math.sin(0.36), Math.cos(-0.4) * Math.cos(0.36)).multiplyScalar(R * 1.01);
    const rock = new T.Group(); const core = new T.Mesh(new T.IcosahedronGeometry(0.25, 1), new T.MeshStandardMaterial({ color: 0x5a4a40, flatShading: true })); rock.add(core); rock.add(glowSprite(0xff8a2a, 1.4, 0.9)); scene.add(rock);
    const flash = glowSprite(0xfff2c0, 1, 0); flash.position.copy(site); scene.add(flash);
    const dust = new T.Mesh(new T.SphereGeometry(R * 1.08, 48, 32), new T.MeshStandardMaterial({ color: 0x3a3028, transparent: true, opacity: 0, depthWrite: false })); scene.add(dust);
    let crater = null;
    if (variant === 'crater') { crater = onGlow(new T.Mesh(new T.RingGeometry(0.2, 0.3, 40), new T.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, side: T.DoubleSide }))); crater.position.copy(site); crater.lookAt(site.clone().multiplyScalar(2)); scene.add(crater); st.label({ text: 'cráter de ~180 km', p: site.toArray(), t0: (d) => d * 0.35, color: COL.orange, size: 42 }); st.label({ text: 'Yucatán, México', screen: [540, 1000], t0: 0.3, color: COL.white, size: 44 }); }
    if (variant === 'asteroid') st.label({ text: 'asteroide de ~10 km', p: () => rock.position.toArray(), t0: 0.4, color: COL.orange, size: 42 });
    if (variant === 'dust') st.label({ text: 'polvo y hollín tapan el Sol', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.white, size: 42 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      earth.rotation.y = 0; const hitT = variant === 'asteroid' ? dur * 0.8 : variant === 'impact' ? dur * 0.3 : -1;
      if (hitT > 0) { const f = clamp(lt / hitT); rock.position.copy(site.clone().multiplyScalar(1 + (1 - f) * 3.5).add(new T.Vector3((1 - f) * 3, (1 - f) * 2, 0))); rock.visible = f < 1; }
      else rock.visible = false;
      const b = variant === 'impact' ? prog(lt, hitT, 1.4) : 0; flash.material.opacity = b > 0 && b < 1 ? Math.sin(b * PI) : 0; flash.scale.setScalar(0.5 + b * 6);
      if (crater) { const g = smooth(prog(lt, 0.3, 1)); crater.scale.setScalar(Math.max(0.01, g)); crater.material.opacity = 0.9; }
      dust.material.opacity = variant === 'dust' ? 0.85 * smooth(prog(lt, 0.3, dur * 0.6)) : 0;
      if (variant === 'dust') light.intensity = lerp(2, 0.4, smooth(prog(lt, 0.3, dur * 0.6)));
      camera.position.set(lerp(-0.6, 0.2, k), 1.2, lerp(12.5, 11.5, k)); camera.lookAt(-0.3, 0.2, 0);
      st.draw(lt, dur);
    };
  }

  // Contador de especies extinguidas y los que sobrevivieron.
  function survivorsScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x2a2420, fog: null, stars: false, focus: 0.38, hemi: 0.9, moon: 1.0 });
    const { scene, camera } = st;
    const ground = new T.Mesh(new T.PlaneGeometry(20, 10), new T.MeshStandardMaterial({ color: 0x5a5a4a })); ground.rotation.x = -PI / 2; scene.add(ground);
    const icons = [];
    if (variant === 'extinct') {
      for (let i = 0; i < 20; i++) { const m = new T.Mesh(new T.SphereGeometry(0.28, 12, 8), new T.MeshStandardMaterial({ color: 0x6ab84a })); m.position.set(-3.6 + (i % 10) * 0.8, 0.3 + Math.floor(i / 10) * 0.8, 0); scene.add(m); icons.push(m); }
      st.label({ text: '~75 % de las especies', screen: [540, 1000], t0: (d) => d * 0.5, color: '#ff8a7a', size: 46 });
    }
    let mammal = null, bird = null, D = null;
    if (variant === 'mammals') {
      mammal = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(0.4, 12, 8), new T.MeshStandardMaterial({ color: 0x8a6a4a })); b.scale.set(1.4, 0.8, 0.8); mammal.add(b); const h = new T.Mesh(new T.SphereGeometry(0.25, 10, 8), b.material); h.position.set(0.55, 0.15, 0); mammal.add(h); [-1, 1].forEach((s) => { const e = new T.Mesh(new T.SphereGeometry(0.1, 8, 6), b.material); e.position.set(0.55, 0.4, s * 0.12); mammal.add(e); }); const tl = new T.Mesh(new T.CylinderGeometry(0.03, 0.02, 0.8, 6), b.material); tl.rotation.z = 1.2; tl.position.set(-0.8, 0.1, 0); mammal.add(tl);
      scene.add(mammal);
      st.label({ text: 'pequeños mamíferos', p: () => mammal.position.toArray(), t0: (d) => d * 0.3, color: COL.gold, size: 42, dy: 120 });
    }
    if (variant === 'birds') {
      D = trex(scene); D.g.scale.setScalar(0.55); D.g.position.set(-2.2, 0, 0);
      bird = new T.Group(); const bm = new T.MeshStandardMaterial({ color: 0xd8a050, flatShading: true }); const bb = new T.Mesh(new T.SphereGeometry(0.5, 12, 8), bm); bb.scale.set(1.2, 1, 0.9); bb.position.y = 0.9; bird.add(bb); const bh = new T.Mesh(new T.SphereGeometry(0.28, 10, 8), bm); bh.position.set(0.55, 1.45, 0); bird.add(bh); const beak = new T.Mesh(new T.ConeGeometry(0.08, 0.25, 6), new T.MeshStandardMaterial({ color: 0xffb030 })); beak.rotation.z = -PI / 2; beak.position.set(0.85, 1.45, 0); bird.add(beak); const comb = new T.Mesh(new T.BoxGeometry(0.25, 0.18, 0.05), new T.MeshStandardMaterial({ color: 0xd8302a })); comb.position.set(0.55, 1.75, 0); bird.add(comb); [-1, 1].forEach((s) => { const l = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.5, 6), new T.MeshStandardMaterial({ color: 0xffb030 })); l.position.set(0, 0.3, s * 0.18); bird.add(l); });
      bird.position.set(2.2, 0, 0); scene.add(bird);
      st.label({ text: 'las aves son dinosaurios', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 46 });
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      icons.forEach((m, i) => { const gone = i < 15 && lt > 0.4 + i * dur * 0.035; m.material.color.set(gone ? 0x4a4a46 : 0x6ab84a); m.scale.setScalar(gone ? 0.7 : 1); });
      if (mammal) { mammal.position.set(lerp(-3, 2.5, k), 0.35 + Math.abs(Math.sin(lt * 8)) * 0.1, 0); }
      if (D) D.walk(lt);
      if (bird) bird.rotation.y = Math.sin(lt * 2) * 0.3;
      camera.position.set(0, 3.2, 13.5); camera.lookAt(0, 1.4, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'cold', 'outro'].forEach((v) => reg(`din_${v}`, (c) => landScene(c, v)));
  ['asteroid', 'impact', 'crater', 'dust'].forEach((v) => reg(`din_${v}`, (c) => globeScene(c, v)));
  ['extinct', 'mammals', 'birds'].forEach((v) => reg(`din_${v}`, (c) => survivorsScene(c, v)));
})();
