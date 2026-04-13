

## Plano: Corrigir filtro de unidades e adicionar filtro por unidade na Agenda Goiânia

### Problema identificado
1. O dropdown de filtro usa as **bases** de `BASES_CONVOCACAO` (Goiânia, Goiás, Vitória, Fora) — quando `selectedRegiao === 'goiania'`, mostra apenas "Goiânia" (que é redundante). Quando `selectedRegiao === 'outras'`, mostra Goiás/Vitória/Fora mas **não** as unidades individuais.
2. Na Agenda Goiânia, não existe filtro por unidade individual (HECAD, CRER, etc.).

### Alterações

**`src/pages/ConvocacoesPage.tsx`** — ajustar o `useMemo` de `unidades` (linhas 126-136):
- Quando `selectedRegiao === 'goiania'`: listar as **unidades individuais** de Goiânia (HECAD, CRER, AGIR, HUGOL, HDS, TEIA ANÁPOLIS, TEIA CANEDO, TEIA APARECIDA, TEIA GOIÂNIA) importadas de `UNIDADES_GOIANIA` do `convocacaoUtils`
- Quando `selectedRegiao === 'outras'`: listar as **unidades individuais** das demais regiões (POLICLÍNICA, JATAÍ, VITÓRIA, SÃO PEDRO, SUÁ, DOURADOS, CHS, HMSA, HRCAC, TEIA CEN, TEIA PIN, TEIA MAN, TEIA MAN 2, TEIA MAN 3) importadas de `UNIDADES_OUTRAS`
- Sem região: manter as bases (Goiânia, Goiás, Vitória, Fora)

**`src/pages/ConvocacoesPage.tsx`** — ajustar `matchesUnidadeFilter` (linhas 139-147):
- Quando o filtro é uma unidade individual (ex: "HECAD"), comparar diretamente com a unidade da convocação (case-insensitive)
- Manter lógica de bases quando o filtro é uma base

Nenhuma alteração de banco de dados necessária.

