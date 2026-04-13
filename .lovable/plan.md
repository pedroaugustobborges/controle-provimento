

### Plano

**Arquivo: `src/lib/convocacaoUtils.ts`**
- Alterar a constante `UNIDADES_OUTRAS_AGRUPADAS` para reordenar e renomear "Vitória" → "VITÓRIA", posicionando antes das TEIAs:
```ts
export const UNIDADES_OUTRAS_AGRUPADAS = [
  'POLICLÍNICA', 'JATAÍ',
  'VITÓRIA',
  'DOURADOS', 'CHS', 'HMSA', 'HRCAC',
  'TEIA CEN', 'TEIA PIN', 'TEIA MAN', 'TEIA MAN 2', 'TEIA MAN 3'
];
```

**Arquivo: `src/pages/ConvocacoesPage.tsx`**
- Ajustar o `matchesUnidadeFilter` para reconhecer `'VITÓRIA'` (maiúsculo) como agrupador de SUÁ e SÃO PEDRO — normalizar a comparação para uppercase.

