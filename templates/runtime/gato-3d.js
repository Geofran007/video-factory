// Escenas 3D "¿Por qué los gatos caen de pie?" (gato_*). Gato low-poly de diseño propio con Three.js r149.
// El reflejo de enderezamiento se muestra en cámara lenta: gira primero la mitad delantera y luego la trasera.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, rng, stage, glowSprite, onGlow, tr } = K;

  K.addEN({
    'boca arriba': 'upside down', 'oído interno': 'inner ear', 'primero gira adelante': 'the front turns first',
    'luego gira atrás': 'then the back turns', 'patas recogidas: gira rápido': 'legs tucked: spins fast',
    'patas estiradas: gira lento': 'legs out: spins slowly', 'patas como amortiguadores': 'legs as shock absorbers',
    'cámara lenta': 'slow motion', '1894: primera secuencia de fotos': '1894: first photo sequence', '3–4 semanas': '3–4 weeks',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  // Gato: dos mitades que giran por separado sobre el eje del cuerpo (x). Cabeza hacia +x.
  function cat(scene, { color = 0xe8913a, stripe = 0xb8662a } = {}) {
    const root = new T.Group(); scene.add(root);
    const fur = new T.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 });
    const dark = new T.MeshStandardMaterial({ color: stripe, flatShading: true, roughness: 0.9 });
    const front = new T.Group(), back = new T.Group(); root.add(front, back);
    const chest = new T.Mesh(new T.SphereGeometry(0.42, 14, 10), fur); chest.scale.set(1.1, 0.9, 0.9); chest.position.x = 0.35; front.add(chest);
    const head = new T.Group(); head.position.set(0.95, 0.25, 0); front.add(head);
    head.add(new T.Mesh(new T.SphereGeometry(0.32, 14, 10), fur));
    [-1, 1].forEach((s) => {
      const ear = new T.Mesh(new T.ConeGeometry(0.11, 0.22, 4), dark); ear.position.set(0.02, 0.3, s * 0.16); ear.rotation.x = s * 0.25; head.add(ear);
      const eye = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), new T.MeshBasicMaterial({ color: 0x2a3a10 })); eye.position.set(0.27, 0.08, s * 0.12); head.add(eye);
    });
    const nose = new T.Mesh(new T.SphereGeometry(0.04, 6, 4), new T.MeshBasicMaterial({ color: 0xd86a7a })); nose.position.set(0.32, -0.02, 0); head.add(nose);
    const ear3 = onGlow(new T.Mesh(new T.TorusGeometry(0.08, 0.025, 6, 16), new T.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0 })));
    ear3.position.set(-0.05, 0.05, 0.2); head.add(ear3);
    const hips = new T.Mesh(new T.SphereGeometry(0.4, 14, 10), fur); hips.scale.set(1.15, 0.85, 0.85); hips.position.x = -0.4; back.add(hips);
    const leg = (parent, x, s) => { const p = new T.Group(); p.position.set(x, -0.2, s * 0.2); parent.add(p); const l = new T.Mesh(new T.CylinderGeometry(0.07, 0.06, 0.55, 6), fur); l.position.y = -0.27; p.add(l); const paw = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), dark); paw.position.y = -0.55; p.add(paw); return p; };
    const legs = { f: [leg(front, 0.45, 1), leg(front, 0.45, -1)], b: [leg(back, -0.5, 1), leg(back, -0.5, -1)] };
    const tailCurve = new T.CatmullRomCurve3([new T.Vector3(-0.75, 0.05, 0), new T.Vector3(-1.15, 0.25, 0), new T.Vector3(-1.45, 0.55, 0.1), new T.Vector3(-1.55, 0.9, 0.05)]);
    back.add(new T.Mesh(new T.TubeGeometry(tailCurve, 20, 0.06, 6, false), dark));
    // Pose: rollF/rollB = giro de cada mitad; tuck: 1 patas recogidas, 0 estiradas hacia abajo.
    const pose = ({ rollF = 0, rollB = 0, tuckF = 0, tuckB = 0, arch = 0 }) => {
      front.rotation.x = rollF; back.rotation.x = rollB;
      legs.f.forEach((p) => { p.rotation.z = lerp(0, 1.2, tuckF); });
      legs.b.forEach((p) => { p.rotation.z = lerp(0, -1.2, tuckB); });
      front.rotation.z = arch * 0.15; back.rotation.z = -arch * 0.15;
    };
    return { root, pose, ear3 };
  }

  // Secuencia de enderezamiento en función de p (0..1): boca arriba → gira adelante → gira atrás → patas abajo.
  function righting(p) {
    const a = smooth(clamp(p / 0.4)), b = smooth(clamp((p - 0.35) / 0.4)), c = smooth(clamp((p - 0.75) / 0.25));
    return {
      rollF: lerp(PI, 0, a) - 0.25 * Math.sin(b * PI),
      rollB: lerp(PI, 0, b) + 0.3 * Math.sin(a * PI),
      tuckF: Math.sin(a * PI) * 0.9 * (1 - c), tuckB: Math.sin(b * PI) * 0.9 * (1 - c), arch: c,
    };
  }

  function room(scene) {
    const floor = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshStandardMaterial({ color: 0x8a6a4a })); floor.rotation.x = -PI / 2; scene.add(floor);
    const cushion = new T.Mesh(new T.CylinderGeometry(1.4, 1.5, 0.35, 24), new T.MeshStandardMaterial({ color: 0x5a7ad8, flatShading: true })); cushion.position.y = 0.17; scene.add(cushion);
    const wall = new T.Mesh(new T.PlaneGeometry(30, 14), new T.MeshStandardMaterial({ color: 0x2a3550 })); wall.position.set(0, 7, -5); scene.add(wall);
    return cushion;
  }

  function fallScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x1a2236, fog: null, stars: false, focus: 0.36, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    room(scene);
    const C = cat(scene);
    const slow = variant !== 'hook' && variant !== 'outro';
    if (slow && variant !== 'land') st.label({ text: 'cámara lenta', screen: [880, 470], t0: 0.2, color: COL.white, size: 30 });
    if (variant === 'upside') st.label({ text: 'boca arriba', p: () => C.root.position.toArray(), t0: 0.4, color: COL.white, size: 40, dy: 170 });
    if (variant === 'ear') st.label({ text: 'oído interno', p: () => { const v = new T.Vector3(); C.ear3.getWorldPosition(v); return v.toArray(); }, t0: (d) => d * 0.3, color: COL.blue, size: 40 });
    if (variant === 'front') st.label({ text: 'primero gira adelante', p: () => [C.root.position.x + 0.9, C.root.position.y, 0], t0: 0.4, color: COL.gold, size: 40 });
    if (variant === 'back') st.label({ text: 'luego gira atrás', p: () => [C.root.position.x - 0.5, C.root.position.y, 0], t0: 0.4, color: COL.gold, size: 40 });
    if (variant === 'tuck') {
      st.label({ text: 'patas recogidas: gira rápido', screen: [540, 470], t0: 0.3, color: COL.green, size: 38 });
      st.label({ text: 'patas estiradas: gira lento', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.blue, size: 38 });
    }
    if (variant === 'land') st.label({ text: 'patas como amortiguadores', p: [0, 0.4, 0], t0: (d) => d * 0.55, color: COL.gold, size: 40, dy: -150 });
    if (variant === 'outro') fade(st);
    const range = { hook: [0, 1], upside: [0, 0.05], ear: [0, 0.12], front: [0.0, 0.45], back: [0.35, 0.8], tuck: [0.1, 0.6], land: [0.7, 1], outro: [0, 1] }[variant];
    return (lt, dur) => {
      const k = clamp(lt / dur);
      let p = lerp(range[0], range[1], variant === 'hook' || variant === 'outro' ? smooth(clamp(lt / (dur * 0.6))) : k);
      const pose = righting(p);
      C.pose(pose);
      const fallY = variant === 'land' ? lerp(1.6, 0.95, smooth(clamp((lt - dur * 0.3) / (dur * 0.4)))) : lerp(4.2, 1.0, smooth(p));
      C.root.position.set(0, variant === 'hook' || variant === 'outro' ? lerp(4.5, 0.95, smooth(clamp(lt / (dur * 0.6)))) : fallY + (variant === 'land' ? 0 : 0.4), 0);
      C.root.rotation.y = variant === 'hook' ? 0.5 : 0.35;
      if (variant === 'ear') C.ear3.material.opacity = 0.6 + 0.4 * Math.sin(lt * 5);
      if (variant === 'land') { const sq = smooth(prog(lt, dur * 0.65, 0.25)) * (1 - smooth(prog(lt, dur * 0.75, 0.4))); C.root.scale.set(1, 1 - 0.15 * sq, 1); }
      const close = variant === 'ear' || variant === 'front' || variant === 'back' || variant === 'tuck';
      const cy = C.root.position.y;
      if (close) { camera.position.set(1.2, cy + 0.5, 6.4); camera.lookAt(0, cy - 0.2, 0); }
      else { camera.position.set(1.5, cy * 0.9 + 1.0, 9.5); camera.lookAt(0, cy * 0.9 + 0.1, 0); }
      st.draw(lt, dur);
    };
  }

  // Secuencia de fotos de 1894: varias poses del gato en fila, tono sepia.
  function photoScene(canvas) {
    const st = stage(canvas, { bg: 0x3a2c1c, fog: null, stars: false, focus: 0.37, hemi: 1.0, moon: 0.8 });
    const { scene, camera } = st;
    const cats = [];
    for (let i = 0; i < 8; i++) {
      const c = cat(scene, { color: 0xd8c0a0, stripe: 0x6a5a48 });
      const row = Math.floor(i / 4), col = i % 4;
      c.root.position.set(-3.3 + col * 2.2, 1.4 - row * 2.6, 0); c.root.scale.setScalar(0.75); c.root.rotation.y = 0.3;
      c.pose(righting(i / 7)); cats.push(c);
      const frame = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(2.0, 2.4)), new T.LineBasicMaterial({ color: 0xf0e0c0 }));
      frame.position.set(c.root.position.x, c.root.position.y, -0.6); scene.add(frame);
    }
    st.label({ text: '1894: primera secuencia de fotos', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 44 });
    return (lt, dur) => {
      cats.forEach((c, i) => { c.root.visible = lt > 0.2 + i * 0.25; });
      camera.position.set(0, 0.2, 10); camera.lookAt(0, 0.1, 0);
      st.draw(lt, dur);
    };
  }

  // Gatitos: el reflejo aparece a las 3–4 semanas.
  function kittenScene(canvas) {
    const st = stage(canvas, { bg: 0x1a2236, fog: null, stars: false, focus: 0.37, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    room(scene);
    const kits = [0xe8913a, 0x8a8a92, 0xf0f0f0].map((c, i) => { const k = cat(scene, { color: c, stripe: 0x5a4a3a }); k.root.scale.setScalar(0.55); k.root.position.set(-1.6 + i * 1.6, 0.7, 0); k.root.rotation.y = 0.4 + i * 0.3; k.pose({}); return k; });
    st.label({ text: '3–4 semanas', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 54 });
    return (lt, dur) => {
      kits.forEach((k, i) => { k.root.position.y = 0.7 + Math.abs(Math.sin(lt * 2 + i)) * 0.25; k.pose({ arch: 0.5 + 0.5 * Math.sin(lt * 2 + i) }); });
      const kk = smooth(clamp(lt / dur));
      camera.position.set(lerp(-1, 1, kk), 2.2, 6.5); camera.lookAt(0, 0.8, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'upside', 'ear', 'front', 'back', 'tuck', 'land', 'outro'].forEach((v) => reg(`gato_${v}`, (c) => fallScene(c, v)));
  reg('gato_photo', (c) => photoScene(c));
  reg('gato_kitten', (c) => kittenScene(c));
})();
