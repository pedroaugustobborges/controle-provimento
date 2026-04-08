

## Plano: Remover duplicação de info do usuário no header

### Problema
O header exibe o nome/perfil do usuário duas vezes: na saudação à esquerda E no bloco de texto à direita do avatar.

### Alterações em `src/components/AppLayout.tsx`:

1. **Remover o bloco textual** à direita do avatar (nome "Admin Master" e badge "Admin") — linhas que renderizam `currentUser?.nome_completo` e `currentUser?.perfil` na seção direita do header
2. **Manter apenas o avatar circular** com iniciais como elemento visual compacto
3. **Tornar o avatar clicável** com um dropdown (Meu Perfil, Sair) para dar funcionalidade ao espaço
4. **Manter inalterada** a saudação contextual à esquerda ("Boa noite, Admin" / "Gerente de TI · Admin")

### Arquivo modificado:
- `src/components/AppLayout.tsx` — remover bloco duplicado de nome/perfil na seção direita do header

