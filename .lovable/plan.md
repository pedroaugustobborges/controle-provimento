
## Plano — Auditoria e comprovação de proteção de dados (fluxo Edital)

### Objetivo
Gerar relatório verificável de que as recentes correções de filtro (Redação ↔ Fila) **não causaram perda de dados** e que as proteções (auditoria, versionamento, soft-delete, RLS) estão ativas.

### Etapas

**1. Inventário de integridade (queries read-only no Supabase)**
- `SELECT count(*) FROM vagas WHERE deleted_at IS NULL;` — total de vagas ativas.
- `SELECT status_fluxo_edital, count(*) FROM vagas WHERE deleted_at IS NULL GROUP BY 1;` — distribuição por status.
- `SELECT count(*) FROM vagas WHERE deleted_at IS NULL AND edital_id IS NOT NULL AND status_fluxo_edital IS NULL;` — vagas legadas (candidatas a backfill).
- `SELECT count(*) FROM vagas WHERE etapa = 'em_redacao' AND status_fluxo_edital = 'encaminhado_edital';` — detectar inconsistências.

**2. Validação de mútua exclusão Fila ↔ Redação**
- Simular o filtro de cada página em SQL e cruzar resultados (`INTERSECT`) — deve retornar 0 linhas.

**3. Auditoria e versionamento**
- `SELECT count(*), max(created_at) FROM audit_logs WHERE modulo IN ('vagas','editais') AND created_at > now() - interval '7 days';` — confirmar que alterações recentes geraram trilha.
- Confirmar incremento de `version` em vagas alteradas (amostragem de 5 registros recentemente atualizados).

**4. Soft-delete e RLS**
- Confirmar que filtros de listagem aplicam `deleted_at IS NULL` (revisão dos serviços).
- Listar políticas RLS ativas das tabelas críticas (`vagas`, `editais`, `validacoes_editais`) — já temos no contexto, apenas validar.

**5. Proposta de backfill (não-destrutivo)**
- Migration sugerida (apresentar SQL, **não executar sem aprovação**):
```sql
UPDATE vagas
SET status_fluxo_edital = 'em_redacao'
WHERE deleted_at IS NULL
  AND edital_id IS NOT NULL
  AND status_fluxo_edital IS NULL
  AND (etapa = 'em_redacao' OR etapa IS NULL);
```
- Backup automático via tabela `backups` antes de executar.

**6. Roteiro de teste E2E manual no preview**
- Documentar passos: criar vaga teste → enviar para edital → abrir Redação → devolver para Fila → confirmar exclusividade visual + persistência após refresh + entrada em `audit_logs`.

### Entregáveis
- Relatório consolidado (markdown) com:
  - Tabela de contagens (antes/depois quando aplicável).
  - Lista de vagas candidatas a backfill (se houver).
  - Confirmação de auditoria ativa.
  - SQL de backfill pronto (aguardando aprovação para execução).
  - Checklist do teste E2E.

### Arquivos a consultar (read-only)
- `src/pages/FilaAnalistaEditalPage.tsx`, `src/pages/FilaEditaisPage.tsx` (filtros).
- `src/services/databaseService.ts`, `src/store/vagasStore.ts` (persistência + soft-delete).
- `src/hooks/useAudit.ts` (registro de auditoria).

### Risco
Nenhum — etapa puramente investigativa/diagnóstica. Backfill só é executado após aprovação explícita do usuário.
