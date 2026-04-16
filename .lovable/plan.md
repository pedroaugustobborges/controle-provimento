
## Investigation plan

1. Read `src/pages/VagasPage.tsx` focusing on:
   - All `useMemo` blocks
   - Variable declarations around PCD filtering and region filtering (`filterByRegionAndUnit`, `getValidVacancyBase`, etc.)
2. Locate the `useMemo` that references a `const` declared later in the same component scope (TDZ violation).
3. Check `src/lib/vagaUtils.ts` helpers used by that memo for any circular import or hoisting issue.

## Fix approach

- Reorder the offending `const` declarations so that every variable consumed inside a `useMemo` is declared **before** that memo in the component body.
- If two memos depend on each other, inline the dependency or split the logic so the dependency graph is linear and top-down.
- Keep the filter logic identical — this is purely a declaration-order fix, no behavior change.

## Verification

- Open **Controle de Vagas → Vagas PCDs**.
- Apply each region filter: **Todas**, **Goiás e Vitória**, **Demais Unidades**.
- Confirm no runtime error and that the vacancy list renders correctly for each filter.
- Verify other tabs (Gerais, Liderança) still work.
