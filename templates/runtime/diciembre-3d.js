// Escenas 3D de los videos largos de diciembre: Tierra cúbica (cub_*), Papá Noel (nav_*) e imanes potentes (mag_*).
// Diseño propio con Three.js r149. Todo depende solo del tiempo local de la escena (lt).
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, noise2, rng, stage, glowSprite, onGlow, space, sphere, sunBall } = K;

  K.addEN({
    'la gravedad apunta al centro': 'gravity points to the center', '6 mares redondos': '6 round seas', 'bordes sin aire': 'edges with no air',
    'cuesta arriba': 'uphill', 'la gravedad lo redondea': 'gravity makes it round', 'amanecer de golpe': 'sudden sunrise',
    'esquina: ~1.700 km "arriba"': 'corner: ~1,700 km "up"',
    '≈ 2.000 millones de niños': '≈ 2 billion children', 'más de 30 horas de noche': 'over 30 hours of night',
    '≈ 6.000 casas por segundo': '≈ 6,000 homes per second', 'una carga gigantesca': 'a gigantic load',
    'NORAD · desde 1955': 'NORAD · since 1955', 'electroimán': 'electromagnet', 'corriente encendida': 'current on',
    'rana flotando · 16 teslas': 'floating frog · 16 teslas', 'tren maglev · ~430 km/h': 'maglev train · ~430 km/h',
    'resonancia: 1,5–3 teslas': 'MRI: 1.5–3 teslas', 'imán de nevera: ~0,005 T': 'fridge magnet: ~0.005 T',
    'el hierro de la sangre no se pega': "blood iron doesn't stick",
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };
  const sunlight = (scene, x = -12, y = 6, z = 10, i = 2.0) => { const l = new T.DirectionalLight(0xfff4e0, i); l.position.set(x, y, z); scene.add(l); return l; };

  // ================================================================== TIERRA CÚBICA
  // Cubo subdividido coloreado por la "altura" real: distancia al centro menos la del centro de cada cara.
  // Cerca del centro de las caras queda agua (6 mares redondos); en bordes y esquinas, roca y hielo sin aire.
  function cubeWorld(scene, size = 1.6) {
    const g = new T.BoxGeometry(size * 2, size * 2, size * 2, 40, 40, 40).toNonIndexed();
    const p = g.attributes.position; const base = Float32Array.from(p.array);
    const cols = new Float32Array(p.count * 3); const c = new T.Color();
    for (let f = 0; f < p.count; f += 3) {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 3; k++) { cx += p.getX(f + k) / 3; cy += p.getY(f + k) / 3; cz += p.getZ(f + k) / 3; }
      const h = Math.hypot(cx, cy, cz) / size - 1;
      const n = noise2(cx * 3 + cz, cy * 3 - cz) * 0.06;
      if (h + n < 0.1) c.set(0x1d6fd0); else if (h + n < 0.16) c.set(0xe0d090); else if (h + n < 0.32) c.set(0x3f9a4a);
      else if (h + n < 0.5) c.set(0x8a7a50); else if (h + n < 0.62) c.set(0x8a8a92); else c.set(0xf0f4f8);
      for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
    }
    g.setAttribute('color', new T.BufferAttribute(cols, 3)); g.computeVertexNormals();
    const mesh = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    scene.add(mesh);
    // morph: 0 cubo, 1 esfera
    const morph = (m) => {
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]; const L = Math.hypot(x, y, z) || 1; const R = size * 1.25;
        p.setXYZ(i, lerp(x, x / L * R, m), lerp(y, y / L * R, m), lerp(z, z / L * R, m));
      }
      p.needsUpdate = true; g.computeVertexNormals();
    };
    return { mesh, morph };
  }

  function cubeScene(canvas, variant) {
    const st = space(canvas);
    const { scene, camera } = st;
    const sun = sunlight(scene, -12, 5, 9, 2.0); scene.add(new T.AmbientLight(0x404a60, variant === 'day' ? 0.15 : 0.5));
    const W0 = cubeWorld(scene);
    const S = 1.6;
    const airs = [];
    if (variant === 'air' || variant === 'hook' || variant === 'outro') {
      [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach((d) => { const s = glowSprite(0x6ab8ff, 1.7, variant === 'air' ? 0 : 0.35); s.position.set(d[0] * S * 1.05, d[1] * S * 1.05, d[2] * S * 1.05); W0.mesh.add(s); airs.push(s); });
    }
    const arrows = [];
    if (variant === 'gravity') {
      [[0, S, 0], [S, S, 0], [S, S, S], [S * 0.5, S, -S * 0.3], [S, 0, S * 0.6], [0, 0, S]].forEach((q) => {
        const o = new T.Vector3(...q).multiplyScalar(1.25); const a = onGlow(new T.ArrowHelper(o.clone().negate().normalize(), o, 0.9, 0xffc94a, 0.25, 0.18)); W0.mesh.add(a); arrows.push(a);
      });
      st.label({ text: 'la gravedad apunta al centro', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 46 });
    }
    let walker = null;
    if (variant === 'edge') {
      walker = new T.Group();
      const body = new T.Mesh(new T.CapsuleGeometry(0.05, 0.16, 4, 8), new T.MeshStandardMaterial({ color: 0xff5a5a })); body.position.y = 0.13; walker.add(body);
      const head = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), new T.MeshStandardMaterial({ color: 0xf0c8a0 })); head.position.y = 0.29; walker.add(head);
      W0.mesh.add(walker);
      st.label({ text: 'cuesta arriba', p: () => { const v = new T.Vector3(); walker.getWorldPosition(v); return v.toArray(); }, t0: (d) => d * 0.3, color: COL.gold, size: 42 });
      st.label({ text: 'esquina: ~1.700 km "arriba"', screen: [540, 1000], t0: (d) => d * 0.55, color: COL.white, size: 40 });
    }
    if (variant === 'seas') st.label({ text: '6 mares redondos', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.blue, size: 50 });
    if (variant === 'air') st.label({ text: 'bordes sin aire', screen: [540, 1000], t0: (d) => d * 0.45, color: '#ff8a7a', size: 48 });
    if (variant === 'round') st.label({ text: 'la gravedad lo redondea', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.green, size: 46 });
    if (variant === 'day') st.label({ text: 'amanecer de golpe', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 48 });
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      W0.morph(variant === 'round' ? smooth(prog(lt, dur * 0.2, dur * 0.6)) : 0);
      W0.mesh.rotation.set(variant === 'edge' ? 0.25 : 0.45, lt * (variant === 'day' ? 0.6 : 0.18) + 0.6, 0);
      airs.forEach((a) => { a.material.opacity = variant === 'air' ? 0.55 * smooth(prog(lt, 0.3, 1)) : a.material.opacity; });
      if (walker) {
        // Camina desde el centro de la cara de arriba hacia el borde; siempre "de pie" respecto al centro del cubo.
        const f = smooth(clamp(lt / (dur * 0.9))); const pos = new T.Vector3(lerp(0, S * 0.95, f), S, 0);
        walker.position.copy(pos); walker.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), pos.clone().normalize());
      }
      if (variant === 'day') sun.intensity = 2.0;
      const d = variant === 'edge' ? 7.5 : 10.5;
      camera.position.set(lerp(-0.4, 0.4, k), variant === 'edge' ? 3.2 : 1.6, d); camera.lookAt(0, variant === 'edge' ? 0.8 : 0, 0);
      st.draw(lt, dur);
    };
  }

  // ================================================================== PAPÁ NOEL
  function house(scene, x, z, s, r) {
    const g = new T.Group();
    const wall = new T.Mesh(new T.BoxGeometry(1, 0.8, 1), new T.MeshStandardMaterial({ color: [0xc8a07a, 0xb07a5a, 0xd8c8a8][Math.floor(r() * 3)], flatShading: true })); wall.position.y = 0.4; g.add(wall);
    const roof = new T.Mesh(new T.ConeGeometry(0.85, 0.6, 4), new T.MeshStandardMaterial({ color: 0xf4f8ff, flatShading: true })); roof.position.y = 1.1; roof.rotation.y = PI / 4; g.add(roof);
    const win = onGlow(new T.Mesh(new T.PlaneGeometry(0.25, 0.25), new T.MeshBasicMaterial({ color: 0xffd27a }))); win.position.set(0, 0.45, 0.51); g.add(win);
    g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = (r() - 0.5) * 0.6; scene.add(g); return g;
  }

  function sleigh(scene) {
    const g = new T.Group();
    const red = new T.MeshStandardMaterial({ color: 0xd8203a, flatShading: true }), gold = new T.MeshStandardMaterial({ color: 0xffc94a, metalness: 0.5 });
    const body = new T.Mesh(new T.BoxGeometry(0.9, 0.35, 0.5), red); body.position.y = 0.25; g.add(body);
    [-1, 1].forEach((s) => { const run = new T.Mesh(new T.TorusGeometry(0.45, 0.025, 6, 20, PI), gold); run.rotation.z = PI; run.position.set(0, 0.05, s * 0.22); run.scale.y = 0.3; g.add(run); });
    const sack = new T.Mesh(new T.SphereGeometry(0.22, 10, 8), new T.MeshStandardMaterial({ color: 0x8a5a2a, flatShading: true })); sack.position.set(-0.2, 0.55, 0); g.add(sack);
    for (let i = 0; i < 4; i++) { const d = new T.Group(); const b = new T.Mesh(new T.BoxGeometry(0.35, 0.16, 0.14), new T.MeshStandardMaterial({ color: 0x8a5a3a, flatShading: true })); d.add(b); const hd = new T.Mesh(new T.BoxGeometry(0.12, 0.12, 0.1), b.material); hd.position.set(0.2, 0.12, 0); d.add(hd);
      d.position.set(0.8 + Math.floor(i / 2) * 0.55, 0.3, (i % 2 ? 1 : -1) * 0.15); g.add(d); }
    const nose = onGlow(new T.Mesh(new T.SphereGeometry(0.04, 8, 6), new T.MeshBasicMaterial({ color: 0xff3030 }))); nose.position.set(1.62, 0.43, 0.15); g.add(nose);
    scene.add(g); return g;
  }

  function villageScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0a1430, fog: [0x0a1430, 20, 60], hemi: 0.45, moon: 0.6, stars: true });
    const { scene, camera } = st;
    const ground = new T.Mesh(new T.PlaneGeometry(80, 60), new T.MeshStandardMaterial({ color: 0xe8eef8 })); ground.rotation.x = -PI / 2; scene.add(ground);
    const r = rng(14);
    for (let i = 0; i < 14; i++) house(scene, -12 + i * 1.9 + (r() - 0.5), -3 - r() * 8, 0.8 + r() * 0.5, r);
    const sl = sleigh(scene); sl.scale.setScalar(variant === 'gifts' ? 2.0 : 1.5);
    const trail = []; for (let i = 0; i < 40; i++) { const s = glowSprite(i % 3 ? 0xffe8a0 : 0xffffff, 0.3, 0); s.material.fog = false; scene.add(s); trail.push(s); }
    const snow = []; for (let i = 0; i < 160; i++) { const s = new T.Mesh(new T.SphereGeometry(0.04, 4, 3), new T.MeshBasicMaterial({ color: 0xffffff })); s.position.set((r() - 0.5) * 30, r() * 12, -2 - r() * 12); scene.add(s); snow.push({ s, v: 0.4 + r() * 0.5, ph: r() * 6 }); }
    let gifts = [];
    if (variant === 'gifts') { for (let i = 0; i < 30; i++) { const b = new T.Mesh(new T.BoxGeometry(0.3, 0.3, 0.3), new T.MeshStandardMaterial({ color: [0xd8203a, 0x2a8a4a, 0x2a6ad8, 0xffc94a][i % 4] })); b.position.set(-0.3 + (i % 5) * 0.14, 0.5 + Math.floor(i / 5) * 0.16, ((i * 7) % 5 - 2) * 0.1); sl.add(b); gifts.push(b); } st.label({ text: 'una carga gigantesca', p: () => sl.position.toArray(), t0: (d) => d * 0.4, color: COL.gold, size: 44, dy: 160 }); }
    if (variant === 'speed') st.label({ text: '≈ 6.000 casas por segundo', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 48 });
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const fast = variant === 'speed' ? 3 : 1;
      const f = variant === 'gifts' ? 0.5 + Math.sin(lt * 0.4) * 0.05 : ((lt * 0.12 * fast) % 1.2) - 0.1;
      const pos = new T.Vector3(lerp(-16, 16, f), 4.5 + Math.sin(f * PI * 2) * 0.8, -4); sl.position.copy(pos); sl.rotation.z = Math.cos(f * PI * 2) * 0.12;
      trail.forEach((s, i) => { const g = f - i * 0.006 * fast; s.position.set(lerp(-16, 16, g), 4.6 + Math.sin(g * PI * 2) * 0.8, -4); s.material.opacity = (1 - i / 40) * 0.8; s.scale.setScalar(0.3 + (variant === 'speed' ? 0.4 : 0)); });
      snow.forEach((o) => { o.s.position.y = ((o.s.position.y - o.v * 0.016 + 12) % 12); o.s.position.x += Math.sin(lt + o.ph) * 0.002; });
      camera.position.set(lerp(-1, 1, k), 2.4, 12); camera.lookAt(0, 3, -4);
      st.draw(lt, dur);
    };
  }

  // Globo con husos horarios: la noche avanza y el trineo la sigue hacia el oeste.
  function nightGlobe(canvas, variant) {
    const st = space(canvas);
    const { scene, camera } = st;
    sunlight(scene, -14, 2, 4, 2.2); scene.add(new T.AmbientLight(0x303850, 0.4));
    const earth = sphere(2.2, 'earth', 2, 5); scene.add(earth);
    const lights = []; const r = rng(7);
    for (let i = 0; i < 260; i++) { const la = (r() - 0.35) * 1.6, lo = r() * PI * 2; const v = new T.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)).multiplyScalar(2.22); const s = glowSprite(0xffd27a, 0.12, 0); s.position.copy(v); earth.add(s); lights.push({ s, v }); }
    const zones = [];
    if (variant === 'zones') { for (let i = 0; i < 24; i++) { const m = new T.Mesh(new T.TorusGeometry(2.24, 0.006, 4, 64, PI), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); m.rotation.y = i / 24 * PI * 2; m.rotation.x = PI / 2; m.rotation.order = 'YXZ'; earth.add(m); zones.push(m); } }
    const sl = sleigh(scene); sl.scale.setScalar(0.35);
    if (variant === 'kids') st.label({ text: '≈ 2.000 millones de niños', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 48 });
    if (variant === 'zones') st.label({ text: 'más de 30 horas de noche', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.gold, size: 48 });
    const tmp = new T.Vector3();
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      earth.rotation.y = lt * 0.2;
      lights.forEach((o) => { o.s.getWorldPosition(tmp); o.s.material.opacity = tmp.x > 0.3 ? 0.9 : 0; });
      const a = lt * 0.2 + 0.3; sl.position.set(Math.cos(a) * 0.4 + 2.6, 1.6 + Math.sin(lt * 2) * 0.1, 1.2); sl.rotation.y = -0.6;
      camera.position.set(lerp(-0.4, 0.4, k), 1.2, 9); camera.lookAt(0.4, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Radar que sigue un punto en el cielo (tradición de NORAD desde 1955).
  function radarScene(canvas) {
    const st = stage(canvas, { bg: 0x0a1430, fog: null, hemi: 0.6, moon: 0.8, stars: true });
    const { scene, camera } = st;
    const ground = new T.Mesh(new T.PlaneGeometry(60, 40), new T.MeshStandardMaterial({ color: 0xe8eef8 })); ground.rotation.x = -PI / 2; scene.add(ground);
    const dishG = new T.Group(); dishG.position.set(-2, 0, 0); scene.add(dishG);
    const post = new T.Mesh(new T.CylinderGeometry(0.15, 0.2, 2, 8), new T.MeshStandardMaterial({ color: 0xb0b8c8 })); post.position.y = 1; dishG.add(post);
    const head = new T.Group(); head.position.y = 2.1; dishG.add(head);
    const dish = new T.Mesh(new T.SphereGeometry(1.2, 20, 10, 0, PI * 2, 0, PI / 3.5), new T.MeshStandardMaterial({ color: 0xf0f4f8, side: T.DoubleSide, metalness: 0.3 })); dish.rotation.x = PI / 2; head.add(dish);
    const target = glowSprite(0xff4040, 0.6, 1); scene.add(target);
    const beam = onGlow(new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 1, 6), new T.MeshBasicMaterial({ color: 0x6aff9a, transparent: true, opacity: 0.6 }))); scene.add(beam);
    st.label({ text: 'NORAD · desde 1955', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 48 });
    const up = new T.Vector3(0, 1, 0);
    return (lt, dur) => {
      const tp = new T.Vector3(lerp(-6, 7, (lt * 0.08) % 1), 6 + Math.sin(lt) * 0.4, -6); target.position.copy(tp);
      const hp = new T.Vector3(-2, 2.1, 0); head.lookAt(tp); head.rotateX(PI / 2);
      const mid = hp.clone().add(tp).multiplyScalar(0.5); beam.position.copy(mid); beam.scale.y = hp.distanceTo(tp); beam.quaternion.setFromUnitVectors(up, tp.clone().sub(hp).normalize());
      beam.material.opacity = 0.3 + 0.3 * Math.sin(lt * 6);
      camera.position.set(2, 2.4, 10); camera.lookAt(0, 3.5, -2);
      st.draw(lt, dur);
    };
  }

  // ================================================================== IMANES POTENTES
  function magnetLab(canvas, variant) {
    const st = stage(canvas, { bg: 0x141c30, fog: null, stars: false, hemi: 0.9, moon: 1.1 });
    const { scene, camera } = st;
    const floor = new T.Mesh(new T.PlaneGeometry(40, 30), new T.MeshStandardMaterial({ color: variant === 'crane' ? 0x6a6a6a : 0x3a4458 })); floor.rotation.x = -PI / 2; scene.add(floor);
    const field = [];
    const fieldRing = (pos, color = 0x8fd0ff) => { for (let i = 0; i < 4; i++) { const m = onGlow(new T.Mesh(new T.TorusGeometry(1, 0.012, 6, 64), new T.MeshBasicMaterial({ color, transparent: true }))); m.position.copy(pos); m.rotation.x = PI / 2; scene.add(m); field.push(m); } };
    let lift = null, mag = null, frog = null, train = null, cells = [];
    if (variant === 'crane') {
      const car = new T.Group(); const body = new T.Mesh(new T.BoxGeometry(2.2, 0.6, 1.1), new T.MeshStandardMaterial({ color: 0x8a5a4a, metalness: 0.5, roughness: 0.6, flatShading: true })); body.position.y = 0.45; car.add(body); const top = new T.Mesh(new T.BoxGeometry(1.2, 0.45, 1.0), body.material); top.position.set(-0.1, 0.95, 0); car.add(top);
      [[-0.7, 0.55], [0.7, 0.55], [-0.7, -0.55], [0.7, -0.55]].forEach(([x, z]) => { const w = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.15, 12), new T.MeshStandardMaterial({ color: 0x222222 })); w.rotation.x = PI / 2; w.position.set(x, 0.22, z); car.add(w); });
      scene.add(car); lift = car;
      mag = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 0.35, 24), new T.MeshStandardMaterial({ color: 0x3a3a40, metalness: 0.6 })); scene.add(mag);
      const cable = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 6, 6), new T.MeshStandardMaterial({ color: 0x222222 })); cable.position.y = 6.5; mag.add(cable); cable.position.y = 3.1;
      fieldRing(new T.Vector3(0, 2.5, 0), 0xffc94a);
      st.label({ text: 'electroimán', p: () => mag.position.toArray(), t0: 0.3, color: COL.white, size: 40, dx: 200, dy: 0 });
      st.label({ text: 'corriente encendida', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 46 });
    }
    if (variant === 'frog') {
      const tube = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 3.2, 32, 1, true), new T.MeshStandardMaterial({ color: 0x9ab0d0, transparent: true, opacity: 0.25, side: T.DoubleSide })); tube.position.y = 1.6; scene.add(tube);
      const coil = new T.Mesh(new T.TorusGeometry(1.35, 0.25, 10, 40), new T.MeshStandardMaterial({ color: 0xb87a3a, metalness: 0.6 })); coil.rotation.x = PI / 2; coil.position.y = 0.6; scene.add(coil);
      frog = new T.Group(); const fm = new T.MeshStandardMaterial({ color: 0x5ab84a, flatShading: true }); const b = new T.Mesh(new T.SphereGeometry(0.35, 12, 8), fm); b.scale.set(1.2, 0.7, 1); frog.add(b);
      [-1, 1].forEach((s) => { const e = new T.Mesh(new T.SphereGeometry(0.1, 8, 6), fm); e.position.set(0.25, 0.22, s * 0.15); frog.add(e); const p = new T.Mesh(new T.SphereGeometry(0.045, 6, 4), new T.MeshBasicMaterial({ color: 0x111111 })); p.position.set(0.33, 0.25, s * 0.15); frog.add(p); const l = new T.Mesh(new T.CapsuleGeometry(0.06, 0.3, 4, 6), fm); l.position.set(-0.3, -0.15, s * 0.3); l.rotation.z = 1.2; frog.add(l); });
      scene.add(frog); fieldRing(new T.Vector3(0, 1.2, 0));
      st.label({ text: 'rana flotando · 16 teslas', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.green, size: 46 });
    }
    if (variant === 'train') {
      const track = new T.Mesh(new T.BoxGeometry(40, 0.4, 1.2), new T.MeshStandardMaterial({ color: 0x8a8a92 })); track.position.y = 0.6; scene.add(track);
      train = new T.Group(); const tb = new T.Mesh(new T.CapsuleGeometry(0.6, 6, 6, 16), new T.MeshStandardMaterial({ color: 0xf0f4f8, metalness: 0.3 })); tb.rotation.z = PI / 2; train.add(tb);
      const stripe = new T.Mesh(new T.BoxGeometry(6.2, 0.15, 1.22), new T.MeshStandardMaterial({ color: 0x2a6ad8 })); train.add(stripe); scene.add(train);
      fieldRing(new T.Vector3(0, 0.9, 0));
      st.label({ text: 'tren maglev · ~430 km/h', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.blue, size: 46 });
    }
    if (variant === 'mri') {
      const ring = new T.Mesh(new T.TorusGeometry(1.6, 0.6, 16, 48), new T.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.4 })); ring.position.y = 1.9; scene.add(ring);
      const bed = new T.Mesh(new T.BoxGeometry(0.9, 0.2, 5), new T.MeshStandardMaterial({ color: 0x5a7ad8 })); bed.position.set(0, 1.0, 1.5); scene.add(bed);
      const fridge = new T.Mesh(new T.BoxGeometry(0.3, 0.3, 0.05), new T.MeshStandardMaterial({ color: 0xff7aa8 })); fridge.position.set(3, 1.2, 0); scene.add(fridge);
      fieldRing(new T.Vector3(0, 1.9, 0));
      st.label({ text: 'resonancia: 1,5–3 teslas', p: [0, 2.5, 0], t0: 0.3, color: COL.blue, size: 42, dy: 220 });
      st.label({ text: 'imán de nevera: ~0,005 T', p: [3, 1.2, 0], t0: (d) => d * 0.45, color: COL.gold, size: 38 });
    }
    if (variant === 'blood') {
      mag = new T.Mesh(new T.TorusGeometry(0.8, 0.3, 10, 30, PI), new T.MeshStandardMaterial({ color: 0xd8203a })); mag.rotation.z = -PI / 2; mag.position.set(2.4, 1.5, 0); scene.add(mag);
      const r = rng(6); for (let i = 0; i < 40; i++) { const c = new T.Mesh(new T.TorusGeometry(0.14, 0.07, 8, 16), new T.MeshStandardMaterial({ color: 0xc8202a })); c.position.set(-3 + r() * 4, 0.6 + r() * 2, (r() - 0.5) * 2); c.rotation.set(r() * 3, r() * 3, 0); scene.add(c); cells.push({ c, ph: r() * 6 }); }
      st.label({ text: 'el hierro de la sangre no se pega', screen: [540, 1000], t0: (d) => d * 0.4, color: '#ff8a7a', size: 44 });
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      field.forEach((m, i) => { const f = (lt * 0.5 + i / 4) % 1; m.scale.setScalar(0.5 + f * 2.5); m.material.opacity = (1 - f) * 0.7; });
      if (lift) { const on = smooth(prog(lt, dur * 0.25, dur * 0.3)); mag.position.set(0, lerp(3.2, 2.0, smooth(prog(lt, 0, dur * 0.25))) + on * 1.4, 0); lift.position.y = Math.max(0, mag.position.y - 1.55) * on; field.forEach((m) => { m.position.y = mag.position.y; m.visible = on > 0.1; }); }
      if (frog) { frog.position.y = 1.6 + Math.sin(lt * 1.3) * 0.15; frog.rotation.y = lt * 0.4; }
      if (train) { train.position.set(((lt * 4) % 30) - 15, 1.55 + Math.sin(lt * 3) * 0.02, 0); field.forEach((m) => { m.position.x = train.position.x; }); }
      cells.forEach((o) => { o.c.position.x += 0.004; if (o.c.position.x > 1.6) o.c.position.x = -3; o.c.rotation.x += 0.01; });
      if (variant === 'train') { camera.position.set(lerp(-2, 2, k), 3, 11); camera.lookAt(0, 1.2, 0); }
      else if (variant === 'crane') { camera.position.set(lerp(-0.6, 0.6, k), 3.6, 12); camera.lookAt(0, 2.6, 0); }
      else { camera.position.set(lerp(-0.6, 0.6, k), 3.4, 9); camera.lookAt(0, 1.4, 0); }
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'gravity', 'seas', 'air', 'edge', 'round', 'day', 'outro'].forEach((v) => reg(`cub_${v}`, (c) => cubeScene(c, v)));
  ['hook', 'speed', 'gifts', 'outro'].forEach((v) => reg(`nav_${v}`, (c) => villageScene(c, v)));
  ['kids', 'zones'].forEach((v) => reg(`nav_${v}`, (c) => nightGlobe(c, v)));
  reg('nav_radar', (c) => radarScene(c));
  ['crane', 'frog', 'train', 'mri', 'blood'].forEach((v) => reg(`mag_${v}`, (c) => magnetLab(c, v)));
})();
