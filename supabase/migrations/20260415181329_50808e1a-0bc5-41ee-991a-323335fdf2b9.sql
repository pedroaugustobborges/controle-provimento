
CREATE TABLE public.support_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regiao TEXT NOT NULL,
  responsavel TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  teams_user TEXT DEFAULT '',
  mensagem TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo',
  unidades TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view support configs"
ON public.support_configs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert support configs"
ON public.support_configs FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update support configs"
ON public.support_configs FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete support configs"
ON public.support_configs FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_support_configs_updated_at
BEFORE UPDATE ON public.support_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
