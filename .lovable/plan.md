
## Plano — Corrigir Portal Unidade não puxando dados de Provimento

### 1. Investigação (read-only)
- Reler `src/pages/UnidadePortalPage.tsx` para mapear: que stores/services chama, com quais filtros, e como mapeia o retorno.
- Reler `src/store/vagasStore.ts` e `src/services/recruitmentService.ts` para entender `fetchVagas` (e similares) — confirmar se aceitam/aplicam filtro por `unidade_id`.
- Conferir `useAuth` / `fetchCurrentProfile` para garantir que `unidade_id` (ou `unidades_vinculadas`) do usuário está disponível antes da query.
- Consultar via `supabase--read_query`:
  - `SELECT id, email, perfil, unidade_id, unidades_vinculadas, visualiza_todas_unidades FROM usuarios LIMIT 20;` para confirmar vínculo dos usuários de Portal Unidade.
  - `SELECT unidade_id, COUNT(*) FROM vagas GROUP BY unidade_id;` para ver se há dados.
- Consultar RLS de `vagas` e tabelas relacionadas via `supabase--read_query` em `pg_policies`.
- Conferir `supabase--analytics_query` (postgres_logs) por `permission denied` recentes.

### 2. Hipóteses prováveis
- **Filtro ausente/errado**: Portal Unidade chama `fetchVagas()` global em vez de `fetchVagasByUnidade(user.unidade_id)`.
- **RLS bloqueando**: policy de `vagas` permite só `is_admin()` e não cobre o perfil "Analista da unidade" / Portal Unidade.
- **Usuário sem `unidade_id`**: perfil do usuário de teste foi criado sem vínculo de unidade.
- **Race condition**: query disparada antes do `currentProfile` estar carregado — `unidade_id=undefined` retorna vazio.
- **Mapeamento quebrado**: campo renomeado no schema do Supabase mas não atualizado no frontend.

### 3. Correções (após aprovação)
1. **Frontend** (`UnidadePortalPage.tsx`):
   - Aguardar `currentProfile` carregar antes de chamar fetches de provimento.
   - Passar `unidade_id` (ou lista `unidades_vinculadas`) explicitamente para os services.
   - Logar `console.error('[portal-unidade]', ...)` em qualquer rejeição.
   - Adicionar bloco de erro com botão "Tentar novamente" caso a hidratação falhe.

2. **Service** (`recruitmentService.ts` / `vagasStore.ts`):
   - Garantir filtro `.in('unidade_id', unidades)` ou `.eq('unidade_id', id)` na query do Supabase.
   - Propagar erro (sem catch silencioso).

3. **RLS** (se for o caso — via migração):
   - Adicionar policy de SELECT em `vagas` permitindo `auth.uid()` cuja `usuarios.unidade_id` ou `usuarios.unidades_vinculadas` contenha o `vagas.unidade_id`.
   - Replicar em tabelas relacionadas (convocações, candidatos por vaga, etc.) conforme o caso.

4. **Perfil do usuário** (se for o caso):
   - Orientar admin a vincular o usuário a uma unidade via tela de Administração.

### 4. Validação
- Logar como usuário de uma unidade específica e abrir `/portal-unidade`.
- Confirmar via Network que a request retorna `> 0 registros`.
- Conferir cards/tabelas/gráficos preenchidos.
- Forçar erro de rede (DevTools offline) → confirmar mensagem de erro com retry.
- Conferir `supabase--analytics_query` sem `permission denied` após o fix.

### 5. Pendência (preciso confirmar antes de implementar)
- Qual usuário/unidade está sendo usado no teste? (para eu validar o vínculo no banco).
- Se for problema de RLS, autoriza criação de migração para ajustar policies?
