-- Add version column for optimistic locking
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.banco_candidatos ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add foreign key to user_sessions if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_sessions_user_id_fkey') THEN
        ALTER TABLE public.user_sessions 
        ADD CONSTRAINT user_sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Function to handle version increment
CREATE OR REPLACE FUNCTION public.handle_version_increment()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for version increment
DROP TRIGGER IF EXISTS tr_vagas_version ON public.vagas;
CREATE TRIGGER tr_vagas_version
BEFORE UPDATE ON public.vagas
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION public.handle_version_increment();

DROP TRIGGER IF EXISTS tr_banco_candidatos_version ON public.banco_candidatos;
CREATE TRIGGER tr_banco_candidatos_version
BEFORE UPDATE ON public.banco_candidatos
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION public.handle_version_increment();
