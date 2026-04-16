

## Plano: Sincronização Realtime para todas as tabelas do sistema

### 1. Migração SQL — Habilitar Realtime nas tabelas restantes
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.importacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedbacks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
```

### 2. `src/store/vagasStore.ts` — Expandir subscriptions
- Adicionar listeners Realtime para `profiles`, `importacoes`, `audit_logs`, `feedbacks`, `support_configs` e `user_sessions`
- Para cada tabela, tratar eventos INSERT, UPDATE e DELETE atualizando o state local correspondente
- Reaproveitar o canal existente ou criar canais adicionais conforme necessário

### 3. `src/components/AppLayout.tsx`
- Garantir que o `useEffect` existente já cubra as novas subscriptions (o cleanup do `unsubscribeRealtime` já deve cobrir tudo)

### Resultado
Qualquer alteração em qualquer módulo será propagada em tempo real para todos os usuários conectados.

