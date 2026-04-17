
## Plano — Simplificar AGIE para apenas notificações do sistema

### 1. Investigação rápida (read-only)
- Reler `src/components/chat/AgieChat.tsx` para mapear os passos (`ChatStep`) e quais conduzem a chat entre usuários vs. notificações.
- Reler `src/pages/MensagensPage.tsx`, `src/components/AppSidebar.tsx` e `src/App.tsx` para localizar rota e item de menu.
- Buscar referências a `COMMUNICATION_HUB`, `BY_REGION`, `BY_UNIT`, `BY_PERSON`, `BY_ROLE`, `CONVERSATION`, `SUPERVISION` para garantir remoção completa.
- Identificar onde estão hoje os fluxos de **Alertas**, **Feedback** e **Melhorias/News** (ex.: passo `FEEDBACK`, `NEWS`, integração com `AlertasTarefasPage`).

### 2. Perguntas a confirmar com o usuário (antes de codar)
- Remover totalmente a rota `/mensagens` do menu, ou manter com aviso de descontinuada?
- Apagar dados antigos de mensagens entre usuários no banco, ou só esconder da UI?
- Confirmar que nenhum fluxo crítico ainda usa chat 1:1.

### 3. Implementação (após aprovação)
1. **`src/types/chat.ts`**: enxugar `ChatStep` mantendo só `INITIAL`, `FEEDBACK`, `NEWS` (+ um novo `ALERTS` se necessário).
2. **`src/components/chat/AgieChat.tsx`**:
   - Remover renderização e handlers dos passos de chat entre usuários.
   - Reescrever passo `INITIAL` com 3 botões: **Alertas do sistema**, **Feedback / Melhorias**, **Novidades**.
   - Remover imports/uso de `UNITS`, `ROLES` e seleção de pessoas.
3. **`src/components/AppSidebar.tsx`**: remover item de menu "Mensagens" (ou marcar como descontinuado conforme decisão).
4. **`src/App.tsx`**: remover rota `/mensagens` (ou apontar para uma página de aviso).
5. **`src/pages/MensagensPage.tsx`**: deletar ou substituir por componente simples de aviso.
6. **`src/data/chatData.ts`**: manter por ora (não usado), ou remover se nada mais referenciar.
7. **Backend (condicional)**: se aprovado, criar migração para remover/arquivar tabelas de mensagens entre usuários.

### 4. Validação (testes a executar e relatar)
- **Alertas**: abrir AGIE → escolher Alertas → confirmar lista de alertas reais (prazos, tarefas) + badge.
- **Feedback**: enviar feedback de teste → confirmar persistência + confirmação visual.
- **Melhorias/Novidades**: abrir seção → confirmar exibição correta de itens.
- Confirmar que nenhuma opção de chat entre usuários aparece mais na UI.
- Conferir console por erros após a limpeza.

### 5. Entrega
- AGIE simplificada com 3 funções claras.
- Rota/menu `/mensagens` tratados conforme decisão.
- Relatório curto do resultado dos 3 testes ao final.
