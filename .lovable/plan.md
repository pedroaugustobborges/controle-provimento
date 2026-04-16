

## Plano: Submenus "Unidades TEIAs" e "Vagas PCD" no Controle de Vagas

### Alterações

**1. Sidebar/Navegação (`src/components/AppSidebar.tsx`)**
- Adicionar sub-itens sob "Vagas":
  - **Todas as Vagas** → `/vagas`
  - **Unidades TEIAs** → `/vagas?filtro=teia` (ícone: `Building2`)
  - **Vagas PCD** → `/vagas?filtro=pcd` (ícone: `Accessibility`)

**2. Página de Vagas (`src/pages/VagasPage.tsx`)**
- Ler query param `filtro` da URL
- Se `filtro=teia`: filtrar vagas onde `unidade` contém "TEIA"
- Se `filtro=pcd`: filtrar vagas onde `cargo` contém "PCD" **ou** flag `is_pcd = true`
- Adicionar botões/tabs visuais no topo da página para alternar entre os 3 modos
- Ajustar título da página conforme o filtro ativo

**3. Formulário de Vaga (`src/components/AddVagaDialog.tsx`)**
- Adicionar checkbox **"Vaga PCD?"** (`is_pcd: boolean`)
- Adicionar checkbox **"Vaga TEIA?"** (`is_teia: boolean`) — preenchido automaticamente se a unidade selecionada contiver "TEIA", mas editável

**4. Banco de dados (migração)**
- Adicionar colunas à tabela `vagas`:
  - `is_pcd boolean DEFAULT false`
  - `is_teia boolean DEFAULT false`
- Atualizar registros existentes: `UPDATE vagas SET is_pcd = true WHERE cargo ILIKE '%pcd%'`
- Atualizar registros existentes: `UPDATE vagas SET is_teia = true WHERE unidade ILIKE '%teia%'`

**5. Tipos (`src/types/vaga.ts`)**
- Adicionar `is_pcd` e `is_teia` ao tipo `Vaga`

