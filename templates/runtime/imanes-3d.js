// Escenas 3D "¿Cómo funciona una brújula?" (ima_*): imanes y campo magnético de la Tierra. Diseño propio, Three.js r149.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, rng, stage, glowSprite, onGlow, space, sphere } = K;

  K.addEN({
    'N': 'N', 'S': 'S', 'polos iguales se repelen': 'like poles repel', 'opuestos se atraen': 'opposites attract',
    'dominios alineados': 'aligned domains', 'hierro líquido en movimiento': 'moving liquid iron', 'norte magnético': 'magnetic north',
    '…que es un polo sur magnético': '…which is a magnetic south pole', 'se mueve decenas de km por año': 'moves tens of km a year',
    'tortugas y aves lo usan': 'turtles and birds use it', 'última inversión: ~780.000 años': 'last flip: ~780,000 years ago',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  function letterTex(t, col) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; g.font = '900 90px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 64, 70); return new T.CanvasTexture(c); }

  function barMagnet(scene, x = 0, y = 0, rot = 0) {
    const g = new T.Group(); g.position.set(x, y, 0); g.rotation.z = rot; scene.add(g);
    const n = new T.Mesh(new T.BoxGeometry(1.2, 0.6, 0.6), [0, 0, 0, 0, 0, 0].map(() => new T.MeshStandardMaterial({ map: letterTex('N', '#d8402a') })));
    n.position.x = 0.6; g.add(n);
    const s = new T.Mesh(new T.BoxGeometry(1.2, 0.6, 0.6), [0, 0, 0, 0, 0, 0].map(() => new T.MeshStandardMaterial({ map: letterTex('S', '#2a6ad8') })));
    s.position.x = -0.6; g.add(s);
    return g;
  }

  function compass(scene, scale = 1) {
    const g = new T.Group(); scene.add(g); g.scale.setScalar(scale);
    const body = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 0.3, 40), new T.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.6, roughness: 0.3 })); g.add(body);
    const face = new T.Mesh(new T.CircleGeometry(1.25, 40), new T.MeshStandardMaterial({ color: 0xf4efe2 })); face.rotation.x = -PI / 2; face.position.y = 0.16; g.add(face);
    const needle = new T.Group(); needle.position.y = 0.2; g.add(needle);
    const red = new T.Mesh(new T.ConeGeometry(0.12, 1.1, 4), new T.MeshStandardMaterial({ color: 0xd8402a })); red.rotation.x = PI / 2; red.position.z = -0.55; needle.add(red);
    const wht = new T.Mesh(new T.ConeGeometry(0.12, 1.1, 4), new T.MeshStandardMaterial({ color: 0xe0e0e0 })); wht.rotation.x = -PI / 2; wht.position.z = 0.55; needle.add(wht);
    const glass = new T.Mesh(new T.CircleGeometry(1.3, 40), new T.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.15 })); glass.rotation.x = -PI / 2; glass.position.y = 0.3; g.add(glass);
    return { g, needle };
  }

  function deskScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x1a2230, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const table = new T.Mesh(new T.BoxGeometry(12, 0.2, 7), new T.MeshStandardMaterial({ color: 0x6b4a2c })); table.position.y = -0.1; scene.add(table);
    let C = null, mags = [], filings = [];
    if (variant === 'hook' || variant === 'outro') { C = compass(scene, 1.4); C.g.position.y = 0.2; }
    if (variant === 'magnet') {
      const m = barMagnet(scene, 0, 0.35, 0); m.rotation.x = 0; mags.push(m);
      const r = rng(4);
      for (let i = 0; i < 420; i++) {
        const x = (r() - 0.5) * 7, z = (r() - 0.5) * 4.5; if (Math.abs(x) < 1.3 && Math.abs(z) < 0.4) continue;
        const f = new T.Mesh(new T.BoxGeometry(0.12, 0.015, 0.025), new T.MeshStandardMaterial({ color: 0x3a3a40 }));
        // dirección del campo de un dipolo en el plano x-z
        const p1 = new T.Vector2(x - 1.0, z), p2 = new T.Vector2(x + 1.0, z);
        const b = p1.clone().divideScalar(Math.pow(p1.length(), 3)).sub(p2.clone().divideScalar(Math.pow(p2.length(), 3)));
        f.rotation.y = -Math.atan2(b.y, b.x); f.position.set(x, 0.02, z); scene.add(f); filings.push({ f, t: r() });
      }
    }
    if (variant === 'poles') {
      mags.push(barMagnet(scene, -2.2, 0.35), barMagnet(scene, 2.2, 0.35, PI));
      st.label({ text: 'polos iguales se repelen', screen: [540, 470], t0: 0.3, t1: (d) => d * 0.5, color: '#ff8a7a', size: 40 });
      st.label({ text: 'opuestos se atraen', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.green, size: 46 });
    }
    if (variant === 'domains') {
      const m = barMagnet(scene, 0, 0.35); m.children.forEach((c) => c.material.forEach((mm) => { mm.transparent = true; mm.opacity = 0.25; })); mags.push(m);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { const a = onGlow(new T.Mesh(new T.ConeGeometry(0.08, 0.25, 6), new T.MeshBasicMaterial({ color: 0xffc94a }))); a.rotation.z = -PI / 2; a.position.set(-1.05 + i * 0.3, 0.35 + (j - 0.5) * 0.25, 0.32); a.userData.r0 = (i * 7 + j * 3) % 6; scene.add(a); filings.push({ f: a, t: 0 }); }
      st.label({ text: 'dominios alineados', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.gold, size: 46 });
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      if (C) C.needle.rotation.y = Math.sin(lt * 1.2) * 0.6 * Math.exp(-lt * 0.4);
      if (variant === 'magnet') filings.forEach((o) => { o.f.visible = lt > 0.2 + o.t * dur * 0.5; });
      if (variant === 'poles') { const t1 = dur * 0.5; if (lt < t1) { const bounce = Math.sin(clamp(lt / t1) * PI); mags[0].position.x = -2.2 - bounce * 0.6; mags[1].position.x = 2.2 + bounce * 0.6; mags[1].rotation.z = 0; } else { mags[1].rotation.z = PI; const p = smooth(prog(lt, t1, 1.0)); mags[0].position.x = lerp(-2.2, -1.2, p); mags[1].position.x = lerp(2.2, 1.2, p); } }
      if (variant === 'domains') { const al = smooth(prog(lt, 0.4, dur * 0.5)); filings.forEach((o) => { o.f.rotation.z = lerp(-PI / 2 + o.f.userData.r0, -PI / 2, al); }); }
      if (variant === 'hook' || variant === 'outro') { camera.position.set(0, 6.0, lerp(8.0, 7.2, k)); camera.lookAt(0, 0.2, 0); }
      else { camera.position.set(0, 8.5, 8.5); camera.lookAt(0, 0, 0); }
      st.draw(lt, dur);
    };
  }

  function earthScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff4e0, 2.0); light.position.set(-6, 3, 8); scene.add(light);
    const R = 2.0;
    const earth = sphere(R, 'earth', 2, 5); scene.add(earth);
    const coreOuter = onGlow(new T.Mesh(new T.SphereGeometry(R * 0.55, 32, 20), new T.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0 }))); scene.add(coreOuter);
    const lines = [];
    for (let i = 0; i < 12; i++) {
      const az = i / 12 * PI * 2; const L = R * (2.0 + (i % 3) * 0.8); const pts = [];
      for (let t = 0.15; t <= PI - 0.15; t += 0.04) { const rr = L * Math.sin(t) ** 2; if (rr < R * 1.01) continue; pts.push(new T.Vector3(Math.cos(az) * rr * Math.sin(t), rr * Math.cos(t), Math.sin(az) * rr * Math.sin(t))); }
      const m = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.4 })); scene.add(m); lines.push(m);
    }
    const tilt = new T.Group(); scene.add(tilt); lines.forEach((l) => { scene.remove(l); tilt.add(l); }); tilt.rotation.z = 0.18;
    const pole = onGlow(new T.Mesh(new T.SphereGeometry(0.12, 12, 8), new T.MeshBasicMaterial({ color: 0xff5a5a }))); scene.add(pole);
    const trail = [];
    if (variant === 'core') { earth.material.transparent = true; earth.material.opacity = 0.35; earth.material.depthWrite = false; st.label({ text: 'hierro líquido en movimiento', p: [R * 0.4, R * 0.4, R * 0.3], t0: (d) => d * 0.35, color: COL.orange, size: 38 }); }
    if (variant === 'north') { st.label({ text: 'norte magnético', p: () => pole.position.toArray(), t0: 0.4, color: '#ff8a7a', size: 40 }); st.label({ text: '…que es un polo sur magnético', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.blue, size: 40 }); }
    if (variant === 'moving') { for (let i = 0; i < 20; i++) { const s = glowSprite(0xff8a7a, 0.15, 0); scene.add(s); trail.push(s); } st.label({ text: 'se mueve decenas de km por año', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 44 }); }
    if (variant === 'flip') st.label({ text: 'última inversión: ~780.000 años', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.gold, size: 42 });
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      earth.rotation.y = lt * 0.1;
      coreOuter.material.opacity = variant === 'core' ? 0.9 * smooth(prog(lt, 0.3, 0.8)) : 0;
      coreOuter.rotation.y = lt * 1.5;
      lines.forEach((l, i) => { l.material.color.set(variant === 'flip' && Math.sin(clamp(lt / dur) * PI) > 0.7 ? 0xff8a7a : 0x8fd0ff); l.material.opacity = variant === 'flip' ? 0.4 * Math.abs(Math.cos(clamp(lt / dur) * PI)) + 0.05 : 0.4; });
      if (variant === 'flip') tilt.rotation.z = 0.18 + PI * smooth(prog(lt, dur * 0.25, dur * 0.5));
      const a = variant === 'moving' ? lerp(0.3, 0.1, k) : 0.18;
      const lon = variant === 'moving' ? lerp(-1.6, 1.0, k) : -1.0;
      pole.position.set(Math.sin(a) * Math.cos(lon) * R * 1.02, Math.cos(a) * R * 1.02, Math.sin(a) * Math.sin(lon) * R * 1.02);
      pole.visible = variant === 'north' || variant === 'moving';
      trail.forEach((s, i) => { const kk = k * i / trail.length; const aa = lerp(0.3, 0.1, kk), ll = lerp(-1.6, 1.0, kk); s.position.set(Math.sin(aa) * Math.cos(ll) * R * 1.02, Math.cos(aa) * R * 1.02, Math.sin(aa) * Math.sin(ll) * R * 1.02); s.material.opacity = 0.7; });
      const top = variant === 'north' || variant === 'moving';
      if (top) { camera.position.set(0, R * 4.6, R * 3.2); camera.lookAt(0, R * 0.3, 0); }
      else { camera.position.set(0, 0.8, variant === 'outro' ? lerp(11, 16, k) : lerp(12, 11, k)); camera.lookAt(0, 0, 0); }
      st.draw(lt, dur);
    };
  }

  function animalsScene(canvas) {
    const st = stage(canvas, { bg: 0x064a6a, fog: [0x064a6a, 8, 30], stars: false, focus: 0.37, hemi: 0.95, moon: 1.1 });
    const { scene, camera } = st;
    const turtle = new T.Group(); scene.add(turtle);
    const shell = new T.Mesh(new T.SphereGeometry(1, 16, 10, 0, PI * 2, 0, PI / 2), new T.MeshStandardMaterial({ color: 0x5a7a3a, flatShading: true })); shell.scale.set(1.3, 0.6, 1); turtle.add(shell);
    const belly = new T.Mesh(new T.CircleGeometry(1, 16), new T.MeshStandardMaterial({ color: 0xd8c890 })); belly.rotation.x = PI / 2; belly.scale.set(1.3, 1, 1); turtle.add(belly);
    const head = new T.Mesh(new T.SphereGeometry(0.3, 12, 8), new T.MeshStandardMaterial({ color: 0x8aa06a })); head.position.set(1.5, 0.1, 0); turtle.add(head);
    const flips = [[0.6, 1], [0.6, -1], [-0.8, 1], [-0.8, -1]].map(([x, s]) => { const f = new T.Mesh(new T.BoxGeometry(0.8, 0.06, 0.35), head.material); f.position.set(x, 0, s * 0.95); turtle.add(f); return { f, s }; });
    const lines = [];
    for (let i = 0; i < 6; i++) { const pts = []; for (let x = -8; x <= 8; x += 0.4) pts.push(new T.Vector3(x, -2 + i * 0.8 + Math.sin(x * 0.3) * 0.3, -3)); const l = onGlow(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.35 }))); scene.add(l); lines.push(l); }
    st.label({ text: 'tortugas y aves lo usan', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.blue, size: 44 });
    return (lt, dur) => {
      turtle.position.set(Math.sin(lt * 0.3) * 1.5, Math.sin(lt * 0.8) * 0.2, 0); turtle.rotation.set(0.3, -0.3, 0);
      flips.forEach((o) => { o.f.rotation.x = o.s * Math.sin(lt * 3) * 0.5; });
      lines.forEach((l, i) => { l.material.opacity = 0.25 + 0.15 * Math.sin(lt * 2 + i); });
      camera.position.set(0, 2.2, 8); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'magnet', 'poles', 'domains', 'outro'].forEach((v) => reg(`ima_${v}`, (c) => deskScene(c, v)));
  ['core', 'north', 'moving', 'flip'].forEach((v) => reg(`ima_${v}`, (c) => earthScene(c, v)));
  reg('ima_animals', (c) => animalsScene(c));
})();
