
## Plano — Corrigir fluxo Fila de Editais ↔ Redação de Edital

### Problema relatado pelo usuário
1. **Bug de envio**: ao puxar uma vaga de "Fila de Editais" para "Redação de Edital", a vaga **sai da Fila mas não aparece em Redação** (vaga "desaparece").
2. **Bug de devolução**: ao devolver uma vaga em "Redação de Edital", ela deveria **voltar para "Fila de Editais"**, mas isso não está acontecendo de forma visível.

### Hipótese técnica
- Quando o analista puxa para Redação, o código provavelmente grava `etapa='em_redacao'` mas **não atualiza `status_fluxo_edital`** (deixa em `encaminhado_edital` ou limpa para `null`), o que faz o filtro da Redação não capturá-la.
- O filtro atual da Redação (`FilaAnalistaEditalPage.tsx`) exclui `encaminhado_edital` e exige `status_fluxo_edital ∈ {em_redacao,...}` OU `etapa='em_redacao'` OU `edital_id IS NOT NULL`. Se algum handler grava combinação inconsistente, a vaga "some".
- A devolução de Redação→Fila pode estar gravando `encaminhado_edital` mas mantendo `etapa='em_redacao'`, causando confusão.

### Investigação (read-only)
1. `src/pages/FilaEditaisPage.tsx` — handler "puxar para Redação" e handler "devolver para Controle".
2. `src/pages/FilaAnalistaEditalPage.tsx` — handler "devolver para Fila", handler "iniciar redação" (se existir), e filtro `showInThisFlow`.
3. `src/store/vagasStore.ts` — métodos de update de status_fluxo_edital/etapa.
4. SQL: estado real dos 7 registros e quaisquer vagas com `etapa='em_redacao'` ou `edital_id IS NOT NULL` que não aparecem em nenhuma das duas listas.

### Correções planejadas
1. **Padronizar transições de estado** (regra única e clara):
   - **Controle → Fila**: `status_fluxo_edital='encaminhado_edital'`, `etapa=null`, salva `status_origem`.
   - **Fila → Redação (puxar)**: `status_fluxo_edital='em_redacao'`, `etapa='em_redacao'`, grava `analista_id`.
   - **Redação → Fila (devolver)**: `status_fluxo_edital='encaminhado_edital'`, `etapa=null`, limpa `analista_id`.
   - **Fila → Controle (devolver)**: restaura `status_origem`, limpa `status_fluxo_edital`, `etapa`, `edital_id`.

2. **Simplificar filtros** (mútua exclusão estrita por `status_fluxo_edital`):
   - **Fila de Editais**: `status_fluxo_edital === 'encaminhado_edital'`.
   - **Redação de Edital**: `status_fluxo_edital ∈ ['em_redacao','enviado_validacao','aprovado_administrativo','publicado']`.
   - Remover lógica tolerante (`etapa===em_redacao` OU `edital_id presente`) que mascarava bugs de gravação.

3. **Migration defensiva**: corrigir registros inconsistentes existentes (vagas com `etapa='em_redacao'` ou `edital_id` mas sem `status_fluxo_edital` válido).

4. **Arquivos a editar**:
   - `src/pages/FilaEditaisPage.tsx` (handler puxar para Redação — garantir gravação de `status_fluxo_edital='em_redacao'`).
   - `src/pages/FilaAnalistaEditalPage.tsx` (filtro estrito + handler devolver garantindo `encaminhado_edital`).
   - Migration SQL para reconciliar registros órfãos.

### Validação E2E
- Encaminhar vaga Controle → Fila (aparece em Fila ✅).
- Puxar vaga Fila → Redação (sai da Fila ✅, aparece em Redação ✅).
- Devolver vaga Redação → Fila (sai da Redação ✅, aparece na Fila ✅).
- Devolver vaga Fila → Controle (some das duas, status original restaurado ✅).
- Refresh em todas as etapas → estado persistente.

### Risco
Médio. Mexe em handlers e filtros das duas páginas + migration de reconciliação. Validação completa no preview após implementar.
