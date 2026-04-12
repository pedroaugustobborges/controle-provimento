

## Plano de Implementação

### 1. Buscar e corrigir referências a "AIDE"/"Aide"
- Buscar em todo o codebase por ocorrências de "AIDE" ou "Aide" (case-insensitive)
- Substituir todas por "Agie"

### 2. Reverter foto do usuário no rodapé da sidebar
- Em `src/components/AppSidebar.tsx`, reverter a alteração que substituiu o ícone `<Users>` pela foto do usuário (`avatarDefault`) no rodapé do menu lateral
- Voltar ao ícone original (`<Users className="h-4 w-4 text-white" />`) dentro do div circular
- Remover o import de `avatarDefault` se não for mais usado nesse arquivo

