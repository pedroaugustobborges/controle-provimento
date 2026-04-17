
## Plano — Agrupamento real + múltiplos cronogramas

Usuário pulou as perguntas → assumo defaults sensatos:
- **Modelo**: FK `edital_id` em `vagas` (1 edital → N vagas). Simples, sem tabela de junção.
- **Cronogramas**: 100% independentes por cargo (JSONB `cronogramas_por_cargo` em `editais`).
- **Agrupamento**: mesma unidade obrigatória; tipo livre.

### A. Migration
- `ALTER TABLE editais ADD COLUMN cronogramas_por_cargo JSONB DEFAULT '{}'::jsonb`
- Confirmar/adicionar `vagas.edital_id UUID REFERENCES editais(id)` se não existir.

### B. Fila de Editais (`FilaEditaisPage.tsx` / `FilaAnalistaEditalPage.tsx`)
- Checkbox por linha + "selecionar todos" no header.
- Barra de ação fixa no rodapé quando ≥1 selecionado: "Enviar N cargos agrupados para Redação".
- Validação: bloquear seleção cruzada entre unidades (toast explicativo).
- Ação cria 1 rascunho de edital com array `vaga_ids` no state e navega para Redação.

### C. Redação de Editais (`EditaisPage.tsx`)
- Topo: campos comuns (número, ano, data abertura, observações).
- Tabs (1 por cargo) com campos específicos + cronograma próprio.
- Botão "+ Adicionar cargo" (busca vagas elegíveis da mesma unidade).
- Botão "Remover cargo" por aba.

### D. Aplicação de datas (corrigir bug + múltiplos cronogramas)
- **Bug**: investigar `handleApplyImport` — provável mismatch entre `cronogramaKey` do parser e `name` dos inputs RHF, ou falta de `setValue(..., { shouldDirty: true })`. Corrigir mapeamento.
- **`CronogramaImportDialog`**: novo modo múltiplo quando edital tem N cargos:
  - Mostra lista de cronogramas detectados no Word + lista de cargos do edital.
  - Auto-match por similaridade de nome de cargo; permite override manual via select.
  - Botão "Aplicar todos" preenche cronograma de cada aba de cargo.
- Modo single (1 cargo) continua funcionando como hoje.

### E. Validação
- Selecionar 3 cargos mesma unidade → enviar agrupado → Redação abre com 3 abas.
- Importar Word com 3 cronogramas → diálogo mapeia cada cronograma a um cargo → datas aparecem nos campos certos.
- Tentar agrupar cargos de unidades diferentes → bloqueia.
- Caso simples (1 cargo, 1 cronograma) continua funcionando.
- Salvar e reabrir edital → estado preservado.
