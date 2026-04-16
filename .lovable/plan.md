

## Plano: Simplificar e agrupar status de vagas

### Análise necessária
Preciso verificar todos os locais que referenciam os status para garantir consistência:
- `src/types/vaga.ts` — tipos e labels
- `src/pages/VagasPage.tsx` — filtro de status
- `src/lib/vagaUtils.ts` — cores e utilitários
- `src/components/StatusBadge.tsx` — exibição
- Demais componentes que usem `StatusVaga`

### Alterações planejadas

**1. `src/types/vaga.ts`**
- Manter o type `StatusVaga` com todos os valores (para compatibilidade com dados existentes)
- Criar um mapeamento `STATUS_DISPLAY_MAP` que agrupa status sinônimos para um label unificado
- Atualizar `STATUS_VAGA_LABELS` para refletir os nomes corretos

**2. `src/pages/VagasPage.tsx`**
- Alterar o filtro de status para usar apenas os status agrupados/simplificados
- Quando filtrar por "Concluída", incluir tanto "CONCLUÍDAS" quanto "CONCLUÍDA"
- Quando filtrar por "Documentação", incluir os 3 sub-status
- Remover "ACOMPANHAMENTO DE EDITAL" e "PUBLICAR NOVO EDITAL" do filtro
- Renomear "EM ANDAMENTO" para "Em Edital"

**3. `src/lib/vagaUtils.ts`**
- Ajustar `getStatusColor` para os status agrupados

**4. `src/components/StatusBadge.tsx`**
- Usar o mapeamento unificado para exibição

