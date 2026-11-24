// Escenas 3D "¿Qué son las auroras?" (aur_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow, space, sphere, sunBall } = K;

  K.addEN({
    'viento solar': 'solar wind', 'campo magnético': 'magnetic field', 'óvalo de auroras': 'auroral oval',
    'oxígeno → verde': 'oxygen → green', 'nitrógeno → violeta': 'nitrogen → purple', 'rojo: más de 250 km': 'red: above 250 km',
    'verde: 100–250 km': 'green: 100–250 km', 'violeta: más abajo': 'purple: lower down', 'auroras australes': 'southern lights',
    'auroras boreales': 'northern lights', 'tormenta solar': 'solar storm', 'Júpiter': 'Jupiter', 'Tierra (a escala)': 'Earth (to scale)',
    'aurora más grande\nque la Tierra': 'aurora bigger\nthan Earth',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  // Cortina de aurora: tira vertical ondulante con degradado (verde abajo, rojo/violeta arriba), aditiva.
  let curtainTexC = null;
  function curtainTex() {
    if (curtainTexC) return curtainTexC;
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 256, 0, 0);
    gr.addColorStop(0, 'rgba(120,255,160,0)'); gr.addColorStop(0.08, 'rgba(120,255,160,0.95)'); gr.addColorStop(0.45, 'rgba(70,230,140,0.55)');
    gr.addColorStop(0.75, 'rgba(200,80,160,0.35)'); gr.addColorStop(1, 'rgba(220,60,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    return (curtainTexC = new T.CanvasTexture(c));
  }
  function curtain(scene, { x0 = -14, x1 = 14, z = -18, y = 4, h = 9, seed = 1, segs = 120 } = {}) {
    const geo = new T.PlaneGeometry(x1 - x0, h, segs, 1);
    const mat = new T.MeshBasicMaterial({ map: curtainTex(), transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
    const m = new T.Mesh(geo, mat); m.position.set((x0 + x1) / 2, y + h / 2, z); scene.add(m);
    const p = geo.attributes.position; const base = Float32Array.from(p.array);
    return (lt, a = 1) => {
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        p.array[i * 3 + 2] = Math.sin(x * 0.35 + lt * 0.6 + seed) * 2.2 + Math.sin(x * 0.9 - lt * 1.1 + seed * 3) * 0.7;
        p.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(x * 0.5 + lt * 0.8) * 0.4;
      }
      p.needsUpdate = true; mat.opacity = a * (0.75 + 0.25 * Math.sin(lt * 1.7 + seed));
    };
  }

  function landscape(canvas, variant) {
    const st = stage(canvas, { bg: 0x040814, fog: [0x050a18, 20, 70], focus: 0.36, hemi: 0.4, moon: 0.5 });
    const { scene, camera } = st;
    const geo = new T.PlaneGeometry(120, 80, 80, 50); geo.rotateX(-PI / 2);
    const gp = geo.attributes.position;
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i); gp.setY(i, (noise2(x * 0.08, z * 0.08) - 0.4) * 3 + Math.max(0, -z - 20) * 0.35); }
    geo.computeVertexNormals();
    scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xdfe6f2, flatShading: true, roughness: 1 })));
    const r = rng(5);
    for (let i = 0; i < 30; i++) {
      const t = new T.Mesh(new T.ConeGeometry(0.4, 1.8, 6), new T.MeshStandardMaterial({ color: 0x1c3326, flatShading: true }));
      const x = (r() - 0.5) * 30, z = -2 - r() * 18; t.position.set(x, (noise2(x * 0.08, z * 0.08) - 0.4) * 3 + 0.8, z); scene.add(t);
    }
    const curtains = [curtain(scene, { seed: 1 }), curtain(scene, { seed: 4, z: -24, y: 6, h: 11, x0: -20, x1: 10 }), curtain(scene, { seed: 7, z: -14, y: 5, h: 6, x0: -6, x1: 16 })];
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const a = variant === 'hook' ? smooth(prog(lt, 0.1, 1.2)) : 1;
      curtains.forEach((c) => c(lt, a));
      camera.position.set(0, 1.8, lerp(8, 6, k)); camera.lookAt(0, lerp(6.5, 7.5, k), -18);
      st.draw(lt, dur);
    };
  }

  // Líneas de campo de un dipolo alrededor de la Tierra (eje y = polos).
  function fieldLines(scene, R, n = 10, color = 0x8fd0ff, opacity = 0.35) {
    const lines = [];
    for (let i = 0; i < n; i++) {
      const az = i / n * PI * 2; const L = R * (2.2 + (i % 3) * 0.9);
      const pts = [];
      for (let t = 0.12; t <= PI - 0.12; t += 0.04) { const rr = L * Math.sin(t) ** 2; if (rr < R * 1.01) continue; pts.push(new T.Vector3(Math.cos(az) * rr * Math.sin(t), rr * Math.cos(t), Math.sin(az) * rr * Math.sin(t))); }
      const m = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color, transparent: true, opacity }));
      scene.add(m); lines.push(m);
    }
    return lines;
  }

  function ovals(scene, R, lat = 67, color = 0x6effa0) {
    const make = (s) => {
      const y = Math.sin(lat * PI / 180) * R * s, rr = Math.cos(lat * PI / 180) * R;
      const m = onGlow(new T.Mesh(new T.TorusGeometry(rr * 1.01, R * 0.045, 8, 96), new T.MeshBasicMaterial({ color, transparent: true })));
      m.rotation.x = PI / 2; m.position.y = y * 1.01; scene.add(m);
      const g = glowSprite(color, R * 1.1, 0.4); g.position.y = y * 1.05; scene.add(g);
      return { m, g, set(a, latNow) { const yy = Math.sin(latNow * PI / 180) * R * s, r2 = Math.cos(latNow * PI / 180) * R; m.position.y = yy * 1.01; m.scale.setScalar(r2 / rr); m.material.opacity = a; g.position.y = yy * 1.05; g.material.opacity = 0.4 * a; m.visible = a > 0.01; } };
    };
    return [make(1), make(-1)];
  }

  function earthScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff4e0, 2.0); light.position.set(-10, 2, 6); scene.add(light);
    const R = 1.4;
    const earth = sphere(R, 'earth', 2, 5); earth.rotation.z = 0.25; scene.add(earth);
    const sunX = -9;
    if (variant === 'wind' || variant === 'shield') sunBall(scene, [sunX, 0.5, -2], 1.2);
    const lines = variant === 'wind' ? [] : fieldLines(scene, R);
    const ov = ovals(scene, R);
    const r = rng(3); const parts = [];
    if (variant !== 'south') for (let i = 0; i < 70; i++) { const s = glowSprite(i % 3 ? 0xffd27a : 0xff9a5a, 0.22, 1); scene.add(s); parts.push({ s, y: (r() - 0.5) * 6, z: (r() - 0.5) * 4, ph: r(), pole: r() > 0.5 ? 1 : -1 }); }
    if (variant === 'wind') st.label({ text: 'viento solar', p: [-4.5, 1.6, 0], t0: 0.4, color: COL.gold, size: 42 });
    if (variant === 'shield') st.label({ text: 'campo magnético', p: [R * 2.3, 1.5, 0], t0: 0.4, color: COL.blue, size: 40 });
    if (variant === 'poles') st.label({ text: 'óvalo de auroras', p: [0, R * 1.1, 0], t0: (d) => d * 0.4, color: COL.green, size: 42 });
    if (variant === 'south') {
      st.label({ text: 'auroras boreales', p: [0, R * 1.05, 0], t0: 0.3, color: COL.green, size: 38 });
      st.label({ text: 'auroras australes', p: [0, -R * 1.05, 0], t0: (d) => d * 0.4, color: COL.green, size: 38, dy: -150 });
    }
    if (variant === 'storm') st.label({ text: 'tormenta solar', screen: [540, 1000], t0: 0.3, color: '#ff8a7a', size: 50 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      earth.rotation.y = lt * 0.1;
      const lineA = variant === 'shield' ? smooth(prog(lt, 0.3, dur * 0.4)) : 1;
      lines.forEach((l) => { l.material.opacity = 0.35 * lineA; });
      const ovA = variant === 'poles' ? smooth(prog(lt, dur * 0.35, dur * 0.3)) : variant === 'wind' ? 0 : variant === 'shield' ? 0.4 * smooth(prog(lt, dur * 0.6, 0.5)) : 1;
      const lat = variant === 'storm' ? lerp(67, 45, smooth(prog(lt, 0.5, dur * 0.6))) : 67;
      ov.forEach((o) => o.set(ovA * (0.75 + 0.25 * Math.sin(lt * 3)), lat));
      parts.forEach((o) => {
        const f = (lt * (variant === 'storm' ? 0.6 : 0.35) + o.ph) % 1;
        let x = lerp(sunX + 1.5, 3, f), y = o.y, z = o.z;
        if (variant !== 'wind') {
          const bend = smooth(clamp((x + 3.5) / 2.5));
          const tgt = new T.Vector3(0, o.pole * R * 0.95, 0);
          const deflect = clamp(Math.abs(o.y) / 3);
          x = lerp(x, deflect > 0.35 ? x + 1.5 : tgt.x, bend * (deflect > 0.35 ? 0.4 : 1));
          y = lerp(y, deflect > 0.35 ? y + Math.sign(y) * 1.5 : tgt.y, bend);
          z = lerp(z, deflect > 0.35 ? z : 0, bend);
        }
        o.s.position.set(x, y, z); o.s.material.opacity = Math.sin(f * PI);
      });
      if (variant === 'wind') { camera.position.set(-2.6, 1.5, lerp(15, 14, k)); camera.lookAt(-2.4, 0.2, 0); }
      else if (variant === 'south') { camera.position.set(Math.sin(lt * 0.2) * 1.5, 0, 7.5); camera.lookAt(0, 0, 0); }
      else { camera.position.set(lerp(1, 2, k), lerp(2.5, 3, k), lerp(9, 8.5, k)); camera.lookAt(-0.5, 0.2, 0); }
      st.draw(lt, dur);
    };
  }

  // Átomos de la alta atmósfera que se encienden al chocar con partículas.
  function collideScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x02040c, fog: null, focus: 0.37, hemi: 0.3 });
    const { scene, camera } = st;
    const r = rng(9); const atoms = [];
    for (let i = 0; i < 50; i++) {
      const oxy = i % 3 !== 0; const y = variant === 'colors' ? lerp(-3, 4.5, r()) : (r() - 0.5) * 6;
      const col = variant === 'colors' ? (y > 2.4 ? 0xff4a4a : y > -1.2 ? 0x6effa0 : 0xb07aff) : (oxy ? 0x6effa0 : 0xb07aff);
      const core = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), new T.MeshStandardMaterial({ color: 0x8890a0 }));
      core.position.set((r() - 0.5) * 6, y, (r() - 0.5) * 3); scene.add(core);
      const g = glowSprite(col, 1.0, 0); g.position.copy(core.position); scene.add(g);
      atoms.push({ g, ph: r(), core });
    }
    const hits = [];
    for (let i = 0; i < 24; i++) { const s = glowSprite(0xffd27a, 0.18, 1); scene.add(s); hits.push({ s, a: atoms[i * 2 % atoms.length], ph: r() }); }
    if (variant === 'collide') {
      st.label({ text: 'oxígeno → verde', p: () => atoms[1].core.position.toArray(), t0: 0.5, color: COL.green, size: 40 });
      st.label({ text: 'nitrógeno → violeta', p: () => atoms[0].core.position.toArray(), t0: (d) => d * 0.45, color: '#c4a6ff', size: 40, dy: -150 });
    } else {
      st.label({ text: 'rojo: más de 250 km', screen: [540, 470], t0: 0.3, color: '#ff8a7a', size: 40 });
      st.label({ text: 'verde: 100–250 km', screen: [800, 720], t0: (d) => d * 0.3, color: COL.green, size: 40 });
      st.label({ text: 'violeta: más abajo', screen: [300, 990], t0: (d) => d * 0.55, color: '#c4a6ff', size: 40 });
    }
    return (lt, dur) => {
      hits.forEach((o) => {
        const f = (lt * 0.7 + o.ph) % 1; const tgt = o.a.core.position;
        o.s.position.set(tgt.x - (1 - f) * 2, tgt.y + (1 - f) * 3, tgt.z); o.s.material.opacity = f < 0.95 ? 1 : 0;
      });
      atoms.forEach((o) => { const f = (lt * 0.7 + o.ph) % 1; o.g.material.opacity = Math.max(0, 1 - Math.abs(f - 0.98) * 6) * 0.9 + 0.08; });
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.5, 0.5, k), 0.6, lerp(10, 9, k)); camera.lookAt(0, 0.6, 0);
      st.draw(lt, dur);
    };
  }

  function jupiterScene(canvas) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff4e0, 1.8); light.position.set(-6, 2, 8); scene.add(light);
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    for (let y = 0; y < 128; y++) { const n = Math.sin(y * 0.35) * 0.5 + Math.sin(y * 0.11 + 1) * 0.5; const v = 0.5 + n * 0.25; g.fillStyle = `rgb(${Math.round(210 * v + 40)},${Math.round(170 * v + 30)},${Math.round(130 * v + 20)})`; g.fillRect(0, y, 256, 1); }
    g.fillStyle = 'rgba(190,90,60,.8)'; g.beginPath(); g.ellipse(170, 80, 18, 9, 0, 0, PI * 2); g.fill();
    const jup = new T.Mesh(new T.SphereGeometry(3, 48, 32), new T.MeshStandardMaterial({ map: new T.CanvasTexture(c), roughness: 0.9 }));
    jup.rotation.x = 0.35; scene.add(jup);
    const R = 3, lat = 72;
    const ring = onGlow(new T.Mesh(new T.TorusGeometry(Math.cos(lat * PI / 180) * R * 1.02, 0.08, 8, 96), new T.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true })));
    ring.rotation.x = PI / 2; ring.position.y = Math.sin(lat * PI / 180) * R; jup.add(ring);
    const ringG = glowSprite(0x9fd0ff, 2.4, 0.6); ringG.position.y = ring.position.y + 0.1; jup.add(ringG);
    const earth = sphere(3 / 11.2, 'earth', 2, 3); earth.position.set(3.9, 1.4, 1); scene.add(earth);
    st.label({ text: 'Júpiter', p: [0, -3, 0], t0: 0.3, color: COL.orange, size: 40, dy: -150 });
    st.label({ text: 'Tierra (a escala)', p: [3.9, 1.7, 1], t0: (d) => d * 0.3, color: COL.blue, size: 34 });
    st.label({ text: 'aurora más grande\nque la Tierra', p: () => { const v = new T.Vector3(); ring.getWorldPosition(v); return v.toArray(); }, t0: (d) => d * 0.55, color: COL.blue, size: 38 });
    return (lt, dur) => {
      jup.rotation.y = lt * 0.1; ring.material.opacity = 0.75 + 0.25 * Math.sin(lt * 3);
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(0.5, 1, k), 2.5, lerp(13, 12, k)); camera.lookAt(0.5, 0.6, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  reg('aur_hook', (c) => landscape(c, 'hook'));
  reg('aur_outro', (c) => landscape(c, 'outro'));
  ['wind', 'shield', 'poles', 'south', 'storm'].forEach((v) => reg(`aur_${v}`, (c) => earthScene(c, v)));
  ['collide', 'colors'].forEach((v) => reg(`aur_${v}`, (c) => collideScene(c, v)));
  reg('aur_jupiter', (c) => jupiterScene(c));
})();
