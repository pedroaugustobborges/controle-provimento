

## Plano: Centralizar stats e atualizar rodapé do card

### O que será feito
1. Centralizar números e labels dos 4 stats na coluna esquerda do card unificado
2. Substituir o texto redundante "6 estados · 20+ unidades" no canto inferior direito por texto institucional

### Alterações em `src/pages/LoginPage.tsx`

- Adicionar `text-center` e `items-center` nos containers de cada stat para centralizar número + label
- Substituir o texto do rodapé inferior direito por algo como "Sistema de Controle de Provimento" ou "Gestão Integrada AGIR"
- Manter todo o restante inalterado

