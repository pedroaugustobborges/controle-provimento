

## Plano: Vincular Suporte Técnico aos Analistas Administrativos

### Problema
A aba "Suporte Técnico" está vazia e desconectada dos usuários reais. O fluxo correto é:
1. Na gestão de usuários, ao cadastrar/editar um usuário com cargo "Analista Administrativo", deve haver uma opção para definir a **região de responsabilidade** (Goiânia, Espírito Santo, Demais Unidades)
2. A aba "Suporte Técnico" deve **puxar automaticamente** os analistas administrativos e exibir seus dados organizados por região

### Solução

**1. Adicionar campo `regiao_suporte` na tabela `profiles`** (migration)
- Novo campo `regiao_suporte TEXT` (valores: `'goiania'`, `'espirito_santo'`, `'demais'`, ou `null`)
- Identifica quais analistas são responsáveis por qual região

**2. Atualizar formulário de usuário em `AdministracaoPage.tsx`**
- Quando o cargo for "Analista Administrativo", exibir um Select para escolher a região de suporte: "Unidades Goiânia", "Unidades Espírito Santo", "Demais Unidades"
- Salvar no campo `regiao_suporte` do perfil

**3. Atualizar aba "Suporte Técnico"**
- Em vez de configurações manuais, buscar diretamente da tabela `profiles` os usuários que têm `regiao_suporte` preenchido
- Exibir cards por região mostrando: nome, email, Teams do analista responsável
- Manter a tabela `support_configs` para mensagens adicionais/configurações extras se necessário

### Arquivos afetados
- Nova migration: adicionar coluna `regiao_suporte` em `profiles`
- `src/pages/AdministracaoPage.tsx` — formulário de usuário + aba suporte
- `src/store/adminStore.ts` — incluir `regiao_suporte` nos dados do usuário

