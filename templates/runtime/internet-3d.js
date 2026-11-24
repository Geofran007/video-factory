// Escenas 3D "¿Cómo viaja internet?" (net_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow, space, sphere } = K;

  K.addEN({
    'paquetes': 'packets', 'cada uno con su dirección': 'each with its own address', 'caminos distintos': 'different routes',
    'cable submarino': 'undersea cable', '~99 % entre continentes': '~99% between continents', 'luz rebotando': 'bouncing light',
    '~200.000 km/s': '~200,000 km/s', 'grosor de una manguera': 'about as thick as a garden hose', 'se vuelve a armar': 'it gets put back together',
    '~1,4 millones de km de cables': '~1.4 million km of cables',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  function globeScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff4e0, 1.6); light.position.set(-6, 3, 8); scene.add(light);
    scene.add(new T.AmbientLight(0x404a60, 0.6));
    const R = 2.3; const earth = sphere(R, 'earth', 8, 5); scene.add(earth);
    const r = rng(5); const arcs = [];
    const pt = (lat, lon) => new T.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)).multiplyScalar(R);
    for (let i = 0; i < 18; i++) {
      const a = pt((r() - 0.5) * 1.6, (r() - 0.5) * 3.2), b = pt((r() - 0.5) * 1.6, (r() - 0.5) * 3.2);
      const mid = a.clone().add(b).normalize().multiplyScalar(R * 1.05);
      const curve = new T.QuadraticBezierCurve3(a, mid, b);
      const geo = new T.TubeGeometry(curve, 40, 0.012, 4, false);
      const m = onGlow(new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x5ad8ff, transparent: true }))); earth.add(m);
      const pulse = glowSprite(0xffffff, 0.15, 1); earth.add(pulse);
      arcs.push({ m, geo, curve, pulse, ph: r(), total: geo.index.count });
    }
    if (variant === 'count') st.label({ text: '~1,4 millones de km de cables', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.blue, size: 40 });
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      earth.rotation.y = lt * 0.12;
      arcs.forEach((o, i) => { const p = smooth(prog(lt, 0.1 + i * 0.08, 1)); o.geo.setDrawRange(0, Math.floor(o.total * p / 6) * 6); const f = (lt * 0.4 + o.ph) % 1; o.pulse.position.copy(o.curve.getPoint(f)); o.pulse.visible = p > 0.99; });
      camera.position.set(0, 0.8, variant === 'outro' ? lerp(12, 17, k) : lerp(12.5, 11.5, k)); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Una foto se divide en paquetes que viajan por una red de nodos y se vuelven a armar.
  function packetScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.1 });
    const { scene, camera } = st;
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#5aa8ff'); gr.addColorStop(0.6, '#bfe3ff'); gr.addColorStop(0.61, '#4c9a44'); gr.addColorStop(1, '#2f7a36'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(190, 60, 28, 0, PI * 2); g.fill();
    const tex = new T.CanvasTexture(c);
    const N = 4; const tiles = [];
    for (let i = 0; i < N * N; i++) {
      const x = i % N, y = Math.floor(i / N); const geo = new T.PlaneGeometry(0.6, 0.6);
      const uv = geo.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, (x + uv.getX(j)) / N, 1 - (y + 1 - uv.getY(j)) / N);
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex })); scene.add(m);
      const tag = new T.Mesh(new T.PlaneGeometry(0.22, 0.12), new T.MeshBasicMaterial({ color: [0xffc94a, 0xff8a7a, 0x6ee08a, 0x8fd0ff][i % 4] })); tag.position.set(0.22, 0.22, 0.01); m.add(tag);
      tiles.push({ m, x, y, route: i % 3 });
    }
    const nodes = []; const r = rng(3);
    const nodePos = [[-3.2, 0], [-1.6, 1.6], [-1.6, -1.6], [0, 0.4], [0, -2.0], [1.6, 1.6], [1.6, -1.2], [3.2, 0]];
    nodePos.forEach(([x, y]) => { const n = onGlow(new T.Mesh(new T.SphereGeometry(0.16, 12, 8), new T.MeshBasicMaterial({ color: 0x5ad8ff }))); n.position.set(x, y, 0); scene.add(n); nodes.push(n); });
    const links = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [3, 6], [4, 6], [5, 7], [6, 7], [1, 5]];
    links.forEach(([a, b]) => scene.add(new T.Line(new T.BufferGeometry().setFromPoints([nodes[a].position, nodes[b].position]), new T.LineBasicMaterial({ color: 0x3a6a9a }))));
    const routes = [[0, 1, 5, 7], [0, 2, 3, 6, 7], [0, 2, 4, 6, 7]];
    const along = (route, f) => { const seg = (route.length - 1) * f; const i = Math.min(route.length - 2, Math.floor(seg)); return nodes[route[i]].position.clone().lerp(nodes[route[i + 1]].position, seg - i); };
    if (variant === 'packets') { st.label({ text: 'paquetes', screen: [540, 470], t0: 0.3, color: COL.white, size: 44 }); st.label({ text: 'cada uno con su dirección', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.gold, size: 40 }); }
    if (variant === 'routes') st.label({ text: 'caminos distintos', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.blue, size: 46 });
    if (variant === 'rebuild') st.label({ text: 'se vuelve a armar', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.green, size: 46 });
    return (lt, dur) => {
      const k = clamp(lt / dur);
      tiles.forEach((o, i) => {
        const home = new T.Vector3((o.x - 1.5) * 0.62, (1.5 - o.y) * 0.62, 0.2);
        if (variant === 'packets') { const s = smooth(prog(lt, 0.5, dur * 0.4)); o.m.position.copy(home.clone().multiplyScalar(1 + s * 1.4)); o.m.rotation.z = s * (i % 2 ? 0.3 : -0.3); o.m.scale.setScalar(1); nodes.forEach((n) => { n.visible = false; }); }
        else if (variant === 'routes') { const f = clamp(k * 1.4 - i * 0.04); const p = along(routes[o.route], f); o.m.position.set(p.x, p.y, 0.3); o.m.scale.setScalar(0.45); o.m.rotation.z = 0; }
        else { const f = smooth(prog(lt, 0.2, dur * 0.6)); const end = new T.Vector3(3.2, 0, 0.3); o.m.position.copy(end.clone().lerp(home.clone().add(new T.Vector3(0, 0, 0)), f)); o.m.scale.setScalar(lerp(0.45, 1, f)); nodes.forEach((n) => { n.visible = f < 0.5; }); }
      });
      camera.position.set(0, 0, 9); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Cable en el fondo del mar.
  function cableScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x03142a, fog: [0x072a4c, 5, 22], stars: false, focus: 0.37, hemi: 0.75, moon: 0.8 });
    const { scene, camera } = st;
    const floor = new T.Mesh(new T.PlaneGeometry(40, 40, 40, 40), new T.MeshStandardMaterial({ color: 0x3a4a5a, flatShading: true })); floor.rotation.x = -PI / 2; const fp = floor.geometry.attributes.position; for (let i = 0; i < fp.count; i++) fp.setZ(i, (noise2(fp.getX(i) * 0.4, fp.getY(i) * 0.4) - 0.5) * 0.6); floor.geometry.computeVertexNormals(); floor.position.y = -1.5; scene.add(floor);
    const curve = new T.CatmullRomCurve3([[-12, -1.2, 4], [-4, -1.25, 1], [2, -1.2, -1], [10, -1.3, -6]].map((q) => new T.Vector3(...q)));
    const cable = new T.Mesh(new T.TubeGeometry(curve, 80, 0.12, 10, false), new T.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6 })); scene.add(cable);
    const pulses = []; for (let i = 0; i < 8; i++) { const s = glowSprite(0x5ad8ff, 0.5, 1); scene.add(s); pulses.push({ s, ph: i / 8 }); }
    let shark = null;
    if (variant === 'shark') {
      shark = new T.Group(); const m = new T.MeshStandardMaterial({ color: 0x7a8a9a, flatShading: true });
      const b = new T.Mesh(new T.SphereGeometry(1, 16, 10), m); b.scale.set(2.2, 0.5, 0.55); shark.add(b);
      const f = new T.Mesh(new T.ConeGeometry(0.4, 0.9, 3), m); f.position.y = 0.6; f.scale.z = 0.15; shark.add(f);
      const t = new T.Mesh(new T.ConeGeometry(0.5, 0.9, 3), m); t.rotation.z = PI / 2; t.position.x = -2.3; t.scale.z = 0.15; shark.add(t);
      scene.add(shark);
    }
    if (variant === 'cable') { st.label({ text: 'cable submarino', p: () => curve.getPoint(0.45).toArray(), t0: 0.3, color: COL.blue, size: 42 }); st.label({ text: '~99 % entre continentes', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.gold, size: 42 }); }
    return (lt, dur) => {
      pulses.forEach((o) => { const f = (lt * 0.25 + o.ph) % 1; o.s.position.copy(curve.getPoint(f)); });
      if (shark) { const f = smooth(prog(lt, 0, dur * 0.6)); shark.position.set(lerp(-6, 0.3, f), lerp(1.2, -0.75, f), lerp(3, -0.2, f)); shark.rotation.set(0, -0.4, -0.3 * f + Math.sin(lt * 6) * 0.05); }
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-3, 0, k), 1.6, 9); camera.lookAt(0, -0.8, -1);
      st.draw(lt, dur);
    };
  }

  // Fibra óptica en corte: la luz rebota por dentro; corte transversal del cable.
  function fiberScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.1 });
    const { scene, camera } = st;
    const items = [];
    if (variant === 'thin') {
      const layers = [[1.2, 0x2a2a30], [1.0, 0x8a8a92], [0.75, 0xd8a050], [0.5, 0x4a6aa8], [0.25, 0xe8e8f0]];
      layers.forEach(([r, c], i) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, 3 - i * 0.3, 32), new T.MeshStandardMaterial({ color: c })); m.rotation.x = PI / 2; m.position.z = i * 0.15; scene.add(m); items.push(m); });
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; const f = onGlow(new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 3.2, 8), new T.MeshBasicMaterial({ color: 0x5ad8ff }))); f.rotation.x = PI / 2; f.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.6); scene.add(f); }
      st.label({ text: 'grosor de una manguera', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 44 });
    } else {
      const glass = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 9, 32, 1, true), new T.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.2, side: T.DoubleSide, depthWrite: false })); glass.rotation.z = PI / 2; scene.add(glass);
      const pts = []; for (let i = 0; i <= 18; i++) pts.push(new T.Vector3(-4.5 + i * 0.5, i % 2 ? 0.5 : -0.5, 0));
      const zig = onGlow(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xffffff }))); scene.add(zig); items.push(zig);
      const head = glowSprite(0xffffff, 0.6, 1); scene.add(head); items.push(head);
      st.label({ text: variant === 'speed' ? '~200.000 km/s' : 'luz rebotando', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.blue, size: variant === 'speed' ? 56 : 46 });
      items.pts = pts;
    }
    return (lt, dur) => {
      if (variant === 'thin') items.forEach((m) => { m.rotation.z = lt * 0.2; });
      else { const n = items.pts.length; const f = ((lt * (variant === 'speed' ? 1.2 : 0.4)) % 1) * (n - 1); const i = Math.floor(f); items[0].geometry.setDrawRange(0, i + 2); items[1].position.copy(items.pts[i].clone().lerp(items.pts[Math.min(n - 1, i + 1)], f - i)); }
      camera.position.set(variant === 'thin' ? 3 : 0, variant === 'thin' ? 1.5 : 0.8, variant === 'thin' ? 5.5 : 8); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'count', 'outro'].forEach((v) => reg(`net_${v}`, (c) => globeScene(c, v)));
  ['packets', 'routes', 'rebuild'].forEach((v) => reg(`net_${v}`, (c) => packetScene(c, v)));
  ['cable', 'shark'].forEach((v) => reg(`net_${v}`, (c) => cableScene(c, v)));
  ['fiber', 'speed', 'thin'].forEach((v) => reg(`net_${v}`, (c) => fiberScene(c, v)));
})();
