

## Plano: Layout unificado premium — Login + Carrossel integrados

### O que será feito
1. **Corrigir unidades cortadas em GO**: Reduzir padding/espaçamento dos itens para que todas caibam no `h-[380px]` sem corte
2. **Unificar login + carrossel em um único card premium**: Substituir o layout atual (texto à esquerda + carrossel à direita) por um **único container glassmorphism** com duas colunas integradas

### Alterações em `src/pages/LoginPage.tsx`

**Layout unificado (seção `main`):**
- Criar um **único card glassmorphism grande** que ocupe a área central da página
- **Coluna esquerda** (~45%): Título "Controle de Provimento", descrição da AGIR, stats (20+ unidades, 6 estados, etc.), e os 3 botões de ação (Login Provimento, Login Unidade, Solicitar Acesso)
- **Coluna direita** (~55%): Carrossel de unidades integrado — sem borda/card próprio, flui naturalmente dentro do container unificado
- Separador vertical sutil (linha `border-white/[0.06]`) entre as duas colunas
- Tudo dentro do mesmo `backdrop-blur`, mesmas bordas, mesma sombra

**Correção das unidades cortadas:**
- Reduzir `py-2` para `py-1.5` nos itens de unidade
- Reduzir `text-[12px]` para `text-[11px]` no nome
- Ajustar `h-[380px]` para `h-[420px]` se necessário para acomodar o slide de GO com 6 unidades

**Responsivo:**
- Em telas `< lg`: layout empilhado (login em cima, carrossel embaixo)
- Manter modais inalterados

