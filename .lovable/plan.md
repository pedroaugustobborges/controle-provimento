
## Plano: Remover colunas da tabela Status das Vagas

### Alteração
No `src/pages/UnidadePortalPage.tsx`, na tabela da aba "Status das Vagas":
- Remover os `TableHead` e `TableCell` de: **Analista Responsável**, **Data de Abertura** e **SLA**
- Manter: Requisição, Unidade, Cargo, Etapa, Status
- Remover a função `calcDiasAberto` se não for utilizada em nenhum outro local do arquivo

### Arquivo alterado
- `src/pages/UnidadePortalPage.tsx`

### Sem alteração de banco de dados
