// Escenas 3D "¿Cómo ven tus ojos?" (ojo_*). Ojo estilizado de diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, rng, stage, glowSprite, onGlow, tr } = K;

  K.addEN({
    'córnea': 'cornea', 'iris': 'iris', 'pupila': 'pupil', 'cristalino': 'lens', 'retina': 'retina', 'nervio óptico': 'optic nerve',
    'mucha luz': 'bright light', 'poca luz': 'dim light', 'imagen al revés': 'upside-down image', 'bastones: ~120 millones': 'rods: ~120 million',
    'conos: ~6 millones': 'cones: ~6 million', 'el cerebro la endereza': 'the brain flips it', 'punto ciego': 'blind spot',
    '~3 saltos por segundo': '~3 jumps per second', 'cerebro': 'brain',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  let irisTexC = null;
  function irisTex() {
    if (irisTexC) return irisTexC;
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 20, 128, 128, 128);
    gr.addColorStop(0, '#2a1a0c'); gr.addColorStop(0.35, '#6b4520'); gr.addColorStop(0.7, '#3f7a6a'); gr.addColorStop(1, '#1f3a34');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const r = rng(3); g.strokeStyle = 'rgba(255,230,180,.25)';
    for (let i = 0; i < 160; i++) { const a = r() * PI * 2; g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40); g.lineTo(128 + Math.cos(a + 0.05) * 124, 128 + Math.sin(a + 0.05) * 124); g.stroke(); }
    return (irisTexC = new T.CanvasTexture(c));
  }

  // Ojo completo (mirando a +z). cut=true: corte a la mitad para ver el interior.
  function eyeball(scene, cut = false) {
    const g = new T.Group(); scene.add(g);
    const R = 2;
    const sclera = new T.Mesh(new T.SphereGeometry(R, 48, 32, cut ? -PI / 2 : 0, cut ? PI : PI * 2), new T.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 0.45, side: T.DoubleSide }));
    g.add(sclera);
    if (cut) {
      const retina = new T.Mesh(new T.SphereGeometry(R * 0.97, 48, 32, -PI / 2, PI * 0.62), new T.MeshStandardMaterial({ color: 0xd8584a, roughness: 0.7, side: T.DoubleSide }));
      g.add(retina);
      const vit = new T.Mesh(new T.CircleGeometry(R * 0.97, 48), new T.MeshStandardMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.12, side: T.DoubleSide }));
      vit.rotation.y = PI / 2; g.add(vit);
      const nerve = new T.Mesh(new T.CylinderGeometry(0.28, 0.35, 2.2, 14), new T.MeshStandardMaterial({ color: 0xf0c060 }));
      nerve.rotation.x = PI / 2; nerve.position.set(0, -0.25, -R - 0.9); g.add(nerve);
    }
    const iris = new T.Mesh(new T.RingGeometry(0.32, 0.85, 48), new T.MeshStandardMaterial({ map: irisTex(), side: T.DoubleSide }));
    iris.position.z = R + 0.01; g.add(iris);
    const pupil = new T.Mesh(new T.CircleGeometry(0.34, 32), new T.MeshBasicMaterial({ color: 0x050505, side: T.DoubleSide }));
    pupil.position.z = R + 0.015; g.add(pupil);
    const cornea = new T.Mesh(new T.SphereGeometry(0.95, 32, 16, 0, PI * 2, 0, PI / 2.6), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false, side: T.DoubleSide }));
    cornea.rotation.x = PI / 2; cornea.position.z = R * 0.72; g.add(cornea);
    const lens = new T.Mesh(new T.SphereGeometry(0.6, 32, 16), new T.MeshStandardMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.5, depthWrite: false }));
    lens.scale.z = 0.45; lens.position.z = R * 0.72; g.add(lens);
    const shine = glowSprite(0xffffff, 0.45, 0.8); shine.position.set(0.35, 0.4, R * 1.02); g.add(shine);
    return { g, iris, pupil, lens, R, setPupil(s) { pupil.scale.setScalar(s); iris.geometry.dispose(); iris.geometry = new T.RingGeometry(0.34 * s, 0.85, 48); } };
  }

  function faceScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, focus: 0.37, hemi: 0.9, moon: 1.2 });
    const { scene, camera } = st;
    const E = eyeball(scene);
    if (variant === 'pupil') {
      st.label({ text: 'iris', p: [0.65, 0.4, 1.85], t0: 0.3, color: COL.green, size: 38, dx: 120 });
      st.label({ text: 'pupila', p: [0, 0, 1.82], t0: 0.6, color: COL.white, size: 38, dy: -170 });
    }
    let saccade = variant === 'saccade';
    if (saccade) st.label({ text: '~3 saltos por segundo', screen: [540, 1000], t0: 0.4, color: COL.gold, size: 48 });
    if (variant === 'outro') fade(st);
    let lastS = -1;
    st.overlay = st.overlay || ((ctx, lt, dur) => {
      if (variant !== 'pupil') return;
      const bright = Math.sin(clamp(lt / dur) * PI * 2) > 0;
      ctx.save(); ctx.font = `800 40px ${getComputedStyle(document.body).fontFamily}`; ctx.textAlign = 'center';
      ctx.fillStyle = bright ? '#ffd27a' : '#8fd0ff'; ctx.fillText(tr(bright ? 'mucha luz' : 'poca luz'), 540, 470); ctx.restore();
    });
    const lamp = new T.PointLight(0xfff2c0, 0, 20); lamp.position.set(0, 2, 6); scene.add(lamp);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      let s = 1;
      if (variant === 'pupil') { const bright = Math.sin(clamp(lt / dur) * PI * 2); s = lerp(1.0, 2.0, (1 - bright) / 2); lamp.intensity = Math.max(0, bright) * 3; }
      if (variant === 'hook') s = 1.2 + 0.2 * Math.sin(lt * 1.5);
      if (Math.abs(s - lastS) > 0.01) { E.setPupil(s); lastS = s; }
      if (saccade) { const step = Math.floor(lt * 3); const r = Math.sin(step * 12.9898) * 43758.5453; const fx = (r - Math.floor(r)) - 0.5, fy = (Math.sin(step * 78.233) * 12345.678 % 1) * 0.5; E.g.rotation.set(fy * 0.4, fx * 0.7, 0); }
      else E.g.rotation.set(Math.sin(lt * 0.4) * 0.05, Math.sin(lt * 0.3) * 0.12, 0);
      camera.position.set(0, 0.3, lerp(variant === 'hook' ? 13 : 12, 11, k)); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Corte del ojo: partes, rayos que se cruzan y forman la imagen al revés, células y punto ciego.
  function sectionScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x0b1628, fog: null, focus: 0.37, hemi: 0.9, moon: 1.1 });
    const { scene, camera } = st;
    const E = eyeball(scene, true);
    E.g.rotation.y = -PI / 2;   // el ojo mira hacia -x: la luz entra desde la izquierda
    const R = E.R;
    // Objeto: un árbol a la izquierda
    const tree = new T.Group();
    const trunk = new T.Mesh(new T.CylinderGeometry(0.08, 0.1, 0.9, 6), new T.MeshStandardMaterial({ color: 0x7a5a3a })); trunk.position.y = 0.45;
    const top = new T.Mesh(new T.ConeGeometry(0.45, 1.2, 7), new T.MeshStandardMaterial({ color: 0x3f9a4c, flatShading: true })); top.position.y = 1.4;
    tree.add(trunk, top); tree.position.set(-6.5, -1, 0); scene.add(tree);
    const lensX = -R * 0.72;
    const rays = [];
    if (variant === 'rays' || variant === 'flip') {
      [[2.0, 0xffd27a], [-0.9, 0x8fd0ff]].forEach(([y0, c]) => {
        [-0.35, 0, 0.35].forEach((dy) => {
          const pts = [new T.Vector3(-6.5, y0, 0), new T.Vector3(lensX, dy, 0), new T.Vector3(R * 0.95, -y0 * 0.42 + dy * 0.05, 0)];
          const l = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: c, transparent: true, opacity: 0 }));
          onGlow(l); scene.add(l); rays.push(l);
        });
      });
    }
    let img = null;
    if (variant === 'rays' || variant === 'flip') {
      img = tree.clone(); img.scale.setScalar(0.42); img.rotation.z = PI; img.position.set(R * 0.86, 0.6, 0); scene.add(img);
      img.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0; } });
      st.label({ text: 'imagen al revés', p: [R * 0.9, -0.2, 0], t0: (d) => d * 0.55, color: COL.gold, size: 38, dx: 60, dy: -150 });
    }
    const brain = variant === 'flip' ? (() => {
      const b = new T.Mesh(new T.IcosahedronGeometry(1.3, 2), new T.MeshStandardMaterial({ color: 0xf2a6b0, flatShading: true })); b.scale.set(1.2, 0.9, 1); b.position.set(R + 3.4, 1.6, -0.5); scene.add(b); return b;
    })() : null;
    if (brain) {
      st.label({ text: 'el cerebro la endereza', p: [R + 3.4, 2.6, 0], t0: (d) => d * 0.6, color: '#ffb0c0', size: 38 });
      st.label({ text: 'nervio óptico', p: [R + 1.2, -0.25, 0], t0: (d) => d * 0.35, color: COL.gold, size: 34, dy: -140 });
    }
    if (variant === 'parts') {
      const L = (t, p, t0, col, dy = 120, dx = 0) => st.label({ text: t, p, t0, color: col, size: 36, dy, dx });
      L('córnea', [-R * 0.98, 0.5, 0], 0.3, COL.blue, 150, -40);
      L('iris', [-R * 0.9, -0.7, 0], 0.9, COL.green, -120, -60);
      L('cristalino', [lensX, 0.2, 0], 1.5, COL.gold, 230);
      L('retina', [R * 0.8, 1.0, 0], 2.1, '#ff8a7a', 120, 60);
      L('nervio óptico', [R + 0.9, -0.25, 0], 2.7, COL.white, -130, 40);
    }
    const cells = [];
    if (variant === 'cells' || variant === 'colors') {
      const r = rng(7);
      for (let i = 0; i < 90; i++) {
        const a = (r() - 0.5) * 2.2, b = -r() * 1.3;
        const cone = i % 14 === 0 || (variant === 'colors' && i % 3 === 0);
        const col = !cone ? 0xcfd8ff : [0xff4a4a, 0x4ad86a, 0x4a8aff][i % 3];
        const m = new T.Mesh(cone ? new T.ConeGeometry(0.06, 0.25, 6) : new T.CylinderGeometry(0.03, 0.03, 0.3, 6), new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.25 }));
        const v = new T.Vector3(Math.cos(a) * 0.93 * R, Math.sin(a) * 0.93 * R, b);
        m.position.copy(v); m.lookAt(0, 0, 0); m.rotateX(PI / 2); scene.add(m); cells.push(m);
      }
      if (variant === 'cells') {
        st.label({ text: 'bastones: ~120 millones', screen: [540, 470], t0: 0.3, color: '#cfd8ff', size: 40 });
        st.label({ text: 'conos: ~6 millones', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.gold, size: 42 });
      }
    }
    let blind = null;
    if (variant === 'blind') {
      blind = glowSprite(0x000000, 0.1, 0);
      const spot = onGlow(new T.Mesh(new T.CircleGeometry(0.3, 24), new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true })));
      spot.position.set(R * 0.97, -0.25, 0); spot.rotation.y = -PI / 2; scene.add(spot); blind = spot;
      st.label({ text: 'punto ciego', p: [R * 0.97, -0.25, 0], t0: (d) => d * 0.3, color: COL.gold, size: 42, dx: -60 });
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      rays.forEach((l, i) => { l.material.opacity = smooth(prog(lt, 0.2 + (i % 3) * 0.2, 0.8)) * 0.9; });
      if (img) img.traverse((o) => { if (o.material) o.material.opacity = smooth(prog(lt, dur * 0.45, 0.6)); });
      if (brain) brain.rotation.y = lt * 0.3;
      if (blind) blind.material.opacity = 0.6 + 0.4 * Math.sin(lt * 4);
      cells.forEach((m, i) => { m.visible = smooth(prog(lt, 0.2 + (i / cells.length) * dur * 0.4, 0.3)) > 0.5; });
      const zoom = variant === 'cells' || variant === 'colors' || variant === 'blind';
      if (variant === 'flip') { camera.position.set(1.2, 1.2, 15); camera.lookAt(0.6, 0.4, 0); }
      else if (zoom) { camera.position.set(lerp(-1.2, -0.5, k), 0.4, lerp(8.2, 7.6, k)); camera.lookAt(1.0, 0, 0); }
      else { camera.position.set(lerp(-1.4, -0.6, k), 0.8, lerp(12.5, 11.5, k)); camera.lookAt(-1.6, 0.2, 0); }
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'pupil', 'saccade', 'outro'].forEach((v) => reg(`ojo_${v}`, (c) => faceScene(c, v)));
  ['parts', 'rays', 'flip', 'cells', 'colors', 'blind'].forEach((v) => reg(`ojo_${v}`, (c) => sectionScene(c, v)));
})();
