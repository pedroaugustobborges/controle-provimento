

## Plano: Header fixo com variações contextuais por página

### Objetivo
Tornar o header superior mais dinâmico e vivo, mantendo-o fixo no topo com variações visuais sutis que mudam conforme a página ativa.

### Alterações em `src/components/AppLayout.tsx`:

1. **Mapeamento de contexto por rota** — Criar um objeto que associa cada rota a uma cor de destaque e ícone específico (ex: `/vagas` → azul/Briefcase, `/convocacoes` → âmbar/Megaphone, `/gestor` → roxo/Settings)

2. **Scroll-aware compact mode** — Usar `useState` + `useEffect` com listener de scroll para detectar quando o usuário rola a página:
   - **Expandido (scroll = 0):** Header completo com saudação, busca visível, altura normal (~64px)
   - **Compacto (scroll > 50px):** Esconder saudação, reduzir altura (~48px), aplicar backdrop-blur mais intenso

3. **Variação visual no breadcrumb** — O item ativo do breadcrumb recebe um pill/chip com a cor contextual da página (ex: fundo azul claro com texto azul em "Processos Seletivos")

4. **Transições CSS suaves** — Adicionar `transition-all duration-300` no header para animar mudanças de altura, opacidade e cores

5. **Glassmorphism no scroll** — Quando compacto, aplicar `bg-white/80 backdrop-blur-xl` para efeito de transparência elegante

### Arquivo modificado:
- `src/components/AppLayout.tsx`

