
-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'analista', 'assistente', 'gestor', 'visualizador');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  perfil TEXT NOT NULL DEFAULT 'Analista',
  cargo TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  visualiza_todas_unidades BOOLEAN NOT NULL DEFAULT false,
  unidades_vinculadas TEXT[] NOT NULL DEFAULT '{}',
  pode_incluir_registros BOOLEAN NOT NULL DEFAULT false,
  pode_excluir_requisicoes BOOLEAN NOT NULL DEFAULT false,
  pode_editar_configuracoes BOOLEAN NOT NULL DEFAULT false,
  pode_gerenciar_usuarios BOOLEAN NOT NULL DEFAULT false,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function for role checks (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. RLS policies for profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. RLS policies for user_roles
CREATE POLICY "Authenticated users can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome TEXT NOT NULL DEFAULT '',
  usuario_email TEXT DEFAULT '',
  perfil TEXT DEFAULT '',
  acao TEXT NOT NULL,
  modulo TEXT NOT NULL,
  registro_afetado TEXT DEFAULT '',
  valor_anterior JSONB,
  valor_novo JSONB,
  ip TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 8. Vagas table
CREATE TABLE public.vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade TEXT DEFAULT '',
  cargo TEXT DEFAULT '',
  status TEXT DEFAULT '',
  status_geral TEXT DEFAULT '',
  tipo_vaga TEXT DEFAULT 'substituicao',
  numero_vagas INTEGER DEFAULT 1,
  quantidade INTEGER DEFAULT 1,
  motivo TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  analista_responsavel TEXT DEFAULT '',
  assistentes TEXT DEFAULT '',
  nome_substituido TEXT DEFAULT '',
  data_abertura TEXT DEFAULT '',
  data_recebimento TEXT DEFAULT '',
  data_envio_edital TEXT DEFAULT '',
  data_publicacao TEXT DEFAULT '',
  data_homologacao TEXT DEFAULT '',
  data_convocacao TEXT DEFAULT '',
  numero_edital TEXT DEFAULT '',
  numero_processo_seletivo TEXT DEFAULT '',
  etapa TEXT DEFAULT '',
  publicacao TEXT DEFAULT '',
  prioridade TEXT DEFAULT '',
  mes_referencia TEXT DEFAULT '',
  import_batch_id TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  data_importacao TEXT DEFAULT '',
  origem TEXT DEFAULT 'importada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vagas"
  ON public.vagas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert vagas"
  ON public.vagas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update vagas"
  ON public.vagas FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete vagas"
  ON public.vagas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. Banco de candidatos table
CREATE TABLE public.banco_candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT DEFAULT '',
  cargo TEXT DEFAULT '',
  cargo_normalizado TEXT DEFAULT '',
  unidade TEXT DEFAULT '',
  status TEXT DEFAULT '',
  numero_edital TEXT DEFAULT '',
  numero_processo_seletivo TEXT DEFAULT '',
  classificacao TEXT DEFAULT '',
  data_validade TEXT DEFAULT '',
  data_convocacao TEXT DEFAULT '',
  is_prorrogado BOOLEAN DEFAULT false,
  quantidade_banco INTEGER DEFAULT 0,
  unidade_convocacao TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  import_batch_id TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  data_importacao TEXT DEFAULT '',
  origem TEXT DEFAULT 'importada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banco_candidatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view banco"
  ON public.banco_candidatos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert banco"
  ON public.banco_candidatos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update banco"
  ON public.banco_candidatos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete banco"
  ON public.banco_candidatos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. Importacoes log table
CREATE TABLE public.importacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT DEFAULT '',
  usuario_id TEXT DEFAULT '',
  status TEXT DEFAULT 'em_processamento',
  quantidade_apagada INTEGER DEFAULT 0,
  quantidade_inserida INTEGER DEFAULT 0,
  arquivo TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage importacoes"
  ON public.importacoes FOR ALL TO authenticated USING (true);

-- 11. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email, perfil, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    'Analista',
    'ativo'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vagas_updated_at
  BEFORE UPDATE ON public.vagas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banco_updated_at
  BEFORE UPDATE ON public.banco_candidatos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
