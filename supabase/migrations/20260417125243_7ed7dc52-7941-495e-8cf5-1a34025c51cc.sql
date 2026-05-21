-- Ensure handle_new_user function is correct for profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome_completo, status, perfil, cargo)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.raw_user_meta_data->>'full_name', NEW.email),
    'ativo',
    'Assistente',
    'Colaborador'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome_completo = COALESCE(EXCLUDED.nome_completo, profiles.nome_completo);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger if missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure all existing auth users have a profile
INSERT INTO public.profiles (id, email, nome_completo, status, perfil, cargo)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'nome_completo', raw_user_meta_data->>'full_name', email),
    'ativo',
    'Assistente',
    'Colaborador'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Update RLS for notificacoes to be more permissive for authenticated users
DROP POLICY IF EXISTS "Anyone authenticated can create notifications" ON public.notificacoes;
CREATE POLICY "Anyone authenticated can create notifications" 
ON public.notificacoes 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Ensure users can see their own messages
DROP POLICY IF EXISTS "Users can see notifications they received or sent" ON public.notificacoes;
CREATE POLICY "Users can see notifications they received or sent" 
ON public.notificacoes 
FOR SELECT 
TO authenticated 
USING (auth.uid() = usuario_id OR auth.uid() = remetente_id OR usuario_id IS NULL);
