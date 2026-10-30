// Curiosidades: degradado que cambia de tono, burbujas de color y confeti flotante.
(() => {
  let blobs = [];
  let confetti = [];
  const COLORS = ['#ffe14d', '#3be8ff', '#ff3d7f', '#7dff6a', '#ffffff'];
  window.VF.styles.curiosidades = {
    init(ctx, rng) {
      blobs = Array.from({ length: 5 }, (_, i) => ({ x: rng() * 1080, y: rng() * 1920, r: 380 + rng() * 300, ph: rng() * 6.28, c: i }));
      confetti = Array.from({ length: 60 }, () => ({
        x: rng() * 1080, y: rng() * 1920, w: 10 + rng() * 18, h: 6 + rng() * 10, v: 40 + rng() * 80,
        rot: rng() * 6.28, vr: (rng() - 0.5) * 4, c: COLORS[Math.floor(rng() * COLORS.length)],
      }));
    },
    draw(ctx, t, W, H) {
      const hue = (280 + Math.sin(t * 0.2) * 30).toFixed(1);
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, `hsl(${hue}, 75%, 16%)`);
      g.addColorStop(1, `hsl(${(Number(hue) + 50).toFixed(1)}, 80%, 30%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const tints = ['rgba(255,61,127,0.35)', 'rgba(255,225,77,0.22)', 'rgba(59,232,255,0.25)', 'rgba(125,255,106,0.18)', 'rgba(255,61,127,0.25)'];
      for (const b of blobs) {
        const x = b.x + Math.sin(t * 0.4 + b.ph) * 160, y = b.y + Math.cos(t * 0.3 + b.ph) * 200;
        const rg = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        rg.addColorStop(0, tints[b.c]);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      }
      for (const c of confetti) {
        const y = ((c.y + c.v * t) % (H + 40) + H + 40) % (H + 40) - 20;
        ctx.save();
        ctx.translate(c.x + Math.sin(t + c.rot) * 30, y);
        ctx.rotate(c.rot + c.vr * t);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = c.c;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };
})();
