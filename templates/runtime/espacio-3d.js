// Escenas 3D de espacio: fases de la Luna (luna_*) y estaciones del año (est_*). Diseño propio con Three.js r149.
// Usa el kit de galapagos-3d.js. Todo depende solo del tiempo local de la escena (lt).
(() => {
  'use strict';
  const K = window.VF && window.VF.three && window.VF.three.kit;
  if (!K) return;
  const { T, PI, W, H, COL, clamp, smooth, lerp, prog, outBack, noise2, stage, glowSprite, onGlow, tr } = K;

  K.addEN({
    'sombra de la Tierra': "Earth's shadow", 'solo en eclipses': 'only during eclipses', 'Sol': 'Sun',
    'lado de día': 'day side', 'lado de noche': 'night side', 'Tierra': 'Earth', '← luz del Sol': '← sunlight',
    '1 vuelta ≈ 1 mes': '1 orbit ≈ 1 month', 'luna nueva': 'new moon', 'cuarto creciente': 'first quarter',
    'luna llena': 'full moon', '≈ 29,5 días': '≈ 29.5 days', 'misma cara': 'same face',
    'gira 1 vez por vuelta': 'spins once per orbit', 'desde la Tierra': 'from Earth',
    'enero: más cerca del Sol': 'January: closest to the Sun', 'invierno en el norte': 'winter in the north',
    'verano en el norte': 'summer in the north', 'invierno en el sur': 'winter in the south',
    'verano en el sur': 'summer in the south', '23,4°': '23.4°', 'junio': 'June', 'diciembre': 'December',
    'el eje no cambia': "the axis doesn't change", 'directo: calor concentrado': 'direct: concentrated heat',
    'inclinado: calor repartido': 'slanted: spread-out heat', 'Ecuador': 'Ecuador',
    'Sol casi vertical\ntodo el año': 'Sun almost overhead\nall year', 'época lluviosa y época seca': 'rainy season and dry season',
    'eje': 'axis',
  });

  // Escenario espacial: sin las luces del kit (el lado nocturno debe verse oscuro).
  function space(canvas, opts = {}) {
    const st = stage(canvas, { fog: null, stars: true, ...opts });
    st.scene.children.filter((o) => o.isLight).forEach((l) => st.scene.remove(l));
    st.scene.add(new T.AmbientLight(0x2c3346, 0.5));
    return st;
  }

  function sphere(r, kind, seed = 1, detail = 4) {
    const geo = new T.IcosahedronGeometry(r, detail).toNonIndexed();
    const p = geo.attributes.position; const cols = new Float32Array(p.count * 3); const c = new T.Color();
    for (let f = 0; f < p.count; f += 3) {
      const x = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3 / r, y = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3 / r,
        z = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3 / r;
      const n = noise2(Math.atan2(z, x) * 2.2 + seed, y * 2.6 + seed * 0.7) * 0.7 + noise2(x * 4 + seed, z * 4 + y * 3) * 0.3;
      if (kind === 'earth') {
        if (Math.abs(y) > 0.86) c.set(0xeef3f8); else if (n > 0.56) c.set(n > 0.67 ? 0x8a7a50 : 0x3f9a4a); else c.set(0x1d5fae);
      } else {
        c.set(n > 0.6 ? 0x6a6a74 : 0xb4b3ba);
        const cr = noise2(x * 9 + 3, y * 9 + z * 5);
        if (cr > 0.78) c.multiplyScalar(0.72);
      }
      c.offsetHSL(0, 0, (noise2(x * 13, y * 13 + z) - 0.5) * 0.05);
      for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    return new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  }

  function sunBall(scene, pos, r) {
    const g = new T.Group(); g.position.set(...pos);
    g.add(onGlow(new T.Mesh(new T.SphereGeometry(r, 24, 16), new T.MeshBasicMaterial({ color: 0xfff0b8 }))));
    g.add(glowSprite(0xffc860, r * 6, 0.9)); g.add(glowSprite(0xffffff, r * 2.6, 0.9));
    scene.add(g); return g;
  }

  function line(scene, a, b, color, opacity = 1, glow = false) {
    const m = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(...a), new T.Vector3(...b)]),
      new T.LineBasicMaterial({ color, transparent: true, opacity }));
    scene.add(m); if (glow) onGlow(m); return m;
  }

  function ring(scene, r, color, opacity, rz = r) {
    const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * PI * 2; pts.push(new T.Vector3(Math.cos(a) * r, 0, Math.sin(a) * rz)); }
    const m = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color, transparent: true, opacity }));
    scene.add(m); return m;
  }

  function rod(scene, len, radius, color) {
    const m = onGlow(new T.Mesh(new T.CylinderGeometry(radius, radius, len, 8), new T.MeshBasicMaterial({ color })));
    scene.add(m); return m;
  }

  // Disco de fase visto desde la Tierra. e = elongación (0 nueva, PI llena); creciente iluminada a la derecha.
  function phaseInset(ctx, x, y, r, e, FONT, alpha = 1) {
    if (alpha <= 0.01) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
    ctx.fillStyle = '#fff'; ctx.font = `800 30px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(tr('desde la Tierra'), 0, -r - 34);
    ctx.fillStyle = 'rgba(8,12,24,.88)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#30323c'; ctx.beginPath(); ctx.arc(0, 0, r, 0, PI * 2); ctx.fill();
    e = ((e % (PI * 2)) + PI * 2) % (PI * 2);
    const waxing = e <= PI; const ee = waxing ? e : PI * 2 - e;
    if (!waxing) ctx.scale(-1, 1);
    const cs = Math.cos(ee), rx = Math.max(0.001, r * Math.abs(cs));
    ctx.fillStyle = '#f4f0de'; ctx.beginPath();
    ctx.arc(0, 0, r, -PI / 2, PI / 2, false);
    if (cs > 0) ctx.ellipse(0, 0, rx, r, 0, PI / 2, -PI / 2, true); else ctx.ellipse(0, 0, rx, r, 0, PI / 2, PI * 1.5, false);
    ctx.fill();
    ctx.restore();
  }

  Object.assign(K, { space, sphere, sunBall });

  const fade = (st) => {
    st.overlay = (ctx, lt, dur) => {
      const a = smooth(prog(lt, dur * 0.5, dur * 0.45));
      ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    };
  };

  // ================================================================== FASES DE LA LUNA
  const R_ORB = 3.0;
  const orbitPos = (phi) => [R_ORB * Math.cos(phi), 0, -R_ORB * Math.sin(phi)];

  function lunaClose(canvas, variant) {
    const st = space(canvas, { focus: 0.36 });
    const { scene, camera } = st;
    const moon = sphere(2.2, 'moon', 5, 5); scene.add(moon);
    const light = new T.DirectionalLight(0xfff6e8, 2.4); scene.add(light);
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      const a = variant === 'hook' ? lerp(0.3 * PI, 1.2 * PI, k) : lerp(1.0 * PI, 1.75 * PI, k);
      light.position.set(Math.sin(a) * 20, 3, -Math.cos(a) * 20);
      moon.rotation.y = lt * 0.06;
      camera.position.set(0, 0.2, lerp(14, 13, k)); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  function lunaMyth(canvas) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff6e8, 2.2); light.position.set(-20, 0, 0); scene.add(light);
    sunBall(scene, [-6.2, 0, 0], 0.6);
    const earth = sphere(0.75, 'earth', 2); scene.add(earth);
    const coneGeo = new T.ConeGeometry(0.75, 6, 32, 1, true); coneGeo.rotateZ(PI / 2);
    const shadow = new T.Mesh(coneGeo, new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false, side: T.DoubleSide }));
    shadow.position.x = 3.0; scene.add(shadow);
    ring(scene, R_ORB, 0xffffff, 0.18);
    const moon = sphere(0.36, 'moon', 5); scene.add(moon);
    const red = new T.Color(0x7a2a1a), white = new T.Color(0xffffff);
    st.label({ text: 'Sol', p: [-6.2, 0.6, 0], t0: 0.2, color: COL.gold, size: 36, dy: 70 });
    st.label({ text: 'sombra de la Tierra', p: [3.6, 0, 0], t0: 0.4, t1: (d) => d * 0.7, color: COL.white, size: 40, dy: 150 });
    st.label({ text: 'solo en eclipses', p: () => moon.position.toArray(), t0: (d) => d * 0.75, color: '#ff8a7a', size: 42, dy: 120 });
    return (lt, dur) => {
      const phi = lerp(1.5 * PI, 2 * PI, smooth(prog(lt, dur * 0.4, dur * 0.5)));
      moon.position.set(...orbitPos(phi));
      const inShadow = smooth(clamp(1 - Math.abs(phi - 2 * PI) / 0.25));
      moon.material.color.copy(white).lerp(red, inShadow);
      earth.rotation.y = lt * 0.3;
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-1.0, 0.5, k), 6.5, 11.5); camera.lookAt(0.3, 0, 0.6);
      st.draw(lt, dur);
    };
  }

  function lunaHalf(canvas) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff6e8, 2.4); light.position.set(-20, 1, 0); scene.add(light);
    sunBall(scene, [-4.6, 0.3, -1], 0.45);
    const moon = sphere(1.5, 'moon', 5, 5); scene.add(moon);
    const rays = [-0.9, -0.3, 0.3, 0.9].map((y) => line(scene, [-4.2, y, 0.2], [-1.4, y, 0.2], 0xffd27a, 0.8, true));
    const surf = (x, y, z) => { const v = new T.Vector3(x, y, z).normalize().multiplyScalar(1.5); return v.toArray(); };
    st.label({ text: 'Sol', p: [-4.6, 0.75, -1], t0: 0.2, color: COL.gold, size: 36, dy: 70 });
    st.label({ text: 'lado de día', p: surf(-0.7, 0.45, 0.6), t0: (d) => d * 0.3, color: COL.gold, size: 40, dy: 150 });
    st.label({ text: 'lado de noche', p: surf(0.75, -0.3, 0.6), t0: (d) => d * 0.55, color: COL.blue, size: 40, dy: -170 });
    return (lt, dur) => {
      moon.rotation.y = lt * 0.08;
      rays.forEach((r, i) => { r.material.opacity = 0.45 + 0.4 * Math.sin(lt * 3 + i); });
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(0.5, 1.5, k), 0.8, 12.5); camera.lookAt(-1.2, 0, 0);
      st.draw(lt, dur);
    };
  }

  function lunaOrbit(canvas, variant) {
    const st = space(canvas, { focus: 0.36 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff6e8, 2.3); light.position.set(-20, 0, 0); scene.add(light);
    sunBall(scene, [-6.6, 0, 0], 0.7);
    for (let i = -2; i <= 2; i++) line(scene, [-6, 0, i * 1.2], [-4, 0, i * 1.2], 0xffd27a, 0.35);
    const earth = sphere(0.75, 'earth', 2); scene.add(earth);
    ring(scene, R_ORB, 0xffffff, 0.22);
    const mr = variant === 'face' ? 0.5 : 0.36;
    const moonG = new T.Group(); scene.add(moonG);
    moonG.add(sphere(mr, 'moon', 5));
    let marker = null;
    if (variant === 'face') {
      marker = new T.Mesh(new T.ConeGeometry(0.12, 0.3, 10), new T.MeshBasicMaterial({ color: 0xff5a5a }));
      marker.rotation.z = -PI / 2; marker.position.x = mr + 0.12; moonG.add(marker);
      onGlow(marker);
    }
    const ranges = {
      orbit: [PI - 0.2, PI + 1.6], new: [PI - 0.45, PI + 0.08], quarter: [1.5 * PI - 0.4, 1.5 * PI + 0.08],
      full: [2 * PI - 0.45, 2 * PI - 0.06], cycle: [PI, 3 * PI], face: [PI, 2.6 * PI],
    };
    const [p0, p1] = ranges[variant];
    let phi = p0;
    const moonAt = () => moonG.position.toArray();
    const names = { new: 'luna nueva', quarter: 'cuarto creciente', full: 'luna llena' };
    st.label({ text: 'Tierra', p: [0, 0.75, 0], t0: 0.2, t1: variant === 'orbit' ? Infinity : 1.5, color: COL.blue, size: 34, dy: 90 });
    if (variant === 'orbit') {
      st.label({ text: '← luz del Sol', screen: [250, 520], t0: 0.3, color: COL.gold, size: 36 });
      st.label({ text: '1 vuelta ≈ 1 mes', p: moonAt, t0: (d) => d * 0.45, color: COL.white, size: 40 });
    }
    if (names[variant]) st.label({ text: names[variant], p: moonAt, t0: (d) => d * 0.35, color: COL.gold, size: 46 });
    if (variant === 'cycle') st.label({ text: '≈ 29,5 días', screen: [540, 1000], t0: 0.4, color: COL.gold, size: 64 });
    if (variant === 'face') {
      st.label({ text: 'misma cara', p: () => { const v = new T.Vector3(); marker.getWorldPosition(v); return v.toArray(); }, t0: 0.6, color: '#ff8a7a', size: 42 });
      st.label({ text: 'gira 1 vez por vuelta', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.white, size: 44 });
    }
    const inset = variant !== 'orbit' && variant !== 'face';
    st.overlay = (ctx, lt, dur, FONT) => {
      if (inset) phaseInset(ctx, W - 160, K.LAND ? 360 : 520, 78, phi - PI, FONT, smooth(prog(lt, 0.2, 0.4)));
    };
    return (lt, dur) => {
      const k = variant === 'cycle' || variant === 'face' ? clamp(lt / dur) : smooth(clamp(lt / dur));
      phi = lerp(p0, p1, k);
      moonG.position.set(...orbitPos(phi));
      moonG.rotation.y = phi + PI;
      earth.rotation.y = lt * 0.5;
      camera.position.set(0, 13.5, lerp(9.5, 8.8, k)); camera.lookAt(0, 0, 0.4);
      st.draw(lt, dur);
    };
  }

  // ================================================================== ESTACIONES
  const TILT = 23.4 * PI / 180;
  const R_SUN_ORB = 3.3;

  function tiltedEarth(scene, r) {
    const tiltG = new T.Group(); scene.add(tiltG);
    const earth = sphere(r, 'earth', 2, r > 1 ? 5 : 4); tiltG.add(earth);
    const axis = new T.Mesh(new T.CylinderGeometry(r * 0.016, r * 0.016, r * 2.9, 8), new T.MeshBasicMaterial({ color: 0xffffff }));
    tiltG.add(axis);
    return { tiltG, earth, axis };
  }

  function estOrbit(canvas, variant) {
    const st = space(canvas, { focus: 0.36 });
    const { scene, camera } = st;
    sunBall(scene, [0, 0, 0], 0.7);
    scene.add(new T.PointLight(0xfff4e0, 2.6, 0, 0));
    const ecc = variant === 'distance' ? 0.2 : 0;
    const rad = (psi) => R_SUN_ORB * (1 - ecc * Math.cos(psi - 0.2));
    const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * PI * 2; pts.push(new T.Vector3(rad(a) * Math.cos(a), 0, -rad(a) * Math.sin(a))); }
    scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })));
    const E = tiltedEarth(scene, 0.42);
    E.tiltG.rotation.z = -TILT;   // el polo norte apunta siempre hacia +x
    const at = (psi) => [rad(psi) * Math.cos(psi), 0, -rad(psi) * Math.sin(psi)];
    const earthP = () => E.tiltG.position.toArray();
    if (variant === 'distance') {
      st.label({ text: 'enero: más cerca del Sol', p: earthP, t0: 0.4, color: COL.gold, size: 40 });
      st.label({ text: 'invierno en el norte', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.blue, size: 50 });
    }
    if (variant === 'orbit') {
      st.label({ text: 'junio', p: [...at(PI)].map((v, i) => (i === 1 ? 0.5 : v)), t0: 0.3, color: COL.gold, size: 38, dy: 80 });
      st.label({ text: 'diciembre', p: [...at(0)].map((v, i) => (i === 1 ? 0.5 : v)), t0: 0.3, color: COL.blue, size: 38, dy: 80 });
      st.label({ text: 'el eje no cambia', screen: [540, 1000], t0: (d) => d * 0.45, color: COL.white, size: 46 });
    }
    if (variant === 'outro') fade(st);
    const range = { hook: [0.6 * PI, 1.6 * PI], distance: [-0.45, 0.7], orbit: [PI, 3 * PI], outro: [0.2 * PI, 0.8 * PI] }[variant];
    return (lt, dur) => {
      const k = variant === 'orbit' ? clamp(lt / dur) : smooth(clamp(lt / dur));
      const psi = lerp(range[0], range[1], k);
      E.tiltG.position.set(...at(psi));
      E.earth.rotation.y = lt * 1.2;
      if (variant === 'outro') { camera.position.set(0, lerp(8, 18, k), lerp(12, 22, k)); }
      else camera.position.set(0, lerp(7.5, 7.0, k), lerp(12.5, 12, k));
      camera.lookAt(0, 0, 0.2);
      st.draw(lt, dur);
    };
  }

  function estClose(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff4e0, 2.4); light.position.set(-20, 0, 2); scene.add(light);
    const R = 1.9;
    const E = tiltedEarth(scene, R);
    const rays = [];
    if (variant !== 'tilt') for (let i = -3; i <= 3; i++) rays.push(line(scene, [-6, i * 0.55, 0.6], [-2.2, i * 0.55, 0.6], 0xffd27a, 0.6, true));
    const eq = new T.Mesh(new T.TorusGeometry(R * 1.005, 0.025, 6, 120), new T.MeshBasicMaterial({ color: 0xffc94a }));
    eq.rotation.x = PI / 2; E.tiltG.add(variant === 'equator' ? onGlow(eq) : eq); eq.visible = variant === 'equator';
    const local = (x, y, z) => () => { const v = new T.Vector3(x, y, z).normalize().multiplyScalar(R * 1.02); E.tiltG.localToWorld(v); return v.toArray(); };
    if (variant === 'tilt') {
      line(scene, [0, -R * 1.6, 0], [0, R * 1.6, 0], 0xffffff, 0.35);
      st.label({ text: 'eje', p: () => { const v = new T.Vector3(0, R * 1.45, 0); E.tiltG.localToWorld(v); return v.toArray(); }, t0: 0.4, color: COL.white, size: 36, dy: 60, dx: -70 });
      st.label({ text: '23,4°', screen: [600, 470], t0: (d) => d * 0.5, color: COL.gold, size: 64 });
    }
    const north = local(-0.45, 0.7, 0.55), south = local(-0.45, -0.7, 0.55);
    if (variant === 'june') {
      st.label({ text: 'verano en el norte', p: north, t0: 0.4, color: COL.gold, size: 42, dy: 140 });
      st.label({ text: 'invierno en el sur', p: south, t0: (d) => d * 0.5, color: COL.blue, size: 42, dy: -150 });
    }
    if (variant === 'december') {
      st.label({ text: 'invierno en el norte', p: north, t0: 0.4, color: COL.blue, size: 42, dy: 140 });
      st.label({ text: 'verano en el sur', p: south, t0: (d) => d * 0.5, color: COL.gold, size: 42, dy: -150 });
    }
    let pin = null;
    if (variant === 'equator') {
      pin = new T.Group();
      const head = onGlow(new T.Mesh(new T.SphereGeometry(0.11, 12, 8), new T.MeshBasicMaterial({ color: 0xff5a5a })));
      const stick = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.35, 6), new T.MeshBasicMaterial({ color: 0xffffff }));
      stick.position.y = 0.17; head.position.y = 0.37; pin.add(stick, head);
      const dir = new T.Vector3(-0.55, 0, 0.83).normalize();
      pin.position.copy(dir).multiplyScalar(R); pin.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      E.tiltG.add(pin);
      st.label({ text: 'Ecuador', p: () => { const v = new T.Vector3(); pin.children[1].getWorldPosition(v); return v.toArray(); }, t0: 0.4, color: '#ff8a7a', size: 40, dy: 110 });
      st.label({ text: 'Sol casi vertical\ntodo el año', screen: [300, 560], t0: (d) => d * 0.3, color: COL.gold, size: 38 });
      st.label({ text: 'época lluviosa y época seca', screen: [540, 1005], t0: (d) => d * 0.6, color: COL.white, size: 42 });
    }
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      if (variant === 'tilt') E.tiltG.rotation.z = TILT * smooth(prog(lt, 0.3, dur * 0.5));
      else if (variant === 'june') E.tiltG.rotation.z = TILT;
      else if (variant === 'december') E.tiltG.rotation.z = -TILT;
      else E.tiltG.rotation.z = TILT * Math.cos(k * PI);
      E.earth.rotation.y = lt * 0.35;
      rays.forEach((r, i) => { r.material.opacity = 0.35 + 0.35 * Math.sin(lt * 3 + i); });
      camera.position.set(lerp(0.4, -0.3, k), 0.4, 13.5); camera.lookAt(-0.4, 0, 0);
      st.draw(lt, dur);
    };
  }

  function estRays(canvas) {
    const st = space(canvas, { focus: 0.4, hemi: 0.8 });
    const { scene, camera } = st;
    scene.add(new T.HemisphereLight(0xa8bfff, 0x1c1a22, 0.9));
    const dl = new T.DirectionalLight(0xffffff, 0.6); dl.position.set(-3, 8, 5); scene.add(dl);
    const ground = new T.Mesh(new T.PlaneGeometry(9, 6), new T.MeshStandardMaterial({ color: 0x3c7a3a, roughness: 1 }));
    ground.rotation.x = -PI / 2; scene.add(ground);
    const grid = new T.GridHelper(9, 18, 0xffffff, 0xffffff); grid.material.transparent = true; grid.material.opacity = 0.18; grid.position.y = 0.01; scene.add(grid);
    const beam = (x, ang, color, op) => {
      const L = 5.5;
      const g = new T.Group(); g.position.set(x, 0, 0); g.rotation.z = ang; scene.add(g);
      const m = onGlow(new T.Mesh(new T.CylinderGeometry(0.5, 0.5, L, 24, 1, true),
        new T.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending })));
      m.position.y = L / 2; g.add(m);
      const spot = onGlow(new T.Mesh(new T.CircleGeometry(0.5, 32), new T.MeshBasicMaterial({ color, transparent: true })));
      spot.rotation.x = -PI / 2; spot.position.set(x, 0.02, 0); spot.scale.x = 1 / Math.cos(ang); scene.add(spot);
      return { g, m, spot };
    };
    const A = beam(-2.4, 0, 0xffe27a, 0.28), B = beam(0.9, -1.05, 0xffe27a, 0.28);
    B.spot.material.color.set(0x9a7c2c);
    st.label({ text: 'directo: calor concentrado', p: [-2.4, 0, 0.5], t0: (d) => d * 0.15, color: COL.gold, size: 36, dy: 430 });
    st.label({ text: 'inclinado: calor repartido', p: [0.9, 0, 0.5], t0: (d) => d * 0.5, color: COL.orange, size: 36, dy: 190 });
    return (lt, dur) => {
      const a = smooth(prog(lt, 0.1, 0.8)), b = smooth(prog(lt, dur * 0.4, 0.8));
      A.m.scale.y = Math.max(0.001, a); A.m.position.y = 2.75 * (2 - a); A.spot.material.opacity = a;
      B.m.scale.y = Math.max(0.001, b); B.m.position.y = 2.75 * (2 - b); B.spot.material.opacity = b;
      A.m.visible = a > 0.01; B.m.visible = b > 0.01;
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.6, 0.6, k), 7.0, 12.5); camera.lookAt(0, 1.6, 0);
      st.draw(lt, dur);
    };
  }

  const reg = (name, fn) => window.VF.three.register(name, fn, { full: true });
  reg('luna_hook', (c) => lunaClose(c, 'hook'));
  reg('luna_outro', (c) => lunaClose(c, 'outro'));
  reg('luna_myth', (c) => lunaMyth(c));
  reg('luna_half', (c) => lunaHalf(c));
  ['orbit', 'new', 'quarter', 'full', 'cycle', 'face'].forEach((v) => reg(`luna_${v}`, (c) => lunaOrbit(c, v)));
  ['hook', 'distance', 'orbit', 'outro'].forEach((v) => reg(`est_${v}`, (c) => estOrbit(c, v)));
  ['tilt', 'june', 'december', 'equator'].forEach((v) => reg(`est_${v}`, (c) => estClose(c, v)));
  reg('est_rays', (c) => estRays(c));

  // ================================================================== ECLIPSES
  K.addEN({
    'Sol: 400 veces más ancho': 'Sun: 400 times wider', '…y 400 veces más lejos': '…and 400 times farther',
    'mismo tamaño en el cielo': 'same size in the sky', 'sombra de la Luna': "the Moon's shadow",
    'franja de totalidad': 'path of totality', 'órbita inclinada ≈ 5°': 'tilted orbit ≈ 5°', 'pasa por arriba': 'passes above',
    'eclipse de Luna': 'lunar eclipse', 'luz de todos los\namaneceres y atardeceres': 'light from every\nsunrise and sunset',
    '+3,8 cm por año': '+3.8 cm per year', 'Luna': 'Moon',
  });

  function eclipseClose(canvas, variant) {
    const st = space(canvas, { focus: 0.36 });
    const { scene, camera } = st;
    const sun = new T.Group(); sun.position.set(0, 0, -30); scene.add(sun);
    sun.add(onGlow(new T.Mesh(new T.SphereGeometry(3, 32, 20), new T.MeshBasicMaterial({ color: 0xfff0b8 }))));
    const halo = glowSprite(0xffc860, 14, 0.8); sun.add(halo);
    const corona = glowSprite(0xdfe8ff, 13, 0); sun.add(corona);
    const corona2 = glowSprite(0xffffff, 8.5, 0); sun.add(corona2);
    const moon = new T.Mesh(new T.SphereGeometry(3 * 10 / 30 * 1.03, 32, 20), new T.MeshBasicMaterial({ color: 0x07080c }));
    scene.add(moon);
    if (variant === 'outro') fade(st);
    return (lt, dur) => {
      const p = variant === 'hook' ? smooth(prog(lt, 0.2, dur * 0.7)) : 1;
      const x = lerp(2.6, 0, p);
      moon.position.set(x, 0, -10);
      const cover = smooth(clamp(1 - Math.abs(x) / 0.4));
      halo.material.opacity = 0.8 * (1 - cover * 0.95);
      corona.material.opacity = cover * (0.75 + 0.1 * Math.sin(lt * 2)); corona2.material.opacity = cover * 0.8;
      scene.background.setRGB(0.02 * (1 - cover), 0.03 * (1 - cover), 0.07 * (1 - cover));
      camera.position.set(0, 0, 0); camera.lookAt(0, 0, -30);
      camera.fov = lerp(34, 30, smooth(clamp(lt / dur))); camera.updateProjectionMatrix();
      st.draw(lt, dur);
    };
  }

  function eclipseLine(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const SX = -3.2, MX = 2.0, EX = 3.0, RM = 0.26, RS = RM * (EX - SX) / (EX - MX);
    const sun = sunBall(scene, [SX, 0, 0], RS * 0.75);
    sun.children[0].scale.setScalar(1 / 0.75);
    const light = new T.DirectionalLight(0xfff4e0, 2.2); light.position.set(-20, 0, 0); scene.add(light);
    const moon = sphere(RM, 'moon', 5); moon.position.set(MX, 0, 0); scene.add(moon);
    const earth = sphere(variant === 'solar' ? 0.6 : 0.45, 'earth', 2); earth.position.set(EX, 0, 0); scene.add(earth);
    const lines = [];
    if (variant === 'same') {
      [-1, 1].forEach((s) => lines.push(line(scene, [EX, 0, 0], [SX, s * RS, 0], 0xffc94a, 0, true)));
      st.label({ text: 'mismo tamaño en el cielo', screen: [540, 1000], t0: (d) => d * 0.4, color: COL.gold, size: 46 });
    }
    if (variant === 'size') {
      st.label({ text: 'Sol: 400 veces más ancho', p: [SX, RS, 0], t0: 0.3, color: COL.gold, size: 40, dy: 120, dx: 120 });
      st.label({ text: 'Luna', p: [MX, RM, 0], t0: 0.6, color: COL.white, size: 34, dy: 90 });
      st.label({ text: '…y 400 veces más lejos', screen: [540, 1000], t0: (d) => d * 0.5, color: COL.white, size: 46 });
      line(scene, [SX, -RS - 0.4, 0], [EX, -RS - 0.4, 0], 0xffffff, 0.5);
    }
    let shadow = null;
    if (variant === 'solar') {
      const g = new T.ConeGeometry(RM, EX - MX - 0.55, 24, 1, true); g.rotateZ(PI / 2);
      shadow = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7, depthWrite: false, side: T.DoubleSide }));
      shadow.position.set((MX + EX - 0.55) / 2, 0, 0); scene.add(shadow);
      const spot = new T.Mesh(new T.CircleGeometry(0.07, 16), new T.MeshBasicMaterial({ color: 0x000000 }));
      spot.position.set(EX - 0.6, 0, 0.02); spot.rotation.y = -PI / 2; scene.add(spot);
      st.label({ text: 'sombra de la Luna', p: [(MX + EX) / 2, 0.1, 0], t0: (d) => d * 0.35, color: COL.white, size: 40, dy: 150 });
    }
    return (lt, dur) => {
      lines.forEach((l) => { l.material.opacity = 0.9 * smooth(prog(lt, 0.3, dur * 0.4)); });
      if (shadow) shadow.material.opacity = 0.7 * smooth(prog(lt, 0.2, dur * 0.3));
      earth.rotation.y = lt * 0.4;
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.3, 0.3, k), lerp(1.5, 1.0, k), lerp(17, 16, k)); camera.lookAt(-0.2, 0, 0);
      st.draw(lt, dur);
    };
  }

  function eclipsePath(canvas) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff4e0, 2.3); light.position.set(-6, 2, 20); scene.add(light);
    const R = 1.9;
    const earth = sphere(R, 'earth', 2, 5); scene.add(earth);
    const trail = []; const N = 60;
    const pathPt = (t) => { const lon = lerp(-1.0, 1.0, t), lat = 0.5 * Math.sin(t * PI) - 0.15; return new T.Vector3(Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat)).multiplyScalar(R * 1.01); };
    for (let i = 0; i < N; i++) {
      const m = new T.Mesh(new T.CircleGeometry(0.09, 12), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }));
      const p = pathPt(i / (N - 1)); m.position.copy(p); m.lookAt(p.clone().multiplyScalar(2)); scene.add(m); trail.push(m);
    }
    const spot = glowSprite(0x000000, 0.1, 0);
    const umbra = new T.Mesh(new T.CircleGeometry(0.2, 20), new T.MeshBasicMaterial({ color: 0x000000 })); scene.add(umbra);
    st.label({ text: 'franja de totalidad', p: () => umbra.position.toArray(), t0: (d) => d * 0.3, color: COL.gold, size: 42 });
    return (lt, dur) => {
      const p = smooth(prog(lt, 0.2, dur * 0.8));
      const pos = pathPt(p); umbra.position.copy(pos); umbra.lookAt(pos.clone().multiplyScalar(2));
      trail.forEach((m, i) => { m.visible = i / (N - 1) <= p; });
      const k = smooth(clamp(lt / dur));
      camera.position.set(lerp(-0.4, 0.4, k), 0.6, 10.5); camera.lookAt(0, 0, 0);
      st.draw(lt, dur);
    };
  }

  function eclipseOrbit(canvas, variant) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const light = new T.DirectionalLight(0xfff6e8, 2.2); light.position.set(-20, 0, 0); scene.add(light);
    sunBall(scene, [-6.4, 0, 0], 0.6);
    const earth = sphere(0.7, 'earth', 2); scene.add(earth);
    const tiltA = variant === 'tilt' ? 12 * PI / 180 : 0;
    const orbitG = new T.Group(); orbitG.rotation.z = tiltA; scene.add(orbitG);
    ring(orbitG, R_ORB, 0xffffff, 0.3);
    if (variant === 'tilt') {
      const plane = new T.Mesh(new T.CircleGeometry(4.2, 64), new T.MeshBasicMaterial({ color: 0x5aa8ff, transparent: true, opacity: 0.08, side: T.DoubleSide, depthWrite: false }));
      plane.rotation.x = -PI / 2; scene.add(plane);
      line(scene, [-6, 0, 0], [6, 0, 0], 0xffc94a, 0.5);
    }
    let shadow = null;
    if (variant === 'lunar' || variant === 'tilt') {
      const g = new T.ConeGeometry(0.7, 6, 32, 1, true); g.rotateZ(PI / 2);
      shadow = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, side: T.DoubleSide }));
      shadow.position.x = 3.0; scene.add(shadow);
    }
    const moonR = variant === 'future' ? 0.4 : 0.34;
    const moon = sphere(moonR, 'moon', 5); orbitG.add(moon);
    const red = new T.Color(0x9a3a20), white = new T.Color(0xffffff);
    if (variant === 'tilt') {
      st.label({ text: 'órbita inclinada ≈ 5°', p: [-R_ORB * Math.cos(tiltA), -R_ORB * Math.sin(tiltA) + 0.1, 0], t0: 0.3, color: COL.white, size: 38, dy: -140 });
      st.label({ text: 'pasa por arriba', p: () => { const v = new T.Vector3(); moon.getWorldPosition(v); return v.toArray(); }, t0: (d) => d * 0.55, color: COL.gold, size: 40 });
    }
    if (variant === 'lunar') st.label({ text: 'eclipse de Luna', p: () => moon.position.toArray(), t0: (d) => d * 0.55, color: '#ff8a7a', size: 44 });
    if (variant === 'future') st.label({ text: '+3,8 cm por año', p: () => moon.position.toArray(), t0: 0.4, color: COL.gold, size: 44 });
    const futRing = variant === 'future' ? ring(scene, R_ORB, 0xffc94a, 0.4) : null;
    return (lt, dur) => {
      const k = smooth(clamp(lt / dur));
      let phi = 0, R = R_ORB;
      if (variant === 'lunar') phi = lerp(-0.7, 0, smooth(prog(lt, 0.1, dur * 0.6)));
      if (variant === 'tilt') phi = lerp(-0.9, 0.5, k);
      if (variant === 'future') { phi = lt * 0.5; R = lerp(R_ORB * 0.8, R_ORB * 1.25, k); futRing.scale.setScalar(R / R_ORB); }
      moon.position.set(R * Math.cos(phi), 0, -R * Math.sin(phi));
      const v = new T.Vector3(); moon.getWorldPosition(v);
      const inShadow = variant === 'lunar' ? smooth(clamp(1 - Math.hypot(v.y, v.z) / 0.45)) * (v.x > 0 ? 1 : 0) : 0;
      moon.material.color.copy(white).lerp(red, inShadow);
      earth.rotation.y = lt * 0.4;
      if (variant === 'tilt') { camera.position.set(0.5, 2.0, 13.5); camera.lookAt(0.4, 0, 0); }
      else { camera.position.set(lerp(-0.5, 0.5, k), 7.5, 11.5); camera.lookAt(0.6, 0, 0.3); }
      st.draw(lt, dur);
    };
  }

  // Desde la Luna durante un eclipse lunar: la Tierra tapa el Sol con un anillo rojo de atmósfera.
  function eclipseRed(canvas) {
    const st = space(canvas, { focus: 0.37 });
    const { scene, camera } = st;
    const sun = glowSprite(0xfff0c0, 7, 1); sun.position.set(0, 0, -40); scene.add(sun);
    const earth = new T.Mesh(new T.SphereGeometry(2.2, 48, 32), new T.MeshBasicMaterial({ color: 0x05070c })); earth.position.set(0, 0, -12); scene.add(earth);
    const ringM = onGlow(new T.Mesh(new T.RingGeometry(2.2, 2.42, 128), new T.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, side: T.DoubleSide })));
    ringM.position.set(0, 0, -11.9); scene.add(ringM);
    const ringGlow = glowSprite(0xff5a20, 6.8, 0); ringGlow.position.set(0, 0, -12.2); scene.add(ringGlow);
    st.label({ text: 'luz de todos los\namaneceres y atardeceres', p: [1.6, 1.6, -12], t0: (d) => d * 0.35, color: COL.orange, size: 38, dy: 150 });
    return (lt, dur) => {
      const p = smooth(prog(lt, 0.2, dur * 0.4));
      earth.position.x = lerp(3.5, 0, p); ringM.position.x = earth.position.x; ringGlow.position.x = earth.position.x;
      const cover = smooth(clamp(1 - Math.abs(earth.position.x) / 0.8));
      sun.material.opacity = 1 - cover; ringM.material.opacity = 0.25 + 0.75 * cover; ringGlow.material.opacity = cover * 0.9;
      camera.position.set(0, 0, 0); camera.lookAt(0, 0, -12);
      st.draw(lt, dur);
    };
  }

  reg('ecl_hook', (c) => eclipseClose(c, 'hook'));
  reg('ecl_outro', (c) => eclipseClose(c, 'outro'));
  ['size', 'same', 'solar'].forEach((v) => reg(`ecl_${v}`, (c) => eclipseLine(c, v)));
  reg('ecl_path', (c) => eclipsePath(c));
  ['tilt', 'lunar', 'future'].forEach((v) => reg(`ecl_${v}`, (c) => eclipseOrbit(c, v)));
  reg('ecl_red', (c) => eclipseRed(c));
})();
