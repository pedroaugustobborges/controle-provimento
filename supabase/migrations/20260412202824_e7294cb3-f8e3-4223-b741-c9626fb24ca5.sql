-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS modulos_acesso TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS permissoes_modulo JSONB DEFAULT '{}';

-- Update existing profiles with default module access based on their roles
-- Analista de RH & Assistente de RH
UPDATE public.profiles 
SET modulos_acesso = ARRAY['vagas', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes'],
    permissoes_modulo = '{"vagas": "edit", "banco": "edit", "convocacoes": "edit", "alertas": "edit", "monitoramento": "read", "validacao_convocacoes": "read"}'::jsonb
WHERE perfil IN ('Analista de RH', 'Assistente de RH', 'Analista da unidade', 'Assistente');

-- Analista Administrativo & Gestão
UPDATE public.profiles 
SET modulos_acesso = ARRAY['vagas', 'publicacao', 'validacao', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes', 'importacoes', 'administracao'],
    permissoes_modulo = '{"vagas": "edit", "publicacao": "edit", "validacao": "edit", "banco": "edit", "convocacoes": "edit", "alertas": "edit", "monitoramento": "edit", "validacao_convocacoes": "edit", "importacoes": "edit", "administracao": "edit"}'::jsonb
WHERE perfil IN ('Analista Administrativo', 'Supervisão', 'Coordenação', 'Gestão', 'Gerência', 'Administrador', 'Admin', 'Analista administrativo');

-- Analista de Edital
UPDATE public.profiles 
SET modulos_acesso = ARRAY['vagas', 'publicacao', 'validacao', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes'],
    permissoes_modulo = '{"vagas": "read", "publicacao": "edit", "validacao": "read", "banco": "read", "convocacoes": "read", "alertas": "read", "monitoramento": "read", "validacao_convocacoes": "read"}'::jsonb
WHERE perfil IN ('Analista de Edital', 'Analista do edital');

-- Analista das Convocações
UPDATE public.profiles 
SET modulos_acesso = ARRAY['vagas', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes'],
    permissoes_modulo = '{"vagas": "read", "banco": "read", "convocacoes": "edit", "alertas": "read", "monitoramento": "read", "validacao_convocacoes": "read"}'::jsonb
WHERE perfil IN ('Analista das Convocações', 'Analista de convocações');

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
