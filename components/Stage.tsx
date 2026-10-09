"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import type { Scene } from "@/data/content";
import GradientField from "./GradientField";

type Phase = "idle" | "in" | "out";

// atrasos fixos (não aleatórios) para não gerar diferença entre servidor e cliente
const STRIP_DELAYS = [40, 210, 120, 260, 10, 180, 90, 240, 150, 60] as const;
const SWAP_MS = 800;
const DONE_MS = 1650;
const AUTO_MS = 7000;

export default function Stage({ scenes }: { scenes: readonly Scene[] }) {
  const [cur, setCur] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [wipeColor, setWipeColor] = useState(scenes[0].wipe);
  const [inView, setInView] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const curRef = useRef(0);
  const busy = useRef(false);
  const reduce = useRef(false);
  const timers = useRef<number[]>([]);
  const x0 = useRef<number | null>(null);

  const go = useCallback(
    (target: number) => {
      const n = (target + scenes.length) % scenes.length;
      if (busy.current || n === curRef.current) return;
      if (reduce.current) {
        curRef.current = n;
        setCur(n);
        return;
      }
      busy.current = true;
      setWipeColor(scenes[n].wipe);
      setPhase("in");
      timers.current.push(
        window.setTimeout(() => {
          curRef.current = n;
          setCur(n);
          setPhase("out");
        }, SWAP_MS),
        window.setTimeout(() => {
          setPhase("idle");
          busy.current = false;
        }, DONE_MS),
      );
    },
    [scenes],
  );

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setInView(en.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reduce.current) return;
    const t = window.setTimeout(() => go(cur + 1), AUTO_MS);
    return () => clearTimeout(t);
  }, [cur, inView, go]);

  // parallax do mouse via ref: atualiza CSS vars sem re-renderizar
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5) * 24 + "deg");
    el.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5) * -18 + "deg");
  };
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    x0.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    if (x0.current !== null && Math.abs(e.clientX - x0.current) > 60) {
      go(curRef.current + (e.clientX < x0.current ? 1 : -1));
    }
    x0.current = null;
  };

  const scene = scenes[cur];
  const style = { "--wc": wipeColor, "--p": (cur + 1) / scenes.length } as CSSProperties;

  return (
    <section
      id="servicos"
      ref={rootRef}
      className="stage"
      data-scene={cur}
      style={style}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Serviços da Trills"
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(curRef.current + 1);
        if (e.key === "ArrowLeft") go(curRef.current - 1);
      }}
    >
      <GradientField variant="dusk" />
      <p className="eyebrow stage-eyebrow">O que fazemos</p>

      <div className="scene-copy">
        <p className="scene-kicker">{scene.kicker}</p>
        <h2 className="scene-title" aria-live="polite" aria-label={scene.title}>
          {[...scene.title].map((c, i) => (
            <span key={`${cur}-${i}`} className="ch" aria-hidden="true" style={{ "--i": i } as CSSProperties}>
              {c}
            </span>
          ))}
        </h2>
        <p key={cur} className="scene-text">{scene.text}</p>
        <a className="btn btn-ghost" href="#contato">Quero isso no meu projeto</a>
      </div>

      <div className="cube3d" aria-hidden="true">
        <div className="cube3d-float">
          <div className="cube3d-inner glass">
            <i /><i /><i /><i /><i /><i />
          </div>
        </div>
      </div>

      <ol className="scene-nav">
        {scenes.map((s, i) => (
          <li key={s.nav}>
            <button aria-label={s.nav} aria-current={i === cur} onClick={() => go(i)}>
              <span>{s.nav}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="progress" aria-hidden="true">
        <span className="cur">{String(cur + 1).padStart(2, "0")}</span>
        <i><b /></i>
        <span className="tot">{String(scenes.length).padStart(2, "0")}</span>
      </div>

      <button className="stage-arrow prev" aria-label="Serviço anterior" onClick={() => go(cur - 1)}>←</button>
      <button className="stage-arrow next" aria-label="Próximo serviço" onClick={() => go(cur + 1)}>→</button>

      <div className={phase === "idle" ? "wipe" : `wipe ${phase}`} aria-hidden="true">
        {STRIP_DELAYS.map((d, i) => (
          <i key={i} style={{ "--d": d } as CSSProperties} />
        ))}
      </div>
    </section>
  );
}
