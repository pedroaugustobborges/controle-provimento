
**Prompt reescrito:**

---

Solicito **reformulação completa do módulo de Mensagens (Agie/Chat)** com correção crítica de sincronização e melhoria de UX no estilo WhatsApp.

### 🔴 Problema 1 — Mensagens não chegam ao destinatário
Testei enviando mensagem de Usuário A → Usuário B. O remetente vê a confirmação "sistema recebeu sua mensagem, vamos encaminhar ao usuário", mas **a mensagem nunca chega ao destinatário final**.

**Investigar:**
- Se o INSERT em `mensagens`/`notificacoes` está realmente persistindo no Supabase com `destinatario_id` correto.
- Se o canal Realtime propaga o evento INSERT para o destinatário.
- Se o handler do front-end no usuário B está escutando e renderizando a mensagem.
- Aplicar padrão consolidado: `auth.getUser()` + whitelist + erro detalhado.

### 🔴 Problema 2 — Remover mensagem técnica de confirmação
Remover o toast/aviso "sistema recebeu sua mensagem, vamos encaminhar ao usuário". O usuário não precisa saber dessa mecânica interna. A mensagem deve simplesmente aparecer no histórico.

### 🎨 Problema 3 — Reformular UI estilo WhatsApp
- Mensagens **enviadas pelo usuário atual**: balão à direita, cor primária (azul #275ac5), texto branco.
- Mensagens **recebidas de outros usuários**: balão à esquerda, cor neutra (cinza claro), texto escuro.
- Mostrar nome do remetente nas mensagens recebidas.
- Mostrar horário (HH:mm) abaixo de cada balão.
- Histórico cronológico com scroll automático para a última mensagem.
- Indicador visual de mensagem não-lida (badge).

### 🧪 Problema 4 — Validação multiusuário
Testar com **3 sessões simultâneas** (A, B, C):
- A → B: B recebe em tempo real, A vê no próprio histórico.
- A e C → B simultaneamente: B recebe ambas, sem perda.
- B responde A: A recebe sem refresh.
- Badge de não-lidas atualiza corretamente em todos os clientes.

### 📋 Entregáveis
1. Diagnóstico da causa raiz da falha de entrega.
2. Correção do `addMensagem` no `vagasStore` (auth + whitelist + erro + Realtime).
3. Refatoração visual do componente de chat estilo WhatsApp (bubbles diferenciadas).
4. Remoção do toast técnico de confirmação.
5. Teste end-to-end com 3 sessões simultâneas validando entrega 100%.

---

## Plano de execução

### Fase 1 — Diagnóstico
1. Inspecionar `src/components/chat/AgieChat.tsx`, `src/pages/MensagensPage.tsx` e `src/store/vagasStore.ts` (função `addMensagem`).
2. Verificar via `supabase--read_query`:
   - Schema das tabelas `mensagens` e `notificacoes` (campos `remetente_id`, `destinatario_id`, `conteudo`, `lida`).
   - Se `mensagens` está em `supabase_realtime` publication com `REPLICA IDENTITY FULL`.
3. Identificar onde o toast técnico é disparado.
4. Mapear o handler de subscription Realtime no front (filtro por destinatário, atualização de estado).

### Fase 2 — Correções
- **`vagasStore.ts > addMensagem`**: tornar async, persistir no Supabase com `auth.getUser()` para `remetente_id`, whitelist de colunas, erro detalhado, sem update otimista que bypassa o canal.
- **Subscription Realtime**: garantir handler para INSERT de `mensagens` filtrado por `destinatario_id = currentUser.id`, atualizando store e disparando toast amigável "Nova mensagem de {nome}".
- **Remover toast técnico** de "sistema recebeu/encaminhando".
- **Migration SQL** se faltar `REPLICA IDENTITY FULL` ou inclusão no publication.

### Fase 3 — UI WhatsApp-style
Refatorar `AgieChat.tsx` (ou criar `ChatBubble.tsx`):
- Container flex com `justify-end` para enviadas, `justify-start` para recebidas.
- Bubble enviada: `bg-primary text-white rounded-2xl rounded-br-sm`.
- Bubble recebida: `bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm`.
- Nome do remetente acima do bubble (apenas em recebidas).
- Timestamp `HH:mm` discreto abaixo.
- `useEffect` com `scrollIntoView` para auto-scroll na última mensagem.
- Badge de não-lidas no header e na sidebar.

### Fase 4 — Validação
Roteiro de teste com 3 sessões simultâneas (3 perfis distintos) cobrindo entrega, simultaneidade e badges.

<lov-actions>
<lov-suggestion message="Aprovado. Execute: (1) corrija addMensagem no vagasStore com persistência real no Supabase + auth.getUser + whitelist + erro detalhado; (2) garanta o canal Realtime de mensagens com handler filtrado por destinatário; (3) remova o toast técnico de confirmação; (4) refatore o chat estilo WhatsApp (bubbles diferenciadas, nome, timestamp, auto-scroll, badge de não-lidas); (5) valide com 3 sessões simultâneas.">Executar reformulação completa</lov-suggestion>
<lov-suggestion message="Antes de codar, entregue só o diagnóstico: por que as mensagens não chegam hoje, qual o schema real de mensagens/notificacoes, se está no Realtime publication, e onde o toast técnico é disparado. Eu aprovo as correções depois.">Só diagnóstico primeiro</lov-suggestion>
<lov-suggestion message="Foque exclusivamente na correção da entrega das mensagens (addMensagem persistir + Realtime entregar ao destinatário) e na remoção do toast técnico. A reformulação visual estilo WhatsApp fica para uma próxima rodada.">Só corrigir a entrega agora</lov-suggestion>
</lov-actions>
