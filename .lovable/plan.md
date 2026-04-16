
## Clarification needed

Before changing the code, I need to confirm with the user which semantic the "Responsável" column should have in **Fila de Editais**:

- **Option A — "Enviado por"**: quem clicou em enviar a vaga para a fila (auditoria de origem).
- **Option B — "Responsável pela publicação"**: o analista designado para redigir e publicar o edital (executor).
- **Option C — Both**: mostrar duas colunas distintas.

## Implementation outline (after answer)

1. Read `src/pages/FilaEditaisPage.tsx` to locate the current "Responsável" column and identify which field it reads (`analista_responsavel`, `validado_por`, etc.).
2. Apply the chosen semantic:
   - **A**: rename column to "Enviado por" and ensure it reads the user who triggered the send-to-fila action (store this on `vagas` if not already persisted).
   - **B**: rename to "Responsável pela publicação", make it editable via a Select of analysts, persist in a dedicated field (e.g. `analista_edital_id`).
   - **C**: add both columns with the rules above.
3. Reflect the same field(s) in the **consolidated card layout** (grouped rows) so the info is visible there too.
4. Update sorting/filtering to use the renamed field.

## Verification

- Column header reflects the correct semantic.
- Value shown matches the chosen rule for both individual and consolidated rows.
- (If B/C) responsible can be reassigned and the change persists + syncs in real-time.
