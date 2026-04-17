
## Plano — Retornar vagas entre etapas (Redação → Fila → Controle)

### Investigação necessária (após aprovação)
- `src/pages/FilaAnalistaEditalPage.tsx` — adicionar ação "Voltar para Fila de Editais" (linha + lote).
- `src/pages/FilaEditaisPage.tsx` — adicionar ação "Voltar para Controle de Vagas" com modal obrigatório.
- `src/types/vaga.ts` — adicionar campo `status_origem?: StatusVaga` na interface `Vaga`.
- `src/store/vagasStore.ts` — garantir que ao mover vaga para fluxo de edital, o status anterior seja salvo em `status_origem`.

### Implementação

**A. Campo `status_origem` (preservar status original)**
- Adicionar `status_origem?: StatusVaga` em `Vaga` (`src/types/vaga.ts`).
- No momento em que vaga entra em `encaminhado_edital` (Fila de Editais), salvar `status_origem = vaga.status` se ainda não existir.
- Migration SQL: `ALTER TABLE vagas ADD COLUMN status_origem text;`

**B. Em Redação de Edital (`FilaAnalistaEditalPage.tsx`)**
- Botão "Devolver à Fila" por linha (dropdown de ações) + ação em lote quando há seleção.
- Confirma com `AlertDialog` simples (sem observação obrigatória — é movimento "para trás" leve).
- Atualiza `status_fluxo_edital` → `encaminhado_edital`.
- Registra no `historico` da vaga: "Devolvida para Fila de Editais por {usuário}".
- Toast de sucesso.

**C. Em Fila de Editais (`FilaEditaisPage.tsx`)**
- Botão "Devolver ao Controle" por linha + ação em lote.
- Abre `Dialog` com:
  - `Select` "Motivo" → opção pré-definida: **"A pedido do analista da unidade"** + "Outro".
  - `Textarea` "Observação" (obrigatória, mínimo 10 caracteres, validação com toast/erro inline).
  - Botões "Cancelar" / "Confirmar devolução".
- Ao confirmar:
  - Restaura `status = vaga.status_origem || 'SEM STATUS'`.
  - Limpa `status_fluxo_edital`.
  - Adiciona ao `historico`: "Devolvida ao Controle de Vagas — Motivo: {motivo}. Observação: {obs}".
  - Toast de sucesso, modal fecha, lista atualiza (Zustand já reativo).

**D. Permissões**
- Usar `usePermissions` existente — só perfis de Edital/Admin podem devolver.

### Validação
- Vaga em Redação → "Devolver à Fila" → aparece em Fila de Editais com status correto.
- Vaga em Fila → tentar devolver sem observação → bloqueia.
- Vaga em Fila → devolver com motivo "A pedido do analista" + obs → volta ao Controle com status original preservado.
- Histórico mostra ambas movimentações com usuário e timestamp.
- Lote: selecionar 3 vagas → devolver todas em uma operação.

### Risco
Baixo. Mudanças aditivas. Único cuidado: garantir que `status_origem` seja gravado retroativamente para vagas já em fluxo (fallback para `'SEM STATUS'` se ausente).
