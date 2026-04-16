

## Plano: Corrigir erro 404 em URLs diretas no domínio personalizado

### Diagnóstico

O domínio `provimento.painelagirsaude.com` não está configurado como domínio personalizado no Lovable — o projeto **não está publicado** via Lovable. Isso significa que o site provavelmente está hospedado em outro provedor (Vercel, Netlify, etc.), e o problema de 404 é causado pela **configuração de SPA routing no servidor de hospedagem**.

O Lovable já possui SPA fallback automático embutido — qualquer rota que não seja um arquivo estático é redirecionada para `index.html`. Mas isso **só funciona quando o site é publicado/hospedado pelo Lovable**.

### Solução recomendada

**Opção 1 (Recomendada): Publicar pelo Lovable e configurar domínio personalizado**
- Publicar o projeto via Lovable
- Configurar `provimento.painelagirsaude.com` como domínio personalizado no Lovable
- O SPA routing funcionará automaticamente — sem necessidade de `vercel.json` ou `_redirects`

**Opção 2: Se mantiver hospedagem externa (Vercel/Netlify)**
- O `vercel.json` já tem o rewrite correto (`/* → /index.html`)
- O `public/_redirects` já tem a regra Netlify correta
- O problema provavelmente está na **configuração do provedor de hospedagem** (DNS, build settings, etc.) — isso precisa ser verificado diretamente no painel do provedor

### Ação no código (independente da hospedagem)
- Nenhuma alteração de código é necessária — o `BrowserRouter` e as rotas do React Router estão corretamente configurados em `App.tsx`
- Os arquivos `vercel.json` e `_redirects` já existem com as regras de fallback SPA corretas

### Próximo passo
Preciso saber: **onde o site está hospedado atualmente?** (Vercel, Netlify, outro?) — ou prefere publicar pelo Lovable e configurar o domínio personalizado aqui?

