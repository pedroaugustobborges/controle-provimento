
## Plano — Múltiplas datas na etapa Entrevista + Importação automática de cronograma via Word

### 1. Investigação
- Localizar o submenu **Redação de Edital** e o componente que gerencia as etapas (provavelmente em `EditaisPage.tsx` ou `ValidacaoEditaisPage.tsx`).
- Mapear o modelo atual da etapa Entrevista (campo de data único) e a estrutura de persistência no Supabase.
- Identificar onde adicionar o botão de upload de Word.

### 2. Frontend — Etapa Entrevista flexível
- Adicionar seletor (RadioGroup) com 3 opções: **Data única**, **Duas datas**, **Período**.
- Renderizar dinamicamente:
  - 1 input date (única)
  - 2 inputs date independentes (duas datas)
  - 2 inputs date com labels "Início" e "Fim" (período)
- Persistir como JSON estruturado: `{ tipo: 'unica' | 'duas_datas' | 'periodo', datas: string[] }`.

### 3. Backend — Migração
- Adicionar coluna `entrevista_config` (JSONB) na tabela de etapas do edital (ou ajustar coluna existente para suportar JSON).
- Manter compatibilidade com registros antigos (fallback para data única).

### 4. Parser de Word (.docx)
- Instalar/usar `mammoth` ou `docx` no client (parser leve em browser) — preferência por `mammoth` para extrair HTML/tabelas.
- Criar utilitário `src/lib/editalCronogramaParser.ts`:
  - Recebe `File` (.docx) → extrai HTML.
  - Localiza heading com "ANEXO" (regex case-insensitive, ignora acentos).
  - Procura próxima `<table>` cujo conteúdo cite "Cronograma de Seleção para o Cargo".
  - Mapeia colunas pelo cabeçalho: detecta índices de "ETAPA" e "DATA".
  - Para cada linha:
    - Normaliza nome da etapa (lowercase, sem acentos).
    - Faz match com etapas do sistema (lista pré-definida + fuzzy match simples).
    - Detecta padrão de datas: única (`dd/mm/yyyy`), múltiplas (`X e Y`, `X,Y`), período (`X a Y`, `X até Y`).
- Retorna estrutura: `[{ etapa: string, tipo: 'unica'|'duas_datas'|'periodo', datas: string[] }]`.

### 5. UI do upload
- Botão "Importar cronograma do Word" no topo do formulário de Redação.
- Componente `<CronogramaImportDialog />`:
  - Drag & drop / file input (.docx).
  - Após parse, exibe **tabela de prévia** com etapa detectada + datas + status (✅ matched / ⚠️ não encontrada).
  - Botão "Aplicar" preenche os campos do formulário.
  - Etapas sem match permanecem manuais.

### 6. Pendência com o usuário
**Aguardando arquivo Word de exemplo** para calibrar o parser (estrutura exata do "ANEXO", nomenclatura das etapas, formatos de data utilizados).

### 7. Validação
- Etapa Entrevista: alternar entre os 3 modos e salvar — confirmar persistência.
- Upload de Word de exemplo → validar extração correta de todas as etapas.
- Confirmar que datas múltiplas/período na Entrevista vêm com a modalidade correta auto-selecionada.
- Etapas ausentes no Word: confirmar que campo fica em branco sem quebrar o formulário.
