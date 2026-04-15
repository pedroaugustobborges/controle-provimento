

## Plano: Unificar acesso do Portal e corrigir botão Salvar

### Parte 1 — Flag "acesso ao portal" no cadastro de usuário

1. **Adicionar coluna `acesso_portal_unidade` (boolean, default false)** na tabela `profiles` via migração
2. **Atualizar `src/types/auth.ts`** — adicionar `acesso_portal_unidade?: boolean` na interface `User`
3. **Atualizar formulário de criação/edição de usuário** em `AdministracaoPage.tsx` — adicionar checkbox "Habilitar acesso ao Portal da Unidade"
4. **Atualizar edge function `admin-user-management`** — incluir `acesso_portal_unidade` no create/update
5. **Atualizar `UnidadePortalPage.tsx`** — verificar `currentUser?.acesso_portal_unidade === true` (ou perfil com acesso total) no controle de acesso, usando as mesmas `unidades_vinculadas` do cadastro principal

### Parte 2 — Corrigir botão Salvar na devolutiva

1. **Em `UnidadePortalPage.tsx`** — criar estado `originalObs` que armazena o valor inicial de cada linha ao montar
2. **Comparar `obsEdits[id]` com `originalObs[id]`** — se forem iguais (nenhuma mudança real), desabilitar o botão Salvar (cinza/disabled)
3. **Só habilitar (verde)** quando houver diferença entre o estado editado e o original

### Arquivos afetados
- Migração SQL (nova coluna)
- `src/types/auth.ts`
- `src/pages/UnidadePortalPage.tsx`
- `src/pages/AdministracaoPage.tsx`
- `supabase/functions/admin-user-management/index.ts`

