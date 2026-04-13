import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminStore } from '@/store/adminStore';

export function UserSessionTracker() {
  const { currentUser } = useAdminStore();
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      sessionIdRef.current = null;
      return;
    }

    const startSession = async () => {
      try {
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
      } catch (err) {
        console.error('Unexpected error in startSession:', err);
      }
    };

    const updateSession = async () => {
      if (!sessionIdRef.current) return;

      try {
        const { error } = await supabase
          .from('user_sessions')
          .update({
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', sessionIdRef.current);

        if (error) {
          console.error('Error updating session:', error);
        }
      } catch (err) {
        console.error('Unexpected error in updateSession:', err);
      }
    };

    startSession();

    const interval = setInterval(updateSession, 60000); // Update every minute

    // Also update on visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // We don't explicitly set logout_at here because it would trigger on every tab close/refresh
      // which might be premature if they have other tabs open.
      // The inactivity timeout and the "logout" button are better places.
    };
  }, [currentUser]);

  return null;
}
