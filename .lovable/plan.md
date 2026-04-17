
## Plano — Diagnóstico e robustez na importação de Word

### 1. Investigação (read-only)
- Reler `src/lib/editalCronogramaParser.ts` para mapear pontos de falha (leitura ZIP, parsing XML, regex de etapas).
- Reler `src/components/CronogramaImportDialog.tsx` e o trigger no `FilaAnalistaEditalPage.tsx` para localizar onde o erro é capturado e exibido.
- Verificar se o erro atual usa `errorMessage` genérico ou já traz detalhes.

### 2. Pendências (perguntar ao usuário antes de codar)
- Mensagem de erro exata + tela onde ocorreu.
- Escolher entre Opção A (anexar `.docx` aqui) ou Opção B (botão no app).

### 3. Implementação (após aprovação)
1. **Parser** (`editalCronogramaParser.ts`):
   - Try/catch granular por etapa: validação de tipo → unzip → leitura `document.xml` → extração de tabelas → mapeamento.
   - Cada falha retorna `{ step, message, hint }`.
   - Rejeitar `.doc` antigo com mensagem clara ("Salve como .docx no Word e tente novamente").
2. **Dialog** (`CronogramaImportDialog.tsx`):
   - Mostrar `step` e `hint` no bloco de erro.
   - Botão **"Copiar detalhes"** que copia JSON com `{ fileName, size, type, step, message, hint }` para clipboard.
   - Se Opção B aprovada: botão **"Baixar arquivo para diagnóstico"** que oferece download do `.docx` original com nome padronizado.
3. **Logs**: `console.error('[word-import]', payload)` em todos os pontos de falha.
4. **(Opcional, se Opção B com upload)**: criar bucket privado `word-diagnostico` no Supabase + RLS só para admin, e endpoint de upload anônimo do arquivo problemático.

### 4. Validação
- Subir um `.docx` válido → confirma fluxo normal.
- Subir um `.doc` antigo → mensagem clara de formato inválido.
- Subir um `.pdf` renomeado para `.docx` → mensagem específica de "arquivo corrompido / formato inválido".
- Subir um `.docx` sem tabela de cronograma → mensagem "nenhum cronograma reconhecido".
- Conferir que botão "Copiar detalhes" funciona e o JSON é colável aqui.
