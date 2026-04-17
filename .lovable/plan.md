
## Plano — Restaurar dados em Redação de Edital sem reintroduzir duplicação

### Investigação
- `src/pages/FilaAnalistaEditalPage.tsx` — revisar o filtro `showInThisFlow` atual e o histórico (git/conversa) para ver qual era o critério anterior que mostrava as vagas.
- `src/store/vagasStore.ts` + `src/types/vaga.ts` — verificar se `status_fluxo_edital` é sempre populado ou se há vagas com valor nulo/legado.
- Conferir se vagas em redação têm também `etapa === 'em_redacao'` ou `edital_id !== null` como critério alternativo.

### Causa provável
A correção anterior tornou o filtro **estritamente** dependente de `status_fluxo_edital ∈ {em_redacao, enviado_validacao, aprovado_administrativo, publicado}`. Vagas legadas ou criadas por outro fluxo não têm esse campo preenchido com esses valores → sumiram da listagem. O filtro anterior provavelmente combinava status + etapa + edital_id em OR, sendo mais tolerante.

### Implementação

**1. Filtro tolerante mas preciso** em `FilaAnalistaEditalPage.tsx`:
```ts
const ACTIVE_REDACAO_STATUSES = ['em_redacao', 'enviado_validacao', 'aprovado_administrativo', 'publicado'];
const EXCLUDED_STATUSES = ['encaminhado_edital']; // explicitamente fora

const showInThisFlow = 
  // exclui explicitamente vagas devolvidas
  !EXCLUDED_STATUSES.includes(v.status_fluxo_edital || '') && (
    // inclui por status_fluxo_edital
    ACTIVE_REDACAO_STATUSES.includes(v.status_fluxo_edital || '') ||
    // OU por etapa (compatibilidade com legado)
    v.etapa === 'em_redacao' ||
    // OU por presença de edital_id sem ter sido devolvida
    (!!v.edital_id && v.status_fluxo_edital !== 'encaminhado_edital')
  );
```

**2. Garantir mutua exclusão** Fila ↔ Redação:
- Vaga com `status_fluxo_edital === 'encaminhado_edital'` → SÓ na Fila.
- Vaga com qualquer outro status ativo de redação → SÓ na Redação.

**3. Backfill defensivo (opcional)**: ao carregar vagas, normalizar `status_fluxo_edital` derivando de `etapa`/`edital_id` se estiver null, para consistência futura.

### Validação
- Redação de Edital → vagas voltam a aparecer (legadas + novas).
- Fila de Editais → vagas devolvidas continuam lá, **sem** duplicar na Redação.
- Devolver vaga da Redação → some da Redação, aparece só na Fila.
- Refresh nas duas páginas → estado consistente.

### Arquivos alterados
- `src/pages/FilaAnalistaEditalPage.tsx` (filtro tolerante com exclusão explícita de `encaminhado_edital`)

### Risco
Baixo. Restaura tolerância do filtro anterior mantendo a exclusão da regressão de duplicação. Validação end-to-end no preview após implementação.
