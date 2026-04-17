
## Plano — Corrigir duplicação: vaga devolvida continua aparecendo em Redação

### Investigação
- `src/pages/FilaAnalistaEditalPage.tsx` — confirmar critério de filtro da listagem de Redação (provavelmente `status_fluxo_edital === 'em_redacao'` OU `etapa === 'em_redacao'` OU `edital_id IS NOT NULL`).
- `src/pages/FilaAnalistaEditalPage.tsx` (handler `handleConfirmReturnToFila`) — revisar quais campos estão sendo atualizados na devolução. A correção anterior setou `status`, `status_geral`, `status_fluxo_edital: 'encaminhado_edital'` e `etapa: 'encaminhado_edital'`, mas a vaga continua aparecendo → algum outro campo do filtro não foi limpo.
- Verificar se há `edital_id` populado na vaga e se a página de Redação filtra por `edital_id IS NOT NULL`. Se sim, devolução precisa setar `edital_id = null`.
- Verificar se existe registro em `validacoes_editais` ou `editais` vinculado à vaga que a mantém visível.

### Causa provável
O filtro da página de Redação combina múltiplos critérios (ex: `status_fluxo_edital === 'em_redacao'` **OR** `edital_id !== null` **OR** etapa específica). A devolução só troca `status_fluxo_edital`, mas outro critério permanece verdadeiro → vaga aparece nas duas listas.

### Implementação

**1. Auditar filtro da Redação** em `FilaAnalistaEditalPage.tsx`:
- Identificar exatamente quais campos definem "está em redação".
- Listar todos os critérios (status, etapa, edital_id, presença em tabela auxiliar).

**2. Atualizar `handleConfirmReturnToFila`** para resetar TODOS os campos que mantêm a vaga em Redação:
```ts
await updateVaga(vaga.id, {
  status: 'PUBLICAR EDITAL',
  status_geral: 'PUBLICAR EDITAL',
  status_fluxo_edital: 'encaminhado_edital',
  etapa: 'encaminhado_edital',
  edital_id: null,                    // se for o caso
  // ...campos extras conforme investigação
  historico: [...(vaga.historico || []), {
    acao: 'Devolvida para Fila de Editais',
    de_etapa: 'em_redacao',
    para_etapa: 'encaminhado_edital',
    usuario: currentUser?.nome,
    data: new Date().toISOString(),
  }],
});
```

**3. Se houver registros em `editais` ou `validacoes_editais`** vinculados, decidir:
- Opção A: deletar/marcar como cancelado o registro auxiliar na devolução.
- Opção B: ajustar filtro da Redação para considerar `status_fluxo_edital === 'em_redacao'` como fonte única de verdade (preferível: menos efeitos colaterais).

**4. Reatividade** — garantir que após `updateVaga`, a store Zustand reflita a mudança e ambas as páginas re-renderizem (Redação some, Fila aparece) sem refresh.

### Validação (após implementação)
- Vaga em Redação → "Devolver à Fila" → vaga **sai** da Redação e aparece **apenas** na Fila de Editais.
- Lote: 3 vagas devolvidas → todas saem da Redação, todas aparecem na Fila.
- Refresh da página de Redação → vagas devolvidas continuam ausentes.
- Refresh da Fila de Editais → vagas devolvidas continuam presentes.
- Histórico mostra a movimentação com etapa de origem e destino.

### Arquivos prováveis
- `src/pages/FilaAnalistaEditalPage.tsx` (handler + entender filtro)
- Possivelmente `src/store/vagasStore.ts` (se houver lógica derivada)

### Risco
Baixo. Correção pontual: garantir que TODOS os campos do filtro de Redação sejam zerados na devolução. Vou validar end-to-end no preview.
