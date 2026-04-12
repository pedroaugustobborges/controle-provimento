

## Plano de Implementação

### Objetivo
Adicionar a seção de "Unidades Vinculadas" com seleção por região no formulário de **criação** de novo usuário, replicando e melhorando a funcionalidade que já existe na edição.

### Alterações em `src/pages/AdministracaoPage.tsx`

1. **Adicionar constantes de regiões** no topo do arquivo:
   - `REGIOES` com dois grupos: Goiás (10 unidades) e Vitória/ES (2 unidades: SÃO PEDRO, SUÁ)

2. **Criar função `toggleRegion`** que seleciona/deseleciona todas as unidades de uma região de uma vez

3. **Inserir seção de Unidades Vinculadas no formulário de criação** (entre a seção de módulos e permissões), contendo:
   - Switch "Visualizar todas as unidades"
   - Botões de seleção rápida por região (Goiás / Vitória)
   - Grid de checkboxes individuais por unidade (desabilitados quando "todas" está ativo)

4. **Garantir que os dados são enviados** na criação do usuário (já existem os campos `visualiza_todas_unidades` e `unidades_vinculadas` no estado `newUser`)

Nenhuma alteração de banco de dados é necessária — os campos já existem na tabela `profiles`.

