// Escenas 3D "¿Por qué tenemos huellas dactilares?" (hue_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow } = K;

  K.addEN({
    'semana 10–16 del embarazo': 'weeks 10–16 of pregnancy', 'crestas': 'ridges', 'surcos': 'grooves', 'arco': 'arch',
    'presilla': 'loop', 'verticilo': 'whorl', 'detalles únicos': 'unique details', 'gemelo A': 'twin A', 'gemelo B': 'twin B',
    'diferentes': 'different', 'vibran al deslizar': 'they vibrate as you slide', 'coincide': 'match', 'koala': 'koala',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  // Textura de huella: 'arch' | 'loop' | 'whorl', con pequeñas variaciones según la semilla.
  const cache = {};
  function printTex(type, seed = 1, ink = '#3a2418', bg = '#f2c8a8') {
    const key = type + seed + ink + bg; if (cache[key]) return cache[key];
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 512, 512); g.strokeStyle = ink; g.lineWidth = 5; g.lineCap = 'round';
    const r = rng(seed);
    const wob = (x, y) => (noise2(x * 0.02 + seed, y * 0.02) - 0.5) * 14;
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      for (let t = 0; t <= 1.0001; t += 0.01) {
        let x, y;
        if (type === 'arch') { x = t * 512; y = 470 - i * 17 - Math.sin(t * PI) * (40 + i * 6); }
        else if (type === 'whorl') { const a = t * PI * 2, rr = 14 + i * 9; x = 256 + Math.cos(a) * rr * 1.1; y = 270 + Math.sin(a) * rr * 1.35; }
        else { const rr = 12 + i * 9; const a = lerp(-PI * 0.95, PI * 0.95, t); x = 230 + Math.cos(a + PI / 2) * rr * 0.9 + (t > 0.5 ? (t - 0.5) * 60 : 0); y = 260 - Math.sin(a + PI / 2) * rr * 1.3 + Math.abs(t - 0.5) * i * 9; }
        x += wob(x, y); y += wob(y, x);
        if (t === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      // minucias: cortes y bifurcaciones
      if (r() > 0.6) { g.save(); g.strokeStyle = bg; g.lineWidth = 9; const x = 120 + r() * 280, y = 120 + r() * 280; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + 4); g.stroke(); g.restore(); }
    }
    const grad = g.createRadialGradient(256, 256, 160, 256, 256, 256); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, bg);
    g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
    return (cache[key] = new T.CanvasTexture(c));
  }

  function fingertip(scene, type = 'loop', seed = 1) {
    const g = new T.Group(); scene.add(g);
    const skin = new T.MeshStandardMaterial({ color: 0xf2c0a0, roughness: 0.6 });
    const shaft = new T.Mesh(new T.CylinderGeometry(0.9, 0.95, 3, 32), skin); shaft.position.y = -1.5; g.add(shaft);
    const tip = new T.Mesh(new T.SphereGeometry(0.9, 32, 20, 0, PI * 2, 0, PI / 2), skin); g.add(tip);
    const pad = new T.Mesh(new T.CircleGeometry(0.85, 48), new T.MeshStandardMaterial({ map: printTex(type, seed), roughness: 0.7 }));
    pad.position.set(0, -0.6, 0.91); pad.scale.y = 1.25; g.add(pad);
    const nail = new T.Mesh(new T.SphereGeometry(0.7, 20, 10, 0, PI * 2, 0, PI / 3), new T.MeshStandardMaterial({ color: 0xf6d8cc, roughness: 0.3 }));
    nail.rotation.x = -PI / 2.4; nail.position.set(0, -0.1, -0.55); g.add(nail);
    return { g, pad };
  }

  function tipScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x101824, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const F = fingertip(scene, 'whorl', 3);
    const glow = glowSprite(0x8fd0ff, 4, 0.25); glow.position.set(0, -0.6, 1); scene.add(glow);
    let surf = null; const waves = [];
    if (variant === 'touch') {
      const geo = new T.PlaneGeometry(8, 3, 80, 20); const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, (noise2(p.getX(i) * 4, p.getY(i) * 4) - 0.5) * 0.18);
      geo.computeVertexNormals();
      surf = new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0x8a6a4a, flatShading: true })); surf.rotation.x = -PI / 2; surf.position.y = -1.0; scene.add(surf);
      for (let i = 0; i < 4; i++) { const m = onGlow(new T.Mesh(new T.TorusGeometry(0.4, 0.02, 6, 40), new T.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true }))); m.rotation.x = PI / 2; scene.add(m); waves.push({ m, ph: i / 4 }); }
      st.label({ text: 'vibran al deslizar', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.blue, size: 46 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      if (variant === 'touch') {
        F.g.rotation.set(-PI / 2 + 0.25, 0, 0); F.g.position.set(lerp(-2.5, 2.5, k), -0.1, 0.3);
        waves.forEach((o) => { const f = (lt * 1.5 + o.ph) % 1; o.m.position.set(F.g.position.x, -0.9, 0.3); o.m.scale.setScalar(0.3 + f * 2); o.m.material.opacity = 1 - f; });
        camera.position.set(0, 3.2, 9.5); camera.lookAt(0, -0.6, 0);
      } else {
        F.g.rotation.set(0.15, Math.sin(lt * 0.4) * 0.3, 0); F.g.position.set(0, 1.4, 0);
        camera.position.set(0, 0.2, lerp(9.5, 8.2, k)); camera.lookAt(0, 0.0, 0);
      }
      st.draw(lt, dur);
    };
  }

  // Corte de piel: crestas y surcos.
  function skinScene(canvas) {
    const st = stage(canvas, { bg: 0x101824, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const shp = new T.Shape(); shp.moveTo(-4, -2);
    for (let x = -4; x <= 4.001; x += 0.05) shp.lineTo(x, 0.25 * Math.sin(x * 4) + 0.05 * Math.sin(x * 11));
    shp.lineTo(4, -2);
    const skin = new T.Mesh(new T.ExtrudeGeometry(shp, { depth: 2, bevelEnabled: false }), new T.MeshStandardMaterial({ color: 0xf2b898, flatShading: true }));
    skin.position.z = -1; scene.add(skin);
    const inner = new T.Mesh(new T.BoxGeometry(8, 1.2, 2.02), new T.MeshStandardMaterial({ color: 0xd88a7a })); inner.position.y = -1.4; scene.add(inner);
    st.label({ text: 'crestas', p: [-PI / 8 + 0.4, 0.28, 1], t0: 0.3, color: COL.gold, size: 40 });
    st.label({ text: 'surcos', p: [0.4 + PI / 8, -0.25, 1], t0: (d) => d * 0.4, color: COL.blue, size: 40, dy: -140 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-1.5, 1.5, k), 1.6, 6.2); camera.lookAt(0, -0.3, 0);
      st.draw(lt, dur);
    };
  }

  // Discos con patrones: 3 tipos, comparación de dos huellas, gemelos, identificación.
  function printsScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x101824, fog: null, stars: false, focus: 0.38, hemi: 1.0, moon: 1.0 });
    const { scene, camera } = st;
    const disc = (type, seed, x, y, s = 1.1, ink, bg) => { const m = new T.Mesh(new T.CircleGeometry(s, 64), new T.MeshBasicMaterial({ map: printTex(type, seed, ink, bg) })); m.scale.y = 1.25; m.position.set(x, y, 0); scene.add(m); return m; };
    const items = [];
    if (variant === 'patterns') {
      [['arch', 'arco'], ['loop', 'presilla'], ['whorl', 'verticilo']].forEach(([t, n], i) => { const m = disc(t, i + 2, 0, 2.6 - i * 2.6, 0.95); items.push(m); st.label({ text: n, p: [1.1, 2.6 - i * 2.6, 0], t0: 0.3 + i * 0.5, color: COL.gold, size: 40, dy: 0, dx: 120 }); });
    }
    const marks = [];
    if (variant === 'unique' || variant === 'twins' || variant === 'police') {
      const a = disc('loop', 7, -1.5, 0, 1.2), b = disc('loop', variant === 'police' ? 7 : 19, 1.5, 0, 1.2);
      items.push(a, b);
      const r = rng(5);
      for (let i = 0; i < 6; i++) {
        const x = (r() - 0.5) * 1.4, y = (r() - 0.5) * 1.8;
        [a, b].forEach((d, j) => { const c = onGlow(new T.Mesh(new T.RingGeometry(0.1, 0.14, 20), new T.MeshBasicMaterial({ color: variant === 'police' ? 0x6ee08a : (j ? 0xff6a5a : 0xffc94a), transparent: true }))); c.position.set(d.position.x + x + (variant === 'police' || j === 0 ? 0 : (r() - 0.5) * 0.6), y + (variant === 'police' || j === 0 ? 0 : (r() - 0.5) * 0.6), 0.02); scene.add(c); marks.push({ c, t: 0.4 + i * 0.25 }); });
      }
      if (variant === 'unique') st.label({ text: 'detalles únicos', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 46 });
      if (variant === 'twins') { st.label({ text: 'gemelo A', p: [-1.5, 1.5, 0], t0: 0.3, color: COL.white, size: 38 }); st.label({ text: 'gemelo B', p: [1.5, 1.5, 0], t0: 0.3, color: COL.white, size: 38 }); st.label({ text: 'diferentes', screen: [540, 1000], t0: (d) => d * 0.5, color: '#ff8a7a', size: 48 }); }
      if (variant === 'police') st.label({ text: 'coincide', screen: [540, 1000], t0: (d) => d * 0.6, color: COL.green, size: 52 });
    }
    let scan = null;
    if (variant === 'police') { scan = onGlow(new T.Mesh(new T.PlaneGeometry(6, 0.05), new T.MeshBasicMaterial({ color: 0x6ee08a, transparent: true, opacity: 0.8 }))); scene.add(scan); }
    return (lt, dur) => {
      items.forEach((m, i) => { const p = outBack(prog(lt, 0.15 + i * 0.4, 0.5)); m.scale.set(Math.max(0.001, p), Math.max(0.001, p * 1.25), 1); });
      marks.forEach((o) => { o.c.visible = lt > o.t; o.c.scale.setScalar(1 + 0.2 * Math.sin(lt * 5)); });
      if (scan) { scan.position.y = lerp(1.6, -1.6, (lt * 0.5) % 1); scan.visible = lt < dur * 0.65; }
      camera.position.set(0, 0, variant === 'patterns' ? 12.5 : 10.5); camera.lookAt(0, variant === 'patterns' ? 0.2 : 0, 0);
      st.draw(lt, dur);
    };
  }

  function wombScene(canvas) {
    const st = stage(canvas, { bg: 0x2a0a14, fog: null, stars: false, focus: 0.37, hemi: 0.8, moon: 0.8 });
    const { scene, camera } = st;
    const sac = new T.Mesh(new T.SphereGeometry(2.6, 40, 28), new T.MeshStandardMaterial({ color: 0xff8aa0, transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false })); scene.add(sac);
    const glow = glowSprite(0xff6a8a, 7, 0.35); scene.add(glow);
    const hand = new T.Group(); scene.add(hand);
    const skin = new T.MeshStandardMaterial({ color: 0xf2b0a0, roughness: 0.6 });
    const palm = new T.Mesh(new T.SphereGeometry(0.55, 20, 14), skin); palm.scale.set(1, 1.1, 0.45); hand.add(palm);
    const pads = [];
    for (let i = 0; i < 5; i++) {
      const a = lerp(-0.9, 0.7, i / 4); const f = new T.Mesh(new T.CapsuleGeometry(0.11, 0.5, 4, 10), skin);
      f.position.set(Math.sin(a) * 0.62, Math.cos(a) * 0.62 + 0.15, 0); f.rotation.z = -a; if (i === 0) { f.position.set(-0.55, -0.05, 0.05); f.rotation.z = 1.1; } hand.add(f);
      const pd = new T.Mesh(new T.CircleGeometry(0.1, 20), new T.MeshBasicMaterial({ map: printTex('whorl', i + 9), transparent: true, opacity: 0 }));
      pd.position.copy(f.position).add(new T.Vector3(Math.sin(a) * 0.2, Math.cos(a) * 0.2, 0.12)); hand.add(pd); pads.push(pd);
    }
    st.label({ text: 'semana 10–16 del embarazo', screen: [540, 1000], t0: 0.3, color: '#ffb0c0', size: 42 });
    return (lt, dur) => {
      hand.rotation.set(0.2, Math.sin(lt * 0.4) * 0.3, Math.sin(lt * 0.6) * 0.1);
      pads.forEach((p) => { p.material.opacity = smooth(prog(lt, dur * 0.3, dur * 0.5)); });
      camera.position.set(0, 0.2, lerp(6.5, 4.8, smooth(clamp(lt / dur)))); camera.lookAt(0, 0.2, 0);
      st.draw(lt, dur);
    };
  }

  function koalaScene(canvas) {
    const st = stage(canvas, { bg: 0x1a2a18, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const fur = new T.MeshStandardMaterial({ color: 0x9a9aa2, flatShading: true, roughness: 1 });
    const head = new T.Mesh(new T.IcosahedronGeometry(1.2, 2), fur); head.scale.set(1.1, 0.95, 0.9); head.position.set(-1.2, 1.4, 0); scene.add(head);
    [-1, 1].forEach((s) => { const e = new T.Mesh(new T.IcosahedronGeometry(0.6, 1), fur); e.position.set(-1.2 + s * 1.15, 2.1, -0.1); e.scale.z = 0.4; scene.add(e); const ie = new T.Mesh(new T.CircleGeometry(0.35, 16), new T.MeshStandardMaterial({ color: 0xf0e8e0 })); ie.position.set(-1.2 + s * 1.15, 2.1, 0.15); scene.add(ie); const eye = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), new T.MeshBasicMaterial({ color: 0x101010 })); eye.position.set(-1.2 + s * 0.4, 1.6, 0.95); scene.add(eye); });
    const nose = new T.Mesh(new T.SphereGeometry(0.35, 16, 12), new T.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.4 })); nose.scale.set(0.8, 1.1, 0.7); nose.position.set(-1.2, 1.2, 1.0); scene.add(nose);
    const branch = new T.Mesh(new T.CylinderGeometry(0.18, 0.22, 7, 8), new T.MeshStandardMaterial({ color: 0x6a4a2a })); branch.rotation.z = 0.3; branch.position.set(0.5, -0.6, -0.4); scene.add(branch);
    const print = new T.Mesh(new T.CircleGeometry(0.9, 48), new T.MeshBasicMaterial({ map: printTex('loop', 31, '#2a2a30', '#d8d8de') })); print.scale.y = 1.25; print.position.set(1.4, -0.4, 0.4); scene.add(print);
    st.label({ text: 'koala', p: [-1.2, 2.6, 0], t0: 0.3, color: COL.white, size: 40 });
    return (lt, dur) => {
      const p = outBack(prog(lt, dur * 0.3, 0.6)); print.scale.set(Math.max(0.001, p), Math.max(0.001, p * 1.25), 1);
      head.rotation.y = Math.sin(lt * 0.5) * 0.15;
      camera.position.set(0, 0.8, lerp(11, 10, smooth(clamp(lt / dur)))); camera.lookAt(-0.2, 0.8, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'touch', 'outro'].forEach((v) => reg(`hue_${v}`, (c) => tipScene(c, v)));
  reg('hue_ridges', (c) => skinScene(c));
  ['patterns', 'unique', 'twins', 'police'].forEach((v) => reg(`hue_${v}`, (c) => printsScene(c, v)));
  reg('hue_womb', (c) => wombScene(c));
  reg('hue_koala', (c) => koalaScene(c));
})();
