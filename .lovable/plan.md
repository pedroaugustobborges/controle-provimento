

## Problema
O conteúdo da página (`<main>`) está passando visualmente por trás do header sticky, criando um efeito de "vazamento" — o texto e elementos ficam visíveis através do header semi-transparente (causado pelo `bg-white/80` e `backdrop-blur`).

## Solução

### `src/components/AppLayout.tsx`
1. **Trocar fundo semi-transparente por fundo sólido** no header:
   - Modo compacto: `bg-white/80` → `bg-white` (opaco)
   - Modo expandido: manter gradiente mas com base totalmente opaca (`from-white via-white`)
   - Manter o `backdrop-blur` como fallback, mas o fundo opaco já resolve o problema
   
2. **Adicionar `shadow-sm`** no header quando em modo compacto para criar separação visual clara entre header e conteúdo

3. **Garantir `z-20`** no header (já existe) para que fique sempre acima do conteúdo

Alteração mínima — apenas ajustar as classes CSS do header para usar fundos opacos em vez de semi-transparentes.

