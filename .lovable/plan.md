

## Plano — Agenda Diária com Bloqueio de Horários e Convocação Online

### 1. Tipos e Estado (`src/types/vaga.ts` + `src/store/vagasStore.ts`)
- Adicionar tipo `BloqueioHorario` com campos: `id`, `data`, `horario` (ou `dia_inteiro`), `motivo`, `criado_por`.
- Adicionar campo `tipo_atendimento` (`'presencial' | 'online'`) e `link_teams` ao tipo `Convocacao`.
- No store, adicionar array `bloqueios` com ações `addBloqueio`, `removeBloqueio`.

### 2. Visualização de Agenda Diária (`src/pages/ConvocacoesPage.tsx`)
- Criar componente `AgendaDiaria` que exibe os horários fixos (08:30–14:30 para Goiânia, ou customizáveis) em formato de linhas visuais.
- Cada linha mostra: horário, convocações agendadas naquele slot, ou indicação de "bloqueado".
- Manter a view Kanban existente como opção alternativa (abas: Agenda / Quadro Kanban).

### 3. Bloqueio de Horários (novo componente `BloqueioHorarioDialog`)
- Dialog para selecionar data, horário(s) específico(s) ou dia inteiro, e motivo.
- Botão "Bloquear Horário" na barra da agenda.
- Horários bloqueados aparecem em cinza com ícone de cadeado na agenda.
- Se já existe convocação no horário bloqueado, gerar alerta/devolutiva.

### 4. Convocação Online (`src/components/ConvocacaoDialog.tsx`)
- Adicionar select "Tipo de Atendimento": Presencial / Online.
- Campo condicional para "Link do Microsoft Teams" quando online.
- Exibir o link no card do Kanban e na agenda.

### 5. Devolutiva Automática
- Ao bloquear um horário que já tem convocação, disparar toast de alerta e registrar devolutiva no store com motivo e sugestão de reagendamento.

### Arquivos afetados
- `src/types/vaga.ts`
- `src/store/vagasStore.ts`
- `src/pages/ConvocacoesPage.tsx`
- `src/components/ConvocacaoDialog.tsx`
- `src/components/KanbanBoard.tsx`
- Novo: `src/components/AgendaDiaria.tsx`
- Novo: `src/components/BloqueioHorarioDialog.tsx`
- `src/lib/convocacaoUtils.ts`

