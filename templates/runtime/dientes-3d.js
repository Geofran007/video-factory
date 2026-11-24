// Escenas 3D "¿Por qué se caen los dientes de leche?" (die_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, rng, stage, glowSprite, onGlow } = K;

  K.addEN({
    '20 de leche': '20 baby teeth', '32 adultos': '32 adult teeth', 'el diente nuevo espera abajo': 'the new tooth waits below',
    'la raíz se disuelve': 'the root dissolves', 'esmalte': 'enamel', 'dentina': 'dentin', 'pulpa': 'pulp',
    'lo más duro del cuerpo': 'hardest part of the body', 'bacterias + azúcar = ácido': 'bacteria + sugar = acid',
    'el esmalte no se regenera': 'enamel doesn’t grow back', 'miles de dientes en su vida': 'thousands of teeth in a lifetime',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };
  const ENAMEL = 0xf6f2e8;

  // Diente: corona + raíz (dos piezas) con material propio.
  function tooth(scale = 1, color = ENAMEL, rootLen = 1) {
    const g = new T.Group(); g.scale.setScalar(scale);
    const mat = new T.MeshStandardMaterial({ color, roughness: 0.35 });
    const crown = new T.Mesh(new T.SphereGeometry(0.5, 16, 12), mat); crown.scale.set(1, 0.85, 0.9); crown.position.y = 0.35; g.add(crown);
    const root = new T.Mesh(new T.ConeGeometry(0.32, rootLen, 10), mat); root.rotation.x = PI; root.position.y = -rootLen / 2 + 0.05; g.add(root);
    return { g, crown, root, mat };
  }

  // Encía y mandíbula en corte (vista frontal tipo radiografía).
  function jawScene(canvas, variant) {
    const xr = variant === 'jaw' || variant === 'roots' || variant === 'push';
    const st = stage(canvas, { bg: xr ? 0x05080e : 0x2a1218, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.1 });
    const { scene, camera } = st;
    const gum = new T.Mesh(new T.BoxGeometry(7.5, 2.6, 1.2), new T.MeshStandardMaterial({ color: xr ? 0x2a3a5a : 0xd86a7a, transparent: xr, opacity: xr ? 0.45 : 1, depthWrite: !xr })); gum.position.y = -1.3; scene.add(gum);
    const baby = [], adult = [];
    for (let i = 0; i < 6; i++) {
      const x = -2.75 + i * 1.1;
      const b = tooth(0.8, xr ? 0xcfe8ff : ENAMEL, 0.9); b.g.position.set(x, 0.05, 0.1); scene.add(b.g); baby.push(b);
      if (xr || variant === 'count') { const a = tooth(0.95, xr ? 0xffe0a0 : ENAMEL, 1.3); a.g.position.set(x + 0.05, -2.0, 0); scene.add(a.g); adult.push(a); if (!xr) a.g.visible = false; }
    }
    if (xr) [...baby, ...adult].forEach((t) => onGlow(t.g));
    if (variant === 'jaw') st.label({ text: 'el diente nuevo espera abajo', p: () => adult[2].g.position.toArray(), t0: (d) => d * 0.35, color: COL.gold, size: 38, dy: -150 });
    if (variant === 'roots') st.label({ text: 'la raíz se disuelve', p: () => [baby[2].g.position.x, -0.6, 0.6], t0: (d) => d * 0.3, color: COL.blue, size: 40, dx: 160 });
    if (variant === 'count') { st.label({ text: '20 de leche', screen: [540, 470], t0: 0.3, color: COL.white, size: 44 }); st.label({ text: '32 adultos', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.gold, size: 48 }); }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const dissolve = variant === 'roots' ? smooth(prog(lt, 0.3, dur * 0.7)) : variant === 'push' ? 1 : 0;
      baby.forEach((b, i) => { b.root.scale.y = Math.max(0.05, 1 - dissolve * (i === 2 || i === 3 ? 1 : 0.4)); b.root.position.y = -0.45 * b.root.scale.y + 0.05; });
      if (variant === 'push') {
        const up = smooth(prog(lt, 0.2, dur * 0.7));
        [2, 3].forEach((i) => { baby[i].g.position.y = 0.05 + up * 1.6; baby[i].g.rotation.z = up * (i === 2 ? -0.6 : 0.6); baby[i].g.position.x = -2.75 + i * 1.1 + (i === 2 ? -1 : 1) * up * 0.6; adult[i].g.position.y = lerp(-2.0, 0.1, up); });
      }
      if (variant === 'count') { const p = smooth(prog(lt, dur * 0.45, 0.8)); adult.forEach((a) => { a.g.visible = p > 0.02; a.g.position.y = lerp(-2.0, 0.1, p); }); baby.forEach((b) => { b.g.visible = p < 0.5; }); }
      camera.position.set(lerp(-0.5, 0.5, k), 0.0, 12.5); camera.lookAt(0, -1.1, 0);
      st.draw(lt, dur);
    };
  }

  function smileScene(canvas) {
    const st = stage(canvas, { bg: 0x2a1218, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.1 });
    const { scene, camera } = st;
    const gum = new T.Mesh(new T.TorusGeometry(2.6, 0.45, 12, 40, PI), new T.MeshStandardMaterial({ color: 0xd86a7a })); gum.rotation.x = -PI / 2; gum.position.y = -0.3; scene.add(gum);
    const teeth = [];
    for (let i = 0; i < 10; i++) { if (i === 4) continue; const a = PI * (0.08 + 0.84 * i / 9); const t = tooth(0.7); t.g.position.set(Math.cos(a) * 2.6, 0, -Math.sin(a) * 2.6); scene.add(t.g); teeth.push(t); }
    const fallen = tooth(0.7); scene.add(fallen.g);
    return (lt, dur) => {
      const f = smooth(prog(lt, 0.4, dur * 0.6)); const a = PI * (0.08 + 0.84 * 4 / 9);
      fallen.g.position.set(Math.cos(a) * 2.6 + f * 0.5, -f * 3, -Math.sin(a) * 2.6 + f * 2); fallen.g.rotation.set(f * 3, f * 2, 0);
      camera.position.set(0, 2.4, 5.2); camera.lookAt(0, -0.2, -1.4);
      st.draw(lt, dur);
    };
  }

  // Corte del diente: esmalte, dentina, pulpa; caries.
  function sectionScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0e1622, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const outline = (s) => { const sh = new T.Shape(); sh.moveTo(-1.4 * s, 1.6 * s); sh.bezierCurveTo(-1.6 * s, 2.6 * s, 1.6 * s, 2.6 * s, 1.4 * s, 1.6 * s); sh.lineTo(1.0 * s, 0.2 * s); sh.lineTo(0.6 * s, -2.6 * s); sh.lineTo(0.2 * s, -2.8 * s); sh.lineTo(-0.2 * s, -2.8 * s); sh.lineTo(-0.6 * s, -2.6 * s); sh.lineTo(-1.0 * s, 0.2 * s); sh.closePath(); return sh; };
    const layer = (s, color, z) => { const m = new T.Mesh(new T.ShapeGeometry(outline(s), 24), new T.MeshStandardMaterial({ color, side: T.DoubleSide })); m.position.z = z; scene.add(m); return m; };
    layer(1, ENAMEL, 0); layer(0.82, 0xe8c890, 0.01);
    const pulp = layer(0.4, 0xd84a5a, 0.02); pulp.position.y = -0.3;
    let hole = null; const bugs = [];
    if (variant === 'cavity' || variant === 'norepair') {
      hole = new T.Mesh(new T.CircleGeometry(0.4, 20), new T.MeshStandardMaterial({ color: 0x3a2a1a })); hole.position.set(0.5, 2.0, 0.03); scene.add(hole);
      const r = rng(4); for (let i = 0; i < 14; i++) { const b = new T.Mesh(new T.CapsuleGeometry(0.06, 0.16, 4, 8), new T.MeshStandardMaterial({ color: 0x6ee08a })); b.position.set(0.5 + (r() - 0.5) * 1.4, 2.4 + r() * 0.8, 0.1); b.rotation.z = r() * 3; scene.add(b); bugs.push({ b, ph: r() * 6 }); }
    }
    if (variant === 'enamel') { st.label({ text: 'esmalte', p: [-1.3, 1.9, 0], t0: 0.3, color: COL.white, size: 40, dx: -80 }); st.label({ text: 'dentina', p: [0.8, 0.6, 0], t0: 0.8, color: COL.gold, size: 40, dx: 120 }); st.label({ text: 'pulpa', p: [0, -0.4, 0], t0: 1.3, color: '#ff8a9a', size: 40, dx: -120, dy: -120 }); st.label({ text: 'lo más duro del cuerpo', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.gold, size: 42 }); }
    if (variant === 'cavity') st.label({ text: 'bacterias + azúcar = ácido', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.green, size: 42 });
    if (variant === 'norepair') st.label({ text: 'el esmalte no se regenera', screen: [540, 1000], t0: (d) => d * 0.3, color: '#ff8a7a', size: 42 });
    return (lt, dur) => {
      if (hole) { const g = variant === 'cavity' ? smooth(prog(lt, 0.4, dur * 0.7)) : 1; hole.scale.setScalar(Math.max(0.01, g)); }
      bugs.forEach((o) => { o.b.rotation.z = o.ph + lt * 2; o.b.position.y += Math.sin(lt * 3 + o.ph) * 0.002; o.b.visible = variant === 'cavity'; });
      camera.position.set(0, 0, 11); camera.lookAt(0, -0.3, 0);
      st.draw(lt, dur);
    };
  }

  // Tiburón: filas de dientes que avanzan como una cinta.
  function sharkScene(canvas) {
    const st = stage(canvas, { bg: 0x064a6a, fog: [0x064a6a, 8, 28], stars: false, focus: 0.37, hemi: 0.95, moon: 1.1 });
    const { scene, camera } = st;
    const jaw = new T.Mesh(new T.TorusGeometry(2.4, 0.5, 10, 40, PI), new T.MeshStandardMaterial({ color: 0xd88a9a, flatShading: true })); jaw.rotation.x = -PI / 2; scene.add(jaw);
    const rows = [];
    for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) {
      const a = PI * (0.06 + 0.88 * i / 11); const t = new T.Mesh(new T.ConeGeometry(0.16, 0.55, 3), new T.MeshStandardMaterial({ color: 0xf4f2ec, flatShading: true }));
      scene.add(t); rows.push({ t, a, r });
    }
    st.label({ text: 'miles de dientes en su vida', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 44 });
    return (lt, dur) => {
      const shift = (lt * 0.25) % 1;
      rows.forEach((o) => { const rr = o.r - shift; const rad = 2.4 - rr * 0.32; o.t.position.set(Math.cos(o.a) * rad, 0.25 - rr * 0.12, -Math.sin(o.a) * rad); o.t.rotation.set(-0.3 - rr * 0.5, -o.a + PI / 2, 0); o.t.visible = rr > -0.9; o.t.scale.setScalar(clamp(1 - Math.max(0, rr - 2.5))); });
      camera.position.set(0, 3.4, 5.6); camera.lookAt(0, 0, -1.2);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  reg('die_hook', (c) => smileScene(c));
  ['jaw', 'count', 'roots', 'push', 'outro'].forEach((v) => reg(`die_${v}`, (c) => jawScene(c, v)));
  ['enamel', 'cavity', 'norepair'].forEach((v) => reg(`die_${v}`, (c) => sectionScene(c, v)));
  reg('die_shark', (c) => sharkScene(c));
})();
