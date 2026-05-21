import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemUpdate {
  id: string;
  version: string | null;
  message: string;
  action_type: 'reload' | 'relogin';
  is_mandatory: boolean;
  published_at: string;
}

const STORAGE_KEY = 'lastSeenSystemUpdateId';

export function useSystemUpdates() {
  const [latest, setLatest] = useState<SystemUpdate | null>(null);
  const [dismissed, setDismissed] = useState(false);

  async function refetch() {
    const { data } = await supabase
      .from('system_updates')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setLatest(data as SystemUpdate);
  }

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel('system_updates_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_updates' },
        (payload) => {
          setLatest(payload.new as SystemUpdate);
          setDismissed(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const lastSeenId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  const shouldShow = !!latest && latest.id !== lastSeenId && !dismissed;

  function markSeen() {
    if (latest) {
      localStorage.setItem(STORAGE_KEY, latest.id);
      setDismissed(true);
    }
  }

  function dismiss() {
    setDismissed(true);
  }

  return { latest, shouldShow, markSeen, dismiss };
}
