
## Plano: Restaurar cor padrão dos cabeçalhos das tabelas

### Problema
Os `TableHead` nas 3 abas do portal estão com classes customizadas (ex: `bg-slate-50/80`, `text-slate-500`) que sobrescrevem o estilo padrão escuro (`bg-[#221f44]`, texto branco) definido em `src/components/ui/table.tsx`.

### Solução
No `UnidadePortalPage.tsx`, remover as classes de cor/fundo customizadas dos `TableHead` em todas as abas (Status, Convocações, Observações), deixando apenas classes de layout (padding, etc.) para que herdem o estilo padrão do componente `TableHeader`/`TableHead`.

### Arquivo alterado
- `src/pages/UnidadePortalPage.tsx`

### Sem alteração de banco de dados
