
## Plano — Corrigir exibição da animação de logout

### Causa raiz
O overlay de loading está dentro do `LogoutConfirmDialog`, que é renderizado pelo `AppSidebar`. Quando `signOut()` executa, o `useAuth` atualiza `isAuthenticated → false`, o `App.tsx` re-renderiza e o `AppSidebar` (junto com o dialog e o overlay) é desmontado **antes** do usuário ver a animação. Além disso, `setLoggingOut(false)` no `finally` esconde o overlay imediatamente.

### Solução
1. **Criar estado global de logout** via Zustand (ex.: `useLogoutStore` com `isLoggingOut: boolean`) — ou adicionar a flag ao `adminStore` existente.
2. **Criar componente `LogoutOverlay`** standalone, montado em `App.tsx` (fora do `AppSidebar` e fora das rotas protegidas), que escuta o estado global e renderiza o overlay full-screen quando ativo. Assim ele sobrevive ao desmonte do sidebar e do redirect.
3. **Refatorar `LogoutConfirmDialog`**:
   - Ao confirmar: setar `isLoggingOut = true` no store global, fechar o dialog imediatamente.
   - Executar update da `user_sessions` + `signOut()` + `navigate('/login')`.
   - Remover `setLoggingOut(false)` do `finally` — deixar o overlay visível até o redirect concluir. Limpar o flag no `LoginPage` (mount) ou após `navigate` com pequeno delay.
4. **Montar `<LogoutOverlay />` em `App.tsx`** logo após o `BrowserRouter`/providers, garantindo que esteja sempre disponível.

### Arquivos a alterar
- `src/store/adminStore.ts` (ou novo `src/store/logoutStore.ts`) — adicionar `isLoggingOut` + setter.
- `src/components/LogoutOverlay.tsx` (novo) — overlay standalone.
- `src/components/LogoutConfirmDialog.tsx` — usar store global, remover overlay local.
- `src/App.tsx` — montar `<LogoutOverlay />` global.
- `src/pages/LoginPage.tsx` — limpar `isLoggingOut` no mount.

### Validação
- Clicar em "Sair" → modal aparece → confirmar → overlay com spinner permanece visível até chegar em `/login`.
