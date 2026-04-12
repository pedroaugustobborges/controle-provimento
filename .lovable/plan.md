

## Plano — Ajustar Quadro Kanban e Fluxo de Convocações Diárias

### 1. Corrigir texto truncado no sidebar (`AppSidebar.tsx`)
- Encurtar "Histórico de Convocações" para **"Histórico Conv."** no submenu de Banco de Talentos, ou ajustar o CSS para não truncar textos longos nos subitens.

### 2. Remover aba "Pendentes" de Convocações (`ConvocacoesPage.tsx`)
- Remover o botão "Pendentes" da barra de abas (linhas 236-248).
- Remover a seção `{view === 'pending' && ...}` e o estado/filtro `pendingConvocacoes`.
- Remover `'pending'` do tipo de view e do useEffect de tab.

### 3. Ajustar colunas do Kanban (`KanbanBoard.tsx`)
- Renomear a primeira coluna de **"Aguardando Contato"** (id: `pendente`) para **"Convocações do Dia"**.
- Manter as demais colunas: **Aceite**, **Faltou**, **Desistiu**, **Recusa**.
- Trocar o ícone da primeira coluna de `Phone` para `CalendarIcon` ou `Clock`.

### 4. Adicionar horário e dia nos cards do Kanban (`KanbanBoard.tsx`)
- No card, exibir de forma mais proeminente o **horário** (`convocacao.horario`) e a **data** (`convocacao.data_convocacao`).
- Trocar o texto do botão de edição para **"Registrar Devolutiva"** quando na primeira coluna.

### 5. Fluxo direto: convocação criada → Convocações do Dia
- Já funciona: ao criar via `ConvocacaoDialog`, a convocação recebe status `pendente` e aparece na primeira coluna do kanban. Apenas garantir que a view "diária" filtre pelo dia correto.

### Arquivos afetados
- `src/components/AppSidebar.tsx` — texto do submenu
- `src/pages/ConvocacoesPage.tsx` — remover aba Pendentes
- `src/components/KanbanBoard.tsx` — renomear coluna, ajustar cards

