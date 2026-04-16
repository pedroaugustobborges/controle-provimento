

## Plano: Redesenhar gráficos do Dashboard de Convocações com visual premium

### Contexto
O `ConvocacoesDashboardPage.tsx` usa `ResponsiveContainer` do Recharts diretamente, com cores hardcoded e linhas de grid visíveis. O projeto já possui o componente `ChartContainer` em `src/components/ui/chart.tsx` que padroniza a aparência dos gráficos.

### Alterações em `src/pages/ConvocacoesDashboardPage.tsx`

1. **Migrar para `ChartContainer`** — substituir `ResponsiveContainer` pelo componente `ChartContainer` do projeto, definindo `ChartConfig` para cada gráfico
2. **Paleta de cores premium** — usar cores HSL consistentes com o tema do sistema (primary, muted, accent), com gradientes sutis nos gráficos de barras
3. **Remover/suavizar grid lines** — remover `CartesianGrid` ou torná-las quase invisíveis com opacidade baixa
4. **Usar `ChartTooltipContent`** — substituir o `Tooltip` genérico do Recharts pelo tooltip estilizado do projeto
5. **Barras com bordas arredondadas** — aplicar `radius` maior nos `Bar` components
6. **Cards com visual refinado** — adicionar sombras suaves, espaçamento melhorado e tipografia premium nos metric cards
7. **Gráfico de pizza** — aplicar cores do tema, remover labels desconfigurados e usar `ChartLegendContent` estilizado

