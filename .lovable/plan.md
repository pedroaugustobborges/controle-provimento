
**Prompt reescrito:**

---

Foi identificado um **novo problema de sincronização** no fluxo de movimentação de vagas entre etapas do processo de edital.

**Problema reproduzido:**
A criação de convocação está sincronizando corretamente entre usuários ✅. Porém, quando um analista pega uma vaga na **Fila de Editais** e a encaminha para **Redação de Edital**, essa movimentação **só aparece para o usuário que executou a ação** — não propaga para os outros analistas administrativos nem para os analistas do edital. Testado com dois usuários administradores simultâneos.

**Comportamento esperado:**

1. **Sincronização em tempo real da movimentação:** Quando uma vaga é movida da **Fila de Editais → Redação de Edital**, a alteração deve aparecer instantaneamente na tela de todos os usuários conectados (sem refresh).

2. **Notificações automáticas devem ser disparadas para:**
   - Todos os **Analistas Administrativos**.
   - Todos os **Analistas do Edital**.
   - O **usuário que originalmente enviou a vaga para a Fila de Editais** (ex.: Analista da Unidade) — para acompanhamento do status.

3. **Mesmo fluxo de notificação na próxima etapa:** Quando a vaga sair de **Redação → Validação de Edital** (e nas demais transições), o mesmo grupo de destinatários deve receber notificação em tempo real.

**Investigação solicitada:**

1. Identificar onde no código a movimentação "Fila de Editais → Redação" é persistida (provável: update na tabela `vagas` campo `etapa` ou `status`, ou inserção em `editais`).
2. Confirmar se o update está realmente chegando ao Supabase ou se está apenas no estado local (Zustand) do usuário que moveu.
3. Verificar se há subscription Realtime ativa para o módulo de Editais nos componentes `FilaEditaisPage`, `EditaisPage` e `ValidacaoEditaisPage`.
4. Verificar se as notificações estão sendo criadas na tabela `notificacoes` com `usuario_id` correto para cada destinatário.

---

## Plano de execução

### Fase 1 — Diagnóstico
1. Inspecionar as páginas/componentes envolvidos: `FilaEditaisPage.tsx`, `EditaisPage.tsx`, `ValidacaoEditaisPage.tsx`, e a função do store que move a vaga entre etapas.
2. Verificar se o update persiste no banco (`vagas.etapa` / `vagas.status` / tabela `editais`) ou se fica só em memória.
3. Confirmar se a subscription Realtime do `vagasStore` cobre as mudanças necessárias para essas páginas.
4. Mapear onde notificações deveriam ser disparadas e por que não estão sendo criadas.

### Fase 2 — Correção

**A. Persistência da movimentação:**
- Garantir que mover vaga "Fila → Redação" execute `UPDATE` na tabela `vagas` (ou `editais`) no Supabase, não apenas no Zustand.
- Aplicar a mesma proteção já usada em convocações: `auth.getUser()` para `updated_by`, whitelist de colunas, mensagem de erro detalhada.

**B. Sincronização Realtime:**
- Confirmar que `editais` e `vagas` propagam UPDATE pelo canal já existente no `vagasStore.subscribeRealtime`.
- Adicionar handler específico no store para refletir mudança de `etapa` em todas as telas que listam vagas/editais.

**C. Notificações automáticas:**
Criar função utilitária `notificarMovimentacaoEdital(vagaId, novaEtapa, usuarioOrigemId)` que:
1. Busca todos os usuários com `perfil IN ('Administrador', 'Analista Administrativo', 'Analista do Edital')` ativos.
2. Inclui também o `usuarioOrigemId` (quem enviou para a fila).
3. Insere uma linha em `notificacoes` para cada destinatário com `usuario_id`, `titulo`, `mensagem`, `tipo='movimentacao_edital'`, `registro_id=vagaId`.
4. Chamar essa função em **toda transição**: Fila → Redação, Redação → Validação, Validação → Publicação.

**D. Realtime de notificações:**
- Confirmar que o handler de `notificacoes` no `vagasStore` (já existente) está exibindo o toast e atualizando o sino para todos os destinatários.

### Fase 3 — Validação
- Abrir 2 sessões (Admin A e Admin B).
- Admin A move vaga da Fila → Redação.
- Admin B deve ver a vaga sumir da Fila e aparecer em Redação **sem refresh**.
- Ambos devem receber toast + notificação no sino.
- Repetir para Redação → Validação.

<lov-actions>
<lov-suggestion message="Aprovado. Execute o diagnóstico completo e aplique todas as correções: persistência da movimentação no banco, sincronização Realtime entre telas de Editais e disparo automático de notificações para Administrativos, Analistas do Edital e usuário de origem.">Executar plano completo</lov-suggestion>
<lov-suggestion message="Antes de codar, gere o relatório de diagnóstico mostrando: onde a movimentação é persistida hoje, se chega ao banco, qual subscription Realtime cobre Editais e por que as notificações não estão sendo criadas. Eu aprovo a correção depois.">Só diagnóstico primeiro</lov-suggestion>
<lov-suggestion message="Foque apenas em garantir que a movimentação Fila → Redação sincronize em tempo real entre os usuários. As notificações automáticas ficam para uma próxima rodada.">Só sincronização agora</lov-suggestion>
</lov-actions>
