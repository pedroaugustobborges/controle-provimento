

## Plano: Refinar visual do Dashboard de Convocações

### Arquivo: `src/pages/ConvocacoesDashboardPage.tsx`

1. **Labels em negrito** — Adicionar `fontWeight: 'bold'` nos ticks do `YAxis` dos gráficos de barras (nomes de unidades e cargos)

2. **Cores menos saturadas** — Reduzir saturação da paleta HSL em todos os gráficos:
   - Trocar cores como `hsl(221, 83%, 53%)` por versões mais suaves como `hsl(221, 55%, 58%)`
   - Aplicar tanto no `pieChartConfig`, `PIE_COLORS`, quanto nos configs de barras

3. **Legenda do gráfico de pizza** — O `ChartConfig` (`pieChartConfig`) só define 5 status fixos (CONVOCADO, CADASTRO RESERVA, VENCIDO, DESISTIU, FALTOU), mas os dados reais podem ter mais status. Tornar o config dinâmico: gerar o `pieChartConfig` a partir dos dados reais (`statusDistribution`) para que toda chave de status tenha label e cor na legenda

4. **Garantir todos os rótulos visíveis** — Verificar que `ChartTooltipContent` e `ChartLegendContent` recebem `nameKey="name"` corretamente para mapear cada entrada

