

## Plano — Corrigir Estrutura e Fluxo de Convocações

### 1. Adicionar submenu "Convocações Diárias" no sidebar
- Em `AppSidebar.tsx`, adicionar subitem "Convocações Diárias" dentro do item "Convocações", apontando para a rota correta.

### 2. Corrigir filtros de unidades por base em Convocações
- Verificar `ConvocacoesPage.tsx` para garantir que ao filtrar por "Goiânia", as unidades HECAD, HDS, HUGOL, AGIR e CRER apareçam corretamente.
- Remover filtros incorretos como "Resultado Final" e "Resultado Final da DS" que parecem vir do Banco de Talentos.

### 3. Remover "Validar Convocações" do menu/fluxo
- Remover o item "Validar Convocações" do sidebar (seção Controle Operacional ou onde estiver).
- Manter a rota `ValidacaoPage.tsx` apenas se necessário para redirecionamento, ou removê-la completamente.
- A validação que permanece é apenas "Validação de Edital".

### 4. Ajustar fluxo: convocação criada → aparece direto em Convocações Diárias
- Verificar que o `ConvocacaoDialog.tsx` ao criar convocação já insere no estado que alimenta a tela de Convocações Diárias (KanbanBoard) — sem etapa intermediária de validação.

### Arquivos afetados
- `src/components/AppSidebar.tsx`
- `src/pages/ConvocacoesPage.tsx`
- `src/pages/ValidacaoPage.tsx` (possível remoção)
- `src/App.tsx` (rota de validação)

