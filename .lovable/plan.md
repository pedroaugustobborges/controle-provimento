

## Plano: Reorganizar slide de Goiás em duas seções e integrar informações

### O que será feito
Modificar o slide de Goiás no carrossel da `LoginPage.tsx` para dividir as unidades em duas colunas (Hospitalares e Rede Teia) e integrar os nomes completos/cidades dentro do card, mantendo as dimensões atuais.

### Alterações

**`src/pages/LoginPage.tsx`:**
- Reestruturar o slide de Goiás em layout de **duas colunas** (grid `grid-cols-2`):
  - **Coluna 1 — Unidades Hospitalares:** CRER, HDS, HUGOL, HECAD, Policlínica, HEJ — cada uma com sigla em destaque e nome completo/cidade em texto menor abaixo
  - **Coluna 2 — Rede Teia Agir:** 4 clínicas Teia com cidade abaixo de cada
- Ajustar `slidesData` para separar `hospitals` e `teia` no objeto de Goiás
- Reduzir `text-xs`/`text-[10px]` nos nomes completos para caber sem scroll
- Manter dimensões do card e glassmorphism inalterados
- Manter consistência visual dos demais slides

