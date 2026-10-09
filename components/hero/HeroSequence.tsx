"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import {
  ASTRO,
  CLOSE_SHIFT,
  FACE_CENTER,
  HEAD_CENTER,
  HOLE_PATH,
  POSTER_H,
  POSTER_W,
  WINDOW_ANCHOR,
  WINDOW_R,
} from "./heroGeometry";

/**
 * Abertura (Sessão 1): palco fixo (pinned) conduzido pela rolagem, com suavização.
 *
 *   t = 0         só o degradê vivo; ~0,5 s depois o personagem inteiro surge (CSS, por tempo, um grupo composto só)
 *   p 0 – 0,20    empurrão de câmera + inclinação 3D que segue o ponteiro
 *   p 0,16 – 0,42 a face descola e volta à posição do pôster (abre a janela com o espaço)
 *   p 0,34 – 0,62 a face segue soltando como uma folha em 3D e some
 *   p 0,30 – 0,44 o espaço vivo (e o astronauta) assume o lugar da janela pintada
 *   p 0,34 – 0,52 cubos de vidro em camadas de profundidade
 *   p 0,46 – 0,88 a janela cresce (clip-path = contorno do buraco) até cobrir a tela exatamente (k medido da geometria)
 *   p 0,88 – 1    último plano: o astronauta no espaço vivo, estrelas em profundidade; o Header entra (hero-done)
 *
 * Engenharia: nada de setState por quadro. O progresso bruto vem da posição da seção; o progresso exibido
 * é um lerp (~0,1/quadro) num laço rAF que só roda enquanto há diferença a resolver. Tudo é escrito
 * por style.* em refs (nunca por custom property herdada: isso recalculava o estilo da árvore toda);
 * listeners passivos; pausa fora da tela.
 */

type Props = {
  /** Degradê vivo (LiveGradient, componente de servidor). */
  gradient: ReactNode;
  /** Cubos de vidro atrás do personagem. */
  cubesBack: ReactNode;
  /** Cubos de vidro à frente do personagem. */
  cubesFront: ReactNode;
  /** O "outro fundo" revelado pela janela (SpaceScene). */
  space: ReactNode;
};

// ponto do pôster em torno do qual a câmera empurra: centro da face já fechada
const FOCUS = { x: FACE_CENTER.x + CLOSE_SHIFT.x, y: FACE_CENTER.y + CLOSE_SHIFT.y };

const P_GROW = 0.46; // a janela começa a crescer
const P_COVER = 0.88; // a janela cobre a tela (e o Header entra)

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const eio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// crescimento da janela: quase linear no log (zoom de velocidade constante), com um pouco de ease nas pontas
const grow = (g: number) => 0.6 * g + 0.4 * g * g * (3 - 2 * g);
const n2 = (v: number) => v.toFixed(2);
const n3 = (v: number) => v.toFixed(3);
const n4 = (v: number) => v.toFixed(4);

/** Escala (px de pôster -> px de tela) em que a janela, com a âncora no centro da tela, cobre a viewport inteira. */
function coverScale(W: number, H: number) {
  const N = WINDOW_R.length;
  const cx = W / 2;
  const cy = H / 2;
  const per = 2 * (W + H);
  let k = 0;
  const samples = 120;
  for (let i = 0; i < samples; i++) {
    // pontos ao longo do perímetro da viewport
    let d = (i / samples) * per;
    let x: number;
    let y: number;
    if (d < W) { x = d; y = 0; }
    else if ((d -= W) < H) { x = W; y = d; }
    else if ((d -= H) < W) { x = W - d; y = H; }
    else { d -= W; x = 0; y = H - d; }
    const dx = x - cx;
    const dy = y - cy;
    const a = ((Math.atan2(dy, dx) / (2 * Math.PI)) * N + N) % N;
    const r = Math.min(WINDOW_R[Math.floor(a) % N], WINDOW_R[Math.ceil(a) % N]);
    k = Math.max(k, Math.hypot(dx, dy) / r);
  }
  return k * 1.04;
}

export default function HeroSequence({ gradient, cubesBack, cubesFront, space }: Props) {
  const rootRef = useRef<HTMLElement>(null);

  // recursos críticos: o personagem e a face fechada com prioridade alta; a face nítida só é vista ao descolar
  preload("/hero/character.webp", { as: "image", fetchPriority: "high" });
  preload("/hero/face-closed.webp", { as: "image", fetchPriority: "high" });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement;

    // movimento reduzido: sem pin nem animação (o CSS já mostra o personagem inteiro, estático).
    // O cabeçalho só aparece quando a pessoa já rolou além da primeira tela.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const ioStill = new IntersectionObserver(
        ([en]) => html.classList.toggle("hero-done", !en.isIntersecting || en.intersectionRatio < 0.35),
        { threshold: [0, 0.35, 1] },
      );
      ioStill.observe(root);
      return () => {
        ioStill.disconnect();
        html.classList.remove("hero-done");
      };
    }

    const q = <T extends Element>(sel: string) => root.querySelector(sel) as T;
    const stage = q<HTMLElement>(".hs-stage");
    const worldA = q<HTMLElement>(".hs-world-a");
    const worldB = q<HTMLElement>(".hs-world-b");
    const tiltA = q<HTMLElement>(".hs-world-a .hs-tilt");
    const tiltB = q<HTMLElement>(".hs-world-b .hs-tilt");
    const face = q<HTMLElement>(".hs-facegrp");
    const faceSharp = q<HTMLElement>(".hs-face-sharp");
    const faceClosed = q<HTMLElement>(".hs-face-closed");
    const faceRim = q<HTMLElement>(".hs-face-rim");
    const faceBlur = q<HTMLElement>(".hs-face-blur");
    const shadow = q<HTMLElement>(".hs-shadow");
    const spaceEl = q<HTMLElement>(".hs-space");
    const spaceIn = q<HTMLElement>(".hs-space-in");
    const milky = root.querySelector<HTMLElement>(".sp-milky");
    const astro = q<HTMLElement>(".hs-astro");
    const clipPath = q<SVGPathElement>(".hs-clip-path");
    const rimPath = q<SVGPathElement>(".hs-rim-path");
    const rimSvg = q<SVGElement>(".hs-rim");
    const cubesB = q<HTMLElement>(".hs-cubes-back");
    const cubesF = q<HTMLElement>(".hs-cubes-front");
    const bridge = q<HTMLElement>(".hs-bridge");
    const cue = q<HTMLElement>(".hs-cue");
    if (!stage || !worldA || !worldB || !tiltA || !tiltB || !face || !spaceEl || !clipPath || !astro) return;

    html.classList.add("hero-active");

    // manchas do degradê: parâmetros lidos uma vez do CSS (--par/--px/--py/--ps/--po/--o0); o movimento é escrito direto no
    // invólucro (.lg-p), nunca na elipse com o gradiente caro
    const blobs = Array.from(root.querySelectorAll<HTMLElement>(".lg-p"))
      .map((el) => {
        const cs = getComputedStyle(el);
        const v = (n: string, d = 0) => {
          const x = parseFloat(cs.getPropertyValue(n));
          return Number.isFinite(x) ? x : d;
        };
        return { el, glow: el.classList.contains("lg-glow"), par: v("--par"), px: v("--px"), py: v("--py"), ps: v("--ps"), po: v("--po"), o0: v("--o0", 1) };
      })
      .filter((b) => b.glow || b.par || b.px || b.py || b.ps || b.po);
    // cubos de vidro: profundidade (data-d) para parallax do ponteiro e "voo"
    const cubes = Array.from(root.querySelectorAll<HTMLElement>(".hs-cubes .dw")).map((el) => ({ el, d: parseFloat(el.dataset.d || "1") || 1 }));
    const cubesBackList = cubes.filter((c) => cubesB.contains(c.el));
    const cubesFrontList = cubes.filter((c) => cubesF.contains(c.el));

    // ---------------------------------------------------------------- medidas (só no resize)
    let W = 1, H = 1, bs = 0.5, ox = 0, oy = 0;
    let stageH = 1;
    let portrait = false;
    let zPush = 0.25;
    let kF = 1; // escala final da janela (poster px -> tela px): cobre a viewport exatamente
    let RF = 1;
    let z1 = 1;
    let u = 9, cw = 14.4, ch = 9; // unidades do degradê (1cqmax, 1cqw, 1cqh), em px

    const measure = () => {
      W = stage.clientWidth || 1;
      H = stage.clientHeight || 1;
      stageH = H;
      const cs = getComputedStyle(worldA); // valores usados, fracionários (offsetWidth arredonda)
      bs = parseFloat(cs.width) / POSTER_W || 0.5;
      ox = parseFloat(cs.left) || 0;
      oy = parseFloat(cs.top) || 0;
      portrait = W < H;
      zPush = portrait ? 0.12 : 0.25;
      z1 = (1 + zPush + 0.05) * 1.6; // zoom da câmera quando a janela já cresceu por inteiro (e = 1)
      kF = coverScale(W, H);
      RF = Math.max(1, kF / (z1 * bs));
      u = Math.max(W, H) / 100;
      cw = W / 100;
      ch = H / 100;
      const camO = `${n3(FOCUS.x * bs)}px ${n3(FOCUS.y * bs)}px`;
      worldA.style.transformOrigin = camO;
      worldB.style.transformOrigin = camO;
      const headO = `${n3(HEAD_CENTER.x * bs)}px ${n3(HEAD_CENTER.y * bs)}px`;
      tiltA.style.transformOrigin = headO;
      tiltB.style.transformOrigin = headO;
      const faceO = `${n3(FACE_CENTER.x * bs)}px ${n3(FACE_CENTER.y * bs)}px`;
      tiltB.style.perspective = `${n3(1900 * bs)}px`;
      tiltB.style.perspectiveOrigin = faceO;
      face.style.transformOrigin = faceO;
      shadow.style.transformOrigin = faceO;
    };

    // ---------------------------------------------------------------- estado
    let target = 0; // progresso bruto (posição da seção)
    let cur = 0; // progresso exibido (lerp)
    let tx = 0, ty = 0, cx = 0, cy = 0; // ponteiro bruto e suavizado, -1..1
    let raf = 0;
    let last = 0;
    let visible = true;
    let lastMx = NaN, lastMy = NaN, lastP = NaN;
    const flags = { space: false, covered: false, done: false, cubes: false, cubesB: false, cubesF: false, face: true, rim: -1, char: -1, closed: -1, calm: false };

    const readTarget = () => {
      const r = root.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - stageH));
    };

    // ---------------------------------------------------------------- um quadro
    const render = (p: number, mx: number, my: number) => {
      const g = clamp((p - P_GROW) / (P_COVER - P_GROW)); // crescimento da janela
      const e = grow(g);

      // --- câmera: empurrão (0–0,2), leve deriva até 0,5; depois acompanha o crescimento da janela
      const push = eio(clamp(p / 0.2));
      const zBase = 1 + zPush * push + 0.05 * sm(0.2, 0.5, p);
      // a câmera acompanha o conjunto rosto+cabeça enquanto a face se desloca para a esquerda
      const panBump = sm(0.16, 0.42, p) * (1 - sm(0.4, 0.62, p));
      const z = zBase * (1 + 0.6 * e) * (portrait ? 1 - 0.09 * panBump : 1);
      const panX = panBump * (portrait ? 1.3 : 0.5) * CLOSE_SHIFT.x * bs * z;

      // --- ponteiro: inclinação 3D (±3°) e deslocamento (±12 px); some antes de a janela abrir
      const amp = 1 - sm(0.34, 0.46, p);
      const mxA = mx * amp;
      const myA = my * amp;
      const parX = -mxA * 12;
      const parY = -myA * 9;
      const worldTf = `translate3d(${n3(panX + parX)}px,${n3(parY)}px,0) scale(${n4(z)})`;
      worldA.style.transform = worldTf;
      worldB.style.transform = worldTf;
      const tiltTf = `perspective(${n3(2000 * bs)}px) rotateX(${n3(-myA * 2.2)}deg) rotateY(${n3(mxA * 3)}deg)`;
      tiltA.style.transform = tiltTf;
      tiltB.style.transform = tiltTf;
      // o personagem escala junto com a janela e some quando ela toma a tela
      const charOp = 1 - sm(0.55, 1, e);
      if (charOp !== flags.char) {
        flags.char = charOp;
        tiltA.style.opacity = n3(charOp);
      }

      // --- a face: descola (u1) e depois se solta como uma folha em 3D (u2)
      const u1 = eio(clamp((p - 0.16) / 0.26));
      const u2 = Math.pow(sm(0.34, 0.62, p), 1.15);
      // retrato: a folha sobe e recua em vez de varrer a tela para a esquerda (nunca encosta na borda)
      const lx = portrait ? 70 : 560;
      const ly = portrait ? 520 : 130;
      const lz = portrait ? 440 : 260;
      const dx = CLOSE_SHIFT.x * (1 - u1) - lx * u2;
      const dy = CLOSE_SHIFT.y * (1 - u1) - ly * u2;
      const dz = 50 * u1 + lz * u2;
      const fpx = (-mxA * 11 * u1) / z;
      const fpy = (-myA * 8 * u1) / z;
      const faceVis = u2 < 0.999;
      if (faceVis !== flags.face) {
        flags.face = faceVis;
        face.style.visibility = faceVis ? "" : "hidden";
        shadow.style.visibility = faceVis ? "" : "hidden";
      }
      if (faceVis) {
        face.style.transform =
          `translate3d(${n3(dx * bs + fpx)}px,${n3(dy * bs + fpy)}px,${n3(dz * bs)}px) rotateZ(${n3(-5 * u2)}deg) rotateY(${n3(-28 * u2)}deg)`;
        const sx = (CLOSE_SHIFT.x * (1 - u1) + 26 * u1 - lx * 0.71 * u2) * bs + fpx;
        const sy = (CLOSE_SHIFT.y * (1 - u1) + 46 * u1 - ly * 0.6 * u2) * bs + fpy;
        shadow.style.transform = `translate3d(${n3(sx)}px,${n3(sy)}px,0) rotateZ(${n3(-3 * u2)}deg) scale(${n4(1 + 0.07 * u2)})`;
        // camadas (de baixo para cima): desfocada, nítida, contorno rosa, "fechada". A desfocada entra rápido por BAIXO
        // da nítida; assim o alfa total da folha fica ~1 até ela realmente sumir (nada de rosto fantasma).
        const blurOp = sm(0, 0.3, u2) * (1 - sm(0.55, 0.97, u2));
        const sharp = 1 - sm(0.3, 0.65, u2);
        const closedOp = 1 - sm(0.02, 0.2, u1); // a variante "fechada" (bordas fundidas no cabelo) cede à nítida ao descolar
        faceSharp.style.opacity = n3(sharp);
        faceBlur.style.opacity = n3(blurOp);
        faceRim.style.opacity = n3(sm(0.2, 0.85, u1) * sharp);
        if (closedOp !== flags.closed) {
          flags.closed = closedOp;
          faceClosed.style.opacity = n3(closedOp);
        }
        shadow.style.opacity = n3(sm(0, 0.5, u1) * (1 - sm(0.45, 0.9, u2)));
      }

      // --- cubos de vidro: entram entre 0,34 e 0,52 e voam para fora com a janela; os da frente saem cedo (e, no retrato,
      //     só entram depois que a face já se afastou, para nunca cobrirem o rosto)
      const cIn = sm(0.34, 0.52, p);
      const cOpB = cIn * (1 - sm(0.66, 0.84, p));
      const cInF = portrait ? sm(0.5, 0.6, p) : cIn;
      const cOpF = cInF * (1 - sm(0.52, 0.64, p));
      const visB = cOpB > 0.002;
      const visF = cOpF > 0.002;
      if (visB !== flags.cubesB) {
        flags.cubesB = visB;
        cubesB.style.visibility = visB ? "visible" : "hidden";
      }
      if (visF !== flags.cubesF) {
        flags.cubesF = visF;
        cubesF.style.visibility = visF ? "visible" : "hidden";
      }
      const cOn = visB || visF;
      if (cOn !== flags.cubes) {
        flags.cubes = cOn;
        root.classList.toggle("hs-cubes-on", cOn);
      }
      // sobem ao aparecer e se afastam do centro com a janela (o "voo" é maior nos cubos mais próximos)
      const ee = e * 0.6;
      if (visB) {
        cubesB.style.opacity = n3(cOpB);
        cubesB.style.transform = `translate3d(0,${n3((1 - cIn) * 36)}px,0) scale(${n4(1 + 0.9 * e)})`;
        for (const c of cubesBackList) c.el.style.transform = `translate3d(${n2(-mx * c.d * 34)}px,${n2(-my * c.d * 26)}px,0) scale(${n3(1 + ee * c.d * 0.9)})`;
      }
      if (visF) {
        cubesF.style.opacity = n3(cOpF);
        cubesF.style.transform = `translate3d(0,${n3((1 - cInF) * 36)}px,0) scale(${n4(1 + 0.9 * e)})`;
        for (const c of cubesFrontList) c.el.style.transform = `translate3d(${n2(-mx * c.d * 34)}px,${n2(-my * c.d * 26)}px,0) scale(${n3(1 + ee * c.d * 0.9)})`;
      }

      // --- a janela: o contorno do buraco cresce em torno da âncora (zoom exponencial)
      const spaceOn = p > 0.26;
      const covered = p >= P_COVER;
      if (spaceOn !== flags.space) {
        flags.space = spaceOn;
        root.classList.toggle("hs-space-on", spaceOn);
      }
      if (covered !== flags.covered) {
        flags.covered = covered;
        root.classList.toggle("hs-covered", covered);
      }
      const rimOp = spaceOn && !covered ? sm(0.4, 0.54, p) * (1 - sm(0.1, 0.7, e)) : 0;
      if (rimOp !== flags.rim) {
        flags.rim = rimOp;
        rimSvg.style.opacity = n3(rimOp);
      }
      if (spaceOn) {
        const s = z * bs;
        const k = s * Math.pow(RF, e);
        const ax = ox + FOCUS.x * bs + z * (WINDOW_ANCHOR.x * bs - FOCUS.x * bs) + panX + parX;
        const ay = oy + FOCUS.y * bs + z * (WINDOW_ANCHOR.y * bs - FOCUS.y * bs) + parY;
        const hx = ax + (W / 2 - ax) * e;
        const hy = ay + (H / 2 - ay) * e;
        if (!covered) {
          const tf = `translate(${n3(hx - WINDOW_ANCHOR.x * k)} ${n3(hy - WINDOW_ANCHOR.y * k)}) scale(${n4(k)})`;
          clipPath.setAttribute("transform", tf);
          rimPath.setAttribute("transform", tf);
          spaceEl.style.opacity = n3(sm(0.3, 0.44, p));
        }
        spaceIn.style.transform = `scale(${n4(1 + 0.12 * e)})`;
        // o astronauta nasce exatamente onde está o pintado e então flutua para o primeiro plano do espaço vivo
        const beat = sm(P_COVER, 1, p);
        const mv = sm(0.12, 0.85, e);
        const mapX = hx + (ASTRO.cx - WINDOW_ANCHOR.x) * k;
        const mapY = hy + (ASTRO.cy - WINDOW_ANCHOR.y) * k;
        const endX = W * (portrait ? 0.56 : 0.64);
        const endY = H * (portrait ? 0.47 : 0.5);
        const sa0 = s;
        const saEnd = Math.min(H * (portrait ? 0.19 : 0.27) / ASTRO.h, 2.2);
        const sa = (sa0 + (saEnd - sa0) * sm(0, 0.9, e)) * (1 + 0.14 * beat);
        const axp = mapX + (endX - mapX) * mv - mx * 14 * mv;
        const ayp = mapY + (endY - mapY) * mv - my * 10 * mv - 22 * beat;
        astro.style.transform = `translate(${n2(axp - (ASTRO.w / 2) * sa)}px,${n2(ayp - (ASTRO.h / 2) * sa)}px) scale(${n4(sa)})`;
        if (milky) milky.style.translate = `${n2(mx * -1.6)}% ${n2(my * -1.6)}%`;
      }

      // --- degradê vivo: parallax do ponteiro + deslocamento da rolagem, escritos direto nas manchas
      if (p !== lastP || mx !== lastMx || my !== lastMy) {
        if (p < P_COVER) {
          for (const b of blobs) {
            const st = b.el.style;
            if (b.glow) {
              st.translate = `${n2(mx * 50 * cw)}px ${n2(my * 50 * ch)}px`;
              continue;
            }
            st.translate = `${n2((-mx * b.par + p * b.px) * u)}px ${n2((-my * b.par + p * b.py) * u)}px`;
            if (b.ps) st.scale = n4(1 + p * b.ps);
            if (b.po) st.opacity = n3(clamp(b.o0 + p * b.po));
          }
        }
        lastP = p;
        lastMx = mx;
        lastMy = my;
      }

      // --- pista de rolagem, cabeçalho, ponte para a próxima seção e variáveis lidas só pelo espaço
      cue.style.opacity = n3(1 - sm(0, 0.04, p));
      bridge.style.opacity = n3(sm(0.9, 1, p));
      const done = p >= P_COVER;
      if (done !== flags.done) {
        flags.done = done;
        html.classList.toggle("hero-done", done);
      }
      // (registradas sem herança em hero.css: escrever na raiz não recalcula a árvore)
      root.style.setProperty("--hp", n4(p));
      root.style.setProperty("--hmx", n4(mx));
      root.style.setProperty("--hmy", n4(my));
      root.style.setProperty("--hze", n3(e * 0.8 + 0.5 * sm(P_COVER, 1, p)));
    };

    // ---------------------------------------------------------------- laço (só roda enquanto há o que resolver)
    const tick = (now: number) => {
      raf = 0;
      const dt = last ? clamp(now - last, 1, 50) : 16.7;
      last = now;
      const kp = 1 - Math.pow(0.9, dt / 16.667);
      const kq = 1 - Math.pow(0.92, dt / 16.667);
      cur += (target - cur) * kp;
      if (Math.abs(target - cur) < 0.0005) cur = target;
      cx += (tx - cx) * kq;
      cy += (ty - cy) * kq;
      if (Math.abs(tx - cx) + Math.abs(ty - cy) < 0.0008) {
        cx = tx;
        cy = ty;
      }
      render(cur, cx, cy);
      if (cur !== target || cx !== tx || cy !== ty) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };

    // o degradê para de derivar quando a pessoa fica parada; volta a se mover com o mouse ou a rolagem
    let calmT = 0;
    let lastWake = -1e9;
    const wake = () => {
      const now = performance.now();
      if (!flags.calm && now - lastWake < 400) return;
      lastWake = now;
      if (flags.calm) {
        flags.calm = false;
        root.classList.remove("hs-calm");
      }
      window.clearTimeout(calmT);
      calmT = window.setTimeout(() => {
        flags.calm = true;
        root.classList.add("hs-calm");
      }, 7000);
    };

    const onScroll = () => {
      if (!visible) return;
      target = readTarget();
      wake();
      kick();
    };
    const onPointer = (ev: PointerEvent) => {
      if (ev.pointerType === "touch") return; // toque não "inclina" a cabeça nem deixa o ponteiro preso
      tx = clamp((ev.clientX / window.innerWidth - 0.5) * 2, -1, 1);
      ty = clamp((ev.clientY / window.innerHeight - 0.5) * 2, -1, 1);
      wake();
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };

    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      target = readTarget();
      if (visible) {
        cur = target; // volta à tela já no estado certo, sem "correr" do ponto antigo
        kick();
      } else {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
        cur = target; // fora da tela o estado final é 0 ou 1
        render(cur, cx, cy);
      }
    });
    const ro = new ResizeObserver(() => {
      measure();
      target = readTarget();
      lastP = NaN;
      render(cur, cx, cy);
    });

    measure();
    target = readTarget();
    cur = target;
    render(cur, 0, 0);
    ro.observe(stage);
    io.observe(root);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave, { passive: true });
    wake();

    // o personagem só "nasce" quando as imagens estão decodificadas (a animação em si é CSS, por tempo).
    // Recarregou no meio da sequência: já aparece montado, sem fade. JS lento (>2,6 s): a rede de segurança do CSS já corre.
    let ready = false;
    const go = () => {
      if (ready) return;
      ready = true;
      if (performance.now() < 2600) root.classList.add("is-in");
    };
    if (target > 0.02) {
      root.classList.add("is-resumed");
      ready = true;
    } else {
      const imgs = Array.from(root.querySelectorAll<HTMLImageElement>(".hs-world-a img, .hs-face-closed"));
      Promise.all(imgs.map((im) => im.decode().catch(() => undefined))).then(go);
    }
    const tGo = window.setTimeout(go, 2500);
    // depois da entrada, aquece o espaço (tamanho, estrelas, Via Láctea) e ele sai de cena até a janela precisar dele
    const tWarmOn = window.setTimeout(() => root.classList.add("hs-warm"), 2300);
    const tWarmOff = window.setTimeout(() => root.classList.remove("hs-warm"), 4800);

    return () => {
      window.clearTimeout(tGo);
      window.clearTimeout(tWarmOn);
      window.clearTimeout(tWarmOff);
      window.clearTimeout(calmT);
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      html.classList.remove("hero-active", "hero-done");
    };
  }, []);

  return (
    <section
      ref={rootRef}
      id="top"
      className="hero-seq"
      data-hero-root
      aria-label="Abertura: retrato de um homem de olhos fechados; o rosto se desprende da cabeça e revela uma janela para o espaço"
    >
      <h1 className="hs-sr">Trills — produtora audiovisual com foco em pós-produção</h1>

      <svg className="hs-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="hs-window" clipPathUnits="userSpaceOnUse">
            <path className="hs-clip-path" d={HOLE_PATH} />
          </clipPath>
        </defs>
      </svg>

      <div className="hs-stage">
        <div className="hs-under">
          {gradient}
          <div className="hs-cubes hs-cubes-back" aria-hidden="true">{cubesBack}</div>
        </div>

        {/* personagem + janela + espaço + face: um só grupo composto (a entrada faz fade dele inteiro) */}
        <div className="hs-actor">
          <div className="hs-world hs-world-a">
            <div className="hs-tilt">
              <img className="hs-layer" src="/hero/character.webp" alt="" width={POSTER_W} height={POSTER_H} fetchPriority="high" decoding="async" draggable={false} />
            </div>
          </div>

          <div className="hs-space" aria-hidden="true">
            <div className="hs-space-in">{space}</div>
            <div className="hs-astro">
              <img src="/hero/astro.webp" alt="" width={330} height={450} fetchPriority="low" decoding="async" draggable={false} />
            </div>
          </div>
          <svg className="hs-rim" aria-hidden="true" focusable="false">
            <path className="hs-rim-path" d={HOLE_PATH} />
          </svg>

          <div className="hs-world hs-world-b">
            <div className="hs-tilt">
              <img className="hs-layer hs-shadow" src="/hero/face-shadow.webp" alt="" fetchPriority="low" decoding="async" draggable={false} />
              <div className="hs-facegrp">
                <img className="hs-layer hs-face-blur" src="/hero/face-blur.webp" alt="" fetchPriority="low" decoding="async" draggable={false} />
                <img className="hs-layer hs-face-sharp" src="/hero/face.webp" alt="" width={POSTER_W} height={POSTER_H} fetchPriority="low" decoding="async" draggable={false} />
                <img className="hs-layer hs-face-rim" src="/hero/face-rim.webp" alt="" width={POSTER_W} height={POSTER_H} fetchPriority="low" decoding="async" draggable={false} />
                <img className="hs-layer hs-face-closed" src="/hero/face-closed.webp" alt="" width={POSTER_W} height={POSTER_H} fetchPriority="high" decoding="async" draggable={false} />
              </div>
            </div>
          </div>
        </div>

        <div className="hs-cubes hs-cubes-front" aria-hidden="true">{cubesFront}</div>
        <div className="hs-bridge" aria-hidden="true" />
        <div className="hs-cue" aria-hidden="true" />
      </div>
    </section>
  );
}
