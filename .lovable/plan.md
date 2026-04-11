
## Plano: Redesign Premium da Página "Controle de Vagas" (VagasPage)

### Arquivo: `src/pages/VagasPage.tsx`

### Alterações planejadas:

**1. Cards de estatísticas (linhas 471-533):**
- Adicionar hover effects: `hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-default`
- Reduzir saturação das cores de borda lateral para tons mais suaves
- Remover o subtexto "Regra Excel (Cargo + Mes)" do card Total de Vagas — substituir por algo útil como "Base ativa"

**2. Título/Subtítulo (linhas 327-331):**
- Remover o subtítulo longo "Gerenciamento estratégico e centralizado de vagas, editais e fluxo de convocações AGIR"
- Manter apenas `title="Controle de Vagas"` com badge simples

**3. Barra de filtros (linhas 536-632):**
- Melhorar visual com bordas mais definidas, tipografia coesa e espaçamento consistente
- Adicionar `rounded-xl` e melhorar contraste dos selects

**4. Tabela (linhas 647-877):**
- **Cabeçalho:** Corrigir hover para não sumir o texto — adicionar classe `hover:text-slate-700` em vez do comportamento atual
- **Status:** Alinhar coluna com `text-center` e garantir badges consistentes
- **Badges de status:** Reduzir saturação, tons mais suaves e profissionais
- **Coluna "Ação Rápida":** Renomear para "Banco" com tooltip contextual (ícone verde = banco disponível, cinza = sem banco)
- **Coluna "Ações":** Simplificar label do dropdown, remover cores excessivas do texto "Ações da Vaga"
- **Linhas:** Adicionar hover sutil `hover:bg-slate-50/50` e linhas zebradas sutis `even:bg-slate-25`

**5. Visual geral:**
- Harmonizar paleta de cores com o sidebar redesenhado
- Transições suaves em todos os elementos interativos
