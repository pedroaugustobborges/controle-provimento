

## Plano: Substituir mapa por card interativo premium

### O que será feito
Remover a imagem do mapa e o zoom interativo da `LoginPage.tsx`, substituindo por um card glassmorphism/premium que exibe as unidades de saúde organizadas por estado (GO e ES), com ícones, chips interativos e animações sutis.

### Alterações

**`src/pages/LoginPage.tsx`:**
- Remover import do `mapaNobg`, estados `isHovering`/`transformOrigin` e handlers de mouse
- Criar card com glassmorphism (`backdrop-blur`, `bg-white/10`, bordas sutis, sombra)
- Seção **Goiás**: título com ícone MapPin + 10 unidades como chips/badges com hover effect
- Seção **Espírito Santo (Vitória)**: título com ícone MapPin + 2 unidades como chips/badges
- Animações de entrada (fade-in) e hover (scale sutil + highlight)
- Responsivo ao espaço disponível

**Arquivos removidos/limpos:**
- `src/assets/mapaNobg.png` pode ser mantido mas não será mais importado

