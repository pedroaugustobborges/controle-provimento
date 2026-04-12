

## Plano de Implementação

### Objetivo
Reverter o componente `AIAssistant.tsx` do formato Sheet (drawer lateral) para um **popover flutuante compacto** posicionado acima do botão da Agie, mantendo todas as melhorias (olhos expressivos, 4 abas, badge, redirecionamento).

### Alterações

**Arquivo: `src/components/AIAssistant.tsx`**
- Remover imports do `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`
- Substituir o bloco `<Sheet>` por um `<div>` posicionado com `fixed bottom-24 right-6` (acima do botão flutuante)
- Usar `AnimatePresence` + `motion.div` para animação suave de abertura/fechamento
- Dimensões compactas: `w-[380px] max-h-[520px]` com `rounded-2xl shadow-2xl`
- Manter header com avatar da Agie + título "Central de Comunicação"
- Manter as 4 abas (Enviadas, Recebidas, Alertas, Notificações) dentro do espaço compacto
- Adicionar botão de fechar (X) no header
- Tudo mais permanece inalterado (animação dos olhos, badge, lógica de navegação, dados do store)

