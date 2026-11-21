// Escenas 3D "¿Cómo nace un huracán?" (hur_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, ocean, glowSprite, onGlow, space, sphere, tr } = K;

  K.addEN({
    'mar a más de 26 °C': 'sea above 26 °C', 'aire caliente y húmedo': 'warm, moist air', 'baja presión': 'low pressure',
    'gira por la rotación\nde la Tierra': "spins because of\nEarth's rotation", 'ojo: calma': 'eye: calm', 'pared del ojo': 'eyewall',
    'sin agua caliente\nse debilita': 'no warm water,\nit weakens', 'casi sin huracanes': 'almost no hurricanes', 'Ecuador': 'Ecuador',
    'km/h': 'km/h', 'tierra': 'land',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  // Textura de espiral de nubes (vista desde arriba), con ojo en el centro.
  let spiralCache = null;
  function spiralTex() {
    if (spiralCache) return spiralCache;
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const r = rng(3);
    for (let arm = 0; arm < 4; arm++) for (let i = 0; i < 220; i++) {
      const t = i / 220; const a = arm * PI / 2 + t * 5.2; const rad = 30 + t * 210;
      const x = 256 + Math.cos(a) * rad + (r() - 0.5) * 30, y = 256 + Math.sin(a) * rad + (r() - 0.5) * 30;
      const s = 26 + (1 - t) * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(255,255,255,${0.5 * (1 - t * 0.6)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'destination-out';
    const eye = g.createRadialGradient(256, 256, 0, 256, 256, 30); eye.addColorStop(0, 'rgba(0,0,0,1)'); eye.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = eye; g.beginPath(); g.arc(256, 256, 30, 0, PI * 2); g.fill();
    return (spiralCache = new T.CanvasTexture(c));
  }

  function globeScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff4e0, 2.2); light.position.set(-6, 3, 10); scene.add(light);
    scene.add(new T.AmbientLight(0x404a60, 0.5));
    const R = 2.6;
    const earth = sphere(R, 'earth', 4, 5); scene.add(earth);
    const storms = [];
    const addStorm = (lat, lon, size, ccw) => {
      const s = new T.Sprite(new T.SpriteMaterial({ map: spiralTex(), transparent: true, depthWrite: false }));
      s.scale.setScalar(size); scene.add(s);
      storms.push({ s, lat, lon, ccw }); return s;
    };
    if (variant === 'hook' || variant === 'outro') addStorm(0.35, -0.25, 1.6, true);
    if (variant === 'equator') {
      addStorm(0.42, -0.6, 0.9, true); addStorm(0.38, 0.5, 0.8, true); addStorm(-0.4, 0.2, 0.85, false); addStorm(-0.36, -0.7, 0.7, false);
      const band = new T.Mesh(new T.CylinderGeometry(R * 1.01, R * 1.01, R * 0.18, 64, 1, true), new T.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false }));
      scene.add(band);
      const pin = onGlow(new T.Mesh(new T.SphereGeometry(0.09, 12, 8), new T.MeshBasicMaterial({ color: 0xff5a5a })));
      pin.position.set(Math.sin(-0.15) * R * 1.02, 0, Math.cos(-0.15) * R * 1.02); scene.add(pin);
      st.label({ text: 'casi sin huracanes', p: [R * 0.55, 0, R * 0.85], t0: (d) => d * 0.3, color: COL.gold, size: 40, dx: 120, dy: 60 });
      st.label({ text: 'Ecuador', p: pin.position.toArray(), t0: (d) => d * 0.55, color: '#ff8a7a', size: 40, dx: -120, dy: -120 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      storms.forEach((o) => {
        const lon = o.lon + (variant === 'hook' ? lt * 0.03 : 0);
        const v = new T.Vector3(Math.sin(lon) * Math.cos(o.lat), Math.sin(o.lat), Math.cos(lon) * Math.cos(o.lat)).multiplyScalar(R * 1.03);
        o.s.position.copy(v); o.s.material.rotation = (o.ccw ? 1 : -1) * lt * 0.8;
      });
      const d = variant === 'outro' ? lerp(13, 18, k) : lerp(13.5, 12.5, k);
      camera.position.set(0, 0.6, d); camera.lookAt(0, 0.1, 0);
      st.draw(lt, dur);
    };
  }

  // Huracán en 3D sobre el océano: bandas de nubes en espiral, pared del ojo y ojo.
  function hurricane(scene, scale = 1) {
    const g = new T.Group(); scene.add(g);
    const mat = new T.MeshStandardMaterial({ color: 0xeef2f8, flatShading: true, roughness: 1 });
    const r = rng(11);
    for (let arm = 0; arm < 4; arm++) for (let i = 0; i < 26; i++) {
      const t = i / 26; const a = arm * PI / 2 + t * 4.2; const rad = 1.2 + t * 4.2;
      const m = new T.Mesh(new T.IcosahedronGeometry(0.45 + (1 - t) * 0.35, 1), mat);
      m.position.set(Math.cos(a) * rad, 1.2 + (1 - t) * 0.6 + r() * 0.2, -Math.sin(a) * rad); m.scale.y = 0.55; g.add(m);
    }
    for (let i = 0; i < 22; i++) { const a = i / 22 * PI * 2; const m = new T.Mesh(new T.IcosahedronGeometry(0.55, 1), mat); m.position.set(Math.cos(a) * 1.0, 1.0 + (i % 3) * 0.35, Math.sin(a) * 1.0); m.scale.y = 1.4; g.add(m); }
    g.scale.setScalar(scale); return g;
  }

  // Flechas planas sobre el mar
  function flatArrow(color) {
    const s = new T.Shape(); s.moveTo(0, 0.12); s.lineTo(0.6, 0.12); s.lineTo(0.6, 0.28); s.lineTo(0.95, 0); s.lineTo(0.6, -0.28); s.lineTo(0.6, -0.12); s.lineTo(0, -0.12);
    const g = new T.ShapeGeometry(s); g.rotateX(-PI / 2);
    return onGlow(new T.Mesh(g, new T.MeshBasicMaterial({ color, transparent: true, side: T.DoubleSide })));
  }

  function seaScene(canvas, variant) {
    const st = stage(canvas, { fog: [0x0b1628, 18, 55], focus: 0.37 });
    const { scene, camera } = st;
    const sea = ocean(scene, { color: variant === 'warm' || variant === 'rise' ? 0x1f5a8a : 0x174e8a });
    const heat = [];
    const r = rng(5);
    if (variant === 'warm' || variant === 'rise') {
      const tint = new T.Mesh(new T.CircleGeometry(6, 48), new T.MeshBasicMaterial({ color: 0xff7a3c, transparent: true, opacity: 0.25, depthWrite: false }));
      tint.rotation.x = -PI / 2; tint.position.y = 0.12; scene.add(tint);
      for (let i = 0; i < 40; i++) { const s = glowSprite(i % 3 ? 0xffb070 : 0xffffff, 0.5, 0.6); scene.add(s); heat.push({ s, x: (r() - 0.5) * 7, z: (r() - 0.5) * 5, ph: r() }); }
    }
    const clouds = [];
    if (variant === 'rise') {
      const cm = new T.MeshStandardMaterial({ color: 0xeef2f8, flatShading: true });
      for (let i = 0; i < 16; i++) { const m = new T.Mesh(new T.IcosahedronGeometry(0.7 + r() * 0.5, 1), cm); m.position.set((r() - 0.5) * 3, 3.5 + r() * 2.4, (r() - 0.5) * 2); scene.add(m); clouds.push({ m, t: r() }); }
    }
    const arrows = [];
    if (variant === 'pull' || variant === 'spin') {
      for (let i = 0; i < 16; i++) { const m = flatArrow(0xffc94a); m.position.y = 0.2; scene.add(m); arrows.push({ m, a: i / 16 * PI * 2, ph: (i % 4) / 4 }); }
      const low = glowSprite(0x8fd0ff, 1.6, 0.8); low.position.y = 0.3; scene.add(low);
    }
    let hur = null;
    if (variant === 'eye' || variant === 'cat5' || variant === 'land') hur = hurricane(scene, variant === 'land' ? 0.6 : 1);
    let landM = null;
    if (variant === 'land') {
      landM = new T.Mesh(new T.BoxGeometry(14, 0.6, 20), new T.MeshStandardMaterial({ color: 0x4c8a3c, flatShading: true }));
      landM.position.set(9, 0.1, 0); scene.add(landM);
      st.label({ text: 'tierra', p: [6, 0.5, 2], t0: 0.3, color: COL.green, size: 38 });
      st.label({ text: 'sin agua caliente\nse debilita', p: () => [hur.position.x, 2.4 * hur.scale.x, 0], t0: (d) => d * 0.5, color: COL.white, size: 38, dy: 150 });
    }
    if (variant === 'warm') st.label({ text: 'mar a más de 26 °C', screen: [540, 1000], t0: 0.3, color: COL.orange, size: 50 });
    if (variant === 'rise') st.label({ text: 'aire caliente y húmedo', p: [0, 2, 0], t0: 0.4, color: COL.orange, size: 40, dx: 160 });
    if (variant === 'pull') st.label({ text: 'baja presión', p: [0, 0.3, 0], t0: 0.4, color: COL.blue, size: 44, dy: 160 });
    if (variant === 'spin') st.label({ text: 'gira por la rotación\nde la Tierra', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 42 });
    if (variant === 'eye') {
      st.label({ text: 'ojo: calma', p: [0, 0.3, 0], t0: (d) => d * 0.25, color: COL.blue, size: 42, dy: -180 });
      st.label({ text: 'pared del ojo', p: [1.0, 2.0, 0.6], t0: (d) => d * 0.55, color: COL.white, size: 40, dx: 160, dy: 120 });
    }
    if (variant === 'cat5') {
      st.overlay = (ctx, lt, dur, FONT) => {
        const v = 252 * smooth(prog(lt, 0.3, dur * 0.6)) + Math.sin(lt * 9) * 3 * (lt > dur * 0.6 ? 1 : 0);
        const cx = 540, cy = 880, R = 150;
        ctx.save(); ctx.lineCap = 'round';
        ctx.fillStyle = 'rgba(8,12,24,.85)'; ctx.beginPath(); ctx.arc(cx, cy, R + 30, PI, 2 * PI); ctx.lineTo(cx + R + 30, cy + 70); ctx.lineTo(cx - R - 30, cy + 70); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(cx, cy, R, PI, 2 * PI); ctx.stroke();
        ctx.strokeStyle = '#ff6a3c'; ctx.beginPath(); ctx.arc(cx, cy, R, PI, PI + PI * clamp(v / 300)); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `900 80px ${FONT}`; ctx.fillText(String(Math.round(v)), cx, cy - 10);
        ctx.font = `800 34px ${FONT}`; ctx.fillText(tr('km/h'), cx, cy + 40); ctx.restore();
      };
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      sea(lt);
      heat.forEach((o) => { const f = (lt * 0.35 + o.ph) % 1; o.s.position.set(o.x * (1 - f * 0.5), 0.2 + f * (variant === 'rise' ? 4 : 1.6), o.z * (1 - f * 0.5)); o.s.material.opacity = 0.6 * Math.sin(f * PI); });
      clouds.forEach((o) => { const p = outBack(prog(lt, dur * 0.3 + o.t * dur * 0.4, 0.6)); o.m.scale.setScalar(Math.max(0.001, p)); o.m.visible = p > 0.01; });
      arrows.forEach((o) => {
        const f = (lt * 0.3 + o.ph) % 1; const rad = lerp(5, 0.7, f);
        const curl = variant === 'spin' ? smooth(prog(lt, 0.3, dur * 0.5)) * 1.4 * f : 0;
        const a = o.a + curl + (variant === 'spin' ? lt * 0.25 : 0);
        o.m.position.set(Math.cos(a) * rad, 0.2, -Math.sin(a) * rad);
        o.m.rotation.y = a + PI + (variant === 'spin' ? -0.7 * smooth(prog(lt, 0.3, dur * 0.5)) : 0);
        o.m.material.opacity = Math.sin(f * PI);
      });
      if (hur) {
        hur.rotation.y = lt * 0.35;
        if (variant === 'land') { const p = smooth(prog(lt, 0.2, dur * 0.8)); hur.position.x = lerp(-3, 3.5, p); hur.scale.setScalar(lerp(0.8, 0.35, smooth(prog(lt, dur * 0.4, dur * 0.6)))); }
      }
      const k = smooth(clamp(lt / dur));
      if (variant === 'eye') { camera.position.set(lerp(-8, -6.5, k), lerp(12.5, 11, k), lerp(11.5, 10.5, k)); camera.lookAt(0, 0.4, 0); }
      else if (variant === 'cat5') { camera.position.set(-7.5, 8.5, 13.5); camera.lookAt(0, 0.8, 0); }
      else if (variant === 'land') { camera.position.set(0.5, 15, 13); camera.lookAt(0.8, 0, -1.5); }
      else if (variant === 'rise') { camera.position.set(lerp(-1, 1, k), 3.8, 14); camera.lookAt(0, 3.6, 0); }
      else { camera.position.set(lerp(-1, 1, k), 7.5, lerp(10, 9, k)); camera.lookAt(0, 0, 0); }
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'equator', 'outro'].forEach((v) => reg(`hur_${v}`, (c) => globeScene(c, v)));
  ['warm', 'rise', 'pull', 'spin', 'eye', 'cat5', 'land'].forEach((v) => reg(`hur_${v}`, (c) => seaScene(c, v)));
})();
