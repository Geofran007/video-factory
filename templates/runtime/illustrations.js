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

  const FACTORY = { shark: () => shark('shark'), ancient_shark: () => shark('ancient_shark'), tree, dinosaur, human };
  window.VF = window.VF || { styles: {} };
  window.VF.illustration = (name) => (FACTORY[name] || FACTORY.shark)();
  window.VF.illustrationNames = Object.keys(FACTORY);
})();
