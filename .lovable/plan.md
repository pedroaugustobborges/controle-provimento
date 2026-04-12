

## Plano de Correção — Erro "This Page Does Not Exist"

### Diagnóstico
O problema está no componente `ProtectedRoutes` em `src/App.tsx`. Ele usa `<Routes>` aninhado dentro de outro `<Routes>`, e o catch-all `<Route path="*" element={<Navigate to="/" replace />} />` está redirecionando para `/` ao invés de mostrar a página correta. Além disso, o `vercel.json` e `public/_redirects` podem estar interferindo no roteamento SPA.

Preciso verificar:
1. A estrutura de rotas aninhadas e o catch-all
2. Se `vercel.json` tem rewrite correto para SPA
3. Se a autenticação está causando redirects indevidos durante refresh

### Correções em `src/App.tsx`
- Verificar que a rota `/*` em `ProtectedRoutes` está montada corretamente com as rotas filhas
- Garantir que o catch-all não redireciona rotas válidas com query params
- Confirmar que o loading state do `useAuth` não causa flash de redirect

### Correções em `vercel.json`
- Garantir rewrite `{ "source": "/(.*)", "destination": "/index.html" }` para SPA fallback

### Verificar `src/hooks/useAuth.ts`
- Confirmar que após refresh o estado de autenticação é restaurado antes de redirecionar para `/login`

