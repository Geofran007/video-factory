// Escenas 3D "¿Cómo funciona el GPS?" (gps_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, rng, glowSprite, onGlow, space, sphere, tr } = K;

  K.addEN({
    '≈ 31 satélites': '≈ 31 satellites', '20.200 km de altura': '20,200 km up', 'reloj atómico': 'atomic clock',
    'solo escucha': 'it only listens', 'tiempo → distancia': 'time → distance', 'aquí estás': 'you are here',
    'corrige el reloj': 'fixes the clock', '1 microsegundo = 300 m': '1 microsecond = 300 m',
    '+38 µs por día': '+38 µs per day', 'sin corregir: km de error': 'uncorrected: km of error', 'satélite': 'satellite',
    'en la Tierra': 'on Earth', 'en órbita': 'in orbit',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  function satellite(scale = 1) {
    const g = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.7), new T.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.5, roughness: 0.4 }));
    const pm = new T.MeshStandardMaterial({ color: 0x1f3f8a, metalness: 0.3, roughness: 0.3, emissive: 0x0a1a40 });
    [-1, 1].forEach((s) => { const p = new T.Mesh(new T.BoxGeometry(1.3, 0.04, 0.5), pm); p.position.x = s * 0.95; g.add(p); });
    const dish = new T.Mesh(new T.ConeGeometry(0.18, 0.2, 12, 1, true), new T.MeshStandardMaterial({ color: 0xeeeeee, side: T.DoubleSide }));
    dish.rotation.x = PI; dish.position.y = -0.35; g.add(body, dish);
    g.scale.setScalar(scale); return g;
  }

  // Pantalla de celular con un mapa y un pin.
  function phone(scene) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#dfe8d8'; g.fillRect(0, 0, 256, 512);
    g.strokeStyle = '#ffffff'; g.lineWidth = 14; [[0, 140, 256, 180], [60, 0, 110, 512], [0, 360, 256, 330], [190, 0, 170, 512]].forEach(([a, b, c2, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); });
    g.fillStyle = '#9fd3a0'; g.fillRect(130, 200, 60, 110); g.fillStyle = '#9cc6f0'; g.fillRect(10, 400, 70, 90);
    const tex = new T.CanvasTexture(c);
    const grp = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(1.3, 2.5, 0.12), new T.MeshStandardMaterial({ color: 0x15161c, roughness: 0.4 }));
    const screen = new T.Mesh(new T.PlaneGeometry(1.15, 2.3), new T.MeshBasicMaterial({ map: tex }));
    screen.position.z = 0.065; grp.add(body, screen);
    const pin = onGlow(new T.Mesh(new T.ConeGeometry(0.12, 0.3, 12), new T.MeshBasicMaterial({ color: 0xff3b30 })));
    pin.rotation.x = PI; pin.position.set(0.05, 0.1, 0.2); grp.add(pin);
    const pinGlow = glowSprite(0xff5a4a, 0.6, 0.8); pinGlow.position.copy(pin.position); grp.add(pinGlow);
    scene.add(grp); return { grp, pin, pinGlow };
  }

  // Relojes 2D dibujados encima, anclados a puntos 3D.
  function drawClock(ctx, x, y, r, t, label, FONT, color = '#fff') {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(8,12,24,.88)'; ctx.strokeStyle = color; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
    const hand = (a, l, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a) * l, -Math.cos(a) * l); ctx.stroke(); };
    hand(t * 0.5, r * 0.5, 6); hand(t * 6, r * 0.8, 3);
    if (label) { ctx.font = `800 30px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText(label, 0, r + 38); }
    ctx.restore();
  }

  function orbitScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff4e0, 2.2); light.position.set(-10, 4, 8); scene.add(light);
    const earth = sphere(2, 'earth', 2, 5); scene.add(earth);
    const sats = []; const R = 4.6;
    for (let pl = 0; pl < 6; pl++) {
      const plane = new T.Group(); plane.rotation.set(55 * PI / 180, pl * PI / 3, 0); scene.add(plane);
      const ringPts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * PI * 2; ringPts.push(new T.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R)); }
      plane.add(new T.Line(new T.BufferGeometry().setFromPoints(ringPts), new T.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.18 })));
      for (let j = 0; j < 4; j++) { const s = satellite(0.32); plane.add(s); sats.push({ s, a0: j * PI / 2 + pl * 0.4 }); }
    }
    if (variant === 'sats') {
      st.label({ text: '≈ 31 satélites', screen: [540, 1000], t0: 0.4, color: COL.gold, size: 50 });
      st.label({ text: '20.200 km de altura', p: () => { const v = new T.Vector3(); sats[1].s.getWorldPosition(v); return v.toArray(); }, t0: (d) => d * 0.45, color: COL.white, size: 38 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      sats.forEach((o) => { const a = o.a0 + lt * 0.12; o.s.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); o.s.lookAt(0, 0, 0); });
      earth.rotation.y = lt * 0.05;
      const d = variant === 'outro' ? lerp(15, 22, k) : lerp(15.5, 14, k);
      camera.position.set(Math.sin(lt * 0.04) * 2, 3, d); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Escenas cerca de la superficie: celular en el suelo, satélites arriba, señales y esferas de distancia.
  function fixScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    scene.add(new T.HemisphereLight(0xa8bfff, 0x1c1a22, 0.6));
    const light = new T.DirectionalLight(0xfff4e0, 1.6); light.position.set(-5, 8, 6); scene.add(light);
    const RE = 30;
    const earth = sphere(RE, 'earth', 2, 6); earth.position.y = -RE; earth.rotation.x = PI / 2; scene.add(earth);
    const me = new T.Vector3(0, 0.15, 0);
    const pinM = onGlow(new T.Mesh(new T.ConeGeometry(0.18, 0.45, 12), new T.MeshBasicMaterial({ color: 0xff3b30 }))); pinM.rotation.x = PI; pinM.position.set(0, 0.4, 0); scene.add(pinM);
    const satPos = [[-5.5, 7.5, -2], [4.5, 8.5, -3], [0.5, 9.5, 3], [6, 6, 3]].map((p) => new T.Vector3(...p));
    const nSat = variant === 'four' ? 4 : variant === 'spheres' ? 3 : 1;
    const sats = satPos.slice(0, Math.max(1, nSat)).map((p) => { const s = satellite(0.55); s.position.copy(p); s.lookAt(me); scene.add(s); return s; });
    const shells = [];
    if (variant === 'spheres' || variant === 'four') {
      satPos.slice(0, nSat).forEach((p, i) => {
        const r = p.distanceTo(me);
        const m = new T.Mesh(new T.SphereGeometry(r, 48, 32), new T.MeshBasicMaterial({ color: [0x8fd0ff, 0xffc94a, 0x6ee08a, 0xff8a7a][i], wireframe: true, transparent: true, opacity: 0.0 }));
        m.position.copy(p); scene.add(m); shells.push({ m, t: 0.3 + i * 0.8 });
      });
    }
    const pulses = [];
    if (variant === 'clock' || variant === 'listen' || variant === 'distance') {
      for (let i = 0; i < 4; i++) {
        const m = new T.Mesh(new T.SphereGeometry(1, 24, 16), new T.MeshBasicMaterial({ color: 0x8fd0ff, wireframe: true, transparent: true, opacity: 0.4 }));
        m.position.copy(satPos[0]); scene.add(m); pulses.push({ m, ph: i / 4 });
      }
    }
    const beam = new T.Line(new T.BufferGeometry().setFromPoints([satPos[0], me]), new T.LineBasicMaterial({ color: 0xffc94a, transparent: true, opacity: 0 }));
    onGlow(beam); scene.add(beam);
    const dot = glowSprite(0xffe08a, 0.6, 1); scene.add(dot); dot.visible = false;
    const meGlow = glowSprite(0xff5a4a, 1.4, 0); meGlow.position.copy(me); scene.add(meGlow);

    if (variant === 'clock') st.label({ text: 'reloj atómico', p: satPos[0].toArray(), t0: 0.4, color: COL.gold, size: 40, dy: -170, dx: 120 });
    if (variant === 'listen') st.label({ text: 'solo escucha', p: [0, 0.6, 0], t0: (d) => d * 0.35, color: COL.blue, size: 44, dy: 120 });
    if (variant === 'distance') st.label({ text: 'tiempo → distancia', p: () => dot.position.toArray(), t0: (d) => d * 0.3, color: COL.gold, size: 42, dx: 150 });
    if (variant === 'spheres') st.label({ text: 'aquí estás', p: [0, 0.6, 0], t0: (d) => d * 0.7, color: '#ff8a7a', size: 46, dy: 130 });
    if (variant === 'four') st.label({ text: 'corrige el reloj', p: satPos[3].toArray(), t0: (d) => d * 0.4, color: COL.white, size: 40, dy: -160, dx: -80 });

    const clocks = variant === 'clock' || variant === 'four';
    st.overlay = (ctx, lt, dur, FONT) => {
      if (!clocks) return;
      const idx = variant === 'four' ? 3 : 0;
      const p = st.project(satPos[idx].toArray());
      drawClock(ctx, p.x + (variant === 'four' ? -120 : 130), p.y + 90, 52, lt * 2, '', FONT, COL.gold);
      if (variant === 'four') { const q = st.project([0, 0.6, 0]); drawClock(ctx, q.x + 150, q.y - 60, 46, lt * 2 + (1 - smooth(prog(lt, dur * 0.4, dur * 0.3))) * 1.5, '', FONT, '#ff8a7a'); }
    };

    return (lt, dur) => {
      pulses.forEach((o) => {
        const f = (lt * 0.35 + o.ph) % 1; const r = 0.5 + f * satPos[0].distanceTo(me);
        o.m.scale.setScalar(r); o.m.material.opacity = 0.35 * (1 - f) * (variant === 'distance' ? 0.4 : 1);
      });
      if (variant === 'distance') {
        const f = (lt * 0.4) % 1.3; const q = clamp(f);
        beam.material.opacity = 0.8; dot.visible = f <= 1; dot.position.lerpVectors(satPos[0], me, q);
      }
      shells.forEach((o, i) => { o.m.material.opacity = 0.22 * smooth(prog(lt, o.t, 0.8)); });
      meGlow.material.opacity = variant === 'spheres' || variant === 'four' ? smooth(prog(lt, dur * 0.65, 0.5)) : 0;
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-2, 2, k), 4.0, 28); camera.lookAt(0, 4.8, 0);
      st.draw(lt, dur);
    };
  }

  function phoneScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    scene.add(new T.HemisphereLight(0xa8bfff, 0x1c1a22, 0.9));
    const light = new T.DirectionalLight(0xffffff, 1.2); light.position.set(2, 4, 6); scene.add(light);
    const earth = sphere(6, 'earth', 2, 5); earth.position.set(0, -2, -14); scene.add(earth);
    const ph = phone(scene);
    if (variant === 'micro') {
      st.label({ text: '1 microsegundo = 300 m', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 50 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      ph.grp.rotation.set(-0.15 + Math.sin(lt * 0.6) * 0.04, Math.sin(lt * 0.5) * 0.25, 0);
      const bounce = Math.abs(Math.sin(lt * 3)) * 0.1;
      if (variant === 'micro') { const j = smooth(prog(lt, dur * 0.45, 0.6)); ph.pin.position.set(lerp(0.05, 0.4, j), lerp(0.1, 0.75, j) + bounce, 0.2); }
      else ph.pin.position.y = 0.1 + bounce;
      ph.pinGlow.position.copy(ph.pin.position);
      earth.rotation.y = lt * 0.05;
      camera.position.set(0, 0.3, lerp(8.5, 7.8, k)); camera.lookAt(0, 0.1, 0);
      st.draw(lt, dur);
    };
  }

  function relScene(canvas) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff4e0, 2.2); light.position.set(-10, 4, 8); scene.add(light);
    const earth = sphere(2, 'earth', 2, 5); scene.add(earth);
    const sat = satellite(0.5); sat.position.set(3.2, 3.2, 0); scene.add(sat);
    st.label({ text: '+38 µs por día', screen: [540, 470], t0: (d) => d * 0.3, color: COL.gold, size: 50 });
    st.label({ text: 'sin corregir: km de error', screen: [540, 1000], t0: (d) => d * 0.6, color: '#ff8a7a', size: 44 });
    st.overlay = (ctx, lt, dur, FONT) => {
      const a = st.project([3.2, 3.2, 0]), b = st.project([0, 2, 0]);
      const drift = smooth(prog(lt, dur * 0.25, dur * 0.5)) * 1.2;
      drawClock(ctx, a.x, a.y + 110, 60, lt * 2 + drift, tr('en órbita'), FONT, COL.gold);
      drawClock(ctx, b.x - 180, b.y - 40, 60, lt * 2, tr('en la Tierra'), FONT, '#8fd0ff');
    };
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      earth.rotation.y = lt * 0.05; sat.rotation.y = lt * 0.3;
      camera.position.set(0.6, 1.2, lerp(11, 10, k)); camera.lookAt(0.8, 1.0, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  reg('gps_hook', (c) => phoneScene(c, 'hook'));
  reg('gps_micro', (c) => phoneScene(c, 'micro'));
  reg('gps_sats', (c) => orbitScene(c, 'sats'));
  reg('gps_outro', (c) => orbitScene(c, 'outro'));
  ['clock', 'listen', 'distance', 'spheres', 'four'].forEach((v) => reg(`gps_${v}`, (c) => fixScene(c, v)));
  reg('gps_relativity', (c) => relScene(c));
})();
