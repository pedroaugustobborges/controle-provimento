

## Plano: Corrigir view TEIAs — botão redundante e filtro incorreto

### Alteração em `src/pages/VagasPage.tsx`

**1. Remover botão TEIAs redundante na view TEIAs**
- Revisar a lógica condicional dos botões de atalho quando `filtroEspecial === 'teias'`
- Garantir que o botão TEIAs não aparece nessa view

**2. Corrigir filtro de vagas TEIAs**
- Revisar a lógica de filtragem `filtroEspecial === 'teias'` para garantir que filtra corretamente por unidades TEIA (TEIA APARECIDA, TEIA GOIÂNIA, TEIA CANEDO)
- Verificar se está usando `is_teia` ou filtrando por nome da unidade — e se a lógica está correta
- Corrigir possível duplicação de registros

Preciso primeiro inspecionar o código atual do `VagasPage.tsx` para entender o estado atual da lógica.

