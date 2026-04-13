

## Plano: Corrigir aba Pendentes e agrupar Vitória no filtro de Demais Unidades

### Problemas identificados

1. **Aba "Pendentes"** no sidebar (`AppSidebar.tsx` linha 119) aponta para `?tab=pending`, mas `ConvocacoesPage` só reconhece 'kanban', 'list' e 'diaria'. Como 'pending' não é reconhecido, o componente cai no view padrão ('diaria') sem filtro de região, mostrando os mesmos dados da Agenda Goiânia.

2. **Vitória no filtro "Demais Unidades"**: Quando `selectedRegiao === 'outras'`, o dropdown lista individualmente 'VITÓRIA', 'SÃO PEDRO' e 'SUÁ'. O correto é mostrar **"Vitória"** como opção única que, ao ser selecionada, filtra convocações de ambas as unidades (SUÁ e SÃO PEDRO).

### Alterações

**`src/pages/ConvocacoesPage.tsx`**:
1. Adicionar `'pending'` como view válida (linha 89)
2. Criar uma nova seção de renderização para `view === 'pending'` que mostra apenas convocações com `status === 'pendente'` — sem filtro de região, mostrando **todas** as pendentes do usuário
3. Alterar o `useMemo` de `unidades` (linhas 126-134): quando `selectedRegiao === 'outras'`, usar lista que agrupa Vitória: `['POLICLÍNICA', 'JATAÍ', 'Vitória', 'DOURADOS', 'CHS', 'HMSA', 'HRCAC', 'TEIA CEN', 'TEIA PIN', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3']`
4. Alterar `matchesUnidadeFilter` (linhas 137-149): quando `selectedUnidade === 'Vitória'`, retornar `true` se a unidade da convocação for 'SUÁ', 'SÃO PEDRO' ou 'VITÓRIA' (case-insensitive)

**`src/lib/convocacaoUtils.ts`**:
5. Criar constante `UNIDADES_OUTRAS_AGRUPADAS` que substitui 'VITÓRIA', 'SÃO PEDRO', 'SUÁ' por apenas 'Vitória'
6. Criar constante `UNIDADES_VITORIA = ['SÃO PEDRO', 'SUÁ']` para uso no filtro

Nenhuma alteração de banco de dados necessária.

