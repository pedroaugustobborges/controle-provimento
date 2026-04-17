
## Plano — Ajustes no agrupamento + UX da fila + status legível

### Problemas
1. **Agrupamento bloqueia unidades de Goiânia**: hoje só permite mesma unidade exata. Mas Goiânia tem várias unidades (CRER, AGIR, HUGOL, HECAD, HDS, POLICLÍNICA) que devem poder ser agrupadas entre si. Vitória (SÃO PEDRO, SUÁ) e cidades isoladas (JATAÍ, TEIA APARECIDA, etc.) seguem regra própria.
2. **Layout do botão "Enviar agrupados"**: barra de ação está mal posicionada / muito embaixo.
3. **Status cru exibido**: aparece `encaminhado_edital` literal em vez de label amigável tipo "Encaminhado para Edital".

### Investigação necessária (após aprovação)
- `src/pages/FilaEditaisPage.tsx` — regra atual de validação de agrupamento + posição da action bar.
- `src/pages/FilaAnalistaEditalPage.tsx` — `\u003cBadge\u003e{v.status_fluxo_edital}\u003c/Badge\u003e` cru, trocar por label.
- `src/types/vaga.ts` — confirmar valores possíveis de `status_fluxo_edital`.
- `src/lib/vagaUtils.ts` — verificar se já existe helper de label; senão criar.
- Memória core já lista unidades de Goiânia → usar como fonte de verdade para "região".

### Implementação

**A. Regra de agrupamento por região (não por unidade exata)**
- Helper `getRegiaoUnidade(unidade)` em `vagaUtils.ts`:
  - Goiânia: CRER, AGIR, HUGOL, HECAD, HDS, POLICLÍNICA → região `"goiania"`
  - Vitória: SÃO PEDRO, SUÁ → região `"vitoria"`
  - Demais (JATAÍ, TEIA APARECIDA, TEIA GOIÂNIA, TEIA CANEDO) → cada uma é sua própria região
- Validação no `FilaEditaisPage`: bloquear seleção apenas se a região mudar; permitir mix dentro da mesma região.
- Toast claro: "Cargos da mesma região (Goiânia) podem ser agrupados".

**B. Layout da barra de ação**
- Trocar barra fixa no rodapé por **bar sticky no topo da tabela** (logo abaixo dos filtros) quando ≥1 selecionado.
- Visual destacado (fundo primário, ícone, contador, botão de ação à direita, "limpar seleção" ao lado).
- Sem `position: fixed` ofuscando conteúdo; usa `sticky top-0` dentro do card.

**C. Labels de status legíveis**
- Mapa em `vagaUtils.ts`:
  ```
  encaminhado_edital → "Encaminhado para Edital"
  em_redacao → "Em Redação"
  enviado_validacao → "Enviado para Validação"
  aprovado_administrativo → "Aprovado"
  publicado → "Publicado"
  ```
- Substituir todos os `\u003cBadge\u003e{v.status_fluxo_edital}\u003c/Badge\u003e` por `\u003cBadge\u003e{getStatusFluxoLabel(v.status_fluxo_edital)}\u003c/Badge\u003e` em FilaAnalistaEditalPage e FilaEditaisPage.

### Validação
- Selecionar CRER + AGIR + HUGOL → agrupa OK (Goiânia).
- Selecionar CRER + JATAÍ → bloqueia com toast "regiões diferentes".
- Selecionar SÃO PEDRO + SUÁ → agrupa OK (Vitória).
- Barra de seleção aparece logo abaixo dos filtros, bem visível.
- Status mostra "Encaminhado para Edital" no lugar de `encaminhado_edital`.
