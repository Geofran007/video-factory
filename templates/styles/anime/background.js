// Anime / manga: trama de puntos, líneas de concentración que "golpean" en cada cambio de escena,
// estelas de velocidad y marco de viñeta. Animado "a dos" (12 dibujos/s) como la animación tradicional.
(() => {
  const DRAW_FPS = 12;
  let cuts = [];
  let streaks = [];
  let sparks = [];

  // Aleatorio determinista por dibujo: el mismo t siempre produce el mismo fotograma.
  function hash(n) {
    let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  function sinceCut(t) {
    let last = -99;
    for (const c of cuts) if (c <= t) last = c;
    return t - last;
  }

  function halftone(ctx, t, W, H) {
    const step = 34;
    const drift = (t * 14) % step;
    ctx.fillStyle = 'rgba(255,255,255,0.075)';
    for (let y = -step; y < H + step; y += step) {
      const row = Math.round(y / step);
      for (let x = (row % 2) * step / 2 - step; x < W + step; x += step) {
        // Puntos más grandes hacia las esquinas (degradado de trama).
        const dx = (x - W / 2) / W, dy = (y - H * 0.42) / H;
        const r = Math.min(9, 1.2 + 14 * (dx * dx + dy * dy));
        ctx.beginPath();
        ctx.arc(x + drift, y + drift * 0.5, r, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  function speedLines(ctx, frame, W, H, power) {
    const cx = W / 2, cy = H * 0.42;
    const n = 90;
    const inner = 430 + (1 - power) * 260;
    ctx.fillStyle = `rgba(255,255,255,${(0.10 + 0.32 * power).toFixed(3)})`;
    for (let i = 0; i < n; i++) {
      const r1 = hash(frame * 977 + i);
      const a = (i + r1 * 0.8) / n * 6.2832;
      const w = (0.004 + 0.012 * hash(frame * 131 + i * 7)) * (0.6 + power);
      const start = inner + hash(frame * 53 + i * 3) * 220;
      const far = 1500;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * start, cy + Math.sin(a) * start);
      ctx.lineTo(cx + Math.cos(a - w) * far, cy + Math.sin(a - w) * far);
      ctx.lineTo(cx + Math.cos(a + w) * far, cy + Math.sin(a + w) * far);
      ctx.closePath();
      ctx.fill();
    }
  }

  function impactBurst(ctx, W, H, k) {
    // Estallido dentado rojo detrás del contenido, sólo durante los primeros instantes de cada escena.
    const cx = W / 2, cy = H * 0.42;
    const R = 260 + 520 * k;
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.fillStyle = '#ff2d55';
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = i / 28 * 6.2832;
      const r = i % 2 ? R * 0.62 : R;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.fill();
    ctx.restore();
  }

  function panelFrame(ctx, W, H) {
    // Marco de viñeta con cortes diagonales arriba y abajo.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(34, 120); ctx.lineTo(W - 34, 70); ctx.lineTo(W - 34, H - 160); ctx.lineTo(34, H - 110); ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = '#ff2d55';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(54, 140); ctx.lineTo(W - 54, 92); ctx.lineTo(W - 54, H - 180); ctx.lineTo(54, H - 132); ctx.closePath();
    ctx.stroke();
  }

  window.VF.styles.anime = {
    init(ctx, rng, tl) {
      cuts = (tl && tl.scenes ? tl.scenes.map((s) => s.start) : [0]).filter((s) => s > 0.05);
      streaks = Array.from({ length: 26 }, () => ({ y: rng() * 1920, len: 180 + rng() * 520, v: 1400 + rng() * 2200,
        w: 2 + rng() * 5, ph: rng() * 4000 }));
      sparks = Array.from({ length: 14 }, () => ({ x: 80 + rng() * 920, y: 150 + rng() * 1500, ph: rng() * 6.28,
        f: 0.6 + rng() * 1.2, s: 18 + rng() * 26 }));
    },
    draw(ctx, t, W, H) {
      const frame = Math.floor(t * DRAW_FPS);
      const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
      g.addColorStop(0, '#0b0814');
      g.addColorStop(0.55, '#1a0b1f');
      g.addColorStop(1, '#2a0a17');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      halftone(ctx, t, W, H);

      const sc = sinceCut(t);
      const burst = sc < 0.55 ? 1 - sc / 0.55 : 0;
      const lead = t < 0.6 ? 1 - t / 0.6 : 0;  // golpe también al empezar el video
      const power = Math.max(burst, lead, 0.18);
      if (burst > 0 || lead > 0) impactBurst(ctx, W, H, 1 - Math.max(burst, lead));
      speedLines(ctx, frame, W, H, power);

      // Estelas horizontales de velocidad.
      for (const s of streaks) {
        const x = W + s.len - ((s.ph + s.v * t) % (W + s.len * 2));
        ctx.fillStyle = 'rgba(255,214,10,0.22)';
        ctx.fillRect(x, s.y, s.len, s.w);
      }
      // Destellos de cuatro puntas ("kira").
      ctx.fillStyle = '#ffffff';
      for (const p of sparks) {
        const k = Math.max(0, Math.sin(t * p.f * 3.1416 + p.ph));
        if (k < 0.2) continue;
        const s = p.s * k;
        ctx.globalAlpha = k * 0.8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s * 0.18, p.y - s * 0.18); ctx.lineTo(p.x + s, p.y);
        ctx.lineTo(p.x + s * 0.18, p.y + s * 0.18); ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s * 0.18, p.y + s * 0.18);
        ctx.lineTo(p.x - s, p.y); ctx.lineTo(p.x - s * 0.18, p.y - s * 0.18); ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      panelFrame(ctx, W, H);
    },
  };
})();
