
## Plano — Refatorar importação de cronograma do Word

### 1. Investigação rápida
- Reler `FilaAnalistaEditalPage.tsx` para localizar o campo "Editar (arquivo Word)" acima da seção Cronograma e o botão duplicado "Importar do Word".
- Confirmar onde é feito o upload do arquivo principal e como reaproveitá-lo.
- Verificar tipos do schema do cronograma (campos existentes vs. novos campos de Análise Curricular).

### 2. Parser (`src/lib/editalCronogramaParser.ts`)
- **Múltiplos cronogramas**: varrer TODOS os títulos `Anexo ... Cronograma de Seleção para o Cargo de: ...`, capturar nome do anexo + cargo, e para cada um pegar a próxima `<table>` válida.
- **Novos matchers**:
  - `Inscrição` (singular) → `data_inicio_inscricao` + `data_fim_inscricao` (se vier período/2 datas).
  - `Resultado Preliminar da Avaliação Específica Online`
  - `Prazo para Recurso da Avaliação Específica Online`
  - `Resultado do Recurso da Avaliação Específica Online`
  - `Resultado Final da Avaliação Específica Online`
- **Etapas de Análise Curricular** (cargos médico/dentista):
  - `data_envio_titulos`
  - `data_resultado_preliminar_analise_curricular`
  - `data_recurso_analise_curricular`
  - `data_resultado_recurso_analise_curricular`
  - `data_resultado_final_analise_curricular`
- **Novo retorno**: `{ ok, errorMessage?, cronogramas: Array<{ anexo, cargo, etapas }> }`.
- Manter compatibilidade: se só houver 1, ainda é uma lista de 1 elemento.

### 3. Dialog (`src/components/CronogramaImportDialog.tsx`)
- Receber `cronogramas[]`.
- Se `length === 1`: comportamento atual (prévia + aplicar).
- Se `length > 1`: primeiro passo = seletor (radio/lista) com "Anexo X — Cargo Y (N etapas)"; após escolher, mostra prévia daquele cronograma e botão Aplicar.
- Botão "Trocar cronograma" para voltar ao seletor.

### 4. Integração (`src/pages/FilaAnalistaEditalPage.tsx`)
- **Remover** botão "Importar do Word" da seção Cronograma de Etapas.
- No `onChange` do input do campo "Editar (arquivo Word)" principal: ao receber `.docx`, chamar `parseCronogramaFromDocx` automaticamente; se `ok && cronogramas.length>0`, abrir o `CronogramaImportDialog` com os resultados.
- Aplicar as datas escolhidas no estado do cronograma (incluindo `entrevista_config` quando aplicável e novos campos de Análise Curricular).
- Toast informando "Cronograma detectado no Word — selecione o cargo" quando >1, ou "Cronograma aplicado" quando =1.

### 5. Schema (se necessário)
- Adicionar campos opcionais de Análise Curricular ao tipo do cronograma (frontend). Persistência: gravar como parte do JSON existente do cronograma (sem migração se o backend já aceita campos extras); caso contrário, planejar migração simples adicionando colunas/JSONB.

### 6. Validação
- Word com 1 cronograma padrão → auto-preenche sem modal.
- Word com 2-3 cronogramas (Médico + Dentista + Enfermeiro) → modal de seleção.
- Confirmar Inscrição singular + as 4 etapas que falhavam agora mapeadas.
- Cronograma de Médico/Dentista mostra etapas de Análise Curricular.
- Botão duplicado removido.
