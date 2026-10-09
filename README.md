# Site Trills

Next.js (App Router) + TypeScript. Página estática, otimizada seguindo a skill `vercel-react-best-practices` (em `.claude/skills/`).

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build de produção
```

## Onde editar
- `data/content.ts` — textos de serviços, processo, portfólio, valores e contatos (TODOs marcados).
- `components/Stage.tsx` — cena interativa dos serviços (cubo 3D + transições).
- `app/globals.css` — estilos e paleta do brandbook.
- `public/fonts/` — coloque aqui `Grifter-Bold.otf` e `HelveticaNeue.ttf` e ligue em `@font-face` (instruções no CSS).
- `legacy/` — primeira versão em HTML puro.

## Publicar
Importe o repositório na Vercel (framework detectado automaticamente) e aponte o domínio trills.com.br.
