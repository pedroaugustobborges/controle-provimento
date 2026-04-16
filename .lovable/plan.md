

## Plano: Ajustar filtros de unidades por contexto

### Alteração em `src/pages/VagasPage.tsx`

1. **Na visão padrão (Controle de Vagas):** Filtrar o dropdown de unidades para **excluir** unidades cujo nome contenha "TEIA"
2. **Na visão TEIAs (`filtro=teias`):** Filtrar o dropdown de unidades para mostrar **apenas** unidades cujo nome contenha "TEIA"
3. Identificar onde o array de unidades é gerado/filtrado para o componente de seleção e aplicar a lógica condicional baseada em `filtroEspecial`

Preciso inspecionar o código atual para localizar exatamente onde o filtro de unidades é renderizado.

