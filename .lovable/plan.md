

## Plano: Otimizar carregamento e eliminar tela em branco

### Diagnóstico
O problema ocorre porque os stores Zustand (vagasStore, adminStore) e as queries buscam dados do banco **a cada montagem de componente**, sem cache. Ao navegar ou atualizar, tudo recomeça do zero.

### Solução em 3 partes

**1. Configurar React Query com cache adequado**
- Ajustar `QueryClient` no `App.tsx` com `staleTime: 5 * 60 * 1000` (5 min) e `gcTime: 10 * 60 * 1000` para manter dados em cache entre navegações
- Isso evita refetch desnecessário ao trocar de página

**2. Melhorar skeleton/loading nos stores**
- Nos stores Zustand (`vagasStore`, `adminStore`), inicializar `loading: true` e exibir skeletons adequados nas páginas enquanto carrega
- Garantir que páginas como `AdministracaoPage` e `VagasPage` usem o estado `loading` para mostrar skeleton em vez de tela em branco

**3. Prefetch de dados no AppLayout**
- No `AppLayout.tsx`, fazer prefetch dos dados principais (perfil, vagas) ao montar o layout, assim quando o usuário navegar para qualquer página os dados já estarão disponíveis

### Arquivos afetados
- `src/App.tsx` — configurar QueryClient com staleTime/gcTime
- `src/components/AppLayout.tsx` — adicionar prefetch de dados
- `src/store/vagasStore.ts` e `src/store/adminStore.ts` — loading inicial
- Páginas principais — usar skeleton durante loading

