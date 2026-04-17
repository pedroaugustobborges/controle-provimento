
## Plano de execução — Diagnóstico e correção do envio/recebimento de mensagens AGIE

### Fase 1 — Diagnóstico técnico
1. Inspecionar `src/store/vagasStore.ts` (função `addMensagem` + handler Realtime de `notificacoes`).
2. Inspecionar `src/components/chat/AgieChat.tsx` e `src/pages/MensagensPage.tsx` (resolução de destinatário e renderização do histórico).
3. Consultar `notificacoes` via `supabase--read_query` para verificar se INSERTs recentes de `tipo='mensagem'` estão persistindo com `remetente_id` e `usuario_id` corretos.
4. Verificar via SQL se a tabela `notificacoes` está em `supabase_realtime` publication com `REPLICA IDENTITY FULL`.
5. Validar políticas RLS atuais da tabela `notificacoes` (SELECT deve permitir tanto remetente quanto destinatário).

### Fase 2 — Correções prováveis
- **Realtime publication**: migration para garantir `ALTER TABLE notificacoes REPLICA IDENTITY FULL` e `ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes` se faltar.
- **RLS SELECT**: confirmar policy `auth.uid() = usuario_id OR auth.uid() = remetente_id`.
- **addMensagem (vagasStore)**: garantir `auth.getUser()`, whitelist de colunas e tratamento de erro detalhado com `toast.error` exibindo a causa real.
- **AgieChat**: garantir que o `profile.id` resolvido seja passado como `destinatario_id` (não o nome curto).
- **Subscription handler**: garantir filtro por `usuario_id === myId` e atualização do `historicoMensagens` + dedupe por `id`.

### Fase 3 — Validação end-to-end
- Inserção de teste via `supabase--insert` simulando A→B.
- Conferir leitura via `supabase--read_query` (registro presente, RLS permite ambos).
- Solicitar ao usuário teste real entre 2 sessões para confirmar entrega em tempo real.

### Entregáveis
1. Diagnóstico com causa raiz identificada.
2. Migration SQL (se necessário) + ajustes em `vagasStore.ts` e `AgieChat.tsx`.
3. Roteiro de teste documentado.

<lov-actions>
<lov-suggestion message="Aprovado. Execute o diagnóstico completo, aplique as correções necessárias (Realtime publication, RLS, addMensagem, handler) e valide com teste real de inserção SQL entre dois usuários.">Executar diagnóstico + correção</lov-suggestion>
<lov-suggestion message="Antes de codar, entregue só o diagnóstico: status da publication Realtime, RLS atual de notificacoes, últimos INSERTs de tipo=mensagem e onde exatamente o fluxo quebra. Eu aprovo as correções depois.">Só diagnóstico primeiro</lov-suggestion>
<lov-suggestion message="Faça um teste end-to-end real agora: insira via SQL uma mensagem de A para B, confirme que B recebe via Realtime sem refresh, e me mostre o resultado com prints/logs.">Teste real end-to-end agora</lov-suggestion>
</lov-actions>
