

## Plano: Corrigir opções de Carga Horária para formato semanal

### Arquivo afetado
- `src/components/ConvocacaoDialog.tsx`

### Alteração
Localizar o `<Select>` do campo Carga Horária e substituir as opções atuais (que podem estar com valores mensais) pelas opções semanais corretas:
- `20h/semana`
- `30h/semana`
- `40h/semana`
- `44h/semana`

Verificar tanto os `value` quanto os `label` de cada `<SelectItem>` para garantir consistência.

