

## Plano de Correção: Erro `RangeError: Invalid time value`

### Problema
O erro ocorre em `src/components/ImportExcelDialog.tsx` na linha 897, onde `format(new Date(row.data_abertura), 'dd/MM/yyyy')` é chamado com um valor de data inválido (ex: serial Excel, string mal formatada). Isso causa tela branca na aplicação.

### Correção

**Arquivo: `src/components/ImportExcelDialog.tsx` (linha 897)**

Substituir:
```tsx
{row.data_abertura ? format(new Date(row.data_abertura), 'dd/MM/yyyy') : '-'}
```

Por uma versão segura com validação:
```tsx
{row.data_abertura ? (() => {
  const d = new Date(row.data_abertura);
  return isValid(d) ? format(d, 'dd/MM/yyyy') : String(row.data_abertura);
})() : '-'}
```

A função `isValid` do `date-fns` já está importada no arquivo (linha 21). Basta adicionar a verificação antes de chamar `format()` para evitar o `RangeError` quando o valor não é uma data válida.

Isso é uma correção de uma linha que resolve a tela branca imediatamente.

