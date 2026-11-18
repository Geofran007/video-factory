// Escenas 3D con Three.js (r149, MIT, copia local en templates/vendor). Todo es función del tiempo local:
// sin física ni azar en ejecución, así cada frame es reproducible y se puede renderizar en paralelo.
// VF.three.build(canvas, nombre) -> update(lt)
(() => {
  'use strict';
  const T = window.THREE;
  const PI = Math.PI;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (p) => p * p * (3 - 2 * p);

  function rng(seed) { // mulberry32
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Textura de balón dibujada en canvas: parches oscuros repartidos sobre fondo blanco (diseño propio).
  let ballTex = null;
  function ballTexture() {
    if (ballTex) return ballTex;
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#f7f7f2'; g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#1b1b22';
    const spots = [[64, 128], [192, 128], [320, 128], [448, 128], [0, 40], [128, 40], [256, 40], [384, 40], [512, 40],
      [0, 216], [128, 216], [256, 216], [384, 216], [512, 216]];
    for (const [x, y] of spots) {
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = -PI / 2 + k * 2 * PI / 5;
        const r = y === 128 ? 30 : 24;
        g.lineTo(x + Math.cos(a) * r * (y === 128 ? 1 : 1.6), y + Math.sin(a) * r);
      }
      g.closePath(); g.fill();
    }
    g.strokeStyle = '#9a9a9a'; g.lineWidth = 2;
    for (let x = 0; x <= 512; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    ballTex = new T.CanvasTexture(c);
    return ballTex;
  }

  function base(canvas, { fov = 40, bg = null } = {}) {
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(canvas.width, canvas.height, false);
    renderer.outputEncoding = T.sRGBEncoding;
    const scene = new T.Scene();
    if (bg) scene.background = new T.Color(bg);
    const camera = new T.PerspectiveCamera(fov, canvas.width / canvas.height, 0.1, 500);
    scene.add(new T.HemisphereLight(0xffffff, 0x445066, 0.9));
    const sun = new T.DirectionalLight(0xffffff, 0.9);
    sun.position.set(4, 8, 6);
    scene.add(sun);
    return { renderer, scene, camera };
  }

  function ballMaterial() {
    return new T.MeshStandardMaterial({ map: ballTexture(), roughness: 0.45, metalness: 0.0 });
  }

  // Sombra falsa: disco oscuro bajo un objeto (más barato que sombras reales en render por software).
  function blob(r, opacity = 0.35) {
    const m = new T.Mesh(new T.CircleGeometry(r, 32),
      new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -PI / 2;
    return m;
  }

  // Posiciones de llenado: rejilla compacta dentro de una caja, de abajo hacia arriba.
  function packBox(w, d, h, r, seed) {
    const out = [];
    const rand = rng(seed);
    const step = 2 * r * 0.98;
    let layer = 0;
    for (let y = r; y <= h - r + 1e-6; y += step * 0.88, layer++) {
      const off = (layer % 2) * r;
      for (let x = -w / 2 + r + off; x <= w / 2 - r + 1e-6; x += step) {
        for (let z = -d / 2 + r + off; z <= d / 2 - r + 1e-6; z += step) {
          out.push({ x: x + (rand() - 0.5) * r * 0.15, y, z: z + (rand() - 0.5) * r * 0.15, k: y * 10 + rand() * 3 });
        }
      }
    }
    out.sort((a, b) => a.k - b.k);
    return out;
  }

  // Lluvia de balones que caen y rebotan hasta su sitio. t0..t1: ventana de llenado.
  function fillingBalls(scene, slots, r, t0, t1, dropH) {
    const mesh = new T.InstancedMesh(new T.SphereGeometry(r, 20, 14), ballMaterial(), slots.length);
    scene.add(mesh);
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3();
    const rand = rng(99);
    const spins = slots.map(() => [rand() * PI * 2, rand() * PI * 2]);
    return (lt) => {
      slots.forEach((sl, i) => {
        const ti = t0 + (t1 - t0) * (i / slots.length);
        const dt = lt - ti;
        if (dt < 0) { s.set(0.0001, 0.0001, 0.0001); p.set(0, -100, 0); } else {
          const fall = 0.45;
          let y;
          if (dt < fall) y = sl.y + dropH * (1 - (dt / fall) ** 2);
          else y = sl.y + 0.35 * r * Math.abs(Math.sin((dt - fall) * 9)) * Math.exp(-(dt - fall) * 6);
          p.set(sl.x, y, sl.z); s.set(1, 1, 1);
        }
        e.set(spins[i][0] + dt * 2, spins[i][1], 0); q.setFromEuler(e);
        m.compose(p, q, s); mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
  }

  function orbit(camera, lt, { radius, height, target = [0, 0, 0], start = 0.6, speed = 0.12, pull = 0 }) {
    const a = start + lt * speed;
    const rr = radius + pull * lt;
    camera.position.set(target[0] + Math.sin(a) * rr, target[1] + height, target[2] + Math.cos(a) * rr);
    camera.lookAt(target[0], target[1], target[2]);
  }

  // ------------------------------------------------------------------ escenas
  const BUILDERS = {
    // Gancho: un balón gigante que cae, rebota y gira frente a la cámara.
    ball(canvas) {
      const { renderer, scene, camera } = base(canvas);
      const ball = new T.Mesh(new T.SphereGeometry(1, 48, 32), ballMaterial());
      const shadow = blob(1.1, 0.4);
      const floor = new T.Mesh(new T.CircleGeometry(2.8, 48), new T.MeshStandardMaterial({ color: 0x2f9e5b, roughness: 1 }));
      floor.rotation.x = -PI / 2; floor.position.y = -0.001;
      scene.add(floor, shadow, ball);
      return (lt) => {
        const drop = clamp(lt / 0.6);
        let y = 1 + 4 * (1 - drop * drop);
        if (lt > 0.6) y = 1 + 1.2 * Math.abs(Math.sin((lt - 0.6) * 4.2)) * Math.exp(-(lt - 0.6) * 2.2);
        ball.position.y = y;
        ball.rotation.set(lt * 0.9, lt * 1.6, 0);
        const sq = 1 - 0.12 * Math.exp(-(((y - 1) * 8) ** 2)) * (lt > 0.55 ? 1 : 0);
        ball.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
        shadow.scale.setScalar(1.2 - 0.12 * (y - 1));
        orbit(camera, lt, { radius: 6.2, height: 2.4, target: [0, 1, 0], start: 0.3, speed: 0.15 });
        renderer.render(scene, camera);
      };
    },

    // Un cuarto (caja con paredes) que se llena de balones.
    room(canvas) {
      const { renderer, scene, camera } = base(canvas);
      const W = 3, D = 3, H = 2.5, r = 0.2;
      const floor = new T.Mesh(new T.PlaneGeometry(W, D), new T.MeshStandardMaterial({ color: 0xc8a27a, roughness: 0.9 }));
      floor.rotation.x = -PI / 2;
      const wallMat = new T.MeshStandardMaterial({ color: 0xa8c5ff, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false });
      const back = new T.Mesh(new T.PlaneGeometry(W, H), wallMat); back.position.set(0, H / 2, -D / 2);
      const left = new T.Mesh(new T.PlaneGeometry(D, H), wallMat); left.rotation.y = PI / 2; left.position.set(-W / 2, H / 2, 0);
      const edges = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(W, H, D)), new T.LineBasicMaterial({ color: 0xffffff }));
      edges.position.y = H / 2;
      const door = new T.Mesh(new T.PlaneGeometry(0.8, 1.9), new T.MeshStandardMaterial({ color: 0x7a4a2a }));
      door.position.set(0.6, 0.95, -D / 2 + 0.01);
      scene.add(floor, back, left, door, edges);
      const fill = fillingBalls(scene, packBox(W, D, H, r, 7), r, 0.5, 3.6, 3.2);
      return (lt) => {
        fill(lt);
        orbit(camera, lt, { radius: 6.6, height: 3.6, target: [0, 1.0, 0], start: 0.75, speed: 0.1 });
        renderer.render(scene, camera);
      };
    },

    // Piscina olímpica (proporción aproximada) que se llena de balones.
    pool(canvas) {
      const { renderer, scene, camera } = base(canvas);
      const W = 6, D = 3, H = 0.9, r = 0.13;
      const deck = new T.Mesh(new T.PlaneGeometry(W + 2, D + 2), new T.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 1 }));
      deck.rotation.x = -PI / 2; deck.position.y = H + 0.001;
      const hole = new T.Mesh(new T.BoxGeometry(W, H, D), new T.MeshStandardMaterial({ color: 0x3fa3e0, side: T.BackSide, roughness: 0.6 }));
      hole.position.y = H / 2;
      const lanes = new T.Group();
      for (let i = 1; i < 8; i++) {
        const lane = new T.Mesh(new T.BoxGeometry(W, 0.03, 0.03), new T.MeshStandardMaterial({ color: i % 2 ? 0xff4d6d : 0xffbe0b }));
        lane.position.set(0, H + 0.02, -D / 2 + (i * D) / 8);
        lanes.add(lane);
      }
      // El piso del borde con un hueco: cuatro franjas alrededor de la piscina.
      deck.visible = false;
      const stripMat = new T.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 1 });
      [[W + 2, 1, 0, -(D / 2 + 0.5)], [W + 2, 1, 0, D / 2 + 0.5], [1, D, -(W / 2 + 0.5), 0], [1, D, W / 2 + 0.5, 0]].forEach(([w, d, x, z]) => {
        const s = new T.Mesh(new T.PlaneGeometry(w, d), stripMat); s.rotation.x = -PI / 2; s.position.set(x, H, z); scene.add(s);
      });
      scene.add(hole, lanes);
      const fill = fillingBalls(scene, packBox(W, D, H, r, 11), r, 0.4, 3.0, 2.4);
      return (lt) => {
        fill(lt);
        orbit(camera, lt, { radius: 7.4, height: 4.6, target: [0, 0.3, 0], start: 0.5, speed: 0.08 });
        renderer.render(scene, camera);
      };
    },

    // Pirámide hecha de balones que aparecen capa por capa, en el desierto.
    pyramid(canvas) {
      const { renderer, scene, camera } = base(canvas);
      const sand = new T.Mesh(new T.CircleGeometry(4.2, 48), new T.MeshStandardMaterial({ color: 0xc28a42, roughness: 1 }));
      sand.rotation.x = -PI / 2;
      scene.add(sand);
      const N = 10, r = 0.22, step = 2 * r;
      const slots = [];
      for (let layer = 0; layer < N; layer++) {
        const n = N - layer;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          slots.push({ x: (i - (n - 1) / 2) * step, y: r + layer * step * 0.72, z: (j - (n - 1) / 2) * step, k: layer });
        }
      }
      const fill = fillingBalls(scene, slots, r, 0.3, 3.2, 2.5);
      return (lt) => {
        fill(lt);
        orbit(camera, lt, { radius: 9.5, height: 5.2, target: [0, 1.0, 0], start: 0.9, speed: 0.12 });
        renderer.render(scene, camera);
      };
    },

    // La Tierra girando mientras un río de balones entra en espiral.
    earth(canvas) {
      const { renderer, scene, camera } = base(canvas, { fov: 45 });
      const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
      const g = c.getContext('2d');
      g.fillStyle = '#1f5fbf'; g.fillRect(0, 0, 1024, 512);
      const rand = rng(5);
      g.fillStyle = '#4caf50';
      for (let k = 0; k < 9; k++) {
        const cx = rand() * 1024, cy = 110 + rand() * 300, rx = 50 + rand() * 120, ry = 30 + rand() * 90;
        g.beginPath();
        for (let a = 0; a < PI * 2; a += 0.25) {
          const w = 1 + 0.25 * Math.sin(a * 3 + k);
          g.lineTo(cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w);
        }
        g.fill();
      }
      g.fillStyle = '#f2f6ff'; g.fillRect(0, 0, 1024, 28); g.fillRect(0, 484, 1024, 28);
      const earth = new T.Mesh(new T.SphereGeometry(2, 64, 40), new T.MeshStandardMaterial({ map: new T.CanvasTexture(c), roughness: 0.8 }));
      const glow = new T.Mesh(new T.SphereGeometry(2.12, 48, 32), new T.MeshBasicMaterial({ color: 0x7fd3ff, transparent: true, opacity: 0.18, side: T.BackSide }));
      scene.add(earth, glow);
      const COUNT = 700;
      const mesh = new T.InstancedMesh(new T.SphereGeometry(0.06, 10, 8), ballMaterial(), COUNT);
      scene.add(mesh);
      const seeds = Array.from({ length: COUNT }, () => [rand() * PI * 2, rand(), rand() * 2 - 1]);
      const m = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3();
      return (lt) => {
        earth.rotation.y = lt * 0.35;
        seeds.forEach(([a0, ph, tilt], i) => {
          const k = (lt * 0.35 + ph) % 1;           // 0: lejos, 1: entra en la Tierra
          const rr = 6.5 - 4.5 * k;
          const a = a0 + k * 5;
          p.set(Math.cos(a) * rr, tilt * (1 - k) * 2.2, Math.sin(a) * rr);
          const sc = k > 0.96 ? (1 - k) / 0.04 : 1;
          s.setScalar(Math.max(0.0001, sc * clamp(lt * 2)));
          m.compose(p, q, s); mesh.setMatrixAt(i, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
        const pull = smooth(clamp(lt / 4));
        camera.position.set(0, 1.6 + pull * 1.2, 6.8 + pull * 3.2);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      };
    },
  };

  window.VF = window.VF || { styles: {} };
  window.VF.three = {
    available: !!T,
    build(canvas, name) {
      if (!T) throw new Error('Three.js no está cargado (templates/vendor/three.min.js)');
      const b = BUILDERS[name];
      if (!b) throw new Error(`escena 3D desconocida: ${name}`);
      return b(canvas);
    },
  };
})();
