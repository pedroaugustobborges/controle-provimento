

## Plano — Corrigir Agenda Diária: horários, informações e separação por base

### 1. Corrigir horários fixos (`src/lib/convocacaoUtils.ts`)
- Remover `12:30` e `13:30` — voltar para os **5 horários corretos**: `08:30, 09:30, 10:30, 11:30, 14:30`.

### 2. Separar lógica por base na Agenda (`src/components/AgendaDiaria.tsx`)
- **Base Goiânia**: exibir grade fixa com 5 horários e 5 slots cada. Popover mostra detalhes completos.
- **Outras bases** (Goiás, Vitória, Fora): sem grade fixa. Mostrar seção "Horário Livre" com lista das convocações do dia e **quantidade total agendada**.

### 3. Melhorar informações no Popover de cada horário
- Cada slot ocupado deve mostrar: **nome do candidato**, **cargo**, **unidade**, badge presencial/online.
- Exibir a unidade de forma mais visível (atualmente está como `conv.cargo` mas falta `conv.unidade`).

### 4. Indicadores visuais na grade compacta
- Cada linha da grade deve mostrar **slots livres** (ex: "3/5 livres") em vez de só "Livre" genérico.
- Melhorar ícones e cores: usar design mais limpo com bordas arredondadas e espaçamento adequado.

### 5. Receber `selectedBase` como prop ou detectar automaticamente
- A `AgendaDiaria` precisa saber se está mostrando Goiânia ou outra base para decidir qual layout usar. Usar o filtro de unidade da `ConvocacoesPage` para determinar isso.

### Arquivos afetados
- `src/lib/convocacaoUtils.ts` — corrigir array de horários
- `src/components/AgendaDiaria.tsx` — reescrever com separação por base, melhorar popover e visual
- `src/pages/ConvocacoesPage.tsx` — passar informação de base selecionada para AgendaDiaria

