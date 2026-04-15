

## Plano: Corrigir dados desatualizados na tabela de Usuários

### Diagnóstico
A tabela de Usuários na aba "Usuários" da página de Administração exibe dados de perfil/cargo e nome/email que podem estar desatualizados. As causas prováveis:

1. **Email não sincronizado**: O campo `email` na tabela `profiles` pode não estar sincronizado com o email real do `auth.users` (ex: se o email foi alterado via auth mas não no profiles)
2. **Trigger de sincronização ausente**: Não existe um trigger para manter `profiles.email` atualizado quando o email muda no auth
3. **Dados antigos**: Perfis criados antes das últimas alterações podem ter campos vazios ou desatualizados

### Solução

**1. Forçar re-fetch ao entrar na aba de Usuários**
- Garantir que `fetchUsers()` seja chamado ao clicar na aba "Usuários", não apenas no mount da página

**2. Sincronizar email do auth com profiles**  
- No `fetchCurrentProfile`, atualizar o `email` no profiles se estiver diferente do auth
- Adicionar trigger de sincronização no banco para manter email/metadata em sync

**3. Adicionar botão de atualizar na tabela**
- Botão "Atualizar lista" para forçar refetch manual quando necessário

### Arquivos afetados
- `src/pages/AdministracaoPage.tsx` — re-fetch ao trocar tab + botão atualizar
- `src/store/adminStore.ts` — melhorar `fetchCurrentProfile` com sync de email

