
## Plano: Adicionar foto do perfil no modal de Suporte Técnico

### Problema
O modal de Suporte Técnico na sidebar mostra apenas a inicial do nome do analista em vez da foto de perfil (avatar) que já está cadastrada no sistema.

### Correção em `src/components/AppSidebar.tsx` (linhas 490-492)

Substituir o div com a inicial:
```tsx
<div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
  {analyst.nome_completo?.charAt(0) || '?'}
</div>
```

Por um avatar com foto (com fallback para inicial):
```tsx
<div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white overflow-hidden">
  {analyst.avatar_url ? (
    <img src={analyst.avatar_url} alt={analyst.nome_completo} className="h-full w-full object-cover" />
  ) : (
    analyst.nome_completo?.charAt(0) || '?'
  )}
</div>
```

### Arquivo afetado
- `src/components/AppSidebar.tsx` — avatar no modal de suporte
