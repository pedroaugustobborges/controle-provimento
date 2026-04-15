

## Plano: Centralizar slides com poucas unidades e corrigir corte em slides densos

### O que será feito
1. Centralizar verticalmente o conteúdo nos slides que têm poucas unidades (ES, MS, etc.)
2. Reduzir padding/fonte nos slides com muitas unidades para eliminar corte (GO Hospitalares)

### Alterações em `src/pages/LoginPage.tsx`

**Centralização vertical:**
- Envolver o conteúdo de cada slide em `flex flex-col justify-center h-full` para que slides com poucas unidades fiquem centralizados no espaço disponível

**Eliminar corte em slides densos:**
- Reduzir padding dos itens de unidade de `py-1.5` para `py-1`
- Reduzir `gap` entre itens
- Reduzir fonte do nome para `text-[10px]` e descrição para `text-[8px]` se necessário
- Compactar o header do slide (título + subtítulo) para liberar mais espaço vertical

**Resultado:** Todos os slides visualmente equilibrados — poucos itens centralizados, muitos itens compactos mas completos — sem alterar a altura do card.

