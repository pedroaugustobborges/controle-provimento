

## Correção: Conteúdo "vazando" atrás do header em todas as páginas

### Problema
O conteúdo das páginas (Vagas, Banco de Talentos, etc.) continua aparecendo visualmente por trás do header sticky. O breadcrumb bar e possivelmente o header principal ainda têm fundos transparentes ou semi-transparentes em certas condições.

### Solução em `src/components/AppLayout.tsx`:

1. **Garantir fundo opaco no `<header>` wrapper** — adicionar `bg-background` diretamente no elemento `<header>` (linha 88), não apenas nos divs internos. Isso garante que NENHUM conteúdo vaze por trás, independente da rota.

2. **Breadcrumb bar com fundo opaco** — a barra de breadcrumb (linha ~193) usa `bg-muted/30` (semi-transparente). Trocar para `bg-muted` ou `bg-background` sólido.

3. **Manter consistência** — tanto o modo expandido quanto o compacto devem usar fundos 100% opacos em todos os elementos do header.

### Alteração mínima — apenas classes CSS no header e breadcrumb bar.

