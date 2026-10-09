"use client";

import { useEffect, useRef } from "react";

/**
 * O "outro fundo" revelado pela janela do rosto: espaço profundo (teal, azul e magenta da marca), campo de
 * estrelas em canvas (4 camadas com parallax do ponteiro e "voo" em profundidade conforme a janela cresce,
 * twinkle, deriva), faixa de Via Láctea assada em webp (CSS) e vinheta.
 *
 * Engenharia: nenhum estado React (tudo em refs), 1 laço rAF que só roda enquanto o componente
 * está visível e a aba ativa, DPR <= 2, limpeza completa no unmount, prefers-reduced-motion =
 * desenho estático. Lê --hmx/--hmy (ponteiro, -1..1) e --hze (zoom, 0..1+) do [data-hero-root] mais próximo
 * (propriedades registradas sem herança, escritas só na raiz: custo de estilo nulo para o resto da árvore).
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
  par: number; // parallax (fração da largura por unidade de --hmx)
  zoom: number; // quanto a camada se afasta do centro por unidade de --hze (profundidade)
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

// ---------------------------------------------------------------- estrelas
function makeLayer(
  rand: () => number,
  count: number,
  opts: {
    rMin: number; rMax: number; aMin: number; aMax: number; twFrac: number; par: number; speed: number;
    glow?: boolean; band?: { W: number; H: number } | null; zoom: number;
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
    zoom: opts.zoom,
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

  useEffect(() => {
    const root = rootRef.current;
    const cv = starsRef.current;
    if (!root || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
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
    let lastZe = 0;
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
      // 4 camadas em profundidade: ao crescer a janela (--hze) as próximas se afastam do centro mais rápido (voo)
      layers = [
        makeLayer(rand, nFar, { rMin: 0.6, rMax: 1.05, aMin: 0.3, aMax: 0.75, twFrac: 0.3, par: 0.004, speed: 0.00035, zoom: 0.1 }),
        makeLayer(rand, milkyWay ? nBand : 0, { rMin: 0.55, rMax: 0.95, aMin: 0.3, aMax: 0.78, twFrac: 0.3, par: 0.005, speed: 0.00038, band: { W, H }, zoom: 0.14 }),
        makeLayer(rand, nMid, { rMin: 0.95, rMax: 1.7, aMin: 0.5, aMax: 0.95, twFrac: 0.4, par: 0.011, speed: 0.0009, zoom: 0.42 }),
        makeLayer(rand, nNear, { rMin: 1.5, rMax: 3.0, aMin: 0.65, aMax: 1, twFrac: 0.55, par: 0.028, speed: 0.0019, glow: true, zoom: 1.0 }),
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
      if (sizeChanged || layers.length === 0) build();
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
      const mx = reduce ? 0 : readVar("--hmx");
      const my = reduce ? 0 : readVar("--hmy");
      const ze = reduce ? 0 : readVar("--hze");
      // com o ponteiro e o zoom parados e sem forçar, desenha só 1 em cada 3 quadros (twinkle é lento)
      if (!force) {
        const moved = Math.abs(mx - lastMx) + Math.abs(my - lastMy) + Math.abs(ze - lastZe) > 0.0004;
        still = moved ? 0 : still + 1;
        if (still > 20 && frame++ % 3 !== 0) return;
      }
      lastMx = mx;
      lastMy = my;
      lastZe = ze;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const L of layers) {
        if (!L.n) continue;
        const offX = -mx * L.par + t * L.vx;
        const offY = -my * L.par * (W / H) + t * L.vy;
        const zs = 1 + ze * L.zoom; // voo em profundidade: a camada se afasta do centro
        const hw = W / 2;
        const hh = H / 2;
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
              const px = (nx * W - hw) * zs + hw;
              const py = (ny * H - hh) * zs + hh;
              if (px < -8 || py < -8 || px > W + 8 || py > H + 8) continue;
              let a = L.a[i];
              const tw = L.tw[i];
              if (tw > 0 && !reduce) a *= 1 - tw * (0.5 + 0.5 * Math.sin(t * L.sp[i] + L.ph[i]));
              const r = L.r[i] * (1 + (zs - 1) * 0.22);
              ctx.globalAlpha = a;
              if (L.glow) {
                const s = r * 5.6;
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
      {milkyWay ? <div className="sp-milky" /> : null}
      <canvas ref={starsRef} className="sp-stars" />
      <i className="sp-vignette" />
    </div>
  );
}
