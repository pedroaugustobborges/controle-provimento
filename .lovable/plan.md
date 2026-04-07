

## Correção do erro `Select.Item` com valor vazio

### Problema
O erro `A <Select.Item /> must have a value prop that is not an empty string` ocorre no `ImportExcelDialog.tsx` e possivelmente no `VagasPage.tsx`, quando headers do Excel ou valores de filtro são strings vazias.

### Correções

**1. `src/components/ImportExcelDialog.tsx`**
- Na renderização dos headers como `<SelectItem>`, filtrar headers vazios:
  - Onde aparece `{headers.map((h, i) => (<SelectItem key={...} value={h}>` — adicionar `.filter(h => h && h.trim() !== '')` antes do `.map()`

**2. `src/pages/VagasPage.tsx`**  
- Nos filtros de Analista e Assistente, filtrar valores vazios:
  - `analistas` e `assistentes` arrays — adicionar `.filter(Boolean)` para remover strings vazias
  - Também em `unidades`

Ambas as correções são simples: adicionar `.filter(Boolean)` ou `.filter(h => h)` antes dos `.map()` que geram `<SelectItem>`.

