

## Plano: Corrigir exibição de avatar por usuário

### Análise
Preciso verificar como o avatar está sendo carregado no header (`AppLayout.tsx` ou `Layout.tsx`) e se está usando o `currentUser` correto do store/auth.

### Passos

**1. Revisar `src/components/AppLayout.tsx` e `src/components/Layout.tsx`**
- Verificar como o avatar é renderizado — se está hardcoded ou usando dados do usuário logado
- Garantir que usa `currentUser.avatar_url` do store/auth

**2. Revisar `src/hooks/useAuth.ts` e `src/store/adminStore.ts`**
- Verificar se o `currentUser` carrega corretamente o `avatar_url` do perfil autenticado
- Garantir que o avatar_url é buscado da tabela `profiles` com base no `auth.uid()`

**3. Revisar upload de avatar**
- Verificar se o upload salva a URL correta no campo `avatar_url` do perfil do usuário correto
- Verificar se o bucket `avatars` está público (já está conforme config)

**4. Corrigir o componente que exibe o avatar**
- Usar `currentUser.avatar_url` no `<AvatarImage>` do header
- Usar as iniciais do nome do `currentUser` no `<AvatarFallback>`

