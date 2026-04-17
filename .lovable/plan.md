
## Plano — Detecção automática de nova versão após deploy (Hostinger)

### 1. Investigação (read-only) — já feita
- `src/hooks/useSystemUpdates.ts` depende de INSERT manual em `system_updates`.
- `src/components/UpdateBanner.tsx` já está pronto e funcional, só precisa ser disparado.
- Não há nada hoje que detecte automaticamente um novo build no servidor.
- `vercel.json` e `.github/workflows/deploy.yml` existem — confirmar fluxo Hostinger.

### 2. Decisões pendentes (precisa confirmar antes de codar)
- **Abordagem A, B ou C** (ver acima).
- Se A ou C: confirmar periodicidade do polling (sugiro 60s).
- Se B ou C: confirmar acesso ao workflow de deploy.

### 3. Implementação — Opção A (mais provável, recomendada)
1. **Plugin Vite para gerar `version.json` no build**:
   - Editar `vite.config.ts` adicionando plugin custom que, no hook `closeBundle`, escreve `dist/version.json` com `{ version: <timestamp>, buildHash: <hash> }`.
2. **Hook `useAppVersion`**:
   - Criar `src/hooks/useAppVersion.ts` que:
     - Faz fetch inicial de `/version.json` e guarda o hash em `useRef`.
     - Roda `setInterval` de 60s fazendo fetch com cache-busting.
     - Se hash mudar, retorna `{ hasUpdate: true, newVersion }`.
3. **Integrar com UpdateBanner existente**:
   - Adaptar `UpdateBanner.tsx` para também escutar `useAppVersion`.
   - Se `hasUpdate` do polling for true e não houver `system_updates` ativo, exibir banner com mensagem padrão "Nova versão disponível" + ação `reload`.
   - Manter `lastSeenSystemUpdateId` por hash no localStorage para não reaparecer após reload.
4. **Cache busting do reload**:
   - No clique de "Atualizar agora", chamar `window.location.reload()` + idealmente limpar service worker se houver.

### 4. Implementação opcional — Opção B (se confirmada)
- Adicionar step no `.github/workflows/deploy.yml` pós-deploy que faz `curl` para edge function que insere em `system_updates`.
- Criar edge function `notify-deploy` protegida por secret.

### 5. Validação
- Build local com `npm run build` → confirma que `dist/version.json` é gerado.
- Subir versão na Hostinger → após 60s, banner aparece para usuários logados.
- Clicar "Atualizar agora" → recarrega e banner não reaparece.
- Subir nova versão de novo → banner reaparece.
- Console limpo, sem 404 em `/version.json`.
