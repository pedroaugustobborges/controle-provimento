-- 1. Create Editais table
CREATE TABLE IF NOT EXISTS public.editais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE,
    numero_processo TEXT,
    numero_edital TEXT,
    data_abertura_edital TEXT,
    data_prova TEXT,
    data_entrevista TEXT,
    data_encerramento_edital TEXT,
    etapa_atual TEXT DEFAULT 'inscricoes',
    total_inscritos INTEGER DEFAULT 0,
    aprovados_triagem INTEGER DEFAULT 0,
    convocados_entrevista INTEGER DEFAULT 0,
    aprovados_finais INTEGER DEFAULT 0,
    possui_banco_talentos BOOLEAN DEFAULT FALSE,
    status_publicacao TEXT DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create Validacoes Editais table
CREATE TABLE IF NOT EXISTS public.validacoes_editais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE,
    precisa_validacao BOOLEAN DEFAULT TRUE,
    responsavel_validacao TEXT,
    tipo_validacao TEXT,
    observacao TEXT,
    etapa_finalizada BOOLEAN DEFAULT FALSE,
    status_validacao TEXT DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create Tarefas table
CREATE TABLE IF NOT EXISTS public.tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    status TEXT DEFAULT 'pendente',
    prioridade TEXT DEFAULT 'media',
    data_criacao TEXT DEFAULT now(),
    data_vencimento TEXT,
    atribuido_a TEXT,
    perfil_destinatario TEXT,
    relacionado_a_tipo TEXT,
    relacionado_a_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create Alertas table
CREATE TABLE IF NOT EXISTS public.alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    mensagem TEXT,
    tipo TEXT DEFAULT 'informativo',
    status TEXT DEFAULT 'nao_lido',
    data_criacao TEXT DEFAULT now(),
    destinatario TEXT,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create Bloqueios Horario table
CREATE TABLE IF NOT EXISTS public.bloqueios_horario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data TEXT NOT NULL,
    horario TEXT,
    dia_inteiro BOOLEAN DEFAULT FALSE,
    motivo TEXT,
    vagas_bloqueadas INTEGER,
    link_teams TEXT,
    criado_por TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for all new tables
ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validacoes_editais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_horario ENABLE ROW LEVEL SECURITY;

-- Set REPLICA IDENTITY FULL for all new tables
ALTER TABLE public.editais REPLICA IDENTITY FULL;
ALTER TABLE public.validacoes_editais REPLICA IDENTITY FULL;
ALTER TABLE public.tarefas REPLICA IDENTITY FULL;
ALTER TABLE public.alertas REPLICA IDENTITY FULL;
ALTER TABLE public.bloqueios_horario REPLICA IDENTITY FULL;

-- Create policies (Basic authenticated access for now, similar to existing ones)
-- We can refine these later if needed, but the priority is enabling access.

-- Editais
CREATE POLICY "Authenticated users can view editais" ON public.editais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage editais" ON public.editais FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Validacoes
CREATE POLICY "Authenticated users can view validacoes_editais" ON public.validacoes_editais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage validacoes_editais" ON public.validacoes_editais FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tarefas
CREATE POLICY "Authenticated users can view tarefas" ON public.tarefas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage tarefas" ON public.tarefas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Alertas
CREATE POLICY "Authenticated users can view alertas" ON public.alertas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage alertas" ON public.alertas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bloqueios
CREATE POLICY "Authenticated users can view bloqueios_horario" ON public.bloqueios_horario FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage bloqueios_horario" ON public.bloqueios_horario FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add to Realtime Publication
DO $$
DECLARE
    tbl_name TEXT;
    tables_to_add TEXT[] := ARRAY['editais', 'validacoes_editais', 'tarefas', 'alertas', 'bloqueios_horario'];
BEGIN
    FOREACH tbl_name IN ARRAY tables_to_add
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = tbl_name
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl_name);
        END IF;
    END LOOP;
END $$;
