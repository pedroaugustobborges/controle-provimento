

## Plano: Implementar sincronização em tempo real entre usuários

### Problema
Atualmente, quando um usuário altera dados (status de vaga, criação, edição), os outros usuários conectados não veem as mudanças até recarregar a página. Não há nenhuma subscription Realtime configurada no projeto.

### Alterações

**1. Migração SQL — Habilitar Realtime nas tabelas principais**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.vagas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.banco_candidatos;
```

**2. `src/store/vagasStore.ts` — Adicionar subscriptions Realtime**
- Criar uma função `subscribeRealtime()` que:
  - Abre um channel Supabase para a tabela `vagas` (INSERT, UPDATE, DELETE)
  - Ao receber INSERT/UPDATE: atualiza ou adiciona o registro no state do store (usando `mapDbVaga`)
  - Ao receber DELETE: remove o registro do state
  - Faz o mesmo para `banco_candidatos`
- Criar `unsubscribeRealtime()` para cleanup

**3. `src/components/AppLayout.tsx` — Ativar subscription ao montar**
- Chamar `subscribeRealtime()` quando o usuário estiver autenticado
- Chamar `unsubscribeRealtime()` no cleanup do useEffect

### Resultado
Qualquer alteração feita por qualquer usuário será propagada automaticamente para todos os outros usuários conectados, sem necessidade de refresh.

