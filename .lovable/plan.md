
## Plano — Corrigir parser para detectar 3ª tabela de cronograma e datas corretas

### 1. Coleta de informações (bloqueante — precisa do usuário)
- Anexar o `.docx` problemático na conversa (ou prints da 3ª tabela + cabeçalhos + diálogo de seleção atual).
- Confirmar exemplo concreto de data divergente (etapa X: Word diz Y, sistema preencheu Z).

### 2. Investigação (read-only, após receber arquivo)
- Reler `src/lib/editalCronogramaParser.ts` com foco em:
  - Lógica `inTableHits` (priorização de títulos dentro de tabelas) — pode estar causando perda do 3º título se ele não estiver dentro da tabela como TD/TH.
  - Regex de cabeçalho (`ETAPA`/`DATA`) — confirmar se aceita variações como "ETAPA / FASE", "DATA PREVISTA", "PERÍODO", etc.
  - Função de extração de datas — verificar se está pegando a primeira data quando há intervalo (ex.: "01/02 a 05/02"), tratando dd/mm vs dd/mm/aaaa, e timezone na conversão para `yyyy-mm-dd`.
- Usar `document--parse_document` no `.docx` enviado para inspecionar a estrutura HTML real da 3ª tabela e confirmar onde o parser está falhando.

### 3. Implementação (após investigação)
1. **3ª tabela ignorada** — possíveis correções:
   - Ampliar tags aceitas no `TITLE_TAGS` se o título da 3ª tabela usar tag não prevista.
   - Ajustar lógica de associação título→tabela quando o título do Anexo VII vem em parágrafo distante (mais que o limite atual de proximidade).
   - Aceitar mais variações no regex de "Cronograma de Seleção para o Cargo de".
2. **Datas incorretas** — possíveis correções:
   - Corrigir parsing de intervalos ("a"/"até"/"-") para pegar data inicial corretamente.
   - Ajustar normalização de timezone no `yyyy-mm-dd` (evitar shift de -1 dia).
   - Tratar formatos abreviados (dd/mm sem ano → herdar ano do contexto).

### 4. Validação
- Reimportar o `.docx` problemático → todos os 3 cronogramas aparecem no diálogo.
- Conferir cada data lado a lado com o Word original — todas batem.
- Reimportar arquivos de teste anteriores → não houve regressão (os 2 que já funcionavam continuam funcionando).
- Console limpo; logs de rejeição apenas para tabelas que realmente não são cronograma.
