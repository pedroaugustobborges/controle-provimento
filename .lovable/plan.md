

## Plano: Padronizar campos Carga Horária e Horário de Trabalho no ConvocacaoDialog

### Arquivo afetado
- `src/components/ConvocacaoDialog.tsx`

### Alterações

**1. Carga Horária (linha ~213)** — Substituir `<Input>` por `<Select>` com opções:
- 20h/semana, 30h/semana, 40h/semana, 44h/semana

**2. Horário de Trabalho (linha ~222)** — Substituir `<Input>` por dois selects lado a lado (Início e Fim), com horários de 06:00 a 22:00 em intervalos de 30min. O valor salvo em `formData.horario_trabalho` será formatado como `"08:00 às 18:00"`.

**3. Estado do formulário** — Adicionar estados auxiliares `horarioTrabalhoInicio` e `horarioTrabalhoFim`, sincronizando com `formData.horario_trabalho` no formato padrão. Na edição, fazer parse do valor existente para preencher os dois campos.

