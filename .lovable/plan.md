

## Plano: Dividir Goiás em 2 slides e fixar altura do card

### O que será feito
Corrigir a variação de tamanho do carrossel e dividir o slide de Goiás em dois slides independentes (Hospitalares e Rede Teia), mantendo layout consistente.

### Alterações

**`src/pages/LoginPage.tsx`:**
- Separar o objeto Goiás no `slidesData` em dois entries:
  - `{ state: 'Goiás', subtitle: 'Unidades Hospitalares', units: [CRER, HDS, HUGOL, HECAD, Policlínica, HEJ] }`
  - `{ state: 'Goiás', subtitle: 'Rede Teia Agir', units: [Teia Goiânia, Teia Aparecida, Teia Senador Canedo, Teia Anápolis] }`
- Remover o layout condicional `grid-cols-2` para Goiás — todos os slides usam o mesmo layout de coluna única
- Definir **altura fixa** no container do slide (`h-[380px]` ou similar) para evitar redimensionamento
- Usar `overflow-hidden` para garantir que nenhum conteúdo extrapole
- Atualizar contagem de dots de navegação para refletir o novo total de slides
- Ordem: GO Hospitais → GO Teia → AM → SP → MS → MT → ES

