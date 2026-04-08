-- 1. Create tables
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuarios (Managed by Supabase Auth, synced via trigger)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nome_completo TEXT NOT NULL,
    perfil TEXT NOT NULL DEFAULT 'Assistente', -- Default role
    unidade_id UUID, -- For unit-specific restrictions
    status TEXT DEFAULT 'ativo',
    visualiza_todas_unidades BOOLEAN DEFAULT false,
    unidades_vinculadas UUID[] DEFAULT '{}',
    pode_incluir_registros BOOLEAN DEFAULT false,
    pode_excluir_requisicoes BOOLEAN DEFAULT false,
    pode_editar_configuracoes BOOLEAN DEFAULT false,
    pode_gerenciar_usuarios BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sync auth.users to public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome_completo)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- ... keep other tables (editais, edital_etapas, banco_candidatos, convocacoes, tarefas, alertas, auditoria_logs, importacoes)

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

-- 3. RLS - Row Level Security (Advanced)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
-- ... enable for others

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.usuarios FOR SELECT USING (auth.uid() = id);

-- Policy: Admin can do anything (requires a check function)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios_perfis up
    JOIN public.perfis p ON up.perfil_id = p.id
    WHERE up.user_id = auth.uid() AND p.nome = 'Administrador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins full access" ON public.vagas FOR ALL TO authenticated USING (public.is_admin());

-- Policy: Unit Analyst can only see/edit their unit
CREATE POLICY "Unit Analyst specific unit" ON public.vagas
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid() AND (u.unidade_id = vagas.unidade_id OR u.perfil = 'Administrador')
  )
);

-- Seed Initial Roles
INSERT INTO public.perfis (nome, descricao) VALUES
('Administrador', 'Acesso total ao sistema'),
('Analista da unidade', 'Gestão de vagas da unidade específica'),
('Analista do edital', 'Criação e acompanhamento de editais'),
('Analista de convocações', 'Gestão do banco e convocações'),
('Assistente', 'Acesso operacional limitado'),
('Gestão', 'Visualização de relatórios e indicadores');
