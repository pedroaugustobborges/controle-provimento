

## Plano: Restaurar filtro "Sem Status" funcional

### Problema
A correção anterior removeu a chave `'SEM STATUS'` do `STATUS_VAGA_LABELS` e manteve apenas `'sem_status'`. Vagas importadas de planilhas têm `status_geral = 'SEM STATUS'` como string literal. O filtro com chave `'sem_status'` não corresponde a essa string na comparação `s === v.status_geral` (linha 337), e a verificação de vazio na linha 338 também não pega porque o campo não está vazio — contém literalmente `'SEM STATUS'`.

### Solução (2 alterações)

**1. `src/types/vaga.ts`** — Restaurar `'SEM STATUS'` no tipo `StatusVaga` e no `STATUS_VAGA_LABELS`:
- Adicionar de volta `'SEM STATUS'` ao union type `StatusVaga`
- Adicionar de volta `'SEM STATUS': 'Sem Status'` ao `STATUS_VAGA_LABELS`
- **Remover** `sem_status` do union type e do `STATUS_VAGA_LABELS` (eliminar o duplicado que não funciona)

**2. `src/pages/VagasPage.tsx`** — Atualizar a lógica de matchStatus (linha 338):
- Mudar de `s === 'sem_status'` para `s === 'SEM STATUS'`
- Manter a verificação de vazio para cobrir ambos os casos (vaga com status literal `'SEM STATUS'` ou vaga com status vazio/null)

```typescript
// Linha 338
if (s === 'SEM STATUS' && (!v.status_geral || v.status_geral.trim() === '' || v.status_geral === 'SEM STATUS' || v.status === 'SEM STATUS')) return true;
```

Isso garante uma única opção "Sem Status" no dropdown que funciona tanto para vagas com a string literal quanto para vagas sem status.

