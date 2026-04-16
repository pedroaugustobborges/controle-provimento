

## Plano: Corrigir drag-and-drop no Kanban de Convocações

### Problema
O Kanban Board (`KanbanBoard.tsx`) não persiste a movimentação de cards. Ao arrastar um card entre colunas, ele volta à posição original. Isso acontece porque o componente recebe `convocacoes` como prop e usa `initialConvocacoes` diretamente para renderizar — mas a atualização via `updateConvocacao` no store pode não estar refletindo nos dados exibidos se o componente pai não re-renderiza com os dados atualizados.

### Investigação necessária
1. Verificar como `ConvocacoesPage.tsx` passa as convocações para o `KanbanBoard` — se usa dados do store ou dados locais
2. Verificar se `updateConvocacao` no `vagasStore` está realmente atualizando o estado que alimenta o Kanban
3. Verificar se o modal de confirmação de movimentação está funcionando (o drag-and-drop exige confirmação via dialog antes de efetivar)

### Correção prevista
- Garantir que o `KanbanBoard` leia os dados diretamente do store (ou que o componente pai repasse dados reativos do store)
- Garantir que após `confirmMove()`, o estado do store seja atualizado e o componente re-renderize com os novos dados
- Se necessário, remover a prop `initialConvocacoes` e usar dados do store diretamente dentro do componente

### Arquivos a alterar
- `src/components/KanbanBoard.tsx` — lógica de renderização e atualização
- `src/pages/ConvocacoesPage.tsx` — verificar como os dados são passados ao Kanban
- `src/store/vagasStore.ts` — verificar `updateConvocacao`

