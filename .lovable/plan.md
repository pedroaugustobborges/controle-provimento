

## Plano: Adicionar drop-shadow branco na imagem do mapa

### Alteração
**`src/pages/LoginPage.tsx`:**
- Adicionar `filter: drop-shadow(0 0 2px white) drop-shadow(0 0 4px white)` na tag `<img>` do mapa (`mapaNobg`) via classe Tailwind (`drop-shadow`) ou style inline
- Isso cria um halo branco ao redor dos textos da imagem, corrigindo artefatos da remoção de fundo

