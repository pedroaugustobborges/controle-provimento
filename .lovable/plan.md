

## Plano: Ajustes na Visão Geral (DashboardPage) e Cabeçalho

### Arquivos a modificar:

**1. `src/pages/DashboardPage.tsx`:**
- Remover botão "Relatórios Detalhados" do `actions` do PageHeader
- Remover card "Canceladas" do array `stats`
- Corrigir ícones: Cadastro Reserva → `UserCheck`, Mov. Interna → `ArrowLeftRight`, Banco de Talentos → `Users`
- Adicionar subtextos descritivos em todos os cards que não possuem (Fila de Editais, Em Andamento, Concluídas, Mov. Interna, Liderança)
- Alterar cor das barras do gráfico para azul do sidebar (`#1e3a5f` ou similar)
- Adicionar toggle "Por Unidade / Por Região" no gráfico com lógica de agrupamento por região
- Renomear "Alertas Ativos" → "Vagas em Atraso" com subtítulo explicativo
- Revisar lógica de `movimentacao_interna` para capturar todos os status relevantes

**2. `src/components/AppLayout.tsx` (ou componente do header/avatar):**
- Adicionar borda na cor do sidebar ao avatar do usuário
- Remover dropdown/menu do avatar (perfil, configurações, sair)
- Remover ícone decorativo do campo de busca se presente

**3. Verificar sincronização dos filtros:**
- Confirmar que `selectedRegion` e `selectedUnit` do `adminStore` são aplicados corretamente em todos os cálculos do dashboard (já parece estar com `filterByRegionAndUnit`, mas validar gráfico e alertas)

