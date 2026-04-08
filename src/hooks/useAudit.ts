import { useAdminStore } from '@/store/adminStore';

export function useAudit() {
  const { currentUser, addAuditLog } = useAdminStore();

  const recordAction = (
    modulo: string,
    acao: string,
    registro_afetado: string,
    detalhes?: string
  ) => {
    const now = new Date();
    addAuditLog({
      usuario_nome: currentUser?.nome_completo || 'Sistema',
      usuario_email: currentUser?.email || 'sistema@sistema.com',
      perfil: currentUser?.perfil || 'Desconhecido',
      data: now.toISOString().split('T')[0],
      hora: now.toLocaleTimeString('pt-BR'),
      modulo,
      acao,
      registro_afetado,
    });
  };

  return { recordAction };
}
