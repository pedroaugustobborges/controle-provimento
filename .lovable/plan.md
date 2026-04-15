

## Plano: Implementar Zoom Interativo no Mapa da Página de Login

### O que será feito
Adicionar um efeito de lupa/zoom ao passar o mouse sobre a imagem do mapa na `LoginPage.tsx`. O zoom acompanhará a posição do cursor, permitindo ao usuário ver detalhes que não são legíveis no tamanho padrão.

### Alterações
**`src/pages/LoginPage.tsx`:**
- Envolver a imagem do mapa em um container com `overflow-hidden` e `cursor-zoom-in`
- Adicionar handler `onMouseMove` para capturar coordenadas do cursor e calcular `transform-origin` dinâmico (em %)
- Aplicar `transform: scale(2)` no hover via estado React (`isHovering`)
- Adicionar `onMouseLeave` para resetar o zoom
- Transição suave com `transition: transform 0.3s ease`

