

## Plano: Corrigir layout Kanban + Criar Dashboard de Convocações

### 1. Corrigir layout do Kanban Board
**Arquivo:** `src/components/KanbanBoard.tsx`
- Ajustar o container flex para garantir que todas as 5 colunas sejam visíveis
- Reduzir `min-w` das colunas ou tornar responsivo para caber todas no viewport
- Garantir scroll horizontal funcional quando necessário

### 2. Criar Dashboard de Convocações
**Novo arquivo:** `src/pages/ConvocacoesDashboardPage.tsx`
- Painel com cards de métricas: total de convocações, por status (aceite, recusa, faltou, desistiu)
- Gráfico/lista: Top 5 unidades com mais convocações
- Gráfico/lista: Top 5 cargos mais convocados
- Distribuição por status (gráfico de pizza ou barras)
- Dados vindos da tabela `banco_candidatos` (que contém convocações)

### 3. Adicionar submenu no Sidebar
**Arquivo:** `src/components/AppSidebar.tsx`
- Adicionar item "Dashboard" no submenu de Convocações, após "Pendentes"
- Rota: `/convocacoes/dashboard`

### 4. Registrar rota
**Arquivo:** `src/App.tsx`
- Adicionar rota `/convocacoes/dashboard` apontando para `ConvocacoesDashboardPage`

