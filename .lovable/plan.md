
## Plano — Remover flash de estado vazio no Portal Unidade

### Diagnóstico
Hoje a página renderiza com estado inicial `0` / arrays vazios e só depois popula com dados do servidor. Falta um flag `isLoading` que diferencie "ainda carregando" de "carregado e vazio".

### Mudanças
1. **`src/pages/UnidadePortalPage.tsx`**
   - Adicionar flag `isLoading` (true até a primeira hidratação completar).
   - Enquanto `isLoading=true`: renderizar skeletons no lugar dos contadores, cards e tabela.
   - Só mostrar "Nenhum dado" quando `isLoading=false && data.length===0`.
   - Em refreshes subsequentes: manter dados antigos visíveis (stale-while-revalidate) e sobrepor um indicador discreto de "Atualizando…".

2. **Componentes de skeleton**
   - Reusar `src/components/ui/skeleton.tsx` (já existe no projeto).
   - Criar blocos de skeleton para: header com métricas, cards de resumo, linhas da tabela.

3. **Contadores numéricos**
   - Substituir `{count}` por `{isLoading ? <Skeleton className="h-6 w-10" /> : count}`.

4. **Estado de erro**
   - Se a hidratação falhar: exibir alerta com botão "Tentar novamente" em vez de cair em estado vazio.

### Validação
- DevTools → Network → Slow 3G → recarregar Portal Unidade → confirmar que só aparecem skeletons, nunca "0".
- Forçar erro de rede → confirmar mensagem de erro clara.
- Recarregar com dados em cache → confirmar que dados antigos permanecem visíveis durante o refresh.
