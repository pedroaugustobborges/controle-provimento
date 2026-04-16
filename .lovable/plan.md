

## Plano: Limitar tipos de vaga a Substituição e Aumento

### Arquivos a verificar/alterar
- `src/types/vaga.ts` — verificar o objeto `TIPO_VAGA_LABELS` e limitar às opções desejadas
- `src/pages/VagasPage.tsx` — verificar o filtro de tipo de vaga e garantir que só exiba Substituição e Aumento

### Alterações
1. Em `TIPO_VAGA_LABELS` (ou onde os tipos são definidos), manter apenas as chaves correspondentes a "Substituição" e "Aumento"
2. No filtro `<Select>` de tipo de vaga em `VagasPage.tsx`, garantir que apenas essas duas opções apareçam
3. Verificar se outros componentes (como `AddVagaDialog`, `ConvocacaoDialog`, etc.) referenciam os tipos de vaga e ajustar se necessário

