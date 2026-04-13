
## Plano: Padronizar cabeçalhos e reformular aba Observações

### Alteração 1: Padronizar cabeçalhos das tabelas
No `UnidadePortalPage.tsx`, unificar o estilo de `TableHead` nas 3 abas (Status, Convocações, Observações) para usar o mesmo padrão: `bg-slate-50/50`, `text-[10px] font-black uppercase tracking-widest text-slate-500`, `py-5 px-6`.

### Alteração 2: Reformular aba Observações
Substituir o conteúdo atual da aba "Observações" por uma tabela editável com as seguintes colunas:
- **Candidato** (somente leitura)
- **Unidade** (somente leitura)
- **Status/Destino** (Select editável com opções: Aceite, Recusa por plantão, Recusa por unidade, Recusa por horário, Desistiu, Faltou, Pendente)
- **Horário/Plantão** (Input editável)
- **Aceito** (Switch ou checkbox sim/não)
- **Observação** (Textarea/Input editável)
- **Botão Salvar** (por linha, salva via `updateConvocacao`)

A lógica usará um state local para rastrear edições por convocação e chamar `updateConvocacao` ao salvar cada linha.

### Arquivo alterado
- `src/pages/UnidadePortalPage.tsx`

### Sem alteração de banco de dados
Os campos `status`, `horario`, `observacoes` já existem no tipo `Convocacao` e são salvos via `updateConvocacao` do store.
