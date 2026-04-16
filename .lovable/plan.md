

## Plano: Botão de atalho PCD no card de resumo de Vagas

### Alteração em `src/pages/VagasPage.tsx`
- No card de resumo "Vagas em Andamento" (seção de stats cards no topo da página), adicionar um botão compacto com:
  - Ícone `Accessibility` do Lucide React (símbolo PCD)
  - Tooltip "Vagas PCD"
  - `onClick` → `navigate('/vagas?filtro=pcd')` ou `setSearchParams({ filtro: 'pcd' })`
- Posicionar o botão no canto superior direito ou ao lado do valor numérico do card
- Estilo: botão pequeno (`size="icon"` ou `size="sm"`), variante `ghost` ou `outline`, com cor acessível (ex: azul/roxo)

