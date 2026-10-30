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
      case 'slide': tx = (1 - e) * 1080; opacity = clamp(pIn * 3); break;
      case 'zoom': scale = lerp(1.35, 1, e); opacity = e; break;
      case 'wipe': clip = `inset(0 ${((1 - e) * 100).toFixed(2)}% 0 0)`; break;
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

  VF.init = async function init(timeline) {
    TL = timeline;
    document.body.dataset.style = TL.style;
    style = VF.styles[TL.style] || VF.styles.curiosidades;
    bgCtx = $('bg').getContext('2d');
    if (style.init) style.init(bgCtx, mulberry32(1234));
    const host = $('scenes');
    scenes = TL.scenes.map((ts) => {
      const node = el('div', `scene scene-${ts.scene.type}`);
      const inner = el('div', 'scene-inner');
      node.appendChild(inner);
      let tag = null;
      if (ts.index === 0) {
        tag = el('div', 'category-tag', TL.style.toUpperCase());
        node.appendChild(tag);
      }
      host.appendChild(node);
      const update = (builders[ts.scene.type] || builders.statement)(inner, ts.scene);
      return { ts, node, inner, update, tag };
    });
    buildSubtitles();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    VF.seek(0);
    return { scenes: scenes.length, cues: cueNodes.length };
  };

  VF.seek = function seek(t) {
    const W = 1080, H = 1920;
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
      if (s.tag) {
        const pt = ease.outBack(prog(lt, 0.2, 0.4));
        s.tag.style.transform = `scale(${pt.toFixed(3)})`;
        s.tag.style.opacity = (pt * (1 - prog(lt, dur - 0.4, 0.3))).toFixed(3);
      }
    }
    // Destello de impacto en el gancho.
    $('flash').style.opacity = (0.55 * (1 - prog(t, 0, 0.35))).toFixed(3);
    $('progress-fill').style.transform = `scaleX(${clamp(t / TL.duration).toFixed(4)})`;
    updateSubtitles(t);
  };
})();
