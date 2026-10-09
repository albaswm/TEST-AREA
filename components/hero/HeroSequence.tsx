"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import {
  CLOSE_SHIFT,
  FACE_CENTER,
  HEAD_CENTER,
  HOLE_PATH,
  POSTER_H,
  POSTER_W,
  WINDOW_ANCHOR,
  WINDOW_INRADIUS,
} from "./heroGeometry";

/**
 * Abertura (Sessão 1): palco fixo (pinned) conduzido pela rolagem, com suavização.
 *
 *   t = 0         só o degradê vivo; ~0,5 s depois o personagem inteiro surge (CSS, por tempo)
 *   p 0 – 0,20    empurrão de câmera + inclinação 3D que segue o ponteiro
 *   p 0,18 – 0,42 a face descola e volta à posição do pôster (abre a janela com o espaço)
 *   p 0,34 – 0,64 a face segue soltando como uma folha em 3D e some
 *   p 0,35 – 0,55 cubos de vidro em camadas de profundidade
 *   p 0,50 – 0,92 a janela cresce (clip-path = contorno do buraco) e revela o espaço em tela cheia
 *   p 0,90 – 1    o Header entra (classe hero-done em <html>)
 *
 * Engenharia: nada de setState por quadro. O progresso bruto vem da posição da seção; o progresso exibido
 * é um lerp (~0,1/quadro) num laço rAF que só roda enquanto há diferença a resolver. Tudo é escrito
 * por style.setProperty / style.transform em refs; listeners passivos; pausa fora da tela.
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

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const eio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eioQ = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const n3 = (v: number) => v.toFixed(3);
const n4 = (v: number) => v.toFixed(4);

export default function HeroSequence({ gradient, cubesBack, cubesFront, space }: Props) {
  const rootRef = useRef<HTMLElement>(null);

  // recursos críticos: o personagem com prioridade alta, a face logo em seguida
  preload("/hero/character.webp", { as: "image", fetchPriority: "high" });
  preload("/hero/face.webp", { as: "image" });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // movimento reduzido: sem pin nem animação (o CSS já mostra o personagem inteiro, estático)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const html = document.documentElement;
    const q = <T extends Element>(sel: string) => root.querySelector(sel) as T;
    const stage = q<HTMLElement>(".hs-stage");
    const worldA = q<HTMLElement>(".hs-world-a");
    const worldB = q<HTMLElement>(".hs-world-b");
    const tiltA = q<HTMLElement>(".hs-world-a .hs-tilt");
    const tiltB = q<HTMLElement>(".hs-world-b .hs-tilt");
    const face = q<HTMLElement>(".hs-facegrp");
    const faceSharp = q<HTMLElement>(".hs-face-sharp");
    const faceRim = q<HTMLElement>(".hs-face-rim");
    const faceBlur = q<HTMLElement>(".hs-face-blur");
    const shadow = q<HTMLElement>(".hs-shadow");
    const spaceEl = q<HTMLElement>(".hs-space");
    const spaceIn = q<HTMLElement>(".hs-space-in");
    const clipPath = q<SVGPathElement>(".hs-clip-path");
    const rimPath = q<SVGPathElement>(".hs-rim-path");
    const rimSvg = q<SVGElement>(".hs-rim");
    const cubesB = q<HTMLElement>(".hs-cubes-back");
    const cubesF = q<HTMLElement>(".hs-cubes-front");
    const cue = q<HTMLElement>(".hs-cue");
    if (!stage || !worldA || !worldB || !tiltA || !tiltB || !face || !spaceEl || !clipPath) return;

    html.classList.add("hero-active");

    // ---------------------------------------------------------------- medidas (só no resize)
    let W = 1, H = 1, bs = 0.5, ox = 0, oy = 0;
    let stageH = 1;
    let portrait = false;
    let zPush = 0.25;
    let kF = 1; // escala final da janela (poster px -> tela px), garante cobrir a viewport
    let RF = 1;
    let z0 = 1;

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
      z0 = 1 + zPush + 0.05;
      kF = (1.1 * Math.hypot(W, H)) / 2 / WINDOW_INRADIUS;
      RF = Math.max(1, kF / (z0 * bs));
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
    const flags = { space: false, covered: false, done: false, cubes: false, face: true, rim: -1, char: -1 };

    const readTarget = () => {
      const r = root.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - stageH));
    };

    // ---------------------------------------------------------------- um quadro
    const render = (p: number, mx: number, my: number) => {
      const g = clamp((p - 0.5) / 0.42); // crescimento da janela (0,50 a 0,92), linear
      const e = eioQ(g);

      // --- câmera: empurrão (0–0,2), leve deriva até 0,5; depois acompanha o crescimento da janela
      const push = eio(clamp(p / 0.2));
      const zBase = 1 + zPush * push + 0.05 * sm(0.2, 0.5, p);
      // a câmera acompanha o conjunto rosto+cabeça enquanto a face se desloca para a esquerda
      const panBump = sm(0.18, 0.42, p) * (1 - sm(0.4, 0.62, p));
      const z = zBase * (1 + 0.6 * e) * (portrait ? 1 - 0.09 * panBump : 1);
      const panX = panBump * 0.5 * CLOSE_SHIFT.x * bs * z;

      // --- ponteiro: inclinação 3D (±2°) e deslocamento (±8 px); some antes de a janela abrir
      const amp = 1 - sm(0.34, 0.46, p);
      const mxA = mx * amp;
      const myA = my * amp;
      const parX = -mxA * 8;
      const parY = -myA * 6;
      const worldTf = `translate3d(${n3(panX + parX)}px,${n3(parY)}px,0) scale(${n4(z)})`;
      worldA.style.transform = worldTf;
      worldB.style.transform = worldTf;
      const tiltTf = `perspective(${n3(2000 * bs)}px) rotateX(${n3(-myA * 1.6)}deg) rotateY(${n3(mxA * 2)}deg)`;
      tiltA.style.transform = tiltTf;
      tiltB.style.transform = tiltTf;
      // o personagem escala junto com a janela e some quando ela toma a tela
      const charOp = 1 - sm(0.55, 1, e);
      if (charOp !== flags.char) {
        flags.char = charOp;
        tiltA.style.opacity = n3(charOp);
      }

      // --- a face: descola (u1) e depois se solta como uma folha em 3D (u2)
      const u1 = eio(clamp((p - 0.18) / 0.24));
      const u2 = Math.pow(sm(0.34, 0.64, p), 1.15);
      const lx = portrait ? 260 : 560;
      const ly = portrait ? 420 : 200;
      const lz = portrait ? 360 : 260;
      const dx = CLOSE_SHIFT.x * (1 - u1) - lx * u2;
      const dy = CLOSE_SHIFT.y * (1 - u1) - ly * u2;
      const dz = 50 * u1 + lz * u2;
      const fpx = (-mxA * 7 * u1) / z;
      const fpy = (-myA * 5 * u1) / z;
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
        const fadeBlur = sm(0.25, 0.6, u2);
        const sharp = 1 - fadeBlur;
        faceSharp.style.opacity = n3(sharp);
        faceBlur.style.opacity = n3(fadeBlur * (1 - sm(0.5, 0.95, u2)));
        faceRim.style.opacity = n3(sm(0.2, 0.85, u1) * sharp);
        shadow.style.opacity = n3(sm(0, 0.5, u1) * (1 - sm(0.45, 0.9, u2)));
      }

      // --- cubos de vidro: aparecem entre 0,35 e 0,55 e voam para fora com a janela
      const cIn = sm(0.35, 0.55, p);
      const cOp = cIn * (1 - sm(0.66, 0.84, p));
      const cVis = cOp > 0.002;
      if (cVis !== flags.cubes) {
        flags.cubes = cVis;
        const v = cVis ? "visible" : "hidden";
        cubesB.style.visibility = v;
        cubesF.style.visibility = v;
      }
      if (cVis) {
        // sobem ao aparecer e se afastam do centro com a janela (o --e dá mais "voo" aos cubos mais próximos)
        const rise = `translate3d(0,${n3((1 - cIn) * 36)}px,0) scale(${n4(1 + 0.9 * e)})`;
        cubesB.style.opacity = n3(cOp);
        cubesF.style.opacity = n3(cOp);
        cubesB.style.transform = rise;
        cubesF.style.transform = rise;
        const ee = n3(e * 0.6);
        cubesB.style.setProperty("--e", ee);
        cubesF.style.setProperty("--e", ee);
      }

      // --- a janela: o contorno do buraco cresce em torno da âncora (zoom exponencial)
      const spaceOn = p > 0.4;
      const covered = p >= 0.95;
      if (spaceOn !== flags.space) {
        flags.space = spaceOn;
        root.classList.toggle("hs-space-on", spaceOn);
      }
      if (covered !== flags.covered) {
        flags.covered = covered;
        root.classList.toggle("hs-covered", covered);
      }
      if (spaceOn && !covered) {
        const s = z * bs;
        const k = s * Math.pow(RF, e);
        const ax = ox + FOCUS.x * bs + z * (WINDOW_ANCHOR.x * bs - FOCUS.x * bs) + panX + parX;
        const ay = oy + FOCUS.y * bs + z * (WINDOW_ANCHOR.y * bs - FOCUS.y * bs) + parY;
        const hx = ax + (W / 2 - ax) * e;
        const hy = ay + (H / 2 - ay) * e;
        const tf = `translate(${n3(hx - WINDOW_ANCHOR.x * k)} ${n3(hy - WINDOW_ANCHOR.y * k)}) scale(${n4(k)})`;
        clipPath.setAttribute("transform", tf);
        rimPath.setAttribute("transform", tf);
        const rimOp = sm(0.46, 0.58, p) * (1 - sm(0.1, 0.7, e));
        if (rimOp !== flags.rim) {
          flags.rim = rimOp;
          rimSvg.style.opacity = n3(rimOp);
        }
        spaceEl.style.opacity = n3(sm(0.46, 0.6, p));
        spaceIn.style.transform = `scale(${n4(1 + 0.12 * e)})`;
      }

      // --- pista de rolagem, cabeçalho e variáveis lidas pelo degradê / espaço
      cue.style.opacity = n3(1 - sm(0, 0.04, p));
      const done = p >= 0.9;
      if (done !== flags.done) {
        flags.done = done;
        html.classList.toggle("hero-done", done);
      }
      root.style.setProperty("--p", n4(p));
      root.style.setProperty("--mx", n4(mx));
      root.style.setProperty("--my", n4(my));
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

    const onScroll = () => {
      if (!visible) return;
      target = readTarget();
      kick();
    };
    const onPointer = (ev: PointerEvent) => {
      tx = clamp((ev.clientX / window.innerWidth - 0.5) * 2, -1, 1);
      ty = clamp((ev.clientY / window.innerHeight - 0.5) * 2, -1, 1);
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

    // o personagem só "nasce" quando as imagens estão decodificadas (a animação em si é CSS, por tempo)
    let ready = false;
    const go = () => {
      if (ready) return;
      ready = true;
      root.classList.add("is-in");
    };
    const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
    Promise.all(imgs.map((im) => im.decode().catch(() => undefined))).then(go);
    const tGo = window.setTimeout(go, 3000);
    // depois de aquecido (tamanho e estrelas calculados), o espaço sai de cena até a janela precisar dele
    const tWarm = window.setTimeout(() => root.classList.remove("hs-warm"), 2200);

    return () => {
      window.clearTimeout(tGo);
      window.clearTimeout(tWarm);
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
      className="hero-seq hs-warm"
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
          <div className="hs-world hs-world-a">
            <div className="hs-tilt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hs-layer" src="/hero/character.webp" alt="" width={POSTER_W} height={POSTER_H} fetchPriority="high" decoding="async" draggable={false} />
            </div>
          </div>
        </div>

        <div className="hs-space" aria-hidden="true">
          <div className="hs-space-in">{space}</div>
        </div>
        <svg className="hs-rim" aria-hidden="true" focusable="false">
          <path className="hs-rim-path" d={HOLE_PATH} />
        </svg>

        <div className="hs-world hs-world-b">
          <div className="hs-tilt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hs-layer hs-shadow" src="/hero/face-shadow.webp" alt="" decoding="async" draggable={false} />
            <div className="hs-facegrp">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hs-layer hs-face-sharp" src="/hero/face.webp" alt="" width={POSTER_W} height={POSTER_H} decoding="async" draggable={false} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hs-layer hs-face-rim" src="/hero/face-rim.webp" alt="" width={POSTER_W} height={POSTER_H} decoding="async" draggable={false} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hs-layer hs-face-blur" src="/hero/face-blur.webp" alt="" decoding="async" draggable={false} />
            </div>
          </div>
        </div>

        <div className="hs-cubes hs-cubes-front" aria-hidden="true">{cubesFront}</div>
        <div className="hs-cue" aria-hidden="true" />
      </div>
    </section>
  );
}
