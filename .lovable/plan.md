

## Plano: Corrigir botões de atalho na view TEIAs

### Alteração em `src/pages/VagasPage.tsx`
- Revisar a lógica condicional dos botões de atalho no card de resumo quando `filtroEspecial === 'teias'`
- Garantir que **não** exiba o botão/ícone de TEIAs nessa view
- Manter apenas: botão "Vagas PCD" (`Accessibility`) + botão "Voltar ao Controle de Vagas" (`ArrowLeft`)

