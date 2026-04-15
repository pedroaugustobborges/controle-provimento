

## Plano: Corrigir deslogamento durante uso ativo

### Problema
O `InactivityLogout` escuta apenas `mousedown`, `mousemove`, `keypress`, `scroll`, `touchstart` sem `capture: true`. Componentes Radix UI (dropdowns, selects, dialogs) chamam `stopPropagation()`, impedindo que os eventos cheguem ao `window` e resetem o timer.

### Alterações em `src/components/InactivityLogout.tsx`

1. **Expandir lista de eventos** — adicionar `click`, `input`, `change`, `focus`, `pointerdown`, `pointerup`
2. **Usar `{ capture: true }`** em todos os listeners para interceptar eventos antes de qualquer `stopPropagation()`
3. Manter timeout de 30min e aviso de 5min inalterados

```typescript
const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'input', 'change', 'focus', 'pointerdown', 'pointerup'];

events.forEach(event => {
  window.addEventListener(event, handleEvent, { capture: true });
});

// cleanup
events.forEach(event => {
  window.removeEventListener(event, handleEvent, { capture: true });
});
```

Sem outras alterações necessárias.

