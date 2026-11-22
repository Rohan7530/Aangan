import { useEffect, useRef } from 'react';

// The night-courtyard backdrop shared with the 3D landing page (welcome.html):
// a twinkling starfield with a few drifting marigold and jade sparks, soft glows,
// and a perspective grid floor. Plain canvas + CSS (no three.js), paused when the
// tab is hidden, and drawn once (no motion) for people who prefer reduced motion.
export function NightBackdrop({ orb = true }: { orb?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let raf = 0;

    type Star = { x: number; y: number; r: number; base: number; speed: number; phase: number; color: string; vx: number; vy: number };
    let stars: Star[] = [];

    const seed = () => {
      const count = Math.round(Math.min(260, (w * h) / 6500));
      stars = Array.from({ length: count }, (_, i) => {
        const spark = i % 14 === 0; // a few warm/cool sparks among the white stars
        const color = spark ? (i % 28 === 0 ? '63,227,192' : '255,178,63') : '220,230,255';
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: spark ? 1.4 + Math.random() * 1.4 : 0.4 + Math.random() * 1.1,
          base: spark ? 0.75 : 0.25 + Math.random() * 0.55,
          speed: 0.4 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
          color,
          vx: spark ? (Math.random() - 0.5) * 0.12 : 0,
          vy: spark ? -0.05 - Math.random() * 0.12 : 0,
        };
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (still) draw(0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        if (!still) {
          s.x += s.vx;
          s.y += s.vy;
          if (s.y < -4) s.y = h + 4;
          if (s.x < -4) s.x = w + 4;
          if (s.x > w + 4) s.x = -4;
        }
        const a = still ? s.base : s.base * (0.55 + 0.45 * Math.sin(t / 1000 * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color},${a.toFixed(3)})`;
        if (s.r > 1.3) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = `rgba(${s.color},0.9)`;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !still) raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    if (!still) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className="night-backdrop" aria-hidden="true">
      <div className="night-glow" />
      <canvas ref={canvasRef} className="night-stars" />
      {orb && (
        <div className="night-orb">
          <span className="night-orb-core" />
          <span className="night-orb-ring" />
          <span className="night-orb-ring night-orb-ring-2" />
        </div>
      )}
      <div className="night-grid" />
    </div>
  );
}

// The landing page's mark: a marigold-to-jade frame around a glowing courtyard.
export function NightMark({ size = 36 }: { size?: number }) {
  return (
    <span className="night-mark" style={{ width: size, height: size }} aria-hidden="true">
      <i />
    </span>
  );
}
