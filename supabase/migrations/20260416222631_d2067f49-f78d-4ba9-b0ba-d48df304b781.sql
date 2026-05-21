-- Update the SELECT policy for notificacoes to allow senders to see their sent messages
DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notificacoes;

CREATE POLICY "Users can see notifications they received or sent" 
ON public.notificacoes 
FOR SELECT 
USING (auth.uid() = usuario_id OR auth.uid() = remetente_id OR usuario_id IS NULL);
