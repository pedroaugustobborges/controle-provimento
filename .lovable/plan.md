
## Plano — Modo de Manutenção + Notificação de Atualização

### 1. Investigação rápida (read-only)
- Reler `src/App.tsx` (rotas/wrappers), `src/hooks/useAuth.ts`, `src/pages/LoginPage.tsx`, `src/pages/AdministracaoPage.tsx` para entender pontos de inserção.
- Conferir se há realtime já habilitado em alguma tabela como referência.

### 2. Perguntas a confirmar antes de codar
- Definição de "admin" (apenas role `admin` em `user_roles`? ou também `perfil` admin em `profiles`?).
- Deslogar não-admins na hora da ativação vs. só bloquear navegação.
- Atualização: registro manual pelo admin (recomendado) ou auto-detecção por hash de build.
- Banner sempre adiável + flag "obrigatória" pelo admin (recomendado).
- Tela admin nova em `/gestor` aba "Sistema" → sub-abas Manutenção e Atualizações.

### 3. Backend (migrações)
1. Criar tabela `system_maintenance`:
   - `id uuid pk`, `is_active boolean default false`, `message text`, `expected_return_at timestamptz`, `activated_by uuid`, `activated_at timestamptz`, `deactivated_at timestamptz`, `created_at`.
   - RLS: SELECT autenticados; INSERT/UPDATE apenas `has_role(auth.uid(),'admin')`.
   - Habilitar `replica identity full` + adicionar à publicação `supabase_realtime`.
2. Criar tabela `system_updates`:
   - `id uuid pk`, `version text`, `message text`, `action_type text check in ('reload','relogin')`, `is_mandatory boolean default false`, `published_by uuid`, `published_at timestamptz default now()`.
   - RLS: SELECT autenticados; INSERT apenas admin.
   - Habilitar realtime.

### 4. Frontend — Modo de Manutenção
1. Hook `src/hooks/useMaintenanceMode.ts`:
   - Query da linha mais recente de `system_maintenance` (singleton lógico).
   - Subscribe realtime; ao detectar `is_active=true` e usuário não-admin → `signOut()` + redirect `/login`.
2. `src/pages/MaintenancePage.tsx`: tela bloqueando o app para não-admin durante manutenção (mensagem + previsão de retorno).
3. Em `App.tsx`: dentro de `ProtectedRouteWrapper` e `UnidadeRouteWrapper`, se manutenção ativa e !admin → renderizar `MaintenancePage`.
4. Em `LoginPage.tsx`: antes do `signIn`, checar manutenção; se ativa e o usuário (após autenticar) não for admin, fazer `signOut` e mostrar mensagem.
5. Tela admin em `AdministracaoPage` (nova aba "Sistema" → sub-aba "Manutenção"): toggle, mensagem, previsão de retorno, histórico (lista das linhas anteriores).

### 5. Frontend — Notificação de Atualização
1. Hook `src/hooks/useSystemUpdates.ts`:
   - Buscar último update; subscribe realtime para novos inserts.
   - Persistir `lastSeenUpdateId` em `localStorage`; só exibe se `id !== lastSeen`.
2. Componente `src/components/UpdateBanner.tsx`:
   - Banner topo (ou modal se `is_mandatory`).
   - Botão "Atualizar agora" → `window.location.reload()` (action `reload`).
   - Botão "Deslogar e entrar novamente" → `signOut()` + `navigate('/login')` (action `relogin`).
   - Botão "Mais tarde" só quando não obrigatório.
3. Montar `<UpdateBanner />` dentro do `AppLayout`.
4. Sub-aba admin "Atualizações" em `AdministracaoPage`: form para publicar nova versão (mensagem, tipo de ação, obrigatória) + lista das últimas publicações.

### 6. Validação
- Admin ativa manutenção → usuário comum logado é deslogado em <5s; tentativa de login mostra mensagem; admin continua acessando.
- Admin desativa → usuário comum loga normalmente.
- Admin publica update tipo `reload` → banner aparece para todos com botão "Atualizar agora"; clicando, recarrega.
- Admin publica update tipo `relogin` obrigatório → modal trava UI até "Deslogar e entrar novamente".
- Conferir que após reload não reaparece (graças ao `lastSeenUpdateId`).
- Console limpo, sem `permission denied`.
