

## Plano: Menus visíveis + Gráfico Top 5 Cargos

### Alteração 1: Mostrar nomes nas abas
No `UnidadePortalPage.tsx`, remover a classe `hidden xs:inline` dos `<span>` dentro dos `TabsTrigger`, substituindo por texto sempre visível. Em mobile, usar nomes curtos via classes responsivas.

### Alteração 2: Substituir gráfico "Convocações por Unidade" por "Top 5 Cargos"
- Adicionar um `useMemo` que agrupa `filteredVagas` por `cargo`, conta ocorrências, ordena decrescente e pega os 5 primeiros.
- Substituir o segundo `<Card>` de gráfico (convByUnitData) por um BarChart horizontal usando os dados de top 5 cargos.
- Aplicar cores distintas por barra usando `<Cell>` + paleta de cores.
- Usar o mesmo `CustomChartTooltip` existente.

### Arquivo alterado
- `src/pages/UnidadePortalPage.tsx`

### Sem alteração de banco de dados

