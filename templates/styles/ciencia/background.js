// Ciencia: red de partículas (plexo) sobre degradado azul con orbes de luz.
(() => {
  const N = 70;
  let pts = [];
  window.VF.styles.ciencia = {
    init(ctx, rng) {
      pts = Array.from({ length: N }, () => ({
        x: rng() * 1080, y: rng() * 1920, vx: (rng() - 0.5) * 40, vy: (rng() - 0.5) * 40, r: 2 + rng() * 4, ph: rng() * 6.28,
      }));
    },
    draw(ctx, t, W, H) {
      const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
      g.addColorStop(0, '#050b1f');
      g.addColorStop(1, '#0d2a5c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      for (const [cx, cy, r, c] of [[200 + Math.sin(t * 0.3) * 120, 500, 520, 'rgba(59,232,255,0.16)'],
                                     [880 + Math.cos(t * 0.25) * 100, 1400, 600, 'rgba(123,108,255,0.18)']]) {
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        rg.addColorStop(0, c);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      }
      const pos = pts.map((p) => ({
        x: ((p.x + p.vx * t) % W + W) % W,
        y: ((p.y + p.vy * t) % H + H) % H,
        r: p.r * (0.8 + 0.2 * Math.sin(t * 2 + p.ph)),
      }));
      ctx.lineWidth = 1.5;
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 220) {
            ctx.strokeStyle = `rgba(59,232,255,${(0.35 * (1 - d / 220)).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(pos[i].x, pos[i].y); ctx.lineTo(pos[j].x, pos[j].y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = 'rgba(160,245,255,0.9)';
      for (const p of pos) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
    },
  };
})();
