

## Plano: Otimizar performance e corrigir layout

### Investigação necessária
1. Verificar `VagasPage.tsx` e `DashboardPage.tsx` — identificar queries lentas, chamadas redundantes e falta de paginação
2. Verificar `DashboardService.ts` — são 7 queries separadas executadas em série (sem paralelização)
3. Revisar se os últimos ajustes quebraram algum layout

### Alterações previstas

**Performance — `DashboardService.ts`:**
- Paralelizar as 7 queries com `Promise.all()` em vez de executá-las sequencialmente
- Adicionar tratamento de erro individual para cada query

**Performance — `VagasPage.tsx`:**
- Revisar a lógica de filtragem (especialmente o novo filtro "Com Banco" que pode estar fazendo chamadas extras por vaga)
- Implementar memoização com `useMemo` nos dados filtrados
- Garantir que skeleton/loading é exibido imediatamente

**Layout — Verificar regressões:**
- Revisar os arquivos alterados recentemente (`AppSidebar.tsx`, `VagasPage.tsx`, `RelatoriosPage.tsx`) para identificar problemas de layout

### Arquivos a alterar
- `src/services/dashboardService.ts`
- `src/pages/VagasPage.tsx`
- `src/pages/DashboardPage.tsx` (se necessário)

### Sem alteração de banco de dados

