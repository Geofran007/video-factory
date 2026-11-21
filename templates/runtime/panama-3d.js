// Escenas 3D "Canal de Panamá" (pan_*). Diseño propio con Three.js r149, usando el kit de galapagos-3d.js.
// Mapa estilizado de América (contornos aproximados), esclusa en 3D y perfil del canal.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, ocean, glowSprite, onGlow } = K;

  K.addEN({
    'Nueva York': 'New York', 'San Francisco': 'San Francisco', 'Panamá': 'Panama',
    '≈ 22.500 km': '≈ 22,500 km', '≈ 9.500 km': '≈ 9,500 km', 'Canal de Panamá · 1914': 'Panama Canal · 1914',
    'Atlántico': 'Atlantic', 'Pacífico': 'Pacific', 'lago Gatún\n26 m sobre el mar': 'Gatun Lake\n26 m above sea level',
    'esclusas': 'locks', 'cámara': 'chamber', 'compuertas': 'gates', 'agua del lago': 'lake water',
    'sin bombas: solo gravedad': 'no pumps: just gravity', '≈ 200 millones de litros': '≈ 200 million liters',
    'agua dulce al mar': 'fresh water out to sea', 'el barco sube': 'the ship rises',
  });

  const fade = (st) => {
    st.overlay = (ctx, lt, dur) => {
      const a = smooth(prog(lt, dur * 0.5, dur * 0.45));
      ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    };
  };

  // ------------------------------------------------------------------ mapa estilizado
  const NA = [[-168, 66], [-156, 71], [-140, 70], [-125, 70], [-95, 72], [-80, 73], [-62, 60], [-56, 52], [-66, 45], [-70, 42],
    [-76, 35], [-81, 31], [-80, 25.5], [-82, 28], [-84, 30], [-90, 30], [-97, 27], [-97, 22], [-91, 19], [-87, 21], [-88, 16],
    [-84, 15], [-83, 10], [-79.5, 9.4], [-77.5, 8.5], [-78.5, 7.5], [-80.5, 7.5], [-85.5, 10.5], [-87, 13], [-92, 14.5],
    [-96, 15.8], [-105, 20], [-106, 23], [-110, 27], [-117, 32.5], [-121, 35], [-124, 40], [-124, 48], [-130, 55], [-138, 59],
    [-150, 60], [-158, 57], [-165, 60]];
  const SA = [[-77.5, 8.5], [-75, 11], [-72, 12], [-68, 10.5], [-62, 10.5], [-60, 8], [-52, 5], [-50, 0], [-44, -2.5], [-35, -5],
    [-35, -9], [-39, -15], [-41, -22], [-48, -26], [-53, -34], [-57, -38], [-62, -39], [-65, -45], [-68, -50], [-69, -55],
    [-72, -53], [-75, -48], [-74, -42], [-73, -37], [-71, -30], [-70, -18], [-76, -14], [-81, -6], [-80, -2], [-80, 1],
    [-78, 2], [-77.5, 4]];
  const KM = 0.06;
  const mx = (lon) => (lon + 80) * KM, mz = (lat) => -(lat - 9) * KM;
  const P3 = ([lon, lat], y = 0.2) => new T.Vector3(mx(lon), y, mz(lat));
  const NY = [-74, 40.7], SF = [-122.4, 37.8];
  const CAPE = [NY, [-70, 32], [-60, 15], [-45, 2], [-33, -8], [-38, -25], [-52, -40], [-64, -56.5], [-78, -54], [-79, -38],
    [-80, -18], [-86, -2], [-98, 12], [-114, 25], SF];
  const CANAL = [NY, [-73, 30], [-77, 20], [-79.9, 9.4], [-79.5, 8.9], [-86, 9], [-100, 14], [-114, 25], SF];

  function land(scene, pts) {
    const sh = new T.Shape(pts.map(([lon, lat]) => new T.Vector2(mx(lon), (lat - 9) * KM)));
    const g = new T.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false });
    g.rotateX(-PI / 2);
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: 0x4a9a50, flatShading: true, roughness: 1 }));
    scene.add(m); return m;
  }

  function route(scene, pts, color) {
    const curve = new T.CatmullRomCurve3(pts.map((p) => P3(p, 0.22)));
    const geo = new T.TubeGeometry(curve, 400, 0.045, 8, false);
    const m = onGlow(new T.Mesh(geo, new T.MeshBasicMaterial({ color, transparent: true })));
    scene.add(m);
    const total = geo.index.count;
    const ship = glowSprite(0xffffff, 0.45, 1); scene.add(ship);
    return {
      m, curve,
      set(p, showShip = true) {
        m.visible = p > 0.002; geo.setDrawRange(0, Math.floor(total * p / 6) * 6);
        ship.visible = showShip && p > 0.002 && p < 0.999; ship.position.copy(curve.getPointAt(clamp(p)));
      },
      at: (p) => curve.getPointAt(clamp(p)).toArray(),
    };
  }

  function mapScene(canvas, variant) {
    const st = stage(canvas, { fog: [0x0b1628, 30, 80], focus: 0.36 });
    const { scene, camera } = st;
    const sea = ocean(scene, { y: -0.02 });
    land(scene, NA); land(scene, SA);
    const cape = route(scene, CAPE, 0xff9a3c), canal = route(scene, CANAL, 0xffc94a);
    const pt = (p) => P3(p, 0.25).toArray();
    st.label({ text: 'Nueva York', p: pt(NY), t0: 0.2, color: COL.white, size: 34, dy: 70 });
    st.label({ text: 'San Francisco', p: pt(SF), t0: 0.2, color: COL.white, size: 34, dy: 70 });
    if (variant === 'route') st.label({ text: '≈ 22.500 km', p: pt([-66, -56]), t0: (d) => d * 0.55, color: COL.orange, size: 46, dy: -110 });
    if (variant === 'shortcut') {
      st.label({ text: 'Canal de Panamá · 1914', p: pt([-79.7, 9.1]), t0: (d) => d * 0.4, color: COL.gold, size: 40, dy: -150 });
      st.label({ text: '≈ 9.500 km', screen: [540, 1000], t0: (d) => d * 0.65, color: COL.gold, size: 60 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      sea(lt);
      const k = smooth(clamp(lt / dur));
      if (variant === 'route') { cape.set(smooth(prog(lt, 0.3, dur * 0.65))); canal.set(0); }
      else if (variant === 'shortcut') {
        cape.set(1, false); cape.m.material.opacity = lerp(1, 0.25, smooth(prog(lt, 0.2, 0.8)));
        canal.set(smooth(prog(lt, 0.4, dur * 0.5)));
      } else { cape.set(0); canal.set(1, false); }
      if (variant === 'outro') { camera.position.set(-1.6, lerp(13, 24, k), lerp(4.5, 9, k)); camera.lookAt(-1.4, 0, 0.6); }
      else { camera.position.set(-1.6, lerp(13.5, 12.6, k), lerp(4.6, 4.2, k)); camera.lookAt(-1.4, 0, 0.5); }
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ barco
  function ship(scale = 1) {
    const g = new T.Group();
    const hullShape = new T.Shape();
    hullShape.moveTo(-1.6, 0.35); hullShape.lineTo(1.35, 0.35); hullShape.lineTo(1.7, 0.6); hullShape.lineTo(1.6, -0.05);
    hullShape.lineTo(1.2, -0.25); hullShape.lineTo(-1.5, -0.25); hullShape.lineTo(-1.65, 0.0); hullShape.closePath();
    const hg = new T.ExtrudeGeometry(hullShape, { depth: 0.9, bevelEnabled: false }); hg.translate(0, 0, -0.45);
    const hull = new T.Mesh(hg, new T.MeshStandardMaterial({ color: 0x2b2f3a, flatShading: true }));
    const band = new T.Mesh(new T.BoxGeometry(3.05, 0.1, 0.92), new T.MeshStandardMaterial({ color: 0xc23b2e }));
    band.position.set(-0.05, -0.18, 0);
    g.add(hull, band);
    const bridge = new T.Mesh(new T.BoxGeometry(0.4, 0.55, 0.8), new T.MeshStandardMaterial({ color: 0xf2f2f2, flatShading: true }));
    bridge.position.set(-1.25, 0.62, 0); g.add(bridge);
    const cols = [0xd9534f, 0x3a7bd5, 0xf0ad4e, 0x5cb85c, 0x8e5cf7, 0xe0e0e0];
    const r = rng(7);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < (r() > 0.3 ? 2 : 1); k++) {
      const c = new T.Mesh(new T.BoxGeometry(0.4, 0.2, 0.26), new T.MeshStandardMaterial({ color: cols[Math.floor(r() * cols.length)], flatShading: true }));
      c.position.set(-0.8 + i * 0.42, 0.46 + k * 0.21, -0.28 + j * 0.28); g.add(c);
    }
    g.scale.setScalar(scale);
    return g;
  }

  // ------------------------------------------------------------------ esclusa en 3D
  const LO = -0.6, HI = 1.0, WALL = 1.5, CW = 0.85;   // niveles, alto del muro, media anchura de la cámara

  function lockScene(canvas, variant) {
    const st = stage(canvas, { fog: [0x0b1628, 20, 50], focus: 0.37 });
    const { scene, camera } = st;
    const concrete = new T.MeshStandardMaterial({ color: 0x9a9890, flatShading: true, roughness: 1 });
    const grass = new T.MeshStandardMaterial({ color: 0x3f7f3c, flatShading: true, roughness: 1 });
    for (const s of [-1, 1]) {
      const wall = new T.Mesh(new T.BoxGeometry(26, WALL + 1.4, 0.35), concrete); wall.position.set(0, (WALL - 1.4) / 2, s * (CW + 0.17)); scene.add(wall);
      const g = new T.Mesh(new T.BoxGeometry(26, 0.3, 10), grass); g.position.set(0, WALL - 0.15, s * (CW + 0.35 + 5)); scene.add(g);
    }
    const floor = new T.Mesh(new T.BoxGeometry(26, 0.2, CW * 2), concrete); floor.position.y = -1.4; scene.add(floor);
    const waterMat = new T.MeshStandardMaterial({ color: 0x2f7fd0, transparent: true, opacity: 0.72, roughness: 0.2, flatShading: true });
    const box = (x0, x1, level) => { const m = new T.Mesh(new T.BoxGeometry(x1 - x0, 1, CW * 2), waterMat); m.position.x = (x0 + x1) / 2; scene.add(m);
      const set = (y) => { m.scale.y = Math.max(0.01, y + 1.3); m.position.y = -1.3 + (y + 1.3) / 2; }; set(level); return set; };
    box(-13, -3.15, LO); box(3.15, 13, HI);
    const setChamber = box(-3.0, 3.0, LO);
    // Compuertas de dos hojas (busco) en cada extremo
    const gateMat = new T.MeshStandardMaterial({ color: 0x5b6470, flatShading: true });
    const gate = (x, dirOpen) => {
      const leaves = [-1, 1].map((s) => {
        const pivot = new T.Group(); pivot.position.set(x, 0, s * CW); scene.add(pivot);
        const leaf = new T.Mesh(new T.BoxGeometry(0.12, WALL + 1.3, CW * 1.04), gateMat);
        leaf.position.set(0, (WALL - 1.3) / 2, -s * CW * 0.52); pivot.add(leaf);
        return { pivot, s };
      });
      return (closed) => leaves.forEach(({ pivot, s }) => { pivot.rotation.y = s * dirOpen * (1 - closed) * (PI / 2 - 0.05) + s * closed * 0.28; });
    };
    const lowGate = gate(-3.05, 1), highGate = gate(3.05, -1);
    const boat = ship(0.72); scene.add(boat);
    // Flechas de agua por los conductos del fondo
    const chev = [];
    if (variant === 'fill' || variant === 'water' || variant === 'hook') {
      const shp = new T.Shape(); shp.moveTo(0, 0.14); shp.lineTo(0.18, 0); shp.lineTo(0, -0.14); shp.lineTo(-0.07, -0.14); shp.lineTo(0.1, 0); shp.lineTo(-0.07, 0.14);
      const cg = new T.ShapeGeometry(shp); cg.rotateX(-PI / 2);
      for (let i = 0; i < 10; i++) {
        const m = onGlow(new T.Mesh(cg, new T.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true })));
        m.position.set(0, -1.25, (i % 2 ? 0.4 : -0.4)); m.rotation.y = variant === 'water' ? 0 : PI; scene.add(m); chev.push(m);
      }
    }
    const r = rng(3); const out = [];
    if (variant === 'water') for (let k = 0; k < 30; k++) { const s = glowSprite(0x8fd0ff, 0.35, 1); scene.add(s); out.push({ s, z: (r() - 0.5) * 1.4, ph: r() }); }

    if (variant === 'enter') {
      st.label({ text: 'cámara', p: [0, WALL, CW], t0: 0.3, color: COL.white, size: 40, dy: 90 });
      st.label({ text: 'compuertas', p: [-3.05, WALL, -CW], t0: (d) => d * 0.6, color: COL.gold, size: 40, dy: 120 });
    }
    if (variant === 'fill') {
      st.label({ text: 'agua del lago', p: [4.5, HI, 0], t0: 0.3, color: COL.blue, size: 40, dy: 110 });
      st.label({ text: 'sin bombas: solo gravedad', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.white, size: 44 });
      st.label({ text: 'el barco sube', p: () => [boat.position.x - 0.9, boat.position.y + 0.8, 0], t0: (d) => d * 0.65, color: COL.gold, size: 42 });
    }
    if (variant === 'water') {
      st.label({ text: '≈ 200 millones de litros', screen: [540, 1000], t0: (d) => d * 0.2, t1: (d) => d * 0.6, color: COL.gold, size: 54 });
      st.label({ text: 'agua dulce al mar', p: [-6, LO, 0], t0: (d) => d * 0.62, color: COL.blue, size: 44, dy: 160 });
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      let level = LO, bx = 0, lowC = 1, highC = 1;
      if (variant === 'hook') { level = lerp(LO, HI, smooth(prog(lt, 0.2, dur * 0.85))); }
      if (variant === 'enter') { bx = lerp(-8, 0, smooth(prog(lt, 0, dur * 0.6))); lowC = smooth(prog(lt, dur * 0.62, dur * 0.3)); }
      if (variant === 'fill') { level = lerp(LO, HI, smooth(prog(lt, 0.3, dur * 0.8))); }
      if (variant === 'water') { level = lerp(HI, LO, smooth(prog(lt, 0.3, dur * 0.8))); bx = -40; }
      setChamber(level);
      boat.position.set(bx, level + 0.12, 0); boat.visible = bx > -30;
      boat.rotation.z = Math.sin(lt * 1.3) * 0.006;
      lowGate(lowC); highGate(highC);
      const flowing = (variant === 'fill' || variant === 'hook') ? level < HI - 0.02 : variant === 'water' ? level > LO + 0.02 : false;
      chev.forEach((m, i) => {
        const f = (lt * 0.5 + (i >> 1) / 5) % 1;
        m.position.x = variant === 'water' ? lerp(-1, -8, f) : lerp(7, 0, f);
        m.material.opacity = flowing ? Math.sin(f * PI) : 0;
      });
      out.forEach((o) => {
        const f = (lt * 0.4 + o.ph) % 1;
        o.s.position.set(lerp(-3.2, -11, f), LO + 0.05 + Math.sin(f * 7 + o.ph * 5) * 0.06, o.z);
        o.s.material.opacity = (level > LO + 0.02 ? 1 : 0) * (1 - f);
      });
      if (variant === 'enter') camera.position.set(lerp(-7.5, -6.0, k), 7.0, lerp(5.2, 4.6, k));
      else camera.position.set(lerp(-4.8, -4.2, k), lerp(7.0, 6.4, k), lerp(4.8, 4.4, k));
      camera.lookAt(variant === 'water' ? -2.0 : 0, -0.4, 0);
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ perfil del canal (escalones)
  const LV = [0, 0.5, 1.0, 1.5];  // mar → lago (26 m), escalado
  const XS = 2.6, CH = 0.32;       // inicio de esclusas y ancho de cada cámara
  const levelAt = (x) => {
    const ax = Math.abs(x);
    if (ax >= XS) return LV[0];
    if (ax <= XS - 3 * CH) return LV[3];
    const k = (XS - ax) / CH; const i = Math.floor(k);
    return lerp(LV[i], LV[i + 1], smooth(k - i));
  };

  function profileScene(canvas, variant) {
    const st = stage(canvas, { fog: [0x0b1628, 20, 50], focus: 0.36 });
    const { scene, camera } = st;
    const dirt = new T.MeshStandardMaterial({ color: 0x8a6d4c, flatShading: true, roughness: 1 });
    const water = new T.MeshStandardMaterial({ color: 0x2f7fd0, transparent: true, opacity: 0.8, roughness: 0.2 });
    const depth = 1.2;
    const slab = (x0, x1, y0, y1, mat, z = 0) => { const m = new T.Mesh(new T.BoxGeometry(x1 - x0, y1 - y0, depth), mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); scene.add(m); return m; };
    slab(-6, 6, -0.9, -0.5, dirt);
    for (const s of [-1, 1]) {
      slab(s > 0 ? XS : -6, s > 0 ? 6 : -XS, -0.5, LV[0], water);
      for (let i = 0; i < 3; i++) {
        const xa = XS - (i + 1) * CH, xb = XS - i * CH;
        const [x0, x1] = s > 0 ? [xa, xb] : [-xb, -xa];
        slab(x0, x1, -0.5, LV[i + 1] - 0.25, dirt);
        slab(x0, x1, LV[i + 1] - 0.25, LV[i + 1], water);
        const g = new T.Mesh(new T.BoxGeometry(0.04, 0.32, depth + 0.05), new T.MeshStandardMaterial({ color: 0x5b6470 }));
        g.position.set(s > 0 ? x1 : x0, LV[i + 1] - 0.02, 0); scene.add(g);
      }
    }
    slab(-(XS - 3 * CH), XS - 3 * CH, -0.5, LV[3] - 0.35, dirt);
    slab(-(XS - 3 * CH), XS - 3 * CH, LV[3] - 0.35, LV[3], water);
    // Montañas detrás del canal (corte Culebra)
    const mg = new T.PlaneGeometry(12, 4, 60, 12);
    const mp = mg.attributes.position;
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i), y = mp.getY(i) + 2;
      const top = 1.2 + 1.6 * Math.exp(-((x / 1.4) ** 2)) + (noise2(x * 1.4, 2) - 0.5) * 0.6 - Math.max(0, Math.abs(x) - XS) * 0.6;
      mp.setY(i, (y / 4) * top - 0.5); mp.setZ(i, -1.2 - (y / 4) * 1.2);
    }
    mg.computeVertexNormals();
    scene.add(new T.Mesh(mg, new T.MeshStandardMaterial({ color: 0x3f7f3c, flatShading: true, roughness: 1, side: T.DoubleSide })));
    const boat = ship(0.24); scene.add(boat);
    st.label({ text: 'Atlántico', p: [-4.6, 0, 0.6], t0: 0.2, color: COL.blue, size: 36, dy: 80 });
    st.label({ text: 'Pacífico', p: [4.6, 0, 0.6], t0: 0.2, color: COL.blue, size: 36, dy: 80 });
    if (variant === 'profile') {
      st.label({ text: 'lago Gatún\n26 m sobre el mar', p: [0, LV[3], 0.6], t0: (d) => d * 0.35, color: COL.gold, size: 38, dy: 160 });
      st.label({ text: 'esclusas', p: [-(XS - 1.5 * CH), LV[2], 0.6], t0: (d) => d * 0.6, color: COL.white, size: 36, dy: -150 });
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const bx = variant === 'steps' ? lerp(-4.5, 4.5, clamp(lt / dur)) : lerp(-4.6, -3.4, k);
      boat.position.set(bx, levelAt(bx) + 0.03, 0.15);
      if (variant === 'steps') { camera.position.set(bx * 0.7, 2.4, 5.4); camera.lookAt(bx * 0.7, 0.9, 0); }
      else { camera.position.set(0, 3.0, lerp(12.5, 11.5, k)); camera.lookAt(0, 0.6, 0); }
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['route', 'shortcut', 'outro'].forEach((v) => reg(`pan_${v}`, (c) => mapScene(c, v)));
  ['hook', 'enter', 'fill', 'water'].forEach((v) => reg(`pan_${v}`, (c) => lockScene(c, v)));
  ['profile', 'steps'].forEach((v) => reg(`pan_${v}`, (c) => profileScene(c, v)));
})();
