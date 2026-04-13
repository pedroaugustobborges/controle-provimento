

## Plano de Implementação

### 1. Corrigir erro de build em `UnidadePortalPage.tsx` (linha 87-88)
- Verificar a tipagem do parâmetro na chamada e ajustar para o tipo correto.

### 2. Filtro de unidades na região "Outras"
- No `ConvocacoesPage.tsx`, o `useMemo` de `unidades` já filtra por região — confirmar que está funcionando corretamente após a última diff (que já implementa essa lógica). Se o problema persistir, revisar a lógica de `BASES_CONVOCACAO`.

### 3. Renomear abas da Agenda Diária
- Localizar no `ConvocacoesPage.tsx` ou `AgendaDiaria.tsx` os textos "Diárias - Goiânia" e "Diárias - Fora" e renomear para **"Agenda Goiânia"** e **"Agenda Demais Unidades"**.

Vou primeiro ler os arquivos relevantes para confirmar os pontos exatos de alteração.

