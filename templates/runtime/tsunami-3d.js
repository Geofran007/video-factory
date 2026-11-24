// Escenas 3D "¿Cómo se forma un tsunami?" (tsu_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow, tr } = K;

  K.addEN({
    'terremoto bajo el mar': 'undersea earthquake', 'el fondo se levanta': 'the seafloor lifts', 'toda el agua sube': 'all the water rises',
    '≈ 800 km/h': '≈ 800 km/h', 'en alta mar: ~1 m': 'in open ocean: ~1 m', 'se frena y crece': 'it slows and grows',
    'aguas profundas': 'deep water', 'costa': 'coast', '¡sube a un lugar alto!': 'get to high ground!', 'el mar se retira': 'the sea pulls back',
    'Chile 1960': 'Chile 1960', 'Japón': 'Japan', '≈ 22 horas después': '≈ 22 hours later', 'océano Pacífico': 'Pacific Ocean',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  // Mar con olas pequeñas + una onda configurable (frente recto o anillos).
  function sea(scene, { size = 80, seg = 120, color = 0x1f5f9a } = {}) {
    const geo = new T.PlaneGeometry(size, size, seg, seg); geo.rotateX(-PI / 2);
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, flatShading: true, emissive: 0x04142e });
    const m = new T.Mesh(geo, mat); scene.add(m);
    const p = geo.attributes.position; const base = Float32Array.from(p.array);
    const cols = new Float32Array(p.count * 3); geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    const deep = new T.Color(color), foam = new T.Color(0xeaf6ff), c = new T.Color();
    return (lt, wave) => {
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2];
        let y = 0.06 * Math.sin(x * 0.9 + lt * 1.3) + 0.05 * Math.sin(z * 1.2 - lt);
        if (wave) y += wave(x, z);
        p.array[i * 3 + 1] = y;
        c.copy(deep).lerp(foam, clamp((y - 0.35) / 1.6)); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
      }
      p.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
    };
  }

  function town(scene, z0, seed = 2) {
    const r = rng(seed);
    const sand = new T.Mesh(new T.BoxGeometry(80, 0.6, 14), new T.MeshStandardMaterial({ color: 0xd8c48e, flatShading: true }));
    sand.position.set(0, 0.0, z0 + 7); scene.add(sand);
    for (let i = 0; i < 22; i++) {
      const h = 0.6 + r() * 1.4; const b = new T.Mesh(new T.BoxGeometry(0.9 + r() * 0.6, h, 0.9), new T.MeshStandardMaterial({ color: [0xf2e6d0, 0xd8a07a, 0xa8c0d8][i % 3], flatShading: true }));
      b.position.set((r() - 0.5) * 30, 0.3 + h / 2, z0 + 3 + r() * 6); scene.add(b);
    }
    for (let i = 0; i < 14; i++) {
      const t = new T.Group(); const trunk = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 1.6, 6), new T.MeshStandardMaterial({ color: 0x7a5a3a }));
      trunk.position.y = 0.8; const top = new T.Mesh(new T.IcosahedronGeometry(0.5, 0), new T.MeshStandardMaterial({ color: 0x2f8a3c, flatShading: true })); top.position.y = 1.7; t.add(trunk, top);
      t.position.set((r() - 0.5) * 30, 0.3, z0 + 1 + r() * 2); scene.add(t);
    }
  }

  function coastScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x2a5a8a, fog: [0x7ea8d0, 20, 70], stars: false, focus: 0.36, hemi: 0.9, moon: 1.0 });
    const { scene, camera } = st;
    const upd = sea(scene);
    town(scene, 6);
    let bed = null;
    if (variant === 'retreat') {
      bed = new T.Mesh(new T.PlaneGeometry(60, 12), new T.MeshStandardMaterial({ color: 0x8a7a58, flatShading: true }));
      bed.rotation.x = -PI / 2; bed.position.set(0, 0.04, 0); scene.add(bed);
      st.label({ text: 'el mar se retira', p: [0, 0.2, -2], t0: (d) => d * 0.2, color: COL.white, size: 42 });
      st.label({ text: '¡sube a un lugar alto!', screen: [540, 1000], t0: (d) => d * 0.5, color: '#ff8a7a', size: 50 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      if (variant === 'retreat') {
        const back = smooth(prog(lt, 0.2, dur * 0.6)) * 10;
        upd(lt, (x, z) => (z > 6 - back ? -3 : 0) - smooth(clamp((z - (6 - back - 4)) / 4)) * 0.8);
        bed.position.z = 6 - back / 2; bed.scale.y = Math.max(0.01, back / 12);
        camera.position.set(lerp(-3, -1, k), 9, 24); camera.lookAt(0, 0, -2);
      } else {
        const zc = variant === 'hook' ? lerp(-30, 2, smooth(prog(lt, 0, dur * 0.95))) : lerp(-20, -6, k);
        const A = variant === 'hook' ? lerp(1.2, 4.5, smooth(prog(lt, 0, dur))) : 2.5;
        upd(lt, (x, z) => A * Math.exp(-(((z - zc) / 2.6) ** 2)) * (z < zc ? 1 : 1.0) - 0.4 * Math.exp(-(((z - zc - 4) / 3) ** 2)));
        camera.position.set(lerp(-4, -2, k), 8, 23); camera.lookAt(0, 1.2, -8);
      }
      st.draw(lt, dur);
    };
  }

  // Bloque en corte: el fondo del mar se levanta de golpe y empuja toda la columna de agua.
  function sectionScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, focus: 0.38, hemi: 0.9 });
    const { scene, camera } = st;
    const BX = 3.2, BZ = 1.2, YS = 0.8, YB = -1.4;
    const rock = new T.MeshStandardMaterial({ color: 0x7a6a58, flatShading: true });
    const left = new T.Mesh(new T.BoxGeometry(BX, 2.2, BZ * 2), rock); left.position.set(-BX / 2, YB - 1.1, 0); scene.add(left);
    const right = new T.Mesh(new T.BoxGeometry(BX, 2.2, BZ * 2), new T.MeshStandardMaterial({ color: 0x8a7a64, flatShading: true })); right.position.set(BX / 2, YB - 1.1, 0); scene.add(right);
    const water = new T.Mesh(new T.BoxGeometry(BX * 2, YS - YB, BZ * 2), new T.MeshStandardMaterial({ color: 0x3a8ee0, transparent: true, opacity: 0.35, depthWrite: false }));
    water.position.y = (YS + YB) / 2; scene.add(water);
    const sg = new T.PlaneGeometry(BX * 2, BZ * 2, 60, 10); sg.rotateX(-PI / 2);
    const surf = new T.Mesh(sg, new T.MeshStandardMaterial({ color: 0x4a9be0, transparent: true, opacity: 0.7, flatShading: true, side: T.DoubleSide }));
    surf.position.y = YS; scene.add(surf);
    const sp = sg.attributes.position; const sb = Float32Array.from(sp.array);
    const shock = glowSprite(0xffc94a, 2.2, 0); shock.position.set(0, YB - 0.4, BZ); scene.add(shock);
    const arrows = [];
    for (let i = 0; i < 3; i++) { const a = new T.ArrowHelper(new T.Vector3(0, 1, 0), new T.Vector3(BX / 2 - 1 + i, YB + 0.2, BZ + 0.05), 0.9, 0xffc94a, 0.3, 0.2); onGlow(a); scene.add(a); arrows.push(a); }
    if (variant === 'quake') {
      st.label({ text: 'terremoto bajo el mar', p: [0, YB - 0.4, BZ], t0: (d) => d * 0.3, color: COL.gold, size: 40, dy: -160 });
      st.label({ text: 'el fondo se levanta', p: [BX / 2, YB, BZ], t0: (d) => d * 0.55, color: COL.white, size: 38, dy: 140, dx: 60 });
    } else st.label({ text: 'toda el agua sube', p: [BX / 2, YS + 0.5, BZ], t0: (d) => d * 0.4, color: COL.blue, size: 42 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const hit = variant === 'quake' ? dur * 0.45 : 0.2;
      const up = smooth(prog(lt, hit, 0.6)) * 0.45;
      right.position.y = YB - 1.1 + up;
      shock.material.opacity = Math.max(0, 1 - Math.abs(lt - hit - 0.2) * 2);
      arrows.forEach((a) => { a.visible = lt > hit && lt < hit + 1.5; });
      const bump = variant === 'quake' ? up : 0.45 + 0.1 * Math.sin(lt * 2);
      const spread = variant === 'lift' ? smooth(prog(lt, dur * 0.4, dur * 0.5)) * 2.4 : 0;
      for (let i = 0; i < sp.count; i++) {
        const x = sb[i * 3];
        const center = bump * Math.exp(-(((x - BX / 2) / 1.3) ** 2));
        const out = spread > 0 ? bump * 0.8 * (Math.exp(-(((x - BX / 2 - spread) / 0.6) ** 2)) + Math.exp(-(((x - BX / 2 + spread) / 0.6) ** 2))) : 0;
        sp.array[i * 3 + 1] = (spread > 0 ? center * (1 - spread / 2.4) + out : center) + 0.03 * Math.sin(x * 4 + lt * 2);
      }
      sp.needsUpdate = true;
      const a = lerp(-0.25, 0.15, k);
      camera.position.set(Math.sin(a) * 11, 1.2, Math.cos(a) * 11); camera.lookAt(0, -0.6, 0);
      st.draw(lt, dur);
    };
  }

  // Vista desde arriba del océano: anillos que se expanden (y un avión al mismo ritmo).
  function openSea(canvas, variant) {
    const st = stage(canvas, { bg: 0x0b1628, fog: [0x0b1628, 30, 80], focus: 0.37, hemi: 0.9 });
    const { scene, camera } = st;
    const upd = sea(scene, { size: 90, seg: 140 });
    let boat = null, plane = null;
    if (variant === 'small') {
      boat = new T.Group();
      const hull = new T.Mesh(new T.BoxGeometry(1.2, 0.3, 0.5), new T.MeshStandardMaterial({ color: 0xd84a3a })); const cab = new T.Mesh(new T.BoxGeometry(0.4, 0.3, 0.35), new T.MeshStandardMaterial({ color: 0xffffff }));
      cab.position.set(-0.1, 0.3, 0); boat.add(hull, cab); scene.add(boat);
      st.label({ text: 'en alta mar: ~1 m', p: () => boat.position.toArray(), t0: (d) => d * 0.3, color: COL.white, size: 42 });
    }
    if (variant === 'speed') {
      plane = new T.Group();
      const b = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 1.8, 10), new T.MeshStandardMaterial({ color: 0xffffff })); b.rotation.x = PI / 2;
      const w = new T.Mesh(new T.BoxGeometry(2, 0.04, 0.4), new T.MeshStandardMaterial({ color: 0xffffff })); plane.add(b, w); scene.add(plane);
      st.label({ text: '≈ 800 km/h', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 60 });
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const R = lerp(2, 24, (lt / dur));
      const amp = variant === 'small' ? 0.5 : 1.2;
      upd(lt, (x, z) => { const d = Math.hypot(x, z + 8); return amp * Math.exp(-(((d - R) / 1.4) ** 2)) + 0.6 * amp * Math.exp(-(((d - R + 6) / 1.4) ** 2)); });
      if (boat) { const z = 2; const d = Math.hypot(0, z + 8); const y = amp * Math.exp(-(((d - R) / 1.4) ** 2)) + 0.6 * amp * Math.exp(-(((d - R + 6) / 1.4) ** 2)); boat.position.set(0, y + 0.15, z); }
      if (plane) { plane.position.set(0, 3, -8 + R); }
      if (variant === 'small') { camera.position.set(-4, 2, 10); camera.lookAt(0, 0.5, 0); }
      else { camera.position.set(0, lerp(22, 26, k), lerp(16, 20, k)); camera.lookAt(0, 0, -4); }
      st.draw(lt, dur);
    };
  }

  // Perfil: la ola llega a aguas poco profundas, se frena y se hace alta.
  function growScene(canvas) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, focus: 0.38, hemi: 0.9 });
    const { scene, camera } = st;
    const depth = (x) => lerp(-3, 0.2, smooth(clamp((x + 1) / 6)));
    const shp = new T.Shape(); shp.moveTo(-7, -3.5); for (let x = -7; x <= 6.01; x += 0.2) shp.lineTo(x, depth(x)); shp.lineTo(6, -3.5);
    const bed = new T.Mesh(new T.ExtrudeGeometry(shp, { depth: 1.2, bevelEnabled: false }), new T.MeshStandardMaterial({ color: 0x8a7a58, flatShading: true }));
    bed.position.z = -0.6; scene.add(bed);
    const N = 160; const pts = Array.from({ length: N + 1 }, (_, i) => new T.Vector3(-7 + i * 13 / N, 0, 0.62));
    const fillGeo = new T.BufferGeometry(); const pos = new Float32Array((N + 1) * 2 * 3); fillGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const idx = []; for (let i = 0; i < N; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); } fillGeo.setIndex(idx);
    const fill = new T.Mesh(fillGeo, new T.MeshStandardMaterial({ color: 0x2f7fd0, transparent: true, opacity: 0.8, side: T.DoubleSide })); scene.add(fill);
    st.label({ text: 'aguas profundas', p: [-5, -2, 0.6], t0: 0.3, color: COL.blue, size: 36, dy: -120 });
    st.label({ text: 'costa', p: [5, 0.3, 0.6], t0: 0.3, color: COL.white, size: 36 });
    st.label({ text: 'se frena y crece', p: () => [peakX, peakY, 0.6], t0: (d) => d * 0.5, color: COL.gold, size: 42 });
    let peakX = 0, peakY = 0;
    return (lt, dur) => {
      const f = smooth(clamp(lt / dur));
      const xc = lerp(-6, 3.5, f);
      const shallow = clamp(-depth(xc) / 3);
      const A = 0.25 / Math.sqrt(Math.max(0.08, shallow)) * 0.6, w = 0.6 + shallow * 1.6;
      peakX = xc; peakY = A;
      for (let i = 0; i <= N; i++) {
        const x = -7 + i * 13 / N; const top = A * Math.exp(-(((x - xc) / w) ** 2)) + 0.03 * Math.sin(x * 5 + lt * 3);
        const bot = depth(x);
        pos.set([x, Math.max(top, bot), 0.62], i * 6); pos.set([x, bot, 0.62], i * 6 + 3);
      }
      fillGeo.attributes.position.needsUpdate = true; fillGeo.computeVertexNormals();
      camera.position.set(0, 0.6, 11); camera.lookAt(0, -0.6, 0);
      st.draw(lt, dur);
    };
  }

  // Mapa esquemático del Pacífico: de Chile a Japón.
  function pacificScene(canvas) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, focus: 0.37, hemi: 0.9 });
    const { scene, camera } = st;
    const ocean = new T.Mesh(new T.PlaneGeometry(20, 26), new T.MeshStandardMaterial({ color: 0x174e8a })); ocean.rotation.x = -PI / 2; scene.add(ocean);
    const land = new T.MeshStandardMaterial({ color: 0x4a9a50, flatShading: true });
    const chile = new T.Mesh(new T.BoxGeometry(1.2, 0.3, 9), land); chile.position.set(7, 0.15, 6); chile.rotation.y = 0.12; scene.add(chile);
    const japan = new T.Mesh(new T.BoxGeometry(0.8, 0.3, 4), land); japan.position.set(-7.5, 0.15, -9); japan.rotation.y = -0.6; scene.add(japan);
    const epi = new T.Vector3(6.2, 0.2, 7);
    const rings = [];
    for (let i = 0; i < 5; i++) { const m = onGlow(new T.Mesh(new T.TorusGeometry(1, 0.06, 6, 120), new T.MeshBasicMaterial({ color: 0xffc94a, transparent: true }))); m.rotation.x = PI / 2; m.position.copy(epi); scene.add(m); rings.push({ m, ph: i / 5 }); }
    const dist = epi.distanceTo(new T.Vector3(-7.5, 0.2, -9));
    st.label({ text: 'Chile 1960', p: epi.toArray(), t0: 0.3, color: '#ff8a7a', size: 38 });
    st.label({ text: 'Japón', p: [-7.5, 0.3, -9], t0: 0.3, color: COL.white, size: 38 });
    st.label({ text: '≈ 22 horas después', screen: [540, 1000], t0: (d) => d * 0.6, color: COL.gold, size: 52 });
    st.label({ text: 'océano Pacífico', p: [0, 0, 0], t0: 0.5, t1: (d) => d * 0.5, color: COL.blue, size: 36, dy: 0 });
    return (lt, dur) => {
      const f = clamp(lt / (dur * 0.85));
      rings.forEach((o) => { const r = Math.max(0.01, f * dist - o.ph * 3); o.m.scale.setScalar(r); o.m.visible = r > 0.05; o.m.material.opacity = 0.9 * (1 - o.ph * 0.6); });
      camera.position.set(0, 26, 10); camera.lookAt(0, 0, -1);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  reg('tsu_hook', (c) => coastScene(c, 'hook'));
  reg('tsu_retreat', (c) => coastScene(c, 'retreat'));
  reg('tsu_outro', (c) => coastScene(c, 'outro'));
  ['quake', 'lift'].forEach((v) => reg(`tsu_${v}`, (c) => sectionScene(c, v)));
  ['spread', 'speed', 'small'].forEach((v) => reg(`tsu_${v}`, (c) => openSea(c, v)));
  reg('tsu_grow', (c) => growScene(c));
  reg('tsu_pacific', (c) => pacificScene(c));
})();
