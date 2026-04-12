

## Plano — Atualizar Mapeamento de Bases/Unidades

### Alterações

1. **`src/lib/convocacaoUtils.ts`** — Reescrever `BASES_CONVOCACAO` com as 4 bases corretas:
   - Goiânia: HECAD, CRER, AGIR, HUGOL, HDS, TEIA ANÁPOLIS, TEIA CANEDO, TEIA APARECIDA, TEIA GOIÂNIA
   - Goiás: POLICLÍNICA, JATAÍ
   - Vitória: VITÓRIA, SÃO PEDRO, SUÁ
   - Fora: DOURADOS, CHS, HMSA, HRCAC, TEIA CEN, TEIA PIN, TEIA MAN, TEIA MAN 2, TEIA MAN 3

2. **`src/pages/ConvocacoesPage.tsx`** — Verificar que o filtro de unidades usa as chaves de `BASES_CONVOCACAO` e reflete as 4 bases no seletor.

3. **Regra de horários** — Verificar se a regra de 5 agendamentos por horário em Goiânia continua funcionando com as novas unidades TEIA adicionadas à base.

