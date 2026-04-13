
## Plano: Corrigir dados reais e layout na aba Status das Vagas

### Alteração 1: Garantir dados reais da tabela `vagas`
No `UnidadePortalPage.tsx`, revisar a renderização da tabela de Status para que todas as colunas (`unidade`, `cargo`, `analista_responsavel`, `data_abertura`, `status`) usem diretamente os campos do objeto vaga vindo do store/banco, sem fallbacks fictícios ou mapeamentos hardcoded.

### Alteração 2: Corrigir cálculo do SLA
Recalcular o SLA como a diferença em dias corridos entre `data_abertura` (parseada corretamente) e a data atual (ou `data_conclusao` se existir). Tratar campos vazios ou inválidos mostrando "—" em vez de "0 dias".

### Alteração 3: Ajustar layout da tabela
- Adicionar `whitespace-nowrap` e/ou `min-w-[150px]` nas colunas de Unidade, Cargo e Analista para evitar truncamento.
- Garantir que a tabela tenha scroll horizontal em telas menores (`overflow-x-auto`).
- Ajustar padding consistente em todas as células.

### Arquivo alterado
- `src/pages/UnidadePortalPage.tsx`

### Sem alteração de banco de dados
Os campos necessários já existem na tabela `vagas`.
