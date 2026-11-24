// Escenas 3D "¿Qué es un agujero negro?" (bh_*). Diseño propio con Three.js r149, usando el kit 3D.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, rng, glowSprite, onGlow, space, sphere, sunBall } = K;

  K.addEN({
    'estrella gigante': 'giant star', 'Sol': 'Sun', 'se queda sin combustible': 'runs out of fuel', 'supernova': 'supernova',
    'horizonte de eventos': 'event horizon', 'ni la luz escapa': 'not even light escapes', 'curva el espacio': 'it bends space',
    'espaguetificación': 'spaghettification', 'primera foto · 2019': 'first image · 2019', '≈ 6 km de ancho': '≈ 6 km wide',
    'la Tierra seguiría igual': 'Earth would keep orbiting', 'Tierra': 'Earth',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  let diskTexC = null;
  function diskTex() {
    if (diskTexC) return diskTexC;
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const gr = g.createRadialGradient(256, 256, 60, 256, 256, 256);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.12, 'rgba(255,240,200,1)'); gr.addColorStop(0.3, 'rgba(255,170,60,.95)');
    gr.addColorStop(0.6, 'rgba(220,80,30,.55)'); gr.addColorStop(1, 'rgba(120,20,10,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    const r = rng(3); g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 260; i++) { const a = r() * PI * 2, d = 80 + r() * 170; g.strokeStyle = `rgba(0,0,0,${0.15 + r() * 0.3})`; g.lineWidth = 2 + r() * 4; g.beginPath(); g.arc(256, 256, d, a, a + 0.3 + r() * 0.8); g.stroke(); }
    return (diskTexC = new T.CanvasTexture(c));
  }

  // Agujero negro: esfera negra, disco de acreción y anillo de luz desviada.
  function blackHole(scene, r = 1) {
    const g = new T.Group(); scene.add(g);
    const hole = new T.Mesh(new T.SphereGeometry(r, 48, 32), new T.MeshBasicMaterial({ color: 0x000000 })); g.add(hole);
    const disk = onGlow(new T.Mesh(new T.RingGeometry(r * 1.3, r * 4.2, 128), new T.MeshBasicMaterial({ map: diskTex(), transparent: true, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false })));
    disk.rotation.x = PI / 2 - 0.18; g.add(disk);
    const halo = onGlow(new T.Mesh(new T.RingGeometry(r * 1.15, r * 1.6, 128), new T.MeshBasicMaterial({ map: diskTex(), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.8 })));
    g.add(halo);
    const glow = glowSprite(0xff9a3c, r * 9, 0.35); g.add(glow);
    return { g, hole, disk, halo, spin: (lt) => { disk.rotation.z = lt * 0.4; halo.rotation.z = -lt * 0.2; } };
  }

  function holeScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const bh = blackHole(scene, 1);
    let photons = [], horizon = null, astro = null;
    if (variant === 'horizon' || variant === 'light') {
      horizon = new T.Mesh(new T.SphereGeometry(1.03, 32, 16), new T.MeshBasicMaterial({ color: 0x8fd0ff, wireframe: true, transparent: true, opacity: 0.25 }));
      scene.add(horizon); bh.disk.visible = variant !== 'light'; bh.halo.visible = false;
      const r = rng(4);
      for (let i = 0; i < (variant === 'light' ? 16 : 10); i++) { const s = glowSprite(0xffffff, 0.25, 1); scene.add(s); photons.push({ s, b: 0.6 + r() * 3.2, sgn: r() > 0.5 ? 1 : -1, ph: r(), z: (r() - 0.5) * 0.6 }); }
      st.label({ text: variant === 'light' ? 'ni la luz escapa' : 'horizonte de eventos', p: [0.75, 0.75, 0.3], t0: (d) => d * 0.3, color: COL.blue, size: 42 });
    }
    if (variant === 'spaghetti') {
      astro = new T.Group();
      const body = new T.Mesh(new T.CapsuleGeometry(0.18, 0.45, 6, 10), new T.MeshStandardMaterial({ color: 0xffffff }));
      const visor = new T.Mesh(new T.SphereGeometry(0.15, 12, 8), new T.MeshStandardMaterial({ color: 0xffc94a, metalness: 0.6, roughness: 0.2 })); visor.position.set(0, 0.42, 0.07);
      astro.add(body, visor); scene.add(astro);
      const l = new T.DirectionalLight(0xffffff, 1.2); l.position.set(2, 3, 5); scene.add(l);
      st.label({ text: 'espaguetificación', p: () => astro.position.toArray(), t0: (d) => d * 0.45, color: COL.gold, size: 42 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      bh.spin(lt);
      photons.forEach((o) => {
        const f = (lt * 0.25 + o.ph) % 1; const x = lerp(-6, 6, f);
        const capture = o.b < 1.8 || variant === 'light';
        let y = o.b * o.sgn;
        if (capture) { const pull = smooth(clamp((x + 3) / 3)); y = lerp(y, 0, pull); const xx = lerp(x, 0, pull * 0.9); o.s.position.set(xx, y, o.z); o.s.material.opacity = 1 - smooth(clamp((x + 0.5) / 1)); }
        else { y = o.b * o.sgn - o.sgn * 0.9 / (1 + x * x) ; o.s.position.set(x, y, o.z); o.s.material.opacity = Math.sin(f * PI); }
      });
      if (astro) {
        const f = smooth(prog(lt, 0.2, dur * 0.8)); const x = lerp(3.6, 1.6, f);
        astro.position.set(x, 0.3, 0.5); astro.rotation.z = PI / 2; astro.scale.set(lerp(2.2, 0.8, f), lerp(2.2, 9, f * f), lerp(2.2, 0.8, f));
      }
      const d = variant === 'outro' ? lerp(9, 14, k) : lerp(9.5, 8.5, k);
      camera.position.set(Math.sin(lt * 0.05) * 0.8, 1.0, d); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  function starScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const star = new T.Group(); scene.add(star);
    const body = onGlow(new T.Mesh(new T.SphereGeometry(2.4, 40, 24), new T.MeshBasicMaterial({ color: 0x9fc8ff })));
    const sg = glowSprite(0x8fb8ff, 9, 0.8); star.add(body, sg);
    let sun = null;
    if (variant === 'star') { sun = sunBall(scene, [3.6, -1.2, 0], 0.14); st.label({ text: 'Sol', p: [3.6, -1.0, 0], t0: (d) => d * 0.35, color: COL.gold, size: 38 }); st.label({ text: 'estrella gigante', p: [0, 2.4, 0], t0: 0.3, color: COL.blue, size: 42 }); star.position.x = -0.8; }
    let bh = null, blast = null;
    if (variant === 'collapse') {
      bh = blackHole(scene, 0.6); bh.g.visible = false;
      blast = glowSprite(0xffffff, 1, 0); scene.add(blast);
      st.label({ text: 'se queda sin combustible', screen: [540, 470], t0: 0.3, t1: (d) => d * 0.45, color: COL.white, size: 40 });
      st.label({ text: 'supernova', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.gold, size: 54 });
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      if (variant === 'collapse') {
        const t0 = dur * 0.45; const shrink = smooth(prog(lt, 0.3, t0 - 0.3));
        star.scale.setScalar(Math.max(0.001, lerp(1, 0.12, shrink))); star.visible = lt < t0;
        const b = prog(lt, t0, 1.4); blast.material.opacity = b > 0 && b < 1 ? Math.sin(b * PI) : 0; blast.scale.setScalar(2 + b * 22);
        bh.g.visible = lt > t0 + 0.4; if (bh.g.visible) bh.spin(lt);
      } else { body.rotation.y = lt * 0.1; sg.material.opacity = 0.75 + 0.1 * Math.sin(lt * 2); }
      camera.position.set(0, 0.6, lerp(17, 16, k)); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Lámina de espacio-tiempo que se hunde (embudo) con una bolita que cae en espiral.
  function gridScene(canvas) {
    const st = space(canvas, { focus: 0.4 });
    const { scene, camera } = st;
    const geo = new T.PlaneGeometry(14, 14, 70, 70); geo.rotateX(-PI / 2);
    const p = geo.attributes.position;
    const depthAt = (x, z) => -2.6 / (1 + (x * x + z * z) * 0.7);
    for (let i = 0; i < p.count; i++) p.setY(i, depthAt(p.getX(i), p.getZ(i)));
    const grid = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x5aa8ff, wireframe: true, transparent: true, opacity: 0.45 })); scene.add(grid);
    const core = new T.Mesh(new T.SphereGeometry(0.35, 24, 16), new T.MeshBasicMaterial({ color: 0x000000 })); core.position.y = -2.3; scene.add(core);
    const ring = glowSprite(0xff9a3c, 2.2, 0.6); ring.position.y = -2.2; scene.add(ring);
    const ball = onGlow(new T.Mesh(new T.SphereGeometry(0.16, 16, 10), new T.MeshBasicMaterial({ color: 0xffc94a }))); scene.add(ball);
    st.label({ text: 'curva el espacio', p: [3.5, depthAt(3.5, 0), 0], t0: 0.4, color: COL.blue, size: 42 });
    return (lt, dur) => {
      const f = clamp(lt / dur); const r = lerp(5.5, 0.3, smooth(f)); const a = f * 14;
      const x = Math.cos(a) * r, z = Math.sin(a) * r; ball.position.set(x, depthAt(x, z) + 0.16, z); ball.visible = r > 0.45;
      camera.position.set(0, 7, 10); camera.lookAt(0, -1, 0);
      st.draw(lt, dur);
    };
  }

  // Imagen estilizada tipo "primera foto": anillo naranja más brillante abajo.
  function photoScene(canvas) {
    const st = space(canvas, { focus: 0.37, stars: false });
    const { scene, camera } = st;
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 360; i++) {
      const a = i * PI / 180; const bright = 0.45 + 0.55 * Math.max(0, Math.sin(a));
      const x = 256 + Math.cos(a) * 150, y = 256 + Math.sin(a) * 150;
      const gr = g.createRadialGradient(x, y, 0, x, y, 70); gr.addColorStop(0, `rgba(255,${Math.round(150 + 80 * bright)},60,${0.09 * bright})`); gr.addColorStop(1, 'rgba(255,120,30,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 70, 0, PI * 2); g.fill();
    }
    g.filter = 'blur(10px)'; g.drawImage(c, 0, 0); g.filter = 'none';
    const img = new T.Mesh(new T.PlaneGeometry(6, 6), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true }));
    scene.add(img); onGlow(img);
    st.label({ text: 'primera foto · 2019', screen: [540, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 54 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      img.material.opacity = smooth(prog(lt, 0.1, 1.2)); img.rotation.z = Math.sin(lt * 0.2) * 0.04;
      camera.position.set(0, 0, lerp(10, 8.5, k)); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Si el Sol se volviera agujero negro: mediría ~6 km y la Tierra seguiría en su órbita.
  function sunScene(canvas) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const sun = sunBall(scene, [0, 0, 0], 0.9);
    const light = new T.PointLight(0xfff4e0, 2.4, 0, 0); scene.add(light);
    const bh = blackHole(scene, 0.12); bh.g.visible = false;
    const R = 4;
    const ringPts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * PI * 2; ringPts.push(new T.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R)); }
    scene.add(new T.Line(new T.BufferGeometry().setFromPoints(ringPts), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })));
    const earth = sphere(0.3, 'earth', 2, 3); scene.add(earth);
    st.label({ text: '≈ 6 km de ancho', p: [0, 0.1, 0], t0: (d) => d * 0.45, color: COL.gold, size: 42 });
    st.label({ text: 'la Tierra seguiría igual', p: () => earth.position.toArray(), t0: (d) => d * 0.65, color: COL.blue, size: 40 });
    return (lt, dur) => {
      const s = smooth(prog(lt, 0.4, dur * 0.35));
      sun.scale.setScalar(Math.max(0.001, 1 - s)); sun.visible = s < 0.99; light.intensity = 2.4 * (1 - s) + 0.4;
      bh.g.visible = s > 0.9; if (bh.g.visible) bh.spin(lt);
      const a = lt * 0.35; earth.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); earth.rotation.y = lt;
      const k = smooth(clamp(lt / dur));
      camera.position.set(0, lerp(5.5, 6.5, k), lerp(9.5, 9, k)); camera.lookAt(0, -0.3, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'horizon', 'light', 'spaghetti', 'outro'].forEach((v) => reg(`bh_${v}`, (c) => holeScene(c, v)));
  ['star', 'collapse'].forEach((v) => reg(`bh_${v}`, (c) => starScene(c, v)));
  reg('bh_grid', (c) => gridScene(c));
  reg('bh_photo', (c) => photoScene(c));
  reg('bh_sun', (c) => sunScene(c));
})();
