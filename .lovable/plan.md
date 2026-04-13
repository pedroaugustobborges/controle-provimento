
## Plano: Corrigir cor permanente dos cabeçalhos das tabelas

### Problema
O componente `TableHeader` em `src/components/ui/table.tsx` define `bg-[#221f44]` e `[&_tr]:hover:bg-[#221f44]` — mas o `TableRow` tem `hover:bg-slate-50/50` como estilo padrão. No estado sem hover, o `TableRow` dentro do header não tem fundo escuro explícito, ficando esbranquiçado. A cor escura só aparece no hover porque o `[&_tr]:hover:bg-[#221f44]` do `TableHeader` entra em ação.

### Solução
No `src/components/ui/table.tsx`, alterar o `TableHeader` para forçar o fundo escuro nos `<tr>` filhos **permanentemente**, não apenas no hover:

**De:** `[&_tr]:hover:bg-[#221f44]`  
**Para:** `[&_tr]:bg-[#221f44] [&_tr]:hover:bg-[#221f44]`

Isso garante que o `<tr>` dentro do header sempre tenha fundo escuro, sobrescrevendo o `hover:bg-slate-50/50` do `TableRow`.

### Arquivo alterado
- `src/components/ui/table.tsx` (apenas o `TableHeader`)

### Sem alteração de banco de dados
