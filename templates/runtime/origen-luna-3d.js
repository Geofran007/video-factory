// Escenas 3D "¿Cómo nació la Luna?" (lun_*): hipótesis del gran impacto. Diseño propio con Three.js r149.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow, space, sphere } = K;

  K.addEN({
    'Tierra joven': 'young Earth', 'hace ~4.500 millones de años': '~4.5 billion years ago', 'Theia': 'Theia',
    'tamaño de Marte': 'Mars-sized', 'anillo de escombros': 'ring of debris', 'nace la Luna': 'the Moon is born',
    'muchísimo más cerca': 'much, much closer', 'roca lunar': 'Moon rock', 'roca terrestre': 'Earth rock', 'casi idénticas': 'nearly identical',
    'eje estable': 'steady axis', 'misiones Apolo': 'Apollo missions',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  // Planeta de magma: costra oscura con grietas de lava brillantes.
  function lavaWorld(r, seed = 1) {
    const geo = new T.IcosahedronGeometry(r, 5).toNonIndexed();
    const p = geo.attributes.position; const cols = new Float32Array(p.count * 3); const c = new T.Color();
    for (let f = 0; f < p.count; f += 3) {
      const x = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3 / r, y = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3 / r, z = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3 / r;
      const n = noise2(Math.atan2(z, x) * 3 + seed, y * 3.5) * 0.6 + noise2(x * 6, z * 6 + y * 4) * 0.4;
      if (n > 0.58) c.set(0xff7a22).lerp(new T.Color(0xffd060), (n - 0.58) * 3); else c.set(0x2a1c18).lerp(new T.Color(0x4a2a20), n);
      for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const m = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, emissive: 0x401008, emissiveIntensity: 0.6 }));
    const g = new T.Group(); g.add(m); g.add(glowSprite(0xff6a2a, r * 3.4, 0.35)); return g;
  }

  function cosmicScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff0d8, 1.6); light.position.set(-8, 3, 6); scene.add(light);
    scene.add(new T.AmbientLight(0x50404a, 0.6));
    const earth = lavaWorld(1.6); scene.add(earth);
    const theia = (() => { const g = sphere(0.85, 'moon', 9, 4); g.material.color.set(0xd8b0a0); scene.add(g); return g; })();
    const flash = glowSprite(0xfff2c0, 1, 0); scene.add(flash);
    const r = rng(5); const debris = [];
    if (['impact', 'ring', 'form', 'hook'].includes(variant)) {
      for (let i = 0; i < 260; i++) {
        const s = new T.Mesh(new T.IcosahedronGeometry(0.03 + r() * 0.07, 0), new T.MeshStandardMaterial({ color: r() > 0.5 ? 0xb8a090 : 0xff8a3a, emissive: 0x502010, emissiveIntensity: 0.5, flatShading: true }));
        scene.add(s); debris.push({ s, a: r() * PI * 2, rad: 2.4 + r() * 1.6, h: (r() - 0.5) * 0.25, v: 0.5 + r() * 0.5, dir: new T.Vector3(r() - 0.3, r() - 0.5, r() - 0.5).normalize() });
      }
    }
    let moon = null;
    if (variant === 'form' || variant === 'tilt' || variant === 'hook') { moon = sphere(0.45, 'moon', 5, 4); scene.add(moon); }
    let axis = null;
    if (variant === 'tilt') {
      earth.visible = false;
      const e2 = sphere(1.4, 'earth', 2, 5); e2.rotation.z = -0.41; scene.add(e2); earth.userData.e2 = e2;
      axis = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 4.4, 8), new T.MeshBasicMaterial({ color: 0xffffff })); axis.rotation.z = -0.41; scene.add(axis);
      st.label({ text: 'eje estable', p: [Math.sin(0.41) * 2.2, Math.cos(0.41) * 2.2, 0], t0: (d) => d * 0.35, color: COL.white, size: 40 });
    }
    if (variant === 'young') st.label({ text: 'hace ~4.500 millones de años', screen: [540, 1000], t0: 0.3, color: COL.orange, size: 42 });
    if (variant === 'young') st.label({ text: 'Tierra joven', p: [0, 1.6, 0], t0: 0.6, color: COL.orange, size: 40 });
    if (variant === 'theia') { st.label({ text: 'Theia', p: () => theia.position.toArray(), t0: 0.4, color: '#ffc0a0', size: 42 }); st.label({ text: 'tamaño de Marte', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.white, size: 44 }); }
    if (variant === 'ring') st.label({ text: 'anillo de escombros', p: [2.8, 0.2, 0], t0: (d) => d * 0.35, color: COL.gold, size: 40 });
    if (variant === 'form') st.label({ text: 'nace la Luna', p: () => moon.position.toArray(), t0: (d) => d * 0.6, color: COL.white, size: 44 });
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      earth.rotation.y = lt * 0.3;
      theia.visible = variant === 'theia' || variant === 'impact' || variant === 'hook';
      if (variant === 'theia') theia.position.set(lerp(6, 2.9, k), lerp(2.6, 1.3, k), lerp(-2, -0.4, k));
      let boom = 0;
      if (variant === 'impact' || variant === 'hook') {
        const t0 = variant === 'hook' ? dur * 0.25 : dur * 0.3;
        theia.position.set(lerp(3.5, 1.7, smooth(clamp(lt / t0))), lerp(1.8, 0.9, smooth(clamp(lt / t0))), 0);
        theia.visible = lt < t0 + 0.1; boom = prog(lt, t0, 1.6);
        flash.position.set(1.4, 0.7, 0.3); flash.material.opacity = boom > 0 && boom < 1 ? Math.sin(boom * PI) : 0; flash.scale.setScalar(1 + boom * 9);
      }
      debris.forEach((o, i) => {
        if (variant === 'impact' || variant === 'hook') {
          const f = boom; o.s.visible = f > 0; const d = f * 3.2 * o.v;
          o.s.position.set(1.4 + o.dir.x * d, 0.7 + o.dir.y * d, 0.3 + o.dir.z * d);
        } else {
          const gather = variant === 'form' ? smooth(prog(lt, 0.2, dur * 0.75)) : 0;
          const a = o.a + lt * 0.4 / Math.sqrt(o.rad);
          const mx = Math.cos(lt * 0.25) * 3.0, mz = -Math.sin(lt * 0.25) * 3.0;
          const x = lerp(Math.cos(a) * o.rad, mx + (o.dir.x * 0.3), gather), z = lerp(-Math.sin(a) * o.rad, mz + o.dir.z * 0.3, gather), y = lerp(o.h, o.dir.y * 0.3, gather);
          o.s.position.set(x, y, z); o.s.visible = gather < 0.97;
        }
      });
      if (moon && variant === 'form') { const g = smooth(prog(lt, dur * 0.45, dur * 0.5)); moon.scale.setScalar(Math.max(0.001, g)); moon.position.set(Math.cos(lt * 0.25) * 3.0, 0, -Math.sin(lt * 0.25) * 3.0); }
      if (moon && variant === 'hook') { moon.visible = false; }
      if (variant === 'tilt') {
        const e2 = earth.userData.e2; e2.rotation.y = lt * 0.6;
        moon.position.set(Math.cos(lt * 0.5) * 3.4, 0, -Math.sin(lt * 0.5) * 3.4);
      }
      if (variant === 'ring' || variant === 'form') { camera.position.set(0, lerp(5.5, 4.8, k), lerp(11.5, 11, k)); camera.lookAt(0, 0, 0); }
      else if (variant === 'outro') { camera.position.set(0, 1.5, lerp(8, 13, k)); camera.lookAt(0, 0, 0); }
      else { camera.position.set(lerp(0.6, 1.2, k), 1.0, lerp(12.5, 11.5, k)); camera.lookAt(0.6, 0.2, 0); }
      st.draw(lt, dur);
    };
  }

  // Vista desde la superficie de la Tierra joven: la Luna enorme en el cielo.
  function closeScene(canvas) {
    const st = stage(canvas, { bg: 0x0a0608, fog: [0x1a0a08, 12, 40], focus: 0.36, hemi: 0.5, moon: 0.8 });
    const { scene, camera } = st;
    const geo = new T.PlaneGeometry(80, 60, 80, 60); geo.rotateX(-PI / 2);
    const p = geo.attributes.position; const cols = new Float32Array(p.count * 3); const c = new T.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const n = noise2(x * 0.3, z * 0.3); p.setY(i, (n - 0.5) * 1.6); c.set(n > 0.62 ? 0xff7a22 : 0x2a1c18); cols.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, emissive: 0x301008, emissiveIntensity: 0.8 })));
    const moon = sphere(9, 'moon', 5, 5); moon.material.fog = false; moon.position.set(4, 14, -40); scene.add(moon);
    const l = new T.DirectionalLight(0xffffff, 1.6); l.position.set(-10, 6, 10); scene.add(l);
    st.label({ text: 'muchísimo más cerca', p: [4, 14, -40], t0: (d) => d * 0.35, color: COL.white, size: 44, dy: 0 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      moon.rotation.y = lt * 0.05;
      camera.position.set(0, 1.6, lerp(10, 8, k)); camera.lookAt(2.5, lerp(11, 12, k), -40);
      st.draw(lt, dur);
    };
  }

  function rocksScene(canvas) {
    const st = stage(canvas, { bg: 0x101420, fog: null, stars: false, focus: 0.37, hemi: 1.0, moon: 1.2 });
    const { scene, camera } = st;
    const rock = (x, color, seed) => {
      const g = new T.IcosahedronGeometry(0.9, 2); const p = g.attributes.position; const r = rng(seed);
      for (let i = 0; i < p.count; i++) { const k = 0.8 + r() * 0.35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); }
      g.computeVertexNormals(); const m = new T.Mesh(g, new T.MeshStandardMaterial({ color, flatShading: true, roughness: 1 })); m.position.x = x; scene.add(m); return m;
    };
    const a = rock(-1.6, 0x8a8a92, 3), b = rock(1.6, 0x7a6a5a, 8);
    const plinth = new T.Mesh(new T.BoxGeometry(6, 0.2, 2), new T.MeshStandardMaterial({ color: 0x2a3044 })); plinth.position.y = -0.9; scene.add(plinth);
    st.label({ text: 'roca lunar', p: [-1.6, 0.8, 0], t0: 0.3, color: COL.white, size: 38 });
    st.label({ text: 'roca terrestre', p: [1.6, 0.8, 0], t0: 0.7, color: COL.gold, size: 38 });
    st.label({ text: 'casi idénticas', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.green, size: 48 });
    st.label({ text: 'misiones Apolo', screen: [540, 470], t0: 0.2, color: COL.blue, size: 36 });
    return (lt, dur) => {
      a.rotation.y = lt * 0.4; b.rotation.y = -lt * 0.4;
      const k = smooth(clamp(lt / dur));
      camera.position.set(0, 1.4, lerp(9.5, 8.8, k)); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'young', 'theia', 'impact', 'ring', 'form', 'tilt', 'outro'].forEach((v) => reg(`lun_${v}`, (c) => cosmicScene(c, v)));
  reg('lun_close', (c) => closeScene(c));
  reg('lun_rocks', (c) => rocksScene(c));
})();
