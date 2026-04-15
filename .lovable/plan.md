

## Plano: Corrigir modal de Suporte Técnico na Sidebar

### Problema
O botão "Suporte Técnico" na sidebar abre um modal que busca dados da tabela `support_configs` (vazia), quando deveria buscar os analistas administrativos da tabela `profiles` com `regiao_suporte` definida — os mesmos dados que a aba Suporte em Administração.

### Correção em `src/components/AppSidebar.tsx`

**1. Buscar analistas do `profiles`** — No modal (linhas 460-487), substituir a lógica que usa `supportConfigs` por uma query que busca usuários com `cargo = 'Analista Administrativo'` e `regiao_suporte` preenchido e `status = 'ativo'`.

**2. Exibir por região** — Agrupar em 2 seções:
- **Goiás e Espírito Santo** (`regiao_suporte = 'go_es'`)
- **Demais Unidades** (`regiao_suporte = 'demais'`)

**3. Mostrar dados reais** — Nome, email de cada analista responsável pela região.

### Arquivo afetado
- `src/components/AppSidebar.tsx` — modal de suporte

