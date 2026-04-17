
## Plano — Validação real e correção definitiva do envio de mensagens AGIE para o Izac

### Fase 1 — Diagnóstico do estado atual (read-only)
1. Consultar `notificacoes` via SQL para ver as últimas mensagens de `tipo='mensagem'` envolvendo o Izac (como remetente e destinatário) — confirmar se mensagens recentes foram persistidas.
2. Verificar via SQL se `notificacoes` está em `supabase_realtime` publication e tem `REPLICA IDENTITY FULL`.
3. Revisar `src/components/chat/AgieChat.tsx` — confirmar como o destinatário é resolvido no clique de "Enviar" (selectedRecipient → profile.id).
4. Revisar `src/store/vagasStore.ts` — função `addMensagem` (payload do INSERT) + handler Realtime (filtro e dedupe).
5. Revisar `src/pages/MensagensPage.tsx` — fluxo de envio + filtro de histórico por contato.
6. Validar policies RLS atuais de `notificacoes` (SELECT/INSERT para remetente e destinatário).

### Fase 2 — Correções prováveis
- **AgieChat / MensagensPage**: garantir que o `destinatario_id` enviado seja o UUID real do perfil do Izac (não nome curto), com busca ILIKE robusta na `profiles` e fallback se não encontrar.
- **addMensagem (vagasStore)**: garantir whitelist de colunas (`usuario_id`, `remetente_id`, `remetente_nome`, `titulo`, `mensagem`, `tipo='mensagem'`), `auth.getUser()` antes do INSERT, e `toast.error` exibindo o erro real do Supabase se falhar.
- **Subscription handler**: garantir filtro `usuario_id === myId`, dedupe por `id`, e atualização imediata do `historicoMensagens` + toast.
- **RLS / Realtime**: aplicar migration se faltar `REPLICA IDENTITY FULL` ou se SELECT não cobrir remetente+destinatário.
- **Logs de debug**: adicionar `console.log` temporários no envio (payload, resposta) e na subscription (evento recebido) para evidenciar o teste real.

### Fase 3 — Teste real end-to-end com o Izac
1. Inserir via SQL uma mensagem real de teste de outro usuário ativo → Izac, simulando o que a UI faria, e confirmar persistência.
2. **Pedir ao usuário** para abrir 2 sessões reais (uma normal logada como remetente, uma anônima logada como Izac) e enviar uma mensagem pela UI.
3. Coletar via console logs / network o que aconteceu no envio e na recepção, e confirmar entrega em tempo real sem refresh.
4. Se falhar, iterar correção até o fluxo real funcionar 100%.

### Entregáveis
1. Diagnóstico com causa raiz real (não suposta).
2. Correções aplicadas em `AgieChat.tsx`, `vagasStore.ts`, `MensagensPage.tsx` e/ou migration RLS/Realtime.
3. Confirmação visual/log do teste real Ana → Izac → Ana funcionando em tempo real.
4. Roteiro reproduzível para o usuário validar com qualquer par de perfis.

<lov-actions>
<lov-suggestion message="Aprovado. Execute o diagnóstico completo, aplique correções com logs de debug, e me dê o roteiro exato (qual usuário usar, qual senha, qual botão clicar) para eu testar em 2 sessões reais agora.">Diagnóstico + correção + roteiro de teste real</lov-suggestion>
<lov-suggestion message="Antes de mexer no código, me mostre o diagnóstico real: últimas 10 mensagens de tipo=mensagem envolvendo o Izac no banco, status da publication Realtime, RLS atual, e onde exatamente o fluxo quebra na UI. Eu aprovo as correções depois.">Só diagnóstico real primeiro</lov-suggestion>
<lov-suggestion message="Faça você o teste real agora: simule via SQL uma mensagem da Ana para o Izac com payload idêntico ao da UI, confirme via query que persistiu com remetente_id e usuario_id corretos, e me mostre o resultado. Depois eu testo na UI.">Teste SQL idêntico à UI agora</lov-suggestion>
</lov-actions>
