
## Mudanças no Dashboard de Convocações

**1. Remover** o gráfico "Distribuição por Status" (PieChart).

**2. Adicionar** novo gráfico "Histórico de Convocações" (LineChart):
- Eixo X: datas (dia/mês)
- Eixo Y: quantidade de convocações no dia
- Tooltip ao passar o mouse: lista as unidades convocadas naquele dia + total
- Atualização automática conforme novos dados entram no banco

**3. Fonte de dados:** preciso confirmar qual coluna usar para a data da convocação. Verificarei no schema do `banco_candidatos` (provavelmente `data_convocacao` ou `updated_at`) e filtrarei apenas registros com status `CONVOCADO`.

**4. Ajustes de rótulos** já aplicados anteriormente serão mantidos nos gráficos de barras (Top Unidades / Top Cargos).

## Arquivo afetado
- `src/pages/ConvocacoesDashboardPage.tsx`

## Resultado esperado
- Gráfico de linha mostrando evolução diária de convocações
- Tooltip rico mostrando unidades de cada dia
- Gráfico de pizza removido
