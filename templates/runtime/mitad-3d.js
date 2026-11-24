// Escenas 3D "La Mitad del Mundo" (mit_*): curiosidades de vivir en la línea ecuatorial. Diseño propio, Three.js r149.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K || !K.sphere) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, rng, stage, glowSprite, onGlow, space, sphere, sunBall, tr } = K;

  K.addEN({
    'línea ecuatorial': 'equator line', 'Ecuador': 'Ecuador', '≈ 1.670 km/h': '≈ 1,670 km/h', 'polo: ~0 km/h': 'pole: ~0 km/h',
    'abultada en el ecuador': 'bulging at the equator', '≈ 21 km más de radio': '≈ 21 km wider radius', 'en el polo': 'at the pole',
    'en el ecuador': 'at the equator', 'kg': 'kg', '12 h de día · 12 h de noche': '12 h day · 12 h night', 'sin sombra': 'no shadow',
    'marzo y septiembre': 'March and September', 'el remolino del lavabo ✗': 'the sink whirlpool ✗', 'monumento': 'monument',
    'línea real (GPS)': 'real line (GPS)', '≈ 240 m': '≈ 240 m',
  });

  const fade = (st) => { st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }; };

  function globeScene(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff4e0, 2.0); light.position.set(-6, 3, 8); scene.add(light);
    scene.add(new T.AmbientLight(0x404a60, 0.6));
    const R = 2.4;
    const earth = sphere(R, 'earth', 2, 5); scene.add(earth);
    const eq = onGlow(new T.Mesh(new T.TorusGeometry(R * 1.01, 0.035, 8, 160), new T.MeshBasicMaterial({ color: 0xffc94a, transparent: true })));
    eq.rotation.x = PI / 2; scene.add(eq);
    const pin = new T.Group();
    const head = onGlow(new T.Mesh(new T.SphereGeometry(0.12, 12, 8), new T.MeshBasicMaterial({ color: 0xff5a5a })));
    head.position.y = 0.4; const stick = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.4, 6), new T.MeshBasicMaterial({ color: 0xffffff })); stick.position.y = 0.2;
    pin.add(head, stick); earth.add(pin);
    const lon = -0.35; pin.position.set(Math.sin(lon) * R, 0, Math.cos(lon) * R); pin.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), pin.position.clone().normalize());
    const pinW = () => { const v = new T.Vector3(); head.getWorldPosition(v); return v.toArray(); };
    if (variant === 'hook' || variant === 'name') {
      st.label({ text: 'línea ecuatorial', p: [R * 0.72, 0, R * 0.72], t0: 0.3, color: COL.gold, size: 40, dx: 60, dy: -150 });
      st.label({ text: 'Ecuador', p: pinW, t0: (d) => d * 0.4, color: '#ff8a7a', size: 42 });
    }
    if (variant === 'spin') {
      st.label({ text: '≈ 1.670 km/h', p: pinW, t0: 0.4, color: COL.gold, size: 46 });
      st.label({ text: 'polo: ~0 km/h', p: [0, R * 1.05, 0], t0: (d) => d * 0.5, color: COL.blue, size: 36, dy: 90 });
    }
    if (variant === 'bulge') {
      st.label({ text: 'abultada en el ecuador', screen: [540, 470], t0: 0.3, color: COL.white, size: 40 });
      st.label({ text: '≈ 21 km más de radio', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.gold, size: 44 });
    }
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      earth.rotation.y = lt * (variant === 'spin' ? 0.9 : 0.15);
      const sq = variant === 'bulge' ? smooth(prog(lt, 0.3, dur * 0.5)) * 0.22 : 0;   // exagerado
      earth.scale.set(1 + sq, 1 - sq * 0.6, 1 + sq); eq.scale.set(1 + sq, 1 + sq, 1);
      eq.material.opacity = 0.75 + 0.25 * Math.sin(lt * 3);
      const d = variant === 'outro' ? lerp(12.5, 17, k) : lerp(12.5, 11.5, k);
      camera.position.set(0, variant === 'spin' ? 2.5 : 0.8, d); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // Balanza: la misma persona marca un poco menos en el ecuador (≈0,5 % menos de gravedad efectiva).
  function weightScene(canvas) {
    const st = stage(canvas, { bg: 0x10202e, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const scale = (x, label, color) => {
      const g = new T.Group(); g.position.x = x; scene.add(g);
      const base = new T.Mesh(new T.BoxGeometry(1.6, 0.25, 1.6), new T.MeshStandardMaterial({ color: 0xeef0f4, flatShading: true })); g.add(base);
      const person = new T.Group(); const body = new T.Mesh(new T.CylinderGeometry(0.28, 0.34, 1.2, 12), new T.MeshStandardMaterial({ color })); body.position.y = 0.75;
      const headM = new T.Mesh(new T.SphereGeometry(0.26, 14, 10), new T.MeshStandardMaterial({ color: 0xf1c7a0 })); headM.position.y = 1.6; person.add(body, headM); g.add(person);
      st.label({ text: label, p: [x, 2.1, 0], t0: 0.3, color: COL.white, size: 38 });
      return g;
    };
    scale(-1.6, 'en el polo', 0x6a8aff); scale(1.6, 'en el ecuador', 0xffc94a);
    st.overlay = (ctx, lt, dur, FONT) => {
      const p = smooth(prog(lt, 0.4, dur * 0.5));
      const vals = [70.0, lerp(70.0, 69.65, p)];
      [[-1.6, vals[0]], [1.6, vals[1]]].forEach(([x, v]) => {
        const q = st.project([x, 0.2, 0.8]);
        ctx.save(); ctx.fillStyle = 'rgba(8,12,24,.9)'; ctx.beginPath(); ctx.roundRect(q.x - 120, q.y + 10, 240, 90, 18); ctx.fill();
        ctx.fillStyle = '#6effa0'; ctx.font = `900 54px ${FONT}`; ctx.textAlign = 'center';
        ctx.fillText(`${v.toFixed(2).replace('.', window.VF.lang === 'en' ? '.' : ',')} ${tr('kg')}`, q.x, q.y + 74); ctx.restore();
      });
    };
    return (lt, dur) => {
      camera.position.set(0, 1.8, 11); camera.lookAt(0, 0.8, 0);
      st.draw(lt, dur);
    };
  }

  // Día y noche iguales; sin sombra al mediodía en marzo y septiembre.
  function sunScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x4f9be8, fog: null, stars: false, focus: 0.38, hemi: 1.0, moon: 0.2 });
    const { scene, camera } = st;
    const ground = new T.Mesh(new T.CircleGeometry(6, 48), new T.MeshStandardMaterial({ color: 0x5a9a4a })); ground.rotation.x = -PI / 2; scene.add(ground);
    const line = onGlow(new T.Mesh(new T.BoxGeometry(12, 0.03, 0.12), new T.MeshBasicMaterial({ color: 0xffc94a }))); line.position.y = 0.02; scene.add(line);
    const stick = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.6, 8), new T.MeshStandardMaterial({ color: 0x8a6a4a })); stick.position.y = 0.8; scene.add(stick);
    const sh = new T.Mesh(new T.PlaneGeometry(1, 0.12), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 })); sh.rotation.x = -PI / 2; sh.position.y = 0.03; scene.add(sh);
    const sun = glowSprite(0xfff2c0, 2.6, 1); scene.add(sun);
    if (variant === 'shadow') { st.label({ text: 'sin sombra', p: [0, 0, 0], t0: (d) => d * 0.6, color: COL.white, size: 44, dy: -150 }); st.label({ text: 'marzo y septiembre', screen: [540, 470], t0: 0.3, color: COL.gold, size: 40 }); }
    if (variant === 'day') st.label({ text: '12 h de día · 12 h de noche', screen: [540, 1000], t0: 0.3, color: COL.gold, size: 44 });
    const sky0 = new T.Color(0x4f9be8), sky1 = new T.Color(0x0a1428);
    return (lt, dur) => {
      const k = clamp(lt / dur);
      const a = variant === 'day' ? lerp(-0.1, PI * 2 - 0.1, k) : lerp(0.5, PI / 2, smooth(clamp(lt / (dur * 0.7))));
      const R = 6; sun.position.set(Math.cos(a) * R, Math.sin(a) * R, -1.5);
      const elev = Math.sin(a);
      scene.background.copy(sky1).lerp(sky0, clamp(elev * 2 + 0.3));
      const len = elev > 0.05 ? Math.min(4, 1.6 * Math.cos(a) / elev) : 0;
      sh.scale.x = Math.max(0.001, Math.abs(len)); sh.position.x = -len / 2; sh.visible = elev > 0.05 && Math.abs(len) > 0.02;
      camera.position.set(0, 3.4, 12); camera.lookAt(0, 2.6, 0);
      st.draw(lt, dur);
    };
  }

  // El truco del lavabo en la línea: el giro del agua no lo decide la rotación de la Tierra a esa escala.
  function drainScene(canvas) {
    const st = stage(canvas, { bg: 0x10202e, fog: null, stars: false, focus: 0.38, hemi: 0.95, moon: 1.2 });
    const { scene, camera } = st;
    const basin = new T.Mesh(new T.CylinderGeometry(1.6, 1.2, 0.9, 32, 1, true), new T.MeshStandardMaterial({ color: 0xf4f4f4, side: T.DoubleSide })); scene.add(basin);
    const water = new T.Mesh(new T.CircleGeometry(1.5, 40), new T.MeshStandardMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.7 })); water.rotation.x = -PI / 2; water.position.y = 0.2; scene.add(water);
    const swirl = []; for (let i = 0; i < 30; i++) { const s = glowSprite(0xffffff, 0.12, 0.8); scene.add(s); swirl.push({ s, r: 0.2 + (i % 10) * 0.12, ph: i * 0.7 }); }
    const line = onGlow(new T.Mesh(new T.BoxGeometry(5, 0.02, 0.08), new T.MeshBasicMaterial({ color: 0xffc94a }))); line.position.y = -0.46; scene.add(line);
    st.label({ text: 'el remolino del lavabo ✗', screen: [540, 470], t0: (d) => d * 0.3, color: '#ff8a7a', size: 42 });
    return (lt, dur) => {
      const dir = Math.floor(lt / (dur / 3)) % 2 ? -1 : 1;
      swirl.forEach((o) => { const a = o.ph + dir * lt * (1.2 / o.r); o.s.position.set(Math.cos(a) * o.r, 0.22, Math.sin(a) * o.r); });
      camera.position.set(0, 3.2, 4.2); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  // El monumento de la Mitad del Mundo y la línea real medida con GPS, unos 240 m al norte.
  function monumentScene(canvas) {
    const st = stage(canvas, { bg: 0x4f9be8, fog: [0x9fc8f0, 30, 90], stars: false, focus: 0.37, hemi: 1.0, moon: 1.2 });
    const { scene, camera } = st;
    const ground = new T.Mesh(new T.PlaneGeometry(80, 80), new T.MeshStandardMaterial({ color: 0x8a9a5a })); ground.rotation.x = -PI / 2; scene.add(ground);
    const mon = new T.Group(); scene.add(mon);
    const stone = new T.MeshStandardMaterial({ color: 0xd8c8a8, flatShading: true });
    const base = new T.Mesh(new T.BoxGeometry(3, 0.6, 3), stone); base.position.y = 0.3; mon.add(base);
    const tower = new T.Mesh(new T.CylinderGeometry(0.9, 1.3, 6, 4), stone); tower.rotation.y = PI / 4; tower.position.y = 3.6; mon.add(tower);
    const globe = new T.Mesh(new T.SphereGeometry(0.9, 24, 16), new T.MeshStandardMaterial({ color: 0x8a7a5a, metalness: 0.5, roughness: 0.4 })); globe.position.y = 7.5; mon.add(globe);
    const painted = onGlow(new T.Mesh(new T.BoxGeometry(30, 0.03, 0.18), new T.MeshBasicMaterial({ color: 0xffc94a }))); painted.position.y = 0.62; scene.add(painted);
    const real = onGlow(new T.Mesh(new T.BoxGeometry(30, 0.03, 0.22), new T.MeshBasicMaterial({ color: 0xff5a5a }))); real.position.set(0, 0.05, -12); scene.add(real);
    st.label({ text: 'monumento', p: [0, 6, 0], t0: 0.3, color: COL.gold, size: 38, dx: 130 });
    st.label({ text: 'línea real (GPS)', p: [-6, 0.1, -12], t0: (d) => d * 0.45, color: '#ff8a7a', size: 38 });
    st.label({ text: '≈ 240 m', p: [4, 0.1, -6], t0: (d) => d * 0.6, color: COL.white, size: 44, dy: 60 });
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      real.material.opacity = 1; real.visible = lt > dur * 0.35;
      camera.position.set(lerp(15, 11, k), lerp(12, 18, k), lerp(22, 18, k)); camera.lookAt(0, 1.5, -5);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'name', 'spin', 'bulge', 'outro'].forEach((v) => reg(`mit_${v}`, (c) => globeScene(c, v)));
  reg('mit_weight', (c) => weightScene(c));
  ['day', 'shadow'].forEach((v) => reg(`mit_${v}`, (c) => sunScene(c, v)));
  reg('mit_drain', (c) => drainScene(c));
  reg('mit_monument', (c) => monumentScene(c));
})();
