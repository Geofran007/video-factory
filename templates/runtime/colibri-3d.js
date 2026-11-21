// Escenas 3D "¿Cómo vuela un colibrí?" (col_*). Colibrí y flor low-poly de diseño propio, Three.js r149.
// El aleteo real (~50–80 por segundo) se muestra en cámara lenta.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow, tr } = K;

  K.addEN({
    'hasta ~80 aleteos por segundo': 'up to ~80 wingbeats a second', 'cámara lenta': 'slow motion', 'dibuja un ocho': 'traces a figure eight',
    'empuja al bajar': 'pushes on the way down', '…y al subir': '…and on the way up', 'quieto en el aire': 'still in midair',
    'hacia atrás': 'backward', 'latidos por minuto': 'beats per minute', 'modo ahorro': 'power-saving mode',
    '+100 especies en Ecuador': '100+ species in Ecuador',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  function bird(scene, palette = {}) {
    const P = { body: 0x2fae6a, belly: 0xe8eee0, throat: 0xd8304a, wing: 0x3a5a48, ...palette };
    const g = new T.Group(); scene.add(g);
    const body = new T.Mesh(new T.SphereGeometry(1, 16, 12), new T.MeshStandardMaterial({ color: P.body, metalness: 0.35, roughness: 0.35, flatShading: true }));
    body.scale.set(0.62, 0.3, 0.3); g.add(body);
    const belly = new T.Mesh(new T.SphereGeometry(1, 12, 10), new T.MeshStandardMaterial({ color: P.belly, flatShading: true }));
    belly.scale.set(0.45, 0.2, 0.24); belly.position.set(-0.05, -0.1, 0); g.add(belly);
    const head = new T.Mesh(new T.SphereGeometry(0.24, 14, 10), body.material); head.position.set(0.6, 0.12, 0); g.add(head);
    const throat = new T.Mesh(new T.SphereGeometry(0.17, 12, 8), new T.MeshStandardMaterial({ color: P.throat, metalness: 0.4, roughness: 0.3, flatShading: true }));
    throat.position.set(0.62, -0.02, 0); g.add(throat);
    const beak = new T.Mesh(new T.CylinderGeometry(0.012, 0.03, 0.85, 6), new T.MeshStandardMaterial({ color: 0x1a1a1a }));
    beak.rotation.z = -PI / 2; beak.position.set(1.22, 0.1, 0); g.add(beak);
    [-1, 1].forEach((s) => { const e = new T.Mesh(new T.SphereGeometry(0.04, 8, 6), new T.MeshBasicMaterial({ color: 0x050505 })); e.position.set(0.74, 0.2, s * 0.17); g.add(e); });
    const tail = new T.Mesh(new T.ConeGeometry(0.22, 0.6, 5), new T.MeshStandardMaterial({ color: P.wing, flatShading: true }));
    tail.rotation.z = PI / 2; tail.scale.z = 0.35; tail.position.set(-0.85, -0.04, 0); g.add(tail);
    const shape = new T.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(0.35, 0.5, 0.15, 1.35); shape.quadraticCurveTo(-0.1, 0.8, -0.18, 0.1); shape.closePath();
    const wGeo = new T.ShapeGeometry(shape); wGeo.rotateX(PI / 2);
    const wMat = new T.MeshStandardMaterial({ color: P.wing, side: T.DoubleSide, transparent: true, opacity: 0.92, flatShading: true });
    const wings = [-1, 1].map((s) => {
      const pivot = new T.Group(); pivot.position.set(0.12, 0.2, s * 0.14); pivot.rotation.order = 'YXZ'; g.add(pivot);
      const w = new T.Mesh(wGeo, wMat); w.scale.z = s; pivot.add(w);
      const tip = new T.Object3D(); tip.position.set(0.15, 0, s * 1.35); pivot.add(tip);
      return { pivot, s, tip };
    });
    // a: fase del aleteo (radianes). El ala barre adelante/atrás y gira al cambiar de sentido (forma de ocho).
    const flap = (a, amp = 1) => wings.forEach(({ pivot, s }) => {
      pivot.rotation.y = -s * (0.25 + 0.75 * amp * Math.sin(a));
      pivot.rotation.x = s * 0.22 * Math.sin(2 * a);
      pivot.rotation.z = 0.6 * Math.cos(a);
    });
    const fold = () => wings.forEach(({ pivot, s }) => { pivot.rotation.set(0.15 * s, -s * 1.35, 0.05); });
    return { g, flap, fold, wings };
  }

  function flower(scene, x, y, z, color = 0xe0304a) {
    const g = new T.Group(); g.position.set(x, y, z); scene.add(g);
    const stem = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 3, 6), new T.MeshStandardMaterial({ color: 0x3f8a3c }));
    stem.position.y = -1.5; g.add(stem);
    const trumpet = new T.Mesh(new T.CylinderGeometry(0.32, 0.08, 0.9, 10, 1, true), new T.MeshStandardMaterial({ color, side: T.DoubleSide, flatShading: true }));
    trumpet.rotation.z = -1.1; trumpet.position.set(-0.3, 0.1, 0); g.add(trumpet);
    const leaf = new T.Mesh(new T.SphereGeometry(0.3, 8, 6), new T.MeshStandardMaterial({ color: 0x3f8a3c, flatShading: true }));
    leaf.scale.set(1.4, 0.2, 0.6); leaf.position.set(0.25, -1.0, 0); g.add(leaf);
    return g;
  }

  function garden(scene, n = 14, seed = 3) {
    const r = rng(seed);
    const ground = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshStandardMaterial({ color: 0x1f4a2a })); ground.rotation.x = -PI / 2; ground.position.y = -3; scene.add(ground);
    for (let i = 0; i < n; i++) {
      const t = new T.Group();
      const top = new T.Mesh(new T.IcosahedronGeometry(1 + r(), 1), new T.MeshStandardMaterial({ color: r() > 0.5 ? 0x2f6b34 : 0x24582c, flatShading: true }));
      top.position.y = 2 + r(); t.add(top);
      t.position.set((r() - 0.5) * 24, -3, -6 - r() * 10); scene.add(t);
    }
  }

  function birdScene(canvas, variant) {
    const night = variant === 'torpor';
    const st = stage(canvas, { bg: night ? 0x060a16 : 0x0d2a3a, fog: [night ? 0x060a16 : 0x0d2a3a, 10, 30], stars: night, focus: 0.37, hemi: night ? 0.5 : 0.95, moon: night ? 0.5 : 1.2 });
    const { scene, camera } = st;
    garden(scene);
    const fl = flower(scene, 1.9, 0.3, 0);
    const B = bird(scene);
    const ghosts = [];
    if (variant === 'hook' || variant === 'hover' || variant === 'outro' || variant === 'back') {
      for (let i = 0; i < 3; i++) { const gb = bird(scene); gb.g.children.forEach((c) => { if (c.type === 'Mesh') c.visible = false; }); gb.wings.forEach((w) => { w.pivot.children[0].material = w.pivot.children[0].material.clone(); w.pivot.children[0].material.opacity = 0.25; }); ghosts.push(gb); }
    }
    const trail = [];
    let trailLine = null;
    if (variant === 'eight') {
      trailLine = onGlow(new T.Line(new T.BufferGeometry().setFromPoints(Array.from({ length: 80 }, () => new T.Vector3())), new T.LineBasicMaterial({ color: 0xffc94a })));
      scene.add(trailLine);
    }
    const arrowsDn = [];
    if (variant === 'lift') {
      const s = new T.Shape(); s.moveTo(-0.08, 0); s.lineTo(0.08, 0); s.lineTo(0.08, -0.4); s.lineTo(0.2, -0.4); s.lineTo(0, -0.7); s.lineTo(-0.2, -0.4); s.lineTo(-0.08, -0.4);
      for (let i = 0; i < 6; i++) { const m = onGlow(new T.Mesh(new T.ShapeGeometry(s), new T.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, side: T.DoubleSide }))); scene.add(m); arrowsDn.push({ m, x: -0.6 + (i % 3) * 0.6, z: i < 3 ? 0.5 : -0.5, ph: i / 6 }); }
      st.label({ text: 'empuja al bajar', screen: [300, 520], t0: 0.3, color: COL.blue, size: 38 });
      st.label({ text: '…y al subir', screen: [780, 600], t0: (d) => d * 0.45, color: COL.gold, size: 38 });
    }
    let branch = null;
    if (night) {
      branch = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 4, 6), new T.MeshStandardMaterial({ color: 0x5a3e28 }));
      branch.rotation.z = PI / 2; branch.position.set(0, -0.32, 0); scene.add(branch); fl.visible = false;
      const moon = glowSprite(0xdfe8ff, 2.5, 0.9); moon.position.set(-4, 5, -8); scene.add(moon);
      st.label({ text: 'modo ahorro', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.blue, size: 50 });
    }
    if (variant === 'beats') {
      st.label({ text: 'hasta ~80 aleteos por segundo', screen: [540, 1000], t0: 0.4, color: COL.gold, size: 44 });
      st.label({ text: 'cámara lenta', screen: [860, 470], t0: 0.2, color: COL.white, size: 32 });
    }
    if (variant === 'eight') st.label({ text: 'dibuja un ocho', p: () => trail.length ? trail[trail.length - 1].toArray() : [0, 0, 0], t0: (d) => d * 0.35, color: COL.gold, size: 42 });
    if (variant === 'hover') st.label({ text: 'quieto en el aire', p: [0, 0.6, 0], t0: (d) => d * 0.3, color: COL.white, size: 42, dy: 170 });
    if (variant === 'back') st.label({ text: 'hacia atrás', p: () => B.g.position.toArray(), t0: (d) => d * 0.35, color: COL.gold, size: 46, dy: 170 });
    if (variant === 'heart' || night) {
      st.overlay = (ctx, lt, dur, FONT) => {
        if (variant === 'heart') {
          const bpm = Math.round(1200 * smooth(prog(lt, 0.2, dur * 0.5)));
          const beat = 1 + 0.15 * Math.max(0, Math.sin(lt * 40));
          ctx.save(); ctx.translate(540, 860); ctx.scale(beat, beat); ctx.fillStyle = '#ff3b5c';
          ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(-70, -20, -40, -75, 0, -40); ctx.bezierCurveTo(40, -75, 70, -20, 0, 30); ctx.fill(); ctx.restore();
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `900 84px ${FONT}`; ctx.fillText(bpm.toLocaleString(window.VF.lang === 'en' ? 'en-US' : 'es-ES'), 540, 990);
          ctx.font = `800 34px ${FONT}`; ctx.fillText(tr('latidos por minuto'), 540, 1030);
        } else {
          const t = lerp(40, 18, smooth(prog(lt, 0.3, dur * 0.6)));
          ctx.save(); ctx.translate(900, 600);
          ctx.fillStyle = 'rgba(8,12,24,.88)'; ctx.strokeStyle = '#8fd0ff'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.roundRect(-34, -150, 68, 250, 34); ctx.fill(); ctx.stroke();
          const h = (t - 10) / 32 * 200; ctx.fillStyle = '#ff6a5a'; ctx.fillRect(-14, 80 - h, 28, h);
          ctx.fillStyle = '#fff'; ctx.font = `800 36px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(`${Math.round(t)} °C`, 0, 150);
          ctx.restore();
        }
      };
    }
    if (variant === 'outro') fade(st);
    const slow = variant === 'beats' || variant === 'eight' || variant === 'lift' ? 2.2 : 9;
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const a = lt * slow * PI * 2 / 2;
      let x = 0.35, y = 0.35 + Math.sin(lt * 2) * 0.05;
      if (variant === 'back') x = lerp(0.35, -1.6, smooth(prog(lt, dur * 0.25, dur * 0.6)));
      if (variant === 'hook') x = lerp(-2.5, 0.35, smooth(prog(lt, 0, dur * 0.5)));
      B.g.position.set(x, y, 0); B.g.rotation.set(0, 0, 0.55);
      if (night) { B.g.position.set(0, 0.0, 0); B.g.rotation.set(0, 0.2, 0.15); B.fold(); }
      else B.flap(a);
      ghosts.forEach((gb, i) => { gb.g.position.copy(B.g.position); gb.g.rotation.copy(B.g.rotation); gb.flap(a - (i + 1) * 0.6); });
      if (trailLine) {
        trail.length = 0;
        for (let i = 79; i >= 0; i--) { B.flap(a - i * 0.05); B.g.updateMatrixWorld(true); const v = new T.Vector3(); B.wings[1].tip.getWorldPosition(v); trail.push(v); }
        B.flap(a); trailLine.geometry.setFromPoints(trail); trailLine.material.opacity = smooth(prog(lt, 0.3, 0.6));
      }
      arrowsDn.forEach((o) => { const f = (lt * 0.8 + o.ph) % 1; o.m.position.set(o.x, -0.4 - f * 1.6, o.z); o.m.material.opacity = Math.sin(f * PI); });
      const close = variant === 'beats' || variant === 'eight' || variant === 'lift';
      if (close) { camera.position.set(lerp(-0.8, 0.4, k), 1.6, lerp(5.8, 5.4, k)); camera.lookAt(0.2, 0.2, 0); }
      else if (night) { camera.position.set(0.5, 0.9, 6.0); camera.lookAt(0, -0.1, 0); }
      else { camera.position.set(lerp(-1.0, 0.0, k), 1.3, lerp(8.8, 8.2, k)); camera.lookAt(0.4, 0.2, 0); }
      st.draw(lt, dur);
    };
  }

  // Muchos colibríes de colores alrededor de flores: Ecuador tiene más de 100 especies.
  function speciesScene(canvas) {
    const st = stage(canvas, { bg: 0x0d2a3a, fog: [0x0d2a3a, 10, 30], focus: 0.37, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    garden(scene, 18, 7);
    const pals = [
      { body: 0x2fae6a, throat: 0xd8304a }, { body: 0x2f7fd0, throat: 0xffc94a }, { body: 0x8e5cf7, throat: 0x6ee08a },
      { body: 0xd88a2f, throat: 0xff3b30 }, { body: 0x1fb8b0, throat: 0xff6aa8 }, { body: 0x4a4a52, throat: 0x2fd0ff },
    ];
    const r = rng(12);
    const birds = pals.map((p, i) => { const b = bird(scene, p); b.g.scale.setScalar(0.55); return { b, x: (r() - 0.5) * 5, y: -0.5 + r() * 2.6, z: (r() - 0.5) * 2 - 1, ph: r() * 6 }; });
    for (let i = 0; i < 6; i++) flower(scene, (r() - 0.5) * 6, -0.8 + r() * 1.5, -1.5 - r(), [0xe0304a, 0xff9a3c, 0xd04ad8][i % 3]);
    st.label({ text: '+100 especies en Ecuador', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 50 });
    return (lt, dur) => {
      birds.forEach((o, i) => {
        o.b.g.position.set(o.x + Math.sin(lt * 0.7 + o.ph) * 0.4, o.y + Math.sin(lt * 1.3 + o.ph) * 0.2, o.z);
        o.b.g.rotation.set(0, i % 2 ? PI : 0, 0.5); o.b.flap(lt * 9 * PI + o.ph);
      });
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-1, 1, k), 1.2, lerp(8, 7, k)); camera.lookAt(0, 0.8, -1);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'beats', 'eight', 'lift', 'hover', 'back', 'heart', 'torpor', 'outro'].forEach((v) => reg(`col_${v}`, (c) => birdScene(c, v)));
  reg('col_ecuador', (c) => speciesScene(c));
})();
