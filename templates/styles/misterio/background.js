// Misterio: haces de luz giratorios, niebla a la deriva y estrellas que titilan.
(() => {
  let stars = [];
  let fog = [];
  window.VF.styles.misterio = {
    init(ctx, rng) {
      stars = Array.from({ length: 120 }, () => ({ x: rng() * 1080, y: rng() * 1920, s: 0.6 + rng() * 2.2, ph: rng() * 6.28, f: 0.5 + rng() * 2 }));
      fog = Array.from({ length: 6 }, (_, i) => ({ y: 300 + i * 280, v: 15 + rng() * 25, r: 380 + rng() * 260, ph: rng() * 1000 }));
    },
    draw(ctx, t, W, H) {
      ctx.fillStyle = '#05030a';
      ctx.fillRect(0, 0, W, H);
      for (const s of stars) {
        ctx.fillStyle = `rgba(220,210,255,${(0.2 + 0.6 * Math.abs(Math.sin(t * s.f + s.ph))).toFixed(3)})`;
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      // Haces de luz desde arriba.
      ctx.save();
      ctx.translate(W / 2, -200);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const a = Math.sin(t * 0.35 + i * 1.3) * 0.35 + (i - 2) * 0.22;
        ctx.save();
        ctx.rotate(a);
        const g = ctx.createLinearGradient(0, 0, 0, H * 1.1);
        g.addColorStop(0, i % 2 ? 'rgba(45,226,196,0.16)' : 'rgba(179,136,255,0.18)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.lineTo(240, H * 1.1); ctx.lineTo(-240, H * 1.1); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      for (const f of fog) {
        const x = ((f.ph + f.v * t) % (W + 2 * f.r)) - f.r;
        const g = ctx.createRadialGradient(x, f.y, 0, x, f.y, f.r);
        g.addColorStop(0, 'rgba(120,90,170,0.16)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
    },
  };
})();
