-- Set REPLICA IDENTITY FULL for all relevant tables
ALTER TABLE public.vagas REPLICA IDENTITY FULL;
ALTER TABLE public.convocacoes REPLICA IDENTITY FULL;
ALTER TABLE public.banco_candidatos REPLICA IDENTITY FULL;
ALTER TABLE public.notificacoes REPLICA IDENTITY FULL;
ALTER TABLE public.importacoes REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.feedbacks REPLICA IDENTITY FULL;
ALTER TABLE public.support_configs REPLICA IDENTITY FULL;

-- Safely add tables to the publication
DO $$
DECLARE
    tbl_name TEXT;
    tables_to_add TEXT[] := ARRAY[
        'vagas', 
        'convocacoes', 
        'banco_candidatos', 
        'notificacoes', 
        'importacoes', 
        'profiles', 
        'audit_logs',
        'feedbacks',
        'support_configs'
    ];
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOREACH tbl_name IN ARRAY tables_to_add
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl_name) THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' 
                AND schemaname = 'public' 
                AND tablename = tbl_name
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl_name);
            END IF;
        END IF;
    END LOOP;
END $$;
