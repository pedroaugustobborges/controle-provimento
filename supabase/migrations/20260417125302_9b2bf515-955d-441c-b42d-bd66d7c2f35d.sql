-- Set search_path for handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Fix the RLS policy for notifications to be less permissive
DROP POLICY IF EXISTS "Anyone authenticated can create notifications" ON public.notificacoes;
CREATE POLICY "Anyone authenticated can create notifications" 
ON public.notificacoes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = remetente_id);
