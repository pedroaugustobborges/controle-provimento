
## Plano — Limpeza final da AGIE + correção do parser de cronograma

### 1. Investigação (read-only)
- Reler `src/components/chat/AgieChat.tsx` e `src/types/chat.ts` para localizar resquícios de fluxo de mensagens entre usuários (botões, steps, textos).
- Reler `src/lib/editalCronogramaParser.ts` para entender:
  - Como detecta o marcador do cargo (regex de "Cronograma de Seleção para o Cargo de:").
  - Como identifica as colunas "ETAPA" e "DATA" nas tabelas.
  - Se varre tabelas aninhadas.
- Reler `src/components/CronogramaImportDialog.tsx` para confirmar onde o erro `extracao_cronograma` é emitido.

### 2. Pendência (preciso receber antes de codar)
- **Anexar o arquivo `PROCESSO SELETIVO AGIR - EDITAL 028.2026 - GOIÂNIA.docx`** aqui no chat para que eu inspecione com `document--parse_document` e veja a estrutura real das 8 tabelas. Sem isso, qualquer correção é chute.

### 3. Correções (após receber o arquivo)

**A) AGIE — remover mensagens definitivamente**
- Auditar `AgieChat.tsx` e remover qualquer botão/step relacionado a "Mensagens entre usuários".
- Garantir `ChatStep = 'INITIAL' | 'ALERTS' | 'FEEDBACK' | 'NEWS'` (já está em `chat.ts`, mas pode haver lógica órfã no componente).
- Remover textos/ícones residuais.

**B) Parser — torná-lo robusto**
- **Normalização de texto**: antes de qualquer regex, aplicar `.replace(/\u00A0/g, ' ').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()`.
- **Detecção do cargo**: aceitar variações:
  - `Cronograma de Seleção para o Cargo de:`
  - `Cronograma para o Cargo de:`
  - `Cargo:` (fallback)
  - Regex flexível, case-insensitive, com `\s*` entre palavras.
- **Detecção de colunas**: aceitar `ETAPA`/`ETAPAS`/`FASE` e `DATA`/`DATAS`/`PERÍODO`/`DATA PREVISTA`.
- **Tabelas aninhadas**: percorrer recursivamente células para encontrar tabelas internas.
- **Diagnóstico granular**: para cada tabela rejeitada, logar `console.warn('[cronograma-parser] tabela #N rejeitada', { headers, primeiraLinha, motivo })`.
- Atualizar mensagem de erro para incluir contagem de tabelas válidas vs. rejeitadas + os motivos das rejeições no campo `raw`.

### 4. Validação
- Reimportar o `.docx` original → cronograma deve ser detectado.
- Conferir que o dialog mostra as etapas mapeadas corretamente.
- Abrir AGIE e confirmar que não há mais opção de mensagens.
- Console limpo (apenas warnings esperados de tabelas que realmente não são cronograma).
