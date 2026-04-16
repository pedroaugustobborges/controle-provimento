

## Plano: Navegação contextual com atalhos entre filtros de Vagas

### Alteração em `src/pages/VagasPage.tsx`

**1. Filtragem da listagem principal**
- Quando `filtro` não está definido (Controle de Vagas padrão), excluir da listagem as vagas que são TEIAs e as vagas PCD
- Quando `filtro=teias`, mostrar apenas vagas TEIAs
- Quando `filtro=pcd`, mostrar apenas vagas PCD (já funciona assim)

**2. Botões de atalho contextuais no card de resumo**
- **Sem filtro (padrão):** Exibir 2 botões — ícone PCD (`Accessibility`) e ícone TEIAs (ex: `Building2`) — que navegam para `/vagas?filtro=pcd` e `/vagas?filtro=teias`
- **`filtro=pcd`:** Exibir botão TEIAs + botão "Voltar ao Controle de Vagas" (`/vagas`). Sem botão PCD.
- **`filtro=teias`:** Exibir botão PCD + botão "Voltar ao Controle de Vagas" (`/vagas`). Sem botão TEIAs.

**3. Lógica de identificação de vagas TEIAs**
- Usar a lista de unidades TEIA já definida no projeto (unidades cujo nome contém "TEIA") para classificar vagas como TEIAs

