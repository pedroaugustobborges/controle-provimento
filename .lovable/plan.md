

## Plano de Implementação

### Objetivo
Substituir a div do avatar do usuário no header por um componente `Avatar` circular profissional.

### Alterações em `src/components/Layout.tsx`

1. **Importar** `Avatar`, `AvatarFallback`, `AvatarImage` de `@/components/ui/avatar.tsx`
2. **Substituir** a div atual:
   ```tsx
   // DE:
   <div className="h-10 w-10 rounded-full bg-primary ...">JS</div>
   
   // PARA:
   <Avatar className="h-10 w-10 ring-2 ring-border">
     <AvatarImage src={userPhotoUrl} alt="João Silva" />
     <AvatarFallback className="bg-primary text-primary-foreground font-bold">JS</AvatarFallback>
   </Avatar>
   ```
3. Manter o layout existente do header intacto — apenas trocar o elemento do avatar

