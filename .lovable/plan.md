

## Plano de Implementação

### Objetivo
Corrigir o destaque visual dos submenus no menu lateral: apenas o submenu ativo deve ter estilo de "selecionado", e deve haver um indicador visual (linha vertical ou indentação) conectando submenus ao grupo pai.

### Passos

1. **Analisar `src/components/AppSidebar.tsx`** para entender a estrutura atual de grupos e submenus, e como o estado ativo é determinado
2. **Ajustar estilos do item ativo**: garantir que apenas o submenu clicado receba destaque (fundo/cor), e que o grupo pai permaneça expandido mas sem o mesmo estilo de selecionado
3. **Adicionar indicador visual de hierarquia**: aplicar uma linha vertical lateral ou indentação nos submenus para evidenciar que pertencem ao grupo pai
4. **Verificar variáveis CSS** em `src/index.css` para garantir que as cores de sidebar estão coerentes com o design

