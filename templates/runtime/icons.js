// Íconos originales del proyecto (trazos simples en un lienzo de 24x24).
// Se construyen con createElementNS: nunca se interpreta HTML proveniente de datos.
(() => {
  'use strict';
  const P = (d) => ['path', { d }];
  const C = (cx, cy, r) => ['circle', { cx, cy, r }];
  const L = (x1, y1, x2, y2) => ['line', { x1, y1, x2, y2 }];

  const ICONS = {
    brain: [P('M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3 2 2 0 0 0 3-1V5a2 2 0 0 0-3-1z'),
            P('M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3 2 2 0 0 1-3-1V5a2 2 0 0 1 3-1z'),
            P('M8 10h2M14 14h2M8 15h1.5M14.5 9H16')],
    heart: [P('M12 20s-7-4.4-8.6-9A4.6 4.6 0 0 1 12 6.5 4.6 4.6 0 0 1 20.6 11C19 15.6 12 20 12 20z')],
    atom: [C(12, 12, 1.6), ['ellipse', { cx: 12, cy: 12, rx: 10, ry: 4 }],
           ['ellipse', { cx: 12, cy: 12, rx: 10, ry: 4, transform: 'rotate(60 12 12)' }],
           ['ellipse', { cx: 12, cy: 12, rx: 10, ry: 4, transform: 'rotate(120 12 12)' }]],
    globe: [C(12, 12, 9), P('M3 12h18'), ['ellipse', { cx: 12, cy: 12, rx: 4, ry: 9 }], P('M5 7.5h14M5 16.5h14')],
    clock: [C(12, 12, 9), P('M12 7v5l3.5 2')],
    star: [P('M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z')],
    bolt: [P('M13 2L4 14h7l-1 8 9-12h-7z')],
    eye: [P('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z'), C(12, 12, 3)],
    question: [C(12, 12, 9.5), P('M9.2 9a2.9 2.9 0 0 1 5.6 1c0 2-2.8 2.4-2.8 4.2'), C(12, 17.6, 0.4)],
    chart: [P('M4 20V4M4 20h16'), P('M8 16v-4M12 16V8M16 16v-6M20 16V6')],
    coin: [['ellipse', { cx: 12, cy: 7, rx: 8, ry: 3 }], P('M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7'), P('M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3')],
    rocket: [P('M12 2c3.5 2.5 5 6 5 10l-2 4H9l-2-4c0-4 1.5-7.5 5-10z'), C(12, 9.5, 1.8),
             P('M9 16l-3 3 1-5M15 16l3 3-1-5M10.5 19.5L12 22l1.5-2.5')],
    planet: [C(12, 12, 6), ['ellipse', { cx: 12, cy: 12, rx: 11, ry: 3.5, transform: 'rotate(-20 12 12)' }]],
    book: [P('M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z'), P('M4 21a2 2 0 0 1 2-2h13v2H6a2 2 0 0 1-2 0'), P('M8 7h8M8 10.5h6')],
    map: [P('M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z'), P('M9 4v14M15 6v14')],
    drop: [P('M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z')],
    fire: [P('M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-2.5 4-2 6-1.5-1-2.5-2.5-2.5-4C7 9 5 12 5 15a7 7 0 0 0 7 7z')],
    wave: [P('M2 9c2.5-3 5-3 7.5 0s5 3 7.5 0 4-2 5 0'), P('M2 15c2.5-3 5-3 7.5 0s5 3 7.5 0 4-2 5 0')],
    dna: [P('M7 3c0 6 10 6 10 12s-10 3-10 6'), P('M17 3c0 6-10 6-10 12s10 3 10 6'), P('M8.5 6.5h7M8.5 17.5h7M10 12h4')],
    landmark: [P('M3 21h18M4 18h16M12 3l9 5H3z'), P('M6 9v8M10 9v8M14 9v8M18 9v8')],
    key: [C(7.5, 14.5, 4.5), P('M11 11l9-9M17 5l2 2M15 7l2 2')],
    lightbulb: [P('M9 18h6M10 21h4'), P('M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z')],
    skull: [P('M12 3a8 8 0 0 0-8 8c0 2.6 1.2 4.4 3 5.5V20h10v-3.5c1.8-1.1 3-2.9 3-5.5a8 8 0 0 0-8-8z'),
            C(9, 11.5, 1.7), C(15, 11.5, 1.7), P('M10 20v-2M14 20v-2')],
    crown: [P('M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5z'), P('M5 21h14')],
    // Uso interno de las plantillas (no disponible para la IA).
    arrow: [P('M12 4v15M5 12l7 7 7-7')],
  };

  const NS = 'http://www.w3.org/2000/svg';
  function icon(name, cls) {
    const spec = ICONS[name] || ICONS.lightbulb;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icon ' + (cls || ''));
    for (const [tag, attrs] of spec) {
      const node = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
      svg.appendChild(node);
    }
    return svg;
  }
  window.VF = window.VF || { styles: {} };
  window.VF.icon = icon;
  window.VF.iconNames = Object.keys(ICONS);
})();
