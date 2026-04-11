

## Plano: Otimizar velocidade de navegação e feedback visual do menu

### Diagnóstico
A lentidão ao navegar entre páginas provavelmente é causada por:
- Páginas pesadas (ex: VagasPage com 3000+ vagas) sendo renderizadas sincronamente
- Falta de lazy loading nas rotas
- Re-renderizações desnecessárias ao trocar de página

### Implementação

1. **Lazy Loading de todas as páginas no App.tsx**
   - Converter todos os imports de páginas para `React.lazy()` com `Suspense` e um fallback skeleton/spinner
   - Isso evita que o bundle inteiro seja carregado de uma vez

2. **Feedback visual imediato no menu (AppSidebar.tsx)**
   - O NavLink do React Router já muda o estado ativo via `useLocation`, que é instantâneo — verificar se não há bloqueio

3. **Transição suave no conteúdo principal (AppLayout.tsx)**
   - Adicionar uma animação leve de fade no container de conteúdo usando CSS `transition` ou `framer-motion` já presente no projeto

4. **Skeleton de carregamento global**
   - Criar um componente `PageSkeleton` simples para usar como fallback do `Suspense`, dando feedback visual enquanto a página carrega

### Arquivos a modificar
- `src/App.tsx` — lazy imports + Suspense
- `src/components/AppLayout.tsx` — transição de fade no conteúdo
- Criar `src/components/PageSkeleton.tsx` — fallback de carregamento

