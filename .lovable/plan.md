
## Investigation plan

1. Read `src/pages/FilaEditaisPage.tsx` to understand current grouping logic, data structure, and rendering of consolidated rows.
2. Identify where the auto-grouping happens (likely a `useMemo` reducing vagas by `cargo`) and how regions/units are concatenated in the current layout.
3. Check if there is any existing UI state for expand/collapse or selection of rows.

## Implementation approach

**A. State for grouping control**
- Add a per-group state `Set<string>` of "ungrouped group keys" (cargo identifier). When a group key is in the set, render its underlying vagas as individual rows instead of a consolidated row.
- Add a `Set<string>` of selected individual rows for manual regrouping.

**B. Redesigned consolidated row layout**
- Replace the current concatenated string with a structured card:
  - Header: **Cargo** (large, bold) + badge "Consolidado (N requisições)".
  - Row of region chips: `Goiás`, `Espírito Santo` (only the regions actually present).
  - Unit summary: "5 unidades" with a Popover/Tooltip listing each unit + qty.
  - Total vagas badge.
  - Right-side actions: **Desagrupar** button (Unlink icon) + existing edital actions.
- When expanded (chevron), show the individual requisições inside the group as a sub-table.

**C. Manual regroup**
- Add a checkbox column on individual (non-grouped) rows.
- When 2+ rows of the same `cargo` are selected, show a floating action bar: **"Agrupar selecionados (N)"** that removes the cargo from the ungrouped set.
- Disable selection across incompatible cargos with a tooltip explaining why.

**D. Persistence (lightweight)**
- Persist the ungrouped-set in `localStorage` keyed by user id, so the choice survives refresh without needing a DB migration.

## Verification

- Open **Fila de Editais** with mixed requisições (mesmo cargo em Goiás + ES).
- Confirm consolidated card shows redesigned layout with chips for regions and unidades expansíveis.
- Click **Desagrupar** → grupo se expande em linhas individuais por unidade.
- Selecionar 2+ linhas do mesmo cargo → barra de ação **Agrupar selecionados** aparece → clicar reagrupa.
- Refresh: estado de agrupamento persiste.
- Demais ações (enviar para validação, editar) continuam funcionando em ambos os modos.
