

## Plano de Implementação

### Objetivo
Encontrar e corrigir todas as ocorrências de "AIDE" na Central de Comunicação, substituindo por "Agie".

### Passos
1. Buscar no codebase por "AIDE" (case-sensitive e case-insensitive) em todos os arquivos `.ts` e `.tsx`
2. Verificar especificamente `src/pages/MensagensPage.tsx`, `src/components/chat/AgieChat.tsx`, `src/data/chatData.ts` e `src/store/vagasStore.ts`
3. Substituir todas as ocorrências de "AIDE" por "Agie" nos textos, labels, mensagens e dados mock
4. Manter referências de código (nomes de variáveis, imports) consistentes — alterar apenas strings voltadas ao usuário

