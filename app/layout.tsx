import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import RevealObserver from "@/components/RevealObserver";
import "./globals.css";
import "./hero-bg.css";
import "./hero.css";

export const metadata: Metadata = {
  title: "Trills — Produtora Audiovisual",
  description:
    "Trills é uma produtora audiovisual com foco em pós-produção: edição, motion, cor e som. Criamos conteúdos que atraem, inspiram e motivam pessoas.",
  openGraph: {
    title: "Trills — Produtora Audiovisual",
    description: "Criamos conteúdos que atraem, inspiram e motivam pessoas.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = { themeColor: "#13100D" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Só com JS e sem movimento reduzido: o cabeçalho nasce oculto na abertura (sem flash) e a seção ganha o pin.
            Sem JS, ou com prefers-reduced-motion, o site mostra o personagem estático e o cabeçalho visível. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('hero-active')}catch(e){}",
          }}
        />
      </head>
      <body>
        <noscript>
          <style>{".reveal{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        <Header />
        <main>{children}</main>
        <RevealObserver />
      </body>
    </html>
  );
}
