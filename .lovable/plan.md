

## Plano: Corrigir terminologia, contraste e layout do Dashboard

### Arquivo: `src/pages/DashboardPage.tsx`

**1. Terminologia dos cards:**
- Renomear "Candidatos Prorrogados" → "Bancos Prorrogados"
- Renomear "Candidatos Vencidos" → "Bancos Vencidos"  
- Remover/reformular subtexto redundante do card "Cadastro Reserva"
- Reformular subtexto do card "Vagas em Atraso" para algo mais objetivo

**2. Contraste visual:**
- Adicionar `bg-white border border-slate-200 shadow-sm` nos cards de estatísticas para diferenciá-los do fundo
- Adicionar fundo branco com borda/sombra no container do gráfico para separação visual

**3. Simplificar layout da página:**
- Remover seção "Painel Operacional" (indicador verde piscante)
- Remover seção "Monitoramento Estratégico" (parte inferior)
- Manter apenas "Visão Geral do Provimento" com cards + gráfico, usando layout limpo do estilo do painel operacional removido

