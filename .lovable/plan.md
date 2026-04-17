
## Plano — Validar fluxo de devolução e esclarecer status `encaminhado_edital`

### Entendimento do fluxo (confirmado pelo usuário)
1. **Controle de Vagas → Fila de Editais**: unidade encaminha vaga. Status muda para `encaminhado_edital`. `status_origem` guarda o status anterior (geralmente "SEM STATUS").
2. **Fila de Editais → Redação de Edital**: analista puxa para redigir. Status muda para `em_redacao`.
3. **Redação → devolver → Fila de Editais**: volta para `encaminhado_edital` (NÃO volta para Controle).
4. **Fila de Editais → devolver → Controle de Vagas**: restaura `status_origem` (geralmente "SEM STATUS"). Limpa `status_fluxo_edital` e `etapa`.

### Diagnóstico
O fluxo descrito **já está implementado corretamente** segundo investigação anterior. A confusão do usuário parece ser sobre a **existência** do status `encaminhado_edital` — ele acreditava ser fantasma, mas é legítimo e essencial para representar "vaga na Fila aguardando analista".

### Investigação adicional necessária
Para garantir 100% que o código bate com a regra:
1. `src/pages/FilaAnalistaEditalPage.tsx` — handler de devolver (Redação→Fila): confirmar que grava `status_fluxo_edital='encaminhado_edital'` e mantém `etapa='em_redacao'` ou similar.
2. `src/pages/FilaEditaisPage.tsx` — handler de devolver (Fila→Controle): confirmar restauração de `status_origem`, limpeza de `status_fluxo_edital` e `etapa`, e registro no histórico.
3. `src/types/vaga.ts` — confirmar enum oficial inclui `encaminhado_edital`.
4. Banco: verificar nos 7 registros se `status_origem` está populado corretamente (para garantir que a devolução para Controle vai funcionar).

### Possíveis ajustes (a confirmar após investigação)
- **Se `status_origem` estiver vazio nos 7 registros**: adicionar fallback robusto + migration defensiva populando `status_origem='SEM STATUS'`.
- **Se faltar registro no histórico** em alguma das transições: instrumentar.
- **Se houver qualquer divergência** entre o código atual e a regra descrita pelo usuário: corrigir.

### Implementação (após validação)
1. Ler os dois arquivos de handler e o enum.
2. Query SQL nos 7 registros: `SELECT id, status, status_origem, status_fluxo_edital, etapa FROM vagas WHERE status_fluxo_edital='encaminhado_edital';`
3. Apresentar diagnóstico real ao usuário com evidências.
4. Aplicar correções **apenas se** houver divergência real entre código e regra.

### Validação E2E
- Criar vaga teste → encaminhar para Fila → puxar para Redação → devolver → confirma que volta para Fila com `encaminhado_edital`.
- Devolver da Fila → confirma que volta para Controle com status original.

### Risco
Baixo. Etapa de validação primeiro; alterações apenas se necessário.
