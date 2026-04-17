
## Plano de execução

### 1. Investigação
- Localizar o componente de edição de usuário (provavelmente em `AdministracaoPage.tsx` ou diálogo associado) — identificar o checkbox "Visualizar todas as unidades" e o estado condicional que renderiza (ou deveria renderizar) a lista de unidades.
- Localizar o botão "Sair" (em `AppSidebar.tsx` e `InactivityLogout.tsx`) e mapear o fluxo atual de logout.

### 2. Correção do bug — Edição de Unidades
- Garantir que o estado `viewAllUnits` (ou nome equivalente) controle corretamente a renderização condicional da lista.
- Buscar a lista completa de unidades do banco e renderizar como checkboxes quando `viewAllUnits === false`.
- Pré-marcar as unidades já vinculadas ao usuário em edição.
- Persistir a seleção ao salvar.

### 3. Modal de Confirmação + Animação de Logout
- Criar um componente `LogoutConfirmDialog` reutilizável usando `AlertDialog` do shadcn.
- Substituir o handler direto de `signOut()` no `AppSidebar.tsx` (e onde mais aparecer) para abrir o modal primeiro.
- Ao confirmar:
  - Exibir overlay full-screen com `Loader2` animado e texto "Saindo do sistema..."
  - Executar `signOut()` + limpeza de sessão (`user_sessions` update)
  - Redirecionar para `/login` apenas após conclusão
- Cobrir também o caso do `InactivityLogout.tsx` se aplicável.

### 4. Validação
- Testar edição de usuário: marcar/desmarcar "todas as unidades" e verificar lista aparecendo.
- Testar logout: confirmar modal → animação → redirecionamento.
