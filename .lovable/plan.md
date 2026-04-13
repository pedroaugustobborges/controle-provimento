
## Plano: Status completo, alinhamento e filtros em Observações

### Alteração 1: Expandir tabela "Status das Vagas"
Adicionar colunas à tabela de status: **Requisição** (`numero_requisicao`), **Unidade** (`unidade`), **Etapa** (`etapa`), **Analista** (`analista_responsavel`), além das já existentes (Cargo, Status, Data Abertura, SLA). Ajustar padding/alinhamento para consistência com os cabeçalhos.

### Alteração 2: Alinhar tabelas em todas as abas
Padronizar `px-6 py-4` em todas as `TableCell` e garantir que `TableHead` e `TableCell` usem o mesmo padding horizontal para alinhamento correto.

### Alteração 3: Adicionar filtros na aba Observações
- Adicionar state `obsFilterUnidade` e `obsFilterDate`
- Renderizar acima da tabela: um `Select` para filtrar por unidade e um `Popover` com calendário para filtrar por data de convocação
- Aplicar filtros no `allFilteredConvocacoes` antes de renderizar as linhas

### Arquivo alterado
- `src/pages/UnidadePortalPage.tsx`

### Sem alteração de banco de dados
