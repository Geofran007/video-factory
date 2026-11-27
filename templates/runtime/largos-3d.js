// Escenas 3D de los videos largos: asteroides (ast_*), estrellas fugaces (met_*).
// Diseño propio con Three.js r149. Todo depende solo del tiempo local de la escena (lt).
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, noise2, rng, stage, glowSprite, onGlow, space, sphere, sunBall } = K;

  K.addEN({
    'Didymos · 780 m': 'Didymos · 780 m', 'Dimorphos · 160 m': 'Dimorphos · 160 m', 'DART · 2022': 'DART · 2022',
    '≈ 6 km/s': '≈ 6 km/s', '33 minutos menos': '33 minutes shorter', 'Hera · 2026': 'Hera · 2026',
    'un empujón pequeño…': 'a small nudge…', '…años antes = no choca': '…years ahead = it misses', 'Tierra': 'Earth',
    'telescopios vigilando': 'telescopes watching', 'órbita de la Tierra': "Earth's orbit", 'Faetón': 'Phaethon',
    'rastro de polvo': 'trail of dust', '13–14 de diciembre': 'December 13–14', 'Géminis': 'Gemini',
    'radiante': 'radiant', '≈ 100 km de altura': '≈ 100 km up', '≈ 35 km/s': '≈ 35 km/s',
    'grano de arena': 'grain of sand', 'aire comprimido brilla': 'squeezed air glows', 'bigotes ≈ ancho del cuerpo': 'whiskers ≈ body width',
    '≈ 24 bigotes': '≈ 24 whiskers', 'tapetum lucidum': 'tapetum lucidum', 'la luz pasa dos veces': 'light passes twice',
    'humanos: hasta 20 kHz': 'humans: up to 20 kHz', 'gatos: hasta ≈ 79 kHz': 'cats: up to ≈ 79 kHz',
    'ronroneo ≈ 20–30 Hz': 'purr ≈ 20–30 Hz', '12–16 horas al día': '12–16 hours a day', 'sin sabor dulce': 'no sweet taste',
    'parpadeo lento = confianza': 'slow blink = trust', 'cinturón de asteroides': 'asteroid belt',
    'grandes: casi todos encontrados': 'big ones: almost all found', 'cada oreja gira por separado': 'each ear turns on its own',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };
  const sunlight = (scene, x = -14, y = 5, z = 10, i = 2.2) => { const l = new T.DirectionalLight(0xfff4e0, i); l.position.set(x, y, z); scene.add(l); return l; };

  function rock(r, seed, color = 0x8a8078) {
    const g = new T.IcosahedronGeometry(r, 2); const p = g.attributes.position; const rr = rng(seed);
    for (let i = 0; i < p.count; i++) { const k = 0.8 + rr() * 0.35 + noise2(p.getX(i) * 3 + seed, p.getY(i) * 3) * 0.2; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); }
    g.computeVertexNormals();
    return new T.Mesh(g, new T.MeshStandardMaterial({ color, flatShading: true, roughness: 1 }));
  }

  function probe(color = 0xd8dce4) {
    const g = new T.Group();
    g.add(new T.Mesh(new T.BoxGeometry(0.34, 0.34, 0.34), new T.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.5 })));
    [-1, 1].forEach((s) => { const p = new T.Mesh(new T.BoxGeometry(0.9, 0.02, 0.32), new T.MeshStandardMaterial({ color: 0x2a4aa8, metalness: 0.3, roughness: 0.4 })); p.position.x = s * 0.64; g.add(p); });
    const dish = new T.Mesh(new T.ConeGeometry(0.16, 0.08, 16, 1, true), new T.MeshStandardMaterial({ color: 0xffffff, side: T.DoubleSide })); dish.position.y = 0.22; g.add(dish);
    return g;
  }

  function ringLine(scene, r, color, opacity = 0.35, rz = r) {
    const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * PI * 2; pts.push(new T.Vector3(Math.cos(a) * r, 0, Math.sin(a) * rz)); }
    const m = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color, transparent: true, opacity })); scene.add(m); return m;
  }

  // ================================================================== ASTEROIDES
  function binaryScene(canvas, variant) {
    const st = space(canvas);
    const { scene, camera } = st;
    sunlight(scene, -14, 5, 10, 1.3); scene.add(new T.AmbientLight(0x50586a, 0.35));
    const big = rock(1.3, 3, 0x6e665e); scene.add(big);
    const R0 = 3.0;
    const orbit = ringLine(scene, R0, 0xffffff, 0.3);
    const moon = rock(0.32, 9, 0x7e766e); scene.add(moon);
    const craft = probe(); craft.scale.setScalar(variant === 'hera' ? 0.9 : 0.6); scene.add(craft);
    craft.visible = variant === 'dart' || variant === 'hera';
    const flash = glowSprite(0xfff2c0, 1, 0); scene.add(flash);
    const debris = [];
    if (variant === 'dart') { const r = rng(4); for (let i = 0; i < 90; i++) { const m = new T.Mesh(new T.IcosahedronGeometry(0.02 + r() * 0.03, 0), new T.MeshStandardMaterial({ color: 0xb0a090 })); scene.add(m); debris.push({ m, d: new T.Vector3(r() - 0.5, r() - 0.5, r() * 0.8 + 0.2).normalize(), v: 0.4 + r() }); } }
    const newOrbit = variant === 'shrink' ? ringLine(scene, R0 * 0.93, 0xffc94a, 0) : null;
    if (variant === 'binary') { st.label({ text: 'Didymos · 780 m', p: [0, 1.3, 0], t0: 0.3, color: COL.white, size: 40 }); st.label({ text: 'Dimorphos · 160 m', p: () => moon.position.toArray(), t0: (d) => d * 0.4, color: COL.gold, size: 40 }); }
    if (variant === 'dart') { st.label({ text: 'DART · 2022', p: () => craft.position.toArray(), t0: 0.3, t1: (d) => d * 0.55, color: COL.blue, size: 40 }); st.label({ text: '≈ 6 km/s', screen: [540, 1000], t0: (d) => d * 0.25, color: COL.gold, size: 50 }); }
    if (variant === 'shrink') st.label({ text: '33 minutos menos', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.gold, size: 54 });
    if (variant === 'hera') st.label({ text: 'Hera · 2026', p: () => craft.position.toArray(), t0: 0.4, color: COL.blue, size: 42 });
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      let R = R0, a = lt * 0.35 + 0.6;
      if (variant === 'shrink') { R = lerp(R0, R0 * 0.93, smooth(prog(lt, dur * 0.25, dur * 0.5))); newOrbit.material.opacity = 0.7 * smooth(prog(lt, dur * 0.3, 0.6)); a = lt * lerp(0.35, 0.42, smooth(prog(lt, dur * 0.25, dur * 0.5))) + 0.6; }
      if (variant === 'dart') a = 1.25;
      moon.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
      big.rotation.y = lt * 0.25; moon.rotation.y = lt * 0.4;
      if (variant === 'dart') {
        const hitAt = dur * 0.45, p = clamp(lt / hitAt);
        craft.position.set(lerp(moon.position.x - 6, moon.position.x, p), lerp(3, 0, p), lerp(moon.position.z + 4, moon.position.z, p));
        craft.visible = lt < hitAt;
        const b = prog(lt, hitAt, 1.4);
        flash.position.copy(moon.position); flash.material.opacity = b > 0 && b < 1 ? Math.sin(b * PI) : 0; flash.scale.setScalar(0.5 + b * 4);
        debris.forEach((o) => { o.m.visible = lt > hitAt; const d = Math.max(0, lt - hitAt) * o.v; o.m.position.copy(moon.position).addScaledVector(o.d, d); });
      }
      if (variant === 'hera') { const h = lt * 0.5; craft.position.set(Math.cos(h) * 4.4, 1.2 + Math.sin(h * 0.7) * 0.3, Math.sin(h) * 4.4); craft.lookAt(0, 0, 0); }
      camera.position.set(lerp(-0.6, 0.6, k), variant === 'shrink' ? 7.5 : 3.2, variant === 'shrink' ? 9 : 10.5); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Desvío: un asteroide se acerca a la Tierra; con un empujón años antes, pasa de largo.
  function deflectScene(canvas, variant) {
    const st = space(canvas);
    const { scene, camera } = st;
    sunBall(scene, [0, 0, 0], 0.6); scene.add(new T.PointLight(0xfff4e0, 2.4, 0, 0));
    ringLine(scene, 4, 0x8fd0ff, 0.5);
    const earth = sphere(0.35, 'earth', 2, 4); scene.add(earth);
    const ast = rock(0.3, 7, 0xb08060); scene.add(ast);
    const trail = []; for (let i = 0; i < 40; i++) { const m = new T.Mesh(new T.SphereGeometry(0.03, 6, 4), new T.MeshBasicMaterial({ color: 0xffa060, transparent: true })); scene.add(m); trail.push(m); }
    const nudge = onGlow(new T.ArrowHelper(new T.Vector3(0, 0, -1), new T.Vector3(), 0.9, 0xffc94a, 0.25, 0.18)); scene.add(nudge);
    const dots = [];
    if (variant === 'belt' || variant === 'safe') { const r = rng(21); for (let i = 0; i < 160; i++) { const m = new T.Mesh(new T.SphereGeometry(0.035, 5, 4), new T.MeshBasicMaterial({ color: 0xc8b8a8 })); const rr = 6.2 + r() * 1.4, aa = r() * PI * 2; scene.add(m); dots.push({ m, rr, aa, sp: 0.03 + r() * 0.03, y: (r() - 0.5) * 0.4 }); }
      st.label({ text: variant === 'belt' ? 'cinturón de asteroides' : 'grandes: casi todos encontrados', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 46 }); }
    if (variant === 'watch') { const r = rng(12); for (let i = 0; i < 60; i++) { const m = new T.Mesh(new T.SphereGeometry(0.04, 6, 4), new T.MeshBasicMaterial({ color: 0xffb080 })); const rr = 2.5 + r() * 3, aa = r() * PI * 2; scene.add(m); dots.push({ m, rr, aa, sp: 0.1 + r() * 0.2, y: (r() - 0.5) * 0.6 }); } st.label({ text: 'telescopios vigilando', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 46 }); }
    if (variant === 'deflect') { st.label({ text: 'un empujón pequeño…', p: () => ast.position.toArray(), t0: 0.3, t1: (d) => d * 0.5, color: COL.gold, size: 40 }); st.label({ text: '…años antes = no choca', screen: [540, 1000], t0: (d) => d * 0.55, color: COL.green, size: 46 }); }
    st.label({ text: 'Tierra', p: () => earth.position.toArray(), t0: 0.2, color: COL.blue, size: 34, dy: 80 });
    // Viene desde arriba a la derecha (sin pasar por el Sol) hacia donde estará la Tierra; el empujón lo desvía hacia afuera.
    const END = new T.Vector3(4 * Math.cos(1.1), 0, 4 * Math.sin(1.1));
    const path = (f, off) => new T.Vector3(lerp(6, END.x, f), 0, lerp(-6, END.z, f)).add(new T.Vector3(0.89 * off * f * f, 0, -0.45 * off * f * f));
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const ea = variant === 'deflect' ? lerp(0.2, 1.1, clamp(lt / (dur * 0.95))) : lt * 0.12; earth.position.set(Math.cos(ea) * 4, 0, Math.sin(ea) * 4);
      const f = clamp(lt / (dur * 0.95));
      const off = variant === 'deflect' ? smooth(prog(lt, dur * 0.2, dur * 0.3)) * 1.6 : 0;
      ast.visible = variant === 'deflect'; ast.position.copy(path(f, off)); ast.rotation.set(lt, lt * 0.7, 0);
      trail.forEach((m, i) => { const g = Math.max(0, f - i * 0.012); m.position.copy(path(g, off)); m.material.opacity = (1 - i / 40) * 0.8; m.visible = ast.visible; });
      nudge.visible = variant === 'deflect' && lt > dur * 0.15 && lt < dur * 0.45; nudge.position.copy(ast.position).add(new T.Vector3(0, 0, 0.9));
      dots.forEach((o) => { const a = o.aa + lt * o.sp; o.m.position.set(Math.cos(a) * o.rr, o.y, Math.sin(a) * o.rr); });
      const far = variant === 'belt' || variant === 'safe';
      camera.position.set(lerp(-0.5, 0.5, k), far ? 11 : 8.5, far ? 13 : 9.5); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // ================================================================== ESTRELLAS FUGACES
  // Cielo nocturno sobre un paisaje con estelas que salen del radiante (Géminis).
  function meteorSky(canvas, variant) {
    const st = stage(canvas, { bg: 0x050a1e, fog: [0x050a1e, 30, 90], hemi: 0.2, moon: 0.05, stars: true });
    const { scene, camera } = st;
    const geo = new T.PlaneGeometry(120, 70, 80, 40); geo.rotateX(-PI / 2);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, noise2(x * 0.1, z * 0.1) * 1.4 + smooth(clamp((-z - 14) / 20)) * noise2(x * 0.08 + 5, 2) * 7); }
    geo.computeVertexNormals(); scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0x1d3a2e, flatShading: true })));
    const RAD = new T.Vector3(-4, 22, -50);
    const gem = [[0, 0], [1.2, 0.3], [2.2, -0.6], [-0.4, -1.6], [0.6, -2.8], [2.4, -2.2], [1.8, 1.4], [-1.0, 1.2]].map(([x, y]) => { const s = glowSprite(0xe8f0ff, 1.6, 0.9); s.material.fog = false; s.position.set(RAD.x + x * 1.6, RAD.y + y * 1.6, RAD.z); scene.add(s); return s; });
    const lines = new T.LineSegments(new T.BufferGeometry().setFromPoints([0, 1, 1, 2, 0, 3, 3, 4, 4, 5, 0, 6, 0, 7].map((i) => gem[i].position)), new T.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0, fog: false }));
    scene.add(lines);
    const N = 26, r = rng(5), streaks = [];
    for (let i = 0; i < N; i++) {
      const g = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
      const m = onGlow(new T.Line(g, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, fog: false })));
      scene.add(m); const a = r() * PI * 2, el = 0.2 + r() * 0.9;
      streaks.push({ m, g, dir: new T.Vector3(Math.cos(a), Math.sin(a) * 0.7 - 0.35, 0.2).normalize(), t0: r(), sp: 0.6 + r() * 0.8, start: 3 + r() * 10, el });
    }
    if (variant === 'radiant') { st.label({ text: 'Géminis', p: RAD.toArray(), t0: 0.3, color: COL.blue, size: 40, dy: 120 }); st.label({ text: 'radiante', p: RAD.toArray(), t0: (d) => d * 0.4, color: COL.gold, size: 40, dy: -120 }); }
    if (variant === 'rain') st.label({ text: '13–14 de diciembre', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.gold, size: 50 });
    if (variant === 'outro') fade(st);
    const rate = { rain: 1.4, radiant: 1.0, hook: 1.8, outro: 0.8, watch: 1.2 }[variant] || 1;
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      lines.material.opacity = variant === 'radiant' ? 0.6 * smooth(prog(lt, 0.3, 0.8)) : 0;
      streaks.forEach((s) => {
        const per = 2.2 / rate, f = ((lt / per + s.t0) % 1);
        const visible = f < 0.35; s.m.visible = visible; if (!visible) return;
        const q = f / 0.35, len = 4 + s.el * 4;
        const head = RAD.clone().addScaledVector(s.dir, s.start + q * 16);
        const tail = head.clone().addScaledVector(s.dir, -len * Math.min(1, q * 3));
        s.g.setFromPoints([tail, head]); s.m.material.opacity = Math.sin(q * PI);
      });
      camera.position.set(lerp(-1, 1, k), 2.4, 14); camera.lookAt(-1.5, 11, -30);
      st.draw(lt, dur);
    };
  }

  // Órbita de Faetón que cruza la de la Tierra, con su rastro de polvo.
  function phaethonScene(canvas, variant) {
    const st = space(canvas);
    const { scene, camera } = st;
    sunBall(scene, [0, 0, 0], 0.55); scene.add(new T.PointLight(0xfff4e0, 2.4, 0, 0));
    ringLine(scene, 4, 0x8fd0ff, 0.45);
    const ex = 0.89, aa = 4.2, bb = aa * Math.sqrt(1 - ex * ex), cx = aa * ex;
    const ell = (t) => new T.Vector3(Math.cos(t) * aa - cx + 0.0, 0, Math.sin(t) * bb);
    const pts = []; for (let i = 0; i <= 160; i++) pts.push(ell(i / 160 * PI * 2));
    const orbitL = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xffb080, transparent: true, opacity: 0.6 }));
    orbitL.rotation.y = 0.9; scene.add(orbitL);
    const ph = rock(0.16, 3, 0x6a6058); scene.add(ph);
    const dust = []; const r = rng(9); for (let i = 0; i < 400; i++) { const m = new T.Mesh(new T.SphereGeometry(0.02, 4, 3), new T.MeshBasicMaterial({ color: 0xffd0a0, transparent: true, opacity: 0.55 })); const p = ell(r() * PI * 2).add(new T.Vector3((r() - 0.5) * 0.25, (r() - 0.5) * 0.12, (r() - 0.5) * 0.25)); p.applyAxisAngle(new T.Vector3(0, 1, 0), 0.9); m.position.copy(p); scene.add(m); dust.push(m); }
    const earth = sphere(0.3, 'earth', 2, 4); scene.add(earth);
    st.label({ text: 'Faetón', p: () => ph.position.toArray(), t0: 0.3, color: COL.orange, size: 40 });
    st.label({ text: 'rastro de polvo', screen: [540, 470], t0: (d) => d * 0.35, color: COL.gold, size: 42 });
    st.label({ text: 'órbita de la Tierra', p: [4, 0, 0], t0: (d) => d * 0.2, t1: (d) => d * 0.55, color: COL.blue, size: 36, dy: -110 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const t = lt * 0.5; const p = ell(t); p.applyAxisAngle(new T.Vector3(0, 1, 0), 0.9); ph.position.copy(p);
      const cross = -0.2; const ea = lerp(cross - 0.9, cross + 0.15, k); earth.position.set(Math.cos(ea) * 4, 0, Math.sin(ea) * 4);
      dust.forEach((m) => { m.material.opacity = 0.35 + 0.25 * smooth(prog(lt, 0.3, 1)); });
      camera.position.set(lerp(0, 1, k), 8.5, 9.0); camera.lookAt(-1.6, 0, 0.6);
      st.draw(lt, dur);
    };
  }

  // Un grano de polvo entra en la atmósfera y el aire comprimido delante de él brilla.
  function burnScene(canvas, variant) {
    const st = space(canvas);
    const { scene, camera } = st;
    sunlight(scene, -10, 6, 12, 1.6);
    const earth = sphere(7, 'earth', 2, 5); earth.position.set(0, -8.5, 0); earth.rotation.x = 1.25; scene.add(earth);
    const atm = new T.Mesh(new T.SphereGeometry(7.45, 64, 32), new T.MeshBasicMaterial({ color: 0x5aa8ff, transparent: true, opacity: 0.18, side: T.BackSide })); atm.position.copy(earth.position); scene.add(atm);
    const grain = rock(variant === 'grain' ? 0.18 : 0.05, 5, 0x8a7a6a); scene.add(grain);
    const glow = glowSprite(0xffe0a0, 0.8, 0); scene.add(glow);
    const tail = []; for (let i = 0; i < 30; i++) { const s = glowSprite(i % 2 ? 0x9affc0 : 0xffd080, 0.5, 0); scene.add(s); tail.push(s); }
    if (variant === 'burn') { st.label({ text: '≈ 100 km de altura', p: [2.6, -1.05, 0], t0: 0.4, color: COL.blue, size: 38, dy: -120 }); st.label({ text: '≈ 35 km/s', screen: [540, 470], t0: (d) => d * 0.2, color: COL.gold, size: 50 }); st.label({ text: 'aire comprimido brilla', p: () => grain.position.toArray(), t0: (d) => d * 0.55, color: COL.orange, size: 40 }); }
    if (variant === 'grain') st.label({ text: 'grano de arena', p: () => grain.position.toArray(), t0: 0.4, color: COL.gold, size: 44 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const f = variant === 'grain' ? 0.05 : clamp(lt / (dur * 0.85));
      const pos = new T.Vector3(lerp(-5, 3, f), lerp(3.2, -1.4, f), 0); grain.position.copy(pos);
      const hot = variant === 'grain' ? 0 : smooth(prog(f, 0.45, 0.2));
      glow.position.copy(pos); glow.material.opacity = hot; glow.scale.setScalar(0.6 + hot * 1.4);
      tail.forEach((s, i) => { s.position.copy(pos).add(new T.Vector3(-0.12 * i, 0.07 * i, 0)); s.material.opacity = hot * (1 - i / 30) * 0.8; });
      grain.rotation.set(lt, lt * 1.3, 0); grain.visible = f < 0.98;
      if (variant === 'grain') { camera.position.set(-4.3, 3.4, 2.2); camera.lookAt(pos); }
      else { camera.position.set(lerp(-0.5, 0.5, k), 0.6, 10); camera.lookAt(0, 0.6, 0); }
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['binary', 'dart', 'shrink', 'hera', 'outro'].forEach((v) => reg(`ast_${v}`, (c) => binaryScene(c, v)));
  ['deflect', 'watch', 'belt', 'safe'].forEach((v) => reg(`ast_${v}`, (c) => deflectScene(c, v)));
  ['hook', 'rain', 'radiant', 'watch', 'outro'].forEach((v) => reg(`met_${v}`, (c) => meteorSky(c, v)));
  reg('met_orbit', (c) => phaethonScene(c));
  ['burn', 'grain'].forEach((v) => reg(`met_${v}`, (c) => burnScene(c, v)));
})();
