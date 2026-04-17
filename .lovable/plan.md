
## Plano — Garantia de persistência absoluta no Portal Unidade

### 1. Diagnóstico
- Ler `src/pages/UnidadePortalPage.tsx` para mapear todos os campos editáveis e o fluxo atual de salvamento.
- Identificar onde está faltando `await` ou onde o estado local diverge do servidor.
- Verificar se há salvamento apenas em memória (state) sem persistência em backend.

### 2. Camadas de proteção (defesa em profundidade)

**Trava 1 — Auto-save com debounce**
- Criar hook `useAutoSave(value, saveFn, delay=800)` que dispara salvamento automático no backend após o usuário parar de digitar.
- Aplicar em todos os campos editáveis (observações, status, etc.).
- Indicador visual: "Salvando..." → "Salvo ✓" → "Erro" via toast/badge.

**Trava 2 — Rascunho local em localStorage**
- Criar utilitário `draftStore.ts` com chaves no formato `portal-unidade:draft:{userId}:{recordId}`.
- Salvar snapshot do form a cada alteração + timestamp.
- Ao montar a página: comparar timestamp do rascunho local vs `updated_at` do servidor → se local for mais novo, exibir banner "Recuperar alterações não salvas?".
- Limpar rascunho após confirmação de save no servidor.

**Trava 3 — Bloqueio de saída**
- Hook `useBeforeUnload(hasUnsavedChanges)` que registra listener no `window.beforeunload`.
- Bloqueia refresh/fechamento se houver alterações pendentes na fila.

**Trava 4 — Versionamento otimista**
- Reusar coluna `version` já existente em `vagas` e `banco_candidatos` via `DatabaseService.saveWithConcurrency` (já implementado).
- Garantir que toda update no Portal Unidade passe por esse caminho.
- Em conflito: toast de erro + opção "Recarregar dados".

**Trava 5 — Fila de retry offline**
- Criar `retryQueue.ts` em localStorage: `[{action, payload, timestamp, attempts}]`.
- Listener `window.online`: ao reconectar, reprocessar fila com backoff exponencial.
- Limite de tentativas (ex.: 5) antes de marcar como erro permanente e notificar usuário.

### 3. Arquivos a criar/alterar
- `src/hooks/useAutoSave.ts` (novo)
- `src/hooks/useBeforeUnload.ts` (novo)
- `src/lib/draftStore.ts` (novo)
- `src/lib/retryQueue.ts` (novo)
- `src/components/SaveStatusIndicator.tsx` (novo) — badge visual
- `src/components/DraftRecoveryBanner.tsx` (novo) — banner de recuperação
- `src/pages/UnidadePortalPage.tsx` — integrar todas as travas

### 4. Validação
- Editar campo → ver "Salvando..." → "Salvo ✓".
- Editar e dar F5 imediatamente → banner de recuperação aparece.
- Editar offline (DevTools > Network > Offline) → fila acumula → reconectar → retry automático.
- Editar e tentar fechar aba → `beforeunload` bloqueia.
- Dois usuários editando o mesmo registro → segundo recebe aviso de conflito.
