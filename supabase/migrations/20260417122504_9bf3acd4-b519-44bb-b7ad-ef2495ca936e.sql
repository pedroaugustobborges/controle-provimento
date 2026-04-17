-- Create local holidays table
CREATE TABLE IF NOT EXISTS public.feriados_locais (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    data DATE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('municipal', 'estadual')),
    cidade TEXT,
    estado TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feriados_locais ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Feriados são visíveis por todos os usuários autenticados" 
ON public.feriados_locais FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Apenas administradores podem gerenciar feriados" 
ON public.feriados_locais 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (perfil = 'Administrador' OR perfil = 'Gestor')
  )
);

-- Initial seed for Goiânia
INSERT INTO public.feriados_locais (nome, data, tipo, cidade, estado)
VALUES 
('Dia da Consciência Negra', '2024-11-20', 'municipal', 'Goiânia', 'GO'),
('Dia da Consciência Negra', '2025-11-20', 'municipal', 'Goiânia', 'GO'),
('Aniversário de Goiânia', '2024-10-24', 'municipal', 'Goiânia', 'GO'),
('Aniversário de Goiânia', '2025-10-24', 'municipal', 'Goiânia', 'GO');
