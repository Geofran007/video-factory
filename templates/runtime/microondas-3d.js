// Escenas 3D "¿Cómo calienta un microondas?" (mic_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, rng, stage, glowSprite, onGlow } = K;

  K.addEN({
    'magnetrón': 'magnetron', 'microondas': 'microwaves', '~2.450 millones de vueltas por segundo': '~2.45 billion flips per second',
    'roce = calor': 'friction = heat', 'zonas calientes y frías': 'hot and cold spots', 'rejilla': 'mesh', 'la luz pasa': 'light gets through',
    'las microondas no': 'microwaves don’t', '¡nunca metal!': 'never metal!', 'hielo: se calienta peor': 'ice: heats poorly',
    '1945: un chocolate derretido': '1945: a melted chocolate bar',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  function oven(scene, open = false) {
    const g = new T.Group(); scene.add(g);
    const shell = new T.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.3, roughness: 0.5 });
    const W0 = 4.2, H0 = 2.6, D0 = 2.6;
    const back = new T.Mesh(new T.BoxGeometry(W0, H0, 0.1), shell); back.position.z = -D0 / 2; g.add(back);
    [[0, H0 / 2], [0, -H0 / 2]].forEach(([x, y]) => { const m = new T.Mesh(new T.BoxGeometry(W0, 0.1, D0), shell); m.position.set(x, y, 0); g.add(m); });
    [-1, 1].forEach((s) => { const m = new T.Mesh(new T.BoxGeometry(0.1, H0, D0), shell); m.position.x = s * W0 / 2; g.add(m); });
    const panel = new T.Mesh(new T.BoxGeometry(1.0, H0, 0.12), new T.MeshStandardMaterial({ color: 0x2a2e36 })); panel.position.set(W0 / 2 - 0.5, 0, D0 / 2); g.add(panel);
    const disp = onGlow(new T.Mesh(new T.PlaneGeometry(0.7, 0.3), new T.MeshBasicMaterial({ color: 0x6effa0 }))); disp.position.set(W0 / 2 - 0.5, 0.8, D0 / 2 + 0.07); g.add(disp);
    const inner = new T.PointLight(0xffe0a0, 0.5, 6); inner.position.set(-0.5, 0.9, 0); g.add(inner);
    const plate = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 0.06, 40), new T.MeshStandardMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.8 })); plate.position.set(-0.5, -H0 / 2 + 0.15, 0); g.add(plate);
    const cup = new T.Mesh(new T.CylinderGeometry(0.4, 0.34, 0.8, 24), new T.MeshStandardMaterial({ color: 0xd84a3a })); cup.position.set(-0.5, -H0 / 2 + 0.58, 0); g.add(cup);
    const door = new T.Group(); door.position.set(-W0 / 2, 0, D0 / 2 + 0.05); g.add(door);
    const glass = new T.Mesh(new T.PlaneGeometry(W0 - 1.0, H0 - 0.2), new T.MeshStandardMaterial({ color: 0x1a2430, transparent: true, opacity: open ? 0 : 0.45, side: T.DoubleSide, depthWrite: false })); glass.position.x = (W0 - 1.0) / 2; door.add(glass);
    return { g, plate, cup, door, inner, W0, H0, D0 };
  }

  function ovenScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x2a2018, fog: null, stars: false, focus: 0.37, hemi: 0.9, moon: 1.0 });
    const { scene, camera } = st;
    const counter = new T.Mesh(new T.BoxGeometry(12, 0.3, 5), new T.MeshStandardMaterial({ color: 0x8a6a4a })); counter.position.y = -1.45; scene.add(counter);
    const O = oven(scene, variant !== 'hook' && variant !== 'outro');
    const steam = [];
    for (let i = 0; i < 10; i++) { const s = glowSprite(0xffffff, 0.4, 0.4); scene.add(s); steam.push({ s, ph: i / 10 }); }
    const waves = [];
    if (variant === 'waves' || variant === 'uneven') {
      const mag = new T.Mesh(new T.BoxGeometry(0.6, 0.4, 0.6), new T.MeshStandardMaterial({ color: 0x8a8a92 })); mag.position.set(1.0, 0.9, -0.6); scene.add(mag);
      for (let i = 0; i < 8; i++) {
        const pts = []; for (let x = 0; x <= 1; x += 0.02) pts.push(new T.Vector3(0, 0, 0));
        const l = onGlow(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x8fd0ff, transparent: true }))); scene.add(l); waves.push({ l, i });
      }
      if (variant === 'waves') { st.label({ text: 'magnetrón', p: [1.0, 1.1, -0.6], t0: 0.3, color: COL.white, size: 38, dx: 100 }); st.label({ text: 'microondas', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.blue, size: 50 }); }
    }
    let heat = null;
    if (variant === 'uneven') {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      const r = rng(3); g.fillStyle = '#2a4aff'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 10; i++) { const x = r() * 256, y = r() * 256; const gr = g.createRadialGradient(x, y, 0, x, y, 70); gr.addColorStop(0, 'rgba(255,60,30,1)'); gr.addColorStop(1, 'rgba(255,60,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
      heat = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 0.3, 32), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c) })); heat.position.set(-0.5, -O.H0 / 2 + 0.33, 0); O.g.add(heat); O.cup.visible = false;
      st.label({ text: 'zonas calientes y frías', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.orange, size: 44 });
    }
    let fork = null; const sparks = [];
    if (variant === 'metal') {
      O.cup.visible = false;
      fork = new T.Group(); const mm = new T.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.9, roughness: 0.2 });
      const h = new T.Mesh(new T.BoxGeometry(1.2, 0.05, 0.12), mm); fork.add(h);
      for (let i = 0; i < 4; i++) { const t = new T.Mesh(new T.BoxGeometry(0.4, 0.04, 0.025), mm); t.position.set(0.8, 0, -0.06 + i * 0.04); fork.add(t); }
      fork.position.set(-0.5, -O.H0 / 2 + 0.25, 0); fork.rotation.y = 0.4; O.g.add(fork);
      for (let i = 0; i < 12; i++) { const s = glowSprite(0xbfe0ff, 0.4, 0); O.g.add(s); sparks.push({ s, ph: i * 0.37 }); }
      st.label({ text: '¡nunca metal!', screen: [540, 1000], t0: (d) => d * 0.3, color: '#ff8a7a', size: 52 });
    }
    let ice = null;
    if (variant === 'ice') {
      O.cup.visible = false;
      ice = new T.Mesh(new T.BoxGeometry(1.0, 0.6, 0.8), new T.MeshStandardMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.85, roughness: 0.1 })); ice.position.set(-0.5, -O.H0 / 2 + 0.48, 0); O.g.add(ice);
      st.label({ text: 'hielo: se calienta peor', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.blue, size: 46 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      O.plate.rotation.y = lt * 0.6; O.cup.position.x = -0.5 + Math.sin(lt * 0.6) * 0.4; O.cup.position.z = Math.cos(lt * 0.6) * 0.4;
      if (heat) heat.rotation.y = lt * 0.6;
      steam.forEach((o) => { const f = (lt * 0.3 + o.ph) % 1; o.s.position.set(O.cup.position.x + Math.sin(f * 7) * 0.1, -0.4 + f * 1.6, O.cup.position.z); o.s.material.opacity = (variant === 'hook' || variant === 'outro') ? 0.4 * Math.sin(f * PI) : 0; });
      waves.forEach((o) => {
        const p = o.l.geometry.attributes.position; const n = p.count;
        const a = o.i / 8 * PI * 0.9 + PI * 0.55;
        for (let j = 0; j < n; j++) { const t = j / (n - 1); const L = 2.6 * t; const sx = Math.cos(a) * L, sy = Math.sin(a) * L * 0.4 - L * 0.35; const wv = Math.sin(t * 30 - lt * 10) * 0.08; p.setXYZ(j, 1.0 + sx, 0.9 + sy + wv, -0.6 + t * 0.8); }
        p.needsUpdate = true; o.l.material.opacity = 0.8 * smooth(prog(lt, 0.2, 0.6));
      });
      sparks.forEach((o) => { const on = (Math.sin(lt * 13 + o.ph * 9) > 0.6); o.s.material.opacity = on ? 1 : 0; o.s.position.set(-0.5 + 0.8 + Math.sin(o.ph) * 0.2, -O.H0 / 2 + 0.3 + Math.cos(o.ph * 3) * 0.1, -0.06 + (o.ph % 0.12)); });
      if (ice) { const m = smooth(prog(lt, dur * 0.3, dur * 0.65)); ice.scale.set(1 - m * 0.15, 1 - m * 0.3, 1 - m * 0.15); }
      if (variant === 'hook' || variant === 'outro') { camera.position.set(lerp(-1.5, 0.5, k), 1.0, lerp(8, 7, k)); camera.lookAt(0, 0, 0); }
      else { camera.position.set(lerp(-2.4, -1.6, k), 1.6, lerp(5.8, 5.2, k)); camera.lookAt(-0.4, -0.3, 0); }
      st.draw(lt, dur);
    };
  }

  // Moléculas de agua que giran con el campo y se calientan.
  function moleculesScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const r = rng(6); const mols = [];
    const O = new T.MeshStandardMaterial({ color: 0xe84a3a, emissive: 0x000000 }), Hm = new T.MeshStandardMaterial({ color: 0xf4f4f4 });
    for (let i = 0; i < (variant === 'water' ? 9 : 30); i++) {
      const g = new T.Group(); const o = new T.Mesh(new T.SphereGeometry(0.22, 14, 10), O.clone()); g.add(o);
      [-1, 1].forEach((s) => { const h = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), Hm); const a = s * 52 * PI / 180; h.position.set(Math.sin(a) * 0.3, -Math.cos(a) * 0.3, 0); g.add(h); });
      g.position.set((r() - 0.5) * 5, (r() - 0.5) * 5, (r() - 0.5) * 2); scene.add(g); mols.push({ g, o, ph: r() * 6, base: g.position.clone() });
    }
    const field = onGlow(new T.Mesh(new T.PlaneGeometry(6, 0.05), new T.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.6 }))); field.position.z = -1.5; scene.add(field);
    if (variant === 'water') st.label({ text: '~2.450 millones de vueltas por segundo', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.blue, size: 36 });
    if (variant === 'friction') st.label({ text: 'roce = calor', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.orange, size: 52 });
    const hot = new T.Color(0xff6a2a);
    return (lt, dur) => {
      const flip = Math.sin(lt * 6);
      field.rotation.z = flip * 0.6;
      const h = variant === 'friction' ? smooth(prog(lt, 0.3, dur * 0.6)) : 0;
      mols.forEach((o) => {
        o.g.rotation.z = flip * 1.2 + o.ph * 0.2; o.g.rotation.y = lt * 0.3;
        const jit = 0.05 + h * 0.25;
        o.g.position.set(o.base.x + Math.sin(lt * 9 + o.ph) * jit, o.base.y + Math.cos(lt * 11 + o.ph) * jit, o.base.z);
        o.o.material.emissive.copy(hot).multiplyScalar(h * 0.8);
      });
      camera.position.set(0, 0, variant === 'water' ? 7.5 : 9); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Puerta con rejilla: agujeros más pequeños que la onda (≈12 cm).
  function doorScene(canvas) {
    const st = stage(canvas, { bg: 0x10161e, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#2a2e36'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#000'; for (let y = 4; y < 256; y += 16) for (let x = 4; x < 256; x += 16) { g.beginPath(); g.arc(x + ((y / 16) % 2) * 8, y, 5, 0, PI * 2); g.fill(); }
    const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(3, 3);
    const mesh = new T.Mesh(new T.PlaneGeometry(4, 4), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92 })); scene.add(mesh);
    const wave = onGlow(new T.Line(new T.BufferGeometry().setFromPoints(Array.from({ length: 120 }, () => new T.Vector3())), new T.LineBasicMaterial({ color: 0x8fd0ff })));
    scene.add(wave);
    const light = glowSprite(0xfff2c0, 0.4, 1); scene.add(light);
    st.label({ text: 'rejilla', p: [1.5, 1.5, 0], t0: 0.3, color: COL.white, size: 38 });
    st.label({ text: 'la luz pasa', p: () => light.position.toArray(), t0: (d) => d * 0.35, color: COL.gold, size: 38, dy: -120 });
    st.label({ text: 'las microondas no', p: [-0.5, 0.6, -0.5], t0: (d) => d * 0.55, color: COL.blue, size: 38 });
    return (lt, dur) => {
      const p = wave.geometry.attributes.position;
      for (let i = 0; i < 120; i++) { const t = i / 119; const z = lerp(-4, -0.05, t); p.setXYZ(i, -0.5 + Math.sin(t * 18 - lt * 8) * 0.35, 0.6, z); }
      p.needsUpdate = true;
      const f = (lt * 0.5) % 1; light.position.set(0.6, -0.6, lerp(-3, 3, f));
      camera.position.set(4.8, 1.8, 4.2); camera.lookAt(0, 0, -0.6);
      st.draw(lt, dur);
    };
  }

  // 1945: chocolate derretido en el bolsillo de un ingeniero junto a un radar.
  function candyScene(canvas) {
    const st = stage(canvas, { bg: 0x2a2418, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.0 });
    const { scene, camera } = st;
    const radar = new T.Group(); scene.add(radar);
    const dish = new T.Mesh(new T.SphereGeometry(1.4, 24, 12, 0, PI * 2, 0, PI / 2.6), new T.MeshStandardMaterial({ color: 0x8a9a8a, side: T.DoubleSide, metalness: 0.4 }));
    dish.rotation.x = -PI / 2.2; dish.position.set(-1.6, 1.4, -1); radar.add(dish);
    const mast = new T.Mesh(new T.CylinderGeometry(0.1, 0.14, 2.4, 8), dish.material); mast.position.set(-1.6, 0, -1); radar.add(mast);
    const bar = new T.Mesh(new T.BoxGeometry(1.4, 0.2, 0.6), new T.MeshStandardMaterial({ color: 0x5a3018, roughness: 0.6 })); bar.position.set(1.2, -0.4, 0.5); scene.add(bar);
    const wrap = new T.Mesh(new T.BoxGeometry(0.7, 0.22, 0.62), new T.MeshStandardMaterial({ color: 0xc8a040 })); wrap.position.set(1.55, -0.4, 0.5); scene.add(wrap);
    const drips = []; for (let i = 0; i < 6; i++) { const d = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), bar.material); d.position.set(0.7 + i * 0.15, -0.55, 0.6); d.scale.y = 1.8; scene.add(d); drips.push(d); }
    st.label({ text: '1945: un chocolate derretido', screen: [540, 1000], t0: 0.3, color: COL.gold, size: 44 });
    return (lt, dur) => {
      dish.rotation.z = lt * 0.4;
      const m = smooth(prog(lt, dur * 0.3, dur * 0.5)); bar.scale.set(1 + m * 0.2, 1 - m * 0.5, 1 + m * 0.1);
      drips.forEach((d, i) => { d.visible = m > 0.2; d.position.y = -0.55 - m * (0.2 + (i % 3) * 0.15); });
      camera.position.set(0.5, 1.4, lerp(9.5, 8.5, smooth(clamp(lt / dur)))); camera.lookAt(-0.2, 0.3, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'waves', 'uneven', 'metal', 'ice', 'outro'].forEach((v) => reg(`mic_${v}`, (c) => ovenScene(c, v)));
  ['water', 'friction'].forEach((v) => reg(`mic_${v}`, (c) => moleculesScene(c, v)));
  reg('mic_door', (c) => doorScene(c));
  reg('mic_candy', (c) => candyScene(c));
})();
