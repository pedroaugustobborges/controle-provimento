

## Plano: Corrigir estado ativo duplicado no submenu

### Contexto
Ao clicar em "Unidades TEIAs" (`/vagas?filtro=teias`), o item "Todas as Vagas" (`/vagas`) também fica marcado como ativo porque ambas as rotas compartilham o path `/vagas` e a lógica de active state provavelmente usa apenas `pathname` sem considerar os query params.

### Alteração em `src/components/AppSidebar.tsx`
1. Localizar a lógica que determina o estado ativo dos itens do submenu de Controle de Vagas
2. Ajustar para que "Todas as Vagas" (`/vagas`) só fique ativo quando **não** houver query param `filtro`
3. "Unidades TEIAs" (`/vagas?filtro=teias`) só fica ativo quando o param `filtro=teias` estiver presente

