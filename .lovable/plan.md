

## Plano de Implementação

### Objetivo
Refatorar o popover da Agie para usar **navegação hierárquica por funções** em vez de abas. A tela inicial mostra uma lista de funções (Mensagens, Alertas, Notificações, Feedback, Novidades). Ao clicar, o conteúdo troca para as sub-opções daquela função, com botão "Voltar".

### Alterações

**Arquivo: `src/components/AIAssistant.tsx`**

1. **Remover sistema de Tabs** — substituir por estado de navegação (`currentView`) que controla qual tela está visível dentro do popover
2. **Tela inicial (menu principal):** Lista vertical de 5 botões/cards com ícone:
   - 📨 Mensagens (com badge de não lidas)
   - ⚠️ Alertas do Sistema
   - 🔔 Notificações (com badge)
   - 💡 Feedback / Melhorias
   - ✨ Novidades
3. **Tela "Mensagens":** Sub-menu com opções:
   - Enviar por Cargo → lista de cargos → conversa
   - Enviar por Chefia/Supervisão → lista supervisoras → conversa
   - Enviar por Unidade → região → unidade → pessoa → conversa
   - Buscar por Nome → input de busca → pessoa → conversa
   - Histórico Enviadas → listagem
   - Histórico Recebidas → listagem
4. **Tela "Alertas":** Lista de alertas filtrados (atraso/crítico) com redirecionamento
5. **Tela "Notificações":** Lista completa de alertas com redirecionamento ao clicar
6. **Tela "Feedback":** Formulário com select de tipo + textarea + botão enviar (reutilizando lógica existente da MensagensPage)
7. **Tela "Novidades":** Lista estática de atualizações do sistema
8. **Header:** Mostra título da função atual + botão Voltar (seta) quando não está no menu principal
9. **Manter:** Animação dos olhos sem boca, badge total de não lidos no botão flutuante, dimensões compactas `w-[380px] max-h-[520px]`

