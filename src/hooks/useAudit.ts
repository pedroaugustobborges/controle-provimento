import { useAdminStore } from '@/store/adminStore';
import { supabase } from '@/integrations/supabase/client';

export function useAudit() {
  const { currentUser, addAuditLog } = useAdminStore();

  const recordAction = async (
    modulo: string,
    acao: string,
    registro_afetado: string,
    detalhes?: string
  ) => {
    // Use live auth session to get the correct user — prevents stale store references
    const { data: { user: liveUser } } = await supabase.auth.getUser();
    const now = new Date();
    addAuditLog({
      usuario_nome: liveUser ? (currentUser?.nome_completo || liveUser.email || 'Sistema') : 'Sistema',
      usuario_email: liveUser?.email || currentUser?.email || 'sistema@sistema.com',
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
