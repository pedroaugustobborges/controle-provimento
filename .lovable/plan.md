
## Plano — Corrigir 404 no envio agrupado + receber lote em Redação

### Problemas
1. **404 após "Enviar agrupados"**: na Fila de Editais, ao confirmar envio do lote, mostra toast de sucesso mas navega para rota inexistente → 404.
2. **Lote não chega agrupado em Redação**: as vagas até mudam de status, mas a página de Redação abre cada cargo isolado, sem o modo "lote/abas" detectado via `sessionStorage`.
3. **Sem opção de agrupar manualmente em Redação**: se o analista quiser unir cargos já em redação num único edital, não há UI para isso.

### Investigação (read-only)
- `src/pages/FilaEditaisPage.tsx` — handler `sendGroupedValidation` / botão "Enviar agrupados": qual rota está sendo chamada no `navigate(...)` e se o `sessionStorage.setItem('grouped_vagas', ...)` está sendo gravado **antes** da navegação.
- `src/App.tsx` — confirmar rota real da página de Redação (provavelmente `/fila-editais-analista` ou `/redacao-editais`, não `/redacao-edital`).
- `src/pages/FilaAnalistaEditalPage.tsx` — o `useEffect` que lê `sessionStorage.getItem('grouped_vagas')` depende de `vagas` já estar populado; se navegar antes da store carregar, lote é perdido.
- Confirmar a chave usada no storage é a mesma nos dois lados (`grouped_vagas`).

### Causas prováveis
- **404**: `navigate('/redacao-edital')` aponta para path que não existe no router.
- **Lote some**: ou (a) chave de storage divergente, ou (b) navega antes de gravar, ou (c) `useEffect` consome storage antes de `vagas` carregar e o `filter` retorna vazio → cai no modo single.

### Implementação

**A. Corrigir navegação (Fila de Editais)**
- Identificar a rota correta no `App.tsx` e usar exatamente esse path no `navigate()`.
- Garantir ordem: `sessionStorage.setItem('grouped_vagas', JSON.stringify({ vagaIds, regiao, timestamp: Date.now() }))` **antes** de `navigate(...)`.
- Atualizar status das vagas para `em_redacao` em paralelo (não bloquear navegação).

**B. Robustez do consumo do lote (Redação)**
- No `useEffect` de `FilaAnalistaEditalPage.tsx`:
  - Não remover `grouped_vagas` do storage até confirmar que `batchVagas.length > 0`.
  - Se `vagas.length === 0` ainda, esperar próximo render (não consumir).
  - Adicionar timestamp/expiração (descarta lotes > 5min para evitar lixo).
  - Logar warning no console se IDs não baterem com vagas existentes.

**C. Agrupar manualmente em Redação**
- Adicionar checkboxes na tabela de vagas em `em_redacao` da `FilaAnalistaEditalPage`.
- Botão sticky no topo "Agrupar N cargos no mesmo edital" quando ≥2 selecionados.
- Aplica mesma regra de região (`getRegiaoAgrupamento`) já existente em `vagaUtils.ts`.
- Ao clicar, abre o modal de redação direto em modo `isBatchMode` com os cargos selecionados (sem precisar passar pelo storage — chamada in-memory).

### Validação
- Selecionar CRER + AGIR na Fila de Editais → "Enviar agrupados" → toast + navega para Redação → modal abre em modo lote com 2 abas.
- Refresh na página de Redação não duplica/perde o lote.
- Em Redação, marcar 2 cargos já presentes → botão "Agrupar" → modal abre com abas.
- Tentar agrupar regiões diferentes → bloqueia com toast.

### Risco
Pequeno. Mudança principal é uma string de rota + ordem de operações. Modo manual de agrupar é aditivo, não quebra nada.
