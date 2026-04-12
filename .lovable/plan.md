

## Plano — Reformular Agenda Diária com Grade Compacta e Pop-up

### 1. Grade compacta (`src/components/AgendaDiaria.tsx`)
- Substituir a visualização atual por uma **grade compacta** com 7 linhas (uma por horário fixo).
- Cada linha mostra: ícone de relógio, horário, indicador de ocupação (ex: "2/5 agendados"), badge de status (livre / parcial / lotado / bloqueado).
- As linhas são **clicáveis** — ao clicar, abre um **Popover** com os detalhes dos 5 slots daquele horário.

### 2. Pop-up de detalhes por horário (Popover)
- Usar o componente `Popover` existente no projeto.
- Ao clicar no horário, exibir:
  - Lista dos **5 slots** (numerados 1 a 5).
  - Slots ocupados: nome do candidato, cargo, unidade, badge online/presencial, botões Devolutiva e Editar.
  - Slots vazios: texto "Disponível".
- Se o horário estiver bloqueado: mostrar motivo e botão "Remover Bloqueio".

### 3. Cabeçalho com resumo do dia
- Manter título "Agenda do Dia — [data]" com seletor de data.
- Resumo geral: total de agendamentos, horários bloqueados.

### Arquivo afetado
- `src/components/AgendaDiaria.tsx` — reescrever inteiro com grade compacta + Popover

