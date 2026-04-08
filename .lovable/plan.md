

## Plano: Remover badge "Tem Banco" duplicada abaixo do cargo

### Problema
Na tabela de Vagas (`src/pages/VagasPage.tsx`), abaixo do nome do cargo aparece uma badge **"Tem Banco"** (linha 301) junto com as badges de tipo de vaga e PCD. Isso é redundante porque já existe uma **coluna dedicada** ao status do banco (linhas 305-337) que mostra "Tem banco válido", "Banco prorrogado", "Banco vencido" ou "Não tem banco" com ícone e cores.

### Solução
**Remover a badge "Tem Banco"** da célula do cargo (linha 301), mantendo apenas as badges de tipo de vaga e PCD. A informação de banco já está claramente exibida na coluna própria ao lado.

### Arquivo alterado:
- `src/pages/VagasPage.tsx` — remover linha 301 (`{getBancoByVaga(v.id) && <Badge ...>Tem Banco</Badge>}`)

Alteração mínima de 1 linha.

