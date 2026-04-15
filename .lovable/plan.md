

## Plano: Corrigir opções de Região de Suporte para apenas 2

### Problema
No formulário de editar/criar usuário, a opção "Região de Suporte" mostra 3 opções separadas (Goiânia, Espírito Santo, Demais) quando deveria ter apenas **2 opções**:
- **Goiás e Espírito Santo** (uma única região)
- **Demais Unidades**

A aba "Suporte Técnico" também está dividida incorretamente em 3 regiões.

### Correções em `src/pages/AdministracaoPage.tsx`

**1. Formulário de Novo Usuário (linha ~1271)** — Substituir as 3 opções por:
- `<SelectItem value="go_es">Goiás e Espírito Santo</SelectItem>`
- `<SelectItem value="demais">Demais Unidades</SelectItem>`

**2. Formulário de Editar Usuário (linha ~1568)** — Mesma correção acima.

**3. Aba Suporte Técnico (linha ~725)** — Unificar as regiões `goiania` e `espirito_santo` em uma só (`go_es`), com label "Goiás e Espírito Santo" e unidades de ambas as regiões juntas. Remover a iteração sobre 3 regiões, usar apenas 2.

**4. Migration** — Atualizar valores existentes no banco: converter `goiania` e `espirito_santo` para `go_es`.

### Arquivos afetados
- `src/pages/AdministracaoPage.tsx` — formulários + aba suporte
- Nova migration SQL — normalizar dados existentes

