"use client";

import { useEffect, useRef } from "react";

/**
 * O "outro fundo" revelado pela janela do rosto: espaço profundo azul-esverdeado (as cores vêm
 * do interior da janela do pôster), campo de estrelas em canvas (3 camadas, parallax, twinkle,
 * deriva), faixa de Via Láctea e vinheta.
 *
 * Engenharia: nenhum estado React (tudo em refs), 1 laço rAF que só roda enquanto o componente
 * está visível e a aba ativa, DPR <= 2, limpeza completa no unmount, prefers-reduced-motion =
 * desenho estático. Lê --mx/--my (-1..1) do [data-hero-root] mais próximo.
 */

type Props = {
  className?: string;
  /** Multiplicador da quantidade de estrelas (padrão 1). */
  density?: number;
  /** Mostrar a faixa de Via Láctea (padrão true). */
  milkyWay?: boolean;
};

const DPR_MAX = 2;
const MAX_PIXELS = 6e6; // evita canvases gigantes em telas 4K com DPR 2

// Cores das estrelas: branco-azulado (maioria), branco, quente (laranja do pôster), rosado (magenta).
const TINTS = ["rgb(214 228 246)", "rgb(246 248 255)", "rgb(255 224 200)", "rgb(255 196 224)"] as const;
const TINT_RGB = [
  [214, 228, 246],
  [246, 248, 255],
  [255, 224, 200],
  [255, 196, 224],
] as const;
const TINT_WEIGHTS = [0.62, 0.2, 0.1, 0.08];

type Layer = {
  n: number;
  x: Float32Array;
  y: Float32Array;
  r: Float32Array; // tamanho em px CSS
  a: Float32Array; // alfa base
  ph: Float32Array; // fase do twinkle
  sp: Float32Array; // velocidade do twinkle (rad/s)
  tw: Float32Array; // profundidade do twinkle (0 = estrela estável)
  groups: number[]; // índice final (exclusivo) de cada grupo de cor; as estrelas são ordenadas por cor
  par: number; // parallax (fração da largura por unidade de --mx)
  vx: number; // deriva (fração do contêiner por segundo)
  vy: number;
  glow: boolean; // usa sprite com halo
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Geometria da faixa da Via Láctea: segmento diagonal (coordenadas normalizadas) e largura em px. */
function bandGeom(W: number, H: number) {
  const portrait = H > W * 1.1;
  const p0 = portrait ? [-0.08, 0.92] : [-0.06, 0.88];
  const p1 = portrait ? [1.08, 0.3] : [1.06, 0.16];
  const bw = 0.15 * Math.sqrt(W * H); // meia-largura do núcleo em px
  return { p0, p1, bw };
}

// ---------------------------------------------------------------- ruído barato (value noise)
function hash2(ix: number, iy: number, seed: number) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x: number, y: number, seed: number, oct: number) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * vnoise(x * f, y * f, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return s / norm;
}

/** Pinta a faixa da Via Láctea num canvas pequeno (o CSS amplia com suavização). */
function paintMilky(cv: HTMLCanvasElement, W: number, H: number) {
  const long = 260;
  const k = long / Math.max(W, H);
  const w = Math.max(16, Math.round(W * 1.1 * k));
  const h = Math.max(16, Math.round(H * 1.1 * k));
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  const { p0, p1, bw } = bandGeom(W, H);
  // o canvas cobre o contêiner com 5% de sobra em cada lado
  const toPx = (nx: number, ny: number) => [(nx * 1.0 + 0.05) * (w / 1.1), (ny * 1.0 + 0.05) * (h / 1.1)];
  const [ax, ay] = toPx(p0[0], p0[1]);
  const [bx, by] = toPx(p1[0], p1[1]);
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const bwc = bw * k; // meia-largura em px do canvas
  const data = img.data;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const vx = i - ax;
      const vy = j - ay;
      const t = vx * ux + vy * uy;
      let perp = vx * uy - vy * ux;
      const sx = i / bwc;
      const sy = j / bwc;
      // deforma o eixo para a borda ficar irregular, como poeira estelar
      perp += (fbm(sx * 0.9 + 3.1, sy * 0.9 + 7.7, 11, 3) - 0.5) * bwc * 1.5;
      const q = perp / bwc;
      const core = Math.exp(-q * q * 1.25);
      const halo = Math.exp(-q * q * 0.28) * 0.35;
      // variação de brilho ao longo da faixa + poeira
      const along = 0.7 + 0.5 * fbm(t / bwc * 0.55 + 1.7, q * 0.4, 23, 3);
      const cloud = 0.62 + 0.7 * fbm(sx * 2.4 + 9.2, sy * 2.4 + 1.3, 31, 4);
      // veios escuros (poeira) cruzando o núcleo
      const lane = Math.max(0, fbm(t / bwc * 1.3 + 4.4, q * 1.6 + 2.2, 47, 3) - 0.58) * 2.2;
      let d = (core * along + halo) * cloud * (1 - Math.min(0.75, lane));
      // some suavemente nas pontas da faixa
      const e = t / len;
      d *= Math.min(1, Math.max(0, e + 0.1) * 6) * Math.min(1, Math.max(0, 1.1 - e) * 6);
      const alpha = Math.min(0.3, d * 0.27);
      const warm = fbm(sx * 1.1 + 5.5, sy * 1.1 + 8.1, 59, 2);
      const o = (j * w + i) * 4;
      data[o] = 118 + 34 * warm;
      data[o + 1] = 130 + 8 * warm;
      data[o + 2] = 158 - 20 * warm;
      data[o + 3] = alpha * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------- estrelas
function makeLayer(
  rand: () => number,
  count: number,
  opts: {
    rMin: number; rMax: number; aMin: number; aMax: number; twFrac: number; par: number; speed: number;
    glow?: boolean; band?: { W: number; H: number } | null;
  },
): Layer {
  const n = count;
  const items: { x: number; y: number; r: number; a: number; ph: number; sp: number; tw: number; tint: number }[] = [];
  const band = opts.band ? bandGeom(opts.band.W, opts.band.H) : null;
  for (let i = 0; i < n; i++) {
    let x: number;
    let y: number;
    if (band && opts.band) {
      // poeira concentrada na faixa (gaussiana em torno do eixo)
      const { W, H } = opts.band;
      const t = rand();
      const g = (rand() + rand() + rand() - 1.5) * 1.1; // ~gaussiana
      const px = (band.p0[0] + (band.p1[0] - band.p0[0]) * t) * W;
      const py = (band.p0[1] + (band.p1[1] - band.p0[1]) * t) * H;
      const dxp = (band.p1[0] - band.p0[0]) * W;
      const dyp = (band.p1[1] - band.p0[1]) * H;
      const l = Math.hypot(dxp, dyp);
      x = (px + (dyp / l) * g * band.bw * 1.5) / W;
      y = (py - (dxp / l) * g * band.bw * 1.5) / H;
      x -= Math.floor(x);
      y -= Math.floor(y);
    } else {
      x = rand();
      y = rand();
    }
    const u = rand();
    let tint = 0;
    let acc = 0;
    for (let k = 0; k < TINT_WEIGHTS.length; k++) {
      acc += TINT_WEIGHTS[k];
      if (u <= acc) { tint = k; break; }
    }
    const big = Math.pow(rand(), 2.2); // poucas estrelas maiores
    items.push({
      x, y,
      r: opts.rMin + (opts.rMax - opts.rMin) * big,
      a: opts.aMin + (opts.aMax - opts.aMin) * rand(),
      ph: rand() * Math.PI * 2,
      sp: 0.5 + rand() * 1.9,
      tw: rand() < opts.twFrac ? 0.3 + rand() * 0.45 : 0,
      tint,
    });
  }
  items.sort((p, q) => p.tint - q.tint);
  const L: Layer = {
    n,
    x: new Float32Array(n), y: new Float32Array(n), r: new Float32Array(n), a: new Float32Array(n),
    ph: new Float32Array(n), sp: new Float32Array(n), tw: new Float32Array(n),
    groups: [0, 0, 0, 0],
    par: opts.par,
    vx: opts.speed,
    vy: opts.speed * -0.32,
    glow: !!opts.glow,
  };
  items.forEach((s, i) => {
    L.x[i] = s.x; L.y[i] = s.y; L.r[i] = s.r; L.a[i] = s.a; L.ph[i] = s.ph; L.sp[i] = s.sp; L.tw[i] = s.tw;
    for (let g = s.tint; g < 4; g++) L.groups[g] = i + 1;
  });
  return L;
}

function makeSprites(): HTMLCanvasElement[] {
  // halo suave para as estrelas próximas (um sprite por cor)
  return TINT_RGB.map(([r, g, b]) => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    if (x) {
      const grd = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grd.addColorStop(0.1, `rgba(${r},${g},${b},.85)`);
      grd.addColorStop(0.25, `rgba(${r},${g},${b},.28)`);
      grd.addColorStop(0.55, `rgba(${r},${g},${b},.06)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      x.fillStyle = grd;
      x.fillRect(0, 0, 64, 64);
    }
    return c;
  });
}

export default function SpaceScene({ className, density = 1, milkyWay = true }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLCanvasElement>(null);
  const milkyRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const cv = starsRef.current;
    if (!root || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const milky = milkyRef.current;
    const heroRoot = (root.closest("[data-hero-root]") as HTMLElement | null) ?? root;
    const heroStyle = getComputedStyle(heroRoot);
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");

    let reduce = mql.matches;
    let visible = true;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let layers: Layer[] = [];
    let sprites: HTMLCanvasElement[] = [];
    let raf = 0;
    let layoutQueued = false;
    let ready = false;
    let t0 = performance.now();
    let lastMx = 0;
    let lastMy = 0;
    let still = 0;
    let frame = 0;
    let disposed = false;

    const readVar = (name: string) => {
      const inline = heroRoot.style.getPropertyValue(name); // barato, sem recálculo de estilo
      const s = inline || heroStyle.getPropertyValue(name);
      const v = parseFloat(s);
      return Number.isFinite(v) ? v : 0;
    };

    const build = () => {
      const area = (W * H) / 1e6;
      const dn = Math.max(0.2, density);
      const rand = mulberry32(20240611);
      const nFar = Math.round(Math.min(1500, Math.max(360, area * 700)) * dn);
      const nBand = Math.round(Math.min(1200, Math.max(300, area * 620)) * dn);
      const nMid = Math.round(Math.min(380, Math.max(90, area * 150)) * dn);
      const nNear = Math.round(Math.min(70, Math.max(18, area * 30)) * dn);
      layers = [
        makeLayer(rand, nFar, { rMin: 0.6, rMax: 1.0, aMin: 0.28, aMax: 0.72, twFrac: 0.3, par: 0.004, speed: 0.00035 }),
        makeLayer(rand, milkyWay ? nBand : 0, { rMin: 0.55, rMax: 0.95, aMin: 0.3, aMax: 0.78, twFrac: 0.3, par: 0.005, speed: 0.00038, band: { W, H } }),
        makeLayer(rand, nMid, { rMin: 0.95, rMax: 1.6, aMin: 0.45, aMax: 0.9, twFrac: 0.4, par: 0.011, speed: 0.0009 }),
        makeLayer(rand, nNear, { rMin: 1.4, rMax: 2.5, aMin: 0.6, aMax: 1, twFrac: 0.55, par: 0.026, speed: 0.0019, glow: true }),
      ];
    };

    const layout = () => {
      layoutQueued = false;
      if (disposed) return;
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (w < 2 || h < 2) return;
      const sizeChanged = w !== W || h !== H;
      W = w;
      H = h;
      dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / (W * H)));
      const pw = Math.round(W * dpr);
      const ph = Math.round(H * dpr);
      if (cv.width !== pw || cv.height !== ph) {
        cv.width = pw;
        cv.height = ph;
      }
      if (sizeChanged || layers.length === 0) {
        build();
        if (milky && milkyWay) paintMilky(milky, W, H);
      }
      if (!sprites.length) sprites = makeSprites();
      draw(performance.now(), true);
      if (!ready) {
        ready = true;
        root.setAttribute("data-ready", "");
      }
    };

    const queueLayout = () => {
      if (layoutQueued) return;
      layoutQueued = true;
      requestAnimationFrame(layout);
    };

    const draw = (now: number, force = false) => {
      if (!W || !layers.length) return;
      const t = reduce ? 0 : (now - t0) / 1000;
      const mx = reduce ? 0 : readVar("--mx");
      const my = reduce ? 0 : readVar("--my");
      // com o ponteiro parado e sem forçar, desenha só 1 em cada 3 quadros (twinkle é lento)
      if (!force) {
        const moved = Math.abs(mx - lastMx) + Math.abs(my - lastMy) > 0.0004;
        still = moved ? 0 : still + 1;
        if (still > 20 && frame++ % 3 !== 0) return;
      }
      lastMx = mx;
      lastMy = my;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const L of layers) {
        if (!L.n) continue;
        const offX = -mx * L.par + t * L.vx;
        const offY = -my * L.par * (W / H) + t * L.vy;
        let start = 0;
        for (let g = 0; g < 4; g++) {
          const end = L.groups[g];
          if (end > start) {
            ctx.fillStyle = TINTS[g];
            for (let i = start; i < end; i++) {
              let nx = L.x[i] + offX;
              let ny = L.y[i] + offY;
              nx -= Math.floor(nx);
              ny -= Math.floor(ny);
              const px = nx * W;
              const py = ny * H;
              let a = L.a[i];
              const tw = L.tw[i];
              if (tw > 0 && !reduce) a *= 1 - tw * (0.5 + 0.5 * Math.sin(t * L.sp[i] + L.ph[i]));
              const r = L.r[i];
              ctx.globalAlpha = a;
              if (L.glow) {
                const s = r * 7;
                ctx.drawImage(sprites[g], px - s / 2, py - s / 2, s, s);
              } else {
                ctx.fillRect(px - r / 2, py - r / 2, r, r);
              }
            }
          }
          start = end;
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = 0;
      draw(now);
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (raf || reduce || !visible || document.hidden || disposed) return;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      visible = e.isIntersecting;
      if (visible) start(); else stop();
    });
    const ro = new ResizeObserver(queueLayout);
    const onVis = () => (document.hidden ? stop() : start());
    const onMotion = () => {
      reduce = mql.matches;
      if (reduce) { stop(); draw(performance.now(), true); } else { t0 = performance.now(); start(); }
    };

    io.observe(root);
    ro.observe(root);
    document.addEventListener("visibilitychange", onVis);
    mql.addEventListener("change", onMotion);
    layout();
    start();

    return () => {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      mql.removeEventListener("change", onMotion);
      layers = [];
      sprites = [];
    };
  }, [density, milkyWay]);

  return (
    <div ref={rootRef} className={className ? `sp ${className}` : "sp"} aria-hidden="true">
      {milkyWay ? <canvas ref={milkyRef} className="sp-milky" /> : null}
      <canvas ref={starsRef} className="sp-stars" />
      <i className="sp-vignette" />
    </div>
  );
}
