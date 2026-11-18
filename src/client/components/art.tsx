'use client';

// Vault's two pieces of generated artwork. Both are decorative (aria-hidden) and
// static, so there is nothing to pause for reduced-motion.

import { useEffect, useRef } from 'react';

/** Layered ember ridges with film grain, used behind the Today hero. Always dark. */
export function HeroArt() {
  return (
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ha-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141b1f" />
          <stop offset="0.16" stopColor="#3a3432" />
          <stop offset="0.3" stopColor="#8a4f33" />
          <stop offset="0.42" stopColor="#d9783f" />
          <stop offset="1" stopColor="#e88a4a" />
        </linearGradient>
        <linearGradient id="ha-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1a16" />
          <stop offset="1" stopColor="#100c0b" />
        </linearGradient>
        <linearGradient id="ha-lit" x1="0.1" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#7a3214" />
          <stop offset="0.35" stopColor="#f07a34" />
          <stop offset="0.7" stopColor="#9a3d16" />
          <stop offset="1" stopColor="#1a0f0b" />
        </linearGradient>
        <linearGradient id="ha-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141010" />
          <stop offset="1" stopColor="#0c0c0c" />
        </linearGradient>
        <linearGradient id="ha-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#0c0c0c" stopOpacity="0" />
          <stop offset="1" stopColor="#0c0c0c" />
        </linearGradient>
        <linearGradient id="ha-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0c0c0c" stopOpacity="0.72" />
          <stop offset="0.6" stopColor="#0c0c0c" stopOpacity="0" />
        </linearGradient>
        <filter id="ha-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0" />
        </filter>
        <filter id="ha-soft">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>
      <rect width="1440" height="800" fill="url(#ha-sky)" />
      <g filter="url(#ha-soft)">
        <path d="M0 330 C 180 300 300 250 470 262 C 640 274 760 360 930 372 C 1120 386 1280 330 1440 300 L1440 800 L0 800Z" fill="url(#ha-far)" />
        <path d="M520 800 C 640 600 760 470 960 430 C 1140 394 1290 420 1440 392 L1440 800Z" fill="url(#ha-lit)" />
        <path d="M0 470 C 200 500 380 600 620 640 C 860 680 1100 640 1440 700 L1440 800 L0 800Z" fill="url(#ha-floor)" />
      </g>
      <rect width="1440" height="800" fill="url(#ha-left)" />
      <rect width="1440" height="800" fill="url(#ha-fade)" />
      <rect width="1440" height="800" filter="url(#ha-grain)" opacity="0.16" style={{ mixBlendMode: 'overlay' }} />
    </svg>
  );
}

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How densely to dot a point of the vault-door drawing: 0 (empty) to 1 (solid). */
function doorDensity(dx: number, dy: number, R: number): number {
  const r = Math.hypot(dx, dy) / R;
  const angle = Math.atan2(dy, dx);
  if (r > 1) {
    // Outside the door: particles thinning out, drifting further below than above.
    const fall = dy > 0 ? 0.42 : 0.2;
    return 0.2 * Math.exp(-(r - 1) / fall);
  }
  if (r > 0.93) return 0.95; // rim
  if (r > 0.8) {
    // bolt ring
    const bolts = 14;
    const nearest = Math.round((angle / (2 * Math.PI)) * bolts) * ((2 * Math.PI) / bolts);
    const bx = Math.cos(nearest) * 0.865 - dx / R;
    const by = Math.sin(nearest) * 0.865 - dy / R;
    return Math.hypot(bx, by) < 0.036 ? 1 : 0.2;
  }
  if (r > 0.77) return 0.85; // inner rim
  if (r < 0.15) return 0.95; // hub
  // Five-spoke handle.
  const spokes = 5;
  const step = (2 * Math.PI) / spokes;
  const local = ((((angle + Math.PI / 2) % step) + step) % step) - step / 2;
  const across = Math.abs(Math.sin(local) * r);
  if (r < 0.46 && across < 0.028 && Math.cos(local) > 0) return 0.92;
  const kx = Math.cos(local) * r - 0.46;
  if (Math.hypot(kx, Math.sin(local) * r) < 0.055) return 1;
  if (Math.abs(r - 0.58) < 0.018) return 0.8; // groove
  // Plate, shaded as if lit from the upper left.
  return 0.04 + 0.16 * Math.max(0, (-dx - dy) / (R * 1.4)) + (r > 0.58 ? 0.04 : 0);
}

/** A vault door drawn as scattered dots, for the login page. Redraws on resize and theme change. */
export function DotArt() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = getComputedStyle(canvas).color;

      const random = mulberry32(20261116);
      const step = 6;
      const R = Math.min(width * 0.4, height * 0.36);
      const cx = width * 0.52;
      const cy = height * 0.47;
      for (let y = step / 2; y < height; y += step) {
        for (let x = step / 2; x < width; x += step) {
          const density = doorDensity(x - cx, y - cy, R);
          if (random() < density) {
            ctx.globalAlpha = 0.45 + 0.55 * Math.min(1, density + random() * 0.3);
            ctx.fillRect(x - 1, y - 1, 2.2, 2.2);
          }
        }
      }
    };
    draw();
    const resize = new ResizeObserver(draw);
    resize.observe(canvas);
    const theme = new MutationObserver(draw);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      resize.disconnect();
      theme.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="h-full w-full text-ink" />;
}
