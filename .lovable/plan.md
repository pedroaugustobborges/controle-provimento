

## Plano — Corrigir lista de unidades em Convocações

### Problema
As unidades de Goiânia (HECAD, HUGOL, CRER, HDS, AGIR, CONDOMÍNIO) estão aparecendo individualmente no filtro de unidades da página de Convocações, quando deveriam estar agrupadas sob "Goiânia".

### Solução
1. **`src/pages/ConvocacoesPage.tsx`** — Alterar a lógica que popula o filtro/seletor de unidades para:
   - Usar o mapeamento `BASES_CONVOCACAO` de `convocacaoUtils.ts`
   - Substituir unidades individuais de Goiânia por uma única opção "Goiânia"
   - Manter as demais unidades com seus nomes próprios
   - Ao filtrar por "Goiânia", incluir convocações de todas as unidades da base

2. **`src/components/ConvocacaoDialog.tsx`** (se necessário) — Verificar se o seletor de unidade ao criar convocação também precisa do mesmo agrupamento

3. Utilizar a função `getBaseForUnidade()` já existente em `convocacaoUtils.ts` para mapear unidades às suas bases

