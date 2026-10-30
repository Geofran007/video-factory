// Historia: pergamino oscuro, retícula de mapa, rosa de los vientos y polvo en suspensión.
(() => {
  let dust = [];
  window.VF.styles.historia = {
    init(ctx, rng) {
      dust = Array.from({ length: 90 }, () => ({ x: rng() * 1080, y: rng() * 1920, s: 1 + rng() * 3, v: 6 + rng() * 18, ph: rng() * 6.28 }));
    },
    draw(ctx, t, W, H) {
      const g = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H * 0.45, H * 0.8);
      g.addColorStop(0, '#4a3018');
      g.addColorStop(1, '#140c06');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Retícula de mapa con ligera deriva.
      ctx.strokeStyle = 'rgba(242,192,99,0.10)';
      ctx.lineWidth = 2;
      const off = (t * 12) % 120;
      for (let x = -120 + off; x < W + 120; x += 120) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 60, H); ctx.stroke(); }
      for (let y = -120 + off; y < H + 120; y += 120) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W / 3, y - 30, 2 * W / 3, y + 30, W, y); ctx.stroke(); }
      // Rosa de los vientos girando lentamente.
      ctx.save();
      ctx.translate(W - 170, H - 360);
      ctx.rotate(t * 0.15);
      ctx.strokeStyle = 'rgba(242,192,99,0.28)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 120, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 80, 0, 6.283); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4, len = i % 2 ? 90 : 150;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.stroke();
      }
      ctx.restore();
      for (const d of dust) {
        const y = ((d.y - d.v * t) % H + H) % H;
        const x = d.x + Math.sin(t * 0.8 + d.ph) * 20;
        ctx.fillStyle = `rgba(255,220,160,${(0.25 + 0.25 * Math.sin(t * 1.5 + d.ph)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, d.s, 0, 6.283); ctx.fill();
      }
    },
  };
})();
