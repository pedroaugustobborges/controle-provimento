

## Plano: Filtro hierárquico por região na página Vagas PCD

### Alterações

**1. `src/pages/VagasPage.tsx`**
- Corrigir título: remover travessão, exibir apenas "Vagas PCD" quando `filtro=pcd`
- Quando `filtro=pcd`, substituir o Select de unidades por um componente de filtro hierárquico:
  - Dois botões de região: "Goiás" e "Vitória (ES)"
  - Ao selecionar região, exibir chips/botões pequenos das unidades daquela região que possuam vagas PCD
  - Ao clicar numa unidade, filtrar a tabela por aquela unidade
  - Usar as listas de unidades já definidas no Core Memory do projeto

**2. Lógica de filtragem**
- Calcular dinamicamente quais unidades de cada região têm vagas PCD (baseado nos dados carregados)
- Permitir desmarcar unidade para voltar a ver todas as vagas PCD da região

