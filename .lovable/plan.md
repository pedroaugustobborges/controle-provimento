

## Plano de Correção — Seleção Visual dos Submenus

### Problema
Todos os submenus ficam visualmente selecionados ao mesmo tempo após a última alteração. A lógica de detecção de rota ativa está com matching excessivamente amplo.

### Correção

1. **`src/components/NavLink.tsx`** — Adicionar suporte à prop `end` do React Router (passando-a ao `RouterNavLink` interno), para que submenus usem correspondência exata de rota

2. **`src/components/AppSidebar.tsx`** — Nos submenus:
   - Usar `NavLink` com `end={true}` para garantir match exato da rota
   - Remover lógica manual de `isUrlActive` para submenus e confiar no mecanismo nativo do React Router (`NavLink` com `isActive`)
   - Garantir que `activeClassName` só é aplicado quando `isActive === true`
   - Simplificar `isParentActive` para apenas verificar se algum filho tem rota ativa

3. **Testar** navegação entre submenus de diferentes grupos para confirmar que apenas um fica selecionado por vez

