// Escenas 3D "¿Por qué las cebras tienen rayas?" (ceb_*). Cebra low-poly de diseño propio con Three.js r149.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow } = K;

  K.addEN({
    'ninguna igual': 'no two alike', 'piel oscura debajo': 'dark skin underneath', '¿camuflaje?': 'camouflage?', '¿calor?': 'heat?',
    '¿moscas?': 'flies?', 'tábanos': 'horseflies', 'no logran aterrizar': 'they fail to land', 'más moscas = rayas más marcadas': 'more flies = bolder stripes',
    'mamá y cría se reconocen': 'mom and foal recognize each other', 'con abrigo rayado': 'striped coat', 'sin rayas': 'plain coat',
    'aterrizajes': 'landings',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  const texCache = {};
  function stripeTex(seed, plain = null) {
    const key = seed + String(plain); if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = plain || '#f4f2ec'; g.fillRect(0, 0, 512, 256);
    if (!plain) { g.fillStyle = '#141414'; for (let i = 0; i < 26; i++) { g.beginPath(); for (let y = 0; y <= 256; y += 8) { const x = i * 20 + Math.sin(y * 0.03 + i * 0.7 + seed) * 8 + noise2(i * 0.5 + seed, y * 0.02) * 10; y === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } for (let y = 256; y >= 0; y -= 8) { const x = i * 20 + 8 + Math.sin(y * 0.03 + i * 0.7 + seed) * 8 + noise2(i * 0.5 + seed, y * 0.02) * 10 + Math.sin(y * 0.05 + i) * 3; g.lineTo(x, y); } g.closePath(); g.fill(); } }
    return (texCache[key] = new T.CanvasTexture(c));
  }

  // Cebra (o caballo con abrigo): cuerpo, cuello, cabeza, patas y cola.
  function zebra(scene, { seed = 1, plain = null, scale = 1 } = {}) {
    const g = new T.Group(); g.scale.setScalar(scale); scene.add(g);
    const skin = new T.MeshStandardMaterial({ map: stripeTex(seed, plain), roughness: 0.8 });
    const body = new T.Mesh(new T.CapsuleGeometry(0.55, 1.6, 6, 16), skin); body.rotation.z = PI / 2; body.position.y = 1.6; g.add(body);
    const neck = new T.Mesh(new T.CylinderGeometry(0.25, 0.4, 1.1, 12), skin); neck.position.set(1.15, 2.2, 0); neck.rotation.z = -0.6; g.add(neck);
    const head = new T.Mesh(new T.CapsuleGeometry(0.2, 0.6, 4, 10), skin); head.rotation.z = PI / 2 + 0.6; head.position.set(1.6, 2.55, 0); g.add(head);
    const mane = new T.Mesh(new T.BoxGeometry(0.9, 0.18, 0.06), new T.MeshStandardMaterial({ color: 0x1a1a1a })); mane.position.set(1.15, 2.55, 0); mane.rotation.z = -0.6; g.add(mane);
    [-1, 1].forEach((s) => { const ear = new T.Mesh(new T.ConeGeometry(0.07, 0.22, 6), skin); ear.position.set(1.45, 2.95, s * 0.1); g.add(ear); });
    const legs = [[0.7, 0.25], [0.7, -0.25], [-0.7, 0.25], [-0.7, -0.25]].map(([x, z]) => { const p = new T.Group(); p.position.set(x, 1.3, z); g.add(p); const l = new T.Mesh(new T.CylinderGeometry(0.1, 0.08, 1.3, 8), skin); l.position.y = -0.65; p.add(l); const h = new T.Mesh(new T.CylinderGeometry(0.1, 0.11, 0.12, 8), new T.MeshStandardMaterial({ color: 0x1a1a1a })); h.position.y = -1.3; p.add(h); return p; });
    const tail = new T.Mesh(new T.CylinderGeometry(0.03, 0.05, 0.8, 6), new T.MeshStandardMaterial({ color: 0x1a1a1a })); tail.position.set(-1.35, 1.4, 0); tail.rotation.z = 0.4; g.add(tail);
    return { g, legs, skin, run: (lt, sp = 1) => legs.forEach((p, i) => { p.rotation.z = Math.sin(lt * 8 * sp + (i % 2 ? PI : 0) + (i > 1 ? 0.6 : 0)) * 0.5 * sp; }) };
  }

  function savanna(scene) {
    const geo = new T.PlaneGeometry(120, 120, 40, 40); geo.rotateX(-PI / 2); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, (noise2(p.getX(i) * 0.05, p.getZ(i) * 0.05) - 0.5) * 1.2);
    geo.computeVertexNormals(); scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xc8a860, flatShading: true })));
    const r = rng(4);
    for (let i = 0; i < 10; i++) { const t = new T.Group(); const tr = new T.Mesh(new T.CylinderGeometry(0.15, 0.2, 2.4, 6), new T.MeshStandardMaterial({ color: 0x6a4a2a })); tr.position.y = 1.2; t.add(tr); const top = new T.Mesh(new T.CylinderGeometry(2, 1.6, 0.6, 8), new T.MeshStandardMaterial({ color: 0x5a8a3a, flatShading: true })); top.position.y = 2.6; t.add(top); t.position.set((r() - 0.5) * 50, 0, -10 - r() * 30); scene.add(t); }
  }

  function flies(scene, n, seed) { const r = rng(seed); const list = []; for (let i = 0; i < n; i++) { const f = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), new T.MeshStandardMaterial({ color: 0x2a2a20 })); b.scale.x = 1.6; f.add(b); [-1, 1].forEach((s) => { const w = new T.Mesh(new T.CircleGeometry(0.07, 8), new T.MeshStandardMaterial({ color: 0xdfeaff, transparent: true, opacity: 0.6, side: T.DoubleSide })); w.position.set(0, 0.04, s * 0.06); w.rotation.x = PI / 2; f.add(w); }); scene.add(f); list.push({ f, ph: r() * 6, r: 0.6 + r() * 1.2, h: r() * 1.4, sp: 0.8 + r() }); } return list; }

  function plainScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x8ac0e8, fog: [0xd8c8a0, 20, 80], stars: false, focus: 0.37, hemi: 1.0, moon: 1.3 });
    const { scene, camera } = st;
    savanna(scene);
    const Z = zebra(scene, { seed: 2 });
    let Z2 = null, foal = null;
    if (variant === 'unique') { Z2 = zebra(scene, { seed: 9 }); Z2.g.position.set(0.5, 0, -2.6); st.label({ text: 'ninguna igual', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 48 }); }
    if (variant === 'family') { foal = zebra(scene, { seed: 13, scale: 0.6 }); foal.g.position.set(1.8, 0, 1.2); st.label({ text: 'mamá y cría se reconocen', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.white, size: 44 }); }
    if (variant === 'ideas') { st.label({ text: '¿camuflaje?', screen: [260, 500], t0: 0.3, color: COL.white, size: 40 }); st.label({ text: '¿calor?', screen: [800, 640], t0: (d) => d * 0.3, color: COL.orange, size: 40 }); st.label({ text: '¿moscas?', screen: [520, 1000], t0: (d) => d * 0.6, color: COL.gold, size: 48 }); }
    let F = [];
    if (variant === 'flies' || variant === 'miss' || variant === 'africa') { F = flies(scene, variant === 'africa' ? 40 : 22, 5); }
    if (variant === 'flies') st.label({ text: 'tábanos', p: () => F[0].f.position.toArray(), t0: 0.4, color: COL.white, size: 40 });
    if (variant === 'miss') st.label({ text: 'no logran aterrizar', screen: [540, 1000], t0: (d) => d * 0.3, color: '#ff8a7a', size: 46 });
    if (variant === 'africa') st.label({ text: 'más moscas = rayas más marcadas', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 38 });
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const running = variant === 'hook' || variant === 'outro';
      Z.run(lt, running ? 1 : 0.15); Z.g.position.set(running ? lerp(-5, 3, k) : 0, 0, 0); Z.g.rotation.y = running ? 0 : 0.35;
      if (Z2) Z2.run(lt, 0.1);
      if (foal) { foal.run(lt + 1, 0.2); foal.g.rotation.y = -0.4; }
      F.forEach((o, i) => {
        const a = lt * o.sp * 2 + o.ph; let x = Math.cos(a) * o.r, y = 1.6 + o.h * 0.6 + Math.sin(a * 1.7) * 0.3, z = Math.sin(a) * o.r * 0.6 + 0.8;
        if (variant === 'miss') { const f = (lt * 0.5 + o.ph * 0.1) % 1; const near = f > 0.6 && f < 0.75; x = lerp(2.5, 0.2, Math.min(f / 0.65, 1)) + (near ? (f - 0.6) * 8 : 0); y = 1.8 + Math.sin(i) * 0.4 + (near ? (f - 0.6) * 6 : 0); z = 0.7 + Math.cos(i) * 0.3; }
        o.f.position.set(x, y, z); o.f.rotation.y = -a;
      });
      if (running) { camera.position.set(lerp(-4, 2, k), 2.8, 12); camera.lookAt(lerp(-3, 2.5, k), 1.9, 0); }
      else { camera.position.set(lerp(-1, 1, k), 2.8, variant === 'unique' ? 13 : 11.5); camera.lookAt(0.3, 1.9, 0); }
      st.draw(lt, dur);
    };
  }

  // Piel oscura debajo del pelo: corte de la piel.
  function skinScene(canvas) {
    const st = stage(canvas, { bg: 0x1a1a14, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const furTop = new T.Mesh(new T.BoxGeometry(5, 0.5, 2), new T.MeshStandardMaterial({ map: stripeTex(4) })); furTop.position.y = 0.6; scene.add(furTop);
    const skin = new T.Mesh(new T.BoxGeometry(5, 0.4, 2), new T.MeshStandardMaterial({ color: 0x2a2420 })); skin.position.y = 0.15; scene.add(skin);
    st.label({ text: 'piel oscura debajo', p: [0, 0.15, 1], t0: (d) => d * 0.4, color: COL.white, size: 42, dy: -150 });
    return (lt, dur) => {
      const f = smooth(prog(lt, 0.3, dur * 0.5)); furTop.position.y = 0.6 + f * 1.2; furTop.rotation.z = f * 0.2;
      camera.position.set(2.5, 2.5, 6); camera.lookAt(0, 0.6, 0);
      st.draw(lt, dur);
    };
  }

  // Experimento: caballos con abrigo rayado reciben muchos menos aterrizajes de tábanos.
  function experimentScene(canvas) {
    const st = stage(canvas, { bg: 0x8ac0e8, fog: [0xd8c8a0, 20, 80], stars: false, focus: 0.37, hemi: 1.0, moon: 1.3 });
    const { scene, camera } = st;
    savanna(scene);
    const A = zebra(scene, { seed: 3, scale: 0.75 }); A.g.position.set(-1.9, 0, 0);
    const B = zebra(scene, { seed: 0, plain: '#8a5a3a', scale: 0.75 }); B.g.position.set(1.9, 0, 0);
    const F = flies(scene, 30, 9);
    st.label({ text: 'con abrigo rayado', p: [-1.9, 2.4, 0], t0: 0.3, color: COL.white, size: 36 });
    st.label({ text: 'sin rayas', p: [1.9, 2.4, 0], t0: 0.3, color: COL.white, size: 36 });
    st.overlay = (ctx, lt, dur, FONT) => {
      // Barras ilustrativas (sin cifras): el abrigo rayado recibe muchos menos aterrizajes.
      const p = smooth(clamp(lt / (dur * 0.8)));
      [[A, 0.2, '#6ee08a'], [B, 1, '#ff8a7a']].forEach(([z, v, c]) => { const q = st.project([z.g.position.x, 0.2, 0]); ctx.save(); ctx.fillStyle = 'rgba(8,12,24,.88)'; ctx.beginPath(); ctx.roundRect(q.x - 110, q.y + 10, 220, 92, 18); ctx.fill(); ctx.fillStyle = c; ctx.fillRect(q.x - 90, q.y + 30, 180 * v * p, 26); ctx.font = `800 22px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(K.tr('aterrizajes'), q.x, q.y + 90); ctx.restore(); });
    };
    return (lt, dur) => {
      F.forEach((o, i) => { const left = i < 8; const tgt = left ? A : B; const a = lt * o.sp * 2 + o.ph; o.f.position.set(tgt.g.position.x + Math.cos(a) * o.r * 0.8, 1.5 + Math.sin(a * 1.7) * 0.4, Math.sin(a) * o.r * 0.5 + 0.5); });
      camera.position.set(0, 2.6, 10); camera.lookAt(0, 1.4, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'unique', 'ideas', 'flies', 'miss', 'africa', 'family', 'outro'].forEach((v) => reg(`ceb_${v}`, (c) => plainScene(c, v)));
  reg('ceb_skin', (c) => skinScene(c));
  reg('ceb_experiment', (c) => experimentScene(c));
})();
