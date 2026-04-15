## Plano: Carrossel interativo premium com mapas estaduais

### O que será feito

Substituir o card estático atual na `LoginPage.tsx` por um carrossel que alterna entre dois slides — Goiás e Espírito Santo — cada um com a silhueta SVG do respectivo estado como background decorativo e as unidades listadas de forma elegante.

### Alterações

`**src/pages/LoginPage.tsx`:**

- Remover o card estático de unidades com chips
- Implementar carrossel com dois slides usando estado React + `setInterval` para auto-play (~5s)
- **Unidades Hospitalares Geridas pela Agir:**
  **** 
  **Em Goiás:**
  **** 
  **Crer: Centro Estadual de Reabilitação e Readaptação Dr. Henrique Santillo (Goiânia)**
  **HDS: Hospital Estadual de Dermatologia Sanitária Colônia Santa Marta (Goiânia)**
  **Hugol: Hospital Estadual de Urgências Governador Otávio Lage de Siqueira (Goiânia)**
  **Hecad: Hospital Estadual da Criança e do Adolescente (Goiânia)**
  **Policlínica de Goiás: Policlínica Estadual Brasil Bruno de Bastos Neto Região Rio Vermelho (Cidade de Goiás)**
  **HEJ: Hospital Estadual de Jataí Dr. Serafim de Carvalho (Jataí)**
  **** 
  **Unidades Rede Teia Agir em Goiás:**
  **Clínica Teia - Unidade Goiânia**
  **Clínica Teia - Unidade Aparecida de Goiânia**
  **Clínica Teia - Unidade Senador Canedo**
  **Clínica Teia - Unidade Anápolis (Clínica-Escola do Autista)**
  **** 
  **Em Amazonas:**
  **** 
  **CHS: Complexo Hospitalar Sul, formado pelo Hospital e Pronto-Socorro 28 de Agosto e o Instituto da Mulher Dona Lindu (Manaus)**
  **** 
  **Unidades Rede Teia Agir em Amazonas:**
  **Clínica Teia (Caic TEA) - Dr. José Contente**
  **Caic TEA Dr. Gilson Moreira**
  **Caic TEA Dr. Afrânio Soares**
  **** 
  **Em São Paulo:** 
  **** 
  **HMSA: Hospital e Maternidade Municipal Santa Ana (Santana de Parnaíba)**
  **** 
  **Unidades Rede Teia Agir em São Paulo:**
  **Clínica Teia - Caism Philippe Pinel**
  **Clínica Teia - Centro TEA Paulista**
  **** 
  **Em Mato Grosso do Sul:**
  **** 
  **HRD: Hospital Regional de Dourados Olga Castoldi Parizotto (Dourados), formado pelas unidades:**
  **Unidade I - Matriz**
  **Unidade II - Hospital Regional de Cirurgias da Grande Dourados**
  **Unidade III - Centro de Especialidades e Diagnóstico**
  **** 
  **Em Mato Grosso:**
  **** 
  **HRAF: Hospital Regional de Cáceres Dr. Antônio Fontes**
  **** 
  **Em Espírito Santo:**
  **** 
  **Prontos Atendimentos: P.A. Praia do Suá e P.A. São Pedro**
  &nbsp;
- Transições com fade/slide animado entre slides
- Dots de navegação + setas opcionais
- Design glassmorphism mantido (backdrop-blur, bordas sutis)
- Usar componentes do Embla Carousel já disponível no projeto (`src/components/ui/carousel.tsx`) ou implementar carrossel simples com CSS transitions