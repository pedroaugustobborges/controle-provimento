
## Plano de investigação e correção — Perda de dados em Convocações

### Fase 1 — Investigação forense (read-only, antes de qualquer alteração)

1. **Inspecionar logs de auditoria** via `supabase--read_query`:
   - `SELECT * FROM auditoria_logs WHERE acao ILIKE '%DELETE%' OR acao ILIKE '%IMPORT%' ORDER BY created_at DESC LIMIT 100;`
   - `SELECT * FROM audit_logs WHERE modulo IN ('vagas','convocacoes','banco_candidatos') ORDER BY created_at DESC LIMIT 100;`
   - `SELECT * FROM importacoes ORDER BY created_at DESC LIMIT 30;` para ver se houve `importBySubstitution` recente (que faz DELETE total).
2. **Buscar a convocação de Goiânia do dia 17**:
   - `SELECT * FROM vagas WHERE unidade ILIKE '%goi%' AND (data_convocacao_planilha ILIKE '%17%' OR horario_convocacao_planilha ILIKE '%17%');`
   - Verificar `created_at`/`updated_at` para entender quando foi tocada por último.
3. **Mapear onde existem convocações** no schema atual: a tabela `vagas` tem campos `*_convocacao_planilha`, mas **não existe tabela dedicada `convocacoes`**. Confirmar com o usuário onde as convocações manuais estão sendo persistidas (provável que estejam na própria `vagas` ou em estado local não persistido — possível causa raiz).
4. **Revisar o código** de `src/components/AgendaDiaria.tsx`, `src/components/ConvocacaoDialog.tsx`, `src/services/databaseService.ts` (função `importBySubstitution` faz `DELETE` total da tabela!) e `src/lib/convocacaoUtils.ts` para entender o fluxo de salvamento.

### Fase 2 — Diagnóstico da causa raiz (hipóteses prováveis)

- **H1 (mais provável):** `importBySubstitution` faz `DELETE FROM vagas WHERE id != '00000000...'` — apaga **tudo** antes de reinserir. Qualquer convocação manual feita após a última importação é perdida na próxima importação.
- **H2:** Convocações estão sendo salvas apenas em estado local (Zustand) sem persistência real no banco.
- **H3:** Falta de tabela dedicada `convocacoes` — dados estão em campos da `vagas` que são sobrescritos por importações.

### Fase 3 — Correções estruturais (após confirmação da causa)

1. **Refatorar `importBySubstitution`** para nunca apagar registros com `origem = 'manual'`:
   ```sql
   DELETE FROM vagas WHERE origem = 'importada' AND import_batch_id IS DISTINCT FROM novo_batch;
   ```
2. **Implementar soft delete** em `vagas` e `banco_candidatos`: adicionar coluna `deleted_at TIMESTAMPTZ`, criar políticas RLS que filtrem `deleted_at IS NULL`, e substituir todos os `.delete()` por update de `deleted_at`.
3. **Criar tabela dedicada `convocacoes`** (se confirmado que não existe persistência adequada) com FK para `vagas`, RLS apropriada e trigger de auditoria.
4. **Trigger de auditoria universal** em `vagas`, `banco_candidatos`, `convocacoes`: registrar `OLD` completo em `auditoria_logs` em todo `UPDATE`/`DELETE`.
5. **Validar edge function `database-backup`**: confirmar agendamento, retenção e que o bucket `backups` está recebendo snapshots diários.

### Fase 4 — Recuperação dos dados perdidos

- Listar snapshots disponíveis no bucket `backups`.
- Restaurar registros apagados para uma tabela temporária e fazer merge com o estado atual sem sobrescrever dados novos.
- Reportar ao usuário exatamente o que foi recuperado.

### Fase 5 — Verificação

- Inserir uma convocação manual de teste.
- Rodar uma importação de planilha.
- Confirmar que a convocação manual **continua intacta**.
- Confirmar entrada correspondente em `auditoria_logs`.
- Confirmar que `deleted_at` impede DELETE físico.

### Pergunta antes de executar

Preciso que o usuário aprove o plano e confirme se posso:
(a) executar as queries de investigação no banco de produção;
(b) prosseguir com as alterações estruturais (soft delete + refator do importBySubstitution + nova tabela `convocacoes` se necessária) em seguida.
