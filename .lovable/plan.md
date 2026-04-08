

## Plano de Implementação

### 1. Redesign do Header Superior (`AppLayout.tsx`)
- Substituir o breadcrumb minimalista por um header mais rico e visualmente atraente
- Adicionar saudação contextual ("Bom dia/Boa tarde, Ana Paula") com base no horário
- Tornar a busca mais proeminente com um input visível estilizado
- Redesenhar o indicador de sync com chip mais elegante
- Melhorar o breadcrumb com ícones e melhor contraste/tipografia
- Adicionar gradiente sutil ou fundo com mais personalidade

### 2. Criar hook/utilitário de permissões (`src/hooks/usePermissions.ts`)
- Criar um hook `usePermissions()` que lê o `currentUser` do `adminStore`
- Expor funções como `canImport()`, `canManageUsers()`, `canDeleteRecords()`, `canEditSettings()`, `canAccessAdmin()`
- Regras baseadas no perfil (`Admin`, `Gerência` = acesso total; `Coordenação`, `Supervisão`, `Analista`, `Assistente` = restrito) combinadas com as flags booleanas do usuário (`pode_incluir_registros`, `pode_excluir_requisicoes`, etc.)

### 3. Aplicar controle de visibilidade nos componentes
- **`AppSidebar.tsx`**: Ocultar itens "Importações" e "Administração" para perfis sem permissão
- **Páginas de Vagas e Banco de Talentos**: Ocultar botões de importação e ações administrativas com base nas permissões
- **`ImportacoesPage.tsx`**: Redirecionar ou mostrar mensagem de acesso negado se o usuário não tiver permissão

### 4. Arquivos modificados
- `src/components/AppLayout.tsx` — redesign completo do header
- `src/hooks/usePermissions.ts` — novo hook de permissões
- `src/components/AppSidebar.tsx` — controle de visibilidade dos menus
- `src/pages/VagasPage.tsx` — ocultar botões admin
- `src/pages/BancoTalentosPage.tsx` — ocultar botões admin
- `src/pages/ImportacoesPage.tsx` — proteção de acesso

