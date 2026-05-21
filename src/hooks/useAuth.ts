import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    let initialSessionResolved = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Only update after initial session has been resolved
        // to avoid race condition where onAuthStateChange fires
        // with null before getSession restores the session
        if (initialSessionResolved) {
          setAuthState({
            user: session?.user ?? null,
            session,
            loading: false,
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialSessionResolved = true;
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, any>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    // Record logout time before signing out
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_sessions')
          .update({ logout_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .is('logout_at', null);
        await supabase.from('audit_logs').insert({
          usuario_id: user.id,
          acao: 'LOGOUT',
          modulo: 'autenticacao',
          registro_afetado: user.id,
        });
      }
    } catch {
      // Audit/session update failures must never block logout
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  /**
   * @deprecated Admin-driven password reset via edge function is the correct flow.
   * Self-service password change is available in the profile dialog inside the app.
   * This function is intentionally a no-op to prevent accidental email link usage.
   */
  const resetPassword = useCallback(async (_email: string) => {
    throw new Error('Redefinição de senha por e-mail não está disponível. Solicite ao administrador do sistema que redefina sua senha diretamente no painel.');
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    isAuthenticated: !!authState.session,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };
}
