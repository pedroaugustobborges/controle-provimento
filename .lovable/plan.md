

## Plano — Simplificar Layout e Restringir Visibilidade

Preciso analisar os arquivos antes de propor mudanças específicas, pois os nomes exatos das abas/submenus podem variar. Vou verificar o conteúdo atual das páginas mencionadas.

### Etapas

1. **Verificar** o conteúdo atual de `VagasPage.tsx`, `DashboardPage.tsx`, `EditaisPage.tsx` e `AppSidebar.tsx` para mapear as abas, submenus e botões existentes
2. **Restringir** os botões "Importar Excel", "Auditoria" e "Diagnóstico" para exibir apenas para perfis Administrador e Analista Administrativo (usando `usePermissions`)
3. **Simplificar abas** na página de Vagas — remover abas/títulos redundantes, mantendo apenas "Controle de Vagas"
4. **Limpar submenus** de Editais e da visualização "Todas as Vagas", removendo itens duplicados ou desnecessários
5. **Testar** que a navegação permanece funcional após as remoções

