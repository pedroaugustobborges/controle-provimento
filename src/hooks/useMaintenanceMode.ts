import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MaintenanceState {
  id: string;
  is_active: boolean;
  message: string | null;
  expected_return_at: string | null;
  activated_at: string | null;
}

/**
 * Lê e observa o registro mais recente de system_maintenance.
 * Retorna { loading, state } em tempo real via realtime.
 */
export function useMaintenanceMode() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<MaintenanceState | null>(null);

  async function refetch() {
    const { data } = await supabase
      .from('system_maintenance')
      .select('id,is_active,message,expected_return_at,activated_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setState(data as MaintenanceState | null);
    setLoading(false);
  }

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel('system_maintenance_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_maintenance' },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { loading, state, refetch };
}
