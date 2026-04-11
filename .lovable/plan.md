

## Plano: Melhorar visual do menu lateral e adicionar botão de logout

### Alterações no `src/components/AppSidebar.tsx`:

1. **Indicação visual clara do subitem ativo:**
   - Reforçar o contraste do subitem ativo com fundo mais visível (`bg-white/15` + borda lateral branca sólida de 2px)
   - Reduzir destaque dos subitens inativos para evitar ambiguidade (usar `text-slate-500` mais suave)
   - Adicionar uma linha vertical de progresso nos submenus, com pontos/dots indicando a posição atual

2. **Visual mais robusto e corporativo:**
   - Adicionar separadores (`<div className="h-px bg-white/10">`) entre seções
   - Ajustar padding e espaçamento para dar mais densidade
   - Melhorar ícones dos subitens — usar dots/circles em vez do `CornerDownRight` genérico, com cores diferenciadas por estado (ativo/visitado/futuro)

3. **Rodapé — Botão de Logout:**
   - Adicionar botão "Sair" com ícone `LogOut` na área do rodapé, abaixo de "Acessar Perfil"
   - Estilizar com cor destrutiva sutil (`text-red-400 hover:bg-red-500/10`)
   - Conectar ao `signOut()` do hook `useAuth` + navegação para `/login`

### Arquivos a modificar:
- `src/components/AppSidebar.tsx` — todas as alterações acima

