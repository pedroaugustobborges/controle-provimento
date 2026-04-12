

## Plano — Corrigir Agenda Diária, Bloqueios e Convocação Online

### 1. Adicionar horários faltantes (`src/lib/convocacaoUtils.ts`)
- `HORARIOS_FIXOS_CONVOCACAO` tem apenas 5 horários: `08:30, 09:30, 10:30, 11:30, 14:30`. Faltam `12:30` e `13:30`.
- Atualizar para incluir **7 horários**: `08:30, 09:30, 10:30, 11:30, 12:30, 13:30, 14:30`.

### 2. Agenda Diária sempre visível (`src/components/AgendaDiaria.tsx`)
- **Problema:** Quando não há convocações E não há bloqueios, o componente mostra apenas "Nenhuma convocação agendada". Deveria mostrar a **grade de horários** com todos os slots vazios (mostrando "Horário livre").
- **Correção:** Sempre renderizar a grade de horários fixos, independente de haver convocações. Remover a condição que exibe a mensagem vazia quando `byBase` está vazio e `dayBloqueios` está vazio — em vez disso, mostrar todos os slots com "Horário livre".

### 3. Bloqueio de Horários — já funciona
- O `BloqueioHorarioDialog` já permite selecionar múltiplos horários e bloquear dia inteiro. O código está correto. O problema era que os horários faltantes (`12:30`, `13:30`) não apareciam como opções.

### 4. Convocação Online — ajustar fluxo (`src/components/ConvocacaoDialog.tsx`)
- O campo `tipo_atendimento` e `link_teams` já existem no formulário. Verificar se estão aparecendo corretamente.
- **Remover obrigatoriedade do campo "Unidade"** quando tipo de atendimento for "online" — convocação online não exige unidade presencial.

### Arquivos afetados
- `src/lib/convocacaoUtils.ts` — adicionar horários 12:30 e 13:30
- `src/components/AgendaDiaria.tsx` — sempre exibir grade de horários
- `src/components/ConvocacaoDialog.tsx` — tornar unidade opcional para online

