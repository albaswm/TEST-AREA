export type Scene = {
  nav: string;
  kicker: string;
  title: string;
  wipe: string;
  text: string;
};

export const scenes: readonly Scene[] = [
  { nav: "Edição", kicker: "01 · Edição e montagem", title: "Edição", wipe: "#FF8A3D", text: "Ritmo, narrativa e formato certo para cada plataforma — de redes sociais a institucionais e documentais." },
  { nav: "Motion", kicker: "02 · Motion graphics", title: "Motion", wipe: "#DA1984", text: "Aberturas, lettering, lower thirds e animações que dão identidade ao seu vídeo." },
  { nav: "Cor", kicker: "03 · Cor e finalização", title: "Cor", wipe: "#F9E267", text: "Correção e color grading mantendo a essência do seu olhar, com acabamento de cinema." },
  { nav: "Som", kicker: "04 · Som e mixagem", title: "Som", wipe: "#03257E", text: "Limpeza de áudio, trilha, sound design e mixagem para o vídeo soar tão bem quanto parece." },
];

export const marquee = ["Edição", "Motion Graphics", "Color Grading", "Sound Design", "Finalização", "Legendagem"] as const;

export const extraSteps = ["Conceito e roteiro", "Pré-produção e planejamento", "Captação e direção", "Entrega multiformato"] as const;

export const process = [
  { n: "01", title: "Conversa", text: "Entendemos seu objetivo, público e referências." },
  { n: "02", title: "Material", text: "Recebemos seus arquivos ou planejamos e captamos com você." },
  { n: "03", title: "Criação", text: "Edição, motion, cor e som, com aprovações em etapas." },
  { n: "04", title: "Entrega", text: "Arquivos prontos para cada plataforma e formato." },
] as const;

// TODO: trocar pelos cases reais (título, cliente, serviço e link do Vimeo/YouTube)
export const portfolio = [
  { id: "t1", title: "Nome do projeto", meta: "Cliente · Edição + Motion" },
  { id: "t2", title: "Nome do projeto", meta: "Cliente · Cor + Finalização" },
  { id: "t3", title: "Nome do projeto", meta: "Cliente · Produção completa" },
  { id: "t4", title: "Nome do projeto", meta: "Cliente · Edição + Som" },
] as const;

export const values = ["Conexões verdadeiras", "Diversidade como inovação", "Respeito e empatia", "Qualidade técnica"] as const;

// TODO: confirmar e-mail, WhatsApp e Instagram reais
export const contact = {
  email: "contato@trills.com.br",
  whatsapp: "https://wa.me/55XXXXXXXXXXX",
  instagram: "https://instagram.com/",
} as const;
