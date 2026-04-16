
## Problema
No Dashboard de Convocações, os rótulos (labels) dos gráficos não estão aparecendo — provavelmente nos eixos das barras (Top 5 Unidades, Top 5 Cargos) e/ou na legenda do gráfico de pizza (Distribuição por Status).

## Causa provável
No `ConvocacoesDashboardPage.tsx`:
- Os `YAxis` das barras horizontais usam `width={130}` e `width={150}` com `fontSize: 10` — nomes longos de unidades/cargos em maiúsculas podem estar sendo truncados ou não exibidos por falta de espaço.
- Os ticks podem estar sendo cortados por margens insuficientes.
- A legenda da pizza pode não estar renderizando os nomes corretamente.

## Plano de correção

1. **Aumentar largura do YAxis** nos dois gráficos de barras (de 130/150 para ~180) para acomodar nomes longos como "TEIA APARECIDA" ou "POLICLÍNICA".
2. **Adicionar formatador de tick** que trunca nomes muito longos com reticências, garantindo que sempre apareçam.
3. **Aumentar margem esquerda** dos `BarChart` para dar respiro ao label.
4. **Garantir legenda visível** no `PieChart` com os nomes dos status e cores correspondentes.
5. **Adicionar rótulos de valor** (LabelList) nas pontas das barras para mostrar o número de convocações de cada item diretamente no gráfico.

## Arquivo afetado
- `src/pages/ConvocacoesDashboardPage.tsx` (único arquivo)

## Resultado esperado
- Nomes de unidades e cargos visíveis ao lado de cada barra (com truncamento elegante se muito longos).
- Valor numérico aparecendo no fim de cada barra.
- Legenda da pizza mostrando claramente cada status com sua cor.
