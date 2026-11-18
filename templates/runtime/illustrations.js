// Ilustraciones vectoriales originales del proyecto, con partes animables.
// VF.illustration(nombre) devuelve { svg, animate(t) }; la escena decide el movimiento global.
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  let uid = 0;

  function n(tag, attrs = {}, children = []) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    for (const c of children) e.appendChild(c);
    return e;
  }
  function gradient(id, stops, vertical = true) {
    return n('linearGradient', vertical ? { id, x1: 0, y1: 0, x2: 0, y2: 1 } : { id, x1: 0, y1: 0, x2: 1, y2: 0 },
      stops.map(([o, c]) => n('stop', { offset: o, 'stop-color': c })));
  }
  const rot = (g, deg, cx, cy) => g.setAttribute('transform', `rotate(${deg.toFixed(2)} ${cx} ${cy})`);

  // ---------------------------------------------------------------- tiburones
  function shark(kind) {
    const id = `ill${++uid}`;
    const ancient = kind === 'ancient_shark';
    const pal = ancient
      ? { top: '#4b4d3a', mid: '#7d7a5d', belly: '#d9d2b0', fin: '#3f4131', line: '#2a2b20' }
      : { top: '#34536b', mid: '#5f7f99', belly: '#e9f0f4', fin: '#2e4a60', line: '#1f3344' };
    const svg = n('svg', { viewBox: '0 0 420 200', class: 'illu illu-shark' }, [
      n('defs', {}, [
        gradient(`${id}b`, [[0, pal.top], [0.48, pal.mid], [0.64, pal.belly], [1, pal.belly]]),
        gradient(`${id}f`, [[0, pal.top], [1, pal.fin]]),
      ]),
    ]);
    const body = ancient
      ? 'M60,100 C92,76 150,62 236,62 C300,62 352,72 394,92 C400,100 396,108 386,112 C336,126 280,132 226,132 C156,132 100,122 60,106 Z'
      : 'M58,100 C90,74 150,58 240,58 C300,58 352,72 406,96 C400,102 388,106 372,110 C330,124 280,132 230,132 C160,132 100,122 58,106 Z';
    const tailPath = ancient
      ? 'M66,98 C52,88 38,66 18,32 C34,64 42,86 44,100 C42,114 34,136 18,168 C36,134 52,112 66,106 Z'
      : 'M64,98 C50,90 34,70 12,26 C30,62 38,86 40,100 C36,116 26,138 8,160 C34,140 50,118 64,106 Z';
    const tail = n('g', {}, [n('path', { d: tailPath, fill: `url(#${id}f)` })]);
    const pectoral = n('g', {}, [n('path', {
      d: ancient ? 'M250,120 C236,152 214,176 176,192 C212,160 228,140 234,122 Z'
                 : 'M262,118 C252,146 236,170 208,188 C232,162 240,140 242,122 Z',
      fill: pal.fin,
    })]);
    svg.append(
      tail,
      n('path', { d: 'M140,126 L128,148 L160,128 Z', fill: pal.fin }),
      n('path', { d: 'M100,118 L92,134 L114,120 Z', fill: pal.fin }),
      n('path', { d: body, fill: `url(#${id}b)` }),
      n('path', { d: ancient ? 'M200,64 C210,46 216,30 222,16 C232,36 244,52 260,64 Z'
                             : 'M196,60 C206,44 214,24 222,4 C230,30 244,48 264,60 Z', fill: pal.fin }),
      n('path', { d: ancient ? 'M118,76 C124,62 128,54 132,44 C140,58 148,68 158,76 Z' : 'M110,74 L120,58 L130,72 Z', fill: pal.fin }),
      pectoral,
    );
    if (ancient) {
      // Espinas delante de las aletas dorsales y manchas, rasgos de los primeros tiburones.
      svg.append(n('path', { d: 'M202,64 L226,8 M120,76 L136,38', stroke: '#e6dfc0', 'stroke-width': 4, 'stroke-linecap': 'round' }));
      [[150, 84, 5], [180, 78, 4], [270, 80, 5], [300, 90, 3.5], [120, 92, 4], [220, 86, 3]].forEach(([cx, cy, r]) =>
        svg.append(n('circle', { cx, cy, r, fill: '#3a3b2c', opacity: 0.5 })));
    }
    const gx = ancient ? 296 : 300;
    for (let i = 0; i < 5; i++) {
      const x = gx + i * 6;
      svg.append(n('path', { d: `M${x},${84 + i} C${x - 4},${96 + i} ${x - 4},${106} ${x},${116 - i}`,
        stroke: pal.line, 'stroke-width': 2.4, fill: 'none', opacity: 0.8 }));
    }
    svg.append(
      n('path', { d: ancient ? 'M380,108 C370,112 358,112 346,108' : 'M376,108 C364,113 350,113 336,108',
        stroke: pal.line, 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round' }),
      n('circle', { cx: ancient ? 352 : 356, cy: 86, r: ancient ? 6.5 : 4.6, fill: '#081018' }),
      n('circle', { cx: ancient ? 354 : 357.6, cy: 84, r: 1.6, fill: '#ffffff' }),
      n('path', { d: 'M110,80 C170,62 260,60 340,76', stroke: '#ffffff', 'stroke-width': 3, opacity: 0.16, fill: 'none' }),
    );
    return {
      svg,
      animate(t, speed = 1) {
        rot(tail, Math.sin(t * 7 * speed) * 13, 64, 100);
        rot(pectoral, Math.sin(t * 3.5 * speed + 1) * 6, 250, 120);
      },
    };
  }

  // -------------------------------------------------------------- árbol primitivo
  // Inspirado en los primeros árboles (copa de frondas sobre un tronco alto), dibujado de forma original.
  function tree() {
    const id = `ill${++uid}`;
    const svg = n('svg', { viewBox: '0 0 360 460', class: 'illu illu-tree' }, [
      n('defs', {}, [
        gradient(`${id}t`, [[0, '#5b3a22'], [0.5, '#8a5a34'], [1, '#4a2e1a']], false),
        gradient(`${id}l`, [[0, '#9be07a'], [1, '#2f7a3c']]),
      ]),
    ]);
    const trunk = n('g', {}, [
      n('path', { d: 'M168,460 C170,370 166,280 174,170 L188,170 C194,280 190,370 194,460 Z', fill: `url(#${id}t)` }),
      n('path', { d: 'M176,440 C176,380 174,300 180,190', stroke: '#3a2414', 'stroke-width': 3, fill: 'none', opacity: 0.6 }),
      n('path', { d: 'M150,460 C160,446 168,440 172,430 M212,460 C200,446 192,440 190,430', stroke: '#4a2e1a', 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }),
    ]);
    svg.appendChild(trunk);
    const crown = n('g', {});
    const fronds = [];
    const COUNT = 11;
    for (let i = 0; i < COUNT; i++) {
      const a = (-170 + (160 * i) / (COUNT - 1)) * Math.PI / 180;
      const len = 145 + (i % 3) * 26;
      const ex = 181 + Math.cos(a) * len;
      const ey = 172 + Math.sin(a) * len * 0.7 + 40; // las frondas caen hacia afuera
      const cx = 181 + Math.cos(a) * len * 0.5;
      const cy = 172 + Math.sin(a) * len * 0.75 - 20;
      const g = n('g', {});
      g.appendChild(n('path', { d: `M181,172 Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`,
        stroke: '#2f6a2e', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }));
      for (let k = 1; k <= 12; k++) {
        const p = k / 13;
        const x = (1 - p) * (1 - p) * 181 + 2 * (1 - p) * p * cx + p * p * ex;
        const y = (1 - p) * (1 - p) * 172 + 2 * (1 - p) * p * cy + p * p * ey;
        const dx = 2 * (1 - p) * (cx - 181) + 2 * p * (ex - cx);
        const dy = 2 * (1 - p) * (cy - 172) + 2 * p * (ey - cy);
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        const size = 15 * (1 - p * 0.55);
        for (const side of [-1, 1]) {
          g.appendChild(n('ellipse', { cx: x.toFixed(1), cy: y.toFixed(1), rx: size.toFixed(1), ry: (size * 0.32).toFixed(1),
            fill: `url(#${id}l)`, transform: `rotate(${(ang + side * 55).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}) translate(${(side * size * 0.7).toFixed(1)} 0)` }));
        }
      }
      crown.appendChild(g);
      fronds.push(g);
    }
    svg.appendChild(crown);
    return {
      svg,
      grow: 1,
      animate(t) {
        fronds.forEach((g, i) => rot(g, Math.sin(t * 1.4 + i * 0.7) * 3.5, 181, 172));
      },
      trunk, crown,
    };
  }

  // ----------------------------------------------------------- dinosaurio y humano
  function dinosaur() {
    const id = `ill${++uid}`;
    const neck = n('g', {}, [n('path', {
      d: 'M262,142 C282,110 298,72 318,42 C326,30 342,24 354,32 C360,38 356,46 346,48 C336,50 330,58 324,72 C312,102 302,128 296,150 Z',
      fill: `url(#${id})` })]);
    const svg = n('svg', { viewBox: '0 0 400 260', class: 'illu illu-dino' }, [
      n('defs', {}, [gradient(id, [[0, '#7e8f5a'], [1, '#4c5a33']])]),
      n('path', { d: 'M40,172 C80,150 124,120 182,118 C224,116 256,126 276,146 C298,170 298,200 292,232 L276,232 L272,204 C256,208 240,210 226,208 L224,232 L208,232 L204,206 C182,202 162,198 148,192 L146,232 L130,232 L126,188 C110,182 96,174 84,172 C66,170 52,176 40,172 Z', fill: `url(#${id})` }),
      neck,
      n('circle', { cx: 344, cy: 36, r: 2.4, fill: '#111' }),
    ]);
    return { svg, animate(t) { rot(neck, Math.sin(t * 1.5) * 3, 280, 146); } };
  }

  function human() {
    const svg = n('svg', { viewBox: '0 0 120 300', class: 'illu illu-human' }, [
      n('circle', { cx: 60, cy: 30, r: 22, fill: '#f0c9a4' }),
      n('path', { d: 'M30,64 C40,56 80,56 90,64 L98,150 L84,152 L78,96 L76,170 L80,290 L64,290 L60,184 L56,290 L40,290 L44,170 L42,96 L36,152 L22,150 Z', fill: '#e9a96b' }),
    ]);
    return { svg, animate() {} };
  }

  // ------------------------------------------------------- magia: siluetas y símbolos
  // Figuras genéricas y objetos de fantasía dibujados por el proyecto; no reproducen personajes ni
  // diseños de ninguna película o libro.
  function glow(id, color) {
    return n('filter', { id, x: '-60%', y: '-60%', width: '220%', height: '220%' }, [
      n('feGaussianBlur', { stdDeviation: 8, result: 'b' }),
      n('feFlood', { 'flood-color': color }),
      n('feComposite', { in2: 'b', operator: 'in', result: 'c' }),
      n('feMerge', {}, [n('feMergeNode', { in: 'c' }), n('feMergeNode', { in: 'SourceGraphic' })]),
    ]);
  }

  function sparkle(x, y, s, fill = '#fff6c8') {
    return n('path', { d: `M${x},${y - s} L${x + s * 0.22},${y - s * 0.22} L${x + s},${y} L${x + s * 0.22},${y + s * 0.22} L${x},${y + s} L${x - s * 0.22},${y + s * 0.22} L${x - s},${y} L${x - s * 0.22},${y - s * 0.22} Z`, fill });
  }

  function figure(x, h, robe, hat = true) {
    // Silueta de mago o maga joven: túnica, bufanda y, opcionalmente, sombrero puntiagudo.
    const s = h / 300, g = n('g', { transform: `translate(${x} ${300 - h}) scale(${s.toFixed(3)})` });
    g.append(
      n('path', { d: 'M60,90 C30,96 18,150 14,300 L106,300 C102,150 90,96 60,90 Z', fill: robe }),
      n('path', { d: 'M40,98 C52,108 68,108 80,98 L84,112 C68,124 52,124 36,112 Z', fill: '#b9343a' }),
      n('path', { d: 'M76,110 L84,170 L72,172 L68,116 Z', fill: '#d9a43a' }),
      n('circle', { cx: 60, cy: 62, r: 30, fill: '#1a1424' }),
    );
    if (hat) g.append(n('path', { d: 'M24,52 C40,44 80,44 96,52 L64,-34 C62,-38 58,-38 56,-34 Z', fill: '#1a1424' }));
    return g;
  }

  function wizard() {
    const id = `ill${++uid}`;
    const arm = n('g', {}, [
      n('path', { d: 'M150,190 C178,176 206,158 232,138', stroke: '#2a2140', 'stroke-width': 22, 'stroke-linecap': 'round', fill: 'none' }),
      n('path', { d: 'M228,142 L300,70', stroke: '#7a5232', 'stroke-width': 7, 'stroke-linecap': 'round' }),
    ]);
    const tip = n('g', { filter: `url(#${id}g)` }, [n('circle', { cx: 302, cy: 68, r: 9, fill: '#fff4b0' }), sparkle(302, 68, 26)]);
    const svg = n('svg', { viewBox: '0 0 360 420', class: 'illu illu-magic' }, [
      n('defs', {}, [gradient(`${id}r`, [[0, '#3b2f5c'], [1, '#17112a']]), glow(`${id}g`, '#ffd65a')]),
      n('path', { d: 'M130,130 C80,140 60,260 50,420 L240,420 C228,260 206,140 160,130 Z', fill: `url(#${id}r)` }),
      n('path', { d: 'M108,126 C128,140 162,140 182,126 L186,146 C160,160 128,160 104,146 Z', fill: '#b9343a' }),
      n('circle', { cx: 145, cy: 92, r: 40, fill: '#1a1424' }),
      n('path', { d: 'M90,80 C114,66 176,66 200,80 L150,-40 C148,-46 142,-46 140,-40 Z', fill: '#2a2140' }),
      arm, tip,
    ]);
    return { svg, animate(t) {
      rot(arm, Math.sin(t * 2.2) * 6, 150, 190);
      tip.setAttribute('opacity', (0.65 + 0.35 * Math.abs(Math.sin(t * 5))).toFixed(3));
    } };
  }

  function trio() {
    const id = `ill${++uid}`;
    const svg = n('svg', { viewBox: '0 0 420 320', class: 'illu illu-magic' }, [
      n('defs', {}, [gradient(`${id}r`, [[0, '#3b2f5c'], [1, '#17112a']])]),
    ]);
    const people = [figure(40, 250, `url(#${id}r)`, false), figure(150, 290, `url(#${id}r)`, false), figure(270, 262, `url(#${id}r)`, false)];
    people.forEach((p) => svg.appendChild(p));
    const base = people.map((p) => p.getAttribute('transform'));
    return { svg, animate(t) {
      people.forEach((p, i) => p.setAttribute('transform', `translate(0 ${(Math.sin(t * 2 + i * 1.3) * 4).toFixed(1)}) ${base[i]}`));
    } };
  }

  function hooded() {
    const id = `ill${++uid}`;
    const eyes = n('g', { filter: `url(#${id}g)` }, [
      n('ellipse', { cx: 158, cy: 118, rx: 9, ry: 4, fill: '#ff3b3b' }), n('ellipse', { cx: 202, cy: 118, rx: 9, ry: 4, fill: '#ff3b3b' })]);
    const svg = n('svg', { viewBox: '0 0 360 420', class: 'illu illu-magic' }, [
      n('defs', {}, [gradient(`${id}r`, [[0, '#2a2236'], [1, '#07050c']]), glow(`${id}g`, '#ff2020')]),
      n('path', { d: 'M180,20 C110,20 90,90 96,150 C70,220 40,330 30,420 L330,420 C320,330 290,220 264,150 C270,90 250,20 180,20 Z', fill: `url(#${id}r)` }),
      n('path', { d: 'M180,60 C140,60 128,100 132,140 C150,160 210,160 228,140 C232,100 220,60 180,60 Z', fill: '#000' }),
      eyes,
    ]);
    return { svg, animate(t) { eyes.setAttribute('opacity', (0.4 + 0.6 * Math.abs(Math.sin(t * 1.7))).toFixed(3)); } };
  }

  function castle() {
    const id = `ill${++uid}`;
    const windows = [];
    const svg = n('svg', { viewBox: '0 0 440 360', class: 'illu illu-magic' }, [
      n('defs', {}, [gradient(`${id}s`, [[0, '#2c2a46'], [1, '#14121f']]), glow(`${id}g`, '#ffcf6a')]),
      n('circle', { cx: 360, cy: 60, r: 34, fill: '#f6f0d2', opacity: 0.9 }),
      n('path', { d: 'M0,360 L0,300 C60,280 90,250 130,250 L330,250 C370,250 400,280 440,300 L440,360 Z', fill: '#0d0b16' }),
    ]);
    const towers = [[70, 150, 46, 110], [140, 110, 40, 150], [205, 60, 50, 200], [285, 120, 40, 140], [345, 160, 44, 100]];
    const body = n('g', { fill: `url(#${id}s)` });
    body.appendChild(n('rect', { x: 90, y: 190, width: 280, height: 70 }));
    for (const [x, y, w, h] of towers) {
      body.append(n('rect', { x, y, width: w, height: h + 10 }), n('path', { d: `M${x - 8},${y} L${x + w / 2},${y - w * 1.3} L${x + w + 8},${y} Z` }));
    }
    svg.appendChild(body);
    const lights = n('g', { filter: `url(#${id}g)` });
    towers.forEach(([x, y, w], i) => [0, 1].forEach((k) => {
      const win = n('rect', { x: x + w / 2 - 6, y: y + 24 + k * 44, width: 12, height: 20, rx: 6, fill: '#ffd36a' });
      windows.push([win, i * 2 + k]);
      lights.appendChild(win);
    }));
    svg.appendChild(lights);
    return { svg, animate(t) {
      windows.forEach(([w, k]) => w.setAttribute('opacity', (0.55 + 0.45 * Math.abs(Math.sin(t * 1.3 + k * 1.7))).toFixed(3)));
    } };
  }

  function owl() {
    const wingL = n('g', {}, [n('path', { d: 'M150,150 C100,120 40,130 10,170 C60,170 100,190 140,200 Z', fill: '#e9e4d6' })]);
    const wingR = n('g', {}, [n('path', { d: 'M250,150 C300,120 360,130 390,170 C340,170 300,190 260,200 Z', fill: '#e9e4d6' })]);
    const svg = n('svg', { viewBox: '0 0 400 330', class: 'illu illu-magic' }, [
      wingL, wingR,
      n('ellipse', { cx: 200, cy: 190, rx: 72, ry: 92, fill: '#f6f2e6' }),
      n('path', { d: 'M160,200 C175,215 225,215 240,200 M165,230 C180,244 220,244 235,230', stroke: '#c9c1ad', 'stroke-width': 4, fill: 'none' }),
      n('circle', { cx: 172, cy: 150, r: 22, fill: '#fff' }), n('circle', { cx: 228, cy: 150, r: 22, fill: '#fff' }),
      n('circle', { cx: 172, cy: 150, r: 13, fill: '#e3a512' }), n('circle', { cx: 228, cy: 150, r: 13, fill: '#e3a512' }),
      n('circle', { cx: 172, cy: 150, r: 7, fill: '#111' }), n('circle', { cx: 228, cy: 150, r: 7, fill: '#111' }),
      n('path', { d: 'M192,166 L200,184 L208,166 Z', fill: '#3a3a3a' }),
      n('rect', { x: 170, y: 272, width: 60, height: 40, fill: '#efe2c0', transform: 'rotate(-8 200 292)' }),
      n('circle', { cx: 200, cy: 292, r: 8, fill: '#b02a2a' }),
    ]);
    return { svg, animate(t) {
      const a = Math.sin(t * 9) * 22;
      rot(wingL, a, 150, 170); rot(wingR, -a, 250, 170);
    } };
  }

  function letter() {
    const svg = n('svg', { viewBox: '0 0 360 260', class: 'illu illu-magic' }, [
      n('rect', { x: 20, y: 30, width: 320, height: 200, rx: 8, fill: '#efe2c0' }),
      n('path', { d: 'M20,38 L180,150 L340,38', stroke: '#c9b48a', 'stroke-width': 5, fill: 'none' }),
      n('path', { d: 'M40,90 L130,90 M40,110 L110,110', stroke: '#6a5a40', 'stroke-width': 4, opacity: 0.6 }),
      n('circle', { cx: 180, cy: 150, r: 30, fill: '#a3242a' }),
      n('path', { d: 'M168,150 L180,136 L192,150 L180,164 Z', fill: '#d4555a' }),
    ]);
    return { svg, animate() {} };
  }

  function wand() {
    const id = `ill${++uid}`;
    const sparks = n('g', { filter: `url(#${id}g)` });
    const dots = Array.from({ length: 9 }, (_, i) => { const s = sparkle(0, 0, 10 + (i % 3) * 6); sparks.appendChild(s); return s; });
    const svg = n('svg', { viewBox: '0 0 400 400', class: 'illu illu-magic' }, [
      n('defs', {}, [gradient(`${id}w`, [[0, '#9a6a3e'], [1, '#4a2e1a']], false), glow(`${id}g`, '#ffd65a')]),
      n('path', { d: 'M60,350 L300,110 L310,120 L72,360 Z', fill: `url(#${id}w)` }),
      n('path', { d: 'M60,350 L100,310 L112,322 L72,360 Z', fill: '#3a2414' }),
      sparks,
    ]);
    return { svg, animate(t) {
      dots.forEach((d, i) => {
        const a = t * 2.4 + i * 0.7, r = 20 + ((t * 40 + i * 23) % 90);
        d.setAttribute('transform', `translate(${(305 + Math.cos(a) * r).toFixed(1)} ${(115 + Math.sin(a) * r).toFixed(1)})`);
        d.setAttribute('opacity', (1 - r / 110).toFixed(3));
      });
    } };
  }

  function lightning() {
    const id = `ill${++uid}`;
    const bolt = n('path', { d: 'M230,10 L110,200 L190,200 L140,390 L300,160 L215,160 L270,10 Z', fill: '#ffe066', filter: `url(#${id}g)` });
    const svg = n('svg', { viewBox: '0 0 400 400', class: 'illu illu-magic' }, [n('defs', {}, [glow(`${id}g`, '#fff3a0')]), bolt]);
    return { svg, animate(t) { bolt.setAttribute('opacity', (Math.sin(t * 23) > 0.85 ? 0.55 : 1).toFixed(2)); } };
  }

  function wizardHat() {
    const brim = n('g', {}, [
      n('path', { d: 'M40,300 C90,270 310,270 360,300 C320,330 80,330 40,300 Z', fill: '#4a3a2a' }),
      n('path', { d: 'M110,290 C120,200 150,120 210,40 C222,30 236,40 230,56 C220,90 214,110 236,150 C262,196 276,250 290,290 Z', fill: '#5c4630' }),
      n('path', { d: 'M150,250 C175,240 225,240 250,250', stroke: '#2e2418', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }),
      n('path', { d: 'M165,200 C180,210 200,210 215,200', stroke: '#2e2418', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }),
      n('path', { d: 'M180,140 L198,150 L210,132', stroke: '#3a2c1e', 'stroke-width': 4, fill: 'none' }),
    ]);
    const svg = n('svg', { viewBox: '0 0 400 340', class: 'illu illu-magic' }, [brim]);
    return { svg, animate(t) { rot(brim, Math.sin(t * 3) * 4, 200, 300); } };
  }

  function magicStone() {
    const id = `ill${++uid}`;
    const halo = n('circle', { cx: 200, cy: 200, r: 150, fill: `url(#${id}h)` });
    const svg = n('svg', { viewBox: '0 0 400 400', class: 'illu illu-magic' }, [
      n('defs', {}, [
        n('radialGradient', { id: `${id}h` }, [n('stop', { offset: 0, 'stop-color': '#ff3b4a', 'stop-opacity': 0.55 }), n('stop', { offset: 1, 'stop-color': '#ff3b4a', 'stop-opacity': 0 })]),
        gradient(`${id}s`, [[0, '#ff7a85'], [0.5, '#d4142a'], [1, '#6a0612']]),
      ]),
      halo,
      n('path', { d: 'M200,90 L280,150 L262,270 L200,310 L138,270 L120,150 Z', fill: `url(#${id}s)` }),
      n('path', { d: 'M200,90 L230,180 L200,310 M120,150 L230,180 L280,150 M138,270 L230,180 L262,270', stroke: '#ff9aa3', 'stroke-width': 3, fill: 'none', opacity: 0.6 }),
      n('path', { d: 'M168,120 L200,100 L210,140 Z', fill: '#fff', opacity: 0.55 }),
    ]);
    return { svg, animate(t) { halo.setAttribute('r', (140 + Math.sin(t * 2.5) * 22).toFixed(1)); } };
  }

  function broom() {
    const bristles = n('g', {}, [n('path', { d: 'M60,230 C20,250 0,290 10,320 C50,300 90,290 120,262 Z', fill: '#c99a4a' }),
      n('path', { d: 'M40,262 L18,300 M60,262 L40,306 M80,256 L66,300', stroke: '#8a6428', 'stroke-width': 4 })]);
    const svg = n('svg', { viewBox: '0 0 420 340', class: 'illu illu-magic' }, [
      n('path', { d: 'M20,300 C10,300 0,310 30,312 M0,280 C-20,290 -10,300 20,296', stroke: '#ffffff', 'stroke-width': 5, opacity: 0.35, fill: 'none' }),
      bristles,
      n('path', { d: 'M100,252 L400,60 L408,72 L110,264 Z', fill: '#7a5232' }),
      n('path', { d: 'M100,240 L124,262', stroke: '#5a3a1a', 'stroke-width': 10 }),
    ]);
    return { svg, animate(t) { rot(bristles, Math.sin(t * 8) * 4, 110, 258); } };
  }

  function threeHeadedDog() {
    const heads = [];
    const svg = n('svg', { viewBox: '0 0 440 340', class: 'illu illu-magic' }, [
      n('path', { d: 'M350,230 C390,220 410,190 420,160', stroke: '#2a2026', 'stroke-width': 14, 'stroke-linecap': 'round', fill: 'none' }),
      n('ellipse', { cx: 220, cy: 228, rx: 150, ry: 62, fill: '#2a2026' }),
      ...[[96, 0], [150, 6], [282, 6], [336, 0]].map(([x, d]) => n('path', {
        d: `M${x - 16},${250 + d} L${x - 20},318 L${x + 12},318 L${x + 16},${250 + d} Z`, fill: '#231a20' })),
    ]);
    [[110, 120, -14], [220, 90, 0], [330, 120, 14]].forEach(([x, y, a]) => {
      const h = n('g', { transform: `rotate(${a} ${x} ${y + 60})` }, [
        n('path', { d: `M${x - 40},${y + 60} C${x - 46},${y + 10} ${x - 20},${y - 20} ${x},${y - 20} C${x + 20},${y - 20} ${x + 46},${y + 10} ${x + 40},${y + 60} Z`, fill: '#3a2c34' }),
        n('path', { d: `M${x - 40},${y - 4} L${x - 30},${y - 44} L${x - 14},${y - 14} Z M${x + 40},${y - 4} L${x + 30},${y - 44} L${x + 14},${y - 14} Z`, fill: '#2a2026' }),
        n('path', { d: `M${x - 22},${y + 40} L${x},${y + 66} L${x + 22},${y + 40} Z`, fill: '#140c10' }),
        n('path', { d: `M${x - 14},${y + 42} L${x - 10},${y + 52} L${x - 6},${y + 42} M${x + 6},${y + 42} L${x + 10},${y + 52} L${x + 14},${y + 42}`, fill: '#f2efe6' }),
        n('circle', { cx: x - 14, cy: y + 10, r: 5, fill: '#ffcc33' }), n('circle', { cx: x + 14, cy: y + 10, r: 5, fill: '#ffcc33' }),
      ]);
      const wrap = n('g', {}, [h]);
      heads.push(wrap);
      svg.appendChild(wrap);
    });
    return { svg, animate(t) { heads.forEach((h, i) => h.setAttribute('transform', `translate(0 ${(Math.sin(t * 3 + i * 2) * 8).toFixed(1)})`)); } };
  }

  function train() {
    const puffs = Array.from({ length: 5 }, () => n('circle', { r: 20, fill: '#e8e8ee' }));
    const svg = n('svg', { viewBox: '0 0 460 300', class: 'illu illu-magic' }, [
      ...puffs,
      n('rect', { x: 60, y: 130, width: 260, height: 100, rx: 10, fill: '#b3202a' }),
      n('rect', { x: 250, y: 80, width: 110, height: 150, rx: 8, fill: '#8f1820' }),
      n('rect', { x: 268, y: 100, width: 74, height: 50, rx: 6, fill: '#ffd36a' }),
      n('rect', { x: 100, y: 96, width: 34, height: 44, fill: '#222' }),
      n('path', { d: 'M40,230 L60,170 L60,230 Z', fill: '#444' }),
      n('rect', { x: 60, y: 186, width: 300, height: 10, fill: '#d9b24a' }),
      ...[110, 190, 300].map((cx) => n('circle', { cx, cy: 238, r: 34, fill: '#1c1c22', stroke: '#d9b24a', 'stroke-width': 6 })),
      n('rect', { x: 0, y: 270, width: 460, height: 8, fill: '#555' }),
    ]);
    return { svg, animate(t) {
      puffs.forEach((p, i) => {
        const k = ((t * 0.8 + i / puffs.length) % 1);
        p.setAttribute('cx', (117 - k * 120).toFixed(1));
        p.setAttribute('cy', (90 - k * 90).toFixed(1));
        p.setAttribute('r', (14 + k * 30).toFixed(1));
        p.setAttribute('opacity', (0.8 * (1 - k)).toFixed(3));
      });
    } };
  }

  function chessKnight() {
    const id = `ill${++uid}`;
    const svg = n('svg', { viewBox: '0 0 300 400', class: 'illu illu-magic' }, [
      n('defs', {}, [gradient(`${id}k`, [[0, '#d9d4c8'], [1, '#8d877a']], false)]),
      n('path', { d: 'M70,380 L230,380 L222,344 L78,344 Z M90,344 L210,344 C206,300 196,270 190,240 C230,220 244,170 220,120 C200,80 160,50 120,46 L112,26 L98,52 C70,70 62,110 70,150 L54,190 C50,210 70,220 84,206 L112,184 C120,200 110,240 90,344 Z', fill: `url(#${id}k)` }),
      n('circle', { cx: 132, cy: 104, r: 7, fill: '#2a2620' }),
    ]);
    return { svg, animate() {} };
  }

  function mirror() {
    const id = `ill${++uid}`;
    const shine = n('rect', { x: -60, y: 60, width: 40, height: 380, fill: '#ffffff', opacity: 0.25, transform: 'rotate(18 150 250)' });
    const svg = n('svg', { viewBox: '0 0 300 480', class: 'illu illu-magic' }, [
      n('defs', {}, [gradient(`${id}m`, [[0, '#6d7fa6'], [1, '#2a3354']]),
        n('clipPath', { id: `${id}c` }, [n('path', { d: 'M150,40 C230,40 250,120 250,180 L250,400 L50,400 L50,180 C50,120 70,40 150,40 Z' })])]),
      n('path', { d: 'M150,10 C260,10 280,110 280,180 L280,430 L20,430 L20,180 C20,110 40,10 150,10 Z', fill: '#c79a3a' }),
      n('path', { d: 'M150,40 C230,40 250,120 250,180 L250,400 L50,400 L50,180 C50,120 70,40 150,40 Z', fill: `url(#${id}m)` }),
      n('g', { 'clip-path': `url(#${id}c)` }, [shine]),
      n('rect', { x: 0, y: 430, width: 300, height: 20, rx: 6, fill: '#a77d2a' }),
      n('path', { d: 'M40,450 L20,480 M260,450 L280,480', stroke: '#a77d2a', 'stroke-width': 12, 'stroke-linecap': 'round' }),
    ]);
    return { svg, animate(t) { shine.setAttribute('x', (-80 + ((t * 120) % 460)).toFixed(1)); } };
  }

  // ------------------------------------------------------ globos: «¿cuántos harían falta?»
  // Racimos de globos de helio levantando cosas cotidianas. Todo dibujado por el proyecto.
  const BALLOON_COLORS = ['#ff4d6d', '#ffbe0b', '#3a86ff', '#8338ec', '#06d6a0', '#fb5607', '#ff70a6', '#4cc9f0'];

  function balloonShape(x, y, r, color) {
    const g = n('g', {});
    g.append(
      n('path', { d: `M${x - 6},${y + r * 1.18 + 9} L${x},${y + r * 1.18 - 2} L${x + 6},${y + r * 1.18 + 9} Z`, fill: color }),
      n('ellipse', { cx: x, cy: y, rx: r, ry: r * 1.2, fill: color }),
      n('ellipse', { cx: x - r * 0.35, cy: y - r * 0.45, rx: r * 0.22, ry: r * 0.36, fill: '#ffffff', opacity: 0.45,
        transform: `rotate(-25 ${x - r * 0.35} ${y - r * 0.45})` }),
    );
    return g;
  }

  function balloon() {
    const string = n('path', { stroke: '#f4f4f4', 'stroke-width': 3, fill: 'none', opacity: 0.85 });
    const b = balloonShape(200, 170, 110, '#ff4d6d');
    const svg = n('svg', { viewBox: '0 0 400 600', class: 'illu illu-balloon' }, [string, b]);
    return { svg, animate(t) {
      const dx = Math.sin(t * 1.6) * 10, dy = Math.sin(t * 2.1) * 8;
      b.setAttribute('transform', `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) rotate(${(Math.sin(t * 1.6) * 3).toFixed(2)} 200 300)`);
      string.setAttribute('d', `M${200 + dx},${312 + dy} C${190 + Math.sin(t * 3) * 20},400 ${215 - Math.sin(t * 3) * 20},480 200,590`);
    } };
  }

  // Cosas que cuelgan del racimo. ax/ay: punto donde se juntan los hilos.
  const SUBJECTS = {
    person: () => ({ count: 9, spread: 1, g: n('g', {}, [
      n('path', { d: 'M236,452 L244,366 M264,452 L256,366', stroke: '#f0c9a4', 'stroke-width': 11, 'stroke-linecap': 'round' }),
      n('circle', { cx: 250, cy: 420, r: 28, fill: '#f0c9a4' }),
      n('path', { d: 'M226,452 C236,444 264,444 274,452 L280,560 L220,560 Z', fill: '#3a86ff' }),
      n('path', { d: 'M232,556 L226,640 M268,556 L276,640', stroke: '#33415c', 'stroke-width': 16, 'stroke-linecap': 'round' }),
      n('path', { d: 'M238,428 Q250,438 262,428', stroke: '#6b3d2a', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }),
      n('circle', { cx: 240, cy: 414, r: 3.5, fill: '#222' }), n('circle', { cx: 260, cy: 414, r: 3.5, fill: '#222' }),
    ]) }),
    car: () => ({ count: 15, spread: 1.15, g: n('g', {}, [
      n('path', { d: 'M250,366 L160,452 M250,366 L340,452', stroke: '#f4f4f4', 'stroke-width': 3 }),
      n('path', { d: 'M100,520 L104,486 C110,472 130,466 150,464 L180,436 C190,428 204,424 220,424 L300,424 C318,424 330,430 340,440 L366,466 C388,468 404,476 406,494 L408,520 Z', fill: '#e63946' }),
      n('path', { d: 'M190,462 L214,438 L250,438 L250,462 Z M262,438 L304,438 C314,438 322,444 330,452 L338,462 L262,462 Z', fill: '#bde0fe' }),
      n('rect', { x: 100, y: 512, width: 308, height: 14, rx: 6, fill: '#a4161a' }),
      ...[160, 350].map((cx) => n('circle', { cx, cy: 526, r: 30, fill: '#1d1d24', stroke: '#c9c9d1', 'stroke-width': 8 })),
      n('circle', { cx: 398, cy: 492, r: 7, fill: '#ffe066' }),
    ]) }),
    elephant: () => ({ count: 20, spread: 1.3, g: n('g', {}, [
      n('path', { d: 'M250,366 L190,428 M250,366 L320,432', stroke: '#f4f4f4', 'stroke-width': 3 }),
      ...[[160, 540], [205, 545], [285, 545], [330, 540]].map(([x, y]) => n('rect', { x: x - 18, y: y - 50, width: 36, height: 110, rx: 14, fill: '#8d99ae' })),
      n('ellipse', { cx: 245, cy: 490, rx: 125, ry: 80, fill: '#9aa5b8' }),
      n('path', { d: 'M122,470 C104,486 100,510 108,530', stroke: '#8d99ae', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }),
      n('circle', { cx: 362, cy: 456, r: 58, fill: '#9aa5b8' }),
      n('path', { d: 'M332,420 C296,412 284,470 312,500 C330,498 342,470 340,440 Z', fill: '#b8c0cf' }),
      n('path', { d: 'M404,474 C424,510 420,560 396,590 C390,598 400,606 408,598 C438,566 444,508 418,466 Z', fill: '#9aa5b8' }),
      n('path', { d: 'M396,494 C404,504 414,506 420,502', stroke: '#f8f5ec', 'stroke-width': 8, 'stroke-linecap': 'round', fill: 'none' }),
      n('circle', { cx: 378, cy: 444, r: 6, fill: '#222' }),
    ]) }),
    whale: () => ({ count: 28, spread: 1.55, g: n('g', {}, [
      n('defs', {}, [gradient('whaleBody', [[0, '#4a6fa5'], [0.6, '#355c8c'], [1, '#9cb8d6']])]),
      n('path', { d: 'M250,366 L130,448 M250,366 L380,444', stroke: '#f4f4f4', 'stroke-width': 3 }),
      n('path', { d: 'M60,470 C40,446 20,440 4,444 C22,462 30,480 30,494 C30,508 22,526 4,544 C20,548 40,542 60,518 Z', fill: '#355c8c' }),
      n('path', { d: 'M56,494 C100,452 200,436 300,438 C380,440 448,460 482,492 C470,516 420,538 330,546 C230,552 130,540 56,500 Z', fill: 'url(#whaleBody)' }),
      ...[0, 1, 2, 3, 4].map((i) => n('path', { d: `M${300 + i * 26},${528 - i * 2} C${330 + i * 26},${532 - i * 2} ${400 + i * 10},${524} 470,${504 + i}`,
        stroke: '#c9d8ea', 'stroke-width': 2, fill: 'none', opacity: 0.6 })),
      n('path', { d: 'M180,444 L196,424 L208,446 Z', fill: '#2f507a' }),
      n('path', { d: 'M300,520 C286,548 266,566 240,574 C262,552 272,536 278,520 Z', fill: '#2f507a' }),
      n('circle', { cx: 430, cy: 486, r: 5, fill: '#0b1a2a' }),
    ]) }),
  };

  function lifted(kind) {
    const subj = SUBJECTS[kind]();
    const AX = 250, AY = 366;
    const strings = n('g', {});
    const cluster = n('g', {});
    const balloons = [];
    for (let i = 0; i < subj.count; i++) {
      // Espiral de girasol: un racimo compacto y deterministico.
      const a = i * 2.39996, rr = Math.sqrt(i + 0.5) * 30 * subj.spread;
      const x = 250 + Math.cos(a) * rr * 1.25, y = 200 + Math.sin(a) * rr * 0.75 - i * 1.5;
      const r = 30 + ((i * 7) % 11);
      const b = balloonShape(x, y, r, BALLOON_COLORS[i % BALLOON_COLORS.length]);
      const s = n('path', { stroke: '#f4f4f4', 'stroke-width': 1.6, fill: 'none', opacity: 0.75 });
      strings.appendChild(s); cluster.appendChild(b);
      balloons.push({ b, s, x, y: y + r * 1.18 + 8, ph: i * 1.7 });
    }
    // Detrás los del fondo: orden por altura para dar profundidad.
    balloons.slice().sort((p, q) => p.y - q.y).forEach(({ b }) => cluster.appendChild(b));
    const svg = n('svg', { viewBox: '0 0 500 700', class: 'illu illu-lifted' }, [strings, cluster, subj.g]);
    return { svg, animate(t) {
      for (const p of balloons) {
        const dx = Math.sin(t * 1.5 + p.ph) * 6, dy = Math.sin(t * 2 + p.ph) * 5;
        p.b.setAttribute('transform', `translate(${dx.toFixed(1)} ${dy.toFixed(1)})`);
        p.s.setAttribute('d', `M${(p.x + dx).toFixed(1)},${(p.y + dy).toFixed(1)} Q${((p.x + AX) / 2).toFixed(1)},${((p.y + AY) / 2 + 10).toFixed(1)} ${AX},${AY}`);
      }
      subj.g.setAttribute('transform', `rotate(${(Math.sin(t * 1.3) * 2.5).toFixed(2)} ${AX} ${AY})`);
    } };
  }

  // ------------------------------------------------- agua: cosas que se llenan («¿cuántos vasos?»)
  // Cada forma se llena con agua que sube con oleaje. Formas dibujadas por el proyecto.
  const CONTAINERS = {
    glass: { vb: '0 0 400 520', top: 120, bottom: 470, fill: 0.78,
      shape: 'M80,60 L320,60 L292,470 C290,486 280,494 264,494 L136,494 C120,494 110,486 108,470 Z',
      extra: () => [] },
    person: { vb: '0 0 300 600', top: 20, bottom: 590, fill: 0.62,
      shape: 'M150,20 A52,52 0 1 1 149.9,20 Z M96,140 C120,128 180,128 204,140 L232,330 L206,334 L196,226 L194,590 L160,590 L152,380 L148,380 L140,590 L106,590 L104,226 L94,334 L68,330 Z',
      extra: () => [] },
    bathtub: { vb: '0 0 560 420', top: 150, bottom: 330, fill: 0.85,
      shape: 'M40,150 L520,150 L520,190 C520,290 460,340 380,340 L180,340 C100,340 40,290 40,190 Z',
      extra: () => [
        n('path', { d: 'M120,340 L104,400 M440,340 L456,400', stroke: '#c9c9d1', 'stroke-width': 16, 'stroke-linecap': 'round' }),
        n('path', { d: 'M470,150 L470,70 C470,50 450,40 430,48 L410,58', stroke: '#c9c9d1', 'stroke-width': 14, fill: 'none', 'stroke-linecap': 'round' }),
        n('rect', { x: 26, y: 136, width: 508, height: 20, rx: 10, fill: '#f3f4f7' }),
      ] },
    pool: { vb: '0 0 600 380', top: 70, bottom: 330, fill: 0.88,
      shape: 'M130,70 L470,70 L580,330 L20,330 Z',
      extra: () => [
        ...[1, 2, 3, 4, 5].map((i) => n('path', { d: `M${130 + i * 340 / 6},74 L${20 + i * 560 / 6},326`, stroke: '#ffffff', 'stroke-width': 3, opacity: 0.55, 'stroke-dasharray': '10 14' })),
        n('path', { d: 'M470,30 L470,110 M496,30 L496,110 M470,52 L496,52 M470,80 L496,80', stroke: '#d9d9e0', 'stroke-width': 6, 'stroke-linecap': 'round' }),
        n('path', { d: 'M130,70 L470,70 L580,330 L20,330 Z', stroke: '#f3f4f7', 'stroke-width': 12, fill: 'none', 'stroke-linejoin': 'round' }),
      ] },
    earth: { vb: '0 0 500 500', top: 30, bottom: 470, fill: 1.0,
      shape: 'M250,30 A220,220 0 1 1 249.9,30 Z',
      extra: () => [
        n('path', { d: 'M150,120 C190,100 230,120 220,160 C212,190 240,210 226,250 C210,290 170,280 160,240 C150,200 110,190 120,150 Z', fill: '#57b65f' }),
        n('path', { d: 'M300,230 C340,210 390,230 384,280 C378,330 340,380 310,360 C290,340 300,300 286,270 Z', fill: '#57b65f' }),
        n('path', { d: 'M330,90 C360,80 400,110 390,140 C370,150 340,130 330,110 Z', fill: '#57b65f' }),
        n('path', { d: 'M250,30 A220,220 0 1 1 249.9,30 Z', stroke: '#bfe6ff', 'stroke-width': 6, fill: 'none', opacity: 0.6 }),
      ] },
  };

  function filled(kind) {
    const c = CONTAINERS[kind];
    const id = `ill${++uid}`;
    const [, , W, H] = c.vb.split(' ').map(Number);
    const water = n('path', { fill: `url(#${id}w)` });
    const shine = n('path', { stroke: '#ffffff', 'stroke-width': 4, fill: 'none', opacity: 0.5 });
    const bubbles = Array.from({ length: 8 }, () => n('circle', { r: 5, fill: '#ffffff', opacity: 0.5 }));
    const svg = n('svg', { viewBox: c.vb, class: `illu illu-water illu-water-${kind}` }, [
      n('defs', {}, [gradient(`${id}w`, [[0, '#4cc9f0'], [1, '#1d4ed8']]), n('clipPath', { id: `${id}c` }, [n('path', { d: c.shape })])]),
      n('path', { d: c.shape, fill: kind === 'earth' ? '#0b2a4a' : 'rgba(255,255,255,0.16)' }),
      n('g', { 'clip-path': `url(#${id}c)` }, [water, shine, ...bubbles]),
      n('path', { d: c.shape, fill: 'none', stroke: '#ffffff', 'stroke-width': 6, opacity: kind === 'earth' ? 0 : 0.85, 'stroke-linejoin': 'round' }),
      ...c.extra(),
    ]);
    return { svg, animate(t) {
      // El agua sube durante ~2 s y luego se queda con oleaje.
      const p = 1 - Math.pow(1 - Math.min(1, t / 2.2), 3);
      const level = c.bottom - (c.bottom - c.top) * c.fill * p;
      let d = `M0,${H} L0,${level}`;
      for (let x = 0; x <= W; x += W / 12) d += ` L${x.toFixed(1)},${(level + Math.sin(x / 38 + t * 4) * 7).toFixed(1)}`;
      water.setAttribute('d', `${d} L${W},${H} Z`);
      shine.setAttribute('d', `M${W * 0.2},${level + 14} L${W * 0.42},${level + 10}`);
      bubbles.forEach((b, i) => {
        const k = (t * 0.6 + i / bubbles.length) % 1;
        b.setAttribute('cx', (W * (0.2 + 0.6 * ((i * 37) % 100) / 100) + Math.sin(t * 3 + i) * 6).toFixed(1));
        b.setAttribute('cy', (c.bottom - (c.bottom - level) * k).toFixed(1));
        b.setAttribute('opacity', (0.5 * (1 - k) * p).toFixed(3));
      });
    } };
  }

  const FACTORY = { shark: () => shark('shark'), ancient_shark: () => shark('ancient_shark'), tree, dinosaur, human,
    water_glass: () => filled('glass'), water_person: () => filled('person'), water_bathtub: () => filled('bathtub'),
    water_pool: () => filled('pool'), water_earth: () => filled('earth'),
    balloon, balloons_person: () => lifted('person'), balloons_car: () => lifted('car'),
    balloons_elephant: () => lifted('elephant'), balloons_whale: () => lifted('whale'),
    wizard, trio, hooded, castle, owl, letter, wand, lightning, wizard_hat: wizardHat, magic_stone: magicStone, broom,
    three_headed_dog: threeHeadedDog, train, chess_knight: chessKnight, mirror };
  window.VF = window.VF || { styles: {} };
  window.VF.illustration = (name) => (FACTORY[name] || FACTORY.shark)();
  window.VF.illustrationNames = Object.keys(FACTORY);
})();
