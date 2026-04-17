
## Plano — Corrigir filtro "Em Andamento" em Todas as Vagas e Vagas PCD

### Investigação
- `src/pages/VagasPage.tsx` — localizar definição do filtro "Em Andamento" (provavelmente em `STATUS_FILTER_OPTIONS` ou em lógica de quick filters/tabs no topo da listagem).
- `src/types/vaga.ts` — revisar `STATUS_FILTER_OPTIONS` e ver se "Em Andamento" está mapeado e quais `matches` ele inclui.
- Verificar se há um agrupador "Em Andamento" que deveria somar várias categorias (EM EDITAL + FILA + CONVOCAÇÃO + DOCUMENTAÇÃO + ADMISSÃO ENVIADA + ADMISSÃO) mas que ficou desatualizado após introdução de novos status (lowercase: `encaminhado_edital`, `admissao_enviada`, `em_admissao`, `em_documentacao`, etc.).
- Conferir interação com `filtroEspecial === 'pcd'` para confirmar se PCD apenas restringe a base e não interfere no matching de status.

### Causa provável
Após adições recentes de status (fluxo de editais, TEIA, status lowercase do banco), o agrupador "Em Andamento" não foi atualizado para incluir as novas variantes. Resultado: a comparação não bate com nenhum registro e a lista vem vazia.

### Implementação

**1. Definir lista canônica de status "Em Andamento"** em `src/types/vaga.ts`:
```ts
export const STATUS_EM_ANDAMENTO: StatusVaga[] = [
  'EM EDITAL', 'FILA DE EDITAIS', 'REALIZAR CONVOCAÇÃO',
  'DOCUMENTAÇÃO', 'ADMISSÃO ENVIADA', 'ADMISSÃO',
  'ACOMPANHAMENTO DE EDITAL', 'PUBLICAR EDITAL',
  // variantes lowercase do banco
  'encaminhado_edital', 'em_redacao', 'em_documentacao',
  'admissao_enviada', 'em_admissao', 'em_convocacao',
];
```

**2. `src/pages/VagasPage.tsx`** — usar essa lista no handler/filtro "Em Andamento" com comparação case-insensitive (`String(v.status).toUpperCase()` vs lista normalizada). Garantir que o badge de contagem use a mesma função.

**3. Validar PCD** — confirmar que `filtroEspecial === 'pcd'` apenas pré-filtra `vagas.filter(v => v.pcd)` antes de aplicar o filtro de status. Se houver short-circuit que ignora status quando PCD ativo, remover.

**4. Regressão** — rodar mentalmente os outros filtros (Concluídas, Canceladas, Suspensas) com a mesma base para garantir que continuam funcionando.

### Validação (após aprovação, eu testo no preview)
- Controle de Vagas → Todas as Vagas → "Em Andamento" → vagas aparecem, contagem bate.
- Controle de Vagas → Vagas PCD → "Em Andamento" → apenas vagas PCD em andamento aparecem.
- Outros filtros (Concluídas, Canceladas) continuam funcionando.

### Arquivos alterados
- `src/types/vaga.ts` (constante `STATUS_EM_ANDAMENTO`)
- `src/pages/VagasPage.tsx` (uso da constante no filtro + contagem)

### Risco
Baixo. Mudança aditiva no mapeamento de status. Vou validar end-to-end no preview após implementação.
