
## Plano — Corrigir AGIE: remover "Mensagem" e estabilizar badge piscando

### Investigação necessária (após aprovação)
- `src/components/chat/AgieChat.tsx` — localizar e remover qualquer opção/botão/step "Mensagem" remanescente. Confirmar que `ChatStep` está restrito a `INITIAL | ALERTS | FEEDBACK | NEWS`.
- `src/types/chat.ts` — já está correto (sem MESSAGE), mas verificar se há strings hardcoded "Mensagem" no AgieChat.
- `src/components/Layout.tsx` ou header equivalente — localizar indicador "Sistema Sincronizado" e o badge ao lado. Identificar fonte do contador.
- `src/store/vagasStore.ts` + hooks de notificação — verificar se há múltiplos `useEffect` ou subscriptions atualizando o mesmo badge.
- Procurar por `setInterval`, `subscribe`, `postgres_changes` relacionados a alertas/tarefas/mensagens.

### Causa provável

**Problema 1 (Mensagem na AGIE)**: opção legada não removida do `AgieChat.tsx` — provavelmente um botão de ação rápida ou item de menu inicial.

**Problema 2 (badge piscando 1↔2)**: dois cálculos concorrentes do contador:
- Um effect/selector conta `alertas não lidos + tarefas pendentes` = 2
- Outro conta só `mensagens não lidas` = 1
- Ambos atualizam o mesmo state em ms diferentes → flicker visual.

Alternativa: subscription Realtime duplicada por StrictMode sem cleanup, causando dobra/desdobra de contagem.

### Implementação

**A. Remover "Mensagem" da AGIE**
- Em `AgieChat.tsx`: remover botão/case/step relacionado a mensagem. Garantir que apenas Alertas, Feedback e Novidades apareçam no menu inicial.

**B. Unificar contador do badge**
- Criar um único `useMemo` ou selector centralizado em `vagasStore` (ex: `getTotalNotificacoes`) que retorne o total de não lidas.
- No header/Layout: usar APENAS esse selector. Remover quaisquer cálculos paralelos.
- Confirmar cleanup correto de subscriptions Realtime (`return () => channel.unsubscribe()`).

**C. Validar reatividade**
- Garantir que o badge re-renderize só quando o total muda (não a cada tick).
- Conferir que não há `setInterval` rodando em paralelo.

### Validação (após implementação)
- AGIE aberta → menu inicial mostra apenas Alertas, Feedback, Novidades. Sem "Mensagem".
- Badge ao lado de "Sistema Sincronizado" exibe número estável (sem piscar).
- Marcar 1 alerta como lido → badge decrementa de forma estável.
- Refresh da página → contagem permanece consistente.

### Arquivos prováveis
- `src/components/chat/AgieChat.tsx` (remover Mensagem)
- `src/components/Layout.tsx` (badge unificado)
- `src/store/vagasStore.ts` (selector único de notificações)

### Risco
Baixo. Remoção de opção legada + unificação de fonte de verdade do contador. Vou validar visualmente no preview após a implementação.
