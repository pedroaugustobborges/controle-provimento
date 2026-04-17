
## Plano — Corrigir layout "Preparar Edital" e parser de datas do Word

### Problemas relatados
1. **Layout não aplicado**: as melhorias visuais da tela "Preparar Edital" não apareceram para o usuário (provavelmente o build anterior falhou no upload ou as edições anteriores não chegaram a ser aplicadas no arquivo).
2. **Parser quebrado**: ao selecionar o arquivo Word do edital, o sistema não está extraindo e preenchendo automaticamente as datas do cronograma nos campos do formulário.

### Investigação necessária
1. `src/pages/FilaAnalistaEditalPage.tsx` — confirmar estado atual do JSX do modal "Preparar Edital" e da função `handleFileChange`.
2. `src/lib/editalCronogramaParser.ts` — revisar `parseCronogramaFromDocx`: extração de texto do .docx, regex de datas, mapeamento de etapas.
3. Verificar se `handleFileChange` realmente chama o parser e aplica os resultados em `batchCronogramas` / cronograma individual.
4. Conferir logs/erros silenciosos (try/catch engolindo falhas).

### Correções planejadas
1. **Reaplicar/garantir o redesign do modal "Preparar Edital"**:
   - Header com ícone, seções em cards (Processo, Arquivo, Cronograma, Finalização).
   - Dropzone moderno (drag-and-drop, ícone, feedback de sucesso, botão remover/trocar).
   - Footer sticky com Cancelar / Salvar Rascunho / Enviar para Validação.
2. **Corrigir o fluxo de upload + parser**:
   - Em `handleFileChange`: ler arquivo, chamar `parseCronogramaFromDocx`, mostrar toast de progresso/sucesso/erro.
   - Mapear resultado para `cronograma` (modo single) e para todas as abas em `batchCronogramas` (modo lote), com confirmação visual.
   - Tratar erros do parser (`CronogramaParseError`) com mensagem clara ao usuário.
   - Garantir que o parser reconheça os rótulos reais do edital (publicação, inscrições início/fim, triagem, avaliação específica, recursos, resultado final, entrevistas).
3. **Feedback visual**: badge "Datas extraídas automaticamente" nos campos preenchidos pelo parser, permitindo edição manual posterior.

### Arquivos a editar
- `src/pages/FilaAnalistaEditalPage.tsx` (JSX do modal + `handleFileChange` + integração com parser).
- `src/lib/editalCronogramaParser.ts` (revisar/ajustar regex e mapeamento se necessário).

### Validação E2E
- Abrir Preparar Edital → verificar visualmente o novo layout (header com ícone, seções em card, dropzone).
- Selecionar um .docx de edital real → confirmar que datas aparecem nos campos do cronograma.
- Testar modo lote (várias vagas) → confirmar que datas vão para todas as abas.
- Erro: arquivo inválido → confirmar toast de erro claro.

### Risco
Médio. Mexe em layout grande + lógica de parsing. Possível necessidade de ajustar regex conforme formato real do .docx do usuário.
