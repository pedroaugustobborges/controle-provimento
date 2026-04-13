

## Plano: Corrigir upload de foto de usuário na Administração

### Problema
O bucket `avatars` existe e é público para leitura, mas as políticas de INSERT e UPDATE exigem que o caminho do arquivo comece com o `auth.uid()` do usuário que faz o upload. Como o admin está fazendo upload em nome de outro usuário, e o código usa `Math.random()` como nome do arquivo (sem pasta do user), o upload é bloqueado pelo RLS.

### Solução

**Migration SQL** — Substituir as políticas restritivas por políticas que permitem:
- Qualquer usuário autenticado pode fazer upload no bucket `avatars` (INSERT)
- Qualquer usuário autenticado pode atualizar arquivos no bucket `avatars` (UPDATE)
- Manter SELECT público (já existe)

```sql
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
```

**`src/pages/AdministracaoPage.tsx`** (~linha 350-373):
- Melhorar o `handleUploadPhoto` para usar um caminho mais organizado: `avatars/{userId}/{timestamp}.{ext}` em vez de `Math.random()`
- Isso facilita limpeza futura e organização

Nenhuma outra alteração necessária.

