

## Plano: Corrigir painel de Histórico de Acessos e Usuários Online

### Problemas identificados

1. **Join quebrado no histórico**: O `AccessHistoryPopoverContent` tenta fazer `profiles:user_id(...)` no select, mas `user_sessions.user_id` tem FK para `auth.users`, não para `profiles`. O Supabase exige FK direta para joins automáticos — o join falha silenciosamente e retorna `profiles: null`.

2. **Cast `as any`**: As queries usam `from('user_sessions' as any)` que mascara erros de tipo e impede detecção de problemas.

### Alterações

**Migração SQL — adicionar FK de `user_sessions` para `profiles`:**
```sql
ALTER TABLE public.user_sessions 
ADD CONSTRAINT user_sessions_profile_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
```
Isso permite o join `profiles:user_id(...)` funcionar.

**`src/components/AccessHistoryPopoverContent.tsx`:**
- Remover os casts `as any` das queries
- Usar o join correto com a nova FK: `profiles!user_sessions_profile_fkey(nome_completo, perfil, cargo)`
- Adicionar fallback: se o join retornar null, buscar profiles separadamente por user_id
- Adicionar tratamento de erro visível (toast) em vez de só console.error

**Sem alterações em `UserSessionTracker.tsx`** — está funcionando corretamente (17 sessões registradas no banco).

**Sem alterações no "Online Agora"** — usa Presence (tempo real, sem banco) e funciona quando os usuários estão na mesma página.

