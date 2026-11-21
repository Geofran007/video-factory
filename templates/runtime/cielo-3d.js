// Escenas 3D "¿Por qué el cielo es azul?" (cielo_*). Diseño propio con Three.js r149, usando el kit de galapagos-3d.js.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow } = K;

  K.addEN({
    'luz blanca': 'white light', 'todos los colores': 'every color', 'moléculas de aire': 'air molecules',
    'nitrógeno': 'nitrogen', 'oxígeno': 'oxygen', 'rojo: sigue de largo': 'red: goes straight through',
    'azul: rebota': 'blue: bounces around', 'luz azul desde\ntodo el cielo': 'blue light from\nthe whole sky',
    'cuánto se desvía': 'how much it scatters', 'violeta: aún más': 'violet: even more',
    'el ojo ve mejor el azul': 'our eyes favor blue', 'mediodía: camino corto': 'noon: short path',
    'atardecer: camino largo': 'sunset: long path', 'atmósfera': 'atmosphere', 'sin atmósfera': 'no atmosphere',
    'cielo negro de día': 'black sky by day', 'Tierra': 'Earth',
  });

  const fade = (st) => {
    st.overlay = (ctx, lt, dur) => {
      const a = smooth(prog(lt, dur * 0.5, dur * 0.45));
      ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    };
  };

  // Rayo: caja delgada que crece desde 'from' en dirección 'dir'.
  function beam(scene, from, dir, len, color, w = 0.07, opacity = 1) {
    const g = new T.Group(); g.position.set(...from);
    const d = new T.Vector3(...dir).normalize();
    g.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), d);
    const m = new T.Mesh(new T.BoxGeometry(1, w, w), new T.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }));
    g.add(m); onGlow(g); scene.add(g);
    return {
      set(p) { g.visible = p > 0.005; const L = Math.max(0.001, len * p); m.scale.x = L; m.position.x = L / 2; },
      at: (p) => new T.Vector3(...from).addScaledVector(d, len * p).toArray(),
    };
  }

  // Arcoíris: 7 medias coronas de color (rojo afuera; reverse = segundo arco con colores invertidos).
  const BOW = [0xff3b30, 0xff9500, 0xffd60a, 0x34c759, 0x0a84ff, 0x5e5ce6, 0x8e5cf7];
  function rainbowArcs(scene, center, R, reverse, opacity, full = false) {
    const cols = reverse ? BOW.slice().reverse() : BOW; const w = R * 0.018; const ms = [];
    cols.forEach((c, i) => {
      const m = new T.Mesh(new T.RingGeometry(R - (i + 1) * w, R - i * w, 128, 1, 0, full ? PI * 2 : PI),
        new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, fog: false, side: T.DoubleSide }));
      m.position.set(...center); scene.add(m); ms.push(m);
    });
    return (p) => ms.forEach((m) => { m.material.opacity = opacity * p; m.visible = p > 0.01; });
  }

  // ------------------------------------------------------------------ paisaje de día (gancho y cierre)
  function landscape(canvas, variant) {
    const st = stage(canvas, { bg: 0x4f9be8, fog: [0x9fd0f5, 20, 70], stars: false, hemi: 1.0, moon: 1.2, focus: 0.36 });
    const { scene, camera } = st;
    const skyGeo = new T.SphereGeometry(80, 32, 16);
    const sp = skyGeo.attributes.position; const sc = new Float32Array(sp.count * 3);
    skyGeo.setAttribute('color', new T.BufferAttribute(sc, 3));
    const sky = new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false }));
    scene.add(sky);
    const day = [new T.Color(0xcfe9ff), new T.Color(0x2a6fd6)], dusk = [new T.Color(0xff9a4a), new T.Color(0x2c2460)];
    const c0 = new T.Color(), c1 = new T.Color(), c = new T.Color();
    const paintSky = (t) => {
      c0.copy(day[0]).lerp(dusk[0], t); c1.copy(day[1]).lerp(dusk[1], t);
      for (let i = 0; i < sp.count; i++) {
        const h = clamp(sp.getY(i) / 80 * 1.6);
        c.copy(c0).lerp(c1, Math.pow(h, 0.7)); sc.set([c.r, c.g, c.b], i * 3);
      }
      skyGeo.attributes.color.needsUpdate = true;
      scene.background.copy(c0); if (scene.fog) scene.fog.color.copy(c0);
    };
    paintSky(0);
    const geo = new T.PlaneGeometry(80, 80, 80, 80); geo.rotateX(-PI / 2);
    const gp = geo.attributes.position; const gc = new Float32Array(gp.count * 3);
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i), z = gp.getZ(i);
      const h = (noise2(x * 0.15, z * 0.15) - 0.4) * 2.2 + Math.max(0, -z - 15) * 0.15;
      gp.setY(i, Math.max(-0.2, h));
      c.set(0x4c9a44).lerp(new T.Color(0x2f7a36), noise2(x * 0.6, z * 0.6)); gc.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(gc, 3));
    scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })));
    const r = rng(4);
    for (let k = 0; k < 18; k++) {
      const x = (r() - 0.5) * 30, z = -2 - r() * 25;
      const h = (noise2(x * 0.15, z * 0.15) - 0.4) * 2.2;
      const t = new T.Group();
      const trunk = new T.Mesh(new T.CylinderGeometry(0.08, 0.1, 0.6, 6), new T.MeshStandardMaterial({ color: 0x6b4a2c, flatShading: true }));
      const top = new T.Mesh(new T.ConeGeometry(0.5, 1.4, 7), new T.MeshStandardMaterial({ color: 0x2f6b34, flatShading: true }));
      trunk.position.y = 0.3; top.position.y = 1.2; t.add(trunk, top); t.position.set(x, Math.max(-0.2, h), z);
      t.scale.setScalar(0.8 + r() * 0.8); scene.add(t);
    }
    const clouds = [];
    for (let k = 0; k < 6; k++) {
      const g = new T.Group();
      for (let j = 0; j < 4; j++) {
        const b = new T.Mesh(new T.IcosahedronGeometry(0.9 + r() * 0.6, 1), new T.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1 }));
        b.position.set(j * 1.1 - 1.6, r() * 0.4, r() * 0.6); b.scale.y = 0.6; g.add(b);
      }
      g.position.set((r() - 0.5) * 34, 9 + r() * 5, -20 - r() * 15); scene.add(g); clouds.push({ g, x: g.position.x, s: 0.2 + r() * 0.2 });
    }
    const sun = glowSprite(0xfff2c0, 9, 1); sun.position.set(9, 14, -40); scene.add(sun);
    if (variant === 'outro' || variant === 'arco_outro') fade(st);
    // Arcoíris (detrás del observador está el Sol, así que lo ocultamos en estas escenas)
    let bows = [];
    if (variant.startsWith('arco')) {
      sun.visible = false;
      bows.push(rainbowArcs(scene, [0, -2, -34], 15, false, 0.6));
      if (variant === 'arco_double') {
        bows.push(rainbowArcs(scene, [0, -2, -34], 18.2, true, 0.32));
        const band = new T.Mesh(new T.RingGeometry(15.6, 17.6, 96, 1, 0, PI), new T.MeshBasicMaterial({ color: 0x1a2a4a, transparent: true, opacity: 0.18, depthWrite: false, fog: false }));
        band.position.set(0, -2, -34.1); scene.add(band);
        st.label({ text: 'colores al revés', p: [-12.6, 9.6, -34], t0: (d) => d * 0.4, color: COL.white, size: 42, dy: 0, dx: 120 });
      }
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      bows.forEach((b, i) => b(smooth(prog(lt, 0.2 + i * dur * 0.3, dur * 0.4))));
      if (variant === 'outro') { paintSky(smooth(prog(lt, 0, dur * 0.6))); sun.position.set(9, lerp(14, 2, k), -40); sun.material.color.set(0xff9a4a); }
      clouds.forEach((o) => { o.g.position.x = o.x + lt * o.s; });
      camera.position.set(0, 1.8, lerp(8, 6.5, k)); camera.lookAt(0, lerp(4.5, 5.2, k), -10);
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ prisma
  const SPECTRUM = [0xff3b30, 0xff9500, 0xffd60a, 0x34c759, 0x0a84ff, 0x8e5cf7];

  function prismScene(canvas) {
    const st = stage(canvas, { fog: null, focus: 0.37 });
    const { scene, camera } = st;
    const prism = new T.Mesh(new T.CylinderGeometry(1.0, 1.0, 1.4, 3), new T.MeshStandardMaterial({ color: 0xcfe8ff,
      transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }));
    prism.rotation.x = PI / 2; prism.rotation.y = PI / 2;
    const edges = new T.LineSegments(new T.EdgesGeometry(prism.geometry), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    prism.add(edges); scene.add(prism);
    const inB = beam(scene, [-5, -0.9, 0], [4.4, 0.75, 0], 4.5, 0xffffff, 0.12);
    const out = SPECTRUM.map((col, i) => beam(scene, [0.55, -0.05, 0], [Math.cos(-0.12 - i * 0.075), Math.sin(-0.12 - i * 0.075), 0], 4.6, col, 0.09));
    st.label({ text: 'luz blanca', p: () => inB.at(0.45), t0: 0.4, color: COL.white, size: 42, dy: 120 });
    st.label({ text: 'todos los colores', p: () => out[3].at(0.8), t0: (d) => d * 0.55, color: COL.gold, size: 42, dy: -160 });
    return (lt, dur) => {
      const a = smooth(prog(lt, 0.1, dur * 0.35)), b = smooth(prog(lt, dur * 0.4, dur * 0.35));
      inB.set(a); out.forEach((o) => o.set(b));
      prism.rotation.z = Math.sin(lt * 0.4) * 0.03;
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.8, 0.4, k), 0.6, lerp(9, 8.4, k)); camera.lookAt(0, -0.3, 0);
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ moléculas y dispersión
  function molecules(scene, n, seed, spread = [9, 9, 5]) {
    const r = rng(seed); const list = [];
    const matN = new T.MeshStandardMaterial({ color: 0x9fb6d8, roughness: 0.5 });
    const matO = new T.MeshStandardMaterial({ color: 0xe08f8f, roughness: 0.5 });
    const ball = new T.SphereGeometry(0.13, 14, 10);
    for (let k = 0; k < n; k++) {
      const g = new T.Group(); const m = k % 5 === 0 ? matO : matN;
      const a = new T.Mesh(ball, m), b = new T.Mesh(ball, m); a.position.x = -0.1; b.position.x = 0.1; g.add(a, b);
      g.position.set((r() - 0.5) * spread[0], (r() - 0.5) * spread[1], (r() - 0.5) * spread[2]);
      g.rotation.set(r() * 6, r() * 6, r() * 6); scene.add(g);
      list.push({ g, o: g.position.clone(), ph: r() * 6, sp: 0.3 + r() * 0.4, oxy: m === matO });
    }
    return {
      list,
      update(lt) { list.forEach((o) => { o.g.position.set(o.o.x + Math.sin(lt * o.sp + o.ph) * 0.12, o.o.y + Math.cos(lt * o.sp * 0.8 + o.ph) * 0.12, o.o.z); o.g.rotation.y = lt * o.sp + o.ph; }); },
    };
  }

  function moleculesScene(canvas) {
    const st = stage(canvas, { bg: 0x061a33, fog: [0x061a33, 9, 22], stars: false, focus: 0.36 });
    const { scene, camera } = st;
    const mol = molecules(scene, 90, 3, [9, 10, 6]);
    const bs = [[-5, 5, 0.5], [-5, 4.2, -0.5], [-5, 5.8, -1.2]].map((f) => beam(scene, f, [1, -0.8, 0], 9, 0xffffff, 0.06, 0.9));
    const n = mol.list.find((o) => !o.oxy && Math.abs(o.o.x) < 2 && Math.abs(o.o.y) < 2 && o.o.z > 0) || mol.list[1];
    const o = mol.list.find((q) => q.oxy && Math.abs(q.o.x) < 3 && q.o.y > 0.5 && q.o.z > -1) || mol.list[0];
    st.label({ text: 'moléculas de aire', screen: [540, 1000], t0: 0.3, color: COL.white, size: 46 });
    st.label({ text: 'nitrógeno', p: () => n.g.position.toArray(), t0: (d) => d * 0.35, color: COL.blue, size: 38 });
    st.label({ text: 'oxígeno', p: () => o.g.position.toArray(), t0: (d) => d * 0.55, color: '#ff9f9f', size: 38 });
    return (lt, dur) => {
      mol.update(lt);
      bs.forEach((b, i) => b.set(smooth(prog(lt, 0.1 + i * 0.15, dur * 0.5))));
      const k = smooth(clamp(lt / dur));
      camera.position.set(0, 0.3, lerp(10, 7.5, k)); camera.lookAt(0, 0.2, 0);
      st.draw(lt, dur);
    };
  }

  function scatterScene(canvas) {
    const st = stage(canvas, { bg: 0x061a33, fog: [0x061a33, 9, 22], stars: false, focus: 0.37 });
    const { scene, camera } = st;
    const mol = molecules(scene, 28, 9, [10, 8, 5]);
    const hit = new T.Group(); hit.position.set(0, -0.7, 0.5); scene.add(hit);
    const hm = new T.MeshStandardMaterial({ color: 0x9fb6d8, emissive: 0x1a3a6a });
    [-0.11, 0.11].forEach((x) => { const b = new T.Mesh(new T.SphereGeometry(0.16, 16, 10), hm); b.position.x = x; hit.add(b); });
    const red = beam(scene, [-5, 0.8, 0.5], [1, 0, 0], 10, 0xff3b30, 0.09);
    const blue = beam(scene, [-5, -0.7, 0.5], [1, 0, 0], 5, 0x2f8bff, 0.09);
    const r = rng(5); const sparks = [];
    for (let k = 0; k < 26; k++) {
      const s = glowSprite(0x4aa3ff, 0.32, 1); scene.add(s);
      const a = r() * PI * 2, b = (r() - 0.5) * 1.4;
      sparks.push({ s, d: new T.Vector3(Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b), Math.sin(b)), ph: r() });
    }
    st.label({ text: 'rojo: sigue de largo', p: () => red.at(0.82), t0: (d) => d * 0.2, color: '#ff8a7a', size: 40, dy: 110 });
    st.label({ text: 'azul: rebota', p: [0, -0.7, 0.5], t0: (d) => d * 0.5, color: COL.blue, size: 44, dy: -180 });
    return (lt, dur) => {
      mol.update(lt);
      red.set(smooth(prog(lt, 0.1, dur * 0.4)));
      const pb = smooth(prog(lt, dur * 0.3, dur * 0.2)); blue.set(pb);
      const on = pb > 0.98;
      sparks.forEach((o) => {
        const f = (lt * 0.7 + o.ph) % 1;
        o.s.visible = on; o.s.position.copy(hit.position).addScaledVector(o.d, 0.2 + f * 3.2);
        o.s.material.opacity = 1 - f;
      });
      hit.rotation.z = Math.sin(lt * 9) * (on ? 0.25 : 0);
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.6, 0.4, k), 0.3, lerp(9.5, 8.5, k)); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  function everywhereScene(canvas) {
    const st = stage(canvas, { bg: 0x0a2c58, fog: null, stars: false, focus: 0.38 });
    const { scene, camera } = st;
    const ground = new T.Mesh(new T.CircleGeometry(5.5, 48), new T.MeshStandardMaterial({ color: 0x3c7a3a, roughness: 1 }));
    ground.rotation.x = -PI / 2; scene.add(ground);
    const dome = new T.Mesh(new T.SphereGeometry(5, 24, 12, 0, PI * 2, 0, PI / 2),
      new T.MeshBasicMaterial({ color: 0x5aa8ff, wireframe: true, transparent: true, opacity: 0.25 }));
    scene.add(dome);
    const person = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(0.22, 0.28, 0.8, 10), new T.MeshStandardMaterial({ color: 0xffc94a }));
    const head = new T.Mesh(new T.SphereGeometry(0.22, 16, 12), new T.MeshStandardMaterial({ color: 0xf1c7a0 }));
    body.position.y = 0.4; head.position.y = 1.05; person.add(body, head); scene.add(person);
    const eye = new T.Vector3(0, 1.05, 0);
    const r = rng(12); const photons = [];
    for (let k = 0; k < 40; k++) {
      const a = r() * PI * 2, el = 0.2 + r() * 1.2;
      const from = new T.Vector3(Math.cos(a) * Math.cos(el) * 5, Math.sin(el) * 5, Math.sin(a) * Math.cos(el) * 5);
      const s = glowSprite(0x4aa3ff, 0.35, 1); scene.add(s); photons.push({ s, from, ph: r(), sp: 0.35 + r() * 0.2 });
    }
    st.label({ text: 'luz azul desde\ntodo el cielo', p: [0, 5, 0], t0: (d) => d * 0.3, color: COL.blue, size: 42, dy: 60 });
    return (lt, dur) => {
      photons.forEach((o) => {
        const f = (lt * o.sp + o.ph) % 1;
        o.s.position.copy(o.from).lerp(eye, f); o.s.material.opacity = Math.sin(f * PI) * smooth(prog(lt, 0.1, 0.6));
      });
      const k = smooth(clamp(lt / dur));
      const a = lerp(-0.3, 0.3, k);
      camera.position.set(Math.sin(a) * 12, 4.2, Math.cos(a) * 12); camera.lookAt(0, 2.0, 0);
      st.draw(lt, dur);
    };
  }

  function violetScene(canvas) {
    const st = stage(canvas, { fog: null, focus: 0.38 });
    const { scene, camera } = st;
    const lam = [400, 450, 520, 570, 600, 680];
    const cols = [0x8e5cf7, 0x2f8bff, 0x34c759, 0xffd60a, 0xff9500, 0xff3b30];
    const bars = lam.map((l, i) => {
      const h = 4.2 * Math.pow(400 / l, 4);
      const m = new T.Mesh(new T.BoxGeometry(0.7, 1, 0.7), new T.MeshStandardMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.25, flatShading: true }));
      m.position.x = (i - 2.5) * 0.95; scene.add(m);
      return { m, h };
    });
    const floor = new T.Mesh(new T.BoxGeometry(6.4, 0.08, 1.4), new T.MeshStandardMaterial({ color: 0x2a3044 }));
    floor.position.y = -0.04; scene.add(floor);
    const eye = onGlow(new T.Mesh(new T.TorusGeometry(0.75, 0.05, 8, 48), new T.MeshBasicMaterial({ color: 0xffc94a })));
    eye.position.set(bars[1].m.position.x, 0, 0.6); scene.add(eye);
    st.label({ text: 'cuánto se desvía', screen: [700, 500], t0: 0.2, color: COL.white, size: 40 });
    st.label({ text: 'violeta: aún más', p: [bars[0].m.position.x, bars[0].h, 0], t0: (d) => d * 0.25, color: '#c4a6ff', size: 40, dy: 90 });
    st.label({ text: 'el ojo ve mejor el azul', p: () => [eye.position.x, eye.position.y, 0.6], t0: (d) => d * 0.55, color: COL.gold, size: 40, dy: -140 });
    return (lt, dur) => {
      bars.forEach((b, i) => {
        const p = outBack(prog(lt, 0.15 + i * 0.12, 0.6));
        const h = Math.max(0.001, b.h * p); b.m.scale.y = h; b.m.position.y = h / 2;
      });
      const e = smooth(prog(lt, dur * 0.5, 0.5));
      eye.visible = e > 0.01; eye.scale.setScalar(Math.max(0.001, e)); eye.position.y = bars[1].h * 0.5;
      eye.rotation.z = lt;
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.8, 0.4, k), 3.4, 11.5); camera.lookAt(0, 1.6, 0);
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ atardecer: camino corto y largo
  function sunsetScene(canvas) {
    const st = stage(canvas, { fog: null, focus: 0.36 });
    const { scene, camera } = st;
    const R = 6, RA = 6.9;
    const earth = new T.Mesh(new T.SphereGeometry(R, 64, 32), new T.MeshStandardMaterial({ color: 0x2f7a46, flatShading: true, roughness: 1 }));
    earth.position.y = -R; scene.add(earth);
    const atm = new T.Mesh(new T.SphereGeometry(RA, 64, 32), new T.MeshBasicMaterial({ color: 0x3a8ee0, transparent: true, opacity: 0.18, depthWrite: false }));
    atm.position.y = -R; scene.add(atm);
    const pin = onGlow(new T.Mesh(new T.SphereGeometry(0.12, 12, 8), new T.MeshBasicMaterial({ color: 0xffffff })));
    pin.position.y = 0.12; scene.add(pin);
    const noon = beam(scene, [0, 4.2, 0], [0, -1, 0], 4.05, 0xffffff, 0.09);
    const sNoon = glowSprite(0xfff2c0, 1.6, 1); sNoon.position.set(0, 4.3, 0); scene.add(sNoon);
    const xA = Math.sqrt(RA * RA - R * R) + 0.2;
    const segs = 12; const grad = [new T.Color(0xffffff), new T.Color(0xffd27a), new T.Color(0xff8a3c), new T.Color(0xff4a2a)];
    const parts = [];
    for (let i = 0; i < segs; i++) {
      const t = i / segs; const x0 = xA + 1.6 - (xA + 1.6) * t;
      const cc = new T.Color(); const g = t * 3; const gi = Math.min(2, Math.floor(g)); cc.copy(grad[gi]).lerp(grad[gi + 1], g - gi);
      parts.push(beam(scene, [x0, 0.16, 0], [-1, 0, 0], (xA + 1.6) / segs, cc.getHex(), 0.09));
    }
    const sSet = glowSprite(0xffb060, 1.8, 1); sSet.position.set(xA + 1.7, 0.18, 0); scene.add(sSet);
    const r = rng(2); const lost = [];
    for (let k = 0; k < 14; k++) { const s = glowSprite(0x4aa3ff, 0.3, 1); scene.add(s); lost.push({ s, x: 0.8 + r() * (xA - 0.6), a: r() * PI * 2, ph: r() }); }
    st.label({ text: 'atmósfera', p: [-2.6, RA - R - 0.6, 0], t0: 0.2, color: COL.blue, size: 36, dy: 80 });
    st.label({ text: 'mediodía: camino corto', p: () => noon.at(0.7), t0: (d) => d * 0.15, color: COL.white, size: 38, dx: -120, dy: 60 });
    st.label({ text: 'atardecer: camino largo', p: () => parts[3].at(0), t0: (d) => d * 0.5, color: COL.orange, size: 38, dy: -170 });
    return (lt, dur) => {
      noon.set(smooth(prog(lt, 0.1, dur * 0.25)));
      const ps = prog(lt, dur * 0.35, dur * 0.4);
      parts.forEach((p, i) => p.set(clamp(ps * segs - i)));
      lost.forEach((o) => {
        const f = (lt * 0.6 + o.ph) % 1; const on = ps > 0.3;
        o.s.visible = on; o.s.position.set(o.x + Math.cos(o.a) * f * 1.2, 0.16 + Math.sin(o.a) * f * 1.2, Math.sin(o.a * 3) * f);
        o.s.material.opacity = 1 - f;
      });
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(1.4, 1.9, k), 1.6, lerp(10.5, 9.8, k)); camera.lookAt(lerp(1.4, 1.9, k), 0.9, 0);
      st.draw(lt, dur);
    };
  }

  function moonScene(canvas) {
    const st = stage(canvas, { bg: 0x000000, fog: null, stars: true, focus: 0.36 });
    const { scene, camera } = st;
    st.scene.children.filter((o) => o.isLight).forEach((l) => st.scene.remove(l));
    scene.add(new T.AmbientLight(0x404452, 0.4));
    const sunL = new T.DirectionalLight(0xffffff, 2.2); sunL.position.set(-8, 5, -6); scene.add(sunL);
    const geo = new T.PlaneGeometry(40, 40, 90, 90); geo.rotateX(-PI / 2);
    const p = geo.attributes.position;
    const craters = []; const r = rng(21);
    for (let k = 0; k < 18; k++) craters.push([(r() - 0.5) * 20, -r() * 20 + 4, 0.4 + r() * 1.4]);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let y = (noise2(x * 0.4, z * 0.4) - 0.5) * 0.7;
      for (const [cx, cz, cr] of craters) {
        const d = Math.hypot(x - cx, z - cz) / cr;
        if (d < 1) y -= (1 - d * d) * cr * 0.25; else if (d < 1.3) y += (1.3 - d) * cr * 0.25;
      }
      p.setY(i, y);
    }
    scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0x9a9aa2, flatShading: true, roughness: 1 })));
    const sun = glowSprite(0xffffff, 5, 1); sun.position.set(-9, 7, -25); scene.add(sun);
    const earth = new T.Mesh(new T.SphereGeometry(1.0, 24, 16), new T.MeshStandardMaterial({ color: 0x2f6fd0, roughness: 0.6, emissive: 0x0a1a40 }));
    earth.position.set(5, 9, -22); scene.add(earth);
    st.label({ text: 'sin atmósfera', screen: [540, 1000], t0: 0.3, color: COL.white, size: 46 });
    st.label({ text: 'cielo negro de día', p: [0, 9, -22], t0: (d) => d * 0.4, color: COL.gold, size: 44, dx: -200, dy: 0 });
    st.label({ text: 'Tierra', p: [5, 10.1, -22], t0: (d) => d * 0.6, color: COL.blue, size: 36, dy: 60 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      earth.rotation.y = lt * 0.2;
      camera.position.set(lerp(-0.5, 0.5, k), 1.5, lerp(7, 5.5, k)); camera.lookAt(0, 3.2, -10);
      st.draw(lt, dur);
    };
  }

  // ================================================================== ARCOÍRIS
  K.addEN({
    'Sol a tu espalda': 'Sun behind you', 'lluvia delante': 'rain in front', 'se dobla': 'it bends',
    'rebota': 'it bounces', 'sale separada': 'it comes out split', 'rojo ≈ 42°': 'red ≈ 42°', 'violeta ≈ 40°': 'violet ≈ 40°',
    'rojo: gotas más altas': 'red: higher drops', 'violeta: gotas más bajas': 'violet: lower drops',
    'sombra de tu cabeza': 'shadow of your head', 'círculo completo': 'a full circle', 'colores al revés': 'colors reversed',
    'tu arcoíris': 'your rainbow', 'el de tu amigo': "your friend's",
  });

  function person(scene, x, z, color = 0xffc94a) {
    const g = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(0.2, 0.25, 0.8, 10), new T.MeshStandardMaterial({ color }));
    const head = new T.Mesh(new T.SphereGeometry(0.2, 14, 10), new T.MeshStandardMaterial({ color: 0xf1c7a0 }));
    body.position.y = 0.4; head.position.y = 1.0; g.add(body, head); g.position.set(x, 0, z); scene.add(g);
    return [x, 1.0, z];
  }

  function rain(scene, x0, x1, top, n, seed) {
    const r = rng(seed); const drops = [];
    const mat = new T.LineBasicMaterial({ color: 0x9fc8ff, transparent: true, opacity: 0.5 });
    for (let i = 0; i < n; i++) {
      const l = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), new T.Vector3(0, -0.35, 0)]), mat);
      scene.add(l); drops.push({ l, x: lerp(x0, x1, r()), z: (r() - 0.5) * 4, ph: r(), sp: 0.8 + r() * 0.4 });
    }
    return (lt) => drops.forEach((o) => { const f = (lt * o.sp + o.ph) % 1; o.l.position.set(o.x, top - f * top, o.z); });
  }

  function seg(scene, a, b, color, opacity = 1) {
    const m = onGlow(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(...a), new T.Vector3(...b)]),
      new T.LineBasicMaterial({ color, transparent: true, opacity })));
    scene.add(m); return m;
  }

  // Lado: Sol bajo a la izquierda, observador, lluvia a la derecha.
  function arcoSide(canvas, variant) {
    const st = stage(canvas, { bg: 0x0d1a33, fog: null, stars: false, focus: 0.37, hemi: 0.9 });
    const { scene, camera } = st;
    const ground = new T.Mesh(new T.BoxGeometry(30, 0.3, 6), new T.MeshStandardMaterial({ color: 0x3c7a3a, flatShading: true }));
    ground.position.y = -0.15; scene.add(ground);
    const eye = person(scene, 0, 0);
    const sun = glowSprite(0xfff2c0, 2.6, 1); sun.position.set(-3.8, 2.2, 0); scene.add(sun);
    const rainUpd = rain(scene, 3.4, 5.6, 8, 120, 3);
    const beams = [];
    for (let i = 0; i < 4; i++) beams.push({ m: seg(scene, [-3.4, 1.8 + i * 1.5, 0], [4.6, 1.8 + i * 1.5, 0], 0xfff2c0, 0.35), t: 0.2 + i * 0.1 });
    const fan = [];
    const angles = variant === 'yours' ? [] : [[42, 0xff3b30], [40, 0x8e5cf7]];
    const X = 4.4;
    angles.forEach(([deg, c], i) => {
      const y = eye[1] + X * Math.tan(deg * PI / 180 * 1.0);
      const drop = onGlow(new T.Mesh(new T.SphereGeometry(0.16, 12, 8), new T.MeshBasicMaterial({ color: c })));
      drop.position.set(X, y, 0); scene.add(drop);
      fan.push({ line: seg(scene, [X, y, 0], eye, c, 0.95), drop, t: 0.6 + i * 0.9 });
    });
    const people = [];
    if (variant === 'yours') {
      const eye2 = person(scene, 1.3, 0, 0x6ee08a);
      [[eye, 0xff3b30], [eye2, 0xff9500]].forEach(([e, c], i) => {
        const y = e[1] + (X - e[0]) * Math.tan(42 * PI / 180);
        const drop = onGlow(new T.Mesh(new T.SphereGeometry(0.16, 12, 8), new T.MeshBasicMaterial({ color: c })));
        drop.position.set(X, y, 0); scene.add(drop);
        people.push({ line: seg(scene, [X, y, 0], e, c, 0.95), drop, t: 0.5 + i * dur0Frac });
      });
      st.label({ text: 'tu arcoíris', p: () => people[0].drop.position.toArray(), t0: 0.6, color: '#ff8a7a', size: 38, dx: -150, dy: 40 });
      st.label({ text: 'el de tu amigo', p: () => people[1].drop.position.toArray(), t0: (d) => d * 0.5, color: COL.orange, size: 38, dx: -150, dy: -60 });
    }
    if (variant === 'recipe') {
      st.label({ text: 'Sol a tu espalda', p: [-3.8, 2.2, 0], t0: 0.3, color: COL.gold, size: 40, dy: 120, dx: 80 });
      st.label({ text: 'lluvia delante', p: [4.5, 4, 0], t0: (d) => d * 0.45, color: COL.blue, size: 40, dy: 160, dx: -80 });
    }
    if (variant === 'many') {
      st.label({ text: 'rojo: gotas más altas', p: () => fan[0].drop.position.toArray(), t0: 0.8, color: '#ff8a7a', size: 38, dx: -200, dy: 70 });
      st.label({ text: 'violeta: gotas más bajas', p: () => fan[1].drop.position.toArray(), t0: (d) => d * 0.5, color: '#c4a6ff', size: 38, dx: -200, dy: -90 });
    }
    return (lt, dur) => {
      rainUpd(lt);
      beams.forEach((b) => { b.m.material.opacity = 0.35 * smooth(prog(lt, b.t, 0.6)); });
      [...fan, ...people].forEach((o) => { const p = smooth(prog(lt, variant === 'yours' ? o.t * dur : o.t, 0.6)); o.line.visible = o.drop.visible = p > 0.01; o.line.material.opacity = p; });
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(0.2, 0.6, k), 3.4, lerp(18.5, 17.5, k)); camera.lookAt(0.4, 3.0, 0);
      st.draw(lt, dur);
    };
  }
  const dur0Frac = 0.45;

  // Gota grande: la luz entra, se dobla, rebota y sale separada en colores.
  function arcoDrop(canvas, variant) {
    const st = stage(canvas, { fog: null, focus: 0.37 });
    const { scene, camera } = st;
    const R = 2;
    const drop = new T.Mesh(new T.SphereGeometry(R, 48, 32), new T.MeshStandardMaterial({ color: 0x6fb6ff, transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }));
    scene.add(drop);
    const rim = new T.Mesh(new T.TorusGeometry(R, 0.02, 6, 96), new T.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.6 }));
    scene.add(rim);
    const E = [-1.6, 1.2, 0], B = [1.7, -1.05, 0], X = [-0.9, -1.786, 0];
    const parts = [seg(scene, [-6, 1.2, 0], E, 0xffffff), seg(scene, E, B, 0xffffff), seg(scene, B, X, 0xffffff)];
    const outs = BOW.map((c, i) => { const a = (180 + 46 - i * 2) * PI / 180; return seg(scene, X, [X[0] + Math.cos(a) * 5, X[1] + Math.sin(a) * 5, 0], c); });
    if (variant === 'drop') {
      st.label({ text: 'se dobla', p: E, t0: 0.4, color: COL.white, size: 40, dy: 110 });
      st.label({ text: 'rebota', p: B, t0: (d) => d * 0.4, color: COL.white, size: 40, dy: -150, dx: -40 });
      st.label({ text: 'sale separada', p: X, t0: (d) => d * 0.7, color: COL.gold, size: 40, dy: -170, dx: -80 });
    } else {
      st.label({ text: 'rojo ≈ 42°', p: () => [X[0] + Math.cos((180 + 46) * PI / 180) * 4.6, X[1] + Math.sin((180 + 46) * PI / 180) * 4.6, 0], t0: 0.4, color: '#ff8a7a', size: 40, dy: 0, dx: -60 });
      st.label({ text: 'violeta ≈ 40°', p: () => [X[0] + Math.cos((180 + 34) * PI / 180) * 4.6, X[1] + Math.sin((180 + 34) * PI / 180) * 4.6, 0], t0: (d) => d * 0.45, color: '#c4a6ff', size: 40, dy: 110, dx: -120 });
    }
    return (lt, dur) => {
      const grow = (m, a, b, p) => { m.visible = p > 0.01; const pos = m.geometry.attributes.position; pos.setXYZ(1, lerp(a[0], b[0], p), lerp(a[1], b[1], p), 0); pos.needsUpdate = true; };
      const t = variant === 'drop' ? [0.2, dur * 0.3, dur * 0.5, dur * 0.7] : [0, 0, 0, 0.1];
      const pts = [[-6, 1.2, 0], E, B, X];
      parts.forEach((m, i) => grow(m, pts[i], pts[i + 1], variant === 'drop' ? smooth(prog(lt, t[i], dur * 0.18)) : 1));
      outs.forEach((m, i) => { const a = (180 + 46 - i * 2) * PI / 180; grow(m, X, [X[0] + Math.cos(a) * 5, X[1] + Math.sin(a) * 5, 0], smooth(prog(lt, t[3], dur * 0.25))); });
      const k = smooth(clamp(lt / dur));
      if (variant === 'drop') { camera.position.set(lerp(-0.4, 0.4, k), 0.4, lerp(12, 11, k)); camera.lookAt(-0.6, 0, 0); }
      else { camera.position.set(-2.4, -2.2, lerp(9, 8, k)); camera.lookAt(-3.0, -3.4, 0); }
      st.draw(lt, dur);
    };
  }

  // Cono de 42° alrededor de la sombra de la cabeza; y vista desde un avión con el círculo completo.
  function arcoCone(canvas, variant) {
    const plane = variant === 'circle';
    const st = stage(canvas, { bg: plane ? 0x4f8fd8 : 0x0d1a33, fog: plane ? [0x9fc8f0, 20, 70] : null, stars: false, focus: 0.37, hemi: 1.0 });
    const { scene, camera } = st;
    if (!plane) {
      const ground = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshStandardMaterial({ color: 0x3c7a3a }));
      ground.rotation.x = -PI / 2; scene.add(ground);
      const eye = person(scene, 0, 4);
      const shadowPt = onGlow(new T.Mesh(new T.CircleGeometry(0.25, 20), new T.MeshBasicMaterial({ color: 0x111111 })));
      shadowPt.rotation.x = -PI / 2; shadowPt.position.set(0, 0.02, -3); scene.add(shadowPt);
      // El eje del cono va del ojo a la sombra de la cabeza (Sol bajo detrás).
      const axis = new T.Vector3(0, -0.14, -1).normalize();
      const L = 9, rad = Math.tan(42 * PI / 180) * L;
      const center = new T.Vector3(...eye).addScaledVector(axis, L);
      const bow = rainbowArcs(scene, center.toArray(), rad, false, 0.85, true);
      const ringObjs = scene.children.slice(-7); ringObjs.forEach((m) => m.lookAt(...eye));
      const lines = [];
      for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; const p = center.clone().add(new T.Vector3(Math.cos(a) * rad, Math.sin(a) * rad, 0)); lines.push(seg(scene, eye, p.toArray(), 0xffffff, 0.25)); }
      st.label({ text: 'sombra de tu cabeza', p: [0, 0, -3], t0: 0.4, color: COL.white, size: 38, dy: -120 });
      st.label({ text: 'rojo ≈ 42°', p: () => center.clone().add(new T.Vector3(rad * 0.7, rad * 0.7, 0)).toArray(), t0: (d) => d * 0.45, color: '#ff8a7a', size: 40 });
      return (lt, dur) => {
        bow(smooth(prog(lt, dur * 0.2, dur * 0.4)));
        lines.forEach((l) => { l.material.opacity = 0.25 * smooth(prog(lt, 0.2, 0.8)); });
        const k = smooth(clamp(lt / dur));
        camera.position.set(lerp(-2.5, -1.5, k), 4.0, lerp(14, 13, k)); camera.lookAt(0, 1.8, -5);
        st.draw(lt, dur);
      };
    }
    // Avión sobre las nubes con el arcoíris circular delante.
    const r = rng(6);
    for (let i = 0; i < 30; i++) {
      const c = new T.Mesh(new T.IcosahedronGeometry(1.5 + r() * 1.5, 1), new T.MeshStandardMaterial({ color: 0xffffff, flatShading: true }));
      c.position.set((r() - 0.5) * 50, -6 + r() * 1.5, -r() * 50 + 5); c.scale.y = 0.5; scene.add(c);
    }
    const bow = rainbowArcs(scene, [0, -3, -26], 9, false, 0.8, true);
    const shadowPlane = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 1.6, 10), new T.MeshBasicMaterial({ color: 0x223 }));
    body.rotation.z = PI / 2; const wing = new T.Mesh(new T.BoxGeometry(0.3, 0.03, 1.8), new T.MeshBasicMaterial({ color: 0x223 }));
    shadowPlane.add(body, wing); shadowPlane.position.set(0, -3, -25.9); shadowPlane.scale.setScalar(0.7); scene.add(shadowPlane);
    st.label({ text: 'círculo completo', p: [0, 6, -26], t0: (d) => d * 0.4, color: COL.gold, size: 46, dy: 60 });
    return (lt, dur) => {
      bow(smooth(prog(lt, 0.2, dur * 0.4)));
      const k = smooth(clamp(lt / dur));
      camera.position.set(Math.sin(lt * 0.4) * 0.3, 2.0, lerp(4, 2, k)); camera.lookAt(0, -2.5, -26);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['arco_hook', 'arco_double', 'arco_outro'].forEach((v) => reg(v, (c) => landscape(c, v)));
  ['recipe', 'many', 'yours'].forEach((v) => reg(`arco_${v}`, (c) => arcoSide(c, v)));
  ['drop', 'split'].forEach((v) => reg(`arco_${v}`, (c) => arcoDrop(c, v)));
  ['cone', 'circle'].forEach((v) => reg(`arco_${v}`, (c) => arcoCone(c, v)));
  reg('cielo_hook', (c) => landscape(c, 'hook'));
  reg('cielo_outro', (c) => landscape(c, 'outro'));
  reg('cielo_prism', (c) => prismScene(c));
  reg('cielo_molecules', (c) => moleculesScene(c));
  reg('cielo_scatter', (c) => scatterScene(c));
  reg('cielo_everywhere', (c) => everywhereScene(c));
  reg('cielo_violet', (c) => violetScene(c));
  reg('cielo_sunset', (c) => sunsetScene(c));
  reg('cielo_moon', (c) => moonScene(c));
})();
