
**Prompt reescrito:**

---

Está ocorrendo uma **falha ao salvar novas convocações** no sistema. Preciso que seja feita uma investigação detalhada e testes end-to-end para identificar e corrigir a causa raiz.

**Tarefas solicitadas:**

1. **Reproduzir o erro**
   - Tentar criar uma nova convocação pelo fluxo padrão (tela de Convocações / Agenda Diária / Banco de Talentos).
   - Capturar a mensagem de erro exata exibida ao usuário e o erro retornado pelo Supabase no console do navegador (aba Network e Console).

2. **Investigar possíveis causas**
   - Verificar se o payload enviado para a tabela `convocacoes` está completo e com os tipos corretos (campos obrigatórios, FKs válidas, formatos de data/hora).
   - Conferir se as **políticas RLS** da tabela `convocacoes` permitem `INSERT` para o usuário autenticado.
   - Validar se há algum **trigger** ou **constraint** (NOT NULL, CHECK, UNIQUE, FK) bloqueando a inserção.
   - Confirmar se o `vaga_id` referenciado existe e não está soft-deleted.
   - Checar logs do Postgres via `supabase--read_query` para erros recentes de INSERT.

3. **Testes**
   - Executar uma inserção manual de teste para isolar se o problema é no front-end (payload incorreto) ou no banco (RLS/constraint).
   - Validar o fluxo completo após a correção: criar → aparecer na agenda → sincronizar para outro usuário.

4. **Reportar e corrigir**
   - Apresentar a causa raiz identificada.
   - Aplicar a correção (ajuste de payload, RLS, trigger, ou tipo de coluna).
   - Confirmar funcionamento com nova convocação de teste.

---

## Plano de execução

### Fase 1 — Diagnóstico (read-only)
1. Inspecionar `src/store/vagasStore.ts` (função `addConvocacao`) e `src/components/ConvocacaoDialog.tsx` para entender o payload enviado.
2. Consultar schema atual de `convocacoes` via `supabase--read_query`:
   - Colunas, tipos, NOT NULL, defaults.
   - Políticas RLS ativas para INSERT.
   - Triggers existentes.
3. Verificar últimas tentativas de insert / logs de erro recentes.

### Fase 2 — Correção
Baseado no diagnóstico, aplicar uma das correções:
- **Se RLS bloqueando:** ajustar policy de INSERT em `convocacoes`.
- **Se payload incompleto:** corrigir `addConvocacao` no store para enviar todos os campos NOT NULL (ex.: `vaga_id`, `unidade`, `nome_candidato`, `data_convocacao`, `created_by`).
- **Se constraint/trigger:** ajustar a constraint ou o trigger conforme necessário.
- **Se tipo de dado incompatível:** normalizar formato (ex.: data ISO).

### Fase 3 — Validação
- Inserir convocação de teste pelo UI.
- Confirmar persistência via query no banco.
- Confirmar sincronização realtime para outra aba.

<lov-actions>
<lov-suggestion message="Aprovado. Execute o diagnóstico completo (schema, RLS, payload do addConvocacao, ConvocacaoDialog) e em seguida aplique a correção da causa raiz da falha ao salvar convocações.">Executar diagnóstico e correção</lov-suggestion>
<lov-suggestion message="Antes de corrigir, gere apenas o relatório de diagnóstico mostrando: schema da tabela convocacoes, políticas RLS, payload enviado pelo front-end e qual é o erro exato. Eu aprovo a correção depois.">Só diagnóstico primeiro</lov-suggestion>
<lov-suggestion message="Verifique e reproduza o erro end-to-end criando uma convocação de teste, capture a mensagem exata do Supabase e me mostre antes de qualquer alteração.">Reproduzir erro primeiro</lov-suggestion>
</lov-actions>
