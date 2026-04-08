-- 1. Create tables
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuarios (Managed by Supabase Auth, but let's have a public metadata table)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Perfis
CREATE TABLE public.perfis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT UNIQUE NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permissoes
CREATE TABLE public.permissoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    chave TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Usuarios Perfis (ManyToMany)
CREATE TABLE public.usuarios_perfis (
    user_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    perfil_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, perfil_id)
);

-- Unidades
CREATE TABLE public.unidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT UNIQUE NOT NULL,
    codigo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vagas
CREATE TABLE public.vagas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID REFERENCES public.unidades(id) NOT NULL,
    requisicao TEXT NOT NULL,
    cargo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    quantidade_vagas INTEGER DEFAULT 1,
    data_abertura DATE NOT NULL,
    data_recebimento DATE,
    status_atual TEXT DEFAULT 'aberta',
    etapa_atual TEXT,
    processo_concluido BOOLEAN DEFAULT false,
    dias_corridos INTEGER DEFAULT 0,
    dias_uteis INTEGER DEFAULT 0,
    data_conclusao DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.usuarios(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public.usuarios(id),
    version INTEGER DEFAULT 1 NOT NULL
);

-- Editais
CREATE TABLE public.editais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE,
    numero_edital TEXT UNIQUE NOT NULL,
    numero_processo TEXT,
    status_edital TEXT DEFAULT 'pendente',
    arquivo_principal_id UUID,
    publicado_em TIMESTAMP WITH TIME ZONE,
    validado_em TIMESTAMP WITH TIME ZONE,
    validado_por UUID REFERENCES public.usuarios(id),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.usuarios(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public.usuarios(id),
    version INTEGER DEFAULT 1 NOT NULL
);

-- Edital Etapas
CREATE TABLE public.edital_etapas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edital_id UUID REFERENCES public.editais(id) ON DELETE CASCADE,
    nome_etapa TEXT NOT NULL,
    data_prevista DATE,
    data_realizada DATE,
    status_etapa TEXT DEFAULT 'pendente',
    quantidade_inscritos INTEGER DEFAULT 0,
    quantidade_aprovados_triagem INTEGER DEFAULT 0,
    quantidade_aprovados_avaliacao_online INTEGER DEFAULT 0,
    quantidade_convocados_entrevista INTEGER DEFAULT 0,
    quantidade_aprovados_finais INTEGER DEFAULT 0,
    gerou_banco BOOLEAN DEFAULT false,
    quantidade_banco INTEGER DEFAULT 0,
    observacoes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public.usuarios(id),
    version INTEGER DEFAULT 1 NOT NULL
);

-- Banco Candidatos
CREATE TABLE public.banco_candidatos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vaga_id UUID REFERENCES public.vagas(id),
    referencia_edital TEXT,
    unidade_id UUID REFERENCES public.unidades(id) NOT NULL,
    cargo TEXT NOT NULL,
    nome_candidato TEXT NOT NULL,
    status_banco TEXT DEFAULT 'cadastro reserva',
    data_inclusao DATE DEFAULT CURRENT_DATE,
    data_convocacao DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public.usuarios(id),
    version INTEGER DEFAULT 1 NOT NULL
);

-- Convocacoes
CREATE TABLE public.convocacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE,
    candidato_id UUID REFERENCES public.banco_candidatos(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES public.unidades(id) NOT NULL,
    cargo TEXT NOT NULL,
    data_convocacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status_convocacao TEXT DEFAULT 'em andamento',
    devolutiva TEXT,
    responsavel_id UUID REFERENCES public.usuarios(id),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public.usuarios(id),
    version INTEGER DEFAULT 1 NOT NULL
);

-- Tarefas
CREATE TABLE public.tarefas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    modulo_origem TEXT NOT NULL,
    referencia_id UUID,
    responsavel_id UUID REFERENCES public.usuarios(id),
    prazo DATE,
    status TEXT DEFAULT 'pendente',
    prioridade TEXT DEFAULT 'media',
    criado_por UUID REFERENCES public.usuarios(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Alertas
CREATE TABLE public.alertas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lido BOOLEAN DEFAULT false,
    user_id UUID REFERENCES public.usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Auditoria Logs
CREATE TABLE public.auditoria_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modulo TEXT NOT NULL,
    registro_id UUID,
    acao TEXT NOT NULL,
    usuario_id UUID REFERENCES public.usuarios(id),
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    valor_anterior JSONB,
    valor_novo JSONB,
    contexto_adicional JSONB
);

-- Importacoes
CREATE TABLE public.importacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo TEXT NOT NULL, -- 'vagas', 'banco'
    status TEXT DEFAULT 'concluido',
    usuario_id UUID REFERENCES public.usuarios(id),
    data_importacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    quantidade_apagada INTEGER DEFAULT 0,
    quantidade_inserida INTEGER DEFAULT 0
);

-- 2. Concurrency Logic: Function to update version
CREATE OR REPLACE FUNCTION public.check_version_and_increment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.version != OLD.version THEN
        RAISE EXCEPTION 'Concurrency mismatch: Expected version %, but database has %', NEW.version, OLD.version;
    END IF;
    NEW.version := OLD.version + 1;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers for version control
CREATE TRIGGER tr_vagas_version_control BEFORE UPDATE ON public.vagas FOR EACH ROW EXECUTE FUNCTION public.check_version_and_increment();
CREATE TRIGGER tr_editais_version_control BEFORE UPDATE ON public.editais FOR EACH ROW EXECUTE FUNCTION public.check_version_and_increment();
CREATE TRIGGER tr_banco_version_control BEFORE UPDATE ON public.banco_candidatos FOR EACH ROW EXECUTE FUNCTION public.check_version_and_increment();
CREATE TRIGGER tr_convocacoes_version_control BEFORE UPDATE ON public.convocacoes FOR EACH ROW EXECUTE FUNCTION public.check_version_and_increment();

-- 3. RLS - Row Level Security (Initial setup)
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocacoes ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can read all (can be refined per profile later)
CREATE POLICY "Public Read" ON public.vagas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read" ON public.editais FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read" ON public.banco_candidatos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public Read" ON public.convocacoes FOR SELECT USING (auth.role() = 'authenticated');
