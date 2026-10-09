"use client";

import { useState } from "react";
import Logo from "./Logo";

export default function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  // o destino #top é a abertura (seção alta e fixada): volta ao topo na hora, sem atravessar a sequência inteira
  const toTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    close();
    window.scrollTo({ top: 0, behavior: "instant" });
    history.replaceState(null, "", "#top");
  };

  return (
    <header className="nav">
      <a className="brand" href="#top" aria-label="Trills — início" onClick={toTop}>
        <Logo />
      </a>
      <button
        className="burger"
        aria-label="Abrir menu"
        aria-expanded={open}
        aria-controls="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
      </button>
      <nav id="menu" className={open ? "open" : undefined} onClick={close}>
        <a href="#servicos">Serviços</a>
        <a href="#processo">Processo</a>
        <a href="#portfolio">Portfólio</a>
        <a href="#universo">Universo</a>
        <a href="#sobre">Sobre</a>
        <a className="btn btn-sm" href="#contato">Fale com a gente</a>
      </nav>
    </header>
  );
}
