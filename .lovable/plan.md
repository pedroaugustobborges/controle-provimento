
## Plano: Corrigir regressões — sidebar, agenda, histórico e auditoria

### Alteração 1: Remover avatar/foto da sidebar inferior
No `src/components/AppSidebar.tsx` (linhas 420-451), no `SidebarFooter`, remover o bloco do avatar (imagem/ícone com initiais) que aparece junto ao nome do usuário. Manter apenas o nome, perfil, botões "Acessar Perfil" e "Sair". A foto fica somente no header superior direito (AppLayout).

### Alteração 2: Corrigir texto cortado "Agenda Demais Unidades" na sidebar
No `src/components/AppSidebar.tsx` (linha 117), o submenu item `'Agenda Demais Unidades'` pode estar sendo cortado pelo `whitespace-nowrap`. Ajustar para permitir quebra ou reduzir o texto para `'Demais Unidades'` no submenu. Verificar também no `PageHeader` em `ConvocacoesPage.tsx` (linha 257).

### Alteração 3: Corrigir histórico de acessos no popover
No `src/components/AccessHistoryPopoverContent.tsx`, a query usa `as any` para contornar tipos. Verificar se a RLS policy de `user_sessions` está permitindo a leitura para o perfil logado (a policy "Admins can view all user sessions" usa `profiles.perfil = 'Administrador'` — confirmar que o usuário logado tem exatamente esse perfil). Se o problema for de tipo TypeScript causando query incorreta, corrigir o casting.

### Alteração 4: Corrigir dados de auditoria no módulo Relatórios
No `src/pages/RelatoriosPage.tsx`, a query de `audit_logs` tem `.limit(500)`. Se os logs mais recentes não aparecem, pode ser que a RLS policy (`has_role(auth.uid(), 'admin')`) esteja restringindo. Verificar se o usuário tem a role `admin` na tabela `user_roles`. Se não tiver, a query retorna vazio. Ajustar a policy ou garantir que o usuário tenha a role correta. Também verificar se o `useAudit` hook está realmente inserindo no banco (ele usa `addAuditLog` do store local, não do Supabase — pode ser que os logs não estejam sendo persistidos no banco).

### Arquivos alterados
- `src/components/AppSidebar.tsx`
- `src/components/AccessHistoryPopoverContent.tsx`
- `src/pages/RelatoriosPage.tsx`
- `src/pages/ConvocacoesPage.tsx` (se necessário ajustar título da agenda)

### Sem alteração de banco de dados
