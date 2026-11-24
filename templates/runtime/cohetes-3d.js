// Escenas 3D "¿Cómo vuela un cohete?" (coh_*). Cohete de diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow, space, sphere } = K;

  K.addEN({
    'gas hacia abajo': 'gas goes down', 'cohete hacia arriba': 'rocket goes up', 'sin aire: igual funciona': 'no air: still works',
    'combustible': 'fuel', 'oxígeno': 'oxygen', '~90 % es combustible': '~90% is fuel', 'se suelta la etapa vacía': 'the empty stage drops off',
    '~28.000 km/h': '~28,000 km/h', 'en órbita: cae sin parar': 'in orbit: falling nonstop', 'vuelve y aterriza': 'it comes back and lands',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  function rocket(scene) {
    const g = new T.Group(); scene.add(g);
    const white = new T.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.4 }), dark = new T.MeshStandardMaterial({ color: 0x2a2e38 });
    const stage1 = new T.Group(); g.add(stage1);
    const b1 = new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 4, 24), white); b1.position.y = 2; stage1.add(b1);
    const band = new T.Mesh(new T.CylinderGeometry(0.46, 0.46, 0.25, 24), dark); band.position.y = 3.6; stage1.add(band);
    for (let i = 0; i < 4; i++) { const f = new T.Mesh(new T.BoxGeometry(0.05, 0.8, 0.5), dark); const a = i * PI / 2; f.position.set(Math.cos(a) * 0.5, 0.4, Math.sin(a) * 0.5); f.rotation.y = -a; stage1.add(f); }
    const nozzle = new T.Mesh(new T.CylinderGeometry(0.25, 0.4, 0.4, 16, 1, true), dark); nozzle.position.y = -0.2; stage1.add(nozzle);
    const stage2 = new T.Group(); stage2.position.y = 4; g.add(stage2);
    const b2 = new T.Mesh(new T.CylinderGeometry(0.42, 0.45, 1.6, 24), white); b2.position.y = 0.8; stage2.add(b2);
    const nose = new T.Mesh(new T.ConeGeometry(0.42, 1.1, 24), white); nose.position.y = 2.15; stage2.add(nose);
    const win = new T.Mesh(new T.CircleGeometry(0.13, 16), new T.MeshStandardMaterial({ color: 0x5ad8ff, emissive: 0x204a6a })); win.position.set(0, 1.0, 0.43); stage2.add(win);
    const flame = new T.Group(); flame.position.y = -0.35; g.add(flame);
    const core = onGlow(new T.Mesh(new T.ConeGeometry(0.3, 1.6, 16, 1, true), new T.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, side: T.DoubleSide }))); core.rotation.x = PI; core.position.y = -0.8; flame.add(core);
    const outer = onGlow(new T.Mesh(new T.ConeGeometry(0.45, 2.6, 16, 1, true), new T.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.7, side: T.DoubleSide }))); outer.rotation.x = PI; outer.position.y = -1.3; flame.add(outer);
    flame.add(glowSprite(0xffb050, 2.2, 0.8));
    return { g, stage1, stage2, flame, fire: (lt, on = 1) => { flame.visible = on > 0.01; flame.scale.set(on, on * (0.9 + 0.15 * Math.sin(lt * 30)), on); } };
  }

  function smokeField(scene, n, seed) { const r = rng(seed); const list = []; for (let i = 0; i < n; i++) { const s = new T.Sprite(new T.SpriteMaterial({ color: 0xdedede, transparent: true, opacity: 0, depthWrite: false })); scene.add(s); list.push({ s, a: r() * PI * 2, ph: r(), sp: 0.3 + r() * 0.3 }); } return list; }

  function padScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x5fa0e0, fog: [0xa8d0f0, 30, 120], stars: false, focus: 0.37, hemi: 1.0, moon: 1.2 });
    const { scene, camera } = st;
    const ground = new T.Mesh(new T.PlaneGeometry(200, 200), new T.MeshStandardMaterial({ color: 0x8a9a6a })); ground.rotation.x = -PI / 2; scene.add(ground);
    const pad = new T.Mesh(new T.CylinderGeometry(3, 3.2, 0.4, 24), new T.MeshStandardMaterial({ color: 0x6a6a72 })); pad.position.y = 0.2; scene.add(pad);
    const tower = new T.Mesh(new T.BoxGeometry(0.6, 7, 0.6), new T.MeshStandardMaterial({ color: 0xc84a2a })); tower.position.set(-1.6, 3.5, 0); scene.add(tower);
    const R = rocket(scene); R.g.position.y = 0.6;
    const smoke = smokeField(scene, 40, 3);
    const arrows = [];
    if (variant === 'newton') {
      const down = new T.ArrowHelper(new T.Vector3(0, -1, 0), new T.Vector3(1.4, 0, 0), 2, 0xff8a2a, 0.5, 0.35); const up = new T.ArrowHelper(new T.Vector3(0, 1, 0), new T.Vector3(1.4, 2, 0), 2.4, 0x6ee08a, 0.5, 0.35);
      [down, up].forEach((a) => { onGlow(a); scene.add(a); arrows.push(a); });
      st.label({ text: 'gas hacia abajo', p: [1.4, -1.6, 0], t0: 0.3, color: COL.orange, size: 38, dx: 150, dy: 0 });
      st.label({ text: 'cohete hacia arriba', p: () => [1.4, R.g.position.y + 4.4, 0], t0: (d) => d * 0.4, color: COL.green, size: 38, dx: 150, dy: 0 });
    }
    let booster = null;
    if (variant === 'land') { R.stage2.visible = false; st.label({ text: 'vuelve y aterriza', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.gold, size: 46 }); }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = clamp(lt / dur);
      let y = 0.6;
      if (variant === 'hook' || variant === 'outro') { const t = Math.max(0, lt - 0.8); y = 0.6 + t * t * 0.9; }
      if (variant === 'newton') { const t = Math.max(0, lt - 1.0); y = 0.6 + t * t * 0.25; arrows.forEach((a, i) => { a.position.y = i ? y + 2 : y - 0.2; }); }
      if (variant === 'land') { const f = smooth(clamp(lt / (dur * 0.85))); y = lerp(30, 0.6, f); R.g.rotation.z = (1 - f) * 0.15; }
      R.g.position.y = y; R.fire(lt, variant === 'land' ? (y < 14 ? 1 : 0.2) : 1);
      smoke.forEach((o) => { const f = (lt * o.sp + o.ph) % 1; o.s.position.set(Math.cos(o.a) * f * 6, 0.6 + f * 1.5, Math.sin(o.a) * f * 6); o.s.scale.setScalar(1 + f * 4); o.s.material.opacity = (variant === 'land' ? (y < 6 ? 0.6 : 0) : 0.6) * (1 - f); });
      const cy = Math.min(y + 3, variant === 'land' ? 8 : 30);
      camera.position.set(9, lerp(3, cy, 0.7), 16); camera.lookAt(0, Math.max(3.5, cy - 0.5), 0);
      st.draw(lt, dur);
    };
  }

  // Globo que se desinfla y sale disparado (analogía).
  function balloonScene(canvas) {
    const st = stage(canvas, { bg: 0x1a2236, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.1 });
    const { scene, camera } = st;
    const b = new T.Mesh(new T.SphereGeometry(1, 24, 16), new T.MeshStandardMaterial({ color: 0xd8402a, roughness: 0.3 })); b.scale.set(1.3, 1, 1); scene.add(b);
    const puff = []; for (let i = 0; i < 16; i++) { const s = glowSprite(0xdff2ff, 0.4, 0.6); scene.add(s); puff.push({ s, ph: i / 16 }); }
    return (lt, dur) => {
      const f = smooth(prog(lt, 0.4, dur * 0.8)); b.position.set(lerp(-2.5, 3, f), Math.sin(lt * 7) * 0.15 * f, 0); b.scale.set(lerp(1.3, 0.6, f), lerp(1, 0.5, f), lerp(1, 0.5, f)); b.rotation.z = Math.sin(lt * 9) * 0.2 * f;
      puff.forEach((o) => { const g = (lt * 1.2 + o.ph) % 1; o.s.position.set(b.position.x - 1.3 * b.scale.x - g * 1.8, b.position.y + (o.ph - 0.5) * 0.4, 0); o.s.material.opacity = f > 0.02 && f < 0.98 ? 0.6 * (1 - g) : 0; });
      camera.position.set(0, 0.5, 8); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  function spaceScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xffffff, 1.8); light.position.set(-5, 4, 6); scene.add(light);
    scene.add(new T.AmbientLight(0x404a60, 0.7));
    const R = rocket(scene);
    let earth = null;
    if (variant === 'orbit') { earth = sphere(3, 'earth', 2, 5); scene.add(earth); R.g.scale.setScalar(0.18); st.label({ text: '~28.000 km/h', screen: [540, 470], t0: 0.3, color: COL.gold, size: 50 }); st.label({ text: 'en órbita: cae sin parar', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.white, size: 44 }); }
    if (variant === 'vacuum') st.label({ text: 'sin aire: igual funciona', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.blue, size: 46 });
    if (variant === 'tanks') {
      R.g.traverse((o) => { if (o.material && o.material.color && o.material.color.getHex() === 0xf2f4f8) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.25; } });
      const fuel = new T.Mesh(new T.CylinderGeometry(0.38, 0.38, 1.7, 20), new T.MeshStandardMaterial({ color: 0xff9a3c, emissive: 0x402000 })); fuel.position.y = 1.1; R.stage1.add(fuel);
      const ox = new T.Mesh(new T.CylinderGeometry(0.38, 0.38, 1.7, 20), new T.MeshStandardMaterial({ color: 0x5aa8ff, emissive: 0x102040 })); ox.position.y = 2.9; R.stage1.add(ox);
      st.label({ text: 'combustible', p: [0.4, 1.1, 0], t0: 0.3, color: COL.orange, size: 38, dx: 160, dy: 0 });
      st.label({ text: 'oxígeno', p: [0.4, 2.9, 0], t0: 0.8, color: COL.blue, size: 38, dx: 160, dy: 0 });
    }
    if (variant === 'mass') {
      const bar = (y, h, c) => { const m = new T.Mesh(new T.BoxGeometry(0.6, h, 0.2), new T.MeshBasicMaterial({ color: c })); m.position.set(2.2, y + h / 2, 0); scene.add(m); return m; };
      bar(0, 5.4, 0xff9a3c); bar(5.4, 0.6, 0xe0e0e0);
      st.label({ text: '~90 % es combustible', p: [2.2, 3, 0], t0: (d) => d * 0.3, color: COL.orange, size: 40, dx: -200, dy: 0 });
    }
    if (variant === 'stages') st.label({ text: 'se suelta la etapa vacía', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.white, size: 44 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      R.fire(lt, variant === 'tanks' || variant === 'mass' ? 0 : 1);
      if (variant === 'stages') { const s = smooth(prog(lt, dur * 0.35, dur * 0.5)); R.stage1.position.y = -s * 3.5; R.stage1.rotation.z = s * 0.6; R.stage2.position.y = 4 + s * 1.2; R.flame.position.y = s > 0.05 ? 4 - 0.35 : -0.35; R.flame.scale.setScalar(s > 0.05 ? 0.6 : 1); }
      if (variant === 'orbit') { const a = lt * 0.5; R.g.position.set(Math.cos(a) * 4.2, Math.sin(a) * 1.0, -Math.sin(a) * 4.2 * 0.3); R.g.rotation.z = a + PI / 2; earth.rotation.y = lt * 0.1; }
      if (variant === 'vacuum') { R.g.position.y = lt * 0.5; }
      const cy = R.g.position.y + 2.5;
      if (variant === 'orbit') { camera.position.set(0, 2.5, 16); camera.lookAt(0, 0, 0); }
      else { camera.position.set(6.5, cy + 0.8, 12.5); camera.lookAt(0.6, cy + 0.3, 0); }
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'newton', 'land', 'outro'].forEach((v) => reg(`coh_${v}`, (c) => padScene(c, v)));
  reg('coh_balloon', (c) => balloonScene(c));
  ['vacuum', 'tanks', 'mass', 'stages', 'orbit'].forEach((v) => reg(`coh_${v}`, (c) => spaceScene(c, v)));
})();
