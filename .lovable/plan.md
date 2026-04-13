

## Plano: Unificar unidades de Vitória na vinculação de usuários

### Problema
Em `UNIDADES_POR_REGIAO` (arquivo `src/lib/vagaUtils.ts`), a região "Vitória" lista `['SÃO PEDRO', 'SUÁ', 'UPA']` como unidades separadas. Na tela de Administração, ao vincular unidades a usuários, essas aparecem individualmente em vez de agrupadas sob "VITÓRIA".

### Solução

**`src/lib/vagaUtils.ts`**:
- Alterar `UNIDADES_POR_REGIAO['Vitória']` de `['SÃO PEDRO', 'SUÁ', 'UPA']` para `['VITÓRIA']`
- Manter `VITORIA_SUB_UNIDADES` como está (para que filtros de dados continuem reconhecendo São Pedro, Suá etc. vindos do banco)
- Garantir que `normalizeUnitName` e `getRegionForUnit` continuem mapeando "São Pedro", "Suá" para a região "Vitória"

**`src/pages/AdministracaoPage.tsx`**:
- A lista de unidades para vinculação (`REGIOES_SELECAO`) já puxa de `UNIDADES_POR_REGIAO`, então automaticamente mostrará apenas "VITÓRIA"
- Quando um usuário estiver vinculado a "VITÓRIA", os filtros de dados devem englobar São Pedro e Suá automaticamente (já funciona via `VITORIA_SUB_UNIDADES`)

### Dúvida pendente
- **UPA**: preciso confirmar com você — UPA pertence a Vitória ou é uma unidade independente? Isso define se UPA fica englobada em "VITÓRIA" ou vai para "Demais Unidades".

Nenhuma alteração de banco de dados necessária.

