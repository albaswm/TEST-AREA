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
- `public/fonts/` — Grifter Bold e Helvetica Neue em WOFF2 (ligadas em `@font-face` no `app/globals.css`).
- `legacy/` — primeira versão em HTML puro.

## Publicar
Importe o repositório na Vercel (framework detectado automaticamente) e aponte o domínio trills.com.br.

## Licenças das fontes (verificar antes de publicar)
- **Grifter Bold** (Hanson Method): o arquivo recebido indica licença "PERSON USE" (uso pessoal). Uso comercial/web exige licença do estúdio (hansonmethod.com).
- **Helvetica Neue** (Linotype/Monotype): fonte comercial; uso em site exige licença de web font.
- Se não houver licença, trocar por alternativas livres mudando apenas os `@font-face` e as variáveis `--display` / `--text`.
