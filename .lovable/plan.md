
**Prompt reescrito:**

---

Aproveitando o momento, solicito uma **auditoria completa de sincronização Realtime** em todo o sistema, com foco especial em **Controle de Vagas** e nos demais módulos críticos. O objetivo é garantir que todas as ações executadas por um usuário sejam propagadas instantaneamente para os demais usuários conectados, sem necessidade de refresh.

---

### 🎯 Escopo da auditoria

**1. Controle de Vagas — Cadastro e movimentação**
- Ao cadastrar uma nova vaga, validar se ela aparece em tempo real para todos os usuários nas telas:
  - **Todas as Vagas**
  - **Vagas por Unidade (TEIA)**
  - **Vagas PCDs**
  - **Validação de Edital**
  - **Validação Final**
- Confirmar que o `INSERT` em `vagas` está persistindo no Supabase (não só no Zustand) e propagando via canal Realtime.
- Aplicar o mesmo padrão já consolidado em Convocações e Banco de Talentos: `supabase.auth.getUser()` para `created_by`/`updated_by`, whitelist de colunas, mensagem de erro detalhada.

**2. Alertas e Tarefas — Roteamento por cargo**
- Verificar se os alertas e tarefas gerados estão sendo entregues **apenas aos cargos corretos** que devem recebê-los.
- Validar que os filtros por perfil (`Administrador`, `Analista Administrativo`, `Analista do Edital`, `Analista da Unidade`, `Gestor`) estão corretos.
- Confirmar que a tabela `alertas`/`tarefas` está no `supabase_realtime` publication.

**3. Mensagens (Agie / Chat)**
- Ao enviar uma mensagem, validar se ela chega em tempo real para o(s) destinatário(s) corretos.
- Confirmar que a tabela `mensagens` propaga via Realtime e que o handler no front-end exibe a mensagem + atualiza o badge de não-lidas.

**4. Notificações (sino)**
- Validar que toda ação relevante (nova vaga, movimentação de etapa, nova convocação, novo banco, mensagem) gera um registro em `notificacoes` com `usuario_id` correto para cada destinatário.
- Confirmar que o sino e o toast atualizam em tempo real para todos os destinatários.

---

### 🧪 Metodologia de teste

Para cada fluxo, executar com **2 sessões simultâneas** (Usuário A e Usuário B com perfis distintos):

| # | Ação (Usuário A) | Resultado esperado (Usuário B) |
|---|---|---|
| 1 | Cadastra nova vaga | Vaga aparece em "Todas as Vagas" sem refresh |
| 2 | Vaga PCD cadastrada | Aparece em "Vagas PCDs" sem refresh |
| 3 | Vaga de unidade TEIA | Aparece na tela da unidade correspondente |
| 4 | Move vaga Fila → Redação | Vaga muda de coluna nas duas sessões |
| 5 | Valida edital | Status atualiza em tempo real |
| 6 | Gera alerta/tarefa | Apenas usuários com o cargo-alvo recebem |
| 7 | Envia mensagem na Agie | Destinatário recebe toast + badge sem refresh |
| 8 | Cria convocação | Já validado anteriormente ✅ |
| 9 | Cria banco de talentos | Já validado anteriormente ✅ |

---

### 📋 Entregáveis

1. **Relatório matricial** com o resultado de cada cenário: ✅ sincronizado / ❌ falhou + causa raiz + correção aplicada.
2. **Correções imediatas** dos pontos que falharem (aplicando o padrão `auth.getUser` + whitelist + erro detalhado + Realtime confirmado).
3. **Migration SQL** se faltar alguma tabela no `supabase_realtime` publication ou `REPLICA IDENTITY FULL`.
4. **Validação dos roteamentos** de alertas/tarefas/mensagens por cargo (consultando `useRBAC` / `usePermissions`).

---

## Plano de execução

### Fase 1 — Diagnóstico (read-only)
1. Inspecionar `vagasStore.ts` → funções `addVaga`, `updateVaga`, `addAlerta`, `addTarefa`, `addMensagem`, `subscribeRealtime`.
2. Verificar via `supabase--read_query`:
   - Quais tabelas estão em `supabase_realtime` publication.
   - Quais têm `REPLICA IDENTITY FULL`.
   - Schema de `alertas`, `tarefas`, `mensagens`, `notificacoes`.
3. Mapear nas páginas (`VagasPage`, `UnidadePortalPage`, `ValidacaoEditaisPage`, `ValidacaoPage`, `AlertasTarefasPage`, `MensagensPage`, `AgieChat`) onde está o INSERT/UPDATE e se passa pelo store async.
4. Conferir lógica de roteamento por cargo em alertas/tarefas/mensagens.

### Fase 2 — Correções
Para cada falha encontrada, aplicar:
- **Persistência:** trocar update local por update async no Supabase.
- **Auditoria:** `auth.getUser()` + whitelist de colunas + erro detalhado.
- **Realtime:** garantir tabela no publication + handler no `subscribeRealtime`.
- **Roteamento:** validar `usuario_id` correto no INSERT de alertas/tarefas/notificações.

### Fase 3 — Validação
Executar a matriz de 9 cenários acima com 2 sessões simultâneas e reportar resultado de cada um.

<lov-actions>
<lov-suggestion message="Aprovado. Execute o diagnóstico completo dos 9 fluxos (cadastro de vaga, vagas PCDs, unidade TEIA, movimentação de etapas, validação, alertas/tarefas por cargo, mensagens da Agie, notificações), aplique as correções necessárias seguindo o padrão auth.getUser + whitelist + erro detalhado + Realtime, e me entregue o relatório matricial com o resultado de cada cenário.">Executar auditoria completa e corrigir</lov-suggestion>
<lov-suggestion message="Antes de codar, entregue apenas o relatório de diagnóstico mostrando: quais fluxos persistem no banco, quais só ficam no Zustand, quais tabelas estão no Realtime publication e onde o roteamento por cargo está incorreto. Eu aprovo as correções depois.">Só diagnóstico primeiro</lov-suggestion>
<lov-suggestion message="Foque exclusivamente no Controle de Vagas (cadastro de vaga sincronizando em Todas as Vagas, Unidade TEIA, Vagas PCDs e Validação de Edital). Alertas/tarefas e mensagens da Agie ficam para uma próxima rodada.">Só Controle de Vagas agora</lov-suggestion>
</lov-actions>
