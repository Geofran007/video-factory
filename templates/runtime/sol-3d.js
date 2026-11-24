// Escenas 3D "¿Por qué brilla el Sol?" (sol_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, glowSprite, onGlow, space, sphere } = K;

  K.addEN({
    'núcleo: ~15 millones °C': 'core: ~15 million °C', 'hidrógeno': 'hydrogen', 'helio': 'helium', '+ energía': '+ energy',
    '~4 millones de toneladas por segundo': '~4 million tons per second', 'superficie: ~5.500 °C': 'surface: ~5,500 °C', 'manchas solares': 'sunspots',
    '~8 minutos': '~8 minutes', 'Tierra': 'Earth', '4.600 millones de años': '4.6 billion years', 'le quedan ~5.000 millones': '~5 billion to go',
    'gigante roja': 'red giant', 'decenas de miles de años': 'tens of thousands of years',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  let sunTexC = null;
  function sunTex() {
    if (sunTexC) return sunTexC;
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    for (let y = 0; y < 256; y += 2) for (let x = 0; x < 512; x += 2) { const n = noise2(x * 0.06, y * 0.06) * 0.6 + noise2(x * 0.2, y * 0.2) * 0.4; g.fillStyle = `rgb(255,${Math.round(150 + n * 90)},${Math.round(40 + n * 60)})`; g.fillRect(x, y, 2, 2); }
    const r = rng(3); g.fillStyle = 'rgba(80,30,10,.85)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(80 + r() * 350, 90 + r() * 80, 6 + r() * 8, 0, PI * 2); g.fill(); }
    return (sunTexC = new T.CanvasTexture(c));
  }

  function sunMesh(scene, R = 2.4, cut = false) {
    const g = new T.Group(); scene.add(g);
    const surf = new T.Mesh(new T.SphereGeometry(R, 64, 40, cut ? PI / 2 : 0, cut ? PI * 1.5 : PI * 2), new T.MeshBasicMaterial({ map: sunTex(), side: T.DoubleSide }));
    g.add(surf);
    g.add(glowSprite(0xffb040, R * 3.6, 0.45));
    let layers = [];
    if (cut) {
      [[R * 0.98, 0xff8a2a], [R * 0.7, 0xffb050], [R * 0.25, 0xfff2c0]].forEach(([r, c]) => {
        const m = onGlow(new T.Mesh(new T.CircleGeometry(r, 48, 0, PI / 2), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })));
        m.rotation.y = 0; g.add(m); layers.push(m);
        const m2 = m.clone(); m2.rotation.y = PI / 2; g.add(m2); layers.push(m2);
      });
    }
    const flares = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * PI * 2; const curve = new T.QuadraticBezierCurve3(new T.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0), new T.Vector3(Math.cos(a + 0.15) * R * 1.45, Math.sin(a + 0.15) * R * 1.45, 0.2), new T.Vector3(Math.cos(a + 0.3) * R, Math.sin(a + 0.3) * R, 0));
      const f = onGlow(new T.Mesh(new T.TubeGeometry(curve, 20, 0.06, 6, false), new T.MeshBasicMaterial({ color: 0xff7a2a, transparent: true }))); g.add(f); flares.push(f);
    }
    return { g, surf, flares, update: (lt) => { surf.rotation.y = lt * 0.05; flares.forEach((f, i) => { f.material.opacity = 0.4 + 0.5 * Math.max(0, Math.sin(lt * 1.3 + i * 1.7)); }); } };
  }

  function sunScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const S = sunMesh(scene, 2.4, variant === 'core');
    if (variant === 'core') st.label({ text: 'núcleo: ~15 millones °C', p: [0, 0, 0.1], t0: (d) => d * 0.35, color: COL.white, size: 40, dy: -200 });
    if (variant === 'surface') { st.label({ text: 'superficie: ~5.500 °C', screen: [540, 1000], t0: 0.3, color: COL.gold, size: 44 }); st.label({ text: 'manchas solares', p: [0.6, 0.6, 2.3], t0: (d) => d * 0.5, color: COL.white, size: 38 }); }
    if (variant === 'mass') st.label({ text: '~4 millones de toneladas por segundo', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 38 });
    if (variant === 'age') { st.label({ text: '4.600 millones de años', screen: [540, 470], t0: 0.3, color: COL.white, size: 42 }); st.label({ text: 'le quedan ~5.000 millones', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.gold, size: 44 }); }
    if (variant === 'outro') fade(st);
    const stream = [];
    if (variant === 'mass') { const r = rng(2); for (let i = 0; i < 40; i++) { const s = glowSprite(0xfff2c0, 0.25, 1); scene.add(s); stream.push({ s, d: new T.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), ph: r() }); } }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      S.update(lt);
      if (variant === 'core') S.g.rotation.y = -0.7 + Math.sin(lt * 0.3) * 0.15;
      stream.forEach((o) => { const f = (lt * 0.4 + o.ph) % 1; o.s.position.copy(o.d).multiplyScalar(2.5 + f * 4); o.s.material.opacity = 1 - f; });
      const d = variant === 'surface' ? lerp(11, 9, k) : variant === 'outro' ? lerp(15, 20, k) : lerp(15, 14, k);
      camera.position.set(0, 0.6, d); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Fusión: núcleos de hidrógeno chocan, forman helio y liberan un destello.
  function fusionScene(canvas) {
    const st = space(canvas, { focus: 0.38, stars: false });
    const { scene, camera } = st;
    scene.background = new T.Color(0x2a0a02);
    const bg = glowSprite(0xff8a2a, 14, 0.35); bg.position.z = -3; scene.add(bg);
    const p = (c) => onGlow(new T.Mesh(new T.SphereGeometry(0.32, 20, 14), new T.MeshBasicMaterial({ color: c })));
    const H1 = [p(0xff5a4a), p(0xff5a4a), p(0xff5a4a), p(0xff5a4a)];
    H1.forEach((m) => scene.add(m));
    const He = new T.Group(); [0xff5a4a, 0x8fa0ff, 0xff5a4a, 0x8fa0ff].forEach((c, i) => { const m = p(c); m.position.set((i % 2 - 0.5) * 0.45, (Math.floor(i / 2) - 0.5) * 0.45, (i % 3) * 0.1); He.add(m); }); scene.add(He);
    const flash = glowSprite(0xffffff, 1, 0); scene.add(flash);
    st.label({ text: 'hidrógeno', p: [-2.6, 1.6, 0], t0: 0.3, color: '#ff8a7a', size: 40 });
    st.label({ text: 'helio', p: [0, 0.6, 0], t0: (d) => d * 0.6, color: COL.blue, size: 42 });
    st.label({ text: '+ energía', screen: [540, 1000], t0: (d) => d * 0.6, color: COL.gold, size: 50 });
    const starts = [[-3, 2], [3, 2], [-3, -2], [3, -2]];
    return (lt, dur) => {
      const f = smooth(prog(lt, 0.3, dur * 0.45));
      H1.forEach((m, i) => { m.position.set(lerp(starts[i][0], 0, f) + Math.sin(lt * 4 + i) * 0.1 * (1 - f), lerp(starts[i][1], 0, f), 0); m.visible = f < 0.98; });
      He.visible = f >= 0.98; He.rotation.set(lt, lt * 0.7, 0);
      const b = prog(lt, 0.3 + dur * 0.45, 1.2); flash.material.opacity = b > 0 && b < 1 ? Math.sin(b * PI) : 0; flash.scale.setScalar(1 + b * 10);
      camera.position.set(0, 0, 9); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // La luz llega a la Tierra en ~8 minutos.
  function lightScene(canvas) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const S = sunMesh(scene, 1.6); S.g.position.x = -4;
    const l = new T.DirectionalLight(0xfff4e0, 2); l.position.set(-10, 0, 3); scene.add(l);
    const earth = sphere(0.35, 'earth', 2, 3); earth.position.x = 4; scene.add(earth);
    const photon = glowSprite(0xfff2c0, 0.6, 1); scene.add(photon);
    const line = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-2.4, 0, 0), new T.Vector3(3.6, 0, 0)]), new T.LineDashedMaterial({ color: 0xffffff, dashSize: 0.15, gapSize: 0.1, transparent: true, opacity: 0.4 })); line.computeLineDistances(); scene.add(line);
    st.label({ text: 'Tierra', p: [4, 0.35, 0], t0: 0.2, color: COL.blue, size: 36 });
    st.label({ text: '~8 minutos', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 56 });
    return (lt, dur) => {
      S.update(lt); earth.rotation.y = lt * 0.3;
      const f = (lt / (dur * 0.6)) % 1; photon.position.set(lerp(-2.4, 3.6, f), 0, 0);
      camera.position.set(0, 1.6, 12); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Gigante roja: el Sol crece mucho al final de su vida.
  function giantScene(canvas) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const S = sunMesh(scene, 0.6);
    st.label({ text: 'gigante roja', screen: [540, 1000], t0: (d) => d * 0.5, color: '#ff8a7a', size: 50 });
    return (lt, dur) => {
      S.update(lt);
      const g = smooth(prog(lt, 0.4, dur * 0.7)); S.g.scale.setScalar(lerp(1, 4.2, g));
      S.surf.material.color.setRGB(1, lerp(1, 0.55, g), lerp(1, 0.45, g));
      camera.position.set(0, 0.5, 11); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Camino aleatorio de la luz desde el centro del Sol.
  function walkScene(canvas) {
    const st = space(canvas, { focus: 0.37, stars: false });
    const { scene, camera } = st;
    scene.background = new T.Color(0x2a0a02);
    const S = sunMesh(scene, 3.2, true); S.g.rotation.y = -0.7;
    const r = rng(11); const pts = [new T.Vector3(0, 0, 0.05)];
    for (let i = 0; i < 260; i++) { const last = pts[pts.length - 1]; const a = r() * PI * 2; const nx = last.x + Math.cos(a) * 0.22, ny = last.y + Math.sin(a) * 0.22 + 0.006; if (Math.hypot(nx, ny) > 3.1) break; pts.push(new T.Vector3(nx, ny, 0.05)); }
    const geo = new T.BufferGeometry().setFromPoints(pts);
    const path = onGlow(new T.Line(geo, new T.LineBasicMaterial({ color: 0xffffff }))); scene.add(path);
    const head = glowSprite(0xffffff, 0.5, 1); scene.add(head);
    st.label({ text: 'decenas de miles de años', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.gold, size: 44 });
    return (lt, dur) => {
      const n = Math.max(2, Math.floor(pts.length * clamp(lt / (dur * 0.85)))); geo.setDrawRange(0, n); head.position.copy(pts[n - 1]);
      camera.position.set(0, 0, 13); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'core', 'surface', 'mass', 'age', 'outro'].forEach((v) => reg(`sol_${v}`, (c) => sunScene(c, v)));
  reg('sol_fusion', (c) => fusionScene(c));
  reg('sol_light', (c) => lightScene(c));
  reg('sol_giant', (c) => giantScene(c));
  reg('sol_walk', (c) => walkScene(c));
})();
