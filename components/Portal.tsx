"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

// Silhueta provisória (perfil). Será trocada pelo contorno do rosto do personagem real.
// viewBox 1000×1000; âncora = ponto dentro da cabeça em torno do qual a janela cresce.
const HEAD =
  "M 380 1000 C 400 900 420 840 430 770 C 380 720 345 640 350 540 C 355 400 430 270 560 225 " +
  "C 680 185 790 215 850 300 C 880 345 890 390 895 430 C 905 450 925 485 950 530 " +
  "C 962 553 965 575 948 588 C 935 596 915 598 900 600 C 905 612 910 622 912 632 " +
  "C 925 640 925 652 910 656 C 920 666 918 680 902 688 C 906 712 898 735 872 752 " +
  "C 850 790 800 820 760 830 C 748 860 750 900 770 930 C 840 955 920 975 1000 990 L 1000 1000 Z";
const AX = 610;
const AY = 520;

export default function Portal({ base, reveal }: { base: ReactNode; reveal: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const clip = useRef<SVGPathElement>(null);
  const rim = useRef<SVGPathElement>(null);
  const revealEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const clipPath = clip.current;
    const rimPath = rim.current;
    const rev = revealEl.current;
    if (!el || !clipPath || !rimPath || !rev) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let visible = true;
    let scrollQueued = false;
    let lastFull = false;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    const update = () => {
      scrollQueued = false;
      if (!visible) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      const total = Math.max(1, r.height - vh);
      const p = reduce ? 0 : Math.min(1, Math.max(0, -r.top / total));
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const mobile = vw < 820;
      const s0 = mobile ? vw * 1.25 : Math.min(vh * 1.08, vw * 0.8);
      const s1 = 3.8 * Math.hypot(vw, vh);
      const S = s0 * Math.pow(s1 / s0, e); // zoom exponencial: crescimento natural
      const ax0 = mobile ? vw * 0.5 : vw * 0.7;
      const ay0 = mobile ? vh * 0.8 : vh * 0.52;
      const ax = ax0 + (vw * 0.5 - ax0) * e;
      const ay = ay0 + (vh * 0.5 - ay0) * e;
      const k = S / 1000;
      const t = `translate(${ax - AX * k} ${ay - AY * k}) scale(${k})`;
      clipPath.setAttribute("transform", t);
      rimPath.setAttribute("transform", t);
      el.style.setProperty("--e", e.toFixed(4));
      const full = e > 0.985;
      if (full !== lastFull) {
        lastFull = full;
        rev.style.clipPath = full ? "none" : "url(#headClip)";
        rev.style.pointerEvents = full ? "auto" : "none";
      }
    };
    const queue = () => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(update);
      }
    };

    // parallax do mouse suavizado (lerp); o loop só roda enquanto há diferença
    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty("--mx", cx.toFixed(4));
      el.style.setProperty("--my", cy.toFixed(4));
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (ev: PointerEvent) => {
      if (reduce) return;
      tx = (ev.clientX / window.innerWidth - 0.5) * 2;
      ty = (ev.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) queue();
    });
    io.observe(el);
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    window.addEventListener("pointermove", onMove, { passive: true });
    update();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const initial = "translate(415 -37) scale(0.972)";
  return (
    <section ref={root} className="portal" aria-label="Apresentação">
      <svg className="portal-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="headClip" clipPathUnits="userSpaceOnUse">
            <path ref={clip} d={HEAD} transform={initial} />
          </clipPath>
        </defs>
      </svg>
      <div className="portal-stick">
        <div className="portal-base">{base}</div>
        <div ref={revealEl} className="portal-reveal" style={{ clipPath: "url(#headClip)" }}>
          {reveal}
        </div>
        <svg className="portal-rim" width="100%" height="100%" aria-hidden="true" focusable="false">
          <path ref={rim} d={HEAD} transform={initial} />
        </svg>
      </div>
    </section>
  );
}
