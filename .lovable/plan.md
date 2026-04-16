
## Entendimento

A coluna **"Responsável pela publicação"** na **Fila de Editais** está no lugar errado no fluxo. O correto é:

1. **Fila de Editais** = lista de vagas aguardando o analista do edital pegar. Aqui **não** precisa ter "Responsável pela publicação" — só "Enviado por".
2. O analista do edital pega a vaga e a encaminha para **Redação**.
3. **Na hora do envio para Validação** (em Redação) é que se atribui o **Responsável pela Validação**, com sugestão automática:
   - Vagas de **Goiás + Espírito Santo** → **Isaac** (analista administrativo dessas regiões).
   - Vagas das **Demais Unidades** → analista administrativo correspondente.
   - Permitir override manual pelo analista do edital.

## Plano

**1. Remover coluna "Responsável pela publicação" da Fila de Editais**
- Em `src/pages/FilaEditaisPage.tsx`, remover a coluna e o Select correspondente (manter apenas "Enviado por").
- Ajustar `colSpan` e sub-itens dos grupos consolidados.

**2. Criar mapeamento região → analista administrativo**
- Novo arquivo `src/data/analistasAdministrativos.ts` exportando:
  ```ts
  ANALISTA_ADM_POR_REGIAO = {
    'goias_es': { nome: 'Isaac', id: '...' },
    'demais': { nome: '...', id: '...' }
  }
  function sugerirResponsavelValidacao(unidade): { nome, id }
  ```
- Pedir ao usuário (via ask_questions na próxima rodada se necessário) o nome do analista das "Demais Unidades", OU deixar configurável e iniciar só com Isaac mapeado.

**3. Atribuição no envio para Validação (Redação → Validação)**
- Localizar a tela/ação de "enviar para validação" (provavelmente em `src/pages/ValidacaoEditaisPage.tsx` ou um botão na Fila do Analista do Edital — `FilaAnalistaEditalPage.tsx`).
- Ao clicar em "Enviar para validação", abrir um pequeno **dialog**:
  - Campo **Responsável pela Validação** (Select), pré-preenchido com a sugestão automática baseada na região da vaga.
  - Permitir trocar manualmente.
  - Confirmar → grava em `validado_por` + entrada no `historico`.

**4. Persistência**
- Continuar usando `validado_por` na tabela `vagas` (campo já existente conforme uso anterior).

## Verificação

- Fila de Editais não exibe mais a coluna "Responsável pela publicação", só "Enviado por".
- Ao enviar uma vaga de CRER (Goiás) para validação, o dialog sugere **Isaac** automaticamente.
- Ao enviar uma vaga de uma unidade "Demais", sugere o analista correspondente.
- O analista do edital pode trocar manualmente antes de confirmar.
- Mudança persiste e aparece na tela de Validação de Editais em tempo real.

## Pergunta a ser feita após aprovação

Para completar o mapeamento, preciso saber: **quem é o analista administrativo responsável pelas "Demais Unidades"** (HUGOL, HECAD, HDS, Policlínica, Jataí, etc.)? Posso perguntar ao usuário com `ask_questions` na próxima rodada, ou deixar configurável via tela de Administração.
