// Escenas 3D "Volcanes de Ecuador" (subducción de la placa de Nazca). Diseño propio con Three.js r149.
// Reutiliza el kit de galapagos-3d.js (escenario, etiquetas tipo pastilla, brillo selectivo, océano, humo).
// Ejes: x = este, -z = norte. Todo depende solo del tiempo local de la escena (lt).
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng,
    stage, ocean, smoke, glowSprite, onGlow, rockTex, mantleMaterial, arrow } = K;

  K.addEN({
    'Océano Pacífico': 'Pacific Ocean', 'Cordillera\nOccidental': 'Western\nCordillera',
    'Cordillera\nOriental': 'Eastern\nCordillera', 'placa de Nazca →': 'Nazca Plate →', 'Andes ↑': 'Andes ↑',
    'Cotopaxi · 5.897 m': 'Cotopaxi · 5,897 m', 'Chimborazo': 'Chimborazo', 'Tungurahua': 'Tungurahua',
    'placa de Nazca': 'Nazca Plate', 'placa Sudamericana': 'South American Plate', 'subducción': 'subduction',
    'agua': 'water', 'magma': 'magma', '≈ 100 km de profundidad': '≈ 100 km deep', 'volcán': 'volcano',
    'volcanes en fila': 'volcanoes in a row',
    'Chimborazo\n6.384 km del centro': 'Chimborazo\n6,384 km from the center',
    'Everest\n6.382 km del centro': 'Everest\n6,382 km from the center', 'escala exagerada': 'not to scale',
    'volcanes activos': 'active volcanoes',
  });

  const C = (h) => new T.Color(h);

  // Volcán cónico low-poly con nieve opcional y cráter activo (lava, brillo y humo).
  function cone(scene, { h, r, snow = false, active = false, seed = 1 }) {
    const geo = new T.ConeGeometry(r, h, 12, 5); geo.translate(0, h / 2, 0);
    const pos = geo.attributes.position; const rr = rng(seed); const jit = {};
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      if (!jit[key]) jit[key] = [(rr() - 0.5) * 0.18, (rr() - 0.5) * 0.06 * h];
      if (y > h * 0.97) { pos.setY(i, h * 0.93); continue; }
      if (y < 0.01) continue;
      pos.setX(i, x * (1 + jit[key][0])); pos.setZ(i, z * (1 + jit[key][0])); pos.setY(i, y + jit[key][1]);
    }
    const g = geo.toNonIndexed(); const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3); const c = new T.Color();
    const rock = C(0x4b4247), base = C(0x6b5a4c), white = C(0xf2f5fa);
    for (let f = 0; f < p.count; f += 3) {
      const cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3, rel = cy / h;
      const n = noise2(p.getX(f) * 5 + seed, p.getZ(f) * 5);
      if (snow && rel > 0.66 + n * 0.12) c.copy(white); else c.copy(base).lerp(rock, clamp(rel * 1.4));
      c.offsetHSL(0, 0, (n - 0.5) * 0.05);
      for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
    }
    g.setAttribute('color', new T.BufferAttribute(cols, 3)); g.computeVertexNormals();
    const mesh = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
    const grp = new T.Group(); grp.add(mesh); scene.add(grp);
    const top = [0, 0, 0];
    let glow = null, sm = null, lava = null;
    if (active) {
      lava = onGlow(new T.Mesh(new T.CircleGeometry(r * 0.17, 10), new T.MeshBasicMaterial({ color: 0xff6a1a })));
      lava.rotation.x = -PI / 2; lava.position.y = h * 0.935; grp.add(lava);
      glow = glowSprite(0xff7a22, r * 1.4, 0.9); glow.position.y = h * 0.98; grp.add(glow);
      sm = smoke(scene, top, { seed: seed * 5 + 2, size: r * 0.9, height: h * 0.9, n: 6 });
    }
    return {
      grp, h, active,
      // s: escala de aparición (0..1); heat: actividad del cráter (0..1)
      set(x, y, z, s, lt, heat = 1) {
        grp.position.set(x, y, z);
        grp.scale.set(Math.max(0.001, 0.6 + 0.4 * s), Math.max(0.001, s), Math.max(0.001, 0.6 + 0.4 * s));
        grp.visible = s > 0.01;
        top[0] = x; top[1] = y + h * s * 0.95; top[2] = z;
        if (active) {
          const a = heat * clamp((s - 0.85) / 0.15);
          glow.visible = lava.visible = a > 0.02;
          glow.material.opacity = a * (0.75 + 0.2 * Math.sin(lt * 5 + seed));
          sm(lt + seed, a);
        }
      },
      top: () => [top[0], top[1], top[2]],
    };
  }

  // ------------------------------------------------------------------ mapa de los Andes ecuatorianos
  const coastX = (z) => -2.6 + 0.6 * Math.sin(z * 0.33 + 1) + 0.5 * noise2(z * 0.5, 3.1);
  function relief(x, z) {
    const d = x - coastX(z);
    if (d < 0) return -0.5;
    const ramp = smooth(clamp(d / 1.2));
    const n = noise2(x * 1.3 + 5, z * 1.3);
    const occ = 1.3 * Math.exp(-(((x - 0.2) / 0.85) ** 2));
    const ori = 1.45 * Math.exp(-(((x - 2.6) / 0.85) ** 2));
    const val = 0.55 * Math.exp(-(((x - 1.4) / 1.4) ** 2));
    return ramp * (0.12 + occ + ori + val + (n - 0.5) * 0.35 * (occ + ori + 0.3));
  }

  // [nombre, x, z, altura, radio, nieve, activo]
  const VOLCS = [
    ['Cayambe', 2.6, -8.5, 1.4, 0.75, true, false],
    ['Reventador', 4.3, -6.6, 0.8, 0.5, false, true],
    ['Pichincha', 0.15, -6.0, 1.0, 0.6, false, true],
    ['Antisana', 2.8, -4.6, 1.45, 0.8, true, false],
    ['Iliniza', 0.3, -2.2, 1.25, 0.6, true, false],
    ['Cotopaxi', 2.4, -2.6, 1.7, 0.85, true, true],
    ['Quilotoa', -0.1, -0.4, 0.75, 0.55, false, false],
    ['Carihuairazo', 0.55, 1.4, 1.15, 0.6, true, false],
    ['Chimborazo', 0.35, 2.6, 1.85, 0.95, true, false],
    ['Tungurahua', 2.7, 1.8, 1.4, 0.65, true, true],
    ['Altar', 2.95, 4.3, 1.3, 0.75, true, false],
    ['Sangay', 3.3, 7.0, 1.4, 0.7, true, true],
  ];

  function andesScene(canvas, variant) {
    const st = stage(canvas, { fog: [0x0b1628, 20, 52], focus: 0.34 });
    const { scene, camera } = st;
    const sea = ocean(scene);

    const geo = new T.PlaneGeometry(30, 34, 120, 136); geo.rotateX(-PI / 2); geo.translate(1.5, 0, 0);
    const pos = geo.attributes.position; const base = new Float32Array(pos.count);
    const cols = new Float32Array(pos.count * 3); const c = new T.Color();
    const P = { sand: C(0xc9b47e), green: C(0x3c9a4c), forest: C(0x1f6b2e), forest2: C(0x27803a),
      olive: C(0x75873c), brown: C(0x7a6248), gray: C(0x8e8a92), snow: C(0xeef2f8), sea: C(0x16243a) };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = relief(x, z); base[i] = h;
      const n = noise2(x * 2.1, z * 2.1 + 7);
      if (h < 0) c.copy(P.sea);
      else if (h < 0.09) c.copy(P.sand);
      else if (x > 3.7 && h < 0.7) c.copy(n > 0.5 ? P.forest : P.forest2);
      else if (h < 0.5) c.copy(P.green);
      else if (h < 0.95) c.copy(P.olive).lerp(P.green, n * 0.4);
      else if (h < 1.55) c.copy(P.brown).lerp(P.olive, n * 0.3);
      else c.copy(P.gray).lerp(P.snow, clamp((h - 1.95) * 2));
      c.offsetHSL(0, 0, (n - 0.5) * 0.07);
      cols.set([c.r, c.g, c.b], i * 3);
      pos.setY(i, h);
    }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    const land = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
    scene.add(land);
    const setUplift = (u) => {
      for (let i = 0; i < pos.count; i++) pos.setY(i, base[i] < 0 ? -0.5 : Math.max(0.02, base[i] * u));
      pos.needsUpdate = true;
    };

    const vols = VOLCS.map(([name, x, z, h, r, snow, active], i) => ({
      name, x, z, ground: relief(x, z), v: cone(scene, { h, r, snow, active, seed: i + 3 }),
    }));
    const byName = (n) => vols.find((o) => o.name === n);
    const peak = (n) => () => byName(n).v.top();
    const arr = arrow(scene, [-9.5, 0.35, 1.5], 5.6);

    if (variant === 'hook') st.label({ text: 'Océano Pacífico', p: [-5.5, 0, 3], t0: 0.4, color: COL.blue, size: 40, dy: 60 });
    if (variant === 'avenue') {
      st.label({ text: 'Cordillera\nOccidental', p: peak('Iliniza'), t0: 0.4, color: COL.white, size: 38, dx: -60 });
      st.label({ text: 'Cordillera\nOriental', p: peak('Cotopaxi'), t0: (d) => d * 0.3, color: COL.white, size: 38, dx: 60 });
    }
    if (variant === 'rise') {
      st.label({ text: 'placa de Nazca →', p: () => arr.tip(1), t0: (d) => d * 0.25, color: COL.gold, size: 40, dy: 90 });
      st.label({ text: 'Andes ↑', p: () => [2.6, relief(2.6, -1) * 1.0 + 0.4, -1], t0: (d) => d * 0.55, color: COL.green, size: 48 });
    }
    if (variant === 'cotopaxi') st.label({ text: 'Cotopaxi · 5.897 m', p: peak('Cotopaxi'), t0: 0.4, color: COL.gold, size: 46, dy: 130 });
    if (variant === 'final') {
      st.label({ text: 'placa de Nazca →', p: () => arr.tip(1), t0: (d) => d * 0.35, color: COL.gold, size: 40, dy: 90 });
      st.label({ text: 'volcanes activos', p: peak('Tungurahua'), t0: (d) => d * 0.15, t1: (d) => d * 0.7, color: COL.orange, size: 40 });
    }
    if (variant === 'outro') {
      st.overlay = (ctx, lt, dur) => {
        const a = smooth(prog(lt, dur * 0.5, dur * 0.45));
        ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      };
    }
    const order = vols.map((o) => o).sort((a, b) => a.z - b.z);

    return (lt, dur) => {
      sea(lt);
      const k = smooth(clamp(lt / dur));
      let u = 1;
      if (variant === 'rise') { u = lerp(0.1, 1, smooth(prog(lt, 0.2, dur * 0.85))); setUplift(u); }
      vols.forEach((o) => {
        let s = 1;
        if (variant === 'hook') s = outBack(prog(lt, 0.25 + order.indexOf(o) * dur * 0.045, 0.45));
        if (variant === 'rise') s = clamp((u - 0.35) / 0.65);
        const heat = variant === 'rise' ? clamp((u - 0.8) / 0.2) : 1;
        o.v.set(o.x, Math.max(0.02, o.ground * u) - 0.12, o.z, Math.max(0, s), lt, heat);
      });
      if (variant === 'rise') arr.set(smooth(prog(lt, 0.1, dur * 0.6)));
      else if (variant === 'final') arr.set(smooth(prog(lt, dur * 0.3, dur * 0.4)));
      else if (variant === 'outro') arr.set(1);
      else arr.set(0);

      if (variant === 'hook') {
        camera.position.set(lerp(-6.5, -5.5, k), lerp(13, 11.5, k), lerp(18, 16, k));
        camera.lookAt(1.2, 0, -2.5);
      } else if (variant === 'avenue') {
        const z = lerp(12, 5, k);
        camera.position.set(1.45, 5.4, z);
        camera.lookAt(1.45, 1.0, z - 9);
      } else if (variant === 'rise') {
        camera.position.set(lerp(-8.5, -7.5, k), lerp(10, 11, k), lerp(16, 15, k));
        camera.lookAt(0.6, 0, -1.5);
      } else if (variant === 'cotopaxi') {
        const o = byName('Cotopaxi'); const a = lerp(0.35, -0.25, k), R = 6.2;
        const ty = o.ground + 0.9;
        camera.position.set(o.x + Math.sin(a) * R, ty + 1.9, o.z + Math.cos(a) * R);
        camera.lookAt(o.x, ty + 0.2, o.z);
      } else if (variant === 'final') {
        camera.position.set(-7.5, lerp(12, 13, k), lerp(17.5, 16, k));
        camera.lookAt(0.8, 0, -2);
      } else {
        camera.position.set(lerp(-7.5, -11, k), lerp(13, 26, k), lerp(16, 24, k));
        camera.lookAt(lerp(0.8, 1.5, k), 0, -2);
      }
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ bloque en corte (subducción)
  const BX = 2.8, BZ = 1.4;
  const Y0 = -1.0, TH = 0.5, YB = -4.2, Y_SURF = 0.5, Y_LITH = -2.2;
  const XT = -0.9, S = 0.7, XCOAST = -0.55, VX = 1.25;
  const slabTop = (x) => (x < XT ? Y0 : Y0 - (x - XT) * S);
  const XC = XT + (Y0 - Y_LITH) / S;   // donde la placa cruza la base del continente
  const surfY = (x) => Y_SURF + 0.03 + 0.28 * smooth(clamp((x - XCOAST) / 2)) + 0.85 * Math.exp(-(((x - VX) / 0.75) ** 2))
    + 0.05 * Math.sin(x * 7);
  const SLOPE = -Math.atan(S);

  function extrude(points, mat) {
    const sh = new T.Shape(points.map(([x, y]) => new T.Vector2(x, y)));
    const g = new T.ExtrudeGeometry(sh, { depth: BZ * 2, bevelEnabled: false, steps: 1 });
    g.translate(0, 0, -BZ);
    return new T.Mesh(g, mat);
  }

  function subductionScene(canvas, phase) {
    const st = stage(canvas, { fog: [0x0b1628, 26, 70], fov: 48, focus: 0.39 });
    const { scene, camera } = st;

    const surfPts = []; for (let x = XCOAST; x <= BX + 1e-6; x += 0.1) surfPts.push([Math.min(x, BX), surfY(Math.min(x, BX))]);
    const mantleMat = mantleMaterial();
    const rt1 = rockTex(); rt1.repeat.set(0.45, 0.45);
    const rt2 = rockTex(); rt2.repeat.set(0.4, 0.4);
    const slabMat = new T.MeshStandardMaterial({ map: rt1, color: 0x8d97a8, flatShading: true, roughness: 1, emissive: 0x000000 });
    const contMat = new T.MeshStandardMaterial({ map: rt2, color: 0xc49a6c, flatShading: true, roughness: 1, emissive: 0x000000 });

    const slab = extrude([[-BX, Y0], [XT, Y0], [BX, slabTop(BX)], [BX, slabTop(BX) - TH], [XT, Y0 - TH], [-BX, Y0 - TH]], slabMat);
    const cont = extrude([[XT, Y0], [XC, Y_LITH], [BX, Y_LITH], ...surfPts.slice().reverse().map(([x, y]) => [x, y - 0.14]),
      [XCOAST, Y_SURF - 0.14]], contMat);
    const soil = extrude([...surfPts, ...surfPts.slice().reverse().map(([x, y]) => [x, y - 0.14])],
      new T.MeshStandardMaterial({ color: 0x4f8f3a, flatShading: true, roughness: 1 }));
    const wedge = extrude([[XC, Y_LITH], [BX, Y_LITH], [BX, slabTop(BX)]], mantleMat);
    const under = extrude([[-BX, Y0 - TH], [XT, Y0 - TH], [BX, slabTop(BX) - TH], [BX, YB], [-BX, YB]], mantleMat);
    const water = extrude([[-BX, Y0], [XT, Y0], [XCOAST, Y_SURF - 0.14], [XCOAST, Y_SURF], [-BX, Y_SURF]],
      new T.MeshStandardMaterial({ color: 0x3a8ee0, transparent: true, opacity: 0.32, depthWrite: false, roughness: 0.2 }));
    scene.add(slab, cont, soil, wedge, under, water);
    const surfGeo = new T.PlaneGeometry(XCOAST + BX, BZ * 2, 20, 14); surfGeo.rotateX(-PI / 2);
    const surf = new T.Mesh(surfGeo, new T.MeshStandardMaterial({ color: 0x4a9be0, transparent: true, opacity: 0.5,
      flatShading: true, roughness: 0.25, depthWrite: false, side: T.DoubleSide }));
    surf.position.set((XCOAST - BX) / 2, Y_SURF, 0); scene.add(surf);
    const sPos = surfGeo.attributes.position; const sBase = Float32Array.from(sPos.array);
    const edges = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(BX * 2, Y_SURF - YB, BZ * 2)),
      new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
    edges.position.y = (Y_SURF + YB) / 2; scene.add(edges);

    // Flechas sobre la placa que se hunde
    const shape = new T.Shape();
    shape.moveTo(0, 0.16); shape.lineTo(0.2, 0); shape.lineTo(0, -0.16); shape.lineTo(-0.08, -0.16);
    shape.lineTo(0.11, 0); shape.lineTo(-0.08, 0.16); shape.closePath();
    const cg = new T.ShapeGeometry(shape);
    const chev = [];
    if (phase !== 'plates') {
      for (let k = 0; k < 7; k++) {
        const m = onGlow(new T.Mesh(cg, new T.MeshBasicMaterial({ color: 0xffc94a, transparent: true })));
        scene.add(m); chev.push(m);
      }
    }
    // Gotas de agua que salen de la placa y se vuelven magma
    const drops = []; const r = rng(11);
    if (phase === 'melt' || phase === 'rise' || phase === 'row') {
      for (let k = 0; k < 16; k++) {
        const s = glowSprite(0x6cc8ff, 0.2, 1); scene.add(s);
        drops.push({ s, x: 0.75 + r() * 0.95, ph: r(), sp: 0.22 + r() * 0.12 });
      }
    }
    const blue = C(0x6cc8ff), orange = C(0xff7a22);
    // Magma que sube por la corteza hasta el volcán
    const chanMat = new T.MeshBasicMaterial({ color: 0xff7a22, transparent: true });
    const chan = onGlow(new T.Mesh(new T.PlaneGeometry(0.14, 1), chanMat)); scene.add(chan);
    const blobs = [];
    if (phase === 'rise' || phase === 'row') {
      for (let k = 0; k < 7; k++) { const s = glowSprite(0xffa040, 0.32, 1); scene.add(s); blobs.push({ s, ph: k / 7 }); }
    }

    const cones = [];
    if (phase === 'rise') cones.push({ z: 0.45, v: cone(scene, { h: 1.05, r: 0.55, active: true, seed: 4 }) });
    if (phase === 'row') [-1.05, -0.35, 0.35, 1.05].forEach((z, i) => cones.push({ z, v: cone(scene, { h: 0.95 + 0.12 * (i % 2), r: 0.42, snow: i % 2 === 0, active: true, seed: 7 + i }) }));

    if (phase === 'plates') {
      st.label({ text: 'Océano Pacífico', p: [-1.9, Y_SURF, BZ], t0: 0.2, color: COL.blue, size: 36, dy: 60 });
      st.label({ text: 'placa de Nazca', p: [-1.9, Y0 - TH / 2, BZ], t0: 0.5, color: COL.white, size: 42, dy: -150 });
      st.label({ text: 'placa Sudamericana', p: [2.0, -1.2, BZ], t0: (d) => d * 0.5, color: COL.gold, size: 42, dy: 190 });
    }
    if (phase === 'push') st.label({ text: 'subducción', p: [1.3, slabTop(1.3) - TH / 2, BZ], t0: (d) => d * 0.35, color: COL.gold, size: 44, dy: -170 });
    if (phase === 'melt') {
      st.label({ text: 'agua', p: [1.0, slabTop(1.0) + 0.15, BZ], t0: 0.3, t1: (d) => d * 0.5, color: COL.blue, size: 42, dy: -150 });
      st.label({ text: 'magma', p: [1.3, slabTop(1.3) + 0.55, BZ], t0: (d) => d * 0.5, color: COL.orange, size: 44, dy: -170 });
      st.label({ text: '≈ 100 km de profundidad', screen: [540, 1005], t0: (d) => d * 0.2, color: COL.white, size: 44 });
    }
    if (phase === 'rise') st.label({ text: 'volcán', p: () => cones[0].v.top(), t0: (d) => d * 0.6, color: COL.orange, size: 46 });
    if (phase === 'row') st.label({ text: 'volcanes en fila', p: () => cones[0].v.top(), t0: (d) => d * 0.55, color: COL.orange, size: 46, dy: 130 });

    return (lt, dur) => {
      mantleMat.uniforms.uTime.value = lt;
      for (let i = 0; i < sPos.count; i++) {
        const x = sBase[i * 3], z = sBase[i * 3 + 2];
        sPos.array[i * 3 + 1] = 0.04 * Math.sin(x * 2.2 + lt * 1.5) + 0.03 * Math.sin(z * 3 - lt * 1.1);
      }
      sPos.needsUpdate = true;
      const speed = phase === 'push' ? 0.5 : phase === 'plates' ? 0 : 0.18;
      rt1.offset.x = -lt * speed * rt1.repeat.x;

      if (phase === 'plates') {
        const a = Math.sin(clamp(prog(lt, 0.5, dur * 0.4)) * PI), b = Math.sin(clamp(prog(lt, dur * 0.5, dur * 0.45)) * PI);
        slabMat.emissive.setRGB(0.18 * a, 0.18 * a, 0.22 * a); contMat.emissive.setRGB(0.22 * b, 0.16 * b, 0.05 * b);
      }
      const L = BX * 2 + (BX - XT) * (Math.hypot(1, S) - 1);
      chev.forEach((m, k) => {
        const d = (lt * (speed * 1.6 + 0.25) + (k / chev.length) * L) % L;
        let x = -BX + d, y, rot = 0;
        if (x > XT) { const along = x - XT; x = XT + along / Math.hypot(1, S); y = slabTop(x) - TH / 2; rot = SLOPE; } else y = Y0 - TH / 2;
        m.position.set(x, y, BZ + 0.02); m.rotation.z = rot;
        m.material.opacity = Math.sin(clamp(d / L) * PI);
        m.visible = x < BX - 0.05;
      });

      const meltOn = phase === 'melt' ? smooth(prog(lt, 0.2, dur * 0.3)) : 1;
      drops.forEach((o) => {
        const f = (lt * o.sp + o.ph) % 1;
        const y0 = slabTop(o.x) + 0.08;
        o.s.position.set(o.x - f * 0.25, y0 + f * 0.75, BZ + 0.06);
        const turn = phase === 'melt' ? smooth(prog(lt, dur * 0.4, dur * 0.3)) : 1;
        o.s.material.color.copy(blue).lerp(orange, clamp(f * 1.6) * turn);
        o.s.scale.setScalar((0.12 + f * 0.22 * turn) * meltOn);
        o.s.material.opacity = Math.sin(f * PI) * meltOn;
        o.s.visible = meltOn > 0.01;
      });

      const yBot = slabTop(VX) + 0.6, yTop = surfY(VX) - 0.05;
      let chanP = 0;
      if (phase === 'rise') chanP = smooth(prog(lt, 0.2, dur * 0.4));
      if (phase === 'row') chanP = 1;
      chan.visible = chanP > 0.01;
      chan.scale.y = Math.max(0.001, (yTop - yBot) * chanP);
      chan.position.set(VX, yBot + (yTop - yBot) * chanP / 2, BZ + 0.03);
      blobs.forEach((o) => {
        const f = (lt * 0.45 + o.ph) % 1;
        const y = yBot + (yTop - yBot) * f;
        o.s.position.set(VX + Math.sin(f * 9 + o.ph * 7) * 0.06, y, BZ + 0.07);
        o.s.visible = y < yBot + (yTop - yBot) * chanP;
        o.s.material.opacity = 0.9;
      });
      cones.forEach((o, i) => {
        let s = 1;
        if (phase === 'rise') s = outBack(prog(lt, dur * 0.4, dur * 0.35));
        if (phase === 'row') s = outBack(prog(lt, 0.15 + i * dur * 0.13, 0.5));
        o.v.set(VX, surfY(VX) - 0.08, o.z, Math.max(0, s), lt, 1);
      });

      const k = smooth(clamp(lt / dur));
      if (phase === 'row') {
        const a = lerp(0.0, 0.62, k), R = lerp(16.5, 16, k);
        camera.position.set(Math.sin(a) * R, lerp(2.0, 7.5, k), Math.cos(a) * R);
        camera.lookAt(0.3, lerp(-1.3, -1.0, k), 0);
      } else {
        const a = lerp(-0.22, 0.12, k), R = 16.5;
        camera.position.set(Math.sin(a) * R, 1.8 + 0.4 * k, Math.cos(a) * R);
        camera.lookAt(0.1, -1.35, 0);
      }
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ globo: Chimborazo vs. Everest
  function globeScene(canvas) {
    const st = stage(canvas, { fog: null, focus: 0.37, hemi: 0.9 });
    const { scene, camera } = st;
    const A = 2.4, B = A * 0.8;  // achatamiento muy exagerado para que se vea
    const geo = new T.IcosahedronGeometry(1, 5).toNonIndexed();
    const p = geo.attributes.position; const cols = new Float32Array(p.count * 3); const c = new T.Color();
    for (let f = 0; f < p.count; f += 3) {
      const x = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3, y = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3,
        z = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
      const n = noise2(Math.atan2(z, x) * 2.2 + 4, y * 2.6 + 1) * 0.7 + noise2(x * 4, z * 4 + y * 3) * 0.3;
      if (Math.abs(y) > 0.9) c.set(0xe8eef6); else if (n > 0.56) c.set(n > 0.66 ? 0x8a7a50 : 0x3f9a4a); else c.set(0x1d5fae);
      for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const earth = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85,
      transparent: true, opacity: 0.55, depthWrite: false }));
    earth.scale.set(A, B, A); scene.add(earth);
    const core = glowSprite(0xffe2a0, 0.6, 1); scene.add(core);

    // Punto de la superficie (elipse) a una latitud geocéntrica, sobre el plano x-y, y su normal.
    const surfAt = (latDeg, side) => {
      const t = latDeg * PI / 180;
      const rr = (A * B) / Math.hypot(B * Math.cos(t), A * Math.sin(t));
      const pt = new T.Vector3(side * rr * Math.cos(t), rr * Math.sin(t), 0);
      const nrm = new T.Vector3(pt.x / (A * A), pt.y / (B * B), 0).normalize();
      return { pt, nrm };
    };
    const mountain = (at, h, snow, seed) => {
      const v = cone(scene, { h, r: 0.32, snow, seed });
      v.grp.position.copy(at.pt); v.grp.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), at.nrm);
      return at.pt.clone().addScaledVector(at.nrm, h * 0.95);
    };
    const chimboTop = mountain(surfAt(-1.5, 1), 0.36, true, 3);
    const everTop = mountain(surfAt(28, -1), 0.42, true, 5);
    const ray = (to, color) => {
      const m = onGlow(new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1, 8), new T.MeshBasicMaterial({ color })));
      scene.add(m);
      const dir = to.clone().normalize(), len = to.length();
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      return (pp) => { m.visible = pp > 0.01; m.scale.y = Math.max(0.001, len * pp); m.position.copy(dir).multiplyScalar(len * pp / 2); };
    };
    const rayE = ray(everTop, 0xffffff), rayC = ray(chimboTop, 0xffc94a);
    const ring = onGlow(new T.Mesh(new T.TorusGeometry(chimboTop.length(), 0.018, 6, 160),
      new T.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: 0.85 })));
    scene.add(ring);

    st.label({ text: 'Everest\n6.382 km del centro', p: [everTop.x, everTop.y, 0], t0: 0.4, color: COL.white, size: 36, dy: 120 });
    st.label({ text: 'Chimborazo\n6.384 km del centro', p: [chimboTop.x, chimboTop.y, 0], t0: (d) => d * 0.38, color: COL.gold, size: 36, dy: -230 });
    st.label({ text: 'escala exagerada', screen: [540, 1010], t0: 0.6, color: COL.white, size: 30 });

    return (lt, dur) => {
      rayE(smooth(prog(lt, 0.3, dur * 0.25)));
      rayC(smooth(prog(lt, dur * 0.38, dur * 0.25)));
      const rp = smooth(prog(lt, dur * 0.62, dur * 0.25));
      ring.visible = rp > 0.01; ring.material.opacity = 0.85 * rp; ring.rotation.z = (1 - rp) * 0.6;
      core.material.opacity = 0.8 + 0.2 * Math.sin(lt * 3);
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(0.4, -0.2, k), lerp(0.6, 0.3, k), lerp(12.5, 11.8, k));
      camera.lookAt(0, 0.1, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'avenue', 'rise', 'cotopaxi', 'final', 'outro'].forEach((v) => reg(`and_${v}`, (c) => andesScene(c, v)));
  ['plates', 'push', 'melt', 'rise', 'row'].forEach((p) => reg(`sub_${p}`, (c) => subductionScene(c, p)));
  reg('and_globe', (c) => globeScene(c));
})();
