

## Plano de Implementação — Detecção e Seleção da Linha de Cabeçalho na Importação Excel

### Arquivo principal a modificar
- `src/components/ImportExcelDialog.tsx`

### Mudanças

**1. Novo estado para linha de cabeçalho**
- Adicionar `headerRow` (number, default 0) ao state do componente
- Adicionar `rawPreview` (any[][]) para armazenar as primeiras 10 linhas brutas da aba

**2. Modificar etapa "sheets" — adicionar pré-visualização + seletor**
- Após selecionar aba(s), ao lado da lista de abas, renderizar uma tabela com as primeiras 10 linhas da primeira aba selecionada (usando `XLSX.utils.sheet_to_json(sheet, { header: 1 })`)
- Cada linha mostra seu número (1-based) na coluna da esquerda
- A linha selecionada como cabeçalho fica highlighted (bg-primary/10 + ring)
- Adicionar seletor numérico: "Qual linha contém os títulos?" com opções 1-10
- Adicionar dica contextual abaixo do seletor
- Implementar função `detectHeaderRow()` que analisa as primeiras 10 linhas e escolhe a que tem mais células texto distintas

**3. Modificar `startMapping()`**
- Usar `headerRow` para extrair headers da linha correta (em vez de sempre linha 0)
- Ao gerar `sheet_to_json`, passar `{ range: headerRow }` para que xlsx trate essa linha como header
- Isso corrige automaticamente os nomes nos dropdowns de mapeamento

**4. Modificar `generatePreview()` e `detectDuplicates()`**
- Passar `{ range: headerRow }` em todas as chamadas `sheet_to_json` para consistência

**5. Ajuste no auto-mapping**
- Melhorar a lógica de matching fuzzy dos nomes de campo para lidar com variações comuns (ex: "Nº de vagas" → `numero_vagas`, "Dt Abertura" → `data_abertura`)

**6. Step indicator**
- A etapa "sheets" agora inclui a sub-funcionalidade de seleção de cabeçalho (não precisa de step separado no indicador, apenas UI expandida)

### Fluxo atualizado
1. Selecionar arquivo → 2. Escolher abas + **selecionar linha de cabeçalho** (com preview) → 3. Mapear campos → 4. Prévia → 5. Duplicatas → 6. Resumo

