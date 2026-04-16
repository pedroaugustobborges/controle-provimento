
## Investigation plan

1. Read `src/components/AppLayout.tsx` — current realtime subscription setup (channels, events, tables covered).
2. Read `src/store/vagasStore.ts` — confirm there is a handler that applies remote changes to the local Zustand state, and identify which actions are wired (update, insert, delete).
3. Read `src/store/adminStore.ts` (and any banco store) — check whether `banco_candidatos` has a realtime listener at all.
4. Read `src/pages/ConvocacoesPage.tsx`, `src/pages/ValidacaoEditaisPage.tsx`, `src/pages/FilaEditaisPage.tsx` to confirm they rely on the store (and therefore would auto-update) vs. fetching locally on mount.
5. Check Supabase publication: confirm `vagas` and `banco_candidatos` are added to `supabase_realtime` and that REPLICA IDENTITY FULL is set (otherwise UPDATE payloads come without old/new diff).

## Fix approach

**A. Broaden the realtime listeners (in `AppLayout.tsx` or a dedicated `useRealtimeSync` hook):**
- Subscribe to `postgres_changes` on `vagas` for `*` events (INSERT, UPDATE, DELETE) — no status filter.
- Add a parallel subscription to `banco_candidatos` for `*` events.
- (Future: add `editais` / `edital_etapas` when those tables exist.)

**B. Wire incoming events to the local stores:**
- On INSERT → store action `applyRemoteInsert(record)` adds to array if not present.
- On UPDATE → `applyRemoteUpdate(record)` replaces by id, preserving local optimistic edits if version is older.
- On DELETE → `applyRemoteDelete(id)`.
- For `banco_candidatos` do the equivalent in its store/hook.

**C. Visibility-scoped bell notifications:**
- Compute `isInUserScope(record)` using region/unidades_vinculadas from the profile.
- If in scope and event is meaningful (convocação registrada, edital enviado para validação, status alterado, etc.) → push notification into the bell (existing `notificacoes` table or in-memory channel).
- If NOT in scope → still update store silently (so when the user navigates there it's fresh) but no toast/bell.

**D. Database side (migration):**
- Ensure `ALTER PUBLICATION supabase_realtime ADD TABLE public.vagas, public.banco_candidatos;` (idempotent — re-add only if missing).
- `ALTER TABLE public.vagas REPLICA IDENTITY FULL;`
- `ALTER TABLE public.banco_candidatos REPLICA IDENTITY FULL;`

## Verification (multi-user, ≤2s)

With **Isaac (admin)** and **Luana (Goiânia)** logged in simultaneously:
1. Isaac registers a convocação em CRER → aparece na tela da Luana sem refresh + sino dispara.
2. Luana envia edital para validação → Isaac vê na fila de validação em tempo real + sino.
3. Isaac altera status de uma vaga PCD → Luana vê a mudança.
4. Repetir com **Demais Unidades** (SÃO PEDRO/SUÁ) — usuário desse grupo registra convocação e outro do mesmo grupo recebe atualização.
5. Confirmar que usuários **fora do escopo** não recebem toast/sino, mas se navegarem até a tela o dado já está atualizado.
