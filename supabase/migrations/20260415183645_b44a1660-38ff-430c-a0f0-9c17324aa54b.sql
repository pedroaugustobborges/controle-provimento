-- Normalize existing regiao_suporte values: merge goiania and espirito_santo into go_es
UPDATE public.profiles SET regiao_suporte = 'go_es' WHERE regiao_suporte IN ('goiania', 'espirito_santo');
