
## Plano — Exibir Unidade Destino, Horário/Plantão e Observação no Portal da Unidade

### 1. Investigação (read-only)
- Reler `src/pages/UnidadePortalPage.tsx` para localizar a seção "Convocações Diárias" e o bloco condicional atual que só exibe quando há observação.
- Reler `src/components/AgendaDiaria.tsx` (provável componente compartilhado) para confirmar onde o card de cada convocação é renderizado.
- Conferir em `src/types/vaga.ts` os campos disponíveis no tipo `Convocacao` (`unidade_alternativa`, `horario_trabalho`, `observacoes`, etc.) para mapear corretamente.

### 2. Pendências a confirmar
- "Unidade Destino" = `unidade_alternativa` existente, ou novo campo?
- Apenas visualização ou também edição inline pela unidade?

### 3. Implementação (após confirmação)
1. No componente da seção "Convocações Diárias" do Portal da Unidade:
   - Trocar a condição atual `{convocacao.observacoes && (...)}` por `{(convocacao.unidade_alternativa || convocacao.horario_trabalho || convocacao.observacoes) && (...)}`.
   - Dentro do bloco, renderizar 3 linhas condicionais (cada uma só aparece se o campo tiver valor):
     - **Unidade Destino**: ícone `MapPin` + label + valor de `unidade_alternativa` (ou campo confirmado).
     - **Horário / Plantão**: ícone `Clock` + label + valor de `horario_trabalho`.
     - **Observação**: ícone `MessageSquare` + label + valor de `observacoes`.
2. Manter o estilo visual consistente com o restante do Portal (mesmo padrão de `bg-slate-50`, bordas arredondadas, tipografia).
3. Se for confirmado edição inline → adicionar pequenos botões "Editar" abrindo o `AcompanhamentoModal` ou modal dedicado.

### 4. Validação
- Convocação com apenas observação → bloco aparece com 1 linha (Observação).
- Convocação com unidade alternativa + horário, sem observação → bloco aparece com 2 linhas.
- Convocação com os 3 campos → bloco aparece com 3 linhas.
- Convocação sem nenhum dos 3 → bloco não aparece.
- Conferir responsividade e console limpo.
