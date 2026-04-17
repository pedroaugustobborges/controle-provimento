
## Plano de execução

### 1. Diagnóstico do bug "página em branco"
- Ler `src/pages/UnidadePortalPage.tsx` e `src/App.tsx` (UnidadeRouteWrapper).
- Verificar console do navegador via `code--read_console_logs` para identificar o erro real.
- Hipóteses prováveis:
  - Erro em `useAuth` quando aba nova não tem contexto inicial completo.
  - Query do Supabase falhando por sessão não hidratada.
  - Import quebrado / hook lançando exceção.

### 2. Correção do bug
- Aplicar try/catch ou estados de loading/erro no componente.
- Garantir que a sessão do Supabase é restaurada na nova aba (normalmente já é via `localStorage`, mas validar).
- Adicionar fallback visual (skeleton/erro) para nunca ficar em branco.

### 3. Título e Favicon dinâmicos
- Adicionar `useEffect` em `UnidadePortalPage.tsx`:
  ```ts
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Portal Unidade';
    return () => { document.title = prevTitle; };
  }, []);
  ```
- Para o favicon: criar utilitário que troca o `href` do `<link rel="icon">` e restaura no cleanup.

### 4. Pendência com o usuário
**Pergunta:** o favicon do Portal Unidade deve ser:
- (a) o mesmo favicon atual (`/favicon-agir-v2.png`) — apenas o título muda, OU
- (b) um favicon novo — nesse caso, **preciso que envie a imagem** (PNG quadrado, idealmente 256x256).

### 5. Validação
- Abrir Portal Unidade → conferir conteúdo renderizado, título "Portal Unidade" na aba, favicon correto.
- Voltar à aba principal → título e favicon originais preservados.
