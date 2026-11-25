// Escenas 3D "¿Qué pasaría si la Luna desapareciera?" (sl_*), pensadas para video horizontal. Diseño propio con Three.js r149.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, noise2, rng, stage, glowSprite, onGlow, space, sphere, sunBall } = K;

  K.addEN({
    '384.000 km': '384,000 km', 'sin Luna': 'no Moon', 'Luna llena': 'full Moon', 'igual que con luna nueva': 'just like a new moon',
    'miles de estrellas': 'thousands of stars', 'noches sin Luna: cazan mejor': 'moonless nights: better hunting',
    'todos casi a la vez': 'almost all at once', 'sin señal: desorden': 'no signal: chaos',
    'la Luna estira el mar': 'the Moon stretches the sea', 'marea alta': 'high tide', 'dos mareas altas al día': 'two high tides a day',
    'el Sol: cerca de la mitad': 'the Sun: about half', 'mareas mucho más pequeñas': 'much smaller tides',
    'la distancia gana': 'distance wins', 'con Luna': 'with the Moon', 'zona entre mareas': 'intertidal zone',
    'Marte: quizá 0° a 60°': 'Mars: maybe 0° to 60°', '¿hasta 85°?': 'up to 85°?', 'un polo con Sol, otro a oscuras': 'one pole sunlit, one dark',
    'antes': 'before', 'ahora': 'now', 'cambios más lentos': 'slower changes', 'sigue su órbita': 'stays in orbit',
    'centro de giro': 'balance point', 'casi todos pasan de largo': 'almost all fly past', 'día: ~18 horas': 'day: ~18 hours', 'hoy: 24 horas': 'today: 24 hours',
    'hace 1.400 millones de años': '1.4 billion years ago', 'Sol': 'Sun', 'Luna': 'Moon', 'Tierra': 'Earth',
  });

  const sunlight = (scene, x = -20, y = 4, z = 8, i = 2.2) => { const l = new T.DirectionalLight(0xfff4e0, i); l.position.set(x, y, z); scene.add(l); return l; };

  // La Luna se deshace en polvo (vanish) o se apaga y enciende (switch) junto a la Tierra.
  function vanishScene(canvas, variant) {
    const st = space(canvas);
    const { scene, camera } = st;
    sunlight(scene, -14, 5, 12);
    const earth = sphere(1.5, 'earth', 2, 5); earth.position.set(-2.4, 0, 0); scene.add(earth);
    const moon = sphere(0.75, 'moon', 5, 5); moon.position.set(2.6, 0.5, 0); moon.material.transparent = true; scene.add(moon);
    const N = 700, r = rng(11), dirs = [], pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const a = r() * PI * 2, u = r() * 2 - 1, s = Math.sqrt(1 - u * u); dirs.push([s * Math.cos(a), u, s * Math.sin(a), 0.4 + r()]); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const dust = new T.Points(geo, new T.PointsMaterial({ color: 0xd8d8e0, size: 3, sizeAttenuation: false, transparent: true })); scene.add(dust);
    const glow = glowSprite(0xdfe8ff, 1, 0); glow.position.copy(moon.position); scene.add(glow);
    if (variant === 'vanish') st.label({ text: 'sin Luna', p: [2.6, 0.5, 0], t0: (d) => d * 0.7, color: COL.white, size: 46 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      let f = variant === 'vanish' ? prog(lt, dur * 0.35, dur * 0.4) : 0.5 - 0.5 * Math.cos(lt * 2.4);
      if (variant === 'switch') f = smooth(clamp((f - 0.5) * 4 + 0.5));
      moon.material.opacity = 1 - clamp(f * 1.6); moon.visible = f < 0.63;
      for (let i = 0; i < N; i++) {
        const d = dirs[i], q = 0.75 + (variant === 'vanish' ? smooth(f) * 2.2 * d[3] : 0);
        pos[i * 3] = 2.6 + d[0] * q + (variant === 'vanish' ? f * f * 1.2 : 0); pos[i * 3 + 1] = 0.5 + d[1] * q; pos[i * 3 + 2] = d[2] * q;
      }
      geo.attributes.position.needsUpdate = true;
      dust.material.opacity = variant === 'vanish' ? Math.sin(clamp(f) * PI) : f * 0.25;
      glow.scale.setScalar(2 + f * 4); glow.material.opacity = Math.sin(clamp(f) * PI) * 0.5;
      earth.rotation.y = lt * 0.25; moon.rotation.y = lt * 0.1;
      camera.position.set(lerp(-0.4, 0.4, k), 1, lerp(11, 10, k)); camera.lookAt(0, 0.1, 0);
      st.draw(lt, dur);
    };
  }

  // Paisaje nocturno: moon (Luna llena), fade (se apaga), stars (cielo lleno de estrellas), lions (ojos en la sabana).
  function skyScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0a1330, fog: [0x0a1330, 26, 80], hemi: 0.25, moon: 0.01, stars: true });
    const { scene, camera } = st;
    const geo = new T.PlaneGeometry(120, 70, 90, 50); geo.rotateX(-PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, noise2(x * 0.12, z * 0.12) * 1.5 + smooth(clamp((-z - 12) / 20)) * noise2(x * 0.1 + 9, 3) * 8); }
    geo.computeVertexNormals();
    scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ color: variant === 'lions' ? 0x6a5a34 : 0x2d5a46, flatShading: true, roughness: 1 })));
    const r = rng(8);
    const tree = (x, z, s) => {
      const g = new T.Group();
      const trunk = new T.Mesh(new T.CylinderGeometry(0.12, 0.2, 1.6, 6), new T.MeshStandardMaterial({ color: 0x3a2a1c, flatShading: true })); trunk.position.y = 0.8;
      const top = new T.Mesh(variant === 'lions' ? new T.CylinderGeometry(1.9, 1.0, 0.6, 9) : new T.ConeGeometry(1.0, 2.6, 7), new T.MeshStandardMaterial({ color: 0x1f5a36, flatShading: true }));
      top.position.y = variant === 'lions' ? 1.9 : 2.6; g.add(trunk, top); g.position.set(x, noise2(x * 0.12, z * 0.12) * 1.5, z); g.scale.setScalar(s); scene.add(g);
    };
    for (let i = 0; i < (variant === 'lions' ? 7 : 18); i++) { const x = (r() - 0.5) * 34; tree(x, -4 - r() * 14, 0.8 + r() * 0.8); }
    const moon = sphere(2.1, 'moon', 5, 5); moon.material = new T.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true });
    moon.position.set(6, 12.5, -32); scene.add(moon);
    const halo = glowSprite(0xdfe8ff, 13, 0.5); halo.material.fog = false; halo.position.copy(moon.position); scene.add(halo);
    const ml = new T.DirectionalLight(0xcfdcff, 1.3); ml.position.set(6, 13, 4); scene.add(ml);
    const N = 2600, sp = new Float32Array(N * 3), sr = rng(77);
    for (let i = 0; i < N; i++) { const band = i % 2; const x = (sr() - 0.5) * 120; const y = band ? 14 + x * 0.22 + (sr() + sr() - 1) * 9 : 2 + sr() * 45; sp.set([x, y, -60], i * 3); }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
    const many = new T.Points(sg, new T.PointsMaterial({ color: 0xeaf0ff, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 })); scene.add(many);
    const lions = [];
    if (variant === 'lions') {
      [[-3.6, 2.6, 1], [0.6, -1.0, 1], [5.0, 2.4, -1]].forEach(([x, z, dir], i) => {
        const g = new T.Group(); const mat = new T.MeshStandardMaterial({ color: 0xc9974e, flatShading: true }); const mane = new T.MeshStandardMaterial({ color: 0x7a4a22, flatShading: true });
        const add = (geoM, m, a, b, c) => { const q = new T.Mesh(geoM, m); q.position.set(a, b, c); g.add(q); return q; };
        add(new T.BoxGeometry(1.5, 0.6, 0.55), mat, 0, 0.75, 0);
        if (i === 0) add(new T.IcosahedronGeometry(0.46, 1), mane, 0.74, 1.05, 0);
        add(new T.BoxGeometry(0.5, 0.48, 0.46), mat, 1.0, 1.05, 0);
        add(new T.BoxGeometry(0.26, 0.22, 0.3), mat, 1.32, 0.96, 0);
        [-0.15, 0.15].forEach((e) => add(new T.ConeGeometry(0.1, 0.18, 5), mat, 0.92, 1.36, e));
        const legs = [[0.55, 0.18], [0.55, -0.18], [-0.55, 0.18], [-0.55, -0.18]].map(([a, c]) => add(new T.BoxGeometry(0.17, 0.6, 0.17), mat, a, 0.28, c));
        const tail = add(new T.CylinderGeometry(0.04, 0.04, 0.9, 5), mat, -1.05, 0.85, 0); tail.rotation.z = 1.0;
        [-0.13, 0.13].forEach((e) => { const s = glowSprite(0xffe27a, 0.26, 1); s.position.set(1.28, 1.14, e); g.add(s); });
        g.position.set(x, noise2(x * 0.12, z * 0.12) * 1.5, z); g.scale.x = dir; scene.add(g); lions.push({ g, legs, x, dir });
      });
      st.label({ text: 'noches sin Luna: cazan mejor', screen: [540, 470], t0: (d) => d * 0.4, color: COL.gold, size: 44 });
    }
    if (variant === 'moon') st.label({ text: 'Luna llena', p: [6, 12.5, -32], t0: 0.5, color: COL.white, size: 44, dy: -130 });
    if (variant === 'fade') st.label({ text: 'igual que con luna nueva', screen: [540, 600], t0: (d) => d * 0.55, color: COL.blue, size: 46 });
    if (variant === 'stars') st.label({ text: 'miles de estrellas', screen: [760, 560], t0: (d) => d * 0.35, color: COL.gold, size: 48 });
    const cA = new T.Color(0x17264f), cB = new T.Color(0x04060e);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const off = variant === 'moon' ? 0 : variant === 'fade' ? smooth(prog(lt, dur * 0.2, dur * 0.35)) : 1;
      moon.material.opacity = 1 - off; moon.visible = off < 0.99; halo.material.opacity = 0.5 * (1 - off);
      ml.intensity = lerp(1.3, variant === 'lions' ? 0.55 : 0.18, off);
      scene.background.copy(cA).lerp(cB, off); scene.fog.color.copy(scene.background);
      many.material.opacity = variant === 'stars' ? smooth(prog(lt, 0.2, dur * 0.4)) : off * 0.45;
      lions.forEach((o, i) => { o.g.position.x = o.x + o.dir * lt * 0.16; o.legs.forEach((l, j) => { l.rotation.z = Math.sin(lt * 4 + i + (j % 2) * PI) * 0.35; }); });
      if (variant === 'lions') { camera.position.set(0, 3.4, 13); camera.lookAt(0, 2.4, 0); }
      else { camera.position.set(lerp(-1, 1, k), 3.4, 15); camera.lookAt(1.5, 7.2, -20); }
      st.draw(lt, dur);
    };
  }

  // Arrecife de noche: los corales sueltan bolitas a la vez (sync) o en desorden (lost).
  function coralScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x05203a, fog: [0x05203a, 9, 26], stars: false, hemi: 0.7, moon: 0.8 });
    const { scene, camera } = st;
    const fg = new T.PlaneGeometry(40, 24, 50, 30); fg.rotateX(-PI / 2);
    const fp = fg.attributes.position; for (let i = 0; i < fp.count; i++) fp.setY(i, noise2(fp.getX(i) * 0.5, fp.getZ(i) * 0.5) * 0.7);
    fg.computeVertexNormals(); scene.add(new T.Mesh(fg, new T.MeshStandardMaterial({ color: 0xa89468, flatShading: true })));
    const cols = [0xff7a8a, 0xffa04a, 0xb07aff, 0x4ad0b0, 0xff5aa8]; const r = rng(21); const eggs = [];
    const eggGeo = new T.SphereGeometry(0.06, 6, 5);
    for (let c = 0; c < 13; c++) {
      const x = -6 + c + (r() - 0.5) * 0.6, z = -2.5 + r() * 4.5, s = 0.8 + r() * 0.5;
      const g = new T.Group(); const mat = new T.MeshStandardMaterial({ color: cols[c % 5], flatShading: true });
      for (let b = 0; b < 8; b++) {
        const h = 0.6 + r() * 0.8; const m = new T.Mesh(c % 3 ? new T.CylinderGeometry(0.07, 0.15, h, 6) : new T.IcosahedronGeometry(0.28, 1), mat);
        const a = b / 8 * PI * 2; m.position.set(Math.cos(a) * 0.3, c % 3 ? h * 0.45 : 0.25 + (b % 3) * 0.14, Math.sin(a) * 0.3); m.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(m);
      }
      g.position.set(x, 0.3, z); g.scale.setScalar(s); scene.add(g);
      const late = r();
      for (let e = 0; e < 12; e++) {
        const m = onGlow(new T.Mesh(eggGeo, new T.MeshBasicMaterial({ color: 0xffb0b8, transparent: true }))); scene.add(m);
        eggs.push({ m, x: x + (r() - 0.5) * 0.7, z: z + (r() - 0.5) * 0.7, d: r() * 0.15, late, sp: 0.8 + r() * 0.5, ph: r() * 6 });
      }
    }
    const moonG = glowSprite(0xdfe8ff, 5, 0.7); moonG.material.fog = false; moonG.position.set(3, 7, -9); scene.add(moonG);
    st.label({ text: variant === 'sync' ? 'todos casi a la vez' : 'sin señal: desorden', screen: [540, 480], t0: (d) => d * 0.45, color: variant === 'sync' ? COL.gold : '#ff8a7a', size: 46 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      eggs.forEach((o) => {
        const start = variant === 'sync' ? dur * 0.25 + o.d : o.late * dur * 0.95;
        const t = Math.max(0, lt - start); o.m.visible = t > 0;
        o.m.position.set(o.x + Math.sin(t * 1.4 + o.ph) * 0.2, 1.0 + t * o.sp, o.z); o.m.material.opacity = clamp(1.4 - t * 0.2);
      });
      moonG.material.opacity = variant === 'sync' ? 0.7 : 0.12;
      camera.position.set(lerp(-0.8, 0.8, k), 2.6, 10.5); camera.lookAt(0, 2.0, 0);
      st.draw(lt, dur);
    };
  }

  // Tierra con océano estirado: pull, spin, sun, none, why.
  function tideScene(canvas, variant) {
    const st = space(canvas);
    const { scene, camera } = st;
    sunlight(scene, -14, 8, 14, 1.9); scene.add(new T.AmbientLight(0x8090b0, 0.35));
    const earth = sphere(1.35, 'earth', 2, 5); scene.add(earth);
    const water = new T.Mesh(new T.SphereGeometry(1.45, 48, 32), new T.MeshStandardMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0.38, depthWrite: false })); scene.add(water);
    const withMoon = variant === 'pull' || variant === 'spin' || variant === 'why';
    const withSun = variant === 'sun' || variant === 'none' || variant === 'why';
    const moon = sphere(0.45, 'moon', 5, 4); moon.position.set(4.3, 0, 0); moon.visible = withMoon || variant === 'none'; moon.material.transparent = true; scene.add(moon);
    if (withSun) sunBall(scene, [variant === 'why' ? -6.2 : -5.2, 0, 0], variant === 'why' ? 0.8 : 0.9);
    const arrows = [];
    if (variant !== 'spin') {
      const dirX = withMoon && variant !== 'why' ? 1 : -1;
      for (let i = -1; i <= 1; i++) { const a = new T.ArrowHelper(new T.Vector3(dirX, 0, 0), new T.Vector3(dirX * 2.1, i * 0.45, 0.4), 0.9, withMoon ? 0x8fd0ff : 0xffc94a, 0.28, 0.2); onGlow(a); scene.add(a); arrows.push(a); }
    }
    if (variant === 'why') { arrows.forEach((a) => { a.visible = false; }); const line = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(1.7, 0, 0), new T.Vector3(3.8, 0, 0)]), new T.LineBasicMaterial({ color: 0xffffff })); scene.add(line); }
    const pin = new T.Group(); const head = onGlow(new T.Mesh(new T.SphereGeometry(0.1, 10, 8), new T.MeshBasicMaterial({ color: 0xff5a5a }))); head.position.set(1.5, 0.1, 0); pin.add(head); pin.visible = variant === 'spin'; scene.add(pin);
    if (withMoon) st.label({ text: 'Luna', p: [4.3, 0.45, 0], t0: 0.3, color: COL.white, size: 36, dy: 80 });
    if (withSun) st.label({ text: 'Sol', p: [variant === 'why' ? -6.2 : -5.2, 0.9, 0], t0: 0.3, color: COL.gold, size: 36, dy: 70 });
    const txt = { pull: 'la Luna estira el mar', spin: 'dos mareas altas al día', sun: 'el Sol: cerca de la mitad', none: 'mareas mucho más pequeñas', why: 'la distancia gana' }[variant];
    st.label({ text: txt, screen: [540, 960], t0: (d) => d * 0.45, color: COL.gold, size: 46 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const gone = variant === 'none' ? smooth(prog(lt, dur * 0.15, dur * 0.35)) : 0;
      let a = { pull: 0.32 * smooth(prog(lt, 0.4, dur * 0.4)), spin: 0.32, sun: 0.14 * smooth(prog(lt, 0.4, dur * 0.4)), none: lerp(0.36, 0.14, gone), why: 0.32 }[variant];
      a += 0.015 * Math.sin(lt * 3);
      water.scale.set(1 + a, 1 - a * 0.22, 1 - a * 0.22);
      if (variant === 'none') { moon.material.opacity = 1 - gone; moon.visible = gone < 0.98; }
      earth.rotation.y = lt * (variant === 'spin' ? 0.9 : 0.25); pin.rotation.y = lt * 0.9;
      arrows.forEach((m, i) => { if (variant !== 'why') m.position.x = Math.sign(m.position.x) * (2.1 + 0.12 * Math.sin(lt * 4 + i)); });
      const cy = variant === 'spin' ? 5.2 : 1.6;
      camera.position.set(lerp(-0.4, 0.4, k) + (withSun && !withMoon ? -0.9 : withMoon && !withSun ? 0.9 : 0), cy, variant === 'why' ? 15 : 12); camera.lookAt(variant === 'why' ? -0.8 : withSun ? -1 : 1, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Playa: la franja entre la marea alta y la baja, con cangrejos; con Luna (beach) y sin ella (small).
  function beachScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x9fd4f2, fog: [0x9fd4f2, 28, 60], stars: false, hemi: 0.6, moon: 0.75 });
    const { scene, camera } = st;
    const g = new T.PlaneGeometry(40, 20, 60, 30); g.rotateX(-PI / 2);
    const p = g.attributes.position; const cols = new Float32Array(p.count * 3); const c = new T.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const y = -z * 0.2 + (noise2(x * 0.5, z * 0.5) - 0.5) * 0.25; p.setY(i, y); c.set(y > 0.75 ? 0xe8d49a : y > -0.9 ? 0xb08a58 : 0x8a7048); cols.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new T.BufferAttribute(cols, 3)); g.computeVertexNormals();
    scene.add(new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true })));
    const sea = new T.Mesh(new T.PlaneGeometry(60, 30), new T.MeshStandardMaterial({ color: 0x2a8fd0, transparent: true, opacity: 0.78 })); sea.rotation.x = -PI / 2; sea.position.set(0, 0, 8); scene.add(sea);
    const foam = new T.Mesh(new T.PlaneGeometry(60, 0.18), new T.MeshBasicMaterial({ color: 0xffffff })); foam.rotation.x = -PI / 2 + 0.2; scene.add(foam);
    const crabs = [];
    const r = rng(4);
    for (let i = 0; i < 9; i++) {
      const cg = new T.Group(); const mat = new T.MeshStandardMaterial({ color: 0xe0522f, flatShading: true });
      const body = new T.Mesh(new T.IcosahedronGeometry(0.3, 1), mat); body.scale.set(1.3, 0.7, 1); cg.add(body);
      [-1, 1].forEach((s) => { const cl = new T.Mesh(new T.IcosahedronGeometry(0.14, 0), mat); cl.position.set(s * 0.45, 0.1, 0.25); cg.add(cl); const eye = new T.Mesh(new T.SphereGeometry(0.06, 6, 5), new T.MeshBasicMaterial({ color: 0x111111 })); eye.position.set(s * 0.12, 0.3, 0.2); cg.add(eye);
        for (let q = 0; q < 3; q++) { const l = new T.Mesh(new T.BoxGeometry(0.35, 0.05, 0.05), mat); l.position.set(s * 0.45, -0.1, -0.2 + q * 0.16); l.rotation.z = -s * 0.5; cg.add(l); } });
      const z = -2.6 + r() * 5.2; cg.position.set(-7 + i * 1.7, -z * 0.2 + 0.2, z); scene.add(cg); crabs.push({ cg, x: cg.position.x, ph: r() * 6 });
    }
    st.label({ text: variant === 'beach' ? 'zona entre mareas' : 'mareas mucho más pequeñas', screen: [540, 470], t0: (d) => d * 0.3, color: variant === 'beach' ? COL.gold : '#ff8a7a', size: 46 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const amp = variant === 'beach' ? 0.85 : lerp(0.85, 0.3, smooth(prog(lt, 0.2, dur * 0.4)));
      const y = Math.cos(lt * 1.3) * amp;
      sea.position.y = y; sea.position.z = -y / 0.2 + 15; foam.position.set(0, y + 0.06, -y / 0.2);
      crabs.forEach((o) => { o.cg.position.x = o.x + Math.sin(lt * 1.2 + o.ph) * 0.5; });
      camera.position.set(lerp(-1, 1, k), 5.2, 13.5); camera.lookAt(0, 0.4, -0.5);
      st.draw(lt, dur);
    };
  }

  // Planeta con eje visible: mars, wobble, hot, debate.
  function axisScene(canvas, variant) {
    const st = space(canvas);
    const { scene, camera } = st;
    const light = sunlight(scene, -20, 1, 5, 2.4);
    const mk = (x, r, kind, color) => {
      const g = new T.Group(); g.position.x = x; scene.add(g); const m = sphere(r, kind, kind === 'earth' ? 2 : 9, 5); if (color) m.material.color.set(color); g.add(m);
      const ax = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, r * 2.8, 8), new T.MeshBasicMaterial({ color: 0xffffff })); g.add(ax);
      const tip = onGlow(new T.Mesh(new T.SphereGeometry(0.1, 10, 8), new T.MeshBasicMaterial({ color: 0xff5a5a }))); tip.position.y = r * 1.4; g.add(tip); return { g, m };
    };
    let A, B = null;
    if (variant === 'debate') {
      A = mk(-2.6, 1.15, 'earth'); B = mk(2.6, 1.15, 'earth');
      st.label({ text: 'antes', p: [-2.6, -1.3, 0], t0: 0.2, color: '#ff8a7a', size: 42, dy: -110 }); st.label({ text: 'ahora', p: [2.6, -1.3, 0], t0: 0.6, color: COL.green, size: 42, dy: -110 });
      st.label({ text: 'cambios más lentos', screen: [540, 450], t0: (d) => d * 0.5, color: COL.gold, size: 44 });
    } else A = mk(0, variant === 'mars' ? 1.5 : 1.7, variant === 'mars' ? 'moon' : 'earth', variant === 'mars' ? 0xff8a5a : null);
    if (variant === 'mars') st.label({ text: 'Marte: quizá 0° a 60°', screen: [850, 600], t0: (d) => d * 0.4, color: COL.orange, size: 46 });
    if (variant === 'wobble') st.label({ text: '¿hasta 85°?', screen: [850, 600], t0: (d) => d * 0.55, color: '#ff8a7a', size: 56 });
    if (variant === 'hot') { sunBall(scene, [-5.4, 0.2, -1], 0.7); st.label({ text: 'un polo con Sol, otro a oscuras', screen: [600, 980], t0: (d) => d * 0.4, color: COL.gold, size: 44 }); }
    const rad = PI / 180;
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const wide = (max) => (0.5 - 0.5 * Math.cos(lt * 1.1)) * max;
      let a = 23.4;
      if (variant === 'mars') a = wide(60); else if (variant === 'wobble') a = lerp(23.4, 85, 0.5 - 0.5 * Math.cos(clamp(lt / dur) * PI * 1.6)); else if (variant === 'hot') a = lerp(23.4, 82, smooth(prog(lt, 0.2, dur * 0.4))); else a = wide(85);
      // Se inclina hacia el Sol (izquierda) para que se vea qué polo queda iluminado.
      A.g.rotation.z = a * rad; A.m.rotation.y = lt * 0.6;
      if (B) { B.g.rotation.z = (23.4 + 10 * Math.sin(lt * 0.6)) * rad; B.m.rotation.y = lt * 0.6; }
      light.position.y = variant === 'hot' ? 0.5 : 1;
      camera.position.set(lerp(-0.3, 0.3, k), 0.6, variant === 'debate' ? 11.5 : 11); camera.lookAt(variant === 'hot' ? -1.2 : 0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // bary: la Tierra sigue su órbita; shield: asteroides que pasan de largo; day: giro antiguo y actual.
  function spinScene(canvas, variant) {
    const st = space(canvas);
    const { scene, camera } = st;
    const extra = [];
    let earth, earth2, moon;
    if (variant === 'bary') {
      sunBall(scene, [0, 0, 0], 0.75); scene.add(new T.PointLight(0xfff4e0, 2.6, 0, 0));
      const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * PI * 2; pts.push(new T.Vector3(Math.cos(a) * 4, 0, Math.sin(a) * 4)); }
      scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.6 })));
      earth = sphere(0.5, 'earth', 2, 4); scene.add(earth);
      st.label({ text: 'sigue su órbita', p: () => earth.position.toArray(), t0: (d) => d * 0.35, color: COL.green, size: 44 });
    } else if (variant === 'shield') {
      sunlight(scene, -14, 6, 12);
      earth = sphere(1.4, 'earth', 2, 5); earth.position.set(2.6, 0, 0); scene.add(earth);
      moon = sphere(0.38, 'moon', 5, 4); moon.position.set(-1.6, 0.5, 0.5); scene.add(moon);
      const r = rng(31);
      for (let i = 0; i < 26; i++) { const m = new T.Mesh(new T.IcosahedronGeometry(0.07 + r() * 0.09, 0), new T.MeshStandardMaterial({ color: 0x9a8a7a, flatShading: true })); scene.add(m); extra.push({ m, y: (r() - 0.5) * 6, z: (r() - 0.5) * 4, ph: r(), s: 0.25 + r() * 0.2 }); }
      st.label({ text: 'casi todos pasan de largo', screen: [540, 960], t0: (d) => d * 0.4, color: COL.gold, size: 46 });
    } else {
      sunlight(scene, -10, 5, 14); scene.add(new T.AmbientLight(0x8090b0, 0.3));
      earth = sphere(1.3, 'earth', 7, 5); earth.position.x = -2.8; scene.add(earth);
      earth2 = sphere(1.3, 'earth', 2, 5); earth2.position.x = 2.8; scene.add(earth2);
      [earth, earth2].forEach((e) => { const pole = onGlow(new T.Mesh(new T.SphereGeometry(0.12, 10, 8), new T.MeshBasicMaterial({ color: 0xff5a5a }))); pole.position.set(0, 0, 1.36); e.add(pole); });
      st.label({ text: 'hace 1.400 millones de años', p: [-2.8, 1.3, 0], t0: 0.3, color: COL.white, size: 34, dy: 60 });
      st.label({ text: 'día: ~18 horas', p: [-2.8, -1.3, 0], t0: (d) => d * 0.4, color: COL.orange, size: 46, dy: -110 });
      st.label({ text: 'hoy: 24 horas', p: [2.8, -1.3, 0], t0: (d) => d * 0.6, color: COL.blue, size: 46, dy: -110 });
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      if (variant === 'bary') { const a = 0.8 + lt * 0.45; earth.position.set(Math.cos(a) * 4, 0, Math.sin(a) * 4); earth.rotation.y = lt; camera.position.set(0, 6.5, 11); camera.lookAt(0, 0, 0); }
      else if (variant === 'shield') {
        extra.forEach((o) => { const f = (o.ph + lt * o.s * 0.5) % 1; o.m.position.set(lerp(-9, 9, f), o.y, o.z - 1); o.m.rotation.set(lt, lt * 1.3, 0); });
        earth.rotation.y = lt * 0.2; camera.position.set(0, 1, 12); camera.lookAt(0, 0, 0);
      } else { earth.rotation.y = lt * 1.6 * 24 / 18.7; earth2.rotation.y = lt * 1.6; camera.position.set(0, 1, lerp(12, 11.6, k)); camera.lookAt(0, 0, 0); }
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['vanish', 'switch'].forEach((v) => reg(`sl_${v}`, (c) => vanishScene(c, v)));
  ['moon', 'fade', 'stars', 'lions'].forEach((v) => reg(`sl_${v}`, (c) => skyScene(c, v)));
  ['sync', 'lost'].forEach((v) => reg(`sl_coral_${v}`, (c) => coralScene(c, v)));
  ['pull', 'spin', 'sun', 'none', 'why'].forEach((v) => reg(`sl_tide_${v}`, (c) => tideScene(c, v)));
  ['beach', 'small'].forEach((v) => reg(`sl_${v}`, (c) => beachScene(c, v)));
  ['mars', 'wobble', 'hot', 'debate'].forEach((v) => reg(`sl_${v}`, (c) => axisScene(c, v)));
  ['bary', 'shield', 'day'].forEach((v) => reg(`sl_${v}`, (c) => spinScene(c, v)));
})();
