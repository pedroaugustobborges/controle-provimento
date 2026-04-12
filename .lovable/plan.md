

## Prompt Reescrito

---

**Ajuste no escopo de importação do Banco de Talentos:**

Atualmente, a importação do Banco de Talentos oferece três escopos separados: **Goiás**, **Espírito Santo** e **Demais Unidades**. Isso está incorreto porque Goiás e Espírito Santo pertencem à mesma região operacional e precisam ser tratados como um único grupo.

**Alterações necessárias:**

1. **Unificar Goiás e Espírito Santo** em um único escopo chamado **"Goiás e Espírito Santo"** (ou "Goiás e Vitória", conforme nomenclatura já usada no sistema).

2. **As opções de escopo na importação devem ser:**
   - **Todas as regiões** — importa registros de todas as unidades (Goiás + Espírito Santo + Demais Unidades) de uma só vez.
   - **Goiás e Espírito Santo** — importa apenas os registros das unidades dessas duas localidades (CRER, AGIR, HUGOL, HECAD, HDS, POLICLÍNICA, JATAÍ, TEIA APARECIDA, TEIA GOIÂNIA, TEIA CANEDO, SÃO PEDRO, SUÁ).
   - **Demais Unidades** — importa apenas os registros das unidades que não pertencem a Goiás nem ao Espírito Santo.

3. **Comportamento esperado:**
   - Quando o usuário selecionar **"Todas as regiões"**, o sistema deve substituir/adicionar registros de todas as unidades, sem filtro de região.
   - Quando selecionar **"Goiás e Espírito Santo"**, deve afetar apenas os registros cujas unidades pertencem a essa região unificada.
   - Quando selecionar **"Demais Unidades"**, deve afetar apenas os registros fora de Goiás e Espírito Santo.

4. **Aplique essas alterações em:**
   - O componente de seleção de escopo no formulário de importação.
   - A lógica de filtragem e substituição no serviço de importação (`importScopeUtils.ts` e `importService.ts`).
   - Os tipos TypeScript relacionados (`BancoImportScope`).

---

