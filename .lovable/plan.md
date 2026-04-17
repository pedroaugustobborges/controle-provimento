
## Plano — Agrupamento real de cargos na Publicação de Editais + múltiplos cronogramas em Redação

### Problema (3 frentes)
1. **Fila de Editais**: agrupamento atual não funciona — sempre envia só 1 cargo por vez para Redação. Falta seleção múltipla real.
2. **Redação de Editais**: não há suporte para múltiplos cargos no mesmo edital (hoje 1 formulário = 1 cargo).
3. **Datas do Word**: o parser lê as datas mas elas não são aplicadas aos campos do formulário; e quando há vários cronogramas (1 por cargo), só dá pra escolher um.

### Investigação necessária (read-only após aprovação)
- `src/pages/FilaEditaisPage.tsx` e `FilaAnalistaEditalPage.tsx` — entender como hoje "envia para Redação" e onde está o agrupamento quebrado.
- `src/pages/EditaisPage.tsx` (Redação) — estrutura do formulário, como recebe cargo selecionado, como aplica `CronogramaImportResult`.
- `src/components/CronogramaImportDialog.tsx` — hoje força escolher 1 cronograma só (`selectedIdx`), aplica via `onApply` em `values: Record<string,string>` plano.
- `src/lib/editalCronogramaParser.ts` + tipo `EntrevistaConfig` — confirmar saída do parser.
- Schema: tabelas `editais`, `vagas`, `edital_vagas` (se existir) — confirmar se um edital já suporta N vagas no banco ou se precisa migration.

### Decisões a confirmar com o usuário (antes de codar)
Pergunto via `ask_questions`:
1. **Modelo de dados**: 1 edital agrupando N vagas (relação edital↔vagas N:1 ou N:N) — preferência?
2. **Cronogramas múltiplos**: cada cargo do edital terá **seu próprio cronograma independente** (datas diferentes por cargo), ou um cronograma comum + ajustes pontuais?
3. **UX da fila**: checkboxes nas linhas + botão "Enviar selecionados para Redação como 1 edital", certo?

### Implementação (após decisões)

**Etapa A — Fila de Editais: seleção múltipla real**
- Adicionar checkbox por linha + checkbox "selecionar todos" no cabeçalho.
- Botão flutuante "Enviar N cargos agrupados para Redação" que cria 1 rascunho de edital com array de `vaga_ids`.
- Validar que cargos selecionados são compatíveis (mesma unidade? mesmo tipo? — confirmar regra com user).

**Etapa B — Redação de Editais: múltiplos cargos no mesmo edital**
- Adaptar formulário para aceitar lista de cargos (tabs ou accordion, um por cargo).
- Campos comuns do edital (número, ano, abertura) ficam no topo; campos por cargo (vagas, requisitos, salário) repetem.
- Botão "Adicionar outro cargo" para incluir manualmente além dos que vieram da fila.
- Migration se necessário: tabela `edital_cargos` (ou ajuste em `editais` para JSONB de cargos).

**Etapa C — Aplicação correta das datas + múltiplos cronogramas**
- Investigar por que `onApply` do `CronogramaImportDialog` não está populando os campos — provavelmente mismatch entre `cronogramaKey` retornado e `name` dos inputs no form, ou o `setValue` do react-hook-form não está sendo chamado/com `shouldDirty`.
- Adaptar `CronogramaImportDialog` para suportar **modo múltiplo**: quando o edital tem N cargos, permitir aplicar cada cronograma do Word ao cargo correspondente (matching automático por nome de cargo + override manual).
- Garantir que cada cargo no formulário recebe seu cronograma independente.

### Validação
- Selecionar 3 cargos na fila → enviar agrupado → abre Redação com 3 abas/seções de cargo.
- Importar Word com 3 cronogramas → diálogo permite mapear cada cronograma a um cargo → datas aparecem nos campos certos de cada cargo.
- Salvar edital → no banco fica 1 edital com 3 cargos vinculados, cada um com seu cronograma.
- Reabrir o edital → tudo volta corretamente.
- Continuar funcionando para o caso simples (1 cargo, 1 cronograma).

### Risco / escopo
Mudança grande: toca fila, formulário de redação, parser/diálogo de cronograma e provavelmente schema. Requer migration. Por isso as 3 perguntas acima são bloqueantes — sem elas, o modelo de dados pode sair errado.
