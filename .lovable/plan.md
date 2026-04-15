

## Plano: Padronizar cabeçalho da tabela "Vagas sem Movimentação"

### Diagnóstico necessário
Preciso localizar onde a tabela "Vagas sem Movimentação" é renderizada para verificar se usa o componente `Table` padrão ou tem estilos customizados no header.

### Alterações previstas

**Arquivo a identificar (provavelmente `DashboardPage.tsx` ou `VagasPage.tsx`):**
- Garantir que a tabela usa `TableHeader`/`TableHead` de `@/components/ui/table` sem classes extras que sobrescrevam o estilo padrão (fundo `#221f44`, texto branco uppercase `11px` bold)
- Remover quaisquer classes inline que alterem cor de fundo, cor de texto ou tamanho de fonte do cabeçalho

O componente `Table` em `src/components/ui/table.tsx` já define o estilo correto — basta garantir que não há sobreposição.

