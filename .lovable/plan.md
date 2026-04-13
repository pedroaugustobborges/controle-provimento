

## Plano: Ajustar visibilidade por perfil em Alertas e Tarefas

### Arquivos a modificar

**`src/hooks/useRBAC.ts`**:
- Separar `isManagement` para não incluir "Supervisão" — criar flag `isSupervisao` à parte

**`src/pages/AlertasTarefasPage.tsx`**:
- Remover Gestão e Supervisão do `showAll` (apenas Admin vê tudo)
- Gestão: filtrar tarefas e alertas para vazio, mensagens pelo perfil
- Supervisão: filtrar tarefas para vazio, alertas apenas com destinatário `'supervisão'`, mensagens pelo perfil
- Demais perfis: filtrar tarefas, alertas e mensagens pelo `perfil_destinatario` correspondente

**`src/store/vagasStore.ts`**:
- Adicionar alertas/tarefas mock com `destinatario: 'supervisão'` para aprovação de edital
- Garantir que cada alerta/tarefa/mensagem tem `perfil_destinatario` ou `destinatario` correto
- Bump version para `5` com migration para limpar cache

Nenhuma alteração de banco de dados necessária.

