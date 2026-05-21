# Prompts de Implementação — Gestão de Provimento
> Stack: React + React Router v6, Supabase (Auth + DB + Storage + Edge Functions), TailwindCSS + shadcn/ui, Vercel
> Gerado em: 2026-05-21
> Referência: Documento de Requisitos v.1 (RF001–RF030, RN001–RN012)

---

## COMO USAR

Execute os prompts em ordem. Cada um é autossuficiente — inclui contexto, arquivos relevantes,
comportamento esperado e critérios de aceite. Não pule fases; cada fase depende da anterior.

---

# PROMPT 1 — FASE 1: ESTABILIZAÇÃO CRÍTICA

> **Escopo:** RF001, RF002, RF003, RF009, RF010, RF013, RF017, RF020, RF022, RF024, RF026  
> **Prioridade:** Crítica / Alta  
> **Objetivo:** Corrigir todos os bugs que impedem operação básica do sistema

---

```
You are working on a production SaaS system called "Gestão de Provimento" — an HR staffing
management platform for the healthcare company Agir Saúde. The stack is:
- Frontend: React 18 + React Router v6 (BrowserRouter), TailwindCSS, shadcn/ui, Zustand
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Deployment: Vercel (static SPA)

The system is in homologation with critical bugs blocking production go-live. Fix ALL of the
following issues in this single session. After each fix, verify it does not break existing
functionality. Maintain full TypeScript typing — no `any` shortcuts.

---

## FIX 1 — RF001: SPA Routing 404 on direct URL access (CRITICAL)

**Problem:** Accessing /login directly returns Vercel 404. Also F5 on any page breaks navigation.
**Root cause:** Vercel serves a SPA (index.html) but lacks fallback rewrite config.

**Fix:**
1. Verify `public/_redirects` contains: `/* /index.html 200`
2. Verify `public/.htaccess` has the Apache rewrite fallback.
3. In `vercel.json` (create if absent at root), add:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
4. In `src/App.tsx`, ensure the catch-all route `<Route path="*" element={<NotFound />} />`
   is the LAST route inside the router, after all defined routes.
5. Test: navigating directly to /login, /visao-geral, /controle-de-vagas must all load correctly.

---

## FIX 2 — RF002: Dashboard filters not restoring state correctly (HIGH)

**Problem:** In the "Visão Geral" page, clicking "Todas as Unidades" button does not restore
the full data view. It only resets when "Todas as Regiões" is selected in the filter.

**Files:** Find the Visão Geral page component (likely `src/pages/VisaoGeralPage.tsx` or similar).

**Fix:**
1. Find the filter state (region + unit). They must be managed as a pair with a clear dependency:
   - When region changes → reset unit filter to "all" automatically.
   - When "Todas as Unidades" is clicked → also reset the unit filter state to null/undefined,
     AND re-trigger the data fetch with no unit filter applied.
2. The "Todas as Unidades" button must call `setUnitFilter(null)` AND ensure the data query
   runs with no unit constraint (not just visually reset the button).
3. Ensure filter state is not persisted in localStorage across sessions — filters should reset
   on page load to show all data by default.
4. All dashboard KPI cards must recompute when filters change using the filtered dataset,
   not a cached/stale value.

---

## FIX 3 — RF003: Access history fails on date-range search (HIGH)

**Problem:** In the online users indicator → "Histórico de Acessos", searching by date period
shows "Erro ao carregar histórico de acessos".

**Files:** `src/components/AccessHistoryPopoverContent.tsx`

**Fix:**
1. Check the Supabase query for `audit_logs` (or `user_sessions`) filtered by date range.
2. Ensure date range filter uses `.gte('created_at', startDate.toISOString())` and
   `.lte('created_at', endDate.toISOString())` — where `endDate` is set to end of day
   (23:59:59.999), not start of day.
3. Add proper error handling with a user-friendly error message (not just a toast — show
   inline in the popover: "Nenhum registro encontrado para o período selecionado.").
4. Verify the query joins `profiles` and `user_sessions` tables correctly. If the join fails
   due to missing FK, switch to two separate queries and merge results in JS.
5. Add a loading skeleton while the query runs.

---

## FIX 4 — RF009: Wrong user recorded when sending vaga to edital queue (CRITICAL)

**Problem:** When user "Mariana Rocha" sends a vaga to the edital queue, the system records
the action as performed by "Beatriz Almeida". This indicates the logged-in user's ID is not
being used — likely a hardcoded user ID or a stale reference.

**Fix:**
1. Find the function that registers "Enviado para fila de editais" in the audit trail.
   Search for: `"fila de editais"` or `"fila_editais"` or similar action strings.
2. Ensure the logged-in user is obtained from Supabase auth session:
   ```ts
   const { data: { user } } = await supabase.auth.getUser();
   ```
   NOT from a Zustand store that may be stale.
3. Every audit log INSERT must use the live `user.id` from the auth session, not a cached value.
4. Rename the display field `"Enviado por"` → `"Responsável"` in the UI to avoid misinterpretation
   (this field shows the responsible person for the step, not necessarily who clicked).
5. Audit ALL other places that write to audit/history tables and verify they use the live
   session user, not a stored reference.

---

## FIX 5 — RF010: Date picker saves day minus 1 (CRITICAL)

**Problem:** In "Configuração e Cronograma", selecting date "08" saves "07" in the database.
This is a timezone offset bug.

**Fix:**
1. Find all date picker components used in cronograma fields.
2. The issue is that JS `new Date('2026-08-08')` parsed as UTC midnight, when converted to
   local Brazilian time (UTC-3), becomes 2026-08-07. Fix by:
   ```ts
   // WRONG — parses as UTC:
   const d = new Date(dateString); // "2026-08-08" → stored as Aug 7 in UTC-3
   
   // CORRECT — parse as local date:
   const [year, month, day] = dateString.split('-').map(Number);
   const d = new Date(year, month - 1, day); // local midnight, no offset issue
   ```
3. When saving to Supabase, store as `DATE` type (not TIMESTAMP) for cronograma fields,
   or format as `YYYY-MM-DD` string explicitly:
   ```ts
   const formatted = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
   ```
4. When reading from Supabase and displaying: parse the DATE string directly as local
   (same split technique), never via `new Date(isoString)` without timezone handling.
5. Add a utility function `parseLocalDate(dateStr: string): Date` and `formatLocalDate(date: Date): string`
   in `src/lib/dateUtils.ts` and use it consistently throughout the entire codebase.
   Replace all existing `new Date(dateString)` patterns that deal with date-only values.

---

## FIX 6 — RF013: System allows edital submission with incomplete data (CRITICAL)

**Problem:** Edital was submitted for validation even when:
  a) PDF uploaded does not contain the required table
  b) Cronograma is only partially filled for some vagas in the group

**Fix — Frontend validation (gate before submission):**
1. Find the edital submission function (in `VagaDetalhePage.tsx` or `PublicacaoEditaisPage.tsx`).
2. Before calling the submit API, run these validations and block if any fail:

```ts
function validateEditorialSubmission(editais: EditaisGroup): ValidationResult {
  const errors: string[] = [];

  // Rule 1: PDF must be uploaded
  if (!editais.arquivoPdf) {
    errors.push("É obrigatório fazer upload do arquivo PDF do edital.");
  }

  // Rule 2: All vagas in the group must have complete cronograma
  const incompleteCronograma = editais.vagas.filter(vaga =>
    !vaga.cronograma.inscricao?.inicio ||
    !vaga.cronograma.inscricao?.fim ||
    !vaga.cronograma.selecao?.data ||
    !vaga.cronograma.resultado?.data
  );
  if (incompleteCronograma.length > 0) {
    errors.push(`Cronograma incompleto para: ${incompleteCronograma.map(v => v.cargo).join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}
```

3. Show validation errors in a modal or inline alert — highlight the exact missing fields.
4. The "Enviar para Validação" / "Enviar para Definição" button must be disabled until
   all validations pass. Show a tooltip on the disabled button explaining what is missing.
5. This validation must also run server-side in the Edge Function/RPC that handles the submission.

---

## FIX 7 — RF017: Imported candidates not visible in talent bank (CRITICAL)

**Problem:** After importing candidates:
  - They appear in audit/group logs but NOT in the talent bank list
  - Download of import history files fails

**Files:** `src/pages/ImportacoesPage.tsx`, `src/services/databaseService.ts` (importBySubstitution)

**Fix:**
1. Trace the import pipeline. After file upload and parsing, candidates must be inserted into
   the `banco_talentos` (or equivalent) Supabase table. Verify the INSERT actually executes
   and is not just logged.
2. Check if the INSERT uses the correct table name. There may be a mismatch between
   `banco_talentos` (display queries) and whatever table the import writes to.
3. After import, immediately query the table and show a preview of imported records.
4. For download failures in import history: check that the file URL stored in the `importacoes`
   table is a valid Supabase Storage signed URL. Use `supabase.storage.from(bucket).createSignedUrl(path, 3600)`
   to generate a fresh URL at download time, not a static URL that may have expired.
5. Add import status feedback:
   - Loading state during processing
   - Success state: "X candidatos importados com sucesso"
   - Error state: display specific row-level errors (which rows failed and why)

---

## FIX 8 — RF020: Audit logs and session logs not recording correctly (CRITICAL)

**Problem:** Reports show 0 logins, 0 session time. Only 1 action recorded in audit despite
many operations performed.

**Root causes to investigate:**
1. **Dual table confusion:** Code has BOTH `audit_logs` AND `auditoria_logs` tables.
   Standardize: pick ONE table (prefer `audit_logs` as it has the better schema), migrate all
   writes to it, and update all reads.
2. **Login tracking:** In `src/hooks/useAuth.ts`, after `signInWithPassword` succeeds,
   insert a record into `user_sessions` (login_at = now(), user_id = user.id, ip_address).
   On logout, update the record: `logout_at = now()`.
3. **Session heartbeat:** In `UserSessionTracker.tsx`, ensure `last_activity_at` is updated
   every 5 minutes via a `setInterval` that calls:
   ```ts
   supabase.from('user_sessions').update({ last_activity_at: new Date().toISOString() })
     .eq('id', currentSessionId)
   ```
4. **Audit writes:** Every significant user action must call a centralized `logAudit()` function.
   Audit these actions as a minimum:
   - Login / Logout
   - Vaga: criação, status change, send to edital queue
   - Edital: submissão, aprovação, reprovação
   - Convocação: criação, envio, confirmação
   - Banco de Talentos: import, vinculação
   - Usuário: criação, inativação, suspensão, reset de senha
5. The `logAudit()` function must NEVER throw — wrap in try/catch so audit failures don't
   break the main operation.

---

## FIX 9 — RF022: User inactivation/suspension fails (CRITICAL)

**Problem:** Attempting to inactivate or suspend a user throws an error.

**Files:** `src/store/adminStore.ts` (updateUserStatus), `supabase/functions/admin-user-management/index.ts`

**Root cause found:** The `profiles` table CHECK constraint only allows `'ativo' | 'inativo'`
but the code also passes `'suspenso'`.

**Fix:**
1. Add migration to update the CHECK constraint:
   ```sql
   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
   ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
     CHECK (status IN ('ativo', 'inativo', 'suspenso'));
   ```
2. Update the TypeScript types:
   ```ts
   type UserStatus = 'ativo' | 'inativo' | 'suspenso';
   ```
3. In the Edge Function `admin-user-management`, handle `update_status` action:
   - `inativo`: disable Supabase Auth user (`auth.admin.updateUserById(id, { ban_duration: 'none' })`)
     and set `profiles.status = 'inativo'`
   - `suspenso`: set `profiles.status = 'suspenso'` (user can still exist but is flagged)
   - `ativo`: re-enable auth user and set `profiles.status = 'ativo'`
4. Log all status changes to `audit_logs` with previous and new status values.
5. Show success toast: "Usuário [nome] [inativado/suspenso/reativado] com sucesso."

---

## FIX 10 — RF024: Forced password change on first login not triggered (HIGH)

**Problem:** The setting "Forçar alteração de senha no primeiro acesso" exists in Sistema
settings but doesn't execute when a new user logs in for the first time.

**Fix:**
1. In `profiles` table, ensure there is a `must_change_password BOOLEAN DEFAULT false` column.
   Create migration if absent.
2. When an admin creates a new user (or resets their password), set `must_change_password = true`.
3. In `src/App.tsx` inside `ProtectedRouteWrapper`, after auth check, query the user's profile:
   ```ts
   if (profile?.must_change_password) {
     return <Navigate to="/change-password" replace />;
   }
   ```
4. Create `/change-password` page with:
   - Enforces new password (minimum 8 chars, 1 letter, 1 number, 1 symbol — match backend)
   - On success: sets `must_change_password = false` in profiles, redirects to home
   - User cannot navigate away from this page until password is changed
5. The system settings toggle (`Forçar Troca de Senha`) must set `must_change_password = true`
   on ALL active users when enabled — or only on newly created users (implement as configured).

---

## FIX 11 — RF026: Password reset must be admin-driven, no email links (CRITICAL)

**Problem:** The current flow attempts to send email reset links via Supabase auth, which
is broken. The correct business flow is: an admin resets the password to a new value directly
inside the system and communicates it to the user manually. The user can then change their
own password inside the system whenever they want.

**Remove entirely:**
- `supabase.auth.resetPasswordForEmail()` call — delete it.
- `/reset-password` public route and `ResetPasswordPage.tsx` — delete or repurpose.
- Any email sending logic tied to password recovery.

**Files:** `src/store/adminStore.ts`, `supabase/functions/admin-user-management/index.ts`,
`src/hooks/useAuth.ts`, `src/pages/AdministracaoPage.tsx`

**Fix — Admin resets a user's password:**
1. In `AdministracaoPage.tsx`, in the user actions menu (the "Redefinir Senha" option),
   open a modal `RedefinirSenhaDialog`:
   ```tsx
   <Dialog>
     <DialogHeader>Redefinir senha — {usuario.nome}</DialogHeader>
     <DialogContent>
       <p className="text-sm text-muted-foreground">
         Defina uma nova senha temporária para este usuário. Comunique-a manualmente.
         O usuário poderá alterá-la a qualquer momento em seu perfil.
       </p>
       <Input
         type="password"
         placeholder="Nova senha"
         value={newPassword}
         onChange={(e) => setNewPassword(e.target.value)}
       />
       <Input
         type="password"
         placeholder="Confirmar nova senha"
         value={confirmPassword}
         onChange={(e) => setConfirmPassword(e.target.value)}
       />
       <p className="text-xs text-muted-foreground">
         Mínimo 8 caracteres, incluindo letras, números e símbolos.
       </p>
     </DialogContent>
     <DialogFooter>
       <Button variant="outline" onClick={onClose}>Cancelar</Button>
       <Button onClick={handleResetPassword} disabled={!isValid}>Redefinir Senha</Button>
     </DialogFooter>
   </Dialog>
   ```

2. On confirm, call the `admin-user-management` Edge Function with action `reset_password`:
   ```ts
   const { error } = await supabase.functions.invoke('admin-user-management', {
     body: { action: 'reset_password', userId: usuario.id, newPassword }
   });
   ```

3. In the Edge Function `admin-user-management/index.ts`, handle `reset_password`:
   ```ts
   case 'reset_password': {
     const { userId, newPassword } = body;
     // Validate password strength server-side
     if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) ||
         !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
       return new Response(JSON.stringify({ error: 'Senha não atende aos requisitos mínimos.' }), { status: 400 });
     }
     const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
     if (error) throw error;
     // Set must_change_password = false (admin explicitly set it; user may change freely)
     await supabaseAdmin.from('profiles').update({ must_change_password: false }).eq('id', userId);
     // Log to audit
     await logAudit({ acao: 'PASSWORD_RESET_BY_ADMIN', modulo: 'usuarios', registro_afetado: userId });
     return new Response(JSON.stringify({ success: true }), { status: 200 });
   }
   ```

4. Show success toast: "Senha de [nome] redefinida com sucesso. Comunique a nova senha ao usuário."

**Fix — User changes their own password inside the system:**
1. In the user profile page / settings (`/perfil` or equivalent), add a "Alterar Senha" section:
   ```tsx
   <section>
     <h3>Alterar Senha</h3>
     <Input type="password" placeholder="Senha atual" value={currentPassword} ... />
     <Input type="password" placeholder="Nova senha" value={newPassword} ... />
     <Input type="password" placeholder="Confirmar nova senha" value={confirmPassword} ... />
     <Button onClick={handleChangeOwnPassword}>Salvar Nova Senha</Button>
   </section>
   ```
2. The handler verifies the current password first (re-authenticate with Supabase), then updates:
   ```ts
   async function handleChangeOwnPassword() {
     // Step 1: verify current password by attempting re-sign-in
     const { error: authError } = await supabase.auth.signInWithPassword({
       email: currentUser.email,
       password: currentPassword
     });
     if (authError) {
       setError("Senha atual incorreta.");
       return;
     }
     // Step 2: update to new password
     const { error } = await supabase.auth.updateUser({ password: newPassword });
     if (error) setError("Erro ao atualizar senha. Tente novamente.");
     else showToast("Senha alterada com sucesso.");
   }
   ```
3. Apply the same password strength rules (min 8 chars, letter + number + symbol) both
   in the UI and respected by Supabase's own password policy settings.
4. Log the self-service password change to `audit_logs` with action `PASSWORD_CHANGED_BY_USER`.

---

## ACCEPTANCE CRITERIA FOR PROMPT 1

After all fixes are applied:
- [ ] Direct URL access to /login, /visao-geral, /controle-de-vagas works without 404
- [ ] F5 on any page reloads correctly
- [ ] Dashboard filters reset independently; "Todas as Unidades" restores full view
- [ ] Access history date-range search returns results or a clear empty state
- [ ] Audit trail records the correct logged-in user for all actions
- [ ] Selecting date "08" in cronograma saves "08" in the database (not "07")
- [ ] Edital submission is blocked with clear error when PDF or cronograma is missing
- [ ] After talent bank import, candidates appear in the bank list
- [ ] Import history file download works (generates fresh signed URLs)
- [ ] Audit logs record: login, logout, status changes, and all CRUD operations
- [ ] User inactivation and suspension complete without error
- [ ] First-login password change is enforced when the flag is set
- [ ] Admin can reset any user's password directly inside the system (no email link)
- [ ] User can change their own password inside the system at any time via profile settings
- [ ] Both flows enforce minimum 8 chars + letter + number + symbol
- [ ] Password reset and self-change are both recorded in audit_logs
```

---

# PROMPT 2 — FASE 2: CONTROLE DE VAGAS E FLUXOS OPERACIONAIS

> **Escopo:** RF005, RF006, RF007, RF008, RF011, RF012, RF019, RF025  
> **Prioridade:** Alta / Média  
> **Pré-requisito:** Prompt 1 completo

---

```
You are continuing work on "Gestão de Provimento" (React + Supabase + TailwindCSS SaaS).
Phase 1 stabilization is done. Now implement all vacancy control and operational flow fixes.

---

## FIX 1 — RF005: "Consultar Outros Bancos" throws 404 (HIGH)

**Problem:** Controle de Vagas → Vaga → Banco de Talentos → "Consultar Outros Bancos"
navigates to `/banco-talentos?search=...` but crashes with 404 NOT_FOUND.

**Current code (VagaDetalhePage.tsx):**
```ts
onClick={() => window.location.href = `/banco-talentos?search=${vaga.cargo}`}
```

**Fix:**
1. Replace `window.location.href` with React Router `navigate()`:
   ```ts
   import { useNavigate } from 'react-router-dom';
   const navigate = useNavigate();
   // ...
   onClick={() => navigate(`/banco-talentos?search=${encodeURIComponent(vaga.cargo)}`)}
   ```
2. In the Banco de Talentos page, read the `?search=` param on mount and auto-populate
   the search field:
   ```ts
   import { useSearchParams } from 'react-router-dom';
   const [searchParams] = useSearchParams();
   const initialSearch = searchParams.get('search') ?? '';
   ```
3. When arriving from a vaga search, show a contextual banner:
   "Buscando candidatos para a vaga: [cargo]. Selecione candidatos para vinculá-los."
4. Allow selecting candidates and "vincular à vaga de origem" from this search context.
   Pass the vaga ID via a second query param: `?search=CARGO&vagaId=UUID`.

---

## FIX 2 — RF006: Convocation "Detalhes" button opens nothing; floating icon blocks UI (HIGH)

**Problem A:** In the Convocações tab of a vaga, clicking "Ver Detalhes" does not open
any page or modal.

**Fix:**
1. Find the "Ver Detalhes" button in the convocações list. It likely has an `onClick` with
   no implementation or a broken route.
2. Implement a `ConvocacaoDetalhesModal` (or drawer) that displays:
   - Candidate name, role, unit
   - Convocation date/time
   - Channel used (email/WhatsApp)
   - Status (Pendente / Enviado / Confirmado / Recusado)
   - Document for signing (if applicable)
   - Full history of communications sent
   - Actions: Reenviar convocação, Marcar como confirmado, Registrar desistência
3. The modal must fetch fresh data from Supabase when opened (not just local state).

**Problem B:** The floating "Agie" chat icon blocks UI elements on small screens.

**Fix:**
1. In `src/components/chat/AgieChat.tsx`, add a minimize/hide button:
   - A small close/minimize icon (×) on the floating bubble
   - State: `isMinimized`. When minimized, render only a small icon in bottom-right corner.
   - Persist minimized state in `sessionStorage` (not localStorage — reset each session).
2. Ensure the floating icon z-index does not exceed modal z-indexes.
3. On mobile breakpoints (< 768px), default the icon to minimized state.

---

## FIX 3 — RF007: Talent bank to vaga link not discoverable (HIGH)

**Problem:** Users cannot identify how to link a talent bank candidate to a specific vaga
in the Controle de Vagas → Todas as Vagas → Ações section.

**Fix:**
1. In the Banco de Talentos tab of `VagaDetalhePage.tsx`, when the bank IS populated:
   - Show candidates as a selectable list (checkbox per row)
   - Add a primary CTA button: "Vincular Selecionados à Vaga"
   - On confirm, create records in a `vaga_candidatos` (or equivalent) junction table
2. When the bank is NOT populated (current "Sem Banco de Talentos" state):
   - Show the "Consultar Outros Bancos" button prominently (already exists but broken — fix per RF005)
   - Add a secondary option: "Importar Candidatos" (links to importação page with vagaId context)
3. Add a "Candidatos Vinculados" counter badge on the tab label: "Banco de Talentos (3)"
4. In the main Controle de Vagas list, add a quick-action column icon that navigates directly
   to the Banco de Talentos tab of that vaga.

---

## FIX 4 — RF008: Ambiguity between "Vagas Ativas" and "Vagas em Andamento" (MEDIUM)

**Problem:** Two tabs/filters with similar names confuse users about the distinction.

**Fix — Define clear business rules for each status:**

| Status | Definition |
|--------|-----------|
| **Ativa** | Vaga aprovada, edital publicado, processo seletivo em curso |
| **Em Andamento** | Vaga em qualquer operacional step BEFORE publication (draft, approval pending, edital prep) |
| **Suspensa** | Process paused (reason required) |
| **Cancelada** | Process cancelled (reason required) |
| **Concluída** | Candidate admitted, process closed |

**Implementation:**
1. Update the vaga status enum in the database to reflect these precise states.
2. In the filter tabs of `ControleVagasPage.tsx`:
   - Rename tabs to their precise definitions
   - Add a tooltip on each tab explaining what that status means
   - Add a small (?) icon next to status badges throughout the app with the definition
3. Add a status legend panel (collapsible) at the top of the Controle de Vagas page.
4. In business logic (RN003): the status transition rules must enforce:
   - Vaga Comum: solicitação → aprovação → publicação edital → triagem → convocação → validação docs → admissão → concluída
   - Vaga Liderança: solicitação → aprovação → convocação direta → validação docs → admissão → concluída
   - Vaga PCD: same as comum with PCD flag affecting selection criteria
   - Rede Teia: simplified flow per business rule

---

## FIX 5 — RF011: Validation editability after approval; responsible dropdown empty (HIGH)

**Problem A:** After a manager approves or rejects a vaga validation, the form remains editable.
**Problem B:** The "Responsável" field dropdown is empty — no users listed for selection.

**Fix A — Lock after decision:**
1. In the validation form component (search for "Validação da Vaga" or `ValidacaoTab`):
   ```ts
   const isLocked = validation.status === 'aprovado' || validation.status === 'reprovado';
   // Wrap all form fields:
   <fieldset disabled={isLocked} className={isLocked ? 'opacity-60 pointer-events-none' : ''}>
   ```
2. Show a readonly banner when locked:
   - Green: "Validação aprovada por [nome] em [data]"
   - Red: "Validação reprovada por [nome] em [data] — Motivo: [justificativa]"
3. Add an "Editar Validação" button (visible only to Supervisão/Coordenação/Admin profiles)
   that, when clicked, shows a confirmation: "Atenção: esta validação já foi concluída.
   Deseja reabrir? Esta ação será registrada em auditoria."

**Fix B — Load responsible users:**
1. The responsible dropdown must query `profiles` table filtered by roles that can validate:
   ```ts
   const { data: gestores } = await supabase
     .from('profiles')
     .select('id, nome, email, perfil')
     .in('perfil', ['supervisao', 'coordenacao', 'administracao'])
     .eq('status', 'ativo')
     .order('nome');
   ```
2. Render as a searchable Select component (use shadcn/ui Combobox).
3. Pre-populate with the currently logged-in user if they have the required role.

---

## FIX 6 — RF012: Edital schedule must support bulk date copy (MEDIUM)

**Problem:** When grouping multiple vagas in one edital, the cronograma must be filled
individually per vaga — highly repetitive.

**Fix:**
1. In the cronograma section of the edital preparation form:
   - After filling cronograma for the FIRST vaga in the group, show a button:
     "Replicar datas para todas as vagas deste edital"
   - This copies all date fields from the first vaga to the remaining vagas in the group
   - Show a confirmation: "Isso irá sobrescrever o cronograma das outras [N] vagas. Continuar?"
2. Additionally, add an "Editar em massa" mode:
   - A single form that represents ALL vagas in the group
   - Filling dates here applies to all vagas simultaneously
   - Individual vagas can still override specific dates after bulk fill
3. Visual indicator: vagas with complete cronograma show a green checkmark;
   incomplete ones show a yellow warning icon.

---

## FIX 7 — RF019: Agenda block applies to ALL units when only one is selected (HIGH)

**Problem:** Blocking the Goiânia agenda propagates the block to all units in the system.

**Files:** Find `AgendaDiaria.tsx` and `BloqueioHorarioDialog.tsx`

**Fix:**
1. In the `BloqueioHorarioDialog.tsx`, add a multi-select field "Aplicar a unidades":
   ```tsx
   <Label>Aplicar bloqueio a:</Label>
   <div className="space-y-2">
     <Checkbox
       checked={applyToAll}
       onCheckedChange={setApplyToAll}
       label="Todas as unidades"
     />
     {!applyToAll && (
       <MultiSelect
         options={unidades}
         selected={selectedUnidades}
         onChange={setSelectedUnidades}
         placeholder="Selecione unidades..."
       />
     )}
   </div>
   ```
2. The block INSERT into the `bloqueios_agenda` (or equivalent) table must include a
   `unidade_id` foreign key. If `unidade_id IS NULL`, it means "all units" (global block).
3. When loading agenda for a specific unit, the query must filter:
   ```sql
   WHERE unidade_id = $unitId OR unidade_id IS NULL
   ```
4. Add validation: at least one unit must be selected when "Todas as unidades" is unchecked.
5. Log the block action to audit_logs with the list of affected unidades.

---

## FIX 8 — RF025: Unit portal navigation error (HIGH)

**Problem:** Clicking "Portal da Unidade" throws a navigation error (likely 404).

**Fix:**
1. Find where the unit portal link is rendered. It may use `window.location.href` to a
   non-existent route, or the route may not be registered in `App.tsx`.
2. Check if the route `/portal-unidade` or `/unidade/:id` is defined in `App.tsx`.
   If not, add it with `UnidadeRouteWrapper` (already exists in the codebase).
3. Verify the `UnidadeRouteWrapper` component correctly resolves the unit ID from the
   authenticated user's profile (`profiles.unidade_id`).
4. The portal page must show: unit-specific vagas, local agenda, unit KPIs.
5. If a user has no associated unit, show a clear message:
   "Você não está vinculado a nenhuma unidade. Contate o administrador."

---

## ACCEPTANCE CRITERIA FOR PROMPT 2

After all fixes are applied:
- [ ] "Consultar Outros Bancos" navigates to talent bank with pre-filled search and vaga context
- [ ] Convocação "Ver Detalhes" opens a modal with full convocation information and actions
- [ ] Agie floating icon has a minimize button; defaults minimized on mobile
- [ ] Candidate-to-vaga linking is clear and functional from the Banco de Talentos tab
- [ ] "Vagas Ativas" and "Vagas em Andamento" have distinct, documented meanings
- [ ] Validation form is locked (readonly) after approval/rejection
- [ ] Responsible dropdown populates with eligible users from Supabase
- [ ] Edital cronograma has a "Replicar datas" bulk-copy action
- [ ] Agenda block prompts for unit selection; does not propagate globally unless explicitly chosen
- [ ] Unit portal loads without navigation error
```

---

# PROMPT 3 — FASE 3: BANCO DE TALENTOS, IMPORTAÇÕES E CONVOCAÇÕES

> **Escopo:** RF014, RF016, RF018, RF021, RF028, RF029 + RN006, RN007, RN008  
> **Prioridade:** Alta / Média  
> **Pré-requisito:** Prompts 1 e 2 completos

---

```
You are continuing work on "Gestão de Provimento" (React + Supabase + TailwindCSS).
Now implement talent bank import improvements, convocation history fixes, and two major
new features: remote acceptance signature (RF028) and automated communications (RF029).

---

## FIX 1 — RF014: Edital file does not open in validation view (HIGH)

**Problem:** In "Validação de Edital", clicking the edital file link does not open the file.

**Fix:**
1. Edital PDFs are uploaded to Supabase Storage. When displaying the download/view link:
   ```ts
   // Generate a fresh signed URL (valid for 1 hour):
   const { data } = await supabase.storage
     .from('editais') // verify exact bucket name
     .createSignedUrl(edital.arquivo_path, 3600);
   
   window.open(data.signedUrl, '_blank');
   ```
2. Do NOT store a static public URL in the database — always generate signed URLs on demand.
3. Show a PDF preview inline using an `<iframe>` or a PDF viewer component when the file is
   clicked, falling back to "Abrir em nova aba" if the browser blocks inline PDFs.
4. Add a loading state while generating the signed URL.
5. If the file doesn't exist in storage, show: "Arquivo não encontrado. Faça o upload novamente."

---

## FIX 2 — RF016: No import template; imports fail silently (HIGH)

**Problem:** No template available for talent bank import. Uploads fail without clear errors.

**Fix:**
1. **Generate downloadable template:** Create a function that generates a `.xlsx` file
   with the expected columns and sample data:
   ```
   Columns: Nome | CPF | Email | Telefone | Cargo | Formacao | Unidade | Edital | Status | Observacao
   Row 2: (sample data) João Silva | 000.000.000-00 | joao@email.com | (62) 99999-9999 | Analista | Graduação | Agir Goiânia | Edital 01/2026 | Disponível |
   ```
   Use the `xlsx` or `exceljs` library (check if already in package.json).
2. Add a "Baixar Modelo" button next to the upload button in `ImportacoesPage.tsx`.
3. **Import validation (RN008):** Before processing, validate each row:
   - Nome: required, non-empty string
   - CPF: valid Brazilian CPF format (11 digits, with validation algorithm)
   - Email: valid email format (if provided)
   - Telefone: valid Brazilian phone format (if provided)
   - Cargo: must match a known cargo from the system (warn if not found — don't block)
   - Duplicates: check `cpf` against existing `banco_talentos` records
4. Show a pre-import preview table with:
   - Total rows found
   - Valid rows (green)
   - Rows with warnings (yellow — non-blocking)
   - Rows with errors (red — will be skipped)
   - Buttons: "Importar válidos", "Cancelar"
5. After import: show "X candidatos importados. Y ignorados por duplicidade. Z com erros."
6. Store detailed error report in the `importacoes` table's error_details JSONB field.

---

## FIX 3 — RF018: Actions in convocation history are non-functional (MEDIUM)

**Problem:** In Convocações → Histórico, action buttons for records do not respond.

**Fix:**
1. Find the action column in the convocation history table component.
2. Implement the following actions per convocation record:
   - **Ver Detalhes:** Open the ConvocacaoDetalhesModal (implemented in Prompt 2 Fix 2)
   - **Reenviar:** Resend the convocation communication (trigger email/notification)
   - **Validar Edital:** For convocations with `status = 'enviado'`, mark as 'confirmado'
   - **Registrar Desistência:** Mark as 'desistencia' with reason field
3. Actions must be role-gated:
   - "Ver Detalhes": all roles
   - "Reenviar": RH Operacional, Edital Operacional
   - "Validar Edital" / "Registrar Desistência": RH Operacional, Supervisão
4. All actions must update `audit_logs` per RN006.

---

## FIX 4 — RF021: Import actions not responding (HIGH)

**Problem:** In Importações → Histórico de Importações and Arquivos Importados,
all action buttons are non-functional.

**Fix:**
1. Each import record must support:
   - **Visualizar:** Show the import summary (total, success, errors) in a modal
   - **Baixar Arquivo:** Generate fresh Supabase Storage signed URL and download
   - **Baixar Relatório de Erros:** Download the error_details as a formatted xlsx/csv
   - **Reprocessar:** Re-run the import for failed rows only (if status = 'parcial')
   - **Excluir:** Remove import record (admin only; does NOT remove imported candidates)
2. Fix the download function: use `supabase.storage.from(bucket).createSignedUrl(path, 3600)`
   instead of static URLs. Create a helper:
   ```ts
   async function downloadStorageFile(bucket: string, path: string, filename: string) {
     const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
     if (error) throw error;
     const link = document.createElement('a');
     link.href = data.signedUrl;
     link.download = filename;
     link.click();
   }
   ```

---

## NEW FEATURE 1 — RF028: Remote acceptance term signature (HIGH)

**Business rule (RN007):** Convoked candidates must be able to digitally sign the acceptance
term without needing to physically appear.

**Implementation:**

### Database schema (new migration):
```sql
CREATE TABLE termos_aceite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convocacao_id UUID REFERENCES convocacoes(id) ON DELETE CASCADE,
  candidato_id UUID REFERENCES banco_talentos(id),
  vaga_id UUID REFERENCES vagas(id),
  arquivo_termo_path TEXT, -- Supabase Storage path of the term PDF
  token_assinatura TEXT UNIQUE, -- secure random token for public signing URL
  token_expira_em TIMESTAMPTZ, -- token expiration (default: 48h from send)
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'enviado', 'assinado', 'recusado', 'expirado')),
  enviado_em TIMESTAMPTZ,
  enviado_por UUID REFERENCES profiles(id),
  assinado_em TIMESTAMPTZ,
  ip_assinatura TEXT,
  recusado_em TIMESTAMPTZ,
  motivo_recusa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: internal users can read/write all; public can read/sign by token only
```

### Frontend:
1. In `ConvocacaoDetalhesModal`, add a "Enviar Termo de Aceite" section:
   - Upload field for the term PDF (or auto-generate from template)
   - Button: "Enviar para Assinatura" → generates a secure token and sends email
   - Status badge showing current term status

2. Generate a secure token for the public signing URL:
   ```ts
   const token = crypto.randomUUID() + '-' + Date.now();
   const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
   ```

3. Create a public route (no auth required): `/assinar-termo/:token`
   - This page fetches the termo by token, validates it's not expired
   - Shows the candidate's name, vaga, and the term PDF (embedded)
   - "Li e aceito os termos" checkbox + "Assinar Digitalmente" button
   - On signature: record IP, timestamp; update status to 'assinado'
   - Shows confirmation page: "Termo assinado com sucesso. Você receberá uma cópia por email."

4. In the internal system, show history of all terms sent, with statuses and timestamps.
5. Add a Supabase scheduled function or cron to mark tokens as 'expirado' after 48h.

### Email notification:
When a term is sent, trigger an email via Supabase Edge Function or Resend:
```
Assunto: [Agir Saúde] Termo de Aceite — [Cargo] / [Unidade]
Corpo: "Prezado(a) [Nome], você foi convocado(a) para a vaga de [Cargo] na unidade [Unidade].
Para confirmar sua participação, acesse o link abaixo e assine digitalmente o termo de aceite:
[LINK] (válido por 48 horas)"
```

---

## NEW FEATURE 2 — RF029: Automated convocation communications (HIGH)

**Business rule (RN011):** The system must send automated communications at each
selection stage via email (WhatsApp in future roadmap).

**Implementation:**

### Database schema:
```sql
CREATE TABLE comunicacao_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  etapa TEXT NOT NULL, -- 'convocacao', 'confirmacao', 'lembrete', 'resultado', etc.
  canal TEXT NOT NULL CHECK (canal IN ('email', 'whatsapp')),
  assunto TEXT, -- email subject
  corpo TEXT NOT NULL, -- template body with {placeholders}
  variaveis JSONB, -- list of available variables: ["nome_candidato", "cargo", "unidade", ...]
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comunicacoes_enviadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convocacao_id UUID REFERENCES convocacoes(id),
  candidato_id UUID REFERENCES banco_talentos(id),
  template_id UUID REFERENCES comunicacao_templates(id),
  canal TEXT NOT NULL,
  destinatario TEXT NOT NULL, -- email or phone
  assunto TEXT,
  corpo_renderizado TEXT NOT NULL, -- final rendered message
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'enviado', 'falha', 'entregue')),
  enviado_em TIMESTAMPTZ,
  erro_descricao TEXT,
  metadata JSONB, -- provider response, message ID, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Template engine:
```ts
function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => variables[key] ?? match);
}

// Available variables:
const templateVariables = {
  nome_candidato: candidate.nome,
  cargo: vaga.cargo,
  unidade: vaga.unidade,
  data_etapa: formatLocalDate(etapa.data),
  horario_etapa: etapa.horario,
  local_etapa: etapa.local,
  nome_edital: edital.nome,
  link_termo: `${window.location.origin}/assinar-termo/${termo.token}`,
};
```

### UI — Template management:
1. In Configurações → Comunicações (new tab), allow:
   - Creating/editing/deleting templates per stage
   - Preview with sample data
   - Enabling/disabling templates per channel
2. Default templates must be seeded (migration INSERT) for:
   - Convocação inicial
   - Lembrete 24h antes
   - Confirmação de presença
   - Resultado da seleção
   - Envio de termo de aceite

### UI — Sending communications:
1. In `ConvocacaoDetalhesModal` and from the convocações list:
   - Button "Enviar Comunicação" → opens a dialog:
     - Select template (pre-filtered by current stage)
     - Preview rendered message with candidate's data
     - Confirm and send
2. Auto-send: when a convocação is created with `tipo = 'automatico'`, immediately
   send the corresponding template without manual intervention.
3. History tab in each convocação showing all communications sent, with:
   - Template used, channel, sent timestamp, status, error if any.

### Email sending (Edge Function):
```ts
// supabase/functions/send-communication/index.ts
// Use Resend (resend.com) or SMTP for email
// Log result to comunicacoes_enviadas table
```

---

## ACCEPTANCE CRITERIA FOR PROMPT 3

After all fixes are applied:
- [ ] Edital PDF opens correctly in validation view (fresh signed URL)
- [ ] A downloadable import template is available with all required columns
- [ ] Import validates CPF format, detects duplicates, shows per-row errors
- [ ] Convocation history action buttons (details, resend, validate, desistência) all function
- [ ] Import history actions (view, download, reprocess) all function
- [ ] Acceptance term can be sent via email with a unique signing link
- [ ] Public signing page works without auth; records signature timestamp and IP
- [ ] Term status updates (pendente → enviado → assinado/recusado/expirado)
- [ ] Communication templates can be created and managed in settings
- [ ] Automated email is sent when a convocação is created or a stage changes
- [ ] Full communication history is visible per convocação
```

---

# PROMPT 4 — FASE 4: EDITAIS, DASHBOARD, INTEGRAÇÕES E REGRAS DE NEGÓCIO

> **Escopo:** RF004, RF015, RF023, RF027, RF030 + RN001–RN012 (enforcement) + NFRs  
> **Prioridade:** Crítica (RF027) / Média / Non-functional  
> **Pré-requisito:** Prompts 1, 2 e 3 completos

---

```
You are finalizing "Gestão de Provimento" (React + Supabase + TailwindCSS).
This final phase covers: RM integration (critical), dashboard improvements,
AI date suggestion fix, profile photo upload, system name configurability,
and enforcement of all business rules and non-functional requirements.

---

## FIX 1 — RF027: RM Integration (CRITICAL)

**Business rule (RN009):** The RM system is the official source of truth for corporate data:
positions (cargos), salaries, organizational structure, and job descriptions.

**Implementation:**

### Integration service pattern:
```ts
// src/services/rmIntegrationService.ts
export class RMIntegrationService {
  private baseUrl = import.meta.env.VITE_RM_API_URL;
  private apiKey = import.meta.env.VITE_RM_API_KEY;

  async getCargos(): Promise<Cargo[]> {
    // Fetches positions from RM API
    // Falls back to local cache if RM is unavailable
  }

  async getSalarioByCargoId(cargoId: string): Promise<number | null> { }

  async getEstruturaOrganizacional(): Promise<Unidade[]> { }

  async getAtribuicoesByCargoId(cargoId: string): Promise<string[]> { }
}
```

### Caching layer (Supabase table):
```sql
CREATE TABLE rm_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'cargo', 'unidade', 'salario', 'estrutura'
  rm_id TEXT NOT NULL,
  dados JSONB NOT NULL,
  sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
  valido_ate TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(tipo, rm_id)
);
```

### Sync strategy:
1. On system startup (App.tsx mount), trigger a background sync of cargos and unidades.
2. Implement a Supabase scheduled edge function `sync-rm` that runs every 6 hours.
3. When RM is unavailable: use cached data and show a warning banner:
   "⚠️ Dados corporativos sendo exibidos do cache (sincronizado em [data])."
4. All vaga creation forms must use RM cargos in the cargo dropdown (fetched from cache).
5. Salary fields in vagas must be read-only, populated from RM (not user-editable).
6. Add an admin "Sincronizar com RM agora" button in Configurações → Integrações.

**Note:** If RM API credentials are not yet available, implement the full integration service
with a mock adapter so the interface is ready for when credentials are provided. Use an
environment variable `VITE_RM_MOCK=true` to switch between mock and real.

---

## FIX 2 — RF004: Strategic indicators grouped as "Outros" instead of individual states (MEDIUM)

**Problem:** In the strategic view chart, when filtered by region, only Goiás shows
individually — all other states are grouped as "Outros."

**Fix:**
1. Find the chart component for "Visão Estratégica por Grupo Regional".
2. The grouping threshold (e.g., "show top 5, group rest as Outros") must be removed OR
   increased to show all states individually.
3. Implement a toggle: "Por Região" | "Por Unidade" | "Por Estado"
4. The chart must support at least 15-20 distinct color/label combinations.
5. Add interactive hover/click on chart segments to drill down:
   - Click on "Mato Grosso" → filters the dashboard to show only MT vagas.
6. In the region filter dropdown, list ALL states where the organization has units,
   not just Goiás.

---

## FIX 3 — RF015: AI date suggestion gives incorrect/past dates (MEDIUM)

**Problem:** The AI feature for edital date suggestions recommends past or incompatible dates
even when no date references exist in the uploaded document.

**Fix:**
1. Find the AI date suggestion logic (likely calls an AI API or local heuristic).
2. Add these guard rules before returning any date suggestion:
   ```ts
   function validateAISuggestedDate(suggestedDate: Date, context: EditorialContext): boolean {
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     
     // Rule 1: Never suggest past dates
     if (suggestedDate < today) return false;
     
     // Rule 2: Inscricao must start at least 5 business days from today
     // Rule 3: Selecao must be at least 15 days after inscricao.fim
     // Rule 4: Resultado must be at least 3 business days after selecao
     // Rule 5: Dates must be on business days (not weekends or public holidays)
     
     return true;
   }
   ```
3. If no dates are found in the uploaded document, the AI must return:
   ```ts
   { found: false, suggestion: null, message: "Nenhuma referência de datas encontrada no documento." }
   ```
   NOT hallucinated dates.
4. Show AI suggestions as "sugestões" with clear labeling: "Sugerido pela IA — revise antes de salvar"
   and allow the user to accept each date individually.
5. Add a feedback mechanism: thumbs up/down on AI suggestions to improve over time.

---

## FIX 4 — RF023: Profile photo upload fails (LOW)

**Problem:** Error when uploading a photo to user profile.

**Fix:**
1. Ensure the `avatars` Supabase Storage bucket exists with correct RLS policy:
   ```sql
   -- Allow authenticated users to upload their own avatar
   CREATE POLICY "Users can upload own avatar"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
   
   -- Allow anyone to view avatars
   CREATE POLICY "Avatars are publicly accessible"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'avatars');
   ```
2. In the upload component:
   - Validate file type: only `image/jpeg`, `image/png`, `image/webp` allowed
   - Validate file size: max 2MB
   - Resize before upload using `canvas` API to max 400x400px
   - Show upload progress
3. Path format: `{userId}/avatar.{ext}` (upsert — always replaces, never accumulates)
4. After upload, update `profiles.avatar_url` with the public URL.
5. Display the avatar in: header profile area, user list in admin, convocation records.

---

## FIX 5 — RF030: System name must be configurable without code changes (MEDIUM)

**Business rule:** The platform name must be updatable by the business area without developer intervention.

**Implementation:**
```sql
-- In sistema_configuracoes table (should already exist):
-- Add or ensure exists:
INSERT INTO sistema_configuracoes (chave, valor, descricao)
VALUES 
  ('nome_sistema', 'Gestão de Provimento', 'Nome oficial exibido no sistema'),
  ('subtitulo_sistema', 'Provimento Digital', 'Subtítulo/tagline do sistema'),
  ('logo_url', null, 'URL da logo personalizada')
ON CONFLICT (chave) DO NOTHING;
```

**Usage pattern:**
1. Create a React context `SystemConfigContext` that loads config on app startup.
2. All hardcoded system name references must use `config.nomeSistema`:
   - Sidebar header
   - Browser tab title (`<title>`)
   - Email templates
   - Report headers
   - Dashboard greeting
   - Footer
3. In Configurações → Sistema (admin only), add "Identidade do Sistema" section:
   - "Nome do sistema" text input
   - "Subtítulo" text input
   - "Salvar" button
4. Changes take effect immediately (no page reload needed — update context state).
5. The change must NOT break any Supabase integration (do not rename tables/functions).

---

## BUSINESS RULES ENFORCEMENT (RN001–RN012)

**Implement all of the following throughout the system:**

### RN001 — Complete vaga traceability:
Every status change of a vaga must INSERT into `audit_logs`:
```ts
await logAudit({
  acao: 'STATUS_CHANGE',
  modulo: 'vagas',
  registro_afetado: vaga.id,
  valor_anterior: { status: oldStatus, etapa: oldEtapa },
  valor_novo: { status: newStatus, etapa: newEtapa },
  justificativa: reason ?? null
});
```
Never allow a status change without this log.

### RN002 — Cronograma changes must have audit trail:
Wrap all edital schedule UPDATE operations with audit logging of before/after values.

### RN003 — Flow varies by vaga type:
Enforce in the UI and backend:
- **Vaga Comum / PCD:** Full 10-step flow (solicitação → admissão)
- **Vaga Liderança:** Simplified flow — skip edital publication; go directly to direct convocation
- **Rede Teia:** Custom simplified flow per business definition
Add a `tipo_vaga` field to vagas table with values: `comum | pcd | lideranca | rede_teia`.
The status transition function must validate allowed transitions per type.

### RN005 — Status changes allowed at any stage with justification:
Any authorized user can change a vaga status (return/reopen/cancel) but MUST provide a reason.
Implement a `JustificativaDialog` that appears on any non-forward status transition.

### RN008 — Import validation is mandatory:
Never allow raw file data to reach the database. All imports MUST pass through the validation
pipeline implemented in Prompt 3 Fix 2 before any INSERT.

### RN012 — Critical rules block flow advancement:
In every "next step" button/action in the vaga flow, run a pre-flight check:
```ts
async function canAdvanceToNextStage(vagaId: string): Promise<{ allowed: boolean; blockers: string[] }> {
  const blockers: string[] = [];

  // Check: required documents uploaded
  const docs = await getDocumentos(vagaId);
  if (!docs.find(d => d.tipo === 'edital' && d.status === 'aprovado')) {
    blockers.push("Edital não aprovado");
  }

  // Check: cronograma complete
  const cronograma = await getCronograma(vagaId);
  if (!isCronogramaComplete(cronograma)) {
    blockers.push("Cronograma incompleto");
  }

  // Check: responsible user assigned
  const validation = await getValidacao(vagaId);
  if (!validation.responsavel_id) {
    blockers.push("Responsável pela validação não definido");
  }

  return { allowed: blockers.length === 0, blockers };
}
```
Show blockers in a modal before letting the user proceed.

---

## NON-FUNCTIONAL REQUIREMENTS

### Security (LGPD compliance):
1. **PII data masking in logs:** Never log CPF, email, or phone numbers in `audit_logs.valor_anterior/novo`.
   Replace with `***` in audit entries.
2. **Session timeout:** Implement 30-minute inactivity auto-logout (check `InactivityLogout.tsx` exists).
   Show a 5-minute warning before logout.
3. **HTTPS only:** Ensure all Supabase calls use `https://`. Reject any configuration with `http://`.
4. **Role-based access (RLS):** Every Supabase table must have Row Level Security enabled.
   Verify all existing tables have RLS policies. Add missing ones.

### Performance:
1. All list pages (vagas, banco de talentos, convocações) must implement pagination:
   `LIMIT 20 OFFSET ?` with a "Carregar mais" button or page controls.
2. Add React Query (or Supabase's built-in `useQuery`) with `staleTime: 5 * 60 * 1000`
   for data that doesn't change frequently (cargos, unidades, templates).
3. Heavy pages (dashboard charts) must render with a skeleton loader while data loads.

### Responsiveness:
1. All pages must be functional on tablet (768px) and desktop (1280px+).
2. The sidebar must collapse to a hamburger menu on screens < 1024px.
3. Tables must become horizontally scrollable on mobile, with sticky action column.

### Audit completeness:
All actions in section 12 of the requirements document must be logged:
- Login / Logout
- Session time
- Status changes
- Cronograma changes
- Administrative changes
Verify coverage by reviewing each module against this list.

---

## ACCEPTANCE CRITERIA FOR PROMPT 4

After all fixes are applied:
- [ ] RM integration service exists with mock adapter; cargos load from RM cache in vaga forms
- [ ] Strategic indicators chart shows all states individually, not grouped as "Outros"
- [ ] AI date suggestions never return past dates; shows "no dates found" when document has none
- [ ] Profile photo uploads successfully; validates file type and size; displays in profile
- [ ] System name is configurable from admin settings; reflects in all UI locations
- [ ] Every vaga status change writes a complete audit log entry with user, timestamp, and reason
- [ ] Edital cronograma changes are fully audited
- [ ] Vaga types (comum/pcd/liderança/rede_teia) control which flow steps are required
- [ ] Status reversals/cancellations require a justification
- [ ] Critical flow blockers (missing docs, incomplete cronograma) prevent advancement
- [ ] All imports go through validation pipeline before database insertion
- [ ] Session timeout implemented; PII masked in audit logs; all tables have RLS
- [ ] All list pages paginated; loading skeletons shown on heavy pages
- [ ] System is responsive on tablet and desktop
```

---

## RESUMO DE COBERTURA

| RF/RN | Prompt | Prioridade | Status |
|-------|--------|------------|--------|
| RF001 – SPA routing 404 | P1 | Crítica | Fix 1 |
| RF002 – Filtros Visão Geral | P1 | Alta | Fix 2 |
| RF003 – Histórico de acessos | P1 | Alta | Fix 3 |
| RF004 – Indicadores por região | P4 | Média | Fix 2 |
| RF005 – Consultar outros bancos | P2 | Alta | Fix 1 |
| RF006 – Detalhes convocação + ícone Agie | P2 | Alta | Fix 2 |
| RF007 – Vínculo banco de talentos à vaga | P2 | Alta | Fix 3 |
| RF008 – Vagas Ativas vs Em Andamento | P2 | Média | Fix 4 |
| RF009 – Registro incorreto de usuário | P1 | Crítica | Fix 4 |
| RF010 – Data salva -1 dia | P1 | Crítica | Fix 5 |
| RF011 – Validação pós-aprovação; dropdown vazio | P2 | Alta | Fix 5 |
| RF012 – Replicar datas cronograma | P2 | Média | Fix 6 |
| RF013 – Envio edital sem validação completa | P1 | Crítica | Fix 6 |
| RF014 – Edital não abre na validação | P3 | Alta | Fix 1 |
| RF015 – IA sugere datas erradas | P4 | Média | Fix 3 |
| RF016 – Modelo importação banco talentos | P3 | Alta | Fix 2 |
| RF017 – Candidatos importados não aparecem | P1 | Crítica | Fix 7 |
| RF018 – Ações histórico convocações | P3 | Média | Fix 3 |
| RF019 – Bloqueio agenda em todas unidades | P2 | Alta | Fix 7 |
| RF020 – Auditoria e sessões não registram | P1 | Crítica | Fix 8 |
| RF021 – Ações nas importações | P3 | Alta | Fix 4 |
| RF022 – Inativação/suspensão usuário | P1 | Crítica | Fix 9 |
| RF023 – Upload foto perfil | P4 | Baixa | Fix 4 |
| RF024 – Troca senha obrigatória primeiro acesso | P1 | Alta | Fix 10 |
| RF025 – Portal da unidade | P2 | Alta | Fix 8 |
| RF026 – Redefinição de senha | P1 | Crítica | Fix 11 |
| RF027 – Integração RM | P4 | Crítica | Fix 1 |
| RF028 – Assinatura remota termo aceite | P3 | Alta | Feature 1 |
| RF029 – Comunicação automatizada convocações | P3 | Alta | Feature 2 |
| RF030 – Nomenclatura configurável | P4 | Média | Fix 5 |
| RN001–RN012 – Regras de negócio | P4 | Variada | Business Rules |
| NFRs – Segurança, performance, responsividade | P4 | Alta | Non-Functional |
