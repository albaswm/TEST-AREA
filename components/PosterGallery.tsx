"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Poster } from "@/data/content";

export default function PosterGallery({ posters }: { posters: readonly Poster[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const total = posters.length;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const step = (dir: number) => setOpen((i) => (i === null ? i : (i + dir + total) % total));
  const current = open === null ? null : posters[open];

  return (
    <>
      <ul className="posters">
        {posters.map((p, i) => (
          <li key={p.id} className="reveal">
            <button className={`poster poster-${p.id}`} onClick={() => setOpen(i)} aria-label={`Ampliar: ${p.title}`}>
              {p.src ? (
                <Image src={p.src} alt={p.alt} fill sizes="(max-width: 820px) 50vw, 25vw" />
              ) : (
                <span className="poster-ph" aria-hidden="true"><i /><i /><i /></span>
              )}
              <span className="poster-cap"><small>{p.series}</small>{p.title}</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className="lightbox"
        aria-label="Poster ampliado"
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        {current ? (
          <figure>
            <div className={`lb-img poster-${current.id}`}>
              {current.src ? (
                <Image src={current.src} alt={current.alt} fill sizes="90vw" priority />
              ) : (
                <span className="poster-ph" aria-hidden="true"><i /><i /><i /></span>
              )}
            </div>
            <figcaption><small>{current.series}</small> {current.title} <em>{(open ?? 0) + 1}/{total}</em></figcaption>
          </figure>
        ) : null}
        <button className="lb-btn lb-close" aria-label="Fechar" onClick={() => setOpen(null)}>✕</button>
        <button className="lb-btn lb-prev" aria-label="Poster anterior" onClick={() => step(-1)}>←</button>
        <button className="lb-btn lb-next" aria-label="Próximo poster" onClick={() => step(1)}>→</button>
      </dialog>
    </>
  );
}
