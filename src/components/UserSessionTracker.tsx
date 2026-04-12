import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminStore } from '@/store/adminStore';

export function UserSessionTracker() {
  const { currentUser } = useAdminStore();
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const startSession = async () => {
      // Check if there's a recent session (last 30 mins) to resume
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: existingSessions, error: fetchError } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', currentUser.id)
        .is('logout_at', null)
        .gt('last_activity_at', thirtyMinsAgo)
        .order('last_activity_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching session:', fetchError);
      }

      if (existingSessions && existingSessions.length > 0) {
        sessionIdRef.current = existingSessions[0].id;
        // Update it immediately
        await updateSession();
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('user_sessions')
          .insert({
            user_id: currentUser.id,
            user_agent: navigator.userAgent,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating session:', createError);
        } else if (newSession) {
          sessionIdRef.current = newSession.id;
        }
      }
    };

    const updateSession = async () => {
      if (!sessionIdRef.current) return;

      const { error } = await supabase
        .from('user_sessions')
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', sessionIdRef.current);

      if (error) {
        console.error('Error updating session:', error);
      }
    };

    startSession();

    const interval = setInterval(updateSession, 60000); // Update every minute

    return () => {
      clearInterval(interval);
    };
  }, [currentUser]);

  return null;
}
