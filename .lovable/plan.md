

## Plano de Implementação

### Objetivo
Substituir todas as referências a "Aide" pelo nome correto "Agie" em todo o codebase, garantindo consistência de nomenclatura com o Sistema AGIR.

### Passos

1. **Busca global** por `Aide` (case-insensitive) em todo o projeto para mapear todas as ocorrências
2. **Substituir** cada ocorrência por `Agie` nos seguintes locais prováveis:
   - `src/store/vagasStore.ts` — campo `remetente` nos dados mock de mensagens
   - `src/components/AIAssistant.tsx` — textos, labels, badges
   - `src/components/chat/AgieChat.tsx` — referências internas
   - `src/data/mockData.ts` — dados simulados
   - Qualquer outro arquivo encontrado na busca
3. **Validar** que nenhuma referência a "Aide" restou no código

