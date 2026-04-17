
## Plano — Status específicos para Unidades TEIA

### Escopo
Aplicar lista reduzida de status **somente** quando o usuário está no submenu "Unidades TEIAs" ou editando uma vaga de unidade TEIA. Demais unidades permanecem com a lista atual completa.

### Lista oficial TEIA (10 status)
1. PROCESSO SELETIVO → `EM EDITAL`
2. DOCUMENTAÇÃO → `DOCUMENTAÇÃO`
3. ADMISSÃO ENVIADA → `ADMISSÃO ENVIADA`
4. CONCLUÍDA → `CONCLUÍDA`
5. MOVIMENTAÇÃO INTERNA → `MOVIMENTAÇÃO INTERNA`
6. ADMISSÃO → `ADMISSÃO`
7. VAGA DE LIDERANÇA → `VAGA DE LIDERANÇA`
8. SUSPENSA → `SUSPENSA`
9. CANCELADA → `CANCELADAS`
10. SEM STATUS → `SEM STATUS`

### Implementação

**1. `src/types/vaga.ts`** — exportar nova constante:
```ts
export const STATUS_FILTER_OPTIONS_TEIA: Record<string, { label: string; matches: StatusVaga[] }> = {
  'EM EDITAL': { label: 'Processo Seletivo', matches: [...STATUS_FILTER_OPTIONS['EM EDITAL'].matches, ...STATUS_FILTER_OPTIONS['FILA DE EDITAIS'].matches, ...STATUS_FILTER_OPTIONS['REALIZAR CONVOCAÇÃO'].matches] },
  'DOCUMENTAÇÃO': STATUS_FILTER_OPTIONS['DOCUMENTAÇÃO'],
  'ADMISSÃO ENVIADA': { label: 'Admissão Enviada', matches: ['ADMISSÃO ENVIADA', 'admissao_enviada'] },
  'CONCLUÍDA': STATUS_FILTER_OPTIONS['CONCLUÍDA'],
  'MOVIMENTAÇÃO INTERNA': STATUS_FILTER_OPTIONS['MOVIMENTAÇÃO INTERNA'],
  'ADMISSÃO': { label: 'Admissão', matches: ['ADMISSÃO', 'em_admissao'] },
  'VAGA DE LIDERANÇA': STATUS_FILTER_OPTIONS['VAGA DE LIDERANÇA'],
  'SUSPENSA': STATUS_FILTER_OPTIONS['SUSPENSA'],
  'CANCELADAS': { label: 'Cancelada', matches: STATUS_FILTER_OPTIONS['CANCELADAS'].matches },
  'SEM STATUS': STATUS_FILTER_OPTIONS['SEM STATUS'],
};
```
Helper: `export const isTeiaUnit = (u: string) => (u || '').toUpperCase().includes('TEIA');`

**2. `src/pages/VagasPage.tsx`** — no popover de filtro de status (linha ~956), trocar `STATUS_FILTER_OPTIONS` por opções condicionais:
```tsx
const statusFilterOptions = filtroEspecial === 'teias' ? STATUS_FILTER_OPTIONS_TEIA : STATUS_FILTER_OPTIONS;
```
Usar `statusFilterOptions` no `.map()` e na lógica de `matchStatus` (linha ~382). Limpar `filterStatuses` ao trocar de submenu (useEffect com dependência em `filtroEspecial`).

**3. `src/pages/VagaDetalhePage.tsx`** — no `Select` de status atual (linha 657), se `isTeiaUnit(vaga.unidade)`, renderizar uma única seção "Status TEIA" com os 10 status mapeados (em vez das 5 seções atuais). Mantém compatibilidade retroativa: se status atual da vaga não estiver na lista, exibe mesmo assim no SelectValue (badge), mas o usuário ao abrir o select vê apenas as 10 opções novas.

### Validação
- Acessar `/vagas?filtro=teias` → filtro de status mostra 10 opções TEIA.
- Acessar `/vagas` (controle padrão) → filtro mostra os 12 status originais.
- Abrir vaga de TEIA APARECIDA → select de status mostra só os 10 TEIA.
- Abrir vaga de CRER → select mostra todas as seções originais.
- Vaga TEIA com status legado (ex: `em_documentacao`) continua visível no badge; ao editar, usuário escolhe novo status da lista TEIA.

### Arquivos alterados
- `src/types/vaga.ts` (adicionar export)
- `src/pages/VagasPage.tsx` (filtro condicional)
- `src/pages/VagaDetalhePage.tsx` (select condicional por unidade)

### Risco
Baixo. Mudança puramente condicional e aditiva — nenhum status é removido do sistema, apenas as opções exibidas são restritas no contexto TEIA.
