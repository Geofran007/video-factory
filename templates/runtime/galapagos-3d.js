// Escenas 3D "Galápagos" (low-poly, noche) a pantalla completa. Diseño propio con Three.js r149.
// Se registran en VF.three con { full: true }: el motor les da un canvas 2D de 1080×1920 donde se
// compone el render WebGL (720×1280), un brillo selectivo (capa 1 desenfocada) y las etiquetas tipo pastilla.
// Todo depende solo del tiempo local de la escena (lt), así cada frame es reproducible.
(() => {
  'use strict';
  const T = window.THREE;
  if (!T || !window.VF || !window.VF.three) return;
  const PI = Math.PI;
  // Textos de las etiquetas: se escriben en español y se traducen si el video es en inglés (timeline.language).
  const EN = {
    'Ecuador ≈ 1.000 km': 'Ecuador ≈ 1,000 km', 'Oeste · jóvenes': 'West · young', 'Este · viejas': 'East · old',
    'Fernandina · volcán activo': 'Fernandina · active volcano',
    'San Cristóbal\nhasta 4 millones de años': 'San Cristóbal\nup to 4 million years old',
    '← oeste': '← west', 'Ecuador →': 'Ecuador →', 'manto': 'mantle', 'punto caliente': 'hotspot',
    'placa de Nazca →': 'Nazca Plate →', '≈ 5 cm por año': '≈ 5 cm per year',
    'Cordillera de Carnegie': 'Carnegie Ridge',
    'islas hundidas\nde hasta 9 millones de años': 'drowned islands\nup to 9 million years old',
    'edad': 'age', 'clima': 'climate', 'comida': 'food', '1835 · HMS Beagle': '1835 · HMS Beagle',
    'pinzones · 1835': 'finches · 1835',
  };
  const tr = (s) => (window.VF.lang === 'en' && EN[s]) || s;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (p) => p * p * (3 - 2 * p);
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, d) => clamp((t - a) / Math.max(d, 1e-3));
  const outBack = (p) => { const c = 1.7; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2; };

  // index.html?o=h → video horizontal (1920×1080); sin el parámetro, vertical como siempre.
  const LAND = new URLSearchParams(location.search).get('o') === 'h';
  const [GW, GH, W, H] = LAND ? [1280, 720, 1920, 1080] : [720, 1280, 1080, 1920];
  const SW = LAND ? 480 : 270, SH = LAND ? 270 : 480;
  const FOCUS = 0.36;        // la acción se centra arriba del presentador
  const LABEL_TOP = LAND ? 130 : 430;     // debajo del cartel de texto
  const LABEL_BOTTOM = LAND ? 850 : 1010; // encima del perrito
  const GLOW = 1;            // capa que recibe brillo

  const COL = {
    gold: '#ffc94a', green: '#6ee08a', orange: '#ff9a3c', white: '#ffffff', blue: '#8fd0ff',
  };

  function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function noise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const u = smooth(x - xi), v = smooth(y - yi);
    return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
  }
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------------ texturas
  const texCache = {};
  function radialTex(key, stops) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (texCache[key] = new T.CanvasTexture(c));
  }
  const glowTex = () => radialTex('glow', [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]);
  const smokeTex = () => radialTex('smoke', [[0, 'rgba(200,200,205,.9)'], [0.5, 'rgba(160,160,170,.45)'], [1, 'rgba(140,140,150,0)']]);
  const bubbleTex = () => radialTex('bubble', [[0, 'rgba(255,255,255,0)'], [0.6, 'rgba(220,240,255,.25)'], [0.85, 'rgba(240,250,255,.9)'], [1, 'rgba(255,255,255,0)']]);

  function waterLinesTex() {
    if (texCache.water) return texCache.water;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#8e8e8e'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
    const r = rng(3);
    for (let k = 0; k < 9; k++) {
      const y0 = r() * 256, x0 = r() * 256, len = 40 + r() * 70;
      g.beginPath();
      for (let x = 0; x <= len; x += 4) g.lineTo((x0 + x) % 256, y0 + Math.sin(x * 0.12) * 3);
      g.stroke();
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping;
    return (texCache.water = t);
  }

  function rockTex() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#6b6a70'; g.fillRect(0, 0, 512, 128);
    const r = rng(17);
    for (let k = 0; k < 220; k++) {
      const v = 80 + Math.floor(r() * 70);
      g.fillStyle = `rgb(${v},${v - 2},${v + 4})`;
      g.beginPath();
      const x = r() * 512, y = r() * 128, s = 6 + r() * 22;
      for (let a = 0; a < 6; a++) g.lineTo(x + Math.cos(a * PI / 3 + r()) * s, y + Math.sin(a * PI / 3 + r()) * s * 0.6);
      g.fill();
    }
    g.strokeStyle = 'rgba(30,30,36,.8)'; g.lineWidth = 2;
    for (let k = 0; k < 14; k++) {
      let x = r() * 512, y = r() * 128;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 5; s++) { x += 10 + r() * 20; y += (r() - 0.5) * 24; g.lineTo(x, y); }
      g.stroke();
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }

  // ------------------------------------------------------------------ escenario común
  function onGlow(obj) { obj.traverse((o) => o.layers.set(GLOW)); return obj; }

  function glowSprite(color, size, opacity = 1) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity,
      blending: T.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size);
    return onGlow(s);
  }

  function starField(count = 700) {
    const r = rng(42);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = r() * PI * 2, el = 0.02 + r() * 0.9, R = 90;
      pos.set([Math.cos(a) * Math.cos(el) * R, Math.sin(el) * R, Math.sin(a) * Math.cos(el) * R], i * 3);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    return new T.Points(g, new T.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, fog: false }));
  }

  // Un solo par de renderizadores WebGL para todas las escenas: Chrome limita los contextos activos (~16).
  let SHARED = null;
  function sharedRenderers() {
    if (SHARED) return SHARED;
    const glc = document.createElement('canvas'); glc.width = GW; glc.height = GH;
    const renderer = new T.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(GW, GH, false);
    renderer.localClippingEnabled = true;
    const gw = GW / 4, gh = GH / 4;
    const glowC = document.createElement('canvas'); glowC.width = gw; glowC.height = gh;
    const glowR = new T.WebGLRenderer({ canvas: glowC, alpha: true, antialias: false, preserveDrawingBuffer: true });
    glowR.setPixelRatio(1); glowR.setSize(gw, gh, false); glowR.setClearColor(0x000000, 0);
    glowR.localClippingEnabled = true;
    return (SHARED = { renderer, glowR, glc, glowC });
  }

  function stage(canvas, { bg = 0x060a16, fog = [0x0b1628, 18, 60], fov = 50, focus = FOCUS, stars = true,
    hemi = 0.8, moon = 1.1 } = {}) {
    const { renderer, glowR, glc, glowC } = sharedRenderers();
    const soft = document.createElement('canvas'); soft.width = SW; soft.height = SH;
    const softCtx = soft.getContext('2d');

    const scene = new T.Scene();
    scene.background = new T.Color(bg);
    if (fog) scene.fog = new T.Fog(fog[0], fog[1], fog[2]);
    // En horizontal se acerca la cámara: las escenas se diseñaron para el ancho de una pantalla vertical.
    if (LAND) { fov = 2 * Math.atan(Math.tan(fov * PI / 360) * 0.66) * 180 / PI; focus = 0.47; }
    const camera = new T.PerspectiveCamera(fov, GW / GH, 0.05, 300);
    camera.setViewOffset(GW, GH, 0, Math.round((0.5 - focus) * GH), GW, GH);
    scene.add(new T.HemisphereLight(0xa8bfff, 0x1c1a22, hemi));
    const moonL = new T.DirectionalLight(0xe4ecff, moon); moonL.position.set(-6, 12, 9); scene.add(moonL);
    const warm = new T.DirectionalLight(0xffc896, 0.35); warm.position.set(8, 4, -6); scene.add(warm);
    if (stars) scene.add(starField());

    const ctx = canvas.getContext('2d');
    const FONT = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const v = new T.Vector3();
    const st = { renderer, scene, camera, ctx, labels: [], overlay: null };

    st.project = (p) => {
      v.set(p[0], p[1], p[2]).project(camera);
      return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, ok: v.z < 1 };
    };

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    // Pastilla: rectángulo redondeado oscuro, borde claro, texto blanco en negrita. Puede colgar de un punto 3D.
    st.pill = (text, x, y, { color = COL.white, size = 40, alpha = 1, scale = 1, anchor = null } = {}) => {
      if (alpha <= 0.001) return;
      const lines = String(text).split('\n');
      ctx.save();
      ctx.font = `800 ${size}px ${FONT}`;
      const pad = size * 0.62;
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
      const h = lines.length * size * 1.18 + pad * 0.9;
      x = clamp(x, w / 2 + 26, W - w / 2 - 26);
      y = clamp(y, LABEL_TOP + h, LABEL_BOTTOM);
      ctx.globalAlpha = alpha;
      if (anchor) {
        ctx.strokeStyle = color; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(anchor.x, anchor.y); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 9, 0, PI * 2); ctx.fill();
      }
      ctx.translate(x, y - h / 2); ctx.scale(scale, scale);
      roundRect(-w / 2, -h / 2, w, h, Math.min(h / 2, 40));
      ctx.fillStyle = 'rgba(8,12,24,.86)'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * size * 1.18 + 2));
      ctx.restore();
    };

    // Etiqueta declarativa: { text, p: [x,y,z] | (lt)=>[x,y,z], screen: [x,y], t0, t1, color, size, dy }
    st.label = (o) => { o.text = tr(o.text); st.labels.push(o); return o; };

    function drawLabels(lt, dur) {
      if (document.body.classList.contains('thumb')) return; // portada e imagen de dato: sin etiquetas
      for (const L of st.labels) {
        const t0 = typeof L.t0 === 'function' ? L.t0(dur) : (L.t0 || 0);
        const t1 = typeof L.t1 === 'function' ? L.t1(dur) : (L.t1 ?? Infinity);
        const pin = prog(lt, t0, 0.35), pout = prog(lt, t1, 0.3);
        const alpha = pin * (1 - pout);
        if (alpha <= 0) continue;
        const scale = lerp(0.6, 1, outBack(pin));
        if (L.screen) {
          // Posiciones pensadas para 1080×1920: en horizontal se reparten por la zona libre.
          const sx = LAND ? L.screen[0] / 1080 * W : L.screen[0];
          const sy = LAND ? lerp(LABEL_TOP + 90, LABEL_BOTTOM, clamp((L.screen[1] - 430) / 580)) : L.screen[1];
          st.pill(L.text, sx, sy, { color: L.color, size: L.size, alpha, scale }); continue; }
        const p = st.project(typeof L.p === 'function' ? L.p(lt, dur) : L.p);
        if (!p.ok) continue;
        st.pill(L.text, p.x + (L.dx || 0), p.y - (L.dy ?? 110), { color: L.color, size: L.size, alpha, scale, anchor: p });
      }
    }

    st.draw = (lt, dur) => {
      camera.updateMatrixWorld();
      camera.layers.set(0); camera.layers.enable(GLOW);
      renderer.render(scene, camera);
      const bgc = scene.background; scene.background = null;
      camera.layers.set(GLOW);
      glowR.render(scene, camera);
      scene.background = bgc;
      camera.layers.set(0); camera.layers.enable(GLOW);

      ctx.save();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
      ctx.drawImage(glc, 0, 0, W, H);
      // Brillo selectivo: solo lo que está en la capa GLOW (lava, magma, flechas, luces).
      softCtx.clearRect(0, 0, SW, SH);
      softCtx.filter = 'blur(5px)'; softCtx.drawImage(glowC, 0, 0, SW, SH); softCtx.filter = 'none';
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.95; ctx.drawImage(soft, 0, 0, W, H);
      ctx.globalAlpha = 0.45; ctx.drawImage(glowC, 0, 0, W, H);
      ctx.restore();
      drawLabels(lt, dur);
      if (st.overlay) { ctx.save(); st.overlay(ctx, lt, dur, FONT); ctx.restore(); }
    };
    return st;
  }

  // Océano low-poly con olas suaves y líneas de agua que se desplazan.
  function ocean(scene, { size = 90, seg = 70, color = 0x174e8a, y = 0 } = {}) {
    const geo = new T.PlaneGeometry(size, size, seg, seg); geo.rotateX(-PI / 2);
    const tex = waterLinesTex().clone(); tex.needsUpdate = true; tex.repeat.set(size / 3, size / 3);
    const mat = new T.MeshStandardMaterial({ color, map: tex, roughness: 0.8, metalness: 0, flatShading: true,
      emissive: 0x04142e, emissiveIntensity: 1 });
    const mesh = new T.Mesh(geo, mat); mesh.position.y = y;
    scene.add(mesh);
    const pos = geo.attributes.position; const base = Float32Array.from(pos.array);
    return (lt) => {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2];
        pos.array[i * 3 + 1] = 0.05 * Math.sin(x * 1.1 + lt * 1.3) + 0.04 * Math.sin(z * 1.6 - lt * 0.9) + 0.02 * Math.sin((x + z) * 2.3 + lt * 2);
      }
      pos.needsUpdate = true;
      tex.offset.set(lt * 0.012, lt * 0.006);
    };
  }

  // Humo: sprites que suben y se agrandan en bucle.
  function smoke(parent, top, { n = 5, spread = 0.12, height = 1.2, size = 0.5, seed = 1 } = {}) {
    const r = rng(seed); const puffs = [];
    for (let k = 0; k < n; k++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: smokeTex(), transparent: true, depthWrite: false, opacity: 0.5 }));
      parent.add(s); puffs.push({ s, ph: k / n, dx: (r() - 0.5) * spread, sp: 0.18 + r() * 0.08 });
    }
    return (lt, strength = 1) => {
      for (const p of puffs) {
        const f = (lt * p.sp + p.ph) % 1;
        p.s.position.set(top[0] + p.dx + f * 0.35, top[1] + f * height, top[2]);
        p.s.scale.setScalar(size * (0.4 + f * 1.4));
        p.s.material.opacity = 0.55 * strength * Math.sin(f * PI);
        p.s.visible = strength > 0.01;
      }
    };
  }

  // ------------------------------------------------------------------ islas
  const C = (h) => new T.Color(h);
  const PAL = {
    young: C(0x24232a), youngRed: C(0x47261f), old: C(0x5b5046), sand: C(0xd9c48e), shore: C(0x1b1a1f),
    green: C(0x3c9a4c), green2: C(0x2b7d3c), dry: C(0x9f8c55), dry2: C(0x7d6c45),
  };

  // Isla low-poly con color por cara según altura y edad (0 = joven, negra y volcánica; 1 = vieja, verde y baja).
  function islandMesh({ rx, rz, h, seed, age, crater = false, dry = false }) {
    const N = 20;
    const geo = new T.PlaneGeometry(2.4, 2.4, N, N); geo.rotateX(-PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const ang = Math.atan2(z, x);
      const edge = 0.74 + 0.26 * noise2(Math.cos(ang) * 1.6 + seed * 3.1, Math.sin(ang) * 1.6 + seed * 1.7);
      const d = Math.hypot(x, z) / edge;
      let y = d < 1 ? Math.pow(1 - d, 1.1 + age * 0.9) : -(d - 1) * 0.8;
      if (d < 1) y += (noise2(x * 3.3 + seed, z * 3.3 - seed) - 0.5) * 0.18 * (1 - d);
      if (crater && d < 0.2) y -= (0.2 - d) * 1.6;
      pos.setXYZ(i, x * rx, Math.max(y * h, -0.4), z * rz);
    }
    const g = geo.toNonIndexed();
    const p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const c = new T.Color();
    for (let f = 0; f < p.count; f += 3) {
      const cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3;
      const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3, cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
      const rel = cy / Math.max(h, 0.01);
      const n = noise2(cx * 4 + seed, cz * 4);
      if (rel < 0.05) c.copy(age > 0.4 ? PAL.sand : PAL.shore);
      else if (age * (1.15 - rel * 0.45) > 0.3 + n * 0.25) {
        c.copy(dry ? (n > 0.5 ? PAL.dry : PAL.dry2) : (n > 0.5 ? PAL.green : PAL.green2));
      } else {
        c.copy(PAL.young).lerp(PAL.old, clamp(age * 1.3));
        if (crater && rel > 0.55) c.lerp(PAL.youngRed, 0.6);
      }
      c.offsetHSL(0, 0, (n - 0.5) * 0.06);
      for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (f + k) * 3);
    }
    g.setAttribute('color', new T.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  }

  function island(opts) {
    const grp = new T.Group();
    const mesh = islandMesh(opts); grp.add(mesh);
    const top = [0, opts.h * (opts.crater ? 0.82 : 1), 0];
    let craterUpd = null;
    if (opts.crater) {
      const lava = onGlow(new T.Mesh(new T.CircleGeometry(Math.min(opts.rx, opts.rz) * 0.16, 10),
        new T.MeshBasicMaterial({ color: 0xff6a1a })));
      lava.rotation.x = -PI / 2; lava.position.set(0, top[1] + 0.02, 0); grp.add(lava);
      const g = glowSprite(0xff7a22, Math.min(opts.rx, opts.rz) * 0.9, 0.9); g.position.set(0, top[1] + 0.08, 0); grp.add(g);
      const sm = smoke(grp, [0, top[1] + 0.1, 0], { seed: opts.seed * 7 + 1, size: 0.45, height: 1.0 });
      craterUpd = (lt) => { g.material.opacity = 0.75 + 0.2 * Math.sin(lt * 5 + opts.seed); sm(lt, 1); };
    }
    grp.userData = { top, opts, mesh };
    grp.update = (lt) => { if (craterUpd) craterUpd(lt); };
    return grp;
  }

  // Posiciones aproximadas (longitud, latitud). Isabela se arma con varios volcanes.
  const ISLES = [
    ['Fernandina', -91.55, -0.37, 0.55, 0.5, 0.75, 0.0, { crater: true }],
    ['Isabela', -91.33, 0.02, 0.42, 0.5, 0.7, 0.08, { crater: true }],
    ['Isabela', -91.17, -0.33, 0.48, 0.55, 0.66, 0.1, { crater: true }],
    ['Isabela', -91.07, -0.72, 0.55, 0.48, 0.62, 0.12, { crater: true }],
    ['Isabela', -90.9, -0.95, 0.45, 0.35, 0.42, 0.2, {}],
    ['Santiago', -90.75, -0.25, 0.45, 0.4, 0.5, 0.38, {}],
    ['Pinta', -90.75, 0.58, 0.25, 0.3, 0.42, 0.42, {}],
    ['Marchena', -90.47, 0.33, 0.26, 0.24, 0.3, 0.48, {}],
    ['Santa Cruz', -90.35, -0.65, 0.52, 0.46, 0.45, 0.66, {}],
    ['Floreana', -90.45, -1.28, 0.3, 0.3, 0.3, 0.72, {}],
    ['Genovesa', -89.95, 0.32, 0.2, 0.2, 0.14, 0.82, {}],
    ['San Cristóbal', -89.5, -0.85, 0.62, 0.3, 0.34, 0.95, {}],
    ['Española', -89.68, -1.37, 0.32, 0.18, 0.14, 1.0, { dry: true }],
  ];
  const K = 3;
  const mapX = (lon) => (lon + 90.5) * K, mapZ = (lat) => -(lat + 0.4) * K;

  function archipelago(scene) {
    const grp = new T.Group(); scene.add(grp);
    const items = ISLES.map(([name, lon, lat, rx, rz, h, age, o], i) => {
      const isl = island({ rx: rx * 1.35, rz: rz * 1.35, h: h * 1.5, age, seed: i + 1, ...o });
      isl.position.set(mapX(lon), 0, mapZ(lat));
      grp.add(isl);
      return { name, isl, age, pos: [mapX(lon), h * 1.5, mapZ(lat)] };
    });
    const find = (n) => items.find((it) => it.name === n);
    return { grp, items, find, update: (lt) => items.forEach((it) => it.isl.update(lt)) };
  }

  // Flecha dorada brillante que crece a lo largo de +x.
  function arrow(scene, from, len, color = 0xffc94a) {
    const g = new T.Group(); g.position.set(...from); scene.add(g);
    const mat = new T.MeshBasicMaterial({ color });
    const shaft = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 1, 10), mat); shaft.rotation.z = -PI / 2;
    const head = new T.Mesh(new T.ConeGeometry(0.32, 0.7, 14), mat); head.rotation.z = -PI / 2;
    g.add(shaft, head); onGlow(g);
    return {
      tip: (p) => [from[0] + len * p + 0.4, from[1], from[2]],
      set(p) {
        g.visible = p > 0.01;
        const L = Math.max(0.001, len * p);
        shaft.scale.y = L; shaft.position.x = L / 2; head.position.x = L + 0.3;
        head.scale.setScalar(clamp(p * 4));
      },
    };
  }

  // ------------------------------------------------------------------ mapas del archipiélago
  function mapScene(canvas, variant) {
    const st = stage(canvas, { fog: [0x0b1628, 22, 70], focus: 0.33 });
    const { scene, camera } = st;
    const sea = ocean(scene);
    const arc = archipelago(scene);
    const arr = arrow(scene, [4.0, 0.35, 0.4], 3.4);
    const fern = arc.find('Fernandina'), sanc = arc.find('San Cristóbal');
    const lights = [];

    if (variant === 'map') {
      st.label({ text: 'Ecuador ≈ 1.000 km', p: (lt, dur) => arr.tip(smooth(prog(lt, dur * 0.42, dur * 0.35))), t0: (d) => d * 0.6, color: COL.gold, size: 44, dy: 120 });
    }
    if (variant === 'ages') {
      st.label({ text: 'Oeste · jóvenes', p: fern.pos, t0: 0.4, color: COL.orange, size: 44 });
      st.label({ text: 'Este · viejas', p: sanc.pos, t0: (d) => d * 0.4, color: COL.green, size: 44 });
    }
    if (variant === 'flyover') {
      st.label({ text: 'Fernandina · volcán activo', p: fern.pos, t0: 0.3, t1: (d) => d * 0.5, color: COL.orange, size: 42 });
      st.label({ text: 'San Cristóbal\nhasta 4 millones de años', p: sanc.pos, t0: (d) => d * 0.55, color: COL.green, size: 42 });
    }
    if (variant === 'final' || variant === 'outro') {
      for (const it of arc.items) {
        const c = new T.Color(0xff7a22).lerp(new T.Color(0x52e07a), it.age);
        const s = glowSprite(c, 0.8, 0.95);
        s.position.set(it.pos[0], it.pos[1] + 0.25, it.pos[2]);
        scene.add(s); lights.push({ s, age: it.age });
      }
    }
    if (variant === 'outro') {
      st.overlay = (ctx, lt, dur) => {
        const a = smooth(prog(lt, dur * 0.5, dur * 0.45));
        ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      };
    }

    return (lt, dur) => {
      sea(lt); arc.update(lt);
      const k = smooth(clamp(lt / dur));
      if (variant === 'map') {
        // Las islas emergen de oeste a este y luego crece la flecha hacia Ecuador.
        arc.items.forEach((it, i) => { it.isl.scale.y = Math.max(0.02, outBack(prog(lt, 0.05 + i * 0.06, 0.5))); });
        arr.set(smooth(prog(lt, dur * 0.42, dur * 0.35)));
        camera.position.set(lerp(-9.6, -8.8, k), lerp(13.5, 12.2, k), lerp(0.8, 0.2, k));
        camera.lookAt(lerp(-1.1, -0.7, k), 0, 0.3);
      } else if (variant === 'ages') {
        arr.set(0);
        camera.position.set(-8.6, 11.8, lerp(-0.6, 1.0, k));
        camera.lookAt(-0.8, 0, 0.3);
      } else if (variant === 'flyover') {
        arr.set(0);
        const x = lerp(-8, 0.2, k);
        camera.position.set(x, 3.4, 7.6);
        camera.lookAt(x + 4.0, 0.0, -0.6);
      } else {
        lights.forEach(({ s, age }) => {
          const p = outBack(prog(lt, 0.2 + age * dur * 0.45, 0.5));
          s.scale.setScalar(Math.max(0.001, 0.8 * p * (0.92 + 0.08 * Math.sin(lt * 4 + age * 9))));
          s.visible = p > 0.01;
        });
        if (variant === 'final') {
          arr.set(smooth(prog(lt, dur * 0.55, dur * 0.3)));
          camera.position.set(-9.0, 13, lerp(-1.2, 1.2, k));
          camera.lookAt(-0.8, 0, 0.3);
        } else {
          arr.set(1);
          camera.position.set(lerp(-9.0, -15, k), lerp(13, 27, k), 0.3);
          camera.lookAt(lerp(-0.8, 0.4, k), 0, 0.3);
        }
      }
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ bloque en corte (punto caliente)
  const BX = 2.6, BZ = 1.6;            // medio ancho y media profundidad del bloque
  const Y_MANTLE = -3.7, Y_PLATE = -1.9, Y_SEA = -1.15, Y_SURF = 0.6;
  const HOT_X = -1.25;                 // el punto caliente queda fijo al oeste

  function mantleMaterial() {
    return new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform float uTime; varying vec3 vP;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(h(i), h(i+vec2(1.0,0.0)), f.x), mix(h(i+vec2(0.0,1.0)), h(i+vec2(1.0,1.0)), f.x), f.y); }
        float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++){ s += a*n(p); p *= 2.03; a *= 0.5; } return s; }
        void main(){
          vec2 q = vec2(vP.x + vP.z * 0.7, vP.y) * 1.1;
          float v = fbm(q + vec2(0.0, -uTime * 0.22) + fbm(q * 0.6 + uTime * 0.05));
          vec3 col = mix(vec3(0.20, 0.035, 0.015), vec3(0.78, 0.26, 0.05), smoothstep(0.35, 0.85, v));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
  }

  function makeVolcano(seed, clip) {
    const geo = new T.ConeGeometry(1, 1, 11, 4); geo.translate(0, 0.5, 0);
    const pos = geo.attributes.position; const r = rng(seed);
    const jit = {};
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      if (!jit[key]) jit[key] = [(r() - 0.5) * 0.16, (r() - 0.5) * 0.08];
      if (y > 0.98) { pos.setY(i, 0.9); continue; }   // cima truncada (cráter)
      if (y < 0.02) continue;
      pos.setX(i, x * (1 + jit[key][0])); pos.setZ(i, z * (1 + jit[key][0])); pos.setY(i, y + jit[key][1]);
    }
    const g = geo.toNonIndexed(); g.computeVertexNormals();
    const mat = new T.MeshStandardMaterial({ color: 0x26252b, flatShading: true, roughness: 0.95, clippingPlanes: clip });
    const body = new T.Mesh(g, mat);
    const lavaMat = new T.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, clippingPlanes: clip });
    const lava = onGlow(new T.Mesh(new T.ConeGeometry(0.26, 0.3, 9), lavaMat));
    const lavaGlow = glowSprite(0xff7a22, 1.6, 0.95); lava.add(lavaGlow);
    const chanMat = new T.MeshBasicMaterial({ color: 0xff7a22, transparent: true, clippingPlanes: clip });
    const channel = onGlow(new T.Mesh(new T.CylinderGeometry(0.07, 0.11, Y_SEA - Y_PLATE + 0.25, 8), chanMat));
    const grp = new T.Group(); grp.add(body, lava);
    return { grp, body, lava, channel, mat, lavaMat, chanMat };
  }

  function sectionScene(canvas, phase) {
    const st = stage(canvas, { fog: [0x0b1628, 26, 70], fov: 48, focus: 0.385 });
    const { scene, camera } = st;
    const clip = [new T.Plane(new T.Vector3(-1, 0, 0), BX), new T.Plane(new T.Vector3(1, 0, 0), BX)];

    const mantleMat = mantleMaterial();
    const mantle = new T.Mesh(new T.BoxGeometry(BX * 2, Y_PLATE - Y_MANTLE, BZ * 2), mantleMat);
    mantle.position.y = (Y_PLATE + Y_MANTLE) / 2;
    const rt = rockTex(); rt.repeat.set(2.5, 1);
    const plate = new T.Mesh(new T.BoxGeometry(BX * 2, Y_SEA - Y_PLATE, BZ * 2),
      new T.MeshStandardMaterial({ map: rt, color: 0xb9b9c4, flatShading: true, roughness: 1 }));
    plate.position.y = (Y_SEA + Y_PLATE) / 2;
    const water = new T.Mesh(new T.BoxGeometry(BX * 2, Y_SURF - Y_SEA, BZ * 2),
      new T.MeshStandardMaterial({ color: 0x3a8ee0, transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.2 }));
    water.position.y = (Y_SURF + Y_SEA) / 2;
    const surfGeo = new T.PlaneGeometry(BX * 2, BZ * 2, 30, 18); surfGeo.rotateX(-PI / 2);
    const surf = new T.Mesh(surfGeo, new T.MeshStandardMaterial({ color: 0x4a9be0, transparent: true, opacity: 0.5,
      flatShading: true, roughness: 0.25, depthWrite: false, side: T.DoubleSide }));
    surf.position.y = Y_SURF;
    const edges = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(BX * 2, Y_SURF - Y_MANTLE, BZ * 2)),
      new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }));
    edges.position.y = (Y_SURF + Y_MANTLE) / 2;
    scene.add(mantle, plate, water, surf, edges);
    const sPos = surfGeo.attributes.position; const sBase = Float32Array.from(sPos.array);

    // Chorro de magma en la cara frontal, con cabeza en forma de hongo.
    const plumeMat = new T.MeshBasicMaterial({ color: 0xff7018 });
    const coreMat = new T.MeshBasicMaterial({ color: 0xffd27a });
    const plume = new T.Mesh(new T.CylinderGeometry(0.26, 0.36, 1, 16, 1, true, -PI / 2, PI), plumeMat);
    const core = new T.Mesh(new T.CylinderGeometry(0.1, 0.14, 1, 10, 1, true, -PI / 2, PI), coreMat);
    const head = new T.Mesh(new T.SphereGeometry(0.62, 20, 10, 0, PI), plumeMat);
    const plumeG = onGlow(new T.Group()); plumeG.add(plume, core, head); plumeG.position.set(HOT_X, 0, BZ + 0.01);
    onGlow(plumeG);
    const headGlow = glowSprite(0xff8a2a, 2.2, 0.7); plumeG.add(headGlow);
    scene.add(plumeG);

    const setPlume = (p, lt) => {
      const top = lerp(Y_MANTLE, Y_PLATE - 0.32, p);
      const L = Math.max(0.01, top - Y_MANTLE);
      const wob = 1 + 0.06 * Math.sin(lt * 3);
      plume.scale.set(wob, L, 1); plume.position.y = Y_MANTLE + L / 2;
      core.scale.set(1, L, 1); core.position.y = Y_MANTLE + L / 2;
      head.position.y = top; head.scale.set(wob * (0.4 + 0.6 * p), 0.5 * (0.4 + 0.6 * p), 1);
      headGlow.position.set(0, top, 0.2);
      plumeG.visible = p > 0.005;
    };

    // Flechas (chevrons) que viajan sobre la cara frontal de la placa.
    const chev = [];
    if (phase === 'plate') {
      const shape = new T.Shape();
      shape.moveTo(0, 0.18); shape.lineTo(0.22, 0); shape.lineTo(0, -0.18); shape.lineTo(-0.08, -0.18);
      shape.lineTo(0.12, 0); shape.lineTo(-0.08, 0.18); shape.closePath();
      const cg = new T.ShapeGeometry(shape);
      for (let k = 0; k < 5; k++) {
        const m = onGlow(new T.Mesh(cg, new T.MeshBasicMaterial({ color: 0xffc94a, transparent: true, clippingPlanes: clip })));
        m.position.set(0, (Y_SEA + Y_PLATE) / 2, BZ + 0.02); scene.add(m); chev.push(m);
      }
    }

    const volcanoes = [];
    const addVolcano = (seed) => {
      const v = makeVolcano(seed, clip);
      scene.add(v.grp); v.channel.position.z = BZ + 0.02; scene.add(v.channel);
      v.top = [0, 0, 0];
      v.smoke = smoke(scene, v.top, { seed: seed * 3, size: 0.55, height: 1.3 });
      volcanoes.push(v); return v;
    };
    const green = new T.Color(0x3f8f2f), black = new T.Color(0x1d1c21);

    // Estado de un volcán según su edad (s desde que nace): crece sobre el punto caliente y luego viaja con la placa.
    const placeVolcano = (v, age, { grow, speed, peak }) => {
      const g = smooth(clamp(age / grow));
      const dist = Math.max(0, age - grow) * speed;
      const x = HOT_X + dist;
      const hgt = Math.max(0.001, peak * g);
      const sink = smooth(clamp((dist - 0.5) / 2.6)) * 1.5;
      const baseY = Y_SEA - sink;
      v.grp.visible = age > 0 && x < BX + 1;
      v.grp.position.set(x, baseY, 0);
      v.body.scale.set(0.42 + 0.2 * g, hgt, 0.42 + 0.2 * g);
      const top = baseY + hgt * 0.9;
      const active = (1 - smooth(clamp(dist / 0.7))) * (age > 0 ? 1 : 0);
      const emerged = clamp((top - Y_SURF + 0.05) / 0.25);
      v.lava.position.y = hgt * 0.9 + 0.02; v.lava.scale.setScalar(Math.max(0.001, emerged * active));
      v.lava.visible = emerged * active > 0.02;
      v.mat.color.copy(black).lerp(green, smooth(clamp((dist - 0.3) / 1.6)));
      v.channel.visible = active > 0.02 && age > 0;
      v.channel.position.set(x, (Y_SEA + Y_PLATE) / 2 - 0.05, BZ + 0.02);
      v.channel.scale.set(active, clamp(age / (grow * 0.3)), 1);
      v.top[0] = x; v.top[1] = top + 0.05; v.top[2] = 0;
      v.smoke(Math.max(0, age), emerged * active);
      return { x, top };
    };

    // Etiquetas
    const corner = (t0) => {
      st.label({ text: '← oeste', p: [-BX, Y_SURF, BZ], t0, color: COL.white, size: 36, dy: 40 });
      st.label({ text: 'Ecuador →', p: [BX, Y_SURF, BZ], t0, color: COL.gold, size: 36, dy: 40 });
    };
    if (phase === 'hotspot') {
      st.label({ text: 'manto', p: [1.4, -3.1, BZ], t0: 0.4, color: COL.orange, size: 42, dy: 90 });
      st.label({ text: 'punto caliente', p: () => [HOT_X, Y_PLATE - 0.4, BZ + 0.3], t0: (d) => d * 0.5, color: COL.orange, size: 44, dy: 150 });
      corner(1.0);
    }
    if (phase === 'plate') {
      st.label({ text: 'placa de Nazca →', p: [0.8, (Y_SEA + Y_PLATE) / 2, BZ], t0: 0.3, color: COL.white, size: 42, dy: 170 });
      st.label({ text: '≈ 5 cm por año', screen: [540, 1010], t0: (d) => d * 0.45, color: COL.gold, size: 74 });
    }
    if (phase === 'volcano' || phase === 'drift' || phase === 'conveyor') corner(0.3);

    if (phase === 'volcano') { addVolcano(5); }
    if (phase === 'drift') { addVolcano(5); }
    if (phase === 'conveyor') { addVolcano(5); addVolcano(9); addVolcano(13); addVolcano(21); }

    return (lt, dur) => {
      mantleMat.uniforms.uTime.value = lt;
      for (let i = 0; i < sPos.count; i++) {
        const x = sBase[i * 3], z = sBase[i * 3 + 2];
        sPos.array[i * 3 + 1] = 0.04 * Math.sin(x * 2.2 + lt * 1.5) + 0.03 * Math.sin(z * 3 - lt * 1.1);
      }
      sPos.needsUpdate = true;

      let speed = 0;
      if (phase === 'hotspot') setPlume(smooth(prog(lt, 0.2, dur * 0.55)), lt);
      else setPlume(1, lt);

      if (phase === 'plate') speed = 0.35;
      if (phase === 'volcano') {
        speed = 0.04;
        placeVolcano(volcanoes[0], lt - 0.2, { grow: dur * 0.78, speed: 0, peak: 2.35 });
      }
      if (phase === 'drift') {
        speed = 4.2 / dur;
        placeVolcano(volcanoes[0], lt + 1, { grow: 1, speed, peak: 2.35 });
      }
      if (phase === 'conveyor') {
        const gap = dur * 0.27, grow = dur * 0.16;
        speed = 1.25 / gap;
        // el primero viene de la escena anterior, ya lejos; luego nacen tres más
        placeVolcano(volcanoes[0], lt + grow + 2.6 / speed, { grow, speed, peak: 2.3 });
        [0.05, gap + 0.05, 2 * gap + 0.05].forEach((b, i) => placeVolcano(volcanoes[i + 1], lt - b, { grow, speed, peak: 2.25 + 0.12 * (i % 2) }));
      }
      rt.offset.x = -(lt * speed) / (BX * 2) * rt.repeat.x;
      chev.forEach((m, k) => {
        const x = -BX + ((lt * 0.9 + k * (BX * 2) / chev.length) % (BX * 2));
        m.position.x = x; m.material.opacity = Math.sin(clamp((x + BX) / (BX * 2)) * PI);
      });

      const k = smooth(clamp(lt / dur));
      const a = lerp(-0.22, 0.12, k);
      const R = 15.0;
      camera.position.set(Math.sin(a) * R, 1.6 + 0.4 * k, Math.cos(a) * R);
      camera.lookAt(0, -1.45, 0);
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ montes submarinos (Cordillera de Carnegie)
  function seamountsScene(canvas) {
    const st = stage(canvas, { bg: 0x03142a, fog: [0x072a4c, 8, 30], stars: false, hemi: 0.75, moon: 0.8, focus: 0.37 });
    const { scene, camera } = st;
    const floorGeo = new T.PlaneGeometry(40, 30, 40, 30); floorGeo.rotateX(-PI / 2);
    const fp = floorGeo.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setY(i, (noise2(fp.getX(i) * 0.6, fp.getZ(i) * 0.6) - 0.5) * 0.5);
    const floor = new T.Mesh(floorGeo.toNonIndexed(), new T.MeshStandardMaterial({ color: 0x24384a, flatShading: true, roughness: 1 }));
    floor.position.y = -3.2; scene.add(floor);
    const tops = [-0.1, -0.65, -1.15, -1.6, -2.0, -2.3];
    const mounts = tops.map((ty, i) => {
      const hgt = ty + 3.2;
      const geo = new T.CylinderGeometry(0.55 + i * 0.05, 1.5, hgt, 10, 3); geo.translate(0, hgt / 2, 0);
      const p = geo.attributes.position; const r = rng(i + 31);
      for (let j = 0; j < p.count; j++) if (p.getY(j) > 0.05 && p.getY(j) < hgt - 0.05) { p.setX(j, p.getX(j) * (0.9 + r() * 0.2)); p.setZ(j, p.getZ(j) * (0.9 + r() * 0.2)); }
      const g = geo.toNonIndexed(); g.computeVertexNormals();
      const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: new T.Color(0x4a5e6c).lerp(new T.Color(0x22384a), i / 5), flatShading: true, roughness: 1 }));
      m.position.set(-0.6 + i * 2.0, -3.2, -0.6 - i * 0.25); scene.add(m);
      return { m, top: [m.position.x, ty + 0.05, m.position.z] };
    });
    // Rayos de luz
    const rayTex = (() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 256;
      const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, 'rgba(200,235,255,.9)'); gr.addColorStop(1, 'rgba(200,235,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      const gx = g.createLinearGradient(0, 0, 64, 0);
      gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
      return new T.CanvasTexture(c);
    })();
    const rays = [];
    for (let k = 0; k < 7; k++) {
      const m = new T.Mesh(new T.PlaneGeometry(1.2, 9), new T.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.16,
        blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
      m.position.set(-2 + k * 1.6, 1.5, -1.5 + (k % 3) * 0.8); m.rotation.z = 0.25; scene.add(m); rays.push(m);
    }
    // Burbujas
    const bubbles = []; const r = rng(8);
    for (let k = 0; k < 36; k++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: bubbleTex(), transparent: true, depthWrite: false }));
      scene.add(s); bubbles.push({ s, x: -3 + r() * 13, z: -1 + r() * 4, ph: r(), sp: 0.12 + r() * 0.1, sz: 0.06 + r() * 0.1 });
    }
    st.label({ text: 'Cordillera de Carnegie', p: mounts[0].top, t0: 0.4, t1: (d) => d * 0.55, color: COL.blue, size: 42 });
    st.label({ text: 'islas hundidas\nde hasta 9 millones de años', p: mounts[4].top, t0: (d) => d * 0.45, color: COL.green, size: 40, dy: 140 });
    st.label({ text: 'Ecuador →', screen: [880, 1000], t0: (d) => d * 0.3, color: COL.gold, size: 40 });

    return (lt, dur) => {
      rays.forEach((m, k) => { m.rotation.z = 0.25 + 0.08 * Math.sin(lt * 0.5 + k); m.material.opacity = 0.11 + 0.06 * Math.sin(lt * 0.8 + k * 2); });
      bubbles.forEach((b) => {
        const f = (lt * b.sp + b.ph) % 1;
        b.s.position.set(b.x + Math.sin(f * 12 + b.ph * 9) * 0.06, -3 + f * 5, b.z);
        b.s.scale.setScalar(b.sz); b.s.material.opacity = Math.sin(f * PI);
      });
      const k = smooth(clamp(lt / dur));
      const x = lerp(0.2, 6.2, k);
      camera.position.set(x, 0.2, 9.0);
      camera.lookAt(x + 0.4, -1.7, -0.8);
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ islas de cerca con tortugas y pinzones
  function tortoise(saddle) {
    const g = new T.Group();
    const shellMat = new T.MeshStandardMaterial({ color: saddle ? 0x5a5238 : 0x4b4630, flatShading: true, roughness: 0.9 });
    const skin = new T.MeshStandardMaterial({ color: 0x7c7462, flatShading: true, roughness: 1 });
    const shell = new T.Mesh(new T.SphereGeometry(1, 9, 5, 0, PI * 2, 0, PI / 2), shellMat);
    if (saddle) { shell.scale.set(0.2, 0.15, 0.27); shell.rotation.x = -0.3; shell.position.y = 0.05; }
    else shell.scale.set(0.24, 0.2, 0.3);
    g.add(shell);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const l = new T.Mesh(new T.CylinderGeometry(0.045, 0.05, 0.12, 6), skin);
      l.position.set(sx * 0.16, 0.0, sz * 0.18); g.add(l);
    });
    const neckL = saddle ? 0.3 : 0.12;
    const neck = new T.Mesh(new T.CylinderGeometry(0.035, 0.045, neckL, 6), skin);
    neck.rotation.x = saddle ? 0.75 : 1.2;
    neck.position.set(0, saddle ? 0.2 : 0.07, 0.3 + Math.sin(neck.rotation.x) * neckL * 0.4);
    const headM = new T.Mesh(new T.SphereGeometry(0.06, 7, 5), skin);
    headM.position.set(0, neck.position.y + Math.cos(neck.rotation.x) * neckL * 0.55, neck.position.z + Math.sin(neck.rotation.x) * neckL * 0.55);
    g.add(neck, headM);
    g.userData.head = headM;
    return g;
  }

  function finch(beak) {
    const g = new T.Group();
    const dark = new T.MeshStandardMaterial({ color: 0x2c2622, flatShading: true });
    const body = new T.Mesh(new T.SphereGeometry(1, 8, 6), dark); body.scale.set(0.09, 0.08, 0.13);
    const head = new T.Mesh(new T.SphereGeometry(0.065, 8, 6), dark); head.position.set(0, 0.07, 0.11);
    const b = new T.Mesh(new T.ConeGeometry(0.025 + beak * 0.03, 0.06 + beak * 0.05, 7),
      new T.MeshStandardMaterial({ color: 0xe0a83c, flatShading: true }));
    b.rotation.x = PI / 2; b.position.set(0, 0.06, 0.18 + beak * 0.02);
    const tail = new T.Mesh(new T.ConeGeometry(0.04, 0.12, 5), dark); tail.rotation.x = -PI / 2 - 0.4; tail.position.set(0, 0.03, -0.14);
    g.add(body, head, b, tail);
    return g;
  }

  function lifeScene(canvas) {
    const st = stage(canvas, { fog: [0x0b1628, 14, 40], hemi: 1.0, moon: 1.3, focus: 0.37 });
    const { scene, camera } = st;
    const sea = ocean(scene, { size: 60, seg: 50 });
    const defs = [
      { name: 'Isabela', at: [-1.5, 0, -2.2], o: { rx: 1.4, rz: 1.2, h: 1.6, age: 0.12, seed: 3, crater: true }, label: 'edad', color: COL.orange },
      { name: 'Santa Cruz', at: [1.4, 0, -0.9], o: { rx: 1.25, rz: 1.1, h: 1.0, age: 0.7, seed: 9 }, label: 'clima', color: COL.blue },
      { name: 'Española', at: [-0.7, 0, 1.6], o: { rx: 1.3, rz: 0.85, h: 0.42, age: 1.0, seed: 13, dry: true }, label: 'comida', color: COL.green },
    ];
    const ray = new T.Raycaster(); const down = new T.Vector3(0, -1, 0);
    const isl = defs.map((d, i) => {
      const m = island(d.o); m.position.set(...d.at); scene.add(m); m.updateMatrixWorld(true);
      st.label({ text: d.label, p: [d.at[0], d.o.h * 0.9, d.at[2]], t0: 0.3 + i * 0.5, color: d.color, size: 46, dy: 100 });
      return m;
    });
    const groundAt = (m, x, z) => {
      ray.set(new T.Vector3(x, 5, z), down);
      const hit = ray.intersectObject(m.userData.mesh, false)[0];
      return hit ? hit.point.y : 0;
    };
    const critters = [];
    const put = (obj, m, dx, dz, rotY, t0, scale = 1) => {
      const x = m.position.x + dx, z = m.position.z + dz;
      obj.position.set(x, groundAt(m, x, z), z); obj.rotation.y = rotY; scene.add(obj);
      critters.push({ obj, t0, scale });
    };
    // Tortugas: de domo en Santa Cruz (húmeda) y de silla de montar con cuello largo en Española (seca).
    put(tortoise(false), isl[1], -0.3, 0.45, 0.6, 0.45, 1.25);
    put(tortoise(false), isl[1], 0.35, 0.3, -0.4, 0.5, 1.1);
    put(tortoise(true), isl[2], 0.15, 0.1, 0.4, 0.55, 1.35);
    // Pinzones con picos de distinto tamaño.
    put(finch(0.0), isl[0], 0.55, 0.65, 0.3, 0.68, 1.7);
    put(finch(0.6), isl[1], 0.75, -0.1, -0.6, 0.72, 1.7);
    put(finch(1.2), isl[2], -0.6, 0.15, 0.9, 0.76, 1.7);

    return (lt, dur) => {
      sea(lt); isl.forEach((m) => m.update(lt));
      critters.forEach((c, i) => {
        const p = outBack(prog(lt, c.t0 * dur, 0.45));
        c.obj.scale.setScalar(Math.max(0.001, p * c.scale));
        c.obj.visible = p > 0.01;
      });
      const k = smooth(clamp(lt / dur));
      const a = lerp(-0.18, 0.15, k);
      camera.position.set(Math.sin(a) * 9.2, lerp(5.2, 4.4, k), Math.cos(a) * 9.2);
      camera.lookAt(0, 0.2, -0.3);
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ velero y libreta de Darwin
  function sail(w, h, belly) {
    const geo = new T.PlaneGeometry(w, h, 6, 4);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / w + 0.5, v = p.getY(i) / h + 0.5;
      p.setZ(i, Math.sin(u * PI) * belly * (0.6 + 0.4 * Math.sin(v * PI)));
    }
    geo.computeVertexNormals();
    return new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xf0e6cc, flatShading: true, side: T.DoubleSide, roughness: 0.9 }));
  }

  function ship() {
    const g = new T.Group();
    const s = new T.Shape();
    s.moveTo(-1.8, 0.35); s.lineTo(1.9, 0.35); s.lineTo(1.55, -0.1); s.quadraticCurveTo(0.2, -0.45, -1.45, -0.25); s.lineTo(-1.8, 0.35);
    const hullGeo = new T.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: false }); hullGeo.translate(0, 0, -0.35);
    const hull = new T.Mesh(hullGeo, new T.MeshStandardMaterial({ color: 0x4a2c18, flatShading: true, roughness: 0.8 }));
    const stripe = new T.Mesh(new T.BoxGeometry(3.5, 0.06, 0.72), new T.MeshStandardMaterial({ color: 0xd9c38a }));
    stripe.position.set(0.05, 0.22, 0);
    const deck = new T.Mesh(new T.BoxGeometry(3.6, 0.04, 0.66), new T.MeshStandardMaterial({ color: 0x8a6a45, flatShading: true }));
    deck.position.y = 0.36;
    g.add(hull, stripe, deck);
    const wood = new T.MeshStandardMaterial({ color: 0x3a2414, flatShading: true });
    [[-1.0, 2.3], [0.15, 2.8], [1.15, 2.2]].forEach(([x, hgt]) => {
      const mast = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, hgt, 6), wood);
      mast.position.set(x, 0.36 + hgt / 2, 0); g.add(mast);
      [0.3, 0.62].forEach((f, j) => {
        const w = (j ? 0.8 : 1.05) * (hgt / 2.6), sh = hgt * 0.3;
        const sl = sail(w, sh, 0.16); sl.position.set(x, 0.5 + hgt * f + sh / 2 - 0.1, 0.06); g.add(sl);
        const yard = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, w + 0.15, 5), wood);
        yard.rotation.z = PI / 2; yard.position.set(x, 0.5 + hgt * f + sh - 0.1, 0.02); g.add(yard);
      });
    });
    const bow = new T.Mesh(new T.CylinderGeometry(0.02, 0.03, 1.0, 5), wood);
    bow.rotation.z = -1.2; bow.position.set(2.25, 0.55, 0); g.add(bow);
    const jib = sail(0.7, 0.9, 0.08); jib.position.set(1.85, 1.0, 0.02); jib.rotation.z = 0.35; g.add(jib);
    const lantern = glowSprite(0xffc070, 0.55, 1); lantern.position.set(-1.75, 0.65, 0); g.add(lantern);
    return g;
  }

  function drawNotebook(ctx, lt, dur, FONT) {
    const p = smooth(prog(lt, dur * 0.55, 0.7));
    if (p <= 0) return;
    const cx = 540, cy = lerp(1500, 730, p);
    ctx.translate(cx, cy); ctx.rotate(-0.05 * (1 - p) - 0.03);
    const w = 860, h = 560;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(-w / 2 + 14, -h / 2 + 16, w, h);
    ctx.fillStyle = '#efe2bf'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'rgba(120,90,50,.25)'; ctx.lineWidth = 2;
    for (let y = -h / 2 + 90; y < h / 2; y += 46) { ctx.beginPath(); ctx.moveTo(-w / 2 + 30, y); ctx.lineTo(w / 2 - 30, y); ctx.stroke(); }
    ctx.fillStyle = '#5a3b1e';
    for (let x = -w / 2 + 50; x < w / 2; x += 56) { ctx.beginPath(); ctx.arc(x, -h / 2 + 22, 9, 0, PI * 2); ctx.fill(); }
    ctx.font = `italic 700 44px ${FONT}`; ctx.fillStyle = '#4b2e14'; ctx.textAlign = 'left';
    ctx.fillText(tr('pinzones · 1835'), -w / 2 + 50, -h / 2 + 92);
    // Tres cabezas de pinzón con picos distintos, dibujadas a trazo.
    ctx.strokeStyle = '#4b2e14'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    [[-260, 0.4], [0, 0.85], [260, 1.35]].forEach(([x, b], i) => {
      const reveal = clamp((p - 0.4 - i * 0.12) / 0.3);
      if (reveal <= 0) return;
      ctx.save(); ctx.globalAlpha = reveal; ctx.translate(x - 30, 70);
      ctx.beginPath(); ctx.arc(0, 0, 70, PI * 0.15, PI * 1.85); ctx.stroke();               // cabeza
      ctx.beginPath(); ctx.moveTo(-40, 62); ctx.quadraticCurveTo(-60, 120, -20, 150); ctx.stroke(); // cuello
      ctx.beginPath(); ctx.arc(20, -16, 9, 0, PI * 2); ctx.fill();                          // ojo
      const bl = 40 + b * 40, bh = 16 + b * 22;
      ctx.beginPath(); ctx.moveTo(62, -24 - bh * 0.3); ctx.quadraticCurveTo(62 + bl * 0.7, -18, 62 + bl, 4);
      ctx.quadraticCurveTo(62 + bl * 0.5, 14 + bh * 0.3, 62, 18 + bh * 0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(64, 2); ctx.lineTo(62 + bl * 0.85, 4); ctx.stroke();
      ctx.restore();
    });
  }

  function beagleScene(canvas) {
    const st = stage(canvas, { fog: [0x0b1628, 16, 55], focus: 0.36 });
    const { scene, camera } = st;
    const sea = ocean(scene, { size: 90, seg: 60 });
    const far = [[-9, -16, 1.6, 1.3], [-3, -19, 2.2, 1.0], [5, -17, 1.4, 0.8]].map(([x, z, s, h], i) => {
      const m = island({ rx: s * 1.6, rz: s, h, age: 0.5, seed: 40 + i }); m.position.set(x, 0, z); scene.add(m); return m;
    });
    const boat = ship(); scene.add(boat);
    st.label({ text: '1835 · HMS Beagle', p: () => [boat.position.x + 0.15, 3.3, boat.position.z], t0: 0.4, t1: (d) => d * 0.55, color: COL.gold, size: 46, dy: 70 });
    st.overlay = drawNotebook;
    return (lt, dur) => {
      sea(lt); far.forEach((m) => m.update(lt));
      boat.position.set(-lt * 0.12, 0.05 * Math.sin(lt * 1.6), -lt * 0.18);
      boat.rotation.set(0.035 * Math.sin(lt * 0.9), 0.5, 0.05 * Math.sin(lt * 1.3));
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(6.8, 5.8, k) + boat.position.x, lerp(2.2, 2.6, k), lerp(9.0, 8.2, k) + boat.position.z);
      camera.lookAt(boat.position.x - 0.4, 1.35, boat.position.z - 0.6);
      st.draw(lt, dur);
    };
  }

  // ------------------------------------------------------------------ kit reutilizable
  // Otros módulos 3D a pantalla completa (andes-3d.js, …) usan el mismo escenario, etiquetas y brillo.
  window.VF.three.kit = {
    T, PI, W, H, LAND, COL, GLOW, clamp, smooth, lerp, prog, outBack, hash, noise2, rng,
    stage, ocean, smoke, glowSprite, onGlow, rockTex, mantleMaterial, arrow, islandMesh, island,
    addEN: (dict) => Object.assign(EN, dict), tr,
  };

  // ------------------------------------------------------------------ registro
  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  reg('gal_map', (c) => mapScene(c, 'map'));
  reg('gal_ages', (c) => mapScene(c, 'ages'));
  reg('gal_flyover', (c) => mapScene(c, 'flyover'));
  reg('gal_final', (c) => mapScene(c, 'final'));
  reg('gal_outro', (c) => mapScene(c, 'outro'));
  reg('gal_hotspot', (c) => sectionScene(c, 'hotspot'));
  reg('gal_plate', (c) => sectionScene(c, 'plate'));
  reg('gal_volcano', (c) => sectionScene(c, 'volcano'));
  reg('gal_drift', (c) => sectionScene(c, 'drift'));
  reg('gal_conveyor', (c) => sectionScene(c, 'conveyor'));
  reg('gal_seamounts', (c) => seamountsScene(c));
  reg('gal_life', (c) => lifeScene(c));
  reg('gal_beagle', (c) => beagleScene(c));
})();
