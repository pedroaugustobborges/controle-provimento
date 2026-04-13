

## Plano: Corrigir datas hardcoded em Alertas e Tarefas

### Problema
Os alertas e o histórico de mensagens no `vagasStore.ts` usam datas fixas de maio de 2024 (`'2024-05-22'`, `'2024-05-20'`, etc.). Essas datas não correspondem à realidade e confundem o usuário.

### Solução
**Arquivo: `src/store/vagasStore.ts`** (linhas 197-208)
- Substituir as datas hardcoded por datas **relativas ao momento atual**, usando `new Date()` e subtraindo dias:
  - Alertas: datas de hoje, ontem e anteontem
  - Histórico de mensagens: datas dos últimos 2 dias
- Isso garante que as datas sempre façam sentido independente de quando o sistema é acessado.

Exemplo:
```ts
const now = new Date();
const today = now.toISOString();
const yesterday = new Date(now.getTime() - 86400000).toISOString();
const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString();
```

Nenhuma alteração de banco de dados necessária.

