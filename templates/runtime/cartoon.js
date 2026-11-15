// Escenas de caricatura: personajes originales del proyecto ("frijolitos") que actúan sobre un escenario.
// Todo se describe con datos (escenario, reparto, acciones y efectos); aquí no llega código de la IA.
// VF.cartoon.build(svg, scene) devuelve update(lt, dur), una función pura del tiempo local de la escena.
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1080, H = 1920, FLOOR = 1250, INK = '#1a1020';
  const n = (tag, a = {}, kids = []) => {
    const e = document.createElementNS(NS, tag);
    for (const k in a) e.setAttribute(k, String(a[k]));
    kids.forEach((c) => e.appendChild(c));
    return e;
  };
  const txt = (s, a) => n('text', a, [document.createTextNode(s)]);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const prog = (t, s, d) => clamp((t - s) / d);
  const lerp = (a, b, p) => a + (b - a) * p;
  const outBack = (p) => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const outCubic = (p) => 1 - Math.pow(1 - p, 3);
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ------------------------------------------------------------------ escenarios
  function house(g) {
    g.append(n('rect', { width: W, height: H, fill: '#2b1f3f' }), n('rect', { y: FLOOR, width: W, height: H - FLOOR, fill: '#5a3b2a' }));
    for (let i = 0; i < 10; i++) g.appendChild(n('rect', { y: FLOOR + i * 70, width: W, height: 5, fill: '#4a2f20' }));
    for (let i = 0; i < 40; i++) g.appendChild(n('circle', { cx: (i % 8) * 140 + 70, cy: Math.floor(i / 8) * 170 + 250, r: 10, fill: '#3a2a52' }));
    g.append(n('rect', { x: 90, y: 480, width: 240, height: 300, rx: 14, fill: '#141a33', stroke: '#7a5a3a', 'stroke-width': 16 }),
      n('path', { d: 'M210,480 L210,780 M90,630 L330,630', stroke: '#7a5a3a', 'stroke-width': 10 }),
      n('path', { d: `M640,${FLOOR} L1080,${FLOOR - 440} L1080,${FLOOR} Z`, fill: '#3a2a20' }),
      n('rect', { x: 700, y: FLOOR - 170, width: 120, height: 170, fill: '#140c08', stroke: '#6b4a33', 'stroke-width': 8 }));
    for (let i = 0; i < 7; i++) g.appendChild(n('rect', { x: 640 + i * 63, y: FLOOR - (i + 1) * 63, width: 440 - i * 63, height: 14, fill: '#6b4a33' }));
    const bolt = n('path', { d: 'M230,500 L180,600 L215,600 L165,720 L260,570 L220,570 L265,500 Z', fill: '#fff6a0' });
    g.appendChild(bolt);
    return (t) => bolt.setAttribute('opacity', t % 2.6 < 0.12 ? 1 : 0);
  }

  function street(g) {
    g.append(n('rect', { width: W, height: H, fill: '#3a5a8a' }), n('rect', { y: FLOOR, width: W, height: H - FLOOR, fill: '#8a7a6a' }));
    const cols = ['#c8553d', '#5b8e7d', '#e0a458', '#7d5ba6', '#d16a8a'];
    for (let i = 0; i < 5; i++) {
      const x = i * 216, h = 520 + (i % 3) * 120;
      g.append(n('rect', { x: x + 6, y: FLOOR - h, width: 204, height: h, fill: cols[i], stroke: INK, 'stroke-width': 6 }),
        n('path', { d: `M${x},${FLOOR - h} L${x + 108},${FLOOR - h - 120} L${x + 216},${FLOOR - h} Z`, fill: '#3a2a40', stroke: INK, 'stroke-width': 6 }),
        n('rect', { x: x + 40, y: FLOOR - h + 80, width: 130, height: 110, rx: 10, fill: '#ffe9a0', stroke: INK, 'stroke-width': 5 }),
        n('rect', { x: x + 70, y: FLOOR - 190, width: 76, height: 190, fill: '#4a2a20', stroke: INK, 'stroke-width': 5 }));
    }
    const flags = n('path', { fill: 'none', stroke: '#fff', 'stroke-width': 3 });
    g.appendChild(flags);
    return (t) => flags.setAttribute('d', `M0,520 Q270,${560 + Math.sin(t * 2) * 20} 540,520 T1080,520`);
  }

  function train(g) {
    g.append(n('rect', { width: W, height: H, fill: '#6a2a30' }));
    const land = n('g');
    const win = n('g', {}, [n('rect', { x: 100, y: 380, width: 880, height: 520, rx: 30, fill: '#8fd3ff' }), land]);
    for (let i = 0; i < 16; i++) land.appendChild(n('path', { d: `M${i * 260},900 Q${i * 260 + 130},${640 + (i % 3) * 60} ${i * 260 + 260},900 Z`, fill: i % 2 ? '#5aa65a' : '#4a8f4a' }));
    const clip = n('clipPath', { id: 'cwin' }, [n('rect', { x: 100, y: 380, width: 880, height: 520, rx: 30 })]);
    win.setAttribute('clip-path', 'url(#cwin)');
    g.append(n('defs', {}, [clip]), win, n('rect', { x: 100, y: 380, width: 880, height: 520, rx: 30, fill: 'none', stroke: '#c9a24a', 'stroke-width': 18 }),
      n('rect', { y: FLOOR, width: W, height: H - FLOOR, fill: '#3a1a1e' }),
      n('rect', { x: 60, y: FLOOR - 120, width: 960, height: 120, rx: 20, fill: '#8a2a34', stroke: INK, 'stroke-width': 6 }));
    return (t) => land.setAttribute('transform', `translate(${(-(t * 420) % 520).toFixed(1)} 0)`);
  }

  function greatHall(g) {
    g.append(n('rect', { width: W, height: H, fill: '#1c1a3a' }), n('rect', { y: FLOOR, width: W, height: H - FLOOR, fill: '#4a3a2a' }));
    for (let i = 0; i < 60; i++) g.appendChild(n('circle', { cx: hash(i) * W, cy: hash(i + 99) * 700 + 60, r: 2 + hash(i + 7) * 3, fill: '#fff', opacity: 0.7 }));
    g.append(n('rect', { x: 40, y: FLOOR - 90, width: 1000, height: 40, rx: 10, fill: '#7a5232', stroke: INK, 'stroke-width': 5 }));
    const candles = [];
    for (let i = 0; i < 9; i++) {
      const c = n('g', {}, [n('rect', { x: -10, y: 0, width: 20, height: 60, fill: '#f6efd9', stroke: INK, 'stroke-width': 3 }),
        n('path', { d: 'M0,-26 C10,-10 8,0 0,0 C-8,0 -10,-10 0,-26 Z', fill: '#ffcf4a' })]);
      candles.push(c); g.appendChild(c);
    }
    return (t) => candles.forEach((c, i) => c.setAttribute('transform', `translate(${80 + i * 115} ${560 + Math.sin(t * 1.5 + i) * 30})`));
  }

  function sky(g) {
    g.append(n('rect', { width: W, height: H, fill: '#6fc3ff' }), n('rect', { y: FLOOR + 160, width: W, height: H, fill: '#4aa04a' }));
    for (const x of [180, 540, 900]) g.append(n('rect', { x: x - 6, y: 700, width: 12, height: FLOOR + 160 - 700, fill: '#c9a24a' }),
      n('circle', { cx: x, cy: 640, r: 70, fill: 'none', stroke: '#c9a24a', 'stroke-width': 14 }));
    const clouds = Array.from({ length: 4 }, (_, i) => {
      const c = n('g', {}, [n('ellipse', { rx: 120, ry: 50, fill: '#fff' }), n('ellipse', { cx: 70, cy: -30, rx: 70, ry: 50, fill: '#fff' })]);
      g.appendChild(c); return c;
    });
    return (t) => clouds.forEach((c, i) => c.setAttribute('transform', `translate(${((i * 330 + t * 60) % 1400) - 200} ${300 + i * 90})`));
  }

  function corridor(g) {
    g.append(n('rect', { width: W, height: H, fill: '#3a3a48' }), n('rect', { y: FLOOR, width: W, height: H - FLOOR, fill: '#2a2a34' }));
    for (let r = 0; r < 14; r++) for (let c = 0; c < 6; c++) g.appendChild(n('rect', { x: c * 190 + (r % 2) * 95 - 60, y: r * 80 + 140, width: 180, height: 70, rx: 6, fill: '#4a4a5a' }));
    g.append(n('rect', { x: 380, y: FLOOR + 30, width: 320, height: 90, fill: '#5a3a20', stroke: INK, 'stroke-width': 6 }),
      n('circle', { cx: 540, cy: FLOOR + 75, r: 12, fill: '#c9a24a' }));
    const torches = [180, 900].map((x) => { const f = n('path', { fill: '#ff9a2a' }); g.append(n('rect', { x: x - 8, y: 600, width: 16, height: 70, fill: '#5a3a20' }), f); return [x, f]; });
    return (t) => torches.forEach(([x, f], i) => { const k = 1 + Math.sin(t * 13 + i) * 0.15; f.setAttribute('d', `M${x},${600 - 50 * k} C${x + 26},${580} ${x + 16},600 ${x},600 C${x - 16},600 ${x - 26},580 ${x},${600 - 50 * k} Z`); });
  }

  function forest(g) {
    g.append(n('rect', { width: W, height: H, fill: '#0e1a2a' }), n('circle', { cx: 820, cy: 360, r: 90, fill: '#f6f0d2' }),
      n('rect', { y: FLOOR, width: W, height: H - FLOOR, fill: '#14281a' }));
    for (let i = 0; i < 9; i++) {
      const x = i * 130 - 20 + hash(i) * 40, h = 700 + hash(i + 3) * 300;
      g.append(n('rect', { x: x + 40, y: FLOOR - h * 0.4, width: 30, height: h * 0.4, fill: '#1a1210' }),
        n('path', { d: `M${x},${FLOOR - h * 0.35} L${x + 55},${FLOOR - h} L${x + 110},${FLOOR - h * 0.35} Z`, fill: '#0f2a18' }));
    }
    const fog = n('ellipse', { cx: 540, cy: FLOOR - 20, rx: 700, ry: 80, fill: '#9ab', opacity: 0.18 });
    g.appendChild(fog);
    return (t) => fog.setAttribute('cx', (540 + Math.sin(t * 0.6) * 80).toFixed(1));
  }

  function chessboard(g) {
    g.append(n('rect', { width: W, height: H, fill: '#20182c' }));
    for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) {
      const y = FLOOR - 260 + r * 90, sc = 0.7 + r * 0.06, w = 180 * sc;
      g.appendChild(n('rect', { x: 540 + (c - 3) * w, y, width: w, height: 90, fill: (r + c) % 2 ? '#e8e0d0' : '#2a2a2a' }));
    }
    for (const [x, y, s] of [[160, 700, 1], [920, 700, 1], [330, 760, 0.8], [760, 760, 0.8]]) {
      g.appendChild(n('path', { d: `M${x - 50 * s},${y + 200 * s} L${x + 50 * s},${y + 200 * s} L${x + 30 * s},${y + 60 * s} C${x + 60 * s},${y} ${x + 20 * s},${y - 60 * s} ${x - 20 * s},${y - 40 * s} L${x - 40 * s},${y + 10 * s} L${x - 20 * s},${y + 60 * s} Z`, fill: '#4a4a52', stroke: INK, 'stroke-width': 5 }));
    }
    return () => {};
  }

  function castleNight(g) {
    g.append(n('rect', { width: W, height: H, fill: '#16143a' }), n('circle', { cx: 860, cy: 320, r: 80, fill: '#f6f0d2' }),
      n('rect', { y: FLOOR, width: W, height: H - FLOOR, fill: '#1a2a1a' }));
    const stars = [];
    for (let i = 0; i < 50; i++) { const s = n('circle', { cx: hash(i) * W, cy: hash(i + 40) * 600 + 80, r: 3, fill: '#fff' }); stars.push(s); g.appendChild(s); }
    for (const [x, y, w] of [[160, 560, 120], [300, 460, 130], [460, 380, 160], [640, 480, 130], [790, 580, 120]]) {
      g.append(n('rect', { x, y, width: w, height: FLOOR - y, fill: '#2a2848', stroke: INK, 'stroke-width': 5 }),
        n('path', { d: `M${x - 14},${y} L${x + w / 2},${y - w * 1.1} L${x + w + 14},${y} Z`, fill: '#3a2a5a', stroke: INK, 'stroke-width': 5 }),
        n('rect', { x: x + w / 2 - 14, y: y + 60, width: 28, height: 44, rx: 14, fill: '#ffd36a' }));
    }
    return (t) => stars.forEach((s, i) => s.setAttribute('opacity', (0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i))).toFixed(2)));
  }

  function mirrorRoom(g) {
    g.append(n('rect', { width: W, height: H, fill: '#241a30' }), n('rect', { y: FLOOR, width: W, height: H - FLOOR, fill: '#3a2a3a' }),
      n('path', { d: `M540,${FLOOR - 820} C700,${FLOOR - 820} 740,${FLOOR - 680} 740,${FLOOR - 560} L740,${FLOOR} L340,${FLOOR} L340,${FLOOR - 560} C340,${FLOOR - 680} 380,${FLOOR - 820} 540,${FLOOR - 820} Z`, fill: '#c79a3a', stroke: INK, 'stroke-width': 6 }),
      n('path', { d: `M540,${FLOOR - 780} C670,${FLOOR - 780} 700,${FLOOR - 660} 700,${FLOOR - 560} L700,${FLOOR - 40} L380,${FLOOR - 40} L380,${FLOOR - 560} C380,${FLOOR - 660} 410,${FLOOR - 780} 540,${FLOOR - 780} Z`, fill: '#5a6a9a' }));
    const ghosts = [460, 620].map((x) => { const gh = n('g', { opacity: 0.5 }, [n('ellipse', { cx: x, cy: FLOOR - 300, rx: 60, ry: 90, fill: '#cfe0ff' }), n('circle', { cx: x, cy: FLOOR - 430, r: 45, fill: '#cfe0ff' })]); g.appendChild(gh); return gh; });
    return (t) => ghosts.forEach((gh, i) => gh.setAttribute('opacity', (0.3 + 0.3 * Math.sin(t * 2 + i)).toFixed(2)));
  }

  const SETTINGS = { house, street, train, great_hall: greatHall, sky, corridor, forest, chessboard, castle_night: castleNight, mirror_room: mirrorRoom };

  // ------------------------------------------------------------------ personajes
  const CHARACTERS = {
    hero: { color: '#ff9a3c', belly: '#ffd27a', hair: 'tuft', size: 1 },
    friend_boy: { color: '#5aa7ff', belly: '#b4dbff', hat: 'cap', size: 1.05 },
    friend_girl: { color: '#ff7ab6', belly: '#ffc4de', hat: 'bow', size: 0.98, prop: 'book' },
    giant: { color: '#6b4a8a', belly: '#a98ac9', beard: true, size: 1.75 },
    aunt: { color: '#8fd16a', belly: '#c8f0a0', size: 1, tall: 1.15 },
    uncle: { color: '#e05050', belly: '#ff9a9a', mustache: true, size: 1.35 },
    professor: { color: '#7d8299', belly: '#b9bdd0', hat: 'wizard', brows: 'angry', size: 1.1, tall: 1.2 },
    turban: { color: '#e8c070', belly: '#f6e2ae', hat: 'turban', brows: 'worried', size: 1.05, tall: 1.1 },
    elder: { color: '#d8d0f0', belly: '#f4f0ff', hat: 'wizard', beard: true, size: 1.15, tall: 1.15 },
    villain: { kind: 'hood', size: 1.3 },
    dog3: { kind: 'dog3', size: 1 },
    owl: { kind: 'owl', size: 1 },
  };

  function prop(kind) {
    if (kind === 'wand') return n('g', {}, [n('path', { d: 'M0,0 L70,-40', stroke: '#7a5232', 'stroke-width': 8, 'stroke-linecap': 'round' })]);
    if (kind === 'book') return n('g', {}, [n('rect', { x: -10, y: -40, width: 70, height: 56, rx: 6, fill: '#3a6ad0', stroke: INK, 'stroke-width': 5 })]);
    if (kind === 'letter') return n('g', {}, [n('rect', { x: -6, y: -40, width: 80, height: 54, fill: '#efe2c0', stroke: INK, 'stroke-width': 5 }), n('circle', { cx: 34, cy: -12, r: 8, fill: '#b02a2a' })]);
    if (kind === 'stone') return n('g', {}, [n('path', { d: 'M20,-60 L46,-40 L40,-6 L20,6 L0,-6 L-6,-40 Z', fill: '#e01a3a', stroke: INK, 'stroke-width': 5 })]);
    return null;
  }

  function bean(def) {
    const g = n('g'), body = n('g');
    const limb = (w) => n('path', { stroke: INK, 'stroke-width': w, 'stroke-linecap': 'round', fill: 'none' });
    const legL = limb(16), legR = limb(16), armL = limb(14), armR = limb(14);
    const tall = def.tall || 1;
    const top = -230 * tall;
    const torso = n('path', { d: `M-80,0 C-90,${top * 0.52} -60,${top} 0,${top} C60,${top} 90,${top * 0.52} 80,0 C60,30 -60,30 -80,0 Z`, fill: def.color, stroke: INK, 'stroke-width': 8 });
    const ey = top + 70;
    const eyes = [-28, 28].map((x) => n('ellipse', { cx: x, cy: ey, rx: 26, ry: 30, fill: '#fff', stroke: INK, 'stroke-width': 6 }));
    const pupils = [0, 1].map(() => n('circle', { r: 11, fill: INK }));
    const brows = [0, 1].map(() => n('path', { stroke: INK, 'stroke-width': 8, 'stroke-linecap': 'round', fill: 'none' }));
    const mouth = n('path', { fill: '#5a1020', stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' });
    body.append(armL, torso, n('ellipse', { cx: 0, cy: top * 0.27, rx: 46, ry: 50 * tall, fill: def.belly, opacity: 0.7 }), ...eyes, ...pupils, ...brows, mouth);
    [-56, 56].forEach((x) => body.appendChild(n('ellipse', { cx: x, cy: ey + 42, rx: 14, ry: 8, fill: '#ff7aa0', opacity: 0.55 })));
    if (def.hair === 'tuft') body.appendChild(n('path', { d: `M-40,${top + 4} C-30,${top - 32} -6,${top - 20} 0,${top - 46} C10,${top - 20} 30,${top - 32} 40,${top + 4} Z`, fill: '#5a2a10' }));
    if (def.hat === 'cap') body.appendChild(n('path', { d: `M-66,${top + 30} C-60,${top - 30} 60,${top - 30} 66,${top + 30} L110,${top + 34} L66,${top + 40} Z`, fill: '#2f8f4a', stroke: INK, 'stroke-width': 6 }));
    if (def.hat === 'bow') body.appendChild(n('path', { d: `M0,${top + 6} L-46,${top - 26} L-46,${top + 30} Z M0,${top + 6} L46,${top - 26} L46,${top + 30} Z`, fill: '#a020a0', stroke: INK, 'stroke-width': 5 }));
    if (def.hat === 'wizard') body.appendChild(n('path', { d: `M-74,${top + 20} C-30,${top - 8} 30,${top - 8} 74,${top + 20} L10,${top - 160} C6,${top - 170} -2,${top - 170} -6,${top - 160} Z`, fill: '#2a2a5a', stroke: INK, 'stroke-width': 7 }));
    if (def.hat === 'turban') body.appendChild(n('path', { d: `M-72,${top + 30} C-80,${top - 40} 80,${top - 40} 72,${top + 30} C40,${top + 10} -40,${top + 10} -72,${top + 30} Z`, fill: '#7a3aa0', stroke: INK, 'stroke-width': 6 }));
    if (def.beard) body.appendChild(n('path', { d: `M-78,${ey + 30} C-80,${ey + 150} 80,${ey + 150} 78,${ey + 30} C50,${ey + 70} -50,${ey + 70} -78,${ey + 30} Z`, fill: def.hat ? '#f4f4f4' : '#3a2410', stroke: INK, 'stroke-width': 5 }));
    if (def.mustache) body.appendChild(n('path', { d: `M-50,${ey + 34} C-20,${ey + 20} 20,${ey + 20} 50,${ey + 34} C20,${ey + 46} -20,${ey + 46} -50,${ey + 34} Z`, fill: '#3a2410' }));
    body.appendChild(armR);
    const hand = n('g');
    body.appendChild(hand);
    let held = null;
    const broom = n('g', { opacity: 0 }, [n('path', { d: 'M-170,-20 L170,-60', stroke: '#7a5232', 'stroke-width': 14, 'stroke-linecap': 'round' }),
      n('path', { d: 'M-170,-20 C-230,-40 -250,10 -250,40 C-210,20 -190,10 -160,0 Z', fill: '#c99a4a', stroke: INK, 'stroke-width': 5 })]);
    g.append(broom, legL, legR, body);
    const st = { x: 0, y: 0, sx: 1, sy: 1, rot: 0, look: [0, 0], eye: 1, mouth: 'smile', brow: def.brows || 'none', armL: [-100, -60], armR: [100, -60], step: 0, op: 1, face: 1, broom: 0, prop: def.prop || null, legs: 1 };
    const MOUTH = { smile: 'M-30,8 Q0,36 30,8 Q0,20 -30,8 Z', shock: 'M-16,10 C-16,34 16,34 16,10 C16,-10 -16,-10 -16,10 Z',
      grin: 'M-40,2 Q0,50 40,2 Z', flat: 'M-24,14 L24,14 L24,20 L-24,20 Z', frown: 'M-30,26 Q0,0 30,26 Q0,14 -30,26 Z',
      talk: 'M-24,8 Q0,30 24,8 Q0,16 -24,8 Z' };
    function draw() {
      g.setAttribute('transform', `translate(${st.x.toFixed(1)} ${st.y.toFixed(1)}) scale(${(def.size * st.face).toFixed(3)} ${def.size})`);
      g.setAttribute('opacity', st.op.toFixed(3));
      body.setAttribute('transform', `rotate(${st.rot.toFixed(2)}) scale(${st.sx.toFixed(3)} ${st.sy.toFixed(3)})`);
      const sw = Math.sin(st.step) * 28 * st.legs, l1 = Math.max(0, Math.cos(st.step)) * 18 * st.legs, l2 = Math.max(0, -Math.cos(st.step)) * 18 * st.legs;
      const kneeY = st.broom ? 30 : 40, footY = st.broom ? 40 : 80;
      legL.setAttribute('d', `M-30,0 Q${(-34 + sw / 2).toFixed(1)},${kneeY} ${(-36 + sw).toFixed(1)},${(footY - l1).toFixed(1)}`);
      legR.setAttribute('d', `M30,0 Q${(34 - sw / 2).toFixed(1)},${kneeY} ${(36 - sw).toFixed(1)},${(footY - l2).toFixed(1)}`);
      const ay = top * 0.43 * st.sy;
      armL.setAttribute('d', `M-70,${ay} Q${(st.armL[0] * 0.7).toFixed(1)},${(ay + st.armL[1] * 0.4).toFixed(1)} ${st.armL[0].toFixed(1)},${(ay + st.armL[1]).toFixed(1)}`);
      armR.setAttribute('d', `M70,${ay} Q${(st.armR[0] * 0.7).toFixed(1)},${(ay + st.armR[1] * 0.4).toFixed(1)} ${st.armR[0].toFixed(1)},${(ay + st.armR[1]).toFixed(1)}`);
      hand.setAttribute('transform', `translate(${st.armR[0].toFixed(1)} ${(ay + st.armR[1]).toFixed(1)})`);
      if (held !== st.prop) { hand.replaceChildren(); const p = st.prop && prop(st.prop); if (p) hand.appendChild(p); held = st.prop; }
      eyes.forEach((e) => { e.setAttribute('ry', (30 * st.eye).toFixed(1)); e.setAttribute('rx', (26 * (0.8 + 0.2 * st.eye)).toFixed(1)); });
      pupils.forEach((p, i) => { p.setAttribute('cx', ((i ? 28 : -28) + st.look[0] * 10).toFixed(1)); p.setAttribute('cy', (ey + st.look[1] * 10).toFixed(1)); p.setAttribute('r', st.eye > 1.25 ? 7 : 11); });
      const b = { none: null, angry: [10, -10], worried: [-10, 10], up: [-4, -4] }[st.brow];
      brows.forEach((br, i) => {
        if (!b) { br.setAttribute('d', ''); return; }
        const x = i ? 28 : -28, d = i ? b[1] : b[0];
        br.setAttribute('d', `M${x - 22},${ey - 40 - d * (i ? -1 : 1) * 0.6} L${x + 22},${ey - 40 + d * (i ? -1 : 1) * 0.6}`);
      });
      mouth.setAttribute('d', MOUTH[st.mouth] || MOUTH.smile);
      mouth.setAttribute('transform', `translate(0 ${ey + 40})`);
      broom.setAttribute('opacity', st.broom);
    }
    return { g, st, draw, kind: 'bean' };
  }

  function hood(def) {
    const g = n('g');
    const robe = n('path', { d: 'M0,-330 C-90,-330 -110,-230 -100,-150 C-130,-60 -150,0 -150,30 L150,30 C150,0 130,-60 100,-150 C110,-230 90,-330 0,-330 Z', fill: '#2a1a3a', stroke: INK, 'stroke-width': 8 });
    const face = n('path', { d: 'M0,-290 C-50,-290 -60,-240 -56,-196 C-36,-176 36,-176 56,-196 C60,-240 50,-290 0,-290 Z', fill: '#05030a' });
    const eyes = [-20, 20].map((x) => n('ellipse', { cx: x, cy: -236, rx: 12, ry: 6, fill: '#ff3030' }));
    const body = n('g', {}, [robe, face, ...eyes]);
    g.appendChild(body);
    const st = { x: 0, y: 0, sx: 1, sy: 1, rot: 0, op: 1, face: 1, glow: 1 };
    return { g, st, kind: 'hood', draw() {
      g.setAttribute('transform', `translate(${st.x.toFixed(1)} ${st.y.toFixed(1)}) scale(${(def.size * st.face).toFixed(3)} ${def.size})`);
      g.setAttribute('opacity', st.op.toFixed(3));
      body.setAttribute('transform', `rotate(${st.rot.toFixed(2)}) scale(${st.sx.toFixed(3)} ${st.sy.toFixed(3)})`);
      eyes.forEach((e) => e.setAttribute('opacity', st.glow.toFixed(2)));
    } };
  }

  function dog3(def) {
    const g = n('g');
    const heads = [];
    const body = n('g', {}, [
      n('ellipse', { cx: 0, cy: -150, rx: 230, ry: 120, fill: '#8a5a3a', stroke: INK, 'stroke-width': 8 }),
      ...[-160, -70, 70, 160].map((x) => n('rect', { x: x - 26, y: -80, width: 52, height: 110, rx: 20, fill: '#7a4a2a', stroke: INK, 'stroke-width': 7 })),
    ]);
    [[-170, -1], [0, 0], [170, 1]].forEach(([x, k]) => {
      const tongue = n('path', { d: 'M-14,30 C-14,70 14,70 14,30 Z', fill: '#ff6a8a', stroke: INK, 'stroke-width': 4 });
      const h = n('g', {}, [
        n('path', { d: 'M-70,-20 L-90,-110 L-30,-70 Z M70,-20 L90,-110 L30,-70 Z', fill: '#6a3a1a', stroke: INK, 'stroke-width': 6 }),
        n('circle', { cx: 0, cy: 0, r: 80, fill: '#9a6a4a', stroke: INK, 'stroke-width': 8 }),
        n('circle', { cx: -28, cy: -14, r: 20, fill: '#fff', stroke: INK, 'stroke-width': 5 }), n('circle', { cx: 28, cy: -14, r: 20, fill: '#fff', stroke: INK, 'stroke-width': 5 }),
        n('circle', { cx: -24 + k * 6, cy: -12, r: 8, fill: INK }), n('circle', { cx: 32 + k * 6, cy: -12, r: 8, fill: INK }),
        n('ellipse', { cx: 0, cy: 22, rx: 22, ry: 14, fill: INK }), tongue,
      ]);
      const w = n('g', {}, [h]);
      heads.push([w, x]);
      body.appendChild(w);
    });
    g.appendChild(body);
    const st = { x: 0, y: 0, sx: 1, sy: 1, rot: 0, op: 1, face: 1, t: 0, bark: 0 };
    return { g, st, kind: 'dog3', draw() {
      g.setAttribute('transform', `translate(${st.x.toFixed(1)} ${st.y.toFixed(1)}) scale(${(def.size * st.face).toFixed(3)} ${def.size})`);
      g.setAttribute('opacity', st.op.toFixed(3));
      body.setAttribute('transform', `scale(${st.sx.toFixed(3)} ${st.sy.toFixed(3)})`);
      heads.forEach(([w, x], i) => w.setAttribute('transform', `translate(${x} ${(-300 + Math.sin(st.t * 4 + i * 2) * 14 - (st.bark && Math.sin(st.t * 12 + i) > 0 ? 18 : 0)).toFixed(1)}) rotate(${(Math.sin(st.t * 3 + i) * 8).toFixed(1)})`));
    } };
  }

  function owl(def) {
    const g = n('g');
    const wl = n('path', { d: 'M-30,-60 C-90,-90 -150,-70 -170,-30 C-110,-30 -70,-20 -30,-10 Z', fill: '#e9e4d6', stroke: INK, 'stroke-width': 5 });
    const wr = n('path', { d: 'M30,-60 C90,-90 150,-70 170,-30 C110,-30 70,-20 30,-10 Z', fill: '#e9e4d6', stroke: INK, 'stroke-width': 5 });
    const body = n('g', {}, [wl, wr, n('ellipse', { cx: 0, cy: -60, rx: 60, ry: 76, fill: '#f6f2e6', stroke: INK, 'stroke-width': 6 }),
      n('circle', { cx: -22, cy: -86, r: 18, fill: '#fff', stroke: INK, 'stroke-width': 4 }), n('circle', { cx: 22, cy: -86, r: 18, fill: '#fff', stroke: INK, 'stroke-width': 4 }),
      n('circle', { cx: -22, cy: -86, r: 8, fill: INK }), n('circle', { cx: 22, cy: -86, r: 8, fill: INK }),
      n('path', { d: 'M-8,-70 L0,-56 L8,-70 Z', fill: '#e3a512' }),
      n('rect', { x: -26, y: 6, width: 52, height: 36, fill: '#efe2c0', stroke: INK, 'stroke-width': 4 })]);
    g.appendChild(body);
    const st = { x: 0, y: 0, sx: 1, sy: 1, rot: 0, op: 1, face: 1, flap: 0 };
    return { g, st, kind: 'owl', draw() {
      g.setAttribute('transform', `translate(${st.x.toFixed(1)} ${st.y.toFixed(1)}) scale(${(def.size * st.face).toFixed(3)} ${def.size}) rotate(${st.rot.toFixed(1)})`);
      g.setAttribute('opacity', st.op.toFixed(3));
      const a = Math.sin(st.flap * 14) * 26;
      wl.setAttribute('transform', `rotate(${a.toFixed(1)} -30 -40)`);
      wr.setAttribute('transform', `rotate(${(-a).toFixed(1)} 30 -40)`);
    } };
  }

  function makeCharacter(name) {
    const def = CHARACTERS[name] || CHARACTERS.hero;
    if (def.kind === 'hood') return hood(def);
    if (def.kind === 'dog3') return dog3(def);
    if (def.kind === 'owl') return owl(def);
    return bean(def);
  }

  // -------------------------------------------------------------------- acciones
  // Cada acción ajusta el estado del personaje para el tiempo t (segundos desde que empieza su acción).
  const ACTIONS = {
    idle(c, t) { const s = c.st; if (c.kind !== 'bean') return; s.sy = 1 + Math.sin(t * 3) * 0.02; s.eye = (t % 3.1) < 0.12 ? 0.1 : 1; s.armL = [-100, -50 + Math.sin(t * 3) * 6]; s.armR = [100, -50 + Math.sin(t * 3 + 1) * 6]; },
    talk(c, t) { ACTIONS.idle(c, t); const s = c.st; if (c.kind !== 'bean') return; s.mouth = Math.sin(t * 16) > 0 ? 'talk' : 'smile'; s.armR = [120, -110 + Math.sin(t * 5) * 40]; },
    walk_in(c, t, m) { const s = c.st; const p = outCubic(prog(t, 0, 1.3)); s.x = lerp(m.x0 + (m.facing > 0 ? -700 : 700), m.x0, p);
      if (c.kind === 'bean') { s.step = p < 1 ? t * 12 : 0; s.sy = 1 + Math.sin(t * 12) * 0.04 * (p < 1); s.armL = [-90, -40 + Math.sin(t * 12) * 30 * (p < 1)]; s.armR = [90, -40 - Math.sin(t * 12) * 30 * (p < 1)]; }
      if (p >= 1) ACTIONS.idle(c, t); },
    run(c, t, m) { const s = c.st; s.x = m.x0 + m.facing * (((t * 520) % 1800) - 900); if (c.kind !== 'bean') return; s.step = t * 22; s.rot = 8 * m.facing; s.mouth = 'shock'; s.eye = 1.3; s.armL = [-120, -120 + Math.sin(t * 22) * 50]; s.armR = [120, -120 - Math.sin(t * 22) * 50]; },
    sleepy(c, t) { const s = c.st; if (c.kind !== 'bean') return; s.eye = 0.3; s.mouth = 'flat'; s.rot = Math.sin(t * 1.6) * 5; s.sy = 1 + Math.sin(t * 1.6) * 0.03; s.armL = [-90, 10]; s.armR = [90, 10]; },
    shocked(c, t) { const s = c.st; const k = Math.sin(prog(t, 0, 0.4) * Math.PI); s.y -= k * 110;
      if (c.kind === 'bean') { s.eye = 1.6; s.mouth = 'shock'; s.brow = 'up'; s.armL = [-130, -190]; s.armR = [130, -190]; s.rot = Math.sin(t * 40) * 2; s.sy = 1 + k * 0.2; s.sx = 1 - k * 0.1; } },
    jump_joy(c, t) { const s = c.st; const ph = (t % 0.8) / 0.8; const k = Math.sin(ph * Math.PI); s.y -= k * 220;
      if (c.kind === 'bean') { s.sy = 1 + k * 0.22 - (ph < 0.08 ? 0.2 : 0); s.sx = 1 - k * 0.12; s.mouth = 'grin'; s.eye = 1.2; s.armL = [-110, -210]; s.armR = [110, -210]; } },
    wave(c, t) { ACTIONS.idle(c, t); const s = c.st; if (c.kind !== 'bean') return; s.mouth = 'grin'; s.armR = [120 + Math.sin(t * 10) * 30, -200]; },
    point(c, t) { ACTIONS.idle(c, t); const s = c.st; if (c.kind !== 'bean') return; s.armR = [170, -80]; s.brow = s.brow === 'none' ? 'angry' : s.brow; s.mouth = 'frown'; s.look = [1, 0]; },
    cast_spell(c, t) { ACTIONS.idle(c, t); const s = c.st; if (c.kind !== 'bean') return; s.prop = 'wand'; s.armR = [160, -120 + Math.sin(t * 6) * 10]; s.mouth = 'grin'; s.brow = 'angry'; },
    hold_up(c, t) { ACTIONS.idle(c, t); const s = c.st; if (c.kind !== 'bean') return; s.armR = [80, -260]; s.mouth = 'grin'; s.eye = 1.2; s.prop = s.prop || 'letter'; },
    read(c, t) { ACTIONS.idle(c, t); const s = c.st; if (c.kind !== 'bean') return; s.prop = 'book'; s.armR = [60, -40]; s.look = [0.6, 0.8]; s.mouth = 'talk'; },
    fly(c, t, m) { const s = c.st; s.x = m.x0 + Math.sin(t * 1.4) * 260 * m.facing; s.y -= (c.kind === 'owl' ? 220 : 380) + Math.sin(t * 3) * 50; s.rot = Math.cos(t * 1.4) * 10;
      if (c.kind === 'owl') { s.flap = t; return; } if (c.kind !== 'bean') return; s.broom = 1; s.legs = 0; s.mouth = 'grin'; s.eye = 1.2; s.armL = [-60, 60]; s.armR = [60, 60]; },
    sneak(c, t, m) { const s = c.st; s.x = m.x0 + Math.sin(t * 0.9) * 120; if (c.kind !== 'bean') return; s.step = t * 6; s.sy = 0.85; s.sx = 1.08; s.look = [Math.sin(t * 2.2) > 0 ? 1 : -1, 0]; s.mouth = 'flat'; s.brow = 'worried'; s.armL = [-120, -120]; s.armR = [120, -120]; },
    cower(c, t) { const s = c.st; if (c.kind !== 'bean') return; s.sy = 0.78; s.sx = 1.12; s.rot = Math.sin(t * 45) * 2.5; s.eye = 1.5; s.mouth = 'shock'; s.brow = 'worried'; s.armL = [-60, -170]; s.armR = [60, -170]; },
    fall(c, t) { const s = c.st; const p = outCubic(prog(t, 0.2, 0.5)); s.rot = 90 * p * (c.kind === 'bean' ? 1 : 0.5); s.y += p * 60;
      if (c.kind === 'bean') { s.eye = p > 0.5 ? 0.15 : 1.4; s.mouth = p > 0.5 ? 'flat' : 'shock'; s.armL = [-120, -20]; s.armR = [120, -20]; } },
    float(c, t) { const s = c.st; s.y -= 40 + Math.sin(t * 2) * 30; s.rot = Math.sin(t * 1.3) * 4; if (c.kind === 'hood') s.glow = 0.5 + 0.5 * Math.abs(Math.sin(t * 2)); },
    angry(c, t) { const s = c.st; if (c.kind === 'dog3') { s.bark = 1; return; } if (c.kind !== 'bean') return; s.brow = 'angry'; s.mouth = 'frown'; s.rot = Math.sin(t * 30) * 2; s.sx = 1 + Math.sin(t * 8) * 0.03; s.armL = [-110, 0]; s.armR = [110, 0]; },
    crumble(c, t) { const s = c.st; const p = prog(t, 0.3, 1.4); s.sy = 1 - p * 0.9; s.sx = 1 + p * 0.4; s.op = 1 - p; s.rot = Math.sin(t * 40) * 4 * (1 - p); if (c.kind === 'bean') { s.mouth = 'shock'; s.eye = 1.5; } },
  };

  // ---------------------------------------------------------------------- efectos
  function burst(points, r1, r2) {
    return Array.from({ length: points * 2 }, (_, i) => { const a = i / (points * 2) * 6.2832, r = i % 2 ? r1 : r2; return (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(0) + ',' + (Math.sin(a) * r).toFixed(0); }).join(' ') + 'Z';
  }
  function makeFx(f) {
    const at = f.at || 0, x = 90 + (f.x ?? 0.5) * 900, y = f.y != null ? 250 + f.y * 1000 : 640;
    const g = n('g', { opacity: 0 });
    if (f.type === 'pow') {
      g.append(n('path', { d: burst(12, 120, 210), fill: '#ffd60a', stroke: INK, 'stroke-width': 10 }),
        txt(f.text || '¡PUM!', { x: 0, y: 34, 'text-anchor': 'middle', 'font-size': 96, 'font-weight': 900, fill: '#ff2d55', stroke: INK, 'stroke-width': 6, 'paint-order': 'stroke' }));
      return { g, update(t) { const k = t - at, on = k >= 0 && k < 1.1; g.setAttribute('opacity', on ? 1 : 0); if (on) g.setAttribute('transform', `translate(${x} ${y}) scale(${(0.4 + 0.75 * outBack(prog(k, 0, 0.25))).toFixed(3)}) rotate(${(Math.sin(k * 30) * 4).toFixed(1)})`); } };
    }
    if (f.type === 'bubble' || f.type === 'thought') {
      const w = Math.max(260, (f.text || '').length * 46 + 80);
      g.append(n('path', { d: f.type === 'bubble'
        ? `M${-w / 2},-110 L${w / 2},-110 L${w / 2},80 L40,80 L-10,160 L-10,80 L${-w / 2},80 Z`
        : `M${-w / 2},-110 L${w / 2},-110 L${w / 2},80 L${-w / 2},80 Z`, fill: '#fff', stroke: INK, 'stroke-width': 9, 'stroke-linejoin': 'round', rx: 40 }),
        txt(f.text || '', { x: 0, y: 8, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 76, 'font-weight': 900, fill: INK }));
      if (f.type === 'thought') [[-40, 120, 22], [-70, 170, 14]].forEach(([cx, cy, r]) => g.appendChild(n('circle', { cx, cy, r, fill: '#fff', stroke: INK, 'stroke-width': 6 })));
      const dur = f.dur || 2.2;
      return { g, update(t) { const k = t - at, on = k >= 0 && k < dur; g.setAttribute('opacity', on ? 1 : 0); if (on) g.setAttribute('transform', `translate(${x} ${y}) scale(${outBack(prog(k, 0, 0.3)).toFixed(3)})`); } };
    }
    if (f.type === 'confetti' || f.type === 'sparkles' || f.type === 'hearts' || f.type === 'dust') {
      const cols = { confetti: ['#ff2d55', '#ffd60a', '#5ee7ff', '#9cff6a', '#ff9a3c'], sparkles: ['#fff6a0', '#ffffff'], hearts: ['#ff4f7a'], dust: ['#bba', '#998'] }[f.type];
      const parts = Array.from({ length: f.type === 'confetti' ? 70 : 26 }, (_, i) => {
        const shape = f.type === 'hearts' ? n('path', { d: 'M0,10 C-30,-14 -10,-34 0,-18 C10,-34 30,-14 0,10 Z', fill: cols[0] })
          : f.type === 'sparkles' ? n('path', { d: 'M0,-16 L4,-4 L16,0 L4,4 L0,16 L-4,4 L-16,0 L-4,-4 Z', fill: cols[i % 2] })
          : n('rect', { x: -9, y: -5, width: 18, height: 10, fill: cols[i % cols.length] });
        g.appendChild(shape); return shape;
      });
      g.setAttribute('opacity', 1);
      return { g, update(t) {
        parts.forEach((p, i) => {
          const k = prog(t, at + i * 0.006, f.type === 'hearts' ? 2.4 : 1.8);
          if (k <= 0 || k >= 1) { p.setAttribute('opacity', 0); return; }
          const a = hash(i) * 6.283, v = 200 + hash(i + 5) * 380;
          const px = x + Math.cos(a) * v * k, py = f.type === 'hearts' ? y - k * 500 + Math.sin(k * 9 + i) * 20 : y - Math.sin(a) * v * k * 1.2 + (f.type === 'confetti' ? k * k * 900 : 0);
          p.setAttribute('opacity', (1 - k * 0.6).toFixed(2));
          p.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${((i * 40 + t * 400) % 360).toFixed(0)})`);
        });
      } };
    }
    if (f.type === 'zzz') {
      const zs = [0, 1, 2].map((i) => { const z = txt('z', { 'font-size': 60 + i * 18, 'font-weight': 900, fill: '#cfd8ff', stroke: INK, 'stroke-width': 4, 'paint-order': 'stroke' }); g.appendChild(z); return z; });
      return { g, update(t) { g.setAttribute('opacity', t >= at ? 1 : 0); zs.forEach((z, i) => { const k = ((t - at) * 0.6 + i / 3) % 1; z.setAttribute('x', (x + k * 120).toFixed(1)); z.setAttribute('y', (y - k * 220).toFixed(1)); z.setAttribute('opacity', (1 - k).toFixed(2)); }); } };
    }
    if (f.type === 'flash') {
      const r = n('rect', { width: W, height: H, fill: '#fff' }); g.appendChild(r);
      return { g, update(t) { const k = t - at; g.setAttribute('opacity', k >= 0 && k < 0.35 ? (1 - k / 0.35).toFixed(2) : 0); } };
    }
    if (f.type === 'spell') {
      const beam = n('path', { stroke: '#7dffb0', 'stroke-width': 18, 'stroke-linecap': 'round', fill: 'none' });
      const glow = n('path', { stroke: '#ffffff', 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' });
      const x2 = 90 + (f.x2 ?? 0.8) * 900;
      g.append(beam, glow);
      return { g, update(t) { const k = t - at, on = k >= 0 && k < 1.4; g.setAttribute('opacity', on ? 1 : 0); if (!on) return;
        const p = outCubic(prog(k, 0, 0.35)); const ex = lerp(x, x2, p);
        const d = `M${x},${y} Q${(x + ex) / 2},${y - 80 + Math.sin(k * 40) * 20} ${ex},${y}`; beam.setAttribute('d', d); glow.setAttribute('d', d); } };
    }
    return { g, update() {} };
  }

  // ----------------------------------------------------------------------- escena
  const ENTRANCES = new Set(['walk_in', 'run', 'fly']);
  VF.cartoon = {
    build(svg, scene) {
      // Los personajes se dibujan un 20 % más grandes, anclados al suelo.
      const bg = n('g'), actors = n('g', { transform: `translate(540 ${FLOOR}) scale(1.2) translate(-540 -${FLOOR})` }), fxLayer = n('g');
      svg.append(bg, actors, fxLayer);
      const drawSetting = (SETTINGS[scene.setting] || SETTINGS.house)(bg);
      const cast = (scene.cast || []).map((m) => {
        const c = makeCharacter(m.character);
        const facing = m.facing || 1;
        const meta = { x0: 90 + (m.x ?? 0.5) * 900, facing, at: m.at || 0 };
        actors.appendChild(c.g);
        return { c, m, meta };
      });
      const fx = (scene.fx || []).map((f) => { const e = makeFx(f); fxLayer.appendChild(e.g); return e; });
      return (lt) => {
        drawSetting(lt);
        for (const { c, m, meta } of cast) {
          const base = { x: meta.x0, y: FLOOR + (m.character === 'owl' ? -200 : 0), sx: 1, sy: 1, rot: 0, face: meta.facing, op: 1 };
          Object.assign(c.st, base);
          if (c.kind === 'bean') Object.assign(c.st, { look: [meta.facing * 0.3, 0], eye: 1, mouth: 'smile', brow: CHARACTERS[m.character]?.brows || 'none', armL: [-100, -60], armR: [100, -60], step: 0, broom: 0, legs: 1, prop: m.prop || CHARACTERS[m.character]?.prop || null });
          if (c.kind === 'dog3') { c.st.t = lt; c.st.bark = 0; }
          const t = lt - meta.at;
          // Antes de su momento, los que entran a escena no se ven; los demás esperan quietos.
          if (t < 0) { ACTIONS.idle(c, lt); if (ENTRANCES.has(m.action)) c.st.op = 0; }
          else (ACTIONS[m.action] || ACTIONS.idle)(c, t, meta);
          if (c.kind === 'owl' && m.action !== 'fly') c.st.flap = lt * 0.3;
          c.draw();
        }
        fx.forEach((e) => e.update(lt));
      };
    },
    settings: Object.keys(SETTINGS), characters: Object.keys(CHARACTERS), actions: Object.keys(ACTIONS),
  };
})();
