

## Plano de Implementação

### Objetivo
Fixar as dimensões do popover da Agie e tornar a animação dos olhos mais natural e proporcional.

### Alterações em `src/components/AIAssistant.tsx`

**1. Dimensões fixas do popover:**
- Trocar `max-h-[520px]` por `h-[520px]` no container do popover para altura fixa
- Garantir que o layout interno use `flex flex-col` com `flex-1 overflow-hidden` no conteúdo
- Envolver o conteúdo de cada view em `ScrollArea` com `flex-1` para scroll interno

**2. Animação dos olhos — proporção:**
- Reduzir o tamanho dos olhos (ex: de `w-3 h-4` para `w-2.5 h-3`) para ficarem proporcionais ao avatar
- Ajustar a pupila proporcionalmente

**3. Animação dos olhos — velocidade:**
- Aumentar o intervalo do piscar de ~2-3s para **4-5 segundos** entre cada blink
- Reduzir a duração da animação de piscar para ~150-200ms (movimento rápido mas natural)
- Suavizar as transições de expressão com `transition-all duration-700` em vez de durações curtas
- Reduzir a frequência de mudança de estado dos olhos (idle, curious, alert) para parecer mais orgânico

