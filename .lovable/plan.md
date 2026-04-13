

## Plano: Personalizar alertas e mensagens por perfil de usuário

### Arquivos a modificar

**`src/store/vagasStore.ts`** (linhas ~197-240):
- Adicionar campo `perfil_destinatario` a cada alerta, tarefa e mensagem do histórico, associando-os aos perfis corretos:
  - Convocações pendentes → `'Analista das Convocações'`
  - Validação de edital → `'Analista Administrativo'`
  - Publicação de edital → `'Analista de Edital'`
  - Vagas/requisições → `'Analista de RH'`
- Criar alertas mock diversificados por perfil

**`src/pages/AlertasTarefasPage.tsx`**:
- Importar `useRBAC` para obter o perfil do usuário logado
- Filtrar `alertas`, `tarefas` e `historicoMensagens` com base no perfil:
  - Perfis de gestão/admin veem tudo
  - Demais perfis veem apenas alertas com `perfil_destinatario` correspondente
- Atualizar contadores de badges nas abas para refletir apenas itens filtrados

**`src/types/vaga.ts`** (se necessário):
- Adicionar campo `perfil_destinatario` às interfaces de Alerta, Tarefa e HistoricoMensagem

Nenhuma alteração de banco de dados necessária.

