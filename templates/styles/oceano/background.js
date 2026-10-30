// Océano: luz que entra desde la superficie, cáusticas, nieve marina, burbujas,
// siluetas lejanas de tiburones con paralaje, lecho marino y algas meciéndose.
(() => {
  let snow = [], bubbles = [], kelp = [], caustics = [], far = [];
  // Silueta simplificada (la misma forma base de la ilustración, sin detalles).
  const SHARK = new Path2D('M58,100 C90,74 150,58 240,58 C300,58 352,72 406,96 C388,106 330,124 230,132 C160,132 100,122 58,106 Z' +
    'M64,98 C50,90 34,70 12,26 C30,62 38,86 40,100 C36,116 26,138 8,160 C34,140 50,118 64,106 Z' +
    'M196,60 C206,44 214,24 222,4 C230,30 244,48 264,60 Z M262,118 C252,146 236,170 208,188 C232,162 240,140 242,122 Z');

  window.VF.styles.oceano = {
    init(ctx, rng) {
      snow = Array.from({ length: 160 }, () => ({ x: rng() * 1080, y: rng() * 1920, z: 0.3 + rng() * 0.7, ph: rng() * 6.28 }));
      bubbles = Array.from({ length: 28 }, () => ({ x: 60 + rng() * 960, y: rng() * 1920, r: 4 + rng() * 14, v: 60 + rng() * 120, ph: rng() * 6.28 }));
      kelp = Array.from({ length: 9 }, (_, i) => ({ x: i < 5 ? 20 + i * 55 + rng() * 30 : 760 + (i - 5) * 70 + rng() * 30,
        h: 320 + rng() * 380, ph: rng() * 6.28, w: 10 + rng() * 8 }));
      caustics = Array.from({ length: 70 }, () => ({ x: rng() * 1080, y: rng() * 900, r: 30 + rng() * 70, ph: rng() * 6.28, f: 0.6 + rng() }));
      far = [
        { y: 560, s: 0.55, v: 70, off: 0, a: 0.22, dir: -1 },
        { y: 1180, s: 0.35, v: 45, off: 900, a: 0.14, dir: 1 },
        { y: 820, s: 0.25, v: 30, off: 400, a: 0.10, dir: -1 },
      ];
    },
    draw(ctx, t, W, H) {
      // Degradado de profundidad.
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0f6f8f');
      g.addColorStop(0.22, '#0a4a66');
      g.addColorStop(0.6, '#052a40');
      g.addColorStop(1, '#010b14');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Superficie brillante ondulante.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sg = ctx.createLinearGradient(0, 0, 0, 220);
      sg.addColorStop(0, 'rgba(170,240,255,0.35)');
      sg.addColorStop(1, 'rgba(170,240,255,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 120 + Math.sin(x * 0.012 + t * 1.6) * 18 + Math.sin(x * 0.03 - t * 2.3) * 8);
      ctx.lineTo(W, 0);
      ctx.fill();

      // Haces de luz (god rays) que oscilan.
      for (let i = 0; i < 7; i++) {
        const base = 120 + i * 140 + Math.sin(t * 0.25 + i) * 60;
        const spread = 160 + 60 * Math.sin(t * 0.4 + i * 2);
        const alpha = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7));
        const rg = ctx.createLinearGradient(0, 0, 0, H * 0.85);
        rg.addColorStop(0, `rgba(180,245,255,${alpha.toFixed(3)})`);
        rg.addColorStop(1, 'rgba(180,245,255,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(base - 30, 0);
        ctx.lineTo(base + 30, 0);
        ctx.lineTo(base + spread + 120, H * 0.85);
        ctx.lineTo(base + 120 - spread * 0.3, H * 0.85);
        ctx.closePath();
        ctx.fill();
      }

      // Cáusticas: manchas de luz que respiran cerca de la superficie.
      for (const c of caustics) {
        const x = c.x + Math.sin(t * 0.5 * c.f + c.ph) * 40;
        const y = c.y + Math.cos(t * 0.4 * c.f + c.ph) * 30;
        const a = 0.035 * (0.5 + 0.5 * Math.sin(t * 1.3 * c.f + c.ph)) * (1 - y / 1000);
        if (a <= 0) continue;
        const cg = ctx.createRadialGradient(x, y, 0, x, y, c.r);
        cg.addColorStop(0, `rgba(200,255,255,${a.toFixed(3)})`);
        cg.addColorStop(1, 'rgba(200,255,255,0)');
        ctx.fillStyle = cg;
        ctx.fillRect(x - c.r, y - c.r, c.r * 2, c.r * 2);
      }
      ctx.restore();

      // Siluetas lejanas de tiburones (paralaje: más pequeñas = más lejanas y lentas).
      for (const f of far) {
        const span = W + 600;
        const x = f.dir < 0 ? span - ((f.off + f.v * t) % span) - 300 : ((f.off + f.v * t) % span) - 300;
        ctx.save();
        ctx.translate(x, f.y + Math.sin(t * 0.8 + f.off) * 20);
        ctx.scale(f.s * (f.dir < 0 ? 1 : -1), f.s);
        ctx.translate(-210, -100);
        ctx.fillStyle = `rgba(1,14,24,${f.a})`;
        ctx.fill(SHARK);
        ctx.restore();
      }

      // Nieve marina con profundidad.
      for (const p of snow) {
        const y = ((p.y + t * 18 * p.z) % H + H) % H;
        const x = p.x + Math.sin(t * 0.6 + p.ph) * 14 * p.z;
        ctx.fillStyle = `rgba(200,235,245,${(0.15 + 0.35 * p.z).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, 1 + 2.2 * p.z, 0, 6.283);
        ctx.fill();
      }

      // Lecho marino y algas.
      ctx.fillStyle = '#010a12';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, H - 150 - Math.sin(x * 0.006) * 60 - Math.sin(x * 0.02) * 18);
      ctx.lineTo(W, H);
      ctx.fill();
      for (const k of kelp) {
        const sway = Math.sin(t * 0.9 + k.ph) * 40;
        ctx.strokeStyle = 'rgba(14,60,46,0.85)';
        ctx.lineWidth = k.w;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(k.x, H - 120);
        ctx.bezierCurveTo(k.x + sway * 0.3, H - 120 - k.h * 0.35, k.x - sway * 0.6, H - 120 - k.h * 0.7, k.x + sway, H - 120 - k.h);
        ctx.stroke();
      }

      // Burbujas ascendentes con bamboleo.
      ctx.lineWidth = 2;
      for (const b of bubbles) {
        const y = H - ((H - b.y + b.v * t) % (H + 40));
        const x = b.x + Math.sin(t * 2 + b.ph) * 10;
        ctx.strokeStyle = 'rgba(200,245,255,0.45)';
        ctx.beginPath();
        ctx.arc(x, y, b.r, 0, 6.283);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(x - b.r * 0.35, y - b.r * 0.35, b.r * 0.22, 0, 6.283);
        ctx.fill();
      }
    },
  };
})();
