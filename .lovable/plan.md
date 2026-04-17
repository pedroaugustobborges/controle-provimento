
## Plano — Exibir observações da unidade na seção "Convocações Diárias" do Portal da Unidade

### 1. Investigação (read-only)
- Reler `src/pages/UnidadePortalPage.tsx` para localizar a seção "Convocações Diárias" e identificar:
  - De onde vêm as convocações exibidas (store / service / query).
  - Como o campo de observação é exibido (ou se está faltando).
- Reler `src/components/AgendaDiaria.tsx` (provável componente da agenda/convocações diárias) para conferir se renderiza `observacao`.
- Reler o fluxo de salvamento da observação (provavelmente em `AcompanhamentoModal.tsx` ou modal equivalente do Portal Unidade) para confirmar:
  - Nome real do campo no banco (`observacao`, `observacoes_unidade`, `obs_portal`, etc.).
  - Se o `update` no Supabase é feito corretamente.
- Conferir via `supabase--read_query`:
  - `SELECT column_name FROM information_schema.columns WHERE table_name='convocacoes';` para listar colunas reais.
  - `SELECT id, observacao FROM convocacoes WHERE observacao IS NOT NULL LIMIT 10;` para confirmar persistência.
- Conferir o mapeamento no `vagasStore`/`recruitmentService` — se o `select` traz a coluna e se o map para o tipo TS inclui o campo.

### 2. Hipóteses prováveis
- **Campo não selecionado**: query do Portal Unidade não inclui `observacao` no `select(...)`.
- **Mapeamento incompleto**: campo existe no banco mas o objeto TS não carrega.
- **Componente não renderiza**: `AgendaDiaria` (ou card de Convocações Diárias) não mostra a observação, ou condicional `{c.observacao && ...}` esconde por estar `null` em vez de string vazia.
- **Refresh ausente**: salvamento não dispara `fetchVagas({ force: true })` então a UI fica estática até reload.
- **Tabela errada**: observação está sendo gravada em uma tabela diferente (ex.: `convocacoes_observacoes`) e não está sendo joinada.

### 3. Correções (após aprovação)
1. **Service / Store** (`recruitmentService.ts` / `vagasStore.ts`):
   - Garantir que o `select` da query de convocações inclui o campo `observacao` (ou nome real).
   - Garantir que o tipo TS de `Convocacao` inclui `observacao?: string | null`.
2. **Componente da seção** (`AgendaDiaria.tsx` ou bloco interno do `UnidadePortalPage.tsx`):
   - Renderizar a observação no card/linha — bloco com label "Observação da unidade:" + texto, exibido só quando `observacao?.trim()`.
   - Estilo discreto (ícone `MessageSquare` + texto em `text-slate-600`).
3. **Modal de salvamento** (modal de observação no Portal Unidade):
   - Após salvar com sucesso, chamar `fetchVagas({ force: true })` para refletir o novo valor imediatamente.
   - Logar `console.error('[portal-unidade obs]', ...)` em qualquer falha.
4. **(Condicional)** Se a observação ficar em tabela separada, ajustar o select para fazer join/embed Supabase: `convocacoes(*, observacoes_unidade(*))`.

### 4. Validação
- Logar como usuário de unidade → abrir Portal Unidade → seção Convocações Diárias.
- Adicionar observação em uma convocação → confirmar exibição imediata sem reload.
- Recarregar a página → confirmar que a observação persiste.
- Conferir que outras unidades (sem acesso) não veem aquela observação (RLS).
- Conferir console sem erros e sem `permission denied`.

### 5. Pendências para confirmar antes de codar
- Qual é o **nome exato** da seção "Convocações Diárias" no Portal Unidade? (para localizar o componente certo — provavelmente `AgendaDiaria.tsx`).
- A observação é editada em qual modal/campo hoje? (Acompanhamento, Devolutiva, ou outro?).
- Deseja que a observação fique também visível para o **gestor/admin** vendo a mesma convocação fora do Portal Unidade, ou só dentro do Portal Unidade?
