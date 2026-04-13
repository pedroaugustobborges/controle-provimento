
## Plano: Portal da Unidade completo com abas (Dashboard, Status, Convocações, Observações)

### Problema atual
O Portal da Unidade (`UnidadePortalPage.tsx`) tem apenas uma tela de "Convocações do Dia" com tabela e cards de resumo. Faltam as seções solicitadas: **Dashboard**, **Consulta de Status**, e a área de **Observações** como seção dedicada.

### Solução — Adicionar navegação por abas (Tabs)

Reestruturar o `UnidadePortalPage.tsx` com **4 abas** usando o componente `Tabs` do shadcn:

#### Aba 1: **Dashboard**
- Cards resumo geral: total de vagas ativas, convocações do dia, aceitos, pendentes, recusas
- Gráfico de barras (recharts) com status por unidade — similar ao `DashboardPage.tsx` mas filtrado pelas unidades acessíveis
- Distribuição de status das vagas (em andamento, fila edital, concluídas, etc.)

#### Aba 2: **Consulta de Status**
- Tabela de todas as vagas das unidades do usuário (não apenas convocações do dia)
- Filtros por unidade e status
- Mostra: cargo, unidade, status atual, data de abertura, dias em aberto
- Somente leitura

#### Aba 3: **Convocações Diárias**
- Mantém exatamente o que já existe hoje: seletor de data, tabela com horário/candidato/cargo/status/observação
- Botão de exportar CSV

#### Aba 4: **Observações**
- Lista de convocações com observações já inseridas (filtráveis por data/unidade)
- Possibilidade de inserir/editar observações (a única funcionalidade de escrita)
- Visão consolidada de todas as observações recentes

### Alterações
- **Arquivo único**: `src/pages/UnidadePortalPage.tsx` — reestruturar com `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`
- Reutilizar dados de `vagasStore` (vagas, convocações, bancos) que já estão disponíveis
- Reutilizar lógica do `DashboardPage.tsx` para os gráficos (recharts)
- Sem alteração de banco de dados

### Sem alteração
- Controle de acesso (Admin + Supervisão) — mantido
- Header com logo AGIR — mantido
- Filtro de unidade e data — mantido (movidos para dentro de cada aba quando relevante)
