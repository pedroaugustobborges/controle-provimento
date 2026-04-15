

## Plano: Centralizar conteúdo dos cards no carrossel de unidades

### Alteração em `src/pages/LoginPage.tsx` — função `UnitsCarouselInline`

1. **Centralizar o bloco de conteúdo horizontalmente** — adicionar `text-center items-center` ao container principal e aos sub-containers
2. **Centralizar nome da unidade e descrição** — adicionar `text-center` nos textos do nome (`u.name`) e descrição (`u.desc`) dentro de cada card
3. **Centralizar título da seção** — adicionar `text-center` no `section.title`
4. **Centralizar o cabeçalho do slide** (estado + contador) — adicionar `justify-center`

Linhas afetadas: ~505-527 (container do conteúdo e cards individuais)

