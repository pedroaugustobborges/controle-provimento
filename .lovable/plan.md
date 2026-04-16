
**Prompt reescrito:**

---

O módulo **Banco de Talentos** está apresentando **erro ao abrir** — a página não carrega. Solicito investigação urgente da causa raiz e correção imediata.

**Tarefas solicitadas:**

1. **Reproduzir o erro**
   - Acessar a rota do Banco de Talentos e capturar a mensagem exata exibida (tela branca, erro de runtime, erro de import, etc.).
   - Verificar o **console do navegador** para identificar stack trace, referências `undefined`, falhas de import ou erros de render.
   - Verificar a **aba Network** para confirmar se há falha em requisição ao Supabase (`banco_candidatos`, `vagas`).

2. **Investigar causa raiz**
   - Revisar as últimas alterações feitas em:
     - `src/pages/BancoTalentosPage.tsx`
     - `src/components/BancoTalentosForm.tsx`
     - `src/lib/vagaUtils.ts` (constante `UNIDADES_POR_REGIAO` foi recentemente reescrita de `'Goiás e Espírito Santo'`/`'Amazonas'`/`'Demais Unidades'` para `'GO/ES'`/`'OUTRAS'`)
     - `src/store/vagasStore.ts` (refatoração do `addBanco` async)
   - Verificar se há referências quebradas às chaves antigas de região (`'Goiás e Espírito Santo'`, `'Amazonas'`, `'Demais Unidades'`) em outros arquivos (filtros, páginas, dashboards) que ainda esperam os nomes antigos.
   - Validar se algum import foi removido por engano ou se há erro de tipagem TypeScript bloqueando a renderização.

3. **Aplicar correção**
   - Corrigir a causa raiz (ajustar referências de região, restaurar imports, etc.).
   - Garantir que a página carregue normalmente para todos os perfis com permissão.

4. **Validar**
   - Abrir a página com 2 sessões simultâneas e confirmar:
     - Carregamento sem erro.
     - Lista de bancos exibida corretamente.
     - Filtros de Unidade e Região funcionando com os novos rótulos (GO/ES, OUTRAS).
     - Cadastro de novo banco continua sincronizando entre usuários.

**Prioridade absoluta — começar pela captura do erro exato no console.**

<lov-actions>
<lov-suggestion message="Aprovado. Investigue e corrija o erro do Banco de Talentos: capture o erro exato no console, identifique a causa raiz (possivelmente referências quebradas às chaves antigas de região 'Goiás e Espírito Santo'/'Amazonas'/'Demais Unidades' após a refatoração), aplique a correção e valide o carregamento da página com 2 sessões simultâneas.">Investigar e corrigir agora</lov-suggestion>
<lov-suggestion message="Antes de codar, capture e me mostre o erro exato do console (stack trace completo) e liste todos os arquivos que ainda referenciam as chaves antigas de região. Eu aprovo a correção depois.">Só diagnóstico primeiro</lov-suggestion>
<lov-suggestion message="Reverta a alteração das chaves de região em vagaUtils.ts (voltar para 'Goiás e Espírito Santo'/'Amazonas'/'Demais Unidades') e mantenha apenas a label visual como 'GO/ES'/'OUTRAS'. Isso deve resolver o erro sem quebrar referências existentes.">Reverter chaves e manter labels</lov-suggestion>
</lov-actions>
