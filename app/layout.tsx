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
        {/* Só com JS: sem movimento reduzido a abertura ganha o pin (hero-active) e o cabeçalho nasce oculto (sem flash);
            com movimento reduzido a abertura é estática (hero-still) e o cabeçalho só aparece depois da primeira tela.
            As texturas de papel (.tex) só entram depois do carregamento, para não disputar banda com a abertura.
            Sem JS: abertura estática e o cabeçalho fica oculto até a rolagem (animation-timeline, ver <noscript>). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement;d.classList.add(matchMedia('(prefers-reduced-motion: reduce)').matches?'hero-still':'hero-active');addEventListener('load',function(){setTimeout(function(){d.classList.add('tex')},900)})}catch(e){}",
          }}
        />
      </head>
      <body>
        <noscript>
          <style>
            {".reveal{opacity:1!important;transform:none!important}.paper::before{background-image:url(/tex/wrinkle.webp)}.paper::after{background-image:url(/tex/grain.webp)}" +
              "@keyframes hs-nav-scroll{from{opacity:0;translate:0 -100%}to{opacity:1;translate:0 0}}" +
              "@supports (animation-timeline:scroll()){.nav{animation:hs-nav-scroll linear both;animation-timeline:scroll(root);animation-range:40svh 80svh}}"}
          </style>
        </noscript>
        <a className="skip" href="#servicos">Pular para o conteúdo</a>
        <Header />
        <main>{children}</main>
        <RevealObserver />
      </body>
    </html>
  );
}
