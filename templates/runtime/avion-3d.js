// Escenas 3D "¿Cómo vuela un avión?" (avi_*). Avión y ala de diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow, tr } = K;

  K.addEN({
    'sustentación': 'lift', 'peso': 'weight', 'empuje': 'thrust', 'resistencia': 'drag', 'ángulo de ataque': 'angle of attack',
    'empuja el aire hacia abajo': 'pushes air down', 'el aire empuja el ala arriba': 'the air pushes the wing up',
    'menos presión': 'lower pressure', 'más presión': 'higher pressure', 'mito: llegan juntas ✗': 'myth: they arrive together ✗',
    'arriba llega antes': 'the top one arrives first', 'flaps': 'flaps', 'km/h': 'km/h', 'aire 3 veces menos denso': 'air 3 times thinner',
    '≈ 11 km de altura': '≈ 11 km up', 'vuela al revés': 'flying upside down',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  // Avión comercial low-poly (morro hacia +x).
  function airliner(color = 0xf2f4f8, accent = 0x2f7fd0) {
    const g = new T.Group();
    const mat = new T.MeshStandardMaterial({ color, flatShading: true, roughness: 0.5 });
    const acc = new T.MeshStandardMaterial({ color: accent, flatShading: true });
    const body = new T.Mesh(new T.CylinderGeometry(0.32, 0.3, 4.2, 14), mat); body.rotation.z = PI / 2; g.add(body);
    const nose = new T.Mesh(new T.SphereGeometry(0.32, 14, 10), mat); nose.scale.x = 1.6; nose.position.x = 2.1; g.add(nose);
    const tailc = new T.Mesh(new T.ConeGeometry(0.3, 1.0, 14), mat); tailc.rotation.z = PI / 2; tailc.position.x = -2.6; g.add(tailc);
    const wingS = new T.Shape(); wingS.moveTo(0.6, 0); wingS.lineTo(-0.5, 2.4); wingS.lineTo(-0.9, 2.4); wingS.lineTo(-0.6, 0);
    const wg = new T.ExtrudeGeometry(wingS, { depth: 0.06, bevelEnabled: false }); wg.rotateX(PI / 2);
    [1, -1].forEach((s) => { const w = new T.Mesh(wg, mat); w.scale.z = s; w.position.set(0.1, -0.08, 0); g.add(w);
      const eng = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.6, 10), acc); eng.rotation.z = PI / 2; eng.position.set(0.25, -0.3, s * 0.95); g.add(eng); });
    const fin = new T.Mesh(new T.BoxGeometry(0.7, 0.9, 0.05), acc); fin.position.set(-2.4, 0.55, 0); fin.rotation.z = -0.35; g.add(fin);
    [1, -1].forEach((s) => { const st = new T.Mesh(new T.BoxGeometry(0.5, 0.04, 0.9), mat); st.position.set(-2.45, 0.05, s * 0.5); g.add(st); });
    const win = new T.MeshBasicMaterial({ color: 0x223 });
    for (let i = 0; i < 12; i++) [1, -1].forEach((s) => { const w = new T.Mesh(new T.PlaneGeometry(0.1, 0.08), win); w.position.set(1.5 - i * 0.28, 0.1, s * 0.315); if (s < 0) w.rotation.y = PI; g.add(w); });
    return g;
  }

  function arrow3(scene, color, dir, len, at) {
    const a = new T.ArrowHelper(new T.Vector3(...dir).normalize(), new T.Vector3(...at), len, color, len * 0.28, len * 0.18);
    a.line.material.linewidth = 3; onGlow(a); scene.add(a); return a;
  }

  function clouds(scene, n, seed, y = -3, spread = 40) {
    const r = rng(seed); const mat = new T.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    const list = [];
    for (let i = 0; i < n; i++) { const c = new T.Mesh(new T.IcosahedronGeometry(1.5 + r() * 1.8, 1), mat); c.position.set((r() - 0.5) * spread, y + r() * 1.5, -r() * 30 + 6); c.scale.y = 0.45; scene.add(c); list.push({ c, x: c.position.x }); }
    return (lt, v = 2) => list.forEach((o) => { o.c.position.x = ((o.x - lt * v + spread / 2) % spread + spread) % spread - spread / 2; });
  }

  function skyScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x3f86d8, fog: [0x9fc8f0, 18, 60], stars: false, focus: 0.37, hemi: 1.0, moon: 1.3 });
    const { scene, camera } = st;
    const cl = clouds(scene, 30, 4);
    const plane = airliner(); scene.add(plane);
    const forces = [];
    if (variant === 'forces') {
      forces.push({ a: arrow3(scene, 0x6ee08a, [0, 1, 0], 2.2, [0, 0.4, 0]), t: 'sustentación', p: [0, 2.7, 0] });
      forces.push({ a: arrow3(scene, 0xff6a5a, [0, -1, 0], 2.2, [0, -0.4, 0]), t: 'peso', p: [0, -2.7, 0] });
      forces.push({ a: arrow3(scene, 0xffc94a, [1, 0, 0], 2.0, [2.6, 0, 0]), t: 'empuje', p: [4.7, 0, 0] });
      forces.push({ a: arrow3(scene, 0x8fd0ff, [-1, 0, 0], 1.8, [-2.9, 0, 0]), t: 'resistencia', p: [-4.8, 0, 0] });
      forces.forEach((f, i) => st.label({ text: f.t, p: f.p, t0: 0.3 + i * 0.6, color: ['#6ee08a', '#ff8a7a', COL.gold, COL.blue][i], size: 38, dy: i === 1 ? -110 : 80 }));
    }
    if (variant === 'high') {
      st.label({ text: '≈ 11 km de altura', screen: [540, 470], t0: 0.3, color: COL.white, size: 44 });
      st.label({ text: 'aire 3 veces menos denso', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.blue, size: 44 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      cl(lt, variant === 'forces' ? 1.5 : 3);
      plane.position.set(0, Math.sin(lt * 0.8) * 0.08, 0); plane.rotation.set(Math.sin(lt * 0.5) * 0.03, 0, 0.03);
      forces.forEach((f, i) => { const p = smooth(prog(lt, 0.3 + i * 0.6, 0.5)); f.a.scale.setScalar(Math.max(0.001, p)); f.a.visible = p > 0.01; });
      if (variant === 'forces') { camera.position.set(lerp(1, 2.5, k), 1.2, 12.5); camera.lookAt(0, 0, 0); }
      else if (variant === 'high') { camera.position.set(-6, 1.5, 8); camera.lookAt(0, -0.5, 0); }
      else if (variant === 'outro') { camera.position.set(lerp(-6, -3, k), 2, lerp(9, 16, k)); camera.lookAt(lerp(0, 3, k), 0, 0); plane.position.x = lt * 1.5; }
      else { camera.position.set(lerp(-7, -5, k), lerp(2.5, 1.5, k), lerp(8, 7, k)); camera.lookAt(0.5, 0, 0); }
      st.draw(lt, dur);
    };
  }

  // Perfil de ala (NACA aproximado) en corte, con líneas de corriente de aire.
  const AOA = 0.14;
  function airfoilShape(c = 4) {
    const s = new T.Shape(); const N = 40; const pts = [];
    for (let i = 0; i <= N; i++) { const x = (1 - Math.cos(i / N * PI)) / 2; const t = 0.14 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4) * 5; const camber = 0.06 * Math.sin(x * PI); pts.push([x, camber + t, camber - t]); }
    s.moveTo(-c / 2, 0); pts.forEach(([x, u]) => s.lineTo(x * c - c / 2, u * c));
    for (let i = pts.length - 1; i >= 0; i--) s.lineTo(pts[i][0] * c - c / 2, pts[i][2] * c);
    return s;
  }

  function wingScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, focus: 0.38, hemi: 0.9 });
    const { scene, camera } = st;
    const wing = new T.Mesh(new T.ExtrudeGeometry(airfoilShape(), { depth: 1.6, bevelEnabled: false }), new T.MeshStandardMaterial({ color: 0xdfe4ee, flatShading: true }));
    wing.geometry.translate(0, 0, -0.8); wing.rotation.z = -AOA; scene.add(wing);
    // Líneas de corriente: se curvan sobre/bajo el ala y salen hacia abajo detrás.
    const stream = (y0) => (x) => {
      const near = Math.exp(-(x * x) / 3.5);
      const above = y0 > 0 ? 1 : -1;
      const bump = above > 0 ? 0.55 * near / (0.6 + Math.abs(y0)) : -0.15 * near / (0.6 + Math.abs(y0));
      const down = -0.35 * smooth(clamp((x + 1) / 4)) / (0.5 + Math.abs(y0) * 0.6);
      return y0 + bump + down - (x < -1 ? 0.1 * (x + 1) * AOA : 0);
    };
    const rows = [-1.6, -1.0, -0.55, 0.55, 1.0, 1.6, 2.3];
    const lines = rows.map((y0) => { const f = stream(y0); const pts = []; for (let x = -6; x <= 6; x += 0.1) pts.push(new T.Vector3(x, f(x), 0.9)); const m = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.55 })); scene.add(m); return { f, y0 }; });
    const dots = [];
    rows.forEach((y0, i) => { for (let j = 0; j < 5; j++) { const s = glowSprite(y0 > 0 ? 0x8fd0ff : 0xffd27a, 0.22, 1); scene.add(s); dots.push({ s, f: lines[i].f, ph: j / 5, top: y0 > 0 }); } });
    let up = null, down = null, low = null, high = null;
    if (variant === 'down') {
      down = arrow3(scene, 0x8fd0ff, [0.4, -1, 0], 1.6, [2.8, -0.6, 0.9]);
      up = arrow3(scene, 0x6ee08a, [0, 1, 0], 1.8, [0, 0.4, 0.9]);
      st.label({ text: 'empuja el aire hacia abajo', p: [3.3, -1.8, 0.9], t0: (d) => d * 0.2, color: COL.blue, size: 36, dy: -60 });
      st.label({ text: 'el aire empuja el ala arriba', p: [0, 2.2, 0.9], t0: (d) => d * 0.5, color: COL.green, size: 38 });
    }
    if (variant === 'pressure') {
      low = new T.Mesh(new T.PlaneGeometry(5, 1.4), new T.MeshBasicMaterial({ color: 0x2f8bff, transparent: true, opacity: 0.35, depthWrite: false }));
      low.position.set(0, 0.95, 0.85); scene.add(low);
      high = new T.Mesh(new T.PlaneGeometry(5, 1.0), new T.MeshBasicMaterial({ color: 0xff6a3c, transparent: true, opacity: 0.3, depthWrite: false }));
      high.position.set(0, -0.75, 0.85); scene.add(high);
      st.label({ text: 'menos presión', p: [0, 1.5, 0.9], t0: 0.4, color: COL.blue, size: 40 });
      st.label({ text: 'más presión', p: [0, -1.2, 0.9], t0: (d) => d * 0.4, color: COL.orange, size: 40, dy: -130 });
    }
    if (variant === 'wing') st.label({ text: 'ángulo de ataque', p: [-2, 0.3, 0.9], t0: (d) => d * 0.35, color: COL.gold, size: 38, dx: -40 });
    let race = null;
    if (variant === 'myth') {
      race = [glowSprite(0x8fd0ff, 0.6, 1), glowSprite(0xffd27a, 0.6, 1)]; race.forEach((s) => scene.add(s));
      st.label({ text: 'mito: llegan juntas ✗', screen: [540, 470], t0: 0.3, color: '#ff8a7a', size: 42 });
      st.label({ text: 'arriba llega antes', p: () => race[0].position.toArray(), t0: (d) => d * 0.55, color: COL.blue, size: 38 });
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      dots.forEach((o) => { const sp = o.top ? 0.32 : 0.24; const f = (lt * sp + o.ph) % 1; const x = -6 + f * 12; o.s.position.set(x, o.f(x), 0.95); o.s.material.opacity = Math.sin(f * PI); o.s.visible = !race; });
      if (race) {
        const f0 = clamp((lt - 0.3) / (dur * 0.55)), f1 = clamp((lt - 0.3) / (dur * 0.75));
        const x0 = lerp(-5, 5, f0), x1 = lerp(-5, 5, f1);
        race[0].position.set(x0, lines[3].f(x0), 0.95); race[1].position.set(x1, lines[2].f(x1), 0.95);
      }
      if (up) { const p = smooth(prog(lt, dur * 0.45, 0.6)); up.scale.setScalar(Math.max(0.001, p)); }
      camera.position.set(lerp(-0.4, 0.4, k), 0.4, lerp(11, 10, k)); camera.lookAt(0, 0.1, 0);
      st.draw(lt, dur);
    };
  }

  function takeoffScene(canvas) {
    const st = stage(canvas, { bg: 0x5fa0e0, fog: [0xa8d0f0, 25, 90], stars: false, focus: 0.38, hemi: 1.0, moon: 1.3 });
    const { scene, camera } = st;
    const ground = new T.Mesh(new T.PlaneGeometry(200, 80), new T.MeshStandardMaterial({ color: 0x5a9a4a })); ground.rotation.x = -PI / 2; scene.add(ground);
    const run = new T.Mesh(new T.PlaneGeometry(200, 3), new T.MeshStandardMaterial({ color: 0x3a3c44 })); run.rotation.x = -PI / 2; run.position.y = 0.01; scene.add(run);
    for (let i = 0; i < 60; i++) { const m = new T.Mesh(new T.PlaneGeometry(1.2, 0.12), new T.MeshBasicMaterial({ color: 0xffffff })); m.rotation.x = -PI / 2; m.position.set(-100 + i * 3.4, 0.02, 0); scene.add(m); }
    const plane = airliner(); scene.add(plane);
    st.overlay = (ctx, lt, dur, FONT) => {
      const v = Math.round(260 * clamp(lt / (dur * 0.7)));
      ctx.save(); ctx.fillStyle = 'rgba(8,12,24,.85)'; ctx.beginPath(); ctx.roundRect(370, 880, 340, 130, 24); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `900 76px ${FONT}`; ctx.fillText(String(v), 500, 970);
      ctx.font = `800 34px ${FONT}`; ctx.fillText(tr('km/h'), 650, 970); ctx.restore();
    };
    return (lt, dur) => {
      const a = clamp(lt / (dur * 0.7));
      const x = -20 + 30 * a * a + Math.max(0, lt - dur * 0.7) * 12;
      const lift = Math.max(0, lt - dur * 0.62); const y = 0.62 + lift * lift * 1.2;
      plane.position.set(x, y, 0); plane.rotation.z = lt > dur * 0.6 ? Math.min(0.18, (lt - dur * 0.6) * 0.3) : 0;
      camera.position.set(x - 6, 2.2 + y * 0.6, 9); camera.lookAt(x + 1, y + 0.6, 0);
      st.draw(lt, dur);
    };
  }

  function upsideScene(canvas) {
    const st = stage(canvas, { bg: 0x3f86d8, fog: [0x9fc8f0, 18, 60], stars: false, focus: 0.37, hemi: 1.0, moon: 1.3 });
    const { scene, camera } = st;
    const cl = clouds(scene, 24, 9);
    const p = airliner(0xff5a3c, 0xffffff); p.scale.setScalar(0.7); scene.add(p);
    st.label({ text: 'vuela al revés', p: () => [p.position.x, p.position.y - 0.6, 0], t0: (d) => d * 0.45, color: COL.gold, size: 44, dy: -150 });
    return (lt, dur) => {
      cl(lt, 4);
      const roll = PI * smooth(prog(lt, 0.3, dur * 0.4));
      p.rotation.set(roll, 0, -0.12 * Math.sin(roll)); p.position.y = Math.sin(lt) * 0.1;
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-5, -3.5, k), 1.2, 6.5); camera.lookAt(0.5, 0, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'forces', 'high', 'outro'].forEach((v) => reg(`avi_${v}`, (c) => skyScene(c, v)));
  ['wing', 'down', 'pressure', 'myth'].forEach((v) => reg(`avi_${v}`, (c) => wingScene(c, v)));
  reg('avi_takeoff', (c) => takeoffScene(c));
  reg('avi_upside', (c) => upsideScene(c));
})();
