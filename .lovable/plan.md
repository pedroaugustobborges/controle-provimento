
## Plano de execução

### 1. Investigação
- Localizar a tela de Observações (provavelmente em `UnidadePortalPage.tsx` ou componente relacionado) e identificar a coluna desalinhada.
- Localizar a tela de Convocações Diárias (`AgendaDiaria.tsx` / `ConvocacoesPage.tsx`) e o modelo de dados da observação.
- Localizar o link/menu "Portal Unidade" (provavelmente em `AppSidebar.tsx`).

### 2. Implementação
- **Layout**: corrigir classes Tailwind da coluna do nome (largura, alinhamento, truncate).
- **Observações visíveis ao analista**: adicionar coluna/ícone na Agenda Diária exibindo `observacoes` da convocação, com popover para texto completo.
- **Nova aba**: trocar `<NavLink to="/portal-unidade">` por `<a href="/portal-unidade" target="_blank" rel="noopener noreferrer">` no item do sidebar.
- **URL**: confirmar com o usuário (hífen/sem separador) antes de alterar a rota no `App.tsx`.

### 3. Validação
- Confirmar layout responsivo da coluna.
- Testar fluxo: unidade digita observação → analista vê em Convocações Diárias.
- Confirmar abertura em nova aba.

### Pergunta de confirmação
Sobre a URL do Portal Unidade — qual formato prefere?
- `/portal-unidade` (atual, padrão web)
- `/portalunidade` (sem separador)
- `/portal%20unidade` (com espaço codificado — não recomendado)
