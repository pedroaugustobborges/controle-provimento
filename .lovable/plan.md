

## Plano: Corrigir filtro "Sem Status" na página de Controle de Vagas

### Problema
Quando o usuário seleciona "SEM STATUS" no filtro, a lógica compara `s === v.status || s === v.status_geral` (linha 337). Vagas sem status têm `status_geral = ''` ou `null`, então nunca correspondem à string `'SEM STATUS'`. Também não há handler de categoria para esse caso (linhas 338-345).

### Alteração em `src/pages/VagasPage.tsx`

Na lógica de `matchStatus` (linha 336-346), adicionar uma condição para tratar "SEM STATUS" e "sem_status":

```typescript
const matchStatus = filterStatuses.length === 0 || filterStatuses.some(s => {
  if (s === v.status || s === v.status_geral) return true;
  // Novo: tratar filtro "Sem Status"
  if ((s === 'SEM STATUS' || s === 'sem_status') && (!v.status_geral || v.status_geral.trim() === '')) return true;
  if (s === 'CONVOCAÇÕES' && category === 'convocacao') return true;
  // ... restante igual
});
```

Isso garante que ao selecionar "Sem Status", vagas com `status_geral` vazio, nulo ou apenas espaços sejam exibidas.

