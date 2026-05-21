-- Tabela de sessões de usuário
CREATE TABLE public.user_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    logout_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Admins can view all user sessions" 
ON public.user_sessions 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.perfil = 'Administrador'
    )
);

CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger para atualizar profiles.ultimo_acesso
CREATE OR REPLACE FUNCTION public.update_profile_last_access()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles 
    SET ultimo_acesso = NEW.last_activity_at
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profile_last_access_trigger
AFTER INSERT OR UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_last_access();
