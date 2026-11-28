// Motor de escenas de AI Video Factory.
// Interpreta timeline.json (datos validados) y dibuja cada frame como función pura del tiempo:
// VF.init(timeline) construye el DOM una vez y VF.seek(t) deja la escena exacta del instante t.
// No hay animaciones CSS ni temporizadores: el resultado no depende de la velocidad de la máquina.
(() => {
  'use strict';
  const VF = (window.VF = window.VF || { styles: {} });

  // ------------------------------------------------------------------ utilidades
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const ease = {
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    inCubic: (p) => p * p * p,
    inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
    outBack: (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    outElastic: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  };
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  VF.util = { clamp, lerp, prog, ease, mulberry32 };

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');

  function wordSpans(container, text, highlights) {
    const hl = new Set((highlights || []).flatMap((h) => h.split(/\s+/)).map(norm).filter(Boolean));
    const spans = [];
    text.split(/\s+/).filter(Boolean).forEach((w) => {
      const s = el('span', 'w', w);
      if (hl.has(norm(w))) s.classList.add('hl');
      container.appendChild(s);
      spans.push(s);
    });
    return spans;
  }

  // Ajusta el tamaño de letra para que el texto quepa en su caja (se hace una sola vez en init).
  // Se mide sin límite de alto y sin transformaciones, y se compara con el máximo declarado en CSS.
  function fitText(node, maxSize, minSize) {
    const cs = getComputedStyle(node);
    const maxH = parseFloat(cs.maxHeight) || node.clientHeight;
    const maxW = node.clientWidth;
    node.classList.add('measuring');
    node.style.maxHeight = 'none';
    let size = maxSize;
    const overflow = () => node.scrollHeight > maxH || node.scrollWidth > maxW + 1;
    node.style.fontSize = size + 'px';
    while (size > minSize && overflow()) {
      size -= 3;
      node.style.fontSize = size + 'px';
    }
    node.style.maxHeight = '';
    node.classList.remove('measuring');
    return size;
  }

  function animateWords(spans, lt, startAt, stagger) {
    spans.forEach((s, i) => {
      const t0 = startAt + i * stagger;
      const p = prog(lt, t0, 0.38);
      const e = ease.outBack(p);
      s.style.opacity = clamp(p * 2.5).toFixed(3);
      s.style.transform = `translateY(${((1 - e) * 60).toFixed(1)}px) scale(${(0.6 + 0.4 * e).toFixed(3)})`;
      if (s.classList.contains('hl')) s.style.setProperty('--hl', ease.outCubic(prog(lt, t0 + 0.3, 0.4)).toFixed(3));
    });
  }

  function parseNumber(str) {
    const m = /^([^\d]*)(\d[\d.,]*)(.*)$/.exec(str.trim());
    if (!m) return null;
    const raw = m[2];
    let value, decimals = 0;
    if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) {
      value = Number(raw.replace(/[.,]/g, ''));
    } else if (/^\d+[.,]\d{1,2}$/.test(raw)) {
      decimals = raw.split(/[.,]/)[1].length;
      value = Number(raw.replace(',', '.'));
    } else {
      value = Number(raw.replace(/[.,]/g, ''));
    }
    if (!Number.isFinite(value)) return null;
    return { prefix: m[1], value, decimals, suffix: m[3] };
  }
  const formatNumber = (v, decimals) =>
    v.toLocaleString('es-419', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  // ------------------------------------------------------------------ escenas
  // Cada constructor recibe (root, scene, ctx) y devuelve update(localT, duration).
  const builders = {
    title(root, s) {
      const box = el('div', 'txt txt-title');
      root.appendChild(box);
      const spans = wordSpans(box, s.on_screen_text, s.highlight_words);
      fitText(box, 150, 64);
      return (lt) => {
        animateWords(spans, lt, 0.1, 0.09);
        const shake = Math.max(0, 1 - lt / 0.5);
        box.style.transform = `translate(${(Math.sin(lt * 90) * 10 * shake).toFixed(1)}px, ${(Math.cos(lt * 70) * 6 * shake).toFixed(1)}px)`;
      };
    },

    statement(root, s) {
      const ic = VF.icon(s.icon, 'icon-md');
      const box = el('div', 'txt txt-body');
      const bar = el('div', 'accent-bar');
      root.append(ic, box, bar);
      const spans = wordSpans(box, s.on_screen_text, s.highlight_words);
      fitText(box, 104, 52);
      return (lt, dur) => {
        const p = ease.outBack(prog(lt, 0.05, 0.5));
        ic.style.transform = `scale(${p.toFixed(3)}) rotate(${(Math.sin(lt * 1.6) * 6).toFixed(2)}deg) translateY(${(Math.sin(lt * 2.2) * 10).toFixed(1)}px)`;
        animateWords(spans, lt, 0.3, 0.07);
        bar.style.transform = `scaleX(${ease.outCubic(prog(lt, 0.6, 0.6)).toFixed(3)})`;
      };
    },

    big_number(root, s) {
      const NS = 'http://www.w3.org/2000/svg';
      const wrap = el('div', 'number-wrap');
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 700 700'); // se escala al tamaño de .ring vía CSS
      svg.setAttribute('class', 'ring');
      const track = document.createElementNS(NS, 'circle');
      const arc = document.createElementNS(NS, 'circle');
      for (const c of [track, arc]) {
        c.setAttribute('cx', '350'); c.setAttribute('cy', '350'); c.setAttribute('r', '320');
      }
      track.setAttribute('class', 'ring-track');
      arc.setAttribute('class', 'ring-arc');
      const circ = 2 * Math.PI * 320;
      arc.setAttribute('stroke-dasharray', circ.toFixed(1));
      svg.append(track, arc);
      const num = el('div', 'big-number', s.big_number);
      wrap.append(svg, num);
      const cap = el('div', 'txt txt-caption');
      root.append(wrap, cap);
      const spans = wordSpans(cap, s.number_caption || s.on_screen_text, s.highlight_words);
      fitText(num, 300, 120);
      fitText(cap, 84, 44);
      const parsed = parseNumber(s.big_number || '');
      return (lt) => {
        const p = ease.outExpo(prog(lt, 0.15, 1.4));
        if (parsed) num.textContent = parsed.prefix + formatNumber(parsed.value * p, parsed.decimals) + parsed.suffix;
        const pop = ease.outBack(prog(lt, 0.05, 0.45));
        num.style.transform = `scale(${(0.5 + 0.5 * pop + (p >= 1 ? Math.sin(lt * 4) * 0.015 : 0)).toFixed(3)})`;
        arc.setAttribute('stroke-dashoffset', (circ * (1 - p)).toFixed(1));
        svg.style.transform = `rotate(${(-90 + lt * 12).toFixed(2)}deg)`;
        animateWords(spans, lt, 0.9, 0.06);
      };
    },

    list(root, s) {
      const ul = el('div', 'list');
      root.appendChild(ul);
      const rows = s.items.map((text, i) => {
        const row = el('div', 'list-row');
        const badge = el('div', 'list-badge', String(i + 1));
        const label = el('div', 'list-label', text);
        row.append(badge, label);
        ul.appendChild(row);
        return row;
      });
      const head = el('div', 'txt txt-head');
      root.insertBefore(head, ul);
      const spans = s.on_screen_text ? wordSpans(head, s.on_screen_text, s.highlight_words) : [];
      fitText(head, 80, 44);
      rows.forEach((r) => fitText(r.lastChild, 64, 36));
      return (lt, dur) => {
        animateWords(spans, lt, 0.05, 0.05);
        const span = Math.max(0.35, (dur * 0.62) / rows.length);
        rows.forEach((r, i) => {
          const p = ease.outBack(prog(lt, 0.45 + i * span, 0.45));
          r.style.opacity = clamp(p * 2).toFixed(3);
          r.style.transform = `translateX(${((1 - p) * -120).toFixed(1)}px)`;
          r.classList.toggle('active', lt >= 0.45 + i * span && (i === rows.length - 1 || lt < 0.45 + (i + 1) * span));
        });
      };
    },

    comparison(root, s) {
      const a = el('div', 'cmp-card cmp-a');
      const b = el('div', 'cmp-card cmp-b');
      a.appendChild(el('div', 'cmp-label', s.items[0]));
      b.appendChild(el('div', 'cmp-label', s.items[1]));
      const vs = el('div', 'cmp-vs', 'VS');
      const head = el('div', 'txt txt-head');
      root.append(head, a, vs, b);
      const spans = wordSpans(head, s.on_screen_text, s.highlight_words);
      fitText(head, 80, 44);
      fitText(a.firstChild, 88, 40);
      fitText(b.firstChild, 88, 40);
      return (lt) => {
        animateWords(spans, lt, 0.05, 0.05);
        const pa = ease.outCubic(prog(lt, 0.25, 0.55));
        const pb = ease.outCubic(prog(lt, 0.55, 0.55));
        a.style.transform = `translateX(${((1 - pa) * -1100).toFixed(1)}px) rotate(${(-2 + Math.sin(lt * 1.5)).toFixed(2)}deg)`;
        b.style.transform = `translateX(${((1 - pb) * 1100).toFixed(1)}px) rotate(${(2 - Math.sin(lt * 1.5)).toFixed(2)}deg)`;
        const pv = ease.outElastic(prog(lt, 0.9, 0.8));
        vs.style.transform = `scale(${pv.toFixed(3)}) rotate(${((1 - pv) * 180).toFixed(1)}deg)`;
      };
    },

    chart(root, s) {
      const head = el('div', 'txt txt-head');
      const chart = el('div', 'chart');
      root.append(head, chart);
      const spans = wordSpans(head, s.on_screen_text, s.highlight_words);
      fitText(head, 80, 44);
      const max = Math.max(...s.chart.map((c) => Math.abs(c.value))) || 1;
      const decimals = s.chart.some((c) => !Number.isInteger(c.value)) ? 1 : 0;
      const bars = s.chart.map((c) => {
        const col = el('div', 'chart-col');
        const val = el('div', 'chart-value', '0');
        const bar = el('div', 'chart-bar');
        const lab = el('div', 'chart-label', c.label);
        col.append(val, bar, lab);
        chart.appendChild(col);
        return { col, val, bar, c };
      });
      return (lt) => {
        animateWords(spans, lt, 0.05, 0.05);
        bars.forEach(({ val, bar, c }, i) => {
          const p = ease.outCubic(prog(lt, 0.4 + i * 0.22, 0.9));
          bar.style.height = (p * 640 * Math.abs(c.value) / max).toFixed(1) + 'px';
          val.textContent = formatNumber(c.value * p, decimals);
          val.style.opacity = clamp(p * 3).toFixed(3);
        });
      };
    },

    icon_fact(root, s) {
      const halo = el('div', 'halo');
      const rings = [0, 1, 2].map(() => el('div', 'halo-ring'));
      halo.append(...rings);
      const ic = VF.icon(s.icon, 'icon-xl');
      halo.appendChild(ic);
      const box = el('div', 'txt txt-body');
      root.append(halo, box);
      const spans = wordSpans(box, s.on_screen_text, s.highlight_words);
      fitText(box, 96, 48);
      return (lt) => {
        const p = ease.outElastic(prog(lt, 0.05, 1.0));
        ic.style.transform = `scale(${p.toFixed(3)}) rotate(${(Math.sin(lt * 2) * 8).toFixed(2)}deg)`;
        rings.forEach((r, i) => {
          const ph = ((lt * 0.7 + i / 3) % 1);
          r.style.transform = `translate(-50%, -50%) scale(${(0.5 + ph * 1.2).toFixed(3)})`;
          r.style.opacity = ((1 - ph) * 0.6 * clamp(lt / 0.4)).toFixed(3);
        });
        animateWords(spans, lt, 0.45, 0.07);
      };
    },

    // Ilustración animada a pantalla completa. En el gancho, el tiburón se lanza hacia la cámara.
    illustration(root, s) {
      const FLIERS = new Set(['owl', 'broom', 'letter', 'train']);
      const art = VF.illustration(s.illustration);
      const stage = el('div', 'illu-stage illu-' + s.illustration);
      if (s.illustration === 'tree') {
        // Los árboles viven en tierra: se muestran en una «ventana» con paisaje del Devónico.
        const backdrop = el('div', 'illu-backdrop');
        backdrop.appendChild(art.svg);
        stage.appendChild(backdrop);
      } else {
        stage.appendChild(art.svg);
      }
      const hook = s.role === 'hook';
      const box = el('div', hook ? 'txt txt-title txt-over' : 'txt txt-body');
      const spans = wordSpans(box, s.on_screen_text, s.highlight_words);
      root.append(stage, box);
      fitText(box, hook ? 130 : 96, 48);
      const isShark = /shark/.test(s.illustration);
      const isTree = s.illustration === 'tree';
      return (lt, dur) => {
        art.animate(lt, isShark && hook ? 1.6 : 1);
        let tx = 0, ty = 0, sc = 1, rotDeg = 0, op = 1;
        if (isShark && hook) {
          // Embestida: de lejos (pequeño y tenue) a primer plano en ~1.2 s, luego patrulla.
          const p = ease.inOutSine(prog(lt, 0, 1.2));
          sc = lerp(0.28, 1.25, p);
          op = clamp(0.25 + p);
          tx = lerp(-300, 0, p) + Math.sin(lt * 1.3) * 30; // avanza en la dirección en que mira
          ty = lerp(-160, 40, p) + Math.sin(lt * 2.1) * 14;
          rotDeg = lerp(-8, 2, p) + Math.sin(lt * 2.1) * 2;
        } else if (isShark) {
          // Crucero: entra por la izquierda (mira a la derecha) y patrulla con ondulación suave.
          const p = ease.outCubic(prog(lt, 0, 1.1));
          tx = lerp(-900, 0, p) + Math.sin(lt * 0.9) * 50;
          ty = Math.sin(lt * 1.8) * 22;
          rotDeg = Math.sin(lt * 1.8 + 0.6) * 3;
        } else if (isTree) {
          const g = ease.outCubic(prog(lt, 0.05, 1.3));
          art.trunk.setAttribute('transform', `translate(0 ${(460 * (1 - g)).toFixed(1)}) scale(1 ${Math.max(0.001, g).toFixed(3)})`);
          art.trunk.style.transformOrigin = '181px 460px';
          const c = ease.outBack(prog(lt, 0.7, 0.9));
          art.crown.style.transformOrigin = '181px 172px';
          art.crown.style.transform = `translateY(${((1 - g) * 288).toFixed(1)}px) scale(${Math.max(0.001, c).toFixed(3)})`;
          sc = 1 + 0.03 * Math.sin(lt * 0.8);
        } else if (/^balloon/.test(s.illustration)) {
          // Globos: suben desde abajo y siguen elevándose despacio, con vaivén.
          const p = ease.outCubic(prog(lt, 0, 1.4));
          ty = lerp(520, 0, p) + Math.sin(lt * 1.2) * 12;
          tx = Math.sin(lt * 0.8) * 18;
          rotDeg = Math.sin(lt * 1.1) * 2;
        } else if (FLIERS.has(s.illustration)) {
          // Lechuza, escoba, carta y tren entran volando desde la izquierda.
          const p = ease.outCubic(prog(lt, 0, 1.0));
          tx = lerp(-1000, 0, p) + Math.sin(lt * 1.1) * 26;
          ty = Math.sin(lt * 2.4) * 18;
          rotDeg = Math.sin(lt * 2.4 + 0.5) * 3;
        } else {
          const p = ease.outBack(prog(lt, 0, 0.7));
          sc = p;
          ty = Math.sin(lt * 1.5) * 8;
        }
        stage.style.opacity = op.toFixed(3);
        stage.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${sc.toFixed(3)}) rotate(${rotDeg.toFixed(2)}deg)`;
        animateWords(spans, lt, hook ? 0.95 : 0.4, hook ? 0.1 : 0.07);
        if (hook) {
          const slam = prog(lt, 0.95, 0.25);
          box.style.transform = `scale(${lerp(1.5, 1, ease.outCubic(slam)).toFixed(3)})`;
        }
      };
    },

    // Escena 3D (Three.js): lienzo WebGL y texto debajo. La animación depende solo del tiempo local.
    scene3d(root, s) {
      if (VF.three.isFull(s.model3d)) {
        // Escena 3D a pantalla completa (fondo) con un cartel breve arriba; el presentador queda encima, abajo.
        const full = el('canvas', 'three-full');
        full.width = W; full.height = H;
        root.parentElement.insertBefore(full, root);
        const cap = el('div', 'txt three-caption');
        const cspans = wordSpans(cap, s.on_screen_text, s.highlight_words);
        root.appendChild(cap);
        fitText(cap, LAND ? 62 : 54, 36);
        const upd = VF.three.build(full, s.model3d, s);
        const capAt = s.chapter ? CHAPTER_S : 0; // el cartel espera a que pase el título del capítulo
        return (lt, dur) => {
          upd(lt, dur);
          const p = ease.outCubic(prog(lt, capAt + 0.05, 0.35));
          cap.style.opacity = p.toFixed(3);
          cap.style.transform = `translateY(${((1 - p) * -30).toFixed(1)}px)`;
          animateWords(cspans, lt, capAt + 0.1, 0.05);
        };
      }
      const cv = el('canvas', 'three-canvas');
      cv.width = 960; cv.height = 780;
      const box = el('div', s.role === 'hook' ? 'txt txt-title' : 'txt txt-body');
      const spans = wordSpans(box, s.on_screen_text, s.highlight_words);
      root.append(cv, box);
      fitText(box, s.role === 'hook' ? 84 : 84, 44);
      const update = VF.three.build(cv, s.model3d);
      return (lt) => {
        update(lt);
        const p = ease.outCubic(prog(lt, 0, 0.5));
        cv.style.transform = `scale(${(0.9 + 0.1 * p).toFixed(3)})`;
        cv.style.opacity = clamp(p * 1.5).toFixed(3);
        animateWords(spans, lt, 0.35, 0.07);
      };
    },

    // Caricatura: escenario y personajes a pantalla completa; el texto queda como cartel arriba.
    cartoon(root, s) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 1080 1920');
      svg.setAttribute('class', 'cartoon');
      root.parentElement.insertBefore(svg, root);
      const update = VF.cartoon.build(svg, s);
      const box = el('div', 'txt cartoon-caption');
      const spans = wordSpans(box, s.on_screen_text, s.highlight_words);
      root.appendChild(box);
      fitText(box, 82, 44);
      return (lt) => {
        update(lt);
        const p = ease.outBack(prog(lt, 0.1, 0.45));
        box.style.transform = `rotate(-2deg) scale(${p.toFixed(3)})`;
        animateWords(spans, lt, 0.2, 0.05);
      };
    },

    // Línea de tiempo geológica vertical (valores = millones de años atrás).
    timeline(root, s) {
      const head = el('div', 'txt txt-head');
      const spans = wordSpans(head, s.on_screen_text, s.highlight_words);
      const wrap = el('div', 'tl');
      const line = el('div', 'tl-line');
      const fill = el('div', 'tl-fill');
      line.appendChild(fill);
      wrap.appendChild(line);
      root.append(head, wrap);
      fitText(head, 84, 44);
      const H = 620, GAP = 140, TOP = 80;
      line.style.top = TOP + 'px';
      line.style.height = (H + 20) + 'px';
      const pts = [...s.chart].sort((a, b) => b.value - a.value);
      const max = pts[0].value || 1;
      // Posición lineal en el tiempo, separando tarjetas que quedarían superpuestas.
      const ys = pts.map((p) => (1 - p.value / max) * H);
      for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + GAP);
      const scale = ys[ys.length - 1] > H ? H / ys[ys.length - 1] : 1;
      const items = pts.map((p, i) => {
        const y = ys[i] * scale;
        const item = el('div', 'tl-item');
        item.style.top = (y + TOP).toFixed(1) + 'px';
        const dot = el('div', 'tl-dot');
        const card = el('div', 'tl-card');
        if (p.illustration) {
          const thumb = el('div', 'tl-thumb');
          thumb.appendChild(VF.illustration(p.illustration).svg);
          card.appendChild(thumb);
        }
        const txt = el('div', 'tl-text');
        txt.append(el('div', 'tl-label', p.label), el('div', 'tl-value', ''));
        card.appendChild(txt);
        item.append(dot, card);
        wrap.appendChild(item);
        return { item, card, dot, y, p, value: txt.lastChild };
      });
      const ago = (v) => (v >= 1 ? `hace ${formatNumber(v, v % 1 ? 1 : 0)} M de años` : `hace ${formatNumber(v * 1000, 0)} mil años`);
      return (lt, dur) => {
        animateWords(spans, lt, 0.05, 0.05);
        const reveal = Math.max(1.2, dur * 0.7);
        const pf = ease.inOutSine(prog(lt, 0.3, reveal));
        const total = items[items.length - 1].y + 40;
        fill.style.height = (pf * total).toFixed(1) + 'px';
        items.forEach(({ card, dot, y, p, value }) => {
          const at = 0.3 + reveal * (y / total);
          const q = ease.outBack(prog(lt, at, 0.45));
          card.style.opacity = clamp(q * 2).toFixed(3);
          card.style.transform = `translateX(${((1 - q) * 160).toFixed(1)}px)`;
          dot.style.transform = `translate(-50%, -50%) scale(${(q * (1 + 0.15 * Math.sin(lt * 5))).toFixed(3)})`;
          value.textContent = ago(p.value);
        });
      };
    },

    cta(root, s) {
      const box = el('div', 'txt txt-title txt-cta');
      const spans = wordSpans(box, s.on_screen_text, s.highlight_words);
      const icons = el('div', 'cta-icons');
      const ics = ['heart', 'star', 'bolt'].map((n) => VF.icon(n, 'icon-sm'));
      icons.append(...ics);
      const arrow = el('div', 'cta-arrow');
      arrow.appendChild(VF.icon('arrow', 'icon-sm'));
      root.append(box, icons, arrow);
      fitText(box, 120, 56);
      return (lt) => {
        animateWords(spans, lt, 0.1, 0.08);
        ics.forEach((ic, i) => {
          const p = ease.outBack(prog(lt, 0.6 + i * 0.15, 0.4));
          ic.style.transform = `scale(${(p * (1 + Math.sin(lt * 6 + i) * 0.08)).toFixed(3)})`;
        });
        const pa = ease.outCubic(prog(lt, 1.1, 0.5));
        arrow.style.opacity = pa.toFixed(3);
        arrow.style.transform = `translateY(${(Math.abs(Math.sin(lt * 4)) * -30).toFixed(1)}px) rotate(-35deg)`;
      };
    },
  };

  // ------------------------------------------------------------------ transiciones
  const ENTER = 0.45;
  const EXIT = 0.35;
  function applyTransition(node, type, pIn, pOut) {
    let opacity = 1, tx = 0, scale = 1, clip = 'none';
    const e = ease.outCubic(pIn);
    switch (type) {
      case 'slide': tx = (1 - e) * W; opacity = clamp(pIn * 3); break;
      case 'zoom': scale = lerp(1.35, 1, e); opacity = e; break;
      case 'wipe': clip = `inset(0 ${((1 - e) * 100).toFixed(2)}% 0 0)`; break;
      case 'cut': // corte directo: sin fundido ni desplazamiento
        node.style.opacity = pOut > 0 ? '0' : '1';
        node.style.transform = 'none';
        node.style.clipPath = 'none';
        return;
      default: opacity = e;
    }
    const o = ease.inCubic(pOut);
    opacity *= 1 - o;
    scale *= 1 - 0.08 * o;
    tx -= o * 140;
    node.style.opacity = opacity.toFixed(3);
    node.style.transform = `translateX(${tx.toFixed(1)}px) scale(${scale.toFixed(4)})`;
    node.style.clipPath = clip;
  }

  // ------------------------------------------------------------------ estado global
  // index.html?o=h → horizontal 1920×1080 (videos largos); por defecto vertical 1080×1920 (Shorts).
  const LAND = new URLSearchParams(location.search).get('o') === 'h';
  const [W, H] = LAND ? [1920, 1080] : [1080, 1920];
  const CHAPTER_S = 2.4;
  let TL = null;
  let scenes = [];
  let style = null;
  let bgCtx = null;
  let cueNodes = [];
  const $ = (id) => document.getElementById(id);

  function buildSubtitles() {
    const subs = $('subs');
    cueNodes = TL.cues.map((cue) => {
      const line = el('div', 'cue');
      const words = cue.words.map((w) => {
        const s = el('span', 'cw', w.text);
        line.appendChild(s);
        return s;
      });
      subs.appendChild(line);
      fitText(line, 76, 44);
      return { cue, line, words };
    });
  }

  function updateSubtitles(t) {
    cueNodes.forEach(({ cue, line, words }, idx) => {
      const next = cueNodes[idx + 1];
      const until = next ? Math.min(cue.end + 0.12, next.cue.start - 0.04) : cue.end + 0.12;
      const visible = t >= cue.start - 0.04 && t < until;
      line.style.display = visible ? 'block' : 'none';
      if (!visible) return;
      const p = ease.outBack(prog(t, cue.start - 0.04, 0.16));
      line.style.transform = `translate(-50%, -50%) scale(${(0.85 + 0.15 * p).toFixed(3)})`;
      cue.words.forEach((w, i) => {
        const now = t >= w.start && t < w.end;
        words[i].classList.toggle('now', now);
        words[i].classList.toggle('done', t >= w.end);
      });
    });
  }

  // ------------------------------------------------------------------ presentador
  // Imagen fija del presentador del canal (templates/presenters/<nombre>.png) arriba durante todo el video.
  // No se redibuja: solo se anima con transformaciones (respira, rebota al hablar, salta en cada escena).
  let presenter = null;

  function buildPresenter() {
    if (!TL.presenter) return Promise.resolve();
    $('stage').classList.add('with-presenter');
    const box = el('div', 'presenter');
    const disc = el('div', 'presenter-disc');
    const img = el('img', 'presenter-img');
    const wow = el('div', 'presenter-wow', '!');
    const lift = el('div', 'presenter-lift');
    lift.appendChild(VF.illustration('balloon').svg);
    box.append(disc, lift, img, wow);
    $('stage').appendChild(box);
    presenter = { box, img, wow, lift, starts: TL.scenes.map((s) => s.start), ends: TL.scenes.map((s) => s.end),
                  actions: TL.scenes.map((s) => s.scene.presenter_action || 'none'),
                  words: TL.cues.flatMap((c) => c.words) };
    return new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error(`no se encontró el presentador '${TL.presenter}'`));
      img.src = `../presenters/${TL.presenter}.png`;
    });
  }

  function updatePresenter(t) {
    if (!presenter) return;
    const { img, wow, starts, words } = presenter;
    // Última escena que ya empezó y tiempo desde su inicio.
    let idx = 0;
    for (let i = 0; i < starts.length; i++) if (t >= starts[i]) idx = i;
    const since = t - starts[idx];
    const speaking = words.some((w) => t >= w.start && t < w.end);
    const enter = ease.outBack(prog(t, 0, 0.35));
    const hopP = prog(since, 0, 0.45);
    const hop = idx > 0 && hopP < 1 ? Math.sin(Math.PI * hopP) : 0;
    const breathe = Math.sin(t * 2 * Math.PI / 2.4);
    const talk = speaking ? Math.abs(Math.sin(t * 10.5)) : 0;
    const tilt = (idx % 2 ? -1 : 1) * 3 * ease.outCubic(prog(since, 0, 0.5)) + 1.2 * Math.sin(t * 1.3);
    let y = (1 - enter) * 560 - 30 * hop - 8 * talk;
    // float_away: aparece un globo sobre el perrito y, en la segunda mitad de la escena, se lo lleva volando.
    const floating = presenter.actions[idx] === 'float_away';
    const sdur = presenter.ends[idx] - starts[idx];
    const rise = floating ? ease.inCubic(prog(since, sdur * 0.45, sdur * 0.5)) : 0;
    y -= rise * 760;
    const lp = floating ? ease.outBack(prog(since, 0.2, 0.5)) : 0;
    presenter.lift.style.opacity = floating ? clamp(lp * 2).toFixed(3) : '0';
    presenter.lift.style.transform = `translateY(${(y + (1 - lp) * 140).toFixed(1)}px) rotate(${(Math.sin(t * 1.7) * 4).toFixed(2)}deg) scale(${Math.max(0.01, lp).toFixed(3)})`;
    const sx = 1 + 0.06 * hop - 0.012 * breathe;
    const sy = 1 - 0.05 * hop + 0.015 * breathe + 0.025 * talk;
    img.style.transform = `translateY(${y.toFixed(1)}px) rotate(${tilt.toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    const w = idx > 0 ? prog(since, 0.05, 0.25) * (1 - prog(since, 0.9, 0.25)) : 0;
    wow.style.opacity = w.toFixed(3);
    wow.style.transform = `rotate(14deg) scale(${(0.4 + 0.6 * ease.outBack(prog(since, 0.05, 0.3))).toFixed(3)})`;
  }

  VF.init = async function init(timeline) {
    TL = timeline;
    VF.lang = TL.language || 'es';
    document.body.classList.toggle('land', LAND);
    $('bg').width = W; $('bg').height = H;
    document.body.dataset.style = TL.style;
    await buildPresenter();
    style = VF.styles[TL.style] || VF.styles.curiosidades;
    bgCtx = $('bg').getContext('2d');
    if (style.init) style.init(bgCtx, mulberry32(1234), TL);
    const host = $('scenes');
    let chapterCount = 0;
    scenes = TL.scenes.map((ts) => {
      const node = el('div', `scene scene-${ts.scene.type}`);
      const inner = el('div', 'scene-inner');
      node.appendChild(inner);
      let tag = null;
      if (ts.index === 0) {
        tag = el('div', 'category-tag', (TL.category || TL.style).toUpperCase());
        node.appendChild(tag);
      }
      host.appendChild(node);
      let chapter = null;
      if (ts.scene.chapter) {
        chapter = el('div', 'chapter-card');
        chapter.append(el('span', 'chapter-num', String(++chapterCount)), el('span', 'chapter-title', ts.scene.chapter));
        node.appendChild(chapter);
      }
      const update = (builders[ts.scene.type] || builders.statement)(inner, ts.scene);
      return { ts, node, inner, update, tag, chapter };
    });
    buildSubtitles();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    VF.seek(0);
    return { scenes: scenes.length, cues: cueNodes.length };
  };

  // Portada: oculta subtítulos y carteles y pone un título grande. Se llama después de VF.seek(t).
  VF.thumb = function thumb(text, highlight) {
    document.body.classList.add('thumb');
    const hl = new Set((highlight || []).map((w) => w.toLowerCase()));
    const box = el('div', 'thumb-title');
    String(text).split(/\s+/).forEach((w) => {
      const s = el('span', hl.has(w.toLowerCase().replace(/[¿?¡!.,]/g, '')) || hl.has(w.toLowerCase()) ? 'tw tw-hl' : 'tw', w);
      box.append(s, ' ');
    });
    $('stage').appendChild(box);
    fitText(box, 150, 70);
    return true;
  };

  // Imagen de dato curioso (1080×1350, se recorta la parte de arriba del lienzo vertical): escena 3D de fondo,
  // cartel «¿Sabías que…?», el dato en grande, una explicación corta, Leo y la firma del canal.
  VF.post = function post(card) {
    document.body.classList.add('thumb', 'post');
    const wrap = el('div', 'post-card');
    wrap.append(el('div', 'post-badge', card.badge || '¿SABÍAS QUE…?'));
    const fact = el('div', 'post-fact');
    const hl = new Set((card.highlight || []).map((w) => w.toLowerCase()));
    String(card.fact).split(/\s+/).forEach((w) => {
      fact.append(el('span', hl.has(w.toLowerCase()) || hl.has(w.toLowerCase().replace(/[¿?¡!.,:;]+$/g, '')) ? 'pw pw-hl' : 'pw', w), ' ');
    });
    wrap.append(fact);
    if (card.detail) wrap.append(el('div', 'post-detail', card.detail));
    wrap.append(el('div', 'post-brand', card.brand || 'Leo curioso'));
    if (TL.presenter) { const img = el('img', 'post-leo'); img.src = `../presenters/${TL.presenter}.png`; wrap.append(img); }
    $('stage').appendChild(wrap);
    fitText(fact, 92, 54);
    return true;
  };

  VF.seek = function seek(t) {
    style.draw(bgCtx, t, W, H, TL.duration);
    for (const s of scenes) {
      const { start, end } = s.ts;
      const isLast = s.ts.index === scenes.length - 1;
      const visible = t >= start && (isLast ? t <= end + 1 : t < end + EXIT);
      s.node.style.display = visible ? 'flex' : 'none';
      if (!visible) continue;
      const lt = t - start;
      const dur = end - start;
      const pIn = s.ts.index === 0 ? 1 : prog(lt, 0, ENTER);
      const pOut = isLast ? 0 : prog(t, end - 0.05, EXIT);
      applyTransition(s.node, s.ts.scene.transition, pIn, pOut);
      // Zoom lento continuo (efecto Ken Burns) para que ninguna escena quede estática.
      s.inner.style.transform = `scale(${(1 + 0.05 * clamp(lt / Math.max(dur, 0.1))).toFixed(4)})`;
      s.update(lt, dur);
      if (s.chapter) {
        const c = ease.outCubic(prog(lt, 0.15, 0.4)) * (1 - prog(lt, CHAPTER_S - 0.3, 0.3));
        s.chapter.style.opacity = c.toFixed(3);
        s.chapter.style.transform = `translate(-50%, ${((1 - c) * 30).toFixed(1)}px)`;
      }
      if (s.tag) {
        const pt = ease.outBack(prog(lt, 0.2, 0.4));
        s.tag.style.transform = `scale(${pt.toFixed(3)})`;
        s.tag.style.opacity = (pt * (1 - prog(lt, dur - 0.4, 0.3))).toFixed(3);
      }
    }
    // Destello de impacto en el gancho.
    $('flash').style.opacity = (0.55 * (1 - prog(t, 0, 0.35))).toFixed(3);
    $('progress-fill').style.transform = `scaleX(${clamp(t / TL.duration).toFixed(4)})`;
    updatePresenter(t);
    updateSubtitles(t);
  };
})();
