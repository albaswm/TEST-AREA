import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import RevealObserver from "@/components/RevealObserver";
import "./globals.css";

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
    <html lang="pt-BR">
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
