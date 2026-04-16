
## Problema
Ao tentar redefinir a senha da usuária Luana (e potencialmente outras), o frontend recebe `Edge Function returned a non-2xx status code` sem detalhes do erro real.

## Causa
A edge function `admin-user-management` faz `throw error` no caso `reset_password`, o que cai no `catch` final retornando status 500. Como o Supabase SDK descarta o body em respostas não-2xx em alguns casos, o usuário só vê a mensagem genérica — sem saber se é senha curta, usuário inexistente, política de senha do Supabase, etc.

Os logs da edge function (`admin-user-management`) só mostram "booted" — sem stack trace do erro real, o que confirma que precisamos de logging melhor.

## Plano

**Arquivo:** `supabase/functions/admin-user-management/index.ts`

1. **Sempre retornar status 200** com payload `{ ok: false, error: "mensagem detalhada" }` em caso de falha (padrão da Stack Overflow do Lovable), para que o cliente consiga ler a mensagem.
2. **Adicionar logs detalhados** (`console.log` / `console.error`) no caso `reset_password`: user_id recebido, tamanho da senha, resposta da API admin do Supabase.
3. **Validar entrada** no `reset_password`: garantir que `user_id` é UUID válido e `new_password` tem ≥ 6 caracteres, retornando erro claro antes de chamar a Admin API.
4. **Capturar erro específico** do `supabaseAdmin.auth.admin.updateUserById` e propagar a mensagem original (ex: "Password should be at least 6 characters", "User not found", etc.).

**Arquivo:** `src/pages/AdministracaoPage.tsx` (ou onde a chamada é feita — vou localizar)

5. **Tratar o novo formato** `{ ok, error }` no frontend: se `ok: false`, exibir `error` no toast em vez da mensagem genérica.

## Resultado esperado
- Toast mostrará a causa real (ex: "Senha deve ter no mínimo 6 caracteres", "Usuário não encontrado no auth", etc.)
- Logs da edge function permitirão diagnosticar problemas futuros rapidamente
- O reset de senha da Luana funcionará ou exibirá exatamente por que não funciona
