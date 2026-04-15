

## Plano: Substituir dados fictícios do Suporte Técnico por dados reais dos analistas

### Problema
A aba "Suporte Técnico" na página de Administração exibe contatos fictícios hardcoded ("Ricardo Oliveira", "Fernanda Souza") definidos como constantes no `adminStore.ts`. Esses dados precisam vir do banco de dados real.

### Solução

1. **Criar tabela `support_configs` no banco** para armazenar configurações de suporte (região, responsável, email, teams, unidades, status)

2. **Atualizar `adminStore.ts`**:
   - Criar `fetchSupportConfigs()` que busca da tabela `support_configs`
   - Remover `defaultSupportConfigs` hardcoded
   - Adicionar `addSupportConfig` e `updateSupportConfig` com persistência no banco

3. **Atualizar `AdministracaoPage.tsx`**:
   - Chamar `fetchSupportConfigs()` ao entrar na aba "Suporte"
   - Implementar o botão "Novo Suporte" para cadastrar configurações reais
   - Implementar o botão "Editar" para atualizar configurações existentes

4. **Seed inicial**: Inserir dados iniciais vazios ou permitir que o admin cadastre os contatos reais pela interface

### Arquivos afetados
- Nova migration SQL: criar tabela `support_configs` com RLS
- `src/store/adminStore.ts` — fetch/add/update do banco
- `src/pages/AdministracaoPage.tsx` — formulários de criação/edição

