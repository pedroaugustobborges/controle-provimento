
## Plano — Corrigir botão "Devolver à Fila de Editais"

### Investigação
- `src/pages/FilaAnalistaEditalPage.tsx` — handler do botão "Devolver à Fila" (linha + lote): verificar se `onClick` está conectado, se chama `updateVaga` corretamente e se o `AlertDialog` confirma de fato.
- `src/store/vagasStore.ts` — confirmar que `updateVaga` persiste `status_fluxo_edital` no Supabase e atualiza estado local.
- Verificar filtro da página de Redação: provavelmente filtra por `status_fluxo_edital === 'em_redacao'`. Ao mudar para `encaminhado_edital`, vaga deve sair da lista automaticamente.
- `src/pages/FilaEditaisPage.tsx` — confirmar que filtro inclui vagas com `status_fluxo_edital === 'encaminhado_edital'` para que a vaga devolvida reapareça.

### Causas prováveis
1. Handler chama `updateVaga` mas não passa `status_fluxo_edital` corretamente (typo ou campo faltando).
2. `AlertDialog` confirma mas o `onConfirm` não dispara (falta wiring do `onClick` no `AlertDialogAction`).
3. Update no Supabase falha silenciosamente (erro de RLS ou coluna inexistente) e toast de sucesso é exibido mesmo com falha.
4. `historico` é objeto ao invés de array, ou push gera erro que aborta o update.
5. Filtro da Fila de Editais não captura o novo `status_fluxo_edital` setado.

### Implementação

**A. Auditoria e logs**
- Adicionar `console.log` temporário antes/depois do `updateVaga` no handler para ver fluxo.
- Verificar retorno do `updateVaga` (await + try/catch) e exibir toast de erro real se falhar.

**B. Correções prováveis**
- Garantir que o handler:
  ```ts
  await updateVaga(vagaId, {
    status_fluxo_edital: 'encaminhado_edital',
    historico: [...(vaga.historico || []), { 
      acao: 'Devolvida para Fila de Editais',
      usuario: currentUser?.nome,
      data: new Date().toISOString()
    }]
  });
  ```
- Garantir que o `AlertDialogAction` tem `onClick={handleDevolverFila}` (e não só dentro do conteúdo do dialog).
- Para lote: iterar com `Promise.all` e tratar erros individuais.
- Limpar seleção (`setSelectedForReturn([])`) e fechar dialog após sucesso.

**C. Verificação do filtro**
- Em `FilaEditaisPage.tsx`, confirmar que o filtro de listagem inclui `status_fluxo_edital === 'encaminhado_edital'`. Se filtrar apenas por status genérico, ajustar.

**D. Reatividade**
- Confirmar que `vagas` da store é usado direto (não cópia local em `useState`) para que update do Zustand re-renderize automaticamente.

### Validação
- Vaga em Redação → clicar "Devolver à Fila" individual → confirmar → vaga sai da Redação e aparece na Fila de Editais.
- Selecionar 3 vagas → "Devolver à Fila" em lote → todas são movidas, toast mostra "3 vagas devolvidas".
- Forçar erro (ex: desconectar) → toast de erro real aparece, vaga não some indevidamente.
- Histórico da vaga mostra entrada "Devolvida para Fila de Editais por {usuário}" com timestamp.
- Refresh da página: vaga continua na Fila de Editais (persistência confirmada).

### Arquivos alterados
- `src/pages/FilaAnalistaEditalPage.tsx` (handler + wiring do AlertDialog)
- Possivelmente `src/pages/FilaEditaisPage.tsx` (ajuste de filtro se necessário)

### Risco
Baixo. Correção pontual de wiring/persistência. Vou rodar teste end-to-end no preview após a correção para confirmar.
