
## Plano — Investigar e remover status fantasma `encaminhado_edital`

### Contexto
Usuário afirma que `encaminhado_edital` **não existe** como status válido no sistema, mas a auditoria revelou 7 vagas no banco com `status_fluxo_edital = 'encaminhado_edital'` e o código em `FilaAnalistaEditalPage.tsx` usa esse valor explicitamente para excluir vagas da Redação e mantê-las na Fila.

### Investigação necessária
1. `src/types/vaga.ts` — listar valores oficiais de `status_fluxo_edital` (enum/union type).
2. `src/pages/FilaEditaisPage.tsx` — confirmar qual status a Fila de Editais realmente usa para listar vagas.
3. `src/pages/FilaAnalistaEditalPage.tsx` — revisar uso de `'encaminhado_edital'` no filtro.
4. Buscar todas as ocorrências de `'encaminhado_edital'` no código (`code--search_files`).
5. Identificar qual é o status correto que representa "vaga encaminhada/aguardando redação na Fila de Editais" (provavelmente `'em_redacao'`, `null`, ou outro valor da enum oficial).

### Possíveis cenários
- **A**: `encaminhado_edital` é um valor legado/lixo gravado por bug antigo. Os 7 registros precisam ser corrigidos para o status oficial correspondente, e o código limpo.
- **B**: `encaminhado_edital` foi renomeado em algum momento (ex: para `aguardando_redacao` ou similar) e o código ficou desatualizado.
- **C**: Os 7 registros vieram de uma migração antiga e devem ser re-mapeados.

### Implementação proposta
1. **Identificar status correto** (após investigação) — mapear `encaminhado_edital` para o valor oficial.
2. **Atualizar `FilaAnalistaEditalPage.tsx`**: remover referências a `'encaminhado_edital'` e usar a lógica correta de mútua exclusão entre Fila e Redação.
3. **Atualizar `FilaEditaisPage.tsx`** se necessário, garantindo coerência.
4. **Migration de correção** dos 7 registros: `UPDATE vagas SET status_fluxo_edital = '<valor_correto>' WHERE status_fluxo_edital = 'encaminhado_edital';` (após confirmar valor com o usuário).
5. **Remover qualquer outra ocorrência** de `'encaminhado_edital'` no codebase.

### Validação
- Buscar no código: 0 ocorrências de `'encaminhado_edital'` após limpeza.
- Banco: 0 vagas com esse status.
- Fila e Redação continuam com mútua exclusão.

### Pergunta de confirmação (antes de executar)
Antes de aplicar a migração de UPDATE nos 7 registros, vou primeiro investigar e propor o **valor correto** para substituição. Se houver ambiguidade, perguntarei via `ask_questions`.

### Arquivos prováveis
- `src/types/vaga.ts` (enum oficial)
- `src/pages/FilaAnalistaEditalPage.tsx` (remover `encaminhado_edital`)
- `src/pages/FilaEditaisPage.tsx` (validar lógica)
- Migration SQL para corrigir os 7 registros

### Risco
Médio. Mexe em status de vagas reais e em filtros de duas páginas. Vou confirmar o valor de substituição antes de executar a migration. Validação end-to-end após aplicar.
