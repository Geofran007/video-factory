// Finanzas: cuadrícula, velas desplazándose y una línea de tendencia que se dibuja.
(() => {
  let candles = [];
  let line = [];
  window.VF.styles.finanzas = {
    init(ctx, rng) {
      let v = 0.5;
      candles = Array.from({ length: 40 }, () => {
        const open = v; v = Math.min(0.9, Math.max(0.1, v + (rng() - 0.45) * 0.12));
        return { open, close: v, hi: Math.max(open, v) + rng() * 0.04, lo: Math.min(open, v) - rng() * 0.04 };
      });
      let y = 0.75;
      line = Array.from({ length: 60 }, () => (y = Math.min(0.9, Math.max(0.15, y - 0.012 + (rng() - 0.5) * 0.05))));
    },
    draw(ctx, t, W, H, dur) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#03140f');
      g.addColorStop(1, '#0a2e22');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(46,232,143,0.07)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // Velas en la franja inferior, desplazándose a la izquierda.
      const cw = 54, base = H - 120, span = 420, shift = (t * 30) % (candles.length * cw);
      candles.forEach((c, i) => {
        const x = ((i * cw - shift) % (candles.length * cw) + candles.length * cw) % (candles.length * cw) - cw;
        if (x > W) return;
        const up = c.close >= c.open;
        ctx.fillStyle = ctx.strokeStyle = up ? 'rgba(46,232,143,0.30)' : 'rgba(255,90,90,0.26)';
        ctx.beginPath(); ctx.moveTo(x + cw / 2, base - c.hi * span); ctx.lineTo(x + cw / 2, base - c.lo * span); ctx.stroke();
        const top = base - Math.max(c.open, c.close) * span, h = Math.max(6, Math.abs(c.close - c.open) * span);
        ctx.fillRect(x + 10, top, cw - 20, h);
      });
      // Tendencia que avanza con el video.
      const p = Math.min(1, t / Math.max(1, dur * 0.9));
      const n = Math.max(2, Math.floor(line.length * p));
      ctx.strokeStyle = 'rgba(245,197,66,0.45)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = (i / (line.length - 1)) * W, y = line[i] * H * 0.6 + 150;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    },
  };
})();
