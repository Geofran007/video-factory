// Escenas 3D "¿Cómo late tu corazón?" (cor_*). Corazón estilizado de 4 cámaras, diseño propio con Three.js r149.
// Convención de diagrama médico: el lado derecho del corazón aparece a la izquierda de la pantalla.
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, rng, stage, glowSprite, onGlow, tr } = K;

  K.addEN({
    '≈ 100.000 latidos al día': '≈ 100,000 beats a day', '≈ tamaño de un puño': '≈ the size of a fist',
    'aurícula\nderecha': 'right\natrium', 'aurícula\nizquierda': 'left\natrium', 'ventrículo\nderecho': 'right\nventricle',
    'ventrículo\nizquierdo': 'left\nventricle', 'derecho → pulmones': 'right → lungs', 'izquierdo → cuerpo': 'left → body',
    'pulmones': 'lungs', 'se carga de oxígeno': 'picks up oxygen', 'al cuerpo': 'to the body',
    'el más fuerte': 'the strongest', 'nódulo sinusal': 'sinus node', 'aurículas': 'atria', 'ventrículos': 'ventricles',
    'válvulas': 'valves', 'PUM': 'THUMP', '≈ 7.000 litros al día': '≈ 7,000 liters a day',
  });

  const BLUE = 0x3f6fd8, RED = 0xd8403a;
  const BEAT = 0.85;
  // Fase del latido: aurículas se aprietan al inicio, ventrículos después.
  const atr = (t) => { const f = (t % BEAT) / BEAT; return f < 0.18 ? Math.sin(f / 0.18 * PI) : 0; };
  const ven = (t) => { const f = (t % BEAT) / BEAT; return f > 0.22 && f < 0.55 ? Math.sin((f - 0.22) / 0.33 * PI) : 0; };

  function blob(color, pos, scale, seed) {
    const g = new T.IcosahedronGeometry(1, 3);
    const p = g.attributes.position; const r = rng(seed);
    for (let i = 0; i < p.count; i++) { const k = 1 + (r() - 0.5) * 0.06; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
    g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ color, flatShading: true, roughness: 0.55, emissive: color, emissiveIntensity: 0.12 }));
    m.position.set(...pos); m.scale.set(...scale); m.userData.base = { pos: m.position.clone(), scale: m.scale.clone() };
    return m;
  }

  function tube(points, r, color) {
    const curve = new T.CatmullRomCurve3(points.map((q) => new T.Vector3(...q)));
    return { mesh: new T.Mesh(new T.TubeGeometry(curve, 60, r, 10, false), new T.MeshStandardMaterial({ color, roughness: 0.5, flatShading: true })), curve };
  }

  function heart(scene) {
    const g = new T.Group(); scene.add(g);
    const ch = {
      RA: blob(BLUE, [-0.8, 0.75, 0.1], [0.62, 0.58, 0.58], 1),
      LA: blob(RED, [0.8, 0.85, -0.25], [0.58, 0.52, 0.55], 2),
      RV: blob(BLUE, [-0.45, -0.35, 0.25], [0.78, 0.95, 0.62], 3),
      LV: blob(RED, [0.42, -0.55, 0], [0.88, 1.12, 0.75], 4),
    };
    Object.values(ch).forEach((m) => g.add(m));
    const vessels = {
      aorta: tube([[0.25, 0.2, 0], [0.25, 1.6, 0], [-0.2, 2.25, -0.2], [-0.75, 1.9, -0.45], [-0.75, 0.6, -0.6]], 0.2, RED),
      pulm: tube([[-0.35, 0.3, 0.35], [-0.1, 1.45, 0.35], [0.4, 1.75, 0.1]], 0.17, BLUE),
      cava: tube([[-0.95, 2.4, 0], [-0.9, 1.2, 0.1]], 0.16, BLUE),
    };
    Object.values(vessels).forEach((v) => g.add(v.mesh));
    return { g, ch, vessels };
  }

  function beatHeart(H3, lt, amp = 1) {
    const a = atr(lt) * amp, v = ven(lt) * amp;
    for (const [k, m] of Object.entries(H3.ch)) {
      const s = k[1] === 'A' ? 1 - 0.12 * a : 1 - 0.13 * v;
      m.scale.copy(m.userData.base.scale).multiplyScalar(s);
    }
  }

  function lungs(scene) {
    const mat = new T.MeshStandardMaterial({ color: 0xf2a0a8, flatShading: true, roughness: 0.8 });
    return [-1, 1].map((s) => { const m = new T.Mesh(new T.IcosahedronGeometry(1, 2), mat); m.position.set(s * 2.7, 1.0, -0.6); m.scale.set(0.95, 1.5, 0.7); scene.add(m); return m; });
  }

  // Partículas de sangre que recorren una curva; el color cambia según el tramo.
  function flow(scene, pts, n, c0, c1, speed = 0.35) {
    const curve = new T.CatmullRomCurve3(pts.map((q) => new T.Vector3(...q)));
    const a = new T.Color(c0), b = new T.Color(c1); const list = [];
    for (let i = 0; i < n; i++) { const s = glowSprite(c0, 0.28, 1); scene.add(s); list.push({ s, ph: i / n }); }
    return (lt, on = 1) => list.forEach((o) => {
      const f = (lt * speed + o.ph) % 1; o.s.position.copy(curve.getPointAt(f));
      o.s.material.color.copy(a).lerp(b, smooth(clamp((f - 0.4) / 0.2))); o.s.material.opacity = on; o.s.visible = on > 0.01;
    });
  }

  function heartScene(canvas, variant) {
    const st = stage(canvas, { bg: 0x12060c, fog: null, stars: false, focus: 0.37, hemi: 0.9, moon: 1.0 });
    const { scene, camera } = st;
    const back = glowSprite(0xff3050, 7, 0.18); back.position.set(0, 0, -2); scene.add(back);
    const H3 = heart(scene);
    let lung = null, flows = [];
    if (variant === 'lungs' || variant === 'two') {
      lung = lungs(scene);
      flows.push(flow(scene, [[-0.45, -0.2, 0.5], [-0.1, 1.5, 0.4], [-1.6, 1.6, 0], [-2.7, 1.2, -0.2], [-1.8, 0.4, -0.4], [0.8, 0.85, -0.3]], 14, BLUE, RED));
      flows.push(flow(scene, [[-0.45, -0.2, 0.5], [0.4, 1.75, 0.2], [1.7, 1.7, 0], [2.7, 1.2, -0.2], [1.8, 0.4, -0.4], [0.8, 0.85, -0.3]], 14, BLUE, RED));
    }
    if (variant === 'body' || variant === 'two') {
      flows.push(flow(scene, [[0.42, -0.5, 0.3], [0.25, 1.6, 0.1], [-0.2, 2.3, -0.2], [-0.8, 1.9, -0.5], [-1.4, -1.0, -0.6], [-1.9, -2.6, 0], [-2.2, -1.0, 0.4], [-0.8, 0.75, 0.4]], 22, RED, BLUE, 0.28));
    }
    const valves = [];
    if (variant === 'valves') {
      [[-0.62, 0.22, 0.75], [0.62, 0.18, 0.7], [0.25, 0.35, 0.45], [-0.2, 0.45, 0.85]].forEach((p, i) => {
        const v = onGlow(new T.Mesh(new T.CircleGeometry(0.16, 16), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: T.DoubleSide })));
        v.position.set(...p); scene.add(v); valves.push({ v, ventricular: i < 2 });
      });
      st.label({ text: 'válvulas', p: [0.62, 0.18, 0.7], t0: 0.4, color: COL.white, size: 42, dy: -170 });
    }
    let spark = null, sparkPath = null;
    if (variant === 'spark') {
      spark = glowSprite(0xfff2a0, 0.9, 1); scene.add(spark);
      sparkPath = new T.CatmullRomCurve3([[-1.05, 1.2, 0.35], [-0.6, 0.8, 0.6], [0.0, 0.25, 0.75], [0.05, -0.6, 0.85], [0.15, -1.5, 0.6], [0.8, -1.0, 0.75], [1.1, -0.2, 0.6]].map((q) => new T.Vector3(...q)));
      st.label({ text: 'nódulo sinusal', p: [-1.05, 1.2, 0.35], t0: 0.3, color: COL.gold, size: 40, dy: 110, dx: -40 });
    }
    let tank = null;
    if (variant === 'liters') {
      H3.g.position.x = -1.3; H3.g.scale.setScalar(0.75);
      const glass = new T.Mesh(new T.BoxGeometry(1.8, 3.2, 1.8), new T.MeshStandardMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.15, depthWrite: false }));
      glass.position.set(1.7, 0, 0); scene.add(glass);
      const edges = new T.LineSegments(new T.EdgesGeometry(glass.geometry), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      edges.position.copy(glass.position); scene.add(edges);
      const fill = new T.Mesh(new T.BoxGeometry(1.7, 1, 1.7), new T.MeshStandardMaterial({ color: 0xb0202a, roughness: 0.3 }));
      fill.position.set(1.7, -1.6, 0); scene.add(fill); tank = fill;
      flows.push(flow(scene, [[-1.1, 1.3, 0], [0.2, 2.2, 0], [1.7, 1.9, 0], [1.7, -0.5, 0]], 12, RED, RED, 0.6));
      st.label({ text: '≈ 7.000 litros al día', screen: [540, 1000], t0: (d) => d * 0.35, color: COL.gold, size: 54 });
    }
    // Etiquetas
    const pos = (k) => () => { const v = new T.Vector3(); H3.ch[k].getWorldPosition(v); return v.toArray(); };
    if (variant === 'hook') st.label({ text: '≈ 100.000 latidos al día', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.gold, size: 50 });
    if (variant === 'size') {
      st.label({ text: 'aurícula\nderecha', p: pos('RA'), t0: (d) => d * 0.3, color: COL.blue, size: 34, dx: -130, dy: 120 });
      st.label({ text: 'aurícula\nizquierda', p: pos('LA'), t0: (d) => d * 0.38, color: '#ff8a7a', size: 34, dx: 130, dy: 120 });
      st.label({ text: 'ventrículo\nderecho', p: pos('RV'), t0: (d) => d * 0.46, color: COL.blue, size: 34, dx: -170, dy: -150 });
      st.label({ text: 'ventrículo\nizquierdo', p: pos('LV'), t0: (d) => d * 0.54, color: '#ff8a7a', size: 34, dx: 170, dy: -150 });
      st.label({ text: '≈ tamaño de un puño', screen: [540, 470], t0: 0.3, t1: (d) => d * 0.28, color: COL.white, size: 44 });
    }
    if (variant === 'two') {
      st.label({ text: 'derecho → pulmones', p: pos('RV'), t0: 0.4, color: COL.blue, size: 38, dx: -120, dy: -200 });
      st.label({ text: 'izquierdo → cuerpo', p: pos('LV'), t0: (d) => d * 0.45, color: '#ff8a7a', size: 38, dx: 120, dy: -200 });
    }
    if (variant === 'lungs') {
      st.label({ text: 'pulmones', p: [-2.7, 2.4, -0.6], t0: 0.3, color: '#ffc0c8', size: 38, dy: 60 });
      st.label({ text: 'se carga de oxígeno', p: [2.7, 1.0, 0], t0: (d) => d * 0.45, color: '#ff8a7a', size: 38, dy: -230, dx: -120 });
    }
    if (variant === 'body') {
      st.label({ text: 'el más fuerte', p: pos('LV'), t0: (d) => d * 0.4, color: '#ff8a7a', size: 40, dx: 120, dy: -170 });
      st.label({ text: 'al cuerpo', p: [-1.9, -2.4, 0], t0: 0.3, color: COL.white, size: 38, dx: -60, dy: 40 });
    }
    if (variant === 'squeeze') {
      st.label({ text: 'aurículas', p: pos('LA'), t0: 0.3, color: COL.gold, size: 40, dx: 100, dy: 120 });
      st.label({ text: 'ventrículos', p: pos('LV'), t0: (d) => d * 0.4, color: COL.gold, size: 40, dx: 100, dy: -170 });
    }
    if (variant === 'outro') {
      st.overlay = (ctx, lt, dur) => { const a = smooth(prog(lt, dur * 0.5, dur * 0.45)); ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); };
    }
    // "pum-pum" al cerrarse las válvulas
    if (variant === 'valves' || variant === 'hook') {
      st.overlay = (ctx, lt, dur, FONT) => {
        const f = (lt % BEAT) / BEAT;
        const show = (txt, f0, x) => { const q = (f - f0) / 0.18; if (q < 0 || q > 1) return; ctx.save(); ctx.globalAlpha = 1 - q; ctx.font = `900 ${Math.round(70 + q * 30)}px ${FONT}`; ctx.fillStyle = '#ffd0d6'; ctx.textAlign = 'center'; ctx.fillText(txt, x, 560 - q * 40); ctx.restore(); };
        show(tr('PUM'), 0.22, 300); show(tr('PUM'), 0.55, 780);
      };
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const amp = variant === 'size' ? 0.4 : 1;
      beatHeart(H3, lt, amp);
      back.material.opacity = 0.12 + 0.12 * ven(lt);
      if (variant === 'size') {
        const ex = Math.sin(clamp(prog(lt, dur * 0.25, dur * 0.65)) * PI) * 0.45;
        for (const m of Object.values(H3.ch)) { const b = m.userData.base.pos; m.position.set(b.x * (1 + ex), b.y * (1 + ex), b.z + ex * 0.6); }
        Object.values(H3.vessels).forEach((v) => { v.mesh.visible = ex < 0.05; });
      }
      if (variant === 'squeeze') {
        const slow = lt * 0.45; beatHeart(H3, slow * BEAT / BEAT, 2.2);
        const a = atr(slow), v = ven(slow);
        H3.ch.RA.material.emissiveIntensity = H3.ch.LA.material.emissiveIntensity = 0.12 + a * 0.6;
        H3.ch.RV.material.emissiveIntensity = H3.ch.LV.material.emissiveIntensity = 0.12 + v * 0.6;
      }
      if (spark) {
        const f = ((lt * 0.9) % 1.4) / 1.0; spark.visible = f <= 1;
        spark.position.copy(sparkPath.getPointAt(clamp(f)));
        H3.ch.RA.material.emissiveIntensity = H3.ch.LA.material.emissiveIntensity = 0.12 + (f < 0.35 ? 0.5 : 0);
        H3.ch.RV.material.emissiveIntensity = H3.ch.LV.material.emissiveIntensity = 0.12 + (f > 0.45 && f <= 1 ? 0.5 : 0);
      }
      valves.forEach(({ v, ventricular }) => {
        const f = (lt % BEAT) / BEAT; const closed = ventricular ? f > 0.22 && f < 0.6 : f > 0.55 || f < 0.05;
        v.material.opacity = closed ? 1 : 0.25; v.scale.setScalar(closed ? 1 : 0.6);
      });
      flows.forEach((fl) => fl(lt, smooth(prog(lt, 0.2, 0.6))));
      if (tank) { const h = Math.max(0.01, 3.0 * smooth(prog(lt, 0.4, dur * 0.85))); tank.scale.y = h; tank.position.y = -1.6 + h / 2; }
      const far = variant === 'lungs' || variant === 'two' || variant === 'body' || variant === 'liters';
      const R = far ? 13 : 10; const a = lerp(-0.18, 0.18, k);
      if (variant === 'outro') camera.position.set(0, 0.2, lerp(10, 14, k));
      else camera.position.set(Math.sin(a) * R, 0.5, Math.cos(a) * R);
      camera.lookAt(0, far ? 0.4 : 0.55, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  ['hook', 'size', 'two', 'lungs', 'body', 'spark', 'squeeze', 'valves', 'liters', 'outro'].forEach((v) => reg(`cor_${v}`, (c) => heartScene(c, v)));
})();
